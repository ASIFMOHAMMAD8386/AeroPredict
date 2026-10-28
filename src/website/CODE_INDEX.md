# Code guide for the presentation

Read these files in this order. Public files are duplicated between the two mode folders so each mode can be opened and inspected independently; they use the same globe and rule engine.

| File                                  | What to explain                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| server.mjs                            | Reads private settings, opens SQLite and starts the HTTP server on all local interfaces.                   |
| server/http.mjs                       | Serves only public files and implements the API routes. Rejects private paths and unsupported methods.     |
| server/settings.mjs                   | Reads the local configuration and discovers Wi-Fi addresses. It never sends the key to the browser.        |
| server/storage.mjs                    | Adapts SQLite prepared statements to the cache/budget interface and preserves the counter.                 |
| server/schema.sql                     | Defines api_budget and api_snapshot tables.                                                                |
| server/budget.mjs                     | Reserves a call atomically, enforces cooldown and limit, and reads/writes snapshots.                       |
| server/flights.mjs                    | Calls Aviationstack, selects HYD departures to six destinations, normalizes fields and sanitizes failures. |
| public/simulation/index.html          | The form, route result, globe controls and QR dialog. The mode flag selects Simulation.                    |
| public/live/index.html                | The flight picker and reported-delay result. The mode flag selects Live.                                   |
| public/simulation/journey.mjs         | Connects controls, results, live endpoints and QR sharing. The live folder uses the same implementation.   |
| public/simulation/engine.mjs          | Airport coordinates, IST helpers and the deterministic simulation equations.                               |
| public/simulation/globe.mjs           | Creates the textured Earth, route, Blender aircraft, orbit controls and zoom-size cap.                     |
| public/simulation/aircraft-viewer.mjs | The draggable aircraft preview on the landing page.                                                        |
| public/simulation/journey.css         | Responsive amber/blue layouts and accessible controls.                                                     |
| public/simulation/site-config.js      | Connects the local Simulation and Live tabs.                                                               |
| launch.mjs and START_LOCAL.cmd        | Starts or reuses the local server and opens the Wi-Fi address.                                             |
| stop.mjs and STOP_LOCAL.cmd           | Stops only this server through a protected loopback control request.                                       |
| configure-key.mjs and SET_API_KEY.cmd | Accepts a hidden API key on another computer and saves it privately.                                       |
| tests/test-projects.mjs               | Tests the simulation and provider/cache/budget logic without real requests.                                |
| tests/local-server.mjs                | Tests local HTTP, asset serving, private-file protection and persistent SQLite state.                      |
| aircraft/create-aircraft.py           | Blender authoring source for the airliner.                                                                 |
| aircraft/aeropredict-airliner.blend   | Editable Blender project.                                                                                  |
| aircraft/aeropredict-airliner.glb     | Optimized web export of the aircraft.                                                                      |
| training-data/                        | Full synthetic CSV, chronological splits, metadata and generation assumptions.                             |
| public/\*/vendor/                     | Bundled Three.js, GLTFLoader, QR library, country geometry, Earth imagery and licences.                    |

The private `.env` and `.local/` directory are runtime state, not presentation material. They are excluded from the source ZIP.

QR export code is in `server/qr-files.mjs` and `server/qr-png.mjs`. The `generate-qr.mjs` command updates SVG and PNG QR files for the current Wi-Fi address using only Node built-ins and the bundled QR library.

Public sharing is controlled by `START_PUBLIC.cmd` / `public-share.mjs` and `STOP_PUBLIC.cmd` / `public-stop.mjs`. The starter verifies the official tunnel executable, connects it to this server, checks public reachability and updates public QR files. `/api/share` returns only the verified public base URL while its process is alive. The actual key and tunnel state stay outside public files.


## Current aircraft model

Open aircraft/aeropredict-airliner-v2.blend for the current model. The procedural source is aircraft/create-aircraft-v2.py; aircraft/aeropredict-airliner-v2.glb is copied to both public mode asset folders. aircraft/aircraft-v2-render.png is the Blender studio render. The older unversioned aircraft files are retained as the previous version.


## Blender airport and full journey

Current working-airport files: `airport/aeropredict-airport-living.blend`, `airport/create-airport-life.py`, `airport/animate-airport-life.py` and `airport/add-apron-details.py`. Browser actors are managed by `public/simulation/airport-activity.mjs`; deterministic traffic schedules and crew routes are in `public/simulation/airport-traffic.mjs`. `tests/airport-activity.mjs` verifies traffic-stage continuity, ground height, aircraft separation, separate-runway use and runway occupancy.

- `airport/aeropredict-airport-flight.blend`: editable airport environment, detailed aircraft with landing gear, departure-to-arrival keyframes and a following camera.
- `airport/create-airport.py`: original Blender authoring source; `airport/README.md` explains exports and coordinates.
- `public/simulation/airport-scene.mjs`: Three.js airport viewer and aircraft, overview and runway cameras.
- `public/simulation/flight-sequence.mjs`: shared 120-second stage timing, taxi positions, acceleration, climb and arrival positions.
- `public/simulation/globe.mjs`: owns the single playback clock and cuts between airport scenes and globe cruise.
- `tests/flight-sequence.mjs`: checks joined ground stages, safe heights, finite scrubbing, route progress and final gate arrival.

The airport film is Simulation-only. Live retains its separate globe code and timestamped provider snapshot behavior.


- `airport/add-arrival-unloading.py`: Blender arrival scene and exported cargo/equipment prototypes.
- `public/simulation/arrival-unloading.mjs`: arriving aircraft cargo hatch, four workers, belt and trolley choreography.
- `public/simulation/unloading-state.mjs`: deterministic equipment and eight-bag schedule.
- `public/simulation/airport-weather.mjs`: procedural sky/clouds, rain, wet surfaces and fog.
- `public/simulation/weather-profile.mjs`: four visual scenario profiles.
- `tests/weather-unloading.mjs`: weather distinctions and completion of unloading within the film.
- `START_HERE.cmd` / `start-here.mjs`: one manual start option for local server, verified public tunnel and classroom sharing screen.
- `server/classroom-page.mjs`: creates the QR presentation page after successful public verification.
- `GITHUB_UPLOAD.md`: GitHub Desktop source upload and hosting explanation.
- `airport/create-weather.py` / `airport/aeropredict-weather.blend`: original rendered cloud and branched lightning assets.
- `public/simulation/weather-effects.mjs` / `weather-timing.mjs`: clouds, fog, lightning, rain impacts and deterministic strike timing.
- `airport/fix-depth-surfaces.py`: union of overlapping asphalt surfaces before export.

- `server/startup-flow.mjs`: opens the local screen before waiting for public sharing; a public failure leaves the local site usable.
- `server/public-health.mjs`: checks the public health endpoint with a bounded DNS retry after a system hostname lookup failure; TLS validation remains enabled.
- `server/tunnel-state.mjs`: identifies Cloudflare's expired-tunnel rejection so the launcher can replace it.

- `server/open-browser.mjs`: starts an installed Brave, Edge or Chrome executable in a visible new window, without depending on Explorer URL forwarding.

