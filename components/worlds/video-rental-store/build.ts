import * as THREE from 'three';
import { diorama, choice, defineWorld, mix } from '@conjure/kit';

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat = false) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const KINDS = {
  chain: { name: 'VIDEO PLANET', wall: '#2b55b8', band: '#f6cf1e', rack: '#1f3f96', lip: '#f6cf1e', signPaper: '#f6cf1e', signInk: '#1a2f7a', counter: '#1f46a8', format: 'vhs' },
  indie: { name: 'REEL TO REEL VIDEO', wall: '#d9cdb2', band: '#7a4a2a', rack: '#8a6238', lip: '#e8dcc0', signPaper: '#f1e6c4', signInk: '#7a1c1c', counter: '#8a6238', format: 'vhs' },
  nollywood: { name: 'LAGOS STAR MOVIES', wall: '#2f9a55', band: '#f08a1c', rack: '#e9e2cc', lip: '#f08a1c', signPaper: '#ffe23a', signInk: '#1a6a34', counter: '#f08a1c', format: 'slim' },
  bollywood: { name: 'BOMBAY TALKIES VIDEO', wall: '#c8327a', band: '#f6b21a', rack: '#f1e4c8', lip: '#f6b21a', signPaper: '#f6b21a', signInk: '#8a1250', counter: '#7a2a8a', format: 'slim' },
  anime: { name: 'MOONLIGHT ANIME & LASER', wall: '#34343c', band: '#ff4fa6', rack: '#1c1c22', lip: '#ff4fa6', signPaper: '#16161c', signInk: '#ff7ac0', counter: '#1c1c22', format: 'disc' },
} as const;
const SIGNS = {
  mainstream: ['NEW RELEASES', 'ACTION', 'COMEDY', 'DRAMA', 'HORROR', 'FAMILY', 'SCI-FI'],
  family: ['NEW RELEASES', 'FAMILY', 'KIDS', 'COMEDY', 'MUSICALS', 'CARTOONS', 'DRAMA'],
  cult: ['CULT', 'HORROR', 'SCI-FI', 'KUNG FU', 'WEIRD', 'MIDNIGHT', 'B-MOVIES'],
  imports: ['NEW ARRIVALS', 'ROMANCE', 'ACTION', 'COMEDY', 'EPICS', 'FAMILY', 'CLASSICS'],
  anime: ['MECHA', 'MAGICAL GIRL', 'OVA', 'SUBTITLED', 'LASERDISC', 'IMPORTS', 'DUBBED'],
  clerk: ['GOOD', 'BAD', "SO BAD IT'S GOOD", "DAVE'S SHELF", 'DATE NIGHT', 'DO NOT RENT', '???'],
} as const;
const PALETTES: [RegExp, string[]][] = [
  [/HORROR|CULT|WEIRD|MIDNIGHT|DO NOT|BAD/, ['#17141a', '#8f1414', '#2b3a1f', '#3a1238', '#d9380f', '#b9b2a2']],
  [/ACTION|KUNG|MECHA|EPICS|B-MOV/, ['#f28a12', '#1c2530', '#b3261e', '#5d7186', '#e9d23a', '#8a3a12']],
  [/COMEDY|KIDS|FAMILY|MUSICAL|CARTOON|MAGICAL|GOOD|DUBBED/, ['#f2c21a', '#2f8fe0', '#e8443a', '#58b84a', '#f08ab4', '#f6f2e6']],
  [/DRAMA|ROMANCE|SUBTITLED|CLASSICS|DATE/, ['#e9e0c6', '#6e1f2c', '#c98aa0', '#c99a2e', '#27323a', '#a8b4b0']],
  [/SCI|OVA|LASER|IMPORT|\?/, ['#101c3a', '#1f6a8a', '#6ef0e0', '#8a8f9a', '#3a1a5a', '#e0522a']],
];
const MIXED = ['#d81e2c', '#1f4fb8', '#f2f2f2', '#141414', '#f2b81a', '#1f9a8a', '#7a2a9a'];
const paletteFor = (text: string) => PALETTES.find(([test]) => test.test(text))?.[1] ?? MIXED;

