import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";

/**
 * 2-D raycasting shadows: a light follows the pointer, and every floor cell
 * casts a shadow if any wall cell blocks the ray between it and the light.
 * Rays are marched cell-by-cell with a DDA walk over the same walled-grid
 * structure the pathfinding experiments use.
 */
export class RaycastShadowsExperiment extends BaseExperiment {
  readonly id = "raycast-shadows";

  private n = 56;
  private cell = 0;
  private offsetX = 0;
  private offsetY = 0;
  private walls = new Uint8Array(0);
  private lit = new Uint8Array(0);
  private light = { x: 0.5, y: 0.5, set: false };
  private litCount = 0;
  private raysCast = 0;

  protected params(): ParameterDef[] {
    return [
      { key: "density", label: "Wall density", min: 5, max: 30, step: 1, defaultValue: 12, unit: "%" },
      { key: "radius", label: "Light range", min: 6, max: 50, step: 2, defaultValue: 28, unit: "cells" },
      {
        key: "regen",
        label: "Walls",
        options: [
          { value: "keep", label: "Keep" },
          { value: "regenerate", label: "Regenerate" },
        ],
        defaultValue: "keep",
      },
    ];
  }

  protected onReset(): void {
    this.n = 56;
    this.cell = Math.min(this.width, this.height) / this.n;
    this.offsetX = Math.floor((this.width - this.cell * this.n) / 2);
    this.offsetY = Math.floor((this.height - this.cell * this.n) / 2);
    this.walls = new Uint8Array(this.n * this.n);
    const density = this.num("density") / 100;
    for (let i = 0; i < this.walls.length; i++) {
      this.walls[i] = this.rng() < density ? 1 : 0;
    }
    // Light starts centered in a clear cell.
    this.light = { x: this.n / 2, y: this.n / 2, set: false };
    this.walls[this.clearNear(Math.floor(this.n / 2), Math.floor(this.n / 2))] = 0;
    this.computeLight();
  }

  private clearNear(x: number, y: number): number {
    for (let r = 0; r < 6; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx > 0 && ny > 0 && nx < this.n - 1 && ny < this.n - 1 && !this.walls[ny * this.n + nx]) {
            return ny * this.n + nx;
          }
        }
      }
    }
    return y * this.n + x;
  }

  protected onParameterChange(key: string): void {
    if (key === "density") this.reset();
    else if (key === "regen") {
      const value = this.str("regen");
      this.setInternalValue("regen", "keep");
      if (value === "regenerate") this.reset();
    }
  }

  protected onUpdate(): void {}

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.reset();
  }

  onPointer(state: PointerState): void {
    if (!state.inside) return;
    const gx = (state.x - this.offsetX) / this.cell;
    const gy = (state.y - this.offsetY) / this.cell;
    if (gx < 0 || gy < 0 || gx >= this.n || gy >= this.n) return;
    if (!this.walls[Math.floor(gy) * this.n + Math.floor(gx)]) {
      this.light = { x: gx, y: gy, set: true };
      this.computeLight();
    }
  }

  /** March a ray from (x0,y0) to (x1,y1) cell by cell (Amanatides-Woo DDA). */
  private rayBlocked(x0: number, y0: number, x1: number, y1: number): boolean {
    let cx = Math.floor(x0);
    let cy = Math.floor(y0);
    const tx = Math.floor(x1);
    const ty = Math.floor(y1);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    let tMaxX = dx !== 0 ? ((cx + (dx > 0 ? 1 : 0) - x0) / dx) : Infinity;
    let tMaxY = dy !== 0 ? ((cy + (dy > 0 ? 1 : 0) - y0) / dy) : Infinity;
    const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    let guard = 0;
    while ((cx !== tx || cy !== ty) && guard++ < this.n * 3) {
      if (tMaxX < tMaxY) {
        cx += stepX;
        tMaxX += tDeltaX;
      } else {
        cy += stepY;
        tMaxY += tDeltaY;
      }
      if (cx === tx && cy === ty) break;
      if (cx < 0 || cy < 0 || cx >= this.n || cy >= this.n) return true;
      if (this.walls[cy * this.n + cx]) return true;
    }
    return false;
  }

  private computeLight(): void {
    this.lit = new Uint8Array(this.n * this.n);
    this.litCount = 0;
    this.raysCast = 0;
    const lx = this.light.x;
    const ly = this.light.y;
    const radius = this.num("radius");
    const minX = Math.max(0, Math.floor(lx - radius));
    const maxX = Math.min(this.n - 1, Math.ceil(lx + radius));
    const minY = Math.max(0, Math.floor(ly - radius));
    const maxY = Math.min(this.n - 1, Math.ceil(ly + radius));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const i = y * this.n + x;
        if (this.walls[i]) continue;
        const dist = Math.hypot(x - lx, y - ly);
        if (dist > radius) continue;
        this.raysCast += 1;
        if (!this.rayBlocked(lx, ly, x + 0.5, y + 0.5)) {
          this.lit[i] = 1;
          this.litCount += 1;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    for (let y = 0; y < this.n; y++) {
      for (let x = 0; x < this.n; x++) {
        const i = y * this.n + x;
        const px = this.offsetX + x * this.cell;
        const py = this.offsetY + y * this.cell;
        if (this.walls[i]) {
          ctx.fillStyle = theme.fgTertiary;
          ctx.fillRect(px, py, this.cell - 1, this.cell - 1);
        } else {
          ctx.fillStyle = this.lit[i] ? theme.raised : theme.bg;
          ctx.fillRect(px, py, this.cell - 1, this.cell - 1);
          if (this.lit[i]) {
            ctx.fillStyle = theme.accent;
            ctx.globalAlpha = 0.12;
            ctx.fillRect(px, py, this.cell - 1, this.cell - 1);
            ctx.globalAlpha = 1;
          }
        }
      }
    }
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(this.offsetX + this.light.x * this.cell, this.offsetY + this.light.y * this.cell, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  getMetrics() {
    return {
      litCells: this.litCount.toLocaleString("en-US"),
      raysCast: this.raysCast.toLocaleString("en-US"),
      range: `${this.num("radius")} cells`,
      grid: `${this.n} x ${this.n}`,
    };
  }

  describe(): string {
    return `A light at (${this.light.x.toFixed(0)}, ${this.light.y.toFixed(0)}) casts ${this.raysCast.toLocaleString("en-US")} rays; ${this.litCount.toLocaleString("en-US")} floor cells are lit, the rest hide behind walls. Move the pointer to carry the light.`;
  }

  entities(): number {
    return this.n * this.n;
  }
}
