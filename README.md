# Computational Lab

Computational Lab is an interactive laboratory featuring 50 numerical simulations running in real time in your browser. It spans algorithms, mathematics, physics, computational science, numerical methods, and machine learning.

Every diagram is rendered live from a custom simulation engine. Every slider, toggle, and canvas drag directly alters the underlying equations. There are no pre-recorded video loops and no mocked values.

## Quick Start

Make sure you have Node.js 18 or later installed.

```bash
npm install
npm run dev        # Visit http://localhost:3000
```

To build for production:

```bash
npm run build
npm start
```

## Quality and Testing

All simulation logic is covered by automated regression tests and per-tick execution benchmarks.

```bash
npm test           # Runs all 103 unit and integration tests with Vitest
npm run bench      # Hot-loop timing benchmarks for engine performance
npm run lint       # ESLint verification (zero errors expected)
```

## How It Works

Each experiment is built as an independent, deterministic simulation. The simulation loop runs on a fixed 60 Hz clock using typed arrays (`Float32Array`, `Uint8Array`) for optimal memory locality and predictable garbage collection.

Key controls available across experiments:
* **Play / Pause**: Freezes the simulation loop without losing current state.
* **Step**: Advances the mathematical engine by exactly one discrete timestep (1/60th of a second), ideal for studying edge cases and numerical transitions.
* **Reset**: Returns the system to its initial state using a deterministic pseudo-random seed.
* **Speed**: Scales the physical clock rate while keeping the render frame rate stable.
* **Direct Canvas Manipulation**: Click and drag on the canvas to paint maze walls, introduce heat sources, seed vortex plumes, or place electric charges.

## Domains and Coverage

The laboratory organizes 50 distinct computational models across six primary disciplines:

1. **Algorithms**: A* pathfinding, Dijkstra, Breadth-First and Depth-First search, RRT/RRT*, sorting algorithm comparisons, and Barnes-Hut gravitational quadtrees.
2. **Mathematics**: Fast Fourier Transform (FFT), Mandelbrot and Julia fractals, numerical quadrature, eigenvector transformations, and Monte Carlo circle approximations.
3. **Physics**: Double pendulum chaos with Lyapunov divergence, coupled harmonic oscillators, Keplerian orbits, wave superposition, and n-body gravitational leapfrog integration.
4. **Computational Science**: 2D Navier-Stokes fluid mechanics, reaction-diffusion Turing patterns, heat diffusion, marching squares contouring, and Conway's Game of Life.
5. **Numerical Methods**: Runge-Kutta 4 compared with explicit and semi-implicit Euler, Newton-Raphson root finding, and simulated annealing optimization.
6. **Machine Learning**: Support Vector Machines (SVM) with linear hyperplanes, Perceptrons, K-Means clustering, and gradient descent landscape optimization.

## Tech Stack

* **Framework**: Next.js 16 with React 19 and strict TypeScript.
* **Styling**: Tailwind CSS v4 using semantic CSS-variable design tokens.
* **Motion**: motion/react for smooth UI reveals and scroll-linked elements.
* **Simulation Core**: Pure TypeScript with typed arrays, fixed-delta time stepping, and zero heavy third-party simulation runtimes.
* **Rendering**: High-DPI canvas 2D contexts with theme-adaptive colormaps.
* **Testing**: Vitest with 103 test cases covering mathematics, integration, and algorithmic stability.

## Project Structure

```
src/
  app/                    Next.js application routes (explore, categories, experiments)
  components/
    sim/                  Simulation viewport, live telemetry HUD, parameter controls
    explore/              Experiment catalog, domain filters, and search indexing
    home/                 Landing page hero canvas, interactive journey, and architecture
    layout/               Site navigation, headers, and footer
  engine/
    core/                 BaseExperiment class, simulation controller, seeded RNG
    experiments/          50 standalone simulation implementations (one file per topic)
    render/               Palette caches and high-performance colormaps
  content/                Mathematical explanations and background notes per experiment
  lib/                    Registry metadata, filtering logic, and syntax highlighting
  styles/                 CSS design tokens and theme palettes
tests/                    Regression tests, numerical verification, and performance benchmarks
```

## Adding a New Experiment

To contribute an experiment:

1. Create a new experiment class extending `BaseExperiment` in `src/engine/experiments/<id>.ts`.
2. Export and register the experiment factory in `src/engine/experiments/index.ts`.
3. Add domain metadata, tags, and parameter definitions in `src/lib/registry.ts`.
4. Provide the mathematical background and equation explanations in `src/content/experiments.ts`.
5. Add unit and regression tests in `tests/`.

The navigation routes, control panels, telemetry readouts, and source code viewer will generate automatically from these definitions.

## License

MIT
