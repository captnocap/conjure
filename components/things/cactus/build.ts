import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    species: choice('Which cactus silhouette fits?', { saguaro: 'An upright column with raised branching arms.', barrel: 'A round barrel cactus with vertical ribs.', pear: 'Several flat prickly-pear pads.', cluster: 'A family of small upright finger cacti.' }),
    size: score('How tall is the cactus?', ['A small potted specimen', 'A garden cactus', 'A tall branching cactus']),
    skin: choice('What colour is the cactus skin?', { sage: 'Muted sage green.', jade: 'Deep jade green.', blue: 'Powdery blue-green.', gold: 'Olive green with gold ribs.' }),
    container: choice('How is it rooted?', { clay: 'A terracotta pot.', sand: 'A patch of desert sand.', stone: 'A shallow pale stone planter.' }),
    spines: score('How prominent are the spines?', ['Sparse short spines', 'Fine clusters along the ribs', 'Long pale starbursts']),
    flowers: choice('Does it bloom?', { none: 'No flowers.', pink: 'Small magenta flowers.', yellow: 'Bright yellow flowers.', white: 'Cream-white flowers.' }),
    fruit: noul('Are small red cactus fruits visible?'),
    gravel: noul('Does pale gravel cover the soil around it?'),
  },
  build(a, context) {
    const s = new Sculpture(context), h = 0.2 + a.size * 3.2, r = h * (a.species === 'barrel' ? 0.27 : 0.085), green = s.material({ sage: '#80906c', jade: '#4e795c', blue: '#789c90', gold: '#999c60' }[a.skin]), pale = s.material('#c9bd87'), rootY = a.container === 'sand' ? h * 0.04 : h * 0.17;
    if (a.container === 'sand') s.cylinder(h * 0.34, h * 0.3, h * 0.06, [0, h * 0.03, 0], s.material('#c5b78d'), 20);
    else { const pot = s.lathe([[h * 0.15, 0], [h * 0.2, h * 0.02], [h * 0.24, h * 0.17], [h * 0.21, h * 0.2], [h * 0.18, h * 0.15], [0, h * 0.15]], s.material(a.container === 'clay' ? '#a67a5c' : '#c2c0ab')); pot.scale.z = a.container === 'stone' ? 0.82 : 1; s.cylinder(h * 0.19, h * 0.19, h * 0.015, [0, rootY, 0], s.material('#877758'), 20); }
    const tips: [number, number, number][] = [], spines: { from: [number, number, number]; to: [number, number, number]; radius: number }[] = [];
    const column = (x: number, y: number, z: number, height: number, radius: number) => {
      s.cylinder(radius, radius * 0.94, height - radius, [x, y + (height - radius) / 2, z], green, 16);
      s.ball([radius, radius, radius], [x, y + height - radius, z], green, 16);
      tips.push([x, y + height, z]);
      for (let rib = 0; rib < 10; rib++) {
        const t = rib * Math.PI / 5, dx = Math.cos(t), dz = Math.sin(t);
        s.rod([x + dx * radius, y + radius * 0.2, z + dz * radius], [x + dx * radius, y + height - radius, z + dz * radius], radius * 0.07, a.skin === 'gold' ? pale : green);
        for (let row = 0; row < 5; row++) {
          const yy = y + height * (0.15 + row * 0.15), p: [number, number, number] = [x + dx * radius * 1.03, yy, z + dz * radius * 1.03];
          for (let j = 0; j < (a.spines > 0.5 ? 3 : 1); j++) spines.push({ from: p, to: [p[0] + dx * radius * (0.12 + a.spines * 0.55), yy + (j - 1) * radius * 0.25, p[2] + dz * radius * (0.12 + a.spines * 0.55)], radius: radius * 0.017 });
        }
      }
    };
    if (a.species === 'pear') {
      for (let i = 0; i < 6; i++) {
        const x = i === 0 ? 0 : (i % 2 ? -1 : 1) * h * (0.12 + i * 0.025), y = rootY + h * (0.17 + Math.floor(i / 2) * 0.21);
        const pad = s.ball([h * 0.15, h * 0.24, h * 0.04], [x, y, (i % 3 - 1) * h * 0.035], green, 16);
        pad.rotation.z = i % 2 ? 0.3 : -0.2; tips.push([x, y + h * 0.21, pad.position.z]);
        for (let j = 0; j < 10; j++) { const t = j * 2.4, rr = Math.sqrt((j + 0.5) / 10), p: [number, number, number] = [x + Math.cos(t) * h * 0.1 * rr, y + Math.sin(t) * h * 0.17 * rr, pad.position.z + h * 0.04]; spines.push({ from: p, to: [p[0], p[1] + h * 0.015, p[2] + h * (0.01 + a.spines * 0.03)], radius: h * 0.0016 }); }
      }
    }
    else if (a.species === 'cluster') for (let i = 0; i < 5; i++) { const t = i * 2.4; column(Math.cos(t) * h * 0.12, rootY, Math.sin(t) * h * 0.1, h * (0.36 + context.random() * 0.42), r * 0.68); }
    else { column(0, rootY, 0, a.species === 'barrel' ? h * 0.68 : h, r); if (a.species === 'saguaro') for (const side of [-1, 1]) { const y = rootY + h * (side < 0 ? 0.38 : 0.57), x = side * h * 0.25; s.tube([[0, y, 0], [x * 0.75, y, 0], [x, y + h * 0.06, 0]], r * 0.68, green); column(x, y + h * 0.04, 0, h * (side < 0 ? 0.34 : 0.22), r * 0.65); } }
    const needles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 1, 1, 5), pale, spines.length), matrix = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
    spines.forEach((spine, i) => { const from = new THREE.Vector3(...spine.from), to = new THREE.Vector3(...spine.to), direction = to.clone().sub(from), length = direction.length(), rotation = new THREE.Quaternion().setFromUnitVectors(up, direction.normalize()); matrix.compose(from.add(to).multiplyScalar(0.5), rotation, new THREE.Vector3(spine.radius, length, spine.radius)); needles.setMatrixAt(i, matrix); });
    needles.instanceMatrix.needsUpdate = true; needles.castShadow = needles.receiveShadow = true; s.root.add(needles);
    if (a.flowers !== 'none') { const petal = s.material({ pink: '#c772a2', yellow: '#d6c465', white: '#e6dfc7' }[a.flowers]); tips.slice(0, 4).forEach((p) => { for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; s.ball([h * 0.032, h * 0.018, h * 0.025], [p[0] + Math.cos(t) * h * 0.035, p[1], p[2] + Math.sin(t) * h * 0.035], petal, 8); } s.ball([h * 0.02, h * 0.02, h * 0.02], p, pale, 8); }); }
    if (a.fruit) tips.slice(-2).forEach((p) => s.ball([h * 0.025, h * 0.055, h * 0.025], [p[0] + h * 0.035, p[1], p[2]], s.material('#b46a68'), 10));
    if (a.gravel) for (let i = 0; i < 20; i++) { const t = i * 2.4, rr = h * (0.1 + context.random() * 0.09); s.ball([h * 0.024, h * 0.014, h * 0.018], [Math.cos(t) * rr, rootY + h * 0.015, Math.sin(t) * rr], pale, 6); }
    return s.finish({ footprint: h * 0.27 });
  },
});
