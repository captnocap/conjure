import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    pose: choice('How are the eight arms arranged?', { spread: 'A low radial star of exploratory arms.', curled: 'Arms curl upward into many small spirals.', walking: 'Several arms lift the body while others trail.' }),
    size: score('How wide is the octopus?', ['A small tide-pool octopus', 'A substantial reef octopus', 'A broad giant octopus']),
    skin: choice('What colour is its camouflage?', { rust: 'Rusty orange skin.', sand: 'Pale sandy cream.', violet: 'Dusky violet skin.', blue: 'Cool blue-green skin.' }),
    texture: score('How textured is the skin?', ['Smooth mantle', 'A few rounded bumps', 'A finely pebbled mantle']),
    suckers: noul('Are paired rows of pale suckers visible on its arms?'),
    mantle: choice('What shape has the mantle?', { round: 'A compact round mantle.', tall: 'A tall pear-shaped mantle.', broad: 'A flattened broad mantle.' }),
    rings: noul('Are small bright blue warning rings visible on the mantle?'),
    rock: noul('Does it shelter beside a small reef stone?'),
  },
  build(a, context) {
    const s = new Sculpture(context), span = 0.17 + a.size * 2.2, u = span / 2, color = { rust: '#b78668', sand: '#cdbda1', violet: '#a18aaf', blue: '#769da1' }[a.skin], skin = s.material(color), pale = s.material('#dfcfb2'), eye = s.material('#d3c291'), dark = s.material('#4c5756'), bodyY = u * (a.pose === 'walking' ? 0.28 : 0.12);
    const suckers: { at: [number, number, number]; radius: number }[] = [];
    s.ball([u * 0.24, u * (a.mantle === 'tall' ? 0.38 : a.mantle === 'broad' ? 0.16 : 0.26), u * 0.28], [0, bodyY + u * 0.25, -u * 0.03], skin, 20);
    s.ball([u * 0.2, u * 0.13, u * 0.2], [0, bodyY + u * 0.06, u * 0.14], skin, 18);
    for (const side of [-1, 1]) { s.ball([u * 0.073, u * 0.065, u * 0.061], [side * u * 0.17, bodyY + u * 0.16, u * 0.22], eye, 12); s.ball([u * 0.053, u * 0.012, u * 0.017], [side * u * 0.17, bodyY + u * 0.17, u * 0.276], dark, 10); }
    for (let arm = 0; arm < 8; arm++) {
      const t = arm * Math.PI / 4, pts: THREE.Vector3[] = [];
      for (let j = 0; j < 9; j++) { const f = j / 8, curl = a.pose === 'curled' ? f * f * 2.6 : f * f * 0.9, radius = u * (0.12 + f * 0.74), y = bodyY * (1 - f) + u * (a.pose === 'curled' ? Math.sin(f * Math.PI * 1.5) * 0.18 + f * 0.18 : a.pose === 'walking' ? Math.sin(f * Math.PI) * 0.22 : Math.sin(f * 5 + arm) * 0.025); pts.push(new THREE.Vector3(Math.cos(t + curl) * radius, Math.max(u * 0.025, y), Math.sin(t + curl) * radius)); }
      const curve = new THREE.CatmullRomCurve3(pts), segments = 48, g = new THREE.TubeGeometry(curve, segments, u * 0.065, 8, false), positions = g.getAttribute('position');
      for (let ring = 0; ring <= segments; ring++) { const f = ring / segments, center = curve.getPointAt(f), taper = 1 - f * 0.9; for (let j = 0; j <= 8; j++) { const index = ring * 9 + j, vertex = new THREE.Vector3().fromBufferAttribute(positions, index).sub(center).multiplyScalar(taper).add(center); positions.setXYZ(index, vertex.x, vertex.y, vertex.z); } } positions.needsUpdate = true; g.computeVertexNormals(); s.mesh(g, skin);
      if (a.suckers) for (let j = 2; j < 12; j++) { const f = j / 13, p = curve.getPointAt(f); for (const side of [-1, 1]) { const tangent = curve.getTangentAt(f), offset = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(u * 0.02 * (1 - f * 0.7) * side); suckers.push({ at: [p.x + offset.x, p.y + u * 0.04 * (1 - f * 0.8), p.z + offset.z], radius: u * 0.019 * (1 - f * 0.7) }); } }
    }
    if (suckers.length) { const cups = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.3, 6, 20), pale, suckers.length), matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2); suckers.forEach((sucker, i) => { matrix.compose(new THREE.Vector3(...sucker.at), rotation, new THREE.Vector3().setScalar(sucker.radius)); cups.setMatrixAt(i, matrix); }); cups.instanceMatrix.needsUpdate = true; cups.castShadow = cups.receiveShadow = true; s.root.add(cups); }
    if (a.texture > 0.25) for (let i = 0; i < 24; i++) { const t = i * 2.4, f = i / 24, r = Math.sqrt(f) * u * 0.22; s.ball([u * 0.016, u * 0.012, u * 0.016], [Math.cos(t) * r, bodyY + u * 0.25 + u * 0.24 * Math.sqrt(1 - f), Math.sin(t) * r - u * 0.03], skin, 6); }
    if (a.rings) for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4, ring = s.ring(u * 0.035, u * 0.01, [Math.cos(t) * u * 0.15, bodyY + u * 0.47, Math.sin(t) * u * 0.15 - u * 0.03], s.material('#5fa4bb')); ring.rotation.x = Math.PI / 2; }
    if (a.rock) s.ball([u * 0.35, u * 0.22, u * 0.26], [-u * 0.62, u * 0.19, -u * 0.5], s.material('#a5aaa0', { flatShading: true }), 7);
    return s.finish();
  },
});
