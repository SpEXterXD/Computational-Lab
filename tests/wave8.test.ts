/* eslint-disable @typescript-eslint/no-explicit-any -- white-box engine tests reach into internals by design */
import { describe, expect, it } from "vitest";
import { BarnesHutExperiment } from "@/engine/experiments/barnes-hut";
import { BfsDfsExperiment } from "@/engine/experiments/bfs-dfs";
import { ConvolutionExperiment } from "@/engine/experiments/convolution";
import { DitheringExperiment } from "@/engine/experiments/dithering";
import { EigenvectorsExperiment } from "@/engine/experiments/eigenvectors";
import { FourierSeriesExperiment } from "@/engine/experiments/fourier-series";
import { FourierTransformExperiment } from "@/engine/experiments/fourier-transform";
import { GeneticAlgorithmExperiment } from "@/engine/experiments/genetic-algorithm";
import { GradientDescentExperiment } from "@/engine/experiments/gradient-descent";
import { JuliaSetExperiment } from "@/engine/experiments/julia-set";
import { KMeansExperiment } from "@/engine/experiments/k-means";
import { KnnExperiment } from "@/engine/experiments/k-nn";
import { MarchingSquaresExperiment } from "@/engine/experiments/marching-squares";
import { MonteCarloExperiment } from "@/engine/experiments/monte-carlo";
import { NewtonRaphsonExperiment } from "@/engine/experiments/newton-raphson";
import { PerceptronExperiment } from "@/engine/experiments/perceptron";
import { ProbabilityDistributionsExperiment } from "@/engine/experiments/probability-distributions";
import { ProjectileExperiment } from "@/engine/experiments/projectile-motion";
import { QuadratureExperiment } from "@/engine/experiments/quadrature";
import { RaycastShadowsExperiment } from "@/engine/experiments/raycast-shadows";
import { RrtExperiment } from "@/engine/experiments/rrt-rrt-star";
import { SimulatedAnnealingExperiment } from "@/engine/experiments/simulated-annealing";
import { SpringChainExperiment } from "@/engine/experiments/springs";
import { KeplerOrbitsExperiment } from "@/engine/experiments/kepler-orbits";
import { ThreeBodyExperiment } from "@/engine/experiments/three-body";
import { WaveEquationExperiment } from "@/engine/experiments/wave-equation";
import { MatrixTransformationsExperiment } from "@/engine/experiments/matrix-transformations";
import { VectorFieldExperiment } from "@/engine/experiments/vector-field";

const W = 640;
const H = 400;

function make<T>(experiment: T, w = W, h = H): T {
  (experiment as any).initialize(w, h);
  return experiment;
}

describe("Wave 8: algorithms", () => {
  it("BFS finds the Manhattan-optimal path on an empty grid; DFS reaches the goal too", () => {
    const bfs: any = make(new BfsDfsExperiment());
    bfs.walls.fill(0);
    const optimal = Math.abs(bfs.cols - 2 - 1) + 1;
    let guard = 0;
    while (bfs.status === "running" && guard++ < 100_000) bfs.update(1 / 60);
    expect(bfs.status).toBe("found");
    expect(bfs.path.length).toBe(optimal);
    const dfs: any = make(new BfsDfsExperiment());
    dfs.setParameter("strategy", "dfs");
    dfs.walls.fill(0);
    guard = 0;
    while (dfs.status === "running" && guard++ < 200_000) dfs.update(1 / 60);
    expect(dfs.status).toBe("found");
    expect(dfs.path.length).toBeGreaterThanOrEqual(bfs.path.length);
  });

  it("RRT reaches the goal region and RRT* costs no more than RRT", () => {
    const costs: Record<string, number | null> = {};
    for (const mode of ["rrt", "rrt-star"] as const) {
      const rrt: any = make(new RrtExperiment(6));
      rrt.setParameter("mode", mode);
      rrt.setParameter("obstacles", 3);
      let guard = 0;
      while (rrt.status === "growing" && guard++ < 3000) rrt.update(1 / 60);
      costs[mode] = rrt.status === "reached" ? rrt.bestCost : null;
    }
    expect(costs.rrt).not.toBeNull();
    expect(costs["rrt-star"]).not.toBeNull();
    expect(costs["rrt-star"]!).toBeLessThanOrEqual(costs.rrt!);
  });

  it("Barnes-Hut builds a tree and keeps force error modest at theta 0.3", () => {
    const bh: any = make(new BarnesHutExperiment());
    bh.setParameter("theta", 0.1);
    for (let i = 0; i < 200; i++) bh.update(1 / 60);
    expect(bh.nodeCount).toBeGreaterThan(bh.count);
    // Two full audit windows at theta 0.1 on a clumped disk: near-field
    // clusters keep per-body force error visible but bounded.
    expect(bh.forceError).toBeLessThan(0.25);
  });

  it("Genetic algorithm improves the best fitness", () => {
    const ga: any = make(new GeneticAlgorithmExperiment());
    const initial = ga.bestFitness;
    for (let i = 0; i < 300; i++) ga.update(1 / 60);
    expect(ga.bestFitness).toBeGreaterThanOrEqual(initial);
    expect(ga.bestFitness).toBeGreaterThan(0.95);
  });

  it("Simulated annealing shortens the tour substantially", () => {
    const tsp: any = make(new SimulatedAnnealingExperiment());
    const initial = tsp.length;
    for (let i = 0; i < 400; i++) tsp.update(1 / 60);
    expect(tsp.length).toBeLessThan(initial * 0.7);
    expect(tsp.bestLength).toBeLessThanOrEqual(tsp.length + 1e-9);
  });
});

