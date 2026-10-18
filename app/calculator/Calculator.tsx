"use client";

import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, X } from "lucide-react";
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
import { elementSpecsFromCodes } from "@/lib/decoder/parse";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { Select } from "@/components/ui/Select";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { cn } from "@/components/ui/cn";

type Row = ProgramElementInput & { id: number };
const LEVELS: Level[] = ["B", 1, 2, 3, 4];
const GRADES = [5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5];
const GRADE_OPTIONS = GRADES.map((g) => ({ value: String(g), label: g > 0 ? `+${g}` : String(g) }));

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

/**
 * The program calculator. `?codes=4Lz,CCoSp4` (the rink's "Open in the calculator") loads a
 * list of protocol codes at GOE 0 in place of the example program.
 */
export function Calculator() {
  const params = useSearchParams();
  const imported = useMemo(() => elementSpecsFromCodes(params.get("codes")), [params]);
  const fromRink = imported.length > 0;
  const [segment, setSegment] = useState<Segment>("freeSkating");
  const [category, setCategory] = useState<ScoringCategory>(() => (imported.some((s) => s.kind === "code") ? "seniorPairs" : "seniorMen"));
  const [rows, setRows] = useState<Row[]>(() => (fromRink ? imported.map((spec) => row(spec)) : EXAMPLES["Senior Men Free Skating"].rows()));
  const [components, setComponents] = useState<[number, number, number]>(fromRink ? [7.5, 7.5, 7.5] : [9.0, 9.0, 9.25]);
  const [falls, setFalls] = useState(0);
  const [fallsBoth, setFallsBoth] = useState(0);
  const [other, setOther] = useState(0);
  const [example, setExample] = useState<string | null>(fromRink ? null : "Senior Men Free Skating");
  const pairs = isPairs(category);

  const result = useMemo(() => {
    try {
      return scoreProgram({ segment, category, elements: rows, components: { composition: components[0], presentation: components[1], skatingSkills: components[2] }, falls, fallsBoth: pairs ? fallsBoth : 0, otherDeductions: other });
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [segment, category, rows, components, falls, fallsBoth, pairs, other]);
  const warnings = useMemo(() => validateProgram({ segment, category, elements: rows.map((r) => r.spec) }), [segment, category, rows]);
  const scoredRows = rows.map((r, i) => ({ row: r, scored: "error" in result ? undefined : result.elements[i] }));

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
  const remove = (id: number) => setRows((rs) => rs.filter((x) => x.id !== id));
  const loadExample = (name: string) => {
    const ex = EXAMPLES[name];
    setExample(name);
    setSegment(ex.segment);
    setCategory(ex.category);
    setRows(ex.rows());
    setComponents(ex.components);
    setFalls(0);
    setFallsBoth(0);
    setOther(0);
  };
  const clear = () => {
    setExample(null);
    setRows([]);
  };
  const setRep = (r: Row, rep: boolean) => update(r.id, { spec: { ...(r.spec as ElementSpec & { kind: "jump" }), rep } });

  const totals = "error" in result ? null : result;
  return (
    <div className="grid gap-6 pb-16 md:pb-0 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        {fromRink && (
          <p className="rounded-lg border border-accent/40 bg-accent-soft/40 px-3 py-2 text-sm" data-testid="calculator-imported">
            {imported.length} element{imported.length === 1 ? "" : "s"} from the rink, every one at GOE 0 with middling components. Set the judges&apos; grades and the component marks to see what the program would really score.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Select label="Segment" value={segment} onChange={(e) => setSegment(e.target.value as Segment)} options={[{ value: "shortProgram", label: "Short Program" }, { value: "freeSkating", label: "Free Skating" }]} />
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as ScoringCategory)} options={Object.entries({ ...CATEGORY_LABELS, ...PAIR_CATEGORY_LABELS }).map(([c, label]) => ({ value: c, label }))} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted">Start from</span>
          {Object.keys(EXAMPLES).map((n) => (
            <Chip key={n} onClick={() => loadExample(n)} active={example === n}>
              {n}
            </Chip>
          ))}
          <Chip onClick={clear} active={rows.length === 0}>
            Empty
          </Chip>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface px-3 py-6 text-center text-sm text-muted">No elements yet. Add jumps, spins and steps below, or start from an example.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
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
                  {scoredRows.map(({ row: r, scored }, i) => (
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
                      <td className="px-2 py-1.5 text-center">{isJumpElement(r.spec) && <input type="checkbox" checked={Boolean(r.secondHalf)} onChange={(e) => update(r.id, { secondHalf: e.target.checked })} aria-label="Started in the second half" />}</td>
                      <td className="px-2 py-1.5 text-center">{r.spec.kind === "jump" && <input type="checkbox" checked={Boolean((r.spec as { rep?: boolean }).rep)} onChange={(e) => setRep(r, e.target.checked)} aria-label="Repetition" />}</td>
                      <td className="px-2 py-1.5 text-center">
                        <Select dense hideLabel label="GOE" className="font-mono" value={String(r.goe)} onChange={(e) => update(r.id, { goe: Number(e.target.value) })} options={GRADE_OPTIONS} />
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold">{scored ? scored.total.toFixed(2) : "—"}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-right">
                        <RowActions onUp={() => move(r.id, -1)} onDown={() => move(r.id, 1)} onRemove={() => remove(r.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ol className="space-y-2 md:hidden">
              {scoredRows.map(({ row: r, scored }, i) => (
                <li key={r.id} className="rounded-xl border border-border bg-surface p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono font-semibold">
                        <span className="mr-2 text-xs font-normal text-muted">{i + 1}</span>
                        {elementCode(r.spec)}
                      </p>
                      {scored?.info.length ? <p className="text-xs text-muted">{scored.info.join(" · ")}</p> : null}
                    </div>
                    <p className="shrink-0 text-right">
                      <span className="block font-mono font-semibold">{scored ? scored.total.toFixed(2) : "—"}</span>
                      <span className="block text-xs text-muted">base {scored ? scored.factoredBase.toFixed(2) : "—"}</span>
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Select dense label="GOE" className="font-mono" value={String(r.goe)} onChange={(e) => update(r.id, { goe: Number(e.target.value) })} options={GRADE_OPTIONS} />
                    {isJumpElement(r.spec) && (
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" checked={Boolean(r.secondHalf)} onChange={(e) => update(r.id, { secondHalf: e.target.checked })} /> 2nd half
                      </label>
                    )}
                    {r.spec.kind === "jump" && (
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" checked={Boolean((r.spec as { rep?: boolean }).rep)} onChange={(e) => setRep(r, e.target.checked)} /> REP
                      </label>
                    )}
                    <span className="ml-auto">
                      <RowActions onUp={() => move(r.id, -1)} onDown={() => move(r.id, 1)} onRemove={() => remove(r.id)} />
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}

        <AddElement onAdd={(spec) => setRows((rs) => [...rs, row(spec, 0, false)])} pairs={pairs} />

        {warnings.length > 0 && (
          <ul className="space-y-1 text-sm">
            {warnings.map((w, i) => (
              <li key={i} className={cn("rounded-lg border px-3 py-2", w.severity === "error" ? "border-highlight/50 bg-highlight/10" : w.severity === "warning" ? "border-warn/50 bg-warn/10" : "border-border bg-surface")}>
                <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-muted">{w.severity}</span>
                {w.elementIndex !== undefined && <span className="mr-1 font-mono text-xs">#{w.elementIndex + 1}</span>}
                {w.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="font-semibold">Program components</h2>
          {(["Composition", "Presentation", "Skating Skills"] as const).map((name, i) => (
            <label key={name} className="mt-2 block text-sm">
              {name}: <span className="font-mono font-semibold">{components[i].toFixed(2)}</span>
              <input type="range" min={0.25} max={10} step={0.25} value={components[i]} onChange={(e) => setComponents((c) => c.map((v, k) => (k === i ? Number(e.target.value) : v)) as [number, number, number])} className="mt-1 block w-full accent-accent" />
            </label>
          ))}
          {totals && <p className="mt-2 text-xs text-muted">Factor ×{totals.pcs.factor.toFixed(2)} for this segment and category.</p>}
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="font-semibold">Deductions</h2>
          <label className="mt-2 flex items-center justify-between text-sm">
            {pairs ? "Falls by one partner" : "Falls"}
            <input type="number" min={0} max={10} value={falls} onChange={(e) => setFalls(Math.max(0, Number(e.target.value) || 0))} className="focus-ring h-9 w-20 rounded-lg border border-border bg-surface px-2 text-right font-mono" />
          </label>
          {pairs && (
            <label className="mt-2 flex items-center justify-between text-sm">
              Falls by both partners
              <input type="number" min={0} max={10} value={fallsBoth} onChange={(e) => setFallsBoth(Math.max(0, Number(e.target.value) || 0))} className="focus-ring h-9 w-20 rounded-lg border border-border bg-surface px-2 text-right font-mono" />
            </label>
          )}
          {pairs && <p className="mt-2 text-xs text-muted">Pairs: −1.0 for a fall by one partner, −2.0 for a fall by both (Rule 503).</p>}
          <label className="mt-2 flex items-center justify-between text-sm">
            Other (time, costume…)
            <input type="number" min={0} step={1} value={other} onChange={(e) => setOther(Math.max(0, Number(e.target.value) || 0))} className="focus-ring h-9 w-20 rounded-lg border border-border bg-surface px-2 text-right font-mono" />
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
                <dd className="font-mono" data-testid="calculator-total">
                  {result.total.toFixed(2)}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </aside>

      {/* the running total stays in view on a phone, where the score panel is far below the list */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-2 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-3 text-sm">
          {totals ? (
            <>
              <span className="truncate text-xs text-muted">
                TES {totals.tes.toFixed(2)} · PCS {totals.pcs.total.toFixed(2)}
                {totals.deductions.total > 0 && ` · −${totals.deductions.total.toFixed(2)}`}
              </span>
              <span className="shrink-0">
                <span className="mr-2 text-xs font-semibold tracking-widest text-muted uppercase">Segment score</span>
                <span className="font-mono text-lg font-semibold tabular-nums">{totals.total.toFixed(2)}</span>
              </span>
            </>
          ) : (
            <span className="text-xs text-highlight">{(result as { error: string }).error}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function RowActions({ onUp, onDown, onRemove }: { onUp: () => void; onDown: () => void; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center">
      <IconButton size="sm" label="Move up" onClick={onUp}>
        <ArrowUp className="h-4 w-4" />
      </IconButton>
      <IconButton size="sm" label="Move down" onClick={onDown}>
        <ArrowDown className="h-4 w-4" />
      </IconButton>
      <IconButton size="sm" label="Remove" onClick={onRemove} className="hover:text-highlight">
        <X className="h-4 w-4" />
      </IconButton>
    </span>
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
const CALL_SELECT = [
  { value: "", label: "clean" },
  { value: "q", label: "q" },
  { value: "<", label: "<" },
  { value: "<<", label: "<<" },
];
const ADD_TABS = [
  { id: "jump", label: "Jump" },
  { id: "spin", label: "Spin" },
  { id: "step", label: "Step sequence" },
  { id: "choreo", label: "Choreographic" },
  { id: "pair", label: "Pair element" },
];

function AddElement({ onAdd, pairs }: { onAdd: (spec: ElementSpec) => void; pairs: boolean }) {
  const [tab, setTab] = useState<string>(pairs ? "pair" : "jump");
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
  const jumpCodeOk = jumps.every((x) => x.jump === "Eu" || hasCode(`${x.rotations}${x.jump}${["F", "Lz"].includes(x.jump) ? (x.edgeCall ?? "") : ""}${x.rotationCall ?? ""}`));
  const codePreview = (c: string) => <span className="ml-auto font-mono text-muted">{c}</span>;
  return (
    <div className="rounded-xl border border-border bg-surface">
      <Tabs tabs={ADD_TABS} value={tab} onChange={setTab} label="Add an element" scope="add" size="sm" wrap className="px-2" />
      <div className="p-3 text-sm">
        <TabPanel id="pair" active={tab === "pair"} scope="add" className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select dense hideLabel label="Pair element type" value={pairKind} onChange={(e) => setPairKind(e.target.value as typeof pairKind)} options={[{ value: "lift", label: "Lift" }, { value: "twist", label: "Twist lift" }, { value: "throw", label: "Throw jump" }, { value: "deathSpiral", label: "Death spiral" }, { value: "pairSpin", label: "Pair spin" }, { value: "choreo", label: "Choreographic pair elements" }]} />
            {pairKind === "lift" && <Select dense hideLabel label="Lift group" value={liftGroup} onChange={(e) => setLiftGroup(e.target.value as typeof liftGroup)} options={LIFT_GROUPS_UI.map((g) => ({ value: g, label: `Group ${g}` }))} />}
            {pairKind === "twist" && (
              <>
                <Select dense hideLabel label="Twist revolutions" value={String(twistRot)} onChange={(e) => setTwistRot(Number(e.target.value))} options={[1, 2, 3, 4].map((r) => ({ value: String(r), label: ROTATION_SHORT[r] }))} />
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={twistDowngrade} onChange={(e) => setTwistDowngrade(e.target.checked)} /> &lt;&lt; downgraded
                </label>
              </>
            )}
            {pairKind === "throw" && (
              <>
                <Select dense hideLabel label="Throw revolutions" value={String(throwRot)} onChange={(e) => setThrowRot(Number(e.target.value))} options={[1, 2, 3, 4].map((r) => ({ value: String(r), label: ROTATION_SHORT[r] }))} />
                <Select dense hideLabel label="Throw jump type" value={throwType} onChange={(e) => setThrowType(e.target.value as typeof throwType)} options={THROW_TYPES.map((t) => ({ value: t, label: JUMP_BY_ID[t].name }))} />
                <Select dense hideLabel label="Throw rotation call" value={throwCall} onChange={(e) => setThrowCall(e.target.value as RotationCall)} options={CALL_SELECT} />
              </>
            )}
            {pairKind === "deathSpiral" && <Select dense hideLabel label="Death spiral type" value={dsType} onChange={(e) => setDsType(e.target.value as typeof dsType)} options={DEATH_SPIRAL_TYPES.map(([id, label]) => ({ value: id, label }))} />}
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
                {codePreview(pairCode)}
                <Button variant="primary" size="sm" disabled={!pairCodeOk} onClick={() => onAdd({ kind: "code", code: pairCode })}>
                  Add
                </Button>
              </>
            )}
            {pairKind === "choreo" && (
              <>
                <Button variant="primary" size="sm" onClick={() => onAdd({ kind: "code", code: "ChPLi1" })}>
                  Add ChPLi1
                </Button>
                <Button variant="primary" size="sm" onClick={() => onAdd({ kind: "code", code: "ChPSp1" })}>
                  Add ChPSp1
                </Button>
              </>
            )}
          </div>
          {pairKind !== "choreo" && !pairCodeOk && <p className="text-xs text-highlight">That code is not in the Scale of Values.</p>}
          <p className="text-xs text-muted">Side-by-side jumps use the Jump tab (same values as singles); solo spins use the Spin tab. Throws count as jump elements for the second-half bonus.</p>
        </TabPanel>
        <TabPanel id="jump" active={tab === "jump"} scope="add" className="space-y-2">
          {jumps.map((x, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              {i > 0 && <span className="font-mono">+</span>}
              <Select dense hideLabel label="Jump" value={x.jump} onChange={(e) => setJump(i, { jump: e.target.value as JumpId, rotations: e.target.value === "Eu" ? 1 : x.rotations })} options={JUMPS.map((jp) => ({ value: jp.id, label: jp.name }))} />
              {x.jump !== "Eu" && <Select dense hideLabel label="Rotations" value={String(x.rotations)} onChange={(e) => setJump(i, { rotations: Number(e.target.value) })} options={JUMP_BY_ID[x.jump].rotations.map((r) => ({ value: String(r), label: ROTATION_SHORT[r] }))} />}
              {x.jump !== "Eu" && <Select dense hideLabel label="Rotation call" value={x.rotationCall ?? ""} onChange={(e) => setJump(i, { rotationCall: e.target.value as RotationCall })} options={CALL_SELECT} />}
              {["F", "Lz"].includes(x.jump) && <Select dense hideLabel label="Edge call" value={x.edgeCall ?? ""} onChange={(e) => setJump(i, { edgeCall: e.target.value as EdgeCall })} options={[{ value: "", label: "edge ok" }, { value: "!", label: "!" }, { value: "e", label: "e" }]} />}
              {jumps.length > 1 && (
                <IconButton size="sm" label="Remove this jump" onClick={() => setJumps((js) => js.filter((_, k) => k !== i))}>
                  <X className="h-4 w-4" />
                </IconButton>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            {jumps.length < 4 && (
              <Button size="sm" onClick={() => setJumps((js) => [...js, { jump: "T", rotations: 3 }])}>
                + add a jump (combination)
              </Button>
            )}
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={sequence} onChange={(e) => setSequence(e.target.checked)} /> jump sequence (+SEQ)
            </label>
            {codePreview(elementCode({ kind: "jump", jumps, sequence }))}
            <Button variant="primary" size="sm" disabled={!jumpCodeOk} onClick={() => onAdd({ kind: "jump", jumps: jumps.map((x) => ({ ...x })), sequence })}>
              Add
            </Button>
          </div>
          {!jumpCodeOk && <p className="text-xs text-highlight">That jump code is not in the Scale of Values.</p>}
          <p className="text-xs text-muted">Up to three listed jumps; an Euler between two listed jumps does not count toward the three. Sequences end with an Axel-type jump.</p>
        </TabPanel>
        <TabPanel id="spin" active={tab === "spin"} scope="add" className="flex flex-wrap items-center gap-2">
          <Select dense hideLabel label="Spin family" value={family} onChange={(e) => setFamily(e.target.value)} options={SPIN_FAMILIES.map((f) => ({ value: f.code, label: `${f.code} · ${f.name}` }))} />
          <LevelSelect level={level} setLevel={setLevel} />
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={v} onChange={(e) => setV(e.target.checked)} /> V
          </label>
          {codePreview(elementCode({ kind: "spin", family, level, v }))}
          <Button variant="primary" size="sm" onClick={() => onAdd({ kind: "spin", family, level, v })}>
            Add
          </Button>
        </TabPanel>
        <TabPanel id="step" active={tab === "step"} scope="add" className="flex flex-wrap items-center gap-2">
          <LevelSelect level={level} setLevel={setLevel} />
          {codePreview(`StSq${level}`)}
          <Button variant="primary" size="sm" onClick={() => onAdd({ kind: "step", level })}>
            Add
          </Button>
        </TabPanel>
        <TabPanel id="choreo" active={tab === "choreo"} scope="add" className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => onAdd({ kind: "choreoSequence" })}>
            Add ChSq1
          </Button>
          <Button variant="primary" size="sm" onClick={() => onAdd({ kind: "choreoSpin" })}>
            Add ChSp1
          </Button>
        </TabPanel>
      </div>
    </div>
  );
}

function LevelSelect({ level, setLevel }: { level: Level; setLevel: (l: Level) => void }) {
  return <Select dense label="Level" value={String(level)} onChange={(e) => setLevel((e.target.value === "B" ? "B" : Number(e.target.value)) as Level)} options={LEVELS.map((l) => ({ value: String(l), label: String(l) }))} />;
}
