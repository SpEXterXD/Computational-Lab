import { BaseExperiment } from "../core/base-experiment";
import { sampleInto } from "../render/colormaps";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";
import { divergingFor } from "../render/diverging-cache";

interface Charge {
  x: number;
  y: number;
  q: number; // +1 / -1
}

/**
 * Electrostatics as a Poisson problem: 4V - sum(neighbors) = rho on a grid
 * with the box walls grounded (V = 0). Charges stamp rho; successive
 * over-relaxation (Gauss-Seidel + momentum) solves the same linear system
 * the Conjugate Gradient experiment races on, a few sweeps per tick so the
 * field is seen propagating, and the residual is reported, not hidden.
 */
export class ElectrostaticPotentialExperiment extends BaseExperiment {
  readonly id = "electrostatic-potential";

  private n = 80;
  private drawSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  private v = new Float32Array(0);
  private rho = new Float32Array(0);
  private image: ImageData | null = null;
  private scratch: HTMLCanvasElement | null = null;
  private charges: Charge[] = [];
  private sweeps = 0;
  private residual = Infinity;
  private pointer = { x: 0, y: 0, down: false, inside: false };
  private lastCell = { x: -1, y: -1 };

  protected params(): ParameterDef[] {
    return [
      {
        key: "tool",
        label: "Pointer tool",
        options: [
          { value: "positive", label: "Place + charge" },
          { value: "negative", label: "Place - charge" },
          { value: "erase", label: "Erase nearest" },
        ],
        defaultValue: "positive",
      },
      {
        key: "resolution",
        label: "Grid",
        options: [
          { value: "64", label: "64 × 64" },
          { value: "96", label: "96 × 96" },
        ],
        defaultValue: "80",
      },
      { key: "omega", label: "SOR relaxation w", min: 1.2, max: 1.9, step: 0.05, defaultValue: 1.75 },
    ];
  }

  protected onReset(): void {
    this.n = Number(this.str("resolution"));
    const cell = Math.min(this.width, this.height) / this.n;
    this.drawSize = cell * this.n;
    this.offsetX = Math.floor((this.width - this.drawSize) / 2);
    this.offsetY = Math.floor((this.height - this.drawSize) / 2);
    this.v = new Float32Array(this.n * this.n);
    this.rho = new Float32Array(this.n * this.n);
    // Default scene: a dipole, so the first frame already teaches something.
    this.charges = [
      { x: 0.35, y: 0.5, q: 1 },
      { x: 0.65, y: 0.5, q: -1 },
    ];
    this.sweeps = 0;
    this.residual = Infinity;
    this.stampRho();
  }

  protected onParameterChange(key: string): void {
    if (key === "resolution") this.reset();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.reset();
  }

  private stampRho(): void {
    this.rho.fill(0);
    for (const charge of this.charges) {
      const cx = charge.x * this.n;
      const cy = charge.y * this.n;
      const radius = Math.max(1.5, this.n / 32);
      for (let y = Math.max(1, Math.floor(cy - 2 * radius)); y < Math.min(this.n - 1, Math.ceil(cy + 2 * radius)); y++) {
        for (let x = Math.max(1, Math.floor(cx - 2 * radius)); x < Math.min(this.n - 1, Math.ceil(cx + 2 * radius)); x++) {
          const d = Math.hypot(x - cx, y - cy);
          if (d <= 2 * radius) {
            this.rho[y * this.n + x] += (charge.q * 8) * Math.exp(-(d * d) / (radius * radius));
          }
        }
      }
    }
    this.sweeps = 0;
    this.residual = Infinity;
  }

