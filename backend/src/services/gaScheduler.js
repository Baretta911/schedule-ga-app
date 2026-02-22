const gaConfig = require('../config/gaConfig');
const {
  computeProcessC,
  computeTotalFatigue
} = require('./tpmModel');

const INTEGER_CONFIG_KEYS = new Set([
  'NUM_DAYS',
  'SLOTS_PER_DAY',
  'POP_SIZE',
  'TOURNAMENT_SIZE',
  'ELITE_COUNT',
  'MAX_GENERATIONS',
  'STUDY_PENALTY_PER_VIOLATION',
  'SLEEP_PENALTY_PER_SLOT_SHORT',
  'MIN_SLEEP_SLOTS_PER_DAY',
  'NAP_INERTIA_MIN',
  'NAP_INERTIA_MAX',
  'NAP_TO_SLEEP_MIN',
  'NAP_INERTIA_PENALTY_PER_SLOT'
]);

const FLOAT_CONFIG_KEYS = new Set([
  'CROSSOVER_RATE',
  'MUTATION_RATE',
  'TAU_R',
  'TAU_D',
  'DT_HOURS',
  'S_MAX',
  'S_INITIAL',
  'C_AMPLITUDE',
  'C_PHASE',
  'LEISURE_SLEEP_FACTOR'
]);

const ALLOWED_OVERRIDE_KEYS = new Set([...INTEGER_CONFIG_KEYS, ...FLOAT_CONFIG_KEYS]);

function buildRuntimeConfig(overrides = {}) {
  const normalizedOverrides = {};
  if (overrides && typeof overrides === 'object') {
    for (const key of Object.keys(overrides)) {
      if (!ALLOWED_OVERRIDE_KEYS.has(key)) continue;
      const parsed = Number(overrides[key]);
      if (!Number.isFinite(parsed)) continue;

      if (INTEGER_CONFIG_KEYS.has(key)) {
        normalizedOverrides[key] = Math.max(1, Math.trunc(parsed));
      } else {
        normalizedOverrides[key] = parsed;
      }
    }
  }

  const config = {
    ...gaConfig,
    ...normalizedOverrides,
    ALLELES: {
      ...gaConfig.ALLELES
    }
  };

  Object.defineProperty(config, 'TOTAL_SLOTS', {
    get() {
      return this.NUM_DAYS * this.SLOTS_PER_DAY;
    },
    enumerable: true,
    configurable: true
  });

  return config;
}

function normalizeFixedIndices(fixedStudyIndices = [], fixedWorkIndices = [], totalSlots = gaConfig.TOTAL_SLOTS) {
  const studySet = new Set();
  const workSet = new Set();

  for (const idx of fixedStudyIndices || []) {
    const parsed = Math.trunc(Number(idx));
    if (!Number.isFinite(parsed)) continue;
    if (parsed < 0 || parsed >= totalSlots) continue;
    studySet.add(parsed);
  }

  for (const idx of fixedWorkIndices || []) {
    const parsed = Math.trunc(Number(idx));
    if (!Number.isFinite(parsed)) continue;
    if (parsed < 0 || parsed >= totalSlots) continue;
    if (studySet.has(parsed)) continue;
    workSet.add(parsed);
  }

  return {
    fixedStudyIndices: Array.from(studySet).sort((a, b) => a - b),
    fixedWorkIndices: Array.from(workSet).sort((a, b) => a - b)
  };
}

function indexToDaySlot(index, config = gaConfig) {
  const day = Math.floor(index / config.SLOTS_PER_DAY);
  const slotInDay = index % config.SLOTS_PER_DAY;
  return { day, slotInDay };
}

