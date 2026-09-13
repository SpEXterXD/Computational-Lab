import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

const BINS = 64;
/** Seeded source draws so every reset replays the same stream. */
type Source = (rng: () => number) => number;

const SOURCES: Record<string, Source> = {
  uniform: (rng) => rng(),
  triangular: (rng) => (rng() + rng()) / 2,
  bimodal: (rng) => (rng() < 0.5 ? 0.05 + rng() * 0.25 : 0.7 + rng() * 0.25),
};

/**
 * Central Limit Theorem, observed rather than asserted: draw n values from a
 * (non-normal) source, record their mean, repeat. The running histogram of
 * means converges to the Gaussian the theorem predicts, with the empirical
 * sigma checked against sigma/sqrt(n) live.
 */
export class CentralLimitExperiment extends BaseExperiment {
  readonly id = "central-limit-theorem";

  private bins = new Float64Array(BINS);
  private meansCount = 0;
  private samplesCount = 0;
  private meanOfMeans = 0;
  private m2 = 0; // Welford
  private sourceMean = 0;
  private sourceVar = 0;
  private pointer = { x: 0, y: 0, down: false, inside: false };

  protected params(): ParameterDef[] {
    return [
      { key: "n", label: "Sample size n", min: 1, max: 60, step: 1, defaultValue: 5 },
      { key: "rate", label: "Means per tick", min: 10, max: 2000, step: 10, defaultValue: 200 },
      {
        key: "source",
        label: "Source distribution",
        options: [
          { value: "uniform", label: "Uniform(0, 1)" },
          { value: "triangular", label: "Triangular" },
          { value: "bimodal", label: "Bimodal" },
        ],
        defaultValue: "bimodal",
      },
    ];
  }

  protected onReset(): void {
    this.bins.fill(0);
    this.meansCount = 0;
    this.samplesCount = 0;
    this.meanOfMeans = 0;
    this.m2 = 0;
    // Characterize the source empirically (100k draws) instead of hardcoding
    // moments per distribution.
    const source = SOURCES[this.str("source")];
    let sum = 0;
    let sum2 = 0;
    const draws = 100_000;
    for (let i = 0; i < draws; i++) {
      const v = source(this.rng);
      sum += v;
      sum2 += v * v;
    }
    this.sourceMean = sum / draws;
    this.sourceVar = sum2 / draws - this.sourceMean * this.sourceMean;
  }

  protected onParameterChange(key: string): void {
    if (key !== "rate") this.reset();
  }

  private drawSource(): number {
    return SOURCES[this.str("source")](this.rng);
  }

  protected onUpdate(): void {
    const n = this.num("n");
    const rate = this.num("rate");
    for (let s = 0; s < rate; s++) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += this.drawSource();
      const mean = sum / n;
      const bin = Math.min(BINS - 1, Math.max(0, Math.floor(mean * BINS)));
      this.bins[bin] += 1;
      this.meansCount += 1;
      this.samplesCount += n;
      // Welford's online variance for the observed means.
      const delta = mean - this.meanOfMeans;
      this.meanOfMeans += delta / this.meansCount;
      this.m2 += delta * (mean - this.meanOfMeans);
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    let maxCount = 1;
    for (let i = 0; i < BINS; i++) if (this.bins[i] > maxCount) maxCount = this.bins[i];
    const binWidth = this.width / BINS;
    const baseY = this.height - 18;
    const chartH = this.height - 42;
    ctx.fillStyle = theme.fgSecondary;
    for (let i = 0; i < BINS; i++) {
      const h = (this.bins[i] / maxCount) * chartH;
      ctx.fillRect(i * binWidth + 0.5, baseY - h, binWidth - 1, h);
    }
    // CLT prediction: Gaussian with source sigma / sqrt(n). Expected count in
    // a bin = meansCount * binWidth * pdf(x); drawn against the same scale.
    const n = this.num("n");
    const sigmaMean = Math.sqrt(this.sourceVar / n);
    const mu = this.sourceMean;
    const countsToPixels = chartH / Math.max(1, maxCount);
    const expected = (x: number) =>
      (Math.exp(-((x - mu) ** 2) / (2 * sigmaMean * sigmaMean)) /
        (sigmaMean * Math.sqrt(2 * Math.PI))) *
      (this.meansCount / BINS);
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px <= this.width; px += 2) {
      const y = baseY - expected(px / this.width) * countsToPixels;
      if (px === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
    // Source distribution outline for reference
    ctx.strokeStyle = theme.viz[1];
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    for (let px = 0; px <= this.width; px += 2) {
      const x = px / this.width;
      // Empirical source pdf from a light probe pass (cheap: closed forms avoided on purpose)
      const pdf = this.probeSourcePdf(x);
      const y = baseY - pdf * chartH * 0.55;
      if (px === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.lineStrong;
    ctx.fillRect(0, baseY, this.width, 1);
  }

  /** Small cached probe of the source pdf shape (200 draws per cell). */
  private pdfProbe: Float64Array | null = null;
  private probeSourcePdf(x: number): number {
    if (!this.pdfProbe) {
      const probe = new Float64Array(64);
      const source = SOURCES[this.str("source")];
      for (let i = 0; i < 20_000; i++) {
        probe[Math.min(63, Math.max(0, Math.floor(source(this.rng) * 64)))] += 1;
      }
      let max = 1;
      for (let i = 0; i < 64; i++) max = Math.max(max, probe[i]);
      for (let i = 0; i < 64; i++) probe[i] /= max;
      this.pdfProbe = probe;
    }
    return this.pdfProbe[Math.min(63, Math.max(0, Math.floor(x * 64)))];
  }

  getMetrics() {
    const n = this.num("n");
    const variance = this.meansCount > 1 ? this.m2 / (this.meansCount - 1) : 0;
    const predictedSigma = Math.sqrt(this.sourceVar / n);
    return {
      means: this.meansCount.toLocaleString("en-US"),
      samples: this.samplesCount.toLocaleString("en-US"),
      empiricalSigma: Math.sqrt(variance).toFixed(4),
      predictedSigma: predictedSigma.toFixed(4),
      meanOfMeans: this.meanOfMeans.toFixed(4),
    };
  }

  describe(): string {
    const n = this.num("n");
    const variance = this.meansCount > 1 ? this.m2 / (this.meansCount - 1) : 0;
    return `${this.meansCount.toLocaleString("en-US")} sample means of n=${n} ${this.str("source")} draws; observed sigma ${Math.sqrt(variance).toFixed(3)}, CLT predicts ${Math.sqrt(this.sourceVar / n).toFixed(3)}.`;
  }

  entities(): number {
    return this.meansCount;
  }
}
