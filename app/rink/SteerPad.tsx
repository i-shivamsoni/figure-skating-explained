"use client";

import { ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "zustand";
import type { ProgramStore } from "@/three/animation/program";
import { GEARS, gearFor, type Gear } from "@/three/animation/stroking";
import { IconButton } from "@/components/ui/IconButton";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/components/ui/cn";

/**
 * The steering pad: turn buttons to hold, the gear (coast, stroke, run, sprint) and the
 * backward toggle. It mirrors the keys (arrows and B) and works by touch on a phone.
 */
export function SteerPad({ program, onTurn, className }: { program: ProgramStore; onTurn: (dir: "ArrowLeft" | "ArrowRight", held: boolean) => void; className?: string }) {
  const steer = useStore(program, (s) => s.steer);
  const gear = gearFor(steer.speed).id;
  const hold = (dir: "ArrowLeft" | "ArrowRight") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      onTurn(dir, true);
    },
    onPointerUp: () => onTurn(dir, false),
    onPointerCancel: () => onTurn(dir, false),
    onLostPointerCapture: () => onTurn(dir, false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  return (
    <div data-testid="steer-pad" className={cn("flex items-center gap-1 rounded-xl bg-surface/85 p-1 shadow backdrop-blur", className)}>
      <IconButton size="sm" label="Turn left (hold, or the left arrow key)" {...hold("ArrowLeft")} className="touch-none select-none">
        <ChevronLeft className="h-4 w-4" />
      </IconButton>
      <IconButton size="sm" label="Turn right (hold, or the right arrow key)" {...hold("ArrowRight")} className="touch-none select-none">
        <ChevronRight className="h-4 w-4" />
      </IconButton>
      <Segmented<Gear> label="Gear (up and down arrow keys)" size="sm" value={gear} onChange={(g) => program.getState().setGear(g)} options={GEARS.map((g) => ({ id: g.id, label: g.label, hint: g.hint }))} className="flex-nowrap border-0 bg-transparent p-0" />
      <IconButton size="sm" label={steer.backward ? "Skating backward: switch to forward (B)" : "Skate backward (B)"} active={steer.backward} onClick={() => program.getState().setBackward(!steer.backward)}>
        <ArrowLeftRight className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
