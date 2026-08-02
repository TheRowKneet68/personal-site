import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSupabase } from "../config/supabase.js";
import { hasSupabase } from "../config/env.js";
import { EMBEDDED_DATA } from "../data.embedded.js";
import {
  contentToRows,
  dedupeRowsById,
  normalizeFromFile,
  rowsToContent,
  type Content,
  type ContentRow,
} from "./content.js";

const __dirname = (() => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    // Vercel bundles this module; import.meta.url is undefined there.
    return process.cwd();
  }
})();
/** Walk up to the repo root where data.json lives. Needed because the module
    sits at server/services in tsx dev but server/dist/services when compiled. */
function findDataFile(startDir: string): string {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, "data.json");
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return path.join(startDir, "..", "..", "..", "data.json");
    dir = parent;
  }
}
const DATA_FILE = findDataFile(__dirname);
const SERVER_ROOT = path.join(path.dirname(DATA_FILE), "server");
const DYNAMIC_FILE = path.join(SERVER_ROOT, "data.dynamic.json");

/** Read data.json from disk, or fall back to the bundled snapshot when the
    file isn't reachable (Vercel bundles this module; the on-disk path isn't
    reliable there). Still read live locally so content edits show up without
    a restart. */
function readDataFile(): Parameters<typeof normalizeFromFile>[0] {
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf8")) as Parameters<typeof normalizeFromFile>[0];
  } catch {
    return EMBEDDED_DATA;
  }
}

export interface NewMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
  ip?: string;
}
export interface NewVisitor {
  country?: string | null;
  city?: string | null;
  device?: string | null;
  browser?: string | null;
  ip?: string | null;
}
export interface Counts {
  messages: number;
  visitors: number;
  subscribers: number;
}

interface DynamicData {
  messages: NewMessage[];
  visitors: NewVisitor[];
  subscribers: string[];
}

export interface StorageBackend {
  mode(): "supabase" | "json";
  getContent(): Promise<Content>;
  updateContent(content: Content): Promise<void>;
  addMessage(m: NewMessage): Promise<void>;
  addVisitor(v: NewVisitor): Promise<void>;
  addSubscriber(email: string): Promise<{ subscribed: boolean }>;
  getCounts(): Promise<Counts>;
  listMessages(): Promise<(NewMessage & { created_at?: string })[]>;
  listSubscribers(): Promise<string[]>;
  deleteMessage(id: string): Promise<void>;
  deleteSubscriber(email: string): Promise<void>;
  uploadImage(name: string, contentType: string, buffer: Buffer): Promise<string>;
}

/* ------------------------------------------------------------------ */
/*  JSON fallback — lets the whole stack run with zero credentials.    */
/* ------------------------------------------------------------------ */

function readDynamic(): DynamicData {
  if (!existsSync(DYNAMIC_FILE)) {
    return { messages: [], visitors: [], subscribers: [] };
  }
  return JSON.parse(readFileSync(DYNAMIC_FILE, "utf8")) as DynamicData;
}

function writeDynamic(data: DynamicData): void {
  try {
    mkdirSync(SERVER_ROOT, { recursive: true });
    writeFileSync(DYNAMIC_FILE, JSON.stringify(data, null, 2));
  } catch {
    // Vercel's filesystem is ephemeral — a failed write shouldn't 500 the
    // request. Supabase is the durable backend; JSON fallback is best-effort.
  }
}

