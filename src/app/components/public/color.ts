/**
 * Pure colour helpers. No DB, no env, no request context — safe to import from
 * a `"use client"` component.
 *
 * Teachers pick location colours freely, so a fixed white-on-colour label goes
 * unreadable the moment somebody chooses pale yellow. These pick the text colour
 * from the swatch's own luminance instead.
 */

/** `#abc` / `#aabbcc` -> [r, g, b], or null for anything we cannot parse. */
function parseHex(color: string): [number, number, number] | null {
  const hex = color.trim().replace(/^#/, "");

  if (hex.length === 3) {
    const [r, g, b] = hex.split("");
    if (!r || !g || !b) return null;
    return parseHex(`${r}${r}${g}${g}${b}${b}`);
  }

  if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) return null;

  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

/** Black or white, whichever is legible on `color`. Defaults to black. */
export function readableTextColor(color: string | null | undefined): string {
  if (!color) return "#000000";

  const rgb = parseHex(color);
  if (!rgb) return "#000000";

  const [r, g, b] = rgb;
  // Rec. 601 luma — cheap, and good enough to choose between two extremes.
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luma > 0.6 ? "#000000" : "#ffffff";
}

/** A usable background, falling back to the neobrutalism secondary surface. */
export function swatchBackground(color: string | null | undefined): string {
  if (!color) return "var(--color-secondary-background, #ffffff)";
  return parseHex(color) ? color : "var(--color-secondary-background, #ffffff)";
}
