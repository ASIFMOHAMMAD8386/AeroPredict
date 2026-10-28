"""Reproducible offline study using the existing AeroPredict data and exact 10 features.
The website and its rule engine are separate. This script makes no network calls.
"""
from pathlib import Path
import sys, json, hashlib, platform, shutil

PROJECT = Path(__file__).resolve().parents[2]

import numpy as np
import pandas as pd
import sklearn
import joblib
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.metrics import (accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, mean_absolute_error, mean_squared_error, r2_score)

DATA = PROJECT / 'dataset'
MODELS = PROJECT / 'models'
RESULTS = PROJECT / 'results'
MODELS.mkdir(exist_ok=True)
RESULTS.mkdir(exist_ok=True)
META = json.loads((DATA / 'metadata.json').read_text(encoding='utf-8'))
FEATURES = META['features']
EXPECTED = ['origin','destination','departure_hour_ist','day_of_week','month','weather',
    'congestion_pct','incoming_delay_minutes','distance_km','scheduled_duration_minutes']
assert FEATURES == EXPECTED
CAT = ['origin','destination','weather']
NUM = [f for f in FEATURES if f not in CAT]
TARGETS = ['delayed_15_plus','departure_delay_minutes']
assert not set(FEATURES).intersection(TARGETS)
SEED = 42

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

hashes_before = {s:digest(DATA / f'{s}.csv') for s in ['train','validation','test']}
frames = {s:pd.read_csv(DATA / f'{s}.csv') for s in hashes_before}
assert [len(frames[s]) for s in frames] == [4200,900,900]
assert frames['train'].flight_date.max() < frames['validation'].flight_date.min()
assert frames['validation'].flight_date.max() < frames['test'].flight_date.min()
combined = pd.concat(list(frames.values()),ignore_index=True)
assert len(combined)==6000 and combined.record_id.is_unique
assert combined[FEATURES+TARGETS].isna().sum().sum()==0
assert (combined.delayed_15_plus == (combined.departure_delay_minutes>=15).astype(int)).all()
X = {s:df[FEATURES] for s,df in frames.items()}

def pipeline(estimator):
    pre = ColumnTransformer([
        ('categories',OneHotEncoder(handle_unknown='ignore',sparse_output=False),CAT),
        ('numbers','passthrough',NUM)
    ], remainder='drop', verbose_feature_names_out=False)
    return Pipeline([('preprocess',pre),('model',estimator)])

def classification_metrics(y,p,prob):
    return {'accuracy':float(accuracy_score(y,p)),
        'precision':float(precision_score(y,p,zero_division=0)),
        'recall':float(recall_score(y,p,zero_division=0)),
        'f1':float(f1_score(y,p,zero_division=0)),
        'roc_auc':float(roc_auc_score(y,prob)),
        'confusion_matrix':confusion_matrix(y,p,labels=[0,1]).tolist()}

def regression_metrics(y,p):
    return {'mae':float(mean_absolute_error(y,p)),
        'rmse':float(np.sqrt(mean_squared_error(y,p))), 'r2':float(r2_score(y,p))}

results = {'scope':'Offline experiment on unchanged synthetic data. Not connected to the website.',
    'seed':SEED, 'features':FEATURES, 'categorical_features':CAT,'numeric_features':NUM,
    'targets':TARGETS, 'feature_count':len(FEATURES),
    'versions':{'python':platform.python_version(),'numpy':np.__version__,
        'pandas':pd.__version__,'scikit-learn':sklearn.__version__,'joblib':joblib.__version__},
    'data_hashes':hashes_before,'splits':{s:{'rows':len(df),
        'start':df.flight_date.min(),'end':df.flight_date.max(),
        'delayed':int(df.delayed_15_plus.sum())} for s,df in frames.items()},
    'classification':[],'regression':[],'validation_search':[]}

