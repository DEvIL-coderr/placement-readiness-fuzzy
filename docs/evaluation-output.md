
### forecast task, observed 8 weeks, horizon 4 wk (n=700, prevalence of "ready" = 0.37)
| Model | raw bias | calibrated MAE | RMSE | Spearman | F1@60 | ΔMAE vs B0 [95% CI] |
|---|---|---|---|---|---|---|
| B0 Static weighted | -7.5 | 10.91 | 12.95 | 0.587 | 0.562 | 0.00 [0.00, 0.00] |
| B1 Static fuzzy (prototype) | -21.0 | 13.00 | 14.66 | 0.388 | 0.275 | 2.10 [1.66, 2.53] |
| L  Static + linear trend | -5.2 | 10.49 | 12.72 | 0.623 | 0.594 | -0.42 [-0.73, -0.10] |
| A  Skill-state only | -11.5 | 11.56 | 13.27 | 0.582 | 0.472 | 0.65 [0.35, 0.97] |
| B  + trajectory quality | -12.0 | 11.12 | 12.92 | 0.606 | 0.492 | 0.21 [-0.14, 0.55] |
| C  + forecast only | -10.5 | 11.36 | 13.21 | 0.590 | 0.505 | 0.45 [0.11, 0.80] |
| D  Full (proposed) | -10.8 | 11.13 | 13.04 | 0.599 | 0.516 | 0.22 [-0.15, 0.58] |

Per-archetype MAE (B0 → Full):
  steady        9.12 → 10.81
  accelerating  11.63 → 10.73
  surge         15.78 → 15.18
  hopper        6.91 → 8.66
  unbalanced    2.59 → 4.43
  stagnant      14.90 → 14.03
  declining     15.40 → 14.04

### forecast task, observed 8 weeks, horizon 2 wk (n=700, prevalence of "ready" = 0.24)
| Model | raw bias | calibrated MAE | RMSE | Spearman | F1@60 | ΔMAE vs B0 [95% CI] |
|---|---|---|---|---|---|---|
| B0 Static weighted | -6.1 | 8.49 | 10.24 | 0.650 | 0.605 | 0.00 [0.00, 0.00] |
| B1 Static fuzzy (prototype) | -19.5 | 10.54 | 12.11 | 0.433 | 0.281 | 2.05 [1.65, 2.46] |
| L  Static + linear trend | -4.9 | 8.18 | 10.03 | 0.679 | 0.636 | -0.31 [-0.50, -0.11] |
| A  Skill-state only | -10.1 | 9.09 | 10.62 | 0.638 | 0.530 | 0.59 [0.31, 0.89] |
| B  + trajectory quality | -10.6 | 8.75 | 10.33 | 0.661 | 0.545 | 0.26 [-0.05, 0.57] |
| C  + forecast only | -9.5 | 8.98 | 10.57 | 0.646 | 0.548 | 0.49 [0.18, 0.80] |
| D  Full (proposed) | -10.0 | 8.72 | 10.37 | 0.659 | 0.563 | 0.23 [-0.10, 0.56] |

### forecast task, observed 6 weeks, horizon 6 wk (n=700, prevalence of "ready" = 0.37)
| Model | raw bias | calibrated MAE | RMSE | Spearman | F1@60 | ΔMAE vs B0 [95% CI] |
|---|---|---|---|---|---|---|
| B0 Static weighted | -9.0 | 13.34 | 14.93 | 0.382 | 0.186 | 0.00 [0.00, 0.00] |
| B1 Static fuzzy (prototype) | -22.6 | 14.42 | 15.84 | 0.122 | 0.015 | 1.08 [0.71, 1.42] |
| L  Static + linear trend | -8.3 | 13.24 | 15.02 | 0.363 | 0.129 | -0.10 [-0.37, 0.17] |
| A  Skill-state only | -13.2 | 13.17 | 14.77 | 0.408 | 0.269 | -0.17 [-0.42, 0.07] |
| B  + trajectory quality | -14.0 | 13.12 | 14.77 | 0.429 | 0.242 | -0.22 [-0.49, 0.04] |
| C  + forecast only | -13.1 | 13.31 | 14.94 | 0.405 | 0.167 | -0.03 [-0.31, 0.24] |
| D  Full (proposed) | -13.5 | 13.24 | 14.90 | 0.412 | 0.191 | -0.10 [-0.38, 0.17] |

