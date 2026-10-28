import assert from "node:assert/strict";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { openDatabase } from "../server/storage.mjs";
import { createLocalServer } from "../server/http.mjs";
import { readUsage } from "../server/budget.mjs";
const temp = await mkdtemp(join(tmpdir(), "aeropredict-test-")),
  file = join(temp, "test.sqlite");
let db = openDatabase(file, 4),
  calls = 0;
const fakeFetch = async () => {
  calls++;
  return Response.json({
    data: [
      {
        departure: {
          iata: "HYD",
          scheduled: "2026-10-21T18:30:00+05:30",
          delay: 15,
        },
        arrival: { iata: "BLR", scheduled: "2026-10-21T19:45:00+05:30" },
        flight: { iata: "TEST101" },
        airline: { name: "Integration test" },
        flight_status: "scheduled",
      },
    ],
  });
};
const server = createLocalServer({
  publicRoot: fileURLToPath(new URL("../public/", import.meta.url)),
  env: {
    DB: db,
    AVIATIONSTACK_API_KEY: "TEST-SECRET-ONLY",
    LIVE_DATA_ENABLED: "true",
  },
  adminToken: "test-admin",
  fetcher: fakeFetch,
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const home = await fetch(base);
  assert.equal(home.status, 200);
  assert.ok(home.url.endsWith("/simulation/"));
  assert.ok((await home.text()).includes("Simulation lab"));
  assert.ok(
    (await (await fetch(base + "/live/")).text()).includes(
      "Live flight tracker",
    ),
  );
  for (const path of [
    "/.env",
    "/server.mjs",
    "/server/flights.mjs",
    "/.local/admin-token",
    "/%2e%2e%2f.env",
    "/simulation/..%5c..%5c.env",
  ]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 404, path);
    assert.ok(!(await response.text()).includes("TEST-SECRET"));
  }
  const head = await fetch(
    base + "/simulation/assets/aeropredict-airliner.glb",
    { method: "HEAD" },
  );
  assert.equal(head.headers.get("content-type"), "model/gltf-binary");
  assert.ok(Number(head.headers.get("content-length")) > 100000);
  const before = await (await fetch(base + "/api/usage")).json();
  const health = await (await fetch(base + "/api/health")).json();
  assert.equal(health.project, "aeropredict-local");
  assert.ok(
    !("lanUrls" in health),
    "Public health does not expose Wi-Fi addresses",
  );
  assert.equal((await fetch(base + "/api/share")).status, 200);
  assert.equal(before.used, 4);
  await fetch(base + "/api/config");
  await fetch(base + "/api/snapshot");
  assert.equal(calls, 0, "Startup endpoints never call provider");
  const first = await fetch(base + "/api/flights");
  assert.equal(first.status, 200);
  const flights = await first.json();
  assert.equal(flights.flights.length, 1);
  assert.equal(flights.usage.used, 5);
  assert.ok(!JSON.stringify(flights).includes("TEST-SECRET"));
  await fetch(base + "/api/flights");
  assert.equal(calls, 1, "Shared cache reuses provider response");
  assert.equal(
    (await (await fetch(base + "/api/snapshot")).json()).flights.length,
    1,
  );
  assert.equal(calls, 1);
  assert.equal((await fetch(base + "/api/flights?key=wrong")).status, 400);
  assert.equal(
    (await fetch(base + "/api/flights", { method: "POST" })).status,
    405,
  );
  assert.equal(
    (await fetch(base + "/api/admin/shutdown", { method: "POST" })).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/admin/shutdown", {
        method: "POST",
        headers: {
          "X-AeroPredict-Token": "test-admin",
          "CF-Connecting-IP": "203.0.113.10",
        },
      })
    ).status,
    403,
    "Public tunnel cannot invoke local shutdown",
  );
  console.log(
    "PASS: local HTTP routing, both modes, private-file protection, GLB assets, configuration, seeded budget, cached provider fetch and method checks.",
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
  db.close();
}
db = openDatabase(file, 1);
assert.equal((await readUsage(db)).used, 5, "Restart never resets the counter");
db.close();
// Remove only the temporary directory returned by mkdtemp for this test.
const actual = await realpath(temp);
assert.equal(dirname(actual), await realpath(tmpdir()));
assert.ok(basename(actual).startsWith("aeropredict-test-"));
await rm(actual, { recursive: true, force: true });
console.log(
  "PASS: SQLite call counter persists across restarts. No real API calls made.",
);
