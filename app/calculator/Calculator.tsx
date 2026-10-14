"use client";

import { useMemo, useState } from "react";
import type { JumpId, Segment } from "@/data/types";
import { JUMPS, JUMP_BY_ID, ROTATION_SHORT } from "@/data/jumps";
import { SPIN_FAMILIES } from "@/data/spins";
import { CATEGORY_LABELS } from "@/data/programs";
import { PAIR_CATEGORY_LABELS } from "@/data/pairs";
import { elementCode, isJumpElement, type EdgeCall, type ElementSpec, type JumpSpec, type Level, type RotationCall } from "@/lib/scoring/elements";
import { isPairs, scoreProgram, type ProgramElementInput, type ScoringCategory } from "@/lib/scoring/program";
import { validateProgram } from "@/lib/scoring/validate";
import { hasCode } from "@/lib/scoring/sov";

type Row = ProgramElementInput & { id: number };
const LEVELS: Level[] = ["B", 1, 2, 3, 4];
const GRADES = [5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5];

let nextId = 1;
const row = (spec: ElementSpec, goe = 0, secondHalf = false): Row => ({ id: nextId++, spec, goe, secondHalf });
const j = (jump: JumpId, rotations: number, extra: Partial<JumpSpec> = {}): JumpSpec => ({ jump, rotations, ...extra });

const code = (c: string): ElementSpec => ({ kind: "code", code: c });

const EXAMPLES: Record<string, { segment: Segment; category: ScoringCategory; rows: () => Row[]; components: [number, number, number] }> = {
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
      row({ kind: "jump", jumps: [j("Lz", 3)] }, 1, true),
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
  "Senior Pairs Free Skating": {
    segment: "freeSkating",
    category: "seniorPairs",
    components: [8.75, 8.75, 9.0],
    rows: () => [
      row(code("3Tw3"), 2),
      row({ kind: "jump", jumps: [j("T", 3), j("T", 2)] }, 1),
      row(code("3LzTh"), 2),
      row({ kind: "jump", jumps: [j("S", 3)] }, 1),
      row(code("5RLi4"), 3),
      row(code("FiDs4"), 2),
      row(code("3LoTh"), 2, true),
      row(code("3Li4"), 3),
      row(code("PCoSp4"), 2),
      row(code("ChPLi1"), 3),
      row(code("ChPSp1"), 2),
    ],
  },
  "Senior Pairs Short Program": {
    segment: "shortProgram",
    category: "seniorPairs",
    components: [8.5, 8.5, 8.75],
    rows: () => [row(code("3Li4"), 2), row(code("3Tw3"), 2), row({ kind: "jump", jumps: [j("T", 3)] }, 1), row(code("3LoTh"), 2, true), row(code("PCoSp4"), 2), row(code("FiDs4"), 2), row({ kind: "step", level: 3 }, 2)],
  },
};

