"use client";

import { ListIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { usePalette } from "@/components/providers/palette-provider";

const LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/algorithms", label: "Algorithms" },
  { href: "/mathematics", label: "Mathematics" },
  { href: "/physics", label: "Physics" },
  { href: "/computational-science", label: "Computational Science" },
  { href: "/numerical-methods", label: "Numerical Methods" },
  { href: "/machine-learning", label: "Machine Learning" },
] as const;

export function Nav() {
  const pathname = usePathname();
  const { openPalette } = usePalette();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  /* Server renders the Mac hint; corrected before interaction on other platforms. */
  const [platformHint] = useState(() =>
    typeof navigator !== "undefined" && !/Mac|iPhone|iPad/.test(navigator.platform)
      ? "Ctrl K"
      : "⌘K",
  );

  /* Compact once the page scrolls past the top; IntersectionObserver, never a
     scroll listener (DESIGN.md §7.4). */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting));
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function isActive(href: string) {
    if (pathname === href) return true;
    return pathname.startsWith(`/experiments/${href.slice(1)}/`);
  }

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px w-px" />
      <header
        data-compact={compact}
        className="fixed inset-x-0 top-0 z-[100] border-b border-line bg-canvas"
      >
        <div className="shell nav-inner flex items-center justify-between gap-6">
          <Link
            href="/"
            className="shrink-0 whitespace-nowrap font-display text-[15px] font-medium tracking-tight text-ink"
          >
            Computational Lab<span className="text-accent">.</span>
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-5 xl:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`whitespace-nowrap text-sm t-fast ${
                  isActive(link.href)
                    ? "text-ink underline decoration-accent decoration-2 underline-offset-[10px]"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={openPalette}
              aria-label="Search experiments"
              className="hidden h-9 cursor-pointer items-center gap-2 rounded-sm border border-line px-3 text-sm text-ink-secondary t-fast hover:border-line-strong hover:bg-raised hover:text-ink sm:flex"
            >
              <MagnifyingGlassIcon size={14} aria-hidden />
              <span>Search</span>
              <kbd className="kbd" suppressHydrationWarning>
                {platformHint}
              </kbd>
            </button>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm text-ink-secondary t-fast hover:bg-raised hover:text-ink xl:hidden"
            >
              {menuOpen ? <XIcon size={18} aria-hidden /> : <ListIcon size={18} aria-hidden />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <>
          <div aria-hidden className="fixed inset-0 top-16 z-[90] bg-overlay" onClick={() => setMenuOpen(false)} />
          <nav
            id="mobile-menu"
            aria-label="Primary mobile"
            className="absolute inset-x-0 top-full z-[95] border-b border-line bg-canvas"
          >
            <ul className="shell flex flex-col py-2">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={`flex h-11 items-center text-sm t-fast ${
                      isActive(link.href)
                        ? "text-ink underline decoration-accent decoration-2 underline-offset-[10px]"
                        : "text-ink-secondary hover:text-ink"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="sm:hidden">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    openPalette();
                  }}
                  className="flex h-11 w-full cursor-pointer items-center gap-2 text-sm text-ink-secondary t-fast hover:text-ink"
                >
                  <MagnifyingGlassIcon size={14} aria-hidden />
                  Search
                </button>
              </li>
            </ul>
          </nav>
          </>
        )}
      </header>
    </>
  );
}
