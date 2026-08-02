import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSupabase } from "../config/supabase.js";
import { hasSupabase } from "../config/env.js";
import {
  contentToRows,
  normalizeFromFile,
  rowsToContent,
  type Content,
  type ContentRow,
} from "./content.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(SERVER_ROOT, "..", "data.json");
const DYNAMIC_FILE = path.join(SERVER_ROOT, "data.dynamic.json");

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
  addMessage(m: NewMessage): Promise<void>;
  addVisitor(v: NewVisitor): Promise<void>;
  addSubscriber(email: string): Promise<{ subscribed: boolean }>;
  getCounts(): Promise<Counts>;
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
  mkdirSync(SERVER_ROOT, { recursive: true });
  writeFileSync(DYNAMIC_FILE, JSON.stringify(data, null, 2));
}

const jsonBackend: StorageBackend = {
  mode: () => "json",
  async getContent() {
    const raw = JSON.parse(readFileSync(DATA_FILE, "utf8")) as Parameters<typeof normalizeFromFile>[0];
    return normalizeFromFile(raw);
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
  addMessage: (m) => (hasSupabase() ? supabaseBackend : jsonBackend).addMessage(m),
  addVisitor: (v) => (hasSupabase() ? supabaseBackend : jsonBackend).addVisitor(v),
  addSubscriber: (email) => (hasSupabase() ? supabaseBackend : jsonBackend).addSubscriber(email),
  getCounts: () => (hasSupabase() ? supabaseBackend : jsonBackend).getCounts(),

  /** Write data.json content into Supabase (service role). */
  async seed() {
    if (!hasSupabase()) return { mode: "json", ok: true };
    const client = getSupabase();
    const raw = JSON.parse(readFileSync(DATA_FILE, "utf8"));
    const rows = contentToRows(normalizeFromFile(raw));
    for (const table of CONTENT_TABLES) {
      const { error } = await client.from(table).upsert(rows[table]);
      if (error) throw new Error(`seed ${table}: ${error.message}`);
    }
    return { mode: "supabase", ok: true };
  },
};
