import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];

/** A canvas-painted texture: no fonts, images or network. */
function paint(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const PAINTS = {
  green: { top: '#e9e2c8', bottom: '#3f6b4c', line: '#2a2a2c' },
  brown: { top: '#e6dcc0', bottom: '#6b4a32', line: '#2a2a2c' },
  blue: { top: '#eceee8', bottom: '#4c6f94', line: '#3a3f46' },
  yellow: { top: '#efe3a8', bottom: '#6e7276', line: '#2a2a2c' },
} as const;
const BISCUITS = {
  round: { colour: '#d0a05a', shape: 'round', rows: 4 },
  chocolate: { colour: '#4a2a16', shape: 'round', rows: 4 },
  creams: { colour: '#d9b070', shape: 'oblong', rows: 3 },
  wafers: { colour: '#e8a0b0', shape: 'oblong', rows: 3 },
} as const;
const CLOCK: Record<string, [number, number]> = { morning: [10, 20], tea: [10, 45], end: [16, 55], night: [2, 10] };

export default defineWorld({
  questions: {
    paint: choice('How is the hall painted?', {
      green: 'Cream brick above a bottle-green dado, the classic works colours.',
      brown: 'Cream above a chocolate-brown dado.',
      blue: 'White above a hospital blue dado, scrubbed and bright.',
      yellow: 'Faded yellow above grey, nicotine-coloured.',
    }),
    floor: choice('What is the floor?', {
      oxide: 'Red-oxide painted concrete with yellow walkway lines.',
      concrete: 'Bare grey concrete, dusted with flour.',
      tiles: 'Dark red quarry tiles.',
    }),
    biscuits: choice('What is on the belt?', {
      round: 'Plain golden rounds in four tidy rows.',
      chocolate: 'Chocolate-coated rounds, dark and glossy.',
      creams: 'Oblong custard creams in three rows.',
      wafers: 'Pink wafers in three rows.',
    }),
    shift: choice('Where in the shift is it?', {
      morning: 'Mid-morning: the belt running, every station busy.',
      tea: 'Tea break: the belt stopped, mugs on the stations, the hall half empty.',
      end: 'Five to five: the last biscuits running off, pallets stacked high, crumbs everywhere.',
      night: 'Night shift: the roller door shut, the hall lit only by the fluorescent strips.',
    }),
    sign: choice('What does the painted sign on the back wall say?', {
      eating: 'NO EATING ON THE LINE',
      hands: 'WASH YOUR HANDS',
      target: 'TARGET 12,000 CASES',
      safety: 'DAYS WITHOUT ACCIDENT: 3',
      union: 'UNION MEETING FRIDAY 5PM',
    }),
    pallets: score('How many pallets of finished cartons wait by the roller door?', ['One, just started', 'Three or four', 'A wall of them, waiting for the lorry']),
    door: noul('Is the roller door open to the yard?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const night = a.shift === 'night';
    const scheme = PAINTS[a.paint];
    const floorColour = { oxide: '#8a4a3c', concrete: '#9d9b92', tiles: '#7a3f34' }[a.floor];
    const { art: s, world } = diorama(context, {
      background: night ? '#8e909c' : '#dfe0d4', floor: floorColour, width: 13, depth: 12, maxHeight: 3.2, radius: 1.6, pitch: 34, yaw: 24, scale: [0.8, 1.35],
      viewBox: [[-6.5, 0, -6], [6.5, 4.6, 4.2]],
      slots: [[0.1, 1.5], [-5.4, 0.8], [5.4, 0.8], [4.5, -4.6], [-3.3, 2.2], [3.3, 2.2], [-5.2, 3.6, 0, 0.85]],
    });
    if (night) {
      if (world.keyLight) { world.keyLight.intensity *= 0.45; world.keyLight.color.lerp(new THREE.Color('#9fb4d8'), 0.4); }
      world.object.traverse((node) => { const light = node as THREE.HemisphereLight; if (light.isHemisphereLight) { light.intensity *= 0.7; light.color.set('#cfd6e8'); } });
    }
    const ground = world.ground as THREE.Mesh;
    (ground.material as THREE.MeshStandardMaterial).roughness = a.floor === 'tiles' ? 0.5 : 0.95;
    const steel = s.material('#8e9497', { metalness: 0.65, roughness: 0.4 });
    const dark = s.material('#2a2c2e', { roughness: 0.85 });
    const yellow = s.material('#e0b020', { roughness: 0.7 });
    const black = s.material('#1d1d1f', { roughness: 0.8 });

    // ---- floor dressing: walkway lines or tile joints, crumbs late in the day.
    if (a.floor === 'oxide') {
      for (const z of [3.3, -2.6]) s.box([12, 0.006, 0.08], [0, 0.004, z], yellow);
      s.box([0.08, 0.006, 11], [5.0, 0.004, 0], yellow);
    }
    if (a.floor === 'tiles') {
      const joints = s.scatter(new THREE.BoxGeometry(13, 0.004, 0.015), s.material('#4a2a24', { roughness: 1 }), Array.from({ length: 39 }, (_u, i) => ({ at: [0, 0.003, -5.7 + i * 0.3] as P, size: 1 })));
      joints.castShadow = false;
      const joints2 = s.scatter(new THREE.BoxGeometry(0.015, 0.004, 12), s.material('#4a2a24', { roughness: 1 }), Array.from({ length: 44 }, (_u, i) => ({ at: [-6.45 + i * 0.3, 0.003, 0] as P, size: 1 })));
      joints2.castShadow = false;
    }
    if (a.shift === 'end' || mood.wear > 0.5) {
      const crumbs = s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#c9a06a', { roughness: 1 }), Array.from({ length: Math.round(mix(20, 70, Math.max(mood.wear, a.shift === 'end' ? 0.8 : 0))) }, () => ({ at: [(random() - 0.5) * 14, 0.01, -1.5 + random() * 4] as P, size: 0.012 + random() * 0.014 })));
      crumbs.castShadow = false;
    }

    // ---- the back wall: painted brick with a dado line, the side wall on the far right.
    const wallH = 5.2, dado = 1.5;
    const brick = paint(2048, 680, (c) => {
      c.fillStyle = scheme.top;
      c.fillRect(0, 0, 2048, 680);
      c.fillStyle = scheme.bottom;
      c.fillRect(0, 680 * (1 - dado / wallH), 2048, 680 * dado / wallH);
      c.strokeStyle = 'rgba(0,0,0,0.13)';
      c.lineWidth = 1.2;
      const course = 680 / 69;
      for (let r = 0; r < 69; r++) {
        const y = r * course;
        c.beginPath(); c.moveTo(0, y); c.lineTo(2048, y); c.stroke();
        for (let b = 0; b < 72; b++) { const x = b * (2048 / 71) + (r % 2 ? 2048 / 142 : 0); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + course); c.stroke(); }
      }
      c.fillStyle = scheme.line;
      c.fillRect(0, 680 * (1 - dado / wallH) - 5, 2048, 8);
      // Grime rising from the floor as the place wears.
      const grime = c.createLinearGradient(0, 680, 0, 680 * 0.7);
      grime.addColorStop(0, `rgba(30,25,20,${0.35 * mood.wear})`);
      grime.addColorStop(1, 'rgba(30,25,20,0)');
      c.fillStyle = grime;
      c.fillRect(0, 0, 2048, 680);
    });
    const wallPaint = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.95 });
    const back = s.box([13, wallH, 0.3], [0, wallH / 2, -6.1], wallPaint);
    void back;
    const sidePaint = new THREE.MeshStandardMaterial({ map: brick.clone(), roughness: 0.95 });
    sidePaint.map!.repeat.set(0.75, 1);
    sidePaint.map!.wrapS = THREE.RepeatWrapping;
    sidePaint.map!.needsUpdate = true;
    const side = s.box([0.3, wallH, 12], [-6.6, wallH / 2, 0], sidePaint);
    void side;
    // High windows on the side wall, wired glass, daylight behind unless it is night.
    const glass = new THREE.MeshStandardMaterial({ color: night ? '#3a3f52' : '#dfe8ec', emissive: night ? '#1a1c28' : '#c8d4d8', emissiveIntensity: night ? 0.3 : mix(0.4, 0.9, 1 - Math.abs(mood.daylight - 0.5) * 2), roughness: 0.3 });
    for (let i = 0; i < 4; i++) {
      s.box([0.05, 1.3, 2.0], [-6.43, 3.9, -4.2 + i * 2.6], glass).castShadow = false;
      s.box([0.06, 1.4, 0.06], [-6.42, 3.9, -4.2 + i * 2.6], dark);
      s.box([0.06, 0.06, 2.1], [-6.42, 3.9, -4.2 + i * 2.6], dark);
    }

    // ---- the roller door at the right of the back wall, the pallets in front of it.
    const doorX = -4.6, doorW = 3.0, doorH = 3.1;
    s.box([doorW + 0.3, 0.25, 0.4], [doorX, doorH + 0.12, -5.85], dark);
    for (const x of [doorX - doorW / 2 - 0.1, doorX + doorW / 2 + 0.1]) s.box([0.12, doorH, 0.3], [x, doorH / 2, -5.9], dark);
    if (a.door && !night) {
      // Rolled up: a bright yard beyond, a slice of daylight on the floor.
      s.box([doorW, doorH, 0.02], [doorX, doorH / 2, -6.0], new THREE.MeshStandardMaterial({ color: '#f1efe2', emissive: '#fff6dc', emissiveIntensity: mix(0.6, 1.4, 1 - Math.abs(mood.daylight - 0.5) * 2), roughness: 1 })).castShadow = false;
      s.box([doorW, 0.35, 0.3], [doorX, doorH - 0.17, -5.85], s.material('#a9adb0', { metalness: 0.5, roughness: 0.5 }));
      const spill = s.box([doorW, 0.004, 2.4], [doorX, 0.006, -4.7], new THREE.MeshStandardMaterial({ color: '#f4f0dc', transparent: true, opacity: 0.22, depthWrite: false, roughness: 1 }));
      spill.castShadow = false;
    } else {
      const slats = s.scatter(new THREE.BoxGeometry(doorW, 0.19, 0.06), s.material(night ? '#7a7e82' : '#a9adb0', { metalness: 0.5, roughness: 0.5 }), Array.from({ length: Math.round(doorH / 0.2) }, (_u, i) => ({ at: [doorX, 0.1 + i * 0.2, -5.93] as P, size: 1 })));
      void slats;
    }
    const palletCount = 1 + Math.round(a.pallets * 5) + (a.shift === 'end' ? 2 : 0);
    const slat = new THREE.BoxGeometry(0.1, 0.02, 1.0), bearer = new THREE.BoxGeometry(1.2, 0.09, 0.1);
    const palletWood = s.material(new THREE.Color('#b08a5a').lerp(new THREE.Color('#6a5a4a'), mood.wear * 0.5), { roughness: 1 });
    const slats: { at: P; size: number }[] = [], bearers: { at: P; size: number }[] = [], cartons: { at: P; size: number }[] = [];
    const wraps: THREE.Vector3[] = [];
    for (let i = 0; i < Math.min(palletCount, 8); i++) {
      const col = i % 4, row = Math.floor(i / 4);
      const px = -5.9 + col * 1.3 + (random() - 0.5) * 0.08, pz = -4.9 + row * 1.45 + (random() - 0.5) * 0.08;
      if (row === 1 && col > 1) continue;
      for (let k = 0; k < 11; k++) slats.push({ at: [px - 0.55 + k * 0.11, 0.13, pz], size: 1 });
      for (const d of [-0.45, 0, 0.45]) bearers.push({ at: [px, 0.075, pz + d], size: 1 });
      const layers = 2 + Math.floor(random() * 2);
      for (let l = 0; l < layers; l++) for (let cx = 0; cx < 3; cx++) for (let cz = 0; cz < 3; cz++) cartons.push({ at: [px - 0.4 + cx * 0.4, 0.14 + 0.15 + l * 0.3, pz - 0.33 + cz * 0.33], size: 1 });
      wraps.push(new THREE.Vector3(px, 0.14 + layers * 0.15, pz).setY(0.14 + layers * 0.3 / 2));
      const wrap = s.box([1.22, layers * 0.3 + 0.02, 1.02], [px, 0.14 + layers * 0.15, pz], new THREE.MeshStandardMaterial({ color: '#dfe8ee', transparent: true, opacity: 0.3, roughness: 0.15, depthWrite: false }));
      wrap.castShadow = false;
    }
    s.scatter(slat, palletWood, slats);
    s.scatter(bearer, palletWood, bearers);
    const cartonPaint = new THREE.MeshStandardMaterial({ map: paint(64, 48, (c) => { c.fillStyle = '#b9915c'; c.fillRect(0, 0, 64, 48); c.fillStyle = a.biscuits === 'wafers' ? '#d4789a' : a.biscuits === 'chocolate' ? '#5a2a1a' : '#b8302a'; c.fillRect(0, 17, 64, 14); }), roughness: 0.95 });
    s.scatter(new THREE.BoxGeometry(0.38, 0.29, 0.31), cartonPaint, cartons);

    // ---- the exit door with its push bar, the punch clock and card rack beside it.
    const exitX = 5.5;
    s.box([1.0, 2.1, 0.08], [exitX, 1.05, -5.92], s.material(scheme.bottom, { roughness: 0.8 }));
    s.box([1.14, 0.08, 0.12], [exitX, 2.14, -5.92], dark);
    s.box([0.7, 0.05, 0.08], [exitX, 1.0, -5.86], steel);
    s.label('EXIT', 0.5, 0.18, [exitX, 2.4, -5.94], '#f1efe6', '#2a7a4a');
    const clockX = 4.6;
    s.box([0.3, 0.42, 0.2], [clockX, 1.45, -5.85], s.material('#7d8286', { metalness: 0.55, roughness: 0.4 }));
    s.box([0.12, 0.025, 0.1], [clockX, 1.68, -5.8], dark);
    const dialSmall = s.mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshStandardMaterial({ map: clockFace(CLOCK[a.shift][0], CLOCK[a.shift][1], 64), roughness: 0.5 }), [clockX, 1.5, -5.745]);
    void dialSmall;
    s.box([0.02, 0.7, 0.5], [clockX - 0.55, 1.55, -5.94], dark);
    const pockets: { at: P; size: number }[] = [], cards: { at: P; size: number }[] = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) {
      pockets.push({ at: [clockX - 0.75 + c * 0.1, 1.82 - r * 0.115, -5.92] as P, size: 1 });
      if (random() < (a.shift === 'night' ? 0.3 : 0.6)) cards.push({ at: [clockX - 0.75 + c * 0.1, 1.86 - r * 0.115, -5.915] as P, size: 1 });
    }
    s.scatter(new THREE.BoxGeometry(0.085, 0.05, 0.02), steel, pockets);
    s.scatter(new THREE.BoxGeometry(0.06, 0.11, 0.004), s.material('#efe6c8', { roughness: 0.9 }), cards);

    // ---- notice board, the painted sign, the big wall clock and the tannoy horn.
    s.box([1.3, 0.9, 0.05], [2.9, 1.9, -5.93], s.material('#8a6a3a', { roughness: 0.9 }));
    s.box([1.2, 0.8, 0.02], [2.9, 1.9, -5.9], s.material('#c9a070', { roughness: 1 }));
    const notices = s.scatter(new THREE.BoxGeometry(0.2, 0.26, 0.004), s.material('#f1ede4', { roughness: 0.9 }), Array.from({ length: 7 }, (_u, i) => ({ at: [2.4 + (i % 4) * 0.3 + (random() - 0.5) * 0.04, 2.1 - Math.floor(i / 4) * 0.34 + (random() - 0.5) * 0.04, -5.885] as P, size: 1 })));
    void notices;
    const signText = { eating: 'NO EATING ON THE LINE', hands: 'WASH YOUR HANDS', target: 'TARGET 12,000 CASES', safety: 'DAYS WITHOUT ACCIDENT: 3', union: 'UNION MEETING FRIDAY 5PM' }[a.sign];
    s.label(signText, 3.6, 0.5, [1.0, 3.15, -5.94], a.sign === 'union' ? '#1f3f8f' : '#8a2a2a', '#f1ebd6');
    s.cylinder(0.46, 0.46, 0.08, [-0.2, 4.15, -5.92], black, 32).rotation.x = Math.PI / 2;
    const dial = s.mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshStandardMaterial({ map: clockFace(CLOCK[a.shift][0], CLOCK[a.shift][1], 256), roughness: 0.5 }), [-0.2, 4.15, -5.875]);
    void dial;
    const horn = s.lathe([[0, 0], [0.06, 0], [0.09, 0.1], [0.17, 0.3], [0.24, 0.45], [0.2, 0.45], [0.15, 0.3], [0.08, 0.1], [0.05, 0.02], [0, 0.02]], s.material('#9aa0a4', { metalness: 0.6, roughness: 0.4 }), [0, 0, 0]);
    horn.position.set(4.2, 4.3, -5.7);
    horn.rotation.set(0.9, -0.4, 0);
    s.box([0.06, 0.06, 0.3], [4.2, 4.35, -5.9], dark);

    // ---- the mezzanine along the back wall over the roller door, with its stair down.
    const mezY = 3.4, mezZ0 = -6, mezZ1 = -3.9, mezX0 = -6.5, mezX1 = -1.2;
    s.box([mezX1 - mezX0, 0.12, mezZ1 - mezZ0], [(mezX0 + mezX1) / 2, mezY - 0.06, (mezZ0 + mezZ1) / 2], s.material('#6e7276', { metalness: 0.5, roughness: 0.6 }));
    s.box([mezX1 - mezX0, 0.25, 0.08], [(mezX0 + mezX1) / 2, mezY - 0.12, mezZ1], yellow);
    const columns = s.scatter(new THREE.BoxGeometry(0.16, mezY, 0.16), s.material('#5a5e62', { metalness: 0.5, roughness: 0.6 }), Array.from({ length: 4 }, (_u, i) => ({ at: [-5.9 + i * 1.55, mezY / 2, mezZ1 - 0.1] as P, size: 1 })));
    void columns;
    const posts = s.scatter(new THREE.BoxGeometry(0.05, 1.1, 0.05), steel, Array.from({ length: 8 }, (_u, i) => ({ at: [-6.3 + i * 0.72, mezY + 0.55, mezZ1 - 0.03] as P, size: 1 })));
    void posts;
    for (const y of [mezY + 0.55, mezY + 1.05]) s.box([mezX1 - mezX0 - 0.3, 0.04, 0.04], [(mezX0 + mezX1) / 2, y, mezZ1 - 0.03], steel);
    // Something stored up there: drums and a few cartons.
    for (let i = 0; i < 3; i++) s.cylinder(0.3, 0.3, 0.9, [-5.6 + i * 0.7, mezY + 0.45, -5.2], s.material(['#2f6fc4', '#2f6fc4', '#c9402a'][i], { roughness: 0.5 }), 18);
    s.scatter(new THREE.BoxGeometry(0.38, 0.29, 0.31), cartonPaint, Array.from({ length: 6 }, (_u, i) => ({ at: [-3.4 + (i % 3) * 0.42, mezY + 0.145 + Math.floor(i / 3) * 0.3, -5.3] as P, size: 1 })));
    // The stair: steps rising from the floor at the left to the deck at the mezzanine's end.
    const steps = 16, rise = mezY / steps, run = 0.26;
    const stairZ = -5.2, stairX0 = mezX1 + steps * run;
    s.scatter(new THREE.BoxGeometry(run + 0.02, 0.05, 0.9), steel, Array.from({ length: steps }, (_u, i) => ({ at: [stairX0 - (i + 0.5) * run, (i + 1) * rise - 0.025, stairZ] as P, size: 1 })));
    for (const dz of [-0.47, 0.47]) {
      const stringer = s.box([Math.hypot(steps * run, mezY), 0.22, 0.04], [(stairX0 + mezX1) / 2, mezY / 2 - 0.1, stairZ + dz], s.material('#5a5e62', { metalness: 0.5, roughness: 0.6 }));
      stringer.rotation.z = Math.atan2(mezY, -steps * run);
    }
    const rail = s.box([Math.hypot(steps * run, mezY), 0.04, 0.04], [(stairX0 + mezX1) / 2, mezY / 2 + 0.95, stairZ + 0.47], steel);
    rail.rotation.z = Math.atan2(mezY, -steps * run);
    s.scatter(new THREE.BoxGeometry(0.04, 1.0, 0.04), steel, Array.from({ length: 6 }, (_u, i) => ({ at: [stairX0 - (i * 3 + 1) * run, (i * 3 + 1) * rise + 0.5, stairZ + 0.47] as P, size: 1 })));

    // ---- the belt: a long steel conveyor down the hall carrying rows of biscuits, scrolling.
    const beltZ = -0.4, beltY = 0.9, beltX0 = -5.8, beltX1 = 5.8, beltW = 0.85;
    const kind = BISCUITS[a.biscuits];
    const running = a.shift !== 'tea';
    const empty = a.shift === 'end' && random() < 0.5;
    const beltMap = paint(2048, 256, (c) => {
      c.fillStyle = '#33363b';
      c.fillRect(0, 0, 2048, 256);
      c.fillStyle = 'rgba(255,255,255,0.03)';
      for (let i = 0; i < 40; i++) c.fillRect(0, i * 6.4, 2048, 1);
      if (empty) return;
      c.fillStyle = kind.colour;
      const pitch = kind.shape === 'round' ? 0.08 : 0.07, rows = kind.rows;
      for (let x = pitch / 2; x < 4; x += pitch) for (let r = 0; r < rows; r++) {
        if (a.shift === 'end' && x > 2.2) continue;
        const px = x * 512 + (random() - 0.5) * 5, py = 256 * ((r + 0.5) / rows * 0.74 + 0.13) + (random() - 0.5) * 5;
        if (kind.shape === 'round') { c.beginPath(); c.arc(px, py, 19, 0, Math.PI * 2); c.fill(); }
        else c.fillRect(px - 12, py - 17, 24, 34);
        if (a.biscuits === 'creams') { c.fillStyle = '#f1e2b0'; c.fillRect(px - 12, py - 2, 24, 4); c.fillStyle = kind.colour; }
        if (a.biscuits === 'chocolate') { c.fillStyle = '#7a4a28'; c.beginPath(); c.arc(px - 5, py - 5, 8, 0, Math.PI * 2); c.fill(); c.fillStyle = kind.colour; }
        if (a.biscuits === 'round') { c.fillStyle = '#e4bb78'; c.beginPath(); c.arc(px, py, 12, 0, Math.PI * 2); c.fill(); c.fillStyle = kind.colour; }
      }
    });
    beltMap.wrapS = THREE.RepeatWrapping;
    beltMap.repeat.set((beltX1 - beltX0) / 4, 1);
    const belt = s.mesh(new THREE.PlaneGeometry(beltX1 - beltX0, beltW - 0.08), new THREE.MeshStandardMaterial({ map: beltMap, roughness: 0.9 }), [0, beltY + 0.002, beltZ]);
    belt.rotation.x = -Math.PI / 2;
    s.box([beltX1 - beltX0, 0.06, beltW], [0, beltY - 0.03, beltZ], steel);
    for (const sideZ of [-1, 1]) s.box([beltX1 - beltX0, 0.09, 0.03], [0, beltY + 0.03, beltZ + sideZ * (beltW / 2 - 0.015)], steel);
    const legs: { at: P; size: number }[] = [], braces: { at: P; size: number }[] = [];
    for (let x = beltX0 + 0.4; x <= beltX1 - 0.4; x += 1.4) {
      for (const sideZ of [-1, 1]) legs.push({ at: [x, (beltY - 0.08) / 2, beltZ + sideZ * (beltW / 2 - 0.08)], size: 1 });
      braces.push({ at: [x, 0.3, beltZ], size: 1 });
    }
    s.scatter(new THREE.BoxGeometry(0.05, beltY - 0.08, 0.05), dark, legs);
    s.scatter(new THREE.BoxGeometry(0.04, 0.04, beltW - 0.2), dark, braces);
    for (const end of [beltX0, beltX1]) s.cylinder(0.06, 0.06, beltW - 0.06, [end, beltY - 0.04, beltZ], steel, 18).rotation.x = Math.PI / 2;
    // The drive motor at the far end, and a guard over it.
    s.box([0.5, 0.35, 0.3], [beltX0 + 0.3, 0.45, beltZ - 0.6], s.material('#3a5a3a', { metalness: 0.4, roughness: 0.5 }));
    s.cylinder(0.08, 0.08, 0.2, [beltX0 + 0.3, 0.45, beltZ - 0.38], dark, 14).rotation.x = Math.PI / 2;
    // Control box with a red stop button, on a post by the hero's station.
    s.box([0.06, 1.2, 0.06], [1.6, 0.6, beltZ + 0.7], dark);
    s.box([0.25, 0.3, 0.12], [1.6, 1.25, beltZ + 0.7], s.material('#c9c4b0', { roughness: 0.6 }));
    s.cylinder(0.04, 0.04, 0.03, [1.6, 1.3, beltZ + 0.78], s.material('#d4303a', { roughness: 0.4 }), 14).rotation.x = Math.PI / 2;
    s.cylinder(0.025, 0.025, 0.03, [1.6, 1.18, beltZ + 0.78], s.material('#2a8a4a', { roughness: 0.4 }), 14).rotation.x = Math.PI / 2;

    // ---- packing stations either side of the belt: steel tables with stacks of flat cardboard, mugs at tea break.
    const flatPaint = s.material('#c4a070', { roughness: 1 });
    const flats: { at: P; size: number }[] = [];
    const tableLegs: { at: P; size: number }[] = [];
    const stations: [number, number][] = [[-4.3, beltZ + 1.1], [-2.2, beltZ + 1.1], [2.4, beltZ + 1.1], [4.4, beltZ + 1.1], [-3.4, beltZ - 1.3], [0.3, beltZ - 1.3], [3.7, beltZ - 1.3]];
    const mugColour = s.material('#f1ede4', { roughness: 0.4 });
    const mugs: { at: P; size: number }[] = [];
    for (const [x, z] of stations) {
      s.box([1.1, 0.03, 0.6], [x, 0.78, z], steel);
      for (const dx of [-0.5, 0.5]) for (const dz of [-0.25, 0.25]) tableLegs.push({ at: [x + dx, 0.38, z + dz], size: 1 });
      const stack = Math.round(mix(6, 26, mood.density)) + Math.floor(random() * 6);
      const sx = x + (random() < 0.5 ? -0.25 : 0.25);
      for (let i = 0; i < stack; i++) flats.push({ at: [sx + (random() - 0.5) * 0.02, 0.8 + i * 0.013, z + (random() - 0.5) * 0.02], size: 1 });
      if (a.shift === 'tea' || random() < 0.25) mugs.push({ at: [x - sx + x + (random() - 0.5) * 0.3, 0.84, z + 0.1 + (random() - 0.5) * 0.2], size: 1 });
      // A few packed trays under the table.
      if (random() < 0.7) s.box([0.5, 0.25, 0.4], [x + (random() - 0.5) * 0.3, 0.125, z], cartonPaint);
    }
    s.scatter(new THREE.BoxGeometry(0.05, 0.76, 0.05), dark, tableLegs);
    s.scatter(new THREE.BoxGeometry(0.55, 0.012, 0.38), flatPaint, flats);
    if (mugs.length) s.scatter(new THREE.CylinderGeometry(0.04, 0.036, 0.095, 12), mugColour, mugs);

    // ---- fluorescent strips hanging on chains over the belt and the stations.
    const tubePaint = new THREE.MeshStandardMaterial({ color: '#fff8e0', emissive: '#fff4cc', emissiveIntensity: night ? 2.4 : mix(0.5, 1.2, 1 - Math.abs(mood.daylight - 0.5) * 2) });
    const strips: { at: P; size: number }[] = [], chains: { at: P; size: number }[] = [];
    for (const [z, count, start] of [[beltZ + 0.2, 5, -4.8], [beltZ + 2.6, 4, -3.6]] as const) {
      for (let i = 0; i < count; i++) {
        const x = start + i * 2.4;
        strips.push({ at: [x, 3.75, z], size: 1 });
        for (const dx of [-0.6, 0.6]) chains.push({ at: [x + dx, 4.5, z], size: 1 });
      }
    }
    const housings = s.scatter(new THREE.BoxGeometry(1.5, 0.08, 0.2), s.material('#d8d6cc', { roughness: 0.6 }), strips.map((p) => ({ at: [p.at[0], p.at[1] + 0.05, p.at[2]] as P, size: 1 })));
    void housings;
    const tubes = s.scatter(new THREE.BoxGeometry(1.42, 0.04, 0.14), tubePaint, strips);
    tubes.castShadow = false;
    s.scatter(new THREE.CylinderGeometry(0.008, 0.008, 1.4, 6), dark, chains).castShadow = false;
    // One tube flickers when the place is worn down.
    const flicker = mood.wear > 0.45 ? Math.floor(random() * strips.length) : -1;
    const flickerMesh = flicker >= 0 ? s.mesh(new THREE.BoxGeometry(1.42, 0.041, 0.141), new THREE.MeshStandardMaterial({ color: '#fff8e0', emissive: '#fff4cc', emissiveIntensity: 0.1 }), strips[flicker].at) : null;
    if (flickerMesh) {
      flickerMesh.castShadow = false;
      const m = new THREE.Matrix4().makeScale(0.001, 0.001, 0.001).setPosition(...strips[flicker].at);
      tubes.setMatrixAt(flicker, m);
      tubes.instanceMatrix.needsUpdate = true;
    }

    // ---- the belt scrolls with the mood's energy; the flickering tube stutters.
    const speed = running ? mix(0.15, 1.1, mood.energy) : 0;
    const phase = random() * 10;
    world.update = (dt, time) => {
      beltMap.offset.x = (beltMap.offset.x - dt * speed / 4) % 1;
      if (flickerMesh) {
        const n = Math.sin(time * 17 + phase) * Math.sin(time * 5.3) + Math.sin(time * 31 + phase * 2);
        (flickerMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = n > 0.6 ? 1.2 : 0.08;
      }
    };
    const dispose = world.dispose;
    world.dispose = () => { brick.dispose(); beltMap.dispose(); dispose(); };
    return world;
  },
});

