import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";

const PARTICLES = 700;

/**
 * A composed vector field: uniform flow, a source, a sink, and a vortex,
 * each with a strength slider. Particles advect through the exact field
 * (drawn from its analytic formula); the pointer injects a temporary source.
 */
export class VectorFieldExperiment extends BaseExperiment {
  readonly id = "vector-field";

  private x = new Float32Array(PARTICLES);
  private y = new Float32Array(PARTICLES);
  private px = new Float32Array(PARTICLES);
  private py = new Float32Array(PARTICLES);
  private time = 0;
  private pointer = { x: 0, y: 0, down: false, inside: false };

  protected params(): ParameterDef[] {
    return [
      { key: "flowAngle", label: "Uniform flow angle", min: -180, max: 180, step: 5, defaultValue: 0, unit: "°" },
      { key: "flowSpeed", label: "Uniform flow speed", min: 0, max: 120, step: 5, defaultValue: 40, unit: "px/s" },
      { key: "source", label: "Source strength", min: -6000, max: 6000, step: 200, defaultValue: 3000 },
      { key: "vortex", label: "Vortex strength", min: -8000, max: 8000, step: 200, defaultValue: 3500 },
      {
        key: "arrows",
        label: "Show field arrows",
        options: [
          { value: "off", label: "Off" },
          { value: "on", label: "On" },
        ],
        defaultValue: "off",
      },
    ];
  }

  protected onReset(): void {
    for (let i = 0; i < PARTICLES; i++) {
      this.x[i] = this.rng() * this.width;
      this.y[i] = this.rng() * this.height;
      this.px[i] = this.x[i];
      this.py[i] = this.y[i];
    }
    this.time = 0;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.reset();
  }

  onPointer(state: PointerState): void {
    this.pointer = state;
  }

  /** The field at (x, y), components in px/s. */
  private velocity(x: number, y: number): [number, number] {
    const angle = (this.num("flowAngle") * Math.PI) / 180;
    let vx = Math.cos(angle) * this.num("flowSpeed");
    let vy = Math.sin(angle) * this.num("flowSpeed");
    // Source/sink at the left-center, vortex at the right-center.
    const sx = this.width * 0.32;
    const sy = this.height * 0.5;
    let dx = x - sx;
    let dy = y - sy;
    let d2 = dx * dx + dy * dy + 400;
    const src = this.num("source") / (2 * Math.PI * d2);
    vx += src * dx;
    vy += src * dy;
    dx = x - this.width * 0.68;
    dy = y - this.height * 0.5;
    d2 = dx * dx + dy * dy + 400;
    const vor = this.num("vortex") / (2 * Math.PI * d2);
    vx += -dy * vor;
    vy += dx * vor;
    // Pointer as a temporary source.
    if (this.pointer.inside) {
      dx = x - this.pointer.x;
      dy = y - this.pointer.y;
      const pd2 = dx * dx + dy * dy + 400;
      const strength = this.pointer.down ? 9000 : 3500;
      const s = strength / (2 * Math.PI * pd2);
      vx += s * dx;
      vy += s * dy;
    }
    return [vx, vy];
  }

  protected onUpdate(dt: number): void {
    this.time += dt;
    for (let i = 0; i < PARTICLES; i++) {
      this.px[i] = this.x[i];
      this.py[i] = this.y[i];
      const [vx, vy] = this.velocity(this.x[i], this.y[i]);
      this.x[i] += vx * dt;
      this.y[i] += vy * dt;
      // Respawn on edges to keep density even.
      if (this.x[i] < -4 || this.x[i] > this.width + 4 || this.y[i] < -4 || this.y[i] > this.height + 4 || this.rng() < 0.002) {
        const edge = Math.floor(this.rng() * 4);
        if (edge === 0) {
          this.x[i] = 0;
          this.y[i] = this.rng() * this.height;
        } else if (edge === 1) {
          this.x[i] = this.width;
          this.y[i] = this.rng() * this.height;
        } else if (edge === 2) {
          this.x[i] = this.rng() * this.width;
          this.y[i] = 0;
        } else {
          this.x[i] = this.rng() * this.width;
          this.y[i] = this.height;
        }
        this.px[i] = this.x[i];
        this.py[i] = this.y[i];
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.lineWidth = 1.1;
    for (let i = 0; i < PARTICLES; i++) {
      const speed = Math.hypot(this.x[i] - this.px[i], this.y[i] - this.py[i]);
      ctx.strokeStyle = i % 30 === 0 ? theme.accent : theme.fgSecondary;
      ctx.globalAlpha = Math.min(0.9, 0.15 + speed / 4);
      ctx.beginPath();
      ctx.moveTo(this.px[i], this.py[i]);
      ctx.lineTo(this.x[i], this.y[i]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (this.str("arrows") === "on") {
      const step = 46;
      ctx.strokeStyle = theme.fgTertiary;
      ctx.lineWidth = 1;
      for (let gy = step / 2; gy < this.height; gy += step) {
        for (let gx = step / 2; gx < this.width; gx += step) {
          const [vx, vy] = this.velocity(gx, gy);
          const mag = Math.hypot(vx, vy);
          if (mag < 1) continue;
          const len = Math.min(14, 4 + mag * 0.08);
          const nx = vx / mag;
          const ny = vy / mag;
          ctx.beginPath();
          ctx.moveTo(gx - nx * len * 0.5, gy - ny * len * 0.5);
          ctx.lineTo(gx + nx * len * 0.5, gy + ny * len * 0.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(gx + nx * len * 0.5, gy + ny * len * 0.5, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // Sources of the field
    ctx.fillStyle = theme.viz[2];
    ctx.beginPath();
    ctx.arc(this.width * 0.32, this.height * 0.5, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(this.width * 0.68, this.height * 0.5, 3.4, 0, Math.PI * 2);
    ctx.stroke();
  }

  getMetrics() {
    const [vx, vy] = this.velocity(this.width / 2, this.height / 2);
    return {
      centerSpeed: `${Math.hypot(vx, vy).toFixed(1)} px/s`,
      sourceStrength: this.num("source").toString(),
      vortexStrength: this.num("vortex").toString(),
      particles: PARTICLES,
    };
  }

  describe(): string {
    return `${PARTICLES} particles advecting through a composed field: uniform flow, a source at the left, a vortex at the right, and the pointer as an extra source.`;
  }

  entities(): number {
    return PARTICLES;
  }
}