models = {}
for task,target in [('classification',TARGETS[0]),('regression',TARGETS[1])]:
    families = {}
    families['Baseline'] = [DummyClassifier(strategy='most_frequent')] if task=='classification' else [DummyRegressor(strategy='mean')]
    tree = DecisionTreeClassifier if task=='classification' else DecisionTreeRegressor
    forest = RandomForestClassifier if task=='classification' else RandomForestRegressor
    families['Decision Tree'] = [tree(max_depth=d,min_samples_leaf=5,random_state=SEED) for d in [6,12,None]]
    families['Random Forest'] = [forest(n_estimators=200,max_depth=d,min_samples_leaf=leaf,
        max_features='sqrt' if task=='classification' else 1.0,
        bootstrap=True,random_state=SEED,n_jobs=2) for d in [8,16,None] for leaf in [2,5]]
    fitted = {}
    # Choose each family's parameters using validation only. Test is untouched here.
    for name, candidates in families.items():
        choices=[]
        for estimator in candidates:
            model=pipeline(estimator).fit(X['train'],frames['train'][target])
            prediction=model.predict(X['validation'])
            score=float(f1_score(frames['validation'][target],prediction,zero_division=0)) if task=='classification' else -float(mean_absolute_error(frames['validation'][target],prediction))
            parameters=estimator.get_params()
            choices.append((score,model,parameters))
            results['validation_search'].append({'task':task,'family':name,'score':score,'parameters':parameters})
        score,model,parameters=max(choices,key=lambda item:item[0])
        fitted[name]=(score,model,parameters)
        print(task,name,'validation',round(score,5),flush=True)
    # Freeze all choices before the final held-out synthetic test evaluation.
    for name,(score,model,parameters) in fitted.items():
        prediction=model.predict(X['test'])
        metrics=classification_metrics(frames['test'][target],prediction,model.predict_proba(X['test'])[:,1]) if task=='classification' else regression_metrics(frames['test'][target],prediction)
        results[task].append({'family':name,'validation_selection_score':score,'parameters':parameters,**metrics})
        models[(task,name)]=model
    chosen=models[(task,'Random Forest')]
    joblib.dump(chosen,MODELS/f'random_forest_{task}.joblib')
    reloaded=joblib.load(MODELS/f'random_forest_{task}.joblib')
    assert np.allclose(reloaded.predict(X['test']),chosen.predict(X['test']))

clf=models[('classification','Random Forest')]
reg=models[('regression','Random Forest')]
test_predictions=frames['test'][['record_id']+FEATURES+TARGETS].copy()
test_predictions['rf_predicted_class']=clf.predict(X['test'])
test_predictions['rf_delay_probability']=clf.predict_proba(X['test'])[:,1]
test_predictions['rf_predicted_minutes']=reg.predict(X['test'])
test_predictions.to_csv(RESULTS/'test_predictions.csv',index=False)

examples=pd.DataFrame([
    {'origin':'HYD','destination':'BLR','departure_hour_ist':18,'day_of_week':5,'month':10,
     'weather':'Clear','congestion_pct':35,'incoming_delay_minutes':10,'distance_km':456,'scheduled_duration_minutes':72},
    {'origin':'HYD','destination':'BLR','departure_hour_ist':18,'day_of_week':5,'month':10,
     'weather':'Thunderstorm','congestion_pct':85,'incoming_delay_minutes':45,'distance_km':456,'scheduled_duration_minutes':72}
],columns=FEATURES)
examples['rf_probability']=clf.predict_proba(examples[FEATURES])[:,1]
examples['rf_class']=clf.predict(examples[FEATURES])
examples['rf_minutes']=reg.predict(examples[FEATURES])
examples['website_rule_minutes']=[21,66]
examples['scope']='New hypothetical scenario, no observed outcome'
examples.to_csv(RESULTS/'worked_examples.csv',index=False)
results['worked_examples']=examples.to_dict(orient='records')
encoded=reg.named_steps['preprocess'].transform(examples[FEATURES].iloc[:1])
tree_minutes=[float(t.predict(encoded)[0]) for t in reg.named_steps['model'].estimators_]
encoded_c=clf.named_steps['preprocess'].transform(examples[FEATURES].iloc[:1])
tree_probabilities=[float(t.predict_proba(encoded_c)[0,1]) for t in clf.named_steps['model'].estimators_]
assert np.isclose(np.mean(tree_minutes),float(examples.rf_minutes.iloc[0]))
assert np.isclose(np.mean(tree_probabilities),float(examples.rf_probability.iloc[0]))
results['tree_example']={'first_five_regression_tree_minutes':tree_minutes[:5],
    'all_200_tree_mean_minutes':float(np.mean(tree_minutes)),
    'first_five_classifier_tree_probabilities':tree_probabilities[:5],
    'all_200_tree_mean_probability':float(np.mean(tree_probabilities))}
results['encoded_feature_count']=len(reg.named_steps['preprocess'].get_feature_names_out())
assert all(digest(DATA/f'{s}.csv')==hashes_before[s] for s in frames)
results['dataset_unchanged']=True
(RESULTS/'metrics.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
pd.DataFrame([{'family':c['family'],'accuracy':c['accuracy'],'precision':c['precision'],
    'recall':c['recall'],'f1':c['f1'],'regression_mae':r['mae'],'regression_rmse':r['rmse']}
    for c,r in zip(results['classification'],results['regression'])]).to_csv(RESULTS/'comparison.csv',index=False)
(RESULTS/'runtime_versions.json').write_text(json.dumps(results['versions'],indent=2),encoding='utf-8')
print(json.dumps({k:results[k] for k in ['classification','regression','worked_examples','tree_example','encoded_feature_count','dataset_unchanged']},indent=2),flush=True)
