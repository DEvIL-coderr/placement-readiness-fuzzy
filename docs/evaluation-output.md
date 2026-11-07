
### forecast task, observed 8 weeks (n=700, prevalence of "ready" = 0.37)
| Model | raw bias | calibrated MAE | RMSE | Spearman | F1@60 | ΔMAE vs B0 [95% CI] |
|---|---|---|---|---|---|---|
| B0 Static weighted | -7.5 | 10.90 | 12.95 | 0.588 | 0.555 | 0.00 [0.00, 0.00] |
| B1 Static fuzzy (prototype) | -21.0 | 13.00 | 14.66 | 0.388 | 0.275 | 2.10 [1.67, 2.54] |
| A  Skill-state only | -11.6 | 11.60 | 13.33 | 0.577 | 0.469 | 0.70 [0.40, 1.03] |
| B  + trajectory quality | -12.1 | 11.16 | 12.98 | 0.601 | 0.484 | 0.26 [-0.08, 0.60] |
| C  + forecast only | -10.6 | 11.39 | 13.24 | 0.586 | 0.497 | 0.49 [0.15, 0.84] |
| D  Full (proposed) | -11.0 | 11.16 | 13.07 | 0.596 | 0.512 | 0.26 [-0.10, 0.62] |

Per-archetype MAE (B0 → Full):
  steady        9.10 → 10.95
  accelerating  11.62 → 10.70
  surge         15.79 → 15.12
  hopper        6.92 → 8.74
  unbalanced    2.58 → 4.47
  stagnant      14.88 → 14.08
  declining     15.40 → 14.07

### forecast task, observed 4 weeks (n=700, prevalence of "ready" = 0.15)
| Model | raw bias | calibrated MAE | RMSE | Spearman | F1@60 | ΔMAE vs B0 [95% CI] |
|---|---|---|---|---|---|---|
| B0 Static weighted | -6.0 | 9.14 | 10.51 | 0.324 | 0.000 | 0.00 [0.00, 0.00] |
| B1 Static fuzzy (prototype) | -20.0 | 9.54 | 11.16 | -0.009 | 0.000 | 0.40 [0.13, 0.64] |
| A  Skill-state only | -11.0 | 9.17 | 10.58 | 0.301 | 0.019 | 0.03 [-0.16, 0.21] |
| B  + trajectory quality | -12.1 | 9.12 | 10.48 | 0.337 | 0.019 | -0.02 [-0.24, 0.20] |
| C  + forecast only | -11.7 | 9.26 | 10.66 | 0.299 | 0.000 | 0.13 [-0.08, 0.32] |
| D  Full (proposed) | -12.4 | 9.24 | 10.62 | 0.314 | 0.019 | 0.10 [-0.11, 0.32] |

### current task, observed 8 weeks (n=700, prevalence of "ready" = 0.15)
| Model | raw bias | calibrated MAE | RMSE | Spearman | F1@60 | ΔMAE vs B0 [95% CI] |
|---|---|---|---|---|---|---|
| B0 Static weighted | -4.4 | 5.97 | 7.40 | 0.716 | 0.630 | 0.00 [0.00, 0.00] |
| B1 Static fuzzy (prototype) | -17.9 | 7.99 | 9.55 | 0.477 | 0.215 | 2.02 [1.64, 2.39] |
| A  Skill-state only | -8.5 | 6.60 | 7.99 | 0.686 | 0.485 | 0.63 [0.36, 0.91] |
| B  + trajectory quality | -9.0 | 6.42 | 7.76 | 0.707 | 0.509 | 0.45 [0.16, 0.73] |
| C  + forecast only | -7.5 | 6.57 | 8.03 | 0.691 | 0.405 | 0.60 [0.31, 0.90] |
| D  Full (proposed) | -7.9 | 6.46 | 7.92 | 0.699 | 0.408 | 0.49 [0.20, 0.80] |

### Pattern recovery (week 8, simulated archetypes)
| Archetype | Expected pattern | degree ≥ 0.4 | mean degree | dominant = expected |
|---|---|---|---|---|
| steady | steady_growth | 82% | 0.78 | 83% |
| accelerating | steady_growth | 46% | 0.38 | 50% |
| surge | last_minute_surge | 100% | 0.96 | 95% |
| hopper | skill_hopping | 51% | 0.42 | 39% |
| unbalanced | unbalanced_readiness | 100% | 1.00 | 37% |
| stagnant | stagnation_decline | 84% | 0.71 | 15% |
| declining | stagnation_decline | 83% | 0.67 | 81% |

### Input-noise sensitivity (week 8, forecast output)
| σ (points) | Fuzzy mean |Δ| | Fuzzy ρ | Static mean |Δ| | Static ρ |
|---|---|---|---|---|
| 2 | 0.87 | 0.995 | 0.77 | 0.995 |
| 5 | 2.00 | 0.976 | 1.85 | 0.970 |
| 10 | 3.94 | 0.911 | 3.61 | 0.896 |
