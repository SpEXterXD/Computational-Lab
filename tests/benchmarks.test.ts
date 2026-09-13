/* eslint-disable @typescript-eslint/no-explicit-any -- benchmark harness reaches into internals like the engine tests */
import { describe, it } from "vitest";
import { AStarExperiment } from "@/engine/experiments/a-star";
import { BoidsExperiment } from "@/engine/experiments/boids";
import { GameOfLifeExperiment } from "@/engine/experiments/game-of-life";
import { HeatDiffusionExperiment } from "@/engine/experiments/heat-diffusion";
import { IntegratorComparisonExperiment } from "@/engine/experiments/rk4-vs-euler";
import { NBodyExperiment } from "@/engine/experiments/nbody";
import { ReactionDiffusionExperiment } from "@/engine/experiments/reaction-diffusion";
import { SortingExperiment } from "@/engine/experiments/sorting";

const W = 960;
const H = 600;

function setup<T>(experiment: T, w = W, h = H): any {
  (experiment as any).initialize(w, h);
  return experiment;
}

/**
 * Median-of-samples microbenchmarks for the per-tick hot loops. Run with
 * `npm run bench`; the recorded numbers live in EXPERIMENTS.md.
 */
function measure(name: string, tick: () => void, samples = 120): void {
  for (let i = 0; i < 20; i++) tick(); // warmup
  const times: number[] = [];
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    tick();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(samples / 2)];
  const p95 = times[Math.floor(samples * 0.95)];
  console.log(
    `BENCH ${name.padEnd(38)} median ${median.toFixed(3)} ms   p95 ${p95.toFixed(3)} ms`,
  );
}

describe("engine hot loops (per-tick cost, Node)", () => {
  it("records per-tick timings", { timeout: 120_000 }, () => {
    const life = setup(new GameOfLifeExperiment());
    measure("game-of-life 120x75 torus", () => life.update(1 / 60));

    const sort = setup(new SortingExperiment());
    sort.setParameter("size", 240);
    sort.setParameter("ops", 64);
    measure("sorting quick, 64 ops/tick", () => sort.update(1 / 60));

    const astar = setup(new AStarExperiment());
    astar.setParameter("rate", 30);
    measure("a-star, 30 expansions/tick", () => astar.update(1 / 60));

    const boids = setup(new BoidsExperiment());
    boids.setParameter("population", 400);
    measure("boids, 400 population", () => boids.update(1 / 60));

    const nbody = setup(new NBodyExperiment());
    nbody.setParameter("bodies", 160);
    measure("n-body leapfrog, 160 bodies", () => nbody.update(1 / 60));

    const heat = setup(new HeatDiffusionExperiment());
    heat.setParameter("resolution", "128");
    measure("heat-diffusion 128^2, 4 iterations", () => heat.update(1 / 60));

    const gs = setup(new ReactionDiffusionExperiment());
    measure("reaction-diffusion 96^2, 12 iterations", () => gs.update(1 / 60));

    const integrators = setup(new IntegratorComparisonExperiment());
    integrators.setParameter("steps", 40);
    measure("integrator comparison, 40 steps", () => integrators.update(1 / 60));
  });
});
