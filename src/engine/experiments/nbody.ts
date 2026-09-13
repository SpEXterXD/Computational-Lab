import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";

const TRAIL_LENGTH = 48;

/**
 * N-body gravity with three interchangeable integrators (forward Euler,
	* leapfrog KDK, classical RK4) so energy behavior is measurable, not claimed.
 * Pointer drag inserts a temporary attractor.
 */
export class NBodyExperiment extends BaseExperiment {
  readonly id = "n-body";

  private count = 0;
  private x = new Float32Array(0);
  private y = new Float32Array(0);
  private vx = new Float32Array(0);
  private vy = new Float32Array(0);
  private px = new Float32Array(0);
  private py = new Float32Array(0);
  private ax = new Float32Array(0);
  private ay = new Float32Array(0);
  private mass = new Float32Array(0);
  private trailX = new Float32Array(0);
  private trailY = new Float32Array(0);
  private trailHead = 0;
  private trailTick = 0;
  private energy0 = 1;
  private energy = 1;
  private time = 0;
  private pointer = { x: 0, y: 0, down: false, inside: false };
  // RK4 scratch: position-derivatives (p*) and accelerations (a*) per stage.
  private k1px = new Float32Array(0);
  private k1py = new Float32Array(0);
  private k1ax = new Float32Array(0);
  private k1ay = new Float32Array(0);
  private k2px = new Float32Array(0);
  private k2py = new Float32Array(0);
  private k2ax = new Float32Array(0);
  private k2ay = new Float32Array(0);
  private k3px = new Float32Array(0);
  private k3py = new Float32Array(0);
  private k3ax = new Float32Array(0);
  private k3ay = new Float32Array(0);
  private k4ax = new Float32Array(0);
  private k4ay = new Float32Array(0);
  private tx = new Float32Array(0);
  private ty = new Float32Array(0);

  private readonly G = 6000;
  private readonly centralMass = 140;
  private readonly softening = 6;

  protected params(): ParameterDef[] {
    return [
      { key: "bodies", label: "Orbiting bodies", min: 20, max: 400, step: 20, defaultValue: 160 },
      {
        key: "integrator",
        label: "Integrator",
        options: [
          { value: "leapfrog", label: "Leapfrog (KDK)" },
          { value: "rk4", label: "Runge-Kutta 4" },
          { value: "euler", label: "Forward Euler" },
        ],
        defaultValue: "leapfrog",
      },
      {
        key: "trails",
        label: "Orbit trails",
        options: [
          { value: "on", label: "On" },
          { value: "off", label: "Off" },
        ],
        defaultValue: "on",
      },
    ];
  }

  protected onReset(): void {
    this.count = this.num("bodies");
    const n = this.count + 1; // index 0 is the central mass
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.px = new Float32Array(n);
    this.py = new Float32Array(n);
    this.ax = new Float32Array(n);
    this.ay = new Float32Array(n);
    this.mass = new Float32Array(n);
    this.trailX = new Float32Array(n * TRAIL_LENGTH);
    this.trailY = new Float32Array(n * TRAIL_LENGTH);
    this.trailHead = 0;
    this.trailTick = 0;
    this.k1px = new Float32Array(n);
    this.k1py = new Float32Array(n);
    this.k1ax = new Float32Array(n);
    this.k1ay = new Float32Array(n);
    this.k2px = new Float32Array(n);
    this.k2py = new Float32Array(n);
    this.k2ax = new Float32Array(n);
    this.k2ay = new Float32Array(n);
    this.k3px = new Float32Array(n);
    this.k3py = new Float32Array(n);
    this.k3ax = new Float32Array(n);
    this.k3ay = new Float32Array(n);
    this.k4ax = new Float32Array(n);
    this.k4ay = new Float32Array(n);
    this.tx = new Float32Array(n);
    this.ty = new Float32Array(n);

    this.x[0] = this.width / 2;
    this.y[0] = this.height / 2;
    this.mass[0] = this.centralMass;
    for (let i = 1; i < n; i++) {
      const radius = 40 + this.rng() * Math.min(this.width, this.height) * 0.42;
      const angle = this.rng() * Math.PI * 2;
      this.x[i] = this.x[0] + Math.cos(angle) * radius;
      this.y[i] = this.y[0] + Math.sin(angle) * radius;
      // Circular orbit speed for the central mass, plus a small dispersion.
      const v = Math.sqrt((this.G * this.centralMass) / radius) * (0.9 + this.rng() * 0.2);
      this.vx[i] = -Math.sin(angle) * v;
      this.vy[i] = Math.cos(angle) * v;
      this.mass[i] = 1;
      this.px[i] = this.x[i];
      this.py[i] = this.y[i];
    }
    this.time = 0;
    this.energy0 = this.totalEnergy();
    this.energy = this.energy0;
  }

