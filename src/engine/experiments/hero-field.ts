import { BaseExperiment } from "../core/base-experiment";
import { clamp } from "../core/theme";
import type { PointerState, ThemeColors } from "../core/types";

/**
 * The hero field: ~1,200 particles advected through a layered sine flow with
 * pointer repulsion. This is the homepage hero itself, not decoration around
 * one: it runs on the same engine base class and clock as every experiment.
 */
export class HeroFieldExperiment extends BaseExperiment {
  readonly id = "hero-field";

  private count = 0;
  private x = new Float32Array(0);
  private y = new Float32Array(0);
  private px = new Float32Array(0);
  private py = new Float32Array(0);
  private life = new Float32Array(0);
  private speed = new Float32Array(0);
  private time = 0;
  private pointer = { x: 0, y: 0, down: false, inside: false };

  protected params() {
    return [];
  }

  protected onReset(): void {
    this.count = Math.min(1400, Math.max(400, Math.floor((this.width * this.height) / 700)));
    this.x = new Float32Array(this.count);
    this.y = new Float32Array(this.count);
    this.px = new Float32Array(this.count);
    this.py = new Float32Array(this.count);
    this.life = new Float32Array(this.count);
    this.speed = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) this.spawn(i, true);
    this.time = 0;
  }

  private spawn(i: number, anywhere: boolean): void {
    this.x[i] = this.rng() * this.width;
    this.y[i] = this.rng() * this.height;
    this.life[i] = 3 + this.rng() * 6;
    this.speed[i] = 26 + this.rng() * 46;
    if (!anywhere && this.rng() < 0.5) {
      if (this.rng() < 0.5) {
        this.x[i] = this.rng() < 0.5 ? 0 : this.width;
      } else {
        this.y[i] = this.rng() < 0.5 ? 0 : this.height;
      }
    }
    // Sync previous coordinates AFTER the edge snap so the next render
    // doesn't draw a full-screen streak from the old position.
    this.px[i] = this.x[i];
    this.py[i] = this.y[i];
  }

  /** Layered sines approximate a divergence-free curl field. */
  private angle(x: number, y: number): number {
    const s = 0.0024;
    const a =
      Math.sin(x * s + this.time * 0.32) * 1.35 +
      Math.cos(y * s * 1.31 - this.time * 0.21) * 1.15 +
      Math.sin((x + y) * s * 0.62 + this.time * 0.11) * 0.9;
    return a * 1.45;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.reset();
  }

  onPointer(state: PointerState): void {
    this.pointer = state;
  }

  protected onUpdate(dt: number): void {
    this.time += dt;
    for (let i = 0; i < this.count; i++) {
      this.px[i] = this.x[i];
      this.py[i] = this.y[i];
      const a = this.angle(this.x[i], this.y[i]);
      let vx = Math.cos(a) * this.speed[i];
      let vy = Math.sin(a) * this.speed[i];
      if (this.pointer.inside) {
        const dx = this.x[i] - this.pointer.x;
        const dy = this.y[i] - this.pointer.y;
        const d2 = dx * dx + dy * dy;
        const radius = this.pointer.down ? 240 : 150;
        if (d2 < radius * radius && d2 > 1) {
          const falloff = 1 - d2 / (radius * radius);
          const push = (this.pointer.down ? 620 : 220) * falloff;
          const inv = 1 / Math.sqrt(d2);
          vx += dx * inv * push;
          vy += dy * inv * push;
          vx += -dy * inv * push * 0.4;
          vy += dx * inv * push * 0.4;
        }
      }
      this.x[i] += vx * dt;
      this.y[i] += vy * dt;
      this.life[i] -= dt;
      if (
        this.life[i] <= 0 ||
        this.x[i] < -8 ||
        this.x[i] > this.width + 8 ||
        this.y[i] < -8 ||
        this.y[i] > this.height + 8
      ) {
        this.spawn(i, false);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    for (let i = 0; i < this.count; i++) {
      const speed = Math.hypot(this.x[i] - this.px[i], this.y[i] - this.py[i]);
      const alpha = clamp(speed / 3.2, 0.08, 0.8);
      ctx.strokeStyle = i % 25 === 0 ? theme.accent : theme.fgSecondary;
      ctx.globalAlpha = i % 25 === 0 ? Math.min(1, alpha + 0.25) : alpha * 0.75;
      ctx.beginPath();
      ctx.moveTo(this.px[i], this.py[i]);
      ctx.lineTo(this.x[i], this.y[i]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  describe(): string {
    return `${this.count.toLocaleString("en-US")} particles advecting through a live vector field; move the pointer to disturb the flow.`;
  }

  entities(): number {
    return this.count;
  }
}
