import { createStore } from "zustand";

/**
 * Camera starting points. Every preset is a place the viewer can orbit and zoom from; dragging or
 * zooming turns the preset into "free" (wherever they left it). "arena" shows the whole rink.
 */
export type CameraPreset = "follow" | "side" | "front" | "overhead" | "low" | "close" | "arena" | "free";
/** @deprecated use CameraPreset; kept so older call sites and the dev labs compile. */
export type CameraMode = CameraPreset;

export const CAMERA_PRESETS: { id: CameraPreset; label: string; hint: string }[] = [
  { id: "follow", label: "Follow", hint: "Three-quarter view that travels with the skater" },
  { id: "side", label: "Side", hint: "Square on from the side: height and rotation" },
  { id: "front", label: "Front", hint: "Facing the skater" },
  { id: "overhead", label: "Overhead", hint: "Straight down: the edge curves on the ice" },
  { id: "low", label: "Ice level", hint: "From the ice: the edges and the blade" },
  { id: "close", label: "Close-up", hint: "Near the body: arms, head, free leg" },
  { id: "arena", label: "Arena", hint: "The whole rink from the stands" },
  { id: "free", label: "Free", hint: "Wherever you dragged or zoomed to" },
];

export interface PlayerState {
  time: number;
  duration: number;
  playing: boolean;
  speed: number;
  loop: boolean;
  /** The camera's starting point; a drag or zoom switches it to "free" without losing the view. */
  preset: CameraPreset;
  /** Keep the camera centred on the skater as she moves (off for "arena"). */
  track: boolean;
  /** @deprecated mirrors `preset`. */
  camera: CameraPreset;
  ready: boolean;
  setTime: (t: number) => void;
  setDuration: (d: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (s: number) => void;
  setLoop: (l: boolean) => void;
  setPreset: (p: CameraPreset) => void;
  setTrack: (t: boolean) => void;
  /** @deprecated use setPreset. */
  setCamera: (c: CameraPreset) => void;
  setReady: (r: boolean) => void;
}

export function createPlayerStore(init: { duration: number; playing: boolean; time?: number; camera?: CameraPreset; speed?: number }) {
  const preset = init.camera ?? "follow";
  return createStore<PlayerState>((set) => {
    const setPreset = (p: CameraPreset) => set((s) => ({ preset: p, camera: p, track: p === "arena" ? false : p === "free" ? s.track : true }));
    return {
      time: init.time ?? 0,
      duration: init.duration,
      playing: init.playing,
      speed: init.speed ?? 1,
      loop: true,
      preset,
      camera: preset,
      track: preset !== "arena",
      ready: false,
      setTime: (time) => set({ time }),
      setDuration: (duration) => set({ duration }),
      play: () => set({ playing: true }),
      pause: () => set({ playing: false }),
      toggle: () => set((s) => ({ playing: !s.playing })),
      setSpeed: (speed) => set({ speed }),
      setLoop: (loop) => set({ loop }),
      setPreset,
      setTrack: (track) => set({ track }),
      setCamera: setPreset,
      setReady: (ready) => set({ ready }),
    };
  });
}

export type PlayerStore = ReturnType<typeof createPlayerStore>;
