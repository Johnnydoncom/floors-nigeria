import * as THREE from "three";
import { buildFloorPatch, type ArMaterialSpec } from "./ar-material";

/**
 * Augmented reality floor preview (§10, "live placement").
 *
 * WebXR's hit-test gives the pose of a real surface the phone is pointing at.
 * A patch of the chosen material is drawn at that pose, at true scale, so a
 * customer can hold the floor against their own room and walk around it.
 *
 * Written against three.js directly rather than through React: an XR session
 * owns its own render loop and animation frames, and reconciling that with a
 * React renderer buys nothing when the scene is a single textured plane.
 */

import type { ArHandle } from "./ar-support";

export type { ArHandle };

/**
 * Start an AR session that lays the material wherever the phone is pointed.
 */
export async function startArSession({
  spec,
  overlay,
  onEnd,
}: {
  spec: ArMaterialSpec;
  /** Element shown over the camera feed, for the exit button and hints. */
  overlay?: HTMLElement | null;
  onEnd?: () => void;
}): Promise<ArHandle> {
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr;

  if (!xr) throw new Error("This device does not support AR.");

  const session = await xr.requestSession("immersive-ar", {
    requiredFeatures: ["hit-test", "local-floor"],
    optionalFeatures: ["dom-overlay"],
    ...(overlay ? { domOverlay: { root: overlay } } : {}),
  });

  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.xr.enabled = true;
  await renderer.xr.setSession(session);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();

  // Soft light from above, so the joints' normal map reads as grooves.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbaa, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(1, 3, 2);
  scene.add(sun);

  const patch = await buildFloorPatch(spec);
  patch.visible = false;
  scene.add(patch);

  const reticle = buildReticle();
  scene.add(reticle);

  const viewerSpace = await session.requestReferenceSpace("viewer");
  const localSpace = await session.requestReferenceSpace("local-floor");
  const hitTestSource = await session.requestHitTestSource?.({ space: viewerSpace });

  let placed = false;

  // Tapping locks the floor to the surface currently under the reticle.
  const place = () => {
    if (!reticle.visible) return;
    patch.position.setFromMatrixPosition(reticle.matrix);
    patch.visible = true;
    placed = true;
  };

  session.addEventListener("select", place);

  renderer.setAnimationLoop((_time, frame) => {
    if (frame && hitTestSource && !placed) {
      const hits = frame.getHitTestResults(hitTestSource);
      const pose = hits[0]?.getPose(localSpace);

      if (pose) {
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }

    if (placed) reticle.visible = false;

    renderer.render(scene, camera);
  });

  const cleanup = () => {
    session.removeEventListener("select", place);
    renderer.setAnimationLoop(null);
    hitTestSource?.cancel();
    renderer.dispose();
    onEnd?.();
  };

  session.addEventListener("end", cleanup);

  return {
    end: () => {
      void session.end().catch(() => cleanup());
    },
  };
}

/**
 * The ring that shows which surface has been found.
 */
function buildReticle(): THREE.Mesh {
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.09, 0.11, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xb59a34 }),
  );

  reticle.matrixAutoUpdate = false;
  reticle.visible = false;

  return reticle;
}
