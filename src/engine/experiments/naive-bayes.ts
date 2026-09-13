import { BaseExperiment } from "../core/base-experiment";
import { sampleInto } from "../render/colormaps";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";
import { divergingFor } from "../render/diverging-cache";

const CAPACITY = 240;
const FIELD_W = 96;

/**
 * Gaussian Naive Bayes: per class, an axis-aligned Gaussian over the two
 * features; priors are the class frequencies. The posterior field P(A | x)
 * is recomputed from Bayes' rule every time the data changes - adding a
 * single labeled point moves the decision boundary on the next tick.
 */
export class NaiveBayesExperiment extends BaseExperiment {
  readonly id = "naive-bayes";

  private xs = new Float32Array(CAPACITY);
  private ys = new Float32Array(CAPACITY);
  private labels = new Float32Array(CAPACITY);
  private count = 0;
  private stats = {
    meanAx: 0.5, meanAy: 0.5, varAx: 1e-4, varAy: 1e-4,
    meanBx: 0.5, meanBy: 0.5, varBx: 1e-4, varBy: 1e-4,
    priorA: 0.5,
  };
  private accuracy = 0;
  private pointerPosterior = 0.5;
  private pointer = { x: 0, y: 0, down: false, inside: false };
  private lastCell = { x: -1, y: -1 };
  private image: ImageData | null = null;
  private scratch: HTMLCanvasElement | null = null;

