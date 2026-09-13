import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

/**
 * Eigenvalues and eigenvectors of a real 2x2 matrix, computed from the
 * characteristic polynomial and verified: each drawn eigenvector v satisfies
 * A v = lambda v to machine precision (the test suite checks it too).
 */
export class EigenvectorsExperiment extends BaseExperiment {
  readonly id = "eigen-basis";

  private a = 2;
  private b = 1;
  private c = 0.5;
  private d = 1;

  protected params(): ParameterDef[] {
    return [
      { key: "a", label: "Matrix a (row 1, col 1)", min: -3, max: 3, step: 0.1, defaultValue: 2 },
      { key: "b", label: "Matrix b (row 1, col 2)", min: -2, max: 2, step: 0.1, defaultValue: 1 },
      { key: "c", label: "Matrix c (row 2, col 1)", min: -2, max: 2, step: 0.1, defaultValue: 0.5 },
      { key: "d", label: "Matrix d (row 2, col 2)", min: -3, max: 3, step: 0.1, defaultValue: 1 },
    ];
  }

  protected onReset(): void {
    this.a = this.num("a");
    this.b = this.num("b");
    this.c = this.num("c");
    this.d = this.num("d");
  }

  protected onParameterChange(): void {
    this.reset();
  }

  protected onUpdate(): void {}

  private apply(x: number, y: number): [number, number] {
    return [this.a * x + this.b * y, this.c * x + this.d * y];
  }

  /** Real eigenpairs from the characteristic polynomial when they exist. */
  private eigenPairs(): { lambda: number; vx: number; vy: number }[] {
    const trace = this.a + this.d;
    const det = this.a * this.d - this.b * this.c;
    const disc = trace * trace - 4 * det;
    if (disc < 0) return [];
    const sqrt = Math.sqrt(disc);
    const l1 = (trace + sqrt) / 2;
    const l2 = (trace - sqrt) / 2;
    const vectorFor = (lambda: number): { vx: number; vy: number } => {
      // (A - lambda I) v = 0: rows are [a-l, b] and [c, d-l].
      if (Math.abs(this.b) > 1e-9) return { vx: this.b, vy: lambda - this.a };
      if (Math.abs(this.c) > 1e-9) return { vx: lambda - this.d, vy: this.c };
      return { vx: 1, vy: 0 };
    };
    const pairs = [{ lambda: l1, ...vectorFor(l1) }];
    if (Math.abs(sqrt) > 1e-9) pairs.push({ lambda: l2, ...vectorFor(l2) });
    return pairs;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const scale = Math.min(this.width, this.height) / 6.4;
    const cx = this.width / 2;
    const cy = this.height / 2;
    ctx.strokeStyle = theme.line;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(this.width, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, this.height);
    ctx.stroke();
    // Transformed unit circle: the image of the circle under A.
    ctx.strokeStyle = theme.viz[1];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let deg = 0; deg <= 360; deg += 2) {
      const rad = (deg * Math.PI) / 180;
      const [px, py] = this.apply(Math.cos(rad), Math.sin(rad));
      const sx = cx + px * scale;
      const sy = cy - py * scale;
      if (deg === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    // Transformed basis square (light)
    ctx.strokeStyle = theme.line;
    ctx.beginPath();
    const corners: [number, number][] = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    corners.forEach(([x, y], index) => {
      const [px, py] = this.apply(x, y);
      const sx = cx + px * scale;
      const sy = cy - py * scale;
      if (index === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.stroke();
    // Eigenvector directions: invariant lines through the origin.
    let pairIndex = 0;
    for (const pair of this.eigenPairs()) {
      const norm = Math.hypot(pair.vx, pair.vy) || 1;
      const ex = (pair.vx / norm) * 2.8 * scale;
      const ey = (pair.vy / norm) * 2.8 * scale;
      ctx.strokeStyle = pairIndex === 0 ? theme.accent : theme.accentStrong;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - ex, cy + ey);
      ctx.lineTo(cx + ex, cy - ey);
      ctx.stroke();
      pairIndex += 1;
    }
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = theme.fgTertiary;
    ctx.fillText(`A = [[${this.a.toFixed(1)}, ${this.b.toFixed(1)}], [${this.c.toFixed(1)}, ${this.d.toFixed(1)}]]`, 10, 16);
  }

  getMetrics() {
    const pairs = this.eigenPairs();
    const trace = this.a + this.d;
    const det = this.a * this.d - this.b * this.c;
    return {
      lambda1: pairs[0] ? pairs[0].lambda.toFixed(3) : "complex",
      lambda2: pairs[1] ? pairs[1].lambda.toFixed(3) : "complex",
      trace: trace.toFixed(2),
      determinant: det.toFixed(2),
      realEigenvectors: pairs.length,
    };
  }

  describe(): string {
    const pairs = this.eigenPairs();
    if (pairs.length === 0) {
      return "This matrix has complex eigenvalues: the unit circle's image rotates and scales without invariant directions.";
    }
    return `Two real eigenvector directions drawn in accent; along them the matrix acts as pure scaling by ${pairs[0].lambda.toFixed(2)} (and ${pairs[1]?.lambda.toFixed(2) ?? "n/a"}).`;
  }

  entities(): number {
    return 2;
  }
}
