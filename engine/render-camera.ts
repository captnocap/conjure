import * as THREE from 'three';

// Camera.copy keeps projection matrices but does not copy its reversed-depth
// getter. Mirror that public state without changing Three's internal fields.
class RenderOrthographicCamera extends THREE.OrthographicCamera {
  sourceReversedDepth = false;
  override get reversedDepth(): boolean { return this.sourceReversedDepth || super.reversedDepth; }
}
class RenderPerspectiveCamera extends THREE.PerspectiveCamera {
  sourceReversedDepth = false;
  override get reversedDepth(): boolean { return this.sourceReversedDepth || super.reversedDepth; }
}

/**
 * Three retains a transmission target per camera ID in the render state of a
 * scene. Worlds create fresh cameras on every mount, so rendering those directly
 * leaks one target whenever a new frosted-glass scene is captured. Keep one real
 * rendering camera per lens type while the original camera remains owned by its
 * world (including its animation, portrait and temporary film transforms).
 */
export class RenderCameraPool {
  readonly #orthographic = new RenderOrthographicCamera();
  readonly #perspective = new RenderPerspectiveCamera();

  sync(source: THREE.Camera): THREE.Camera {
    // Parent matrices must be current before detaching the effective world view.
    source.updateWorldMatrix(true, false);
    let camera: RenderOrthographicCamera | RenderPerspectiveCamera;
    if ((source as THREE.OrthographicCamera).isOrthographicCamera) {
      camera = this.#orthographic;
      camera.copy(source as THREE.OrthographicCamera, false);
    } else if ((source as THREE.PerspectiveCamera).isPerspectiveCamera && !(source as THREE.ArrayCamera).isArrayCamera) {
      camera = this.#perspective;
      camera.copy(source as THREE.PerspectiveCamera, false);
    } else {
      // Preserve custom/array-camera semantics; the Conjure world contract and
      // capture pipeline currently use ordinary perspective/orthographic views.
      return source;
    }
    camera.sourceReversedDepth = source.reversedDepth;
    camera.viewport = source.viewport?.clone();
    // The rendering proxy has no parent. Its local matrix therefore IS the
    // original world matrix. This also survives CaptureRig.updateMatrixWorld().
    camera.matrix.copy(source.matrixWorld);
    camera.matrixWorld.copy(source.matrixWorld);
    camera.matrixWorldInverse.copy(source.matrixWorldInverse);
    source.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
    camera.matrixAutoUpdate = false;
    camera.matrixWorldAutoUpdate = false;
    camera.matrixWorldNeedsUpdate = false;
    return camera;
  }
}
