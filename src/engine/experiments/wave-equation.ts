import { BaseExperiment } from "../core/base-experiment";
import { sampleInto } from "../render/colormaps";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";
import { divergingFor } from "../render/diverging-cache";

/**
 * The 2-D wave equation u_tt = c^2 lap(u) - b u_t on a grid with fixed
 * edges, integrated with the standard leapfrog-in-time finite difference.
 * Drag on the surface to launch ripples; damping bleeds energy like a real
 * drum head.
 */
export class WaveEquationExperiment extends BaseExperiment {
  readonly id = "wave-equation";

  private n = 80;
  private drawSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  private u = new Float32Array(0);
  private uPrev = new Float32Array(0);
  private uNext = new Float32Array(0);
  private image: ImageData | null = null;
  private scratch: HTMLCanvasElement | null = null;
  private steps = 0;
  private amplitude = 0;
  private pointer = { x: 0, y: 0, down: false, inside: false };

  protected params(): ParameterDef[] {
    return [
      { key: "speed", label: "Wave speed c", min: 0.2, max: 0.9, step: 0.05, defaultValue: 0.5 },
      { key: "damping", label: "Damping", min: 0, max: 0.02, step: 0.001, defaultValue: 0.004 },
      { key: "iterations", label: "Steps per tick", min: 1, max: 6, step: 1, defaultValue: 2 },
    ];
  }

  protected onReset(): void {
    this.n = 80;
    const cell = Math.min(this.width, this.height) / this.n;
    this.drawSize = cell * this.n;
    this.offsetX = Math.floor((this.width - this.drawSize) / 2);
    this.offsetY = Math.floor((this.height - this.drawSize) / 2);
    const size = this.n * this.n;
    this.u = new Float32Array(size);
    this.uPrev = new Float32Array(size);
    this.uNext = new Float32Array(size);
    // Initial: a Gaussian pulse at the center.
    const cx = this.n / 2;
    const cy = this.n / 2;
    for (let y = 1; y < this.n - 1; y++) {
      for (let x = 1; x < this.n - 1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        this.u[y * this.n + x] = Math.exp(-(d * d) / 18) * Math.cos(d * 1.1);
      }
    }
    this.steps = 0;
    this.amplitude = 1;
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
      for (let y = Math.max(1, Math.floor(gy - 2)); y < Math.min(this.n - 1, Math.ceil(gy + 2)); y++) {
        for (let x = Math.max(1, Math.floor(gx - 2)); x < Math.min(this.n - 1, Math.ceil(gx + 2)); x++) {
          this.uPrev[y * this.n + x] += Math.exp(-((x - gx) ** 2 + (y - gy) ** 2) / 3) * 0.8;
        }
      }
    }
  }

  protected onUpdate(): void {
    const n = this.n;
    const c = this.num("speed");
    const damping = this.num("damping");
    const iterations = this.num("iterations");
    for (let it = 0; it < iterations; it++) {
      for (let y = 1; y < n - 1; y++) {
        for (let x = 1; x < n - 1; x++) {
          const i = y * n + x;
          const lap = this.u[i - 1] + this.u[i + 1] + this.u[i - n] + this.u[i + n] - 4 * this.u[i];
          this.uNext[i] = 2 * this.u[i] - this.uPrev[i] + c * c * lap;
          this.uNext[i] *= 1 - damping;
        }
      }
      // Fixed edges: uNext already zero on the boundary (never written).
      this.uPrev.set(this.u);
      this.u.set(this.uNext);
      this.steps += 1;
    }
    let maxAbs = 0;
    for (let i = 0; i < this.u.length; i++) maxAbs = Math.max(maxAbs, Math.abs(this.u[i]));
    this.amplitude = maxAbs;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    if (!this.image || this.image.width !== this.n) {
      this.image = new ImageData(this.n, this.n);
      this.scratch = document.createElement("canvas");
      this.scratch.width = this.n;
      this.scratch.height = this.n;
    }
    const diverging = divergingFor(theme);
    let maxAbs = 1e-6;
    for (let i = 0; i < this.u.length; i++) maxAbs = Math.max(maxAbs, Math.abs(this.u[i]));
    const data = this.image.data;
    for (let i = 0; i < this.u.length; i++) {
      const t = Math.min(1, Math.max(0, 0.5 + (this.u[i] / maxAbs) * 0.5));
      sampleInto(diverging, t, data, i * 4);
    }
    this.scratch!.getContext("2d")!.putImageData(this.image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.scratch!, this.offsetX, this.offsetY, this.drawSize, this.drawSize);
  }

  getMetrics() {
    return {
      steps: this.steps.toLocaleString("en-US"),
      amplitude: this.amplitude.toExponential(2),
      waveSpeed: this.num("speed").toFixed(2),
      damping: this.num("damping").toFixed(3),
    };
  }

  describe(): string {
    return `A drum head of ${this.n} by ${this.n} cells after ${this.steps.toLocaleString("en-US")} wave-equation steps; peak amplitude ${this.amplitude.toExponential(1)}. Drag to add ripples.`;
  }

  entities(): number {
    return this.n * this.n;
  }
}
