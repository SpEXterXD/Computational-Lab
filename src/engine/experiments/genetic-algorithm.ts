import { BaseExperiment } from "../core/base-experiment";
import type { ParameterDef, ThemeColors } from "../core/types";

/**
 * Genetic algorithm optimizing over a rugged 2-D landscape:
 * tournament selection, blend crossover, gaussian mutation, elitism.
 * The population dots on the heatmap ARE the algorithm's state.
 */
export class GeneticAlgorithmExperiment extends BaseExperiment {
  readonly id = "genetic-algorithm";

  private popX = new Float64Array(0);
  private popY = new Float64Array(0);
  private fitness = new Float64Array(0);
  private popSize = 0;
  private generation = 0;
  private bestFitness = 0;
  private meanFitness = 0;
  private history: number[] = [];

  protected params(): ParameterDef[] {
    return [
      { key: "population", label: "Population", min: 20, max: 200, step: 10, defaultValue: 80 },
      { key: "mutation", label: "Mutation sigma", min: 0.005, max: 0.15, step: 0.005, defaultValue: 0.04 },
      { key: "elitism", label: "Elites kept", min: 1, max: 10, step: 1, defaultValue: 3 },
      { key: "generations", label: "Generations per tick", min: 1, max: 10, step: 1, defaultValue: 1 },
    ];
  }

  /** Rugged multi-peak landscape in [0,1]^2. */
  private landscape(x: number, y: number): number {
    const peak = (cx: number, cy: number, s: number, amp: number) =>
      amp * Math.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s)));
    return (
      peak(0.28, 0.3, 0.09, 1) +
      peak(0.72, 0.62, 0.12, 0.86) +
      peak(0.6, 0.2, 0.05, 0.6) +
      peak(0.2, 0.78, 0.07, 0.5) +
      0.12 * Math.sin(x * 21) * Math.cos(y * 18)
    );
  }

  protected onReset(): void {
    this.popSize = this.num("population");
    this.popX = new Float64Array(this.popSize);
    this.popY = new Float64Array(this.popSize);
    this.fitness = new Float64Array(this.popSize);
    for (let i = 0; i < this.popSize; i++) {
      this.popX[i] = this.rng();
      this.popY[i] = this.rng();
      this.fitness[i] = this.landscape(this.popX[i], this.popY[i]);
    }
    this.generation = 0;
    this.history = [];
    this.evaluate();
  }

  protected onParameterChange(key: string): void {
    if (key !== "generations") this.reset();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  private evaluate(): void {
    let best = -Infinity;
    let sum = 0;
    for (let i = 0; i < this.popSize; i++) {
      this.fitness[i] = this.landscape(this.popX[i], this.popY[i]);
      best = Math.max(best, this.fitness[i]);
      sum += this.fitness[i];
    }
    this.bestFitness = best;
    this.meanFitness = sum / this.popSize;
  }

  private tournament(k = 3): number {
    let best = Math.floor(this.rng() * this.popSize);
    for (let i = 1; i < k; i++) {
      const challenger = Math.floor(this.rng() * this.popSize);
      if (this.fitness[challenger] > this.fitness[best]) best = challenger;
    }
    return best;
  }

  protected onUpdate(): void {
    const elites = Math.min(this.num("elitism"), this.popSize - 1);
    const sigma = this.num("mutation");
    const generations = this.num("generations");
    for (let g = 0; g < generations; g++) {
      // Rank indices by fitness.
      const order = Array.from({ length: this.popSize }, (_, i) => i);
      order.sort((a, b) => this.fitness[b] - this.fitness[a]);
      const nextX = new Float64Array(this.popSize);
      const nextY = new Float64Array(this.popSize);
      // Elitism: carry the best unchanged.
      for (let e = 0; e < elites; e++) {
        nextX[e] = this.popX[order[e]];
        nextY[e] = this.popY[order[e]];
      }
      for (let i = elites; i < this.popSize; i++) {
        const pa = this.tournament();
        const pb = this.tournament();
        // Blend crossover.
        const alpha = this.rng();
        let x = alpha * this.popX[pa] + (1 - alpha) * this.popX[pb];
        let y = alpha * this.popY[pa] + (1 - alpha) * this.popY[pb];
        // Gaussian mutation.
        x += (this.rng() + this.rng() + this.rng() - 1.5) * sigma;
        y += (this.rng() + this.rng() + this.rng() - 1.5) * sigma;
        nextX[i] = Math.min(1, Math.max(0, x));
        nextY[i] = Math.min(1, Math.max(0, y));
      }
      this.popX = nextX;
      this.popY = nextY;
      this.generation += 1;
      this.evaluate();
      this.history.push(this.bestFitness);
      if (this.history.length > 400) this.history.shift();
    }
  }

  onPointer(): void {}

  render(ctx: CanvasRenderingContext2D, theme: ThemeColors): void {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    // Landscape heatmap (low-res blocks)
    const cells = 44;
    const cw = this.width / cells;
    const ch = this.height / cells;
    let min = Infinity;
    let max = -Infinity;
    const grid = new Float64Array(cells * cells);
    for (let gy = 0; gy < cells; gy++) {
      for (let gx = 0; gx < cells; gx++) {
        const value = this.landscape((gx + 0.5) / cells, (gy + 0.5) / cells);
        grid[gy * cells + gx] = value;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
    for (let gy = 0; gy < cells; gy++) {
      for (let gx = 0; gx < cells; gx++) {
        const t = (grid[gy * cells + gx] - min) / (max - min);
        const alpha = 0.06 + t * 0.3;
        ctx.fillStyle = t > 0.72 ? theme.accent : theme.fgSecondary;
        ctx.globalAlpha = alpha;
        ctx.fillRect(gx * cw, gy * ch, cw + 0.5, ch + 0.5);
      }
    }
    ctx.globalAlpha = 1;
    // Population
    for (let i = 0; i < this.popSize; i++) {
      const rank = this.fitness[i] >= this.bestFitness - 1e-9;
      ctx.fillStyle = rank ? theme.accent : theme.fg;
      ctx.beginPath();
      ctx.arc(this.popX[i] * this.width, this.popY[i] * this.height, rank ? 3.6 : 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Best-fitness history (bottom strip)
    if (this.history.length > 2) {
      ctx.strokeStyle = theme.viz[1];
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      let lo = Infinity;
      let hi = -Infinity;
      for (const h of this.history) {
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
      }
      const span = Math.max(1e-6, hi - lo);
      for (let i = 0; i < this.history.length; i++) {
        const x = (i / (this.history.length - 1)) * this.width;
        const y = this.height - 8 - ((this.history[i] - lo) / span) * 26;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  getMetrics() {
    return {
      generation: this.generation,
      best: this.bestFitness.toFixed(4),
      mean: this.meanFitness.toFixed(4),
      mutation: this.num("mutation").toFixed(3),
    };
  }

  describe(): string {
    return `Generation ${this.generation}: the best of ${this.popSize} candidates reaches fitness ${this.bestFitness.toFixed(3)} on the rugged landscape.`;
  }

  entities(): number {
    return this.popSize;
  }
}
