# Computational Lab: Experiment Catalog

50 experiments across six categories, every one implementing the same
contract, running on the same fixed-timestep controller,
and deterministic per seed. Page, controls, metrics, implementation section,
and live previews all generate from the registry.

## Catalog

| # | Experiment | Category | Subcategory | Level | The hook |
|---|---|---|---|---|---|
| 01 | A* | Algorithms | Pathfinding | Intermediate | f = g + h with Dijkstra/greedy comparison modes |
| 02 | Sorting | Algorithms | Comparison Sorting | Beginner | Six algorithms as operation generators |
| 03 | Conway's Game of Life | Algorithms | Emergent Systems | Beginner | B3/S23 on a torus; drag-to-paint |
| 04 | Boids | Algorithms | Emergent Systems | Intermediate | Spatial hash, live order parameter |
| 05 | Langton's Ant | Algorithms | Emergent Systems | Beginner | The period-104 highway |
| 06 | BFS & DFS | Algorithms | Graph Traversal | Beginner | Queue vs stack frontier geometry |
| 07 | RRT & RRT* | Algorithms | Path Planning | Advanced | Sampling trees; rewiring drives the cost down |
| 08 | Barnes-Hut Quadtree | Algorithms | Spatial | Advanced | Quadtree gravity with a live force-error audit |
| 09 | Genetic Algorithm | Algorithms | Optimization | Intermediate | Population climbing a rugged landscape |
| 10 | Simulated Annealing | Algorithms | Optimization | Intermediate | TSP 2-opt under the Metropolis criterion |
| 11 | Mandelbrot Set | Mathematics | Complex Analysis | Intermediate | Escape-time zoom with smooth coloring |
| 12 | Julia Sets | Mathematics | Complex Analysis | Intermediate | One parameter c, endlessly many fractals |
| 13 | SVD & Image Compression | Mathematics | Linear Algebra | Advanced | One-sided Jacobi SVD; rank-k slider |
| 14 | Eigenvectors & Eigenvalues | Mathematics | Linear Algebra | Intermediate | Invariant directions from the characteristic polynomial |
| 15 | Matrix Transformations | Mathematics | Linear Algebra | Beginner | Rotation/scale/shear composed live |
| 16 | Taylor Series | Mathematics | Approximation | Beginner | Partial sums vs the true curve |
| 17 | Fourier Series | Mathematics | Analysis | Intermediate | Gibbs ringing, visible and measured |
| 18 | Fourier Transform (DFT) | Mathematics | Analysis | Intermediate | Textbook-definition spectrum of a composed signal |
| 19 | Central Limit Theorem | Mathematics | Probability | Beginner | Means converging to the predicted Gaussian |
| 20 | Probability Distributions | Mathematics | Probability | Beginner | Exact pmf over the running histogram |
| 21 | Vector Fields | Mathematics | Vector Calculus | Beginner | Flow + source + vortex, pointer steerable |
| 22 | N-Body Gravity | Physics | Gravitation | Advanced | Leapfrog/RK4/Euler with energy drift audit |
| 23 | Double Pendulum | Physics | Classical Mechanics | Intermediate | Exact Lagrangian equations, chaos twin |
| 24 | Elastic Collisions | Physics | Classical Mechanics | Beginner | Impulse resolution; conserved energy, audited |
| 25 | Projectile Motion | Physics | Mechanics | Beginner | Quadratic drag vs the analytic parabola |
| 26 | Springs & Oscillation | Physics | Oscillations | Beginner | Coupled chain; energy conservation verified |
| 27 | Kepler's Laws | Physics | Orbital Mechanics | Intermediate | Equal-area wedges, T² = a³ readout |
| 28 | Three-Body Problem | Physics | Orbital Mechanics | Advanced | The Chenciner-Montgomery figure eight |
| 29 | Wave Superposition | Physics | Waves | Beginner | Beats and cancellation by pure addition |
| 30 | Heat Diffusion | Computational Science | PDEs | Intermediate | FTCS with enforced stability limit |
| 31 | Reaction-Diffusion | Computational Science | PDEs | Advanced | Gray-Scott phase diagram |
| 32 | Electrostatic Potential | Computational Science | Fields | Advanced | Poisson via SOR; place charges live |
| 33 | Wave Equation | Computational Science | PDEs | Intermediate | Leapfrog drum head; drag to strike |
| 34 | Error-Diffusion Dithering | Computational Science | Rendering | Beginner | Floyd-Steinberg; the mean survives |
| 35 | Marching Squares | Computational Science | Rendering | Intermediate | 16-case iso-contours of moving metaballs |
| 36 | Raycasting Shadows | Computational Science | Rendering | Intermediate | DDA rays; every lit cell is auditable |
| 37 | 2-D Convolution | Computational Science | Rendering | Beginner | One kernel, four filters |
| 38 | Adaptive Step Size (RK45) | Numerical Methods | ODEs | Advanced | Dormand-Prince 5(4); step trace |
| 39 | Conjugate Gradient | Numerical Methods | Linear Systems | Advanced | Three solvers racing on the #32 system |
| 40 | Least Squares | Numerical Methods | Approximation | Beginner | Normal equations vs outliers |
| 41 | RK4 vs Euler | Numerical Methods | ODEs | Intermediate | One oscillator, three integrators |
| 42 | Newton-Raphson | Numerical Methods | Root Finding | Beginner | Tangent walks, divergences included |
| 43 | Numerical Quadrature | Numerical Methods | Quadrature | Intermediate | Riemann/trapezoid/Simpson error orders |
| 44 | Monte Carlo Estimation | Numerical Methods | Monte Carlo | Beginner | Darts converging on pi at 1/sqrt(N) |
| 45 | Gradient Descent | Machine Learning | Optimization | Beginner | Loss-surface descent vs the closed form |
| 46 | K-Means Clustering | Machine Learning | Unsupervised | Beginner | Lloyd's monotone inertia, verified |
| 47 | Perceptron | Machine Learning | Classification | Beginner | 1958 convergence, live boundary |
| 48 | Support Vector Machine | Machine Learning | Classification | Advanced | Kernelized Pegasos, margin-active rings |
| 49 | Naive Bayes Classifier | Machine Learning | Classification | Beginner | Gaussian posteriors, live boundary |
| 50 | K-Nearest Neighbors | Machine Learning | Classification | Beginner | The dataset is the model |

