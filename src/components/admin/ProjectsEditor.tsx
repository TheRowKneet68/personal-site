import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, Copy, ExternalLink, Plus, Search, Trash2 } from "lucide-react";
import type { CaseStudy, Project } from "../../types";
import { DIAGRAMS } from "../../lib/diagrams";
import { STATUS_META } from "../../lib/constants";
import { ALL_FIELDS, fieldOf } from "../../lib/stats";
import { cn } from "../../utils/format";
import { StatusBadge } from "../Badges";
import { DiagramEditor } from "./DiagramEditor";
import { Field, ImageList, PairList, Select, StringList, TextArea, TextInput, Toggle } from "./fields";
import { move, ui } from "./ui";
import { ID_RE, missingInfo } from "./checks";

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className={cn(ui.card, "p-5 sm:p-6")}>
      <h3 className="text-[1.1rem] font-bold">{title}</h3>
      {hint ? <p className="mt-1 text-[0.9rem] text-ink-faint">{hint}</p> : null}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function CaseStudyFields({ value, onChange }: { value: CaseStudy | undefined; onChange: (cs: CaseStudy | undefined) => void }) {
  const cs: CaseStudy = value ?? { problem: [], solution: [] };
  const set = (patch: Partial<CaseStudy>) => onChange({ ...cs, ...patch });
  const list = (label: string, key: "problem" | "solution" | "architecture" | "impact" | "lessons", item: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <StringList multiline value={cs[key] ?? []} itemLabel={item} onChange={(v) => set({ [key]: v })} />
    </Field>
  );
  return (
    <>
      {list("The problem", "problem", "paragraph", "Why this needed to exist. The first paragraph is shown larger.")}
      {list("The build", "solution", "paragraph", "What you made and how it works.")}
      {list("How it's wired", "architecture", "point")}
      <Field label="What went wrong">
        <PairList
          value={cs.challenges ?? []}
          fields={{ keyA: "problem", labelA: "problem", keyB: "fix", labelB: "fix" }}
          itemLabel="problem and fix"
          onChange={(v) => set({ challenges: v as CaseStudy["challenges"] })}
        />
      </Field>
      {list("What it did", "impact", "paragraph")}
      {list("What I'd tell my past self", "lessons", "lesson")}
      <Field label="Stack" hint="Parts and tools. These also count toward the parts chart.">
        <StringList value={cs.stack ?? []} itemLabel="part or tool" onChange={(v) => set({ stack: v })} />
      </Field>
    </>
  );
}

