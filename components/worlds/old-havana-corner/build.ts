import * as THREE from 'three';
import { type Placeable, type World, Sculpture, choice, clamp01, defineWorld, disposeTree, mix, noul, visibleBounds } from '@conjure/kit';

type P = readonly [number, number, number];
const PALETTES = {
  mango: 'Mango yellow walls with turquoise shutters.',
  rose: 'Dusty rose walls with mint-green shutters.',
  sky: 'Sky blue walls with deep blue shutters.',
  patchwork: 'Every household has painted its own bay a different colour.',
  bare: 'Bare grey stone and plaster with only ghosts of old paint.',
} as const;
const WALLS = ['#f0b040', '#72c4aa', '#ea8c90', '#86c0e2', '#c4a2dc', '#e6d47c'];
const SHUTTERS = ['#1f8f8a', '#3f8a5a', '#2a5a94', '#8a3a2e', '#6a4a8a', '#f1ead6'];

export default defineWorld({
  questions: {
    palette: choice('What colours is the corner building painted?', PALETTES),
    condition: choice('What state is the building in?', {
      crumbling: 'Lived-in and crumbling: plaster falling in sheets, everything still in use.',
      shored: 'Held up by raking timber shores braced against the pavement.',
      restoring: 'Half restored: one bay freshly painted behind a timber scaffold, the rest untouched.',
      ruin: 'A facade with nothing behind it: sky through the upper windows and a fig tree on the roof.',
    }),
    street: choice('What is the road surface?', {
      tarmac: 'Patched tarmac, potholed, every repair a different grey.',
      cobbles: 'Old stone setts showing through worn tarmac, with tram rails curving round the corner.',
      concrete: 'Pale cracked concrete slabs with weeds in the joints.',
    }),
    life: choice('What sign of life does the corner show?', {
      music: 'A door stands open under the arcade, light and music spilling out past a bead curtain.',
      washing: 'Washing strung on lines across the side street.',
      game: 'A street ball game chalked on the road, bases made of crates.',
      siesta: 'Siesta: every shutter closed, a dog asleep on the pavement, a broom left against a pier.',
    }),
    overhead: choice('What hangs over the street?', {
      cables: 'A leaning utility pole and a tangle of sagging cables.',
      bunting: 'Strings of paper flags for a neighbourhood party.',
      bare: 'Nothing but sky.',
    }),
    wall: choice('What is on the corner pier?', {
      plaque: 'Only the enamel street-name plaque.',
      ghost: 'The faded painted sign of a shop that closed sixty years ago.',
      mural: 'A hand-painted flag mural.',
    }),
    rain: noul('Has a tropical shower just passed, leaving the road wet and puddled?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const s = new Sculpture(context);
    const root = s.root;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const low = Math.abs(mood.daylight - 0.5) * 2;

    // Light: a low warm sun from the street side, long shadows.
    const background = new THREE.Color('#f4e4c8').lerp(new THREE.Color('#e4eaee'), (1 - mood.warmth) * 0.6).lerp(new THREE.Color('#f6d2ae'), low * mood.warmth * 0.5);
    root.add(new THREE.HemisphereLight(new THREE.Color('#fff1dc').lerp(new THREE.Color('#e6f0ff'), 1 - mood.warmth), '#8a7460', 0.35));
    const key = new THREE.DirectionalLight(new THREE.Color('#eaf0ff').lerp(new THREE.Color('#ffb466'), clamp01(0.25 + mood.warmth * 0.45 + low * 0.4)), 6.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04; key.shadow.bias = -0.0004;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#cfdcf4', 0.25);
    fill.position.set(9, 6, -3);
    root.add(fill);
    const elevation = mix(42, 17, low) * Math.PI / 180;
    // Raking light from the side, so shadows run along the street instead of hiding behind things.
    const sun = new THREE.Vector3(mix(0.9, -0.9, mood.daylight) - 0.22, 0, 0.5).normalize().multiplyScalar(Math.cos(elevation)).setY(Math.sin(elevation));
    const dusk = clamp01((low - 0.45) / 0.55);

    const SW = 15, SD = 13, BX0 = -7.5, BX1 = -1, BZ0 = -6.5, BZ1 = -1.5, G = 4, UH = 3.7, CURB = 0.15;
    const fade = (hex: string, strength = 1) => { const c = new THREE.Color(hex); c.offsetHSL(0, mix(-0.22, 0.05, mood.cheer), 0).lerp(new THREE.Color('#b9b0a0'), mood.wear * 0.3 * strength); return `#${c.getHexString()}`; };

    // Road, painted.
    const road = document.createElement('canvas');
    road.width = 1024; road.height = 888;
    const g = road.getContext('2d')!;
    const gx = (x: number) => (x + SW / 2) / SW * 1024, gz = (z: number) => (z + SD / 2) / SD * 888, M = 1024 / SW;
    const wet = a.rain ? 0.72 : 1;
    const shade = (r: number, gr: number, b: number, alpha = 1) => `rgba(${Math.round(r * wet)},${Math.round(gr * wet)},${Math.round(b * wet)},${alpha})`;
    const blob = (x: number, y: number, rx: number, ry: number) => { g.beginPath(); for (let k = 0; k <= 14; k++) { const t = k / 14 * 6.283, r = 0.7 + random() * 0.5; const px = x + Math.cos(t) * rx * r, py = y + Math.sin(t) * ry * r; if (k) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); };
    const setts = () => { for (let row = 0; row < 888 / 9; row++) for (let col = -1; col < 1024 / 14 + 1; col++) { const t = 150 + random() * 40; g.fillStyle = shade(t, t - 6, t - 16); g.fillRect(col * 14 + (row % 2 ? 7 : 0) + 1, row * 9 + 1, 12, 7); } };
    if (a.street === 'concrete') {
      g.fillStyle = shade(196, 188, 172); g.fillRect(0, 0, 1024, 888);
      for (let i = 0; i < 7; i++) for (let j = 0; j < 6; j++) { const t = 186 + random() * 22; g.fillStyle = shade(t, t - 7, t - 22); g.fillRect(i * 150 + 3, j * 150 + 3, 145, 145); }
      g.strokeStyle = shade(96, 110, 70); g.lineWidth = 3;
      for (let i = 0; i < 20 + mood.wear * 60; i++) { const x = Math.floor(random() * 7) * 150 + 1, y = random() * 888; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (random() - 0.5) * 6, y + 6 + random() * 18); g.stroke(); }
    } else {
      g.fillStyle = shade(88, 82, 76); g.fillRect(0, 0, 1024, 888);
      if (a.street === 'cobbles') setts();
      const cover = a.street === 'cobbles' ? 0.5 : 1;
      // Tarmac laid in overlapping repairs.
      for (let i = 0; i < (a.street === 'cobbles' ? 9 : 34); i++) {
        const t = 108 + random() * 44;
        g.fillStyle = shade(t + 6, t, t - 9, a.street === 'cobbles' ? 1 : 0.9);
        g.save(); g.translate(random() * 1024, random() * 888); g.rotate((random() - 0.5) * 0.5);
        if (a.street === 'cobbles') { blob(0, 0, 90 + random() * 160 * cover, 60 + random() * 110 * cover); g.fill(); } else { const w = 80 + random() * 380, h = 50 + random() * 220; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = shade(70, 66, 60, 0.6); g.lineWidth = 2; g.strokeRect(-w / 2, -h / 2, w, h); }
        g.restore();
      }
      if (a.street === 'cobbles') {
        g.strokeStyle = shade(70, 72, 76); g.lineWidth = 6;
        for (const offset of [0, 1.44]) { g.beginPath(); g.moveTo(0, gz(2.4 + offset)); g.lineTo(gx(1.5), gz(2.4 + offset)); g.quadraticCurveTo(gx(4.6 + offset), gz(2.4 + offset), gx(4.6 + offset), gz(-1.6)); g.lineTo(gx(4.6 + offset), 0); g.stroke(); }
      }
    }
    for (let i = 0; i < 900; i++) { const t = random() < 0.5 ? 255 : 30; g.fillStyle = `rgba(${t},${t},${t},${0.03 + random() * 0.05})`; g.fillRect(random() * 1024, random() * 888, 2 + random() * 4, 2 + random() * 4); }
    const holes: [number, number, number][] = [];
    for (let i = 0; i < 2 + Math.round(mood.wear * 9); i++) {
      const x = mix(-0.5, 7, random()), z = random() < 0.5 ? mix(1, 6, random()) : mix(-6, 6, random());
      if (x < 1.4 && z < 1) continue;
      const r = 0.25 + random() * 0.5;
      holes.push([x, z, r]);
      g.fillStyle = shade(52, 48, 44); blob(gx(x), gz(z), r * M, r * M * 0.7); g.fill();
      g.strokeStyle = shade(170, 162, 150, 0.7); g.lineWidth = 3; g.stroke();
    }
    g.strokeStyle = shade(48, 44, 40, 0.7); g.lineWidth = 1.6;
    for (let i = 0; i < 8 + mood.wear * 18; i++) { let x = random() * 1024, y = random() * 888; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (random() - 0.5) * 70; y += (random() - 0.5) * 70; g.lineTo(x, y); } g.stroke(); }
    // Faded crossing bars and a manhole.
    g.fillStyle = `rgba(235,228,205,${mix(0.5, 0.14, mood.wear)})`;
    for (let i = 0; i < 6; i++) g.fillRect(gx(1.6 + i * 0.9), gz(0.95), 0.5 * M, 2.2 * M * (0.8 + random() * 0.2));
    g.fillStyle = shade(70, 66, 62); g.beginPath(); g.arc(gx(4.4), gz(4.6), 0.38 * M, 0, 6.3); g.fill();
    g.strokeStyle = shade(120, 114, 106); g.lineWidth = 3; g.stroke(); g.beginPath(); g.arc(gx(4.4), gz(4.6), 0.24 * M, 0, 6.3); g.stroke();
    // Gutter grime along the kerbs.
    const grime = g.createLinearGradient(0, gz(0.6), 0, gz(1.3)); grime.addColorStop(0, 'rgba(40,36,30,0.5)'); grime.addColorStop(1, 'rgba(40,36,30,0)');
    g.fillStyle = grime; g.fillRect(0, gz(0.6), gx(1.1), 0.7 * M);
    const grime2 = g.createLinearGradient(gx(1.1), 0, gx(1.8), 0); grime2.addColorStop(0, 'rgba(40,36,30,0.5)'); grime2.addColorStop(1, 'rgba(40,36,30,0)');
    g.fillStyle = grime2; g.fillRect(gx(1.1), 0, 0.7 * M, gz(0.6));
    if (a.life === 'game') {
      g.strokeStyle = 'rgba(250,246,232,0.85)'; g.lineWidth = 4; g.lineJoin = 'round';
      const bx = gx(4.2), bz = gz(-3.2), d = 2.3 * M;
      g.beginPath(); g.moveTo(bx, bz + d); g.lineTo(bx + d, bz); g.lineTo(bx, bz - d); g.lineTo(bx - d, bz); g.closePath(); g.stroke();
      g.beginPath(); g.arc(bx, bz, 0.4 * M, 0, 6.3); g.stroke();
      g.font = 'bold 30px sans-serif'; g.fillStyle = 'rgba(250,246,232,0.85)'; g.fillText(`${Math.floor(random() * 9)} - ${Math.floor(random() * 9)}`, bx + d * 0.6, bz + d * 0.9);
      for (let i = 0; i < 5; i++) g.strokeRect(gx(-5.5 + i * 0.6), gz(2.0), 0.6 * M, 0.6 * M);
    }
    const roadMap = new THREE.CanvasTexture(road);
    roadMap.colorSpace = THREE.SRGBColorSpace; roadMap.anisotropy = 4;
    const kerbStone = s.material('#a39a8a', { roughness: 1 });
    const ground = s.box([SW, 0.3, SD], [0, -0.15, 0], [kerbStone, kerbStone, new THREE.MeshStandardMaterial({ map: roadMap, roughness: a.rain ? 0.35 : 0.95, metalness: a.rain ? 0.15 : 0 }), kerbStone, kerbStone, kerbStone] as unknown as THREE.Material);
    ground.castShadow = false;
    if (a.rain) for (const [x, z, r] of [...holes, [3 + random() * 3, 5 + random(), 0.7], [0.4 + random(), 3.5 + random() * 2, 0.5]] as [number, number, number][]) {
      const puddle = s.cylinder(1, 1, 0.012, [x, 0.004, z], new THREE.MeshStandardMaterial({ color: background.clone().multiplyScalar(0.82), roughness: 0.04, metalness: 0.55 }), 20);
      puddle.scale.set(r * (0.9 + random() * 0.5), 1, r * (0.6 + random() * 0.4)); puddle.rotation.y = random() * 3; puddle.castShadow = false;
    }

    // Pavement: tiled slab with a stone kerb.
    const tile = document.createElement('canvas');
    tile.width = tile.height = 64;
    const tc = tile.getContext('2d')!;
    tc.fillStyle = '#cbbfa6'; tc.fillRect(0, 0, 64, 64); tc.fillStyle = '#bcae94'; tc.fillRect(0, 0, 32, 32); tc.fillRect(32, 32, 32, 32);
    tc.strokeStyle = 'rgba(90,80,64,0.6)'; tc.lineWidth = 2; tc.strokeRect(0, 0, 32, 32); tc.strokeRect(32, 32, 32, 32);
    const tiles = new THREE.CanvasTexture(tile);
    tiles.colorSpace = THREE.SRGBColorSpace; tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(8.6, 7.1);
    const PX1 = 1.1, PZ1 = 0.6;
    s.box([PX1 - BX0, CURB, PZ1 - BZ0], [(PX1 + BX0) / 2, CURB / 2, (PZ1 + BZ0) / 2], [kerbStone, kerbStone, new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.9 }), kerbStone, kerbStone, kerbStone] as unknown as THREE.Material);

    // Facade frames: A faces the viewer (+z), B faces the side street (+x).
    interface Facade { length: number; bays: number; yaw: number; at(u: number, y: number, out: number): [number, number, number] }
    const A: Facade = { length: BX1 - BX0, bays: 2, yaw: 0, at: (u, y, out) => [BX0 + u, y, BZ1 + out] };
    const B: Facade = { length: BZ1 - BZ0, bays: 2, yaw: Math.PI / 2, at: (u, y, out) => [BX1 + out, y, BZ1 - u] };
    const fbox = (f: Facade, size: P, u: number, y: number, out: number, material: THREE.Material) => { const mesh = s.box(size, f.at(u, y, out), material); mesh.rotation.y = f.yaw; return mesh; };

    const wallHexes: string[] = [], shutterHexes: string[] = [];
    const patch = a.palette === 'patchwork' ? Math.floor(random() * 6) : 0;
    for (let i = 0; i < 4; i++) {
      wallHexes.push(fade({ mango: WALLS[0], rose: WALLS[2], sky: WALLS[3], patchwork: WALLS[(patch + i * 2 + (i > 1 ? 1 : 0)) % 6], bare: i % 2 ? '#cfc4ae' : '#c6c4b6' }[a.palette], a.palette === 'bare' ? 0.3 : 1));
      shutterHexes.push(fade({ mango: SHUTTERS[0], rose: SHUTTERS[1], sky: SHUTTERS[2], patchwork: SHUTTERS[(patch + i * 3) % 6], bare: '#4f6f8c' }[a.palette]));
    }
    const trimHex = fade('#f1e9d4', 0.8);
    const fresh = a.condition === 'restoring' ? 0 : -1;
    if (fresh >= 0) { wallHexes[0] = a.palette === 'bare' ? '#f0b040' : `#${new THREE.Color(wallHexes[0]).offsetHSL(0, 0.25, 0.02).getHexString()}`; }
    const decay = clamp01(mood.wear * 0.75 + { crumbling: 0.3, shored: 0.35, restoring: 0.1, ruin: 0.5 }[a.condition]);
    const skyHex = `#${background.getHexString()}`;

    // Upper storey, painted: plaster, pilasters, shuttered windows under stained-glass fanlights.
    const PPM = 128;
    const paintFacade = (f: Facade, first: number) => {
      const w = Math.round(f.length * PPM), h = Math.round(UH * PPM), bw = w / f.bays;
      const canvas = document.createElement('canvas'), lit = document.createElement('canvas');
      canvas.width = lit.width = w; canvas.height = lit.height = h;
      const c = canvas.getContext('2d')!, e = lit.getContext('2d')!;
      e.fillStyle = '#000'; e.fillRect(0, 0, w, h);
      for (let b = 0; b < f.bays; b++) {
        const x0 = b * bw, bay = first + b, isFresh = bay === fresh;
        c.save(); c.beginPath(); c.rect(x0, 0, bw, h); c.clip();
        c.fillStyle = wallHexes[bay]; c.fillRect(x0, 0, bw, h);
        if (!isFresh) {
          for (let i = 0; i < 40; i++) { c.fillStyle = random() < 0.5 ? `rgba(255,255,255,${0.03 + random() * 0.08})` : `rgba(70,56,40,${0.03 + random() * 0.08})`; c.beginPath(); c.ellipse(x0 + random() * bw, random() * h, 20 + random() * 70, 14 + random() * 50, random() * 3, 0, 6.3); c.fill(); }
          for (let i = 0; i < 3 + decay * 14; i++) { const x = x0 + random() * bw, len = 50 + random() * 240; const grad = c.createLinearGradient(0, 30, 0, 30 + len); grad.addColorStop(0, `rgba(48,42,34,${0.2 + decay * 0.3})`); grad.addColorStop(1, 'rgba(48,42,34,0)'); c.fillStyle = grad; c.fillRect(x, 30, 5 + random() * 16, len); }
          for (let i = 0; i < Math.round(decay * 7); i++) {
            const cx = random() < 0.6 ? x0 + (random() < 0.5 ? random() * 70 : bw - random() * 70) : x0 + random() * bw, cy = random() < 0.5 ? h - random() * 140 : random() * h, radius = (22 + random() * 60) * (0.6 + decay);
            c.save(); c.beginPath(); for (let k = 0; k < 12; k++) { const t = k / 12 * 6.283, r = radius * (0.55 + random() * 0.6); if (k) c.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r * 1.1); else c.moveTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r * 1.1); } c.closePath();
            c.strokeStyle = 'rgba(255,250,235,0.7)'; c.lineWidth = 5; c.stroke(); c.clip();
            c.fillStyle = '#b3a590'; c.fillRect(cx - radius * 1.5, cy - radius * 1.5, radius * 3, radius * 3);
            for (let row = Math.floor((cy - radius * 1.5) / 12); row < (cy + radius * 1.5) / 12; row++) for (let col = Math.floor((cx - radius * 1.5) / 34) - 1; col < (cx + radius * 1.5) / 34 + 1; col++) { c.fillStyle = pick(['#a8553a', '#b8654a', '#9a4a34', '#c07a5a']); c.fillRect(col * 34 + (row % 2 ? 17 : 0) + 1, row * 12 + 1, 31, 9); }
            c.restore();
          }
        }
        // Pilasters at the bay edges.
        c.fillStyle = trimHex; c.fillRect(x0, 0, 16, h); c.fillRect(x0 + bw - 16, 0, 16, h);
        c.fillStyle = 'rgba(60,50,40,0.25)'; c.fillRect(x0 + 16, 0, 3, h); c.fillRect(x0 + bw - 19, 0, 3, h);
        // Window.
        const cx = x0 + bw / 2, ww = 1.3 * PPM, base = h - 0.06 * PPM, top = base - 2.45 * PPM;
        c.fillStyle = trimHex; c.fillRect(cx - ww / 2 - 14, top, ww + 28, base - top);
        c.beginPath(); c.arc(cx, top, ww / 2 + 14, Math.PI, 0); c.fill();
        const ruinSky = a.condition === 'ruin';
        const glassHues = ['#d8322a', '#f0c22a', '#2a6ad8', '#3aa85a', '#e87a1e'];
        for (let i = 0; i < 5; i++) { c.fillStyle = ruinSky && random() < 0.6 ? skyHex : glassHues[(i + bay) % 5]; c.beginPath(); c.moveTo(cx, top - 2); c.arc(cx, top - 2, ww / 2 - 2, Math.PI + i * Math.PI / 5, Math.PI + (i + 1) * Math.PI / 5); c.closePath(); c.fill(); c.strokeStyle = trimHex; c.lineWidth = 4; c.stroke(); }
        c.fillStyle = trimHex; c.beginPath(); c.arc(cx, top - 2, ww * 0.16, Math.PI, 0); c.fill();
        const roll = random(), mode = ruinSky ? 'sky' : a.life === 'siesta' ? 'closed' : roll < 0.4 ? 'closed' : roll < 0.65 ? 'ajar' : roll < 0.85 ? 'open' : 'lit';
        c.fillStyle = mode === 'sky' ? skyHex : '#2a2420'; c.fillRect(cx - ww / 2, top + 4, ww, base - top - 4);
        if (mode === 'lit' || (mode === 'open' && dusk > 0.5)) { c.fillStyle = '#7a5226'; c.fillRect(cx - ww / 2, top + 4, ww, base - top - 4); e.fillStyle = '#ffb860'; e.fillRect(cx - ww / 2, top + 4, ww, base - top - 4); }
        const leaf = (lx: number, lw: number) => {
          c.fillStyle = shutterHexes[bay]; c.fillRect(lx, top + 4, lw, base - top - 4); e.fillStyle = '#000'; e.fillRect(lx, top + 4, lw, base - top - 4);
          c.strokeStyle = 'rgba(20,20,20,0.45)'; c.lineWidth = 2;
          for (let y = top + 14; y < base - 8; y += 9) { if (decay > 0.5 && random() < 0.06) { c.fillStyle = '#2a2420'; c.fillRect(lx + 6, y - 4, lw - 12, 9); } c.beginPath(); c.moveTo(lx + 6, y); c.lineTo(lx + lw - 6, y); c.stroke(); }
          c.strokeStyle = 'rgba(20,20,20,0.6)'; c.strokeRect(lx + 1, top + 5, lw - 2, base - top - 6); c.strokeRect(lx + 1, (top + base) / 2, lw - 2, 1);
        };
        if (mode === 'closed') { leaf(cx - ww / 2, ww / 2); leaf(cx, ww / 2); }
        else if (mode === 'ajar') { leaf(cx - ww / 2, ww / 2); leaf(cx + ww / 2 - ww * 0.16, ww * 0.16); }
        else if (mode !== 'sky') { leaf(cx - ww / 2, ww * 0.14); leaf(cx + ww / 2 - ww * 0.14, ww * 0.14); }
        else if (random() < 0.5) leaf(cx - ww / 2, ww * 0.3);
        c.restore();
      }
      c.fillStyle = trimHex; c.fillRect(0, 0, w, 34);
      c.fillStyle = 'rgba(60,50,40,0.3)'; c.fillRect(0, 34, w, 4); for (let x = 6; x < w; x += 22) c.fillRect(x, 20, 10, 12);
      c.strokeStyle = 'rgba(50,42,34,0.6)'; c.lineWidth = 1.5;
      for (let i = 0; i < decay * 9; i++) { let x = random() * w, y = random() * h * 0.7; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (random() - 0.5) * 30; y += 10 + random() * 22; c.lineTo(x, y); } c.stroke(); }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
      const emissiveMap = new THREE.CanvasTexture(lit); emissiveMap.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: '#ffffff', emissiveIntensity: mix(0.25, 1.3, dusk), roughness: 0.95 });
    };
    const section = s.material('#a8674e', { roughness: 1 }), roofing = s.material('#b5a48c', { roughness: 1 }), soffit = s.material('#d9cfb8', { roughness: 1 });
    const ruin = a.condition === 'ruin';
    const upperDepthX = BX1 - BX0, upperDepthZ = BZ1 - BZ0;
    if (ruin) {
      // Only the two street walls stand.
      s.box([upperDepthX, UH, 0.5], [(BX0 + BX1) / 2, G + UH / 2, BZ1 - 0.25], [section, section, section, soffit, paintFacade(A, 0), s.material('#cbbfa8', { roughness: 1 })] as unknown as THREE.Material);
      s.box([0.5, UH, upperDepthZ - 0.5], [BX1 - 0.25, G + UH / 2, (BZ0 + BZ1 - 0.5) / 2], [paintFacade(B, 2), s.material('#cbbfa8', { roughness: 1 }), section, soffit, section, section] as unknown as THREE.Material);
    } else s.box([upperDepthX, UH, upperDepthZ], [(BX0 + BX1) / 2, G + UH / 2, (BZ0 + BZ1) / 2], [paintFacade(B, 2), section, roofing, soffit, paintFacade(A, 0), section] as unknown as THREE.Material);

    // Arcade screens: one arched bay at a time so each household's colour carries down.
    const trim = s.material(trimHex, { roughness: 0.95 }), brick = s.material('#a8674e', { roughness: 1 });
    const scabs: THREE.Matrix4[] = [];
    [A, B].forEach((f, index) => {
      const bw = f.length / f.bays, opening = bw - 1.0, spring = 2.3;
      for (let b = 0; b < f.bays; b++) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.lineTo(bw, 0); shape.lineTo(bw, G); shape.lineTo(0, G); shape.closePath();
        const hole = new THREE.Path();
        hole.moveTo(0.5, 0); hole.lineTo(0.5, spring); hole.absarc(bw / 2, spring, opening / 2, Math.PI, 0, true); hole.lineTo(bw - 0.5, 0); hole.closePath();
        shape.holes.push(hole);
        const colour = new THREE.Color(wallHexes[index * 2 + b]).multiplyScalar(index * 2 + b === fresh ? 1 : 0.93);
        const screen = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false, curveSegments: 16 }), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.95 }));
        if (f === A) screen.position.set(BX0 + b * bw, 0, BZ1 - 0.5); else { screen.position.set(BX1 - 0.5, 0, BZ1 - b * bw); screen.rotation.y = Math.PI / 2; }
        // Dado, imposts, keystone, archivolt.
        for (const side of [0.25, bw - 0.25]) {
          const wide = (side < 1 && b > 0) || (side > 1 && b < f.bays - 1) ? 0.5 : 0.52;
          fbox(f, [wide, 1.0, 0.56], b * bw + side, 0.5 + CURB, -0.25, s.material(new THREE.Color(colour).multiplyScalar(0.78), { roughness: 1 }));
          fbox(f, [0.6, 0.14, 0.62], b * bw + side, spring, -0.25, trim);
        }
        fbox(f, [0.26, 0.4, 0.58], b * bw + bw / 2, spring + opening / 2 + 0.16, -0.25, trim);
        const ring = s.mesh(new THREE.TorusGeometry(opening / 2 + 0.07, 0.06, 6, 24, Math.PI), trim, f.at(b * bw + bw / 2, spring, 0.01));
        ring.rotation.y = f.yaw;
        for (let i = 0; i < decay * 9 && index * 2 + b !== fresh; i++) {
          const u = b * bw + (random() < 0.5 ? random() * 0.45 : bw - random() * 0.45), y = CURB + random() * 3.6, scale = new THREE.Vector3(0.12 + random() * 0.3, 0.1 + random() * 0.4, 1);
          scabs.push(new THREE.Matrix4().compose(new THREE.Vector3(...f.at(u, y, 0.006)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, f.yaw, 0)), scale));
        }
      }
      fbox(f, [f.length + 0.3, 0.2, 0.3], f.length / 2, G - 0.02, 0.05, trim);
    });
    if (scabs.length) { const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.012), brick, scabs.length); scabs.forEach((m, i) => mesh.setMatrixAt(i, m)); root.add(mesh); }

    // The rooms behind the arcade, with their doors.
    const inner = s.material(fade('#d9cdb2', 0.6), { roughness: 1 });
    s.box([4.5, G - CURB, 3], [BX0 + 2.25, CURB + (G - CURB) / 2, BZ0 + 1.5], inner);
    const doorway = (x: number, z: number, yaw: number, open: boolean, colour: string) => {
      const d = new Sculpture(context);
      d.root.position.set(x, CURB, z); d.root.rotation.y = yaw;
      d.box([1.3, 2.7, 0.06], [0, 1.35, 0.03], d.material(open ? '#6a4a22' : '#2a2420', { emissive: '#ffb04a', emissiveIntensity: open ? mix(0.7, 1.6, dusk) : 0 }));
      d.box([1.56, 0.14, 0.12], [0, 2.77, 0.06], trim);
      for (const k of [-1, 1]) d.box([0.13, 2.7, 0.12], [k * 0.715, 1.35, 0.06], trim);
      const paintColour = d.material(colour, { roughness: 0.7 });
      if (open) {
        for (const k of [-1, 1]) { const leaf = d.box([0.62, 2.6, 0.05], [k * 0.66, 1.3, 0.36], paintColour); leaf.rotation.y = k * -1.25; }
        const beads: THREE.Matrix4[] = [];
        for (let i = 0; i < 26; i++) beads.push(new THREE.Matrix4().makeScale(1, mix(0.75, 1, random()), 1).setPosition(-0.6 + i * 0.048, 1.5 + random() * 0.05, 0.1));
        const curtain = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 2.3, 5), new THREE.MeshStandardMaterial({ color: '#ffffff' }), beads.length);
        beads.forEach((m, i) => { curtain.setMatrixAt(i, m); curtain.setColorAt(i, new THREE.Color(pick(['#e83f3f', '#f0c22a', '#3fb0c8', '#f4f1e8', '#e87a1e', '#58b06a']))); });
        d.root.add(curtain);
        const spill = d.mesh(new THREE.PlaneGeometry(1.5, 4.2), new THREE.MeshBasicMaterial({ color: '#ffc468', transparent: true, opacity: mix(0.16, 0.42, dusk), depthWrite: false }), [0, 0.012, 2.15]);
        spill.rotation.x = -Math.PI / 2; spill.castShadow = spill.receiveShadow = false;
        d.box([0.36, 0.5, 0.3], [1.15, 0.25, 0.3], d.material('#2a2a2c'));
        d.cylinder(0.11, 0.11, 0.02, [1.15, 0.3, 0.46], d.material('#5a5a5e'), 16).rotation.x = Math.PI / 2;
      } else for (const k of [-1, 1]) { d.box([0.64, 2.6, 0.05], [k * 0.325, 1.3, 0.08], paintColour); d.box([0.42, 1.0, 0.02], [k * 0.325, 1.9, 0.11], d.material(new THREE.Color(colour).multiplyScalar(0.8))); d.box([0.42, 0.9, 0.02], [k * 0.325, 0.75, 0.11], d.material(new THREE.Color(colour).multiplyScalar(0.8))); }
      root.add(d.root);
    };
    doorway(BX0 + 1.62, BZ0 + 3, 0, a.life === 'music', shutterHexes[0]);
    doorway(BX0 + 4.5, BZ0 + 1.4, Math.PI / 2, false, shutterHexes[2]);
    // Corner room window grille glimpsed through the arches.
    s.box([1.0, 1.6, 0.05], [BX0 + 3.6, 1.9, BZ0 + 3.02], s.material('#2a2420'));
    for (let i = 0; i < 8; i++) s.rod([BX0 + 3.15 + i * 0.13, 1.05, BZ0 + 3.12], [BX0 + 3.15 + i * 0.13, 2.75, BZ0 + 3.12], 0.012, s.material('#22262a', { metalness: 0.5 }));

    // Cornice, parapet and balconies.
    const iron = s.material(mood.wear > 0.6 ? '#4a3a30' : '#22262a', { metalness: 0.5, roughness: 0.6 });
    const bars: THREE.Matrix4[] = [];
    const TOP = G + UH;
    [A, B].forEach((f, index) => {
      fbox(f, [f.length + 0.5, 0.22, 0.5], f.length / 2 + (f === A ? 0.1 : -0.1) * 0, TOP + 0.02, 0.08, trim);
      const segments = Math.round(f.length / 1.1), sw = f.length / segments;
      for (let i = 0; i < segments; i++) {
        if ((ruin || decay > 0.75) && random() < (ruin ? 0.45 : 0.2)) { if (random() < 0.6) fbox(f, [sw * 0.6, 0.2 + random() * 0.2, 0.22], (i + 0.4) * sw, TOP + 0.22, -0.13, trim); continue; }
        fbox(f, [sw - 0.03, 0.55, 0.24], (i + 0.5) * sw, TOP + 0.4, -0.13, s.material(new THREE.Color(wallHexes[index * 2 + Math.min(f.bays - 1, Math.floor((i + 0.5) * sw / (f.length / f.bays)))]).multiplyScalar(0.96), { roughness: 0.95 }));
        fbox(f, [sw + 0.02, 0.08, 0.3], (i + 0.5) * sw, TOP + 0.7, -0.13, trim);
      }
      const bw = f.length / f.bays;
      for (let b = 0; b < f.bays; b++) {
        const u = (b + 0.5) * bw, half = 1.05, depth = 0.72;
        if (ruin && random() < 0.35) { fbox(f, [0.5, 0.12, 0.3], u - 0.6, G + 0.02, 0.15, trim); continue; }
        fbox(f, [half * 2 + 0.1, 0.12, depth + 0.04], u, G + 0.06, depth / 2, trim);
        for (const k of [-0.8, 0, 0.8]) fbox(f, [0.14, 0.34, 0.5], u + k, G - 0.2, 0.25, trim);
        const post = (du: number, out: number) => bars.push(new THREE.Matrix4().makeTranslation(...f.at(u + du, G + 0.6, out)));
        for (let i = 0; i <= 18; i++) post(-half + i * half * 2 / 18, depth - 0.04);
        for (const k of [-half, half]) for (let i = 1; i < 6; i++) post(k, i * (depth - 0.04) / 6);
        for (const y of [G + 0.16, G + 1.08]) {
          s.rod(f.at(u - half, y, depth - 0.04), f.at(u + half, y, depth - 0.04), y > G + 0.5 ? 0.022 : 0.013, iron);
          for (const k of [-half, half]) s.rod(f.at(u + k, y, 0), f.at(u + k, y, depth - 0.04), y > G + 0.5 ? 0.022 : 0.013, iron);
        }
        // Balcony life: pots, sometimes a towel.
        const pots = Math.round(mood.density * 4 * random() + 0.3);
        for (let i = 0; i < pots; i++) {
          const at = f.at(u + mix(-0.85, 0.85, random()), G + 0.26, depth - 0.2), size = mix(0.1, 0.16, random());
          s.cylinder(size, size * 0.8, size * 1.7, at, s.material(pick(['#b3352b', '#c9a548', '#3f6fae', '#b5673f'])), 10);
          for (let k = 0; k < 3; k++) s.ball([size * 1.2, size * 1.3, size * 1.2], [at[0] + (random() - 0.5) * size * 1.6, at[1] + size * 1.5 + random() * size * 1.6, at[2] + (random() - 0.5) * size * 1.6], s.material(pick(['#3f8a3f', '#4f9a4a', '#2f7a4a']), { roughness: 0.9 }), 7);
        }
        if (random() < 0.35 + mood.density * 0.3) { const cloth = fbox(f, [0.5 + random() * 0.4, 0.6, 0.03], u + mix(-0.5, 0.5, random()), G + 0.8, depth - 0.01, s.material(pick(['#f4f1e8', '#e8573f', '#3f7fbf', '#f0c22a', '#e9a3c2']), { roughness: 1 })); cloth.rotation.z = (random() - 0.5) * 0.06; }
      }
    });
    const barMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.009, 0.009, 0.92, 5), iron, bars.length);
    bars.forEach((m, i) => barMesh.setMatrixAt(i, m)); barMesh.castShadow = true; root.add(barMesh);

    // Roof life.
    if (!ruin) {
      const tanks = 1 + Math.round(mood.density * 2);
      for (let i = 0; i < tanks; i++) {
        const x = mix(BX0 + 1, BX1 - 1.4, random()), z = mix(BZ0 + 0.8, BZ1 - 1.6, random());
        for (const k of [-0.35, 0.35]) s.box([0.12, 0.4, 0.9], [x + k, TOP + 0.2, z], s.material('#9a9488'));
        s.cylinder(0.55, 0.55, 0.95, [x, TOP + 0.88, z], s.material(pick(['#2a5fa8', '#1e1f22', '#2a5fa8']), { roughness: 0.5 }), 18);
        s.cylinder(0.2, 0.2, 0.06, [x, TOP + 1.38, z], s.material('#1e1f22'), 12);
      }
      const ax = BX0 + 1.2, az = BZ1 - 1.1;
      s.rod([ax, TOP, az], [ax, TOP + 2.4, az], 0.02, iron);
      for (let i = 0; i < 5; i++) s.rod([ax - 0.5 + i * 0.05, TOP + 1.7 + i * 0.15, az], [ax + 0.5 - i * 0.05, TOP + 1.7 + i * 0.15, az], 0.008, iron);
    } else {
      const tx = BX0 + 2.2, tz = BZ1 - 0.3;
      s.tube([[tx, TOP - 0.6, tz + 0.3], [tx + 0.1, TOP + 0.2, tz + 0.1], [tx - 0.2, TOP + 1.2, tz], [tx + 0.2, TOP + 2.2, tz - 0.2]], 0.07, s.material('#8a7a66'));
      for (const k of [-1, 1]) s.tube([[tx, TOP - 0.5, tz + 0.3], [tx + k * 0.3, TOP - 1.6, tz + 0.3], [tx + k * 0.2, TOP - 2.8, tz + 0.3]], 0.02, s.material('#8a7a66'));
      const leaves: { at: P; size: number; color: string }[] = [];
      for (let i = 0; i < 70; i++) leaves.push({ at: [tx + (random() - 0.5) * 2.4, TOP + 1.3 + random() * 1.6, tz - 0.2 + (random() - 0.5) * 1.6], size: 0.16 + random() * 0.16, color: pick(['#3f8a3f', '#4f9a4a', '#2f7a3a', '#6aa84a']) });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), leaves);
      // Rubble where the floors came down.
      const rubble: { at: P; size: number; color: string }[] = [];
      for (let i = 0; i < 60 + mood.density * 80; i++) { const r = random() ** 0.7 * 1.5, t = random() * 6.283; rubble.push({ at: [BX0 + 5.2 + Math.cos(t) * r, CURB + 0.05 + (1.5 - r) * 0.25 * random(), BZ0 + 3.8 + Math.sin(t) * r * 0.7], size: 0.06 + random() * 0.14, color: pick(['#a8553a', '#cbbfa8', '#b8654a', '#9a9488']) }); }
      s.scatter(new THREE.BoxGeometry(1.6, 0.8, 1), new THREE.MeshStandardMaterial({ roughness: 1 }), rubble);
    }

    // Condition set pieces.
    const timber = s.material('#a8885a', { roughness: 1 });
    if (a.condition === 'shored') {
      for (const z of [-2.6, -5.3]) {
        s.rod([1.9, 0.1, z], [BX1 + 0.12, 6.4, z], 0.11, timber);
        s.rod([1.5, 0.1, z], [BX1 + 0.12, 4.3, z], 0.09, timber);
        s.box([1.4, 0.14, 0.34], [1.5, 0.07, z], timber);
        s.box([0.14, 3.2, 0.3], [BX1 + 0.07, 5.2, z], timber);
        s.rod([1.0, 1.9, z], [0.2, 3.4, z], 0.06, timber);
      }
      s.box([0.1, 0.24, 3.6], [BX1 + 0.19, 6.0, -3.95], timber);
      const u0 = A.length / A.bays * 0.5;
      for (const k of [-0.75, 0.75]) fbox(A, [0.16, 3.1, 0.16], u0 + k, CURB + 1.55, -0.25, timber);
      fbox(A, [1.9, 0.16, 0.2], u0, CURB + 3.15, -0.25, timber);
    } else if (a.condition === 'restoring') {
      const u0 = 0.25, u1 = A.length / A.bays - 0.15;
      for (const u of [u0, (u0 + u1) / 2, u1]) for (const out of [0.95, 1.85]) s.rod(A.at(u, CURB, out), A.at(u, TOP - 0.3, out), 0.045, timber);
      for (const y of [2.1, 4.1, 6.0]) {
        fbox(A, [u1 - u0 + 0.3, 0.05, 0.95], (u0 + u1) / 2, y, 1.4, s.material('#c2a878', { roughness: 1 }));
        for (const out of [0.95, 1.85]) s.rod(A.at(u0 - 0.15, y - 0.06, out), A.at(u1 + 0.15, y - 0.06, out), 0.035, timber);
        s.rod(A.at(u0 - 0.15, y + 0.9, 1.85), A.at(u1 + 0.15, y + 0.9, 1.85), 0.03, timber);
      }
      s.rod(A.at(u0, CURB, 1.85), A.at(u1, 4.1, 1.85), 0.03, timber); s.rod(A.at(u1, 4.1, 1.85), A.at(u0, TOP - 0.4, 1.85), 0.03, timber);
      for (let i = 0; i < 3; i++) { const at = A.at(u0 + 0.5 + i * 0.4, 4.1 + 0.16, 1.4 + (random() - 0.5) * 0.4); s.cylinder(0.13, 0.11, 0.26, at, s.material(i ? '#e6e2d6' : wallHexes[0]), 12); }
      fbox(A, [1.2, 0.03, 1.6], u1 + 0.9, CURB + 0.02, 1.2, s.material('#e6e2d6', { roughness: 1 })).rotation.y = 0.2;
    }

    // Corner pier: plaque, sign or mural, and a wall lantern.
    const cornerU = A.length - 0.26;
    if (a.wall === 'plaque' || a.wall === 'ghost') {
      const name = pick(['OBRAPIA', 'SOL', 'LUZ', 'MERCED', 'AMARGURA', 'LAMPARILLA']);
      s.box([0.46, 0.22, 0.02], A.at(cornerU, 3.0, 0.31), s.material('#1f3f8a'));
      s.label(name, 0.42, 0.18, A.at(cornerU, 3.0, 0.325), '#f4f1e8', '#1f3f8a');
    }
    if (a.wall === 'ghost') {
      const sign = document.createElement('canvas'); sign.width = 512; sign.height = 128;
      const sc = sign.getContext('2d')!;
      sc.fillStyle = fade('#e9dfc4'); sc.fillRect(0, 0, 512, 128);
      sc.globalAlpha = mix(0.75, 0.3, mood.wear); sc.fillStyle = '#7a2a22'; sc.textAlign = 'center';
      sc.font = 'bold 66px serif'; sc.fillText(pick(['LA ESQUINA', 'EL ENCANTO', 'LA FAVORITA', 'BAR CUBANO']), 256, 72, 480);
      sc.font = 'bold 26px serif'; sc.fillText(pick(['VIVERES FINOS', 'CAFE  -  LICORES', 'DESDE 1921']), 256, 110, 480);
      sc.strokeStyle = '#7a2a22'; sc.lineWidth = 5; sc.strokeRect(8, 8, 496, 112);
      for (let i = 0; i < 30; i++) { sc.globalAlpha = 0.5; sc.fillStyle = fade('#e9dfc4'); sc.fillRect(random() * 512, random() * 128, 6 + random() * 40, 3 + random() * 12); }
      const map = new THREE.CanvasTexture(sign); map.colorSpace = THREE.SRGBColorSpace;
      const board = s.mesh(new THREE.PlaneGeometry(4.6, 0.62), new THREE.MeshStandardMaterial({ map, roughness: 1 }), B.at(B.length / 2, G - 0.5, 0.012));
      board.rotation.y = Math.PI / 2; board.castShadow = false;
    } else if (a.wall === 'mural') {
      const flag = document.createElement('canvas'); flag.width = 256; flag.height = 128;
      const fc = flag.getContext('2d')!;
      for (let i = 0; i < 5; i++) { fc.fillStyle = i % 2 ? '#f4f1e8' : '#2a4aa0'; fc.fillRect(0, i * 25.6, 256, 25.6); }
      fc.fillStyle = '#cf2a2a'; fc.beginPath(); fc.moveTo(0, 0); fc.lineTo(104, 64); fc.lineTo(0, 128); fc.fill();
      fc.fillStyle = '#f4f1e8'; fc.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 8 : 20, t = i * Math.PI / 5; fc.lineTo(36 + Math.sin(t) * r, 64 - Math.cos(t) * r); } fc.fill();
      for (let i = 0; i < mood.wear * 40; i++) { fc.fillStyle = `rgba(215,205,185,${0.3 + random() * 0.5})`; fc.fillRect(random() * 256, random() * 128, 4 + random() * 26, 3 + random() * 12); }
      const map = new THREE.CanvasTexture(flag); map.colorSpace = THREE.SRGBColorSpace;
      const mural = s.mesh(new THREE.PlaneGeometry(1.5, 0.75), new THREE.MeshStandardMaterial({ map, roughness: 1 }), [BX0 + 3.3, 2.9, BZ0 + 3.03]);
      mural.castShadow = false;
      const mural2 = s.mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshStandardMaterial({ map, roughness: 1 }), B.at(B.length - 0.02, 2.2, -2.2));
      mural2.visible = false;
      const big = s.mesh(new THREE.PlaneGeometry(0.44, 0.22), new THREE.MeshStandardMaterial({ map, roughness: 1 }), A.at(cornerU, 3.0, 0.312));
      big.castShadow = false;
    }
    s.rod(A.at(A.length + 0.02, 3.55, -0.25), [BX1 + 0.55, 3.75, BZ1 + 0.3], 0.02, iron);
    s.box([0.2, 0.3, 0.2], [BX1 + 0.55, 3.55, BZ1 + 0.3], s.material('#fff0c0', { emissive: '#ffd27a', emissiveIntensity: mix(0.15, 2.4, dusk), roughness: 0.3 }));
    s.mesh(new THREE.ConeGeometry(0.2, 0.14, 4), iron, [BX1 + 0.55, 3.78, BZ1 + 0.3]).rotation.y = Math.PI / 4;

    // Signs of life.
    const sway: { group: THREE.Object3D; gain: number; phase: number }[] = [];
    const hang = (at: P, gain: number) => { const part = new Sculpture(context); part.root.position.set(...at); root.add(part.root); sway.push({ group: part.root, gain, phase: random() * 6 }); return part; };
    const line = (from: P, to: P, sag: number, radius = 0.01, material: THREE.Material = s.material('#2a2a2c')) => {
      const points: P[] = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; points.push([mix(from[0], to[0], t), mix(from[1], to[1], t) - Math.sin(t * Math.PI) * sag, mix(from[2], to[2], t)]); }
      const tube = s.tube(points, radius, material); tube.castShadow = false;
      return points;
    };
    const pole = (x: number, z: number, height: number, lean: number) => {
      s.rod([x, 0, z], [x + lean, height, z], 0.07, s.material('#7a6850', { roughness: 1 }), 0.05);
      return [x + lean, height - 0.1, z] as P;
    };
    if (a.life === 'washing') {
      const top = pole(6.9, -4.4, 5.6, 0.15);
      for (const [dz, y] of [[0.6, 5.6], [-0.9, 5.2]] as const) {
        const from: P = [BX1 + 0.7, y, BZ1 - 2.6 + dz], to: P = [top[0], y - 0.2, top[2] + dz * 0.3];
        line(from, to, 0.35, 0.008, s.material('#e9e4d4'));
        const n = Math.round(mix(4, 9, mood.density));
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5 + (random() - 0.5) * 0.4) / n, kind = Math.floor(random() * 3), w = [0.5, 1.1, 0.4][kind], drop = [0.6, 1.0, 0.75][kind];
          const cloth = hang([mix(from[0], to[0], t), mix(from[1], to[1], t) - Math.sin(t * Math.PI) * 0.35, mix(from[2], to[2], t)], 1);
          const colour = cloth.material(pick(['#f4f1e8', '#e8573f', '#3f7fbf', '#f0c22a', '#7fbf8a', '#e9a3c2', '#f4f1e8', '#f4f1e8']), { roughness: 1 });
          cloth.box([w, drop, 0.02], [0, -drop / 2, 0], colour);
          if (kind === 0) for (const k of [-1, 1]) cloth.box([0.2, 0.26, 0.02], [k * (w / 2 + 0.06), -0.16, 0], colour).rotation.z = k * 0.5;
        }
      }
    } else if (a.life === 'game') {
      s.ball([0.11, 0.11, 0.11], [4.2 + random(), 0.11, -3.2 + random()], s.material(pick(['#f4f1e8', '#e8573f', '#f0c22a'])), 12);
      s.rod([3.2, 0.03, -1.0], [4.1, 0.03, -0.7], 0.025, s.material('#b9925a'));
      for (const [x, z] of [[6.5, -3.2], [4.2, -5.5], [1.9, -3.2]] as const) s.box([0.42, 0.3, 0.32], [x, 0.15, z], s.material(pick(['#c22d2a', '#e0a81c', '#1d4f9a']))).rotation.y = random();
    } else if (a.life === 'siesta') {
      const fur = s.material(pick(['#b58a55', '#d9c7a3', '#5b4634']), { roughness: 1 });
      const dx = -2.6, dz = 0.1;
      s.ball([0.34, 0.12, 0.18], [dx, CURB + 0.11, dz], fur, 12); s.ball([0.11, 0.085, 0.1], [dx + 0.36, CURB + 0.085, dz + 0.1], fur, 10); s.ball([0.07, 0.045, 0.045], [dx + 0.46, CURB + 0.06, dz + 0.13], fur, 8);
      s.tube([[dx - 0.3, CURB + 0.08, dz], [dx - 0.45, CURB + 0.04, dz + 0.1], [dx - 0.36, CURB + 0.03, dz + 0.24]], 0.02, fur);
      s.rod(A.at(0.62, CURB, 0.2), A.at(0.5, 1.6, 0.02), 0.016, s.material('#b9925a'));
      fbox(A, [0.32, 0.16, 0.06], 0.63, CURB + 0.1, 0.2, s.material('#c9a548'));
      s.cylinder(0.15, 0.12, 0.26, A.at(1.05, CURB + 0.13, 0.3), s.material('#2d6ea8'), 14);
    }

    if (a.overhead === 'cables') {
      const top = pole(6.9, -5.9, 8.2, -0.5);
      s.box([1.6, 0.1, 0.1], [top[0], top[1] - 0.3, top[2]], s.material('#7a6850'));
      s.cylinder(0.24, 0.24, 0.6, [top[0] + 0.3, top[1] - 1.1, top[2] + 0.1], s.material('#6f7a7a', { metalness: 0.4 }), 12);
      for (let i = 0; i < 3 + Math.round(mood.density * 4); i++) line([top[0] + (random() - 0.5) * 1.4, top[1] - 0.25, top[2]], [BX1 + 0.05, mix(6.2, 7.5, random()), BZ1 - random() * 3], 0.5 + random() * 0.9);
      for (let i = 0; i < 3; i++) line([top[0] + (random() - 0.5) * 1.4, top[1] - 0.25, top[2]], [mix(2, 7.4, random()), 7.4 + random(), SD / 2], 1 + random() * 0.8);
      for (let i = 0; i < 3; i++) line([BX0, G + 0.5 + random() * 0.4, BZ1 + 0.06], [BX1, G + 0.4 + random() * 0.5, BZ1 + 0.06], 0.12 + random() * 0.2);
    } else if (a.overhead === 'bunting') {
      const hues = ['#e83f3f', '#f0c22a', '#3fb0c8', '#f4f1e8', '#58b06a', '#e87a1e', '#c05ab8'];
      const flagGeometry = new THREE.ConeGeometry(0.16, 0.34, 3);
      const runs: [P, P][] = [[[BX1 + 0.3, 6.7, BZ1 + 0.3], pole(7.0, 5.6, 5.4, 0.1)], [[BX1 + 0.3, 6.7, BZ1 + 0.3], pole(7.0, -5.8, 5.8, 0.1)], [[BX0 + 0.5, 6.6, BZ1 + 0.75], pole(-6.9, 6.0, 5.0, -0.1)]];
      const matrices: THREE.Matrix4[] = [];
      for (const [from, to] of runs) {
        const points = line(from, to, 0.9, 0.006, s.material('#e9e4d4'));
        const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
        const count = Math.round(curve.getLength() / 0.42), yaw = Math.atan2(to[0] - from[0], to[2] - from[2]);
        for (let i = 1; i < count; i++) { const p = curve.getPoint(i / count); matrices.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y - 0.18, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI + (random() - 0.5) * 0.3, yaw + Math.PI / 2, 0, 'YXZ')), new THREE.Vector3(1, 1, 0.08))); }
      }
      const flags = new THREE.InstancedMesh(flagGeometry, new THREE.MeshStandardMaterial({ roughness: 0.9 }), matrices.length);
      matrices.forEach((m, i) => { flags.setMatrixAt(i, m); flags.setColorAt(i, new THREE.Color(hues[i % hues.length])); });
      flags.castShadow = true; root.add(flags);
    }

    // Street clutter grows with density: a drum bin, crates, litter by the kerb.
    if (mood.density > 0.3) {
      s.cylinder(0.29, 0.29, 0.88, [-7.0, 0.44, 1.1], s.material(pick(['#3f6fae', '#8a4a2a', '#5a6a5a']), { metalness: 0.3 }), 16);
      for (let i = 0; i < 5; i++) s.ball([0.14, 0.1, 0.14], [-7.0 + (random() - 0.5) * 0.4, 0.9 + random() * 0.12, 1.1 + (random() - 0.5) * 0.4], s.material(pick(['#e9e4d4', '#2a2a2c', '#c9a548'])), 6);
    }
    const litter: { at: P; size: number; color: string }[] = [];
    for (let i = 0; i < mood.density * 40 + mood.wear * 30; i++) { const along = random() < 0.5; litter.push({ at: along ? [mix(BX0, PX1, random()), 0.02, PZ1 + 0.1 + random() * 0.5] : [PX1 + 0.1 + random() * 0.5, 0.02, mix(BZ0, PZ1, random())], size: 0.03 + random() * 0.06, color: pick(['#cbbfa8', '#a8553a', '#e9e4d4', '#8a8478', '#6a8a4a']) }); }
    if (litter.length) s.scatter(new THREE.BoxGeometry(1.4, 0.5, 1), new THREE.MeshStandardMaterial({ roughness: 1 }), litter);

    // Where the cast stands: hero out in the low sun at the crossing, the rest along the kerbs.
    const slots: readonly (readonly [number, number, number, number, number])[] = [
      [3.0, 2.6, 0, 3.3, 5.5], [-4.3, -0.42, CURB, 1.15, 3.2], [-4.6, 4.2, 0, 2.3, 4.2], [4.0, -4.0, 0, 2.2, 4.5], [6.1, 5.2, 0, 1.3, 3], [-0.6, 5.6, 0, 1.3, 2.6],
    ];
    const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 300);
    const yaw = 33 * Math.PI / 180, pitch = 27 * Math.PI / 180;
    const direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));

    const windy = mix(0.03, 0.22, mood.energy);
    const world: World = {
      object: root, camera, background, ground, keyLight: key, capacity: slots.length,
      place(items: readonly Placeable[]) {
        const boxes: THREE.Box3[] = [new THREE.Box3(new THREE.Vector3(-SW / 2, -0.3, -SD / 2), new THREE.Vector3(SW / 2, 1, SD / 2))];
        items.forEach((item, index) => {
          const [x, z, lift, maxRadius, maxHeight] = slots[index % slots.length];
          const size = Math.max(item.height, item.radius * 2, 0.05);
          // True size, unless it would not fit the spot or would vanish at street scale.
          let scale = Math.min(1, maxRadius / Math.max(item.radius, 0.05), maxHeight / Math.max(item.height, 0.05));
          const least = item.hero ? 1.6 : 1.0;
          if (size * scale < least) scale = least / size;
          item.holder.scale.setScalar(scale);
          item.holder.position.set(x, lift, z);
          item.holder.rotation.y = (index === 1 ? 0.1 : index === 3 ? 0.9 : 0.42) + (context.random() - 0.5) * 0.4;
          item.holder.updateMatrixWorld(true);
          boxes.push(visibleBounds(item.holder));
        });
        boxes.push(visibleBounds(root));
        const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3());
        const centre = bounds.getCenter(new THREE.Vector3());
        camera.position.copy(centre).addScaledVector(direction, 90);
        camera.lookAt(centre);
        camera.updateMatrixWorld(true);
        const seen = new THREE.Box2(), corner = new THREE.Vector3();
        for (const box of boxes) for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) { corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse); seen.expandByPoint(new THREE.Vector2(corner.x, corner.y)); }
        const middle = seen.getCenter(new THREE.Vector2());
        const extent = Math.max(seen.getSize(new THREE.Vector2()).x, seen.getSize(new THREE.Vector2()).y) * 0.53;
        camera.translateX(middle.x); camera.translateY(middle.y);
        camera.left = camera.bottom = -extent; camera.right = camera.top = extent;
        camera.updateProjectionMatrix();
        const span = bounds.getSize(new THREE.Vector3()).length();
        key.target.position.copy(centre);
        key.position.copy(centre).addScaledVector(sun, span * 1.5);
        const shadow = key.shadow.camera;
        shadow.left = shadow.bottom = -span * 0.6; shadow.right = shadow.top = span * 0.6;
        shadow.near = 0.1; shadow.far = span * 4;
        shadow.updateProjectionMatrix();
      },
      update(_dt, time) { for (const item of sway) { item.group.rotation.x = Math.sin(time * 1.5 + item.phase) * windy * item.gain; item.group.rotation.z = Math.sin(time * 1.1 + item.phase * 2) * windy * 0.4 * item.gain; } },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
    return world;
  },
});
