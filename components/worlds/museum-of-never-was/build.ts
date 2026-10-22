import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type P3 = [number, number, number];
type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function painted(w: number, h: number, paint: Painter, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  paint(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat); }
  return texture;
}

const WALLS = {
  sage: { wall: '#b9c4ae', dado: '#7f8f78', trim: '#ece6d4' },
  oxblood: { wall: '#a8584f', dado: '#5e2f2b', trim: '#e9dcc0' },
  white: { wall: '#eeece6', dado: '#e2dfd7', trim: '#f7f5f0' },
  municipal: { wall: '#e3d9b4', dado: '#8a6f4c', trim: '#6b5238' },
  slate: { wall: '#7f93a6', dado: '#4c5d70', trim: '#e6e4dc' },
} as const;

const SIGNS = {
  never: 'GALLERY 7 · THINGS THAT NEVER WERE',
  apocrypha: 'APOCRYPHA',
  shop: 'EXIT THROUGH GIFT SHOP',
  further: 'FURTHER ROOMS',
  closed: 'THIS WING IS CLOSED',
  loans: 'LOANS FROM NOWHERE',
} as const;

export default defineWorld({
  questions: {
    wing: choice('How are the gallery walls done?', {
      sage: 'Victorian sage green above a darker dado, cream woodwork.',
      oxblood: 'Deep oxblood red, the colour of old picture galleries.',
      white: 'White-cube modern, everything painted out, almost shadowless.',
      municipal: 'Municipal cream gloss over brown, a town museum that last had money in 1962.',
      slate: 'Cool slate blue, serious and scholarly.',
    }),
    state: choice('What is going on in the wing?', {
      quiet: 'An ordinary quiet afternoon: nobody here, a visitors’ book on a lectern.',
      closing: 'Closing time: a mop and bucket, a wet-floor sign, a rope across the doorway.',
      installing: 'Mid-installation: a stepladder, packing crates and a picture leaning against the wall.',
      shut: 'Closed for good: dust sheets thrown over the spare plinths and a barrier at the door.',
      aftermath: 'The morning after a private view: a trestle table of empty glasses, streamers on the picture rail.',
    }),
    pictures: choice('What hangs from the picture rail?', {
      portraits: 'Portraits of people who never lived, their faces left as blank ovals.',
      maps: 'Framed maps of countries that are not there.',
      landscapes: 'Landscapes of impossible places: two moons, a staircase in the sea.',
      specimens: 'Glazed cases of pinned specimens in neat rows.',
      empty: 'Gilt frames with nothing in them.',
      gone: 'Nothing: only pale rectangles and wires where pictures used to hang.',
    }),
    doorway: choice('What is the doorway to the further rooms like?', {
      enfilade: 'Open, with room after identical room visible beyond it.',
      doors: 'Tall panelled double doors, shut.',
      curtain: 'A heavy velvet curtain drawn across it.',
      bricked: 'Bricked up, though the sign still points through it.',
    }),
    sign: choice('What does the sign over the doorway say?', SIGNS),
    floor: choice('What is the floor?', {
      herringbone: 'Honey-coloured herringbone parquet.',
      chequer: 'Black and white marble chequer.',
      boards: 'Long dark varnished boards.',
      lino: 'Green institutional linoleum.',
    }),
    plinths: choice('What are the numbered plinths like?', {
      white: 'Plain white painted boxes, scuffed at the corners.',
      wood: 'Dark panelled wood with brass number plates.',
      marble: 'Veined marble blocks.',
      crates: 'Packing crates pressed into service, stencilled with numbers.',
    }),
    skylight: choice('What is the skylight like?', {
      grid: 'A long glazed laylight of clear panes.',
      boarded: 'Mostly boarded and painted over, a single pane still letting light through.',
      broken: 'One pane missing; a pigeon has got in and sits on the picture rail.',
    }),
    seat: choice('Is there anywhere to sit?', {
      bench: 'A long buttoned leather bench.',
      ottoman: 'A round upholstered ottoman.',
      none: 'Nowhere at all.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const pal = WALLS[a.wing];
    const floorTint = { herringbone: '#c79a5b', chequer: '#d9d6cc', boards: '#6e4a30', lino: '#7d9a80' }[a.floor];
    const SLOTS: [number, number, number, number][] = [[0.2, 1.5, 0.8, 1], [-3.9, -1.7, 0.8, 0.9], [3.9, 3.0, 0.6, 0.85], [-3.7, 3.3, 0.6, 0.85], [0.3, -2.9, 0.95, 0.8]];
    const W = 14, D = 11, WH = 5.6;
    const { art: s, world } = diorama(context, { background: a.wing === 'white' ? '#ecebe6' : '#e6e3d8', floor: floorTint, width: W, depth: D, maxHeight: 2.7, radius: 1.05, pitch: 30, yaw: 30, slots: SLOTS });
    const key = world.keyLight!;
    key.intensity = 2.1; // pale and even: the skylight does most of the work

    // ---- Floor ----
    const floorMap = painted(256, 256, (ctx, w, h) => {
      ctx.fillStyle = floorTint; ctx.fillRect(0, 0, w, h);
      if (a.floor === 'herringbone') {
        const tones = ['#c79a5b', '#b98a4c', '#d2a868', '#bf8f52'];
        for (let i = -1; i < 9; i++) for (let j = -1; j < 9; j++) {
          ctx.save(); ctx.translate(i * 32 + 16, j * 32 + (i % 2 ? 16 : 0)); ctx.rotate(i % 2 ? Math.PI / 4 : -Math.PI / 4);
          ctx.fillStyle = tones[(i * 3 + j * 5 + 40) % 4]; ctx.fillRect(-22, -7, 44, 14);
          ctx.strokeStyle = '#8a6535'; ctx.lineWidth = 1; ctx.strokeRect(-22, -7, 44, 14); ctx.restore();
        }
      } else if (a.floor === 'chequer') {
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = (i + j) % 2 ? '#3d3f42' : '#e4e1d8'; ctx.fillRect(i * 64, j * 64, 64, 64); }
      } else if (a.floor === 'boards') {
        for (let i = 0; i < 8; i++) { ctx.fillStyle = ['#6e4a30', '#62402a', '#775236'][i % 3]; ctx.fillRect(0, i * 32, w, 31); ctx.fillStyle = '#3c2616'; ctx.fillRect(((i * 97) % 200) + 20, i * 32, 2, 31); }
      } else {
        for (let i = 0; i < 300; i++) { ctx.fillStyle = i % 2 ? '#88a48a' : '#72907a'; ctx.fillRect((i * 53) % 256, (i * 97) % 256, 5, 3); }
        ctx.strokeStyle = '#5f7a66'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, w, h);
      }
      ctx.globalAlpha = mood.wear * 0.35; ctx.fillStyle = '#5b5346';
      for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.arc((i * 71) % 256, (i * 113) % 256, 10 + (i % 5) * 6, 0, 7); ctx.fill(); }
    }, a.floor === 'chequer' ? [3.5, 2.75] : a.floor === 'boards' ? [2, 5] : [4.5, 3.5]);
    const groundMaterial = (world.ground as THREE.Mesh).material as THREE.MeshStandardMaterial;
    groundMaterial.map = floorMap; groundMaterial.color.set('#ffffff'); groundMaterial.roughness = a.floor === 'lino' ? 0.6 : 0.42;

    // ---- Walls ----
    const wallTint = new THREE.Color(pal.wall).lerp(new THREE.Color('#ffd9a8'), (mood.warmth - 0.5) * 0.12);
    const wall = s.material(wallTint, { roughness: 0.9 });
    const dado = s.material(pal.dado, { roughness: a.wing === 'municipal' ? 0.35 : 0.8 });
    const trim = s.material(pal.trim, { roughness: 0.6 });
    const brass = s.material('#c49a3c', { metalness: 0.85, roughness: 0.3 });
    const dark = s.material('#26231f', { roughness: 0.7 });
    const RAIL = 4.45;
    const BZ = -D / 2 + 0.1, LX = -W / 2 + 0.1; // inner wall faces
    const doorX = 4.0, doorW = 2.0, doorH = 3.6;
    const backRun = (x0: number, x1: number, y0 = 0, y1 = WH) => {
      const cx = (x0 + x1) / 2, w = x1 - x0;
      s.box([w, y1 - y0, 0.22], [cx, (y0 + y1) / 2, BZ - 0.11], wall);
      if (y0 === 0) { s.box([w, 1.05, 0.04], [cx, 0.525, BZ + 0.02], dado); s.box([w, 0.07, 0.07], [cx, 1.08, BZ + 0.035], trim); s.box([w, 0.2, 0.06], [cx, 0.1, BZ + 0.05], trim); }
      s.box([w, 0.06, 0.07], [cx, RAIL, BZ + 0.035], trim); // picture rail
      s.box([w, 0.16, 0.14], [cx, WH - 0.08, BZ + 0.07], trim); // cornice
    };
    backRun(-W / 2, doorX - doorW / 2); backRun(doorX + doorW / 2, W / 2); backRun(doorX - doorW / 2, doorX + doorW / 2, doorH);
    s.box([0.22, WH, D], [LX - 0.11, WH / 2, 0], wall);
    s.box([0.04, 1.05, D], [LX + 0.02, 0.525, 0], dado); s.box([0.07, 0.07, D], [LX + 0.035, 1.08, 0], trim); s.box([0.06, 0.2, D], [LX + 0.05, 0.1, 0], trim);
    s.box([0.07, 0.06, D], [LX + 0.035, RAIL, 0], trim); s.box([0.14, 0.16, D], [LX + 0.07, WH - 0.08, 0], trim);
    // Architrave and sign.
    for (const x of [-1, 1]) s.box([0.2, doorH, 0.12], [doorX + x * (doorW / 2 + 0.1), doorH / 2, BZ + 0.06], trim);
    s.box([doorW + 0.6, 0.22, 0.16], [doorX, doorH + 0.11, BZ + 0.08], trim);
    s.label(SIGNS[a.sign], doorW + 1.6, 0.42, [doorX, doorH + 0.62, BZ + 0.03], a.sign === 'closed' ? '#8c1a1a' : '#2b2a26', a.wing === 'municipal' ? '#e9dfb8' : '#f1ecda');

    // ---- Doorway ----
    if (a.doorway === 'enfilade') {
      const FAR = doorH + 0.5, deep = 2.2, far = BZ - 0.22 - deep;
      s.box([doorW + 1.6, 0.24, deep], [doorX, -0.12, BZ - 0.22 - deep / 2], groundMaterial);
      const enfilade = painted(256, 384, (ctx, w, h) => {
        const tones = [pal.wall, pal.dado, pal.wall, pal.dado, '#2c2a28'];
        tones.forEach((tone, i) => {
          const inset = i * 24;
          ctx.fillStyle = tone; ctx.fillRect(inset, inset * 1.5, w - inset * 2, h - inset * 1.5);
          ctx.strokeStyle = pal.trim; ctx.lineWidth = 6; ctx.strokeRect(inset + 3, inset * 1.5 + 3, w - inset * 2 - 6, h - inset * 1.5);
          ctx.fillStyle = floorTint; ctx.fillRect(inset, h - 26 + i * 4, w - inset * 2, 26);
        });
        ctx.fillStyle = '#efece2'; ctx.fillRect(w / 2 - 9, h - 90, 18, 60); // one last plinth, far away
      });
      s.mesh(new THREE.PlaneGeometry(doorW + 1.6, FAR), new THREE.MeshStandardMaterial({ map: enfilade, roughness: 0.9 }), [doorX, (FAR) / 2, far]);
      s.box([0.2, FAR, deep], [doorX + doorW / 2 + 0.9, (FAR) / 2, BZ - 0.22 - deep / 2], dado);
      s.box([0.2, FAR, deep], [doorX - doorW / 2 - 0.9, (FAR) / 2, BZ - 0.22 - deep / 2], dado);
    } else if (a.doorway === 'doors') {
      const doorWood = s.material(a.wing === 'white' ? '#e6e3da' : '#5a3a26', { roughness: 0.5 });
      for (const x of [-1, 1]) {
        s.box([doorW / 2 - 0.02, doorH, 0.08], [doorX + x * doorW / 4, doorH / 2, BZ - 0.06], doorWood);
        for (const y of [0.85, 2.25]) s.box([doorW / 2 - 0.3, y < 1 ? 1.1 : 1.3, 0.03], [doorX + x * doorW / 4, y, BZ - 0.01], s.material(a.wing === 'white' ? '#d9d6cc' : '#4a2e1e'));
        s.ball([0.05, 0.05, 0.05], [doorX + x * 0.1, 1.4, BZ + 0.04], brass, 10);
      }
    } else if (a.doorway === 'curtain') {
      const velvet = s.material(a.wing === 'oxblood' ? '#2f4a3a' : '#7c1f2c', { roughness: 1 });
      for (let i = 0; i < 12; i++) s.cylinder(0.11, 0.13, doorH - 0.1, [doorX - doorW / 2 + 0.09 + i * (doorW - 0.18) / 11, (doorH - 0.1) / 2, BZ - 0.08 + (i % 2) * 0.05], velvet, 10);
      s.rod([doorX - doorW / 2, doorH - 0.08, BZ - 0.02], [doorX + doorW / 2, doorH - 0.08, BZ - 0.02], 0.03, brass);
    } else {
      const bricks = painted(256, 384, (ctx, w, h) => {
        ctx.fillStyle = '#c9c3b4'; ctx.fillRect(0, 0, w, h);
        for (let row = 0; row < 24; row++) for (let col = -1; col < 5; col++) { ctx.fillStyle = ['#a8573f', '#9a4d39', '#b3654a', '#8f4533'][(row * 3 + col * 7 + 20) % 4]; ctx.fillRect(col * 56 + (row % 2 ? 28 : 0) + 2, row * 16 + 2, 52, 12); }
      });
      s.mesh(new THREE.PlaneGeometry(doorW, doorH), new THREE.MeshStandardMaterial({ map: bricks, roughness: 0.95 }), [doorX, doorH / 2, BZ - 0.04]);
      s.box([doorW, doorH, 0.1], [doorX, doorH / 2, BZ - 0.1], s.material('#a8573f'));
    }

    // ---- Pictures ----
    const subject = (kind: typeof a.pictures, n: number): Painter => (ctx, w, h) => {
      const m = 22;
      const gilt = ctx.createLinearGradient(0, 0, w, h); gilt.addColorStop(0, '#d9b65a'); gilt.addColorStop(0.5, '#a8842f'); gilt.addColorStop(1, '#d2ac4e');
      ctx.fillStyle = kind === 'specimens' ? '#3a2a1e' : a.wing === 'white' && kind !== 'empty' ? '#2a2826' : gilt; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(60,40,10,0.6)'; ctx.lineWidth = 3; ctx.strokeRect(6, 6, w - 12, h - 12);
      const iw = w - m * 2, ih = h - m * 2;
      ctx.save(); ctx.beginPath(); ctx.rect(m, m, iw, ih); ctx.clip(); ctx.translate(m, m);
      if (kind === 'portraits') {
        ctx.fillStyle = ['#3f3329', '#2f3a3a', '#4a2f2a', '#353142'][n % 4]; ctx.fillRect(0, 0, iw, ih);
        ctx.fillStyle = ['#1f1a17', '#5a2230', '#22324a', '#3a3a2a'][(n + 1) % 4];
        ctx.beginPath(); ctx.ellipse(iw / 2, ih * 1.02, iw * 0.42, ih * 0.42, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#e9e2d0'; ctx.fillRect(iw / 2 - iw * 0.09, ih * 0.52, iw * 0.18, ih * 0.14);
        ctx.fillStyle = '#efe3cf'; ctx.beginPath(); ctx.ellipse(iw / 2, ih * 0.38, iw * 0.17, ih * 0.2, 0, 0, 7); ctx.fill(); // the blank face
        ctx.fillStyle = ['#3a2a1c', '#c9c2b0', '#1c1a18'][n % 3]; ctx.beginPath(); ctx.ellipse(iw / 2, ih * 0.25, iw * 0.2, ih * 0.11, 0, Math.PI, 0); ctx.fill();
      } else if (kind === 'maps') {
        ctx.fillStyle = '#d8c79a'; ctx.fillRect(0, 0, iw, ih);
        ctx.strokeStyle = '#a8946a'; ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo((i * iw) / 6, 0); ctx.lineTo((i * iw) / 6, ih); ctx.moveTo(0, (i * ih) / 6); ctx.lineTo(iw, (i * ih) / 6); ctx.stroke(); }
        for (let k = 0; k < 3; k++) {
          ctx.fillStyle = ['#b98f52', '#8fa56a', '#c98a6a'][(k + n) % 3]; ctx.strokeStyle = '#4a3320'; ctx.lineWidth = 2; ctx.beginPath();
          const cx = iw * (0.25 + 0.25 * k) + Math.sin(n * 3 + k) * 12, cy = ih * (0.3 + ((k * 37 + n * 23) % 40) / 100), r = iw * (0.2 - k * 0.04);
          for (let t = 0; t <= 16; t++) { const ang = (t / 16) * Math.PI * 2, rr = r * (0.7 + 0.4 * Math.sin(ang * 3 + n + k) + 0.15 * Math.sin(ang * 7 + n)); ctx.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.8); }
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.strokeStyle = '#9c2b1c'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8, ih * 0.8); ctx.quadraticCurveTo(iw * 0.5, ih * 0.5, iw - 10, ih * 0.75); ctx.stroke();
      } else if (kind === 'landscapes') {
        const sky = ctx.createLinearGradient(0, 0, 0, ih); sky.addColorStop(0, ['#6f8fb0', '#c98a6a', '#4a4a72'][n % 3]); sky.addColorStop(0.6, '#e9d9b0');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, iw, ih);
        ctx.fillStyle = '#f6f0d8'; ctx.beginPath(); ctx.arc(iw * 0.3, ih * 0.25, iw * 0.09, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(iw * 0.62, ih * 0.18, iw * 0.05, 0, 7); ctx.fill();
        ctx.fillStyle = '#3f5f6a'; ctx.fillRect(0, ih * 0.62, iw, ih * 0.4);
        ctx.fillStyle = '#e9e4d6'; for (let st = 0; st < 7; st++) ctx.fillRect(iw * 0.45 + st * iw * 0.05, ih * 0.9 - st * ih * 0.07, iw * 0.07, ih * 0.07); // stairs out of the sea
        ctx.fillStyle = '#2c3a2c'; ctx.beginPath(); ctx.moveTo(0, ih * 0.62); ctx.lineTo(iw * 0.2, ih * 0.4); ctx.lineTo(iw * 0.36, ih * 0.62); ctx.fill();
      } else if (kind === 'specimens') {
        ctx.fillStyle = '#efe9d8'; ctx.fillRect(0, 0, iw, ih);
        const cols = 5, rows = Math.max(3, Math.round((ih / iw) * 5));
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
          const x = ((i + 0.5) * iw) / cols, y = ((j + 0.5) * ih) / rows, r = iw / cols * 0.3;
          ctx.fillStyle = ['#c9662a', '#3f6c8a', '#7a8a3a', '#8a3a5a', '#2c2a28'][(i * 2 + j * 3 + n) % 5];
          for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + sx * r * 0.55, y, r * 0.55, r * 0.8, sx * 0.4, 0, 7); ctx.fill(); }
          ctx.fillStyle = '#1c1a18'; ctx.fillRect(x - 1, y - r, 2, r * 2);
        }
      } else {
        ctx.fillStyle = kind === 'empty' ? '#' + wallTint.clone().multiplyScalar(0.92).getHexString() : '#000'; ctx.fillRect(0, 0, iw, ih);
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 3; ctx.strokeRect(m, m, iw, ih);
    };
    const hang = (along: number, onLeft: boolean, n: number) => {
      const w = mix(1.25, 2.0, random()), h = a.pictures === 'portraits' ? w * 1.3 : a.pictures === 'specimens' ? w * 0.9 : w * mix(0.65, 1.2, random());
      const y = 2.75 + jitter(0.15), tilt = jitter(0.02 + mood.wear * 0.12);
      const at: P3 = onLeft ? [LX + 0.07, y, along] : [along, y, BZ + 0.07];
      if (a.pictures === 'gone') {
        const ghost = s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: wallTint.clone().lerp(new THREE.Color('#ffffff'), 0.28), roughness: 0.95 }), onLeft ? [LX + 0.012, y, along] : [along, y, BZ + 0.012]);
        if (onLeft) ghost.rotation.y = Math.PI / 2;
        ghost.castShadow = false;
      } else {
        const picture = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.09), [dark, dark, dark, dark, new THREE.MeshStandardMaterial({ map: painted(256, Math.round((256 * h) / w), subject(a.pictures, n)), roughness: 0.6 }), dark]);
        picture.position.set(...at); picture.rotation.set(0, onLeft ? Math.PI / 2 : 0, tilt); if (onLeft) picture.rotation.set(tilt, Math.PI / 2, 0, 'YXZ');
        picture.castShadow = true;
        s.root.add(picture);
        // A small caption card.
        const card = s.box([0.3, 0.2, 0.01], onLeft ? [LX + 0.02, 1.6, along + w / 2 + 0.1] : [along + w / 2 + 0.1, 1.6, BZ + 0.02], s.material('#f4f1e6'));
        if (onLeft) card.rotation.y = Math.PI / 2;
        card.castShadow = false;
      }
      // Wires up to the picture rail.
      for (const e of [-0.3, 0.3]) s.rod(onLeft ? [LX + 0.03, y + h / 2 - 0.02, along + e * w] : [along + e * w, y + h / 2 - 0.02, BZ + 0.03], onLeft ? [LX + 0.04, RAIL, along + e * w * 0.3] : [along + e * w * 0.3, RAIL, BZ + 0.04], 0.008, dark);
    };
    const backSpots = [-5.3, -2.7, -0.1, 1.9], leftSpots = [-3.2, -0.3, 2.7];
    const keep = mix(0.55, 1, mood.density);
    backSpots.forEach((x, i) => { if (random() < keep || i === 1) hang(x + jitter(0.3), false, i); });
    leftSpots.forEach((z, i) => { if (random() < keep || i === 1) hang(z + jitter(0.3), true, i + 4); });

    // ---- Skylight: a laylight carried in the back-left corner, and its light on the floor ----
    const SKY = { x0: LX + 0.1, x1: -0.6, z0: BZ + 0.1, z1: -1.2, y: WH + 0.02 };
    const panesX = 5, panesZ = 3, pw = (SKY.x1 - SKY.x0) / panesX, pd = (SKY.z1 - SKY.z0) / panesZ;
    const clearPane = new THREE.MeshStandardMaterial({ color: '#f5fbff', emissive: '#f5fbff', emissiveIntensity: 0.25, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    const board = s.material('#b9b3a2', { roughness: 0.95 });
    const sunlit = new THREE.MeshStandardMaterial({ color: '#fffdf0', emissive: '#fff6da', emissiveIntensity: 0.5, transparent: true, opacity: mix(0.5, 0.25, mood.wear), depthWrite: false });
    const openPane = Math.floor(random() * panesX * panesZ);
    for (let i = 0; i <= panesX; i++) s.box([0.07, 0.09, SKY.z1 - SKY.z0], [SKY.x0 + i * pw, SKY.y, (SKY.z0 + SKY.z1) / 2], trim);
    for (let j = 0; j <= panesZ; j++) s.box([SKY.x1 - SKY.x0, 0.09, 0.07], [(SKY.x0 + SKY.x1) / 2, SKY.y, SKY.z0 + j * pd], trim);
    const shift: [number, number] = [mix(0.6, 2.4, mood.daylight), 2.2];
    for (let i = 0; i < panesX; i++) for (let j = 0; j < panesZ; j++) {
      const index = i * panesZ + j, cx = SKY.x0 + (i + 0.5) * pw, cz = SKY.z0 + (j + 0.5) * pd;
      const lit = a.skylight === 'boarded' ? index === openPane : true;
      const missing = a.skylight === 'broken' && index === openPane;
      if (!missing) { const pane = s.box([pw - 0.08, 0.02, pd - 0.08], [cx, SKY.y, cz], lit ? clearPane : board); pane.castShadow = !lit; }
      if (lit) { const patch = s.box([pw - 0.14, 0.006, pd - 0.14], [cx + shift[0], 0.004, cz + shift[1]], sunlit); patch.castShadow = patch.receiveShadow = false; }
    }
    if (a.skylight === 'broken') {
      // The pigeon, and what it has done.
      const px = -2.2 + jitter(1.5), grey = s.material('#8d95a0', { roughness: 0.8 });
      s.ball([0.22, 0.16, 0.14], [px, RAIL + 0.16, BZ + 0.09], grey, 12);
      s.ball([0.07, 0.07, 0.07], [px + 0.14, RAIL + 0.28, BZ + 0.09], s.material('#6f7f8f'), 10);
      s.cylinder(0.0, 0.02, 0.06, [px + 0.22, RAIL + 0.28, BZ + 0.09], s.material('#d9a441'), 6).rotation.z = -Math.PI / 2;
      s.box([0.12, 0.02, 0.08], [px - 0.2, RAIL + 0.15, BZ + 0.09], s.material('#5f6873')).rotation.z = 0.3;
      for (let i = 0; i < 4; i++) s.box([0.05, 0.3 + random() * 0.5, 0.004], [px + jitter(0.3), RAIL - 0.3 - random() * 0.3, BZ + 0.012], s.material('#f1f0ea')).castShadow = false;
      const shard = new THREE.MeshStandardMaterial({ color: '#eaf6f5', roughness: 0.05, transparent: true, opacity: 0.8 });
      s.scatter(new THREE.TetrahedronGeometry(1).scale(1, 0.1, 0.7), shard, Array.from({ length: 14 }, () => ({ at: [SKY.x0 + (Math.floor(openPane / panesZ) + 0.5) * pw + jitter(1.2), 0.012, SKY.z0 + ((openPane % panesZ) + 0.5) * pd + jitter(1.0)] as const, size: 0.05 + random() * 0.08 })));
    }

    // ---- Numbered plinths ----
    const plinthTint = { white: '#efede6', wood: '#5c3d2a', marble: '#dcd9d2', crates: '#c2a36b' }[a.plinths];
    const plinthMap = a.plinths === 'marble' ? painted(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#e2dfd8'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#8f9498'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo((i * 37) % w, 0); ctx.bezierCurveTo((i * 61) % w, h * 0.3, (i * 23) % w, h * 0.6, (i * 83) % w, h); ctx.stroke(); }
    }) : a.plinths === 'crates' ? painted(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#c2a36b'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#a3854f';
      for (let i = 0; i < 5; i++) ctx.fillRect(0, i * 26 + 22, w, 3);
      ctx.fillRect(0, 0, 14, h); ctx.fillRect(w - 14, 0, 14, h); ctx.fillRect(0, 0, w, 12); ctx.fillRect(0, h - 12, w, 12);
    }) : null;
    const plinthMat = new THREE.MeshStandardMaterial({ color: plinthMap ? '#ffffff' : plinthTint, map: plinthMap, roughness: a.plinths === 'marble' ? 0.3 : 0.75 });
    const sheets: THREE.Object3D[] = [], cards: THREE.Object3D[] = [];
    const firstNumber = 1 + Math.floor(random() * 30);
    SLOTS.forEach(([x, z, lift, size], index) => {
      const half = 1.08 * size;
      s.box([half * 2, lift, half * 2], [x, lift / 2, z], plinthMat);
      if (a.plinths === 'white' || a.plinths === 'wood') s.box([half * 2 + 0.06, 0.07, half * 2 + 0.06], [x, 0.035, z], a.plinths === 'wood' ? s.material('#3f2a1d') : s.material('#d5d2c8'));
      if (a.plinths === 'wood') s.box([half * 2 + 0.05, 0.05, half * 2 + 0.05], [x, lift - 0.025, z], s.material('#3f2a1d'));
      const numberText = a.plinths === 'crates' ? `LOT ${firstNumber + index * 3}` : `No. ${firstNumber + index * 3}`;
      s.label(numberText, 0.62, 0.2, [x + half - 0.5, Math.max(lift * 0.55, 0.2), z + half + 0.008], a.plinths === 'wood' ? '#3a2a12' : '#2b2a26', a.plinths === 'wood' ? '#c9a44a' : a.plinths === 'crates' ? '#c2a36b' : '#f6f3e8');
      // What an unused plinth shows: a lonely caption, or a dust sheet when the wing is shut.
      const spare = new THREE.Group();
      if (a.state === 'shut') {
        const linen = s.material('#e9e5d8', { roughness: 1 });
        const top = s.ball([half * 0.75, 0.55, half * 0.75], [x, lift + 0.35, z], linen, 14);
        const skirt = s.cylinder(half * 0.8, half * 1.25, lift + 0.3, [x, (lift + 0.3) / 2, z], linen, 9);
        skirt.rotation.y = random() * 3;
        spare.add(top, skirt);
      } else {
        const stand = s.box([0.34, 0.24, 0.02], [x + jitter(0.3), lift + 0.14, z + half * 0.5], s.material('#f6f3e8'));
        stand.rotation.x = -0.35;
        const dent = s.cylinder(half * 0.45, half * 0.45, 0.006, [x, lift + 0.004, z], s.material(new THREE.Color(plinthTint).multiplyScalar(0.82), { roughness: 1 }), 24);
        dent.castShadow = false;
        spare.add(stand, dent);
      }
      s.root.add(spare);
      sheets.push(spare); cards.push(spare);
    });

    // ---- Seat ----
    if (a.seat === 'bench') {
      const leather = s.material(a.wing === 'oxblood' ? '#2f4a3a' : '#6a2a22', { roughness: 0.55 });
      s.box([3.2, 0.2, 0.95], [-0.3, 0.52, 4.45], leather);
      s.box([3.3, 0.1, 1.05], [-0.3, 0.38, 4.45], s.material('#3a2a1e'));
      for (const x of [-1.5, 0.9]) for (const z of [4.05, 4.85]) s.cylinder(0.06, 0.045, 0.34, [x, 0.17, z], s.material('#3a2a1e'), 10);
      s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#3a1512'), Array.from({ length: 14 }, (_u, i) => ({ at: [-1.6 + (i % 7) * 0.43, 0.625, 4.2 + Math.floor(i / 7) * 0.5] as const, size: 0.035 })));
    } else if (a.seat === 'ottoman') {
      const cloth = s.material(a.wing === 'oxblood' ? '#2f4a3a' : '#7c1f2c', { roughness: 0.95 });
      s.cylinder(0.95, 0.95, 0.42, [-0.4, 0.3, 4.3], cloth, 28);
      s.cylinder(1.0, 1.0, 0.1, [-0.4, 0.05, 4.3], s.material('#3a2a1e'), 28);
      s.lathe([[0.28, 0], [0.3, 0.5], [0.2, 0.62], [0.0, 0.66]], cloth, [-0.4, 0.5, 4.3]);
      s.ring(0.95, 0.03, [-0.4, 0.5, 4.3], s.material('#c9a24c')).rotation.x = Math.PI / 2;
    }

    // ---- Fixtures: radiator, extinguisher, hygrometer ----
    const iron = s.material('#d5d2c6', { roughness: 0.5 });
    s.scatter(new THREE.BoxGeometry(0.4, 4.2, 1), iron, Array.from({ length: 12 }, (_u, i) => ({ at: [LX + 0.2, 0.52, 3.6 + i * 0.13] as const, size: 0.2 })));
    s.rod([LX + 0.2, 0.08, 3.5], [LX + 0.2, 0.08, 5.3], 0.03, iron);
    s.cylinder(0.11, 0.11, 0.5, [doorX - doorW / 2 - 0.7, 1.45, BZ + 0.16], s.material('#c2241c', { roughness: 0.4 }), 14);
    s.cylinder(0.04, 0.06, 0.12, [doorX - doorW / 2 - 0.7, 1.76, BZ + 0.16], dark, 10);
    s.box([0.3, 0.2, 0.02], [doorX - doorW / 2 - 0.7, 2.1, BZ + 0.02], s.material('#c2241c')).castShadow = false;

    // ---- What is going on ----
    const ropeAcross = (z: number) => {
      for (const x of [-1, 1]) { s.cylinder(0.035, 0.035, 0.95, [doorX + x * 0.85, 0.5, z], brass, 12); s.cylinder(0.2, 0.22, 0.05, [doorX + x * 0.85, 0.025, z], brass, 20); s.ball([0.07, 0.07, 0.07], [doorX + x * 0.85, 1.02, z], brass, 12); }
      s.tube([[doorX - 0.85, 0.92, z], [doorX - 0.4, 0.72, z], [doorX, 0.66, z], [doorX + 0.4, 0.72, z], [doorX + 0.85, 0.92, z]], 0.035, s.material('#a3182a', { roughness: 1 }));
    };
    if (a.state === 'quiet') {
      const lx = 2.2, lz = -1.0, oak = s.material('#6a4027');
      s.cylinder(0.05, 0.07, 1.0, [lx, 0.5, lz], oak, 10); s.cylinder(0.3, 0.32, 0.05, [lx, 0.025, lz], oak, 20);
      const top = s.box([0.75, 0.05, 0.55], [lx, 1.05, lz], oak); top.rotation.x = 0.35;
      const book = s.box([0.62, 0.05, 0.42], [lx, 1.1, lz + 0.01], s.material('#f4f0e2')); book.rotation.x = 0.35;
      s.rod([lx + 0.36, 1.08, lz], [lx + 0.42, 0.7, lz + 0.1], 0.006, dark);
    } else if (a.state === 'closing') {
      ropeAcross(BZ + 0.9);
      const bx = 2.3 + jitter(0.6), bz = 0.2 + jitter(0.6);
      s.lathe([[0.2, 0], [0.22, 0.02], [0.27, 0.42], [0.28, 0.44]], s.material('#e3c530', { roughness: 0.5, side: THREE.DoubleSide }), [bx, 0, bz]);
      s.cylinder(0.25, 0.25, 0.01, [bx, 0.3, bz], new THREE.MeshStandardMaterial({ color: '#7f8f93', roughness: 0.1 }), 20);
      s.rod([bx + 0.05, 0.3, bz], [bx + 0.75, 1.7, bz - 0.5], 0.022, s.material('#b98a4d'));
      s.ball([0.2, 0.08, 0.16], [bx + 0.02, 0.36, bz + 0.02], s.material('#d9d6cc', { roughness: 1 }), 10);
      const wet = new THREE.MeshStandardMaterial({ color: '#b9c9d0', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.4, depthWrite: false });
      for (let i = 0; i < 3; i++) { const pool = s.cylinder(1, 1, 0.004, [bx - 0.6 - i * 0.8 + jitter(0.4), 0.004, bz + 0.9 + jitter(0.8)], wet, 18); pool.scale.set(0.6 + random() * 0.5, 1, 0.3 + random() * 0.3); pool.castShadow = false; }
      const sx = bx - 1.3, sz = bz + 1.9, yellow = s.material('#f0c419', { roughness: 0.5 });
      for (const side of [-1, 1]) { const panel = s.box([0.42, 0.78, 0.02], [sx, 0.37, sz + side * 0.13], yellow); panel.rotation.x = side * -0.33; }
      const caution = s.label('WET FLOOR', 0.36, 0.14, [sx, 0.5, sz + 0.11], '#1c1c1c', '#f0c419'); caution.rotation.x = -0.33;
    } else if (a.state === 'installing') {
      const pine = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, map: painted(128, 128, (ctx, w, h) => { ctx.fillStyle = '#c9ab72'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#a98a52'; ctx.fillRect(0, 0, w, 12); ctx.fillRect(0, h - 12, w, 12); ctx.fillRect(0, 0, 12, h); ctx.fillRect(w - 12, 0, 12, h); ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(0.78); ctx.fillRect(-90, -6, 180, 12); ctx.restore(); ctx.fillStyle = '#2b2a26'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'; ctx.fillText('FRAGILE', w / 2, 34); }) });
      s.box([1.5, 1.1, 1.0], [-5.6, 0.55, 1.3], pine).rotation.y = jitter(0.3);
      s.box([0.9, 0.7, 0.9], [-5.5, 1.45, 1.25], pine).rotation.y = jitter(0.5);
      s.box([1.1, 0.8, 1.5], [2.2, 0.4, -3.9], pine).rotation.y = jitter(0.4);
      // Stepladder under the pictures.
      const alu = s.material('#b9bdc0', { metalness: 0.7, roughness: 0.4 }), lx = -2.0 + jitter(1), lz = BZ + 1.0;
      for (const x of [-0.3, 0.3]) { s.rod([lx + x * 1.2, 0, lz + 0.5], [lx + x * 0.8, 2.3, lz], 0.03, alu); s.rod([lx + x * 1.2, 0, lz - 0.6], [lx + x * 0.8, 2.3, lz], 0.025, alu); }
      for (let i = 1; i < 6; i++) { const t = i / 6.5; s.box([mix(0.72, 0.48, t), 0.03, 0.14], [lx, t * 2.3, lz + 0.5 * (1 - t)], alu); }
      s.box([0.6, 0.04, 0.3], [lx, 2.3, lz], s.material('#c2241c'));
      // A picture not yet hung, face to the wall.
      const leaning = s.box([1.3, 1.0, 0.08], [-4.3, 0.52, BZ + 0.28], s.material('#8a6f4c')); leaning.rotation.x = -0.22;
      const sheet = s.box([2.2, 0.02, 1.6], [-3.0, 0.012, -3.3], s.material('#e9e5d8', { roughness: 1 })); sheet.rotation.y = 0.2; sheet.castShadow = false;
      s.cylinder(0.14, 0.13, 0.28, [-3.3, 0.16, -3.4], s.material('#eeece6'), 14);
    } else if (a.state === 'shut') {
      const bx = doorX, bz = BZ + 0.8, steel = s.material('#8c9396', { metalness: 0.6, roughness: 0.4 });
      for (const x of [-1.1, 1.1]) s.rod([bx + x, 0, bz], [bx + x, 1.1, bz], 0.03, steel);
      for (const y of [0.4, 1.0]) s.rod([bx - 1.1, y, bz], [bx + 1.1, y, bz], 0.025, steel);
      s.label('CLOSED', 0.9, 0.3, [bx, 0.7, bz + 0.03], '#f4f1e6', '#8c1a1a');
      // Stacked chairs and a rolled carpet against the left wall.
      for (let i = 0; i < 4; i++) { s.box([0.5, 0.05, 0.5], [LX + 0.5, 0.5 + i * 0.16, -1.2], s.material('#6a4027')); s.box([0.5, 0.5, 0.05], [LX + 0.27, 0.78 + i * 0.16, -1.2], s.material('#6a4027')).rotation.y = Math.PI / 2; }
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([LX + 0.5 + x * 0.22, 0, -1.2 + z * 0.22], [LX + 0.5 + x * 0.22, 0.5, -1.2 + z * 0.22], 0.02, s.material('#6a4027'));
      const roll = s.cylinder(0.22, 0.22, 3.2, [LX + 0.4, 0.22, 1.3], s.material('#7c1f2c', { roughness: 1 }), 14); roll.rotation.x = Math.PI / 2;
    } else {
      const cloth = s.material('#f1eee4', { roughness: 0.95 }), tx = LX + 0.75, tz = 0.6;
      s.box([0.9, 0.05, 2.6], [tx, 0.92, tz], cloth); s.box([0.92, 0.5, 2.62], [tx, 0.67, tz], cloth);
      for (const z of [-1.1, 1.1]) for (const x of [-0.35, 0.35]) s.rod([tx + x, 0, tz + z], [tx + x, 0.9, tz + z], 0.02, dark);
      const glassMat = new THREE.MeshStandardMaterial({ color: '#eaf4f2', roughness: 0.05, transparent: true, opacity: 0.55 });
      s.scatter(new THREE.CylinderGeometry(0.5, 0.25, 1.6, 10), glassMat, Array.from({ length: 16 }, () => ({ at: [tx + jitter(0.6), 1.03, tz + jitter(2.2)] as const, size: 0.1 })));
      for (let i = 0; i < 4; i++) { const bx = tx + jitter(0.5), bz = tz + jitter(2); s.cylinder(0.05, 0.05, 0.24, [bx, 1.07, bz], s.material('#2f4a34', { roughness: 0.2 }), 10); s.cylinder(0.018, 0.045, 0.14, [bx, 1.26, bz], s.material('#2f4a34', { roughness: 0.2 }), 10); }
      const colours = ['#d94a3a', '#e8b52c', '#3f7fa8', '#6aa35a', '#c95a94'];
      for (let i = 0; i < 6; i++) { const x0 = -6 + i * 1.6 + jitter(0.4); s.tube([[x0, RAIL, BZ + 0.1], [x0 + 0.5, RAIL - 0.55 + jitter(0.3), BZ + 0.16], [x0 + 1.1, RAIL - 0.4, BZ + 0.2], [x0 + 1.6, RAIL, BZ + 0.1]], 0.035, s.material(colours[i % 5], { roughness: 0.8 })); }
      s.scatter(new THREE.SphereGeometry(1, 10, 8), s.material('#ffffff', { roughness: 0.5 }), Array.from({ length: 5 }, (_u, i) => ({ at: [jitter(9), 0.16, jitter(7)] as const, size: 0.16, color: colours[i % 5] })));
    }

    // ---- Wear: damp, a drip bucket, cracks ----
    if (mood.wear > 0.45) {
      const stain = new THREE.MeshStandardMaterial({ color: '#7a6a4c', transparent: true, opacity: mix(0.1, 0.4, mood.wear), depthWrite: false, roughness: 1 });
      for (let i = 0; i < 4; i++) { const blot = s.mesh(new THREE.CircleGeometry(0.4 + random() * 0.6, 14), stain, [-6 + random() * 8, WH - 1.3 - random() * 0.5, BZ + 0.015]); blot.scale.set(0.7, 1.2, 1); blot.castShadow = false; }
      for (let i = 0; i < Math.round(mood.wear * 5); i++) { let x = -6 + random() * 8, y = WH - 0.3; for (let k = 0; k < 4; k++) { const nx = x + jitter(0.5), ny = y - 0.25 - random() * 0.3; s.rod([x, y, BZ + 0.012], [nx, ny, BZ + 0.012], 0.008, dark).castShadow = false; x = nx; y = ny; } }
    }
    if (mood.wear > 0.6 && a.state !== 'closing') {
      const dx = -4.6, dz = -3.2;
      s.lathe([[0.2, 0], [0.22, 0.02], [0.27, 0.4], [0.28, 0.42]], s.material('#b9bdc0', { metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }), [dx, 0, dz]);
      const pool = s.cylinder(0.7, 0.7, 0.004, [dx + 0.3, 0.004, dz + 0.2], new THREE.MeshStandardMaterial({ color: '#a9bcc4', roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false }), 20); pool.scale.z = 0.6; pool.castShadow = false;
    }

    const place = world.place.bind(world);
    world.place = (items) => { sheets.forEach((spare, index) => { spare.visible = index >= items.length; }); place(items); };
    return world;
  },
});
