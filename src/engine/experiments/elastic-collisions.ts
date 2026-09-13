import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";

const CAPACITY = 200;

/**
 * 2-D elastic collisions: hard disks in a box with impulse-based pairwise
 * resolution (coefficient of restitution 1). Kinetic energy and momentum are
 * measured live, so "elastic" is a claim the metrics either support or don't.
 */
export class ElasticCollisionsExperiment extends BaseExperiment {
  readonly id = "elastic-collisions";

  private count = 0;
  private x = new Float32Array(CAPACITY);
  private y = new Float32Array(CAPACITY);
  private vx = new Float32Array(CAPACITY);
  private vy = new Float32Array(CAPACITY);
  private r = new Float32Array(CAPACITY);
  private mass = new Float32Array(CAPACITY);
  private collisionsThisSecond = 0;
  private collisionWindow = 0;
  private windowStart = 0;
  private collisionsPerSecond = 0;
  private ke0 = 1;
  private ke = 1;
  private momentum = 0;
  private time = 0;
  // Slingshot spawn: press, drag, release.
  private dragStart = { x: 0, y: 0 };
  private dragEnd = { x: 0, y: 0 };
  private dragging = false;

  protected params(): ParameterDef[] {
    return [
      { key: "count", label: "Initial disks", min: 10, max: 120, step: 10, defaultValue: 60 },
      { key: "radius", label: "Disk radius", min: 4, max: 12, step: 1, defaultValue: 7, unit: "px" },
      { key: "speed", label: "Initial speed", min: 20, max: 200, step: 10, defaultValue: 90, unit: "px/s" },
    ];
  }

  protected onReset(): void {
    this.count = Math.min(CAPACITY, this.num("count"));
    const radius = this.num("radius");
    for (let i = 0; i < this.count; i++) {
      // Rejection-free placement: random position, overlap resolved by the
      // first ticks of motion (hard disks settle out quickly).
      this.x[i] = radius + this.rng() * (this.width - 2 * radius);
      this.y[i] = radius + this.rng() * (this.height - 2 * radius);
      this.r[i] = radius;
      this.mass[i] = radius * radius;
      const angle = this.rng() * Math.PI * 2;
      const speed = this.num("speed") * (0.6 + this.rng() * 0.8);
      this.vx[i] = Math.cos(angle) * speed;
      this.vy[i] = Math.sin(angle) * speed;
    }
    this.time = 0;
    this.ke0 = this.kineticEnergy();
    this.ke = this.ke0;
    this.windowStart = this.time;
    this.collisionsThisSecond = 0;
  }

  protected onParameterChange(key: string): void {
    if (key !== "radius") this.reset();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.reset();
  }

  onPointer(state: PointerState): void {
    if (state.down && !this.dragging) {
      this.dragging = true;
      this.dragStart = { x: state.x, y: state.y };
      this.dragEnd = { x: state.x, y: state.y };
    } else if (this.dragging && state.down) {
      this.dragEnd = { x: state.x, y: state.y };
    } else if (this.dragging && !state.down) {
      this.dragging = false;
      // Slingshot: spawn a disk with velocity proportional to the drag vector.
      if (this.count < CAPACITY) {
        const i = this.count++;
        const radius = this.num("radius");
        this.x[i] = Math.min(this.width - radius, Math.max(radius, this.dragStart.x));
        this.y[i] = Math.min(this.height - radius, Math.max(radius, this.dragStart.y));
        this.r[i] = radius + 2;
        this.mass[i] = this.r[i] * this.r[i];
        this.vx[i] = (this.dragEnd.x - this.dragStart.x) * 3;
        this.vy[i] = (this.dragEnd.y - this.dragStart.y) * 3;
      }
    }
  }

  private kineticEnergy(): number {
    let ke = 0;
    for (let i = 0; i < this.count; i++) {
      ke += 0.5 * this.mass[i] * (this.vx[i] * this.vx[i] + this.vy[i] * this.vy[i]);
    }
    return ke;
  }

