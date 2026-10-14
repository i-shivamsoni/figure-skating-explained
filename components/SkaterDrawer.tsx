"use client";

import { useUiStore } from "@/lib/uiStore";
import {
  HAIR_COLOURS,
  HAIR_LABELS,
  HAIR_LENGTHS,
  HAIR_STYLES,
  HAIR_WITH_LENGTH,
  LOOKS,
  OUTFIT_COLOURS,
  OUTFIT_PIECES,
  SKIN_TONES,
  SKIRTS,
  SLEEVES,
  useSkaterStore,
  type HairLength,
  type HairStyle,
  type Skirt,
  type SkaterVariant,
  type Sleeves,
} from "@/three/skaterStore";
import { Button } from "./ui/Button";
import { Drawer } from "./ui/Drawer";
import { Segmented } from "./ui/Segmented";
import { Swatches } from "./ui/Swatches";
import { cn } from "./ui/cn";

/**
 * "Your skater": the site-wide appearance editor. Wave 0 ships the body, the looks and the main
 * colours; Wave 2 adds hair styles and lengths, sleeves, skirt, gloves and a live preview.
 */
export function SkaterDrawer() {
  const open = useUiStore((s) => s.skaterDrawer);
  const close = useUiStore((s) => s.closeSkaterDrawer);
  const variant = useSkaterStore((s) => s.variant);
  const setVariant = useSkaterStore((s) => s.setVariant);
  const appearance = useSkaterStore((s) => s.appearance[variant]);
  const setAppearance = useSkaterStore((s) => s.setAppearance);
  const applyLook = useSkaterStore((s) => s.applyLook);
  const reset = useSkaterStore((s) => s.resetAppearance);
  return (
    <Drawer open={open} onClose={close} title="Your skater">
      <div className="space-y-6 p-4">
        <Field label="Body">
          <Segmented<SkaterVariant>
            label="Body"
            value={variant}
            onChange={setVariant}
            options={[
              { id: "female", label: "Woman" },
              { id: "male", label: "Man" },
            ]}
          />
        </Field>
        <Field label="Looks">
          <div className="grid grid-cols-2 gap-2">
            {LOOKS[variant].map((l) => {
              const active = JSON.stringify(l.appearance) === JSON.stringify(appearance);
              return (
                <button key={l.id} type="button" onClick={() => applyLook(l.id, variant)} aria-pressed={active} className={cn("focus-ring flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm", active ? "border-accent bg-accent-soft text-accent-strong" : "border-border bg-surface hover:border-accent")}>
                  <span className="flex shrink-0 -space-x-1">
                    <span className="h-5 w-5 rounded-full border border-border" style={{ background: l.appearance.outfit.colours.top }} />
                    <span className="h-5 w-5 rounded-full border border-border" style={{ background: l.appearance.hair.colour }} />
                  </span>
                  {l.label}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Skin">
          <Swatches label="Skin tone" options={SKIN_TONES} value={appearance.skin} onChange={(skin) => setAppearance(variant, { skin })} />
        </Field>
        <Field label="Hair">
          <Segmented<HairStyle> label="Hair style" size="sm" value={appearance.hair.style} onChange={(style) => setAppearance(variant, { hair: { style } })} options={HAIR_STYLES[variant].map((h) => ({ id: h, label: HAIR_LABELS[h] }))} />
          {HAIR_WITH_LENGTH.includes(appearance.hair.style) && (
            <Segmented<HairLength> label="Hair length" size="sm" className="mt-2" value={appearance.hair.length} onChange={(length) => setAppearance(variant, { hair: { length } })} options={HAIR_LENGTHS.map((l) => ({ id: l, label: l[0].toUpperCase() + l.slice(1) }))} />
          )}
          <div className="mt-2">
            <Swatches label="Hair colour" options={HAIR_COLOURS} value={appearance.hair.colour} onChange={(colour) => setAppearance(variant, { hair: { colour } })} />
          </div>
        </Field>
        <Field label="Outfit">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <div>
              <p className="mb-1 text-xs text-muted">Sleeves</p>
              <Segmented<Sleeves> label="Sleeves" size="sm" value={appearance.outfit.sleeves} onChange={(sleeves) => setAppearance(variant, { outfit: { sleeves } })} options={SLEEVES.map((o) => ({ id: o.id, label: o.label }))} />
            </div>
            {variant === "female" && (
              <div>
                <p className="mb-1 text-xs text-muted">Skirt</p>
                <Segmented<Skirt> label="Skirt" size="sm" value={appearance.outfit.skirt} onChange={(skirt) => setAppearance(variant, { outfit: { skirt } })} options={SKIRTS.map((o) => ({ id: o.id, label: o.label }))} />
              </div>
            )}
            <div>
              <p className="mb-1 text-xs text-muted">Gloves</p>
              <Segmented<string> label="Gloves" size="sm" value={appearance.outfit.gloves ? "on" : "off"} onChange={(v) => setAppearance(variant, { outfit: { gloves: v === "on" } })} options={[{ id: "on", label: "On" }, { id: "off", label: "Off" }]} />
            </div>
          </div>
        </Field>
        <Field label="Colours">
          <div className="space-y-2">
            {OUTFIT_PIECES.filter((piece) => piece.id !== "skirt" || (variant === "female" && appearance.outfit.skirt !== "none")).map((piece) => (
              <div key={piece.id} className="flex flex-wrap items-center gap-2">
                <span className="w-16 text-xs text-muted">{piece.label[variant]}</span>
                <Swatches label={`${piece.label[variant]} colour`} options={OUTFIT_COLOURS} value={appearance.outfit.colours[piece.id]} onChange={(hex) => setAppearance(variant, { outfit: { colours: { [piece.id]: hex } } })} />
              </div>
            ))}
          </div>
        </Field>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => reset(variant)}>
            Reset to default
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-widest text-muted uppercase">{label}</p>
      {children}
    </div>
  );
}
