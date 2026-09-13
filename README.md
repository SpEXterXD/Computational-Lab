# Computational Lab

An interactive laboratory of 50 computed experiments across algorithms, mathematics, physics, computational science, numerical methods, and machine learning. Every figure is rendered live from a simulation engine; every control changes the system it names. Nothing is a video and no number is invented.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Production:

```bash
npm run build
npm start
```

Quality gates:

```bash
npm test           # 84 engine + registry tests (Vitest)
npm run bench      # per-tick hot-loop benchmarks
npm run lint       # ESLint (0 errors expected)
```

## What's inside

Each experiment is a self-contained simulation with live controls, real-time metrics, and a mathematics section. Drag to paint walls in A*, inject heat into a diffusion field, place charges on a grounded box, add labeled points to a classifier — every interaction mutates engine state on the next tick.

**Pause** stops the loop. **Step** advances exactly one fixed tick (1/60 s). **Reset** reproduces the seeded initial state. Speed multiplies the simulation clock, never the render rate.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16, React 19, TypeScript strict |
| Styling | Tailwind v4 mapped onto CSS-variable design tokens |
| Motion | motion/react (scroll-linked transforms, reveals) |
| Simulation | Framework-free TypeScript engine, typed arrays, fixed 60 Hz timestep, deterministic seeds |
| Rendering | Canvas 2D, DPR-aware, theme-coupled colormaps |
| Testing | Vitest (84 unit tests) + benchmarks |

## Project structure

```
src/
  app/                    Routes (home, explore, categories, experiments, 404)
  components/
    sim/                  SimStage, metrics, controls, mini-previews
    layout/               Nav, footer, theme toggle
    explore/              Filter bar, experiment index, category views
    experiment/           Implementation code viewer
    home/                 Hero, journey, playground, architecture
    motion/               Reveal, scroll progress
    ui/                   Link button
  engine/
    core/                 BaseExperiment, SimulationController, RNG, theme
    experiments/          50 simulation implementations (one file each)
    render/               Colormaps, diverging-cache
  content/                Mathematics + how-it-works prose per experiment
  lib/                    Registry (metadata, filtering, search), highlighter
  styles/                 tokens.css (single source of truth for design tokens)
tests/                    Engine correctness, registry integrity, benchmarks
```

## Adding an experiment

1. Implement `BaseExperiment` in `src/engine/experiments/<id>.ts`
2. Register the factory and source path in `src/engine/experiments/index.ts`
3. Add metadata to `src/lib/registry.ts`
4. Add mathematics content to `src/content/experiments.ts`
5. Add tests to `tests/`

The page, controls, metrics, implementation viewer, and explorer entry generate from those five steps.

## License

MIT
