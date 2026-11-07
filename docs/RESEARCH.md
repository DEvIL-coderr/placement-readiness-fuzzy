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

## 4. Contributions implemented (engine v2.0.0)
Working title: **An Evidence-Calibrated, Role-Aware Temporal Fuzzy Framework for Placement-Readiness Diagnosis and Forecasting.**
1. **Hierarchical fuzzy pipeline** (9+9+27+27+9 rules, Mamdani, generated from explicit weights/thresholds plus a "technical gate"), so rule bases are auditable. Every result stores a config fingerprint and engine version for reproducibility.
2. **Evidence-aware mastery**: difficulty-weighted, chance-corrected, exponentially forgetting (half-life 3 wk), shrunk to a prior; stale self-reported practical evidence decays (half-life 8 wk). Inputs are measured from a question bank, not self-reported.
3. **Role-specific readiness**: the same evidence is pooled with each role's own domain weights (normalised per domain), giving a readiness score per role, not only one global score.
4. **Trajectory descriptors**: Theil-Sen momentum, practice regularity, surge, coverage-aware balance, volatility, acceleration, plus practice entropy, topic diversity and switch rate.
5. **Soft pattern memberships** (steady growth, last-minute surge, skill hopping, unbalanced, stagnation): multi-label degrees, not hard classes.
6. **Forecast at the placement horizon** (damped momentum) with a **sensitivity band** (inputs shifted by +/- delta, delta shrinking with evidence). This is a sensitivity analysis, **not a statistical confidence interval**; do not call it one in the paper.
7. **Role-aware recommendation** with reasons, and a personalised question ranking (frequency x weak-area x role relevance); each question carries a `rankSource` (editorial / expert / placement_records) so editorial estimates are not mistaken for evidence.
8. **Calibration loop**: faculty ratings -> linear calibration, versioned history, CSV export.
9. **Fuzzy preparation linkograph** (adapted from Smith et al. 2025): kept as an *explanatory visual*, **not a headline contribution** (see section 6).

## 5. Research questions & hypotheses
RQ1 Does trajectory information add value beyond current scores *and beyond a simple linear trend*? RQ2 Are preparation patterns recoverable? RQ3 Do recommendations match faculty judgement? Pre-register: H1 Full model beats the static+linear-trend baseline (L) on MAE/Spearman on a real cohort; H2 pattern degrees agree with faculty-labelled patterns (Cohen's kappa); H3 recommendation top-3 overlaps faculty top-3 (nDCG).

## 6. Simulation results (SIMULATED, protocol check only)
700 synthetic students (7 behaviours x 100), 2-fold cross-fitted linear calibration for every model, paired bootstrap CIs. Tables: `docs/evaluation-output.md`.
Forecast, 8 weeks observed, horizon 4 wk (calibrated MAE): static weighted **10.91**; prototype fuzzy 13.00; **static + linear trend 10.49**; skill-state only 11.56; full proposed 11.13 (vs static: +0.22, CI [-0.15, 0.58]).
**Honest reading (v2):**
- The proposed model clearly beats the prototype fuzzy model, but is **not better than the static weighted average, and is worse than static + linear trend** (dMAE -0.42, CI [-0.73, -0.10] in favour of L). The damped-momentum forecast heuristic is therefore **not validated**; it must be improved or dropped before claiming a forecasting contribution.
- The simulator's ground truth is a weighted sum, which favours static baselines. Real data may differ, but cannot be assumed to.
- Hopping detection: simple **practice entropy (AUC 0.99) and topic diversity (AUC 1.00)** outperform the linkograph orphan ratio (AUC 0.90) and switch frequency (0.77). The linkograph is therefore not the main contribution.
- Pattern recovery: steady 85%, accelerating 47%, surge 100%, hopper 51%, unbalanced 100%, stagnant 83%, declining 82%. Hopper and accelerating are weak.
- What remains defensible: interpretable diagnostics, role-specific scores, sensitivity analysis and auditability at roughly baseline accuracy. Position the paper on that, and on real-data validation, not on "higher accuracy".

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

## 10. Search log (second pass, web search restricted to publisher domains)
Scopus/IEEE/ACM could not be queried directly (login/paywall; no Scopus public search). Domain-restricted web searches were run for: fuzzy placement readiness; fuzzy employability + temporal/weekly; fuzzy campus placement + skill-gap recommendation; explainable/longitudinal placement ML; linkography in education; interview-preparation recommenders. **Repeat on Scopus/IEEE/ACM and log counts.** Suggested Scopus string:
`TITLE-ABS-KEY(("placement" OR "employability" OR "job readiness") AND ("fuzzy") AND ("trajectory" OR "longitudinal" OR "temporal" OR "weekly" OR "linkography"))`

Closest neighbours found (read abstracts/pages before citing; only the Zenodo one was actually opened):
- Patil et al., *Student-Centric Explainable-AI Framework for Campus Placement Prediction*, 2026 — RF 89.5% + SHAP, readiness score + suggestions; page gives no temporal data. **Nearest competitor on "readiness + explanation"; contrast: crisp ML, no trajectory/fuzzy/uncertainty.**
- *Finding the combined effect of academic and non-academic performance on management students' placement: a fuzzy logic approach* (ScienceDirect, S1472811723000757) — fuzzy, placement, static (page not retrievable).
- *Optimized Technique for College Students Job Searching Strategies Using Fuzzy Logic Control with Cuckoo Search*, Int. J. Comput. Intell. Syst., 2024 — fuzzy + metaheuristic tuning (not opened).
- *A Development of Fuzzy Logic Expert-Based Recommender System for Improving Students' Employability*, IEEE 9232543 — fuzzy recommender (not opened).
- *Predicting Long-Term Student Outcomes from Short-Term EdTech Log Data*, ACM 2025 — temporal logs, non-fuzzy (not opened).
- Fuzzy competence-space learning-path papers (MDPI Axioms 2025) — fuzzy recommendation, no placement.
No fuzzy-linkography-in-education paper surfaced.


## 11. Search log update (2026-11-07)
IEEE Xplore was searched directly (3 queries, 15 on-topic title hits, 0 hits combining fuzzy + placement/employability + temporal terms); details in `docs/search-log-ieee.md`. **Scopus (preview-only account) and ACM DL (bot check) were NOT searched.** Before submission, repeat on Scopus (or Web of Science) via institutional access and on ACM DL, then add duplicate removal and abstract screening. Read in full and cite: George et al., IEEE Access 2026 (fuzzy inference + XAI for academic performance to technical demand), Casuat et al. 2020, Navalgund 2020, Venkatachalam 2021, Ainapure et al. 2022.