/** The project as visitors meet it on the home page, updated as you type. */
function Preview({ project }: { project: Project }) {
  const img = project.images?.[0];
  return (
    <section className={cn(ui.card, "overflow-hidden")} aria-label="Preview">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5">
        <span className="text-[0.85rem] font-semibold text-ink-dim">Preview</span>
        {project.id ? (
          <a href={`/projects/${project.id}`} target="_blank" rel="noopener noreferrer" className={cn(ui.small, "shrink-0")} title="Shows the saved version">
            <ExternalLink className="size-3.5" aria-hidden /> Open page
          </a>
        ) : null}
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_11rem]">
        <div className="min-w-0">
          <p className="text-[0.85rem] text-ink-faint">{[project.year, project.category].filter(Boolean).join(", ")}</p>
          <h3 className="font-display mt-1 text-[1.75rem] leading-none">{project.title || "Untitled project"}</h3>
          <p className={cn("mt-2 font-semibold", !project.tagline && "font-normal text-ink-faint")}>{project.tagline || "Add a one-line summary"}</p>
          <p className="mt-2 line-clamp-4 text-[0.95rem] text-ink-dim">{project.description || "Add the story: two to four sentences."}</p>
          <StatusBadge status={project.status} className="mt-3" />
        </div>
        {img ? (
          <img src={img} alt="" className="aspect-[4/3] w-full rounded-[4px] border border-line object-cover" />
        ) : (
          <div className="grid aspect-[4/3] place-items-center rounded-[4px] border border-dashed border-line-strong px-3 text-center text-[0.85rem] text-ink-faint">
            No photo yet
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectForm({
  project,
  update,
  uploadImage,
  idTaken,
}: {
  project: Project;
  update: (patch: Partial<Project>) => void;
  uploadImage?: (file: File) => Promise<string>;
  idTaken: boolean;
}) {
  const guess = fieldOf(project.category ?? "");
  const idBad = !ID_RE.test(project.id ?? "") || idTaken;
  return (
    <div className="space-y-5">
      <Preview project={project} />

      <Group title="Essentials" hint="What visitors see first. With these filled in, the project is ready to show.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Title">
            <TextInput value={project.title} invalid={!project.title.trim()} onChange={(v) => update({ title: v })} />
          </Field>
          <Field label="One-line summary" hint="Shown under the title.">
            <TextInput value={project.tagline} onChange={(v) => update({ tagline: v })} />
          </Field>
          <Field label="Year" hint="Used in lists and the per-year chart.">
            <TextInput value={project.year} invalid={!/^\d{4}$/.test(project.year)} onChange={(v) => update({ year: v })} />
          </Field>
          <Field label="Status" hint="Pick one or type your own.">
            <input className={ui.input} list="rk-status-list" value={project.status} onChange={(e) => update({ status: e.target.value })} />
            <datalist id="rk-status-list">
              {Object.keys(STATUS_META).map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </Field>
        </div>
        <Field label="Story" hint="Two to four sentences: what it is, why it exists, what it does.">
          <TextArea value={project.description} rows={5} onChange={(v) => update({ description: v })} />
        </Field>
        <ImageList label="Photos" hint="The first photo leads. You can pick several files at once." value={project.images ?? []} onChange={(v) => update({ images: v })} uploadImage={uploadImage} />
        <Toggle label="Feature on the home page (large sheet with diagram)" checked={Boolean(project.featured)} onChange={(v) => update({ featured: v })} />
      </Group>

      <details className="group/more" open={idBad ? true : undefined}>
        <summary className={cn(ui.card, "flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden")}>
          <span className="min-w-0">
            <span className="block font-bold">More details</span>
            <span className="block text-[0.88rem] text-ink-faint">Category, page address, dates and team, highlights, parts, links, case study and diagram</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-ink-faint transition-transform group-open/more:rotate-180" aria-hidden />
        </summary>
        <div className="mt-5 space-y-5">
          <Group title="Category and page address">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Category" hint="Free text shown on the page, e.g. IoT & Security.">
                <TextInput value={project.category} onChange={(v) => update({ category: v })} />
              </Field>
              <Field label="Field for the charts" hint={`Automatic picks: ${guess.label}.`}>
                <Select
                  value={project.field ?? ""}
                  onChange={(v) => update({ field: v || undefined })}
                  options={[{ value: "", label: `Automatic (${guess.label})` }, ...ALL_FIELDS.map((f) => ({ value: f.key, label: f.label }))]}
                />
              </Field>
              <Field label="Page address" hint={idTaken ? "Another project already uses this address." : "/projects/your-address. Lowercase letters, numbers and dashes."}>
                <TextInput value={project.id} invalid={idBad} onChange={(v) => update({ id: v.trim() })} />
              </Field>
            </div>
          </Group>

          <Group title="Dates and team" hint="Shown on the project page when filled in.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Started">
                <input type="month" className={ui.input} value={(project.started ?? "").slice(0, 7)} onChange={(e) => update({ started: e.target.value || undefined })} />
              </Field>
              <Field label="Finished" hint="Leave empty if it is still going.">
                <input type="month" className={ui.input} value={(project.finished ?? "").slice(0, 7)} onChange={(e) => update({ finished: e.target.value || undefined })} />
              </Field>
              <Field label="Context" hint="Course, hackathon or client, e.g. Diploma major project, CTEVT.">
                <TextInput value={project.context ?? ""} onChange={(v) => update({ context: v || undefined })} />
              </Field>
              <Field label="Supervisor">
                <TextInput value={project.supervisor ?? ""} onChange={(v) => update({ supervisor: v || undefined })} />
              </Field>
            </div>
            <Field label="Team" hint="Everyone else who built it.">
              <StringList value={project.team ?? []} itemLabel="person" onChange={(v) => update({ team: v.length ? v : undefined })} />
            </Field>
          </Group>

          <Group title="Highlights and parts">
            <Field label="Highlights" hint="Short facts. Shown when the project has no case study.">
              <StringList value={project.highlights ?? []} itemLabel="highlight" onChange={(v) => update({ highlights: v })} />
            </Field>
            <Field label="Parts and tools" hint="These also count toward the parts chart.">
              <StringList value={project.tech ?? []} itemLabel="part or tool" onChange={(v) => update({ tech: v })} />
            </Field>
          </Group>

          <Group title="Links">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Source code" hint="A repository link. A profile link is labelled as a profile on the site.">
                <TextInput value={project.links?.github ?? ""} placeholder="https://github.com/…" onChange={(v) => update({ links: { ...(project.links ?? {}), github: v } })} />
              </Field>
              <Field label="Live demo">
                <TextInput value={project.links?.demo ?? ""} placeholder="https://…" onChange={(v) => update({ links: { ...(project.links ?? {}), demo: v } })} />
              </Field>
            </div>
          </Group>

          <Group title="Case study" hint="Featured projects should have one. Leave everything empty to show the story instead.">
            <CaseStudyFields value={project.caseStudy} onChange={(cs) => update({ caseStudy: cs })} />
          </Group>

          <Group title="System diagram" hint="How it works: say what each part does (controller, sensor, cellular link), not the exact chip or module, so nobody can copy the build from the picture.">
            <DiagramEditor value={project.diagram} fallback={DIAGRAMS[project.id]} title={project.title} onChange={(d) => update({ diagram: d })} />
          </Group>
        </div>
      </details>
    </div>
  );
}

type Filter = "all" | "featured" | "missing";

export function ProjectsEditor({
  value,
  onChange,
  uploadImage,
  initialId,
}: {
  value: Project[];
  onChange: (v: Project[]) => void;
  uploadImage?: (file: File) => Promise<string>;
  /** Opens this project straight away (the site's "Edit this project" link). */
  initialId?: string;
}) {
  const [selected, setSelected] = useState<number | null>(() => {
    const i = initialId ? value.findIndex((p) => p.id === initialId) : -1;
    return i >= 0 ? i : null;
  });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return value
      .map((p, i) => ({ p, i, missing: missingInfo(p) }))
      .filter(({ p }) => !q || `${p.title} ${p.tagline} ${p.category} ${p.year}`.toLowerCase().includes(q))
      .filter(({ p, missing }) => (filter === "featured" ? p.featured : filter === "missing" ? missing.length > 0 : true));
  }, [value, query, filter]);

  const needInfo = value.filter((p) => missingInfo(p).length > 0).length;
  const current = selected !== null ? value[selected] : undefined;
  const update = (patch: Partial<Project>) =>
    selected !== null && onChange(value.map((p, j) => (j === selected ? { ...p, ...patch } : p)));
  const moveTo = (to: number) => {
    if (selected === null || to < 0 || to >= value.length) return;
    onChange(move(value, selected, to));
    setSelected(to);
  };
  const add = () => {
    const id = `project-${crypto.randomUUID().slice(0, 6)}`;
    onChange([...value, { id, title: "New project", tagline: "", category: "", year: String(new Date().getFullYear()), status: "in progress", tech: [], description: "" }]);
    setSelected(value.length);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <aside className={cn("min-w-0 lg:sticky lg:top-20 lg:self-start", current && "max-lg:hidden")}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input className={cn(ui.input, "pl-9")} placeholder="Search projects" aria-label="Search projects" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter projects">
          {(
            [
              ["all", `All ${value.length}`],
              ["featured", `Featured ${value.filter((p) => p.featured).length}`],
              ["missing", `Missing info ${needInfo}`],
            ] as [Filter, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={cn(
                "h-8 cursor-pointer rounded-[4px] border px-2.5 text-[0.85rem] transition-colors",
                filter === k ? "border-ink bg-ink text-bg" : "border-line-strong text-ink-dim hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <ul className="mt-3 max-h-[calc(100vh-17rem)] space-y-1 overflow-y-auto pr-1">
          {rows.map(({ p, i, missing }) => (
            <li key={`${p.id}-${i}`}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                aria-current={selected === i ? "true" : undefined}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-[4px] px-2.5 py-2 text-left transition-colors",
                  selected === i ? "bg-raised" : "hover:bg-surface",
                )}
              >
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt="" className="size-9 shrink-0 rounded-[3px] border border-line bg-bg object-cover" />
                ) : (
                  <span className="grid size-9 shrink-0 place-items-center rounded-[3px] border border-line bg-bg text-[0.9rem] font-bold text-ink-faint" aria-hidden>
                    {p.title.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.92rem] font-semibold text-ink">{p.title || "Untitled"}</span>
                  <span className="block truncate text-[0.8rem] text-ink-faint">
                    {p.year}
                    {p.featured ? ", featured" : ""}
                    {missing.length ? `, ${missing.length} missing` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {rows.length === 0 ? <li className="px-2.5 py-4 text-[0.9rem] text-ink-faint">No projects match.</li> : null}
        </ul>
        <button type="button" className={cn(ui.add, "mt-3 w-full justify-center")} onClick={add}>
          <Plus className="size-4" aria-hidden /> Add project
        </button>
      </aside>

      <div className={cn("min-w-0", !current && "max-lg:hidden")}>
        {current && selected !== null ? (
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <button type="button" className={cn(ui.small, "lg:hidden")} onClick={() => setSelected(null)}>
                <ArrowLeft className="size-4" aria-hidden /> All projects
              </button>
              <h3 className="font-display mr-auto min-w-0 text-[1.7rem] leading-tight">{current.title || "Untitled project"}</h3>
              <a href={`/projects/${current.id}`} target="_blank" rel="noopener noreferrer" className={ui.small}>
                <ExternalLink className="size-3.5" aria-hidden /> View
              </a>
              <button type="button" className={ui.small} disabled={selected === 0} onClick={() => moveTo(selected - 1)} title="Show earlier in the list">
                <ArrowUp className="size-3.5" aria-hidden /> Up
              </button>
              <button type="button" className={ui.small} disabled={selected === value.length - 1} onClick={() => moveTo(selected + 1)} title="Show later in the list">
                <ArrowDown className="size-3.5" aria-hidden /> Down
              </button>
              <button
                type="button"
                className={ui.small}
                onClick={() => {
                  const copy = { ...structuredClone(current), id: `${current.id}-copy`, title: `${current.title} (copy)` };
                  onChange([...value.slice(0, selected + 1), copy, ...value.slice(selected + 1)]);
                  setSelected(selected + 1);
                }}
              >
                <Copy className="size-3.5" aria-hidden /> Duplicate
              </button>
              <button
                type="button"
                className={ui.danger}
                onClick={() => {
                  if (!window.confirm(`Delete "${current.title}"? It disappears from the site when you save.`)) return;
                  onChange(value.filter((_, j) => j !== selected));
                  setSelected(null);
                }}
              >
                <Trash2 className="size-3.5" aria-hidden /> Delete
              </button>
            </div>
            {missingInfo(current).length ? (
              <p className="mb-5 rounded-[4px] border border-line bg-surface px-4 py-3 text-[0.9rem] text-ink-dim">
                Still missing: {missingInfo(current).join(", ")}.
              </p>
            ) : null}
            <ProjectForm
              project={current}
              update={update}
              uploadImage={uploadImage}
              idTaken={value.some((p, j) => j !== selected && p.id === current.id)}
            />
          </div>
        ) : (
          <div className="grid min-h-60 place-items-center rounded-[6px] border border-dashed border-line-strong p-8 text-center">
            <p className="max-w-[40ch] text-ink-dim">
              Pick a project to edit it. {needInfo > 0 ? `${needInfo} of ${value.length} are missing something a visitor would notice.` : "Every project has its key details."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
