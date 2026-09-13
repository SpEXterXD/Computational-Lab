"use client";

import { motion, useReducedMotion, useScroll } from "motion/react";
import type { ReactNode } from "react";

/**
 * Enter-on-scroll reveal (DESIGN.md §7.3): opacity with a short rise, once,
 * collapsed to instant under reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: [0.2, 0, 0, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Scroll progress hairline for long pages (experiment detail pages). */
export function ScrollProgress() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  if (reduced) return null;
  return (
    <div aria-hidden className="sticky top-16 z-[90] h-px w-full">
      <motion.div
        className="h-px origin-left bg-accent"
        style={{ scaleX: scrollYProgress }}
      />
    </div>
  );
}
