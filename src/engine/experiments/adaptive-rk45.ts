import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

const HORIZON = 8;

/**
 * Adaptive step-size integration with the Dormand-Prince 5(4) embedded pair.
 * The ODE y' = lambda (sin t - y) + cos t has exact solution y = sin t, so
 * the controller's tolerance is checked against the truth, and the step
 * trace shows h shrinking through the stiff transient and relaxing after.
 */
export class AdaptiveRk45Experiment extends BaseExperiment {
  readonly id = "adaptive-rk45";

  private t = 0;
  private y = 0;
  private h = 0.05;
  private lambda = 30;
  private accepted = 0;
  private rejected = 0;
  private maxError = 0;
  private lastPass = { accepted: 0, rejected: 0, maxError: 0 };
  private trace: { t: number; y: number; h: number }[] = [];

  protected params(): ParameterDef[] {
    return [
      { key: "lambda", label: "Stiffness lambda", min: 5, max: 60, step: 5, defaultValue: 30 },
      { key: "tolExp", label: "Tolerance 10^", min: -10, max: -3, step: 1, defaultValue: -6 },
      { key: "steps", label: "Steps per tick", min: 1, max: 40, step: 1, defaultValue: 8 },
    ];
  }

  protected onReset(): void {
    this.t = 0;
    this.y = 0;
    this.h = 0.05;
    this.accepted = 0;
    this.rejected = 0;
    this.maxError = 0;
    this.trace = [];
    void this.lastPass;
    this.lastPass = { accepted: 0, rejected: 0, maxError: 0 };
  }

  protected onParameterChange(key: string): void {
    if (key !== "steps") this.reset();
  }

  private derivative(t: number, y: number): number {
    return this.lambda * (Math.sin(t) - y) + Math.cos(t);
  }

  /** One Dormand-Prince attempt of size dt from (t, y): the 5th-order
   *  solution increment and the embedded 4th-order error estimate. */
  private dpTry(dt: number): { advance: number; err: number } {
    const k1 = this.derivative(this.t, this.y);
    const k2 = this.derivative(this.t + dt * (1 / 5), this.y + dt * (1 / 5) * k1);
    const k3 = this.derivative(
      this.t + dt * (3 / 10),
      this.y + dt * ((3 / 40) * k1 + (9 / 40) * k2),
    );
    const k4 = this.derivative(
      this.t + dt * (4 / 5),
      this.y + dt * ((44 / 45) * k1 - (56 / 15) * k2 + (32 / 9) * k3),
    );
    const k5 = this.derivative(
      this.t + dt * (8 / 9),
      this.y +
        dt * ((19372 / 6561) * k1 - (25360 / 2187) * k2 + (64448 / 6561) * k3 - (212 / 729) * k4),
    );
    const k6 = this.derivative(
      this.t + dt,
      this.y +
        dt *
          ((9017 / 3168) * k1 -
            (355 / 33) * k2 +
            (46732 / 5247) * k3 +
            (49 / 176) * k4 -
            (5103 / 18656) * k5),
    );
    const advance =
      dt *
      ((35 / 384) * k1 +
        (500 / 1113) * k3 +
        (125 / 192) * k4 -
        (2187 / 6784) * k5 +
        (11 / 84) * k6);
    const k7 = this.derivative(this.t + dt, this.y + advance);
    const errCoefficient =
      (5179 / 57600) * k1 +
      (7571 / 16695) * k3 +
      (393 / 640) * k4 -
      (92097 / 339200) * k5 +
      (187 / 2100) * k6 +
      (1 / 40) * k7 -
      ((35 / 384) * k1 +
        (500 / 1113) * k3 +
        (125 / 192) * k4 -
        (2187 / 6784) * k5 +
        (11 / 84) * k6);
    return { advance, err: Math.abs(dt * errCoefficient) };
  }

