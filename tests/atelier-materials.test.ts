import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { ATELIER_MATERIALS, SCOPED_ATELIER_MATERIALS, isAtelierMaterial, type AtelierMaterialName } from '../kit/atelier-materials';
import { MATERIAL_NAMES, materialByte, materialOfByte } from '../kit/material';
import { applyMaterialize } from '../engine/materialize';
import type { Capture } from '../kit/contract';
import { prepareAtelierMaterials, refinishAtelier } from '../engine/atelier-materials';
import { dressAtelierSurfaces } from '../engine/atelier-material-runtime/conjure-adapter.js';

test('Atelier IDs stay separate from existing material recipes and enumerate source restrictions', () => {
  assert.equal(Object.keys(ATELIER_MATERIALS).length, 22);
  assert.equal(Object.keys(SCOPED_ATELIER_MATERIALS).length, 4);
  assert.equal(MATERIAL_NAMES.length, 12);
  assert.equal(MATERIAL_NAMES[0], 'chrome');
  assert.ok(isAtelierMaterial('atelier-chrome'));
  assert.ok(!isAtelierMaterial('chrome') && !isAtelierMaterial('constructor'));
  for (const id of Object.keys(SCOPED_ATELIER_MATERIALS)) assert.ok(!isAtelierMaterial(`atelier-${id}`));
});

test('source factories produce native materials with geometric appearance and unchanged originals', async () => {
  await prepareAtelierMaterials(Object.keys(ATELIER_MATERIALS));
  for (const name of Object.keys(ATELIER_MATERIALS) as AtelierMaterialName[]) {
    const geometry = new THREE.SphereGeometry(1, 12, 8);
    const original = new THREE.MeshStandardMaterial({ color: '#af4321' });
    const mesh = new THREE.Mesh(geometry, original);
    mesh.castShadow = true;
    const positions = geometry.getAttribute('position').array.slice();
    const root = new THREE.Group().add(mesh);
    const free = refinishAtelier(root, name, true);
    const surface = mesh.material as THREE.MeshPhysicalMaterial;
    assert.ok(surface instanceof THREE.MeshPhysicalMaterial, `${name} uses host Three`);
    assert.equal(surface.userData.atelierMaterial, name.slice(8));
    const albedo = surface.userData.atelierAlbedoMaterial as THREE.Material;
    assert.ok(albedo instanceof THREE.Material, `${name} has its actual source pigment companion`);
    assert.ok(albedo.userData.albedoSurface);
    assert.notEqual(albedo, surface);
    assert.ok(!JSON.stringify(surface.userData).includes('atelierAlbedoMaterial'), 'live companion is not serialized into recipes or clones');
    assert.equal(surface.userData.atelierTransmission, name === 'atelier-frosted-glass' ? 1 : 0);
    let albedoDisposed = 0;
    albedo.addEventListener('dispose', () => albedoDisposed++);
    assert.notEqual(surface, original);
    assert.notEqual(mesh.geometry, geometry);
    assert.equal(original.userData.atelierMaterial, undefined);
    assert.deepEqual(geometry.getAttribute('position').array, positions);
    const convex = mesh.geometry.getAttribute('materialConvex'), ao = mesh.geometry.getAttribute('materialAO');
    assert.ok(convex && ao, `${name} receives source geometric bake`);
    assert.ok(Array.from(convex.array).some(value => value > 0.2), `${name} reads the sphere curvature`);
    assert.ok(Array.from(ao.array).every(value => value >= 0 && value <= 1));
    const shader = {
      uniforms: {},
      vertexShader: THREE.ShaderLib.physical.vertexShader,
      fragmentShader: THREE.ShaderLib.physical.fragmentShader,
    };
    surface.onBeforeCompile(shader as THREE.WebGLProgramParametersWithUniforms, undefined as unknown as THREE.WebGLRenderer);
    assert.notEqual(shader.fragmentShader, THREE.ShaderLib.physical.fragmentShader, `${name} installs its source shader`);
    const pigmentShader = { uniforms: {}, vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader };
    albedo.onBeforeCompile(pigmentShader as THREE.WebGLProgramParametersWithUniforms, undefined as unknown as THREE.WebGLRenderer);
    assert.ok((albedo as THREE.MeshBasicMaterial).isMeshBasicMaterial || !pigmentShader.fragmentShader.includes('#include <colorspace_fragment>'), `${name} pigment uses a linear shader or basic pigment material`);
    if (name === 'atelier-frosted-glass') {
      assert.equal(surface.transmission, 1);
      assert.equal(mesh.castShadow, false, 'source frosted glass suppresses its opaque shadow caster');
      assert.ok(shader.fragmentShader.includes('isOrthographic ? inverseTransformDirection'));
      assert.ok(shader.fragmentShader.includes('getIBLVolumeRefraction'));
    }
    free(); free();
    assert.equal(albedoDisposed, 1, `${name} owns and releases its pigment companion once`);
    assert.equal(mesh.geometry, geometry);
    assert.equal(mesh.material, original);
    assert.equal(mesh.castShadow, true);
    geometry.dispose(); original.dispose();
  }
});

