import type { ColorLUT } from "./colormaps";
import { buildDiverging } from "./colormaps";

/**
 * Theme-keyed cache for the diverging colormap so field-rendering engines
 * stop carrying five private copies of the same three-line memo.
 * Keyed on the token triple; rebuilt once per theme change.
 */
let cache: ColorLUT | null = null;
let key = "";

export function divergingFor(theme: { bg: string; accent: string; viz: readonly string[] }): ColorLUT {
  const nextKey = `${theme.bg}|${theme.accent}|${theme.viz[1]}`;
  if (!cache || key !== nextKey) {
    cache = buildDiverging(theme.viz[1], theme.bg, theme.accent);
    key = nextKey;
  }
  return cache;
}