function randomInt(min, maxExclusive) {
  return Math.floor(Math.random() * (maxExclusive - min)) + min;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function buildEvaluationContext(fixedStudyIndices = [], config = gaConfig, precomputedCValues = null) {
  const C_values = precomputedCValues || computeProcessC(config);
  const fixedStudySet = new Set(fixedStudyIndices || []);
  const expWake = Math.exp(-config.DT_HOURS / config.TAU_R);
  const expSleep = Math.exp(-config.DT_HOURS / config.TAU_D);

  return {
    C_values,
    fixedStudySet,
    expWake,
    expSleep
  };
}

function computeStudyFixedPenalty(chromosome, fixedStudyIndices, config = gaConfig) {
  const { ALLELES, STUDY_PENALTY_PER_VIOLATION } = config;
  let penalty = 0;
  for (const idx of fixedStudyIndices || []) {
    if (chromosome[idx] !== ALLELES.STUDY_FIXED) {
      penalty += STUDY_PENALTY_PER_VIOLATION;
    }
  }
  return penalty;
}

function computeDailySleepPenalty(chromosome, config = gaConfig) {
  const { sleepCountsByDay } = analyzeNapAndSleep(chromosome, config);
  const { MIN_SLEEP_SLOTS_PER_DAY, SLEEP_PENALTY_PER_SLOT_SHORT } = config;
  let penalty = 0;
  for (const count of sleepCountsByDay) {
    if (count < MIN_SLEEP_SLOTS_PER_DAY) {
      penalty += (MIN_SLEEP_SLOTS_PER_DAY - count) * SLEEP_PENALTY_PER_SLOT_SHORT;
    }
  }
  return penalty;
}

function analyzeNapAndSleep(chromosome, config = gaConfig) {
  const {
    NUM_DAYS,
    SLOTS_PER_DAY,
    ALLELES,
    NAP_INERTIA_MIN,
    NAP_INERTIA_MAX,
    NAP_TO_SLEEP_MIN,
    NAP_INERTIA_PENALTY_PER_SLOT
  } = config;

  const sleepCountsByDay = new Array(NUM_DAYS).fill(0);
  let napPenalty = 0;

  for (let day = 0; day < NUM_DAYS; day++) {
    const start = day * SLOTS_PER_DAY;
    const end = start + SLOTS_PER_DAY;
    let i = start;
    while (i < end && i < chromosome.length) {
      const state = chromosome[i];
      if (state === ALLELES.SLEEP) {
        sleepCountsByDay[day] += 1;
        i += 1;
        continue;
      }
      if (state === ALLELES.NAP) {
        const runStart = i;
        while (i < end && i < chromosome.length && chromosome[i] === ALLELES.NAP) {
          i += 1;
        }
        const runLength = i - runStart;
        if (runLength >= NAP_TO_SLEEP_MIN) {
          sleepCountsByDay[day] += runLength;
        } else if (runLength >= NAP_INERTIA_MIN && runLength <= NAP_INERTIA_MAX) {
          napPenalty += runLength * NAP_INERTIA_PENALTY_PER_SLOT;
        }
        continue;
      }
      i += 1;
    }
  }

  return { sleepCountsByDay, napPenalty };
}

function calculateFitness(chromosome, fixedStudyIndices = [], config = gaConfig, precomputedCValues = null, evaluationContext = null) {
  const {
    ALLELES,
    TOTAL_SLOTS,
    NUM_DAYS,
    SLOTS_PER_DAY,
    STUDY_PENALTY_PER_VIOLATION,
    MIN_SLEEP_SLOTS_PER_DAY,
    SLEEP_PENALTY_PER_SLOT_SHORT,
    LEISURE_SLEEP_FACTOR,
    S_MAX,
    S_INITIAL
  } = config;

  const context = evaluationContext || buildEvaluationContext(fixedStudyIndices, config, precomputedCValues);
  const C_values = context.C_values;
  const fixedStudySet = context.fixedStudySet;
  const expWake = context.expWake;
  const expSleep = context.expSleep;
  const expLeisure = 1 - (LEISURE_SLEEP_FACTOR * (1 - expSleep));

  let S_current = S_INITIAL;
  let baseFatigue = 0;
  let studyPenalty = 0;
  const { sleepCountsByDay, napPenalty } = analyzeNapAndSleep(chromosome, config);

  for (let t = 0; t < TOTAL_SLOTS; t++) {
    const state = chromosome[t];
    if (state === ALLELES.WORK || state === ALLELES.STUDY_FIXED) {
      S_current = S_current + (S_MAX - S_current) * (1 - expWake);
    } else if (state === ALLELES.LEISURE) {
      S_current = S_current * expLeisure;
    } else {
      S_current = S_current * expSleep;
    }

    if (S_current < 0) S_current = 0;
    if (S_current > S_MAX) S_current = S_MAX;

    baseFatigue += S_current - C_values[t];

    if (fixedStudySet.has(t) && state !== ALLELES.STUDY_FIXED) {
      studyPenalty += STUDY_PENALTY_PER_VIOLATION;
    }

  }

  let sleepPenalty = 0;
  for (let day = 0; day < NUM_DAYS; day++) {
    if (sleepCountsByDay[day] < MIN_SLEEP_SLOTS_PER_DAY) {
      sleepPenalty += (MIN_SLEEP_SLOTS_PER_DAY - sleepCountsByDay[day]) * SLEEP_PENALTY_PER_SLOT_SHORT;
    }
  }

  return baseFatigue + studyPenalty + sleepPenalty + napPenalty;
}

function generateInitialPopulation(popSize, fixedStudyIndices = [], fixedWorkIndices = [], config = gaConfig, precomputedCValues = null) {
  const { TOTAL_SLOTS, ALLELES } = config;
  const population = [];
  const fixedStudySet = new Set(fixedStudyIndices);
  const fixedWorkSet = new Set(fixedWorkIndices);

  const randomChoices = [ALLELES.LEISURE, ALLELES.WORK, ALLELES.NAP, ALLELES.SLEEP];
  const evaluationContext = buildEvaluationContext(fixedStudyIndices, config, precomputedCValues);

  for (let i = 0; i < popSize; i++) {
    const chromosome = new Array(TOTAL_SLOTS);

    for (let j = 0; j < TOTAL_SLOTS; j++) {
      chromosome[j] = ALLELES.LEISURE;
    }

    for (const idx of fixedStudyIndices) {
      if (idx >= 0 && idx < TOTAL_SLOTS) {
        chromosome[idx] = ALLELES.STUDY_FIXED;
      }
    }

    for (const idx of fixedWorkIndices) {
      if (idx >= 0 && idx < TOTAL_SLOTS && !fixedStudySet.has(idx)) {
        chromosome[idx] = ALLELES.WORK;
      }
    }

    for (let j = 0; j < TOTAL_SLOTS; j++) {
      if (!fixedStudySet.has(j) && !fixedWorkSet.has(j)) {
        chromosome[j] = randomChoices[randomInt(0, randomChoices.length)];
      }
    }

    const fitness = calculateFitness(chromosome, fixedStudyIndices, config, precomputedCValues, evaluationContext);
    population.push({ chromosome, fitness });
  }

  return population;
}

function tournamentSelection(population, config = gaConfig) {
  const { TOURNAMENT_SIZE } = config;
  let best = null;

  const used = new Set();
  while (used.size < TOURNAMENT_SIZE) {
    const idx = randomInt(0, population.length);
    if (used.has(idx)) continue;
    used.add(idx);
    const candidate = population[idx];
    if (!best || candidate.fitness < best.fitness) {
      best = candidate;
    }
  }

  return best;
}

function pmxCrossover(parent1, parent2, fixedStudyIndices = [], fixedWorkIndices = [], config = gaConfig) {
  const length = parent1.length;
  const child1 = new Array(length);
  const child2 = new Array(length);

  const cut1 = randomInt(0, length - 1);
  const cut2 = randomInt(cut1 + 1, length);

  for (let i = 0; i < length; i++) {
    if (i >= cut1 && i <= cut2) {
      child1[i] = parent2[i];
      child2[i] = parent1[i];
    } else {
      child1[i] = parent1[i];
      child2[i] = parent2[i];
    }
  }

  const fixedStudySet = new Set(fixedStudyIndices);
  for (const idx of fixedStudyIndices) {
    if (idx >= 0 && idx < length) {
      child1[idx] = config.ALLELES.STUDY_FIXED;
      child2[idx] = config.ALLELES.STUDY_FIXED;
    }
  }

  for (const idx of fixedWorkIndices) {
    if (idx >= 0 && idx < length && !fixedStudySet.has(idx)) {
      child1[idx] = config.ALLELES.WORK;
      child2[idx] = config.ALLELES.WORK;
    }
  }

  return [child1, child2];
}

function buildMutableIndices(totalSlots, fixedStudyIndices = [], fixedWorkIndices = []) {
  const fixedSet = new Set([...(fixedStudyIndices || []), ...(fixedWorkIndices || [])]);
  const mutableIndices = [];
  for (let i = 0; i < totalSlots; i++) {
    if (!fixedSet.has(i)) mutableIndices.push(i);
  }
  return mutableIndices;
}

function swapMutation(chromosome, mutationRate, mutableIndices = []) {
  if (Math.random() >= mutationRate) {
    return chromosome;
  }

  if (mutableIndices.length < 2) {
    return chromosome;
  }

  const idx1 = mutableIndices[randomInt(0, mutableIndices.length)];
  let idx2 = mutableIndices[randomInt(0, mutableIndices.length)];
  let attempts = 0;
  while (idx2 === idx1 && attempts < 10) {
    idx2 = mutableIndices[randomInt(0, mutableIndices.length)];
    attempts++;
  }

  if (idx1 !== idx2) {
    const copy = chromosome.slice();
    const tmp = copy[idx1];
    copy[idx1] = copy[idx2];
    copy[idx2] = tmp;
    return copy;
  }

  return chromosome;
}

function runGeneticAlgorithm(options = {}) {
  const runtimeConfig = buildRuntimeConfig(options.gaConfigOverrides);
  const maxGenerations = Number.isFinite(Number(options.maxGenerations))
    ? Math.max(1, Math.trunc(Number(options.maxGenerations)))
    : runtimeConfig.MAX_GENERATIONS;
  const popSize = Number.isFinite(Number(options.popSize))
    ? Math.max(2, Math.trunc(Number(options.popSize)))
    : runtimeConfig.POP_SIZE;
  const crossoverRate = Number.isFinite(Number(options.crossoverRate))
    ? Math.max(0, Math.min(1, Number(options.crossoverRate)))
    : runtimeConfig.CROSSOVER_RATE;
  const mutationRate = Number.isFinite(Number(options.mutationRate))
    ? Math.max(0, Math.min(1, Number(options.mutationRate)))
    : runtimeConfig.MUTATION_RATE;
  const earlyStopPatience = Number.isFinite(Number(options.earlyStopPatience))
    ? Math.max(0, Math.trunc(Number(options.earlyStopPatience)))
    : 40;
  const {
    fixedStudyIndices,
    fixedWorkIndices
  } = normalizeFixedIndices(options.fixedStudyIndices, options.fixedWorkIndices, runtimeConfig.TOTAL_SLOTS);
  const precomputedCValues = computeProcessC(runtimeConfig);
  const evaluationContext = buildEvaluationContext(fixedStudyIndices, runtimeConfig, precomputedCValues);
  const mutableIndices = buildMutableIndices(runtimeConfig.TOTAL_SLOTS, fixedStudyIndices, fixedWorkIndices);

  let population = generateInitialPopulation(popSize, fixedStudyIndices, fixedWorkIndices, runtimeConfig, precomputedCValues);

  const bestFitnessPerGeneration = [];
  let globalBest = null;
  let staleGenerations = 0;

  for (let gen = 0; gen < maxGenerations; gen++) {
    population.sort((a, b) => a.fitness - b.fitness);
    const bestOfGen = population[0];
    bestFitnessPerGeneration.push(bestOfGen.fitness);

    if (!globalBest || bestOfGen.fitness < globalBest.fitness) {
      globalBest = {
        chromosome: bestOfGen.chromosome.slice(),
        fitness: bestOfGen.fitness
      };
      staleGenerations = 0;
    } else {
      staleGenerations += 1;
      if (earlyStopPatience > 0 && staleGenerations >= earlyStopPatience) {
        break;
      }
    }

    const newPopulation = [];

    for (let i = 0; i < runtimeConfig.ELITE_COUNT && i < population.length; i++) {
      const elite = population[i];
      newPopulation.push({
        chromosome: elite.chromosome.slice(),
        fitness: elite.fitness
      });
    }

    while (newPopulation.length < popSize) {
      const parentA = tournamentSelection(population, runtimeConfig);
      const parentB = tournamentSelection(population, runtimeConfig);

      let childChrom1 = parentA.chromosome.slice();
      let childChrom2 = parentB.chromosome.slice();

      if (Math.random() < crossoverRate) {
        const [c1, c2] = pmxCrossover(parentA.chromosome, parentB.chromosome, fixedStudyIndices, fixedWorkIndices, runtimeConfig);
        childChrom1 = c1;
        childChrom2 = c2;
      }

      childChrom1 = swapMutation(childChrom1, mutationRate, mutableIndices);
      childChrom2 = swapMutation(childChrom2, mutationRate, mutableIndices);

      const child1 = {
        chromosome: childChrom1,
        fitness: calculateFitness(childChrom1, fixedStudyIndices, runtimeConfig, precomputedCValues, evaluationContext)
      };

      newPopulation.push(child1);

      if (newPopulation.length < popSize) {
        const child2 = {
          chromosome: childChrom2,
          fitness: calculateFitness(childChrom2, fixedStudyIndices, runtimeConfig, precomputedCValues, evaluationContext)
        };
        newPopulation.push(child2);
      }
    }

    population = newPopulation;
  }

  return {
    bestIndividual: globalBest,
    stats: {
      bestFitnessPerGeneration
    }
  };
}

module.exports = {
  indexToDaySlot,
  computeStudyFixedPenalty,
  computeDailySleepPenalty,
  calculateFitness,
  generateInitialPopulation,
  tournamentSelection,
  pmxCrossover,
  swapMutation,
  buildMutableIndices,
  runGeneticAlgorithm
};
