import type { Metadata } from "next";
import { CategoryView } from "@/components/explore/category-view";
import { CATEGORIES } from "@/lib/registry";

const category = CATEGORIES.algorithms;

export const metadata: Metadata = {
  title: category.label,
  description: `${category.tagline} Browse the ${category.label.toLowerCase()} experiments in the Computational Lab catalog.`,
};

export default function AlgorithmsPage() {
  return <CategoryView categoryId="algorithms" />;
}
