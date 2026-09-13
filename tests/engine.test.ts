/* eslint-disable @typescript-eslint/no-explicit-any -- white-box engine tests reach into internals by design */
import { describe, expect, it } from "vitest";
import { AStarExperiment } from "@/engine/experiments/a-star";
import { BoidsExperiment } from "@/engine/experiments/boids";
import { DoublePendulumExperiment } from "@/engine/experiments/double-pendulum";
import { GameOfLifeExperiment } from "@/engine/experiments/game-of-life";
import { HeatDiffusionExperiment } from "@/engine/experiments/heat-diffusion";
import { IntegratorComparisonExperiment } from "@/engine/experiments/rk4-vs-euler";
import { LangtonAntExperiment } from "@/engine/experiments/langton-ant";
import { NBodyExperiment } from "@/engine/experiments/nbody";
import { ReactionDiffusionExperiment } from "@/engine/experiments/reaction-diffusion";
import { SortingExperiment } from "@/engine/experiments/sorting";
import { TaylorSeriesExperiment } from "@/engine/experiments/taylor-series";

const W = 640;
const H = 400;

function make<T>(experiment: T, w = W, h = H): T {
  (experiment as any).initialize(w, h);
  return experiment;
}

describe("Game of Life", () => {
  it("keeps a block still and blinks a blinker with period 2", () => {
    const life: any = make(new GameOfLifeExperiment());
    const { cols } = life;
    life.cells.fill(0);
    for (const [x, y] of [[10, 10], [11, 10], [10, 11], [11, 11]] as const) {
      life.cells[y * cols + x] = 1;
    }
    for (const [x, y] of [[20, 20], [21, 20], [22, 20]] as const) {
      life.cells[y * cols + x] = 1;
    }
    life.update(1 / 60);
    expect(life.cells[10 * cols + 10]).toBe(1);
    expect(life.cells[11 * cols + 11]).toBe(1);
    expect(life.cells[20 * cols + 21]).toBe(1); // blinker rotated to vertical
    expect(life.cells[20 * cols + 20]).toBe(0); // horizontal ends died
    life.update(1 / 60);
    expect(life.cells[20 * cols + 20]).toBe(1); // horizontal again
  });

  it("translates a glider one cell diagonally every four generations", () => {
    const life: any = make(new GameOfLifeExperiment());
    const { cols } = life;
    life.cells.fill(0);
    // Standard glider (moves down-right): .O. / ..O / OOO
    for (const [x, y] of [[11, 10], [12, 11], [10, 12], [11, 12], [12, 12]] as const) {
      life.cells[y * cols + x] = 1;
    }
    let population = 0;
    for (let i = 0; i < life.cells.length; i++) population += life.cells[i];
    expect(population).toBe(5);
    expect(life.cells[11 * cols + 12]).toBe(1);
    for (let gen = 0; gen < 4; gen++) life.update(1 / 60);
    population = 0;
    for (let i = 0; i < life.cells.length; i++) population += life.cells[i];
    expect(population).toBe(5);
    expect(life.cells[12 * cols + 13]).toBe(1); // translated by (+1, +1)
    expect(life.cells[13 * cols + 13]).toBe(1);
  });

  it("reproduces the same state from the same seed", () => {
    const a: any = make(new GameOfLifeExperiment(7));
    const b: any = make(new GameOfLifeExperiment(7));
    for (let i = 0; i < 30; i++) {
      a.update(1 / 60);
      b.update(1 / 60);
    }
    expect(Buffer.from(a.cells.buffer)).toEqual(Buffer.from(b.cells.buffer));
  });
});

describe("Sorting", () => {
  const algorithms = ["bubble", "selection", "insertion", "merge", "quick", "heap"] as const;

  for (const algorithm of algorithms) {
    it(`sorts with ${algorithm} and counts real operations`, () => {
      const sort: any = make(new SortingExperiment());
      sort.setParameter("size", 64);
      sort.setParameter("algorithm", algorithm);
      let guard = 0;
      while (!String(sort.getMetrics().status).includes("Sorted") && guard++ < 400_000) {
        sort.update(1 / 60);
      }
      const values: number[] = sort.items;
      for (let i = 1; i < values.length; i++) {
        expect(values[i - 1]).toBeLessThanOrEqual(values[i]);
      }
      expect(values.length).toBe(64);
      expect(sort.ctx.comparisons).toBeGreaterThan(0);
    });
  }

  it("produces identical operation counts for the same seed", () => {
    const run = () => {
      const sort: any = make(new SortingExperiment(42));
      sort.setParameter("size", 48);
      sort.setParameter("algorithm", "quick");
      let guard = 0;
      while (!String(sort.getMetrics().status).includes("Sorted") && guard++ < 400_000) {
        sort.update(1 / 60);
      }
      return { comparisons: sort.ctx.comparisons, writes: sort.ctx.writes };
    };
    expect(run()).toEqual(run());
  });
});

