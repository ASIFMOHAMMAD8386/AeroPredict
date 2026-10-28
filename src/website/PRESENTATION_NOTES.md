# AeroPredict classroom presentation

## Working airport demonstration

For the main aircraft takeoff, click **▶ Takeoff shot** beside Inspect aircraft. It begins during the runway roll, shows the nose rotating up and the aircraft lifting off, and pauses airborne after 13.5 seconds at 1×. Replay takeoff repeats the shot. Restart flight returns to the complete journey. Takeoff camera uses a close, low front-side angle with the runway behind the aircraft.

Choose Simulation, Start prediction, Present to class, then Airport life. Ground crew shows high-visibility workers loading baggage onto a moving conveyor, carrying cases, and marshalling. Arrivals & departures follows the secondary-runway aircraft: approach at 0–7 demo seconds, landing/rollout at 7–14, exit at 14–18; departure taxi begins at 15, line-up at 20, acceleration at 23 and climb at 31. Airport overview shows the redesigned terminal, two runways, parked jets and moving services. All timings are compressed and invented.

Pause freezes the whole scene, not just the main plane. Use 0.5× to present individual actions. Airport life remains at the airport while the main journey clock advances. Airport film resumes the main aircraft journey and globe transitions. The editable current Blender file is airport/aeropredict-airport-living.blend; its crew, service and traffic animations can be inspected on the timeline.

## Opening explanation

“AeroPredict explores departures from Hyderabad to six South India destinations. Simulation lets us change assumed conditions and observe a transparent delay estimate. Live Flights reads schedules and reported delays from Aviationstack through our own local backend. The globe and Blender aircraft make the route easier to understand.”

Use “rule-based simulation” for the simulated score and “provider-reported delay” for Live. The current project has no trained or validated historical prediction model.

## Six demonstration steps

1. Run START_PUBLIC.cmd if classmates use other networks, or START_LOCAL.cmd for a local-only demonstration. Show the generated address. Both frontend and backend run on the laptop. No hosted website is required.
2. Open Simulation. Use HYD to BLR, Clear weather, 35% traffic, 10-minute incoming delay and 18:30 IST. Start prediction. The result is about 21 minutes and 21% illustrative risk.
3. Change to Thunderstorm, 85% traffic and 45-minute incoming delay, with the same evening time. The result becomes about 66 minutes and 89% illustrative risk. Explain that the coefficients are chosen demonstration assumptions.
4. Drag the globe, use left/right arrows and zoom in. Show that aircraft size stays capped. Explain that the animated path is illustrative. Open the editable Blender file to show the wings, winglets and twin engines.
5. Open Live Flights. The latest saved snapshot loads without a provider call. Show the fetch time, stale label if present, selected flight and reported delay. If a fresh request is needed, press Load once and point out the usage counter. The recent local connection test returned 11 records; later snapshots may differ.
6. Open Share QR after starting public sharing. Classmates on any Internet connection can scan the public link. Show CODE_INDEX.md and then the main server, rule engine and globe source files. Finish with the synthetic CSV and future research work.

## Explain the equations

W is the weather weight: Clear 0, Rain 1.1, Thunderstorm 2.2 and Fog 1.7. C is traffic as a fraction, I is incoming delay in minutes, and E is 1 for evening departures from 16:00 through 22:59 IST.

```text
z = -2.4 + W + 1.2*C + 0.018*I + 0.45*E
illustrative probability = 1 / (1 + exp(-z))
simulated delay = round(4 + 8*W + 12*C + 0.6*I + 7*E)
```

The shown range is an illustrative band, not a statistical confidence interval. The equations are deterministic and do not learn from the CSV. The same conditions produce the same output.

## Explain the backend

The browser calls a local API route. The server checks the private key, then reads a shared SQLite cache. A fresh provider request requires an atomic budget reservation. The server filters and normalizes the provider response, saves it locally and returns only safe flight fields. The key is never returned. Unknown delays remain unknown rather than becoming zero.

The five-minute cache and cooldown reduce repeated calls. Failed attempts count. The persistent counter stops this installation at 100 attempts and never resets automatically. Other installations using the account have separate counters; the account dashboard remains the authority for actual remaining quota.

## Questions you may get

**Is it machine learning?** The current delay estimate is a rule engine. The synthetic CSVs support a separate learning experiment; real prediction research needs licensed historical outcomes and features captured before departure.

