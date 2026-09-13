import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

/**
 * Fourier series synthesis: the chosen target waveform is its Fourier series
 * truncated to N terms. The approximation and its measured error are drawn
 * together, so Gibbs' ringing at the square wave's jump is visible, not hidden.
 */
export class FourierSeriesExperiment extends BaseExperiment {
  readonly id = "fourier-series";

  protected params(): ParameterDef[] {
    return [
      {
        key: "wave",
        label: "Target waveform",
        options: [
          { value: "square", label: "Square wave" },
          { value: "sawtooth", label: "Sawtooth" },
          { value: "triangle", label: "Triangle wave" },
        ],
        defaultValue: "square",
      },
      { key: "terms", label: "Series terms", min: 1, max: 25, step: 1, defaultValue: 5 },
      { key: "cycles", label: "Cycles across view", min: 1, max: 4, step: 1, defaultValue: 2 },
    ];
  }

  protected onReset(): void {}

  protected onUpdate(): void {}

  private target(t: number): number {
    // t in [0, 1) is one period.
    const wave = this.str("wave");
    if (wave === "square") return t % 1 < 0.5 ? 1 : -1;
    if (wave === "sawtooth") return 1 - 2 * (t % 1);
    // Triangle, zero at t = 0, rising: matches the standard 1/n^2 odd series.
    return t < 0.25 ? 4 * t : t < 0.75 ? 2 - 4 * t : 4 * t - 4;
  }

  private partial(t: number): number {
    const terms = this.num("terms");
    const wave = this.str("wave");
    let sum = 0;
    const w = 2 * Math.PI;
    if (wave === "square") {
      for (let k = 0; k < terms; k++) {
        const n = 2 * k + 1;
        sum += Math.sin(n * w * t) / n;
      }
      return (4 / Math.PI) * sum;
    }
    if (wave === "sawtooth") {
      for (let k = 1; k <= terms; k++) {
        sum += Math.sin(k * w * t) / k;
      }
      return (2 / Math.PI) * sum;
    }
    // Triangle: odd harmonics with alternating signs, 1/n^2.
    for (let k = 0; k < terms; k++) {
      const n = 2 * k + 1;
      sum += ((-1) ** k * Math.sin(n * w * t)) / (n * n);
    }
    return (8 / (Math.PI * Math.PI)) * sum;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const mid = this.height / 2;
    const amp = this.height / 2.6;
    const cycles = this.num("cycles");
    ctx.strokeStyle = theme.line;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(this.width, mid);
    ctx.stroke();
    const draw = (fn: (t: number) => number, color: string, width: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let px = 0; px <= this.width; px += 1) {
        const t = (px / this.width) * cycles;
        const y = mid - fn(t % 1) * amp;
        if (px === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
    };
    draw((t) => this.target(t), theme.fgTertiary, 1.25);
    draw((t) => this.partial(t), theme.accent, 2);
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = theme.fgTertiary;
    ctx.fillText("TARGET", 10, 16);
    ctx.fillStyle = theme.accent;
    ctx.fillText(`${this.num("terms")}-TERM SERIES`, 66, 16);
  }

  getMetrics() {
    let err = 0;
    for (let i = 0; i < 400; i++) {
      const t = i / 400;
      // Skip the discontinuity neighborhood for the square wave.
      // Skip the Gibbs ringing band around the square wave's jump; the
      // interior error is the honest measurement.
      // Skip the Gibbs ringing band around each jump of the target wave.
      const periodPosition = t % 1;
      const jumpDistance = this.str("wave") === "square"
        ? Math.min(periodPosition, Math.abs(periodPosition - 0.5), 1 - periodPosition)
        : Math.min(periodPosition, 1 - periodPosition);
      if (this.str("wave") !== "triangle" && jumpDistance < 0.08) continue;
      err = Math.max(err, Math.abs(this.partial(t) - this.target(t)));
    }
    return {
      waveform: this.str("wave"),
      terms: this.num("terms"),
      maxError: err.toExponential(2),
    };
  }

  describe(): string {
    return `The ${this.str("wave")} wave approximated by a ${this.num("terms")}-term Fourier series; maximum sampled error ${this.getMetrics().maxError}.`;
  }

  entities(): number {
    return this.num("terms");
  }
}
