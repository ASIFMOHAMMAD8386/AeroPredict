# AeroPredict Blender airport

## Weather and surface update

`aeropredict-weather.blend` contains the authored Cycles volumetric cloud scene and three original branched lightning meshes. `create-weather.py` recreates the assets. The browser uses the rendered cloud texture and exported lightning mesh, with drifting ground mist, wind-driven rain and pavement impact rings. Thunderstorm has a short lightning event starting at 4 seconds and then every 7.5 seconds; Pause and scrubbing freeze it. Reduced-motion preferences suppress the lighting flash. These remain illustrative scenario effects.

`fix-depth-surfaces.py` rebuilt seven intersecting asphalt slabs into 44 non-overlapping cells at one surface height. It also separates the original terrain box from the detailed meadow; their old 18 mm gap produced a visible repeated ground pattern. The current living Blender file and website GLB contain these fixes. The browser also uses logarithmic depth precision, separated paint layers and diffuse lighting in overcast conditions. Earlier retained source versions remain available.

## Current working airport

Open **aeropredict-airport-living.blend** for the current version. The original airport file below is retained as the earlier version. The living version adds 18 rigged ground crew, marshalling wands, walking and baggage work, moving suitcase conveyors, baggage tractors and trailers, a catering lift, shuttles, a follow-me car, and two background aircraft. A separate western runway keeps simulated background arrivals and departures away from the main demonstration aircraft.

The terminal now has a curved roof, solar strips, numbered gate lounges, facade signage, palms, service-lane markings, and a painted loading zone with safety cones. Eleven detailed parked airliners replace the older simple parked shapes. Shared meshes keep the export compact.

The browser loads `aeropredict-airport-v2.glb` and `aeropredict-airport-activity.glb`. `create-airport-life.py` builds the architecture, rigged asset library and base activity scene; run it after opening the original airport Blender file. `animate-airport-life.py` adds role-specific crew, conveyor and complete baggage-train animations. `add-apron-details.py` adds the marked loading zone, cones and waiting trolley. The saved living Blender file already includes all three passes; they do not need to be rerun for normal use.

On the website, choose **Airport life** for the working airport. **Ground crew** gives a close apron view; **Arrivals & departures** follows the background landing/taxi/takeoff cycle; **Airport overview** shows the whole field. Drag and scroll orbit/zoom around the selected subject. These views stay at the airport throughout the demonstration. **Airport film** returns to the main journey and its gradual globe transitions. Stage buttons return attention to the chosen main-flight stage.

**▶ Takeoff shot**, beside Inspect aircraft, directly plays a 13.5-second runway-to-airborne clip at 1×. The low takeoff camera keeps the aircraft large and shows its nose rotation, main-gear contact, liftoff and gear retraction. It pauses before the globe transition and offers Replay takeoff. Restart flight restores the full journey. `add-takeoff-shot.py` adds the editable Takeoff tracking camera and rotation keys to the saved Blender project.

All people, vehicles and flights follow the same 120-second demonstration clock: Pause freezes them, speed affects them, and scrubbing reproduces their positions. Background air traffic uses a repeating 60-second choreographed cycle. The arrival clears the secondary runway before the departure enters it. This is illustrative animation, not an air traffic control simulator. Runtime behavior is in `airport-activity.mjs` and `airport-traffic.mjs`; it is not streamed from Blender or a real flight feed.

## Earlier airport version

Open **aeropredict-airport-flight.blend** in Blender. The active scene is **AeroPredict Airport Flight**. Press Space to play the editable 3,700-frame animation at 30 fps. The aircraft has location/rotation keyframes and animated landing gear. The follow camera travels with it. Departure and arrival airports are present; the arrival layout is 8 km away in the authoring scene.

The original model includes a 2,300 m runway with threshold and centreline markings, taxiways and hold lines, a terminal with seven jet bridges, a control tower, a hangar, a fire station, apron lights, ground vehicles, baggage carts and eleven parked jets per airport. The moving aircraft is the detailed AeroPredict V2 airliner with landing gear added. These are original illustrative models, not surveyed layouts of HYD or any other real airport.

## Files

- `create-airport.py`: editable Blender Python authoring source. Open the retained aircraft V2 scene before running it; it copies the original airliner mesh into a new airport scene.
- `aeropredict-airport-flight.blend`: airport environment, detailed aircraft, landing gear, cameras and animation.
- `aeropredict-airport.glb`: static airport, consolidated to fourteen material meshes for the website.
- `aeropredict-airport-airliner.glb`: detailed aircraft with independently addressable landing gear. Dimensions are in metres; glTF uses Y-up and nose +Z.
- `airport-overview.png` / `airport-aircraft.png`: actual Blender renders.
- `airport-metadata.json`: scene counts and dimensions.

## Website

Simulation starts with **Airport film**. One 120-second playback clock controls taxi, acceleration, takeoff, globe cruise, approach, landing roll and taxi to the arrival gate before four crew unload baggage from the arriving aircraft. The globe uses the selected South India route. At the cruise transition the backgrounds dissolve between local airport coordinates and the globe; the destination airport reuses the illustrative layout. This is a compressed educational sequence, not a physically accurate flight simulation.

Choose Aircraft camera, Airport overview or Runway camera. Drag the airport view to orbit the aircraft and scroll to zoom. Pause, replay, change speed, scrub the timeline or click a stage to jump there. The stage buttons pause at the selected stage; press Play flight to continue. Other globe views remain available throughout. The browser does not play the Blender keyframes directly; `flight-sequence.mjs` and `airport-scene.mjs` animate the exported models with the shared website clock.

Airport-to-globe and globe-to-airport transitions blend the backgrounds over four seconds. A single foreground airliner interpolates between the two camera poses, avoiding duplicate aircraft during the blend. Its motion continues through the transition. Airport camera changes ease into the new position; takeoff includes a gradual camera arc and pullback.

Live Flights has no fabricated airport animation or route history. It retains provider schedules and timestamped position snapshots only.


## Arrival unloading and weather

The combined airport film lasts two minutes: airport/taxi 0–18 s, runway 18–30 s, takeoff 30–40 s, globe 40–70 s, approach 70–82 s, landing 82–92 s, gate taxi 92–100 s, unloading 100–120 s. The camera moves close to the actual arriving plane for four additional workers, an opening cargo hatch, a wheeled belt loader, and eight bags travelling down the belt into three trolleys. Drag and scroll also work in this close arrival view. Ground crew follows the arrival worksite when used during arrival.

`add-arrival-unloading.py` authored the arrival bridge, cargo hatch, wheeled conveyor and empty trolleys in Blender. The saved living file includes the editable **AeroPredict Arrival Unloading** scene; the website uses the exported prototypes with its shared playback clock. These authoring passes are already applied and should not be rerun on the completed file.

Choose Clear, Rain, Thunderstorm or Fog before starting a simulation. The airport shows matching sky, clouds, lighting, precipitation, pavement wetness and visibility. Rain and worker motions follow the same clock, so Pause and scrubbing remain consistent. Weather is an illustrative scenario, not measured weather or a flight safety model. No weather API calls are made. Live mode does not use this simulation.
