import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { CaptureRig, captureMaterialProfiles, createAtelierAlbedoPass, createAtelierTransmissionPass } from '../engine/capture';

test('linear pigment pass retains material maps, vertex color and alpha settings without owning source textures', () => {
  const map = new THREE.DataTexture(new Uint8Array([128, 32, 240, 128]), 1, 1); map.colorSpace = THREE.SRGBColorSpace;
  const alpha = new THREE.DataTexture(new Uint8Array([0, 200, 0, 255]), 1, 1);
  const source = new THREE.MeshPhysicalMaterial({ color: '#a86c32', map, alphaMap: alpha, alphaTest: .23, vertexColors: true, side: THREE.DoubleSide });
  const pass = createAtelierAlbedoPass(source) as THREE.MeshBasicMaterial;
  assert.equal(pass.map, map); assert.equal(pass.alphaMap, alpha); assert.equal(pass.alphaTest, .23);
  assert.equal(pass.vertexColors, true); assert.equal(pass.side, THREE.DoubleSide); assert.ok(pass.color.equals(source.color));
  assert.equal(pass.fog, false); assert.equal(pass.toneMapped, false);
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader };
  pass.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
  assert.ok(!shader.fragmentShader.includes('#include <colorspace_fragment>'));
  let disposed = 0; map.addEventListener('dispose', () => disposed++); alpha.addEventListener('dispose', () => disposed++);
  pass.dispose(); assert.equal(disposed, 0);
});

test('source procedural pigment companion is used directly and transmission keeps native red-map UVs', () => {
  const source = new THREE.MeshPhysicalMaterial({ transmission: .7, alphaTest: .2 });
  const pigment = new THREE.MeshBasicMaterial({ color: '#1f5a90' });
  Object.defineProperty(source.userData, 'atelierAlbedoMaterial', { value: pigment });
  assert.equal(createAtelierAlbedoPass(source), pigment);
  const map = new THREE.DataTexture(new Uint8Array([64, 0, 0, 255]), 1, 1); map.channel = 1;
  map.repeat.set(2, 3); source.transmissionMap = map;
  const pass = createAtelierTransmissionPass(source) as THREE.MeshBasicMaterial;
  const shader = { uniforms: {} as Record<string, { value: unknown }>, vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader };
  pass.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
  assert.equal(shader.uniforms.captureTransmission.value, .7); assert.equal(shader.uniforms.captureTransmissionMap.value, map);
  assert.equal(shader.uniforms.transmissionMapTransform.value, map.matrix);
  assert.equal(pass.defines!.TRANSMISSIONMAP_UV, 'uv1'); assert.ok('USE_UV1' in pass.defines!);
  assert.ok(shader.fragmentShader.includes('texture2D(captureTransmissionMap, vTransmissionMapUv).r'));
  assert.ok(shader.fragmentShader.includes('#include <alphatest_fragment>'));
  assert.ok(shader.vertexShader.includes('#include <skinning_vertex>'));
});

function fixture(failAt = 0) {
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10);
  camera.position.z = 3; camera.layers.set(2); camera.updateMatrixWorld();
  const materials = [new THREE.MeshPhysicalMaterial({ color: '#ff0000', transmission: 0 }), new THREE.MeshPhysicalMaterial({ color: '#00ff00', transmission: .6 })];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), materials); scene.add(mesh);
  const line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial()); scene.add(line);
  scene.background = new THREE.Color('#443322'); scene.updateMatrixWorld();
  const color = Uint8ClampedArray.from([42, 84, 126, 255]);
  let renders = 0, target: unknown = null;
  const auxiliary: THREE.Material[][] = [];
  const passes: THREE.Material[][] = [];
  const renderer = {
    domElement: {}, setRenderTarget(value: unknown) { target = value; },
    render() {
      renders++;
      if ((renders - 1) % 8 + 1 >= 2) passes.push([mesh.material].flat());
      if ((renders - 1) % 8 + 1 >= 7) auxiliary.push([mesh.material].flat());
      if (renders === failAt) throw Error('injected auxiliary failure');
    },
    readRenderTargetPixels(_target: unknown, _x: number, _y: number, _w: number, _h: number, out: Uint8Array) {
      const pass = (renders - 1) % 8 + 1;
      out.set(pass === 4 ? [3, 0, 0, 255] : pass === 7 ? [64, 128, 192, 255] : pass === 8 ? [153, 0, 0, 255] : [0, 0, 0, 255]);
    },
  };
  const originalDocument = globalThis.document;
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement() { return { width: 0, height: 0, getContext() { return { drawImage() {}, getImageData() { return { data: color.slice() }; } }; } }; },
  } });
  const rig = new CaptureRig(renderer as unknown as THREE.WebGLRenderer, 1);
  return { scene, camera, materials, mesh, line, rig, auxiliary, passes, get target() { return target; },
    restore() { Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument }); } };
}

