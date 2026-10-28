import { createServer } from "node:http";
import { readFile, stat, realpath } from "node:fs/promises";
import { resolve, relative, extname, isAbsolute } from "node:path";
import { config, handleFlights } from "./flights.mjs";
import { readUsage, getSavedSnapshot } from "./budget.mjs";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".geojson": "application/geo+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".glb": "model/gltf-binary",
  ".csv": "text/csv; charset=utf-8",
  ".zip": "application/zip",
  ".md": "text/plain; charset=utf-8",
};
export function createLocalServer({
  publicRoot,
  env,
  adminToken,
  lanUrls = [],
  fetcher = fetch,
  onShutdown = () => {},
}) {
  const server = createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    try {
      const url = new URL(req.url, "http://aeropredict.local");
      if (url.pathname === "/api/admin/shutdown") {
        const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
          req.socket.remoteAddress,
        );
        if (
          req.method !== "POST" ||
          !local ||
          req.headers["cf-connecting-ip"] ||
          !adminToken ||
          req.headers["x-aeropredict-token"] !== adminToken
        ) {
          res.writeHead(403);
          return res.end("Forbidden");
        }
        res.end("Local server stopped.");
        server.close(() => onShutdown());
        return;
      }
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405, { Allow: "GET, HEAD" });
        return res.end("Method not allowed");
      }
      if (url.pathname.startsWith("/api/")) {
        let response;
        if (url.pathname === "/api/health")
          response = Response.json({
            project: "aeropredict-local",
            simulation: "/simulation/",
            live: "/live/",
          });
        else if (url.pathname === "/api/config")
          response = Response.json(config(env));
        else if (url.pathname === "/api/share") {
          let publicBase = null;
          try {
            const state = JSON.parse(
              await readFile(
                new URL("../.local/public-tunnel.json", import.meta.url),
                "utf8",
              ),
            );
            const candidate = new URL(state.url);
            if (
              state.verified === true &&
              candidate.protocol === "https:" &&
              /^[a-z0-9-]+\.trycloudflare\.com$/.test(candidate.host) &&
              Number.isSafeInteger(state.pid) &&
              state.pid > 0
            ) {
              process.kill(state.pid, 0);
              publicBase = candidate.origin;
            }
          } catch {}
          response = Response.json({ public_base: publicBase });
        } else if (url.pathname === "/api/usage")
          response = Response.json(await readUsage(env.DB));
        else if (url.pathname === "/api/snapshot")
          response = await getSavedSnapshot(env);
        else if (url.pathname === "/api/flights")
          response = await handleFlights(new Request(url), env, null, fetcher);
        else response = new Response("Not found", { status: 404 });
        res.writeHead(response.status, Object.fromEntries(response.headers));
        return res.end(
          req.method === "HEAD"
            ? undefined
            : Buffer.from(await response.arrayBuffer()),
        );
      }
      if (url.pathname === "/") {
        res.writeHead(302, { Location: "/simulation/" });
        return res.end();
      }
      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        res.writeHead(400);
        return res.end("Invalid path");
      }
      if (
        pathname.includes("\\") ||
        pathname.includes("\0") ||
        pathname.split("/").some((part) => part.startsWith("."))
      ) {
        res.writeHead(404);
        return res.end("Not found");
      }
      let filename = resolve(publicRoot, "." + pathname);
      const inside = (p) => {
        const rel = relative(publicRoot, p);
        return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
      };
      if (!inside(filename)) {
        res.writeHead(404);
        return res.end("Not found");
      }
      let info;
      try {
        info = await stat(filename);
      } catch {
        res.writeHead(404);
        return res.end("Not found");
      }
      if (info.isDirectory()) {
        if (!url.pathname.endsWith("/")) {
          res.writeHead(302, { Location: url.pathname + "/" });
          return res.end();
        }
        filename = resolve(filename, "index.html");
      }
      try {
        filename = await realpath(filename);
      } catch {
        res.writeHead(404);
        return res.end("Not found");
      }
      if (!inside(filename)) {
        res.writeHead(404);
        return res.end("Not found");
      }
      const data = await readFile(filename);
      res.writeHead(200, {
        "Content-Type": mime[extname(filename)] ?? "application/octet-stream",
        "Content-Length": data.length,
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message:
            "The local server could not complete this request. Check the local configuration and storage.",
        }),
      );
    }
  });
  return server;
}
