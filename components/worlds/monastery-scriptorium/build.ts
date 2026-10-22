import * as THREE from 'three';
import { type Placeable, type World, Sculpture, choice, defineWorld, disposeTree, mix, visibleBounds } from '@conjure/kit';

type Rand = () => number;
type P3 = [number, number, number];

const STONES = {
  limestone: 'Pale honey limestone ashlar, soft and warm even in cold light.',
  granite: 'Hard grey granite blocks, a northern house built to last.',
  whitewash: 'Whitewashed plaster ruled with thin red lines to imitate masonry.',
  sandstone: 'Rose-red sandstone, crumbling a little at the edges.',
} as const;
const STONE_TONE: Record<keyof typeof STONES, [string, string]> = {
  limestone: ['#cfc4a8', '#8f856c'], granite: ['#a4a7a6', '#666a6b'], whitewash: ['#e6e1d2', '#b0463a'], sandstone: ['#bf8f7b', '#7a5346'],
};

function wallTexture(random: Rand, kind: keyof typeof STONES, wear: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const g = canvas.getContext('2d')!;
  const [base, joint] = STONE_TONE[kind];
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  const rows = 8, rowH = 64;
  for (let row = 0; row < rows; row++) {
    let x = -random() * 120;
    while (x < 512) {
      const w = 80 + random() * 100;
      if (kind !== 'whitewash') {
        const shade = (random() - 0.5) * 0.11;
        g.fillStyle = '#' + new THREE.Color(base).offsetHSL((random() - 0.5) * 0.015, 0, shade).getHexString();
        g.fillRect(x, row * rowH, w, rowH);
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.fillRect(x + 2, row * rowH + 2, w - 4, 3);
      }
      g.fillStyle = joint;
      g.fillRect(x, row * rowH, kind === 'whitewash' ? 2 : 3, rowH);
      if (kind === 'whitewash') g.fillRect(x + 6, row * rowH, 2, rowH);
      x += w;
    }
    g.fillStyle = joint;
    g.fillRect(0, row * rowH, 512, kind === 'whitewash' ? 2 : 3);
    if (kind === 'whitewash') g.fillRect(0, row * rowH + 6, 512, 2);
  }
  for (let i = 0; i < 10 + wear * 40; i++) {
    g.fillStyle = `rgba(60,55,45,${0.03 + random() * 0.06 * (0.3 + wear)})`;
    g.beginPath();
    g.ellipse(random() * 512, random() * 512, 20 + random() * 80, 30 + random() * 120, 0, 0, 7);
    g.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const FLOORS = {
  flags: 'Big worn stone flags, cold underfoot.',
  herringbone: 'Thin bricks laid in herringbone, red and dusty.',
  tiles: 'Encaustic tiles in a red and ochre chequer.',
  rushes: 'Beaten earth strewn with rushes against the cold.',
} as const;

function floorTexture(random: Rand, kind: keyof typeof FLOORS, wear: number, stone: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const g = canvas.getContext('2d')!;
  if (kind === 'flags') {
    g.fillStyle = '#5f5a50';
    g.fillRect(0, 0, 512, 512);
    const base = new THREE.Color(stone).lerp(new THREE.Color('#8d8a82'), 0.55);
    for (let row = 0; row < 4; row++) {
      let x = -random() * 80;
      while (x < 512) {
        const w = 110 + random() * 110;
        g.fillStyle = '#' + base.clone().offsetHSL(0, 0, (random() - 0.5) * 0.09).getHexString();
        g.fillRect(x + 2, row * 128 + 2, w - 4, 124);
        x += w;
      }
    }
  } else if (kind === 'herringbone') {
    g.fillStyle = '#6a4a3c';
    g.fillRect(0, 0, 512, 512);
    const L = 64, Wd = 32;
    for (let i = -2; i < 10; i++) for (let j = -2; j < 18; j++) {
      const horizontal = (i + j) % 2 === 0;
      const x = i * L + ((j % 4) < 2 ? 0 : 0) + Math.floor(j / 2) * Wd - 64, y = j * Wd - Math.floor(j / 2) * 0;
      g.fillStyle = '#' + new THREE.Color('#a8604a').offsetHSL((random() - 0.5) * 0.02, 0, (random() - 0.5) * 0.1).getHexString();
      if (horizontal) g.fillRect(((x % 576) + 576) % 576 - 64 + 1, y + 1, L - 2, Wd - 2);
      else g.fillRect(((x % 576) + 576) % 576 - 64 + 1, y + 1, Wd - 2, L - 2);
    }
  } else if (kind === 'tiles') {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const red = (i + j) % 2 === 0;
      g.fillStyle = '#' + new THREE.Color(red ? '#9c4a36' : '#c9a05a').offsetHSL(0, 0, (random() - 0.5) * 0.06).getHexString();
      g.fillRect(i * 64, j * 64, 64, 64);
      g.fillStyle = red ? '#c9a05a' : '#9c4a36';
      g.beginPath();
      for (let k = 0; k < 4; k++) g.arc(i * 64 + 32 + Math.cos(k * 1.571) * 10, j * 64 + 32 + Math.sin(k * 1.571) * 10, 8, 0, 7);
      g.fill();
      g.strokeStyle = '#4a342a';
      g.lineWidth = 2;
      g.strokeRect(i * 64, j * 64, 64, 64);
    }
  } else {
    g.fillStyle = '#8a7558';
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1400; i++) {
      const x = random() * 512, y = random() * 512, angle = random() * Math.PI, len = 20 + random() * 50;
      g.strokeStyle = ['#b7a45e', '#9c9a52', '#c9b877', '#7f8a4a'][Math.floor(random() * 4)];
      g.lineWidth = 1.5 + random() * 2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len); g.stroke();
    }
  }
  for (let i = 0; i < 8 + wear * 30; i++) {
    g.fillStyle = `rgba(40,35,30,${0.04 + random() * 0.07})`;
    g.beginPath(); g.ellipse(random() * 512, random() * 512, 20 + random() * 70, 16 + random() * 50, random() * 3, 0, 7); g.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function glassTexture(random: Rand, night: boolean, cheer: number, broken: number, linen: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 384;
  const g = canvas.getContext('2d')!;
  const sky = g.createLinearGradient(0, 0, 0, 384);
  if (night) { sky.addColorStop(0, '#39466b'); sky.addColorStop(1, '#232a44'); }
  else if (linen) { sky.addColorStop(0, '#f3ead0'); sky.addColorStop(1, '#e0d3ae'); }
  else { sky.addColorStop(0, '#f4f8f4'); sky.addColorStop(1, '#cfdcd6'); }
  g.fillStyle = sky;
  g.fillRect(0, 0, 128, 384);
  if (!linen) {
    const step = 32;
    for (let i = -1; i < 5; i++) for (let j = -1; j < 26; j++) {
      const cx = i * step + (j % 2 ? step / 2 : 0), cy = j * step / 2;
      const r = random();
      const tint = r < broken ? '#14161a' : r < broken + 0.05 + cheer * 0.12 ? ['#c9d8a0', '#e3cf8a', '#a9c7d8', '#d8a9a0'][Math.floor(random() * 4)] : null;
      if (tint) {
        g.fillStyle = night && tint !== '#14161a' ? '#445077' : tint;
        g.beginPath(); g.moveTo(cx, cy - step / 2); g.lineTo(cx + step / 2, cy); g.lineTo(cx, cy + step / 2); g.lineTo(cx - step / 2, cy); g.fill();
      }
    }
    g.strokeStyle = night ? '#141824' : '#56605e';
    g.lineWidth = 2.5;
    for (let k = -12; k < 16; k++) {
      g.beginPath(); g.moveTo(k * step, 0); g.lineTo(k * step + 384, 384); g.stroke();
      g.beginPath(); g.moveTo(k * step, 0); g.lineTo(k * step - 384, 384); g.stroke();
    }
    g.lineWidth = 5;
    for (let y = 96; y < 384; y += 96) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
  } else {
    g.strokeStyle = 'rgba(120,100,60,0.5)';
    g.lineWidth = 4;
    g.strokeRect(2, 2, 124, 380);
    g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 384); g.moveTo(0, 192); g.lineTo(128, 192); g.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A window light: straight sides and a pointed or round head, with uv across its own box. */
function lightShape(width: number, height: number, head: 'point' | 'round' | 'square') {
  const pts: THREE.Vector2[] = [new THREE.Vector2(-width / 2, 0), new THREE.Vector2(width / 2, 0)];
  if (head === 'square') pts.push(new THREE.Vector2(width / 2, height), new THREE.Vector2(-width / 2, height));
  else if (head === 'round') {
    const spring = height - width / 2;
    for (let i = 0; i <= 16; i++) { const t = (i / 16) * Math.PI; pts.push(new THREE.Vector2(Math.cos(t) * width / 2, spring + Math.sin(t) * width / 2)); }
  } else {
    const spring = height - width * 0.866;
    for (let i = 0; i <= 8; i++) { const t = (i / 8) * (Math.PI / 3); pts.push(new THREE.Vector2(-width / 2 + Math.cos(t) * width, spring + Math.sin(t) * width)); }
    for (let i = 8; i >= 0; i--) { const t = (i / 8) * (Math.PI / 3); pts.push(new THREE.Vector2(width / 2 - Math.cos(t) * width, spring + Math.sin(t) * width)); }
  }
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(pts));
  const p = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / width + 0.5, p.getY(i) / height);
  return geometry;
}