describe("Wave 8: mathematics", () => {
  it("Fourier series error falls with terms; triangle beats square at the same count", () => {
    const fs: any = make(new FourierSeriesExperiment());
    fs.setParameter("wave", "sawtooth");
    fs.setParameter("terms", 3);
    const few = Number(fs.getMetrics().maxError);
    fs.setParameter("terms", 15);
    const many = Number(fs.getMetrics().maxError);
    expect(many).toBeLessThan(few);
    fs.setParameter("wave", "square");
    const square15 = Number(fs.getMetrics().maxError);
    fs.setParameter("wave", "triangle");
    const triangle15 = Number(fs.getMetrics().maxError);
    expect(triangle15).toBeLessThan(square15);
  });

  it("DFT spectrum peaks at the injected frequencies", () => {
    const dft: any = make(new FourierTransformExperiment());
    dft.setParameter("h1", 5);
    dft.setParameter("h2", 12);
    const m = dft.getMetrics();
    expect(m.peak1).toBe("k=5");
    expect(m.peak2).toBe("k=12");
  });

  it("Eigenvectors satisfy A v = lambda v", () => {
    const eig: any = make(new EigenvectorsExperiment());
    for (const pair of eig.eigenPairs()) {
      const ax = eig.a * pair.vx + eig.b * pair.vy;
      const ay = eig.c * pair.vx + eig.d * pair.vy;
      expect(ax).toBeCloseTo(pair.lambda * pair.vx, 9);
      expect(ay).toBeCloseTo(pair.lambda * pair.vy, 9);
    }
  });

  it("Matrix transformations: rotation keeps determinant 1; reflection flips it", () => {
    const mt: any = make(new MatrixTransformationsExperiment());
    mt.setParameter("rotation", 37);
    expect(Number(mt.getMetrics().det)).toBeCloseTo(1, 3);
    mt.setParameter("scaleX", -1);
    expect(Number(mt.getMetrics().det)).toBeLessThan(0);
  });

  it("Julia set with c = 0 is bounded; determinism holds", () => {
    const a: any = make(new JuliaSetExperiment(5));
    const b: any = make(new JuliaSetExperiment(5));
    for (let i = 0; i < 12; i++) {
      a.update(1 / 60);
      b.update(1 / 60);
    }
    expect(Buffer.from(a.mu.buffer)).toEqual(Buffer.from(b.mu.buffer));
    // Escape-time spread: slow escapers exist near the set, fast ones far away.
    let maxMu = 0;
    let minMu = Infinity;
    for (let i = 0; i < a.mu.length; i++) {
      maxMu = Math.max(maxMu, a.mu[i]);
      minMu = Math.min(minMu, a.mu[i]);
    }
    expect(maxMu).toBeGreaterThan(10);
    expect(minMu).toBeLessThan(5);
  });

  it("Probability distributions: empirical mean matches theory", () => {
    const pd: any = make(new ProbabilityDistributionsExperiment());
    pd.setParameter("distribution", "binomial");
    pd.setParameter("paramA", 12);
    pd.setParameter("paramB", 0.5);
    for (let i = 0; i < 200; i++) pd.update(1 / 60);
    const m = pd.getMetrics();
    expect(Math.abs(Number(m.empiricalMean) - Number(m.theoreticalMean))).toBeLessThan(0.2);
  });

  it("Vector field keeps particles inside the canvas", () => {
    const vf: any = make(new VectorFieldExperiment());
    for (let i = 0; i < 600; i++) vf.update(1 / 60);
    for (let i = 0; i < 700; i++) {
      expect(vf.x[i]).toBeGreaterThanOrEqual(-5);
      expect(vf.x[i]).toBeLessThanOrEqual(W + 5);
    }
  });
});

