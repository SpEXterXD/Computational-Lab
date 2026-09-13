import { BaseExperiment } from "../core/base-experiment";
import { MAGMA, sampleInto } from "../render/colormaps";
import type { ParameterDef, ThemeColors } from "../core/types";
import { divergingFor } from "../render/diverging-cache";

const SIZE = 64;

function makeImage(pattern: number): Float64Array {
  const a = new Float64Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE;
      const v = y / SIZE;
      let value: number;
      if (pattern === 0) {
        // Structured shapes: gradient + disk + band, low effective rank.
        value =
          0.35 * u +
          (Math.hypot(u - 0.35, v - 0.4) < 0.18 ? 0.5 : 0) +
          (Math.abs(v - 0.5 + 0.5 * u) < 0.05 ? 0.3 : 0);
      } else {
        // Smooth peaks: sum of three Gaussians, medium rank.
        const g = (cx: number, cy: number, sx: number, sy: number, amp: number) =>
          amp * Math.exp(-(((u - cx) / sx) ** 2 + ((v - cy) / sy) ** 2));
        value =
          g(0.3, 0.35, 0.18, 0.22, 0.9) +
          g(0.7, 0.6, 0.2, 0.16, 0.7) +
          g(0.5, 0.15, 0.3, 0.1, 0.4);
      }
      a[y * SIZE + x] = Math.min(1, Math.max(0, value));
    }
  }
  return a;
}

/**
 * Truncated SVD image compression, computed for real: one-sided Jacobi
 * orthogonalization (Hestenes) yields singular values, U, and V for the
 * 64x64 matrix; the rank-k reconstruction is compared against the original
 * with measured error and the true storage ratio.
 */
export class SvdCompressionExperiment extends BaseExperiment {
  readonly id = "svd-compression";

  private original: Float64Array = new Float64Array(SIZE * SIZE);
  private reconstruction: Float64Array = new Float64Array(SIZE * SIZE);
  /** Descending singular values. */
  private singularValues: number[] = [];
  /** Column indices of `uColumns`/`vColumns` in descending-sigma order. */
  private order: number[] = [];
  private uColumns = new Float64Array(0) as Float64Array<ArrayBuffer>;
  private vColumns = new Float64Array(0) as Float64Array<ArrayBuffer>;
  private rank = 0;
  private image: ImageData | null = null;
  private scratch: HTMLCanvasElement | null = null;

  protected params(): ParameterDef[] {
    return [
      { key: "rank", label: "Rank k", min: 1, max: 32, step: 1, defaultValue: 6 },
      {
        key: "image",
        label: "Image",
        options: [
          { value: "shapes", label: "Shapes (low rank)" },
          { value: "peaks", label: "Peaks (medium rank)" },
        ],
        defaultValue: "shapes",
      },
      {
        key: "view",
        label: "View",
        options: [
          { value: "split", label: "Original | rank-k" },
          { value: "error", label: "Absolute error" },
        ],
        defaultValue: "split",
      },
    ];
  }

  protected onReset(): void {
    this.original = makeImage(this.str("image") === "peaks" ? 1 : 0);
    this.solve();
  }

  /** Static image: recomputes only when rank or image changes. */
  protected onUpdate(): void {}

  protected onParameterChange(key: string): void {
    if (key === "rank") this.reconstruct();
    else if (key === "image") this.reset();
  }

