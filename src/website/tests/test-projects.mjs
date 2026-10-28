import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  reserveCall,
  readUsage,
  CACHE_MS,
  getSavedSnapshot,
} from "../server/budget.mjs";
function database() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(
    "CREATE TABLE api_budget(id TEXT PRIMARY KEY,calls INTEGER NOT NULL DEFAULT 0,next_attempt INTEGER NOT NULL DEFAULT 0);CREATE TABLE api_snapshot(id TEXT PRIMARY KEY,payload TEXT NOT NULL,fetched_at INTEGER NOT NULL);",
  );
  return {
    prepare(query) {
      return {
        bind(...args) {
          return {
            async first() {
              return sql.prepare(query).get(...args) ?? null;
            },
            async run() {
              return sql.prepare(query).run(...args);
            },
          };
        },
      };
    },
    sql,
  };
}
import { simulate, demoFlights } from "../public/simulation/engine.mjs";
import { normalize, config, handleFlights } from "../server/flights.mjs";
const f = demoFlights("2026-10-18")[0],
  base = simulate(f);
assert.deepEqual(simulate(f), base, "Simulation must be deterministic");
for (const change of [
  { weather: "Thunderstorm" },
  { congestion: 90 },
  { inbound: 120 },
]) {
  const r = simulate({ ...f, ...change });
  assert.ok(r.probability > base.probability);
  assert.ok(r.minutes > base.minutes);
}
assert.equal(
  simulate({ ...f, scheduled_departure: "2026-10-18T10:30:00Z" }).peak,
  1,
  "16:00 IST is peak",
);
assert.equal(
  simulate({ ...f, scheduled_departure: "2026-10-18T10:29:00Z" }).peak,
  0,
  "15:59 IST is outside peak",
);
assert.throws(() => simulate({ ...f, congestion: 101 }));
assert.throws(() => simulate({ ...f, scheduled_departure: "no" }));
const record = {
  departure: {
    iata: "HYD",
    scheduled: "2026-10-18T08:30:00+05:30",
    delay: null,
  },
  arrival: { iata: "BLR", scheduled: "2026-10-18T09:45:00+05:30" },
  flight: { iata: "TEST101" },
  airline: { name: "Test only" },
  flight_status: "scheduled",
};
assert.equal(normalize([record, record]).length, 1);
assert.equal(
  normalize([record])[0].reported_delay,
  null,
  "Missing delay must not become zero",
);
assert.equal(
  normalize([
    {
      ...record,
      departure: { ...record.departure, actual: "2026-10-18T09:00:00+05:30" },
    },
  ])[0].reported_delay,
  30,
);
assert.equal(normalize([{ ...record, arrival: { iata: "DEL" } }]).length, 0);
assert.equal(
  normalize([
    {
      ...record,
      departure: { ...record.departure, scheduled: "2026-10-18 08:30" },
    },
  ]).length,
  0,
  "Ambiguous timestamps rejected",
);
assert.equal(config({}).enabled, false);
assert.equal(config({ AVIATIONSTACK_API_KEY: "TEST" }).enabled, false);
let calls = 0;
const fakeFetch = async (url) => {
  calls++;
  assert.equal(url.searchParams.get("dep_iata"), "HYD");
  return Response.json({ data: [record], pagination: { total: 123 } });
};
const req = new Request("https://example.test/api/flights");
const missing = await handleFlights(req, {}, null, fakeFetch);
assert.equal(missing.status, 503);
assert.equal(calls, 0);
const env = {
  AVIATIONSTACK_API_KEY: "TEST-SECRET",
  LIVE_DATA_ENABLED: "true",
  DB: database(),
};
const cache = null;
const first = await handleFlights(req, env, cache, fakeFetch);
const payload = await first.text();
assert.ok(!payload.includes("TEST-SECRET"));
assert.ok(JSON.parse(payload).partial);
await handleFlights(req, env, cache, fakeFetch);
assert.equal(calls, 1, "Cached fetch must not use another API request");
const badEnv = { ...env, DB: database() };
const bad = await handleFlights(req, badEnv, null, async () =>
  Response.json(
    { error: { code: "invalid_access_key", message: "TEST-SECRET" } },
    { status: 401 },
  ),
);
assert.equal(bad.status, 502);
assert.ok(!(await bad.text()).includes("TEST-SECRET"));
assert.equal((await readUsage(badEnv.DB)).used, 1);
const cooldown = await handleFlights(req, badEnv, null, fakeFetch);
assert.equal(cooldown.status, 429);
assert.equal(calls, 1);
const fail = await handleFlights(
  req,
  { ...env, DB: database() },
  null,
  async () => {
    throw Error("TEST-SECRET");
  },
);
assert.equal(fail.status, 502);
assert.ok(!(await fail.text()).includes("TEST-SECRET"));
const query = await handleFlights(
  new Request("https://example.test/api/flights?key=x"),
  env,
  null,
  fakeFetch,
);
assert.equal(query.status, 400);
const absent = await handleFlights(req, { ...env, DB: null }, null, fakeFetch);
assert.equal(absent.status, 503);
assert.equal(calls, 1);
const db = database(),
  now = Date.now();
const results = await Promise.all(
  Array.from({ length: 20 }, () => reserveCall(db, now)),
);
assert.equal(
  results.filter((x) => x !== null).length,
  1,
  "Concurrent requests reserve only one call",
);
for (let i = 1; i < 100; i++)
  assert.equal(await reserveCall(db, now + i * CACHE_MS), i + 1);
assert.equal(await reserveCall(db, now + 100 * CACHE_MS), null);
assert.equal((await readUsage(db)).remaining, 0);
db.sql.prepare("UPDATE api_budget SET next_attempt=0").run();
const exhausted = await handleFlights(req, { ...env, DB: db }, null, fakeFetch);
assert.equal(exhausted.status, 429);
assert.equal(calls, 1);
console.log(
  "PASS: simulation, normalization, secret redaction, persistent caching, failed-call accounting, cooldown, concurrent reservations, 100-call ceiling and fail-closed storage.",
);

const savedBefore = await readUsage(env.DB);
const savedResponse = await getSavedSnapshot(env);
assert.equal(savedResponse.status, 200);
assert.ok((await savedResponse.json()).flights.length);
assert.deepEqual(await readUsage(env.DB), savedBefore);
assert.equal(calls, 1);
const staleResponse = await getSavedSnapshot(env, Date.now() + CACHE_MS + 1);
assert.equal((await staleResponse.json()).stale, true);
console.log(
  "PASS: saved and stale snapshots never reserve an upstream request.",
);
