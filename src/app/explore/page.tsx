import type { Metadata } from "next";
import { Suspense } from "react";
import { ExperimentIndex } from "@/components/explore/experiment-index";
import { FilterBar } from "@/components/explore/filter-bar";
import { LinkButton } from "@/components/ui/link-button";
import {
  EXPERIMENTS,
  filterExperiments,
  isCategoryId,
  isDifficulty,
} from "@/lib/registry";

export const metadata: Metadata = {
  title: "Explore",
  description:
    "Browse every experiment in the Computational Lab catalog: algorithms, mathematics, physics, computational science, and numerical methods.",
};

export default async function ExplorePage(props: PageProps<"/explore">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const category = isCategoryId(searchParams.category) ? searchParams.category : undefined;
  const difficulty = isDifficulty(searchParams.difficulty) ? searchParams.difficulty : undefined;
  const technique = typeof searchParams.technique === "string" ? searchParams.technique : undefined;

  const filtered = filterExperiments({ q, category, difficulty, technique });

  return (
    <div className="shell py-16 md:py-24">
      <header>
        <h1 className="type-title">Explore</h1>
        <p
          aria-live="polite"
          className="mt-3 font-mono text-xs tabular-nums text-ink-tertiary"
        >
          {filtered.length} of {EXPERIMENTS.length} experiments
        </p>
      </header>
      <Suspense fallback={null}>
        <FilterBar q={q} category={category} difficulty={difficulty} technique={technique} />
      </Suspense>
      <div className="mt-10">
        {filtered.length > 0 ? (
          <ExperimentIndex experiments={filtered} />
        ) : (
          <div className="border-t border-line pt-10">
            <p className="type-body max-w-[65ch] text-ink-secondary">
              No experiments match the current filters. Clear a filter, or search for something
              broader.
            </p>
            <div className="mt-6">
              <LinkButton href="/explore" variant="secondary">
                Browse all experiments
              </LinkButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
