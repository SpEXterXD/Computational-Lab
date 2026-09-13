import { BaseExperiment } from "../core/base-experiment";
import type { ColorLUT } from "../render/colormaps";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";
import { divergingFor } from "../render/diverging-cache";

const CAPACITY = 220;
const FIELD_W = 96;

/**
 * Max-margin classification trained online with kernelized Pegasos
 * (subgradient descent on the hinge loss). Linear and RBF kernels share the
 * exact same trainer - only the inner product changes - and the margin-active
 * points (|y f(x)| < 1) are the honest stand-in for support vectors under a
 * subgradient method.
 */
export class SvmExperiment extends BaseExperiment {
  readonly id = "support-vector-machine";

  private xs = new Float32Array(CAPACITY);
  private ys = new Float32Array(CAPACITY);
  private labels = new Float32Array(CAPACITY);
  private alphas = new Float64Array(CAPACITY);
  private count = 0;
  private rounds = 0;
  private field = new Float32Array(FIELD_W * Math.floor(FIELD_W / 2));
  private fieldValid = false;
  private fieldTick = 0;
  private accuracy = 0;
  private marginActive = 0;
  private pointer = { x: 0, y: 0, down: false, inside: false };
  private lastCell = { x: -1, y: -1 };
  private image: ImageData | null = null;
  private scratch: HTMLCanvasElement | null = null;

  protected params(): ParameterDef[] {
    return [
      {
        key: "kernel",
        label: "Kernel",
        options: [
          { value: "linear", label: "Linear" },
          { value: "rbf", label: "RBF (Gaussian)" },
        ],
        defaultValue: "linear",
      },
      { key: "gamma", label: "RBF gamma", min: 1, max: 30, step: 0.5, defaultValue: 8 },
      { key: "lambda", label: "Regularization lambda", min: 0.001, max: 0.1, step: 0.001, defaultValue: 0.01 },
      { key: "epochs", label: "Epochs per tick", min: 1, max: 10, step: 1, defaultValue: 2 },
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
    this.rounds = 0;
    this.alphas.fill(0);
    // Two seeded, slightly overlapping blobs.
    const blobs = [
      { cx: 0.32, cy: 0.36, label: 1 },
      { cx: 0.68, cy: 0.64, label: -1 },
    ];
    for (const blob of blobs) {
      for (let i = 0; i < 26; i++) {
        this.addPoint(blob.cx + (this.rng() - 0.5) * 0.3, blob.cy + (this.rng() - 0.5) * 0.3, blob.label);
      }
    }
    this.fieldValid = false;
  }

  private addPoint(x: number, y: number, label: number): void {
    if (this.count >= CAPACITY) return;
    this.xs[this.count] = Math.min(1, Math.max(0, x));
    this.ys[this.count] = Math.min(1, Math.max(0, y));
    this.labels[this.count] = label;
    this.alphas[this.count] = 0;
    this.count += 1;
    this.fieldValid = false;
  }

  protected onParameterChange(key: string): void {
    // Kernel and lambda change the geometry: reset the dual, keep the data.
    if (key === "kernel" || key === "lambda" || key === "gamma") {
      this.alphas.fill(0);
      this.rounds = 0;
      this.fieldValid = false;
    } else if (key !== "epochs" && key !== "tool") {
      this.reset();
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.fieldValid = false;
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
        // Swap-remove keeps arrays dense; order does not affect the dual.
        this.count -= 1;
        this.xs[best] = this.xs[this.count];
        this.ys[best] = this.ys[this.count];
        this.labels[best] = this.labels[this.count];
        this.alphas[best] = this.alphas[this.count];
        this.fieldValid = false;
      }
    } else {
      this.addPoint(x, y, tool === "classA" ? 1 : -1);
    }
  }

  private kernel(i: number, j: number): number {
    if (this.str("kernel") === "linear") {
      return this.xs[i] * this.xs[j] + this.ys[i] * this.ys[j] + 1;
    }
    const dx = this.xs[i] - this.xs[j];
    const dy = this.ys[i] - this.ys[j];
    return Math.exp(-this.num("gamma") * (dx * dx + dy * dy)) + 1;
  }

  private decision(i: number): number {
    let sum = 0;
    for (let j = 0; j < this.count; j++) {
      if (this.alphas[j] === 0) continue;
      sum += this.alphas[j] * this.labels[j] * this.kernel(i, j);
    }
    return sum;
  }

  private decisionAt(x: number, y: number): number {
    let sum = 0;
    for (let j = 0; j < this.count; j++) {
      if (this.alphas[j] === 0) continue;
      const dx = x - this.xs[j];
      const dy = y - this.ys[j];
      const k =
        this.str("kernel") === "linear"
          ? this.xs[j] * x + this.ys[j] * y + 1
          : Math.exp(-this.num("gamma") * (dx * dx + dy * dy)) + 1;
      sum += this.alphas[j] * this.labels[j] * k;
    }
    return sum;
  }

