import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number, pick: (hues: string[]) => string) => void;

const FLAGS = {
  tricolour: 'Three bold national bars, a country that no longer exists.',
  agency: 'White with a blue roundel and a swooping orbit, an official space agency.',
  corporate: 'Black with an orange chevron logo: a mining company claim.',
  survey: 'Orange and white checks, a plain surveyor’s marker with no nation at all.',
  crew: 'A bedsheet hand-painted with a sun and the crew’s handprints.',
  memorial: 'Plain black with a single white star, flown for someone who did not come back.',
  blank: 'Blank white, whatever it once showed long gone.',
} as const;

const DESIGNS: Record<keyof typeof FLAGS, Painter> = {
  tricolour(ctx, w, h, pick) {
    const sets = [['#1b7f86', '#f4f1e8', '#6a2f7a'], ['#1f2f6b', '#f2c230', '#1f2f6b'], ['#b3202c', '#f4f1e8', '#17685a'], ['#e06a1c', '#f4f1e8', '#1f3a93']];
    const bars = sets[Math.floor(Number(pick(['0', '1', '2', '3'])))], upright = pick(['a', 'b']) === 'a';
    bars.forEach((bar, i) => { ctx.fillStyle = bar; if (upright) ctx.fillRect((i * w) / 3, 0, w / 3 + 1, h); else ctx.fillRect(0, (i * h) / 3, w, h / 3 + 1); });
    // An invented emblem, so it is nobody's real flag.
    ctx.strokeStyle = bars[0] === bars[2] ? bars[0] : '#f2c230'; ctx.lineWidth = h * 0.06;
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.5, h * 0.2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.5, h * 0.07, 0, Math.PI * 2); ctx.fill();
  },
  agency(ctx, w, h) {
    ctx.fillStyle = '#f4f2ea'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1d4fa3'; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.5, h * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d6332a'; ctx.lineWidth = h * 0.05; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.5, h * 0.46, h * 0.14, -0.5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f4f2ea'; for (const [x, y] of [[0.44, 0.4], [0.55, 0.56], [0.5, 0.47], [0.57, 0.38]]) { ctx.beginPath(); ctx.arc(w * x, h * y, h * 0.022, 0, Math.PI * 2); ctx.fill(); }
  },
  corporate(ctx, w, h) {
    ctx.fillStyle = '#18181b'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f07a1a'; ctx.lineWidth = h * 0.13; ctx.lineJoin = 'miter';
    for (const lift of [0, 0.26]) { ctx.beginPath(); ctx.moveTo(w * 0.28, h * (0.62 + lift)); ctx.lineTo(w * 0.5, h * (0.3 + lift)); ctx.lineTo(w * 0.72, h * (0.62 + lift)); ctx.stroke(); }
    ctx.fillStyle = '#f07a1a'; ctx.fillRect(0, h * 0.92, w, h * 0.08);
  },
  survey(ctx, w, h) {
    for (let x = 0; x < 4; x++) for (let y = 0; y < 2; y++) { ctx.fillStyle = (x + y) % 2 ? '#f4f1e8' : '#f0641e'; ctx.fillRect((x * w) / 4, (y * h) / 2, w / 4 + 1, h / 2 + 1); }
  },
  crew(ctx, w, h, pick) {
    ctx.fillStyle = '#efe9d8'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f0b429'; ctx.beginPath(); ctx.arc(w * 0.3, h * 0.48, h * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f0b429'; ctx.lineWidth = h * 0.035;
    for (let i = 0; i < 10; i++) { const t = (i * Math.PI) / 5; ctx.beginPath(); ctx.moveTo(w * 0.3 + Math.cos(t) * h * 0.26, h * 0.48 + Math.sin(t) * h * 0.26); ctx.lineTo(w * 0.3 + Math.cos(t) * h * 0.36, h * 0.48 + Math.sin(t) * h * 0.36); ctx.stroke(); }
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = pick(['#c8102e', '#1f3a93', '#0b6e4f', '#7a35c2', '#d6532a']);
      const x = w * (0.58 + (i % 3) * 0.13), y = h * (0.3 + Math.floor(i / 3) * 0.42);
      ctx.beginPath(); ctx.ellipse(x, y + h * 0.05, h * 0.07, h * 0.085, 0, 0, Math.PI * 2); ctx.fill();
      for (let f = 0; f < 4; f++) ctx.fillRect(x - h * 0.065 + f * h * 0.036, y - h * 0.14, h * 0.024, h * 0.13);
    }
  },
  memorial(ctx, w, h) {
    ctx.fillStyle = '#141416'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f4f2ea'; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? h * 0.1 : h * 0.25, t = (i * Math.PI) / 5 - Math.PI / 2; ctx.lineTo(w * 0.5 + Math.cos(t) * r, h * 0.5 + Math.sin(t) * r); }
    ctx.fill();
  },
  blank(ctx, w, h) { ctx.fillStyle = '#f1efe8'; ctx.fillRect(0, 0, w, h); },
};

