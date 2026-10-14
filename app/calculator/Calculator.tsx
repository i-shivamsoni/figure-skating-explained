"use client";

import { useMemo, useState } from "react";
import type { Category, JumpId, Segment } from "@/data/types";
import { JUMPS, JUMP_BY_ID, ROTATION_SHORT } from "@/data/jumps";
import { SPIN_FAMILIES } from "@/data/spins";
import { CATEGORY_LABELS } from "@/data/programs";
import { elementCode, type EdgeCall, type ElementSpec, type JumpSpec, type Level, type RotationCall } from "@/lib/scoring/elements";
import { scoreProgram, type ProgramElementInput } from "@/lib/scoring/program";
import { validateProgram } from "@/lib/scoring/validate";
import { hasCode } from "@/lib/scoring/sov";

type Row = ProgramElementInput & { id: number };
const LEVELS: Level[] = ["B", 1, 2, 3, 4];
const GRADES = [5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5];

let nextId = 1;
const row = (spec: ElementSpec, goe = 0, secondHalf = false): Row => ({ id: nextId++, spec, goe, secondHalf });
const j = (jump: JumpId, rotations: number, extra: Partial<JumpSpec> = {}): JumpSpec => ({ jump, rotations, ...extra });

const EXAMPLES: Record<string, { segment: Segment; category: Category; rows: () => Row[]; components: [number, number, number] }> = {
  "Senior Men Free Skating": {
    segment: "freeSkating",
    category: "seniorMen",
    components: [9.0, 9.0, 9.25],
    rows: () => [
      row({ kind: "jump", jumps: [j("Lz", 4)] }, 3),
      row({ kind: "jump", jumps: [j("S", 4)] }, 2),
      row({ kind: "jump", jumps: [j("A", 3)] }, 3),
      row({ kind: "spin", family: "FCSp", level: 4 }, 3),
      row({ kind: "jump", jumps: [j("T", 4), j("T", 3)] }, 2, true),
      row({ kind: "jump", jumps: [j("A", 3), j("Eu", 1), j("S", 3)] }, 2, true),
      row({ kind: "jump", jumps: [j("Lz", 3), j("Lo", 3)] }, 1, true),
      row({ kind: "step", level: 4 }, 3),
      row({ kind: "spin", family: "CCoSp", level: 4 }, 3),
      row({ kind: "choreoSequence" }, 4),
      row({ kind: "choreoSpin" }, 3),
    ],
  },
  "Senior Women Short Program": {
    segment: "shortProgram",
    category: "seniorWomen",
    components: [8.5, 8.75, 8.75],
    rows: () => [
      row({ kind: "jump", jumps: [j("A", 2)] }, 2),
      row({ kind: "spin", family: "FCSp", level: 4 }, 2),
      row({ kind: "jump", jumps: [j("Lz", 3), j("T", 3)] }, 2, true),
      row({ kind: "jump", jumps: [j("F", 3)] }, 1, true),
      row({ kind: "spin", family: "LSp", level: 4 }, 3),
      row({ kind: "step", level: 4 }, 2),
      row({ kind: "spin", family: "CCoSp", level: 4 }, 2),
    ],
  },
};

