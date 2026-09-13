"use client";

import { useEffect, useRef } from "react";
import { SimulationController } from "@/engine/core/controller";
import { HeroFieldExperiment } from "@/engine/experiments/hero-field";

/**
 * Hero canvas island: the field runs only while visible, starts paused under
 * prefers-reduced-motion (static frame, pointer still redraws on demand).
 */
export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const experiment = new HeroFieldExperiment();
    const controller = new SimulationController(canvas, experiment);
    const observer = new ResizeObserver(() => controller.resize());
    observer.observe(canvas);
    const visibility = new IntersectionObserver(
      ([entry]) => controller.setInView(entry.isIntersecting),
      { threshold: 0.01 },
    );
    visibility.observe(canvas);

    function sendPointer(event: PointerEvent, down: boolean | null) {
      const rect = canvas!.getBoundingClientRect();
      controller.pointer(
        event.clientX - rect.left,
        event.clientY - rect.top,
        down === null ? event.buttons > 0 : down,
        true,
      );
    }
    const onMove = (event: PointerEvent) => sendPointer(event, null);
    const onDown = (event: PointerEvent) => sendPointer(event, true);
    const onUp = (event: PointerEvent) => sendPointer(event, false);
    const onLeave = () => controller.pointer(0, 0, false, false);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      observer.disconnect();
      visibility.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      controller.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="A live vector field: hundreds of particles flowing along a computed field. Move the pointer to disturb the flow."
      className="absolute inset-0 h-full w-full"
    />
  );
}