const WORDS = {
  peace: 'WE CAME|IN PEACE',
  marker: 'SURVEY|MARKER',
  memory: 'IN MEMORY',
  claim: 'CLAIM|STAKED',
  home: 'HOME IS|THAT WAY',
} as const;

/** A lumpy stone: an icosphere with its corners pushed about. */
function stone(random: () => number, flat = 1) {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const moved = new Map<string, number>();
  for (let i = 0; i < position.count; i++) {
    const key = `${position.getX(i).toFixed(3)},${position.getY(i).toFixed(3)},${position.getZ(i).toFixed(3)}`;
    if (!moved.has(key)) moved.set(key, mix(0.72, 1.12, random()));
    const push = moved.get(key)!;
    position.setXYZ(i, position.getX(i) * push, position.getY(i) * push * flat, position.getZ(i) * push);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    flag: choice('Whose flag is it?', FLAGS),
    shape: choice('What shape is the flag?', {
      banner: 'A rectangular banner held out square.',
      swallowtail: 'A swallow-tailed ensign with a notch cut from the fly.',
      pennant: 'A long tapering triangular pennant.',
      streamer: 'A narrow ribbon streamer, more wind-sock than flag.',
    }),
    posture: choice('How is it standing?', {
      upright: 'Bolt upright, held out stiff on its wire brace, proud.',
      leaning: 'Leaning well off true, the cairn slumping under it.',
      drooping: 'Upright, but the brace has let go and the flag hangs limp down the pole.',
      snapped: 'Snapped: a stub in the rocks, the flag end lying across the stones.',
      fallen: 'Fallen flat, the pole lying on the ground beside a scattered cairn.',
    }),
    cairn: choice('What is it planted in?', {
      heap: 'A rough heap of grey stones.',
      tower: 'A careful tower of flat stones, balanced with patience.',
      ring: 'A ring of stones laid out around a small pile.',
      boulder: 'One big boulder with a drilled socket.',
    }),
    size: score('How big is the cairn?', ['A few stones', 'Knee high', 'Waist high, the work of hours']),
    plaque: choice('What does the plaque at its foot say?', {
      none: 'There is no plaque.',
      peace: 'WE CAME IN PEACE',
      marker: 'SURVEY MARKER',
      memory: 'IN MEMORY',
      claim: 'CLAIM STAKED',
      home: 'HOME IS THAT WAY',
    }),
    token: choice('What was left with it?', {
      nothing: 'Nothing else.',
      helmet: 'A helmet with a gold visor, set down at the foot of the cairn.',
      photo: 'A small photograph in a plastic sleeve, weighted with a stone.',
      tools: 'A geology hammer and a long-handled scoop leaned against the rocks.',
      wreath: 'A wreath of wire and foil flowers.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const bleach = clamp01(mood.wear * 1.1 - 0.08);
    const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];

    // --- Rocks ------------------------------------------------------------------------------
    const rockGeometries = [stone(random), stone(random), stone(random, 0.5), stone(random, 0.38)];
    const rockMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true });
    const rocks: { variant: number; at: P3; scale: P3; turn: number; shade: number }[] = [];
    const addRock = (at: P3, size: number, flat = false, squash = 1) =>
      rocks.push({ variant: flat ? 2 + Math.floor(random() * 2) : Math.floor(random() * 2), at, scale: [size * mix(0.85, 1.2, random()), size * squash, size * mix(0.85, 1.2, random())], turn: random() * Math.PI * 2, shade: mix(0.13, 0.3, random()) });
    const scattered = a.posture === 'fallen';
    const height = mix(0.22, 0.95, a.size) * (scattered ? 0.5 : 1);
    const baseR = mix(0.3, 0.72, a.size) * (scattered ? 1.5 : 1);
    let socket = height;
    if (a.cairn === 'heap' || a.cairn === 'ring') {
      const pile = a.cairn === 'ring' ? 0.6 : 1;
      const count = Math.round(mix(7, 46, a.size) * pile * mix(0.8, 1.25, mood.density));
      for (let i = 0; i < count; i++) {
        const level = (i / count) ** 0.8, y = level * height * pile, spread = baseR * pile * (1 - level * 0.85) * Math.sqrt(random());
        const t = random() * Math.PI * 2;
        addRock([Math.cos(t) * spread, y + 0.05, Math.sin(t) * spread], mix(0.16, 0.09, level) * mix(0.8, 1.3, random()), false, mix(0.6, 0.9, random()));
      }
      socket = height * pile;
      if (a.cairn === 'ring') {
        const ringR = baseR + 0.45, stones = Math.round(mix(9, 20, a.size));
        for (let i = 0; i < stones; i++) { const t = (i / stones) * Math.PI * 2 + random() * 0.1; addRock([Math.cos(t) * ringR, 0.04, Math.sin(t) * ringR], mix(0.09, 0.14, random()), false, 0.7); }
      }
    } else if (a.cairn === 'tower') {
      const layers = Math.round(mix(3, 9, a.size));
      let y = 0;
      for (let i = 0; i < layers; i++) {
        const size = mix(mix(0.3, 0.72, a.size) * 0.75, 0.14, i / layers) * mix(0.9, 1.1, random()), thick = size * mix(0.34, 0.5, random());
        const slide = scattered ? baseR : 0.04;
        rocks.push({ variant: 2 + (i % 2), at: [(random() - 0.5) * slide * 2, scattered ? thick * 0.5 : y + thick * 0.45, (random() - 0.5) * slide * 2], scale: [size, size * 0.95, size * mix(0.8, 1, random())], turn: random() * 6.28, shade: mix(0.13, 0.3, random()) });
        if (!scattered) y += thick * 0.92;
      }
      socket = scattered ? 0.1 : y;
      for (let i = 0; i < 4; i++) { const t = random() * 6.28; addRock([Math.cos(t) * baseR * 0.9, 0.04, Math.sin(t) * baseR * 0.9], 0.08, false, 0.7); }
    } else {
      const size = mix(0.3, 0.7, a.size);
      rocks.push({ variant: 0, at: [0, size * 0.55, 0], scale: [size * 1.15, size * 0.8, size], turn: random() * 6.28, shade: 0.2 });
      socket = size * 1.2;
      for (let i = 0; i < 5; i++) { const t = random() * 6.28; addRock([Math.cos(t) * size * 1.4, 0.04, Math.sin(t) * size * 1.4], mix(0.06, 0.12, random()), false, 0.7); }
    }
    const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), tone = new THREE.Color();
    const warmRock = new THREE.Color(mood.warmth > 0.5 ? '#b09a86' : '#8f98a3');
    for (let variant = 0; variant < 4; variant++) {
      const mine = rocks.filter((rock) => rock.variant === variant);
      if (!mine.length) { rockGeometries[variant].dispose(); continue; }
      const mesh = new THREE.InstancedMesh(rockGeometries[variant], rockMaterial, mine.length);
      mine.forEach((rock, i) => {
        quaternion.setFromEuler(new THREE.Euler(variant < 2 ? random() * 0.6 : (random() - 0.5) * 0.16, rock.turn, (random() - 0.5) * 0.2));
        mesh.setMatrixAt(i, matrix.compose(new THREE.Vector3(...rock.at), quaternion, new THREE.Vector3(...rock.scale)));
        mesh.setColorAt(i, tone.setScalar(rock.shade).lerp(warmRock, Math.abs(mood.warmth - 0.5) * 0.5));
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    // --- Pole, brace and flag -------------------------------------------------------------------
    const steel = s.material('#c9ccce', { metalness: 0.7, roughness: 0.35 });
    const gold = s.material('#c9a23c', { metalness: 0.8, roughness: 0.35 });
    const streamer = a.shape === 'streamer';
    const flagW = streamer ? 1.5 : a.shape === 'pennant' ? 1.25 : 0.95, flagH = streamer ? 0.2 : a.shape === 'pennant' ? 0.5 : 0.6;
    const poleH = 2.05, sunk = 0.35;

    const canvas = document.createElement('canvas');
    canvas.width = 384; canvas.height = Math.round((384 * flagH) / flagW);
    const ctx = canvas.getContext('2d')!;
    DESIGNS[a.flag](ctx, canvas.width, canvas.height, pick);
    // Saturation follows cheer; the sun takes the rest.
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = `hsla(0,0%,50%,${clamp01(0.55 - mood.cheer * 0.7)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(244,242,234,${bleach * 0.93})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Fold creases from being packed flat for the trip.
    ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 2;
    for (const x of [1 / 3, 2 / 3]) { ctx.beginPath(); ctx.moveTo(canvas.width * x, 0); ctx.lineTo(canvas.width * x, canvas.height); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0, canvas.height / 2); ctx.lineTo(canvas.width, canvas.height / 2); ctx.stroke();
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;

    const cloth = new THREE.PlaneGeometry(flagW, flagH, 24, 8);
    cloth.translate(flagW / 2, -flagH / 2, 0);
    const vertices = cloth.attributes.position as THREE.BufferAttribute;
    const limp = a.posture === 'drooping';
    const fray = Array.from({ length: 9 }, () => random());
    for (let i = 0; i < vertices.count; i++) {
      let x = vertices.getX(i), y = vertices.getY(i);
      const u = x / flagW, v = -y / flagH, row = Math.round(v * 8);
      let z = Math.sin(u * 9 + v * 2.4) * 0.022 * (0.4 + u) + Math.sin(u * 23 + v * 7) * 0.006;
      if (a.shape === 'pennant') y = -flagH / 2 + (y + flagH / 2) * (1 - u * 0.94);
      if (a.shape === 'swallowtail') x -= Math.max(0, u - 0.55) / 0.45 * flagW * 0.32 * (1 - Math.abs(v - 0.5) * 2);
      if (u > 0.7 && a.shape !== 'pennant') x -= ((u - 0.7) / 0.3) * flagW * 0.3 * fray[row] * clamp01(mood.wear * 1.6 - 0.5);
      if (limp) { z += Math.sin(v * 5 + u * 3) * 0.05 * u; }
      vertices.setXYZ(i, x, y, z);
    }
    cloth.computeVertexNormals();
    const flag = new THREE.Mesh(cloth, new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.9 }));
    flag.castShadow = flag.receiveShadow = true;

    const mast = new Sculpture(context);
    const assembly = mast.root;
    const snapAt = 0.55;
    const lower = a.posture === 'snapped' ? snapAt : poleH;
    mast.rod([0, -sunk, 0], [0, lower, 0], 0.017, steel);
    const head = new THREE.Group();
    if (a.posture === 'snapped') head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, poleH - snapAt, 10).translate(0, (poleH + snapAt) / 2, 0), steel));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), gold);
    cap.position.y = poleH + 0.01;
    head.add(cap);
    const flagHolder = new THREE.Group();
    flagHolder.position.set(0.017, poleH - 0.03, 0);
    flagHolder.add(flag);
    // The brace: a wire along the top hem, and a diagonal stay back to the pole.
    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, flagW * 0.99, 6).rotateZ(Math.PI / 2).translate(flagW * 0.495, 0.006, 0), steel);
    flagHolder.add(brace);
    if (limp) flagHolder.rotation.z = -Math.PI / 2 + 0.12;
    head.add(flagHolder);
    for (const node of [cap, brace]) node.castShadow = true;
    assembly.add(head);
    s.root.add(assembly);

    if (a.posture === 'upright' || a.posture === 'drooping') {
      assembly.position.y = socket;
      assembly.rotation.set(0, 0, (random() - 0.5) * 0.05);
    } else if (a.posture === 'leaning') {
      assembly.position.y = socket * 0.9;
      assembly.rotation.set((random() - 0.5) * 0.2, 0, -mix(0.26, 0.44, random()));
    } else if (a.posture === 'snapped') {
      assembly.position.y = socket;
      // The broken top hinges over and rests its flag on the stones.
      head.position.y = snapAt;
      head.children.forEach((child) => { child.position.y -= snapAt; });
      const dip = Math.asin(Math.min(0.98, (socket + snapAt - 0.07) / (poleH - snapAt)));
      head.rotation.z = -(Math.PI / 2 + dip);
      // Cloth first laid flat, then turned level so it spreads on the ground past the tip.
      flagHolder.rotation.set(Math.PI / 2, 0, Math.PI / 2 + dip, 'ZYX');
    } else {
      const spin = new THREE.Group();
      assembly.remove(head);
      spin.add(head);
      // Lay the flag flat on the regolith and the pole along the ground.
      head.rotation.y = Math.PI / 2;
      spin.rotation.z = -(Math.PI / 2 - 0.02);
      spin.position.set(-1.1, 0.045, baseR + 0.3);
      spin.rotation.y = (random() - 0.5) * 0.5;
      s.root.add(spin);
      assembly.visible = false;
      for (const child of [...assembly.children]) if ((child as THREE.Mesh).isMesh) { (child as THREE.Mesh).geometry.dispose(); assembly.remove(child); }
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, poleH + sunk, 8).translate(0, (poleH - sunk) / 2, 0), steel);
      base.castShadow = true;
      head.add(base);
    }

    // --- Plaque -------------------------------------------------------------------------------
    const front = (a.cairn === 'ring' ? baseR + 0.75 : a.cairn === 'boulder' ? mix(0.3, 0.7, a.size) * 1.25 : baseR) + 0.22;
    if (a.plaque !== 'none') {
      const plate = document.createElement('canvas');
      plate.width = 256; plate.height = 160;
      const p = plate.getContext('2d')!;
      p.fillStyle = `#${new THREE.Color('#b9bcbd').lerp(new THREE.Color('#8f8b84'), mood.wear * 0.5).getHexString()}`;
      p.fillRect(0, 0, 256, 160);
      p.strokeStyle = '#3a3d40'; p.lineWidth = 5; p.strokeRect(9, 9, 238, 142);
      p.fillStyle = '#2a2c2e'; p.textAlign = 'center'; p.textBaseline = 'middle';
      const lines = WORDS[a.plaque].split('|');
      p.font = 'bold 34px monospace';
      lines.forEach((line, i) => p.fillText(line, 128, 80 + (i - (lines.length - 1) / 2) * 42 - 8, 226));
      p.font = '16px monospace';
      p.fillText(`${pick(['SOL', 'DAY', 'EVA'])} ${1 + Math.floor(random() * 240)}`, 128, 136);
      for (const [x, y] of [[20, 20], [236, 20], [20, 140], [236, 140]]) { p.beginPath(); p.arc(x, y, 5, 0, Math.PI * 2); p.fill(); }
      const text = new THREE.CanvasTexture(plate);
      text.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Group();
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.02), [steel, steel, steel, steel, new THREE.MeshStandardMaterial({ map: text, metalness: 0.45, roughness: 0.5 }), steel]);
      board.position.set(0, 0.3, 0);
      board.rotation.x = -0.5;
      board.castShadow = true;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6), steel);
      leg.position.set(0, 0.1, -0.03);
      sign.add(board, leg);
      sign.position.set((random() - 0.5) * 0.2, 0, front);
      sign.rotation.y = (random() - 0.5) * 0.3;
      sign.rotation.z = (random() - 0.5) * mix(0.05, 0.5, mood.wear);
      s.root.add(sign);
    }

    // --- Token -------------------------------------------------------------------------------
    const side = front + 0.12;
    if (a.token === 'helmet') {
      const shell = s.ball([0.17, 0.17, 0.18], [-side * 0.8, 0.17, side * 0.45], s.material('#eceae2', { roughness: 0.5 }), 20);
      const visor = s.ball([0.135, 0.125, 0.1], [-side * 0.8 + 0.035, 0.18, side * 0.45 + 0.1], s.material('#d9a531', { metalness: 0.9, roughness: 0.18 }), 18);
      const collar = s.ring(0.13, 0.025, [-side * 0.8, 0.035, side * 0.45], steel);
      collar.rotation.x = Math.PI / 2;
      shell.rotation.y = visor.rotation.y = 0.35;
    } else if (a.token === 'photo') {
      const photo = document.createElement('canvas');
      photo.width = 128; photo.height = 96;
      const p = photo.getContext('2d')!;
      p.fillStyle = '#f3f0e6'; p.fillRect(0, 0, 128, 96);
      p.fillStyle = '#7fa6c9'; p.fillRect(8, 8, 112, 50);
      p.fillStyle = '#6f8a4e'; p.fillRect(8, 58, 112, 22);
      for (let i = 0; i < 4; i++) { p.fillStyle = ['#c9483b', '#e0b84a', '#3b5fa8', '#e8e3d6'][i]; p.fillRect(26 + i * 20, 40 - (i % 2) * 6, 12, 34 + (i % 2) * 6); p.beginPath(); p.arc(32 + i * 20, 34 - (i % 2) * 6, 7, 0, Math.PI * 2); p.fillStyle = '#e8c4a4'; p.fill(); }
      p.fillStyle = `rgba(243,240,230,${bleach * 0.8})`; p.fillRect(0, 0, 128, 96);
      const picture = new THREE.CanvasTexture(photo);
      picture.colorSpace = THREE.SRGBColorSpace;
      const card = s.mesh(new THREE.PlaneGeometry(0.26, 0.195), new THREE.MeshStandardMaterial({ map: picture, roughness: 0.3, side: THREE.DoubleSide }), [side * 0.75, 0.012, side * 0.5]);
      card.rotation.set(-Math.PI / 2, 0, 0.4 + random() * 0.4);
      const weight = s.mesh(stone(random, 0.6), rockMaterial, [side * 0.75 + 0.1, 0.03, side * 0.5 - 0.06]);
      weight.scale.setScalar(0.05);
    } else if (a.token === 'tools') {
      const grip = s.material('#b8552d');
      s.rod([side * 0.7, 0, side * 0.6], [side * 0.3, 0.75, side * 0.2], 0.014, steel);
      s.box([0.1, 0.03, 0.14], [side * 0.72, 0.02, side * 0.63], steel).rotation.y = 0.7;
      s.rod([-side * 0.75, 0, side * 0.5], [-side * 0.45, 0.42, side * 0.2], 0.016, grip);
      const hammer = s.box([0.16, 0.035, 0.035], [-side * 0.44, 0.43, side * 0.19], steel);
      hammer.rotation.set(0.2, 0.6, 0.5);
    } else if (a.token === 'wreath') {
      const hoop = s.ring(0.2, 0.014, [-side * 0.72, 0.16, side * 0.5], gold);
      hoop.rotation.set(-0.9, 0.5, 0);
      const petals = ['#d6332a', '#f4f1e8', '#f0b429', '#c9a23c'];
      for (let i = 0; i < 12; i++) {
        const t = (i / 12) * Math.PI * 2, bloom = new THREE.Mesh(new THREE.DodecahedronGeometry(mix(0.03, 0.045, random())), s.material(new THREE.Color(pick(petals)).lerp(new THREE.Color('#f1efe8'), bleach * 0.8), { metalness: 0.3, roughness: 0.5 }));
        bloom.position.set(Math.cos(t) * 0.2, Math.sin(t) * 0.2, 0.01);
        bloom.castShadow = true;
        hoop.add(bloom);
      }
    }

    const sway = a.posture === 'upright' || a.posture === 'leaning' ? mood.energy * 0.012 : 0;
    const rest = assembly.rotation.x;
    return s.finish({
      footprint: Math.max(baseR, 0.4) + (a.cairn === 'ring' ? 0.5 : 0.15),
      // No wind here: only the faint ringing of a thin pole after a distant thump.
      update: (_dt, time) => { if (sway) assembly.rotation.x = rest + Math.sin(time * 5.3) * sway * (0.5 + 0.5 * Math.sin(time * 0.4)); },
    });
  },
});
