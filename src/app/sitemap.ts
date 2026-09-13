import type { MetadataRoute } from "next";
import { CATEGORY_ORDER, EXPERIMENTS } from "@/lib/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3210";
  const staticRoutes = ["", "/explore", ...CATEGORY_ORDER.map((id) => `/${id}`)];
  const experimentRoutes = EXPERIMENTS.map(
    (experiment) => `/experiments/${experiment.category}/${experiment.id}`,
  );
  return [...staticRoutes, ...experimentRoutes].map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
  }));
}
