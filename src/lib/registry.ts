export type CategoryId =
  | "algorithms"
  | "mathematics"
  | "physics"
  | "computational-science"
  | "numerical-methods"
  | "machine-learning";

export type Difficulty = "beginner" | "intermediate" | "advanced";

/**
 * Two orthogonal axes, deliberately kept independent:
 *
 * - `category` + `subcategory`: where an experiment lives in the navigation
 *   and the domain breadcrumb (Algorithms / Pathfinding / A*).
 * - `techniques[]`: cross-cutting capability tags used by the explorer's
 *   technique filter, independent of category. "integration" surfaces N-Body
 *   (Physics), Double Pendulum (Physics), and RK4 vs Euler (Numerical Methods)
 *   at once; "PDE" spans Computational Science and, from Wave 7, Conjugate
 *   Gradient (Numerical Methods). Vocabulary: lowercase words, uppercase
 *   acronyms (PDE, ODE, SVD, SVM, RK4).
 */
export interface CategoryMeta {
  id: CategoryId;
  label: string;
  tagline: string;
}

export interface ExperimentMeta {
  id: string;
  title: string;
  tagline: string;
  /** Domain placement (navigation + breadcrumb). */
  category: CategoryId;
  /** Domain placement (breadcrumb second segment). */
  subcategory: string;
  difficulty: Difficulty;
  /** Cross-cutting filter tags; independent of `category`. */
  techniques: string[];
  tags: string[];
  description: string;
  related: string[];
}

