import type { HeroCopy, Profile, ProfileStats, SectionKey, StatSource } from "../../types";
import { DEFAULT_HERO, DEFAULT_INTROS } from "../../lib/constants";
import { cn } from "../../utils/format";
import { AddButton, Field, RowActions, Select, TextArea, TextInput } from "./fields";
import { move, ui } from "./ui";

const INTRO_LABEL: Record<SectionKey, string> = {
  work: "Selected work",
  numbers: "By the numbers",
  recognition: "Recognition",
  about: "About",
  contact: "Contact",
};

// The server recounts these on every request (deriveStats in server/services/content.ts).
const SOURCES: { value: StatSource | ""; label: string }[] = [
  { value: "projects", label: "Count: projects" },
  { value: "awards", label: "Count: achievements" },
  { value: "placements", label: "Count: placements" },
  { value: "dan", label: "Dan badge" },
  { value: "", label: "Typed by hand" },
];

/** Hero headline, section intros and hero stats. Empty fields use the defaults. */
export function SiteCopySection({ value, onChange }: { value: Profile; onChange: (p: Profile) => void }) {
  const hero = value.hero ?? {};
  const setHero = (patch: Partial<HeroCopy>) => onChange({ ...value, hero: { ...hero, ...patch } });
  const setIntro = (k: SectionKey, v: string) => onChange({ ...value, intros: { ...(value.intros ?? {}), [k]: v } });

  return (
    <div className="space-y-6">
      <section className={cn(ui.card, "p-5 sm:p-6")}>
        <h3 className="text-[1.1rem] font-bold">Hero</h3>
        <p className="mt-1 text-[0.9rem] text-ink-faint">The first thing visitors read. Leave a field empty to use the text in grey.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Field label="First line">
            <TextInput value={hero.line1 ?? ""} placeholder={DEFAULT_HERO.line1} onChange={(v) => setHero({ line1: v })} />
          </Field>
          <Field label="Accent word" hint="Shown in serif italic.">
            <TextInput value={hero.accent ?? ""} placeholder={DEFAULT_HERO.accent} onChange={(v) => setHero({ accent: v })} />
          </Field>
          <Field label="Rest of the second line">
            <TextInput value={hero.line2 ?? ""} placeholder={DEFAULT_HERO.line2} onChange={(v) => setHero({ line2: v })} />
          </Field>
        </div>
        <div className="mt-5">
          <Field label="Sentence after your name and slogan" hint={`Reads: "I'm ${value.name} - ${value.slogan}. …"`}>
            <TextArea value={hero.lede ?? ""} rows={2} placeholder={DEFAULT_HERO.lede} onChange={(v) => setHero({ lede: v })} />
          </Field>
        </div>
      </section>

      <section className={cn(ui.card, "p-5 sm:p-6")}>
        <h3 className="text-[1.1rem] font-bold">Hero stats</h3>
        <p className="mt-1 text-[0.9rem] text-ink-faint">
          The readouts under the hero. A counted stat updates by itself when you add a project or an achievement; rename it freely.
        </p>
        <div className="mt-5">
          <StatsEditor value={value.stats} onChange={(stats) => onChange({ ...value, stats })} />
        </div>
      </section>

      <section className={cn(ui.card, "p-5 sm:p-6")}>
        <h3 className="text-[1.1rem] font-bold">Section intros</h3>
        <p className="mt-1 text-[0.9rem] text-ink-faint">The sentence beside each section title.</p>
        <div className="mt-5 space-y-5">
          {(Object.keys(INTRO_LABEL) as SectionKey[]).map((k) => (
            <Field key={k} label={INTRO_LABEL[k]}>
              <TextArea value={value.intros?.[k] ?? ""} rows={2} placeholder={DEFAULT_INTROS[k] || "No intro"} onChange={(v) => setIntro(k, v)} />
            </Field>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Label + where the value comes from. Counted values are shown read-only. */
function StatsEditor({ value, onChange }: { value: ProfileStats[]; onChange: (v: ProfileStats[]) => void }) {
  const set = (i: number, patch: Partial<ProfileStats>) => onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div className="space-y-2">
      {value.map((s, i) => (
        <div
          key={i}
          className="grid gap-1.5 rounded-[4px] border border-line p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,15rem)_7rem_auto] sm:items-center sm:border-0 sm:p-0"
        >
          <input className={ui.input} value={s.label} placeholder="Label" aria-label={`Stat ${i + 1} label`} onChange={(e) => set(i, { label: e.target.value })} />
          <Select
            value={s.source ?? ""}
            onChange={(v) => set(i, { source: v as StatSource | "" })}
            options={SOURCES}
            ariaLabel={`Stat ${i + 1} value source`}
          />
          {s.source ? (
            <span className="truncate px-1 font-mono text-[0.9rem] text-ink-dim" title="Recounted when you save">
              {s.value || "-"}
            </span>
          ) : (
            <input className={ui.input} value={s.value} placeholder="Value" aria-label={`Stat ${i + 1} value`} onChange={(e) => set(i, { value: e.target.value })} />
          )}
          <RowActions index={i} count={value.length} onMove={(a, b) => onChange(move(value, a, b))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
        </div>
      ))}
      <AddButton label="Add stat" onClick={() => onChange([...value, { label: "", value: "", source: "" }])} />
    </div>
  );
}
