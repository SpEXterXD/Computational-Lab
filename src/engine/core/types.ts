/** Shared engine contracts. The engine never imports React (DESIGN.md §12). */

export const FIXED_DT = 1 / 60;

export interface ThemeColors {
  bg: string;
  panel: string;
  raised: string;
  line: string;
  lineStrong: string;
  fg: string;
  fgSecondary: string;
  fgTertiary: string;
  accent: string;
  accentStrong: string;
  viz: readonly [string, string, string, string, string, string];
}

export interface SliderDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
  /** Higher-is-better flag is visual only; formatting stays with the experiment. */
  format?: (value: number) => string;
}

export interface SelectDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue: string;
}

export type ParameterDef = SliderDef | SelectDef;

export function isSelectDef(def: ParameterDef): def is SelectDef {
  return (def as SelectDef).options !== undefined;
}

export type MetricValue = number | string;

export interface PointerState {
  /** Logical (CSS pixel) coordinates relative to the canvas. */
  x: number;
  y: number;
  down: boolean;
  inside: boolean;
}

/**
 * The experiment contract every simulation implements. WASM cores replace the
 * implementation behind this exact interface (DESIGN.md §9).
 */
export interface Experiment {
  readonly id: string;
  initialize(width: number, height: number): void;
  /** Advance simulation time by exactly `dt` seconds. */
  update(dt: number): void;
  /** Draw the current state. `alpha` in [0,1) interpolates between ticks. */
  render(ctx: CanvasRenderingContext2D, theme: ThemeColors, alpha: number): void;
  /** Deterministic: same seed and parameters reproduce the same state. */
  reset(): void;
  /** Advance exactly one fixed tick. */
  step(): void;
  randomize(): void;
  getParameters(): ParameterDef[];
  getParameterValue(key: string): number | string;
  setParameter(key: string, value: number | string): void;
  getMetrics(): Record<string, MetricValue>;
  /** Plain-language state summary for canvas aria-labels. */
  describe(): string;
  /** Entity count for the performance overlay. */
  entities(): number;
  resize?(width: number, height: number): void;
  onPointer?(state: PointerState): void;
}
