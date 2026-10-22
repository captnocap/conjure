import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, score } from '@conjure/kit';

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

const STYLES = {
  vegas: 'Old Strip Vegas: crimson and gold, warm bulbs, brass and mirrors.',
  macau: 'Macau palace: lacquer red, jade green and imperial gold, lanterns overhead.',
  faded: 'A faded 1970s downtown joint: brown, orange and mustard, tired and smoky.',
  modern: 'A modern resort: deep violet and teal, LED light, sleek and cold.',
  deco: 'Old-world Monte Carlo: bottle green, cream and gilt, formal and hushed.',
} as const;
const PALETTE: Record<keyof typeof STYLES, { bg: string; wall: string; dado: string; base: string; a: string; b: string; trim: string; glow: string[] }> = {
  vegas: { bg: '#c9a08c', wall: '#7a2f33', dado: '#3e1a1c', base: '#8f1d2c', a: '#d9a93a', b: '#5a0f1e', trim: '#d9a93a', glow: ['#ffd23f', '#ff4f6a', '#58c8ff', '#ff9a2a'] },
  macau: { bg: '#c4907f', wall: '#8a1f24', dado: '#3a1012', base: '#a3161f', a: '#e3b94f', b: '#1e6a52', trim: '#e3b94f', glow: ['#ffcf33', '#ff3b3b', '#3fe0a0', '#ff8a2a'] },
  faded: { bg: '#c4b396', wall: '#8a6a48', dado: '#4a3524', base: '#7a4a2a', a: '#c98a2a', b: '#4a3a22', trim: '#b08a4a', glow: ['#ffb84a', '#ff6a3a', '#e8e06a', '#9ad06a'] },
  modern: { bg: '#a9a6c2', wall: '#3c3560', dado: '#221d3a', base: '#3a2a6a', a: '#19b8c9', b: '#c93a9a', trim: '#c9ccd4', glow: ['#35e0f0', '#ff4fd0', '#8a6aff', '#5affb0'] },
  deco: { bg: '#b7c1ac', wall: '#e2d8b8', dado: '#1f4a3a', base: '#1f4a3a', a: '#d9c27a', b: '#12302a', trim: '#d9b85a', glow: ['#ffe9a0', '#ff5a4a', '#7ad0a0', '#ffc04a'] },
};

