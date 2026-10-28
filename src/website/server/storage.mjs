import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// The existing flight adapter uses D1-style prepared statements. This small
// adapter runs exactly the same budget/cache queries against local SQLite.
export function openDatabase(filename, priorCalls = 0) {
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true });
  const sqlite = new DatabaseSync(filename);
  sqlite.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  const schema = readFileSync(
    new URL("./schema.sql", import.meta.url),
    "utf8",
  ).replaceAll("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ");
  sqlite.exec(schema);
  const prior = Number.isSafeInteger(priorCalls)
    ? Math.max(0, Math.min(100, priorCalls))
    : 0;
  sqlite
    .prepare(
      "INSERT INTO api_budget(id,calls,next_attempt) VALUES(?, ?, 0) ON CONFLICT(id) DO UPDATE SET calls=MAX(calls,excluded.calls)",
    )
    .run("aviationstack", prior);
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              return sqlite.prepare(sql).get(...args) ?? null;
            },
            async run() {
              sqlite.prepare(sql).run(...args);
              return { success: true };
            },
          };
        },
      };
    },
    close() {
      sqlite.close();
    },
  };
}
