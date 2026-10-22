import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { SKIN_COLOUR, SKIN_TONES, crease, skinPlate } from './face';

type P = [number, number, number];
const U = 0.01;

export default defineThing({
  questions: {
    expression: choice('What are the eyebrows saying?', {
      surprise: 'Both shot high in round arches of surprise, the forehead rucked up above them.',
      cocked: 'One cocked high, the other flat: scepticism, "oh really?".',
      worry: 'Knitted in worry: inner ends pulled up and together, a furrow between.',
      bored: 'Flat, low and level: boredom, nothing behind them.',
      villain: 'A villain slant: inner ends driven down hard, tails flying up.',
      waggle: 'Waggling up and down together, a music-hall leer.',
    }),
    thickness: choice('How thick are they?', {
      pencil: 'Pencil-thin drawn lines, 1930s film star.',
      natural: 'Natural, medium and tidy.',
      bushy: 'Bushy and heavy, hairs standing out from the skin.',
      monobrow: 'A monobrow: thick, and meeting in the middle.',
    }),
    colour: choice('What colour is the hair?', {
      black: 'Black.',
      auburn: 'Auburn red.',
      blond: 'Blond, pale against the skin.',
      grey: 'Grey and white.',
      dyed: 'Dyed a bright unnatural colour, blue or green or pink.',
    }),
    grooming: choice('How are they groomed?', {
      plucked: 'Plucked and shaped into a crisp clean edge.',
      wild: 'Wild: stray hairs sprouting above and below, never touched.',
      slit: 'One brow has two razor slits shaved through its tail.',
      ring: 'A steel ring pierced through the tail of one brow.',
      barbell: 'A barbell piercing: two steel balls above and below one brow.',
    }),
    age: choice('How old is the brow they sit on?', {
      young: 'Young: smooth unlined skin.',
      middle: 'Middle-aged: a couple of settled lines.',
      old: 'Old: deep forehead lines and long wiry hairs, some gone white.',
    }),
    skin: choice('What is the skin tone?', SKIN_TONES),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const old = { young: 0, middle: 0.5, old: 1 }[a.age];
    const tone = new THREE.Color(SKIN_COLOUR[a.skin]);
    const skin = new THREE.MeshStandardMaterial({ color: tone, roughness: mix(0.55, 0.8, old) });
    const shade = new THREE.MeshStandardMaterial({ color: tone.clone().multiplyScalar(0.6), roughness: 0.8 });
    const face = new THREE.Group();

    const highSide = random() < 0.5 ? -1 : 1;
    const shapes = {
      surprise: { inner: 1.5, arch: 1.15, outer: 0.9, gap: 1.25 },
      cocked: { inner: 1.2, arch: 1.35, outer: 1.0, gap: 1.2 },
      worry: { inner: 1.35, arch: 0.1, outer: -0.45, gap: 0.8 },
      bored: { inner: 0, arch: 0.12, outer: -0.05, gap: 1.2 },
      villain: { inner: -0.75, arch: 0.45, outer: 1.25, gap: 0.85 },
      waggle: { inner: 0.9, arch: 0.9, outer: 0.5, gap: 1.2 },
    };
    const flat = { inner: -0.15, arch: 0.15, outer: -0.2, gap: 1.2 };
    const shapeFor = (side: number) => a.expression === 'cocked' && side !== highSide ? flat : shapes[a.expression];
    const long = 5.1;
    const curve = (side: number, t: number): P => {
      const shape = shapeFor(side);
      const drop = t > 0.72 ? ((t - 0.72) / 0.28) ** 2 * 0.75 : 0;
      return [side * (shape.gap + t * long) * U, (shape.inner * (1 - t) + shape.outer * t + shape.arch * Math.sin(Math.PI * t ** 0.8) - drop) * U, 0];
    };

    // The slip of forehead.
    const outline = new THREE.Shape();
    const hw = 7.6 * U, top = 4.3 * U, bottom = -2.1 * U, round = 1.8 * U;
    outline.moveTo(-hw + round, bottom);
    outline.quadraticCurveTo(-1.2 * U, bottom + 0.5 * U, -0.9 * U, bottom - 0.9 * U);
    outline.quadraticCurveTo(0, bottom - 1.3 * U, 0.9 * U, bottom - 0.9 * U);
    outline.quadraticCurveTo(1.2 * U, bottom + 0.5 * U, hw - round, bottom);
    outline.quadraticCurveTo(hw, bottom, hw, bottom + round);
    outline.lineTo(hw, top - round);
    outline.quadraticCurveTo(hw, top, hw - round, top);
    outline.quadraticCurveTo(0, top + 0.7 * U, -hw + round, top);
    outline.quadraticCurveTo(-hw, top, -hw, top - round);
    outline.lineTo(-hw, bottom + round);
    outline.quadraticCurveTo(-hw, bottom, -hw + round, bottom);
    face.add(skinPlate(outline, 0.005, skin));
    const bridge = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), skin);
    bridge.scale.set(0.75 * U, 1.9 * U, 0.4 * U);
    bridge.position.set(0, -1.6 * U, 0);
    bridge.castShadow = true;
    face.add(bridge);

    const shades = {
      black: '#17110f', auburn: '#8a3b1a', blond: '#c9a45c', grey: '#9a9792',
      dyed: ['#1f6bff', '#19b26b', '#ff3f98', '#8a3ff0'][Math.floor(random() * 4)],
    };
    const base = new THREE.Color(shades[a.colour]);
    const thick = { pencil: 0.13, natural: 0.52, bushy: 0.8, monobrow: 0.74 }[a.thickness] * (a.grooming === 'plucked' ? 0.78 : 1);
    const hairLong = ({ pencil: 0.3, natural: 0.6, bushy: 0.95, monobrow: 0.85 }[a.thickness] + old * 0.25) * U;
    const density = { pencil: 60, natural: 240, bushy: 380, monobrow: 360 }[a.thickness];
    const wild = a.grooming === 'wild' ? 1 : a.grooming === 'plucked' ? 0 : 0.3 + mood.wear * 0.3;
    const underPaint = new THREE.MeshStandardMaterial({ color: base.clone().lerp(tone, a.thickness === 'pencil' ? 0 : 0.3), roughness: 0.7 });
    const steel = new THREE.MeshStandardMaterial({ color: '#d5d9de', metalness: 0.85, roughness: 0.2, emissive: '#5a6068', emissiveIntensity: 0.4 });
    const hair = new THREE.ConeGeometry(0.045 * U, 1, 4);
    hair.translate(0, 0.5, 0);
    const pierced = a.grooming === 'ring' || a.grooming === 'barbell' || a.grooming === 'slit' ? (a.expression === 'cocked' ? highSide : random() < 0.5 ? -1 : 1) : 0;
    const slits = [0.6, 0.74];

    const brows = ([-1, 1] as const).map((side) => {
      const group = new THREE.Group();
      const half = (t: number) => thick * U * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, 0.28 + t * 0.5) ** 1) * (1 - t * 0.72) * 1.25);
      // A dark bed under the hairs, so the arc reads from across a room.
      const bed = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => new THREE.Vector3(...curve(side, i / 8)))), 40, 1, 8), underPaint);
      const spot = bed.geometry.attributes.position;
      const centre = new THREE.Vector3();
      for (let i = 0; i < spot.count; i++) {
        const t = Math.floor(i / 9) / 40;
        centre.set(...curve(side, t));
        const wide = half(t) * (a.thickness === 'pencil' ? 1 : 0.85);
        spot.setXYZ(i, centre.x + (spot.getX(i) - centre.x) * wide, centre.y + (spot.getY(i) - centre.y) * wide, 0.02 * U + Math.max(0, spot.getZ(i)) * 0.09 * U);
      }
      bed.geometry.computeVertexNormals();
      group.add(bed);

      const placed: { matrix: THREE.Matrix4; tint: THREE.Color }[] = [];
      const turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      const plant = (x: number, y: number, angle: number, lift: number, length: number) => {
        const aim = new THREE.Vector3(Math.cos(angle), Math.sin(angle), lift).normalize();
        const tint = base.clone().offsetHSL((random() - 0.5) * 0.02, 0, (random() - 0.5) * 0.12);
        if (old > 0.8 && random() < 0.45) tint.set('#e9e6df');
        placed.push({ matrix: new THREE.Matrix4().compose(new THREE.Vector3(x, y, 0.05 * U), turn.setFromUnitVectors(up, aim), new THREE.Vector3(1 + old * 0.3, length, 1 + old * 0.3)), tint });
      };
      for (let i = 0; i < density; i++) {
        const t = random() ** 1.25;
        if (a.grooming === 'slit' && side === pierced && slits.some((cut) => Math.abs(t - cut - (random() - 0.5) * 0.01) < 0.04)) continue;
        const [x, y] = curve(side, t), [nx, ny] = curve(side, t + 0.02);
        const along = Math.atan2(ny - y, nx - x);
        const offset = (random() * 2 - 1) * half(t);
        // Hairs near the nose stand upright, then comb over to lie along the tail; edges lean in to the middle.
        const rise = mix(1.25, 0.12, Math.min(1, t * 1.5)) - Math.sign(offset) * 0.3 * Math.min(1, t * 2);
        const angle = side === 1 ? along + rise : along - rise;
        plant(x, y + offset, angle + (random() - 0.5) * (0.25 + wild * 0.5), 0.15 + wild * 0.35 + (a.thickness === 'bushy' ? 0.3 : 0), hairLong * (0.65 + random() * 0.6));
      }
      for (let i = 0; i < wild * 26 + old * 8; i++) {
        const t = random();
        const [x, y] = curve(side, t);
        plant(x, y + (random() * 2 - 1) * half(t) * 2.1, (side === 1 ? 0.9 : Math.PI - 0.9) + (random() - 0.5) * 1.6, 0.5 + random() * 0.5, hairLong * (0.9 + random() * 0.9));
      }
      if (a.thickness === 'monobrow') {
        const shape = shapeFor(side);
        for (let i = 0; i < 60; i++) {
          const t = random();
          plant(side * t * shape.gap * U, (shape.inner - (1 - t) * 0.25) * U + (random() * 2 - 1) * half(0) * 0.8, Math.PI / 2 - side * (0.2 + t * 0.4) + (random() - 0.5) * 0.4, 0.3, hairLong * (0.5 + random() * 0.5));
        }
      }
      const hairs = new THREE.InstancedMesh(hair, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55 }), placed.length);
      placed.forEach(({ matrix, tint }, index) => { hairs.setMatrixAt(index, matrix); hairs.setColorAt(index, tint); });
      hairs.castShadow = true;
      group.add(hairs);

      if (side === pierced) {
        if (a.grooming === 'slit') {
          for (const cut of slits) {
            const [x, y] = curve(side, cut);
            const bar = new THREE.Mesh(new THREE.BoxGeometry(0.32 * U, half(cut) * 2.8, 0.2 * U), skin);
            bar.position.set(x, y, 0.03 * U);
            bar.rotation.z = -side * 0.35;
            group.add(bar);
          }
        } else {
          const [x, y] = curve(side, 0.8);
          if (a.grooming === 'ring') {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6 * U, 0.085 * U, 8, 28), steel);
            ring.position.set(x, y - 0.25 * U, 0.3 * U);
            ring.rotation.set(0.5, side * 0.9, 0);
            const bead = new THREE.Mesh(new THREE.SphereGeometry(0.2 * U, 10, 8), steel);
            bead.position.set(x + side * 0.15 * U, y - 0.72 * U, 0.6 * U);
            group.add(ring, bead);
          } else {
            for (const end of [-1, 1]) {
              const ball = new THREE.Mesh(new THREE.SphereGeometry(0.27 * U, 12, 8), steel);
              ball.position.set(x + end * side * 0.08 * U, y + end * (half(0.8) + 0.3 * U), 0.22 * U);
              group.add(ball);
            }
            const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * U, 0.06 * U, half(0.8) * 2 + 0.6 * U, 6), steel);
            bar.position.set(x, y, 0.16 * U);
            group.add(bar);
          }
        }
      }
      group.traverse((node) => { node.castShadow = true; });
      face.add(group);
      return { group, side, lift: shapeFor(side).inner + shapeFor(side).arch };
    });

    // The skin answers the brows: rucked lines above raised ones, a furrow between knitted ones.
    const lifted = (side: number) => { const shape = shapeFor(side); return (shape.inner + shape.outer) / 2 + shape.arch; };
    for (const side of [-1, 1]) {
      const raise = Math.max(0, lifted(side) - 0.3) / 2;
      const lines = Math.min(4, Math.round(raise * 3.4 + old * 1.6));
      for (let i = 0; i < lines; i++) {
        const y = (lifted(side) * 0.75 + 1.0 + i * 0.52) * U;
        if (y > top - 0.5 * U) break;
        const bow = (0.12 + raise * 0.45) * U;
        face.add(crease([[side * 0.5 * U, y - bow, 0.03 * U], [side * 2.4 * U, y + bow * 0.4, 0.05 * U], [side * 4.6 * U, y + bow * 0.3, 0.05 * U], [side * 6.6 * U, y - bow * 1.2, 0.03 * U]], (0.045 + old * 0.035 + raise * 0.02) * U, shade));
      }
    }
    if (a.expression === 'worry' || a.expression === 'villain' || old > 0.8) {
      const deep = a.expression === 'bored' || a.expression === 'surprise' || a.expression === 'waggle' ? 0.05 : 0.085;
      const y = shapes[a.expression].inner * U;
      for (const side of [-1, 1]) face.add(crease([[side * 0.32 * U, y + 1.2 * U, 0.04 * U], [side * 0.22 * U, y + 0.5 * U, 0.12 * U], [side * 0.36 * U, y - 0.4 * U, 0.04 * U]], deep * U, shade));
    }

    const brass = s.material('#a8873f', { metalness: 0.8, roughness: 0.35 });
    const high = 5.4 * U;
    face.position.y = high;
    face.rotation.x = -0.22;
    s.root.add(face);
    s.lathe([[0, 0], [2.6 * U, 0], [2.6 * U, 0.2 * U], [0.6 * U, 0.5 * U], [0.25 * U, 0.75 * U], [0, 0.75 * U]], brass, [0, 0, -1.6 * U]);
    s.rod([0, 0.5 * U, -1.6 * U], [0, high + 1.5 * U, -0.75 * U], 0.17 * U, brass);

    const pace = mix(2, 9, mood.energy);
    const phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        if (a.expression === 'waggle') for (const brow of brows) brow.group.position.y = (Math.sin(time * pace + phase) * 0.5 + 0.2) * 0.55 * U;
        else if (a.expression === 'cocked') {
          const twitch = Math.max(0, Math.sin(time * pace * 0.35 + phase)) ** 6;
          for (const brow of brows) if (brow.side === highSide) brow.group.position.y = twitch * 0.3 * U;
        }
      },
    });
  },
});
