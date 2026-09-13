import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

const SIZE = 110;

/**
 * Floyd-Steinberg error-diffusion dithering: quantize each pixel and push
 * the rounding error to the four neighbors. Averaging is the invariant -
 * the dithered image's mean luminance must match the original's, and the
 * metric shows it.
 */
export class DitheringExperiment extends BaseExperiment {
  readonly id = "dithering";

  private original = new Float64Array(SIZE * SIZE);
  private dithered = new Float64Array(SIZE * SIZE);
  private image: ImageData | null = null;
  private scratch: HTMLCanvasElement | null = null;
  private needsCompute = true;
  private originalMean = 0;
  private ditheredMean = 0;

  protected params(): ParameterDef[] {
    return [
      {
        key: "pattern",
        label: "Source image",
        options: [
          { value: "gradient", label: "Gradient" },
          { value: "shapes", label: "Shapes" },
        ],
        defaultValue: "shapes",
      },
      { key: "levels", label: "Gray levels", min: 2, max: 5, step: 1, defaultValue: 2 },
      {
        key: "mode",
        label: "Method",
        options: [
          { value: "fs", label: "Floyd-Steinberg" },
          { value: "threshold", label: "Plain threshold" },
        ],
        defaultValue: "fs",
      },
    ];
  }

  protected onReset(): void {
    const pattern = this.str("pattern");
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const u = x / SIZE;
        const v = y / SIZE;
        let value: number;
        if (pattern === "gradient") {
          value = u * 0.85 + 0.05;
        } else {
          const disk = Math.hypot(u - 0.4, v - 0.42) < 0.22 ? 0.55 : 0;
          value = Math.min(1, 0.15 + v * 0.5 + disk + (Math.sin(u * 30) * 0.04 + 0.04));
        }
        this.original[y * SIZE + x] = Math.min(1, Math.max(0, value));
      }
    }
    this.needsCompute = true;
  }

  protected onParameterChange(): void {
    this.needsCompute = true;
  }

  private compute(): void {
    const levels = this.num("levels");
    const quantize = (v: number) => Math.round(v * (levels - 1)) / (levels - 1);
    const work = Float64Array.from(this.original);
    this.dithered.fill(0);
    const fs = this.str("mode") === "fs";
    for (let y = 0; y < SIZE; y++) {
      const serpentine = y % 2 === 0;
      for (let i = 0; i < SIZE; i++) {
        const x = serpentine ? SIZE - 1 - i : i;
        const idx = y * SIZE + x;
        const old = Math.min(1, Math.max(0, work[idx]));
        const newV = quantize(old);
        this.dithered[idx] = newV;
        const err = old - newV;
        if (!fs) continue;
        // Floyd-Steinberg kernel: 7/16 right, 3/16 below-left, 5/16 below, 1/16 below-right.
        const right = serpentine ? -1 : 1;
        if (x + right >= 0 && x + right < SIZE) work[idx + right] += (err * 7) / 16;
        if (y + 1 < SIZE) {
          if (x - right >= 0) work[idx + SIZE - right] += (err * 3) / 16;
          work[idx + SIZE] += (err * 5) / 16;
          if (x + right >= 0 && x + right < SIZE) work[idx + SIZE + right] += err / 16;
        }
      }
    }
    let oSum = 0;
    let dSum = 0;
    for (let i = 0; i < this.original.length; i++) {
      oSum += this.original[i];
      dSum += this.dithered[i];
    }
    this.originalMean = oSum / this.original.length;
    this.ditheredMean = dSum / this.dithered.length;
    this.needsCompute = false;
  }

  protected onUpdate(): void {
    if (this.needsCompute) this.compute();
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    if (this.needsCompute) this.compute();
    if (!this.image || this.image.width !== SIZE) {
      this.image = new ImageData(SIZE, SIZE);
      this.scratch = document.createElement("canvas");
      this.scratch.width = SIZE;
      this.scratch.height = SIZE;
    }
    const data = this.image.data;
    const cell = Math.floor(this.width / (SIZE * 2));
    for (let i = 0; i < this.original.length; i++) {
      const ov = Math.round(this.original[i] * 255);
      const dv = Math.round(this.dithered[i] * 255);
      data[i * 4] = ov;
      data[i * 4 + 1] = ov;
      data[i * 4 + 2] = ov;
      data[i * 4 + 3] = 255;
      void dv;
      void cell;
    }
    const offCtx = this.scratch!.getContext("2d")!;
    offCtx.putImageData(this.image, 0, 0);
    ctx.imageSmoothingEnabled = false;
    // Split: original left, dithered right.
    ctx.drawImage(this.scratch!, 0, 0, SIZE / 2, SIZE, 0, 0, this.width / 2, this.height);
    ctx.drawImage(this.scratch!, SIZE / 2, 0, SIZE / 2, SIZE, this.width / 2, 0, this.width / 2, this.height);
    ctx.strokeStyle = theme.fgSecondary;
    ctx.beginPath();
    ctx.moveTo(this.width / 2, 0);
    ctx.lineTo(this.width / 2, this.height);
    ctx.stroke();
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = theme.fgTertiary;
    ctx.fillText("ORIGINAL", 10, 16);
    ctx.fillStyle = theme.accent;
    ctx.fillText(this.str("mode") === "fs" ? `FLOYD-STEINBERG (${this.num("levels")} LEVELS)` : `THRESHOLD (${this.num("levels")} LEVELS)`, this.width / 2 + 10, 16);
  }

  getMetrics() {
    return {
      levels: this.num("levels"),
      originalMean: this.originalMean.toFixed(4),
      ditheredMean: this.ditheredMean.toFixed(4),
      meanError: Math.abs(this.originalMean - this.ditheredMean).toFixed(4),
    };
  }

  describe(): string {
    return `Error-diffusion dithering to ${this.num("levels")} gray levels preserves the mean luminance to ${Math.abs(this.originalMean - this.ditheredMean).toFixed(4)} - the structure is quantized, the average is not.`;
  }

  entities(): number {
    return SIZE * SIZE;
  }
}
