"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ElementViewer } from "@/components/ElementViewer";
import { JUMP_BY_SLUG, JUMP_SIGNS, ROTATION_NAMES } from "@/data/jumps";
import { jumpSovCode, type EdgeCall, type RotationCall } from "@/lib/scoring/elements";
import { SOV } from "@/lib/scoring/sov";

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
    const edgeJump = jump.id === "F" || jump.id === "Lz";
  // the edge call reaches the animation: "e" rolls the take-off edge the wrong way (a lip or a flutz), "!" rides a flat
  const spec = useMemo(() => ({ kind: "jump" as const, slug, rotations, call, edge: edgeJump ? edge : undefined }), [slug, rotations, call, edge, edgeJump]);
  const code = jumpSovCode({ jump: jump.id, rotations, rotationCall: call, edgeCall: edge });
  const entry = SOV.elements[code];
  const sign = JUMP_SIGNS.find((s) => s.sign === (edge || call));
  const cleanEntry = SOV.elements[jumpSovCode({ jump: jump.id, rotations, rotationCall: call })];
  const wrongName = jump.id === "Lz" ? "lip" : "flutz";
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
        <ElementViewer spec={spec} height={480} />
      </div>
      <aside className="space-y-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Protocol code</p>
          <p className="font-mono text-3xl font-semibold">{jump.id === "Eu" ? "1Eu" : code}</p>
          <Link href={`/rink?perform=${encodeURIComponent(jump.id === "Eu" ? "1Eu" : code)}`} className="mt-1 inline-block text-sm font-medium text-accent hover:underline">
            Perform it on the rink →
          </Link>
          <p className="mt-1 text-sm text-muted">
            {ROTATION_NAMES[rotations]} {jump.name}
            {jump.id === "A" && `, ${rotations + 0.5} revolutions`}
            {edge === "e" && ` taken off from the wrong edge: a ${wrongName}`}
            {edge === "!" && " with an unclear take-off edge"}
          </p>
          {entry ? (
            <>
              <p className="mt-3 text-xs uppercase tracking-wide text-muted">Base value</p>
              <p className="font-mono text-2xl font-semibold">
                {entry.base.toFixed(2)}
                {edge === "e" && cleanEntry && <span className="ml-2 text-sm font-normal text-muted">instead of {cleanEntry.base.toFixed(2)}</span>}
                {edge === "!" && <span className="ml-2 text-sm font-normal text-muted">unchanged; GOE reduced</span>}
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
        {edgeJump && (
          <div className="rounded-xl border border-border bg-surface p-4 text-sm">
            <p className="font-semibold">Flip or Lutz?</p>
            <p className="mt-1 text-muted">Same pick, same rotation; only the take-off edge differs. Use the Edge selector to watch the edge roll the wrong way ({wrongName}) or flatten (!), then compare both jumps on one clock.</p>
            <Link href="/jumps#flip-vs-lutz" className="mt-2 inline-block font-medium text-accent hover:underline">
              Flip vs Lutz side by side →
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
