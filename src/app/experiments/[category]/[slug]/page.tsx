import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImplementationSection } from "@/components/experiment/implementation-section";
import { Reveal, ScrollProgress } from "@/components/motion/reveal";
import { ExperimentIndex } from "@/components/explore/experiment-index";
import { SimStage } from "@/components/sim/sim-stage";
import { EXPERIMENT_CONTENT } from "@/content/experiments";
import {
  CATEGORIES,
  DIFFICULTY_LABELS,
  EXPERIMENTS,
  getExperimentInCategory,
  relatedExperiments,
} from "@/lib/registry";

interface ExperimentParams {
  category: string;
  slug: string;
}

export function generateStaticParams() {
  return EXPERIMENTS.map((experiment) => ({
    category: experiment.category,
    slug: experiment.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<ExperimentParams>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const experiment = getExperimentInCategory(category, slug);
  if (!experiment) return {};
  return {
    title: experiment.title,
    description: experiment.description,
    alternates: { canonical: `/experiments/${experiment.category}/${experiment.id}` },
    openGraph: { title: experiment.title, description: experiment.description },
  };
}

export default async function ExperimentPage({
  params,
}: PageProps<"/experiments/[category]/[slug]">) {
  const { category, slug } = await params;
  const experiment = getExperimentInCategory(category, slug);
  if (!experiment) notFound();

  const related = relatedExperiments(experiment);
  const categoryMeta = CATEGORIES[experiment.category];
  const content = EXPERIMENT_CONTENT[experiment.id];

  return (
    <article className="shell py-16 md:py-24">
      <ScrollProgress />
      <nav aria-label="Breadcrumb" className="font-mono text-xs text-ink-tertiary">
        <Link href={`/${experiment.category}`} className="t-fast hover:text-accent">
          {categoryMeta.label}
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span>{experiment.subcategory}</span>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-ink">{experiment.title}</span>
      </nav>

      <header className="mt-10">
        <h1 className="type-title">{experiment.title}</h1>
        <p className="type-lead mt-4 max-w-[52ch] text-ink-secondary">{experiment.tagline}</p>
        <p className="label-mono mt-6 text-ink-tertiary">
          {DIFFICULTY_LABELS[experiment.difficulty]} / {experiment.techniques.join(" / ")}
        </p>
      </header>

      <div className="mt-10 border-t border-line pt-8">
        <p className="type-body max-w-[65ch] text-ink-secondary">{experiment.description}</p>
        <p className="mt-6 font-mono text-xs text-ink-tertiary">
          Tagged: {experiment.tags.join(", ")}
        </p>
      </div>

      <section className="mt-14" aria-labelledby="live-heading">
        <h2 id="live-heading" className="type-h3">
          Live simulation
        </h2>
        <div className="mt-6">
          <SimStage id={experiment.id} />
        </div>
      </section>

      {content && (
        <>
          <section className="mt-16 border-t border-line pt-10" aria-labelledby="math-heading">
            <h2 id="math-heading" className="type-h3">
              Mathematics
            </h2>
            <p className="type-body mt-6 max-w-[65ch] text-ink-secondary">{content.mathIntro}</p>
            <Reveal className="mt-6 max-w-[65ch] overflow-x-auto rounded-lg border border-line bg-panel px-5 py-4">
              {content.equations.map((equation) => (
                <p
                  key={equation}
                  className="whitespace-pre font-mono text-[13px] leading-loose text-ink"
                >
                  {equation}
                </p>
              ))}
            </Reveal>
            {content.mathOutro && (
              <p className="type-body mt-6 max-w-[65ch] text-ink-secondary">{content.mathOutro}</p>
            )}
          </section>

          <section className="mt-16 border-t border-line pt-10" aria-labelledby="how-heading">
            <h2 id="how-heading" className="type-h3">
              How it works
            </h2>
            <Reveal className="mt-6 flex max-w-[65ch] flex-col gap-4">
              {content.how.map((paragraph) => (
                <p key={paragraph.slice(0, 32)} className="type-body text-ink-secondary">
                  {paragraph}
                </p>
              ))}
            </Reveal>
          </section>
        </>
      )}

      <ImplementationSection id={experiment.id} />

      {content && (
        <section className="mt-16 border-t border-line pt-10" aria-labelledby="performance-heading">
          <h2 id="performance-heading" className="type-h3">
            Performance
          </h2>
          <Reveal>
          <dl className="mt-6 grid max-w-[65ch] gap-px border border-line bg-line sm:grid-cols-3">
            <div className="bg-canvas p-4">
              <dt className="label-mono text-ink-tertiary">Time per tick</dt>
              <dd className="mt-2 text-sm text-ink">{content.complexity.time}</dd>
            </div>
            <div className="bg-canvas p-4">
              <dt className="label-mono text-ink-tertiary">Space</dt>
              <dd className="mt-2 text-sm text-ink">{content.complexity.space}</dd>
            </div>
            <div className="bg-canvas p-4">
              <dt className="label-mono text-ink-tertiary">Notes</dt>
              <dd className="mt-2 text-sm text-ink">{content.complexity.note}</dd>
            </div>
          </dl>
          </Reveal>
          <p className="type-body mt-4 max-w-[65ch] text-ink-tertiary text-sm">
            Live numbers (FPS, frame time, steps per second, microseconds per step, entity count)
            are in the performance overlay on the simulation above: the pulse icon in its top-right
            corner.
          </p>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-16 border-t border-line pt-10" aria-labelledby="related-heading">
          <h2 id="related-heading" className="type-h3">
            Related experiments
          </h2>
          <div className="mt-8">
            <Reveal>
            <ExperimentIndex experiments={related} />
            </Reveal>
          </div>
        </section>
      )}
    </article>
  );
}
