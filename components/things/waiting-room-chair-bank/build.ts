import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, noul } from '@conjure/kit';

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    layout: choice('How is the bank arranged around its table?', {
      end: 'One straight run of chairs with the little table fused on at one end.',
      middle: 'A straight run split in two by the table, so two parties can sit apart.',
      corner: 'An L: two short runs meeting at a square corner table.',
    }),
    seats: choice('How many seats?', {
      three: 'Three, a short bank for a side corridor.',
      four: 'Four.',
      five: 'Five.',
      six: 'Six, a long run for a busy department.',
    }),
    colour: choice('What colour is the vinyl upholstery?', {
      teal: 'Institutional teal, the colour of scrubs and screens.',
      mauve: 'Dusty mauve-pink, chosen in the nineties to be calming.',
      beige: 'Beige, slightly sticky, showing every mark.',
      navy: 'Dark navy that hides everything.',
      mixed: 'Mismatched: replacement seats in a different colour from the originals.',
    }),
    frame: choice('What is the frame like?', {
      chrome: 'Bright chrome tube legs and beam.',
      black: 'Black powder-coated steel, chipped at the feet.',
      wood: 'Pale beech armrests and table edge on a grey frame.',
    }),
    arms: noul('Are there armrests between the seats, so nobody can lie down?'),
    left: choice('What has been left on the seats?', {
      nothing: 'Nothing. Every seat is empty.',
      coat: 'A folded winter coat with a scarf on top, keeping a place.',
      toy: 'A child\'s teddy sitting up alone in one seat.',
      bag: 'A plastic patient-property bag stuffed with someone\'s clothes and shoes.',
      bedding: 'A hospital blanket and a pillow where somebody has been sleeping across the seats.',
      paper: 'A newspaper folded open at the crossword and a paper cup.',
      handbag: 'A handbag and a bunch of supermarket flowers still in their wrap.',
    }),
    table: choice('What is on the little table?', {
      bare: 'Nothing but a ring mark.',
      cups: 'A cluster of empty vending-machine cups, one knocked over.',
      plant: 'A dusty artificial plant in a pot.',
      tissues: 'A box of tissues with one pulled half out.',
      magazines: 'A slumped stack of old magazines.',
    }),
    damage: choice('What has happened to the bank itself?', {
      none: 'Nothing; it is intact.',
      taped: 'One seat is split and mended with a cross of silver tape.',
      missing: 'One seat pad is gone, leaving the bare beam and brackets.',
      cordoned: 'One seat is crossed off with hazard tape and a DO NOT USE notice.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = { three: 3, four: 4, five: 5, six: 6 }[a.seats];
    const tones = { teal: '#2f8a86', mauve: '#b07a93', beige: '#cdb894', navy: '#2b3a5e', mixed: '#2f8a86' }[a.colour];
    const warmTint = new THREE.Color(tones).offsetHSL((mood.warmth - 0.5) * -0.03, (mood.cheer - 0.5) * 0.2, (mood.cheer - 0.5) * 0.06);
    const vinyl = (hex: THREE.ColorRepresentation) => s.material(hex, { roughness: 0.42 });
    const main = vinyl(warmTint);
    const odd = vinyl(a.colour === 'mixed' ? '#b9785a' : warmTint.clone().offsetHSL(0, 0, -0.04));
    const steel = a.frame === 'chrome' ? s.material('#d5dadc', { metalness: 0.85, roughness: 0.22 })
      : a.frame === 'black' ? s.material('#23262a', { roughness: 0.5 }) : s.material('#8d9396', { metalness: 0.4, roughness: 0.45 });
    const armPaint = a.frame === 'wood' ? s.material('#d2a877', { roughness: 0.5 }) : s.material('#2b2e31', { roughness: 0.6 });
    const laminate = s.material(a.frame === 'wood' ? '#e6d2ae' : '#e4e1d6', { roughness: 0.35 });
    const rubber = s.material('#1b1c1e');

    const P = 0.57, SEAT = 0.44, TABLE = 0.56;
    const seatGeo = new RoundedBoxGeometry(0.52, 0.1, 0.47, 4, 0.04);
    const backGeo = new RoundedBoxGeometry(0.52, 0.4, 0.075, 4, 0.035);
    const damaged = a.damage === 'none' ? -1 : Math.floor(random() * count);
    type Seat = { group: THREE.Group; x: number; index: number };
    const seatsBuilt: Seat[] = [];
    let seatIndex = 0;

    const part = (group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const box = (group: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) =>
      part(group, new THREE.BoxGeometry(w, h, d), material, x, y, z);

    /** One straight run: units are 's' for a seat or 't' for the table, laid along local x. */
    const run = (units: readonly ('s' | 't')[]) => {
      const group = new THREE.Group();
      s.root.add(group);
      const widths = units.map((unit) => (unit === 's' ? P : TABLE));
      const total = widths.reduce((sum, w) => sum + w, 0);
      let cursor = -total / 2;
      const centres: number[] = [];
      for (const w of widths) { centres.push(cursor + w / 2); cursor += w; }
      box(group, total - 0.06, 0.05, 0.08, 0, 0.34, -0.02, steel);
      const legAt = new Set<number>([0, units.length]);
      if (units.length > 4) legAt.add(Math.round(units.length / 2));
      let edge = -total / 2;
      for (let i = 0; i <= units.length; i++) {
        if (legAt.has(i)) {
          const x = THREE.MathUtils.clamp(edge, -total / 2 + 0.05, total / 2 - 0.05);
          box(group, 0.05, 0.31, 0.06, x, 0.175, -0.02, steel);
          box(group, 0.05, 0.035, 0.56, x, 0.035, 0, steel);
          for (const z of [-0.26, 0.26]) box(group, 0.06, 0.02, 0.06, x, 0.01, z, rubber);
        }
        if (a.arms && i > 0 && i < units.length && units[i - 1] === 's' && units[i] === 's') {
          box(group, 0.03, 0.2, 0.03, edge, 0.5, 0.12, steel);
          box(group, 0.03, 0.2, 0.03, edge, 0.5, -0.14, steel);
          part(group, new RoundedBoxGeometry(0.055, 0.03, 0.36, 2, 0.012), armPaint, edge, 0.61, -0.01);
        }
        edge += widths[i] ?? 0;
      }
      units.forEach((unit, i) => {
        const x = centres[i];
        if (unit === 't') {
          part(group, new RoundedBoxGeometry(TABLE - 0.04, 0.035, 0.52, 2, 0.012), laminate, x, 0.43, 0);
          if (a.frame === 'wood') box(group, TABLE - 0.03, 0.02, 0.53, x, 0.42, 0, armPaint);
          box(group, 0.3, 0.05, 0.3, x, 0.39, 0, steel);
          tableAt = { group, x };
          return;
        }
        const index = seatIndex++;
        seatsBuilt.push({ group, x, index });
        const material = a.colour === 'mixed' && (index * 7 + Math.floor(context.seed % 3)) % 3 === 0 ? odd : main;
        // Brackets from beam to seat and back.
        box(group, 0.3, 0.03, 0.34, x, 0.375, 0.02, steel);
        const spine = box(group, 0.07, 0.36, 0.02, x, 0.56, -0.235, steel);
        spine.rotation.x = -0.16;
        if (index === damaged && a.damage === 'missing') {
          for (const dx of [-0.11, 0.11]) for (const dz of [-0.1, 0.14]) part(group, new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), rubber, x + dx, 0.4, dz);
          const back = part(group, backGeo, material, x, 0.74, -0.27);
          back.rotation.x = -0.16;
          return;
        }
        const pad = part(group, seatGeo, material, x, SEAT, 0.03);
        pad.rotation.x = 0.045;
        pad.rotation.z = (random() - 0.5) * mood.wear * 0.05;
        const back = part(group, backGeo, material, x, 0.74, -0.27);
        back.rotation.x = -0.16 - random() * mood.wear * 0.08;
        // A sagged dent and a sheen line where people sit.
        const dent = part(group, new THREE.CircleGeometry(0.17, 20), new THREE.MeshStandardMaterial({ color: '#000000', transparent: true, opacity: 0.03 + mood.wear * 0.08, depthWrite: false }), x, SEAT + 0.054, 0.05);
        dent.rotation.x = -Math.PI / 2 + 0.045;
        dent.castShadow = false;
        if (index === damaged && a.damage === 'taped') {
          const tape = s.material('#b9bdbf', { metalness: 0.5, roughness: 0.4 });
          for (const turn of [0.6, -0.5]) {
            const strip = box(group, 0.3, 0.004, 0.05, x + (random() - 0.5) * 0.06, SEAT + 0.056, 0.06, tape);
            strip.rotation.set(0.045, turn + (random() - 0.5) * 0.3, 0);
          }
          const foam = box(group, 0.07, 0.012, 0.03, x + 0.14, SEAT + 0.055, 0.18, s.material('#e3cf7a'));
          foam.rotation.y = 0.5;
        }
        if (index === damaged && a.damage === 'cordoned') {
          const hazard = new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide, map: paint(128, 16, (ctx) => {
            ctx.fillStyle = '#f2c81a'; ctx.fillRect(0, 0, 128, 16);
            ctx.fillStyle = '#17181a';
            for (let i = -1; i < 9; i++) { ctx.beginPath(); ctx.moveTo(i * 16, 16); ctx.lineTo(i * 16 + 8, 16); ctx.lineTo(i * 16 + 24, 0); ctx.lineTo(i * 16 + 16, 0); ctx.fill(); }
          }) });
          for (const lean of [0.62, -0.62]) {
            const tape = part(group, new THREE.PlaneGeometry(0.66, 0.05), hazard, x, 0.72, -0.215);
            tape.rotation.set(-0.16, 0, lean);
          }
          const flat = part(group, new THREE.PlaneGeometry(0.6, 0.05), hazard, x, SEAT + 0.056, 0.03);
          flat.rotation.set(-Math.PI / 2 + 0.045, 0, 0.7);
          const sign = s.label('DO NOT USE', 0.3, 0.2, [0, 0, 0], '#b3201a', '#fbfaf2');
          group.add(sign);
          sign.position.set(x, 0.75, -0.2);
          sign.rotation.set(-0.16, 0, (random() - 0.5) * 0.2);
        }
      });
      return group;
    };

    let tableAt: { group: THREE.Group; x: number } | null = null;
    if (a.layout === 'corner') {
      const first = Math.ceil(count / 2), second = count - first;
      const back = run([...Array<'s'>(first).fill('s')]);
      const side = run([...Array<'s'>(second).fill('s')]);
      // Back run faces +z; the side run faces +x and comes forward from the corner table.
      const backLength = first * P, sideLength = second * P;
      back.position.set(TABLE / 2 + backLength / 2, 0, 0);
      side.rotation.y = Math.PI / 2;
      side.position.set(0, 0, TABLE / 2 + sideLength / 2);
      const corner = new THREE.Group();
      s.root.add(corner);
      part(corner, new RoundedBoxGeometry(TABLE - 0.02, 0.035, TABLE - 0.02, 2, 0.012), laminate, 0, 0.43, 0);
      box(corner, 0.06, 0.4, 0.06, -0.18, 0.2, -0.18, steel);
      box(corner, 0.1, 0.02, 0.1, -0.18, 0.01, -0.18, rubber);
      box(corner, 0.5, 0.05, 0.08, 0.03, 0.34, -0.02, steel);
      box(corner, 0.08, 0.05, 0.5, 0, 0.34, 0.03, steel);
      tableAt = { group: corner, x: 0 };
    } else if (a.layout === 'middle') {
      const first = Math.ceil(count / 2);
      run([...Array<'s'>(first).fill('s'), 't', ...Array<'s'>(count - first).fill('s')]);
    } else {
      const units: ('s' | 't')[] = Array<'s'>(count).fill('s');
      if (random() < 0.5) units.push('t'); else units.unshift('t');
      run(units);
    }

    // ---- What was left behind -------------------------------------------------------------
    const free = seatsBuilt.filter((seat) => seat.index !== damaged);
    const take = () => free.splice(Math.floor(random() * free.length), 1)[0];
    const top = SEAT + 0.052;
    const cloth = (hex: THREE.ColorRepresentation) => s.material(hex, { roughness: 0.95 });

    if (a.left === 'coat' && free.length) {
      const seat = take(), g = new THREE.Group();
      seat.group.add(g);
      g.position.set(seat.x, top, 0.03);
      g.rotation.y = (random() - 0.5) * 0.5;
      const wool = cloth(['#3a3f4a', '#5a3b2e', '#70705a', '#7a2f35'][Math.floor(random() * 4)]);
      part(g, new RoundedBoxGeometry(0.42, 0.07, 0.36, 3, 0.03), wool, 0, 0.035, 0);
      part(g, new RoundedBoxGeometry(0.4, 0.06, 0.24, 3, 0.028), wool, 0.01, 0.095, -0.04).rotation.y = 0.08;
      const sleeve = part(g, new RoundedBoxGeometry(0.11, 0.3, 0.06, 3, 0.028), wool, 0.12, -0.09, 0.22);
      sleeve.rotation.x = 0.12;
      part(g, new RoundedBoxGeometry(0.24, 0.035, 0.07, 2, 0.015), s.material('#2a2d33', { roughness: 0.8 }), -0.02, 0.135, -0.13);
      const scarf = cloth(mood.cheer > 0.5 ? '#c9473b' : '#8d8f7c');
      part(g, new RoundedBoxGeometry(0.3, 0.035, 0.11, 2, 0.015), scarf, -0.03, 0.14, 0.0).rotation.y = 0.5;
      part(g, new RoundedBoxGeometry(0.09, 0.2, 0.03, 2, 0.012), scarf, -0.17, 0.02, 0.2).rotation.x = 0.1;
    }

    if (a.left === 'toy' && free.length) {
      const seat = take(), g = new THREE.Group();
      seat.group.add(g);
      g.position.set(seat.x + (random() - 0.5) * 0.1, top, -0.06);
      g.rotation.set(-0.12, (random() - 0.5) * 0.7, (random() - 0.5) * 0.3 * (0.3 + mood.wear));
      const fur = cloth(new THREE.Color('#b98452').lerp(new THREE.Color('#e9c46a'), mood.cheer * 0.6));
      const pale = cloth('#ead9b8'), ink = s.material('#191613', { roughness: 0.3 });
      const ball = (m: THREE.Material, r: [number, number, number], p: [number, number, number]) => {
        const mesh = part(g, new THREE.SphereGeometry(1, 16, 12), m, ...p);
        mesh.scale.set(...r);
        return mesh;
      };
      ball(fur, [0.085, 0.1, 0.075], [0, 0.1, 0]);
      ball(fur, [0.072, 0.066, 0.066], [0, 0.235, 0.012]);
      ball(pale, [0.036, 0.03, 0.03], [0, 0.22, 0.068]);
      ball(ink, [0.011, 0.009, 0.008], [0, 0.23, 0.097]);
      for (const side of [-1, 1]) {
        ball(fur, [0.028, 0.028, 0.014], [side * 0.058, 0.292, 0]);
        ball(ink, [0.008, 0.008, 0.006], [side * 0.027, 0.252, 0.068]);
        ball(fur, [0.03, 0.03, 0.075], [side * 0.058, 0.04, 0.085]).rotation.y = side * 0.35;
        ball(pale, [0.024, 0.026, 0.01], [side * 0.082, 0.04, 0.155]);
        ball(fur, [0.027, 0.07, 0.027], [side * 0.098, 0.115, 0.02]).rotation.z = side * 0.6;
      }
      const ribbon = s.material(mood.cheer > 0.4 ? '#d2392f' : '#4b6f9c', { roughness: 0.6 });
      part(g, new THREE.TorusGeometry(0.05, 0.011, 6, 16), ribbon, 0, 0.183, 0.005).rotation.x = Math.PI / 2;
      // A hospital wristband around one paw when the mood is grim: it has been here a while.
      if (mood.cheer < 0.4) part(g, new THREE.TorusGeometry(0.03, 0.006, 6, 14), s.material('#f4f4ee'), 0.118, 0.085, 0.03).rotation.set(Math.PI / 2, 0.6, 0);
    }

    if (a.left === 'bag' && free.length) {
      const seat = take(), g = new THREE.Group();
      seat.group.add(g);
      g.position.set(seat.x, top, 0);
      g.rotation.y = (random() - 0.5) * 0.4;
      const plastic = s.material('#eef1ef', { roughness: 0.3 });
      const body = part(g, new RoundedBoxGeometry(0.36, 0.3, 0.24, 4, 0.09), plastic, 0, 0.15, 0);
      body.scale.set(1, 1, 1 + random() * 0.15);
      const stamp = s.label('PATIENT PROPERTY', 0.28, 0.1, [0, 0, 0], '#2a5a8c', '#eef1ef');
      g.add(stamp);
      stamp.position.set(0, 0.15, 0.125 * body.scale.z + 0.002);
      for (const side of [-1, 1]) part(g, new THREE.TorusGeometry(0.06, 0.008, 6, 16, Math.PI), plastic, side * 0.07, 0.3, 0).rotation.y = Math.PI / 2;
      const clothes = ['#5a6f8f', '#c7b299', '#7d3d44', '#39424c', '#d7d2c6'];
      for (let i = 0; i < 4; i++) part(g, new RoundedBoxGeometry(0.13 + random() * 0.1, 0.07, 0.12, 2, 0.03), cloth(clothes[Math.floor(random() * clothes.length)]), (random() - 0.5) * 0.16, 0.3 + random() * 0.03, (random() - 0.5) * 0.06).rotation.set(random() * 0.5, random() * 3, random() * 0.5);
      // A pair of shoes set neatly on the floor beneath.
      const leather = s.material('#3b2c22', { roughness: 0.5 });
      for (const side of [-1, 1]) {
        const shoe = part(g, new RoundedBoxGeometry(0.09, 0.06, 0.25, 3, 0.028), leather, side * 0.07, -top + 0.03, 0.4);
        shoe.rotation.y = side * 0.08;
      }
    }

    if (a.left === 'bedding' && free.length) {
      const seat = free.splice(0, 1)[0], g = new THREE.Group();
      seat.group.add(g);
      g.position.set(seat.x, top, 0);
      const pillow = part(g, new RoundedBoxGeometry(0.46, 0.13, 0.34, 4, 0.06), cloth('#f1f0ea'), 0, 0.06, 0);
      pillow.rotation.set(0.1, (random() - 0.5) * 0.3, 0.05);
      const dent = part(g, new THREE.SphereGeometry(0.09, 12, 8), cloth('#e2e0d8'), 0.02, 0.1, 0.0);
      dent.scale.set(1, 0.25, 1);
      const blanket = cloth(new THREE.Color('#7fa7c9').lerp(new THREE.Color('#d7b98c'), mood.warmth * 0.7));
      const neighbour = free.find((other) => other.group === seat.group && Math.abs(other.x - seat.x) < P * 1.1);
      const sign = neighbour ? Math.sign(neighbour.x - seat.x) : 1;
      if (neighbour) free.splice(free.indexOf(neighbour), 1);
      // Cellular blanket thrown back in three lumps and a tail hanging to the floor.
      const lumps: [number, number, number, number, number, number][] = [[0.5, 0.07, 0.42, 0.56, 0.03, 0.02], [0.34, 0.1, 0.3, 0.7, 0.09, -0.03], [0.34, 0.4, 0.07, 0.62, -0.15, 0.275]];
      for (const [w, h, d, dx, dy, dz] of lumps) {
        const lump = part(g, new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.4), blanket, sign * dx, dy + 0.02, dz);
        lump.rotation.set((random() - 0.5) * 0.2, (random() - 0.5) * 0.4, (random() - 0.5) * 0.15);
      }
    }

    if (a.left === 'paper' && free.length) {
      const seat = take(), g = new THREE.Group();
      seat.group.add(g);
      g.position.set(seat.x, top, 0.04);
      const news = new THREE.MeshStandardMaterial({ roughness: 0.9, map: paint(192, 256, (ctx) => {
        ctx.fillStyle = '#e9e6da'; ctx.fillRect(0, 0, 192, 256);
        ctx.fillStyle = '#222'; ctx.fillRect(10, 10, 172, 16);
        ctx.fillStyle = '#555';
        for (let y = 36; y < 130; y += 6) { ctx.fillRect(10, y, 78 * (0.7 + random() * 0.3), 2); }
        ctx.strokeStyle = '#222'; ctx.fillStyle = '#222';
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { if (random() < 0.24) ctx.fillRect(98 + c * 9, 36 + r * 9, 9, 9); else ctx.strokeRect(98 + c * 9, 36 + r * 9, 9, 9); }
        ctx.fillStyle = '#777';
        for (let y = 140; y < 246; y += 6) { ctx.fillRect(10, y, 80, 2); ctx.fillRect(100, y, 82 * (0.6 + random() * 0.4), 2); }
      }) });
      const sheet = part(g, new THREE.BoxGeometry(0.3, 0.014, 0.4), [laminate, laminate, news, laminate, laminate, laminate], 0, 0.008, 0);
      sheet.rotation.y = (random() - 0.5) * 0.7;
      const pen = part(g, new THREE.CylinderGeometry(0.005, 0.005, 0.14, 8), s.material('#1f3e8a'), 0.06, 0.022, 0.04);
      pen.rotation.set(Math.PI / 2, 0, 0.9);
      const cupSeat = free.length ? take() : seat;
      const cup = part(cupSeat.group, new THREE.CylinderGeometry(0.04, 0.028, 0.1, 16), s.material('#f6f2e6', { roughness: 0.6 }), cupSeat.x + 0.12, top + 0.05, 0.12);
      part(cupSeat.group, new THREE.CylinderGeometry(0.036, 0.036, 0.004, 16), s.material('#4a2c1a', { roughness: 0.3 }), cup.position.x, top + 0.085, 0.12);
    }

    if (a.left === 'handbag' && free.length) {
      const seat = take(), g = new THREE.Group();
      seat.group.add(g);
      g.position.set(seat.x - 0.06, top, 0);
      const hide = s.material(['#7a3b2a', '#22252b', '#9a7a3d'][Math.floor(random() * 3)], { roughness: 0.45 });
      part(g, new RoundedBoxGeometry(0.3, 0.2, 0.13, 3, 0.04), hide, 0, 0.1, -0.05);
      part(g, new THREE.TorusGeometry(0.09, 0.009, 6, 18, Math.PI), hide, 0, 0.19, -0.05);
      part(g, new THREE.BoxGeometry(0.04, 0.03, 0.01), s.material('#d9b44a', { metalness: 0.8, roughness: 0.3 }), 0, 0.15, 0.018);
      // Flowers in cellophane, laid across the next part of the seat.
      const wrap = part(g, new THREE.ConeGeometry(0.09, 0.4, 10, 1, true), new THREE.MeshStandardMaterial({ color: '#f2ead0', roughness: 0.4, side: THREE.DoubleSide }), 0.12, 0.07, 0.14);
      wrap.rotation.set(0, 0, Math.PI / 2 + 0.05);
      const petals = ['#e8b83a', '#d8527a', '#f1eee6', '#c7402f', '#9c6ac0'];
      for (let i = 0; i < 9; i++) {
        const bloom = part(g, new THREE.SphereGeometry(0.03 + random() * 0.012, 8, 6), cloth(new THREE.Color(petals[Math.floor(random() * petals.length)]).lerp(new THREE.Color('#8a7a5a'), (1 - mood.cheer) * 0.5)), -0.1 + random() * 0.04, 0.07 + (random() - 0.5) * 0.11, 0.14 + (random() - 0.5) * 0.13);
        bloom.scale.y = 0.8;
      }
    }

    // Extra litter on a crowded day: paper cups under the seats and a leaflet or two.
    const extras = Math.round(mood.density * 3 + mood.wear * 2);
    for (let i = 0; i < extras && seatsBuilt.length; i++) {
      const seat = seatsBuilt[Math.floor(random() * seatsBuilt.length)];
      const cup = part(seat.group, new THREE.CylinderGeometry(0.036, 0.026, 0.09, 12), s.material('#f3efe2'), seat.x + (random() - 0.5) * 0.3, 0.036, -0.05 + random() * 0.4);
      if (random() < 0.6) cup.rotation.set(Math.PI / 2, 0, random() * 3);
      else cup.position.y = 0.045;
    }

    // ---- Table top ------------------------------------------------------------------------
    const tableSpot = tableAt as { group: THREE.Group; x: number } | null;
    if (tableSpot) {
      const g = new THREE.Group();
      tableSpot.group.add(g);
      g.position.set(tableSpot.x, 0.448, 0);
      const ringMark = part(g, new THREE.RingGeometry(0.03, 0.036, 20), new THREE.MeshStandardMaterial({ color: '#6b4a2a', transparent: true, opacity: 0.25 + mood.wear * 0.4, depthWrite: false }), (random() - 0.5) * 0.2, 0.001, (random() - 0.5) * 0.2);
      ringMark.rotation.x = -Math.PI / 2;
      ringMark.castShadow = false;
      if (a.table === 'cups') {
        const n = 2 + Math.round(mood.density * 4);
        for (let i = 0; i < n; i++) {
          const cup = part(g, new THREE.CylinderGeometry(0.036, 0.026, 0.09, 12), s.material(i % 3 === 0 ? '#c9a37a' : '#f3efe2'), (random() - 0.5) * 0.34, 0.045, (random() - 0.5) * 0.34);
          if (i === 0) { cup.rotation.set(Math.PI / 2, 0, random() * 3); cup.position.y = 0.036; }
        }
      } else if (a.table === 'plant') {
        part(g, new THREE.CylinderGeometry(0.08, 0.06, 0.12, 16), s.material('#b0623f', { roughness: 0.8 }), 0, 0.06, -0.05);
        const leaf = s.material(new THREE.Color('#3f7a44').lerp(new THREE.Color('#8a8a6a'), mood.wear * 0.6), { roughness: 0.5, side: THREE.DoubleSide });
        const leaves = 9 + Math.floor(random() * 6);
        for (let i = 0; i < leaves; i++) {
          const blade = part(g, new THREE.SphereGeometry(1, 8, 6), leaf, 0, 0.12, -0.05);
          const lean = 0.25 + random() * 0.8, turn = (i / leaves) * Math.PI * 2 + random() * 0.4, length = 0.13 + random() * 0.1;
          blade.scale.set(0.03, length, 0.008);
          blade.rotation.set(0, turn, 0);
          blade.rotateZ(lean);
          blade.translateY(length);
        }
      } else if (a.table === 'tissues') {
        const tint = s.material(mood.cheer > 0.5 ? '#86b7d6' : '#b8c2c4', { roughness: 0.7 });
        const boxMesh = part(g, new RoundedBoxGeometry(0.24, 0.085, 0.125, 2, 0.01), tint, 0.02, 0.043, 0.02);
        boxMesh.rotation.y = (random() - 0.5) * 0.9;
        const tissue = part(g, new THREE.ConeGeometry(0.045, 0.1, 5), s.material('#fbfbf8', { roughness: 0.9 }), 0.02, 0.12, 0.02);
        tissue.rotation.set(0.2, random() * 3, 0.25);
        for (let i = 0; i < Math.round((1 - mood.cheer) * 3); i++) part(g, new THREE.IcosahedronGeometry(0.028, 0), s.material('#f4f3ee', { roughness: 0.95 }), (random() - 0.5) * 0.36, 0.022, 0.12 + random() * 0.1).rotation.set(random() * 3, random() * 3, 0);
      } else if (a.table === 'magazines') {
        const covers = ['#c0392b', '#2c6fb0', '#e0a526', '#2f8f6a', '#8b4a9c', '#e7e2d2', '#d86a8a'];
        const n = 3 + Math.round(mood.density * 5);
        for (let i = 0; i < n; i++) {
          const mag = part(g, new THREE.BoxGeometry(0.21, 0.008, 0.28), s.material(covers[Math.floor(random() * covers.length)], { roughness: 0.4 }), (random() - 0.5) * 0.1 * (1 + mood.wear), 0.005 + i * 0.0085, (random() - 0.5) * 0.08 * (1 + mood.wear));
          mag.rotation.y = (random() - 0.5) * (0.4 + mood.wear * 1.2);
        }
      }
    }

    return s.finish();
  },
});
