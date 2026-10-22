import * as THREE from 'three';
import type { Capture } from '@conjure/kit';

type Pass = 'normal' | 'depth' | 'diffuse';

/**
 * Renders one frame five ways: as seen, then with every surface swapped for a material
 * that writes its normal, depth, lighting or identity. Looks draw from these instead of
 * from the scene, so a look works on anything a component can build.
 */
export class CaptureRig {
  #target: THREE.WebGLRenderTarget;
  #reader: CanvasRenderingContext2D;
  #depthRange = { near: { value: 0.1 }, far: { value: 100 } };
  #passMaterials = new Map<string, THREE.Material>();
  #identityMaterials = new Map<string, THREE.Material>();

  constructor(
    readonly renderer: THREE.WebGLRenderer,
    readonly size: number,
  ) {
    this.#target = new THREE.WebGLRenderTarget(size, size, { depthBuffer: true, stencilBuffer: false });
    this.#target.texture.colorSpace = THREE.NoColorSpace;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    this.#reader = canvas.getContext('2d', { willReadFrequently: true })!;
  }

  /** `identify` names the surface a mesh belongs to: 1 for ground, 2 and up for things, 0 to leave it out. */
  capture(
    scene: THREE.Scene,
    camera: THREE.Camera,
    identify: (mesh: THREE.Mesh) => number,
    keyLight: THREE.DirectionalLight | null,
  ): Capture {
    const { renderer, size } = this;
    const lens = camera as THREE.OrthographicCamera | THREE.PerspectiveCamera;
    camera.updateMatrixWorld();
    this.#depthRange.near.value = lens.near;
    this.#depthRange.far.value = lens.far;

    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    this.#reader.drawImage(renderer.domElement, 0, 0, size, size);
    const color = this.#reader.getImageData(0, 0, size, size).data;

    // Auxiliary passes describe solid surfaces only: glows, sprites and lines have no surface to describe.
    const solids: { mesh: THREE.Mesh; id: number; material: THREE.Material | THREE.Material[] }[] = [];
    const hidden: THREE.Object3D[] = [];
    scene.traverseVisible((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh && !(node as THREE.Line).isLine && !(node as THREE.Points).isPoints && !(node as THREE.Sprite).isSprite) return;
      const material = [mesh.material].flat()[0] as THREE.Material | undefined;
      const id = mesh.isMesh ? identify(mesh) : 0;
      const solid =
        mesh.isMesh && id > 0 && material && node.layers.test(SOLID_LAYERS) && material.depthWrite && material.opacity > 0.2;
      if (solid) solids.push({ mesh, id, material: mesh.material });
      else hidden.push(node);
    });

