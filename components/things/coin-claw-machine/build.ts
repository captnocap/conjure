import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
function paint(width: number, height: number, draw: (c: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

type Part = { geo: THREE.BufferGeometry; at: [number, number, number]; scale?: [number, number, number]; turn?: [number, number, number]; colour?: string };
/** Merge parts into one tintable body and one fixed-colour set of details. Unit: about one prize, standing on y = 0. */
function prizeGeometry(parts: Part[]) {
  const main: THREE.BufferGeometry[] = [], accent: THREE.BufferGeometry[] = [];
  for (const part of parts) {
    const flat = part.geo.index ? part.geo.toNonIndexed() : part.geo;
    if (flat !== part.geo) part.geo.dispose();
    for (const name of Object.keys(flat.attributes)) if (!['position', 'normal', 'uv'].includes(name)) flat.deleteAttribute(name);
    flat.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...part.at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(part.turn ?? [0, 0, 0]))), new THREE.Vector3(...(part.scale ?? [1, 1, 1]))));
    if (part.colour) {
      const tint = new THREE.Color(part.colour), count = flat.attributes.position.count, colours = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) tint.toArray(colours, i * 3);
      flat.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      accent.push(flat);
    } else main.push(flat);
  }
  const merged = { main: mergeGeometries(main)!, accent: accent.length ? mergeGeometries(accent)! : null };
  for (const geo of [...main, ...accent]) geo.dispose();
  return merged;
}
const ball = (r: number, detail = 10) => new THREE.SphereGeometry(r, detail, Math.max(6, detail - 3));

