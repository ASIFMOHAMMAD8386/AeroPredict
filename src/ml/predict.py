"""Use the saved offline models on a CSV containing the original ten features."""
from pathlib import Path
import argparse, json
import pandas as pd
import joblib

ROOT = Path(__file__).resolve().parents[2]
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',type=Path,default=ROOT/'results/worked_examples.csv')
    parser.add_argument('--output',type=Path,default=ROOT/'results/new_predictions.csv')
    args=parser.parse_args()
    features=json.loads((ROOT/'dataset/metadata.json').read_text())['features']
    frame=pd.read_csv(args.input)
    missing=set(features)-set(frame.columns)
    if missing:parser.error('Missing input columns: '+', '.join(sorted(missing)))
    clf=joblib.load(ROOT/'models/random_forest_classification.joblib')
    reg=joblib.load(ROOT/'models/random_forest_regression.joblib')
    result=frame[features].copy()
    result['rf_predicted_class']=clf.predict(frame[features])
    result['rf_delay_probability']=clf.predict_proba(frame[features])[:,1]
    result['rf_predicted_minutes']=reg.predict(frame[features])
    args.output.parent.mkdir(parents=True,exist_ok=True)
    result.to_csv(args.output,index=False)
    print(result.to_string(index=False))
    print('Saved:',args.output)
    print('Offline synthetic-data model; this does not call or replace the website rules.')
if __name__=='__main__':main()
