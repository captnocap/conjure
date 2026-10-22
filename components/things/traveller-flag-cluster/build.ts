import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score, visibleBounds, disposeTree } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const W = 96, H = 64;
const hs = (c: Ctx, colours: string[], weights?: number[]) => {
  const total = (weights ?? colours.map(() => 1)).reduce((sum, value) => sum + value, 0);
  let y = 0;
  colours.forEach((colour, i) => { const h = (weights?.[i] ?? 1) / total * H; c.fillStyle = colour; c.fillRect(0, y, W, h + 1); y += h; });
};
const vs = (c: Ctx, colours: string[], weights?: number[]) => {
  const total = (weights ?? colours.map(() => 1)).reduce((sum, value) => sum + value, 0);
  let x = 0;
  colours.forEach((colour, i) => { const w = (weights?.[i] ?? 1) / total * W; c.fillStyle = colour; c.fillRect(x, 0, w + 1, H); x += w; });
};
const disc = (c: Ctx, colour: string, x: number, y: number, r: number) => { c.fillStyle = colour; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill(); };
const cross = (c: Ctx, field: string, outer: string, inner?: string) => {
  c.fillStyle = field; c.fillRect(0, 0, W, H);
  c.fillStyle = outer; c.fillRect(26, 0, 16, H); c.fillRect(0, 24, W, 16);
  if (inner) { c.fillStyle = inner; c.fillRect(30, 0, 8, H); c.fillRect(0, 28, W, 8); }
};
const FLAGS: Record<string, (c: Ctx) => void> = {
  bo: (c) => hs(c, ['#d52b1e', '#f9e300', '#007934']),
  wi: (c) => {
    const rainbow = ['#e4002b', '#ff8200', '#ffd100', '#ffffff', '#009a44', '#00a3e0', '#6d2077'];
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { c.fillStyle = rainbow[(i - j + 10) % 7]; c.fillRect(i * W / 7, j * H / 7, W / 7 + 1, H / 7 + 1); }
  },
  ar: (c) => { hs(c, ['#74acdf', '#ffffff', '#74acdf']); disc(c, '#f6b40e', W / 2, H / 2, 7); },
  br: (c) => { c.fillStyle = '#009c3b'; c.fillRect(0, 0, W, H); c.fillStyle = '#ffdf00'; c.beginPath(); c.moveTo(8, H / 2); c.lineTo(W / 2, 6); c.lineTo(W - 8, H / 2); c.lineTo(W / 2, H - 6); c.fill(); disc(c, '#002776', W / 2, H / 2, 13); },
  cl: (c) => { hs(c, ['#ffffff', '#d52b1e']); c.fillStyle = '#0039a6'; c.fillRect(0, 0, 32, 32); disc(c, '#ffffff', 16, 16, 6); },
  pe: (c) => vs(c, ['#d91023', '#ffffff', '#d91023']),
  co: (c) => hs(c, ['#fcd116', '#003893', '#ce1126'], [2, 1, 1]),
  jp: (c) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); disc(c, '#bc002d', W / 2, H / 2, 19); },
  fr: (c) => vs(c, ['#0055a4', '#ffffff', '#ef4135']),
  de: (c) => hs(c, ['#111111', '#dd0000', '#ffce00']),
  it: (c) => vs(c, ['#009246', '#ffffff', '#ce2b37']),
  nl: (c) => hs(c, ['#ae1c28', '#ffffff', '#21468b']),
  es: (c) => hs(c, ['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1]),
  se: (c) => cross(c, '#006aa7', '#fecc00'),
  no: (c) => cross(c, '#ba0c2f', '#ffffff', '#00205b'),
  dk: (c) => cross(c, '#c8102e', '#ffffff'),
  ch: (c) => { c.fillStyle = '#d52b1e'; c.fillRect(0, 0, W, H); c.fillStyle = '#ffffff'; c.fillRect(40, 14, 16, 36); c.fillRect(30, 24, 36, 16); },
  uk: (c) => {
    c.fillStyle = '#012169'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#ffffff'; c.lineWidth = 12; c.beginPath(); c.moveTo(0, 0); c.lineTo(W, H); c.moveTo(W, 0); c.lineTo(0, H); c.stroke();
    c.strokeStyle = '#c8102e'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#ffffff'; c.fillRect(38, 0, 20, H); c.fillRect(0, 22, W, 20);
    c.fillStyle = '#c8102e'; c.fillRect(42, 0, 12, H); c.fillRect(0, 26, W, 12);
  },
  us: (c) => {
    for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#b22234'; c.fillRect(0, i * H / 7, W, H / 7 + 1); }
    c.fillStyle = '#3c3b6e'; c.fillRect(0, 0, 40, H * 4 / 7);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) disc(c, '#ffffff', 6 + i * 9.5, 7 + j * 11, 2);
  },
  ca: (c) => { vs(c, ['#d52b1e', '#ffffff', '#d52b1e'], [1, 2, 1]); c.fillStyle = '#d52b1e'; c.beginPath(); c.moveTo(48, 12); c.lineTo(60, 30); c.lineTo(54, 44); c.lineTo(48, 52); c.lineTo(42, 44); c.lineTo(36, 30); c.fill(); },
  kr: (c) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); disc(c, '#cd2e3a', W / 2, H / 2 - 4, 13); disc(c, '#0047a0', W / 2, H / 2 + 5, 11); c.fillStyle = '#111111'; for (const [x, y] of [[12, 10], [74, 10], [12, 46], [74, 46]]) c.fillRect(x, y, 12, 8); },
  cn: (c) => { c.fillStyle = '#de2910'; c.fillRect(0, 0, W, H); disc(c, '#ffde00', 16, 16, 8); for (const [x, y] of [[32, 6], [38, 14], [38, 24], [32, 32]]) disc(c, '#ffde00', x, y, 2.5); },
};
const GROUPS = {
  world: Object.keys(FLAGS),
  neighbours: ['bo', 'wi', 'ar', 'br', 'cl', 'pe', 'co', 'bo', 'wi'],
  europe: ['fr', 'de', 'it', 'nl', 'es', 'se', 'no', 'dk', 'ch', 'uk'],
  pacific: ['jp', 'kr', 'cn', 'us', 'ca', 'jp', 'kr'],
  home: ['bo', 'wi', 'bo', 'wi', 'bo'],
} as const;

