"""Generate submission figures from the unchanged CSVs and measured results."""
from pathlib import Path
import json
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

ROOT = Path(__file__).resolve().parents[2]
def main():
    folder=ROOT/'graphs';folder.mkdir(exist_ok=True)
    metrics=json.loads((ROOT/'results/metrics.json').read_text())
    all_data=pd.concat([pd.read_csv(ROOT/'dataset'/f'{s}.csv') for s in ['train','validation','test']],ignore_index=True)
    ink='#202925';copper='#B98251';green='#6F805D';ivory='#F4F1E9'
    plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.facecolor':ivory,'figure.facecolor':ivory,'axes.labelcolor':ink,'text.color':ink,'axes.edgecolor':'#C5CCBE','xtick.color':ink,'ytick.color':ink,'savefig.facecolor':ivory})
    def save(fig,name):
        fig.text(.02,.015,'Educational synthetic data; not real airline performance.',fontsize=9,color='#69736A')
        fig.tight_layout(rect=(0,.05,1,1));fig.savefig(folder/name,dpi=180);plt.close(fig)
    fig,ax=plt.subplots(figsize=(9,5))
    ax.hist(all_data.departure_delay_minutes,bins=25,color=copper,edgecolor=ivory)
    ax.set(title='Departure delay distribution — all 6,000 synthetic rows',xlabel='Departure delay (minutes)',ylabel='Records')
    save(fig,'delay_distribution.png')
    group=all_data.groupby('weather')['departure_delay_minutes'].mean().reindex(['Clear','Rain','Fog','Thunderstorm'])
    fig,ax=plt.subplots(figsize=(9,5));bars=ax.bar(group.index,group.values,color=[green,green,copper,copper])
    ax.bar_label(bars,fmt='%.1f min',padding=4);ax.set(title='Mean synthetic departure delay by weather',ylabel='Mean delay (minutes)',ylim=(0,float(group.max())*1.2))
    save(fig,'delay_by_weather.png')
    rf=next(x for x in metrics['classification'] if x['family']=='Random Forest')
    cm=np.asarray(rf['confusion_matrix'])
    fig,ax=plt.subplots(figsize=(7,5));ax.imshow(cm,cmap=LinearSegmentedColormap.from_list('forest',[ivory,green]))
    for i in range(2):
        for j in range(2):ax.text(j,i,str(cm[i,j]),ha='center',va='center',fontsize=23,fontweight='bold',color='white' if cm[i,j]>300 else ink)
    ax.set(xticks=[0,1],yticks=[0,1],xticklabels=['Below 15 min','Delayed (>=15 min)'],yticklabels=['Below 15 min','Delayed (>=15 min)'],xlabel='Predicted class',ylabel='Actual class',title='Random Forest confusion matrix — 900 synthetic test rows')
    save(fig,'confusion_matrix.png')
    fam=[x['family'] for x in metrics['classification']]
    fig,axes=plt.subplots(1,2,figsize=(12,5))
    b=axes[0].bar(fam,[100*x['f1'] for x in metrics['classification']],color=[green,green,copper]);axes[0].bar_label(b,fmt='%.1f%%',padding=4);axes[0].set(title='Classification F1',ylabel='F1 (%)',ylim=(0,100))
    b=axes[1].bar(fam,[x['mae'] for x in metrics['regression']],color=[green,green,copper]);axes[1].bar_label(b,fmt='%.2f',padding=4);axes[1].set(title='Regression mean absolute error',ylabel='MAE (minutes)',ylim=(0,26))
    fig.suptitle('Model comparison — original held-out synthetic test split',fontsize=15)
    save(fig,'model_comparison.png')
    print('Generated four figures in graphs/. No dataset or model files changed.')
if __name__=='__main__':main()
