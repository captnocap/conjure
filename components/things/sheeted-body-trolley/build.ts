import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

/** A sheet settled over a lying figure: head at -x, feet at +x, resting on y = 0. */
function shroud(length: number, width: number, bulk: number, random: () => number, cling = 7, feet = true) {
  const nu = 60, nv = 22, k = length / 1.78;
  // The body under the sheet as ellipsoid domes: [along, across, radius along, radius across, height].
  const turn = (random() - 0.5) * 0.06;
  const body: number[][] = [
    [0.13, turn, 0.115, 0.095, 0.21], [0.47, 0, 0.27, 0.2 * bulk, 0.2 * Math.sqrt(bulk)], [0.78, 0, 0.24, 0.18 * bulk, 0.17 * bulk + 0.03 * random()],
    [1.2, 0.09, 0.46, 0.08, 0.13], [1.2, -0.09, 0.46, 0.08, 0.13], ...(feet ? [[1.67, 0.09 + turn, 0.055, 0.055, 0.25], [1.67, -0.09, 0.055, 0.055, 0.24]] : []),
    [0.62, 0.23 * bulk, 0.3, 0.05, 0.1], [0.62, -0.23 * bulk, 0.3, 0.05, 0.1],
  ];
  const at = (i: number, j: number) => i * (nv + 1) + j;
  const solid = new Float32Array((nu + 1) * (nv + 1));
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const x = (i / nu) * 1.78, z = ((j / nv) * 2 - 1) * (width / 2) / k;
      let h = 0;
      for (const [cx, cz, rx, rz, top] of body) h = Math.max(h, top * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2 - ((z - cz) / rz) ** 2)));
      solid[at(i, j)] = h;
    }
  // Cloth: relax a tent over the solid so the sheet spans the hollows instead of clinging.
  let cloth = Float32Array.from(solid);
  for (let pass = 0; pass < cling; pass++) {
    const next = new Float32Array(cloth.length);
    for (let i = 0; i <= nu; i++)
      for (let j = 0; j <= nv; j++) {
        const rim = i === 0 || j === 0 || i === nu || j === nv;
        const mean = rim ? 0 : (cloth[at(i - 1, j)] + cloth[at(i + 1, j)] + cloth[at(i, j - 1)] + cloth[at(i, j + 1)]) / 4;
        next[at(i, j)] = rim ? 0 : Math.max(solid[at(i, j)], mean);
      }
    cloth = next;
  }
  const positions: number[] = [], index: number[] = [];
  const phase = random() * 6;
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const t = i / nu, v = (j / nv) * 2 - 1;
      const rim = i === 0 || j === 0 || i === nu || j === nv;
      positions.push((t - 0.5) * length, cloth[at(i, j)] * k + (rim ? 0 : 0.012 + 0.004 * Math.sin(t * 23 + v * 7 + phase)), (v * width) / 2);
    }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = at(i, j), b = a + nv + 1;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

function tagMaterial(lines: string[]) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 224;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#e8d9ae';
  g.fillRect(0, 0, 128, 224);
  g.fillStyle = '#5b4a2a';
  g.beginPath();
  g.arc(64, 26, 11, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#23282c';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lines.forEach((line, index) => {
    g.font = `bold ${index ? 26 : 32}px monospace`;
    g.fillText(line, 64, 86 + index * 46, 116);
  });
  g.fillRect(14, 196, 100, 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide });
}

