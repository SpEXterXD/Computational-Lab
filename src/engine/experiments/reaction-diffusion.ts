import { BaseExperiment } from "../core/base-experiment";
import { MAGMA, sampleInto } from "../render/colormaps";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";

/**
 * Gray-Scott reaction-diffusion with the classic weighted Laplacian
 * (-1 center, 0.2 orthogonal, 0.05 diagonal) on a torus. One tick applies
 * a configurable number of solver iterations.
 */
export class ReactionDiffusionExperiment extends BaseExperiment {
  readonly id = "reaction-diffusion";

  private n = 96;
  private offsetX = 0;
  private offsetY = 0;
  private drawSize = 0;
  private u = new Float32Array(0);
  private v = new Float32Array(0);
  private u2 = new Float32Array(0);
  private v2 = new Float32Array(0);
  private image: ImageData | null = null;
  private scratch: HTMLCanvasElement | null = null;
  private iterations = 0;
  private activity = 0;
  private pointer = { x: 0, y: 0, down: false, inside: false };

  private readonly Du = 1.0;
  private readonly Dv = 0.5;

  protected params(): ParameterDef[] {
    return [
      {
        key: "resolution",
        label: "Grid",
        options: [
          { value: "72", label: "72 × 72" },
          { value: "96", label: "96 × 96" },
          { value: "128", label: "128 × 128" },
        ],
        defaultValue: "96",
      },
      { key: "feed", label: "Feed rate f", min: 0.01, max: 0.09, step: 0.001, defaultValue: 0.055 },
      { key: "kill", label: "Kill rate k", min: 0.03, max: 0.073, step: 0.001, defaultValue: 0.062 },
      { key: "iterations", label: "Iterations per tick", min: 2, max: 30, step: 1, defaultValue: 12 },
      {
        key: "preset",
        label: "Regime preset",
        options: [
          { value: "custom", label: "Custom" },
          { value: "coral", label: "Coral (f 0.0545, k 0.062)" },
          { value: "mitosis", label: "Mitosis (f 0.0367, k 0.0649)" },
          { value: "worms", label: "Worms (f 0.078, k 0.061)" },
          { value: "spots", label: "Spots (f 0.03, k 0.062)" },
        ],
        defaultValue: "coral",
      },
    ];
  }

  protected onReset(): void {
    this.n = Number(this.str("resolution"));
    const cell = Math.min(this.width, this.height) / this.n;
    this.drawSize = cell * this.n;
    this.offsetX = Math.floor((this.width - this.drawSize) / 2);
    this.offsetY = Math.floor((this.height - this.drawSize) / 2);
    const size = this.n * this.n;
    this.u = new Float32Array(size).fill(1);
    this.v = new Float32Array(size);
    this.u2 = new Float32Array(size);
    this.v2 = new Float32Array(size);
    const blobs = 6;
    for (let b = 0; b < blobs; b++) {
      this.stamp(this.rng() * this.n, this.rng() * this.n, 3 + this.rng() * 3);
    }
    this.iterations = 0;
    this.activity = 0;
    this.image = null;
  }

  private stamp(cx: number, cy: number, radius: number): void {
    for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(this.n, Math.ceil(cy + radius)); y++) {
      for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(this.n, Math.ceil(cx + radius)); x++) {
        if (Math.hypot(x - cx, y - cy) <= radius) {
          this.v[y * this.n + x] = 1;
        }
      }
    }
  }

  protected onParameterChange(key: string): void {
    if (key === "preset") {
      const preset = this.str("preset");
      if (preset !== "custom") {
        const rates: Record<string, [number, number]> = {
          coral: [0.0545, 0.062],
          mitosis: [0.0367, 0.0649],
          worms: [0.078, 0.061],
          spots: [0.03, 0.062],
        };
        const [f, k] = rates[preset];
        this.setInternalValue("feed", f);
        this.setInternalValue("kill", k);
      }
      this.reset();
    } else if (key === "feed" || key === "kill") {
      this.setInternalValue("preset", "custom");
    } else if (key === "resolution") {
      this.reset();
    }
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
      this.stamp(gx, gy, 3);
    }
  }

  protected onUpdate(): void {
    const n = this.n;
    const u = this.u;
    const v = this.v;
    const u2 = this.u2;
    const v2 = this.v2;
    const feed = this.num("feed");
    const kill = this.num("kill");
    let activity = 0;
    const iterations = this.num("iterations");
    for (let it = 0; it < iterations; it++) {
      for (let y = 0; y < n; y++) {
        const up = ((y - 1 + n) % n) * n;
        const down = ((y + 1) % n) * n;
        const row = y * n;
        for (let x = 0; x < n; x++) {
          const left = (x - 1 + n) % n;
          const right = (x + 1) % n;
          const i = row + x;
          const uvv = u[i] * v[i] * v[i];
          const lapU =
            -u[i] +
            0.2 * (u[up + x] + u[down + x] + u[row + left] + u[row + right]) +
            0.05 *
              (u[up + left] + u[up + right] + u[down + left] + u[down + right]);
          const lapV =
            -v[i] +
            0.2 * (v[up + x] + v[down + x] + v[row + left] + v[row + right]) +
            0.05 *
              (v[up + left] + v[up + right] + v[down + left] + v[down + right]);
          const nu = u[i] + this.Du * lapU - uvv + feed * (1 - u[i]);
          const nv = v[i] + this.Dv * lapV + uvv - (kill + feed) * v[i];
          u2[i] = nu > 1 ? 1 : nu < 0 ? 0 : nu;
          v2[i] = nv > 1 ? 1 : nv < 0 ? 0 : nv;
          activity += Math.abs(nv - v[i]);
        }
      }
      u.set(u2);
      v.set(v2);
    }
    this.iterations += iterations;
    this.activity = activity / (n * n * iterations);
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    if (!this.image) this.image = new ImageData(this.n, this.n);
    const data = this.image.data;
    for (let i = 0; i < this.u.length; i++) {
      sampleInto(MAGMA, 1 - this.u[i], data, i * 4);
    }
    if (!this.scratch) {
      this.scratch = document.createElement("canvas");
      this.scratch.width = this.n;
      this.scratch.height = this.n;
    }
    const offCtx = this.scratch.getContext("2d")!;
    offCtx.putImageData(this.image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.scratch, this.offsetX, this.offsetY, this.drawSize, this.drawSize);
  }

  getMetrics() {
    let vSum = 0;
    for (let i = 0; i < this.v.length; i++) vSum += this.v[i];
    return {
      iterations: this.iterations,
      feed: this.num("feed").toFixed(3),
      kill: this.num("kill").toFixed(3),
      meanV: `${((vSum / this.v.length) * 100).toFixed(1)} %`,
      activity: this.activity.toExponential(2),
    };
  }

  describe(): string {
    let vSum = 0;
    for (let i = 0; i < this.v.length; i++) vSum += this.v[i];
    const percent = ((vSum / this.v.length) * 100).toFixed(1);
    return `Gray-Scott at feed ${this.num("feed").toFixed(3)}, kill ${this.num("kill").toFixed(3)}: reagent B covers ${percent}% of the field.`;
  }

  entities(): number {
    return this.n * this.n;
  }
}
