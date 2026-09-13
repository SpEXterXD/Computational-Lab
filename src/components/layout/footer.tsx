import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/algorithms", label: "Algorithms" },
  { href: "/mathematics", label: "Mathematics" },
  { href: "/physics", label: "Physics" },
  { href: "/computational-science", label: "Computational Science" },
  { href: "/numerical-methods", label: "Numerical Methods" },
  { href: "/machine-learning", label: "Machine Learning" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="shell flex flex-col gap-6 py-12 md:flex-row md:items-baseline md:justify-between">
        <div>
          <p className="font-display text-[15px] font-medium tracking-tight text-ink">
            Computational Lab<span className="text-accent">.</span>
          </p>
          <p className="mt-1 text-sm text-ink-secondary">Interactive computation for curious minds.</p>
        </div>
        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-secondary"
        >
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="t-fast hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
