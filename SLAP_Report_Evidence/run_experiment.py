"""Reproduce AeroPredict's synthetic ML experiment. No flight API calls."""
from pathlib import Path
import sys, json, hashlib, platform, shutil
BASE = Path(__file__).resolve().parent
if (BASE/'report-deps').exists(): sys.path.insert(0,str(BASE/'report-deps'))
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from slap_numpy_models import *
import joblib

ROOT = BASE.parent if BASE.name=='work' else BASE
DATA = ROOT/'outputs/AeroPredict_Local_Presentation/training-data' if BASE.name=='work' else BASE/'data'
OUT = ROOT/'outputs/SLAP_Report_Evidence' if BASE.name=='work' else BASE
OUT.mkdir(parents=True,exist_ok=True)
FIG=OUT/'figures'; FIG.mkdir(exist_ok=True)
SEED=42
dfs={s:pd.read_csv(DATA/f'{s}.csv') for s in ['train','validation','test']}
all_df=pd.concat(list(dfs.values()),ignore_index=True)
assert len(all_df)==6000 and all_df.record_id.is_unique
assert all_df.isna().sum().sum()==0
assert (all_df.delayed_15_plus==(all_df.departure_delay_minutes>=15).astype(int)).all()
assert dfs['train'].flight_date.max()<dfs['validation'].flight_date.min()<dfs['test'].flight_date.min()
assert dfs['validation'].flight_date.max()<dfs['test'].flight_date.min()
CAT=['destination','weather']
NUM=['departure_hour_ist','day_of_week','month','congestion_pct','incoming_delay_minutes','distance_km','scheduled_duration_minutes','evening_peak']
def features(df):
    out=df.copy(); out['evening_peak']=out.departure_hour_ist.between(16,22).astype(int)
    return out[CAT+NUM]
X={s:features(d) for s,d in dfs.items()}
def pipe(model):
    return TeachingPipeline(model,CAT,NUM)

def cmets(y,p,proba):
    return dict(accuracy=float(accuracy_score(y,p)),precision=float(precision_score(y,p,zero_division=0)),recall=float(recall_score(y,p,zero_division=0)),f1=float(f1_score(y,p,zero_division=0)),roc_auc=float(roc_auc_score(y,proba)),confusion_matrix=confusion_matrix(y,p,labels=[0,1]).tolist())
def rmets(y,p):
    return dict(mae=float(mean_absolute_error(y,p)),mse=float(mean_squared_error(y,p)),rmse=float(np.sqrt(mean_squared_error(y,p))),r2=float(r2_score(y,p)))
cls={
 'Majority baseline':[Learner('majority')],
 'Logistic regression':[Learner('logistic',l2=v) for v in [.001,.01,.1]],
 'Gaussian naive Bayes':[Learner('gaussian',smoothing=v) for v in [.001,.01,.1]],
 'K nearest neighbours':[Learner('knn_class',k=v) for v in [11,31,61]]}
regs={
 'Mean baseline':[Learner('mean')],
 'Ridge regression':[Learner('ridge',alpha=v) for v in [.1,1,10]],
 'K nearest neighbours':[Learner('knn_reg',k=v) for v in [11,31,61]]}
result={'scope':'Synthetic educational data only; models are separate from the website rule engine','seed':SEED,'versions':{'python':platform.python_version(),'numpy':np.__version__,'pandas':pd.__version__,'learner_implementation':'NumPy teaching implementation','matplotlib':matplotlib.__version__},'features':CAT+NUM,'splits':{},'classification':[],'regression':[],'search':{}}
for s,d in dfs.items():
    result['splits'][s]={'rows':len(d),'start':d.flight_date.min(),'end':d.flight_date.max(),'delayed':int(d.delayed_15_plus.sum()),'on_time':int((d.delayed_15_plus==0).sum()),'sha256':hashlib.sha256((DATA/f'{s}.csv').read_bytes()).hexdigest()}
result['data_summary']={'rows':len(all_df),'missing_cells':int(all_df.isna().sum().sum()),'duplicate_ids':int(all_df.record_id.duplicated().sum()),'delayed':int(all_df.delayed_15_plus.sum()),'mean_delay':float(all_df.departure_delay_minutes.mean()),'median_delay':float(all_df.departure_delay_minutes.median()),'max_delay':int(all_df.departure_delay_minutes.max()),'destinations':all_df.destination.value_counts().to_dict()}
selected={}
for task,models,target in [('classification',cls,'delayed_15_plus'),('regression',regs,'departure_delay_minutes')]:
    trials=[]; family=[]
    for name,candidates in models.items():
        fits=[]
        for estimator in candidates:
            model=pipe(estimator).fit(X['train'],dfs['train'][target])
            pred=model.predict(X['validation'])
            score=f1_score(dfs['validation'][target],pred) if task=='classification' else -mean_absolute_error(dfs['validation'][target],pred)
            fits.append((float(score),model))
            trials.append({'family':name,'validation_selection_score':float(score),'params':estimator.get_params()})
        score,model=max(fits,key=lambda x:x[0]);family.append((score,name,model))
    # Freeze family/hyperparameter choice using validation before any test evaluation.
    score,bestname,best=max(family,key=lambda x:x[0])
    result[task+'_selected']=bestname;selected[task]=best
    for score,name,model in family:
        pred=model.predict(X['test'])
        met=cmets(dfs['test'][target],pred,model.predict_proba(X['test'])[:,1]) if task=='classification' else rmets(dfs['test'][target],pred)
        result[task].append({'model':name,'validation_score':score,**met,'parameters':model.named_steps['model'].get_params()})
    result['search'][task]=trials
    joblib.dump(best,OUT/f'{task}_model.joblib')
    print(task,bestname,flush=True)

