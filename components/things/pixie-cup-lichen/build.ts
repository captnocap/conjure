import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';
import { Bag, type V3, at, ball, lumpy, painted, water } from './bits';

const SHAPES = {
  goblet: 'Classic goblets: a slim stem flaring to a wide round cup.',
  trumpet: 'Tall slender trumpets, widening only gradually to a narrow mouth.',
  eggcup: 'Squat stubby egg-cups, almost all bowl.',
  horn: 'Pointed awl-shaped horns with no cup at all, like a field of little tusks.',
} as const;
const TINTS = {
  sage: { hex: '#b3c2a2', text: 'Pale grey-green, the usual colour.' },
  mint: { hex: '#bcdcc6', text: 'Cool mint, fresh and damp.' },
  blue: { hex: '#a7b9c0', text: 'Bluish grey, like weathered lead.' },
  sulphur: { hex: '#cdd294', text: 'Yellowish green, dusted with sulphur.' },
  ash: { hex: '#d9dad0', text: 'Ash white, dry and chalky.' },
} as const;
type Tint = keyof typeof TINTS;
const CONTENTS = {
  empty: 'Nothing: dry empty cups.',
  water: 'A bead of rainwater in each cup.',
  red: 'Scarlet fruiting knobs studding the rims, like sealing wax.',
  brown: 'Dull brown fruiting knobs on the rims.',
  tiered: 'Smaller cups sprouting from the rims of the big ones, tier on tier.',
  seed: 'A single fallen seed lodged in one cup like an offering.',
} as const;
const GROUNDS = {
  bark: 'A flake of dark furrowed bark.',
  wood: 'A pale chunk of soft rotting wood.',
  stone: 'A flat grey pebble.',
  soil: 'A crust of bare dark peaty soil.',
  post: 'The sawn, weathered top of an old fence post.',
} as const;

function cup(shape: keyof typeof SHAPES, H: number, R: number, r: number) {
  const outline: [number, number][] =
    shape === 'horn'
      ? [[r * 1.35, 0], [r * 1.05, 0.12], [r * 0.95, 0.4], [r * 0.7, 0.7], [r * 0.35, 0.9], [0.02, 1]]
      : shape === 'trumpet'
        ? [[r * 1.3, 0], [r, 0.1], [r * 0.9, 0.4], [r * 1.05, 0.65], [mix(r, R, 0.55), 0.85], [R * 0.95, 0.96], [R, 1], [R * 0.82, 0.985], [R * 0.4, 0.9], [0.02, 0.86]]
        : shape === 'eggcup'
          ? [[r * 1.4, 0], [r * 1.1, 0.12], [r * 1.05, 0.3], [R * 0.7, 0.5], [R * 0.97, 0.8], [R, 1], [R * 0.86, 0.97], [R * 0.6, 0.72], [0.02, 0.58]]
          : [[r * 1.3, 0], [r, 0.1], [r * 0.85, 0.42], [r, 0.58], [R * 0.6, 0.76], [R * 0.94, 0.93], [R, 1], [R * 0.86, 0.975], [R * 0.5, 0.84], [0.02, 0.76]];
  return new THREE.LatheGeometry(outline.map(([x, y]) => new THREE.Vector2(x, y * H)), 18);
}
const floorOf = (shape: keyof typeof SHAPES) => ({ goblet: 0.76, trumpet: 0.86, eggcup: 0.58, horn: 1 })[shape];

