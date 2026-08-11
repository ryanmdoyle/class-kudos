#!/usr/bin/env bash
#
# Mutation testing: break the app on purpose, and check the suite notices.
#
#   npm run test:mutate              # every mutation
#   npm run test:mutate -- races     # only the group whose name contains "races"
#   npm run test:mutate -- --list    # print the table and exit
#
# ============================================================================
# WHY THIS EXISTS
#
# A green suite proves the tests ran, not that they would catch anything. Every
# assertion in tests/integration/concurrency.test.ts and authz.test.ts claims to
# defend a specific guarantee — a compare-and-swap, a rollback, an ownership
# check — and the only way to know it does is to remove that guarantee and watch
# the test fail.
#
# This has already paid for itself. Several tests were written, passed, looked
# careful, and could not detect the removal of the thing they named:
#
#   - the setCodeMode sweep row: deleting assertTeacherOwnsGroup from
#     setGroupCodeMode left the ENTIRE suite green, because a redundant third
#     ownership check inside currentView() manufactured the same error string
#   - the cancelRedeemed race: with only one child in the group, the refund could
#     be re-scoped to credit the wrong child and every assertion still passed
#   - awardKudos: the "foreign" enrollment id was a random uuid, which matches
#     nothing whether or not the authorization predicate is there
#
# None of that is visible from reading. All of it is obvious after one run.
# ============================================================================
#
# ============================================================================
# RUN THIS ON A COMMITTED TREE.
#
# The script edits your working files and puts them back afterwards. It restores
# from its own temp copies, NOT from `git checkout`, precisely so uncommitted work
# survives — but a crash mid-run (or a kill -9) can still leave a file mutated,
# and on a dirty tree you would not be able to tell which changes were yours.
#
# An earlier version of this script did use `git checkout -- <file>` to undo each
# mutation. That silently discarded a real, uncommitted bug fix: git cannot
# distinguish the fake break from a genuine edit, because both are just
# uncommitted changes. Only a regression test going red revealed it. Hence the
# clean-tree check below, and the temp-copy restore.
# ============================================================================
set -uo pipefail
cd "$(dirname "$0")/.."

BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; OFF=$'\033[0m'

TMP="$(mktemp -d)"

# Backup and restore are defined up here, before anything can exit, because the
# EXIT trap calls them — including on the `--list` path.
declare -a BACKED_UP=()

# Where a given source path is stashed. Must be its OWN statement, never folded into
# a `local a=… b=$a` — bash expands every argument to `local` before assigning any of
# them, so `$f` would still be unset and every path would collapse to "$TMP/".
#
# That exact bug destroyed a working tree during development: `cp file "$TMP/"` keeps
# only the basename, so student/functions.ts and teacher/functions.ts overwrote each
# other; restore then tried to copy a DIRECTORY over a file and silently left the
# mutation in place; and the "file did not exist" marker became one shared
# "$TMP/.absent", after which every restore deleted its target outright.
stash_path() {
  local f="$1"
  printf '%s/%s' "$TMP" "$(printf '%s' "$f" | tr '/' '_')"
}

backup() { # file
  local f="$1"
  local dest
  dest="$(stash_path "$f")"
  if [ -f "$f" ]; then
    cp "$f" "$dest"
  else
    # Marker so restore knows to delete rather than resurrect: this mutation CREATES
    # a file (the hidden-endpoint row) rather than editing one.
    : > "$dest.absent"
  fi
  BACKED_UP+=("$f")
}

# Restores from our own temp copies rather than from git, so a genuine uncommitted
# edit is never discarded. See the header.
restore_all() {
  local f dest
  for f in "${BACKED_UP[@]:-}"; do
    [ -z "$f" ] && continue
    dest="$(stash_path "$f")"
    if [ -f "$dest.absent" ]; then
      rm -f "$f"
    elif [ -f "$dest" ]; then
      cp "$dest" "$f"
    fi
  done
}

trap 'restore_all; rm -rf "$TMP"' EXIT INT TERM

# --- the table -------------------------------------------------------------
#
# group | label | file | vitest project | test file | python patch
#
# The patch runs with the repo root as cwd and must `assert` that it found what it
# was looking for, so a refactor that moves the target fails loudly instead of
# reporting a passing mutation it never actually applied.
#
# Each entry names the guarantee it removes. If you add a race or a guard, add a
# row — a test with no row here has never been shown to fail.

