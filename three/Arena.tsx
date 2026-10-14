"use client";

import { Rink } from "./Rink";
import { RINK } from "./animation/rinkSize";

const L = RINK.length;
const W = RINK.width;
const BOARD = 1.1;
const GLASS = 1.7;
const STEPS = 9;

function Stand({ side }: { side: "north" | "south" | "east" | "west" }) {
  const long = side === "north" || side === "south";
  const sign = side === "north" || side === "east" ? -1 : 1;
  const base = (long ? W : L) / 2 + 3.5;
  const span = (long ? L : W) + 10;
  return (
    <group>
      {Array.from({ length: STEPS }, (_, i) => {
        const d = sign * (base + i * 1.3 + 0.65);
        const y = 0.45 + i * 0.55;
        return (
          <mesh key={i} position={long ? [0, y / 2, d] : [d, y / 2, 0]} receiveShadow>
            <boxGeometry args={long ? [span, y, 1.3] : [1.3, y, span]} />
            <meshStandardMaterial color={i % 2 ? "#1d2a3b" : "#223246"} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

/** The ice inside its boards and glass, with stands and lights around it. */
export function Arena() {
  return (
    <group>
      <Rink />
      {/* arena floor beyond the ice */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[L + 60, W + 60]} />
        <meshStandardMaterial color="#0f1722" roughness={1} />
      </mesh>
      {/* kick plates and glass on the four sides */}
      {(
        [
          { pos: [0, 0, -W / 2 - 0.6] as const, size: [L + 1.2, 0.22] as const, long: true },
          { pos: [0, 0, W / 2 + 0.6] as const, size: [L + 1.2, 0.22] as const, long: true },
          { pos: [-L / 2 - 0.6, 0, 0] as const, size: [0.22, W + 1.2] as const, long: false },
          { pos: [L / 2 + 0.6, 0, 0] as const, size: [0.22, W + 1.2] as const, long: false },
        ] as const
      ).map((b, i) => (
        <group key={i}>
          <mesh position={[b.pos[0], 0.14, b.pos[2]]}>
            <boxGeometry args={[b.long ? b.size[0] : 0.26, 0.28, b.long ? 0.26 : b.size[1]]} />
            <meshStandardMaterial color="#d9b24a" roughness={0.6} />
          </mesh>
          <mesh position={[b.pos[0], BOARD + GLASS / 2, b.pos[2]]}>
            <boxGeometry args={[b.long ? b.size[0] : 0.05, GLASS, b.long ? 0.05 : b.size[1]]} />
            <meshPhysicalMaterial color="#ffffff" transparent opacity={0.03} roughness={0.02} metalness={0} depthWrite={false} />
          </mesh>
          <mesh position={[b.pos[0], BOARD + GLASS, b.pos[2]]}>
            <boxGeometry args={[b.long ? b.size[0] : 0.1, 0.06, b.long ? 0.1 : b.size[1]]} />
            <meshStandardMaterial color="#9aa7b5" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}
      <Stand side="north" />
      <Stand side="south" />
      <Stand side="east" />
      <Stand side="west" />
      {/* light rigs */}
      {[
        [-L / 4, -W / 4],
        [L / 4, -W / 4],
        [-L / 4, W / 4],
        [L / 4, W / 4],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 14, z]}>
          <boxGeometry args={[4, 0.4, 1.2]} />
          <meshStandardMaterial color="#ffffff" emissive="#fff6e0" emissiveIntensity={1.2} />
        </mesh>
      ))}
    </group>
  );
}
