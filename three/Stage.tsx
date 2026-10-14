"use client";

import { Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Rink } from "./Rink";
import { Arena } from "./Arena";

export interface OrbitOptions {
  /** Fired when the viewer starts dragging or zooming. */
  onStart?: () => void;
  minDistance?: number;
  maxDistance?: number;
  /** Radians from straight up; above π/2 lets the camera dip below the target (the player clamps it above the ice). */
  maxPolarAngle?: number;
}

export interface StageProps {
  children: ReactNode;
  camera?: { position: [number, number, number]; target?: [number, number, number]; fov?: number };
  controls?: boolean;
  orbit?: OrbitOptions;
  /** The full arena (boards, glass, stands) instead of the bare ice, with shadows across the whole rink. */
  arena?: boolean;
  className?: string;
  frameloop?: "always" | "demand";
}

/** Shared canvas: ice, lights, shadows and orbit controls (drag rotates, wheel or pinch zooms, no panning). */
export function Stage({ children, camera, controls = true, orbit, arena = false, className = "", frameloop = "always" }: StageProps) {
  const shadow = arena ? 34 : 6;
  const pos = camera?.position ?? [3.2, 1.7, 4.2];
  const target = camera?.target ?? [0, 0.9, 0];
  return (
    <Canvas
      className={className}
      shadows="percentage"
      dpr={[1, 1.75]}
      frameloop={frameloop}
      camera={{ position: pos, fov: camera?.fov ?? 38, near: 0.05, far: 200 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#eaf3fa");
      }}
    >
      <hemisphereLight args={["#ffffff", "#b8cfe0", 0.55]} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#fff6ea" position={[4, 6, 5]} scale={[8, 6, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={1.1} color="#dbe9ff" position={[-6, 4, -3]} scale={[6, 5, 1]} target={[0, 1, 0]} />
        <Lightformer form="ring" intensity={0.8} color="#ffffff" position={[0, 8, 0]} scale={[6, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.5} color="#cfe3f5" position={[0, 0.5, 8]} scale={[10, 2, 1]} target={[0, 1, 0]} />
        {/* a soft sky over everything, so metal (the blades) reflects brightness from low angles instead of the void */}
        <Lightformer form="rect" intensity={0.55} color="#eef4fb" position={[0, 14, 0]} rotation-x={Math.PI / 2} scale={[60, 60, 1]} />
      </Environment>
      <directionalLight
        position={[6, 10, 4]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-shadow}
        shadow-camera-right={shadow}
        shadow-camera-top={shadow}
        shadow-camera-bottom={-shadow}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-5, 4, -6]} intensity={0.5} />
      <Suspense fallback={null}>
        {arena ? <Arena /> : <Rink />}
        {children}
      </Suspense>
      {controls && (
        <OrbitControls
          makeDefault
          target={target}
          enableDamping
          dampingFactor={0.12}
          enablePan={false}
          minDistance={orbit?.minDistance ?? 1.2}
          maxDistance={orbit?.maxDistance ?? 60}
          maxPolarAngle={orbit?.maxPolarAngle ?? Math.PI / 2 - 0.02}
          onStart={orbit?.onStart}
        />
      )}
    </Canvas>
  );
}
