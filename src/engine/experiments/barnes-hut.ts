import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

const CAPACITY = 320;

/**
 * Barnes-Hut: build a quadtree over the bodies each tick and approximate
 * distant clusters by their center of mass when the node's size/distance
 * ratio falls below theta. The accuracy metric compares the total force
 * against a direct O(n^2) sum sampled periodically.
 */
export class BarnesHutExperiment extends BaseExperiment {
  readonly id = "barnes-hut";

  private count = 0;
  private x = new Float32Array(CAPACITY);
  private y = new Float32Array(CAPACITY);
  private vx = new Float32Array(CAPACITY);
  private vy = new Float32Array(CAPACITY);
  private fx = new Float32Array(CAPACITY);
  private fy = new Float32Array(CAPACITY);
  // Quadtree in flat arrays: node -> children (4), center of mass, mass, bounds.
  private nodeChild = new Int32Array(0);
  private nodeMass = new Float64Array(0);
  private nodeComX = new Float64Array(0);
  private nodeComY = new Float64Array(0);
  private nodeX = new Float64Array(0);
  private nodeY = new Float64Array(0);
  private nodeSize = new Float64Array(0);
  private nodeBody = new Int32Array(0);
  private nextBody = new Int32Array(CAPACITY);
  private nodeCount = 0;
  private directFx = new Float32Array(0);
  private directFy = new Float32Array(0);
  private forceError = 0;
  private directTick = 0;

  protected params(): ParameterDef[] {
    return [
      { key: "bodies", label: "Bodies", min: 60, max: 320, step: 20, defaultValue: 180 },
      { key: "theta", label: "Opening angle theta", min: 0.2, max: 1.4, step: 0.1, defaultValue: 0.8 },
      {
        key: "showTree",
        label: "Show quadtree",
        options: [
          { value: "off", label: "Off" },
          { value: "on", label: "On" },
        ],
        defaultValue: "off",
      },
    ];
  }

  private readonly G = 9000;
  private readonly softening = 4;

  protected onReset(): void {
    this.count = this.num("bodies");
    for (let i = 0; i < this.count; i++) {
      // Spiral galaxy initial condition.
      const arm = i % 3;
      const radius = 20 + (i / this.count) * Math.min(this.width, this.height) * 0.44;
      const angle = radius * 0.02 + (arm * Math.PI * 2) / 3 + (this.rng() - 0.5) * 0.6;
      this.x[i] = this.width / 2 + Math.cos(angle) * radius;
      this.y[i] = this.height / 2 + Math.sin(angle) * radius;
      const v = Math.sqrt((this.G * 60 * (i / this.count + 0.3)) / radius);
      this.vx[i] = -Math.sin(angle) * v;
      this.vy[i] = Math.cos(angle) * v;
    }
    this.directFx = new Float32Array(this.count);
    this.directFy = new Float32Array(this.count);
  }

  protected onParameterChange(key: string): void {
    if (key === "bodies") this.reset();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.reset();
  }

  /**
   * Insert one body into the quadtree. Leaves hold linked lists of bodies;
   * a leaf with more than one body subdivides (depth-capped), so coincident
   * positions never drop mass from the tree.
   */
  private insert(body: number): void {
    let node = 0;
    let depth = 0;
    while (this.nodeBody[node] === -2) {
      depth += 1;
      const q = this.quadrant(node, this.x[body], this.y[body]);
      if (this.nodeChild[node * 4 + q] === -1) {
        this.nodeChild[node * 4 + q] = this.newNode(
          this.childX(node, q),
          this.childY(node, q),
          this.nodeSize[node] / 2,
        );
      }
      node = this.nodeChild[node * 4 + q];
    }
    this.placeInLeaf(node, body, depth);
  }

  private placeInLeaf(node: number, body: number, depth: number): void {
    this.nextBody[body] = this.nodeBody[node];
    this.nodeBody[node] = body;
    if (depth >= 48 || this.listLength(node) <= 1) return;
    // Subdivide: detach the list, mark internal, re-place every body.
    let b = this.nodeBody[node];
    const list: number[] = [];
    while (b !== -1) {
      list.push(b);
      b = this.nextBody[b];
    }
    this.nodeBody[node] = -2;
    for (const bb of list) {
      const q = this.quadrant(node, this.x[bb], this.y[bb]);
      if (this.nodeChild[node * 4 + q] === -1) {
        this.nodeChild[node * 4 + q] = this.newNode(
          this.childX(node, q),
          this.childY(node, q),
          this.nodeSize[node] / 2,
        );
      }
      this.placeInLeaf(this.nodeChild[node * 4 + q], bb, depth + 1);
    }
  }

