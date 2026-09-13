import { BaseExperiment } from "../core/base-experiment";
import { MAGMA, sampleInto } from "../render/colormaps";
import type { ParameterDef, ThemeColors } from "../core/types";

const BUFFER_WIDTH = 300;

/**
 * Julia sets of z = z^2 + c: one complex parameter c, infinitely many sets.
 * The animate slider orbits c around a circle, so the set morphs continuously.
 */
export class JuliaSetExperiment extends BaseExperiment {
  readonly id = "julia-set";

  private bufferW = 0;
  private bufferH = 0;
  private mu = new Float32Array(0);
  private image: ImageData | null = null;
  private scratch: HTMLCanvasElement | null = null;
  private orbit = 0;

  protected params(): ParameterDef[] {
    return [
      { key: "cRe", label: "c (real)", min: -1, max: 1, step: 0.001, defaultValue: -0.4 },
      { key: "cIm", label: "c (imaginary)", min: -1, max: 1, step: 0.001, defaultValue: 0.6 },
      { key: "maxIter", label: "Iteration cap", min: 32, max: 320, step: 32, defaultValue: 160 },
      { key: "animate", label: "Orbit speed", min: 0, max: 1, step: 0.05, defaultValue: 0.12 },
    ];
  }

  protected onReset(): void {
    this.orbit = 0;
  }

  protected onUpdate(dt: number): void {
    const speed = this.num("animate");
    if (speed > 0) {
      this.orbit = (this.orbit + speed * dt) % (2 * Math.PI);
      // Orbit c on a circle of radius 0.7885 centered at origin: the classic
      // movie path through connected and disconnected sets.
      this.setInternalValue("cRe", 0.7885 * Math.cos(this.orbit));
      this.setInternalValue("cIm", 0.7885 * Math.sin(this.orbit));
    }
    this.compute();
  }

  private compute(): void {
    this.bufferW = BUFFER_WIDTH;
    this.bufferH = Math.max(32, Math.round((BUFFER_WIDTH * this.height) / Math.max(1, this.width)));
    if (this.mu.length !== this.bufferW * this.bufferH) {
      this.mu = new Float32Array(this.bufferW * this.bufferH);
      this.image = null;
      this.scratch = null;
    }
    const maxIter = this.num("maxIter");
    const cre = this.num("cRe");
    const cim = this.num("cIm");
    const span = 3.2;
    const aspect = this.bufferW / this.bufferH;
    for (let py = 0; py < this.bufferH; py++) {
      const y0 = ((py / this.bufferH) - 0.5) * span;
      for (let px = 0; px < this.bufferW; px++) {
        const x0 = ((px / this.bufferW) - 0.5) * span * aspect;
        let zx = x0;
        let zy = y0;
        let it = 0;
        let x2 = zx * zx;
        let y2 = zy * zy;
        while (x2 + y2 <= 16 && it < maxIter) {
          zy = 2 * zx * zy + cim;
          zx = x2 - y2 + cre;
          x2 = zx * zx;
          y2 = zy * zy;
          it += 1;
        }
        this.mu[py * this.bufferW + px] = it;
      }
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    if (!this.image || this.image.width !== this.bufferW || this.image.height !== this.bufferH) {
      this.image = new ImageData(this.bufferW, this.bufferH);
      this.scratch = null;
    }
    const maxIter = this.num("maxIter");
    const data = this.image.data;
    for (let i = 0; i < this.mu.length; i++) {
      const t = this.mu[i] >= maxIter ? 0 : (this.mu[i] / maxIter) ** 0.55;
      sampleInto(MAGMA, t, data, i * 4);
    }
    if (!this.scratch) {
      this.scratch = document.createElement("canvas");
      this.scratch.width = this.bufferW;
      this.scratch.height = this.bufferH;
    }
    this.scratch.getContext("2d")!.putImageData(this.image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.scratch, 0, 0, this.width, this.height);
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = theme.fgSecondary;
    ctx.fillText(
      `c = ${this.num("cRe").toFixed(3)} ${this.num("cIm") >= 0 ? "+" : "-"} ${Math.abs(this.num("cIm")).toFixed(3)}i`,
      10,
      16,
    );
  }

  getMetrics() {
    return {
      c: `${this.num("cRe").toFixed(3)} ${this.num("cIm") >= 0 ? "+" : "-"} ${Math.abs(this.num("cIm")).toFixed(3)}i`,
      maxIter: this.num("maxIter"),
      magnitude: Math.hypot(this.num("cRe"), this.num("cIm")).toFixed(3),
    };
  }

  describe(): string {
    return `The Julia set of z squared plus c with c = ${this.num("cRe").toFixed(3)} ${this.num("cIm") >= 0 ? "+" : "-"} ${Math.abs(this.num("cIm")).toFixed(3)}i.`;
  }

  entities(): number {
    return this.bufferW * this.bufferH;
  }
}
