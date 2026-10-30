import type { CSSProperties } from "react";
import type { Profile } from "../../types";
import { adjustedNote, deriveTokens, isHex, type SiteColors, type Tokens } from "../../lib/palette";
import { cn } from "../../utils/format";
import { Field } from "./fields";
import { ui } from "./ui";

/** null = the built-in green (no saved colours). */
const PRESETS: { name: string; colors: SiteColors | null }[] = [
  { name: "Green (default)", colors: null },
  { name: "Blue", colors: { accent: "#3b82f6", tint: "#3b82f6", tintAmount: 35 } },
  { name: "Amber", colors: { accent: "#e0a020", tint: "#c08030", tintAmount: 25 } },
  { name: "Violet", colors: { accent: "#8b5cf6", tint: "#8b5cf6", tintAmount: 35 } },
  { name: "Red", colors: { accent: "#e5484d", tint: "#e5484d", tintAmount: 20 } },
];
const DEFAULT_ACCENT = "#60a256";
// the built-in palette from index.css, so each preview shows its own mode
const BUILT_IN: Record<"Dark" | "Light", Tokens> = {
  Dark: {
    "--rk-bg": "#18181b", "--rk-surface": "#202023", "--rk-border": "#333335", "--rk-ink": "#f2f2f3", "--rk-ink-dim": "#c4c4c5",
    "--rk-ink-faint": "#9e9e9f", "--rk-accent": "#60a256", "--rk-accent-ink": "#84bd7b", "--rk-accent-fill": "#27681c", "--rk-on-accent": "#ffffff",
  },
  Light: {
    "--rk-bg": "#fafafa", "--rk-surface": "#fdfdfd", "--rk-border": "#dcdcdc", "--rk-ink": "#161616", "--rk-ink-dim": "#484848",
    "--rk-ink-faint": "#696969", "--rk-accent": "#27681c", "--rk-accent-ink": "#1c4f14", "--rk-accent-fill": "#27681c", "--rk-on-accent": "#ffffff",
  },
};

/** One mode of the site, drawn with that mode's tokens. */
function Preview({ mode, tokens }: { mode: "Dark" | "Light"; tokens: Tokens | null }) {
  return (
    <div
      className="rounded-[6px] border border-line bg-bg p-4 text-ink"
      style={{ ...BUILT_IN[mode], ...tokens } as CSSProperties}
    >
      <p className="label">{mode} mode</p>
      <div className="mt-3 rounded-[4px] border border-line bg-surface p-3">
        <p className="font-semibold">A project card</p>
        <p className="mt-1 text-[0.85rem] text-ink-dim">
          Body text with a <span className="text-accent-ink underline">link in the accent</span>.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-[4px] bg-accent-fill px-3 py-1.5 text-[0.85rem] font-semibold text-on-accent">Button</span>
          <span className="h-2.5 flex-1 rounded-full bg-accent" />
          <span className="h-2.5 w-10 rounded-full bg-accent/55" />
        </div>
      </div>
    </div>
  );
}

export function ColorsSection({ value, onChange }: { value: Profile; onChange: (p: Profile) => void }) {
  const colors = value.colors && isHex(value.colors.accent) ? value.colors : null;
  const set = (c: SiteColors | null): void => {
    const next = { ...value };
    if (c) next.colors = c;
    else delete next.colors;
    onChange(next);
  };
  const patch = (p: Partial<SiteColors>): void => set({ accent: colors?.accent ?? DEFAULT_ACCENT, ...colors, ...p });
  const tokens = colors ? deriveTokens(colors) : null;
  const note = colors ? adjustedNote(colors) : null;

  return (
    <div className="space-y-6">
      <section className={cn(ui.card, "p-5 sm:p-6")}>
        <h3 className="text-[1.1rem] font-bold">Presets</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const on = p.colors ? colors?.accent === p.colors.accent : !colors;
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => set(p.colors)}
                aria-pressed={on}
                className={cn(ui.small, "gap-2", on && "border-accent text-ink")}
              >
                <span className="size-3.5 rounded-full border border-line" style={{ background: p.colors?.accent ?? DEFAULT_ACCENT }} />
                {p.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className={cn(ui.card, "p-5 sm:p-6")}>
        <h3 className="text-[1.1rem] font-bold">Your colours</h3>
        <p className="mt-1 text-[0.9rem] text-ink-faint">
          Pick an accent and, if you like, a tint for the backgrounds. Light and dark versions are worked out for you.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <Field label="Accent" hint="Buttons, links, highlights and the animations.">
            <input
              type="color"
              value={colors?.accent ?? DEFAULT_ACCENT}
              onChange={(e) => patch({ accent: e.target.value })}
              className="h-10 w-full cursor-pointer rounded-[4px] border border-field bg-bg p-1"
            />
          </Field>
          <Field label="Background tint" hint="Only its hue is used.">
            <input
              type="color"
              value={colors?.tint ?? colors?.accent ?? DEFAULT_ACCENT}
              onChange={(e) => patch({ tint: e.target.value })}
              className="h-10 w-full cursor-pointer rounded-[4px] border border-field bg-bg p-1"
            />
          </Field>
          <Field label={`Tint strength: ${colors?.tintAmount ?? 0}%`} hint="0 keeps the backgrounds neutral grey.">
            <input
              type="range"
              min={0}
              max={100}
              value={colors?.tintAmount ?? 0}
              onChange={(e) => patch({ tintAmount: Number(e.target.value) })}
              className="h-10 w-full cursor-pointer accent-[var(--rk-accent)]"
            />
          </Field>
        </div>
        {note ? <p className="mt-4 text-[0.88rem] text-signal">{note} Your exact colour is still used where it is only decoration.</p> : null}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Preview mode="Dark" tokens={tokens?.dark ?? null} />
          <Preview mode="Light" tokens={tokens?.light ?? null} />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.85rem] text-ink-faint">
            Save to publish. Visitors keep the last colours they saw, so a slow server never shows the wrong ones.
          </p>
          <button type="button" className={ui.secondary} onClick={() => set(null)} disabled={!colors}>
            Reset to default
          </button>
        </div>
      </section>
    </div>
  );
}