export default defineWorld({
  questions: {
    style: choice('What kind of casino is it?', STYLES),
    carpet: choice('What is the carpet pattern?', {
      swirl: 'Dizzy swirling scrolls and curls.',
      medallion: 'Ranks of round medallions and diamonds.',
      fans: 'Overlapping scalloped fans.',
      confetti: 'A busy scatter of ribbons, stars and squiggles designed to hide every stain.',
    }),
    moment: choice('What is happening on the floor?', {
      peak: 'Saturday-night peak: every machine lit, a drinks trolley doing the rounds.',
      jackpot: 'A jackpot has just hit: one machine erupting in lights, balloons and spilled coins.',
      dead: 'The dead hours: machines chirping to nobody, a cleaning cart and a wet-floor cone.',
      dying: 'A casino on its way out: dark machines under dust covers and gaps where others were hauled away.',
    }),
    pit: choice('What runs along the far side wall?', {
      slots: 'Yet another rank of slot machines.',
      tables: 'A pit of green card tables with stools.',
      bar: 'A long bar with a glowing wall of bottles.',
      cage: 'The cashier cage, a row of barred windows.',
      highlimit: 'A curtained high-limit doorway behind velvet ropes.',
    }),
    sign: choice('What does the big sign on the back wall say?', {
      jackpot: 'JACKPOT',
      casino: 'CASINO',
      lucky: 'LUCKY DRAGON',
      winners: 'WINNERS WELCOME',
      buffet: '$9.99 BUFFET',
      loosest: 'LOOSEST SLOTS IN TOWN',
    }),
    chandelier: choice('What hangs from the ceiling?', {
      crystal: 'Tiered crystal chandeliers.',
      globes: 'Brass rings of frosted globes.',
      lanterns: 'Clusters of red silk lanterns with gold tassels.',
      rings: 'Floating halos of cold LED light.',
    }),
    smoke: score('How smoky is the air?', ['Clean filtered air', 'A faint haze in the distance', 'Thick cigarette smoke hanging in sheets']),
    watched: choice('How heavy is the surveillance?', {
      discreet: 'A few camera domes, easy to miss.',
      everywhere: 'A dark camera dome at every crossing of the ceiling grid.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const P = PALETTE[a.style];
    const W = 16, D = 12, CEIL = 5.3;
    const { art: s, world } = diorama(context, {
      background: P.bg, floor: P.base, width: W, depth: D, maxHeight: 2.9, radius: 1.45, pitch: 27, yaw: 27,
      slots: [[0.3, 1.5], [-3.3, -0.6], [3.9, -0.5], [-3.2, 3.6], [4.2, 3.6], [0.4, -2.6, 0, 0.9]],
    });
    const glow = mix(0.6, 1.25, mood.cheer);
    const bg = new THREE.Color(P.bg);
    const trim = s.material(P.trim, { metalness: 0.85, roughness: 0.3 });
    const dark = s.material('#17161a', { roughness: 0.6 });
    const HERO: [number, number] = [0.3, 1.5];

    // Carpet, with a pool of light on the clearing under the big chandelier.
    const carpet = paint(1024, 768, (c) => {
      const PX = 64;
      c.fillStyle = P.base; c.fillRect(0, 0, 1024, 768);
      c.lineCap = 'round';
      if (a.carpet === 'swirl') {
        for (let i = 0; i < 130; i++) {
          const x = random() * 1024, y = random() * 768, r = 16 + random() * 40, turn = random() * 6, dir = random() < 0.5 ? 1 : -1;
          c.strokeStyle = random() < 0.65 ? P.a : P.b; c.lineWidth = 3 + random() * 5;
          c.beginPath();
          for (let t = 0; t < 9; t += 0.25) { const rr = r * (1 - t / 10); const px = x + Math.cos(turn + t * dir) * rr, py = y + Math.sin(turn + t * dir) * rr; if (t === 0) c.moveTo(px, py); else c.lineTo(px, py); }
          c.stroke();
          c.fillStyle = P.a; c.beginPath(); c.ellipse(x + Math.cos(turn) * r * 1.3, y + Math.sin(turn) * r * 1.3, 9, 4, turn, 0, 7); c.fill();
        }
      } else if (a.carpet === 'medallion') {
        for (let x = 0; x <= 1024; x += 96) for (let y = 0; y <= 768; y += 96) {
          c.fillStyle = P.b; c.beginPath(); c.arc(x, y, 38, 0, 7); c.fill();
          c.strokeStyle = P.a; c.lineWidth = 5; c.beginPath(); c.arc(x, y, 30, 0, 7); c.stroke();
          c.fillStyle = P.a; c.beginPath(); c.arc(x, y, 10, 0, 7); c.fill();
          c.beginPath(); c.moveTo(x + 48, y + 30); c.lineTo(x + 62, y + 48); c.lineTo(x + 48, y + 66); c.lineTo(x + 34, y + 48); c.closePath(); c.fill();
        }
      } else if (a.carpet === 'fans') {
        for (let row = 0; row < 15; row++) for (let col = -1; col < 13; col++) {
          const x = col * 88 + (row % 2) * 44, y = row * 54 + 54;
          c.fillStyle = row % 2 ? P.b : P.base; c.strokeStyle = P.a; c.lineWidth = 4;
          c.beginPath(); c.arc(x, y, 46, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
          for (const r of [32, 18]) { c.beginPath(); c.arc(x, y, r, Math.PI, 0); c.stroke(); }
        }
      } else {
        const tones = [P.a, P.b, ...P.glow];
        for (let i = 0; i < 520; i++) {
          const x = random() * 1024, y = random() * 768, turn = random() * 6;
          c.strokeStyle = c.fillStyle = tones[Math.floor(random() * tones.length)]; c.lineWidth = 4; c.globalAlpha = 0.85;
          c.save(); c.translate(x, y); c.rotate(turn);
          if (i % 3 === 0) { c.beginPath(); c.moveTo(-14, 0); c.quadraticCurveTo(-5, -12, 0, 0); c.quadraticCurveTo(5, 12, 14, 0); c.stroke(); }
          else if (i % 3 === 1) c.fillRect(-5, -5, 10, 10);
          else { c.beginPath(); c.moveTo(0, -9); c.lineTo(8, 7); c.lineTo(-8, 7); c.closePath(); c.fill(); }
          c.restore();
        }
        c.globalAlpha = 1;
      }
      for (let i = 0; i < 30 + mood.wear * 160; i++) { c.fillStyle = `rgba(20,12,8,${0.04 + mood.wear * 0.1})`; c.beginPath(); c.ellipse(random() * 1024, random() * 768, 8 + random() * 40, 6 + random() * 22, random() * 3, 0, 7); c.fill(); }
      // Worn walkways and the border of the clearing.
      const hx = (HERO[0] + W / 2) * PX, hy = (HERO[1] + D / 2) * PX;
      c.strokeStyle = P.a; c.lineWidth = 9; c.beginPath(); c.arc(hx, hy, 2.25 * PX, 0, 7); c.stroke();
      c.lineWidth = 3; c.beginPath(); c.arc(hx, hy, 2.45 * PX, 0, 7); c.stroke();
      const pool = c.createRadialGradient(hx, hy, 10, hx, hy, 3.6 * PX);
      pool.addColorStop(0, 'rgba(255,240,200,0.42)'); pool.addColorStop(0.6, 'rgba(255,230,170,0.14)'); pool.addColorStop(1, 'rgba(255,230,170,0)');
      c.fillStyle = pool; c.fillRect(0, 0, 1024, 768);
      const far = c.createLinearGradient(0, 0, 0, 330);
      far.addColorStop(0, `rgba(${Math.round(bg.r * 255)},${Math.round(bg.g * 255)},${Math.round(bg.b * 255)},${0.25 + a.smoke * 0.4})`); far.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = far; c.fillRect(0, 0, 1024, 330);
    });
    const ground = world.ground as THREE.Mesh;
    const side = ground.material as THREE.Material;
    ground.material = [side, side, new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 }), side, side, side];

    // Walls: dado, pilasters, sconces.
    const wall = s.material(P.wall, { roughness: 0.85 });
    const dado = s.material(P.dado, { roughness: 0.6 });
    const WH = 4.9;
    s.box([W + 0.3, WH, 0.3], [-0.15, WH / 2, -D / 2 - 0.15], wall);
    s.box([0.3, WH, D], [-W / 2 - 0.15, WH / 2, 0], wall);
    s.box([W, 1.1, 0.08], [0, 0.55, -D / 2 + 0.04], dado); s.box([W, 0.07, 0.12], [0, 1.13, -D / 2 + 0.06], trim);
    s.box([0.08, 1.1, D], [-W / 2 + 0.04, 0.55, 0], dado); s.box([0.12, 0.07, D], [-W / 2 + 0.06, 1.13, 0], trim);
    s.box([W, 0.22, 0.2], [0, WH - 0.11, -D / 2 + 0.1], trim); s.box([0.2, 0.22, D], [-W / 2 + 0.1, WH - 0.11, 0], trim);
    const lampGlow = s.material('#fff1c4', { emissive: a.style === 'modern' ? P.glow[0] : '#ffd98a', emissiveIntensity: glow, roughness: 0.3 });
    const sconces: { at: readonly [number, number, number]; size: number }[] = [];
    for (let i = 0; i <= 5; i++) {
      const x = -W / 2 + 0.4 + i * 3.04;
      s.box([0.5, WH - 0.2, 0.16], [x, (WH - 0.2) / 2, -D / 2 + 0.08], dado); s.box([0.66, 0.2, 0.24], [x, WH - 0.5, -D / 2 + 0.12], trim);
      sconces.push({ at: [x, 3.0, -D / 2 + 0.24], size: 1 });
    }
    for (let i = 0; i <= 3; i++) {
      const z = -D / 2 + 3.4 + i * 2.8;
      s.box([0.16, WH - 0.2, 0.5], [-W / 2 + 0.08, (WH - 0.2) / 2, z], dado); s.box([0.24, 0.2, 0.66], [-W / 2 + 0.12, WH - 0.5, z], trim);
      sconces.push({ at: [-W / 2 + 0.24, 3.0, z], size: 1 });
    }
    s.scatter(new THREE.SphereGeometry(0.13, 10, 8), lampGlow, sconces).castShadow = false;

    // The big sign, ringed with chaser bulbs.
    const signText = { jackpot: 'JACKPOT', casino: 'CASINO', lucky: 'LUCKY DRAGON', winners: 'WINNERS WELCOME', buffet: '$9.99 BUFFET', loosest: 'LOOSEST SLOTS IN TOWN' }[a.sign];
    const SWd = 6.2, SH = 1.0, SY = 3.35, SX = 0.8;
    const signTexture = paint(1024, 166, (c) => {
      c.fillStyle = a.style === 'deco' ? '#12302a' : '#1a0a10'; c.fillRect(0, 0, 1024, 166);
      c.fillStyle = P.glow[0]; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `bold ${Math.min(120, 1500 / signText.length)}px ${a.style === 'modern' ? 'sans-serif' : 'serif'}`;
      c.shadowColor = P.glow[1]; c.shadowBlur = 18;
      c.fillText(signText, 512, 88, 960);
    });
    s.box([SWd + 0.3, SH + 0.3, 0.14], [SX, SY, -D / 2 + 0.1], trim);
    const signFace = s.mesh(new THREE.PlaneGeometry(SWd, SH), new THREE.MeshStandardMaterial({ map: signTexture, emissive: '#ffffff', emissiveMap: signTexture, emissiveIntensity: glow * 1.1, roughness: 0.5 }), [SX, SY, -D / 2 + 0.18]);
    signFace.castShadow = false;
    const chase: (readonly [number, number, number])[][] = [[], [], []];
    let ci = 0;
    for (let i = 0; i <= 30; i++) for (const y of [SY - SH / 2 - 0.08, SY + SH / 2 + 0.08]) chase[ci++ % 3].push([SX - SWd / 2 - 0.05 + (i * (SWd + 0.1)) / 30, y, -D / 2 + 0.2]);
    const dead = mood.wear * 0.3 + (a.moment === 'dying' ? 0.3 : 0);
    const chaseMaterials = chase.map((points, index) => {
      const material = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: index === 1 ? P.glow[1] : '#ffd98a', emissiveIntensity: glow, roughness: 0.3 });
      s.scatter(new THREE.SphereGeometry(0.06, 8, 6), material, points.filter(() => random() >= dead).map((at) => ({ at, size: 1 }))).castShadow = false;
      return material;
    });

    // Ranks of slot machines, tinted toward the haze with distance.
    type Slot = { x: number; z: number; turn: number; state: 'lit' | 'dark' | 'gone' | 'win' };
    const machines: Slot[] = [];
    const fill = mix(0.72, 1, mood.density);
    const state = (): Slot['state'] => a.moment === 'dying' ? (random() < 0.3 ? 'gone' : random() < 0.5 ? 'dark' : 'lit') : random() > fill ? 'gone' : random() < mood.wear * 0.18 ? 'dark' : 'lit';
    for (let i = 0; i < 20; i++) { const x = -7.1 + i * 0.74; if (i % 7 !== 6) machines.push({ x, z: -5.55, turn: 0, state: state() }); }
    for (let i = 0; i < 20; i++) {
      const x = -7.1 + i * 0.74;
      if (Math.abs(x - 0.4) < 1.75 || i % 7 === 6) continue;
      machines.push({ x, z: -3.52, turn: 0, state: state() }, { x, z: -4.12, turn: Math.PI, state: state() });
    }
    if (a.pit === 'slots') for (let i = 0; i < 10; i++) if (i % 5 !== 4) machines.push({ x: -7.45, z: -2.1 + i * 0.74, turn: Math.PI / 2, state: state() });
    const winner = a.moment === 'jackpot' ? machines.filter((m) => m.z === -3.52 && m.x > 2.3 && m.x < 5.5)[1] ?? machines[0] : null;
    if (winner) winner.state = 'win';
    const hazeAt = (x: number, z: number) => THREE.MathUtils.clamp(((-z + 1.5) / 7.5) * 0.6 + ((-x) / 8) * 0.25, 0, 0.8) * mix(0.12, 0.9, a.smoke);
    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), tint = new THREE.Color();
    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, items: { m: Slot; local: readonly [number, number, number]; color?: string }[], shadow = true) => {
      if (!items.length) return null;
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      items.forEach((item, i) => {
        q.setFromAxisAngle(up, item.m.turn);
        const p = new THREE.Vector3(...item.local).applyQuaternion(q).add(new THREE.Vector3(item.m.x, 0, item.m.z));
        mesh.setMatrixAt(i, matrix.compose(p, q, one));
        if (item.color) mesh.setColorAt(i, tint.set(item.color).lerp(bg, hazeAt(item.m.x, item.m.z)));
      });
      mesh.castShadow = shadow; mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const present = machines.filter((m) => m.state !== 'gone');
    const accents = [P.base, P.b, P.a, P.dado];
    instanced(new THREE.BoxGeometry(0.64, 1.75, 0.5), new THREE.MeshStandardMaterial({ roughness: 0.6 }), present.map((m) => ({ m, local: [0, 0.875, 0], color: m.state === 'dark' && a.moment === 'dying' ? '#9a968c' : '#24222a' })));
    instanced(new THREE.BoxGeometry(0.66, 0.12, 0.78), new THREE.MeshStandardMaterial({ roughness: 0.5 }), present.filter((m) => !(m.state === 'dark' && a.moment === 'dying')).map((m, i) => ({ m, local: [0, 0.88, 0.1], color: accents[i % 4] })));
    const screenGeometry = new THREE.BoxGeometry(0.52, 0.7, 0.04), topperGeometry = new THREE.BoxGeometry(0.58, 0.3, 0.26);
    const lit = present.filter((m) => m.state === 'lit' || m.state === 'win');
    const flashers: THREE.MeshStandardMaterial[] = [];
    P.glow.forEach((colour, group) => {
      const mine = lit.filter((_m, i) => i % 4 === group);
      const hazeTone = new THREE.Color(colour).lerp(bg, a.smoke * 0.25);
      const material = new THREE.MeshStandardMaterial({ color: hazeTone, emissive: hazeTone, emissiveIntensity: glow * 0.55, roughness: 0.4 });
      instanced(screenGeometry, material, mine.map((m) => ({ m, local: [0, 1.36, 0.24] })), false);
      instanced(topperGeometry, material, mine.map((m) => ({ m, local: [0, 1.92, -0.05] })), false);
      flashers.push(material);
    });
    instanced(screenGeometry, dark, present.filter((m) => m.state === 'dark').map((m) => ({ m, local: [0, 1.36, 0.24] })), false);
    const seats = present.filter(() => random() < (a.moment === 'dying' ? 0.5 : 0.9));
    instanced(new THREE.CylinderGeometry(0.19, 0.17, 0.09, 14), new THREE.MeshStandardMaterial({ roughness: 0.8 }), seats.map((m) => ({ m, local: [(random() - 0.5) * 0.1, 0.62, 0.72 + random() * 0.1], color: P.b })));
    instanced(new THREE.CylinderGeometry(0.03, 0.14, 0.6, 8), s.material('#b9bcc0', { metalness: 0.8, roughness: 0.3 }), seats.map((m) => ({ m, local: [0, 0.3, 0.76] })));
    let beacon: THREE.MeshStandardMaterial | null = null;
    if (winner) {
      beacon = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffe14a', emissiveIntensity: 2, roughness: 0.3 });
      s.box([0.9, 0.5, 0.16], [winner.x, 2.75, winner.z], beacon);
      s.label('JACKPOT', 0.84, 0.34, [winner.x, 2.75, winner.z + 0.085], '#b3101f', '#ffe14a');
      s.cylinder(0.03, 0.03, 0.5, [winner.x, 2.3, winner.z], trim, 8);
      s.cylinder(0.09, 0.09, 0.2, [winner.x, 3.12, winner.z], s.material('#ff2a2a', { emissive: '#ff2a2a', emissiveIntensity: 2 * glow }), 12);
      const gold = s.material('#e6b43a', { metalness: 0.9, roughness: 0.3 });
      s.scatter(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 8), gold, Array.from({ length: 110 }, () => { const r = Math.sqrt(random()) * 0.9, t = random() * Math.PI; return { at: [winner.x + Math.cos(t) * r, 0.012 + random() * 0.02, winner.z + 0.45 + Math.sin(t) * r] as const, size: 1 }; }));
      const balloons = Array.from({ length: 9 }, (_u, i) => ({ at: [winner.x - 0.5 + (i % 3) * 0.24 + random() * 0.1, 2.4 + Math.floor(i / 3) * 0.3 + random() * 0.2, winner.z + 0.1 + random() * 0.2] as const, size: 0.8 + random() * 0.4, color: P.glow[i % 4] }));
      s.scatter(new THREE.SphereGeometry(0.17, 12, 10), new THREE.MeshStandardMaterial({ roughness: 0.25 }), balloons);
      for (const b of balloons.slice(0, 5)) s.rod([b.at[0], b.at[1] - 0.15, b.at[2]], [winner.x - 0.36, 1.8, winner.z + 0.1], 0.004, dark);
    }

    // The far side wall.
    const LX = -W / 2 + 0.2;
    if (a.pit === 'tables') {
      const baize = s.material('#1e7a48', { roughness: 0.95 });
      for (let i = 0; i < 3; i++) {
        const x = -6.35 + (i % 2) * 0.3, z = -1.6 + i * 2.6;
        s.cylinder(1.0, 1.0, 0.1, [x, 0.95, z], dado, 28).scale.set(1, 1, 0.75);
        s.cylinder(0.9, 0.9, 0.105, [x, 0.955, z], baize, 28).scale.set(1, 1, 0.72);
        s.cylinder(0.45, 0.55, 0.9, [x, 0.45, z], dado, 16);
        s.scatter(new THREE.CylinderGeometry(0.19, 0.17, 0.09, 12), s.material(P.b, { roughness: 0.8 }), Array.from({ length: 4 }, (_u, k) => ({ at: [x + 1.15 + (random() - 0.5) * 0.2, 0.68, z - 0.85 + k * 0.57] as const, size: 1 })));
        s.scatter(new THREE.CylinderGeometry(0.04, 0.035, 0.012 * 8, 10), new THREE.MeshStandardMaterial({ roughness: 0.5 }), Array.from({ length: 7 }, (_u, k) => ({ at: [x + 0.5 * random(), 1.05, z - 0.5 + random()] as const, size: 1, color: P.glow[k % 4] })));
      }
    } else if (a.pit === 'bar') {
      s.box([0.7, 1.1, 7.2], [-6.2, 0.55, 1.6], dado);
      s.box([0.9, 0.07, 7.4], [-6.15, 1.13, 1.6], trim);
      s.box([0.14, 3.0, 7.0], [LX, 2.6, 1.6], dark);
      const backlit = s.material(P.glow[0], { emissive: P.glow[0], emissiveIntensity: glow * 0.7 });
      s.box([0.04, 2.8, 6.8], [LX + 0.08, 2.6, 1.6], backlit).castShadow = false;
      for (let r = 0; r < 3; r++) s.box([0.3, 0.05, 6.8], [LX + 0.2, 1.75 + r * 0.8, 1.6], trim);
      const bottles = [] as { at: readonly [number, number, number]; size: number; color: string }[];
      for (let r = 0; r < 3; r++) for (let k = 0; k < 40; k++) if (random() < fill) bottles.push({ at: [LX + 0.22, 1.95 + r * 0.8, -1.7 + k * 0.17], size: 0.8 + random() * 0.4, color: ['#3a6a2a', '#8a4a1a', '#c9d6da', '#7a1a2a', '#1a3a6a', '#d9a93a'][Math.floor(random() * 6)] });
      s.scatter(new THREE.CylinderGeometry(0.03, 0.05, 0.36, 8), new THREE.MeshStandardMaterial({ roughness: 0.2 }), bottles);
      s.scatter(new THREE.CylinderGeometry(0.19, 0.17, 0.09, 12), s.material(P.b, { roughness: 0.8 }), Array.from({ length: 8 }, (_u, k) => ({ at: [-5.45 + (random() - 0.5) * 0.15, 0.74, -1.5 + k * 0.88] as const, size: 1 })));
      s.scatter(new THREE.CylinderGeometry(0.03, 0.16, 0.72, 8), s.material('#b9bcc0', { metalness: 0.8, roughness: 0.3 }), Array.from({ length: 8 }, (_u, k) => ({ at: [-5.45, 0.36, -1.5 + k * 0.88] as const, size: 1 })));
    } else if (a.pit === 'cage') {
      s.box([0.6, 1.1, 7.2], [-7.5, 0.55, 1.6], dado);
      s.box([0.8, 0.07, 7.4], [-7.45, 1.13, 1.6], s.material('#e9e2d0', { roughness: 0.25 }));
      s.box([0.3, 0.5, 7.4], [-7.5, 3.3, 1.6], dado);
      const cageSign = s.label('CASHIER', 3.2, 0.36, [-7.34, 3.3, 1.6], P.glow[0], '#1a0a10');
      cageSign.rotation.y = Math.PI / 2;
      const bars: { at: readonly [number, number, number]; size: number }[] = [];
      for (let k = 0; k <= 60; k++) { const z = -2 + k * 0.12; if (Math.abs(((z + 2) % 2.4) - 1.2) > 0.28) bars.push({ at: [-7.3, 2.11, z], size: 1 }); }
      s.scatter(new THREE.CylinderGeometry(0.014, 0.014, 1.9, 6), trim, bars);
      for (let k = 0; k < 3; k++) { s.box([0.04, 0.5, 0.6], [-7.3, 1.42, -0.8 + k * 2.4], lampGlow).castShadow = false; s.box([0.1, 0.05, 0.7], [-7.3, 1.7, -0.8 + k * 2.4], trim); }
      for (let k = 0; k < 4; k++) s.box([0.3, 2.3, 0.24], [-7.4, 2.2, -2.0 + k * 2.4], dado);
    } else if (a.pit === 'highlimit') {
      s.box([0.24, 3.6, 3.0], [LX, 1.8, 1.6], trim);
      const curtain = s.material(P.base, { roughness: 1 });
      for (let k = 0; k < 9; k++) s.cylinder(0.16, 0.16, 3.3, [LX + 0.14, 1.65, 0.4 + k * 0.3], curtain, 8);
      s.label('HIGH LIMIT', 2.4, 0.4, [LX + 0.3, 3.85, 1.6], P.glow[0], '#1a0a10').rotation.y = Math.PI / 2;
      const posts = [-0.2, 1.0, 2.2, 3.4].map((z) => [-6.4, z] as const);
      for (const [x, z] of posts) { s.cylinder(0.16, 0.17, 0.04, [x, 0.02, z], trim, 14); s.cylinder(0.025, 0.025, 0.95, [x, 0.5, z], trim, 8); s.ball([0.05, 0.05, 0.05], [x, 1.0, z], trim, 8); }
      const rope = s.material(a.style === 'deco' ? '#126b46' : '#9c1424', { roughness: 1 });
      for (let k = 0; k < 3; k++) if (k !== 1) s.tube([[-6.4, 0.92, posts[k][1]], [-6.4, 0.7, (posts[k][1] + posts[k + 1][1]) / 2], [-6.4, 0.92, posts[k + 1][1]]], 0.028, rope);
      s.box([1.5, 0.02, 3.2], [-7.0, 0.012, 1.6], rope);
    }

    // Ceiling: an open coffer grid of beams, cut away toward the viewer.
    const beam = s.material(new THREE.Color(P.dado).lerp(bg, 0.28), { roughness: 0.6 });
    const xs = [-7.6, -3.6, 0.3, 4.2, 7.8], zs = [-5.8, -3.3, -0.8];
    for (const z of zs) s.box([W, 0.24, 0.2], [0, CEIL, z], beam);
    for (const x of xs) s.box([0.13, 0.2, x === 0.3 ? 8.0 : 5.3], [x, CEIL, x === 0.3 ? -2.0 : -3.3], beam);
    s.box([2.6, 0.2, 0.13], [HERO[0], CEIL, HERO[1]], beam);
    for (const z of zs) s.box([W, 0.04, 0.26], [0, CEIL - 0.14, z], trim);
    const domes: { at: readonly [number, number, number]; size: number }[] = [];
    for (const x of xs) for (const z of zs) if (a.watched === 'everywhere' ? !(x === 0.3 && z === -3.3) : random() < 0.28) domes.push({ at: [x + 0.32, CEIL - 0.18, z + 0.32], size: 1 });
    if (a.watched === 'everywhere') domes.push({ at: [HERO[0] + 1.25, CEIL - 0.18, HERO[1]], size: 1 }, { at: [HERO[0] - 1.25, CEIL - 0.18, HERO[1]], size: 1 });
    if (!domes.length) domes.push({ at: [4.2 + 0.32, CEIL - 0.18, -0.8 + 0.32], size: 1 });
    s.scatter(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), s.material('#08090c', { roughness: 0.12, metalness: 0.5 }), domes);
    s.scatter(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 14), s.material('#d8d6d0'), domes.map((d) => ({ at: [d.at[0], d.at[1] + 0.02, d.at[2]] as const, size: 1 })));

    // Chandeliers: one grand one over the clearing, lesser ones receding.
    const crystals: { at: readonly [number, number, number]; size: number }[] = [];
    const twinkle = new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: a.chandelier === 'rings' ? P.glow[0] : '#ffe6b0', emissiveIntensity: glow * 1.3, roughness: 0.2 });
    const silk = s.material('#c4162a', { emissive: '#ff3a2a', emissiveIntensity: glow * 0.8, roughness: 0.7 });
    const hang = (x: number, z: number, size: number) => {
      const y = CEIL - 0.9 - size * 0.25;
      s.cylinder(0.025, 0.025, CEIL - y, [x, (CEIL + y) / 2, z], trim, 6);
      s.cylinder(0.3 * size, 0.2 * size, 0.08, [x, CEIL - 0.19, z], trim, 16);
      if (a.chandelier === 'crystal') {
        [[0.95, 0], [0.62, 0.34], [0.3, 0.62]].forEach(([r, lift]) => {
          s.ring(r * size, 0.03 * size, [x, y + lift * size, z], trim).rotation.x = Math.PI / 2;
          const n = Math.round(r * 22);
          for (let k = 0; k < n; k++) { const t = (k / n) * 6.283; for (let d = 0; d < 3; d++) crystals.push({ at: [x + Math.cos(t) * r * size, y + lift * size - d * 0.11 * size, z + Math.sin(t) * r * size], size: size * (1 - d * 0.22) }); }
        });
        s.ball([0.16 * size, 0.3 * size, 0.16 * size], [x, y - 0.25 * size, z], twinkle, 10).castShadow = false;
      } else if (a.chandelier === 'globes') {
        s.ring(0.85 * size, 0.045 * size, [x, y, z], trim).rotation.x = Math.PI / 2;
        for (let k = 0; k < 4; k++) s.rod([x, y + 0.7 * size, z], [x + Math.cos(k * 1.571) * 0.85 * size, y, z + Math.sin(k * 1.571) * 0.85 * size], 0.014, trim);
        for (let k = 0; k < 8; k++) crystals.push({ at: [x + Math.cos(k * 0.785) * 0.85 * size, y + 0.14 * size, z + Math.sin(k * 0.785) * 0.85 * size], size: size * 2.6 });
      } else if (a.chandelier === 'lanterns') {
        const n = size > 1.2 ? 5 : 3;
        for (let k = 0; k < n; k++) {
          const t = k * 2.1 + x, r = k ? 0.55 * size : 0, ly = y + (k % 2) * 0.35 * size;
          s.ball([0.3 * size, 0.26 * size, 0.3 * size], [x + Math.cos(t) * r, ly, z + Math.sin(t) * r], silk, 12);
          s.cylinder(0.13 * size, 0.13 * size, 0.56 * size, [x + Math.cos(t) * r, ly, z + Math.sin(t) * r], trim, 10);
          s.cylinder(0.02, 0.035, 0.3 * size, [x + Math.cos(t) * r, ly - 0.42 * size, z + Math.sin(t) * r], trim, 6);
          s.rod([x + Math.cos(t) * r, ly + 0.26 * size, z + Math.sin(t) * r], [x, y + 0.9 * size, z], 0.008, dark);
        }
      } else {
        [[1.0, 0, 0.12], [0.68, 0.3, -0.16], [0.36, 0.56, 0.1]].forEach(([r, lift, tilt]) => {
          const halo = s.ring(r * size, 0.035 * size, [x, y + lift * size, z], twinkle);
          halo.rotation.set(Math.PI / 2 + tilt, 0, tilt); halo.castShadow = false;
        });
      }
    };
    hang(HERO[0], HERO[1], 1.8);
    for (const [x, z] of [[-3.6, -3.3], [4.2, -3.3], [-7.6, -0.8], [7.8, -0.8]] as const) if (random() < mix(0.75, 1, mood.density)) hang(x + (x < -7 ? 0.9 : x > 7 ? -0.9 : 0), z, 0.8);
    if (crystals.length) s.scatter(a.chandelier === 'globes' ? new THREE.SphereGeometry(0.06, 10, 8) : new THREE.OctahedronGeometry(0.075), twinkle, crystals).castShadow = false;

    // Smoke: soft-edged sheets hanging in the far ranks.
    if (a.smoke > 0.15) {
      const smokeTexture = paint(256, 128, (c) => {
        for (let i = 0; i < 26; i++) {
          const x = random() * 256, y = 30 + random() * 70, r = 30 + random() * 50;
          const g = c.createRadialGradient(x, y, 2, x, y, r);
          g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = g; c.fillRect(0, 0, 256, 128);
        }
        const fade = c.createLinearGradient(0, 0, 256, 0);
        fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(0.12, 'rgba(0,0,0,0)'); fade.addColorStop(0.88, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
        c.globalCompositeOperation = 'destination-out'; c.fillStyle = fade; c.fillRect(0, 0, 256, 128);
        const lid = c.createLinearGradient(0, 0, 0, 128);
        lid.addColorStop(0, 'rgba(0,0,0,1)'); lid.addColorStop(0.3, 'rgba(0,0,0,0)'); lid.addColorStop(0.7, 'rgba(0,0,0,0)'); lid.addColorStop(1, 'rgba(0,0,0,1)');
        c.fillStyle = lid; c.fillRect(0, 0, 256, 128);
      });
      const tone = new THREE.Color(P.bg).lerp(new THREE.Color('#dfe6f2'), 0.6);
      for (const [z, h] of [[-4.75, 3.4], [-2.9, 3.0], [-1.9, 2.4]] as const) {
        const sheet = s.mesh(new THREE.PlaneGeometry(W - 0.6, 3.2), new THREE.MeshBasicMaterial({ map: smokeTexture, color: tone, transparent: true, opacity: a.smoke * 0.42, depthWrite: false }), [-0.2, h, z]);
        sheet.castShadow = sheet.receiveShadow = false;
      }
    }

    // Small things that tell the hour.
    const steel = s.material('#b9bcc0', { metalness: 0.8, roughness: 0.3 });
    const px = 6.4, pz = 4.6;
    if (a.moment === 'peak') {
      s.box([0.5, 0.04, 0.8], [px, 0.85, pz], steel); s.box([0.5, 0.04, 0.8], [px, 0.35, pz], steel);
      for (const dx of [-0.23, 0.23]) for (const dz of [-0.38, 0.38]) s.cylinder(0.015, 0.015, 0.9, [px + dx, 0.47, pz + dz], steel, 6);
      s.scatter(new THREE.CylinderGeometry(0.035, 0.03, 0.14, 8), new THREE.MeshStandardMaterial({ roughness: 0.2 }), Array.from({ length: 12 }, (_u, k) => ({ at: [px - 0.15 + (k % 3) * 0.15, 0.94, pz - 0.3 + Math.floor(k / 3) * 0.2] as const, size: 1, color: P.glow[k % 4] })));
    } else if (a.moment === 'dead' || a.moment === 'dying') {
      s.box([0.55, 0.75, 0.9], [px, 0.5, pz], s.material('#d8c84a'));
      s.box([0.5, 0.3, 0.4], [px, 0.95, pz - 0.2], s.material('#3a4a6a'));
      s.rod([px + 0.1, 0.1, pz + 0.3], [px + 0.25, 1.5, pz + 0.55], 0.02, steel);
      s.box([0.36, 0.06, 0.14], [px + 0.08, 0.06, pz + 0.3], s.material('#e8e4d8'));
      const cone = s.mesh(new THREE.ConeGeometry(0.2, 0.7, 4, 1, true), s.material('#f2c416', { side: THREE.DoubleSide }), [px - 1.1, 0.35, pz - 0.4]);
      cone.rotation.y = 0.6;
      if (a.moment === 'dying') for (const m of machines.filter((m) => m.state === 'gone').slice(0, 14)) { const patch = s.box([0.62, 0.012, 0.5], [m.x, 0.007, m.z], s.material(P.base, { roughness: 1 })); patch.rotation.y = m.turn; patch.castShadow = false; }
    }

    const speed = mix(0.3, 3, mood.energy);
    return {
      ...world,
      update: (_dt, time) => {
        chaseMaterials.forEach((material, index) => { material.emissiveIntensity = glow * (0.25 + 1.5 * Math.max(0, Math.sin(time * speed * 2 + index * 2.1))); });
        flashers.forEach((material, index) => { material.emissiveIntensity = glow * (0.5 + 0.15 * Math.sin(time * speed * 1.3 + index * 1.7)); });
        twinkle.emissiveIntensity = glow * (1.2 + 0.25 * Math.sin(time * speed * 0.9));
        if (beacon) beacon.emissiveIntensity = 0.6 + 2 * Math.max(0, Math.sin(time * speed * 5));
      },
    };
  },
});
