"use client";

import { Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Rink } from "./Rink";

export interface StageProps {
  children: ReactNode;
  camera?: { position: [number, number, number]; target?: [number, number, number]; fov?: number };
  controls?: boolean;
  className?: string;
  frameloop?: "always" | "demand";
}

/** Shared canvas: ice, lights, shadows and orbit controls. */
export function Stage({ children, camera, controls = true, className = "", frameloop = "always" }: StageProps) {
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
      </Environment>
      <directionalLight
        position={[6, 10, 4]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-5, 4, -6]} intensity={0.5} />
      <Suspense fallback={null}>
        <Rink />
        {children}
      </Suspense>
      {controls && <OrbitControls makeDefault target={target} enableDamping dampingFactor={0.1} minDistance={1.2} maxDistance={40} maxPolarAngle={Math.PI / 2 - 0.02} />}
    </Canvas>
  );
}
