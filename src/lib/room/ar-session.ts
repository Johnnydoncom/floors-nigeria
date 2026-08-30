import * as THREE from "three";
import { plankSize } from "./material";
import type { Variant } from "@/lib/api/types";

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

/** Size of the material patch placed on the floor, in metres. */
const PATCH_SIZE = 2.4;

export type ArSupport = "checking" | "supported" | "unsupported" | "insecure";

/**
 * Whether this device can run an immersive AR session.
 *
 * Android Chrome supports WebXR; iOS Safari does not, and needs AR Quick Look
 * with a USDZ file instead — a different pipeline, not a fallback flag.
 */
export async function checkArSupport(): Promise<ArSupport> {
  if (typeof navigator === "undefined") return "unsupported";

  // WebXR is only exposed on secure origins, which includes localhost.
  if (typeof window !== "undefined" && !window.isSecureContext) return "insecure";

  const xr = (navigator as Navigator & { xr?: XRSystem }).xr;

  if (!xr) return "unsupported";

  try {
    return (await xr.isSessionSupported("immersive-ar")) ? "supported" : "unsupported";
  } catch {
    return "unsupported";
  }
}

export type ArHandle = { end: () => void };

/**
 * Start an AR session that lays the material wherever the phone is pointed.
 */
export async function startArSession({
  textureUrl,
  variant,
  rotationDegrees,
  overlay,
  onEnd,
}: {
  textureUrl: string;
  variant?: Variant | null;
  rotationDegrees: number;
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

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbaa, 2));

  const patch = await buildPatch(textureUrl, variant, rotationDegrees);
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
 * A square of flooring at true plank scale, lying flat.
 */
async function buildPatch(
  textureUrl: string,
  variant: Variant | null | undefined,
  rotationDegrees: number,
): Promise<THREE.Mesh> {
  const texture = await new THREE.TextureLoader().loadAsync(textureUrl);
  const { lengthM, widthM } = plankSize(variant);

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.repeat.set(PATCH_SIZE / lengthM, PATCH_SIZE / widthM);
  texture.center.set(0.5, 0.5);
  texture.rotation = (rotationDegrees * Math.PI) / 180;

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(PATCH_SIZE, PATCH_SIZE),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
  );

  // PlaneGeometry stands upright by default; lay it on the floor.
  mesh.rotation.x = -Math.PI / 2;

  return mesh;
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
