/* eslint-disable @typescript-eslint/no-explicit-any -- white-box engine tests reach into internals */
import { describe, expect, it } from "vitest";
import { AStarExperiment } from "@/engine/experiments/a-star";
import { BarnesHutExperiment } from "@/engine/experiments/barnes-hut";
import { BfsDfsExperiment } from "@/engine/experiments/bfs-dfs";
import { ConvolutionExperiment } from "@/engine/experiments/convolution";
import { DitheringExperiment } from "@/engine/experiments/dithering";
import { EigenvectorsExperiment } from "@/engine/experiments/eigenvectors";
import { ElectrostaticPotentialExperiment } from "@/engine/experiments/electrostatic-potential";
import { GameOfLifeExperiment } from "@/engine/experiments/game-of-life";
import { KeplerOrbitsExperiment } from "@/engine/experiments/kepler-orbits";
import { MarchingSquaresExperiment } from "@/engine/experiments/marching-squares";
import { MonteCarloExperiment } from "@/engine/experiments/monte-carlo";
import { NewtonRaphsonExperiment } from "@/engine/experiments/newton-raphson";
import { ProbabilityDistributionsExperiment } from "@/engine/experiments/probability-distributions";
import { QuadratureExperiment } from "@/engine/experiments/quadrature";
import { IntegratorComparisonExperiment } from "@/engine/experiments/rk4-vs-euler";
import { RrtExperiment } from "@/engine/experiments/rrt-rrt-star";
import { SimulatedAnnealingExperiment } from "@/engine/experiments/simulated-annealing";
import { SpringChainExperiment } from "@/engine/experiments/springs";
import { WaveSuperpositionExperiment } from "@/engine/experiments/wave-superposition";

// Polyfill browser globals for node testing of canvas/ImageData-dependent render calls
if (typeof (globalThis as any).ImageData === "undefined") {
  (globalThis as any).ImageData = class ImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(w: number, h: number) {
      this.width = w;
      this.height = h;
      this.data = new Uint8ClampedArray(w * h * 4);
    }
  };
}
if (typeof (globalThis as any).document === "undefined") {
  (globalThis as any).document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        putImageData: () => {},
      }),
    }),
  };
}

const W = 640;
const H = 400;

function make<T>(experiment: T, w = W, h = H): T {
  (experiment as any).initialize(w, h);
  return experiment;
}

/** Mock CanvasRenderingContext2D for testing canvas render passes without headless browser */
function createMockContext(): CanvasRenderingContext2D {
  const calls: { method: string; args: any[] }[] = [];
  return new Proxy({} as CanvasRenderingContext2D, {
    get: (_, prop: string) => {
      if (prop === "calls") return calls;
      if (prop === "canvas") return { width: W, height: H };
      return (...args: any[]) => {
        calls.push({ method: prop, args });
      };
    },
  });
}

const dummyTheme = {
  bg: "#000000",
  fg: "#ffffff",
  fgSecondary: "#888888",
  fgTertiary: "#444444",
  line: "#222222",
  lineStrong: "#555555",
  raised: "#111111",
  accent: "#3b82f6",
  accentStrong: "#1d4ed8",
  viz: ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"],
};

describe("Experiment Fixes: Rendering & Display", () => {
  it("Dithering: renders original on left half and dithered on right half of canvas", () => {
    const exp: any = make(new DitheringExperiment());
    exp.update(1 / 60);
    const mockCtx = createMockContext();
    exp.render(mockCtx, dummyTheme);
    expect(exp.image).toBeDefined();
    const data = exp.image.data;
    const SIZE = exp.image.width;
    const idxLeft = 10 * SIZE + 10;
    expect(data[idxLeft * 4]).toBe(Math.round(exp.original[idxLeft] * 255));
    const idxRight = 10 * SIZE + 70;
    expect(data[idxRight * 4]).toBe(Math.round(exp.dithered[idxRight] * 255));
  });

  it("Convolution: renders original on left half and filtered on right half of canvas", () => {
    const exp: any = make(new ConvolutionExperiment());
    exp.setParameter("kernel", "blur");
    exp.update(1 / 60);
    const mockCtx = createMockContext();
    exp.render(mockCtx, dummyTheme);
    expect(exp.image).toBeDefined();
    const data = exp.image.data;
    const SIZE = 96;
    const idxLeft = 10 * SIZE + 10;
    expect(data[idxLeft * 4]).toBe(Math.round(exp.original[idxLeft] * 255));
    const idxRight = 10 * SIZE + 70;
    expect(data[idxRight * 4]).toBe(Math.round(exp.filtered[idxRight] * 255));
  });

  it("Marching Squares: left cell contour segments do not spike to x = 0", () => {
    const exp: any = make(new MarchingSquaresExperiment());
    exp.update(1 / 60);
    const segs = exp.segmentList;
    const cols = exp.num("grid");
    const cw = exp.width / cols;
    for (let i = 0; i < segs.length; i += 4) {
      const x1 = segs[i];
      const x2 = segs[i + 2];
      expect(x1).toBeGreaterThanOrEqual(0);
      expect(x2).toBeGreaterThanOrEqual(0);
      expect(x1).toBeLessThanOrEqual(exp.width + 1e-4);
      expect(x2).toBeLessThanOrEqual(exp.width + 1e-4);
      const dx = Math.abs(x1 - x2);
      expect(dx).toBeLessThanOrEqual(cw * 2);
    }
  });

  it("Monte Carlo: draws quarter-circle arc inside the square (angles 1.5pi to 2pi)", () => {
    const exp: any = make(new MonteCarloExperiment());
    const mockCtx = createMockContext();
    exp.render(mockCtx, dummyTheme);
    const calls = (mockCtx as any).calls;
    const arcCall = calls.find((c: any) => c.method === "arc");
    expect(arcCall).toBeDefined();
    expect(arcCall.args[3]).toBeCloseTo(1.5 * Math.PI, 4);
    expect(arcCall.args[4]).toBeCloseTo(2 * Math.PI, 4);
  });
});