export const CATEGORY_ORDER: CategoryId[] = [
  "algorithms",
  "mathematics",
  "physics",
  "computational-science",
  "numerical-methods",
  "machine-learning",
];

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  algorithms: { id: "algorithms", label: "Algorithms", tagline: "Structure determines possibility." },
  mathematics: { id: "mathematics", label: "Mathematics", tagline: "Equations become geometry." },
  physics: { id: "physics", label: "Physics", tagline: "Rules become motion." },
  "computational-science": {
    id: "computational-science",
    label: "Computational Science",
    tagline: "Models become experiments.",
  },
  "numerical-methods": {
    id: "numerical-methods",
    label: "Numerical Methods",
    tagline: "Continuous problems on discrete machines.",
  },
  "machine-learning": {
    id: "machine-learning",
    label: "Machine Learning",
    tagline: "Patterns from examples.",
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = ["beginner", "intermediate", "advanced"];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * The catalog. Order defines the stable catalog number shown in the index.
 * First-wave experiments per the build brief; the engine lands in Phase 2.
 */
export const EXPERIMENTS: ExperimentMeta[] = [
  {
    id: "a-star",
    title: "A*",
    tagline: "Finding structure through informed search.",
    category: "algorithms",
    subcategory: "Pathfinding",
    difficulty: "intermediate",
    techniques: ["graph", "search", "heuristic"],
    tags: ["search", "heuristic", "pathfinding", "priority queue"],
    description:
      "A* searches a weighted grid by expanding the most promising node first. Each candidate is ranked by f(n) = g(n) + h(n): the cost paid so far plus an admissible estimate of what remains. When the heuristic never overestimates, the first path A* finds is provably the shortest one.",
    related: ["sorting"],
  },
  {
    id: "sorting",
    title: "Sorting",
    tagline: "Six strategies for imposing order.",
    category: "algorithms",
    subcategory: "Comparison Sorting",
    difficulty: "beginner",
    techniques: ["sorting", "comparison"],
    tags: ["comparison sort", "complexity", "swap count"],
    description:
      "Bubble, selection, insertion, merge, quick, and heap sort arrange the same array under the same rules. Watching them turns big-O notation into something you can see: how many comparisons each strategy pays, how far its writes reach, and where the quadratic methods fall apart.",
    related: ["a-star"],
  },
  {
    id: "game-of-life",
    title: "Conway’s Game of Life",
    tagline: "Complexity from four rules.",
    category: "algorithms",
    subcategory: "Emergent Systems",
    difficulty: "beginner",
    techniques: ["cellular-automaton", "emergence"],
    tags: ["cellular automaton", "emergence", "zero-player"],
    description:
      "A grid of cells lives or dies by neighbor counts alone: birth with three, survival with two or three, otherwise death. No cell knows anything beyond its eight neighbors, yet gliders, oscillators, and working computers emerge. It is the standard demonstration that simple local rules can produce irreversible global behavior.",
    related: ["boids", "reaction-diffusion"],
  },
  {
    id: "boids",
    title: "Boids",
    tagline: "Flocking from three steering forces.",
    category: "algorithms",
    subcategory: "Emergent Systems",
    difficulty: "intermediate",
    techniques: ["particles", "steering", "emergence"],
    tags: ["emergence", "steering", "flocking", "spatial hashing"],
    description:
      "Each boid follows three local rules: separate from neighbors that are too close, align with their average heading, and cohere toward their center of mass. No bird sees the flock, yet the flock appears. Tuning the three weights moves the system between gas, swarm, and vortex.",
    related: ["game-of-life", "n-body"],
  },
  {
    id: "langton-ant",
    title: "Langton’s Ant",
    tagline: "A two-rule machine that draws highways.",
    category: "algorithms",
    subcategory: "Emergent Systems",
    difficulty: "beginner",
    techniques: ["cellular-automaton", "emergence"],
    tags: ["cellular automaton", "turing machine", "emergence"],
    description:
      "An ant on a grid follows two rules: turn right on a black cell, left on a white one, then flip the cell and step forward. For the first few hundred steps it looks lost; then it builds a recurring diagonal highway. Nothing in the rules mentions a highway.",
    related: ["game-of-life", "boids"],
  },
  {
    id: "n-body",
    title: "N-Body Gravity",
    tagline: "Many bodies, one law.",
    category: "physics",
    subcategory: "Gravitation",
    difficulty: "advanced",
    techniques: ["particles", "gravity", "integration"],
    tags: ["orbital mechanics", "integration", "symplectic", "chaos"],
    description:
      "Every body attracts every other with the same inverse-square law, and the resulting motion is integrated step by step. Nothing is scripted: orbits, slingshots, and ejections are all consequences of the arithmetic. The integrator you choose decides whether the system keeps its energy or quietly drifts.",
    related: ["double-pendulum", "boids"],
  },
  {
    id: "double-pendulum",
    title: "Double Pendulum",
    tagline: "Chaos in two joints.",
    category: "physics",
    subcategory: "Classical Mechanics",
    difficulty: "intermediate",
    techniques: ["integration", "chaos"],
    tags: ["chaos", "RK4", "Lagrangian", "sensitivity"],
    description:
      "Two rigid links under gravity obey equations with no closed-form solution, so the motion comes from numerical integration. Run two pendulums from initial angles that differ by a thousandth of a radian and watch them diverge completely: deterministic, predictable in principle, practically unpredictable.",
    related: ["n-body"],
  },
  {
    id: "heat-diffusion",
    title: "Heat Diffusion",
    tagline: "How heat forgets its shape.",
    category: "computational-science",
    subcategory: "Partial Differential Equations",
    difficulty: "intermediate",
    techniques: ["PDE", "finite-difference", "field"],
    tags: ["parabolic PDE", "finite differences", "stability", "steady state"],
    description:
      "The heat equation says that a point warms or cools in proportion to how different it is from its neighbors, and the simulation applies exactly that rule on a grid. Sharp initials smooth into diffusion, and the field relaxes toward the steady state that the boundary conditions demand.",
    related: ["reaction-diffusion", "conjugate-gradient"],
  },
  {
    id: "reaction-diffusion",
    title: "Reaction-Diffusion",
    tagline: "Turing’s recipe for animal patterns.",
    category: "computational-science",
    subcategory: "Partial Differential Equations",
    difficulty: "advanced",
    techniques: ["PDE", "field"],
    tags: ["Gray-Scott", "Turing patterns", "morphogenesis", "stability"],
    description:
      "Two chemicals diffuse at different rates while one consumes the other. Alan Turing showed in 1952 that this imbalance alone can break a uniform field into spots, stripes, and labyrinths. The Gray-Scott system is the classic laboratory for that instability: change the feed and kill rates and a different animal appears.",
    related: ["heat-diffusion", "game-of-life"],
  },
  {
    id: "mandelbrot",
    title: "Mandelbrot Set",
    tagline: "One rule, infinite coastline.",
    category: "mathematics",
    subcategory: "Complex Analysis",
    difficulty: "intermediate",
    techniques: ["complex-plane", "iteration", "fractal"],
    tags: ["escape-time", "fractal", "self-similarity", "complex numbers"],
    description:
      "Iterate z = z squared plus c and ask whether the sequence escapes. Points inside stay bounded forever and form the set; points outside escape at wildly different speeds, and the escape time becomes color. Zoom in anywhere on the boundary and the detail never runs out.",
    related: ["game-of-life", "taylor-series"],
  },
  {
    id: "svd-compression",
    title: "SVD & Image Compression",
    tagline: "Keep the big singular values, discard the rest.",
    category: "mathematics",
    subcategory: "Linear Algebra",
    difficulty: "advanced",
    techniques: ["linear-algebra", "decomposition", "approximation"],
    tags: ["SVD", "rank-k approximation", "compression", "Jacobi"],
    description:
      "Every matrix factors into rotation, scale, rotation. Keeping only the largest singular values gives the best possible rank-k approximation of the image, and the metrics show exactly what that trade costs: energy retained against compression ratio and measured reconstruction error. Computed with one-sided Jacobi orthogonalization, right on the page.",
    related: ["least-squares", "taylor-series"],
  },
  {
    id: "central-limit-theorem",
    title: "Central Limit Theorem",
    tagline: "Means forget where they came from.",
    category: "mathematics",
    subcategory: "Probability",
    difficulty: "beginner",
    techniques: ["probability", "statistics", "convergence"],
    tags: ["CLT", "Gaussian", "sampling", "convergence"],
    description:
      "Draw n values from a uniform, triangular, or bimodal source, record their mean, and repeat. However lopsided the source, the histogram of means tightens onto a Gaussian whose spread shrinks like sigma over root n - and the empirical sigma on the metrics strip checks the prediction live.",
    related: ["naive-bayes"],
  },
  {
    id: "elastic-collisions",
    title: "Elastic Collisions",
    tagline: "Momentum conserved, energy accounted for.",
    category: "physics",
    subcategory: "Classical Mechanics",
    difficulty: "beginner",
    techniques: ["particles", "collision", "conservation"],
    tags: ["impulse", "hard disks", "kinetic energy", "momentum"],
    description:
      "Hard disks bounce off each other and the walls with impulse-based resolution at restitution 1: kinetic energy and momentum should survive every collision. The metrics track both, so the physics is audited in real time - and you can sling new disks in with a drag.",
    related: ["n-body", "boids"],
  },
  {
    id: "electrostatic-potential",
    title: "Electrostatic Potential",
    tagline: "Charges in a grounded box, solved honestly.",
    category: "computational-science",
    subcategory: "Fields",
    difficulty: "advanced",
    techniques: ["PDE", "field", "linear-solver", "relaxation"],
    tags: ["Poisson equation", "SOR", "equipotential", "Gauss-Seidel"],
    description:
      "Placing charges stamps a charge density onto a grid, and the potential comes from solving the Poisson equation with the box walls held at zero. Successive over-relaxation - Gauss-Seidel with momentum - runs a few sweeps per tick, so you watch the field propagate outward from each new charge, and the residual tells you how close to solved the field is. The banded rendering is the equipotential structure.",
    related: ["conjugate-gradient", "heat-diffusion"],
  },
  {
    id: "adaptive-rk45",
    title: "Adaptive Step Size (RK45)",
    tagline: "Small steps where it matters, big steps where it doesn't.",
    category: "numerical-methods",
    subcategory: "Ordinary Differential Equations",
    difficulty: "advanced",
    techniques: ["ODE", "integration", "adaptive"],
    tags: ["Dormand-Prince", "embedded pair", "step-size control", "stiff transient"],
    description:
      "The Dormand-Prince 5(4) embedded pair computes a fifth-order step and a fourth-order estimate from the same stages; their difference is an error estimate, and the controller shrinks or grows the step to hold that estimate near tolerance. Watch the step trace collapse through the stiff transient and relax afterward - then compare the accepted step count against fixed-step RK4 at dt = 1/60.",
    related: ["rk4-vs-euler", "double-pendulum"],
  },
  {
    id: "conjugate-gradient",
    title: "Conjugate Gradient",
    tagline: "Three solvers, one Poisson system.",
    category: "numerical-methods",
    subcategory: "Linear Systems",
    difficulty: "advanced",
    techniques: ["linear-solver", "convergence", "optimization"],
    tags: ["CG", "Jacobi", "Gauss-Seidel", "residual", "sparse"],
    description:
      "The same grounded-box Poisson system as the Electrostatic Potential experiment, handed to three iterative solvers at once. Jacobi and Gauss-Seidel creep; conjugate gradient builds search directions from the residuals and converges in far fewer iterations - plotted per iteration on a log axis, so the race is a measurement rather than a claim.",
    related: ["electrostatic-potential", "heat-diffusion", "rk4-vs-euler"],
  },
  {
    id: "least-squares",
    title: "Least Squares Curve Fitting",
    tagline: "One exact solve, no descent required.",
    category: "numerical-methods",
    subcategory: "Approximation",
    difficulty: "beginner",
    techniques: ["linear-algebra", "approximation", "statistics"],
    tags: ["normal equations", "OLS", "outliers", "R-squared"],
    description:
      "The least-squares line has a closed form: solve the 2x2 normal equations exactly by Cramer's rule and you are done - no iterations, no learning rate. The residual stems show what the fit absorbs and what it cannot, and the outlier slider demonstrates exactly what unweighted exactness costs.",
    related: ["gradient-descent", "svd-compression", "taylor-series"],
  },
  {
    id: "support-vector-machine",
    title: "Support Vector Machine",
    tagline: "The widest street between the classes.",
    category: "machine-learning",
    subcategory: "Classification",
    difficulty: "advanced",
    techniques: ["classification", "optimization", "kernel-method"],
    tags: ["SVM", "hinge loss", "Pegasos", "RBF kernel", "margin"],
    description:
      "A linear classifier chooses the boundary that leaves the widest margin; the kernel trick lets that same trainer draw curved boundaries in the original space. This one trains online with kernelized Pegasos - subgradient descent on the hinge loss - so accuracy, the margin, and the ringed margin-active points evolve as you add labeled points.",
    related: ["naive-bayes", "central-limit-theorem"],
  },
  {
    id: "naive-bayes",
    title: "Naive Bayes Classifier",
    tagline: "Bayes' rule, applied one feature at a time.",
    category: "machine-learning",
    subcategory: "Classification",
    difficulty: "beginner",
    techniques: ["classification", "probability", "generative"],
    tags: ["Gaussian NB", "posterior", "decision boundary", "Bayes"],
    description:
      "Each class gets an axis-aligned Gaussian over the features; Bayes' rule with the class frequencies as priors turns any point into a posterior probability. The shaded field is P(class A | x) - recomputed from scratch every time you add a labeled point, so you can watch one click move the decision boundary.",
    related: ["support-vector-machine", "central-limit-theorem"],
  },
  {
    id: "rk4-vs-euler",
    title: "RK4 vs Euler",
    tagline: "The same oscillator, three integrators.",
    category: "numerical-methods",
    subcategory: "Ordinary Differential Equations",
    difficulty: "intermediate",
    techniques: ["ODE", "integration", "error-analysis"],
    tags: ["RK4", "Euler", "symplectic", "energy error", "ODE"],
    description:
      "The harmonic oscillator has an exact solution, so integration error is not a matter of opinion: forward Euler pumps energy into the system until it spirals away, semi-implicit Euler stays bounded but drifts in phase, and RK4 tracks the true curve to several decimal places. Change the timestep and watch the error orders move.",
    related: ["double-pendulum", "heat-diffusion"],
  },
  {
    id: "taylor-series",
    title: "Taylor Series",
    tagline: "Polynomials pretending to be functions.",
    category: "mathematics",
    subcategory: "Approximation",
    difficulty: "beginner",
    techniques: ["approximation", "calculus"],
    tags: ["approximation", "calculus", "convergence", "radius of convergence"],
    description:
      "A Taylor polynomial rebuilds a function from its derivatives at a single point. Near that point a few terms are uncannily good; far away the approximation falls apart, and for functions like 1/(1 + x²) the failure line is the radius of convergence. Move the marker and read the error where you land.",
    related: ["rk4-vs-euler", "heat-diffusion"],
  },
  {
    id: "bfs-dfs",
    title: "BFS & DFS",
    tagline: "Queue versus stack, two shapes of search.",
    category: "algorithms",
    subcategory: "Graph Traversal",
    difficulty: "beginner",
    techniques: ["graph", "search"],
    tags: ["breadth-first", "depth-first", "frontier", "shortest path"],
    description:
      "The same walled grid, searched two ways: breadth-first expands in rings and its first path is the shortest; depth-first dives down one corridor to its end before trying the next. Switch strategies and watch the frontier change shape - a queue and a stack are different geometries.",
    related: ["a-star", "sorting"],
  },
  {
    id: "rrt-rrt-star",
    title: "RRT & RRT*",
    tagline: "Trees that feel their way through obstacles.",
    category: "algorithms",
    subcategory: "Path Planning",
    difficulty: "advanced",
    techniques: ["search", "sampling", "planning"],
    tags: ["rapidly-exploring tree", "sampling-based", "rewiring", "path cost"],
    description:
      "Rapidly-exploring random trees grow from a start point by sampling, steering, and collision-checking. RRT* adds the crucial refinement: new nodes pick the cheapest nearby parent and existing neighbors get rewired, so the path cost falls as samples accumulate. The cost metric shows the difference the star makes.",
    related: ["a-star", "monte-carlo"],
  },
  {
    id: "barnes-hut",
    title: "Barnes-Hut Quadtree",
    tagline: "Approximating the far field with a tree.",
    category: "algorithms",
    subcategory: "Spatial",
    difficulty: "advanced",
    techniques: ["tree", "gravity", "approximation"],
    tags: ["quadtree", "n-body", "theta criterion", "spatial partitioning"],
    description:
      "Barnes-Hut makes large N-body simulation affordable: build a quadtree over the bodies, and when a distant cell's size-to-distance ratio drops below theta, treat the whole cluster as one mass. The force-error metric compares the approximation against direct summation - the theta slider is the dial between speed and honesty.",
    related: ["n-body", "k-means"],
  },
  {
    id: "genetic-algorithm",
    title: "Genetic Algorithm",
    tagline: "Selection, crossover, mutation - repeat.",
    category: "algorithms",
    subcategory: "Optimization",
    difficulty: "intermediate",
    techniques: ["optimization", "evolution", "search"],
    tags: ["tournament selection", "crossover", "mutation", "elitism"],
    description:
      "A population of candidates lives on a rugged fitness landscape. Each generation brings tournament selection, blend crossover, gaussian mutation, and a few elites carried through unchanged. No gradient exists here - the algorithm only ever compares fitness values, which is exactly what makes GAs fit landscapes that break gradient methods.",
    related: ["simulated-annealing", "k-means"],
  },
  {
    id: "simulated-annealing",
    title: "Simulated Annealing",
    tagline: "Bad moves are allowed - while it's hot.",
    category: "algorithms",
    subcategory: "Optimization",
    difficulty: "intermediate",
    techniques: ["optimization", "sampling"],
    tags: ["Metropolis criterion", "2-opt", "traveling salesman", "cooling schedule"],
    description:
      "Simulated annealing escapes local optima by accepting worsening moves with probability exp(-delta/T) under a falling temperature T. The tour on 24 cities starts as a tangled mess; as the temperature cools, the Metropolis acceptance rate on the metrics drops and the 2-opt reversals settle toward a short route.",
    related: ["genetic-algorithm", "monte-carlo"],
  },
  {
    id: "fourier-transform",
    title: "Fourier Transform (DFT)",
    tagline: "Mix frequencies in, read them out exactly.",
    category: "mathematics",
    subcategory: "Analysis",
    difficulty: "intermediate",
    techniques: ["approximation", "frequency-domain"],
    tags: ["DFT", "spectrum", "magnitude", "superposition"],
    description:
      "Compose a signal from harmonics plus noise, then compute its Discrete Fourier Transform by the textbook definition - no FFT shortcuts. The spectrum peaks at exactly the frequencies that were mixed in, which is the identity that makes everything from audio codecs to the convolution theorem work.",
    related: ["fourier-series", "convolution"],
  },
  {
    id: "fourier-series",
    title: "Fourier Series",
    tagline: "Every periodic signal is a sum of sines.",
    category: "mathematics",
    subcategory: "Analysis",
    difficulty: "intermediate",
    techniques: ["approximation", "trigonometry"],
    tags: ["square wave", "Gibbs phenomenon", "harmonics", "synthesis"],
    description:
      "A square wave's Fourier series is a sum of odd harmonics with 1/n weights; truncating it gives an approximation whose overshoot at the jump never disappears - Gibbs' phenomenon, visible on the plot. Add terms and watch the error fall while the ringing squeezes toward the edge.",
    related: ["fourier-transform", "taylor-series"],
  },
  {
    id: "eigen-basis",
    title: "Eigenvectors & Eigenvalues",
    tagline: "Directions a matrix cannot turn.",
    category: "mathematics",
    subcategory: "Linear Algebra",
    difficulty: "intermediate",
    techniques: ["linear-algebra", "geometry"],
    tags: ["characteristic polynomial", "invariant directions", "trace", "determinant"],
    description:
      "Drag the entries of a 2x2 matrix and watch the unit circle's image deform. The accent lines are the eigenvector directions - the only vectors the matrix merely stretches - and they exist only when the characteristic polynomial has real roots, which the metrics report live.",
    related: ["matrix-transformations", "svd-compression"],
  },
  {
    id: "matrix-transformations",
    title: "Matrix Transformations",
    tagline: "The columns are where the basis vectors land.",
    category: "mathematics",
    subcategory: "Linear Algebra",
    difficulty: "beginner",
    techniques: ["linear-algebra", "geometry"],
    tags: ["rotation", "scale", "shear", "determinant"],
    description:
      "Rotation, scaling, and shear compose into a single 2x2 matrix that maps a reference grid and a house. The live readout shows the matrix itself; the determinant is the area scaling factor, and its sign tells you the shape flipped over.",
    related: ["eigen-basis"],
  },
  {
    id: "julia-set",
    title: "Julia Sets",
    tagline: "One parameter, endlessly many fractals.",
    category: "mathematics",
    subcategory: "Complex Analysis",
    difficulty: "intermediate",
    techniques: ["complex-plane", "iteration", "fractal"],
    tags: ["filled Julia set", "escape time", "orbit", "connected"],
    description:
      "The Mandelbrot set is the catalog of Julia sets: pick a c, iterate z = z^2 + c from every starting point, and each c gives a different fractal. The animate slider orbits c around the classic circle, morphing the set between connected and dust in one continuous motion.",
    related: ["mandelbrot"],
  },
  {
    id: "probability-distributions",
    title: "Probability Distributions",
    tagline: "The formula, and what sampling actually gives you.",
    category: "mathematics",
    subcategory: "Probability",
    difficulty: "beginner",
    techniques: ["probability", "sampling"],
    tags: ["binomial", "Poisson", "normal", "pmf"],
    description:
      "The exact probability mass function sits on top of a running histogram of seeded samples for the binomial, Poisson, or normal distribution. The empirical mean is checked against the theoretical one in the metrics - sampling noise shrinking in public.",
    related: ["central-limit-theorem", "monte-carlo"],
  },
  {
    id: "vector-field",
    title: "Vector Fields",
    tagline: "Flow from a formula, particle by particle.",
    category: "mathematics",
    subcategory: "Vector Calculus",
    difficulty: "beginner",
    techniques: ["field", "particles", "flow"],
    tags: ["source", "sink", "vortex", "streamlines"],
    description:
      "A uniform flow, a source, a sink, and a vortex sum into one velocity field; particles ride it exactly as the formula dictates. Raise the vortex and watch circulation appear; drop the source below zero and it becomes a sink that drinks the flow. The pointer is an extra source you can steer.",
    related: ["boids", "heat-diffusion"],
  },
  {
    id: "projectile-motion",
    title: "Projectile Motion",
    tagline: "The parabola, plus what air does to it.",
    category: "physics",
    subcategory: "Mechanics",
    difficulty: "beginner",
    techniques: ["integration", "drag"],
    tags: ["quadratic drag", "trajectory", "range", "apex"],
    description:
      "A projectile integrated with quadratic air drag flies against the analytic drag-free arc: at zero drag they coincide, and as the drag coefficient rises the trajectory buckles asymmetrically - steeper on the way down, range collapsed.",
    related: ["springs", "monte-carlo"],
  },
  {
    id: "springs",
    title: "Springs & Oscillation",
    tagline: "Hooke's law, chained and damped.",
    category: "physics",
    subcategory: "Oscillations",
    difficulty: "beginner",
    techniques: ["integration", "oscillation", "conservation"],
    tags: ["Hooke's law", "normal modes", "damping", "energy conservation"],
    description:
      "A chain of masses between two walls obeys Hooke's law at every connection. Without damping the total energy must not drift - the metric verifies it - and with damping you can watch exactly how fast the motion dies. The trace plots the first mass through its normal modes.",
    related: ["double-pendulum", "wave-superposition"],
  },
  {
    id: "kepler-orbits",
    title: "Kepler's Laws",
    tagline: "Equal areas in equal times, drawn as wedges.",
    category: "physics",
    subcategory: "Orbital Mechanics",
    difficulty: "intermediate",
    techniques: ["gravity", "integration", "conservation"],
    tags: ["ellipse", "angular momentum", "T-squared equals a-cubed", "vis-viva"],
    description:
      "A planet integrates around a star on an adjustable ellipse. The shaded wedges are swept in equal times, so they have equal areas - Kepler's second law as a picture - and the period readout feeds the third law's T-squared over a-cubed. Angular momentum conservation is what enforces both.",
    related: ["n-body", "three-body"],
  },
  {
    id: "three-body",
    title: "Three-Body Problem",
    tagline: "The figure eight, and everything after it.",
    category: "physics",
    subcategory: "Orbital Mechanics",
    difficulty: "advanced",
    techniques: ["gravity", "integration", "chaos"],
    tags: ["Chenciner-Montgomery", "Lagrange", "velocity Verlet", "momentum"],
    description:
      "Three equal masses under mutual gravity, integrated with velocity Verlet. The figure-eight choreography is a genuine periodic solution of the full three-body problem - and the chaotic preset shows what most initial conditions do instead. Zero total momentum on the metrics is the integration's honesty check.",
    related: ["n-body", "double-pendulum"],
  },
  {
    id: "wave-superposition",
    title: "Wave Superposition",
    tagline: "Add two sines, get beats or silence.",
    category: "physics",
    subcategory: "Waves",
    difficulty: "beginner",
    techniques: ["waves", "superposition"],
    tags: ["beats", "interference", "phase", "standing waves"],
    description:
      "Two traveling waves with independent frequency, amplitude, and phase are added point by point - nothing more. Close frequencies produce beats at their difference; matched amplitudes at opposite phases cancel to a flat line. The whole of wave interference is in that one addition.",
    related: ["springs", "fourier-series"],
  },
  {
    id: "wave-equation",
    title: "Wave Equation",
    tagline: "A drum head, integrated from the PDE.",
    category: "computational-science",
    subcategory: "Partial Differential Equations",
    difficulty: "intermediate",
    techniques: ["PDE", "finite-difference", "field"],
    tags: ["hyperbolic PDE", "leapfrog", "ripples", "fixed boundary"],
    description:
      "The wave equation u_tt = c-squared times the Laplacian, with damping, integrated by the standard leapfrog-in-time scheme on a grid with pinned edges. Drag anywhere to strike the membrane. It is the second-derivative sibling of the heat equation: same Laplacian, opposite character - waves carry information, diffusion erases it.",
    related: ["heat-diffusion", "wave-superposition"],
  },
  {
    id: "dithering",
    title: "Error-Diffusion Dithering",
    tagline: "Two gray levels, one honest average.",
    category: "computational-science",
    subcategory: "Rendering",
    difficulty: "beginner",
    techniques: ["quantization", "error-diffusion"],
    tags: ["Floyd-Steinberg", "serpentine", "error diffusion", "quantization"],
    description:
      "Floyd-Steinberg dithering quantizes each pixel to a small palette and pushes the rounding error onto four neighbors. Structure is lost, averages are kept: the metric shows the dithered image's mean luminance matching the original's to four decimals - which is why dithering fools the eye.",
    related: ["svd-compression", "convolution"],
  },
  {
    id: "marching-squares",
    title: "Marching Squares",
    tagline: "Contours from a sixteen-case lookup.",
    category: "computational-science",
    subcategory: "Rendering",
    difficulty: "intermediate",
    techniques: ["contours", "implicit-surfaces"],
    tags: ["iso-contour", "metaballs", "interpolation", "saddle case"],
    description:
      "Marching squares turns an implicit field into line segments: classify each grid cell by which corners sit above the iso value, then place the crossing edges - with interpolation for smoothness and the standard resolution for the ambiguous saddle cases. The metaballs move; the contours follow.",
    related: ["vector-field", "convolution"],
  },
  {
    id: "raycast-shadows",
    title: "Raycasting Shadows",
    tagline: "Every lit cell is a ray that made it.",
    category: "computational-science",
    subcategory: "Rendering",
    difficulty: "intermediate",
    techniques: ["raycasting", "geometry", "occlusion"],
    tags: ["DDA", "visibility", "occlusion", "grid traversal"],
    description:
      "A light carries with your pointer; every floor cell is lit only if a ray-marched path from the light survives the walls. Each ray is a cell-by-cell grid traversal, and the counters show exactly how many were cast to build the frame.",
    related: ["bfs-dfs", "marching-squares"],
  },
  {
    id: "convolution",
    title: "2-D Convolution",
    tagline: "Nine numbers decide blur or edge.",
    category: "computational-science",
    subcategory: "Rendering",
    difficulty: "beginner",
    techniques: ["kernels", "filtering", "linear-operators"],
    tags: ["kernel", "blur", "edge detect", "sharpen"],
    description:
      "A 3x3 kernel slides over the image, multiplying and summing - that is the whole algorithm. Box blur, sharpen, edge detection, and emboss are the same code with different kernel values, which is the deepest fact in image processing: the filter is data.",
    related: ["dithering", "fourier-transform"],
  },
  {
    id: "newton-raphson",
    title: "Newton-Raphson",
    tagline: "Follow the tangent; it knows the way.",
    category: "numerical-methods",
    subcategory: "Root Finding",
    difficulty: "beginner",
    techniques: ["root-finding", "iteration", "calculus"],
    tags: ["tangent line", "quadratic convergence", "divergence", "basin"],
    description:
      "Newton's method replaces the function with its tangent line and takes the line's root as the next guess: quadratic convergence when the start is kind, divergence when it isn't. Click anywhere to choose a start and watch the tangents walk - x-squared minus two lands on the square root of two to ten decimals in six steps.",
    related: ["taylor-series", "quadrature"],
  },
  {
    id: "quadrature",
    title: "Numerical Quadrature",
    tagline: "Rectangles, trapezoids, parabola tops.",
    category: "numerical-methods",
    subcategory: "Quadrature",
    difficulty: "intermediate",
    techniques: ["integration", "error-analysis"],
    tags: ["Riemann sum", "trapezoid rule", "Simpson", "convergence order"],
    description:
      "Three quadrature rules approximate the same definite integral against its exact value: left Riemann sums err like 1/n, trapezoids like 1/n-squared, Simpson like 1/n-to-the-fourth. Halve the panels and watch the error drop by the predicted factor - convergence orders you can measure on the screen.",
    related: ["rk4-vs-euler", "monte-carlo"],
  },
  {
    id: "monte-carlo",
    title: "Monte Carlo Estimation",
    tagline: "Random darts, converging on pi.",
    category: "numerical-methods",
    subcategory: "Monte Carlo",
    difficulty: "beginner",
    techniques: ["probability", "sampling", "convergence"],
    tags: ["pi estimate", "variance", "inverse sqrt", "uniform sampling"],
    description:
      "Throw uniform darts at a unit square; the fraction inside the quarter circle estimates pi over four. The estimate error falls like one over root N - agonizingly slow, which is the Monte Carlo lesson. The running absolute error against true pi is displayed, exponent and all.",
    related: ["central-limit-theorem", "quadrature"],
  },
  {
    id: "gradient-descent",
    title: "Gradient Descent",
    tagline: "Small steps downhill, one hyperparameter from disaster.",
    category: "machine-learning",
    subcategory: "Optimization",
    difficulty: "beginner",
    techniques: ["optimization", "gradient-methods"],
    tags: ["learning rate", "loss surface", "divergence", "MSE"],
    description:
      "Gradient descent fits the same noisy line as the Least Squares experiment, but iteratively: the parameters step against the MSE gradient. The contour plot shows the loss surface and the descent path - shrink the learning rate and it crawls, raise it past stability and the path flies off the plot. That contrast with the closed-form page is the entire lesson of first-order methods.",
    related: ["least-squares", "k-means"],
  },
  {
    id: "k-means",
    title: "K-Means Clustering",
    tagline: "Assign, average, repeat until still.",
    category: "machine-learning",
    subcategory: "Unsupervised",
    difficulty: "beginner",
    techniques: ["clustering", "optimization"],
    tags: ["Lloyd's algorithm", "inertia", "Voronoi", "centroids"],
    description:
      "K-means alternates two steps: assign every point to its nearest centroid, then move each centroid to its cluster's mean. Lloyd's guarantee says the inertia (within-cluster squared error) never increases - the metrics track it until the centroid shift drops to zero and the algorithm is still.",
    related: ["genetic-algorithm", "gradient-descent"],
  },
  {
    id: "perceptron",
    title: "Perceptron",
    tagline: "The 1958 neuron that guarantees convergence.",
    category: "machine-learning",
    subcategory: "Classification",
    difficulty: "beginner",
    techniques: ["classification", "linear-models"],
    tags: ["Rosenblatt", "weight update", "separability", "convergence theorem"],
    description:
      "Rosenblatt's perceptron adjusts its weights once per misclassified point and provably converges on separable data - the ancestor of everything in this category. The boundary line walks to a solution in full view; click to add points and it keeps learning. It is the SVM's great-grandparent with a cleaner guarantee and a louder failure mode on non-separated data.",
    related: ["support-vector-machine", "naive-bayes"],
  },
  {
    id: "k-nn",
    title: "K-Nearest Neighbors",
    tagline: "No training - the dataset is the model.",
    category: "machine-learning",
    subcategory: "Classification",
    difficulty: "beginner",
    techniques: ["classification", "instance-based"],
    tags: ["majority vote", "decision boundary", "lazy learning", "leave-one-out"],
    description:
      "K-nearest neighbors classifies each query by majority vote among its k closest points - there is no training phase at all. The rendered boundary is a direct majority-vote survey of the space, which is why changing k redraws it and adding one point bends it instantly. Leave-one-out accuracy is measured live.",
    related: ["naive-bayes", "support-vector-machine"],
  },
];

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === "string" && (CATEGORY_ORDER as string[]).includes(value);
}

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && (DIFFICULTY_ORDER as string[]).includes(value);
}

