#!/usr/bin/env bash
#
# Switch which environment `.env` points at.
#
#   npm run env:local     the local Supabase stack — dev and tests
#   npm run env:remote    the online project — real email, production data
#   npm run env:which     which is active right now
#
#   npm run env:local -- --force    overwrite hand-edits to .env
#
# ============================================================================
# WHY `.env` IS A COPY RATHER THAN A SYMLINK PER MODE
#
# `.dev.vars` is a symlink to `.env`, and that is load-bearing: the Worker reads
# `.dev.vars` (via @cloudflare/vite-plugin) while the test harness reads `.env` (via
# Vite's loadEnv in vitest.config.mts). One file behind both means the harness and
# the app can never disagree about a secret. Symlinking `.env` at a mode file would
# add a second indirection for no gain and make `.dev.vars` a symlink to a symlink.
#
# So: `.env.localstack` and `.env.remote` are SOURCES, `.env` is the active COPY,
# and the first line of each source is a marker this script reads.
# ============================================================================
#
# ============================================================================
# FILENAMES THAT MUST NEVER BE CREATED: .env.local, .env.test, .env.test.local
#
# `vitest.config.mts` calls loadEnv("test", …), and Vite's loadEnv reads `.env`,
# `.env.local`, `.env.test` and `.env.test.local` — the last three at HIGHER
# precedence than `.env`. The Worker, meanwhile, keeps reading `.dev.vars` -> `.env`.
# Any of those three files therefore silently gives the tests different values from
# the app, breaking the one invariant this whole arrangement exists to guarantee.
#
# `.env.localstack` and `.env.remote` are safe precisely because loadEnv ignores
# them.
# ============================================================================
set -uo pipefail
cd "$(dirname "$0")/.."

BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; OFF=$'\033[0m'

LOCAL_SRC=.env.localstack
REMOTE_SRC=.env.remote
ACTIVE=.env
MARKER='^# CLASS_KUDOS_ENV='

mode_of() { # file -> localstack | remote | (empty)
  [ -f "$1" ] || return 0
  sed -n "1s/${MARKER}//p" "$1" | tr -d '[:space:]'
}

describe_active() {
  if [ ! -e "$ACTIVE" ]; then
    echo "${RED}no .env at all${OFF} — run ${BOLD}npm run env:local${OFF}"
    return
  fi

  local mode; mode="$(mode_of "$ACTIVE")"
  case "$mode" in
    localstack) echo "${GREEN}localstack${OFF} ${DIM}(local Supabase — dev and tests)${OFF}" ;;
    remote)     echo "${YELLOW}remote${OFF} ${DIM}(the ONLINE project — do not run tests or seed)${OFF}" ;;
    *)          echo "${RED}unrecognised${OFF} ${DIM}(no CLASS_KUDOS_ENV marker on line 1)${OFF}" ;;
  esac
}

# Has .env been edited since it was copied from its source?
has_local_edits() {
  local mode; mode="$(mode_of "$ACTIVE")"
  local src=""
  [ "$mode" = "localstack" ] && src="$LOCAL_SRC"
  [ "$mode" = "remote" ] && src="$REMOTE_SRC"
  [ -z "$src" ] && return 1          # unknown mode: not "edits", handled elsewhere
  [ -f "$src" ] || return 1
  ! cmp -s "$ACTIVE" "$src"
}

# `.dev.vars` is an ABSOLUTE symlink created by rwsdk's setupEnvFiles. Renaming or
# moving the repo directory dangles it silently — the Worker then has no secrets at
# all while the tests, which read `.env` directly, keep passing. Worth checking every
# time rather than discovering it as a mystery 500.
check_symlink() {
  if [ ! -e .dev.vars ] && [ ! -L .dev.vars ]; then
    echo "  ${YELLOW}warning${OFF} .dev.vars is missing — the Worker will have no secrets."
    echo "          fix: ${BOLD}ln -s \"\$PWD/.env\" .dev.vars${OFF}"
  elif [ -L .dev.vars ] && [ ! -e .dev.vars ]; then
    echo "  ${RED}DANGLING${OFF} .dev.vars points at $(readlink .dev.vars), which does not exist."
    echo "          The repo was probably moved or renamed. Fix:"
    echo "          ${BOLD}rm .dev.vars && ln -s \"\$PWD/.env\" .dev.vars${OFF}"
  fi
}

usage() { echo "usage: $0 {local|remote|which} [--force]" >&2; exit 2; }

command="${1:-}"; shift || true
force=""
[ "${1:-}" = "--force" ] && force=1

case "$command" in
  which)
    echo "${BOLD}active${OFF}  $(describe_active)"
    if has_local_edits; then
      echo "  ${YELLOW}note${OFF}    .env differs from $( [ "$(mode_of "$ACTIVE")" = remote ] && echo "$REMOTE_SRC" || echo "$LOCAL_SRC" ) — it has been edited by hand."
    fi
    check_symlink
    ;;

  local|remote)
    if [ "$command" = "local" ]; then src="$LOCAL_SRC"; else src="$REMOTE_SRC"; fi

    if [ ! -f "$src" ]; then
      echo "${RED}$src does not exist.${OFF}"
      echo "See .env.example for what belongs in it."
      exit 1
    fi

    # Refuse to discard work. A tool that silently throws away uncommitted edits is
    # worse than no tool — exactly the failure that cost an afternoon when the
    # mutation harness restored files with \`git checkout\`.
    if [ -z "$force" ] && has_local_edits; then
      echo "${RED}refusing to overwrite .env — it has hand-edits.${OFF}"
      echo
      echo "Currently active: $(describe_active)"
      echo "Differences from its source:"
      diff "$( [ "$(mode_of "$ACTIVE")" = remote ] && echo "$REMOTE_SRC" || echo "$LOCAL_SRC" )" "$ACTIVE" \
        | sed 's/^/    /' | head -20
      echo
      echo "Either fold those edits into the source file, or re-run with ${BOLD}--force${OFF}."
      exit 1
    fi

    cp "$src" "$ACTIVE"
    echo "${BOLD}active${OFF}  $(describe_active)"
    check_symlink

    if [ "$command" = "remote" ]; then
      echo
      echo "${YELLOW}${BOLD}You are now pointed at the ONLINE project.${OFF}"
      echo "  ${BOLD}Do not${OFF} run ${BOLD}npm run test:integration${OFF} — the fixtures create and DESTROY"
      echo "         groups, students and balances. The harness refuses a non-local"
      echo "         database, which is the backstop; do not defeat it casually."
      echo "  ${BOLD}Do not${OFF} run ${BOLD}npm run seed${OFF} — it writes demo students and groups."
      echo "  Switch back with ${BOLD}npm run env:local${OFF} when you are done."
    fi
    ;;

  ""|-h|--help) usage ;;
  *) echo "${RED}unknown command: $command${OFF}"; usage ;;
esac