const PRIZES = {
  bears: 'Plush teddy bears in sweet-shop colours.',
  ducks: 'Yellow rubber ducks, with the odd pink or blue one.',
  watches: 'Knock-off gold watches in little presentation boxes.',
  capsules: 'Plastic capsule balls, clear on top and coloured below.',
  aliens: 'Green plush aliens with antennae and big black eyes.',
  lonely: 'One lonely plush bear alone on the bare floor of the cabinet.',
} as const;
function prizeParts(kind: keyof typeof PRIZES): Part[] {
  if (kind === 'ducks') return [
    { geo: ball(0.06, 12), at: [0, 0.05, 0], scale: [1, 0.8, 1.25] },
    { geo: ball(0.04, 12), at: [0, 0.115, 0.045] },
    { geo: new THREE.ConeGeometry(0.03, 0.06, 8), at: [0, 0.075, -0.075], turn: [-1.1, 0, 0] },
    { geo: new THREE.ConeGeometry(0.02, 0.04, 6), at: [0, 0.108, 0.09], turn: [Math.PI / 2, 0, 0], scale: [1.3, 1, 0.6], colour: '#f0761c' },
    { geo: ball(0.007, 6), at: [0.02, 0.128, 0.075], colour: '#111111' }, { geo: ball(0.007, 6), at: [-0.02, 0.128, 0.075], colour: '#111111' },
  ];
  if (kind === 'watches') return [
    { geo: new THREE.BoxGeometry(0.13, 0.045, 0.1), at: [0, 0.0225, 0] },
    { geo: new THREE.BoxGeometry(0.13, 0.1, 0.012), at: [0, 0.09, -0.052], turn: [-0.2, 0, 0] },
    { geo: new THREE.BoxGeometry(0.115, 0.012, 0.085), at: [0, 0.048, 0], colour: '#f4f0e2' },
    { geo: new THREE.TorusGeometry(0.03, 0.009, 6, 14), at: [0, 0.07, 0], turn: [0.3, 0, 0], colour: '#e0b020' },
    { geo: new THREE.CylinderGeometry(0.024, 0.024, 0.014, 12), at: [0, 0.075, 0.026], turn: [Math.PI / 2 + 0.3, 0, 0], colour: '#fff6c8' },
  ];
  if (kind === 'capsules') return [
    { geo: new THREE.SphereGeometry(0.06, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), at: [0, 0.06, 0] },
    { geo: new THREE.SphereGeometry(0.06, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), at: [0, 0.06, 0], colour: '#f2f6f6' },
    { geo: new THREE.TorusGeometry(0.06, 0.005, 5, 14), at: [0, 0.06, 0], turn: [Math.PI / 2, 0, 0], colour: '#d0d6d8' },
  ];
  if (kind === 'aliens') return [
    { geo: ball(0.045, 10), at: [0, 0.045, 0], scale: [1, 1.05, 0.9] },
    { geo: ball(0.055, 12), at: [0, 0.125, 0], scale: [1.15, 0.9, 1] },
    { geo: new THREE.CylinderGeometry(0.005, 0.005, 0.05, 5), at: [0.025, 0.185, 0], turn: [0, 0, -0.3] }, { geo: new THREE.CylinderGeometry(0.005, 0.005, 0.05, 5), at: [-0.025, 0.185, 0], turn: [0, 0, 0.3] },
    { geo: ball(0.012, 6), at: [0.034, 0.212, 0] }, { geo: ball(0.012, 6), at: [-0.034, 0.212, 0] },
    { geo: ball(0.015, 6), at: [0.055, 0.05, 0.01], scale: [1.6, 0.8, 0.8] }, { geo: ball(0.015, 6), at: [-0.055, 0.05, 0.01], scale: [1.6, 0.8, 0.8] },
    { geo: ball(0.02, 8), at: [0.026, 0.13, 0.046], scale: [0.9, 1.2, 0.5], turn: [0, 0, 0.4], colour: '#0c0c10' }, { geo: ball(0.02, 8), at: [-0.026, 0.13, 0.046], scale: [0.9, 1.2, 0.5], turn: [0, 0, -0.4], colour: '#0c0c10' },
  ];
  return [
    { geo: ball(0.05, 10), at: [0, 0.055, 0], scale: [1, 1.1, 0.9] },
    { geo: ball(0.042, 12), at: [0, 0.14, 0.005] },
    { geo: ball(0.017, 8), at: [0.034, 0.178, 0], scale: [1, 1, 0.5] }, { geo: ball(0.017, 8), at: [-0.034, 0.178, 0], scale: [1, 1, 0.5] },
    { geo: ball(0.02, 8), at: [0.052, 0.085, 0.02], scale: [1, 1.6, 1], turn: [0, 0, -0.7] }, { geo: ball(0.02, 8), at: [-0.052, 0.085, 0.02], scale: [1, 1.6, 1], turn: [0, 0, 0.7] },
    { geo: ball(0.022, 8), at: [0.03, 0.02, 0.04], scale: [1, 1, 1.5] }, { geo: ball(0.022, 8), at: [-0.03, 0.02, 0.04], scale: [1, 1, 1.5] },
    { geo: ball(0.018, 8), at: [0, 0.13, 0.04], colour: '#f6ead0' },
    { geo: ball(0.006, 6), at: [0, 0.136, 0.057], colour: '#151515' }, { geo: ball(0.006, 6), at: [0.016, 0.152, 0.036], colour: '#151515' }, { geo: ball(0.006, 6), at: [-0.016, 0.152, 0.036], colour: '#151515' },
  ];
}
const PRIZE_TINTS: Record<keyof typeof PRIZES, string[]> = {
  bears: ['#c98a4a', '#f29ab8', '#8ac4f2', '#f4e9d0', '#b58af2', '#f2d24a', '#8a5a34'],
  ducks: ['#f6cc1e', '#f6cc1e', '#f6cc1e', '#f6cc1e', '#ff8ab0', '#6ac0f2'],
  watches: ['#16161c', '#1c2a5a', '#6a1420', '#16161c'],
  capsules: ['#e02a3a', '#1f8fe8', '#f2c12e', '#2fa86a', '#ff5a9a', '#7a35c2', '#f0761c'],
  aliens: ['#6fd62a', '#6fd62a', '#3fc86a', '#a6e03a'],
  lonely: ['#c98a4a'],
};

const CABINETS = {
  red: ['#c8202c', '#f2c12e'], blue: ['#1f4fb0', '#f4f1e6'], yellow: ['#f2b81e', '#d8263c'], candy: ['#ff5a9a', '#2ee6d6'], black: ['#1b1b22', '#8a6cff'], wood: ['#6b4526', '#e0a81e'],
} as const;
const MARQUEES = { skill: 'SKILL CRANE', toys: 'TOY CHEST', win: 'WIN A PRIZE', lucky: 'LUCKY GRAB', grab: 'GRAB-IT', treasure: 'TREASURE' } as const;

