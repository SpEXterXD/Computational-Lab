import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";

const CAPACITY = 200;

/**
 * K-nearest-neighbor classification with the boundary rendered by majority
 * vote on a grid. No training at all - the dataset IS the model, which is
 * exactly why adding one point bends the boundary immediately.
 */
export class KnnExperiment extends BaseExperiment {
  readonly id = "k-nn";

  private xs = new Float32Array(CAPACITY);
  private ys = new Float32Array(CAPACITY);
  private labels = new Float32Array(CAPACITY);
  private count = 0;
  private field = new Uint8Array(96 * 48);
  private fieldK = -1;
  private pointer = { x: 0, y: 0, down: false, inside: false };
  private lastCell = { x: -1, y: -1 };

  protected params(): ParameterDef[] {
    return [
      { key: "k", label: "Neighbors k", min: 1, max: 15, step: 2, defaultValue: 3 },
      {
        key: "tool",
        label: "Pointer tool",
        options: [
          { value: "classA", label: "Add class A (+)" },
          { value: "classB", label: "Add class B (-)" },
          { value: "erase", label: "Erase nearest" },
        ],
        defaultValue: "classA",
      },
    ];
  }

  protected onReset(): void {
    this.count = 0;
    // Two noisy spirals-in-a-blob mix: clearly non-linear boundary potential.
    const blobs = [
      { cx: 0.25, cy: 0.7, label: 1, n: 26 },
      { cx: 0.45, cy: 0.3, label: 1, n: 14 },
      { cx: 0.72, cy: 0.62, label: -1, n: 26 },
      { cx: 0.52, cy: 0.85, label: -1, n: 14 },
    ];
    for (const blob of blobs) {
      for (let i = 0; i < blob.n; i++) {
        this.add(blob.cx + (this.rng() - 0.5) * 0.3, blob.cy + (this.rng() - 0.5) * 0.3, blob.label, true);
      }
    }
    this.fieldK = -1;
  }

  private add(x: number, y: number, label: number, skipField = false): void {
    if (this.count >= CAPACITY) return;
    this.xs[this.count] = Math.min(1, Math.max(0, x));
    this.ys[this.count] = Math.min(1, Math.max(0, y));
    this.labels[this.count] = label;
    this.count += 1;
    if (!skipField) this.fieldK = -1;
  }

  protected onUpdate(): void {}

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  onPointer(state: PointerState): void {
    this.pointer = state;
    if (!state.inside || !state.down) {
      this.lastCell = { x: -1, y: -1 };
      return;
    }
    const x = state.x / Math.max(1, this.width);
    const y = state.y / Math.max(1, this.height);
    const cell = { x: Math.round(x * 50), y: Math.round(y * 50) };
    if (cell.x === this.lastCell.x && cell.y === this.lastCell.y) return;
    this.lastCell = cell;
    const tool = this.str("tool");
    if (tool === "erase") {
      let best = -1;
      let bestDist = 0.06;
      for (let i = 0; i < this.count; i++) {
        const d = Math.hypot(this.xs[i] - x, this.ys[i] - y);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      if (best >= 0) {
        this.count -= 1;
        this.xs[best] = this.xs[this.count];
        this.ys[best] = this.ys[this.count];
        this.labels[best] = this.labels[this.count];
        this.fieldK = -1;
      }
    } else {
      this.add(x, y, tool === "classA" ? 1 : -1);
    }
  }

  private vote(x: number, y: number, k: number): number {
    // Partial selection over the k smallest distances.
    const bestD = new Float64Array(k).fill(Infinity);
    const bestL = new Float32Array(k);
    for (let i = 0; i < this.count; i++) {
      const d = (this.xs[i] - x) ** 2 + (this.ys[i] - y) ** 2;
      let slot = k - 1;
      if (d >= bestD[slot]) continue;
      while (slot > 0 && bestD[slot - 1] > d) {
        bestD[slot] = bestD[slot - 1];
        bestL[slot] = bestL[slot - 1];
        slot -= 1;
      }
      bestD[slot] = d;
      bestL[slot] = this.labels[i];
    }
    let votes = 0;
    for (let s = 0; s < k; s++) votes += bestL[s];
    return votes >= 0 ? 1 : -1;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const k = this.num("k");
    const fieldH = 48;
    if (this.fieldK !== k || this.fieldK === -1) {
      for (let gy = 0; gy < fieldH; gy++) {
        for (let gx = 0; gx < 96; gx++) {
          this.field[gy * 96 + gx] =
            this.vote((gx + 0.5) / 96, (gy + 0.5) / fieldH, k) > 0 ? 1 : 0;
        }
      }
      this.fieldK = k;
    }
    // Regions
    const cw = this.width / 96;
    const ch = this.height / fieldH;
    for (let gy = 0; gy < fieldH; gy++) {
      for (let gx = 0; gx < 96; gx++) {
        ctx.fillStyle = this.field[gy * 96 + gx] > 0 ? theme.accent : theme.viz[1];
        ctx.globalAlpha = 0.08;
        ctx.fillRect(gx * cw, gy * ch, cw + 0.5, ch + 0.5);
      }
    }
    ctx.globalAlpha = 1;
    // Points
    for (let i = 0; i < this.count; i++) {
      ctx.fillStyle = this.labels[i] > 0 ? theme.accent : theme.viz[1];
      ctx.beginPath();
      ctx.arc(this.xs[i] * this.width, this.ys[i] * this.height, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  getMetrics() {
    let trainingCorrect = 0;
    for (let i = 0; i < this.count; i++) {
      // Leave-one-out style: skip the point itself by checking k+1 neighbors.
      const k = Math.min(this.num("k") + 1, this.count);
      const bestD = new Float64Array(k).fill(Infinity);
      const bestL = new Float32Array(k);
      for (let j = 0; j < this.count; j++) {
        if (j === i) continue;
        const d = (this.xs[j] - this.xs[i]) ** 2 + (this.ys[j] - this.ys[i]) ** 2;
        let slot = k - 1;
        if (d >= bestD[slot]) continue;
        while (slot > 0 && bestD[slot - 1] > d) {
          bestD[slot] = bestD[slot - 1];
          bestL[slot] = bestL[slot - 1];
          slot -= 1;
        }
        bestD[slot] = d;
        bestL[slot] = this.labels[j];
      }
      let votes = 0;
      for (let s = 0; s < k - 1; s++) votes += bestL[s];
      if ((votes >= 0 ? 1 : -1) === this.labels[i]) trainingCorrect += 1;
    }
    return {
      points: this.count,
      k: this.num("k"),
      looAccuracy: this.count > 0 ? `${((trainingCorrect / this.count) * 100).toFixed(1)} %` : "n/a",
      model: "the dataset itself",
    };
  }

  describe(): string {
    return `${this.count} labeled points classified by their ${this.num("k")} nearest neighbors - the boundary is recomputed from the data itself, so every added point bends it.`;
  }

  entities(): number {
    return this.count;
  }
}
