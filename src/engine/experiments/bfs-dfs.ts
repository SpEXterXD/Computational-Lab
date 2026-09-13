import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

/**
 * Breadth-first and depth-first traversal on the same walled grid the A*
 * experiment uses. BFS discovers shortest paths by layer; DFS dives - and
 * the metrics make the difference measurable rather than anecdotal.
 */
export class BfsDfsExperiment extends BaseExperiment {
  readonly id = "bfs-dfs";

  private cols = 0;
  private rows = 0;
  private offsetX = 0;
  private offsetY = 0;
  private walls = new Uint8Array(0);
  private visited = new Uint8Array(0);
  private queue: number[] = [];
  private parents = new Int32Array(0);
  private start = 0;
  private goal = 0;
  private status: "running" | "found" | "exhausted" = "running";
  private visitedCount = 0;
  private path: number[] = [];
  private current = -1;

  protected params(): ParameterDef[] {
    return [
      {
        key: "strategy",
        label: "Strategy",
        options: [
          { value: "bfs", label: "Breadth-first (queue)" },
          { value: "dfs", label: "Depth-first (stack)" },
        ],
        defaultValue: "bfs",
      },
      { key: "cell", label: "Grid cell", min: 8, max: 24, step: 1, defaultValue: 14, unit: "px" },
      { key: "density", label: "Wall density", min: 0, max: 45, step: 1, defaultValue: 28, unit: "%" },
      { key: "rate", label: "Expansions per tick", min: 1, max: 30, step: 1, defaultValue: 3 },
    ];
  }

  protected onReset(): void {
    this.cols = Math.max(10, Math.floor(this.width / this.num("cell")));
    this.rows = Math.max(10, Math.floor(this.height / this.num("cell")));
    this.offsetX = Math.floor((this.width - this.cols * this.num("cell")) / 2);
    this.offsetY = Math.floor((this.height - this.rows * this.num("cell")) / 2);
    const n = this.cols * this.rows;
    this.walls = new Uint8Array(n);
    this.visited = new Uint8Array(n);
    this.parents = new Int32Array(n).fill(-1);
    const density = this.num("density") / 100;
    for (let i = 0; i < n; i++) this.walls[i] = this.rng() < density ? 1 : 0;
    this.start = (this.rows >> 1) * this.cols + 1;
    this.goal = (this.rows >> 1) * this.cols + (this.cols - 2);
    this.walls[this.start] = 0;
    this.walls[this.goal] = 0;
    this.queue = [this.start];
    this.visited[this.start] = 1;
    this.visitedCount = 1;
    this.status = "running";
    this.path = [];
    this.current = -1;
  }

  protected onParameterChange(key: string): void {
    if (key === "cell" || key === "density") this.reset();
    else if (key === "strategy" || key === "rate") this.beginRun();
  }

  private beginRun(): void {
    const n = this.cols * this.rows;
    this.visited.fill(0);
    this.parents.fill(-1);
    this.queue = [this.start];
    this.visited[this.start] = 1;
    this.visitedCount = 1;
    this.status = "running";
    this.path = [];
    this.current = -1;
    void n;
  }

  protected onUpdate(): void {
    if (this.status !== "running") return;
    const rate = this.num("rate");
    for (let k = 0; k < rate && this.status === "running"; k++) this.expandOne();
  }

  private expandOne(): void {
    if (this.queue.length === 0) {
      this.status = "exhausted";
      return;
    }
    // BFS takes from the front (queue); DFS pops from the back (stack).
    const node = this.str("strategy") === "bfs" ? this.queue.shift()! : this.queue.pop()!;
    this.current = node;
    if (node === this.goal) {
      this.reconstruct();
      this.status = "found";
      return;
    }
    const x = node % this.cols;
    const y = (node / this.cols) | 0;
    const neighbors = [
      x > 0 ? node - 1 : -1,
      x < this.cols - 1 ? node + 1 : -1,
      y > 0 ? node - this.cols : -1,
      y < this.rows - 1 ? node + this.cols : -1,
    ];
    for (const next of neighbors) {
      if (next < 0 || this.walls[next] || this.visited[next]) continue;
      this.visited[next] = 1;
      this.parents[next] = node;
      this.visitedCount += 1;
      this.queue.push(next);
    }
  }

  private reconstruct(): void {
    this.path = [];
    let node = this.goal;
    while (node !== -1 && node !== this.start) {
      this.path.push(node);
      node = this.parents[node];
    }
    this.path.push(this.start);
    this.path.reverse();
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    const { cols, rows, offsetX, offsetY } = this;
    const cell = this.num("cell");
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const node = y * cols + x;
        const px = offsetX + x * cell;
        const py = offsetY + y * cell;
        if (this.walls[node]) {
          ctx.fillStyle = theme.fgTertiary;
          ctx.fillRect(px, py, cell - 1, cell - 1);
        } else if (this.visited[node]) {
          ctx.fillStyle = theme.raised;
          ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
        }
      }
    }
    ctx.fillStyle = theme.viz[1];
    for (const node of this.queue.slice(0, 4000)) {
      if (this.visited[node]) continue;
      ctx.fillRect(offsetX + (node % cols) * cell + 1, offsetY + Math.floor(node / cols) * cell + 1, cell - 2, cell - 2);
    }
    if (this.current >= 0 && this.status === "running") {
      ctx.fillStyle = theme.accentStrong;
      ctx.fillRect(
        offsetX + (this.current % cols) * cell + 1,
        offsetY + Math.floor(this.current / cols) * cell + 1,
        cell - 2,
        cell - 2,
      );
    }
    if (this.path.length > 1) {
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = Math.max(2, cell * 0.3);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < this.path.length; i++) {
        const node = this.path[i];
        const cx = offsetX + (node % cols) * cell + cell / 2;
        const cy = offsetY + Math.floor(node / cols) * cell + cell / 2;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    ctx.fillStyle = theme.viz[2];
    ctx.fillRect(offsetX + (this.start % cols) * cell + 2, offsetY + Math.floor(this.start / cols) * cell + 2, cell - 4, cell - 4);
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX + (this.goal % cols) * cell + 2, offsetY + Math.floor(this.goal / cols) * cell + 2, cell - 4, cell - 4);
  }

  getMetrics() {
    return {
      strategy: this.str("strategy") === "bfs" ? "BFS" : "DFS",
      visited: this.visitedCount,
      frontier: this.queue.length,
      pathLength: this.status === "found" ? this.path.length : "n/a",
      status: this.status === "found" ? "Found" : this.status === "exhausted" ? "No path" : "Searching",
    };
  }

  describe(): string {
    if (this.status === "found") {
      return `${this.str("strategy") === "bfs" ? "Breadth-first" : "Depth-first"} search reached the goal after visiting ${this.visitedCount} cells; path length ${this.path.length}.`;
    }
    if (this.status === "exhausted") return "No path exists; the frontier is empty.";
    return `${this.str("strategy") === "bfs" ? "Breadth-first" : "Depth-first"} search: ${this.visitedCount} cells visited, ${this.queue.length} in the frontier.`;
  }

  entities(): number {
    return this.cols * this.rows;
  }
}
