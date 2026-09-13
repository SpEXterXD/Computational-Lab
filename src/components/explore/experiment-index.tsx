"use client";

import Link from "next/link";
import { MiniPreview } from "@/components/sim/mini-preview";
import {
  CATEGORIES,
  DIFFICULTY_LABELS,
  catalogNumber,
  experimentHref,
  type ExperimentMeta,
} from "@/lib/registry";

/**
 * Lightweight preview overrides so eleven live engines stay cheap: fewer
 * entities than the detail pages, identical physics.
 */
const PREVIEW_PARAMS: Record<string, Record<string, number | string>> = {
  "game-of-life": { cell: 7 },
  sorting: { size: 64, ops: 8 },
  "a-star": { rate: 4, cell: 16 },
  boids: { population: 100 },
  "n-body": { bodies: 100 },
  "double-pendulum": {},
  "heat-diffusion": { resolution: "64", iterations: 6 },
  "reaction-diffusion": { resolution: "72", iterations: 10 },
  "langton-ant": { rate: 12 },
  "rk4-vs-euler": { steps: 4 },
  "taylor-series": { terms: 7 },
  mandelbrot: { maxIter: 96, cycle: 0.1 },
  "svd-compression": { rank: 8 },
  "central-limit-theorem": { rate: 120 },
  "elastic-collisions": { count: 40 },
  "electrostatic-potential": { resolution: "64" },
  "adaptive-rk45": { steps: 6 },
  "conjugate-gradient": { iterations: 6 },
  "least-squares": { points: 60 },
  "support-vector-machine": { epochs: 2 },
  "naive-bayes": {},
  "bfs-dfs": { rate: 8, cell: 16 },
  "rrt-rrt-star": { samples: 6, obstacles: 5 },
  "barnes-hut": { bodies: 140, theta: 0.9 },
  "genetic-algorithm": { generations: 2 },
  "simulated-annealing": { moves: 20 },
  "fourier-series": { terms: 9 },
  "fourier-transform": { noise: 0.1 },
  "eigen-basis": {},
  "matrix-transformations": {},
  "julia-set": { maxIter: 96, animate: 0.15 },
  "probability-distributions": { rate: 200 },
  "vector-field": {},
  "projectile-motion": {},
  "springs": {},
  "kepler-orbits": {},
  "three-body": { speed: 1.4 },
  "wave-superposition": {},
  "wave-equation": { iterations: 3 },
  dithering: { levels: 2 },
  "marching-squares": { grid: 55 },
  "raycast-shadows": { density: 14 },
  convolution: {},
  "newton-raphson": { steps: 2 },
  quadrature: { n: 24 },
  "monte-carlo": { rate: 600 },
  "gradient-descent": { steps: 3 },
  "k-means": {},
  perceptron: {},
  "k-nn": { k: 3 },
};

/**
 * The ruled editorial index (DESIGN.md §8): hairline rows with a stable catalog
 * number, title, meta line, and a LIVE miniature driven by the same engine
 * class as the detail page. Not a card grid.
 */
export function ExperimentIndex({
  experiments,
  showCategory = true,
  withPreview = true,
}: {
  experiments: ExperimentMeta[];
  showCategory?: boolean;
  withPreview?: boolean;
}) {
  return (
    <ul className="border-t border-line">
      {experiments.map((experiment) => {
        const number = catalogNumber(experiment);
        return (
          <li
            key={experiment.id}
            className="border-b border-line [contain-intrinsic-size:auto_200px] [content-visibility:auto]"
          >
            <Link
              href={experimentHref(experiment)}
              className="group -mx-2 grid grid-cols-[2.5rem_1fr] items-center gap-x-4 gap-y-2 px-2 py-4 t-fast hover:bg-raised md:grid-cols-[2.5rem_1fr_16rem]"
            >
              <span className="self-start pt-1 font-mono text-xs tabular-nums text-ink-tertiary">
                {String(number).padStart(2, "0")}
              </span>
              <span className="self-start">
                <span className="block font-display text-xl font-medium text-ink md:text-2xl">
                  {experiment.title}
                </span>
                <span className="mt-1 block text-sm text-ink-tertiary">
                  {experiment.subcategory} / {DIFFICULTY_LABELS[experiment.difficulty]} /{" "}
                  {experiment.techniques.join(", ")}
                </span>
                {showCategory && (
                  <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.08em] text-ink-tertiary md:hidden">
                    {CATEGORIES[experiment.category].label}
                  </span>
                )}
              </span>
              {withPreview && (
                <span className="col-span-2 md:col-span-1 md:justify-self-end">
                  <MiniPreview
                    id={experiment.id}
                    height={110}
                    params={PREVIEW_PARAMS[experiment.id]}
                  />
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
