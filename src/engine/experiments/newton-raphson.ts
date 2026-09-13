import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";

type Fn = { label: string; f: (x: number) => number; df: (x: number) => number; domain: [number, number] };

const FUNCTIONS: Record<string, Fn> = {
  "x^2 - 2": {
    label: "x² - 2",
    f: (x) => x * x - 2,
    df: (x) => 2 * x,
    domain: [-3.4, 3.4],
  },
  "x^3 - x - 2": {
    label: "x³ - x - 2",
    f: (x) => x ** 3 - x - 2,
    df: (x) => 3 * x * x - 1,
    domain: [-2.6, 2.6],
  },
  "sin(x) - 0.4": {
    label: "sin(x) - 0.4",
    f: (x) => Math.sin(x) - 0.4,
    df: (x) => Math.cos(x),
    domain: [-8, 8],
  },
};

/**
 * Newton-Raphson root finding, one tangent per step: x <- x - f(x)/f'(x),
 * iterates drawn live on the function's plot. Convergence is quadratic when
 * it works; the divergent starts are part of the lesson.
 */
export class NewtonRaphsonExperiment extends BaseExperiment {
  readonly id = "newton-raphson";

  private fn = FUNCTIONS["x^2 - 2"];
  private x = 1.5;
  private iterations = 0;
  private history: { x: number; tangentFrom: number; slope: number }[] = [];
  private status: "idle" | "running" | "converged" | "diverged" = "idle";
  private pointer = { x: 0, y: 0, down: false, inside: false };

  protected params(): ParameterDef[] {
    return [
      {
        key: "fn",
        label: "Function",
        options: [
          { value: "x^2 - 2", label: "x² - 2" },
          { value: "x^3 - x - 2", label: "x³ - x - 2" },
          { value: "sin(x) - 0.4", label: "sin(x) - 0.4" },
        ],
        defaultValue: "x^2 - 2",
      },
      { key: "steps", label: "Steps per tick", min: 1, max: 10, step: 1, defaultValue: 1 },
    ];
  }

  protected onReset(): void {
    this.fn = FUNCTIONS[this.str("fn")];
    this.x = (this.fn.domain[0] + this.fn.domain[1]) / 2;
    this.iterations = 0;
    this.history = [];
    this.status = "running";
  }

  protected onParameterChange(key: string): void {
    if (key === "fn") this.reset();
  }

  onPointer(state: PointerState): void {
    this.pointer = state;
    if (state.inside && state.down) {
      const [d0, d1] = this.fn.domain;
      this.x = d0 + (state.x / Math.max(1, this.width)) * (d1 - d0);
      this.iterations = 0;
      this.history = [];
      this.status = "running";
    }
  }

  protected onUpdate(): void {
    if (this.status !== "running") return;
    const steps = this.num("steps");
    for (let i = 0; i < steps; i++) {
      const fx = this.fn.f(this.x);
      const dfx = this.fn.df(this.x);
      if (Math.abs(dfx) < 1e-12) {
        this.status = "diverged";
        return;
      }
      this.history.push({ x: this.x, tangentFrom: fx, slope: dfx });
      if (this.history.length > 40) this.history.shift();
      this.x -= fx / dfx;
      this.iterations += 1;
      if (Math.abs(this.fn.f(this.x)) < 1e-10) {
        this.status = "converged";
        return;
      }
      if (this.iterations > 60) {
        this.status = "diverged";
        return;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const [d0, d1] = this.fn.domain;
    let fMin = -4;
    let fMax = 4;
    if (this.fn.label === "x³ - x - 2") [fMin, fMax] = [-3, 3];
    const toX = (x: number) => ((x - d0) / (d1 - d0)) * this.width;
    const toY = (y: number) => this.height / 2 - (y / (fMax - fMin)) * this.height * 0.9;
    ctx.strokeStyle = theme.line;
    ctx.beginPath();
    ctx.moveTo(0, toY(0));
    ctx.lineTo(this.width, toY(0));
    ctx.stroke();
    // Function
    ctx.strokeStyle = theme.fgSecondary;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    let pen = false;
    for (let px = 0; px <= this.width; px += 1) {
      const xv = d0 + (px / this.width) * (d1 - d0);
      const yv = this.fn.f(xv);
      if (Math.abs(yv) > 12) {
        pen = false;
        continue;
      }
      const py = toY(yv);
      if (pen) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
      pen = true;
    }
    ctx.stroke();
    // Tangent lines from recent iterates
    this.history.forEach((entry, index) => {
      const alpha = 0.25 + (0.6 * index) / Math.max(1, this.history.length);
      ctx.strokeStyle = theme.viz[1];
      ctx.globalAlpha = index === this.history.length - 1 ? 0.9 : alpha * 0.5;
      ctx.beginPath();
      const xa = entry.x - 1.2;
      const xb = entry.x + 1.2;
      ctx.moveTo(toX(xa), toY(entry.tangentFrom + entry.slope * (xa - entry.x)));
      ctx.lineTo(toX(xb), toY(entry.tangentFrom + entry.slope * (xb - entry.x)));
      ctx.stroke();
      // Drop to x-axis: the new iterate
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = theme.accent;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(toX(entry.x), toY(entry.tangentFrom));
      ctx.lineTo(toX(entry.x), toY(0));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    });
    ctx.lineWidth = 1;
    // Current iterate on the axis
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(toX(this.x), toY(0), 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = theme.fgTertiary;
    ctx.fillText(`${this.fn.label} - click to choose a starting point`, 10, 16);
  }

  getMetrics() {
    return {
      iteration: this.iterations,
      x: this.x.toFixed(6),
      f_x: this.fn.f(this.x).toExponential(2),
      status: this.status,
    };
  }

  describe(): string {
    if (this.status === "converged") {
      return `Newton-Raphson converged to x = ${this.x.toFixed(6)} in ${this.iterations} iterations (f(x) = ${this.fn.f(this.x).toExponential(1)}).`;
    }
    if (this.status === "diverged") return "The iteration diverged: this start runs away from every root.";
    return `Newton-Raphson at x = ${this.x.toFixed(4)} after ${this.iterations} tangent steps.`;
  }

  entities(): number {
    return this.iterations;
  }
}
