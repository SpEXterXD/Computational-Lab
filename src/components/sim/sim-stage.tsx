"use client";

import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  PauseIcon,
  PlayIcon,
  PulseIcon,
  SkipForwardIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import {
  SimulationController,
  type ControllerSnapshot,
} from "@/engine/core/controller";
import type { ParameterDef } from "@/engine/core/types";
import { createExperiment } from "@/engine/experiments";
import { MetricsPanel } from "@/components/sim/metrics-panel";
import { ParameterControls } from "@/components/sim/parameter-controls";

const SPEEDS = [0.25, 0.5, 1, 2, 4];

const HINTS: Record<string, string> = {
  "game-of-life": "Drag on the grid to toggle cells.",
  "a-star": "Drag on the grid to draw or erase walls; the search restarts instantly.",
  boids: "Hold the pointer in the field to scatter the flock.",
  "heat-diffusion": "Drag inside the field to inject heat.",
  "reaction-diffusion": "Drag inside the field to inject reagent B.",
  "n-body": "Hold the pointer to attract bodies with a temporary mass.",
  "taylor-series": "Move the pointer to place the evaluation marker.",
  sorting: "Each step performs a fixed number of real comparison and write operations.",
  "langton-ant": "Each step applies a fixed number of ant rules.",
  "double-pendulum": "The ghosted pendulum started 0.000001 radians away from the primary.",
  "rk4-vs-euler": "Lower dt to watch RK4 and semi-implicit Euler converge on the exact curve.",
  mandelbrot: "Drag to pan; the zoom and center sliders move deeper into the boundary.",
  "svd-compression": "The rank slider is the compression dial; the view selector shows the error field.",
  "central-limit-theorem": "Raise n and the histogram snaps onto the predicted Gaussian faster.",
  "elastic-collisions": "Press, drag, release to sling a new disk in with the drag velocity.",
  "electrostatic-potential": "Click to place charges with the selected tool; the field re-relaxes live.",
  "support-vector-machine": "Click to add labeled points (tool selector); the margin retrains online.",
  "naive-bayes": "Click to add labeled points; hover anywhere to read the posterior P(A | x).",
  "conjugate-gradient": "Every tick advances all three solvers the same number of iterations.",
  "adaptive-rk45": "Each mark in the lower band is one accepted step; watch h collapse in the transient.",
  "least-squares": "Raise the outlier rate and watch unweighted exactness pay for it.",
  "bfs-dfs": "Switch strategies to compare the frontier shapes on the same maze.",
  "rrt-rrt-star": "RRT* keeps rewiring neighbors - its path cost falls where RRT stops.",
  "barnes-hut": "The theta slider trades force accuracy for speed; the error metric audits it.",
  "genetic-algorithm": "The dots are the population climbing the landscape; accent marks the current best.",
  "simulated-annealing": "The acceptance rate is the thermometer: it freezes as the temperature falls.",
  "fourier-series": "More terms squeeze the ringing at the jump; it never disappears (Gibbs).",
  "fourier-transform": "The spectrum peaks at exactly the frequencies mixed into the signal.",
  "eigen-basis": "Drag the matrix entries; accent lines are the invariant directions.",
  "matrix-transformations": "Sliders compose rotation, scale, and shear into one matrix, live.",
  "julia-set": "The orbit slider morphs c around the classic circle - the set never stops changing.",
  "probability-distributions": "The accent curve is the exact pmf; the bars are what sampling gives.",
  "vector-field": "Hold the pointer to inject an extra source; the arrows sample the same field.",
  "projectile-motion": "Drag slider at zero makes the integrated path match the analytic arc exactly.",
  springs: "Damping zero must hold total energy flat - the drift metric is the proof.",
  "kepler-orbits": "Equal-time wedges all sweep equal area: Kepler's second law as a picture.",
  "three-body": "Same seed, same choreography - perturb one mass and the eight dissolves.",
  "wave-superposition": "Frequencies close together produce beats at their difference.",
  "wave-equation": "Drag on the drum head to launch ripples; pinned edges invert reflections.",
  dithering: "Two gray levels, and the mean luminance still matches to four decimals.",
  "marching-squares": "The iso slider retightens the contour around the moving blobs.",
  "raycast-shadows": "Move the pointer to carry the light; shadows are marched ray by ray.",
  convolution: "Blur, sharpen, edge - the same nine numbers in a different arrangement.",
  "newton-raphson": "Click to choose a starting point; bad starts really do diverge.",
  quadrature: "Double the panels: Riemann error quarters, trapezoid /4, Simpson /16.",
  "monte-carlo": "More darts, smaller error - falling like one over root N.",
  "gradient-descent": "Learning rate past stability and the descent path leaves the plot.",
  "k-means": "The inertia metric never increases - Lloyd's guarantee, verified live.",
  perceptron: "Click to add points; ringed ones are the mistakes it is still fixing.",
  "k-nn": "There is no training: add one point and the boundary bends instantly.",
};

