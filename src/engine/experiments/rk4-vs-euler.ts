import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

const SAMPLES = 900;

/**
 * One oscillator, three integrators. theta'' = -omega^2 * theta has the exact
 * solution theta(t) = cos(omega t), so every method's energy error is a real
 * number you can read off the plot: forward Euler spirals out, semi-implicit
 * Euler stays bounded with phase error, RK4 stays flat.
 */
export class IntegratorComparisonExperiment extends BaseExperiment {
  readonly id = "rk4-vs-euler";

  private dt = 0.02;
  private omega = 1;
  private time = 0;
  private steps = 0;
  private euler = { theta: 1, omegaDot: 0 };
  private semi = { theta: 1, omegaDot: 0 };
  private rk4 = { theta: 1, omegaDot: 0 };
  private history: { euler: number; semi: number; rk4: number; exact: number }[] = [];
  private errorEuler = 0;
  private errorSemi = 0;
  private errorRk4 = 0;

  protected params(): ParameterDef[] {
    return [
      { key: "dt", label: "Timestep dt", min: 0.005, max: 0.08, step: 0.005, defaultValue: 0.02, unit: "s" },
      { key: "omega", label: "Frequency ω", min: 0.5, max: 3, step: 0.1, defaultValue: 1, unit: "rad/s" },
      { key: "steps", label: "Steps per tick", min: 1, max: 40, step: 1, defaultValue: 8 },
    ];
  }

  protected onReset(): void {
    this.euler = { theta: 1, omegaDot: 0 };
    this.semi = { theta: 1, omegaDot: 0 };
    this.rk4 = { theta: 1, omegaDot: 0 };
    this.history = [];
    this.time = 0;
    this.steps = 0;
    this.errorEuler = 0;
    this.errorSemi = 0;
    this.errorRk4 = 0;
  }

  protected onParameterChange(key: string): void {
    if (key !== "steps") this.reset();
  }

  /** Energy relative error |E/E0 - 1| for theta'' = -w^2 theta. */
  private relativeError(theta: number, omegaDot: number): number {
    const energy = 0.5 * (omegaDot * omegaDot + this.omega * this.omega * theta * theta);
    const e0 = 0.5 * this.omega * this.omega;
    return Math.abs(energy / e0 - 1);
  }

  private accel(theta: number): number {
    return -this.omega * this.omega * theta;
  }

  protected onUpdate(): void {
    const dt = this.num("dt");
    this.omega = this.num("omega");
    const stepsPerTick = this.num("steps");
    for (let s = 0; s < stepsPerTick; s++) {
      // Forward Euler: unstable for oscillators (energy grows).
      this.euler.omegaDot += this.accel(this.euler.theta) * dt;
      this.euler.theta += this.euler.omegaDot * dt;
      // Semi-implicit (symplectic) Euler: bounded, phase-shifted.
      this.semi.omegaDot += this.accel(this.semi.theta) * dt;
      this.semi.theta += this.semi.omegaDot * dt;
      // Classical RK4.
      const a1 = this.accel(this.rk4.theta);
      const b1 = this.accel(this.rk4.theta + (this.rk4.omegaDot * dt) / 2);
      const c1 = this.accel(this.rk4.theta + (this.rk4.omegaDot * dt) / 2 + (a1 * dt * dt) / 4);
      const d1 = this.accel(this.rk4.theta + this.rk4.omegaDot * dt + (b1 * dt * dt) / 2);
      const nw =
        this.rk4.omegaDot + (dt / 6) * (a1 + 2 * b1 + 2 * c1 + d1);
      const nt =
        this.rk4.theta +
        (dt / 6) *
          (this.rk4.omegaDot +
            2 * (this.rk4.omegaDot + a1 * dt / 2) +
            2 * (this.rk4.omegaDot + b1 * dt / 2) +
            (this.rk4.omegaDot + c1 * dt));
      this.rk4.omegaDot = nw;
      this.rk4.theta = nt;

      this.time += dt;
      this.steps += 1;
      this.history.push({
        euler: this.euler.theta,
        semi: this.semi.theta,
        rk4: this.rk4.theta,
        exact: Math.cos(this.omega * this.time),
      });
      if (this.history.length > SAMPLES) this.history.shift();
    }
    this.errorEuler = this.relativeError(this.euler.theta, this.euler.omegaDot);
    this.errorSemi = this.relativeError(this.semi.theta, this.semi.omegaDot);
    this.errorRk4 = this.relativeError(this.rk4.theta, this.rk4.omegaDot);
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const pad = 18;
    const mid = this.height / 2;
    const scaleY = (this.height / 2 - pad) / 2.2;
    // Zero line
    ctx.strokeStyle = theme.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(this.width, mid);
    ctx.stroke();
    const plot = (pick: (h: (typeof this.history)[number]) => number, color: string, width = 1.5) => {
      if (this.history.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let i = 0; i < this.history.length; i++) {
        const x = (i / (SAMPLES - 1)) * this.width;
        const y = mid - pick(this.history[i]) * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    plot((h) => h.exact, theme.fgTertiary, 1);
    plot((h) => h.euler, theme.viz[3]);
    plot((h) => h.semi, theme.viz[1]);
    plot((h) => h.rk4, theme.accent, 2);
    // Legend
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = theme.fgSecondary;
    ctx.fillText("EXACT", 10, 16);
    ctx.fillStyle = theme.viz[3];
    ctx.fillText("EULER", 62, 16);
    ctx.fillStyle = theme.viz[1];
    ctx.fillText("SEMI-IMPLICIT", 112, 16);
    ctx.fillStyle = theme.accent;
    ctx.fillText("RK4", 216, 16);
  }

  getMetrics() {
    const fmt = (e: number) => e.toExponential(2);
    return {
      simTime: `${this.time.toFixed(2)} s`,
      steps: this.steps,
      eulerError: fmt(this.errorEuler),
      semiError: fmt(this.errorSemi),
      rk4Error: fmt(this.errorRk4),
    };
  }

  describe(): string {
    return `After ${this.time.toFixed(1)} simulated seconds, RK4's energy error is ${this.errorRk4.toExponential(1)} while forward Euler has drifted to ${this.errorEuler.toExponential(1)}.`;
  }

  entities(): number {
    return this.history.length * 4;
  }
}
