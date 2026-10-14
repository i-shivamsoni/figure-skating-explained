"use client";

import { useMemo, useState } from "react";
import { ElementViewer } from "@/components/ElementViewer";
import { JUMP_BY_SLUG, JUMP_SIGNS, ROTATION_NAMES } from "@/data/jumps";
import { jumpSovCode, type EdgeCall, type RotationCall } from "@/lib/scoring/elements";
import { SOV } from "@/lib/scoring/sov";
import type { CameraMode } from "@/three/animation/store";

const CALLS: { id: RotationCall; label: string }[] = [
  { id: "", label: "Clean" },
  { id: "q", label: "q · quarter" },
  { id: "<", label: "< · under-rotated" },
  { id: "<<", label: "<< · downgraded" },
];
const EDGES: { id: EdgeCall; label: string }[] = [
  { id: "", label: "Correct edge" },
  { id: "!", label: "! · unclear" },
  { id: "e", label: "e · wrong edge" },
];

export function JumpExplorer({ slug, defaultRotation }: { slug: string; defaultRotation: number }) {
  const jump = JUMP_BY_SLUG[slug];
  const [rotations, setRotations] = useState(defaultRotation);
  const [call, setCall] = useState<RotationCall>("");
  const [edge, setEdge] = useState<EdgeCall>("");
  const [camera, setCamera] = useState<CameraMode>("follow");
  const spec = useMemo(() => ({ kind: "jump" as const, slug, rotations, call }), [slug, rotations, call]);
  const code = jumpSovCode({ jump: jump.id, rotations, rotationCall: call, edgeCall: edge });
  const entry = SOV.elements[code];
  const sign = JUMP_SIGNS.find((s) => s.sign === (edge || call));
  const edgeJump = jump.id === "F" || jump.id === "Lz";
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Rotations</span>
          {jump.rotations.map((r) => (
            <button key={r} type="button" onClick={() => setRotations(r)} aria-pressed={r === rotations} className={`rounded-md border px-3 py-1 ${r === rotations ? "border-accent bg-accent-soft text-accent-strong font-medium" : "border-border bg-surface hover:border-accent"}`}>
              {r}
              {jump.id === "A" ? "½" : ""} <span className="text-muted">{ROTATION_NAMES[r]}</span>
            </button>
          ))}
          {jump.listed && (
            <label className="ml-auto flex items-center gap-1">
              Call
              <select value={call} onChange={(e) => setCall(e.target.value as RotationCall)} className="rounded border border-border bg-surface px-1 py-0.5">
                {CALLS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {edgeJump && (
            <label className="flex items-center gap-1">
              Edge
              <select value={edge} onChange={(e) => setEdge(e.target.value as EdgeCall)} className="rounded border border-border bg-surface px-1 py-0.5">
                {EDGES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          )}
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
          <p className="font-mono text-3xl font-semibold">{jump.id === "Eu" ? "1Eu" : code}</p>
          <p className="mt-1 text-sm text-muted">
            {ROTATION_NAMES[rotations]} {jump.name}
            {jump.id === "A" && `, ${rotations + 0.5} revolutions`}
          </p>
          {entry ? (
            <>
              <p className="mt-3 text-xs uppercase tracking-wide text-muted">Base value</p>
              <p className="font-mono text-2xl font-semibold">{entry.base.toFixed(2)}</p>
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
            <p className="mt-3 text-sm text-highlight">Not in the Scale of Values: {jump.id === "A" && rotations === 5 ? "there is no quintuple Axel." : "this combination of signs does not exist."}</p>
          )}
        </div>
        {sign && (
          <div className="rounded-xl border border-border bg-surface p-4 text-sm">
            <p className="font-semibold">
              <span className="font-mono text-accent-strong">{sign.sign}</span> {sign.name}
            </p>
            <p className="mt-1 text-muted">{sign.meaning}</p>
            <p className="mt-1">{sign.baseValueEffect}</p>
            <p className="mt-1 text-muted">{sign.goeEffect}</p>
          </div>
        )}
      </aside>
    </div>
  );
}