  protected onUpdate(dt: number): void {
    for (let i = 0; i < this.count; i++) {
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      // Walls
      if (this.x[i] < this.r[i]) {
        this.x[i] = this.r[i];
        this.vx[i] = Math.abs(this.vx[i]);
        this.collisionsThisSecond += 1;
      } else if (this.x[i] > this.width - this.r[i]) {
        this.x[i] = this.width - this.r[i];
        this.vx[i] = -Math.abs(this.vx[i]);
        this.collisionsThisSecond += 1;
      }
      if (this.y[i] < this.r[i]) {
        this.y[i] = this.r[i];
        this.vy[i] = Math.abs(this.vy[i]);
        this.collisionsThisSecond += 1;
      } else if (this.y[i] > this.height - this.r[i]) {
        this.y[i] = this.height - this.r[i];
        this.vy[i] = -Math.abs(this.vy[i]);
        this.collisionsThisSecond += 1;
      }
    }
    // Pairwise impulses, O(n^2); fine at the 200-disk capacity.
    for (let i = 0; i < this.count; i++) {
      for (let j = i + 1; j < this.count; j++) {
        const dx = this.x[j] - this.x[i];
        const dy = this.y[j] - this.y[i];
        const rr = this.r[i] + this.r[j];
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        // Separate the overlap first (half each along the normal).
        const overlap = rr - d;
        this.x[i] -= nx * overlap * 0.5;
        this.y[i] -= ny * overlap * 0.5;
        this.x[j] += nx * overlap * 0.5;
        this.y[j] += ny * overlap * 0.5;
        // Impulse for e = 1 along the normal.
        const vRelN = (this.vx[j] - this.vx[i]) * nx + (this.vy[j] - this.vy[i]) * ny;
        if (vRelN < 0) {
          const invMassI = 1 / this.mass[i];
          const invMassJ = 1 / this.mass[j];
          const jImpulse = (-(1 + 1) * vRelN) / (invMassI + invMassJ);
          this.vx[i] -= jImpulse * invMassI * nx;
          this.vy[i] -= jImpulse * invMassI * ny;
          this.vx[j] += jImpulse * invMassJ * nx;
          this.vy[j] += jImpulse * invMassJ * ny;
          this.collisionsThisSecond += 1;
        }
      }
    }
    this.time += dt;
    this.collisionWindow += dt;
    if (this.collisionWindow >= 1) {
      this.collisionsPerSecond = this.collisionsThisSecond / this.collisionWindow;
      this.collisionsThisSecond = 0;
      this.collisionWindow = 0;
    }
    if (Math.floor(this.time * 2) !== Math.floor((this.time - dt) * 2)) {
      this.ke = this.kineticEnergy();
      let px = 0;
      let py = 0;
      for (let i = 0; i < this.count; i++) {
        px += this.mass[i] * this.vx[i];
        py += this.mass[i] * this.vy[i];
      }
      this.momentum = Math.hypot(px, py);
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.strokeStyle = theme.line;
    ctx.strokeRect(0.5, 0.5, this.width - 1, this.height - 1);
    // Slingshot aim line
    if (this.dragging) {
      ctx.strokeStyle = theme.accentStrong;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.dragStart.x, this.dragStart.y);
      ctx.lineTo(this.dragEnd.x, this.dragEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (let i = 0; i < this.count; i++) {
      const speed = Math.hypot(this.vx[i], this.vy[i]);
      ctx.fillStyle =
        speed > this.num("speed") * 1.6 ? theme.accent : i === this.count - 1 ? theme.viz[1] : theme.fg;
      ctx.beginPath();
      ctx.arc(this.x[i], this.y[i], this.r[i], 0, Math.PI * 2);
      ctx.fill();
    }
  }

  getMetrics() {
    const drift = this.ke0 !== 0 ? ((this.ke - this.ke0) / Math.abs(this.ke0)) * 100 : 0;
    return {
      bodies: this.count,
      collisionsPerSecond: this.collisionsPerSecond.toFixed(0),
      energyDrift: `${drift >= 0 ? "+" : ""}${drift.toFixed(3)} %`,
      momentum: this.momentum.toFixed(0),
    };
  }

  describe(): string {
    return `${this.count} hard disks colliding elastically; kinetic energy drifted ${(this.ke0 !== 0 ? ((this.ke - this.ke0) / Math.abs(this.ke0)) * 100 : 0).toFixed(2)}% from launch. Drag to sling a new disk in.`;
  }

  entities(): number {
    return this.count;
  }
}