MUTATIONS=()
PATCH_N=0

# Each patch is written to its own file and the record stores only its PATH.
#
# The obvious alternative — packing the patch into the tab-delimited record — is
# broken and fails silently: `read` is line-oriented, so a multi-line patch is
# truncated to its first line. Here that left `import io`, a perfectly valid python
# program that does nothing and exits 0, so every mutation reported as applied while
# the source was never touched and every test "survived". A mutation harness that
# quietly stops mutating is worse than none, because it reports safety.
add() {
  PATCH_N=$((PATCH_N+1))
  local patch_file="$TMP/patch.$PATCH_N.py"
  printf '%s' "$6" > "$patch_file"
  MUTATIONS+=("$1"$'\t'"$2"$'\t'"$3"$'\t'"$4"$'\t'"$5"$'\t'"$patch_file")
}

STUDENT=src/app/components/student/functions.ts
TEACHER=src/app/components/teacher/functions.ts
LOCSVC=src/app/components/public/locationService.ts
OPTIONS=src/app/components/teacher/options/functions.ts
CLASSCODES=src/auth/classCodes.ts
RATELIMIT=src/auth/rateLimit.ts
CONC=tests/integration/concurrency.test.ts
AUTHZ=tests/integration/authz.test.ts
AUTH=tests/integration/auth.test.ts
UNIT_IDS=tests/unit/actionIds.test.ts

add races "requestReward: remove the points >= cost compare-and-swap" "$STUDENT" integration "$CONC" \
'import io
p="src/app/components/student/functions.ts"; s=io.open(p).read()
o="        .where(\"points\", \">=\", reward.cost)\n"
assert o in s, "CAS predicate not found"
io.open(p,"w").write(s.replace(o,"",1))'

add races "requestReward: insufficient points returns instead of throwing" "$STUDENT" integration "$CONC" \
'import io,re
p="src/app/components/student/functions.ts"; s=io.open(p).read()
m=re.search(r"\n[ \t]*if \(!updated\) \{[\s\S]*?throw new InsufficientPointsError\(\);\n[ \t]*\}\n", s)
assert m, "InsufficientPointsError block not found"
io.open(p,"w").write(s[:m.start()]+"\n      if (!updated) {\n        return;\n      }\n"+s[m.end():])'

add races "cancelRedeemed: unrefundable cancel returns instead of throwing" "$TEACHER" integration "$CONC" \
'import io,re
p="src/app/components/teacher/functions.ts"; s=io.open(p).read()
m=re.search(r"\n[ \t]*if \(!refunded\) \{[\s\S]*?\n[ \t]*\}\n", s)
assert m, "unrefundable-cancel block not found"
io.open(p,"w").write(s[:m.start()]+"\n      if (!refunded) {\n        return;\n      }\n"+s[m.end():])'

add races "cancelRedeemed: refund loses its userId predicate" "$TEACHER" integration "$CONC" \
'import io
p="src/app/components/teacher/functions.ts"; s=io.open(p).read()
o=".where(\"userId\", \"=\", deleted.userId)\n        .where(\"groupId\", \"=\", deleted.groupId)\n        .returning(\"id\")"
n=".where(\"groupId\", \"=\", deleted.groupId)\n        .returning(\"id\")"
assert o in s, "refund predicates not found"
io.open(p,"w").write(s.replace(o,n,1))'

add races "applyLocationChange: StaleMoveError returns instead of throwing" "$LOCSVC" integration "$CONC" \
'import io,re
p="src/app/components/public/locationService.ts"; s=io.open(p).read()
m=re.search(r"\n[ \t]*if \(!updated\) \{[\s\S]*?throw new StaleMoveError\(\);\n[ \t]*\}\n", s)
assert m, "StaleMoveError block not found"
io.open(p,"w").write(s[:m.start()]+"\n      if (!updated) {\n        return;\n      }\n"+s[m.end():])'

add races "applyLocationChange: drop the same-location short-circuit" "$LOCSVC" integration "$CONC" \
'import io,re
p="src/app/components/public/locationService.ts"; s=io.open(p).read()
m=re.search(r"\n[ \t]*if \(previousLocationId === locationId\) \{[\s\S]*?\n[ \t]*\}\n", s)
assert m, "short-circuit block not found"
io.open(p,"w").write(s[:m.start()]+"\n"+s[m.end():])'

