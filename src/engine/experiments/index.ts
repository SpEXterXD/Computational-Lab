import { BarnesHutExperiment } from "./barnes-hut";
import { BfsDfsExperiment } from "./bfs-dfs";
import { DitheringExperiment } from "./dithering";
import { EigenvectorsExperiment } from "./eigenvectors";
import { FourierSeriesExperiment } from "./fourier-series";
import { FourierTransformExperiment } from "./fourier-transform";
import { GeneticAlgorithmExperiment } from "./genetic-algorithm";
import { GradientDescentExperiment } from "./gradient-descent";
import { JuliaSetExperiment } from "./julia-set";
import { KMeansExperiment } from "./k-means";
import { KnnExperiment } from "./k-nn";
import { KeplerOrbitsExperiment } from "./kepler-orbits";
import { LeastSquaresExperiment } from "./least-squares";
import { MarchingSquaresExperiment } from "./marching-squares";
import { MatrixTransformationsExperiment } from "./matrix-transformations";
import { MonteCarloExperiment } from "./monte-carlo";
import { NewtonRaphsonExperiment } from "./newton-raphson";
import { PerceptronExperiment } from "./perceptron";
import { ProbabilityDistributionsExperiment } from "./probability-distributions";
import { ProjectileExperiment } from "./projectile-motion";
import { QuadratureExperiment } from "./quadrature";
import { RaycastShadowsExperiment } from "./raycast-shadows";
import { RrtExperiment } from "./rrt-rrt-star";
import { SimulatedAnnealingExperiment } from "./simulated-annealing";
import { SpringChainExperiment } from "./springs";
import { ThreeBodyExperiment } from "./three-body";
import { VectorFieldExperiment } from "./vector-field";
import { WaveEquationExperiment } from "./wave-equation";
import { WaveSuperpositionExperiment } from "./wave-superposition";
import { ConvolutionExperiment } from "./convolution";
import type { Experiment } from "../core/types";
import { SvmExperiment } from "./svm";
import { AdaptiveRk45Experiment } from "./adaptive-rk45";
import { AStarExperiment } from "./a-star";
import { BoidsExperiment } from "./boids";
import { CentralLimitExperiment } from "./central-limit";
import { ConjugateGradientExperiment } from "./conjugate-gradient";
import { DoublePendulumExperiment } from "./double-pendulum";
import { ElasticCollisionsExperiment } from "./elastic-collisions";
import { ElectrostaticPotentialExperiment } from "./electrostatic-potential";
import { GameOfLifeExperiment } from "./game-of-life";
import { HeatDiffusionExperiment } from "./heat-diffusion";
import { IntegratorComparisonExperiment } from "./rk4-vs-euler";
import { LangtonAntExperiment } from "./langton-ant";
import { MandelbrotExperiment } from "./mandelbrot";
import { NaiveBayesExperiment } from "./naive-bayes";
import { NBodyExperiment } from "./nbody";
import { ReactionDiffusionExperiment } from "./reaction-diffusion";
import { SortingExperiment } from "./sorting";
import { SvdCompressionExperiment } from "./svd-compression";
import { TaylorSeriesExperiment } from "./taylor-series";

const REGISTRY: Record<string, () => Experiment> = {
  "a-star": () => new AStarExperiment(),
  "adaptive-rk45": () => new AdaptiveRk45Experiment(),
  boids: () => new BoidsExperiment(),
  "central-limit-theorem": () => new CentralLimitExperiment(),
  "conjugate-gradient": () => new ConjugateGradientExperiment(),
  "double-pendulum": () => new DoublePendulumExperiment(),
  "elastic-collisions": () => new ElasticCollisionsExperiment(),
  "electrostatic-potential": () => new ElectrostaticPotentialExperiment(),
  "game-of-life": () => new GameOfLifeExperiment(),
  "heat-diffusion": () => new HeatDiffusionExperiment(),
  "langton-ant": () => new LangtonAntExperiment(),
  "least-squares": () => new LeastSquaresExperiment(),
  mandelbrot: () => new MandelbrotExperiment(),
  "naive-bayes": () => new NaiveBayesExperiment(),
  "n-body": () => new NBodyExperiment(),
  "reaction-diffusion": () => new ReactionDiffusionExperiment(),
  "rk4-vs-euler": () => new IntegratorComparisonExperiment(),
  "barnes-hut": () => new BarnesHutExperiment(),
  "bfs-dfs": () => new BfsDfsExperiment(),
  "convolution": () => new ConvolutionExperiment(),
  "dithering": () => new DitheringExperiment(),
  "eigen-basis": () => new EigenvectorsExperiment(),
  "fourier-series": () => new FourierSeriesExperiment(),
  "fourier-transform": () => new FourierTransformExperiment(),
  "genetic-algorithm": () => new GeneticAlgorithmExperiment(),
  "gradient-descent": () => new GradientDescentExperiment(),
  "julia-set": () => new JuliaSetExperiment(),
  "k-means": () => new KMeansExperiment(),
  "k-nn": () => new KnnExperiment(),
  "kepler-orbits": () => new KeplerOrbitsExperiment(),
  "marching-squares": () => new MarchingSquaresExperiment(),
  "matrix-transformations": () => new MatrixTransformationsExperiment(),
  "monte-carlo": () => new MonteCarloExperiment(),
  "newton-raphson": () => new NewtonRaphsonExperiment(),
  "perceptron": () => new PerceptronExperiment(),
  "probability-distributions": () => new ProbabilityDistributionsExperiment(),
  "projectile-motion": () => new ProjectileExperiment(),
  "quadrature": () => new QuadratureExperiment(),
  "raycast-shadows": () => new RaycastShadowsExperiment(),
  "rrt-rrt-star": () => new RrtExperiment(),
  "simulated-annealing": () => new SimulatedAnnealingExperiment(),
  "springs": () => new SpringChainExperiment(),
  "three-body": () => new ThreeBodyExperiment(),
  "vector-field": () => new VectorFieldExperiment(),
  "wave-equation": () => new WaveEquationExperiment(),
  "wave-superposition": () => new WaveSuperpositionExperiment(),
  sorting: () => new SortingExperiment(),
  "support-vector-machine": () => new SvmExperiment(),
  "svd-compression": () => new SvdCompressionExperiment(),
  "taylor-series": () => new TaylorSeriesExperiment(),
};

