import { clamp, resolveThemeColors } from "./theme";
import type { Experiment, MetricValue, ThemeColors } from "./types";

export interface PerfSample {
  fps: number;
  frameMs: number;
  stepsPerSec: number;
  updateMicros: number;
  entities: number;
}

export interface ControllerSnapshot {
  running: boolean;
  reducedMotion: boolean;
  describe: string;
  metrics: Record<string, MetricValue>;
  perf: PerfSample;
}

export interface ControllerOptions {
  updateHz?: number;
  startRunning?: boolean;
}

function ema(previous: number, next: number): number {
  return previous === 0 ? next : previous * 0.9 + next * 0.1;
}

/**
 * Owns the rAF loop. Fixed timestep accumulator decoupled from render rate;
 * behavior is identical at 30fps and 144fps (DESIGN.md §9, §10).
 */
export class SimulationController {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly experiment: Experiment;
  private readonly updateDt: number;
  private readonly reducedMotion: boolean;
  private readonly onThemeChange: () => void;

  private theme: ThemeColors;
  private cssWidth = 0;
  private cssHeight = 0;
  private dpr = 1;
  private running = false;
  private inView = true;
  private dirty = true;
  private speed = 1;
  private raf = 0;
  private last = 0;
  private acc = 0;

  private fps = 0;
  private frameMs = 0;
  private updateMicros = 0;
  private stepCount = 0;
  private windowStart = 0;
  private stepsPerSec = 0;
  private lastNotify = 0;

  private readonly listeners = new Set<(snapshot: ControllerSnapshot) => void>();

  constructor(canvas: HTMLCanvasElement, experiment: Experiment, options: ControllerOptions = {}) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable");
    this.canvas = canvas;
    this.ctx = context;
    this.experiment = experiment;
    this.updateDt = 1 / (options.updateHz ?? 60);
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.theme = resolveThemeColors(canvas);

    this.onThemeChange = () => {
      this.theme = resolveThemeColors(this.canvas);
      this.dirty = true;
    };
    window.addEventListener("cl-themechange", this.onThemeChange);

    this.sizeCanvas();
    this.experiment.initialize(this.cssWidth, this.cssHeight);
    if ((options.startRunning ?? true) && !this.reducedMotion) this.running = true;
    this.windowStart = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  get isRunning(): boolean {
    return this.running;
  }

  get isReducedMotion(): boolean {
    return this.reducedMotion;
  }

  /** Sync the backing store with the element box; logical size = CSS size. */
  resize(): void {
    this.sizeCanvas();
    this.experiment.resize?.(this.cssWidth, this.cssHeight);
    this.dirty = true;
  }

  private sizeCanvas(): void {
    const cssWidth = Math.max(1, Math.round(this.canvas.clientWidth));
    const cssHeight = Math.max(1, Math.round(this.canvas.clientHeight));
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.canvas.width = Math.round(cssWidth * this.dpr);
    this.canvas.height = Math.round(cssHeight * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  play(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.notify(true);
  }

  pause(): void {
    if (!this.running) return;
    this.running = false;
    this.notify(true);
  }

  toggle(): void {
    if (this.running) this.pause();
    else this.play();
  }

  /** Advance exactly one fixed tick, then hold. */
  stepOnce(): void {
    this.pause();
    this.advanceOneTick();
    this.dirty = true;
    this.notify(true);
  }

  private advanceOneTick(): void {
    const start = performance.now();
    this.experiment.step();
    this.updateMicros = ema(this.updateMicros, (performance.now() - start) * 1000);
    this.stepCount += 1;
  }

  reset(): void {
    this.experiment.reset();
    this.acc = 0;
    this.dirty = true;
    this.notify(true);
  }

  randomize(): void {
    this.experiment.randomize();
    this.acc = 0;
    this.dirty = true;
    this.notify(true);
  }

  setSpeed(speed: number): void {
    this.speed = clamp(speed, 0.1, 6);
    this.notify(true);
  }

  getSpeed(): number {
    return this.speed;
  }

  setParameter(key: string, value: number | string): void {
    this.experiment.setParameter(key, value);
    this.dirty = true;
    this.notify(true);
  }

  getExperiment(): Experiment {
    return this.experiment;
  }

  setInView(inView: boolean): void {
    this.inView = inView;
    if (inView) this.dirty = true;
  }

  /** Pointer position in logical CSS pixels. */
  pointer(x: number, y: number, down: boolean, inside: boolean): void {
    this.experiment.onPointer?.({
      x: x * (this.cssWidth / (this.canvas.clientWidth || 1)),
      y: y * (this.cssHeight / (this.canvas.clientHeight || 1)),
      down,
      inside,
    });
    this.dirty = true;
  }

  subscribe(listener: (snapshot: ControllerSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("cl-themechange", this.onThemeChange);
    this.listeners.clear();
  }

  private snapshot(): ControllerSnapshot {
    return {
      running: this.running,
      reducedMotion: this.reducedMotion,
      describe: this.experiment.describe(),
      metrics: this.experiment.getMetrics(),
      perf: {
        fps: Math.round(this.fps),
        frameMs: Math.round(this.frameMs * 10) / 10,
        stepsPerSec: Math.round(this.stepsPerSec),
        updateMicros: Math.round(this.updateMicros * 10) / 10,
        entities: this.experiment.entities(),
      },
    };
  }

  private notify(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastNotify < 250) return;
    this.lastNotify = now;
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }

  private frame = (now: number): void => {
    this.raf = requestAnimationFrame(this.frame);
    const frameStart = performance.now();
    const frameDt = Math.min((now - this.last) / 1000 || 0, 0.25);
    this.last = now;

    if (this.inView && this.running) {
      this.acc += frameDt * this.speed;
      const maxSteps = 4 + Math.ceil(this.speed * 4);
      let steps = 0;
      const updateStart = performance.now();
      while (this.acc >= this.updateDt && steps < maxSteps) {
        this.experiment.update(this.updateDt);
        this.acc -= this.updateDt;
        steps += 1;
        this.stepCount += 1;
      }
      if (steps > 0) {
        this.updateMicros = ema(
          this.updateMicros,
          ((performance.now() - updateStart) * 1000) / steps,
        );
      }
      // Shed backlog so a slow device never accumulates unbounded catch-up.
      if (steps === maxSteps && this.acc > this.updateDt) this.acc = 0;
      this.fps = ema(this.fps, 1 / Math.max(frameDt, 1e-4));
      this.frameMs = ema(this.frameMs, performance.now() - frameStart);
      const windowMs = now - this.windowStart;
      if (windowMs >= 1000) {
        this.stepsPerSec = (this.stepCount * 1000) / windowMs;
        this.stepCount = 0;
        this.windowStart = now;
      }
      this.dirty = true;
    }

    if (this.dirty) {
      this.dirty = false;
      const alpha = this.running ? clamp(this.acc / this.updateDt, 0, 1) : 1;
      this.experiment.render(this.ctx, this.theme, alpha);
    }
    this.notify(false);
  };
}
