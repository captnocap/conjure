import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, disposeTree, mix } from '@conjure/kit';

type P3 = [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1]) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  return texture;
}

// The roof space: ridge along z, far gable at Z0, cut open at Z1 where the viewer stands.
const Z0 = -3.5, Z1 = 2.3, LEN = Z1 - Z0, ZC = (Z0 + Z1) / 2, HW = 3, RH = 3.2, DECK = 1.5;
const SL = Math.hypot(HW, RH), PITCH = Math.atan2(RH, HW);
const headroom = (x: number) => RH * (1 - Math.abs(x) / HW);
const WINDOW_X = -0.2;
const SLOTS = [
  { x: 0.45, z: -1.35, r: 0.9, h: 1.8 },
  { x: -1.12, z: 0.3, r: 0.6, h: 1.3 },
  { x: 1.12, z: -0.95, r: 0.58, h: 1.3 },
  { x: -1.15, z: 1.75, r: 0.48, h: 1.0 },
  { x: 1.2, z: -2.55, r: 0.52, h: 1.1 },
] as const;
const HATCH = { x: 1.08, z: 0.95, w: 0.68, d: 1.05 };
const STACK = { x: -1.5, z: -2.35 };

export default defineWorld({
  questions: {
    window: choice('What is the gable window like?', {
      arched: 'A tall round-headed window with glazing bars, almost chapel-like.',
      round: 'A big round oculus with a cross of glazing bars.',
      square: 'A plain square four-pane window.',
      louvred: 'Not glass at all but a slatted vent, throwing the light in stripes.',
      boarded: 'A broken window half boarded over with planks nailed across.',
    }),
    roof: choice('What is the underside of the roof?', {
      boards: 'Pale close-boarded sarking, dry and sound.',
      felt: 'Black roofing felt sagging between the rafters.',
      slates: 'Bare battens and the backs of slates, with pinpricks of daylight where some have slipped.',
    }),
    insulation: choice('What lies between the joists at the eaves?', {
      pink: 'Fat pink fibreglass batts.',
      yellow: 'Old yellow glass wool, flattened and itchy.',
      grey: 'Grey loose-fill and decades of dust.',
      none: 'Nothing: bare lath and the back of the ceiling plaster.',
    }),
    stack: choice('What rises through the roof space?', {
      brick: 'A red brick chimney stack streaked with soot.',
      whitewash: 'A limewashed chimney stack, flaking.',
      stone: 'A rough stone chimney breast.',
      tank: 'No chimney: a cold-water tank on a timber platform with lagged pipes.',
    }),
    boxes: choice('How have the boxes been kept?', {
      orderly: 'Stacked square and labelled, the work of someone methodical.',
      slumped: 'Slumping and crushed, stacks leaning where the damp got in.',
      ransacked: 'Gone through in a hurry: boxes tipped over, flaps open, papers across the boards.',
      few: 'Almost cleared: only a last few boxes left behind.',
    }),
    hatch: choice('What about the ladder hatch?', {
      open: 'Open, the folding ladder down and light coming up from the landing: someone has just climbed in.',
      dark: 'Open onto darkness, the ladder down.',
      shut: 'Shut, the folded ladder lying on top of it.',
    }),
    relic: choice('What single thing has been left leaning against the stack?', {
      frames: 'Empty gilt picture frames.',
      rug: 'A rolled rug tied with string.',
      cot: 'The side of a dismantled cot.',
      mirror: 'A tall mirror gone grey and spotted.',
      nothing: 'Nothing.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const pick = <V,>(list: readonly V[]) => list[Math.floor(random() * list.length)];
    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0], parent: THREE.Object3D = root) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const box = (size: P3, at: P3, material: THREE.Material, parent: THREE.Object3D = root) => put(new THREE.BoxGeometry(...size), material, at, parent);
    const std = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...options });

    // ---- light: the sun only gets in through the gable window, because the roof really casts its shadow
    const noon = 1 - Math.abs(mood.daylight * 2 - 1);
    const sunColour = new THREE.Color().setHSL(mix(0.02, 0.13, noon) + (mood.daylight < 0.5 ? 0.0 : -0.01) + (1 - mood.warmth) * 0.04, mix(0.85, 0.35, noon) * mix(0.6, 1, mood.warmth), mix(0.72, 0.9, noon));
    const background = new THREE.Color('#e6e2d6').lerp(sunColour, 0.12);
    root.add(new THREE.HemisphereLight('#fff6e6', '#7a6956', mix(1.0, 1.3, mood.cheer)));
    const fill = new THREE.DirectionalLight(new THREE.Color('#e3e8f2').lerp(sunColour, 0.25), mix(0.75, 1.05, mood.cheer));
    fill.position.set(-2.5, 4.5, 9); root.add(fill);
    const key = new THREE.DirectionalLight(sunColour, 4.6);
    const slope = mix(0.36, 0.52, noon), drift = 0.3;
    const travel = new THREE.Vector3(drift, -slope, 1).normalize();
    key.target.position.set(0.3, 0.7, -1.3);
    key.position.copy(key.target.position).addScaledVector(travel, -16);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = key.shadow.camera.bottom = -5.5; key.shadow.camera.right = key.shadow.camera.top = 5.5;
    key.shadow.camera.near = 1; key.shadow.camera.far = 34; key.shadow.camera.updateProjectionMatrix();
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 3;
    root.add(key, key.target);

    // ---- timber and skins
    const timber = std(new THREE.Color('#a98558').lerp(new THREE.Color('#6f5a44'), mood.wear * 0.45), { roughness: 0.85 });
    const skinTexture = a.roof === 'boards'
      ? paint(256, 256, (ctx) => { ctx.fillStyle = '#bfa27a'; ctx.fillRect(0, 0, 256, 256); for (let x = 0; x < 256; x += 32) { ctx.fillStyle = `rgba(90,62,34,${0.1 + random() * 0.18})`; ctx.fillRect(x, 0, 32, 256); ctx.fillStyle = 'rgba(52,34,18,0.75)'; ctx.fillRect(x, 0, 2, 256); } for (let i = 0; i < 12; i++) { ctx.fillStyle = 'rgba(60,38,18,0.6)'; ctx.beginPath(); ctx.ellipse(random() * 256, random() * 256, 3, 6, 0, 0, 7); ctx.fill(); } }, [3, 2])
      : a.roof === 'felt'
        ? paint(128, 128, (ctx) => { const grd = ctx.createLinearGradient(0, 0, 0, 128); grd.addColorStop(0, '#4f4943'); grd.addColorStop(0.5, '#7a7268'); grd.addColorStop(1, '#4f4943'); ctx.fillStyle = grd; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = 'rgba(30,26,22,0.5)'; ctx.fillRect(0, 60, 128, 2); for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(20,18,16,0.25)'; ctx.fillRect(random() * 128, random() * 128, 10 + random() * 30, 1.5); } }, [2, Math.round(LEN / 0.74)])
        : paint(256, 256, (ctx) => { ctx.fillStyle = '#7d8388'; ctx.fillRect(0, 0, 256, 256); for (let row = 0; row < 8; row++) for (let col = 0; col < 6; col++) { ctx.fillStyle = `rgba(${40 + random() * 40},${46 + random() * 40},${54 + random() * 40},0.55)`; ctx.fillRect(row * 32 + 1, col * 43 + (row % 2) * 21 - 21, 30, 41); } ctx.fillStyle = '#a98558'; for (let x = 0; x < 256; x += 32) ctx.fillRect(x, 0, 6, 256); }, [4, 3]);
    const skin = new THREE.MeshStandardMaterial({ map: skinTexture, roughness: 0.95 });
    const rafterZs: number[] = [];
    for (let z = Z0 + 0.3; z < Z1 + 0.01; z += 0.74) rafterZs.push(z);
    const rafters = new THREE.InstancedMesh(new THREE.BoxGeometry(SL, 0.13, 0.06), timber, rafterZs.length * 2);
    const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), euler = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    rafterZs.forEach((z, index) => {
      for (const side of [-1, 1]) {
        euler.set(0, 0, -side * PITCH); quaternion.setFromEuler(euler);
        matrix.compose(new THREE.Vector3(side * HW / 2, RH / 2, z), quaternion, one); rafters.setMatrixAt(index * 2 + (side > 0 ? 1 : 0), matrix);
      }
    });
    rafters.castShadow = rafters.receiveShadow = true; root.add(rafters);
    for (const side of [-1, 1]) {
      const nx = side * RH / SL, ny = HW / SL;
      const sheet = box([SL + 0.5, 0.05, LEN + 0.3], [side * HW / 2 + nx * 0.1, RH / 2 + ny * 0.1, ZC - 0.1], skin); sheet.rotation.z = -side * PITCH;
      const purlin = box([0.1, 0.2, LEN], [side * HW * 0.52 - nx * 0.14, RH * 0.48 - ny * 0.14, ZC], timber); purlin.rotation.z = -side * PITCH;
      box([0.09, 0.12, LEN], [side * (HW - 0.12), 0.06, ZC], timber);
      if (a.roof === 'slates') {
        const chinks = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.05, 0.022), new THREE.MeshBasicMaterial({ color: '#fffbe8', side: THREE.DoubleSide }), 14);
        for (let i = 0; i < 14; i++) { const t = 0.12 + random() * 0.7; euler.set(Math.PI / 2, 0, -side * PITCH, 'ZYX'); quaternion.setFromEuler(euler); matrix.compose(new THREE.Vector3(side * HW * (1 - t) + nx * 0.07, RH * t + ny * 0.07, Z0 + 0.3 + random() * (LEN - 0.6)), quaternion, new THREE.Vector3(0.5 + random(), 0.6 + random(), 1)); chinks.setMatrixAt(i, matrix); }
        root.add(chinks);
      }
    }
    box([0.05, 0.24, LEN], [0, RH - 0.1, ZC], timber);
    rafterZs.forEach((z, index) => { if (index % 3 === 1) box([2 * HW * (1 - 2.62 / RH) + 0.16, 0.1, 0.045], [0, 2.62, z + 0.055], timber); });
    if (mood.wear > 0.25) {
      const web = new THREE.MeshBasicMaterial({ color: '#f4f1e8', transparent: true, opacity: mix(0.1, 0.34, mood.wear), depthWrite: false, side: THREE.DoubleSide });
      const count = Math.round(mood.wear * 7);
      for (let i = 0; i < count; i++) {
        const z = pick(rafterZs) + 0.04, side = random() < 0.5 ? -1 : 1, drop = 0.4 + random() * 0.6;
        const shape = new THREE.Shape(); shape.moveTo(0, RH - 0.2); shape.lineTo(side * drop * HW / RH, RH - 0.2 - drop); shape.quadraticCurveTo(side * 0.1, RH - 0.5 - drop * 0.3, 0, RH - 0.25 - drop * (0.6 + random() * 0.5)); shape.closePath();
        const mesh = put(new THREE.ShapeGeometry(shape), web, [0, 0, z]); mesh.castShadow = mesh.receiveShadow = false;
      }
    }

    // ---- floor: a boarded deck down the middle, open joists and insulation out to the eaves
    const deckTexture = paint(512, 512, (ctx) => {
      ctx.fillStyle = '#b79a72'; ctx.fillRect(0, 0, 512, 512);
      for (let x = 0; x < 512; x += 22) { ctx.fillStyle = `rgba(86,58,30,${0.05 + random() * 0.22})`; ctx.fillRect(x, 0, 22, 512); ctx.fillStyle = 'rgba(44,28,14,0.8)'; ctx.fillRect(x, 0, 1.6, 512); const joint = random() * 512; ctx.fillRect(x, joint, 22, 1.6); ctx.fillStyle = 'rgba(30,20,10,0.7)'; for (let y = 20; y < 512; y += 70) { ctx.fillRect(x + 5, y, 2, 2); ctx.fillRect(x + 15, y, 2, 2); } }
      for (let i = 0; i < 30 * mood.wear; i++) { ctx.fillStyle = 'rgba(60,44,28,0.16)'; ctx.beginPath(); ctx.ellipse(random() * 512, random() * 512, 20 + random() * 50, 12 + random() * 30, random() * 3, 0, 7); ctx.fill(); }
    });
    const deck = box([DECK * 2, 0.03, LEN], [0, -0.015, ZC], new THREE.MeshStandardMaterial({ map: deckTexture, roughness: 0.9 }));
    box([HW * 2 + 0.2, 0.04, LEN], [0, -0.215, ZC], std('#d9d2c2'));
    const joistZs: number[] = [];
    for (let z = Z0 + 0.2; z < Z1; z += 0.4) joistZs.push(z);
    const joists = new THREE.InstancedMesh(new THREE.BoxGeometry(HW * 2, 0.2, 0.055), timber, joistZs.length + 1);
    joistZs.forEach((z, index) => { matrix.makeTranslation(0, -0.075, z); joists.setMatrixAt(index, matrix); });
    matrix.makeTranslation(0, -0.075, Z1 - 0.03); joists.setMatrixAt(joistZs.length, matrix);
    joists.castShadow = joists.receiveShadow = true; root.add(joists);
    if (a.insulation === 'none') {
      const lath = paint(64, 64, (ctx) => { ctx.fillStyle = '#cfc6b3'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#8f7a5c'; for (let x = 0; x < 64; x += 8) ctx.fillRect(x, 0, 5, 64); }, [10, 1]);
      for (const side of [-1, 1]) box([HW - DECK, 0.01, LEN], [side * (DECK + HW) / 2, -0.18, ZC], new THREE.MeshStandardMaterial({ map: lath, roughness: 1 }));
    } else {
      const wool = new THREE.Color({ pink: '#f0a3b6', yellow: '#dcc063', grey: '#a7a39a' }[a.insulation]).lerp(new THREE.Color('#9a9086'), mood.wear * 0.35).lerp(new THREE.Color('#ffffff'), mood.cheer * 0.08);
      const batts = new THREE.InstancedMesh(new THREE.BoxGeometry(HW - DECK, 0.16, 0.345), std(wool, { roughness: 1 }), joistZs.length * 2);
      const tufts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6), std(wool.clone().multiplyScalar(1.06), { roughness: 1 }), joistZs.length * 4);
      joistZs.forEach((z, index) => {
        for (const side of [-1, 1]) {
          const lift = a.insulation === 'grey' ? -0.05 - random() * 0.03 : a.insulation === 'yellow' ? -0.04 + random() * 0.02 : -0.02 + random() * 0.02;
          matrix.makeTranslation(side * (DECK + HW) / 2, -0.1 + lift, z + 0.2); batts.setMatrixAt(index * 2 + (side > 0 ? 1 : 0), matrix);
          for (let k = 0; k < 2; k++) { matrix.compose(new THREE.Vector3(side * (DECK + 0.2 + random() * (HW - DECK - 0.5)), -0.07 + lift, z + 0.2 + (random() - 0.5) * 0.1), quaternion.identity(), new THREE.Vector3(1 + random(), 0.45, 0.9)); tufts.setMatrixAt(index * 4 + (side > 0 ? 2 : 0) + k, matrix); }
        }
      });
      batts.receiveShadow = tufts.receiveShadow = true; root.add(batts, tufts);
    }

    // ---- far gable and its window
    const masonry = a.stack === 'tank' ? 'boards' : a.stack;
    const wallTexture = masonry === 'boards'
      ? paint(256, 256, (ctx) => { ctx.fillStyle = '#b39a78'; ctx.fillRect(0, 0, 256, 256); for (let x = 0; x < 256; x += 42) { ctx.fillStyle = `rgba(80,56,30,${0.08 + random() * 0.2})`; ctx.fillRect(x, 0, 42, 256); ctx.fillStyle = 'rgba(48,32,16,0.8)'; ctx.fillRect(x, 0, 2.5, 256); } })
      : paint(256, 256, (ctx) => {
        const mortar = masonry === 'whitewash' ? '#e6e2d6' : masonry === 'stone' ? '#8f8a7e' : '#cfc3ae';
        ctx.fillStyle = mortar; ctx.fillRect(0, 0, 256, 256);
        const rows = masonry === 'stone' ? 6 : 12, rowH = 256 / rows;
        for (let row = 0; row < rows; row++) { let x = row % 2 ? -30 : 0; while (x < 256) { const w = masonry === 'stone' ? 40 + random() * 50 : 58; const shade = random(); ctx.fillStyle = masonry === 'whitewash' ? `hsl(40 18% ${78 + shade * 12}%)` : masonry === 'stone' ? `hsl(36 ${8 + shade * 10}% ${52 + shade * 18}%)` : `hsl(${10 + shade * 12} ${42 + shade * 14}% ${42 + shade * 14}%)`; ctx.fillRect(x + 2, row * rowH + 2, w - 4, rowH - 4); x += w; } }
        if (masonry === 'whitewash') for (let i = 0; i < 6 + mood.wear * 30; i++) { ctx.fillStyle = `hsl(${12 + random() * 10} 40% 45%)`; ctx.fillRect(Math.floor(random() * 4) * 58 + 4 + (Math.floor(random() * 12) % 2 ? -30 : 0), Math.floor(random() * 12) * rowH + 3, 50, rowH - 6); }
      });
    const wall = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.95 });
    const gable = new THREE.Shape(); gable.moveTo(-HW - 0.2, -0.2); gable.lineTo(HW + 0.2, -0.2); gable.lineTo(0, RH + 0.2); gable.closePath();
    const hole = new THREE.Path();
    let w0 = -0.72, w1 = 0.72, y0 = 0.72, y1 = 2.1, wide = 0.72;
    if (a.window === 'arched') { wide = 0.68; w0 = -wide; w1 = wide; y0 = 0.72; y1 = 2.42; hole.moveTo(WINDOW_X - wide, y0); hole.lineTo(WINDOW_X + wide, y0); hole.lineTo(WINDOW_X + wide, 1.74); hole.absarc(WINDOW_X, 1.74, wide, 0, Math.PI, false); hole.lineTo(WINDOW_X - wide, y0); }
    else if (a.window === 'round') { wide = 0.8; w0 = -wide * 0.8; w1 = wide * 0.8; y0 = 1.58 - wide * 0.86; y1 = 1.58 + wide * 0.86; hole.absarc(WINDOW_X, 1.58, wide, 0, Math.PI * 2, false); }
    else { if (a.window === 'louvred') { wide = 0.6; w0 = -wide; w1 = wide; } hole.moveTo(WINDOW_X + w0, y0); hole.lineTo(WINDOW_X + w1, y0); hole.lineTo(WINDOW_X + w1, y1); hole.lineTo(WINDOW_X + w0, y1); hole.closePath(); }
    gable.holes.push(hole);
    put(new THREE.ExtrudeGeometry(gable, { depth: 0.16, bevelEnabled: false }), wall, [0, 0, Z0 - 0.16]);
    const frame = std('#e9e3d2', { roughness: 0.7 });
    const zw = Z0 - 0.06;
    const sky = put(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').lerp(sunColour, 0.35) }), [WINDOW_X, 1.6, Z0 - 0.6]); sky.castShadow = sky.receiveShadow = false;
    if (a.window === 'louvred') {
      for (let y = y0 + 0.06; y < y1; y += 0.13) { const slat = box([wide * 2, 0.012, 0.1], [WINDOW_X, y, zw], std('#b9b09a')); slat.rotation.x = -0.55; }
    } else {
      const pane = put(new THREE.PlaneGeometry(w1 - w0 + 0.5, y1 - y0 + 0.4), new THREE.MeshBasicMaterial({ color: '#fff8e6', transparent: true, opacity: mix(0.16, 0.42, mood.wear), depthWrite: false }), [WINDOW_X, (y0 + y1) / 2, zw - 0.04]); pane.castShadow = pane.receiveShadow = false;
      const bar = 0.045;
      box([bar, y1 - y0 + (a.window === 'round' ? 0.26 : 0), 0.06], [WINDOW_X, (y0 + y1) / 2, zw], frame);
      for (const y of a.window === 'arched' ? [1.3, 1.78] : [(y0 + y1) / 2]) box([(a.window === 'round' ? wide : wide) * 2, bar, 0.06], [WINDOW_X, y, zw], frame);
      if (a.window === 'arched') for (const x of [-0.34, 0.34]) box([bar * 0.8, 1.04, 0.05], [WINDOW_X + x, y0 + 0.52, zw], frame);
      if (a.window === 'boarded') for (let i = 0; i < 3; i++) { const plank = box([wide * 2.5, 0.16, 0.03], [WINDOW_X + (random() - 0.5) * 0.1, y0 + 0.22 + i * 0.3 + random() * 0.06, Z0 + 0.03], timber); plank.rotation.z = (random() - 0.5) * 0.3; }
    }
    if (a.window === 'round') { const ring = put(new THREE.TorusGeometry(wide, 0.05, 8, 40), frame, [WINDOW_X, 1.58, Z0 + 0.01]); ring.castShadow = false; }
    else if (a.window === 'arched') { const ring = put(new THREE.TorusGeometry(wide, 0.045, 8, 24, Math.PI), frame, [WINDOW_X, 1.74, Z0 + 0.01]); ring.castShadow = false; for (const x of [-wide, wide]) box([0.07, 1.04, 0.05], [WINDOW_X + x, y0 + 0.52, Z0 + 0.01], frame).castShadow = false; }
    else for (const [sx, sy, px, py] of [[w1 - w0 + 0.14, 0.07, 0, y0], [w1 - w0 + 0.14, 0.07, 0, y1], [0.07, y1 - y0, w0, (y0 + y1) / 2], [0.07, y1 - y0, w1, (y0 + y1) / 2]] as const) box([sx, sy, 0.05], [WINDOW_X + px, py, Z0 + 0.01], frame).castShadow = false;
    box([w1 - w0 + 0.3, 0.05, 0.16], [WINDOW_X, y0 - 0.03, Z0 + 0.06], frame);

    // ---- the shaft of light and its motes
    const reach = (x: number, y: number): THREE.Vector3 => new THREE.Vector3(x + drift * y / slope, 0.005, Z0 + y / slope);
    const corners: [number, number][] = [[WINDOW_X + w0, y0], [WINDOW_X + w1, y0], [WINDOW_X + w1, y1], [WINDOW_X + w0, y1]];
    const vertices: number[] = [];
    corners.forEach(([x, y], index) => {
      const [nx, ny] = corners[(index + 1) % 4];
      const p0 = new THREE.Vector3(x, y, Z0), p1 = new THREE.Vector3(nx, ny, Z0), f0 = reach(x, y), f1 = reach(nx, ny);
      for (const p of [p0, p1, f1, p0, f1, f0]) vertices.push(p.x, p.y, p.z);
    });
    const shaftGeometry = new THREE.BufferGeometry(); shaftGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const shaftStrength = mix(0.09, 0.15, mood.wear) * mix(1.15, 0.9, noon);
    const shaft = new THREE.Mesh(shaftGeometry, new THREE.MeshBasicMaterial({ color: sunColour, transparent: true, opacity: shaftStrength, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    root.add(shaft);
    const moteCount = Math.round(mix(70, 190, mood.wear * 0.6 + mood.density * 0.4));
    const motes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.011, 5, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fffdf2').lerp(sunColour, 0.3) }), moteCount);
    const moteSeeds = Array.from({ length: moteCount }, () => ({ u: random(), v: random(), s: 0.08 + random() * 0.9, phase: random() * 6.283, size: 0.5 + random() * 1.3 }));
    const placeMotes = (time: number) => {
      const speed = mix(0.15, 1.2, mood.energy), at = new THREE.Vector3();
      moteSeeds.forEach((mote, index) => {
        const x = WINDOW_X + mix(w0, w1, mote.u), y = mix(y0, y1, mote.v), s = (mote.s + time * 0.004 * speed) % 1;
        at.set(x + drift * (y / slope) * s + Math.sin(time * 0.31 * speed + mote.phase) * 0.06, Math.max(0.03, y * (1 - s) + Math.sin(time * 0.23 * speed + mote.phase * 2) * 0.05), Z0 + 0.1 + (y / slope) * s + Math.cos(time * 0.27 * speed + mote.phase) * 0.06);
        matrix.compose(at, quaternion.identity(), one.clone().multiplyScalar(mote.size)); motes.setMatrixAt(index, matrix);
      });
      motes.instanceMatrix.needsUpdate = true;
    };
    placeMotes(0); root.add(motes);

    // ---- chimney stack or water tank
    const stackTop = headroom(STACK.x);
    if (a.stack === 'tank') {
      const galv = std('#8f989c', { metalness: 0.5, roughness: 0.55 });
      for (const x of [-0.45, 0.45]) box([0.08, 0.1, 0.9], [STACK.x + x, 0.05, STACK.z], timber);
      box([1.1, 0.03, 0.9], [STACK.x, 0.115, STACK.z], timber);
      box([0.95, 0.62, 0.72], [STACK.x, 0.44, STACK.z], galv);
      box([1.0, 0.03, 0.77], [STACK.x, 0.765, STACK.z], std('#5f6a70', { metalness: 0.4, roughness: 0.6 }));
      const lagging = std('#d9d2bd', { roughness: 1 });
      const pipe = (points: P3[], radius: number, material: THREE.Material) => put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.1), 32, radius, 8), material);
      pipe([[STACK.x + 0.3, 0.62, STACK.z + 0.36], [STACK.x + 0.3, 0.62, STACK.z + 0.6], [STACK.x + 0.3, 0.06, STACK.z + 0.62], [STACK.x + 1.1, 0.06, STACK.z + 0.7], [STACK.x + 1.15, 0.06, Z0 + 0.1]], 0.035, lagging);
      pipe([[STACK.x - 0.2, 0.78, STACK.z], [STACK.x - 0.2, 1.3, STACK.z], [STACK.x - 0.5, 1.45, STACK.z - 0.3], [STACK.x - 0.7, 1.5, Z0 + 0.05]], 0.022, std('#b87a4a', { metalness: 0.6, roughness: 0.4 }));
    } else {
      const brick = new THREE.MeshStandardMaterial({ map: wallTexture.clone(), roughness: 0.95 }); brick.map!.repeat.set(0.75, stackTop + 0.4);
      brick.color.set('#c9b3a2'); box([0.86, stackTop + 0.4, 0.7], [STACK.x, (stackTop + 0.4) / 2, STACK.z], brick);
      box([0.98, 0.14, 0.82], [STACK.x, stackTop - 0.3, STACK.z], brick);
      const soot = put(new THREE.PlaneGeometry(0.5, stackTop * 0.75), new THREE.MeshBasicMaterial({ color: '#1c1814', transparent: true, opacity: mix(0.25, 0.55, mood.wear), depthWrite: false }), [STACK.x + 0.05, stackTop * 0.6, STACK.z + 0.356]); soot.castShadow = soot.receiveShadow = false;
      box([0.2, 0.24, 0.02], [STACK.x - 0.12, 0.42, STACK.z + 0.36], std('#2a2826', { metalness: 0.5, roughness: 0.6 }));
    }
    // the one thing leaning there
    const lean = new THREE.Group(); lean.position.set(STACK.x + 0.15, 0, STACK.z + (a.stack === 'tank' ? 0.62 : 0.5)); lean.rotation.x = -0.2; root.add(lean);
    if (a.relic === 'frames') {
      const gilt = std('#b9954a', { metalness: 0.6, roughness: 0.45 });
      for (let i = 0; i < 3; i++) { const w = 0.5 + random() * 0.4, h = 0.6 + random() * 0.5, g = new THREE.Group(); g.position.set((i - 1) * 0.16, 0, i * 0.05); g.rotation.z = (random() - 0.5) * 0.12; lean.add(g); for (const y of [0.03, h - 0.03]) box([w, 0.06, 0.03], [0, y, 0], gilt, g); for (const x of [-1, 1]) box([0.06, h, 0.03], [x * (w / 2 - 0.03), h / 2, 0], gilt, g); }
    } else if (a.relic === 'rug') {
      const rug = put(new THREE.CylinderGeometry(0.13, 0.13, 1.5, 16), std(pick(['#8a2f2a', '#2f4a6a', '#6a5a2a'])), [0.1, 0.75, 0.02], lean); rug.rotation.z = 0.12;
      for (const y of [0.4, 1.1]) { const tie = put(new THREE.TorusGeometry(0.133, 0.008, 5, 18), std('#e6dcc0'), [0.1 - (y - 0.75) * 0.12, y, 0.02], lean); tie.rotation.x = Math.PI / 2; }
      put(new THREE.CylinderGeometry(0.1, 0.1, 1.502, 16), std('#d9c9a0'), [0.1, 0.75, 0.02], lean).rotation.z = 0.12;
    } else if (a.relic === 'cot') {
      const paintWhite = std(mood.cheer > 0.5 ? '#f1ede2' : '#c9d6dc', { roughness: 0.6 });
      for (const y of [0.05, 0.8]) box([1.2, 0.05, 0.035], [0, y, 0], paintWhite, lean);
      for (let i = 0; i < 11; i++) put(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 6), paintWhite, [-0.55 + i * 0.11, 0.425, 0], lean);
    } else if (a.relic === 'mirror') {
      box([0.6, 1.4, 0.035], [0, 0.7, 0], std('#5a3a22', { roughness: 0.5 }), lean);
      box([0.5, 1.3, 0.01], [0, 0.7, 0.02], std('#aeb6b6', { metalness: 0.75, roughness: mix(0.12, 0.5, mood.wear) }), lean);
    }

    // ---- ladder hatch
    const hatch = new THREE.Group(); hatch.position.set(HATCH.x, 0, HATCH.z); root.add(hatch);
    const trim = std('#e3dccb', { roughness: 0.7 });
    for (const z of [-1, 1]) box([HATCH.w + 0.1, 0.05, 0.05], [0, 0.025, z * HATCH.d / 2], trim, hatch);
    for (const x of [-1, 1]) box([0.05, 0.05, HATCH.d + 0.1], [x * HATCH.w / 2, 0.025, 0], trim, hatch);
    const door = new THREE.Group(); hatch.add(door);
    const ladderMetal = std('#aeb4b6', { metalness: 0.6, roughness: 0.4 });
    const ladderPiece = (parent: THREE.Object3D, length: number) => { const g = new THREE.Group(); parent.add(g); for (const x of [-0.17, 0.17]) box([0.03, 0.05, length], [x, 0, 0], ladderMetal, g); for (let i = 0; i < Math.floor(length / 0.25); i++) box([0.34, 0.025, 0.06], [0, 0, -length / 2 + 0.14 + i * 0.25], ladderMetal, g); return g; };
    if (a.hatch === 'shut') {
      box([HATCH.w - 0.06, 0.03, HATCH.d - 0.06], [0, 0.03, 0], std('#d9d2bf'), door);
      for (let i = 0; i < 3; i++) ladderPiece(hatch, 0.9).position.set(0, 0.09 + i * 0.06, 0);
    } else {
      const glow = a.hatch === 'open';
      const well = put(new THREE.PlaneGeometry(HATCH.w - 0.05, HATCH.d - 0.05), new THREE.MeshBasicMaterial({ color: glow ? new THREE.Color('#ffd98a').lerp(new THREE.Color('#fff2d0'), mood.cheer) : new THREE.Color('#231c16') }), [0, 0.012, 0], hatch); well.rotation.x = -Math.PI / 2; well.castShadow = false;
      door.position.set(HATCH.w / 2 + 0.02, 0.05, 0); door.rotation.z = -1.25;
      box([HATCH.w - 0.06, 0.03, HATCH.d - 0.06], [(HATCH.w - 0.06) / 2, 0, 0], std('#d9d2bf'), door);
      const top = ladderPiece(hatch, 1.0); top.position.set(-0.03, 0.12, 0.12); top.rotation.x = 1.05;
      for (const x of [-0.17, 0.17]) { box([0.025, 0.6, 0.025], [x - 0.03, 0.3, -HATCH.d / 2 + 0.08], ladderMetal, hatch); }
      box([0.37, 0.025, 0.025], [-0.03, 0.6, -HATCH.d / 2 + 0.08], ladderMetal, hatch);
      if (glow) { const lamp = new THREE.PointLight('#ffcf80', 1.1, 4, 2); lamp.position.set(0, 0.25, 0); hatch.add(lamp); }
    }

    // ---- cardboard boxes receding along the eaves
    const cardboard = ['#b98f5c', '#a9844f', '#c49c69', '#9c7a4c', '#b08a5a', '#c9a676'];
    type Crate = { at: THREE.Vector3; size: THREE.Vector3; turn: THREE.Euler; colour: string; tape: boolean; label: boolean; open: boolean };
    const crates: Crate[] = [];
    const blocked = (x: number, z: number, r: number) =>
      SLOTS.some((slot) => Math.hypot(slot.x - x, slot.z - z) < slot.r + r + 0.12)
      || (Math.abs(x - HATCH.x) < HATCH.w / 2 + r + 0.5 && Math.abs(z - HATCH.z) < HATCH.d / 2 + r + 0.15)
      || (Math.abs(x - STACK.x) < 0.75 + r && Math.abs(z - STACK.z) < 0.95 + r)
      || (z < -0.3 && Math.abs(x - (WINDOW_X + drift * (z - Z0))) < 0.95 + r);
    const want = a.boxes === 'few' ? 4 : Math.round(mix(9, 22, mood.density));
    let tries = 0;
    while (crates.length < want * 2.2 && tries++ < 400) {
      const side = random() < 0.5 ? -1 : 1, x = side * (1.0 + random() * 1.45), z = Z0 + 0.45 + random() * (LEN - 0.9);
      if (blocked(x, z, 0.3)) continue;
      if (crates.some((crate) => crate.at.y < 0.4 && Math.hypot(crate.at.x - x, crate.at.z - z) < 0.62)) continue;
      const room = headroom(Math.abs(x) + 0.3) - 0.12;
      const levels = a.boxes === 'few' ? 1 : 1 + Math.floor(random() * 3);
      let y = Math.abs(x) > DECK ? 0.02 : 0;
      for (let level = 0; level < levels; level++) {
        const size = new THREE.Vector3(0.42 + random() * 0.2, 0.28 + random() * 0.18, 0.36 + random() * 0.16).multiplyScalar(1 - level * 0.08);
        if (y + size.y > room) break;
        const slump = a.boxes === 'slumped' ? 1 : 0;
        if (slump && level === 0) size.y *= 0.72;
        const tipped = a.boxes === 'ransacked' && level === levels - 1 && random() < 0.45;
        const turn = new THREE.Euler(slump * (random() - 0.5) * 0.14 * (level + 1), (random() - 0.5) * (a.boxes === 'orderly' ? 0.12 : 0.7), slump * (random() - 0.5) * 0.2 * (level + 1));
        const at = new THREE.Vector3(x + (random() - 0.5) * 0.06 * (level + slump), y + size.y / 2, z + (random() - 0.5) * 0.06);
        if (tipped) { turn.z = Math.PI / 2 * (x > 0 ? 1 : -1); at.set(x - Math.sign(x) * (0.35 + random() * 0.2), size.x / 2, z + (random() - 0.5) * 0.3); if (blocked(at.x, at.z, 0.25)) break; }
        crates.push({ at, size, turn, colour: pick(cardboard), tape: random() < 0.8, label: a.boxes === 'orderly' ? true : random() < 0.35, open: a.boxes === 'ransacked' && !tipped && level === levels - 1 && random() < 0.7 });
        if (tipped) break;
        y += size.y + 0.004;
      }
    }
    const crateMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std('#ffffff', { roughness: 0.92 }), crates.length);
    const tapeMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std('#dcc391', { roughness: 0.45 }), crates.length);
    const labelMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std('#efe9d8', { roughness: 0.8 }), crates.length);
    const flapMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std('#b08a5a', { roughness: 0.92 }), crates.length * 2);
    const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    const wearTint = new THREE.Color('#857560');
    crates.forEach((crate, index) => {
      quaternion.setFromEuler(crate.turn);
      matrix.compose(crate.at, quaternion, crate.size); crateMesh.setMatrixAt(index, matrix);
      crateMesh.setColorAt(index, new THREE.Color(crate.colour).lerp(wearTint, mood.wear * 0.45));
      const local = (offset: THREE.Vector3, size: THREE.Vector3, extra?: THREE.Quaternion) => matrix.compose(crate.at.clone().add(offset.applyQuaternion(quaternion)), extra ? quaternion.clone().multiply(extra) : quaternion, size);
      tapeMesh.setMatrixAt(index, crate.tape && !crate.open ? local(new THREE.Vector3(0, crate.size.y / 2 + 0.001, 0), new THREE.Vector3(crate.size.x + 0.004, 0.003, 0.055)) : hide);
      labelMesh.setMatrixAt(index, crate.label ? local(new THREE.Vector3((random() - 0.5) * 0.1, 0.02, crate.size.z / 2 + 0.001), new THREE.Vector3(crate.size.x * 0.45, crate.size.y * 0.32, 0.003)) : hide);
      for (const side of [-1, 1]) flapMesh.setMatrixAt(index * 2 + (side > 0 ? 1 : 0), crate.open ? local(new THREE.Vector3(0, crate.size.y / 2 + 0.08, side * (crate.size.z / 2 + 0.05)), new THREE.Vector3(crate.size.x, 0.006, crate.size.z * 0.48), new THREE.Quaternion().setFromEuler(new THREE.Euler(side * (0.9 + random() * 0.6), 0, 0))) : hide);
    });
    for (const mesh of [crateMesh, tapeMesh, labelMesh, flapMesh]) { mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); }
    if (a.boxes === 'ransacked') {
      const sheets = 26 + Math.round(mood.density * 30);
      const papers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.21, 0.002, 0.3), std('#f1ecdd', { roughness: 0.8 }), sheets);
      let placed = 0;
      for (let i = 0; i < sheets * 3 && placed < sheets; i++) { const x = (random() - 0.5) * DECK * 1.9, z = Z0 + 0.4 + random() * (LEN - 0.6); if (Math.abs(x - HATCH.x) < HATCH.w / 2 && Math.abs(z - HATCH.z) < HATCH.d / 2) continue; euler.set(0, random() * 6.283, 0); quaternion.setFromEuler(euler); matrix.compose(new THREE.Vector3(x, 0.003 + placed * 0.0004, z), quaternion, one); papers.setMatrixAt(placed, matrix); papers.setColorAt(placed, new THREE.Color(pick(['#f1ecdd', '#e6dcc0', '#d9d2c0', '#f6f2e8', '#cfd8dc']))); placed++; }
      papers.count = placed; papers.receiveShadow = true; root.add(papers);
    }

    // stands that lift small things out of the dust
    const stands = SLOTS.map((slot) => {
      const stand = new THREE.Group(); stand.visible = false; stand.position.set(slot.x, 0, slot.z);
      box([0.62, 0.42, 0.5], [0, 0.21, 0], std(new THREE.Color(pick(cardboard)).lerp(wearTint, mood.wear * 0.4)), stand);
      box([0.624, 0.003, 0.055], [0, 0.421, 0], std('#dcc391', { roughness: 0.45 }), stand);
      root.add(stand); return stand;
    });

    // ---- camera: down the length of the roof space, a little off the centre line
    const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 60);
    camera.position.set(-0.95, 1.72, 6.3);
    camera.lookAt(0.12, 1.42, -1.4);

    const place = (items: readonly Placeable[]) => {
      stands.forEach((stand) => { stand.visible = false; });
      items.forEach((item, index) => {
        const slotIndex = index % SLOTS.length, slot = SLOTS[slotIndex];
        const height = Math.max(item.height, 0.05), radius = Math.max(item.radius, 0.05);
        const fit = Math.min(slot.h / height, slot.r / radius);
        // True size when it fits under the rafters; shrunk when it does not; small things grow a little.
        const scale = Math.min(fit, Math.max(1, Math.min((slotIndex === 0 ? 1.0 : 0.7) / height, 3)));
        let y = 0;
        if (height * scale < 0.62 && radius * scale < 0.4) {
          const stand = stands[slotIndex]; stand.visible = true; stand.rotation.y = (context.random() - 0.5) * 0.5; y = 0.424;
        }
        item.holder.scale.setScalar(scale);
        item.holder.position.set(slot.x, y, slot.z);
        item.holder.rotation.y = Math.atan2(camera.position.x - slot.x, camera.position.z - slot.z) * 0.6 + (context.random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
      });
      camera.updateMatrixWorld(true);
    };

    return {
      object: root, camera, background, capacity: SLOTS.length, ground: deck, keyLight: key, place,
      update(_dt, time) { placeMotes(time); },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
