import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;
const THEMES = {
  space: { say: 'Space opera: a ringed planet, rockets and stars in deep blue and magenta.', title: 'NOVA QUEEN', c: ['#141a4a', '#e83aa8', '#35d6f2', '#ffe14d'] },
  hotrod: { say: 'Hot rods: flames, a chopped coupe and chequered flags in red, orange and black.', title: 'NITRO ALLEY', c: ['#1a1414', '#e8331f', '#ffab1a', '#f4f1e6'] },
  horror: { say: 'Horror: a full moon, bats and tombstones in purple and slime green.', title: 'CRYPT NIGHT', c: ['#22123a', '#7be03a', '#b05cff', '#f1ead6'] },
  rock: { say: 'A fictional rock band on tour: lightning bolts, a guitar and stage rays in yellow and black.', title: 'THE VOLTS', c: ['#16161a', '#ffd61a', '#ff3b30', '#f4f1e6'] },
  sea: { say: 'Deep sea: kraken tentacles and bubbles in teal and coral.', title: 'KRAKEN DEEP', c: ['#0d3a4a', '#ff7a5a', '#35e0c0', '#f4f1e6'] },
  western: { say: 'Western: a striped sunset, a cactus and playing cards in rust and gold.', title: 'DEAD MANS HAND', c: ['#4a1f14', '#f2a01f', '#d9442a', '#f6e8c4'] },
} as const;
type Theme = keyof typeof THEMES;
const says = Object.fromEntries(Object.entries(THEMES).map(([k, v]) => [k, v.say])) as Record<Theme, string>;

