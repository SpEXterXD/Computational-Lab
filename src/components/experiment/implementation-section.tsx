import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CopyButton } from "@/components/experiment/copy-button";
import { EXPERIMENT_SOURCE } from "@/engine/experiments";
import { highlightTypeScript } from "@/lib/highlight";

/**
 * Shows the actual engine module that powers the simulation on this page,
 * read from disk at render time so the code can never drift from the source.
 */
export function ImplementationSection({ id }: { id: string }) {
  const relativePath = EXPERIMENT_SOURCE[id];
  if (!relativePath) return null;
  let source = "";
  try {
    source = readFileSync(join(process.cwd(), relativePath), "utf8");
  } catch {
    return null;
  }
  const lines = source.split("\n").length;
  return (
    <section className="mt-16 border-t border-line pt-10" aria-labelledby="implementation-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="implementation-heading" className="type-h3">
          Implementation
        </h2>
        <p className="font-mono text-xs text-ink-tertiary">
          {relativePath} · {lines.toLocaleString("en-US")} lines · the module running above
        </p>
      </div>
      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <p className="font-mono text-xs text-ink-tertiary">TypeScript · fixed-timestep engine</p>
          <CopyButton text={source} />
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full border-collapse font-mono text-[13px] leading-relaxed">
            <tbody>
              {source.split("\n").map((line, i) => (
                <tr key={i}>
                  <td className="select-none border-r border-line px-3 text-right align-top text-ink-tertiary tabular-nums">
                    {i + 1}
                  </td>
                  <td className="whitespace-pre px-4 text-ink-secondary">
                    <code dangerouslySetInnerHTML={{ __html: highlightTypeScript(line) }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
