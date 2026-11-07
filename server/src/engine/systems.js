/**
 * The five fuzzy inference systems of the hierarchical model.
 *
 *   dsa, core            ──► TS  (Technical Strength)      ┐
 *   aptitude, comm       ──► NS  (Non-technical Strength)  ├─► SS (Skill State) ─┐
 *   practical            ───────────────────────────────── ┘                     ├─► R (Readiness)
 *   momentum, consistency, balance ──► TQ (Trajectory Quality) ───────────────────┘
 *
 * Rule bases are generated from a small number of explicit, auditable
 * parameters (level weights, thresholds and "gate" caps) rather than typed
 * out by hand, so the 9 + 9 + 27 + 27 + 9 rules stay consistent and can be
 * re-calibrated against faculty data without touching code.
 */
import { FuzzyVariable, MamdaniSystem, trapmf, trimf } from './fuzzy.js';

/** Partition of unity on [0,100]: low + medium + high = 1 everywhere. */
export const LEVELS = {
  low: trapmf(0, 0, 15, 50),
  medium: trimf(15, 50, 85),
  high: trapmf(50, 85, 100, 100),
};
export const LEVEL_LABELS = ['low', 'medium', 'high'];

export const MOMENTUM_SETS = {
  declining: trapmf(-10, -10, -1.5, 0),
  flat: trimf(-1.5, 0, 1.5),
  rising: trapmf(0, 1.5, 10, 10),
};
export const MOMENTUM_LABELS = ['declining', 'flat', 'rising'];

const OUT5 = {
  very_low: trimf(0, 0, 25),
  low: trimf(0, 25, 50),
  medium: trimf(25, 50, 75),
  high: trimf(50, 75, 100),
  very_high: trimf(75, 100, 100),
};
const OUT5_LABELS = ['very_low', 'low', 'medium', 'high', 'very_high'];

const OUT3 = {
  poor: trimf(0, 0, 50),
  fair: trimf(0, 50, 100),
  good: trimf(50, 100, 100),
};
const OUT3_LABELS = ['poor', 'fair', 'good'];

// Centroid of the extreme triangles is 8.33 / 91.67, so the final score is
// linearly re-stretched to the full 0..100 range.
const CENTROID_MIN = 100 / 12;
const CENTROID_MAX = 100 - 100 / 12;
export const rescale = (x) => Math.min(100, Math.max(0, ((x - CENTROID_MIN) / (CENTROID_MAX - CENTROID_MIN)) * 100));

/**
 * Generate a complete rule base (all label combinations).
 * value = Σ weight_i · levelIndex_i ; output label = #thresholds ≤ value.
 * `caps` act as gates: when an input has a given label the output index is capped.
 */
function buildRules({ inputs, weights, thresholds, outLabels, caps = [] }) {
  const rules = [];
  const idxCombos = inputs.reduce(
    (acc, inp) => acc.flatMap((c) => inp.labels.map((_, i) => [...c, i])),
    [[]],
  );
  for (const combo of idxCombos) {
    const value = combo.reduce((s, idx, k) => s + weights[k] * idx, 0);
    let out = thresholds.filter((t) => value >= t - 1e-9).length;
    for (const cap of caps) {
      const k = inputs.findIndex((i) => i.name === cap.input);
      if (inputs[k].labels[combo[k]] === cap.label) out = Math.min(out, outLabels.indexOf(cap.max));
    }
    rules.push({
      if: combo.map((idx, k) => [inputs[k].name, inputs[k].labels[idx]]),
      op: 'and',
      then: outLabels[out],
    });
  }
  return rules;
}

const lvl = (name) => ({ name, labels: LEVEL_LABELS });
const levelVar = (name) => new FuzzyVariable(name, [0, 100], LEVELS);
const out5 = (name) => new FuzzyVariable(name, [0, 100], OUT5);
const out3 = (name) => new FuzzyVariable(name, [0, 100], OUT3);

export const TS = new MamdaniSystem({
  name: 'technical_strength',
  inputs: { dsa: levelVar('dsa'), core: levelVar('core') },
  output: out5('technical_strength'),
  rules: buildRules({
    inputs: [lvl('dsa'), lvl('core')],
    weights: [0.6, 0.4],
    thresholds: [0.3, 0.9, 1.5, 1.8],
    outLabels: OUT5_LABELS,
  }),
});

export const NS = new MamdaniSystem({
  name: 'nontechnical_strength',
  inputs: { aptitude: levelVar('aptitude'), communication: levelVar('communication') },
  output: out5('nontechnical_strength'),
  rules: buildRules({
    inputs: [lvl('aptitude'), lvl('communication')],
    weights: [0.5, 0.5],
    thresholds: [0.3, 0.9, 1.5, 1.8],
    outLabels: OUT5_LABELS,
  }),
});

export const SS = new MamdaniSystem({
  name: 'skill_state',
  inputs: {
    technical: levelVar('technical'),
    nontechnical: levelVar('nontechnical'),
    practical: levelVar('practical'),
  },
  output: out5('skill_state'),
  rules: buildRules({
    inputs: [lvl('technical'), lvl('nontechnical'), lvl('practical')],
    weights: [0.5, 0.25, 0.25],
    thresholds: [0.3, 0.9, 1.5, 1.8],
    outLabels: OUT5_LABELS,
    // Technical rounds are eliminatory: weak technical strength gates the overall state.
    caps: [
      { input: 'technical', label: 'low', max: 'low' },
      { input: 'technical', label: 'medium', max: 'medium' },
    ],
  }),
});

export const TQ = new MamdaniSystem({
  name: 'trajectory_quality',
  inputs: {
    momentum: new FuzzyVariable('momentum', [-10, 10], MOMENTUM_SETS),
    consistency: levelVar('consistency'),
    balance: levelVar('balance'),
  },
  output: out3('trajectory_quality'),
  rules: buildRules({
    inputs: [
      { name: 'momentum', labels: MOMENTUM_LABELS },
      lvl('consistency'),
      lvl('balance'),
    ],
    weights: [0.4, 0.35, 0.25],
    thresholds: [0.7, 1.35],
    outLabels: OUT3_LABELS,
    caps: [{ input: 'momentum', label: 'declining', max: 'fair' }],
  }),
});

export const READINESS = new MamdaniSystem({
  name: 'readiness',
  inputs: { skill_state: levelVar('skill_state'), trajectory: levelVar('trajectory') },
  output: out5('readiness'),
  rules: buildRules({
    inputs: [lvl('skill_state'), lvl('trajectory')],
    weights: [0.75, 0.25],
    thresholds: [0.3, 0.8, 1.3, 1.7],
    outLabels: OUT5_LABELS,
  }),
});

export const SYSTEMS = { TS, NS, SS, TQ, READINESS };

/** Pattern memberships use these two extra sets (see analyze.js). */
export const HOP_HIGH = trapmf(25, 50, 100, 100);
export const SURGE_HIGH = trapmf(30, 60, 100, 100);
export const BALANCE_LOW = trapmf(0, 0, 45, 70);
