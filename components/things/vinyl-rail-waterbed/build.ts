import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P = [number, number, number];
type Ctx = CanvasRenderingContext2D;
const canvasTexture = (width: number, height: number, draw: (ctx: Ctx, w: number, h: number) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
};

const SHEETS = {
  black: { description: 'Black satin, the full bachelor.', tint: '#1c1b20', cover: '#a8182a', band: '#3a3a42' },
  red: { description: 'Scarlet satin.', tint: '#b01c2e', cover: '#1c1b20', band: '#f0d8d8' },
  leopard: { description: 'Leopard-print satin.', tint: '#c9a04a', cover: '#1c1b20', band: '#e8d8b0' },
  purple: { description: 'Deep purple satin.', tint: '#4a1e6a', cover: '#1c1b20', band: '#c8a8e0' },
  champagne: { description: 'Champagne gold satin.', tint: '#d8c08a', cover: '#4a2a18', band: '#f4ecd8' },
  blue: { description: 'Royal blue satin.', tint: '#1e3a9a', cover: '#e8e4dc', band: '#f0f0f4' },
  white: { description: 'White satin, trying for classy.', tint: '#f0ece4', cover: '#c9a44a', band: '#ffffff' },
} as const;

export default defineThing({
  questions: {
    sheets: choice('What colour are the satin sheets?', Object.fromEntries(Object.entries(SHEETS).map(([key, value]) => [key, value.description])) as Record<keyof typeof SHEETS, string>),
    headboard: choice('What is the headboard like?', {
      mirror: 'A smoked mirror panel in a brass frame, so you can watch yourself.',
      bookcase: 'A dark wood bookcase headboard with cubbies, a sliding door and a ledge along the top.',
      lights: 'A padded headboard ringed with lit round bulbs, like a dressing-room mirror.',
      padded: 'Button-tufted padded vinyl and nothing else.',
    }),
    state: choice('What state is the bed in?', {
      made: 'Made tight: comforter smooth, pillows squared against the headboard.',
      rumpled: 'Slept in and rumpled: comforter dragged to one side, pillows askew.',
      heaped: 'The morning after: the comforter in a heap at the foot, a pillow on the floor.',
      stripped: 'Stripped to the bare blue vinyl bladder, the sheets in a pile on the floor.',
    }),
    lump: noul('If the covers are on, is somebody under them: a long lump with one foot sticking out?'),
    phone: noul('Is there a telephone on the headboard with a long coiled cord trailing over the rail and across the floor?'),
    shelf: choice('What sits on the headboard ledge?', {
      nothing: 'Nothing.',
      lava: 'A lava lamp glowing orange.',
      wine: 'A bottle of wine and two glasses.',
      radio: 'A clock radio with red digits.',
      ashtray: 'An ashtray and a stack of magazines.',
      boombox: 'A silver cassette boombox.',
    }),
    base: choice('What does the bed stand on?', {
      drawers: 'A dark pedestal with drawers down the sides.',
      plain: 'A plain carpeted plinth.',
      steps: 'Two carpeted steps up to it, like a stage.',
      mirrored: 'A pedestal faced with mirror tiles.',
    }),
    rails: choice('What colour is the padded vinyl frame?', {
      brown: 'Chocolate brown vinyl.',
      black: 'Black vinyl.',
      burgundy: 'Burgundy vinyl.',
      cream: 'Cream vinyl, yellowed a little.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const sheet = SHEETS[a.sheets];
    const stripped = a.state === 'stripped';
    const covered = !stripped;

    // ---- Dimensions: a king bladder in a padded frame on a pedestal, headboard at -z, foot at +z.
    const W = 1.9, D = 2.15, railW = 0.15, railH = 0.2, baseH = 0.34, bladderH = 0.22;
    const FW = W + railW * 2, FD = D + railW * 2;
    const deckY = baseH + 0.06;
    const topY = deckY + bladderH;
    const HW = FW + 0.1, HH = 1.5, HD = 0.3, headZ = -FD / 2 - HD / 2 - 0.02;

    // ---- Materials.
    const woodTexture = (base: string, dark: string) => canvasTexture(512, 256, (ctx, w, h) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 80; i++) {
        ctx.strokeStyle = dark; ctx.globalAlpha = 0.1 + random() * 0.25; ctx.lineWidth = 1 + random() * 3;
        const y = random() * h, wobble = 3 + random() * 9, f = random() * 0.1;
        ctx.beginPath(); ctx.moveTo(0, y);
        for (let x = 0; x <= w; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.02 + f) * wobble + Math.sin(x * 0.07) * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });
    const walnut = new THREE.MeshStandardMaterial({ map: woodTexture('#4a2a16', '#1e0e06'), roughness: 0.45 });
    const satinOf = (tint: string) => s.material(tint, { roughness: 0.28, metalness: 0.05, emissive: tint, emissiveIntensity: 0.06 });
    const leopardMap = a.sheets === 'leopard' ? canvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#d2a85a'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        const x = random() * w, y = random() * h, r = 7 + random() * 9;
        ctx.fillStyle = '#2a1a0c'; ctx.beginPath(); ctx.arc(x, y, r, 0.4, 2.9); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r, 3.5, 6.0); ctx.fill();
        ctx.fillStyle = '#9a5a22'; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, 7); ctx.fill();
      }
    }) : null;
    const satin = leopardMap ? new THREE.MeshStandardMaterial({ map: leopardMap, roughness: 0.3 }) : satinOf(sheet.tint);
    if (leopardMap) leopardMap.repeat.set(3, 3);
    const cover = satinOf(sheet.cover);
    const band = s.material(sheet.band, { roughness: 0.4 });
    for (const m of [satin, cover, band]) m.side = THREE.DoubleSide;
    const vinyl = s.material({ brown: '#4a2a18', black: '#1c1a1c', burgundy: '#5e1a28', cream: '#e6d8bc' }[a.rails], { roughness: 0.32, metalness: 0.04 });
    const carpet = s.material(['#8a4a2a', '#6a5a3a', '#7a3a2a', '#5a4a30'][Math.floor(random() * 4)], { roughness: 1 });
    const dark = s.material('#1c1a18', { roughness: 0.6 });
    const brass = s.material('#c9a44a', { metalness: 0.85, roughness: 0.25 });
    const chrome = s.material('#dfe3e5', { metalness: 0.9, roughness: 0.2 });
    const mirrorMap = canvasTexture(256, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#5e6670'); g.addColorStop(0.5, '#9aa6b2'); g.addColorStop(1, '#4e5660');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      for (const [x, k] of [[0.2, 0.12], [0.36, 0.05], [0.62, 0.16], [0.8, 0.04]]) {
        ctx.beginPath(); ctx.moveTo(x * w, 0); ctx.lineTo((x + k) * w, 0); ctx.lineTo((x + k - 0.5) * w, h); ctx.lineTo((x - 0.5) * w, h); ctx.closePath(); ctx.fill();
      }
    });
    mirrorMap.wrapS = mirrorMap.wrapT = THREE.ClampToEdgeWrapping;
    const mirror = new THREE.MeshStandardMaterial({ map: mirrorMap, color: '#d8e0e8', metalness: 0.25, roughness: 0.12, emissive: '#3a4450', emissiveIntensity: 0.25 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#d8e8ec', transparent: true, opacity: 0.35, roughness: 0.08, depthWrite: false });
    const skin = s.material(['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0'][Math.floor(random() * 4)], { roughness: 0.7 });

    // ---- The base: pedestal with drawers, carpeted plinth, steps, or mirror tiles.
    const pedW = FW - 0.3, pedD = FD - 0.3;
    if (a.base === 'drawers') {
      s.box([pedW, baseH, pedD], [0, baseH / 2, 0], walnut);
      for (const x of [-1, 1]) for (const z of [-0.5, 0.5]) {
        s.box([0.025, baseH - 0.1, pedD * 0.42], [x * (pedW / 2 + 0.005), baseH / 2, z * pedD * 0.46], s.material('#3a2010', { roughness: 0.5 }));
        s.box([0.03, 0.025, 0.16], [x * (pedW / 2 + 0.03), baseH / 2, z * pedD * 0.46], brass);
      }
    } else if (a.base === 'mirrored') {
      s.box([pedW, baseH, pedD], [0, baseH / 2, 0], mirror);
      for (const x of [-1, 1]) for (let i = 1; i < 4; i++) s.box([0.012, baseH + 0.002, 0.008], [x * (pedW / 2), baseH / 2, -pedD / 2 + i * pedD / 4], dark);
      for (let i = 1; i < 5; i++) s.box([0.008, baseH + 0.002, 0.012], [-pedW / 2 + i * pedW / 5, baseH / 2, pedD / 2], dark);
      s.box([pedW + 0.01, 0.012, pedD + 0.01], [0, baseH / 2, 0], dark);
    } else {
      s.box([pedW, baseH, pedD], [0, baseH / 2, 0], carpet);
    }
    const tufts: { at: P; size: number }[] = [];
    if (a.base === 'steps') {
      const stepH = baseH * 0.5;
      s.box([FW + 0.4, stepH * 2, 0.6], [0, stepH, FD / 2 + 0.1], carpet);
      s.box([FW + 0.8, stepH, 1.2], [0, stepH / 2, FD / 2 + 0.4], carpet);
      for (let i = 0; i < 260; i++) {
        const lower = random() < 0.6;
        tufts.push({ at: [rnd(-1, 1) * (lower ? FW / 2 + 0.38 : FW / 2 + 0.18), lower ? stepH : stepH * 2, FD / 2 + (lower ? rnd(0.42, 0.98) : rnd(-0.18, 0.38))], size: rnd(0.7, 1.3) });
      }
      s.scatter(new THREE.ConeGeometry(0.02, 0.05, 4), carpet, tufts);
    }

    // ---- The frame: deck and four padded vinyl rails with rounded corner blocks.
    s.box([FW, 0.06, FD], [0, baseH + 0.03, 0], walnut);
    const railY = deckY + railH / 2;
    for (const z of [-1, 1]) s.mesh(new RoundedBoxGeometry(FW, railH, railW, 3, 0.06), vinyl, [0, railY, z * (FD / 2 - railW / 2)]);
    for (const x of [-1, 1]) s.mesh(new RoundedBoxGeometry(railW, railH, FD - railW * 2, 3, 0.06), vinyl, [x * (FW / 2 - railW / 2), railY, 0]);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.mesh(new RoundedBoxGeometry(railW + 0.04, railH + 0.03, railW + 0.04, 3, 0.05), vinyl, [x * (FW / 2 - railW / 2), railY + 0.005, z * (FD / 2 - railW / 2)]);

    // ---- The bladder: a box whose top face sloshes. Stripped, it is the bare blue vinyl with welded seams.
    const bladderGeometry = new THREE.BoxGeometry(W, bladderH, D, 18, 1, 20);
    const bladderMaterial = stripped ? s.material('#3a5a8a', { roughness: 0.25, metalness: 0.05 }) : satin;
    const bladder = s.mesh(bladderGeometry, bladderMaterial, [0, deckY + bladderH / 2, 0]);
    void bladder;
    const position = bladderGeometry.attributes.position, normal = bladderGeometry.attributes.normal;
    const top: { i: number; u: number; v: number }[] = [];
    for (let i = 0; i < position.count; i++) if (normal.getY(i) > 0.9) top.push({ i, u: position.getX(i) / W + 0.5, v: position.getZ(i) / D + 0.5 });
    if (stripped) for (const z of [-0.5, 0, 0.5]) s.box([W * 0.98, 0.004, 0.012], [0, topY + 0.001, z * D * 0.6], s.material('#2a3a5a'));

    // ---- Dressing: real draped cloth. Each cover is a heightfield laid over the bladder that rolls
    // over the rails and falls to the floor past the frame, riding the slosh where it lies on the water.
    const amp = (0.012 + 0.03 * mood.energy) * (a.state === 'made' ? 0.8 : 1.3);
    const speed = mix(0.5, 1.7, mood.energy);
    const wave = (u: number, v: number, t: number) =>
      amp * Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * (0.6 * Math.sin(u * 7.5 + t * speed) + 0.4 * Math.sin(v * 5.5 - t * speed * 0.8 + 1) + 0.25 * Math.sin((u + v) * 9 + t * speed * 1.3));
    const bobbers: { mesh: THREE.Object3D; y: number; u: number; v: number }[] = [];
    const onBed = (mesh: THREE.Object3D) => { bobbers.push({ mesh, y: mesh.position.y, u: mesh.position.x / W + 0.5, v: mesh.position.z / D + 0.5 }); return mesh; };
    const cloths: { geometry: THREE.BufferGeometry; verts: { i: number; y: number; u: number; v: number; weight: number }[] }[] = [];
    /** How far a point lies past the frame's edge (sides and foot only; the head is against the headboard). */
    const past = (x: number, z: number) => Math.max(Math.abs(x) - (FW / 2 - 0.02), z - (FD / 2 - 0.02), 0);
    const drop = (e: number) => (e < 0.05 ? 40 * e * e : 0.1 + (e - 0.05) * 4);
    const cloth = (cx: number, cz: number, w: number, d: number, height: (x: number, z: number) => number, material: THREE.Material, steps = 44) => {
      const geometry = new THREE.PlaneGeometry(w, d, steps, Math.round(steps * d / w) + 4);
      geometry.rotateX(-Math.PI / 2);
      const p = geometry.attributes.position;
      const verts: { i: number; y: number; u: number; v: number; weight: number }[] = [];
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i) + cx, z = p.getZ(i) + cz, y = height(x, z);
        p.setXYZ(i, x, y, z);
        const outside = Math.max(Math.abs(x) - W / 2, Math.abs(z) - D / 2, 0);
        verts.push({ i, y, u: x / W + 0.5, v: z / D + 0.5, weight: Math.max(0, 1 - outside * 10) });
      }
      geometry.computeVertexNormals();
      cloths.push({ geometry, verts });
      return s.mesh(geometry, material);
    };
    // A draped cover: rest height over the bed, then rolling over the edge and lying on the floor.
    const floorAt = (x: number, z: number) => {
      if (a.base !== 'steps') return 0;
      if (z > FD / 2 - 0.2 && z < FD / 2 + 0.4 && Math.abs(x) < FW / 2 + 0.2) return baseH;
      if (z > FD / 2 - 0.2 && z < FD / 2 + 1.0 && Math.abs(x) < FW / 2 + 0.4) return baseH / 2;
      return 0;
    };
    const drape = (rest: (x: number, z: number) => number) => (x: number, z: number) => {
      const e = past(x, z), r = rest(x, z), ground = floorAt(x, z);
      if (e <= 0) return r;
      const y = r - drop(e);
      return y > ground + 0.015 ? y : ground + 0.015 + Math.max(0, r - topY - 0.04) * 0.25 + 0.02 * Math.abs(Math.sin(x * 9 + z * 7));
    };
    const pillow = (at: P, turn: number, material: THREE.Material = satin) => {
      const mesh = s.mesh(new RoundedBoxGeometry(0.72, 0.17, 0.46, 3, 0.07), material, at);
      mesh.rotation.y = turn;
      return mesh;
    };
    const headZone = -D / 2 + 0.34;
    const floorSide = random() < 0.5 ? -1 : 1;
    const p1 = random() * 6, p2 = random() * 6, p3 = random() * 6;
    const crease = (x: number, z: number, k: number) => k * (Math.sin(x * 6.5 + p1) * Math.sin(z * 4.2 + p2) + 0.6 * Math.abs(Math.sin(x * 2.3 + z * 5.1 + p3)));
    // Somebody under the covers: a long body-shaped rise, head on the pillow, one foot out.
    const sleeper = a.lump && (a.state === 'made' || a.state === 'rumpled');
    const lx = rnd(-0.32, 0.32), lside = lx < 0 ? -1 : 1;
    const shoulders = -D / 2 + 0.55, feet = D / 2 - 0.3;
    const lump = (x: number, z: number) => {
      if (!sleeper) return 0;
      const t = (z - shoulders) / (feet - shoulders);
      const along = t < 0 ? Math.exp(-((t / 0.05) ** 2)) : t > 1 ? Math.exp(-(((t - 1) / 0.05) ** 2)) : 0.78 + 0.22 * Math.sin(Math.PI * Math.min(1, t * 1.6));
      const across = Math.exp(-(((x - lx) / (0.2 - 0.06 * Math.max(0, t - 0.4))) ** 2));
      return 0.17 * along * across;
    };
    const wrinkle = 0.004 + mood.wear * 0.012;
    if (a.state === 'made') {
      for (const x of [-0.42, 0.42]) onBed(pillow([x, topY + 0.085, headZone], rnd(-0.03, 0.03)));
      const sheetTop = sleeper ? -D / 2 + 0.48 : -D / 2 + 0.66, coverTop = sheetTop + 0.24;
      cloth(0, (sheetTop + FD / 2 + 0.2) / 2, FW + 0.26, FD / 2 + 0.2 - sheetTop, drape((x, z) => topY + 0.03 + lump(x, z) * 0.95 + crease(x, z, wrinkle * 0.5)), band);
      cloth(0, (coverTop + FD / 2 + 0.24) / 2, FW + 0.34, FD / 2 + 0.24 - coverTop, drape((x, z) => topY + 0.05 + lump(x, z) + crease(x, z, wrinkle)), cover);
    } else if (a.state === 'rumpled') {
      onBed(pillow([-0.5, topY + 0.085, headZone + 0.08], rnd(0.2, 0.5)));
      onBed(pillow([0.3, topY + 0.16, headZone + 0.25], rnd(-0.9, -0.5)));
      const sx = floorSide * 0.25;
      cloth(sx, 0.15, FW + 0.2, FD * 0.8, drape((x, z) => topY + 0.03 + lump(x, z) * 0.95 + crease(x, z, 0.02)), band);
      cloth(floorSide * 0.42, 0.28, FW * 0.95, FD * 0.7, drape((x, z) => topY + 0.06 + lump(x, z) + crease(x * 1.3, z, 0.045)), cover);
    } else if (a.state === 'heaped') {
      onBed(pillow([rnd(-0.3, 0.3), topY + 0.085, headZone + rnd(0, 0.3)], rnd(-0.8, 0.8)));
      const onFloor = pillow([floorSide * (FW / 2 + 0.4), 0.085, rnd(-0.4, 0.5)], rnd(-1, 1));
      onFloor.rotation.z = floorSide * 0.1;
      // The top sheet twisted down the middle, the comforter in a mound at the foot spilling over the end.
      cloth(rnd(-0.2, 0.2), 0.1, W * 0.7, D * 0.75, (x, z) => topY + 0.02 + crease(x * 2, z * 1.5, 0.025) * Math.max(0, 1 - Math.abs(x) * 1.2), band);
      const hz = D / 2 - 0.3, hx = rnd(-0.25, 0.25);
      cloth(hx, hz + 0.15, FW * 0.95, 1.2, drape((x, z) => {
        const env = Math.max(0, 1 - ((x - hx) / (FW * 0.42)) ** 2 - ((z - hz) / 0.55) ** 2);
        // A mound with three or four big rolls of fabric running across it, not a bumpy cake.
        const rolls = Math.abs(Math.sin((z - hz) * 7.5 + x * 1.1 + p3));
        return topY + 0.04 + Math.sqrt(env) * (0.2 + 0.07 * rolls + 0.035 * Math.sin(x * 3.5 + p1) * Math.cos(z * 2.5 + p2));
      }), cover);
    } else {
      // Stripped: the bare bladder, the sheets and a pillow in a pile on the floor beside the bed.
      const px = floorSide * (FW / 2 + 0.4), pz = rnd(0.1, 0.6);
      const heap = (h: number, k: number) => (x: number, z: number) => {
        const env = Math.max(0, 1 - ((x - px) / 0.42) ** 2 - ((z - pz) / 0.5) ** 2);
        return 0.012 + h * Math.sqrt(env) * (0.72 + 0.2 * Math.abs(Math.sin((z - pz) * 8 + x * 1.5 + k)) + 0.1 * Math.sin(x * 4 + k) * Math.cos(z * 3 + k * 2));
      };
      cloth(px, pz, 0.9, 1.05, heap(0.26, p1), satin, 30);
      cloth(px + floorSide * 0.08, pz + 0.12, 0.7, 0.75, (x, z) => heap(0.3, p2)(x, z) + 0.02, cover, 26);
      pillow([px - floorSide * 0.05, 0.3, pz - 0.1], rnd(-1, 1)).rotation.x = rnd(-0.25, 0.25);
    }
    if (sleeper) {
      // The head on the pillow and one bare foot out of the side near the end.
      const hair = s.material(['#2a1a10', '#6a4020', '#c8a050', '#1a1a1a'][Math.floor(random() * 4)], { roughness: 0.8 });
      onBed(s.ball([0.11, 0.09, 0.12], [lx, topY + 0.2, headZone + 0.05], hair, 16));
      const fx = lx + lside * 0.27, fz = feet - 0.05;
      const foot = onBed(s.ball([0.055, 0.05, 0.12], [fx, topY + 0.07 + lump(fx, fz) * 0.4, fz], skin, 14));
      foot.rotation.set(-0.5, lside * 0.9, 0);
    }

    // ---- The headboard.
    const padded = a.headboard === 'lights' || a.headboard === 'padded';
    const headMaterial = padded ? vinyl : walnut;
    s.box([HW, HH, HD], [0, HH / 2, headZ], headMaterial);
    const faceZ = headZ + HD / 2;
    const ledgeY = HH;
    if (a.headboard === 'bookcase') {
      const open = s.material('#120a06', { roughness: 0.95 });
      const cubbyY0 = topY + 0.1, cubbyY1 = HH - 0.22, cubbyH = cubbyY1 - cubbyY0;
      for (let i = 0; i < 3; i++) {
        const cx = (i - 1) * (HW / 3), cw = HW / 3 - 0.12;
        s.box([cw, cubbyH, 0.2], [cx, (cubbyY0 + cubbyY1) / 2, faceZ - 0.1 + 0.001], open);
        if (i === 1) { s.box([cw * 0.55, cubbyH - 0.02, 0.012], [cx + cw * 0.2, (cubbyY0 + cubbyY1) / 2, faceZ + 0.006], walnut); s.box([0.012, 0.1, 0.02], [cx - cw * 0.04, (cubbyY0 + cubbyY1) / 2, faceZ + 0.012], brass); }
        else {
          for (let b = 0; b < 4 + Math.floor(random() * 4); b++) {
            const bh = rnd(0.16, 0.24), bw = rnd(0.025, 0.05);
            const book = s.box([bw, bh, 0.14], [cx - cw / 2 + 0.04 + b * 0.05, cubbyY0 + bh / 2, faceZ - 0.08], s.material(['#8a2a2a', '#2a4a8a', '#c9a44a', '#2a6a3a', '#e8e0c8', '#5a2a6a'][Math.floor(random() * 6)], { roughness: 0.6 }));
            book.rotation.z = random() < 0.2 ? 0.15 : 0;
          }
        }
      }
      s.box([HW + 0.06, 0.05, HD + 0.08], [0, HH - 0.2 + 0.025, headZ + 0.04], walnut);
      s.box([HW + 0.06, 0.05, HD + 0.08], [0, HH + 0.025, headZ + 0.04], walnut);
    } else if (a.headboard === 'mirror') {
      const mw = HW - 0.3, mh = HH - topY - 0.3, my = topY + 0.15 + mh / 2;
      s.mesh(new THREE.PlaneGeometry(mw, mh), mirror, [0, my, faceZ + 0.004]);
      s.box([mw + 0.08, 0.04, 0.03], [0, my + mh / 2 + 0.02, faceZ + 0.01], brass);
      s.box([mw + 0.08, 0.04, 0.03], [0, my - mh / 2 - 0.02, faceZ + 0.01], brass);
      for (const x of [-1, 1]) s.box([0.04, mh + 0.08, 0.03], [x * (mw / 2 + 0.02), my, faceZ + 0.01], brass);
      s.box([HW + 0.06, 0.05, HD + 0.08], [0, HH + 0.025, headZ + 0.04], walnut);
    } else {
      // Padded: a cushioned front with tufting buttons; lights add a ring of bulbs.
      const pad = s.mesh(new RoundedBoxGeometry(HW - 0.16, HH - topY - 0.2, 0.1, 3, 0.04), vinyl, [0, topY + 0.1 + (HH - topY - 0.2) / 2, faceZ + 0.04]);
      void pad;
      const buttons: { at: P; size: number }[] = [];
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) buttons.push({ at: [-HW / 2 + 0.3 + i * (HW - 0.6) / 5, topY + 0.28 + j * (HH - topY - 0.5) / 2, faceZ + 0.095], size: 1 });
      s.scatter(new THREE.SphereGeometry(0.02, 8, 6), brass, buttons);
      s.box([HW + 0.04, 0.05, HD + 0.06], [0, HH + 0.025, headZ + 0.03], vinyl);
      if (a.headboard === 'lights') {
        const lit = new THREE.MeshStandardMaterial({ color: '#fff0c8', emissive: '#ffd27a', emissiveIntensity: mix(0.8, 1.8, mood.daylight) });
        const bulbs: { at: P; size: number }[] = [];
        for (let i = 0; i < 11; i++) bulbs.push({ at: [-HW / 2 + 0.16 + i * (HW - 0.32) / 10, HH - 0.07, faceZ + 0.08], size: 1 });
        for (const x of [-1, 1]) for (let j = 0; j < 3; j++) bulbs.push({ at: [x * (HW / 2 - 0.16), topY + 0.25 + j * 0.3, faceZ + 0.08], size: 1 });
        s.scatter(new THREE.SphereGeometry(0.045, 12, 8), lit, bulbs);
        for (const b of bulbs) s.cylinder(0.02, 0.025, 0.03, [b.at[0], b.at[1], b.at[2] - 0.04], chrome, 10).rotation.x = Math.PI / 2;
      }
    }

    // ---- What sits on the ledge, and the phone with its trailing cord.
    const ledgeZ = headZ + 0.02;
    if (a.shelf === 'lava') {
      const lx = rnd(-0.5, 0.5);
      s.lathe([[0, 0], [0.07, 0], [0.05, 0.03], [0.035, 0.12], [0.05, 0.13], [0, 0.13]], brass, [lx, ledgeY + 0.05, ledgeZ]);
      s.mesh(new THREE.CylinderGeometry(0.025, 0.05, 0.3, 14), new THREE.MeshStandardMaterial({ color: '#ff9a3a', emissive: '#ff6a1a', emissiveIntensity: 1.2, transparent: true, opacity: 0.8, depthWrite: false }), [lx, ledgeY + 0.05 + 0.13 + 0.15, ledgeZ]);
      for (const y of [0.08, 0.17, 0.24]) s.ball([0.03, 0.035, 0.03], [lx, ledgeY + 0.18 + y, ledgeZ], new THREE.MeshStandardMaterial({ color: '#ff3a1a', emissive: '#ff2a0a', emissiveIntensity: 1.6 }), 10);
      s.lathe([[0, 0], [0.03, 0], [0.03, 0.03], [0, 0.03]], brass, [lx, ledgeY + 0.05 + 0.13 + 0.3, ledgeZ]);
    } else if (a.shelf === 'wine') {
      const bx = rnd(-0.6, 0.6);
      s.lathe([[0, 0], [0.04, 0], [0.04, 0.2], [0.015, 0.26], [0.015, 0.32], [0, 0.32]], s.material('#1a3a1a', { roughness: 0.2 }), [bx, ledgeY + 0.05, ledgeZ]);
      s.label('VIN', 0.05, 0.05, [bx, ledgeY + 0.15, ledgeZ + 0.041], '#1a1a1a', '#f0e6c8');
      for (const dx of [0.14, 0.26]) { s.lathe([[0, 0], [0.03, 0], [0.005, 0.01], [0.005, 0.07], [0.04, 0.1], [0.038, 0.17], [0.03, 0.18]], glass, [bx + dx, ledgeY + 0.05, ledgeZ]); s.cylinder(0.034, 0.03, 0.03, [bx + dx, ledgeY + 0.05 + 0.11, ledgeZ], s.material('#6a1428', { roughness: 0.2 }), 12); }
    } else if (a.shelf === 'radio') {
      const rx = rnd(-0.6, 0.6);
      s.box([0.32, 0.1, 0.18], [rx, ledgeY + 0.1, ledgeZ], walnut);
      const digits = canvasTexture(128, 48, (ctx, w, h) => { ctx.fillStyle = '#100a08'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#ff2a1a'; ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(['12:00', '2:17', '3:42', '11:58'][Math.floor(random() * 4)], w / 2, h / 2 + 2); });
      s.mesh(new THREE.PlaneGeometry(0.22, 0.07), new THREE.MeshStandardMaterial({ map: digits, emissiveMap: digits, emissive: '#ffffff', emissiveIntensity: 1.2, roughness: 0.4 }), [rx, ledgeY + 0.1, ledgeZ + 0.092]);
      s.cylinder(0.014, 0.014, 0.01, [rx + 0.13, ledgeY + 0.1, ledgeZ + 0.092], chrome, 10).rotation.x = Math.PI / 2;
    } else if (a.shelf === 'ashtray') {
      const ax = rnd(-0.6, 0.6);
      s.lathe([[0, 0], [0.06, 0], [0.065, 0.015], [0.055, 0.022], [0.045, 0.008]], glass, [ax, ledgeY + 0.05, ledgeZ]);
      for (let i = 0; i < 4 + Math.round(mood.wear * 6); i++) s.cylinder(0.003, 0.003, 0.03, [ax + rnd(-0.04, 0.04), ledgeY + 0.06, ledgeZ + rnd(-0.04, 0.04)], s.material(random() < 0.5 ? '#e8e0c8' : '#c9a24a'), 6).rotation.set(rnd(-1.5, 1.5), rnd(0, 3), rnd(-0.3, 0.3));
      for (let i = 0; i < 5; i++) s.box([0.22, 0.008, 0.28], [ax + 0.4 + rnd(-0.02, 0.02), ledgeY + 0.054 + i * 0.009, ledgeZ + rnd(-0.02, 0.02)], s.material(['#d8302a', '#2a7ab0', '#e8c43a', '#f0e8d8', '#1a1a1c'][i % 5], { roughness: 0.5 })).rotation.y = rnd(-0.2, 0.2);
    } else if (a.shelf === 'boombox') {
      const bx = rnd(-0.5, 0.5);
      s.box([0.5, 0.2, 0.14], [bx, ledgeY + 0.15, ledgeZ], s.material('#b8bcc0', { metalness: 0.7, roughness: 0.35 }));
      for (const dx of [-0.17, 0.17]) { s.cylinder(0.07, 0.07, 0.01, [bx + dx, ledgeY + 0.15, ledgeZ + 0.072], dark, 20).rotation.x = Math.PI / 2; s.cylinder(0.03, 0.03, 0.012, [bx + dx, ledgeY + 0.15, ledgeZ + 0.074], chrome, 14).rotation.x = Math.PI / 2; }
      s.box([0.12, 0.08, 0.01], [bx, ledgeY + 0.15, ledgeZ + 0.072], dark);
      s.ring(0.11, 0.012, [bx, ledgeY + 0.25, ledgeZ], chrome, Math.PI);
      s.rod([bx + 0.2, ledgeY + 0.25, ledgeZ], [bx + 0.28, ledgeY + 0.65, ledgeZ - 0.05], 0.005, chrome);
    }
    if (a.phone) {
      const beige = s.material(['#e8dcc0', '#c8302a', '#2a2a2c', '#6a8a3a'][Math.floor(random() * 4)], { roughness: 0.4 });
      const px = HW / 2 - 0.4 + rnd(-0.1, 0.1), py = ledgeY + 0.05;
      const bodyShape = new THREE.Shape(); bodyShape.moveTo(-0.1, 0); bodyShape.lineTo(0.1, 0); bodyShape.lineTo(0.1, 0.03); bodyShape.lineTo(-0.1, 0.075); bodyShape.closePath();
      const phoneBody = s.mesh(new THREE.ExtrudeGeometry(bodyShape, { depth: 0.16, bevelEnabled: false }), beige, [px, py, ledgeZ - 0.08]);
      phoneBody.rotation.y = 0;
      s.rod([px - 0.1, py + 0.095, ledgeZ], [px + 0.1, py + 0.06, ledgeZ], 0.02, beige);
      s.ball([0.035, 0.028, 0.035], [px - 0.1, py + 0.095, ledgeZ], beige, 12);
      s.ball([0.035, 0.028, 0.035], [px + 0.1, py + 0.06, ledgeZ], beige, 12);
      s.cylinder(0.04, 0.04, 0.01, [px - 0.03, py + 0.055, ledgeZ + 0.03], s.material('#f4f0e8'), 16).rotation.x = -0.6;
      // The coiled cord: a helix wound around a path that drops off the ledge, over the rail and across the floor.
      const way = new THREE.CatmullRomCurve3([
        new THREE.Vector3(px + 0.08, py + 0.03, ledgeZ + 0.05),
        new THREE.Vector3(HW / 2 + 0.05, py - 0.1, faceZ + 0.08),
        new THREE.Vector3(HW / 2 + 0.08, railY + railH / 2 + 0.03, -FD / 2 + 0.3),
        new THREE.Vector3(FW / 2 + 0.06, railY + railH / 2 + 0.02, -FD / 2 + 0.9),
        new THREE.Vector3(FW / 2 + 0.2, 0.02, -FD / 2 + 1.1),
        new THREE.Vector3(FW / 2 + 0.6, 0.012, -0.2 + rnd(-0.2, 0.2)),
        new THREE.Vector3(FW / 2 + 1.1, 0.012, 0.3 + rnd(-0.2, 0.3)),
        new THREE.Vector3(FW / 2 + 1.4, 0.01, 0.1 + rnd(-0.3, 0.3)),
      ]);
      const samples = 220, frames = way.computeFrenetFrames(samples, false), coil: THREE.Vector3[] = [];
      for (let i = 0; i <= samples; i++) {
        const t = i / samples, centre = way.getPointAt(t), theta = i * 0.95, r = t > 0.62 ? 0.014 : 0.024;
        coil.push(centre.clone().addScaledVector(frames.normals[Math.min(i, samples - 1)], Math.cos(theta) * r).addScaledVector(frames.binormals[Math.min(i, samples - 1)], Math.sin(theta) * r));
      }
      const cord = s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 600, 0.005, 6), s.material('#2a2a2c', { roughness: 0.5 }));
      void cord;
    }

    // ---- The slosh: the top of the bladder rolls, and everything lying on it rides the swell.
    return s.finish({
      update(_dt, time) {
        for (const { i, u, v } of top) position.setY(i, bladderH / 2 + wave(u, v, time));
        position.needsUpdate = true;
        bladderGeometry.computeVertexNormals();
        for (const b of bobbers) b.mesh.position.y = b.y + wave(b.u, b.v, time) * 1.1;
        for (const c of cloths) {
          const p = c.geometry.attributes.position as THREE.BufferAttribute;
          for (const q of c.verts) if (q.weight > 0) p.setY(q.i, q.y + wave(q.u, q.v, time) * q.weight);
          p.needsUpdate = true;
          c.geometry.computeVertexNormals();
        }
      },
    });
  },
});
