/**
 * Perceptual colormaps for field data (DESIGN.md §3.4). Built once as 256-entry
 * lookup tables; sampling never allocates in the hot loop.
 */

export interface ColorLUT {
  r: Uint8ClampedArray;
  g: Uint8ClampedArray;
  b: Uint8ClampedArray;
}

interface Stop {
  t: number;
  color: [number, number, number];
}

function buildLUT(stops: Stop[]): ColorLUT {
  const r = new Uint8ClampedArray(256);
  const g = new Uint8ClampedArray(256);
  const b = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let c = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s].t && t <= stops[s + 1].t) {
        a = stops[s];
        c = stops[s + 1];
        break;
      }
    }
    const span = c.t - a.t || 1;
    const k = (t - a.t) / span;
    r[i] = a.color[0] + (c.color[0] - a.color[0]) * k;
    g[i] = a.color[1] + (c.color[1] - a.color[1]) * k;
    b[i] = a.color[2] + (c.color[2] - a.color[2]) * k;
  }
  return { r, g, b };
}

/** Dark -> violet -> vermillion -> amber, aligned with the accent family. */
export const MAGMA: ColorLUT = buildLUT([
  { t: 0, color: [11, 11, 13] },
  { t: 0.25, color: [58, 24, 67] },
  { t: 0.5, color: [161, 42, 78] },
  { t: 0.75, color: [232, 98, 44] },
  { t: 1, color: [240, 196, 74] },
]);

/** Deep blue -> cyan -> paper, for signed or secondary fields. */
export const ICE: ColorLUT = buildLUT([
  { t: 0, color: [11, 11, 13] },
  { t: 0.4, color: [0, 90, 143] },
  { t: 0.75, color: [86, 180, 233] },
  { t: 1, color: [242, 240, 236] },
]);

/** Sample into an existing Uint8ClampedArray (ImageData buffer). */
export function sampleInto(
  lut: ColorLUT,
  t: number,
  out: Uint8ClampedArray,
  offset: number,
  alpha = 255,
): void {
  const index = t <= 0 ? 0 : t >= 1 ? 255 : (t * 255) | 0;
  out[offset] = lut.r[index];
  out[offset + 1] = lut.g[index];
  out[offset + 2] = lut.b[index];
  out[offset + 3] = alpha;
}

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16) || 0,
    parseInt(value.slice(2, 4), 16) || 0,
    parseInt(value.slice(4, 6), 16) || 0,
  ];
}

/**
 * Signed-data colormap built from the CURRENT theme tokens (negative ->
 * background -> positive). Rebuilt when the theme changes so canvases never
 * diverge from the design system (DESIGN.md §3.4).
 */
export function buildDiverging(
  negativeHex: string,
  midHex: string,
  positiveHex: string,
): ColorLUT {
  const neg = parseHex(negativeHex);
  const mid = parseHex(midHex);
  const pos = parseHex(positiveHex);
  return buildLUT([
    { t: 0, color: neg },
    { t: 0.5, color: mid },
    { t: 1, color: pos },
  ]);
}
