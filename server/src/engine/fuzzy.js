/**
 * Minimal, dependency-free Mamdani fuzzy inference.
 *
 * Semantics intentionally mirror scikit-fuzzy's `control` API so results are
 * comparable with the original Python prototype:
 *   AND = min, OR = max, implication = min (clipping),
 *   aggregation = max, defuzzification = centroid on a discretised universe.
 */

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** Triangular membership. Supports shoulders (a === b or b === c). */
export function trimf(a, b, c) {
  return (x) => {
    if (x < a || x > c) return 0;
    if (x === b) return 1;
    if (x < b) return (x - a) / (b - a);
    return (c - x) / (c - b);
  };
}

/** Trapezoidal membership. Supports shoulders (a === b or c === d). */
export function trapmf(a, b, c, d) {
  return (x) => {
    if (x < a || x > d) return 0;
    if (x >= b && x <= c) return 1;
    if (x < b) return (x - a) / (b - a);
    return (d - x) / (d - c);
  };
}

export class FuzzyVariable {
  /**
   * @param {string} name
   * @param {[number, number]} universe  [min, max]
   * @param {Record<string, (x:number)=>number>} sets  label -> membership fn
   */
  constructor(name, universe, sets) {
    this.name = name;
    this.min = universe[0];
    this.max = universe[1];
    this.sets = sets;
    this.labels = Object.keys(sets);
  }

  fuzzify(x) {
    const v = clamp(Number.isFinite(x) ? x : (this.min + this.max) / 2, this.min, this.max);
    const out = {};
    for (const label of this.labels) out[label] = this.sets[label](v);
    return out;
  }
}

export function ruleText(rule, outputName) {
  const joiner = rule.op === 'or' ? ' OR ' : ' AND ';
  const cond = rule.if.map(([v, l]) => `${v} is ${l}`).join(joiner);
  return `IF ${cond} THEN ${outputName} is ${rule.then}`;
}

export class MamdaniSystem {
  /**
   * @param {object} cfg
   * @param {string} cfg.name
   * @param {Record<string, FuzzyVariable>} cfg.inputs
   * @param {FuzzyVariable} cfg.output
   * @param {Array<{if:Array<[string,string]>, op?:'and'|'or', then:string, weight?:number}>} cfg.rules
   * @param {number} [cfg.step=1] universe discretisation step
   */
  constructor({ name, inputs, output, rules, step = 1 }) {
    this.name = name;
    this.inputs = inputs;
    this.output = output;
    this.rules = rules;
    this.grid = [];
    for (let x = output.min; x <= output.max + 1e-9; x += step) this.grid.push(x);
    this.curves = {};
    for (const label of output.labels) {
      this.curves[label] = this.grid.map((x) => output.sets[label](x));
    }
  }

  /** @returns {{crisp:number, firing:Array<{rule:object,text:string,strength:number}>, degenerate:boolean}} */
  infer(values) {
    const mu = {};
    for (const [k, variable] of Object.entries(this.inputs)) mu[k] = variable.fuzzify(values[k]);

    const firing = this.rules.map((rule) => {
      const degrees = rule.if.map(([v, l]) => mu[v][l]);
      const base = rule.op === 'or' ? Math.max(...degrees) : Math.min(...degrees);
      return {
        rule,
        text: ruleText(rule, this.output.name),
        strength: base * (rule.weight ?? 1),
      };
    });

    // max-aggregation of min-clipped consequents == clip each label by the max strength of its rules
    const labelStrength = {};
    for (const f of firing) {
      labelStrength[f.rule.then] = Math.max(labelStrength[f.rule.then] ?? 0, f.strength);
    }

    let num = 0;
    let den = 0;
    for (let i = 0; i < this.grid.length; i++) {
      let m = 0;
      for (const [label, s] of Object.entries(labelStrength)) {
        const v = Math.min(s, this.curves[label][i]);
        if (v > m) m = v;
      }
      num += this.grid[i] * m;
      den += m;
    }

    const degenerate = den === 0;
    const crisp = degenerate ? (this.output.min + this.output.max) / 2 : num / den;
    return { crisp, firing, degenerate };
  }
}
