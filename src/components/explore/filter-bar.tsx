"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CATEGORIES,
  CATEGORY_ORDER,
  DIFFICULTY_LABELS,
  DIFFICULTY_ORDER,
  EXPERIMENTS,
  type CategoryId,
  type Difficulty,
} from "@/lib/registry";

interface FilterBarProps {
  q: string;
  category?: CategoryId;
  difficulty?: Difficulty;
  technique?: string;
}

/**
 * URL-driven filters (DESIGN.md §10): every state lives in the query string, so
 * filtered views are deep-linkable and the back button works. Search updates the
 * URL as you type, debounced.
 */
export function FilterBar({ q, category, difficulty, technique }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(q);
  const [previousQ, setPreviousQ] = useState(q);

  /* Adopt URL state when it changes externally (clear filters, back button):
     the sanctioned adjust-state-during-render pattern. */
  if (previousQ !== q) {
    setPreviousQ(q);
    setQuery(q);
  }

  useEffect(() => {
    if (query === q) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      const target = (params.toString() ? `${pathname}?${params.toString()}` : pathname) as Route;
      router.replace(target, { scroll: false });
    }, 200);
    return () => clearTimeout(timer);
  }, [query, q, pathname, router, searchParams]);

  function updateParam(key: string, value?: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const target = (params.toString() ? `${pathname}?${params.toString()}` : pathname) as Route;
    router.replace(target, { scroll: false });
  }

  function clearFilters() {
    setQuery("");
    router.replace(pathname as Route, { scroll: false });
  }

  const hasActiveFilters = Boolean(q || category || difficulty || technique);

  return (
    <div className="mt-10 border-t border-line pt-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="explore-search" className="label-mono text-ink-tertiary">
          Search
        </label>
        <input
          id="explore-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Title, technique, or tag…"
          className="h-10 w-full max-w-sm rounded-sm border border-line bg-raised px-3 text-sm text-ink placeholder:text-ink-tertiary"
        />
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <FilterGroup
          label="Category"
          allLabel="All fields"
          active={category}
          onSelect={(value) => updateParam("category", value)}
          options={CATEGORY_ORDER.map((id) => ({ value: id, label: CATEGORIES[id].label }))}
        />
        <FilterGroup
          label="Difficulty"
          allLabel="All levels"
          active={difficulty}
          onSelect={(value) => updateParam("difficulty", value)}
          options={DIFFICULTY_ORDER.map((level) => ({
            value: level,
            label: DIFFICULTY_LABELS[level],
          }))}
        />
        <FilterGroup
          label="Technique"
          allLabel="All techniques"
          active={technique}
          onSelect={(value) => updateParam("technique", value)}
          options={[...new Set(
            EXPERIMENTS.filter((e) => !category || e.category === category).flatMap((e) => e.techniques)
          )].sort().map((name) => ({ value: name, label: name }))}
        />
      </div>

    </div>
  );
}

function FilterGroup({
  label,
  allLabel,
  active,
  onSelect,
  options,
}: {
  label: string;
  allLabel: string;
  active?: string;
  onSelect: (value?: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div
      role="group"
      aria-label={`Filter by ${label.toLowerCase()}`}
      className="flex flex-wrap items-baseline gap-x-5 gap-y-2"
    >
      <span className="label-mono w-24 shrink-0 text-ink-tertiary">{label}</span>
      <SegmentButton label={allLabel} active={!active} onClick={() => onSelect(undefined)} />
      {options.map((option) => (
        <SegmentButton
          key={option.value}
          label={option.label}
          active={active === option.value}
          onClick={() => onSelect(option.value)}
        />
      ))}
    </div>
  );
}

function SegmentButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`cursor-pointer border-b-2 pb-1 text-sm t-fast ${
        active ? "border-accent text-ink" : "border-transparent text-ink-secondary hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
