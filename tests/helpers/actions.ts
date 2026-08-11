import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { REPO_ROOT, SRC_DIR } from "./env";

/**
 * The RSC action-id map, derived from source text rather than hardcoded.
 *
 * An action id is `<vite-normalized module path>#<exportName>`, e.g.
 *
 *   /src/app/pages/user/functions.ts#teacherLogin
 *
 * rwsdk's transform emits `registerServerReference(fn, normalizedId, name)`
 * where `normalizedId` is `"/" + path.relative(root, absolutePath)`, and its
 * loader splits on "#" to look the export up. Confirmed live: that exact string,
 * URL-encoded into `?__rsc_action_id=`, invokes the function.
 *
 * ==========================================================================
 * WHY DERIVE INSTEAD OF HARDCODE
 *
 * These modules cannot be imported here to be introspected — they reach
 * `cloudflare:workers`, which does not resolve outside the Worker (and
 * tsconfig.test.json makes attempting it a type error). So the map is built by
 * scanning `src/` for a leading `"use server"` directive and reading the
 * exported function names out of the text.
 *
 * The payoff is `tests/unit/actionIds.test.ts`, which pins this map against a
 * golden list. A rename or a move then breaks ONE legible unit test instead of
 * forty integration tests — and, more importantly, a NEW export appearing in a
 * `"use server"` module fails a test. Every such export is a public network
 * endpoint, and `src/auth/provision.ts` carrying the service-role key is one
 * stray directive away from becoming one.
 * ==========================================================================
 */

/** Matches `export function f(` and `export async function f(`. */
const EXPORTED_FUNCTION = /^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm;

/**
 * Exports that are NOT runtime values and therefore not endpoints. `export type`
 * and `export interface` are erased at compile time; the modules legitimately
 * use them for their result shapes (`ActionResult`, `RequestRewardResult`,
 * `CodesResult`, `NewStudentInput`).
 */
const TYPE_ONLY_EXPORT = /^export\s+(?:type|interface)\b/;

/**
 * Any other export form. These WOULD be reachable endpoints, and the regex above
 * would miss them — so we fail loudly rather than leave a hole in the map.
 *
 * `\{` and `\*` have no `\s+` before them so `export {a}` and `export* from` are
 * caught as well as the spaced spellings.
 */
const UNHANDLED_EXPORT =
  /^export\s*(?:\{|\*)|^export\s+(?:const|let|var|class|default)/;

/**
 * rwsdk's OWN directive detector, imported so the harness and the framework can
 * never disagree about what an action module is.
 *
 * This matters more than it looks. A naive `/^\s*["']use server["']/` only matches
 * a directive at the very start of the file, but rwsdk's `hasDirective` scans the
 * first ~512 characters, skipping `//` and `/* *\/` comments and any preceding
 * directive prologue. So all three of these are action modules to rwsdk and were
 * INVISIBLE to the stricter regex:
 *
 *     // a comment          /* block *\/          "use strict";
 *     "use server";         "use server";         "use server";
 *
 * A module rwsdk treats as an action module but this scanner misses is absent from
 * both the golden list and the sweep's completeness check — the two things that
 * exist to stop the network surface growing unnoticed. Borrowing the framework's
 * own predicate removes the class of bug entirely.
 *
 * Imported by FILE URL because `rwsdk/vite` does not re-export it and the package
 * `exports` map blocks the deep specifier. If rwsdk moves the file this throws at
 * import time, which is the right failure: loud, immediate, and obviously about
 * this.
 */
const { hasDirective } = (await import(
  pathToFileURL(
    path.join(REPO_ROOT, "node_modules/rwsdk/dist/vite/hasDirective.mjs"),
  ).href
)) as { hasDirective: (code: string, directive: string) => boolean };

export type ActionModule = {
  /** e.g. "/src/app/pages/user/functions.ts" */
  modulePath: string;
  /** Repo-relative path, for error messages. */
  file: string;
  exports: string[];
};

function scan(): {
  byName: Map<string, string>;
  collisions: Map<string, string[]>;
  modules: ActionModule[];
} {
  const byName = new Map<string, string>();
  const collisions = new Map<string, string[]>();
  const modules: ActionModule[] = [];

  const entries = readdirSync(SRC_DIR, {
    recursive: true,
    encoding: "utf8",
  }) as string[];

  for (const relative of entries) {
    if (!/\.(ts|tsx)$/.test(relative)) continue;

    const absolute = path.join(SRC_DIR, relative);
    let source: string;
    try {
      source = readFileSync(absolute, "utf8");
    } catch {
      continue; /* a directory entry, or something unreadable */
    }

    if (!hasDirective(source, "use server")) continue;

    /* Vite-normalised module path: "/" + repo-relative, forward slashes. */
    const modulePath =
      "/" + path.relative(REPO_ROOT, absolute).split(path.sep).join("/");

    for (const line of source.split("\n")) {
      if (!line.startsWith("export")) continue;
      if (TYPE_ONLY_EXPORT.test(line)) continue;
      if (UNHANDLED_EXPORT.test(line)) {
        throw new Error(
          `${modulePath} has an export this scanner does not understand:\n` +
            `    ${line.trim()}\n` +
            "Every export of a \"use server\" module is a public network endpoint, so\n" +
            "the id map must not silently miss one. Extend EXPORTED_FUNCTION or\n" +
            "UNHANDLED_EXPORT in tests/helpers/actions.ts.",
        );
      }
    }

    const names = [...source.matchAll(EXPORTED_FUNCTION)].map((m) => m[1]!);
    modules.push({ modulePath, file: path.relative(REPO_ROOT, absolute), exports: names });

    for (const name of names) {
      const id = `${modulePath}#${name}`;
      const existing = byName.get(name);
      if (existing) collisions.set(name, [existing, id]);
      byName.set(name, id);
    }
  }

  modules.sort((a, b) => a.modulePath.localeCompare(b.modulePath));
  return { byName, collisions, modules };
}

const SCAN = scan();

/**
 * `actionId("teacherLogin")` -> "/src/app/pages/user/functions.ts#teacherLogin"
 *
 * Throws with the list of known names on a miss, and refuses to guess when two
 * modules export the same name.
 */
export function actionId(name: string): string {
  const duplicate = SCAN.collisions.get(name);
  if (duplicate) {
    throw new Error(
      `Ambiguous action "${name}" — exported by both ${duplicate.join(" and ")}.\n` +
        "Pass the fully qualified id instead.",
    );
  }
  const id = SCAN.byName.get(name);
  if (id) return id;
  throw new Error(
    `No "use server" export named "${name}".\n` +
      `Known actions: ${[...SCAN.byName.keys()].sort().join(", ")}`,
  );
}

/** Every `"use server"` module found, sorted by path. */
export function allActionModules(): ActionModule[] {
  return SCAN.modules;
}

/** Flat list of `module#export` ids. */
export function allActionIds(): string[] {
  return SCAN.modules
    .flatMap((m) => m.exports.map((e) => `${m.modulePath}#${e}`))
    .sort();
}
