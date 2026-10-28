import {
  readSnapshot,
  readUsage,
  reserveCall,
  saveSnapshot,
} from "./budget.mjs";
const network = new Set(["BLR", "MAA", "VGA", "VTZ", "TIR", "TRV"]);
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
const iso = (value) =>
  typeof value === "string" &&
  /(Z|[+-]\d\d:\d\d)$/.test(value) &&
  Number.isFinite(Date.parse(value))
    ? value
    : null;
export function livePosition(value) {
  if (
    !value ||
    typeof value.latitude !== "number" ||
    typeof value.longitude !== "number" ||
    !Number.isFinite(value.latitude) ||
    !Number.isFinite(value.longitude) ||
    Math.abs(value.latitude) > 90 ||
    Math.abs(value.longitude) > 180 ||
    !iso(value.updated)
  )
    return null;
  return {
    latitude: value.latitude,
    longitude: value.longitude,
    updated: iso(value.updated),
  };
}
export function config(env) {
  const configured = Boolean(env.AVIATIONSTACK_API_KEY),
    enabled = configured && env.LIVE_DATA_ENABLED === "true";
  return {
    configured,
    enabled,
    provider: "Aviationstack",
    message: !configured
      ? "API key not configured. Add AVIATIONSTACK_API_KEY to the private .env file, then restart the local server."
      : !enabled
        ? "Key configured. Set LIVE_DATA_ENABLED=true in the private .env file and restart."
        : "Connection configured. Fetch a snapshot to verify credentials and Hyderabad coverage.",
  };
}
export function normalize(data) {
  const seen = new Set(),
    flights = [];
  for (const x of data) {
    const origin = x.departure?.iata,
      destination = x.arrival?.iata,
      scheduled_departure = iso(x.departure?.scheduled);
    if (origin !== "HYD" || !network.has(destination) || !scheduled_departure)
      continue;
    const number = x.flight?.iata || x.flight?.icao || x.flight?.number;
    if (!number) continue;
    const id = `${number}-${scheduled_departure}-${destination}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const actual = iso(x.departure?.actual);
    let delay =
      typeof x.departure?.delay === "number" &&
      Number.isFinite(x.departure.delay) &&
      x.departure.delay >= 0
        ? x.departure.delay
        : null;
    if (delay === null && actual)
      delay = Math.max(
        0,
        Math.round(
          (Date.parse(actual) - Date.parse(scheduled_departure)) / 60000,
        ),
      );
    flights.push({
      id,
      flight_number: String(number).slice(0, 30),
      airline: String(x.airline?.name || "Not supplied").slice(0, 80),
      origin,
      destination,
      scheduled_departure,
      scheduled_arrival: iso(x.arrival?.scheduled),
      estimated_departure: iso(x.departure?.estimated),
      actual_departure: actual,
      reported_delay: delay,
      status: String(x.flight_status || "unknown").slice(0, 30),
      source: "Aviationstack",
      live_position: livePosition(x.live),
    });
  }
  return flights.sort(
    (a, b) =>
      Date.parse(a.scheduled_departure) - Date.parse(b.scheduled_departure),
  );
}
const pending = new Map();
export async function handleFlights(request, env, cache, fetcher = fetch) {
  const state = config(env);
  if (!state.enabled)
    return json(
      {
        code: state.configured ? "disabled" : "not_configured",
        message: state.message,
      },
      503,
    );
  const requestUrl = new URL(request.url);
  if (requestUrl.search)
    return json(
      {
        message:
          "This endpoint accepts no parameters. It returns the current HYD snapshot.",
      },
      400,
    );
  if (!env.DB)
    return json(
      {
        code: "budget_unavailable",
        message: "Request-budget storage is unavailable. No API call was made.",
      },
      503,
    );
  try {
    const saved = await readSnapshot(env.DB);
    if (saved) return json({ ...saved, usage: await readUsage(env.DB) });
  } catch {
    return json(
      {
        code: "budget_unavailable",
        message: "Cannot verify the request budget. No API call was made.",
      },
      503,
    );
  }
  const key = requestUrl.origin;
  if (pending.has(key)) return (await pending.get(key)).clone();
  const task = (async () => {
    try {
      let reservation;
      try {
        reservation = await reserveCall(env.DB);
      } catch {
        return json(
          {
            code: "budget_unavailable",
            message: "Cannot reserve an API call safely. No API call was made.",
          },
          503,
        );
      }
      if (reservation === null) {
        const usage = await readUsage(env.DB);
        return json(
          {
            code:
              usage.remaining === 0 ? "budget_exhausted" : "refresh_cooldown",
            usage,
            message:
              usage.remaining === 0
                ? "The website has reached its 100-call budget. API requests are stopped."
                : "A refresh was attempted recently. Please wait up to five minutes before trying again.",
          },
          429,
        );
      }
      const endpoint =
        env.AVIATIONSTACK_API_VARIANT === "legacy"
          ? "https://api.aviationstack.com/v1/flights"
          : "https://api.apilayer.net/aviationstack/v1/flights";
      const url = new URL(endpoint);
      url.searchParams.set("access_key", env.AVIATIONSTACK_API_KEY);
      url.searchParams.set("dep_iata", "HYD");
      url.searchParams.set("limit", "100");
      const upstream = await fetcher(url, {
        signal: AbortSignal.timeout(12000),
        headers: { Accept: "application/json" },
      });
      let body;
      try {
        body = await upstream.json();
      } catch {
        return json(
          {
            code: "invalid_provider_response",
            message:
              "The provider returned an unreadable response. Try again later.",
          },
          502,
        );
      }
      if (!upstream.ok || body.error) {
        const code = String(body.error?.code || upstream.status);
        const quota = upstream.status === 429 || /limit|quota|rate/.test(code);
        return json(
          {
            code: quota ? "provider_limit" : "provider_error",
            message: quota
              ? "Provider request limit reached. Check the Aviationstack account before trying again."
              : "Provider rejected the request. Check the API key, API variant and plan permissions in the account dashboard.",
          },
          quota ? 429 : 502,
        );
      }
      if (!Array.isArray(body.data))
        return json(
          { message: "The provider response did not contain a flight list." },
          502,
        );
      const payload = {
        provider: "Aviationstack",
        fetched_at: new Date().toISOString(),
        flights: normalize(body.data),
        partial:
          Number(body.pagination?.total ?? body.data.length) > body.data.length,
        provider_page_records: body.data.length,
        cache_minutes: 5,
      };
      await saveSnapshot(env.DB, payload);
      return json({ ...payload, usage: await readUsage(env.DB) });
    } catch {
      return json(
        {
          code: "provider_unavailable",
          message:
            "The flight provider could not be reached. No simulated data has been substituted.",
        },
        502,
      );
    }
  })();
  pending.set(key, task);
  try {
    return (await task).clone();
  } finally {
    pending.delete(key);
  }
}
