"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy code"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard unavailable; the code is readable either way */
        }
      }}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm text-ink-secondary t-fast hover:bg-raised hover:text-ink"
    >
      {copied ? <CheckIcon size={14} aria-hidden className="text-accent" /> : <CopyIcon size={14} aria-hidden />}
    </button>
  );
}
