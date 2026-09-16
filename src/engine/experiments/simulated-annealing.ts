import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

const CITIES = 24;

/**
 * Simulated annealing on a 24-city traveling-salesman tour: 2-opt reversal
 * moves accepted by the Metropolis criterion under an exponential cooling
 * schedule. Watch bad moves become rare as the temperature falls.
 */
export class SimulatedAnnealingExperiment extends BaseExperiment {
  readonly id = "simulated-annealing";

  private cityX = new Float64Array(CITIES);
  private cityY = new Float64Array(CITIES);
  private tour = new Int32Array(CITIES);
  private length = 0;
  private bestLength = Infinity;
  private temperature = 1;
  private accepted = 0;
  private rejected = 0;
  private acceptedRecent = 0;
  private rejectedRecent = 0;
  private history: number[] = [];

  protected params(): ParameterDef[] {
    return [
      { key: "temp0", label: "Initial temperature", min: 0.2, max: 3, step: 0.1, defaultValue: 1.2 },
      { key: "cooling", label: "Cooling rate", min: 0.9, max: 0.9995, step: 0.0005, defaultValue: 0.998 },
      { key: "moves", label: "Move attempts per tick", min: 1, max: 60, step: 1, defaultValue: 12 },
    ];
  }

  protected onReset(): void {
    for (let i = 0; i < CITIES; i++) {
      this.cityX[i] = 0.08 + this.rng() * 0.84;
      this.cityY[i] = 0.1 + this.rng() * 0.8;
      this.tour[i] = i;
    }
    // Seeded shuffle start.
    for (let i = CITIES - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const tmp = this.tour[i];
      this.tour[i] = this.tour[j];
      this.tour[j] = tmp;
    }
    this.length = this.tourLength();
    this.bestLength = this.length;
    this.temperature = this.num("temp0");
    this.accepted = 0;
    this.rejected = 0;
    this.acceptedRecent = 0;
    this.rejectedRecent = 0;
    this.history = [];
  }

  protected onParameterChange(key: string): void {
    if (key !== "moves") this.reset();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  private dist(a: number, b: number): number {
    return Math.hypot(this.cityX[a] - this.cityX[b], this.cityY[a] - this.cityY[b]);
  }

  private tourLength(): number {
    let sum = 0;
    for (let i = 0; i < CITIES; i++) {
      sum += this.dist(this.tour[i], this.tour[(i + 1) % CITIES]);
    }
    return sum;
  }

  private deltaFor(i: number, k: number): number {
    // Reversal of tour[i..k]: only the two boundary edges change.
    if (i === k || (i === 0 && k === CITIES - 1)) return 0;
    const prev = this.tour[(i - 1 + CITIES) % CITIES];
    const start = this.tour[i];
    const end = this.tour[k];
    const after = this.tour[(k + 1) % CITIES];
    const removed = this.dist(prev, start) + this.dist(end, after);
    const added = this.dist(prev, end) + this.dist(start, after);
    return added - removed;
  }

  protected onUpdate(): void {
    const moves = this.num("moves");
    for (let m = 0; m < moves; m++) {
      let i = Math.floor(this.rng() * CITIES);
      let k = Math.floor(this.rng() * CITIES);
      if (i > k) [i, k] = [k, i];
      if (i === k || (i === 0 && k === CITIES - 1)) continue;
      const delta = this.deltaFor(i, k);
      // Metropolis criterion.
      if (delta < 0 || this.rng() < Math.exp(-delta / Math.max(1e-9, this.temperature))) {
        // Reverse tour[i..k].
        for (let a = i, b = k; a < b; a++, b--) {
          const tmp = this.tour[a];
          this.tour[a] = this.tour[b];
          this.tour[b] = tmp;
        }
        this.length += delta;
        this.accepted += 1;
        this.acceptedRecent += 1;
      } else {
        this.rejected += 1;
        this.rejectedRecent += 1;
      }
      this.temperature *= this.num("cooling");
      this.temperature = Math.max(1e-4, this.temperature);
    }
    this.length = this.tourLength();
    this.bestLength = Math.min(this.bestLength, this.length);
    this.history.push(this.length);
    if (this.history.length > 500) this.history.shift();
    if (this.acceptedRecent + this.rejectedRecent > 600) {
      this.acceptedRecent = 0;
      this.rejectedRecent = 0;
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    // Tour
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= CITIES; i++) {
      const city = this.tour[i % CITIES];
      const px = this.cityX[city] * this.width;
      const py = this.cityY[city] * this.height;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = theme.fg;
    for (let i = 0; i < CITIES; i++) {
      ctx.beginPath();
      ctx.arc(this.cityX[i] * this.width, this.cityY[i] * this.height, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Length history
    if (this.history.length > 2) {
      let lo = Infinity;
      let hi = -Infinity;
      for (const h of this.history) {
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
      }
      const span = Math.max(1e-6, hi - lo);
      ctx.strokeStyle = theme.viz[1];
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      for (let i = 0; i < this.history.length; i++) {
        const x = (i / (this.history.length - 1)) * this.width;
        const y = this.height - 8 - ((this.history[i] - lo) / span) * 30;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  getMetrics() {
    const recentTotal = this.acceptedRecent + this.rejectedRecent;
    return {
      temperature: this.temperature.toFixed(3),
      tourLength: this.length.toFixed(2),
      best: this.bestLength.toFixed(2),
      acceptRate: recentTotal > 0 ? `${((this.acceptedRecent / recentTotal) * 100).toFixed(0)} %` : "n/a",
      moves: (this.accepted + this.rejected).toLocaleString("en-US"),
    };
  }

  describe(): string {
    return `Annealing on ${CITIES} cities: tour length ${this.length.toFixed(1)} at temperature ${this.temperature.toFixed(2)} (best seen ${this.bestLength.toFixed(1)}).`;
  }

  entities(): number {
    return CITIES;
  }
}
