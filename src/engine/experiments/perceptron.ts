import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";

/**
 * The Rosenblatt perceptron (1958): one weight update per misclassified
 * point, guaranteed to converge on separable data. The boundary line walks
 * to a solution in full view; the update counter is the epoch history.
 */
export class PerceptronExperiment extends BaseExperiment {
  readonly id = "perceptron";

  private xs = new Float32Array(0);
  private ys = new Float32Array(0);
  private labels = new Float32Array(0);
  private count = 0;
  private w1 = 0;
  private w2 = 0;
  private bias = 0;
  private epochs = 0;
  private updates = 0;
  private updatesThisEpoch = 0;
  private lastEpochUpdates = 0;
  private accuracy = 0;
  private converged = false;
  private pointer = { x: 0, y: 0, down: false, inside: false };
  private lastCell = { x: -1, y: -1 };

  protected params(): ParameterDef[] {
    return [
      { key: "rate", label: "Learning rate", min: 0.01, max: 0.5, step: 0.01, defaultValue: 0.1 },
      {
        key: "tool",
        label: "Pointer tool",
        options: [
          { value: "classA", label: "Add class A (+)" },
          { value: "classB", label: "Add class B (-)" },
        ],
        defaultValue: "classA",
      },
    ];
  }

  protected onReset(): void {
    this.count = 0;
    this.xs = new Float32Array(200);
    this.ys = new Float32Array(200);
    this.labels = new Float32Array(200);
    // A linearly separable dataset with a noisy margin.
    for (let i = 0; i < 30; i++) {
      const x = 0.15 + this.rng() * 0.35;
      const y = 0.75 - x * 0.4 + (this.rng() - 0.5) * 0.18 + 0.1;
      this.push(x, Math.min(1, y), 1);
    }
    for (let i = 0; i < 30; i++) {
      const x = 0.5 + this.rng() * 0.35;
      const y = 0.25 - x * 0.4 + (this.rng() - 0.5) * 0.18 + 0.45;
      this.push(x, Math.max(0, y), -1);
    }
    this.w1 = this.rng() - 0.5;
    this.w2 = this.rng() - 0.5;
    this.bias = this.rng() - 0.5;
    this.epochs = 0;
    this.updates = 0;
    this.updatesThisEpoch = 0;
    this.lastEpochUpdates = 0;
    this.converged = false;
    this.measure();
  }

  private push(x: number, y: number, label: number): void {
    if (this.count >= this.xs.length) return;
    this.xs[this.count] = Math.min(1, Math.max(0, x));
    this.ys[this.count] = Math.min(1, Math.max(0, y));
    this.labels[this.count] = label;
    this.count += 1;
  }

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
    const y = 1 - state.y / Math.max(1, this.height);
    const cell = { x: Math.round(x * 50), y: Math.round(y * 50) };
    if (cell.x === this.lastCell.x && cell.y === this.lastCell.y) return;
    this.lastCell = cell;
    this.push(x, y, this.str("tool") === "classA" ? 1 : -1);
    this.converged = false;
  }

  private output(i: number): number {
    return this.w1 * this.xs[i] + this.w2 * this.ys[i] + this.bias >= 0 ? 1 : -1;
  }

  protected onUpdate(): void {
    if (this.count === 0) return;
    const rate = this.num("rate");
    // One epoch: a seeded-shuffle pass, updating on every mistake.
    const order = Array.from({ length: this.count }, (_, i) => i);
    for (let i = this.count - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    this.updatesThisEpoch = 0;
    for (const i of order) {
      const prediction = this.output(i);
      if (prediction !== this.labels[i]) {
        this.w1 += rate * this.labels[i] * this.xs[i];
        this.w2 += rate * this.labels[i] * this.ys[i];
        this.bias += rate * this.labels[i];
        this.updates += 1;
        this.updatesThisEpoch += 1;
      }
    }
    this.epochs += 1;
    if (this.updatesThisEpoch === 0 && !this.converged) {
      this.converged = true;
    }
    this.measure();
  }

  private measure(): void {
    let correct = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.output(i) === this.labels[i]) correct += 1;
    }
    this.accuracy = this.count > 0 ? correct / this.count : 0;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    // Decision regions: sign(w1 x + w2 y + b) with y up.
    const region = (sign: number) => {
      ctx.fillStyle = sign > 0 ? theme.accent : theme.viz[1];
      ctx.globalAlpha = 0.1;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
    };
    void region;
    // Boundary line w1 x + w2 y + b = 0 with y up.
    if (Math.abs(this.w2) > 1e-9) {
      const yAt = (x: number) => -(this.w1 * x + this.bias) / this.w2;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, this.height - yAt(0) * this.height);
      ctx.lineTo(this.width, this.height - yAt(1) * this.height);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    for (let i = 0; i < this.count; i++) {
      const misclassified = this.output(i) !== this.labels[i];
      ctx.fillStyle = this.labels[i] > 0 ? theme.accent : theme.viz[1];
      ctx.beginPath();
      ctx.arc(this.xs[i] * this.width, this.height - this.ys[i] * this.height, 3.4, 0, Math.PI * 2);
      ctx.fill();
      if (misclassified) {
        ctx.strokeStyle = theme.fg;
        ctx.beginPath();
        ctx.arc(this.xs[i] * this.width, this.height - this.ys[i] * this.height, 5.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  getMetrics() {
    return {
      epochs: this.epochs,
      updates: this.updates,
      lastEpochUpdates: this.lastEpochUpdates,
      accuracy: `${(this.accuracy * 100).toFixed(1)} %`,
      status: this.converged ? "Converged" : "Learning",
    };
  }

  describe(): string {
    return `A perceptron at epoch ${this.epochs}: ${(this.accuracy * 100).toFixed(0)}% accuracy, ${this.updates} weight updates so far${this.converged ? ", converged - zero updates last epoch" : ""}.`;
  }

  entities(): number {
    return this.count;
  }
}
