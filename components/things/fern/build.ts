import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    habit: choice('How do the fronds rise?', { upright: 'An upright vase of narrow fronds.', fountain: 'Arching fronds like a green fountain.', creeping: 'Low spreading fronds close to the soil.' }),
    size: score('How large is this fern?', ['A small young fern', 'A full woodland fern', 'A shoulder-high fern']),
    leaflets: choice('What shape are the individual leaflets?', { lance: 'Long pointed lance-shaped leaflets.', round: 'Short rounded leaflets.', divided: 'Many fine twice-divided feathery leaflets.' }),
    pigment: choice('What shade have the fronds?', { forest: 'Dark forest green.', lime: 'Fresh yellow-green.', blue: 'Blue-green and silver.', bronze: 'Coppery young fronds.' }),
    count: score('How many fronds have unfolded?', ['Three fronds', 'A full rosette', 'A broad many-frond crown']),
    fiddleheads: noul('Are tightly curled fiddleheads rising in the centre?'),
    spores: noul('Do brown spore dots mark the backs of mature leaflets?'),
    roots: noul('Is an earthy root ball visible beneath the plant?'),
  },
  build(a, context) {
    const s = new Sculpture(context), h = 0.07 + a.size * 1.25, mat = s.material({ forest: '#44714d', lime: '#8aaa58', blue: '#62958a', bronze: '#a68157' }[a.pigment]), stalk = s.material('#698454'), spore = s.material('#987447'), count = 3 + Math.round(a.count * 7);
    const foliage: { at: [number, number, number]; size: [number, number, number]; yaw: number }[] = [], spores: { at: [number, number, number]; size: number }[] = [], veins: { from: [number, number, number]; to: [number, number, number] }[] = [];
    if (a.roots) s.ball([h * 0.16, h * 0.06, h * 0.13], [0, h * 0.03, 0], s.material('#776451'), 10);
    for (let i = 0; i < count; i++) {
      const t = i * Math.PI * 2 / count + context.random() * 0.15, length = h * (0.72 + context.random() * 0.28), outward = a.habit === 'upright' ? 0.32 : a.habit === 'fountain' ? 0.75 : 0.92, rise = a.habit === 'creeping' ? 0.25 : 1, path: [number, number, number][] = [];
      for (let j = 0; j < 11; j++) { const f = j / 10; path.push([Math.cos(t) * length * outward * f, h * 0.04 + length * rise * (Math.sin(f * Math.PI * 0.8) * 0.68 + f * 0.15), Math.sin(t) * length * outward * f]); }
      s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p))), 40, h * 0.008, 5, false), stalk);
      for (let j = 2; j < 10; j++) for (const side of [-1, 1]) {
        const p = path[j], f = j / 10, len = length * (0.09 + Math.sin(f * Math.PI) * 0.13), angle = t + side * Math.PI * 0.39, dx = Math.cos(angle), dz = Math.sin(angle), at: [number, number, number] = [p[0] + dx * len * 0.48, p[1] - len * 0.05, p[2] + dz * len * 0.48];
        foliage.push({ size: [len * 0.54, h * 0.007, len * (a.leaflets === 'round' ? 0.27 : 0.12)], at, yaw: -angle });
        veins.push({ from: p, to: [p[0] + dx * len, p[1], p[2] + dz * len] });
        if (a.leaflets === 'divided') for (let k = 1; k < 4; k++) for (const edge of [-1, 1]) foliage.push({ size: [len * 0.19, h * 0.004, len * 0.045], at: [p[0] + dx * len * k / 4 - dz * len * 0.14 * edge, p[1], p[2] + dz * len * k / 4 + dx * len * 0.14 * edge], yaw: -angle - edge * 0.65 });
        if (a.spores && j < 6) for (let k = 0; k < 3; k++) spores.push({ at: [at[0] + dx * len * (k - 1) * 0.18, at[1] + h * 0.006, at[2] + dz * len * (k - 1) * 0.18], size: h * 0.005 });
      }
    }
    // Feathered foliage keeps its small pointed silhouette with eight faces per
    // leaflet. Rounded fronds use a softer low-resolution ellipsoid instead.
    const leafGeometry = a.leaflets === 'round' ? new THREE.SphereGeometry(1, 8, 4) : new THREE.OctahedronGeometry(1, 0);
    const leaves = new THREE.InstancedMesh(leafGeometry, mat, foliage.length), matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
    foliage.forEach((leaf, i) => { rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), leaf.yaw); matrix.compose(new THREE.Vector3(...leaf.at), rotation, new THREE.Vector3(...leaf.size)); leaves.setMatrixAt(i, matrix); });
    leaves.instanceMatrix.needsUpdate = true; leaves.castShadow = leaves.receiveShadow = true; s.root.add(leaves);
    const ribs = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), stalk, veins.length);
    veins.forEach((vein, i) => { const from = new THREE.Vector3(...vein.from), to = new THREE.Vector3(...vein.to), direction = to.clone().sub(from), length = direction.length(); rotation.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); matrix.compose(from.add(to).multiplyScalar(0.5), rotation, new THREE.Vector3(h * 0.003, length, h * 0.003)); ribs.setMatrixAt(i, matrix); });
    ribs.instanceMatrix.needsUpdate = true; ribs.castShadow = ribs.receiveShadow = true; s.root.add(ribs);
    if (spores.length) s.scatter(new THREE.IcosahedronGeometry(1, 0), spore, spores);
    if (a.fiddleheads) for (let i = 0; i < 3; i++) { const x = (i - 1) * h * 0.08, y = h * (0.38 + i * 0.06); s.rod([x, 0, 0], [x, y, 0], h * 0.014, stalk); const pts: THREE.Vector3[] = []; for (let j = 0; j < 25; j++) { const f = j / 24, t = f * Math.PI * 3, r = h * 0.09 * (1 - f * 0.85); pts.push(new THREE.Vector3(x + Math.sin(t) * r, y + Math.cos(t) * r, 0)); } s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, h * 0.013, 6, false), mat); }
    return s.finish({ footprint: h * 0.17 });
  },
});
