import { afterAll, beforeAll } from "vitest";

import { closeTestDb } from "../helpers/db";
import { warmUp } from "./globalSetup";

/**
 * Per-test-file setup.
 *
 * The warm-up runs again for every file, not just once in globalSetup, because
 * HMR can invalidate the dev server's module graph between files — and a cold
 * module graph serialises the first request through it, which is the main way a
 * concurrency test ends up passing vacuously. `assertRealOverlap` is the backstop
 * for that; this is the prevention.
 *
 * The pool closed here is this worker's own: `testDb()` is module-scoped, and
 * each vitest worker has its own module registry. Without it the process keeps
 * open connections and hangs at the end of the run.
 */
beforeAll(warmUp, 120_000);
afterAll(closeTestDb);
