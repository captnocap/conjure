import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type V3 = [number, number, number];
const TAGS = {
  unknown: 'UNKNOWN', doe: 'JOHN DOE', hold: 'HOLD', donor: 'DONOR', noopen: 'DO NOT OPEN', returned: 'RETURN TO SENDER', query: '?',
} as const;
const NUMBERS = { four: '4', seven: '7', thirteen: '13', twentyseven: '27', zero: '0' } as const;

export default defineThing({
  questions: {
    shows: choice('What shows of the body under the sheet?', {
      peak: 'Nothing: a fully covered shape with a nose-shaped peak and two feet.',
      face: 'The sheet is folded back to the collarbone, showing a pale, calm face.',
      hand: 'Fully covered, but one pale arm has slipped out and hangs off the side.',
      sitting: 'The sheeted figure is sitting bolt upright on the tray.',
      empty: 'Nobody: the sheet lies crumpled on an empty tray.',
    }),
    tag: choice('What is written on the toe tag?', {
      unknown: 'UNKNOWN', doe: 'JOHN DOE', hold: 'HOLD', donor: 'DONOR', noopen: 'DO NOT OPEN', returned: 'RETURN TO SENDER', query: 'Just a question mark.',
    }),
    sheet: choice('What state is the sheet in?', {
      pressed: 'Crisp and white, laundry fold creases still in a grid.',
      plain: 'Plain, soft and a little grey from many washes.',
      damp: 'Damp, with spreading grey water marks: a drowning, or the rain.',
      blood: 'One dark red stain soaked through at the chest.',
      mud: 'Smeared with mud and grass, straight from a ditch.',
      green: 'Blotched with something faintly luminous green.',
    }),
    number: choice('What is the drawer number?', {
      four: 'Number 4.', seven: 'Number 7.', thirteen: 'Number 13.', twentyseven: 'Number 27.', zero: 'Number 0, which the wall does not have.',
    }),
    rests: choice('What rests on top of the sheet?', {
      nothing: 'Nothing.',
      flowers: 'A small bunch of flowers someone left.',
      clipboard: 'A clipboard of paperwork, left mid-form.',
      ring: 'A small clear bag holding a wedding ring.',
      effects: 'A brown paper bag of personal effects.',
      hat: 'Their hat, placed on the chest.',
    }),
    support: choice('What is the tray pulled out of, or resting on?', {
      wall: 'A section of steel drawer wall, its door swung open.',
      trolley: 'A wheeled transfer trolley with a push handle.',
      trestles: 'Two folding trestles, an overflow arrangement.',
    }),
    large: noul('Is it a big, heavy body rather than a slight one?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.64, T = a.support === 'trolley' ? 0.78 : a.support === 'trestles' ? 0.7 : 0.62;
    const steel = s.material(new THREE.Color('#b4bfc2').lerp(new THREE.Color('#c4bdae'), mood.warmth * 0.5), { metalness: 0.55, roughness: 0.38 });
    const steelDark = s.material('#77848a', { metalness: 0.5, roughness: 0.5 });
    const black = s.material('#1d2124', { roughness: 0.7 });
    const pale = s.material(new THREE.Color('#d9d3c6').lerp(new THREE.Color('#b7c2b6'), (1 - mood.cheer) * 0.6), { roughness: 0.7 });
    const number = NUMBERS[a.number], tagText = TAGS[a.tag];

    // Tray: pan, raised lips, front handle and card holder.
    s.box([W, 0.02, 2.04], [0, T - 0.01, 0], steel);
    for (const x of [-1, 1]) s.box([0.02, 0.05, 2.04], [x * (W / 2), T + 0.015, 0], steel);
    for (const z of [-1, 1]) s.box([W, 0.05, 0.02], [0, T + 0.015, z * 1.02], steel);
    for (const x of [-1, 1]) s.box([0.035, 0.035, 2.0], [x * 0.24, T - 0.04, -0.05], steelDark);
    s.tube([[-0.14, T - 0.005, 1.03], [-0.14, T - 0.005, 1.1], [0.14, T - 0.005, 1.1], [0.14, T - 0.005, 1.03]], 0.011, steelDark);
    const card = s.label(tagText, 0.26, 0.08, [0.12, T - 0.065, 1.033], '#22282c', '#efe8d2');
    card.rotation.x = -0.12;
    s.label(number, 0.11, 0.08, [-0.2, T - 0.065, 1.033], '#f0ead8', '#262b30').rotation.x = -0.12;

    // What carries it.
    if (a.support === 'wall') {
      const cz = -1.25;
      s.box([0.98, 1.56, 0.44], [0, 0.78, cz], steel);
      s.box([1.02, 0.06, 0.48], [0, 1.57, cz], steelDark);
      s.box([1.02, 0.06, 0.48], [0, 0.03, cz], steelDark);
      s.box([0.76, 0.42, 0.02], [0, T + 0.16, cz + 0.215], black);
      const others = [String(Math.max(1, Number(number) - 1)), String(Number(number) + 1)];
      for (const [row, y] of [[0, 0.3], [1, 1.3]] as const) {
        s.box([0.78, 0.42, 0.04], [0, y, cz + 0.235], steel);
        s.box([0.8, 0.44, 0.015], [0, y, cz + 0.222], steelDark);
        s.box([0.05, 0.16, 0.05], [0.3, y, cz + 0.275], steelDark);
        s.box([0.03, 0.03, 0.09], [0.3, y + 0.06, cz + 0.3], steelDark);
        s.label(others[row], 0.12, 0.085, [-0.22, y + 0.1, cz + 0.257], '#f0ead8', '#262b30');
      }
      // The open door, hinged on the left and swung wide.
      const door = new THREE.Group();
      door.position.set(-0.39, T + 0.16, cz + 0.24);
      door.rotation.y = -(1.75 + random() * 0.35);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.42, 0.05), steel);
      leaf.position.set(0.39, 0, 0);
      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05), steelDark);
      lever.position.set(0.69, 0, 0.05);
      door.add(leaf, lever);
      door.traverse((m) => { m.castShadow = m.receiveShadow = true; });
      s.root.add(door);
      const plate = s.label(number, 0.12, 0.085, [0, 0, 0], '#f0ead8', '#262b30');
      door.add(plate);
      plate.position.set(0.17, 0.1, 0.027);
      for (const y of [T + 0.33, T - 0.01]) s.cylinder(0.018, 0.018, 0.07, [-0.4, y, cz + 0.24], steelDark, 10);
      // A lone support leg folds down under the front of the tray.
      for (const x of [-1, 1]) s.rod([x * 0.24, T - 0.05, 0.85], [x * 0.24, 0, 0.85], 0.014, steelDark);
      s.rod([-0.24, 0.3, 0.85], [0.24, 0.3, 0.85], 0.01, steelDark);
    } else if (a.support === 'trolley') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.rod([x * 0.26, T - 0.05, z * 0.8], [x * 0.26, 0.11, z * 0.8], 0.016, steelDark);
        s.cylinder(0.055, 0.055, 0.035, [x * 0.26, 0.055, z * 0.8 + (random() - 0.5) * 0.03], black, 14).rotation.z = Math.PI / 2;
      }
      s.box([0.56, 0.02, 1.64], [0, 0.26, 0], steel);
      for (const x of [-1, 1]) s.rod([x * 0.26, 0.27, -0.8], [x * 0.26, T - 0.06, 0.8], 0.01, steelDark);
      s.tube([[-0.26, T - 0.05, -0.82], [-0.26, T + 0.22, -1.12], [0.26, T + 0.22, -1.12], [0.26, T - 0.05, -0.82]], 0.014, steelDark);
    } else {
      const wood = s.material('#8a6f4d', { roughness: 0.85 });
      for (const z of [-0.65, 0.65]) {
        s.box([0.78, 0.045, 0.07], [0, T - 0.08, z], wood);
        for (const x of [-1, 1]) for (const d of [-1, 1]) s.rod([x * 0.3, T - 0.1, z], [x * 0.34, 0, z + d * 0.22], 0.018, wood);
        s.rod([-0.32, 0.3, z - 0.15], [0.32, 0.3, z - 0.15], 0.012, wood);
      }
    }

    // The sheet is a height field draped over whatever lies beneath.
    const big = a.large ? 1.28 : 1;
    const bumps: [number, number, number, number, number][] = [];
    const lying = a.shows === 'peak' || a.shows === 'face' || a.shows === 'hand';
    const present = a.shows !== 'empty';
    if (lying) {
      bumps.push([0, 0.8, 0.1, 0.11, 0.24], [0, 0.83, 0.03, 0.045, 0.31], [0, 0.5, 0.2, 0.17, 0.27 * big], [0, 0.56, 0.27, 0.07, 0.2], [0, 0.18, 0.2, 0.24, 0.22 * big * big]);
      bumps.push([-0.25, 0.22, 0.06, 0.3, 0.14 * big], [-0.2, -0.02, 0.06, 0.07, 0.17]);
      if (a.shows !== 'hand') bumps.push([0.25, 0.22, 0.06, 0.3, 0.14 * big], [0.2, -0.02, 0.06, 0.07, 0.17]);
    }
    if (present) for (const x of [-0.1, 0.1]) bumps.push([x, -0.2, 0.09 * big, 0.28, 0.17 * big], [x, -0.46, 0.07, 0.1, 0.17], [x, -0.66, 0.06, 0.2, 0.11]);
    if (a.shows === 'sitting') bumps.push([0, 0.08, 0.26, 0.16, 0.2]);
    if (!present) for (let i = 0; i < 7; i++) bumps.push([(random() - 0.5) * 0.4, -0.75 + random() * 0.8, 0.06 + random() * 0.1, 0.06 + random() * 0.12, 0.05 + random() * 0.09]);
    const p1 = random() * 6, p2 = random() * 6;
    const zFar = present ? -0.8 : -0.85, zNear = a.shows === 'face' ? 0.6 : a.shows === 'sitting' ? 0.3 : a.shows === 'empty' ? 0.15 : 1.0;
    const edge = W / 2 - 0.015;
    const sheetY = (x: number, z: number) => {
      let h = 0.012;
      for (const [cx, cz, rx, rz, height] of bumps) h = Math.max(h, height * Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2) * 0.9));
      h += (Math.sin(x * 31 + z * 9 + p1) + Math.sin(z * 23 - x * 12 + p2)) * 0.003 * (1 + mood.wear);
      const over = Math.abs(x) - edge;
      if (over > 0) h = Math.min(h, 0.06) - over * 2.2;
      return T + h;
    };
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const base = new THREE.Color(a.sheet === 'plain' ? '#bfc0bb' : '#d2d2cb').lerp(new THREE.Color('#d8cfae'), mood.wear * 0.45);
    ctx.fillStyle = `#${base.getHexString()}`;
    ctx.fillRect(0, 0, 256, 512);
    const blot = (x: number, y: number, r: number, colour: string, alpha: number) => {
      const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
      g.addColorStop(0, colour); g.addColorStop(0.75, colour); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    };
    if (a.sheet === 'pressed') {
      ctx.strokeStyle = 'rgba(120,130,140,0.22)'; ctx.lineWidth = 2;
      for (let y = 64; y < 512; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); }
      for (let x = 64; x < 256; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke(); }
    } else if (a.sheet === 'damp') {
      for (let i = 0; i < 9; i++) blot(random() * 256, random() * 512, 30 + random() * 50, '#8f9ba3', 0.5);
    } else if (a.sheet === 'blood') {
      blot(128 + (random() - 0.5) * 40, 150, 52, '#7a1a1e', 0.9);
      blot(128, 150, 26, '#4a0c10', 0.9);
      for (let i = 0; i < 5; i++) blot(100 + random() * 60, 120 + random() * 120, 6 + random() * 9, '#7a1a1e', 0.85);
    } else if (a.sheet === 'mud') {
      for (let i = 0; i < 14; i++) blot(random() * 256, random() * 512, 12 + random() * 36, random() < 0.3 ? '#55703a' : '#6b5134', 0.7);
      ctx.strokeStyle = 'rgba(90,66,40,0.7)'; ctx.lineWidth = 9;
      for (let i = 0; i < 4; i++) { const x = random() * 200, y = random() * 460; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 50, y + 40); ctx.stroke(); }
    } else if (a.sheet === 'green') {
      for (let i = 0; i < 8; i++) blot(random() * 256, random() * 512, 16 + random() * 34, '#6fe04a', 0.75);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sheetMat = new THREE.MeshStandardMaterial({ map: texture, color: '#c9c9c6', roughness: 1, side: THREE.DoubleSide });
    if (a.sheet === 'green') { sheetMat.emissive = new THREE.Color('#3cff2a'); sheetMat.emissiveMap = texture; sheetMat.emissiveIntensity = 0.35; }
    const hw = W / 2 + 0.05, nx = 26, nz = 84;
    const geo = new THREE.PlaneGeometry(1, 1, nx, nz);
    const pos = geo.attributes.position as THREE.BufferAttribute, uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i), v = uv.getY(i);
      const x = (u - 0.5) * 2 * hw, z = mix(zNear, zFar, v);
      pos.setXYZ(i, x, sheetY(x, z), z);
      uv.setXY(i, u, (z + 1) / 2);
    }
    geo.computeVertexNormals();
    s.mesh(geo, sheetMat);
    const plainSheet = new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.8), roughness: 0.92, side: THREE.DoubleSide });

    // Bare feet at the far end, and the tag.
    const tagGroup = new THREE.Group();
    if (present) {
      for (const x of [-0.1, 0.1]) {
        s.ball([0.048, 0.115, 0.04], [x, T + 0.125, -0.9], pale, 14).rotation.z = x * -1.2;
        for (let t = 0; t < 5; t++) s.ball([0.016 - t * 0.0018, 0.02, 0.016], [x - Math.sign(x) * (0.035 - t * 0.02), T + 0.245 - t * 0.012, -0.9], pale, 8);
        s.cylinder(0.04, 0.045, 0.14, [x, T + 0.05, -0.84], pale, 10).rotation.x = Math.PI / 2;
      }
      tagGroup.position.set(0.065, T + 0.23, -0.895);
    } else tagGroup.position.set(0.12, T + 0.02, 0.6);
    const tag = s.label(tagText, 0.2, 0.11, [0, 0, 0], '#2a2420', '#ead9a6');
    tagGroup.add(tag);
    if (present) { tag.position.set(0.17, -0.05, 0.01); tag.rotation.z = -0.35; }
    else { tag.rotation.set(-Math.PI / 2 + 0.05, 0, random() * 0.8); }
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, present ? 0.09 : 0.14, 5), s.material('#b3262c'));
    cord.rotation.z = Math.PI / 2 + (present ? 0.35 : 0); cord.position.set(present ? 0.04 : -0.16, present ? -0.01 : 0, 0);
    if (!present) cord.rotation.y = 0.3;
    tagGroup.add(cord);
    s.root.add(tagGroup);

    // The head end.
    let sitter: THREE.Group | null = null, arm: THREE.Group | null = null;
    if (a.shows === 'face') {
      const hair = s.material(['#2b2420', '#6a513a', '#b9b6ae', '#8a3d22'][Math.floor(random() * 4)], { roughness: 0.9 });
      const hy = T + 0.105;
      s.ball([0.085, 0.095, 0.11], [0, hy, 0.82], pale, 22);
      s.ball([0.09, 0.085, 0.085], [0, hy - 0.012, 0.87], hair, 18);
      s.ball([0.016, 0.03, 0.03], [0, hy + 0.1, 0.8], pale, 10);
      for (const x of [-1, 1]) {
        s.box([0.034, 0.004, 0.006], [x * 0.035, hy + 0.086, 0.83], black);
        s.box([0.04, 0.006, 0.008], [x * 0.035, hy + 0.088, 0.848], hair).rotation.y = x * 0.2;
        s.ball([0.012, 0.03, 0.02], [x * 0.086, hy, 0.82], pale, 8);
      }
      s.box([0.04, 0.004, 0.005], [0, hy + 0.082, 0.755], s.material('#8d7f86'));
      s.cylinder(0.045, 0.055, 0.1, [0, T + 0.07, 0.7], pale, 12).rotation.x = Math.PI / 2;
      s.ball([0.24 * big, 0.085, 0.09], [0, T + 0.06, 0.61], pale, 16);
      // The fold where the sheet was turned back.
      const pts: V3[] = [];
      for (let i = 0; i <= 10; i++) { const x = (i / 10 - 0.5) * 2 * hw; pts.push([x, sheetY(x, 0.59) + 0.012, 0.595]); }
      s.tube(pts, 0.022, plainSheet);
    } else if (a.shows === 'hand') {
      arm = new THREE.Group();
      arm.position.set(W / 2 - 0.03, T + 0.05, 0.22);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.036 * big, 0.03, 0.34, 10), pale);
      upper.position.set(0.05, -0.15, 0); upper.rotation.z = 0.3;
      const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), pale);
      palm.scale.set(0.04, 0.055, 0.018); palm.position.set(0.105, -0.35, 0);
      arm.add(upper, palm);
      for (let f = 0; f < 5; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.007, f === 4 ? 0.05 : 0.075, 6), pale);
        finger.position.set(0.075 + f * 0.018 + (f === 4 ? 0.015 : 0), f === 4 ? -0.36 : -0.425 + Math.abs(f - 1.5) * 0.008, (random() - 0.5) * 0.02);
        finger.rotation.set((random() - 0.3) * 0.5, 0, f === 4 ? -0.8 : (f - 1.5) * -0.06);
        arm.add(finger);
      }
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.03, 10), s.material('#e7e2cf'));
      band.position.set(0.085, -0.27, 0); band.rotation.z = 0.3;
      arm.add(band);
      arm.traverse((m) => { m.castShadow = true; });
      s.root.add(arm);
    } else if (a.shows === 'sitting') {
      sitter = new THREE.Group();
      sitter.position.set(0, T, 0.08);
      const w = big;
      const profile: [number, number][] = [[0, 0.86], [0.06, 0.85], [0.1, 0.8], [0.108, 0.74], [0.095, 0.68], [0.09, 0.64], [0.16 * w, 0.6], [0.25 * w, 0.54], [0.27 * w, 0.42], [0.26 * w, 0.2], [0.29 * w, 0.06], [0.33, 0.0]];
      const body = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 28), sheetMat);
      body.scale.set(1, 1, 0.66);
      const nosePeak = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), plainSheet);
      nosePeak.scale.set(0.025, 0.035, 0.03); nosePeak.position.set(0, 0.765, 0.068);
      sitter.add(body, nosePeak);
      for (const x of [-1, 1]) {
        const dent = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), s.material(base.clone().multiplyScalar(0.72), { roughness: 0.95 }));
        dent.scale.set(0.024, 0.02, 0.012); dent.position.set(x * 0.04, 0.795, 0.062);
        sitter.add(dent);
      }
      sitter.rotation.x = 0.06;
      sitter.traverse((m) => { m.castShadow = m.receiveShadow = true; });
      s.root.add(sitter);
    }

    // What was left on the sheet.
    const iz = a.shows === 'sitting' ? -0.3 : a.shows === 'empty' ? -0.3 : 0.3;
    const iy = sheetY(0, iz) + (a.shows === 'sitting' ? 0 : 0.005);
    if (a.rests === 'flowers') {
      const stem = s.material('#4f7a3c');
      const wilt = mood.wear > 0.6;
      const palette = wilt ? ['#8a6f4a', '#a08a5a'] : mood.cheer > 0.5 ? ['#f2c230', '#e9537a', '#f39a2e', '#ffffff'] : ['#f4f1e6', '#e8e2f2', '#c9b5d9'];
      for (let i = 0; i < 6; i++) {
        const x = (i - 2.5) * 0.035, zt = iz + 0.16 + random() * 0.05;
        s.rod([x * 0.3, iy + 0.012, iz - 0.14], [x, iy + 0.03 + random() * 0.03, zt], 0.005, stem);
        s.ball([0.034, 0.028, 0.034], [x, iy + 0.04 + random() * 0.03, zt + 0.01], s.material(palette[Math.floor(random() * palette.length)], { roughness: 0.6 }), 10);
      }
      s.box([0.05, 0.02, 0.05], [0, iy + 0.016, iz - 0.09], s.material('#f1ead8'));
    } else if (a.rests === 'clipboard') {
      const board = new THREE.Group();
      board.position.set(0.03, iy + 0.02, iz); board.rotation.set(-0.12, 0.3 + (random() - 0.5) * 0.5, 0);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.012, 0.33), s.material('#7a5a3a'));
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.03), steelDark);
      clip.position.set(0, 0.014, -0.15);
      board.add(back, clip);
      board.traverse((m) => { m.castShadow = true; });
      const page = s.label('CAUSE: ____', 0.21, 0.28, [0, 0, 0], '#39424a', '#f6f3e8');
      board.add(page);
      page.position.set(0, 0.008, 0.01); page.rotation.x = -Math.PI / 2;
      s.root.add(board);
    } else if (a.rests === 'ring') {
      const gold = s.material('#e8c34a', { metalness: 0.85, roughness: 0.25, emissive: '#6a4d0a', emissiveIntensity: 0.4 });
      const ring = s.ring(0.03, 0.007, [0, iy + 0.012, iz], gold);
      ring.rotation.x = Math.PI / 2 - 0.15;
      const bag = s.box([0.13, 0.006, 0.17], [0, iy + 0.02, iz], new THREE.MeshStandardMaterial({ color: '#e8f4f6', transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }));
      bag.castShadow = false;
      s.box([0.13, 0.01, 0.025], [0, iy + 0.016, iz - 0.09], s.material('#c9332f'));
    } else if (a.rests === 'effects') {
      const paper = s.material('#a8845a', { roughness: 0.95 });
      const bag = s.box([0.2, 0.24, 0.12], [0, iy + 0.11, iz], paper);
      bag.rotation.set(-0.12, (random() - 0.5) * 0.6, 0);
      const top = s.box([0.21, 0.05, 0.05], [0, iy + 0.245, iz - 0.02], paper);
      top.rotation.copy(bag.rotation);
      const text = s.label('EFFECTS', 0.16, 0.05, [0, iy + 0.12, iz + 0.064], '#2a2420', '#e6dcc0');
      text.rotation.copy(bag.rotation);
    } else if (a.rests === 'hat') {
      const felt = s.material(mood.cheer > 0.6 ? '#b0452e' : '#4a4640', { roughness: 0.9 });
      s.cylinder(0.17, 0.17, 0.012, [0, iy + 0.01, iz], felt, 24).rotation.x = -0.1;
      s.cylinder(0.085, 0.1, 0.1, [0, iy + 0.06, iz], felt, 20).rotation.x = -0.1;
      s.cylinder(0.102, 0.102, 0.025, [0, iy + 0.03, iz], black, 20).rotation.x = -0.1;
    }

    // Rust and grime on worn steel.
    const spots = Math.round(mood.wear * 16);
    const rust = s.material('#8a5a34', { roughness: 0.95 });
    for (let i = 0; i < spots; i++) s.ball([0.012 + random() * 0.02, 0.004, 0.012 + random() * 0.03], [(random() < 0.5 ? -1 : 1) * (W / 2 + 0.011), T - 0.005 + random() * 0.04, (random() - 0.5) * 2], rust, 6);

    const energy = mood.energy, phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        const t = time * mix(0.4, 2, energy) + phase;
        if (present) tagGroup.rotation.z = Math.sin(t * 1.3) * 0.12 * (0.2 + energy);
        if (sitter) { sitter.rotation.y = Math.sin(t * 0.5) * 0.35 * (0.2 + energy); sitter.rotation.x = 0.06 + Math.sin(t * 0.8) * 0.03 * energy; }
        if (arm) arm.rotation.x = Math.sin(t * 1.1) * 0.12 * (0.15 + energy) + Math.max(0, Math.sin(t * 3.3) - 0.9) * energy;
      },
    });
  },
});
// v4
