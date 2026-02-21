const gaConfig = require('../config/gaConfig');
const {
  computeProcessS,
  computeProcessC,
  computeBaseFatigue
} = require('./tpmModel');

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
  const { NUM_DAYS, SLOTS_PER_DAY, ALLELES, MIN_SLEEP_SLOTS_PER_DAY, SLEEP_PENALTY_PER_SLOT_SHORT } = config;
  let penalty = 0;

  for (let day = 0; day < NUM_DAYS; day++) {
    let sleepCount = 0;
    const start = day * SLOTS_PER_DAY;
    const end = start + SLOTS_PER_DAY;
    for (let i = start; i < end; i++) {
      if (chromosome[i] === ALLELES.REST) {
        sleepCount++;
      }
    }
    if (sleepCount < MIN_SLEEP_SLOTS_PER_DAY) {
      const deficit = MIN_SLEEP_SLOTS_PER_DAY - sleepCount;
      penalty += deficit * SLEEP_PENALTY_PER_SLOT_SHORT;
    }
  }

  return penalty;
}

function calculateFitness(chromosome, fixedStudyIndices = [], config = gaConfig) {
  const S_values = computeProcessS(chromosome, config);
  const C_values = computeProcessC(config);
  const baseFatigue = computeBaseFatigue(chromosome, S_values, C_values);
  const studyPenalty = computeStudyFixedPenalty(chromosome, fixedStudyIndices, config);
  const sleepPenalty = computeDailySleepPenalty(chromosome, config);
  return baseFatigue + studyPenalty + sleepPenalty;
}