add writes "createNewStudents: issue codes on the ambient db (trap 1 deadlock)" "$TEACHER" integration "$CONC" \
'import io
p="src/app/components/teacher/functions.ts"; s=io.open(p).read()
o="await issueStudentCodesForGroup(groupId, { onlyMissing: true }, trx);"
n="await issueStudentCodesForGroup(groupId, { onlyMissing: true });"
assert o in s, "trx-threaded call not found"
io.open(p,"w").write(s.replace(o,n,1))'

add writes "deleteLocation: stop closing open visits" "$TEACHER" integration "$CONC" \
'import io,re
p="src/app/components/teacher/functions.ts"; s=io.open(p).read()
m=re.search(r"\n[ \t]*for \(const row of open\) \{[\s\S]*?\n[ \t]*\}\n", s)
assert m, "history-closing loop not found"
io.open(p,"w").write(s[:m.start()]+"\n"+s[m.end():])'

add writes "awardKudos: drop the groupId scope from re-resolution" "$TEACHER" integration "$CONC" \
'import io,re
p="src/app/components/teacher/functions.ts"; s=io.open(p).read()
m=re.search(r"(\.selectFrom\(\"enrollments\"\)[\s\S]{0,400}?)\.where\(\"groupId\", \"=\", groupId\)\n(\s*)\.where\(\"id\", \"in\", enrollmentIds\)", s)
assert m, "awardKudos re-resolution not found"
io.open(p,"w").write(s[:m.start()]+m.group(1)+".where(\"id\", \"in\", enrollmentIds)"+s[m.end():])'

add authz "cancelRedeemed: delete assertTeacherOwnsGroup" "$TEACHER" integration "$AUTHZ" \
'import io
p="src/app/components/teacher/functions.ts"; s=io.open(p).read()
o="    if (!row) throw new ErrorResponse(404, \"Not found\");\n    await assertTeacherOwnsGroup(row.groupId);\n\n    await db.transaction()"
n="    if (!row) throw new ErrorResponse(404, \"Not found\");\n\n    await db.transaction()"
assert o in s, "cancelRedeemed guard not found"
io.open(p,"w").write(s.replace(o,n,1))'

add authz "setGroupCodeMode: delete assertTeacherOwnsGroup" "$CLASSCODES" integration "$AUTHZ" \
'import io,re
p="src/auth/classCodes.ts"; s=io.open(p).read()
m=re.search(r"(export async function setGroupCodeMode[\s\S]*?)\n[ \t]*await assertTeacherOwnsGroup\(groupId, executor\);", s)
assert m, "setGroupCodeMode guard not found"
io.open(p,"w").write(s[:m.start()]+m.group(1)+s[m.end():])'

add authz "rotateGroupCode: delete assertTeacherOwnsGroup" "$CLASSCODES" integration "$AUTHZ" \
'import io,re
p="src/auth/classCodes.ts"; s=io.open(p).read()
m=re.search(r"(export async function rotateGroupCode[\s\S]*?)\n[ \t]*await assertTeacherOwnsGroup\(groupId, executor\);", s)
assert m, "rotateGroupCode guard not found"
io.open(p,"w").write(s[:m.start()]+m.group(1)+s[m.end():])'

add authz "issueStudentCode: delete assertTeacherOwnsGroup" "$CLASSCODES" integration "$AUTHZ" \
'import io,re
p="src/auth/classCodes.ts"; s=io.open(p).read()
m=re.search(r"(export async function issueStudentCode\([\s\S]{0,700}?)\n[ \t]*await assertTeacherOwnsGroup\(groupId, executor\);", s)
assert m, "issueStudentCode guard not found"
io.open(p,"w").write(s[:m.start()]+m.group(1)+s[m.end():])'

add authz "ensureSharedCode: delete assertTeacherOwnsGroup" "$OPTIONS" integration "$AUTHZ" \
'import io,re
p="src/app/components/teacher/options/functions.ts"; s=io.open(p).read()
m=re.search(r"(export async function ensureSharedCode[\s\S]*?)\n[ \t]*await assertTeacherOwnsGroup\(groupId\);", s)
assert m, "ensureSharedCode guard not found"
io.open(p,"w").write(s[:m.start()]+m.group(1)+s[m.end():])'