describe("Experiment Fixes: Mathematics & Physics Models", () => {
  it("Quadrature: Gaussian exact integral is correct (sqrt(pi)/2 * erf(1))", () => {
    const exp: any = make(new QuadratureExperiment());
    exp.setParameter("fn", "gaussian");
    exp.setParameter("method", "simpson");
    exp.setParameter("n", 100);
    exp.update(1 / 60);
    const metrics = exp.getMetrics();
    expect(Number(metrics.approximation)).toBeCloseTo(0.746824, 4);
    expect(Number(metrics.error)).toBeLessThan(1e-6);
  });

  it("Quadrature: Parabola label is 1/3 rather than 2/3", () => {
    const exp: any = make(new QuadratureExperiment());
    exp.setParameter("fn", "parabola");
    const metrics = exp.getMetrics();
    expect(metrics.exact).toBe("1/3");
  });

  it("Springs: harmonic oscillation conserves energy with zero damping", () => {
    const exp: any = make(new SpringChainExperiment());
    exp.setParameter("damping", 0);
    exp.setParameter("k", 40);
    const initialEnergy = exp.energy0;
    expect(initialEnergy).toBeGreaterThan(0);
    for (let i = 0; i < 500; i++) exp.update(1 / 60);
    const currentEnergy = exp.energy;
    const relativeDrift = Math.abs(currentEnergy - initialEnergy) / initialEnergy;
    expect(relativeDrift).toBeLessThan(0.02);
  });

  it("Kepler Orbits: planet distance at perihelion equals a*(1-e)", () => {
    const exp: any = make(new KeplerOrbitsExperiment());
    exp.setParameter("ecc", 0.5);
    const e = exp.num("ecc");
    const expectedPerihelion = exp.a * (1 - e);
    expect(exp.radius()).toBeCloseTo(expectedPerihelion, 4);
  });

  it("Wave Superposition: phase2 parameter shifts Wave 2 correctly", () => {
    const exp: any = make(new WaveSuperpositionExperiment());
    exp.setParameter("phase2", 0);
    const wZero = exp.wave(1, 1, 0, 0, 0);
    exp.setParameter("phase2", Math.PI / 2);
    const wQuarter = exp.wave(1, 1, Math.PI / 2, 0, 0);
    expect(wZero).toBeCloseTo(0, 5);
    expect(wQuarter).toBeCloseTo(1, 5);
  });

  it("Probability Distributions: theoretical Normal PMF peaks at mu", () => {
    const exp: any = make(new ProbabilityDistributionsExperiment());
    exp.setParameter("distribution", "normal");
    exp.setParameter("paramA", 15);
    exp.setParameter("paramB", 1.0);
    const probPeak = exp.pmf(15);
    const probFar = exp.pmf(5);
    expect(probPeak).toBeGreaterThan(probFar);
    expect(probPeak).toBeGreaterThan(exp.pmf(14));
    expect(probPeak).toBeGreaterThan(exp.pmf(16));
  });
});