export default defineThing({
  questions: {
    arrangement: choice('How are the poles planted?', {
      ring: 'A full ring, a little stadium of flags around an empty centre.',
      horseshoe: 'A horseshoe open toward the viewer.',
      row: 'A straggling row, like a border nobody guards.',
      clump: 'A tight bristling clump all stuck into one mound.',
    }),
    count: score('How many flags?', ['Four or five', 'About ten', 'A couple of dozen']),
    nations: choice('Whose flags are they?', {
      world: 'Everybody: a jumble from every continent.',
      neighbours: 'South American neighbours, with the chequered rainbow wiphala among them.',
      europe: 'European backpackers: tricolours and Nordic crosses.',
      pacific: 'Pacific-rim tour groups: Japan, Korea, China, North America.',
      home: 'Only the local tricolour and the wiphala, repeated.',
    }),
    condition: choice('What state are the flags in?', {
      crisp: 'New this season, colours still loud.',
      faded: 'Sun-bleached pale, colours ghosting to pastel.',
      tattered: 'Shredded at the fly, ragged ribbons.',
      gone: 'Mostly gone: bare poles, a few rags, one fallen.',
    }),
    centre: choice('What stands in the middle or beside them?', {
      cairn: 'A cairn of stacked salt blocks.',
      fingerpost: 'A signpost bristling with arrows to far cities and their distances.',
      platform: 'A stepped salt-block platform for standing on to be photographed.',
      nothing: 'Nothing: only trampled ground.',
    }),
    poles: choice('What are the poles?', {
      scavenged: 'Mismatched and scavenged: bamboo, pipe, timber, each a different height.',
      steel: 'Matching galvanised steel poles, set by a tour company.',
      tall: 'Very tall thin whips that bend in the wind.',
    }),
    tokens: choice('What else have visitors left?', {
      none: 'Nothing more.',
      stones: 'Small stones piled at each base.',
      bunting: 'Strings of little coloured pennants tied from pole to pole.',
      litter: 'Bottles, a lost shoe, stickers: the tide-line of tourism.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const mat = (c: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...extra });
    const total = Math.round(mix(4, 22, Math.min(1, a.count * 0.85 + mood.density * 0.2)));
    const group = GROUPS[a.nations];
    const fade = { crisp: 0, faded: 0.34, tattered: 0.2, gone: 0.4 }[a.condition] + wear * 0.14;
    const tatter = { crisp: 0, faded: 0.15, tattered: 0.75, gone: 0.9 }[a.condition] + wear * 0.15;

    const textures: THREE.Texture[] = [];
    const flagTexture = (id: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const c = canvas.getContext('2d')!;
      FLAGS[id](c);
      c.fillStyle = `rgba(244,240,230,${Math.min(0.62, fade * mix(0.7, 1.2, random()))})`;
      c.fillRect(0, 0, W, H);
      // Rag the fly end.
      c.globalCompositeOperation = 'destination-out';
      const depth = tatter * mix(0.3, 1, random());
      if (depth > 0.05) {
        c.beginPath();
        c.moveTo(W, 0);
        for (let y = 0; y <= H; y += 4) c.lineTo(W - random() * depth * W * 0.6 - (y % 8 ? 0 : depth * 10), y);
        c.lineTo(W, H);
        c.fill();
        for (let i = 0; i < depth * 5; i++) c.fillRect(W * mix(0.35, 0.8, random()), random() * H, W, 2 + random() * 4);
      }
      c.globalCompositeOperation = 'source-over';
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      return texture;
    };

    // Pole positions.
    const spots: { x: number; z: number; out: number }[] = [];
    const radius = a.arrangement === 'clump' ? 0.5 : Math.max(1.7, total * 0.2);
    for (let i = 0; i < total; i++) {
      if (a.arrangement === 'ring') { const t = i / total * Math.PI * 2 + 0.2; spots.push({ x: Math.sin(t) * radius, z: Math.cos(t) * radius, out: t }); }
      else if (a.arrangement === 'horseshoe') { const t = mix(0.7, Math.PI * 2 - 0.7, total > 1 ? i / (total - 1) : 0.5); spots.push({ x: Math.sin(t) * radius, z: Math.cos(t) * radius, out: t }); }
      else if (a.arrangement === 'row') spots.push({ x: (i - (total - 1) / 2) * mix(0.6, 0.8, random()), z: Math.sin(i * 0.9) * 0.35 + (random() - 0.5) * 0.3, out: (random() - 0.5) * 6 });
      else { const t = i * 2.4, r = 0.2 * Math.sqrt(i + 0.5); spots.push({ x: Math.sin(t) * r, z: Math.cos(t) * r, out: t }); }
    }

    const wind = random() * Math.PI * 2;
    const flags: { geometry: THREE.BufferGeometry; w: number; h: number; droop: number; phase: number }[] = [];
    const NX = 10, NY = 4;
    const shapeFlag = (flag: (typeof flags)[number], time: number) => {
      const position = flag.geometry.attributes.position;
      const amp = mix(0.02, 0.17, mood.energy) * flag.w;
      const cos = Math.cos(flag.droop), sin = Math.sin(flag.droop);
      for (let iy = 0; iy <= NY; iy++) for (let ix = 0; ix <= NX; ix++) {
        const u = ix / NX, v = iy / NY;
        const wave = Math.sin(u * 7 - time + flag.phase + v * 1.3) * amp * u;
        position.setXYZ(iy * (NX + 1) + ix, u * flag.w * cos + v * flag.h * sin * 0.25, -v * flag.h * (0.75 + 0.25 * cos) - u * flag.w * sin + wave * 0.3, wave);
      }
      position.needsUpdate = true;
      flag.geometry.computeVertexNormals();
    };

    const poleKinds = [
      { colour: '#b8934a', r: 0.045 }, { colour: '#737b80', r: 0.04 }, { colour: '#6b4e32', r: 0.05 }, { colour: '#4d463f', r: 0.036 }, { colour: '#3f6f9a', r: 0.04 },
    ];
    const blockPaint = mat('#eceae2', { roughness: 0.95 });
    const stonePaint = mat('#8a8379', { roughness: 1, flatShading: true });
    const stones: { at: readonly [number, number, number]; size: number }[] = [];
    const tops: THREE.Vector3[] = [];
    const lostAt = a.condition === 'gone' ? Math.floor(random() * total) : -1;
    spots.forEach((spot, index) => {
      const kind = a.poles === 'steel' ? poleKinds[1] : a.poles === 'tall' ? poleKinds[3] : poleKinds[Math.floor(random() * poleKinds.length)];
      const height = a.poles === 'steel' ? 3.4 : a.poles === 'tall' ? mix(4.4, 5.6, random()) : mix(2.3, 4.0, random());
      const paint = mat(kind.colour, { metalness: kind.colour === '#737b80' ? 0.6 : 0, roughness: 0.7 });
      const pole = new THREE.Group();
      const fallen = index === lostAt;
      const lean = (a.poles === 'steel' ? 0.03 : 0.1) + wear * 0.16 + (a.arrangement === 'clump' ? 0.22 : 0);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(kind.r * 0.75, kind.r, height, 7), paint);
      shaft.position.y = height / 2;
      shaft.castShadow = true;
      pole.add(shaft);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(kind.r * 1.5, 8, 6), paint);
      knob.position.y = height;
      pole.add(knob);
      // The flag.
      const bare = a.condition === 'gone' && !fallen && random() < 0.4;
      if (!bare) {
        const w = mix(1.25, 1.85, random()) * (a.poles === 'tall' ? 1.15 : 1), h = w * 0.64;
        const geometry = new THREE.PlaneGeometry(w, h, NX, NY);
        const id = group[(index + Math.floor(random() * 3)) % group.length];
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: flagTexture(id), side: THREE.DoubleSide, alphaTest: 0.5, roughness: 0.9 }));
        mesh.castShadow = true;
        mesh.frustumCulled = false;
        const flag = { geometry, w, h, droop: Math.min(1.35, mix(1.2, 0.1, mood.energy) + (random() - 0.5) * 0.3), phase: random() * 6.3 };
        flags.push(flag);
        shapeFlag(flag, 0);
        mesh.position.y = height - 0.06;
        mesh.rotation.y = fallen ? 0 : wind + (random() - 0.5) * 0.35 - spot.out * 0;
        pole.add(mesh);
        if (a.condition === 'tattered' && random() < 0.5) {
          // A second, older rag below the first.
          const rag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshStandardMaterial({ map: flagTexture(group[Math.floor(random() * group.length)]), side: THREE.DoubleSide, alphaTest: 0.5 }));
          rag.position.set(0.2, height - h - 0.4, 0);
          rag.rotation.set(0, wind, -0.6);
          pole.add(rag);
        }
      }
      pole.position.set(spot.x, 0, spot.z);
      if (fallen) {
        pole.rotation.set(0, random() * 6.3, Math.PI / 2 - 0.03);
        pole.position.set(spot.x * 1.25, 0.05, spot.z * 1.25);
      } else {
        const direction = a.arrangement === 'clump' ? spot.out : random() * 6.3;
        const amount = lean * mix(0.3, 1, random());
        pole.rotation.set(Math.cos(direction) * amount, 0, -Math.sin(direction) * amount);
        tops.push(new THREE.Vector3(0, height * 0.82, 0).applyEuler(pole.rotation).add(pole.position));
      }
      s.root.add(pole);
      // Footing.
      if (a.arrangement !== 'clump' && !fallen) {
        const pick = a.poles === 'steel' ? 0 : Math.floor(random() * 3);
        if (pick === 0) s.box([0.34, 0.22, 0.34], [spot.x, 0.11, spot.z], blockPaint).rotation.y = random();
        else if (pick === 1) { const tyre = s.ring(0.24, 0.1, [spot.x, 0.09, spot.z], mat('#222224', { roughness: 1 })); tyre.rotation.x = Math.PI / 2; }
        else for (let k = 0; k < 4; k++) stones.push({ at: [spot.x + (random() - 0.5) * 0.3, 0.06, spot.z + (random() - 0.5) * 0.3], size: mix(0.07, 0.13, random()) });
        if (a.tokens === 'stones') for (let k = 0; k < 7; k++) stones.push({ at: [spot.x + (random() - 0.5) * 0.5, 0.04 + (k < 3 ? 0.1 : 0), spot.z + (random() - 0.5) * 0.5], size: mix(0.05, 0.11, random()) });
      }
    });
    if (a.arrangement === 'clump') {
      s.ball([1.0, 0.4, 1.0], [0, 0, 0], blockPaint, 14);
      for (let k = 0; k < 9; k++) { const t = random() * 6.3; s.box([0.4, 0.2, 0.3], [Math.cos(t) * 0.8, 0.1, Math.sin(t) * 0.8], blockPaint).rotation.y = random() * 3; }
    }
    if (stones.length) s.scatter(new THREE.DodecahedronGeometry(1, 0), stonePaint, stones);

    // Bunting between neighbouring pole tops.
    if (a.tokens === 'bunting' && tops.length > 2) {
      const colours = mood.cheer > 0.35 ? ['#e2562f', '#f2c12e', '#2f8fc2', '#3da35d', '#d43d7a', '#f4f1e8'] : ['#b8a79a', '#c9c2a8', '#9aa9b3', '#a3ad9c'];
      const pennants: { p: THREE.Vector3; c: string }[] = [];
      const cord = mat('#d9d2c0');
      const runs = a.arrangement === 'row' ? tops.length - 1 : tops.length;
      for (let i = 0; i < runs; i++) {
        const from = tops[i], to = tops[(i + 1) % tops.length];
        if (from.distanceTo(to) > 3.2) continue;
        const middle = from.clone().lerp(to, 0.5);
        middle.y -= 0.35;
        const curve = new THREE.QuadraticBezierCurve3(from, middle, to);
        s.mesh(new THREE.TubeGeometry(curve, 8, 0.006, 4), cord).castShadow = false;
        for (let k = 1; k < 7; k++) pennants.push({ p: curve.getPoint(k / 7), c: colours[(i + k) % colours.length] });
      }
      if (pennants.length) {
        const triangle = new THREE.BufferGeometry();
        triangle.setAttribute('position', new THREE.Float32BufferAttribute([-0.07, 0, 0, 0.07, 0, 0, 0, -0.2, 0], 3));
        triangle.computeVertexNormals();
        const mesh = new THREE.InstancedMesh(triangle, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9 }), pennants.length);
        const dummy = new THREE.Object3D();
        pennants.forEach((pennant, i) => {
          dummy.position.copy(pennant.p);
          dummy.rotation.set((random() - 0.5) * 0.6 * mood.energy, random() * 3, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          mesh.setColorAt(i, new THREE.Color(pennant.c));
        });
        mesh.castShadow = true;
        s.root.add(mesh);
      }
    }

    // Centre piece.
    const beside = a.arrangement === 'row' || a.arrangement === 'clump';
    const cx = beside ? (a.arrangement === 'row' ? 0 : 1.9) : 0, cz = beside ? 1.5 : 0;
    if (a.centre === 'cairn') {
      for (let layer = 0; layer < 5; layer++) {
        const size = 1.0 - layer * 0.17;
        s.box([size, 0.24, size * 0.9], [cx + (random() - 0.5) * 0.05, 0.12 + layer * 0.24, cz], blockPaint).rotation.y = (random() - 0.5) * 0.3;
      }
      s.label('3656 m', 0.5, 0.16, [cx, 0.62, cz + 0.4], '#3a342c', '#c9b98e').castShadow = false;
    } else if (a.centre === 'fingerpost') {
      s.rod([cx, 0, cz], [cx + 0.05, 3.1, cz], 0.05, mat('#7a5c3c'));
      s.box([0.5, 0.3, 0.5], [cx, 0.15, cz], blockPaint);
      const places = ['LA PAZ 540', 'TOKYO 16 800', 'PARIS 10 300', 'LIMA 1 400', 'SYDNEY 12 900', 'NEW YORK 6 700', 'CAPE TOWN 9 200', 'HOME ?'];
      const boards = mood.cheer > 0.4 ? ['#f2c12e', '#e7e2d2', '#7fc4e8', '#e98a6a', '#a7d39a'] : ['#d6d0c0', '#c2bba8', '#b7b9b4'];
      const n = 5 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) {
        const text = places[(i + Math.floor(random() * 8)) % places.length];
        const sign = s.label(text, 1.0, 0.2, [0, 0, 0], '#27231f', boards[i % boards.length]);
        const turn = random() * 6.3;
        sign.position.set(cx + 0.03 + Math.sin(turn + Math.PI / 2) * 0.5, 2.95 - i * 0.27, cz + Math.cos(turn + Math.PI / 2) * 0.5);
        sign.rotation.set(0, turn, (random() - 0.5) * 0.12);
      }
    } else if (a.centre === 'platform') {
      s.box([2.0, 0.24, 1.6], [cx, 0.12, cz], blockPaint);
      s.box([1.3, 0.24, 1.0], [cx, 0.36, cz], blockPaint);
      s.box([0.7, 0.24, 0.5], [cx, 0.6, cz - 0.1], blockPaint);
    }
    if (a.tokens === 'litter') {
      const plastics = ['#3f8fb5', '#7fbf6a', '#e8e4d8', '#d9534a'];
      for (let i = 0; i < 9; i++) {
        const t = random() * 6.3, r = radius * mix(0.3, 1.2, random());
        const bottle = s.cylinder(0.035, 0.04, 0.22, [Math.sin(t) * r, 0.04, Math.cos(t) * r], mat(plastics[i % 4], { roughness: 0.3 }), 8);
        bottle.rotation.set(Math.PI / 2, 0, random() * 3);
      }
      const shoe = s.ball([0.06, 0.05, 0.14], [radius * 0.5, 0.05, radius * 0.6], mat('#c8342e'), 8);
      shoe.rotation.y = random() * 3;
    }
    // Trampled ground.
    const reach = Math.max(...spots.map((spot) => Math.hypot(spot.x, spot.z))) + 0.9;
    const pad = s.cylinder(reach, reach + 0.25, 0.05, [0, -0.02, a.arrangement === 'row' ? 0.4 : 0], mat('#dedad0', { roughness: 1 }), 36);
    if (a.arrangement === 'row') pad.scale.z = 0.45;
    pad.castShadow = false;

    const bounds = visibleBounds(s.root);
    const centre = bounds.getCenter(new THREE.Vector3());
    s.root.position.set(-centre.x, 0, -centre.z);
    const speed = mix(1.2, 9, mood.energy);
    return {
      object: s.root,
      update: (_dt, time) => { for (const flag of flags) shapeFlag(flag, time * speed); },
      dispose: () => { for (const texture of textures) texture.dispose(); disposeTree(s.root); },
    };
  },
});
