import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

const BINS = 40;

/**
 * Discrete distributions three ways: the exact pmf (computed from its
 * formula) against a running histogram of seeded samples. Binomial,
 * Poisson, and normal curves with parameters you can drag while the
 * sampling keeps accumulating.
 */
export class ProbabilityDistributionsExperiment extends BaseExperiment {
  readonly id = "probability-distributions";

  private bins = new Float64Array(BINS);
  private count = 0;
  private domainMax = 20;

  protected params(): ParameterDef[] {
    return [
      {
        key: "distribution",
        label: "Distribution",
        options: [
          { value: "binomial", label: "Binomial(n, p)" },
          { value: "poisson", label: "Poisson(lambda)" },
          { value: "normal", label: "Normal(mu, sigma)" },
        ],
        defaultValue: "binomial",
      },
      { key: "paramA", label: "n / lambda / mu", min: 1, max: 20, step: 0.5, defaultValue: 12 },
      { key: "paramB", label: "p / - / sigma", min: 0.05, max: 1, step: 0.05, defaultValue: 0.5 },
      { key: "rate", label: "Samples per tick", min: 10, max: 1000, step: 10, defaultValue: 100 },
    ];
  }

  protected onReset(): void {
    this.bins.fill(0);
    this.count = 0;
  }

  protected onParameterChange(key: string): void {
    if (key !== "rate") this.reset();
  }

  private domain(): number {
    const dist = this.str("distribution");
    const a = this.num("paramA");
    if (dist === "binomial") return Math.min(39, Math.ceil(a) + 1);
    if (dist === "poisson") return Math.min(39, Math.ceil(a * 2.2));
    return 20; // normal domain: mu +- 5 sigma mapped into BINS
  }

  /** Exact probability mass at integer k (normal: bin prob over its bin). */
  private pmf(k: number): number {
    const dist = this.str("distribution");
    const a = this.num("paramA");
    const b = this.num("paramB");
    if (dist === "binomial") {
      const n = Math.round(a);
      if (k > n) return 0;
      let logChoose = 0;
      for (let i = 1; i <= k; i++) logChoose += Math.log((n - k + i) / i);
      return Math.exp(logChoose + k * Math.log(b) + (n - k) * Math.log(1 - b));
    }
    if (dist === "poisson") {
      let logP = -a + k * Math.log(a);
      for (let i = 1; i <= k; i++) logP -= Math.log(i);
      return Math.exp(logP);
    }
    const mu = a;
    const sigma = Math.max(0.05, b);
    const x = k;
    return (
      Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) /
      (sigma * Math.sqrt(2 * Math.PI))
    );
  }

  private drawSample(): number {
    const dist = this.str("distribution");
    const a = this.num("paramA");
    const b = this.num("paramB");
    if (dist === "binomial") {
      const n = Math.round(a);
      let hits = 0;
      for (let i = 0; i < n; i++) if (this.rng() < b) hits += 1;
      return hits;
    }
    if (dist === "poisson") {
      // Knuth's method for moderate lambda.
      const lambda = a;
      const limit = Math.exp(-lambda);
      let k = 0;
      let p = 1;
      do {
        k += 1;
        p *= this.rng();
      } while (p > limit && k < 200);
      return k - 1;
    }
    // Normal via Box-Muller, clamped into the domain.
    let u = 0;
    let v = 0;
    while (u === 0) u = this.rng();
    while (v === 0) v = this.rng();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return Math.min(BINS - 0.51, Math.max(-0.5, a + z * Math.max(0.05, b)));
  }

  protected onUpdate(): void {
    this.domainMax = this.domain();
    const rate = this.num("rate");
    for (let i = 0; i < rate; i++) {
      const value = this.drawSample();
      const bin = Math.min(BINS - 1, Math.max(0, Math.round(value)));
      this.bins[bin] += 1;
      this.count += 1;
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const binWidth = this.width / BINS;
    const baseY = this.height - 20;
    const chartH = this.height - 46;
    let maxCount = 1;
    for (let i = 0; i < BINS; i++) maxCount = Math.max(maxCount, this.bins[i]);
    ctx.fillStyle = theme.fgSecondary;
    for (let i = 0; i < BINS; i++) {
      const h = (this.bins[i] / maxCount) * chartH;
      ctx.fillRect(i * binWidth + 0.5, baseY - h, binWidth - 1, h);
    }
    // Exact pmf overlay scaled to the histogram's mass.
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const toPixels = (prob: number) => prob * (this.count / BINS) * (chartH / maxCount) * BINS;
    for (let i = 0; i < BINS; i++) {
      const prob = this.pmf(i);
      const y = baseY - Math.min(chartH, toPixels(prob));
      if (i === 0) ctx.moveTo(i * binWidth + binWidth / 2, y);
      else ctx.lineTo(i * binWidth + binWidth / 2, y);
    }
    ctx.stroke();
    ctx.fillStyle = theme.lineStrong;
    ctx.fillRect(0, baseY, this.width, 1);
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = theme.fgTertiary;
    ctx.fillText(`n = ${this.count.toLocaleString("en-US")} samples`, 10, 16);
  }

  getMetrics() {
    // Empirical mean vs theoretical mean over the binned samples.
    let sum = 0;
    for (let i = 0; i < BINS; i++) sum += this.bins[i] * i;
    const empirical = this.count > 0 ? sum / this.count : 0;
    const dist = this.str("distribution");
    const a = this.num("paramA");
    const b = this.num("paramB");
    const theoretical = dist === "binomial" ? Math.round(a) * b : dist === "poisson" ? a : a;
    return {
      samples: this.count.toLocaleString("en-US"),
      distribution: dist,
      empiricalMean: empirical.toFixed(3),
      theoreticalMean: theoretical.toFixed(3),
    };
  }

  describe(): string {
    const m = this.getMetrics();
    return `${m.samples} samples from the ${m.distribution} distribution: empirical mean ${m.empiricalMean} against the theoretical ${m.theoreticalMean}.`;
  }

  entities(): number {
    return this.count;
  }
}
