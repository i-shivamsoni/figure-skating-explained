"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ClipboardList, LayoutGrid, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { JUMP_BY_ID } from "@/data/jumps";
import type { JumpId } from "@/data/types";
import { learnFor, specFromCode } from "@/three/animation/catalog";
import { createProgramStore, programTotal, STEER_RATE, type Performed, type ProgramStore } from "@/three/animation/program";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { cn } from "@/components/ui/cn";
import { useIsWide } from "@/lib/useMediaQuery";
import { Intro } from "./Intro";
import { LearnCard } from "./LearnCard";
import { Palette } from "./Palette";
import { Protocol } from "./Protocol";
import { SteerPad } from "./SteerPad";
import { MINI_PROGRAMS } from "./programs";

const RinkPlayer = dynamic(() => import("@/three/RinkPlayer").then((m) => m.RinkPlayer), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-[#0f1722] text-sm text-white/70">Loading the rink…</div>,
});

const JUMP_KEYS: Record<string, JumpId> = { "1": "T", "2": "S", "3": "Lo", "4": "F", "5": "Lz", "6": "A" };
const SPIN_KEYS: Record<string, string> = { q: "CSp", w: "SSp", e: "CCoSp" };
const TURN_KEYS = new Set(["ArrowLeft", "ArrowRight"]);
type TurnKey = "ArrowLeft" | "ArrowRight";
type DockId = "perform" | "score";
/** How long the "what you just saw" toast stays when the score dock is closed. */
const TOAST_MS = 12000;

interface KeyLike {
  key: string;
  repeat: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
  preventDefault: () => void;
}
const typing = (e: KeyLike) => ["INPUT", "SELECT", "TEXTAREA"].includes((e.target as HTMLElement | null)?.tagName ?? "") || e.metaKey || e.ctrlKey || e.altKey;

/**
 * The freeplay rink. On a wide screen the Perform and Score docks sit on either side of the
 * ice, each with an edge tab when closed; on a phone both live in a bottom sheet whose peek bar
 * carries the steering pad and the running total. After every element a card says what it was
 * and links to its lesson. `?perform=4Lz,CCoSp4` queues elements on arrival; the arrow keys
 * steer (left and right turn, up and down change gear), B skates backward, 1–6 and Q W E
 * perform, R resurfaces.
 *
 * `mode="teaser"` is the home page's form: the skater performs a short set on a loop with the
 * captions, values and a small protocol showing, no docks, no steering, no bar, and one button
 * into the rink.
 */
export function RinkApp({ mode = "page" }: { mode?: "page" | "teaser" }) {
  const teaser = mode === "teaser";
  const program = useMemo(() => createProgramStore(), []);
  if (teaser) return <Teaser program={program} />;
  return <Rink program={program} />;
}

