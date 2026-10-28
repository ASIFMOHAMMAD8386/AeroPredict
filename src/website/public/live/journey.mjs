import { airports, simulate, todayIST, timeIST, dateIST } from "./engine.mjs";
import { createGlobe } from "./globe.mjs";
const $ = (id) => document.getElementById(id),
  live = window.AEROPREDICT_MODE === "live";
let globe,
  flights = [],
  selected,
  flightPayload;
const text = (id, value) => ($(id).textContent = value);
function rows(items) {
  $("details").replaceChildren(
    ...items.map(([key, value]) => {
      const div = document.createElement("div"),
        dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = key;
      dd.textContent = value;
      div.append(dt, dd);
      return div;
    }),
  );
}
const stamp = (value) =>
  value ? `${dateIST(value)} · ${timeIST(value)} IST` : "Not supplied";
function showFlight(f) {
  selected = f;
  document.body.classList.remove("presenting");
  text("present", "Present to class");
  $("choose").hidden = true;
  $("result").hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
  text(
    "flight-name",
    live ? `${f.flight_number} · ${f.airline}` : "YOUR SIMULATED JOURNEY",
  );
  text("route-name", `${f.origin} → ${f.destination}`);
  text(
    "route-time",
    `${airports[f.origin].name} to ${airports[f.destination].name} · ${stamp(f.scheduled_departure)}`,
  );
  text("route-kind", live ? "Airport connection · not the actual flown track" : "Simulated route · illustrative animation");
  if (live) {
    text("metric-label", "AIRLINE-REPORTED DEPARTURE DELAY");
    text(
      "metric",
      f.reported_delay === null ? "Unknown" : `${f.reported_delay} min`,
    );
    text("risk", `Status: ${f.status}`);
    text(
      "explanation",
      f.reported_delay === null
        ? "The provider has not supplied a departure delay."
        : "This is the provider’s reported delay, not a model prediction.",
    );
    rows([
      ["Scheduled departure", stamp(f.scheduled_departure)],
      ["Estimated departure", stamp(f.estimated_departure)],
      ["Actual departure", stamp(f.actual_departure)],
      ["Scheduled arrival", stamp(f.scheduled_arrival)],
      ["Data fetched", stamp(flightPayload.fetched_at)],
    ]);
    text(
      "model-note",
      "Want a what-if delay estimate? Choose Simulation at the top. It uses weather, traffic and incoming-aircraft delay.",
    );
    text(
      "position-caption",
      f.live_position
        ? `Aircraft position snapshot as of ${stamp(f.live_position.updated)}. Dashed line connects the airports; the provider has not supplied a recorded flight track. Line elevation is exaggerated for visibility.`
        : "Dashed airport connection only. No aircraft position or recorded flight track was supplied. The line is raised for visibility; it does not show real altitude or an actual departure procedure.",
    );
    $("pause").hidden = true;
    text(
      "result-status",
      `Fetched ${stamp(flightPayload.fetched_at)}. ${flightPayload.stale ? "Saved snapshot is older than five minutes. Press Refresh for newer provider data." : `Snapshot cached for up to ${flightPayload.cache_minutes} minutes.`}`,
    );
  } else {
    const r = simulate(f);
    text("metric-label", "SIMULATED DEPARTURE DELAY");
    text("metric", `${r.minutes} min`);
    text(
      "risk",
      `${Math.round(r.probability * 100)}% illustrative risk · ${r.label}`,
    );
    text(
      "explanation",
      `Scenario range: ${r.low}–${r.high} minutes. Change the conditions to explore a different outcome.`,
    );
    rows(r.factors);
    text(
      "model-note",
      "A transparent, rule-based classroom simulation. These estimates have not been trained or validated against real flights.",
    );
    text(
      "position-caption",
      "Animated scenario along a calculated airport connection. The line is raised for visibility; aircraft movement and altitude are illustrative.",
    );
  }
  globe ??= createGlobe($("globe"));
  globe.select(f, live);
  $("back").focus();
}
function back() {
  document.body.classList.remove("presenting");
  text("present", "Present to class");
  $("result").hidden = true;
  $("choose").hidden = false;
  (live ? $("flight") : $("destination")).focus();
}
$("back").onclick = back;
if (!live) $("new-scenario").onclick = back;
async function fetchFlights(cachedOnly = false) {
  const button = $("fetch");
  button.disabled = true;
  text("connection", "Fetching the latest available flight snapshot…");
  text("error", "");
  try {
    const response = await fetch(cachedOnly ? "/api/snapshot" : "/api/flights");
    const body = await response.json();
    if (!response.ok)
      throw Error(body.message || "Flight data is currently unavailable.");
    if (cachedOnly && !body.flights) {
      text(
        "connection",
        "Connected. Press Load live flights to request a snapshot.",
      );
      return;
    }
    flightPayload = body;
    flights = body.flights;
    const select = $("flight");
    select.replaceChildren();
    for (const f of flights) {
      const option = document.createElement("option");
      option.value = f.id;
      option.textContent = `${f.flight_number} · ${airports[f.destination].name} · ${timeIST(f.scheduled_departure)} IST`;
      select.append(option);
    }
    select.disabled = !flights.length;
    $("start").disabled = !flights.length;
    if (!flights.length) {
      const option = document.createElement("option");
      option.textContent = "No matching South India flights in this snapshot";
      select.append(option);
    }
    text(
      "connection",
      `${flights.length} flights loaded · Aviationstack${body.stale ? " · Saved snapshot" : ""}`,
    );
    text(
      "freshness",
      `Fetched ${stamp(body.fetched_at)}.${body.stale ? " Saved data is older than five minutes; press Load live flights to update." : ""} Cached for up to ${body.cache_minutes} minutes.${body.partial ? " Provider returned a partial page; some flights may be missing." : ""}`,
    );
    if (!$("result").hidden && selected) {
      const updated = flights.find((x) => x.id === selected.id);
      if (updated) showFlight(updated);
      else
        text(
          "result-status",
          "This flight is absent from the new snapshot. The displayed details are from the previous snapshot.",
        );
    }
  } catch (error) {
    if (cachedOnly) {
      text("connection", "Press Load live flights to connect.");
      return;
    }
    text("error", error.message);
    text(
      "connection",
      flights.length
        ? "Refresh unavailable · Previous snapshot retained"
        : "Live data unavailable",
    );
    if (!$("result").hidden) text("result-status", error.message);
  } finally {
    button.disabled = false;
    refreshUsage();
  }
}
if (live) {
  fetch("/api/config")
    .then((r) => r.json())
    .then((data) => {
      if (!data.enabled) text("connection", data.message);
    })
    .catch(() =>
      text("connection", "Connection status unavailable. Try loading flights."),
    );
  $("fetch").onclick = () => fetchFlights(false);
  $("refresh").onclick = () => fetchFlights(false);
  fetchFlights(true);
  $("start").onclick = () => {
    const f = flights.find((x) => x.id === $("flight").value);
    if (f) showFlight(f);
  };
} else {
  for (const [code, a] of Object.entries(airports)) {
    if (code === "HYD") continue;
    const option = document.createElement("option");
    option.value = code;
    option.textContent = `${a.name} · ${code}`;
    $("destination").append(option);
  }
  $("date").value = todayIST();
  $("traffic").oninput = () => text("traffic-val", `${$("traffic").value}%`);
  $("scenario").onsubmit = (e) => {
    e.preventDefault();
    try {
      const f = {
        origin: "HYD",
        destination: $("destination").value,
        scheduled_departure: `${$("date").value}T${$("time").value}:00+05:30`,
        weather: $("weather").value,
        congestion: Number($("traffic").value),
        inbound: Number($("inbound").value),
      };
      simulate(f);
      text("error", "");
      showFlight(f);
    } catch (error) {
      text("error", error.message);
    }
  };
}
$("share").onclick = async () => {
  let url = new URL("./", location.href).href;
  try {
    const response = await fetch("/api/share");
    const share = await response.json();
    if (response.ok && share.public_base) {
      const base = new URL(share.public_base);
      if (
        base.protocol === "https:" &&
        /^[a-z0-9-]+\.trycloudflare\.com$/.test(base.host)
      )
        url = new URL(live ? "/live/" : "/simulation/", base).href;
    }
  } catch {}

  $("qr").replaceChildren();
  if (globalThis.qrcode) {
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    $("qr").innerHTML = qr.createSvgTag({
      cellSize: 4,
      margin: 16,
      scalable: true,
    });
  }
  text("share-url", url);
  $("open-url").href = url;
  $("qr-dialog").showModal();
};
$("close-qr").onclick = () => $("qr-dialog").close();

async function refreshUsage() {
  if (!live) return;
  try {
    const r = await fetch("/api/usage"),
      u = await r.json();
    text(
      "budget",
      r.ok
        ? `Website budget: ${u.used} / ${u.limit} calls used · ${u.remaining} remaining. Other uses of your account are not included.`
        : "Budget unavailable. Flight requests are blocked until storage is ready.",
    );
  } catch {
    text("budget", "Request budget unavailable.");
  }
}
if (live) refreshUsage();

$("inspect-aircraft").onclick=()=>$("aircraft-dialog").showModal();
$("close-aircraft").onclick=()=>$("aircraft-dialog").close();
$("present").onclick=()=>{
 const active=document.body.classList.toggle('presenting');
 text('present',active?'Exit classroom view':'Present to class');
 window.scrollTo({top:0,behavior:'instant'});
 requestAnimationFrame(()=>{globe?.resize();});
};
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&document.body.classList.contains('presenting')&&!$('aircraft-dialog').open&&!$('qr-dialog').open){
  document.body.classList.remove('presenting');text('present','Present to class');globe?.resize();
 }
});