  protected onParameterChange(key: string): void {
    if (key === "bodies" || key === "integrator") this.reset();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.reset();
  }

  onPointer(state: PointerState): void {
    this.pointer = state;
  }

  /** Pairwise accelerations with Plummer softening; O(n^2) over alive bodies. */
  private accelerations(px: Float32Array, py: Float32Array, ax: Float32Array, ay: Float32Array): void {
    const n = this.count + 1;
    ax.fill(0);
    ay.fill(0);
    const eps2 = this.softening * this.softening;
    // Temporary attractor under pointer drag.
    const pointerMass = this.pointer.down && this.pointer.inside ? 400 : 0;
    for (let i = 0; i < n; i++) {
      let axi = 0;
      let ayi = 0;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const dx = px[j] - px[i];
        const dy = py[j] - py[i];
        const r2 = dx * dx + dy * dy + eps2;
        const inv = 1 / (r2 * Math.sqrt(r2));
        const s = this.G * this.mass[j] * inv;
        axi += dx * s;
        ayi += dy * s;
      }
      if (pointerMass > 0) {
        const dx = this.pointer.x - px[i];
        const dy = this.pointer.y - py[i];
        const r2 = dx * dx + dy * dy + 900;
        const inv = 1 / (r2 * Math.sqrt(r2));
        const s = this.G * pointerMass * inv;
        axi += dx * s;
        ayi += dy * s;
      }
      ax[i] = axi;
      ay[i] = ayi;
    }
  }

  protected onUpdate(dt: number): void {
    const integrator = this.str("integrator");
    if (integrator === "leapfrog") this.stepLeapfrog(dt);
    else if (integrator === "rk4") this.stepRK4(dt);
    else this.stepEuler(dt);
    this.time += dt;
    this.trailTick += 1;
    if (this.trailTick % 2 === 0) {
      const n = this.count + 1;
      for (let i = 0; i < n; i++) {
        this.trailX[i * TRAIL_LENGTH + this.trailHead] = this.x[i];
        this.trailY[i * TRAIL_LENGTH + this.trailHead] = this.y[i];
      }
      this.trailHead = (this.trailHead + 1) % TRAIL_LENGTH;
    }
    if (this.trailTick % 20 === 0) this.energy = this.totalEnergy();
  }

  private stepEuler(dt: number): void {
    this.accelerations(this.x, this.y, this.ax, this.ay);
    const n = this.count + 1;
    for (let i = 0; i < n; i++) {
      this.px[i] = this.x[i];
      this.py[i] = this.y[i];
      this.vx[i] += this.ax[i] * dt;
      this.vy[i] += this.ay[i] * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
    }
  }

  private stepLeapfrog(dt: number): void {
    const n = this.count + 1;
    // Kick-drift-kick: recompute a at the midpoint for bounded energy error.
    this.accelerations(this.x, this.y, this.ax, this.ay);
    for (let i = 0; i < n; i++) {
      this.vx[i] += this.ax[i] * dt * 0.5;
      this.vy[i] += this.ay[i] * dt * 0.5;
      this.px[i] = this.x[i];
      this.py[i] = this.y[i];
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
    }
    this.accelerations(this.x, this.y, this.ax, this.ay);
    for (let i = 0; i < n; i++) {
      this.vx[i] += this.ax[i] * dt * 0.5;
      this.vy[i] += this.ay[i] * dt * 0.5;
    }
  }

  private stepRK4(dt: number): void {
    const n = this.count + 1;
    // Classical RK4 on the first-order system (x' = v, v' = a(x)).
    // Stage 1: a(x)
    this.accelerations(this.x, this.y, this.k1ax, this.k1ay);
    for (let i = 0; i < n; i++) {
      this.k1px[i] = this.vx[i];
      this.k1py[i] = this.vy[i];
    }
    // Stage 2: a(x + dt/2 * k1p)
    for (let i = 0; i < n; i++) {
      this.tx[i] = this.x[i] + (this.k1px[i] * dt) / 2;
      this.ty[i] = this.y[i] + (this.k1py[i] * dt) / 2;
    }
    this.accelerations(this.tx, this.ty, this.k2ax, this.k2ay);
    for (let i = 0; i < n; i++) {
      this.k2px[i] = this.vx[i] + (this.k1ax[i] * dt) / 2;
      this.k2py[i] = this.vy[i] + (this.k1ay[i] * dt) / 2;
    }
    // Stage 3: a(x + dt/2 * k2p)
    for (let i = 0; i < n; i++) {
      this.tx[i] = this.x[i] + (this.k2px[i] * dt) / 2;
      this.ty[i] = this.y[i] + (this.k2py[i] * dt) / 2;
    }
    this.accelerations(this.tx, this.ty, this.k3ax, this.k3ay);
    for (let i = 0; i < n; i++) {
      this.k3px[i] = this.vx[i] + (this.k2ax[i] * dt) / 2;
      this.k3py[i] = this.vy[i] + (this.k2ay[i] * dt) / 2;
    }
    // Stage 4: a(x + dt * k3p)
    for (let i = 0; i < n; i++) {
      this.tx[i] = this.x[i] + this.k3px[i] * dt;
      this.ty[i] = this.y[i] + this.k3py[i] * dt;
    }
    this.accelerations(this.tx, this.ty, this.k4ax, this.k4ay);
    // Combine: k4p (position derivative) is v + dt * k3a.
    for (let i = 0; i < n; i++) {
      this.px[i] = this.x[i];
      this.py[i] = this.y[i];
      const dpx =
        (dt / 6) *
        (this.k1px[i] + 2 * this.k2px[i] + 2 * this.k3px[i] + (this.vx[i] + this.k3ax[i] * dt));
      const dpy =
        (dt / 6) *
        (this.k1py[i] + 2 * this.k2py[i] + 2 * this.k3py[i] + (this.vy[i] + this.k3ay[i] * dt));
      const dvx = (dt / 6) * (this.k1ax[i] + 2 * this.k2ax[i] + 2 * this.k3ax[i] + this.k4ax[i]);
      const dvy = (dt / 6) * (this.k1ay[i] + 2 * this.k2ay[i] + 2 * this.k3ay[i] + this.k4ay[i]);
      this.x[i] += dpx;
      this.y[i] += dpy;
      this.vx[i] += dvx;
      this.vy[i] += dvy;
    }
  }

  private totalEnergy(): number {
    const n = this.count + 1;
    let kinetic = 0;
    let potential = 0;
    const eps2 = this.softening * this.softening;
    for (let i = 0; i < n; i++) {
      kinetic += 0.5 * this.mass[i] * (this.vx[i] ** 2 + this.vy[i] ** 2);
      for (let j = i + 1; j < n; j++) {
        const dx = this.x[j] - this.x[i];
        const dy = this.y[j] - this.y[i];
        const r = Math.sqrt(dx * dx + dy * dy + eps2);
        potential -= (this.G * this.mass[i] * this.mass[j]) / r;
      }
    }
    return kinetic + potential;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors, alpha: number): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const n = this.count + 1;
    const showTrails = this.str("trails") === "on";
    if (showTrails) {
      ctx.lineWidth = 1;
      for (let i = 1; i < n; i++) {
        ctx.strokeStyle = theme.viz[1];
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        for (let t = 0; t < TRAIL_LENGTH; t++) {
          const idx = (this.trailHead + t) % TRAIL_LENGTH;
          const tx = this.trailX[i * TRAIL_LENGTH + idx];
          const ty = this.trailY[i * TRAIL_LENGTH + idx];
          if (t === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < n; i++) {
      let ix = this.px[i] + (this.x[i] - this.px[i]) * alpha;
      let iy = this.py[i] + (this.y[i] - this.py[i]) * alpha;
      if (Math.abs(ix - this.x[i]) > this.width / 2) ix = this.x[i];
      if (Math.abs(iy - this.y[i]) > this.height / 2) iy = this.y[i];
      if (i === 0) {
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.arc(ix, iy, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = theme.fg;
        ctx.fillRect(ix - 1, iy - 1, 2, 2);
      }
    }
  }

  getMetrics() {
    const drift = this.energy0 !== 0 ? ((this.energy - this.energy0) / Math.abs(this.energy0)) * 100 : 0;
    return {
      bodies: this.count + 1,
      integrator: this.str("integrator") === "leapfrog" ? "Leapfrog" : this.str("integrator") === "rk4" ? "RK4" : "Euler",
      time: `${this.time.toFixed(1)} s`,
      energyDrift: `${drift >= 0 ? "+" : ""}${drift.toFixed(3)} %`,
    };
  }

  describe(): string {
    const drift = this.energy0 !== 0 ? ((this.energy - this.energy0) / Math.abs(this.energy0)) * 100 : 0;
    return `${this.count} bodies orbiting a central mass; total energy has drifted ${drift.toFixed(2)}% since launch.`;
  }

  entities(): number {
    return this.count + 1;
  }
}
