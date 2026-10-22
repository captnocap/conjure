import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Rand = () => number;

/** A cow horn: mouth at the origin facing up, curving down and away along +x to a closed tip. */
function hornGeometry(mouth: number, arc: number, sweep: number) {
  const rings = 18, sides = 16;
  const positions: number[] = [], colours: number[] = [], index: number[] = [];
  const pale = new THREE.Color('#d8c9a0'), mid = new THREE.Color('#7a5a38'), dark = new THREE.Color('#1d1612');
  const tint = new THREE.Color();
  for (let i = 0; i <= rings; i++) {
    const t = i / rings, phi = t * sweep;
    const cx = arc * (1 - Math.cos(phi)), cy = -arc * Math.sin(phi);
    const r = mouth * Math.pow(1 - t, 0.75) + 0.0015;
    if (t < 0.45) tint.copy(pale).lerp(mid, t / 0.45); else tint.copy(mid).lerp(dark, (t - 0.45) / 0.55);
    for (let j = 0; j < sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      positions.push(cx + Math.cos(phi) * Math.cos(angle) * r, cy + Math.sin(phi) * Math.cos(angle) * r, Math.sin(angle) * r);
      const streak = 0.92 + 0.12 * Math.sin(j * 2.4 + i * 0.3);
      colours.push(tint.r * streak, tint.g * streak, tint.b * streak);
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j, b = i * sides + ((j + 1) % sides), c = a + sides, d = b + sides;
      index.push(a, b, c, b, d, c);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** An irregular puddle outline. */
function blob(random: Rand, radius: number, lobes: number, stretch = 1) {
  const shape = new THREE.Shape();
  const n = 40;
  const phases = Array.from({ length: 4 }, () => random() * 6.28);
  for (let i = 0; i <= n; i++) {
    const angle = (i / n) * Math.PI * 2;
    const r = radius * (0.72 + 0.16 * Math.sin(angle * lobes + phases[0]) + 0.1 * Math.sin(angle * (lobes * 2 + 1) + phases[1]) + 0.07 * Math.sin(angle * 2 + phases[2]));
    const x = Math.cos(angle) * r * stretch, y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  return shape;
}

function sheetTexture(random: Rand, lines: number, blot: boolean, wet: boolean, wear: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 272;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#eadfbe';
  g.fillRect(0, 0, 384, 272);
  for (let i = 0; i < 30; i++) {
    g.fillStyle = `rgba(140,110,60,${0.03 + random() * 0.05 * (0.5 + wear)})`;
    g.beginPath();
    g.ellipse(random() * 384, random() * 272, 12 + random() * 50, 10 + random() * 30, random() * 3, 0, 7);
    g.fill();
  }
  let endX = 40, endY = 40;
  for (let line = 0; line < 9; line++) {
    const y = 38 + line * 24;
    g.fillStyle = 'rgba(120,90,60,0.3)';
    g.fillRect(30, y + 13, 324, 1);
    if (line >= lines) continue;
    let x = line === 0 ? 62 : 32;
    const stop = line === lines - 1 ? 90 + random() * 200 : 350;
    while (x < stop) {
      const w = 10 + random() * 30;
      g.fillStyle = '#231a14';
      for (let k = 0; k < w; k += 5.5) {
        g.fillRect(x + k, y, 3.2, 12);
        if (random() < 0.25) g.fillRect(x + k, y - 6, 3.2, 6);
        if (random() < 0.15) g.fillRect(x + k, y + 12, 3.2, 6);
      }
      x += w + 9;
    }
    endX = Math.min(x, 350);
    endY = y + 6;
  }
  if (lines > 0) {
    g.fillStyle = '#a3281c';
    g.fillRect(30, 30, 24, 30);
  }
  const splash = (x: number, y: number, r: number) => {
    g.fillStyle = '#0f0c0a';
    g.beginPath();
    for (let i = 0; i <= 30; i++) {
      const angle = (i / 30) * 6.283;
      const rr = r * (0.8 + 0.25 * Math.sin(angle * 5 + x) + 0.12 * Math.sin(angle * 9 + y));
      g.lineTo(x + Math.cos(angle) * rr, y + Math.sin(angle) * rr);
    }
    g.fill();
    for (let i = 0; i < 16; i++) {
      const angle = random() * 6.283, d = r * (1.2 + random() * 1.6);
      g.beginPath();
      g.arc(x + Math.cos(angle) * d, y + Math.sin(angle) * d, 1 + random() * r * 0.14, 0, 7);
      g.fill();
    }
  };
  if (blot) splash(Math.min(330, endX + 26), endY + 6, 26 + random() * 14);
  else if (wet) splash(endX + 6, endY + 2, 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, end: [endX / 384, endY / 272] as const };
}

const FEATHERS = {
  goose: 'White goose flight feathers, the ordinary working pen.',
  grey: 'Grey-brown barred goose feathers, cheap and plentiful.',
  crow: 'Glossy black crow quills for the finest lines.',
  swan: 'Broad swan feathers, long and extravagant.',
  stripped: 'Quills with the barbs stripped off down to a bare shaft, as real scribes cut them.',
} as const;

export default defineThing({
  questions: {
    holder: choice('How are the ink horns held?', {
      board: 'Hung through holes in a little raised plank, tips poking out underneath.',
      block: 'Wedged tip-down into a thick block of wood, curving up like tusks.',
      rings: 'Each horn in its own forged iron tripod ring.',
    }),
    second: choice('What is in the second horn?', {
      red: 'Vermilion red, for headings and feast days.',
      blue: 'Deep azurite blue.',
      green: 'Verdigris green, sharp and poisonous.',
      empty: 'Nothing: it is dry and crusted at the rim.',
    }),
    moment: choice('What has just happened?', {
      poised: 'Nothing yet: the pen stands in the black ink, ready, the page still to begin.',
      writing: 'Mid-sentence: the pen laid down on a half-written sheet, the last stroke still wet.',
      blot: 'A mistake: a fat black blot has dropped onto the written sheet.',
      spill: 'A disaster: the black horn has gone over and ink is spreading across the board.',
      cutting: 'Pen-making: the knife is out among curled shavings and a quill is half trimmed.',
      dry: 'Long disuse: ink dried to crust, a quill snapped and left.',
    }),
    feather: choice('What are the quills?', FEATHERS),
    spares: score('How many spare quills stand ready in the rack?', ['None, just the one pen', 'Two or three', 'A bristling fistful']),
    sheet: noul('Is there a sheet or scrap of parchment on the board?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const oakTone = new THREE.Color('#8f6b3f').lerp(new THREE.Color('#4c3826'), mood.wear * 0.7);
    const oak = (shift = 0) => s.material(oakTone.clone().offsetHSL(0, 0, shift), { roughness: 0.8 });
    const iron = s.material('#2f2c2a', { metalness: 0.55, roughness: 0.5 });
    const black = new THREE.MeshStandardMaterial({ color: '#0e0c0b', roughness: 0.18, metalness: 0.1 });
    const secondColour = { red: '#c4301c', blue: '#27479b', green: '#3f9c7a', empty: '#3a2c22' }[a.second];
    const second = new THREE.MeshStandardMaterial({ color: secondColour, roughness: 0.25, emissive: a.second === 'empty' ? '#000000' : secondColour, emissiveIntensity: 0.15 });
    const hornMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, side: THREE.DoubleSide });

    // The writing board everything sits on.
    const BW = 0.5, BD = 0.34, top = 0.02;
    s.box([BW, top, BD], [0, top / 2, 0], oak(0.02));
    for (const x of [-BW / 2 + 0.03, BW / 2 - 0.03]) s.box([0.035, 0.012, BD + 0.01], [x, -0.006 + 0.012, 0], oak(-0.05)).position.y = top + 0.001 - 0.021 + 0.02;
    for (let i = 0; i < 3 + Math.floor(mood.wear * 8); i++) {
      // Old ink rings and stains.
      const stain = s.mesh(new THREE.ShapeGeometry(blob(random, 0.006 + random() * 0.016, 2 + Math.floor(random() * 4), 0.7 + random() * 0.8)), new THREE.MeshStandardMaterial({ color: '#2a2019', roughness: 0.9, transparent: true, opacity: 0.55, depthWrite: false }), [(random() - 0.5) * BW * 0.85, top + 0.0006, (random() - 0.5) * BD * 0.85]);
      stain.rotation.x = -Math.PI / 2;
    }

    const mouthR = 0.027, arc = 0.15, sweep = 1.05;
    const spilled = a.moment === 'spill';
    const dry = a.moment === 'dry';
    const hz = -0.075;
    const horns: { x: number; y: number; z: number }[] = [];
    const makeHorn = (ink: THREE.Material | null, flip: number) => {
      const h = new Sculpture(context);
      const mesh = h.mesh(hornGeometry(mouthR, arc, sweep), hornMaterial);
      mesh.scale.x = flip;
      h.ring(mouthR, 0.003, [0, 0, 0], s.material('#cdbd92', { roughness: 0.4 })).rotation.x = Math.PI / 2;
      if (ink) h.cylinder(mouthR * 0.9, mouthR * 0.9, 0.002, [0, -0.007, 0], ink, 18);
      else h.cylinder(mouthR * 0.9, mouthR * 0.8, 0.002, [0, -0.03, 0], s.material('#1a1512', { roughness: 1 }), 18);
      return h;
    };

    let mouthY: number;
    if (a.holder === 'board') {
      mouthY = 0.175;
      const py = mouthY - 0.016;
      s.box([0.36, 0.018, 0.1], [0, py, hz], oak(0.04));
      for (const side of [-1, 1]) {
        s.box([0.025, py - top, 0.1], [side * 0.17, top + (py - top) / 2, hz], oak(-0.03));
        s.box([0.05, 0.02, 0.12], [side * 0.17, top + 0.01, hz], oak(-0.05));
      }
    } else if (a.holder === 'block') {
      mouthY = 0.2;
      s.box([0.34, 0.065, 0.1], [0, top + 0.0325, hz], oak(0.03));
      s.box([0.36, 0.014, 0.12], [0, top + 0.007, hz], oak(-0.04));
    } else {
      mouthY = 0.165;
      for (const side of [-1, 1]) {
        const cx = side * 0.085;
        s.ring(mouthR + 0.004, 0.004, [cx, mouthY - 0.025, hz], iron).rotation.x = Math.PI / 2;
        for (let i = 0; i < 3; i++) {
          const angle = i * 2.094 + (side > 0 ? 0.5 : 2.6);
          s.rod([cx + Math.cos(angle) * (mouthR + 0.004), mouthY - 0.025, hz + Math.sin(angle) * (mouthR + 0.004)], [cx + Math.cos(angle) * 0.07, top, hz + Math.sin(angle) * 0.07], 0.004, iron);
          s.ball([0.008, 0.004, 0.008], [cx + Math.cos(angle) * 0.07, top + 0.003, hz + Math.sin(angle) * 0.07], iron, 8);
        }
      }
    }
    [-1, 1].forEach((side) => {
      const isBlack = side < 0;
      const ink = dry ? null : isBlack ? black : a.second === 'empty' ? null : second;
      const h = makeHorn(isBlack && spilled ? null : ink, side);
      const x = side * 0.085;
      if (isBlack && spilled) {
        // Knocked out of its place and lying on its side, mouth toward the front.
        h.root.rotation.set(Math.PI / 2 - 0.08, 0, 0.5);
        h.root.position.set(x + 0.02, top + mouthR, hz + 0.1);
      } else {
        h.root.position.set(x, mouthY, hz);
        if (a.holder === 'block') h.root.rotation.z = side * -0.1;
        horns.push({ x, y: mouthY, z: hz });
      }
      s.root.add(h.root);
      // Runs of colour down the outside of the horn.
      if (ink && !isBlack) for (let i = 0; i < 1 + Math.floor(mood.wear * 3); i++) {
        const angle = random() * Math.PI - Math.PI / 2 + Math.PI / 2;
        s.rod([x + Math.cos(angle) * (mouthR + 0.001), mouthY, hz + Math.sin(angle) * (mouthR + 0.001)], [x + Math.cos(angle) * (mouthR - 0.001), mouthY - 0.02 - random() * 0.03, hz + Math.sin(angle) * (mouthR - 0.001)], 0.003, second, 0.002);
      }
    });
    if (spilled) {
      const pool = s.mesh(new THREE.ShapeGeometry(blob(random, 0.1 + random() * 0.03, 3, 1.25)), black, [-0.07, top + 0.0046, 0.045]);
      pool.rotation.x = -Math.PI / 2;
      // Fingers of ink reaching the front edge and running over it.
      for (let i = 0; i < 3; i++) {
        const x = -0.16 + i * 0.07 + random() * 0.03;
        s.box([0.012 + random() * 0.012, 0.002, 0.1], [x, top + 0.0042, BD / 2 - 0.05], black);
        s.rod([x, top, BD / 2 + 0.001], [x, top - 0.012 - random() * 0.008, BD / 2 + 0.002], 0.006, black, 0.003);
      }
    }

    // ---- quills ----
    const featherColour = { goose: '#f2eee2', grey: '#9a8c78', crow: '#1f1e22', swan: '#fbfaf5', stripped: '#e9dfc4' }[a.feather];
    const vane = new THREE.MeshStandardMaterial({ color: featherColour, roughness: a.feather === 'crow' ? 0.35 : 0.85, side: THREE.DoubleSide });
    const shaftMaterial = s.material('#e8dcbc', { roughness: 0.45 });
    const quill = (tip: THREE.ColorRepresentation, broken = false, uncut = false) => {
      const group = new THREE.Group();
      const length = (a.feather === 'swan' ? 0.33 : a.feather === 'crow' ? 0.2 : 0.26) * mix(0.9, 1.1, random());
      const bow = (random() - 0.3) * 0.03;
      const spine = (u: number) => new THREE.Vector3(Math.sin(u * 2.2) * bow, u * length, 0);
      const full = broken ? 0.55 : 1;
      const shaft = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([0, 0.25, 0.5, 0.75, 1].map((u) => spine(u * full))), 16, 0.0032, 6), shaftMaterial);
      shaft.castShadow = true;
      group.add(shaft);
      if (!uncut) {
        const nib = new THREE.Mesh(new THREE.ConeGeometry(0.0034, 0.022, 6), new THREE.MeshStandardMaterial({ color: tip, roughness: 0.3 }));
        nib.rotation.x = Math.PI;
        nib.position.y = 0.006;
        group.add(nib);
      }
      const from = a.feather === 'stripped' ? 0.72 : uncut ? 0.2 : 0.36;
      const wide = (a.feather === 'swan' ? 0.03 : a.feather === 'stripped' ? 0.01 : 0.021) * mix(0.85, 1.15, random());
      const shape = new THREE.Shape();
      const steps = 14;
      const edge: THREE.Vector2[] = [];
      for (const side of [1, -1]) {
        for (let i = 0; i <= steps; i++) {
          const u = side > 0 ? i / steps : 1 - i / steps;
          const p = spine(mix(from, 1.03, u) * full / (broken ? 0.98 : 1));
          const notch = (i === 5 || i === 10) && random() < 0.5 ? 0.45 : 1;
          const w = wide * Math.pow(Math.sin(Math.min(1, u * 0.93 + 0.07) * Math.PI), 0.55) * (side > 0 ? 1 : 0.55) * notch;
          edge.push(new THREE.Vector2(p.x + side * w, p.y));
        }
      }
      shape.setFromPoints(edge);
      if (!broken || full > 0.5) {
        const feather = new THREE.Mesh(new THREE.ShapeGeometry(shape), vane);
        feather.castShadow = true;
        if (!broken) group.add(feather);
      }
      if (broken) {
        // The snapped upper half lies at an angle to the stub.
        const upper = new THREE.Group();
        const part = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([0, 0.5, 1].map((u) => new THREE.Vector3(0, u * length * 0.45, 0))), 8, 0.003, 6), shaftMaterial);
        const blade = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0.01), new THREE.Vector2(wide, length * 0.2), new THREE.Vector2(wide * 0.5, length * 0.46), new THREE.Vector2(-wide * 0.5, length * 0.3)])), vane);
        part.castShadow = blade.castShadow = true;
        upper.add(part, blade);
        upper.position.y = length * 0.55;
        upper.rotation.z = 1.1 + random() * 0.6;
        group.add(upper);
      }
      return { group, length };
    };
    const stand = (q: THREE.Group, x: number, y: number, z: number, lean: number, turn: number) => {
      const holder = new THREE.Group();
      holder.position.set(x, y, z);
      holder.rotation.set(0, turn, 0);
      q.rotation.z = lean;
      q.rotation.y = random() * 3;
      holder.add(q);
      s.root.add(holder);
    };
    const lay = (q: THREE.Group, x: number, z: number, heading: number, y = top + 0.004) => {
      // Laid flat with the nib at (x, z) and the feather pointing along `heading` (radians from +x toward -z).
      const holder = new THREE.Group();
      holder.position.set(x, y, z);
      holder.rotation.y = heading;
      q.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
      holder.add(q);
      s.root.add(holder);
    };

    // Spares in a row of small holes at the back of the holder.
    const spares = Math.round(a.spares * 6);
    const rackY = a.holder === 'board' ? mouthY - 0.02 : a.holder === 'block' ? top + 0.06 : top;
    for (let i = 0; i < spares; i++) {
      const x = a.holder === 'rings' ? 0.19 + (i % 3) * 0.012 : mix(-0.15, 0.15, spares === 1 ? 0.5 : i / (spares - 1));
      const z = a.holder === 'rings' ? hz - 0.02 + Math.floor(i / 3) * 0.014 : hz - 0.036;
      stand(quill('#e8dcbc').group, x, rackY, z, (random() - 0.5) * 0.35, (random() - 0.5) * 0.8);
    }
    if (a.holder === 'rings' && spares > 0) s.cylinder(0.03, 0.026, 0.07, [0.2, top + 0.035, hz - 0.012], s.material('#8a6f4d'), 14);

    // A second pen lives in the coloured horn when it holds colour.
    if (a.second !== 'empty' && !dry && horns.length) {
      const h = horns[horns.length - 1];
      stand(quill(secondColour).group, h.x, h.y - 0.03, h.z, -0.42, 0.2);
    }

    // ---- the sheet and the moment ----
    const needsSheet = a.moment === 'writing' || a.moment === 'blot';
    const sheetW = 0.25, sheetD = 0.175;
    const sheetX = -0.09, sheetZ = 0.07, sheetTurn = (random() - 0.5) * 0.25;
    let end: readonly [number, number] = [0.5, 0.5];
    if (a.sheet || needsSheet) {
      const lines = needsSheet ? 2 + Math.floor(random() * 5) : a.moment === 'poised' ? 0 : 1 + Math.floor(random() * 3);
      const painted = sheetTexture(random, lines, a.moment === 'blot', a.moment === 'writing', mood.wear);
      end = painted.end;
      const sheet = s.mesh(new THREE.PlaneGeometry(sheetW, sheetD, 10, 1), new THREE.MeshStandardMaterial({ map: painted.texture, roughness: 0.9, side: THREE.DoubleSide }), [sheetX, top + 0.002, sheetZ]);
      const p = sheet.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.max(0, p.getX(i) - sheetW * 0.3) ** 2 * 2.5);
      sheet.geometry.computeVertexNormals();
      sheet.rotation.set(-Math.PI / 2, 0, sheetTurn);
    }
    const onSheet = (u: number, v: number): [number, number] => {
      const lx = (u - 0.5) * sheetW, lz = (v - 0.5) * sheetD;
      return [sheetX + lx * Math.cos(sheetTurn) + lz * Math.sin(sheetTurn), sheetZ - lx * Math.sin(sheetTurn) + lz * Math.cos(sheetTurn)];
    };
    const active = quill(dry ? '#3a2c22' : '#0e0c0b', dry, a.moment === 'cutting');
    if (a.moment === 'poised' && horns.length) {
      stand(active.group, horns[0].x, horns[0].y - 0.03, horns[0].z, 0.38, -0.3);
    } else if (a.moment === 'writing') {
      const [x, z] = onSheet(end[0] + 0.02, end[1]);
      lay(active.group, x, z, 0.55 + random() * 0.4, top + 0.006);
    } else if (a.moment === 'blot') {
      const [x, z] = onSheet(Math.min(0.9, end[0] + 0.1), end[1] - 0.12);
      lay(active.group, x, z, 0.2 + random() * 0.5, top + 0.006);
    } else if (a.moment === 'spill') {
      lay(active.group, 0.02, 0.1, 0.3 + random() * 0.6);
    } else {
      lay(active.group, 0.02 + random() * 0.03, 0.12, 0.25 + random() * 0.3);
    }

    // ---- the penknife ----
    const knife = new Sculpture(context);
    knife.box([0.075, 0.012, 0.015], [-0.0375, 0.006, 0], s.material('#3a281b', { roughness: 0.5 }));
    knife.box([0.008, 0.013, 0.016], [-0.002, 0.006, 0], s.material('#b8892c', { metalness: 0.7, roughness: 0.3 }));
    const blade = knife.mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(0, -0.006), new THREE.Vector2(0.045, -0.006), new THREE.Vector2(0.062, 0.002), new THREE.Vector2(0.04, 0.007), new THREE.Vector2(0, 0.006)]), { depth: 0.002, bevelEnabled: false }), s.material('#c3c7cb', { metalness: 0.85, roughness: 0.25 }), [0, 0.004, 0]);
    blade.rotation.x = -Math.PI / 2;
    knife.root.position.set(0.16, top + 0.001, 0.09 + random() * 0.04);
    knife.root.rotation.y = 0.9 + random() * 0.8;
    s.root.add(knife.root);
    if (a.moment === 'cutting') {
      knife.root.position.set(0.1, top + 0.001, 0.07);
      const curl = s.material('#efe6cd', { roughness: 0.6, side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) {
        const shaving = s.ring(0.004 + random() * 0.006, 0.0012, [0.02 + random() * 0.17, top + 0.006, 0.0 + random() * 0.14], curl, Math.PI * (0.8 + random()));
        shaving.rotation.set(random() * 3, random() * 3, random() * 3);
      }
    }

    // ---- the rest of a scribe's kit, as the place gets busier ----
    const clutter = Math.floor(mood.density * 4.2);
    if (clutter > 0) s.lathe([[0, 0], [0.022, 0], [0.026, 0.02], [0.016, 0.045], [0.02, 0.055], [0, 0.055]], s.material('#a48a5a'), [0.19, top, -0.02]);
    if (clutter > 1) {
      const pumice = s.ball([0.03, 0.017, 0.022], [0.2, top + 0.015, 0.045], s.material('#a9a59c', { roughness: 1 }), 10);
      pumice.rotation.y = random() * 3;
    }
    if (clutter > 2) s.box([0.3, 0.004, 0.022], [-0.06, top + 0.002, 0.152], oak(0.08)).rotation.y = 0.04;
    if (clutter > 3) {
      s.cylinder(0.016, 0.016, 0.012, [-0.215, top + 0.006, -0.01], s.material('#8d1f1a', { roughness: 0.4 }), 14);
      s.rod([-0.22, top + 0.004, 0.03], [-0.2, top + 0.004, 0.13], 0.003, s.material('#6f7377', { metalness: 0.4 }), 0.001);
    }
    if (dry) {
      const web = new THREE.MeshStandardMaterial({ color: '#e9e7de', roughness: 1 });
      const peak: [number, number, number] = [-0.085, mouthY + 0.005, hz];
      for (let i = 0; i < 4; i++) s.rod(peak, [-0.22 + random() * 0.12, top + 0.001, hz + 0.05 + random() * 0.08], 0.0007, web);
    }

    return s.finish();
  },
});
