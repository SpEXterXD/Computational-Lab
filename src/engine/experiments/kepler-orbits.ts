import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

/**
 * Kepler's laws, observed: a planet on an ellipse with adjustable
 * eccentricity around a central star. Equal-time wedges make the second law
 * (equal areas in equal times) visible, and the live numbers test the third.
 * Integrated in Cartesian coordinates with semi-implicit Euler substeps -
 * stable at perihelion for every eccentricity the slider offers.
 */
export class KeplerOrbitsExperiment extends BaseExperiment {
  readonly id = "kepler-orbits";

  private a = 150; // semi-major axis, px
  private ecc = 0.5;
  private x = 0;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private mu: number;
  private time = 0;
  private lastPeriod = 0;
  private periodClock = 0;
  private sweptAreas: number[] = [];
  private rNow = 0;

  constructor(mu = 2_000_000) {
    super();
    this.mu = mu;
  }

  protected params(): ParameterDef[] {
    return [
      { key: "ecc", label: "Eccentricity", min: 0, max: 0.85, step: 0.01, defaultValue: 0.5 },
      {
        key: "showWedges",
        label: "Equal-time wedges",
        options: [
          { value: "on", label: "On" },
          { value: "off", label: "Off" },
        ],
        defaultValue: "on",
      },
    ];
  }

  protected onReset(): void {
    this.ecc = this.num("ecc");
    this.a = Math.min(this.width, this.height) * 0.32;
    // Start at perihelion, moving purely tangentially (vis-viva).
    this.x = this.a * (1 - this.ecc);
    this.y = 0;
    this.vx = 0;
    this.vy = Math.sqrt((this.mu * (1 + this.ecc)) / (this.a * (1 - this.ecc)));
    this.time = 0;
    this.periodClock = 0;
    this.sweptAreas = [];
    this.rNow = this.x;
  }

  protected onParameterChange(key: string): void {
    this.reset();
    void key;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.reset();
  }

  /** Angular momentum per unit mass (conserved). */
  private angularMomentum(): number {
    return this.x * this.vy - this.y * this.vx;
  }

  private radius(): number {
    return Math.hypot(this.x, this.y);
  }

  protected onUpdate(dt: number): void {
    const sub = dt / 10;
    for (let s = 0; s < 10; s++) {
      const r = this.radius();
      const accel = -this.mu / (r * r * r);
      this.vx += accel * this.x * sub;
      this.vy += accel * this.y * sub;
      this.x += this.vx * sub;
      this.y += this.vy * sub;
    }
    this.time += dt;
    this.periodClock += dt;
    this.rNow = this.radius();
    if (this.y >= 0 && this.vy > 0 && this.x > 0 && this.periodClock > 0.1) {
      // Crossed +x moving upward: one revolution complete.
      this.lastPeriod = this.periodClock;
      this.periodClock = 0;
    }
    if (this.str("showWedges") === "on") {
      const areaRate = this.angularMomentum() / 2;
      this.sweptAreas.push(areaRate * dt);
      if (this.sweptAreas.length > 64) this.sweptAreas.shift();
    } else if (this.sweptAreas.length > 0) {
      this.sweptAreas = [];
    }
  }

  private focus(): { x: number; y: number } {
    return { x: this.width / 2, y: this.height / 2 };
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const focus = this.focus();
    // Analytic ellipse overlay
    ctx.strokeStyle = theme.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let deg = 0; deg <= 360; deg += 1) {
      const th = (deg * Math.PI) / 180;
      const rr = (this.a * (1 - this.ecc * this.ecc)) / (1 + this.ecc * Math.cos(th));
      const px = focus.x + rr * Math.cos(th);
      const py = focus.y - rr * Math.sin(th);
      if (deg === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // Star at the focus
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(focus.x, focus.y, 6, 0, Math.PI * 2);
    ctx.fill();
    // Planet + radius vector + wedges
    const px = focus.x + this.x;
    const py = focus.y - this.y;
    if (this.sweptAreas.length > 1) {
      ctx.fillStyle = theme.accent;
      let startAngle = Math.atan2(-this.y, this.x);
      for (let i = this.sweptAreas.length - 1; i >= 0; i--) {
        const area = this.sweptAreas[i];
        const r = Math.max(4, this.rNow);
        const dTheta = (2 * area) / (r * r);
        const a1 = startAngle;
        const a2 = startAngle - dTheta;
        ctx.globalAlpha = 0.06 + 0.12 * (i / this.sweptAreas.length);
        ctx.beginPath();
        ctx.moveTo(focus.x, focus.y);
        ctx.arc(focus.x, focus.y, r, a1, a2, true);
        ctx.closePath();
        ctx.fill();
        startAngle = a2;
      }
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = theme.fgSecondary;
    ctx.beginPath();
    ctx.moveTo(focus.x, focus.y);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.fillStyle = theme.fg;
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  getMetrics() {
    const t = this.lastPeriod > 0 ? this.lastPeriod : 0;
    const ratio = t > 0 ? (t * t) / this.a ** 3 : 0;
    return {
      eccentricity: this.ecc.toFixed(2),
      distance: `${(this.rNow / 10).toFixed(1)} Mm`,
      period: `${t.toFixed(2)} s`,
      t2_over_a3: ratio > 0 ? ratio.toExponential(3) : "measuring",
      angMomentum: this.angularMomentum().toFixed(0),
    };
  }

  describe(): string {
    return `A planet on an e=${this.ecc.toFixed(2)} ellipse; the shaded wedges are swept in equal times, so they all have equal area - Kepler's second law as a picture.`;
  }

  entities(): number {
    return 2;
  }
}
