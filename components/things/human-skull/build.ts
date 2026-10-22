import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { bump, dir, fuse, globe, inkText, lerp, placed, scribble, skin, smooth, spot, spring, stain, strut, sweep } from './form';
import { HUMAN_LOWER, HUMAN_UPPER, UNIT, archAt, boneTexture, humanRamus, mandible, toothRow, type Arch } from './bones';

const SPECIES = {
  human: { brow: 0.045, vault: 1, snout: 0, fang: 1, size: 1, crest: 0, a: 0.42, chin: 1 },
  ape: { brow: 0.2, vault: 0.8, snout: 0.3, fang: 1.8, size: 1.06, crest: 0.1, a: 0.44, chin: 0 },
  monkey: { brow: 0.12, vault: 0.86, snout: 0.44, fang: 3.2, size: 0.58, crest: 0, a: 0.34, chin: 0 },
} as const;

export default defineThing({
  questions: {
    kind: choice('What is the skull made of?', {
      bone: 'Real bone, ivory-yellow and faintly stained, with fine sutures.',
      plastic: 'A plastic teaching model: clean off-white, a sawn skull-cap held by brass hooks and the jaw hung on steel springs.',
      sugar: 'A white sugar skull painted with bright flowers, petals round the eyes and swirls on the brow.',
      bronze: 'A dark bronze cast with a polished brow and green in the hollows.',
    }),
    teeth: choice('How are its teeth?', {
      full: 'A complete even grin.',
      gappy: 'Gappy: many have fallen out, the rest stand apart.',
      gold: 'A full set with one gold tooth catching the light.',
      none: 'Toothless: only the bare ridges of the jaws.',
    }),
    age: choice('How old was it, or is it?', {
      child: 'A child: small, with a big round braincase over a little face.',
      adult: 'An adult of ordinary proportions.',
      ancient: 'Ancient: dark brown, earth-stained and worn, long out of the ground.',
    }),
    pose: choice('How does it sit?', {
      upright: 'Upright and level, jaw closed, staring ahead.',
      open: 'Rocked back with the jaw dropped open, laughing or screaming.',
      side: 'Toppled on its side as if it rolled there.',
      books: 'Set on a slumped stack of old books, a scholar\'s memento mori.',
    }),
    condition: choice('What has happened to it?', {
      clean: 'Nothing: it is clean and whole.',
      cracked: 'A blow has broken a hole in the crown, with cracks running from it.',
      mossy: 'Moss has grown over the crown and one side; it lay outdoors for years.',
      waxed: 'A candle has burned down on top of it and wax has run over the brow.',
      numbered: 'Each bone is numbered in black ink with a catalogue mark on the forehead.',
    }),
    species: choice('Whose skull is it?', {
      human: 'Human, with a high forehead and a chin.',
      ape: 'A heavy-browed ape: low vault, crest along the top, jutting muzzle, big canines.',
      monkey: 'A small monkey with a long muzzle and dagger canines.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const P = SPECIES[a.species];
    const child = a.age === 'child', ancient = a.age === 'ancient';
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const vault = P.vault * (child ? 1.05 : 1);

    // Colours for each material.
    const tone = {
      bone: ancient ? ['#b3986a', '#4b3825', '#1f150e'] : ['#e6d9b6', '#8d7049', '#2a1d14'],
      plastic: ['#f1ead6', '#c2b592', '#3a2f26'],
      sugar: ['#f8f4ea', '#e6dcc8', '#2a1c3a'],
      bronze: ['#8f6c3a', '#3f6a55', '#241a0e'],
    }[a.kind];
    const blotch = a.kind === 'sugar' ? 0.15 : a.kind === 'plastic' ? 0.25 + mood.wear * 0.4 : mix(0.45, 1, mood.wear) * (ancient ? 1.2 : 1);
    const metal = a.kind === 'bronze' ? 0.82 : 0;
    const rough = { bone: 0.85, plastic: 0.42, sugar: 0.7, bronze: 0.38 }[a.kind];
    const gaudy = ['#e8336a', '#f2a900', '#1fa6a0', '#7b3fc4', '#3a9d3a', '#e9541e', '#2b6fd6']
      .map((hex) => ({ hex, order: random() })).sort((x, y) => x.order - y.order)
      .map(({ hex }) => `#${new THREE.Color(hex).lerp(new THREE.Color('#8d8a86'), (1 - mood.cheer) * 0.45).getHexString()}`);

    const hit = { lon: -32 + jitter(8), lat: 50 + jitter(5) };
    const hitDir = dir(hit.lon, hit.lat);
    const out = new THREE.Vector3(), c = new THREE.Vector3();
    const cranium = (d: THREE.Vector3, lon: number, lat: number) => {
      const front = smooth(-0.3, 0.5, d.z);
      const t = Math.max(0, -d.y);
      const ay = d.y >= 0 ? 0.88 * vault : lerp(0.62, 0.93, front);
      const az = d.z < 0 ? 1.08 : 0.96;
      const n = 2 + 1.6 * front * smooth(0, 0.3, t);
      const yz = Math.pow(Math.pow(Math.abs(d.z) / az, n) + Math.pow(Math.abs(d.y) / ay, n), 2 / n);
      out.copy(d).multiplyScalar(1 / Math.sqrt((d.x / 0.8) ** 2 + yz));
      out.x *= 1 - 0.38 * smooth(0.3, 0.85, t) * front;
      if (P.crest) out.y += P.crest * bump(d.x, 0, 0.1) * smooth(0.45, 0.85, d.y);
      out.addScaledVector(d, P.brow * bump(lat, 7, 7) * smooth(62, 32, Math.abs(lon)) * smooth(0, 0.3, d.z));
      const coslat = Math.cos(lat * Math.PI / 180);
      for (const side of [-1, 1]) {
        const ex = (lon - side * 26) * coslat / 14.5, ey = (lat + 11) / 12.5;
        const m = Math.pow(Math.abs(ex) ** 3 + Math.abs(ey) ** 3, 1 / 3);
        out.addScaledVector(d, -0.3 * (1 - smooth(0.7, 1.12, m)) * smooth(0, 0.2, d.z));
        const cheek = bump(d.angleTo(c.set(side * 0.62, -0.42, 0.62).normalize()), 0, 0.2);
        out.addScaledVector(c, 0.09 * cheek);
        out.x -= side * 0.07 * bump(d.angleTo(c.set(side * 0.9, -0.1, 0.42).normalize()), 0, 0.24);
      }
      if (d.z > 0) {
        const ny = (lat + 29) / 9, width = 3.6 + 5.4 * smooth(-0.9, 0.7, -ny);
        const k = 1 - smooth(0.7, 1.1, Math.max(Math.abs(lon * coslat / width), Math.abs(ny)));
        out.addScaledVector(d, -0.26 * k);
      }
      if (a.condition === 'cracked') out.addScaledVector(d, -0.16 * bump(d.angleTo(hitDir), 0, 0.17));
      return out;
    };

    const map = skin(1024, 512, (ctx) => {
      const [base, mark, hollow] = tone;
      ctx.fillStyle = base;
      ctx.fillRect(-180, -90, 360, 180);
      for (let i = 0; i < 80; i++) stain(ctx, jitter(180), jitter(85), 6 + random() * 22, random() < 0.8 ? mark : '#fff8e6', (0.08 + random() * 0.34) * blotch);
      if (a.kind === 'bronze') for (let i = 0; i < 30; i++) stain(ctx, jitter(180), 20 + random() * 70, 8 + random() * 20, '#d9b676', 0.35);
      ctx.fillStyle = hollow; ctx.globalAlpha = 0.45; ctx.fillRect(-180, -90, 360, 28); ctx.globalAlpha = 1;
      // Sutures: coronal over the top, sagittal along the midline, lambdoid behind, squamosal at the temples.
      if (a.kind !== 'sugar') {
        const line = a.kind === 'bronze' ? '#3d2c16' : a.kind === 'plastic' ? '#8a7b63' : '#5a442c';
        const coronal: [number, number][] = [];
        for (let k = -82; k <= 82; k += 6) {
          const x = Math.sin(k * Math.PI / 180), y = Math.cos(k * Math.PI / 180) * 0.94, z = Math.cos(k * Math.PI / 180) * 0.34;
          coronal.push([Math.atan2(x, z) * 180 / Math.PI, Math.asin(y / Math.hypot(x, y, z)) * 180 / Math.PI]);
        }
        scribble(ctx, coronal, 0.9, line, 1.3, random);
        for (const edge of [-180, 180]) {
          scribble(ctx, [[edge, 88], [edge, 34]], 0.9, line, 1.3, random);
          scribble(ctx, [[edge, 34], [edge * 0.66, -14]], 0.9, line, 1.3, random);
        }
        scribble(ctx, [[0, 70], [0, 89]], 0.9, line, 1, random);
        for (const side of [-1, 1]) scribble(ctx, [[side * 60, -10], [side * 72, 7], [side * 94, 12], [side * 114, 4], [side * 122, -14]], 0.9, line, 0.9, random);
        if (a.kind === 'plastic') { ctx.strokeStyle = '#4e4436'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-180, 27); ctx.lineTo(180, 27); ctx.stroke(); }
      }
      if (a.condition === 'cracked') {
        ctx.fillStyle = hollow;
        ctx.beginPath();
        for (let k = 0; k < 9; k++) {
          const angle = k / 9 * Math.PI * 2, r = 5 + random() * 4;
          ctx.lineTo(hit.lon + Math.cos(angle) * r * 1.5, hit.lat + Math.sin(angle) * r);
        }
        ctx.fill();
        for (let k = 0; k < 6; k++) {
          const angle = k / 6 * Math.PI * 2 + jitter(0.4), reach = 22 + random() * 38;
          scribble(ctx, [[hit.lon + Math.cos(angle) * 7, hit.lat + Math.sin(angle) * 5], [hit.lon + Math.cos(angle) * reach * 1.4, hit.lat + Math.sin(angle) * reach]], 1.1, hollow, 2.2, random);
        }
      }
      if (a.condition === 'mossy') {
        for (let i = 0; i < 90; i++) {
          const lat = 90 - random() ** 1.6 * 110;
          stain(ctx, -60 + jitter(120), lat, 5 + random() * 14, random() < 0.5 ? '#4f6b2c' : '#74883a', 0.75);
        }
      }
      if (a.kind === 'sugar') {
        for (const side of [-1, 1]) {
          for (let k = 0; k < 10; k++) {
            const angle = k / 10 * Math.PI * 2;
            spot(ctx, side * 26 + Math.cos(angle) * 21, -11 + Math.sin(angle) * 17, 4.6, gaudy[k % 2]);
          }
          scribble(ctx, [[side * 62, 2], [side * 74, 12], [side * 86, 6], [side * 82, -4], [side * 74, 0], [side * 77, 6]], 1.6, gaudy[2]);
          spot(ctx, side * 50, -38, 3.2, gaudy[3], 1.7);
          spot(ctx, side * 60, -30, 2.4, gaudy[4], 1.5);
        }
        for (let k = 0; k < 7; k++) {
          const angle = k / 7 * Math.PI * 2;
          spot(ctx, Math.cos(angle) * 10, 36 + Math.sin(angle) * 8, 4.2, gaudy[2 + (k % 2)]);
        }
        spot(ctx, 0, 36, 3.6, gaudy[4]);
        for (let k = -4; k <= 4; k++) spot(ctx, k * 9, 14 - Math.abs(k) * 0.8, 1.8, gaudy[(k + 9) % 5]);
        for (let k = -3; k <= 3; k++) if (k) spot(ctx, k * 13, 58, 2.6, gaudy[(k + 8) % 6]);
        scribble(ctx, [[-22, 62], [-10, 68], [0, 62], [10, 68], [22, 62]], 1.5, gaudy[5]);
      }
      // The hollows: eye sockets, the nose and the ear holes.
      const pit = a.kind === 'sugar' ? gaudy[6] : hollow;
      for (const side of [-1, 1]) {
        if (a.kind !== 'sugar') stain(ctx, side * 26, -11, 19, hollow, 0.95);
        ctx.fillStyle = a.kind === 'sugar' ? pit : hollow;
        ctx.beginPath(); ctx.ellipse(side * 26, -11, 13.5, 11.5, 0, 0, Math.PI * 2); ctx.fill();
        if (a.kind === 'sugar') stain(ctx, side * 26, -11, 9, '#150c20', 0.9);
        spot(ctx, side * 96, -34, 3.2, hollow);
      }
      ctx.fillStyle = hollow;
      ctx.beginPath();
      ctx.moveTo(0, -19.5); ctx.bezierCurveTo(5, -22, 9.5, -33, 7.5, -37); ctx.quadraticCurveTo(3, -40, 0, -36);
      ctx.quadraticCurveTo(-3, -40, -7.5, -37); ctx.bezierCurveTo(-9.5, -33, -5, -22, 0, -19.5); ctx.fill();
      if (a.condition === 'numbered') {
        const ink = '#17161c';
        const marks: [number, number][] = [[0, 44], [42, 40], [-44, 36], [84, 6], [-84, 6], [128, 30], [-128, 30], [52, -38], [-52, -38], [0, 8], [96, -12], [-96, -12]];
        marks.forEach(([lon, lat], index) => {
          inkText(ctx, String(index + 1), lon + jitter(3), lat + jitter(3), 8.5, ink, jitter(0.15));
        });
        inkText(ctx, `No ${100 + Math.floor(random() * 880)}`, 22, 27, 6.5, ink, -0.08);
        ctx.strokeStyle = ink; ctx.lineWidth = 0.6;
        ctx.strokeRect(5, 22.5, 34, 9);
      }
    });

    const boneMap = boneTexture(random, tone[0], tone[1], blotch * 0.8);
    const shell = new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: metal });
    const bone = new THREE.MeshStandardMaterial({ map: boneMap, roughness: rough, metalness: metal });
    const toothColour = a.kind === 'bronze' ? '#a07a40' : a.kind === 'sugar' ? '#ffffff' : ancient ? '#c9b78c' : a.kind === 'plastic' ? '#fbf8ee' : '#f1e8cd';
    const ivory = new THREE.MeshStandardMaterial({ color: toothColour, roughness: a.kind === 'bronze' ? 0.35 : 0.45, metalness: metal });
    const dark = new THREE.MeshStandardMaterial({ color: tone[2], roughness: 0.9 });

    const G = new THREE.Group();
    const head = new THREE.Group();
    G.add(head);
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    add(head, globe(cranium, 112, 72), shell);

    // The face below the cranium is its own group, so a child can have a small face under a big vault.
    const face = new THREE.Group();
    const faceScale = child ? 0.8 : 1;
    face.scale.setScalar(faceScale);
    face.position.set(0, -0.56 * (1 - faceScale), 0.25 * (1 - faceScale));
    head.add(face);
    const arch: Arch = { a: P.a, flare: 0.1, L: 0.9 + P.snout };
    const upperArch: Arch = { a: P.a + 0.014, flare: 0.09, L: arch.L + 0.022 };
    const outline: THREE.Vector2[] = [];
    for (let k = -1.36; k <= 1.361; k += 0.08) {
      const [x, z] = archAt({ a: upperArch.a + 0.035, flare: 0.08, L: upperArch.L + 0.035 }, k);
      outline.push(new THREE.Vector2(x, z));
    }
    const palate = new THREE.ExtrudeGeometry(new THREE.Shape(outline), { depth: 0.38, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
    palate.rotateX(Math.PI / 2);
    palate.translate(0, -0.59, 0);
    const fixed: THREE.BufferGeometry[] = [palate];
    for (const side of [-1, 1]) {
      fixed.push(placed(new THREE.SphereGeometry(1, 14, 10), [side * 0.57, -0.43, 0.63], [0.15, 0.12, 0.14]));
      fixed.push(placed(strut([side * 0.64, -0.42, 0.56], [side * 0.76, -0.38, -0.04], 0.05, 0.05, 8), [0, 0, 0], [1, 1, 1]));
      fixed.push(placed(new THREE.SphereGeometry(1, 10, 8), [side * 0.6, -0.66, -0.22], [0.1, 0.15, 0.11]));
      fixed.push(strut([side * 0.42, -0.62, 0.72], [side * 0.56, -0.44, 0.66], 0.09, 0.07, 8));
    }
    if (P.snout) fixed.push(placed(new THREE.SphereGeometry(1, 18, 12), [0, -0.66, 0.5 + P.snout * 0.5], [P.a * 0.95, 0.3, 0.45 + P.snout * 0.55]));
    add(face, fuse(fixed, bone).geometry, bone);
    if (P.snout) add(face, placed(new THREE.SphereGeometry(1, 12, 8), [0, -0.5, 0.8 + P.snout * 0.72], [0.11, 0.1, 0.09], [-0.7, 0, 0]), dark);

    const loss = a.teeth === 'none' ? 1 : a.teeth === 'gappy' ? 0.42 + mood.wear * 0.2 : 0;
    const goldSide = random() < 0.5 ? -1 : 1, goldIndex = random() < 0.5 ? 1 : 2;
    const kept = new Map<string, boolean>();
    const keep = (row: string) => (side: number, index: number) => {
      const key = `${row}${side}${index}`;
      if (!kept.has(key)) kept.set(key, random() >= loss);
      return kept.get(key)!;
    };
    const lowerRow = HUMAN_LOWER.map((tooth) => ({ ...tooth }));
    const upperRow = HUMAN_UPPER.map((tooth) => ({ ...tooth }));
    if (child) { upperRow.length = 6; lowerRow.length = 6; }
    const upper = toothRow(upperArch, upperRow, -1.0, -1, random, keep('u'), P.fang);
    const isGold = (tooth: { side: number; index: number }) => a.teeth === 'gold' && tooth.side === goldSide && tooth.index === goldIndex;
    const upperPlain = upper.filter((tooth) => !isGold(tooth)).map((tooth) => tooth.geometry);
    if (upperPlain.length) add(face, fuse(upperPlain, ivory).geometry, ivory);
    const golden = upper.filter(isGold).map((tooth) => tooth.geometry);
    if (golden.length) add(face, fuse(golden, ivory).geometry, new THREE.MeshStandardMaterial({ color: '#e8b838', metalness: 0.9, roughness: 0.22, emissive: '#7a5200', emissiveIntensity: 0.5 }));

    const jaw = new THREE.Group();
    jaw.position.set(0, -0.56, -0.06);
    const jawInner = new THREE.Group();
    jawInner.position.set(0, 0.56, 0.06);
    jaw.add(jawInner);
    face.add(jaw);
    add(jawInner, mandible({ arch, top: -1.24, bottom: -1.52, taper: 0.9, thickness: 0.13, ramus: humanRamus(-1.24, -1.52), chin: P.chin }, bone).geometry, bone);
    const lower = toothRow(arch, lowerRow, -1.245, 1, random, keep('l'), P.fang * (P.fang > 1 ? 0.75 : 1)).map((tooth) => tooth.geometry);
    if (lower.length) add(jawInner, fuse(lower, ivory).geometry, ivory);
    if (a.kind === 'sugar') {
      const dots: THREE.BufferGeometry[][] = [[], []];
      for (let k = -3; k <= 3; k++) {
        const [x, z] = archAt(arch, k * 0.26);
        dots[(k + 4) % 2].push(placed(new THREE.SphereGeometry(0.05, 8, 6), [x * 1.12, -1.4, z * 1.02 + 0.05]));
      }
      dots.forEach((group, index) => add(jawInner, fuse(group, bone).geometry, new THREE.MeshStandardMaterial({ color: gaudy[index], roughness: 0.6 })));
    }

    if (a.kind === 'plastic') {
      const brass = new THREE.MeshStandardMaterial({ color: '#c9a04a', metalness: 0.85, roughness: 0.3 });
      const steel = new THREE.MeshStandardMaterial({ color: '#b9c0c4', metalness: 0.9, roughness: 0.28 });
      const hooks: THREE.BufferGeometry[] = [];
      for (const lon of [-118, -62, 62, 118]) {
        const p = cranium(dir(lon, 27), lon, 27).clone().multiplyScalar(1.025);
        hooks.push(strut([p.x, p.y - 0.09, p.z], [p.x, p.y + 0.09, p.z], 0.016, 0.016, 6));
        hooks.push(placed(new THREE.SphereGeometry(0.035, 8, 6), [p.x, p.y + 0.09, p.z]), placed(new THREE.SphereGeometry(0.035, 8, 6), [p.x, p.y - 0.09, p.z]));
      }
      add(head, fuse(hooks, brass).geometry, brass);
      const coils = [-1, 1].map((side) => spring([side * 0.75, -0.42, 0.2], [side * 0.6, -1.12 * faceScale - 0.05, 0.12], 0.04, 0.011, 11));
      add(head, fuse(coils, steel).geometry, steel);
      add(head, placed(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), [0, 0.88 * vault + 0.01, 0]), brass);
    }

    if (a.condition === 'mossy') {
      const tuft = new THREE.IcosahedronGeometry(1, 0);
      const moss = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true });
      const count = Math.round(mix(70, 170, mood.density));
      const tufts = new THREE.InstancedMesh(tuft, moss, count);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), colour = new THREE.Color();
      for (let i = 0; i < count; i++) {
        const lon = -60 + jitter(115), lat = 90 - random() ** 1.5 * 95;
        const p = cranium(dir(lon, lat), lon, lat);
        const size = 0.03 + random() * 0.06;
        q.setFromEuler(new THREE.Euler(random() * 3, random() * 3, random() * 3));
        m.compose(p.clone().multiplyScalar(1.005), q, new THREE.Vector3(size * 1.5, size * 0.8, size * 1.5));
        tufts.setMatrixAt(i, m);
        tufts.setColorAt(i, colour.set(random() < 0.5 ? '#557a2e' : '#7c9440').multiplyScalar(0.8 + random() * 0.4));
      }
      tufts.castShadow = tufts.receiveShadow = true;
      head.add(tufts);
    }

    let flame: THREE.Mesh | null = null;
    if (a.condition === 'waxed') {
      const waxColour = new THREE.Color(mood.warmth > 0.6 ? '#e9d9a8' : '#efe9d6').lerp(new THREE.Color('#7d735f'), mood.wear * 0.3);
      const wax = new THREE.MeshStandardMaterial({ color: waxColour, roughness: 0.35, emissive: waxColour, emissiveIntensity: 0.12 });
      const phase = [random() * 6, random() * 6];
      const edge = (lon: number) => 42 + 12 * Math.sin(lon * 0.05 + phase[0]) + 8 * Math.sin(lon * 0.13 + phase[1]) - 14 * bump(lon, 0, 50);
      const parts: THREE.BufferGeometry[] = [];
      parts.push(globe((d, lon, lat) => cranium(d, lon, lat).multiplyScalar(lerp(0.96, 1.05, smooth(-4, 6, lat - edge(lon)))), 64, 20, -180, 180, 90, 12));
      const drips = 9 + Math.floor(random() * 5);
      for (let i = 0; i < drips; i++) {
        const lon = -150 + (i / drips) * 300 + jitter(10), from = edge(lon) + 4, length = 14 + random() * 40;
        const path: THREE.Vector3[] = [];
        for (let k = 0; k <= 5; k++) {
          const lat = from - length * k / 5;
          path.push(cranium(dir(lon, lat), lon, lat).clone().multiplyScalar(1.03));
        }
        const thick = 0.03 + random() * 0.02;
        parts.push(sweep(path, (k) => [thick * (0.8 + 0.7 * smooth(0.7, 1, k)), thick * (0.8 + 0.7 * smooth(0.7, 1, k))], { steps: 12, sides: 6, up: new THREE.Vector3(0.3, 0.2, 1) }));
      }
      const top = 0.88 * vault;
      const tall = 0.16 + random() * 0.4;
      parts.push(placed(new THREE.CylinderGeometry(0.11, 0.12, tall, 14), [0, top + tall / 2 - 0.02, 0]));
      parts.push(placed(new THREE.SphereGeometry(1, 12, 8), [0, top, 0], [0.26, 0.07, 0.26]));
      add(head, fuse(parts, wax).geometry, wax);
      add(head, placed(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 5), [0, top + tall + 0.01, 0]), dark);
      flame = add(head, placed(new THREE.SphereGeometry(1, 10, 8), [0, 0.09, 0], [0.04, 0.09, 0.04]), new THREE.MeshStandardMaterial({ color: '#ffd77a', emissive: '#ffb030', emissiveIntensity: 1.6, roughness: 0.4 }));
      flame.position.set(0, top + tall + 0.02, 0);
    }

    // Pose.
    const size = UNIT * P.size * (child ? 0.82 : 1);
    G.scale.setScalar(size);
    const restGape = a.pose === 'open' ? 0.46 : a.pose === 'side' ? 0.13 : a.kind === 'plastic' ? 0.05 : 0;
    jaw.rotation.x = restGape;
    if (a.pose === 'open') G.rotation.x = -0.3;
    if (a.pose === 'side') G.rotation.set(-0.32 + jitter(0.08), jitter(0.3), (random() < 0.5 ? -1 : 1) * (1.3 + jitter(0.08)), 'YXZ');
    if (a.pose === 'upright' || a.pose === 'books') G.rotation.y = jitter(0.12);
    s.root.add(G);
    let floor = 0;
    if (a.pose === 'books') {
      const covers = ['#6b2e2a', '#2f4a3c', '#34405e', '#7a5a2e', '#4a3a52', '#1f1d1c'];
      const pages = s.material('#e4d8b8');
      const count = 2 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const k = Math.max(0.72, P.size * (child ? 0.82 : 1));
        const w = (0.18 + random() * 0.05) * k, d = (0.13 + random() * 0.035) * k, h = (0.022 + random() * 0.026) * k;
        const book = new THREE.Group();
        const cover = s.material(covers[Math.floor(random() * covers.length)], { roughness: 0.7 });
        for (const [geometry, material, at] of [
          [new THREE.BoxGeometry(w, h, d), cover, [0, 0, 0]],
          [new THREE.BoxGeometry(w * 0.97, h * 0.76, d * 0.97), pages, [w * 0.025, 0, d * 0.025]],
        ] as const) {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(at[0], at[1], at[2]);
          mesh.castShadow = mesh.receiveShadow = true;
          book.add(mesh);
        }
        book.position.set(jitter(0.012), floor + h / 2, jitter(0.012));
        book.rotation.y = jitter(0.35);
        s.root.add(book);
        floor += h;
      }
    }
    G.updateMatrixWorld(true);
    G.position.y = floor - new THREE.Box3().setFromObject(G).min.y;

    const chatter = a.pose === 'open' ? mix(0, 0.12, mood.energy) : 0;
    const flicker = flame;
    return s.finish({
      update: chatter > 0 || flicker ? (_dt, time) => {
        if (chatter > 0) jaw.rotation.x = restGape + Math.sin(time * mix(2, 14, mood.energy)) * chatter;
        if (flicker) flicker.scale.set(1 + Math.sin(time * 13) * 0.12, 1 + Math.sin(time * 9.1) * 0.18 * (0.4 + mood.energy), 1);
      } : undefined,
    });
  },
});
