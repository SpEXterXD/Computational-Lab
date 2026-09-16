import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

const SIZE = 96;

/**
 * 2-D convolution: a 3x3 kernel slides over the image and the response is
 * the filtered output. Blur, sharpen, and edge detection are the SAME code
 * with different numbers in the kernel - which is the entire lesson.
 */
export class ConvolutionExperiment extends BaseExperiment {
  readonly id = "convolution";

  private original = new Float64Array(SIZE * SIZE);
  private filtered = new Float64Array(SIZE * SIZE);
  private image: ImageData | null = null;
  private scratch: HTMLCanvasElement | null = null;
  private needsCompute = true;

  protected params(): ParameterDef[] {
    return [
      {
        key: "kernel",
        label: "Kernel",
        options: [
          { value: "blur", label: "Box blur" },
          { value: "sharpen", label: "Sharpen" },
          { value: "edge", label: "Edge detect" },
          { value: "emboss", label: "Emboss" },
        ],
        defaultValue: "edge",
      },
      {
        key: "image",
        label: "Source image",
        options: [
          { value: "shapes", label: "Shapes" },
          { value: "gradient", label: "Gradient" },
        ],
        defaultValue: "shapes",
      },
    ];
  }

  private kernel(): number[] {
    const name = this.str("kernel");
    if (name === "blur") return [1, 1, 1, 1, 1, 1, 1, 1, 1].map((v) => v / 9);
    if (name === "sharpen") return [0, -1, 0, -1, 5, -1, 0, -1, 0];
    if (name === "emboss") return [-2, -1, 0, -1, 1, 1, 0, 1, 2];
    return [0, 1, 0, 1, -4, 1, 0, 1, 0];
  }

  protected onReset(): void {
    const pattern = this.str("image");
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const u = x / SIZE;
        const v = y / SIZE;
        let value: number;
        if (pattern === "gradient") {
          value = u * 0.7 + 0.1;
        } else {
          const disk = Math.hypot(u - 0.5, v - 0.5) < 0.25 ? 0.5 : 0;
          const band = Math.abs(u - v) < 0.06 ? 0.35 : 0;
          value = Math.min(1, 0.18 + disk + band + v * 0.2);
        }
        this.original[y * SIZE + x] = value;
      }
    }
    this.needsCompute = true;
  }

  protected onParameterChange(): void {
    this.reset();
  }

  protected onUpdate(): void {
    if (this.needsCompute) this.compute();
  }

  private compute(): void {
    const k = this.kernel();
    // Kernel flip for true convolution (k here is symmetric or treated as correlation).
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const sy = Math.min(SIZE - 1, Math.max(0, y + ky));
            const sx = Math.min(SIZE - 1, Math.max(0, x + kx));
            sum += this.original[sy * SIZE + sx] * k[(ky + 1) * 3 + (kx + 1)];
          }
        }
        this.filtered[y * SIZE + x] = Math.min(1, Math.max(0, sum));
      }
    }
    this.needsCompute = false;
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
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = y * SIZE + x;
        const v = x < SIZE / 2 ? Math.round(this.original[i] * 255) : Math.round(this.filtered[i] * 255);
        const p = i * 4;
        data[p] = v;
        data[p + 1] = v;
        data[p + 2] = v;
        data[p + 3] = 255;
      }
    }
    const offCtx = this.scratch!.getContext("2d")!;
    offCtx.putImageData(this.image, 0, 0);
    ctx.imageSmoothingEnabled = false;
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
    ctx.fillText(this.str("kernel").toUpperCase(), this.width / 2 + 10, 16);
  }

  getMetrics() {
    let energy = 0;
    for (let i = 0; i < this.filtered.length; i++) energy += this.filtered[i];
    return {
      kernel: this.str("kernel"),
      outputMean: (energy / this.filtered.length).toFixed(4),
      size: `${SIZE} x ${SIZE}`,
      taps: 9,
    };
  }

  describe(): string {
    return `A 3x3 ${this.str("kernel")} kernel convolved over the image - swap the kernel and the same nine numbers blur, sharpen, or find edges.`;
  }

  entities(): number {
    return SIZE * SIZE;
  }
}
