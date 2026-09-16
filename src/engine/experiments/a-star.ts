import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";

type Algorithm = "astar" | "dijkstra" | "greedy";

/**
 * Incremental informed search on a 4-connected grid. One tick expands a fixed
 * number of nodes, so stepping shows the frontier grow. Dijkstra (h = 0) and
 * greedy best-first (key = h) run through the same machinery for honest
 * comparison against A*.
 */
export class AStarExperiment extends BaseExperiment {
  readonly id = "a-star";

  private cols = 0;
  private rows = 0;
  private offsetX = 0;
  private offsetY = 0;
  private walls = new Uint8Array(0);
  private closed = new Uint8Array(0);
  private gScore = new Float32Array(0);
  private cameFrom = new Int32Array(0);
  private heapIndex = new Int32Array(0);
  private heap = new Int32Array(0);
  private heapKeys = new Float32Array(0);
  private heapSize = 0;
  private start = 0;
  private goal = 0;
  private status: "running" | "found" | "exhausted" = "running";
  private expanded = 0;
  private path: number[] = [];
  private current = -1;
  private paintWall: 0 | 1 = 1;
  private pointerDown = false;

  protected params(): ParameterDef[] {
    return [
      {
        key: "algorithm",
        label: "Algorithm",
        options: [
          { value: "astar", label: "A*" },
          { value: "dijkstra", label: "Dijkstra" },
          { value: "greedy", label: "Greedy best-first" },
        ],
        defaultValue: "astar",
      },
      {
        key: "heuristic",
        label: "Heuristic",
        options: [
          { value: "manhattan", label: "Manhattan" },
          { value: "euclidean", label: "Euclidean" },
          { value: "chebyshev", label: "Chebyshev" },
          { value: "octile", label: "Octile" },
        ],
        defaultValue: "manhattan",
      },
      { key: "cell", label: "Grid cell", min: 8, max: 24, step: 1, defaultValue: 14, unit: "px" },
      { key: "density", label: "Obstacle density", min: 0, max: 45, step: 1, defaultValue: 28, unit: "%" },
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
    this.closed = new Uint8Array(n);
    this.gScore = new Float32Array(n);
    this.cameFrom = new Int32Array(n);
    this.heapIndex = new Int32Array(n);
    this.heap = new Int32Array(n);
    this.heapKeys = new Float32Array(n);
    const density = this.num("density") / 100;
    for (let i = 0; i < n; i++) this.walls[i] = this.rng() < density ? 1 : 0;
    const startY = this.rows >> 1;
    const goalY = this.rows >> 1;
    this.start = startY * this.cols + 1;
    this.goal = goalY * this.cols + (this.cols - 2);
    this.walls[this.start] = 0;
    this.walls[this.goal] = 0;
    this.beginRun();
  }

  /** Re-run the search over the current walls without re-rolling the map. */
  private beginRun(): void {
    const n = this.cols * this.rows;
    this.closed.fill(0);
    this.gScore.fill(Infinity);
    this.cameFrom.fill(-1);
    this.heapSize = 0;
    for (let i = 0; i < n; i++) this.heapIndex[i] = -1;
    this.status = "running";
    this.expanded = 0;
    this.path = [];
    this.current = -1;
    this.gScore[this.start] = 0;
    this.push(this.start, this.keyFor(this.start, 0));
  }

  protected onParameterChange(key: string): void {
    if (key === "cell" || key === "density") this.reset();
    else if (key === "algorithm" || key === "heuristic" || key === "rate") this.beginRun();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.reset();
  }

  // --- binary min-heap keyed by f (or h for greedy) ---

  private push(node: number, key: number): void {
    let i = this.heapSize++;
    this.heap[i] = node;
    this.heapKeys[i] = key;
    this.heapIndex[node] = i;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heapKeys[parent] <= this.heapKeys[i]) break;
      this.swapEntries(i, parent);
      i = parent;
    }
  }

  private pop(): number {
    const top = this.heap[0];
    this.heapIndex[top] = -1;
    this.heapSize -= 1;
    if (this.heapSize > 0) {
      this.heap[0] = this.heap[this.heapSize];
      this.heapKeys[0] = this.heapKeys[this.heapSize];
      this.heapIndex[this.heap[0]] = 0;
      let i = 0;
      while (true) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.heapSize && this.heapKeys[left] < this.heapKeys[smallest]) smallest = left;
        if (right < this.heapSize && this.heapKeys[right] < this.heapKeys[smallest]) smallest = right;
        if (smallest === i) break;
        this.swapEntries(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private swapEntries(a: number, b: number): void {
    const node = this.heap[a];
    this.heap[a] = this.heap[b];
    this.heap[b] = node;
    const key = this.heapKeys[a];
    this.heapKeys[a] = this.heapKeys[b];
    this.heapKeys[b] = key;
    this.heapIndex[this.heap[a]] = a;
    this.heapIndex[this.heap[b]] = b;
  }

  private heuristic(node: number): number {
    const dx = Math.abs((node % this.cols) - (this.goal % this.cols));
    const dy = Math.abs(Math.floor(node / this.cols) - Math.floor(this.goal / this.cols));
    switch (this.str("heuristic")) {
      case "euclidean":
        return Math.sqrt(dx * dx + dy * dy);
      case "chebyshev":
        return Math.max(dx, dy);
      case "octile": {
        const min = Math.min(dx, dy);
        return dx + dy + (Math.SQRT2 - 2) * min;
      }
      default:
        return dx + dy; // manhattan
    }
  }

  private keyFor(node: number, g: number): number {
    const h = this.heuristic(node);
    const algorithm = this.str("algorithm") as Algorithm;
    if (algorithm === "dijkstra") return g;
    if (algorithm === "greedy") return h;
    return g + h;
  }

  protected onUpdate(): void {
    if (this.status !== "running") return;
    const rate = this.num("rate");
    for (let k = 0; k < rate && this.status === "running"; k++) this.expandOne();
  }

  private expandOne(): void {
    if (this.heapSize === 0) {
      this.status = "exhausted";
      return;
    }
    const node = this.pop();
    if (this.closed[node]) return;
    this.closed[node] = 1;
    this.current = node;
    this.expanded += 1;
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
    const stepCost = this.str("heuristic") === "euclidean" ? 1 : 1; // 4-connected: cost 1
    for (const next of neighbors) {
      if (next < 0 || this.walls[next] || this.closed[next]) continue;
      const tentative = this.gScore[node] + stepCost;
      if (tentative < this.gScore[next]) {
        this.gScore[next] = tentative;
        this.cameFrom[next] = node;
        this.push(next, this.keyFor(next, tentative));
      }
    }
  }

  private reconstruct(): void {
    this.path = [];
    let node = this.goal;
    while (node !== -1 && node !== this.start) {
      this.path.push(node);
      node = this.cameFrom[node];
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
        } else if (this.closed[node]) {
          ctx.fillStyle = theme.raised;
          ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
        }
      }
    }
    // Open set (frontier)
    ctx.fillStyle = theme.viz[1];
    for (let i = 0; i < this.heapSize; i++) {
      const node = this.heap[i];
      if (this.closed[node]) continue;
      const px = offsetX + (node % cols) * cell;
      const py = offsetY + Math.floor(node / cols) * cell;
      ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
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
    // Path
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
    // Markers
    ctx.fillStyle = theme.viz[2];
    ctx.fillRect(
      offsetX + (this.start % cols) * cell + 2,
      offsetY + Math.floor(this.start / cols) * cell + 2,
      cell - 4,
      cell - 4,
    );
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      offsetX + (this.goal % cols) * cell + 2,
      offsetY + Math.floor(this.goal / cols) * cell + 2,
      cell - 4,
      cell - 4,
    );
  }

  onPointer(state: PointerState): void {
    if (!state.inside || this.walls.length === 0) return;
    if (!state.down) {
      this.pointerDown = false;
      return;
    }
    const cell = this.num("cell");
    const x = Math.floor((state.x - this.offsetX) / cell);
    const y = Math.floor((state.y - this.offsetY) / cell);
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    const node = y * this.cols + x;
    if (node === this.start || node === this.goal) return;
    if (!this.pointerDown) {
      this.pointerDown = true;
      this.paintWall = this.walls[node] === 0 ? 1 : 0;
    }
    if (this.walls[node] !== this.paintWall) {
      this.walls[node] = this.paintWall;
      this.beginRun();
    }
  }

  getMetrics() {
    const algorithm = this.str("algorithm");
    const heuristic = this.str("heuristic");
    return {
      algorithm: algorithm === "astar" ? `A* (${heuristic})` : algorithm === "dijkstra" ? "Dijkstra" : "Greedy",
      openSet: this.heapSize,
      closedSet: this.expanded,
      pathLength: this.status === "found" ? this.path.length : "n/a",
      pathCost: this.status === "found" ? this.gScore[this.goal].toFixed(0) : "n/a",
      status:
        this.status === "found" ? "Path found" : this.status === "exhausted" ? "No path" : "Searching",
    };
  }

  describe(): string {
    if (this.status === "found") {
      return `Path found: ${this.path.length} cells long, cost ${this.gScore[this.goal].toFixed(0)} after expanding ${this.expanded} nodes.`;
    }
    if (this.status === "exhausted") {
      return "No path exists: the open set is empty and the goal was never reached.";
    }
    return `Searching: ${this.expanded} nodes expanded, ${this.heapSize} in the open set.`;
  }

  entities(): number {
    return this.cols * this.rows;
  }
}
