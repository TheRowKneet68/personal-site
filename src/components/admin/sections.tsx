import { useState, type ReactNode } from "react";
import type { Achievement, CaseStudy, ExperienceEntry, FeaturedIn, Principle, Profile, Project, Testimonial } from "../../types";
import { cn } from "../../utils/format";
import { Field, ImageField, MapEditor, PairList, StringList, TextArea, TextInput, Toggle } from "./fields";

/* ---------------- generic repeater ---------------- */

type FieldType = "text" | "textarea" | "toggle" | "list";

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
}

export function Repeater<T extends object>({
  items,
  onChange,
  fields,
  newItem,
  titleOf,
  renderDetail,
  itemLabel = "item",
  view,
}: {
  items: T[];
  onChange: (v: T[]) => void;
  fields: FieldDef[];
  newItem: () => T;
  titleOf: (item: T) => string;
  renderDetail?: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  itemLabel?: string;
  view?: (item: T) => string | undefined;
}) {
  const [query, setQuery] = useState("");
  const update = (i: number, patch: Partial<T>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item as T);
    onChange(next);
  };
  const q = query.trim().toLowerCase();
  const rows = items.map((item, i) => ({ item, i })).filter(({ item }) => titleOf(item).toLowerCase().includes(q));
  const thumb = (item: T) => {
    const v = (item as Record<string, unknown>).image;
    return typeof v === "string" && v ? v : undefined;
  };
  const btnCls =
    "rounded border border-line px-2 py-0.5 font-mono text-[0.65rem] text-ink-dim hover:border-accent hover:text-accent disabled:opacity-30";

  return (
    <div className="space-y-3">
      {items.length > 6 ? (
        <input
          className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          placeholder={`search ${itemLabel}s by name…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      ) : null}
      {rows.length === 0 ? <p className="text-sm text-ink-faint">No {itemLabel}s match “{query}”.</p> : null}
      {rows.map(({ item, i }) => {
        const img = thumb(item);
        const href = view?.(item);
        const title = titleOf(item).trim();
        return (
          <details key={i} className="rounded-lg border border-line bg-surface">
            <summary className="flex cursor-pointer select-none list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              {img ? (
                <img src={img} alt="" className="size-10 shrink-0 rounded border border-line bg-bg object-cover" />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded border border-line bg-bg font-mono text-sm text-ink-faint">
                  {title.charAt(0).toUpperCase() || "·"}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{title || `Untitled ${itemLabel}`}</span>
                <span className="block font-mono text-[0.65rem] text-ink-faint">
                  {i + 1} of {items.length}
                </span>
              </span>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 rounded border border-line px-2 py-0.5 font-mono text-[0.65rem] text-ink-dim hover:border-accent hover:text-accent"
                  title="Open on the live site"
                >
                  view ↗
                </a>
              ) : null}
              <span className="shrink-0 font-mono text-xs text-ink-faint" aria-hidden>
                ▾
              </span>
            </summary>
            <div className="space-y-3 border-t border-line px-4 py-3">
              {fields.map((f) => {
                const val = (item as Record<string, unknown>)[f.key];
                if (f.type === "text") {
                  return (
                    <Field key={f.key} label={f.label} hint={f.hint}>
                      <TextInput value={typeof val === "string" ? val : ""} placeholder={f.placeholder} onChange={(v) => update(i, { [f.key]: v } as Partial<T>)} />
                    </Field>
                  );
                }
                if (f.type === "textarea") {
                  return (
                    <Field key={f.key} label={f.label} hint={f.hint}>
                      <TextArea value={typeof val === "string" ? val : ""} placeholder={f.placeholder} onChange={(v) => update(i, { [f.key]: v } as Partial<T>)} />
                    </Field>
                  );
                }
                if (f.type === "toggle") {
                  return <Toggle key={f.key} label={f.label} checked={Boolean(val)} onChange={(v) => update(i, { [f.key]: v } as Partial<T>)} />;
                }
                return (
                  <Field key={f.key} label={f.label} hint={f.hint}>
                    <StringList value={Array.isArray(val) ? (val as string[]) : []} itemLabel={f.placeholder ?? "item"} onChange={(v) => update(i, { [f.key]: v } as Partial<T>)} />
                  </Field>
                );
              })}
              {renderDetail ? <div className="border-t border-line pt-3">{renderDetail(item, (patch) => update(i, patch))}</div> : null}
              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <button type="button" className={btnCls} disabled={i === 0} onClick={() => move(i, i - 1)} title="Move this item up">
                  ↑ up
                </button>
                <button type="button" className={btnCls} disabled={i === items.length - 1} onClick={() => move(i, i + 1)} title="Move this item down">
                  ↓ down
                </button>
                <button type="button" className={btnCls} onClick={() => onChange([...items.slice(0, i + 1), { ...item }, ...items.slice(i + 1)])} title="Duplicate this item">
                  duplicate
                </button>
                <button
                  type="button"
                  className="ml-auto rounded border border-line px-2 py-0.5 font-mono text-[0.65rem] text-warn hover:border-warn hover:text-warn"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  title="Delete this item"
                >
                  remove
                </button>
              </div>
            </div>
          </details>
        );
      })}
      <button
        type="button"
        className="rounded border border-line px-3 py-1 font-mono text-xs text-ink-dim hover:border-accent hover:text-accent"
        onClick={() => onChange([...items, newItem()])}
      >
        + add {itemLabel}
      </button>
    </div>
  );
}

/* ---------------- profile sections ---------------- */

export function BasicsSection({
  value,
  onChange,
  uploadImage,
}: {
  value: Profile;
  onChange: (p: Profile) => void;
  uploadImage?: (file: File) => Promise<string>;
}) {
  const set = (patch: Partial<Profile>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {(
          [
            ["name", "Name"],
            ["handle", "Handle"],
            ["role", "Role"],
            ["slogan", "Slogan"],
            ["location", "Location"],
            ["phone", "Phone (display)"],
            ["phone_raw", "Phone (raw)"],
            ["whatsapp", "WhatsApp"],
            ["email", "Email"],
          ] as const
        ).map(([k, label]) => (
          <Field key={k} label={label}>
            <TextInput value={value[k]} onChange={(v) => set({ [k]: v })} />
          </Field>
        ))}
        <Field label="Logo" hint="Shown in the header and footer.">
          <ImageField label="" value={value.logo ?? ""} onChange={(v) => set({ logo: v })} uploadImage={uploadImage} objectFit="contain" />
        </Field>
      </div>
      <ImageField
        label="Portrait"
        hint="The photo shown in the About section. Upload a new one or paste a URL."
        value={value.portrait ?? ""}
        onChange={(v) => set({ portrait: v })}
        uploadImage={uploadImage}
      />
      <Field label="Socials" hint="Key = platform name, value = URL.">
        <MapEditor value={value.socials} onChange={(v) => set({ socials: v })} keyPlaceholder="platform" valuePlaceholder="url" itemLabel="social" />
      </Field>
    </div>
  );
}

export function AboutSection({ value, onChange }: { value: Profile; onChange: (p: Profile) => void }) {
  const set = (patch: Partial<Profile>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-4">
      <Field label="About paragraphs">
        <StringList value={value.about ?? []} itemLabel="paragraph" onChange={(v) => set({ about: v })} />
      </Field>
      <Field label="Badges">
        <StringList value={value.badges} itemLabel="badge" onChange={(v) => set({ badges: v })} />
      </Field>
      <Field label="Focus areas">
        <StringList value={value.focus} itemLabel="focus area" onChange={(v) => set({ focus: v })} />
      </Field>
      <Field label="Fun facts">
        <StringList value={value.fun_facts} itemLabel="fun fact" onChange={(v) => set({ fun_facts: v })} />
      </Field>
      <Field label="Stats" hint="Shown in the hero.">
        <PairList
          value={value.stats}
          fields={{ keyA: "label", labelA: "label", keyB: "value", labelB: "value" }}
          itemLabel="stat"
          onChange={(v) => set({ stats: v as Profile["stats"] })}
        />
      </Field>
    </div>
  );
}

export function JourneySection({ value, onChange }: { value: ExperienceEntry[]; onChange: (v: ExperienceEntry[]) => void }) {
  return (
    <Repeater
      items={value}
      onChange={onChange}
      itemLabel="milestone"
      fields={[
        { key: "year", label: "Year", type: "text", placeholder: "2026" },
        { key: "title", label: "Title", type: "text" },
        { key: "note", label: "Note", type: "textarea" },
      ]}
      newItem={() => ({ year: "", title: "", note: "" })}
      titleOf={(i) => `${i.year} — ${i.title}`}
    />
  );
}

export function PrinciplesSection({ value, onChange }: { value: Principle[]; onChange: (v: Principle[]) => void }) {
  return (
    <PairList
      value={value}
      fields={{ keyA: "title", labelA: "title", keyB: "note", labelB: "note" }}
      itemLabel="principle"
      onChange={(v) => onChange(v as Principle[])}
    />
  );
}

/** profile.tech — Record<category, string[]>. Double as the site's skills. */
export function SkillsSection({ value, onChange }: { value: Record<string, string[]>; onChange: (v: Record<string, string[]>) => void }) {
  const entries = Object.entries(value);
  const set = (list: [string, string[]][]) => onChange(Object.fromEntries(list.filter(([k]) => k.trim() !== "")));
  return (
    <div className="space-y-4">
      {entries.map(([category, skills], i) => (
        <div key={i} className="rounded-lg border border-line bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <input
              className="w-48 rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              value={category}
              placeholder="category"
              onChange={(e) => set(entries.map(([c, s], j) => (j === i ? [e.target.value, s] : [c, s])))}
            />
            <button
              type="button"
              className="rounded border border-line px-2 py-1 font-mono text-xs text-ink-dim hover:border-accent hover:text-accent"
              onClick={() => set(entries.filter((_, j) => j !== i))}
            >
              remove category
            </button>
          </div>
          <StringList value={skills} itemLabel="skill" onChange={(v) => set(entries.map(([c, s], j) => (j === i ? [c, v] : [c, s])))} />
        </div>
      ))}
      <button
        type="button"
        className="rounded border border-line px-3 py-1 font-mono text-xs text-ink-dim hover:border-accent hover:text-accent"
        onClick={() => set([...entries, ["", []]])}
      >
        + category
      </button>
    </div>
  );
}

export function TestimonialsSection({ value, onChange }: { value: Testimonial[]; onChange: (v: Testimonial[]) => void }) {
  return (
    <PairList
      value={value}
      fields={{ keyA: "quote", labelA: "quote", keyB: "source", labelB: "source" }}
      itemLabel="testimonial"
      onChange={(v) => onChange(v as Testimonial[])}
    />
  );
}

/* ---------------- collections ---------------- */

function CaseStudyEditor({ value, update }: { value: CaseStudy | undefined; update: (patch: Partial<Project>) => void }) {
  const cs = value;
  const set = (patch: Partial<CaseStudy>) => update({ caseStudy: { ...(cs ?? {}), ...patch } } as Partial<Project>);
  const list = (label: string, key: keyof CaseStudy) => (
    <Field label={label}>
      <StringList value={Array.isArray(cs?.[key]) ? (cs![key] as string[]) : []} itemLabel={label.toLowerCase()} onChange={(v) => set({ [key]: v })} />
    </Field>
  );
  const btnCls = "rounded border border-line px-2 py-0.5 font-mono text-[0.65rem] text-ink-dim hover:border-accent hover:text-accent";
  if (!cs) {
    return (
      <button type="button" className={btnCls} onClick={() => update({ caseStudy: {} } as Partial<Project>)}>
        + add case study
      </button>
    );
  }
  return (
    <div className="space-y-3 rounded-md border border-line p-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-faint">Case study</span>
        <button type="button" className={btnCls} onClick={() => update({ caseStudy: undefined } as Partial<Project>)}>
          remove
        </button>
      </div>
      {list("Problem", "problem")}
      {list("Solution", "solution")}
      {list("Architecture", "architecture")}
      {list("Stack", "stack")}
      <Field label="Challenges">
        <PairList
          value={cs.challenges ?? []}
          fields={{ keyA: "problem", labelA: "problem", keyB: "fix", labelB: "fix" }}
          itemLabel="challenge"
          onChange={(v) => set({ challenges: v as CaseStudy["challenges"] })}
        />
      </Field>
      {list("Impact", "impact")}
      {list("Lessons", "lessons")}
      <Field label="Timeline">
        <TextInput value={cs.timeline ?? ""} onChange={(v) => set({ timeline: v })} />
      </Field>
    </div>
  );
}

export function ProjectsSection({
  value,
  onChange,
  uploadImage,
}: {
  value: Project[];
  onChange: (v: Project[]) => void;
  uploadImage?: (file: File) => Promise<string>;
}) {
  return (
    <Repeater
      items={value}
      onChange={onChange}
      itemLabel="project"
      fields={[
        { key: "title", label: "Title", type: "text" },
        { key: "tagline", label: "Tagline", type: "text" },
        { key: "category", label: "Category", type: "text", placeholder: "e.g. web, ai, hardware" },
        { key: "year", label: "Year", type: "text", placeholder: "e.g. 2026" },
        { key: "status", label: "Status", type: "text", placeholder: "e.g. shipped, ongoing" },
        { key: "featured", label: "Featured", type: "toggle" },
        { key: "tech", label: "Tech", type: "list", placeholder: "tech" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "highlights", label: "Highlights", type: "list", placeholder: "highlight" },
      ]}
      newItem={() => ({
        id: crypto.randomUUID().slice(0, 8),
        title: "",
        tagline: "",
        category: "",
        year: "",
        status: "",
        tech: [],
        description: "",
      })}
      titleOf={(p) => `${p.year} — ${p.title}`}
      view={(p) => (p.id ? `/projects/${p.id}` : undefined)}
      renderDetail={(raw, update) => {
        const item = raw as Project;
        return (
          <div className="space-y-3">
            <ImageField
              label="Cover image"
              hint="Shown on the project card and detail page."
              value={item.image ?? ""}
              onChange={(v) => update({ image: v })}
              uploadImage={uploadImage}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="ID" hint="Used in the URL /projects/:id. Change carefully.">
                <TextInput value={item.id ?? ""} onChange={(v) => update({ id: v })} />
              </Field>
              <Field label="Links">
                <div className="grid gap-2">
                  <TextInput value={item.links?.github ?? ""} placeholder="github url" onChange={(v) => update({ links: { ...(item.links ?? {}), github: v } })} />
                  <TextInput value={item.links?.demo ?? ""} placeholder="demo url" onChange={(v) => update({ links: { ...(item.links ?? {}), demo: v } })} />
                </div>
              </Field>
            </div>
            <CaseStudyEditor value={item.caseStudy} update={update} />
          </div>
        );
      }}
    />
  );
}

export function AchievementsSection({
  value,
  onChange,
  uploadImage,
}: {
  value: Achievement[];
  onChange: (v: Achievement[]) => void;
  uploadImage?: (file: File) => Promise<string>;
}) {
  return (
    <Repeater<Achievement>
      items={value}
      onChange={onChange}
      itemLabel="achievement"
      fields={[
        { key: "event", label: "Event", type: "text", placeholder: "e.g. IOE Hackathon" },
        { key: "title", label: "Title", type: "text" },
        { key: "year", label: "Year", type: "text", placeholder: "e.g. 2026" },
        { key: "result", label: "Result", type: "text", placeholder: "e.g. 1st place, finalist" },
        { key: "detail", label: "Detail", type: "textarea" },
      ]}
      newItem={() => ({ id: crypto.randomUUID().slice(0, 8), event: "", title: "", year: "", result: "", detail: "" })}
      titleOf={(a) => `${a.year} — ${a.event}`}
      view={() => "/#wins"}
      renderDetail={(raw, update) => {
        const item = raw as Achievement;
        return (
          <div className="space-y-3">
            <ImageField
              label="Certificate / photo"
              hint="Optional. Shows as a thumbnail in the wins list."
              value={item.image ?? ""}
              onChange={(v) => update({ image: v })}
              uploadImage={uploadImage}
            />
          </div>
        );
      }}
    />
  );
}

export function FeaturedInSection({
  value,
  onChange,
  uploadImage,
}: {
  value: FeaturedIn[];
  onChange: (v: FeaturedIn[]) => void;
  uploadImage?: (file: File) => Promise<string>;
}) {
  return (
    <Repeater<FeaturedIn>
      items={value}
      onChange={onChange}
      itemLabel="outlet"
      fields={[
        { key: "name", label: "Outlet", type: "text" },
        { key: "url", label: "URL", type: "text", placeholder: "https://…" },
      ]}
      newItem={() => ({ name: "", url: "" })}
      titleOf={(o) => o.name}
      view={() => "/#featured"}
      renderDetail={(raw, update) => {
        const item = raw as FeaturedIn;
        return (
          <div className="space-y-3">
            <ImageField
              label="Preview image"
              hint="Shown as a thumbnail in the featured-in grid."
              value={item.image ?? ""}
              onChange={(v) => update({ image: v })}
              uploadImage={uploadImage}
            />
          </div>
        );
      }}
    />
  );
}

/* ---------------- shared section wrapper ---------------- */

export function AdminCard({ title, kicker, actions, children }: { title: string; kicker?: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-line bg-surface p-5")}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-ink">{title}</h2>
          {kicker ? <p className="mt-1 text-sm text-ink-faint">{kicker}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
