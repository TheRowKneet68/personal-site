import { useState, type ReactNode } from "react";
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

const fileInputCls =
  "font-mono text-xs text-ink-faint file:mr-3 file:cursor-pointer file:rounded file:border file:border-line file:bg-bg file:px-3 file:py-1.5 file:font-mono file:text-xs file:text-ink-dim hover:file:border-accent";

/** URL input + live preview + optional upload button (uploads via the admin upload API). */
export function ImageField({
  label,
  value,
  onChange,
  uploadImage,
  hint,
  objectFit = "cover",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  uploadImage?: (file: File) => Promise<string>;
  hint?: string;
  objectFit?: "cover" | "contain";
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  return (
    <Field label={label} hint={hint}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <TextInput value={value} placeholder="url or path" onChange={onChange} />
          {value ? (
            <img
              src={value}
              alt=""
              width={64}
              height={64}
              className={cn("size-16 shrink-0 rounded border border-line bg-bg", objectFit === "cover" ? "object-cover" : "object-contain")}
            />
          ) : null}
        </div>
        {uploadImage ? (
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              className={fileInputCls}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setUploading(true);
                  setUploadError("");
                  uploadImage(f)
                    .then(onChange)
                    .catch((err: unknown) => setUploadError(err instanceof Error ? err.message : "Upload failed"))
                    .finally(() => setUploading(false));
                }
                e.target.value = "";
              }}
            />
            {uploading ? <span className="font-mono text-xs text-ink-faint">Uploading…</span> : null}
            {uploadError ? <span className="text-xs text-warn">{uploadError}</span> : null}
          </div>
        ) : null}
      </div>
    </Field>
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

/** Manage many images: previews, per-image URL editing, reorder, remove, multi-file upload. */
export function ImageList({
  label,
  value,
  onChange,
  uploadImage,
  hint,
  emptyText = "No images yet — add a few below.",
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  uploadImage?: (file: File) => Promise<string>;
  hint?: string;
  emptyText?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !uploadImage) return;
    setUploading(true);
    setUploadError("");
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadImage(f));
      onChange([...value, ...urls]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };
  return (
    <Field label={label} hint={hint}>
      <div className="space-y-3">
        {value.length === 0 ? (
          <p className="text-sm text-ink-faint">{emptyText}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {value.map((url, i) => (
              <div key={i} className="rounded-lg border border-line bg-bg p-2">
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" title="Open full size">
                    <img src={url} alt="" className="aspect-[4/3] w-full rounded object-cover" />
                  </a>
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center rounded bg-bg font-mono text-xs text-ink-faint">
                    no image
                  </div>
                )}
                <input
                  className="mt-2 w-full rounded border border-line bg-bg px-2 py-1 font-mono text-xs text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
                  value={url}
                  placeholder="url or path"
                  onChange={(e) => onChange(value.map((u, j) => (j === i ? e.target.value : u)))}
                />
                <div className="mt-2 flex items-center gap-1">
                  <button type="button" className={btnCls} disabled={i === 0} onClick={() => onChange(move(value, i, i - 1))} title="Move up">
                    ↑
                  </button>
                  <button type="button" className={btnCls} disabled={i === value.length - 1} onClick={() => onChange(move(value, i, i + 1))} title="Move down">
                    ↓
                  </button>
                  <button
                    type="button"
                    className="ml-auto rounded border border-line px-2 py-0.5 font-mono text-[0.65rem] text-warn hover:border-warn hover:text-warn"
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                    title="Remove this image"
                  >
                    remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {uploadImage ? (
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded border border-line px-3 py-1 font-mono text-xs text-ink-dim hover:border-accent hover:text-accent">
              {uploading ? "Uploading…" : "+ add image(s)"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  void handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <span className="text-xs text-ink-faint">Pick several files at once. The first image is the cover.</span>
            {uploadError ? <span className="text-xs text-warn">{uploadError}</span> : null}
          </div>
        ) : null}
      </div>
    </Field>
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
