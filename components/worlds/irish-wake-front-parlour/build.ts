import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const texture = (canvas: HTMLCanvasElement, repeat: [number, number] = [1, 1]) => {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(...repeat);
  return map;
};

/** Wallpaper painted on a canvas, faded and damp-stained by wear, darkened at the top by years of smoke. */
function wallpaper(random: () => number, kind: 'rose' | 'brown' | 'green' | 'distemper', wear: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const base = { rose: '#e8d4cc', brown: '#e2d3b8', green: '#e6e2d0', distemper: '#e4ddcb' }[kind];
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  if (kind === 'rose') {
    ctx.fillStyle = '#d9a9a4';
    for (let x = 0; x < 256; x += 32) ctx.fillRect(x, 0, 12, 256);
    ctx.fillStyle = 'rgba(160,110,110,0.5)';
    for (let x = 16; x < 256; x += 32) ctx.fillRect(x, 0, 2, 256);
  } else if (kind === 'brown') {
    for (let y = 16; y < 256; y += 48) for (let x = (y / 48) % 2 ? 40 : 16; x < 256; x += 48) {
      ctx.fillStyle = '#9a6a4a';
      for (let p = 0; p < 6; p++) {
        ctx.beginPath();
        ctx.arc(x + Math.cos(p * 1.047) * 7, y + Math.sin(p * 1.047) * 7, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#6f6a40';
      ctx.fillRect(x - 2, y + 12, 4, 14);
    }
  } else if (kind === 'green') {
    ctx.strokeStyle = '#7a9a7a';
    ctx.lineWidth = 3;
    for (let d = -256; d < 512; d += 40) {
      ctx.beginPath();
      ctx.moveTo(d, 0);
      ctx.lineTo(d + 256, 256);
      ctx.moveTo(d + 256, 0);
      ctx.lineTo(d, 256);
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = `rgba(120,110,90,${random() * 0.08})`;
      ctx.fillRect(random() * 256, random() * 256, 4, 4);
    }
  }
  // Fading toward the ceiling, smoke above, damp near the floor.
  const smoke = ctx.createLinearGradient(0, 0, 0, 256);
  smoke.addColorStop(0, `rgba(70,50,30,${0.15 + wear * 0.35})`);
  smoke.addColorStop(0.45, 'rgba(70,50,30,0)');
  smoke.addColorStop(0.85, 'rgba(60,60,50,0)');
  smoke.addColorStop(1, `rgba(60,70,60,${wear * 0.4})`);
  ctx.fillStyle = smoke;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < Math.round(wear * 7); i++) {
    ctx.fillStyle = 'rgba(90,80,60,0.25)';
    ctx.beginPath();
    ctx.ellipse(random() * 256, 200 + random() * 56, 14 + random() * 20, 8 + random() * 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

function linoCanvas(random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const a = random() < 0.5 ? '#a87a6a' : '#7a8f80', b = '#cfc4a6';
  ctx.fillStyle = b;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = a;
  ctx.globalAlpha = 0.7;
  for (let y = 0; y < 128; y += 32) for (let x = 0; x < 128; x += 32) {
    if (((x + y) / 32) % 2) ctx.fillRect(x + 2, y + 2, 28, 28);
    else ctx.fillRect(x + 12, y + 12, 8, 8);
  }
  ctx.globalAlpha = 1;
  return canvas;
}

/** A dial with the hands stopped at the hour of death. */
function clockFace(hour: number, minute: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f1e8d2';
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2320';
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(64 + Math.sin(angle) * 50, 64 - Math.cos(angle) * 50);
    ctx.lineTo(64 + Math.sin(angle) * 56, 64 - Math.cos(angle) * 56);
    ctx.stroke();
  }
  const hand = (angle: number, length: number, width: number) => {
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.lineTo(64 + Math.sin(angle) * length, 64 - Math.cos(angle) * length);
    ctx.stroke();
  };
  hand(((hour % 12) / 12 + minute / 720) * Math.PI * 2, 30, 5);
  hand((minute / 60) * Math.PI * 2, 46, 3);
  return canvas;
}

/** The holy picture: a robed shape and its emblem, never a face. */
function holyPicture(kind: 'heart' | 'madonna' | 'pope') {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = kind === 'madonna' ? '#2c3a5a' : '#3a2a22';
  ctx.fillRect(0, 0, 96, 128);
  const rays = ctx.createRadialGradient(48, 60, 4, 48, 60, 60);
  rays.addColorStop(0, 'rgba(255,230,160,0.55)');
  rays.addColorStop(1, 'rgba(255,230,160,0)');
  ctx.fillStyle = rays;
  ctx.fillRect(0, 0, 96, 128);
  ctx.fillStyle = { heart: '#b8372a', madonna: '#5a7ac8', pope: '#efe9dc' }[kind];
  ctx.beginPath();
  ctx.moveTo(48, 128);
  ctx.lineTo(16, 128);
  ctx.lineTo(28, 52);
  ctx.lineTo(68, 52);
  ctx.lineTo(80, 128);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8c9a8';
  ctx.beginPath();
  ctx.ellipse(48, 38, 12, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e9c45a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(48, 36, 19, 0, Math.PI * 2);
  ctx.stroke();
  if (kind === 'heart') {
    ctx.fillStyle = '#ff5a4a';
    ctx.beginPath();
    ctx.moveTo(48, 92);
    ctx.bezierCurveTo(30, 74, 36, 60, 48, 70);
    ctx.bezierCurveTo(60, 60, 66, 74, 48, 92);
    ctx.fill();
    ctx.fillStyle = '#ffd36a';
    ctx.fillRect(46, 58, 4, 14);
  }
  if (kind === 'pope') {
    ctx.fillStyle = '#efe9dc';
    ctx.beginPath();
    ctx.arc(48, 26, 9, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

export default defineWorld({
  questions: {
    hour: choice('What hour of the wake is it?', {
      evening: 'Early evening: the house just filling, the fire built up high, the curtains newly drawn.',
      night: 'The long middle of the night: candles burned half down, the fire sunk to embers, whispering.',
      dawn: 'Grey dawn showing at the curtain edges, the last few still sitting, the candles guttering.',
    }),
    wallpaper: choice('What is on the walls?', {
      rose: 'Faded rose-pink stripes on cream.',
      brown: 'Brown and cream floral, nicotine-dark toward the ceiling.',
      green: 'A green trellis pattern on cream.',
      distemper: 'No paper at all: pale distemper, chalky and plain.',
    }),
    floor: choice('What is underfoot?', {
      flags: 'Grey flagstones with a rag rug at the hearth.',
      lino: 'Patterned lino, worn through at the door.',
      boards: 'Bare scrubbed boards.',
    }),
    coffin: choice('What is the coffin like?', {
      deal: 'Plain pale deal with brass handles, the cheap one.',
      oak: 'Dark polished oak, a good coffin.',
      draped: 'Draped in a white sheet with a crucifix laid on top.',
    }),
    picture: choice('What holy picture hangs on the wall?', {
      heart: 'The Sacred Heart with its small red lamp burning below.',
      madonna: 'The Madonna in blue.',
      pope: 'A framed Pope in white.',
      crucifix: 'A plain wooden crucifix, no picture.',
    }),
    table: choice('What has been laid on the side table?', {
      sandwiches: 'Plates of sandwiches under tea towels and a stack of cups.',
      drink: 'Bottles of stout and whiskey with a row of small glasses.',
      nothing: 'Nothing yet: the food is still in the kitchen.',
    }),
    state: choice('What state is the room in?', {
      tidy: 'Tidy and ready: chairs lined straight along the walls, nothing out of place.',
      mid: 'Mid-wake: coats over chair backs, cups on the floor, chairs pulled round to talk.',
      after: 'The morning after: chairs pushed back anyhow, glasses and plates on every surface.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const night = a.hour === 'night' ? 1 : a.hour === 'dawn' ? 0.6 : 0.3;
    const W = 7.6, D = 6.2;
    const floorColour = { flags: '#8d8a82', lino: '#c9bd9c', boards: '#a88a62' }[a.floor];
    const { art: s, world } = diorama(context, {
      background: a.hour === 'evening' ? '#d8d0c2' : a.hour === 'night' ? '#c6bdb0' : '#d3d2cc',
      floor: floorColour, width: W, depth: D, maxHeight: 2.1, radius: 1.1, pitch: 30, yaw: 26,
      slots: [[-1.8, -1.85], [-2.45, 1.55], [1.5, 0.3], [2.45, 2.05], [0.1, 2.05], [-1.2, 2.55]],
    });
    const root = s.root;
    // The candles do the lighting at night; the day's key light steps back.
    if (world.keyLight) world.keyLight.intensity *= mix(1, 0.45, night);
    for (const light of root.children) if ((light as THREE.HemisphereLight).isHemisphereLight) (light as THREE.HemisphereLight).intensity *= mix(1, 0.6, night);

    const wall = s.material('#ffffff', { map: texture(wallpaper(random, a.wallpaper, mood.wear), [5, 1]), roughness: 0.95 });
    const wallSide = s.material('#ffffff', { map: texture(wallpaper(random, a.wallpaper, mood.wear), [4, 1]), roughness: 0.95 });
    const darkWood = s.material('#3d2a1c', { roughness: 0.5 });
    const wood = s.material(pick(['#7a5a3a', '#8a6a44', '#5e4630']), { roughness: 0.7 });
    const brass = s.material('#c2a35a', { metalness: 0.75, roughness: 0.3 });
    const white = s.material('#efeae0', { roughness: 0.9 });
    const china = s.material('#f1ece0', { roughness: 0.4 });
    const H = 2.75;

    // ---- walls, skirting, picture rail
    s.box([W, H, 0.2], [0, H / 2, -D / 2 - 0.1], wall);
    s.box([0.2, H, D + 0.2], [-W / 2 - 0.1, H / 2, 0], wallSide);
    s.box([W, 0.16, 0.03], [0, 0.08, -D / 2 + 0.015], darkWood);
    s.box([0.03, 0.16, D], [-W / 2 + 0.015, 0.08, 0], darkWood);
    s.box([W, 0.05, 0.04], [0, 2.25, -D / 2 + 0.02], darkWood);
    s.box([0.04, 0.05, D], [-W / 2 + 0.02, 2.25, 0], darkWood);
    // Floor: flags, lino or boards, and a rag rug at the hearth.
    if (a.floor === 'flags') {
      const flag = new THREE.BoxGeometry(1, 0.02, 1);
      const stones: { at: [number, number, number]; size: number; color?: string }[] = [];
      for (let x = -W / 2 + 0.45; x < W / 2; x += 0.9) for (let z = -D / 2 + 0.45; z < D / 2; z += 0.9)
        stones.push({ at: [x + (random() - 0.5) * 0.04, 0.01, z + (random() - 0.5) * 0.04], size: 0.84, color: pick(['#8c8a84', '#9a968e', '#7e7c76', '#a09c92']) });
      s.scatter(flag, s.material('#ffffff', { roughness: 1 }), stones);
    } else if (a.floor === 'lino') {
      s.mesh(new THREE.PlaneGeometry(W - 0.1, D - 0.1), s.material('#ffffff', { map: texture(linoCanvas(random), [10, 8]), roughness: 0.6 }), [0, 0.012, 0]).rotation.x = -Math.PI / 2;
    } else {
      const board = new THREE.BoxGeometry(1, 0.02, 1);
      const boards: { at: [number, number, number]; size: number; color?: string }[] = [];
      for (let x = -W / 2 + 0.1; x < W / 2; x += 0.2) boards.push({ at: [x, 0.01, 0], size: 1, color: pick(['#a88a62', '#9c7e58', '#b2946a']) });
      const mesh = s.scatter(board, s.material('#ffffff', { roughness: 0.8 }), boards);
      const m = new THREE.Matrix4();
      boards.forEach((b, i) => { m.makeScale(0.19, 1, D - 0.1).setPosition(...b.at); mesh.setMatrixAt(i, m); });
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (a.floor !== 'lino') {
      const rug = s.mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.02, 24), s.material(pick(['#7a4a3a', '#4a5a6a', '#6a5a3a']), { roughness: 1 }), [-2.6, 0.03, 0.45]);
      rug.scale.z = 0.7;
    }

    // ---- fireplace on the left wall, mantel, stopped clock, the mirror turned to the wall
    const fx = -W / 2 + 0.2, fz = 0.45;
    const stone = s.material(pick(['#d8d2c4', '#4a4a4c', '#8a7a6a']), { roughness: 0.9 });
    s.box([0.3, 1.25, 1.5], [fx, 0.625, fz], stone);
    s.box([0.26, 0.75, 0.9], [fx + 0.04, 0.4, fz], s.material('#1a1612', { roughness: 1 }));
    s.box([0.4, 0.06, 1.7], [fx + 0.05, 1.28, fz], darkWood);
    s.box([0.7, 0.03, 1.5], [fx + 0.2, 0.015, fz], stone);
    const fireHeat = { evening: 1, night: 0.4, dawn: 0.12 }[a.hour];
    const ember = new THREE.MeshStandardMaterial({ color: '#2a1a10', emissive: new THREE.Color().setHSL(0.06, 1, 0.45), emissiveIntensity: mix(0.3, 2.2, fireHeat) });
    s.box([0.2, 0.18, 0.6], [fx + 0.08, 0.1, fz], ember);
    const flameMat = new THREE.MeshStandardMaterial({ color: '#ffb060', emissive: '#ff8a30', emissiveIntensity: 2.2, transparent: true, opacity: 0.85, depthWrite: false });
    const flames: THREE.Mesh[] = [];
    if (fireHeat > 0.3) for (let i = 0; i < 4; i++) {
      const flame = s.ball([0.05, 0.14 * fireHeat, 0.07], [fx + 0.08, 0.2 + 0.1 * fireHeat, fz - 0.22 + i * 0.15], flameMat, 8);
      flames.push(flame);
    }
    const fireLight = new THREE.PointLight('#ff9a40', mix(0.4, 3.5, fireHeat) * mix(0.6, 1.4, night), 4.5, 2);
    fireLight.position.set(fx + 0.3, 0.5, fz);
    root.add(fireLight);
    // Mantel: the stopped clock, a pair of china dogs, the mirror's blank back.
    s.box([0.12, 0.3, 0.28], [fx + 0.05, 1.46, fz], darkWood);
    const face = s.mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshStandardMaterial({ map: texture(clockFace(3 + Math.floor(random() * 9), Math.floor(random() * 60))), roughness: 0.8 }), [fx + 0.115, 1.48, fz]);
    face.rotation.y = Math.PI / 2;
    for (const z of [-0.6, 0.6]) {
      s.ball([0.07, 0.11, 0.07], [fx + 0.05, 1.42, fz + z], china, 10);
      s.ball([0.05, 0.05, 0.05], [fx + 0.07, 1.55, fz + z], china, 8);
    }
    s.box([0.04, 0.6, 0.8], [fx + 0.17, 1.95, fz], s.material('#8a6a4a', { roughness: 1 }));
    s.box([0.05, 0.64, 0.84], [fx + 0.165, 1.95, fz], darkWood).scale.set(0.8, 1, 1);
    s.rod([fx + 0.17, 2.25, fz - 0.3], [fx + 0.15, 2.5, fz], 0.004, darkWood);
    s.rod([fx + 0.17, 2.25, fz + 0.3], [fx + 0.15, 2.5, fz], 0.004, darkWood);

    // ---- the coffin on trestles along the back wall, head to the left
    const cx = 0.35, cz = -2.25, lift = 0.56;
    for (const tx of [cx - 0.55, cx + 0.6]) {
      for (const side of [-1, 1]) s.rod([tx, 0.02, cz + side * 0.42], [tx, lift, cz + side * 0.1], 0.025, wood);
      s.box([0.06, 0.05, 0.7], [tx, 0.3, cz], wood);
      s.box([0.08, 0.04, 0.5], [tx, lift, cz], wood);
    }
    const outline = new THREE.Shape([[-0.95, -0.2], [-0.42, -0.32], [1.0, -0.18], [1.0, 0.18], [-0.42, 0.32], [-0.95, 0.2]].map(([x, y]) => new THREE.Vector2(x, y)));
    const coffinMat = a.coffin === 'deal' ? s.material('#c9a97a', { roughness: 0.6 }) : a.coffin === 'oak' ? s.material('#3a2214', { roughness: 0.25 }) : white;
    const body = s.mesh(new THREE.ExtrudeGeometry(outline, { depth: 0.4, bevelEnabled: false }), coffinMat, [cx, lift + 0.03, cz]);
    body.rotation.x = -Math.PI / 2;
    const lidShape = new THREE.ExtrudeGeometry(outline, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 2 });
    const lid = s.mesh(lidShape, coffinMat, [cx, lift + 0.43, cz]);
    lid.rotation.x = -Math.PI / 2;
    if (a.coffin === 'draped') {
      s.box([0.42, 0.03, 0.035], [cx - 0.1, lift + 0.52, cz], darkWood);
      s.box([0.035, 0.03, 0.22], [cx - 0.24, lift + 0.52, cz], darkWood);
      s.box([2.0, 0.2, 0.85], [cx + 0.02, lift + 0.1, cz], white);
    } else {
      for (const side of [-1, 1]) for (const hx of [-0.6, 0, 0.6]) s.cylinder(0.02, 0.02, 0.18, [cx + hx, lift + 0.2, cz + side * (0.28 - Math.abs(hx) * 0.08)], brass, 8).rotation.z = Math.PI / 2;
    }
    // Two tall candles at the head of the coffin.
    const candleLength = { evening: 0.42, night: 0.24, dawn: 0.08 }[a.hour];
    const flameColour = new THREE.Color().setHSL(mix(0.13, 0.07, mood.warmth), 1, 0.6);
    const candleFlames: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      const px = cx - 1.25, pz = cz + side * 0.5;
      s.cylinder(0.1, 0.13, 0.04, [px, 0.02, pz], brass, 16);
      s.cylinder(0.018, 0.025, 1.0, [px, 0.54, pz], brass, 10);
      s.cylinder(0.07, 0.05, 0.03, [px, 1.05, pz], brass, 12);
      s.cylinder(0.028, 0.03, candleLength, [px, 1.07 + candleLength / 2, pz], s.material('#f3ead2', { roughness: 0.7 }), 12);
      candleFlames.push(s.ball([0.02, 0.05, 0.02], [px, 1.1 + candleLength, pz], new THREE.MeshStandardMaterial({ color: '#fff1c0', emissive: flameColour, emissiveIntensity: mix(1, 2.2, night), transparent: true, opacity: 0.92, depthWrite: false }), 10));
    }
    const candleLight = new THREE.PointLight(flameColour, mix(1.2, 6, night), 5.5, 2);
    candleLight.position.set(cx - 1.1, 1.3, cz + 0.5);
    root.add(candleLight);

    // ---- the window above the coffin, curtains drawn
    const wx = 0.5, wz = -D / 2 + 0.02;
    const curtain = s.material(pick(['#6a3a3a', '#3a4a3a', '#5a4a6a']), { roughness: 1 });
    s.box([1.5, 0.12, 0.12], [wx, 2.15, wz + 0.06], darkWood);
    for (const side of [-1, 1]) s.box([0.62, 1.25, 0.08], [wx + side * 0.33, 1.5, wz + 0.05], curtain);
    const dayGlow = { evening: 0.25, night: 0.05, dawn: 1 }[a.hour];
    s.box([0.03, 1.2, 0.02], [wx, 1.5, wz + 0.03], new THREE.MeshStandardMaterial({ color: '#dfe6f0', emissive: a.hour === 'dawn' ? '#e8e2c8' : '#9ab0d0', emissiveIntensity: dayGlow * 1.8 }));
    s.box([1.3, 0.04, 0.02], [wx, 0.86, wz + 0.03], new THREE.MeshStandardMaterial({ color: '#dfe6f0', emissive: a.hour === 'dawn' ? '#e8e2c8' : '#9ab0d0', emissiveIntensity: dayGlow * 1.2 }));

    // ---- the holy picture with its palm frond, and the lamp beneath
    const px = -2.3, py = 1.8, pz = -D / 2 + 0.02;
    if (a.picture === 'crucifix') {
      s.box([0.05, 0.6, 0.04], [px, py, pz + 0.02], darkWood);
      s.box([0.36, 0.05, 0.04], [px, py + 0.12, pz + 0.02], darkWood);
      s.ball([0.03, 0.05, 0.03], [px, py + 0.02, pz + 0.045], s.material('#d9c9a1', { metalness: 0.4, roughness: 0.4 }), 8);
    } else {
      s.box([0.62, 0.8, 0.04], [px, py, pz + 0.02], s.material('#b8963a', { metalness: 0.6, roughness: 0.35 }));
      s.mesh(new THREE.PlaneGeometry(0.5, 0.68), new THREE.MeshStandardMaterial({ map: texture(holyPicture(a.picture)), roughness: 0.85 }), [px, py, pz + 0.045]);
      if (a.picture === 'heart') {
        s.cylinder(0.035, 0.03, 0.08, [px, py - 0.56, pz + 0.08], new THREE.MeshStandardMaterial({ color: '#a01818', emissive: '#ff2a1a', emissiveIntensity: mix(0.6, 1.6, night), transparent: true, opacity: 0.85, depthWrite: false }), 10);
        s.box([0.14, 0.03, 0.12], [px, py - 0.62, pz + 0.06], darkWood);
      }
    }
    const frond = s.box([0.05, 0.7, 0.01], [px + 0.28, py + 0.25, pz + 0.05], s.material('#8a9a5a', { roughness: 1 }));
    frond.rotation.z = -0.35;

    // ---- the dresser of delph on the back wall, right
    const dx = 2.45, dz = -D / 2 + 0.3;
    s.box([1.4, 0.9, 0.55], [dx, 0.45, dz], wood);
    s.box([1.44, 0.04, 0.6], [dx, 0.92, dz], darkWood);
    for (const kx of [-0.33, 0.33]) {
      s.box([0.55, 0.5, 0.02], [dx + kx, 0.38, dz + 0.285], darkWood);
      s.ball([0.02, 0.02, 0.02], [dx + kx, 0.38, dz + 0.3], brass, 8);
      s.box([0.55, 0.14, 0.02], [dx + kx, 0.78, dz + 0.285], darkWood);
    }
    s.box([1.4, 1.3, 0.28], [dx, 1.59, dz - 0.13], wood);
    s.box([1.4, 0.06, 0.34], [dx, 2.27, dz - 0.1], darkWood);
    const plate = new THREE.CylinderGeometry(0.11, 0.11, 0.012, 20);
    const plateCanvas = document.createElement('canvas');
    plateCanvas.width = plateCanvas.height = 64;
    const pc = plateCanvas.getContext('2d')!;
    pc.fillStyle = '#f4f1e8';
    pc.fillRect(0, 0, 64, 64);
    pc.strokeStyle = '#3a5aa0';
    pc.lineWidth = 4;
    pc.beginPath();
    pc.arc(32, 32, 24, 0, Math.PI * 2);
    pc.stroke();
    pc.lineWidth = 2;
    pc.beginPath();
    pc.arc(32, 32, 12, 0, Math.PI * 2);
    pc.stroke();
    const plateMat = new THREE.MeshStandardMaterial({ map: texture(plateCanvas), roughness: 0.4 });
    const plates: { at: [number, number, number]; size: number }[] = [];
    for (let shelf = 0; shelf < 3; shelf++) {
      s.box([1.3, 0.025, 0.24], [dx, 1.05 + shelf * 0.4, dz - 0.13], darkWood);
      s.box([1.3, 0.02, 0.02], [dx, 1.12 + shelf * 0.4, dz - 0.02], darkWood);
      for (let i = 0; i < 5; i++) plates.push({ at: [dx - 0.52 + i * 0.26, 1.18 + shelf * 0.4, dz - 0.14 + (shelf === 1 ? 0.02 : 0)], size: 1 });
    }
    const rack = s.scatter(plate, plateMat, plates);
    const pm = new THREE.Matrix4();
    plates.forEach((p, i) => { pm.makeRotationX(Math.PI / 2 - 0.15).setPosition(...p.at); rack.setMatrixAt(i, pm); });
    rack.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 4; i++) {
      s.lathe([[0.02, 0], [0.05, 0.01], [0.055, 0.08], [0.04, 0.11], [0.045, 0.12], [0.001, 0.12]], i % 2 ? china : s.material(pick(['#8a5a3a', '#3a6a8a']), { roughness: 0.4 }), [dx - 0.45 + i * 0.3, 0.96, dz + 0.1]);
    }

    // ---- kitchen chairs lined along the walls, pulled round or pushed back by the hour
    const chairs: { x: number; z: number; turn: number }[] = [];
    for (const z of [-2.2, -1.5, 1.7, 2.4]) chairs.push({ x: -W / 2 + 0.45, z, turn: Math.PI / 2 });
    for (const z of [-1.6, -0.8, 0.0, 0.8]) chairs.push({ x: W / 2 - 0.45, z, turn: -Math.PI / 2 });
    chairs.push({ x: 1.7, z: D / 2 - 0.4, turn: Math.PI });
    const askew = { tidy: 0.05, mid: 0.45, after: 1.0 }[a.state];
    const chairMat = s.material(pick(['#6b4a2e', '#8a6a44', '#4e3a28']), { roughness: 0.7 });
    const coatColours = ['#2a2a30', '#4a3f33', '#3a3a3c', '#5a4a3a', '#1f2a3a'];
    for (const chair of chairs) {
      const g = new THREE.Group();
      const mk = (size: [number, number, number], at: [number, number, number], material = chairMat) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
        mesh.position.set(...at);
        mesh.castShadow = mesh.receiveShadow = true;
        g.add(mesh);
        return mesh;
      };
      for (const x of [-1, 1]) for (const z of [-1, 1]) mk([0.035, 0.45, 0.035], [x * 0.19, 0.225, z * 0.19]);
      mk([0.44, 0.03, 0.44], [0, 0.465, 0]);
      for (const x of [-1, 1]) mk([0.035, 0.5, 0.035], [x * 0.19, 0.72, -0.19]);
      for (let i = 0; i < 3; i++) mk([0.36, 0.05, 0.02], [0, 0.62 + i * 0.14, -0.19]);
      if (a.state !== 'tidy' && random() < 0.5) mk([0.46, 0.42, 0.14], [0, 0.78, -0.24], s.material(pick(coatColours), { roughness: 1 }));
      const push = a.state === 'after' ? (random() - 0.5) * 0.7 : a.state === 'mid' ? (random() - 0.5) * 0.3 : 0;
      g.position.set(chair.x + Math.sin(chair.turn) * -push, 0, chair.z + Math.cos(chair.turn) * -push);
      g.rotation.y = chair.turn + (random() - 0.5) * 2 * askew;
      root.add(g);
      if (a.state !== 'tidy' && random() < 0.6) {
        const cupAt: [number, number, number] = [g.position.x + Math.sin(g.rotation.y) * 0.4 + (random() - 0.5) * 0.2, 0.04, g.position.z + Math.cos(g.rotation.y) * 0.4 + (random() - 0.5) * 0.2];
        s.cylinder(0.055, 0.055, 0.005, [cupAt[0], 0.015, cupAt[2]], china, 14);
        s.cylinder(0.035, 0.028, 0.05, cupAt, china, 12);
      }
    }

    // ---- the side table with the food or the drink
    const tx = 2.9, tz = 1.0;
    s.box([0.9, 0.06, 0.55], [tx, 0.72, tz], wood);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.05, 0.7, 0.05], [tx + x * 0.4, 0.35, tz + z * 0.22], wood);
    s.box([0.96, 0.01, 0.6], [tx, 0.755, tz], white);
    if (a.table === 'sandwiches') {
      for (let i = 0; i < 3; i++) {
        s.cylinder(0.14, 0.12, 0.012, [tx - 0.25 + i * 0.26, 0.77, tz + (i % 2 ? 0.1 : -0.08)], china, 20);
        s.box([0.26, 0.09, 0.24], [tx - 0.25 + i * 0.26, 0.82, tz + (i % 2 ? 0.1 : -0.08)], s.material(pick(['#efeae0', '#dfe5ea']), { roughness: 1 }));
      }
      for (let i = 0; i < 6; i++) s.lathe([[0.01, 0], [0.03, 0.003], [0.036, 0.03], [0.038, 0.05], [0.032, 0.012], [0.01, 0.006]], china, [tx + 0.38, 0.76 + i * 0.045, tz - 0.15]);
    } else if (a.table === 'drink') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false });
      const amber = s.material('#c8832c', { roughness: 0.2, emissive: '#5a2e08', emissiveIntensity: 0.3 });
      for (let i = 0; i < 4; i++) s.cylinder(0.027, 0.029, 0.2, [tx - 0.36 + i * 0.1, 0.86, tz - 0.14], s.material('#2a1a12', { roughness: 0.25 }), 10);
      s.cylinder(0.034, 0.036, 0.19, [tx + 0.3, 0.855, tz - 0.12], glass, 14);
      s.cylinder(0.031, 0.033, 0.1, [tx + 0.3, 0.81, tz - 0.12], amber, 14);
      s.cylinder(0.013, 0.02, 0.07, [tx + 0.3, 0.985, tz - 0.12], glass, 10);
      for (let i = 0; i < 7; i++) {
        const gx = tx - 0.36 + i * 0.12, gz = tz + 0.14;
        const tipped = a.state === 'after' && i % 3 === 1;
        const g = s.cylinder(0.02, 0.016, 0.05, [gx, tipped ? 0.78 : 0.785, gz], glass, 10);
        if (tipped) g.rotation.set(Math.PI / 2, 0, random());
        else if (a.state !== 'after') s.cylinder(0.017, 0.014, 0.02, [gx, 0.772, gz], amber, 10);
      }
    }
    if (a.state === 'after') {
      for (let i = 0; i < 5; i++) {
        const sx = tx - 0.6 + random() * 1.2, sz = tz + 0.5 + random() * 0.6;
        s.cylinder(0.08, 0.07, 0.01, [sx, 0.006, sz], china, 16);
      }
      s.cylinder(0.027, 0.029, 0.2, [1.0, 0.03, 1.6], s.material('#2a1a12', { roughness: 0.25 }), 10).rotation.set(Math.PI / 2, 0, 0.8);
    }

    // Candle and fire flicker breathe with the scene's energy.
    const flicker = mix(0.04, 0.3, mood.energy);
    const place = world.place;
    world.place = (items: readonly Placeable[]) => {
      place(items);
      // A parlour keeps people and furniture near true size rather than scaling everything to fill.
      for (const item of items) item.holder.scale.setScalar(Math.min(1.35, Math.max(0.8, item.holder.scale.x)));
    };
    world.update = (_dt, time) => {
      candleFlames.forEach((flame, i) => { flame.scale.y = 0.05 * (1 + Math.sin(time * 15 + i) * flicker + Math.sin(time * 6.3 + i * 2) * flicker * 0.5); });
      flames.forEach((flame, i) => { flame.scale.y = 0.14 * fireHeat * (1 + Math.sin(time * 11 + i * 1.7) * flicker * 1.5); flame.position.y = 0.2 + 0.1 * fireHeat + Math.sin(time * 9 + i) * 0.02 * flicker; });
      candleLight.intensity = mix(1.2, 6, night) * (1 + Math.sin(time * 13) * flicker * 0.3);
      fireLight.intensity = mix(0.4, 3.5, fireHeat) * mix(0.6, 1.4, night) * (1 + Math.sin(time * 8) * flicker * 0.4);
    };
    return world;
  },
});