  private listLength(node: number): number {
    let n = 0;
    for (let b = this.nodeBody[node]; b !== -1; b = this.nextBody[b]) n += 1;
    return n;
  }

  private newNode(x: number, y: number, size: number): number {
    if (this.nodeCount >= this.nodeMass.length) {
      const grow = <T extends Float64Array | Int32Array>(arr: T, minLen: number): T => {
        const next = new (arr.constructor as { new(length: number): T })(Math.max(minLen, arr.length * 2));
        next.set(arr);
        return next;
      };
      this.nodeChild = grow(this.nodeChild, 64).fill(-1, this.nodeCount * 4);
      this.nodeMass = grow(this.nodeMass, 16);
      this.nodeComX = grow(this.nodeComX, 16);
      this.nodeComY = grow(this.nodeComY, 16);
      this.nodeX = grow(this.nodeX, 16);
      this.nodeY = grow(this.nodeY, 16);
      this.nodeSize = grow(this.nodeSize, 16);
      this.nodeBody = grow(this.nodeBody, 16);
    }
    const id = this.nodeCount++;
    this.nodeChild[id * 4] = -1;
    this.nodeChild[id * 4 + 1] = -1;
    this.nodeChild[id * 4 + 2] = -1;
    this.nodeChild[id * 4 + 3] = -1;
    this.nodeMass[id] = 0;
    this.nodeX[id] = x;
    this.nodeY[id] = y;
    this.nodeSize[id] = size;
    this.nodeBody[id] = -1;
    return id;
  }

  private quadrant(node: number, x: number, y: number): number {
    const half = this.nodeSize[node] / 2;
    const right = x > this.nodeX[node] + half;
    const bottom = y > this.nodeY[node] + half;
    return (right ? 1 : 0) + (bottom ? 2 : 0);
  }

  private childX(node: number, q: number): number {
    return this.nodeX[node] + (q % 2 === 1 ? this.nodeSize[node] / 2 : 0);
  }

  private childY(node: number, q: number): number {
    return this.nodeY[node] + (q >= 2 ? this.nodeSize[node] / 2 : 0);
  }

  private computeMass(node: number): void {
    if (this.nodeBody[node] >= 0) {
      let mass = 0;
      let comX = 0;
      let comY = 0;
      for (let b = this.nodeBody[node]; b !== -1; b = this.nextBody[b]) {
        mass += 1;
        comX += this.x[b];
        comY += this.y[b];
      }
      this.nodeMass[node] = mass;
      this.nodeComX[node] = comX / mass;
      this.nodeComY[node] = comY / mass;
      return;
    }
    let mass = 0;
    let comX = 0;
    let comY = 0;
    for (let q = 0; q < 4; q++) {
      const child = this.nodeChild[node * 4 + q];
      if (child === -1) continue;
      this.computeMass(child);
      mass += this.nodeMass[child];
      comX += this.nodeMass[child] * this.nodeComX[child];
      comY += this.nodeMass[child] * this.nodeComY[child];
    }
    this.nodeMass[node] = mass;
    this.nodeComX[node] = mass > 0 ? comX / mass : this.nodeX[node];
    this.nodeComY[node] = mass > 0 ? comY / mass : this.nodeY[node];
  }

  /** Accumulate force on body i by walking the tree with the theta criterion. */
  private treeForce(i: number, node: number): void {
    if (this.nodeMass[node] === 0) return;
    // Leaves are always resolved exactly, body by body.
    if (this.nodeBody[node] >= 0) {
      for (let b = this.nodeBody[node]; b !== -1; b = this.nextBody[b]) {
        if (b === i) continue;
        const ddx = this.x[b] - this.x[i];
        const ddy = this.y[b] - this.y[i];
        const dd = Math.sqrt(ddx * ddx + ddy * ddy + this.softening * this.softening);
        const force = (this.G * 1) / (dd * dd * dd);
        this.fx[i] += ddx * force;
        this.fy[i] += ddy * force;
      }
      return;
    }
    const dx = this.nodeComX[node] - this.x[i];
    const dy = this.nodeComY[node] - this.y[i];
    const d = Math.sqrt(dx * dx + dy * dy + this.softening * this.softening);
    // Far internal node: one center-of-mass interaction.
    if (this.nodeSize[node] / d < this.num("theta")) {
      const force = (this.G * this.nodeMass[node]) / (d * d * d);
      this.fx[i] += dx * force;
      this.fy[i] += dy * force;
      return;
    }
    for (let q = 0; q < 4; q++) {
      const child = this.nodeChild[node * 4 + q];
      if (child !== -1) this.treeForce(i, child);
    }
  }

