"use client";

import { useMemo, useState } from "react";
import { ElementViewer } from "@/components/ElementViewer";
import { SPIN_FAMILIES } from "@/data/spins";
import { SOV, hasCode } from "@/lib/scoring/sov";
import { spinCode, spinFeatureNotes, spinFromSpec, spinPositions, spinRevolutions, VARIATION_POSE, VARIATIONS_FOR, type BasicPosition, type SpinFeatures, type SpinLevel } from "@/three/animation/spins";
import type { CameraMode } from "@/three/animation/store";

const LEVELS: SpinLevel[] = ["B", 1, 2, 3, 4];
const POSITION_NAMES: Record<BasicPosition, string> = { camel: "Camel", sit: "Sit", upright: "Upright", layback: "Layback" };

function Toggle({ on, onChange, children, disabled, title }: { on: boolean; onChange: (v: boolean) => void; children: React.ReactNode; disabled?: boolean; title?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} aria-pressed={on} disabled={disabled} title={title} className={`rounded-md border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${on ? "border-accent bg-accent-soft font-medium text-accent-strong" : "border-border bg-surface hover:border-accent"}`}>
      {children}
    </button>
  );
}

/**
 * Builds any spin family with the level features that change what you see: the flying entry and
 * its difficult variation, the change of foot by step or by jump, a clear change of edge, a
 * difficult variation per position, eight revolutions, a difficult entrance and windmills. Shows
 * the protocol code with its base value and what the technical panel would count for the level.
 */
