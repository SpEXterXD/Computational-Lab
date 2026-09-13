import { ExperimentIndex } from "@/components/explore/experiment-index";
import { LinkButton } from "@/components/ui/link-button";
import {
  CATEGORIES,
  experimentsByCategory,
  type CategoryId,
} from "@/lib/registry";

export function CategoryView({ categoryId }: { categoryId: CategoryId }) {
  const category = CATEGORIES[categoryId];
  const experiments = experimentsByCategory(categoryId);

  return (
    <div className="shell py-16 md:py-24">
      <h1 className="type-title">{category.label}</h1>
      <p className="type-lead mt-4 max-w-[52ch] text-ink-secondary">{category.tagline}</p>
      <p className="label-mono mt-6 tabular-nums text-ink-tertiary">
        {experiments.length} {experiments.length === 1 ? "experiment" : "experiments"}
      </p>
      <div className="mt-10">
        {experiments.length > 0 ? (
          <ExperimentIndex experiments={experiments} showCategory={false} />
        ) : (
          <div className="border-t border-line pt-10">
            <p className="type-body max-w-[65ch] text-ink-secondary">
              Nothing is catalogued under {category.label} yet. The catalog grows in waves; the
              explorer lists everything available now.
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
