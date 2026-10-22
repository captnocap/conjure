import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type P3 = [number, number, number];
type P2 = readonly [number, number];
const FONT: Record<string, P2[][]> = {
  A: [[[0, 0], [2, 6], [4, 0]], [[1, 2.4], [3, 2.4]]],
  B: [[[0, 0], [0, 6], [2.6, 6], [3.5, 5], [3.5, 4], [2.6, 3], [0, 3]], [[2.6, 3], [3.9, 2.2], [3.9, 1], [2.8, 0], [0, 0]]],
  C: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1]]],
  D: [[[0, 0], [0, 6], [2.4, 6], [4, 4.5], [4, 1.5], [2.4, 0], [0, 0]]],
  E: [[[4, 6], [0, 6], [0, 0], [4, 0]], [[0, 3], [3, 3]]],
  L: [[[0, 6], [0, 0], [4, 0]]],
  N: [[[0, 0], [0, 6], [4, 0], [4, 6]]],
  O: [[[1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 1], [3, 0], [1, 0]]],
  P: [[[0, 0], [0, 6], [2.8, 6], [4, 5], [4, 3.8], [2.8, 2.8], [0, 2.8]]],
  R: [[[0, 0], [0, 6], [2.8, 6], [4, 5], [4, 3.8], [2.8, 2.8], [0, 2.8]], [[2, 2.8], [4, 0]]],
  S: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 4], [1, 3], [3, 3], [4, 2], [4, 1], [3, 0], [1, 0], [0, 1]]],
  T: [[[0, 6], [4, 6]], [[2, 6], [2, 0]]],
};
const NEON = {
  bar: { say: 'BAR in red with a blue underline.', lines: ['BAR'], c: ['#ff3030', '#3f7bff'] },
  beer: { say: 'COLD BEER in amber and white.', lines: ['COLD', 'BEER'], c: ['#ffa514', '#fff0cf'] },
  lastcall: { say: 'LAST CALL in hot pink and turquoise.', lines: ['LAST', 'CALL'], c: ['#ff4fb0', '#22e0d0'] },
  open: { say: 'OPEN in red inside a blue border.', lines: ['OPEN'], c: ['#ff3030', '#3f7bff'] },
  dead: { say: 'A sign that died years ago: grey glass tubes spelling BAR, never fixed.', lines: ['BAR'], c: ['#9a9ea6', '#9a9ea6'] },
} as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineWorld({
  questions: {
    occasion: choice('What is happening in the bar tonight?', {
      lastcall: 'Last call: glasses and pitchers crowd the bar, stools pulled out at all angles.',
      quiet: 'A slow weeknight: a few drinks left out, the TV talking to nobody.',
      closed: 'Closed up: stools turned over on the bar, chairs on the table, a mop and bucket out.',
      birthday: 'Somebody\'s birthday: bunting strung across the room and balloons tied to the bar.',
      wake: 'A wake for a regular: a framed photo with a black ribbon on the bar, flowers and a row of poured shots.',
    }),
    walls: choice('What are the walls like?', {
      panel: 'Brown wood panelling from floor to ceiling.',
      tin: 'Pressed-tin wainscot under nicotine-yellow plaster.',
      brick: 'Old red brick above a dark wood wainscot.',
      green: 'Pub-green paint over dark panelling.',
    }),
    floor: choice('What is the floor?', {
      planks: 'Scuffed dark wood planks.',
      checker: 'Black and cream checkerboard lino, worn through in places.',
      carpet: 'Sticky patterned red carpet.',
      concrete: 'Painted concrete, the paint long gone where people stand.',
    }),
    neon: choice('What does the neon on the back wall say?', Object.fromEntries(Object.entries(NEON).map(([k, v]) => [k, v.say])) as Record<keyof typeof NEON, string>),
    board: choice('What is chalked on the specials board?', {
      pitchers: 'PITCHERS $6', cash: 'CASH ONLY', call: 'LAST CALL 1:45', karaoke: 'KARAOKE THURS', tab: 'NO TABS', eddie: 'FOR EDDIE',
    }),
    tv: choice('What is on the old TV in the corner?', {
      game: 'A ball game, green and bright.',
      static: 'Static snow.',
      keno: 'A blue keno board of numbers.',
      off: 'Nothing: it is switched off.',
    }),
    bar: choice('What is the bar itself built from?', {
      oak: 'Scarred honey oak with a dark padded rail.',
      mahogany: 'Deep red mahogany, polished by elbows.',
      black: 'Black paint with a red vinyl armrest.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const dusk = new THREE.Color('#cf9f6a').lerp(new THREE.Color('#e3bf8f'), mood.cheer * 0.6).lerp(new THREE.Color('#b9a79a'), (1 - mood.warmth) * 0.35);
    const { art: s, world } = diorama(context, {
      background: '#' + dusk.getHexString(), floor: '#5b4636', width: 14, depth: 9, maxHeight: 2.5, radius: 1.25, pitch: 30, yaw: 31,
      slots: [[2.6, 0.9], [5.1, -1.9, 0, 0.9], [5.2, 2.3, 0, 0.9], [-0.9, 2.7, 0, 0.9], [-1.4, 0.2, 0, 0.75]],
    });
    const closed = a.occasion === 'closed';
    for (const child of s.root.children) {
      const light = child as THREE.HemisphereLight;
      if (light.isHemisphereLight) { light.color.set('#ffdcae'); light.groundColor.set('#7a5a44'); light.intensity = closed ? 1.05 : 1.3; }
    }
    if (world.keyLight) world.keyLight.intensity = closed ? 1.9 : 2.4;
    const WX = 14, WZ = 9, H = 3.5, backZ = -WZ / 2, leftX = -WX / 2;
    const std = (map: THREE.Texture, roughness = 0.85) => new THREE.MeshStandardMaterial({ map, roughness });
    const brass = s.material('#c9a03c', { metalness: 0.85, roughness: 0.28 }), chrome = s.material('#d9dde0', { metalness: 0.9, roughness: 0.22 });
    const dark = s.material('#1b1a1c'), woodDark = s.material('#4a2c1c', { roughness: 0.5 });
    const glowMats: { material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial; base: number; rate: number }[] = [];
    const glow = (color: string, base = 1, rate = 0) => { const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: base, roughness: 0.35 }); glowMats.push({ material, base, rate }); return material; };

    // Floor, with the worn patch where people stand.
    const floor = paint(1024, 660, (ctx, w, h) => {
      const X = (x: number) => (x + WX / 2) / WX * w, Z = (z: number) => (z + WZ / 2) / WZ * h;
      if (a.floor === 'planks') { ctx.fillStyle = '#6a4a30'; ctx.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 22) { let x = -random() * 200; while (x < w) { const len = 120 + random() * 200; ctx.fillStyle = `hsl(26 ${30 + random() * 12}% ${24 + random() * 10}%)`; ctx.fillRect(x + 1, y + 1, len - 2, 20); x += len; } } }
      else if (a.floor === 'checker') { for (let i = 0; i < 28; i++) for (let j = 0; j < 18; j++) { ctx.fillStyle = (i + j) % 2 ? '#d9cfae' : '#26262a'; ctx.fillRect(i * w / 28, j * h / 18, w / 28 + 1, h / 18 + 1); } }
      else if (a.floor === 'carpet') { ctx.fillStyle = '#7a2a2a'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) for (let j = 0; j < 26; j++) { ctx.fillStyle = (i + j) % 2 ? '#c9a03c' : '#3a1414'; ctx.beginPath(); ctx.arc(i * 26 + 13, j * 26 + 13, (i + j) % 2 ? 4 : 8, 0, 7); ctx.fill(); } }
      else { ctx.fillStyle = '#8a3a30'; ctx.fillRect(0, 0, w, h); }
      const worn = (x: number, z: number, rx: number, rz: number, alpha: number) => { const g = ctx.createRadialGradient(X(x), Z(z), 0, X(x), Z(z), rx / WX * w); g.addColorStop(0, `rgba(${a.floor === 'concrete' ? '170,165,155' : '196,170,130'},${alpha})`); g.addColorStop(1, 'rgba(180,160,130,0)'); ctx.save(); ctx.translate(0, Z(z)); ctx.scale(1, rz / rx * (w / WX) / (h / WZ)); ctx.translate(0, -Z(z)); ctx.fillStyle = g; ctx.fillRect(0, -h, w, h * 3); ctx.restore(); };
      worn(2.8, 0.9, 3.4, 2.6, mix(0.35, 0.75, mood.wear)); worn(-2.5, -1.3, 4.5, 0.8, 0.45); worn(-6, 2.6, 1.6, 1.2, 0.4);
      for (let i = 0; i < 40 * mood.wear + 6; i++) { ctx.fillStyle = `rgba(20,14,10,${0.1 + random() * 0.2})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 6 + random() * 24, 4 + random() * 14, random() * 3, 0, 7); ctx.fill(); }
    });
    const floorMesh = s.mesh(new THREE.PlaneGeometry(WX, WZ), std(floor, 0.8), [0, 0.004, 0]); floorMesh.rotation.x = -Math.PI / 2; floorMesh.castShadow = false;

    // Walls: one painted texture, used on the back wall and the left wall.
    const wallArt = (len: number) => paint(1024, 320, (ctx, w, h) => {
      const dado = h * 0.62;
      const planks = (y0: number, y1: number, base: string) => { ctx.fillStyle = base; ctx.fillRect(0, y0, w, y1 - y0); for (let x = 0; x < w; x += w / (len * 5)) { ctx.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,215,160'},${0.04 + random() * 0.1})`; ctx.fillRect(x, y0, w / (len * 5), y1 - y0); ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(x, y0, 2, y1 - y0); } };
      if (a.walls === 'panel') planks(0, h, '#94633c');
      else if (a.walls === 'tin') { ctx.fillStyle = '#d9c078'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#aeb3b0'; ctx.fillRect(0, dado, w, h - dado); for (let x = 0; x < w; x += 30) for (let y = dado + 6; y < h; y += 30) { ctx.strokeStyle = 'rgba(60,65,65,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(x + 3, y, 24, 24); ctx.beginPath(); ctx.arc(x + 15, y + 12, 6, 0, 7); ctx.stroke(); } }
      else if (a.walls === 'brick') { ctx.fillStyle = '#5a3028'; ctx.fillRect(0, 0, w, h); for (let y = 0, r = 0; y < dado; y += 16, r++) for (let x = (r % 2) * -20; x < w; x += 40) { ctx.fillStyle = `hsl(${10 + random() * 10} ${38 + random() * 14}% ${36 + random() * 12}%)`; ctx.fillRect(x + 1, y + 1, 38, 14); } planks(dado, h, '#5b3a24'); }
      else { ctx.fillStyle = '#4f7358'; ctx.fillRect(0, 0, w, h); planks(dado, h, '#5b3a24'); }
      if (a.walls !== 'panel') { ctx.fillStyle = '#3a2416'; ctx.fillRect(0, dado - 5, w, 10); }
      for (let i = 0; i < 16 * mood.wear; i++) { ctx.fillStyle = `rgba(40,25,10,${0.08 + random() * 0.12})`; ctx.fillRect(random() * w, 0, 20 + random() * 60, h * (0.2 + random() * 0.5)); }
    });
    s.box([WX, H, 0.22], [0, H / 2, backZ - 0.11], woodDark);
    s.box([0.22, H, WZ + 0.22], [leftX - 0.11, H / 2, -0.11], woodDark);
    s.mesh(new THREE.PlaneGeometry(WX, H), std(wallArt(WX)), [0, H / 2, backZ + 0.004]);
    s.mesh(new THREE.PlaneGeometry(WZ, H), std(wallArt(WZ)), [leftX + 0.004, H / 2, 0]).rotation.y = Math.PI / 2;
    s.box([WX, 0.16, 0.05], [0, 0.08, backZ + 0.03], woodDark); s.box([0.05, 0.16, WZ], [leftX + 0.03, 0.08, 0], woodDark);
    // A strip of pressed-tin ceiling left in place along both walls, and a beam that carries the lamps.
    const tin = paint(512, 64, (ctx, w, h) => { ctx.fillStyle = '#b9b49c'; ctx.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) for (let y = 0; y < h; y += 32) { ctx.strokeStyle = 'rgba(70,65,50,0.75)'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, 28, 28); ctx.beginPath(); ctx.arc(x + 16, y + 16, 8, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,240,0.35)'; ctx.fillRect(x + 12, y + 12, 5, 5); } for (let i = 0; i < 14 * mood.wear; i++) { ctx.fillStyle = 'rgba(110,60,25,0.35)'; ctx.beginPath(); ctx.arc(random() * w, random() * h, 5 + random() * 14, 0, 7); ctx.fill(); } });
    tin.wrapS = tin.wrapT = THREE.RepeatWrapping;
    const tinA = tin.clone(); tinA.repeat.set(7, 0.4); tinA.needsUpdate = true;
    const tinB = tin.clone(); tinB.repeat.set(4.5, 0.4); tinB.needsUpdate = true;
    s.box([WX, 0.08, 0.8], [0, H + 0.04, backZ + 0.4], std(tinA, 0.5));
    s.box([WZ - 0.8, 0.08, 0.8], [leftX + 0.4, H + 0.04, 0.4], std(tinB, 0.5)).rotation.y = Math.PI / 2;
    tin.dispose();
    const barZ = -2.35, beamY = H - 0.02;

    // The bar: front, scarred top, padded rail, brass foot rail, the return to the wall.
    const x0 = -6.4, x1 = 1.3, bl = x1 - x0, bx = (x0 + x1) / 2, topY = 1.1;
    const barHex = { oak: '#a8743f', mahogany: '#6a2a20', black: '#242326' }[a.bar];
    const barWood = s.material(barHex, { roughness: 0.5 });
    const barTop = paint(512, 64, (ctx, w, h) => { ctx.fillStyle = a.bar === 'black' ? '#3a3034' : a.bar === 'oak' ? '#c08a4c' : '#7a3626'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 90 + mood.wear * 200; i++) { ctx.strokeStyle = `rgba(${random() < 0.6 ? '30,18,10' : '240,215,170'},${0.15 + random() * 0.3})`; ctx.lineWidth = 1 + random() * 1.5; ctx.beginPath(); const x = random() * w, y = random() * h; ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 40, y + (random() - 0.5) * 12); ctx.stroke(); } for (let i = 0; i < 24; i++) { ctx.strokeStyle = 'rgba(40,22,10,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(random() * w, random() * h, 7, 0, 7); ctx.stroke(); } });
    s.box([bl, topY - 0.07, 0.55], [bx, (topY - 0.07) / 2, barZ], barWood);
    for (let i = 0; i < 7; i++) s.box([bl / 7 - 0.16, 0.6, 0.03], [x0 + (i + 0.5) * bl / 7, 0.58, barZ + 0.28], s.material(new THREE.Color(barHex).multiplyScalar(0.78), { roughness: 0.5 }));
    s.box([bl + 0.1, 0.07, 0.85], [bx, topY - 0.035, barZ + 0.02], std(barTop, 0.45));
    s.cylinder(0.055, 0.055, bl + 0.1, [bx, topY - 0.02, barZ + 0.46], s.material(a.bar === 'black' ? '#a3262a' : '#2a1a14', { roughness: 0.45 }), 12).rotation.z = Math.PI / 2;
    s.box([0.6, topY - 0.07, 1.5], [x1 - 0.3, (topY - 0.07) / 2, barZ - 1.0], barWood); s.box([0.7, 0.07, 1.6], [x1 - 0.3, topY - 0.035, barZ - 1.0], std(barTop, 0.45));
    s.cylinder(0.035, 0.035, bl, [bx, 0.2, barZ + 0.48], brass, 12).rotation.z = Math.PI / 2;
    for (let x = x0 + 0.3; x < x1; x += 1.2) { s.rod([x, 0.2, barZ + 0.48], [x, 0.26, barZ + 0.28], 0.018, brass); s.rod([x, 0.2, barZ + 0.48], [x, 0, barZ + 0.5], 0.018, brass); }

    // Stools.
    const vinyl = s.material(['#8e2424', '#245a3c', '#26262a', '#c9972a'][Math.floor(random() * 4)], { roughness: 0.4 });
    const pedestal = new THREE.LatheGeometry([[0.21, 0], [0.2, 0.03], [0.06, 0.06], [0.035, 0.09], [0.033, 0.7], [0.19, 0.73], [0.19, 0.75]].map(([x, y]) => new THREE.Vector2(x, y)), 16);
    const seat = new THREE.LatheGeometry([[0, 0.84], [0.13, 0.835], [0.19, 0.81], [0.2, 0.75], [0, 0.75]].map(([x, y]) => new THREE.Vector2(x, y)), 16);
    const stoolSpots: P3[] = [];
    for (let i = 0; i < 6; i++) {
      const x = x0 + 0.75 + i * 1.22;
      if (closed) stoolSpots.push([x, topY + 0.84, barZ + 0.05]);
      else stoolSpots.push([x + (random() - 0.5) * (a.occasion === 'lastcall' ? 0.5 : 0.15), 0, barZ + 0.85 + (a.occasion === 'lastcall' ? random() * 0.6 : random() * 0.12)]);
    }
    for (const [geometry, material] of [[pedestal, chrome], [seat, vinyl]] as const) {
      const mesh = new THREE.InstancedMesh(geometry, material, stoolSpots.length);
      stoolSpots.forEach((at, i) => { const m = new THREE.Matrix4(); if (closed) m.makeRotationX(Math.PI); m.setPosition(...at); mesh.setMatrixAt(i, m); });
      mesh.castShadow = mesh.receiveShadow = true; s.root.add(mesh);
    }

    // Back bar: cabinet, mirror, shelves of bottles, register, Christmas lights.
    const bbZ = backZ + 0.3, m0 = x0 + 0.2, m1 = x1 - 0.9, ml = m1 - m0, mx = (m0 + m1) / 2;
    s.box([ml + 0.3, 0.95, 0.55], [mx, 0.475, bbZ], woodDark); s.box([ml + 0.4, 0.05, 0.62], [mx, 0.975, bbZ], barWood);
    const mirror = paint(512, 128, (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#d2dcd8'); g.addColorStop(0.5, '#93a6a8'); g.addColorStop(1, '#c0ccc6'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'rgba(255,255,255,0.3)'; for (const x of [70, 210, 330, 450]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x - 40, h); ctx.lineTo(x - 70, h); ctx.fill(); } for (let i = 0; i < 50 * mood.wear; i++) { ctx.fillStyle = 'rgba(70,55,35,0.3)'; ctx.beginPath(); ctx.arc(random() * w, random() < 0.5 ? random() * 20 : h - random() * 20, 2 + random() * 6, 0, 7); ctx.fill(); } });
    s.box([ml + 0.3, 1.6, 0.08], [mx, 1.8, backZ + 0.05], woodDark);
    s.mesh(new THREE.PlaneGeometry(ml, 1.4), new THREE.MeshStandardMaterial({ map: mirror, roughness: 0.2, metalness: 0.15 }), [mx, 1.75, backZ + 0.095]);
    s.box([ml + 0.5, 0.14, 0.3], [mx, 2.67, backZ + 0.15], barWood);
    for (const x of [m0 - 0.1, mx, m1 + 0.1]) s.box([0.14, 1.6, 0.14], [x, 1.8, backZ + 0.12], barWood);
    const shelves = [1.0, 1.52, 2.02];
    for (const y of shelves.slice(1)) s.box([ml, 0.03, 0.22], [mx, y - 0.015, backZ + 0.22], s.material('#cfe0dc', { roughness: 0.1 }));
    const tints = ['#7a4a16', '#2f6b3a', '#d9e6e2', '#3b6fb0', '#a3262a', '#2a2019', '#c98a2a', '#e6d9a8'];
    const profile = [[0, 0], [0.042, 0], [0.044, 0.02], [0.044, 0.19], [0.017, 0.26], [0.015, 0.34], [0, 0.34]].map(([x, y]) => new THREE.Vector2(x, y));
    const bottles: { at: P3; size: number; color: string }[] = [], labels: { at: P3; size: number; color: string }[] = [];
    const stock = mix(0.35, 0.95, mood.density);
    for (const y of shelves) for (let x = m0 + 0.12; x < m1 - 0.08; x += 0.13) {
      if (random() > stock || Math.abs(x - mx) < 0.12) continue;
      if (y === shelves[0] && Math.abs(x - (mx + 1.1)) < 0.4) continue;
      const size = 0.85 + random() * 0.3, z = backZ + (y === shelves[0] ? 0.3 + random() * 0.1 : 0.22);
      bottles.push({ at: [x, y, z], size, color: tints[Math.floor(random() * tints.length)] });
      labels.push({ at: [x, y + 0.1 * size, z], size, color: ['#f1e9d0', '#f1e9d0', '#b02a2a', '#1b1b1b', '#d9b24a'][Math.floor(random() * 5)] });
    }
    if (bottles.length) { s.scatter(new THREE.LatheGeometry(profile, 10), new THREE.MeshStandardMaterial({ roughness: 0.15 }), bottles); s.scatter(new THREE.CylinderGeometry(0.046, 0.046, 0.08, 10), new THREE.MeshStandardMaterial({ roughness: 0.8 }), labels); }
    const rx = mx + 1.1;
    s.box([0.46, 0.14, 0.42], [rx, 1.07, bbZ], woodDark); s.box([0.4, 0.3, 0.36], [rx, 1.29, bbZ - 0.02], brass); s.box([0.34, 0.14, 0.1], [rx, 1.5, bbZ - 0.1], brass);
    s.label('NO SALE', 0.3, 0.09, [rx, 1.5, bbZ - 0.045], '#f4efe0', '#a3262a');
    const bulbs: P3[] = [], wire: P3[] = [];
    for (let i = 0; i <= 60; i++) { const t = i / 60, p: P3 = [m0 - 0.2 + t * (ml + 0.4), 2.56 - Math.abs(Math.sin(t * Math.PI * 7)) * 0.16, backZ + 0.34]; bulbs.push([p[0], p[1] - 0.04, p[2]]); if (i % 2 === 0) wire.push(p); }
    s.tube(wire, 0.008, s.material('#1f3d2a'));
    const strings = ['#ff3b30', '#35c759', '#3478f6', '#ffcc00'].map((color, k) => { const material = glow(color, 0.9, 1 + k * 0.37); s.scatter(new THREE.SphereGeometry(0.038, 8, 6), material, bulbs.filter((_p, i) => i % 4 === k).map((at) => ({ at, size: 1 }))); return material; });
    void strings;

    // Pendant lamps over the bar and a ceiling fan over the floor.
    const lampOn = closed ? 0.12 : mix(0.8, 1.5, mood.cheer);
    const shade = s.material('#2f5a44', { roughness: 0.35, side: THREE.DoubleSide });
    for (const x of [-5.3, -2.6, 0.1]) {
      s.rod([x, beamY, barZ + 0.1], [x, 2.62, barZ + 0.1], 0.012, dark); s.cylinder(0.07, 0.07, 0.03, [x, beamY, barZ + 0.1], brass, 12);
      s.lathe([[0.03, 0.2], [0.07, 0.17], [0.3, 0], [0.31, -0.02]], shade, [x, 2.42, barZ + 0.1]);
      s.ball([0.08, 0.08, 0.08], [x, 2.42, barZ + 0.1], glow('#ffd98a', lampOn), 10);
    }
    s.cylinder(0.12, 0.12, 0.04, [3.4, beamY, 0.4], brass, 14);
    const fan = new THREE.Group(); fan.position.set(3.4, H - 0.42, 0.4);
    for (let i = 0; i < 4; i++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.02, 0.17), woodDark); blade.position.set(Math.cos(i * Math.PI / 2) * 0.47, 0, Math.sin(i * Math.PI / 2) * 0.47); blade.rotation.y = -i * Math.PI / 2; blade.castShadow = true; fan.add(blade); }
    s.root.add(fan);
    s.rod([3.4, beamY, 0.4], [3.4, H - 0.4, 0.4], 0.02, brass); s.cylinder(0.11, 0.09, 0.14, [3.4, H - 0.42, 0.4], brass, 14);

    // Dusk window of glass block, the neon beside it, the specials board.
    const sky = new THREE.Color().setHSL(mix(0.58, 0.07, mood.daylight), 0.75, mix(0.72, 0.6, mood.daylight));
    const block = paint(256, 128, (ctx, w, h) => { ctx.fillStyle = '#' + sky.getHexString(); ctx.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) for (let y = 0; y < h; y += 32) { ctx.strokeStyle = 'rgba(60,45,35,0.8)'; ctx.lineWidth = 3; ctx.strokeRect(x, y, 32, 32); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x + 6, y + 6, 12, 8); } });
    s.box([2.2, 1.2, 0.1], [5.3, 2.35, backZ + 0.03], woodDark);
    s.mesh(new THREE.PlaneGeometry(2.0, 1.0), new THREE.MeshStandardMaterial({ map: block, emissiveMap: block, emissive: '#ffffff', emissiveIntensity: 0.75, roughness: 0.3 }), [5.3, 2.35, backZ + 0.085]);
    const N = NEON[a.neon], live = a.neon !== 'dead';
    const sign = new THREE.Group(); sign.position.set(2.9, 2.5, backZ + 0.12); s.root.add(sign);
    const lh = N.lines.length > 1 ? 0.42 : 0.62, nw = 1.75, nh = N.lines.length > 1 ? 1.2 : 0.95;
    const back = new THREE.Mesh(new THREE.BoxGeometry(nw, nh, 0.05), s.material('#17181b', { roughness: 0.7 })); back.position.z = -0.06; back.castShadow = true; sign.add(back);
    const halo = paint(512, Math.round(512 * nh / nw), (ctx, w, h) => {
      if (!live) return; ctx.lineCap = ctx.lineJoin = 'round'; const px = w / nw;
      N.lines.forEach((word, li) => { const h0 = lh, total = word.length * h0 * 0.6 + (word.length - 1) * h0 * 0.24; let x = -total / 2; const cy = N.lines.length > 1 ? (li ? -0.27 : 0.27) : 0.06; for (const letter of word) { for (const line of FONT[letter] ?? []) { ctx.strokeStyle = ctx.shadowColor = N.c[li % 2]; ctx.shadowBlur = 30; ctx.lineWidth = 12; ctx.globalAlpha = 0.6; ctx.beginPath(); line.forEach(([lx, ly], i) => { const X = w / 2 + (x + lx / 4 * h0 * 0.6) * px, Y = h / 2 - (cy - h0 / 2 + ly / 6 * h0) * px; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.stroke(); ctx.stroke(); } x += h0 * 0.84; } });
    });
    const haloMesh = new THREE.Mesh(new THREE.PlaneGeometry(nw, nh), new THREE.MeshBasicMaterial({ map: halo, transparent: true, depthWrite: false })); haloMesh.position.z = -0.03; sign.add(haloMesh);
    const tubeMats = N.c.map((c, i) => live ? glow(c, mix(0.4, 0.7, mood.cheer), 30 + i * 7) : s.material('#9a9ea6', { roughness: 0.2 }));
    N.lines.forEach((word, li) => {
      const total = word.length * lh * 0.6 + (word.length - 1) * lh * 0.24; let x = -total / 2; const cy = N.lines.length > 1 ? (li ? -0.27 : 0.27) : 0.06;
      for (const letter of word) {
        for (const line of FONT[letter] ?? []) {
          const pts = line.map(([lx, ly]) => new THREE.Vector3(x + lx / 4 * lh * 0.6, cy - lh / 2 + ly / 6 * lh, 0));
          const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.22), pts.length * 6, 0.024, 6), tubeMats[li % 2]); tube.castShadow = true; sign.add(tube);
        }
        x += lh * 0.84;
      }
    });
    if (N.lines.length === 1) { const under = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, nw * 0.8, 6), tubeMats[1]); under.rotation.z = Math.PI / 2; under.position.y = -0.36; sign.add(under); }
    const boardText = { pitchers: 'PITCHERS $6', cash: 'CASH ONLY', call: 'LAST CALL 1:45', karaoke: 'KARAOKE THURS', tab: 'NO TABS', eddie: 'FOR EDDIE' }[a.board];
    s.box([1.7, 0.6, 0.05], [5.3, 1.25, backZ + 0.03], barWood);
    s.label(boardText, 1.56, 0.46, [5.3, 1.25, backZ + 0.06], '#f1eee0', '#1f2a25');

    // Left wall: door with EXIT sign, dollar bills and photographs stapled over the panelling, the TV on its bracket.
    s.box([0.08, 2.15, 1.0], [leftX + 0.05, 1.075, 3.3], s.material('#3a2a22', { roughness: 0.5 })); s.box([0.05, 0.5, 0.4], [leftX + 0.08, 1.6, 3.3], glow('#' + sky.getHexString(), 0.6));
    s.ball([0.045, 0.045, 0.045], [leftX + 0.12, 1.05, 2.95], brass, 10);
    s.box([0.06, 0.24, 0.6], [leftX + 0.06, 2.42, 3.3], dark); const exit = s.label('EXIT', 0.52, 0.18, [leftX + 0.095, 2.42, 3.3], '#fff2e8', '#c0201c'); exit.rotation.y = Math.PI / 2;
    const exitMat = exit.material as THREE.MeshStandardMaterial; exitMat.emissiveMap = exitMat.map; exitMat.emissive = new THREE.Color('#ffffff'); exitMat.emissiveIntensity = 0.9;
    const pinned: { at: P3; size: number; color: string }[] = [], pinnedBack: { at: P3; size: number; color: string }[] = [];
    const paper = () => { const k = random(); return k < 0.55 ? '#8fae84' : k < 0.75 ? '#d9c9a0' : k < 0.9 ? '#f1ead6' : '#8a6a4a'; };
    for (let i = 0; i < mix(30, 130, mood.density); i++) pinned.push({ at: [leftX + 0.012 + random() * 0.01, 1.35 + random() ** 1.3 * 1.6, -3.4 + random() * 5.6], size: 0.8 + random() * 0.6, color: paper() });
    for (let i = 0; i < mix(8, 40, mood.density); i++) pinnedBack.push({ at: [1.7 + random() * 2.3, 0.75 + random() * 1.05, backZ + 0.012 + random() * 0.01], size: 0.8 + random() * 0.6, color: paper() });
    const jitter = (mesh: THREE.InstancedMesh, axis: 'x' | 'z') => { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(); for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, m); m.decompose(p, q, sc); q.setFromAxisAngle(new THREE.Vector3(axis === 'x' ? 1 : 0, 0, axis === 'z' ? 1 : 0), (random() - 0.5) * 0.7); m.compose(p, q, sc); mesh.setMatrixAt(i, m); } mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = false; };
    jitter(s.scatter(new THREE.BoxGeometry(0.006, 0.12, 0.26), new THREE.MeshStandardMaterial({ roughness: 0.9 }), pinned), 'x');
    jitter(s.scatter(new THREE.BoxGeometry(0.26, 0.12, 0.006), new THREE.MeshStandardMaterial({ roughness: 0.9 }), pinnedBack), 'z');
    for (let i = 0; i < 5; i++) { const z = -2.6 + i * 1.15 + random() * 0.3, y = 1.75 + random() * 0.8, w = 0.4 + random() * 0.25, h = 0.32 + random() * 0.2; s.box([0.03, h + 0.07, w + 0.07], [leftX + 0.03, y, z], dark); s.box([0.012, h, w], [leftX + 0.045, y, z], s.material(['#b9a27a', '#8a7a66', '#c9b48a', '#6f7f8a'][i % 4], { roughness: 0.7 })); s.box([0.012, h * 0.45, w * 0.5], [leftX + 0.052, y - h * 0.2, z], s.material('#4a3a2e')); }
    const tvG = new THREE.Group(); tvG.position.set(leftX + 0.6, 2.3, backZ + 0.95); tvG.rotation.set(0.25, Math.PI / 4, 0, 'YXZ'); s.root.add(tvG);
    const tvBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.62, 0.6), s.material('#3a3632', { roughness: 0.6 })); tvBody.castShadow = true; tvG.add(tvBody);
    const screen = paint(256, 192, (ctx, w, h) => {
      if (a.tv === 'off') { ctx.fillStyle = '#1b2220'; ctx.fillRect(0, 0, w, h); return; }
      if (a.tv === 'game') { ctx.fillStyle = '#2f8a3c'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#eaf6e0'; ctx.lineWidth = 4; ctx.strokeRect(20, 30, w - 40, h - 60); ctx.beginPath(); ctx.moveTo(w / 2, 30); ctx.lineTo(w / 2, h - 30); ctx.stroke(); ctx.fillStyle = '#111'; ctx.fillRect(0, h - 26, w, 26); ctx.fillStyle = '#ffd61a'; ctx.font = 'bold 20px monospace'; ctx.fillText('HOME 3  AWAY 4', 14, h - 7); for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#e8331f' : '#f4f1e6'; ctx.fillRect(40 + random() * 170, 50 + random() * 90, 7, 12); } }
      else if (a.tv === 'static') { for (let x = 0; x < w; x += 4) for (let y = 0; y < h; y += 4) { const v = Math.floor(random() * 255); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(x, y, 4, 4); } }
      else { ctx.fillStyle = '#12308a'; ctx.fillRect(0, 0, w, h); ctx.font = 'bold 15px monospace'; for (let i = 0; i < 40; i++) { const hit = random() < 0.3; ctx.fillStyle = hit ? '#ffd61a' : '#284ab0'; ctx.fillRect(10 + (i % 10) * 24, 24 + Math.floor(i / 10) * 38, 20, 30); ctx.fillStyle = hit ? '#111' : '#9ab'; ctx.fillText(String(i + 1), 12 + (i % 10) * 24, 45 + Math.floor(i / 10) * 38); } }
    });
    const screenMat = new THREE.MeshStandardMaterial({ map: screen, emissiveMap: screen, emissive: '#ffffff', emissiveIntensity: a.tv === 'off' ? 0 : 0.9, roughness: 0.3 });
    if (a.tv !== 'off') glowMats.push({ material: screenMat, base: 0.9, rate: 17 });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.5), screenMat); face.position.z = 0.305; tvG.add(face);
    s.rod([leftX + 0.05, 2.7, backZ + 0.1], [leftX + 0.5, 2.35, backZ + 0.8], 0.03, dark);

    // Corner table and chairs, kegs and crates by the bar end.
    const tx = -5.2, tz = 2.9;
    s.cylinder(0.5, 0.5, 0.05, [tx, 0.76, tz], barWood, 24); s.cylinder(0.05, 0.05, 0.72, [tx, 0.38, tz], dark, 10); s.cylinder(0.28, 0.32, 0.04, [tx, 0.02, tz], dark, 16);
    const chair = (x: number, z: number, turn: number, up: boolean) => {
      const g = new THREE.Group(), add = (size: P3, at: P3) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), woodDark); m.position.set(...at); m.castShadow = true; g.add(m); };
      add([0.42, 0.04, 0.42], [0, 0.46, 0]); add([0.42, 0.45, 0.04], [0, 0.78, -0.19]);
      for (const cx of [-0.18, 0.18]) for (const cz of [-0.18, 0.18]) add([0.04, 0.46, 0.04], [cx, 0.23, cz]);
      g.rotation.y = turn; if (up) { g.rotation.x = Math.PI; g.position.set(x, 0.78 + 0.48, z); } else g.position.set(x, 0, z);
      s.root.add(g);
    };
    if (closed) { chair(tx - 0.15, tz, 0.4, true); chair(tx + 0.2, tz + 0.05, 2.2, true); }
    else { chair(tx - 0.85, tz + 0.1, Math.PI / 2 + random() * 0.4, false); chair(tx + 0.5, tz + 0.75, Math.PI + 0.6 + random() * 0.5, false); }
    for (const [x, z] of [[6.3, -3.9], [5.6, -3.85]] as const) { s.cylinder(0.21, 0.21, 0.6, [x, 0.3, z], chrome, 16); s.ring(0.21, 0.02, [x, 0.45, z], chrome).rotation.x = Math.PI / 2; s.ring(0.21, 0.02, [x, 0.15, z], chrome).rotation.x = Math.PI / 2; }
    for (let i = 0; i < 3; i++) s.box([0.45, 0.3, 0.34], [6.4 + (random() - 0.5) * 0.06, 0.15 + i * 0.3, -3.2], s.material(['#c8452f', '#2f5a8c', '#c9972a'][i], { roughness: 0.7 })).rotation.y = (random() - 0.5) * 0.2;

    // Glasses and pitchers on the bar, and what the occasion adds.
    const glass = new THREE.MeshStandardMaterial({ color: '#eef6f4', transparent: true, opacity: 0.4, roughness: 0.05 });
    const beer = s.material('#d8962a', { roughness: 0.25, emissive: '#d8962a', emissiveIntensity: 0.12 });
    const pint = (x: number, z: number, fill: number, y = topY) => { s.cylinder(0.055, 0.042, 0.19, [x, y + 0.095, z], glass, 10); if (fill > 0.05) s.cylinder(0.046, 0.04, 0.17 * fill, [x, y + 0.01 + 0.085 * fill, z], beer, 10); };
    const pitcher = (x: number, z: number, fill: number, y = topY) => { s.cylinder(0.1, 0.085, 0.28, [x, y + 0.14, z], glass, 12); s.cylinder(0.088, 0.08, 0.25 * fill, [x, y + 0.01 + 0.125 * fill, z], beer, 12); s.ring(0.07, 0.012, [x + 0.12, y + 0.15, z], s.material('#e8eeee'), Math.PI).rotation.z = -Math.PI / 2; };
    const drinks = closed ? 0 : Math.round({ lastcall: 16, quiet: 4, birthday: 10, wake: 7, closed: 0 }[a.occasion] * mix(0.6, 1.3, mood.density));
    for (let i = 0; i < drinks; i++) { const x = x0 + 0.3 + random() * (bl - 1.2), z = barZ - 0.2 + random() * 0.5; if (random() < 0.22) pitcher(x, z, random()); else pint(x, z, random() < 0.35 ? 0 : random()); }
    if (!closed) { pitcher(tx + 0.1, tz - 0.1, 0.5 + random() * 0.4, 0.785); pint(tx - 0.2, tz + 0.15, random(), 0.785); pint(tx + 0.25, tz + 0.2, random(), 0.785); }
    if (closed) {
      const bxm = -3.2, bzm = 0.9;
      s.cylinder(0.2, 0.16, 0.3, [bxm, 0.15, bzm], s.material('#e8c020', { roughness: 0.5 }), 14); s.cylinder(0.18, 0.15, 0.02, [bxm, 0.26, bzm], s.material('#6a7a80', { roughness: 0.2 }), 14);
      s.rod([bxm + 0.1, 0.05, bzm + 0.05], [bxm + 0.75, 1.45, bzm - 0.3], 0.018, s.material('#c79a55')); s.box([0.34, 0.07, 0.14], [bxm + 0.08, 0.3, bzm + 0.06], s.material('#d9d4c4', { roughness: 1 }));
      const wet = s.cylinder(1.1, 1.1, 0.004, [bxm + 1.4, 0.008, bzm + 0.6], new THREE.MeshStandardMaterial({ color: '#2a2018', transparent: true, opacity: 0.3, roughness: 0.05 }), 24); wet.scale.set(1.5, 1, 0.8); wet.castShadow = false;
    } else if (a.occasion === 'birthday') {
      const colours = ['#e8331f', '#ffd61a', '#35a7e0', '#35c759', '#ff7ab8'];
      const flagGeo = new THREE.ConeGeometry(0.13, 0.26, 3); flagGeo.rotateX(Math.PI); flagGeo.scale(1, 1, 0.08);
      const flags: { at: P3; size: number; color: string }[] = [], line: P3[] = [];
      for (let i = 0; i <= 26; i++) { const t = i / 26, p: P3 = [mix(leftX + 0.2, 6.6, t), 3.1 - Math.sin(t * Math.PI) * 0.6, mix(1.6, backZ + 0.3, t)]; line.push(p); if (i % 1 === 0 && i > 0 && i < 26) flags.push({ at: [p[0], p[1] - 0.14, p[2]], size: 1, color: colours[i % 5] }); }
      s.tube(line, 0.008, s.material('#f1ead6')); s.scatter(flagGeo, new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide }), flags);
      for (let i = 0; i < 5; i++) { const x = x1 - 0.25 + (random() - 0.5) * 0.5, z = barZ + 0.2 + (random() - 0.5) * 0.5, y = 2.0 + random() * 0.7; s.ball([0.19, 0.23, 0.19], [x, y, z], s.material(colours[i], { roughness: 0.25 }), 14); s.rod([x1 - 0.2, topY, barZ + 0.2], [x, y - 0.22, z], 0.004, s.material('#f1ead6')); }
      s.cylinder(0.2, 0.2, 0.12, [-2.4, topY + 0.06, barZ], s.material('#f6e8ea'), 20); for (let i = 0; i < 6; i++) { s.cylinder(0.008, 0.008, 0.1, [-2.4 + Math.cos(i) * 0.12, topY + 0.17, barZ + Math.sin(i) * 0.12], s.material(colours[i % 5]), 6); s.ball([0.014, 0.022, 0.014], [-2.4 + Math.cos(i) * 0.12, topY + 0.24, barZ + Math.sin(i) * 0.12], glow('#ffb347', 1.3, 11 + i), 6); }
    } else if (a.occasion === 'wake') {
      const px = -2.4;
      s.box([0.4, 0.5, 0.04], [px, topY + 0.27, barZ - 0.12], dark).rotation.x = -0.18; s.box([0.32, 0.42, 0.01], [px, topY + 0.27, barZ - 0.09], s.material('#cdbb96')).rotation.x = -0.18;
      s.ball([0.07, 0.08, 0.01], [px, topY + 0.33, barZ - 0.075], s.material('#5a4630'), 10); s.box([0.2, 0.14, 0.01], [px, topY + 0.14, barZ - 0.05], s.material('#5a4630')).rotation.x = -0.18;
      s.box([0.2, 0.05, 0.012], [px + 0.13, topY + 0.45, barZ - 0.11], dark).rotation.z = -0.8;
      for (let i = 0; i < 7; i++) { s.cylinder(0.03, 0.022, 0.07, [px - 0.33 + i * 0.11, topY + 0.035, barZ + 0.14], glass, 8); s.cylinder(0.025, 0.02, 0.05, [px - 0.33 + i * 0.11, topY + 0.03, barZ + 0.14], s.material('#a8571c', { emissive: '#a8571c', emissiveIntensity: 0.25 }), 8); }
      s.cylinder(0.06, 0.045, 0.22, [px + 0.5, topY + 0.11, barZ - 0.05], s.material('#3b6fb0', { roughness: 0.2 }), 12);
      for (let i = 0; i < 8; i++) { const t = i * 0.8; s.rod([px + 0.5, topY + 0.2, barZ - 0.05], [px + 0.5 + Math.cos(t) * 0.16, topY + 0.42 + random() * 0.12, barZ - 0.05 + Math.sin(t) * 0.12], 0.006, s.material('#3a6a34')); s.ball([0.05, 0.05, 0.05], [px + 0.5 + Math.cos(t) * 0.16, topY + 0.45 + (i % 3) * 0.04, barZ - 0.05 + Math.sin(t) * 0.12], s.material(i % 2 ? '#f4f1e6' : '#f2c21b'), 8); }
      for (const dx of [-0.75, 0.9]) { s.cylinder(0.035, 0.04, 0.16, [px + dx, topY + 0.08, barZ], s.material('#f1ead6'), 10); s.ball([0.018, 0.03, 0.018], [px + dx, topY + 0.19, barZ], glow('#ffb347', 1.4, 9), 8); }
    }
    if (a.occasion === 'lastcall') { s.lathe([[0.001, 0.16], [0.03, 0.15], [0.07, 0.04], [0.09, 0], [0.08, 0]], brass, [x1 - 0.5, topY + 0.25, barZ - 0.9]); s.rod([x1 - 0.5, topY, barZ - 0.9], [x1 - 0.5, topY + 0.42, barZ - 0.9], 0.012, dark); }

    const speed = mix(0.4, 5, mood.energy);
    world.update = (dt, time) => {
      fan.rotation.y += dt * speed * (closed ? 0.15 : 1);
      for (const g of glowMats) {
        if (!g.rate) continue;
        const m = g.material as THREE.MeshStandardMaterial;
        if (g.rate >= 30) m.emissiveIntensity = g.base * (0.92 + 0.08 * Math.sin(time * g.rate) + (mood.wear > 0.6 && Math.sin(time * 7.3 + g.rate) > 0.93 ? -0.6 : 0));
        else if (g.rate > 15) m.emissiveIntensity = g.base * (0.8 + 0.2 * Math.sin(time * g.rate) * Math.sin(time * 3.1));
        else m.emissiveIntensity = g.base * (0.65 + 0.35 * Math.sin(time * speed * g.rate));
      }
    };
    return world;
  },
});