describe("A* / Dijkstra / Greedy", () => {
  it("finds the optimal path on a known wall layout", () => {
    const astar: any = make(new AStarExperiment());
    astar.walls.fill(0);
    const gapRow = 1;
    for (let y = 0; y < astar.rows; y++) {
      if (y !== gapRow) astar.walls[y * astar.cols + Math.floor(astar.cols / 2)] = 1;
    }
    astar.beginRun();
    let guard = 0;
    while (astar.status === "running" && guard++ < 200_000) astar.update(1 / 60);
    expect(astar.status).toBe("found");
    // Optimal route: start (1, mid) -> wall gap (cols/2, 1) -> goal (cols-2, mid).
    const startY = Math.floor(astar.rows / 2);
    const wallX = Math.floor(astar.cols / 2);
    const goalX = astar.cols - 2;
    const distance =
      (wallX - 1) + (startY - gapRow) + (goalX - wallX) + (startY - gapRow);
    expect(astar.path.length).toBe(distance + 1);
    expect(astar.gScore[astar.goal]).toBe(distance);
  });

  it("matches Dijkstra cost, beats it on expansions, and greedy is not always optimal", () => {
    const results: Record<string, { cost: number; expanded: number }> = {};
    for (const algorithm of ["astar", "dijkstra", "greedy"] as const) {
      const search: any = make(new AStarExperiment(11));
      search.setParameter("algorithm", algorithm);
      let guard = 0;
      while (search.status === "running" && guard++ < 400_000) search.update(1 / 60);
      results[algorithm] = { cost: search.gScore[search.goal], expanded: search.expanded };
    }
    expect(results.astar.cost).toBe(results.dijkstra.cost);
    expect(results.greedy.cost).toBeGreaterThanOrEqual(results.astar.cost);
    expect(results.astar.expanded).toBeLessThanOrEqual(results.dijkstra.expanded);
  });

  it("restarts the search when the pointer paints a wall", () => {
    const astar: any = make(new AStarExperiment());
    astar.onPointer({ x: 200, y: 200, down: true, inside: true });
    expect(astar.status).toBe("running");
    expect(astar.expanded).toBeLessThanOrEqual(1);
  });
});

describe("Boids", () => {
  it("keeps speeds bounded, positions inside, and order in [0, 1]", () => {
    const boids: any = make(new BoidsExperiment());
    for (let i = 0; i < 240; i++) boids.update(1 / 60);
    for (let i = 0; i < boids.count; i++) {
      const speed = Math.hypot(boids.vx[i], boids.vy[i]);
      expect(speed).toBeLessThanOrEqual(110 + 1e-6);
      expect(boids.x[i]).toBeGreaterThanOrEqual(0);
      expect(boids.x[i]).toBeLessThan(W);
    }
    expect(boids.orderSum).toBeGreaterThanOrEqual(0);
    expect(boids.orderSum).toBeLessThanOrEqual(1);
  });

  it("is deterministic for the same seed", () => {
    const a: any = make(new BoidsExperiment(5));
    const b: any = make(new BoidsExperiment(5));
    for (let i = 0; i < 60; i++) {
      a.update(1 / 60);
      b.update(1 / 60);
    }
    expect(a.x[0]).toBeCloseTo(b.x[0], 5);
    expect(a.y[3]).toBeCloseTo(b.y[3], 5);
  });
});

describe("Double pendulum", () => {
  it("conserves energy with RK4 to within 1e-4 relative over 2000 chaotic steps", () => {
    const pendulum: any = make(new DoublePendulumExperiment());
    const e0 = pendulum.energy(pendulum.th1, pendulum.th2, pendulum.w1, pendulum.w2);
    for (let i = 0; i < 2000; i++) pendulum.update(1 / 240);
    const e1 = pendulum.energy(pendulum.th1, pendulum.th2, pendulum.w1, pendulum.w2);
    // Non-symplectic RK4 on a chaotic system: drift must stay tiny, not zero.
    expect(Math.abs((e1 - e0) / e0)).toBeLessThan(1e-4);
  });

  it("diverges the 1e-6-rad shadow twin measurably within 60 simulated seconds", () => {
    const pendulum: any = make(new DoublePendulumExperiment());
    for (let i = 0; i < 60 * 120; i++) pendulum.update(1 / 120);
    expect(Math.abs(pendulum.s1 - pendulum.th1)).toBeGreaterThan(0.01);
  });
});

