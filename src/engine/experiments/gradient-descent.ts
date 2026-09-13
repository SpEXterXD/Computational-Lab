import { BaseExperiment } from "../core/base-experiment";
import { gaussian } from "../core/rng";
import type { ParameterDef, ThemeColors } from "../core/types";

/**
 * Gradient descent fitting the same noisy line as the Least Squares
 * experiment - but iteratively: (a, b) take small steps down the MSE loss.
 * The contour plot shows the loss surface and the path; a learning rate
 * that's too large visibly diverges. The end state should agree with the
 * closed-form solution the other page computes exactly.
 */
export class GradientDescentExperiment extends BaseExperiment {
  readonly id = "gradient-descent";

  private xs: number[] = [];
  private ys: number[] = [];
  private a = 0;
  private b = 0;
  private epoch = 0;
  private loss = 0;
  private path: { a: number; b: number }[] = [];
  private readonly trueA = 1.2;
  private readonly trueB = 0.4;
  // Contour cache in (a, b) space.
  private contour = new Float64Array(0);

  protected params(): ParameterDef[] {
    return [
      { key: "lr", label: "Learning rate", min: 0.01, max: 1.2, step: 0.01, defaultValue: 0.25 },
      { key: "steps", label: "Steps per tick", min: 1, max: 20, step: 1, defaultValue: 2 },
      { key: "noise", label: "Data noise", min: 0, max: 0.5, step: 0.02, defaultValue: 0.15 },
    ];
  }

  protected onReset(): void {
    const noise = this.num("noise");
    this.xs = [];
    this.ys = [];
    for (let i = 0; i < 80; i++) {
      const x = this.rng();
      this.xs.push(x);
      this.ys.push(this.trueA * x + this.trueB + gaussian(this.rng) * noise);
    }
    this.a = 0;
    this.b = 0;
    this.epoch = 0;
    this.path = [{ a: this.a, b: this.b }];
    this.computeLoss();
    this.buildContour();
  }

  protected onParameterChange(key: string): void {
    if (key === "noise") this.reset();
    void key;
  }

  private mse(a: number, b: number): number {
    let sum = 0;
    for (let i = 0; i < this.xs.length; i++) {
      const r = this.ys[i] - (a * this.xs[i] + b);
      sum += r * r;
    }
    return sum / this.xs.length;
  }

  private computeLoss(): void {
    this.loss = this.mse(this.a, this.b);
  }

  private buildContour(): void {
    const w = 72;
    const h = 48;
    this.contour = new Float64Array(w * h);
    let min = Infinity;
    let max = -Infinity;
    for (let gy = 0; gy < h; gy++) {
      for (let gx = 0; gx < w; gx++) {
        const a = (gx / w) * 3;
        const b = (gy / h) * 1.6;
        const value = this.mse(a, b);
        this.contour[gy * w + gx] = value;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
    // Store log-scaled for contrast.
    for (let i = 0; i < this.contour.length; i++) {
      this.contour[i] = Math.log10(Math.max(1e-6, this.contour[i] - min) + 1);
    }
    void max;
  }

  protected onUpdate(): void {
    const lr = this.num("lr");
    const steps = this.num("steps");
    const n = this.xs.length;
    for (let s = 0; s < steps; s++) {
      // Gradients of MSE over the whole batch.
      let ga = 0;
      let gb = 0;
      for (let i = 0; i < n; i++) {
        const r = this.ys[i] - (this.a * this.xs[i] + this.b);
        ga += -2 * r * this.xs[i];
        gb += -2 * r;
      }
      ga /= n;
      gb /= n;
      this.a -= lr * ga;
      this.b -= lr * gb;
      this.epoch += 1;
    }
    this.computeLoss();
    this.path.push({ a: this.a, b: this.b });
    if (this.path.length > 600) this.path.shift();
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const w = 72;
    const h = 48;
    // Loss contours (banded log-MSE)
    const cw = this.width / w;
    const ch = this.height / h;
    for (let gy = 0; gy < h; gy++) {
      for (let gx = 0; gx < w; gx++) {
        const value = this.contour[gy * w + gx];
        const t = Math.min(1, value / 2.2);
        ctx.fillStyle = t > 0.55 ? theme.accent : theme.fgSecondary;
        ctx.globalAlpha = 0.05 + t * 0.22;
        ctx.fillRect(gx * cw, gy * ch, cw + 0.5, ch + 0.5);
      }
    }
    ctx.globalAlpha = 1;
    const toX = (a: number) => (a / 3) * this.width;
    const toY = (b: number) => (b / 1.6) * this.height;
    // Descent path
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    this.path.forEach((point, index) => {
      if (index === 0) ctx.moveTo(toX(point.a), toY(point.b));
      else ctx.lineTo(toX(point.a), toY(point.b));
    });
    ctx.stroke();
    ctx.fillStyle = theme.fg;
    this.path.forEach((point, index) => {
      if (index % 6 !== 0 && index !== this.path.length - 1) return;
      ctx.beginPath();
      ctx.arc(toX(point.a), toY(point.b), 2.4, 0, Math.PI * 2);
      ctx.fill();
    });
    // True parameters marker
    ctx.strokeStyle = theme.viz[1];
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(toX(this.trueA), 0);
    ctx.lineTo(toX(this.trueA), this.height);
    ctx.moveTo(0, toY(this.trueB));
    ctx.lineTo(this.width, toY(this.trueB));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = theme.fgTertiary;
    ctx.fillText("LOSS SURFACE over (a, b)", 10, 16);
    ctx.fillStyle = theme.viz[1];
    ctx.fillText("TRUE a, b", this.width - 84, 16);
  }

  getMetrics() {
    return {
      epoch: this.epoch,
      a: this.a.toFixed(4),
      b: this.b.toFixed(4),
      loss: this.loss.toExponential(3),
      trueValues: `${this.trueA} / ${this.trueB}`,
    };
  }

  describe(): string {
    return `Gradient descent at epoch ${this.epoch}: a = ${this.a.toFixed(3)}, b = ${this.b.toFixed(3)}, loss ${this.loss.toExponential(2)} - descending the same surface least squares solves in one step.`;
  }

  entities(): number {
    return this.xs.length;
  }
}
