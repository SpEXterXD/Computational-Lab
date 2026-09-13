"use client";

import { useEffect, useRef, useState } from "react";
import type { SimulationController } from "@/engine/core/controller";
import { MiniPreview } from "@/components/sim/mini-preview";
import { ParameterSlider } from "@/components/sim/parameter-controls";

const SLIDERS = [
  { key: "population", label: "Population", min: 60, max: 240, step: 20, defaultValue: 140 },
  { key: "vision", label: "Vision radius", min: 20, max: 80, step: 2, defaultValue: 44, unit: "px" },
  { key: "separation", label: "Separation weight", min: 0, max: 3, step: 0.1, defaultValue: 1.6 },
  { key: "alignment", label: "Alignment weight", min: 0, max: 3, step: 0.1, defaultValue: 1 },
] as const;

const DEFAULTS: Record<string, number> = Object.fromEntries(
  SLIDERS.map((slider) => [slider.key, slider.defaultValue]),
);

/**
 * "Change the variables": a live Boids engine with real parameter sliders.
 * Every slider writes to the engine on each input event; the order parameter
 * is polled from the engine, never invented.
 */
export function VariablePlayground() {
  const controllerRef = useRef<SimulationController | null>(null);
  const [values, setValues] = useState<Record<string, number>>(DEFAULTS);
  const [order, setOrder] = useState("0.000");

  useEffect(() => {
    const id = setInterval(() => {
      const controller = controllerRef.current;
      if (controller) setOrder(String(controller.getExperiment().getMetrics().order ?? "0.000"));
    }, 500);
    return () => clearInterval(id);
  }, []);

  function change(key: string, value: number) {
    controllerRef.current?.setParameter(key, value);
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <section className="border-t border-line py-20 md:py-28" aria-labelledby="playground-heading">
      <div className="shell">
        <div className="max-w-[52ch]">
          <h2 id="playground-heading" className="type-h2">
            Change the variables.
          </h2>
          <p className="type-body mt-4 text-ink-secondary">
            This is a live Boids engine, not a video. Pull a weight and the flock reorganizes on
            the next tick. Hold the pointer in the field to play predator.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <MiniPreview id="boids" height={330} controllerRef={controllerRef} />
          </div>
          <div className="lg:col-span-5">
            <div className="flex h-full flex-col gap-5 rounded-lg border border-line bg-panel p-5">
              {SLIDERS.map((def) => (
                <ParameterSlider
                  key={def.key}
                  def={{ ...def }}
                  value={values[def.key] ?? def.defaultValue}
                  onChange={(value) => change(def.key, value)}
                />
              ))}
              <p className="mt-auto border-t border-line pt-4 font-mono text-xs tabular-nums text-ink-tertiary">
                order parameter {order}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
