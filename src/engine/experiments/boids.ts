import { BaseExperiment } from "../core/base-experiment";
import { clamp, lerp } from "../core/theme";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";

const CAPACITY = 400;

/**
 * Reynolds boids with a spatial hash for neighbor queries. State lives in
 * typed arrays; previous positions are kept so render can interpolate
 * between fixed ticks at any display refresh rate.
 */
export class BoidsExperiment extends BaseExperiment {
  readonly id = "boids";

  private count = 0;
  private x = new Float32Array(CAPACITY);
  private y = new Float32Array(CAPACITY);
  private vx = new Float32Array(CAPACITY);
  private vy = new Float32Array(CAPACITY);
  private px = new Float32Array(CAPACITY);
  private py = new Float32Array(CAPACITY);
  private orderSum = 0;
  private neighborSum = 0;
  private pointer = { x: 0, y: 0, down: false, inside: false };

  private head = new Int32Array(0);
  private next = new Int32Array(CAPACITY);
  private gridW = 0;
  private gridH = 0;

  protected params(): ParameterDef[] {
    return [
      { key: "population", label: "Population", min: 40, max: 400, step: 20, defaultValue: 220 },
      { key: "vision", label: "Vision radius", min: 20, max: 80, step: 2, defaultValue: 44, unit: "px" },
      { key: "separation", label: "Separation weight", min: 0, max: 3, step: 0.1, defaultValue: 1.6 },
      { key: "alignment", label: "Alignment weight", min: 0, max: 3, step: 0.1, defaultValue: 1 },
      { key: "cohesion", label: "Cohesion weight", min: 0, max: 3, step: 0.1, defaultValue: 0.9 },
      { key: "speed", label: "Cruise speed", min: 40, max: 240, step: 10, defaultValue: 110, unit: "px/s" },
    ];
  }

  protected onReset(): void {
    this.count = this.num("population");
    for (let i = 0; i < this.count; i++) {
      this.x[i] = this.rng() * this.width;
      this.y[i] = this.rng() * this.height;
      const angle = this.rng() * Math.PI * 2;
      this.vx[i] = Math.cos(angle) * this.num("speed");
      this.vy[i] = Math.sin(angle) * this.num("speed");
      this.px[i] = this.x[i];
      this.py[i] = this.y[i];
    }
    this.orderSum = 0;
    this.neighborSum = 0;
  }

  protected onParameterChange(key: string): void {
    if (key === "population") this.reset();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.reset();
  }

  onPointer(state: PointerState): void {
    this.pointer = state;
  }

  private rebuildHash(): void {
    const cell = Math.max(8, this.num("vision"));
    this.gridW = Math.max(1, Math.ceil(this.width / cell));
    this.gridH = Math.max(1, Math.ceil(this.height / cell));
    const cells = this.gridW * this.gridH;
    if (this.head.length !== cells) this.head = new Int32Array(cells);
    this.head.fill(-1);
    for (let i = 0; i < this.count; i++) {
      const gx = Math.min(this.gridW - 1, Math.max(0, (this.x[i] / cell) | 0));
      const gy = Math.min(this.gridH - 1, Math.max(0, (this.y[i] / cell) | 0));
      const c = gy * this.gridW + gx;
      this.next[i] = this.head[c];
      this.head[c] = i;
    }
  }

