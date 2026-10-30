import { useId, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from "lucide-react";
import { cn } from "../../utils/format";
import { move, ui } from "./ui";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block min-w-0">
      {label ? <span className={ui.label}>{label}</span> : null}
      {children}
      {hint ? <span className={ui.hint}>{hint}</span> : null}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <input
      className={cn(ui.input, invalid && "border-warn focus:border-warn")}
      value={value}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
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
      className={cn(ui.area, "resize-y")}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel?: string;
}) {
  return (
    <select className={cn(ui.input, "cursor-pointer pr-8")} value={value} aria-label={ariaLabel} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
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
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-[0.92rem] text-ink-dim">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 cursor-pointer accent-[var(--rk-accent)]"
      />
      {label}
    </label>
  );
}

function UploadButton({
  multiple,
  busy,
  onFiles,
  label,
}: {
  multiple?: boolean;
  busy: boolean;
  onFiles: (files: FileList) => void;
  label: string;
}) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className={cn(ui.small, busy && "pointer-events-none opacity-50")}>
        <Upload className="size-3.5" aria-hidden />
        {busy ? "Uploading…" : label}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}

/** URL input + live preview + optional upload (via the admin upload API). */
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
    <div className="min-w-0">
      {label ? <span className={ui.label}>{label}</span> : null}
      <div className="flex items-start gap-3">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[4px] border border-line bg-bg">
          {value ? (
            <img src={value} alt="" width={64} height={64} className={cn("size-full", objectFit === "cover" ? "object-cover" : "object-contain")} />
          ) : (
            <span className="text-[0.75rem] text-ink-faint">None</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <TextInput value={value} placeholder="Image URL" onChange={onChange} />
          {uploadImage ? (
            <div className="flex flex-wrap items-center gap-3">
              <UploadButton
                busy={uploading}
                label="Upload"
                onFiles={(files) => {
                  const f = files[0];
                  if (!f) return;
                  setUploading(true);
                  setUploadError("");
                  uploadImage(f)
                    .then(onChange)
                    .catch((err: unknown) => setUploadError(err instanceof Error ? err.message : "Upload failed"))
                    .finally(() => setUploading(false));
                }}
              />
              {uploadError ? <span className="text-[0.85rem] text-warn">{uploadError}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
      {hint ? <span className={ui.hint}>{hint}</span> : null}
    </div>
  );
}

export function RowActions({
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
    <div className="flex shrink-0 items-center">
      <button type="button" className={ui.icon} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label="Move up" title="Move up">
        <ArrowUp className="size-4" aria-hidden />
      </button>
      <button type="button" className={ui.icon} disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label="Move down" title="Move down">
        <ArrowDown className="size-4" aria-hidden />
      </button>
      <button type="button" className={cn(ui.icon, "hover:text-warn")} onClick={onRemove} aria-label="Remove" title="Remove">
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Many images: previews, per-image URL editing, reorder, remove, multi-file upload. */
export function ImageList({
  label,
  value,
  onChange,
  uploadImage,
  hint,
  emptyText = "No images yet.",
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
  const handleFiles = async (files: FileList) => {
    if (!uploadImage) return;
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
    <div className="min-w-0">
      {label ? <span className={ui.label}>{label}</span> : null}
      {value.length === 0 ? (
        <p className="rounded-[4px] border border-dashed border-line-strong px-4 py-5 text-center text-[0.9rem] text-ink-faint">{emptyText}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {value.map((url, i) => (
            <li key={i} className="min-w-0 rounded-[4px] border border-line bg-bg p-2">
              <a href={url || undefined} target="_blank" rel="noopener noreferrer" title="Open full size" className="block">
                {url ? (
                  <img src={url} alt="" className="aspect-[4/3] w-full rounded-[3px] bg-surface object-contain" />
                ) : (
                  <span className="grid aspect-[4/3] w-full place-items-center rounded-[3px] bg-surface text-[0.8rem] text-ink-faint">No image</span>
                )}
              </a>
              <input
                className="mt-2 h-8 w-full rounded-[3px] border border-field bg-bg px-2 text-[0.8rem] text-ink focus:border-accent focus:outline-none"
                value={url}
                placeholder="Image URL"
                aria-label={`Image ${i + 1} URL`}
                onChange={(e) => onChange(value.map((u, j) => (j === i ? e.target.value : u)))}
              />
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[0.78rem] text-ink-faint">{i === 0 ? "Cover" : `#${i + 1}`}</span>
                <RowActions index={i} count={value.length} onMove={(a, b) => onChange(move(value, a, b))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {uploadImage ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <UploadButton multiple busy={uploading} label="Add images" onFiles={(f) => void handleFiles(f)} />
          <span className="text-[0.82rem] text-ink-faint">You can pick several files. The first image is the cover.</span>
          {uploadError ? <span className="text-[0.85rem] text-warn">{uploadError}</span> : null}
        </div>
      ) : null}
      {hint ? <span className={ui.hint}>{hint}</span> : null}
    </div>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className={ui.add} onClick={onClick}>
      <Plus className="size-4" aria-hidden /> {label}
    </button>
  );
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Editable list of strings with reorder + remove. */
export function StringList({
  value,
  onChange,
  placeholder,
  itemLabel = "item",
  multiline = false,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  itemLabel?: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="flex items-start gap-1.5">
          {multiline ? (
            <textarea
              className={cn(ui.area, "min-h-[4.5rem] resize-y")}
              rows={2}
              value={item}
              placeholder={placeholder ?? cap(itemLabel)}
              aria-label={`${cap(itemLabel)} ${i + 1}`}
              onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
            />
          ) : (
            <input
              className={ui.input}
              value={item}
              placeholder={placeholder ?? cap(itemLabel)}
              aria-label={`${cap(itemLabel)} ${i + 1}`}
              onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
            />
          )}
          <div className="shrink-0 pt-1">
            <RowActions index={i} count={value.length} onMove={(a, b) => onChange(move(value, a, b))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
          </div>
        </div>
      ))}
      <AddButton label={`Add ${itemLabel}`} onClick={() => onChange([...value, ""])} />
    </div>
  );
}

/** Record<string, string> editor. */
export function MapEditor({
  value,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
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
        <div key={i} className="flex items-center gap-1.5">
          <input className={cn(ui.input, "max-w-44")} value={k} placeholder={keyPlaceholder} onChange={(e) => set(entries.map(([k0, v0], j) => (j === i ? [e.target.value, v0] : [k0, v0])))} />
          <input className={ui.input} value={v} placeholder={valuePlaceholder} onChange={(e) => set(entries.map(([k0, v0], j) => (j === i ? [k0, e.target.value] : [k0, v0])))} />
          <RowActions index={i} count={entries.length} onMove={(a, b) => set(move(entries, a, b))} onRemove={() => set(entries.filter((_, j) => j !== i))} />
        </div>
      ))}
      <AddButton label={`Add ${itemLabel}`} onClick={() => set([...entries, ["", ""]])} />
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
      {value.length > 0 ? (
        <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6.5rem] gap-1.5 sm:grid">
          <span className="text-[0.82rem] text-ink-faint">{cap(fields.labelA)}</span>
          <span className="text-[0.82rem] text-ink-faint">{cap(fields.labelB)}</span>
        </div>
      ) : null}
      {value.map((item, i) => (
        <div key={i} className="grid gap-1.5 rounded-[4px] border border-line p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:border-0 sm:p-0">
          <input
            className={ui.input}
            value={get(item, fields.keyA)}
            placeholder={cap(fields.labelA)}
            aria-label={`${cap(fields.labelA)} ${i + 1}`}
            onChange={(e) => onChange(value.map((v, j) => (j === i ? { ...v, [fields.keyA]: e.target.value } : v)))}
          />
          <input
            className={ui.input}
            value={get(item, fields.keyB)}
            placeholder={cap(fields.labelB)}
            aria-label={`${cap(fields.labelB)} ${i + 1}`}
            onChange={(e) => onChange(value.map((v, j) => (j === i ? { ...v, [fields.keyB]: e.target.value } : v)))}
          />
          <RowActions index={i} count={value.length} onMove={(a, b) => onChange(move(value, a, b))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
        </div>
      ))}
      <AddButton label={`Add ${itemLabel}`} onClick={() => onChange([...value, { [fields.keyA]: "", [fields.keyB]: "" } as T])} />
    </div>
  );
}
