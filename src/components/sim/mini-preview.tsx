"use client";

import { useEffect, useRef } from "react";
import { SimulationController } from "@/engine/core/controller";
import type { SimulationController as ControllerRef } from "@/engine/core/controller";
import { createExperiment } from "@/engine/experiments";

/**
 * Live miniature for index rows and home sections: the same engine class as
 * the detail page at reduced scale, paused whenever offscreen, and rendered as
 * a static frame under prefers-reduced-motion (DESIGN.md §9).
 */
export function MiniPreview({
  id,
  height = 128,
  params,
  controllerRef,
  className,
}: {
  id: string;
  height?: number;
  params?: Record<string, number | string>;
  controllerRef?: { current: ControllerRef | null };
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const experiment = createExperiment(id);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        try {
          experiment.setParameter(key, value);
        } catch {
          /* preview overrides must never break the row */
        }
      }
    }
    const controller = new SimulationController(canvas, experiment);
    if (controllerRef) controllerRef.current = controller;
    const observer = new ResizeObserver(() => controller.resize());
    observer.observe(canvas);
    const visibility = new IntersectionObserver(
      ([entry]) => controller.setInView(entry.isIntersecting),
      { threshold: 0.05 },
    );
    visibility.observe(canvas);
    return () => {
      observer.disconnect();
      visibility.disconnect();
      controller.destroy();
      if (controllerRef) controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`block w-full rounded-md border border-line ${className ?? ""}`}
      style={{ height, aspectRatio: `${height * 2} / ${height}` }}
    />
  );
}
