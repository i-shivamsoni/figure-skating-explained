"use client";

import { useMemo, useState } from "react";
import { ElementViewer } from "@/components/ElementViewer";
import { ControlRow, LessonGrid, VIEWER_HEIGHT } from "@/components/LessonLayout";
import { ValueCard } from "@/components/ValueCard";
import { Chip } from "@/components/ui/Chip";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { SPIN_FAMILIES } from "@/data/spins";
import { SOV, hasCode } from "@/lib/scoring/sov";
import { spinCode, spinFeatureNotes, spinFromSpec, spinPositions, spinRevolutions, VARIATION_POSE, VARIATIONS_FOR, type BasicPosition, type SpinFeatures, type SpinLevel } from "@/three/animation/spins";

const LEVELS: SpinLevel[] = ["B", 1, 2, 3, 4];
const POSITION_NAMES: Record<BasicPosition, string> = { camel: "Camel", sit: "Sit", upright: "Upright", layback: "Layback" };

/**
 * Builds any spin family with the level features that change what you see: the flying entry and
 * its difficult variation, the change of foot by step or by jump, a clear change of edge, a
 * difficult variation per position, eight revolutions, a difficult entrance and windmills. The
 * rail shows the protocol code with its base value and what the technical panel would count.
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
  const counted = notes.features.filter((f) => f.counted).length;
  const rail = (
    <>
      <ValueCard
        code={code}
        testId="spin"
        name={
          <>
            {fam.name}, Level {level}
            {v && ", reduced value"}
          </>
        }
        entry={entry}
        missing="Not in the Scale of Values: this code has no V row."
      />
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
          {counted} feature{counted === 1 ? "" : "s"} counted: supports Level {notes.supported}
          {!notes.mandatoryCounted && counted >= 4 && " (Level 4 also needs one of the six mandatory features)"}. The code above uses the level you picked.
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
              {revs.perFoot.L > 0 && `left foot ${revs.perFoot.L.toFixed(1)}`}
              {revs.perFoot.L > 0 && revs.perFoot.R > 0 && " · "}
              {revs.perFoot.R > 0 && `right foot ${revs.perFoot.R.toFixed(1)}`}
            </span>
            <span className="font-mono">{revs.total.toFixed(1)} in all</span>
          </li>
        </ul>
        <p className="mt-2 text-xs text-muted">A position counts after two revolutions; a change of foot needs three before and after it; the Short Program spin combination needs six on each foot.</p>
      </div>
    </>
  );
  return (
    <LessonGrid rail={rail}>
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Select
            label="Family"
            className="max-sm:w-full"
            value={fam.code}
            onChange={(e) => {
              // toggles hidden for the new family must not carry state
              setFamily(e.target.value);
              setDifficultEntrance(false);
              setWindmills(false);
              setChangeByJump(false);
              setDifficultFly(false);
            }}
            options={SPIN_FAMILIES.map((f) => ({ value: f.code, label: `${f.code} · ${f.name}` }))}
          />
          <ControlRow label="Level" className="gap-x-2">
            <Segmented<SpinLevel> label="Level" value={level} onChange={setLevel} options={LEVELS.map((l) => ({ id: l, label: String(l) }))} />
            <Chip onClick={() => setV(!v)} active={v} disabled={!vExists && !v} title={vExists ? "Reduced value" : "No V row for this code in the Scale of Values"}>
              V · reduced value
            </Chip>
          </ControlRow>
        </div>
        <ControlRow label="Features">
          <Chip onClick={() => setChangeOfEdge(!changeOfEdge)} active={changeOfEdge}>
            Clear change of edge
          </Chip>
          <Chip onClick={() => setEightRevolutions(!eightRevolutions)} active={eightRevolutions}>
            8 revolutions
          </Chip>
          {fam.changeOfFoot && (
            <Chip onClick={() => setChangeByJump(!changeByJump)} active={changeByJump}>
              Change of foot by jump
            </Chip>
          )}
          {fam.flying && (
            <Chip onClick={() => setDifficultFly(!difficultFly)} active={difficultFly} disabled={v} title={v ? "A stepped-over entry has no flying feature" : undefined}>
              Difficult variation of flying entry
            </Chip>
          )}
          {!fam.flying && (
            <Chip onClick={() => setDifficultEntrance(!difficultEntrance)} active={difficultEntrance}>
              Difficult entrance · travelling threes
            </Chip>
          )}
          {!fam.flying && firstIsCamel && (
            <Chip onClick={() => setWindmills(!windmills)} active={windmills}>
              Windmills ×3
            </Chip>
          )}
        </ControlRow>
        <ControlRow label="Variations">
          {positions.map((pos) => (
            <Select key={pos} dense label={POSITION_NAMES[pos]} value={variations[pos] ?? ""} onChange={(e) => setVariations({ ...variations, [pos]: e.target.value || undefined })} options={[{ value: "", label: "none" }, ...VARIATIONS_FOR[pos].map((id) => ({ value: id, label: VARIATION_POSE[id].name }))]} />
          ))}
        </ControlRow>
      </div>
      <ElementViewer spec={spec} height={VIEWER_HEIGHT} camera="side" lazy={false} />
    </LessonGrid>
  );
}
