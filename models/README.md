# Saved Random Forest pipelines

The two `.joblib` files are unchanged copies of the approved offline study.
Each includes a fitted training-only encoder and the estimator. Both forests have
200 trees, maximum depth 8 and minimum leaf size 5, selected using validation data.
Use the package versions in the root `requirements.txt` when loading them.
Run `python src/ml/predict.py` for the two saved hypothetical examples.
Run `python src/ml/train_evaluate.py` to repeat training and evaluation.
Model files go here; measured outputs go to `results/`. The website uses its separate rules.