describe("Heat diffusion", () => {
  it("conserves total energy on insulated boundaries", () => {
    const heat: any = make(new HeatDiffusionExperiment());
    heat.setParameter("boundary", "insulated");
    heat.u.fill(0);
    heat.u[(heat.n >> 1) * heat.n + (heat.n >> 1)] = 1;
    const totalBefore = heat.u.reduce((a: number, b: number) => a + b, 0);
    for (let i = 0; i < 400; i++) heat.update(1 / 60);
    const totalAfter = heat.u.reduce((a: number, b: number) => a + b, 0);
    expect(Math.abs(totalAfter - totalBefore)).toBeLessThan(1e-6);
  });

  it("relaxes to the empty state when edges are held at zero", () => {
    const heat: any = make(new HeatDiffusionExperiment());
    heat.setParameter("resolution", "64");
    heat.setParameter("boundary", "fixed");
    for (let i = 0; i < 8000; i++) heat.update(1 / 60);
    expect(Math.max(...heat.u)).toBeLessThan(1e-2);
  });
});

describe("Reaction-diffusion", () => {
  it("keeps both concentrations inside [0, 1]", () => {
    const gs: any = make(new ReactionDiffusionExperiment());
    for (let i = 0; i < 200; i++) gs.update(1 / 60);
    for (let i = 0; i < gs.u.length; i++) {
      expect(gs.u[i]).toBeGreaterThanOrEqual(0);
      expect(gs.u[i]).toBeLessThanOrEqual(1);
      expect(gs.v[i]).toBeGreaterThanOrEqual(0);
      expect(gs.v[i]).toBeLessThanOrEqual(1);
    }
  });

  it("applies a preset by writing both rate parameters", () => {
    const gs: any = make(new ReactionDiffusionExperiment());
    gs.setParameter("preset", "mitosis");
    expect(gs.num("feed")).toBeCloseTo(0.0367, 4);
    expect(gs.num("kill")).toBeCloseTo(0.0649, 4);
  });
});

describe("Langton's ant", () => {
  it("flips the cell and turns right on white", () => {
    const ant: any = make(new LangtonAntExperiment());
    ant.cells.fill(0);
    ant.setParameter("rate", 1);
    const index = ant.y * ant.cols + ant.x;
    expect(ant.cells[index]).toBe(0);
    ant.update(1 / 60);
    expect(ant.cells[index]).toBe(1);
    expect(ant.steps).toBe(1);
    expect(ant.dir).toBe(3); // white cell: turn left
  });
});

describe("Integrator comparison", () => {
  it("keeps RK4 error orders below forward Euler error", () => {
    const bench: any = make(new IntegratorComparisonExperiment());
    bench.setParameter("dt", 0.01);
    for (let i = 0; i < 60; i++) bench.update(1 / 60);
    expect(bench.errorRk4).toBeLessThan(bench.errorEuler);
    expect(bench.errorRk4).toBeLessThan(1e-9);
    expect(bench.errorEuler).toBeGreaterThan(1e-4);
  });
});

describe("Taylor series", () => {
  it("tightens the error at the marker as terms are added", () => {
    const taylor: any = make(new TaylorSeriesExperiment());
    taylor.setParameter("fn", "sin");
    const errorAtMarker = (terms: number) => {
      taylor.setParameter("terms", terms);
      return Number(taylor.getMetrics().errorAtMarker);
    };
    const few = errorAtMarker(5); // |2|^7/7! remainder ~ 2.5e-2 at x=2
    const many = errorAtMarker(13); // |2|^13/13! ~ 1.3e-6 (odd-term slider)
    expect(many).toBeGreaterThan(0);
    expect(many).toBeLessThan(few);
    expect(many).toBeLessThan(5e-6);
  });
});

describe("N-body", () => {
  it("keeps leapfrog energy drift bounded over 600 steps", () => {
    const nbody: any = make(new NBodyExperiment());
    nbody.setParameter("bodies", 60);
    for (let i = 0; i < 600; i++) nbody.update(1 / 60);
    const drift = Math.abs((nbody.energy - nbody.energy0) / Math.abs(nbody.energy0));
    expect(drift).toBeLessThan(0.02);
  });
});

describe("Parameter validation", () => {
  it("clamps sliders to their range and validates select options", () => {
    const sort: any = make(new SortingExperiment());
    sort.setParameter("size", 9999);
    expect(sort.num("size")).toBe(240);
    expect(() => sort.setParameter("algorithm", "bogus")).toThrow(RangeError);
    expect(() => sort.setParameter("missing", 1)).toThrow(/Unknown parameter/);
  });
});
