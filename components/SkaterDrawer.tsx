"use client";

import { useUiStore } from "@/lib/uiStore";
import { HAIR_COLOURS, LOOKS, OUTFIT_COLOURS, SKIN_TONES, useSkaterStore, type SkaterVariant } from "@/three/skaterStore";
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
        <Field label="Hair colour">
          <Swatches label="Hair colour" options={HAIR_COLOURS} value={appearance.hair.colour} onChange={(colour) => setAppearance(variant, { hair: { colour } })} />
        </Field>
        <Field label={variant === "female" ? "Dress" : "Shirt"}>
          <Swatches label="Top colour" options={OUTFIT_COLOURS} value={appearance.outfit.colours.top} onChange={(top) => setAppearance(variant, { outfit: { colours: variant === "female" ? { top, skirt: top, glove: top } : { top } } })} />
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