  protected onUpdate(dt: number): void {
    const vision = this.num("vision");
    const vision2 = vision * vision;
    const sepRadius = vision * 0.45;
    const sep2 = sepRadius * sepRadius;
    const maxSpeed = this.num("speed");
    const maxForce = maxSpeed * 2.4; // px/s^2
    const cell = Math.max(8, vision);
    this.rebuildHash();

    const sepW = this.num("separation");
    const aliW = this.num("alignment");
    const cohW = this.num("cohesion");
    let orderX = 0;
    let orderY = 0;
    let neighborTotal = 0;

    for (let i = 0; i < this.count; i++) {
      const gx = Math.min(this.gridW - 1, Math.max(0, (this.x[i] / cell) | 0));
      const gy = Math.min(this.gridH - 1, Math.max(0, (this.y[i] / cell) | 0));
      let sepX = 0;
      let sepY = 0;
      let aliX = 0;
      let aliY = 0;
      let cohX = 0;
      let cohY = 0;
      let neighbors = 0;

      for (let oy = -1; oy <= 1; oy++) {
        const ny = gy + oy;
        if (ny < 0 || ny >= this.gridH) continue;
        for (let ox = -1; ox <= 1; ox++) {
          const nx = gx + ox;
          if (nx < 0 || nx >= this.gridW) continue;
          for (let j = this.head[ny * this.gridW + nx]; j !== -1; j = this.next[j]) {
            if (j === i) continue;
            const dx = this.x[j] - this.x[i];
            const dy = this.y[j] - this.y[i];
            const d2 = dx * dx + dy * dy;
            if (d2 > vision2) continue;
            neighbors += 1;
            aliX += this.vx[j];
            aliY += this.vy[j];
            cohX += dx;
            cohY += dy;
            if (d2 < sep2 && d2 > 1e-6) {
              const inv = 1 / d2;
              sepX -= dx * inv;
              sepY -= dy * inv;
            }
          }
        }
      }

      let ax = 0;
      let ay = 0;
      if (neighbors > 0) {
        // Reynolds steering: desired direction minus current velocity.
        const invN = 1 / neighbors;
        if (aliW > 0) {
          const scale = maxSpeed / (Math.hypot(aliX, aliY) || 1);
          ax += aliW * (aliX * scale * invN - this.vx[i]);
          ay += aliW * (aliY * scale * invN - this.vy[i]);
        }
        if (cohW > 0) {
          const cx = this.x[i] + cohX * invN;
          const cy = this.y[i] + cohY * invN;
          const toX = cx - this.x[i];
          const toY = cy - this.y[i];
          const scale = maxSpeed / (Math.hypot(toX, toY) || 1);
          ax += cohW * (toX * scale - this.vx[i]);
          ay += cohW * (toY * scale - this.vy[i]);
        }
        if (sepW > 0) {
          const scale = maxSpeed / (Math.hypot(sepX, sepY) || 1);
          ax += sepW * (sepX * scale - this.vx[i]) * 1.5;
          ay += sepW * (sepY * scale - this.vy[i]) * 1.5;
        }
        neighborTotal += neighbors;
      }

      // Pointer acts as a predator: strong short-range repulsion.
      if (this.pointer.inside) {
        const dx = this.x[i] - this.pointer.x;
        const dy = this.y[i] - this.pointer.y;
        const d2 = dx * dx + dy * dy;
        const radius = 120;
        if (d2 < radius * radius && d2 > 1e-6) {
          const falloff = 1 - d2 / (radius * radius);
          const inv = (maxSpeed * 6 * falloff) / Math.sqrt(d2);
          ax += dx * inv;
          ay += dy * inv;
        }
      }

      const mag = Math.hypot(ax, ay);
      if (mag > maxForce) {
        ax = (ax / mag) * maxForce;
        ay = (ay / mag) * maxForce;
      }

      this.px[i] = this.x[i];
      this.py[i] = this.y[i];
      let nvx = this.vx[i] + ax * dt;
      let nvy = this.vy[i] + ay * dt;
      const speed = Math.hypot(nvx, nvy);
      if (speed > maxSpeed) {
        nvx = (nvx / speed) * maxSpeed;
        nvy = (nvy / speed) * maxSpeed;
      } else if (speed < maxSpeed * 0.35 && speed > 1e-6) {
        const boost = (maxSpeed * 0.35) / speed;
        nvx *= boost;
        nvy *= boost;
      }
      this.vx[i] = nvx;
      this.vy[i] = nvy;
      this.x[i] = (this.x[i] + nvx * dt + this.width) % this.width;
      this.y[i] = (this.y[i] + nvy * dt + this.height) % this.height;
      orderX += nvx;
      orderY += nvy;
    }

    this.orderSum = this.count > 0 ? Math.hypot(orderX, orderY) / (this.count * maxSpeed) : 0;
    this.neighborSum = this.count > 0 ? neighborTotal / this.count : 0;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors, alpha: number): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const trail = Math.max(2, this.num("speed") / 60);
    for (let i = 0; i < this.count; i++) {
      let ix = lerp(this.px[i], this.x[i], alpha);
      let iy = lerp(this.py[i], this.y[i], alpha);
      // Skip interpolation across a wrap seam.
      if (Math.abs(ix - this.x[i]) > this.width / 2) ix = this.x[i];
      if (Math.abs(iy - this.y[i]) > this.height / 2) iy = this.y[i];
      const speed = Math.hypot(this.vx[i], this.vy[i]);
      const dirX = speed > 0 ? this.vx[i] / speed : 1;
      const dirY = speed > 0 ? this.vy[i] / speed : 0;
      ctx.strokeStyle = i % 25 === 0 ? theme.accent : theme.fgSecondary;
      ctx.lineWidth = i % 25 === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(clamp(ix - dirX * trail, 0, this.width), clamp(iy - dirY * trail, 0, this.height));
      ctx.lineTo(clamp(ix + dirX * trail, 0, this.width), clamp(iy + dirY * trail, 0, this.height));
      ctx.stroke();
    }
  }

  getMetrics() {
    let speedSum = 0;
    for (let i = 0; i < this.count; i++) speedSum += Math.hypot(this.vx[i], this.vy[i]);
    return {
      population: this.count,
      meanSpeed: `${(speedSum / Math.max(1, this.count)).toFixed(0)} px/s`,
      neighbors: this.neighborSum.toFixed(1),
      order: this.orderSum.toFixed(3),
    };
  }

  describe(): string {
    const flock =
      this.orderSum > 0.7 ? "a tightly aligned flock" : this.orderSum > 0.35 ? "a loose flock" : "a dispersed swarm";
    return `${this.count} boids form ${flock}; order parameter ${this.orderSum.toFixed(2)}.`;
  }

  entities(): number {
    return this.count;
  }
}