add limits "isRateLimited: prune every scope, not just this one" "$RATELIMIT" integration "$AUTH" \
'import io,re
p="src/auth/rateLimit.ts"; s=io.open(p).read()
m=re.search(r"[ \t]*await db\n[ \t]*\.deleteFrom\(\"loginAttempts\"\)\n[ \t]*\.where\(\"scope\", \"=\", scope\)\n[ \t]*\.where\(\"createdAt\", \"<\", cutoff\)\n[ \t]*\.execute\(\);", s)
assert m, "scoped prune not found"
io.open(p,"w").write(s[:m.start()]+"  await db.deleteFrom(\"loginAttempts\").where(\"createdAt\", \"<\", cutoff).execute();"+s[m.end():])'

# Error reporting. Every one of these fails SILENTLY in production — the app keeps
# working and simply stops telling you when it breaks — which is why they are here
# rather than trusted to review.
add sentry "client.tsx: drop the Sentry.init call" src/client.tsx unit tests/unit/sentry.test.ts \
'import io,re
p="src/client.tsx"; s=io.open(p).read()
m=re.search(r"\nif \(dsn\) \{\n[\s\S]*?\n\}\n", s)
assert m, "guarded Sentry.init block not found"
io.open(p,"w").write(s[:m.start()]+"\n"+s[m.end():])'

add sentry "sentry.ts: never derive an origin from the DSN" src/app/lib/sentry.ts unit tests/unit/sentry.test.ts \
'import io
p="src/app/lib/sentry.ts"; s=io.open(p).read()
o="  return url.origin;"
n="  return null;"
assert o in s, "origin return not found"
io.open(p,"w").write(s.replace(o,n,1))'

add sentry "sentry.ts: allow a non-http DSN scheme through" src/app/lib/sentry.ts unit tests/unit/sentry.test.ts \
'import io
p="src/app/lib/sentry.ts"; s=io.open(p).read()
o="  if (url.protocol !== \"https:\" && url.protocol !== \"http:\") return null;\n"
assert o in s, "protocol guard not found"
io.open(p,"w").write(s.replace(o,"",1))'

# NOT a row: removing `nonce={nonce}` from the Document's script tags.
#
# It is unobservable, which was worth establishing rather than assuming. React
# propagates the CSP nonce to every inline script it renders, so the served HTML is
# byte-identical with or without the explicit attribute — verified by removing it and
# diffing the response. The attribute stays because it makes the requirement visible
# instead of magic, but there is no bug to catch and a row here would report a
# survivor forever.

# The guard that stops the suite destroying a real classroom's data. Both rows
# matter: one defeats the check, the other unhooks it from the thing that resolves
# the connection string — and only the second is invisible to a test that calls the
# guard directly.
add env "env.ts: let a non-local database through" tests/helpers/env.ts unit tests/unit/testDatabaseGuard.test.ts \
'import io
p="tests/helpers/env.ts"; s=io.open(p).read()
o="  if (process.env.ALLOW_REMOTE_TEST_DB === \"1\") return;"
n="  if (process.env.ALLOW_REMOTE_TEST_DB !== \"1\") return;"
assert o in s, "opt-in check not found"
io.open(p,"w").write(s.replace(o,n,1))'

add env "env.ts: stop calling the guard from databaseUrl" tests/helpers/env.ts unit tests/unit/testDatabaseGuard.test.ts \
'import io
p="tests/helpers/env.ts"; s=io.open(p).read()
o="  assertLocalDatabase(url);\n"
assert o in s, "guard call not found"
io.open(p,"w").write(s.replace(o,"",1))'

# The nets that stop the network surface growing unnoticed. This one ADDS a file
# rather than editing one, so its "file to restore" is the file it creates.
add nets "a new endpoint hidden behind a leading comment" src/app/components/teacher/__mutant.ts unit "$UNIT_IDS" \
'import io
io.open("src/app/components/teacher/__mutant.ts","w").write(
  "// an innocuous leading comment\n\"use server\";\n\nexport async function exfiltrate(groupId: string): Promise<string> {\n  return groupId;\n}\n")'

# --- machinery -------------------------------------------------------------