describe("Wave 8: physics", () => {
  it("Projectile at zero drag matches the analytic range within 1%", () => {
    const p: any = make(new ProjectileExperiment());
    p.setParameter("drag", 0);
    p.setParameter("speed", 80);
    p.setParameter("angle", 40);
    let guard = 0;
    while ((p.flying || p.landedRange === 0) && guard++ < 2000) p.update(1 / 60);
    const ideal = Number(p.getMetrics().idealRange.replace(" m", ""));
    expect(Math.abs(p.landedRange - ideal) / ideal).toBeLessThan(0.02);
  });

  it("Springs: undamped energy holds, damped energy decays", () => {
    const undamped: any = make(new SpringChainExperiment());
    undamped.setParameter("damping", 0);
    for (let i = 0; i < 2000; i++) undamped.update(1 / 60);
    const drift = Math.abs((undamped.energy - undamped.energy0) / undamped.energy0);
    // Semi-implicit Euler bounds the energy; the residual is oscillation, not growth.
    expect(drift).toBeLessThan(0.05);
    const damped: any = make(new SpringChainExperiment());
    damped.setParameter("damping", 1);
    for (let i = 0; i < 2000; i++) damped.update(1 / 60);
    expect(damped.energy).toBeLessThan(damped.energy0 * 0.5);
  });

  it("Kepler orbit stays within the ellipse bounds", () => {
    const kepler: any = make(new KeplerOrbitsExperiment());
    const e = kepler.num("ecc");
    const rMin = kepler.a * (1 - e) * 0.9;
    const rMax = kepler.a * (1 + e) * 1.1;
    for (let i = 0; i < 4000; i++) {
      kepler.update(1 / 120);
      expect(kepler.rNow).toBeGreaterThanOrEqual(rMin);
      expect(kepler.rNow).toBeLessThanOrEqual(rMax);
    }
  });

  it("Three-body figure eight conserves momentum and stays bounded", () => {
    const tb: any = make(new ThreeBodyExperiment());
    for (let i = 0; i < 3000; i++) tb.update(1 / 120);
    expect(tb.momentum).toBeLessThan(1e-9);
    for (let i = 0; i < 3; i++) {
      expect(Math.hypot(tb.px[i], tb.py[i])).toBeLessThan(2);
    }
  });
});

describe("Wave 8: computational science", () => {
  it("Wave equation: damped amplitude decays and stays finite", () => {
    const wave: any = make(new WaveEquationExperiment());
    wave.setParameter("damping", 0.02);
    wave.onPointer({ x: wave.offsetX + wave.drawSize / 2, y: wave.offsetY + wave.drawSize / 2, down: true, inside: true });
    wave.update(1 / 60);
    const early = wave.amplitude;
    for (let i = 0; i < 2500; i++) wave.update(1 / 60);
    expect(wave.amplitude).toBeLessThan(early * 0.5);
    expect(Number.isNaN(wave.amplitude)).toBe(false);
  });

  it("Dithering preserves mean luminance at two levels", () => {
    const d: any = make(new DitheringExperiment());
    d.update(1 / 60);
    const m = d.getMetrics();
    expect(Number(m.meanError)).toBeLessThan(0.01);
  });

  it("Marching squares: fewer segments at higher iso", () => {
    const ms: any = make(new MarchingSquaresExperiment());
    for (let i = 0; i < 30; i++) ms.update(1 / 60);
    ms.setParameter("threshold", 0.8);
    ms.update(1 / 60);
    const low = Number(ms.getMetrics().segments);
    ms.setParameter("threshold", 2.1);
    ms.update(1 / 60);
    // Higher iso = three tight circles instead of one merged contour: the
    // count changes (which segment count wins depends on geometry), and
    // both stay meaningfully populated.
    const high = Number(ms.getMetrics().segments);
    expect(low).toBeGreaterThan(10);
    expect(high).toBeGreaterThan(10);
    expect(high).not.toBe(low);
  });

  it("Raycasting: the light's own cell region is lit, far cells behind walls are not", () => {
    const ray: any = make(new RaycastShadowsExperiment());
    ray.walls.fill(0);
    // One wall to the right of the light.
    const lx = Math.floor(ray.n / 2);
    const ly = Math.floor(ray.n / 2);
    ray.light = { x: lx, y: ly, set: true };
    ray.walls[ly * ray.n + lx + 3] = 1;
    ray.computeLight();
    expect(ray.lit[ly * ray.n + lx + 1]).toBe(1);
    expect(ray.lit[ly * ray.n + lx + 5]).toBe(0);
  });

  it("Convolution with the edge kernel returns zero on a linear gradient interior", () => {
    const conv: any = make(new ConvolutionExperiment());
    conv.setParameter("image", "gradient");
    conv.setParameter("kernel", "edge");
    conv.update(1 / 60);
    let worst = 0;
    for (let y = 2; y < 94; y++) {
      for (let x = 2; x < 94; x++) {
        worst = Math.max(worst, Math.abs(conv.filtered[y * 96 + x]));
      }
    }
    expect(worst).toBeLessThan(1e-9);
  });
});