    const background = scene.background;
    const layers = camera.layers.mask;
    const read = (assign: (mesh: THREE.Mesh, id: number, original: THREE.Material) => THREE.Material, clear: THREE.Color) => {
      for (const { mesh, id, material } of solids) mesh.material = assign(mesh, id, [material].flat()[0]);
      scene.background = clear;
      renderer.render(scene, camera);
      const bottomUp = new Uint8Array(size * size * 4);
      renderer.readRenderTargetPixels(this.#target, 0, 0, size, size, bottomUp);
      const topDown = new Uint8Array(bottomUp.length);
      for (let row = 0; row < size; row++)
        topDown.set(bottomUp.subarray((size - 1 - row) * size * 4, (size - row) * size * 4), row * size * 4);
      return topDown;
    };

    let normal: Uint8Array, depth: Uint8Array, identity: Uint8Array, diffuse: Uint8Array;
    try {
      for (const node of hidden) node.visible = false;
      camera.layers.set(0);
      renderer.setRenderTarget(this.#target);
      normal = read((mesh, _id, original) => this.#passMaterial('normal', original, mesh), FACING_VIEWER);
      depth = read((_mesh, _id, original) => this.#passMaterial('depth', original), BLACK);
      identity = read((_mesh, id, original) => this.#identityMaterial(id, original), BLACK);
      diffuse = read((_mesh, _id, original) => this.#passMaterial('diffuse', original), BLACK);
    } finally {
      for (const { mesh, material } of solids) mesh.material = material;
      for (const node of hidden) node.visible = true;
      scene.background = background;
      camera.layers.mask = layers;
      renderer.setRenderTarget(null);
    }

    const sums = new Map<number, [number, number, number, number]>();
    for (let pixel = 0; pixel < size * size; pixel++) {
      const id = identity[pixel * 4];
      let sum = sums.get(id);
      if (!sum) sums.set(id, (sum = [0, 0, 0, 0]));
      sum[0] += color[pixel * 4];
      sum[1] += color[pixel * 4 + 1];
      sum[2] += color[pixel * 4 + 2];
      sum[3]++;
    }
    const baseColors: Capture['baseColors'] = [];
    for (let id = 0; id <= Math.max(...sums.keys()); id++) {
      const sum = sums.get(id);
      baseColors.push(sum && id > 0 ? [Math.round(sum[0] / sum[3]), Math.round(sum[1] / sum[3]), Math.round(sum[2] / sum[3])] : null);
    }

    const toLight = keyLight
      ? keyLight.getWorldPosition(new THREE.Vector3()).sub(keyLight.target.getWorldPosition(new THREE.Vector3())).normalize().transformDirection(camera.matrixWorldInverse)
      : new THREE.Vector3(-0.45, 0.5, 0.74);
    const orthographic = (camera as THREE.OrthographicCamera).isOrthographicCamera ? (camera as THREE.OrthographicCamera) : null;

    return {
      size,
      color,
      normal: new Uint8ClampedArray(normal.buffer),
      depth,
      identity,
      diffuse,
      near: lens.near,
      far: lens.far,
      pixelWorldSize: orthographic
        ? (orthographic.right - orthographic.left) / orthographic.zoom / size
        : (2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) / 2) * camera.position.length()) / size,
      light: [toLight.x, -toLight.y, toLight.z],
      baseColors,
    };
  }

  dispose() {
    this.#target.dispose();
    for (const material of [...this.#passMaterials.values(), ...this.#identityMaterials.values()]) material.dispose();
  }

  /** Cut-out surfaces (leaves, mesh, lace) keep their silhouette in every pass. */
  #cutout(original: THREE.Material) {
    const source = original as THREE.MeshStandardMaterial;
    const cut = source.alphaTest > 0 || source.alphaHash;
    return {
      side: original.side,
      map: cut ? source.map : null,
      alphaMap: cut ? source.alphaMap : null,
      alphaTest: cut ? Math.max(source.alphaTest, 0.5) : 0,
      key: `${original.side}:${cut ? `${source.map?.id ?? 0}:${source.alphaMap?.id ?? 0}` : 'solid'}`,
    };
  }

  #passMaterial(pass: Pass, original: THREE.Material, mesh?: THREE.Mesh): THREE.Material {
    const { key, ...surface } = this.#cutout(original);
    // Skinned and morphing meshes keep the stock normal material, which deforms them correctly.
    const deforms = !!mesh && ((mesh as THREE.SkinnedMesh).isSkinnedMesh || !!mesh.morphTargetInfluences?.length);
    const cutNormal = pass === 'normal' && !!surface.map && surface.alphaTest > 0 && !deforms;
    const cacheKey = `${pass}:${key}${cutNormal ? ':cut' : ''}`;
    let material = this.#passMaterials.get(cacheKey);
    if (material) return material;
    if (cutNormal) {
      // MeshNormalMaterial has no map slot; a cut-out (a leaf, lace, a traced picture) keeps its outline here too.
      material = cutoutNormalMaterial(surface.map!, surface.alphaTest, surface.side);
    } else if (pass === 'normal') {
      material = new THREE.MeshNormalMaterial({ side: surface.side });
    } else if (pass === 'diffuse') {
      material = alphaOnly(new THREE.MeshLambertMaterial({ ...surface, color: new THREE.Color(0.18, 0.18, 0.18), toneMapped: false }));
    } else {
      const depth = new THREE.MeshDepthMaterial({ ...surface, depthPacking: THREE.RGBADepthPacking });
      // The stock material writes clip-space depth, which is not linear under perspective.
      depth.onBeforeCompile = (shader) => {
        shader.uniforms.captureNear = this.#depthRange.near;
        shader.uniforms.captureFar = this.#depthRange.far;
        shader.vertexShader = shader.vertexShader
          .replace('varying vec2 vHighPrecisionZW;', 'varying vec2 vHighPrecisionZW;\nvarying float vCaptureDepth;')
          .replace('#include <project_vertex>', '#include <project_vertex>\n\tvCaptureDepth = -mvPosition.z;');
        shader.fragmentShader = shader.fragmentShader
          .replace('varying vec2 vHighPrecisionZW;', 'varying vec2 vHighPrecisionZW;\nvarying float vCaptureDepth;\nuniform float captureNear;\nuniform float captureFar;')
          .replace('#if DEPTH_PACKING == 3200\n\t\tgl_FragColor', 'fragCoordZ = clamp( ( vCaptureDepth - captureNear ) / ( captureFar - captureNear ), 0.0, 1.0 );\n\t#if DEPTH_PACKING == 3200\n\t\tgl_FragColor');
      };
      depth.customProgramCacheKey = () => 'conjure-linear-depth';
      material = depth;
    }
    this.#passMaterials.set(cacheKey, material);
    return material;
  }

  #identityMaterial(id: number, original: THREE.Material): THREE.Material {
    const { key, ...surface } = this.#cutout(original);
    const cacheKey = `${id}:${key}`;
    let material = this.#identityMaterials.get(cacheKey);
    if (!material) {
      material = alphaOnly(new THREE.MeshBasicMaterial({ ...surface, color: new THREE.Color(Math.min(id, 255) / 255, 0, 0), toneMapped: false }));
      this.#identityMaterials.set(cacheKey, material);
    }
    return material;
  }
}

/** View-space normals packed like MeshNormalMaterial, discarding where the map's alpha falls below the cut. */
function cutoutNormalMaterial(map: THREE.Texture, alphaTest: number, side: THREE.Side): THREE.Material {
  map.updateMatrix();
  return new THREE.ShaderMaterial({
    side,
    uniforms: { map: { value: map }, mapTransform: { value: map.matrix.clone() }, cut: { value: alphaTest } },
    vertexShader: `
      uniform mat3 mapTransform;
      varying vec3 vNormalView;
      varying vec2 vMapUv;
      void main() {
        vec4 local = vec4(position, 1.0);
        vec3 bent = normal;
        #ifdef USE_INSTANCING
          local = instanceMatrix * local;
          bent = mat3(instanceMatrix) * bent;
        #endif
        vMapUv = (mapTransform * vec3(uv, 1.0)).xy;
        vNormalView = normalize(normalMatrix * bent);
        gl_Position = projectionMatrix * modelViewMatrix * local;
      }`,
    fragmentShader: `
      uniform sampler2D map;
      uniform float cut;
      varying vec3 vNormalView;
      varying vec2 vMapUv;
      void main() {
        if (texture2D(map, vMapUv).a < cut) discard;
        vec3 n = normalize(vNormalView);
        if (!gl_FrontFacing) n = -n;
        gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
      }`,
  });
}

/** Let a colour map cut the silhouette without tinting what the pass writes. */
function alphaOnly<M extends THREE.Material>(material: M): M {
  if (!(material as unknown as THREE.MeshBasicMaterial).map) return material;
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      'diffuseColor.a *= texture2D( map, vMapUv ).a;',
    );
  };
  material.customProgramCacheKey = () => 'conjure-alpha-only';
  return material;
}

const SOLID_LAYERS = new THREE.Layers();
const BLACK = new THREE.Color(0, 0, 0);
const FACING_VIEWER = new THREE.Color(0.5, 0.5, 1);
