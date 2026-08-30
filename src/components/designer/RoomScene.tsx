"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, SoftShadows } from "@react-three/drei";
import * as THREE from "three";
import { floorOutline, wallSegments, type RoomPlan } from "@/lib/room/plan";
import { plankSize } from "@/lib/room/material";
import type { Variant } from "@/lib/api/types";

export type CameraMode = "overview" | "standing";

/**
 * The room in three dimensions (§11).
 *
 * The floor carries the chosen material at true scale — the variation's plank
 * size in millimetres drives the texture repeat — so what a customer sees is
 * the plank they will actually receive, laid in the room they actually
 * measured. That is the thing a photo visualizer cannot do.
 */
export function RoomScene({
  plan,
  textureUrl,
  variant,
  rotationDegrees,
  cameraMode,
}: {
  plan: RoomPlan;
  textureUrl: string | null;
  variant?: Variant | null;
  rotationDegrees: number;
  cameraMode: CameraMode;
}) {
  const centre: [number, number, number] = [plan.width / 2, 0, plan.length / 2];

  // Far enough back to hold the whole room in frame, whatever its size.
  const reach = Math.max(plan.width, plan.length);
  const overview: [number, number, number] = [
    plan.width / 2 + reach * 0.75,
    reach * 0.85,
    plan.length / 2 + reach * 0.95,
  ];
  const standing: [number, number, number] = [plan.width / 2, 1.6, plan.length - 0.6];

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{
        position: cameraMode === "overview" ? overview : standing,
        fov: cameraMode === "overview" ? 45 : 70,
        near: 0.05,
        far: 200,
      }}
      // Keyed so switching camera mode re-mounts with the new position rather
      // than leaving the old one in place.
      key={cameraMode}
    >
      <color attach="background" args={["#f2f2ee"]} />
      <SoftShadows size={28} samples={12} focus={0.8} />

      <hemisphereLight args={["#ffffff", "#c9c4b8", 1.1]} />
      <directionalLight
        position={[plan.width + 4, plan.wallHeight + 5, -3]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      <Suspense fallback={null}>
        <Floor
          plan={plan}
          textureUrl={textureUrl}
          variant={variant}
          rotationDegrees={rotationDegrees}
        />
        <Walls plan={plan} />
        <Skirting plan={plan} />
        <Environment preset="apartment" environmentIntensity={0.35} />
      </Suspense>

      <OrbitControls
        target={cameraMode === "overview" ? centre : [plan.width / 2, 1.2, 0]}
        enablePan={cameraMode === "overview"}
        minDistance={cameraMode === "overview" ? 2 : 0.1}
        maxDistance={reach * 3}
        // Never let the camera drop below the floor.
        maxPolarAngle={Math.PI / 2.05}
        makeDefault
      />
    </Canvas>
  );
}

/**
 * The floor, with the material laid at its real size.
 */
function Floor({
  plan,
  textureUrl,
  variant,
  rotationDegrees,
}: {
  plan: RoomPlan;
  textureUrl: string | null;
  variant?: Variant | null;
  rotationDegrees: number;
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const outline = floorOutline(plan);

    outline.forEach((point, index) => {
      if (index === 0) shape.moveTo(point.x, point.y);
      else shape.lineTo(point.x, point.y);
    });
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    // ShapeGeometry lays UVs out in the shape's own coordinates, which are
    // metres here — so one UV unit is one metre and the texture repeat below
    // is expressed directly in real-world plank sizes.
    geometry.rotateX(Math.PI / 2);

    return geometry;
  }, [plan]);

  const texture = useFloorTexture(textureUrl, variant, rotationDegrees);

  return (
    <mesh geometry={geometry} receiveShadow position={[0, 0, 0]}>
      {texture ? (
        <meshStandardMaterial map={texture} roughness={0.72} metalness={0.02} />
      ) : (
        <meshStandardMaterial color="#cfc9bf" roughness={0.9} />
      )}
    </mesh>
  );
}

/**
 * Load and tile the material so one texture repeat is one plank.
 */
function useFloorTexture(
  textureUrl: string | null,
  variant: Variant | null | undefined,
  rotationDegrees: number,
): THREE.Texture | null {
  return useMemo(() => {
    if (!textureUrl) return null;

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    const texture = loader.load(textureUrl);
    const { lengthM, widthM } = plankSize(variant);

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    // One repeat per plank: a 1.22m × 0.183m plank repeats accordingly, so a
    // 4.5m wall shows the right number of boards.
    texture.repeat.set(1 / lengthM, 1 / widthM);
    texture.center.set(0.5, 0.5);
    texture.rotation = (rotationDegrees * Math.PI) / 180;
    texture.anisotropy = 8;

    return texture;
  }, [textureUrl, variant, rotationDegrees]);
}

/**
 * Walls raised from the floor outline, facing inwards.
 */
function Walls({ plan }: { plan: RoomPlan }) {
  const walls = useMemo(() => wallSegments(plan), [plan]);

  return (
    <group>
      {walls.map((wall, index) => {
        const midX = (wall.from.x + wall.to.x) / 2;
        const midZ = (wall.from.y + wall.to.y) / 2;
        const angle = Math.atan2(wall.to.y - wall.from.y, wall.to.x - wall.from.x);

        return (
          <mesh
            key={index}
            position={[midX, plan.wallHeight / 2, midZ]}
            rotation={[0, -angle, 0]}
            receiveShadow
          >
            <planeGeometry args={[wall.length, plan.wallHeight]} />
            <meshStandardMaterial color="#f4f2ee" roughness={0.95} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Skirting where the walls meet the floor — a small thing that does a lot to
 * stop the room reading as a flat box.
 */
function Skirting({ plan }: { plan: RoomPlan }) {
  const walls = useMemo(() => wallSegments(plan), [plan]);
  const height = 0.09;

  return (
    <group>
      {walls.map((wall, index) => {
        const midX = (wall.from.x + wall.to.x) / 2;
        const midZ = (wall.from.y + wall.to.y) / 2;
        const angle = Math.atan2(wall.to.y - wall.from.y, wall.to.x - wall.from.x);

        return (
          <mesh key={index} position={[midX, height / 2, midZ]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[wall.length, height, 0.018]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}
