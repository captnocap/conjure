// Run from task/conjure with: node --import tsx ../evidence/custom-shader-native-parity.mjs
// Creates only its adjacent JSON evidence file. No browser or application writes.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from '../conjure/node_modules/three/build/three.module.js';
import { ATELIER_MATERIALS } from '../conjure/kit/atelier-materials.ts';
import { dressAtelierSurfaces } from '../conjure/engine/atelier-material-runtime/conjure-adapter.js';
import { captureMaterialProfiles } from '../conjure/engine/capture.ts';

const evidence = dirname(fileURLToPath(import.meta.url)), checkout = resolve(evidence, '../conjure');
const sha = value => createHash('sha256').update(value).digest('hex');
const currentFunction = captureMaterialProfiles.toString();
// The original before/after installed-module comparison passed before guarded
// installation. Reconstruct that pre-ordinal function for repeatable evidence
// after installation by removing only the three exact additions to its logic.
const removedFragments = [
  'const customInstances=new Map;',
  'if((source.isShaderMaterial||source.isRawShaderMaterial)&&!customInstances.has(original))customInstances.set(original,customInstances.size+1);',
  'customInstance:customInstances.get(original),',
];
let previousFunction = currentFunction;
for (const fragment of removedFragments) {
  assert.equal(previousFunction.split(fragment).length, 2, 'Expected exactly one custom-ordinal addition');
  previousFunction = previousFunction.replace(fragment, '');
}
// tsx adds only this function-name helper; names do not affect profile semantics.
const beforeProfiles = Function('__name', `return (${previousFunction});`)((fn) => fn);
const materials = [], cleanup = [], ids = Object.keys(ATELIER_MATERIALS);
try {
  assert.equal(ids.length, 22);
  for (const id of ids) {
    const original = new THREE.MeshStandardMaterial(), geometry = new THREE.SphereGeometry(1, 12, 8);
    const mesh = new THREE.Mesh(geometry, original);
    const free = dressAtelierSurfaces([{ mesh, slot: null, material: original }], id);
    materials.push(mesh.material);
    cleanup.push(() => { free(); geometry.dispose(); original.dispose(); });
  }
  const before = beforeProfiles(materials), after = captureMaterialProfiles(materials);
  assert.deepEqual(after.profiles, before.profiles);
  assert.deepEqual(materials.map(m => after.tokens.get(m)), materials.map(m => before.tokens.get(m)));
  const factories = materials.map((material, index) => {
    assert.ok(material.isMeshPhysicalMaterial && !material.isShaderMaterial && !material.isRawShaderMaterial);
    const beforeToken = before.tokens.get(material), afterToken = after.tokens.get(material);
    const beforeProfile = before.profiles[beforeToken], afterProfile = after.profiles[afterToken];
    assert.ok(!('customInstance' in JSON.parse(afterProfile)));
    return { id: ids[index].slice('atelier-'.length), recipeId: ids[index], nativeType: material.type, beforeToken, afterToken,
      beforeProfileSha256: sha(beforeProfile), afterProfileSha256: sha(afterProfile),
      profileEqual: beforeProfile === afterProfile, tokenEqual: beforeToken === afterToken };
  });
  const native = new THREE.MeshPhysicalMaterial({ color: '#a86c32', roughness: .4 });
  const pair = [native, native.clone()]; cleanup.push(() => pair.forEach(material => material.dispose()));
  const nativeBefore = beforeProfiles(pair), nativeAfter = captureMaterialProfiles(pair);
  assert.deepEqual(nativeAfter.profiles, nativeBefore.profiles);
  const beforeTokens = pair.map(material => nativeBefore.tokens.get(material)), afterTokens = pair.map(material => nativeAfter.tokens.get(material));
  assert.deepEqual(beforeTokens, [1, 1]); assert.deepEqual(afterTokens, beforeTokens);
  const files = ['engine/capture.ts', 'tests/atelier-capture-passes.test.ts', 'engine/atelier-material-runtime/material-library.js', 'engine/atelier-material-runtime/conjure-adapter.js'];
  const report = {
    version: 1, generatedAt: new Date().toISOString(),
    description: 'All 22 actual Atelier source factories retain byte-identical material-profile strings and tokens after conservative ShaderMaterial/RawShaderMaterial instance ordinals; equivalent native PBR slots still share a token.',
    baseline: { method: 'Installed pre-fix comparison passed before guarded integration; repeatable baseline reconstructs that function by removing only the three validated ordinal additions.',
      removedFragments, beforeFunctionSha256: sha(previousFunction), afterFunctionSha256: sha(currentFunction) },
    sourceHashes: Object.fromEntries(files.map(file => [file, sha(readFileSync(resolve(checkout, file)))])),
    factoryCount: factories.length,
    checks: { profileTablesEqual: true, tokensEqual: true, nativeFactoriesExcludedFromOrdinal: true },
    factories,
    nativePbr: { profileTablesEqual: true, tokensEqual: true, beforeTokens, afterTokens },
    result: 'passed',
  };
  writeFileSync(resolve(evidence, 'custom-shader-native-parity.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log('PASS: 22 source factory profiles/tokens unchanged; equivalent native PBR slots still share one token.');
} finally {
  for (const free of cleanup) free();
}
