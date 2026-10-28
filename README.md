# AeroPredict — ML Project Submission

Flight delay study for Hyderabad and South India, with a local 3D flight website.

## Folder structure

```text
ML_Project/
├── dataset/          Original CSVs, metadata and source/provenance information
├── notebooks/        Guided dataset, model and results walkthrough
├── src/
│   ├── ml/           Training, evaluation, saved-model prediction and graph scripts
│   ├── data/         Original generator reference and portable reproduction script
│   └── website/      Complete local website, backend, tests and Blender source/assets
├── models/           Saved fitted classifier and regressor pipelines
├── results/          Measured metrics, comparison and prediction CSVs
├── graphs/           EDA and model-evaluation figures
├── reports/          Existing Word project report, copied unchanged
├── presentations/    Class PPT and team explanation/viva PPT
├── README.md
├── requirements.txt
└── START_HERE.cmd
```

## Repository and current public demo

- GitHub: https://github.com/ASIFMOHAMMAD8386/AeroPredict
- Public website: https://passage-pepper-secrets-walks.trycloudflare.com/simulation/

The public demo was verified on 28 October 2026. This temporary link works while the
presentation laptop, local server and public tunnel remain online. It is not permanent hosting.

## Open the website

Install Node.js 24 or newer. Double-click **START_LOCAL.cmd** to run the local presentation.
Double-click **START_HERE.cmd** to also attempt a temporary public class link and QR.
The local classroom screen is `http://localhost:4180/classroom/`.
For people on other networks, the verified public tunnel must stay running while the
laptop is awake and online. A temporary link can change. GitHub source storage alone
does not host this Node.js/SQLite backend. The bundled browser libraries need no npm install.

The `src/website/` folder keeps its working internal paths and existing launchers.
Live mode needs your own private key, configured using **SET_API_KEY.cmd**.
The private `.env`, existing API cache/budget database and old public links are omitted.
Keep account call usage in mind when configuring `PRIOR_API_CALLS`; a fresh copy does not
reset the provider's quota. No provider calls were made to organize this submission.

## Run the offline ML study

From this project folder:

```powershell
python -m venv .venv
.venv/Scripts/Activate.ps1
python -m pip install -r requirements.txt
python src/ml/predict.py
python src/ml/train_evaluate.py
python src/ml/make_graphs.py
```

Prediction uses the saved models. Training repeats the existing study and writes models
to `models/` and measured outputs to `results/`. It retains the original ten features,
4,200 training rows, 900 validation rows and 900 test rows. The CSVs remain unchanged.
The `dataset/README.md` and `SOURCE_INFORMATION.json` explain the synthetic source,
seed, generation equation and preprocessing. No separate processed CSV was used:
encoding is inside each saved fitted pipeline.

## Notebook

```powershell
python -m pip install -r notebooks/requirements.txt
python -m jupyterlab notebooks/AeroPredict_Walkthrough.ipynb
```

The notebook explains the exact features, split, saved model, examples and measured results.
It does not retrain automatically or make live-provider calls.

## What is implemented

- The offline Random Forest study has measured results on the existing synthetic data.
- The website has Simulation, Live provider records when configured, globe/camera controls,
  and the Blender/Three.js airport journey.
- The website's simulation currently uses its separate rule engine. The saved RF model
  is not integrated into website inference. This explains differing example minute values.
- Globe airport connections and animated journeys are illustrative, not recorded real tracks.
- RF test accuracy: **81.1%**. F1: **85.5%**. MAE: **9.15 min** on 900 synthetic test rows.
  These figures do not establish real-airline prediction accuracy.

## Submission and GitHub

Use `reports/Project_Report.docx` for the existing report and the two files in
`presentations/` for the class presentation and team explanation. The class PPT retains
the proposed-system-only revision. The supplied Word report has the repository and public-demo hyperlinks added to its appendix. Its original content and first two pages are preserved. The PPTs were copied unchanged.
`SOURCE_MANIFEST.json` records the copied files and SHA-256 hashes.

Create an empty GitHub repository, then from this project folder run:

```powershell
git init
git add .
git commit -m "Add AeroPredict project submission"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your own repository URL. Private runtime files,
API settings and dependencies are excluded by `.gitignore`. Third-party notices remain
with their browser libraries. This repository contains the submitted project. The separate `SLAP_Report_Evidence/` folder contains the logistic/ridge experiment referenced by the Word report; its metrics are distinct from the RF study in `results/`. To reproduce that report experiment, open that folder and follow Appendix A 1.

