import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, score } from '@conjure/kit';

type P = [number, number, number];
type Ctx = CanvasRenderingContext2D;

const STYLES = {
  clinical: 'Clinical white: wall tiles, teal trim, a green cross, everything wipe-clean and a little frightening.',
  biker: 'Biker parlour: oxblood walls, black panelling, chrome, a red tool chest for a counter.',
  mall: 'Mall kiosk: lilac slatwall hung with earring cards, hot pink trim, bubblegum bright.',
  tribal: 'Tribal revival: ochre walls with a black zigzag band, dark carved wood, masks on the wall.',
  diy: 'Back-room DIY: breeze blocks behind plastic sheeting, a folding table, a bare bulb on a cord.',
} as const;
const LOOK: Record<keyof typeof STYLES, { wall: string; dado: string; trim: string; cloth: string; counter: string; top: string; lamp: string; frame: string }> = {
  clinical: { wall: '#eef2f1', dado: '#ffffff', trim: '#3f9e9a', cloth: '#a9cfe0', counter: '#f3f5f4', top: '#b9c2c4', lamp: '#d9dee0', frame: '#c9d0d2' },
  biker: { wall: '#7a3936', dado: '#35302f', trim: '#c9ccd0', cloth: '#2a2628', counter: '#c2242a', top: '#33343a', lamp: '#d0d4d8', frame: '#1f1d1e' },
  mall: { wall: '#e6cbe8', dado: '#f7eef8', trim: '#ee3f9a', cloth: '#f06bb0', counter: '#fbf7fb', top: '#ee3f9a', lamp: '#f38cc4', frame: '#ffffff' },
  tribal: { wall: '#c98c55', dado: '#6b4630', trim: '#3a271c', cloth: '#a8452c', counter: '#5a3a26', top: '#2f2018', lamp: '#b88a3c', frame: '#3a271c' },
  diy: { wall: '#a3a5a0', dado: '#8f918c', trim: '#6b6d68', cloth: '#5b84b8', counter: '#d8d2c2', top: '#bdb7a6', lamp: '#e8b92e', frame: '#2c2c2c' },
};
const SIGNS = { piercing: 'PIERCING', tattoo: 'TATTOO', regrets: 'NO REGRETS', id: '18+ BRING ID', walkins: 'WALK-INS', free: 'FREE PIERCING' } as const;

const canvasOf = (w: number, h: number) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return [cv, cv.getContext('2d')!] as const; };
const mapOf = (cv: HTMLCanvasElement) => { const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; return map; };
const heart = (c: Ctx, x: number, y: number, r: number) => { c.beginPath(); c.moveTo(x, y + r * 0.9); c.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.75, y - r * 1.1, x, y - r * 0.35); c.bezierCurveTo(x + r * 0.75, y - r * 1.1, x + r * 1.5, y - r * 0.1, x, y + r * 0.9); };

