const express = require('express');
const router = express.Router();
const { runGeneticAlgorithm } = require('../services/gaScheduler');

router.post('/run', (req, res) => {
  try {
    const {
      maxGenerations,
      populationSize,
      crossoverRate,
      mutationRate,
      fixedStudyIndices,
      fixedWorkIndices,
      gaConfigOverrides
    } = req.body || {};

    const options = {
      maxGenerations,
      popSize: populationSize,
      crossoverRate,
      mutationRate,
      fixedStudyIndices,
      fixedWorkIndices,
      gaConfigOverrides
    };

    const result = runGeneticAlgorithm(options);
    res.json(result);
  } catch (err) {
    console.error('Error running GA:', err);
    res.status(500).json({ error: 'Failed to run GA', details: err.message });
  }
});

module.exports = router;