export function Calculator() {
  const [segment, setSegment] = useState<Segment>("freeSkating");
  const [category, setCategory] = useState<ScoringCategory>("seniorMen");
  const [rows, setRows] = useState<Row[]>(() => EXAMPLES["Senior Men Free Skating"].rows());
  const [components, setComponents] = useState<[number, number, number]>([9.0, 9.0, 9.25]);
  const [falls, setFalls] = useState(0);
  const [fallsBoth, setFallsBoth] = useState(0);
  const [other, setOther] = useState(0);
  const pairs = isPairs(category);

  const result = useMemo(() => {
    try {
      return scoreProgram({ segment, category, elements: rows, components: { composition: components[0], presentation: components[1], skatingSkills: components[2] }, falls, fallsBoth: pairs ? fallsBoth : 0, otherDeductions: other });
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [segment, category, rows, components, falls, fallsBoth, pairs, other]);
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
    setFallsBoth(0);
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
            <select value={category} onChange={(e) => setCategory(e.target.value as ScoringCategory)} className="mt-1 block rounded border border-border bg-surface px-2 py-1">
              {Object.entries({ ...CATEGORY_LABELS, ...PAIR_CATEGORY_LABELS }).map(([c, label]) => (
                <option key={c} value={c}>
                  {label}
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
                const takesBonus = isJumpElement(r.spec);
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
                    <td className="px-2 py-1.5 text-center">{takesBonus && <input type="checkbox" checked={Boolean(r.secondHalf)} onChange={(e) => update(r.id, { secondHalf: e.target.checked })} aria-label="Started in the second half" />}</td>
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

        <AddElement onAdd={(spec) => setRows((rs) => [...rs, row(spec, 0, false)])} pairs={pairs} />

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
            {pairs ? "Falls by one partner" : "Falls"}
            <input type="number" min={0} max={10} value={falls} onChange={(e) => setFalls(Math.max(0, Number(e.target.value) || 0))} className="w-20 rounded border border-border bg-surface px-2 py-1 text-right font-mono" />
          </label>
          {pairs && (
            <label className="mt-2 flex items-center justify-between text-sm">
              Falls by both partners
              <input type="number" min={0} max={10} value={fallsBoth} onChange={(e) => setFallsBoth(Math.max(0, Number(e.target.value) || 0))} className="w-20 rounded border border-border bg-surface px-2 py-1 text-right font-mono" />
            </label>
          )}
          {pairs && <p className="mt-2 text-xs text-muted">Pairs: −1.0 for a fall by one partner, −2.0 for a fall by both (Rule 503).</p>}
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
                <dd className="font-mono">{result.deductions.total > 0 ? `−${result.deductions.total.toFixed(2)}` : "0.00"}</dd>
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

const LIFT_GROUPS_UI = ["1", "2", "3", "4", "5S", "5T", "5B", "5A", "5R"] as const;
const THROW_TYPES = ["T", "S", "Lo", "F", "Lz", "A"] as const;
const DEATH_SPIRAL_TYPES = [
  ["Fi", "forward inside"],
  ["Fo", "forward outside"],
  ["Bi", "backward inside"],
  ["Bo", "backward outside"],
] as const;

function AddElement({ onAdd, pairs }: { onAdd: (spec: ElementSpec) => void; pairs: boolean }) {
  const [tab, setTab] = useState<"jump" | "spin" | "step" | "choreo" | "pair">(pairs ? "pair" : "jump");
  const [pairKind, setPairKind] = useState<"lift" | "twist" | "throw" | "deathSpiral" | "pairSpin" | "choreo">("lift");
  const [liftGroup, setLiftGroup] = useState<(typeof LIFT_GROUPS_UI)[number]>("3");
  const [pairLevel, setPairLevel] = useState<Level>(4);
  const [twistRot, setTwistRot] = useState(3);
  const [twistDowngrade, setTwistDowngrade] = useState(false);
  const [throwRot, setThrowRot] = useState(3);
  const [throwType, setThrowType] = useState<(typeof THROW_TYPES)[number]>("Lz");
  const [throwCall, setThrowCall] = useState<RotationCall>("");
  const [dsType, setDsType] = useState<(typeof DEATH_SPIRAL_TYPES)[number][0]>("Fi");
  const [pairSpinCombo, setPairSpinCombo] = useState(true);
  const [pairSpinV, setPairSpinV] = useState(false);
  const pairCode =
    pairKind === "lift"
      ? `${liftGroup}Li${pairLevel}`
      : pairKind === "twist"
        ? `${twistRot}Tw${pairLevel}${twistDowngrade ? "<<" : ""}`
        : pairKind === "throw"
          ? `${throwRot}${throwType}Th${throwCall}`
          : pairKind === "deathSpiral"
            ? `${dsType}Ds${pairLevel}`
            : pairKind === "pairSpin"
              ? `${pairSpinCombo ? "PCoSp" : "PSp"}${pairLevel}${pairSpinCombo && pairSpinV ? "V" : ""}`
              : "";
  const pairCodeOk = pairCode !== "" && hasCode(pairCode);
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
        {(["jump", "spin", "step", "choreo", "pair"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-full border px-3 py-1 capitalize ${t === tab ? "border-accent bg-accent-soft text-accent-strong font-medium" : "border-border bg-surface"}`}>
            {t === "choreo" ? "Choreographic" : t === "pair" ? "Pair element" : t}
          </button>
        ))}
      </div>
      {tab === "pair" && (
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <select value={pairKind} onChange={(e) => setPairKind(e.target.value as typeof pairKind)} className="rounded border border-border bg-surface px-1 py-0.5" aria-label="Pair element type">
              <option value="lift">Lift</option>
              <option value="twist">Twist lift</option>
              <option value="throw">Throw jump</option>
              <option value="deathSpiral">Death spiral</option>
              <option value="pairSpin">Pair spin</option>
              <option value="choreo">Choreographic pair elements</option>
            </select>
            {pairKind === "lift" && (
              <select value={liftGroup} onChange={(e) => setLiftGroup(e.target.value as typeof liftGroup)} className="rounded border border-border bg-surface px-1 py-0.5" aria-label="Lift group">
                {LIFT_GROUPS_UI.map((g) => (
                  <option key={g} value={g}>
                    Group {g}
                  </option>
                ))}
              </select>
            )}
            {pairKind === "twist" && (
              <>
                <select value={twistRot} onChange={(e) => setTwistRot(Number(e.target.value))} className="rounded border border-border bg-surface px-1 py-0.5" aria-label="Twist revolutions">
                  {[1, 2, 3, 4].map((r) => (
                    <option key={r} value={r}>
                      {ROTATION_SHORT[r]}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={twistDowngrade} onChange={(e) => setTwistDowngrade(e.target.checked)} /> &lt;&lt; downgraded
                </label>
              </>
            )}
            {pairKind === "throw" && (
              <>
                <select value={throwRot} onChange={(e) => setThrowRot(Number(e.target.value))} className="rounded border border-border bg-surface px-1 py-0.5" aria-label="Throw revolutions">
                  {[1, 2, 3, 4].map((r) => (
                    <option key={r} value={r}>
                      {ROTATION_SHORT[r]}
                    </option>
                  ))}
                </select>
                <select value={throwType} onChange={(e) => setThrowType(e.target.value as typeof throwType)} className="rounded border border-border bg-surface px-1 py-0.5" aria-label="Throw jump type">
                  {THROW_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {JUMP_BY_ID[t].name}
                    </option>
                  ))}
                </select>
                <select value={throwCall} onChange={(e) => setThrowCall(e.target.value as RotationCall)} className="rounded border border-border bg-surface px-1 py-0.5" aria-label="Throw rotation call">
                  <option value="">clean</option>
                  <option value="q">q</option>
                  <option value="<">&lt;</option>
                  <option value="<<">&lt;&lt;</option>
                </select>
              </>
            )}
            {pairKind === "deathSpiral" && (
              <select value={dsType} onChange={(e) => setDsType(e.target.value as typeof dsType)} className="rounded border border-border bg-surface px-1 py-0.5" aria-label="Death spiral type">
                {DEATH_SPIRAL_TYPES.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            )}
            {pairKind === "pairSpin" && (
              <>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={pairSpinCombo} onChange={(e) => setPairSpinCombo(e.target.checked)} /> combination (PCoSp)
                </label>
                {pairSpinCombo && (
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={pairSpinV} onChange={(e) => setPairSpinV(e.target.checked)} /> V
                  </label>
                )}
              </>
            )}
            {(pairKind === "lift" || pairKind === "twist" || pairKind === "deathSpiral" || pairKind === "pairSpin") && <LevelSelect level={pairLevel} setLevel={setPairLevel} />}
            {pairKind !== "choreo" && (
              <>
                <span className="ml-auto font-mono text-muted">{pairCode}</span>
                <button type="button" disabled={!pairCodeOk} onClick={() => onAdd({ kind: "code", code: pairCode })} className="rounded-md bg-accent px-3 py-1 font-medium text-white hover:bg-accent-strong disabled:opacity-50">
                  Add
                </button>
              </>
            )}
            {pairKind === "choreo" && (
              <>
                <button type="button" onClick={() => onAdd({ kind: "code", code: "ChPLi1" })} className="rounded-md bg-accent px-3 py-1 font-medium text-white hover:bg-accent-strong">
                  Add ChPLi1
                </button>
                <button type="button" onClick={() => onAdd({ kind: "code", code: "ChPSp1" })} className="rounded-md bg-accent px-3 py-1 font-medium text-white hover:bg-accent-strong">
                  Add ChPSp1
                </button>
              </>
            )}
          </div>
          {pairKind !== "choreo" && !pairCodeOk && <p className="text-xs text-highlight">That code is not in the Scale of Values.</p>}
          <p className="text-xs text-muted">Side-by-side jumps use the Jump tab (same values as singles); solo spins use the Spin tab. Throws count as jump elements for the second-half bonus.</p>
        </div>
      )}
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
