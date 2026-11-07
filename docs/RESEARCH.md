# Research notes: FTRA — Fuzzy Trajectory Readiness Analyzer

> Draft for supervisor review. **Novelty cannot be guaranteed** by me: I ran a limited web search (below). Before submission, do a systematic search (Scopus, IEEE Xplore, ACM DL, Google Scholar; terms: *fuzzy*, *placement/employability readiness*, *trajectory/longitudinal*, *linkography*, *interval type-2*) and record it (PRISMA-style) in the paper.

## 1. What the two decks propose, and what is weak
| Item | Finding |
|---|---|
| Prototype (FPR2 deck) | 4 inputs, 5 rules, static score; projects/mock stored but unused; trajectory = first vs last score; recommendation = lowest skill. |
| Rule coverage | Input (coding 50, DSA 80, aptitude 50, comm 50) fires **no** rule (scikit-fuzzy would raise an error). Test in `engine.test.js`. |
| Demo output | Deck prints 64.72 for (72,48,66,82). My JS engine and an independent numpy re-implementation both give **61.6** (61.46 with trapezoid centroid). The demo call also uses keyword names (`coding_score`) that do not match the function signature (`coding_s`). Re-run the original code and fix before submitting. |
| Proposal deck | Honest: calls novelty "not yet finalized", asks for literature review, defines RQ1–3, baselines, ablation, sensitivity. FTRA implements that plan. |

## 2. Related work found (verified by reading the pages)
| Work | What it does | Gap relative to this project |
|---|---|---|
| Hazman et al., *Internship Placement Recommendation for Final Year Students Using a Fuzzy Logic System*, AMCI 15(3), 2026 | Mamdani FIS, 4 criteria (salary, location, opportunity, reputation); evaluated on 3 students | Recommends internships, static, tiny evaluation, no web platform |
| Alkashami et al., *ANFIS data mining … early employment readiness*, Int. J. Data & Network Science 7(3), 2023 | ANFIS on 22 tracer-study parameters, 94% accuracy | Black-box, snapshot of graduate data, no weekly tracking/recommendation |
| Agrawal & Kadam, *Review on Predictive Analysis of Placement … ML*, ICAMIDA 2022 (Atlantis, 2023) | SVM/DT/LR/RF, binary placed/not-placed | Crisp ML on academic records; no interpretability or preparation process |
| Özseven & Özseven, *Hybrid Neuro-Fuzzy and ML Model … Online Mathematics*, IJACSA 17(5), 2026 | ANFIS+RF+XGB with recent-trend features | Different domain; random (not time-based) split; no placement, no recommendation |
| Smith et al., *Fuzzy Linkography*, ACM C&C 2025 (arXiv 2502.04599) | Fuzzy link strength between creative "moves" | Creative traces; never applied to study preparation |

Titles seen in search but **not read** (verify before citing): fuzzy expert-based recommender for student employability (AMiner listing); interval type-2 FLS for assessing answer scripts (SCITEPRESS 2016); STEP career-path recommendation via temporal/educational trajectory modelling (arXiv).

## 3. Gap statement (proposed)
Existing fuzzy placement systems are **static, small-input and unvalidated**; ML placement models are **opaque, outcome-only**; temporal student models target **online courses**, not placement preparation; fuzzy linkography targets **creative sessions**. Missing: an **interpretable, uncertainty-aware fuzzy framework that models the weekly preparation trajectory (not just the current score), diagnoses preparation patterns, forecasts readiness at the placement date and issues role-aware prioritised actions**, evaluated against static baselines with ablation and sensitivity analysis.

## 4. Contributions implemented
1. **Hierarchical fuzzy pipeline** (9+9+27+27+9 rules): Technical strength, Non-technical strength → Skill state; Trajectory quality; Readiness. Rule bases are generated from explicit weights/thresholds and a "technical gate" (weak technical ⇒ capped), so they are auditable and recalibratable.
2. **Evidence-aware mastery**: difficulty-weighted, chance-corrected (4-option MCQ), exponentially forgetting (half-life 3 wk), shrunk to a prior. Inputs are *measured* from a question bank, not self-reported.
3. **Fuzzy preparation linkograph**: events = (week, subject) practice moves; link = min(topic relatedness, temporal proximity); orphan ratio detects topic hopping. (Adapted from Smith et al. 2025 — cite it.)
4. **Soft pattern memberships** (steady growth, last-minute surge, skill hopping, unbalanced, stagnation) from momentum (Theil–Sen), consistency, surge, balance, orphan ratio — multi-label degrees, not hard classes.
5. **Forecast at the placement horizon** (damped momentum extrapolation) and an **evidence-adjusted uncertainty band** (inputs shifted by ±δ, δ shrinking with evidence; IT2-inspired, not a full IT2 system).
6. **Role-aware recommendation**: priority = role weight × (0.6·gap + 0.2·decline + 0.2·neglect) with reasons.
7. **Calibration loop**: faculty ratings → linear calibration → CSV export for real validation.

## 5. Research questions & hypotheses
RQ1 Does trajectory information add value beyond current scores? RQ2 Are preparation patterns recoverable? RQ3 Do recommendations match faculty judgement? Pre-register: H1 Full model ≤ static baseline MAE and ≥ Spearman on real cohort; H2 pattern degrees agree with faculty-labelled patterns (Cohen's κ); H3 recommendation top-3 overlaps faculty top-3 (nDCG).

## 6. Simulation results (SIMULATED — protocol check only)
700 synthetic students (7 behaviours × 100), 2-fold cross-fitted linear calibration for every model, F1 at ≥60, paired bootstrap CI. Full tables: `docs/evaluation-output.md`.
Forecast, 8 weeks observed: static weighted MAE 10.90 / ρ 0.588; prototype fuzzy 13.00 / 0.388; **FTRA full 11.16 / 0.596** (ΔMAE vs static +0.26, CI [−0.10, 0.62]).
**Honest reading:** FTRA clearly beats the prototype fuzzy model, is statistically indistinguishable from a static weighted average on accuracy (the simulator's ground truth is that weighted sum, which favours the baseline), and adds what the baseline cannot: patterns (surge 100%, steady 82%, declining 83%, unbalanced 100% detected; hopper 51% and accelerating 46% weak), uncertainty, forecast and explanation. Position the paper on **interpretable diagnostics at no accuracy cost**, not "higher accuracy", unless real data shows otherwise.

## 7. Known limitations (report them)
- No real cohort yet; all accuracy claims pending. Rule weights/thresholds, prior mean (40), half-life and damping are expert defaults.
- Mamdani centroid is not strictly monotone: ripples ≤0.9 points measured; Sugeno/interpolated inference would remove them.
- Raw scores are biased low in simulation (≈−11); hence calibration. Labels (35/55/75) need calibration too.
- Self-reported project/mock scores; platform-only activity is observed.
- Subject relatedness matrix is expert-set; run sensitivity on it.

## 8. Real-data plan
Pilot 60–150 students × 8–10 weeks; faculty rating every 2 weeks; actual placement outcome as final label; get ethics/consent. Analyses: MAE/Spearman/F1 vs baselines (B0, B1), ablation (A–D), Wilcoxon, bootstrap CIs, sensitivity (membership shifts, rule weights, relatedness), usability (SUS) and interpretability survey.

## 9. Publication hygiene
Write all text in your own words; run a similarity check; cite Smith et al. for linkography and every dataset/baseline; choose venues by scope (e.g. fuzzy-systems, applied soft computing, educational technology) and verify indexing (Scopus/UGC-CARE) and avoid predatory journals. Acceptance cannot be assured; novelty here rests on the combination above and must be validated by your supervisor.