export default defineWorld({
  questions: {
    style: choice('What style of studio is it?', STYLES),
    era: choice('What era is it?', {
      seventies: 'The 1970s: a hand-painted sign board, a wood-grain radio, browns and oranges.',
      nineties: 'The 1990s: a buzzing neon tube sign and a boombox on a milk crate.',
      noughties: 'The 2000s: a plastic lightbox sign and a chunky television playing to nobody.',
      now: 'Now: a soft LED script sign and a ring light on a tripod for the photo afterwards.',
    }),
    session: choice('Where is the session?', {
      ready: 'About to start: fresh tray laid out, lamp on, stool pulled up, everything waiting.',
      finished: 'Just finished: used tissue on the tray, gloves in the open bin, lamp still on.',
      abandoned: 'Abandoned mid-session: lamp drooped and dark, stool tipped over, tray scattered, curtain half off its rail.',
    }),
    walls: choice('What covers the walls?', {
      flash: 'Old-school flash sheets, wall to wall: hearts, daggers, skulls, roses.',
      cases: 'Lit jewellery cases, with a few framed sheets between.',
      posters: 'Band posters and gig flyers, overlapping and loud.',
      paperwork: 'Licences, aftercare instructions and piercing charts, reassuringly dull.',
    }),
    floor: choice('What is the floor?', {
      checker: 'Black and white checkerboard tiles.',
      white: 'Small plain white tiles with grey grout.',
      terracotta: 'Warm terracotta quarry tiles.',
      lino: 'Speckled green-grey sheet lino.',
      concrete: 'Bare painted concrete with old spatters.',
    }),
    curtain: score('How far is the doorway curtain drawn?', ['Pushed right back, the shop in full view', 'Half drawn', 'Pulled fully across for privacy']),
    sign: choice('What does the sign over the wall say?', SIGNS),
  },

  build(a, context) {
    const { mood, random } = context;
    const L = LOOK[a.style];
    const W = 9, D = 8, H = 3.4;
    const { art: s, world } = diorama(context, {
      background: a.style === 'biker' ? '#dcd6d0' : '#e4e5de', floor: '#b9b6aa', width: W, depth: D, maxHeight: 2.45, radius: 1.25, pitch: 27, yaw: 31,
      slots: [[0.35, 0.75], [-2.3, 2.5], [2.75, 2.0], [1.0, -2.5]],
    });
    const off = a.session === 'abandoned';
    const steel = s.material('#c5cacd', { metalness: 0.8, roughness: 0.3 });
    const black = s.material('#1e1e22', { roughness: 0.55 });
    const white = s.material('#f3f3ee', { roughness: 0.6 });
    const trim = s.material(L.trim, a.style === 'biker' ? { metalness: 0.8, roughness: 0.3 } : {});
    const glow = (colour: string, strength: number) => s.material(colour, { emissive: colour, emissiveIntensity: strength, roughness: 0.4 });
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    // ---- Floor.
    {
      const [cv, c] = canvasOf(1152, 1024);
      const px = 128;
      if (a.floor === 'checker' || a.floor === 'white' || a.floor === 'terracotta') {
        const size = a.floor === 'white' ? 32 : 64;
        c.fillStyle = a.floor === 'terracotta' ? '#7d5a48' : '#8d9092'; c.fillRect(0, 0, 1152, 1024);
        for (let x = 0; x < 1152 / size; x++) for (let y = 0; y < 1024 / size; y++) {
          const shade = (random() - 0.5) * 14;
          const base = a.floor === 'checker' ? ((x + y) % 2 ? [38, 38, 42] : [238, 236, 228]) : a.floor === 'white' ? [236, 238, 236] : [188 + random() * 22, 104 + random() * 16, 72];
          c.fillStyle = `rgb(${base[0] + shade},${base[1] + shade},${base[2] + shade})`;
          c.fillRect(x * size + 1.5, y * size + 1.5, size - 3, size - 3);
          if (random() < mood.wear * 0.12) { c.strokeStyle = 'rgba(40,40,40,0.55)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x * size + random() * size, y * size); c.lineTo(x * size + random() * size, y * size + size); c.stroke(); }
        }
      } else {
        c.fillStyle = a.floor === 'lino' ? '#8fa596' : '#a9a8a2'; c.fillRect(0, 0, 1152, 1024);
        for (let i = 0; i < 2600; i++) { c.fillStyle = a.floor === 'lino' ? pick(['rgba(240,244,236,0.5)', 'rgba(60,84,70,0.45)', 'rgba(200,180,120,0.4)']) : pick(['rgba(255,255,255,0.12)', 'rgba(0,0,0,0.1)']); c.fillRect(random() * 1152, random() * 1024, 2 + random() * 4, 2 + random() * 4); }
        if (a.floor === 'concrete') for (let i = 0; i < 26; i++) { c.fillStyle = pick(['rgba(30,30,34,0.5)', 'rgba(200,40,50,0.45)', 'rgba(240,240,236,0.6)', 'rgba(40,80,170,0.4)']); c.beginPath(); c.ellipse(random() * 1152, random() * 1024, 4 + random() * 22, 3 + random() * 12, random() * 3, 0, 7); c.fill(); }
        if (a.floor === 'lino') { c.strokeStyle = 'rgba(50,60,52,0.5)'; c.lineWidth = 2; for (const x of [384, 768]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 1024); c.stroke(); } }
      }
      for (let i = 0; i < Math.round(mood.wear * 16); i++) {
        const x = random() * 1152, y = random() * 1024, r = 40 + random() * 110, g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(50,42,34,0.3)'); g.addColorStop(1, 'rgba(50,42,34,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      }
      void px;
      const tiles = s.mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: mapOf(cv), roughness: mix(0.35, 0.85, mood.wear) }), [0, 0.004, 0]);
      tiles.rotation.x = -Math.PI / 2; tiles.castShadow = false;
    }

    // ---- Walls: back wall with a doorway on the right, and the left wall.
    const wall = s.material(L.wall, { roughness: 0.9 });
    const dado = s.material(L.dado, { roughness: a.style === 'clinical' ? 0.25 : 0.8 });
    const zBack = -D / 2, xLeft = -W / 2, doorL = 1.95, doorR = 3.75, doorH = 2.5;
    s.box([doorL - xLeft, H, 0.2], [(doorL + xLeft) / 2, H / 2, zBack - 0.1], wall);
    s.box([W / 2 - doorR, H, 0.2], [(W / 2 + doorR) / 2, H / 2, zBack - 0.1], wall);
    s.box([doorR - doorL, H - doorH, 0.2], [(doorL + doorR) / 2, (H + doorH) / 2, zBack - 0.1], wall);
    s.box([0.2, H, D + 0.2], [xLeft - 0.1, H / 2, -0.1], wall);
    s.box([doorL - xLeft, 1.0, 0.04], [(doorL + xLeft) / 2, 0.5, zBack + 0.02], dado);
    s.box([0.04, 1.0, D], [xLeft + 0.02, 0.5, 0], dado);
    s.box([doorL - xLeft, 0.07, 0.07], [(doorL + xLeft) / 2, 1.03, zBack + 0.035], trim);
    s.box([0.07, 0.07, D], [xLeft + 0.035, 1.03, 0], trim);
    for (const x of [doorL - 0.06, doorR + 0.06]) s.box([0.12, doorH + 0.1, 0.26], [x, (doorH + 0.1) / 2, zBack - 0.08], trim);
    s.box([doorR - doorL + 0.24, 0.12, 0.26], [(doorL + doorR) / 2, doorH + 0.06, zBack - 0.08], trim);
    // The street shop glimpsed beyond.
    s.box([doorR - doorL + 0.5, 0.2, 1.3], [(doorL + doorR) / 2, -0.1, zBack - 0.85], s.material('#8d8a80'));
    s.box([doorR - doorL + 0.5, doorH + 0.3, 0.1], [(doorL + doorR) / 2, (doorH + 0.3) / 2, zBack - 1.5], s.material('#8b8f97'));
    s.box([1.1, 1.3, 0.04], [(doorL + doorR) / 2 + 0.1, 1.7, zBack - 1.44], glow(mood.daylight > 0.75 ? '#ffcf8a' : '#fdf3d0', mix(0.5, 1.1, mood.cheer)));
    for (const x of [-0.25, 0.45]) s.box([0.04, 1.3, 0.06], [(doorL + doorR) / 2 + x, 1.7, zBack - 1.42], black);
    if (a.style === 'clinical' || a.style === 'mall') {
      const lines = a.style === 'clinical' ? 5 : 8, m = s.material(a.style === 'clinical' ? '#c9d3d4' : '#d5b3d8');
      for (let i = 1; i < lines; i++) { s.box([doorL - xLeft, 0.012, 0.012], [(doorL + xLeft) / 2, i / lines, zBack + 0.045], m); s.box([0.012, 0.012, D], [xLeft + 0.045, i / lines, 0], m); }
    }
    if (a.style === 'tribal') {
      const [cv, c] = canvasOf(1024, 64); c.fillStyle = '#e9d9b8'; c.fillRect(0, 0, 1024, 64); c.fillStyle = '#1d1512';
      for (let i = 0; i < 32; i++) { c.beginPath(); c.moveTo(i * 32, 64); c.lineTo(i * 32 + 16, 6); c.lineTo(i * 32 + 32, 64); c.fill(); }
      const band = new THREE.MeshStandardMaterial({ map: mapOf(cv), roughness: 0.9 });
      s.mesh(new THREE.PlaneGeometry(doorL - xLeft, 0.36), band, [(doorL + xLeft) / 2, 1.27, zBack + 0.012]);
      s.mesh(new THREE.PlaneGeometry(D, 0.36), band, [xLeft + 0.012, 1.27, 0]).rotation.y = Math.PI / 2;
    }
    if (a.style === 'diy') {
      const sheet = new THREE.MeshStandardMaterial({ color: '#eef4f6', transparent: true, opacity: 0.3, roughness: 0.15, depthWrite: false, side: THREE.DoubleSide });
      const g = new THREE.PlaneGeometry(doorL - xLeft - 0.3, H - 0.3, 30, 4), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 5 + p.getY(i)) * 0.035 + random() * 0.01);
      g.computeVertexNormals();
      s.mesh(g, sheet, [(doorL + xLeft) / 2, H / 2, zBack + 0.1]).castShadow = false;
      for (let i = 0; i < 9; i++) s.box([0.1, 0.05, 0.01], [xLeft + 0.5 + i * 0.72, H - 0.22, zBack + 0.11], s.material('#b9b9b0'));
      for (let y = 1; y < 8; y++) s.box([doorL - xLeft, 0.012, 0.01], [(doorL + xLeft) / 2, 1.0 + y * 0.3, zBack + 0.006], s.material('#878984'));
    }

    // ---- Things on the walls.
    const inks = ['#cf2f2a', '#2f8a45', '#f0c22e', '#2b55b8', '#16161a'];
    const art = (kind: string) => {
      const [cv, c] = canvasOf(256, 320);
      c.lineJoin = c.lineCap = 'round';
      if (kind === 'flash') {
        c.fillStyle = a.era === 'seventies' ? '#e6d2a4' : '#efe4c6'; c.fillRect(0, 0, 256, 320);
        for (let i = 0; i < 6; i++) {
          const x = 68 + (i % 2) * 120, y = 60 + Math.floor(i / 2) * 100, col = pick(inks.slice(0, 4)), m = Math.floor(random() * 5);
          c.strokeStyle = '#16161a'; c.lineWidth = 5; c.fillStyle = col;
          if (m === 0) { heart(c, x, y - 4, 36); c.fill(); c.stroke(); }
          else if (m === 1) { c.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 16 : 40, t = k / 10 * Math.PI * 2 - Math.PI / 2; c.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); } c.closePath(); c.fill(); c.stroke(); }
          else if (m === 2) { c.beginPath(); c.moveTo(x, y + 44); c.lineTo(x - 9, y - 12); c.lineTo(x + 9, y - 12); c.closePath(); c.fillStyle = '#d9dde0'; c.fill(); c.stroke(); c.fillStyle = col; c.fillRect(x - 24, y - 20, 48, 9); c.strokeRect(x - 24, y - 20, 48, 9); c.fillRect(x - 6, y - 44, 12, 24); c.strokeRect(x - 6, y - 44, 12, 24); }
          else if (m === 3) { c.fillStyle = '#f4f1e6'; c.beginPath(); c.arc(x, y - 8, 30, 0, 7); c.fill(); c.stroke(); c.fillRect(x - 17, y + 12, 34, 22); c.strokeRect(x - 17, y + 12, 34, 22); c.fillStyle = '#16161a'; c.beginPath(); c.arc(x - 12, y - 8, 8, 0, 7); c.arc(x + 12, y - 8, 8, 0, 7); c.fill(); }
          else { c.beginPath(); c.arc(x, y, 34, 0, 7); c.fill(); c.stroke(); c.beginPath(); for (let k = 0; k <= 30; k++) { const t = k / 30 * 10, r = 3 + k; c.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); } c.stroke(); }
        }
      } else if (kind === 'poster') {
        const bg = pick(['#16161a', '#b8222c', '#f0c22e', '#1f3d8a', '#f25c9a', '#2c7a58']);
        c.fillStyle = bg; c.fillRect(0, 0, 256, 320);
        c.fillStyle = pick(['#f4f1e6', '#f0c22e', '#e2532a', '#16161a']); c.beginPath();
        if (random() < 0.5) c.arc(128, 150, 70 + random() * 30, 0, 7); else { c.moveTo(128, 50); c.lineTo(226, 240); c.lineTo(30, 240); }
        c.fill();
        c.fillStyle = bg === '#16161a' ? '#f4f1e6' : '#16161a';
        c.fillRect(20, 18, 216, 30); c.fillRect(20, 262, 150 + random() * 60, 16); c.fillRect(20, 286, 90 + random() * 60, 10);
      } else if (kind === 'chart') {
        c.fillStyle = '#f6f6f1'; c.fillRect(0, 0, 256, 320);
        c.strokeStyle = '#a56f5a'; c.lineWidth = 7; c.beginPath(); c.ellipse(128, 160, 70, 110, 0.1, 0, 7); c.stroke();
        c.lineWidth = 5; c.beginPath(); c.ellipse(134, 150, 42, 76, 0.1, 0.6, 5.2); c.stroke(); c.beginPath(); c.ellipse(120, 190, 18, 28, 0, 0, 7); c.stroke();
        for (let i = 0; i < 7; i++) { const t = -2 + i * 0.6; c.fillStyle = i % 2 ? '#d8a020' : '#3f9e9a'; c.beginPath(); c.arc(128 + Math.cos(t) * 70, 160 + Math.sin(t) * 108, 8, 0, 7); c.fill(); }
        c.fillStyle = '#3f9e9a'; c.fillRect(20, 14, 216, 16);
      } else {
        c.fillStyle = kind === 'aftercare' ? '#e3f1f2' : '#fbfaf3'; c.fillRect(0, 0, 256, 320);
        c.strokeStyle = kind === 'aftercare' ? '#3f9e9a' : '#b89a4a'; c.lineWidth = 6; c.strokeRect(12, 12, 232, 296);
        c.fillStyle = '#2a2a30'; c.fillRect(48, 34, 160, 20);
        c.fillStyle = 'rgba(40,40,48,0.6)'; for (let i = 0; i < 12; i++) c.fillRect(34, 76 + i * 16, 120 + random() * 68, 5);
        if (kind === 'aftercare') { c.fillStyle = '#3f9e9a'; c.fillRect(190, 252, 40, 14); c.fillRect(203, 239, 14, 40); }
        else { c.fillStyle = '#c8322b'; c.beginPath(); c.arc(196, 266, 24, 0, 7); c.fill(); }
      }
      if (mood.wear > 0.5) { c.fillStyle = `rgba(120,96,60,${(mood.wear - 0.5) * 0.5})`; c.fillRect(0, 0, 256, 320); }
      return mapOf(cv);
    };
    const kinds = { flash: ['flash', 'flash', 'flash', 'flash', 'poster'], cases: ['flash', 'chart', 'flash'], posters: ['poster', 'poster', 'poster', 'flash'], paperwork: ['paper', 'aftercare', 'chart', 'paper', 'flash'] }[a.walls];
    const frameM = s.material(L.frame, { roughness: 0.5 });
    const hang = (at: P, onLeft: boolean, w = 0.62, h = 0.78) => {
      const loose = a.walls === 'posters';
      const g = new THREE.Group(); g.position.set(...at); g.rotation.y = onLeft ? Math.PI / 2 : 0;
      g.rotation.z = (random() - 0.5) * (loose ? 0.22 : 0.03 + mood.wear * 0.1);
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: art(pick(kinds)), roughness: 0.85 }));
      sheet.position.z = loose ? 0.012 : 0.034; sheet.receiveShadow = true; g.add(sheet);
      if (!loose) { const f = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.03), frameM); f.position.z = 0.016; f.castShadow = true; g.add(f); }
      s.root.add(g);
    };
    const caseSpots: { at: P; left: boolean }[] = [];
    const fillRate = a.walls === 'cases' ? 0.55 : mix(0.55, 1, mood.density);
    for (let col = 0; col < 7; col++) for (let row = 0; row < 2; row++) {
      const x = xLeft + 0.75 + col * 0.84, y = 1.55 + row * 0.92;
      if (a.walls === 'cases' && row === 0 && col >= 2 && col <= 5) { if (col % 2 === 0) caseSpots.push({ at: [x + 0.42, 1.62, zBack + 0.01], left: false }); continue; }
      if (random() < fillRate) hang([x + (random() - 0.5) * 0.05, y + (random() - 0.5) * 0.05, zBack + 0.005], false);
      else if (mood.wear > 0.35) s.box([0.62, 0.78, 0.004], [x, y, zBack + 0.003], s.material(new THREE.Color(L.wall).lerp(new THREE.Color('#ffffff'), 0.35), { roughness: 0.95 }));
    }
    caseSpots.push({ at: [xLeft + 0.01, 1.95, -2.55], left: true });
    if (a.walls === 'cases' || mood.density > 0.45) caseSpots.push({ at: [xLeft + 0.01, 1.95, -1.05], left: true });
    else hang([xLeft + 0.005, 1.95, -1.05], true);
    for (const z of [0.55, 3.25]) for (const y of [1.6, 2.5]) if (random() < fillRate) hang([xLeft + 0.005, y, z], true);
    // Jewellery cases: velvet, glass, a strip light and a scatter of glints.
    const gems: { at: P; size: number; color: string }[] = [];
    for (const spot of caseSpots) {
      const g = new THREE.Group(); g.position.set(...spot.at); g.rotation.y = spot.left ? Math.PI / 2 : 0; s.root.add(g);
      const cw = 1.3, ch = 0.82;
      g.add(s.box([cw, ch, 0.14], [0, 0, 0.07], frameM));
      g.add(s.box([cw - 0.1, ch - 0.1, 0.02], [0, 0, 0.142], s.material(a.style === 'mall' ? '#f7d6ea' : a.style === 'clinical' ? '#27405a' : '#3a1420', { roughness: 0.95 })));
      g.add(s.box([cw - 0.12, 0.035, 0.03], [0, ch / 2 - 0.075, 0.16], glow('#fff4d0', off ? 0.15 : 1.1)));
      const pane = s.box([cw - 0.08, ch - 0.08, 0.01], [0, 0, 0.19], new THREE.MeshStandardMaterial({ color: '#dff1f6', transparent: true, opacity: 0.14, roughness: 0.05, depthWrite: false }));
      pane.castShadow = false; g.add(pane);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 9; j++) {
        if (random() < 0.12 + mood.wear * 0.3) continue;
        const local = new THREE.Vector3(-cw / 2 + 0.14 + j * (cw - 0.28) / 8, -ch / 2 + 0.13 + i * (ch - 0.3) / 4, 0.165).applyEuler(g.rotation).add(g.position);
        gems.push({ at: local.toArray() as P, size: 0.022 + random() * 0.016, color: pick(a.style === 'tribal' ? ['#f1e6c8', '#3a271c', '#d8a020'] : a.style === 'mall' ? ['#ff5ab0', '#f6d23a', '#6ad0ff', '#ffffff'] : ['#f2c84a', '#e2e6ea', '#f2c84a', '#9fd0ff']) });
      }
    }
    if (gems.length) s.scatter(new THREE.TorusGeometry(0.8, 0.28, 6, 14), s.material('#ffffff', { metalness: 0.6, roughness: 0.25, emissive: '#6a5a30', emissiveIntensity: off ? 0.2 : 0.8 }), gems);
    // A long mirror by the front of the left wall.
    s.box([0.05, 1.95, 0.95], [xLeft + 0.03, 1.2, 1.95], frameM);
    s.box([0.02, 1.8, 0.8], [xLeft + 0.06, 1.2, 1.95], s.material('#cfdde3', { roughness: 0.12, metalness: 0.25 }));

    // ---- The sign.
    const signOn = !off;
    const signColour = { seventies: '#e2532a', nineties: mood.warmth > 0.5 ? '#ff4d6a' : '#4de1ff', noughties: '#2a2a30', now: mood.cheer > 0.5 ? '#ff7ad0' : '#f4f1ff' }[a.era];
    const [signCv, sc] = canvasOf(1024, 192);
    const signX = (doorL + xLeft) / 2 + 0.4, signW = 3.3, signH = signW * 192 / 1024;
    sc.textAlign = 'center'; sc.textBaseline = 'middle';
    if (a.era === 'seventies') { sc.fillStyle = '#ecd9a8'; sc.fillRect(0, 0, 1024, 192); sc.strokeStyle = '#6b3a1c'; sc.lineWidth = 14; sc.strokeRect(10, 10, 1004, 172); sc.fillStyle = '#6b3a1c'; sc.font = 'bold 118px Georgia, serif'; sc.fillText(SIGNS[a.sign], 516, 104, 930); sc.fillStyle = signColour; sc.fillText(SIGNS[a.sign], 510, 98, 930); }
    else if (a.era === 'noughties') { sc.fillStyle = '#fdfdf6'; sc.fillRect(0, 0, 1024, 192); sc.fillStyle = '#d1242f'; sc.fillRect(0, 0, 1024, 26); sc.fillRect(0, 166, 1024, 26); sc.fillStyle = signColour; sc.font = 'bold 112px Arial, sans-serif'; sc.fillText(SIGNS[a.sign], 512, 100, 940); }
    else { sc.fillStyle = a.style === 'clinical' || a.style === 'mall' ? '#3a3340' : '#1c1a20'; sc.fillRect(0, 0, 1024, 192); sc.font = a.era === 'now' ? 'italic 120px Georgia, serif' : 'bold 116px Arial, sans-serif'; sc.shadowColor = signColour; sc.shadowBlur = signOn ? 26 : 0; sc.lineWidth = 9; sc.strokeStyle = signOn ? signColour : '#77777c'; sc.strokeText(SIGNS[a.sign], 512, 100, 930); sc.shadowBlur = 0; sc.lineWidth = 3; sc.strokeStyle = signOn ? '#ffffff' : '#99999c'; sc.strokeText(SIGNS[a.sign], 512, 100, 930); }
    const signMap = mapOf(signCv);
    const lit = a.era !== 'seventies' && signOn;
    const signM = new THREE.MeshStandardMaterial({ map: signMap, roughness: 0.6, emissive: '#ffffff', emissiveMap: signMap, emissiveIntensity: lit ? mix(0.7, 1.3, mood.cheer) : 0 });
    s.box([signW + 0.12, signH + 0.12, 0.08], [signX, H - 0.42, zBack + 0.04], a.era === 'seventies' ? s.material('#6b3a1c') : black);
    const signMesh = s.mesh(new THREE.PlaneGeometry(signW, signH), signM, [signX, H - 0.42, zBack + 0.085]);
    signMesh.castShadow = false;
    if (off || mood.wear > 0.8) signMesh.parent!.children.slice(-2).forEach((m) => { m.rotation.z = -0.05; });

    // ---- Doorway curtain.
    {
      const drawn = mix(0.2, 1, a.curtain), doorW = doorR - doorL, cw = doorW * drawn, chh = doorH - 0.08;
      const [cv, c] = canvasOf(256, 256); c.fillStyle = L.cloth; c.fillRect(0, 0, 256, 256);
      if (a.style === 'tribal') for (let i = 0; i < 8; i++) { c.fillStyle = ['#1d1512', '#e9d9b8', '#d8a020'][i % 3]; c.fillRect(0, i * 32 + 10, 256, i % 3 === 0 ? 8 : 4); }
      if (a.style === 'diy') for (let i = 0; i < 40; i++) { c.fillStyle = pick(['#f4f1e6', '#f6c8d8', '#f0d860']); c.beginPath(); c.arc(random() * 256, random() * 256, 7 + random() * 7, 0, 7); c.fill(); }
      if (a.style === 'biker') { c.fillStyle = '#c2242a'; c.fillRect(0, 214, 256, 14); }
      if (a.style === 'mall') for (let i = 0; i < 16; i++) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(i * 16, 0, 5, 256); }
      const g = new THREE.PlaneGeometry(cw, chh, 64, 8), p = g.attributes.position, folds = 9;
      for (let i = 0; i < p.count; i++) { const u = p.getX(i) / cw + 0.5, v = p.getY(i) / chh + 0.5; p.setZ(i, Math.sin(u * folds * Math.PI * 2) * mix(0.1, 0.045, drawn) * (1.15 - v * 0.6)); }
      g.computeVertexNormals();
      const cloth = s.mesh(g, new THREE.MeshStandardMaterial({ map: mapOf(cv), roughness: 0.85, side: THREE.DoubleSide }), [doorL + cw / 2 + 0.02, chh / 2 + 0.03, zBack + 0.14]);
      s.rod([doorL - 0.2, doorH + 0.02, zBack + 0.14], [doorR + 0.2, doorH + 0.02, zBack + 0.14], 0.022, steel);
      if (off) { cloth.rotation.z = -0.16; cloth.position.y -= 0.14; cloth.position.x += 0.1; }
    }

    // ---- Counter along the left wall.
    const cx = xLeft + 0.42, cz0 = -3.5, cLen = 3.3, cz = cz0 + cLen / 2;
    const counterM = s.material(L.counter, a.style === 'biker' ? { metalness: 0.4, roughness: 0.35 } : { roughness: 0.6 });
    const topY = 0.94;
    if (a.style === 'diy') {
      s.box([0.8, 0.04, cLen], [cx, topY - 0.02, cz], s.material(L.top));
      for (const z of [cz0 + 0.2, cz0 + cLen - 0.2]) for (const x of [-0.3, 0.3]) s.rod([cx + x, 0, z], [cx + x * 0.5, topY - 0.04, z], 0.02, steel);
      s.box([0.7, 0.012, 1.1], [cx, topY + 0.006, cz + 0.6], s.material('#9fc0d8', { roughness: 1 }));
    } else {
      s.box([0.74, topY - 0.05, cLen], [cx, (topY - 0.05) / 2, cz], counterM);
      s.box([0.8, 0.05, cLen + 0.06], [cx, topY - 0.025, cz], s.material(L.top, { roughness: 0.4 }));
      const drawers = a.style === 'biker' ? 6 : 2;
      for (let i = 0; i < 4; i++) for (let j = 0; j < drawers; j++) {
        const hgt = (topY - 0.2) / drawers;
        s.box([0.012, hgt - 0.03, cLen / 4 - 0.05], [cx + 0.372, 0.08 + hgt * (j + 0.5), cz0 + cLen / 8 + i * cLen / 4], s.material(new THREE.Color(L.counter).multiplyScalar(0.9)));
        s.box([0.02, 0.02, a.style === 'biker' ? cLen / 4 - 0.14 : 0.16], [cx + 0.39, 0.08 + hgt * (j + 0.78), cz0 + cLen / 8 + i * cLen / 4], steel);
      }
    }
    // Sink, steriliser, gloves, sharps bin and bottles.
    s.box([0.46, 0.03, 0.5], [cx - 0.04, topY + 0.005, cz0 + 0.42], steel);
    s.box([0.36, 0.02, 0.4], [cx - 0.04, topY + 0.016, cz0 + 0.42], s.material('#6d7377', { metalness: 0.6, roughness: 0.4 }));
    s.tube([[cx - 0.3, topY, cz0 + 0.42], [cx - 0.3, topY + 0.3, cz0 + 0.42], [cx - 0.2, topY + 0.36, cz0 + 0.42], [cx - 0.1, topY + 0.28, cz0 + 0.42]], 0.018, steel);
    s.box([0.5, 0.36, 0.52], [cx - 0.06, topY + 0.18, cz0 + 1.2], a.style === 'diy' ? s.material('#c9c2b0') : white);
    const door = s.ring(0.12, 0.022, [cx + 0.195, topY + 0.19, cz0 + 1.2], steel); door.rotation.y = Math.PI / 2;
    s.box([0.01, 0.04, 0.1], [cx + 0.195, topY + 0.32, cz0 + 1.05], glow(off ? '#5a2a2a' : '#ff5a3a', off ? 0.1 : 1.2));
    s.box([0.26, 0.11, 0.14], [cx - 0.1, topY + 0.055, cz0 + 1.75], s.material('#3f6fd0'));
    s.box([0.16, 0.05, 0.1], [cx - 0.1, topY + 0.125, cz0 + 1.75], s.material('#bcd4f2', { roughness: 0.9 }));
    s.box([0.2, 0.26, 0.2], [cx - 0.12, topY + 0.13, cz0 + 2.1], s.material('#f0c81e', { roughness: 0.4 }));
    s.box([0.22, 0.05, 0.22], [cx - 0.12, topY + 0.285, cz0 + 2.1], s.material('#d1242f', { roughness: 0.4 }));
    const bottles = Math.round(mix(2, 9, mood.density));
    for (let i = 0; i < bottles; i++) {
      const bx = cx + 0.12 + (random() - 0.5) * 0.2, bz = cz0 + 2.4 + i * 0.1 + random() * 0.03, bh = 0.16 + random() * 0.14;
      if (bz > cz0 + cLen - 0.08) break;
      s.cylinder(0.035, 0.04, bh, [bx, topY + bh / 2, bz], s.material(pick(['#f4f4ee', '#7fc48a', '#6a3fa8', '#c98a3a', '#3f9e9a', '#e9e2c0']), { roughness: 0.3 }), 10);
      s.cylinder(0.014, 0.02, 0.05, [bx, topY + bh + 0.025, bz], pick([white, black]), 8);
    }
    // Paper towel dispenser and style-specific fittings.
    s.box([0.14, 0.34, 0.3], [xLeft + 0.08, 1.45, cz0 + 0.42], a.style === 'diy' ? s.material('#8a8c88') : white);
    s.box([0.012, 0.16, 0.22], [xLeft + 0.16, 1.24, cz0 + 0.42], s.material('#f8f7f0', { roughness: 1 }));
    if (a.style === 'clinical') {
      for (const size of [[0.05, 0.5, 0.18], [0.05, 0.18, 0.5]] as P[]) s.box(size, [xLeft + 0.04, 2.75, 0.55], glow('#35c46a', off ? 0.25 : 1.1));
      s.box([0.1, 0.22, 0.12], [xLeft + 0.07, 1.4, 1.2], white); s.box([0.06, 0.06, 0.06], [xLeft + 0.12, 1.27, 1.2], s.material('#3f9e9a'));
    } else if (a.style === 'biker') {
      s.ball([0.17, 0.16, 0.19], [cx, topY + 0.16, cz0 + 2.85], s.material('#17171a', { roughness: 0.2, metalness: 0.3 }), 18);
      s.box([0.2, 0.07, 0.02], [cx + 0.1, topY + 0.17, cz0 + 2.85], s.material('#6a7078', { roughness: 0.1 })).rotation.y = Math.PI / 2;
      for (let i = 0; i < 14; i++) s.ring(0.05, 0.012, [xLeft + 0.07, 2.9 - i * 0.07, 3.0 + Math.sin(i * 0.5) * 0.03], steel).rotation.y = i % 2 ? 0 : Math.PI / 2;
    } else if (a.style === 'mall') {
      const cards: { at: P; size: number; color: string }[] = [];
      for (let i = 0; i < 26; i++) for (let j = 0; j < 3; j++) if (random() < mix(0.5, 0.95, mood.density) - mood.wear * 0.3) cards.push({ at: [xLeft + 0.4 + i * 0.235, 0.2 + j * 0.29, zBack + 0.07], size: 1, color: pick(['#ffffff', '#ffd6ec', '#fff3b0', '#c8ecff', '#e4d0ff']) });
      s.scatter(new THREE.BoxGeometry(0.16, 0.22, 0.012), s.material('#ffffff', { roughness: 0.7 }), cards);
      s.scatter(new THREE.SphereGeometry(0.022, 8, 6), glow('#ffffff', 0.25), cards.map((card) => ({ at: [card.at[0], card.at[1] - 0.02, card.at[2] + 0.012] as P, size: 1, color: pick(['#ff5ab0', '#f6d23a', '#6ad0ff', '#b06aff', '#ff8a3a']) })));
      for (let i = 0; i < 9; i++) { const star = s.cylinder(0.11, 0.11, 0.01, [xLeft + 0.05, 2.2 + random() * 0.9, -3.6 + i * 0.85 + random() * 0.3], glow(pick(['#ffe14a', '#ff7ad0', '#7ae0ff']), 0.5), 5); star.rotation.z = Math.PI / 2; star.rotation.x = random() * 2; }
    } else if (a.style === 'tribal') {
      for (const [z, y] of [[2.9, 2.6], [3.45, 1.75]]) {
        const wood = s.material(pick(['#3a271c', '#5a3a26', '#241812']), { roughness: 0.7 });
        s.ball([0.09, 0.42, 0.26], [xLeft + 0.07, y, z], wood, 18);
        for (const k of [-1, 1]) s.box([0.03, 0.05, 0.12], [xLeft + 0.15, y + 0.1, z + k * 0.1], s.material('#f1e6c8'));
        s.box([0.03, 0.04, 0.16], [xLeft + 0.15, y - 0.18, z], s.material('#b8222c'));
        s.box([0.06, 0.22, 0.05], [xLeft + 0.16, y - 0.02, z], wood);
      }
      for (const z of [-3.85, 3.85]) s.cylinder(0.05, 0.055, H, [xLeft + 0.12, H / 2, z], s.material('#b89a4a'), 10);
    } else {
      s.rod([-1.2, H + 0.5, -2.2], [-1.2, 2.75, -2.2], 0.012, black);
      s.ball([0.075, 0.095, 0.075], [-1.2, 2.66, -2.2], glow('#fff0c0', off ? 0.1 : 1.6), 12);
      s.tube([[xLeft + 0.3, 0.02, 0.9], [-3.2, 0.02, 1.5], [-2.4, 0.02, 1.1], [-1.9, 0.02, 1.9], [-1.5, 0.02, 1.6]], 0.018, s.material('#e8742a'));
      s.box([0.34, 0.06, 0.1], [-1.4, 0.03, 1.6], white).rotation.y = 0.5;
    }

    // ---- Instrument trolley, stool and bin.
    {
      const tx = -1.9, tz = -3.05, g = new THREE.Group(); g.position.set(tx, 0, tz); g.rotation.y = (random() - 0.5) * 0.5; s.root.add(g);
      const add = <T extends THREE.Object3D>(o: T) => { g.add(o); return o; };
      for (const x of [-0.33, 0.33]) for (const z of [-0.22, 0.22]) { add(s.rod([x, 0.08, z], [x, 0.93, z], 0.016, steel)); add(s.ball([0.04, 0.04, 0.04], [x, 0.04, z], black, 10)); }
      for (const y of [0.3, 0.9]) { add(s.box([0.72, 0.025, 0.5], [0, y, 0], steel)); for (const z of [-0.25, 0.25]) add(s.box([0.72, 0.05, 0.012], [0, y + 0.03, z], steel)); }
      add(s.box([0.5, 0.2, 0.3], [0, 0.42, 0], s.material(a.style === 'mall' ? '#ffd6ec' : '#dfe7ea')));
      const scatterTray = off ? 0.25 : 0.03;
      if (a.session !== 'abandoned') add(s.box([0.62, 0.006, 0.42], [0, 0.918, 0], s.material(a.session === 'ready' ? '#9fd0e8' : '#c7dfe8', { roughness: 1 })));
      const dish = add(s.cylinder(0.12, 0.09, 0.04, [-0.17 + (random() - 0.5) * scatterTray, 0.94, 0.02], steel, 16)); dish.scale.z = 0.6;
      for (let i = 0; i < 4; i++) { const tool = add(s.rod([0.02 + i * 0.07, 0.93, -0.14], [0.03 + i * 0.07, 0.93, 0.12], 0.008, steel)); tool.rotation.y = off ? random() * 3 : (random() - 0.5) * 0.1; }
      for (let i = 0; i < 3; i++) add(s.box([0.1, 0.012, 0.05], [-0.2 + i * 0.03, 0.93 + i * 0.012, -0.15], white)).rotation.y = random() * 0.5;
      if (a.session === 'finished') for (let i = 0; i < 4; i++) { add(s.ball([0.04, 0.03, 0.04], [0.22 + (random() - 0.5) * 0.12, 0.945, 0.08 + (random() - 0.5) * 0.14], white, 8)); add(s.ball([0.015, 0.01, 0.015], [0.22 + (random() - 0.5) * 0.1, 0.972, 0.08 + (random() - 0.5) * 0.1], s.material('#b8222c'), 6)); }
      if (off) { s.cylinder(0.12, 0.09, 0.04, [tx + 0.9, 0.02, tz + 0.9], steel, 16).rotation.x = Math.PI; for (let i = 0; i < 3; i++) s.rod([tx + 0.5 + random() * 0.7, 0.012, tz + 0.7 + random() * 0.6], [tx + 0.6 + random() * 0.7, 0.012, tz + 0.9 + random() * 0.6], 0.008, steel); }
    }
    {
      const g = new THREE.Group(); s.root.add(g);
      const add = <T extends THREE.Object3D>(o: T) => { g.add(o); return o; };
      for (let i = 0; i < 5; i++) { const t = i / 5 * Math.PI * 2; add(s.rod([0, 0.08, 0], [Math.cos(t) * 0.28, 0.05, Math.sin(t) * 0.28], 0.018, steel)); add(s.ball([0.035, 0.035, 0.035], [Math.cos(t) * 0.28, 0.035, Math.sin(t) * 0.28], black, 8)); }
      add(s.cylinder(0.025, 0.03, 0.5, [0, 0.33, 0], steel, 10));
      add(s.cylinder(0.2, 0.19, 0.09, [0, 0.62, 0], s.material(a.style === 'mall' ? '#ee3f9a' : a.style === 'biker' ? '#c2242a' : '#232327', { roughness: 0.45 }), 22));
      if (off) { g.rotation.z = Math.PI / 2 - 0.12; g.rotation.y = random() * 3; g.position.set(-1.25, 0.2, 1.3); }
      else g.position.set(a.session === 'ready' ? -1.15 : -1.75, 0, a.session === 'ready' ? 1.15 : 1.75);
    }
    s.cylinder(0.2, 0.17, 0.56, [0.2, 0.28, -3.6], steel, 18);
    const lid = s.cylinder(0.21, 0.21, 0.03, [0.2, 0.575, -3.6], steel, 18);
    if (a.session === 'finished') { lid.rotation.x = -1.1; lid.position.set(0.2, 0.72, -3.78); for (let i = 0; i < 4; i++) s.ball([0.07, 0.04, 0.09], [0.2 + (random() - 0.5) * 0.14, 0.57 + i * 0.012, -3.6 + (random() - 0.5) * 0.14], s.material(a.style === 'biker' || a.style === 'tribal' ? '#1c1c20' : '#4a8ae0', { roughness: 0.5 }), 8); }
    if (a.session !== 'ready') for (let i = 0; i < Math.round(1 + mood.wear * 5); i++) s.ball([0.05, 0.03, 0.05], [-0.8 + random() * 2.2, 0.03, -0.9 + random() * 2.6], white, 7);

    // ---- A period prop in the corner beyond the door, on the right.
    const px = 4.05, pz = -3.4;
    if (a.era === 'seventies') {
      for (const x of [-0.24, 0.24]) for (const z of [-0.12, 0.12]) s.rod([px + x, 0, pz + z], [px + x * 0.8, 0.42, pz + z], 0.02, s.material('#3a271c'));
      s.box([0.66, 0.4, 0.34], [px, 0.62, pz], s.material('#7a4a26', { roughness: 0.5 }));
      s.box([0.36, 0.3, 0.01], [px - 0.12, 0.62, pz + 0.175], s.material('#c9a86a', { roughness: 1 }));
      s.cylinder(0.05, 0.05, 0.02, [px + 0.2, 0.68, pz + 0.18], steel, 14).rotation.x = Math.PI / 2;
    } else if (a.era === 'nineties') {
      s.box([0.5, 0.4, 0.4], [px, 0.2, pz], s.material('#2f6fd0', { roughness: 0.5 }));
      s.box([0.72, 0.3, 0.2], [px, 0.55, pz], black);
      for (const x of [-0.22, 0.22]) s.cylinder(0.1, 0.1, 0.02, [px + x, 0.55, pz + 0.105], steel, 16).rotation.x = Math.PI / 2;
      s.box([0.16, 0.08, 0.01], [px, 0.6, pz + 0.105], glow('#6aff8a', off ? 0.1 : 0.9));
      s.tube([[px - 0.3, 0.7, pz], [px, 0.86, pz], [px + 0.3, 0.7, pz]], 0.014, steel);
    } else if (a.era === 'noughties') {
      s.box([0.6, 0.7, 0.45], [px, 0.35, pz], black);
      s.box([0.62, 0.52, 0.5], [px, 0.96, pz], s.material('#b9bcc0', { roughness: 0.5 }));
      s.box([0.5, 0.4, 0.02], [px, 0.97, pz + 0.255], glow(off ? '#20242c' : pick(['#7ab0ff', '#b0ffd0', '#ffd0a0']), off ? 0.05 : 1.2));
    } else {
      for (let i = 0; i < 3; i++) { const t = i / 3 * Math.PI * 2 + 0.4; s.rod([px + Math.cos(t) * 0.34, 0, pz + Math.sin(t) * 0.34], [px, 0.75, pz], 0.014, black); }
      s.rod([px, 0.75, pz], [px, 1.62, pz], 0.014, black);
      const ringLight = s.ring(0.27, 0.035, [px, 1.9, pz], glow('#fff6e6', off ? 0.15 : 1.5)); ringLight.rotation.y = -0.6;
      s.box([0.09, 0.17, 0.015], [px, 1.9, pz], black).rotation.y = -0.6;
    }

    // ---- The gooseneck lamp over the hero slot.
    const lampM = s.material(L.lamp, { metalness: a.style === 'mall' || a.style === 'diy' ? 0.2 : 0.8, roughness: 0.3 });
    const lx = -1.25, lz = -0.55, heroX = 0.35, heroZ = 0.75;
    s.cylinder(0.3, 0.36, 0.07, [lx, 0.035, lz], lampM, 22);
    s.cylinder(0.04, 0.045, 1.5, [lx, 0.78, lz], lampM, 12);
    const head: P = off ? [lx + 0.75, 1.55, lz + 0.55] : [heroX - 0.3, 3.12, heroZ - 0.3];
    const neck: P[] = off
      ? [[lx, 1.5, lz], [lx - 0.05, 2.25, lz], [lx + 0.35, 2.55, lz + 0.25], [lx + 0.72, 2.15, lz + 0.5], head]
      : [[lx, 1.5, lz], [lx - 0.12, 2.45, lz - 0.05], [lx + 0.3, 3.3, lz + 0.2], [lx + 0.95, 3.42, lz + 0.7], head];
    s.tube(neck, 0.045, s.material('#8d9296', { metalness: 0.7, roughness: 0.45 }));
    const aim = new THREE.Vector3(heroX, 1.0, heroZ).sub(new THREE.Vector3(...head)).normalize();
    const turn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), off ? new THREE.Vector3(0.3, -1, 0.2).normalize() : aim);
    const shade = s.cylinder(0.09, 0.4, 0.42, [head[0], head[1] - 0.12, head[2]], lampM, 22); shade.quaternion.copy(turn);
    const lampWarm = new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.6, 0.85);
    const bulb = s.cylinder(0.35, 0.35, 0.02, [head[0], head[1] - 0.29, head[2]], s.material(off ? '#8a8a84' : lampWarm, { emissive: off ? '#000000' : lampWarm, emissiveIntensity: off ? 0 : 1.8 }), 22);
    bulb.quaternion.copy(turn); bulb.position.set(head[0], head[1], head[2]).addScaledVector(new THREE.Vector3(0, -1, 0).applyQuaternion(turn), 0.325);
    let spot: THREE.SpotLight | null = null;
    if (!off) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 1.4, 2.9, 28, 1, true), new THREE.MeshBasicMaterial({ color: lampWarm, transparent: true, opacity: mix(0.07, 0.15, 1 - Math.abs(mood.daylight - 0.5) * 2 < 0.5 ? 1 : 0.4), depthWrite: false, side: THREE.DoubleSide }));
      beam.quaternion.copy(turn); beam.position.set(...head).addScaledVector(aim, 1.78); s.root.add(beam);
      spot = new THREE.SpotLight(lampWarm, 7, 9, 0.5, 0.7, 1.1);
      spot.position.set(...head); spot.target.position.set(heroX, 0.6, heroZ); s.root.add(spot, spot.target);
    }

    const flicker = lit && a.era === 'nineties' ? mix(0.05, 0.5, Math.max(mood.energy, mood.wear)) : 0;
    const base = signM.emissiveIntensity, spotBase = spot?.intensity ?? 0;
    world.update = (_dt, time) => {
      if (flicker) signM.emissiveIntensity = base * (1 - flicker * (Math.sin(time * 31) * Math.sin(time * 7.3) > 0.55 ? 1 : 0));
      if (spot) spot.intensity = spotBase * (1 + Math.sin(time * 2.1) * 0.03 * mood.energy);
    };
    return world;
  },
});
