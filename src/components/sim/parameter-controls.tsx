"use client";

import type { ParameterDef } from "@/engine/core/types";
import type { SimulationController } from "@/engine/core/controller";

/** Labeled native range input (DESIGN.md §8): value updates the engine on every input event. */
export function ParameterSlider({
  def,
  value,
  onChange,
}: {
  def: Extract<ParameterDef, { min: number }>;
  value: number;
  onChange: (value: number) => void;
}) {
  const display = def.format ? def.format(value) : `${value}${def.unit ? ` ${def.unit}` : ""}`;
  // Fraction of the track filled (for the accent progress bar).
  const pct = ((value - def.min) / (def.max - def.min)) * 100;
  const trackStyle = {
    "--fill": `${pct}%`,
  } as React.CSSProperties;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={`param-${def.key}`} className="text-[13px] text-ink-secondary">
          {def.label}
        </label>
        <span className="font-mono text-[13px] tabular-nums text-ink">{display}</span>
      </div>
      <input
        id={`param-${def.key}`}
        type="range"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        aria-valuetext={display}
        onChange={(event) => onChange(Number(event.target.value))}
        style={trackStyle}
        className="mt-1.5 h-8 w-full cursor-pointer appearance-none bg-transparent
          [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-sm [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent
          [&::-moz-range-track]:h-0.5 [&::-moz-range-track]:bg-line-strong
          [&::-webkit-slider-runnable-track]:h-0.5 [&::-webkit-slider-runnable-track]:bg-line-strong
          [&::-webkit-slider-thumb]:-mt-[6px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:bg-accent"
      />
    </div>
  );
}

/** Native select with explicit colors (Windows dark-mode rule, DESIGN.md §11). */
export function ParameterSelect({
  def,
  value,
  onChange,
}: {
  def: Extract<ParameterDef, { options: unknown[] }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={`param-${def.key}`} className="text-[13px] text-ink-secondary">
        {def.label}
      </label>
      <select
        id={`param-${def.key}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-9 w-full cursor-pointer rounded-sm border border-line bg-raised px-2 text-sm text-ink"
      >
        {def.options.map((option) => (
          <option key={option.value} value={option.value} className="bg-panel text-ink">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ParameterControls({
  controller,
  params,
  onInteraction,
}: {
  controller: SimulationController;
  params: ParameterDef[];
  onInteraction: () => void;
}) {
  const experiment = controller.getExperiment();
  return (
    <div className="flex flex-col gap-5">
      {params.map((def) =>
        "options" in def ? (
          <ParameterSelect
            key={def.key}
            def={def}
            value={String(experiment.getParameterValue(def.key))}
            onChange={(value) => {
              controller.setParameter(def.key, value);
              onInteraction();
            }}
          />
        ) : (
          <ParameterSlider
            key={def.key}
            def={def}
            value={Number(experiment.getParameterValue(def.key))}
            onChange={(value) => {
              controller.setParameter(def.key, value);
              onInteraction();
            }}
          />
        ),
      )}
    </div>
  );
}
