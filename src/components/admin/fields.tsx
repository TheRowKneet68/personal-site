import type { ReactNode } from "react";
import { cn } from "../../utils/format";

const inputCls =
  "w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none";

const btnCls =
  "rounded border border-line px-2 py-0.5 font-mono text-[0.65rem] text-ink-dim hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink-dim";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-faint">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-faint">{hint}</span> : null}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className={inputCls}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      className={cn(inputCls, "resize-y")}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex items-center gap-2 font-mono text-xs text-ink-dim">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-accent"
      />
      {label}
    </label>
  );
}

function RowActions({
  index,
  count,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" className={btnCls} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label="move up">
        ↑
      </button>
      <button type="button" className={btnCls} disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label="move down">
        ↓
      </button>
      <button type="button" className={btnCls} onClick={onRemove} aria-label="remove">
        ×
      </button>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className={cn(btnCls, "px-3 py-1")} onClick={onClick}>
      + {label}
    </button>
  );
}

/** Editable list of strings with reorder + remove. */
export function StringList({
  value,
  onChange,
  placeholder,
  itemLabel = "item",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  itemLabel?: string;
}) {
  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className={inputCls}
            value={item}
            placeholder={placeholder ?? itemLabel}
            onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
          />
          <RowActions index={i} count={value.length} onMove={(a, b) => onChange(move(value, a, b))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
        </div>
      ))}
      <AddButton label={itemLabel} onClick={() => onChange([...value, ""])} />
    </div>
  );
}

/** Record<string, string> editor (e.g. socials, links). */
export function MapEditor({
  value,
  onChange,
  keyPlaceholder = "key",
  valuePlaceholder = "value",
  itemLabel = "entry",
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  itemLabel?: string;
}) {
  const entries = Object.entries(value);
  const set = (list: [string, string][]) => onChange(Object.fromEntries(list.filter(([k]) => k.trim() !== "")));
  return (
    <div className="space-y-2">
      {entries.map(([k, v], i) => (
        <div key={i} className="flex items-center gap-2">
          <input className={cn(inputCls, "max-w-40")} value={k} placeholder={keyPlaceholder} onChange={(e) => set(entries.map(([k0, v0], j) => (j === i ? [e.target.value, v0] : [k0, v0])))} />
          <input className={inputCls} value={v} placeholder={valuePlaceholder} onChange={(e) => set(entries.map(([k0, v0], j) => (j === i ? [k0, e.target.value] : [k0, v0])))} />
          <RowActions index={i} count={entries.length} onMove={(a, b) => set(move(entries, a, b))} onRemove={() => set(entries.filter((_, j) => j !== i))} />
        </div>
      ))}
      <AddButton label={itemLabel} onClick={() => set([...entries, ["", ""]])} />
    </div>
  );
}

export interface PairField {
  keyA: string;
  labelA: string;
  keyB: string;
  labelB: string;
}

/** Array of { keyA, keyB } objects (stats, principles, testimonials, challenges). */
export function PairList<T extends object>({
  value,
  fields,
  onChange,
  itemLabel = "entry",
}: {
  value: T[];
  fields: PairField;
  onChange: (v: T[]) => void;
  itemLabel?: string;
}) {
  const get = (item: T, key: string) => {
    const v = (item as Record<string, unknown>)[key];
    return typeof v === "string" ? v : "";
  };
  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className={inputCls}
            value={get(item, fields.keyA)}
            placeholder={fields.labelA}
            onChange={(e) => onChange(value.map((v, j) => (j === i ? { ...v, [fields.keyA]: e.target.value } : v)))}
          />
          <input
            className={inputCls}
            value={get(item, fields.keyB)}
            placeholder={fields.labelB}
            onChange={(e) => onChange(value.map((v, j) => (j === i ? { ...v, [fields.keyB]: e.target.value } : v)))}
          />
          <RowActions index={i} count={value.length} onMove={(a, b) => onChange(move(value, a, b))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
        </div>
      ))}
      <AddButton label={itemLabel} onClick={() => onChange([...value, { [fields.keyA]: "", [fields.keyB]: "" } as T])} />
    </div>
  );
}

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}
