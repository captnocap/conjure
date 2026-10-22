import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { carvedDecal, crow, instanced, sheep, solid, stoneGeometry, stoneMaterial, tufts, type Dab } from './stone';

const ROCK = {
  sarsen: 'Pale grey sarsen sandstone, hard and silvery, the Stonehenge stone.',
  bluestone: 'Dark blue-grey spotted dolerite, dragged from far mountains.',
  sandstone: 'Rust-red sandstone, warm and soft-edged.',
  limestone: 'Honey-pale limestone, pitted and holed by rain.',
  granite: 'Pinkish coarse granite, blunt and massive.',
  basalt: 'Near-black volcanic rock, grim and heavy.',
} as const;
const ROCK_TINT: Record<keyof typeof ROCK, string> = {
  sarsen: '#a9a79f', bluestone: '#5f6c78', sandstone: '#a8674a', limestone: '#cdbb93', granite: '#b3948b', basalt: '#4a4744',
};

export default defineThing({
  questions: {
    rock: choice('What stone is it made of?', ROCK),
    state: choice('What has become of it?', {
      standing: 'Complete: both uprights standing and the lintel square across them.',
      slipped: 'The lintel has slewed round and hangs off one end, about to go.',
      'lintel-down': 'The lintel has fallen and lies broken at the foot; the uprights stand alone with their tenon knobs bare.',
      'half-fallen': 'One upright has gone over full length, taking the lintel with it; the other stands alone.',
      raising: 'Still being built: the lintel rests on a tall crib of stacked logs with levers and ropes, not yet set.',
    }),
    stature: score('How big is it?', ['A little taller than a person', 'Twice a person', 'Towering, seven metres of stone']),
    lean: score('How far has it leaned?', ['Plumb and true', 'A slight tilt', 'Alarmingly out of true']),
    dressing: choice('How were the stones worked?', {
      dressed: 'Carefully dressed: flat faces, straight edges, a neat rectangular lintel.',
      rough: 'Barely shaped natural slabs, lumpy and irregular.',
      slender: 'Tall thin pillars with a light lintel, elegant and precarious.',
      squat: 'Massive stubby blocks, more wall than doorway.',
    }),
    growth: choice('What grows on the stone?', {
      bare: 'Nothing: clean stone.',
      'orange-lichen': 'Crusts of orange and yellow lichen in bright blotches.',
      'grey-lichen': 'Pale grey-green lichen all over, like old paint.',
      moss: 'Deep green moss on the tops and the damp side.',
      soot: 'Black streaks of soot and smoke from fires lit beneath it.',
    }),
    carving: choice('If anything is cut into the face, what?', {
      none: 'Nothing is carved on it.',
      daggers: 'Faint bronze-age axe and dagger shapes.',
      spirals: 'Pecked spirals and concentric rings.',
      graffiti: 'Initials and dates cut by visitors centuries ago.',
      handprints: 'Painted red-ochre handprints.',
    }),
    foot: choice('What is at its foot?', {
      nothing: 'Nothing but grass.',
      packing: 'Packing stones wedged around the bases.',
      offerings: 'Flowers, candles and small offerings laid in the doorway.',
      sheep: 'Sheep sheltering against the stones.',
      barrier: 'A low rope barrier and a small information board for visitors.',
      rubble: 'Broken fragments and chips fallen from the stones.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(2.7, 7.2, a.stature) * mix(0.94, 1.06, random());
    const shape = {
      dressed: { w: 0.33, d: 0.17, round: 0.16, rough: 0.012, taper: 0.9, lintel: 0.15 },
      rough: { w: 0.36, d: 0.2, round: 0.26, rough: 0.021, taper: 0.76, lintel: 0.17 },
      slender: { w: 0.24, d: 0.14, round: 0.25, rough: 0.016, taper: 0.82, lintel: 0.1 },
      squat: { w: 0.5, d: 0.26, round: 0.2, rough: 0.022, taper: 0.92, lintel: 0.2 },
    }[a.dressing];
    const w = H * shape.w, d = H * shape.d;
    const gap = H * mix(0.1, 0.26, random()) * (a.dressing === 'squat' ? 0.7 : 1);
    const lh = H * shape.lintel, ll = 2 * w + gap + H * 0.04, ld = d * 1.12;
    const frost = mood.warmth < 0.3 ? mix(0.9, 0, mood.warmth / 0.3) : 0;
    const base = new THREE.Color(ROCK_TINT[a.rock]).lerp(new THREE.Color('#d8a56a'), Math.max(0, mood.warmth - 0.6) * 0.5);
    const patches = {
      bare: [],
      'orange-lichen': [{ color: '#d9952b', amount: 0.42, scale: 2.6 }, { color: '#e9dc7a', amount: 0.22, scale: 4 }],
      'grey-lichen': [{ color: '#c9d1b6', amount: 0.75, scale: 2 }, { color: '#8e9a78', amount: 0.3, scale: 3.4 }],
      moss: [{ color: '#3c5524', amount: 0.6, scale: 1.4, up: 2.4 }, { color: '#56682c', amount: 0.25, scale: 3, up: 1.5 }],
      soot: [{ color: '#1d1a18', amount: 0.55, scale: 1.1 }],
    }[a.growth];
    const material = stoneMaterial();
    const rough = shape.rough * H * mix(0.8, 1.5, mood.wear);
    const block = (size: readonly [number, number, number], taper: number, round = shape.round) =>
      solid(stoneGeometry(random, { size, taper, round: round + mood.wear * 0.07, rough, base, patches, damp: 0.7, frost, segments: 14 }), material);

    const tilt = (a.lean * 0.16 + mood.wear * 0.03) * (random() < 0.5 ? -1 : 1);
    const frame = new THREE.Group();
    frame.rotation.z = a.state === 'raising' ? tilt * 0.15 : tilt;
    frame.rotation.x = (random() - 0.5) * 0.05 * (1 + a.lean * 2);
    s.root.add(frame);
    const sink = H * 0.06;
    const top = H - sink;
    const fallen = a.state === 'half-fallen' ? (random() < 0.5 ? -1 : 1) : 0;
    const tenons = a.state !== 'standing';
    const upX = gap / 2 + w / 2;

    for (const side of [-1, 1]) {
      const upright = new THREE.Group();
      const heightHere = H * (side === 1 ? 1 : mix(0.97, 1.02, random()));
      upright.add(block([w, heightHere, d], shape.taper));
      if (tenons) {
        const knob = solid(new THREE.SphereGeometry(1, 10, 6), material.clone());
        (knob.material as THREE.MeshStandardMaterial).vertexColors = false;
        (knob.material as THREE.MeshStandardMaterial).color.copy(base).multiplyScalar(0.9);
        knob.scale.set(w * 0.13, w * 0.09, d * 0.22);
        knob.position.y = heightHere - rough;
        upright.add(knob);
      }
      if (side === fallen) {
        // Lying full length on the grass, pointing away behind the survivor.
        upright.rotation.set(-Math.PI / 2 + 0.05, 0, (random() - 0.5) * 0.25, 'YXZ');
        upright.rotation.y = side * mix(0.2, 0.6, random());
        upright.position.set(side * upX * 1.15, d * 0.42, -d * 0.4);
        s.root.add(upright);
      } else {
        upright.position.set(side * upX, -sink, 0);
        upright.rotation.z = (random() - 0.5) * 0.035 * (1 + a.lean * 3);
        upright.rotation.y = (random() - 0.5) * 0.14;
        (a.state === 'half-fallen' ? s.root : frame).add(upright);
        if (a.state === 'half-fallen') upright.rotation.z += tilt;
      }
    }

    const lintel = new THREE.Group();
    if (a.state === 'lintel-down') {
      // Broken across the middle where it struck.
      const first = block([ll * 0.56, lh, ld], 0.96), second = block([ll * 0.4, lh, ld], 0.94);
      first.position.x = -ll * 0.24;
      second.position.set(ll * 0.3, 0, ld * 0.25);
      second.rotation.set(0.12, -0.35, 0.1);
      lintel.add(first, second);
    } else lintel.add(block([ll, lh, ld], 0.97, shape.round * 0.8));
    if (a.state === 'standing') { lintel.position.y = top - rough; frame.add(lintel); }
    else if (a.state === 'slipped') {
      const end = random() < 0.5 ? -1 : 1;
      lintel.position.set(end * w * 0.5, top - rough * 0.5 + w * 0.07, d * 0.12);
      lintel.rotation.set(0.05, end * mix(0.22, 0.42, random()), -end * 0.11);
      frame.add(lintel);
    } else if (a.state === 'lintel-down') {
      lintel.position.set(w * 0.2, -lh * 0.18, d * 0.9 + ld);
      lintel.rotation.set(0.06, mix(-0.3, 0.3, random()), 0.04);
      s.root.add(lintel);
    } else if (a.state === 'half-fallen') {
      lintel.position.set(fallen * (upX + w * 0.2), -lh * 0.12, d * 1.3 + ld * 0.6);
      lintel.rotation.set(0.08, fallen * 0.75, fallen * 0.1);
      s.root.add(lintel);
    } else {
      // A crib of logs stacked crosswise, the lintel riding on top, levers and ropes still in place.
      const wood = new THREE.MeshStandardMaterial({ color: '#8a6a45', roughness: 0.9 });
      const r = Math.max(0.09, H * 0.024), cribD = Math.max(ld * 1.6, 1.1), cribW = ll * 0.92;
      const cribZ = d / 2 + cribD / 2 + r;
      const layers = Math.max(3, Math.round((top * mix(0.55, 0.92, random())) / (r * 2)));
      const logs: Dab[] = [];
      for (let layer = 0; layer < layers; layer++) {
        const along = layer % 2 === 0;
        const n = along ? 3 : Math.max(3, Math.round(cribW / (r * 9)));
        for (let i = 0; i < n; i++) {
          const t = n === 1 ? 0 : i / (n - 1) - 0.5;
          logs.push(along
            ? { at: [(random() - 0.5) * 0.1, r + layer * r * 1.9, cribZ + t * (cribD - r * 2)], scale: [r, cribW + random() * 0.4, r], turn: [0, 0, Math.PI / 2], color: random() < 0.5 ? '#8a6a45' : '#74583a' }
            : { at: [t * (cribW - r * 3), r + layer * r * 1.9, cribZ + (random() - 0.5) * 0.1], scale: [r, cribD + random() * 0.3, r], turn: [Math.PI / 2, 0, 0], color: random() < 0.5 ? '#93714b' : '#6c5236' });
        }
      }
      const logGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
      s.root.add(instanced(logGeometry, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), logs));
      const cribTop = layers * r * 1.9 + r * 0.4;
      lintel.position.set(0, cribTop, cribZ);
      lintel.rotation.y = (random() - 0.5) * 0.12;
      s.root.add(lintel);
      const rope = new THREE.MeshStandardMaterial({ color: '#c9b78c', roughness: 1 });
      for (const side of [-1, 1]) {
        s.rod([side * ll * 0.34, cribTop + lh * 0.6, cribZ], [side * (ll * 0.5 + H * 0.3), 0, cribZ + cribD * 0.5 + H * 0.35], H * 0.008, rope);
        s.rod([side * (ll * 0.5 + H * 0.12), 0, cribZ + cribD * 0.2], [side * ll * 0.3, cribTop + lh * 0.2, cribZ + cribD * 0.42], r * 0.7, wood, r * 0.5);
      }
      for (const side of [-1, 1]) s.rod([side * ll * 0.34, cribTop + lh * 0.6, cribZ - ld * 0.3], [side * ll * 0.3, top + H * 0.02, 0], H * 0.008, rope);
    }

    // Marks on the front of the left upright.
    if (a.carving !== 'none' && fallen !== -1) {
      const dw = w * 0.74, dh = H * 0.3;
      const decal = carvedDecal(dw, dh, (ctx, cw, ch) => {
        ctx.lineWidth = 5;
        if (a.carving === 'daggers') {
          for (let i = 0; i < 3; i++) {
            const x = cw * (0.25 + i * 0.25), y = ch * (0.3 + random() * 0.35);
            ctx.beginPath(); ctx.moveTo(x, y - ch * 0.16); ctx.lineTo(x - cw * 0.05, y + ch * 0.04); ctx.lineTo(x + cw * 0.05, y + ch * 0.04); ctx.closePath(); ctx.fill();
            ctx.fillRect(x - cw * 0.012, y + ch * 0.04, cw * 0.024, ch * 0.09);
            ctx.fillRect(x - cw * 0.05, y + ch * 0.12, cw * 0.1, ch * 0.02);
          }
        } else if (a.carving === 'spirals') {
          for (let i = 0; i < 3; i++) {
            const x = cw * (0.3 + random() * 0.4), y = ch * (0.2 + i * 0.3), rr = cw * mix(0.14, 0.24, random());
            ctx.beginPath();
            for (let t = 0; t < 26; t += 0.2) ctx.lineTo(x + Math.cos(t) * rr * (t / 26), y + Math.sin(t) * rr * (t / 26));
            ctx.stroke();
          }
        } else if (a.carving === 'graffiti') {
          ctx.font = `bold ${cw * 0.2}px serif`;
          ctx.textAlign = 'center';
          const words = ['J.W. 1802', 'H+M', 'T. BRIDGER', '1763', 'A.S.', 'I WAS HERE'];
          for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.translate(cw * 0.5, ch * (0.18 + i * 0.22));
            ctx.rotate((random() - 0.5) * 0.25);
            ctx.fillText(words[Math.floor(random() * words.length)], 0, 0, cw * 0.9);
            ctx.restore();
          }
        } else {
          for (let i = 0; i < 5; i++) {
            const x = cw * (0.2 + random() * 0.6), y = ch * (0.15 + random() * 0.7), u = cw * 0.1;
            ctx.save(); ctx.translate(x, y); ctx.rotate((random() - 0.5) * 0.8);
            ctx.beginPath(); ctx.ellipse(0, 0, u * 0.8, u, 0, 0, 7); ctx.fill();
            for (let f = -2; f <= 2; f++) { ctx.beginPath(); ctx.ellipse(f * u * 0.38, -u * 1.5 + Math.abs(f) * u * 0.2, u * 0.16, u * 0.6, f * 0.2, 0, 7); ctx.fill(); }
            ctx.restore();
          }
        }
      }, a.carving === 'handprints' ? 'rgba(150,42,24,0.85)' : 'rgba(26,22,20,0.78)');
      decal.position.set(-upX, H * 0.42, d * 0.5 * (1 + shape.round * 0.12) + rough * 1.6);
      (a.state === 'half-fallen' ? s.root : frame).add(decal);
    }

    // What lies at the foot.
    const reach = upX + w * 0.5;
    if (a.foot === 'packing' || a.foot === 'rubble' || mood.wear > 0.75) {
      const n = Math.round(mix(7, 18, mood.density));
      const pebble = stoneGeometry(random, { size: [1, 0.6, 0.8], round: a.foot === 'rubble' ? 0.3 : 0.7, rough: 0.07, base, segments: 4 });
      const dabs: Dab[] = [];
      for (let i = 0; i < n; i++) {
        const side = random() < 0.5 ? -1 : 1;
        const spread = a.foot === 'packing' ? 0.75 : 1.5;
        const angle = random() * Math.PI * 2;
        dabs.push({ at: [side * upX + Math.cos(angle) * w * spread * 0.62, -0.03, Math.sin(angle) * d * spread * 0.9 + (a.foot === 'packing' ? 0 : d)], scale: H * mix(0.04, 0.085, random()), turn: [random() * 0.5, random() * 6.28, random() * 0.5] });
      }
      s.root.add(instanced(pebble, material, dabs));
    }
    if (a.foot === 'offerings') {
      const petals: Dab[] = [];
      const colours = mood.cheer > 0.45 ? ['#e8c22a', '#d9486b', '#f1ede2', '#8a5bd0', '#e97a2b'] : ['#f1ede2', '#b9b4a6', '#7d5a8c', '#d9c98a'];
      const bunches = Math.round(mix(3, 10, mood.density));
      const u = Math.max(0.09, H * 0.022);
      for (let b = 0; b < bunches; b++) {
        const bx = (random() - 0.5) * (gap + w * 1.4), bz = d * 0.6 + random() * d * 1.6;
        const colour = colours[Math.floor(random() * colours.length)];
        for (let i = 0; i < 7; i++) petals.push({ at: [bx + (random() - 0.5) * u * 3, u * (0.5 + random() * 1.2), bz + (random() - 0.5) * u * 3], scale: u * mix(0.7, 1.2, random()), color: colour });
        petals.push({ at: [bx, u * 0.4, bz], scale: [u * 2.2, u * 0.5, u * 2.2], color: '#4f7038' });
      }
      s.root.add(instanced(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), petals));
      const wax = s.material('#efe6cf'), flame = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff9d2e', emissiveIntensity: mix(0.8, 2.4, mood.warmth) });
      for (let i = 0; i < Math.round(mix(2, 7, mood.density)); i++) {
        const x = (random() - 0.5) * gap * 1.6, z = d * 0.55 + random() * d * 0.9, hgt = u * mix(1.6, 4, random());
        s.cylinder(u * 0.45, u * 0.5, hgt, [x, hgt / 2, z], wax, 8);
        s.mesh(new THREE.ConeGeometry(u * 0.35, u * 1.2, 6), flame, [x, hgt + u * 0.6, z]).castShadow = false;
      }
    }
    if (a.foot === 'sheep') {
      const flock = Math.round(mix(1, 5, mood.density));
      for (let i = 0; i < flock; i++) {
        const animal = sheep(random, random() < 0.45, mood.wear > 0.6 ? '#c9c1ad' : '#e9e3d2');
        const side = i % 2 === 0 ? -1 : 1;
        animal.position.set(side * (upX * mix(0.3, 1.5, random())), 0, d * 0.9 + random() * H * 0.3 + i * 0.3);
        animal.rotation.y = random() * 6.28;
        animal.scale.setScalar(mix(0.95, 1.25, random()));
        s.root.add(animal);
      }
    }
    if (a.foot === 'barrier') {
      const post = s.material('#5a5148'), rope = s.material('#d8d2bf');
      const n = 6, radius = reach + H * 0.22, ph = 0.55;
      let previous: [number, number, number] | null = null;
      for (let i = 0; i < n; i++) {
        const angle = Math.PI * (0.08 + (0.84 * i) / (n - 1));
        const at: [number, number, number] = [Math.cos(angle) * radius, ph, Math.sin(angle) * radius * 0.55 + d];
        s.cylinder(0.035, 0.04, ph, [at[0], ph / 2, at[2]], post, 8);
        if (previous) s.tube([previous, [(previous[0] + at[0]) / 2, ph - 0.12, (previous[2] + at[2]) / 2], at], 0.014, rope);
        previous = at;
      }
      const boardX = radius * 0.72, boardZ = d + radius * 0.62;
      s.rod([boardX, 0, boardZ], [boardX, 0.75, boardZ], 0.035, post);
      const board = s.label('ANCIENT MONUMENT', 0.75, 0.42, [boardX, 0.88, boardZ + 0.03], '#f0ead8', '#3d5c48');
      board.rotation.x = -0.5;
      s.box([0.8, 0.46, 0.03], [boardX, 0.88, boardZ], post).rotation.x = -0.5;
    }

    // Grass at the foot, rimed when it is cold.
    const green = frost > 0.3 ? ['#a9bdb0', '#8fa894', '#c3d2cc'] : mood.warmth > 0.65 ? ['#a7a25a', '#8c9450', '#c2b56b'] : ['#5f7d3c', '#6f8a45', '#4d6b35'];
    const blades: [number, number, number][] = [];
    for (let i = 0; i < Math.round(mix(28, 80, mood.density)); i++) {
      const side = random() < 0.5 ? -1 : 1;
      const angle = random() * Math.PI * 2, ring = mix(0.55, 1.15, random());
      blades.push([side * upX + Math.cos(angle) * w * ring, 0, Math.sin(angle) * d * ring * 1.5]);
    }
    s.root.add(tufts(random, blades, green, Math.max(0.13, H * 0.045)));

    // A watcher on the lintel when the mood is dark.
    const birds: THREE.Object3D[] = [];
    if (mood.cheer < 0.38 && a.state !== 'raising') {
      const count = mood.cheer < 0.15 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const bird = crow();
        bird.scale.setScalar(Math.max(0.85, H * 0.17));
        const perch = a.state === 'standing' || a.state === 'slipped' ? top + lh - rough : top;
        const side = a.state === 'half-fallen' ? -fallen : i === 0 ? 1 : -1;
        bird.position.set(side * upX * mix(0.7, 1.1, random()), perch - sink * 0.2, 0);
        bird.rotation.y = random() * 6.28;
        (a.state === 'half-fallen' ? s.root : frame).add(bird);
        birds.push(bird);
      }
    }

    return s.finish({
      footprint: Math.max(reach, H * 0.35),
      update: birds.length ? (_dt, time) => { birds.forEach((bird, i) => { bird.rotation.z = Math.sin(time * mix(0.4, 2.2, mood.energy) + i * 2) * 0.08; }); } : undefined,
    });
  },
});
