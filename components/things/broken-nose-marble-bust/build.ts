import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { bustForm, headForm } from './head';

const STONES = {
  marble: { base: '#ece7dc', cavity: '#a79d8b', mottle: '#d3cab8', scar: '#9c8d76', rough: 0.42, metal: 0 },
  basalt: { base: '#44474b', cavity: '#1c1d1f', mottle: '#5a5650', scar: '#8b8e90', rough: 0.5, metal: 0.1 },
  plaster: { base: '#e2d3ad', cavity: '#9c8455', mottle: '#c9b382', scar: '#fbf8f0', rough: 0.9, metal: 0 },
  bronze: { base: '#6e4b2a', cavity: '#58b39a', mottle: '#5d6f55', scar: '#a9793c', rough: 0.38, metal: 0.7 },
} as const;
const PLAQUES = {
  caesar: 'IMP CAESAR', unknown: 'IGNOTVS', number: 'No. 114', touch: 'DO NOT TOUCH', roman: 'ROMAN II C.', blank: '',
} as const;

export default defineThing({
  questions: {
    who: choice('Who does the portrait suggest?', {
      emperor: 'An emperor: cropped comma locks under a laurel wreath, heavy jaw, a commanding brow.',
      philosopher: 'A philosopher: bald crown, a long clumped beard and a deeply furrowed brow.',
      matron: 'A Roman matron: centre-parted waved hair drawn back into a bun, with a braid wound round the crown.',
      youth: 'A youth: a soft unlined face under a mop of thick curls.',
      nobody: 'Nobody identifiable: features worn so smooth it could be anyone.',
    }),
    stone: choice('What is it made of?', {
      marble: 'White marble, cool and faintly veined.',
      basalt: 'Dark polished basalt, nearly black.',
      plaster: 'A yellowed plaster cast, chalk-white wherever it has chipped.',
      bronze: 'Weathered bronze streaked with green verdigris.',
    }),
    damage: choice('Besides the missing nose, how badly is it damaged?', {
      nose: 'The nose only: a rough scar in an otherwise whole face.',
      sheared: 'Half the face sheared clean away on one side, eye and cheek gone.',
      reattached: 'The head broke off once and was put back, with a dark seam and metal cramps round the neck.',
      shoulder: 'One shoulder and part of the chest smashed off, leaving a jagged slope.',
    }),
    pupils: choice('How are the eyes finished?', {
      blank: 'Blank smooth eyeballs, the classic blind stare.',
      drilled: 'Pupils drilled as small dark holes, giving it a direct gaze.',
      painted: 'Traces of the original paint: coloured irises that make it unnervingly alive.',
      hollow: 'Empty sockets where glass or silver inlays have fallen out.',
    }),
    gaze: choice('How is the head held?', {
      level: 'Level and straight ahead, official.',
      aside: 'Turned sharply to one side, mid-thought.',
      up: 'Tilted up and away, heroic and distant.',
      down: 'Bowed slightly, weary or grieving.',
    }),
    stand: choice('Where does it stand now?', {
      socle: 'On a turned round socle with a small tablet, as in a gallery.',
      herm: 'On a tall square tapering pillar, a herm at head height.',
      crate: 'Nested in straw in an open packing crate, in storage or in transit.',
      garden: 'On a socle outdoors, with ivy climbing it and moss in the folds.',
    }),
    plaque: choice('If it has a plaque, what does it say?', {
      caesar: 'IMP CAESAR, a confident attribution.',
      unknown: 'IGNOTVS, "unknown".',
      number: 'Only an inventory number.',
      touch: 'DO NOT TOUCH.',
      roman: 'A terse museum date.',
      blank: 'Nothing: the tablet is worn blank.',
    }),
    visitor: choice('What has someone or something left on it?', {
      nothing: 'Nothing.',
      pigeon: 'A pigeon standing on its head.',
      cone: 'An orange traffic cone jammed on its head by students.',
      wreath: 'A fresh wreath of flowers hung round its neck.',
      coins: 'A scatter of coins and a stub of candle at its foot, as offerings.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const stone = STONES[a.stone];
    const size = 0.125;
    const seed = context.seed;
    const garden = a.stand === 'garden';
    const tints = {
      base: stone.base, cavity: garden ? '#7f9160' : stone.cavity, scar: stone.scar, mottle: garden ? '#a8ad7c' : stone.mottle,
      cavityAmount: mix(0.45, 1.2, mood.wear) + (garden ? 0.5 : 0),
      mottleAmount: mix(0.1, 0.5, mood.wear),
    };
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: stone.rough + mood.wear * 0.2, metalness: stone.metal });
    const plain = new THREE.MeshStandardMaterial({ color: stone.base, roughness: stone.rough + mood.wear * 0.2, metalness: stone.metal });
    const side = random() < 0.5 ? -1 : 1;

    const cuts: { n: [number, number, number]; d: number }[] = [];
    const norm = (x: number, y: number, z: number, d: number) => { const l = Math.hypot(x, y, z); cuts.push({ n: [x / l, y / l, z / l], d }); };
    // Chips along the brow and crown; more of them as things wear.
    norm(-side * 0.5, 0.62, 0.6, mix(0.86, 0.78, mood.wear));
    if (mood.wear > 0.35) norm(side * 0.7, 0.1, 0.7, mix(0.8, 0.72, mood.wear));
    if (mood.wear > 0.6) norm(side * 0.3, -0.8, 0.5, 0.86);
    if (a.damage === 'sheared') norm(side * 0.85, 0.2, 0.45, mix(0.46, 0.36, random()));

    const who = {
      emperor: { hair: 'crop', jaw: 0.95, brow: 1.3, chin: 1.2, beard: 0, lips: 0.9, nose: 1.1, crisp: 1 },
      philosopher: { hair: 'bald', jaw: 0.55, brow: 1.5, chin: 0.8, beard: 1, lips: 0.8, nose: 1.05, crisp: 1 },
      matron: { hair: 'parted', jaw: 0.3, brow: 0.7, chin: 0.85, beard: 0, lips: 1.1, nose: 0.9, crisp: 1 },
      youth: { hair: 'curls', jaw: 0.4, brow: 0.6, chin: 0.9, beard: 0, lips: 1.2, nose: 0.85, crisp: 0.95 },
      nobody: { hair: 'bald', jaw: 0.5, brow: 0.6, chin: 0.6, beard: 0, lips: 0.6, nose: 0.9, crisp: 0.55 },
    }[a.who];
    const head = headForm({
      size, seed, ...tints, ...who, hair: who.hair as 'crop', moustache: who.beard, hairTint: stone.base,
      eyes: a.pupils === 'hollow' ? 'hollow' : 'open', smile: mix(-0.25, 0.2, mood.cheer),
      noseBreak: mix(0.75, 1, random()), cuts, lumpy: mix(0.01, 0.07, mood.wear), lumpScale: 7,
    });
    const headGroup = new THREE.Group();
    const headMesh = new THREE.Mesh(head.geometry, material);
    headMesh.castShadow = headMesh.receiveShadow = true;
    headGroup.add(headMesh);

    const add = (mesh: THREE.Mesh, parent: THREE.Object3D) => { mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    // Pupils sit on the carved eyeballs.
    if (a.pupils === 'drilled' || a.pupils === 'painted')
      for (const ex of [-0.31, 0.31]) {
        const spot = head.at(ex, 0.075);
        if (cuts.some((cut) => spot.p.x / size * cut.n[0] + spot.p.y / size * cut.n[1] + spot.p.z / size * cut.n[2] > cut.d - 0.08)) continue;
        const facing = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), spot.n);
        if (a.pupils === 'painted') {
          const iris = add(new THREE.Mesh(new THREE.CircleGeometry(size * 0.085, 16), new THREE.MeshStandardMaterial({ color: mood.warmth > 0.5 ? '#7a4a22' : '#3d6f8e', roughness: 0.7 })), headGroup);
          iris.position.copy(spot.p).addScaledVector(spot.n, size * 0.012); iris.quaternion.copy(facing);
        }
        const pupil = add(new THREE.Mesh(new THREE.CircleGeometry(size * (a.pupils === 'painted' ? 0.04 : 0.05), 12), new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.9 })), headGroup);
        pupil.position.copy(spot.p).addScaledVector(spot.n, size * 0.018); pupil.quaternion.copy(facing);
      }

    // Attributes: laurel, bun and braid.
    if (a.who === 'emperor') {
      const leaf = new THREE.SphereGeometry(1, 8, 6);
      leaf.scale(0.16 * size, 0.035 * size, 0.07 * size);
      const leaves = new THREE.InstancedMesh(leaf, plain, 44);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 44; i++) {
        const half = i % 2 ? 1 : -1, t = Math.floor(i / 2) / 21;
        const ang = half * mix(0.25, 2.95, t);
        const r = 0.86 + 0.05 * (i % 4 < 2 ? 1 : 0);
        e.set(0.25 * (i % 4 < 2 ? 1 : -1), ang + half * 1.2, -half * 0.35, 'YXZ');
        m.compose(new THREE.Vector3(Math.sin(ang) * r * 0.9 * size, (0.5 - 0.22 * Math.cos(ang)) * size + (i % 4 < 2 ? 0.05 : 0) * size, (Math.cos(ang) * r - 0.04) * size), q.setFromEuler(e), new THREE.Vector3(1, 1, 1));
        leaves.setMatrixAt(i, m);
      }
      leaves.castShadow = leaves.receiveShadow = true;
      headGroup.add(leaves);
    }
    if (a.who === 'matron') {
      add(new THREE.Mesh(new THREE.SphereGeometry(0.36 * size, 14, 10), plain), headGroup).position.set(0, -0.12 * size, -1.05 * size);
      const bead = new THREE.SphereGeometry(0.085 * size, 8, 6);
      const braid = new THREE.InstancedMesh(bead, plain, 56);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 56; i++) {
        const ang = (i / 56) * Math.PI * 2, wob = (i % 2 ? 1 : -1) * 0.035;
        m.makeTranslation(Math.sin(ang) * 0.7 * size, (0.74 + wob - 0.12 * Math.cos(ang)) * size, (Math.cos(ang) * 0.74 - 0.08) * size);
        braid.setMatrixAt(i, m);
      }
      braid.castShadow = true;
      headGroup.add(braid);
    }

    // Shoulders and drapery.
    const bustCuts: { n: [number, number, number]; d: number }[] = [{ n: [side * 0.83, 0.45, 0.33], d: mix(1.5, 1.38, mood.wear) }];
    if (a.damage === 'shoulder') bustCuts.push({ n: [-side * 0.8, 0.5, 0.33], d: mix(0.55, 0.3, random()) });
    const bust = add(new THREE.Mesh(bustForm({ size, seed, ...tints, cuts: bustCuts, broad: a.who === 'matron' || a.who === 'youth' ? 0.88 : 1, drape: a.who === 'youth' ? 0.35 : 1 }), material), s.root);

    const turn = { level: [0, 0, 0], aside: [0, side * 0.6, 0], up: [-0.28, side * 0.3, 0], down: [0.22, side * 0.12, 0] }[a.gaze];
    headGroup.rotation.set(turn[0], turn[1], turn[2], 'YXZ');
    if (a.damage === 'reattached') {
      headGroup.rotation.z += 0.07 * side; headGroup.position.x = 0.012 * side;
      const dark = new THREE.MeshStandardMaterial({ color: a.stone === 'basalt' ? '#b9b2a0' : '#3a332b', roughness: 0.9 });
      const seam = add(new THREE.Mesh(new THREE.TorusGeometry(0.455 * size, 0.035 * size, 6, 40), dark), s.root);
      seam.position.set(0, -1.02 * size, -0.1 * size); seam.rotation.set(Math.PI / 2 + 0.18, 0.1 * side, 0);
      const iron = new THREE.MeshStandardMaterial({ color: '#5b3a22', roughness: 0.6, metalness: 0.6 });
      for (const ang of [-0.7, 0.2, 1.0]) {
        const cramp = add(new THREE.Mesh(new THREE.BoxGeometry(0.035 * size * 2, 0.34 * size, 0.03 * size * 2), iron), s.root);
        cramp.position.set(Math.sin(ang) * 0.45 * size, -1.02 * size - Math.cos(ang) * 0.02, (Math.cos(ang) * 0.47 - 0.1) * size);
        cramp.rotation.y = ang;
      }
    }
    s.root.add(headGroup);

    // What it stands on. The bust bottom is at y = -2.85 × size.
    const foot = -2.85 * size;
    const socleMaterial = a.stone === 'bronze' ? new THREE.MeshStandardMaterial({ color: '#57534c', roughness: 0.7 }) : plain;
    const text = PLAQUES[a.plaque];
    const ink = a.stone === 'basalt' ? '#d9d2bf' : '#3a332b', paper = a.stone === 'basalt' ? '#34373a' : a.stone === 'bronze' ? '#b99a5a' : '#d9d1c0';
    let floor = foot;
    if (a.stand === 'herm') {
      const h = 1.15;
      const shaft = add(new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.115, h, 4), socleMaterial), s.root);
      shaft.rotation.y = Math.PI / 4; shaft.position.set(0, foot - h / 2 + 0.03, -0.012);
      s.box([0.27, 0.04, 0.24], [0, foot + 0.02, -0.012], socleMaterial);
      s.box([0.24, 0.06, 0.24], [0, foot - h + 0.03, -0.012], socleMaterial);
      floor = foot - h;
      if (text) s.label(text, 0.17, 0.045, [0, foot - 0.22, 0.1], ink, paper).rotation.x = -0.035;
    } else if (a.stand === 'crate') {
      const wood = s.material('#b08a55', { roughness: 0.9 }), dark = s.material('#8a6a40', { roughness: 0.9 });
      const w = 0.46, d = 0.4, h = 0.2, y0 = foot - 0.13;
      floor = y0 - 0.02;
      s.box([w, 0.02, d], [0, y0 - 0.01, 0], wood);
      for (let i = 0; i < 3; i++) {
        const y = y0 + 0.035 + i * 0.07;
        if (i < 2 || random() < 0.5) s.box([w, 0.065, 0.015], [0, y, d / 2], wood);
        s.box([w, 0.065, 0.015], [0, y, -d / 2], wood);
        s.box([0.015, 0.065, d], [-w / 2, y, 0], wood); s.box([0.015, 0.065, d], [w / 2, y, 0], wood);
      }
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.035, h + 0.02, 0.035], [x * (w / 2 - 0.005), y0 + h / 2, z * (d / 2 - 0.005)], dark);
      const lid = s.box([w, 0.02, d], [-w / 2 - 0.08, y0 + 0.17, 0.02], wood); lid.rotation.z = 1.2;
      const straw = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.004, 0.006), new THREE.MeshStandardMaterial({ color: '#d8b964', roughness: 0.9 }), 260);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 260; i++) {
        const x = (random() - 0.5) * (w - 0.04), z = (random() - 0.5) * (d - 0.04);
        const over = i > 220;
        e.set((random() - 0.5) * 1.2, random() * Math.PI, (random() - 0.5) * 1.2);
        m.compose(new THREE.Vector3(over ? x * 1.5 : x, over ? floor + 0.01 : y0 + 0.02 + random() * 0.2 * (1 - Math.hypot(x, z) * 0.6), over ? d / 2 + 0.04 + random() * 0.1 : z), q.setFromEuler(e), new THREE.Vector3(1, 1, 1));
        straw.setMatrixAt(i, m);
      }
      straw.castShadow = straw.receiveShadow = true;
      s.root.add(straw);
      if (text) s.label(text || 'FRAGILE', 0.22, 0.055, [0, y0 + 0.105, d / 2 + 0.009], '#3a2a1c', '#e6dcc0');
    } else {
      const h = 0.17;
      s.lathe([[0, 0], [0.105, 0], [0.11, 0.012], [0.1, 0.028], [0.062, 0.05], [0.05, 0.085], [0.056, 0.12], [0.085, 0.145], [0.09, 0.165], [0.05, 0.17], [0, 0.17]], socleMaterial, [0, foot - h + 0.012, -0.012]);
      s.box([0.26, 0.035, 0.24], [0, foot - h - 0.005, -0.012], socleMaterial);
      floor = foot - h - 0.0225;
      const tablet = s.box([0.16, 0.06, 0.018], [0, foot - 0.03, 0.062], socleMaterial); tablet.rotation.x = -0.12;
      if (text) { const l = s.label(text, 0.145, 0.045, [0, foot - 0.03, 0.073], ink, paper); l.rotation.x = -0.12; }
    }
    if (garden) {
      const leafGeometry = new THREE.SphereGeometry(1, 6, 4); leafGeometry.scale(0.02, 0.004, 0.017);
      const n = Math.round(mix(60, 190, mood.density));
      const ivy = new THREE.InstancedMesh(leafGeometry, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), n);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), tint = new THREE.Color();
      const strands = 5;
      for (let i = 0; i < n; i++) {
        const strand = i % strands, t = Math.floor(i / strands) / (n / strands);
        const ang = strand * 1.9 + t * 2.2 + side, y = floor + t * mix(0.3, 0.62, (strand * 0.37) % 1);
        const rel = (y - foot) / size;
        const r = rel < 0 ? 0.075 + 0.04 * Math.abs(Math.sin((y - floor) * 30)) : 0.19 * Math.max(0.35, 1 - Math.abs(rel - 0.9) * 0.6);
        e.set(random() * 2, random() * 6, random() * 2);
        m.compose(new THREE.Vector3(Math.sin(ang) * (r + 0.01) * 1.25, y + (random() - 0.5) * 0.03, Math.cos(ang) * (r + 0.01) * 0.75 - 0.012), q.setFromEuler(e), new THREE.Vector3(1, 1, 1).multiplyScalar(0.8 + random() * 0.8));
        ivy.setMatrixAt(i, m);
        ivy.setColorAt(i, tint.setHSL(0.27 + random() * 0.06, 0.45, 0.2 + random() * 0.14));
      }
      ivy.castShadow = true;
      s.root.add(ivy);
    }

    // What has been left on it.
    const crown = new THREE.Vector3(0, 1.0 * size, -0.04 * size).applyEuler(headGroup.rotation);
    if (a.visitor === 'pigeon') {
      const grey = new THREE.MeshStandardMaterial({ color: '#7d858f', roughness: 0.7 });
      const bird = new THREE.Group();
      const part = (geometry: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => { const mesh = add(new THREE.Mesh(geometry, mat), bird); mesh.position.set(x, y, z); return mesh; };
      part(new THREE.SphereGeometry(1, 12, 8), grey, 0, 0.055, 0).scale.set(0.035, 0.036, 0.062);
      part(new THREE.SphereGeometry(0.021, 10, 8), new THREE.MeshStandardMaterial({ color: '#566a78', roughness: 0.5 }), 0, 0.1, 0.045);
      part(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#6d5b8a', roughness: 0.4, metalness: 0.3 }), 0, 0.078, 0.036).scale.set(0.024, 0.026, 0.024);
      part(new THREE.ConeGeometry(0.006, 0.02, 6), new THREE.MeshStandardMaterial({ color: '#2b2b2b' }), 0, 0.098, 0.071).rotation.x = Math.PI / 2;
      part(new THREE.BoxGeometry(0.04, 0.008, 0.06), new THREE.MeshStandardMaterial({ color: '#4a5058', roughness: 0.7 }), 0, 0.05, -0.075).rotation.x = 0.25;
      for (const x of [-0.012, 0.012]) part(new THREE.CylinderGeometry(0.002, 0.002, 0.03, 5), new THREE.MeshStandardMaterial({ color: '#c8584a' }), x, 0.012, 0.005);
      bird.position.copy(crown).add(new THREE.Vector3(0, who.hair === 'bald' ? -0.012 : 0.004, 0)); bird.rotation.y = side * 1.1;
      s.root.add(bird);
      // And what pigeons leave.
      const lime = new THREE.MeshStandardMaterial({ color: '#f4f2ea', roughness: 0.9 });
      for (let i = 0; i < 3; i++) { const spot = head.at(side * (0.3 + i * 0.12), 0.72 - i * 0.12); const drip = add(new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), lime), headGroup); drip.position.copy(spot.p); drip.scale.set(0.008, 0.016 + i * 0.006, 0.006); }
    } else if (a.visitor === 'cone') {
      const orange = new THREE.MeshStandardMaterial({ color: '#f26a1b', roughness: 0.6 });
      const cone = new THREE.Group();
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.085, 0.3, 20, 1, true), orange), cone).position.y = 0.15;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.064, 0.075, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#f6f3ea', roughness: 0.5 })), cone).position.y = 0.115;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.2), orange), cone).position.y = 0.006;
      cone.position.copy(crown).add(new THREE.Vector3(0, -0.045, 0)); cone.rotation.set(headGroup.rotation.x - 0.08, 0.5, 0.14 * side);
      s.root.add(cone);
    } else if (a.visitor === 'wreath') {
      const petals = ['#e8486a', '#f4b63a', '#f3efe6', '#b455c8', '#ee7a3c'];
      const blooms = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.02, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), 46);
      const m = new THREE.Matrix4(), tint = new THREE.Color();
      for (let i = 0; i < 46; i++) {
        const ang = (i / 46) * Math.PI * 2;
        const droop = (1 + Math.cos(ang)) / 2;
        m.makeTranslation(Math.sin(ang) * (0.085 + droop * 0.05) + (random() - 0.5) * 0.012, (-1.45 - droop * 0.75) * size + (random() - 0.5) * 0.012, (Math.cos(ang) * 0.075 + droop * 0.035 - 0.012));
        blooms.setMatrixAt(i, m);
        blooms.setColorAt(i, tint.set(i % 3 === 0 ? '#3f7a3a' : petals[Math.floor(random() * petals.length)]));
      }
      blooms.castShadow = true;
      s.root.add(blooms);
    } else if (a.visitor === 'coins') {
      const brass = new THREE.MeshStandardMaterial({ color: '#c9a240', roughness: 0.35, metalness: 0.8 });
      const reach = a.stand === 'crate' ? 0.34 : 0.19;
      for (let i = 0; i < 9; i++) { const ang = (random() - 0.5) * 2.4; s.cylinder(0.012, 0.012, 0.003, [Math.sin(ang) * (reach + random() * 0.07), floor + 0.0015, Math.cos(ang) * (reach + random() * 0.05)], brass, 12); }
      s.cylinder(0.014, 0.016, 0.045, [side * 0.12, floor + 0.0225, reach + 0.03], s.material('#efe6cf'), 12);
      s.ball([0.006, 0.014, 0.006], [side * 0.12, floor + 0.058, reach + 0.03], new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff9a2a', emissiveIntensity: 1.5 }), 8);
      s.cylinder(0.03, 0.035, 0.004, [side * 0.12, floor + 0.002, reach + 0.03], s.material('#e4dcc6'), 14);
    }
    return s.finish();
  },
});
