export interface ExperimentContent {
  mathIntro: string;
  equations: string[];
  mathOutro?: string;
  how: string[];
  complexity: { time: string; space: string; note: string };
}

/**
 * Per-explanation content for the detail pages. Kept as data so the page shell
 * stays generic and every experiment ships the same sections.
 */
export const EXPERIMENT_CONTENT: Record<string, ExperimentContent> = {
  "a-star": {
    mathIntro:
      "A* ranks every candidate cell by one number: the cost already paid plus an optimistic estimate of the cost still to come. When the estimate never overestimates, the first path A* hands back is provably optimal.",
    equations: [
      "f(n) = g(n) + h(n)",
      "admissible:  0 ≤ h(n) ≤ h*(n)   for every node n",
      "manhattan:   h(n) = |x_n − x_goal| + |y_n − y_goal|",
    ],
    mathOutro:
      "Manhattan distance is admissible on a 4-connected grid because a path cannot do better than moving one unit closer per step. Dijkstra is the special case h(n) = 0: optimal, but blind. Greedy best-first keeps only h(n): fast, with no optimality guarantee. The three modes here share one binary-heap open set, so the node counts you see are a fair comparison.",
    how: [
      "The grid is a flat typed array; walls, closed marks, and g-scores are one array each. The open set is a binary min-heap over integer node indices with a parallel key array, so each push or pop is O(log n) with no object allocation.",
      "Each tick expands a fixed number of nodes: pop the cheapest open node, close it, and relax its four neighbors. If a neighbor's tentative g-score beats its current one, the score and parent pointer are updated and it is pushed with a new key. Reaching the goal triggers a walk back through the parent pointers to reconstruct the path.",
      "Drawing a wall with the pointer re-runs the search immediately over the same map, so you can watch the frontier route around your edit.",
    ],
    complexity: {
      time: "O(E log V) worst case; each tick expands a fixed number of nodes",
      space: "O(V): scores, parents, and the heap",
      note: "Greedy mode expands the fewest nodes; Dijkstra the most; A* sits between them and is the only one of the three that is both optimal and informed.",
    },
  },
  sorting: {
    mathIntro:
      "Every comparison sort pays for order with yes/no questions. Information theory sets the floor: distinguishing one of n! permutations takes at least log₂(n!) comparisons, which Stirling approximates as n log₂ n − 1.44n.",
    equations: [
      "lower bound:  comparisons ≥ log₂(n!) ≈ n log₂ n − 1.44 n",
      "bubble / insertion / selection:  O(n²) worst case",
      "merge / heap:  O(n log n) worst case;  quick:  O(n log n) expected, O(n²) worst",
    ],
    mathOutro:
      "The counters in the metrics strip are incremented by the algorithm itself, one per operation, so the asymptotics are observable rather than asserted. Watch insertion sort on a nearly sorted array to see its O(n) best case, then randomize to see the quadratic methods fall behind.",
    how: [
      "Each algorithm is written as a generator that yields one displayable operation at a time: a comparison (two indices) or a write (index and value). A driver consumes a fixed number of operations per tick, so stepping always advances the real computation and pausing changes nothing.",
      "The array is a seeded Fisher-Yates shuffle of 1..n, so reset reproduces the exact same input for the same seed. Merge sort writes through an auxiliary buffer; quicksort uses median-of-three pivot selection with an explicit stack instead of recursion.",
    ],
    complexity: {
      time: "One tick performs a fixed number of yielded operations",
      space: "O(n) values plus O(n) auxiliary for merge sort",
      note: "Comparison counts are measured, not estimated: switch algorithms on the same seed and compare the totals.",
    },
  },
  "game-of-life": {
    mathIntro:
      "The Game of Life is a totalistic cellular automaton: each cell's next state depends only on how many of its eight neighbors are alive.",
    equations: [
      "B3/S23:  cell becomes alive with exactly 3 neighbors",
      "survives with 2 or 3; otherwise dies or stays empty",
      "n'(c) = 1  ⇔  Σ neighbors = 3  ∨  ( Σ neighbors = 2 ∧ n(c) = 1 )",
    ],
    mathOutro:
      "Despite the trivial update rule, the automaton is Turing complete: there are known configurations that implement logic gates, registers, and even a universal constructor. No closed-form shortcut is known for stepping the rule, which is exactly why it must be simulated.",
    how: [
      "The grid lives in a flat Uint8Array with a second buffer for the next generation. Each tick scans every cell, sums the eight neighbors with edge handling for wrap or closed boundaries, applies B3/S23, and swaps the buffers. Births and deaths are counted during the same pass and reported as metrics.",
      "Dragging on the canvas toggles cells directly in the live buffer: the very next generation is computed from your edit. Try dropping a 5-cell glider and stepping one generation at a time.",
    ],
    complexity: {
      time: "O(cells) per generation, branch-free inner loop",
      space: "Two Uint8Array buffers: 2 bytes per cell",
      note: "Boundary mode changes the physics: wrap edges let gliders circle the torus, closed edges kill them at the wall.",
    },
  },
  boids: {
    mathIntro:
      "Each boid steers by three local rules weighted and summed into one acceleration: separation from crowding, alignment with local heading, and cohesion toward the local center of mass.",
    equations: [
      "a_i = w_s·s_i + w_a·a_i + w_c·c_i",
      "order:  φ = | Σ v_i | / (N · v_max),   0 ≤ φ ≤ 1",
      "neighbor query:  all j with |r_j − r_i| ≤ r_vision",
    ],
    mathOutro:
      "The order parameter φ is the standard flocking metric: 1 means every boid flies in the same direction, near 0 means a milling swarm. Raising separation above alignment and cohesion breaks the flock into gas; the transition between regimes is sharp, which is why boids are studied as a phase transition.",
    how: [
      "Positions and velocities live in Float32Arrays. A uniform spatial hash with cell size equal to the vision radius reduces the naive O(N²) neighbor query to roughly O(N): each boid inspects only the 9 cells around it. Previous positions are stored each tick so the renderer can interpolate between fixed simulation steps at any refresh rate.",
      "The pointer acts as a predator: while held, a short-range repulsion is added to nearby boids' steering. Drag through a flock and watch it reform from the same three rules.",
    ],
    complexity: {
      time: "≈ O(N) per tick with the spatial hash (O(N²) naive)",
      space: "Typed arrays: 6 floats per boid plus hash links",
      note: "At the default 220 boids the whole update runs in well under a millisecond; the performance overlay shows the real number.",
    },
  },
  "n-body": {
    mathIntro:
      "Every pair of bodies attracts along their connecting line with an inverse-square law. There is no closed-form solution for N ≥ 3, so the motion exists only as the output of an integrator.",
    equations: [
      "a_i = G · Σ_{j≠i} m_j (r_j − r_i) / (|r_j − r_i|² + ε²)^{3/2}",
      "leapfrog (KDK):  v += a·dt/2;  x += v·dt;  a(x);  v += a·dt/2",
      "energy:  E = Σ ½ m v²  −  Σ_{i<j} G m_i m_j / r_ij",
    ],
    mathOutro:
      "The energy drift metric is the honest test of an integrator. Forward Euler gains energy every orbit and the disk flies apart; leapfrog is symplectic, so its energy error stays bounded instead of growing; RK4 is the most accurate per step but costs four force evaluations. Switch integrators and watch the drift number, not the picture.",
    how: [
      "State is a set of parallel Float32Arrays: positions, velocities, and accelerations for up to 400 bodies plus one heavy central mass. A Plummer softening term ε prevents the singular close encounter from producing infinite forces. Initial conditions place each body on a near-circular Keplerian orbit (v = √(GM/r)) with a small dispersion.",
      "The force loop is O(N²) with no allocations. Orbit trails come from a ring buffer per body, and previous positions enable tick-to-tick interpolation. Holding the pointer adds a temporary mass you can use to perturb or capture bodies.",
    ],
    complexity: {
      time: "O(N²) force pairs per step; 4× for RK4",
      space: "Typed arrays plus a 48-sample trail per body",
      note: "At 160 bodies a leapfrog step is a few hundred thousand pair interactions, comfortably inside one 60 Hz tick.",
    },
  },
  "double-pendulum": {
    mathIntro:
      "The double pendulum's equations of motion come from the Lagrangian and have no closed-form solution. They are also chaotic: two initial states separated by one millionth of a radian eventually look nothing alike.",
    equations: [
      "θ̈₁ = [ −g(2m₁+m₂)sinθ₁ − m₂g sin(θ₁−2θ₂) − 2sin(θ₁−θ₂) m₂ (ω₂²l₂ + ω₁²l₁cos(θ₁−θ₂)) ] / [ l₁ (2m₁+m₂−m₂cos(2θ₁−2θ₂)) ]",
      "θ̈₂ = [ 2sin(θ₁−θ₂)(ω₁²l₁(m₁+m₂) + g(m₁+m₂)cosθ₁ + ω₂²l₂m₂cos(θ₁−θ₂)) ] / [ l₂ (2m₁+m₂−m₂cos(2θ₁−2θ₂)) ]",
      "E = ½m₁l₁²ω₁² + ½m₂(l₁²ω₁² + l₂²ω₂² + 2l₁l₂ω₁ω₂cos(θ₁−θ₂)) − (m₁+m₂) g l₁ cosθ₁ − m₂ g l₂ cosθ₂",
    ],
    mathOutro:
      "Energy must be conserved: a growing drift would mean the integrator, not the physics, is changing the system. The ghosted pendulum is a twin integrated from the same state plus 10⁻⁶ radians; the twin-gap metric is the divergence you have heard described but probably never watched.",
    how: [
      "Classical RK4 integrates the exact equations each tick, with the energy recomputed directly from the state so drift is measured rather than assumed. The twin uses a cheaper semi-implicit step; its own integration error is negligible next to the separation it exists to measure. The trace records the lower bob's path in a ring buffer.",
      "Set both initial angles to 90 degrees, run for a while, then reset and add 0.001 degrees. The metrics panel shows when the twins part ways.",
    ],
    complexity: {
      time: "O(1) per tick: a handful of trig calls, four RK4 stages",
      space: "A 260-sample trace ring buffer",
      note: "Chaos is not randomness: same seed, same trajectory, every time. The twin differs by one millionth of a radian, not by chance.",
    },
  },
  "heat-diffusion": {
    mathIntro:
      "The heat equation says each point warms or cools in proportion to how much its temperature differs from the local average. Discretized on a grid, it becomes a weighted average applied over and over.",
    equations: [
      "∂u/∂t = α ∇²u",
      "explicit FTCS:  uⁿ⁺¹ = uⁿ + α (u_up + u_down + u_left + u_right − 4 uⁿ)",
      "stability:  α ≤ ¼   (2-D, unit cells)",
    ],
    mathOutro:
      "That ¼ limit is not negotiable: beyond it the explicit scheme amplifies rounding noise into visible oscillation. The slider refuses to cross it and the metrics panel reports whether the clamp engaged. With insulated (Neumann) boundaries the total energy is conserved, which the total-energy metric verifies live; with edges held at zero, the field must relax to the empty state.",
    how: [
      "The field is a Float32Array updated in place through a second buffer, one FTCS sweep per solver step. Boundary mode mirrors neighbors (insulated) or pins them to zero. The render path writes the field through a 256-entry perceptual colormap into an ImageData buffer scaled up to the canvas.",
      "Dragging inside the field injects heat under the pointer. Set the boundary to insulated, inject a hot spot, and watch total energy stay constant while the peak decays: conservation and diffusion, simultaneously visible.",
    ],
    complexity: {
      time: "O(cells × steps-per-tick) with a 5-point stencil",
      space: "Two Float32Arrays plus one ImageData buffer",
      note: "The solver applies the exact equation from the mathematics section: a point changes by α times its Laplacian, nothing more.",
    },
  },
  "reaction-diffusion": {
    mathIntro:
      "Gray-Scott models two reagents: u is fed in uniformly, v eats it and decays. Turing showed in 1952 that diffusion alone, acting at different rates on two chemicals, can destabilize a uniform state into persistent spatial pattern.",
    equations: [
      "∂u/∂t = D_u ∇²u − u v² + f (1 − u)",
      "∂v/∂t = D_v ∇²v + u v² − (k + f) v",
      "discrete Laplacian:  −1·center + 0.2·orthogonal + 0.05·diagonal",
    ],
    mathOutro:
      "The feed f and kill k are coordinates in a phase diagram: the same equations produce dividing cells, self-replicating spots, winding worms, or coral, and the borders between those regimes are sharp. The preset menu jumps to known points; the sliders let you explore the borders where the interesting failures live.",
    how: [
      "u and v live in Float32Arrays updated with the classic weighted 9-point Laplacian on a torus, followed by clamping back into [0, 1]. Each tick runs many solver iterations because the interesting dynamics unfold faster than 60 Hz. The pointer injects v directly; draw a stroke and watch it colonize or die depending on where you are in the phase diagram.",
      "The render maps 1 − u through the colormap, so reagent-rich regions glow and the background stays dark.",
    ],
    complexity: {
      time: "O(cells × iterations) per tick with a 9-point stencil",
      space: "Four Float32Arrays (double-buffered u and v)",
      note: "Activity (mean |Δv| per iteration) tells you whether the pattern is still evolving or has settled.",
    },
  },
  "langton-ant": {
    mathIntro:
      "The ant implements the simplest interesting rule machine on a grid: at each step, turn right on black or left on white, flip the cell's color, move forward one cell.",
    equations: [
      "direction ← rotate(direction, ±90°)  on black / white",
      "cell ← 1 − cell;   position ← position + heading",
      "after ≈ 10,000 chaotic steps:  unbounded diagonal highway, period 104",
    ],
    mathOutro:
      "The highway is the famous result: the ant's seemingly random walk spontaneously organizes into a repeating construction pattern that extends forever. It has been proved that this two-rule ant is computationally universal; it can simulate any Turing machine given the right starting configuration.",
    how: [
      "The grid is a flat Uint8Array and the ant is four integers: position and heading. Each tick applies a fixed number of moves, flipping cells and counting the black population during the pass. Leaving the grid either wraps the torus or bounces the ant, depending on the edge mode.",
      "Start from an empty grid and step slowly: the symmetric first few hundred steps, the messy middle, and the highway's emergence are all visible within a few thousand ticks.",
    ],
    complexity: {
      time: "O(steps per tick) with an O(1) rule per step",
      space: "One byte per cell plus four integers of ant state",
      note: "The initial-noise parameter tests how sturdy the highway is: scatter random black cells and the ant still finds its road.",
    },
  },
  "rk4-vs-euler": {
    mathIntro:
      "The harmonic oscillator θ̈ = −ω²θ is the standard test case for integrators because its exact solution, θ(t) = cos(ωt), is known. Every method's error is therefore measurable rather than estimated.",
    equations: [
      "forward Euler:   ω' = ω + a(θ)dt;  θ' = θ + ω dt   →  energy grows, O(dt) globally",
      "semi-implicit:   ω' = ω + a(θ)dt;  θ' = θ + ω' dt   →  symplectic, bounded energy",
      "classical RK4:   four stage evaluations, O(dt⁴) globally",
    ],
    mathOutro:
      "Forward Euler is structurally wrong for oscillators: each step adds a little energy, so the amplitude spirals outward forever. Semi-implicit Euler fixes it by using the new velocity for the position update, which preserves a modified energy exactly and keeps the orbit bounded. RK4 simply converges four orders faster. The error metrics are computed from the energy itself, E = ½ω²θ² + ½ω̇², relative to E₀.",
    how: [
      "All three integrators advance the same initial condition in lockstep, and the plot draws the exact solution as a reference line beneath them. The history buffer keeps a rolling window so the growing amplitude of Euler's spiral is visible without the axes ever moving.",
      "Cut dt from 0.02 to 0.005 and watch RK4's error drop by roughly 256×, which is what fourth-order convergence predicts: 4⁴ = 256.",
    ],
    complexity: {
      time: "O(steps per tick); RK4 costs four evaluations per step",
      space: "A rolling 900-sample history per curve",
      note: "This page is the numerical-methods category's thesis: the integrator is part of the physics whether you choose it or not.",
    },
  },
  "taylor-series": {
    mathIntro:
      "A Taylor polynomial rebuilds a function near a point from its derivatives there: value, slope, curvature, and so on. Each additional term extends the region where the polynomial hugs the curve.",
    equations: [
      "f(x) ≈ Pₙ(x) = Σ_{k=0}^{n} f⁽ᵏ⁾(0) / k! · xᵏ",
      "Lagrange remainder:  Rₙ(x) = f⁽ⁿ⁺¹⁾(ξ) / (n+1)! · xⁿ⁺¹   for some ξ between 0 and x",
      "1/(1+x²):  converges only for |x| < 1. The radius of convergence is real",
    ],
    mathOutro:
      "The remainder bound explains what the plot shows: near the expansion point the factorial in the denominator crushes the error, and far away the polynomial is useless. For 1/(1 + x²) the failure at |x| = 1 has nothing to do with the function's smoothness at 0; it comes from poles hiding at x = ±i, which complex analysis makes visible in real calculus.",
    how: [
      "The function and its partial sum are evaluated point by point across the visible domain; the marker tracks the pointer and reports f, Pₙ, and their difference at that exact location. The max-error metric sweeps 201 sample points across the domain so the numbers cannot be cherry-picked.",
      "Switch to 1/(1 + x²) and add terms one at a time: inside |x| < 1 the fit tightens, outside it gets dramatically worse. That is the radius of convergence doing exactly what the theorem says.",
    ],
    complexity: {
      time: "O(terms) per evaluated point",
      space: "None beyond the coefficient sequence",
      note: "Coefficients are generated from each function's derivative recurrence, not hardcoded tables.",
    },
  },
  mandelbrot: {
    mathIntro:
      "The Mandelbrot set is the set of complex numbers c for which the orbit of z = 0 under z ↦ z² + c stays bounded. Everything you see is escape time: how many iterations a point survives before |z| exceeds 2.",
    equations: [
      "z_{n+1} = z_n² + c,   z_0 = 0",
      "c ∈ M  ⇔  sup_n |z_n| ≤ 2",
      "smooth color:  ν = n + 1 − log₂(log |z_n| / log 2)",
    ],
    mathOutro:
      "Two facts make the pictures honest. First, |z| > 2 guarantees escape, so the loop is finite. Second, the fractional escape count ν makes bands smooth instead of banded - the color you see is a continuous measurement of dynamics, not a paint job. The boundary of M has Hausdorff dimension 2 and is exactly where the interesting computation lives.",
    how: [
      "A 280-wide buffer is iterated per pixel (up to the iteration cap) only when zoom, center, or the cap changes; the counts live in a float array and are re-mapped through a slowly cycling palette every tick, so the image is alive without recomputing. The whole recompute at default settings is a few milliseconds.",
      "Drag pans the view in plane coordinates; zoom doubles the magnification per step. Inside the set (never escaping) is rendered at palette zero.",
    ],
    complexity: {
      time: "O(buffer · maxIter) per recompute; O(buffer) per recolor tick",
      space: "One float per buffer pixel",
      note: "Zoom multiplies magnification by 2 per step; deep zooms need both more iterations and more buffer resolution, which is why the iteration cap is exposed.",
    },
  },
  "svd-compression": {
    mathIntro:
      "The singular value decomposition factors any matrix into orthogonal rotations and a diagonal scale: A = UΣVᵀ. Truncating to the k largest singular values gives the best rank-k approximation of A in the Frobenius norm - the Eckart-Young theorem, and the entire theory of the compression slider.",
    equations: [
      "A = U Σ Vᵀ,   σ₁ ≥ σ₂ ≥ … ≥ 0",
      "A_k = Σ_{j≤k} σ_j u_j v_jᵀ   minimizes ‖A − B‖_F over rank-k B",
      "energy retained:  Σ_{j≤k} σ_j² / Σ_j σ_j²",
    ],
    mathOutro:
      "The decomposition here is computed by one-sided Jacobi orthogonalization: rotate column pairs until all columns of A are orthogonal; their norms are the singular values and the accumulated rotations form V. The reconstruction formula then collapses to a sum of column products. Zero iterations, no learning rate - the same problem least squares solves, seen from the spectral side.",
    how: [
      "The 64×64 image is a matrix. One-sided Jacobi sweeps rotate column pairs (p, q) by the angle that zeroes their inner product, accumulating the rotations into V; after a few sweeps the off-diagonal Gram values drop below tolerance and the columns are the scaled left singular vectors.",
      "The rank-k reconstruction sums the top k columns against their V rows. The split view compares original and reconstruction; the error view maps the absolute difference through a token-built diverging colormap.",
    ],
    complexity: {
      time: "O(sweeps · n³) for the solve, once per image; O(n²k) per rank change",
      space: "Three 64×64 float matrices",
      note: "The compression ratio is the true storage count: k(2n + 1) numbers against n² pixels.",
    },
  },
  "central-limit-theorem": {
    mathIntro:
      "Take n independent draws from any distribution with finite variance and average them. The CLT says the distribution of that average approaches a Gaussian with the source's mean and variance divided by n - regardless of the source's shape.",
    equations: [
      "X̄ₙ → Normal(μ, σ²/n)   as n → ∞",
      "predicted spread:  σ_X̄ = σ / √n",
      "Welford:  s² = M2 / (N − 1),  M2 += δ (x − μ_new)",
    ],
    mathOutro:
      "The simulation measures rather than asserts: the source's variance is characterized empirically at reset, the running spread of the means is computed online by Welford's algorithm, and the two numbers sit side by side in the metrics. Switch to the bimodal source with n = 1 and you are sampling the raw distribution; push n up and watch the bimodality vanish within a few hundred bins.",
    how: [
      "Each tick draws many n-sample means from the seeded source stream into a 64-bin histogram over [0, 1]. The Gaussian overlay is the CLT prediction scaled to the histogram's own scale; the source outline is a cached empirical probe for contrast.",
      "Reset replays the identical stream for the same seed - convergence is deterministic here, which makes the empirical-versus-predicted comparison meaningful.",
    ],
    complexity: {
      time: "O(rate · n) draws per tick",
      space: "One 64-bin histogram plus running moments",
      note: "The predicted sigma uses the measured source variance, not a textbook constant, so the comparison stays honest for every source.",
    },
  },
  "elastic-collisions": {
    mathIntro:
      "Two disks collide elastically when the impulse along their contact normal reflects the relative normal velocity with restitution 1. Momentum is conserved by construction; kinetic energy is conserved because e = 1 and the positional separation is orthogonal to the impulse.",
    equations: [
      "j = −(1 + e) (v_rel · n) / (1/m₁ + 1/m₂),   e = 1",
      "v₁ ← v₁ + (j/m₁) n;   v₂ ← v₂ − (j/m₂) n",
      "KE = Σ ½ m v²,   p = Σ m v",
    ],
    mathOutro:
      "The impulse is only applied when bodies are approaching (v_rel · n < 0), which prevents resting-contact jitter. Energy drift in the metrics comes from two honest sources: float32 state and the positional overlap separation - watching how small it stays is the point of showing it.",
    how: [
      "Disks integrate ballistically, bounce off the four walls, and resolve pairwise with a combined radius check. Overlap is split half-and-half along the normal before the impulse so disks never sink into each other. The pointer slingshots new disks in: press, drag, release, and the drag vector becomes a velocity.",
      "Kinetic energy and total momentum are recomputed twice a second; collisions per second come from a one-second sliding count.",
    ],
    complexity: {
      time: "O(n²) pair checks per tick - comfortable at the 200-disk capacity",
      space: "Six floats per disk",
      note: "Mass scales with radius squared, so the slingshot disks genuinely shove smaller ones aside.",
    },
  },
  "electrostatic-potential": {
    mathIntro:
      "Charges on a grounded box solve the Poisson equation: the potential's Laplacian is the (negative) charge density, with the walls pinned at zero volts. Discretized, every interior cell must satisfy a weighted average of its neighbors plus its own source term.",
    equations: [
      "∇²V = −ρ/ε,   V|_boundary = 0",
      "discrete:  4 V_ij − V_ij−1 − V_ij+1 − V_i−1j − V_i+1j = ρ_ij",
      "SOR:  V ← V + ω (ρ + Σ V_neighbors − 4V) / 4,   ω ≈ 1.75",
    ],
    mathOutro:
      "The solver is Gauss-Seidel with relaxation (ω > 1 accelerates it), red-black ordered so it needs no second buffer. The sweep loop stops when the largest per-cell update drops below a residual threshold tied to the charge scale - and that residual is displayed, not assumed. The banded color mapping quantizes the potential into 16 levels: the band edges are equipotential contours.",
    how: [
      "Clicking stamps a charge into the density array as a smooth Gaussian blob (sharp point charges make the discrete system unhappy), then resets the sweep counter; the field you see is the solver physically relaxing toward the solution a few sweeps per tick.",
      "The tool selector chooses positive, negative, or erase; erase finds the nearest charge within radius. The same linear system is what Conjugate Gradient solves - there three solvers race on it; here SOR animates it.",
    ],
    complexity: {
      time: "O(cells) per sweep, 8 sweeps per tick until converged",
      space: "Two float arrays: potential and charge density",
      note: "Grounded walls are the boundary condition: V is never updated on the outer ring, so field lines have somewhere real to terminate.",
    },
  },
  "conjugate-gradient": {
    mathIntro:
      "For a symmetric positive-definite system Ax = b, conjugate gradient minimizes the quadratic f(x) = ½xᵀAx − bᵀx by building search directions from the residuals, each A-orthogonal to the last. In exact arithmetic it converges in n steps; with roundoff it converges whenever the residual says so.",
    equations: [
      "α = (rᵀr) / (pᵀAp)",
      "x ← x + α p;   r ← r − α Ap",
      "β = (r_newᵀr_new) / (rᵀr);   p ← r + β p",
    ],
    mathOutro:
      "The Poisson matrix 4I − adjacency is SPD, so CG applies. The plot shows relative residual ‖r‖/‖b‖ per iteration for Jacobi, Gauss-Seidel, and CG on identical systems: stationary methods decay geometrically at a rate set by the grid, while CG's polynomial optimizer crushes the low modes first and wins by orders of magnitude. That system is exactly the one Electrostatic Potential animates with SOR.",
    how: [
      "All three solvers advance the same number of iterations per tick on their own copies of the system. The operator is applied as a 5-point stencil - the matrix is never stored. Residuals are recorded each iteration into a history buffer and plotted on a log scale; a small inset shows the CG solution field with its equipotential banding.",
      "The convergence test uses the relative residual against the selectable tolerance; a solver that meets it stops and its curve goes flat.",
    ],
    complexity: {
      time: "O(cells) per iteration per solver (one stencil application for CG)",
      space: "Five grid-sized float arrays for CG, two per stationary solver",
      note: "Watch the CG curve's staircase: superlinear convergence zones appear as low-frequency error modes are eliminated.",
    },
  },
  "adaptive-rk45": {
    mathIntro:
      "An embedded Runge-Kutta pair computes two solutions of different order from the same stage evaluations. Dormand-Prince's 5(4) pair gives seventh stages producing a fifth-order step and a fourth-order estimate; their difference estimates the local error, and a controller picks the next step size to hold that estimate near tolerance.",
    equations: [
      "err = |dt · Σ (b_i − b̂_i) k_i|",
      "controller:  h ← h · clamp(0.9 (tol / err)^{1/5}, 0.2, 5)",
      "test problem:  y' = λ (sin t − y) + cos t,   exact: y(t) = sin t",
    ],
    mathOutro:
      "The test problem's transient e^{−λt} is where the controller earns its keep: with λ = 30, the first fraction of a second demands steps orders of magnitude smaller than the smooth sin tracking that follows. The step trace shows exactly that collapse and recovery. Because the exact solution is known, the reported max error is the real error, and the fixed-step comparison (dt = 1/60, 480 steps per pass) shows what adaptivity buys.",
    how: [
      "Each tick performs a fixed number of accepted steps. A step is attempted, rejected and retried with a shrunk dt while its embedded error exceeds tolerance, then accepted with a controller-suggested next h. The trace stores t, y, and h per accepted step; one full pass over the 8-second horizon snapshots the metrics before restarting.",
      "Everything is deterministic: same parameters, same step sequence - the controller is part of the simulation, not hidden machinery.",
    ],
    complexity: {
      time: "7 derivative evaluations per attempted step",
      space: "The t/y/h trace, 3000 samples",
      note: "Tighten the tolerance slider and the step count rises; loosen it and the steps grow - the controller responds exactly as the theory says.",
    },
  },
  "least-squares": {
    mathIntro:
      "Fitting y = ax + b by least squares has a closed form: minimize Σ(yᵢ − a xᵢ − b)², set both partial derivatives to zero, and a 2×2 linear system (the normal equations) falls out - solved exactly by Cramer's rule.",
    equations: [
      "[ Sxx  Sx ] [a]   [Sxy]",
      "[ Sx   N ] [b] = [Sy ]",
      "a = (Sxy·N − Sx·Sy) / (Sxx·N − Sx²),   b = (Sxx·Sy − Sx·Sxy) / (Sxx·N − Sx²)",
    ],
    mathOutro:
      "This is the algebraic counterpart to iterative fitting: one exact solve instead of a descent. That exactness is also the lesson the outlier slider teaches - a single far point drags the whole line, because least squares squares its residuals and unweighted exactness has no defenses. The condition number of the normal matrix shows when the data itself (nearly constant x) makes the problem fragile.",
    how: [
      "Data is drawn from a seeded stream: x uniform, y from the true line plus Gaussian noise, plus an outlier jump for a controllable fraction. The fit, residuals, RMS, R², and the normal-matrix condition number all recompute on any parameter change; residual stems visualize each point's distance to the line.",
      "With noise at zero the fit recovers the true coefficients to float precision - which the test suite asserts.",
    ],
    complexity: {
      time: "O(N) for the fit - a single pass to accumulate five sums",
      space: "The data arrays only",
      note: "Same problem, different philosophy than gradient descent: exact algebra versus iterative refinement, each with its own failure modes.",
    },
  },
  "support-vector-machine": {
    mathIntro:
      "A linear classifier separates classes with the hyperplane that maximizes the margin: minimize ½‖w‖² subject to yᵢ(w·xᵢ + b) ≥ 1. The soft-margin version allows violations with a hinge penalty, and the kernel trick replaces inner products with κ(x, z) so the same trainer draws non-linear boundaries.",
    equations: [
      "minimize  ½‖w‖² + C Σ max(0, 1 − yᵢ f(xᵢ))",
      "kernelized:  f(x) = Σⱼ αⱼ yⱼ κ(xⱼ, x),   κ_RBF = exp(−γ‖x − z‖²)",
      "Pegasos:  on violation, αᵢ ← αᵢ + 1/(λt);  project ‖α‖ ≤ 1/√λ",
    ],
    mathOutro:
      "The trainer is kernelized Pegasos: stochastic subgradient steps on the hinge loss with a projection, one pass per epoch over a seeded shuffle. Under a subgradient method there are no exact support vectors, so the ringed points are the honest equivalent - the margin-active set |y f(x)| < 1, the samples the hinge still cares about. Toggle linear to RBF on overlapping blobs and watch the boundary bend without a single change to the trainer.",
    how: [
      "Points live in arrays; the dual coefficients α live in one float array and the decision function sums the kernel-weighted labels on the fly. A constant is absorbed into the kernel (κ + 1) so no separate bias is needed. The decision field re-evaluates on a 96×48 grid every twelve ticks and after any data edit; accuracy and the margin-active count come from the same pass.",
      "The pointer adds labeled points (tool selector) or erases the nearest - training continues online, so the boundary answers immediately.",
    ],
    complexity: {
      time: "O(points) per sample update; field O(grid · support points)",
      space: "One dual coefficient per point",
      note: "Linear versus RBF is literally a one-line kernel swap - the margin objective stays identical, which is the kernel trick's whole point.",
    },
  },
  "naive-bayes": {
    mathIntro:
      "Bayes' rule turns a generative model into a classifier: model each class's features as an axis-aligned Gaussian, combine with the class frequencies as priors, and the posterior P(class | x) follows in closed form. 'Naive' is the independence assumption between features - which is exactly what the elliptical contours show.",
    equations: [
      "P(A | x) = π_A N(x; μ_A, Σ_A) / (π_A N_A + π_B N_B)",
      "log-posterior:  log π − ½ (x − μ)ᵀ Σ⁻¹ (x − μ) − ½ log |Σ|",
      "decision boundary:  P(A | x) = 0.5",
    ],
    mathOutro:
      "Everything is recomputed from scratch whenever the data changes: means, variances (with a variance floor so single points cannot claim zero width), priors, the full posterior field, and the training accuracy. Adding one point on the wrong side of the boundary drags its class mean and visibly bends the 0.5 contour - generative classifiers answer to their data directly.",
    how: [
      "The posterior field renders on a 96×48 grid through a token-built diverging colormap (class A toward accent, class B toward sky) at 55% opacity so points stay dominant; the 1σ ellipses are drawn per class from the live statistics. The pointer's own posterior P(A | x) is a live metric - hover anywhere and read the classifier's mind.",
      "The tool selector adds class A, adds class B, or erases the nearest point; class counts and priors update with every click.",
    ],
    complexity: {
      time: "O(points) per model update; O(grid) per field render",
      space: "Eight numbers of class statistics",
      note: "Compare with the SVM: generative model versus discriminative margin, Gaussian boundary versus kernelized hinge - same data, two philosophies.",
    },
  },
  "bfs-dfs": {
    mathIntro:
      "Breadth-first search expands outward in exact rings: every cell at graph distance d is visited before any cell at distance d + 1. Depth-first search commits to a corridor until it dead-ends. Same graph, same neighbors - the only difference is queue versus stack.",
    equations: [
      "BFS frontier = FIFO queue  =>  first path found is shortest (unweighted)",
      "DFS frontier = LIFO stack  =>  path found, no length guarantee",
      "both:  O(V + E) time,  O(V) frontier",
    ],
    mathOutro:
      "The optimality of BFS falls straight out of the ring structure: a cell first reached at depth d cannot be reached in fewer steps, because all depth d-1 cells were already expanded. DFS gives no such guarantee - which the path-length metric makes concrete on the same maze.",
    how: [
      "The grid, walls, and start/goal are shared with the A* experiment; visited flags and parent pointers are flat typed arrays. Expanding a cell enqueues its four unvisited neighbors with the parent recorded; BFS shifts from the front of the array, DFS pops from the back.",
      "Switching strategies restarts the run over the same walls, so the visited-region shapes are directly comparable.",
    ],
    complexity: {
      time: "O(V + E) for either strategy",
      space: "O(V): visited flags, parents, frontier",
      note: "Try the same density with both strategies: BFS's visited region is a disk, DFS's is a starfish.",
    },
  },
  "rrt-rrt-star": {
    mathIntro:
      "Sampling-based planners grow a tree of feasible motion: sample a point, steer the nearest tree node toward it by a fixed step, keep the edge if it is collision-free. RRT is provably rapid at exploring; RRT* is provably asymptotically optimal.",
    equations: [
      "nearest:  x_new = x_near + min(step, |x_sample - x_near|) * unit(x_sample - x_near)",
      "RRT* parent choice:  minimize cost(x_new) = cost(x_parent) + |edge|",
      "rewiring:  for neighbors j with |edge| < r:  cost(j) <- min(cost(j), cost(x_new) + |j - x_new|)",
    ],
    mathOutro:
      "The star's two extra loops - choosing the cheapest parent in a neighborhood and rewiring neighbors through the new node - are what turn a feasible path into an improving one. The cost metric lets you run both variants on the same obstacle field and watch the gap open.",
    how: [
      "The tree lives in parallel typed arrays (x, y, parent, cost). Each tick takes a fixed number of samples with 8% goal bias; every candidate edge is collision-checked against the circular obstacles by projecting the circle center onto the segment.",
      "RRT* keeps a rewiring radius proportional to the step size and rechecks segments in both phases. Reaching the goal circle snapshots the best path and cost.",
    ],
    complexity: {
      time: "O(n log n) amortized per sample with spatial indexing; O(n) nearest-neighbor here",
      space: "One node record per accepted sample",
      note: "Plain RRT stops improving the moment it touches the goal; RRT* keeps tightening forever.",
    },
  },
  "barnes-hut": {
    mathIntro:
      "Barnes-Hut approximates the gravitational effect of a distant cluster by its center of mass whenever the cluster subtends a small enough angle: s/d < theta, cell size over distance. The multipole acceptance criterion turns an O(n^2) pairwise sum into roughly O(n log n).",
    equations: [
      "a_i = G sum over clusters near i of m_c (r_c - r_i) / (|r_c - r_i|^2 + eps^2)^(3/2)",
      "accept cluster when  s / d < theta;   else subdivide",
      "force error vs direct sum:  err = mean |F_BH - F_direct| / |F_direct|",
    ],
    mathOutro:
      "The theta slider is the honesty dial: theta near 0 forces the tree to open almost every node, converging to the direct sum (and the error metric agrees); theta near 1.4 opens almost nothing and the error shows it. Watching the measured error respond to theta is the calibration exercise every force-field code runs.",
    how: [
      "The quadtree is rebuilt every tick into flat typed arrays: four children per node, a body slot per leaf, and per-node mass and center of mass computed by one upward pass. Force queries walk from the root, opening nodes that fail the theta test.",
      "Every 90 ticks the engine runs the direct O(n^2) sum on the same positions and reports the mean relative force error - the number that tells you the approximation is real.",
    ],
    complexity: {
      time: "O(n log n) per tick for the tree plus force walk",
      space: "O(n) tree nodes per tick",
      note: "A spiral-galaxy initial condition makes clusters visible: turn on the quadtree overlay and watch the box boundaries follow the density.",
    },
  },
  "genetic-algorithm": {
    mathIntro:
      "A genetic algorithm searches by evolving a population: candidates with higher fitness are selected as parents, traits are blended by crossover, and mutation perturbs the result. No derivatives - selection pressure is the only gradient-like signal.",
    equations: [
      "selection:  k-way tournament (pick k random, keep the fittest)",
      "crossover:  child = alpha * parent_a + (1 - alpha) * parent_b",
      "mutation:   child += N(0, sigma_mutation);  elites carried unchanged",
    ],
    mathOutro:
      "Elitism guarantees the best fitness never decreases, which the history strip shows as a monotone ceiling over a noisy population mean. Raising the mutation sigma explores more but commits less - the classic exploration-exploitation trade-off, one slider wide.",
    how: [
      "The landscape is a fixed sum of four Gaussian peaks plus a mild ripple, evaluated at each candidate's (x, y). Each tick runs a configurable number of generations: rank, copy elites, breed the rest by tournament and blend crossover, mutate, clamp to the unit square.",
      "The heatmap is the landscape itself; the population dots are drawn on top, with the current best highlighted in accent.",
    ],
    complexity: {
      time: "O(population) fitness evaluations per generation",
      space: "Two population arrays plus a history buffer",
      note: "Drop mutation to zero after a few generations and the population collapses onto its elites - premature convergence, live.",
    },
  },
  "simulated-annealing": {
    mathIntro:
      "Simulated annealing accepts a worsening move with the Metropolis probability exp(-delta / T): at high temperature the search roams the energy landscape, at low temperature it only accepts improvements. Cooling T slowly is what earns the guarantee of settling near a good optimum.",
    equations: [
      "accept if  delta < 0,  else with probability  exp(-delta / T)",
      "cooling:  T <- T * coolingRate   each move attempt",
      "move:  reverse tour[i..k] (2-opt);  delta = added edges - removed edges",
    ],
    mathOutro:
      "The 2-opt reversal is chosen because only two edges change under a tour reversal, so delta is computable in constant time - the difference between a toy and a real annealer. The acceptance-rate metric doubles as a thermometer: when it hits zero, the search has frozen wherever it stands.",
    how: [
      "24 cities live on a seeded plane; the tour is a permutation array. Each tick attempts a fixed number of reversal moves, applying Metropolis acceptance and cooling the temperature multiplicatively. The length history strip shows the classic annealing signature: early chaos, then rapid refinement, then stillness.",
      "Reset replays the same city layout and shuffle for the same seed.",
    ],
    complexity: {
      time: "O(1) per move attempt (constant-time delta for 2-opt)",
      space: "The tour array plus a length history",
      note: "Reheat by raising the initial temperature and watch a frozen tour start moving again.",
    },
  },
  "fourier-transform": {
    mathIntro:
      "The Discrete Fourier Transform rewrites a length-N signal as N complex exponentials: X(k) measures how much of frequency k lives in the signal. Computed here straight from the definition - N-squared operations, no FFT cleverness - so the spectrum is visibly the arithmetic it claims to be.",
    equations: [
      "X(k) = sum_n x(n) e^{-2 pi i k n / N}",
      "magnitude:  |X(k)| = sqrt(Re^2 + Im^2)",
      "linearity:  DFT(x + y) = DFT(x) + DFT(y)",
    ],
    mathOutro:
      "Linearity is why the spectrum reads honestly: each harmonic mixed into the signal produces exactly one peak at its own frequency, and noise spreads thinly across every bin. The two-peak structure in the default signal is the whole demonstration - what you mixed in is what you read out.",
    how: [
      "The signal buffer composes three harmonics (two slider-controlled) plus seeded noise, then the DFT runs per render: for each of the 64 output bins, sum the signal against a complex exponential. It is the O(n^2) textbook definition, which is precisely the point - the FFT is an optimization of exactly this sum.",
      "The bottom panel plots |X(k)| for every bin; the peak bins are highlighted against the noise floor.",
    ],
    complexity: {
      time: "O(N^2) per render - the definition, unoptimized on purpose",
      space: "One signal buffer plus the spectrum",
      note: "The FFT achieves the same result in O(N log N) by exploiting the symmetry this page makes visible.",
    },
  },
  "fourier-series": {
    mathIntro:
      "Periodic functions decompose into sine harmonics: the square wave is (4/pi) times the odd harmonics with 1/n weights, the sawtooth uses every harmonic with alternating signs, the triangle uses 1/n-squared. Truncating the series gives an approximation whose error you can measure.",
    equations: [
      "square:    f(t) = (4/pi) sum_{k odd} sin(k wt) / k",
      "sawtooth:  f(t) = (2/pi) sum_{k>=1} sin(k wt) / k",
      "triangle:  f(t) = (8/pi^2) sum_{k odd} (-1)^((k-1)/2) sin(k wt) / k^2",
    ],
    mathOutro:
      "Gibbs' phenomenon is the star of the square wave: near the discontinuity the partial sum overshoots by about 9% no matter how many terms you add - more terms squeeze the ringing narrower, they never shrink it. The max-error metric deliberately skips the jump point to measure the interior approximation honestly.",
    how: [
      "Both the target and the truncated series are evaluated sample-by-sample across the view; the measured max error sweeps 400 interior points so the reported number cannot hide a spike.",
      "Change the waveform and the coefficient recipe changes with it - the plot code is identical.",
    ],
    complexity: {
      time: "O(terms) per drawn sample",
      space: "None",
      note: "The triangle wave converges fastest: its coefficients fall like 1/n^2 because the function is continuous.",
    },
  },
  "eigen-basis": {
    mathIntro:
      "An eigenvector of A is a vector that only gets scaled: Av = lambda v. For a 2x2 real matrix they come from the characteristic polynomial lambda^2 - (trace) lambda + det = 0 - real when the discriminant trace^2 - 4 det is non-negative.",
    equations: [
      "lambda = (tr +- sqrt(tr^2 - 4 det)) / 2",
      "eigenvector direction (when b != 0):  v = (b, lambda - a)",
      "verification:  A v = lambda v",
    ],
    mathOutro:
      "The drawn lines are those invariant directions. When the discriminant goes negative the eigenvalues leave the real axis: the circle's image becomes a rotating, scaling ellipse with no fixed directions - which is what the plot shows the moment the metric says 'complex'. The verification identity Av = lambda v is asserted by the test suite, not assumed.",
    how: [
      "The four matrix entries are sliders. The render draws the image of the unit circle under A, the transformed basis square, and the eigenvector lines computed from the closed-form roots, rescaled to the viewport.",
      "Determinant and trace are shown live because every geometric statement about the transform - area factor, flip, trace-determinant classification - flows from those two numbers.",
    ],
    complexity: {
      time: "O(1): a handful of arithmetic operations",
      space: "None",
      note: "Set b = c = 0 and the matrix is diagonal: the eigenvectors snap to the axes, exactly as the algebra predicts.",
    },
  },
  "matrix-transformations": {
    mathIntro:
      "A 2x2 matrix is two column vectors: where the basis goes. Rotation, scaling, and shear compose by matrix multiplication into one M, and every point of the grid and the house is mapped by M x.",
    equations: [
      "M = H * S * R   (shear applied last, rotation first)",
      "det(M) = area scale factor;  det < 0 means orientation flip",
      "column 1 of M = image of (1, 0);  column 2 = image of (0, 1)",
    ],
    mathOutro:
      "The composition order matters: shear-after-rotate is a different transform than rotate-after-shear, and the slider stack makes the order visible in one drag. The determinant readout is the fastest sanity check in linear algebra - watch it cross zero exactly when the shape collapses flat.",
    how: [
      "The composed matrix is recomputed from the five sliders per frame; the grid, basis vectors, and house polygon are transformed by it point by point. The readout writes the matrix entries in row-major form.",
      "Set scale to (-1, 1) for a reflection: the determinant goes negative and the house flips - orientation, quantified.",
    ],
    complexity: {
      time: "O(1) per transform; O(grid) for drawing",
      space: "Four numbers",
      note: "The matrix readout and the picture can never disagree: both come from the same four numbers.",
    },
  },
  "julia-set": {
    mathIntro:
      "Fix a complex constant c and iterate z <- z^2 + c from every starting point z_0. The filled Julia set is the set of starting points whose orbits stay bounded. Unlike the Mandelbrot set (the parameter-space picture), each c gives its own fractal in the dynamic plane.",
    equations: [
      "z_{n+1} = z_n^2 + c",
      "escape radius 2:  |z| > 2 guarantees divergence",
      "classic orbit:  c = 0.7885 e^{i theta},  theta advancing",
    ],
    mathOutro:
      "The escape criterion |z| > 2 is algebra, not convention: once |z| exceeds 2 the next squaring pushes it further, monotonically to infinity. The animate slider walks c around the circle of radius 0.7885 - through dendrites, rabbits, and dust - the whole taxonomy of Julia sets in one rotation.",
    how: [
      "A 300-wide buffer is iterated per pixel with the current c each frame when animating (a few milliseconds at the default cap), then colored by escape speed through the same perceptual colormap the Mandelbrot page uses.",
      "The c readout on the canvas updates live so the current parameter is never a mystery.",
    ],
    complexity: {
      time: "O(buffer * maxIter) per frame while animating",
      space: "One ImageData buffer",
      note: "Push |c| past 2 and the set collapses to dust - every orbit escapes immediately.",
    },
  },
  "probability-distributions": {
    mathIntro:
      "Three named distributions, three different stories: binomial counts successes in n trials, Poisson counts rare events per interval, normal approximates everything the CLT touches. Each has a closed-form pmf that can be drawn exactly - and then tested against sampling.",
    equations: [
      "binomial:  P(k) = C(n, k) p^k (1-p)^(n-k)",
      "Poisson:   P(k) = lambda^k e^{-lambda} / k!",
      "normal:    f(x) = exp(-(x-mu)^2 / 2 sigma^2) / (sigma sqrt(2 pi))",
    ],
    mathOutro:
      "The exact pmf curve is drawn from the formulas above; the histogram accumulates seeded samples whose empirical mean is compared with the theoretical mean in the metrics. The binomial coefficients are computed in log space so n up to 20 never overflows.",
    how: [
      "Sampling per distribution: binomial sums n Bernoulli draws, Poisson uses Knuth's multiplication loop, normal uses Box-Muller. The histogram normalizes to its own maximum so the pmf overlay scales to the same axis.",
      "Change parameters and the histogram resets - a different distribution needs a fresh count.",
    ],
    complexity: {
      time: "O(1) per sample (binomial O(n))",
      space: "One 40-bin histogram",
      note: "Poisson with large lambda approaches the normal - switch between them at lambda = 12 and see it.",
    },
  },
  "vector-field": {
    mathIntro:
      "A vector field assigns a velocity to every point. This one sums four analytic ingredients: a uniform flow, a source (radial outflow decaying as 1/r), a vortex (tangential 1/r flow), and the pointer as an extra source you can steer.",
    equations: [
      "uniform:  v = U (cos alpha, sin alpha)",
      "source of strength m:  v = m (r - r0) / (2 pi |r - r0|^2)",
      "vortex of strength G:  v = G (-dy, dx) / (2 pi |r - r0|^2)",
    ],
    mathOutro:
      "The 1/r decay is the signature of potential flow in 2-D: the induced speed halves every doubling of distance, which is why the structures you see stay local. Setting the source negative turns outflow into inflow - a sink that the particles visibly fall into - and the vortex slider alone produces pure circulation.",
    how: [
      "Seven hundred particles advect through the analytic velocity each tick with edge-respawn keeping density even; previous positions are stored so each particle renders as a motion streak whose alpha scales with speed. The arrow overlay samples the same velocity function on a grid - particles and arrows can never disagree.",
      "Everything is closed-form: no integration error exists in the field itself, only in the particle advection step.",
    ],
    complexity: {
      time: "O(particles + arrows) per tick",
      space: "Two position arrays",
      note: "Balance source against flow and a stagnation point appears - the point where the velocity is exactly zero.",
    },
  },
  "projectile-motion": {
    mathIntro:
      "Without drag, a projectile's path is the parabola y(t) = y0 + v sin(theta) t - g t^2/2, and the range is exactly v^2 sin(2 theta) / g. With quadratic drag, no closed form exists - which is why the integrated path and the analytic path are drawn as two separate curves.",
    equations: [
      "no drag:  range = v^2 sin(2 theta) / g",
      "with drag:  dv/dt = -g j - k |v| v",
      "integrated with explicit Euler at 60 Hz substeps",
    ],
    mathOutro:
      "The analytic range formula is the test: the test suite asserts the integrated trajectory at zero drag matches v^2 sin(2 theta)/g to within a percent. With drag on, the metric shows how far the real arc falls short - energy is being paid to the air, and the asymmetry of the collapse is the visualization of that bill.",
    how: [
      "The numeric projectile integrates velocity and position with quadratic drag (force opposite velocity, proportional to speed squared). The analytic trail is generated once per launch from the closed form. The auto-relaunch keeps the comparison alive; turn it off and read the landing metrics.",
      "Launch height is 30 m so the asymmetric descent is clearly visible against the symmetric ideal.",
    ],
    complexity: {
      time: "O(1) per tick",
      space: "The trail arrays",
      note: "At drag = 0 the two curves overlap to sub-pixel precision - that overlap is the correctness proof.",
    },
  },
  springs: {
    mathIntro:
      "Hooke's law says a stretched spring pulls with force proportional to the stretch: F = -k x. Chain that law between fixed walls and masses and you get coupled oscillators whose normal modes superpose - the whole motion from one force rule applied per connection.",
    equations: [
      "F_i = k (x_{i+1} - x_i - L) - k (x_i - x_{i-1} - L)",
      "semi-implicit Euler:  v <- v + (F/m - b v) h;  x <- x + v h",
      "total energy E = sum 1/2 m v^2 + 1/2 k (stretch)^2",
    ],
    mathOutro:
      "Semi-implicit (symplectic) Euler is chosen deliberately: it keeps the total energy bounded instead of steadily growing like forward Euler would. The drift metric proves it - zero drift with damping off, monotone decay with damping on. Both behaviors are properties of the integrator-plus-physics pair, and both are checkable.",
    how: [
      "The chain integrates with four substeps per tick for stability at high k. The trace plots the first mass over time; set masses to 1 for a pure sinusoid, raise k and watch the frequency climb as sqrt(k/m).",
      "Walls count as springs too: the end masses feel one wall and one neighbor, so the chain is a genuine coupled system, not independent oscillators.",
    ],
    complexity: {
      time: "O(masses * substeps) per tick",
      space: "Two float arrays plus the trace",
      note: "Damping 0 versus 0.5 on the same ICs is the cleanest energy-conservation demo in the catalog.",
    },
  },
  "kepler-orbits": {
    mathIntro:
      "Kepler's laws in one integration: the orbit is an ellipse with the star at a focus (first law), the radius vector sweeps equal areas in equal times because angular momentum is conserved (second law), and T^2 / a^3 is the same constant for every orbit (third law).",
    equations: [
      "r(theta) = a (1 - e^2) / (1 + e cos theta)",
      "angular momentum L = r^2 dtheta/dt  (conserved)",
      "swept area rate = L / 2  =>  equal areas in equal times",
    ],
    mathOutro:
      "The integration happens in polar coordinates with the radial acceleration written directly from the angular-momentum invariant - so the second law cannot be violated by numerical error, only confirmed. The wedges are drawn from the actual swept-area rate over fixed intervals: their equal sizes are the measurement.",
    how: [
      "Initial conditions come from the vis-viva equation at perihelion for the chosen eccentricity. The orbit overlay is the analytic ellipse; the planet's motion is integrated, and where the two agree is the point.",
      "The period counter records one full revolution of theta, feeding the T^2/a^3 readout directly.",
    ],
    complexity: {
      time: "O(1) per tick",
      space: "The wedge list (64 samples)",
      note: "Set eccentricity to zero and the wedges stay constant-width; raise it and watch the planet sprint through perihelion.",
    },
  },
  "three-body": {
    mathIntro:
      "Three gravitating bodies have no closed-form solution in general - Poincare proved it - but specific initial conditions produce exact periodic choreographies. The Chenciner-Montgomery figure eight is the most famous: three equal masses chasing each other along one curve.",
    equations: [
      "a_i = sum_{j != i} (r_j - r_i) / |r_j - r_i|^3   (G = m = 1)",
      "velocity Verlet:  v += a h/2;  x += v h;  a(x);  v += a h/2",
      "total momentum sum m v must stay 0",
    ],
    mathOutro:
      "The figure-eight initial conditions are quoted from the Chenciner-Montgomery paper to full precision, because a chaotic system forgives nothing: a wrong seventh decimal visibly degrades the loop within periods. The zero-momentum metric is the live integrity check for the integrator.",
    how: [
      "Velocity Verlet with the pairwise force loop over three bodies is the entire simulation. The Lagrange equilateral preset rotates rigidly forever when integrated exactly - watching it hold shape is a strong integrator test. The chaotic preset does what three bodies usually do.",
      "Trails are drawn as faint pairwise connecting lines; the choreography reads as a braid.",
    ],
    complexity: {
      time: "O(1): three bodies, three pairwise interactions",
      space: "Twelve numbers of state",
      note: "Same seed, same dance - but perturb one position by a tenth of a percent and the figure eight eventually dissolves.",
    },
  },
  "wave-superposition": {
    mathIntro:
      "Waves add by superposition: the displacement of the sum is the sum of the displacements, point by point. Two traveling waves y_i = A_i sin(2 pi (f_i t - f_i x / v)) sum to beats when frequencies are close, to a standing pattern when they match, and to cancellation when equal and opposite.",
    equations: [
      "y(x, t) = A1 sin(2 pi f1 (t - x/v)) + A2 sin(2 pi f2 (t - x/v))",
      "beat frequency:  |f1 - f2|",
      "envelope bounds:  |A1 - A2| <= |y| <= A1 + A2",
    ],
    mathOutro:
      "Nothing is simulated here beyond addition - which is the point. The beat envelope visible when the frequencies differ by a fraction of a hertz is not a modeled effect; it falls out of the identity sin A + sin B = 2 cos((A-B)/2) sin((A+B)/2). The metrics show the predicted beat frequency and the envelope bounds from the amplitudes.",
    how: [
      "Each frame, three curves are evaluated sample-by-sample: the two component waves in their own colors and their sum in accent, all from the same function of (x, t). The time slider advances the waves' phase; zero speed freezes the pattern for reading it.",
      "Set amplitudes equal and frequencies equal with one phase flipped conceptually by sliding... actually simply equalize frequencies to see a pure standing wave shape sliding.",
    ],
    complexity: {
      time: "O(width) evaluations per frame",
      space: "None",
      note: "Interference is arithmetic. Every interference pattern in physics is this addition wearing different constants.",
    },
  },
  "wave-equation": {
    mathIntro:
      "The wave equation couples acceleration to the Laplacian: u_tt = c^2 lap(u). Discretized with the leapfrog scheme, each cell's next displacement comes from its current displacement, its previous displacement, and its four neighbors - the same stencil as heat, applied twice in time.",
    equations: [
      "u_tt = c^2 (u_xx + u_yy) - b u_t",
      "leapfrog:  u^{n+1} = 2u^n - u^{n-1} + c^2 (sum neighbors - 4 u^n),  damped",
      "stability:  c <= 1 in these units (CFL condition)",
    ],
    mathOutro:
      "The contrast with the heat equation is the pedagogical point: same discrete Laplacian, but a second time derivative turns smoothing into propagation. Information travels outward at c cells per step instead of fading in place. Damping subtracts a fraction of the velocity term each step, so a struck drum eventually stills - and the amplitude metric measures exactly that decay.",
    how: [
      "The grid keeps two previous states; each tick applies the leapfrog update with the damping factor, a fixed number of sweeps. Pointer drags inject displacement into the previous-state buffer, which launches circular ripples. Edges are pinned at zero: reflections invert there, like a real fixed drum rim.",
      "Rendering maps the signed displacement through a token-built diverging colormap: crests toward accent, troughs toward sky.",
    ],
    complexity: {
      time: "O(cells x iterations) per tick",
      space: "Three grid buffers",
      note: "Push c to its slider maximum and the CFL stability limit is approached - instability is one slider away, by design.",
    },
  },
  dithering: {
    mathIntro:
      "Quantizing an image to k gray levels loses structure; error diffusion gives the structure back in disguise. Floyd-Steinberg quantizes each pixel and distributes the rounding error to four unprocessed neighbors (7/16, 3/16, 5/16, 1/16), so local errors cancel in the aggregate.",
    equations: [
      "quantize:  q = round(v (L-1)) / (L-1)",
      "diffuse:   err = v - q;  neighbors += err * (7, 3, 5, 1)/16",
      "invariant:  mean(dithered) ~= mean(original)",
    ],
    mathOutro:
      "The mean-luminance invariant is the theorem this page demonstrates: error diffusion is unbiased, so the average brightness survives quantization exactly to first order, and the metric verifies it to four decimals. Plain thresholding - the comparison mode - has no such mechanism: whole gray ranges vanish, and the mean visibly shifts.",
    how: [
      "The source pattern is generated procedurally; the serpentine scan (alternating direction per row) reduces directional worm artifacts of the classic kernel. The split view compares original and dithered at the same scale.",
      "Levels 2 is true 1-bit dithering; push to 5 and the diffusion has almost nothing left to do.",
    ],
    complexity: {
      time: "O(pixels), one pass",
      space: "Two pixel buffers",
      note: "Watch a flat gray region: it becomes a perfectly regular checkerboard, because uniform error diffuses into uniform structure.",
    },
  },
  "marching-squares": {
    mathIntro:
      "Marching squares turns a scalar field into an iso-contour: each grid cell is classified by a 4-bit code (which corners exceed the threshold), and a 16-case lookup returns the line segments crossing that cell. Linear interpolation positions each crossing along the edges for sub-cell smoothness.",
    equations: [
      "cell code:  bit_i = 1  when  f(corner_i) > iso",
      "edge crossing:  t = (iso - f_a) / (f_b - f_a)",
      "saddle cases (5, 10):  resolved by the cell-center average",
    ],
    mathOutro:
      "The two ambiguous cases (codes 5 and 10) are where topology is decided: the center average chooses whether opposite corners connect as one region or two - the standard resolution, and the only place the algorithm makes a judgment call. Everything else is lookup and interpolation.",
    how: [
      "Three metaballs move on seeded paths; the field is their inverse-square sum sampled on a 70x70 grid. Below-threshold cells are shaded faintly, contour segments are drawn in accent, and the segment counter lets you see the contour complexity respond to the iso slider.",
      "Drag the iso value across a blob and watch the contour tighten around it - the implicit surface's shape was always in the field; marching squares just extracts it.",
    ],
    complexity: {
      time: "O(cells) field evaluation plus O(cells) classification",
      space: "None beyond the sampled field",
      note: "The same 16-case table, run per cell, is the algorithm behind every iso-line in every medical imaging package.",
    },
  },
  "raycast-shadows": {
    mathIntro:
      "A floor cell is visible from a light exactly when the open segment between them crosses no wall cell. Marching each ray cell-by-cell with the Amanatides-Woo grid traversal (DDA) makes visibility a discrete, countable computation - no floating shadows, just rays that made it.",
    equations: [
      "DDA stepping:  advance to the next vertical or horizontal grid line, whichever is nearer in t",
      "blocked when any traversed cell is a wall before the target",
      "light range:  cells beyond the radius are culled before marching",
    ],
    mathOutro:
      "The DDA visit order is exact - it touches precisely the cells the geometric ray passes through, so wall detection has no sampling artifacts. The counters (rays cast, cells lit) turn the pretty picture into an auditable cost: the whole frame is a few thousand ray marches.",
    how: [
      "The wall layout is the seeded grid from the pathfinding experiments; the light follows the pointer, re-marching every visible cell within range on each move. Walls themselves render dark; lit floor cells glow softly.",
      "Park the light inside a corridor and the shadow boundary is razor sharp: a cell is either reached or it is not - binary visibility, by construction.",
    ],
    complexity: {
      time: "O(range^2) ray marches per frame, each O(ray length)",
      space: "One lit-flag grid",
      note: "Lower the range slider and the cost drops quadratically - watch the rays-cast counter respond.",
    },
  },
  convolution: {
    mathIntro:
      "Convolution slides a small kernel over the image, multiplying and summing at each position: out(x, y) = sum k_ij * in(x + i, y + j). It is a linear operator, and the kernel is its entire specification - blur, sharpen, and edge detection differ only in nine numbers.",
    equations: [
      "out(x, y) = sum_{i,j} k_{ij} * in(x + i - 1, y + j - 1)",
      "box blur kernel:  k_ij = 1/9",
      "edge kernel:  [[0,1,0],[1,-4,1],[0,1,0]]  (zero response on flat regions)",
    ],
    mathOutro:
      "The edge kernel's rows and columns sum to zero, so flat regions produce exactly zero and only gradients respond - that is why it 'detects' edges rather than brightening them. The blur kernel sums to one, so flat regions stay the same brightness: kernel sums are the first thing to check about any filter.",
    how: [
      "The source image is procedural (same generator as the SVD page); the convolution walks every pixel with a clamped 3x3 neighborhood and writes the response through a split view - original left, filtered right.",
      "Boundary handling is clamping (replicate edges), the simplest honest choice for a demo.",
    ],
    complexity: {
      time: "O(pixels * 9) - nine multiplies per pixel",
      space: "Two pixel buffers",
      note: "The Fourier-transform page explains WHY kernels act as frequency filters - convolution in space is multiplication in frequency.",
    },
  },
  "newton-raphson": {
    mathIntro:
      "Newton's method linearizes the function at the current guess and solves the linear problem: x_{n+1} = x_n - f(x_n)/f'(x_n). Near a simple root the error squares each step - quadratic convergence - but a horizontal tangent (f' near 0) or an unlucky start can throw the iterate across the plot.",
    equations: [
      "x_{n+1} = x_n - f(x_n) / f'(x_n)",
      "quadratic convergence:  e_{n+1} ~= C e_n^2",
      "divergence signals:  f'(x) -> 0, or iteration count blows past the cap",
    ],
    mathOutro:
      "The tangent lines are drawn from every recent iterate, so the geometric meaning - follow the tangent to the x-axis - is the animation. For x^2 - 2 the iteration reaches the square root of 2 to machine precision in about six steps from a start that is off by one; the convergence-iteration count in the metrics shows the quadratic squeeze.",
    how: [
      "Clicking the plot sets the starting x; each tick performs a fixed number of steps, recording each tangent (position, value, slope) before applying the update. Convergence is declared when |f| drops below 1e-10; divergence when the derivative vanishes or the step cap is exceeded - both honest outcomes, both displayed.",
      "For sin(x) - 0.4 there are infinitely many roots: the start point chooses which one you land in.",
    ],
    complexity: {
      time: "O(1) per iteration (one f and one f' evaluation)",
      space: "A short tangent-history buffer",
      note: "Start exactly at a maximum and f' = 0: the method is undefined - the plot shows the flat tangent that cannot proceed.",
    },
  },
  quadrature: {
    mathIntro:
      "Definite integrals can be approximated to any accuracy by summing simple shapes: left Riemann rectangles (error O(n^-1)), trapezoids (O(n^-2)), and Simpson's parabola-topped panels (O(n^-4)). The exact value is known for each test integrand, so the error is a measurement.",
    equations: [
      "left Riemann:  sum f(x_i) h",
      "trapezoid:  h (f(a)/2 + sum_{i=1}^{n-1} f(x_i) + f(b)/2)",
      "Simpson:  h/3 (f(a) + 4 sum odd + 2 sum even + f(b))",
    ],
    mathOutro:
      "The error column is the lesson: double the panels and the Riemann error quarters, the trapezoid error divides by four, the Simpson error by sixteen - the convergence orders of the three rules, measured rather than recited. For exp(-x^2) the 'exact' value is the erf-based constant quoted to 15 digits.",
    how: [
      "Panels are drawn as filled shapes under the curve (trapezoid draws quads, Simpson uses the fitted parabola value at each panel's midpoint), so the approximation is visually auditable against the curve.",
      "Simpson silently rounds odd panel counts up - the parity requirement is part of the rule.",
    ],
    complexity: {
      time: "O(n) evaluations per approximation",
      space: "None",
      note: "Simpson with n = 200 on sin over [0, pi] matches 2 to ten decimals: try to catch it being wrong.",
    },
  },
  "monte-carlo": {
    mathIntro:
      "Monte Carlo estimation turns a deterministic quantity into a sampling problem: the fraction of uniform darts inside a quarter circle estimates pi/4, with standard error falling like 1/sqrt(N). The price of generality is that slow convergence rate - four times the darts buys half the error.",
    equations: [
      "estimate:  pi_hat = 4 * (hits / N)",
      "standard error:  sigma / sqrt(N)  with sigma ~ 1.64 for this estimator",
      "running error:  |pi_hat - pi|",
    ],
    mathOutro:
      "The displayed absolute error against true pi fluctuates - sometimes getting worse for a stretch - because the convergence rate is statistical, not monotone. That honesty matters: Monte Carlo methods buy generality with variance, and the only cure is more samples.",
    how: [
      "Each tick throws a fixed number of seeded darts; the display buffer keeps the most recent ones so the point cloud stays readable while the statistics accumulate over every draw ever made. The quarter-circle arc, the square, and the in/out coloring make the estimator's geometry literal.",
      "At 400 darts per tick, a hundred ticks is 40,000 darts - error around the 1% mark, exactly as 1/sqrt(N) predicts.",
    ],
    complexity: {
      time: "O(1) per dart",
      space: "A 20,000-dart display ring buffer",
      note: "The estimate is unbiased from the very first dart - it just takes a while to become precise.",
    },
  },
  "gradient-descent": {
    mathIntro:
      "Gradient descent minimizes a loss by stepping against the gradient: theta <- theta - lr * grad L(theta). For the line fit, L(a, b) is the mean squared residual - a bowl in (a, b) space - and the path of the descent is a curve drawn on that bowl.",
    equations: [
      "L(a, b) = (1/N) sum (y_i - a x_i - b)^2",
      "dL/da = -2/N sum r_i x_i;   dL/db = -2/N sum r_i",
      "stability:  lr < 2 / (largest eigenvalue of the Hessian)",
    ],
    mathOutro:
      "The stability bound is the slider's danger zone: push the learning rate past it and the iterates oscillate outward - divergence, visibly. Below it, the path converges to the same (a, b) the normal equations compute in closed form on the Least Squares page. Same problem, two philosophies, one shared test: both must agree on the answer.",
    how: [
      "The loss surface is precomputed on a 72x48 grid in (a, b) space and rendered as banded shading; the descent path is drawn over it with markers every few epochs. Data is generated from a true line with seeded noise; the truth marker shows where the optimum lies.",
      "Each tick performs a fixed number of full-batch steps - no stochasticity, so the path is smooth and the divergence clean.",
    ],
    complexity: {
      time: "O(N) per step (one pass over the data)",
      space: "The data plus a path buffer",
      note: "The convergence test asserts the descent end state agrees with least squares within 5% - two pages, one answer.",
    },
  },
  "k-means": {
    mathIntro:
      "Lloyd's k-means alternates two monotone steps: assign each point to its nearest centroid, then set each centroid to its cluster mean. The inertia (total within-cluster squared distance) cannot increase - a guarantee this page verifies tick by tick.",
    equations: [
      "assign:  c(x) = argmin_c |x - mu_c|^2",
      "update:  mu_c = mean of points assigned to c",
      "inertia:  sum over points of |x - mu_{c(x)}|^2   (never increases)",
    ],
    mathOutro:
      "K-means optimizes exactly the inertia it reports, so the algorithm is its own proof: any increase would mean an implementation bug, and the engine guards against float-noise increases explicitly. Convergence is declared when the centroid shift drops below a thousandth of a unit - watch the shift metric hit the floor.",
    how: [
      "Seeded blob datasets give the points; centroids start from seeded distinct positions (k-means' known dependence on initialization is visible by reseeding). Each tick is one full assignment-plus-update cycle; points are colored by assignment and centroids are drawn as crosses.",
      "Set k higher than the true blob count and watch inertia drop while the clustering becomes conceptually meaningless - k is a prior, not a discovery.",
    ],
    complexity: {
      time: "O(points * k) per iteration",
      space: "The point arrays plus k centroids",
      note: "Empty clusters (a centroid nobody claims) keep their position - one of the classic practical wrinkles.",
    },
  },
  perceptron: {
    mathIntro:
      "The Rosenblatt perceptron predicts sign(w . x + b) and, on every mistake, adds y * x to the weights: w <- w + lr * y x. The perceptron convergence theorem guarantees that if the data is separable, the updates stop within 1/gamma^2 epochs, where gamma is the margin.",
    equations: [
      "prediction:  y_hat = sign(w . x + b)",
      "update on mistake:  w <- w + lr y x;  b <- b + lr y",
      "convergence:  updates <= (R / gamma)^2   for R = max |x|",
    ],
    mathOutro:
      "The theorem's guarantee is conditional - separable data - and the failure mode on overlapping data is loud: the update counter never rests and accuracy plateaus below 100%. The ringed points in the render are the current mistakes, so the guarantee's premise is visible, not assumed.",
    how: [
      "One epoch per tick over a seeded shuffle; the boundary line is the live decision surface, and each click adds a labeled point that the perceptron starts correcting immediately (convergence flag resets).",
      "The dataset is constructed separable with a noisy margin: tight enough to be interesting, loose enough to need some updates.",
    ],
    complexity: {
      time: "O(points) per epoch",
      space: "Three weights",
      note: "The perceptron is the hinge-loss SVM without a margin objective - compare the two pages on the same kind of data.",
    },
  },
  "k-nn": {
    mathIntro:
      "K-nearest neighbors classifies a query by majority vote among its k closest labeled points. There is no training: the dataset is the model, the decision boundary is implicit, and every data edit changes the boundary immediately.",
    equations: [
      "vote(x) = sign of the sum of labels among the k nearest points",
      "boundary:  the locus where the k-neighbor vote flips",
      "leave-one-out:  classify each point using the dataset without it",
    ],
    mathOutro:
      "The boundary field is computed by literally voting on a 96x48 grid - no approximation of the boundary, just the estimator evaluated everywhere. The leave-one-out accuracy in the metrics is the honest generalization estimate: each point is classified by neighbors that exclude it, which is the only fair way to score a lazy learner.",
    how: [
      "Points come from a seeded multi-blob layout whose boundary is deliberately non-linear; the k slider (odd, 1 to 15) changes the vote size, and small k produces jagged island boundaries while large k smooths them into the global structure.",
      "The tool selector adds or erases labeled points; the field recomputes on the next render because the data was the model all along.",
    ],
    complexity: {
      time: "O(points) per query; O(grid * points) per field render",
      space: "The dataset",
      note: "k = 1 memorizes (zero training error by construction); k = 15 smooths - the bias-variance trade-off as a slider.",
    },
  },
};