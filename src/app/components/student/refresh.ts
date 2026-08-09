"use client";

import { navigate } from "rwsdk/client";

/**
 * Re-fetch the current page's RSC payload after a successful action, so the
 * server-rendered tables (kudos history, reward requests, points) show the new
 * state without a full document load.
 *
 * `src/client.tsx` calls `initClientNavigation()`, which is what makes
 * `navigate` a soft RSC navigation rather than a location assignment. If that
 * ever fails we fall back to a hard reload — on a child's device a stale screen
 * is a dead end, and a reload is always better than a lie.
 */
export async function refreshPage(): Promise<void> {
  const href =
    typeof window === "undefined"
      ? "/"
      : window.location.pathname + window.location.search;

  try {
    await navigate(href, { history: "replace" });
  } catch {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }
}
