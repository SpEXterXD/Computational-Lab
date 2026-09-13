import { FIXED_DT, type Experiment, type ParameterDef, isSelectDef } from "./types";
import { mulberry32, randomSeed, type RandomSource } from "./rng";
import type { ThemeColors } from "./types";

/**
 * Shared machinery: validated parameters, deterministic seeding, and the
 * tick contract. Subclasses implement the simulation itself.
 */
export abstract class BaseExperiment implements Experiment {
  abstract readonly id: string;

  protected width = 0;
  protected height = 0;
  protected rng: RandomSource;
  private seed: number;
  private readonly values = new Map<string, number | string>();
  private readonly defs = new Map<string, ParameterDef>();

  constructor(seed = 1) {
    this.seed = seed >>> 0;
    this.rng = mulberry32(this.seed);
    // Register declared parameters up front so getParameters/setParameter work
    // before initialize(). Subclass params() return static definitions only.
    for (const def of this.params()) {
      this.defs.set(def.key, def);
      this.values.set(def.key, def.defaultValue);
    }
  }

  /** Declared once; defs are registered on first use so reset never forgets them. */
  protected abstract params(): ParameterDef[];
  protected abstract onUpdate(dt: number): void;
  abstract render(ctx: CanvasRenderingContext2D, theme: ThemeColors, alpha: number): void;
  /** Rebuild the initial state; `this.rng` is freshly seeded when this runs. */
  protected abstract onReset(): void;

  initialize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.onReset();
  }

  reset(): void {
    this.rng = mulberry32(this.seed);
    this.onReset();
  }

  randomize(): void {
    this.seed = randomSeed();
    this.reset();
  }

  step(): void {
    this.onUpdate(FIXED_DT);
  }

  update(dt: number): void {
    this.onUpdate(dt);
  }

  protected num(key: string): number {
    return this.values.get(key) as number;
  }

  protected str(key: string): string {
    return this.values.get(key) as string;
  }

  getParameters(): ParameterDef[] {
    return [...this.defs.values()];
  }

  getParameterValue(key: string): number | string {
    const value = this.values.get(key);
    if (value === undefined) throw new Error(`Unknown parameter "${key}" for ${this.id}`);
    return value;
  }

  setParameter(key: string, value: number | string): void {
    const def = this.defs.get(key);
    if (!def) throw new Error(`Unknown parameter "${key}" for ${this.id}`);
    if (isSelectDef(def)) {
      if (!def.options.some((option) => option.value === value)) {
        throw new RangeError(`Invalid value "${value}" for ${this.id}.${key}`);
      }
      this.values.set(key, value);
    } else {
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed)) throw new TypeError(`Non-numeric value for ${this.id}.${key}`);
      const clamped = Math.min(def.max, Math.max(def.min, parsed));
      const stepped =
        Math.round((clamped - def.min) / def.step) * def.step + def.min;
      const decimals = (def.step.toString().split(".")[1] ?? "").length;
      this.values.set(key, Number(stepped.toFixed(decimals)));
    }
    this.onParameterChange(key);
  }

  /** Hook for experiments that rebuild state when a parameter changes. */
  protected onParameterChange(_key: string): void {}

  /** Write a parameter value internally (e.g. presets) without re-triggering hooks. */
  protected setInternalValue(key: string, value: number | string): void {
    this.values.set(key, value);
  }

  getMetrics(): Record<string, number | string> {
    return {};
  }

  describe(): string {
    return `${this.id} simulation.`;
  }

  entities(): number {
    return 0;
  }

}
