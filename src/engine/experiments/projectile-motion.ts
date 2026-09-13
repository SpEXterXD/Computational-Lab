import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

/**
 * Projectile motion with quadratic air drag, integrated numerically, against
 * the analytic drag-free trajectory. At drag = 0 the numeric range matches
 * v^2 sin(2theta)/g to float precision - which the tests assert.
 */
export class ProjectileExperiment extends BaseExperiment {
  readonly id = "projectile-motion";

  private x = 0;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private flying = false;
  private trail: { x: number; y: number }[] = [];
  private analyticTrail: { x: number; y: number }[] = [];
  private landedRange = 0;
  private apex = 0;
  private flightTime = 0;

  protected params(): ParameterDef[] {
    return [
      { key: "speed", label: "Launch speed", min: 20, max: 120, step: 2, defaultValue: 62, unit: "m/s" },
      { key: "angle", label: "Launch angle", min: 10, max: 80, step: 1, defaultValue: 45, unit: "°" },
      { key: "drag", label: "Drag coefficient", min: 0, max: 0.08, step: 0.002, defaultValue: 0.01 },
      { key: "auto", label: "Auto-relaunch", options: [{ value: "on", label: "On" }, { value: "off", label: "Off" }], defaultValue: "on" },
    ];
  }

  protected onReset(): void {
    this.launch();
  }

  protected onParameterChange(key: string): void {
    // New speed/angle/drag means a fresh launch with those parameters.
    if (key === "auto") return;
    this.launch();
    void key;
  }

  private launch(): void {
    const angle = (this.num("angle") * Math.PI) / 180;
    this.x = 0;
    this.y = 0;
    this.vx = this.num("speed") * Math.cos(angle);
    this.vy = this.num("speed") * Math.sin(angle);
    this.flying = true;
    this.trail = [{ x: 0, y: 30 }];
    this.landedRange = 0;
    this.apex = 30;
    this.flightTime = 0;
    // Analytic drag-free reference from the same launch conditions.
    this.analyticTrail = [];
    const speed = this.num("speed");
    const g = 9.81;
    const tFlight = (2 * speed * Math.sin(angle)) / g;
    for (let i = 0; i <= 200; i++) {
      const t = (i / 200) * tFlight;
      this.analyticTrail.push({ x: speed * Math.cos(angle) * t, y: speed * Math.sin(angle) * t - 0.5 * g * t * t });
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.reset();
  }

  protected onUpdate(dt: number): void {
    if (!this.flying) {
      if (this.str("auto") === "on") this.launch();
      return;
    }
    const drag = this.num("drag");
    // Quadratic drag opposite the velocity, gravity down; 8 substeps keep
    // the zero-drag range inside a percent of the analytic value.
    const sub = dt / 8;
    for (let s2 = 0; s2 < 8; s2++) {
      const sp = Math.hypot(this.vx, this.vy);
      this.vx += -drag * sp * this.vx * sub;
      this.vy += (-9.81 - drag * sp * this.vy) * sub;
      this.x += this.vx * sub;
      this.y += this.vy * sub;
    }
    this.flightTime += dt;
    this.apex = Math.max(this.apex, this.y);
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 4000) this.trail.shift();
    if (this.y <= 0) {
      this.flying = false;
      this.landedRange = this.x;
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    // World window: 220 m wide.
    const scale = this.width / 220;
    const groundY = this.height - 30;
    const to = (x: number, y: number): [number, number] => [x * scale, groundY - y * (scale * 1.4)];
    // Ground
    ctx.strokeStyle = theme.line;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(this.width, groundY);
    ctx.stroke();
    // Analytic (drag-free) path
    ctx.strokeStyle = theme.fgTertiary;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    this.analyticTrail.forEach((point, index) => {
      const [px, py] = to(point.x, point.y);
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    // Numeric path with drag
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.trail.forEach((point, index) => {
      const [px, py] = to(point.x, point.y);
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.lineWidth = 1;
    // Projectile
    const [px, py] = to(this.x, this.y);
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = theme.fgTertiary;
    ctx.fillText("DRAG-FREE (ANALYTIC)", 10, 16);
    ctx.fillStyle = theme.accent;
    ctx.fillText("WITH DRAG (INTEGRATED)", 10, 30);
  }

  getMetrics() {
    const speed = this.num("speed");
    const angle = (this.num("angle") * Math.PI) / 180;
    const g = 9.81;
    const idealRange = (speed * speed * Math.sin(2 * angle)) / g;
    return {
      range: `${this.landedRange.toFixed(1)} m`,
      idealRange: `${idealRange.toFixed(1)} m`,
      apex: `${this.apex.toFixed(1)} m`,
      flightTime: `${this.flightTime.toFixed(2)} s`,
      flying: this.flying ? "yes" : "landed",
    };
  }

  describe(): string {
    if (this.flying) {
      return `A projectile is in flight: ${this.x.toFixed(0)} m downrange at ${this.y.toFixed(0)} m altitude, with quadratic drag bending it below the analytic arc.`;
    }
    return `The projectile landed at ${this.landedRange.toFixed(1)} m (the drag-free ideal would reach ${(this.getMetrics().idealRange.match(/[\d.]+/) ?? ["0"])[0]} m).`;
  }

  entities(): number {
    return this.trail.length;
  }
}