/** The home page's rink: a looping set with nothing to operate but the way in. */
function Teaser({ program }: { program: ProgramStore }) {
  const history = useStore(program, (s) => s.history);
  const total = programTotal(history);
  const recent = history.slice(-3);
  const set = MINI_PROGRAMS[0];
  // perform the set, and again (on fresh ice) each time it is done
  useEffect(() => {
    const n = set.specs.length;
    let nextAt = n;
    const queueSet = (s = program.getState()) => set.specs.forEach((spec) => s.perform(spec));
    queueSet();
    const unsub = program.subscribe((s) => {
      if (s.history.length >= nextAt && s.queue.length === 0 && !s.pending && s.playing.kind !== "element") {
        nextAt = s.history.length + n;
        s.resurface();
        queueSet(s);
      }
    });
    return unsub;
  }, [program, set]);
  return (
    <div className="h-full" data-rink-mode="teaser">
      <RinkPlayer program={program} className="h-full" controls={false} hud={{ placement: "top", bottomClass: "bottom-20" }}>
        <div className="absolute inset-x-3 bottom-3 flex items-end justify-end gap-3 sm:justify-between">
          <div className="min-w-0 max-w-[22rem] rounded-xl bg-surface/90 px-3 py-2 text-xs shadow backdrop-blur max-sm:hidden" data-testid="teaser-protocol">
            <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">Protocol</p>
            {recent.length === 0 ? (
              <p className="mt-0.5 text-muted">{set.title}: {set.blurb}</p>
            ) : (
              <ul className="mt-0.5 space-y-0.5">
                {recent.map((h) => (
                  <li key={h.id} className="flex justify-between gap-3">
                    <span className="truncate">{h.caption}</span>
                    <span className="font-mono tabular-nums">{h.value !== undefined ? h.value.toFixed(2) : "—"}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 flex justify-between gap-3 border-t border-border pt-1 font-semibold">
              <span>Technical score</span>
              <span className="font-mono tabular-nums">{total.toFixed(2)}</span>
            </p>
          </div>
          <Link href="/rink" data-testid="enter-rink" className="focus-ring inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-accent px-4 text-base font-semibold text-white shadow-lg hover:bg-accent-strong sm:px-5">
            Enter the rink
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </RinkPlayer>
    </div>
  );
}

/** The full rink page. */
function Rink({ program }: { program: ProgramStore }) {
  const params = useSearchParams();
  const seeded = useRef(false);
  const wide = useIsWide();
  const [docks, setDocks] = useState<Record<DockId, boolean>>({ perform: true, score: false });
  const [sheetTab, setSheetTab] = useState<DockId>("perform");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [toast, setToast] = useState<Performed | null>(null);
  const history = useStore(program, (s) => s.history);
  const last = history.length ? history[history.length - 1] : null;
  const selected = history.find((h) => h.id === selectedId) ?? last;
  const total = programTotal(history);
  const scoreVisible = wide ? docks.score : sheetOpen && sheetTab === "score";
  const scoreVisibleRef = useRef(scoreVisible);
  useEffect(() => {
    scoreVisibleRef.current = scoreVisible;
  }, [scoreVisible]);

  const openScore = useCallback(() => {
    setDocks((d) => ({ ...d, score: true }));
    setSheetTab("score");
    setSheetOpen(true);
    setToast(null);
  }, []);
  const openPerform = useCallback(() => {
    setDocks((d) => ({ ...d, perform: true }));
    setSheetTab("perform");
    setSheetOpen(true);
  }, []);
  const showMe = useCallback(() => {
    const s = program.getState();
    MINI_PROGRAMS[0].specs.forEach((spec) => s.perform(spec));
    openScore();
  }, [program, openScore]);

  // a card for each new element while the score is out of sight
  useEffect(() => {
    let count = program.getState().history.length;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = program.subscribe((s) => {
      if (s.history.length > count && !scoreVisibleRef.current) {
        setToast(s.history[s.history.length - 1]);
        clearTimeout(timer);
        timer = setTimeout(() => setToast(null), TOAST_MS);
      }
      count = s.history.length;
    });
    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [program]);

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
  const onDown = useCallback(
    (e: KeyLike) => {
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
    },
    [program, turn],
  );
  const onUp = useCallback(
    (e: KeyLike) => {
      if (TURN_KEYS.has(e.key)) turn(e.key as TurnKey, false);
    },
    [turn],
  );
  const release = useCallback(() => {
    for (const dir of Array.from(held.current)) turn(dir, false);
  }, [turn]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => onDown(e);
    const up = (e: KeyboardEvent) => onUp(e);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
    };
  }, [onDown, onUp, release]);

  const closeDock = (id: DockId) => setDocks((d) => ({ ...d, [id]: false }));
  // a side dock is 20 rem wide plus its margin: the HUD's bottom row and the quick strip keep clear of it
  const hudBottom = wide ? cn("bottom-12", docks.perform && "pl-[21.5rem]", docks.score && "pr-[21.5rem]") : "bottom-24";
  const toastCard = toast && !scoreVisible && <LearnCard learn={learnFor(toast.spec)} onClose={() => setToast(null)} className={cn("absolute z-10 bg-surface/95 shadow-xl backdrop-blur", wide ? "bottom-14 left-1/2 w-[min(92%,24rem)] -translate-x-1/2" : "inset-x-2 bottom-28")} />;
  return (
    <div className="h-[calc(100dvh-3.5rem)] min-h-[420px]" data-rink-mode="page">
      <RinkPlayer program={program} className="h-full" hud={{ placement: "top", bottomClass: hudBottom }}>
        {wide ? (
          <>
            {docks.perform ? (
              <Dock side="left" title="Perform" onClose={() => closeDock("perform")}>
                <Palette program={program} onProgram={openScore} />
              </Dock>
            ) : (
              <EdgeTab side="left" label="Perform" icon={<LayoutGrid className="h-4 w-4" />} onClick={openPerform} />
            )}
            {docks.score ? (
              <Dock side="right" title="Score" badge={total.toFixed(2)} onClose={() => closeDock("score")}>
                <Protocol program={program} selected={selected ?? null} onSelect={setSelectedId} />
              </Dock>
            ) : (
              <EdgeTab side="right" label={`Score ${total.toFixed(2)}`} icon={<ClipboardList className="h-4 w-4" />} onClick={openScore} />
            )}
            <SteerPad program={program} onTurn={turn} className="absolute right-3 bottom-14" />
            {toastCard}
          </>
        ) : (
          <>
            {toastCard}
            <Sheet
              open={sheetOpen}
              onOpenChange={setSheetOpen}
              label="Perform and score"
              position="bottom-12"
              peek={
                <div className="flex items-center gap-1">
                  <SteerPad program={program} onTurn={turn} compact bare />
                  <Button size="sm" variant={sheetOpen && sheetTab === "perform" ? "primary" : "secondary"} onClick={openPerform} className="ml-auto">
                    Perform
                  </Button>
                  <button type="button" onClick={openScore} aria-label={`Score ${total.toFixed(2)}: open the protocol`} data-testid="rink-peek-total" className="focus-ring rounded-lg px-2 py-1 font-mono text-sm font-semibold tabular-nums hover:bg-surface-2">
                    {total.toFixed(2)}
                  </button>
                </div>
              }
            >
              <Tabs
                tabs={[
                  { id: "perform", label: "Perform" },
                  { id: "score", label: "Score" },
                ]}
                value={sheetTab}
                onChange={(id) => setSheetTab(id as DockId)}
                label="Perform and score"
                scope="rink-sheet"
                className="px-2"
              />
              <TabPanel id="perform" active={sheetTab === "perform"} scope="rink-sheet">
                <Palette program={program} onProgram={openScore} />
              </TabPanel>
              <TabPanel id="score" active={sheetTab === "score"} scope="rink-sheet">
                <Protocol program={program} selected={selected ?? null} onSelect={setSelectedId} />
              </TabPanel>
            </Sheet>
          </>
        )}
        <Intro compact={!wide} onShowMe={showMe} />
      </RinkPlayer>
    </div>
  );
}

/** A side panel over the ice. The right one stops short of the steering pad. */
function Dock({ side, title, badge, onClose, children }: { side: "left" | "right"; title: string; badge?: string; onClose: () => void; children: ReactNode }) {
  return (
    <section aria-label={title} data-testid={`dock-${title.toLowerCase()}`} className={cn("absolute top-3 z-10 flex w-80 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl", side === "left" ? "bottom-14 left-3" : "right-3 bottom-28")}>
      <div className="flex shrink-0 items-center justify-between border-b border-border py-1.5 pr-1.5 pl-3">
        <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">
          {title}
          {badge && <span className="ml-2 font-mono text-sm font-semibold tracking-normal text-foreground normal-case tabular-nums">{badge}</span>}
        </h2>
        <IconButton size="sm" label={`Close ${title}`} onClick={onClose}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

/** The slim tab on the edge of the ice that opens a closed dock. */
function EdgeTab({ side, label, icon, onClick }: { side: "left" | "right"; label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} data-testid={`tab-${side}`} className={cn("focus-ring absolute top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-1.5 bg-surface/90 px-1.5 py-2.5 text-[11px] font-semibold text-muted shadow backdrop-blur hover:bg-surface hover:text-foreground", side === "left" ? "left-0 rounded-r-xl" : "right-0 rounded-l-xl")}>
      {icon}
      <span className="tracking-wide [writing-mode:vertical-rl]">{label}</span>
    </button>
  );
}
