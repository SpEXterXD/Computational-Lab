import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

interface Obstacle {
  x: number;
  y: number;
  r: number;
}

/**
 * Rapidly-exploring random trees on a obstacle field. Plain RRT grows toward
 * random samples; RRT* additionally rewires neighbors through cheaper
 * parents, and the cost metric shows the difference accumulating.
 */
export class RrtExperiment extends BaseExperiment {
  readonly id = "rrt-rrt-star";

  private xs = new Float64Array(0);
  private ys = new Float64Array(0);
  private parents = new Int32Array(0);
  private costs = new Float64Array(0);
  private nodeCount = 0;
  private obstacles: Obstacle[] = [];
  private status: "growing" | "reached" = "growing";
  private goalPath: number[] = [];
  private bestCost = Infinity;
  private samplesUsed = 0;
  private readonly start = { x: 0.06, y: 0.5 };
  private readonly goal = { x: 0.94, y: 0.5 };
  private readonly goalRadius = 26;

  protected params(): ParameterDef[] {
    return [
      {
        key: "mode",
        label: "Variant",
        options: [
          { value: "rrt", label: "RRT" },
          { value: "rrt-star", label: "RRT*" },
        ],
        defaultValue: "rrt-star",
      },
      { key: "samples", label: "Samples per tick", min: 1, max: 20, step: 1, defaultValue: 4 },
      { key: "step", label: "Step size", min: 10, max: 60, step: 2, defaultValue: 26, unit: "px" },
      { key: "obstacles", label: "Obstacle count", min: 0, max: 14, step: 1, defaultValue: 7 },
    ];
  }

  protected onReset(): void {
    const capacity = 6000;
    this.xs = new Float64Array(capacity);
    this.ys = new Float64Array(capacity);
    this.parents = new Int32Array(capacity).fill(-1);
    this.costs = new Float64Array(capacity);
    this.nodeCount = 1;
    this.xs[0] = this.start.x * this.width;
    this.ys[0] = this.start.y * this.height;
    this.obstacles = [];
    for (let i = 0; i < this.num("obstacles"); i++) {
      this.obstacles.push({
        x: (0.2 + this.rng() * 0.6) * this.width,
        y: this.rng() * this.height,
        r: 20 + this.rng() * 46,
      });
    }
    this.status = "growing";
    this.goalPath = [];
    this.bestCost = Infinity;
    this.samplesUsed = 0;
  }

  protected onParameterChange(key: string): void {
    if (key !== "samples") this.reset();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.reset();
  }

  private segmentHitsObstacle(x1: number, y1: number, x2: number, y2: number): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    for (const o of this.obstacles) {
      let t = ((o.x - x1) * dx + (o.y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const cx = x1 + t * dx;
      const cy = y1 + t * dy;
      if ((cx - o.x) ** 2 + (cy - o.y) ** 2 < o.r * o.r) return true;
    }
    return false;
  }

  private nearest(x: number, y: number): number {
    let best = 0;
    let bestD2 = Infinity;
    for (let i = 0; i < this.nodeCount; i++) {
      const d2 = (this.xs[i] - x) ** 2 + (this.ys[i] - y) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = i;
      }
    }
    return best;
  }