  protected onUpdate(): void {
    const tolExp = this.num("tolExp");
    const tol = Math.pow(10, tolExp);
    const stepsBudget = this.num("steps");
    this.lambda = this.num("lambda");
    for (let s = 0; s < stepsBudget && this.t < HORIZON; s++) {
      let dt = this.h;
      let attempt = this.dpTry(dt);
      let attempts = 0;
      while (attempt.err > tol && attempts < 30 && dt > 1e-7) {
        this.rejected += 1;
        dt *= Math.max(0.2, 0.9 * Math.pow(tol / attempt.err, 1 / 5));
        attempt = this.dpTry(dt);
        attempts += 1;
      }
      this.y += attempt.advance;
      this.t += dt;
      this.accepted += 1;
      this.maxError = Math.max(this.maxError, Math.abs(this.y - Math.sin(this.t)));
      this.trace.push({ t: this.t, y: this.y, h: dt });
      if (this.trace.length > 3000) this.trace.shift();
      // Standard step-size controller for the next attempt.
      this.h = Math.min(
        0.5,
        Math.max(
          1e-6,
          dt * Math.min(5, Math.max(0.2, 0.9 * Math.pow(tol / Math.max(attempt.err, 1e-14), 1 / 5))),
        ),
      );
    }
    if (this.t >= HORIZON) {
      this.lastPass = { accepted: this.accepted, rejected: this.rejected, maxError: this.maxError };
      this.t = 0;
      this.y = 0;
      this.h = 0.05;
      this.accepted = 0;
      this.rejected = 0;
      this.maxError = 0;
      this.trace = [];
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const pad = 16;
    const solutionBottom = this.height - 84;
    const toX = (t: number) => pad + (t / HORIZON) * (this.width - 2 * pad);
    const yScale = (this.height - 140) / 2.6;
    const toY = (y: number) => solutionBottom / 2 - y * yScale + solutionBottom * 0;
    const midY = solutionBottom / 2;
    ctx.strokeStyle = theme.line;
    ctx.beginPath();
    ctx.moveTo(pad, midY);
    ctx.lineTo(this.width - pad, midY);
    ctx.stroke();
    // Exact solution
    ctx.strokeStyle = theme.fgTertiary;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let px = 0; px <= this.width - 2 * pad; px += 2) {
      const t = (px / (this.width - 2 * pad)) * HORIZON;
      const y = midY - Math.sin(t) * yScale;
      if (px === 0) ctx.moveTo(pad + px, y);
      else ctx.lineTo(pad + px, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // Adaptive solution + step trace
    if (this.trace.length > 1) {
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < this.trace.length; i++) {
        const point = this.trace[i];
        if (i === 0) ctx.moveTo(toX(point.t), midY - point.y * yScale);
        else ctx.lineTo(toX(point.t), midY - point.y * yScale);
      }
      ctx.stroke();
      // Step-size band: one tick per accepted step, height proportional to h.
      const bandBase = this.height - 44;
      ctx.strokeStyle = theme.viz[1];
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const point of this.trace) {
        const x = toX(point.t);
        const h = Math.min(34, (Math.log10(point.h / 1e-5) / Math.log10(0.5 / 1e-5)) * 34);
        ctx.moveTo(x, bandBase);
        ctx.lineTo(x, bandBase - h);
      }
      ctx.stroke();
      ctx.fillStyle = theme.fgTertiary;
      ctx.font = "11px ui-monospace, monospace";
      ctx.fillText("STEP SIZE h(t)", pad, this.height - 30);
      ctx.strokeStyle = theme.line;
      ctx.beginPath();
      ctx.moveTo(pad, bandBase);
      ctx.lineTo(this.width - pad, bandBase);
      ctx.stroke();
    }
    void toY;
  }

  getMetrics() {
    return {
      lambda: this.lambda,
      tolerance: `1e${this.num("tolExp")}`,
      adaptiveSteps: this.lastPass.accepted,
      rejected: this.lastPass.rejected,
      fixedRk4Steps: HORIZON * 60,
      maxError: this.lastPass.maxError.toExponential(2),
    };
  }

  describe(): string {
    return `Adaptive Dormand-Prince covered the stiff transient in ${this.lastPass.accepted} accepted steps where fixed dt=1/60 RK4 needs ${HORIZON * 60}; max error ${this.lastPass.maxError.toExponential(1)}.`;
  }

  entities(): number {
    return this.trace.length;
  }
}
