import { BaseExperiment } from "../core/base-experiment";
import { MAGMA, sampleInto } from "../render/colormaps";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";

/**
 * 2D heat equation via explicit FTCS finite differences. The stability limit
 * (alpha <= 0.24 in cell units) is enforced by clamping and surfaced as a
 * metric, never silently ignored.
 */
export class HeatDiffusionExperiment extends BaseExperiment {
  readonly id = "heat-diffusion";

  private n = 96;
  private offsetX = 0;
  private offsetY = 0;
  private drawSize = 0;
  private u = new Float32Array(0);
  private next = new Float32Array(0);
  private image: ImageData | null = null;
  private scratch: HTMLCanvasElement | null = null;
  private steps = 0;
  private peakScale = 1;
  private clamped = false;
  private pointer = { x: 0, y: 0, down: false, inside: false };

  protected params(): ParameterDef[] {
    return [
      {
        key: "resolution",
        label: "Grid",
        options: [
          { value: "64", label: "64 × 64" },
          { value: "96", label: "96 × 96" },
          { value: "128", label: "128 × 128" },
        ],
        defaultValue: "96",
      },
      { key: "alpha", label: "Diffusivity α", min: 0.02, max: 0.24, step: 0.01, defaultValue: 0.2 },
      { key: "iterations", label: "Steps per tick", min: 1, max: 20, step: 1, defaultValue: 4 },
      {
        key: "boundary",
        label: "Boundary",
        options: [
          { value: "insulated", label: "Insulated" },
          { value: "fixed", label: "Held at zero" },
        ],
        defaultValue: "insulated",
      },
      {
        key: "initial",
        label: "Initial state",
        options: [
          { value: "blob", label: "Center blob" },
          { value: "bar", label: "Left bar" },
          { value: "random", label: "Random patches" },
        ],
        defaultValue: "blob",
      },
    ];
  }

  protected onReset(): void {
    this.n = Number(this.str("resolution"));
    const cell = Math.min(this.width, this.height) / this.n;
    this.drawSize = cell * this.n;
    this.offsetX = Math.floor((this.width - this.drawSize) / 2);
    this.offsetY = Math.floor((this.height - this.drawSize) / 2);
    this.u = new Float32Array(this.n * this.n);
    this.next = new Float32Array(this.n * this.n);
    const initial = this.str("initial");
    if (initial === "blob") {
      this.stampHeat(this.n / 2, this.n / 2, Math.max(3, this.n / 8), 1);
    } else if (initial === "bar") {
      for (let y = 0; y < this.n; y++) {
        for (let x = 0; x < Math.max(2, this.n / 10); x++) {
          this.u[y * this.n + x] = 1;
        }
      }
    } else {
      const patches = 8;
      for (let p = 0; p < patches; p++) {
        this.stampHeat(this.rng() * this.n, this.rng() * this.n, 2 + this.rng() * (this.n / 10), 1);
      }
    }
    this.steps = 0;
    this.peakScale = 1;
    this.image = null;
  }

  private stampHeat(cx: number, cy: number, radius: number, value: number): void {
    for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(this.n, Math.ceil(cy + radius)); y++) {
      for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(this.n, Math.ceil(cx + radius)); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= radius) {
          const i = y * this.n + x;
          this.u[i] = Math.max(this.u[i], value * (1 - d / radius));
        }
      }
    }
  }

  protected onParameterChange(key: string): void {
    if (key !== "iterations") this.reset();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.reset();
  }

  onPointer(state: PointerState): void {
    this.pointer = state;
    if (state.inside && state.down) {
      const gx = ((state.x - this.offsetX) / this.drawSize) * this.n;
      const gy = ((state.y - this.offsetY) / this.drawSize) * this.n;
      this.stampHeat(gx, gy, Math.max(2, this.n / 24), 1);
      this.peakScale = 1;
    }
  }

  protected onUpdate(): void {
    const alpha = Math.min(this.num("alpha"), 0.24);
    this.clamped = alpha < this.num("alpha") - 1e-9;
    const n = this.n;
    const u = this.u;
    const next = this.next;
    const insulated = this.str("boundary") === "insulated";
    const iterations = this.num("iterations");
    for (let it = 0; it < iterations; it++) {
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const i = y * n + x;
          // Insulated (Neumann) boundary: the ghost cell mirrors the cell's
          // own value, which makes the stencil exactly conservative.
          const up = y > 0 ? u[i - n] : insulated ? u[i] : 0;
          const down = y < n - 1 ? u[i + n] : insulated ? u[i] : 0;
          const left = x > 0 ? u[i - 1] : insulated ? u[i] : 0;
          const right = x < n - 1 ? u[i + 1] : insulated ? u[i] : 0;
          const laplacian = up + down + left + right - 4 * u[i];
          next[i] = u[i] + alpha * laplacian;
        }
      }
      u.set(next);
    }
    this.steps += iterations;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    if (!this.image) this.image = new ImageData(this.n, this.n);
    const n = this.n;
    let max = 0;
    for (let i = 0; i < this.u.length; i++) {
      if (this.u[i] > max) max = this.u[i];
    }
    if (max > this.peakScale || max < this.peakScale * 0.4) this.peakScale = Math.max(max, 1e-4);
    const data = this.image.data;
    for (let i = 0; i < this.u.length; i++) {
      sampleInto(MAGMA, this.u[i] / this.peakScale, data, i * 4);
    }
    if (!this.scratch) {
      this.scratch = document.createElement("canvas");
      this.scratch.width = n;
      this.scratch.height = n;
    }
    const offCtx = this.scratch.getContext("2d")!;
    offCtx.putImageData(this.image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.scratch, this.offsetX, this.offsetY, this.drawSize, this.drawSize);
  }

  getMetrics() {
    let sum = 0;
    let max = 0;
    for (let i = 0; i < this.u.length; i++) {
      sum += this.u[i];
      if (this.u[i] > max) max = this.u[i];
    }
    const mean = sum / this.u.length;
    return {
      steps: this.steps,
      peak: max.toFixed(3),
      mean: mean.toFixed(4),
      totalEnergy: sum.toFixed(1),
      stability: this.clamped ? "α clamped to 0.24" : "unconditional OK",
    };
  }

  describe(): string {
    let sum = 0;
    let max = 0;
    for (let i = 0; i < this.u.length; i++) {
      sum += this.u[i];
      if (this.u[i] > max) max = this.u[i];
    }
    return `After ${this.steps.toLocaleString("en-US")} solver steps the field peaks at ${max.toFixed(2)} with mean ${ (sum / this.u.length).toFixed(3)}.`;
  }

  entities(): number {
    return this.n * this.n;
  }
}
