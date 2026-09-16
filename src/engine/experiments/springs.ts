import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

/**
 * A chain of masses and springs (fixed ends), integrated semi-implicitly.
 * Undamped, the total energy must hold still - the metrics keep score.
 */
export class SpringChainExperiment extends BaseExperiment {
  readonly id = "springs";

  private count = 3;
  private x = new Float64Array(0);
  private v = new Float64Array(0);
  private restLen = 1;
  private time = 0;
  private energy0 = 1;
  private energy = 1;
  private trace: { t: number; x: number }[] = [];

  protected params(): ParameterDef[] {
    return [
      { key: "masses", label: "Masses in chain", min: 1, max: 5, step: 1, defaultValue: 3 },
      { key: "k", label: "Spring constant k", min: 5, max: 120, step: 5, defaultValue: 60 },
      { key: "damping", label: "Damping", min: 0, max: 2, step: 0.05, defaultValue: 0 },
      { key: "amplitude", label: "Initial stretch", min: 0.1, max: 2, step: 0.1, defaultValue: 1 },
    ];
  }

  protected onReset(): void {
    this.count = this.num("masses");
    this.x = new Float64Array(this.count);
    this.v = new Float64Array(this.count);
    // Stretch the middle mass(es); ends of the chain hang from walls.
    const amplitude = this.num("amplitude");
    for (let i = 0; i < this.count; i++) {
      this.x[i] = amplitude * Math.sin((Math.PI * (i + 1)) / (this.count + 1));
    }
    this.restLen = 1;
    this.time = 0;
    this.energy0 = this.totalEnergy();
    this.trace = [];
  }

  protected onParameterChange(key: string): void {
    if (key !== "damping") this.reset();
  }

  private totalEnergy(): number {
    const m = 1;
    const k = this.num("k");
    let ke = 0;
    let pe = 0;
    for (let i = 0; i < this.count; i++) ke += 0.5 * m * this.v[i] * this.v[i];
    let prev = 0;
    for (let i = 0; i < this.count; i++) {
      const stretch = this.x[i] - prev;
      pe += 0.5 * k * stretch * stretch;
      prev = this.x[i];
    }
    pe += 0.5 * k * (0 - prev) ** 2;
    return ke + pe;
  }

  protected onUpdate(dt: number): void {
    const k = this.num("k");
    const damping = this.num("damping");
    const m = 1;
    const substeps = 24;
    const h = dt / substeps;
    for (let s = 0; s < substeps; s++) {
      // Coupled oscillators: forces from neighbors with fixed walls (u = 0).
      for (let i = 0; i < this.count; i++) {
        const leftU = i === 0 ? 0 : this.x[i - 1];
        const rightU = i === this.count - 1 ? 0 : this.x[i + 1];
        const fNet = k * (leftU - this.x[i]) + k * (rightU - this.x[i]);
        this.v[i] += (fNet / m - damping * this.v[i]) * h;
      }
      for (let i = 0; i < this.count; i++) this.x[i] += this.v[i] * h;
    }
    this.time += dt;
    this.energy = this.totalEnergy();
    this.trace.push({ t: this.time, x: this.x[0] });
    if (this.trace.length > 700) this.trace.shift();
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    // Physical chain across the top half
    const span = this.width - 120;
    const originX = 60;
    const chainY = this.height * 0.3;
    ctx.strokeStyle = theme.line;
    ctx.beginPath();
    ctx.moveTo(originX - 20, chainY);
    ctx.lineTo(originX, chainY);
    ctx.moveTo(originX + span, chainY);
    ctx.lineTo(originX + span + 20, chainY);
    ctx.stroke();
    ctx.strokeStyle = theme.fgSecondary;
    ctx.beginPath();
    let prevX = originX;
    let prevY = chainY;
    for (let i = 0; i < this.count; i++) {
      const px = originX + ((i + 1) * span) / (this.count + 1) + this.x[i] * 26;
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(px, chainY);
      prevX = px;
      prevY = chainY;
    }
    ctx.lineTo(originX + span, chainY);
    ctx.stroke();
    for (let i = 0; i < this.count; i++) {
      const px = originX + ((i + 1) * span) / (this.count + 1) + this.x[i] * 26;
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(px, chainY, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    // Phase / time trace of the first mass
    const traceBase = this.height - 26;
    const traceH = this.height * 0.34;
    let lo = -2;
    let hi = 2;
    for (const point of this.trace) {
      lo = Math.min(lo, point.x);
      hi = Math.max(hi, point.x);
    }
    const span2 = Math.max(0.4, hi - lo);
    ctx.strokeStyle = theme.viz[1];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < this.trace.length; i++) {
      const x = (i / 700) * this.width;
      const y = traceBase - ((this.trace[i].x - lo) / span2) * traceH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  getMetrics() {
    const drift = this.energy0 > 0 ? ((this.energy - this.energy0) / this.energy0) * 100 : 0;
    return {
      masses: this.count,
      time: `${this.time.toFixed(1)} s`,
      totalEnergy: this.energy.toFixed(2),
      energyDrift: `${drift >= 0 ? "+" : ""}${drift.toFixed(2)} %`,
    };
  }

  describe(): string {
    return `${this.count} masses on a spring chain: total energy ${this.energy.toFixed(2)} against the launch value ${this.energy0.toFixed(2)} - damping bleeds it, an undamped chain must hold it.`;
  }

  entities(): number {
    return this.count;
  }
}