export default defineThing({
  questions: {
    prize: choice('What is the machine filled with?', PRIZES),
    fill: score('If it holds many prizes, how full is it?', ['A sad handful on the floor', 'A low layer', 'A good heap', 'Heaped against the glass to the top']),
    claw: choice('What is the claw doing right now?', {
      parked: 'Parked at home in the corner over the chute, jaws relaxed.',
      dropping: 'Mid-drop over the heap, cable paid out, jaws wide open.',
      holding: 'Carrying a prize up and away, jaws clamped round it.',
      slipping: 'A prize dangling by one edge from a single prong, about to fall.',
      empty: 'Rising from the heap with closed jaws and nothing in them.',
    }),
    cabinet: choice('What colour is the cabinet?', {
      red: 'Fire-engine red with yellow trim.',
      blue: 'Royal blue with white trim.',
      yellow: 'Taxi yellow with red trim.',
      candy: 'Bubblegum pink and turquoise.',
      black: 'Black with purple neon edges.',
      wood: 'Wood-grain vinyl with mustard trim, a 1970s survivor.',
    }),
    marquee: choice('What does the lit header say?', {
      skill: 'SKILL CRANE', toys: 'TOY CHEST', win: 'WIN A PRIZE', lucky: 'LUCKY GRAB', grab: 'GRAB-IT', treasure: 'TREASURE',
    }),
    topper: choice('What is on top of the machine?', {
      nothing: 'Nothing.',
      beacon: 'A red rotating beacon that lights when somebody wins.',
      mascot: 'One giant plush prize strapped on top as bait.',
      boxes: 'A stack of dusty cardboard restock boxes.',
    }),
    note: noul('Is there a handwritten OUT OF ORDER note taped to the glass?'),
    stuck: noul('Is a prize wedged half out of the prize door?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.82, D = 0.8, BODY = 0.84, FLOOR = 0.93, GLASS = 1.64, H = 1.94;
    const [bodyColour, accentColour] = CABINETS[a.cabinet];
    const glow = mix(0.5, 1.3, mood.cheer);
    const accent = s.material(accentColour, { roughness: 0.4, emissive: a.cabinet === 'black' ? accentColour : '#000000', emissiveIntensity: a.cabinet === 'black' ? glow : 0 });
    const chrome = s.material('#d5dadc', { metalness: 0.9, roughness: 0.2 });
    const dark = s.material('#17171a', { roughness: 0.7 });
    const pickTint = () => PRIZE_TINTS[a.prize][Math.floor(random() * PRIZE_TINTS[a.prize].length)];

    // ---- lower body with painted front and sides
    const art = (front: boolean) => paint(256, 256, (c, w, h) => {
      c.fillStyle = bodyColour; c.fillRect(0, 0, w, h);
      if (a.cabinet === 'wood') for (let i = 0; i < 70; i++) { c.strokeStyle = `rgba(30,14,4,${0.15 + random() * 0.3})`; c.lineWidth = 0.6 + random() * 2; const x = random() * w; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + (random() - 0.5) * 18, h * 0.3, x + (random() - 0.5) * 18, h * 0.7, x, h); c.stroke(); }
      c.fillStyle = accentColour;
      if (front) {
        c.save(); c.translate(w / 2, 64); for (let i = 0; i < 14; i++) { c.rotate(6.283 / 14); c.beginPath(); c.moveTo(0, 0); c.lineTo(-10, -60); c.lineTo(10, -60); c.fill(); } c.restore();
        c.fillStyle = bodyColour; c.beginPath(); c.arc(w / 2, 64, 36, 0, 7); c.fill();
        c.fillStyle = '#ffffff'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(['50¢', '25¢', '$1'][Math.floor(random() * 3)], w / 2, 66);
        c.fillStyle = accentColour; c.fillRect(0, h - 22, w, 10);
      } else {
        for (let i = -2; i < 6; i++) { c.beginPath(); c.moveTo(i * 60, h); c.lineTo(i * 60 + 26, h); c.lineTo(i * 60 + 126, 0); c.lineTo(i * 60 + 100, 0); c.fill(); }
        c.fillStyle = bodyColour; c.fillRect(0, 0, w, 40); c.fillRect(0, h - 40, w, 40);
      }
      for (let i = 0; i < 40 * mood.wear; i++) { c.fillStyle = 'rgba(30,30,30,0.3)'; c.fillRect(random() * w, h - random() * 80, 2 + random() * 14, 1 + random() * 3); }
    });
    const frontMat = new THREE.MeshStandardMaterial({ map: art(true), roughness: 0.45 });
    const sideMat = new THREE.MeshStandardMaterial({ map: art(false), roughness: 0.45 });
    const plain = s.material(bodyColour, { roughness: 0.45 });
    s.mesh(new THREE.BoxGeometry(W, BODY - 0.06, D), [sideMat, sideMat, plain, plain, frontMat, plain] as unknown as THREE.Material, [0, (BODY + 0.06) / 2, 0]);
    s.box([W - 0.04, 0.06, D - 0.04], [0, 0.03, 0], dark);
    // control deck jutting forward
    const deck = s.box([W, 0.1, 0.2], [0, BODY + 0.02, D / 2 + 0.06], plain); deck.rotation.x = 0.28;
    s.box([W + 0.02, 0.09, D + 0.02], [0, FLOOR - 0.045, 0], accent);
    const stick = new THREE.Group(); stick.position.set(-0.14, BODY + 0.075, D / 2 + 0.08); s.root.add(stick);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 8), chrome); shaft.position.y = 0.045; shaft.castShadow = true;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 10), s.material('#d8202c', { roughness: 0.25 })); knob.position.y = 0.1; knob.castShadow = true;
    stick.add(shaft, knob); stick.rotation.set(0.28, 0, 0.2);
    s.cylinder(0.035, 0.04, 0.012, [-0.14, BODY + 0.062, D / 2 + 0.085], dark, 14).rotation.x = 0.28;
    const button = s.cylinder(0.03, 0.03, 0.025, [0.1, BODY + 0.07, D / 2 + 0.085], new THREE.MeshStandardMaterial({ color: '#ffe14a', emissive: '#ffc400', emissiveIntensity: glow }), 14); button.rotation.x = 0.28;
    s.label('DROP', 0.1, 0.03, [0.1, BODY + 0.052, D / 2 + 0.15], '#ffffff', '#17171a').rotation.x = -Math.PI / 2 + 0.28;
    // coin mechanism and prize door
    s.box([0.15, 0.24, 0.02], [0.22, 0.48, D / 2 + 0.01], s.material('#9aa0a4', { metalness: 0.8, roughness: 0.35 }));
    s.box([0.008, 0.045, 0.006], [0.22, 0.54, D / 2 + 0.022], dark);
    s.box([0.07, 0.03, 0.006], [0.22, 0.46, D / 2 + 0.022], new THREE.MeshStandardMaterial({ color: '#ff3a2a', emissive: '#ff2a1a', emissiveIntensity: glow }));
    s.box([0.06, 0.05, 0.012], [0.22, 0.39, D / 2 + 0.022], dark);
    const doorX = -0.2, doorY = 0.3;
    s.box([0.3, 0.24, 0.02], [doorX, doorY, D / 2 + 0.006], accent);
    s.box([0.25, 0.19, 0.02], [doorX, doorY, D / 2 + 0.01], dark);
    s.label('PRIZE', 0.16, 0.04, [doorX, doorY + 0.15, D / 2 + 0.012], '#ffffff', bodyColour === '#f2b81e' ? '#d8263c' : '#17171a');

    // ---- the glass box
    const litColour = new THREE.Color().setHSL(mix(0.55, 0.11, mood.warmth), 0.5, 0.86);
    s.box([W - 0.04, 0.01, D - 0.04], [0, FLOOR + 0.005, 0], s.material('#e9eef0', { roughness: 0.6 }));
    const backMap = paint(128, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f6fbff'); g.addColorStop(1, a.cabinet === 'black' ? '#6a5ad0' : '#a9d4ea'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 14; i++) { c.beginPath(); const x = random() * w, y = random() * h; for (let k = 0; k < 8; k++) { const r = k % 2 ? 2 : 6, t = k / 8 * 6.283; c.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); } c.fill(); } });
    s.mesh(new THREE.PlaneGeometry(W - 0.06, GLASS - FLOOR), new THREE.MeshStandardMaterial({ map: backMap, emissive: litColour, emissiveMap: backMap, emissiveIntensity: 0.35 * glow, roughness: 0.6 }), [0, (GLASS + FLOOR) / 2, -D / 2 + 0.03]);
    s.box([W, GLASS - FLOOR, 0.02], [0, (GLASS + FLOOR) / 2, -D / 2 + 0.015], plain);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.04, GLASS - FLOOR, 0.04], [x * (W / 2 - 0.02), (GLASS + FLOOR) / 2, z * (D / 2 - 0.02)], z > 0 ? chrome : plain);
    const glass = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#e4f4f8').lerp(new THREE.Color('#b9b29a'), mood.wear * 0.6), transparent: true, opacity: mix(0.1, 0.22, mood.wear), roughness: 0.05, depthWrite: false });
    s.box([W - 0.08, GLASS - FLOOR, 0.006], [0, (GLASS + FLOOR) / 2, D / 2 - 0.02], glass).castShadow = false;
    for (const x of [-1, 1]) s.box([0.006, GLASS - FLOOR, D - 0.08], [x * (W / 2 - 0.02), (GLASS + FLOOR) / 2, 0], glass).castShadow = false;
    s.box([W - 0.1, 0.02, D - 0.1], [0, GLASS - 0.012, 0], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: litColour, emissiveIntensity: 1.1 * glow }));
    // chute: a clear well in the front-left corner
    const chuteX = -W / 2 + 0.16, chuteZ = D / 2 - 0.16;
    const well = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
    s.mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.24, 4, 1, true), well, [chuteX, FLOOR + 0.12, chuteZ]).rotation.y = Math.PI / 4;
    s.box([0.19, 0.012, 0.19], [chuteX, FLOOR + 0.012, chuteZ], dark);

    // ---- prizes, heaped by dropping each onto a coarse height field
    const geo = prizeGeometry(prizeParts(a.prize));
    const prizeScale = a.prize === 'watches' ? 1.0 : a.prize === 'capsules' ? 0.95 : 1.05;
    const total = a.prize === 'lonely' ? 1 : Math.round(mix(5, 85, a.fill ** 1.2) * mix(0.8, 1.2, mood.density));
    const mainMat = s.material('#ffffff', { roughness: a.prize === 'capsules' || a.prize === 'ducks' ? 0.3 : 0.95 });
    const accentMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: a.prize === 'watches' ? 0.5 : 0 });
    const N = 5, cell = (W - 0.14) / N, field = new Float32Array(N * N);
    const matrices: THREE.Matrix4[] = [], tints: string[] = [];
    let heapTop = FLOOR;
    for (let i = 0; i < total; i++) {
      let cx = 0, cz = 0, tries = 0;
      let best = 9;
      for (tries = 0; tries < 4; tries++) {
        let tx = Math.floor(random() * N); const tzc = Math.floor(random() * N);
        if (tx < 2 && tzc > N - 3) tx = N - 1 - tx;
        // prizes drift toward the back and away from the chute
        const level = field[tzc * N + tx] + tzc * 0.012;
        if (level < best) { best = level; cx = tx; cz = tzc; }
      }
      if (a.prize === 'lonely') { cx = 3; cz = 2; }
      if (field[cz * N + cx] > GLASS - FLOOR - 0.3) continue;
      const size = prizeScale * mix(0.85, 1.2, random());
      const y = FLOOR + 0.01 + field[cz * N + cx];
      field[cz * N + cx] += 0.075 * size;
      const upright = a.prize === 'lonely' || a.prize === 'watches' ? 0.15 : 1.3;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((random() - 0.5) * upright, random() * 6.283, (random() - 0.5) * upright));
      const p = new THREE.Vector3(-(W - 0.14) / 2 + (cx + 0.5 + (random() - 0.5) * 0.45) * cell, y + (upright > 1 ? 0.03 : 0), -(D - 0.14) / 2 + (cz + 0.5 + (random() - 0.5) * 0.45) * ((D - 0.14) / N));
      if (a.prize === 'lonely') q.setFromEuler(new THREE.Euler(0, 0.3, 0));
      matrices.push(new THREE.Matrix4().compose(p, q, new THREE.Vector3(size, size, size)));
      tints.push(pickTint());
      heapTop = Math.max(heapTop, y + 0.15 * size);
    }
    const heap = (geometry: THREE.BufferGeometry, material: THREE.Material, coloured: boolean) => {
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((m, i) => { mesh.setMatrixAt(i, m); if (coloured) mesh.setColorAt(i, new THREE.Color(tints[i])); });
      mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
      s.root.add(mesh);
    };
    heap(geo.main, mainMat, true);
    if (geo.accent) heap(geo.accent, accentMat, false);
    const single = (tint: string, size = 1) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(geo.main, s.material(tint, { roughness: mainMat.roughness })); body.castShadow = true; g.add(body);
      if (geo.accent) { const detail = new THREE.Mesh(geo.accent, accentMat); detail.castShadow = true; g.add(detail); }
      g.scale.setScalar(size);
      return g;
    };

    // ---- gantry and claw
    const railY = GLASS - 0.06;
    for (const x of [-1, 1]) s.box([0.025, 0.025, D - 0.1], [x * (W / 2 - 0.07), railY, 0], chrome);
    const state = a.claw;
    const home = state === 'parked';
    const cx = home ? chuteX + 0.02 : state === 'dropping' ? mix(-0.05, 0.2, random()) : mix(-0.1, 0.18, random());
    const cz = home ? chuteZ - 0.02 : mix(-0.2, 0.08, random());
    s.box([W - 0.14, 0.03, 0.035], [0, railY, cz], chrome);
    s.box([0.1, 0.06, 0.09], [cx, railY - 0.01, cz], s.material(accentColour, { roughness: 0.4 }));
    const maxDrop = railY - 0.04 - (heapTop + 0.3);
    const drop = state === 'dropping' ? Math.max(0.1, maxDrop + 0.05) : state === 'empty' ? Math.max(0.08, maxDrop * 0.55) : state === 'parked' ? 0.08 : Math.min(0.16, Math.max(0.08, maxDrop * 0.4));
    const open = state === 'dropping' ? 1 : state === 'parked' ? 0.45 : state === 'holding' ? 0.5 : 0.08;
    const hang = new THREE.Group(); hang.position.set(cx, railY - 0.04, cz); s.root.add(hang);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, drop, 6), dark); cable.position.y = -drop / 2; hang.add(cable);
    const claw = new THREE.Group(); claw.position.y = -drop; claw.scale.setScalar(1.5); hang.add(claw);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.06, 12), chrome); hub.position.y = -0.03; hub.castShadow = true; claw.add(hub);
    for (let k = 0; k < 3; k++) {
      const finger = new THREE.Group(); finger.rotation.y = k / 3 * 6.283 + 0.5; finger.position.y = -0.05; claw.add(finger);
      const r1 = 0.045 + 0.05 * open, r2 = 0.012 + 0.08 * open;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.015, 0, 0), new THREE.Vector3(r1, -0.06, 0), new THREE.Vector3(r1 + 0.008, -0.11, 0), new THREE.Vector3(r2, -0.17, 0)]);
      const prong = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.0065, 6), chrome); prong.castShadow = true; finger.add(prong);
    }
    if (state === 'holding') { const prize = single(pickTint(), prizeScale / 1.5); prize.position.y = -0.2; prize.rotation.set(0.2, random() * 6, 0.15); claw.add(prize); }
    if (state === 'slipping') { const prize = single(pickTint(), prizeScale / 1.5); prize.position.set(0.03, -0.25, 0.02); prize.rotation.set(0.5, random() * 6, 2.3); claw.add(prize); }

    if (a.stuck) { const prize = single(pickTint(), 1.25); prize.position.set(doorX + 0.02, doorY - 0.07, D / 2 + 0.05); prize.rotation.set(1.0, 0.3, 0.4); s.root.add(prize); }

    // ---- marquee
    const dead = mood.wear > 0.85;
    const marqueeMap = paint(512, 160, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, accentColour); g.addColorStop(1, bodyColour); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 22; i++) { const x = (i + 0.5) * w / 22; for (const y of [10, h - 10]) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); } }
      c.font = 'bold 76px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 12; c.strokeStyle = '#17171a'; c.strokeText(MARQUEES[a.marquee], w / 2, h / 2 + 4, w - 40);
      c.fillStyle = '#ffffff'; c.fillText(MARQUEES[a.marquee], w / 2, h / 2 + 4, w - 40);
    });
    const marqueeMat = new THREE.MeshStandardMaterial({ map: marqueeMap, emissive: '#ffffff', emissiveMap: marqueeMap, emissiveIntensity: dead ? 0.05 : 0.75 * glow, roughness: 0.4 });
    s.mesh(new THREE.BoxGeometry(W + 0.04, H - GLASS, D + 0.04), [plain, plain, plain, plain, marqueeMat, plain] as unknown as THREE.Material, [0, (H + GLASS) / 2, 0]);
    s.box([W + 0.06, 0.02, D + 0.06], [0, GLASS + 0.01, 0], accent);
    s.box([W + 0.06, 0.02, D + 0.06], [0, H - 0.01, 0], accent);

    // ---- on top
    let beacon: THREE.MeshStandardMaterial | null = null;
    if (a.topper === 'beacon') {
      s.cylinder(0.07, 0.08, 0.04, [0, H + 0.02, 0], dark, 16);
      beacon = new THREE.MeshStandardMaterial({ color: '#ff3020', emissive: '#ff2010', emissiveIntensity: 1.2, roughness: 0.2, transparent: true, opacity: 0.9 });
      s.cylinder(0.06, 0.06, 0.1, [0, H + 0.09, 0], beacon, 16);
      s.ball([0.06, 0.04, 0.06], [0, H + 0.14, 0], beacon, 14);
    } else if (a.topper === 'mascot') {
      const big = single(pickTint(), 3.4); big.position.set(0, H, 0.05); big.rotation.y = (random() - 0.5) * 0.6; s.root.add(big);
      s.box([0.02, 0.012, D + 0.07], [0, H + 0.18, 0], s.material('#f2c12e'));
    } else if (a.topper === 'boxes') {
      const card = s.material('#b8925a', { roughness: 0.95 });
      let y = H;
      for (let i = 0; i < 1 + Math.floor(random() * 3); i++) { const bw = mix(0.3, 0.46, random()), bh = mix(0.1, 0.18, random()); const box = s.box([bw, bh, bw * 0.8], [(random() - 0.5) * 0.12, y + bh / 2, (random() - 0.5) * 0.1], card); box.rotation.y = (random() - 0.5) * 0.5; s.box([bw * 0.2, 0.004, bw * 0.81], [box.position.x, y + bh, box.position.z], s.material('#e8d9a8')).rotation.y = box.rotation.y; y += bh; }
    }

    if (a.note) {
      const note = s.label('OUT OF ORDER', 0.3, 0.13, [0.1, FLOOR + 0.4, D / 2 - 0.012], '#b01818', '#fbf7e6'); note.rotation.z = (random() - 0.5) * 0.25;
      for (const x of [-0.13, 0.13]) s.box([0.05, 0.022, 0.002], [0.1 + x, FLOOR + 0.462, D / 2 - 0.01], s.material('#e8d9a8', { transparent: true, opacity: 0.85 })).rotation.z = note.rotation.z;
    }

    const energy = mood.energy, running = !a.note;
    return s.finish({
      update(_dt, time) {
        const sway = running ? 0.03 + 0.12 * energy : 0.01;
        hang.rotation.z = Math.sin(time * 2.6) * sway * (state === 'parked' ? 0.3 : 1);
        hang.rotation.x = Math.cos(time * 2.1) * sway * 0.6 * (state === 'parked' ? 0.3 : 1);
        if (beacon) beacon.emissiveIntensity = 0.5 + 1.2 * Math.max(0, Math.sin(time * 6 * (0.4 + energy)));
        if (!dead) marqueeMat.emissiveIntensity = 0.75 * glow * (1 - 0.15 * energy * (Math.sin(time * 9) > 0.6 ? 1 : 0));
      },
    });
  },
});
