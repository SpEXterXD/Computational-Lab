import type { MetricValue } from "@/engine/core/types";

function labelFor(key: string): string {
  const words = key.replace(/([A-Z])/g, " $1").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Clean raw engine numbers: reduce exponent noise, trim trailing zeros. */
function formatValue(value: MetricValue): string {
  const text = String(value);
  // Convert scientific notation like "2.12e+0" or "1.5e-7" to readable form.
  const match = text.match(/^(.+)e([+-])(\d+)$/);
  if (!match) return text;
  const mantissa = parseFloat(match[1]);
  const exp = parseInt(match[2] === "+" ? match[3] : `-${match[3]}`);
  if (exp === 0) return mantissa.toString();
  if (exp >= -2 && exp <= 3) return mantissa * Math.pow(10, exp) + "";
  // Keep scientific notation for very small/large but clean the mantissa.
  return `${mantissa.toFixed(2)}e${exp >= 0 ? "+" : ""}${exp}`;
}

/** Ruled grid of live readouts; values arrive throttled at ≤4 Hz (DESIGN.md §8). */
export function MetricsPanel({
  metrics,
  columns,
}: {
  metrics: Record<string, MetricValue>;
  columns?: 3 | 4 | 5;
}) {
  const entries = Object.entries(metrics);
  if (entries.length === 0) return null;
  const n = columns ?? (entries.length <= 3 ? 3 : entries.length <= 4 ? 4 : entries.length <= 5 ? 5 : 6);
  const gridClass =
    n === 3
      ? "grid-cols-2 sm:grid-cols-3"
      : n === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : n === 6
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5";
  return (
    <div aria-live="polite" aria-atomic="false" className={`grid gap-px border-y border-line bg-line ${gridClass}`}>
      {entries.map(([key, value]) => (
        <div key={key} className="bg-canvas px-4 py-4">
          <p className="label-mono text-ink-tertiary">{labelFor(key)}</p>
          <p className="mt-1.5 truncate font-mono text-lg tabular-nums text-ink">{formatValue(value)}</p>
        </div>
      ))}
    </div>
  );
}
