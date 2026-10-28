# AeroPredict Local Presentation

**Start here:** Extract the complete ZIP and double-click **START_HERE.cmd**. It opens the local website immediately, then connects public sharing. The class QR appears automatically when verified; the simulator stays usable if sharing is delayed or unavailable. Expired tunnels are replaced automatically. Classmates can use any Wi-Fi or mobile data while sharing is active and your laptop stays awake and online. **STOP_HERE.cmd** stops the session. Node.js 24+ is required. See **READ_ME_FIRST.txt** and **GITHUB_UPLOAD.md** for the short instructions and GitHub upload steps.

This is the complete local project: Simulation, Live Flights, a Node.js backend, a persistent SQLite cache and request counter, an editable Blender aircraft, synthetic training CSVs, tests and presentation notes. Both modes run from your computer. All website assets are bundled locally.

## Public QR access from any network

Double-click **START_PUBLIC.cmd** for classmates using mobile data or a different Wi-Fi. It starts the local server if needed, creates or reuses a temporary Cloudflare HTTPS tunnel, verifies the public endpoint, and updates `presentation/PUBLIC_LINKS.txt` and `presentation/*-public-qr.png` / `.svg` files. On first use on another Windows x64 computer, it downloads the official pinned Cloudflare executable and verifies its SHA-256 checksum. No Cloudflare account or purchased domain is required.

The project still runs on this laptop. **Keep the laptop awake, connected to the Internet, and the local server and tunnel running.** Public access stops when the tunnel stops. A newly created tunnel gets a different hostname; use the newly generated public QR rather than an older printed one. Quick Tunnels are temporary demonstration links with no uptime guarantee.

The site's **Share QR** automatically uses the verified public address while public sharing is active, even if you opened the site through the local Wi-Fi address. Refresh an already-open browser tab after starting public sharing. Use the public QR files for people outside your network; the local QR files still require the same Wi-Fi.

**STOP_PUBLIC.cmd** ends public sharing while leaving the local project running. **STOP_LOCAL.cmd** stops both. The small tunnel executable and active tunnel metadata are stored privately in `.local/` and excluded from the source ZIP. Your API key remains in the local backend; the tunnel exposes the website and its read-only flight endpoints. Local shutdown is blocked through the public proxy.

Official guide: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

## Start on this computer

Double-click **START_LOCAL.cmd**. It starts the server in the background and opens your Wi-Fi address. If it is already running, it opens the existing server. Your supplied API key is already configured privately on this computer.

Current addresses, verified on 21 October 2026:

- Simulation: http://192.168.0.150:4180/simulation/
- Live Flights: http://192.168.0.150:4180/live/
- Computer-only fallback: http://localhost:4180/simulation/ and http://localhost:4180/live/

Double-click **STOP_LOCAL.cmd** to stop this project's server. Leave the server running during your presentation. You can also run `node server.mjs` in a terminal and stop it with Ctrl+C. Node.js 24 or newer is required; it is already installed on this computer. No npm install, cloud deployment or database service is needed.

## QR access for classmates

Open the Wi-Fi address, then click **Share QR**. The QR contains the current mode's local address. Phones must be on the same Wi-Fi or your laptop's hotspot, and the laptop must stay on. If Windows asks, allow Node.js on the trusted Private network. Some campus or guest networks isolate devices; use a shared hotspot in that case. This local URL is not accessible from arbitrary networks on the Internet.

Your IP can change when you change networks. START_LOCAL.cmd discovers the current IPv4 address each time. Generate the QR again after moving to another network. A QR created from localhost opens the viewer's own device, so use the Wi-Fi address for sharing.

The launcher also updates `presentation/simulation-local-qr.svg` and `presentation/live-local-qr.svg`, plus matching PNG copies. These QR files can be inserted into slides or printed. Run `node generate-qr.mjs` to regenerate them manually.

## Live Flights

Live mode reads Aviationstack through the local server; the browser never receives the key. Internet access is needed for new real provider data. Startup and saved-snapshot loading make no flight-provider calls. Load/Refresh may make one request if the five-minute cache and cooldown allow it. Saved data older than five minutes is labelled as a saved snapshot. Provider records can be partial and delayed. A 3D aircraft is shown on the globe only when the provider supplies a timestamped coordinate.

The local counter started with 4 known earlier attempts. The latest verified saved snapshot contains 11 matching flight records; the local counter is now 6 of 100 attempts. The persistent database is in `.local/flight-cache.sqlite`; restarting does not reset it. Failed attempts count too. This installation stops at 100 attempts with no automatic reset. Other installations or tools using the same account are not included, so check the provider's actual remaining quota before running multiple installations. Do not delete the database to restore calls. `.env.example` conservatively starts new copies with 6 known attempts; update PRIOR_API_CALLS upward if more have been used.

