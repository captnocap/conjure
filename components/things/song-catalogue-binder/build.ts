import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
type Lang = 'japanese' | 'korean' | 'english' | 'mixed';

function paint(w: number, h: number, draw: (c: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const TITLES = ['MY WAY', 'YESTERDAY', 'DANCING QUEEN', 'I WILL SURVIVE', 'LET IT BE', 'SWEET CAROLINE', 'CRAZY', 'TOP OF THE WORLD', 'UNCHAINED MELODY', 'HOTEL CALIFORNIA', 'STAND BY ME', 'BLUE MOON', 'TIME AFTER TIME', 'ISLANDS IN THE STREAM', 'AMAZING GRACE', 'LA BAMBA'];

/** Invented brush-like marks: no font on the machine is needed for the page to read as its script. */
function glyph(c: Ctx, lang: Exclude<Lang, 'mixed'>, x: number, y: number, size: number, random: () => number) {
  c.lineWidth = Math.max(1, size * 0.13);
  c.beginPath();
  if (lang === 'japanese') {
    const n = 2 + Math.floor(random() * 4);
    for (let i = 0; i < n; i++) {
      const kind = random();
      const a = random() * size, b = random() * size;
      if (kind < 0.4) { c.moveTo(x, y + a); c.lineTo(x + size, y + a); }
      else if (kind < 0.75) { c.moveTo(x + a, y); c.lineTo(x + a, y + size); }
      else { c.moveTo(x + a, y + b * 0.3); c.lineTo(x + size - a, y + size); }
    }
  } else {
    const r = size * 0.24;
    if (random() < 0.5) c.arc(x + r * 1.2, y + r * 1.3, r, 0, 7);
    else c.rect(x + r * 0.3, y + r * 0.4, r * 1.8, r * 1.6);
    c.moveTo(x + size * 0.8, y); c.lineTo(x + size * 0.8, y + size * (random() < 0.5 ? 1 : 0.6));
    if (random() < 0.6) { c.moveTo(x, y + size * 0.85); c.lineTo(x + size * 0.7, y + size * 0.85); }
  }
  c.stroke();
}

function drawPage(c: Ctx, w: number, h: number, lang: Lang, random: () => number, accent: string, circled: boolean, stain: number) {
  c.fillStyle = '#fbf8ee';
  c.fillRect(0, 0, w, h);
  c.fillStyle = accent;
  c.fillRect(0, 0, w, h * 0.075);
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#ffffff';
  const head = lang === 'mixed' ? (random() < 0.5 ? 'japanese' : 'korean') : lang;
  if (head === 'english') { c.font = `bold ${h * 0.045}px sans-serif`; c.textBaseline = 'middle'; c.fillText(`SONGS  ${'ABCDEFGHJKLMNPRSTW'[Math.floor(random() * 18)]}`, w * 0.05, h * 0.04); }
  else for (let i = 0; i < 4; i++) glyph(c, head, w * 0.05 + i * h * 0.055, h * 0.015, h * 0.042, random);
  const rows = 24, cols = 2, rh = (h * 0.88) / rows;
  const pick = { col: Math.floor(random() * cols), row: 3 + Math.floor(random() * (rows - 6)) };
  for (let col = 0; col < cols; col++)
    for (let row = 0; row < rows; row++) {
      const x = w * (0.04 + col * 0.48), y = h * 0.095 + row * rh;
      if (row % 2 === 0) { c.fillStyle = '#eef1e4'; c.fillRect(x - 4, y, w * 0.45, rh); }
      c.fillStyle = '#c0281e';
      c.font = `bold ${rh * 0.62}px monospace`;
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      c.fillText(String(10000 + Math.floor(random() * 89999)), x, y + rh / 2);
      const rowLang = lang === 'mixed' ? (['japanese', 'korean', 'english'] as const)[Math.floor(random() * 3)] : lang;
      c.fillStyle = c.strokeStyle = '#22242c';
      const tx = x + w * 0.12;
      if (rowLang === 'english') {
        c.font = `${rh * 0.56}px sans-serif`;
        c.fillText(TITLES[Math.floor(random() * TITLES.length)], tx, y + rh / 2, w * 0.32);
      } else {
        const n = 2 + Math.floor(random() * 6);
        for (let i = 0; i < n; i++) glyph(c, rowLang, tx + i * rh * 0.82, y + rh * 0.2, rh * 0.62, random);
        c.strokeStyle = '#8a8f9a';
        const m = 2 + Math.floor(random() * 3);
        for (let i = 0; i < m; i++) glyph(c, rowLang, x + w * 0.44 - (m - i) * rh * 0.6, y + rh * 0.3, rh * 0.42, random);
      }
      if (circled && col === pick.col && row === pick.row) {
        c.save();
        c.strokeStyle = '#e0201a';
        c.lineWidth = h * 0.012;
        c.beginPath(); c.ellipse(x + w * 0.21, y + rh / 2, w * 0.25, rh * 1.25, -0.04, 0.3, 6.6); c.stroke();
        c.beginPath();
        for (let k = 0; k < 11; k++) c.lineTo(x + w * 0.44 + Math.sin(k * 1.2566) * rh * 1.1, y - rh * 1.4 - Math.cos(k * 1.2566) * rh * 1.1);
        c.stroke();
        c.restore();
      }
    }
  if (stain > 0.5) {
    c.strokeStyle = `rgba(120,70,20,${mix(0.15, 0.5, stain)})`;
    c.lineWidth = h * 0.012;
    c.beginPath(); c.arc(w * mix(0.3, 0.7, random()), h * mix(0.3, 0.7, random()), h * 0.07, 0, 7); c.stroke();
  }
}

export default defineThing({
  questions: {
    language: choice('What language are the pages in?', {
      japanese: 'Japanese: dense columns of kanji and kana titles with five-digit codes.',
      korean: 'Korean: neat hangul blocks in tidy rows.',
      english: 'English: the thin foreign-songs section, capital-letter titles everyone half knows.',
      mixed: 'A patchwork international page where every row is a different script.',
    }),
    pose: choice('How is the binder lying?', {
      open: 'Splayed flat open in the middle, abandoned mid-search.',
      turning: 'Open, with a few stiff laminated pages standing up mid-turn.',
      closed: 'Shut, the remote parked on its cover, a slip poking out as a bookmark.',
    }),
    marked: choice('What has been marked in it?', {
      nothing: 'Nothing: only a short slip with a couple of numbers.',
      circled: 'A single song circled hard in red pen with a star beside it.',
      queue: 'A long slip of numbers, a whole night queued up, half of them crossed off.',
      torn: 'A page torn out, leaving a ragged stub at the rings and the page lying loose.',
      flags: 'A fringe of coloured sticky flags along the top edge, a regular’s favourites.',
    }),
    cover: choice('What is the cover like?', {
      navy: 'Navy vinyl with a white title panel.',
      red: 'Shiny red vinyl, slightly sticky.',
      black: 'Black leatherette with gold lettering, a hostess-bar book.',
      pink: 'Bubblegum pink plastic with stars.',
      kraft: 'Bare brown board with a handwritten label.',
    }),
    thickness: score('How thick is it?', ['A thin folder of new releases', 'An ordinary binder', 'Fat', 'A phone-book brick straining its rings']),
    remote: choice('What remote control is with it?', {
      stick: 'A long slim remote covered in tiny number keys.',
      panel: 'A chunky touch-panel song selector with a glowing screen and stylus.',
      none: 'No remote. Someone has walked off with it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const coverTint = { navy: '#22346e', red: '#c3262e', black: '#1b1b1f', pink: '#f27ab0', kraft: '#a8845a' }[a.cover];
    const cover = s.material(coverTint, { roughness: a.cover === 'kraft' ? 0.9 : 0.3 });
    const steel = s.material('#c2c7cc', { metalness: 0.9, roughness: 0.25 });
    const paper = s.material('#f2eedf', { roughness: 0.5 });
    const edge = s.material('#ddd8c6', { roughness: 0.8 });
    const accents = ['#2a8a7a', '#c8502a', '#3a5ab8', '#b03a78', '#6a8a2a'];
    const accent = accents[Math.floor(random() * accents.length)];
    const pw = 0.235, pd = 0.3, hw = 0.265, cd = 0.33;
    const T = mix(0.012, 0.075, a.thickness);
    const R = T * 0.5 + 0.014;
    const split = a.pose === 'closed' ? 1 : mix(0.25, 0.75, random());
    const tabTints = ['#f2c22a', '#f0703a', '#e84a7a', '#8a5ad0', '#3a9ae0', '#3ac09a', '#9ad03a', '#f2f2f2'];

    const pageMat = (circled: boolean) => {
      const map = paint(512, 640, (c, w, h) => drawPage(c, w, h, a.language, random, accent, circled, mood.wear));
      return new THREE.MeshStandardMaterial({ map, roughness: mix(0.18, 0.5, mood.wear), side: THREE.DoubleSide });
    };
    const curve = (u: number, t: number) => t * (0.55 + 0.45 * Math.sin(Math.PI * (0.15 + 0.6 * u)));

    /** One side's pile of pages, curving up from the rings; `dir` is -1 for left, 1 for right. */
    const stack = (dir: number, t: number, top: THREE.Material, y0: number) => {
      const shape = new THREE.Shape();
      const x0 = 0.018, x1 = x0 + pw;
      shape.moveTo(x0, 0);
      shape.lineTo(x1 + t * 0.25, 0);
      for (let i = 12; i >= 0; i--) shape.lineTo(x0 + (pw * i) / 12, curve(i / 12, t));
      const block = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: pd, bevelEnabled: false }), edge, [0, y0, -pd / 2]);
      block.scale.x = dir;
      if (dir < 0) (block.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      const sheet = new THREE.PlaneGeometry(pw, pd, 12, 1);
      sheet.rotateX(-Math.PI / 2);
      const pos = sheet.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = (pos.getX(i) * dir + pw / 2) / pw;
        pos.setY(i, curve(u, t) + 0.0006);
      }
      sheet.computeVertexNormals();
      const face = s.mesh(sheet, top, [dir * (x0 + pw / 2), y0, 0]);
      face.castShadow = false;
      // Index tabs stepping down the fore-edge.
      const n = Math.max(2, Math.round(t / 0.006));
      for (let i = 0; i < Math.min(n, 8); i++)
        s.box([0.016, 0.0012, 0.03], [dir * (x1 + 0.006 + (t * 0.25 * (n - i)) / n), y0 + 0.002 + (curve(1, t) * i) / n, -pd / 2 + 0.03 + ((i * 3 + (dir > 0 ? 1 : 0)) % 8) * 0.033], s.material(tabTints[(i + (dir > 0 ? 3 : 0)) % 8], { roughness: 0.4 }));
      return (u: number) => y0 + curve(u, t);
    };

    const scribble = (count: number, struck: number) =>
      paint(160, Math.max(160, count * 44), (c, w, h) => {
        c.fillStyle = '#fffdf0'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#2a3a9a'; c.strokeStyle = '#2a3a9a';
        c.font = 'italic bold 30px monospace'; c.textBaseline = 'middle';
        for (let i = 0; i < count; i++) {
          const y = 28 + i * ((h - 40) / count);
          c.save(); c.translate(14 + random() * 10, y); c.rotate((random() - 0.5) * 0.12);
          c.fillText(String(10000 + Math.floor(random() * 89999)), 0, 0);
          if (i < struck) { c.lineWidth = 3; c.beginPath(); c.moveTo(-4, 2); c.lineTo(110, -3 + random() * 6); c.stroke(); }
          c.restore();
        }
      });
    const slip = (count: number, struck: number, at: [number, number, number], yaw: number) => {
      const h = count > 4 ? 0.26 : 0.085;
      const m = s.mesh(new THREE.PlaneGeometry(0.07, h), new THREE.MeshStandardMaterial({ map: scribble(count, struck), roughness: 0.9, side: THREE.DoubleSide }), at);
      m.rotation.set(-Math.PI / 2, 0, yaw);
      return m;
    };

    const remote = (at: [number, number, number], yaw: number) => {
      const g = new THREE.Group();
      const put = (geometry: THREE.BufferGeometry, material: THREE.Material, p: [number, number, number]) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...p); mesh.castShadow = true; g.add(mesh); return mesh;
      };
      if (a.remote === 'stick') {
        put(new THREE.BoxGeometry(0.052, 0.018, 0.2), s.material('#2b2d33', { roughness: 0.5 }), [0, 0.009, 0]);
        const keys = paint(128, 480, (c, w, h) => {
          c.fillStyle = '#2b2d33'; c.fillRect(0, 0, w, h);
          for (let r = 0; r < 11; r++) for (let k = 0; k < 3; k++) {
            c.fillStyle = r === 0 ? ['#e02a2a', '#2b2d33', '#3ac06a'][k] : r > 7 ? ['#e8c22a', '#3a8ae0', '#e86a9a'][k] : '#d8dade';
            c.beginPath(); c.roundRect(14 + k * 36, 22 + r * 40, 28, 24, 6); c.fill();
          }
        });
        const top = put(new THREE.PlaneGeometry(0.048, 0.19), new THREE.MeshStandardMaterial({ map: keys, roughness: 0.6 }), [0, 0.0185, 0]);
        top.rotation.x = -Math.PI / 2; top.castShadow = false;
      } else {
        put(new THREE.BoxGeometry(0.25, 0.03, 0.18), s.material('#eceae4', { roughness: 0.45 }), [0, 0.015, 0]);
        const lcd = put(new THREE.PlaneGeometry(0.19, 0.13), new THREE.MeshStandardMaterial({ color: '#58c8ff', emissive: '#3aa8f0', emissiveIntensity: mix(0.6, 1.3, mood.cheer), roughness: 0.2 }), [-0.02, 0.0306, 0]);
        lcd.rotation.x = -Math.PI / 2; lcd.castShadow = false;
        for (let i = 0; i < 4; i++) put(new THREE.BoxGeometry(0.022, 0.004, 0.022), s.material(['#e02a2a', '#f2c22a', '#3ac06a', '#3a8ae0'][i]), [0.105, 0.031, -0.055 + i * 0.036]);
        put(new THREE.CylinderGeometry(0.004, 0.002, 0.12, 8), s.material('#33363c'), [0, 0.036, 0.1]).rotation.z = Math.PI / 2;
      }
      g.position.set(...at); g.rotation.y = yaw;
      s.root.add(g);
    };

    const pencil = (at: [number, number, number], yaw: number) => {
      const g = new THREE.Group();
      const len = mix(0.05, 0.09, random());
      const wood = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, len, 6), s.material(mood.cheer > 0.5 ? '#f2c22a' : '#2a7a4a', { roughness: 0.5 }));
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0038, 0.012, 6), s.material('#e8c9a0'));
      tip.position.y = len / 2 + 0.006;
      const lead = new THREE.Mesh(new THREE.ConeGeometry(0.0013, 0.004, 6), s.material('#2a2a2a'));
      lead.position.y = len / 2 + 0.011;
      wood.castShadow = true;
      g.add(wood, tip, lead);
      g.rotation.set(0, yaw, Math.PI / 2); g.position.set(at[0], at[1] + 0.004, at[2]);
      s.root.add(g);
    };

    const flags = (x0: number, y: number, dir: number) => {
      const n = 5 + Math.floor(random() * 5);
      for (let i = 0; i < n; i++) s.box([0.012, 0.0008, 0.03], [x0 + dir * (0.03 + random() * (pw - 0.05)), y - random() * y * 0.5, -pd / 2 - 0.008], new THREE.MeshStandardMaterial({ color: ['#ff5a8a', '#ffd02a', '#4ad0ff', '#7ae04a', '#ff8a2a'][i % 5], emissive: ['#ff5a8a', '#ffd02a', '#4ad0ff', '#7ae04a', '#ff8a2a'][i % 5], emissiveIntensity: 0.25, roughness: 0.5 }));
    };

    const tornPage = (at: [number, number, number], yaw: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(-pw / 2, -pd / 2); shape.lineTo(pw / 2, -pd / 2); shape.lineTo(pw / 2, pd / 2); shape.lineTo(-pw / 2, pd / 2);
      for (let i = 9; i >= 0; i--) shape.lineTo(-pw / 2 + random() * 0.02, -pd / 2 + (pd * i) / 10);
      const geometry = new THREE.ShapeGeometry(shape);
      const uv = geometry.attributes.uv, pos = geometry.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / pw + 0.5, pos.getY(i) / pd + 0.5);
      const m = s.mesh(geometry, pageMat(false), at);
      m.rotation.set(-Math.PI / 2, 0, yaw);
    };

    if (a.pose === 'closed') {
      // Shut: spine on the left, fore-edge tabs to the right.
      const h = T + 0.012;
      s.box([hw, 0.004, cd], [0, 0.002, 0], cover);
      s.box([hw, 0.004, cd], [0, h + 0.006, 0], cover).rotation.z = 0.0;
      s.box([0.005, h + 0.008, cd], [-hw / 2, h / 2 + 0.004, 0], cover);
      s.box([pw, T, pd], [0.006, 0.004 + T / 2 + 0.004, 0], edge);
      for (let i = 0; i < 8; i++) s.box([0.016, 0.0012, 0.03], [0.006 + pw / 2 + 0.006, 0.01 + (T * i) / 8, -pd / 2 + 0.03 + ((i * 3) % 8) * 0.033], s.material(tabTints[i], { roughness: 0.4 }));
      for (const z of [-0.1, 0, 0.1]) s.box([0.006, 0.012, 0.012], [-hw / 2 - 0.003, h / 2 + 0.004, z], steel);
      const topY = h + 0.0085;
      const title = s.label(a.cover === 'kraft' ? 'SONGS' : 'SONG BOOK', 0.17, 0.05, [0, topY, -0.06], a.cover === 'black' ? '#d8b24a' : '#22262e', a.cover === 'black' ? '#1b1b1f' : '#fbf8ee');
      title.rotation.x = -Math.PI / 2;
      const vol = s.label(`VOL. ${1 + Math.floor(random() * 9)}`, 0.08, 0.028, [0.05, topY, 0.0], '#ffffff', accent);
      vol.rotation.x = -Math.PI / 2;
      if (a.cover === 'pink') for (let i = 0; i < 6; i++) s.cylinder(0.01, 0.01, 0.0008, [(random() - 0.5) * 0.2, topY, 0.06 + random() * 0.08], s.material('#fff06a'), 5).rotation.y = random() * 3;
      if (a.remote !== 'none') remote([a.remote === 'panel' ? 0 : -0.04, topY, a.remote === 'panel' ? 0.06 : 0.04], a.remote === 'panel' ? 0.1 + random() * 0.2 : 0.4 + random() * 0.5);
      const mid = 0.008 + T * mix(0.3, 0.7, random());
      const count = a.marked === 'queue' ? 6 + Math.floor(random() * 3) : 2;
      slip(count, a.marked === 'queue' ? Math.floor(count * 0.6) : 0, [0.03, mid, pd / 2 + (count > 4 ? -0.05 : 0.005)], (random() - 0.5) * 0.3);
      if (a.marked === 'flags') flags(-pw / 2, 0.008 + T, 1);
      if (a.marked === 'torn') tornPage([hw / 2 + 0.11, 0.001, 0.05], 0.3 + random() * 0.5);
      if (a.marked === 'circled') {
        const ring = s.ring(0.025, 0.0025, [0.05, topY + 0.001, 0.0], s.material('#e0201a'));
        ring.rotation.x = Math.PI / 2; ring.scale.set(2, 0.9, 1);
      }
      pencil([hw / 2 + 0.03, 0, -0.08 + random() * 0.1], random() * 3);
    } else {
      // Covers flat, spine between them, ring mechanism standing up.
      const sp = R * 2 + 0.01;
      for (const dir of [-1, 1]) {
        const c = s.box([hw, 0.004, cd], [dir * (sp / 2 + hw / 2), 0.002, 0], cover);
        c.rotation.z = dir * mood.wear * 0.01;
      }
      s.box([sp, 0.004, cd], [0, 0.002, 0], cover);
      s.box([0.022, 0.006, cd - 0.05], [0, 0.007, 0], steel);
      for (const z of [-0.1, 0, 0.1]) s.ring(R, 0.0028, [0, R + 0.006, z], steel);
      for (const z of [-0.145, 0.145]) s.box([0.012, 0.012, 0.016], [0, 0.014, z], steel);
      const tl = Math.max(0.004, T * split), tr = Math.max(0.004, T * (1 - split));
      const yLeft = stack(-1, tl, pageMat(false), 0.004);
      const yRight = stack(1, tr, pageMat(a.marked === 'circled'), 0.004);

      if (a.pose === 'turning') {
        const n = 2 + Math.floor(random() * 3);
        for (let i = 0; i < n; i++) {
          const pivot = new THREE.Group();
          const sheet = new THREE.PlaneGeometry(pw, pd, 8, 1);
          sheet.rotateX(-Math.PI / 2);
          const pos = sheet.attributes.position;
          const bow = mix(0.01, 0.04, random());
          for (let k = 0; k < pos.count; k++) pos.setY(k, Math.sin(((pos.getX(k) + pw / 2) / pw) * Math.PI) * bow);
          sheet.computeVertexNormals();
          const page = new THREE.Mesh(sheet, pageMat(false));
          page.position.x = pw / 2 + 0.018;
          page.castShadow = true;
          pivot.add(page);
          pivot.position.set(0, R + 0.006, 0);
          pivot.rotation.z = mix(0.75, 2.3, (i + random() * 0.6) / n);
          s.root.add(pivot);
        }
      }
      if (a.marked === 'torn') {
        const shape = new THREE.Shape();
        shape.moveTo(0, -pd / 2); shape.lineTo(0, pd / 2);
        for (let i = 10; i >= 0; i--) shape.lineTo(0.012 + random() * 0.03, -pd / 2 + (pd * i) / 10);
        const stub = s.mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: '#fbf8ee', side: THREE.DoubleSide, roughness: 0.6 }), [0.02, yRight(0.05) + 0.002, 0]);
        stub.rotation.set(-Math.PI / 2, -0.25, 0);
        tornPage([sp / 2 + hw + 0.1, 0.001, 0.07], -0.35 - random() * 0.4);
      }
      if (a.marked === 'flags') { flags(0.018, yRight(0.6), 1); flags(-0.018, yLeft(0.6), -1); }
      const count = a.marked === 'queue' ? 6 + Math.floor(random() * 3) : 2;
      const sx = 0.018 + pw * (a.marked === 'queue' ? 0.72 : 0.6);
      slip(count, a.marked === 'queue' ? Math.floor(count * mix(0.3, 0.8, random())) : 0, [sx, yRight(0.7) + 0.003, a.marked === 'queue' ? 0.03 : 0.08], (random() - 0.5) * 0.4).rotation.y = -0.05;
      if (a.remote === 'stick') remote([-(0.018 + pw * 0.55), yLeft(0.55) - 0.001, 0.02], 0.3 + random() * 0.5);
      else if (a.remote === 'panel') remote([-(sp / 2 + hw + 0.15), 0, 0.02], 0.25 + random() * 0.3);
      pencil([0.018 + pw * 0.3, yRight(0.3), 0.09 + random() * 0.03], 0.4 + random() * 1.2);
    }

    // Wear: dog-eared corners lifting off the pile and a tape repair on the spine.
    if (mood.wear > 0.35 && a.pose !== 'closed') {
      const n = Math.round(mix(1, 6, (mood.wear - 0.35) / 0.65));
      for (let i = 0; i < n; i++) {
        const dir = i % 2 ? 1 : -1;
        const tri = new THREE.Shape();
        const size = 0.02 + random() * 0.03;
        tri.moveTo(0, 0); tri.lineTo(-size, 0); tri.lineTo(0, -size);
        const ear = s.mesh(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ color: '#e4dcc4', side: THREE.DoubleSide, roughness: 0.7 }), [dir * (0.018 + pw), 0.006 + T * 0.5 * (i / n) + 0.004, (i % 3 === 0 ? -1 : 1) * pd / 2]);
        ear.rotation.set(-Math.PI / 2 + (i % 3 === 0 ? -0.5 : 0.5), 0, dir > 0 ? (i % 3 === 0 ? Math.PI / 2 : 0) : (i % 3 === 0 ? Math.PI : -Math.PI / 2));
      }
      s.box([0.05, 0.0012, 0.07], [0.0, 0.0105, -0.06 + random() * 0.1], s.material('#d8c89a', { roughness: 0.4, transparent: true, opacity: 0.85 })).rotation.y = (random() - 0.5) * 0.3;
    }
    // A crowded night leaves more slips around.
    const extra = Math.round(mix(-1, 3, mood.density) * random());
    for (let i = 0; i < extra; i++) slip(2 + Math.floor(random() * 2), 1, [(random() - 0.5) * 0.5, 0.0012 + i * 0.0004, cd / 2 + 0.07 + random() * 0.05], (random() - 0.5) * 1.6);
    void paper;
    return s.finish();
  },
});
