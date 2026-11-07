# Placement Readiness Analyzer — Fuzzy Trajectory Engine (MERN)

Weekly preparation tracking + question bank + a **trajectory-aware hierarchical fuzzy engine** that predicts how placement-ready a student is, explains why, and says what to practise next.

Stack: MongoDB · Express · React (Vite) · Node. The fuzzy engine is dependency-free JavaScript (Mamdani, min/max, centroid — same semantics as scikit-fuzzy).

## Quick start
```bash
npm run install:all
cp server/.env.example server/.env      # set JWT_SECRET, MONGODB_URI
npm run seed                            # subjects, 101 starter questions, admin user
npm run seed:demo                       # optional: 7 demo students (password Demo@12345)
npm run server    # http://localhost:5000
npm run client    # http://localhost:5173
npm test          # 28 engine/service tests (no database needed)
npm run evaluate  # simulation study -> server/research/results.json
```
Default admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (change them).

## Features
- Students: quizzes per subject (11 subjects), weekly project/mock log, dashboard (readiness + sensitivity band (not a confidence interval), forecast at placement date, trajectory chart, pattern, ranked recommendations, per-role readiness, linkograph (explanatory), rule explanation), "Top questions" ranked by frequency with its source shown, plus a personalised "recommended for me" ranking.
- Admin: add/edit/delete questions (MCQ + interview Q&A), JSON bulk import with automatic duplicate detection, faculty ratings, calibration, CSV export for the paper.
- Demo page: synthetic students of 7 behaviours scored by the same engine.

## Layout
- `server/src/engine/` — `fuzzy.js` (Mamdani core), `systems.js` (5 rule bases), `analyze.js` (pipeline), `simulate.js`, `baselines.js`, `calibration.js`
- `server/research/` — evaluation harness; `docs/RESEARCH.md` — literature gap, novelty, protocol
- `server/src/{models,routes,services}` — API; `client/src` — React app

## Status / honesty notes
- Engine, weekly aggregation and simulator are unit-tested. The Express/Mongo layer and React app were written and syntax/bundle-checked, and the UI was rendered against a mock API, but the API has **not been run against a live MongoDB** yet — run `npm test`, then smoke-test locally.
- Readiness scores are **uncalibrated** until faculty ratings are collected (Admin → Students, then Research data → Fit calibration).
- Evaluation numbers in `docs/RESEARCH.md` come from **simulated** students and prove nothing about real accuracy.
- Seed question `frequency` values are editorial estimates; tune them with your college's real drive data.


## Branch notes: `improvements` (engine v2.0.0)
- Role-specific readiness, stale-evidence decay, input validation (missing data throws), config fingerprint, new trajectory descriptors, sensitivity-band terminology.
- Question bank: `rankSource`, CSV import (`POST /api/questions/import-csv`, admin UI), personalised `GET /api/questions/recommended`.
- Calibration history (`GET /api/admin/calibration/history`).
- Evaluation now includes a static+linear-trend baseline, which beats the proposed forecast in simulation; see `docs/RESEARCH.md` section 6.
- Not yet run against a live MongoDB; run `npm test` in `server/` (38 tests, engine only) and report any API errors.
