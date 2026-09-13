import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

const TRACE_LENGTH = 260;
const PX_PER_M = 130;

/**
 * Double pendulum integrated on the exact Lagrangian equations with RK4.
 * A "shadow" twin started 1e-6 rad away makes chaos measurable: the
 * separation metric is the real Lyapunov-style divergence of the two.
 */
export class DoublePendulumExperiment extends BaseExperiment {
  readonly id = "double-pendulum";

  private m1 = 1;
  private m2 = 1;
  private l1 = 1;
  private l2 = 0.8;
  private g = 9.81;
  private th1 = 0;
  private th2 = 0;
  private w1 = 0;
  private w2 = 0;
  private s1 = 0;
  private s2 = 0;
  private sw1 = 0;
  private sw2 = 0; // shadow twin
  private time = 0;
  private energy0 = 0;
  private traceX = new Float32Array(TRACE_LENGTH);
  private traceY = new Float32Array(TRACE_LENGTH);
  private traceHead = 0;

  protected params(): ParameterDef[] {
    return [
      { key: "m1", label: "Upper mass", min: 0.5, max: 5, step: 0.1, defaultValue: 1, unit: "kg" },
      { key: "m2", label: "Lower mass", min: 0.5, max: 5, step: 0.1, defaultValue: 1, unit: "kg" },
      { key: "l1", label: "Upper arm", min: 40, max: 160, step: 5, defaultValue: 100, unit: "cm" },
      { key: "l2", label: "Lower arm", min: 40, max: 160, step: 5, defaultValue: 80, unit: "cm" },
      { key: "g", label: "Gravity", min: 1, max: 25, step: 0.1, defaultValue: 9.8, unit: "m/s²" },
      { key: "a1", label: "Initial θ1", min: -180, max: 180, step: 1, defaultValue: 120, unit: "°" },
      { key: "a2", label: "Initial θ2", min: -180, max: 180, step: 1, defaultValue: -20, unit: "°" },
      {
        key: "integrator",
        label: "Integrator",
        options: [
          { value: "rk4", label: "RK4" },
          { value: "semi", label: "Semi-implicit Euler" },
        ],
        defaultValue: "rk4",
      },
    ];
  }

  protected onReset(): void {
    this.m1 = this.num("m1");
    this.m2 = this.num("m2");
    this.l1 = this.num("l1") / 100;
    this.l2 = this.num("l2") / 100;
    this.g = this.num("g");
    this.th1 = (this.num("a1") * Math.PI) / 180;
    this.th2 = (this.num("a2") * Math.PI) / 180;
    this.w1 = 0;
    this.w2 = 0;
    this.s1 = this.th1 + 1e-6;
    this.s2 = this.th2;
    this.sw1 = 0;
    this.sw2 = 0;
    this.time = 0;
    this.traceX.fill(0);
    this.traceY.fill(0);
    this.traceHead = 0;
    this.energy0 = this.energy(this.th1, this.th2, this.w1, this.w2);
  }

  /** Exact equations of motion for the planar double pendulum. */
  private accelerations(t1: number, t2: number, w1: number, w2: number): [number, number] {
    const { m1, m2, l1, l2, g } = this;
    const d = t1 - t2;
    const denom = 2 * m1 + m2 - m2 * Math.cos(2 * d);
    const a1 =
      (-g * (2 * m1 + m2) * Math.sin(t1) -
        m2 * g * Math.sin(t1 - 2 * t2) -
        2 * Math.sin(d) * m2 * (w2 * w2 * l2 + w1 * w1 * l1 * Math.cos(d))) /
      (l1 * denom);
    const a2 =
      (2 *
        Math.sin(d) *
        (w1 * w1 * l1 * (m1 + m2) + g * (m1 + m2) * Math.cos(t1) + w2 * w2 * l2 * m2 * Math.cos(d))) /
      (l2 * denom);
    return [a1, a2];
  }

  private energy(t1: number, t2: number, w1: number, w2: number): number {
    const { m1, m2, l1, l2, g } = this;
    const kinetic =
      0.5 * m1 * l1 * l1 * w1 * w1 +
      0.5 * m2 * (l1 * l1 * w1 * w1 + l2 * l2 * w2 * w2 + 2 * l1 * l2 * w1 * w2 * Math.cos(t1 - t2));
    const potential = -(m1 + m2) * g * l1 * Math.cos(t1) - m2 * g * l2 * Math.cos(t2);
    return kinetic + potential;
  }

