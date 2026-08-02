"use strict";
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "data.json");
const PUBLIC = path.join(__dirname, "public");
const UPLOAD_DIR = path.join(PUBLIC, "uploads");
const IS_VERCEL = process.env.VERCEL === "1";

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (e) {
  if (!IS_VERCEL) throw e;
}

const fsStore = {
  async getData() {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  },
  async saveData(data) {
    const tmp = DATA_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, DATA_FILE);
  },
  async uploadImage(name, dataUrl) {
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(dataUrl);
    if (!m) return null;
    const safe = (name || "image.png").replace(/[^a-z0-9.-]/gi, "").toLowerCase();
    const ext = path.extname(safe) || "." + m[1].split("/")[1].replace("+", "");
    const file = "img-" + Date.now() + ext;
    fs.writeFileSync(path.join(UPLOAD_DIR, file), Buffer.from(m[2], "base64"));
    return "/uploads/" + file;
  },
};

// ponytail: full-table sync on every save — fine for tiny personal data, switch to row-level ops if it grows
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "uploads";

function sbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
  };
}

async function sbGet(table) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, { headers: sbHeaders() });
  if (!r.ok) throw new Error(`supabase ${table}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function sbUpsert(table, rows) {
  if (!rows.length) return;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...sbHeaders(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`supabase ${table} upsert: ${r.status} ${await r.text()}`);
}

async function sbDelete(table, id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: sbHeaders(),
  });
  if (!r.ok) throw new Error(`supabase ${table} delete: ${r.status} ${await r.text()}`);
}

async function sbUpload(bucket, file, body, contentType) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${file}`, {
    method: "PUT",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body,
  });
  if (!r.ok) throw new Error(`supabase upload: ${r.status} ${await r.text()}`);
}

const supabaseStore = {
  async getData() {
    const [projects, achievements, profile] = await Promise.all([
      sbGet("projects"),
      sbGet("achievements"),
      sbGet("profile"),
    ]);
    return { profile: (profile[0] && profile[0].data) || {}, projects, achievements };
  },
  async saveData(data) {
    for (const key of ["projects", "achievements"]) {
      const cur = await sbGet(key);
      const curIds = new Set(cur.map((r) => r.id));
      const keep = new Set(data[key].map((r) => r.id));
      for (const id of curIds) if (!keep.has(id)) await sbDelete(key, id);
      await sbUpsert(key, data[key]);
    }
    await sbUpsert("profile", [{ id: "main", data: data.profile }]);
  },
  async uploadImage(name, dataUrl) {
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(dataUrl);
    if (!m) return null;
    const safe = (name || "image.png").replace(/[^a-z0-9.-]/gi, "").toLowerCase();
    const ext = path.extname(safe) || "." + m[1].split("/")[1].replace("+", "");
    const file = "img-" + Date.now() + ext;
    await sbUpload(SUPABASE_BUCKET, file, Buffer.from(m[2], "base64"), m[1]);
    return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${file}`;
  },
};

// SUPABASE_URL + key set -> supabase; otherwise -> local filesystem
const store = SUPABASE_URL && SUPABASE_KEY ? supabaseStore : fsStore;

module.exports = { store };
