"use client";

import { useState } from "react";
import { useStore } from "zustand";
import { JUMP_BY_ID, JUMPS, ROTATION_NAMES } from "@/data/jumps";
import { SPIN_FAMILIES } from "@/data/spins";
import type { JumpId } from "@/data/types";
import { captionFor, type ViewerSpec } from "@/three/animation/catalog";
import type { EdgeCallParam, RotationCall } from "@/three/animation/jumps";
import { PAIR_PRESETS, type PairId } from "@/three/animation/pairs";
import type { ProgramStore } from "@/three/animation/program";
import { SPECIALS, type SpecialId } from "@/three/animation/special";
import type { SpinLevel } from "@/three/animation/spins";
import { CHOREO, TURN_SPECS, type ChoreoId, type TurnId } from "@/three/animation/steps";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { TabPanel } from "@/components/ui/Tabs";

const TABS = [
  { id: "jumps", label: "Jumps" },
  { id: "spins", label: "Spins" },
  { id: "steps", label: "Steps" },
  { id: "choreo", label: "Choreo" },
  { id: "other", label: "Other" },
  { id: "pairs", label: "Pairs" },
];
const CALLS: { value: RotationCall; label: string }[] = [
  { value: "", label: "Clean" },
  { value: "q", label: "q · quarter" },
  { value: "<", label: "< · under-rotated" },
  { value: "<<", label: "<< · downgraded" },
];
const EDGES: { value: EdgeCallParam; label: string }[] = [
  { value: "", label: "Correct edge" },
  { value: "!", label: "! · unclear" },
  { value: "e", label: "e · wrong edge" },
];
const LEVELS: SpinLevel[] = ["B", 1, 2, 3, 4];

function ElementList({ items, onPick }: { items: { id: string; title: string; detail?: string }[]; onPick: (id: string) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-1.5">
      {items.map((it) => (
        <li key={it.id}>
          <button type="button" onClick={() => onPick(it.id)} className="focus-ring w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left hover:border-accent">
            <span className="font-medium">{it.title}</span>
            {it.detail && <span className="block text-xs text-muted">{it.detail}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Everything the skater can perform, grouped by kind; a click performs it now or queues it. */
export function Palette({ program }: { program: ProgramStore }) {
  const [tab, setTab] = useState("jumps");
  const perform = useStore(program, (s) => s.perform);
  const rotations = useStore(program, (s) => s.rotations);
  const setRotations = useStore(program, (s) => s.setRotations);
  const [jumpId, setJumpId] = useState<JumpId>("Lz");
  const [call, setCall] = useState<RotationCall>("");
  const [edge, setEdge] = useState<EdgeCallParam>("");
  const [level, setLevel] = useState<SpinLevel>(4);
  const jump = JUMP_BY_ID[jumpId];
  const edgeJump = jumpId === "F" || jumpId === "Lz";
  const rot = jump.rotations.includes(rotations) ? rotations : jump.rotations[jump.rotations.length - 1];
  const jumpSpec: ViewerSpec = { kind: "jump", slug: jump.slug, rotations: rot, call, edge: edgeJump ? edge : undefined };
  return (
    <div className="rounded-b-xl border border-border bg-surface">
      <div className="px-2 pt-2">
        <Segmented<string> label="Kinds of element" size="sm" value={tab} onChange={setTab} options={TABS} className="w-full" />
      </div>
      <div className="p-3 text-sm">
        <TabPanel id="jumps" active={tab === "jumps"} scope="palette" className="space-y-2">
          <Segmented<JumpId> label="Jump" size="sm" value={jumpId} onChange={setJumpId} options={JUMPS.map((j) => ({ id: j.id, label: j.id, hint: j.name }))} />
          <Segmented<number> label="Rotations" size="sm" value={rot} onChange={setRotations} options={jump.rotations.map((r) => ({ id: r, label: `${r}${jumpId === "A" ? "½" : ""}`, hint: ROTATION_NAMES[r] }))} />
          <div className="flex flex-wrap gap-2">
            {jump.listed && <Select dense label="Call" value={call} onChange={(e) => setCall(e.target.value as RotationCall)} options={CALLS} />}
            {edgeJump && <Select dense label="Edge" value={edge} onChange={(e) => setEdge(e.target.value as EdgeCallParam)} options={EDGES} />}
          </div>
          <Button variant="primary" className="w-full" onClick={() => perform(jumpSpec)}>
            Perform {captionFor(jumpSpec).caption}
          </Button>
          <p className="text-xs text-muted">Keys 1 to 6 perform T, S, Lo, F, Lz and A at the chosen rotations. Between elements the arrow keys steer: left and right turn, up and down change gear (coast, stroke, run, sprint), B skates backward.</p>
        </TabPanel>
        <TabPanel id="spins" active={tab === "spins"} scope="palette" className="space-y-2">
          <Segmented<SpinLevel> label="Level" size="sm" value={level} onChange={setLevel} options={LEVELS.map((l) => ({ id: l, label: String(l) }))} />
          <ElementList items={SPIN_FAMILIES.map((f) => ({ id: f.code, title: `${f.code}${level}`, detail: f.name }))} onPick={(code) => perform({ kind: "spin", code, features: { level } })} />
          <p className="text-xs text-muted">Keys Q, W, E: camel, sit, change-foot combination at Level 4.</p>
        </TabPanel>
        <TabPanel id="steps" active={tab === "steps"} scope="palette">
          <ElementList items={(Object.keys(TURN_SPECS) as TurnId[]).map((id) => ({ id, title: TURN_SPECS[id].label }))} onPick={(id) => perform({ kind: "turn", id: id as TurnId })} />
        </TabPanel>
        <TabPanel id="choreo" active={tab === "choreo"} scope="palette">
          <ElementList items={(Object.keys(CHOREO) as ChoreoId[]).map((id) => ({ id, title: CHOREO[id].label }))} onPick={(id) => perform({ kind: "choreo", id: id as ChoreoId })} />
        </TabPanel>
        <TabPanel id="other" active={tab === "other"} scope="palette" className="space-y-2">
          <ElementList items={(Object.keys(SPECIALS) as SpecialId[]).map((id) => ({ id, title: SPECIALS[id].label }))} onPick={(id) => perform({ kind: "special", id: id as SpecialId })} />
          <p className="text-xs text-muted">Non-listed jumps: no value in the protocol.</p>
        </TabPanel>
        <TabPanel id="pairs" active={tab === "pairs"} scope="palette" className="space-y-2">
          <ElementList items={(Object.keys(PAIR_PRESETS) as PairId[]).map((id) => ({ id, title: PAIR_PRESETS[id].title, detail: PAIR_PRESETS[id].codes.join(" + ") }))} onPick={(id) => perform({ kind: "pair", id: id as PairId })} />
          <p className="text-xs text-muted">The partner joins for these.</p>
        </TabPanel>
      </div>
    </div>
  );
}
