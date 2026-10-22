import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
function paint(width: number, height: number, draw: (c: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

const HEADERS = {
  champions: 'LEAGUE CHAMPIONS', fame: 'HALL OF FAME', club: '300 CLUB', memory: 'IN LOVING MEMORY', pride: 'OUR PRIDE', none: '',
} as const;

export default defineThing({
  questions: {
    count: score('How many trophies are in the case?', ['One lone trophy', 'A modest handful', 'Every shelf comfortably full', 'Jammed in two deep, decades of them']),
    era: choice('What era are most of the trophies from?', {
      goldcup: '1950s gold loving cups with handles on dark wooden bases.',
      column: '1970s towers: coloured metallic columns on marble blocks with a little gold bowler on top.',
      modern: '1990s silver and blue stars, plates and acrylic shapes on black bases.',
      pins: 'Novelty gold bowling pins of every size.',
      mixed: 'A jumble of every decade side by side.',
    }),
    story: choice('What is the thing you notice about the case?', {
      ordinary: 'Nothing odd: an ordinary proud display.',
      empty: 'One shelf is conspicuously empty, clean circles in the dust where trophies stood.',
      memorial: 'A large framed portrait with a black ribbon across one corner and a flower beside it.',
      ring: 'An unclaimed 300-game ring in an open box on a red cushion, with a card nobody has collected.',
      giant: 'One absurdly huge trophy that dwarfs all the others.',
      fallen: 'Several trophies have toppled over and been left lying on their sides.',
    }),
    lining: choice('What lines the back of the case?', {
      green: 'Green baize, like a pool table.',
      red: 'Deep red velvet.',
      mirror: 'A silvered mirror that doubles everything.',
      pegboard: 'Cream pegboard with rows of holes.',
      blue: 'Royal blue felt.',
    }),
    wood: choice('What is the cabinet made of?', {
      walnut: 'Dark walnut veneer with brass fittings.',
      oak: 'Blond oak, school-corridor plain.',
      black: 'Black laminate with gold edge trim.',
      white: 'Painted white, chipped at the corners.',
      aluminium: 'Aluminium shop-fitting extrusion and grey laminate.',
    }),
    header: choice('What does the sign across the top say?', {
      champions: 'LEAGUE CHAMPIONS', fame: 'HALL OF FAME', club: '300 CLUB', memory: 'IN LOVING MEMORY', pride: 'OUR PRIDE', none: 'There is no sign, just a plain cornice.',
    }),
    doors: choice('What state are the glass doors in?', {
      closed: 'Both sliding panes closed and clean.',
      ajar: 'One pane slid half open, as if someone just reached in.',
      padlocked: 'Closed with a brass padlock and hasp in the middle.',
      broken: 'One pane smashed out, shards on the floor in front.',
    }),
    photos: noul('Are there framed team photographs among the trophies?'),
    lit: noul('Is the case lit from inside by a strip light?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 1.8, D = 0.42, BASE = 0.74, TOP = 1.98, H = a.header === 'none' ? 2.04 : 2.16;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    // ---- carcass
    const woodColour = { walnut: '#5a3a24', oak: '#c9a36a', black: '#1d1d21', white: '#e8e4d8', aluminium: '#8f9499' }[a.wood];
    const woodMap = paint(256, 256, (c, w, h) => {
      c.fillStyle = woodColour; c.fillRect(0, 0, w, h);
      if (a.wood === 'walnut' || a.wood === 'oak') for (let i = 0; i < 90; i++) {
        c.strokeStyle = `rgba(${a.wood === 'oak' ? '120,80,30' : '20,10,4'},${0.12 + random() * 0.25})`; c.lineWidth = 0.6 + random() * 2;
        const x = random() * w; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + (random() - 0.5) * 16, h * 0.3, x + (random() - 0.5) * 16, h * 0.6, x + (random() - 0.5) * 10, h); c.stroke();
      }
      if (a.wood === 'white') for (let i = 0; i < 30 * mood.wear + 4; i++) { c.fillStyle = '#9a8a70'; c.fillRect(random() * w, random() * h, 2 + random() * 6, 1 + random() * 3); }
    });
    const wood = new THREE.MeshStandardMaterial({ map: woodMap, roughness: a.wood === 'black' ? 0.35 : 0.6, metalness: a.wood === 'aluminium' ? 0.6 : 0 });
    const trimColour = { walnut: '#c9a03a', oak: '#a8875a', black: '#d9b040', white: '#bdb8a8', aluminium: '#c9ced2' }[a.wood];
    const trim = s.material(trimColour, { metalness: 0.75, roughness: 0.3 });
    const dark = s.material('#1b1b1e', { roughness: 0.7 });

    s.box([W, BASE, D], [0, BASE / 2, 0], wood);
    s.box([W + 0.04, 0.08, D + 0.03], [0, 0.04, 0], dark);
    s.box([W + 0.05, 0.03, D + 0.04], [0, BASE, 0], trim);
    // case: back, sides (thin posts so the glass shows), top
    const liningColour = { green: '#2f6b46', red: '#8a1c2a', mirror: '#b9c6cc', pegboard: '#e3d9bd', blue: '#23408f' }[a.lining];
    const liningMap = paint(256, 256, (c, w, h) => {
      c.fillStyle = liningColour; c.fillRect(0, 0, w, h);
      if (a.lining === 'pegboard') { c.fillStyle = '#8a7c5c'; for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) { c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill(); } }
      else if (a.lining === 'mirror') { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#dfe8ec'); g.addColorStop(0.5, '#93a4ad'); g.addColorStop(1, '#d2dde2'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(60,50,30,0.35)'; for (let i = 0; i < 40 * mood.wear; i++) { c.beginPath(); c.arc(random() < 0.5 ? random() * 30 : w - random() * 30, random() * h, 1 + random() * 5, 0, 7); c.fill(); } }
      else for (let i = 0; i < 1500; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,255,255'},0.05)`; c.fillRect(random() * w, random() * h, 2, 2); }
    });
    const lit = a.lit;
    const lightTint = new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.6, 0.8);
    const lining = new THREE.MeshStandardMaterial({ map: liningMap, roughness: a.lining === 'mirror' ? 0.15 : 0.95, metalness: a.lining === 'mirror' ? 0.6 : 0, emissive: lit ? lightTint : new THREE.Color('#000'), emissiveMap: liningMap, emissiveIntensity: lit ? mix(0.25, 0.5, mood.cheer) : 0 });
    s.box([W, TOP - BASE, 0.03], [0, (TOP + BASE) / 2, -D / 2 + 0.015], wood);
    s.box([W - 0.08, TOP - BASE - 0.04, 0.01], [0, (TOP + BASE) / 2, -D / 2 + 0.036], lining);
    for (const x of [-1, 1]) {
      s.box([0.045, TOP - BASE, 0.045], [x * (W / 2 - 0.0225), (TOP + BASE) / 2, D / 2 - 0.0225], wood);
      s.box([0.045, TOP - BASE, 0.045], [x * (W / 2 - 0.0225), (TOP + BASE) / 2, -D / 2 + 0.0225], wood);
    }
    s.box([W, 0.06, D], [0, TOP + 0.03, 0], wood);
    s.box([W + 0.06, H - TOP - 0.06, D + 0.04], [0, (H + TOP + 0.06) / 2, 0], wood);
    s.box([W + 0.08, 0.025, D + 0.06], [0, H + 0.0125, 0], wood); s.box([W + 0.09, 0.012, D + 0.07], [0, H - 0.006, 0], trim);
    if (a.header !== 'none') {
      const sign = s.label(HEADERS[a.header], W * 0.82, 0.1, [0, (H + TOP + 0.06) / 2 - 0.005, D / 2 + 0.022], a.wood === 'black' || a.wood === 'walnut' ? '#2a1c08' : '#f4ecd2', a.wood === 'black' || a.wood === 'walnut' ? '#d9b040' : '#3c2a1a');
      (sign.material as THREE.MeshStandardMaterial).metalness = 0.3;
    }
    if (lit) s.box([W - 0.2, 0.03, 0.05], [0, TOP - 0.02, D / 2 - 0.08], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: lightTint, emissiveIntensity: 1.6 }));

    // ---- base cupboard: the champions board and two doors
    const brass = '#d2a63a';
    const years = 1958 + Math.floor(random() * 12);
    const boardMap = paint(512, 256, (c, w, h) => {
      c.fillStyle = a.wood === 'walnut' ? '#7a5632' : '#4a2f1c'; c.fillRect(0, 0, w, h);
      c.strokeStyle = brass; c.lineWidth = 5; c.strokeRect(8, 8, w - 16, h - 16);
      c.fillStyle = brass; c.fillRect(w / 2 - 150, 20, 300, 38);
      c.fillStyle = '#2a1c08'; c.font = 'bold 26px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PAST CHAMPIONS', w / 2, 40);
      const filled = Math.floor(mix(12, 32, random()));
      for (let i = 0; i < 32; i++) {
        const x = 26 + (i % 8) * 58, y = 74 + Math.floor(i / 8) * 42;
        if (i >= filled) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x, y, 50, 32); continue; }
        c.fillStyle = i === filled - 1 ? '#f2d680' : brass; c.fillRect(x, y, 50, 32);
        c.fillStyle = '#3a2a0c'; c.font = 'bold 12px monospace'; c.fillText(String(years + i), x + 25, y + 10);
        c.fillRect(x + 6, y + 19, 38 - random() * 14, 2); c.fillRect(x + 6, y + 25, 30 - random() * 14, 2);
      }
    });
    s.mesh(new THREE.PlaneGeometry(W * 0.62, W * 0.31), new THREE.MeshStandardMaterial({ map: boardMap, roughness: 0.5, metalness: 0.25 }), [0, BASE / 2 + 0.03, D / 2 + 0.004]);
    for (const x of [-1, 1]) {
      s.box([W * 0.15, BASE - 0.2, 0.012], [x * W * 0.405, BASE / 2 + 0.03, D / 2 + 0.006], wood);
      s.box([W * 0.15 - 0.04, BASE - 0.24, 0.006], [x * W * 0.405, BASE / 2 + 0.03, D / 2 + 0.013], s.material(new THREE.Color(woodColour).multiplyScalar(0.8)));
      s.cylinder(0.012, 0.012, 0.03, [x * (W * 0.345), BASE / 2 + 0.06, D / 2 + 0.03], trim, 10).rotation.x = Math.PI / 2;
    }

    // ---- shelves and trophies, merged per colour so the mesh count stays small
    const rows = [BASE + 0.015, 1.24, 1.63];
    const clear = [0.42, 0.35, 0.31];
    const glassTint = new THREE.Color('#dff0f2').lerp(new THREE.Color('#b9b29a'), mood.wear * 0.7);
    const shelfGlass = new THREE.MeshPhysicalMaterial({ color: glassTint, transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false });
    for (const y of rows.slice(1)) { s.box([W - 0.1, 0.012, D - 0.08], [0, y - 0.006, 0], shelfGlass); s.box([W - 0.09, 0.014, 0.008], [0, y - 0.006, D / 2 - 0.045], trim); }

    const buckets = new Map<string, { geos: THREE.BufferGeometry[]; metal: number; rough: number }>();
    const put = (colour: string, geo: THREE.BufferGeometry, m: THREE.Matrix4, metal = 0.85, rough = 0.3) => {
      const flat = geo.index ? geo.toNonIndexed() : geo;
      if (flat !== geo) geo.dispose();
      for (const name of Object.keys(flat.attributes)) if (!['position', 'normal', 'uv'].includes(name)) flat.deleteAttribute(name);
      flat.applyMatrix4(m);
      const key = `${colour}|${metal}|${rough}`;
      if (!buckets.has(key)) buckets.set(key, { geos: [], metal, rough });
      buckets.get(key)!.geos.push(flat);
    };
    const M = (x: number, y: number, z: number, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) =>
      new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    const tarnish = (hex: string) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#6f6346'), mood.wear * 0.55).getHexString();
    const GOLD = tarnish('#e0aa22'), SILVER = tarnish('#cfd6da'), MARBLE = '#ece6d8', BLACK = '#1c1c20', WALNUT = '#4a2c18';
    const COLUMNS = ['#b3202c', '#1f4fb0', '#1f8a4c', '#7a2a9a', '#d9731c'].map(tarnish);
    const pinProfile = [[0, 0], [0.2, 0], [0.26, 0.12], [0.3, 0.28], [0.26, 0.45], [0.14, 0.62], [0.11, 0.72], [0.15, 0.84], [0.14, 0.93], [0.07, 1], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y));
    const cupProfile = [[0, 0], [0.22, 0], [0.2, 0.04], [0.05, 0.1], [0.05, 0.32], [0.12, 0.38], [0.32, 0.55], [0.42, 0.8], [0.44, 1], [0.4, 1], [0.38, 0.82], [0.28, 0.6], [0, 0.45]].map(([x, y]) => new THREE.Vector2(x, y));
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.2 : 0.5, t = i / 10 * 6.283 + Math.PI / 2; if (i) starShape.lineTo(Math.cos(t) * r, Math.sin(t) * r); else starShape.moveTo(Math.cos(t) * r, Math.sin(t) * r); }

    type Kind = 'cup' | 'column' | 'pin' | 'star' | 'plate';
    const trophy = (kind: Kind, h: number, place: THREE.Matrix4, tint = pick(COLUMNS)) => {
      const add = (colour: string, geo: THREE.BufferGeometry, m: THREE.Matrix4, metal?: number, rough?: number) => put(colour, geo, place.clone().multiply(m), metal, rough);
      const b = h * (kind === 'column' ? 0.14 : 0.2), w = Math.min(0.19, h * (kind === 'column' ? 0.5 : 0.56));
      const baseColour = kind === 'column' ? MARBLE : kind === 'cup' || kind === 'pin' ? WALNUT : BLACK;
      add(baseColour, new THREE.BoxGeometry(w, b, w * 0.8), M(0, b / 2, 0), 0, 0.5);
      add(GOLD, new THREE.BoxGeometry(w * 0.7, b * 0.4, 0.004), M(0, b / 2, w * 0.4), 0.7, 0.35);
      const rest = h - b;
      if (kind === 'cup') {
        add(GOLD, new THREE.LatheGeometry(cupProfile, 14), M(0, b, 0, rest * 0.42, rest, rest * 0.42));
        for (const sx of [-1, 1]) add(GOLD, new THREE.TorusGeometry(rest * 0.13, rest * 0.022, 5, 10, Math.PI), M(sx * rest * 0.17, b + rest * 0.72, 0, 1, 1, 1, 0, 0, -sx * Math.PI / 2));
      } else if (kind === 'column') {
        const twin = w > 0.1 && random() < 0.6, colH = rest * 0.52;
        for (const x of twin ? [-w * 0.3, w * 0.3] : [0]) add(tint, new THREE.CylinderGeometry(w * (twin ? 0.14 : 0.2), w * (twin ? 0.14 : 0.2), colH, 8), M(x, b + colH / 2, 0), 0.9, 0.25);
        add(MARBLE, new THREE.BoxGeometry(w * 0.85, rest * 0.06, w * 0.6), M(0, b + colH + rest * 0.03, 0), 0, 0.5);
        // the little bowler: lunging body, head, arm swung back, ball
        const f = rest * 0.42, y0 = b + colH + rest * 0.06;
        add(GOLD, new THREE.CylinderGeometry(f * 0.1, f * 0.14, f * 0.55, 6), M(0, y0 + f * 0.42, 0, 1, 1, 1, 0, 0, -0.35));
        add(GOLD, new THREE.SphereGeometry(f * 0.11, 8, 6), M(f * 0.14, y0 + f * 0.8, 0));
        add(GOLD, new THREE.CylinderGeometry(f * 0.04, f * 0.04, f * 0.5, 5), M(-f * 0.22, y0 + f * 0.5, 0, 1, 1, 1, 0, 0, 1.0));
        add(GOLD, new THREE.SphereGeometry(f * 0.1, 8, 6), M(-f * 0.42, y0 + f * 0.38, 0));
        add(GOLD, new THREE.CylinderGeometry(f * 0.05, f * 0.05, f * 0.4, 5), M(f * 0.16, y0 + f * 0.14, 0, 1, 1, 1, 0, 0, 0.7));
      } else if (kind === 'pin') {
        add(GOLD, new THREE.LatheGeometry(pinProfile, 12), M(0, b, 0, rest * 0.75, rest, rest * 0.75));
      } else if (kind === 'star') {
        add(random() < 0.5 ? SILVER : tint, new THREE.CylinderGeometry(w * 0.07, w * 0.1, rest * 0.4, 6), M(0, b + rest * 0.2, 0), 0.9, 0.25);
        add(random() < 0.7 ? SILVER : GOLD, new THREE.ExtrudeGeometry(starShape, { depth: 0.12, bevelEnabled: false }), M(0, b + rest * 0.66, -rest * 0.04, rest * 0.68));
      } else {
        add(SILVER, new THREE.CylinderGeometry(rest * 0.42, rest * 0.42, 0.012, 20), M(0, b + rest * 0.46, 0, 1, 1, 1, Math.PI / 2 - 0.2, 0, 0));
        add(GOLD, new THREE.CylinderGeometry(rest * 0.2, rest * 0.2, 0.016, 14), M(0, b + rest * 0.46, 0.004, 1, 1, 1, Math.PI / 2 - 0.2, 0, 0));
      }
    };
    const kindFor = (): Kind => {
      const r = random();
      if (a.era === 'goldcup') return r < 0.7 ? 'cup' : r < 0.88 ? 'plate' : 'pin';
      if (a.era === 'column') return r < 0.75 ? 'column' : r < 0.9 ? 'pin' : 'cup';
      if (a.era === 'modern') return r < 0.5 ? 'star' : r < 0.78 ? 'plate' : 'column';
      if (a.era === 'pins') return r < 0.85 ? 'pin' : 'cup';
      return pick(['cup', 'column', 'pin', 'star', 'plate'] as const);
    };

    // slots: [row, x, z]; back rank only when crowded
    const emptyRow = a.story === 'empty' ? 1 + Math.floor(random() * 2) : -1;
    const slots: [number, number, number][] = [];
    const perRow = 7, x0 = -(W - 0.34) / 2, step = (W - 0.34) / (perRow - 1);
    for (let row = 0; row < 3; row++) for (let i = 0; i < perRow; i++) slots.push([row, x0 + i * step, 0.06]);
    const back: [number, number, number][] = [];
    for (let row = 0; row < 3; row++) for (let i = 0; i < perRow - 1; i++) back.push([row, x0 + (i + 0.5) * step, -0.09]);
    const shuffle = <T,>(list: T[]) => { for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; };
    const taken = new Set<string>();
    const tag = (slot: [number, number, number]) => slot.join(',');

    // the story piece takes the middle of the middle shelf (or the floor for the giant)
    const feature = a.story === 'memorial' || a.story === 'ring' ? 1 : a.story === 'giant' ? 0 : -1;
    if (feature >= 0) for (const slot of [...slots, ...back]) if (slot[0] === feature && Math.abs(slot[1]) < (a.story === 'giant' ? 0.3 : 0.36)) taken.add(tag(slot));
    if (a.story === 'giant') {
      // it does not fit the shelves: it stands on top of the cabinet instead
      trophy(a.era === 'goldcup' ? 'cup' : a.era === 'pins' ? 'pin' : 'column', 0.78, M(0, H + 0.025, 0, 1.7, 1, 1.7));
      taken.clear();
    }
    const photoSlots: [number, number, number][] = [];
    if (a.photos) for (const slot of shuffle(back.slice()).slice(0, 2 + Math.floor(random() * 3))) if (!taken.has(tag(slot)) && slot[0] !== emptyRow) { photoSlots.push(slot); taken.add(tag(slot)); }

    const want = a.count < 0.08 ? 1 : Math.round(mix(3, 34, a.count ** 1.25) * mix(0.85, 1.15, mood.density));
    const order = want === 1 ? [[1, 0, 0.06] as [number, number, number]] : [...shuffle(slots.filter((slot) => !taken.has(tag(slot)))), ...shuffle(back.filter((slot) => !taken.has(tag(slot))))];
    let placed = 0;
    const fallen: number[] = [];
    for (const slot of order) {
      if (placed >= want) break;
      if (slot[0] === emptyRow) continue;
      const [row, x, z] = slot;
      const h = want === 1 ? 0.33 : clear[row] * mix(0.62, 0.96, random()) * (z < 0 ? 1 : 0.9);
      const jitterX = (random() - 0.5) * 0.04, turn = (random() - 0.5) * 0.5;
      const down = a.story === 'fallen' && random() < 0.4 && z > 0;
      if (down) { fallen.push(placed); trophy(kindFor(), Math.min(h, 0.2), M(x + jitterX - 0.08, rows[row] + 0.04, z + 0.02, 1, 1, 1, 0, turn, -Math.PI / 2 + 0.05)); }
      else trophy(kindFor(), h, M(x + jitterX, rows[row], z + (random() - 0.5) * 0.03, 1, 1, 1, 0, turn, 0));
      placed++;
    }
    // dust rings on the empty shelf, and one nameplate left behind
    if (emptyRow > 0) {
      const ringMaterial = s.material('#f4f4ee', { roughness: 0.9, transparent: true, opacity: 0.75 });
      for (let i = 0; i < perRow; i++) if (random() < 0.8) { const r = mix(0.04, 0.07, random()); const ring = s.mesh(new THREE.RingGeometry(r * 0.72, r, 20), ringMaterial, [x0 + i * step, rows[emptyRow] + 0.002, 0.04 + (random() - 0.5) * 0.08]); ring.rotation.x = -Math.PI / 2; ring.castShadow = false; }
      const card = s.label(pick(['ON LOAN', 'REMOVED', 'SEE DESK', '?']), 0.2, 0.09, [pick([-0.3, 0, 0.3]), rows[emptyRow] + 0.05, 0.1], '#30343a', '#f4f0e2');
      card.rotation.x = -0.25;
    }

    for (const [key, bucket] of buckets) {
      const [colour] = key.split('|');
      const merged = mergeGeometries(bucket.geos, false)!;
      for (const geo of bucket.geos) geo.dispose();
      s.mesh(merged, new THREE.MeshStandardMaterial({ color: colour, metalness: bucket.metal, roughness: bucket.rough + mood.wear * 0.25 }));
    }

    // ---- framed team photographs
    const framed = (w: number, h: number, at: [number, number, number], portrait: boolean) => {
      const sepia = random() < 0.5;
      const map = paint(256, Math.round(256 * h / w), (c, cw, ch) => {
        c.fillStyle = sepia ? '#c9b48a' : pick(['#7fa0b8', '#9ab07a', '#b89a7a']); c.fillRect(0, 0, cw, ch);
        c.fillStyle = sepia ? '#8a7450' : '#5a4a3a'; c.fillRect(0, ch * 0.72, cw, ch * 0.28);
        const shirt = sepia ? '#5a4630' : pick(['#b3202c', '#1f4fb0', '#e0aa22', '#1f8a4c']);
        const person = (x: number, y: number, r: number) => { c.fillStyle = shirt; c.beginPath(); c.ellipse(x, y + r * 2.6, r * 1.5, r * 2, 0, 0, 7); c.fill(); c.fillStyle = sepia ? '#e6d4ac' : '#e8b890'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.fillStyle = sepia ? '#4a3a24' : pick(['#2a1c10', '#6a4a20', '#c9c0b0']); c.beginPath(); c.arc(x, y - r * 0.3, r, Math.PI, 0); c.fill(); };
        if (portrait) person(cw / 2, ch * 0.36, cw * 0.17);
        else { const n = 4 + Math.floor(random() * 3); for (let i = 0; i < n; i++) person(cw * (i + 0.7) / (n + 0.4), ch * 0.3, cw * 0.05); for (let i = 0; i < n - 1; i++) person(cw * (i + 1.2) / (n + 0.4), ch * 0.5, cw * 0.055); }
        c.fillStyle = 'rgba(255,255,255,0.15)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(cw * 0.5, 0); c.lineTo(0, ch * 0.7); c.fill();
      });
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, h + 0.03, 0.015), portrait ? dark : trim);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.4 }));
      pic.position.z = 0.009; frame.castShadow = true; g.add(frame, pic);
      g.position.set(at[0], at[1] + h / 2 + 0.02, at[2]); g.rotation.x = -0.14;
      s.root.add(g);
      return g;
    };
    for (const [row, x, z] of photoSlots) framed(0.2, 0.15, [x, rows[row], z - 0.02], false);

    if (a.story === 'memorial') {
      const y = rows[1];
      const g = framed(0.2, 0.26, [0, y, 0.02], true);
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.004), dark);
      ribbon.position.set(0.075, 0.1, 0.012); ribbon.rotation.z = -Math.PI / 4; g.add(ribbon);
      // a single flower in a bud vase and a candle
      s.lathe([[0, 0], [0.022, 0], [0.028, 0.03], [0.012, 0.08], [0.014, 0.1]], s.material('#dfe8ec', { roughness: 0.2 }), [0.2, y, 0.08]);
      s.rod([0.2, y + 0.09, 0.08], [0.215, y + 0.22, 0.08], 0.003, s.material('#3f7a3a'));
      s.ball([0.026, 0.02, 0.026], [0.216, y + 0.23, 0.08], s.material(mood.wear > 0.6 ? '#8a6a4a' : '#f2f0ea'), 10);
      s.cylinder(0.018, 0.018, 0.07, [-0.2, y + 0.035, 0.08], s.material('#f1ead2'), 10);
      s.ball([0.008, 0.016, 0.008], [-0.2, y + 0.085, 0.08], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb030', emissiveIntensity: mood.wear > 0.6 ? 0 : 2 }), 8);
    }
    if (a.story === 'ring') {
      const y = rows[1];
      s.box([0.26, 0.05, 0.2], [0, y + 0.025, 0.05], s.material('#a01828', { roughness: 0.95 }));
      s.box([0.13, 0.05, 0.11], [0, y + 0.075, 0.05], s.material('#22283a', { roughness: 0.8 }));
      const lid = s.box([0.13, 0.11, 0.012], [0, y + 0.15, -0.012], s.material('#22283a', { roughness: 0.8 })); lid.rotation.x = -0.25;
      s.box([0.11, 0.012, 0.09], [0, y + 0.1, 0.05], s.material('#f2efe6', { roughness: 0.9 }));
      const ring = s.ring(0.03, 0.009, [0, y + 0.135, 0.05], new THREE.MeshStandardMaterial({ color: '#f0c030', metalness: 0.9, roughness: 0.2, emissive: '#c08a10', emissiveIntensity: 0.5 }));
      ring.rotation.y = 0.3;
      s.ball([0.012, 0.012, 0.012], [0, y + 0.172, 0.05], new THREE.MeshStandardMaterial({ color: '#d02a3a', emissive: '#d02a3a', emissiveIntensity: 0.8 }), 8);
      const card = s.label('300', 0.12, 0.08, [0.2, y + 0.045, 0.1], '#8a1c2a', '#f4f0e2'); card.rotation.x = -0.3;
      const note = s.label('UNCLAIMED', 0.18, 0.05, [-0.2, y + 0.03, 0.1], '#30343a', '#f4f0e2'); note.rotation.x = -0.3;
      // dust: a grey film over the cushion when worn
      if (mood.wear > 0.4) s.box([0.27, 0.004, 0.21], [0, y + 0.052, 0.05], s.material('#b9b29a', { transparent: true, opacity: 0.5 }));
    }

    // ---- glass doors
    const glass = new THREE.MeshPhysicalMaterial({ color: glassTint, transparent: true, opacity: mix(0.1, 0.24, mood.wear), roughness: 0.05, depthWrite: false });
    const paneW = W / 2 - 0.01, paneH = TOP - BASE - 0.03, zf = D / 2 - 0.012;
    const pane = (x: number, z: number, withGlass = true) => {
      if (withGlass) s.box([paneW, paneH, 0.006], [x, (TOP + BASE) / 2, z], glass).castShadow = false;
      for (const side of [-1, 1]) s.box([0.022, paneH, 0.012], [x + side * (paneW / 2 - 0.011), (TOP + BASE) / 2, z], trim);
      s.box([0.016, 0.07, 0.02], [x + (x < 0 ? 1 : -1) * (paneW / 2 - 0.06), (TOP + BASE) / 2 - 0.1, z + 0.01], dark);
    };
    s.box([W - 0.09, 0.02, 0.03], [0, BASE + 0.025, zf - 0.006], trim);
    s.box([W - 0.09, 0.02, 0.03], [0, TOP - 0.01, zf - 0.006], trim);
    pane(-W / 4 + 0.005, zf);
    if (a.doors === 'ajar') pane(W / 4 - 0.005 - mix(0.3, 0.6, random()), zf - 0.014);
    else if (a.doors === 'broken') {
      pane(W / 4 - 0.005, zf - 0.014, false);
      const shard = s.material('#cfe6ea', { transparent: true, opacity: 0.7, roughness: 0.1 });
      for (let i = 0; i < 14; i++) { const m = s.mesh(new THREE.CircleGeometry(mix(0.03, 0.09, random()), 3), shard, [W / 4 + (random() - 0.5) * 0.9, 0.004 + i * 0.0004, D / 2 + 0.08 + random() * 0.4]); m.rotation.set(-Math.PI / 2, 0, random() * 6); }
      // jagged teeth still in the frame
      for (let i = 0; i < 6; i++) { const m = s.mesh(new THREE.CircleGeometry(mix(0.06, 0.16, random()), 3), shard, [W / 4 + (random() - 0.5) * (paneW - 0.1), random() < 0.5 ? BASE + 0.08 : TOP - 0.08, zf - 0.014]); m.rotation.z = random() * 6; m.castShadow = false; }
    } else pane(W / 4 - 0.005, zf - 0.014);
    if (a.doors === 'padlocked') {
      s.box([0.1, 0.035, 0.008], [0, (TOP + BASE) / 2, zf + 0.012], trim);
      s.box([0.06, 0.05, 0.022], [0, (TOP + BASE) / 2 - 0.05, zf + 0.022], s.material('#c9a03a', { metalness: 0.8, roughness: 0.3 }));
      s.ring(0.022, 0.006, [0, (TOP + BASE) / 2 - 0.02, zf + 0.022], s.material('#9aa0a4', { metalness: 0.9, roughness: 0.3 }), Math.PI);
    }

    return s.finish();
  },
});
