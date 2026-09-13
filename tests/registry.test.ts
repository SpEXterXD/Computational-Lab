import { describe, expect, it } from "vitest";
import { EXPERIMENT_CONTENT } from "@/content/experiments";
import { EXPERIMENT_SOURCE, createExperiment } from "@/engine/experiments";
import {
  CATEGORIES,
  CATEGORY_ORDER,
  EXPERIMENTS,
  experimentHref,
  filterExperiments,
  getExperiment,
  relatedExperiments,
} from "@/lib/registry";

describe("experiment registry", () => {
  it("has unique ids and complete metadata", () => {
    const ids = new Set(EXPERIMENTS.map((e) => e.id));
    expect(ids.size).toBe(EXPERIMENTS.length);
    for (const experiment of EXPERIMENTS) {
      expect(experiment.title.length).toBeGreaterThan(0);
      expect(experiment.tagline.length).toBeGreaterThan(0);
      expect(experiment.description.length).toBeGreaterThan(40);
      expect(experiment.subcategory.length).toBeGreaterThan(0);
      expect(experiment.techniques.length).toBeGreaterThan(0);
      expect(experiment.tags.length).toBeGreaterThan(0);
    }
  });

  it("routes every experiment under its declared category", () => {
    for (const experiment of EXPERIMENTS) {
      const resolved = getExperimentInCategoryHelper(experiment.category, experiment.id);
      expect(resolved).toBeTruthy();
      expect(experimentHref(experiment)).toBe(
        `/experiments/${experiment.category}/${experiment.id}`,
      );
      expect(CATEGORY_ORDER).toContain(experiment.category);
    }
  });

  it("links related experiments that exist and resolves every factory", () => {
    for (const experiment of EXPERIMENTS) {
      const related = relatedExperiments(experiment);
      expect(related.length).toBeGreaterThan(0);
      for (const other of experiment.related) {
        expect(getExperiment(other)).toBeTruthy();
      }
    }
    for (const experiment of EXPERIMENTS) {
      const instance = createExperiment(experiment.id);
      expect(instance.id).toBe(experiment.id);
      expect(instance.getParameters().length).toBeGreaterThan(0);
    }
    expect(() => createExperiment("nope")).toThrow(/No experiment registered/);
  });

  it("ships math and implementation source for every experiment", () => {
    for (const experiment of EXPERIMENTS) {
      expect(EXPERIMENT_CONTENT[experiment.id]).toBeTruthy();
      expect(EXPERIMENT_SOURCE[experiment.id]).toBeTruthy();
    }
  });

  it("holds exactly 50 experiments across six populated categories", () => {
    expect(EXPERIMENTS).toHaveLength(50);
    expect(CATEGORY_ORDER).toHaveLength(6);
    const byCategory = new Map<string, number>();
    for (const experiment of EXPERIMENTS) {
      byCategory.set(experiment.category, (byCategory.get(experiment.category) ?? 0) + 1);
    }
    const expected: Record<string, number> = {
      algorithms: 10,
      mathematics: 11,
      physics: 8,
      "computational-science": 8,
      "numerical-methods": 7,
      "machine-learning": 6,
    };
    for (const category of CATEGORY_ORDER) {
      expect(byCategory.get(category) ?? 0, `category ${category}`).toBe(expected[category]);
      expect(CATEGORIES[category].label.length).toBeGreaterThan(0);
    }
  });

  it("keeps techniques[] a clean, cross-cutting axis independent of category", () => {
    for (const experiment of EXPERIMENTS) {
      expect(experiment.techniques.length, `${experiment.id} needs techniques`).toBeGreaterThan(0);
      expect(new Set(experiment.techniques).size).toBe(experiment.techniques.length);
      for (const technique of experiment.techniques) {
        expect(technique.length).toBeGreaterThan(0);
        expect(technique).not.toBe(experiment.category);
      }
    }
    // The whole point of the axis: some technique must span >= 2 categories,
    // so the explorer filter can surface cross-domain views.
    const byTechnique = new Map<string, Set<string>>();
    for (const experiment of EXPERIMENTS) {
      for (const technique of experiment.techniques) {
        const categories = byTechnique.get(technique) ?? new Set<string>();
        categories.add(experiment.category);
        byTechnique.set(technique, categories);
      }
    }
    const crossCutting = [...byTechnique.entries()].filter(
      ([, categories]) => categories.size >= 2,
    );
    expect(
      crossCutting.length,
      "expected at least one technique to span multiple categories",
    ).toBeGreaterThan(0);
  });

  it("filters by query, category, difficulty, and technique", () => {
    const pde = filterExperiments({ technique: "PDE" });
    expect(pde.map((e) => e.id).sort()).toEqual([
      "electrostatic-potential",
      "heat-diffusion",
      "reaction-diffusion",
      "wave-equation",
    ]);
    const linearSolvers = filterExperiments({ technique: "linear-solver" });
    expect(linearSolvers.map((e) => e.id).sort()).toEqual([
      "conjugate-gradient",
      "electrostatic-potential",
    ]);
    const beginner = filterExperiments({ difficulty: "beginner" });
    expect(beginner.every((e) => e.difficulty === "beginner")).toBe(true);
    const turing = filterExperiments({ q: "turing" });
    expect(turing.length).toBeGreaterThan(0);
    const combined = filterExperiments({ category: "machine-learning", difficulty: "intermediate" });
    expect(combined).toHaveLength(0);
    expect(filterExperiments({})).toHaveLength(EXPERIMENTS.length);
  });
});

function getExperimentInCategoryHelper(category: string, slug: string) {
  const experiment = getExperiment(slug);
  return experiment && experiment.category === category ? experiment : null;
}
