const gaConfig = require('../config/gaConfig');

let cachedCValues = null;

function computeProcessS(chromosome, config = gaConfig) {
  const { ALLELES, DT_HOURS, TAU_R, TAU_D, S_MAX, S_INITIAL, TOTAL_SLOTS } = config;
  const S_values = new Array(TOTAL_SLOTS);
  let S_current = S_INITIAL;

  const expWake = Math.exp(-DT_HOURS / TAU_R);
  const expSleep = Math.exp(-DT_HOURS / TAU_D);

  for (let t = 0; t < TOTAL_SLOTS; t++) {
    const state = chromosome[t];
    if (state === ALLELES.WORK || state === ALLELES.STUDY_FIXED) {
      S_current = S_current + (S_MAX - S_current) * (1 - expWake);
    } else {
      S_current = S_current * expSleep;
    }
    if (S_current < 0) S_current = 0;
    if (S_current > S_MAX) S_current = S_MAX;
    S_values[t] = S_current;
  }

  return S_values;
}

function computeProcessC(config = gaConfig) {
  if (cachedCValues && cachedCValues.length === config.TOTAL_SLOTS) {
    return cachedCValues;
  }

  const { TOTAL_SLOTS, SLOTS_PER_DAY, C_AMPLITUDE, C_PHASE } = config;
  const C_values = new Array(TOTAL_SLOTS);

  for (let t = 0; t < TOTAL_SLOTS; t++) {
    const phase = (2 * Math.PI * (t / SLOTS_PER_DAY)) + C_PHASE;
    C_values[t] = C_AMPLITUDE * Math.sin(phase);
  }

  cachedCValues = C_values;
  return C_values;
}

function computeBaseFatigue(chromosome, S_values, C_values) {
  let total = 0;
  const n = S_values.length;
  for (let t = 0; t < n; t++) {
    total += S_values[t] - C_values[t];
  }
  return total;
}

module.exports = {
  computeProcessS,
  computeProcessC,
  computeBaseFatigue
};
