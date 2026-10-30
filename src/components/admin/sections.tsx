import { useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, Trash2 } from "lucide-react";
import type { Achievement, ExperienceEntry, FeaturedIn, Principle, Profile, SocialLink, Testimonial } from "../../types";
import { cn } from "../../utils/format";
import { detectPlatform, isValidHttpUrl, platformIcon, platformName, PLATFORMS } from "../../lib/platforms";
import { Field, ImageField, ImageList, PairList, StringList, TextArea, TextInput, Toggle } from "./fields";
import { ui } from "./ui";

/* ---------------- generic repeater ---------------- */

type FieldType = "text" | "textarea" | "toggle" | "list" | "select" | "number";

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  options?: string[];
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
  sorts,
  summaryToggles,
}: {
  items: T[];
  onChange: (v: T[]) => void;
  fields: FieldDef[];
  newItem: () => T;
  titleOf: (item: T) => string;
  renderDetail?: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  itemLabel?: string;
  view?: (item: T) => string | undefined;
  sorts?: { id: string; label: string; compare: (a: T, b: T) => number }[];
  /** Extra pill toggles shown on the collapsed row next to the boolean fields.
      Used for fields that aren't plain booleans (e.g. caseStudy). */
  summaryToggles?: { label: string; checked: (item: T) => boolean; patch: (item: T, on: boolean) => Partial<T> }[];
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("manual");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const update = (i: number, patch: Partial<T>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item as T);
    onChange(next);
  };
  const q = query.trim().toLowerCase();
  const activeSort = sorts?.find((s) => s.id === sortKey);
  let rows = items.map((item, i) => ({ item, i }));
  if (q) rows = rows.filter(({ item }) => titleOf(item).toLowerCase().includes(q));
  if (activeSort) rows = [...rows].sort((a, b) => activeSort.compare(a.item, b.item) || a.i - b.i);
  const sorted = Boolean(activeSort);
  const thumb = (item: T) => {
    const v = (item as Record<string, unknown>).images;
    if (Array.isArray(v)) {
      const first = v.find((x): x is string => typeof x === "string" && x.length > 0);
      if (first) return first;
    }
    return undefined;
  };
  const btnCls =
    ui.small;

  return (
    <div className="space-y-3">
      {items.length > 6 || (sorts && sorts.length > 0) ? (
        <div className="flex flex-wrap items-center gap-2">
          {items.length > 6 ? (
            <input
              className={cn(ui.input, "min-w-52 flex-1")}
              placeholder={`Search ${itemLabel}s`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          ) : null}
          {sorts && sorts.length > 0 ? (
            <select
              className={cn(ui.input, "w-auto cursor-pointer")}
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              <option value="manual">Manual order</option>
              {sorts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}
      {rows.length === 0 ? <p className="text-[0.92rem] text-ink-faint">No {itemLabel}s match “{query}”.</p> : null}
      {rows.map(({ item, i }, k) => {
        const img = thumb(item);
        const href = view?.(item);
        const title = titleOf(item).trim();
        const toggles = [
          ...fields
            .filter((f) => f.type === "toggle")
            .map((f) => ({
              label: f.label,
              checked: (it: T) => Boolean((it as Record<string, unknown>)[f.key]),
              patch: (_it: T, on: boolean) => ({ [f.key]: on } as Partial<T>),
            })),
          ...(summaryToggles ?? []),
        ];
        return (
          <details key={i} className={cn("group rounded-[6px] border border-line bg-surface", dragIdx === i && "opacity-50")}>
            <summary
              draggable={!sorted}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                setDragIdx(i);
              }}
              onDragOver={(e) => {
                if (dragIdx === null || dragIdx === i) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                move(dragIdx, i);
                setDragIdx(i);
              }}
              onDragEnd={() => setDragIdx(null)}
              className="flex cursor-pointer select-none list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden"
              title={sorted ? "Reorder is disabled while a sort is active - choose 'sort: manual order' first" : "Drag to reorder, click to edit"}
            >
              <span
                className={cn("shrink-0 text-ink-faint", !sorted ? "cursor-grab" : "cursor-default")}
                aria-hidden
              >
                <GripVertical className="size-4" />
              </span>
              {img ? (
                <img src={img} alt="" className="size-10 shrink-0 rounded-[4px] border border-line bg-bg object-cover" />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[4px] border border-line bg-bg text-[0.9rem] font-semibold text-ink-faint">
                  {title.charAt(0).toUpperCase() || "·"}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.95rem] font-medium text-ink">{title || `Untitled ${itemLabel}`}</span>
                <span className="block text-[0.8rem] text-ink-faint">
                  {k + 1} of {rows.length}
                </span>
              </span>
              {toggles.map((t) => {
                const on = t.checked(item);
                return (
                  <label
                    key={t.label}
                    className={cn(
                      "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[4px] border px-2.5 py-1 text-[0.82rem]",
                      on ? "border-accent/60 bg-accent-soft text-ink" : "border-line text-ink-faint",
                    )}
                    title={`${t.label} - toggle without opening`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="size-3.5 accent-[var(--rk-accent)]"
                      checked={on}
                      onChange={(e) => update(i, t.patch(item, e.target.checked))}
                    />
                    {t.label}
                  </label>
                );
              })}
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(ui.small, "shrink-0 max-sm:hidden")}
                  title="Open on the live site"
                >
                  View
                </a>
              ) : null}
              <ChevronDown className="size-4 shrink-0 text-ink-faint transition-transform group-open:rotate-180" aria-hidden />
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
                if (f.type === "select") {
                  return (
                    <Field key={f.key} label={f.label} hint={f.hint}>
                      <select
                        className={cn(ui.input, "cursor-pointer")}
                        value={typeof val === "string" ? val : ""}
                        onChange={(e) => update(i, { [f.key]: e.target.value } as Partial<T>)}
                      >
                        {(f.options ?? []).map((o) => (
                          <option key={o} value={o}>
                            {o === "" ? "Not set" : o}
                          </option>
                        ))}
                      </select>
                    </Field>
                  );
                }
                if (f.type === "number") {
                  return (
                    <Field key={f.key} label={f.label} hint={f.hint}>
                      <input
                        type="number"
                        className={cn(ui.input, "cursor-pointer")}
                        value={typeof val === "number" ? val : ""}
                        placeholder="e.g. 1, 2, 3"
                        onChange={(e) => update(i, { [f.key]: e.target.value === "" ? undefined : Number(e.target.value) } as Partial<T>)}
                      />
                    </Field>
                  );
                }
                return (
                  <Field key={f.key} label={f.label} hint={f.hint}>
                    <StringList value={Array.isArray(val) ? (val as string[]) : []} itemLabel={f.placeholder ?? "item"} onChange={(v) => update(i, { [f.key]: v } as Partial<T>)} />
                  </Field>
                );
              })}
              {renderDetail ? <div className="border-t border-line pt-3">{renderDetail(item, (patch) => update(i, patch))}</div> : null}
              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <button type="button" className={btnCls} disabled={sorted || i === 0} onClick={() => move(i, i - 1)} title="Move this item up">
                  Move up
                </button>
                <button type="button" className={btnCls} disabled={sorted || i === items.length - 1} onClick={() => move(i, i + 1)} title="Move this item down">
                  Move down
                </button>
                <button
                  type="button"
                  className={btnCls}
                  onClick={() => {
                    const duplicate = { ...item } as T & { id?: string };
                    if (typeof duplicate.id === "string") {
                      duplicate.id = `${duplicate.id}-copy-${crypto.randomUUID().slice(0, 8)}`;
                    }
                    onChange([...items.slice(0, i + 1), duplicate, ...items.slice(i + 1)]);
                  }}
                  title="Duplicate this item"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className={cn(ui.danger, "ml-auto")}
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  title="Delete this item"
                >
                  Remove
                </button>
              </div>
            </div>
          </details>
        );
      })}
      <button
        type="button"
        className={ui.add}
        onClick={() => onChange([...items, newItem()])}
      >
        Add {itemLabel}
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
        <Field label="Est." hint='Shown as "est. YYYY" under the About portrait.'>
          <TextInput value={value.est ?? ""} onChange={(v) => set({ est: v })} />
        </Field>
      </div>
      <ImageField
        label="Portrait"
        hint="The photo shown in the About section. Upload a new one or paste a URL."
        value={value.portrait ?? ""}
        onChange={(v) => set({ portrait: v })}
        uploadImage={uploadImage}
      />
      <ImageField
        label="Portrait 1 (Hero)"
        hint="Optional circular portrait shown on the right side of the hero. Leave blank to hide it."
        value={value.portrait1 ?? ""}
        onChange={(v) => set({ portrait1: v })}
        uploadImage={uploadImage}
      />
      <Field label="Social links" hint="The /connect page manager - add, edit, reorder, enable/disable. Old key/value socials were migrated here automatically.">
        <ConnectSection value={value.social_links ?? []} onChange={(v) => set({ social_links: v })} />
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
      titleOf={(i) => [i.year, i.title].filter(Boolean).join("  ")}
      sorts={[
        { id: "year-new", label: "newest year", compare: (a, b) => b.year.localeCompare(a.year) },
        { id: "year-old", label: "oldest year", compare: (a, b) => a.year.localeCompare(b.year) },
        { id: "title", label: "title A-Z", compare: (a, b) => a.title.localeCompare(b.title) },
      ]}
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