test('both new auxiliary passes capture immutable pixel evidence and restore the live scene', () => {
  const f = fixture(); const background = f.scene.background, layers = f.camera.layers.mask;
  try {
    const capture = f.rig.capture(f.scene, f.camera, () => 3, null);
    assert.deepEqual(Array.from(capture.atelier!.albedo!), [64, 128, 192, 255]);
    assert.deepEqual(Array.from(capture.atelier!.transmission!), [153, 0, 0, 255]);
    assert.deepEqual(Array.from(capture.color), [42, 84, 126, 255]);
    assert.equal(f.mesh.material, f.materials); assert.equal(f.line.visible, true);
    assert.equal(f.scene.background, background); assert.equal(f.camera.layers.mask, layers); assert.equal(f.target, null);
  } finally { f.rig.dispose(); f.restore(); }
});

test('failure during the transmission pass restores every material, visibility, background and camera layer', () => {
  const f = fixture(8); const background = f.scene.background, layers = f.camera.layers.mask;
  try {
    assert.throws(() => f.rig.capture(f.scene, f.camera, () => 3, null), /injected auxiliary failure/);
    assert.equal(f.mesh.material, f.materials); assert.equal(f.line.visible, true);
    assert.equal(f.scene.background, background); assert.equal(f.camera.layers.mask, layers); assert.equal(f.target, null);
  } finally { f.rig.dispose(); f.restore(); }
});

test('auxiliary resources are reused for repeats and released on world switches without disposing library pigment', () => {
  const f = fixture(), companion = new THREE.MeshBasicMaterial();
  Object.defineProperty(f.materials[0].userData, 'atelierAlbedoMaterial', { value: companion });
  let sourceDisposed = 0; companion.addEventListener('dispose', () => sourceDisposed++);
  try {
    f.rig.capture(f.scene, f.camera, () => 3, null);
    const first = f.auxiliary.slice(0, 2);
    let generatedDisposed = 0;
    for (const material of first.flat()) if (material !== companion) material.addEventListener('dispose', () => generatedDisposed++);
    f.rig.capture(f.scene, f.camera, () => 3, null);
    assert.equal(f.auxiliary[2][0], first[0][0]); assert.equal(f.auxiliary[3][1], first[1][1]);
    assert.equal(generatedDisposed, 0);
    f.mesh.material = [new THREE.MeshPhysicalMaterial({ color: '#345678' })];
    f.rig.capture(f.scene, f.camera, () => 3, null);
    assert.equal(generatedDisposed, 3); assert.equal(sourceDisposed, 0);
  } finally { f.rig.dispose(); f.restore(); }
  assert.equal(sourceDisposed, 0);
});

test('all auxiliary passes preserve each eligible material slot and exclude non-solid slots even when the first slot is a glow', () => {
  const f = fixture();
  const map = new THREE.DataTexture(new Uint8Array([255, 255, 255, 100]), 1, 1);
  const alphaMap = new THREE.DataTexture(new Uint8Array([255, 180, 255, 255]), 1, 1); alphaMap.channel = 1;
  const glow = new THREE.MeshBasicMaterial({ depthWrite: false });
  const opaque = new THREE.MeshPhysicalMaterial({ side: THREE.BackSide });
  const cutout = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, map, alphaMap, alphaTest: .23, opacity: .8, vertexColors: true });
  opaque.userData.atelierCastShadow = false;
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const faint = new THREE.MeshBasicMaterial({ opacity: .15, transparent: true });
  const slots = [glow, opaque, cutout, hidden, faint, glow];
  f.mesh.material = slots as THREE.MeshPhysicalMaterial[]; f.mesh.castShadow = true;
  try {
    const capture = f.rig.capture(f.scene, f.camera, () => 3, null);
    assert.equal(f.passes.length, 7);
    for (const pass of f.passes) {
      assert.equal(pass.length, slots.length);
      for (const slot of [0, 3, 4, 5]) assert.equal(pass[slot].visible, false);
      assert.equal(pass[1].side, THREE.BackSide);
      assert.equal(pass[2].side, THREE.DoubleSide);
      const masked = pass[2] as THREE.MeshBasicMaterial;
      assert.equal(masked.map, map); assert.equal(masked.alphaMap, alphaMap);
      assert.equal(masked.alphaTest, .23); assert.equal(masked.opacity, .8); assert.equal(masked.vertexColors, true);
    }
    // Exercise the real shader hooks rather than only testing copied material fields.
    for (let at = 0; at < f.passes.length; at++) {
      const material = f.passes[at][2];
      const source = at === 0 ? THREE.ShaderLib.normal : at === 1 ? THREE.ShaderLib.depth : at === 3 ? THREE.ShaderLib.lambert : THREE.ShaderLib.basic;
      const shader = { uniforms: THREE.UniformsUtils.clone(source.uniforms), vertexShader: source.vertexShader, fragmentShader: source.fragmentShader };
      material.onBeforeCompile(shader as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
      assert.ok(shader.vertexShader.includes('#include <skinning_vertex>'));
      assert.ok(shader.vertexShader.includes('#include <morphtarget_vertex>'));
      assert.ok(shader.fragmentShader.includes('#include <alphamap_fragment>'));
      assert.ok(shader.fragmentShader.includes('#include <alphatest_fragment>'));
      assert.ok(shader.fragmentShader.includes('vColor.a') || shader.fragmentShader.includes('#include <color_fragment>'));
      if (at === 1) assert.equal(shader.uniforms.captureOpacity.value, .8);
    }
    assert.equal(capture.atelier!.geometry.meshes.length, 2);
    assert.deepEqual(capture.atelier!.geometry.meshes.map(part => part.side), [THREE.BackSide, THREE.DoubleSide]);
    assert.deepEqual(capture.atelier!.geometry.meshes.map(part => part.castShadow), [false, true]);
    assert.equal(f.mesh.material, slots); assert.equal(f.mesh.visible, true);
  } finally { f.rig.dispose(); f.restore(); }
});

