import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

/**
 * Langton's ant: a two-dimensional Turing machine. One tick applies a fixed
 * number of move rules. Simple, deterministic, and a perfect demonstration
 * that computed behavior can look designed without being designed.
 */
export class LangtonAntExperiment extends BaseExperiment {
  readonly id = "langton-ant";

  private cols = 0;
  private rows = 0;
  private offsetX = 0;
  private offsetY = 0;
  private cells = new Uint8Array(0);
  private x = 0;
  private y = 0;
  private dir = 0; // 0 up, 1 right, 2 down, 3 left
  private steps = 0;
  private blackCells = 0;

  protected params(): ParameterDef[] {
    return [
      { key: "cell", label: "Cell size", min: 3, max: 12, step: 1, defaultValue: 6, unit: "px" },
      { key: "rate", label: "Steps per tick", min: 1, max: 100, step: 1, defaultValue: 8 },
      { key: "density", label: "Initial noise", min: 0, max: 30, step: 1, defaultValue: 0, unit: "%" },
      {
        key: "edges",
        label: "Edges",
        options: [
          { value: "wrap", label: "Wrap (torus)" },
          { value: "closed", label: "Bounce" },
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
    const density = this.num("density") / 100;
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = this.rng() < density ? 1 : 0;
    }
    this.x = this.cols >> 1;
    this.y = this.rows >> 1;
    this.dir = 0;
    this.steps = 0;
    this.blackCells = 0;
    for (let i = 0; i < this.cells.length; i++) this.blackCells += this.cells[i];
  }

  protected onParameterChange(key: string): void {
    if (key !== "rate") this.reset();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.reset();
  }

  protected onUpdate(): void {
    const rate = this.num("rate");
    const wrap = this.str("edges") === "wrap";
    for (let s = 0; s < rate; s++) {
      const i = this.y * this.cols + this.x;
      const black = this.cells[i] === 1;
      // Turn right on black, left on white; then flip the cell and move.
      this.dir = (this.dir + (black ? 1 : 3)) % 4;
      this.cells[i] = black ? 0 : 1;
      this.blackCells += black ? -1 : 1;
      if (this.dir === 0) this.y -= 1;
      else if (this.dir === 1) this.x += 1;
      else if (this.dir === 2) this.y += 1;
      else this.x -= 1;
      if (wrap) {
        this.x = (this.x + this.cols) % this.cols;
        this.y = (this.y + this.rows) % this.rows;
      } else {
        if (this.x < 0 || this.y < 0 || this.x >= this.cols || this.y >= this.rows) {
          // Bounce back into the grid and reverse.
          this.x = Math.min(this.cols - 1, Math.max(0, this.x));
          this.y = Math.min(this.rows - 1, Math.max(0, this.y));
          this.dir = (this.dir + 2) % 4;
        }
      }
      this.steps += 1;
    }
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
    ctx.fillStyle = theme.accent;
    ctx.fillRect(offsetX + this.x * cell, offsetY + this.y * cell, cell - 1, cell - 1);
  }

  getMetrics() {
    return {
      steps: this.steps,
      blackCells: this.blackCells,
      position: `${this.x}, ${this.y}`,
      heading: ["up", "right", "down", "left"][this.dir],
    };
  }

  describe(): string {
    return `The ant has taken ${this.steps.toLocaleString("en-US")} steps and flipped ${this.blackCells.toLocaleString("en-US")} cells to black.`;
  }

  entities(): number {
    return this.cols * this.rows;
  }
}
