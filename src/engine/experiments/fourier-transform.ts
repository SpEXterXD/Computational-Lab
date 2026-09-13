import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

const SAMPLES = 128;

/**
 * The Discrete Fourier Transform, computed by definition (O(n^2), no FFT
 * trickery) so the spectrum is transparently real: a composed signal goes
 * in, its exact frequency components come out.
 */
export class FourierTransformExperiment extends BaseExperiment {
  readonly id = "fourier-transform";

  private harmonics = [
    { freq: 5, amp: 1, phase: 0 },
    { freq: 12, amp: 0.6, phase: 1.2 },
    { freq: 30, amp: 0.35, phase: -0.7 },
  ];
  private spectrum: { re: number; im: number }[] = [];
  private signal = new Float64Array(SAMPLES);

  protected params(): ParameterDef[] {
    return [
      { key: "h1", label: "Harmonic 1 frequency", min: 1, max: 40, step: 1, defaultValue: 5 },
      { key: "h2", label: "Harmonic 2 frequency", min: 1, max: 60, step: 1, defaultValue: 12 },
      { key: "h2amp", label: "Harmonic 2 amplitude", min: 0, max: 1, step: 0.05, defaultValue: 0.6 },
      { key: "noise", label: "Noise", min: 0, max: 0.5, step: 0.02, defaultValue: 0.1 },
    ];
  }

  protected onReset(): void {
    this.compose();
  }

  private compose(): void {
    this.harmonics[1].freq = this.num("h2");
    this.harmonics[1].amp = this.num("h2amp");
    this.harmonics[0].freq = this.num("h1");
    const noise = this.num("noise");
    for (let i = 0; i < SAMPLES; i++) {
      const t = i / SAMPLES;
      let value = 0;
      for (const h of this.harmonics) {
        if (h.amp <= 0) continue;
        value += h.amp * Math.sin(2 * Math.PI * h.freq * t + h.phase);
      }
      value += (this.rng() - 0.5) * 2 * noise;
      this.signal[i] = value;
    }
    this.transform();
  }

  protected onParameterChange(): void {
    this.compose();
  }

  protected onUpdate(): void {}

  /** DFT by definition: X_k = sum_n x_n e^{-2 pi i k n / N}. */
  private transform(): void {
    this.spectrum = [];
    for (let k = 0; k < SAMPLES / 2; k++) {
      let re = 0;
      let im = 0;
      for (let n = 0; n < SAMPLES; n++) {
        const angle = (-2 * Math.PI * k * n) / SAMPLES;
        re += this.signal[n] * Math.cos(angle);
        im += this.signal[n] * Math.sin(angle);
      }
      this.spectrum.push({ re: re / SAMPLES, im: im / SAMPLES });
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const half = this.height / 2 - 12;
    // Signal (top)
    ctx.strokeStyle = theme.line;
    ctx.beginPath();
    ctx.moveTo(0, half);
    ctx.lineTo(this.width, half);
    ctx.stroke();
    ctx.strokeStyle = theme.fgSecondary;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < SAMPLES; i++) {
      const x = (i / (SAMPLES - 1)) * this.width;
      const y = half - this.signal[i] * half * 0.42;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Spectrum (bottom): magnitude per bin
    const baseY = this.height - 24;
    let maxMag = 1e-6;
    for (const bin of this.spectrum) {
      maxMag = Math.max(maxMag, Math.hypot(bin.re, bin.im) * 2);
    }
    const barW = this.width / this.spectrum.length;
    for (let k = 0; k < this.spectrum.length; k++) {
      const mag = Math.hypot(this.spectrum[k].re, this.spectrum[k].im) * 2;
      const h = (mag / maxMag) * (half - 30);
      ctx.fillStyle = k === 0 ? theme.line : mag > maxMag * 0.12 ? theme.accent : theme.fgTertiary;
      ctx.fillRect(k * barW + 0.5, baseY - h, Math.max(1, barW - 1.5), h);
    }
    ctx.strokeStyle = theme.line;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.lineTo(this.width, baseY);
    ctx.stroke();
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = theme.fgTertiary;
    ctx.fillText("SIGNAL (TIME)", 10, 14);
    ctx.fillStyle = theme.accent;
    ctx.fillText("SPECTRUM |X(k)| (FREQUENCY)", 10, half + 16);
    ctx.lineWidth = 1;
  }

  getMetrics() {
    // Peak detection: the two largest bins above DC.
    const mags = this.spectrum.map((bin, k) => ({ k, mag: Math.hypot(bin.re, bin.im) }));
    const sorted = [...mags].sort((a, b) => b.mag - a.mag).slice(0, 2);
    return {
      peak1: `k=${sorted[0]?.k ?? 0}`,
      peak2: `k=${sorted[1]?.k ?? 0}`,
      samples: SAMPLES,
      noise: this.num("noise").toFixed(2),
    };
  }

  describe(): string {
    const m = this.getMetrics();
    return `A composed signal decomposed by its DFT: the spectrum peaks at bins ${m.peak1} and ${m.peak2}, the exact frequencies that were mixed in.`;
  }

  entities(): number {
    return SAMPLES;
  }
}
