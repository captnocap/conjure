import * as THREE from 'three';
import type { Capture } from '@conjure/kit';
import { materialByte } from '@conjure/kit';
import { captureAtelier, isCaptureSurface } from './atelier-capture';

type Pass = 'normal' | 'depth' | 'diffuse';

/**
 * Renders one frame eight ways: as seen, then with every surface swapped for a material that
 * writes its normal, depth, lighting, identity or what it is made of. Looks draw from these
 * instead of from the scene, so a look works on anything a component can build.
 */
export class CaptureRig {
  #target: THREE.WebGLRenderTarget;
  #reader: CanvasRenderingContext2D;
  #depthRange = { near: { value: 0.1 }, far: { value: 100 } };
  #passMaterials = new Map<string, THREE.Material>();
  #identityMaterials = new Map<string, THREE.Material>();
  #excludedMaterial = new THREE.MeshBasicMaterial({ visible: false });
  #atelierPasses = new Map<THREE.Material, { key: string; albedo: THREE.Material; transmission: THREE.Material; ownedAlbedo: boolean }>();

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
      const id = mesh.isMesh ? identify(mesh) : 0;
      const solid =
        mesh.isMesh && id > 0 && node.layers.test(SOLID_LAYERS) && [mesh.material].flat().some(isCaptureSurface);
      if (solid) solids.push({ mesh, id, material: mesh.material });
      else hidden.push(node);
    });

    const background = scene.background;
    const layers = camera.layers.mask;
    // Keep only the current scene's pigment/property materials. Companions supplied
    // by an Atelier material library belong to that library, never this rig.
    const currentMaterials = new Set(solids.flatMap(({ material }) => [material].flat().filter(isCaptureSurface)));
    const profiles = captureMaterialProfiles(currentMaterials);
    for (const [source, passes] of this.#atelierPasses) if (!currentMaterials.has(source)) {
      if (passes.ownedAlbedo) passes.albedo.dispose();
      passes.transmission.dispose(); this.#atelierPasses.delete(source);
    }
    const read = (assign: (mesh: THREE.Mesh, id: number, original: THREE.Material) => THREE.Material, clear: THREE.Color) => {
      for (const { mesh, id, material } of solids) {
        const slot = (original: THREE.Material) => isCaptureSurface(original) ? assign(mesh, id, original) : this.#excludedMaterial;
        mesh.material = Array.isArray(material) ? material.map(slot) : slot(material);
      }
      scene.background = clear;
      renderer.render(scene, camera);
      const bottomUp = new Uint8Array(size * size * 4);
      renderer.readRenderTargetPixels(this.#target, 0, 0, size, size, bottomUp);
      const topDown = new Uint8Array(bottomUp.length);
      for (let row = 0; row < size; row++)
        topDown.set(bottomUp.subarray((size - 1 - row) * size * 4, (size - row) * size * 4), row * size * 4);
      return topDown;
    };

    let normal: Uint8Array, depth: Uint8Array, identity: Uint8Array, diffuse: Uint8Array, material: Uint8Array,
      albedo: Uint8Array, transmission: Uint8Array;
    try {
      for (const node of hidden) node.visible = false;
      camera.layers.set(0);
      renderer.setRenderTarget(this.#target);
      normal = read((_mesh, _id, original) => this.#passMaterial('normal', original), FACING_VIEWER);
      depth = read((_mesh, _id, original) => this.#passMaterial('depth', original), BLACK);
      identity = read((_mesh, id, original) => this.#identityMaterial(id, original), BLACK);
      diffuse = read((_mesh, _id, original) => this.#passMaterial('diffuse', original), BLACK);
      // Each slot of a multi-material mesh keeps its own surface: a knife's blade is not its handle.
      material = read((_mesh, _id, original) => this.#surfaceMaterial(original), BLACK);
      albedo = read((_mesh, _id, original) => this.#atelierMaterial(original, 'albedo', profiles.tokens.get(original)!), BLACK);
      transmission = read((_mesh, _id, original) => this.#atelierMaterial(original, 'transmission', profiles.tokens.get(original)!), BLACK);
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
      // The backdrop is no surface: it reads as nothing rather than as the clear colour's alpha.
      if (id === 0) material[pixel * 4] = material[pixel * 4 + 1] = material[pixel * 4 + 2] = material[pixel * 4 + 3] = 0;
      if (id === 0) {
        albedo.fill(0, pixel * 4, pixel * 4 + 4);
        transmission.fill(0, pixel * 4, pixel * 4 + 4);
      }
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
    const atelier = captureAtelier(solids, scene, camera, size, keyLight);
    atelier.albedo = albedo;
    atelier.transmission = transmission;
    atelier.materialProfiles = profiles.profiles;

    return {
      size,
      color,
      normal: new Uint8ClampedArray(normal.buffer),
      depth,
      identity,
      diffuse,
      material,
      near: lens.near,
      far: lens.far,
      pixelWorldSize: orthographic
        ? (orthographic.right - orthographic.left) / orthographic.zoom / size
        : (2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) / 2) * camera.position.length()) / size,
      light: [toLight.x, -toLight.y, toLight.z],
      baseColors,
      atelier,
    };
  }

  dispose() {
    this.#target.dispose();
    this.#excludedMaterial.dispose();
    for (const material of [...this.#passMaterials.values(), ...this.#identityMaterials.values()]) material.dispose();
    for (const passes of this.#atelierPasses.values()) {
      if (passes.ownedAlbedo) passes.albedo.dispose();
      passes.transmission.dispose();
    }
    this.#atelierPasses.clear();
  }

  #atelierMaterial(original: THREE.Material, pass: 'albedo' | 'transmission', profile: number): THREE.Material {
    const source = original as THREE.MeshPhysicalMaterial;
    source.transmissionMap?.updateMatrix();
    const key = [source.version, source.color?.r, source.color?.g, source.color?.b, source.map?.id, source.alphaMap?.id,
      source.side, source.alphaTest, source.alphaHash, source.opacity, source.vertexColors, source.transmission,
      source.transmissionMap?.id, source.transmissionMap?.channel, source.userData.atelierTransmission, profile].join(':');
    let entry = this.#atelierPasses.get(original);
    if (entry && entry.key !== key) {
      if (entry.ownedAlbedo) entry.albedo.dispose();
      entry.transmission.dispose(); entry = undefined;
    }
    if (!entry) {
      const albedo = createAtelierAlbedoPass(original);
      entry = { key, albedo, transmission: createAtelierTransmissionPass(original, profile), ownedAlbedo: albedo !== original.userData.atelierAlbedoMaterial };
      this.#atelierPasses.set(original, entry);
    }
    return entry[pass];
  }

  /** Cut-out surfaces (leaves, mesh, lace) keep their silhouette in every pass. */
  #cutout(original: THREE.Material) {
    const source = original as THREE.MeshPhysicalMaterial;
    const cut = source.alphaTest > 0 || source.alphaHash;
    const surface = { ...atelierSurfaceOptions(source), map: cut ? source.map : null, alphaMap: cut ? source.alphaMap : null };
    return {
      ...surface,
      key: [source.side, surface.map?.id, surface.map?.channel, surface.alphaMap?.id, surface.alphaMap?.channel,
        source.alphaTest, source.alphaHash, source.opacity, source.vertexColors, source.depthTest, source.depthFunc,
        source.polygonOffset, source.polygonOffsetFactor, source.polygonOffsetUnits, source.clipIntersection,
        source.clippingPlanes?.map(plane => [...plane.normal.toArray(), plane.constant].join(',')).join(';')].join(':'),
    };
  }

  #passMaterial(pass: Pass, original: THREE.Material): THREE.Material {
    const { key, ...surface } = this.#cutout(original);
    const cacheKey = `${pass}:${key}`;
    let material = this.#passMaterials.get(cacheKey);
    if (material) return material;
    if (pass === 'normal') {
      material = captureNormalMaterial(surface);
    } else if (pass === 'diffuse') {
      material = alphaOnly(new THREE.MeshLambertMaterial({ ...surface, color: new THREE.Color(0.18, 0.18, 0.18), toneMapped: false }));
    } else {
      const depth = Object.assign(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), surface);
      // The stock material writes clip-space depth, which is not linear under perspective.
      depth.onBeforeCompile = (shader) => {
        shader.uniforms.captureNear = this.#depthRange.near;
        shader.uniforms.captureFar = this.#depthRange.far;
        shader.uniforms.captureOpacity = { value: surface.opacity };
        addVertexAlpha(shader);
        shader.vertexShader = shader.vertexShader
          .replace('varying vec2 vHighPrecisionZW;', 'varying vec2 vHighPrecisionZW;\nvarying float vCaptureDepth;')
          .replace('#include <project_vertex>', '#include <project_vertex>\n\tvCaptureDepth = -mvPosition.z;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float captureOpacity;')
          .replace('vec4 diffuseColor = vec4( 1.0 );', 'vec4 diffuseColor = vec4(1.0, 1.0, 1.0, captureOpacity);')
          .replace('#include <map_fragment>', `${VERTEX_ALPHA}\n#include <map_fragment>`)
          .replace('varying vec2 vHighPrecisionZW;', 'varying vec2 vHighPrecisionZW;\nvarying float vCaptureDepth;\nuniform float captureNear;\nuniform float captureFar;')
          .replace('#if DEPTH_PACKING == 3200\n\t\tgl_FragColor', 'fragCoordZ = clamp( ( vCaptureDepth - captureNear ) / ( captureFar - captureNear ), 0.0, 1.0 );\n\t#if DEPTH_PACKING == 3200\n\t\tgl_FragColor');
      };
      depth.customProgramCacheKey = () => 'conjure-linear-depth-v2';
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

  /** Writes what the original surface is made of, one shader per distinct surface and cut-out. */
  #surfaceMaterial(original: THREE.Material): THREE.Material {
    const { key, ...surface } = this.#cutout(original);
    const [metalness, roughness, named, glow] = surfaceBytes(original);
    const cacheKey = `material:${metalness}:${roughness}:${named}:${glow}:${key}`;
    let material = this.#passMaterials.get(cacheKey);
    if (!material) {
      material = surfacePassMaterial([metalness, roughness, named, glow], surface);
      this.#passMaterials.set(cacheKey, material);
    }
    return material;
  }
}

/** Stock vertex/map paths retain skinning, morphs, instances, UV channels and alpha cut-outs. */
function atelierSurfaceOptions(source: THREE.MeshPhysicalMaterial): THREE.MeshBasicMaterialParameters {
  return {
    side: source.side, map: source.map ?? null, alphaMap: source.alphaMap ?? null,
    alphaTest: source.alphaTest, alphaHash: source.alphaHash, opacity: source.opacity,
    vertexColors: source.vertexColors, transparent: false, blending: THREE.NoBlending,
    depthTest: source.depthTest, depthWrite: source.depthWrite, depthFunc: source.depthFunc,
    polygonOffset: source.polygonOffset, polygonOffsetFactor: source.polygonOffsetFactor, polygonOffsetUnits: source.polygonOffsetUnits,
    clippingPlanes: source.clippingPlanes, clipIntersection: source.clipIntersection, clipShadows: source.clipShadows,
    visible: source.visible, toneMapped: false, fog: false,
  };
}

/** Material barriers follow actual slots, independently of the mesh owner's identity.
 * Texture bindings use traversal ordinals, never random Three UUIDs, so rebuilding
 * the same scene preserves tokens without segmenting every painted texel.
 */
export function captureMaterialProfiles(materials: Iterable<THREE.Material>) {
  const tokens = new Map<THREE.Material, number>(), profiles = [''], keys = new Map<string, number>();
  const textures = new Map<THREE.Texture, number>();
  const customInstances = new Map<THREE.Material, number>();
  const binding = (texture: THREE.Texture | null | undefined) => {
    if (!texture) return null;
    if (!textures.has(texture)) textures.set(texture, textures.size + 1);
    return [textures.get(texture), texture.channel, ...texture.offset.toArray(), ...texture.repeat.toArray(),
      ...texture.center.toArray(), texture.rotation, texture.wrapS, texture.wrapT, texture.flipY, texture.colorSpace];
  };
  const maps = ['map', 'alphaMap', 'normalMap', 'bumpMap', 'displacementMap', 'emissiveMap', 'metalnessMap', 'roughnessMap',
    'transmissionMap', 'thicknessMap', 'clearcoatMap', 'clearcoatRoughnessMap', 'clearcoatNormalMap', 'iridescenceMap',
    'iridescenceThicknessMap', 'specularMap', 'specularColorMap', 'specularIntensityMap', 'sheenColorMap', 'sheenRoughnessMap'] as const;
  const scalars = ['metalness', 'roughness', 'transmission', 'thickness', 'ior', 'clearcoat', 'clearcoatRoughness',
    'iridescence', 'iridescenceIOR', 'sheen', 'sheenRoughness', 'specularIntensity', 'emissiveIntensity', 'shininess',
    'bumpScale', 'displacementScale', 'displacementBias', 'opacity', 'alphaTest', 'alphaHash', 'vertexColors', 'side', 'flatShading'] as const;
  const colors = ['color', 'emissive', 'specular', 'specularColor', 'attenuationColor', 'sheenColor'] as const;
  for (const original of materials) {
    const source = original as unknown as Record<string, unknown>;
    // Arbitrary shader uniforms may be cyclic, animated, or opaque resources.
    // Preserve distinct custom material instances without inspecting their data;
    // traversal ordinals remain stable when the same scene is reconstructed.
    if ((source.isShaderMaterial || source.isRawShaderMaterial) && !customInstances.has(original))
      customInstances.set(original, customInstances.size + 1);
    const profile = JSON.stringify({
      type: original.type, name: original.name, source: original.userData.atelierMaterial ?? null,
      customInstance: customInstances.get(original),
      named: original.userData.material ?? null, transmission: original.userData.atelierTransmission ?? null,
      colors: colors.map(name => (source[name] as THREE.Color | undefined)?.toArray() ?? null),
      values: scalars.map(name => source[name] ?? null),
      maps: maps.map(name => binding(source[name] as THREE.Texture | undefined)),
      normalScale: (source.normalScale as THREE.Vector2 | undefined)?.toArray(),
      clearcoatNormalScale: (source.clearcoatNormalScale as THREE.Vector2 | undefined)?.toArray(),
      iridescenceThicknessRange: source.iridescenceThicknessRange,
      attenuationDistance: source.attenuationDistance,
      // The renderer already uses this public method for custom shader identity.
      program: original.customProgramCacheKey(), defines: source.defines,
      vertex: source.vertexShader, fragment: source.fragmentShader,
    });
    let token = keys.get(profile);
    if (token === undefined) {
      token = profiles.length;
      if (token > 65535) throw new Error('Capture exceeds the 65,535 material-profile limit');
      keys.set(profile, token); profiles.push(profile);
    }
    tokens.set(original, token);
  }
  return { tokens, profiles };
}

/** True linear base pigment, independent of scene light and material reflections. */
export function createAtelierAlbedoPass(original: THREE.Material): THREE.Material {
  const companion = original.userData.atelierAlbedoMaterial as THREE.Material | undefined;
  if (companion?.isMaterial) return companion;
  const source = original as THREE.MeshPhysicalMaterial;
  const material = new THREE.MeshBasicMaterial({ ...atelierSurfaceOptions(source), color: source.color?.clone() ?? new THREE.Color(1, 1, 1) });
  material.name = 'Conjure linear albedo capture';
  // The render target is unencoded; make the pigment convention explicit even
  // if renderer output color-space policy changes in a later Three release.
  material.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <colorspace_fragment>', ''); };
  material.customProgramCacheKey = () => 'conjure-linear-albedo-v1';
  return material;
}

/** The physical transmission factor, including its native red-channel texture. */
export function createAtelierTransmissionPass(original: THREE.Material, profile = 0): THREE.Material {
  const source = original as THREE.MeshPhysicalMaterial;
  const material = new THREE.MeshBasicMaterial({ ...atelierSurfaceOptions(source), color: 0xffffff });
  const map = source.transmissionMap;
  const factor = Math.max(0, Math.min(1, source.userData.atelierTransmission ?? source.transmission ?? 0));
  if (map) {
    map.updateMatrix();
    const channel = map.channel || 0;
    material.defines = { USE_TRANSMISSIONMAP: '', TRANSMISSIONMAP_UV: channel ? `uv${channel}` : 'uv',
      ...(channel ? { [`USE_UV${channel}`]: '' } : {}) };
  }
  material.name = 'Conjure transmission capture';
  material.onBeforeCompile = shader => {
    shader.uniforms.captureTransmission = { value: factor };
    shader.uniforms.captureProfile = { value: new THREE.Vector2((profile >>> 8) / 255, (profile & 255) / 255) };
    if (map) {
      shader.uniforms.captureTransmissionMap = { value: map };
      shader.uniforms.transmissionMapTransform = { value: map.matrix };
    }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float captureTransmission;\nuniform vec2 captureProfile;\n${map ? 'uniform sampler2D captureTransmissionMap;' : ''}`)
      .replace('#include <map_fragment>', source.map ? 'diffuseColor.a *= texture2D( map, vMapUv ).a;' : '')
      .replace('#include <color_fragment>', '#ifdef USE_COLOR_ALPHA\n diffuseColor.a *= vColor.a;\n#endif')
      .replace('#include <opaque_fragment>', `float coefficient = captureTransmission${map ? ' * texture2D(captureTransmissionMap, vTransmissionMapUv).r' : ''};\ngl_FragColor = vec4(coefficient, captureProfile, 1.0);`)
      .replace('#include <colorspace_fragment>', '');
  };
  material.customProgramCacheKey = () => `conjure-transmission-v2:${map?.channel ?? 'none'}:${!!source.map}`;
  return material;
}

/**
 * A material's surface as four bytes: metalness, roughness, the named material and glow. Physically
 * based materials say so themselves; a Phong material is read through its shininess and specular;
 * flat, toon and unlit materials are plain diffuse surfaces. Quantised, so the pass needs few shaders.
 */
export function surfaceBytes(original: THREE.Material): [number, number, number, number] {
  const source = original as THREE.MeshPhysicalMaterial & { shininess?: number; specular?: THREE.Color };
  let metalness = 0, roughness = 1;
  if ((source as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
    metalness = source.metalness;
    roughness = source.roughness;
    // A lacquered coat shines whatever lies beneath it.
    if ((source as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial && source.clearcoat > 0.5) roughness = Math.min(roughness, 0.1 + source.clearcoatRoughness * 0.5);
  } else if (typeof source.shininess === 'number') {
    roughness = 1 - Math.min(1, Math.sqrt(Math.max(0, source.shininess) / 400));
    const specular = source.specular ? Math.max(source.specular.r, source.specular.g, source.specular.b) : 0;
    metalness = Math.min(1, Math.max(0, (specular - 0.1) * 2));
  }
  const emissive = (source as THREE.MeshStandardMaterial).emissive;
  const glow = emissive ? Math.min(1, Math.max(emissive.r, emissive.g, emissive.b) * ((source as THREE.MeshStandardMaterial).emissiveIntensity ?? 1)) : 0;
  const quantise = (value: number, steps: number) => Math.round(Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)) * steps) * (255 / steps);
  return [Math.round(quantise(metalness, 32)), Math.round(quantise(roughness, 32)), materialByte(original.userData?.material as string | undefined), Math.round(quantise(glow, 16))];
}

/** Writes one constant surface for every fragment, through the same cut-out, skinning and instancing as the scene. */
function surfacePassMaterial(bytes: [number, number, number, number], surface: THREE.MeshBasicMaterialParameters): THREE.Material {
  const material = new THREE.MeshBasicMaterial({ ...surface, color: 0xffffff });
  material.onBeforeCompile = shader => {
    shader.uniforms.captureSurface = { value: new THREE.Vector4(...bytes.map(value => value / 255) as [number, number, number, number]) };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec4 captureSurface;')
      .replace('#include <opaque_fragment>', 'gl_FragColor = captureSurface;')
      .replace('#include <colorspace_fragment>', '');
  };
  material.customProgramCacheKey = () => 'conjure-surface-bytes-v2';
  return material;
}

const VERTEX_ALPHA = '#ifdef USE_COLOR_ALPHA\n diffuseColor.a *= vColor.a;\n#endif';

/** Native normal/depth shaders omit vertex alpha; retain its native deformation path as well. */
function addVertexAlpha(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <uv_pars_vertex>', '#include <uv_pars_vertex>\n#include <color_pars_vertex>')
    .replace('#include <uv_vertex>', '#include <uv_vertex>\n#include <color_vertex>')
    .replace('#include <morphinstance_vertex>', '#include <morphinstance_vertex>\n#include <morphcolor_vertex>');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <uv_pars_fragment>', '#include <uv_pars_fragment>\n#include <color_pars_fragment>');
}

/** Stock normal transforms retain skinning, morphs, instances and every slot's alpha silhouette. */
function captureNormalMaterial(surface: THREE.MeshBasicMaterialParameters): THREE.Material {
  // Three supports map uniforms/UV defines on MeshNormalMaterial, but its
  // default fragment does not sample alpha. Install only those missing chunks.
  const material = Object.assign(new THREE.MeshNormalMaterial(), surface);
  material.onBeforeCompile = shader => {
    addVertexAlpha(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <uv_pars_fragment>', '#include <common>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>')
      .replace('#include <logdepthbuf_fragment>', `#include <logdepthbuf_fragment>\n${VERTEX_ALPHA}\n#ifdef USE_MAP\n diffuseColor.a *= texture2D(map, vMapUv).a;\n#endif\n#include <alphamap_fragment>\n#include <alphatest_fragment>\n#include <alphahash_fragment>`);
  };
  material.customProgramCacheKey = () => 'conjure-normal-alpha-v2';
  return material;
}

/** Let a colour map cut the silhouette without tinting what the pass writes. */
function alphaOnly<M extends THREE.Material>(material: M): M {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_fragment>', '#ifdef USE_MAP\n diffuseColor.a *= texture2D( map, vMapUv ).a;\n#endif')
      .replace('#include <color_fragment>', VERTEX_ALPHA);
  };
  material.customProgramCacheKey = () => 'conjure-alpha-only-v2';
  return material;
}

const SOLID_LAYERS = new THREE.Layers();
const BLACK = new THREE.Color(0, 0, 0);
const FACING_VIEWER = new THREE.Color(0.5, 0.5, 1);
