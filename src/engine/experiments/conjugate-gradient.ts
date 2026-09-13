import { BaseExperiment } from "../core/base-experiment";
import { sampleInto } from "../render/colormaps";
import type { ParameterDef, ThemeColors } from "../core/types";
import { divergingFor } from "../render/diverging-cache";

const N = 56;

/**
 * Three iterative solvers race on the SAME Poisson system as the
 * Electrostatic Potential experiment (A = 4I - adjacency, Dirichlet zeros):
 * Jacobi, Gauss-Seidel, and Conjugate Gradient. Residual norms are recorded
 * per iteration and plotted on a log axis - CG's advantage is a measurement,
 * not a slogan.
 */
export class ConjugateGradientExperiment extends BaseExperiment {
  readonly id = "conjugate-gradient";

  private b = new Float64Array(0);
  private xJacobi = new Float64Array(0);
  private xGauss = new Float64Array(0);
  private xCG = new Float64Array(0);
  private rCG = new Float64Array(0);
  private pCG = new Float64Array(0);
  private ap = new Float64Array(0);
  private xTmp = new Float64Array(0);
  private history: { jacobi: number; gauss: number; cg: number }[] = [];
  private iterations = 0;
  private residualJacobi = 1;
  private residualGauss = 1;
  private residualCG = 1;
  private normB = 1;
  private cgStarted = false;
  private rho = 0;
  private image: ImageData | null = null;
  private scratch: HTMLCanvasElement | null = null;

  protected params(): ParameterDef[] {
    return [
      { key: "iterations", label: "Iterations per tick", min: 1, max: 20, step: 1, defaultValue: 4 },
      {
        key: "tolerance",
        label: "Target rel. residual",
        options: [
          { value: "1e-4", label: "1e-4" },
          { value: "1e-8", label: "1e-8" },
          { value: "1e-12", label: "1e-12" },
        ],
        defaultValue: "1e-8",
      },
      {
        key: "preset",
        label: "Charge system",
        options: [
          { value: "dipole", label: "Dipole (same as #45)" },
          { value: "quad", label: "Quadrupole" },
          { value: "single", label: "Single charge" },
        ],
        defaultValue: "dipole",
      },
    ];
  }

  protected onReset(): void {
    const size = N * N;
    this.b = new Float64Array(size);
    this.xJacobi = new Float64Array(size);
    this.xGauss = new Float64Array(size);
    this.xCG = new Float64Array(size);
    this.rCG = new Float64Array(size);
    this.pCG = new Float64Array(size);
    this.ap = new Float64Array(size);
    this.xTmp = new Float64Array(size);
    this.history = [];
    this.iterations = 0;
    this.stampCharges();
    this.normB = this.norm(this.b);
    this.residualJacobi = this.normB;
    this.residualGauss = this.normB;
    this.residualCG = this.normB;
    this.cgStarted = false;
    this.rho = 0;
  }

  private stampCharges(): void {
    this.b.fill(0);
    const place = (fx: number, fy: number, q: number) => {
      const cx = Math.round(fx * N);
      const cy = Math.round(fy * N);
      const radius = 2.2;
      for (let y = Math.max(1, Math.floor(cy - 4)); y < Math.min(N - 1, Math.ceil(cy + 4)); y++) {
        for (let x = Math.max(1, Math.floor(cx - 4)); x < Math.min(N - 1, Math.ceil(cx + 4)); x++) {
          const d = Math.hypot(x - cx, y - cy);
          if (d <= 4) this.b[y * N + x] += q * 8 * Math.exp(-(d * d) / (radius * radius));
        }
      }
    };
    if (this.str("preset") === "dipole") {
      place(0.3, 0.5, 1);
      place(0.7, 0.5, -1);
    } else if (this.str("preset") === "quad") {
      place(0.3, 0.3, 1);
      place(0.7, 0.3, -1);
      place(0.7, 0.7, 1);
      place(0.3, 0.7, -1);
    } else {
      place(0.5, 0.5, 1);
    }
  }

  protected onParameterChange(key: string): void {
    this.reset();
    void key;
  }

  /** y = A x for the 5-point positive-definite Laplacian, Dirichlet zeros. */
  private applyA(x: Float64Array, out: Float64Array): void {
    out.fill(0);
    for (let y = 1; y < N - 1; y++) {
      for (let x2 = 1; x2 < N - 1; x2++) {
        const i = y * N + x2;
        out[i] = 4 * x[i] - x[i - 1] - x[i + 1] - x[i - N] - x[i + N];
      }
    }
  }

  private dot(a: Float64Array, b: Float64Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
  }

  private norm(v: Float64Array): number {
    let sum = 0;
    for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
    return Math.sqrt(sum);
  }