### forecast task, observed 4 weeks, horizon 4 wk (n=700, prevalence of "ready" = 0.15)
| Model | raw bias | calibrated MAE | RMSE | Spearman | F1@60 | ΔMAE vs B0 [95% CI] |
|---|---|---|---|---|---|---|
| B0 Static weighted | -6.0 | 9.14 | 10.51 | 0.322 | 0.000 | 0.00 [0.00, 0.00] |
| B1 Static fuzzy (prototype) | -20.0 | 9.54 | 11.16 | -0.009 | 0.000 | 0.40 [0.13, 0.64] |
| L  Static + linear trend | -5.7 | 9.08 | 10.44 | 0.337 | 0.019 | -0.06 [-0.24, 0.12] |
| A  Skill-state only | -10.9 | 9.15 | 10.56 | 0.304 | 0.019 | 0.01 [-0.17, 0.19] |
| B  + trajectory quality | -12.0 | 9.12 | 10.48 | 0.336 | 0.019 | -0.03 [-0.24, 0.20] |
| C  + forecast only | -11.5 | 9.27 | 10.66 | 0.301 | 0.019 | 0.13 [-0.08, 0.32] |
| D  Full (proposed) | -12.2 | 9.25 | 10.62 | 0.315 | 0.019 | 0.11 [-0.10, 0.32] |

### current task, observed 8 weeks, horizon 4 wk (n=700, prevalence of "ready" = 0.15)
| Model | raw bias | calibrated MAE | RMSE | Spearman | F1@60 | ΔMAE vs B0 [95% CI] |
|---|---|---|---|---|---|---|
| B0 Static weighted | -4.4 | 5.98 | 7.41 | 0.715 | 0.622 | 0.00 [0.00, 0.00] |
| B1 Static fuzzy (prototype) | -17.9 | 7.99 | 9.55 | 0.477 | 0.215 | 2.02 [1.63, 2.39] |
| L  Static + linear trend | -2.1 | 6.20 | 7.74 | 0.713 | 0.397 | 0.23 [-0.03, 0.49] |
| A  Skill-state only | -8.4 | 6.54 | 7.91 | 0.693 | 0.515 | 0.56 [0.29, 0.83] |
| B  + trajectory quality | -9.0 | 6.38 | 7.70 | 0.714 | 0.512 | 0.40 [0.12, 0.68] |
| C  + forecast only | -7.4 | 6.53 | 7.98 | 0.696 | 0.403 | 0.55 [0.26, 0.85] |
| D  Full (proposed) | -7.8 | 6.42 | 7.88 | 0.703 | 0.439 | 0.45 [0.15, 0.76] |

### Hopping detectors: AUC for identifying simulated topic hoppers (0.5 = chance)
| Detector | direction | AUC vs all others | AUC vs steady learners |
|---|---|---|---|
| Linkograph orphan ratio | higher = hopping | 0.904 | 0.960 |
| Topic-switching frequency | higher = hopping | 0.770 | 0.765 |
| Practice entropy | lower = hopping | 0.990 | 1.000 |
| Topic diversity (4 wk) | lower = hopping | 1.000 | 1.000 |

### Pattern recovery (week 8, simulated archetypes)
| Archetype | Expected pattern | degree ≥ 0.4 | mean degree | dominant = expected |
|---|---|---|---|---|
| steady | steady_growth | 85% | 0.80 | 86% |
| accelerating | steady_growth | 47% | 0.38 | 51% |
| surge | last_minute_surge | 100% | 0.96 | 94% |
| hopper | skill_hopping | 51% | 0.42 | 39% |
| unbalanced | unbalanced_readiness | 100% | 1.00 | 37% |
| stagnant | stagnation_decline | 83% | 0.71 | 17% |
| declining | stagnation_decline | 82% | 0.67 | 82% |

### Input-noise sensitivity (week 8, forecast output)
| σ (points) | Fuzzy mean |Δ| | Fuzzy ρ | Static mean |Δ| | Static ρ |
|---|---|---|---|---|
| 2 | 0.89 | 0.995 | 0.77 | 0.995 |
| 5 | 2.00 | 0.976 | 1.85 | 0.970 |
| 10 | 4.00 | 0.912 | 3.61 | 0.896 |
