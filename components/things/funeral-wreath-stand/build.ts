import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type V3 = readonly [number, number, number];
type Inst = { p: V3; r?: V3; n?: V3; s?: V3; c?: THREE.ColorRepresentation };

function instances(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, list: Inst[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(list.length, 1));
  mesh.count = list.length;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  list.forEach((it, i) => {
    const k = it.s ?? [1, 1, 1];
    if (it.n) q.setFromUnitVectors(up, dir.set(it.n[0], it.n[1], it.n[2]).normalize());
    else { const r = it.r ?? [0, 0, 0]; q.setFromEuler(e.set(r[0], r[1], r[2])); }
    m.compose(v.set(it.p[0], it.p[1], it.p[2]), q, sc.set(k[0], k[1], k[2]));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(it.c ?? '#ffffff'));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  parent.add(mesh);
  return mesh;
}

const FONT: Record<string, string> = {
  A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', D: '11110100011000110001100011000111110',
  E: '11111100001000011110100001000011111', G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001',
  M: '10001110111010110101100011000110001', N: '10001110011010110011100011000110001', O: '01110100011000110001100011000101110',
  R: '11110100011000111110101001001010001', S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100',
  U: '10001100011000110001100011000101110',
};

const FLOWERS = {
  lilies: { mass: ['#fbf9f2', '#f6f1e1', '#fffdf8'], kind: 'trumpet', size: 0.06, fill: 0.42, leaf: 1.2, leafColour: '#3f6e3a' },
  carnations: { mass: ['#d8263c', '#f08aa8', '#f6c12a', '#f28a2a', '#fbf5ee', '#b0204a'], kind: 'ball', size: 0.041, fill: 1, leaf: 0.35, leafColour: '#4f7a3a' },
  wild: { mass: ['#4f6fd0', '#e2402f', '#f4d13a', '#ffffff', '#9a5cc4', '#f08aa8', '#ffffff'], kind: 'ball', size: 0.027, fill: 1.25, leaf: 0.8, leafColour: '#6f9a45' },
  chrysanths: { mass: ['#fbf8ee', '#f4f0e0', '#fffdf6'], kind: 'ball', size: 0.043, fill: 1, leaf: 0.3, leafColour: '#3f6e3a' },
  roses: { mass: ['#a3122a', '#c21c36', '#7d0d20'], kind: 'ball', size: 0.039, fill: 1, leaf: 0.8, leafColour: '#27492c' },
  poppies: { mass: ['#d8222a', '#c41c24', '#e02a30'], kind: 'disc', size: 0.052, fill: 0.8, leaf: 0.25, leafColour: '#2f5a34' },
} as const;

const MESSAGES = { peace: 'REST IN PEACE', sympathy: 'WITH DEEPEST SYMPATHY', beloved: 'BELOVED', club: 'FROM ALL AT THE CLUB', meet: 'UNTIL WE MEET AGAIN', forget: 'LEST WE FORGET', blank: '' } as const;

export default defineThing({
  questions: {
    form: choice('What shape is the tribute?', {
      ring: 'A classic round wreath, an open ring of flowers.',
      heart: 'An open heart outlined in flowers.',
      cross: 'A solid cross of massed flowers.',
      spray: 'A long teardrop spray, flowers at the centre and foliage fanning out.',
      letters: 'Block letters of massed flower heads spelling a name, edged in coloured ribbon.',
    }),
    word: choice('If it is lettered, what does it spell?', {
      DAD: 'DAD', MUM: 'MUM', NAN: 'NAN', GRANDAD: 'GRANDAD', SON: 'SON', BROTHER: 'BROTHER', MATE: 'MATE',
    }),
    flowers: choice('What is it made of?', {
      lilies: 'White lilies among dark glossy leaves, formal and heavily scented.',
      carnations: 'Bright carnations packed tight in red, pink, yellow and orange.',
      wild: 'Loose wildflowers and grasses in every colour, ragged at the edges, picked rather than bought.',
      chrysanths: 'Massed white chrysanthemums with one small spray of colour pinned on.',
      roses: 'Deep red roses and dark leaves.',
      poppies: 'Flat red paper poppies with black centres, a remembrance wreath.',
    }),
    sash: choice('What ribbon sash crosses it?', {
      white: 'White satin with gold lettering.',
      black: 'Black with silver lettering.',
      purple: 'Purple with gold lettering.',
      team: 'Red and white stripes in the colours of a football club.',
      none: 'No sash.',
    }),
    message: choice('If there is a sash, what does it say?', {
      peace: 'REST IN PEACE', sympathy: 'WITH DEEPEST SYMPATHY', beloved: 'BELOVED', club: 'FROM ALL AT THE CLUB', meet: 'UNTIL WE MEET AGAIN', forget: 'LEST WE FORGET', blank: 'Nothing, the ribbon is plain.',
    }),
    stand: choice('How is it displayed?', {
      tripod: 'On a tall wire tripod at chest height.',
      low: 'On a short wire stand at knee height.',
      ground: 'Laid on the ground, propped up at an angle on a wire leg.',
    }),
    standing: score('How long has it been standing there?', [
      'Delivered this morning, every petal perfect',
      'Since yesterday',
      'Several days: browning at the edges, petals on the floor',
      'Weeks: dried out and forgotten',
    ]),
    card: noul('Is there a small white card on a pick tucked into it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const F = FLOWERS[a.flowers];
    const stale = Math.min(1, a.standing * 0.85 + mood.wear * 0.25);
    const dead = new THREE.Color('#8a6a3c'), grey = new THREE.Color('#9a968c');
    const tone = (hex: string, extra = 0) => new THREE.Color(hex).lerp(grey, (1 - mood.cheer) * 0.14).lerp(dead, Math.min(0.85, stale ** 1.6 * rnd(0.5, 1) * 0.85 + extra)).offsetHSL(0, 0, rnd(-0.03, 0.03));
    const accentColours = mood.cheer > 0.5 ? ['#e8432e', '#f2b632', '#e96aa0', '#8c5cc4'] : a.flowers === 'roses' ? ['#fbf8ee'] : ['#a3122a', '#c21c36', '#f08aa8'];

    const tribute = new THREE.Group();
    const balls: Inst[] = [], cones: Inst[] = [], discs: Inst[] = [], leaves: Inst[] = [], boxes: Inst[] = [], floor: Inst[] = [];
    const shrink = 1 - stale * 0.25;
    const head = (x: number, y: number, z: number, n: V3, colour?: string, size: number = F.size) => {
      const droop = stale * rnd(0, 0.035);
      const c = tone(colour ?? pick(F.mass));
      const k = size * shrink * rnd(0.82, 1.15);
      if (F.kind === 'trumpet' && !colour) {
        cones.push({ p: [x + n[0] * 0.03, y + n[1] * 0.03 - droop, z + n[2] * 0.03], n: [n[0] + rnd(-0.5, 0.5), n[1] + rnd(-0.5, 0.5) - stale * 0.6, n[2]], s: [k, k * 1.25, k], c });
        balls.push({ p: [x + n[0] * 0.05, y + n[1] * 0.05 - droop, z + n[2] * 0.05], s: [k * 0.22, k * 0.22, k * 0.22], c: tone('#e39a2a'), r: [0, 0, 0] });
      } else if (F.kind === 'disc' && !colour) {
        discs.push({ p: [x, y - droop, z], n: [n[0] + rnd(-0.25, 0.25), n[1] + rnd(-0.25, 0.25), n[2]], s: [k, 0.008, k], c });
        balls.push({ p: [x + n[0] * 0.008, y + n[1] * 0.008 - droop, z + n[2] * 0.008], s: [k * 0.3, k * 0.3, k * 0.3], c: '#1a1a1c' });
      } else balls.push({ p: [x, y - droop, z], s: [k, k, k * 0.85], c, r: [rnd(0, 3), rnd(0, 3), rnd(0, 3)] });
    };
    const leaf = (x: number, y: number, z: number, angle: number, length = 0.09) => {
      leaves.push({ p: [x, y, z], r: [rnd(-0.3, 0.3), rnd(-0.3, 0.3), angle + rnd(-0.4, 0.4)], s: [length * rnd(0.8, 1.3), length * 0.3, 0.008], c: tone(F.leafColour, stale * 0.15) });
    };
    const spike = (x: number, y: number, z: number, angle: number) => {
      const len = rnd(0.08, 0.2);
      boxes.push({ p: [x + Math.cos(angle) * len / 2, y + Math.sin(angle) * len / 2, z], r: [0, 0, angle], s: [len, 0.006, 0.006], c: tone(pick(['#8aa84a', '#b9b06a', '#6f9a45'])) });
      if (random() < 0.5) balls.push({ p: [x + Math.cos(angle) * len, y + Math.sin(angle) * len, z], s: [0.016, 0.016, 0.016], c: tone(pick(F.mass)), r: [0, 0, 0] });
    };
    const amount = mix(0.7, 1.25, mood.density) * F.fill;
    let bw = 0.4, bh = 0.4, frontZ = 0.14;
    const foam = s.material('#2f5a34', { roughness: 0.95 });
    let accentAt: V3 = [0, 0, 0.1];

    if (a.form === 'ring' || a.form === 'heart') {
      const R = 0.31, r = a.form === 'ring' ? 0.085 : 0.06;
      const curve = (t: number): [number, number] => a.form === 'ring'
        ? [Math.cos(t) * R, Math.sin(t) * R]
        : [0.0215 * 16 * Math.sin(t) ** 3, 0.0215 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5)];
      const pts: V3[] = [];
      for (let i = 0; i < 64; i++) { const [x, y] = curve((i / 64) * Math.PI * 2); pts.push([x, y, 0]); }
      const base = s.tube(pts, r * 0.85, foam, true); tribute.add(base);
      const n = Math.round((a.form === 'ring' ? 300 : 300) * amount);
      for (let i = 0; i < n; i++) {
        const t = rnd(0, Math.PI * 2), phi = rnd(-1.7, 1.7);
        const [x0, y0] = curve(t), [x1, y1] = curve(t + 0.01);
        let tx = x1 - x0, ty = y1 - y0; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const nx = ty, ny = -tx;
        const sp = Math.sin(phi), cp = Math.cos(phi);
        head(x0 + nx * r * sp, y0 + ny * r * sp, r * cp, [nx * sp, ny * sp, cp]);
      }
      const nl = Math.round(70 * F.leaf * mix(0.7, 1.2, mood.density));
      for (let i = 0; i < nl; i++) {
        const t = rnd(0, Math.PI * 2), side = random() < 0.7 ? 1 : -1;
        const [x0, y0] = curve(t), [x1, y1] = curve(t + 0.01);
        const tl = Math.hypot(x1 - x0, y1 - y0) || 1; const nx = (y1 - y0) / tl, ny = -(x1 - x0) / tl;
        const ang = Math.atan2(ny * side, nx * side);
        if (a.flowers === 'wild' && random() < 0.6) spike(x0 + nx * side * r, y0 + ny * side * r, rnd(0, 0.04), ang + rnd(-0.5, 0.5));
        else leaf(x0 + nx * side * (r + 0.03), y0 + ny * side * (r + 0.03), rnd(-0.01, 0.03), ang, a.flowers === 'lilies' ? 0.13 : 0.09);
      }
      const at = curve(a.form === 'ring' ? 3.9 : 2.4);
      accentAt = [at[0], at[1], r + 0.02];
      bw = R + r + 0.05; bh = a.form === 'ring' ? bw : 0.36; frontZ = r + F.size + 0.03;
    } else {
      const cells: { x: number; y: number; dome: number }[] = [];
      const step = 0.05;
      if (a.form === 'cross') {
        for (let x = -0.3; x <= 0.301; x += step) for (let y = -0.5; y <= 0.451; y += step) {
          const inV = Math.abs(x) < 0.101, inH = y > 0.099 && y < 0.301;
          if (inV || inH) cells.push({ x, y, dome: inV ? 1 - (Math.abs(x) / 0.1) ** 2 : 1 - (Math.abs(y - 0.2) / 0.1) ** 2 });
        }
        bw = 0.33; bh = 0.52; accentAt = [0, 0.2, 0.12];
      } else if (a.form === 'spray') {
        for (let y = -0.6; y <= 0.601; y += step) {
          const half = 0.27 * Math.sin((Math.PI * (y + 0.62)) / 1.3) ** 0.8;
          for (let x = -half; x <= half; x += step) cells.push({ x, y, dome: 1 - (Math.abs(x) / Math.max(half, 0.05)) ** 2 });
        }
        bw = 0.34; bh = 0.66; accentAt = [0, -0.1, 0.14];
      } else {
        const word = a.word, pitch = 0.3, cell = 0.05;
        const total = word.length * pitch - 0.05;
        [...word].forEach((letter, li) => {
          const bits = FONT[letter] ?? FONT.O;
          for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) {
            if (bits[row * 5 + col] !== '1') continue;
            cells.push({ x: -total / 2 + li * pitch + (col + 0.5) * cell, y: (3 - row) * cell, dome: 0.4 });
          }
        });
        bw = total / 2 + 0.03; bh = 0.19; accentAt = [-total / 2 + 0.02, 0.17, 0.1];
        const trim = { white: '#c9a23c', black: '#1a1a1c', purple: '#5b2a7a', team: '#c8202a', none: mood.cheer > 0.5 ? '#2f6fb5' : '#5b2a7a' }[a.sash];
        for (const c of cells) boxes.push({ p: [c.x, c.y, -0.012], s: [0.08, 0.08, 0.03], c: trim });
        // The bar the letters are wired to.
        boxes.push({ p: [0, -0.2, -0.03], s: [total + 0.06, 0.03, 0.02], c: '#3a3d40' });
        boxes.push({ p: [0, 0.05, -0.03], s: [total + 0.06, 0.02, 0.02], c: '#3a3d40' });
      }
      for (const c of cells) {
        boxes.push({ p: [c.x, c.y, 0.012], s: [step * 1.02, step * 1.02, 0.045], c: a.form === 'letters' ? tone(F.mass[0]) : '#2f5a34' });
        const z = 0.04 + 0.05 * Math.max(0, c.dome) * (a.form === 'letters' ? 0.4 : 1);
        const per = a.form === 'letters' ? 1.6 : a.form === 'spray' ? 1.1 * (0.4 + c.dome) : 1.5;
        const k = per * amount;
        if (a.form === 'letters') {
          // Letters are always massed solid, whatever the flower, or the word cannot be read.
          for (const [dx, dy] of [[-0.013, -0.013], [0.013, 0.013], [-0.013, 0.013], [0.013, -0.013]]) head(c.x + dx + rnd(-0.005, 0.005), c.y + dy + rnd(-0.005, 0.005), z + rnd(0, 0.01), [0, 0, 1], pick(F.mass), 0.024);
        } else for (let i = 0; i < Math.floor(k) + (random() < k % 1 ? 1 : 0); i++) head(c.x + rnd(-0.022, 0.022), c.y + rnd(-0.022, 0.022), z + rnd(0, 0.012), [rnd(-0.3, 0.3), rnd(-0.3, 0.3), 1]);
        if (a.form !== 'letters' && c.dome < 0.45 && random() < 0.5 * F.leaf + (a.form === 'spray' ? 0.5 : 0)) {
          const ang = a.form === 'spray' ? Math.atan2(c.y * 0.5 + (c.y > 0 ? 0.3 : -0.3), c.x) : Math.atan2(c.y - (Math.abs(c.x) < 0.11 ? c.y : 0.2), c.x);
          if (a.flowers === 'wild' && random() < 0.5) spike(c.x, c.y, 0.03, ang);
          else leaf(c.x + Math.cos(ang) * 0.04, c.y + Math.sin(ang) * 0.04, 0.02, ang, a.form === 'spray' ? 0.16 : 0.09);
        }
      }
      frontZ = 0.1 + F.size + 0.03;
      if (a.form === 'letters') frontZ = 0.07 + F.size;
    }
    // One small pinned-on spray of a different colour: every florist adds it.
    if (a.flowers === 'chrysanths' || a.form === 'letters' || a.form === 'spray') {
      for (let i = 0; i < 11; i++) { const t = rnd(0, 6.28), d = Math.sqrt(random()) * 0.075; head(accentAt[0] + Math.cos(t) * d, accentAt[1] + Math.sin(t) * d, accentAt[2] + 0.03 + rnd(0, 0.02), [0, 0, 1], pick(accentColours), 0.035); }
      for (let i = 0; i < 6; i++) leaf(accentAt[0] + rnd(-0.03, 0.03), accentAt[1] + rnd(-0.03, 0.03), accentAt[2] + 0.01, rnd(0, 6.28), 0.12);
    }

    // ---- sash ----
    const tails: THREE.Object3D[] = [];
    if (a.sash !== 'none') {
      const [paper, ink] = { white: ['#f7f4ea', '#a8842a'], black: ['#19191b', '#d5d8da'], purple: ['#5b2a7a', '#e3c36a'], team: ['#c8202a', '#ffffff'] }[a.sash];
      const text = MESSAGES[a.message];
      const band = (length: number, width: number, withText: boolean) => {
        const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = Math.max(32, Math.round(1024 * width / length));
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = paper; ctx.fillRect(0, 0, 1024, canvas.height);
        if (a.sash === 'team') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1024, canvas.height * 0.2); ctx.fillRect(0, canvas.height * 0.8, 1024, canvas.height * 0.2); }
        else { ctx.fillStyle = ink; ctx.fillRect(0, canvas.height * 0.07, 1024, 3); ctx.fillRect(0, canvas.height * 0.93 - 3, 1024, 3); }
        if (withText && text) {
          ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = `bold ${Math.min(canvas.height * 0.56, (1024 / text.length) * 1.5)}px serif`;
          ctx.fillText(text, 512, canvas.height * 0.52, 940);
        }
        const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
        return new THREE.Mesh(new THREE.PlaneGeometry(length, width), new THREE.MeshStandardMaterial({ map, roughness: 0.35, side: THREE.DoubleSide }));
      };
      const letters = a.form === 'letters';
      const length = letters ? Math.min(bw * 2, 1.3) : bw * 2.5, width = letters ? 0.12 : 0.115;
      const sash = band(length, width, true);
      const slope = letters ? 0 : a.form === 'cross' || a.form === 'spray' ? 0.5 : 0.42;
      sash.position.set(0, letters ? -bh - 0.1 : a.form === 'cross' ? 0.02 : 0, letters ? 0.02 : frontZ);
      sash.rotation.z = slope;
      sash.castShadow = true;
      tribute.add(sash);
      const ex = -Math.cos(slope) * length / 2, ey = sash.position.y - Math.sin(slope) * length / 2;
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group(); pivot.position.set(letters ? side * length / 2 : ex, letters ? sash.position.y : ey, sash.position.z - 0.004);
        const tl = rnd(0.2, 0.34);
        const tail = band(tl, width * 0.8, false);
        tail.rotation.z = Math.PI / 2; tail.position.y = -tl / 2; tail.castShadow = true;
        pivot.add(tail); pivot.rotation.z = (letters ? side * 0.12 : side * 0.22 + 0.1) + rnd(-0.06, 0.06);
        tribute.add(pivot); tails.push(pivot);
      }
      if (!letters) balls.push({ p: [ex, ey, frontZ + 0.01], s: [0.06, 0.05, 0.03], c: paper, r: [0, 0, slope] });
    }
    if (a.card) {
      const cx = bw * 0.55, cy = -bh * 0.55;
      boxes.push({ p: [cx, cy, frontZ * 0.5], r: [0, 0, 0.4], s: [0.005, 0.2, 0.005], c: '#3f7a4a' });
      boxes.push({ p: [cx - 0.04, cy + 0.1, frontZ * 0.5 + 0.02], r: [0.1, 0.2, 0.25], s: [0.11, 0.075, 0.004], c: '#fbfaf4' });
    }

    instances(tribute, new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { flatShading: true, roughness: 0.85 }), balls);
    instances(tribute, new THREE.ConeGeometry(1, 1, 6, 1, true).rotateX(Math.PI).translate(0, 0.5, 0), s.material('#ffffff', { flatShading: true, roughness: 0.7, side: THREE.DoubleSide }), cones);
    instances(tribute, new THREE.CylinderGeometry(1, 1, 1, 9), s.material('#ffffff', { roughness: 0.8 }), discs);
    instances(tribute, new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { flatShading: true, roughness: 0.6 }), leaves);
    instances(tribute, new THREE.BoxGeometry(1, 1, 1), s.material('#ffffff', { roughness: 0.8 }), boxes);

    // ---- stand ----
    const wire = s.material(pick(['#2c3a30', '#2a2c2e', '#5a5d5f']), { metalness: 0.4, roughness: 0.45 });
    const wideForm = a.form === 'letters';
    const tilt = a.stand === 'ground' ? 0.55 : 0.2;
    const C = a.stand === 'tripod' ? (wideForm ? 0.95 : 0.62 + bh + 0.1) : a.stand === 'low' ? bh + 0.28 : bh * Math.cos(tilt) + 0.03;
    tribute.position.set(0, C, 0);
    tribute.rotation.x = -tilt;
    tribute.rotation.z = stale > 0.6 ? rnd(-0.07, 0.07) : rnd(-0.015, 0.015);
    s.root.add(tribute);
    const planeZ = (y: number) => -Math.tan(tilt) * (y - C) - 0.05;
    const tripod = (x: number, spread: number, top: number, r: number) => {
      for (const side of [-1, 1]) s.rod([x + side * spread, 0, planeZ(0)], [x + side * 0.025, top, planeZ(top)], r, wire);
      s.rod([x, 0, planeZ(top) - top * 0.3 - 0.12], [x, top, planeZ(top)], r, wire);
      const y = top * 0.38, k = y / top;
      s.rod([x - spread * (1 - k), y, planeZ(y)], [x + spread * (1 - k), y, planeZ(y)], r * 0.8, wire);
      const hook = s.ring(0.03, r * 0.8, [x, top + 0.02, planeZ(top)], wire, Math.PI * 1.4); hook.rotation.y = Math.PI / 2;
    };
    if (a.stand === 'ground') {
      for (const x of wideForm ? [-bw * 0.7, bw * 0.7] : [0]) {
        const y = C + bh * 0.5 * Math.cos(tilt);
        s.rod([x, y, planeZ(y) + 0.02], [x, 0, planeZ(y) - y * 0.55 - 0.1], 0.006, wire);
        s.rod([x - 0.12, 0.005, planeZ(y) - y * 0.55 - 0.1], [x + 0.12, 0.005, planeZ(y) - y * 0.55 - 0.1], 0.006, wire);
      }
    } else {
      const top = C + bh * 0.75;
      if (wideForm) for (const x of [-bw * 0.72, bw * 0.72]) tripod(x, 0.2, top, 0.006);
      else tripod(0, Math.min(0.34, top * 0.3), top + 0.1, 0.0065);
    }

    // ---- what has fallen ----
    const fallen = Math.round(stale * stale * 46 + mood.wear * 8);
    for (let i = 0; i < fallen; i++) {
      const t = rnd(0, 6.28), d = Math.sqrt(random()) * (bw + 0.25);
      floor.push({ p: [Math.cos(t) * d, 0.004, 0.12 + Math.sin(t) * d * 0.7], s: [rnd(0.012, 0.024), 0.004, rnd(0.01, 0.018)], c: tone(random() < 0.25 ? F.leafColour : pick(F.mass), 0.2), r: [0, rnd(0, 3), 0] });
    }
    instances(s.root, new THREE.CylinderGeometry(1, 1, 1, 7), s.material('#ffffff', { roughness: 0.9 }), floor);

    return s.finish({
      update: (_dt, time) => { tails.forEach((tail, i) => { tail.rotation.x = Math.sin(time * 1.6 + i * 1.9) * 0.12 * mood.energy; }); },
    });
  },
});
