"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ElementViewer } from "@/components/ElementViewer";
import { ControlRow, LessonGrid, VIEWER_HEIGHT } from "@/components/LessonLayout";
import { CALL_OPTIONS, EDGE_OPTIONS, SignNotes } from "@/components/SignNotes";
import { ValueCard } from "@/components/ValueCard";
import { Segmented } from "@/components/ui/Segmented";
import { JUMP_BY_SLUG, ROTATION_NAMES } from "@/data/jumps";
import { jumpSovCode, type EdgeCall, type RotationCall } from "@/lib/scoring/elements";
import { SOV } from "@/lib/scoring/sov";

/** The jump page's viewer: rotations, call and edge above it, the value rail beside it. */
export function JumpExplorer({ slug, defaultRotation }: { slug: string; defaultRotation: number }) {
  const jump = JUMP_BY_SLUG[slug];
  const [rotations, setRotations] = useState(defaultRotation);
  const [call, setCall] = useState<RotationCall>("");
  const [edge, setEdge] = useState<EdgeCall>("");
  const edgeJump = jump.id === "F" || jump.id === "Lz";
  // the edge call reaches the animation: "e" rolls the take-off edge the wrong way (a lip or a flutz), "!" rides a flat
  const spec = useMemo(() => ({ kind: "jump" as const, slug, rotations, call, edge: edgeJump ? edge : undefined }), [slug, rotations, call, edge, edgeJump]);
  const code = jumpSovCode({ jump: jump.id, rotations, rotationCall: call, edgeCall: edge });
  const displayCode = jump.id === "Eu" ? "1Eu" : code;
  const entry = SOV.elements[code];
  const cleanEntry = SOV.elements[jumpSovCode({ jump: jump.id, rotations, rotationCall: call })];
  const wrongName = jump.id === "Lz" ? "lip" : "flutz";
  const rail = (
    <>
      <ValueCard
        code={displayCode}
        rinkCode={displayCode}
        testId="jump"
        name={
          <>
            {ROTATION_NAMES[rotations]} {jump.name}
            {jump.id === "A" && `, ${rotations + 0.5} revolutions`}
            {edge === "e" && ` taken off from the wrong edge: a ${wrongName}`}
            {edge === "!" && " with an unclear take-off edge"}
          </>
        }
        entry={entry}
        valueNote={edge === "e" && cleanEntry ? `instead of ${cleanEntry.base.toFixed(2)}` : edge === "!" ? "unchanged; GOE reduced" : undefined}
        missing={<>Not in the Scale of Values: {jump.id === "A" && rotations === 5 ? "there is no quintuple Axel." : "this combination of signs does not exist."}</>}
      />
      {edgeJump && (
        <div className="rounded-xl border border-border bg-surface p-4 text-sm">
          <p className="font-semibold">Flip or Lutz?</p>
          <p className="mt-1 text-muted">Same pick, same rotation; only the take-off edge differs. Use the Edge control to watch the edge roll the wrong way ({wrongName}) or flatten (!), then compare both jumps on one clock.</p>
          <Link href="/jumps#flip-vs-lutz" className="focus-ring mt-2 inline-block rounded-md font-medium text-accent hover:underline">
            Flip vs Lutz side by side →
          </Link>
        </div>
      )}
    </>
  );
  return (
    <LessonGrid rail={rail}>
      <div className="mb-3 space-y-2">
        <ControlRow label="Rotations">
          <Segmented<number>
            label="Rotations"
            value={rotations}
            onChange={setRotations}
            options={jump.rotations.map((r) => ({
              id: r,
              hint: ROTATION_NAMES[r],
              label: (
                <>
                  {r}
                  {jump.id === "A" ? "½" : ""} <span className="font-normal text-muted max-sm:hidden">{ROTATION_NAMES[r]}</span>
                </>
              ),
            }))}
          />
        </ControlRow>
        {(jump.listed || edgeJump) && (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {jump.listed && (
              <ControlRow label="Call">
                <Segmented<RotationCall> label="Rotation call" value={call} onChange={setCall} options={CALL_OPTIONS} />
              </ControlRow>
            )}
            {edgeJump && (
              <ControlRow label="Edge">
                <Segmented<EdgeCall> label="Edge call" value={edge} onChange={setEdge} options={EDGE_OPTIONS} />
              </ControlRow>
            )}
          </div>
        )}
        {jump.listed && <SignNotes signs={[call, edgeJump ? edge : ""]} />}
      </div>
      <ElementViewer spec={spec} height={VIEWER_HEIGHT} lazy={false} />
    </LessonGrid>
  );
}