/** profile.tech - Record<category, string[]>. Double as the site's skills. */
export function SkillsSection({ value, onChange }: { value: Record<string, string[]>; onChange: (v: Record<string, string[]>) => void }) {
  const entries = Object.entries(value);
  const set = (list: [string, string[]][]) => onChange(Object.fromEntries(list.filter(([k]) => k.trim() !== "")));
  const move = (from: number, to: number) => {
    const next = [...entries];
    const [entry] = next.splice(from, 1);
    next.splice(to, 0, entry as [string, string[]]);
    set(next);
  };
  const btnCls =
    ui.small;
  return (
    <div className="space-y-4">
      {entries.map(([category, skills], i) => (
        <div key={i} className="rounded-[6px] border border-line bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <input
              className={cn(ui.input, "w-56")}
              value={category}
              placeholder="Category"
              onChange={(e) => set(entries.map(([c, s], j) => (j === i ? [e.target.value, s] : [c, s])))}
            />
            <button type="button" className={btnCls} disabled={i === 0} onClick={() => move(i, i - 1)} title="Move category up">
              <ArrowUp className="size-4" aria-hidden />
            </button>
            <button type="button" className={btnCls} disabled={i === entries.length - 1} onClick={() => move(i, i + 1)} title="Move category down">
              <ArrowDown className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              className={ui.small}
              onClick={() => set(entries.filter((_, j) => j !== i))}
            >
              Remove category
            </button>
          </div>
          <StringList value={skills} itemLabel="skill" onChange={(v) => set(entries.map(([c, s], j) => (j === i ? [c, v] : [c, s])))} />
        </div>
      ))}
      <button
        type="button"
        className={ui.add}
        onClick={() => set([...entries, ["", []]])}
      >
        Add category
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
        { key: "date", label: "Date", type: "text", placeholder: "e.g. 2025-02-07", hint: "Exact date, YYYY-MM-DD. Used to order the timeline. Leave blank to fall back to the year." },
        { key: "result", label: "Result", type: "text", placeholder: "e.g. 1st place, finalist" },
        {
          key: "rank",
          label: "Placement",
          type: "select",
          hint: "Controls the sort order on the site - 1 shows first, 2 second, etc. Leave none to auto-detect from the result.",
          options: ["", ...Array.from({ length: 10 }, (_, i) => String(i + 1))],
        },
        { key: "highlight", label: "Highlight", type: "toggle" },
        { key: "detail", label: "Detail", type: "textarea" },
      ]}
      newItem={() => ({ id: crypto.randomUUID().slice(0, 8), event: "", title: "", year: "", result: "", detail: "" })}
      titleOf={(a) => [a.date || a.year, a.event || a.title].filter(Boolean).join("  ")}
      view={() => "/#recognition"}
      sorts={[
        { id: "year-new", label: "newest year", compare: (a, b) => b.year.localeCompare(a.year) },
        { id: "year-old", label: "oldest year", compare: (a, b) => a.year.localeCompare(b.year) },
        { id: "event", label: "event A-Z", compare: (a, b) => a.event.localeCompare(b.event) },
      ]}
      renderDetail={(raw, update) => {
        const item = raw as Achievement;
        return (
          <div className="space-y-3">
            <ImageList
              label="Certificates / photos"
              hint="Shown as thumbnails in the wins list."
              value={item.images ?? []}
              onChange={(v) => update({ images: v })}
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
      view={() => "/#recognition"}
      sorts={[
        { id: "name", label: "name A-Z", compare: (a, b) => a.name.localeCompare(b.name) },
      ]}
      renderDetail={(raw, update) => {
        const item = raw as FeaturedIn;
        return (
          <div className="space-y-3">
            <ImageList
              label="Preview images"
              hint="First image is the preview shown in the featured-in grid."
              value={item.images ?? []}
              onChange={(v) => update({ images: v })}
              uploadImage={uploadImage}
            />
          </div>
        );
      }}
    />
  );
}

/* ---------------- /connect social link manager ---------------- */

const linkInputCls =
  ui.input;

export function ConnectSection({ value, onChange }: { value: SocialLink[]; onChange: (v: SocialLink[]) => void }) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item as SocialLink);
    onChange(next);
  };
  const duplicate = (i: number, item: SocialLink) =>
    onChange([...value.slice(0, i + 1), { ...item, id: `${item.id || "social"}-copy-${crypto.randomUUID().slice(0, 6)}` }, ...value.slice(i + 1)]);
  const add = () =>
    onChange([
      ...value,
      {
        id: crypto.randomUUID().slice(0, 8),
        platform: "",
        name: "",
        url: "",
        description: "",
        enabled: true,
        showOnConnect: true,
        sortOrder: value.length,
        iconOverride: null,
      },
    ]);
  const btnCls = ui.small;

  return (
    <div className="space-y-3">
      <datalist id="rk-platform-list">
        {PLATFORMS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </datalist>
      {value.length === 0 ? (
        <p className="text-[0.92rem] text-ink-faint">No social links yet - paste a URL below and the platform is detected for you.</p>
      ) : (
        value.map((link, i) => (
          <SocialLinkRow
            key={link.id || i}
            link={link}
            index={i}
            count={value.length}
            dragIdx={dragIdx}
            onDragIndex={setDragIdx}
            onPatch={(patch) => onChange(value.map((l, j) => (j === i ? { ...l, ...patch } : l)))}
            onMove={move}
            onRemove={() => onChange(value.filter((_, j) => j !== i))}
            onDuplicate={() => duplicate(i, link)}
            buttonCls={btnCls}
          />
        ))
      )}
      <button
        type="button"
        className={ui.add}
        onClick={add}
      >
        Add social link
      </button>
    </div>
  );
}

