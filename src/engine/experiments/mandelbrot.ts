import { BaseExperiment } from "../core/base-experiment";
import { MAGMA, sampleInto } from "../render/colormaps";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";

const BUFFER_WIDTH = 280;

/**
 * Mandelbrot escape-time set. Iteration counts are computed once per
 * viewport/parameter change into a float buffer (smooth coloring), then
 * re-mapped through a cycling palette each tick, so the image stays alive
 * without recomputing the fractal.
 */
export class MandelbrotExperiment extends BaseExperiment {
  readonly id = "mandelbrot";

  private bufferW = 0;
  private bufferH = 0;
  private mu = new Float32Array(0);
  private image: ImageData | null = null;
  private scratch: HTMLCanvasElement | null = null;
  private needsCompute = true;
  private recomputeCount = 0;
  private cycle = 0;
  private dragX = 0;
  private dragY = 0;
  private dragging = false;
  private interiorFraction = 0;

  protected params(): ParameterDef[] {
    return [
      { key: "zoom", label: "Zoom", min: 0, max: 12, step: 0.1, defaultValue: 0, unit: "×2^" },
      { key: "centerX", label: "Center x", min: -2, max: 1, step: 0.001, defaultValue: -0.6 },
      { key: "centerY", label: "Center y", min: -1.4, max: 1.4, step: 0.001, defaultValue: 0 },
      { key: "maxIter", label: "Iteration cap", min: 32, max: 512, step: 32, defaultValue: 192 },
      { key: "cycle", label: "Palette cycle", min: 0, max: 1, step: 0.05, defaultValue: 0.15 },
    ];
  }

  protected onReset(): void {
    this.needsCompute = true;
    this.cycle = 0;
  }

  protected onParameterChange(key: string): void {
    if (key !== "cycle") this.needsCompute = true;
  }

  protected onUpdate(dt: number): void {
    this.cycle = (this.cycle + this.num("cycle") * dt) % 1;
    if (this.needsCompute) {
      this.recompute();
      this.needsCompute = false;
    }
  }

  private recompute(): void {
    this.bufferW = BUFFER_WIDTH;
    this.bufferH = Math.max(32, Math.round((BUFFER_WIDTH * this.height) / Math.max(1, this.width)));
    const size = this.bufferW * this.bufferH;
    if (this.mu.length !== size) this.mu = new Float32Array(size);
    const maxIter = this.num("maxIter");
    const scale = Math.pow(2, -this.num("zoom"));
    const aspect = this.bufferW / this.bufferH;
    const spanY = 2.6 * scale;
    const spanX = spanY * aspect;
    const cx = this.num("centerX");
    const cy = this.num("centerY");
    let interior = 0;
    for (let py = 0; py < this.bufferH; py++) {
      const y0 = cy + (py / this.bufferH - 0.5) * spanY;
      for (let px = 0; px < this.bufferW; px++) {
        const x0 = cx + (px / this.bufferW - 0.5) * spanX;
        let x = 0;
        let y = 0;
        let it = 0;
        let x2 = 0;
        let y2 = 0;
        while (x2 + y2 <= 64 && it < maxIter) {
          y = 2 * x * y + y0;
          x = x2 - y2 + x0;
          x2 = x * x;
          y2 = y * y;
          it += 1;
        }
        const i = py * this.bufferW + px;
        if (it >= maxIter) {
          this.mu[i] = maxIter;
          interior += 1;
        } else {
          // Smooth coloring: fractional escape iteration.
          this.mu[i] = it + 1 - Math.log2(Math.max(1e-10, Math.log(x2 + y2) / 2));
        }
      }
    }
    this.interiorFraction = size > 0 ? interior / size : 0;
    this.recomputeCount += 1;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.needsCompute = true;
  }

  onPointer(state: PointerState): void {
    const spanY = 2.6 * Math.pow(2, -this.num("zoom"));
    const spanX = spanY * (this.width / Math.max(1, this.height));
    if (state.down && !this.dragging) {
      this.dragging = true;
      this.dragX = state.x;
      this.dragY = state.y;
    }
    if (this.dragging && state.down) {
      const dx = ((state.x - this.dragX) / this.width) * spanX;
      const dy = ((state.y - this.dragY) / this.height) * spanY;
      if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6) {
        this.setInternalValue("centerX", clampNum(this.num("centerX") - dx, -2, 1));
        this.setInternalValue("centerY", clampNum(this.num("centerY") - dy, -1.4, 1.4));
        this.dragX = state.x;
        this.dragY = state.y;
        this.needsCompute = true;
      }
    }
    if (!state.down) this.dragging = false;
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
      const mu = this.mu[i];
      const t =
        mu >= maxIter ? 0 : Math.min(1, Math.max(0, Math.sqrt(mu / maxIter) * 0.92 + this.cycle)) % 1;
      sampleInto(MAGMA, mu >= maxIter ? 0 : t, data, i * 4);
    }
    if (!this.scratch) {
      this.scratch = document.createElement("canvas");
      this.scratch.width = this.bufferW;
      this.scratch.height = this.bufferH;
    }
    const offCtx = this.scratch.getContext("2d")!;
    offCtx.putImageData(this.image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.scratch, 0, 0, this.width, this.height);
  }

  getMetrics() {
    const zoom = Math.pow(2, this.num("zoom"));
    return {
      zoom: `${zoom < 100 ? zoom.toFixed(1) : zoom.toFixed(0)} ×`,
      center: `${this.num("centerX").toFixed(3)}, ${this.num("centerY").toFixed(3)}`,
      maxIter: this.num("maxIter"),
      interior: `${(this.interiorFraction * 100).toFixed(1)} %`,
      recomputes: this.recomputeCount,
    };
  }

  describe(): string {
    return `The Mandelbrot set at ${Math.pow(2, this.num("zoom")).toFixed(0)}× zoom with a ${this.num("maxIter")}-iteration cap; drag to pan, sliders to zoom.`;
  }

  entities(): number {
    return this.bufferW * this.bufferH;
  }
}

function clampNum(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
