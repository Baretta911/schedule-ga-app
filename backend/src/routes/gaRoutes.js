const express = require('express');
const router = express.Router();
const { runGeneticAlgorithm } = require('../services/gaScheduler');
const gaConfig = require('../config/gaConfig');

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeInteger(value, fallback, min, max) {
  const parsed = Math.trunc(toNumber(value, fallback));
  return clamp(parsed, min, max);
}

function normalizeRate(value, fallback) {
  return clamp(toNumber(value, fallback), 0, 1);
}

function normalizeIndexArray(value, totalSlots) {
  if (!Array.isArray(value)) return [];

  const unique = new Set();
  for (const item of value) {
    const parsed = Math.trunc(Number(item));
    if (!Number.isFinite(parsed)) continue;
    if (parsed < 0 || parsed >= totalSlots) continue;
    unique.add(parsed);
  }

  return Array.from(unique).sort((a, b) => a - b);
}

router.get('/meta', (_req, res) => {
  res.json({
    schedule: {
      numDays: gaConfig.NUM_DAYS,
      slotsPerDay: gaConfig.SLOTS_PER_DAY,
      totalSlots: gaConfig.TOTAL_SLOTS
    },
    defaults: {
      maxGenerations: gaConfig.MAX_GENERATIONS,
      populationSize: gaConfig.POP_SIZE,
      crossoverRate: gaConfig.CROSSOVER_RATE,
      mutationRate: gaConfig.MUTATION_RATE
    }
  });
});

router.post('/run', (req, res) => {
  try {
    const {
      maxGenerations,
      populationSize,
      crossoverRate,
      mutationRate,
      earlyStopPatience,
      fixedStudyIndices,
      fixedWorkIndices,
      gaConfigOverrides
    } = req.body || {};

    const totalSlots = gaConfig.TOTAL_SLOTS;

    const normalizedFixedStudyIndices = normalizeIndexArray(fixedStudyIndices, totalSlots);
    const normalizedFixedWorkIndices = normalizeIndexArray(fixedWorkIndices, totalSlots);

    const options = {
      maxGenerations: normalizeInteger(maxGenerations, gaConfig.MAX_GENERATIONS, 1, 10000),
      popSize: normalizeInteger(populationSize, gaConfig.POP_SIZE, 2, 10000),
      crossoverRate: normalizeRate(crossoverRate, gaConfig.CROSSOVER_RATE),
      mutationRate: normalizeRate(mutationRate, gaConfig.MUTATION_RATE),
      earlyStopPatience: normalizeInteger(earlyStopPatience, 40, 0, 10000),
      fixedStudyIndices: normalizedFixedStudyIndices,
      fixedWorkIndices: normalizedFixedWorkIndices,
      gaConfigOverrides: gaConfigOverrides && typeof gaConfigOverrides === 'object' ? gaConfigOverrides : undefined
    };

    const result = runGeneticAlgorithm(options);
    res.json(result);
  } catch (err) {
    console.error('Error running GA:', err);
    res.status(500).json({ error: 'Failed to run GA', details: err.message });
  }
});

module.exports = router;
