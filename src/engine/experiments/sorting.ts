import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

type Op = { t: "cmp"; i: number; j: number } | { t: "set"; i: number; v: number };

interface SortContext {
  arr: number[];
  aux: number[];
  comparisons: number;
  writes: number;
}

/**
 * Six comparison sorts driven as explicit operation generators, so "step"
 * advances a fixed number of real operations per tick. Correctness is
 * unit-tested for every algorithm.
 */
export class SortingExperiment extends BaseExperiment {
  readonly id = "sorting";

  private items: number[] = [];
  private ctx: SortContext = { arr: [], aux: [], comparisons: 0, writes: 0 };
  private generator: Generator<Op> | null = null;
  private done = false;
  private comparedIndex = -1;
  private comparedAgainst = -1;
  private lastPivot = 0;

  protected params(): ParameterDef[] {
    return [
      { key: "size", label: "Array size", min: 16, max: 240, step: 8, defaultValue: 96 },
      { key: "ops", label: "Operations per tick", min: 1, max: 60, step: 1, defaultValue: 4 },
      {
        key: "algorithm",
        label: "Algorithm",
        options: [
          { value: "bubble", label: "Bubble sort" },
          { value: "selection", label: "Selection sort" },
          { value: "insertion", label: "Insertion sort" },
          { value: "merge", label: "Merge sort" },
          { value: "quick", label: "Quick sort" },
          { value: "heap", label: "Heap sort" },
        ],
        defaultValue: "quick",
      },
    ];
  }

  protected onReset(): void {
    const size = this.num("size");
    this.items = new Array(size);
    for (let i = 0; i < size; i++) this.items[i] = i + 1;
    // Fisher-Yates with the seeded RNG: deterministic shuffle per seed.
    for (let i = size - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const tmp = this.items[i];
      this.items[i] = this.items[j];
      this.items[j] = tmp;
    }
    this.ctx = { arr: this.items, aux: new Array(size), comparisons: 0, writes: 0 };
    this.generator = this.buildGenerator(this.ctx, this.str("algorithm"));
    this.done = false;
    this.comparedIndex = -1;
    this.comparedAgainst = -1;
  }

  protected onParameterChange(key: string): void {
    if (key === "size" || key === "algorithm") this.reset();
  }

  private *compare(ctx: SortContext, i: number, j: number): Generator<Op> {
    ctx.comparisons += 1;
    yield { t: "cmp", i, j };
  }

  private *writeOp(ctx: SortContext, i: number, v: number): Generator<Op> {
    ctx.writes += 1;
    yield { t: "set", i, v };
  }

  private *swap(ctx: SortContext, i: number, j: number): Generator<Op> {
    ctx.writes += 2;
    const tmp = ctx.arr[i];
    yield { t: "set", i, v: ctx.arr[j] };
    yield { t: "set", i: j, v: tmp };
  }

