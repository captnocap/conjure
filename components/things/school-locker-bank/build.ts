import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const COLOURS = {
  grey: 'Institutional battleship grey, every door the same.',
  red: 'Glossy pillar-box red, loud and American high school.',
  navy: 'Dark navy blue, sober and uniformed.',
  sage: 'Pale hospital green from decades ago.',
  mustard: 'Mustard yellow, a 1970s comprehensive.',
  chequered: 'Two colours alternating door by door, blue and cream.',
  patchwork: 'Mismatched doors repainted and replaced over the years, no two quite alike.',
} as const;
const BASE: Record<keyof typeof COLOURS, string[]> = {
  grey: ['#8d959a'], red: ['#b8302c'], navy: ['#2b3f66'], sage: ['#9db59a'], mustard: ['#c99a2e'],
  chequered: ['#3a6a9a', '#e3dcc4'], patchwork: ['#8d959a', '#b8302c', '#3a6a9a', '#c99a2e', '#9db59a', '#d8d2c0', '#5b7a4c'],
};

export default defineThing({
  questions: {
    colour: choice('What colour are the lockers?', COLOURS),
    tiers: choice('How are the doors arranged?', {
      full: 'Tall full-height doors, one locker per person.',
      half: 'Two tiers of half-height doors, stacked.',
      cubby: 'Three tiers of small square doors, for younger children.',
    }),
    length: score('How long is the run?', ['Three lockers', 'Five', 'Seven', 'Nine, a whole wall']),
    open: score('How many doors hang open?', ['Every door shut and locked', 'One left ajar', 'A few swinging', 'Most gaping open, cleared out']),
    stickers: choice('What is stuck on the doors?', {
      none: 'Nothing; bare paint.',
      few: 'A few peeling stickers and a name label or two.',
      plastered: 'Plastered with band, skate and cartoon stickers in every colour.',
      stars: 'Gold stars and smiley faces, the pride of a primary school.',
      notices: 'Taped paper notices: CLEAR YOUR LOCKER, with strips of yellowed tape.',
    }),
    graffiti: choice('What has been scrawled or scratched on them?', {
      none: 'Nothing at all.',
      hearts: 'Initials inside a heart in marker pen.',
      leavers: 'CLASS OF with a year, and signatures all over one door.',
      insult: 'A scratched insult, crossed out by someone else.',
      tally: 'Tally marks counting down days in groups of five.',
      bye: 'BYE in tall marker letters across one door.',
    }),
    holds: choice('If a locker is open, what does it still hold?', {
      nothing: 'Nothing but a bare coat hook and a wire hanger.',
      kitbag: 'A forgotten drawstring PE bag slumped at the bottom.',
      books: 'A leaning pile of exercise books and a ring binder.',
      photos: 'Photos and a little mirror still taped inside the door.',
      trainers: 'A pair of muddy trainers.',
      blazer: 'A school blazer left on the hook.',
      lunchbox: 'A lunchbox and a brown banana.',
      balloon: 'A sagging birthday balloon on a string.',
    }),
    top: choice('What has been left on top of the lockers?', {
      nothing: 'Nothing; a clear dusty top.',
      box: 'A taped cardboard box.',
      ball: 'A football that somebody threw up there.',
      books: 'A stack of textbooks.',
      cone: 'A stolen traffic cone.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const cols = Math.round(mix(3, 9, a.length));
    const tiers = { full: 1, half: 2, cubby: 3 }[a.tiers];
    const W = 0.3, D = 0.45, H = 1.74, PL = 0.1, T = 0.012;
    const cellH = H / tiers;
    const width = cols * W;
    const textures: THREE.Texture[] = [];

    const tint = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#8b8275'), wear * 0.22);
    const palette = BASE[a.colour];
    const colourAt = (c: number, r: number) => a.colour === 'patchwork' ? palette[Math.floor(random() * palette.length)] : palette[(c + r) % palette.length];
    const shell = s.material(a.colour === 'chequered' || a.colour === 'patchwork' ? '#7c8388' : palette[0], { metalness: 0.35, roughness: 0.5 });
    const inside = s.material('#4a4d4f', { roughness: 0.8 });
    const chrome = s.material('#cfd3d4', { metalness: 0.85, roughness: 0.3 });
    const black = s.material('#1c1d1f', { roughness: 0.5 });

    // Carcass: plinth, back, top, bottom and dividers, so every cell is a real hollow.
    s.box([width + 0.02, PL, D - 0.04], [0, PL / 2, -0.02], black);
    s.box([width + 2 * T, H, T], [0, PL + H / 2, -D / 2], inside);
    s.box([width + 2 * T, T * 2, D], [0, PL + H + T, 0], shell);
    for (let c = 0; c <= cols; c++) s.box([T, H, D], [-width / 2 + c * W, PL + H / 2, 0], c === 0 || c === cols ? shell : inside);
    for (let r = 0; r < tiers; r++) s.box([width, T, D], [0, PL + r * cellH + T / 2, 0], inside);

    const total = cols * tiers;
    const featured = Math.min(cols - 1, Math.floor(cols / 2)) * tiers + (tiers === 3 ? 1 : tiers === 2 ? 1 : 0);
    const graffitiDoor = (featured + tiers + total) % total === featured ? 0 : (featured + tiers) % total;
    const texH = tiers === 1 ? 512 : tiers === 2 ? 288 : 192;
    const STICKER = ['#f2d43a', '#e2413c', '#2f8fd8', '#3fb65a', '#f08a2c', '#f3f1ea', '#d85bb0', '#1d1d1f'];

    const paintDoor = (base: THREE.Color, number: number, isGraffiti: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = texH;
      const g = canvas.getContext('2d')!;
      const css = `#${base.getHexString()}`;
      const dark = `#${base.clone().multiplyScalar(0.45).getHexString()}`;
      const lite = `#${base.clone().lerp(new THREE.Color('#ffffff'), 0.25).getHexString()}`;
      g.fillStyle = css; g.fillRect(0, 0, 128, texH);
      // Pressed border.
      g.strokeStyle = dark; g.lineWidth = 3; g.strokeRect(5, 5, 118, texH - 10);
      g.strokeStyle = lite; g.lineWidth = 1; g.strokeRect(8, 8, 112, texH - 16);
      // Vent slits, top and (on tall doors) bottom.
      const vents = (y0: number, n: number) => { g.fillStyle = '#17181a'; for (let i = 0; i < n; i++) { g.fillRect(30, y0 + i * 9, 68, 4); g.fillStyle = dark; g.fillRect(30, y0 + i * 9 + 4, 68, 1); g.fillStyle = '#17181a'; } };
      vents(22, tiers === 3 ? 3 : 5);
      if (tiers === 1) vents(texH - 70, 5);
      // Number plate.
      const py = tiers === 3 ? 58 : 80;
      g.fillStyle = '#e9e4d2'; g.fillRect(44, py, 40, 18);
      g.strokeStyle = '#3a3a3a'; g.lineWidth = 1; g.strokeRect(44.5, py + 0.5, 39, 17);
      g.fillStyle = '#1e1e1e'; g.font = 'bold 14px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(number), 64, py + 10);
      const bodyTop = py + 26, bodyH = texH - bodyTop - (tiers === 1 ? 80 : 14);
      // Stickers.
      const count = { none: 0, few: random() < 0.45 ? 1 + Math.floor(random() * 2) : 0, plastered: 5 + Math.floor(random() * 6), stars: 2 + Math.floor(random() * 4), notices: random() < 0.6 ? 1 : 0 }[a.stickers];
      for (let i = 0; i < count; i++) {
        const x = 22 + random() * 84, y = bodyTop + random() * Math.max(10, bodyH);
        g.save(); g.translate(x, y); g.rotate((random() - 0.5) * 0.9);
        const col = STICKER[Math.floor(random() * STICKER.length)];
        if (a.stickers === 'notices') {
          g.fillStyle = '#efe9d6'; g.fillRect(-34, -24, 68, 48);
          g.fillStyle = '#2a2a2a'; g.font = 'bold 9px monospace'; g.fillText('CLEAR YOUR', 0, -10); g.fillText('LOCKER', 0, 2);
          g.fillRect(-24, 12, 48, 2);
          g.fillStyle = '#d9c27a'; g.fillRect(-40, -28, 16, 7); g.fillRect(24, -28, 16, 7);
        } else if (a.stickers === 'stars') {
          g.fillStyle = random() < 0.6 ? '#f0c12a' : '#f6e04a';
          if (random() < 0.6) { g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 5 : 12, t = k * Math.PI / 5; g.lineTo(Math.sin(t) * r, -Math.cos(t) * r); } g.fill(); }
          else { g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill(); g.fillStyle = '#1e1e1e'; g.fillRect(-5, -4, 3, 3); g.fillRect(3, -4, 3, 3); g.beginPath(); g.arc(0, 1, 6, 0.2, 2.9); g.lineWidth = 1.5; g.strokeStyle = '#1e1e1e'; g.stroke(); }
        } else {
          g.fillStyle = col;
          const kind = Math.floor(random() * 3);
          if (kind === 0) { g.beginPath(); g.arc(0, 0, 9 + random() * 7, 0, 7); g.fill(); g.fillStyle = STICKER[Math.floor(random() * STICKER.length)]; g.beginPath(); g.arc(0, 0, 4, 0, 7); g.fill(); }
          else if (kind === 1) { g.fillRect(-18, -8, 36, 16); g.fillStyle = col === '#1d1d1f' ? '#f3f1ea' : '#1d1d1f'; g.fillRect(-13, -2, 26, 3); }
          else { g.fillRect(-11, -14, 22, 28); g.fillStyle = '#f3f1ea'; g.fillRect(-7, -9, 14, 10); }
          if (wear > 0.4 && random() < wear) { g.fillStyle = css; g.beginPath(); g.moveTo(4, -16); g.lineTo(20, -16); g.lineTo(20, 2); g.fill(); }
        }
        g.restore();
      }
      if (isGraffiti && a.graffiti !== 'none') {
        const cy = bodyTop + bodyH * 0.5;
        g.save(); g.translate(64, cy); g.rotate((random() - 0.5) * 0.25);
        const ink = base.getHSL({ h: 0, s: 0, l: 0 }).l > 0.45 ? '#16161a' : '#f1efe6';
        g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 3; g.lineCap = 'round';
        if (a.graffiti === 'hearts') {
          g.beginPath(); g.moveTo(0, 26); g.bezierCurveTo(-52, -8, -22, -44, 0, -16); g.bezierCurveTo(22, -44, 52, -8, 0, 26); g.stroke();
          g.font = 'bold 15px monospace'; g.fillText('J+M', 0, -4);
        } else if (a.graffiti === 'leavers') {
          g.font = 'bold 17px monospace'; g.fillText('CLASS OF', 0, -20); g.font = 'bold 30px monospace'; g.fillText(`'${String(90 + Math.floor(random() * 10))}`, 0, 8);
          g.lineWidth = 1.5; for (let i = 0; i < 6; i++) { g.beginPath(); let x = -44 + random() * 50, y = 30 + i * 8; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += 6; g.lineTo(x, y + (random() - 0.5) * 8); } g.stroke(); }
        } else if (a.graffiti === 'insult') {
          g.font = 'bold 20px monospace'; g.fillText('LOSER', 0, 0); g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-42, -8 + i * 5 + random() * 4); g.lineTo(42, -6 + i * 5 + random() * 4); g.stroke(); }
        } else if (a.graffiti === 'tally') {
          const groups = 3 + Math.floor(random() * 5);
          for (let i = 0; i < groups; i++) { const x = -38 + (i % 3) * 30, y = -24 + Math.floor(i / 3) * 30; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x + k * 5, y); g.lineTo(x + k * 5 + 1, y + 20); g.stroke(); } g.beginPath(); g.moveTo(x - 4, y + 16); g.lineTo(x + 20, y + 3); g.stroke(); }
        } else {
          g.font = 'bold 44px monospace'; g.rotate(-Math.PI / 2 * (tiers === 1 ? 1 : 0)); g.fillText('BYE', 0, 0);
        }
        g.restore();
      }
      // Dents, scuffs and rust grow with wear.
      const marks = Math.floor(wear * 14 + random() * 2);
      for (let i = 0; i < marks; i++) {
        const x = random() * 128, y = random() * texH, r = 6 + random() * 16;
        const grad = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
        grad.addColorStop(0, 'rgba(255,255,255,0.22)'); grad.addColorStop(0.6, 'rgba(0,0,0,0.22)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad; g.fillRect(x - r, y - r, r * 2, r * 2);
        if (random() < wear) { g.fillStyle = `rgba(122,62,28,${0.25 + random() * 0.45})`; g.beginPath(); g.ellipse(random() * 128, texH - random() * texH * 0.35, 3 + random() * 9, 2 + random() * 5, 0, 0, 7); g.fill(); }
        g.strokeStyle = 'rgba(230,230,225,0.35)'; g.lineWidth = 1; g.beginPath(); const sx = random() * 128, sy = random() * texH; g.moveTo(sx, sy); g.lineTo(sx + (random() - 0.5) * 50, sy + (random() - 0.5) * 30); g.stroke();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      return texture;
    };

    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    const openChance = a.open < 0.2 ? 0 : mix(0.0, 0.75, (a.open - 0.2) / 0.8);
    let number = 100 + Math.floor(random() * 300);
    const missing = wear > 0.7 && total > 4 ? Math.floor(random() * total) : -1;
    let featuredAngle = 0;
    for (let c = 0; c < cols; c++) for (let r = 0; r < tiers; r++) {
      const index = c * tiers + r;
      const x0 = -width / 2 + c * W, y0 = PL + r * cellH;
      const isFeatured = index === featured && a.open >= 0.18;
      number += 1;
      if (index === missing && !isFeatured) { s.rod([x0 + 0.02, y0 + 0.2, D / 2], [x0 + 0.02, y0 + 0.26, D / 2], 0.008, chrome); continue; }
      const base = tint(colourAt(c, r));
      const face = new THREE.MeshStandardMaterial({ map: paintDoor(base, number, index === graffitiDoor), metalness: 0.3, roughness: 0.48 + wear * 0.3 });
      const edge = new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.8), metalness: 0.3, roughness: 0.6 });
      const back = new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.7), metalness: 0.2, roughness: 0.7 });
      const hinge = new THREE.Group();
      hinge.position.set(x0 + 0.004, y0, D / 2);
      const dw = W - 0.012, dh = cellH - 0.014;
      add(hinge, new THREE.BoxGeometry(dw, dh, 0.014), [edge, edge, edge, edge, face, back] as unknown as THREE.Material, [dw / 2 + 0.002, dh / 2 + 0.007, 0.007]);
      // Recessed handle and, sometimes, a combination padlock hanging from it.
      const hy = tiers === 1 ? 0.9 - y0 + PL : dh * 0.5;
      add(hinge, new THREE.BoxGeometry(0.03, 0.09, 0.012), chrome, [dw - 0.035, hy, 0.02]);
      const open = isFeatured || random() < openChance;
      const angle = isFeatured ? mix(1.7, 2.2, random()) : open ? mix(0.5, 2.3, random()) : a.open > 0.1 && random() < 0.12 + wear * 0.2 ? mix(0.06, 0.2, random()) : 0;
      if (isFeatured) featuredAngle = angle;
      if (!open && random() < mix(0.8, 0.35, a.open)) {
        const lock = add(hinge, new THREE.CylinderGeometry(0.024, 0.024, 0.018, 16), black, [dw - 0.035, hy - 0.075, 0.03]);
        lock.rotation.x = Math.PI / 2;
        const dial = add(hinge, new THREE.CylinderGeometry(0.016, 0.016, 0.008, 14), chrome, [dw - 0.035, hy - 0.075, 0.042]);
        dial.rotation.x = Math.PI / 2;
        add(hinge, new THREE.TorusGeometry(0.014, 0.004, 6, 14, Math.PI), chrome, [dw - 0.035, hy - 0.05, 0.03]);
      }
      hinge.rotation.y = -angle;
      s.root.add(hinge);

      if (isFeatured) {
        if (a.holds === 'photos') {
          const inner = new THREE.Group();
          hinge.add(inner);
          const colours = ['#e8dcc0', '#b9d2e2', '#e6c3b4', '#cfe0c0'];
          for (let i = 0; i < 4; i++) {
            const photo = add(inner, new THREE.PlaneGeometry(0.075, 0.095), new THREE.MeshStandardMaterial({ color: colours[i], roughness: 0.8, side: THREE.DoubleSide }), [0.07 + (i % 2) * 0.12 + random() * 0.02, dh * 0.72 - Math.floor(i / 2) * 0.13, -0.002]);
            photo.rotation.set(0, Math.PI, (random() - 0.5) * 0.4);
            const pic = add(inner, new THREE.PlaneGeometry(0.055, 0.06), new THREE.MeshStandardMaterial({ color: ['#5a6f8a', '#8a5a4a', '#4f7a5a', '#7a6a8f'][i], roughness: 0.8, side: THREE.DoubleSide }), [photo.position.x, photo.position.y + 0.01, -0.004]);
            pic.rotation.copy(photo.rotation);
          }
          const mirror = add(inner, new THREE.PlaneGeometry(0.11, 0.14), new THREE.MeshStandardMaterial({ color: '#dfeef2', metalness: 0.9, roughness: 0.08, side: THREE.DoubleSide }), [dw / 2, dh * 0.38, -0.003]);
          mirror.rotation.y = Math.PI;
        }
      }
    }

    // Inside every cell: a shelf and a hook, cheap and instanced.
    if (tiers === 1) for (let c = 0; c < cols; c++) s.box([W - T, T, D - 0.04], [-width / 2 + (c + 0.5) * W, PL + H - 0.3, -0.01], inside);

    // What the featured locker still holds.
    {
      const c = Math.floor(featured / tiers), r = featured % tiers;
      const cx = -width / 2 + (c + 0.5) * W, floorY = PL + r * cellH + T, top = PL + (r + 1) * cellH - (tiers === 1 ? 0.3 : 0);
      const hookY = top - 0.06;
      s.rod([cx, hookY, -D / 2 + 0.01], [cx, hookY - 0.02, -D / 2 + 0.07], 0.006, chrome);
      void featuredAngle;
      if (a.open >= 0.18) {
        if (a.holds === 'nothing') {
          s.ring(0.012, 0.003, [cx, hookY - 0.035, -D / 2 + 0.07], chrome);
          const hang = s.material('#b9bdbf', { metalness: 0.8, roughness: 0.3 });
          s.rod([cx, hookY - 0.05, -0.1], [cx - 0.11, hookY - 0.13, -0.1], 0.004, hang);
          s.rod([cx, hookY - 0.05, -0.1], [cx + 0.11, hookY - 0.13, -0.1], 0.004, hang);
          s.rod([cx - 0.11, hookY - 0.13, -0.1], [cx + 0.11, hookY - 0.13, -0.1], 0.004, hang);
        } else if (a.holds === 'kitbag') {
          const bag = s.material(mood.cheer > 0.5 ? '#d8452f' : '#2f4f8a', { roughness: 0.9 });
          s.ball([0.12, 0.15, 0.13], [cx, floorY + 0.13, 0.02], bag, 14).rotation.z = 0.2;
          s.cylinder(0.03, 0.07, 0.07, [cx + 0.02, floorY + 0.29, 0.02], bag, 10);
          s.tube([[cx + 0.02, floorY + 0.32, 0.02], [cx + 0.1, floorY + 0.36, 0.1], [cx + 0.05, floorY + 0.12, 0.2], [cx - 0.02, floorY + 0.02, 0.24]], 0.005, s.material('#f1eee2'));
        } else if (a.holds === 'books') {
          const covers = ['#c9483b', '#3d74a8', '#e0b73c', '#4c9a63', '#e9e3d0', '#7a4f9a'];
          let y = floorY;
          const n = 5 + Math.floor(random() * 5);
          for (let i = 0; i < n; i++) { const t = 0.012 + random() * 0.02; const b = s.box([0.2, t, 0.27], [cx + (random() - 0.5) * 0.03, y + t / 2, 0.02], s.material(covers[i % covers.length])); b.rotation.y = (random() - 0.5) * 0.35; y += t; }
          const binder = s.box([0.05, 0.3, 0.26], [cx + 0.08, y + 0.15, 0.0], s.material('#23272e'));
          binder.rotation.z = 0.25;
        } else if (a.holds === 'trainers') {
          const shoe = s.material('#eceae0', { roughness: 0.85 }), sole = s.material('#6a4a2f');
          for (const side of [-1, 1]) {
            const z = 0.03 + side * 0.02, x = cx + side * 0.065;
            s.box([0.09, 0.02, 0.26], [x, floorY + 0.01, z], sole);
            s.ball([0.045, 0.05, 0.09], [x, floorY + 0.06, z + 0.06], shoe, 12);
            s.box([0.085, 0.09, 0.12], [x, floorY + 0.065, z - 0.06], shoe);
            s.box([0.06, 0.012, 0.09], [x, floorY + 0.085, z + 0.05], s.material(mood.cheer > 0.5 ? '#e2413c' : '#2f4f8a'));
          }
        } else if (a.holds === 'blazer') {
          const cloth = s.material(a.colour === 'navy' ? '#6a2030' : '#1f2c4a', { roughness: 0.95 });
          s.box([0.24, 0.5, 0.07], [cx, hookY - 0.33, -0.08], cloth);
          s.box([0.27, 0.07, 0.08], [cx, hookY - 0.08, -0.08], cloth);
          for (const side of [-1, 1]) s.box([0.06, 0.42, 0.06], [cx + side * 0.115, hookY - 0.3, -0.06], cloth).rotation.z = side * 0.06;
          s.box([0.05, 0.06, 0.004], [cx + 0.06, hookY - 0.22, -0.043], s.material('#d8b23a', { metalness: 0.4 }));
          s.box([0.03, 0.22, 0.004], [cx, hookY - 0.2, -0.043], s.material('#e8e4d8'));
        } else if (a.holds === 'lunchbox') {
          const box = s.material(mood.cheer > 0.5 ? '#3aa0d8' : '#d8452f', { roughness: 0.4 });
          s.box([0.2, 0.09, 0.15], [cx, floorY + 0.045, 0.08], box);
          s.box([0.21, 0.02, 0.16], [cx, floorY + 0.1, 0.08], s.material('#f1eee2'));
          s.box([0.08, 0.02, 0.02], [cx, floorY + 0.125, 0.08], s.material('#f1eee2'));
          s.tube([[cx - 0.07, floorY + 0.14, 0.12], [cx - 0.02, floorY + 0.125, 0.15], [cx + 0.05, floorY + 0.13, 0.16], [cx + 0.09, floorY + 0.16, 0.13]], 0.017, s.material('#4a3620', { roughness: 0.9 }));
        } else if (a.holds === 'balloon') {
          const sag = mix(0.75, 0.25, wear);
          const by = floorY + 0.2 + sag * (top - floorY - 0.45);
          const skin = s.material(mood.cheer > 0.5 ? '#e8478a' : '#c8b23a', { roughness: 0.3 + wear * 0.4 });
          s.ball([0.11, 0.13 * mix(1, 0.8, wear), 0.11], [cx, by, 0.02], skin, 16);
          s.cylinder(0.004, 0.018, 0.03, [cx, by - 0.135, 0.02], skin, 8);
          s.tube([[cx, by - 0.15, 0.02], [cx + 0.03, (by + floorY) / 2, 0.06], [cx - 0.02, floorY + 0.03, 0.1], [cx + 0.05, floorY + 0.01, 0.2]], 0.003, s.material('#f1eee2'));
        }
      }
    }

    // Left on top.
    const topY = PL + H + T * 2;
    const tx = (random() - 0.5) * (width - 0.6);
    if (a.top === 'box') {
      const card = s.material('#b98f5a', { roughness: 0.95 });
      const b = s.box([0.42, 0.26, 0.32], [tx, topY + 0.13, -0.03], card); b.rotation.y = (random() - 0.5) * 0.5;
      const tape = s.box([0.43, 0.262, 0.05], [tx, topY + 0.131, -0.03], s.material('#d9c9a0')); tape.rotation.y = b.rotation.y;
    } else if (a.top === 'ball') {
      const flat = mix(1, 0.6, wear);
      s.ball([0.11, 0.11 * flat, 0.11], [tx, topY + 0.11 * flat, 0], s.material('#f0ede4', { roughness: 0.6 }), 18);
      for (let i = 0; i < 5; i++) { const t = i * 1.257; s.ball([0.026, 0.026 * flat, 0.01], [tx + Math.sin(t) * 0.07, topY + (0.11 + Math.cos(t) * 0.07) * flat, 0.083], black, 8); }
      s.ball([0.026, 0.026 * flat, 0.01], [tx, topY + 0.11 * flat, 0.107], black, 8);
    } else if (a.top === 'books') {
      const covers = ['#7a2f2a', '#2f4f6a', '#c9a63a', '#3f6f4f', '#5a4a6a'];
      let y = topY; const n = 4 + Math.floor(random() * 5);
      for (let i = 0; i < n; i++) { const t = 0.03 + random() * 0.03; const b = s.box([0.21, t, 0.28], [tx + (random() - 0.5) * 0.04, y + t / 2, 0], s.material(covers[i % covers.length])); b.rotation.y = (random() - 0.5) * 0.4; y += t; }
    } else if (a.top === 'cone') {
      const orange = s.material('#f06a1c', { roughness: 0.6 });
      s.box([0.3, 0.03, 0.3], [tx, topY + 0.015, 0], orange);
      s.cylinder(0.03, 0.12, 0.5, [tx, topY + 0.28, 0], orange, 18);
      s.cylinder(0.06, 0.085, 0.12, [tx, topY + 0.32, 0], s.material('#f4f1e6'), 18);
    }

    const thing = s.finish();
    const dispose = thing.dispose;
    return { ...thing, dispose: () => { for (const t of textures) t.dispose(); dispose(); } };
  },
});