## Copying the project to another computer

1. Extract the source ZIP and install Node.js 24 or newer if needed.
2. Run **SET_API_KEY.cmd** and enter your own Aviationstack key privately. The key is saved in `.env`, outside the public folder. The input is hidden.
3. Run **START_LOCAL.cmd**. Open its newly detected Wi-Fi address.

The ZIP intentionally excludes the actual `.env`, logs, database, process information and Git history. It includes `.env.example`. Your configured source folder on this computer also contains your private configuration; do not display or share that file during the presentation.

## Show the source and explain it

Read **CODE_INDEX.md** for a file-by-file code guide and **PRESENTATION_NOTES.md** for the demonstration and questions. The source is formatted for reading. The `public/` folder contains the HTML, CSS, browser JavaScript, models and images. The server serves only public files and API routes; source files, the key and SQLite database are outside that directory.

```text
START_LOCAL.cmd / launch.mjs -> local Node.js server
  /simulation/ -> user conditions -> rule engine -> delay result and globe
  /live/ -> /api/flights -> SQLite budget reservation -> Aviationstack
                               -> normalized records -> cache -> browser
  Share QR -> current Wi-Fi address -> classmates on the same network
```

## Verify the code

From this folder run `npm test`. Tests use temporary SQLite databases and mock provider responses; they consume no real API calls. They check simulation behavior, normalization, missing fields, secret redaction, caching, concurrent reservations, the 100-call ceiling, local HTTP routes, private-file protection and persistence after restart.

## What the project demonstrates

Simulation is a transparent rule-based educational estimate. Live Flights displays provider-reported schedules, status and delay. The 6,000 training records are synthetic and separate from the rule engine. Neither mode claims a trained or validated real-world delay model. See training-data/README.md before using the CSVs in a machine-learning experiment. Retain the third-party licences and imagery attribution in public/\*/vendor/.


## Route explorer update

Top view, Side view and Along route focus the camera on the selected airport connection. World view restores the whole Earth. Drag or use the arrow controls to orbit, scroll or pinch to zoom, and use the zoom slider for precise framing. Reset view or the R key restores Airport film in Simulation and the route view in Live. World view caps the aircraft at 24 screen pixels; route and aircraft cameras enlarge it for presentation.

Live Flights supplies schedules, reported delays and a timestamped position only when the provider includes it. The dashed curve is a calculated airport connection, not a recorded flight track, airway or departure procedure. The line is raised for visibility and does not show actual flight altitude. A true flown path requires a series of timestamped aircraft positions; one schedule record or position cannot reconstruct it.


## Classroom flight demonstration

Start a Simulation, then select Present to class. Airport film begins with the Blender airport: taxi to the runway, accelerate, take off, cruise across the globe, approach, land, and taxi to the arrival gate before four crew unload baggage from the arriving aircraft. A complete compressed journey takes 120 seconds at 1×. Use the stage buttons to pause at a chosen part, then Play flight to continue. Aircraft camera, Airport overview and Runway camera give different airport angles; drag to orbit and scroll to zoom. Globe presets remain available. Inspect aircraft opens the large rotatable model; Escape exits classroom view. Airport layouts, timing and altitude are illustrative. At cruise the airport and globe backgrounds blend over four seconds, while one foreground aircraft moves and rotates between camera poses. The same gradual transition leads into arrival. Airport camera changes ease into place.

Aircraft size is exaggerated for visibility: up to 76 screen pixels in a route view, up to 160 in the aircraft camera, and 24 in World view. The line and aircraft are raised above the globe for readability, without representing real altitude. Live Flights keeps its provider position fixed at the supplied timestamp and has no animated journey or progress estimate. Its dashed line remains a reference airport connection, not a recorded flight track.


### Crew and weather demonstration

Choose weather on the scenario form, Start prediction, then Present to class. Clear, Rain, Thunderstorm and Fog visibly change airport conditions. These are simulated conditions. Click **Crew unloading baggage** and Play flight to show the arrived aircraft, four workers, the open cargo hatch and eight bags unloading into trolleys. The film finishes at 120 seconds. Drag to change angle and scroll to zoom. Ground crew also gives a close view of the arrival worksite during arrival.

Updated website screenshots are in `presentation/arrival-crew-final.png`, `presentation/airport-rain-final.png`, `presentation/airport-storm-final.png` and `presentation/airport-fog-final.png`.
