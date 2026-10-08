import * as THREE from "three";
import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";
import { buildFloorPatch, type ArMaterialSpec } from "./ar-material";

/**
 * AR on iPhone and iPad (§10).
 *
 * iOS Safari has no WebXR. It does have AR Quick Look, which opens a USDZ model
 * in the system AR viewer when a link with `rel="ar"` is followed. The model is
 * built here, in the browser, from the same floor patch the Android session
 * shows — so no server pipeline, and any catalogue material works the moment
 * it is listed. Quick Look anchors it to the first horizontal surface found,
 * at true scale.
 */
export async function openQuickLook(spec: ArMaterialSpec, title: string): Promise<void> {
  const scene = new THREE.Scene();
  const patch = await buildFloorPatch(spec);
  scene.add(patch);

  const exporter = new USDZExporter();
  const buffer = await exporter.parseAsync(scene, {
    quickLookCompatible: true,
    maxTextureSize: 2048,
    ar: { anchoring: { type: "plane" }, planeAnchoring: { alignment: "horizontal" } },
  });

  disposeMesh(patch);

  const blob = new Blob([buffer], { type: "model/vnd.usdz+zip" });
  const url = URL.createObjectURL(blob);

  // Quick Look only intercepts the navigation when the link wraps an image.
  const link = document.createElement("a");
  link.rel = "ar";
  link.href = `${url}#allowsContentScaling=0&canonicalWebPageURL=${encodeURIComponent(window.location.href)}`;
  link.setAttribute("aria-label", title);
  link.appendChild(document.createElement("img"));
  document.body.appendChild(link);
  link.click();
  link.remove();

  // The viewer has fetched the model by the time it opens; a minute is generous.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function disposeMesh(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  const material = mesh.material as THREE.MeshStandardMaterial;
  material.map?.dispose();
  material.normalMap?.dispose();
  material.dispose();
}
