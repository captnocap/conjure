import * as THREE from 'three';
import type { Built } from '@ateliers/tree/src/tree/build';
import type { Species } from '@ateliers/tree/src/tree/species';

// The atelier's inspection view draws tens of thousands of sprigs. Conjure prints at
// 720 px, where a deterministic sample retains the crown without subpixel overdraw.
function compact(mesh: THREE.InstancedMesh, limit: number, scale?: (source: number) => number) {
  const original = mesh.count;
  const count = Math.min(original, limit);
  const matrix = new THREE.Matrix4();
  const size = new THREE.Vector3();
  const attributes = Object.values(mesh.geometry.attributes).filter(
    (attribute): attribute is THREE.InstancedBufferAttribute => attribute instanceof THREE.InstancedBufferAttribute,
  );
  let active = 0;
  for (let sample = 0; sample < count; sample++) {
    // Even spacing covers the full crown instead of taking one branch's first leaves.
    const source = Math.floor(sample * original / count);
    const amount = scale?.(source) ?? 1;
    if (amount < 0.00001) continue;
    const target = active++;
    mesh.getMatrixAt(source, matrix);
    if (scale) matrix.scale(size.setScalar(amount));
    mesh.setMatrixAt(target, matrix);
    for (const attribute of attributes) {
      const array = attribute.array;
      for (let component = 0; component < attribute.itemSize; component++)
        array[target * attribute.itemSize + component] = array[source * attribute.itemSize + component];
    }
  }
  mesh.count = active;
  if (!active) mesh.visible = false;
  mesh.instanceMatrix.needsUpdate = true;
  for (const attribute of attributes) attribute.needsUpdate = true;
  mesh.boundingBox = mesh.boundingSphere = null;
}

const cyclic = (value: number) => ((value % 1) + 1) % 1;
const smooth = (low: number, high: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};

/** Adapt the authored foliage to Conjure's surface captures without changing its inventory. */
export function prepareFoliage(tree: Built, species: Species, season: number) {
  if (tree.leaves) {
    const { mesh, material, summer, autumn } = tree.leaves;
    const random = mesh.geometry.getAttribute('aRand');
    compact(mesh, 4000, (index) => {
      const span = cyclic(species.phenology.fall - species.phenology.leafOut);
      const here = cyclic(season + random.getY(index) * 0.03 - species.phenology.leafOut);
      const fallAt = span + random.getY(index) * 0.09 - 0.045;
      const growth = species.evergreen ? 1 : here < span + 0.1
        ? smooth(0, 0.05, here) * (1 - smooth(fallAt, fallAt + 0.012, here))
        : 0;
      // Size and seasonal growth must exist in the matrix: auxiliary capture passes
      // replace the visible material and cannot read the atelier's aRand shader scale.
      return random.getW(index) * growth;
    });
    // Mip averaging erases thin sprigs before a fixed alpha test can see them.
    // Sample the authored atlases directly, with a soft cutout threshold instead.
    for (const texture of [summer.texture, autumn.texture]) {
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
    }
    material.alphaHash = false;
    material.alphaTest = 0.15;
    const depth = mesh.customDepthMaterial as THREE.MeshDepthMaterial;
    depth.alphaHash = false;
    depth.alphaTest = 0.15;
    for (const surface of [material, depth]) {
      const compile = surface.onBeforeCompile;
      surface.onBeforeCompile = (shader, renderer) => {
        compile.call(surface, shader, renderer);
        shader.vertexShader = shader.vertexShader.replace(
          'transformed = leafFlutter() * transformed * on * aRand.w;',
          'transformed = leafFlutter() * transformed;',
        );
        // The normal capture has no map. Three removes the source map from its
        // shadow material too, so the atlas sample must be conditional on USE_MAP.
        if (surface === depth) shader.fragmentShader = shader.fragmentShader.replace(
          'vec2 auv = (vMapUv + vCell) * 0.25;',
          '#ifdef USE_MAP\nvec2 auv = (vMapUv + vCell) * 0.25;',
        ).replace('diffuseColor *= sampledDiffuseColor;', 'diffuseColor *= sampledDiffuseColor;\n#endif');
      };
      surface.customProgramCacheKey = () => surface === depth ? 'conjure-tree-leaf-depth' : 'conjure-tree-leaf';
      surface.needsUpdate = true;
    }
  }
  if (tree.blossom) {
    const { mesh, material } = tree.blossom;
    const random = mesh.geometry.getAttribute('aRand');
    const open = (material.userData.uniforms as { uOpen: { value: number } }).uOpen.value;
    compact(mesh, 1500, (index) => random.getW(index) * open);
    const compile = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      compile.call(material, shader, renderer);
      shader.vertexShader = shader.vertexShader.replace('transformed *= aRand.w * uOpen;', '');
    };
    material.customProgramCacheKey = () => 'conjure-tree-blossom';
    material.needsUpdate = true;
  }
  if (tree.fruit) {
    const { mesh, material, uniforms } = tree.fruit;
    compact(mesh, 180, () => uniforms.uGrow.value);
    const compile = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      compile.call(material, shader, renderer);
      shader.vertexShader = shader.vertexShader.replace('transformed *= uGrow;', '');
    };
    material.customProgramCacheKey = () => 'conjure-tree-fruit';
    material.needsUpdate = true;
  }
}
