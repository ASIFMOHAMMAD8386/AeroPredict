export const CALL_LIMIT = 100,
  CACHE_MS = 300000;
export async function readSnapshot(db, now = Date.now()) {
  const row = await db
    .prepare("SELECT payload, fetched_at FROM api_snapshot WHERE id = ?")
    .bind("hyd")
    .first();
  return row && now - row.fetched_at < CACHE_MS
    ? JSON.parse(row.payload)
    : null;
}
export async function readUsage(db) {
  const row = await db
    .prepare("SELECT calls, next_attempt FROM api_budget WHERE id = ?")
    .bind("aviationstack")
    .first();
  return {
    used: row?.calls ?? 0,
    limit: CALL_LIMIT,
    remaining: Math.max(0, CALL_LIMIT - (row?.calls ?? 0)),
    next_attempt: row?.next_attempt ?? 0,
    scope: "This website only; lifetime cap, no automatic reset",
  };
}
export async function reserveCall(db, now = Date.now()) {
  // One atomic statement serializes reservations across users and Worker regions.
  const row = await db
    .prepare(
      "INSERT INTO api_budget (id, calls, next_attempt) VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET calls = calls + 1, next_attempt = excluded.next_attempt WHERE api_budget.calls < ? AND api_budget.next_attempt <= ? RETURNING calls",
    )
    .bind("aviationstack", now + CACHE_MS, CALL_LIMIT, now)
    .first();
  return row?.calls ?? null;
}
export async function saveSnapshot(db, payload, now = Date.now()) {
  await db
    .prepare(
      "INSERT INTO api_snapshot (id, payload, fetched_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, fetched_at=excluded.fetched_at",
    )
    .bind("hyd", JSON.stringify(payload), now)
    .run();
}

export async function getSavedSnapshot(env, now = Date.now()) {
  if (!env.DB)
    return Response.json(
      { message: "Request-budget storage is unavailable." },
      { status: 503 },
    );
  try {
    const row = await env.DB.prepare(
      "SELECT payload, fetched_at FROM api_snapshot WHERE id = ?",
    )
      .bind("hyd")
      .first();
    return Response.json(
      row
        ? {
            ...JSON.parse(row.payload),
            stale: now - row.fetched_at >= CACHE_MS,
            usage: await readUsage(env.DB),
          }
        : { flights: null, usage: await readUsage(env.DB) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { message: "Saved flight data unavailable." },
      { status: 503 },
    );
  }
}