export default defineWorld({
  questions: {
    kind: choice('What kind of video store is it?', {
      chain: 'A blue-and-yellow national chain, bright and identical to every other branch.',
      indie: 'A cluttered independent with wood panelling, posters everywhere and boxes in the corners.',
      nollywood: 'A Nollywood import shop in green and orange, slim disc cases and hand-painted signs.',
      bollywood: 'A Bollywood import shop in magenta and saffron with marigold garlands along the shelves.',
      anime: 'An anime and laserdisc specialist: charcoal walls, a pink neon line, big square sleeves.',
    }),
    state: choice('What state is the store in tonight?', {
      busy: 'Friday night at its height: every light on, the OPEN sign lit, new releases half gone.',
      quiet: 'A slow weekday: fully stocked, faced up, nobody in.',
      closing: 'A closing-down sale: yellow EVERYTHING MUST GO banners and shelves picked half bare.',
      abandoned: 'Long abandoned: lights dead, shelves almost empty, boxes and ceiling tiles on the carpet.',
    }),
    signs: choice('What do the genre signs over the shelves say?', {
      mainstream: 'NEW RELEASES, ACTION, COMEDY, DRAMA, HORROR.',
      family: 'NEW RELEASES, FAMILY, KIDS, COMEDY, MUSICALS.',
      cult: 'CULT, HORROR, SCI-FI, KUNG FU, WEIRD.',
      imports: 'NEW ARRIVALS, ROMANCE, ACTION, COMEDY, EPICS.',
      anime: 'MECHA, MAGICAL GIRL, OVA, SUBTITLED, LASERDISC.',
      clerk: "A clerk's own categories: GOOD, BAD, SO BAD IT'S GOOD, DAVE'S SHELF.",
    }),
    carpet: choice('What is underfoot?', {
      confetti: 'Teal carpet printed with pink and yellow squiggles and triangles.',
      grey: 'Flat grey office carpet tile.',
      red: 'Deep red carpet worn pale along the aisles.',
      checker: 'Black and white vinyl checkerboard.',
      brown: 'Brown shag that has seen everything.',
    }),
    banner: choice('What does the big sign on the back wall say?', {
      name: "The store's own name.",
      kind: 'BE KIND · PLEASE REWIND',
      deal: '2 FOR 1 TUESDAYS',
      late: 'LATE FEES $2 PER DAY',
      members: 'MEMBERSHIP IS FREE',
    }),
    counter: choice('What is going on at the counter by the door?', {
      tv: 'A television on a wall bracket plays a movie to nobody.',
      candy: 'A rack of candy and microwave popcorn tempts the queue.',
      returns: 'A mountain of returned tapes waits to be checked in.',
      computer: 'A beige computer terminal glows green beside the till.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const kind = KINDS[a.kind];
    const dead = a.state === 'abandoned';
    const { art: s, world } = diorama(context, {
      background: dead ? '#b9bec2' : a.state === 'busy' ? '#dcd6cf' : '#e2e2da',
      floor: '#8a8f92', width: 14, depth: 11, maxHeight: 2.5, radius: 1.25, pitch: 30, yaw: 28,
      slots: [[0.6, 1.2], [-2.5, 0.0, 0, 0.9], [4.9, -0.4, 0, 0.9], [4.6, 3.5, 0, 0.8], [-2.2, 4.3, 0, 0.75], [-4.5, 3.95, 1.09, 0.3]],
    });
    const root = s.root;
    if (dead) {
      for (const child of root.children) {
        const light = child as THREE.Light;
        if ((light as THREE.HemisphereLight).isHemisphereLight) light.intensity = 0.95;
        else if ((light as THREE.DirectionalLight).isDirectionalLight && light.castShadow) { light.intensity = 1.7; light.color.set('#c8d4e6'); }
      }
    }
    const into = (group: THREE.Group, build: () => void) => {
      const start = root.children.length;
      build();
      for (const child of root.children.slice(start)) group.add(child);
      root.add(group);
      group.updateMatrixWorld(true);
    };

    // Carpet.
    const carpet = paint(256, 256, (ctx) => {
      const base = { confetti: '#2f7f86', grey: '#8f9396', red: '#8a2a2e', checker: '#ecebe4', brown: '#7a5a3a' }[a.carpet];
      ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
      if (a.carpet === 'confetti') {
        const inks = ['#ff5fa8', '#ffd83a', '#7a4ae0', '#f4f1e6'];
        for (let i = 0; i < 46; i++) {
          const x = random() * 256, y = random() * 256; ctx.strokeStyle = ctx.fillStyle = inks[i % 4]; ctx.lineWidth = 4;
          if (i % 3 === 0) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y + 4); ctx.lineTo(x + 5, y + 14); ctx.fill(); }
          else { ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 8, y - 12, x + 14, y + 12, x + 24, y); ctx.stroke(); }
        }
      }
      if (a.carpet === 'grey') { ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, 128, 128); ctx.strokeRect(128, 128, 128, 128); ctx.strokeRect(0, 128, 128, 128); ctx.strokeRect(128, 0, 128, 128); }
      if (a.carpet === 'checker') { ctx.fillStyle = '#1c1c1e'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) ctx.fillRect(i * 64, j * 64, 64, 64); }
      if (a.carpet === 'red') { ctx.fillStyle = 'rgba(255,220,200,0.12)'; ctx.fillRect(96, 0, 64, 256); }
      for (let i = 0; i < 900; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)'; ctx.fillRect(random() * 256, random() * 256, 2, 2); }
      ctx.fillStyle = 'rgba(40,30,20,0.13)';
      for (let i = 0; i < mood.wear * 5 + (dead ? 6 : 0); i++) { ctx.beginPath(); ctx.ellipse(random() * 256, random() * 256, 8 + random() * 22, 6 + random() * 14, random() * 3, 0, 7); ctx.fill(); }
    }, true);
    carpet.repeat.set(5, 4);
    if (world.ground) {
      const ground = world.ground as THREE.Mesh;
      (ground.material as THREE.Material).dispose();
      ground.material = new THREE.MeshStandardMaterial({ map: carpet, roughness: a.carpet === 'checker' ? 0.4 : 0.95 });
    }

    // Walls: back wall and the left wall with a glass door.
    const WH = 3.4;
    const wall = s.material(kind.wall, { roughness: 0.85 });
    const band = s.material(kind.band, { roughness: 0.6, emissive: a.kind === 'anime' && !dead ? kind.band : '#000000', emissiveIntensity: 0.8 });
    const steel = s.material('#aab0b2', { metalness: 0.7, roughness: 0.35 });
    const dark = s.material('#1c1c20', { roughness: 0.7 });
    s.box([14, WH, 0.22], [0, WH / 2, -5.39], wall);
    s.box([14, 0.14, 0.03], [0, 2.78, -5.265], band);
    const doorA = 0.95, doorB = 2.35;
    s.box([0.22, WH, doorA + 5.5], [-6.89, WH / 2, (doorA - 5.5) / 2], wall);
    s.box([0.22, WH, 5.5 - doorB], [-6.89, WH / 2, (5.5 + doorB) / 2], wall);
    s.box([0.22, WH - 2.3, doorB - doorA], [-6.89, 2.3 + (WH - 2.3) / 2, (doorA + doorB) / 2], wall);
    s.box([0.03, 0.14, 11], [-6.765, 2.78, 0], band);
    if (a.kind === 'indie') { s.box([14, 1.0, 0.03], [0, 0.5, -5.27], s.material('#7a5232')); s.box([0.03, 1.0, 5.5 - doorB], [-6.77, 0.5, (5.5 + doorB) / 2], s.material('#7a5232')); }
    // Door: frame, glass, push bar, mat, and what hangs on it.
    for (const z of [doorA, doorB]) s.box([0.1, 2.3, 0.07], [-6.86, 1.15, z], steel);
    s.box([0.1, 0.07, doorB - doorA], [-6.86, 2.3, (doorA + doorB) / 2], steel);
    const dusk = new THREE.Color().setHSL(mix(0.6, 0.07, mood.daylight), 0.55, dead ? 0.55 : mix(0.42, 0.7, 1 - Math.abs(mood.daylight - 0.5) * 2));
    s.mesh(new THREE.PlaneGeometry(doorB - doorA, 2.3), new THREE.MeshBasicMaterial({ color: dusk }), [-6.93, 1.15, (doorA + doorB) / 2]).rotation.y = Math.PI / 2;
    s.box([0.03, 2.3, 0.04], [-6.88, 1.15, (doorA + doorB) / 2], steel);
    s.rod([-6.82, 1.05, doorA + 0.1], [-6.82, 1.05, doorB - 0.1], 0.02, steel);
    s.box([1.1, 0.02, 1.3], [-6.1, 0.01, (doorA + doorB) / 2], s.material('#2a2a2c', { roughness: 1 }));
    const doorSign = a.state === 'abandoned' ? 'FOR LEASE' : a.state === 'closing' ? 'CLOSING' : 'OPEN';
    const openLit = !dead && a.state !== 'closing';
    const openTexture = paint(256, 96, (ctx) => {
      ctx.fillStyle = openLit ? '#16161c' : '#f4f0dc'; ctx.fillRect(0, 0, 256, 96);
      ctx.fillStyle = openLit ? '#ff3a4a' : '#b3261e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.min(64, 380 / doorSign.length)}px sans-serif`; ctx.fillText(doorSign, 128, 50, 236);
      if (openLit) { ctx.strokeStyle = '#3a8aff'; ctx.lineWidth = 6; ctx.strokeRect(8, 8, 240, 80); }
    });
    const openFace = new THREE.MeshStandardMaterial({ map: openTexture, emissive: '#ffffff', emissiveMap: openTexture, emissiveIntensity: openLit ? 1.1 : 0, roughness: 0.6 });
    const openSign = s.mesh(new THREE.PlaneGeometry(0.95, 0.36), openFace, [-6.76, dead ? 1.5 : 2.55, (doorA + doorB) / 2]);
    openSign.rotation.y = Math.PI / 2;
    if (dead) openSign.rotation.x = 0.12;

    // Covers.
    const atlas = paint(512, 224, (ctx) => {
      ctx.fillStyle = '#f4f4f4'; ctx.fillRect(0, 0, 512, 224);
      const ink = 'rgba(0,0,0,0.6)', light = 'rgba(255,255,255,0.85)';
      ctx.fillStyle = ink; ctx.fillRect(8, 10, 112, 40); ctx.beginPath(); ctx.arc(64, 118, 40, 0, 7); ctx.fill(); ctx.fillRect(14, 186, 100, 8);
      ctx.fillStyle = light; ctx.fillRect(18, 22, 92, 14); ctx.beginPath(); ctx.arc(76, 108, 26, 0, 7); ctx.fill();
      ctx.fillStyle = ink; ctx.fillRect(128, 60, 128, 164);
      ctx.fillStyle = light; ctx.fillRect(138, 12, 108, 34);
      ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.arc(192, 112, 30, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(140, 224); ctx.quadraticCurveTo(192, 110, 244, 224); ctx.fill();
      ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(256, 0); ctx.lineTo(384, 0); ctx.lineTo(256, 150); ctx.fill(); ctx.fillRect(264, 164, 112, 44);
      ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(384, 40); ctx.lineTo(384, 150); ctx.lineTo(290, 150); ctx.fill(); ctx.fillRect(274, 176, 92, 10);
      ctx.fillStyle = ink; ctx.fillRect(384, 0, 128, 224);
      ctx.fillStyle = light; for (let i = 0; i < 4; i++) ctx.fillRect(396, 20 + i * 36, 104 - (i % 2) * 28, 24);
    });
    const coverMaterial = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.6 });
    const BOX = { vhs: [0.17, 0.3, 0.045], slim: [0.2, 0.28, 0.025], disc: [0.36, 0.36, 0.02] }[kind.format] as [number, number, number];
    const covers: { matrix: THREE.Matrix4; colour: THREE.Color }[][] = [[], [], [], []];
    const dust = new THREE.Color('#8e8676');
    const stockBase = { busy: 0.86, quiet: 0.97, closing: 0.42, abandoned: 0.1 }[a.state] * mix(0.85, 1.08, mood.density);
    const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

    const signBoard = (text: string, w: number, h: number, paper: string, ink: string, glow = 0) => {
      const texture = paint(512, Math.max(48, Math.round(512 * h / w)), (ctx) => {
        const H = Math.max(48, Math.round(512 * h / w));
        ctx.fillStyle = paper; ctx.fillRect(0, 0, 512, H);
        ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.strokeRect(6, 6, 500, H - 12);
        ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `${a.kind === 'indie' || a.kind === 'nollywood' ? 'italic ' : ''}900 ${Math.min(H * 0.62, 760 / text.length)}px ${a.kind === 'anime' ? 'monospace' : 'sans-serif'}`;
        ctx.fillText(text, 256, H / 2 + 2, 480);
      });
      return s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: dead ? 0 : glow }));
    };

    /** A run of face-out shelving in a local frame: x along its length, facing +z, back at z = 0. */
    const rackM = s.material(kind.rack, { roughness: 0.7 });
    const lipM = s.material(kind.lip, { roughness: 0.6 });
    const rows = kind.format === 'disc' ? 4 : 5, pitch = kind.format === 'disc' ? 0.47 : 0.4;
    const rack = (frame: THREE.Group, length: number, levels: number, labels: readonly string[], back = true) => {
      const H = 0.26 + levels * pitch;
      frame.updateMatrix();
      into(frame, () => {
        if (back) s.box([length, H, 0.08], [0, H / 2, 0.04], rackM);
        s.box([length, 0.2, 0.34], [0, 0.1, 0.17], rackM);
        for (let r = 0; r < levels; r++) {
          const y = 0.26 + r * pitch, out = 0.2 + (levels - 1 - r) * 0.03;
          s.box([length, 0.03, out], [0, y - 0.015, out / 2], rackM);
          s.box([length, 0.05, 0.012], [0, y - 0.005, out], lipM);
        }
        const sections = labels.length;
        for (let k = 0; k <= sections; k++) s.box([0.05, H + 0.04, 0.1], [-length / 2 + (k / sections) * length, (H + 0.04) / 2, 0.05], rackM);
        labels.forEach((text, k) => {
          const w = Math.min(length / sections - 0.25, 2.0), x = -length / 2 + ((k + 0.5) / sections) * length;
          s.box([w + 0.06, 0.36, 0.05], [x, H + 0.24, 0.05], lipM);
          const face = signBoard(text, w, 0.3, kind.signPaper, kind.signInk, 0.25);
          face.position.set(x, H + 0.24, 0.078);
          face.rotation.z = a.kind === 'indie' || dead ? (random() - 0.5) * 0.05 : 0;
        });
      });
      const n = Math.floor((length - 0.1) / (BOX[0] + 0.03));
      labels.forEach((text, k) => {
        const palette = paletteFor(text);
        const fresh = /NEW/.test(text);
        const from = Math.floor((k / labels.length) * n), to = Math.floor(((k + 1) / labels.length) * n);
        for (let r = 0; r < levels; r++) {
          const stock = stockBase * (fresh && a.state === 'busy' ? 0.55 : 1) * mix(0.75, 1.15, random());
          let run = 0, tone = new THREE.Color(), variant = 0;
          for (let i = from; i < to; i++) {
            if (run <= 0) { run = fresh ? 2 + Math.floor(random() * 4) : 1; tone = new THREE.Color(palette[Math.floor(random() * palette.length)]); tone.offsetHSL(0, 0, (random() - 0.5) * 0.1); variant = Math.floor(random() * 4); }
            run--;
            if (random() > stock) continue;
            const x = -((n - 1) * (BOX[0] + 0.03)) / 2 + i * (BOX[0] + 0.03);
            const out = 0.2 + (levels - 1 - r) * 0.03;
            const lean = -(0.14 + random() * 0.05);
            const local = new THREE.Matrix4().compose(
              new THREE.Vector3(x, 0.26 + r * pitch + BOX[1] / 2, out - 0.06),
              new THREE.Quaternion().setFromEuler(new THREE.Euler(lean, 0, (random() - 0.5) * (dead ? 0.5 : 0.06), 'YXZ')), new THREE.Vector3(1, 1, 1));
            covers[variant].push({ matrix: frame.matrix.clone().multiply(local), colour: tone.clone().lerp(dust, mood.wear * 0.3 + (dead ? 0.35 : 0)) });
          }
        }
      });
      return H;
    };

    const names = SIGNS[a.signs];
    const backFrame = new THREE.Group();
    backFrame.position.set(-1.0, 0, -5.28);
    rack(backFrame, 11.4, rows, names.slice(0, 5));
    const leftFrame = new THREE.Group();
    leftFrame.position.set(-6.78, 0, -2.2);
    leftFrame.rotation.y = Math.PI / 2;
    rack(leftFrame, 5.9, rows, [names[5], names[6], names[1]]);
    // One low aisle shelf, double sided, with its sign on top.
    const aisleLabel = a.state === 'closing' ? 'ALL TAPES $2' : names[0];
    for (const side of [0, 1]) {
      const frame = new THREE.Group();
      frame.position.set(3.2, 0, -2.6 + (side ? -0.045 : 0.045));
      frame.rotation.y = side ? Math.PI : 0;
      rack(frame, 4.2, rows - 1, [side ? names[2] : aisleLabel, side ? names[3] : names[4]]);
    }
    // Garlands or lights along the back rack for the import shops and the independent.
    if (a.kind === 'bollywood' || a.kind === 'indie') {
      const tone = a.kind === 'bollywood' ? ['#f6a01a', '#ffd21a', '#f06a1a'] : ['#ff5a5a', '#ffd84a', '#5ad06a', '#5a9aff'];
      const H = 0.26 + rows * pitch + 0.5;
      s.scatter(new THREE.SphereGeometry(a.kind === 'bollywood' ? 0.06 : 0.04, 7, 5), s.material('#ffffff', { roughness: 0.6, emissive: '#ffffff', emissiveIntensity: a.kind === 'indie' && !dead ? 0.6 : 0.05 }),
        Array.from({ length: 76 }, (_u, i) => ({ at: [-6.6 + i * 0.15, H - Math.abs(Math.sin(i * 0.33)) * 0.22, -5.2] as [number, number, number], size: 1, color: tone[i % tone.length] })));
    }

    // The big wall sign and the sale banners.
    const bannerText = { name: kind.name, kind: 'BE KIND · PLEASE REWIND', deal: '2 FOR 1 TUESDAYS', late: 'LATE FEES $2 PER DAY', members: 'MEMBERSHIP IS FREE' }[a.banner];
    const big = signBoard(bannerText, 5.6, 0.5, kind.signInk, kind.signPaper, 0.35);
    big.position.set(-1.2, 3.1, -5.27);
    if (a.state === 'closing') {
      const lines = ['STORE CLOSING', 'EVERYTHING MUST GO', 'ALL SALES FINAL'];
      lines.forEach((line, i) => {
        const sale = signBoard(line, 3.0, 0.62, '#ffe21a', '#c4161c', 0.2);
        sale.position.set([-4.6, 3.6, 1.0][i], [2.0, 3.0, 1.3][i], [-4.6, -5.26, -2.2][i]);
        if (i === 0) { sale.rotation.y = Math.PI / 2; sale.position.set(-6.4, 2.2, -2.2); }
        if (i === 2) { sale.position.set(3.2, 1.0, -2.24); sale.scale.setScalar(0.6); }
        sale.rotation.z = (random() - 0.5) * 0.08;
      });
    }
    // Posters.
    const posters = paint(512, 160, (ctx) => {
      const sets = a.kind === 'anime' ? ['#ff7ac0', '#6ef0e0', '#16161c', '#f4f1e6'] : a.kind === 'bollywood' || a.kind === 'nollywood' ? ['#f6b21a', '#c8327a', '#2f9a55', '#1a2f7a'] : ['#c4161c', '#1a2f7a', '#f2c21a', '#141414'];
      for (let i = 0; i < 4; i++) {
        const x = i * 128;
        ctx.fillStyle = sets[i]; ctx.fillRect(x, 0, 128, 160);
        ctx.fillStyle = sets[(i + 2) % 4]; ctx.beginPath(); ctx.arc(x + 64, 66, 34 + random() * 10, 0, 7); ctx.fill();
        ctx.fillStyle = sets[(i + 1) % 4]; ctx.beginPath(); ctx.moveTo(x + 24, 118); ctx.quadraticCurveTo(x + 64, 40, x + 104, 118); ctx.fill();
        ctx.fillStyle = '#f4f1e6'; ctx.fillRect(x + 12, 126, 104, 18); ctx.fillStyle = sets[i]; ctx.fillRect(x + 20, 132, 70, 6);
        ctx.strokeStyle = '#f4f1e6'; ctx.lineWidth = 6; ctx.strokeRect(x + 3, 3, 122, 154);
      }
    });
    const posterM = new THREE.MeshStandardMaterial({ map: posters, roughness: 0.7 });
    const poster = (at: [number, number, number], onLeft: boolean, tall = false) => {
      const geometry = new THREE.PlaneGeometry(tall ? 0.5 : 0.72, tall ? 1.3 : 0.9);
      const uv = geometry.getAttribute('uv'), k = Math.floor(random() * 4);
      for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) + k) / 4);
      const mesh = s.mesh(geometry, posterM, at);
      if (onLeft) mesh.rotation.y = Math.PI / 2;
      mesh.rotation.z = (random() - 0.5) * (a.kind === 'indie' || dead ? 0.12 : 0.02);
      mesh.castShadow = false;
    };
    const posterCount = Math.round((a.kind === 'indie' ? 5 : 3) * mix(0.5, 1.3, mood.density));
    for (let i = 0; i < posterCount; i++) poster([3.0 + i * 0.85, 2.92 + (random() - 0.5) * 0.1, -5.27], false, a.kind === 'anime');
    for (let i = 0; i < Math.min(3, posterCount); i++) poster([-6.77, 2.75, 3.1 + i * 0.85], true);

    // Counter by the door, with the real tapes shelved behind it.
    const counterM = s.material(kind.counter, { roughness: 0.6 });
    const cx = -4.5, cz0 = 2.95, cz1 = 5.25, cl = cz1 - cz0;
    s.box([0.7, 1.0, cl], [cx, 0.5, (cz0 + cz1) / 2], counterM);
    s.box([0.74, 0.12, cl + 0.02], [cx, 0.06, (cz0 + cz1) / 2], dark);
    s.box([0.9, 0.06, cl + 0.12], [cx, 1.06, (cz0 + cz1) / 2], s.material('#d8d4c8', { roughness: 0.4 }));
    s.box([0.012, 0.16, cl], [cx + 0.357, 0.82, (cz0 + cz1) / 2], band);
    s.box([1.9, 1.0, 0.12], [cx - 0.95 - 0.35, 0.5, cz0 + 0.06], counterM);
    s.box([1.9, 0.06, 0.2], [cx - 0.95 - 0.35, 1.06, cz0 + 0.06], s.material('#d8d4c8'));
    const slotSign = signBoard('RETURNS', 0.9, 0.2, '#f4f0dc', '#141414');
    slotSign.position.set(cx + 0.352, 0.5, 4.75); slotSign.rotation.y = Math.PI / 2;
    s.box([0.02, 0.07, 0.5], [cx + 0.352, 0.32, 4.75], dark);
    // Till.
    s.box([0.42, 0.14, 0.44], [cx - 0.05, 1.16, 3.25], s.material('#cfc8b4', { roughness: 0.5 }));
    const keys = s.box([0.3, 0.05, 0.3], [cx + 0.02, 1.25, 3.25], s.material('#3a3a40'));
    keys.rotation.z = -0.3;
    s.box([0.06, 0.16, 0.26], [cx - 0.2, 1.33, 3.25], s.material('#2a2a30'));
    s.box([0.01, 0.07, 0.2], [cx - 0.165, 1.35, 3.25], s.material('#5aff8a', { emissive: '#3aff7a', emissiveIntensity: dead ? 0 : 1 }));
    // Stock wall behind the clerk: plain cases spine-out.
    const spines: { at: [number, number, number]; size: number; color: string }[] = [];
    const caseTones = ['#f1efe6', '#1c1c20', '#f1efe6', '#3a5a9a', '#d8d2c0', '#1c1c20'];
    for (let r = 0; r < 5; r++) {
      s.box([0.34, 0.03, cz1 - cz0 - 0.2], [-6.6, 0.3 + r * 0.42, (cz0 + cz1) / 2 + 0.1], rackM);
      for (let i = 0; i < 44; i++) if (random() < (dead ? 0.15 : a.state === 'closing' ? 0.5 : mix(0.75, 0.97, mood.density))) spines.push({ at: [-6.6, 0.3 + r * 0.42 + 0.17, cz0 + 0.3 + i * 0.047], size: 1, color: caseTones[Math.floor(random() * caseTones.length)] });
    }
    s.box([0.06, 2.3, 0.06], [-6.5, 1.15, cz0 + 0.18], rackM);
    if (spines.length) s.scatter(new THREE.BoxGeometry(0.28, 0.3, 0.04), s.material('#ffffff', { roughness: 0.6 }), spines);
    // What the counter is busy with.
    const screens: THREE.MeshStandardMaterial[] = [];
    if (a.counter === 'tv') {
      s.box([0.5, 0.04, 0.5], [-6.5, 2.72, 4.2], dark);
      s.box([0.5, 0.5, 0.62], [-6.48, 3.0, 4.2], s.material('#2a2a30', { roughness: 0.5 }));
      const screen = s.material('#9ab8ff', { emissive: '#7aa8ff', emissiveIntensity: dead ? 0 : 1.1, roughness: 0.2 });
      s.box([0.02, 0.38, 0.5], [-6.225, 3.0, 4.2], screen);
      if (!dead) screens.push(screen);
    }
    if (a.counter === 'computer') {
      const beige = s.material('#d6ceb8', { roughness: 0.6 });
      const pc = new THREE.Group();
      pc.position.set(cx - 0.05, 1.09, 4.75); pc.rotation.y = 0.9;
      into(pc, () => {
        s.box([0.42, 0.1, 0.4], [0, 0.05, 0], beige); s.box([0.4, 0.34, 0.36], [0, 0.28, 0], beige);
        const screen = s.material('#0c2a14', { emissive: '#3aff7a', emissiveIntensity: dead ? 0 : 0.9 });
        s.box([0.3, 0.24, 0.01], [0, 0.29, 0.182], screen);
        if (!dead) screens.push(screen);
        s.box([0.42, 0.03, 0.16], [0, 0.015, 0.34], beige);
      });
    }
    if (a.counter === 'candy') {
      const candy: { at: [number, number, number]; size: number; color: string }[] = [];
      const tones = ['#e8261c', '#ffd21a', '#2f8fe0', '#58b84a', '#f06aa8', '#f08a1c', '#7a4a2a'];
      for (let tier = 0; tier < 3; tier++) {
        s.box([0.3 - tier * 0.06, 0.02, 0.9], [cx + 0.1 - tier * 0.08, 1.11 + tier * 0.16, 4.7], steel);
        for (let i = 0; i < 9; i++) if (random() < (dead ? 0.1 : 0.9)) candy.push({ at: [cx + 0.14 - tier * 0.08, 1.18 + tier * 0.16, 4.3 + i * 0.1], size: 1, color: tones[Math.floor(random() * tones.length)] });
      }
      if (candy.length) s.scatter(new THREE.BoxGeometry(0.16, 0.1, 0.07), s.material('#ffffff', { roughness: 0.4 }), candy);
    }
    if (a.counter === 'returns') {
      const pile: { at: [number, number, number]; size: number; color: string }[] = [];
      const count = dead ? 4 : Math.round(mix(14, 44, mood.density));
      for (let i = 0; i < count; i++) { const col = i % 4, level = Math.floor(i / 4); pile.push({ at: [cx + (col % 2 ? 0.14 : -0.14) + (random() - 0.5) * 0.06, 1.115 + level * 0.05 * (0.8 + random() * 0.2), 4.45 + (col > 1 ? 0.42 : 0) + (random() - 0.5) * 0.08], size: 1, color: random() < 0.75 ? '#1c1c20' : '#e8e4d8' }); }
      s.scatter(new THREE.BoxGeometry(0.34, 0.05, 0.2), s.material('#ffffff', { roughness: 0.5 }), pile);
    }

    // Independent clutter: cartons in the corner.
    if (a.kind === 'indie' || a.state === 'closing' || dead) {
      const card = s.material('#b08a5a', { roughness: 0.95 });
      const count = 3 + Math.floor(random() * 4);
      for (let i = 0; i < count; i++) { const size = 0.45 + random() * 0.25; const carton = s.box([size, size * 0.8, size], [5.9 + (random() - 0.5) * 0.9, size * 0.4 + (i > 3 ? 0.5 : 0), -4.3 + (random() - 0.5) * 1.0], card); carton.rotation.y = random(); }
    }

    // Fluorescent fixtures hanging on wires.
    const tubes: { material: THREE.MeshStandardMaterial; base: number; flicker: number }[] = [];
    const spots: [number, number][] = [[-3.6, -1.6], [1.0, -1.2], [5.0, 1.2], [-2.6, 2.6]];
    spots.forEach(([x, z], i) => {
      const hanging = dead && i === 1;
      const lit = dead ? i === 3 && mood.energy > 0.5 : !(mood.wear > 0.7 && i === 2);
      const tube = s.material('#fffbe6', { emissive: mood.warmth > 0.6 ? '#fff0c0' : '#f0fbff', emissiveIntensity: lit ? 1.0 : 0.0, roughness: 0.4 });
      const fixture = new THREE.Group();
      fixture.position.set(x, 3.75, z);
      into(fixture, () => {
        s.box([2.5, 0.07, 0.34], [0, 0.03, 0], s.material('#e6e6e0', { roughness: 0.6 }));
        for (const dz of [-0.09, 0.09]) s.box([2.36, 0.05, 0.07], [0, -0.03, dz], tube);
        for (const dx of [-1, 1]) if (!(hanging && dx === 1)) s.rod([dx, 0.06, 0], [dx, 0.75, 0], 0.008, steel);
      });
      if (hanging) { fixture.rotation.z = -0.5; fixture.position.y = 3.2; }
      tubes.push({ material: tube, base: lit ? 1 : 0, flicker: dead ? 1 : mood.wear > 0.5 && i === 0 ? 0.6 : 0 });
    });

    // What is on the floor.
    const litter = dead ? 34 : a.state === 'closing' ? 9 : Math.round(mood.wear * 4);
    for (let i = 0; i < litter; i++) {
      const x = -5.8 + random() * 11.6, z = -4.2 + random() * 9.2;
      covers[Math.floor(random() * 4)].push({ colour: new THREE.Color(MIXED[Math.floor(random() * MIXED.length)]).lerp(dust, 0.45),
        matrix: new THREE.Matrix4().compose(new THREE.Vector3(x, BOX[2] / 2 + 0.004, z), flat.clone().premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, random() * 6.3, 0))), new THREE.Vector3(1, 1, 1)) });
    }
    if (dead) {
      const tileM = s.material('#d8d6cc', { roughness: 0.95 });
      for (let i = 0; i < 7; i++) { const tile = s.box([0.6, 0.03, 0.6 * (random() < 0.4 ? 0.5 : 1)], [-5 + random() * 10.5, 0.02 + random() * 0.04, -3.6 + random() * 8], tileM); tile.rotation.set((random() - 0.5) * 0.2, random() * 3, 0); }
    }
    covers.forEach((list, variant) => {
      if (!list.length) return;
      const geometry = new THREE.BoxGeometry(...BOX);
      const uv = geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) + variant) / 4);
      const mesh = new THREE.InstancedMesh(geometry, coverMaterial, list.length);
      list.forEach((item, i) => { mesh.setMatrixAt(i, item.matrix); mesh.setColorAt(i, item.colour); });
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
    });

    const buzz = mix(0.2, 1, mood.energy);
    world.update = (_dt, time) => {
      tubes.forEach((tube, i) => {
        if (!tube.flicker || !tube.base) return;
        const on = Math.sin(time * (23 + i * 7)) * Math.sin(time * (3.1 + i)) > -0.2 * buzz - (1 - tube.flicker) * 0.6;
        tube.material.emissiveIntensity = on ? 1 : 0.15;
      });
      for (const screen of screens) screen.emissiveIntensity = 0.75 + 0.4 * Math.sin(time * 7.3) * Math.sin(time * 2.1 + 1);
      if (openLit) openFace.emissiveIntensity = 0.9 + 0.25 * Math.sin(time * 2.4 * buzz);
    };
    return world;
  },
});
