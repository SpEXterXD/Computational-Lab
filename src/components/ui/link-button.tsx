import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

const VARIANTS = {
  primary: "bg-accent text-accent-contrast hover:bg-accent-strong",
  secondary: "border border-line text-ink hover:border-line-strong hover:bg-raised",
} as const;

export function LinkButton({
  href,
  variant = "primary",
  children,
}: {
  href: Route;
  variant?: keyof typeof VARIANTS;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center rounded-sm px-4 text-sm font-medium t-fast active:translate-y-px ${VARIANTS[variant]}`}
    >
      {children}
    </Link>
  );
}