export function SpinExplorer({ family: initialFamily, defaultLevel = 4 }: { family: string; defaultLevel?: SpinLevel }) {
  const [family, setFamily] = useState(initialFamily);
  const [level, setLevel] = useState<SpinLevel>(defaultLevel);
  const [v, setV] = useState(false);
  const [variations, setVariations] = useState<Partial<Record<BasicPosition, string>>>({});
  const [changeOfEdge, setChangeOfEdge] = useState(false);
  const [changeByJump, setChangeByJump] = useState(false);
  const [difficultFly, setDifficultFly] = useState(false);
  const [eightRevolutions, setEightRevolutions] = useState(false);
  const [difficultEntrance, setDifficultEntrance] = useState(false);
  const [windmills, setWindmills] = useState(false);
  const [camera, setCamera] = useState<CameraMode>("side");
  const fam = SPIN_FAMILIES.find((f) => f.code === family) ?? SPIN_FAMILIES[0];
  const variationsKey = JSON.stringify(variations);
  const features = useMemo<SpinFeatures>(
    () => ({ level, v, variations: JSON.parse(variationsKey), changeOfEdge, changeByJump, difficultFly, eightRevolutions, difficultEntrance, windmills }),
    [level, v, variationsKey, changeOfEdge, changeByJump, difficultFly, eightRevolutions, difficultEntrance, windmills],
  );
  const spec = useMemo(() => ({ kind: "spin" as const, code: fam.code, features }), [fam.code, features]);
  const code = spinCode(fam.code, features);
  const entry = SOV.elements[code];
  const vExists = hasCode(`${fam.code}${level}V`);
  const positions = spinPositions(fam.code, features);
  const notes = useMemo(() => spinFeatureNotes(fam.code, features), [fam.code, features]);
  const revs = useMemo(() => spinRevolutions(spinFromSpec(fam.code, features)), [fam.code, features]);
  const firstIsCamel = positions[0] === "camel";
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            Family
            <select value={fam.code} onChange={(e) => setFamily(e.target.value)} className="rounded border border-border bg-surface px-1 py-0.5 font-mono" aria-label="Spin family">
              {SPIN_FAMILIES.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.code} · {f.name}
                </option>
              ))}
            </select>
          </label>
          <span className="ml-2 text-muted">Level</span>
          {LEVELS.map((l) => (
            <button key={l} type="button" onClick={() => setLevel(l)} aria-pressed={l === level} className={`rounded-md border px-2.5 py-1 font-mono ${l === level ? "border-accent bg-accent-soft font-medium text-accent-strong" : "border-border bg-surface hover:border-accent"}`}>
              {l}
            </button>
          ))}
          <Toggle on={v} onChange={setV} disabled={!vExists && !v} title={vExists ? "Reduced value" : "No V row for this code in the Scale of Values"}>
            V · reduced value
          </Toggle>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Features</span>
          <Toggle on={changeOfEdge} onChange={setChangeOfEdge}>Clear change of edge</Toggle>
          <Toggle on={eightRevolutions} onChange={setEightRevolutions}>8 revolutions</Toggle>
          {fam.changeOfFoot && <Toggle on={changeByJump} onChange={setChangeByJump}>Change of foot by jump</Toggle>}
          {fam.flying && (
            <Toggle on={difficultFly} onChange={setDifficultFly} disabled={v} title={v ? "A stepped-over entry has no flying feature" : undefined}>
              Difficult variation of flying entry
            </Toggle>
          )}
          {!fam.flying && <Toggle on={difficultEntrance} onChange={setDifficultEntrance}>Difficult entrance · travelling threes</Toggle>}
          {!fam.flying && firstIsCamel && <Toggle on={windmills} onChange={setWindmills}>Windmills ×3</Toggle>}
          {positions.map((pos) => (
            <label key={pos} className="flex items-center gap-1">
              {POSITION_NAMES[pos]} variation
              <select value={variations[pos] ?? ""} onChange={(e) => setVariations({ ...variations, [pos]: e.target.value || undefined })} className="rounded border border-border bg-surface px-1 py-0.5" aria-label={`${POSITION_NAMES[pos]} variation`}>
                <option value="">none</option>
                {VARIATIONS_FOR[pos].map((id) => (
                  <option key={id} value={id}>
                    {VARIATION_POSE[id].name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <ElementViewer spec={spec} height={480} camera={camera} />
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {(["follow", "side", "front", "overhead", "orbit"] as CameraMode[]).map((c) => (
            <button key={c} type="button" onClick={() => setCamera(c)} className={`rounded-full border px-2.5 py-1 ${c === camera ? "border-accent bg-accent-soft text-accent-strong" : "border-border bg-surface"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <aside className="space-y-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Protocol code</p>
          <p className="font-mono text-3xl font-semibold" data-testid="spin-code">
            {code}
          </p>
          <p className="mt-1 text-sm text-muted">
            {fam.name}, Level {level}
            {v && ", reduced value"}
          </p>
          {entry ? (
            <>
              <p className="mt-3 text-xs uppercase tracking-wide text-muted">Base value</p>
              <p className="font-mono text-2xl font-semibold" data-testid="spin-value">
                {entry.base.toFixed(2)}
              </p>
              <table className="mt-2 w-full text-xs">
                <tbody>
                  {[5, 3, 1, -1, -3, -5].map((g) => (
                    <tr key={g} className="border-t border-border">
                      <td className="py-1 font-mono text-muted">GOE {g > 0 ? `+${g}` : g}</td>
                      <td className="py-1 text-right font-mono">{(entry.base + entry.goe[g + 5]).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="mt-3 text-sm text-highlight">Not in the Scale of Values: this code has no V row.</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-sm">
          <p className="font-semibold">What counts for the level</p>
          <ol className="mt-2 space-y-1.5">
            {notes.features.length === 0 && <li className="text-muted">No level features: the spin is Basic (B) however well it is done.</li>}
            {notes.features.map((f, i) => (
              <li key={`${f.number}-${i}`} className="flex gap-2">
                <span className={`mt-0.5 inline-block h-4 w-4 shrink-0 rounded-full text-center text-[10px] leading-4 ${f.counted ? "bg-accent text-white" : "bg-border text-muted"}`}>{f.counted ? "✓" : "–"}</span>
                <span>
                  <span className="font-medium">
                    {f.number}. {f.name}
                  </span>
                  {f.mandatory && <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-white">unlocks Level 4</span>}
                  <span className="block text-xs text-muted">{f.note}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">
            {notes.features.filter((f) => f.counted).length} feature{notes.features.filter((f) => f.counted).length === 1 ? "" : "s"} counted: supports Level {notes.supported}
            {!notes.mandatoryCounted && notes.features.filter((f) => f.counted).length >= 4 && " (Level 4 also needs one of the six mandatory features)"}. The code above uses the level you picked.
          </p>
          <p className="mt-3 font-semibold">Revolutions counted</p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {revs.phases
              .filter((p) => p.basic || p.label.startsWith("Change of foot") || p.label.startsWith("Windmill"))
              .map((p, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>
                    {p.label}
                    {p.basic && <span className="text-muted"> · {p.foot === "L" ? "left" : "right"} foot</span>}
                  </span>
                  <span className="font-mono">{p.basic ? `${p.held} rev` : ""}</span>
                </li>
              ))}
            <li className="mt-1 flex justify-between gap-2 border-t border-border pt-1 text-muted">
              <span>
                left foot {revs.perFoot.L.toFixed(1)}
                {fam.changeOfFoot && ` · right foot ${revs.perFoot.R.toFixed(1)}`}
              </span>
              <span className="font-mono">{revs.total.toFixed(1)} in all</span>
            </li>
          </ul>
          <p className="mt-2 text-xs text-muted">A position counts after two revolutions; a change of foot needs three before and after it; the Short Program spin combination needs six on each foot.</p>
        </div>
      </aside>
    </div>
  );
}
