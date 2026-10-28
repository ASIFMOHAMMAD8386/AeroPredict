# Measured offline study results

- `metrics.json`: metrics, parameter selection, feature names, versions and dataset hashes.
- `comparison.csv`: Baseline, Decision Tree and Random Forest comparison.
- `test_predictions.csv`: all 900 held-out synthetic test rows and RF predictions.
- `worked_examples.csv`: two hypothetical HYD–BLR scenarios, with no observed outcome.

These files are unchanged copies. RF test accuracy is 81.1%, F1 is 85.5%, and
regression MAE is 9.15 minutes. They are synthetic-data results, not real airline accuracy.
The website currently uses a separate rule engine; RF integration remains future work.
Retraining writes updated measured outputs here. Inference writes `new_predictions.csv`.
