// Read-only diagnostic: reproduce overlapping Three IDs across optimizer URL
// generations, using the existing optimized chunk and Three's own light cache.
// This does not modify application source, dependency files or optimizer caches.
import assert from 'node:assert/strict';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const checkout = resolve(dirname(fileURLToPath(import.meta.url)), '../conjure');
const dependencyRoot = realpathSync(resolve(checkout, 'node_modules'));
const deps = resolve(dependencyRoot, '.vite/deps');
const metadataPath = resolve(deps, '_metadata.json');
const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
const core = Object.values(metadata.chunks)
  .map(({ file }) => resolve(deps, file))
  .find(file => /\b(?:var|let) _object3DId = 0;/.test(readFileSync(file, 'utf8')));
assert.ok(core, 'Existing optimized metadata must identify the Three core chunk');

console.log('Read-only duplicate-Three optimizer-generation reproduction');
console.log(JSON.stringify({
  dependencyRoot,
  metadataPath,
  metadataModifiedAt: statSync(metadataPath).mtime.toISOString(),
  currentBrowserHash: metadata.browserHash,
  currentConfigHash: metadata.configHash,
  coreChunk: core,
}, null, 2));

// Node and browser ESM both distinguish modules by their complete URL. These
// synthetic query strings model two optimizer generations; neither is claimed
// to be a historically observed URL from the failed catalogue page.
const url = pathToFileURL(core).href;
const oldThree = await import(`${url}?optimizer-collision=old-generation`);
const newThree = await import(`${url}?optimizer-collision=new-generation`);
const oldLight = new oldThree.HemisphereLight();
const newLight = new newThree.DirectionalLight();
const oldMaterial = new oldThree.MeshBasicMaterial();
const newMaterial = new newThree.MeshBasicMaterial();
assert.notEqual(oldThree.Mesh, newThree.Mesh);
assert.equal(oldLight.id, newLight.id);
assert.equal(oldMaterial.id, newMaterial.id);

// Execute the exact cache function from the installed renderer rather than a
// substitute. Only its Vector3/Color constructor dependencies are supplied.
const rendererPath = resolve(dependencyRoot, 'three/build/three.cjs');
const rendererSource = readFileSync(rendererPath, 'utf8');
const start = rendererSource.indexOf('function UniformsCache()');
const end = rendererSource.indexOf('function ShadowUniformsCache()', start);
assert.ok(start >= 0 && end > start, 'Installed Three must expose its light-cache source');
const cache = Function('Vector3', 'Color', `${rendererSource.slice(start, end)}\nreturn UniformsCache();`)(oldThree.Vector3, oldThree.Color);
cache.get(oldLight);
const uniforms = cache.get(newLight);
console.log(JSON.stringify({
  sameMeshConstructor: oldThree.Mesh === newThree.Mesh,
  lights: [{ id: oldLight.id, type: oldLight.type }, { id: newLight.id, type: newLight.type }],
  materialIds: [oldMaterial.id, newMaterial.id],
  reusedUniformFields: Object.keys(uniforms),
  rendererSource: rendererPath,
}, null, 2));

let reproduced;
try {
  // This is the installed renderer's directional-light refresh operation.
  uniforms.color.copy(newLight.color);
} catch (error) {
  reproduced = error;
}
assert.ok(reproduced instanceof TypeError);
assert.equal(reproduced.message, "Cannot read properties of undefined (reading 'copy')");
console.log(`Exact reproduced error: ${reproduced.toString()}`);
console.log('Result: two module generations overlap numeric IDs; a directional light receives hemisphere-light uniforms without a color field.');
console.log('Historical limitation: no pre-restart optimizer hash or browser module URLs were preserved from the circus failure. These synthetic URLs demonstrate the mechanism; attribution of that failure remains inferred.');
