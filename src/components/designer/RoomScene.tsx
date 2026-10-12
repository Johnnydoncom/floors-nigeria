"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { floorOutline, wallSegments, type RoomPlan } from "@/lib/room/plan";
import { ROUGHNESS, type ArMaterialSpec } from "@/lib/room/ar-material";
import { getTexture } from "@/lib/visualizer/images";
import { materialTile, normalMapFromHeight } from "@/lib/visualizer/material-tile";

export type CameraMode = "overview" | "standing";

/** Bake resolution for the floor: crisp at eye level, cheap enough for a phone. */
const PX_PER_M = 256;

/** Eye height of a standing adult, in metres. */
const EYE_HEIGHT = 1.6;

/**
 * The room in three dimensions (§11).
 *
 * The floor carries the chosen material at true scale — the same plank bake
 * the AR patch uses, sized from the variation's millimetres — so what a
 * customer sees is the plank they will actually receive, laid in the room they
 * actually measured. That is the thing a photo visualizer cannot do.
 *
 * Nothing here waits on the network except the material itself, and the room
 * draws in plain colour until that arrives: an environment map fetched from a
 * CDN once held the whole scene blank behind a Suspense boundary.
 */
export function RoomScene({
  plan,
  spec,
  cameraMode,
}: {
  plan: RoomPlan;
  spec: ArMaterialSpec | null;
  cameraMode: CameraMode;
}) {
  return (
    <Canvas shadows="percentage" dpr={[1, 1.75]} camera={{ fov: 45, near: 0.05, far: 200 }}>
      <color attach="background" args={["#f2f2ee"]} />
      <RoomLighting />

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

      <Floor plan={plan} spec={spec} />
      <Walls plan={plan} />
      <Skirting plan={plan} />

      <CameraRig plan={plan} mode={cameraMode} />
    </Canvas>
  );
}

/**
 * Soft reflections from a room generated on the spot — no HDR download, so
 * the scene never waits on one.
 */
function RoomLighting() {
  // Scene objects are three.js state, changed in place; `get` reads them
  // fresh inside the effect rather than holding them across renders.
  const get = useThree((state) => state.get);

  useEffect(() => {
    const { gl, scene } = get();
    const generator = new THREE.PMREMGenerator(gl);
    const environment = generator.fromScene(new RoomEnvironment(), 0.04).texture;

    scene.environment = environment;
    scene.environmentIntensity = 0.35;

    return () => {
      scene.environment = null;
      environment.dispose();
      generator.dispose();
    };
  }, [get]);

  return null;
}

/**
 * Where the camera stands and what it may do.
 *
 * Overview circles the room from above, far enough back to hold it in frame;
 * the near walls face away from it and are not drawn, so it sees in like a
 * doll's house. Eye level stands just inside the near wall and turns in place.
 * Both follow the plan, so changing a dimension re-frames the room.
 */
function CameraRig({ plan, mode }: { plan: RoomPlan; mode: CameraMode }) {
  const get = useThree((state) => state.get);
  const reach = Math.max(plan.width, plan.length);

  // In an L-shape, stand in the full-length part of the room, clear of the bite.
  const standX = plan.shape === "l_shape" ? (plan.width - plan.notchWidth) / 2 : plan.width / 2;
  const isOverview = mode === "overview";

  const position: [number, number, number] = isOverview
    ? [plan.width / 2 + reach * 0.75, reach * 0.85 + 1, plan.length / 2 + reach * 0.95]
    : [standX, EYE_HEIGHT, plan.length - 0.35];

  const target: [number, number, number] = isOverview
    ? [plan.width / 2, 0, plan.length / 2]
    : // A hair in front of the eye: orbiting it turns the head, not the body.
      [standX, EYE_HEIGHT - 0.002, plan.length - 0.36];

  const [x, y, z] = position;

  useEffect(() => {
    const camera = get().camera as THREE.PerspectiveCamera;
    camera.position.set(x, y, z);
    camera.fov = isOverview ? 45 : 70;
    camera.updateProjectionMatrix();
    // Position only: the controls below take the target and look at it.
  }, [get, isOverview, x, y, z]);

  return (
    <OrbitControls
      key={mode}
      target={target}
      enablePan={isOverview}
      enableZoom={isOverview}
      minDistance={isOverview ? 2 : 0}
      maxDistance={isOverview ? reach * 3 : 1}
      // Overview never drops below the floor; eye level looks a little up and
      // down, never straight at the ceiling there is none of.
      minPolarAngle={isOverview ? 0 : Math.PI * 0.3}
      maxPolarAngle={isOverview ? Math.PI / 2.05 : Math.PI * 0.62}
      rotateSpeed={isOverview ? 1 : -0.45}
      makeDefault
    />
  );
}