## Taxonomy (post-refactor)

Two orthogonal axes in the registry schema:

- `category` / `subcategory`: domain placement, driving navigation and the breadcrumb
  (Algorithms / Pathfinding / A*). Algorithms carries deliberate subcategories:
  Pathfinding, Graph Traversal, Comparison Sorting, Emergent Systems, Spatial,
  Optimization. Computational Science carries a Rendering subcategory
  (dithering, marching squares, raycasting, convolution).
- `techniques[]`: cross-cutting filter tags, independent of category
  (lowercase words, uppercase acronyms: PDE, ODE, RK4, SVD, SVM). The
  explorer's technique filter is cross-domain by construction: "integration"
  spans Physics and Numerical Methods; "linear-solver" spans Computational
  Science and Numerical Methods; "classification" gathers the ML cluster.

## Interaction contract (verified by tests and browser pass)

- A slider changes exactly what its label says; changes apply on the same tick.
- Pause stops the loop; Step advances exactly one fixed tick (1/60 s); Reset
  reproduces the seeded initial state; the dice button draws a new seed.
- Speed multiplies the simulation clock (0.25×-4×), never the render rate.
- Pointer gestures (paint walls, inject heat, place charges, add labeled
  points, slingshot disks) mutate engine state; canvases document their
  keyboard shortcuts (Space, `.`, `r`) and gestures have button equivalents.
- Every canvas carries `role="img"` with a live description from
  `describe()`; the metrics panel is the accessible data surface.
- Under `prefers-reduced-motion` simulations start paused with a static frame.

## Benchmarks

Recorded from `npm run bench` (Node 24, Win32 x64, production build,
2026-09-13; median of 120 samples after warmup, per one simulation tick):

| Hot loop | Median | p95 |
|---|---|---|
| Game of Life, 120×75 torus | 0.125 ms | 0.135 ms |
| Sorting (quick), 64 ops/tick | <0.01 ms | 0.027 ms |
| A*, 30 expansions/tick | <0.01 ms | 0.002 ms |
| Boids, 400 population (spatial hash) | 0.138 ms | 0.447 ms |
| N-body leapfrog, 160 bodies | 0.279 ms | 0.375 ms |
| Heat diffusion, 128² × 4 iterations | 0.210 ms | 0.332 ms |
| Reaction-diffusion, 96² × 12 iterations | 1.524 ms | 1.545 ms |
| Integrator comparison, 40 steps | 0.005 ms | 0.038 ms |

Every experiment's worst-case tick is an order of magnitude inside the
16.6 ms frame budget at 60 Hz; live numbers are reproducible via the
performance overlay on any experiment page.

## Test coverage (84 tests, `npm test`)

- **Life**: still life, blinker, glider, seed determinism.
- **Sorting**: sorted output + measured operation counts for all six
  algorithms; identical counts per seed.
- **Pathfinding**: A* optimal on a known maze; Dijkstra cost match with more
  expansions; greedy never better; BFS Manhattan-optimal; DFS reaches.
- **Boids**: bounds, order parameter, determinism.
- **Pendulum**: RK4 energy drift < 1e-4 over 2000 chaotic steps; twin
  divergence.
- **Heat**: exact energy conservation on insulated boundaries; relaxation on
  fixed boundaries.
- **Gray-Scott**: bounded concentrations; preset application.
- **Integrators**: RK4 error orders below Euler; Taylor convergence.
- **N-body / Kepler / three-body**: leapfrog drift bounded; orbit inside the
  analytic ellipse; figure-eight momentum conservation.
- **Collisions**: energy and momentum conserved within 1%.
- **Wave equation**: damped decay; **dithering**: mean-luminance invariant;
  **marching squares**: threshold-responsive contours; **raycasting**:
  occlusion correctness; **convolution**: zero Laplacian response on linear
  gradients.
- **ML**: SVM and perceptron convergence, Naive Bayes posteriors, kNN
  leave-one-out accuracy, k-means monotone inertia, gradient-descent
  convergence and divergence.
- **Registry**: exactly 50 experiments across six populated categories with
  per-category counts asserted; complete metadata, content, and source paths;
  filters correct at the new count.
- **Parameters**: clamping, select validation, unknown-key errors.
