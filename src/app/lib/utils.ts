import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * The one focus treatment for the whole app.
 *
 * A 4px `--ring` outline with a 2px transparent offset. It is an OUTLINE, not a
 * `ring-*`, on purpose:
 *   - `ring-*` compiles to `box-shadow`, and every neobrutalist surface here
 *     already owns its `box-shadow` (`shadow-shadow`). Composing the two is
 *     fragile — `hover:shadow-none` wipes the ring's stacking partner.
 *   - the transparent offset lets whatever surface is behind the control show
 *     through, so the gap reads correctly on the lavender page, on a white
 *     card, and on a purple table row without per-context tuning.
 *
 * Do not pair this with `outline-none` / `outline-hidden` on the same element:
 * those set `--tw-outline-style: none`, which silently disables `outline-4`.
 */
export const focusRing =
  "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * Same treatment, but triggered by focus anywhere inside the element. For
 * composite widgets whose focusable child is visually inset (table rows,
 * list items).
 */
export const focusRingWithin =
  "focus-within:outline-4 focus-within:outline-offset-2 focus-within:outline-ring";
