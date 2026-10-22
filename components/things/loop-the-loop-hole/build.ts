import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
const NUMBERS = { one: '1', seven: '7', nine: '9', thirteen: '13', eighteen: '18', nineteen: '19' } as const;
const BALLS = ['#e23b2e', '#f4c20d', '#2f7fd6', '#ef7f1a', '#d94f9b', '#f6f2e6'];

export default defineThing({
  questions: {
    obstacle: choice('What is the obstacle on this hole?', {
      loop: 'A steel loop-the-loop the ball must be hit hard enough to ride right round.',
      bridge: 'A humpback bridge over a strip of painted blue water.',
      volcano: 'A volcano mound with the cup in its crater, lava painted down the sides.',
      bumpers: 'A cluster of pinball bumpers and slanted kickers.',
      dogleg: 'Nothing at all: a plain, cruel right-angle dogleg with one brick in the corner.',
    }),
    lie: choice('Where does the ball lie?', {
      tee: 'On the tee mat, about to be struck.',
      stuck: 'Stuck at the obstacle, short of where it needed to be.',
      lip: 'On the very lip of the cup, refusing to drop.',
      bed: 'Lost in the border beside the hole.',
      gone: 'Nowhere to be seen: it went in, or over the fence.',
    }),
    flag: choice('What number is on the flag?', {
      one: 'Hole 1, the gentle opener.',
      seven: 'Hole 7, lucky for some.',
      nine: 'Hole 9, halfway round.',
      thirteen: 'Hole 13, the one everybody blames.',
      eighteen: 'Hole 18, the last, scores being totted up.',
      nineteen: 'Hole 19, the bonus hole: sink it and win a free game.',
    }),
    kerbs: choice('How are the concrete kerbs painted?', {
      white: 'Plain white.',
      candy: 'Alternating red and white like seaside rock.',
      seaside: 'Alternating blue and yellow.',
      bare: 'Not at all: bare grey concrete.',
    }),
    felt: choice('What is the playing surface?', {
      green: 'Classic green felt.',
      blue: 'Swimming-pool blue carpet.',
      red: 'Terracotta red all-weather carpet.',
      patchwork: 'A patchwork of mismatched green offcuts.',
    }),
    border: choice('What runs alongside the hole?', {
      flowers: 'A bed of council bedding plants in rows.',
      shells: 'Pale gravel scattered with shells and pebbles.',
      weeds: 'Bare soil going over to weeds and dandelions.',
      rockery: 'A rockery of stones and stubby plants.',
    }),
    par: choice('What does the sign at the tee say?', {
      two: 'PAR 2',
      three: 'PAR 3',
      six: 'PAR 6',
      none: 'There is no sign.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const c = 0.3, top = 0.04;
    const dogleg = a.obstacle === 'dogleg';
    const cells = new Set<string>();
    const key = (i: number, j: number) => `${i},${j}`;
    const columns = dogleg ? 10 : 12;
    for (let i = 0; i < columns; i++) for (let j = 0; j < 4; j++) cells.add(key(i, j));
    if (dogleg) for (let i = 6; i < 10; i++) for (let j = -6; j < 0; j++) cells.add(key(i, j));

    const grey = new THREE.Color('#9a9a8e');
    const feltBase = { green: '#2f9150', blue: '#2f86b8', red: '#b5583a', patchwork: '#2f9150' }[a.felt];
    const offcuts = ['#2f9150', '#4c9a3c', '#1f7a56', '#6aa35a', '#3a8a70'];
    const kerbPair = { white: ['#f1ede0', '#f1ede0'], candy: ['#d8261f', '#f1ede0'], seaside: ['#2c6fd0', '#f2c230'], bare: ['#b9b6aa', '#b0ada1'] }[a.kerbs];
    const concrete = new THREE.Color('#b4b1a5');
    const felt: { m: THREE.Matrix4; c: THREE.Color }[] = [], kerb: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const place = (size: P3, at: P3) => new THREE.Matrix4().makeScale(...size).setPosition(...at);
    const patchOf = new Map<string, string>();
    for (const cell of cells) {
      const [i, j] = cell.split(',').map(Number);
      const x = (i + 0.5) * c, z = (j + 0.5) * c;
      const block = key(Math.floor(i / 3), Math.floor((j + 6) / 2));
      if (!patchOf.has(block)) patchOf.set(block, offcuts[Math.floor(random() * offcuts.length)]);
      const tint = new THREE.Color(a.felt === 'patchwork' ? patchOf.get(block)! : feltBase);
      const trodden = Math.max(0, 1 - Math.hypot(x - 0.4, z - 0.6) / 0.7);
      tint.lerp(grey, mood.wear * (0.25 + trodden * 0.5 + random() * 0.15));
      felt.push({ m: place([c, top, c], [x, top / 2, z]), c: tint });
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        if (cells.has(key(i + di, j + dj))) continue;
        const paint = new THREE.Color(kerbPair[(i + j + 100) % 2]);
        if (random() < mood.wear * 0.45) paint.lerp(concrete, 0.5 + random() * 0.5);
        const lift = random() < mood.wear * 0.2 ? 0.02 : 0;
        kerb.push({ m: place(di ? [0.1, 0.15, c - 0.008] : [c - 0.008, 0.15, 0.1], [x + di * (c / 2 + 0.05), 0.075 + lift, z + dj * (c / 2 + 0.045)]), c: paint });
      }
      for (const [di, dj] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const)
        if (!cells.has(key(i + di, j)) && !cells.has(key(i, j + dj))) kerb.push({ m: place([0.1, 0.15, 0.1], [x + di * (c / 2 + 0.05), 0.075, z + dj * (c / 2 + 0.05)]), c: new THREE.Color(kerbPair[1]).lerp(concrete, mood.wear * 0.5) });
    }
    const instanced = (list: { m: THREE.Matrix4; c: THREE.Color }[], material: THREE.Material) => {
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, list.length);
      list.forEach((item, index) => { mesh.setMatrixAt(index, item.m); mesh.setColorAt(index, item.c); });
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      s.root.add(mesh);
    };
    instanced(felt, new THREE.MeshStandardMaterial({ roughness: 1 }));
    instanced(kerb, new THREE.MeshStandardMaterial({ roughness: 0.75 }));

    const steel = s.material('#aab0b1', { metalness: 0.65, roughness: 0.35 });
    const dark = s.material('#1b1e21', { roughness: 0.85 });
    const white = s.material('#f4f0e3', { roughness: 0.5 });
    const rust = new THREE.Color('#8a4a25');
    const bright = (hex: string, extra: THREE.MeshStandardMaterialParameters = {}) => s.material(new THREE.Color(hex).lerp(rust, mood.wear * 0.3), { roughness: 0.45, ...extra });
    const cz = 0.6;
    let cup: P3 = dogleg ? [2.4, top, -1.35] : [3.2, top, cz + (random() - 0.5) * 0.4];
    let stuck: P3 = [1.8, top, cz];

    // Tee mat.
    s.box([0.42, 0.016, 0.7], [0.38, top + 0.008, cz], dark);
    for (const dz of [-0.2, 0, 0.2]) s.cylinder(0.022, 0.022, 0.004, [0.38, top + 0.018, cz + dz], white, 10);

    if (a.obstacle === 'loop') {
      const R = 0.56, cx = 1.85, cy = top + R + 0.01;
      const paint = bright(mood.cheer > 0.5 ? '#f2c230' : '#c7ccce', { metalness: 0.4, side: THREE.DoubleSide });
      const steps = 30;
      const rails: P3[][] = [[], []];
      for (let i = 0; i < steps; i++) {
        const t = (i + 0.5) / steps * Math.PI * 2;
        const z = cz + mix(-0.17, 0.17, (i + 0.5) / steps);
        const plate = s.box([R * 2 * Math.PI / steps * 1.12, 0.016, 0.3], [cx + Math.sin(t) * R, cy - Math.cos(t) * R, z], paint);
        plate.rotation.z = t;
      }
      for (let i = 0; i <= steps; i++) {
        const t = i / steps * Math.PI * 2, z = cz + mix(-0.17, 0.17, i / steps);
        const r = R - 0.02;
        rails[0].push([cx + Math.sin(t) * r, cy - Math.cos(t) * r, z - 0.155]);
        rails[1].push([cx + Math.sin(t) * r, cy - Math.cos(t) * r, z + 0.155]);
      }
      for (const rail of rails) s.tube(rail, 0.022, bright('#d8261f'));
      for (const side of [-1, 1]) {
        s.rod([cx - 0.5, top, cz + side * 0.42], [cx, cy + R + 0.04, cz + side * 0.15], 0.018, steel);
        s.rod([cx + 0.5, top, cz + side * 0.42], [cx, cy + R + 0.04, cz + side * 0.15], 0.018, steel);
        const funnel = s.box([0.75, 0.09, 0.03], [cx - 0.7, top + 0.045, cz - 0.17 + side * 0.3], white);
        funnel.rotation.y = side * 0.42;
      }
      s.rod([cx, cy + R + 0.04, cz - 0.17], [cx, cy + R + 0.04, cz + 0.17], 0.018, steel);
      stuck = [cx - 0.12 + random() * 0.2, top + 0.02, cz + (random() - 0.5) * 0.1];
    } else if (a.obstacle === 'bridge') {
      const x0 = 1.1, span = 1.4, rise = 0.4, n = 12;
      s.box([0.8, 0.012, 1.19], [1.8, top + 0.006, cz], s.material('#1f5fa8', { roughness: 0.25 }));
      for (let i = 0; i < 4; i++) s.box([0.2 + random() * 0.2, 0.004, 0.02], [1.6 + random() * 0.4, top + 0.014, 0.12 + random() * 0.96], white);
      const deck = bright(mood.cheer > 0.5 ? '#d8261f' : '#8a5a30');
      const railPts: P3[][] = [[], []];
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n;
        const plank = s.box([span / n * 1.2, 0.035, 0.52], [x0 + u * span, top + rise * Math.sin(Math.PI * u), cz], deck);
        plank.rotation.z = Math.atan(rise * Math.PI * Math.cos(Math.PI * u) / span);
      }
      for (let i = 0; i <= 6; i++) {
        const u = i / 6, x = x0 + u * span, y = top + rise * Math.sin(Math.PI * u);
        for (const side of [0, 1]) {
          const z = cz + (side ? 0.26 : -0.26);
          railPts[side].push([x, y + 0.26, z]);
          s.rod([x, y, z], [x, y + 0.26, z], 0.014, white);
        }
      }
      for (const pts of railPts) s.tube(pts, 0.018, white);
      stuck = [1.7 + random() * 0.2, top + 0.02, random() < 0.5 ? 0.18 : 1.02];
    } else if (a.obstacle === 'volcano') {
      const vx = 2.9, h = 0.6;
      const rock = bright(mood.warmth > 0.5 ? '#7a4a36' : '#5f5a58', { roughness: 0.95, flatShading: true });
      s.mesh(new THREE.LatheGeometry([[0.58, 0], [0.5, 0.12], [0.3, 0.36], [0.17, h], [0.11, h - 0.05], [0.001, h - 0.07]].map(([x, y]) => new THREE.Vector2(x, y)), 11), rock, [vx, top, cz]);
      const lava = s.material('#ff6a1f', { emissive: '#ff4a10', emissiveIntensity: mix(0.3, 1, mood.cheer), roughness: 0.4 });
      for (let i = 0; i < 6; i++) {
        const t = i / 6 * Math.PI * 2 + random() * 0.5, reach = 0.3 + random() * 0.5;
        const r = mix(0.17, 0.55, reach) + 0.012;
        s.rod([vx + Math.sin(t) * 0.17, top + h + 0.005, cz + Math.cos(t) * 0.17], [vx + Math.sin(t) * r, top + mix(h, 0.03, reach * 0.95), cz + Math.cos(t) * r], 0.035, lava, 0.022);
      }
      s.ring(0.15, 0.03, [vx, top + h, cz], lava).rotation.x = Math.PI / 2;
      cup = [vx, top + h - 0.07, cz];
      stuck = [vx - 0.6, top + 0.02, cz + (random() - 0.5) * 0.5];
    } else if (a.obstacle === 'bumpers') {
      const caps = ['#d8261f', '#f2c230', '#2c6fd0', '#e8669a', '#2f9a52'];
      const spots: P3[] = [[1.3, 0, 0.35], [1.5, 0, 0.9], [1.9, 0, 0.5], [2.35, 0, 0.85], [2.6, 0, 0.3]];
      spots.forEach(([x, , z], i) => {
        const px = x + (random() - 0.5) * 0.12, pz = z + (random() - 0.5) * 0.1;
        s.cylinder(0.085, 0.1, 0.2, [px, top + 0.1, pz], white, 16);
        const hex = caps[(i + Math.floor(random() * 2)) % caps.length];
        s.cylinder(0.15, 0.15, 0.035, [px, top + 0.215, pz], bright(hex, { emissive: hex, emissiveIntensity: mix(0.05, 0.5, mood.cheer) }), 20);
        s.ball([0.1, 0.05, 0.1], [px, top + 0.23, pz], white, 14);
      });
      for (const [x, z, turn] of [[0.95, 0.15, -0.6], [0.95, 1.05, 0.6], [2.9, 0.9, -0.7]] as const) {
        const bar = s.box([0.5, 0.1, 0.05], [x, top + 0.05, z], bright('#f2c230'));
        bar.rotation.y = turn;
        for (const k of [-0.17, 0, 0.17]) { const stripe = s.box([0.06, 0.102, 0.052], [x + Math.cos(turn) * k, top + 0.05, z - Math.sin(turn) * k], dark); stripe.rotation.y = turn; }
      }
      stuck = [1.68 + random() * 0.08, top + 0.02, 0.72];
    } else {
      const brick = s.box([0.22, 0.07, 0.11], [2.72, top + 0.035, 0.95], s.material('#a8472f', { roughness: 0.95 }));
      brick.rotation.y = 0.7 + random() * 0.4;
      stuck = [2.85, top + 0.02, 1.05];
    }

    // Cup and flag.
    s.cylinder(0.065, 0.065, 0.01, [cup[0], cup[1] + 0.004, cup[2]], dark, 18);
    s.ring(0.065, 0.008, [cup[0], cup[1] + 0.008, cup[2]], white).rotation.x = Math.PI / 2;
    const poleTop = cup[1] + 1.25;
    const lean = (random() - 0.5) * 0.12 * (1 + mood.wear * 2);
    s.rod([cup[0], cup[1], cup[2]], [cup[0] + lean, poleTop, cup[2]], 0.012, white);
    const flag = new THREE.Group();
    flag.position.set(cup[0] + lean, poleTop - 0.16, cup[2]);
    s.root.add(flag);
    const cloth = s.label(NUMBERS[a.flag], 0.46, 0.32, [0.23, 0, 0], '#fdf6dc', a.flag === 'nineteen' ? '#1d3f7a' : a.flag === 'thirteen' ? '#22262a' : '#d8261f');
    flag.add(cloth);
    flag.rotation.y = (random() - 0.5) * 0.8;
    const sway = flag.rotation.y;

    // Tee sign.
    if (a.par !== 'none') {
      const z = -0.32;
      s.rod([0.32, 0, z], [0.32, 0.7, z], 0.02, steel);
      s.box([0.56, 0.28, 0.025], [0.32, 0.78, z], bright('#1d3f7a'));
      s.label({ two: 'PAR 2', three: 'PAR 3', six: 'PAR 6' }[a.par], 0.5, 0.22, [0.32, 0.78, z + 0.015], '#1d3f7a', '#f4efdf');
    }

    // The border bed.
    const bed = dogleg ? { x: 0.85, z: -0.9, w: 1.7, d: 1.6 } : { x: 2.0, z: -0.42, w: 2.9, d: 0.56 };
    const soil = { flowers: '#5a4232', shells: '#d8d0bb', weeds: '#6a5642', rockery: '#8a7a62' }[a.border];
    s.box([bed.w, 0.07, bed.d], [bed.x, 0.035, bed.z], s.material(soil, { roughness: 1 }));
    const inBed = (): P3 => [bed.x + (random() - 0.5) * (bed.w - 0.16), 0.07, bed.z + (random() - 0.5) * (bed.d - 0.14)];
    const bits: { at: P3; size: number; color: THREE.ColorRepresentation }[] = [];
    const leaves: { at: P3; size: number; color: THREE.ColorRepresentation }[] = [];
    const amount = Math.round(mix(0.5, 1.5, mood.density) * bed.w * bed.d * 26);
    if (a.border === 'flowers') {
      const blooms = mood.cheer > 0.4 ? ['#e23b2e', '#f4c20d', '#f08ab0', '#f6f2e6'] : ['#b56a5a', '#c9b56a', '#d8d2c2'];
      const rows = Math.max(2, Math.round(bed.d / 0.2));
      for (let r = 0; r < rows; r++) for (let x = bed.x - bed.w / 2 + 0.12; x < bed.x + bed.w / 2 - 0.08; x += 0.17) {
        if (random() < 0.12 + mood.wear * 0.45) continue;
        const z = bed.z - bed.d / 2 + (r + 0.5) * bed.d / rows + (random() - 0.5) * 0.04;
        leaves.push({ at: [x, 0.1, z], size: 0.9 + random() * 0.4, color: '#3f8f3c' });
        bits.push({ at: [x, 0.17 + random() * 0.03, z], size: 1.2 + random() * 0.5, color: blooms[(r + Math.floor(random() * 1.3)) % blooms.length] });
      }
    } else if (a.border === 'shells') {
      for (let i = 0; i < amount * 1.6; i++) bits.push({ at: inBed(), size: 0.5 + random() * 0.9, color: ['#f1ead8', '#c9bfa8', '#e6c9b4', '#9a968c', '#f6f2e6'][Math.floor(random() * 5)] });
    } else if (a.border === 'weeds') {
      for (let i = 0; i < amount; i++) {
        const at = inBed();
        leaves.push({ at: [at[0], 0.1 + random() * 0.04, at[2]], size: 0.6 + random() * 1.1, color: ['#5c8a3a', '#7a9a4a', '#4a7a3a'][Math.floor(random() * 3)] });
        if (random() < 0.25) bits.push({ at: [at[0], 0.2, at[2]], size: 0.9, color: '#f2c230' });
      }
    } else {
      const stone = s.material('#a39e92', { roughness: 1, flatShading: true });
      for (let i = 0; i < Math.round(bed.w * bed.d * 7); i++) {
        const at = inBed(), r = 0.07 + random() * 0.09;
        s.mesh(new THREE.IcosahedronGeometry(r, 0), stone, [at[0], 0.07 + r * 0.4, at[2]]).rotation.set(random() * 3, random() * 3, 0);
      }
      for (let i = 0; i < amount * 0.5; i++) { const at = inBed(); leaves.push({ at: [at[0], 0.1, at[2]], size: 0.7 + random() * 0.6, color: ['#6aa38a', '#8ab08a', '#b56a8a'][Math.floor(random() * 3)] }); }
    }
    if (bits.length) s.scatter(new THREE.IcosahedronGeometry(0.032, 0), new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), bits);
    if (leaves.length) s.scatter(new THREE.ConeGeometry(0.06, 0.12, 5), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), leaves);

    // The ball.
    const ballAt: P3 | null = {
      tee: [0.38, top + 0.062, cz] as P3,
      stuck: [stuck[0], stuck[1] + 0.045, stuck[2]] as P3,
      lip: [cup[0] - 0.1, cup[1] + 0.047, cup[2] + 0.04] as P3,
      bed: (() => { const at = inBed(); return [at[0], 0.115, at[2]] as P3; })(),
      gone: null,
    }[a.lie];
    if (ballAt) s.ball([0.06, 0.06, 0.06], ballAt, s.material(BALLS[Math.floor(random() * BALLS.length)], { roughness: 0.3 }), 14);
    if (a.lie === 'tee' || mood.density > 0.7) {
      // A putter laid down beside the tee, as if someone has stepped back to line it up.
      s.rod([0.75, top + 0.02, cz + 0.42], [0.2, top + 0.02, cz + 0.5], 0.012, steel);
      s.rod([0.38, top + 0.02, cz + 0.474], [0.2, top + 0.02, cz + 0.5], 0.022, s.material('#d8261f'));
      s.box([0.04, 0.035, 0.12], [0.75, top + 0.02, cz + 0.38], dark);
    }

    const flutter = mix(0.4, 5, mood.energy), swing = mix(0.03, 0.5, mood.energy);
    return s.finish({ update: (_dt, time) => { flag.rotation.y = sway + Math.sin(time * flutter) * swing; } });
  },
});