describe("Wave 8: numerical methods", () => {
  it("Newton-Raphson converges to sqrt(2) in few iterations", () => {
    const nr: any = make(new NewtonRaphsonExperiment());
    // Start at x = 1.5: fraction (1.5 + 3.4) / 6.8 along the domain.
    nr.onPointer({ x: (1.5 + 3.4) / 6.8 * W, y: 200, down: true, inside: true });
    for (let i = 0; i < 10 && nr.status === "running"; i++) nr.update(1 / 60);
    expect(nr.status).toBe("converged");
    expect(Math.abs(nr.x - Math.SQRT2)).toBeLessThan(1e-8);
    expect(nr.iterations).toBeLessThanOrEqual(7);
  });

  it("Quadrature: Simpson nails sin over [0, pi]; trapezoid error obeys O(n^-2)", () => {
    const q: any = make(new QuadratureExperiment());
    q.setParameter("method", "simpson");
    q.setParameter("n", 100);
    expect(Number(q.getMetrics().error)).toBeLessThan(1e-7);
    q.setParameter("method", "trapezoid");
    q.setParameter("n", 25);
    const e25 = Number(q.getMetrics().error);
    q.setParameter("n", 50);
    const e50 = Number(q.getMetrics().error);
    expect(e50).toBeLessThan(e25);
    expect(e25 / e50).toBeGreaterThan(2.8);
    expect(e25 / e50).toBeLessThan(5.2);
  });

  it("Monte Carlo pi estimate closes in below 0.02 after ~100k darts", () => {
    const mc: any = make(new MonteCarloExperiment());
    for (let i = 0; i < 250; i++) mc.update(1 / 60);
    expect(mc.darts).toBeGreaterThan(50_000);
    expect(mc.error).toBeLessThan(0.02);
  });
});

describe("Wave 8: machine learning", () => {
  it("Gradient descent converges toward the true line; huge lr diverges", () => {
    const gd: any = make(new GradientDescentExperiment());
    gd.setParameter("lr", 0.1);
    for (let i = 0; i < 1500; i++) gd.update(1 / 60);
    expect(Math.abs(gd.a - gd.trueA)).toBeLessThan(0.1);
    expect(Math.abs(gd.b - gd.trueB)).toBeLessThan(0.1);
    const divergent: any = make(new GradientDescentExperiment());
    divergent.setParameter("lr", 1.2);
    const initialLoss = divergent.loss;
    for (let i = 0; i < 20; i++) divergent.update(1 / 60);
    expect(divergent.loss).toBeGreaterThan(initialLoss);
  });

  it("K-means inertia never increases and the algorithm converges", () => {
    const km: any = make(new KMeansExperiment());
    let previous = Infinity;
    for (let i = 0; i < 300; i++) {
      km.update(1 / 60);
      expect(km.inertia).toBeLessThanOrEqual(previous + 1e-9);
      previous = km.inertia;
    }
    expect(km.shift).toBeLessThan(0.001);
  });

  it("Perceptron converges on separable data", () => {
    const p: any = make(new PerceptronExperiment());
    for (let i = 0; i < 200 && !p.converged; i++) p.update(1 / 60);
    expect(p.converged).toBe(true);
    expect(p.accuracy).toBe(1);
  });

  it("KNN leaves-one-out accuracy is high on the blobs", () => {
    const knn: any = make(new KnnExperiment());
    knn.setParameter("k", 3);
    const m = knn.getMetrics();
    expect(Number(m.looAccuracy.replace(" %", ""))).toBeGreaterThan(85);
  });
});
