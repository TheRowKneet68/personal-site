import { ArrowDown, ArrowRight, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { Diagram, DiagramLane, DiagramNode } from "../../types";
import { SystemDiagram } from "../SystemDiagram";
import { cn } from "../../utils/format";
import { Field, TextArea } from "./fields";
import { move, ui } from "./ui";

const emptyLane = (): DiagramLane => ({ name: "", nodes: [{ name: "" }, { name: "" }], links: [null] });

/** Keep links[] exactly one shorter than nodes[]. */
function fixLinks(lane: DiagramLane): DiagramLane {
  const want = Math.max(0, lane.nodes.length - 1);
  const links = lane.links.slice(0, want);
  while (links.length < want) links.push(null);
  return { ...lane, links };
}

function LaneEditor({
  lane,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  lane: DiagramLane;
  index: number;
  count: number;
  onChange: (l: DiagramLane) => void;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  const setNode = (i: number, patch: Partial<DiagramNode>) =>
    onChange({ ...lane, nodes: lane.nodes.map((n, j) => (j === i ? { ...n, ...patch } : n)) });
  const setLink = (i: number, v: string) => onChange({ ...lane, links: lane.links.map((l, j) => (j === i ? v || null : l)) });
  const removeNode = (i: number) =>
    onChange(fixLinks({ ...lane, nodes: lane.nodes.filter((_, j) => j !== i), links: lane.links.filter((_, j) => j !== Math.max(0, i - 1)) }));

  return (
    <div className="rounded-[6px] border border-line bg-bg p-4">
      <div className="flex items-center gap-1.5">
        <input
          className={ui.input}
          value={lane.name}
          placeholder="Lane name, e.g. Ignition"
          aria-label={`Lane ${index + 1} name`}
          onChange={(e) => onChange({ ...lane, name: e.target.value })}
        />
        <button type="button" className={ui.icon} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label="Move lane up" title="Move lane up">
          <ArrowUp className="size-4" aria-hidden />
        </button>
        <button type="button" className={ui.icon} disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label="Move lane down" title="Move lane down">
          <ArrowDown className="size-4" aria-hidden />
        </button>
        <button type="button" className={cn(ui.icon, "hover:text-warn")} onClick={onRemove} aria-label="Remove lane" title="Remove lane">
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>

      <ol className="mt-3 space-y-1.5">
        {lane.nodes.map((node, i) => (
          <li key={i}>
            <div className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-center">
              <input
                className={ui.input}
                value={node.name}
                placeholder="Part or step, e.g. nRF52840"
                aria-label={`Node ${i + 1} name`}
                onChange={(e) => setNode(i, { name: e.target.value })}
              />
              <input
                className={ui.input}
                value={node.role ?? ""}
                placeholder="What it does (optional)"
                aria-label={`Node ${i + 1} role`}
                onChange={(e) => setNode(i, { role: e.target.value || undefined })}
              />
              <label className="inline-flex cursor-pointer items-center gap-2 px-1 text-[0.85rem] text-ink-dim" title="Show the name in monospace, like a part number">
                <input
                  type="checkbox"
                  className="size-4 cursor-pointer accent-[var(--rk-accent)]"
                  checked={Boolean(node.part)}
                  onChange={(e) => setNode(i, { part: e.target.checked || undefined })}
                />
                Part number
              </label>
              <button
                type="button"
                className={cn(ui.icon, "hover:text-warn")}
                disabled={lane.nodes.length <= 1}
                onClick={() => removeNode(i)}
                aria-label={`Remove node ${i + 1}`}
                title="Remove node"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
            {i < lane.nodes.length - 1 ? (
              <div className="flex items-center gap-2 py-1.5 pl-3">
                <ArrowRight className="size-4 shrink-0 rotate-90 text-ink-faint sm:rotate-0" aria-hidden />
                <input
                  className="h-8 w-full max-w-60 rounded-[3px] border border-field bg-surface px-2 font-mono text-[0.8rem] text-ink placeholder:font-sans placeholder:text-ink-faint focus:border-accent focus:outline-none"
                  value={lane.links[i] ?? ""}
                  placeholder="Link, e.g. BLE (optional)"
                  aria-label={`Link from node ${i + 1} to node ${i + 2}`}
                  onChange={(e) => setLink(i, e.target.value)}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      <button
        type="button"
        className={cn(ui.add, "mt-3")}
        onClick={() => onChange(fixLinks({ ...lane, nodes: [...lane.nodes, { name: "" }], links: [...lane.links, null] }))}
      >
        <Plus className="size-4" aria-hidden /> Add node
      </button>
    </div>
  );
}

/** Builds a project's system diagram, with a live preview of the site rendering. */
export function DiagramEditor({
  value,
  fallback,
  title,
  onChange,
}: {
  value: Diagram | undefined;
  fallback: Diagram | undefined;
  title: string;
  onChange: (d: Diagram | undefined) => void;
}) {
  const own = value && Array.isArray(value.lanes) ? value : undefined;

  if (!own) {
    return (
      <div className="rounded-[6px] border border-dashed border-line-strong p-5">
        <p className="text-[0.95rem] text-ink-dim">
          {fallback
            ? "This project shows the built-in diagram. Copy it here to edit it."
            : "No diagram yet. A diagram shows how the parts connect: one lane per signal path."}
        </p>
        <button
          type="button"
          className={cn(ui.secondary, "mt-4")}
          onClick={() => onChange(fallback ? structuredClone(fallback) : { caption: "", lanes: [emptyLane()] })}
        >
          {fallback ? "Edit a copy of the built-in diagram" : "Start a diagram"}
        </button>
        {fallback ? (
          <div className="mt-5">
            <SystemDiagram diagram={fallback} title={title} compact animate={false} />
          </div>
        ) : null}
      </div>
    );
  }

  const setLane = (i: number, lane: DiagramLane) => onChange({ ...own, lanes: own.lanes.map((l, j) => (j === i ? lane : l)) });
  const ready = own.lanes.some((l) => l.nodes.some((n) => n.name.trim()));

  return (
    <div className="space-y-4">
      <Field label="Caption" hint="One or two sentences under the diagram, in plain words.">
        <TextArea value={own.caption} rows={2} onChange={(v) => onChange({ ...own, caption: v })} />
      </Field>
      <div className="space-y-3">
        {own.lanes.map((lane, i) => (
          <LaneEditor
            key={i}
            lane={lane}
            index={i}
            count={own.lanes.length}
            onChange={(l) => setLane(i, l)}
            onMove={(a, b) => onChange({ ...own, lanes: move(own.lanes, a, b) })}
            onRemove={() => onChange({ ...own, lanes: own.lanes.filter((_, j) => j !== i) })}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={ui.add} onClick={() => onChange({ ...own, lanes: [...own.lanes, emptyLane()] })}>
          <Plus className="size-4" aria-hidden /> Add lane
        </button>
        <button type="button" className={cn(ui.danger, "h-9")} onClick={() => onChange(undefined)}>
          {fallback ? "Go back to the built-in diagram" : "Remove diagram"}
        </button>
      </div>
      {ready ? (
        <div>
          <p className={ui.label}>Preview</p>
          <SystemDiagram diagram={own} title={title} compact animate={false} />
        </div>
      ) : null}
    </div>
  );
}