export default defineThing({
  questions: {
    figure: choice('Who is under the sheet, by their size?', {
      adult: 'An average adult, filling most of the trolley.',
      large: 'A big heavy figure, the sheet stretched over a broad chest and belly.',
      slight: 'A thin, slight figure, old or wasted, barely raising the sheet.',
      tall: 'Very tall: the feet reach right to the end.',
      child: 'A child, taking up only half the length. The rest of the trolley is empty.',
    }),
    drape: choice('How does the covering fall?', {
      tucked: 'Pulled tight and tucked under, every contour outlined crisply.',
      loose: 'Laid loosely, hanging a hand-width over the sides in soft folds.',
      long: 'A large sheet hanging in long folds almost down to the wheels.',
      short: 'Too short or pulled back: two bare feet stick out at the end.',
    }),
    cover: choice('What is the covering?', {
      white: 'A plain white cotton sheet.',
      green: 'A pale green hospital theatre drape.',
      blanket: 'A grey wool blanket, an ambulance or a wartime aid post.',
      bag: 'A black zipped body bag, a crime scene or a disaster.',
      red: 'A dark red velvet pall, ceremonial and old.',
    }),
    placed: choice('What has been placed on or beside the figure?', {
      nothing: 'Nothing.',
      hand: 'Nothing, but one pale hand has slipped out and hangs over the side.',
      flower: 'A single flower laid on the chest.',
      bouquet: 'A wrapped bouquet of flowers resting on the chest.',
      effects: 'A brown paper bag of belongings set on the legs.',
      toy: 'A small soft toy tucked beside the head.',
    }),
    tag: choice('What does the toe tag say?', {
      name: 'A typed surname and a date.',
      unknown: 'UNKNOWN, with a number.',
      number: 'A case number only.',
      blank: 'Nothing yet, a blank tag.',
    }),
    trolley: choice('What kind of trolley is it?', {
      modern: 'A stainless tray on a folding X frame with four small castors and a push bar.',
      vintage: 'A tubular steel cart with two big spoked wheels, mid-century hospital.',
      wooden: 'A wooden hand cart with plank bed and iron-rimmed wheels, a Victorian dead-house.',
      bier: 'A dark wooden bier on turned legs with brass carrying handles, a chapel of rest.',
    }),
    waiting: choice('What is happening to it right now?', {
      parked: 'Parked square and brakes on, filed for later.',
      moving: 'Caught mid-journey, turned at an angle with a wheel askew.',
      viewing: 'Set out for someone to come and look: a chair drawn up beside it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const L = 2.0, W = 0.64;
    const T = { modern: 0.66, vintage: 0.72, wooden: 0.62, bier: 0.74 }[a.trolley];
    const steel = s.material('#c3cbcc', { metalness: 0.5, roughness: 0.32 });
    const bright = s.material('#e4e8e8', { metalness: 0.7, roughness: 0.2 });
    const dark = s.material('#1e2324', { roughness: 0.8 });
    const wood = s.material(a.trolley === 'bier' ? '#3d2a1e' : '#7b5c3c', { roughness: 0.7 });
    const brass = s.material('#b8923f', { metalness: 0.7, roughness: 0.3 });

    // The carriage.
    if (a.trolley === 'modern') {
      s.box([L, 0.03, W], [0, T - 0.015, 0], steel);
      for (const z of [-1, 1]) s.box([L, 0.05, 0.02], [0, T, z * W / 2], steel);
      for (const z of [-1, 1]) {
        s.rod([-0.8, 0.14, z * 0.26], [0.8, T - 0.05, z * 0.26], 0.018, bright);
        s.rod([0.8, 0.14, z * 0.26], [-0.8, T - 0.05, z * 0.26], 0.018, bright);
        s.rod([-0.85, 0.14, z * 0.26], [0.85, 0.14, z * 0.26], 0.016, bright);
      }
      for (const x of [-0.85, 0.85]) s.rod([x, 0.14, -0.26], [x, 0.14, 0.26], 0.016, bright);
      s.tube([[-L / 2, T, -0.25], [-L / 2 - 0.14, T + 0.16, -0.25], [-L / 2 - 0.14, T + 0.16, 0.25], [-L / 2, T, 0.25]], 0.016, bright);
      for (const x of [-0.85, 0.85]) for (const z of [-0.26, 0.26]) {
        const wheel = s.cylinder(0.065, 0.065, 0.04, [x, 0.065, z], dark, 16);
        wheel.rotation.x = Math.PI / 2;
        if (a.waiting === 'moving') wheel.rotation.z = (random() - 0.5) * 1.6;
        s.box([0.03, 0.08, 0.05], [x, 0.11, z], bright);
      }
    } else if (a.trolley === 'vintage') {
      const paint = s.material(mood.cheer > 0.6 ? '#e9e6d6' : '#9fb0a6', { roughness: 0.5 });
      s.box([L, 0.03, W], [0, T - 0.015, 0], steel);
      for (const z of [-1, 1]) s.rod([-L / 2, T + 0.02, z * W / 2], [L / 2, T + 0.02, z * W / 2], 0.014, paint);
      for (const x of [-0.35, 0.35]) for (const z of [-0.27, 0.27]) s.rod([x, 0.36, z], [x, T - 0.03, z], 0.018, paint);
      for (const z of [-0.27, 0.27]) s.rod([0.8, 0.1, z], [0.8, T - 0.03, z], 0.016, paint);
      s.rod([-0.35, 0.36, -0.3], [-0.35, 0.36, 0.3], 0.016, dark);
      for (const z of [-0.33, 0.33]) {
        s.ring(0.34, 0.022, [-0.35, 0.36, z], dark);
        for (let i = 0; i < 8; i++) s.rod([-0.35, 0.36, z], [-0.35 + Math.cos(i * 0.785) * 0.33, 0.36 + Math.sin(i * 0.785) * 0.33, z], 0.006, bright);
        const castor = s.cylinder(0.08, 0.08, 0.04, [0.8, 0.08, z * 0.8], dark, 14);
        castor.rotation.x = Math.PI / 2;
      }
      s.tube([[-L / 2, T, -0.25], [-L / 2 - 0.2, T + 0.2, -0.25], [-L / 2 - 0.2, T + 0.2, 0.25], [-L / 2, T, 0.25]], 0.016, paint);
    } else if (a.trolley === 'wooden') {
      for (let i = 0; i < 4; i++) s.box([L, 0.035, W / 4 - 0.008], [0, T - 0.018, (i - 1.5) * W / 4], wood);
      for (const x of [-0.7, 0, 0.7]) s.box([0.07, 0.05, W], [x, T - 0.06, 0], wood);
      const iron = s.material('#2b2a28', { roughness: 0.7, metalness: 0.3 });
      s.rod([-0.15, 0.4, -0.38], [-0.15, 0.4, 0.38], 0.022, iron);
      for (const z of [-0.37, 0.37]) {
        s.ring(0.39, 0.024, [-0.15, 0.4, z], iron);
        s.cylinder(0.06, 0.06, 0.07, [-0.15, 0.4, z], wood, 10).rotation.x = Math.PI / 2;
        for (let i = 0; i < 10; i++) s.rod([-0.15, 0.4, z], [-0.15 + Math.cos(i * 0.628) * 0.38, 0.4 + Math.sin(i * 0.628) * 0.38, z], 0.013, wood);
        s.box([0.05, T - 0.44, 0.04], [-0.15, (T + 0.36) / 2, z * 0.72], wood);
        s.box([0.05, T - 0.06, 0.05], [0.85, (T - 0.06) / 2, z * 0.7], wood);
        s.rod([L / 2, T - 0.03, z * 0.7], [L / 2 + 0.45, T + 0.02, z * 0.7], 0.022, wood);
      }
    } else {
      s.box([L, 0.06, W], [0, T - 0.03, 0], wood);
      s.box([L + 0.06, 0.03, W + 0.06], [0, T - 0.075, 0], wood);
      for (const x of [-0.85, 0.85]) for (const z of [-0.24, 0.24]) s.lathe([[0.001, 0], [0.05, 0], [0.05, 0.04], [0.025, 0.1], [0.04, 0.3], [0.022, 0.42], [0.045, 0.52], [0.035, T - 0.09], [0.001, T - 0.09]], wood, [x, 0, z]);
      for (const z of [-0.24, 0.24]) s.rod([-0.85, 0.2, z], [0.85, 0.2, z], 0.018, wood);
      for (const x of [-0.55, 0.55]) for (const z of [-1, 1]) {
        s.ring(0.06, 0.01, [x, T - 0.1, z * (W / 2 + 0.035)], brass, Math.PI).rotation.z = Math.PI;
      }
    }

    // The figure and its covering.
    const child = a.figure === 'child';
    const length = { adult: 1.74, large: 1.8, slight: 1.62, tall: 1.94, child: 1.02 }[a.figure] * mix(0.97, 1.03, random());
    const bulk = { adult: 1, large: 1.3, slight: 0.72, tall: 0.98, child: 0.72 }[a.figure];
    const short = a.drape === 'short';
    const sheetLength = short ? length * 0.9 : length;
    const x0 = child ? -L / 2 + 0.12 + length / 2 : (L - 1.94) / 2 - (L - length) / 2 + (1.94 - length) * 0.35;
    const headX = x0 - length / 2;
    const colour = { white: '#f3f3ee', green: '#b9d6c6', blanket: '#8b8f8c', bag: '#23272b', red: '#6e1f2a' }[a.cover];
    const cloth = new THREE.MeshStandardMaterial({ color: new THREE.Color(colour).lerp(new THREE.Color('#b9ad94'), mood.wear * 0.25), roughness: a.cover === 'bag' ? 0.45 : 0.95, side: THREE.DoubleSide });
    const sheetWidth = Math.min(W - 0.03, child ? 0.5 : W - 0.03);
    const geometry = shroud(sheetLength, sheetWidth, bulk, random, a.drape === 'tucked' || a.cover === 'bag' ? 3 : a.drape === 'long' ? 10 : 7, !short);
    const sheet = s.mesh(geometry, cloth, [headX + sheetLength / 2, T + 0.004, 0]);
    const position = geometry.getAttribute('position');
    const crest = (t: number) => {
      const row = Math.round(t * 60) * 23 + 11;
      return [headX + sheetLength / 2 + position.getX(row), T + 0.004 + position.getY(row)] as const;
    };

    // Folds hanging over the sides.
    const drop = { tucked: 0, loose: 0.16, long: T - 0.16, short: 0.12 }[a.cover === 'bag' ? 'tucked' : a.drape];
    if (drop > 0)
      for (const side of [-1, 1]) {
        const n = 40, rows = 5, pts: number[] = [], idx: number[] = [], phase = random() * 6, wave = 3 + random() * 3;
        for (let i = 0; i <= n; i++)
          for (let r = 0; r <= rows; r++) {
            const t = i / n, d = r / rows;
            const hang = drop * (0.8 + 0.2 * Math.sin(t * 9 + phase)) * Math.min(1, t * 8, (1 - t) * 8 + 0.3);
            pts.push(headX + t * sheetLength, T + 0.012 - d * hang, side * (sheetWidth / 2 + (r ? 0.035 : 0) + d * 0.05 * Math.sin(t * wave * 6 + phase + side)));
          }
        for (let i = 0; i < n; i++)
          for (let r = 0; r < rows; r++) {
            const p = i * (rows + 1) + r, q = p + rows + 1;
            idx.push(p, q, p + 1, p + 1, q, q + 1);
          }
        const skirt = new THREE.BufferGeometry();
        skirt.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        skirt.setIndex(idx);
        skirt.computeVertexNormals();
        s.mesh(skirt, cloth);
      }
    if (a.cover === 'bag') {
      const line: [number, number, number][] = [];
      for (let i = 2; i <= 28; i++) {
        const [x, y] = crest(i / 30);
        line.push([x, y + 0.006, 0]);
      }
      s.tube(line, 0.007, bright);
      s.box([0.03, 0.012, 0.014], [line[0][0], line[0][1] + 0.01, 0], bright);
      for (const side of [-1, 1]) for (const t of [0.25, 0.75]) s.ring(0.035, 0.008, [headX + t * sheetLength, T + 0.02, side * (sheetWidth / 2 + 0.004)], dark, Math.PI).rotation.set(0, 0, Math.PI);
    }

    // Feet and the toe tag.
    const footX = headX + length * 0.94;
    const skin = s.material(new THREE.Color('#c9b3a0').lerp(new THREE.Color('#8f6f58'), random() * 0.7).lerp(new THREE.Color('#aeb3b0'), 0.25), { roughness: 0.7 });
    if (short)
      for (const z of [-0.09, 0.09]) {
        const foot = s.ball([0.05, 0.115, 0.045], [footX, T + 0.12, z], skin, 14);
        foot.rotation.x = z * 2;
        s.ball([0.045, 0.05, 0.05], [footX - 0.05, T + 0.05, z], skin, 10);
        for (let i = 0; i < 4; i++) s.ball([0.016, 0.02, 0.014], [footX + 0.012, T + 0.225 - i * 0.008, z + (i - 1.5) * 0.024], skin, 6);
      }
    const texts = { name: ['HALE', '14 NOV'], unknown: ['UNKNOWN', `No ${10 + Math.floor(random() * 80)}`], number: [`${1000 + Math.floor(random() * 8999)}`, 'CORONER'], blank: [] as string[] }[a.tag];
    const tagZ = short ? 0.09 : 0.1;
    const tagTop: [number, number, number] = short ? [footX + 0.02, T + 0.2, tagZ + 0.03] : [headX + sheetLength - 0.02, T + 0.02, tagZ];
    const tag = s.mesh(new THREE.PlaneGeometry(0.095, 0.16), tagMaterial(texts), [tagTop[0] + (short ? 0.04 : 0.05), tagTop[1] - 0.12, tagTop[2] + 0.02]);
    tag.rotation.set(0, Math.PI / 2 - 0.5 + random() * 0.4, (random() - 0.5) * 0.3);
    s.rod(tagTop, [tag.position.x, tag.position.y + 0.07, tag.position.z], 0.003, dark);

    // What was left with them.
    const [chestX, chestY] = crest(0.27);
    if (a.placed === 'hand') {
      const side = random() < 0.5 ? -1 : 1, x = headX + length * 0.42, z = side * (W / 2 + 0.03);
      s.rod([x, T + 0.03, z - side * 0.06], [x + 0.03, T - 0.2, z + side * 0.02], 0.032, skin, 0.026);
      s.ball([0.03, 0.055, 0.02], [x + 0.035, T - 0.25, z + side * 0.025], skin, 10);
      for (let i = 0; i < 4; i++) s.rod([x + 0.02 + i * 0.012, T - 0.29, z + side * 0.025], [x + 0.022 + i * 0.013, T - 0.345 + Math.abs(i - 1.5) * 0.008, z + side * 0.03], 0.0065, skin);
    }
    if (a.placed === 'flower' || a.placed === 'bouquet') {
      const petals = ['#f3efe6', '#e8c33d', '#c9304a', '#e6a1b8', '#f3efe6'];
      const n = a.placed === 'flower' ? 1 : 6 + Math.floor(random() * 4);
      const tint = petals[Math.floor(random() * petals.length)];
      if (n > 1) {
        const wrap = s.cylinder(0.02, 0.09, 0.3, [chestX + 0.17, chestY + 0.035, 0], s.material('#c9b58c', { roughness: 0.95 }), 10);
        wrap.rotation.z = Math.PI / 2 + 0.08;
      }
      for (let i = 0; i < n; i++) {
        const spread = n > 1 ? 0.07 : 0, bx = chestX - 0.02 + (random() - 0.5) * spread, bz = (random() - 0.5) * spread * 2.2;
        const by = chestY + 0.04 + (n > 1 ? random() * 0.05 : 0);
        s.rod([chestX + 0.3, chestY + 0.012, bz * 0.2], [bx, by, bz], 0.006, s.material('#3f6b3a'));
        s.ball([0.045, 0.03, 0.045], [bx, by, bz], s.material(n > 1 && i % 3 === 0 ? petals[(i + 1) % 5] : tint), 10);
        s.ball([0.018, 0.02, 0.018], [bx, by + 0.02, bz], s.material('#b8862b'), 8);
      }
    }
    if (a.placed === 'effects') {
      const [lx, ly] = crest(child ? 0.6 : 0.72);
      const bag = s.box([0.2, 0.24, 0.12], [lx, ly + 0.1, 0], s.material('#b89a6a', { roughness: 0.95 }));
      bag.rotation.y = (random() - 0.5) * 0.5;
      s.box([0.21, 0.05, 0.03], [lx, ly + 0.235, 0], s.material('#a58858', { roughness: 0.95 })).rotation.y = bag.rotation.y;
      s.box([0.1, 0.06, 0.002], [lx, ly + 0.12, 0.062], s.material('#f1eedf')).rotation.y = bag.rotation.y;
    }
    if (a.placed === 'toy') {
      const fur = s.material(mood.cheer > 0.5 ? '#c99657' : '#9c7b5a', { roughness: 1 });
      const tx = headX + 0.1, tz = 0.21, ty = T + 0.01;
      s.ball([0.06, 0.07, 0.055], [tx, ty + 0.07, tz], fur, 12);
      s.ball([0.048, 0.045, 0.045], [tx, ty + 0.17, tz], fur, 12);
      for (const side of [-1, 1]) {
        s.ball([0.02, 0.02, 0.012], [tx + side * 0.035, ty + 0.21, tz], fur, 8);
        s.ball([0.022, 0.04, 0.022], [tx + side * 0.065, ty + 0.08, tz + 0.01], fur, 8).rotation.z = side * 0.6;
        s.ball([0.026, 0.026, 0.04], [tx + side * 0.035, ty + 0.025, tz + 0.04], fur, 8);
      }
      for (const side of [-1, 1]) s.ball([0.007, 0.007, 0.005], [tx + side * 0.017, ty + 0.18, tz + 0.042], dark, 6);
    }
    if (a.waiting === 'viewing') {
      const cx = headX + (a.trolley === 'wooden' || a.trolley === 'vintage' ? 0.05 : 0.45), cz = W / 2 + (a.trolley === 'wooden' || a.trolley === 'vintage' ? 0.72 : 0.5);
      const seat = s.material('#5d6f6a', { roughness: 0.8 });
      s.box([0.42, 0.04, 0.4], [cx, 0.45, cz], seat);
      s.box([0.42, 0.4, 0.03], [cx, 0.72, cz + 0.2], seat).rotation.x = 0.1;
      for (const x of [-0.18, 0.18]) for (const z of [-0.17, 0.17]) s.rod([cx + x, 0, cz + z], [cx + x, z > 0 ? 0.9 : 0.44, cz + z + (z > 0 ? 0.04 : 0)], 0.013, bright);
    }
    if (a.waiting === 'moving') s.root.rotation.y = (random() - 0.5) * 0.7;
    sheet.castShadow = true;
    return s.finish();
  },
});
