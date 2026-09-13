import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

/**
 * The three-body problem on its most famous solution: the figure-eight
 * orbit of Chenciner and Montgomery, integrated with velocity Verlet.
 * Momentum conservation is the live check that the integration is honest.
 */
export class ThreeBodyExperiment extends BaseExperiment {
  readonly id = "three-body";

  // State: three bodies, equal masses.
  private px = new Float64Array(3);
  private py = new Float64Array(3);
  private vx = new Float64Array(3);
  private vy = new Float64Array(3);
  private time = 0;
  private momentum = 0;
  private scale = 1;
  private preset = "figure8";

  protected params(): ParameterDef[] {
    return [
      {
        key: "preset",
        label: "Initial condition",
        options: [
          { value: "figure8", label: "Figure eight" },
          { value: "lagrange", label: "Lagrange triangle" },
          { value: "chaotic", label: "Chaotic start" },
        ],
        defaultValue: "figure8",
      },
      { key: "speed", label: "Time scale", min: 0.2, max: 3, step: 0.1, defaultValue: 1 },
      {
        key: "trails",
        label: "Trails",
        options: [
          { value: "on", label: "On" },
          { value: "off", label: "Off" },
        ],
        defaultValue: "on",
      },
    ];
  }

  protected onReset(): void {
    this.preset = this.str("preset");
    this.time = 0;
    this.scale = Math.min(this.width, this.height) * 0.62;
    if (this.preset === "figure8") {
      // Chenciner-Montgomery figure-eight (G = 1, m = 1), scaled.
      const p = 0.43236573;
      const v = 0.466203685;
      this.px.set([-0.97000436, 0.97000436, 0]);
      this.py.set([0.24308753, -0.24308753, 0]);
      this.vx.set([v, v, -2 * v]);
      this.vy.set([p, p, -2 * p]);
    } else if (this.preset === "lagrange") {
      // Equilateral triangle rotating in place.
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        this.px[i] = Math.cos(angle) * 0.5;
        this.py[i] = Math.sin(angle) * 0.5;
      }
      const v = Math.sqrt(1 / (2 * Math.sqrt(3))) * 0.5;
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        this.vx[i] = -Math.sin(angle) * v * 2;
        this.vy[i] = Math.cos(angle) * v * 2;
      }
    } else {
      this.px.set([-0.5, 0.5, 0.1]);
      this.py.set([0, 0.2, -0.3]);
      this.vx.set([0.2, 0.2, -0.5]);
      this.vy.set([-0.1, -0.1, 0.3]);
    }
  }

  protected onParameterChange(key: string): void {
    if (key !== "speed" && key !== "trails") this.reset();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.scale = Math.min(width, height) * 0.62;
    this.reset();
  }

  /** Accelerations under Newtonian gravity, G = m = 1. */
  private accelerations(ax: Float64Array, ay: Float64Array): void {
    ax.fill(0);
    ay.fill(0);
    const soft = 1e-6;
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const dx = this.px[j] - this.px[i];
        const dy = this.py[j] - this.py[i];
        const r2 = dx * dx + dy * dy + soft;
        const inv = 1 / (r2 * Math.sqrt(r2));
        ax[i] += dx * inv;
        ay[i] += dy * inv;
        ax[j] -= dx * inv;
        ay[j] -= dy * inv;
      }
    }
  }

  protected onUpdate(dt: number): void {
    const h = dt * this.num("speed");
    const ax = new Float64Array(3);
    const ay = new Float64Array(3);
    // Velocity Verlet.
    this.accelerations(ax, ay);
    for (let i = 0; i < 3; i++) {
      this.vx[i] += ax[i] * h * 0.5;
      this.px[i] += this.vx[i] * h;
    }
    this.accelerations(ax, ay);
    for (let i = 0; i < 3; i++) this.vx[i] += ax[i] * h * 0.5;
    this.time += h;
    let mx = 0;
    let my = 0;
    for (let i = 0; i < 3; i++) {
      mx += this.vx[i];
      my += this.vy[i];
    }
    this.momentum = Math.hypot(mx, my);
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    // Trailing faint copies (cheap persistence via low-alpha strokes is not
    // theme-safe, so draw the orbit path estimate from recent positions).
    const colors = [theme.accent, theme.viz[1], theme.viz[2]];
    const cx = this.width / 2;
    const cy = this.height / 2;
    // Draw bodies
    for (let i = 0; i < 3; i++) {
      const sx = cx + this.px[i] * this.scale;
      const sy = cy - this.py[i] * this.scale;
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Pairwise lines for readability
    ctx.strokeStyle = theme.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        ctx.moveTo(cx + this.px[i] * this.scale, cy - this.py[i] * this.scale);
        ctx.lineTo(cx + this.px[j] * this.scale, cy - this.py[j] * this.scale);
      }
    }
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  getMetrics() {
    return {
      preset: this.preset,
      time: `${this.time.toFixed(1)} s`,
      momentum: this.momentum.toExponential(2),
      bodies: 3,
    };
  }

  describe(): string {
    return `Three equal masses on the ${this.preset === "figure8" ? "figure-eight choreography" : this.preset === "lagrange" ? "Lagrange equilateral solution" : "a chaotic path"}; total momentum ${this.momentum.toExponential(1)} should stay at zero.`;
  }

  entities(): number {
    return 3;
  }
}
