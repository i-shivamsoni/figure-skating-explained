"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ClipboardList, LayoutGrid, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JUMP_BY_ID } from "@/data/jumps";
import type { JumpId } from "@/data/types";
import { specFromCode } from "@/three/animation/catalog";
import { createProgramStore, STEER_RATE } from "@/three/animation/program";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/components/ui/cn";
import { Palette } from "./Palette";
import { Protocol } from "./Protocol";
import { SteerPad } from "./SteerPad";

const RinkPlayer = dynamic(() => import("@/three/RinkPlayer").then((m) => m.RinkPlayer), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-[#0f1722] text-sm text-white/70">Loading the rink…</div>,
});

const JUMP_KEYS: Record<string, JumpId> = { "1": "T", "2": "S", "3": "Lo", "4": "F", "5": "Lz", "6": "A" };
const SPIN_KEYS: Record<string, string> = { q: "CSp", w: "SSp", e: "CCoSp" };
const TURN_KEYS = new Set(["ArrowLeft", "ArrowRight"]);
type TurnKey = "ArrowLeft" | "ArrowRight";

type Panel = "palette" | "protocol" | null;

/**
 * The freeplay page: the rink fills the viewport; the palette and the protocol are panels laid
 * over it (so they stay in full screen and fold away on a phone). `?perform=4Lz,CCoSp4` queues
 * elements on arrival; the arrow keys steer (left and right turn, up and down change gear), B
 * skates backward, 1–6 and Q W E perform.
 */
export function RinkApp() {
  const program = useMemo(() => createProgramStore(), []);
  const params = useSearchParams();
  const seeded = useRef(false);
  const [panel, setPanel] = useState<Panel>("palette");
  // the turn keys and the pad's turn buttons share one set of held directions
  const held = useRef(new Set<TurnKey>());
  const turn = useCallback(
    (dir: TurnKey, down: boolean) => {
      const h = held.current;
      if (down ? h.has(dir) : !h.delete(dir)) return;
      if (down) h.add(dir);
      const s = program.getState();
      s.setSteer((h.has("ArrowLeft") ? STEER_RATE : 0) - (h.has("ArrowRight") ? STEER_RATE : 0), s.steer.speed);
    },
    [program],
  );
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const list = params.get("perform");
    if (!list) return;
    for (const code of list.split(",")) {
      const spec = specFromCode(code);
      if (spec) program.getState().perform(spec);
    }
  }, [params, program]);
  useEffect(() => {
    const typing = (e: KeyboardEvent) => ["INPUT", "SELECT", "TEXTAREA"].includes((e.target as HTMLElement | null)?.tagName ?? "") || e.metaKey || e.ctrlKey || e.altKey;
    const onDown = (e: KeyboardEvent) => {
      if (typing(e)) return;
      if (TURN_KEYS.has(e.key)) {
        e.preventDefault();
        turn(e.key as TurnKey, true);
        return;
      }
      const s = program.getState();
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        if (!e.repeat) s.setGear(e.key === "ArrowUp" ? 1 : -1);
        return;
      }
      const k = e.key.toLowerCase();
      if (JUMP_KEYS[k]) {
        const j = JUMP_BY_ID[JUMP_KEYS[k]];
        const r = j.rotations.includes(s.rotations) ? s.rotations : j.rotations[j.rotations.length - 1];
        s.perform({ kind: "jump", slug: j.slug, rotations: r });
      } else if (SPIN_KEYS[k]) s.perform({ kind: "spin", code: SPIN_KEYS[k], features: { level: 4 } });
      else if (k === "b") s.setBackward(!s.steer.backward);
      else if (k === "r") s.resurface();
      else return;
      e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
      if (TURN_KEYS.has(e.key)) turn(e.key as TurnKey, false);
    };
    const onBlur = () => {
      for (const dir of Array.from(held.current)) turn(dir, false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [program, turn]);
  const toggle = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));
  return (
    <div className="h-[calc(100dvh-3.5rem)] min-h-[420px]">
      <RinkPlayer program={program} className="h-full">
        {/* panel switches, top-right under the HUD counter area */}
        <div className="absolute top-2 right-2 flex gap-1 sm:top-3 sm:right-3">
          <IconButton size="sm" label={panel === "palette" ? "Hide the elements" : "Show the elements"} active={panel === "palette"} onClick={() => toggle("palette")} className="bg-surface/85 shadow backdrop-blur">
            <LayoutGrid className="h-4 w-4" />
          </IconButton>
          <IconButton size="sm" label={panel === "protocol" ? "Hide the protocol" : "Show the protocol"} active={panel === "protocol"} onClick={() => toggle("protocol")} className="bg-surface/85 shadow backdrop-blur">
            <ClipboardList className="h-4 w-4" />
          </IconButton>
        </div>
        <SteerPad program={program} onTurn={turn} className="absolute right-2 bottom-12 max-sm:bottom-[5.6rem] sm:right-3" />
        {panel && (
          <div className={cn("absolute inset-x-2 bottom-[8.4rem] max-h-[calc(100%-11.5rem)] overflow-y-auto rounded-xl shadow-xl sm:inset-x-auto sm:top-14 sm:bottom-auto sm:max-h-[calc(100%-8rem)] sm:w-80", panel === "palette" ? "sm:left-3" : "sm:right-3")}>
            <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-border bg-surface px-3 py-1.5 text-xs font-semibold tracking-widest text-muted uppercase">
              {panel === "palette" ? "Elements" : "Protocol"}
              <IconButton size="sm" label="Close" onClick={() => setPanel(null)}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            {panel === "palette" ? <Palette program={program} /> : <Protocol program={program} />}
          </div>
        )}
      </RinkPlayer>
    </div>
  );
}