function generateInitialPopulation(popSize, fixedStudyIndices = [], fixedWorkIndices = [], config = gaConfig) {
  const { TOTAL_SLOTS, ALLELES } = config;
  const population = [];

  for (let i = 0; i < popSize; i++) {
    const chromosome = new Array(TOTAL_SLOTS);

    for (let j = 0; j < TOTAL_SLOTS; j++) {
      chromosome[j] = ALLELES.REST;
    }

    for (const idx of fixedStudyIndices) {
      if (idx >= 0 && idx < TOTAL_SLOTS) {
        chromosome[idx] = ALLELES.STUDY_FIXED;
      }
    }

    for (const idx of fixedWorkIndices) {
      if (idx >= 0 && idx < TOTAL_SLOTS && !fixedStudyIndices.includes(idx)) {
        chromosome[idx] = ALLELES.WORK;
      }
    }

    for (let j = 0; j < TOTAL_SLOTS; j++) {
      if (!fixedStudyIndices.includes(j) && !fixedWorkIndices.includes(j)) {
        const choices = [ALLELES.REST, ALLELES.WORK, ALLELES.NAP];
        chromosome[j] = choices[randomInt(0, choices.length)];
      }
    }

    const fitness = calculateFitness(chromosome, fixedStudyIndices, config);
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

  return {
    chromosome: best.chromosome.slice(),
    fitness: best.fitness
  };
}

function pmxCrossover(parent1, parent2, fixedStudyIndices = [], fixedWorkIndices = [], config = gaConfig) {
  const length = parent1.length;
  const child1 = new Array(length).fill(null);
  const child2 = new Array(length).fill(null);

  const cut1 = randomInt(0, length - 1);
  const cut2 = randomInt(cut1 + 1, length);

  for (let i = cut1; i <= cut2; i++) {
    child1[i] = parent1[i];
    child2[i] = parent2[i];
  }

  const map1 = new Map();
  const map2 = new Map();
  for (let i = cut1; i <= cut2; i++) {
    map1.set(parent2[i], parent1[i]);
    map2.set(parent1[i], parent2[i]);
  }

  function fillChild(child, parent, map) {
    for (let i = 0; i < length; i++) {
      if (i >= cut1 && i <= cut2) continue;
      let gene = parent[i];
      while (map.has(gene)) {
        gene = map.get(gene);
      }
      child[i] = gene;
    }
  }

  fillChild(child1, parent2, map1);
  fillChild(child2, parent1, map2);

  for (const idx of fixedStudyIndices) {
    if (idx >= 0 && idx < length) {
      child1[idx] = gaConfig.ALLELES.STUDY_FIXED;
      child2[idx] = gaConfig.ALLELES.STUDY_FIXED;
    }
  }

  for (const idx of fixedWorkIndices) {
    if (idx >= 0 && idx < length) {
      child1[idx] = gaConfig.ALLELES.WORK;
      child2[idx] = gaConfig.ALLELES.WORK;
    }
  }

  return [child1, child2];
}

function swapMutation(chromosome, mutationRate, fixedStudyIndices = [], fixedWorkIndices = [], config = gaConfig) {
  if (Math.random() >= mutationRate) {
    return chromosome;
  }

  const length = chromosome.length;
  const fixedSet = new Set([...(fixedStudyIndices || []), ...(fixedWorkIndices || [])]);
  const validIndices = [];
  for (let i = 0; i < length; i++) {
    if (!fixedSet.has(i)) validIndices.push(i);
  }

  if (validIndices.length < 2) {
    return chromosome;
  }

  const idx1 = validIndices[randomInt(0, validIndices.length)];
  let idx2 = validIndices[randomInt(0, validIndices.length)];
  let attempts = 0;
  while (idx2 === idx1 && attempts < 10) {
    idx2 = validIndices[randomInt(0, validIndices.length)];
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
  const {
    maxGenerations = gaConfig.MAX_GENERATIONS,
    popSize = gaConfig.POP_SIZE,
    crossoverRate = gaConfig.CROSSOVER_RATE,
    mutationRate = gaConfig.MUTATION_RATE,
    fixedStudyIndices = [],
    fixedWorkIndices = []
  } = options;

  let population = generateInitialPopulation(popSize, fixedStudyIndices, fixedWorkIndices, gaConfig);

  const bestFitnessPerGeneration = [];
  let globalBest = null;

  for (let gen = 0; gen < maxGenerations; gen++) {
    population.sort((a, b) => a.fitness - b.fitness);
    const bestOfGen = population[0];
    bestFitnessPerGeneration.push(bestOfGen.fitness);

    if (!globalBest || bestOfGen.fitness < globalBest.fitness) {
      globalBest = {
        chromosome: bestOfGen.chromosome.slice(),
        fitness: bestOfGen.fitness
      };
    }

    const newPopulation = [];

    for (let i = 0; i < gaConfig.ELITE_COUNT && i < population.length; i++) {
      const elite = population[i];
      newPopulation.push({
        chromosome: elite.chromosome.slice(),
        fitness: elite.fitness
      });
    }

    while (newPopulation.length < popSize) {
      const parentA = tournamentSelection(population, gaConfig);
      const parentB = tournamentSelection(population, gaConfig);

      let childChrom1 = parentA.chromosome.slice();
      let childChrom2 = parentB.chromosome.slice();

      if (Math.random() < crossoverRate) {
        const [c1, c2] = pmxCrossover(parentA.chromosome, parentB.chromosome, fixedStudyIndices, fixedWorkIndices, gaConfig);
        childChrom1 = c1;
        childChrom2 = c2;
      }

      childChrom1 = swapMutation(childChrom1, mutationRate, fixedStudyIndices, fixedWorkIndices, gaConfig);
      childChrom2 = swapMutation(childChrom2, mutationRate, fixedStudyIndices, fixedWorkIndices, gaConfig);

      const child1 = {
        chromosome: childChrom1,
        fitness: calculateFitness(childChrom1, fixedStudyIndices, gaConfig)
      };

      newPopulation.push(child1);

      if (newPopulation.length < popSize) {
        const child2 = {
          chromosome: childChrom2,
          fitness: calculateFitness(childChrom2, fixedStudyIndices, gaConfig)
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
  runGeneticAlgorithm
};