**Is the moving plane a live aircraft?** Simulation animates it for explanation. Live mode shows a timestamped provider position only when supplied and otherwise shows the route without a moving aircraft.

**Why use SQLite?** It preserves snapshots and the budget across restarts and allows a single atomic call reservation. Node.js 24 includes the SQLite API, so the local backend needs no installed database service.

**What is the API key?** A private credential identifying the flight-data account. The server uses it for official requests; we keep it outside public files and omit it from the hand-in ZIP.

**Can anyone scan the QR?** The public QR uses a temporary Cloudflare tunnel and works from other Internet networks while the laptop and tunnel run. Local QR files require the same Wi-Fi. A new tunnel gets a new hostname.

**What is in the CSV?** 6,000 invented educational records, split chronologically into 4,200 training, 900 validation and 900 test rows. They are not real airline history. Exclude both target columns from input features.

**What would improve real-world prediction?** Licensed historical data, a defined pre-departure prediction cutoff, date-based evaluation, comparison with simple baselines and measured calibration/error on genuinely unseen flight records.


## Route explorer update

Top view, Side view and Along route focus the camera on the selected airport connection. World view restores the whole Earth. Drag or use the arrow controls to orbit, scroll or pinch to zoom, and use the zoom slider for precise framing. Reset view or the R key restores Airport film in Simulation and the route view in Live. World view caps the aircraft at 24 screen pixels; route and aircraft cameras enlarge it for presentation.

Live Flights supplies schedules, reported delays and a timestamped position only when the provider includes it. The dashed curve is a calculated airport connection, not a recorded flight track, airway or departure procedure. The line is raised for visibility and does not show actual flight altitude. A true flown path requires a series of timestamped aircraft positions; one schedule record or position cannot reconstruct it.


## Classroom flight demonstration

Start a Simulation, then select Present to class. Airport film begins with the Blender airport: taxi to the runway, accelerate, take off, cruise across the globe, approach, land, and taxi to the arrival gate before four crew unload baggage from the arriving aircraft. A complete compressed journey takes 120 seconds at 1×. Use the stage buttons to pause at a chosen part, then Play flight to continue. Aircraft camera, Airport overview and Runway camera give different airport angles; drag to orbit and scroll to zoom. Globe presets remain available. Inspect aircraft opens the large rotatable model; Escape exits classroom view. Airport layouts, timing and altitude are illustrative. At cruise the airport and globe backgrounds blend over four seconds, while one foreground aircraft moves and rotates between camera poses. The same gradual transition leads into arrival. Airport camera changes ease into place.

Aircraft size is exaggerated for visibility: up to 76 screen pixels in a route view, up to 160 in the aircraft camera, and 24 in World view. The line and aircraft are raised above the globe for readability, without representing real altitude. Live Flights keeps its provider position fixed at the supplied timestamp and has no animated journey or progress estimate. Its dashed line remains a reference airport connection, not a recorded flight track.


### Crew and weather demonstration

Choose weather on the scenario form, Start prediction, then Present to class. Clear, Rain, Thunderstorm and Fog visibly change airport conditions. These are simulated conditions. Click **Crew unloading baggage** and Play flight to show the arrived aircraft, four workers, the open cargo hatch and eight bags unloading into trolleys. The film finishes at 120 seconds. Drag to change angle and scroll to zoom. Ground crew also gives a close view of the arrival worksite during arrival.

Updated website screenshots are in `presentation/arrival-crew-final.png`, `presentation/airport-rain-final.png`, `presentation/airport-storm-final.png` and `presentation/airport-fog-final.png`.
## Start and share with class

Extract the entire ZIP and run **START_HERE.cmd** on Windows x64 with Node.js 24+. It opens the local website first, then connects public sharing. The classroom screen displays the QR automatically once verified. You can use the simulator while the class link connects. Expired tunnels are replaced automatically. Keep the laptop awake and online. Run **STOP_HERE.cmd** after class. A new session may use a new QR. GitHub upload instructions are in **GITHUB_UPLOAD.md**; uploading source alone does not run the backend.

## Blender weather demonstration

Choose Thunderstorm, Start prediction and Present to class. A lightning bolt appears at 4 seconds, with later strikes every 7.5 demo seconds. The cloud texture is a Blender Cycles volume render; the three lightning models are original Blender meshes. Rain impact rings, drifting fog and wet pavement are browser effects using the same film clock. Pause freezes them. Reduced-motion settings disable the lighting flash. Use Clear, Rain or Fog to compare conditions. All weather is simulated.

