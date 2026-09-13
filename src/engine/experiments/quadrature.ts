import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

type Fn = { label: string; f: (x: number) => number; exact: string; exactValue: (a: number, b: number) => number; domain: [number, number] };

const FUNCTIONS: Record<string, Fn> = {
  sin: {
    label: "sin(x)",
    f: Math.sin,
    exact: "2",
    exactValue: (a, b) => Math.cos(a) - Math.cos(b),
    domain: [0, Math.PI],
  },
  parabola: {
    label: "x^2",
    f: (x) => x * x,
    exact: "2/3",
    exactValue: (a, b) => (b ** 3 - a ** 3) / 3,
    domain: [0, 1],
  },
  gaussian: {
    label: "exp(-x^2)",
    f: (x) => Math.exp(-x * x),
    exact: "sqrt(pi) erf(1)",
    exactValue: () => 1.4936482649814836,
    domain: [0, 1],
  },
};

/**
 * Numerical quadrature three ways - left Riemann, trapezoid, Simpson -
 * against the exact value. The error metric exposes the convergence orders:
 * Riemann O(n^-1), trapezoid O(n^-2), Simpson O(n^-4).
 */
export class QuadratureExperiment extends BaseExperiment {
  readonly id = "quadrature";

  protected params(): ParameterDef[] {
    return [
      {
        key: "fn",
        label: "Integrand",
        options: [
          { value: "sin", label: "sin(x) on [0, pi]" },
          { value: "parabola", label: "x^2 on [0, 1]" },
          { value: "gaussian", label: "exp(-x^2) on [0, 1]" },
        ],
        defaultValue: "sin",
      },
      {
        key: "method",
        label: "Rule",
        options: [
          { value: "left", label: "Left Riemann" },
          { value: "trapezoid", label: "Trapezoid" },
          { value: "simpson", label: "Simpson" },
        ],
        defaultValue: "trapezoid",
      },
      { key: "n", label: "Panels n", min: 2, max: 200, step: 2, defaultValue: 12 },
    ];
  }

  protected onReset(): void {}

  protected onUpdate(): void {}

  private fn(): Fn {
    return FUNCTIONS[this.str("fn")];
  }

  private approximate(): number {
    const f = this.fn().f;
    const [a, b] = this.fn().domain;
    const n = this.num("n");
    const h = (b - a) / n;
    const method = this.str("method");
    if (method === "left") {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += f(a + i * h);
      return sum * h;
    }
    if (method === "trapezoid") {
      let sum = (f(a) + f(b)) / 2;
      for (let i = 1; i < n; i++) sum += f(a + i * h);
      return sum * h;
    }
    // Simpson needs an even n.
    const m = n % 2 === 0 ? n : n + 1;
    const hh = (b - a) / m;
    let sum = f(a) + f(b);
    for (let i = 1; i < m; i++) sum += f(a + i * hh) * (i % 2 === 1 ? 4 : 2);
    return (sum * hh) / 3;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const f = this.fn();
    const [a, b] = f.domain;
    const toX = (x: number) => ((x - a) / (b - a)) * this.width;
    const valueSpan = 2.4;
    const toY = (y: number) => this.height - 24 - (y / valueSpan) * (this.height - 40);
    const n = this.num("n");
    const h = (b - a) / n;
    const method = this.str("method");
    // Panels
    ctx.fillStyle = theme.raised;
    for (let i = 0; i < n; i++) {
      const x0 = a + i * h;
      const x1 = x0 + h;
      const yv = method === "left" ? f.f(x0) : method === "trapezoid" ? NaN : (f.f(x0) + 4 * f.f((x0 + x1) / 2) + f.f(x1)) / 6;
      if (Number.isNaN(yv)) {
        // Trapezoid panel: draw as a quad.
        ctx.beginPath();
        ctx.moveTo(toX(x0), toY(0));
        ctx.lineTo(toX(x0), toY(f.f(x0)));
        ctx.lineTo(toX(x1), toY(f.f(x1)));
        ctx.lineTo(toX(x1), toY(0));
        ctx.closePath();
        ctx.fill();
        continue;
      }
      const px = toX(x0);
      const pw = toX(x1) - toX(x0);
      const py = toY(Math.max(0, yv));
      ctx.fillRect(px, py, pw, toY(0) - py);
    }
    // Curve
    ctx.strokeStyle = theme.fg;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let px = 0; px <= this.width; px += 1) {
      const xv = a + (px / this.width) * (b - a);
      const py = toY(f.f(xv));
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = theme.line;
    ctx.beginPath();
    ctx.moveTo(0, toY(0));
    ctx.lineTo(this.width, toY(0));
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  getMetrics() {
    const f = this.fn();
    const [a, b] = f.domain;
    const approx = this.approximate();
    const exact = f.exactValue(a, b);
    return {
      method: this.str("method"),
      panels: this.num("n"),
      approximation: approx.toFixed(8),
      exact: f.exact,
      error: Math.abs(approx - exact).toExponential(3),
    };
  }

  describe(): string {
    const m = this.getMetrics();
    return `${m.method} with ${m.panels} panels approximates the integral as ${m.approximation} (exact ${m.exact}); error ${m.error}.`;
  }

  entities(): number {
    return this.num("n");
  }
}
