import type { ThemeColors } from "./types";

const VARS: Record<string, string> = {
  bg: "--bg-primary",
  panel: "--bg-secondary",
  raised: "--bg-tertiary",
  line: "--border-subtle",
  lineStrong: "--border-strong",
  fg: "--text-primary",
  fgSecondary: "--text-secondary",
  fgTertiary: "--text-tertiary",
  accent: "--accent",
  accentStrong: "--accent-strong",
  viz1: "--viz-1",
  viz2: "--viz-2",
  viz3: "--viz-3",
  viz4: "--viz-4",
  viz5: "--viz-5",
  viz6: "--viz-6",
};

/**
 * Reads the design tokens once per theme change; canvases never call
 * getComputedStyle inside the render loop (DESIGN.md §9).
 */
export function resolveThemeColors(element: Element): ThemeColors {
  const styles = getComputedStyle(element);
  const read = (key: string) => styles.getPropertyValue(VARS[key]).trim();
  return {
    bg: read("bg"),
    panel: read("panel"),
    raised: read("raised"),
    line: read("line"),
    lineStrong: read("lineStrong"),
    fg: read("fg"),
    fgSecondary: read("fgSecondary"),
    fgTertiary: read("fgTertiary"),
    accent: read("accent"),
    accentStrong: read("accentStrong"),
    viz: [read("viz1"), read("viz2"), read("viz3"), read("viz4"), read("viz5"), read("viz6")],
  };
}

/** "#rrggbb" + alpha -> "rgba(...)" for trails and fades. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
