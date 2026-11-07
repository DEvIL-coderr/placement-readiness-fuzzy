/**
 * Baselines used in the evaluation (and to reproduce the original Python prototype).
 */
import { FuzzyVariable, MamdaniSystem, trimf } from './fuzzy.js';
import { STATIC_WEIGHTS } from './config.js';

/** B0: static weighted average of current domain mastery. */
export function staticWeighted(domainVals) {
  return Object.entries(STATIC_WEIGHTS).reduce((s, [d, w]) => s + w * (domainVals[d] ?? 50), 0);
}

// ---- B1: the 5-rule static fuzzy model from the team's first prototype (skfuzzy) ----
const deckSets = { poor: trimf(0, 0, 50), average: trimf(30, 50, 75), good: trimf(60, 100, 100) };
const deckOut = { low: trimf(0, 0, 50), medium: trimf(30, 50, 75), high: trimf(60, 100, 100) };
const v = (name) => new FuzzyVariable(name, [0, 100], deckSets);

export const DECK_SYSTEM = new MamdaniSystem({
  name: 'deck_readiness',
  inputs: { coding: v('coding'), dsa: v('dsa'), aptitude: v('aptitude'), communication: v('communication') },
  output: new FuzzyVariable('readiness', [0, 100], deckOut),
  rules: [
    { if: [['coding', 'good'], ['dsa', 'good']], op: 'and', then: 'high' },
    { if: [['coding', 'poor'], ['dsa', 'poor']], op: 'or', then: 'low' },
    { if: [['coding', 'average'], ['dsa', 'average']], op: 'and', then: 'medium' },
    { if: [['aptitude', 'good'], ['communication', 'good']], op: 'and', then: 'high' },
    { if: [['aptitude', 'poor'], ['communication', 'poor']], op: 'or', then: 'low' },
  ],
});

export function deckFuzzy({ coding, dsa, aptitude, communication }) {
  const r = DECK_SYSTEM.infer({ coding, dsa, aptitude, communication });
  return { score: r.crisp, noRuleFired: r.degenerate };
}
