"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";

import { RINK } from "./animation/rinkSize";

export { RINK };

function rinkOutline(): [number, number, number][] {
  const { length: L, width: W, radius: r } = RINK;
  const pts: [number, number, number][] = [];
  const hx = L / 2 - r;
  const hz = W / 2 - r;
  const corners: [number, number, number][] = [
    [hx, hz, 0],
    [-hx, hz, Math.PI / 2],
    [-hx, -hz, Math.PI],
    [hx, -hz, -Math.PI / 2],
  ];
  for (const [cx, cz, a0] of corners) {
    for (let i = 0; i <= 12; i++) {
      const a = a0 + (i / 12) * (Math.PI / 2);
      pts.push([cx + r * Math.cos(a), 0.002, cz + r * Math.sin(a)]);
    }
  }
  pts.push(pts[0]);
  return pts;
}

/** A regulation-sized ice surface (60 × 30 m) with markings and low boards, centred on the origin. */
export function Rink({ markings = true }: { markings?: boolean }) {
  const outline = useMemo(() => rinkOutline(), []);
  const circle = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 64; i++) pts.push([4.5 * Math.cos((i / 64) * Math.PI * 2), 0.002, 4.5 * Math.sin((i / 64) * Math.PI * 2)]);
    return pts;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[RINK.length + 2, RINK.width + 2]} />
        <meshStandardMaterial color="#dbeefb" roughness={0.25} metalness={0.05} />
      </mesh>
      <Line points={outline} color="#8db7d6" lineWidth={1.5} />
      {markings && (
        <>
          <Line points={circle} color="#c76a6a" lineWidth={1} />
          <Line points={[[0, 0.002, -RINK.width / 2 + 0.6], [0, 0.002, RINK.width / 2 - 0.6]]} color="#c76a6a" lineWidth={1} />
          <Line points={[[-RINK.length / 2 + 4, 0.002, -RINK.width / 2 + 1], [-RINK.length / 2 + 4, 0.002, RINK.width / 2 - 1]]} color="#c76a6a" lineWidth={1} />
          <Line points={[[RINK.length / 2 - 4, 0.002, -RINK.width / 2 + 1], [RINK.length / 2 - 4, 0.002, RINK.width / 2 - 1]]} color="#c76a6a" lineWidth={1} />
        </>
      )}
      {/* boards */}
      <mesh position={[0, 0.55, -RINK.width / 2 - 0.6]}>
        <boxGeometry args={[RINK.length + 1.2, 1.1, 0.2]} />
        <meshStandardMaterial color="#f4f7fa" />
      </mesh>
      <mesh position={[0, 0.55, RINK.width / 2 + 0.6]}>
        <boxGeometry args={[RINK.length + 1.2, 1.1, 0.2]} />
        <meshStandardMaterial color="#f4f7fa" />
      </mesh>
      <mesh position={[-RINK.length / 2 - 0.6, 0.55, 0]}>
        <boxGeometry args={[0.2, 1.1, RINK.width + 1.2]} />
        <meshStandardMaterial color="#f4f7fa" />
      </mesh>
      <mesh position={[RINK.length / 2 + 0.6, 0.55, 0]}>
        <boxGeometry args={[0.2, 1.1, RINK.width + 1.2]} />
        <meshStandardMaterial color="#f4f7fa" />
      </mesh>
    </group>
  );
}