function SocialLinkRow({
  link,
  index,
  count,
  dragIdx,
  onDragIndex,
  onPatch,
  onMove,
  onRemove,
  onDuplicate,
  buttonCls,
}: {
  link: SocialLink;
  index: number;
  count: number;
  dragIdx: number | null;
  onDragIndex: (i: number | null) => void;
  onPatch: (patch: Partial<SocialLink>) => void;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  buttonCls: string;
}) {
  // Remembers whether the current platform came from URL auto-detection. As
  // long as it did, pasting a different URL re-detects; once the admin picks a
  // platform manually, further pastes respect that override.
  const auto = useRef<string | null>(null);
  const onUrl = (url: string) => {
    const detected = detectPlatform(url);
    if (detected && (link.platform === "" || auto.current !== null)) {
      auto.current = detected;
      onPatch({ url, platform: detected, name: link.name || platformName(detected) });
      return;
    }
    onPatch({ url });
  };
  const onPlatform = (platform: string) => {
    auto.current = null;
    onPatch({ platform, name: link.name || platformName(platform) });
  };
  const Icon = platformIcon(link.iconOverride ?? link.platform);
  const urlInvalid = link.url.trim() !== "" && !isValidHttpUrl(link.url);
  const preview = !urlInvalid && link.url ? link.url : "";

  return (
    <div
      className={cn("rounded-[6px] border border-line bg-surface p-4", dragIdx === index && "opacity-50")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            onDragIndex(index);
          }}
          onDragOver={(e) => {
            if (dragIdx === null || dragIdx === index) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            onMove(dragIdx, index);
            onDragIndex(index);
          }}
          onDragEnd={() => onDragIndex(null)}
          className="cursor-grab text-ink-faint"
          title="Drag to reorder"
          aria-hidden
        >
          <GripVertical className="size-4" />
        </span>
        <span className="grid size-8 shrink-0 place-items-center rounded-[4px] border border-line bg-bg text-ink-dim" aria-hidden>
          <Icon className="size-4" />
        </span>
        <input
          className={cn(linkInputCls, "min-w-32 flex-1")}
          list="rk-platform-list"
          placeholder="Platform"
          value={link.platform}
          onChange={(e) => onPlatform(e.target.value)}
        />
        <input
          className={cn(linkInputCls, "min-w-32 flex-1")}
          placeholder="Display name"
          value={link.name}
          onChange={(e) => onPatch({ name: e.target.value })}
        />
        <div className="ml-auto flex items-center gap-1">
          <button type="button" className={buttonCls} disabled={index === 0} onClick={() => onMove(index, index - 1)} title="Move up">
            <ArrowUp className="size-4" aria-hidden />
          </button>
          <button type="button" className={buttonCls} disabled={index === count - 1} onClick={() => onMove(index, index + 1)} title="Move down">
            <ArrowDown className="size-4" aria-hidden />
          </button>
          <button type="button" className={buttonCls} onClick={onDuplicate} title="Duplicate this link">
            Duplicate
          </button>
          <button type="button" className={cn(buttonCls, "text-warn hover:border-warn hover:text-warn")} onClick={onRemove} title="Delete this link">
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          className={cn(linkInputCls, urlInvalid && "border-warn")}
          placeholder="https://www.instagram.com/example"
          value={link.url}
          onChange={(e) => onUrl(e.target.value)}
        />
        {preview ? (
          <a
            href={preview}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(ui.small, "h-10 shrink-0")}
            title="Open URL"
          >
            Open
          </a>
        ) : null}
      </div>
      {urlInvalid ? <p className="mt-1.5 text-[0.85rem] text-warn">URL must start with http:// or https://</p> : null}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <input
          className={linkInputCls}
          placeholder="Optional description shown on the card"
          value={link.description}
          onChange={(e) => onPatch({ description: e.target.value })}
        />
        <label className="flex items-center gap-2 text-[0.9rem] text-ink-dim">
          Icon
          <select
            className={cn(ui.input, "cursor-pointer")}
            value={link.iconOverride ?? ""}
            onChange={(e) => onPatch({ iconOverride: e.target.value || null })}
          >
            <option value="">Automatic</option>
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <Toggle label="Enabled" checked={link.enabled} onChange={(v) => onPatch({ enabled: v })} />
        <Toggle label="Show on /connect" checked={link.showOnConnect} onChange={(v) => onPatch({ showOnConnect: v })} />
      </div>
    </div>
  );
}

/* ---------------- shared section wrapper ---------------- */

export function AdminCard({ title, kicker, actions, children }: { title: string; kicker?: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div className="min-w-0">
          <h2 className="font-display text-[clamp(1.6rem,3vw,2.1rem)]">{title}</h2>
          {kicker ? <p className="mt-1.5 max-w-[62ch] text-[0.95rem] text-ink-dim">{kicker}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