const jsonBackend: StorageBackend = {
  mode: () => "json",
  async getContent() {
    return normalizeFromFile(readDataFile());
  },
  /** Persist edits into data.json — the source of truth for the JSON backend. */
  async updateContent(content) {
    const data = {
      profile: content.profile,
      projects: content.projects,
      achievements: content.achievements,
    };
    try {
      mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n");
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === "EROFS" || code === "EACCES" || code === "ENOSPC") {
        throw new Error(
          "JSON storage can't write to this server's read-only filesystem. " +
            "Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the deployed server " +
            "(or run the admin locally where data.json is writable).",
        );
      }
      throw err;
    }
  },
  async addMessage(m) {
    const data = readDynamic();
    data.messages.unshift({ ...m, created_at: new Date().toISOString() } as NewMessage & { created_at: string });
    writeDynamic(data);
  },
  async addVisitor(v) {
    const data = readDynamic();
    data.visitors.unshift({ ...v, visited_at: new Date().toISOString() } as NewVisitor & { visited_at: string });
    writeDynamic(data);
  },
  async addSubscriber(email) {
    const data = readDynamic();
    if (data.subscribers.includes(email)) return { subscribed: false };
    data.subscribers.push(email);
    writeDynamic(data);
    return { subscribed: true };
  },
  async getCounts() {
    const data = readDynamic();
    return { messages: data.messages.length, visitors: data.visitors.length, subscribers: data.subscribers.length };
  },
  async listMessages() {
    return readDynamic().messages;
  },
  async listSubscribers() {
    return readDynamic().subscribers;
  },
  /** JSON messages carry no id — the frontend passes created_at as the id. */
  async deleteMessage(id) {
    const data = readDynamic();
    data.messages = data.messages.filter((m) => (m as NewMessage & { created_at?: string }).created_at !== id);
    writeDynamic(data);
  },
  async deleteSubscriber(email) {
    const data = readDynamic();
    data.subscribers = data.subscribers.filter((e) => e !== email);
    writeDynamic(data);
  },
  /** Best-effort local save (repo public/images) — Vercel is read-only, Supabase is the durable path. */
  async uploadImage(name, _contentType, buffer) {
    const dir = path.join(path.dirname(DATA_FILE), "public", "images");
    const dest = path.join(dir, name);
    try {
      mkdirSync(dir, { recursive: true });
      writeFileSync(dest, buffer);
      return `/images/${name}`;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      throw new Error(
        code === "EROFS" || code === "EACCES" || code === "ENOSPC"
          ? "Local image storage is read-only here — configure Supabase to upload images on the deployed server."
          : `Failed to write image: ${code ?? (err as Error).message}`,
      );
    }
  },
};

/* ------------------------------------------------------------------ */
/*  Supabase backend                                                   */
/* ------------------------------------------------------------------ */

const CONTENT_TABLES = ["profile", "projects", "achievements", "skills", "experience"] as const;

async function fetchRows(table: string): Promise<ContentRow[]> {
  const { data, error } = await getSupabase()
    .from(table)
    .select("id, data")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`supabase ${table}: ${error.message}`);
  return (data as ContentRow[]) || [];
}