  protected onUpdate(): void {
    const tolerance = Number(this.str("tolerance"));
    const perTick = this.num("iterations");
    for (let k = 0; k < perTick; k++) {
      this.iterations += 1;
      // Jacobi: simultaneous update through a scratch buffer.
      if (this.residualJacobi > tolerance * this.normB) {
        this.applyA(this.xJacobi, this.ap);
        for (let i = 0; i < this.b.length; i++) {
          this.xTmp[i] = this.xJacobi[i] + (this.b[i] - this.ap[i]) / 4;
        }
        this.xJacobi.set(this.xTmp);
        for (let i = 0; i < this.b.length; i++) this.ap[i] = this.b[i];
        this.applyA(this.xJacobi, this.xTmp);
        for (let i = 0; i < this.b.length; i++) this.ap[i] -= this.xTmp[i];
        this.residualJacobi = this.norm(this.ap);
      }
      // Gauss-Seidel: in-place sweep (red-black order irrelevant for the norm).
      if (this.residualGauss > tolerance * this.normB) {
        for (let y = 1; y < N - 1; y++) {
          for (let x2 = 1; x2 < N - 1; x2++) {
            const i = y * N + x2;
            const sigma =
              this.xGauss[i - 1] + this.xGauss[i + 1] + this.xGauss[i - N] + this.xGauss[i + N];
            this.xGauss[i] = (this.b[i] + sigma) / 4;
          }
        }
        this.applyA(this.xGauss, this.ap);
        for (let i = 0; i < this.b.length; i++) this.ap[i] = this.b[i] - this.ap[i];
        this.residualGauss = this.norm(this.ap);
      }
      // Conjugate gradient with the standard rho recurrence.
      if (this.residualCG > tolerance * this.normB) {
        if (!this.cgStarted) {
          this.cgStarted = true;
          this.applyA(this.xCG, this.rCG);
          for (let i = 0; i < this.b.length; i++) this.rCG[i] = this.b[i] - this.rCG[i];
          this.pCG.set(this.rCG);
          this.rho = this.dot(this.rCG, this.rCG);
        }
        this.applyA(this.pCG, this.ap);
        const pDotAp = this.dot(this.pCG, this.ap);
        const alpha = this.rho / (pDotAp || 1e-300);
        for (let i = 0; i < this.b.length; i++) {
          this.xCG[i] += alpha * this.pCG[i];
          this.rCG[i] -= alpha * this.ap[i];
        }
        const rhoNew = this.dot(this.rCG, this.rCG);
        const beta = rhoNew / (this.rho || 1e-300);
        for (let i = 0; i < this.b.length; i++) {
          this.pCG[i] = this.rCG[i] + beta * this.pCG[i];
        }
        this.rho = rhoNew;
        this.residualCG = Math.sqrt(rhoNew);
      }
      this.history.push({
        jacobi: this.residualJacobi / this.normB,
        gauss: this.residualGauss / this.normB,
        cg: this.residualCG / this.normB,
      });
      if (this.history.length > 800) this.history.shift();
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const pad = 26;
    const plotH = this.height - 90;
    // Log-residual grid: decades
    ctx.strokeStyle = theme.line;
    ctx.lineWidth = 1;
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillStyle = theme.fgTertiary;
    for (let decade = 0; decade >= -14; decade -= 2) {
      const y = pad + (Math.log10(Math.max(1e-14, 1)) - decade) * 0; // gridlines by value below
      void y;
    }
    const toY = (relResidual: number) => {
      const clamped = Math.min(1, Math.max(1e-14, relResidual));
      return pad + (-Math.log10(clamped) / 14) * plotH;
    };
    const toX = (iteration: number) => (iteration / 600) * (this.width - 2 * pad) + pad;
    for (let decade = 0; decade >= -14; decade -= 2) {
      const y = toY(Math.pow(10, decade));
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(this.width - pad, y);
      ctx.stroke();
      ctx.fillText(`1e${decade}`, 2, y + 3);
    }
    const plot = (pick: (h: { jacobi: number; gauss: number; cg: number }) => number, color: string) => {
      if (this.history.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      for (let i = 0; i < this.history.length; i++) {
        const x = toX(i);
        const y = toY(pick(this.history[i]));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    plot((h) => h.jacobi, theme.viz[3]);
    plot((h) => h.gauss, theme.viz[1]);
    plot((h) => h.cg, theme.accent);
    // Legend
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = theme.viz[3];
    ctx.fillText("JACOBI", pad, this.height - 52);
    ctx.fillStyle = theme.viz[1];
    ctx.fillText("GAUSS-SEIDEL", pad + 60, this.height - 52);
    ctx.fillStyle = theme.accent;
    ctx.fillText("CG", pad + 160, this.height - 52);
    ctx.fillStyle = theme.fgTertiary;
    ctx.fillText(`${this.iterations} iterations`, pad + 195, this.height - 52);
    // Solution inset: CG field, banded
    const inset = 92;
    const insetX = this.width - inset - pad;
    const insetY = this.height - inset - 16;
    const diverging = divergingFor(theme);
    if (!this.image || this.image.width !== N) {
      this.image = new ImageData(N, N);
      this.scratch = document.createElement("canvas");
      this.scratch.width = N;
      this.scratch.height = N;
    }
    let maxAbs = 1e-6;
    for (let i = 0; i < this.xCG.length; i++) maxAbs = Math.max(maxAbs, Math.abs(this.xCG[i]));
    const data = this.image.data;
    for (let i = 0; i < this.xCG.length; i++) {
      const banded = Math.round((this.xCG[i] / maxAbs) * 8) / 8;
      sampleInto(diverging, Math.min(1, Math.max(0, 0.5 + banded * 0.5)), data, i * 4);
    }
    this.scratch!.getContext("2d")!.putImageData(this.image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.scratch!, insetX, insetY, inset, inset);
    ctx.strokeStyle = theme.line;
    ctx.strokeRect(insetX - 0.5, insetY - 0.5, inset + 1, inset + 1);
  }

  getMetrics() {
    const fmt = (r: number) => (r / this.normB).toExponential(2);
    const tolerance = Number(this.str("tolerance"));
    return {
      iterations: this.iterations,
      jacobi: fmt(this.residualJacobi),
      gaussSeidel: fmt(this.residualGauss),
      cg: fmt(this.residualCG),
      cgDone: this.residualCG <= tolerance * this.normB ? "yes" : "no",
    };
  }

  describe(): string {
    return `After ${this.iterations} iterations on the Poisson system, CG's relative residual is ${(this.residualCG / this.normB).toExponential(1)} versus ${(this.residualJacobi / this.normB).toExponential(1)} for Jacobi.`;
  }

  entities(): number {
    return N * N * 3;
  }
}
