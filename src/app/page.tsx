import { ArchitectureSection } from "@/components/home/architecture-section";
import { HeroCanvas } from "@/components/home/hero-canvas";
import { JourneySection } from "@/components/home/journey-section";
import { VariablePlayground } from "@/components/home/variable-playground";
import { ExperimentIndex } from "@/components/explore/experiment-index";
import { LinkButton } from "@/components/ui/link-button";
import { EXPERIMENTS } from "@/lib/registry";

export default function HomePage() {
  return (
    <>
      {/* Hero: a real simulation is the visual center; typography rises over it. */}
      <section className="relative flex min-h-[82dvh] items-end overflow-hidden border-b border-line">
        <HeroCanvas />
        <div className="pointer-events-none relative z-10 w-full select-text pb-8 pt-40">
          <div className="shell">
            <p className="label-mono hero-rise text-ink-tertiary" style={{ ["--rise-delay" as never]: "0ms" }}>
              Interactive computational laboratory
            </p>
            <h1
              className="type-display hero-rise mt-6 uppercase"
              style={{ ["--rise-delay" as never]: "90ms" }}
            >
              Computation,
              <br />
              made visible.
            </h1>
            <p
              className="hero-rise type-lead mt-6 max-w-[52ch] text-ink-secondary"
              style={{ ["--rise-delay" as never]: "200ms" }}
            >
              Interactive experiments in algorithms, mathematics, physics, and numerical science.
              Every figure is computed live; every control changes the system it names.
            </p>
            <div className="hero-rise mt-8" style={{ ["--rise-delay" as never]: "320ms" }}>
              <span className="pointer-events-auto inline-block">
                <LinkButton href="/explore">Explore experiments</LinkButton>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line" aria-labelledby="manifesto-heading">
        <div className="shell pb-20 pt-14 md:pb-24 md:pt-16">
          <h2 id="manifesto-heading" className="type-h2 max-w-[24ch]">
            Computation is invisible until you give it form.
          </h2>
          <p className="type-body mt-6 max-w-[65ch] text-ink-secondary">
            The laboratory turns algorithms, equations, and numerical systems into instruments you
            can operate: change a parameter, advance a single step, and watch the state answer.
            Nothing on this site is a video, and no number is invented.
          </p>
        </div>
      </section>

      {/* The journey: four fields, each with a live engine; scroll drives real parameters. */}
      <div className="border-t border-line">
        <JourneySection
          title="Algorithms"
          quote="Structure determines possibility."
          body="A* expands the most promising cell first: cost paid so far, plus an honest guess of what remains. As you scroll, the obstacle density changes and the search restarts on the new maze, live."
          experimentId="a-star"
          previewParams={{ rate: 6, density: 18 }}
          drive={{ param: "density", from: 4, to: 42 }}
          href="/experiments/algorithms/a-star"
        />
        <JourneySection
          title="Mathematics"
          quote="Equations become geometry."
          body="A Taylor polynomial rebuilds sin(x) from derivatives at a single point. Scrolling adds terms; watch the polynomial commit to the curve, then betray it at the edges of the domain."
          experimentId="taylor-series"
          previewParams={{ terms: 1 }}
          drive={{ param: "terms", from: 1, to: 15 }}
          href="/experiments/mathematics/taylor-series"
          flip
        />
        <JourneySection
          title="Physics"
          quote="Rules become motion."
          body="Two rigid links under gravity, integrated with RK4 on the exact Lagrangian equations. The ghost is a twin started one millionth of a radian away; when it parts ways with the primary, you are watching chaos."
          experimentId="double-pendulum"
          href="/experiments/physics/double-pendulum"
        />
        <JourneySection
          title="Computation"
          quote="Models become experiments."
          body="Gray-Scott reaction-diffusion: two reagents, one eating the other, diffusion doing the rest. Turing predicted the patterns in 1952; the engine applies the two partial differential equations on a torus, sixty times a second."
          experimentId="reaction-diffusion"
          previewParams={{ iterations: 10 }}
          href="/experiments/computational-science/reaction-diffusion"
          flip
        />
      </div>

      {/* The catalog: ruled editorial index, every row running its live engine. */}
      <section className="border-t border-line py-20 md:py-24" aria-labelledby="catalog-heading">
        <div className="shell">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="catalog-heading" className="type-h2">
              The catalog
            </h2>
            <p className="font-mono text-xs tabular-nums text-ink-tertiary">
              {EXPERIMENTS.length} experiments
            </p>
          </div>
          <div className="mt-10">
            <ExperimentIndex experiments={EXPERIMENTS} />
          </div>
        </div>
      </section>

      <VariablePlayground />
      <ArchitectureSection />

      <section className="border-t border-line py-24 md:py-32" aria-labelledby="cta-heading">
        <div className="shell">
          <h2 id="cta-heading" className="type-title max-w-[22ch]">
            Pick a system. Change a variable. See what happens.
          </h2>
          <div className="mt-8">
            <LinkButton href="/explore">Explore experiments</LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
