import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/link-button";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="shell flex min-h-[60vh] flex-col justify-center py-16 md:py-24">
      <p className="label-mono text-ink-tertiary">Error 404</p>
      <h1 className="type-title mt-4">Nothing at this address.</h1>
      <p className="type-body mt-4 max-w-[65ch] text-ink-secondary">
        The page you requested is not part of the laboratory. Start from the
        catalog to find the experiment you need.
      </p>
      <div className="mt-8">
        <LinkButton href="/explore">Explore experiments</LinkButton>
      </div>
    </div>
  );
}
