import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, choice, clamp01, defineWorld, diorama, mix } from '@conjure/kit';

type V3 = [number, number, number];
type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
interface Inst { at: V3; scale?: V3; rot?: V3; color?: THREE.ColorRepresentation }

function paint(w: number, h: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function instances(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, list: readonly Inst[]) {
  if (!list.length) { geometry.dispose(); material.dispose(); return null; }
  const mesh = new THREE.InstancedMesh(geometry, material, list.length);
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  list.forEach((item, index) => {
    e.set(...(item.rot ?? [0, 0, 0]));
    q.setFromEuler(e);
    matrix.compose(new THREE.Vector3(...item.at), q, new THREE.Vector3(...(item.scale ?? [1, 1, 1])));
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, new THREE.Color(item.color ?? '#ffffff'));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const VENUES = {
  dive: { wall: '#5d8480', trim: '#34423f', counter: '#8a6546', frame: '#a57c55', accent: '#f0b83c', ink: '#f6e7b0', paper: '#2c3a38', back: '#dde3df' },
  cabaret: { wall: '#a2444d', trim: '#d0a94c', counter: '#4a3035', frame: '#d4ae52', accent: '#e9c460', ink: '#f7dc8a', paper: '#4f1820', back: '#e8dcd9' },
  pageant: { wall: '#eac6d2', trim: '#fbf6f2', counter: '#f1ebe6', frame: '#ffffff', accent: '#df6ea0', ink: '#c2417c', paper: '#fff6fa', back: '#f0e7ea' },
  ballroom: { wall: '#6f5a98', trim: '#262133', counter: '#34303f', frame: '#1f1c28', accent: '#ebc74e', ink: '#f3d667', paper: '#1d1928', back: '#e0dde8' },
  revue: { wall: '#dcd1ad', trim: '#2f6f5f', counter: '#6a4832', frame: '#2f6f5f', accent: '#c0913d', ink: '#2a5b4e', paper: '#f1e7c6', back: '#e9e5d6' },
} as const;

const DOOR_COLOURS = { magenta: '#ff3fa8', amber: '#ffb040', blue: '#4f8fff', green: '#45e08c', rainbow: '#ff7ad1' } as const;
const SIGNS = { quiet: 'QUIET PLEASE', five: '5 MINUTES', home: 'YOU ARE HOME', tips: 'TIPS = RENT', stage: 'STAGE' } as const;
const RAILS = {
  sequin: ['#d4163c', '#1b8f8a', '#d9a520', '#7a2fb0', '#1c5fd0', '#e24a9a'],
  feather: ['#ff7fb5', '#fff4f0', '#35c7c0', '#ffd24f', '#f25c9c', '#b48cf0'],
  leather: ['#1c1a1d', '#3a1418', '#26232b', '#7c1420', '#111014', '#4b4650'],
  tulle: ['#f7c4d8', '#c7e4f4', '#e2cdf5', '#fdf0b8', '#c9efd6', '#ffd9c2'],
  thrift: ['#8a6a4c', '#b34f3c', '#5f7a52', '#c9a14a', '#52607a', '#a9577d', '#d8cbb0'],
} as const;

const BW = 5.4, BD = 4.0, WALL_H = 2.8;
const X0 = -BW / 2, Z0 = -BD / 2;
const DOOR_L = 1.35, DOOR_R = 2.3, DOOR_H = 2.1;
const COUNTER_Y = 0.88, COUNTER_X1 = 1.02, COUNTER_DEPTH = 0.8;
/** Where the cast stands: three spots on the counter and two on the floor. */
const SPOTS = [
  { x: -0.5, z: -1.52, y: COUNTER_Y, h: 1.3, r: 0.42 },
  { x: 0.95, z: 0.45, y: 0, h: 1.7, r: 0.6 },
  { x: -1.92, z: -1.54, y: COUNTER_Y, h: 0.85, r: 0.34 },
  { x: -0.65, z: 1.05, y: 0, h: 1.25, r: 0.55 },
  { x: 0.5, z: -1.5, y: COUNTER_Y, h: 0.6, r: 0.27 },
] as const;

export default defineWorld({
  questions: {
    venue: choice('What kind of venue is this dressing room behind?', {
      dive: 'A dive bar: teal paint over plywood, band stickers, beer crates in the corner, everything borrowed.',
      cabaret: 'A cabaret: deep red walls, gilt mirror frames, a velvet curtain and a tufted stool.',
      pageant: 'A pageant: powder-pink walls, white lacquer, a cabinet of trophies, everything tidy and competitive.',
      ballroom: 'A ballroom house: purple and black, tall trophies on the floor, the house name painted on the wall.',
      revue: 'A 1930s revue: cream and green art deco, a fan-topped mirror and an open steamer trunk.',
    }),
    hour: choice('What hour of the night is it?', {
      ready: 'Getting ready: every bulb on, the rail full, shoes lined up, the stage door barely ajar.',
      midshow: 'Mid-show: the door flung wide and blazing, half the rail gone, a quick-change heap on the floor.',
      aftermath: '3am aftermath: one mirror switched off, heels kicked across the floor, bottles tipped over, a wig dropped.',
    }),
    station: choice('Whose station is the main mirror?', {
      veteran: 'The house mother: decades of photos crowding the glass and a heart drawn in lipstick.',
      newcomer: 'A first-timer: nearly bare, sticky notes of encouragement and YOU GOT THIS on the glass.',
      headliner: 'The headliner: a gold star on the door and STAR across the mirror.',
      shared: 'Shared by three queens: name tapes along the top and everyone’s clutter overlapping.',
      ghost: 'Someone who is gone: the mirror left dark with a black ribbon, MISS YOU written on the glass.',
    }),
    doorLight: choice('What colour leaks in through the stage door?', {
      magenta: 'Hot magenta, a pop number in full swing.',
      amber: 'Warm amber, a torch song under a single spot.',
      blue: 'Cold blue, a slow ballad or an empty stage.',
      green: 'Acid green, something strange and camp.',
      rainbow: 'A rainbow wash that slowly turns.',
    }),
    sign: choice('What does the lit sign over the stage door say?', {
      quiet: 'QUIET PLEASE: a show is running on the other side.',
      five: '5 MINUTES: the call before going on.',
      home: 'YOU ARE HOME: a welcome for whoever walks in.',
      tips: 'TIPS = RENT: the economics, stated plainly.',
      stage: 'STAGE: plain and practical.',
    }),
    rail: choice('What hangs on the costume rail?', {
      sequin: 'Jewel-toned sequin gowns that catch the light.',
      feather: 'Pink, white and turquoise numbers trimmed in feathers.',
      leather: 'Black leather and oxblood latex.',
      tulle: 'Wide pastel tulle and petticoats.',
      thrift: 'A mismatched thrift-store haul in browns, florals and mustard.',
    }),
    floor: choice('What is the floor?', {
      checker: 'Black and cream checkerboard lino.',
      boards: 'Scuffed bare floorboards.',
      carpet: 'Red patterned pub carpet with a worn path.',
      glitter: 'Painted concrete with years of glitter ground into it.',
    }),
    tribute: choice('What has been left at the station?', {
      nothing: 'Nothing: only the working clutter.',
      bouquet: 'A wrapped bouquet laid on the chair.',
      tips: 'Crumpled dollar bills fanned on the counter and dropped on the floor.',
      trophy: 'A trophy with a sash, set down among the makeup.',
      note: 'An envelope slid under the stage door.',
      candles: 'A row of small lit candles along the counter.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const pal = VENUES[a.venue];
    const rnd = (lo: number, hi: number) => lo + random() * (hi - lo);
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length) % list.length];
    const density = clamp01(mood.density + (a.station === 'shared' ? 0.3 : a.station === 'newcomer' ? -0.25 : 0));
    const floorBase = { checker: '#d9cfb8', boards: '#a5805c', carpet: '#9c3a40', glitter: '#8f96a3' }[a.floor];

    const { art: s, world } = diorama(context, {
      background: pal.back, floor: floorBase, width: BW, depth: BD, yaw: 30, pitch: 31, maxHeight: 0.6, radius: 0.27,
      slots: SPOTS.map((spot) => [spot.x, spot.z] as const),
    });
    const root = s.root;
    const std = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...options });
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: V3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const box = (parent: THREE.Object3D, size: V3, at: V3, material: THREE.Material) => put(parent, new THREE.BoxGeometry(...size), material, at);

    const wallMat = std(pal.wall, { roughness: 0.92 }), trimMat = std(pal.trim), counterMat = std(pal.counter, { roughness: 0.6 });
    const frameMat = std(pal.frame, { roughness: 0.45, metalness: a.venue === 'cabaret' ? 0.5 : 0.05 });
    const gold = std('#d9b24a', { roughness: 0.3, metalness: 0.7 });
    const steel = std('#aab0b4', { roughness: 0.35, metalness: 0.6 });

    // ---- floor -------------------------------------------------------------------------
    const floorTex = paint(864, 640, (ctx, w, h) => {
      ctx.fillStyle = floorBase;
      ctx.fillRect(0, 0, w, h);
      if (a.floor === 'checker') {
        const t = w / 12;
        ctx.fillStyle = '#2b2a2c';
        for (let i = 0; i < 12; i++) for (let j = 0; j < 9; j++) if ((i + j) % 2) ctx.fillRect(i * t, j * t, t, t);
      } else if (a.floor === 'boards') {
        for (let j = 0; j < 14; j++) {
          ctx.fillStyle = `hsl(${26 + random() * 8} ${30 + random() * 12}% ${38 + random() * 14}%)`;
          ctx.fillRect(0, (j * h) / 14, w, h / 14 - 2);
          ctx.fillStyle = 'rgba(40,25,15,0.5)';
          for (let k = 0; k < 3; k++) ctx.fillRect(random() * w, (j * h) / 14, 2, h / 14);
        }
      } else if (a.floor === 'carpet') {
        for (let i = 0; i < 18; i++) for (let j = 0; j < 14; j++) {
          const cx = (i + (j % 2) * 0.5) * (w / 17), cy = j * (h / 13);
          ctx.fillStyle = '#d9a646';
          ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fill();
          ctx.strokeStyle = '#5c1e28'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(cx, cy, 15, 0, 7); ctx.stroke();
        }
        const path = ctx.createLinearGradient(w * 0.45, 0, w * 0.95, 0);
        path.addColorStop(0, 'rgba(190,150,140,0)'); path.addColorStop(0.5, `rgba(190,150,140,${0.25 + mood.wear * 0.35})`); path.addColorStop(1, 'rgba(190,150,140,0)');
        ctx.fillStyle = path; ctx.fillRect(0, 0, w, h);
      } else {
        for (let i = 0; i < 1400; i++) {
          ctx.fillStyle = `hsl(${random() * 360} 90% ${60 + random() * 30}%)`;
          ctx.fillRect(random() * w, random() * h, 2 + random() * 2, 2 + random() * 2);
        }
        ctx.strokeStyle = 'rgba(40,45,55,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(w * 0.2, 0); ctx.lineTo(w * 0.32, h * 0.5); ctx.lineTo(w * 0.25, h); ctx.stroke();
      }
      for (let i = 0; i < mood.wear * 16; i++) {
        const x = random() * w, y = random() * h, r = 20 + random() * 60;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(40,30,25,0.3)'); g.addColorStop(1, 'rgba(40,30,25,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    });
    const floorSkin = put(root, new THREE.PlaneGeometry(BW, BD), std('#ffffff', { map: floorTex, roughness: a.floor === 'checker' ? 0.5 : 0.9 }), [0, 0.006, 0]);
    floorSkin.rotation.x = -Math.PI / 2;
    floorSkin.castShadow = false;

    // ---- walls -------------------------------------------------------------------------
    const poster = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((random() - 0.5) * 0.14);
      const hue = random() * 360;
      ctx.fillStyle = `hsl(${hue} 72% ${48 + random() * 14}%)`;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = `hsl(${(hue + 140 + random() * 80) % 360} 85% 68%)`;
      ctx.beginPath(); ctx.arc(0, -h * 0.16, w * 0.32, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(-w * 0.2, -h * 0.02, w * 0.16, 0, 7); ctx.arc(w * 0.2, -h * 0.02, w * 0.16, 0, 7); ctx.fill();
      ctx.fillStyle = pick(['#f1cdb8', '#c98f6c', '#8a5a3e']);
      ctx.beginPath(); ctx.ellipse(0, -h * 0.08, w * 0.15, w * 0.2, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#c4143c';
      ctx.beginPath(); ctx.ellipse(0, -h * 0.08 + w * 0.1, w * 0.06, w * 0.025, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff8e8'; ctx.fillRect(-w * 0.42, h * 0.2, w * 0.84, h * 0.11);
      ctx.fillStyle = '#16141a'; ctx.fillRect(-w * 0.3, h * 0.35, w * 0.6, h * 0.045);
      if (random() < mood.wear) { ctx.fillStyle = pal.wall; ctx.beginPath(); ctx.moveTo(w / 2, -h / 2); ctx.lineTo(w / 2 - w * 0.35, -h / 2); ctx.lineTo(w / 2, -h / 2 + h * 0.3); ctx.fill(); }
      ctx.restore();
    };
    const wallPaint = (metresWide: number, side: boolean): Draw => (ctx, w, h) => {
      const m = w / metresWide;
      ctx.fillStyle = pal.wall; ctx.fillRect(0, 0, w, h);
      if (a.venue === 'cabaret') {
        ctx.fillStyle = 'rgba(70,10,20,0.35)';
        for (let i = 0; i < 26; i++) for (let j = 0; j < 12; j++) { ctx.beginPath(); ctx.ellipse((i + (j % 2) * 0.5) * 0.2 * m, j * 0.2 * m, 6, 11, 0, 0, 7); ctx.fill(); }
      } else if (a.venue === 'pageant') {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (let i = 0; i < metresWide / 0.3; i++) ctx.fillRect(i * 0.3 * m, 0, 0.13 * m, h);
      } else if (a.venue === 'ballroom') {
        ctx.fillStyle = 'rgba(235,199,78,0.55)';
        for (let i = 0; i < 46; i++) {
          const x = random() * w, y = random() * h * 0.7, r = 4 + random() * 8;
          ctx.beginPath();
          for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * 0.42 : r, t = (k / 10) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); }
          ctx.fill();
        }
      } else if (a.venue === 'revue') {
        ctx.strokeStyle = 'rgba(47,111,95,0.5)'; ctx.lineWidth = 4;
        for (let i = 0; i < metresWide / 0.9 + 1; i++) for (let k = 0; k < 7; k++) {
          const t = Math.PI * (0.15 + (k / 6) * 0.7);
          ctx.beginPath(); ctx.moveTo(i * 0.9 * m, h * 0.36); ctx.lineTo(i * 0.9 * m + Math.cos(t) * 0.4 * m, h * 0.36 - Math.sin(t) * 0.4 * m); ctx.stroke();
        }
      } else {
        // dive bar: band stickers and marker scrawl
        for (let i = 0; i < 26 + density * 40; i++) {
          ctx.save(); ctx.translate(random() * w, random() * h * 0.8); ctx.rotate((random() - 0.5) * 0.8);
          ctx.fillStyle = `hsl(${random() * 360} ${40 + random() * 50}% ${35 + random() * 45}%)`;
          const sw = 18 + random() * 40, sh = 12 + random() * 22;
          if (random() < 0.3) { ctx.beginPath(); ctx.arc(0, 0, sh, 0, 7); ctx.fill(); } else ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
          ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(-sw * 0.3, -2, sw * 0.6, 4);
          ctx.restore();
        }
      }
      // dado: darker lower wall with a rail
      ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(0, h - 0.95 * m, w, 0.95 * m);
      ctx.fillStyle = pal.trim; ctx.fillRect(0, h - 0.98 * m, w, 0.06 * m); ctx.fillRect(0, h - 0.1 * m, w, 0.1 * m);
      ctx.fillRect(0, 0, w, 0.07 * m);
      if (side) {
        // wall beside the chair: flyers, and the house name in a ballroom
        if (a.venue === 'ballroom') {
          ctx.fillStyle = pal.paper; ctx.fillRect(2.55 * m, 0.35 * m, 1.3 * m, 0.55 * m);
          ctx.fillStyle = pal.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = `bold ${0.17 * m}px sans-serif`; ctx.fillText('HOUSE OF', 3.2 * m, 0.5 * m);
          ctx.font = `bold ${0.24 * m}px serif`; ctx.fillText(pick(['LUXE', 'ECLAT', 'NOVA', 'REIGN']), 3.2 * m, 0.74 * m);
        }
        const n = 1 + Math.round(density * 3);
        for (let i = 0; i < n; i++) poster(ctx, (2.5 + (i % 2) * 0.62 + rnd(-0.04, 0.04)) * m, ((a.venue === 'ballroom' ? 1.0 : 0.3) + Math.floor(i / 2) * 0.72 + rnd(0, 0.08)) * m, 0.46 * m, 0.62 * m);
      } else {
        // the strip of wall between the main mirror and the stage door
        const n = 1 + Math.round(density * 2);
        for (let i = 0; i < n; i++) poster(ctx, (3.12 + rnd(-0.02, 0.06)) * m, (0.34 + i * 0.7) * m, 0.5 * m, 0.62 * m);
        for (let i = 0; i < Math.round(density * 3); i++) poster(ctx, (0.2 + i * 0.9 + rnd(0, 0.2)) * m, 0.14 * m, 0.34 * m, 0.44 * m);
      }
      for (let i = 0; i < mood.wear * 14; i++) {
        const x = random() * w, y = random() * h, r = 25 + random() * 70;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(50,40,30,0.28)'); g.addColorStop(1, 'rgba(50,40,30,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      if (mood.wear > 0.45) {
        ctx.strokeStyle = 'rgba(30,25,20,0.55)'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { let x = random() * w, y = 0; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (random() - 0.5) * 50; y += 20 + random() * 40; ctx.lineTo(x, y); } ctx.stroke(); }
      }
    };
    const backLen = DOOR_L - X0;
    box(root, [backLen, WALL_H, 0.16], [X0 + backLen / 2, WALL_H / 2, Z0 - 0.08], wallMat);
    box(root, [DOOR_R - DOOR_L, WALL_H - DOOR_H, 0.16], [(DOOR_L + DOOR_R) / 2, (WALL_H + DOOR_H) / 2, Z0 - 0.08], wallMat);
    box(root, [BW / 2 - DOOR_R, WALL_H, 0.16], [(DOOR_R + BW / 2) / 2, WALL_H / 2, Z0 - 0.08], wallMat);
    box(root, [0.16, WALL_H, BD + 0.16], [X0 - 0.08, WALL_H / 2, -0.08], wallMat);
    const backSkin = put(root, new THREE.PlaneGeometry(backLen, WALL_H), std('#ffffff', { map: paint(1184, 820, wallPaint(backLen, false)), roughness: 0.92 }), [X0 + backLen / 2, WALL_H / 2, Z0 + 0.004]);
    backSkin.castShadow = false;
    const sideSkin = put(root, new THREE.PlaneGeometry(BD, WALL_H), std('#ffffff', { map: paint(1168, 820, wallPaint(BD, true)), roughness: 0.92 }), [X0 + 0.004, WALL_H / 2, 0]);
    sideSkin.rotation.y = Math.PI / 2;
    sideSkin.castShadow = false;
    // door architrave
    for (const x of [DOOR_L - 0.04, DOOR_R + 0.04]) box(root, [0.08, DOOR_H + 0.08, 0.06], [x, DOOR_H / 2 + 0.04, Z0 + 0.03], trimMat);
    box(root, [DOOR_R - DOOR_L + 0.16, 0.08, 0.06], [(DOOR_L + DOOR_R) / 2, DOOR_H + 0.04, Z0 + 0.03], trimMat);

    // ---- stage door and its light --------------------------------------------------------
    const doorLevel = { ready: 0.8, midshow: 1.3, aftermath: 0.6 }[a.hour];
    const doorColour = new THREE.Color(DOOR_COLOURS[a.doorLight]);
    const glowMat = new THREE.MeshStandardMaterial({ color: '#111111', emissive: a.doorLight === 'rainbow' ? '#ffffff' : doorColour, emissiveIntensity: doorLevel, roughness: 1 });
    if (a.doorLight === 'rainbow') {
      glowMat.emissiveMap = paint(64, 256, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, h);
        ['#ff3b5c', '#ff9a2e', '#ffe14a', '#48e07e', '#3fa0ff', '#a45cff', '#ff3fa8'].forEach((c, i, all) => g.addColorStop(i / (all.length - 1), c));
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      });
    }
    const glow = put(root, new THREE.PlaneGeometry(DOOR_R - DOOR_L, DOOR_H), glowMat, [(DOOR_L + DOOR_R) / 2, DOOR_H / 2, Z0 - 0.14]);
    glow.castShadow = false;
    const reach = { ready: 1.3, midshow: 3.2, aftermath: 1.9 }[a.hour];
    const spillShape = new THREE.Shape();
    spillShape.moveTo(DOOR_L, -Z0); spillShape.lineTo(DOOR_R, -Z0);
    spillShape.lineTo(Math.min(DOOR_R + reach * 0.16, BW / 2), -Z0 - reach); spillShape.lineTo(DOOR_L - reach * 0.5, -Z0 - reach);
    const spillMat = new THREE.MeshBasicMaterial({ color: doorColour, transparent: true, opacity: 0.2 + doorLevel * 0.16, depthWrite: false });
    const spill = new THREE.Mesh(new THREE.ShapeGeometry(spillShape), spillMat);
    spill.rotation.x = -Math.PI / 2;
    spill.scale.y = -1;
    spill.rotation.x = Math.PI / 2;
    spill.position.y = 0.014;
    root.add(spill);
    const lamp = new THREE.PointLight(doorColour, 9 * doorLevel, 6.5, 1.6);
    lamp.position.set((DOOR_L + DOOR_R) / 2, 1.3, Z0 + 0.45);
    root.add(lamp);
    const hinge = new THREE.Group();
    hinge.position.set(DOOR_R, 0, Z0 + 0.03);
    hinge.rotation.y = THREE.MathUtils.degToRad({ ready: 16, midshow: 78, aftermath: 46 }[a.hour] + rnd(-5, 5));
    root.add(hinge);
    const doorW = DOOR_R - DOOR_L - 0.02;
    box(hinge, [doorW, DOOR_H - 0.02, 0.05], [-doorW / 2, DOOR_H / 2, 0], std(a.venue === 'pageant' ? '#f7efe9' : a.venue === 'revue' ? '#3b7566' : a.venue === 'cabaret' ? '#3a2226' : a.venue === 'ballroom' ? '#2a2636' : '#7a5a44', { roughness: 0.6 }));
    box(hinge, [doorW - 0.2, 0.7, 0.012], [-doorW / 2, 0.55, 0.03], trimMat);
    put(hinge, new THREE.SphereGeometry(0.035, 12, 8), gold, [-doorW + 0.09, 1.02, 0.06]);
    if (a.station === 'headliner') {
      const star = new THREE.Shape();
      for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.075 : 0.18, t = (k / 10) * Math.PI * 2 + Math.PI / 2; star[k ? 'lineTo' : 'moveTo'](Math.cos(t) * r, Math.sin(t) * r); }
      put(hinge, new THREE.ExtrudeGeometry(star, { depth: 0.02, bevelEnabled: false }), gold, [-doorW / 2, 1.55, 0.026]);
    } else {
      const plate = s.label(a.station === 'shared' ? 'CAST ONLY' : 'STAGE DOOR', 0.5, 0.11, [0, 0, 0], pal.ink, pal.paper);
      hinge.add(plate);
      plate.position.set(-doorW / 2, 1.55, 0.03);
    }
    const sign = s.label(SIGNS[a.sign], 0.96, 0.24, [(DOOR_L + DOOR_R) / 2, DOOR_H + 0.3, Z0 + 0.05], pal.ink, pal.paper);
    const signMat = sign.material as THREE.MeshStandardMaterial;
    signMat.emissive = new THREE.Color('#ffffff'); signMat.emissiveMap = signMat.map; signMat.emissiveIntensity = 0.55;
    box(root, [1.02, 0.3, 0.05], [(DOOR_L + DOOR_R) / 2, DOOR_H + 0.3, Z0 + 0.02], trimMat);

    // ---- counter -------------------------------------------------------------------------
    const cLen = COUNTER_X1 - X0, cMid = (X0 + COUNTER_X1) / 2, cZ = Z0 + COUNTER_DEPTH / 2;
    box(root, [cLen, 0.06, COUNTER_DEPTH], [cMid, COUNTER_Y - 0.03, cZ], counterMat);
    box(root, [cLen, 0.05, 0.03], [cMid, COUNTER_Y - 0.085, Z0 + COUNTER_DEPTH - 0.015], trimMat);
    const cabinetMat = std(new THREE.Color(pal.counter).multiplyScalar(0.82), { roughness: 0.7 });
    const handles: Inst[] = [];
    for (const x of [X0 + 0.36, COUNTER_X1 - 0.36]) {
      box(root, [0.7, COUNTER_Y - 0.06, COUNTER_DEPTH - 0.08], [x, (COUNTER_Y - 0.06) / 2, cZ - 0.02], cabinetMat);
      for (let k = 0; k < 3; k++) {
        const open = random() < 0.15 + density * 0.3 ? rnd(0.05, 0.16) : 0;
        box(root, [0.62, 0.22, 0.03 + open], [x, 0.16 + k * 0.26, Z0 + COUNTER_DEPTH - 0.045 + open / 2], counterMat);
        handles.push({ at: [x, 0.2 + k * 0.26, Z0 + COUNTER_DEPTH - 0.02 + open], scale: [0.09, 0.015, 0.02] });
      }
    }
    instances(root, new THREE.BoxGeometry(1, 1, 1), gold.clone(), handles);

    // ---- mirrors -------------------------------------------------------------------------
    const lit: Inst[] = [], dark: Inst[] = [], stutter: Inst[] = [];
    const stutterBudget = Math.round(mood.wear * 4 + (a.venue === 'dive' ? 1 : 0));
    const lipstick = pick(['#d0123c', '#e0356f', '#b3123a', '#c91f8a']);
    const mirror = (cx: number, y0: number, w: number, h: number, main: boolean) => {
      const off = main ? a.station === 'ghost' : a.hour === 'aftermath';
      box(root, [w + 0.3, h + 0.3, 0.07], [cx, y0 + h / 2, Z0 + 0.035], frameMat);
      const tex = paint(512, Math.round((512 * h) / w), (ctx, cw, ch) => {
        const g = ctx.createLinearGradient(0, 0, cw, ch);
        g.addColorStop(0, off ? '#8f99a3' : '#dfeaf0'); g.addColorStop(0.5, off ? '#6f7882' : '#b9cbd6'); g.addColorStop(1, off ? '#7c858e' : '#d3e0e7');
        ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (const o of [0.18, 0.3, 0.72]) { ctx.beginPath(); ctx.moveTo(cw * o, 0); ctx.lineTo(cw * (o + 0.07), 0); ctx.lineTo(cw * (o - 0.2), ch); ctx.lineTo(cw * (o - 0.27), ch); ctx.fill(); }
        // tucked photos, more of them for the house mother
        const photos = main
          ? Math.round({ veteran: 9, newcomer: 1, headliner: 4, shared: 6, ghost: 3 }[a.station] * (0.5 + density))
          : Math.round(1 + density * 5);
        for (let i = 0; i < photos; i++) {
          const edge = Math.floor(random() * 3), pw = cw * 0.11, ph = pw * 1.2;
          const px = edge === 0 ? pw * 0.6 : edge === 1 ? cw - pw * 0.6 : rnd(pw, cw - pw);
          const py = edge === 2 ? ch - ph * 0.6 : rnd(ph * 0.6, ch - ph * 0.6);
          ctx.save(); ctx.translate(px, py); ctx.rotate((random() - 0.5) * 0.6);
          ctx.fillStyle = '#fbf8ef'; ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
          ctx.fillStyle = `hsl(${random() * 360} 45% ${35 + random() * 30}%)`; ctx.fillRect(-pw * 0.42, -ph * 0.44, pw * 0.84, ph * 0.68);
          ctx.fillStyle = pick(['#f1cdb8', '#c98f6c', '#8a5a3e']); ctx.beginPath(); ctx.arc(0, -ph * 0.12, pw * 0.2, 0, 7); ctx.fill();
          ctx.restore();
        }
        ctx.strokeStyle = lipstick; ctx.fillStyle = lipstick; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const scrawl = (text: string, x: number, y: number, size: number, tilt = -0.07) => {
          ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.font = `italic bold ${size}px cursive`; ctx.fillText(text, 0, 0, cw * 0.86); ctx.restore();
        };
        const heart = (x: number, y: number, r: number) => {
          ctx.lineWidth = r * 0.22; ctx.beginPath(); ctx.moveTo(x, y + r);
          ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.5, y - r * 1.3, x, y - r * 0.4);
          ctx.bezierCurveTo(x + r * 0.5, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r); ctx.stroke();
        };
        if (main) {
          if (a.station === 'veteran') { heart(cw * 0.5, ch * 0.2, ch * 0.13); scrawl('MOTHER', cw * 0.5, ch * 0.42, ch * 0.13); }
          else if (a.station === 'newcomer') {
            scrawl('YOU GOT THIS', cw * 0.5, ch * 0.2, ch * 0.13);
            for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(cw * (0.12 + i * 0.24 + rnd(0, 0.04)), ch * rnd(0.4, 0.6)); ctx.rotate((random() - 0.5) * 0.4); ctx.fillStyle = pick(['#ffe66b', '#ff9ec4', '#9be7ff']); ctx.fillRect(-28, -28, 56, 56); ctx.fillStyle = '#333'; ctx.fillRect(-18, -10, 36, 4); ctx.fillRect(-18, 2, 26, 4); ctx.restore(); }
          } else if (a.station === 'headliner') {
            scrawl('STAR', cw * 0.5, ch * 0.22, ch * 0.2);
            ctx.fillStyle = '#e8c24a'; ctx.beginPath();
            for (let k = 0; k < 10; k++) { const r = k % 2 ? ch * 0.035 : ch * 0.085, t = (k / 10) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(cw * 0.84 + Math.cos(t) * r, ch * 0.2 + Math.sin(t) * r); }
            ctx.fill();
          } else if (a.station === 'shared') {
            ['KIKI', 'LOLA', 'DEE'].forEach((name, i) => { ctx.save(); ctx.translate(cw * (0.2 + i * 0.3), ch * 0.09); ctx.rotate((random() - 0.5) * 0.12); ctx.fillStyle = '#f4ead2'; ctx.fillRect(-64, -20, 128, 40); ctx.fillStyle = '#1d1a22'; ctx.font = 'bold 30px sans-serif'; ctx.fillText(name, 0, 2); ctx.restore(); });
          } else {
            scrawl('MISS YOU', cw * 0.5, ch * 0.3, ch * 0.15);
            ctx.strokeStyle = '#141216'; ctx.lineWidth = ch * 0.07;
            ctx.beginPath(); ctx.moveTo(cw * 0.62, 0); ctx.lineTo(cw, ch * 0.36); ctx.stroke();
          }
        } else if (a.hour === 'aftermath') scrawl('GOODNIGHT', cw * 0.5, ch * 0.3, ch * 0.15);
        else if (a.hour === 'ready') { scrawl('BREAK A LEG', cw * 0.5, ch * 0.26, ch * 0.14); }
        else { heart(cw * 0.5, ch * 0.28, ch * 0.14); }
        if (mood.wear > 0.3) { ctx.fillStyle = `rgba(60,55,50,${mood.wear * 0.35})`; for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(random() < 0.5 ? rnd(0, cw * 0.12) : rnd(cw * 0.88, cw), random() * ch, 2 + random() * 7, 0, 7); ctx.fill(); } }
      });
      const glass = put(root, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: off ? 0.05 : 0.3, roughness: 0.2, metalness: 0.1 }), [cx, y0 + h / 2, Z0 + 0.073]);
      glass.castShadow = false;
      const ring: [number, number][] = [];
      const cols = Math.round((w + 0.16) / 0.2), rows = Math.round(h / 0.2);
      for (let i = 0; i <= cols; i++) ring.push([cx - w / 2 - 0.08 + (i / cols) * (w + 0.16), y0 + h + 0.08]);
      for (let j = 0; j < rows; j++) for (const side of [-1, 1]) ring.push([cx + side * (w / 2 + 0.08), y0 + 0.05 + (j / rows) * h]);
      for (const [x, y] of ring) {
        const at: V3 = [x, y, Z0 + 0.085];
        const dead = random() < mood.wear * 0.4;
        if (off) (main && random() < 0.12 ? stutter : dark).push({ at });
        else if (dead) dark.push({ at });
        else if (stutter.length < stutterBudget && random() < 0.12) stutter.push({ at });
        else lit.push({ at });
      }
      if (a.venue === 'revue' && main) {
        const fan = put(root, new THREE.CylinderGeometry(w * 0.34, w * 0.34, 0.05, 28, 1, false, 0, Math.PI), frameMat, [cx, y0 + h + 0.15, Z0 + 0.03]);
        fan.rotation.set(Math.PI / 2, Math.PI / 2, 0);
        for (let k = 0; k < 7; k++) { const t = Math.PI * (0.1 + (k / 6) * 0.8); (stutter.length < stutterBudget ? stutter : lit).push({ at: [cx + Math.cos(t) * w * 0.27, y0 + h + 0.17 + Math.sin(t) * w * 0.27, Z0 + 0.07] }); }
      }
      if (a.venue === 'pageant' && main) {
        const sash = put(root, new THREE.BoxGeometry(0.13, h * 1.25, 0.012), std(pal.accent, { roughness: 0.4 }), [cx + w / 2 - 0.12, y0 + h * 0.55, Z0 + 0.1]);
        sash.rotation.z = 0.5;
      }
    };
    mirror(SPOTS[0].x, 1.02, 1.42, 1.26, true);
    mirror(SPOTS[2].x, 1.04, 0.98, 0.98, false);
    const bulbHue = mix(0.15, 0.075, mood.warmth);
    const litMat = new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: new THREE.Color().setHSL(bulbHue, 0.95, 0.62), emissiveIntensity: 1.5, roughness: 0.3 });
    const stutterMat = litMat.clone();
    const bulbGeo = () => new THREE.SphereGeometry(0.046, 12, 8);
    instances(root, bulbGeo(), litMat, lit);
    instances(root, bulbGeo(), stutterMat, stutter);
    instances(root, bulbGeo(), std('#a9a498', { roughness: 0.25, metalness: 0.2 }), dark);

    // ---- counter clutter -----------------------------------------------------------------
    const onCounter = (margin = 0.05): [number, number] | null => {
      for (let tries = 0; tries < 30; tries++) {
        const x = rnd(X0 + 0.08, COUNTER_X1 - 0.07), z = rnd(Z0 + 0.1, Z0 + COUNTER_DEPTH - 0.06);
        if (SPOTS.every((spot) => spot.y === 0 || Math.hypot(x - spot.x, z - spot.z) > spot.r + margin)) return [x, z];
      }
      return null;
    };
    const jars: Inst[] = [], slabs: Inst[] = [];
    const clutterTints = ['#f4efe6', '#1f1c22', pal.accent, '#e35b8f', '#d8b25a', '#7fc4c0', '#c9243f', '#b9a0e0', '#f0c9b0'];
    for (let i = 0; i < 8 + density * 26; i++) {
      const p = onCounter(); if (!p) continue;
      const r = rnd(0.018, 0.045), h = rnd(0.05, 0.24);
      const tipped = a.hour === 'aftermath' && random() < 0.35;
      jars.push(tipped
        ? { at: [p[0], COUNTER_Y + r, p[1]], scale: [r, h, r], rot: [0, random() * 6, Math.PI / 2], color: pick(clutterTints) }
        : { at: [p[0], COUNTER_Y, p[1]], scale: [r, h, r], color: pick(clutterTints) });
    }
    for (let i = 0; i < 3 + density * 9; i++) {
      const p = onCounter(0.1); if (!p) continue;
      slabs.push({ at: [p[0], COUNTER_Y, p[1]], scale: [rnd(0.1, 0.2), rnd(0.012, 0.03), rnd(0.07, 0.13)], rot: [0, random() * 3, 0], color: pick(clutterTints) });
    }
    const unit = new THREE.CylinderGeometry(1, 1, 1, 10); unit.translate(0, 0.5, 0);
    const slabGeo = new THREE.BoxGeometry(1, 1, 1); slabGeo.translate(0, 0.5, 0);
    instances(root, unit, std('#ffffff', { roughness: 0.4 }), jars);

    // ---- tribute -------------------------------------------------------------------------
    const trophy = (parent: THREE.Object3D, at: V3, height: number, ribbon = false) => {
      const g = new THREE.Group(); g.position.set(...at); g.scale.setScalar(height); parent.add(g);
      const cup = put(g, new THREE.LatheGeometry([[0.16, 0], [0.16, 0.06], [0.05, 0.1], [0.035, 0.34], [0.07, 0.4], [0.19, 0.62], [0.24, 0.92], [0.22, 0.92], [0.17, 0.66], [0, 0.5]].map(([x, y]) => new THREE.Vector2(x, y)), 20), gold);
      (cup.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      box(g, [0.36, 0.14, 0.36], [0, -0.07, 0], std('#2a2428', { roughness: 0.4 }));
      for (const side of [-1, 1]) { const ear = put(g, new THREE.TorusGeometry(0.11, 0.018, 6, 16, Math.PI), gold, [side * 0.21, 0.72, 0]); ear.rotation.z = -side * Math.PI / 2; }
      g.position.y += 0.14 * height;
      if (ribbon) { const band = put(g, new THREE.BoxGeometry(0.1, 0.9, 0.012), std(pal.accent, { roughness: 0.4 }), [0.02, 0.5, 0.2]); band.rotation.set(0.25, 0, 0.6); }
      return g;
    };
    let flameMat: THREE.MeshStandardMaterial | null = null;
    const tributeX = (SPOTS[0].x + SPOTS[2].x) / 2;
    if (a.tribute === 'trophy') trophy(root, [tributeX, COUNTER_Y, Z0 + 0.5], 0.42, true);
    if (a.tribute === 'candles' || a.station === 'ghost') {
      const wax: Inst[] = [], flames: Inst[] = [];
      const n = a.tribute === 'candles' ? 7 : 3;
      for (let i = 0; i < n; i++) {
        const x = a.tribute === 'candles' ? mix(X0 + 0.95, COUNTER_X1 - 0.75, i / (n - 1)) + rnd(-0.05, 0.05) : tributeX + (i - 1) * 0.13;
        const z = Z0 + COUNTER_DEPTH - rnd(0.05, 0.1), h = rnd(0.05, 0.16);
        wax.push({ at: [x, COUNTER_Y, z], scale: [0.028, h, 0.028], color: pick(['#f6efe0', '#f3d9d9', '#efe6c8']) });
        flames.push({ at: [x, COUNTER_Y + h + 0.03, z], scale: [0.6, 1.3, 0.6] });
      }
      instances(root, unit.clone(), std('#ffffff', { roughness: 0.5 }), wax);
      flameMat = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff9a2a', emissiveIntensity: 2.2 });
      const fl = instances(root, new THREE.SphereGeometry(0.02, 8, 6), flameMat, flames);
      if (fl) fl.castShadow = false;
    }
    if (a.tribute === 'tips') {
      for (let i = 0; i < 16; i++) {
        const onTop = i < 9;
        const p: [number, number] = onTop ? [tributeX + rnd(-0.22, 0.22), Z0 + rnd(0.42, 0.72)] : [rnd(-1.9, 0.2), rnd(-1.05, 0.2)];
        slabs.push({ at: [p[0], (onTop ? COUNTER_Y : 0.012) + i * 0.0015, p[1]], scale: [0.16, 0.004, 0.068], rot: [0, random() * 6, 0], color: pick(['#86b381', '#9cc296', '#74a070']) });
      }
    }
    if (a.tribute === 'note') {
      slabs.push({ at: [(DOOR_L + DOOR_R) / 2 + rnd(-0.1, 0.1), 0.012, Z0 + 0.3], scale: [0.24, 0.006, 0.16], rot: [0, rnd(-0.6, 0.6), 0], color: '#fbf6ea' });
      slabs.push({ at: [(DOOR_L + DOOR_R) / 2 + 0.02, 0.019, Z0 + 0.3], scale: [0.05, 0.004, 0.05], rot: [0, 0.8, 0], color: '#c4143c' });
    }

    // ---- costume rail --------------------------------------------------------------------
    const railX = X0 + 0.42, railZ0 = -0.55, railZ1 = 1.72, railY = 1.72;
    for (const z of [railZ0, railZ1]) {
      put(root, new THREE.CylinderGeometry(0.02, 0.02, railY, 8), steel, [railX, railY / 2, z]);
      box(root, [0.5, 0.03, 0.05], [railX, 0.02, z], steel);
    }
    const bar = put(root, new THREE.CylinderGeometry(0.018, 0.018, railZ1 - railZ0 + 0.1, 8), steel, [railX, railY, (railZ0 + railZ1) / 2]);
    bar.rotation.x = Math.PI / 2;
    const garmentGeo = new THREE.CylinderGeometry(0.1, 0.26, 1, 14); garmentGeo.translate(0, -0.5, 0);
    const garments: Inst[] = [], fluff: Inst[] = [], hangers: Inst[] = [];
    const hung = Math.round({ ready: 7, midshow: 3, aftermath: 5 }[a.hour] + density * 4);
    const tints = RAILS[a.rail];
    for (let i = 0; i < hung; i++) {
      const z = mix(railZ0 + 0.14, railZ1 - 0.14, hung > 1 ? i / (hung - 1) : 0.5) + rnd(-0.05, 0.05);
      const len = a.rail === 'leather' ? rnd(0.55, 1.1) : rnd(0.8, 1.42);
      const wide = a.rail === 'tulle' ? rnd(1.5, 2.1) : rnd(0.95, 1.4);
      const colour = pick(tints);
      const slipped = a.hour === 'aftermath' && random() < 0.2;
      garments.push({ at: [railX, railY - 0.07, z], scale: [wide, len, 0.36], rot: [0, rnd(-0.25, 0.25), slipped ? 0.22 : rnd(-0.04, 0.04)], color: colour });
      hangers.push({ at: [railX, railY - 0.05, z], scale: [0.36 * wide * 0.6, 0.025, 0.02] });
      if (a.rail === 'feather' || (a.rail === 'tulle' && random() < 0.5))
        for (let k = 0; k < 9; k++) fluff.push({ at: [railX + ((k / 8) - 0.5) * 0.5 * wide, railY - 0.07 - len + rnd(-0.03, 0.05), z + rnd(-0.04, 0.08)], scale: [rnd(0.05, 0.08), rnd(0.05, 0.09), rnd(0.05, 0.08)], color: random() < 0.5 ? colour : '#fff6f2' });
    }
    const shiny = a.rail === 'sequin' ? { roughness: 0.28, metalness: 0.55 } : a.rail === 'leather' ? { roughness: 0.25, metalness: 0.15 } : { roughness: 0.85, metalness: 0 };
    instances(root, garmentGeo, std('#ffffff', shiny), garments);
    instances(root, new THREE.BoxGeometry(1, 1, 1), steel.clone(), hangers);

    // ---- shoes ---------------------------------------------------------------------------
    const heelGeo = (() => {
      const sole = new THREE.BoxGeometry(0.075, 0.022, 0.2); sole.rotateX(0.42); sole.translate(0, 0.07, -0.01);
      const toe = new THREE.BoxGeometry(0.08, 0.05, 0.09); toe.translate(0, 0.025, 0.085);
      const spike = new THREE.CylinderGeometry(0.014, 0.008, 0.11, 6); spike.translate(0, 0.055, -0.095);
      const merged = mergeGeometries([sole, toe, spike])!;
      sole.dispose(); toe.dispose(); spike.dispose();
      return merged;
    })();
    const shoes: Inst[] = [];
    const pairs = 2 + Math.round(density * 3);
    const shoeTints = ['#c4143c', '#16141a', '#e8c24a', '#f25c9c', '#f4efe6', '#2f8f8a', '#7a2fb0'];
    for (let i = 0; i < pairs; i++) {
      const colour = pick(shoeTints), size = rnd(1.25, 1.6);
      if (a.hour === 'ready') {
        const z = railZ0 + 0.3 + i * 0.36;
        for (const d of [-0.06, 0.06]) shoes.push({ at: [railX + 0.32, 0.01, z + d], scale: [size, size, size], rot: [0, Math.PI / 2, 0], color: colour });
      } else {
        const x = rnd(-1.6, 0.3), z = rnd(-0.9, 0.5);
        shoes.push({ at: [x, 0.01, z], scale: [size, size, size], rot: [0, random() * 6, 0], color: colour });
        shoes.push({ at: [x + rnd(-0.5, 0.5), 0.05, z + rnd(0.2, 0.5)], scale: [size, size, size], rot: [0, random() * 6, Math.PI / 2], color: colour });
      }
    }
    instances(root, heelGeo, std('#ffffff', { roughness: 0.3, metalness: 0.1 }), shoes);

    // ---- chair with boas -----------------------------------------------------------------
    const chair = new THREE.Group();
    chair.position.set(-1.72, 0, -0.72);
    chair.rotation.y = 0.55 + rnd(-0.2, 0.2);
    root.add(chair);
    const wood = std(a.venue === 'pageant' ? '#f3ece6' : a.venue === 'cabaret' ? '#c9a24a' : '#3a2a22', { roughness: 0.5, metalness: a.venue === 'cabaret' ? 0.4 : 0 });
    const seat = put(chair, new THREE.CylinderGeometry(0.23, 0.22, 0.07, 20), std(a.venue === 'cabaret' ? '#8e1f2e' : a.venue === 'pageant' ? '#e58ab0' : a.venue === 'ballroom' ? '#3c2f66' : a.venue === 'revue' ? '#2f6f5f' : '#b03a34', { roughness: 0.75 }), [0, 0.47, 0]);
    seat.scale.z = 0.95;
    for (const [x, z] of [[-0.17, 0.16], [0.17, 0.16], [-0.17, -0.17], [0.17, -0.17]] as const) {
      const leg = put(chair, new THREE.CylinderGeometry(0.016, 0.013, z < 0 ? 0.95 : 0.45, 8), wood, [x, z < 0 ? 0.475 : 0.225, z]);
      leg.rotation.x = z < 0 ? -0.04 : 0.06;
    }
    const backRest = put(chair, new THREE.TorusGeometry(0.17, 0.016, 8, 20, Math.PI), wood, [0, 0.93, -0.19]);
    backRest.rotation.x = -0.04;
    box(chair, [0.3, 0.12, 0.02], [0, 0.78, -0.185], wood);
    const boaTints = ['#ff5fa2', '#fff4ee', '#22c1b8', '#151318', '#ffcf40', '#a66bf0'];
    const boas = 1 + (density > 0.45 ? 1 : 0);
    for (let b = 0; b < boas; b++) {
      const colour = new THREE.Color(b === 0 ? pick(boaTints) : pick(boaTints));
      const path = new THREE.CatmullRomCurve3((b === 0
        ? [[0.42, 0.04, 0.3], [0.3, 0.12, 0.15], [0.2, 0.6, -0.12], [0.1, 1.0, -0.2], [-0.08, 1.02, -0.22], [-0.2, 0.62, -0.27], [-0.27, 0.2, -0.3], [-0.45, 0.05, -0.18]]
        : [[-0.3, 0.05, 0.42], [-0.22, 0.3, 0.26], [-0.1, 0.56, 0.1], [0.08, 0.57, 0.06], [0.2, 0.54, 0.2], [0.24, 0.25, 0.3], [0.12, 0.05, 0.48]]
      ).map((p) => new THREE.Vector3(p[0], p[1], p[2])));
      const boaMat = std(colour, { roughness: 1 });
      put(chair, new THREE.TubeGeometry(path, 40, 0.05, 7), boaMat);
      const puffs: Inst[] = [];
      for (let k = 0; k < 80; k++) {
        const p = path.getPointAt(k / 79);
        puffs.push({ at: [p.x + rnd(-0.03, 0.03), p.y + rnd(-0.02, 0.04), p.z + rnd(-0.03, 0.03)], scale: [rnd(0.065, 0.11), rnd(0.065, 0.11), rnd(0.065, 0.11)], rot: [random() * 3, random() * 3, 0], color: colour.clone().offsetHSL(0, 0, rnd(-0.06, 0.1)) });
      }
      instances(chair, new THREE.IcosahedronGeometry(1, 0), std('#ffffff', { roughness: 1, flatShading: true }), puffs);
    }
    if (a.tribute === 'bouquet') {
      const bouquet = new THREE.Group();
      bouquet.position.set(0.02, 0.56, 0.02); bouquet.rotation.set(0, rnd(-0.6, 0.6), Math.PI / 2 - 0.15);
      chair.add(bouquet);
      put(bouquet, new THREE.ConeGeometry(0.13, 0.42, 14, 1, true), std('#f2e9d8', { roughness: 0.9, side: THREE.DoubleSide }), [0, 0, 0]).rotation.x = Math.PI;
      const blooms: Inst[] = [];
      const flowerTints = pick([['#d0123c', '#e85a7c', '#f7d6dc'], ['#fff4ee', '#f4d35e', '#f7b2c4'], ['#a45cff', '#ff8ac0', '#fff0f5']]);
      for (let k = 0; k < 14; k++) { const t = random() * 6.28, r = rnd(0, 0.11); blooms.push({ at: [Math.cos(t) * r, 0.2 + rnd(0, 0.07), Math.sin(t) * r], scale: [0.045, 0.04, 0.045], color: pick(flowerTints) }); }
      instances(bouquet, new THREE.IcosahedronGeometry(1, 1), std('#ffffff', { roughness: 0.8 }), blooms);
      put(bouquet, new THREE.TorusGeometry(0.05, 0.012, 6, 14), std(pal.accent), [0, -0.08, 0]).rotation.x = Math.PI / 2;
    }
    if (a.hour === 'midshow') {
      // the quick-change: a costume dropped where it came off
      const heap: Inst[] = [];
      const colour = new THREE.Color(pick(tints));
      for (let k = 0; k < 9; k++) heap.push({ at: [-0.75 + rnd(-0.3, 0.3), rnd(0.03, 0.12), -0.35 + rnd(-0.25, 0.25)], scale: [rnd(0.14, 0.26), rnd(0.05, 0.11), rnd(0.14, 0.24)], rot: [rnd(-0.3, 0.3), random() * 6, rnd(-0.3, 0.3)], color: colour.clone().offsetHSL(0, 0, rnd(-0.08, 0.08)) });
      instances(root, new THREE.IcosahedronGeometry(1, 1), std('#ffffff', { ...shiny, flatShading: true }), heap);
    }

    // ---- wig heads on a shelf -------------------------------------------------------------
    const shelfY = 2.08, shelfX = X0 + 0.19;
    box(root, [0.36, 0.035, 2.1], [shelfX, shelfY, 0.62], trimMat);
    for (const z of [-0.2, 1.45]) box(root, [0.3, 0.2, 0.03], [shelfX, shelfY - 0.11, z], trimMat);
    const heads: Inst[] = [], necks: Inst[] = [], hair: Inst[] = [];
    const wigTints = ['#f25c9c', '#f6e27a', '#35c7c0', '#e8e4f4', '#c9243f', '#7a2fb0', '#3a2a22', '#ff8a3c', '#9be7a0'];
    const headCount = 3 + Math.round(density * 2);
    for (let i = 0; i < headCount; i++) {
      const z = mix(-0.22, 1.48, headCount > 1 ? i / (headCount - 1) : 0.5) + rnd(-0.04, 0.04), y = shelfY + 0.02;
      necks.push({ at: [shelfX, y, z], scale: [0.045, 0.13, 0.045] });
      heads.push({ at: [shelfX, y + 0.21, z], scale: [0.085, 0.11, 0.092] });
      if (a.hour === 'aftermath' && random() < 0.4) continue;
      const colour = pick(wigTints), kind = Math.floor(random() * 3);
      hair.push({ at: [shelfX - 0.02, y + 0.26, z], scale: [0.12, 0.11, 0.125], color: colour });
      if (kind === 0) hair.push({ at: [shelfX - 0.01, y + 0.42, z], scale: [0.1, 0.16, 0.1], color: colour });
      else if (kind === 1) hair.push({ at: [shelfX - 0.06, y + 0.12, z], scale: [0.09, 0.2, 0.125], color: colour });
      else for (const d of [-0.1, 0.1]) hair.push({ at: [shelfX, y + 0.2, z + d], scale: [0.07, 0.1, 0.07], color: colour });
    }
    instances(root, unit.clone(), std('#f1ebdf'), necks);
    instances(root, new THREE.SphereGeometry(1, 14, 10), std('#f1ebdf'), heads);
    instances(root, new THREE.SphereGeometry(1, 14, 10), std('#ffffff', { roughness: 0.7 }), hair);
    if (a.hour === 'aftermath') {
      const colour = pick(wigTints);
      instances(root, new THREE.SphereGeometry(1, 14, 10), std('#ffffff', { roughness: 0.75 }), [
        { at: [0.15, 0.1, -0.55], scale: [0.2, 0.11, 0.17], color: colour },
        { at: [0.3, 0.06, -0.45], scale: [0.16, 0.06, 0.1], rot: [0, 0.7, 0], color: colour },
        { at: [0.02, 0.06, -0.4], scale: [0.1, 0.05, 0.16], rot: [0, -0.4, 0], color: colour },
      ]);
    }

    // ---- the venue's own corner ------------------------------------------------------------
    const corner = new THREE.Group();
    corner.position.set(2.2, 0, 1.42);
    corner.rotation.y = rnd(-0.25, 0.1);
    root.add(corner);
    if (a.venue === 'dive') {
      const crate = std('#c9473a', { roughness: 0.7 }), crate2 = std('#3f6fb0', { roughness: 0.7 });
      box(corner, [0.44, 0.3, 0.32], [0, 0.15, 0], crate);
      box(corner, [0.44, 0.3, 0.32], [0.03, 0.45, 0.02], crate2).rotation.y = 0.2;
      box(corner, [0.44, 0.3, 0.32], [-0.5, 0.15, 0.1], crate2).rotation.y = -0.3;
      const bottles: Inst[] = [];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if (random() < 0.75) bottles.push({ at: [-0.14 + i * 0.1, 0.6, -0.08 + j * 0.1], scale: [0.03, rnd(0.16, 0.2), 0.03], color: pick(['#5a3a1c', '#2f5d3a', '#6b4a22']) });
      for (let i = 0; i < 2 + density * 4; i++) bottles.push({ at: [rnd(-0.9, -0.3), 0.3, rnd(0, 0.2)], scale: [0.03, 0.18, 0.03], color: pick(['#5a3a1c', '#2f5d3a']) });
      instances(corner, unit.clone(), std('#ffffff', { roughness: 0.25 }), bottles);
    } else if (a.venue === 'cabaret') {
      const velvet = std('#8e1f2e', { roughness: 0.85 });
      put(corner, new THREE.CylinderGeometry(0.34, 0.3, 0.4, 20), velvet, [0, 0.24, 0]);
      put(corner, new THREE.TorusGeometry(0.31, 0.03, 8, 24), gold, [0, 0.06, 0]).rotation.x = Math.PI / 2;
      const buttons: Inst[] = [];
      for (let k = 0; k < 6; k++) buttons.push({ at: [Math.cos(k) * 0.18, 0.445, Math.sin(k) * 0.18], scale: [0.02, 0.012, 0.02] });
      instances(corner, new THREE.SphereGeometry(1, 8, 6), gold.clone(), buttons);
      put(corner, new THREE.CylinderGeometry(0.13, 0.1, 0.26, 16), steel, [-0.58, 0.13, 0.05]);
      const fizz = put(corner, new THREE.CylinderGeometry(0.035, 0.045, 0.34, 10), std('#254a2e', { roughness: 0.2 }), [-0.56, 0.3, 0.05]);
      fizz.rotation.z = 0.3;
      // a velvet curtain drawn back beside the stage door
      const drape = new THREE.PlaneGeometry(0.42, 2.3, 14, 6);
      const pos = drape.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 42) * 0.035 * (1 - (pos.getY(i) + 1.15) / 4));
      drape.computeVertexNormals();
      const curtain = new THREE.Mesh(drape, std('#8e1f2e', { roughness: 0.9, side: THREE.DoubleSide }));
      curtain.position.set(BW / 2 - 0.2, 1.2, Z0 + 0.1);
      curtain.castShadow = true;
      root.add(curtain);
    } else if (a.venue === 'pageant') {
      box(corner, [0.7, 0.72, 0.38], [0, 0.36, 0], std('#fbf6f2', { roughness: 0.5 }));
      box(corner, [0.74, 0.03, 0.42], [0, 0.735, 0], std(pal.accent, { roughness: 0.5 }));
      trophy(corner, [-0.2, 0.75, 0], 0.5);
      trophy(corner, [0.08, 0.75, 0.04], 0.34);
      trophy(corner, [0.26, 0.75, -0.04], 0.24);
      const crown = put(corner, new THREE.CylinderGeometry(0.09, 0.075, 0.07, 10, 1, true), std('#e9eef2', { metalness: 0.8, roughness: 0.2, side: THREE.DoubleSide }), [0.1, 0.5, 0.21]);
      crown.rotation.x = 0.3;
    } else if (a.venue === 'ballroom') {
      trophy(corner, [0, 0, 0], 1.05);
      trophy(corner, [-0.45, 0, 0.08], 0.78);
      trophy(corner, [0.36, 0, 0.12], 0.55, true);
      trophy(corner, [-0.2, 0, 0.36], 0.4);
    } else {
      const hide = std('#5a3d2a', { roughness: 0.7 }), brass = std('#c0913d', { metalness: 0.6, roughness: 0.35 });
      box(corner, [0.5, 1.0, 0.34], [0, 0.5, 0], hide);
      const lid = box(corner, [0.5, 1.0, 0.2], [0.42, 0.5, 0.2], hide);
      lid.rotation.y = -1.0;
      for (let k = 0; k < 4; k++) box(corner, [0.42, 0.2, 0.02], [0, 0.14 + k * 0.24, 0.175], std(k % 2 ? '#d9cfae' : '#2f6f5f'));
      for (const y of [0.02, 0.98]) box(corner, [0.53, 0.04, 0.37], [0, y, 0], brass);
      put(corner, new THREE.CylinderGeometry(0.2, 0.2, 0.18, 20), std('#d9cfae'), [-0.52, 0.09, 0.1]);
      put(corner, new THREE.CylinderGeometry(0.16, 0.16, 0.14, 20), std('#2f6f5f'), [-0.5, 0.25, 0.08]);
    }

    // flat clutter is gathered throughout, so it is built last
    instances(root, slabGeo, std('#ffffff', { roughness: 0.6 }), slabs);
    if (fluff.length) instances(root, new THREE.IcosahedronGeometry(1, 0), std('#ffffff', { roughness: 1, flatShading: true }), fluff);

    // ---- fairy lights when the room is in good spirits ------------------------------------
    let fairyMat: THREE.MeshBasicMaterial | null = null;
    if (mood.cheer > 0.45) {
      const beads: Inst[] = [];
      const fairyTints = ['#ff5fa2', '#ffd84a', '#59e0c0', '#6aa8ff', '#ff8a3c', '#c58cff'];
      const wire: THREE.Vector3[] = [];
      const swags = 3;
      for (let k = 0; k <= 36; k++) {
        const t = k / 36, x = mix(X0 + 0.1, DOOR_L - 0.1, t), y = 2.68 - Math.abs(Math.sin(t * Math.PI * swags)) * 0.16;
        wire.push(new THREE.Vector3(x, y, Z0 + 0.04));
        beads.push({ at: [x, y - 0.025, Z0 + 0.05], scale: [0.03, 0.038, 0.03], color: fairyTints[k % fairyTints.length] });
      }
      for (let k = 0; k <= 22; k++) {
        const t = k / 22, z = mix(Z0 + 0.1, BD / 2 - 0.1, t), y = 2.68 - Math.abs(Math.sin(t * Math.PI * 2)) * 0.16;
        beads.push({ at: [X0 + 0.05, y - 0.025, z], scale: [0.03, 0.038, 0.03], color: fairyTints[(k + 2) % fairyTints.length] });
      }
      const wireMesh = put(root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wire), 80, 0.006, 4), std('#1d1a1f'));
      wireMesh.castShadow = false;
      fairyMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      const string = instances(root, new THREE.SphereGeometry(1, 8, 6), fairyMat, beads);
      if (string) string.castShadow = false;
    }

    // The room is lit by its bulbs: soften the daylight and tint it warm.
    if (world.keyLight) {
      world.keyLight.intensity = a.hour === 'aftermath' ? 1.9 : 2.4;
      world.keyLight.color.lerp(new THREE.Color().setHSL(bulbHue, 0.8, 0.8), 0.45);
    }

    const stage = world.place;
    world.place = (items: readonly Placeable[]) => {
      stage(items);
      items.forEach((item, index) => {
        const spot = SPOTS[index % SPOTS.length];
        const scale = Math.min(spot.h / Math.max(item.height, 0.05), spot.r / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(spot.x, spot.y, spot.z);
        item.holder.updateMatrixWorld(true);
      });
    };

    const energy = mood.energy, spillBase = spillMat.opacity, lampBase = lamp.intensity;
    const hsl = { h: 0, s: 0, l: 0 };
    world.update = (_dt: number, time: number) => {
      litMat.emissiveIntensity = 1.5 + Math.sin(time * 9.1) * Math.sin(time * 3.7) * 0.18 * energy;
      const beat = Math.sin(time * 23.0) * Math.sin(time * 7.3 + 1.2);
      stutterMat.emissiveIntensity = beat > 0.25 - mood.wear * 0.3 ? 1.5 : 0.12;
      const pulse = 1 + Math.sin(time * (1.5 + energy * 5)) * 0.3 * (0.3 + energy);
      glowMat.emissiveIntensity = doorLevel * pulse;
      spillMat.opacity = spillBase * pulse;
      lamp.intensity = lampBase * pulse;
      if (a.doorLight === 'rainbow') {
        doorColour.getHSL(hsl);
        const turned = new THREE.Color().setHSL((hsl.h + time * 0.05 * (0.4 + energy)) % 1, 0.95, 0.62);
        spillMat.color.copy(turned);
        lamp.color.copy(turned);
      }
      if (flameMat) flameMat.emissiveIntensity = 2.2 + Math.sin(time * 11) * Math.sin(time * 4.3) * 0.6;
      if (fairyMat) fairyMat.color.setScalar(0.82 + Math.sin(time * (1 + energy * 3)) * 0.18);
    };

    return world;
  },
});