const supabaseBackend: StorageBackend = {
  mode: () => "supabase",
  async getContent() {
    const [profile, projects, achievements, skills, experience] = await Promise.all(
      CONTENT_TABLES.map((t) => fetchRows(t)),
    );
    return rowsToContent({
      profile: profile ?? [],
      projects: projects ?? [],
      achievements: achievements ?? [],
      skills: skills ?? [],
      experience: experience ?? [],
    });
  },
  /** Upsert edited rows and delete any row dropped from the content. */
  async updateContent(content) {
    const client = getSupabase();
    const rows = contentToRows(content);
    const dedupedRows = { ...rows } as typeof rows;
    for (const table of CONTENT_TABLES) {
      dedupedRows[table] = dedupeRowsById(rows[table]);
      const incoming = dedupedRows[table];
      const { error } = await client.from(table).upsert(incoming);
      if (error) throw new Error(`update ${table}: ${error.message}`);
      const { data: existing, error: listErr } = await client.from(table).select("id");
      if (listErr) throw new Error(`list ${table}: ${listErr.message}`);
      const keep = new Set(incoming.map((r) => r.id));
      const stale = (existing ?? []).filter((r) => !keep.has(r.id)).map((r) => r.id);
      if (stale.length > 0) {
        const { error: delErr } = await client.from(table).delete().in("id", stale);
        if (delErr) throw new Error(`delete ${table}: ${delErr.message}`);
      }
    }
  },
  async addMessage(m) {
    const { error } = await getSupabase()
      .from("contact_messages")
      .insert({ name: m.name, email: m.email, subject: m.subject, message: m.message, ip: m.ip });
    if (error) throw new Error(`supabase contact: ${error.message}`);
  },
  async addVisitor(v) {
    const { error } = await getSupabase().from("visitors").insert({
      country: v.country,
      city: v.city,
      device: v.device,
      browser: v.browser,
      ip: v.ip,
    });
    if (error) throw new Error(`supabase visitor: ${error.message}`);
  },
  async addSubscriber(email) {
    const { error } = await getSupabase().from("newsletter").insert({ email });
    if (error && error.code === "23505") return { subscribed: false };
    if (error) throw new Error(`supabase newsletter: ${error.message}`);
    return { subscribed: true };
  },
  async getCounts() {
    const count = async (table: string) => {
      const { count, error } = await getSupabase()
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) throw new Error(`supabase count ${table}: ${error.message}`);
      return count ?? 0;
    };
    const [messages, visitors, subscribers] = await Promise.all([
      count("contact_messages"),
      count("visitors"),
      count("newsletter"),
    ]);
    return { messages, visitors, subscribers };
  },
  async listMessages() {
    const { data, error } = await getSupabase()
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(`supabase messages: ${error.message}`);
    return (data ?? []) as (NewMessage & { created_at?: string })[];
  },
  async listSubscribers() {
    const { data, error } = await getSupabase()
      .from("newsletter")
      .select("email")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`supabase subscribers: ${error.message}`);
    return (data ?? []).map((r) => (r as { email: string }).email);
  },
  async deleteMessage(id) {
    const { error } = await getSupabase().from("contact_messages").delete().eq("id", id);
    if (error) throw new Error(`supabase delete message: ${error.message}`);
  },
  async deleteSubscriber(email) {
    const { error } = await getSupabase().from("newsletter").delete().eq("email", email);
    if (error) throw new Error(`supabase delete subscriber: ${error.message}`);
  },
  /** Upload to the public "images" bucket (created on demand) and return its URL. */
  async uploadImage(name, contentType, buffer) {
    const client = getSupabase();
    const bucket = "images";
    const { error: missing } = await client.storage.getBucket(bucket);
    if (missing) {
      const { error: createErr } = await client.storage.createBucket(bucket, { public: true });
      if (createErr) throw new Error(`supabase storage: ${createErr.message}`);
    }
    const { error } = await client.storage.from(bucket).upload(name, buffer, {
      contentType,
      cacheControl: "3600",
      upsert: true,
    });
    if (error) throw new Error(`supabase storage: ${error.message}`);
    return client.storage.from(bucket).getPublicUrl(name).data.publicUrl;
  },
};

/* ------------------------------------------------------------------ */
/*  Facade with a short TTL cache so page loads don't hammer the DB.   */
/* ------------------------------------------------------------------ */

export interface Storage extends StorageBackend {
  seed(): Promise<{ mode: string; ok: boolean }>;
}

export const storage: Storage = {
  mode: () => (hasSupabase() ? "supabase" : "json"),

  async getContent() {
    const backend = hasSupabase() ? supabaseBackend : jsonBackend;
    return backend.getContent();
  },
  updateContent: (c) => (hasSupabase() ? supabaseBackend : jsonBackend).updateContent(c),
  addMessage: (m) => (hasSupabase() ? supabaseBackend : jsonBackend).addMessage(m),
  addVisitor: (v) => (hasSupabase() ? supabaseBackend : jsonBackend).addVisitor(v),
  addSubscriber: (email) => (hasSupabase() ? supabaseBackend : jsonBackend).addSubscriber(email),
  getCounts: () => (hasSupabase() ? supabaseBackend : jsonBackend).getCounts(),
  listMessages: () => (hasSupabase() ? supabaseBackend : jsonBackend).listMessages(),
  listSubscribers: () => (hasSupabase() ? supabaseBackend : jsonBackend).listSubscribers(),
  deleteMessage: (id) => (hasSupabase() ? supabaseBackend : jsonBackend).deleteMessage(id),
  deleteSubscriber: (email) => (hasSupabase() ? supabaseBackend : jsonBackend).deleteSubscriber(email),
  uploadImage: (n, c, b) => (hasSupabase() ? supabaseBackend : jsonBackend).uploadImage(n, c, b),

  /** Write data.json content into Supabase (service role). */
  async seed() {
    if (!hasSupabase()) return { mode: "json", ok: true };
    const client = getSupabase();
    const rows = contentToRows(normalizeFromFile(readDataFile()));
    for (const table of CONTENT_TABLES) {
      const { error } = await client.from(table).upsert(rows[table]);
      if (error) throw new Error(`seed ${table}: ${error.message}`);
    }
    return { mode: "supabase", ok: true };
  },
};