function leafTexture(random: Rand) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 88;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#eadfbe';
  g.fillRect(0, 0, 64, 88);
  for (let y = 12; y < 78; y += 6) {
    g.fillStyle = y === 12 ? '#a3281c' : '#2a2018';
    let x = 8;
    while (x < 54) { const w = 3 + random() * 9; g.fillRect(x, y, Math.min(w, 56 - x), 2.6); x += w + 3; }
  }
  g.fillStyle = '#1f3f8c'; g.fillRect(8, 10, 12, 14);
  g.fillStyle = '#d5a62c'; g.fillRect(11, 13, 6, 8);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineWorld({
  questions: {
    state: choice('What is happening in the scriptorium?', {
      working: 'An industrious morning: every desk in use, books propped open, pages half written, stools pulled in.',
      office: 'The hour of prayer: every desk left tidy under a cloth, stools tucked in, the room waiting in silence.',
      vigil: 'Deep night: the windows dark, one candle burning at one desk, the rest of the room in blue shadow.',
      looted: 'Sacked: desks thrown over, torn leaves all across the floor, a scorched heap where books were burned.',
      abandoned: 'Dissolved and forgotten: ivy through a broken light, rubble, cobwebs, a few rotting desks.',
    }),
    windows: choice('What are the north windows like?', {
      lancet: 'Tall narrow pointed lancets glazed in pale diamond quarries.',
      round: 'Small deep round-headed Romanesque lights, high in a thick wall.',
      tracery: 'Paired lancets under a round eye, proper Gothic tracery.',
      shuttered: 'Unglazed square openings with oiled linen and heavy wooden shutters.',
    }),
    stone: choice('What are the walls built of?', STONES),
    floor: choice('What is underfoot?', FLOORS),
    endwall: choice('What is on the end wall?', {
      armarium: 'The armarium: a deep book cupboard with shelved volumes lying flat.',
      door: 'A low arched oak door with iron straps, leading to the cloister.',
      mural: 'A faded wall painting of a saint writing at a desk.',
      cross: 'A plain dark wooden cross above a stone bench.',
    }),
    fitting: choice('What else furnishes the room?', {
      none: 'Nothing: bare and austere.',
      line: 'A cord along the wall with freshly written leaves pegged up to dry.',
      corona: 'An iron ring of candles hung from a wall bracket.',
      brazier: 'An iron fire basket of coals for numb fingers.',
      bell: 'A small bell on a bracket with a rope, to end the work hour.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const art = new Sculpture(context);
    const root = art.root;
    const night = a.state === 'vigil';
    const ruined = a.state === 'looted' || a.state === 'abandoned';

    const RW = 9.2, RD = 6.2, WH = 4.3;
    const X0 = -RW / 2, Z0 = -RD / 2;
    const stoneBase = STONE_TONE[a.stone][0];
    const background = new THREE.Color(night ? '#7a8192' : '#dedbd0').lerp(new THREE.Color(night ? '#8a8494' : '#e6ddc8'), mood.warmth * 0.5);
    if (a.state === 'looted') background.lerp(new THREE.Color('#b9b2a6'), 0.5);

    // ---- light ----
    const hemi = new THREE.HemisphereLight(night ? '#aab6e0' : '#f1f4ff', night ? '#3d3a44' : '#7c766a', night ? 1.05 : 1.35);
    root.add(hemi);
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(night ? 0.62 : mix(0.58, 0.1, mood.warmth), night ? 0.4 : 0.3, night ? 0.75 : 0.9), night ? 0.9 : 2.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 4;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight(night ? '#8c98c8' : '#e4e8f2', night ? 0.5 : 0.75);
    fill.position.set(7, 5, 8);
    root.add(fill);
    // The light comes in through the windows of the far wall and slants across the room as the day moves.
    const sun = new THREE.Vector3(mix(0.55, -0.55, mood.daylight), -1, 0.72).normalize();

    // ---- shell ----
    const wallMap = wallTexture(random, a.stone, mood.wear);
    const wallMaterial = (rx: number, ry: number) => {
      const map = wallMap.clone();
      map.repeat.set(rx, ry);
      map.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.95, color: night ? '#c9cde0' : '#ffffff' });
    };
    const floorMap = floorTexture(random, a.floor, mood.wear, stoneBase);
    floorMap.repeat.set(RW / 3, RD / 3);
    const ground = art.box([RW + 0.5, 0.3, RD + 0.5], [-0.25, -0.15, -0.25], new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.95, color: night ? '#c2c6da' : '#ffffff' }));
    const back = art.box([RW + 0.5, WH, 0.5], [-0.25, WH / 2, Z0 - 0.25], wallMaterial((RW + 0.5) / 2.6, WH / 2.6));
    back.castShadow = false;
    art.box([0.5, WH, RD], [X0 - 0.25, WH / 2, 0], wallMaterial(RD / 2.6, WH / 2.6));
    const trim = art.material(new THREE.Color(stoneBase).offsetHSL(0, 0, -0.08), { roughness: 0.95 });
    const pale = art.material(new THREE.Color(stoneBase).offsetHSL(0, -0.03, 0.07), { roughness: 0.9 });
    const oakTone = new THREE.Color('#7d5c36').lerp(new THREE.Color('#463426'), mood.wear * 0.6);
    const oak = (shift = 0) => art.material(oakTone.clone().offsetHSL(0, 0, shift + (random() - 0.5) * 0.03), { roughness: 0.85 });
    const iron = art.material('#2c2a29', { metalness: 0.5, roughness: 0.55 });
    // Plinth course, string course and the wall plate with rafter feet.
    art.box([RW, 0.28, 0.1], [0, 0.14, Z0 + 0.05], trim);
    art.box([0.1, 0.28, RD], [X0 + 0.05, 0.14, 0], trim);
    art.box([RW, 0.1, 0.12], [0, WH - 0.42, Z0 + 0.06], pale);
    art.box([0.12, 0.1, RD], [X0 + 0.06, WH - 0.42, 0], pale);
    art.box([RW + 0.5, 0.16, 0.3], [-0.25, WH + 0.08, Z0 - 0.1], oak(-0.05));
    for (let x = X0 + 0.5; x < RW / 2; x += 0.92) {
      art.box([0.14, 0.18, 0.55], [x, WH - 0.14, Z0 + 0.2], oak(-0.03));
      art.box([0.16, 0.2, 0.2], [x, WH - 0.32, Z0 + 0.1], pale);
    }

    // ---- windows, shafts and pools of light ----
    const bays = [-3.3, -1.1, 1.1, 3.3];
    const head: 'point' | 'round' | 'square' = a.windows === 'round' ? 'round' : a.windows === 'shuttered' ? 'square' : 'point';
    const winW = a.windows === 'round' ? 0.7 : a.windows === 'tracery' ? 1.25 : a.windows === 'shuttered' ? 0.9 : 0.85;
    const winH = a.windows === 'round' ? 1.45 : a.windows === 'shuttered' ? 1.6 : 2.25;
    const sill = a.windows === 'round' ? 2.05 : a.windows === 'shuttered' ? 1.75 : 1.5;
    const brokenBay = ruined ? Math.floor(random() * bays.length) : -1;
    const dayGlow = night ? 0.35 : mix(0.75, 1.05, 1 - Math.abs(mood.daylight - 0.5) * 2);
    const shaftTone = new THREE.Color().setHSL(mix(0.57, 0.11, mood.warmth), 0.5, 0.86);
    const shaftMaterial = new THREE.MeshBasicMaterial({ color: shaftTone, transparent: true, opacity: night ? 0.07 : 0.19, depthWrite: false, side: THREE.DoubleSide });
    const poolMaterial = new THREE.MeshBasicMaterial({ color: shaftTone, transparent: true, opacity: night ? 0.18 : 0.5, depthWrite: false });
    const zFace = Z0 + 0.012;
    bays.forEach((bx, bay) => {
      const glassMap = glassTexture(random, night, mood.cheer, bay === brokenBay ? 0.45 : mood.wear * 0.12, a.windows === 'shuttered');
      const glass = new THREE.MeshStandardMaterial({ map: glassMap, emissive: '#ffffff', emissiveMap: glassMap, emissiveIntensity: dayGlow, roughness: 0.4 });
      // A splayed stone reveal behind the light.
      const reveal = art.mesh(lightShape(winW + 0.34, winH + 0.2, head), pale, [bx, sill - 0.08, zFace]);
      reveal.castShadow = false;
      const lights: [number, number, number, number][] = a.windows === 'tracery' ? [[-winW * 0.26, 0, winW * 0.42, winH * 0.74], [winW * 0.26, 0, winW * 0.42, winH * 0.74]] : [[0, 0, winW, winH]];
      for (const [dx, dy, w, h] of lights) art.mesh(lightShape(w, h, head), glass, [bx + dx, sill + dy, zFace + 0.012]).castShadow = false;
      if (a.windows === 'tracery') {
        const eye = art.mesh(new THREE.CircleGeometry(winW * 0.2, 20), glass, [bx, sill + winH * 0.78, zFace + 0.012]);
        eye.castShadow = false;
      }
      art.box([winW + 0.5, 0.1, 0.3], [bx, sill - 0.13, Z0 + 0.12], pale);
      if (a.windows === 'shuttered') {
        for (const side of [-1, 1]) {
          const swing = (bay + (side > 0 ? 1 : 0)) % 3 === 0 && !ruined ? 0.25 : 1.1 + random() * 0.35;
          const shutter = new Sculpture(context);
          shutter.box([winW / 2, winH, 0.05], [side * winW / 4, winH / 2, 0], oak());
          for (const y of [0.2, winH - 0.2]) shutter.box([winW / 2 - 0.04, 0.05, 0.02], [side * winW / 4, y, 0.035], iron);
          shutter.root.position.set(bx - side * winW / 2 - side * 0.02, sill, Z0 + 0.05);
          shutter.root.rotation.y = side * swing - side * Math.PI + (side > 0 ? 0 : 0);
          shutter.root.scale.x = -1;
          root.add(shutter.root);
        }
      }
      // The shaft: from the opening to the parallelogram it throws on the floor.
      const hit = (x: number, y: number): P3 => [x + sun.x * (y / -sun.y), 0.02, Z0 + sun.z * (y / -sun.y)];
      const w0: P3[] = [[bx - winW / 2, sill, Z0], [bx + winW / 2, sill, Z0], [bx + winW / 2, sill + winH * 0.92, Z0], [bx - winW / 2, sill + winH * 0.92, Z0]];
      const f0 = w0.map(([x, y]) => hit(x, y));
      const verts: number[] = [];
      const quad = (p: P3, q: P3, r: P3, t: P3) => verts.push(...p, ...q, ...r, ...p, ...r, ...t);
      for (let i = 0; i < 4; i++) quad(w0[i], w0[(i + 1) % 4], f0[(i + 1) % 4], f0[i]);
      const shaftGeometry = new THREE.BufferGeometry();
      shaftGeometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      shaftGeometry.computeVertexNormals();
      const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
      shaft.renderOrder = 2;
      root.add(shaft);
      const poolGeometry = new THREE.BufferGeometry();
      const pv: number[] = [];
      pv.push(...f0[0], ...f0[3], ...f0[2], ...f0[0], ...f0[2], ...f0[1]);
      poolGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pv, 3));
      poolGeometry.computeVertexNormals();
      const pool = new THREE.Mesh(poolGeometry, poolMaterial);
      pool.renderOrder = 1;
      root.add(pool);
    });

    // ---- the row of desks under the windows ----
    const linen = art.material('#d9d3c0', { roughness: 0.95 });
    const vellum = art.material('#eadfbe', { roughness: 0.9 });
    const leafMap = leafTexture(random);
    const leafMaterial = new THREE.MeshStandardMaterial({ map: leafMap, roughness: 0.9, side: THREE.DoubleSide });
    const bookColours = ['#6d2c22', '#2f4638', '#5a4526', '#283a5c', '#7b5a2c'];
    const deskCount = Math.max(2, Math.min(4, Math.round(mix(2, 4.4, mood.density))));
    const deskBays = [1, 2, 0, 3].slice(0, deskCount).sort();
    const candleBay = deskBays[Math.floor(random() * deskBays.length)];
    let flame: THREE.Mesh | null = null;
    let candleLight: THREE.PointLight | null = null;
    const flames: THREE.Mesh[] = [];
    const makeFlame = (at: P3, size = 1) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.03 * size, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffae3a', emissiveIntensity: 2.8 }));
      mesh.position.set(...at);
      mesh.scale.y = 2.2;
      mesh.userData.base = 2.2;
      root.add(mesh);
      flames.push(mesh);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.34 * size, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffc46a', transparent: true, opacity: night ? 0.16 : 0.08, depthWrite: false }));
      halo.position.set(...at);
      root.add(halo);
      return mesh;
    };
    deskBays.forEach((bay) => {
      const d = new Sculpture(context);
      const toppled = a.state === 'looted' ? random() < 0.7 : a.state === 'abandoned' ? random() < 0.35 : false;
      const W = 1.0, low = 0.9, top = 1.24, zF = 0.3, zB = -0.22;
      for (const side of [-1, 1]) {
        d.box([0.05, low, 0.5], [side * (W / 2 - 0.03), low / 2, 0.02], oak());
        d.box([0.08, 0.06, 0.7], [side * (W / 2 - 0.03), 0.03, 0.04], oak(-0.04));
      }
      d.box([W - 0.08, 0.04, 0.12], [0, 0.2, 0.22], oak(-0.03));
      d.box([W - 0.08, 0.03, 0.4], [0, low - 0.2, 0], oak(-0.02));
      const slope = new Sculpture(context);
      const theta = Math.atan2(top - low, zF - zB);
      slope.root.position.set(0, (low + top) / 2, (zF + zB) / 2);
      slope.root.rotation.x = theta;
      d.root.add(slope.root);
      const L = Math.hypot(top - low, zF - zB);
      slope.box([W + 0.06, 0.04, L + 0.03], [0, 0, 0], oak(0.03));
      slope.box([W + 0.06, 0.06, 0.03], [0, 0.03, L / 2], oak(-0.03));
      d.box([W + 0.06, 0.04, 0.16], [0, top + 0.005, zB - 0.07], oak(0.01));
      d.box([W, top - low + 0.02, 0.03], [0, (low + top) / 2, zB - 0.13], oak(-0.04));
      if (!toppled && !ruined) {
        if (a.state === 'office' || (night && bay !== candleBay)) {
          slope.box([0.62, 0.014, L - 0.06], [-0.05, 0.03, 0], linen);
        } else {
          const page = slope.mesh(new THREE.PlaneGeometry(0.42, 0.5), leafMaterial, [-0.12, 0.024, 0]);
          page.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.1);
          // The exemplar propped open on the ledge.
          d.box([0.46, 0.3, 0.035], [0.12, top + 0.17, zB - 0.1], art.material(bookColours[bay % 5])).rotation.x = -0.25;
          d.box([0.42, 0.27, 0.02], [0.12, top + 0.17, zB - 0.075], vellum).rotation.x = -0.25;
          const quill = slope.box([0.012, 0.004, 0.24], [0.27, 0.03, 0.02], art.material('#f1ece0'));
          quill.rotation.y = 0.5 + random() * 0.4;
        }
        d.cylinder(0.035, 0.02, 0.1, [W * 0.36, top + 0.07, zB - 0.07], art.material('#3a2c20', { roughness: 0.4 }), 10);
        if (night && bay === candleBay) {
          d.cylinder(0.06, 0.07, 0.02, [-W * 0.34, top + 0.035, zB - 0.07], iron, 12);
          d.cylinder(0.026, 0.03, 0.14, [-W * 0.34, top + 0.115, zB - 0.07], art.material('#e6d9ae', { emissive: '#f2c56b', emissiveIntensity: 0.35 }), 10);
        }
      } else if (a.state === 'abandoned' && !toppled) {
        const curl = slope.mesh(new THREE.PlaneGeometry(0.4, 0.46, 6, 1), art.material('#b9ab86', { side: THREE.DoubleSide }), [0, 0.03, 0]);
        curl.rotation.x = -Math.PI / 2;
        const cp = curl.geometry.attributes.position;
        for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.max(0, cp.getX(i)) ** 2 * 2.2);
        curl.geometry.computeVertexNormals();
      }
      // The stool.
      const stool = new Sculpture(context);
      stool.cylinder(0.19, 0.19, 0.05, [0, 0.52, 0], oak(0.04), 14);
      for (let i = 0; i < 3; i++) stool.rod([Math.cos(i * 2.094) * 0.2, 0, Math.sin(i * 2.094) * 0.2], [Math.cos(i * 2.094) * 0.1, 0.5, Math.sin(i * 2.094) * 0.1], 0.028, oak(-0.03), 0.02);
      stool.root.position.set((random() - 0.5) * 0.2, 0, a.state === 'office' || night ? 0.42 : 0.66 + random() * 0.12);
      if (ruined && random() < 0.6) { stool.root.rotation.z = Math.PI / 2; stool.root.position.set(0.4 + random() * 0.5, 0.19, 0.9 + random() * 0.6); stool.root.rotation.y = random() * 3; }
      d.root.add(stool.root);

      d.root.position.set(bays[bay], 0, Z0 + 0.62);
      if (toppled) {
        d.root.rotation.set(Math.PI / 2 * (random() < 0.5 ? 1 : 0), (random() - 0.5) * 1.2, random() < 0.5 ? 0 : Math.PI / 2);
        if (d.root.rotation.x === 0 && d.root.rotation.z === 0) d.root.rotation.x = Math.PI / 2;
        d.root.position.set(bays[bay] + (random() - 0.5) * 0.5, d.root.rotation.z ? 0.5 : 0.3, Z0 + 0.9 + random() * 0.4);
      } else d.root.rotation.y = (random() - 0.5) * 0.08;
      root.add(d.root);
      if (night && bay === candleBay && !toppled) {
        const at: P3 = [bays[bay] - W * 0.34, top + 0.24, Z0 + 0.62 + zB - 0.07];
        flame = makeFlame(at);
        candleLight = new THREE.PointLight('#ffb45a', 14, 7.5, 1.6);
        candleLight.position.set(at[0], at[1] + 0.05, at[2] + 0.1);
        root.add(candleLight);
      }
    });
    // Empty bays get what a working room accumulates.
    [0, 1, 2, 3].filter((bay) => !deskBays.includes(bay)).forEach((bay) => {
      const x = bays[bay];
      if (random() < 0.5) {
        art.cylinder(0.26, 0.2, 0.4, [x, 0.2, Z0 + 0.5], art.material('#a08556', { roughness: 1 }), 12);
        for (let i = 0; i < 5; i++) art.cylinder(0.035, 0.035, 0.6, [x + (random() - 0.5) * 0.25, 0.5, Z0 + 0.5 + (random() - 0.5) * 0.2], vellum, 8).rotation.set((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5);
      } else {
        art.box([1.1, 0.07, 0.34], [x, 0.46, Z0 + 0.34], oak());
        for (const side of [-1, 1]) art.box([0.07, 0.44, 0.3], [x + side * 0.45, 0.22, Z0 + 0.34], oak(-0.04));
        let bx = x - 0.4;
        for (let i = 0; i < 3 && !ruined; i++) { const w = 0.22 + random() * 0.08; art.box([w, 0.06 + random() * 0.05, 0.28], [bx + w / 2, 0.53, Z0 + 0.34], art.material(bookColours[Math.floor(random() * 5)])).rotation.y = (random() - 0.5) * 0.3; bx += w + 0.04; }
      }
    });

    // ---- the end wall ----
    const ex = X0 + 0.012;
    if (a.endwall === 'armarium') {
      const cz = -0.6;
      art.box([0.06, 2.5, 1.9], [X0 + 0.03, 1.45, cz], art.material('#2a2420'));
      art.box([0.34, 0.12, 2.1], [X0 + 0.17, 2.76, cz], pale);
      art.box([0.34, 0.1, 2.1], [X0 + 0.17, 0.16, cz], pale);
      for (const side of [-1, 1]) art.box([0.34, 2.6, 0.12], [X0 + 0.17, 1.45, cz + side * 1.0], pale);
      for (let shelf = 0; shelf < 4; shelf++) {
        const y = 0.3 + shelf * 0.6;
        art.box([0.3, 0.05, 1.86], [X0 + 0.17, y, cz], oak());
        let z = cz - 0.85;
        const fullness = a.state === 'looted' ? 0.15 : a.state === 'abandoned' ? 0.3 : mix(0.5, 1, mood.density);
        while (z < cz + 0.75) {
          const stack = random() < fullness ? 1 + Math.floor(random() * 3) : 0;
          const w = 0.24 + random() * 0.1;
          for (let i = 0; i < stack; i++) art.box([0.26, 0.07, w], [X0 + 0.19, y + 0.06 + i * 0.075, z + w / 2], art.material(bookColours[Math.floor(random() * 5)])).rotation.y = (random() - 0.5) * 0.15;
          z += w + 0.07;
        }
      }
      for (const side of [-1, 1]) {
        const door = art.box([0.05, 2.46, 0.94], [X0 + 0.34 + 0.44, 1.45, cz + side * 1.42], oak(-0.02));
        door.rotation.y = side * 0.25;
        door.position.set(X0 + 0.34 + Math.cos(0.25) * 0.47 - 0.05, 1.45, cz + side * (0.95 + Math.sin(0.25) * 0.47));
        door.rotation.y = side * (Math.PI / 2 - 0.3);
      }
    } else if (a.endwall === 'door') {
      const cz = 0.2;
      const arch = art.mesh(lightShape(1.5, 2.6, 'point'), pale, [ex, 0, cz]);
      arch.rotation.y = Math.PI / 2;
      const dark = art.mesh(lightShape(1.2, 2.4, 'point'), new THREE.MeshStandardMaterial({ color: ruined ? '#cfd6d2' : '#1d1915', emissive: ruined ? '#cfd6d2' : '#000000', emissiveIntensity: ruined ? 0.6 : 0 }), [ex + 0.01, 0, cz]);
      dark.rotation.y = Math.PI / 2;
      const ajar = ruined ? 1.2 : a.state === 'working' ? 0.12 : 0;
      const leaf = new Sculpture(context);
      const panel = leaf.mesh(lightShape(1.2, 2.4, 'point'), oak(-0.02), [0.6, 0, 0]);
      panel.material.side = THREE.DoubleSide;
      for (const y of [0.5, 1.5]) leaf.box([0.9, 0.07, 0.03], [0.5, y, 0.02], iron);
      leaf.ring(0.07, 0.014, [1.0, 1.1, 0.03], iron);
      leaf.root.position.set(ex + 0.03, 0, cz + 0.6);
      leaf.root.rotation.y = Math.PI / 2 + ajar;
      root.add(leaf.root);
      art.box([0.3, 0.12, 1.7], [X0 + 0.15, 0.06, cz], pale);
    } else if (a.endwall === 'mural') {
      const canvas = document.createElement('canvas');
      canvas.width = 384; canvas.height = 320;
      const g = canvas.getContext('2d')!;
      g.fillStyle = '#d9cfb4'; g.fillRect(0, 0, 384, 320);
      g.strokeStyle = '#9c3f2c'; g.lineWidth = 10; g.strokeRect(10, 10, 364, 300);
      g.fillStyle = '#2f4f7a'; g.fillRect(24, 24, 336, 272);
      g.fillStyle = '#c9a23a'; g.beginPath(); g.arc(150, 96, 44, 0, 7); g.fill();
      g.fillStyle = '#e3c9a4'; g.beginPath(); g.arc(150, 100, 28, 0, 7); g.fill();
      g.fillStyle = '#9c3f2c'; g.beginPath(); g.moveTo(96, 296); g.quadraticCurveTo(100, 130, 150, 126); g.quadraticCurveTo(214, 130, 220, 296); g.fill();
      g.fillStyle = '#7a5a34'; g.beginPath(); g.moveTo(208, 190); g.lineTo(330, 150); g.lineTo(330, 296); g.lineTo(232, 296); g.fill();
      g.fillStyle = '#efe6cc'; g.beginPath(); g.moveTo(232, 186); g.lineTo(312, 160); g.lineTo(316, 200); g.lineTo(238, 224); g.fill();
      g.strokeStyle = '#efe6cc'; g.lineWidth = 4; g.beginPath(); g.moveTo(200, 196); g.lineTo(262, 184); g.stroke();
      for (let i = 0; i < 60 + mood.wear * 260; i++) { g.fillStyle = `rgba(217,207,180,${0.3 + random() * 0.6})`; g.beginPath(); g.ellipse(random() * 384, random() * 320, 4 + random() * 22, 3 + random() * 16, random() * 3, 0, 7); g.fill(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const mural = art.mesh(new THREE.PlaneGeometry(3.0, 2.5), new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }), [ex, 2.1, 0]);
      mural.rotation.y = Math.PI / 2;
      mural.castShadow = false;
    } else {
      art.box([0.08, 1.9, 0.18], [X0 + 0.06, 2.55, 0], art.material('#33261c'));
      art.box([0.08, 0.18, 1.1], [X0 + 0.06, 2.95, 0], art.material('#33261c'));
      art.box([0.5, 0.12, 2.4], [X0 + 0.25, 0.5, 0], pale);
      for (const z of [-1, 0, 1]) art.box([0.4, 0.44, 0.2], [X0 + 0.2, 0.22, z * 1.05], trim);
    }

    // ---- fittings ----
    if (a.fitting === 'line') {
      const z0 = a.endwall === 'armarium' ? 0.8 : -2.6, z1 = RD / 2 - 0.3;
      const lineX = X0 + 0.4, y = 2.25;
      art.tube([[lineX, y + 0.08, z0], [lineX, y - 0.06, (z0 + z1) / 2], [lineX, y + 0.08, z1]], 0.012, art.material('#cdbf9a'));
      for (const z of [z0, z1]) { art.rod([X0, y + 0.1, z], [lineX, y + 0.08, z], 0.02, iron); }
      const count = Math.floor((z1 - z0) / 0.55);
      for (let i = 0; i < count; i++) {
        if (ruined && random() < 0.6) continue;
        const z = z0 + 0.3 + i * 0.55;
        const sag = y + 0.08 - 0.14 * Math.sin(((z - z0) / (z1 - z0)) * Math.PI);
        const page = art.mesh(new THREE.PlaneGeometry(0.4, 0.55), leafMaterial, [lineX, sag - 0.29, z]);
        page.rotation.set(0, Math.PI / 2 + (random() - 0.5) * 0.4, (random() - 0.5) * 0.08);
        art.box([0.03, 0.07, 0.03], [lineX, sag - 0.02, z], oak(0.1));
      }
    } else if (a.fitting === 'corona') {
      const cx = 0, cz = Z0 + 1.5, cy = 3.05;
      art.rod([cx, WH - 0.55, Z0], [cx, WH - 0.5, cz], 0.03, iron);
      art.rod([cx, WH - 1.3, Z0], [cx, WH - 0.52, cz - 0.35], 0.022, iron);
      art.rod([cx, WH - 0.5, cz], [cx, cy + 0.5, cz], 0.012, iron);
      art.ring(0.55, 0.025, [cx, cy, cz], iron).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) art.rod([cx, cy + 0.5, cz], [cx + Math.cos(i * 2.094) * 0.55, cy, cz + Math.sin(i * 2.094) * 0.55], 0.008, iron);
      for (let i = 0; i < 8; i++) {
        const px = cx + Math.cos(i * 0.785) * 0.55, pz = cz + Math.sin(i * 0.785) * 0.55;
        art.cylinder(0.05, 0.03, 0.03, [px, cy + 0.03, pz], iron, 8);
        const h = 0.08 + random() * 0.14;
        art.cylinder(0.022, 0.024, h, [px, cy + 0.045 + h / 2, pz], art.material('#e6d9ae'), 8);
        if (!ruined && (night ? i % 4 === 0 : a.state === 'working' && mood.daylight > 0.75)) makeFlame([px, cy + 0.1 + h, pz], 0.8);
      }
    } else if (a.fitting === 'brazier') {
      const bx = 3.7, bz = Z0 + 1.5;
      for (let i = 0; i < 3; i++) art.rod([bx + Math.cos(i * 2.094) * 0.3, 0, bz + Math.sin(i * 2.094) * 0.3], [bx + Math.cos(i * 2.094) * 0.2, 0.62, bz + Math.sin(i * 2.094) * 0.2], 0.02, iron);
      art.lathe([[0, 0.5], [0.2, 0.5], [0.34, 0.7], [0.36, 0.72], [0.32, 0.72], [0.2, 0.54], [0, 0.54]], iron, [bx, 0, bz]);
      const hot = !ruined && a.state !== 'office';
      const coals: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 26; i++) { const angle = random() * 6.28, d = Math.sqrt(random()) * 0.26; coals.push({ at: [bx + Math.cos(angle) * d, 0.66 + random() * 0.07, bz + Math.sin(angle) * d], size: 0.045 + random() * 0.04, color: hot && random() < 0.6 ? '#ff7a2a' : '#2a2422' }); }
      art.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9, emissive: hot ? '#ff4a12' : '#000000', emissiveIntensity: hot ? 0.9 : 0 }), coals);
    } else if (a.fitting === 'bell') {
      const bz = a.endwall === 'door' ? 1.6 : 1.9;
      art.rod([X0, 3.0, bz], [X0 + 0.5, 3.1, bz], 0.03, iron);
      art.rod([X0, 2.6, bz], [X0 + 0.45, 3.08, bz], 0.02, iron);
      art.lathe([[0, 0.3], [0.06, 0.3], [0.1, 0.2], [0.14, 0.05], [0.19, 0], [0.17, 0], [0.12, 0.05], [0, 0.26]], art.material('#a8853a', { metalness: 0.7, roughness: 0.35 }), [X0 + 0.5, 2.75, bz]);
      art.tube([[X0 + 0.5, 2.76, bz], [X0 + 0.48, 1.9, bz + 0.03], [X0 + 0.42, 1.2, bz]], 0.012, art.material('#cdbf9a'));
    }

    // ---- what the state leaves on the floor ----
    if (a.state === 'looted') {
      const leaves: THREE.Matrix4[] = [];
      const count = 70 + Math.floor(mood.density * 90);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < count; i++) {
        const againstWall = random() < 0.12;
        e.set(-Math.PI / 2 + (random() - 0.5) * (againstWall ? 1.6 : 0.25), random() * 6.28, (random() - 0.5) * 0.3, 'YXZ');
        q.setFromEuler(e);
        const scale = 0.5 + random() * 0.7;
        m.compose(new THREE.Vector3(X0 + 0.4 + random() * (RW - 0.8), againstWall ? 0.12 : 0.012 + random() * 0.02, againstWall ? Z0 + 0.25 : Z0 + 0.4 + Math.pow(random(), 0.8) * (RD - 0.8)), q, new THREE.Vector3(scale, scale * (random() < 0.4 ? 0.5 : 1), 1));
        leaves.push(m.clone());
      }
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.34, 0.46), leafMaterial, leaves.length);
      leaves.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
      // The pyre.
      const px = -2.3 + random() * 0.6, pz = 1.9 + random() * 0.4;
      const scorch = art.cylinder(1.0, 1.05, 0.012, [px, 0.008, pz], new THREE.MeshStandardMaterial({ color: '#1c1917', roughness: 1, transparent: true, opacity: 0.8, depthWrite: false }), 24);
      scorch.castShadow = false;
      for (let i = 0; i < 9; i++) {
        const book = art.box([0.3 + random() * 0.12, 0.07 + random() * 0.05, 0.4], [px + (random() - 0.5) * 0.9, 0.05 + random() * 0.2, pz + (random() - 0.5) * 0.8], art.material(random() < 0.6 ? '#221d1a' : bookColours[i % 5]));
        book.rotation.set((random() - 0.5) * 0.8, random() * 3, (random() - 0.5) * 0.6);
      }
      const embers: { at: P3; size: number }[] = [];
      for (let i = 0; i < 16; i++) embers.push({ at: [px + (random() - 0.5) * 0.8, 0.04 + random() * 0.22, pz + (random() - 0.5) * 0.7], size: 0.02 + random() * 0.025 });
      art.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ff7a2a', emissive: '#ff4a12', emissiveIntensity: 1.6 }), embers);
    } else if (a.state === 'abandoned') {
      const rubble: { at: P3; size: number; color: string }[] = [];
      const bx = bays[brokenBay < 0 ? 1 : brokenBay];
      for (let i = 0; i < 40; i++) { const size = 0.06 + random() * 0.16; rubble.push({ at: [bx + (random() - 0.5) * 2.2, size * 0.5, Z0 + 0.25 + Math.pow(random(), 2) * 1.8], size, color: '#' + new THREE.Color(stoneBase).offsetHSL(0, 0, (random() - 0.5) * 0.14).getHexString() }); }
      art.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), rubble);
      // Ivy pouring in through the broken light and down the wall.
      const ivy: { at: P3; size: number; color: string }[] = [];
      for (let strand = 0; strand < 9; strand++) {
        let x = bx + (random() - 0.5) * 0.7, y = sill + winH * (0.3 + random() * 0.6);
        const length = 20 + Math.floor(random() * 36);
        for (let i = 0; i < length && y > 0.1; i++) {
          x += (random() - 0.5) * 0.16; y -= 0.05 + random() * 0.08;
          ivy.push({ at: [x, y, Z0 + 0.05 + random() * 0.06], size: 0.05 + random() * 0.05, color: ['#3f6a34', '#55803c', '#2f5630', '#6f8f44'][Math.floor(random() * 4)] });
        }
      }
      art.scatter(new THREE.SphereGeometry(1, 5, 3), new THREE.MeshStandardMaterial({ roughness: 0.8 }), ivy);
      const web = new THREE.MeshStandardMaterial({ color: '#efede6', roughness: 1 });
      for (let i = 0; i < 9; i++) art.rod([X0 + 0.02, WH - 0.5 - i * 0.14, Z0 + 0.02], [X0 + 0.02 + (9 - i) * 0.16, WH - 0.45, Z0 + 0.3 + i * 0.1], 0.004, web);
      const dead: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 80; i++) dead.push({ at: [X0 + 0.4 + random() * (RW - 0.8), 0.015, Z0 + 0.4 + random() * (RD - 0.8)], size: 0.03 + random() * 0.035, color: ['#7a5a30', '#8f6f3a', '#5f4a2c'][Math.floor(random() * 3)] });
      art.scatter(new THREE.CircleGeometry(1, 5).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 1 }), dead);
    } else if (a.state === 'working' && mood.density > 0.4) {
      // A basket of rolled skins and a ladder of quires waiting to be bound.
      const qx = 3.9, qz = 1.9;
      for (let i = 0; i < 2 + Math.floor(mood.density * 4); i++) art.box([0.5, 0.05, 0.36], [qx + (random() - 0.5) * 0.05, 0.03 + i * 0.052, qz + (random() - 0.5) * 0.05], i % 2 ? vellum : art.material('#e2d6b4')).rotation.y = (random() - 0.5) * 0.2;
    }

    // ---- where the cast stands ----
    const slots: readonly (readonly [number, number])[] = [[0.3, 0.75], [-2.5, 0.15], [2.7, 0.2], [-1.2, 2.25], [1.9, 2.3]];
    const tables = slots.map(([x, z], index) => {
      const t = new Sculpture(context);
      const k = index === 0 ? 1.2 : 1;
      t.box([1.25 * k, 0.07, 0.85 * k], [0, 0.745, 0], oak(0.02));
      for (const side of [-1, 1]) {
        t.rod([side * 0.48 * k, 0.72, 0.3 * k], [side * 0.56 * k, 0, 0.36 * k], 0.035, oak(-0.03));
        t.rod([side * 0.48 * k, 0.72, -0.3 * k], [side * 0.56 * k, 0, -0.36 * k], 0.035, oak(-0.03));
        t.box([0.05, 0.06, 0.66 * k], [side * 0.52 * k, 0.36, 0], oak(-0.04));
      }
      t.box([1.0 * k, 0.06, 0.05], [0, 0.36, 0], oak(-0.04));
      t.root.position.set(x, 0, z);
      t.root.rotation.y = (random() - 0.5) * 0.2;
      t.root.visible = false;
      root.add(t.root);
      return t.root;
    });

    const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 250);
    const yaw = THREE.MathUtils.degToRad(31), pitch = THREE.MathUtils.degToRad(27);

    const world: World = {
      object: root, camera, background, ground, keyLight: key, capacity: slots.length,
      place(items: readonly Placeable[]) {
        tables.forEach((table) => (table.visible = false));
        const boxes: THREE.Box3[] = [new THREE.Box3(new THREE.Vector3(X0 - 0.5, -0.3, Z0 - 0.5), new THREE.Vector3(RW / 2, WH + 0.2, RD / 2))];
        items.forEach((item, index) => {
          const slot = index % slots.length;
          const [x, z] = slots[slot];
          const small = item.height < 0.85 && item.radius < 0.75;
          let lift = 0, scale: number;
          if (small) {
            // Small things are set out on a trestle table and enlarged enough to read from the aisle.
            const natural = Math.max(item.height, item.radius * 1.6, 0.02);
            scale = (item.hero ? 1.2 : 0.9) / natural;
            tables[slot].visible = true;
            lift = 0.78;
          } else scale = Math.min(2.5 / Math.max(item.height, 0.05), 1.35 / Math.max(item.radius, 0.05), 1.35) * (item.hero ? 1.1 : 0.95);
          item.holder.scale.setScalar(scale);
          item.holder.position.set(x, lift, z);
          item.holder.rotation.y = yaw * 0.6 + (context.random() - 0.5) * 0.3;
          item.holder.updateMatrixWorld(true);
          const box = visibleBounds(item.holder);
          if (!box.isEmpty()) boxes.push(box);
        });
        const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3());
        const centre = bounds.getCenter(new THREE.Vector3());
        const direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
        camera.position.copy(centre).addScaledVector(direction, 80);
        camera.lookAt(centre);
        camera.updateMatrixWorld(true);
        const seen = new THREE.Box2();
        const corner = new THREE.Vector3();
        for (const box of boxes)
          for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
            corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
            seen.expandByPoint(new THREE.Vector2(corner.x, corner.y));
          }
        const middle = seen.getCenter(new THREE.Vector2());
        const size = seen.getSize(new THREE.Vector2());
        const extent = Math.max(size.x, size.y) * 0.515;
        camera.translateX(middle.x);
        camera.translateY(middle.y);
        camera.left = camera.bottom = -extent;
        camera.right = camera.top = extent;
        camera.updateProjectionMatrix();
        key.target.position.set(0, 0.5, 0);
        key.position.set(0, 0.5, 0).addScaledVector(sun, -22);
        const shadow = key.shadow.camera;
        shadow.left = shadow.bottom = -8.5;
        shadow.right = shadow.top = 8.5;
        shadow.near = 0.5; shadow.far = 50;
        shadow.updateProjectionMatrix();
      },
      update(_dt, time) {
        const rate = mix(0.5, 1.8, mood.energy);
        flames.forEach((mesh, i) => { mesh.scale.y = (mesh.userData.base as number) * (1 + Math.sin(time * 9 * rate + i * 1.7) * 0.12 + Math.sin(time * 23 + i) * 0.05); });
        if (candleLight) candleLight.intensity = 14 * (1 + Math.sin(time * 9 * rate) * 0.06 + Math.sin(time * 23) * 0.03);
        void flame;
      },
      dispose() {
        key.shadow.map?.dispose();
        wallMap.dispose();
        disposeTree(root);
      },
    };
    return world;
  },
});