function clockFace(hour: number, minute: number, size: number) {
  return paint(size, size, (c) => {
    const r = size / 2;
    c.fillStyle = '#f4f1e8';
    c.fillRect(0, 0, size, size);
    c.strokeStyle = '#2a2320';
    c.lineWidth = size / 40;
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * Math.PI * 2;
      c.beginPath();
      c.moveTo(r + Math.cos(t) * r * 0.78, r + Math.sin(t) * r * 0.78);
      c.lineTo(r + Math.cos(t) * r * 0.9, r + Math.sin(t) * r * 0.9);
      c.stroke();
    }
    const h = ((hour % 12) / 12 + minute / 720) * Math.PI * 2 - Math.PI / 2, m = (minute / 60) * Math.PI * 2 - Math.PI / 2;
    c.lineWidth = size / 24;
    c.beginPath(); c.moveTo(r, r); c.lineTo(r + Math.cos(h) * r * 0.48, r + Math.sin(h) * r * 0.48); c.stroke();
    c.lineWidth = size / 40;
    c.beginPath(); c.moveTo(r, r); c.lineTo(r + Math.cos(m) * r * 0.72, r + Math.sin(m) * r * 0.72); c.stroke();
    c.fillStyle = '#a32a1c';
    c.beginPath(); c.arc(r, r, size / 32, 0, Math.PI * 2); c.fill();
  });
}