  private solve(): void {
    const n = SIZE;
    // One-sided Jacobi: rotating A's column pairs to orthogonality leaves
    // A = U * Sigma with V as the accumulated rotation product.
    const a = new Float64Array(this.original);
    const v = new Float64Array(n * n);
    for (let i = 0; i < n; i++) v[i * n + i] = 1;
    for (let sweep = 0; sweep < 60; sweep++) {
      let off = 0;
      for (let p = 0; p < n - 1; p++) {
        for (let q = p + 1; q < n; q++) {
          let alpha = 0;
          let beta = 0;
          let gamma = 0;
          for (let k = 0; k < n; k++) {
            const ap = a[k * n + p];
            const aq = a[k * n + q];
            alpha += ap * ap;
            beta += aq * aq;
            gamma += ap * aq;
          }
          if (Math.abs(gamma) < 1e-14) continue;
          off = Math.max(off, Math.abs(gamma) / Math.sqrt(alpha * beta));
          const zeta = (beta - alpha) / (2 * gamma);
          const t = Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
          const c = 1 / Math.sqrt(1 + t * t);
          const s = c * t;
          for (let k = 0; k < n; k++) {
            const ap = a[k * n + p];
            const aq = a[k * n + q];
            a[k * n + p] = c * ap - s * aq;
            a[k * n + q] = s * ap + c * aq;
            const vp = v[k * n + p];
            const vq = v[k * n + q];
            v[k * n + p] = c * vp - s * vq;
            v[k * n + q] = s * vp + c * vq;
          }
        }
      }
      if (off < 1e-10) break;
    }
    const columns: { sigma: number; index: number }[] = [];
    for (let j = 0; j < n; j++) {
      let sigmaSq = 0;
      for (let k = 0; k < n; k++) sigmaSq += a[k * n + j] ** 2;
      columns.push({ sigma: Math.sqrt(sigmaSq), index: j });
    }
    columns.sort((x, y) => y.sigma - x.sigma);
    this.singularValues = columns.map((c) => c.sigma);
    this.order = columns.map((c) => c.index);
    this.uColumns = a;
    this.vColumns = v;
    this.reconstruct();
  }

  /** A_k = sum over the top k of (sigma_j * u_j) v_j^T = sum of a_col_j * v_col_j^T.
   *  Note V is stored row-major: v_j[col] lives at vColumns[col * n + j]. */
  private reconstruct(): void {
    const n = SIZE;
    const k = Math.min(this.num("rank"), this.order.length);
    this.reconstruction.fill(0);
    for (let ki = 0; ki < k; ki++) {
      const j = this.order[ki];
      if (this.singularValues[ki] < 1e-12) break;
      for (let row = 0; row < n; row++) {
        const uSigma = this.uColumns[row * n + j];
        if (uSigma === 0) continue;
        for (let col = 0; col < n; col++) {
          this.reconstruction[row * n + col] += uSigma * this.vColumns[col * n + j];
        }
      }
    }
    this.rank = k;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    if (!this.image || this.image.width !== SIZE || this.image.height !== SIZE) {
      this.image = new ImageData(SIZE, SIZE);
      this.scratch = null;
    }
    const diverging = divergingFor(theme);
    const data = this.image.data;
    const view = this.str("view");
    const half = SIZE / 2;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = y * SIZE + x;
        if (view === "error") {
          sampleInto(
            diverging,
            Math.min(1, Math.max(0, 0.5 + (this.reconstruction[i] - this.original[i]) * 2.5)),
            data,
            i * 4,
          );
        } else {
          const value = x < half ? this.original[i] : this.reconstruction[i];
          sampleInto(MAGMA, value, data, i * 4);
        }
      }
    }
    if (!this.scratch) {
      this.scratch = document.createElement("canvas");
      this.scratch.width = SIZE;
      this.scratch.height = SIZE;
    }
    const offCtx = this.scratch.getContext("2d")!;
    offCtx.putImageData(this.image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.scratch, 0, 0, this.width, this.height);
    if (view === "split") {
      ctx.strokeStyle = theme.fgSecondary;
      ctx.beginPath();
      ctx.moveTo(this.width / 2, 0);
      ctx.lineTo(this.width / 2, this.height);
      ctx.stroke();
    }
  }

  getMetrics() {
    let retained = 0;
    let totalEnergy = 0;
    for (let i = 0; i < this.singularValues.length; i++) {
      totalEnergy += this.singularValues[i] ** 2;
      if (i < this.rank) retained += this.singularValues[i] ** 2;
    }
    let errSq = 0;
    let totalSq = 0;
    for (let i = 0; i < this.original.length; i++) {
      const d = this.reconstruction[i] - this.original[i];
      errSq += d * d;
      totalSq += this.original[i] * this.original[i];
    }
    const stored = this.rank * (2 * SIZE + 1);
    return {
      rank: this.rank,
      compression: `${(SIZE * SIZE / stored).toFixed(1)} : 1`,
      energyRetained: `${((retained / totalEnergy) * 100).toFixed(1)} %`,
      relError: Math.sqrt(errSq / Math.max(1e-12, totalSq)).toExponential(2),
    };
  }

  describe(): string {
    const metrics = this.getMetrics();
    return `Rank-${this.rank} reconstruction keeps ${metrics.energyRetained} of the image energy at a ${metrics.compression} compression ratio.`;
  }

  entities(): number {
    return SIZE * SIZE;
  }
}
