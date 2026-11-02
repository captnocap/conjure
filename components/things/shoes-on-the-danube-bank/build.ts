import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, figure, mix, noul, paint, paintHex } from '@conjure/kit';

type Kind = 'boot' | 'shoe' | 'heel' | 'child';

const flat = (geometry: THREE.BufferGeometry) => {
  const plain = geometry.index ? geometry.toNonIndexed() : geometry;
  if (plain !== geometry) geometry.dispose();
  for (const name of Object.keys(plain.attributes)) if (!['position', 'normal', 'uv'].includes(name)) plain.deleteAttribute(name);
  return plain;
};

/** A sole outline: rounded toe, slightly narrower heel, lying flat from y = 0 to y = thick. */
function sole(length: number, width: number, thick: number) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const z = Math.cos(a) * length / 2;
    const x = Math.sin(a) * width / 2 * (Math.cos(a) > 0 ? 1 : 0.82) * (1 - 0.12 * Math.max(0, -Math.cos(a * 2)) * 0);
    if (i === 0) shape.moveTo(x, z); else shape.lineTo(x, z);
  }
  return new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 4 }).rotateX(Math.PI / 2).translate(0, thick, 0);
}

/** One cast-iron shoe in its own space: standing on y = 0, toe toward +z. */
function shoe(kind: Kind): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const dome = (sx: number, sy: number, sz: number, x: number, y: number, z: number, front = false) =>
    new THREE.SphereGeometry(1, 14, 6, 0, front ? Math.PI : Math.PI * 2, 0, Math.PI / 2).scale(sx, sy, sz).translate(x, y, z);
  const collar = (r: number, depth: number, height: number, y: number, z: number) =>
    new THREE.CylinderGeometry(r, r, height, 14, 1, true).scale(1, 1, depth).translate(0, y + height / 2, z);
  if (kind === 'heel') {
    const L = 0.24, W = 0.075, lift = 0.07, tilt = Math.asin(lift / L);
    const rotate = (g: THREE.BufferGeometry) => g.translate(0, 0, L / 2).rotateX(tilt).translate(0, 0, -L / 2 + 0.005);
    parts.push(rotate(sole(L, W, 0.012).translate(0, 0, -L / 2 + L / 2)));
    parts.push(rotate(dome(W / 2 * 0.95, 0.04, L * 0.34, 0, 0.012, L * 0.1, true)));
    parts.push(rotate(new THREE.TorusGeometry(W * 0.42, 0.006, 4, 12, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI).scale(1, 1, 1.5).translate(0, 0.035, -L * 0.28)));
    parts.push(new THREE.CylinderGeometry(0.007, 0.011, lift + 0.01, 6).translate(0, (lift + 0.01) / 2, -L / 2 + 0.03));
    return parts;
  }
  const L = kind === 'child' ? 0.17 : kind === 'boot' ? 0.3 : 0.28;
  const W = kind === 'child' ? 0.07 : 0.1;
  const H = kind === 'child' ? 0.055 : 0.075;
  parts.push(sole(L, W, 0.018));
  parts.push(new THREE.BoxGeometry(W * 0.72, 0.022, L * 0.22).translate(0, 0.011, -L * 0.37));
  parts.push(dome(W / 2 * 0.96, H, L / 2 * 0.94, 0, 0.018, 0));
  if (kind === 'boot') {
    parts.push(collar(W * 0.4, 1.25, 0.13, 0.018 + H * 0.5, -L * 0.2));
    parts.push(new THREE.TorusGeometry(W * 0.4, 0.007, 4, 14).rotateX(Math.PI / 2).scale(1, 1, 1.25).translate(0, 0.018 + H * 0.5 + 0.13, -L * 0.2));
  } else {
    parts.push(collar(W * 0.36, 1.45, 0.022, 0.018 + H * 0.82, -L * 0.17));
    if (kind === 'child') parts.push(new THREE.TorusGeometry(W * 0.5, 0.006, 4, 12, Math.PI).rotateZ(0).translate(0, 0.018, 0.0));
  }
  return parts;
}

