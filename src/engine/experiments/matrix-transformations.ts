import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

/**
 * 2-D matrix transformations: rotation, scaling, and shear sliders compose
 * into one matrix that maps a reference grid and a shape. The matrix readout
 * updates live - the columns ARE the images of the basis vectors.
 */
export class MatrixTransformationsExperiment extends BaseExperiment {
  private rotation = 0;
  private scaleX = 1;
  private scaleY = 1;
  private shearX = 0;
  private shearY = 0;

  readonly id = "matrix-transformations";

  protected params(): ParameterDef[] {
    return [
      { key: "rotation", label: "Rotation", min: -180, max: 180, step: 1, defaultValue: 0, unit: "°" },
      { key: "scaleX", label: "Scale x", min: -2, max: 2, step: 0.1, defaultValue: 1 },
      { key: "scaleY", label: "Scale y", min: -2, max: 2, step: 0.1, defaultValue: 1 },
      { key: "shearX", label: "Shear x", min: -1.5, max: 1.5, step: 0.05, defaultValue: 0 },
      { key: "shearY", label: "Shear y", min: -1.5, max: 1.5, step: 0.05, defaultValue: 0 },
    ];
  }

  protected onReset(): void {
    this.rotation = this.num("rotation");
    this.scaleX = this.num("scaleX");
    this.scaleY = this.num("scaleY");
    this.shearX = this.num("shearX");
    this.shearY = this.num("shearY");
  }

  protected onParameterChange(): void {
    this.reset();
  }

  protected onUpdate(): void {}

  /** Composed matrix M = Shear * Scale * Rotation (column-major multiply). */
  private matrix(): [number, number, number, number] {
    const rad = (this.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // R then S then H: M = H * S * R
    const r00 = cos;
    const r01 = -sin;
    const r10 = sin;
    const r11 = cos;
    const s00 = this.scaleX * r00;
    const s01 = this.scaleX * r01;
    const s10 = this.scaleY * r10;
    const s11 = this.scaleY * r11;
    return [
      s00 + this.shearX * s10,
      s01 + this.shearX * s11,
      this.shearY * s00 + s10,
      this.shearY * s01 + s11,
    ];
  }

  private apply(m: [number, number, number, number], x: number, y: number): [number, number] {
    return [m[0] * x + m[1] * y, m[2] * x + m[3] * y];
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const m = this.matrix();
    const scale = Math.min(this.width, this.height) / 5;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const to = (x: number, y: number): [number, number] => {
      const [px, py] = this.apply(m, x, y);
      return [cx + px * scale, cy - py * scale];
    };
    // Transformed grid lines
    ctx.strokeStyle = theme.line;
    ctx.lineWidth = 1;
    for (let g = -2; g <= 2; g++) {
      ctx.beginPath();
      let start = to(g, -2);
      let end = to(g, 2);
      ctx.moveTo(start[0], start[1]);
      ctx.lineTo(end[0], end[1]);
      start = to(-2, g);
      end = to(2, g);
      ctx.moveTo(start[0], start[1]);
      ctx.lineTo(end[0], end[1]);
      ctx.stroke();
    }
    // Basis vectors
    const e1 = to(1, 0);
    const e2 = to(0, 1);
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(e1[0], e1[1]);
    ctx.stroke();
    ctx.strokeStyle = theme.viz[1];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(e2[0], e2[1]);
    ctx.stroke();
    // House shape
    const house: [number, number][] = [
      [-0.5, -0.5], [0.5, -0.5], [0.5, 0.4], [0.15, 0.4], [0.15, 0.9], [-0.15, 0.9], [-0.15, 0.4], [-0.5, 0.4],
    ];
    ctx.strokeStyle = theme.fg;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    house.forEach(([x, y], index) => {
      const [px, py] = to(x, y);
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
    // Matrix readout
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillStyle = theme.fgSecondary;
    ctx.fillText(
      `M = [ ${m[0].toFixed(2)}  ${m[1].toFixed(2)} ]`,
      12,
      this.height - 34,
    );
    ctx.fillText(
      `    [ ${m[2].toFixed(2)}  ${m[3].toFixed(2)} ]`,
      12,
      this.height - 16,
    );
  }

  getMetrics() {
    const m = this.matrix();
    return {
      det: (m[0] * m[3] - m[1] * m[2]).toFixed(3),
      col1: `[${m[0].toFixed(2)}, ${m[2].toFixed(2)}]`,
      col2: `[${m[1].toFixed(2)}, ${m[3].toFixed(2)}]`,
    };
  }

  describe(): string {
    const m = this.matrix();
    return `The composed matrix has determinant ${(m[0] * m[3] - m[1] * m[2]).toFixed(2)}: areas scale by that factor, negative meaning orientation flips.`;
  }

  entities(): number {
    return 1;
  }
}