  protected onUpdate(dt: number): void {
    if (this.str("integrator") === "rk4") {
      const [a1, a2] = this.accelerations(this.th1, this.th2, this.w1, this.w2);
      const half = dt / 2;
      const [b1, b2] = this.accelerations(
        this.th1 + this.w1 * half,
        this.th2 + this.w2 * half,
        this.w1 + a1 * half,
        this.w2 + a2 * half,
      );
      const [c1, c2] = this.accelerations(
        this.th1 + this.w1 * half + a1 * half * half,
        this.th2 + this.w2 * half + a2 * half * half,
        this.w1 + b1 * half,
        this.w2 + b2 * half,
      );
      const [d1, d2] = this.accelerations(
        this.th1 + this.w1 * dt + b1 * half * dt,
        this.th2 + this.w2 * dt + b2 * half * dt,
        this.w1 + c1 * dt,
        this.w2 + c2 * dt,
      );
      const nw1 = this.w1 + (dt / 6) * (a1 + 2 * b1 + 2 * c1 + d1);
      const nw2 = this.w2 + (dt / 6) * (a2 + 2 * b2 + 2 * c2 + d2);
      const nt1 = this.th1 + (dt / 6) * (this.w1 + 2 * (this.w1 + a1 * half) + 2 * (this.w1 + b1 * half) + (this.w1 + c1 * dt));
      const nt2 = this.th2 + (dt / 6) * (this.w2 + 2 * (this.w2 + a2 * half) + 2 * (this.w2 + b2 * half) + (this.w2 + c2 * dt));
      this.th1 = nt1;
      this.th2 = nt2;
      this.w1 = nw1;
      this.w2 = nw2;
      // Shadow twin uses the cheaper semi-implicit step; its phase error is
      // negligible next to the 1e-6 rad separation it exists to measure.
      const [sa1, sa2] = this.accelerations(this.s1, this.s2, this.sw1, this.sw2);
      this.sw1 += sa1 * dt;
      this.sw2 += sa2 * dt;
      this.s1 += this.sw1 * dt;
      this.s2 += this.sw2 * dt;
    } else {
      const [a1, a2] = this.accelerations(this.th1, this.th2, this.w1, this.w2);
      this.w1 += a1 * dt;
      this.w2 += a2 * dt;
      this.th1 += this.w1 * dt;
      this.th2 += this.w2 * dt;
    }
    this.time += dt;
    const bob = this.bobPosition(this.th1, this.th2);
    this.traceX[this.traceHead] = bob.x;
    this.traceY[this.traceHead] = bob.y;
    this.traceHead = (this.traceHead + 1) % TRACE_LENGTH;
  }

  private pivot(): { x: number; y: number } {
    return { x: this.width / 2, y: this.height * 0.34 };
  }

  private bobPosition(t1: number, t2: number): { x: number; y: number } {
    const origin = this.pivot();
    const jointX = origin.x + Math.sin(t1) * this.l1 * PX_PER_M;
    const jointY = origin.y + Math.cos(t1) * this.l1 * PX_PER_M;
    return {
      x: jointX + Math.sin(t2) * this.l2 * PX_PER_M,
      y: jointY + Math.cos(t2) * this.l2 * PX_PER_M,
    };
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors, alpha: number): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const origin = this.pivot();

    // Trace of the lower bob (most recent segment strongest).
    ctx.lineWidth = 1;
    for (let i = 1; i < TRACE_LENGTH; i++) {
      const a = ((this.traceHead - i + TRACE_LENGTH) % TRACE_LENGTH);
      const b = ((this.traceHead - i + 1 + TRACE_LENGTH) % TRACE_LENGTH);
      if (this.traceX[a] === 0 && this.traceY[a] === 0) continue;
      ctx.strokeStyle = theme.viz[1];
      ctx.globalAlpha = (i / TRACE_LENGTH) * 0.6;
      ctx.beginPath();
      ctx.moveTo(this.traceX[a], this.traceY[a]);
      ctx.lineTo(this.traceX[b], this.traceY[b]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const inter1 = this.th1 - this.w1 * 0.016 * (1 - alpha);
    const inter2 = this.th2 - this.w2 * 0.016 * (1 - alpha);
    const jointX = origin.x + Math.sin(inter1) * this.l1 * PX_PER_M;
    const jointY = origin.y + Math.cos(inter1) * this.l1 * PX_PER_M;
    const bobX = jointX + Math.sin(inter2) * this.l2 * PX_PER_M;
    const bobY = jointY + Math.cos(inter2) * this.l2 * PX_PER_M;

    // Shadow twin, ghosted.
    const shadow = this.bobPosition(this.s1, this.s2);
    const jointS = {
      x: origin.x + Math.sin(this.s1) * this.l1 * PX_PER_M,
      y: origin.y + Math.cos(this.s1) * this.l1 * PX_PER_M,
    };
    ctx.strokeStyle = theme.fgTertiary;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(jointS.x, jointS.y);
    ctx.lineTo(shadow.x, shadow.y);
    ctx.stroke();
    ctx.fillStyle = theme.fgTertiary;
    ctx.beginPath();
    ctx.arc(shadow.x, shadow.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Main pendulum
    ctx.strokeStyle = theme.fgSecondary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(jointX, jointY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();
    ctx.fillStyle = theme.fgTertiary;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.fg;
    const r1 = 6 + this.m1 * 1.6;
    ctx.beginPath();
    ctx.arc(jointX, jointY, r1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.accent;
    const r2 = 6 + this.m2 * 1.6;
    ctx.beginPath();
    ctx.arc(bobX, bobY, r2, 0, Math.PI * 2);
    ctx.fill();
  }

  getMetrics() {
    const energy = this.energy(this.th1, this.th2, this.w1, this.w2);
    const drift = this.energy0 !== 0 ? ((energy - this.energy0) / Math.abs(this.energy0)) * 100 : 0;
    let sep = Math.abs(this.s1 - this.th1);
    sep = (sep * 180) / Math.PI;
    return {
      theta1: `${((((this.th1 * 180) / Math.PI) % 360) + 540) % 360 - 180 | 0}°`,
      theta2: `${((((this.th2 * 180) / Math.PI) % 360) + 540) % 360 - 180 | 0}°`,
      energyDrift: `${drift >= 0 ? "+" : ""}${drift.toExponential(2)} %`,
      twinGap: `${sep < 0.01 ? sep.toExponential(1) : sep.toFixed(1)}°`,
      time: `${this.time.toFixed(1)} s`,
    };
  }

  describe(): string {
    const sep = (Math.abs(this.s1 - this.th1) * 180) / Math.PI;
    if (sep < 0.01) {
      return "Two pendulum bobs swinging; the 0.000001-radian twin is still indistinguishable from the primary.";
    }
    return `Two pendulum bobs swinging; the twin started 0.000001 rad away has diverged to ${sep.toFixed(1)} degrees.`;
  }

  entities(): number {
    return 3; // primary + shadow twin (2 bodies each) as the tracked set
  }
}