/**
 * The floor, with the material laid at its real size.
 */
function Floor({ plan, spec }: { plan: RoomPlan; spec: ArMaterialSpec | null }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();

    // Laid flat by a turn of -90° about x, which sends the shape's y to -z, so
    // y is negated here to land the floor on the plan's own axes — with its
    // face up, where a +90° turn would leave it facing the ground and invisible
    // from above. UVs follow the shape's coordinates: one unit is one metre.
    floorOutline(plan).forEach((point, index) => {
      if (index === 0) shape.moveTo(point.x, -point.y);
      else shape.lineTo(point.x, -point.y);
    });
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);

    return geometry;
  }, [plan]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const maps = useFloorMaps(spec);
  const angle =
    (((spec?.rotationDegrees ?? 0) + ((maps?.map.userData.baseRotation as number) ?? 0)) *
      Math.PI) /
    180;

  return (
    <mesh geometry={geometry} receiveShadow>
      {maps ? (
        <meshStandardMaterial
          key={maps.map.uuid}
          map={maps.map}
          map-rotation={angle}
          normalMap={maps.normalMap}
          {...(maps.normalMap ? { "normalMap-rotation": angle } : {})}
          normalScale={new THREE.Vector2(0.6, 0.6)}
          roughness={ROUGHNESS[spec?.finish ?? "satin"]}
          metalness={0}
        />
      ) : (
        <meshStandardMaterial color="#cfc9bf" roughness={0.9} />
      )}
    </mesh>
  );
}

type FloorMaps = { map: THREE.Texture; normalMap: THREE.Texture | null };

/**
 * The material baked into a repeating period of planks or tiles, sized so one
 * repeat covers exactly the floor it represents in metres.
 *
 * The bake depends only on the material and its plank size; turning the lay
 * direction just rotates the textures already made (see `Floor`).
 */
function useFloorMaps(spec: ArMaterialSpec | null): FloorMaps | null {
  // Kept with the material it was baked for, so a stale bake is never shown
  // while the next one loads.
  const [baked, setBaked] = useState<{ key: string; maps: FloorMaps | null } | null>(null);

  const bakeKey = spec
    ? [
        spec.textureUrl,
        spec.kind,
        spec.layout,
        spec.lengthM,
        spec.widthM,
        spec.isSeamless,
        spec.textureSizeM ?? "",
      ].join("|")
    : "";

  useEffect(() => {
    if (!spec) return;

    let cancelled = false;
    let made: FloorMaps | null = null;

    getTexture(spec.textureUrl)
      .then((image) => {
        if (cancelled) return;

        const tile = materialTile({
          texture: image,
          textureKey: spec.textureKey,
          kind: spec.kind,
          layout: spec.layout,
          lengthM: spec.lengthM,
          widthM: spec.widthM,
          isSeamless: spec.isSeamless,
          textureSizeM: spec.textureSizeM,
          pxPerM: PX_PER_M,
          withHeight: true,
        });

        if (!tile) {
          setBaked({ key: bakeKey, maps: null });
          return;
        }

        const periodX = tile.image.width * tile.metresPerPx;
        const periodY = tile.image.height * tile.metresPerPx;

        const prepare = (texture: THREE.Texture) => {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(1 / periodX, 1 / periodY);
          texture.anisotropy = 8;
          return texture;
        };

        const map = prepare(new THREE.CanvasTexture(tile.image));
        map.colorSpace = THREE.SRGBColorSpace;
        map.userData.baseRotation = tile.baseRotation;

        const normalMap = tile.height
          ? prepare(new THREE.CanvasTexture(normalMapFromHeight(tile.height)))
          : null;

        made = { map, normalMap };
        setBaked({ key: bakeKey, maps: made });
      })
      // A texture that will not load leaves the floor in plain colour.
      .catch(() => {
        if (!cancelled) setBaked({ key: bakeKey, maps: null });
      });

    return () => {
      cancelled = true;
      made?.map.dispose();
      made?.normalMap?.dispose();
    };
    // The bake key stands for the fields of spec the bake reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bakeKey]);

  return baked && baked.key === bakeKey ? baked.maps : null;
}

/**
 * Walls raised from the floor outline, facing inwards.
 *
 * Single-sided on purpose: from outside the room the near walls face away from
 * the camera and are culled, so the overview looks in over them.
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
            <meshStandardMaterial color="#f4f2ee" roughness={0.95} side={THREE.FrontSide} />
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
