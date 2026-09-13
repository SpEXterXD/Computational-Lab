import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";

const LAYERS = [
  {
    name: "React UI",
    detail: "Routing, controls, metadata. Server components by default; interactive islands only.",
  },
  {
    name: "SimulationController",
    detail: "A fixed-timestep accumulator on requestAnimationFrame. Behavior is identical at 30 fps and 144 fps.",
  },
  {
    name: "Engine core",
    detail: "Framework-free TypeScript with typed arrays. No React imports; unit-tested; deterministic per seed.",
  },
  {
    name: "Canvas renderer",
    detail: "Theme-coupled draw primitives, DPR-aware, no glow, no allocations in the hot loop.",
  },
];

/**
 * The honest architecture section: this is what actually runs. The WASM slot
 * is documented as designed-for, not claimed as shipped (DESIGN.md §10, §13).
 */
export function ArchitectureSection() {
  return (
    <section className="border-t border-line py-20 md:py-28" aria-labelledby="architecture-heading">
      <div className="shell grid gap-12 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-5">
          <h2 id="architecture-heading" className="type-h2">
            Computation, layered.
          </h2>
          <p className="type-body mt-4 max-w-[46ch] text-ink-secondary">
            The UI never runs a simulation and the engine never touches the DOM. Each experiment
            implements one interface, so a heavier core can replace the TypeScript one without the
            page knowing.
          </p>
          <div className="mt-8 rounded-lg border border-line bg-panel p-5">
            <p className="label-mono text-ink-tertiary">WebAssembly slot</p>
            <p className="type-body mt-2 text-sm text-ink-secondary">
              The interface is built for a C++20 core compiled with Emscripten behind the same
              experiment contract. No Emscripten toolchain is installed in this environment, so the
              audited TypeScript core ships today. The swap-in point is the single factory in{" "}
              <code className="font-mono text-xs text-ink">src/engine/experiments/index.ts</code>.
            </p>
          </div>
        </Reveal>
        <Reveal className="lg:col-span-7">
          <ol className="border-t border-line">
            {LAYERS.map((layer, index) => (
              <li key={layer.name} className="border-b border-line">
                <div className="grid grid-cols-[3rem_1fr] items-baseline gap-x-4 py-5 sm:grid-cols-[3rem_14rem_1fr]">
                  <span className="font-mono text-xs tabular-nums text-ink-tertiary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-lg font-medium text-ink">{layer.name}</span>
                  <span className="col-span-2 mt-1 text-sm text-ink-tertiary sm:col-span-1 sm:mt-0">
                    {layer.detail}
                  </span>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-ink-tertiary">
            Live numbers, not claims: the pulse icon on any experiment page opens the performance
            overlay. The{" "}
            <Link href="/experiments/numerical-methods/rk4-vs-euler" className="text-accent t-fast hover:text-accent-strong">
              integrator comparison
            </Link>{" "}
            shows the engine being audited against its own exact solution.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