  private *buildGenerator(ctx: SortContext, algorithm: string): Generator<Op> {
    const n = ctx.arr.length;
    switch (algorithm) {
      case "bubble": {
        for (let end = n - 1; end > 0; end--) {
          let swapped = false;
          for (let i = 0; i < end; i++) {
            yield* this.compare(ctx, i, i + 1);
            if (ctx.arr[i] > ctx.arr[i + 1]) {
              yield* this.swap(ctx, i, i + 1);
              swapped = true;
            }
          }
          if (!swapped) return;
        }
        return;
      }
      case "selection": {
        for (let i = 0; i < n - 1; i++) {
          let min = i;
          for (let j = i + 1; j < n; j++) {
            yield* this.compare(ctx, j, min);
            if (ctx.arr[j] < ctx.arr[min]) min = j;
          }
          if (min !== i) yield* this.swap(ctx, i, min);
        }
        return;
      }
      case "insertion": {
        for (let i = 1; i < n; i++) {
          const key = ctx.arr[i];
          let j = i - 1;
          while (j >= 0) {
            yield* this.compare(ctx, j, j + 1);
            if (ctx.arr[j] <= key) break;
            yield* this.writeOp(ctx, j + 1, ctx.arr[j]);
            j -= 1;
          }
          if (j + 1 !== i) yield* this.writeOp(ctx, j + 1, key);
        }
        return;
      }
      case "merge":
        yield* this.mergeSort(ctx, 0, n - 1);
        return;
      case "quick": {
        const stack: [number, number][] = [[0, n - 1]];
        while (stack.length) {
          const [lo, hi] = stack.pop()!;
          if (lo >= hi) continue;
          const pivotIndex = yield* this.partition(ctx, lo, hi);
          stack.push([lo, pivotIndex - 1]);
          stack.push([pivotIndex + 1, hi]);
        }
        return;
      }
      case "heap": {
        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) yield* this.siftDown(ctx, i, n);
        for (let end = n - 1; end > 0; end--) {
          yield* this.swap(ctx, 0, end);
          yield* this.siftDown(ctx, 0, end);
        }
        return;
      }
      default:
        return;
    }
  }

  private *partition(ctx: SortContext, lo: number, hi: number): Generator<Op, number> {
    // Median-of-three pivot selection keeps the demo honest on sorted inputs.
    const mid = (lo + hi) >> 1;
    yield* this.compare(ctx, lo, mid);
    if (ctx.arr[mid] < ctx.arr[lo]) yield* this.swap(ctx, mid, lo);
    yield* this.compare(ctx, mid, hi);
    if (ctx.arr[hi] < ctx.arr[mid]) yield* this.swap(ctx, mid, hi);
    yield* this.compare(ctx, lo, mid);
    if (ctx.arr[mid] < ctx.arr[lo]) yield* this.swap(ctx, mid, lo);
    yield* this.swap(ctx, mid, hi);
    const pivot = ctx.arr[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      yield* this.compare(ctx, j, hi);
      if (ctx.arr[j] < pivot) {
        if (i !== j) yield* this.swap(ctx, i, j);
        i += 1;
      }
    }
    if (i !== hi) yield* this.swap(ctx, i, hi);
    return i;
  }

  private *mergeSort(ctx: SortContext, lo: number, hi: number): Generator<Op> {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    yield* this.mergeSort(ctx, lo, mid);
    yield* this.mergeSort(ctx, mid + 1, hi);
    let i = lo;
    let j = mid + 1;
    let k = lo;
    while (i <= mid && j <= hi) {
      yield* this.compare(ctx, i, j);
      ctx.aux[k++] = ctx.arr[i] <= ctx.arr[j] ? ctx.arr[i++] : ctx.arr[j++];
    }
    while (i <= mid) ctx.aux[k++] = ctx.arr[i++];
    while (j <= hi) ctx.aux[k++] = ctx.arr[j++];
    for (let t = lo; t <= hi; t++) {
      if (ctx.arr[t] !== ctx.aux[t]) yield* this.writeOp(ctx, t, ctx.aux[t]);
    }
  }

  private *siftDown(ctx: SortContext, root: number, end: number): Generator<Op> {
    while (true) {
      const left = root * 2 + 1;
      const right = left + 1;
      if (left >= end) return;
      let largest = root;
      yield* this.compare(ctx, left, largest);
      if (ctx.arr[left] > ctx.arr[largest]) largest = left;
      if (right < end) {
        yield* this.compare(ctx, right, largest);
        if (ctx.arr[right] > ctx.arr[largest]) largest = right;
      }
      if (largest === root) return;
      yield* this.swap(ctx, root, largest);
      root = largest;
    }
  }

  protected onUpdate(): void {
    if (this.done || !this.generator) return;
    const opsPerTick = this.num("ops");
    for (let i = 0; i < opsPerTick; i++) {
      const op = this.generator.next();
      if (op.done) {
        this.done = true;
        this.comparedIndex = -1;
        this.comparedAgainst = -1;
        break;
      }
      const value = op.value;
      if (value.t === "cmp") {
        this.comparedIndex = value.i;
        this.comparedAgainst = value.j;
      } else {
        this.items[value.i] = value.v;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    const n = this.items.length;
    if (n === 0) return;
    const gap = n > 160 ? 0 : Math.max(1, Math.floor(this.width / n / 8));
    const barWidth = this.width / n - gap;
    for (let i = 0; i < n; i++) {
      const h = (this.items[i] / n) * (this.height - 8);
      const x = i * (barWidth + gap);
      let color = theme.fgSecondary;
      if (this.done) color = theme.accent;
      else if (i === this.comparedIndex) color = theme.accent;
      else if (i === this.comparedAgainst) color = theme.accentStrong;
      ctx.fillStyle = color;
      ctx.fillRect(x, this.height - h, barWidth, h);
    }
  }

  getMetrics() {
    let orderedPairs = 0;
    for (let i = 1; i < this.items.length; i++) {
      if (this.items[i - 1] <= this.items[i]) orderedPairs += 1;
    }
    const orderPercent =
      this.items.length > 1 ? (orderedPairs / (this.items.length - 1)) * 100 : 100;
    return {
      algorithm: this.labelFor(this.str("algorithm")),
      comparisons: this.ctx.comparisons,
      writes: this.ctx.writes,
      order: `${orderPercent.toFixed(1)} %`,
      status: this.done ? "Sorted" : "Running",
    };
  }

  private labelFor(value: string): string {
    const def = this.getParameters().find((p) => p.key === "algorithm");
    if (def && "options" in def) {
      return def.options.find((o) => o.value === value)?.label ?? value;
    }
    return value;
  }

  describe(): string {
    if (this.done) {
      return `Sorted with ${this.labelFor(this.str("algorithm"))} after ${this.ctx.comparisons.toLocaleString("en-US")} comparisons and ${this.ctx.writes.toLocaleString("en-US")} array writes.`;
    }
    return `${this.labelFor(this.str("algorithm"))} in progress: ${this.ctx.comparisons.toLocaleString("en-US")} comparisons so far.`;
  }

  entities(): number {
    return this.items.length;
  }
}
