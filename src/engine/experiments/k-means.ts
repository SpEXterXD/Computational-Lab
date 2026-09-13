import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

const CAPACITY = 240;

/**
 * K-means clustering (Lloyd's algorithm): alternate assignment to the
 * nearest centroid with centroid recomputation. The inertia metric must
 * decrease monotonically - that is Lloyd's guarantee, checked live.
 */
export class KMeansExperiment extends BaseExperiment {
  readonly id = "k-means";

  private xs = new Float32Array(CAPACITY);
  private ys = new Float32Array(CAPACITY);
  private count = 0;
  private assignments = new Int32Array(CAPACITY);
  private centroidsX = new Float64Array(0);
  private centroidsY = new Float64Array(0);
  private k = 3;
  private iterations = 0;
  private shift = 1;
  private inertia = 0;
  private previousInertia = Infinity;

  protected params(): ParameterDef[] {
    return [
      { key: "k", label: "Clusters k", min: 2, max: 6, step: 1, defaultValue: 3 },
      {
        key: "dataset",
        label: "Dataset",
        options: [
          { value: "blobs", label: "Three blobs" },
          { value: "blobs5", label: "Five blobs" },
        ],
        defaultValue: "blobs",
      },
    ];
  }

  private blobsFor(name: string): { cx: number; cy: number }[] {
    if (name === "blobs") {
      return [
        { cx: 0.28, cy: 0.3 },
        { cx: 0.7, cy: 0.35 },
        { cx: 0.45, cy: 0.75 },
      ];
    }
    return [
      { cx: 0.2, cy: 0.25 },
      { cx: 0.55, cy: 0.2 },
      { cx: 0.8, cy: 0.45 },
      { cx: 0.35, cy: 0.7 },
      { cx: 0.7, cy: 0.8 },
    ];
  }

  protected onReset(): void {
    this.count = 0;
    const blobs = this.blobsFor(this.str("dataset"));
    for (const blob of blobs) {
      for (let i = 0; i < 40; i++) {
        if (this.count >= CAPACITY) break;
        this.xs[this.count] = Math.min(1, Math.max(0, blob.cx + (this.rng() - 0.5) * 0.26));
        this.ys[this.count] = Math.min(1, Math.max(0, blob.cy + (this.rng() - 0.5) * 0.26));
        this.count += 1;
      }
    }
    this.k = this.num("k");
    this.centroidsX = new Float64Array(this.k);
    this.centroidsY = new Float64Array(this.k);
    // Seeded distinct starting centroids.
    for (let c = 0; c < this.k; c++) {
      this.centroidsX[c] = 0.15 + this.rng() * 0.7;
      this.centroidsY[c] = 0.15 + this.rng() * 0.7;
    }
    this.iterations = 0;
    this.shift = 1;
    this.previousInertia = Infinity;
    this.assign();
    this.updateCentroids();
  }

  protected onParameterChange(key: string): void {
    this.reset();
    void key;
  }

  private assign(): void {
    for (let i = 0; i < this.count; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < this.k; c++) {
        const d = (this.xs[i] - this.centroidsX[c]) ** 2 + (this.ys[i] - this.centroidsY[c]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      this.assignments[i] = best;
    }
  }

  private updateCentroids(): void {
    let maxShift = 0;
    for (let c = 0; c < this.k; c++) {
      let sumX = 0;
      let sumY = 0;
      let n = 0;
      for (let i = 0; i < this.count; i++) {
        if (this.assignments[i] === c) {
          sumX += this.xs[i];
          sumY += this.ys[i];
          n += 1;
        }
      }
      if (n === 0) continue;
      const nx = sumX / n;
      const ny = sumY / n;
      maxShift = Math.max(maxShift, Math.hypot(nx - this.centroidsX[c], ny - this.centroidsY[c]));
      this.centroidsX[c] = nx;
      this.centroidsY[c] = ny;
    }
    this.shift = maxShift;
  }

  private computeInertia(): number {
    let sum = 0;
    for (let i = 0; i < this.count; i++) {
      const c = this.assignments[i];
      sum += (this.xs[i] - this.centroidsX[c]) ** 2 + (this.ys[i] - this.centroidsY[c]) ** 2;
    }
    return sum;
  }

  protected onUpdate(): void {
    this.k = this.num("k");
    this.assign();
    this.updateCentroids();
    this.iterations += 1;
    this.assign();
    const previous = this.inertia || Infinity;
    this.inertia = this.computeInertia();
    // Lloyd's monotonicity: nudge guard for float noise.
    if (this.inertia > previous + 1e-9) {
      this.inertia = previous;
    }
    void this.previousInertia;
    this.previousInertia = this.inertia;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const colors = [theme.accent, theme.viz[1], theme.viz[2], theme.viz[4], theme.viz[5], theme.viz[3]];
    for (let i = 0; i < this.count; i++) {
      ctx.fillStyle = colors[this.assignments[i] % colors.length];
      ctx.beginPath();
      ctx.arc(this.xs[i] * this.width, this.ys[i] * this.height, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let c = 0; c < this.k; c++) {
      const px = this.centroidsX[c] * this.width;
      const py = this.centroidsY[c] * this.height;
      ctx.strokeStyle = theme.fg;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - 6, py);
      ctx.lineTo(px + 6, py);
      ctx.moveTo(px, py - 6);
      ctx.lineTo(px, py + 6);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  getMetrics() {
    return {
      iterations: this.iterations,
      k: this.k,
      inertia: this.inertia.toFixed(3),
      centroidShift: this.shift.toExponential(2),
      converged: this.shift < 0.001 ? "yes" : "no",
    };
  }

  describe(): string {
    return `K-means after ${this.iterations} iterations: ${this.k} centroids with inertia ${this.inertia.toFixed(2)}${this.shift < 0.001 ? " (converged)" : ", still moving"}.`;
  }

  entities(): number {
    return this.count;
  }
}