test('material-profile tokens distinguish pigments and source shaders while sharing equivalent slots across deterministic rebuilds', () => {
  const build = () => {
    const red = new THREE.MeshPhysicalMaterial({ color: '#b03624', roughness: .4 });
    const same = red.clone(), green = new THREE.MeshPhysicalMaterial({ color: '#27a04d', roughness: .4 });
    const source = red.clone(); source.userData.atelierMaterial = 'polished-copper';
    const shader = red.clone(); shader.customProgramCacheKey = () => 'custom-copper-interference-v1';
    const firstTexture = new THREE.DataTexture(new Uint8Array([200, 20, 20, 255]), 1, 1);
    const secondTexture = firstTexture.clone(); secondTexture.channel = 1;
    const painted = red.clone(); painted.map = firstTexture;
    const samePaint = painted.clone(), otherPaint = red.clone(); otherPaint.map = secondTexture;
    return [red, same, green, source, shader, painted, samePaint, otherPaint];
  };
  const materials = build(), first = captureMaterialProfiles(materials), rebuiltMaterials = build(), rebuilt = captureMaterialProfiles(rebuiltMaterials);
  const ids = materials.map(material => first.tokens.get(material));
  assert.deepEqual(ids, [1, 1, 2, 3, 4, 5, 5, 6]);
  assert.deepEqual(rebuilt.profiles, first.profiles);
  assert.deepEqual(rebuiltMaterials.map(material => rebuilt.tokens.get(material)), ids);
  assert.equal(first.profiles[0], '');
  materials[0].color.set('#3143a5');
  assert.notEqual(captureMaterialProfiles(materials).profiles[1], first.profiles[1]);
});

test('transmission pass encodes both material-profile bytes independently from its physical coefficient', () => {
  const materials = Array.from({ length: 300 }, (_, value) => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(value / 511, .3, .4), transmission: .65 }));
  const profiles = captureMaterialProfiles(materials), token = profiles.tokens.get(materials[299])!;
  assert.equal(token, 300);
  const pass = createAtelierTransmissionPass(materials[299], token);
  const shader = { uniforms: {} as Record<string, { value: unknown }>, vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader };
  pass.onBeforeCompile(shader as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
  assert.equal(shader.uniforms.captureTransmission.value, .65);
  assert.deepEqual((shader.uniforms.captureProfile.value as THREE.Vector2).toArray(), [1 / 255, 44 / 255]);
  assert.ok(shader.fragmentShader.includes('gl_FragColor = vec4(coefficient, captureProfile, 1.0)'));
  pass.dispose(); for (const material of materials) material.dispose();
});

test('custom shader instances retain distinct barriers without inspecting uniforms, and reuse stable traversal tokens', () => {
  const build = () => {
    const shader = (raw: boolean, color: string) => new (raw ? THREE.RawShaderMaterial : THREE.ShaderMaterial)({
      vertexShader: 'void main() { gl_Position = vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, 1.0); }',
      uniforms: { uColor: { value: new THREE.Color(color) } },
    });
    const red = shader(false, '#ff0000'), blue = shader(false, '#0000ff');
    const rawRed = shader(true, '#ff0000'), rawBlue = shader(true, '#0000ff');
    const native = new THREE.MeshPhysicalMaterial({ color: '#a86c32', roughness: .4 });
    return [red, blue, red, rawRed, rawBlue, rawRed, native, native.clone()];
  };
  const original = build(), rebuilt = build();
  try {
    const first = captureMaterialProfiles(original), second = captureMaterialProfiles(rebuilt);
    assert.deepEqual(original.map(material => first.tokens.get(material)), [1, 2, 1, 3, 4, 3, 5, 5]);
    assert.deepEqual(rebuilt.map(material => second.tokens.get(material)), [1, 2, 1, 3, 4, 3, 5, 5]);
    assert.deepEqual(second.profiles, first.profiles);
    assert.ok(!('customInstance' in JSON.parse(first.profiles[5])), 'native PBR profiles retain property-based grouping');
    // The token survives an animated or opaque uniform without serializing it.
    const custom = original[0] as THREE.ShaderMaterial;
    const cyclic: { self?: unknown } = {}; cyclic.self = cyclic;
    custom.uniforms.opaqueResource = { value: cyclic };
    custom.uniforms.uColor.value.set('#00ff00');
    assert.deepEqual(captureMaterialProfiles(original).profiles, first.profiles);
  } finally {
    for (const material of new Set([...original, ...rebuilt])) material.dispose();
  }
});
