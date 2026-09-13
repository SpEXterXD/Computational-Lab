"use client";

import { MoonIcon, SunIcon } from "@phosphor-icons/react";

const LIGHT_BG = "#faf9f7";
const DARK_BG = "#0b0b0d";

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem("computational-lab-theme", next);
    } catch {
      /* storage can be unavailable in private modes; the toggle still works live */
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next === "light" ? LIGHT_BG : DARK_BG);
    // Live canvases re-resolve their theme colors on this event (DESIGN.md §9).
    window.dispatchEvent(new CustomEvent("cl-themechange"));
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className="theme-toggle flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm text-ink-secondary t-fast hover:bg-raised hover:text-ink"
    >
      <SunIcon size={16} aria-hidden className="icon-sun" />
      <MoonIcon size={16} aria-hidden className="icon-moon" />
    </button>
  );
}