  onPointer(state: PointerState): void {
    this.pointer = state;
    if (!state.inside || !state.down) {
      this.lastCell = { x: -1, y: -1 };
      return;
    }
    const gx = ((state.x - this.offsetX) / this.drawSize) * this.n;
    const gy = ((state.y - this.offsetY) / this.drawSize) * this.n;
    const cell = { x: Math.round(gx), y: Math.round(gy) };
    if (cell.x === this.lastCell.x && cell.y === this.lastCell.y) return;
    this.lastCell = cell;
    const tool = this.str("tool");
    if (tool === "erase") {
      let best = -1;
      let bestDist = 0.08;
      for (let i = 0; i < this.charges.length; i++) {
        const d = Math.hypot(this.charges[i].x - gx / this.n, this.charges[i].y - gy / this.n);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      if (best >= 0) this.charges.splice(best, 1);
    } else if (cell.x > 0 && cell.y > 0 && cell.x < this.n - 1 && cell.y < this.n - 1) {
      this.charges.push({ x: gx / this.n, y: gy / this.n, q: tool === "positive" ? 1 : -1 });
      if (this.charges.length > 40) this.charges.shift();
    }
    this.stampRho();
  }

  protected onUpdate(): void {
    const n = this.n;
    const v = this.v;
    const omega = this.num("omega");
    let maxDelta = 0;
    const sweepsPerTick = 8;
    // Red-black SOR keeps the update in place without a second buffer.
    for (let sweep = 0; sweep < sweepsPerTick; sweep++) {
      if (this.residual < 1e-5 * Math.max(1, this.totalAbsRho() / (n * n))) break;
      maxDelta = 0;
      for (let color = 0; color < 2; color++) {
        for (let y = 1; y < n - 1; y++) {
          for (let x = 1 + ((y + color) % 2); x < n - 1; x += 2) {
            const i = y * n + x;
            const sigma = v[i - 1] + v[i + 1] + v[i - n] + v[i + n];
            const update = (omega * (this.rho[i] + sigma - 4 * v[i])) / 4;
            v[i] += update;
            maxDelta = Math.max(maxDelta, Math.abs(update));
          }
        }
      }
      this.sweeps += 1;
      this.residual = maxDelta;
    }
  }

  private totalAbsRho(): number {
    let sum = 0;
    for (let i = 0; i < this.rho.length; i++) sum += Math.abs(this.rho[i]);
    return sum;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    if (!this.image || this.image.width !== this.n) {
      this.image = new ImageData(this.n, this.n);
      this.scratch = null;
    }
    const diverging = divergingFor(theme);
    // Quantized into 16 levels: the band edges are the equipotential contours.
    let maxAbs = 1e-6;
    for (let i = 0; i < this.v.length; i++) maxAbs = Math.max(maxAbs, Math.abs(this.v[i]));
    const data = this.image.data;
    for (let i = 0; i < this.v.length; i++) {
      const normalized = this.v[i] / maxAbs;
      const banded = Math.round(normalized * 8) / 8;
      sampleInto(diverging, Math.min(1, Math.max(0, 0.5 + banded * 0.5)), data, i * 4);
    }
    if (!this.scratch) {
      this.scratch = document.createElement("canvas");
      this.scratch.width = this.n;
      this.scratch.height = this.n;
    }
    const offCtx = this.scratch.getContext("2d")!;
    offCtx.putImageData(this.image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.scratch, this.offsetX, this.offsetY, this.drawSize, this.drawSize);
    // Charges
    for (const charge of this.charges) {
      const px = this.offsetX + charge.x * this.drawSize;
      const py = this.offsetY + charge.y * this.drawSize;
      ctx.fillStyle = charge.q > 0 ? theme.accent : theme.viz[1];
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = theme.bg;
      ctx.font = "bold 9px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(charge.q > 0 ? "+" : "\u2212", px, py + 0.5);
    }
  }

  getMetrics() {
    return {
      charges: this.charges.length,
      netQ: this.charges.reduce((sum, c) => sum + c.q, 0),
      sweeps: this.sweeps.toLocaleString("en-US"),
      residual: this.residual === Infinity ? "n/a" : this.residual.toExponential(2),
      status: this.residual < 1e-5 ? "Converged" : "Solving",
    };
  }

  describe(): string {
    const net = this.charges.reduce((sum, c) => sum + c.q, 0);
    return `${this.charges.length} charges (net ${net >= 0 ? "+" : ""}${net}) on a grounded box; potential solved with ${this.sweeps.toLocaleString("en-US")} SOR sweeps, residual ${this.residual === Infinity ? "n/a" : this.residual.toExponential(1)}.`;
  }

  entities(): number {
    return this.n * this.n;
  }
}
