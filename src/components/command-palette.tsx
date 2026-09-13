"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIES,
  DIFFICULTY_LABELS,
  experimentHref,
  searchExperiments,
} from "@/lib/registry";

/**
 * Mounted only while open, so its state initializes fresh on every open.
 * Escape and ⌘K/Ctrl+K are handled globally by the palette provider.
 */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => searchExperiments(query).slice(0, 8), [query]);

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, results.length]);

  function openExperiment(href: string) {
    onClose();
    router.push(href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      const pick = results[activeIndex];
      if (pick) {
        event.preventDefault();
        openExperiment(experimentHref(pick));
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[400]" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-overlay" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search experiments"
        className="absolute left-1/2 top-[18vh] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-lg border border-line-strong bg-panel shadow-overlay"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <MagnifyingGlassIcon size={16} className="shrink-0 text-ink-tertiary" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={
              results[activeIndex] ? `palette-option-${activeIndex}` : undefined
            }
            aria-label="Search experiments"
            placeholder="Search experiments…"
            className="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-tertiary"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="kbd shrink-0 cursor-pointer"
          >
            esc
          </button>
        </div>
        <ul
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          aria-label="Experiments"
          className="max-h-[320px] overflow-y-auto overscroll-contain"
        >
          {results.map((experiment, index) => (
            <li
              key={experiment.id}
              id={`palette-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
            >
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => openExperiment(experimentHref(experiment))}
                className={`flex w-full cursor-pointer items-baseline justify-between gap-4 px-4 py-3 text-left t-fast ${
                  index === activeIndex ? "bg-raised" : ""
                }`}
              >
                <span className="text-sm font-medium text-ink">{experiment.title}</span>
                <span className="shrink-0 font-mono text-xs text-ink-tertiary">
                  {CATEGORIES[experiment.category].label} / {DIFFICULTY_LABELS[experiment.difficulty]}
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-4 py-6 text-sm text-ink-secondary" aria-live="polite">
              No experiments match “{query}”.
            </li>
          )}
        </ul>
        <div className="flex items-center gap-3 border-t border-line px-4 py-2.5 font-mono text-xs text-ink-tertiary">
          <span>↑↓ navigate</span>
          <span className="border-l border-line-strong pl-3">↵ open</span>
          <span className="border-l border-line-strong pl-3">esc close</span>
        </div>
      </div>
    </div>
  );
}
