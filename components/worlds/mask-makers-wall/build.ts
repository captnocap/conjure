import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, mix, noul, visibleBounds } from '@conjure/kit';
import { g, horn, human, painted, shell, shellPoint, type ShellSpec } from './face';

type Kind = 'oval' | 'demon' | 'half' | 'beak' | 'comedy' | 'tragedy' | 'animal' | 'long';
const KINDS: Kind[] = ['oval', 'demon', 'half', 'beak', 'comedy', 'tragedy', 'animal', 'long'];
const TRADITIONS = {
  venetian: { text: 'Venetian carnival: white volto faces, gilded half-masks and long-beaked doctors in white, gold, black and deep red.', kinds: ['half', 'half', 'beak', 'oval', 'oval', 'comedy', 'tragedy', 'animal'], palette: ['#f4efe2', '#f4efe2', '#d8aa3a', '#1f1c20', '#8f1f2b', '#1f6f78', '#e7dcc0'] },
  japanese: { text: 'Japanese: pale Noh faces, red and blue horned demons and white fox masks with vermilion marks.', kinds: ['oval', 'oval', 'demon', 'demon', 'animal', 'animal', 'comedy'], palette: ['#f3eee0', '#f3eee0', '#c7301f', '#e8dcbc', '#2c4f8f', '#d9b98a', '#f3eee0'] },
  theatre: { text: 'Classical theatre: rows of laughing and weeping masks in terracotta, bronze, plaster and gold.', kinds: ['comedy', 'tragedy', 'comedy', 'tragedy', 'oval', 'long'], palette: ['#b9683f', '#8a6a3a', '#ebe5d8', '#d6a738', '#a0522d', '#cfc6b2'] },
  world: { text: 'A collector\'s mix from everywhere: carved wooden long faces, animal spirits, demons and carnival masks in earth, ochre, indigo and red.', kinds: ['long', 'long', 'animal', 'demon', 'oval', 'half', 'beak', 'comedy', 'tragedy'], palette: ['#7a5232', '#a9743f', '#c9a15a', '#ece4d0', '#b3261e', '#27407a', '#2f6b47', '#1f1c1e'] },
} as const;