export function createExperiment(id: string): Experiment {
  const factory = REGISTRY[id];
  if (!factory) throw new Error(`No experiment registered under "${id}"`);
  return factory();
}

/** Engine source files, for the honest implementation sections on detail pages. */
export const EXPERIMENT_SOURCE: Record<string, string> = {
  "a-star": "src/engine/experiments/a-star.ts",
  "adaptive-rk45": "src/engine/experiments/adaptive-rk45.ts",
  boids: "src/engine/experiments/boids.ts",
  "central-limit-theorem": "src/engine/experiments/central-limit.ts",
  "conjugate-gradient": "src/engine/experiments/conjugate-gradient.ts",
  "double-pendulum": "src/engine/experiments/double-pendulum.ts",
  "elastic-collisions": "src/engine/experiments/elastic-collisions.ts",
  "electrostatic-potential": "src/engine/experiments/electrostatic-potential.ts",
  "game-of-life": "src/engine/experiments/game-of-life.ts",
  "heat-diffusion": "src/engine/experiments/heat-diffusion.ts",
  "langton-ant": "src/engine/experiments/langton-ant.ts",
  "least-squares": "src/engine/experiments/least-squares.ts",
  mandelbrot: "src/engine/experiments/mandelbrot.ts",
  "naive-bayes": "src/engine/experiments/naive-bayes.ts",
  "n-body": "src/engine/experiments/nbody.ts",
  "reaction-diffusion": "src/engine/experiments/reaction-diffusion.ts",
  "rk4-vs-euler": "src/engine/experiments/rk4-vs-euler.ts",
  "barnes-hut": "src/engine/experiments/barnes-hut.ts",
  "bfs-dfs": "src/engine/experiments/bfs-dfs.ts",
  "convolution": "src/engine/experiments/convolution.ts",
  "dithering": "src/engine/experiments/dithering.ts",
  "eigen-basis": "src/engine/experiments/eigenvectors.ts",
  "fourier-series": "src/engine/experiments/fourier-series.ts",
  "fourier-transform": "src/engine/experiments/fourier-transform.ts",
  "genetic-algorithm": "src/engine/experiments/genetic-algorithm.ts",
  "gradient-descent": "src/engine/experiments/gradient-descent.ts",
  "julia-set": "src/engine/experiments/julia-set.ts",
  "k-means": "src/engine/experiments/k-means.ts",
  "k-nn": "src/engine/experiments/k-nn.ts",
  "kepler-orbits": "src/engine/experiments/kepler-orbits.ts",
  "marching-squares": "src/engine/experiments/marching-squares.ts",
  "matrix-transformations": "src/engine/experiments/matrix-transformations.ts",
  "monte-carlo": "src/engine/experiments/monte-carlo.ts",
  "newton-raphson": "src/engine/experiments/newton-raphson.ts",
  "perceptron": "src/engine/experiments/perceptron.ts",
  "probability-distributions": "src/engine/experiments/probability-distributions.ts",
  "projectile-motion": "src/engine/experiments/projectile-motion.ts",
  "quadrature": "src/engine/experiments/quadrature.ts",
  "raycast-shadows": "src/engine/experiments/raycast-shadows.ts",
  "rrt-rrt-star": "src/engine/experiments/rrt-rrt-star.ts",
  "simulated-annealing": "src/engine/experiments/simulated-annealing.ts",
  "springs": "src/engine/experiments/springs.ts",
  "three-body": "src/engine/experiments/three-body.ts",
  "vector-field": "src/engine/experiments/vector-field.ts",
  "wave-equation": "src/engine/experiments/wave-equation.ts",
  "wave-superposition": "src/engine/experiments/wave-superposition.ts",
  sorting: "src/engine/experiments/sorting.ts",
  "support-vector-machine": "src/engine/experiments/svm.ts",
  "svd-compression": "src/engine/experiments/svd-compression.ts",
  "taylor-series": "src/engine/experiments/taylor-series.ts",
};