best=selected['classification']; reg=selected['regression']; test=dfs['test']
predictions=test[['record_id','departure_delay_minutes','delayed_15_plus']].copy()
predictions['predicted_class']=best.predict(X['test']);predictions['delay_probability']=best.predict_proba(X['test'])[:,1];predictions['predicted_minutes']=reg.predict(X['test'])
predictions.to_csv(OUT/'test_predictions.csv',index=False)
importance=permutation_importance(best,X['validation'],dfs['validation'].delayed_15_plus,n_repeats=8,random_state=SEED,scoring='f1',n_jobs=2)
result['permutation_importance']=[{'feature':f,'mean':float(m),'std':float(s)} for f,m,s in zip(CAT+NUM,importance.importances_mean,importance.importances_std)]
# Fixed novel scenarios chosen without inspecting test outcomes; no truth labels exist.
novel=pd.DataFrame([
 dict(destination='BLR',weather='Clear',departure_hour_ist=10,day_of_week=5,month=10,congestion_pct=25,incoming_delay_minutes=0,distance_km=456,scheduled_duration_minutes=72),
 dict(destination='BLR',weather='Rain',departure_hour_ist=18,day_of_week=5,month=10,congestion_pct=60,incoming_delay_minutes=20,distance_km=456,scheduled_duration_minutes=72),
 dict(destination='BLR',weather='Thunderstorm',departure_hour_ist=18,day_of_week=5,month=10,congestion_pct=85,incoming_delay_minutes=45,distance_km=456,scheduled_duration_minutes=72)])
novel['probability']=best.predict_proba(features(novel))[:,1];novel['predicted_class']=best.predict(features(novel));novel['predicted_minutes']=reg.predict(features(novel));result['new_examples']=novel.to_dict(orient='records')
(OUT/'metrics.json').write_text(json.dumps(result,indent=2),encoding='utf8')
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False,'axes.titleweight':'bold','figure.facecolor':'white','savefig.facecolor':'white'})
def save(name): plt.savefig(FIG/f'{name}.png',dpi=190,bbox_inches='tight');plt.close()
tr=dfs['train'];fig,axs=plt.subplots(1,2,figsize=(10,3.5));axs[0].bar(['Below 15 min','15 min or more'],tr.delayed_15_plus.value_counts().sort_index(),color=['#64748b','#176b87']);axs[0].set_ylabel('Training records');axs[0].set_title('Training class distribution');axs[1].hist(tr.departure_delay_minutes,bins=25,color='#176b87',edgecolor='white');axs[1].set_xlabel('Synthetic departure delay in minutes');axs[1].set_ylabel('Records');axs[1].set_title('Training delay distribution');fig.tight_layout();save('eda_distribution')
fig,axs=plt.subplots(1,2,figsize=(10,3.5));w=tr.groupby('weather').delayed_15_plus.mean().reindex(['Clear','Rain','Fog','Thunderstorm'])*100;axs[0].bar(w.index,w,color='#176b87');axs[0].set_ylabel('Delayed training records (%)');axs[0].tick_params(axis='x',rotation=18);h=tr.groupby('departure_hour_ist').departure_delay_minutes.mean();axs[1].plot(h.index,h,'o-',color='#176b87');axs[1].set_xlabel('Departure hour in IST');axs[1].set_ylabel('Mean synthetic delay in minutes');fig.tight_layout();save('eda_conditions')
cm=confusion_matrix(test.delayed_15_plus,predictions.predicted_class);fig,ax=plt.subplots(figsize=(5.5,3.6));ax.imshow(cm,cmap='Blues');ax.set(xticks=[0,1],yticks=[0,1],xticklabels=['Below 15 min','Delayed'],yticklabels=['Below 15 min','Delayed'],xlabel='Predicted class',ylabel='Actual class',title=f'{result["classification_selected"]} on 900 test records');
for i in range(2):
 for j in range(2): ax.text(j,i,str(cm[i,j]),ha='center',va='center',fontsize=19,color='white' if cm[i,j]>cm.max()/2 else 'black')
fig.tight_layout();save('confusion_matrix')
fig,axs=plt.subplots(1,2,figsize=(10,3.4));axs[0].scatter(test.departure_delay_minutes,predictions.predicted_minutes,s=9,alpha=.35,color='#176b87');axs[0].plot([0,150],[0,150],'--',color='#333333');axs[0].set(xlabel='Actual synthetic delay in minutes',ylabel='Predicted delay in minutes');axs[1].hist(predictions.predicted_minutes-test.departure_delay_minutes,bins=30,color='#176b87',edgecolor='white');axs[1].set(xlabel='Prediction minus actual in minutes',ylabel='Test records');fig.tight_layout();save('regression_errors')
imp=pd.DataFrame(result['permutation_importance']).sort_values('mean');fig,ax=plt.subplots(figsize=(8,3.4));ax.barh(imp.feature,imp['mean'],xerr=imp['std'],color='#176b87');ax.set_xlabel('Decrease in validation F1 after permutation');fig.tight_layout();save('feature_importance')
(OUT/'data').mkdir(exist_ok=True)
for s in dfs: shutil.copyfile(DATA/f'{s}.csv',OUT/'data'/f'{s}.csv')
if BASE.name=='work':
    shutil.copyfile(__file__,OUT/'run_experiment.py')
    shutil.copyfile(BASE/'slap_numpy_models.py',OUT/'slap_numpy_models.py')
(OUT/'requirements.txt').write_text('\n'.join(f'{k}=={v}' for k,v in [('numpy',np.__version__),('pandas',pd.__version__),('matplotlib',matplotlib.__version__),('joblib',joblib.__version__)]))
print(json.dumps({k:result[k] for k in ['data_summary','classification_selected','regression_selected','classification','regression','new_examples']},indent=2))