export function experimentHref(
  experiment: ExperimentMeta,
): `/experiments/${CategoryId}/${string}` {
  return `/experiments/${experiment.category}/${experiment.id}`;
}

export function getExperiment(id: string): ExperimentMeta | undefined {
  return EXPERIMENTS.find((experiment) => experiment.id === id);
}

export function getExperimentInCategory(
  category: string,
  slug: string,
): ExperimentMeta | undefined {
  const experiment = EXPERIMENTS.find((candidate) => candidate.id === slug);
  return experiment && experiment.category === category ? experiment : undefined;
}

export function experimentsByCategory(category: CategoryId): ExperimentMeta[] {
  return EXPERIMENTS.filter((experiment) => experiment.category === category);
}

export const TECHNIQUES: string[] = [
  ...new Set(EXPERIMENTS.flatMap((experiment) => experiment.techniques)),
].sort();

export interface ExperimentFilters {
  q?: string;
  category?: CategoryId;
  difficulty?: Difficulty;
  technique?: string;
}

export function filterExperiments({
  q,
  category,
  difficulty,
  technique,
}: ExperimentFilters): ExperimentMeta[] {
  const query = q?.trim().toLowerCase();
  return EXPERIMENTS.filter((experiment) => {
    if (category && experiment.category !== category) return false;
    if (difficulty && experiment.difficulty !== difficulty) return false;
    if (technique && !experiment.techniques.includes(technique)) return false;
    if (query) {
      const haystack = [
        experiment.title,
        experiment.subcategory,
        DIFFICULTY_LABELS[experiment.difficulty],
        CATEGORIES[experiment.category].label,
        ...experiment.techniques,
        ...experiment.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function searchExperiments(query: string): ExperimentMeta[] {
  return filterExperiments({ q: query });
}

export function relatedExperiments(experiment: ExperimentMeta): ExperimentMeta[] {
  return experiment.related
    .map(getExperiment)
    .filter((related): related is ExperimentMeta => Boolean(related));
}

/** Stable 1-based position in the catalog, shown in index rows. */
export function catalogNumber(experiment: ExperimentMeta): number {
  return EXPERIMENTS.findIndex((candidate) => candidate.id === experiment.id) + 1;
}