const KEYBOARD_HINT = "Keyboard: Space runs or pauses, . steps, r resets.";

/** Transport button sized to 44px on touch devices, 40px on desktop. */
const transportBtn =
  "flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm border border-line text-ink t-fast hover:border-line-strong hover:bg-raised active:translate-y-px md:h-10 md:w-10";

/**
 * The live simulation island (DESIGN.md §8): canvas frame + transport controls
 * + parameters + metrics, wired to one SimulationController. React renders UI;
 * the controller owns the rAF loop and React only subscribes at ≤4 Hz.
 */
export function SimStage({ id }: { id: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snapshot, setSnapshot] = useState<ControllerSnapshot | null>(null);
  const [params, setParams] = useState<ParameterDef[]>([]);
  const [controller, setController] = useState<SimulationController | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const created = new SimulationController(canvas, createExperiment(id));
    const unsubscribe = created.subscribe(setSnapshot);
    setParams(created.getExperiment().getParameters());
    setController(created);

    const observer = new ResizeObserver(() => created.resize());
    observer.observe(canvas);
    const visibility = new IntersectionObserver(
      ([entry]) => created.setInView(entry.isIntersecting),
      { threshold: 0.02 },
    );
    visibility.observe(canvas);

    return () => {
      unsubscribe();
      observer.disconnect();
      visibility.disconnect();
      created.destroy();
      setController(null);
    };
  }, [id]);

  function interact() {
    setParams(controller?.getExperiment().getParameters() ?? params);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {
    if (!controller) return;
    if (event.key === " ") {
      event.preventDefault();
      controller.toggle();
    } else if (event.key === ".") {
      event.preventDefault();
      controller.stepOnce();
    } else if (event.key === "r") {
      event.preventDefault();
      controller.reset();
    }
  }

  const running = snapshot?.running ?? false;

  return (
    <section aria-label={`${id} simulation`}>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="relative overflow-hidden rounded-lg border border-line">
            <canvas
              ref={canvasRef}
              tabIndex={0}
              role="img"
              aria-label={snapshot?.describe ?? "Simulation loading"}
              onKeyDown={onKeyDown}
              className="block h-auto w-full cursor-crosshair outline-offset-4 touch-none"
              style={{ aspectRatio: "16 / 10" }}
              onPointerDown={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                controller?.pointer(
                  event.clientX - rect.left,
                  event.clientY - rect.top,
                  true,
                  true,
                );
              }}
              onPointerMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const inside =
                  event.clientY >= rect.top &&
                  event.clientY <= rect.bottom &&
                  event.clientX >= rect.left &&
                  event.clientX <= rect.right;
                controller?.pointer(
                  event.clientX - rect.left,
                  event.clientY - rect.top,
                  event.buttons > 0,
                  inside,
                );
              }}
              onPointerUp={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                controller?.pointer(
                  event.clientX - rect.left,
                  event.clientY - rect.top,
                  false,
                  true,
                );
              }}
              onPointerLeave={() => {
                controller?.pointer(0, 0, false, false);
              }}
            />
            <button
              type="button"
              onClick={() => setShowDebug((value) => !value)}
              aria-pressed={showDebug}
              aria-label="Toggle performance overlay"
              className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm border border-line bg-canvas/80 text-ink-secondary t-fast hover:border-line-strong hover:text-ink"
            >
              <PulseIcon size={14} aria-hidden />
            </button>
            {showDebug && snapshot && (
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-sm border border-line bg-canvas/90 px-3 py-2 font-mono text-[11px] leading-relaxed tabular-nums text-ink-secondary">
                {snapshot.perf.fps} FPS · {snapshot.perf.frameMs.toFixed(1)} ms frame ·{" "}
                {snapshot.perf.stepsPerSec} steps/s · {snapshot.perf.updateMicros.toFixed(1)} µs/step
                · {snapshot.perf.entities.toLocaleString("en-US")} entities
              </div>
            )}
          </div>
          <p className="mt-3 text-sm text-ink-tertiary">
            {HINTS[id] ? `${HINTS[id]} ` : ""}
            <span className="hidden md:inline">{KEYBOARD_HINT}</span>
          </p>
        </div>

        <div className="lg:col-span-4">
          <div className="rounded-lg border border-line bg-panel p-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => controller?.toggle()}
                className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm bg-accent text-sm font-medium text-accent-contrast t-fast hover:bg-accent-strong active:translate-y-px md:h-10"
                aria-label={running ? "Pause simulation" : "Run simulation"}
              >
                {running ? <PauseIcon size={14} aria-hidden /> : <PlayIcon size={14} aria-hidden />}
                {running ? "Pause" : "Run"}
              </button>
              <button
                type="button"
                onClick={() => controller?.stepOnce()}
                aria-label="Advance one step"
                title="Advance one step"
                className={transportBtn}
              >
                <SkipForwardIcon size={14} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => controller?.reset()}
                aria-label="Reset to initial state"
                title="Reset to initial state"
                className={transportBtn}
              >
                <ArrowCounterClockwiseIcon size={14} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => controller?.randomize()}
                aria-label="Randomize with a new seed"
                title="Randomize with a new seed"
                className={transportBtn}
              >
                <ArrowClockwiseIcon size={14} aria-hidden />
              </button>
            </div>

            <div className="mt-5" role="group" aria-label="Simulation speed">
              <p className="label-mono text-ink-tertiary">Speed</p>
              <div className="mt-2 flex gap-1">
                {SPEEDS.map((speed) => {
                  const active = controller?.getSpeed() === speed;
                  return (
                    <button
                      key={speed}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        controller?.setSpeed(speed);
                        interact();
                      }}
                      className={`h-8 flex-1 cursor-pointer rounded-sm border font-mono text-xs tabular-nums t-fast ${
                        active
                          ? "border-accent text-ink"
                          : "border-line text-ink-secondary hover:border-line-strong hover:text-ink"
                      }`}
                    >
                      {speed}×
                    </button>
                  );
                })}
              </div>
            </div>

            {controller && params.length > 0 && (
              <div className="mt-6 border-t border-line pt-5">
                <ParameterControls
                  controller={controller}
                  params={params}
                  onInteraction={interact}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        <p
          aria-hidden
          className="label-mono rounded-sm bg-raised px-2 py-0.5 text-ink-secondary"
        >
          {snapshot?.reducedMotion ? "PAUSED · REDUCED MOTION" : running ? "RUNNING" : "PAUSED"}
        </p>
        <p className="text-sm text-ink-tertiary">
          {HINTS[id] ?? ""}
        </p>
      </div>

      {snapshot && (
        <div className="mt-6">
          <MetricsPanel metrics={snapshot.metrics} />
        </div>
      )}
    </section>
  );
}
