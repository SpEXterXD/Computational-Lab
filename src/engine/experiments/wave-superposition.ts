import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

/**
 * Superposition of two traveling waves with independent frequency,
 * amplitude, and phase: sum them and see beats, standing-wave patterns, or
 * near-cancellation - pure addition, drawn point by point.
 */
export class WaveSuperpositionExperiment extends BaseExperiment {
  readonly id = "wave-superposition";

  protected params(): ParameterDef[] {
    return [
      { key: "f1", label: "Wave 1 frequency", min: 0.5, max: 8, step: 0.1, defaultValue: 2, unit: "Hz" },
      { key: "a1", label: "Wave 1 amplitude", min: 0, max: 1, step: 0.05, defaultValue: 0.6 },
      { key: "f2", label: "Wave 2 frequency", min: 0.5, max: 8, step: 0.1, defaultValue: 2.4, unit: "Hz" },
      { key: "a2", label: "Wave 2 amplitude", min: 0, max: 1, step: 0.05, defaultValue: 0.5 },
      { key: "phase2", label: "Wave 2 phase", min: 0, max: 6.28, step: 0.1, defaultValue: 0.8, unit: "rad" },
      { key: "speed", label: "Time speed", min: 0, max: 3, step: 0.1, defaultValue: 1 },
    ];
  }

  private time = 0;

  protected onReset(): void {
    this.time = 0;
  }

  protected onUpdate(dt: number): void {
    this.time += dt * this.num("speed");
  }

  private wave(frequency: number, amplitude: number, phase: number, x: number, t: number): number {
    return amplitude * Math.sin(2 * Math.PI * (frequency * t - frequency * 0.22 * x) + phase);
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const mid = this.height / 2;
    const amp = this.height / 4.4;
    ctx.strokeStyle = theme.line;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(this.width, mid);
    ctx.stroke();
    const draw = (fn: (x: number) => number, color: string, width: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let px = 0; px <= this.width; px += 1) {
        const x = px / this.width;
        const y = mid - fn(x) * amp;
        if (px === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
    };
    const f1 = this.num("f1");
    const f2 = this.num("f2");
    const a1 = this.num("a1");
    const a2 = this.num("a2");
    const phase2 = this.num("phase2");
    draw((x) => this.wave(f1, a1, 0, x, this.time), theme.viz[1], 1.2);
    draw((x) => this.wave(f2, a2, phase2, x, this.time), theme.viz[2], 1.2);
    draw((x) => this.wave(f1, a1, 0, x, this.time) + this.wave(f2, a2, phase2, x, this.time), theme.accent, 2.2);
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = theme.viz[1];
    ctx.fillText(`WAVE 1  ${f1.toFixed(1)} Hz`, 10, 14);
    ctx.fillStyle = theme.viz[2];
    ctx.fillText(`WAVE 2  ${f2.toFixed(1)} Hz`, 120, 14);
    ctx.fillStyle = theme.accent;
    ctx.fillText("SUM", 232, 14);
    ctx.lineWidth = 1;
  }

  getMetrics() {
    const f1 = this.num("f1");
    const f2 = this.num("f2");
    return {
      beatFrequency: Math.abs(f1 - f2).toFixed(2),
      phaseOffset: `${(this.time * (f2 - f1) * 360 % 360).toFixed(0)} deg`,
      maxAmplitude: (this.num("a1") + this.num("a2")).toFixed(2),
      minAmplitude: Math.abs(this.num("a1") - this.num("a2")).toFixed(2),
    };
  }

  describe(): string {
    const beat = Math.abs(this.num("f1") - this.num("f2"));
    return beat < 0.3
      ? `Two close frequencies (${this.num("f1").toFixed(1)} and ${this.num("f2").toFixed(1)} Hz) sum into a beat pattern with envelope ${beat.toFixed(2)} Hz.`
      : `Waves at ${this.num("f1").toFixed(1)} and ${this.num("f2").toFixed(1)} Hz superpose; where they cancel, the sum touches zero.`;
  }

  entities(): number {
    return 2;
  }
}