export default defineThing({
  questions: {
    pairs: choice('How many pairs of shoes are in view?', {
      few: 'Only a handful of pairs, close up, each one a person.',
      dozen: 'A dozen pairs along a stretch of the kerb.',
      many: 'A long row of thirty pairs running out of sight along the river.',
    }),
    left: choice('What has been left in the shoes?', {
      nothing: 'Nothing: just the cold iron.',
      candles: 'Small memorial candles burning in and between the shoes.',
      flowers: 'Single flowers laid in the shoes.',
      pebbles: 'Little stones placed on the toes, in remembrance.',
      ribbons: 'Ribbons tied through the laces.',
    }),
    tribute: paint('If flowers, ribbons or candle glasses have been left, what colour are they?', ['red', 'white', 'yellow', 'pink', 'blue', 'purple', 'orange', 'cream']),
    visitor: choice('Is anyone standing beside them?', {
      none: 'Nobody: the shoes alone on the stone.',
      mourner: 'A single figure in a dark coat stands behind them, head bowed.',
      kneeling: 'Someone kneels to place something in a shoe.',
    }),
    rain: noul('Has it rained, leaving water pooled on the stone and in the shoes?'),
    river: choice('How high is the river?', {
      low: 'Low: a long drop down the dark embankment wall to the water.',
      high: 'High: the grey river lapping almost at the lip of the stones.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const pairs = { few: 5, dozen: 12, many: 22 }[a.pairs];
    const pitch = 0.55;
    const length = pairs * pitch + 0.8;
    const QY = 0.4, KERB = 0.1, top = QY + KERB;
    const wet = a.rain;

    // Stone: paving behind, a raised kerb along the edge, the embankment wall dropping to the river.
    const pave = s.material(new THREE.Color('#a9a497').lerp(new THREE.Color('#5d5a52'), mood.wear * 0.4).multiplyScalar(wet ? 0.8 : 1), { roughness: wet ? 0.25 : 0.9 });
    const kerbStone = s.material(new THREE.Color('#8b877c').lerp(new THREE.Color('#5d5a52'), mood.wear * 0.4).multiplyScalar(wet ? 0.8 : 1), { roughness: wet ? 0.2 : 0.85 });
    s.box([length, QY, 1.1], [0, QY / 2, -0.55], pave);
    for (let x = -length / 2 + 0.6; x < length / 2; x += 1.2) s.box([0.02, 0.005, 1.1], [x, QY + 0.002, -0.55], s.material('#6f6b62'));
    s.box([length, top, 0.7], [0, top / 2, 0.35], kerbStone);
    for (let x = -length / 2 + 0.9; x < length / 2; x += 1.8) s.box([0.015, 0.004, 0.7], [x, top + 0.002, 0.35], s.material('#5d5a52'));
    // Algae band and the river.
    const high = a.river === 'high';
    const waterTop = high ? top - 0.12 : 0.04;
    s.box([length, 0.12, 0.02], [0, waterTop + 0.08, 0.71], s.material('#3e4a3a', { roughness: 0.9 }));
    const river = s.box([length, waterTop, 0.8], [0, waterTop / 2, 1.1], new THREE.MeshStandardMaterial({ color: new THREE.Color('#5f6f6a').lerp(new THREE.Color('#3f4a4a'), lowSun * 0.6), roughness: 0.12, metalness: 0.2 }));
    river.castShadow = false;

    // The shoes: one merged casting, set along the lip with toes to the river.
    const iron = s.material('#3a3632', { roughness: wet ? 0.25 : 0.5, metalness: 0.55, side: THREE.DoubleSide });
    const kinds: Kind[] = ['boot', 'shoe', 'heel', 'child', 'shoe', 'boot', 'heel', 'shoe'];
    const pieces: THREE.BufferGeometry[] = [];
    const upright: { x: number; z: number; kind: Kind }[] = [];
    const matrix = new THREE.Matrix4();
    for (let p = 0; p < pairs; p++) {
      const kind = kinds[Math.floor(random() * kinds.length)];
      const px = -length / 2 + 0.4 + p * pitch + pitch / 2 + (random() - 0.5) * 0.15;
      const pz = 0.34 + (random() - 0.5) * 0.08;
      const splay = (random() - 0.5) * 0.4;
      const tipped = random() < 0.18 + mood.wear * 0.15;
      for (const side of [-1, 1]) {
        const width = kind === 'child' ? 0.045 : 0.065;
        const knocked = tipped && side === 1;
        const turn = splay + side * 0.06 + (knocked ? (random() - 0.5) * 1.6 : 0);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn, knocked ? 1.45 : 0, 'YXZ'));
        const x = px + side * width + (knocked ? 0.08 : 0), z = pz + (knocked ? -0.05 : side * 0.01);
        matrix.compose(new THREE.Vector3(x, top + (knocked ? (kind === 'child' ? 0.035 : 0.05) : 0), z), q, new THREE.Vector3(1, 1, 1));
        for (const part of shoe(kind)) pieces.push(flat(part.applyMatrix4(matrix)));
        if (!knocked) upright.push({ x, z, kind });
      }
    }
    const casting = mergeGeometries(pieces, false)!;
    for (const piece of pieces) piece.dispose();
    s.mesh(casting, iron);

    // What has been left.
    const tribute = paintHex(a.tribute, '#c8102e');
    const glow = new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: '#ffb648', emissiveIntensity: mix(1.2, 2.4, lowSun), roughness: 0.5 });
    const chosen = upright.filter(() => random() < 0.45);
    const flames: THREE.Mesh[] = [];
    if (a.left === 'candles') {
      const glass = s.material(tribute, { roughness: 0.3, transparent: true, opacity: 0.85 });
      for (let i = 0; i < Math.max(3, Math.round(pairs * 0.6)); i++) {
        const x = -length / 2 + 0.6 + random() * (length - 1.2), z = 0.12 + random() * 0.08;
        s.cylinder(0.028, 0.026, 0.07, [x, top + 0.035, z], glass, 10);
        flames.push(s.ball([0.012, 0.022, 0.012], [x, top + 0.09, z], glow, 6));
      }
    }
    if (a.left === 'flowers') {
      const stem = s.material('#3d5a2e');
      const head = s.material(tribute, { roughness: 0.7 });
      for (const shoeAt of chosen) {
        const tip: [number, number, number] = [shoeAt.x + (random() - 0.5) * 0.1, top + 0.1, shoeAt.z + 0.12];
        s.rod([shoeAt.x, top + 0.05, shoeAt.z - 0.08], tip, 0.004, stem);
        s.ball([0.025, 0.02, 0.025], tip, head, 8);
      }
    }
    if (a.left === 'pebbles') {
      const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), s.material('#b8b2a4', { roughness: 0.9 }), Math.max(1, chosen.length * 3));
      let n = 0;
      for (const shoeAt of chosen) for (let k = 0; k < 1 + Math.floor(random() * 3); k++) {
        matrix.compose(new THREE.Vector3(shoeAt.x + (random() - 0.5) * 0.04, top + 0.09, shoeAt.z + 0.06 + random() * 0.04), new THREE.Quaternion(), new THREE.Vector3(0.016, 0.011, 0.014).multiplyScalar(0.8 + random() * 0.6));
        stones.setMatrixAt(n++, matrix);
        stones.setColorAt(n - 1, new THREE.Color(['#b8b2a4', '#8a867c', '#d8d2c4'][n % 3]));
      }
      stones.count = n;
      stones.castShadow = true;
      s.root.add(stones);
    }
    if (a.left === 'ribbons') {
      const ribbon = s.material(tribute, { roughness: 0.6, side: THREE.DoubleSide });
      for (const shoeAt of chosen) s.tube([[shoeAt.x - 0.03, top + 0.08, shoeAt.z], [shoeAt.x + 0.02, top + 0.09, shoeAt.z + 0.02], [shoeAt.x + 0.06, top + 0.02, shoeAt.z + 0.1], [shoeAt.x + 0.09, top + 0.004, shoeAt.z + 0.18]], 0.006, ribbon);
    }
    if (wet) {
      const puddle = new THREE.MeshStandardMaterial({ color: '#7d8a8c', roughness: 0.02, metalness: 0.5 });
      for (let i = 0; i < Math.round(length * 0.8); i++) {
        const disc = s.mesh(new THREE.CircleGeometry(1, 16), puddle, [-length / 2 + random() * length, QY + 0.004, -0.2 - random() * 0.8]);
        disc.rotation.x = -Math.PI / 2;
        disc.scale.set(0.1 + random() * 0.25, 0.06 + random() * 0.15, 1);
        disc.castShadow = false;
      }
    }

    // A visitor.
    let person: ReturnType<typeof figure> | null = null;
    if (a.visitor !== 'none') {
      const kneel = a.visitor === 'kneeling';
      person = figure(s, { height: 1.72, pose: kneel ? 'kneeling' : 'standing', style: 'doll', hair: random() < 0.5 ? 'hat' : 'short', top: '#2b2a2c', bottom: '#232224', shoes: '#151515', skin: '#d9b08c', gaze: 'down', sleeves: 'long' });
      s.root.add(person.root);
      const x = (random() - 0.5) * Math.min(1.5, length * 0.4);
      person.root.position.set(x, QY, kneel ? -0.25 : -0.5);
      if (kneel) {
        s.root.updateMatrixWorld(true);
        const target = upright.reduce((best, u) => (Math.abs(u.x - x) < Math.abs(best.x - x) ? u : best), upright[0] ?? { x, z: 0.3, kind: 'shoe' as Kind });
        person.reach('right', new THREE.Vector3(target.x, top + 0.1, target.z - 0.05), { space: s.root });
      }
    }

    const flicker = mix(1, 6, mood.energy);
    return s.finish({
      update: (dt, time) => {
        person?.update(dt, time);
        flames.forEach((flame, i) => { flame.scale.y = 0.022 * (0.8 + 0.3 * Math.sin(time * flicker + i * 1.7)); });
      },
    });
  },
});
