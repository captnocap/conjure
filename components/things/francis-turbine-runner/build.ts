import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { lampGlow, plate } from './util';

const PLAQUES = {
  'first-power': ['UNIT Nº 1', 'FIRST POWER 1936', 'RETIRED 1989'],
  builders: ['TO THE MEN', 'WHO BUILT THIS DAM', '1931 – 1936'],
  hours: ['412,000 HOURS', 'OF FAITHFUL SERVICE'],
  valley: ['IN MEMORY OF', 'THE VALLEY BELOW', 'THE WATER'],
  cyrillic: ['СЛАВА ТРУДУ', 'ГЭС · 1957'],
  maker: ['FRANCIS RUNNER', '48,000 HP · 180 RPM', 'CAST 1934'],
} as const;

function sheet(nu: number, nv: number, at: (u: number, v: number) => [number, number, number]) {
  const positions: number[] = [], uvs: number[] = [], index: number[] = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { positions.push(...at(i / nu, j / nv)); uvs.push(i / nu, j / nv); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const p = j * (nu + 1) + i;
    index.push(p, p + 1, p + nu + 1, p + 1, p + nu + 2, p + nu + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

function ringOf(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, count: number, radius: number, y: number, skip = 0) {
  const mesh = new THREE.InstancedMesh(geometry, material, count - skip);
  const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < count - skip; i++) {
    const angle = (i / count) * Math.PI * 2;
    turn.setFromAxisAngle(up, angle);
    matrix.compose(new THREE.Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius), turn, one);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Pitting drawn toward the trailing edge (u = 1); heavy damage eats right through. */
function pitted(random: () => number, damage: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);
  const pits = Math.round(damage * 300);
  for (let i = 0; i < pits; i++) {
    const x = 128 * (1 - Math.pow(random(), 2.2) * 0.75), y = random() * 128, r = 0.6 + random() * 2.4 * damage;
    ctx.fillStyle = random() > 0.25 ? 'rgba(70,45,28,0.6)' : 'rgba(235,235,225,0.9)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
  }
  if (damage > 0.55) {
    ctx.globalCompositeOperation = 'destination-out';
    const holes = Math.round((damage - 0.5) * 26);
    for (let i = 0; i < holes; i++) { ctx.beginPath(); ctx.arc(128 - random() * 30, random() * 128, 4 + random() * 9, 0, 6.3); ctx.fill(); }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    type: choice('What kind of runner is it?', {
      francis: 'Francis: a heavy bell-shaped wheel, a ring of curved blades caged between a crown and a band.',
      kaplan: 'Kaplan: a ship-propeller shape, a fat hub with a few broad twisted blades.',
      pelton: 'Pelton: an upright wheel with a rim of paired spoon-shaped buckets.',
    }),
    size: score('How big is it?', ['Waist high, from a village power house', 'Taller than a person', 'A giant from a great dam, dwarfing visitors']),
    display: choice('How is it kept?', {
      monument: 'A proud monument on a stepped stone plinth with spotlights.',
      museum: 'A museum piece on a steel cradle behind rope barriers with a lectern.',
      flowerbed: 'The centrepiece of a round municipal flowerbed.',
      scrap: 'Scrap: dumped on timber baulks in the weeds, pieces torch-cut away.',
    }),
    finish: choice('What does the metal look like?', {
      bronze: 'Warm polished bronze.',
      verdigris: 'Bronze gone green and brown with weather.',
      painted: 'Painted machinery blue-grey with a red hub.',
      steel: 'Bare cast steel, grey with orange rust blooms.',
    }),
    cavitation: score('How badly has cavitation eaten the blades?', ['Unmarked', 'A frosting of pits on the trailing edges', 'Pocked and weld-patched', 'Eaten into lace, holes right through']),
    plaque: choice('What does the plaque honour?', {
      'first-power': 'The first unit and the date of first power.',
      builders: 'The men who built the dam.',
      hours: 'Its hours of service.',
      valley: 'The valley that lies under the water.',
      cyrillic: 'Glory to labour, in Cyrillic, with the year of the station.',
      maker: 'Just the technical data: type, horsepower, foundry year.',
    }),
    tribute: noul('Has someone left flowers or a wreath at the plaque?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const k = mix(0.55, 1.75, a.size);
    const scrap = a.display === 'scrap';
    const base = { bronze: '#b98440', verdigris: '#6f9a84', painted: '#5b7f97', steel: '#8c8a84' }[a.finish];
    const tint = new THREE.Color(base).lerp(new THREE.Color(a.finish === 'bronze' ? '#6b5334' : '#7a5236'), mood.wear * (a.finish === 'bronze' ? 0.5 : 0.35) + (scrap ? 0.2 : 0));
    const shine = a.finish === 'bronze' ? 0.55 : a.finish === 'steel' ? 0.4 : 0.15;
    const metal = new THREE.MeshStandardMaterial({ color: tint, metalness: shine, roughness: mix(0.32, 0.75, mood.wear) });
    const texture = pitted(random, a.cavitation);
    const blade = new THREE.MeshStandardMaterial({ color: tint, metalness: shine, roughness: mix(0.35, 0.75, mood.wear), map: texture, side: THREE.DoubleSide, alphaTest: 0.5 });
    const hubPaint = a.finish === 'painted' ? s.material('#b23a2e') : metal;
    const dark = s.material('#2c3033', { metalness: 0.4, roughness: 0.5 });

    // The runner, built with its shaft axis on +y at a radius near 1.6, then scaled.
    const runner = new THREE.Group();
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material, y = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = y; mesh.castShadow = mesh.receiveShadow = true; runner.add(mesh); return mesh;
    };
    const lathe = (profile: readonly (readonly [number, number])[], material: THREE.Material) => part(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 40), material);
    const missing = scrap ? 2 + Math.floor(random() * 3) : 0;
    if (a.type === 'francis') {
      lathe([[0, 1.12], [0.42, 1.12], [0.42, 1], [1.5, 0.9], [1.5, 0.8], [0.9, 0.74], [0.45, 0.4], [0.22, -0.3], [0, -0.42]], hubPaint);
      lathe([[1.5, 0.3], [1.58, 0.3], [1.58, 0.18], [1.44, -0.55], [1.35, -0.55], [1.47, 0.18], [1.5, 0.3]], metal);
      ringOf(runner, new THREE.CylinderGeometry(0.05, 0.05, 0.06, 6), dark, 12, 0.3, 1.15);
      const geometry = sheet(10, 4, (u, v) => {
        const rt = mix(1.5, 0.4, u), yt = mix(0.8, 0.1, Math.pow(u, 1.6));
        const rb = mix(1.5, 1.37, u), yb = mix(0.3, -0.52, u);
        const r = mix(rt, rb, v), y = mix(yt, yb, v), angle = u * 0.85 + v * 0.45;
        return [Math.sin(angle) * r, y, Math.cos(angle) * r];
      });
      const count = 11;
      for (let i = 0; i < count - missing; i++) part(geometry, blade).rotation.y = (i / count) * Math.PI * 2;
    } else if (a.type === 'kaplan') {
      lathe([[0, 1.35], [0.32, 1.35], [0.32, 1.12], [0.5, 1.08], [0.62, 0.8], [0.62, 0], [0.52, -0.42], [0.3, -0.76], [0, -0.9]], hubPaint);
      const count = 4 + Math.floor(random() * 3);
      const geometry = sheet(8, 8, (u, v) => {
        const r = mix(0.56, 1.7, u), span = mix(0.42, 0.56, u) * (1 - 0.35 * Math.pow(u, 5) * Math.abs(v - 0.5) * 2) * (5 / count);
        const angle = (v - 0.5) * 2 * span, y = 0.4 + (v - 0.5) * mix(0.95, 0.4, u);
        return [Math.sin(angle) * r, y, Math.cos(angle) * r];
      });
      for (let i = 0; i < count - Math.min(missing, 1); i++) part(geometry, blade).rotation.y = (i / count) * Math.PI * 2;
      ringOf(runner, new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12).rotateX(Math.PI / 2), dark, count, 0.61, 0.4);
    } else {
      part(new THREE.CylinderGeometry(1.05, 1.05, 0.16, 40), metal);
      part(new THREE.CylinderGeometry(0.42, 0.42, 0.46, 24), hubPaint);
      part(new THREE.CylinderGeometry(0.16, 0.16, 1.1, 16), dark);
      ringOf(runner, new THREE.CylinderGeometry(0.045, 0.045, 0.2, 6), dark, 16, 0.62, 0);
      const cup = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI).rotateY(Math.PI / 2).scale(0.17, 0.125, 0.22);
      const count = 18;
      for (const y of [-0.12, 0.12]) ringOf(runner, cup, blade, count, 1.3, y, missing * 2);
      ringOf(runner, new THREE.BoxGeometry(0.1, 0.2, 0.34), metal, count, 1.1, 0, missing * 2);
    }
    runner.scale.setScalar(k);

    // How the runner is posed, and what it rests on.
    const tilted = a.type === 'francis' && (a.display === 'monument' || a.display === 'museum');
    if (a.type === 'francis') runner.rotation.x = tilted ? -2.25 : Math.PI + (scrap ? 0.16 : 0);
    else if (a.type === 'pelton') runner.rotation.x = scrap ? 0.22 : Math.PI / 2;
    else if (scrap) runner.rotation.z = 1.2;
    if (scrap) runner.rotation.y = random() * 0.6;
    const span = 3.9 * k;
    const stone = s.material(mood.warmth > 0.5 ? '#b9b0a0' : '#a5a7a6', { roughness: 0.9 });
    let top = 0;
    if (a.display === 'monument') {
      s.box([span + 0.9, 0.25, span * 0.8 + 0.9], [0, 0.125, 0], stone);
      s.box([span, 1, span * 0.8], [0, 0.75, 0], stone);
      top = 1.25;
      const lamp = s.material('#fff1c0', { emissive: '#ffd27a', emissiveIntensity: lampGlow(mood.daylight) });
      for (const x of [-1, 1]) { s.cylinder(0.12, 0.14, 0.22, [x * (span / 2 + 0.2), 0.36, span * 0.4 + 0.2], dark, 10); s.ball([0.1, 0.05, 0.1], [x * (span / 2 + 0.2), 0.48, span * 0.4 + 0.2], lamp, 8); }
    } else if (a.display === 'museum') {
      s.box([span, 0.12, span * 0.8], [0, 0.06, 0], dark);
      for (const x of [-1, 1]) s.box([0.2, 0.3, span * 0.7], [x * span * 0.3, 0.27, 0], s.material('#c9a227', { metalness: 0.3 }));
      top = 0.42;
      const brass = s.material('#c7a24a', { metalness: 0.6, roughness: 0.3 }), rope = s.material('#9c2f33');
      const px = span / 2 + 0.5, pz = span * 0.4 + 0.5;
      const corners: [number, number][] = [[-px, pz], [px, pz], [px, -pz], [-px, -pz]];
      corners.forEach(([x, z], index) => {
        s.cylinder(0.035, 0.035, 0.95, [x, 0.475, z], brass, 10);
        s.cylinder(0.16, 0.18, 0.04, [x, 0.02, z], brass, 14);
        s.ball([0.06, 0.06, 0.06], [x, 0.98, z], brass, 8);
        const [nx, nz] = corners[(index + 1) % 4];
        if (index !== 2) s.tube([[x, 0.9, z], [(x + nx) / 2, 0.7, (z + nz) / 2], [nx, 0.9, nz]], 0.025, rope);
      });
    } else if (a.display === 'flowerbed') {
      const R = span * 0.62 + 0.7;
      s.cylinder(R + 0.15, R + 0.15, 0.3, [0, 0.15, 0], stone, 40);
      s.cylinder(R, R, 0.34, [0, 0.17, 0], s.material('#4a3a2a', { roughness: 1 }), 40);
      s.cylinder(span * 0.3, span * 0.34, 0.9, [0, 0.45, 0], stone, 24);
      top = 0.9;
      const palette = mood.cheer > 0.5 ? ['#e8472f', '#f2b01e', '#f4f1e4', '#d83a7c'] : ['#8f3b3b', '#9a8f4a', '#c9c5b8', '#6c4a6f'];
      const flowers = Array.from({ length: Math.round(mix(30, 150, mood.density)) }, () => {
        const angle = random() * 6.28, r = mix(span * 0.36, R - 0.1, Math.sqrt(random()));
        return { at: [Math.sin(angle) * r, 0.36 + random() * 0.08, Math.cos(angle) * r] as const, size: 0.07 + random() * 0.07, color: random() > 0.35 ? palette[Math.floor(random() * 4)] : '#4f7a3a' };
      });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), flowers);
    } else {
      const wood = s.material('#6f5a42', { roughness: 1 });
      for (const z of [-1, 0, 1]) { const baulk = s.box([span * 1.05, 0.22, 0.26], [(random() - 0.5) * 0.3, 0.11, z * span * 0.3], wood); baulk.rotation.y = (random() - 0.5) * 0.25; }
      top = 0.22;
      const weeds = Array.from({ length: Math.round(mix(14, 60, mood.density)) }, () => {
        const angle = random() * 6.28, r = span * (0.35 + random() * 0.45);
        return { at: [Math.sin(angle) * r, 0.12 + random() * 0.15, Math.cos(angle) * r] as const, size: 0.5 + random() * 0.9, color: random() > 0.5 ? '#6f8346' : '#8d8a52' };
      });
      s.scatter(new THREE.ConeGeometry(0.1, 0.6, 5), new THREE.MeshStandardMaterial({ roughness: 1 }), weeds);
      // A torch-cut piece lying beside it.
      const offcut = s.box([0.5 * k, 0.06, 0.8 * k], [span * 0.55, 0.06, span * 0.3], metal);
      offcut.rotation.set(0.1, random() * 3, 0.15);
    }
    s.root.add(runner);
    runner.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(runner);
    runner.position.y += top - box.min.y - (a.display === 'flowerbed' && a.type === 'kaplan' ? 0.2 * k : 0);
    runner.position.z += tilted ? 0.25 * k : 0;
    if (tilted) {
      // The shaft flange at the back rests on a prop.
      const end = new THREE.Vector3(0, 1.12 * k, 0).applyEuler(runner.rotation).add(runner.position);
      s.box([0.7 * k, Math.max(0.1, end.y - top + 0.1), 0.5 * k], [end.x, top + Math.max(0.1, end.y - top + 0.1) / 2, end.z - 0.2 * k], dark);
      for (const x of [-1, 1]) s.box([0.35 * k, 0.5 * k, 0.9 * k], [x * 0.8 * k, top + 0.25 * k, runner.position.z + 0.75 * k], dark).rotation.x = 0.5;
    } else if (a.type === 'pelton' && !scrap) {
      for (const x of [-1, 1]) s.box([0.5 * k, 0.5 * k, 0.6 * k], [x * 0.75 * k, top + 0.2 * k, 0], dark).rotation.z = x * 0.7;
      for (const z of [-1, 1]) { s.box([0.3 * k, 1.42 * k, 0.16 * k], [0, top + 0.71 * k, z * 0.5 * k], dark); }
    } else if (a.type === 'kaplan' && !scrap) {
      s.cylinder(0.45 * k, 0.6 * k, 0.5 * k, [0, top + 0.25 * k, 0], dark, 20);
    }

    // The plaque.
    const bronze = { ink: '#f0d9a0', paper: mood.wear > 0.6 ? '#4f5a48' : '#5a3d22', border: '#caa86a', font: 'serif' };
    const lines = a.type !== 'francis' && a.plaque === 'maker' ? [`${a.type.toUpperCase()} RUNNER`, '48,000 HP · 180 RPM', 'CAST 1934'] : PLAQUES[a.plaque];
    const pw = Math.min(2.1, span * 0.6), ph = pw * 0.48;
    const sign = plate(lines, pw, ph, bronze);
    let foot: [number, number, number];
    if (a.display === 'monument') { sign.position.set(0, 0.75, span * 0.4 + 0.012); foot = [0.2, 0.25, span * 0.4 + 0.3]; }
    else if (a.display === 'museum') {
      const x = span * 0.32, z = span * 0.4 + 0.85;
      s.rod([x, 0, z], [x, 0.95, z], 0.035, dark);
      s.cylinder(0.2, 0.22, 0.04, [x, 0.02, z], dark, 14);
      const backing = s.box([pw + 0.08, 0.04, ph + 0.08], [x, 1, z], dark); backing.rotation.x = 0.7;
      sign.position.set(x, 1.02, z + 0.02); sign.rotation.x = -Math.PI / 2 + 0.7;
      foot = [x - 0.5, 0, z];
    } else if (a.display === 'flowerbed') {
      const z = span * 0.62 + 1.25;
      s.box([pw + 0.2, 0.5, 0.5], [0, 0.2, z], stone).rotation.x = -0.5;
      sign.position.set(0, 0.34, z + 0.2); sign.rotation.x = -0.5;
      foot = [0.5, 0, z + 0.45];
    } else {
      sign.position.set(-span * 0.2, ph * 0.45, span * 0.3 + 0.2); sign.rotation.set(-0.35, 0.3, 0.12);
      foot = [span * 0.1, 0, span * 0.3 + 0.5];
    }
    s.root.add(sign);

    if (a.tribute) {
      const fresh = mood.wear < 0.55;
      const leaf = s.material(fresh ? '#3f6f3c' : '#6f6243'), bloom = s.material(fresh ? (mood.cheer > 0.5 ? '#e9c53a' : '#c23a35') : '#8a6f55');
      const wreath = s.ring(0.24, 0.07, foot, leaf); wreath.rotation.x = -1.1; wreath.position.y += 0.2;
      for (let i = 0; i < 6; i++) { const angle = i * 1.05; s.ball([0.05, 0.05, 0.05], [foot[0] + Math.cos(angle) * 0.24, foot[1] + 0.2 + Math.sin(angle) * 0.11, foot[2] + 0.04 - Math.sin(angle) * 0.2], bloom, 6); }
      for (let i = 0; i < 3; i++) { const x = foot[0] - 0.55 - i * 0.12; s.rod([x, foot[1] + 0.03, foot[2]], [x + 0.1, foot[1] + 0.03, foot[2] - 0.35], 0.012, leaf); s.ball([0.05, 0.04, 0.05], [x + 0.1, foot[1] + 0.05, foot[2] - 0.36], bloom, 6); }
    }

    return s.finish();
  },
});