function paint(width: number, height: number, draw: (ctx: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Theme artwork inside a rectangle; shared by backglass, playfield and cabinet sides. */
function motif(ctx: Ctx, theme: Theme, x: number, y: number, w: number, h: number, random: () => number) {
  const [bg, c1, c2, c3] = THEMES[theme].c;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.translate(x, y);
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, bg); g.addColorStop(1, theme === 'western' ? c1 : c2 + '55');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const u = Math.min(w, h);
  if (theme === 'space') {
    ctx.fillStyle = c3; for (let i = 0; i < 60; i++) ctx.fillRect(random() * w, random() * h, 2 + random() * 3, 2 + random() * 3);
    ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(w * 0.62, h * 0.48, u * 0.24, 0, 7); ctx.fill();
    ctx.strokeStyle = c2; ctx.lineWidth = u * 0.05; ctx.beginPath(); ctx.ellipse(w * 0.62, h * 0.48, u * 0.4, u * 0.1, -0.35, 0, 7); ctx.stroke();
    ctx.fillStyle = c3; ctx.beginPath(); ctx.moveTo(w * 0.14, h * 0.75); ctx.lineTo(w * 0.34, h * 0.36); ctx.lineTo(w * 0.3, h * 0.72); ctx.fill();
    ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(w * 0.14, h * 0.75); ctx.lineTo(w * 0.06, h * 0.95); ctx.lineTo(w * 0.24, h * 0.8); ctx.fill();
  } else if (theme === 'hotrod') {
    for (const [col, top] of [[c1, 0.35], [c2, 0.55], [c3, 0.78]] as const) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, h); for (let i = 0; i <= 8; i++) { ctx.lineTo(w * (i / 8), h * (top + (i % 2 ? 0.22 : 0) + random() * 0.08)); } ctx.lineTo(w, h); ctx.fill(); }
    ctx.fillStyle = '#0c0c0c'; ctx.beginPath(); ctx.roundRect(w * 0.18, h * 0.52, w * 0.64, h * 0.16, 12); ctx.fill(); ctx.beginPath(); ctx.roundRect(w * 0.36, h * 0.4, w * 0.3, h * 0.16, 12); ctx.fill();
    for (const cx of [0.3, 0.7]) { ctx.fillStyle = '#0c0c0c'; ctx.beginPath(); ctx.arc(w * cx, h * 0.7, u * 0.1, 0, 7); ctx.fill(); ctx.fillStyle = c3; ctx.beginPath(); ctx.arc(w * cx, h * 0.7, u * 0.045, 0, 7); ctx.fill(); }
    for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#0c0c0c' : c3; ctx.fillRect(i * w / 12, 0, w / 12, h * 0.06); ctx.fillStyle = i % 2 ? c3 : '#0c0c0c'; ctx.fillRect(i * w / 12, h * 0.06, w / 12, h * 0.06); }
  } else if (theme === 'horror') {
    ctx.fillStyle = c3; ctx.beginPath(); ctx.arc(w * 0.68, h * 0.36, u * 0.22, 0, 7); ctx.fill();
    ctx.fillStyle = '#0d0714'; for (let i = 0; i < 5; i++) { const bx = w * (0.15 + random() * 0.7), by = h * (0.15 + random() * 0.35), bs = u * 0.07; ctx.beginPath(); ctx.moveTo(bx - bs * 2, by - bs * 0.4); ctx.lineTo(bx - bs, by + bs * 0.3); ctx.lineTo(bx, by - bs * 0.2); ctx.lineTo(bx + bs, by + bs * 0.3); ctx.lineTo(bx + bs * 2, by - bs * 0.4); ctx.lineTo(bx, by + bs * 0.7); ctx.fill(); }
    ctx.fillRect(0, h * 0.84, w, h * 0.16);
    for (let i = 0; i < 4; i++) { const tx = w * (0.08 + i * 0.24), tw = w * 0.13, th = h * (0.18 + random() * 0.12); ctx.fillStyle = c2; ctx.beginPath(); ctx.roundRect(tx, h * 0.86 - th, tw, th, [tw / 2, tw / 2, 0, 0]); ctx.fill(); }
    ctx.fillStyle = c1; for (let i = 0; i < 9; i++) { const dx = i * w / 9; ctx.beginPath(); ctx.roundRect(dx, -10, w / 9 + 1, h * (0.06 + random() * 0.14), 10); ctx.fill(); }
  } else if (theme === 'rock') {
    for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? c2 + '66' : c1 + '44'; ctx.beginPath(); ctx.moveTo(w / 2, h * 0.95); ctx.lineTo(w * (i / 14) * 1.4 - w * 0.2, 0); ctx.lineTo(w * ((i + 1) / 14) * 1.4 - w * 0.2, 0); ctx.fill(); }
    ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(w * 0.56, h * 0.08); ctx.lineTo(w * 0.3, h * 0.52); ctx.lineTo(w * 0.47, h * 0.52); ctx.lineTo(w * 0.36, h * 0.94); ctx.lineTo(w * 0.72, h * 0.42); ctx.lineTo(w * 0.54, h * 0.42); ctx.lineTo(w * 0.68, h * 0.08); ctx.fill();
    ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(w * 0.16, h * 0.74, u * 0.11, u * 0.14, 0.5, 0, 7); ctx.fill(); ctx.save(); ctx.translate(w * 0.16, h * 0.74); ctx.rotate(0.5); ctx.fillStyle = c3; ctx.fillRect(-u * 0.02, -u * 0.5, u * 0.04, u * 0.42); ctx.restore();
  } else if (theme === 'sea') {
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const bx = w * (0.1 + i * 0.2); ctx.strokeStyle = c1; ctx.lineWidth = u * (0.09 - i * 0.008); ctx.beginPath(); ctx.moveTo(bx, h * 1.05); ctx.bezierCurveTo(bx - w * 0.2, h * 0.7, bx + w * 0.25, h * 0.5, bx + (random() - 0.5) * w * 0.2, h * (0.15 + random() * 0.2)); ctx.stroke(); }
    ctx.strokeStyle = c2; ctx.lineWidth = 4; for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.arc(random() * w, random() * h, 4 + random() * u * 0.05, 0, 7); ctx.stroke(); }
  } else {
    for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? c1 : c2; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.85, u * (0.55 - i * 0.07), Math.PI, 0); ctx.fill(); }
    ctx.fillStyle = '#1f3a1c'; ctx.beginPath(); ctx.roundRect(w * 0.14, h * 0.38, w * 0.07, h * 0.5, 10); ctx.fill(); ctx.beginPath(); ctx.roundRect(w * 0.05, h * 0.5, w * 0.05, h * 0.16, 8); ctx.fill(); ctx.fillRect(w * 0.05, h * 0.62, w * 0.12, h * 0.045);
    ctx.fillStyle = '#2a140c'; ctx.fillRect(0, h * 0.85, w, h * 0.15);
    for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(w * (0.62 + i * 0.11), h * 0.56); ctx.rotate(-0.3 + i * 0.3); ctx.fillStyle = c3; ctx.beginPath(); ctx.roundRect(-u * 0.08, -u * 0.12, u * 0.16, u * 0.24, 8); ctx.fill(); ctx.fillStyle = i % 2 ? c2 : '#111'; ctx.font = `bold ${u * 0.14}px serif`; ctx.textAlign = 'center'; ctx.fillText(['A', '8', 'A'][i], 0, u * 0.05); ctx.restore(); }
  }
  ctx.restore();
}

