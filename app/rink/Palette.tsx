"use client";

import { useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { JUMP_BY_ID, JUMPS, ROTATION_NAMES } from "@/data/jumps";
import { SPIN_FAMILIES } from "@/data/spins";
import type { JumpId, SpinFamily } from "@/data/types";
import { captionFor, learnFor, type ViewerSpec } from "@/three/animation/catalog";
import type { EdgeCallParam, RotationCall } from "@/three/animation/jumps";
import { PAIR_PRESETS, type PairId } from "@/three/animation/pairs";
import type { ProgramStore } from "@/three/animation/program";
import { SPECIALS, type SpecialId } from "@/three/animation/special";
import type { SpinLevel } from "@/three/animation/spins";
import { CHOREO, TURN_SPECS, type ChoreoId, type TurnId } from "@/three/animation/steps";
import { round2 } from "@/lib/scoring/sov";
import { CALL_OPTIONS, EDGE_OPTIONS, SignNotes } from "@/components/SignNotes";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { MINI_PROGRAMS } from "./programs";

const TABS = [
  { id: "jumps", label: "Jumps" },
  { id: "spins", label: "Spins" },
  { id: "steps", label: "Steps" },
  { id: "choreo", label: "Choreo" },
  { id: "other", label: "Other" },
  { id: "pairs", label: "Pairs" },
  { id: "programs", label: "Programs" },
];
const LEVELS: SpinLevel[] = ["B", 1, 2, 3, 4];
const SPIN_GROUPS: { title: string; match: (f: SpinFamily) => boolean }[] = [
  { title: "One position", match: (f) => !f.flying && !f.changeOfFoot && !f.combination },
  { title: "Flying", match: (f) => f.flying && !f.changeOfFoot && !f.combination },
  { title: "Change of foot", match: (f) => !f.flying && f.changeOfFoot && !f.combination },
  { title: "Flying, change of foot", match: (f) => f.flying && f.changeOfFoot && !f.combination },
  { title: "Combination", match: (f) => f.combination },
];

interface Item {
  id: string;
  title: string;
  detail?: string;
  value?: number;
}

function ElementList({ items, onPick }: { items: Item[]; onPick: (id: string) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-1.5">
      {items.map((it) => (
        <li key={it.id}>
          <button type="button" onClick={() => onPick(it.id)} className="focus-ring block w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left hover:border-accent">
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{it.title}</span>
              {it.value !== undefined && <span className="font-mono text-xs text-muted tabular-nums">{it.value.toFixed(2)}</span>}
            </span>
            {it.detail && <span className="block text-xs text-muted">{it.detail}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="w-16 shrink-0 text-xs text-muted">{label}</span>
      {children}
    </div>
  );
}

/** Everything the skater can perform, grouped by kind; a click performs it now or queues it. */
export function Palette({ program, onProgram }: { program: ProgramStore; onProgram?: () => void }) {
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
  const jumpSpec: ViewerSpec = { kind: "jump", slug: jump.slug, rotations: rot, call: jump.listed ? call : undefined, edge: edgeJump ? edge : undefined };
  const jumpLabel = captionFor(jumpSpec);
  return (
    <div className="text-sm">
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Kinds of element" scope="palette" size="sm" wrap className="px-2" />
      <div className="p-3">
        <TabPanel id="jumps" active={tab === "jumps"} scope="palette" className="space-y-2.5">
          <Segmented<JumpId> label="Jump" size="sm" value={jumpId} onChange={setJumpId} options={JUMPS.map((j) => ({ id: j.id, label: j.id, hint: j.name }))} className="w-full justify-between" />
          <p className="text-xs text-muted">
            <span className="font-medium text-foreground">{jump.name}</span> · {jump.takeOff.foot} {jump.takeOff.direction} {jump.takeOff.edge} edge{jump.takeOff.toePick ? `, ${jump.takeOff.toePickFoot} toe pick` : ", no toe pick"}
          </p>
          <Row label="Rotations">
            <Segmented<number> label="Rotations" size="sm" value={rot} onChange={setRotations} options={jump.rotations.map((r) => ({ id: r, label: `${r}${jumpId === "A" ? "½" : ""}`, hint: ROTATION_NAMES[r] }))} />
          </Row>
          {jump.listed && (
            <Row label="Call">
              <Segmented<RotationCall> label="Rotation call" size="sm" value={call} onChange={setCall} options={CALL_OPTIONS} />
            </Row>
          )}
          {edgeJump && (
            <Row label="Edge">
              <Segmented<EdgeCallParam> label="Edge call" size="sm" value={edge} onChange={setEdge} options={EDGE_OPTIONS} />
            </Row>
          )}
          <SignNotes always signs={[jump.listed ? call : "", edgeJump ? edge : ""]} />
          <Button variant="primary" className="w-full justify-between" onClick={() => perform(jumpSpec)} data-testid="perform-jump">
            <span>Perform {jumpLabel.caption}</span>
            {jumpLabel.value !== undefined && <span className="font-mono tabular-nums">{jumpLabel.value.toFixed(2)}</span>}
          </Button>
          <p className="text-xs text-muted">Keys 1 to 6 perform T, S, Lo, F, Lz and A at these rotations.</p>
        </TabPanel>
        <TabPanel id="spins" active={tab === "spins"} scope="palette" className="space-y-3">
          <Row label="Level">
            <Segmented<SpinLevel> label="Level" size="sm" value={level} onChange={setLevel} options={LEVELS.map((l) => ({ id: l, label: String(l) }))} />
          </Row>
          {SPIN_GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-1 text-[11px] font-semibold tracking-widest text-muted uppercase">{g.title}</p>
              <ElementList items={SPIN_FAMILIES.filter(g.match).map((f) => ({ id: f.code, title: `${f.code}${level}`, detail: f.name, value: captionFor({ kind: "spin", code: f.code, features: { level } }).value }))} onPick={(code) => perform({ kind: "spin", code, features: { level } })} />
            </div>
          ))}
          <p className="text-xs text-muted">Keys Q, W, E: camel, sit and change-foot combination spin at Level 4.</p>
        </TabPanel>
        <TabPanel id="steps" active={tab === "steps"} scope="palette" className="space-y-2">
          <ElementList items={(Object.keys(TURN_SPECS) as TurnId[]).map((id) => ({ id, title: TURN_SPECS[id].label, detail: TURN_SPECS[id].difficult ? "difficult turn" : undefined }))} onPick={(id) => perform({ kind: "turn", id: id as TurnId })} />
          <p className="text-xs text-muted">Turns and steps have no value on their own; a step sequence is scored as a whole.</p>
        </TabPanel>
        <TabPanel id="choreo" active={tab === "choreo"} scope="palette" className="space-y-2">
          <ElementList items={(Object.keys(CHOREO) as ChoreoId[]).map((id) => ({ id, title: CHOREO[id].label }))} onPick={(id) => perform({ kind: "choreo", id: id as ChoreoId })} />
          <p className="text-xs text-muted">Movements of a choreographic sequence (ChSq1, 3.00 as a whole).</p>
        </TabPanel>
        <TabPanel id="other" active={tab === "other"} scope="palette" className="space-y-2">
          <ElementList items={(Object.keys(SPECIALS) as SpecialId[]).map((id) => ({ id, title: SPECIALS[id].label }))} onPick={(id) => perform({ kind: "special", id: id as SpecialId })} />
          <p className="text-xs text-muted">Non-listed jumps: no value in the protocol.</p>
        </TabPanel>
        <TabPanel id="pairs" active={tab === "pairs"} scope="palette" className="space-y-2">
          <ElementList items={(Object.keys(PAIR_PRESETS) as PairId[]).map((id) => ({ id, title: PAIR_PRESETS[id].title, detail: PAIR_PRESETS[id].codes.join(" + "), value: captionFor({ kind: "pair", id }).value }))} onPick={(id) => perform({ kind: "pair", id: id as PairId })} />
          <p className="text-xs text-muted">The partner joins for these.</p>
        </TabPanel>
        <TabPanel id="programs" active={tab === "programs"} scope="palette" className="space-y-2">
          {MINI_PROGRAMS.map((p) => {
            const total = round2(p.specs.reduce((sum, s) => sum + (captionFor(s).value ?? 0), 0));
            return (
              <div key={p.id} className="rounded-lg border border-border bg-surface p-2.5">
                <p className="font-medium">{p.title}</p>
                <p className="mt-0.5 text-xs text-muted">{p.blurb}</p>
                <p className="mt-1 font-mono text-xs text-muted">{p.specs.map((s) => learnFor(s).code ?? captionFor(s).caption).join(" · ")}</p>
                <Button
                  size="sm"
                  variant="primary"
                  className="mt-2 w-full justify-between"
                  onClick={() => {
                    p.specs.forEach(perform);
                    onProgram?.();
                  }}
                >
                  <span>Perform the program</span>
                  <span className="font-mono tabular-nums">{total.toFixed(2)}</span>
                </Button>
              </div>
            );
          })}
          <p className="text-xs text-muted">The elements queue up; the protocol fills as each one is done.</p>
        </TabPanel>
      </div>
    </div>
  );
}
