import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

/**
 * Marching squares over a field of moving metaballs: the classic 16-case
 * table turns the implicit surface f(x, y) = threshold into line segments.
 * The contour you see is computed in the tick, not drawn by hand.
 */
export class MarchingSquaresExperiment extends BaseExperiment {
  readonly id = "marching-squares";

  private blobs = [
    { cx: 0.3, cy: 0.3, vx: 34, vy: 26 },
    { cx: 0.7, cy: 0.6, vx: -28, vy: 31 },
    { cx: 0.45, cy: 0.75, vx: 22, vy: -33 },
  ];
  private threshold = 1;
  private segments = 0;
  private segmentList: number[] = [];

  protected params(): ParameterDef[] {
    return [
      { key: "threshold", label: "Iso value", min: 0.5, max: 2.2, step: 0.05, defaultValue: 1 },
      { key: "speed", label: "Blob speed", min: 0, max: 3, step: 0.1, defaultValue: 1 },
      { key: "grid", label: "Sample grid", min: 40, max: 110, step: 5, defaultValue: 70 },
    ];
  }

  protected onReset(): void {
    this.threshold = this.num("threshold");
  }

  protected onParameterChange(key: string): void {
    if (key === "threshold") this.threshold = this.num("threshold");
    void key;
  }

  private field(gx: number, gy: number, cols: number, rows: number): number {
    let sum = 0;
    for (const blob of this.blobs) {
      const bx = blob.cx * cols;
      const by = blob.cy * rows;
      const d2 = ((gx - bx) / (cols / 3)) ** 2 + ((gy - by) / (rows / 3)) ** 2;
      sum += 1 / (d2 + 0.05);
    }
    return sum;
  }

  private computeSegments(): void {
    const cols = this.num("grid");
    const rows = this.num("grid");
    const cw = this.width / cols;
    const ch = this.height / rows;
    this.segmentList = [];
    this.segments = 0;
    const interp = (f1: number, f2: number) => (this.threshold - f1) / (f2 - f1 || 1e-9);
    for (let gy = 0; gy < rows - 1; gy++) {
      for (let gx = 0; gx < cols - 1; gx++) {
        const f00 = this.field(gx, gy, cols, rows);
        const f10 = this.field(gx + 1, gy, cols, rows);
        const f01 = this.field(gx, gy + 1, cols, rows);
        const f11 = this.field(gx + 1, gy + 1, cols, rows);
        let code = 0;
        if (f00 > this.threshold) code |= 8;
        if (f10 > this.threshold) code |= 4;
        if (f11 > this.threshold) code |= 2;
        if (f01 > this.threshold) code |= 1;
        if (code === 0 || code === 15) continue;
        const topX = (gx + interp(f00, f10)) * cw;
        const bottomX = (gx + interp(f01, f11)) * cw;
        const leftY = (gy + interp(f00, f01)) * ch;
        const rightY = (gy + interp(f10, f11)) * ch;
        const midX = (gx + 0.5) * cw;
        const midY = (gy + 0.5) * ch;
        const seg = (x1: number, y1: number, x2: number, y2: number) => {
          this.segmentList.push(x1, y1, x2, y2);
          this.segments += 1;
        };
        const leftX = gx * cw;
        switch (code) {
          case 1: seg(leftX, leftY, bottomX, (gy + 1) * ch); break;
          case 2: seg(bottomX, (gy + 1) * ch, (gx + 1) * cw, rightY); break;
          case 3: seg(leftX, leftY, (gx + 1) * cw, rightY); break;
          case 4: seg(topX, gy * ch, (gx + 1) * cw, rightY); break;
          case 5: {
            const centerHigh = (f00 + f10 + f01 + f11) / 4 > this.threshold;
            if (centerHigh) {
              seg(leftX, leftY, midX, midY);
              seg(midX, midY, topX, gy * ch);
              seg((gx + 1) * cw, rightY, midX, midY);
              seg(midX, midY, bottomX, (gy + 1) * ch);
            } else {
              seg(leftX, leftY, midX, midY);
              seg(midX, midY, bottomX, (gy + 1) * ch);
              seg((gx + 1) * cw, rightY, midX, midY);
              seg(midX, midY, topX, gy * ch);
            }
            break;
          }
          case 6: seg(topX, gy * ch, bottomX, (gy + 1) * ch); break;
          case 7: seg(leftX, leftY, topX, gy * ch); break;
          case 8: seg(leftX, leftY, topX, gy * ch); break;
          case 9: seg(topX, gy * ch, bottomX, (gy + 1) * ch); break;
          case 10: {
            const centerHigh = (f00 + f10 + f01 + f11) / 4 > this.threshold;
            if (centerHigh) {
              seg(topX, gy * ch, midX, midY);
              seg(midX, midY, (gx + 1) * cw, rightY);
              seg(bottomX, (gy + 1) * ch, midX, midY);
              seg(midX, midY, leftX, leftY);
            } else {
              seg(topX, gy * ch, midX, midY);
              seg(midX, midY, leftX, leftY);
              seg(bottomX, (gy + 1) * ch, midX, midY);
              seg(midX, midY, (gx + 1) * cw, rightY);
            }
            break;
          }
          case 11: seg(topX, gy * ch, (gx + 1) * cw, rightY); break;
          case 12: seg(leftX, leftY, (gx + 1) * cw, rightY); break;
          case 13: seg(bottomX, (gy + 1) * ch, (gx + 1) * cw, rightY); break;
          case 14: seg(leftX, leftY, bottomX, (gy + 1) * ch); break;
        }
      }
    }
  }

  protected onUpdate(dt: number): void {
    this.threshold = this.num("threshold");
    const speed = this.num("speed");
    for (const blob of this.blobs) {
      blob.cx += (blob.vx * dt * speed) / 100;
      blob.cy += (blob.vy * dt * speed) / 100;
      if (blob.cx < 0.12 || blob.cx > 0.88) blob.vx *= -1;
      if (blob.cy < 0.12 || blob.cy > 0.88) blob.vy *= -1;
      blob.cx = Math.min(0.88, Math.max(0.12, blob.cx));
      blob.cy = Math.min(0.88, Math.max(0.12, blob.cy));
    }
    this.computeSegments();
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const cols = this.num("grid");
    const rows = this.num("grid");
    const cw = this.width / cols;
    const ch = this.height / rows;
    // Faint above-threshold field
    ctx.fillStyle = theme.raised;
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        if (this.field(gx + 0.5, gy + 0.5, cols, rows) > this.threshold) {
          ctx.fillRect(gx * cw, gy * ch, cw, ch);
        }
      }
    }
    // Contours from the cached segment list
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < this.segmentList.length; i += 4) {
      ctx.moveTo(this.segmentList[i], this.segmentList[i + 1]);
      ctx.lineTo(this.segmentList[i + 2], this.segmentList[i + 3]);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = theme.fgTertiary;
    ctx.fillText(`${this.segments} contour segments`, 10, 16);
  }

  getMetrics() {
    return {
      isoValue: this.threshold.toFixed(2),
      segments: this.segments,
      blobs: this.blobs.length,
      grid: `${this.num("grid")}^2`,
    };
  }

  describe(): string {
    return `Marching squares extracting the iso-contour of three moving metaballs: ${this.segments} segments at iso value ${this.threshold.toFixed(2)}.`;
  }

  entities(): number {
    return this.num("grid") ** 2;
  }
}