export default defineThing({
  questions: {
    theme: choice('What is the table\'s theme?', says),
    state: choice('What is the machine doing right now?', {
      attract: 'Attract mode: lights chasing lazily, INSERT COIN on the display.',
      multiball: 'Multiball frenzy: every light blazing and several balls loose on the playfield.',
      tilt: 'TILT: somebody shoved it; the lights are dead, the word TILT is lit and the cabinet sits askew.',
      highscore: 'A high-score entry screen waiting for three initials.',
      dark: 'Switched off and dark, a ghost of itself.',
    }),
    display: choice('What kind of score display does it have?', {
      reels: 'Electromechanical white score reels, 1970s.',
      alpha: 'Blue-green alphanumeric segments, 1980s.',
      dmd: 'An orange dot-matrix screen, 1990s.',
    }),
    glass: choice('What has been left on the glass?', {
      nothing: 'Nothing.',
      drink: 'A beer bottle and the wet ring of another drink.',
      quarters: 'A line of quarters on the lockdown bar: people are waiting to play.',
      note: 'A taped paper note saying OUT OF ORDER.',
    }),
    topper: choice('What sits on top of the backbox?', {
      none: 'Nothing.',
      beacon: 'A rotating police-style beacon.',
      star: 'A lit plastic star.',
      fern: 'A dusty fake fern the owner put there.',
      trophy: 'A small tournament trophy.',
    }),
    legs: choice('What are the legs and rails like?', { chrome: 'Bright chrome.', black: 'Black powder coat.', gold: 'Gold-plated, a collector edition.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const T = THEMES[a.theme], [bg, c1, c2, c3] = T.c;
    const on = a.state === 'dark' ? 0 : a.state === 'tilt' ? 0.18 : 1;
    const power = on * mix(0.55, 1.0, mood.cheer);
    const W = 0.58, L = 1.32, slope = Math.atan(0.15 / L);
    const metal = s.material({ chrome: '#d9dde0', black: '#1d1d20', gold: '#d9b24a' }[a.legs], { metalness: a.legs === 'black' ? 0.3 : 0.9, roughness: a.legs === 'black' ? 0.6 : 0.22 });
    const body = s.material(bg, { roughness: 0.5 }), dark = s.material('#131316');
    const dim = (ctx: Ctx, w: number, h: number) => { if (on < 1) { ctx.fillStyle = `rgba(8,8,12,${on ? 0.55 : 0.72})`; ctx.fillRect(0, 0, w, h); } };
    const glows: { material: THREE.MeshStandardMaterial; base: number; phase: number }[] = [];
    const glow = (color: string, base = 1, phase = glows.length) => {
      const material = new THREE.MeshStandardMaterial({ color: on ? color : new THREE.Color(color).multiplyScalar(0.35), emissive: color, emissiveIntensity: base * power, roughness: 0.35 });
      glows.push({ material, base, phase });
      return material;
    };

    // Cabinet body, legs, coin door, plunger and flipper buttons.
    const side = new THREE.Shape();
    side.moveTo(L / 2, 0.62); side.lineTo(L / 2, 0.93); side.lineTo(-L / 2, 1.08); side.lineTo(-L / 2, 0.5); side.closePath();
    const hull = s.mesh(new THREE.ExtrudeGeometry(side, { depth: W, bevelEnabled: false }), body, [W / 2, 0, 0]); hull.rotation.y = -Math.PI / 2;
    const sideArt = paint(512, 128, (ctx, w, h) => { motif(ctx, a.theme, 0, 0, w, h, random); ctx.strokeStyle = c3; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8); dim(ctx, w, h * (on < 1 ? 0.5 : 0)); });
    for (const x of [-1, 1]) {
      const decal = s.mesh(new THREE.PlaneGeometry(L - 0.14, 0.25), new THREE.MeshStandardMaterial({ map: sideArt, roughness: 0.6 }), [x * (W / 2 + 0.002), 0.8, 0]);
      decal.rotation.set(0, x * Math.PI / 2, 0); decal.rotation.order = 'YXZ'; decal.rotation.z = x * slope * 0.5;
      for (const z of [L / 2 - 0.07, -L / 2 + 0.07]) { const top = z > 0 ? 0.86 : 0.98; s.rod([x * (W / 2 + 0.012), top, z], [x * (W / 2 + 0.03), 0.02, z + Math.sign(z) * 0.04], 0.022, metal, 0.02); s.cylinder(0.03, 0.03, 0.02, [x * (W / 2 + 0.03), 0.01, z + Math.sign(z) * 0.04], dark, 10); }
      s.cylinder(0.02, 0.02, 0.016, [x * (W / 2 + 0.008), 0.86, L / 2 - 0.1], s.material(x < 0 ? '#e8331f' : '#f4f1e6'), 12).rotation.z = Math.PI / 2;
    }
    const fz = L / 2;
    s.box([0.3, 0.2, 0.02], [-0.03, 0.75, fz + 0.01], s.material('#2a2b2f', { metalness: 0.5 }));
    for (const x of [-0.1, 0.02]) s.box([0.05, 0.07, 0.012], [x, 0.78, fz + 0.022], glow(x < 0 ? '#ff5a2a' : '#ffb02e', 1.1));
    s.cylinder(0.02, 0.02, 0.016, [-0.22, 0.86, fz + 0.01], glow('#35e06a', 1.2), 12).rotation.x = Math.PI / 2;
    s.rod([0.22, 0.84, fz], [0.22, 0.835, fz + 0.09], 0.008, metal); s.ball([0.022, 0.022, 0.022], [0.22, 0.835, fz + 0.1], dark, 10);

    // Playfield group, tilted with the cabinet.
    const pf = new Sculpture(context);
    pf.root.position.set(0, 1.009, 0); pf.root.rotation.x = slope; s.root.add(pf.root);
    const PW = W - 0.06, PL = L - 0.04;
    const field = paint(256, 560, (ctx, w, h) => {
      motif(ctx, a.theme, 0, 0, w, h * 0.8, random);
      ctx.fillStyle = bg; ctx.fillRect(0, h * 0.8, w, h * 0.2);
      ctx.strokeStyle = c3; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(w / 2, h * 0.2, w * 0.44, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w - 26, h * 0.2); ctx.lineTo(w - 26, h * 0.88); ctx.stroke();
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(w / 2 + sx * 98, h * 0.6); ctx.lineTo(w / 2 + sx * 98, h * 0.74); ctx.lineTo(w / 2 + sx * 36, h * 0.82); ctx.stroke(); }
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(0, h * 0.86); ctx.lineTo(w / 2 - 20, h * 0.93); ctx.lineTo(w / 2 + 20, h * 0.93); ctx.lineTo(w, h * 0.86); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
      ctx.fillStyle = c3; ctx.fillRect(24, h * 0.94, 70, 24); ctx.fillRect(w - 110, h * 0.94, 70, 24);
      ctx.fillStyle = bg; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('1 PLAY 50c', 59, h * 0.94 + 17);
      dim(ctx, w, h);
    });
    const fieldMesh = pf.mesh(new THREE.PlaneGeometry(PW, PL), new THREE.MeshStandardMaterial({ map: field, roughness: 0.4, emissiveMap: field, emissive: '#ffffff', emissiveIntensity: 0.5 * power }), [0, 0, 0]);
    fieldMesh.rotation.x = -Math.PI / 2;
    // Inserts in three chasing groups.
    const groups: P3[][] = [[], [], []];
    for (let i = 0; i < 9; i++) groups[i % 3].push([Math.cos(Math.PI * (i + 0.5) / 9) * 0.2, 0.002, -0.38 - Math.sin(Math.PI * (i + 0.5) / 9) * 0.2]);
    for (let i = 0; i < 6; i++) groups[i % 3].push([(i % 2 ? 1 : -1) * (0.06 + Math.floor(i / 2) * 0.05), 0.002, 0.2 - Math.floor(i / 2) * 0.09]);
    for (let i = 0; i < 6; i++) groups[i % 3].push([-0.2 + i * 0.07, 0.002, 0.03 + (i % 2) * 0.03]);
    groups.forEach((points, k) => pf.scatter(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 10), glow([c1, c2, c3][k], 1.3, k * 2.1), points.map((at) => ({ at, size: 1 }))));
    // Pop bumpers, slingshots, targets, flippers, ramp.
    for (const [x, z] of [[-0.11, -0.3], [0.1, -0.33], [0, -0.2]] as const) {
      pf.cylinder(0.03, 0.034, 0.035, [x, 0.0175, z], s.material('#f4f1e6'), 14);
      pf.cylinder(0.045, 0.04, 0.014, [x, 0.042, z], glow(c1, 1.4, x * 40 + 5), 16);
      pf.cylinder(0.02, 0.02, 0.006, [x, 0.052, z], s.material(c3), 12);
    }
    for (const x of [-1, 1]) {
      const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(0.02, 0.15); tri.lineTo(0.07, 0.03); tri.closePath();
      const sling = pf.mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.025, bevelEnabled: false }), glow(c2, 0.8, 3 + x), [x * 0.2, 0.025, 0.36]);
      sling.rotation.x = Math.PI / 2; sling.scale.x = -x;
      const flip = pf.box([0.09, 0.016, 0.022], [x * 0.065, 0.012, 0.44], s.material(c3, { roughness: 0.3 })); flip.rotation.y = x * (a.state === 'multiball' && x > 0 ? -0.5 : 0.5);
      pf.cylinder(0.014, 0.014, 0.018, [x * 0.105, 0.012, 0.42], s.material(c1), 10);
      for (let i = 0; i < 3; i++) pf.box([0.006, 0.035, 0.03], [x * (PW / 2 - 0.03), 0.0175, -0.12 + i * 0.045], s.material(i % 2 ? c1 : c3));
    }
    const ramp = new THREE.MeshStandardMaterial({ color: c2, transparent: true, opacity: 0.75, roughness: 0.2, emissive: c2, emissiveIntensity: 0.25 * power });
    for (const o of [0, 0.03]) pf.tube([[-0.2 + o, 0.012, 0.08], [-0.22 + o, 0.07, -0.2], [-0.13 + o * 0.5, 0.1, -0.5 + o], [0.1 - o * 0.5, 0.1, -0.52 + o], [0.2 - o, 0.08, -0.25], [0.17 - o, 0.03, 0.02]], 0.007, ramp);
    pf.box([0.012, 0.04, 0.5], [PW / 2 - 0.055, 0.02, 0.3], metal);
    // Balls.
    const steel = new THREE.MeshStandardMaterial({ color: '#e6e9ec', metalness: 0.95, roughness: 0.12 });
    const balls: THREE.Mesh[] = [];
    const ball = (x: number, z: number) => balls.push(pf.ball([0.017, 0.017, 0.017], [x, 0.017, z], steel, 12));
    if (a.state === 'multiball') for (let i = 0; i < 4; i++) ball((random() - 0.5) * 0.36, -0.4 + random() * 0.75);
    else if (a.state === 'tilt') ball((random() - 0.5) * 0.08, 0.5);
    else if (a.state !== 'dark') ball(PW / 2 - 0.026, 0.5);
    // Glass, rails, lockdown bar.
    const gy = 0.085;
    pf.box([PW, 0.004, PL], [0, gy, 0], new THREE.MeshStandardMaterial({ color: '#dff0ff', transparent: true, opacity: 0.1, depthWrite: false, roughness: 0.3 })).castShadow = false;
    for (const x of [-1, 1]) { pf.box([0.03, gy + 0.012, PL], [x * (W / 2 - 0.015), gy / 2 - 0.002, 0], body); pf.box([0.036, 0.012, PL + 0.01], [x * (W / 2 - 0.015), gy + 0.008, 0], metal); }
    pf.box([W + 0.01, 0.03, 0.06], [0, gy + 0.004, PL / 2 + 0.005], metal);
    pf.box([W, gy + 0.03, 0.02], [0, gy / 2, PL / 2 + 0.02], body);
    if (a.glass === 'drink' || a.state === 'dark') {
      const gx = (random() - 0.5) * 0.25, gz = random() * 0.35;
      pf.ring(0.036, 0.005, [gx, gy + 0.004, gz], s.material('#8a6a3a', { roughness: 0.2 })).rotation.x = Math.PI / 2;
      pf.ring(0.03, 0.004, [gx + 0.05, gy + 0.004, gz + 0.045], s.material('#9a7a4a', { roughness: 0.2 })).rotation.x = Math.PI / 2;
      if (a.glass === 'drink') { const b = new Sculpture(context); const m = s.material('#5a3a14', { roughness: 0.2 }); b.cylinder(0.03, 0.03, 0.14, [0, 0.07, 0], m, 12); b.cylinder(0.012, 0.028, 0.09, [0, 0.185, 0], m, 12); b.root.position.set(gx - 0.1, gy + 0.004, gz + 0.02); b.root.rotation.x = -slope; pf.root.add(b.root); }
    }
    if (a.glass === 'quarters') for (let i = 0; i < 3 + Math.floor(random() * 4); i++) pf.cylinder(0.015, 0.015, 0.008 + random() * 0.01, [-0.2 + i * 0.045, gy + 0.026, PL / 2 + 0.005], s.material('#c9ccd0', { metalness: 0.8, roughness: 0.3 }), 10);
    if (a.glass === 'note') {
      const note = paint(256, 180, (ctx) => { ctx.fillStyle = '#f6f0d8'; ctx.fillRect(0, 0, 256, 180); ctx.fillStyle = '#1d2c8a'; ctx.font = 'italic bold 52px cursive'; ctx.textAlign = 'center'; ctx.fillText('OUT OF', 128, 72, 236); ctx.fillText('ORDER', 128, 138, 236); ctx.fillStyle = 'rgba(190,170,90,0.8)'; ctx.fillRect(90, 0, 76, 22); });
      const m = pf.mesh(new THREE.PlaneGeometry(0.3, 0.21), new THREE.MeshStandardMaterial({ map: note, roughness: 0.9 }), [(random() - 0.5) * 0.1, gy + 0.005, 0.12]); m.rotation.x = -Math.PI / 2; m.rotation.z = (random() - 0.5) * 0.4;
    }

    // Backbox with painted backglass and score display.
    const BW = 0.72, BH = 0.74, BD = 0.24, bz = -L / 2 + BD / 2 + 0.02, by = 1.1 + BH / 2;
    s.box([0.4, 0.1, 0.18], [0, 1.08, bz], dark);
    s.box([BW, BH, BD], [0, by, bz], body);
    s.box([BW + 0.03, 0.03, BD + 0.03], [0, by + BH / 2, bz], metal);
    const score = String(Math.floor(random() * 9000000 + 100000)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const line = { attract: 'INSERT COIN', multiball: 'MULTIBALL!', tilt: 'TILT', highscore: 'ENTER: ' + 'ABCDJKMRST'[Math.floor(random() * 10)] + 'D_', dark: '' }[a.state];
    const glass = paint(512, 512, (ctx, w, h) => {
      motif(ctx, a.theme, 0, 0, w, h * 0.74, random);
      ctx.font = `italic 900 ${T.title.length > 11 ? 54 : 70}px sans-serif`; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = 14; ctx.strokeText(T.title, w / 2, 92, w - 30); ctx.fillStyle = c3; ctx.fillText(T.title, w / 2, 92, w - 30);
      dim(ctx, w, h * 0.74);
      ctx.fillStyle = '#0b0b0d'; ctx.fillRect(0, h * 0.74, w, h * 0.26);
      const ink = a.display === 'dmd' ? '#ff8a1a' : a.display === 'alpha' ? '#39f0d0' : '#f4f1e6';
      if (a.display === 'reels') {
        const digits = (a.state === 'dark' ? '000000' : score.replace(/,/g, '').padStart(6, '0').slice(-6)).split('');
        digits.forEach((d, i) => { ctx.fillStyle = on ? '#f4f1e6' : '#8a887e'; ctx.fillRect(82 + i * 60, h * 0.78, 50, 66); ctx.fillStyle = '#111'; ctx.font = 'bold 54px monospace'; ctx.fillText(d, 107 + i * 60, h * 0.78 + 52); });
        if (line && a.state !== 'attract') { ctx.fillStyle = a.state === 'tilt' ? '#ff3b30' : '#ffd61a'; ctx.font = 'bold 30px sans-serif'; ctx.fillText(line, w / 2, h * 0.975); }
      } else if (line) {
        ctx.fillStyle = a.display === 'dmd' ? '#2a1202' : '#06201c'; ctx.fillRect(40, h * 0.78, w - 80, 92);
        ctx.fillStyle = ink; ctx.font = `bold ${a.state === 'tilt' ? 78 : 44}px monospace`;
        if (a.state === 'tilt' || a.state === 'attract') ctx.fillText(line, w / 2, h * 0.78 + (a.state === 'tilt' ? 74 : 60), w - 110);
        else { ctx.fillText(line, w / 2, h * 0.78 + 40, w - 110); ctx.fillText(score, w / 2, h * 0.78 + 84, w - 110); }
        if (a.display === 'dmd') { ctx.fillStyle = 'rgba(0,0,0,0.35)'; for (let x = 40; x < w - 40; x += 5) ctx.fillRect(x, h * 0.78, 1.5, 92); for (let y = 0; y < 92; y += 5) ctx.fillRect(40, h * 0.78 + y, w - 80, 1.5); }
      } else { ctx.fillStyle = '#17181b'; ctx.fillRect(40, h * 0.78, w - 80, 92); }
    });
    const glassMat = new THREE.MeshStandardMaterial({ map: glass, roughness: 0.25, emissiveMap: glass, emissive: '#ffffff', emissiveIntensity: a.state === 'dark' ? 0 : Math.max(0.35, 0.6 * power) });
    s.mesh(new THREE.PlaneGeometry(BW - 0.07, BH - 0.07), glassMat, [0, by, bz + BD / 2 + 0.002]);
    for (const x of [-1, 1]) s.box([0.035, BH, 0.02], [x * (BW / 2 - 0.0175), by, bz + BD / 2 + 0.008], metal);
    s.box([BW, 0.035, 0.02], [0, by - BH / 2 + 0.0175, bz + BD / 2 + 0.008], metal);

    // Topper.
    const ty = by + BH / 2 + 0.015;
    let beacon: THREE.Object3D | null = null;
    if (a.topper === 'beacon') {
      s.cylinder(0.07, 0.08, 0.04, [0, ty + 0.02, bz], dark, 16);
      s.cylinder(0.06, 0.065, 0.11, [0, ty + 0.095, bz], new THREE.MeshStandardMaterial({ color: '#ff3b30', transparent: true, opacity: 0.8, emissive: '#ff2a1f', emissiveIntensity: 0.6 * power }), 16);
      beacon = s.box([0.1, 0.05, 0.02], [0, ty + 0.095, bz], glow('#ffe9c4', 1.6));
      s.ball([0.06, 0.03, 0.06], [0, ty + 0.15, bz], s.material('#c0262c'), 12);
    } else if (a.topper === 'star') {
      const star = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.07 : 0.16, t = i * Math.PI / 5 + Math.PI / 2; if (i) star.lineTo(Math.cos(t) * r, Math.sin(t) * r); else star.moveTo(Math.cos(t) * r, Math.sin(t) * r); }
      s.mesh(new THREE.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false }), glow(c1, 1.3), [0, ty + 0.2, bz - 0.02]);
      s.cylinder(0.015, 0.015, 0.08, [0, ty + 0.04, bz], metal, 8);
    } else if (a.topper === 'fern') {
      s.cylinder(0.07, 0.05, 0.09, [0.12, ty + 0.045, bz], s.material('#a35a3a'), 12);
      for (let i = 0; i < 11; i++) { const t = i * 0.6, len = 0.14 + random() * 0.1; s.rod([0.12, ty + 0.09, bz], [0.12 + Math.cos(t) * len, ty + 0.12 + random() * 0.12, bz + Math.sin(t) * len * 0.8], 0.012, s.material('#5a7a4a', { roughness: 1 }), 0.003); }
    } else if (a.topper === 'trophy') {
      const gold = s.material('#d9b24a', { metalness: 0.8, roughness: 0.3 });
      s.box([0.1, 0.05, 0.1], [-0.15, ty + 0.025, bz], dark); s.cylinder(0.012, 0.018, 0.08, [-0.15, ty + 0.09, bz], gold, 8);
      s.lathe([[0, 0], [0.02, 0.01], [0.055, 0.08], [0.06, 0.12], [0.045, 0.12], [0.035, 0.05], [0, 0.04]], gold, [-0.15, ty + 0.13, bz]);
    }
    if (mood.wear > 0.5) for (let i = 0; i < Math.round(mood.wear * 6); i++) s.box([0.04 + random() * 0.1, 0.03 + random() * 0.05, 0.003], [(random() - 0.5) * 0.4, 0.66 + random() * 0.04, fz + 0.001], s.material('#b9a98a'));
    if (a.state === 'tilt') s.root.rotation.y = (random() < 0.5 ? -1 : 1) * (0.1 + random() * 0.08);

    const speed = mix(0.8, 7, mood.energy) * (a.state === 'multiball' ? 2 : 1);
    const home = balls.map((b) => b.position.clone());
    const thing = s.finish({
      update(dt, time) {
        for (const g of glows) {
          const wave = a.state === 'multiball' ? (Math.sin(time * speed * 2 + g.phase * 5) > 0 ? 1 : 0.3) : 0.6 + 0.4 * Math.sin(time * speed + g.phase);
          g.material.emissiveIntensity = g.base * power * wave;
        }
        if (beacon) beacon.rotation.y += dt * speed;
        if (a.state === 'multiball') balls.forEach((b, i) => { b.position.x = home[i].x + Math.sin(time * speed * 0.7 + i * 2) * 0.05; b.position.z = home[i].z + Math.cos(time * speed * 0.9 + i) * 0.08; });
      },
    });
    return thing;
  },
});