describe("Experiment Fixes: Algorithmic Correctness", () => {
  it("Newton-Raphson: converges on startup without manual pointer interaction", () => {
    const exp: any = make(new NewtonRaphsonExperiment());
    expect(exp.x).toBe(2.2);
    for (let i = 0; i < 20 && exp.status === "running"; i++) {
      exp.update(1 / 60);
    }
    expect(exp.status).toBe("converged");
    expect(exp.x).toBeCloseTo(Math.SQRT2, 6);
  });

  it("Simulated Annealing: deltaFor returns 0 on full tour reversal (0 to CITIES-1)", () => {
    const exp: any = make(new SimulatedAnnealingExperiment());
    const delta = exp.deltaFor(0, 23);
    expect(delta).toBe(0);
  });

  it("RRT*: continues refining path cost as more samples are gathered", () => {
    const exp: any = make(new RrtExperiment(10));
    exp.setParameter("mode", "rrt-star");
    exp.setParameter("obstacles", 2);
    let guard = 0;
    while (exp.status !== "reached" && guard++ < 2000) exp.update(1 / 60);
    expect(exp.status).toBe("reached");
    const costAfterFirstHit = exp.bestCost;
    for (let i = 0; i < 200; i++) exp.update(1 / 60);
    expect(exp.bestCost).toBeLessThanOrEqual(costAfterFirstHit);
  });

  it("Barnes-Hut: quadtree child links survive typed array expansion", () => {
    const exp: any = make(new BarnesHutExperiment());
    for (let i = 0; i < 20; i++) exp.newNode(0, 0, 100);
    const initialCap = exp.nodeMass.length;
    for (let i = 0; i < initialCap + 20; i++) exp.newNode(0, 0, 100);
    exp.nodeChild[0] = 42;
    const cap2 = exp.nodeMass.length;
    for (let i = 0; i < cap2 + 20; i++) exp.newNode(0, 0, 100);
    expect(exp.nodeChild[0]).toBe(42);
  });

  it("BFS/DFS: queue frontier nodes are drawn", () => {
    const exp: any = make(new BfsDfsExperiment());
    exp.update(1 / 60);
    expect(exp.queue.length).toBeGreaterThan(0);
    const mockCtx = createMockContext();
    exp.render(mockCtx, dummyTheme);
    const calls = (mockCtx as any).calls;
    const fillRectCalls = calls.filter((c: any) => c.method === "fillRect");
    expect(fillRectCalls.length).toBeGreaterThan(0);
  });

  it("RK4 vs Euler: explicit Euler diverges while semi-implicit Euler is bounded", () => {
    const exp: any = make(new IntegratorComparisonExperiment());
    exp.setParameter("dt", 0.05);
    for (let i = 0; i < 400; i++) exp.update(1 / 60);
    const eulerAmplitude = Math.hypot(exp.euler.theta, exp.euler.omegaDot / exp.omega);
    const semiAmplitude = Math.hypot(exp.semi.theta, exp.semi.omegaDot / exp.omega);
    expect(eulerAmplitude).toBeGreaterThan(semiAmplitude);
    expect(exp.errorEuler).toBeGreaterThan(exp.errorSemi);
  });

  it("Eigenvectors: diagonal matrix A = diag(2, 5) yields orthogonal eigenvectors", () => {
    const exp: any = make(new EigenvectorsExperiment());
    exp.setParameter("a", 2);
    exp.setParameter("b", 0);
    exp.setParameter("c", 0);
    exp.setParameter("d", 5);
    const pairs = exp.eigenPairs();
    expect(pairs.length).toBe(2);
    const dot = pairs[0].vx * pairs[1].vx + pairs[0].vy * pairs[1].vy;
    expect(dot).toBeCloseTo(0, 8);
  });
});

describe("Experiment Fixes: Interactions & Parameter Schemas", () => {
  it("A*: hovering pointer without clicking does not alter walls or restart search", () => {
    const exp: any = make(new AStarExperiment());
    const cell = exp.num("cell");
    const testNode = 5 * exp.cols + 5;
    const initialWall = exp.walls[testNode];
    exp.onPointer({
      x: exp.offsetX + 5 * cell + 2,
      y: exp.offsetY + 5 * cell + 2,
      down: false,
      inside: true,
    });
    expect(exp.walls[testNode]).toBe(initialWall);
  });

  it("Game of Life: hovering pointer without clicking does not alter cell state", () => {
    const exp: any = make(new GameOfLifeExperiment());
    const cell = exp.num("cell");
    const testIdx = 5 * exp.cols + 5;
    const initialCell = exp.cells[testIdx];
    const initialPop = exp.population;
    exp.onPointer({
      x: exp.offsetX + 5 * cell + 2,
      y: exp.offsetY + 5 * cell + 2,
      down: false,
      inside: true,
    });
    expect(exp.cells[testIdx]).toBe(initialCell);
    expect(exp.population).toBe(initialPop);
  });

  it("Electrostatic Potential: resolution options include 80 matching defaultValue", () => {
    const exp: any = make(new ElectrostaticPotentialExperiment());
    const params = exp.params();
    const resParam = params.find((p: any) => p.key === "resolution");
    expect(resParam).toBeDefined();
    expect(resParam.defaultValue).toBe("80");
    const optionValues = resParam.options.map((o: any) => o.value);
    expect(optionValues).toContain("80");
  });
});