export default defineThing({
  questions: {
    shape: choice('What shape are the lichen stalks?', SHAPES),
    tint: choice('What colour is the lichen?', Object.fromEntries(Object.entries(TINTS).map(([key, value]) => [key, value.text])) as Record<Tint, string>),
    contents: choice('If they have cups, what is in or on them?', CONTENTS),
    ground: choice('What are they growing on?', GROUNDS),
    crowd: score('How many are there?', ['Two or three', 'A small cluster', 'A crowded colony']),
    height: score('How tall do they stand?', ['Low and stubby', 'Middling', 'Tall and spindly']),
    fallen: noul('Has one snapped off and fallen on its side?'),
    moss: noul('Is green moss creeping in around their feet?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const bag = new Bag();
    const crust = s.material('#ffffff', { roughness: 0.95, side: THREE.DoubleSide });
    const matte = s.material('#ffffff', { roughness: 0.9 });
    const gloss = s.material('#ffffff', { roughness: 0.25, emissive: '#5a0d08', emissiveIntensity: a.contents === 'red' ? mix(0.3, 0.9, mood.cheer) : 0 });
    const wet = water();
    const tint = new THREE.Color(TINTS[a.tint].hex).lerp(new THREE.Color('#9a9484'), mood.wear * 0.35).offsetHSL((mood.warmth - 0.5) * 0.05, 0, 0);

    // Substrate.
    let top = 3;
    const spread = 12.5;
    if (a.ground === 'bark' || a.ground === 'wood') {
      const shape = new THREE.Shape(), n = 12;
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2, r = spread * (1.2 + random() * 0.35);
        if (i === 0) shape.moveTo(Math.cos(t) * r * 1.25, Math.sin(t) * r * 0.9); else shape.lineTo(Math.cos(t) * r * 1.25, Math.sin(t) * r * 0.9);
      }
      const thick = a.ground === 'bark' ? 3.2 : 6;
      top = thick + 1;
      bag.add(matte, new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelThickness: 1, bevelSize: 1.2, bevelSegments: 1 }), at([0, thick + 1, 0], [Math.PI / 2, 0, 0]), a.ground === 'bark' ? '#4c392b' : '#a58a66');
      for (let i = 0; i < 12; i++) bag.add(matte, new THREE.BoxGeometry(spread * (0.8 + random() * 1.4), 0.8, 0.9 + random()), at([(random() - 0.5) * spread * 1.6, top + 0.1, (random() - 0.5) * spread * 1.7], [0, (random() - 0.5) * 0.25, 0]), a.ground === 'bark' ? '#34261c' : '#7d6446');
    } else if (a.ground === 'stone') {
      top = 7.5;
      bag.add(s.material('#ffffff', { roughness: 0.6 }), lumpy(ball(1, 20), 0.06, 2.4, random() * 9), at([0, 3.4, 0], [0, random() * 3, 0], [spread * 1.5, 4.4, spread * 1.25]), '#8f9394');
    } else if (a.ground === 'soil') {
      top = 3.4;
      bag.add(matte, lumpy(ball(1, 20), 0.12, 4, random() * 9), at([0, 0.4, 0], [0, 0, 0], [spread * 1.5, 3.3, spread * 1.3]), '#2f241c');
      for (let i = 0; i < 30; i++) {
        const t = random() * 6.3, r = spread * (0.5 + random() * 0.95);
        bag.add(matte, new THREE.DodecahedronGeometry(0.5 + random() * 1.1), at([Math.cos(t) * r * 1.2, 1.6 * (1 - r / (spread * 1.5)) + 0.8, Math.sin(t) * r], [random() * 3, random() * 3, 0]), random() < 0.25 ? '#5e4a36' : '#2a2019');
      }
    } else {
      top = 16;
      const rings = painted(256, 256, (ctx, w) => {
        ctx.fillStyle = '#9b9486';
        ctx.fillRect(0, 0, w, w);
        for (let r = 8; r < w * 0.8; r += 8 + random() * 7) {
          ctx.strokeStyle = random() < 0.5 ? '#6f685c' : '#b7b0a1';
          ctx.lineWidth = 2 + random() * 3;
          ctx.beginPath();
          ctx.arc(w * 0.42, w * 0.56, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.strokeStyle = '#3b352d';
        ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
          const t = random() * 6.3;
          ctx.beginPath();
          ctx.moveTo(w * 0.42 + Math.cos(t) * 12, w * 0.56 + Math.sin(t) * 12);
          ctx.lineTo(w * 0.42 + Math.cos(t) * 190, w * 0.56 + Math.sin(t) * 190);
          ctx.stroke();
        }
      });
      const side = s.material('#8a8377', { roughness: 0.95 });
      const post = new THREE.Mesh(new THREE.BoxGeometry(spread * 2.5, top, spread * 2.5), [side, side, s.material('#ffffff', { map: rings, roughness: 0.95 }), side, side, side]);
      post.position.y = top / 2;
      post.castShadow = post.receiveShadow = true;
      s.root.add(post);
      for (let i = 0; i < 10; i++) for (const face of [0, 1, 2, 3]) bag.add(matte, new THREE.BoxGeometry(0.5, top * (0.4 + random() * 0.6), 0.3), at([Math.cos(face * Math.PI / 2) * spread * 1.26 + (face % 2 ? (random() - 0.5) * spread * 2.3 : 0), top * 0.5, Math.sin(face * Math.PI / 2) * spread * 1.26 + (face % 2 ? 0 : (random() - 0.5) * spread * 2.3)], [0, face % 2 ? 0 : Math.PI / 2, 0]), '#5f594f');
    }

    // The cups.
    const count = Math.round(mix(2, 15, clamp01(a.crowd * 0.8 + mood.density * 0.2)));
    const spots: { x: number; z: number; R: number }[] = [];
    const addCup = (base: V3, H: number, R: number, r: number, lean: V3, shape: keyof typeof SHAPES, colour: THREE.Color, depth: number) => {
      const pose = at(base, lean);
      bag.add(crust, lumpy(cup(shape, H, R, r), 0.05, 1.3 / Math.max(r, 0.4), random() * 9), pose, colour);
      // Mealy granules on the outside.
      for (let i = 0; i < 9; i++) {
        const y = random(), t = random() * 6.3, rr = shape === 'horn' ? r * (1 - y * 0.8) : y < 0.6 ? r : mix(r, R, (y - 0.6) / 0.4);
        bag.add(crust, new THREE.IcosahedronGeometry(Math.max(0.12, r * (0.16 + random() * 0.16)), 0), pose.clone().multiply(at([Math.cos(t) * rr, y * H * 0.95, Math.sin(t) * rr])), colour.clone().offsetHSL(0, 0, 0.05));
      }
      if (shape === 'horn' || depth > 0) return;
      const mouth = floorOf(shape) * H;
      const filled = random() < 0.8;
      if (a.contents === 'water' && filled) {
        const pool = new THREE.Mesh(new THREE.SphereGeometry(R * 0.86, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), wet);
        pool.applyMatrix4(pose.clone().multiply(at([0, H * 0.93, 0], [0, 0, 0], [1, 0.3, 1])));
        s.root.add(pool);
        const glint = new THREE.Mesh(ball(R * 0.14, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false }));
        glint.applyMatrix4(pose.clone().multiply(at([-R * 0.3, H * 0.93 + R * 0.26, R * 0.3])));
        s.root.add(glint);
        bag.add(matte, new THREE.CircleGeometry(R * 0.84, 14), pose.clone().multiply(at([0, H * 0.94, 0], [-Math.PI / 2, 0, 0])), '#6f8f96');
      }
      if ((a.contents === 'red' || a.contents === 'brown') && filled) {
        const knobs = 4 + Math.floor(random() * 5);
        for (let i = 0; i < knobs; i++) {
          const t = (i / knobs) * Math.PI * 2 + random() * 0.5;
          bag.add(gloss, ball(R * (0.16 + random() * 0.12), 8), pose.clone().multiply(at([Math.cos(t) * R, H * 1.02, Math.sin(t) * R])), a.contents === 'red' ? '#d5281c' : '#6b4630');
        }
      }
      if (a.contents === 'tiered' && filled) {
        const sprouts = 2 + Math.floor(random() * 4);
        for (let i = 0; i < sprouts; i++) {
          const t = (i / sprouts) * Math.PI * 2 + random();
          const rim = new THREE.Vector3(Math.cos(t) * R * 0.95, H * 0.98, Math.sin(t) * R * 0.95).applyMatrix4(pose);
          addCup([rim.x, rim.y, rim.z], H * (0.3 + random() * 0.2), R * 0.42, r * 0.42, [lean[0] + Math.sin(t) * 0.5, 0, lean[2] - Math.cos(t) * 0.5], shape, colour.clone().offsetHSL(0, 0, 0.03), depth + 1);
        }
      }
      return mouth;
    };

    let seeded = false;
    for (let i = 0; i < count; i++) {
      let x = 0, z = 0, tries = 0;
      const tall = mix(12, 27, a.height) * mix(0.55, 1.2, random()) * (i === 0 ? 1.15 : 1);
      const R = a.shape === 'trumpet' ? tall * 0.21 : a.shape === 'eggcup' ? Math.max(tall * 0.32, 2.6) : a.shape === 'horn' ? 0 : Math.max(tall * 0.27, 2.2);
      const stem = a.shape === 'horn' ? tall * 0.07 + 0.5 : Math.max(0.55, R * 0.3);
      do {
        const t = random() * 6.3, r = Math.sqrt(random()) * spread * mix(0.45, 1, clamp01(count / 10));
        x = Math.cos(t) * r * 1.15; z = Math.sin(t) * r * 0.9;
      } while (tries++ < 30 && spots.some((p) => Math.hypot(p.x - x, p.z - z) < (p.R + Math.max(R, stem * 1.5)) * 0.95));
      spots.push({ x, z, R: Math.max(R, stem * 1.5) });
      const colour = tint.clone().offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.07);
      const lean: V3 = [(random() - 0.5) * 0.3, random() * 6.3, (random() - 0.5) * 0.3];
      if (a.fallen && i === count - 1) {
        // The snapped one: a stump left standing and the cup lying beside it.
        bag.add(crust, new THREE.CylinderGeometry(stem * 0.9, stem * 1.2, tall * 0.2, 9), at([x, top + tall * 0.1, z]), colour);
        bag.add(matte, new THREE.CircleGeometry(stem * 0.85, 9), at([x, top + tall * 0.2 + 0.02, z], [-Math.PI / 2, 0, 0]), '#efe9d6');
        const turn = random() * 6.3, lie = Math.max(R, stem) * 0.9 + 0.2;
        addCup([x + Math.cos(turn) * stem * 3, top + lie, z + Math.sin(turn) * stem * 3], tall * 0.8, R, stem, [Math.PI / 2 - 0.08, 0, turn], a.shape, colour, 1);
        continue;
      }
      addCup([x, top - 0.3, z], tall, R, stem, lean, a.shape, colour, 0);
      if (a.contents === 'seed' && !seeded && a.shape !== 'horn') {
        seeded = true;
        bag.add(s.material('#ffffff', { roughness: 0.4 }), ball(1, 10), at([x, top + tall * 0.95, z], [0.4, random() * 3, 0.3], [R * 0.58, R * 0.34, R * 0.4]), '#b9823f');
      }
    }

    // Basal scales, and optionally moss.
    const flakes = Math.round(mix(30, 80, mood.density));
    for (let i = 0; i < flakes; i++) {
      const near = spots[Math.floor(random() * spots.length)], t = random() * 6.3, d = near.R * 0.4 + random() * 4.5, size = 0.9 + random() * 1.5;
      bag.add(crust, lumpy(new THREE.CylinderGeometry(size, size * 0.6, 0.3, 7), 0.2, 2, i), at([near.x + Math.cos(t) * d, top + 0.15 + random() * 0.3, near.z + Math.sin(t) * d], [(random() - 0.5) * 0.9, random() * 3, (random() - 0.5) * 0.9]), tint.clone().offsetHSL(0, 0.02, (random() - 0.5) * 0.12));
    }
    if (a.moss) {
      const green = new THREE.Color().setHSL(mix(0.32, 0.22, mood.warmth), mix(0.4, 0.7, mood.cheer), 0.34);
      for (let clump = 0; clump < 4; clump++) {
        const t = random() * 6.3, cx = Math.cos(t) * spread * 0.95, cz = Math.sin(t) * spread * 0.8, size = 3.5 + random() * 3;
        bag.add(matte, ball(1, 10), at([cx, top, cz], [0, 0, 0], [size, size * 0.4, size]), green.clone().multiplyScalar(0.7));
        for (let i = 0; i < 45; i++) {
          const u = random() * 6.3, r = Math.sqrt(random()) * size;
          bag.add(crust, new THREE.ConeGeometry(0.28, 1.6 + random() * 1.6, 4, 1, true), at([cx + Math.cos(u) * r, top + size * 0.4 * Math.sqrt(1 - (r / size) ** 2) + 0.6, cz + Math.sin(u) * r], [Math.sin(u) * r * 0.12, 0, -Math.cos(u) * r * 0.12]), green.clone().offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.14));
        }
      }
    }
    bag.flush(s.root);
    

    s.root.scale.setScalar(0.002);
    return s.finish();
  },
});