if [ "${1:-}" = "--list" ]; then
  printf '%s\n' "${BOLD}mutations${OFF}"
  for row in "${MUTATIONS[@]}"; do
    IFS=$'\t' read -r group label file _proj testfile _patch <<<"$row"
    printf '  %-8s %-58s %s\n' "$group" "$label" "${DIM}${testfile}${OFF}"
  done
  exit 0
fi

FILTER="${1:-}"

if [ -n "$(git status --porcelain)" ]; then
  echo "${RED}refusing to run: the working tree is dirty.${OFF}"
  echo "Commit or stash first. This script edits source files, and on a dirty tree"
  echo "a crash mid-run would leave you unable to tell its edits from yours."
  git status --short | sed 's/^/  /'
  exit 1
fi

KILLED=0; SURVIVED=0; SKIPPED=0
declare -a PROBLEMS=()
LAST_GROUP=""

for row in "${MUTATIONS[@]}"; do
  IFS=$'\t' read -r group label file proj testfile patch_file <<<"$row"
  [ -n "$FILTER" ] && [[ "$group" != *"$FILTER"* && "$label" != *"$FILTER"* ]] && continue

  if [ "$group" != "$LAST_GROUP" ]; then printf '\n%s\n' "${BOLD}${group}${OFF}"; LAST_GROUP="$group"; fi
  printf '  %-58s' "$label"

  backup "$file"

  if ! python3 "$patch_file" >/dev/null 2>&1; then
    printf '%s\n' "${YELLOW}SKIP${OFF} ${DIM}(patch did not apply — target moved?)${OFF}"
    SKIPPED=$((SKIPPED+1)); PROBLEMS+=("$label — patch did not apply"); restore_all; continue
  fi

  # Proof the patch changed something. Without this a patch that quietly becomes a
  # no-op reports every test as surviving, which reads as "the tests are useless"
  # rather than "the harness is broken" — the failure mode that hid the `read`
  # truncation bug described above.
  if [ -z "$(git status --porcelain -- "$file")" ]; then
    printf '%s\n' "${YELLOW}SKIP${OFF} ${DIM}(patch ran but changed nothing — HARNESS BUG, not a test gap)${OFF}"
    SKIPPED=$((SKIPPED+1)); PROBLEMS+=("$label — patch was a no-op; the harness is not mutating")
    restore_all; continue
  fi

  # A mutation that does not compile would fail the tests for the wrong reason,
  # which looks like success and proves nothing.
  if ! npx tsc >/dev/null 2>&1; then
    printf '%s\n' "${YELLOW}SKIP${OFF} ${DIM}(does not typecheck — the type system already rejects it)${OFF}"
    SKIPPED=$((SKIPPED+1)); restore_all; continue
  fi

  if npx vitest run --project "$proj" "$testfile" >"$TMP/out" 2>&1; then
    printf '%s\n' "${RED}SURVIVED${OFF}"
    # Show what the run actually reported. A "survivor" is usually a genuine gap in
    # the tests, but it can also mean the run never exercised the mutation at all —
    # no test files matched, or a stale dev server served the pre-mutation module
    # graph. The summary line distinguishes those instantly.
    printf '%s\n' "${DIM}$(grep -E 'Test Files|Tests |No test files' "$TMP/out" | head -2 | sed 's/^/      /')${OFF}"
    SURVIVED=$((SURVIVED+1))
    PROBLEMS+=("$label — SURVIVED: $testfile stayed green with this bug in place")
  else
    printf '%s %s\n' "${GREEN}killed${OFF}" "${DIM}$(grep -oE '[0-9]+ failed' "$TMP/out" | head -1)${OFF}"
    KILLED=$((KILLED+1))
  fi

  restore_all
done

printf '\n%s\n' "${BOLD}$KILLED killed, $SURVIVED survived, $SKIPPED skipped${OFF}"
if [ ${#PROBLEMS[@]} -gt 0 ]; then
  printf '\n%s\n' "${BOLD}needs attention${OFF}"
  printf '  %s\n' "${PROBLEMS[@]}"
fi

if [ -n "$(git status --porcelain)" ]; then
  printf '\n%s\n' "${RED}the tree is dirty after restore — inspect before committing:${OFF}"
  git status --short | sed 's/^/  /'
  exit 1
fi

[ "$SURVIVED" -eq 0 ]
