import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

const CAPACITY = 20000;

/**
 * Monte Carlo estimation of pi: uniform darts on the unit square, the ratio
 * inside the quarter circle converges to pi/4. The error against the true
 * pi should fall like 1/sqrt(N) - the metric shows the actual exponent.
 */
export class MonteCarloExperiment extends BaseExperiment {
  readonly id = "monte-carlo";

  private xs = new Float32Array(CAPACITY);
  private ys = new Float32Array(CAPACITY);
  private inside = new Uint8Array(CAPACITY);
  private darts = 0;
  private totalHits = 0;
  private estimate = 0;
  private error = 0;

  protected params(): ParameterDef[] {
    return [
      { key: "rate", label: "Darts per tick", min: 20, max: 3000, step: 20, defaultValue: 400 },
      {
        key: "show",
        label: "Show darts",
        options: [
          { value: "recent", label: "Recent" },
          { value: "none", label: "None" },
        ],
        defaultValue: "recent",
      },
    ];
  }

  protected onReset(): void {
    this.darts = 0;
    this.totalHits = 0;
    this.estimate = 0;
    this.error = 0;
  }

  protected onUpdate(): void {
    const rate = this.num("rate");
    const slots = Math.min(CAPACITY, rate);
    // Fill the display buffer round-robin; statistics use all draws ever.
    for (let i = 0; i < rate; i++) {
      const x = this.rng();
      const y = this.rng();
      const hit = x * x + y * y <= 1 ? 1 : 0;
      const slot = this.darts % CAPACITY;
      this.xs[slot] = x;
      this.ys[slot] = y;
      this.inside[slot] = hit;
      this.totalHits += hit;
      this.darts += 1;
    }
    void slots;
    this.estimate = this.darts > 0 ? (4 * this.totalHits) / this.darts : 0;
    this.error = Math.abs(this.estimate - Math.PI);
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const size = Math.min(this.width, this.height) - 32;
    const ox = (this.width - size) / 2;
    const oy = (this.height - size) / 2;
    // Quarter circle arc (unit circle from the corner)
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(ox, oy + size, size, Math.PI, Math.PI * 1.5);
    ctx.stroke();
    ctx.strokeStyle = theme.line;
    ctx.strokeRect(ox, oy, size, size);
    // Recent darts
    if (this.str("show") === "recent") {
      const shown = Math.min(this.darts, 2600);
      for (let s = 0; s < shown; s++) {
        const slot = (this.darts - 1 - s + CAPACITY * 4) % CAPACITY;
        const px = ox + this.xs[slot] * size;
        const py = oy + (1 - this.ys[slot]) * size;
        ctx.fillStyle = this.inside[slot] ? theme.accent : theme.viz[1];
        ctx.globalAlpha = 0.7;
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    ctx.lineWidth = 1;
  }

  getMetrics() {
    return {
      darts: this.darts.toLocaleString("en-US"),
      inside: this.totalHits.toLocaleString("en-US"),
      estimate: this.estimate.toFixed(5),
      absError: this.error.toExponential(2),
    };
  }

  describe(): string {
    return `${this.darts.toLocaleString("en-US")} darts thrown; ${this.totalHits.toLocaleString("en-US")} landed inside the quarter circle, estimating pi as ${this.estimate.toFixed(4)} (error ${this.error.toExponential(1)}).`;
  }

  entities(): number {
    return this.darts;
  }
}