test('arbitrary triangle geometry has a real weave or circular-grain chart without source Garden IDs', async () => {
  await prepareAtelierMaterials(['atelier-woven-linen', 'atelier-perlage-metal']);
  for (const name of ['atelier-woven-linen', 'atelier-perlage-metal'] as const) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, 0, 0, 2, 0, 0, 0, 1, 0,
      2, 0, 0, 2, 1, 1, 0, 1, 0,
    ]), 3));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }));
    const free = refinishAtelier(new THREE.Group().add(mesh), name, true);
    if (name === 'atelier-woven-linen') {
      const coord = mesh.geometry.getAttribute('wovenCoord');
      assert.ok(coord && Array.from(coord.array).some(value => value > 10), 'real yarn coordinate fields');
      assert.ok(Array.from(mesh.geometry.getAttribute('wovenPolar').array).every(value => value === 1));
    } else {
      assert.ok(Array.from(mesh.geometry.getAttribute('perlageChartValid').array).every(value => value === 1), 'valid grain tangent charts');
      assert.ok(Array.from(mesh.geometry.getAttribute('perlageEnabled').array).every(value => value === 1));
    }
    free();
    assert.equal(geometry.getAttribute('uv'), undefined, 'authored geometry remains unchanged');
  }
});

test('material slots remain local and excluded Garden materials fail before mutation', () => {
  const original = [new THREE.MeshStandardMaterial({ color: 'red' }), new THREE.MeshStandardMaterial({ color: 'blue' })];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), original);
  const free = dressAtelierSurfaces([{ mesh, slot: 0, material: original[0] } as never], 'atelier-wood');
  assert.notEqual(mesh.material[0], original[0]);
  assert.equal(mesh.material[1], original[1]);
  free();
  assert.equal(mesh.material, original);
  assert.throws(() => dressAtelierSurfaces([{ mesh, slot: 0, material: original[0] } as never], 'atelier-perforated-shell'), /not portable/);
  assert.equal(mesh.material, original);
});


test('authored shader bytes preserve original mappings and avoid generic material re-interpretation', () => {
  for (const id of Object.keys(ATELIER_MATERIALS)) assert.equal(materialByte(id), 255);
  assert.equal(materialOfByte(255), null);
  for (let at = 0; at < MATERIAL_NAMES.length; at++) assert.equal(materialByte(MATERIAL_NAMES[at]), at + 1);
  const size = 8, length = size * size * 4;
  const pixels = new Uint8ClampedArray(length).fill(110);
  const identity = new Uint8Array(length), material = new Uint8Array(length);
  for (let at = 0; at < length; at += 4) {
    pixels[at + 3] = 255;
    identity[at] = 2;
    material[at] = 255; material[at + 1] = 2; material[at + 2] = 255;
  }
  const capture: Capture = { size, color: pixels, identity, material,
    normal: new Uint8ClampedArray(length).fill(128), depth: new Uint8Array(length), diffuse: new Uint8Array(length).fill(128),
    near: 0.1, far: 10, pixelWorldSize: 0.01, light: [0, 0, 1], baseColors: [null, null, [110, 110, 110]] };
  assert.equal(applyMaterialize(pixels, capture, { weight: 1 }, 42).pixels, pixels);
});

test('source shader preparation does not mutate Three global shader chunks', () => {
  const before = JSON.stringify(THREE.ShaderChunk);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial());
  const free = dressAtelierSurfaces([{ mesh, slot: null, material: mesh.material } as never], 'atelier-frosted-glass');
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader };
  mesh.material.onBeforeCompile(shader as THREE.WebGLProgramParametersWithUniforms, undefined as unknown as THREE.WebGLRenderer);
  assert.equal(JSON.stringify(THREE.ShaderChunk), before);
  free();
});
