"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { store } = require("./db.js");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const PORT = process.env.PORT || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

// pass: set ADMIN_PASSWORD env or change the line below. stored as sha256.
function hash(pw) {
  return crypto.createHash("sha256").update(String(pw)).digest("hex");
}
const ADMIN_HASH =
  process.env.ADMIN_PASSWORD_HASH ||
  hash("build-it-2026"); // change me! generate yours: node -e "console.log(require('crypto').createHash('sha256').update('YOURPASS').digest('hex'))"

const tokens = new Map(); // token -> expiry

function newToken() {
  const t = crypto.randomBytes(24).toString("hex");
  tokens.set(t, Date.now() + 1000 * 60 * 60 * 8); // 8h
  return t;
}
function authed(req) {
  const t = (req.headers["x-auth-token"] || "").split(" ").pop();
  const exp = tokens.get(t);
  return !!exp && exp > Date.now();
}

function send(res, code, body) {
  const data = typeof body === "string" ? body : JSON.stringify(body, null, 2);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function serveStatic(req, res, urlPath) {
  let file = path.normalize(path.join(PUBLIC, urlPath));
  if (!file.startsWith(PUBLIC)) {
    res.writeHead(403).end("nope");
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if (urlPath.endsWith("/")) file = path.join(file, "index.html");
    else file = path.join(file, ".html");
    if (!fs.existsSync(file)) {
      res.writeHead(404).end("not found");
      return;
    }
  }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const p = url.pathname;

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,X-Auth-Token",
      });
      res.end();
      return;
    }

    // ---- API ----
    if (p === "/api/data" && req.method === "GET") {
      return send(res, 200, await store.getData());
    }

    if (p === "/api/login" && req.method === "POST") {
      try {
        const { password } = JSON.parse(await readBody(req));
        if (hash(password) === ADMIN_HASH) return send(res, 200, { token: newToken() });
        send(res, 401, { error: "wrong password. nice try though." });
      } catch {
        send(res, 400, { error: "bad body" });
      }
      return;
    }

    if (p.startsWith("/api/") && req.method !== "GET") {
      if (!authed(req)) return send(res, 401, { error: "not authed. log in on /admin.html" });
    }

    if (p === "/api/projects" && req.method === "POST") {
      const data = await store.getData();
      const pr = JSON.parse(await readBody(req));
      pr.id = (pr.id || pr.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project-" + Date.now();
      pr.featured = !!pr.featured;
      data.projects.unshift(pr);
      await store.saveData(data);
      return send(res, 200, { ok: true, id: pr.id });
    }

    if (p === "/api/achievements" && req.method === "POST") {
      const data = await store.getData();
      const a = JSON.parse(await readBody(req));
      a.id = (a.id || a.event + "-" + a.year).toLowerCase().replace(/[^a-z0-9]+/g, "-");
      data.achievements.unshift(a);
      await store.saveData(data);
      return send(res, 200, { ok: true, id: a.id });
    }

    if (req.method === "DELETE" && (p.startsWith("/api/projects/") || p.startsWith("/api/achievements/"))) {
      const parts = p.split("/"); // ["", "api", kind, id]
      const key = parts[2];
      const id = parts[3];
      const data = await store.getData();
      const arr = key === "projects" ? data.projects : data.achievements;
      data[key === "projects" ? "projects" : "achievements"] = arr.filter((x) => x.id !== id);
      await store.saveData(data);
      return send(res, 200, { ok: true });
    }

    if (req.method === "PUT" && (p.startsWith("/api/projects/") || p.startsWith("/api/achievements/"))) {
      const parts = p.split("/"); // ["", "api", kind, id]
      const key = parts[2];
      const id = parts[3];
      const data = await store.getData();
      const arr = key === "projects" ? data.projects : data.achievements;
      const patch = JSON.parse(await readBody(req));
      const idx = arr.findIndex((x) => x.id === id);
      if (idx === -1) return send(res, 404, { error: "not found" });
      arr[idx] = { ...arr[idx], ...patch, id };
      await store.saveData(data);
      return send(res, 200, { ok: true });
    }

    if (p === "/api/upload" && req.method === "POST") {
      const { name, dataUrl } = JSON.parse(await readBody(req));
      const url = await store.uploadImage(name, dataUrl);
      if (!url) return send(res, 400, { error: "bad image data" });
      return send(res, 200, { ok: true, url });
    }

    // ---- static ----
    serveStatic(req, res, p);
  } catch (e) {
    if (e && e.code === "EROFS") {
      return send(res, 503, { error: "editing is disabled on the serverless deployment (read-only filesystem)" });
    }
    console.error(e);
    send(res, 500, { error: "internal error" });
  }
});

server.listen(PORT, () => {
  console.log(`>> TheRowKneet site running on http://localhost:${PORT}`);
  console.log(`>> admin panel:  http://localhost:${PORT}/admin.html`);
});