  protected onUpdate(): void {
    if (this.status !== "growing" || this.nodeCount >= this.xs.length - 8) return;
    const stepSize = this.num("step");
    const mode = this.str("mode");
    const samples = this.num("samples");
    for (let s = 0; s < samples && this.status === "growing"; s++) {
      this.samplesUsed += 1;
      // Goal bias: 8% of samples aim straight at the goal.
      const tx = this.rng() < 0.08 ? this.goal.x * this.width : this.rng() * this.width;
      const ty = this.rng() < 0.08 ? this.goal.y * this.height : this.rng() * this.height;
      const near = this.nearest(tx, ty);
      const dx = tx - this.xs[near];
      const dy = ty - this.ys[near];
      const dist = Math.hypot(dx, dy) || 1;
      const nx = this.xs[near] + (dx / dist) * Math.min(stepSize, dist);
      const ny = this.ys[near] + (dy / dist) * Math.min(stepSize, dist);
      if (nx < 2 || ny < 2 || nx > this.width - 2 || ny > this.height - 2) continue;
      if (this.segmentHitsObstacle(this.xs[near], this.ys[near], nx, ny)) continue;

      const i = this.nodeCount++;
      if (mode === "rrt") {
        this.xs[i] = nx;
        this.ys[i] = ny;
        this.parents[i] = near;
        this.costs[i] = this.costs[near] + Math.hypot(nx - this.xs[near], ny - this.ys[near]);
      } else {
        // RRT*: choose the best parent among neighbors, then rewire them.
        const rewireRadius = stepSize * 2.4;
        let bestParent = near;
        let bestCost = this.costs[near] + Math.hypot(nx - this.xs[near], ny - this.ys[near]);
        for (let j = 0; j < this.nodeCount; j++) {
          const dj = Math.hypot(this.xs[j] - nx, this.ys[j] - ny);
          if (dj > rewireRadius) continue;
          if (this.segmentHitsObstacle(this.xs[j], this.ys[j], nx, ny)) continue;
          const candidate = this.costs[j] + dj;
          if (candidate < bestCost) {
            bestCost = candidate;
            bestParent = j;
          }
        }
        this.xs[i] = nx;
        this.ys[i] = ny;
        this.parents[i] = bestParent;
        this.costs[i] = bestCost;
        for (let j = 0; j < this.nodeCount - 1; j++) {
          const dj = Math.hypot(this.xs[j] - nx, this.ys[j] - ny);
          if (dj > rewireRadius || j === bestParent) continue;
          if (this.segmentHitsObstacle(nx, ny, this.xs[j], this.ys[j])) continue;
          const candidate = this.costs[i] + dj;
          if (candidate < this.costs[j]) {
            this.parents[j] = i;
            this.costs[j] = candidate;
          }
        }
      }
      const distToGoal = Math.hypot(nx - this.goal.x * this.width, ny - this.goal.y * this.height);
      if (distToGoal < this.goalRadius) {
        this.status = "reached";
        this.bestCost = this.costs[i] + distToGoal;
        let node = i;
        this.goalPath = [i];
        while (node !== 0) {
          node = this.parents[node];
          this.goalPath.push(node);
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = theme.fgTertiary;
    for (const o of this.obstacles) {
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = theme.fgSecondary;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < this.nodeCount; i++) {
      ctx.moveTo(this.xs[this.parents[i]], this.ys[this.parents[i]]);
      ctx.lineTo(this.xs[i], this.ys[i]);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (this.goalPath.length > 1) {
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let k = 0; k < this.goalPath.length; k++) {
        const i = this.goalPath[k];
        if (k === 0) ctx.moveTo(this.xs[i], this.ys[i]);
        else ctx.lineTo(this.xs[i], this.ys[i]);
      }
      ctx.stroke();
    }
    ctx.fillStyle = theme.viz[2];
    ctx.beginPath();
    ctx.arc(this.xs[0], this.ys[0], 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(this.goal.x * this.width, this.goal.y * this.height, this.goalRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  getMetrics() {
    return {
      mode: this.str("mode") === "rrt" ? "RRT" : "RRT*",
      nodes: this.nodeCount.toLocaleString("en-US"),
      samples: this.samplesUsed.toLocaleString("en-US"),
      pathCost: this.bestCost === Infinity ? "n/a" : this.bestCost.toFixed(0),
      status: this.status === "reached" ? "Goal reached" : "Growing",
    };
  }

  describe(): string {
    if (this.status === "reached") {
      return `${this.str("mode") === "rrt" ? "RRT" : "RRT*"} reached the goal region with ${this.nodeCount} nodes; best path cost ${this.bestCost.toFixed(0)}.`;
    }
    return `${this.str("mode") === "rrt" ? "RRT" : "RRT*"} is growing: ${this.nodeCount} nodes from ${this.samplesUsed} samples.`;
  }

  entities(): number {
    return this.nodeCount;
  }
}
