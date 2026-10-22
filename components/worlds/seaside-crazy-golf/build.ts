import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type P3 = [number, number, number];
type Inst = { m: THREE.Matrix4; c: THREE.Color };

export default defineWorld({
  questions: {
    shore: choice('What kind of seafront is it?', {
      promenade: 'A British promenade of paving slabs with cast-iron railings in thick municipal paint.',
      boardwalk: 'A Jersey Shore boardwalk of salt-grey planks with white timber rails.',
      seawall: 'A bare concrete sea wall with a painted coping, exposed and windy.',
    }),
    weather: choice('What is the weather doing?', {
      overcast: 'Flat white overcast, no shadows to speak of.',
      golden: 'Low golden evening sun breaking under the cloud.',
      drizzle: 'Fine drizzle, everything wet and darker, puddles on the concrete.',
      fret: 'A sea fret: pale mist swallowing the horizon.',
    }),
    season: choice('What time of year is it?', {
      summer: 'High summer: bunting up, bulbs strung, the hut open and a flag flying.',
      shoulder: 'A weekday out of season: open, just, with nobody about.',
      winter: 'Dead of winter: hut boarded, tarpaulins tied down, waiting for Easter.',
    }),
    tide: choice('What is the sea doing?', {
      out: 'Far out, leaving a wide strip of wet sand and groynes.',
      in: 'Right in against the wall, flat and grey.',
      rough: 'In and rough, white horses and spray coming over.',
    }),
    felt: choice('What colour is the playing surface?', {
      green: 'Classic green felt.',
      blue: 'Swimming-pool blue carpet.',
      red: 'Terracotta red all-weather carpet.',
      patchwork: 'A patchwork of mismatched offcuts, each hole a different green.',
    }),
    kerbs: choice('How are the concrete kerbs painted?', {
      white: 'White, repainted every spring.',
      candy: 'Red and white like seaside rock.',
      seaside: 'Blue and yellow.',
      bare: 'Bare concrete, the paint long gone.',
    }),
    landmark: choice('What stands at the far corner of the course?', {
      lighthouse: 'A red-and-white striped model lighthouse, the last hole.',
      huts: 'A row of painted beach huts.',
      shelter: 'A Victorian seafront shelter with a bench.',
      kiosk: 'An ice-cream kiosk with a giant cone on its roof.',
    }),
    left: choice('What has been left lying around the course?', {
      nothing: 'Nothing, it has been swept.',
      balls: 'Stray coloured balls nobody handed back.',
      chips: 'Dropped chip papers, and the gulls that found them.',
      paint: 'A traffic cone, a paint tin and a brush: touching-up in progress.',
      putters: 'Putters dropped mid-game, as if everyone ran for shelter.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const W = 13, D = 9.5;
    const floorHex = { promenade: '#aaa596', boardwalk: '#a98f6a', seawall: '#9c9b93' }[a.shore];
    const wet = a.weather === 'drizzle';
    const { art: s, world } = diorama(context, {
      background: '#dcdfdb', floor: wet ? '#' + new THREE.Color(floorHex).multiplyScalar(0.82).getHexString() : floorHex,
      width: W, depth: D, maxHeight: 2.7, radius: 1.22, pitch: 31, yaw: 24,
      slots: [[0.2, 0.9], [-3.4, -1.6], [3.6, -1.4], [-3.2, 2.6], [3.5, 2.7], [0.1, -2.9]],
    });

    // Light and sky.
    const sky = { overcast: '#d9dcda', golden: '#ecdcc2', drizzle: '#c3c9cc', fret: '#e4e7e4' }[a.weather];
    world.background.set(sky).lerp(new THREE.Color(mood.warmth > 0.5 ? '#f0dcc0' : '#cfd8e0'), Math.abs(mood.warmth - 0.5) * 0.3);
    const key = world.keyLight!;
    key.intensity = { overcast: 1.75, golden: 3.2, drizzle: 1.25, fret: 1.35 }[a.weather];
    if (a.weather === 'golden') key.color.set('#ffc58a'); else key.color.lerp(new THREE.Color('#ffffff'), 0.6);
    for (const child of s.root.children) if ((child as THREE.HemisphereLight).isHemisphereLight) (child as THREE.HemisphereLight).intensity = { overcast: 1.3, golden: 0.9, drizzle: 1.25, fret: 1.5 }[a.weather];
    const dim = wet ? 0.82 : 1;

    // Instancing collectors: nearly everything repeated goes into four draw calls.
    const boxes: Inst[] = [], balls: Inst[] = [], glows: Inst[] = [], caps: Inst[] = [];
    const euler = new THREE.Euler(), quat = new THREE.Quaternion();
    const matrix = (at: P3, size: P3, ry = 0, rz = 0, rx = 0) => new THREE.Matrix4().compose(new THREE.Vector3(...at), quat.setFromEuler(euler.set(rx, ry, rz)), new THREE.Vector3(...size));
    const grey = new THREE.Color('#9a9a8e'), rust = new THREE.Color('#8a4a25');
    const tint = (hex: THREE.ColorRepresentation, fade = 0) => new THREE.Color(hex).lerp(grey, fade).multiplyScalar(dim);
    const B = (at: P3, size: P3, hex: THREE.ColorRepresentation, ry = 0, rz = 0, rx = 0) => boxes.push({ m: matrix(at, size, ry, rz, rx), c: tint(hex) });
    const S = (at: P3, size: P3, hex: THREE.ColorRepresentation, ry = 0) => balls.push({ m: matrix(at, size, ry), c: tint(hex) });
    const glow = (at: P3, r: number, hex: string) => glows.push({ m: matrix(at, [r, r * 1.25, r]), c: new THREE.Color(hex) });
    const gull = (x: number, y: number, z: number, ry: number) => {
      const fx = Math.sin(ry), fz = Math.cos(ry);
      S([x, y + 0.17, z], [0.1, 0.1, 0.2], '#f6f4ee', ry);
      S([x - fx * 0.05, y + 0.2, z - fz * 0.05], [0.105, 0.07, 0.2], '#8f989e', ry);
      S([x + fx * 0.16, y + 0.31, z + fz * 0.16], [0.065, 0.065, 0.065], '#f6f4ee');
      B([x + fx * 0.25, y + 0.3, z + fz * 0.25], [0.03, 0.03, 0.1], '#f2b90f', ry);
      B([x, y + 0.04, z], [0.05, 0.1, 0.02], '#f2b90f', ry);
    };

    // The course: cells of felt, kerbs on every outside edge.
    const cs = 0.25, nx = Math.round(W / cs), nz = Math.round(D / cs);
    const grid = new Uint8Array(nx * nz);
    const fill = (x0: number, x1: number, z0: number, z1: number, id: number, octagon = false) => {
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, hw = (x1 - x0) / 2, hd = (z1 - z0) / 2;
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const cx = -W / 2 + (i + 0.5) * cs, cz = -D / 2 + (j + 0.5) * cs;
        if (cx < x0 || cx > x1 || cz < z0 || cz > z1) continue;
        if (octagon && Math.abs(cx - mx) / hw + Math.abs(cz - mz) / hd > 1.7) continue;
        grid[j * nx + i] = id;
      }
    };
    const pads: [number, number][] = [[-3.4, -1.6], [0.1, -2.9], [3.6, -1.4], [-3.2, 2.6], [0.2, 0.9], [3.5, 2.7]];
    pads.forEach(([x, z], i) => fill(x - 1.375, x + 1.375, z - 1.25, z + 1.25, i + 1, true));
    fill(-2.5, -0.9, -2.6, -1.85, 7); fill(1.1, 2.7, -2.6, -1.85, 7);
    fill(-2.3, -0.8, 1.4, 2.15, 8); fill(1.2, 2.6, 1.45, 2.2, 8);
    fill(-6.1, -4.3, -2.1, -1.1, 7); fill(4.5, 6.2, -1.9, -0.9, 7);
    fill(-5.9, -4.1, 2.1, 3.1, 8); fill(4.4, 6.1, 2.2, 3.2, 8);
    const feltHex = { green: '#2f9150', blue: '#2f86b8', red: '#b5583a', patchwork: '#2f9150' }[a.felt];
    const offcuts = ['#2f9150', '#4c9a3c', '#1f7a56', '#6aa35a', '#3a8a70', '#2f86b8', '#5a8f3a', '#3f9a7a', '#7aa04a'];
    const shuffle = Math.floor(random() * 9);
    const kerbPair = { white: ['#f1ede0', '#f1ede0'], candy: ['#d8261f', '#f1ede0'], seaside: ['#2c6fd0', '#f2c230'], bare: ['#b9b6aa', '#aeaba0'] }[a.kerbs];
    const at = (i: number, j: number) => (i < 0 || j < 0 || i >= nx || j >= nz ? 0 : grid[j * nx + i]);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const id = at(i, j);
      if (!id) continue;
      const x = -W / 2 + (i + 0.5) * cs, z = -D / 2 + (j + 0.5) * cs;
      const base = new THREE.Color(a.felt === 'patchwork' ? offcuts[(id + shuffle) % 9] : feltHex);
      base.lerp(grey, mood.wear * (0.08 + random() * 0.22)).multiplyScalar(dim * (0.96 + random() * 0.08));
      boxes.push({ m: matrix([x, 0.02, z], [cs, 0.04, cs]), c: base });
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        if (at(i + di, j + dj)) continue;
        const paint = new THREE.Color(kerbPair[(Math.floor(i / 2) + Math.floor(j / 2)) % 2]);
        if (random() < mood.wear * 0.5) paint.lerp(new THREE.Color('#aeaba0'), 0.4 + random() * 0.6);
        boxes.push({ m: matrix([x + di * (cs / 2 + 0.05), 0.07, z + dj * (cs / 2 + 0.05)], di ? [0.1, 0.14, cs + (at(i, j + 1) && at(i, j - 1) ? 0 : 0.1)] : [cs + 0.1, 0.14, 0.1]), c: paint.multiplyScalar(dim) });
      }
    }

    // Ground texture: slabs, planks or cracks.
    const line = new THREE.Color(floorHex).multiplyScalar(0.8);
    if (a.shore === 'promenade') {
      for (let x = -W / 2 + 1; x < W / 2; x += 1) B([x, 0.003, 0], [0.03, 0.006, D], line);
      for (let z = -D / 2 + 0.95; z < D / 2; z += 0.95) B([0, 0.003, z], [W, 0.006, 0.03], line);
    } else if (a.shore === 'boardwalk') {
      for (let z = -D / 2 + 0.24; z < D / 2; z += 0.24) B([0, 0.003, z], [W, 0.006, 0.025], line);
      for (let x = -W / 2 + 2.6; x < W / 2; x += 2.6) B([x, 0.004, 0], [0.035, 0.008, D], line);
    } else {
      B([0, 0.003, 4.3], [W, 0.006, 0.09], '#e6c53a');
      for (let i = 0; i < 9; i++) B([(random() - 0.5) * W * 0.9, 0.003, (random() - 0.5) * D * 0.9], [0.6 + random() * 1.4, 0.006, 0.02], line, random() * 3);
    }

    // Foundation, sea wall, sand and sea.
    const back = -D / 2;
    s.box([W, 1.0, D], [0, -0.74, 0], s.material('#a8a498', { roughness: 1 }));
    const seaHex = { overcast: '#7c9496', golden: '#a39f86', drizzle: '#6a7b82', fret: '#b4c1c1' }[a.weather];
    const sea = new THREE.Color(seaHex).lerp(new THREE.Color('#6fa3b5'), mood.cheer * 0.25);
    const seaDepth = 4.2, sandDepth = a.tide === 'out' ? 2.1 : 0;
    const sandTop = -0.35, seaTop = a.tide === 'out' ? -0.42 : -0.28;
    if (sandDepth) {
      s.box([W, sandTop + 1.24, sandDepth], [0, (sandTop - 1.24) / 2, back - sandDepth / 2], s.material(wet ? '#b3a37f' : '#d2c198', { roughness: 1 }));
      for (const gx of [-3.4, 2.9]) for (let k = 0; k < 9; k++) B([gx + k * 0.03, sandTop + 0.2 - k * 0.012, back - 0.2 - k * 0.3], [0.13, 0.5 - k * 0.02, 0.13], '#4f4438');
      for (let i = 0; i < 6; i++) S([(random() - 0.5) * W * 0.9, sandTop + 0.004, back - 0.3 - random() * (sandDepth - 0.5)], [0.3 + random() * 0.5, 0.01, 0.12 + random() * 0.2], '#a89a78');
    }
    const seaZ = back - sandDepth - (seaDepth - sandDepth) / 2;
    s.box([W, seaTop + 1.24, seaDepth - sandDepth], [0, (seaTop - 1.24) / 2, seaZ], new THREE.MeshStandardMaterial({ color: sea, roughness: 0.25, metalness: 0.15 }));
    const foam = a.weather === 'fret' ? '#eef1ee' : '#f4f6f2';
    const waveCount = a.tide === 'rough' ? 44 : a.tide === 'in' ? 12 : 6;
    for (let i = 0; i < waveCount; i++) caps.push({ m: matrix([(random() - 0.5) * (W - 1.2), seaTop + 0.012, seaZ + (random() - 0.5) * (seaDepth - sandDepth - 0.3)], [0.35 + random() * (a.tide === 'rough' ? 1.1 : 0.7), 0.024 + (a.tide === 'rough' ? 0.05 : 0), 0.05 + random() * 0.06]), c: new THREE.Color(foam) });
    if (a.tide === 'rough') for (let i = 0; i < 16; i++) { const r = 0.12 + random() * 0.22; S([(random() - 0.5) * W * 0.9, seaTop + 0.1 + random() * 0.75, back - 0.12 - random() * 0.2], [r, r * 1.3, r * 0.7], foam); }
    if (a.weather !== 'fret') {
      B([3.2 + random() * 2, seaTop + 0.09, back - seaDepth + 0.35], [0.9, 0.16, 0.2], '#4a5560');
      B([3.5 + random() * 1.2, seaTop + 0.25, back - seaDepth + 0.35], [0.3, 0.2, 0.16], '#e8e4d8');
    }

    // Railings or wall along the seaward edge, and a low fence down the far side.
    const railHex = a.shore === 'promenade' ? (mood.cheer > 0.5 ? '#3f9a8a' : '#2f5f8f') : '#f1ede0';
    const railTone = new THREE.Color(railHex).lerp(rust, mood.wear * 0.35);
    const rz = back + 0.2;
    if (a.shore === 'seawall') {
      B([0, 0.4, rz], [W, 0.8, 0.34], '#bdbbb1');
      for (let x = -W / 2 + 0.5; x < W / 2; x += 1) B([x, 0.83, rz], [0.96, 0.08, 0.42], random() < mood.wear * 0.6 ? '#aeaba0' : (kerbPair[0] === '#b9b6aa' ? '#f1ede0' : kerbPair[0]));
    } else {
      for (let x = -W / 2 + 0.25; x <= W / 2 - 0.2; x += 1.25) {
        B([x, 0.55, rz], a.shore === 'boardwalk' ? [0.11, 1.1, 0.11] : [0.08, 1.1, 0.08], railTone);
        if (a.shore === 'promenade') S([x, 1.14, rz], [0.075, 0.075, 0.075], railTone);
      }
      for (const y of a.shore === 'boardwalk' ? [0.5, 1.06] : [0.38, 0.72, 1.04]) B([0, y, rz], [W - 0.5, a.shore === 'boardwalk' ? 0.1 : 0.05, a.shore === 'boardwalk' ? 0.06 : 0.05], railTone);
    }
    for (let z = back + 0.9; z < D / 2 - 0.2; z += 0.86) if (random() > mood.wear * 0.25) B([-W / 2 + 0.16, 0.3, z], [0.06, 0.6, 0.06], '#f1ede0', 0, 0, (random() - 0.5) * 0.3 * mood.wear);
    B([-W / 2 + 0.16, 0.5, 0.35], [0.04, 0.07, D - 1.3], '#f1ede0');

    // Lamp posts with festoon bulbs and bunting strung between.
    const lit = Math.abs(mood.daylight - 0.5) > 0.22 || wet || a.weather === 'fret';
    const posts = [-6.1, -2.0, 2.0, 6.1];
    const bulbHexes = mood.cheer > 0.35 ? ['#ff4a3a', '#ffd23a', '#3ad27a', '#3a9aff', '#ff7ad0'] : ['#ffe2a0', '#fff0c8'];
    const flagHexes = ['#d8261f', '#f2c230', '#2c6fd0', '#f1ede0', '#2f9a52'];
    posts.forEach((px, index) => {
      const pz = rz + 0.32;
      s.cylinder(0.05, 0.09, 3.2, [px, 1.6, pz], new THREE.MeshStandardMaterial({ color: railTone.clone().multiplyScalar(0.8), roughness: 0.6 }), 8);
      B([px, 3.22, pz], [0.34, 0.05, 0.34], railTone);
      if (lit) glow([px, 3.42, pz], 0.17, '#fff1c4'); else S([px, 3.42, pz], [0.17, 0.2, 0.17], '#eeeae0');
      if (index === posts.length - 1 || a.season === 'winter') return;
      const nxp = posts[index + 1], n = 11;
      for (let k = 1; k < n; k++) {
        const u = k / n, x = mix(px, nxp, u), sag = Math.sin(u * Math.PI) * 0.5;
        if (random() > mood.wear * 0.35) {
          if (lit) glow([x, 3.05 - sag, pz], 0.075, bulbHexes[k % bulbHexes.length]); else S([x, 3.05 - sag, pz], [0.075, 0.095, 0.075], bulbHexes[k % bulbHexes.length]);
        }
        B([mix(px, nxp, u - 0.5 / n), 3.13 - Math.sin((u - 0.5 / n) * Math.PI) * 0.5, pz], [(nxp - px) / n * 1.03, 0.014, 0.014], '#22262a', 0, -Math.cos((u - 0.5 / n) * Math.PI) * 0.36);
        if (a.season === 'summer') B([x + 0.18, 2.5 - sag * 0.7, pz + 0.1], [0.2, 0.26, 0.012], flagHexes[(k + index) % flagHexes.length], 0, (random() - 0.5) * 0.5 * (0.4 + mood.energy));
      }
      B([mix(px, nxp, 1 - 0.5 / n), 3.13 - Math.sin((1 - 0.5 / n) * Math.PI) * 0.5, pz], [(nxp - px) / n * 1.03, 0.014, 0.014], '#22262a', 0, Math.cos(0.5 / n * Math.PI) * 0.36);
      if (a.season === 'summer') B([(px + nxp) / 2, 2.64 - 0.33, pz + 0.1], [nxp - px, 0.012, 0.012], '#f1ede0');
    });

    // The course's own ticket hut, in the far corner.
    const hx = -5.35, hz = -3.75;
    const stripes = document.createElement('canvas');
    stripes.width = 128; stripes.height = 16;
    const sc = stripes.getContext('2d')!;
    const pair = mood.cheer > 0.45 ? ['#3a8fd0', '#f4efe2'] : ['#5f7f8a', '#e6e1d2'];
    for (let i = 0; i < 8; i++) { sc.fillStyle = '#' + tint(pair[i % 2], mood.wear * 0.3).getHexString(); sc.fillRect(i * 16, 0, 16, 16); }
    const stripeMap = new THREE.CanvasTexture(stripes);
    stripeMap.colorSpace = THREE.SRGBColorSpace;
    stripeMap.wrapS = THREE.RepeatWrapping;
    s.box([1.7, 2.1, 1.4], [hx, 1.05, hz], new THREE.MeshStandardMaterial({ map: stripeMap, roughness: 0.8 }));
    const roof = s.mesh(new THREE.ConeGeometry(1, 0.7, 4), s.material('#4a4e55', { roughness: 1 }), [hx, 2.45, hz]);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.5, 1, 1.3);
    s.label(a.season === 'winter' ? 'CLOSED' : 'CRAZY GOLF', 1.6, 0.3, [hx, 2.02, hz + 0.93], a.season === 'winter' ? '#c21f1a' : '#1f5f9a', '#f7f0d6');
    B([hx, 1.87, hz + 0.9], [1.7, 0.05, 0.06], '#1f5f9a');
    if (a.season === 'winter') {
      B([hx, 1.3, hz + 0.72], [0.95, 0.66, 0.04], '#f1ede0');
      B([hx, 1.3, hz + 0.75], [1.2, 0.12, 0.03], '#b89466', 0, 0.55);
      B([hx, 1.3, hz + 0.75], [1.2, 0.12, 0.03], '#b89466', 0, -0.55);
    } else {
      B([hx, 1.3, hz + 0.71], [0.95, 0.66, 0.03], '#15181b');
      B([hx, 0.95, hz + 0.86], [1.15, 0.05, 0.32], '#f1ede0');
      if (lit) glow([hx + 0.2, 1.5, hz + 0.72], 0.06, '#ffe2a0');
      B([hx - 0.3, 1.04, hz + 0.9], [0.07, 0.15, 0.15], mood.cheer > 0.5 ? '#f08ab0' : '#f2c860');
    }
    if (a.season === 'summer') {
      s.rod([hx, 2.8, hz], [hx, 3.7, hz], 0.015, s.material('#f1ede0'));
      B([hx + 0.22, 3.55, hz], [0.44, 0.28, 0.012], '#d8261f');
    }
    // Putter rack by the hut.
    B([hx + 1.45, 0.5, hz + 0.3], [0.9, 0.06, 0.08], '#b58549');
    for (const dx of [-0.42, 0.42]) B([hx + 1.45 + dx, 0.38, hz + 0.3], [0.06, 0.76, 0.06], '#b58549');
    if (a.season !== 'winter') for (let k = 0; k < 6; k++) {
      const h = 0.5 + k * 0.08;
      B([hx + 1.1 + k * 0.14, h / 2, hz + 0.38], [0.025, h, 0.025], '#b9bfc0', 0, 0, -0.12);
      B([hx + 1.1 + k * 0.14, h - 0.08, hz + 0.36], [0.05, 0.2, 0.05], ['#d8322b', '#f2b90f', '#2c6fd0', '#2f9a52', '#22262a', '#22262a'][k], 0, 0, -0.12);
    }

    // Landmark in the other far corner.
    const lx = 5.05, lz = -3.6;
    if (a.landmark === 'lighthouse') {
      const bands = document.createElement('canvas');
      bands.width = 8; bands.height = 64;
      const bc = bands.getContext('2d')!;
      for (let i = 0; i < 4; i++) { bc.fillStyle = '#' + tint(i % 2 ? '#f4efe2' : '#d2302a', mood.wear * 0.35).getHexString(); bc.fillRect(0, i * 16, 8, 16); }
      const bandMap = new THREE.CanvasTexture(bands);
      bandMap.colorSpace = THREE.SRGBColorSpace;
      s.mesh(new THREE.CylinderGeometry(0.42, 0.72, 2.6, 20), new THREE.MeshStandardMaterial({ map: bandMap, roughness: 0.6 }), [lx, 1.3, lz]);
      s.cylinder(0.6, 0.6, 0.08, [lx, 2.64, lz], s.material('#2a2e33'), 20);
      s.cylinder(0.33, 0.33, 0.5, [lx, 2.93, lz], new THREE.MeshStandardMaterial({ color: '#ffe9a0', emissive: '#ffd060', emissiveIntensity: lit ? 1.4 : 0.25, roughness: 0.3 }), 12);
      s.mesh(new THREE.ConeGeometry(0.46, 0.42, 12), s.material('#d2302a'), [lx, 3.39, lz]);
      B([lx, 0.5, lz + 0.62], [0.36, 0.7, 0.06], '#2a2e33');
      for (let i = 0; i < 7; i++) { const t = i * 0.9; S([lx + Math.sin(t) * 0.95, 0.12, lz + Math.cos(t) * 0.85], [0.26 + random() * 0.14, 0.2, 0.24], '#8f8b80'); }
    } else if (a.landmark === 'huts') {
      const hutHexes = mood.cheer > 0.45 ? ['#f2c230', '#f08ab0', '#8fd0b8', '#3a8fd0'] : ['#b9b08a', '#a8a09a', '#8fa39a', '#7f95a8'];
      for (let i = 0; i < 3; i++) {
        const x = lx - 1.15 + i * 1.15, hex = hutHexes[(i + shuffle) % 4];
        B([x, 0.75, lz - 0.2], [1.0, 1.5, 1.3], hex);
        B([x - 0.26, 1.72, lz - 0.2], [0.66, 0.07, 1.42], '#f1ede0', 0, 0.62);
        B([x + 0.26, 1.72, lz - 0.2], [0.66, 0.07, 1.42], '#f1ede0', 0, -0.62);
        B([x, 1.62, lz - 0.2], [0.72, 0.36, 1.28], hex);
        B([x, 0.62, lz + 0.46], [0.5, 1.2, 0.03], '#f1ede0');
        B([x, 0.62, lz + 0.47], [0.04, 1.2, 0.03], hex);
      }
    } else if (a.landmark === 'shelter') {
      for (const dx of [-1.1, 1.1]) for (const dz of [-0.55, 0.55]) B([lx + dx, 1.1, lz + dz], [0.09, 2.2, 0.09], railTone);
      const top = s.mesh(new THREE.ConeGeometry(1, 0.6, 4), s.material('#5a6a66', { roughness: 0.9 }), [lx, 2.5, lz]);
      top.rotation.y = Math.PI / 4;
      top.scale.set(2.0, 1, 1.15);
      B([lx, 2.2, lz], [2.7, 0.08, 1.6], '#f1ede0');
      B([lx, 1.1, lz], [2.2, 2.0, 0.06], '#d9dcd6');
      for (const dz of [-0.3, 0.3]) { B([lx, 0.45, lz + dz], [2.0, 0.06, 0.4], '#7a5a3a'); B([lx, 0.22, lz + dz], [1.9, 0.44, 0.06], '#4a4f55'); }
      B([lx, 3.0, lz], [0.06, 0.4, 0.06], railTone);
    } else {
      B([lx, 1.0, lz], [1.8, 2.0, 1.5], mood.cheer > 0.45 ? '#f6e3c8' : '#d9d2c2');
      B([lx, 2.05, lz], [2.0, 0.1, 1.7], '#f08ab0');
      for (let i = 0; i < 6; i++) B([lx - 0.82 + i * 0.33, 1.83, lz + 1.0], [0.33, 0.05, 0.6], i % 2 ? '#f1ede0' : '#f08ab0', 0, 0, 0.45);
      B([lx, 1.25, lz + 0.76], [1.3, 0.7, 0.03], a.season === 'winter' ? '#b89466' : '#15181b');
      B([lx, 0.88, lz + 0.86], [1.5, 0.05, 0.3], '#f1ede0');
      s.mesh(new THREE.ConeGeometry(0.34, 0.9, 12).rotateX(Math.PI), s.material('#d9a45a'), [lx, 2.6, lz]);
      S([lx, 3.15, lz], [0.4, 0.34, 0.4], '#fbf5e4');
      S([lx, 3.47, lz], [0.27, 0.27, 0.27], '#fbf5e4');
      B([lx + 0.2, 3.62, lz + 0.05], [0.09, 0.5, 0.09], '#5a3320', 0, -0.5);
    }

    // Tee mats, cups and flags at the ends of the two holes.
    for (const [tx, tz] of [[-5.7, -1.6], [-5.5, 2.6]] as const) {
      B([tx, 0.05, tz], [0.42, 0.02, 0.7], '#1b1e21');
      for (const dz of [-0.2, 0, 0.2]) S([tx, 0.062, tz + dz], [0.03, 0.006, 0.03], '#f4f0e3');
    }
    const flags: THREE.Object3D[] = [];
    ([[5.75, -1.4, 1], [5.65, 2.7, 2]] as const).forEach(([cx, cz, n]) => {
      B([cx, 0.043, cz], [0.16, 0.012, 0.16], '#15181b', 0.78);
      const lean = (random() - 0.5) * 0.1 * (1 + mood.wear * 2);
      s.rod([cx, 0.04, cz], [cx + lean, 1.5, cz], 0.016, s.material('#f1ede0'));
      const pivot = new THREE.Group();
      pivot.position.set(cx + lean, 1.33, cz);
      pivot.add(s.label(String(n === 1 ? 9 : 18), 0.5, 0.34, [0.25, 0, 0], '#fdf6dc', n === 1 ? '#d8261f' : '#1d3f7a'));
      pivot.rotation.y = (random() - 0.5) * 0.7;
      s.root.add(pivot);
      flags.push(pivot);
    });
    // Two small obstacles of the course's own on the connecting fairways.
    B([-1.7, 0.16, -2.22], [0.5, 0.24, 0.75], kerbPair[0] === '#b9b6aa' ? '#d8261f' : kerbPair[0]);
    B([-1.7, 0.1, -2.22], [0.52, 0.16, 0.26], '#15181b');
    for (const dz of [-0.22, 0, 0.22]) { S([1.9, 0.12, 1.82 + dz * 1.1], [0.07, 0.1, 0.07], '#f1ede0'); S([1.9, 0.22, 1.82 + dz * 1.1], [0.1, 0.04, 0.1], ['#d8261f', '#f2c230', '#2c6fd0'][Math.round(dz / 0.22) + 1]); }

    // Bench, bin and winter covers.
    const benchX = -5.75, benchZ = 0.45;
    for (let k = 0; k < 4; k++) B([benchX + k * 0.11, 0.45, benchZ], [0.09, 0.035, 1.5], '#7a5a3a');
    for (let k = 0; k < 3; k++) B([benchX - 0.1, 0.62 + k * 0.13, benchZ], [0.035, 0.1, 1.5], '#7a5a3a');
    for (const dz of [-0.6, 0.6]) { B([benchX + 0.16, 0.22, benchZ + dz], [0.4, 0.44, 0.06], '#3a3f45'); B([benchX - 0.1, 0.6, benchZ + dz], [0.05, 0.75, 0.06], '#3a3f45'); }
    s.cylinder(0.2, 0.17, 0.62, [benchX + 0.1, 0.31, benchZ + 1.2], s.material('#2f5f4a', { roughness: 0.6 }), 12);
    if (a.season === 'winter') {
      for (const [x, z, w] of [[5.6, 0.5, 1.5], [-1.6, -0.6, 0.9]] as const) {
        s.mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: tint('#2f6fb0', mood.wear * 0.3), roughness: 0.5, flatShading: true }), [x, 0.2, z]).scale.set(w * 0.5, 0.5, 0.55);
        B([x, 0.38, z], [w * 0.9, 0.02, 0.03], '#e6c53a', 0.4);
      }
    } else if (a.season === 'summer') {
      // A-board by the entrance.
      for (const side of [-1, 1]) {
        const face = s.label('99s', 0.5, 0.7, [5.7, 0.4, 0.5 + side * 0.12], '#f6f1df', '#d8261f');
        face.rotation.x = side * -0.3;
        if (side < 0) face.rotation.y = Math.PI;
      }
    }

    // Puddles.
    const puddles = Math.round((wet ? 9 : a.season === 'winter' ? 4 : 0) + mood.wear * 3);
    if (puddles) {
      const pool = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.008, 18), new THREE.MeshStandardMaterial({ color: new THREE.Color(sky).multiplyScalar(0.72), roughness: 0.06, metalness: 0.35 }), puddles);
      for (let i = 0; i < puddles; i++) pool.setMatrixAt(i, matrix([(random() - 0.5) * (W - 1.5), 0.052, (random() - 0.5) * (D - 1.5)], [0.3 + random() * 0.5, 1, 0.2 + random() * 0.35], random() * 3));
      pool.receiveShadow = true;
      pool.frustumCulled = false;
      s.root.add(pool);
    }

    // Left lying around.
    const stray = (): P3 => [(random() - 0.5) * (W - 2), 0, (random() - 0.5) * (D - 2.4) + 0.4];
    if (a.left === 'balls') {
      const hexes = ['#e23b2e', '#f4c20d', '#2f7fd6', '#ef7f1a', '#d94f9b', '#f6f2e6'];
      for (let i = 0; i < 9 + Math.round(mood.density * 8); i++) { const p = stray(); S([p[0], 0.13, p[2]], [0.09, 0.09, 0.09], hexes[i % hexes.length]); }
    } else if (a.left === 'chips') {
      for (let i = 0; i < 6 + Math.round(mood.density * 6); i++) B([benchX + 0.6 + random() * 1.6, 0.03, benchZ - 0.6 + random() * 1.6], [0.22, 0.03, 0.16], i % 3 ? '#f1ead8' : '#e8d9a8', random() * 3, (random() - 0.5) * 0.5);
      for (let i = 0; i < 4; i++) gull(benchX + 0.8 + random() * 1.5, 0, benchZ - 0.6 + random() * 1.6, random() * 6);
    } else if (a.left === 'paint') {
      s.mesh(new THREE.ConeGeometry(0.2, 0.62, 12), s.material('#ef6a1a', { roughness: 0.6 }), [-1.6, 0.34, -0.6]);
      B([-1.6, 0.02, -0.6], [0.46, 0.04, 0.46], '#ef6a1a');
      s.cylinder(0.14, 0.17, 0.12, [-1.6, 0.38, -0.6], s.material('#f4f0e3'), 12);
      s.cylinder(0.13, 0.13, 0.24, [-1.25, 0.12, -0.25], s.material('#c9cfd1', { metalness: 0.7, roughness: 0.3 }), 12);
      S([-1.25, 0.245, -0.25], [0.12, 0.01, 0.12], kerbPair[0]);
      B([-1.0, 0.03, -0.3], [0.32, 0.03, 0.06], '#7a5a3a', 0.5);
      S([-1.35, 0.01, 0.0], [0.2, 0.008, 0.13], kerbPair[0]);
    } else if (a.left === 'putters') {
      for (let i = 0; i < 4; i++) {
        const p = stray(), turn = random() * Math.PI;
        B([p[0], 0.07, p[2]], [0.9, 0.03, 0.03], '#b9bfc0', turn);
        B([p[0] - Math.cos(turn) * 0.34, 0.07, p[2] + Math.sin(turn) * 0.34], [0.24, 0.055, 0.055], ['#d8322b', '#f2b90f', '#2c6fd0', '#22262a'][i], turn);
        B([p[0] + Math.cos(turn) * 0.45, 0.07, p[2] - Math.sin(turn) * 0.45], [0.05, 0.05, 0.16], '#1b1e21', turn);
        S([p[0] + 0.3, 0.13, p[2] + 0.25], [0.09, 0.09, 0.09], ['#e23b2e', '#f4c20d', '#2f7fd6', '#f6f2e6'][i]);
      }
    }
    // Gulls on the rail, more of them when the place is empty.
    const railTop = a.shore === 'seawall' ? 0.87 : 1.12;
    for (let i = 0; i < 1 + Math.round((1 - mood.cheer) * 2 + mood.density * 2); i++) gull((random() - 0.5) * (W - 1.5), railTop, rz, (random() - 0.5) * 2 + (random() < 0.5 ? Math.PI : 0));
    for (let i = 0; i < Math.round(mood.wear * 14 + (a.season === 'winter' ? 8 : 0)); i++) { const p = stray(); B([p[0], 0.05, p[2]], [0.12, 0.012, 0.07], ['#8a5a30', '#a8742f', '#6a5a3a'][i % 3], random() * 3); }

    // Flush the collectors.
    const flush = (list: Inst[], geometry: THREE.BufferGeometry, material: THREE.Material, shadows = true) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, list.length));
      mesh.count = list.length;
      list.forEach((item, i) => { mesh.setMatrixAt(i, item.m); mesh.setColorAt(i, item.c); });
      mesh.castShadow = mesh.receiveShadow = shadows;
      mesh.frustumCulled = false;
      s.root.add(mesh);
      return mesh;
    };
    flush(boxes, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: wet ? 0.55 : 0.88 }));
    flush(balls, new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ roughness: 0.6 }));
    flush(glows, new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial(), false);
    const waves = flush(caps, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.6 }), false);

    const drift = mix(0.1, 0.9, mood.energy) * (a.tide === 'rough' ? 1.6 : 1);
    const sways = flags.map((flag) => flag.rotation.y);
    world.update = (_dt, time) => {
      waves.position.x = Math.sin(time * drift) * 0.25;
      waves.position.z = Math.cos(time * drift * 0.7) * 0.06;
      flags.forEach((flag, i) => { flag.rotation.y = sways[i] + Math.sin(time * drift * 4 + i) * 0.35 * mood.energy; });
    };
    return world;
  },
});