export function Calculator() {
  const [segment, setSegment] = useState<Segment>("freeSkating");
  const [category, setCategory] = useState<Category>("seniorMen");
  const [rows, setRows] = useState<Row[]>(() => EXAMPLES["Senior Men Free Skating"].rows());
  const [components, setComponents] = useState<[number, number, number]>([9.0, 9.0, 9.25]);
  const [falls, setFalls] = useState(0);
  const [other, setOther] = useState(0);

  const result = useMemo(() => {
    try {
      return scoreProgram({ segment, category, elements: rows, components: { composition: components[0], presentation: components[1], skatingSkills: components[2] }, falls, otherDeductions: other });
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [segment, category, rows, components, falls, other]);
  const warnings = useMemo(() => validateProgram({ segment, category, elements: rows.map((r) => r.spec) }), [segment, category, rows]);

  const update = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const move = (id: number, dir: -1 | 1) =>
    setRows((rs) => {
      const i = rs.findIndex((r) => r.id === id);
      const k = i + dir;
      if (i < 0 || k < 0 || k >= rs.length) return rs;
      const copy = [...rs];
      [copy[i], copy[k]] = [copy[k], copy[i]];
      return copy;
    });
  const loadExample = (name: string) => {
    const ex = EXAMPLES[name];
    setSegment(ex.segment);
    setCategory(ex.category);
    setRows(ex.rows());
    setComponents(ex.components);
    setFalls(0);
    setOther(0);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label>
            Segment
            <select value={segment} onChange={(e) => setSegment(e.target.value as Segment)} className="mt-1 block rounded border border-border bg-surface px-2 py-1">
              <option value="shortProgram">Short Program</option>
              <option value="freeSkating">Free Skating</option>
            </select>
          </label>
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="mt-1 block rounded border border-border bg-surface px-2 py-1">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <span className="ml-auto flex flex-wrap gap-2">
            {Object.keys(EXAMPLES).map((n) => (
              <button key={n} type="button" onClick={() => loadExample(n)} className="rounded-full border border-border bg-surface px-3 py-1 text-xs hover:border-accent hover:text-accent">
                Example: {n}
              </button>
            ))}
            <button type="button" onClick={() => setRows([])} className="rounded-full border border-border bg-surface px-3 py-1 text-xs hover:border-highlight hover:text-highlight">
              Clear
            </button>
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Element</th>
                <th className="px-2 py-2 text-right">Base</th>
                <th className="px-2 py-2 text-center">2nd half</th>
                <th className="px-2 py-2 text-center">REP</th>
                <th className="px-2 py-2 text-center">GOE</th>
                <th className="px-2 py-2 text-right">Score</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted">
                    No elements yet. Add jumps, spins and steps below or load an example.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => {
                const scored = "error" in result ? undefined : result.elements[i];
                const isJump = r.spec.kind === "jump";
                return (
                  <tr key={r.id} className="border-t border-border odd:bg-surface even:bg-surface-2/40">
                    <td className="px-2 py-1.5 text-muted">{i + 1}</td>
                    <td className="px-2 py-1.5 font-mono font-semibold">
                      {elementCode(r.spec)}
                      {scored?.info.length ? <span className="block text-xs font-normal text-muted">{scored.info.join(" · ")}</span> : null}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {scored ? scored.factoredBase.toFixed(2) : "—"}
                      {scored && scored.factoredBase !== scored.baseValue && <span className="block text-xs text-muted">from {scored.baseValue.toFixed(2)}</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center">{isJump && <input type="checkbox" checked={Boolean(r.secondHalf)} onChange={(e) => update(r.id, { secondHalf: e.target.checked })} aria-label="Started in the second half" />}</td>
                    <td className="px-2 py-1.5 text-center">
                      {isJump && <input type="checkbox" checked={Boolean((r.spec as { rep?: boolean }).rep)} onChange={(e) => update(r.id, { spec: { ...(r.spec as ElementSpec & { kind: "jump" }), rep: e.target.checked } })} aria-label="Repetition" />}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <select value={r.goe} onChange={(e) => update(r.id, { goe: Number(e.target.value) })} className="rounded border border-border bg-surface px-1 py-0.5 font-mono" aria-label="GOE">
                        {GRADES.map((g) => (
                          <option key={g} value={g}>
                            {g > 0 ? `+${g}` : g}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-semibold">{scored ? scored.total.toFixed(2) : "—"}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-right">
                      <button type="button" onClick={() => move(r.id, -1)} className="px-1 text-muted hover:text-accent" aria-label="Move up">↑</button>
                      <button type="button" onClick={() => move(r.id, 1)} className="px-1 text-muted hover:text-accent" aria-label="Move down">↓</button>
                      <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} className="px-1 text-muted hover:text-highlight" aria-label="Remove">×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <AddElement onAdd={(spec) => setRows((rs) => [...rs, row(spec, 0, false)])} />

        {warnings.length > 0 && (
          <ul className="space-y-1 text-sm">
            {warnings.map((w, i) => (
              <li key={i} className={`rounded-lg border px-3 py-2 ${w.severity === "error" ? "border-highlight/50 bg-highlight/10" : w.severity === "warning" ? "border-warn/50 bg-warn/10" : "border-border bg-surface"}`}>
                <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-muted">{w.severity}</span>
                {w.elementIndex !== undefined && <span className="mr-1 font-mono text-xs">#{w.elementIndex + 1}</span>}
                {w.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="font-semibold">Program components</h2>
          {(["Composition", "Presentation", "Skating Skills"] as const).map((name, i) => (
            <label key={name} className="mt-2 block text-sm">
              {name}: <span className="font-mono font-semibold">{components[i].toFixed(2)}</span>
              <input type="range" min={0.25} max={10} step={0.25} value={components[i]} onChange={(e) => setComponents((c) => c.map((v, k) => (k === i ? Number(e.target.value) : v)) as [number, number, number])} className="mt-1 block w-full accent-accent" />
            </label>
          ))}
          {!("error" in result) && <p className="mt-2 text-xs text-muted">Factor ×{result.pcs.factor.toFixed(2)} for this segment and category.</p>}
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="font-semibold">Deductions</h2>
          <label className="mt-2 flex items-center justify-between text-sm">
            Falls
            <input type="number" min={0} max={10} value={falls} onChange={(e) => setFalls(Math.max(0, Number(e.target.value) || 0))} className="w-20 rounded border border-border bg-surface px-2 py-1 text-right font-mono" />
          </label>
          <label className="mt-2 flex items-center justify-between text-sm">
            Other (time, costume…)
            <input type="number" min={0} step={1} value={other} onChange={(e) => setOther(Math.max(0, Number(e.target.value) || 0))} className="w-20 rounded border border-border bg-surface px-2 py-1 text-right font-mono" />
          </label>
        </div>
        <div className="rounded-xl border border-accent bg-accent-soft/50 p-4">
          {"error" in result ? (
            <p className="text-sm text-highlight">{result.error}</p>
          ) : (
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Technical elements</dt>
                <dd className="font-mono">{result.tes.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Program components</dt>
                <dd className="font-mono">{result.pcs.total.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Deductions</dt>
                <dd className="font-mono">−{result.deductions.total.toFixed(2)}</dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-lg font-semibold">
                <dt>Total segment score</dt>
                <dd className="font-mono">{result.total.toFixed(2)}</dd>
              </div>
            </dl>
          )}
        </div>
      </aside>
    </div>
  );
}

function AddElement({ onAdd }: { onAdd: (spec: ElementSpec) => void }) {
  const [tab, setTab] = useState<"jump" | "spin" | "step" | "choreo">("jump");
  const [jumps, setJumps] = useState<JumpSpec[]>([{ jump: "Lz", rotations: 3 }]);
  const [sequence, setSequence] = useState(false);
  const [family, setFamily] = useState("CCoSp");
  const [level, setLevel] = useState<Level>(4);
  const [v, setV] = useState(false);
  const setJump = (i: number, patch: Partial<JumpSpec>) => setJumps((js) => js.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const jumpCodeOk = jumps.every((x) => x.jump === "Eu" || hasCode(`${x.rotations}${x.jump}${["F", "Lz"].includes(x.jump) ? x.edgeCall ?? "" : ""}${x.rotationCall ?? ""}`));
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap gap-2 text-sm">
        {(["jump", "spin", "step", "choreo"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-full border px-3 py-1 capitalize ${t === tab ? "border-accent bg-accent-soft text-accent-strong font-medium" : "border-border bg-surface"}`}>
            {t === "choreo" ? "Choreographic" : t}
          </button>
        ))}
      </div>
      {tab === "jump" && (
        <div className="mt-3 space-y-2 text-sm">
          {jumps.map((x, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              {i > 0 && <span className="font-mono">+</span>}
              <select value={x.jump} onChange={(e) => setJump(i, { jump: e.target.value as JumpId, rotations: e.target.value === "Eu" ? 1 : x.rotations })} className="rounded border border-border bg-surface px-1 py-0.5" aria-label="Jump">
                {JUMPS.map((jp) => (
                  <option key={jp.id} value={jp.id}>
                    {jp.name}
                  </option>
                ))}
              </select>
              {x.jump !== "Eu" && (
                <select value={x.rotations} onChange={(e) => setJump(i, { rotations: Number(e.target.value) })} className="rounded border border-border bg-surface px-1 py-0.5" aria-label="Rotations">
                  {JUMP_BY_ID[x.jump].rotations.map((r) => (
                    <option key={r} value={r}>
                      {ROTATION_SHORT[r]}
                    </option>
                  ))}
                </select>
              )}
              {x.jump !== "Eu" && (
                <select value={x.rotationCall ?? ""} onChange={(e) => setJump(i, { rotationCall: e.target.value as RotationCall })} className="rounded border border-border bg-surface px-1 py-0.5" aria-label="Rotation call">
                  <option value="">clean</option>
                  <option value="q">q</option>
                  <option value="<">&lt;</option>
                  <option value="<<">&lt;&lt;</option>
                </select>
              )}
              {["F", "Lz"].includes(x.jump) && (
                <select value={x.edgeCall ?? ""} onChange={(e) => setJump(i, { edgeCall: e.target.value as EdgeCall })} className="rounded border border-border bg-surface px-1 py-0.5" aria-label="Edge call">
                  <option value="">edge ok</option>
                  <option value="!">!</option>
                  <option value="e">e</option>
                </select>
              )}
              {jumps.length > 1 && (
                <button type="button" onClick={() => setJumps((js) => js.filter((_, k) => k !== i))} className="text-muted hover:text-highlight" aria-label="Remove jump">
                  ×
                </button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            {jumps.length < 4 && (
              <button type="button" onClick={() => setJumps((js) => [...js, { jump: "T", rotations: 3 }])} className="rounded border border-border px-2 py-0.5 hover:border-accent">
                + add a jump (combination)
              </button>
            )}
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={sequence} onChange={(e) => setSequence(e.target.checked)} /> jump sequence (+SEQ)
            </label>
            <span className="ml-auto font-mono text-muted">{elementCode({ kind: "jump", jumps, sequence })}</span>
            <button type="button" disabled={!jumpCodeOk} onClick={() => onAdd({ kind: "jump", jumps: jumps.map((x) => ({ ...x })), sequence })} className="rounded-md bg-accent px-3 py-1 font-medium text-white hover:bg-accent-strong disabled:opacity-50">
              Add
            </button>
          </div>
          {!jumpCodeOk && <p className="text-xs text-highlight">That jump code is not in the Scale of Values.</p>}
          <p className="text-xs text-muted">Up to three listed jumps; an Euler between two listed jumps does not count toward the three. Sequences end with an Axel-type jump.</p>
        </div>
      )}
      {tab === "spin" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <select value={family} onChange={(e) => setFamily(e.target.value)} className="rounded border border-border bg-surface px-1 py-0.5" aria-label="Spin family">
            {SPIN_FAMILIES.map((f) => (
              <option key={f.code} value={f.code}>
                {f.code} · {f.name}
              </option>
            ))}
          </select>
          <LevelSelect level={level} setLevel={setLevel} />
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={v} onChange={(e) => setV(e.target.checked)} /> V
          </label>
          <span className="ml-auto font-mono text-muted">{elementCode({ kind: "spin", family, level, v })}</span>
          <button type="button" onClick={() => onAdd({ kind: "spin", family, level, v })} className="rounded-md bg-accent px-3 py-1 font-medium text-white hover:bg-accent-strong">
            Add
          </button>
        </div>
      )}
      {tab === "step" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <LevelSelect level={level} setLevel={setLevel} />
          <span className="ml-auto font-mono text-muted">StSq{level}</span>
          <button type="button" onClick={() => onAdd({ kind: "step", level })} className="rounded-md bg-accent px-3 py-1 font-medium text-white hover:bg-accent-strong">
            Add
          </button>
        </div>
      )}
      {tab === "choreo" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <button type="button" onClick={() => onAdd({ kind: "choreoSequence" })} className="rounded-md bg-accent px-3 py-1 font-medium text-white hover:bg-accent-strong">
            Add ChSq1
          </button>
          <button type="button" onClick={() => onAdd({ kind: "choreoSpin" })} className="rounded-md bg-accent px-3 py-1 font-medium text-white hover:bg-accent-strong">
            Add ChSp1
          </button>
        </div>
      )}
    </div>
  );
}

function LevelSelect({ level, setLevel }: { level: Level; setLevel: (l: Level) => void }) {
  return (
    <label className="flex items-center gap-1">
      Level
      <select value={String(level)} onChange={(e) => setLevel((e.target.value === "B" ? "B" : Number(e.target.value)) as Level)} className="rounded border border-border bg-surface px-1 py-0.5">
        {LEVELS.map((l) => (
          <option key={String(l)} value={String(l)}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
