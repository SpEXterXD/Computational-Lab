import { BaseExperiment } from "../core/base-experiment";
import { gaussian } from "../core/rng";
import type { ParameterDef, ThemeColors } from "../core/types";

/**
 * Least squares by the normal equations: the 2x2 system [Sxx Sx; Sx N] is
 * solved exactly by Cramer's rule - no iterations, no descent. Deliberately
 * the algebraic counterpart to gradient-based fitting: the outlier slider
 * shows exactly what unweighted exactness costs.
 */
export class LeastSquaresExperiment extends BaseExperiment {
  readonly id = "least-squares";

  private xs: number[] = [];
  private ys: number[] = [];
  private fitA = 0;
  private fitB = 0;
  private rms = 0;
  private r2 = 1;

  private readonly trueA = 1.5;
  private readonly trueB = 0.3;

  protected params(): ParameterDef[] {
    return [
      { key: "points", label: "Data points", min: 10, max: 200, step: 10, defaultValue: 80 },
      { key: "noise", label: "Noise sigma", min: 0, max: 0.4, step: 0.01, defaultValue: 0.1 },
      { key: "outliers", label: "Outlier rate", min: 0, max: 30, step: 1, defaultValue: 0, unit: "%" },
    ];
  }

  protected onReset(): void {
    const count = this.num("points");
    const sigma = this.num("noise");
    const outlierRate = this.num("outliers") / 100;
    this.xs = [];
    this.ys = [];
    for (let i = 0; i < count; i++) {
      const x = this.rng();
      let y = this.trueA * x + this.trueB + gaussian(this.rng) * sigma;
      if (this.rng() < outlierRate) {
        y += (this.rng() < 0.5 ? -1 : 1) * (0.8 + this.rng() * 0.8);
      }
      this.xs.push(x);
      this.ys.push(y);
    }
    this.fit();
  }

  protected onParameterChange(): void {
    this.reset();
  }

  /** Static plot: state changes only through parameters. */
  protected onUpdate(): void {}

  private fit(): void {
    const n = this.xs.length;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    for (let i = 0; i < n; i++) {
      sx += this.xs[i];
      sy += this.ys[i];
      sxx += this.xs[i] * this.xs[i];
      sxy += this.xs[i] * this.ys[i];
    }
    // Normal equations [[Sxx, Sx], [Sx, N]] [a, b]^T = [Sxy, Sy]^T
    const determinant = sxx * n - sx * sx;
    if (Math.abs(determinant) < 1e-12) {
      this.fitA = 0;
      this.fitB = sy / n;
    } else {
      this.fitA = (sxy * n - sx * sy) / determinant;
      this.fitB = (sxx * sy - sx * sxy) / determinant;
    }
    let rss = 0;
    let tss = 0;
    const meanY = sy / n;
    for (let i = 0; i < n; i++) {
      const residual = this.ys[i] - (this.fitA * this.xs[i] + this.fitB);
      rss += residual * residual;
      tss += (this.ys[i] - meanY) ** 2;
    }
    this.rms = Math.sqrt(rss / n);
    this.r2 = tss > 0 ? 1 - rss / tss : 1;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const pad = 18;
    const toX = (x: number) => pad + x * (this.width - 2 * pad);
    const valueSpan = 2.2;
    const toY = (y: number) => this.height - pad - ((y + 0.8) / valueSpan) * (this.height - 2 * pad);
    // Residual stems
    ctx.strokeStyle = theme.viz[1];
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    for (let i = 0; i < this.xs.length; i++) {
      const fitY = this.fitA * this.xs[i] + this.fitB;
      ctx.moveTo(toX(this.xs[i]), toY(this.ys[i]));
      ctx.lineTo(toX(this.xs[i]), toY(fitY));
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    // True line
    ctx.strokeStyle = theme.fgTertiary;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(this.trueA * 0 + this.trueB));
    ctx.lineTo(toX(1), toY(this.trueA + this.trueB));
    ctx.stroke();
    ctx.setLineDash([]);
    // Fitted line
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(this.fitB));
    ctx.lineTo(toX(1), toY(this.fitA + this.fitB));
    ctx.stroke();
    // Data
    ctx.fillStyle = theme.fg;
    for (let i = 0; i < this.xs.length; i++) {
      ctx.beginPath();
      ctx.arc(toX(this.xs[i]), toY(this.ys[i]), 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = theme.fgTertiary;
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillText("TRUE", pad + 4, pad + 12);
    ctx.fillStyle = theme.accent;
    ctx.fillText("FITTED", pad + 48, pad + 12);
  }

  getMetrics() {
    const condition =
      Math.abs(this.fitA) > 0 ? this.conditionNumber().toExponential(2) : "n/a";
    return {
      fittedA: this.fitA.toFixed(3),
      fittedB: this.fitB.toFixed(3),
      trueValues: `${this.trueA} / ${this.trueB}`,
      rms: this.rms.toFixed(4),
      r2: this.r2.toFixed(4),
      condition: condition,
    };
  }

  /** 2x2 condition number via the ratio of extreme eigenvalues of M^T M. */
  private conditionNumber(): number {
    const n = this.xs.length;
    let sxx = 0;
    let sx = 0;
    for (let i = 0; i < n; i++) {
      sxx += this.xs[i] * this.xs[i];
      sx += this.xs[i];
    }
    // Normal matrix [[sxx, sx], [sx, n]]; eigenvalues closed-form.
    const tr = sxx + n;
    const det = sxx * n - sx * sx;
    const disc = Math.sqrt(Math.max(0, tr * tr - 4 * det));
    const lambdaMax = (tr + disc) / 2;
    const lambdaMin = Math.max(1e-12, (tr - disc) / 2);
    return lambdaMax / lambdaMin;
  }

  describe(): string {
    return `Normal equations fitted y = ${this.fitA.toFixed(2)}x + ${this.fitB.toFixed(2)} against truth ${this.trueA}x + ${this.trueB}; RMS residual ${this.rms.toFixed(3)}, R2 ${this.r2.toFixed(3)}.`;
  }

  entities(): number {
    return this.xs.length;
  }
}
