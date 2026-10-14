import { createStore } from "zustand";

export type CameraMode = "follow" | "side" | "front" | "overhead" | "orbit";

export interface PlayerState {
  time: number;
  duration: number;
  playing: boolean;
  speed: number;
  loop: boolean;
  camera: CameraMode;
  ready: boolean;
  setTime: (t: number) => void;
  setDuration: (d: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (s: number) => void;
  setLoop: (l: boolean) => void;
  setCamera: (c: CameraMode) => void;
  setReady: (r: boolean) => void;
}

export function createPlayerStore(init: { duration: number; playing: boolean; time?: number; camera?: CameraMode; speed?: number }) {
  return createStore<PlayerState>((set) => ({
    time: init.time ?? 0,
    duration: init.duration,
    playing: init.playing,
    speed: init.speed ?? 1,
    loop: true,
    camera: init.camera ?? "follow",
    ready: false,
    setTime: (time) => set({ time }),
    setDuration: (duration) => set({ duration }),
    play: () => set({ playing: true }),
    pause: () => set({ playing: false }),
    toggle: () => set((s) => ({ playing: !s.playing })),
    setSpeed: (speed) => set({ speed }),
    setLoop: (loop) => set({ loop }),
    setCamera: (camera) => set({ camera }),
    setReady: (ready) => set({ ready }),
  }));
}

export type PlayerStore = ReturnType<typeof createPlayerStore>;