export default defineWorld({
  questions: {
    tradition: choice('Which tradition dominates the wall of masks?', Object.fromEntries(Object.entries(TRADITIONS).map(([k, v]) => [k, v.text])) as Record<keyof typeof TRADITIONS, string>),
    arrangement: choice('How are the masks hung?', {
      grid: 'In orderly rows, one to a peg, like a catalogue.',
      salon: 'Crowded edge to edge at every size and angle.',
      shelves: 'Stood along plank shelves from bench to ceiling.',
      sparse: 'Thinly: many pegs bare, with pale outlines where masks used to hang.',
    }),
    wall: choice('What is the wall behind them?', {
      plaster: 'Warm ochre plaster, patched and stained.',
      timber: 'Honey-brown timber boards.',
      paper: 'Pale paper panels between cedar posts, as in a Kyoto machiya.',
      brick: 'Whitewashed brick.',
    }),
    window: choice('What is the north window like?', {
      mullioned: 'A tall many-paned workshop window.',
      oculus: 'A round oculus high in the wall.',
      shutters: 'Slatted shutters, half closed, striping the light.',
      shoji: 'A paper screen glowing softly behind a wooden lattice.',
    }),
    state: choice('What state is the workshop in?', {
      rush: 'A pre-festival rush: open pots of bright paint all over the bench, ribbons and feathers, wet masks everywhere.',
      quiet: 'A quiet working morning: a few pots in a row, brushes in a jar, everything in its place.',
      outlived: 'The masks have outlived their maker: cobwebs, a dust sheet over the stores, masks fallen to the floor.',
    }),
    overhead: choice('What hangs overhead?', {
      nothing: 'Nothing.',
      blanks: 'A drying line of white unpainted blanks.',
      lanterns: 'Paper lanterns.',
      bunting: 'Carnival bunting and long ribbons.',
    }),
    glint: noul('Do the empty eye holes seem to glint, as if the wall is watching?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const s = new Sculpture(context);
    const root = s.root;
    const dead = a.state === 'outlived';
    const gloom = Math.min(1, (dead ? 0.55 : 0) + (1 - mood.cheer) * 0.45);
    const WX = 2.5, WH = 4.4, WZ = -1.3, FZ = 1.7;

    // Light: a raking key from the window wall on the left.
    const background = new THREE.Color('#e3ddd0').lerp(new THREE.Color('#a9a498'), gloom * 0.7);
    root.add(new THREE.HemisphereLight('#f4f3ff', '#8a7a66', mix(1.5, 0.6, gloom)));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.6, 0.09, mood.warmth), 0.4, 0.86), mix(3, 1.6, gloom));
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.03; key.shadow.bias = -0.0004;
    const sunZ = mix(1.5, 5, Math.abs(mood.daylight - 0.5) * 2), sunY = mix(4.5, 2.2, Math.abs(mood.daylight - 0.5) * 2);
    key.position.set(-7, sunY + 2, sunZ);
    key.target.position.set(0.3, 1.8, -1);
    const sc = key.shadow.camera; sc.left = -4.5; sc.right = 4.5; sc.bottom = -4; sc.top = 4; sc.near = 0.5; sc.far = 22; sc.updateProjectionMatrix();
    const fill = new THREE.DirectionalLight('#ffe9cf', mix(0.7, 0.25, gloom));
    fill.position.set(4, 3, 7);
    root.add(key, key.target, fill);

    // Room shell.
    const wallTone = { plaster: '#dcc79c', timber: '#b8905e', paper: '#ece5d2', brick: '#e2dcd0' }[a.wall];
    const wallTex = painted(1024, 1024, (ctx, _X, _Y, W, H) => {
      ctx.fillStyle = wallTone; ctx.fillRect(0, 0, W, H);
      if (a.wall === 'timber') for (let i = 0; i < 16; i++) { ctx.fillStyle = `rgba(${60 + random() * 40},${40 + random() * 20},20,${0.05 + random() * 0.14})`; ctx.fillRect(i * W / 16, 0, W / 16, H); ctx.fillStyle = 'rgba(40,25,10,0.55)'; ctx.fillRect(i * W / 16, 0, 3, H); }
      if (a.wall === 'brick') { ctx.strokeStyle = 'rgba(120,105,90,0.5)'; ctx.lineWidth = 3; for (let j = 0; j < 40; j++) { ctx.beginPath(); ctx.moveTo(0, j * H / 40); ctx.lineTo(W, j * H / 40); ctx.stroke(); for (let i = 0; i < 14; i++) { const x = (i + (j % 2) * 0.5) * W / 13; ctx.beginPath(); ctx.moveTo(x, j * H / 40); ctx.lineTo(x, (j + 1) * H / 40); ctx.stroke(); } } for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(170,90,60,${random() * 0.25})`; ctx.fillRect(Math.floor(random() * 13) * W / 13, Math.floor(random() * 40) * H / 40, W / 13, H / 40); } }
      if (a.wall === 'paper') { ctx.fillStyle = '#7a5636'; for (let i = 0; i <= 5; i++) ctx.fillRect(i * W / 5 - 9, 0, 18, H); for (let j = 0; j <= 4; j++) ctx.fillRect(0, j * H / 4 - 6, W, 12); }
      for (let i = 0; i < 30 + mood.wear * 60; i++) { ctx.fillStyle = `rgba(${90 + random() * 60},${70 + random() * 40},${40 + random() * 30},${0.03 + random() * (0.05 + mood.wear * 0.1)})`; ctx.beginPath(); ctx.ellipse(random() * W, random() * H, 30 + random() * 130, 20 + random() * 90, random() * 3, 0, Math.PI * 2); ctx.fill(); }
    });
    const shade = new THREE.Color('#ffffff').lerp(new THREE.Color('#7f7a72'), gloom * 0.7);
    const wallSkin = new THREE.MeshStandardMaterial({ map: wallTex, color: shade, roughness: 0.95 });
    const back = s.mesh(new THREE.PlaneGeometry(WX * 2, WH), wallSkin, [0, WH / 2, WZ]);
    back.castShadow = false;
    const side = s.mesh(new THREE.PlaneGeometry(FZ - WZ, WH), wallSkin, [-WX, WH / 2, (FZ + WZ) / 2]);
    side.rotation.y = Math.PI / 2; side.castShadow = false;
    const floorTex = painted(512, 512, (ctx, _X, _Y, W, H) => {
      ctx.fillStyle = '#a58863'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 12; i++) { ctx.fillStyle = `rgba(60,40,20,${0.04 + random() * 0.14})`; ctx.fillRect(0, i * H / 12, W, H / 12); ctx.fillStyle = 'rgba(50,32,16,0.6)'; ctx.fillRect(0, i * H / 12, W, 2.5); }
      const splash = ['#f3efe6', '#c0242c', '#d8aa3a', '#1f6f78', '#27407a', '#f3efe6'];
      for (let i = 0; i < 40 + mood.wear * 120 + (a.state === 'rush' ? 80 : 0); i++) { ctx.fillStyle = splash[Math.floor(random() * splash.length)]; ctx.globalAlpha = 0.5 + random() * 0.4; ctx.beginPath(); ctx.arc(random() * W, random() * H * 0.6, 1 + random() * 5, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    });
    const floor = s.box([WX * 2, 0.2, FZ - WZ], [0, -0.1, (FZ + WZ) / 2], new THREE.MeshStandardMaterial({ map: floorTex, color: shade, roughness: 0.85 }));
    const wood = s.material('#7d5c3c', { roughness: 0.7 }), darkWood = s.material('#5a3f28', { roughness: 0.7 }), pale = s.material('#c9ab7c', { roughness: 0.8 });
    s.box([WX * 2, 0.14, 0.04], [0, 0.07, WZ + 0.02], darkWood);
    s.box([WX * 2, 0.12, 0.16], [0, WH - 0.06, WZ + 0.08], darkWood);

    // The north window in the left wall.
    const glow = new THREE.MeshStandardMaterial({ color: '#f6f3e6', emissive: new THREE.Color().setHSL(mix(0.58, 0.11, mood.warmth), 0.5, 0.8), emissiveIntensity: mix(1.1, 0.5, gloom), roughness: 0.9 });
    const wy = 2.25, wz = 0.25, ww = 1.7, wh = 2.3, wx = -WX + 0.02;
    const pane = (geometry: THREE.BufferGeometry, y = wy) => { const m = s.mesh(geometry, glow, [wx, y, wz]); m.rotation.y = Math.PI / 2; m.castShadow = false; return m; };
    const barZ = (z: number, y0: number, y1: number, t = 0.035) => s.box([0.05, y1 - y0, t], [wx + 0.03, (y0 + y1) / 2, z], darkWood);
    const barY = (y: number, z0: number, z1: number, t = 0.035) => s.box([0.05, t, z1 - z0], [wx + 0.03, y, (z0 + z1) / 2], darkWood);
    if (a.window === 'oculus') {
      pane(new THREE.CircleGeometry(0.75, 40), 3.0);
      const ring = s.ring(0.77, 0.05, [wx + 0.03, 3.0, wz], darkWood); ring.rotation.y = Math.PI / 2;
      barZ(wz, 2.25, 3.75); barY(3.0, wz - 0.75, wz + 0.75);
    } else {
      pane(new THREE.PlaneGeometry(ww, wh));
      barZ(wz - ww / 2, wy - wh / 2, wy + wh / 2, 0.07); barZ(wz + ww / 2, wy - wh / 2, wy + wh / 2, 0.07);
      barY(wy - wh / 2, wz - ww / 2, wz + ww / 2, 0.07); barY(wy + wh / 2, wz - ww / 2, wz + ww / 2, 0.07);
      s.box([0.16, 0.05, ww + 0.2], [wx + 0.08, wy - wh / 2 - 0.03, wz], wood);
      if (a.window === 'mullioned') { for (let i = 1; i < 4; i++) barZ(wz - ww / 2 + i * ww / 4, wy - wh / 2, wy + wh / 2); for (let j = 1; j < 5; j++) barY(wy - wh / 2 + j * wh / 5, wz - ww / 2, wz + ww / 2); }
      else if (a.window === 'shoji') { for (let i = 1; i < 6; i++) barZ(wz - ww / 2 + i * ww / 6, wy - wh / 2, wy + wh / 2, 0.02); for (let j = 1; j < 8; j++) barY(wy - wh / 2 + j * wh / 8, wz - ww / 2, wz + ww / 2, 0.02); }
      else for (let j = 0; j < 16; j++) { const slat = s.box([0.03, 0.09, ww - 0.06], [wx + 0.05, wy - wh / 2 + (j + 0.5) * wh / 16, wz], s.material('#6d7f6a', { roughness: 0.7 })); slat.rotation.z = j > 7 ? 0.2 : 0.9; }
    }

    // Workbench along the wall.
    const benchY = 0.9, bx0 = -1.95, bx1 = 1.55, bz0 = WZ + 0.05, bz1 = -0.45;
    s.box([bx1 - bx0, 0.07, bz1 - bz0], [(bx0 + bx1) / 2, benchY - 0.035, (bz0 + bz1) / 2], wood);
    for (const x of [bx0 + 0.08, bx1 - 0.08, (bx0 + bx1) / 2]) for (const z of [bz0 + 0.08, bz1 - 0.08]) s.box([0.09, benchY - 0.07, 0.09], [x, (benchY - 0.07) / 2, z], darkWood);
    s.box([bx1 - bx0 - 0.1, 0.04, bz1 - bz0 - 0.1], [(bx0 + bx1) / 2, 0.28, (bz0 + bz1) / 2], darkWood);
    s.box([bx1 - bx0 - 0.05, 0.16, 0.03], [(bx0 + bx1) / 2, benchY - 0.15, bz1 - 0.03], darkWood);
    for (let i = 0; i < 4; i++) s.ball([0.022, 0.022, 0.022], [bx0 + 0.45 + i * 0.87, benchY - 0.15, bz1], s.material('#b99a4a', { metalness: 0.7, roughness: 0.35 }), 8);
    // Stores under the bench.
    const sack = s.material('#c8b890', { roughness: 1 });
    for (let i = 0; i < 4; i++) { const b = s.ball([0.2 + random() * 0.06, 0.13, 0.17], [bx0 + 0.4 + i * 0.5 + random() * 0.1, 0.42, -0.85], i % 2 ? sack : s.material('#e6e0d0', { roughness: 1 }), 12); b.rotation.y = random(); }
    for (let i = 0; i < 5; i++) { const roll = s.cylinder(0.05, 0.05, 0.6 + random() * 0.3, [bx1 - 0.3 - i * 0.11, 0.6, -0.72 - random() * 0.2], s.material(['#e8dcc0', '#d9d2c0', '#c9b98f'][i % 3], { roughness: 0.9 }), 10); roll.rotation.x = 0.25 + random() * 0.15; }

    // Pots, jars and brushes at the back of the bench, between the standing places.
    const paints = ['#f4f1e8', '#c0242c', '#d8aa3a', '#1f6f78', '#27407a', '#18161a', '#e2733a', '#3c8a4f'];
    const potAt = (x: number, z: number, colour: string, open: boolean, r = 0.06) => {
      s.cylinder(r, r * 0.92, r * 1.7, [x, benchY + r * 0.85, z], s.material(open ? '#b9bcc0' : '#d9d5c8', { metalness: open ? 0.5 : 0, roughness: 0.5 }), 14);
      s.cylinder(r * 0.9, r * 0.9, 0.006, [x, benchY + r * 1.7, z], s.material(colour, { roughness: 0.25 }), 14);
      if (open && random() < 0.5) { s.rod([x - 0.01, benchY + r * 1.5, z], [x + 0.07 + random() * 0.05, benchY + r * 1.7 + 0.16, z - 0.03], 0.007, pale); }
    };
    const jarAt = (x: number, z: number) => {
      s.cylinder(0.055, 0.05, 0.13, [x, benchY + 0.065, z], s.material('#6f8f97', { roughness: 0.25 }), 14);
      for (let k = 0; k < 6; k++) { const dx = (random() - 0.5) * 0.09, dz = (random() - 0.5) * 0.07, len = 0.2 + random() * 0.12; s.rod([x + dx * 0.3, benchY + 0.08, z + dz * 0.3], [x + dx, benchY + 0.08 + len, z + dz], 0.006, pale); s.ball([0.011, 0.02, 0.011], [x + dx, benchY + 0.09 + len, z + dz], s.material(k % 2 ? '#3a2b20' : paints[Math.floor(random() * paints.length)]), 8); }
    };
    const backZ = WZ + 0.2;
    const gaps = [-0.95, -0.82, 0.38, 0.5, 0.62, 1.4];
    if (a.state === 'rush') {
      for (const x of gaps) potAt(x + (random() - 0.5) * 0.04, backZ + random() * 0.08, paints[Math.floor(random() * paints.length)], true);
      for (let i = 0; i < 9; i++) potAt(bx0 + 0.15 + random() * (bx1 - bx0 - 0.3), bz1 - 0.07 - random() * 0.05, paints[1 + Math.floor(random() * 7)], true, 0.035);
      jarAt(-1.85, backZ); jarAt(0.75, backZ);
      const ribbons = ['#c0242c', '#d8aa3a', '#1f6f78', '#7a48c4'];
      for (let i = 0; i < 6; i++) { const x = bx0 + 0.2 + random() * (bx1 - bx0 - 0.4); root.add(horn([[x, benchY + 0.01, bz1 - 0.02], [x + 0.03, benchY - 0.12, bz1 + 0.03], [x + (random() - 0.5) * 0.2, benchY - 0.38 - random() * 0.25, bz1 + 0.02]], () => 0.016, s.material(ribbons[i % 4], { roughness: 0.4, side: THREE.DoubleSide }), { sides: 6, steps: 12, squash: 0.15, side: [1, 0, 0] })); }
    } else if (a.state === 'quiet') {
      for (let i = 0; i < 3; i++) potAt(0.38 + i * 0.13, backZ, '#f4f1e8', false);
      potAt(-0.9, backZ, paints[2], true); jarAt(-0.76, backZ + 0.02); jarAt(1.42, backZ);
      s.cylinder(0.035, 0.028, 0.06, [-1.86, benchY + 0.03, -0.6], s.material('#e9e4d6', { roughness: 0.3 }), 12);
    } else {
      for (let i = 0; i < 3; i++) { const p = s.cylinder(0.06, 0.055, 0.1, [0.4 + i * 0.12, benchY + (i === 1 ? 0.06 : 0.05), backZ], s.material('#a39c8c', { roughness: 0.9 }), 12); if (i === 1) p.rotation.z = Math.PI / 2; }
      jarAt(-0.88, backZ);
      // A dust sheet over the stores and cobwebs in the corners.
      const sheet = s.mesh(new THREE.PlaneGeometry(1.7, 0.95, 26, 12), new THREE.MeshStandardMaterial({ color: '#bcb6a8', roughness: 1, side: THREE.DoubleSide }), [-0.9, 0.44, bz1 + 0.03]);
      const pos = sheet.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, 0.09 * Math.sin(x * 11 + y * 2) * (0.6 - y) + (y < -0.3 ? (y + 0.3) * -0.5 : 0)); }
      sheet.geometry.computeVertexNormals();
      const web = new THREE.MeshBasicMaterial({ color: '#f2f0ea', transparent: true, opacity: 0.55, depthWrite: false });
      for (const [cx, cy, sx] of [[-WX, WH, 1], [WX, WH, -1], [bx1, benchY - 0.07, -1]] as const)
        for (let k = 0; k < 7; k++) { const t = k / 6, len = 0.9 - (k % 2) * 0.25; const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, len, 4), web); const ang = t * Math.PI / 2; strand.position.set(cx + sx * Math.cos(ang) * len / 2, cy - Math.sin(ang) * len / 2, WZ + 0.05); strand.rotation.z = sx * (Math.PI / 2 - ang) * -1 + Math.PI / 2 * 0 + (sx > 0 ? -ang + Math.PI / 2 : ang - Math.PI / 2); root.add(strand); }
    }
    // A pigment shelf just above the bench.
    s.box([1.5, 0.03, 0.12], [1.0, 1.24, WZ + 0.07], darkWood);
    for (let i = 0; i < 11; i++) s.cylinder(0.035, 0.035, 0.09 + (i % 3) * 0.02, [0.36 + i * 0.125, 1.3 + (i % 3) * 0.01, WZ + 0.08], s.material(dead ? '#9b9484' : paints[i % paints.length], { roughness: 0.4 }), 10);

    // Side trestle, a crate to stand things on, a stool and a ladder.
    const tx = 1.72, tz = 0.4, trestleY = 0.72;
    s.box([1.15, 0.05, 0.6], [tx, trestleY - 0.025, tz], pale);
    for (const dx of [-0.42, 0.42]) { for (const dz of [-0.25, 0.25]) s.rod([tx + dx, trestleY - 0.05, tz], [tx + dx, 0, tz + dz], 0.025, wood); s.rod([tx + dx, 0.3, tz - 0.14], [tx + dx, 0.3, tz + 0.14], 0.018, wood); }
    const crateX = -1.25, crateZ = 0.75, crateY = 0.42;
    s.box([0.72, crateY, 0.56], [crateX, crateY / 2, crateZ], pale);
    for (const y of [0.1, 0.3]) s.box([0.74, 0.03, 0.58], [crateX, y, crateZ], wood);
    s.cylinder(0.17, 0.17, 0.04, [0.6, 0.52, 0.15], wood, 16);
    for (let k = 0; k < 3; k++) { const ang = k * 2.1 + 0.4; s.rod([0.6 + Math.cos(ang) * 0.1, 0.5, 0.15 + Math.sin(ang) * 0.1], [0.6 + Math.cos(ang) * 0.19, 0, 0.15 + Math.sin(ang) * 0.19], 0.02, darkWood); }
    for (const dx of [-0.2, 0.2]) s.rod([2.15 + dx, 0, -0.45], [2.15 + dx, 3.5, WZ + 0.06], 0.025, pale);
    for (let k = 1; k < 11; k++) { const t = k / 11.5; s.rod([1.95, t * 3.5, -0.45 + (WZ + 0.06 + 0.45) * t], [2.35, t * 3.5, -0.45 + (WZ + 0.06 + 0.45) * t], 0.018, pale); }
    s.cylinder(0.16, 0.13, 0.26, [-2.1, 0.13, -0.6], s.material('#8f9aa0', { metalness: 0.5, roughness: 0.5 }), 16);
    s.cylinder(0.15, 0.15, 0.01, [-2.1, 0.24, -0.6], s.material('#efeadc', { roughness: 0.3 }), 16);

    // The masks themselves: a few kinds, instanced, tinted per mask.
    const base: ShellSpec = { w: 0.23, h: 0.3, d: 0.085, taper: 0.24, segU: 14, segV: 18 };
    const kindGeometry = (kind: Kind): THREE.BufferGeometry => {
      const specs: Record<Kind, ShellSpec> = {
        oval: { ...base, relief: human({ brow: 0.6, cheek: 1.1 }) },
        demon: { ...base, w: 0.25, taper: 0.34, relief: human({ brow: 2.2, cheek: 1.6, nose: 1.3, socket: 1.4 }) },
        half: { ...base, relief: human({ cheek: 0.8 }), hole: (u, v) => v < -0.12 + 0.12 * Math.cos(u * Math.PI) - 0.2 * g(u, 0, 0.2) },
        beak: { ...base, relief: (u, v) => 0.25 * g(u, 0, 0.3) * g(v, -0.1, 0.4) },
        comedy: { ...base, relief: human({ cheek: 2, smile: 1.6, lips: 0 }) },
        tragedy: { ...base, relief: human({ brow: 1.7, cheek: 0.6, lips: 0 }) },
        animal: { ...base, taper: 0.45, relief: (u, v) => 0.5 * g(u, 0, 0.28) * g(v, -0.3, 0.3) + 0.1 * g(v, 0.3, 0.1) * g(Math.abs(u), 0.42, 0.3) },
        long: { ...base, w: 0.19, h: 0.44, taper: 0.3, round: 2.8, relief: (u, v) => 0.3 * g(u, 0, 0.1) * (v < 0.3 && v > -0.3 ? 1 : 0) + 0.18 * g(v, 0.36, 0.08) * g(Math.abs(u), 0.4, 0.4) },
      };
      const spec = specs[kind];
      const parts = [shell(spec, wood).geometry];
      const at = (u: number, v: number) => shellPoint(spec, u, v);
      const extra = (points: [number, number, number][], r: number, squash = 1) => parts.push(horn(points, (t) => r * (1 - t) ** 0.7 + 0.002, wood, { sides: 6, steps: 6, squash }).geometry);
      if (kind === 'demon') for (const sgn of [-1, 1]) { const p = at(sgn * 0.45, 0.6); extra([[p.x, p.y, p.z - 0.01], [p.x + sgn * 0.03, p.y + 0.08, p.z + 0.015], [p.x + sgn * 0.03, p.y + 0.17, p.z - 0.01]], 0.02); }
      if (kind === 'beak') { const p = at(0, -0.05); extra([[0, p.y, p.z - 0.03], [0, p.y - 0.02, p.z + 0.1], [0, p.y - 0.09, p.z + 0.2]], 0.045); }
      if (kind === 'animal') for (const sgn of [-1, 1]) { const p = at(sgn * 0.5, 0.74); extra([[p.x, p.y - 0.02, p.z - 0.02], [p.x + sgn * 0.02, p.y + 0.05, p.z], [p.x + sgn * 0.03, p.y + 0.11, p.z - 0.01]], 0.035, 0.45); }
      const merged = mergeGeometries(parts.map((part) => part.toNonIndexed()));
      for (const part of parts) part.dispose();
      merged.computeVertexNormals();
      return merged;
    };
    const kindTexture = (kind: Kind) => painted(128, 160, (ctx, X, Y, W, H) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = ctx.strokeStyle = '#0d0b0c'; ctx.lineCap = 'round';
      const eye = (rx: number, ry: number, rot: number, v = 0.15) => { for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(X(sgn * 0.42), Y(v), rx, ry, -sgn * rot, 0, Math.PI * 2); ctx.fill(); } };
      const arc = (pts: [number, number][], width: number, colour = '#0d0b0c') => { ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(X(pts[0][0]), Y(pts[0][1])); ctx.quadraticCurveTo(X(pts[1][0]), Y(pts[1][1]), X(pts[2][0]), Y(pts[2][1])); ctx.stroke(); };
      if (kind === 'oval') { eye(12, 3.5, 0); arc([[-0.16, -0.48], [0, -0.52], [0.16, -0.48]], 5, '#8f1f1f'); for (const sgn of [-1, 1]) arc([[sgn * 0.22, 0.42], [sgn * 0.42, 0.5], [sgn * 0.62, 0.42]], 3); }
      else if (kind === 'demon') { eye(11, 7, 0.5, 0.17); for (const sgn of [-1, 1]) arc([[sgn * 0.12, 0.3], [sgn * 0.4, 0.44], [sgn * 0.74, 0.36]], 7); ctx.beginPath(); ctx.moveTo(X(-0.6), Y(-0.36)); ctx.quadraticCurveTo(X(0), Y(-0.46), X(0.6), Y(-0.36)); ctx.quadraticCurveTo(X(0), Y(-0.86), X(-0.6), Y(-0.36)); ctx.fill(); ctx.fillStyle = '#e9c24a'; for (let k = -2; k <= 2; k++) if (k) { ctx.beginPath(); ctx.moveTo(X(k * 0.17 - 0.05), Y(-0.42)); ctx.lineTo(X(k * 0.17), Y(-0.58)); ctx.lineTo(X(k * 0.17 + 0.05), Y(-0.42)); ctx.fill(); } }
      else if (kind === 'half') { eye(13, 7, 0.3); ctx.strokeStyle = '#b8902e'; ctx.lineWidth = 4; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(X(sgn * 0.42), Y(0.15), 17, 11, -sgn * 0.3, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(X(sgn * 0.3), Y(0.6), 12, 0, Math.PI * 1.5); ctx.stroke(); } }
      else if (kind === 'beak') { eye(10, 10, 0, 0.2); ctx.strokeStyle = '#b8902e'; ctx.lineWidth = 4; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(X(sgn * 0.42), Y(0.2), 14, 0, Math.PI * 2); ctx.stroke(); } }
      else if (kind === 'comedy') { for (const sgn of [-1, 1]) arc([[sgn * 0.22, 0.1], [sgn * 0.42, 0.34], [sgn * 0.64, 0.1]], 8); ctx.beginPath(); ctx.moveTo(X(-0.58), Y(-0.3)); ctx.quadraticCurveTo(X(0), Y(-0.42), X(0.58), Y(-0.3)); ctx.quadraticCurveTo(X(0), Y(-1.05), X(-0.58), Y(-0.3)); ctx.fill(); }
      else if (kind === 'tragedy') { eye(13, 6, -0.5, 0.13); for (const sgn of [-1, 1]) arc([[sgn * 0.14, 0.46], [sgn * 0.4, 0.4], [sgn * 0.68, 0.26]], 5); ctx.beginPath(); ctx.moveTo(X(-0.5), Y(-0.7)); ctx.quadraticCurveTo(X(0), Y(-0.2), X(0.5), Y(-0.7)); ctx.quadraticCurveTo(X(0), Y(-0.56), X(-0.5), Y(-0.7)); ctx.fill(); }
      else if (kind === 'animal') { eye(12, 4, 0.5, 0.2); ctx.fillStyle = '#b3261e'; ctx.beginPath(); ctx.ellipse(X(0), Y(-0.2), 7, 5, 0, 0, Math.PI * 2); ctx.fill(); for (const sgn of [-1, 1]) { arc([[sgn * 0.2, -0.36], [sgn * 0.5, -0.36], [sgn * 0.8, -0.24]], 3, '#b3261e'); arc([[sgn * 0.2, -0.46], [sgn * 0.5, -0.5], [sgn * 0.76, -0.42]], 3, '#b3261e'); arc([[sgn * 0.3, 0.5], [sgn * 0.42, 0.66], [sgn * 0.6, 0.56]], 5, '#b3261e'); } }
      else { eye(11, 3, 0, 0.22); ctx.fillRect(X(-0.14), Y(-0.6), X(0.14) - X(-0.14), 7); ctx.strokeStyle = '#efe6cf'; ctx.lineWidth = 3; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(X(-0.7), Y(0.5 + k * 0.1)); ctx.lineTo(X(0.7), Y(0.5 + k * 0.1)); ctx.stroke(); } for (const sgn of [-1, 1]) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(X(sgn * 0.3), Y(-0.1 - k * 0.1)); ctx.lineTo(X(sgn * 0.7), Y(-0.02 - k * 0.1)); ctx.stroke(); } }
    });

    interface Hung { kind: Kind; m: THREE.Matrix4; tint: THREE.Color; eyes: boolean }
    const hung: Hung[] = [];
    const tradition = TRADITIONS[a.tradition];
    const dustTone = new THREE.Color('#9d968a');
    const hang = (x: number, y: number, z: number, scale: number, rx: number, rz: number, forced?: Kind, white = false) => {
      const kind = forced ?? (random() < 0.86 ? tradition.kinds[Math.floor(random() * tradition.kinds.length)] : KINDS[Math.floor(random() * KINDS.length)]) as Kind;
      const tint = new THREE.Color(white ? '#f1ede2' : tradition.palette[Math.floor(random() * tradition.palette.length)]);
      tint.offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.08).lerp(dustTone, gloom * 0.4 + mood.wear * 0.15);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(scale, scale, scale));
      hung.push({ kind, m, tint, eyes: Math.abs(rx) < 0.5 });
    };
    const pegs: [number, number, number][] = [];
    const ghosts: [number, number][] = [];
    const behindHero = (x: number, y: number) => x > -0.8 && x < 0.4 && y < 2.05;
    const fillChance = (a.arrangement === 'sparse' ? 0.45 : 0.9) * mix(0.75, 1.08, mood.density) * (dead ? 0.85 : 1);
    const zWall = WZ + 0.02;
    if (a.arrangement === 'shelves') {
      for (let r = 0; r < 6; r++) {
        const y = 1.52 + r * 0.47;
        const sx0 = r === 0 ? -2.3 : -2.3, sx1 = 2.3;
        s.box([sx1 - sx0, 0.03, 0.16], [(sx0 + sx1) / 2, y, WZ + 0.08], darkWood);
        for (let x = sx0 + 0.2; x < sx1 - 0.1; x += 0.3 + random() * 0.08) { if (behindHero(x, y) || random() > fillChance) continue; if (r === 0 && x > 0.2 && x < 1.8) continue; hang(x, y + 0.165, WZ + 0.09, 0.95 + random() * 0.15, -0.22 - random() * 0.1, (random() - 0.5) * 0.12); }
      }
    } else {
      const salon = a.arrangement === 'salon';
      for (let r = 0; r < 7; r++)
        for (let c = 0; c < 13; c++) {
          let x = -2.2 + c * 0.366, y = 1.58 + r * 0.415;
          if (r === 0 && x > 0.2 && x < 1.8) continue;
          if (behindHero(x, y)) continue;
          const peg: [number, number, number] = [x, y + 0.14, zWall];
          if (random() > fillChance) { if (!salon) pegs.push(peg); if (a.arrangement === 'sparse' && random() < 0.7) ghosts.push([x, y]); continue; }
          if (salon) { x += (random() - 0.5) * 0.14; y += (random() - 0.5) * 0.14; } else pegs.push(peg);
          hang(x, y, zWall, salon ? 0.75 + random() * 0.75 : 1.15, 0, salon ? (random() - 0.5) * 0.5 : (random() - 0.5) * 0.08);
        }
    }
    if (dead) for (let i = 0; i < 6; i++) hang(-2.2 + random() * 4.4, 0.05, WZ + 0.3 + random() * 0.5 + (i % 2) * 1.1, 1, -Math.PI / 2 + (random() - 0.5) * 0.5, random() * 6);
    if (a.state === 'rush') for (let i = 0; i < 3; i++) hang(tx - 0.4 + i * 0.4, trestleY + 0.02, tz - 0.22, 0.8, -1.2, (random() - 0.5) * 0.6, undefined, true);

    // Things pinned behind the hero's place: working drawings.
    const sheetTex = painted(256, 256, (ctx, _X, _Y, W, H) => {
      ctx.fillStyle = '#efe6cc'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#5a4634'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(W / 2, H / 2, 62, 88, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W / 2, 30); ctx.lineTo(W / 2, H - 30); ctx.moveTo(50, H * 0.45); ctx.lineTo(W - 50, H * 0.45); ctx.stroke();
      for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(W / 2 + sgn * 28, H * 0.45, 15, 7, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(W / 2, H * 0.62, 26, 0.2, Math.PI - 0.2); ctx.stroke();
    });
    for (let i = 0; i < 4; i++) { const sheet = s.mesh(new THREE.PlaneGeometry(0.34, 0.42), new THREE.MeshStandardMaterial({ map: sheetTex, roughness: 0.9 }), [-0.62 + i * 0.3 + (random() - 0.5) * 0.04, 1.62 + (i % 2) * 0.12, zWall + 0.004 + i * 0.002]); sheet.rotation.z = (random() - 0.5) * 0.2; sheet.castShadow = false; }

    const dummy = new THREE.MeshStandardMaterial();
    for (const kind of KINDS) {
      const list = hung.filter((h) => h.kind === kind);
      if (!list.length) continue;
      const inst = new THREE.InstancedMesh(kindGeometry(kind), new THREE.MeshStandardMaterial({ map: kindTexture(kind), roughness: 0.55, side: THREE.DoubleSide }), list.length);
      list.forEach((h, i) => { inst.setMatrixAt(i, h.m); inst.setColorAt(i, h.tint); });
      inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.castShadow = inst.receiveShadow = true;
      root.add(inst);
    }
    dummy.dispose();
    if (pegs.length) s.scatter(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 6).rotateX(Math.PI / 2), darkWood, pegs.map((at) => ({ at: [at[0], at[1], at[2] + 0.02] as const, size: 1 })));
    if (ghosts.length) { const ghost = s.scatter(new THREE.CircleGeometry(0.12, 20).scale(1, 1.3, 1), new THREE.MeshStandardMaterial({ color: new THREE.Color(wallTone).lerp(new THREE.Color('#ffffff'), 0.07).multiply(shade), roughness: 1 }), ghosts.map(([x, y]) => ({ at: [x, y, WZ + 0.004] as const, size: 1 }))); ghost.castShadow = false; }
    let glints: THREE.InstancedMesh | null = null;
    if (a.glint) {
      const watchers = hung.filter((h) => h.eyes);
      glints = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 6, 4), new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffcf5a', emissiveIntensity: 2.2 }), watchers.length * 2);
      const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc3 = new THREE.Vector3(), m = new THREE.Matrix4();
      watchers.forEach((h, i) => { h.m.decompose(p, q, sc3); for (const sgn of [-1, 1]) { const local = new THREE.Vector3(sgn * 0.042, 0.022, 0.05).multiplyScalar(sc3.x).applyQuaternion(q).add(p); m.makeTranslation(local.x, local.y, local.z); glints!.setMatrixAt(i * 2 + (sgn > 0 ? 1 : 0), m); } });
      root.add(glints);
    }

    // Overhead.
    const lineY = WH - 0.35, lineZ = 0.3;
    const sag = (t: number) => lineY - 0.28 * Math.sin(t * Math.PI);
    const movers: THREE.Object3D[] = [];
    if (a.overhead !== 'nothing') {
      s.tube(Array.from({ length: 9 }, (_u, i) => [-WX + i / 8 * WX * 2, sag(i / 8), lineZ] as const), 0.006, s.material('#5a4a3a'));
      const n = a.overhead === 'bunting' ? 17 : a.overhead === 'lanterns' ? 5 : 7;
      const festive = ['#c0242c', '#d8aa3a', '#1f6f78', '#7a48c4', '#f1ede2', '#2f8a4f'];
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, x = -WX + t * WX * 2, y = sag(t);
        const pivot = new THREE.Group(); pivot.position.set(x, y, lineZ); root.add(pivot); movers.push(pivot);
        const put = (mesh: THREE.Mesh, dy: number) => { mesh.position.y = dy; mesh.castShadow = true; pivot.add(mesh); return mesh; };
        if (a.overhead === 'blanks') { const blank = put(new THREE.Mesh(kindGeometry(i % 3 === 0 ? 'half' : i % 3 === 1 ? 'oval' : 'beak'), new THREE.MeshStandardMaterial({ color: '#f3efe4', roughness: 0.9, side: THREE.DoubleSide })), -0.26); blank.rotation.y = (random() - 0.5) * 0.9; put(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 4), s.material('#5a4a3a')), -0.06); }
        else if (a.overhead === 'lanterns') { const colour = a.tradition === 'japanese' ? (i % 2 ? '#d9372a' : '#f3ead0') : festive[i % festive.length]; const lantern = put(new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: mix(0.35, 0.8, mood.cheer), roughness: 0.8 })), -0.3); lantern.scale.y = 1.15; put(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 10), s.material('#1c1a1c')), -0.07); put(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 10), s.material('#1c1a1c')), -0.53); put(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.03, 0.16, 6), s.material('#c0242c')), -0.63); }
        else { const flag = put(new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 3), s.material(festive[i % festive.length], { roughness: 0.7, side: THREE.DoubleSide })), -0.15); flag.rotation.x = Math.PI; flag.scale.z = 0.08; if (i % 4 === 1) { const tail = put(horn([[0, 0, 0], [0.04, -0.4, 0.02], [-0.03, -0.8, 0], [0.03, -1.1 - random() * 0.3, 0.02]], () => 0.022, s.material(festive[(i + 2) % festive.length], { roughness: 0.4, side: THREE.DoubleSide }), { sides: 6, steps: 16, squash: 0.12, side: [1, 0, 0] }), 0); tail.castShadow = true; } }
      }
    }
    // A bench lamp for dim days.
    const lampOn = gloom > 0.45 || mood.daylight < 0.2 || mood.daylight > 0.8;
    const lx = -1.75, lz = WZ + 0.22;
    s.cylinder(0.07, 0.08, 0.02, [lx, benchY + 0.01, lz], s.material('#3a3a3c', { metalness: 0.6, roughness: 0.4 }), 14);
    s.rod([lx, benchY + 0.02, lz], [lx + 0.05, benchY + 0.42, lz], 0.01, s.material('#3a3a3c', { metalness: 0.6 }));
    s.rod([lx + 0.05, benchY + 0.42, lz], [lx + 0.22, benchY + 0.52, lz + 0.08], 0.01, s.material('#3a3a3c', { metalness: 0.6 }));
    const lampShade = s.mesh(new THREE.ConeGeometry(0.1, 0.12, 14, 1, true), s.material('#2f6b47', { roughness: 0.4, side: THREE.DoubleSide }), [lx + 0.24, benchY + 0.5, lz + 0.09]);
    lampShade.rotation.z = -0.4;
    s.ball([0.035, 0.035, 0.035], [lx + 0.25, benchY + 0.46, lz + 0.09], new THREE.MeshStandardMaterial({ color: '#fff3c9', emissive: '#ffd77a', emissiveIntensity: lampOn ? 2.2 : 0 }), 10);
    if (lampOn) { const lamp = new THREE.PointLight('#ffcf85', 2.2, 3.2, 1.6); lamp.position.set(lx + 0.27, benchY + 0.42, lz + 0.14); root.add(lamp); }

    // Camera: nearly head-on, a little to the right so the window wall shows.
    const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 200);
    const yaw = THREE.MathUtils.degToRad(13), pitch = THREE.MathUtils.degToRad(8);
    const toCamera = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const roomBox = new THREE.Box3(new THREE.Vector3(-WX, 0, WZ), new THREE.Vector3(WX, WH, FZ - 0.4));
    const slots: { at: [number, number, number]; height: number; radius: number }[] = [
      { at: [-0.2, benchY, -0.88], height: 1.12, radius: 0.5 },
      { at: [tx, trestleY, tz + 0.05], height: 0.95, radius: 0.42 },
      { at: [-1.45, benchY, -0.86], height: 0.72, radius: 0.33 },
      { at: [crateX, crateY, crateZ], height: 0.9, radius: 0.34 },
      { at: [1.02, benchY, -0.86], height: 0.72, radius: 0.34 },
    ];

    const place = (items: readonly Placeable[]) => {
      items.forEach((item, index) => {
        const slot = slots[index % slots.length];
        const scale = Math.min(slot.height / Math.max(item.height, 0.01), slot.radius / Math.max(item.radius, 0.01));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(...slot.at);
        item.holder.rotation.y = yaw * 0.6 + (index === 0 ? 0 : (random() - 0.5) * 0.5);
        item.holder.updateMatrixWorld(true);
      });
      const centre = roomBox.getCenter(new THREE.Vector3());
      camera.position.copy(centre).addScaledVector(toCamera, 40);
      camera.lookAt(centre);
      camera.updateMatrixWorld(true);
      const seen = new THREE.Box2(), corner = new THREE.Vector3();
      for (const x of [roomBox.min.x, roomBox.max.x]) for (const y of [roomBox.min.y, roomBox.max.y]) for (const z of [roomBox.min.z, roomBox.max.z]) { corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse); seen.expandByPoint(new THREE.Vector2(corner.x, corner.y)); }
      const middle = seen.getCenter(new THREE.Vector2());
      const extent = Math.max(...seen.getSize(new THREE.Vector2()).toArray()) * 0.5;
      camera.translateX(middle.x); camera.translateY(middle.y);
      camera.left = camera.bottom = -extent; camera.right = camera.top = extent;
      camera.updateProjectionMatrix();
    };
    void visibleBounds;

    const sway = mix(0.01, 0.09, mood.energy);
    const phases = movers.map(() => random() * 6);
    return {
      object: root, camera, background, capacity: slots.length, ground: floor, keyLight: key, place,
      update(_dt, time) {
        movers.forEach((pivot, i) => { pivot.rotation.z = Math.sin(time * (0.8 + mood.energy * 1.4) + phases[i]) * sway; pivot.rotation.x = Math.cos(time * 0.7 + phases[i]) * sway * 0.5; });
        if (glints) (glints.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.7 + Math.sin(time * 1.3) * 0.6;
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
