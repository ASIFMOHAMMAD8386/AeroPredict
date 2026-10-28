"""Small, auditable NumPy learners for the SLAP teaching experiment."""
import numpy as np

class Learner:
    def __init__(self,kind,**params): self.kind=kind; self.params=params
    def get_params(self): return {'kind':self.kind,**self.params}
    def fit(self,X,y):
        self.X=np.asarray(X,float);self.y=np.asarray(y);p=self.params
        if self.kind=='logistic':
            a=np.c_[np.ones(len(X)),X];w=np.zeros(a.shape[1]);lam=p['l2'];reg=np.r_[0,np.ones(X.shape[1])]
            for _ in range(100):
                pr=1/(1+np.exp(-np.clip(a@w,-35,35)));v=np.maximum(pr*(1-pr),1e-8)
                grad=a.T@(pr-y)/len(y)+lam*reg*w
                h=(a.T*v)@a/len(y)+np.diag(lam*reg+1e-8)
                step=np.linalg.solve(h,grad);w-=step
                if np.max(np.abs(step))<1e-8:break
            self.w=w
        elif self.kind=='ridge':
            a=np.c_[np.ones(len(X)),X];pen=np.diag(np.r_[0,np.full(X.shape[1],p['alpha'])]);self.w=np.linalg.solve(a.T@a+pen,a.T@y)
        elif self.kind=='gaussian':
            self.mu=np.array([X[y==c].mean(axis=0) for c in [0,1]])
            self.var=np.array([X[y==c].var(axis=0) for c in [0,1]])+p['smoothing']
            self.prior=np.array([(y==c).mean() for c in [0,1]])
        return self
    def neighbors(self,X):
        k=self.params['k'];result=[]
        for start in range(0,len(X),64):
            batch=X[start:start+64];dist=((batch[:,None,:]-self.X[None,:,:])**2).sum(axis=2)
            ids=np.argpartition(dist,k-1,axis=1)[:,:k];result.extend(self.y[ids].mean(axis=1))
        return np.array(result)
    def predict_proba(self,X):
        if self.kind=='logistic':p=1/(1+np.exp(-np.clip(np.c_[np.ones(len(X)),X]@self.w,-35,35)))
        elif self.kind=='gaussian':
            log=-.5*np.sum(np.log(2*np.pi*self.var)[None,:,:]+((X[:,None,:]-self.mu[None,:,:])**2)/self.var[None,:,:],axis=2)+np.log(self.prior)
            log-=log.max(axis=1,keepdims=True);pr=np.exp(log);p=(pr/pr.sum(axis=1,keepdims=True))[:,1]
        elif self.kind=='knn_class':p=self.neighbors(X)
        else:p=np.full(len(X),float(self.y.mean()>=.5))
        return np.c_[1-p,p]
    def predict(self,X):
        if self.kind=='mean':return np.full(len(X),self.y.mean())
        if self.kind=='ridge':return np.c_[np.ones(len(X)),X]@self.w
        if self.kind=='knn_reg':return self.neighbors(X)
        return (self.predict_proba(X)[:,1]>=.5).astype(int)

class TeachingPipeline:
    def __init__(self,model,cat,num):self.model=model;self.cat=cat;self.num=num;self.named_steps={'model':model}
    def fit(self,X,y):
        self.categories={c:sorted(X[c].dropna().unique().tolist()) for c in self.cat}
        self.fill={c:X[c].mode()[0] for c in self.cat};n=X[self.num].to_numpy(float)
        self.median=np.nanmedian(n,axis=0);n=np.where(np.isnan(n),self.median,n);self.mean=n.mean(axis=0);self.sd=n.std(axis=0);self.sd[self.sd==0]=1
        self.model.fit(self.transform(X),np.asarray(y));return self
    def transform(self,X):
        cats=[(X[c].fillna(self.fill[c]).to_numpy()[:,None]==np.array(self.categories[c])[None,:]).astype(float) for c in self.cat]
        n=X[self.num].to_numpy(float);n=np.where(np.isnan(n),self.median,n)
        return np.c_[*cats,(n-self.mean)/self.sd]
    def predict(self,X):return self.model.predict(self.transform(X))
    def predict_proba(self,X):return self.model.predict_proba(self.transform(X))

def confusion_matrix(y,p,labels=None):
    y=np.asarray(y);p=np.asarray(p);return np.array([[int(((y==i)&(p==j)).sum()) for j in [0,1]] for i in [0,1]])
def accuracy_score(y,p):return np.mean(np.asarray(y)==np.asarray(p))
def precision_score(y,p,zero_division=0):
    c=confusion_matrix(y,p);return c[1,1]/max(1,c[:,1].sum())
def recall_score(y,p,zero_division=0):
    c=confusion_matrix(y,p);return c[1,1]/max(1,c[1,:].sum())
def f1_score(y,p,zero_division=0):
    c=confusion_matrix(y,p);return 2*c[1,1]/max(1,2*c[1,1]+c[0,1]+c[1,0])
def roc_auc_score(y,p):
    y=np.asarray(y);p=np.asarray(p);a=p[y==1][:,None];b=p[y==0][None,:];return np.mean((a>b)+.5*(a==b))
def mean_absolute_error(y,p):return np.mean(np.abs(np.asarray(y)-p))
def mean_squared_error(y,p):return np.mean((np.asarray(y)-p)**2)
def r2_score(y,p):y=np.asarray(y);return 1-np.sum((y-p)**2)/np.sum((y-y.mean())**2)
def permutation_importance(model,X,y,n_repeats,random_state,**kwargs):
    from types import SimpleNamespace
    rng=np.random.default_rng(random_state);base=f1_score(y,model.predict(X));values=[]
    for col in X:
        drops=[]
        for _ in range(n_repeats):
            other=X.copy();other[col]=rng.permutation(other[col].to_numpy());drops.append(base-f1_score(y,model.predict(other)))
        values.append(drops)
    a=np.array(values);return SimpleNamespace(importances_mean=a.mean(axis=1),importances_std=a.std(axis=1))