  private directForce(): void {
    for (let i = 0; i < this.count; i++) {
      let fxi = 0;
      let fyi = 0;
      for (let j = 0; j < this.count; j++) {
        if (j === i) continue;
        const dx = this.x[j] - this.x[i];
        const dy = this.y[j] - this.y[i];
        const d = Math.sqrt(dx * dx + dy * dy + this.softening * this.softening);
        const s = (this.G * 1) / (d * d * d);
        fxi += dx * s;
        fyi += dy * s;
      }
      this.directFx[i] = fxi;
      this.directFy[i] = fyi;
    }
  }

  protected onUpdate(dt: number): void {
    // Root bounds must enclose every body, or the tree's s/d criterion lies.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < this.count; i++) {
      if (this.x[i] < minX) minX = this.x[i];
      if (this.y[i] < minY) minY = this.y[i];
      if (this.x[i] > maxX) maxX = this.x[i];
      if (this.y[i] > maxY) maxY = this.y[i];
    }
    const span = Math.max(maxX - minX, maxY - minY) * 1.05 + 1;
    this.nodeChild = new Int32Array(this.count * 8 * 4).fill(-1);
    this.nodeMass = new Float64Array(this.count * 8);
    this.nodeComX = new Float64Array(this.count * 8);
    this.nodeComY = new Float64Array(this.count * 8);
    this.nodeX = new Float64Array(this.count * 8);
    this.nodeY = new Float64Array(this.count * 8);
    this.nodeSize = new Float64Array(this.count * 8);
    this.nodeBody = new Int32Array(this.count * 8).fill(-1);
    this.nodeCount = 0;
    this.newNode(minX, minY, span);
    for (let i = 0; i < this.count; i++) this.insert(i);
    this.computeMass(0);

    // Forces first, for every body, at this tick's positions...
    for (let i = 0; i < this.count; i++) {
      this.fx[i] = 0;
      this.fy[i] = 0;
      this.treeForce(i, 0);
    }
    // ...so the periodic audit compares direct and tree forces on the SAME
    // positions - never a stale sample from before the bodies moved.
    this.directTick += 1;
    if (this.directTick % 90 === 0) {
      this.directForce();
      let err = 0;
      let total = 0;
      for (let i = 0; i < this.count; i++) {
        err += Math.hypot(this.fx[i] - this.directFx[i], this.fy[i] - this.directFy[i]);
        total += Math.hypot(this.directFx[i], this.directFy[i]);
      }
      this.forceError = total > 0 ? err / total : 0;
    }
    for (let i = 0; i < this.count; i++) {
      this.vx[i] += this.fx[i] * dt;
      this.vy[i] += this.fy[i] * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    if (this.str("showTree") === "on") {
      ctx.strokeStyle = theme.line;
      ctx.lineWidth = 1;
      for (let node = 1; node < this.nodeCount; node++) {
        ctx.strokeRect(this.nodeX[node], this.nodeY[node], this.nodeSize[node], this.nodeSize[node]);
      }
    }
    for (let i = 0; i < this.count; i++) {
      ctx.fillStyle = i % 24 === 0 ? theme.accent : theme.fg;
      ctx.fillRect(this.x[i] - 1.2, this.y[i] - 1.2, 2.4, 2.4);
    }
  }

  getMetrics() {
    return {
      bodies: this.count,
      quadtreeNodes: this.nodeCount.toLocaleString("en-US"),
      theta: this.num("theta").toFixed(1),
      forceError: `${(this.forceError * 100).toFixed(2)} %`,
    };
  }

  describe(): string {
    return `${this.count} bodies under Barnes-Hut gravity: a ${this.nodeCount.toLocaleString("en-US")}-node quadtree approximates distant clusters within opening angle ${this.num("theta").toFixed(1)}, measured force error ${(this.forceError * 100).toFixed(2)}%.`;
  }

  entities(): number {
    return this.count;
  }
}
