import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";

type TaylorFn = {
  label: string;
  domain: [number, number];
  /** f at x; NaN outside its domain. */
  f: (x: number) => number;
  /** k-th Taylor coefficient (about 0), k >= 0. */
  coefficient: (k: number) => number;
};

const FUNCTIONS: Record<string, TaylorFn> = {
  sin: {
    label: "sin(x)",
    domain: [-9, 9],
    f: Math.sin,
    coefficient: (k) => (k % 2 === 0 ? 0 : (k === 1 ? 1 : ((-1) ** ((k - 1) / 2)) / factorial(k))),
  },
  "1/(1+x^2)": {
    label: "1 / (1 + x²)",
    domain: [-4, 4],
    f: (x) => 1 / (1 + x * x),
    coefficient: (k) => (k % 2 === 0 ? ((-1) ** (k / 2)) : 0),
  },
  "ln(1+x)": {
    label: "ln(1 + x)",
    domain: [-0.95, 3],
    f: (x) => (x > -1 ? Math.log(1 + x) : NaN),
    coefficient: (k) => (k === 0 ? 0 : ((-1) ** (k + 1)) / k),
  },
};

function factorial(n: number): number {
  let out = 1;
  for (let i = 2; i <= n; i++) out *= i;
  return out;
}

/**
 * Taylor polynomials with a live error readout. The marker position is set by
 * the pointer; the max-error metric is sampled across the visible domain.
 */
export class TaylorSeriesExperiment extends BaseExperiment {
  readonly id = "taylor-series";

  private fn = FUNCTIONS.sin;
  private markerX = 2;
  private pointer = { x: 0, y: 0, down: false, inside: false };

  protected params(): ParameterDef[] {
    return [
      {
        key: "fn",
        label: "Function",
        options: [
          { value: "sin", label: "sin(x) about 0" },
          { value: "1/(1+x^2)", label: "1/(1 + x²) about 0" },
          { value: "ln(1+x)", label: "ln(1 + x) about 0" },
        ],
        defaultValue: "sin",
      },
      { key: "terms", label: "Polynomial terms", min: 1, max: 21, step: 2, defaultValue: 5 },
    ];
  }

  protected onReset(): void {
    this.fn = FUNCTIONS[this.str("fn")];
    this.markerX = 2;
  }

  protected onParameterChange(key: string): void {
    if (key === "fn") this.reset();
  }

  /** Static visualization: state changes only through parameters and pointer. */
  protected onUpdate(): void {}

  private partialSum(x: number, terms: number): number {
    let sum = 0;
    let power = 1;
    for (let k = 0; k < terms; k++) {
      sum += this.fn.coefficient(k) * power;
      power *= x;
    }
    return sum;
  }

  onPointer(state: PointerState): void {
    this.pointer = state;
    if (state.inside) {
      const [x0, x1] = this.fn.domain;
      this.markerX = x0 + (state.x / this.width) * (x1 - x0);
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const [x0, x1] = this.fn.domain;
    const yRange: [number, number] = [-2.4, 2.4];
    const toX = (x: number) => ((x - x0) / (x1 - x0)) * this.width;
    const toY = (y: number) => this.height / 2 - (y / (yRange[1] - yRange[0])) * this.height;
    // Axes
    ctx.strokeStyle = theme.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, toY(0));
    ctx.lineTo(this.width, toY(0));
    ctx.stroke();
    if (x0 < 0 && x1 > 0) {
      ctx.beginPath();
      ctx.moveTo(toX(0), 0);
      ctx.lineTo(toX(0), this.height);
      ctx.stroke();
    }
    const terms = this.num("terms");
    let maxError = 0;
    // f
    ctx.strokeStyle = theme.fgSecondary;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let pen = false;
    for (let px = 0; px <= this.width; px += 2) {
      const xv = x0 + (px / this.width) * (x1 - x0);
      const yv = this.fn.f(xv);
      if (Number.isNaN(yv) || Math.abs(yv) > 12) {
        pen = false;
        continue;
      }
      const py = toY(yv);
      if (pen) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
      pen = true;
    }
    ctx.stroke();
    // Partial sum
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    pen = false;
    for (let px = 0; px <= this.width; px += 2) {
      const xv = x0 + (px / this.width) * (x1 - x0);
      const yv = this.partialSum(xv, terms);
      if (Number.isNaN(yv) || Math.abs(yv) > 12) {
        pen = false;
        continue;
      }
      if (Number.isFinite(this.fn.f(xv))) {
        maxError = Math.max(maxError, Math.abs(yv - this.fn.f(xv)));
      }
      const py = toY(yv);
      if (pen) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
      pen = true;
    }
    ctx.stroke();
    // Marker
    const mx = toX(this.markerX);
    const fy = this.fn.f(this.markerX);
    const py = this.partialSum(this.markerX, terms);
    ctx.strokeStyle = theme.fgTertiary;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(mx, 0);
    ctx.lineTo(mx, this.height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.fg;
    ctx.beginPath();
    ctx.arc(mx, toY(fy), 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(mx, toY(py), 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Legend
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = theme.fgSecondary;
    ctx.fillText(this.fn.label, 10, 16);
    ctx.fillStyle = theme.accent;
    ctx.fillText(`P${terms}(x), ${terms} TERMS`, 10, 30);
  }

  getMetrics() {
    const terms = this.num("terms");
    const f = this.fn.f(this.markerX);
    const p = this.partialSum(this.markerX, terms);
    let maxError = 0;
    const [x0, x1] = this.fn.domain;
    for (let i = 0; i <= 200; i++) {
      const xv = x0 + ((x1 - x0) * i) / 200;
      const fv = this.fn.f(xv);
      if (Number.isNaN(fv)) continue;
      maxError = Math.max(maxError, Math.abs(this.partialSum(xv, terms) - fv));
    }
    return {
      function: this.fn.label,
      terms,
      markerX: this.markerX.toFixed(2),
      fAtMarker: Number.isNaN(f) ? "undefined" : f.toFixed(4),
      pAtMarker: p.toExponential(3),
      errorAtMarker: Number.isNaN(f) ? "n/a" : Math.abs(f - p).toExponential(2),
      maxError: maxError.toExponential(2),
    };
  }

  describe(): string {
    const terms = this.num("terms");
    return `The order-${terms} Taylor polynomial of ${this.fn.label} compared against the true curve.`;
  }

  entities(): number {
    return this.num("terms");
  }
}
