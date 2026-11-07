# Pilot study protocol (draft for supervisor and ethics review)

Status: draft. Nothing here has been approved or run. Replace placeholders in [brackets].

## 1. Purpose
Test, on real students, whether the engine's weekly diagnostics agree with faculty judgement and whether the trajectory information adds value over simpler baselines. This pilot comes before any claim in a paper.

## 2. Pre-registered hypotheses (freeze before data collection)
- **H1:** The full model's calibrated forecast has lower MAE and higher Spearman correlation with the faculty rating at the end of the pilot than (B0) a static weighted average and (L) a static weighted average plus a linear trend.
- **H2:** The pattern memberships agree with patterns labelled independently by faculty (Cohen's kappa on the dominant pattern).
- **H3:** The top-3 recommended subjects overlap with the faculty top-3 priorities (nDCG@3 or overlap rate).
- **Secondary (exploratory, label as such):** role-specific readiness differs meaningfully by role; association with the actual placement outcome.
Register the hypotheses and analysis plan (for example on OSF) with the engine version and config hash (`ENGINE_VERSION` and the stored fingerprint) before enrolment. Do not change the engine after data collection starts; any later change is a new version and reported as exploratory.

## 3. Participants
- Final-year MCA and related students at [Brainware University], target n = 60 to 150, using the application voluntarily.
- Inclusion: enrolled in the placement cycle, consent given. Exclusion: withdrawn consent, fewer than [4] weeks of activity (report how many).
- Sample size note: n = 60 gives wide intervals; report intervals, not only p-values. Plan for roughly 20 percent dropout.

## 4. Procedure and schedule (8 to 10 weeks)
1. Week 0: consent, profile (target role, placement date).
2. Weeks 1 to N: students use Practice (MCQ), log projects and mock interviews weekly. Encourage normal use; do not instruct students to inflate activity.
3. Every 2 weeks: faculty rate each student (section 5) **before** seeing any system score.
4. End of season: record the actual placement outcome ([placed / not placed / not sitting]; package band only if the student agrees).
5. Export with `GET /api/admin/export/dataset.csv` (snapshots including per-domain, per-role and per-pattern columns, engine version, config hash, and the paired faculty rating) for analysis in R or Python.

## 5. Faculty rating rubric
Two faculty raters per student where possible.
- Overall placement readiness, 0 to 100, with anchors: 0 to 29 not ready, 30 to 54 needs substantial work, 55 to 74 nearly ready, 75 to 100 ready.
- Per domain 0 to 100: DSA & coding, core subjects, aptitude, communication, practical.
- Dominant preparation pattern (steady growth, last-minute surge, skill hopping, unbalanced, stagnation or decline) and top-3 priority subjects.
- Raters are blind to system output. Report inter-rater agreement (ICC for scores, kappa for patterns). Note: the current admin rating screen records one overall rating per call; domain, pattern and priority ratings need a small extension before the pilot.
- Caution: the `/ratings` endpoint is available to admins, who can also open student analyses. Use a separate rating form or sealed ratings to keep raters blind.

## 6. Analysis plan
- Models compared with the same 2-fold cross-fitted calibration: B0 static weighted, B1 prototype fuzzy, L static + linear trend, full model, ablations A to D (see `server/research/evaluate.js`).
- Metrics: MAE, RMSE, Spearman, F1 at the "ready" threshold, with paired bootstrap 95 percent intervals on MAE differences and Wilcoxon signed-rank tests. Do not apply a multiple-comparison correction silently; state the primary comparison (full vs L) up front.
- Sensitivity: perturb membership functions, rule weights and the subject relatedness matrix; report score changes.
- Report negative results. The simulation already shows L beating the full forecast; the real data may differ.
- Usability and interpretability: System Usability Scale for students and a short faculty questionnaire.

## 7. Ethics and data protection
- Obtain institutional ethics committee approval before enrolment.
- Written informed consent: purpose, data collected (quiz attempts, self-logged scores, ratings), voluntary participation, right to withdraw, how data are stored.
- Minimise personal data: pseudonymise students in the analysis dataset; store names and emails separately from analysis exports. Consider the requirements of India's Digital Personal Data Protection Act, 2023; confirm with your institution.
- Students should not be graded or penalised based on system scores; make this explicit in the consent form.
- Faculty ratings are research data; do not share individual ratings with students during the pilot.

## 8. Known limitations to state in the paper
Self-reported project and mock scores, single institution, small sample, short window relative to the placement season, expert-set rule weights and priors, a question bank whose frequency scores are editorial estimates, and the calibration being fitted on the same cohort (cross-fitting only partly mitigates this).

## 9. Application changes needed before the pilot
- Faculty form with domain, pattern and priority ratings, with blind mode.
- Consent screen at registration and a data-export or deletion option.
- Pseudonymised analysis export.
- Decide whether the forecast stays a contribution (it must beat L) or becomes exploratory.
