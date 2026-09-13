"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRef } from "react";
import type { SimulationController } from "@/engine/core/controller";
import { MiniPreview } from "@/components/sim/mini-preview";
import { lerp } from "@/engine/core/theme";

export interface JourneySectionProps {
  title: string;
  quote: string;
  body: string;
  experimentId: string;
  previewParams?: Record<string, number | string>;
  /** Scroll progress drives a real engine parameter, not a timeline animation. */
  drive?: { param: string; from: number; to: number };
  href: string;
  flip?: boolean;
}

/**
 * One stop of the computational journey (DESIGN.md §7.3): restrained parallax
 * on transforms only, and a live visualization whose engine parameter follows
 * scroll progress. Reduced motion removes the parallax, never the data.
 */
export function JourneySection({
  title,
  quote,
  body,
  experimentId,
  previewParams,
  drive,
  href,
  flip = false,
}: JourneySectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const controllerRef = useRef<SimulationController | null>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const textY = useTransform(scrollYProgress, [0, 1], [44, -44]);
  const visualY = useTransform(scrollYProgress, [0, 1], [-32, 32]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.16, 0.84, 1], [0.25, 1, 1, 0.25]);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (drive && controllerRef.current) {
      const value = Math.round(lerp(drive.from, drive.to, progress));
      const current = controllerRef.current.getExperiment().getParameterValue(drive.param);
      if (current !== value) controllerRef.current.setParameter(drive.param, value);
    }
  });

  const text = (
    <motion.div
      style={reduced ? undefined : { y: textY, opacity: textOpacity }}
      className="lg:col-span-5"
    >
      <h2 className="type-title">{title}</h2>
      <p className="type-h3 mt-5 text-accent">{quote}</p>
      <p className="type-body mt-4 max-w-[46ch] text-ink-secondary">{body}</p>
      <p className="mt-6">
        <Link
          href={href}
          className="border-b border-line pb-0.5 text-sm text-ink-secondary t-fast hover:border-accent hover:text-ink"
        >
          Open the experiment
        </Link>
      </p>
    </motion.div>
  );

  const visual = (
    <motion.div style={reduced ? undefined : { y: visualY }} className="lg:col-span-7">
      <MiniPreview
        id={experimentId}
        height={300}
        params={previewParams}
        controllerRef={controllerRef}
      />
    </motion.div>
  );

  return (
    <section
      ref={sectionRef}
      className="border-t border-line py-20 md:py-28"
      aria-label={title}
    >
      <div className="shell grid gap-10 lg:grid-cols-12 lg:gap-16">
        {flip ? (
          <>
            {visual}
            {text}
          </>
        ) : (
          <>
            {text}
            {visual}
          </>
        )}
      </div>
    </section>
  );
}