  protected params(): ParameterDef[] {
    return [
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
    // Two seeded, clearly separated blobs to start from.
    for (let i = 0; i < 20; i++) {
      this.addPoint(0.3 + (this.rng() - 0.5) * 0.22, 0.35 + (this.rng() - 0.5) * 0.22, 1, true);
    }
    for (let i = 0; i < 20; i++) {
      this.addPoint(0.7 + (this.rng() - 0.5) * 0.22, 0.65 + (this.rng() - 0.5) * 0.22, -1, true);
    }
    this.updateModel();
  }

  private addPoint(x: number, y: number, label: number, skipUpdate = false): void {
    if (this.count >= CAPACITY) return;
    this.xs[this.count] = Math.min(1, Math.max(0, x));
    this.ys[this.count] = Math.min(1, Math.max(0, y));
    this.labels[this.count] = label;
    this.count += 1;
    if (!skipUpdate) this.updateModel();
  }

  /** Static field: recomputes on data and parameter changes. */
  protected onUpdate(): void {}

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  onPointer(state: PointerState): void {
    this.pointer = state;
    if (state.inside) {
      this.pointerPosterior = this.posteriorA(state.x / Math.max(1, this.width), state.y / Math.max(1, this.height));
    }
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
        this.updateModel();
      }
    } else {
      this.addPoint(x, y, tool === "classA" ? 1 : -1);
    }
  }

  /** Bayes' rule with axis-aligned Gaussian class-conditionals. */
  private posteriorA(x: number, y: number): number {
    const s = this.stats;
    const logA =
      Math.log(Math.max(1e-9, s.priorA)) -
      (0.5 * (x - s.meanAx) ** 2) / s.varAx -
      (0.5 * (y - s.meanAy) ** 2) / s.varAy -
      0.5 * Math.log(s.varAx * s.varAy);
    const logB =
      Math.log(Math.max(1e-9, 1 - s.priorA)) -
      (0.5 * (x - s.meanBx) ** 2) / s.varBx -
      (0.5 * (y - s.meanBy) ** 2) / s.varBy -
      0.5 * Math.log(s.varBx * s.varBy);
    // Softmax of the two log posteriors.
    const max = Math.max(logA, logB);
    const expA = Math.exp(logA - max);
    const expB = Math.exp(logB - max);
    return expA / (expA + expB);
  }

  private updateModel(): void {
    let ax = 0;
    let ay = 0;
    let bx = 0;
    let by = 0;
    let nA = 0;
    let nB = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.labels[i] > 0) {
        ax += this.xs[i];
        ay += this.ys[i];
        nA += 1;
      } else {
        bx += this.xs[i];
        by += this.ys[i];
        nB += 1;
      }
    }
    const varFloor = 1e-4;
    const stats = {
      meanAx: nA > 0 ? ax / nA : 0.5,
      meanAy: nA > 0 ? ay / nA : 0.5,
      meanBx: nB > 0 ? bx / nB : 0.5,
      meanBy: nB > 0 ? by / nB : 0.5,
      priorA: this.count > 0 ? nA / this.count : 0.5,
      varAx: varFloor,
      varAy: varFloor,
      varBx: varFloor,
      varBy: varFloor,
    };
    for (let i = 0; i < this.count; i++) {
      if (this.labels[i] > 0) {
        stats.varAx = Math.max(varFloor, stats.varAx + (this.xs[i] - stats.meanAx) ** 2 / Math.max(1, nA));
        stats.varAy = Math.max(varFloor, stats.varAy + (this.ys[i] - stats.meanAy) ** 2 / Math.max(1, nA));
      } else {
        stats.varBx = Math.max(varFloor, stats.varBx + (this.xs[i] - stats.meanBx) ** 2 / Math.max(1, nB));
        stats.varBy = Math.max(varFloor, stats.varBy + (this.ys[i] - stats.meanBy) ** 2 / Math.max(1, nB));
      }
    }
    this.stats = stats;
    // Training accuracy
    let correct = 0;
    for (let i = 0; i < this.count; i++) {
      const p = this.posteriorA(this.xs[i], this.ys[i]);
      const prediction = p >= 0.5 ? 1 : -1;
      if (prediction === this.labels[i]) correct += 1;
    }
    this.accuracy = this.count > 0 ? correct / this.count : 0;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const diverging = divergingFor(theme);
    const fieldH = Math.floor(FIELD_W / 2);
    if (!this.image || this.image.width !== FIELD_W) {
      this.image = new ImageData(FIELD_W, fieldH);
      this.scratch = document.createElement("canvas");
      this.scratch.width = FIELD_W;
      this.scratch.height = fieldH;
    }
    const data = this.image.data;
    for (let gy = 0; gy < fieldH; gy++) {
      for (let gx = 0; gx < FIELD_W; gx++) {
        const p = this.posteriorA((gx + 0.5) / FIELD_W, (gy + 0.5) / fieldH);
        const t = Math.min(1, Math.max(0, 0.5 + (p - 0.5) * 1.1));
        sampleInto(diverging, t, data, (gy * FIELD_W + gx) * 4, 140);
      }
    }
    this.scratch!.getContext("2d")!.putImageData(this.image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.scratch!, 0, 0, this.width, this.height);
    // 1-sigma ellipses per class
    const s = this.stats;
    const scale = Math.min(this.width, this.height);
    ctx.strokeStyle = theme.fgSecondary;
    ctx.lineWidth = 1;
    for (const cls of [
      { cx: s.meanAx, cy: s.meanAy, sx: Math.sqrt(s.varAx), sy: Math.sqrt(s.varAy) },
      { cx: s.meanBx, cy: s.meanBy, sx: Math.sqrt(s.varBx), sy: Math.sqrt(s.varBy) },
    ]) {
      ctx.beginPath();
      ctx.ellipse(cls.cx * this.width, cls.cy * this.height, cls.sx * scale, cls.sy * scale, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Points
    for (let i = 0; i < this.count; i++) {
      ctx.fillStyle = this.labels[i] > 0 ? theme.accent : theme.viz[1];
      ctx.beginPath();
      ctx.arc(this.xs[i] * this.width, this.ys[i] * this.height, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  getMetrics() {
    return {
      classA: this.count > 0 ? this.countClass(1) : 0,
      classB: this.count > 0 ? this.countClass(-1) : 0,
      priorA: `${(this.stats.priorA * 100).toFixed(0)} %`,
      accuracy: `${(this.accuracy * 100).toFixed(1)} %`,
      pointerPA: this.pointer.inside ? this.pointerPosterior.toFixed(3) : "n/a",
    };
  }

  private countClass(label: number): number {
    let sum = 0;
    for (let i = 0; i < this.count; i++) if (this.labels[i] === label) sum += 1;
    return sum;
  }

  describe(): string {
    return `Gaussian Naive Bayes trained on ${this.count} labeled points (${this.countClass(1)} class A, ${this.countClass(-1)} class B), ${(this.accuracy * 100).toFixed(0)}% training accuracy. Click to add points and watch the boundary move.`;
  }

  entities(): number {
    return this.count;
  }
}
