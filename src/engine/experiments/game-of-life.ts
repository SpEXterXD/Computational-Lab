import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, PointerState, ThemeColors } from "../core/types";

/**
 * Conway's Game of Life: B3/S23 on a bounded or wrapping grid.
 * Uint8Array double buffer; one tick is exactly one generation.
 */
export class GameOfLifeExperiment extends BaseExperiment {
  readonly id = "game-of-life";

  private cols = 0;
  private rows = 0;
  private offsetX = 0;
  private offsetY = 0;
  private cells = new Uint8Array(0);
  private next = new Uint8Array(0);
  private generation = 0;
  private population = 0;
  private births = 0;
  private deaths = 0;
  private paintValue = 1;

  protected params(): ParameterDef[] {
    return [
      { key: "cell", label: "Cell size", min: 5, max: 16, step: 1, defaultValue: 8, unit: "px" },
      { key: "density", label: "Initial density", min: 5, max: 60, step: 1, defaultValue: 24, unit: "%" },
      {
        key: "edges",
        label: "Edges",
        options: [
          { value: "wrap", label: "Wrap (torus)" },
          { value: "closed", label: "Closed" },
        ],
        defaultValue: "wrap",
      },
    ];
  }

  protected onReset(): void {
    this.cols = Math.max(8, Math.floor(this.width / this.num("cell")));
    this.rows = Math.max(8, Math.floor(this.height / this.num("cell")));
    this.offsetX = Math.floor((this.width - this.cols * this.num("cell")) / 2);
    this.offsetY = Math.floor((this.height - this.rows * this.num("cell")) / 2);
    this.cells = new Uint8Array(this.cols * this.rows);
    this.next = new Uint8Array(this.cols * this.rows);
    const density = this.num("density") / 100;
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = this.rng() < density ? 1 : 0;
    }
    this.generation = 0;
    this.population = this.countPopulation();
    this.births = 0;
    this.deaths = 0;
  }

  protected onParameterChange(key: string): void {
    if (key === "cell" || key === "density" || key === "edges") this.reset();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.reset();
  }

  private countPopulation(): number {
    let sum = 0;
    for (let i = 0; i < this.cells.length; i++) sum += this.cells[i];
    return sum;
  }

  protected onUpdate(): void {
    if (this.cells.length === 0) return;
    const { cols, rows, cells, next } = this;
    const wrap = this.str("edges") === "wrap";
    let population = 0;
    let births = 0;
    let deaths = 0;
    for (let y = 0; y < rows; y++) {
      const up = wrap ? (y - 1 + rows) % rows : y - 1;
      const down = wrap ? (y + 1) % rows : y + 1;
      for (let x = 0; x < cols; x++) {
        const left = wrap ? (x - 1 + cols) % cols : x - 1;
        const right = wrap ? (x + 1) % cols : x + 1;
        let n = 0;
        if (up >= 0) {
          if (left >= 0) n += cells[up * cols + left];
          n += cells[up * cols + x];
          if (right < cols) n += cells[up * cols + right];
        }
        if (left >= 0) n += cells[y * cols + left];
        if (right < cols) n += cells[y * cols + right];
        if (down < rows) {
          if (left >= 0) n += cells[down * cols + left];
          n += cells[down * cols + x];
          if (right < cols) n += cells[down * cols + right];
        }
        const alive = cells[y * cols + x];
        const live = alive === 1 ? n === 2 || n === 3 : n === 3;
        next[y * cols + x] = live ? 1 : 0;
        if (live && !alive) births++;
        if (!live && alive) deaths++;
        if (live) population++;
      }
    }
    this.cells.set(next);
    this.generation += 1;
    this.population = population;
    this.births = births;
    this.deaths = deaths;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    const { cols, rows, offsetX, offsetY } = this;
    const cell = this.num("cell");
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = theme.fg;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (this.cells[y * cols + x] === 1) {
          ctx.fillRect(offsetX + x * cell, offsetY + y * cell, cell - 1, cell - 1);
        }
      }
    }
  }

  onPointer(state: PointerState): void {
    if (!state.inside || this.cells.length === 0) return;
    const cell = this.num("cell");
    const x = Math.floor((state.x - this.offsetX) / cell);
    const y = Math.floor((state.y - this.offsetY) / cell);
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    if (state.down) {
      this.paintValue = this.cells[y * this.cols + x] === 1 ? 0 : 1;
    }
    if (this.cells[y * this.cols + x] !== this.paintValue) {
      this.cells[y * this.cols + x] = this.paintValue;
      this.population += this.paintValue === 1 ? 1 : -1;
    }
  }

  getMetrics() {
    return {
      generation: this.generation,
      population: this.population,
      births: this.births,
      deaths: this.deaths,
    };
  }

  describe(): string {
    return `Generation ${this.generation.toLocaleString("en-US")}, population ${this.population.toLocaleString("en-US")} live cells.`;
  }

  entities(): number {
    return this.cols * this.rows;
  }
}