  protected onUpdate(): void {
    if (this.count < 2) return;
    const lambda = Math.max(1e-4, this.num("lambda"));
    const epochs = this.num("epochs");
    for (let epoch = 0; epoch < epochs; epoch++) {
      this.rounds += 1;
      const eta = 1 / (lambda * this.rounds);
      // Seeded shuffle: deterministic epochs.
      const order = Array.from({ length: this.count }, (_, i) => i);
      for (let i = this.count - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      for (const i of order) {
        const margin = this.labels[i] * this.decision(i);
        if (margin < 1) {
          this.alphas[i] += eta;
        }
        // Pegasos projection keeps the dual bounded.
        const scale = Math.min(1, 1 / Math.sqrt(lambda * this.rounds * this.alphas[i] ** 2 || 1));
        if (scale < 1) {
          for (let j = 0; j < this.count; j++) this.alphas[j] *= scale;
        }
      }
    }
    this.fieldTick += 1;
    if (!this.fieldValid || this.fieldTick % 12 === 0) this.evaluate();
  }

  private evaluate(): void {
    const fieldH = Math.floor(FIELD_W / 2);
    let correct = 0;
    let marginActive = 0;
    for (let i = 0; i < this.count; i++) {
      const prediction = this.decision(i) >= 0 ? 1 : -1;
      if (prediction === this.labels[i]) correct += 1;
      if (Math.abs(this.labels[i] * this.decision(i)) < 1) marginActive += 1;
    }
    this.accuracy = this.count > 0 ? correct / this.count : 0;
    this.marginActive = marginActive;
    for (let gy = 0; gy < fieldH; gy++) {
      for (let gx = 0; gx < FIELD_W; gx++) {
        this.field[gy * FIELD_W + gx] = this.decisionAt(gx / FIELD_W, gy / fieldH);
      }
    }
    this.fieldValid = true;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const diverging = divergingFor(theme);
    const fieldH = Math.floor(FIELD_W / 2);
    // Decision field, softly
    if (this.fieldValid) {
      let maxAbs = 1e-6;
      for (let i = 0; i < this.field.length; i++) maxAbs = Math.max(maxAbs, Math.abs(this.field[i]));
      const cellW = this.width / FIELD_W;
      const cellH = this.height / fieldH;
      for (let gy = 0; gy < fieldH; gy++) {
        for (let gx = 0; gx < FIELD_W; gx++) {
          const value = this.field[gy * FIELD_W + gx] / maxAbs;
          const banded = Math.round(value * 8) / 8;
          if (Math.abs(value) < 0.02) continue; // boundary band stays background
          ctx.fillStyle = this.divergingCss(diverging, 0.5 + banded * 0.45);
          ctx.fillRect(gx * cellW, gy * cellH, cellW + 0.5, cellH + 0.5);
        }
      }
    }
    // Points: class A accent, class B sky; margin-active get a ring.
    // (The banded field above is the decision boundary; with the implicit
    // +1 bias absorbed into the kernel, an explicit line would be noise.)
    for (let i = 0; i < this.count; i++) {
      const px = this.xs[i] * this.width;
      const py = this.ys[i] * this.height;
      ctx.fillStyle = this.labels[i] > 0 ? theme.accent : theme.viz[1];
      ctx.beginPath();
      ctx.arc(px, py, 3.4, 0, Math.PI * 2);
      ctx.fill();
      if (this.fieldValid && Math.abs(this.labels[i] * this.decision(i)) < 1) {
        ctx.strokeStyle = theme.fg;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  private divergingCache: Record<string, string> = {};
  private divergingCss(lut: ColorLUT, t: number): string {
    const key = t.toFixed(3);
    if (this.divergingCache[key]) return this.divergingCache[key];
    const index = Math.min(255, Math.max(0, Math.round(t * 255)));
    const css = `rgb(${lut.r[index]}, ${lut.g[index]}, ${lut.b[index]})`;
    this.divergingCache[key] = css;
    return css;
  }

  getMetrics() {
    return {
      points: this.count,
      epochs: this.rounds,
      accuracy: `${(this.accuracy * 100).toFixed(1)} %`,
      marginActive: this.marginActive,
      kernel: this.str("kernel") === "linear" ? "Linear" : "RBF",
    };
  }

  describe(): string {
    return `${this.count} labeled points, ${(this.accuracy * 100).toFixed(0)}% training accuracy after ${this.rounds} Pegasos epochs with the ${this.str("kernel")} kernel; ringed points sit on or inside the margin.`;
  }

  entities(): number {
    return this.count;
  }
}
