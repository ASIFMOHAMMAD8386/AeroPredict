"""Local browser interface for the separate synthetic ML experiment."""
from pathlib import Path
from http.server import BaseHTTPRequestHandler, HTTPServer
import json, webbrowser
import pandas as pd
import joblib
ROOT=Path(__file__).resolve().parent
classifier=joblib.load(ROOT/'classification_model.joblib')
regressor=joblib.load(ROOT/'regression_model.joblib')
PAGE='''<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>AeroPredict ML Experiment</title><style>
body{font:17px system-ui;background:#f2f5f8;color:#152b40;margin:0}main{max-width:850px;margin:40px auto;padding:30px;background:white;border-radius:16px}h1{font-size:32px}label{display:flex;flex-direction:column;gap:8px}form{display:grid;grid-template-columns:1fr 1fr;gap:18px}input,select,button{padding:12px;font:inherit;border:1px solid #a4b1bd;border-radius:7px}button{background:#145b78;color:white;cursor:pointer}#result{margin-top:24px;line-height:1.7}small{color:#526475}@media(max-width:550px){form{grid-template-columns:1fr}main{margin:12px}}
</style></head><body><main><small>AEROPREDICT / SUPERVISED LEARNING EXPERIMENT</small><h1>Predict a synthetic flight delay</h1><p>HYD to BLR. Trained logistic and ridge regression models. Educational synthetic data only.</p><form id="form">
<label>Weather<select name="weather"><option>Clear</option><option>Rain</option><option>Fog</option><option selected>Thunderstorm</option></select></label>
<label>Congestion percentage<input name="congestion_pct" type="number" min="0" max="100" value="85" required></label>
<label>Incoming delay in minutes<input name="incoming_delay_minutes" type="number" min="0" max="180" value="45" required></label>
<label>Departure hour in IST<input name="departure_hour_ist" type="number" min="0" max="23" value="18" required></label>
<button>Run trained models</button></form><section id="result" aria-live="polite"></section><p><small>Probability is not calibrated on real flights. This experiment is separate from the main website Simulation and Live modes.</small></p></main><script>
document.querySelector('form').onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));const r=await fetch('/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const d=await r.json();document.querySelector('#result').textContent=d.error||`Delay class: ${d.predicted_class?'15 minutes or more':'Below 15 minutes'} | Model probability: ${(d.probability*100).toFixed(1)}% | Estimated delay: ${d.minutes.toFixed(1)} minutes`;};</script></body></html>'''
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path!='/':self.send_error(404);return
  b=PAGE.encode();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
 def do_POST(self):
  try:
   if self.path!='/predict':self.send_error(404);return
   size=int(self.headers.get('Content-Length','0'))
   if not 0<size<2048:raise ValueError('Invalid request size')
   a=json.loads(self.rfile.read(size));weather=a['weather']
   if weather not in ['Clear','Rain','Fog','Thunderstorm']:raise ValueError('Choose a valid weather condition')
   vals={k:float(a[k]) for k in ['congestion_pct','incoming_delay_minutes','departure_hour_ist']}
   if not(0<=vals['congestion_pct']<=100 and 0<=vals['incoming_delay_minutes']<=180 and 0<=vals['departure_hour_ist']<=23 and vals['departure_hour_ist'].is_integer()):raise ValueError('Inputs are outside supported ranges')
   x=pd.DataFrame([dict(destination='BLR',weather=weather,day_of_week=5,month=10,distance_km=456,scheduled_duration_minutes=72,evening_peak=int(16<=vals['departure_hour_ist']<=22),**vals)])
   d=dict(predicted_class=int(classifier.predict(x)[0]),probability=float(classifier.predict_proba(x)[0,1]),minutes=float(regressor.predict(x)[0]));status=200
  except (ValueError,KeyError,TypeError):d={'error':'Enter valid values in every field.'};status=400
  b=json.dumps(d).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
if __name__=='__main__':
 print('ML demo at http://127.0.0.1:4188',flush=True)
 webbrowser.open('http://127.0.0.1:4188')
 HTTPServer(('127.0.0.1',4188),Handler).serve_forever()
