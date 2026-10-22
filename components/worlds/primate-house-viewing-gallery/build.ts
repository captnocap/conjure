import * as THREE from 'three';
import { choice, clamp01, defineWorld, diorama, mix } from '@conjure/kit';
import type { Placeable } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
type Rand = () => number;

function paint(width: number, height: number, draw: (c: Ctx) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Glazed wall tile, or board-marked concrete, with stains and lost tiles as it wears. */
function wallTexture(base: string, grout: string, cols: number, rows: number, wear: number, random: Rand, boards: boolean, dado?: string) {
  return paint(512, 512, (c) => {
    const tw = 512 / cols, th = 512 / rows;
    const tint = new THREE.Color();
    c.fillStyle = grout;
    c.fillRect(0, 0, 512, 512);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const low = dado && y >= rows - Math.ceil(rows * 0.34);
      tint.set(low ? dado! : base).offsetHSL(0, 0, (random() - 0.5) * 0.05);
      if (!boards && random() < wear * 0.04) tint.set('#9a968a');
      c.fillStyle = `#${tint.getHexString()}`;
      const off = boards ? 0 : (y % 2) * tw * 0.5;
      const gap = boards ? 1 : 2;
      for (const shift of [0, -512]) c.fillRect(x * tw + off + shift + gap / 2, y * th + gap / 2, tw - gap, th - gap);
      if (!boards) { c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x * tw + off + 3, y * th + 3, tw - 8, th * 0.22); }
    }
    if (boards) for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(60,55,48,${0.05 + random() * 0.08})`; c.fillRect(random() * 512, random() * 512, 30 + random() * 90, 1); }
    for (let i = 0; i < Math.round(wear * 16); i++) {
      const x = random() * 512, w = 6 + random() * 26, y0 = random() * 300;
      const g = c.createLinearGradient(0, y0, 0, 512);
      g.addColorStop(0, 'rgba(70,52,30,0)');
      g.addColorStop(0.3, `rgba(70,52,30,${0.04 + wear * 0.1})`);
      g.addColorStop(1, 'rgba(70,52,30,0)');
      c.fillStyle = g;
      c.fillRect(x, y0, w, 512 - y0);
    }
  });
}

function floorTexture(style: 'checker' | 'terrazzo' | 'stud', a: string, b: string, wear: number, random: Rand) {
  return paint(256, 256, (c) => {
    c.fillStyle = a;
    c.fillRect(0, 0, 256, 256);
    if (style === 'checker') { c.fillStyle = b; c.fillRect(0, 0, 128, 128); c.fillRect(128, 128, 128, 128); c.strokeStyle = 'rgba(40,36,30,0.35)'; c.lineWidth = 2; c.strokeRect(0, 0, 128, 128); c.strokeRect(128, 128, 128, 128); }
    if (style === 'terrazzo') for (let i = 0; i < 700; i++) { c.fillStyle = [b, '#8a8377', '#e9e3d2', '#a7826a'][i % 4]; c.fillRect(random() * 256, random() * 256, 2 + random() * 4, 2 + random() * 3); }
    if (style === 'stud') for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.fillStyle = b; c.beginPath(); c.arc(x * 32 + 16, y * 32 + 16, 9, 0, 7); c.fill(); }
    for (let i = 0; i < wear * 40; i++) { c.fillStyle = `rgba(50,44,36,${0.05 + random() * 0.12})`; c.beginPath(); c.ellipse(random() * 256, random() * 256, 8 + random() * 30, 5 + random() * 16, random() * 3, 0, 7); c.fill(); }
  });
}

type Mural = 'jungle' | 'mountains' | 'savanna' | 'bare';
function muralTexture(kind: Mural, wear: number, cheer: number, random: Rand) {
  return paint(1024, 440, (c) => {
    const W = 1024, H = 440;
    const sat = mix(0.55, 1.1, cheer) * mix(1, 0.6, wear);
    const col = (hex: string, light = 0) => { const k = new THREE.Color(hex); const hsl = { h: 0, s: 0, l: 0 }; k.getHSL(hsl); k.setHSL(hsl.h, Math.min(1, hsl.s * sat * 1.25), Math.max(0, Math.min(1, hsl.l * 0.86 + light + wear * 0.04))); return `#${k.getHexString()}`; };
    if (kind === 'bare') {
      c.fillStyle = col('#d8d4bf'); c.fillRect(0, 0, W, H);
      c.fillStyle = col('#7f9a84'); c.fillRect(0, H * 0.48, W, H);
      c.fillStyle = col('#4c6a55'); c.fillRect(0, H * 0.46, W, 8);
    } else {
      const sky = c.createLinearGradient(0, 0, 0, H);
      const tones = { jungle: ['#8fd0c0', '#dfe9a8'], mountains: ['#8fb4d6', '#e6d9c0'], savanna: ['#f0b860', '#f6e2a0'] }[kind];
      sky.addColorStop(0, col(tones[0])); sky.addColorStop(1, col(tones[1]));
      c.fillStyle = sky; c.fillRect(0, 0, W, H);
    }
    if (kind === 'mountains') {
      for (const [base, peak, tone] of [[0.62, 0.3, '#93a9bd'], [0.72, 0.2, '#6f8f8e'], [0.84, 0.12, '#4f7a5c']] as const) {
        c.fillStyle = col(tone); c.beginPath(); c.moveTo(0, H);
        for (let x = 0; x <= W; x += 32) c.lineTo(x, H * (base - peak * Math.abs(Math.sin(x * 0.006 + base * 9)) - random() * 0.03));
        c.lineTo(W, H); c.fill();
      }
      c.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(random() * W, H * (0.5 + random() * 0.2), 120 + random() * 120, 12, 0, 0, 7); c.fill(); }
    }
    if (kind === 'savanna') {
      c.fillStyle = col('#d9b25e'); c.fillRect(0, H * 0.68, W, H);
      c.fillStyle = col('#b98f45'); c.fillRect(0, H * 0.82, W, H);
      c.fillStyle = col('#f7f1d8'); c.beginPath(); c.arc(W * (0.2 + random() * 0.6), H * 0.3, 44, 0, 7); c.fill();
      for (let i = 0; i < 6; i++) {
        const x = (i + 0.3 + random() * 0.5) * W / 6, y = H * (0.66 + random() * 0.1), k = 0.7 + random() * 0.7;
        c.strokeStyle = col('#5a4630'); c.lineWidth = 7 * k; c.beginPath(); c.moveTo(x, y + 60 * k); c.lineTo(x + 6, y); c.stroke();
        c.fillStyle = col('#5f7a3a'); c.beginPath(); c.ellipse(x + 6, y - 6, 70 * k, 16 * k, 0, 0, 7); c.fill();
      }
    }
    if (kind === 'jungle') {
      for (let layer = 0; layer < 3; layer++) {
        const tone = ['#7fb08a', '#3f8a55', '#1f5c3a'][layer];
        for (let i = 0; i < 9; i++) {
          const x = random() * W, y = H * (0.5 + layer * 0.2 + random() * 0.12), r = 50 + random() * 60 - layer * 8;
          c.fillStyle = col(tone, (random() - 0.5) * 0.06);
          // A fan of fronds.
          for (let f = 0; f < 9; f++) {
            const ang = -Math.PI * (0.08 + f * 0.105);
            c.save(); c.translate(x, y); c.rotate(ang); c.beginPath(); c.ellipse(r * 0.9, 0, r, r * 0.16, 0, 0, 7); c.fill(); c.restore();
          }
          c.fillRect(x - 4, y, 8, H - y);
        }
      }
      c.strokeStyle = col('#5a4630'); c.lineWidth = 5;
      for (let i = 0; i < 4; i++) { const x = random() * W; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 80 * (random() - 0.5), H * 0.3, x + 40 * (random() - 0.5), H * (0.4 + random() * 0.3)); c.stroke(); }
      c.fillStyle = col('#e2572c'); for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(random() * W, H * (0.3 + random() * 0.5), 7, 0, 7); c.fill(); }
    }
    // Age: water stains running down, paint flaking to plaster.
    for (let i = 0; i < wear * 14; i++) {
      const x = random() * W, w = 10 + random() * 40;
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, `rgba(90,75,50,${0.1 + wear * 0.25})`); g.addColorStop(1, 'rgba(90,75,50,0)');
      c.fillStyle = g; c.fillRect(x, 0, w, H * (0.4 + random() * 0.6));
    }
    for (let i = 0; i < wear * wear * 30; i++) {
      c.fillStyle = '#cfc8b6'; c.beginPath();
      const x = random() * W, y = random() * H;
      for (let k = 0; k < 7; k++) { const ang = k / 7 * Math.PI * 2, r = 8 + random() * 26; c.lineTo(x + Math.cos(ang) * r * 1.4, y + Math.sin(ang) * r); }
      c.fill();
    }
  });
}

function hand(c: Ctx, x: number, y: number, size: number, rot: number, long: boolean, alpha: number) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = `rgba(245,248,244,${alpha})`;
  c.beginPath(); c.ellipse(0, 0, size * 0.5, size * (long ? 0.7 : 0.55), 0, 0, 7); c.fill();
  for (let f = 0; f < 4; f++) {
    const fx = (f - 1.5) * size * 0.27, len = size * (long ? 1.25 : 0.62) * (f === 0 || f === 3 ? 0.85 : 1);
    c.beginPath(); c.ellipse(fx, -size * 0.55 - len * 0.5, size * 0.11, len * 0.5, (f - 1.5) * 0.09, 0, 7); c.fill();
  }
  c.beginPath(); c.ellipse(size * 0.62, size * 0.05, size * 0.12, size * 0.3, -0.9, 0, 7); c.fill();
  c.restore();
}

type Marks = 'handprints' | 'fog' | 'crack' | 'notices' | 'spotless';
/** Everything left on the pane: reflections, dust, and the chosen marks. Transparent where the glass is clean. */
function glassTexture(kind: Marks, wide: number, wear: number, random: Rand, hero: boolean) {
  const W = Math.round(150 * wide), H = 452;
  return paint(W, H, (c) => {
    // Two soft diagonal reflections so the pane reads as glass at all.
    for (const [x, w, alpha] of [[W * 0.14, 40, 0.16], [W * 0.2, 14, 0.11], [W * 0.9, 26, 0.1]] as const) {
      c.fillStyle = `rgba(255,255,255,${alpha})`;
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x + w, 0); c.lineTo(x + w - H * 0.45, H); c.lineTo(x - H * 0.45, H); c.fill();
    }
    const dust = c.createLinearGradient(0, H * 0.45, 0, H);
    dust.addColorStop(0, 'rgba(200,196,170,0)'); dust.addColorStop(1, `rgba(200,196,170,${wear * 0.25})`);
    c.fillStyle = dust; c.fillRect(0, 0, W, H);
    for (let i = 0; i < wear * 26; i++) { c.fillStyle = `rgba(215,212,190,${0.03 + random() * 0.06})`; c.fillRect(random() * W, random() * H * 0.5, 2 + random() * 5, H); }
    const amount = kind === 'spotless' ? 0 : mix(0.5, 1.4, wear);
    if (kind === 'handprints') {
      for (let i = 0; i < Math.round(wide * 5 * amount); i++) hand(c, random() * W, H * (0.66 + random() * 0.26), 17 + random() * 7, (random() - 0.5) * 0.9, false, 0.55 + random() * 0.25);
      for (let i = 0; i < Math.round(wide * 1.2 * amount); i++) hand(c, random() * W, H * (0.3 + random() * 0.4), 36 + random() * 10, (random() - 0.5) * 0.6, true, 0.36 + random() * 0.16);
      if (hero) { const x = W * (0.16 + random() * 0.1); hand(c, x, H * 0.72, 20, -0.1, false, 0.8); hand(c, x + 5, H * 0.69, 42, 0.1, true, 0.36); }
    }
    if (kind === 'fog') {
      for (let i = 0; i < Math.round(wide * 0.7 * amount) + 1; i++) {
        const x = W * (hero ? (i % 2 ? 0.8 : 0.14) + random() * 0.08 : random()), y = H * (0.55 + random() * 0.25), r = 50 + random() * 40;
        const g = c.createRadialGradient(x, y, 4, x, y, r);
        g.addColorStop(0, 'rgba(240,246,244,0.75)'); g.addColorStop(1, 'rgba(240,246,244,0)');
        c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
        c.fillStyle = 'rgba(120,140,135,0.5)'; c.beginPath(); c.ellipse(x, y, 9, 7, 0, 0, 7); c.fill();
        c.strokeStyle = 'rgba(90,110,105,0.6)'; c.lineWidth = 4; c.beginPath(); c.arc(x + r * 0.4, y - r * 0.2, 12, 0, 7); c.stroke();
      }
    }
    if (kind === 'crack') {
      const x = W * (hero ? 0.84 : 0.5) + (random() - 0.5) * 30, y = H * (0.45 + random() * 0.2);
      c.strokeStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 13; i++) {
        const ang = random() * Math.PI * 2, len = 40 + random() * 110 * amount;
        c.lineWidth = 1 + random() * 1.6; c.beginPath(); c.moveTo(x, y);
        c.lineTo(x + Math.cos(ang) * len * 0.5 + (random() - 0.5) * 14, y + Math.sin(ang) * len * 0.5 + (random() - 0.5) * 14);
        c.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); c.stroke();
      }
      for (const r of [16, 34, 58]) { c.lineWidth = 1; c.beginPath(); c.arc(x, y, r, random() * 3, random() * 3 + 3.5); c.stroke(); }
      c.fillStyle = 'rgba(196,160,96,0.92)';
      for (const rot of [0.6, -0.5]) { c.save(); c.translate(x, y); c.rotate(rot); c.fillRect(-70, -9, 140, 18); c.restore(); }
    }
    if (kind === 'notices') {
      for (let i = 0; i < Math.round(wide * 0.5) + 1; i++) {
        const x = W * (hero ? (i % 2 ? 0.9 : 0.07) + random() * 0.04 : 0.3 + random() * 0.4), y = H * (0.42 + random() * 0.2);
        c.fillStyle = '#f4f1e4'; c.fillRect(x - 24, y - 24, 48, 48);
        c.strokeStyle = '#d2222a'; c.lineWidth = 6; c.beginPath(); c.arc(x, y, 17, 0, 7); c.moveTo(x - 12, y - 12); c.lineTo(x + 12, y + 12); c.stroke();
        c.fillStyle = '#2a2a2a'; c.fillRect(x - 5, y - 8, 10, 14);
        c.fillStyle = '#f0d64a'; c.fillRect(x - 34, y + 34, 68, 22);
        c.fillStyle = '#2a2a2a'; for (let k = 0; k < 2; k++) c.fillRect(x - 28, y + 39 + k * 8, 56, 3);
      }
    }
  });
}

const SIGNS = {
  apes: 'GREAT APES', primates: 'PRIMATE HOUSE', monkeys: 'MONKEY HOUSE', tap: 'PLEASE DO NOT TAP ON THE GLASS', closed: 'EXHIBIT CLOSED', cousins: 'OUR CLOSEST RELATIVES',
} as const;

export default defineWorld({
  questions: {
    era: choice('What is the building finished in?', {
      cream: 'Cream glazed brick-bond tile with bottle-green trim: a 1930s municipal zoo.',
      oxblood: 'Oxblood tile to waist height, ivory above, quarry-tile floor: Victorian and heavy.',
      sixties: 'Pale blue square tile, mustard trim and speckled terrazzo: optimistic 1960s.',
      brutal: 'Raw board-marked concrete with an orange stripe and studded rubber floor: 1970s.',
    }),
    mural: choice('What is painted on the back wall of the enclosure?', {
      jungle: 'A flat painted jungle of palm fronds, vines and a few red flowers.',
      mountains: 'Misty blue volcano ridges stepping into the distance.',
      savanna: 'A yellow savanna with flat-topped acacias and a pale sun.',
      bare: 'Nothing: institutional green below a painted line, cream above.',
    }),
    furnishing: choice('What have the animals been given inside the enclosure?', {
      ropes: 'Thick ropes slung from a pipe frame and a tyre hanging on chains.',
      tree: 'A dead, barkless tree bolted to the floor, polished by hands.',
      bare: 'Nothing but concrete ledges, a drain and one steel bowl.',
      modern: 'Fire-hose hammock, a blue barrel, cardboard boxes and burlap: keepers trying.',
    }),
    hour: choice('What time is it in the house?', {
      feeding: 'Feeding time: the keeper hatch open, fruit and greens scattered across the ledges, a bucket left out.',
      schooltrip: 'A school trip has just been through: worksheets on the floor, a row of little backpacks, a balloon tied to the rail.',
      midday: 'A slow weekday midday: nobody, nothing happening, time passing.',
      closing: 'Closing time: globe lamps on, a mop bucket and a wet-floor sign, the hatch shut for the night.',
    }),
    glass: choice('If the glass is marked, by what?', {
      handprints: 'Handprints: small child palms low down, long-fingered ape prints higher up.',
      fog: 'Patches of breath fog with a nose smudge in the middle of each.',
      crack: 'A star-shaped crack held with crossed parcel tape.',
      notices: 'Do-not-tap stickers and small yellow notices.',
      spotless: 'Nothing: polished clean this morning.',
    }),
    neighbours: choice('What is in the bays on either side?', {
      occupied: 'Another animal sits on a ledge with its back to the glass.',
      empty: 'Empty enclosures with the lights on.',
      boarded: 'One is boarded with plywood and a closure notice.',
    }),
    sign: choice('What does the lettering over the bay say?', SIGNS),
  },

  build(a, context) {
    const { mood, random } = context;
    const closing = a.hour === 'closing';
    const gloom = clamp01(0.5 - mood.cheer * 0.5 + Math.max(0, mood.daylight - 0.65) * 1.2 + (closing ? 0.3 : 0));
    const pal = {
      cream: { tile: '#e9e2c6', grout: '#b9b199', trim: '#2f5d47', dado: undefined, floorA: '#cbbf9f', floorB: '#7f7862', style: 'checker' as const },
      oxblood: { tile: '#ebe3d1', grout: '#a59b88', trim: '#7a2a25', dado: '#7a2a25', floorA: '#a8644c', floorB: '#8a4c3a', style: 'checker' as const },
      sixties: { tile: '#bfd9de', grout: '#e9eeea', trim: '#dfae36', dado: undefined, floorA: '#d2ccbd', floorB: '#5f6a70', style: 'terrazzo' as const },
      brutal: { tile: '#b5b0a4', grout: '#8f8a7f', trim: '#c2552c', dado: undefined, floorA: '#6f6c66', floorB: '#7d7a73', style: 'stud' as const },
    }[a.era];
    const background = new THREE.Color('#dfe1d4').lerp(new THREE.Color('#8e94a2'), gloom * 0.8);
    const SLOTS = [
      { x: 0, z: -2.5, y: 0.85, k: 1 }, // hero, on the dais behind the glass
      { x: -2.9, z: 1.6, y: 0, k: 0.72 },
      { x: 3.0, z: 1.3, y: 0, k: 0.72 },
      { x: -4.15, z: -2.9, y: 1.25, k: 0.7 }, // platform in the left bay
      { x: 4.15, z: -2.5, y: 0.55, k: 0.7 },
      { x: 0.3, z: 2.9, y: 0, k: 0.5 },
    ];
    const { art: s, world } = diorama(context, {
      background: `#${background.getHexString()}`, floor: pal.floorA, width: 10.6, depth: 8.6, maxHeight: 2.4, radius: 1.2, pitch: 22, yaw: 21,
      slots: SLOTS.map((slot) => [slot.x, slot.z] as const),
    });
    if (world.keyLight) world.keyLight.intensity *= 1 - gloom * 0.45;

    const EF = 0.55, GZ = -0.9, GH = 3.6, TOP = 4.3, BACK = -4.2;
    const boards = a.era === 'brutal';
    const tex = (cols: number, rows: number, rx: number, ry: number) => {
      const t = wallTexture(pal.tile, pal.grout, cols, rows, mood.wear, random, boards, pal.dado);
      t.wrapS = THREE.RepeatWrapping; t.repeat.set(rx, ry);
      return new THREE.MeshStandardMaterial({ map: t, roughness: boards ? 0.9 : 0.28 + mood.wear * 0.4 });
    };
    const tilePlain = s.material(pal.tile, { roughness: boards ? 0.9 : 0.35 });
    const trim = s.material(pal.trim, { roughness: 0.45 });
    const concrete = s.material('#a39c8c', { roughness: 0.95 });
    const concreteDark = s.material('#7f786b', { roughness: 0.95 });
    const steel = s.material('#7c8587', { metalness: 0.6, roughness: 0.4 });
    const brass = s.material('#c79a3e', { metalness: 0.85, roughness: mix(0.22, 0.5, mood.wear) });
    const flat = (w: number, h: number, at: [number, number, number], material: THREE.Material, ry = 0) => {
      const mesh = s.mesh(new THREE.PlaneGeometry(w, h), material, at);
      mesh.rotation.y = ry;
      return mesh;
    };

    // Visitor floor finish.
    const floorMap = floorTexture(pal.style, pal.floorA, pal.floorB, mood.wear, random);
    floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping; floorMap.repeat.set(10.6, 5.2);
    const floor = s.mesh(new THREE.PlaneGeometry(10.6, 5.2), new THREE.MeshStandardMaterial({ map: floorMap, roughness: mix(0.35, 0.8, mood.wear) }), [0, 0.004, 1.7]);
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false;

    // Shell: back wall, left end wall, raised enclosure floor with its tiled knee wall.
    s.box([10.6, TOP, 0.2], [0, TOP / 2, BACK - 0.05], concrete);
    s.box([0.2, TOP, 8.6], [-5.3, TOP / 2, 0], tilePlain);
    flat(5.1, TOP, [-5.19, TOP / 2, 1.7], tex(6, 10, 2, 1), Math.PI / 2);
    s.box([10.6, EF, 3.25], [0, EF / 2, (BACK + GZ) / 2 + 0.05], concrete);
    flat(10.6, EF, [0, EF / 2, GZ + 0.085], tex(6, 2, 4, 1));
    s.box([10.6, 0.07, 0.24], [0, EF + 0.035, GZ + 0.02], trim);
    // Header over the glass with the lettering, and piers between bays.
    s.box([10.6, TOP - GH, 0.5], [0, (TOP + GH) / 2, GZ], tilePlain);
    flat(10.6, TOP - GH, [0, (TOP + GH) / 2, GZ + 0.255], tex(9, 3, 3, 1));
    s.box([10.6, 0.08, 0.56], [0, GH + 0.04, GZ], trim);
    s.box([10.6, 0.1, 0.6], [0, TOP + 0.05, GZ], trim);
    const sign = s.label(SIGNS[a.sign], a.sign === 'tap' ? 5.0 : 4.4, 0.52, [0, (TOP + GH) / 2 + 0.02, GZ + 0.27], a.sign === 'closed' ? '#f4efe0' : pal.trim, a.sign === 'closed' ? '#8a2a25' : '#f1ead6');
    sign.castShadow = false;
    const lampMat = new THREE.MeshStandardMaterial({ color: '#fff6da', emissive: new THREE.Color().setHSL(mix(0.14, 0.09, mood.warmth), 0.8, 0.7), emissiveIntensity: mix(0.25, 1.9, gloom), roughness: 0.3 });
    for (const x of [-2.85, 2.85]) {
      s.box([0.5, TOP, 0.5], [x, TOP / 2, GZ], tilePlain);
      flat(0.5, TOP, [x, TOP / 2, GZ + 0.255], tex(2, 12, 1, 1));
      s.box([0.56, 0.3, 0.56], [x, 0.15, GZ], trim);
      // Globe lamp on a bracket.
      s.rod([x, 2.95, GZ + 0.25], [x, 2.95, GZ + 0.5], 0.018, brass);
      s.ball([0.15, 0.15, 0.15], [x, 2.86, GZ + 0.5], lampMat, 16).castShadow = false;
      s.box([0.18, GH - EF, BACK - GZ + 0.3].map(Math.abs) as [number, number, number], [x, (GH + EF) / 2, (BACK + GZ) / 2 - 0.1], concreteDark);
    }

    // Murals and glazing, bay by bay.
    const muralMat = new THREE.MeshStandardMaterial({ map: muralTexture(a.mural, mood.wear, mood.cheer, random), roughness: 0.9 });
    const bays = [{ x: -4.15, w: 2.1, hero: false }, { x: 0, w: 5.2, hero: true }, { x: 4.2, w: 2.2, hero: false }];
    const glassMat = new THREE.MeshStandardMaterial({ color: '#8fb5a8', transparent: true, opacity: 0.07 + mood.wear * 0.04, roughness: 0.05, depthWrite: false });
    for (const bay of bays) {
      flat(bay.w + 0.3, GH - EF, [bay.x, (GH + EF) / 2, BACK + 0.06], muralMat).castShadow = false;
      const gh = GH - EF - 0.07, gy = EF + 0.07 + gh / 2;
      const pane = flat(bay.w, gh, [bay.x, gy, GZ], glassMat);
      pane.castShadow = pane.receiveShadow = false;
      const marks = flat(bay.w, gh, [bay.x, gy, GZ + 0.012], new THREE.MeshStandardMaterial({ map: glassTexture(a.glass, bay.w, mood.wear, random, bay.hero), transparent: true, depthWrite: false, roughness: 0.4 }));
      marks.castShadow = marks.receiveShadow = false;
      s.box([bay.w, 0.05, 0.07], [bay.x, GH - 0.025, GZ], steel);
      s.box([bay.w, 0.05, 0.07], [bay.x, EF + 0.095, GZ], steel);
      if (bay.hero) for (const x of [-1.75, 1.75]) s.box([0.05, gh, 0.07], [x, gy, GZ], steel);
    }

    // Inside: concrete ledges. The hero stands on the dais, others on the side platforms.
    s.box([3.0, 0.3, 2.3], [0, EF + 0.15, -2.5], concreteDark);
    s.box([5.1, 0.7, 0.55], [0, EF + 0.35, BACK + 0.35], concrete);
    s.box([1.9, 0.16, 0.7], [-1.6, 2.15, BACK + 0.4], concrete);
    s.box([0.16, 0.9, 0.5], [-1.0, 1.65, BACK + 0.3], concreteDark);
    s.box([2.1, 0.7, 2.0], [-4.15, EF + 0.35, -2.9], concreteDark);
    s.box([2.2, 0.7, 0.6], [4.2, EF + 0.35, BACK + 0.38], concrete);
    // Keeper hatch in the back wall and a floor drain.
    const feeding = a.hour === 'feeding';
    s.box([0.95, 1.25, 0.05], [1.9, EF + 0.7 + 0.63, BACK + 0.09], s.material('#191817'));
    s.box([0.95, 1.25, 0.05], [feeding ? 1.05 : 1.9, EF + 0.7 + 0.63, BACK + 0.13], steel);
    s.box([1.9, 0.05, 0.08], [1.5, EF + 0.7 + 1.3, BACK + 0.13], steel);
    s.cylinder(0.14, 0.14, 0.012, [2.1, EF + 0.006, -1.5], s.material('#3a3835', { metalness: 0.5 }), 14);

    // Enrichment, by kind and by how full the scene is.
    const swingers: { node: THREE.Object3D; phase: number; amp: number }[] = [];
    const rope = s.material('#b89b62', { roughness: 0.95 });
    const hang = (x: number, z: number, top: number) => { const g = new THREE.Group(); g.position.set(x, top, z); s.root.add(g); return g; };
    if (a.furnishing === 'ropes' || a.furnishing === 'modern') {
      for (const x of [-2.45, 2.45]) s.rod([x, EF, BACK + 0.75], [x, 3.2, BACK + 0.75], 0.04, steel);
      s.rod([-2.45, 3.2, BACK + 0.75], [2.45, 3.2, BACK + 0.75], 0.04, steel);
    }
    if (a.furnishing === 'ropes') {
      s.tube([[-2.45, 3.15, BACK + 0.75], [-1, 2.55, BACK + 0.7], [1, 2.45, BACK + 0.7], [2.45, 3.0, BACK + 0.75]], 0.05, rope);
      if (mood.density > 0.3) s.tube([[-2.45, 2.2, BACK + 0.75], [-2.35, 1.5, -2.6], [-2.45, 2.6, -1.3]], 0.045, rope);
      const tyre = hang(1.4, BACK + 0.75, 3.2);
      for (const dx of [-0.2, 0.2]) tyre.add(s.rod([dx * 0.3, 0, 0], [dx, -1.15, 0], 0.012, steel));
      const ring = s.ring(0.3, 0.11, [0, -1.42, 0], s.material('#1f1f20', { roughness: 0.9 }));
      tyre.add(ring);
      swingers.push({ node: tyre, phase: random() * 6, amp: 0.2 });
      if (mood.density > 0.5) {
        const knot = hang(-2.0, BACK + 0.75, 3.2);
        knot.add(s.rod([0, 0, 0], [0, -1.5, 0], 0.035, rope));
        knot.add(s.ball([0.08, 0.1, 0.08], [0, -1.55, 0], rope, 10));
        swingers.push({ node: knot, phase: random() * 6, amp: 0.14 });
      }
    }
    if (a.furnishing === 'tree') {
      const wood = s.material('#b9a88a', { roughness: 0.55 });
      s.tube([[-2.1, EF, -3.3], [-2.0, 1.6, -3.4], [-1.6, 2.5, -3.6], [-1.1, 3.4, -3.7]], 0.13, wood);
      s.rod([-1.9, 1.9, -3.45], [-2.5, 3.1, -2.5], 0.07, wood, 0.035);
      s.rod([-1.6, 2.5, -3.6], [0.2, 3.0, BACK + 0.5], 0.065, wood, 0.03);
      if (mood.density > 0.4) s.tube([[2.45, EF + 0.1, -1.5], [2.1, 1.5, -2.6], [2.3, 2.9, -3.7]], 0.09, wood);
      for (const [x, z] of [[-2.32, -3.1], [-1.88, -3.1], [-2.1, -3.52]] as const) s.cylinder(0.025, 0.025, 0.05, [x, EF + 0.025, z], steel, 6);
    }
    if (a.furnishing === 'bare') {
      s.lathe([[0.0, 0], [0.16, 0], [0.19, 0.07], [0.17, 0.07], [0.15, 0.015], [0, 0.015]], steel, [-2.0, EF, -1.7]);
    }
    if (a.furnishing === 'modern') {
      const hose = s.material('#c9b27a', { roughness: 0.9 });
      const red = s.material('#b3382c', { roughness: 0.9 });
      for (let i = 0; i < 6; i++) {
        const z = BACK + 0.45 + i * 0.13;
        s.tube([[-2.45, 2.9, z], [-1.9, 2.2 - (i % 2) * 0.02, z], [-1.0, 2.25, z], [-0.4, 3.15, BACK + 0.75]], 0.035, i % 3 === 2 ? red : hose);
      }
      s.cylinder(0.3, 0.3, 0.9, [2.05, EF + 0.3, -3.2], s.material('#2f66b0', { roughness: 0.5 }), 20).rotation.z = Math.PI / 2;
      const card = s.material('#b58a55', { roughness: 0.95 });
      for (let i = 0; i < Math.round(1 + mood.density * 3); i++) s.box([0.45 + random() * 0.2, 0.3 + random() * 0.2, 0.4], [-2.3 + random() * 0.5, EF + 0.2 + (i > 1 ? 0.35 : 0), -1.6 - i * 0.5], card).rotation.y = random();
      s.ball([0.34, 0.12, 0.26], [2.2, EF + 0.1, -1.7], s.material('#a48a5c', { roughness: 1 }), 12);
    }
    // Straw bedding, more of it the fuller and the more looked-after the place is.
    const strawCount = Math.round(mood.density * 420 * (a.furnishing === 'bare' ? 0.12 : 1));
    if (strawCount > 0) {
      const straw = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.012, 0.016), new THREE.MeshStandardMaterial({ color: '#d9bf6a', roughness: 0.9 }), strawCount);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < strawCount; i++) {
        const corner = random() < 0.6;
        const x = corner ? (random() < 0.5 ? -1 : 1) * (1.6 + random() * 0.85) : (random() - 0.5) * 5;
        const z = corner ? -1.3 - random() * 2.3 : -1.25 - random() * 0.3;
        e.set((random() - 0.5) * 0.5, random() * Math.PI, (random() - 0.5) * 0.5);
        m.compose(new THREE.Vector3(x, EF + 0.02 + random() * 0.06, z), q.setFromEuler(e), new THREE.Vector3(0.6 + random(), 1, 1));
        straw.setMatrixAt(i, m);
      }
      straw.castShadow = straw.receiveShadow = true;
      s.root.add(straw);
    }
    if (feeding) {
      const n = Math.round(10 + mood.density * 26);
      const fruit = ['#f08a1c', '#f2c21d', '#d93a2e', '#7fb23a', '#a9d15a'];
      s.scatter(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.5 }), Array.from({ length: n }, (_u, i) => {
        const onLedge = i % 3 === 0;
        const x = (random() - 0.5) * 4.8, z = onLedge ? BACK + 0.2 + random() * 0.4 : (Math.abs(x) < 1.55 ? -1.3 + random() * 0.15 : -1.3 - random() * 2.2);
        const size = 0.05 + random() * 0.04;
        return { at: [x, (onLedge ? EF + 0.7 : EF) + size, z] as [number, number, number], size, color: fruit[i % fruit.length] };
      }));
      s.cylinder(0.17, 0.13, 0.3, [-0.5, EF + 0.85, BACK + 0.4], s.material('#d8d6cf', { metalness: 0.5, roughness: 0.4 }), 16);
      s.ring(0.16, 0.008, [-0.5, EF + 1.06, BACK + 0.4], steel, Math.PI).rotation.y = 0.5;
    }

    // Side bays.
    if (a.neighbours === 'occupied') {
      const dark = s.material('#211d1c', { roughness: 0.95 });
      const g = new THREE.Group();
      g.position.set(4.55, EF + 0.7, BACK + 0.42);
      g.rotation.y = Math.PI + (random() - 0.5) * 0.6;
      s.root.add(g);
      g.add(s.ball([0.36, 0.44, 0.3], [0, 0.4, 0], dark, 16), s.ball([0.19, 0.2, 0.2], [0, 0.9, 0.1], dark, 14));
      for (const side of [-1, 1]) g.add(s.tube([[side * 0.3, 0.7, 0], [side * 0.42, 0.3, 0.12], [side * 0.3, 0.05, 0.3]], 0.09, dark));
    }
    if (a.neighbours === 'boarded') {
      const ply = new THREE.MeshStandardMaterial({ map: paint(128, 256, (c) => { c.fillStyle = '#c9a66d'; c.fillRect(0, 0, 128, 256); c.strokeStyle = 'rgba(120,85,40,0.5)'; for (let i = 0; i < 26; i++) { c.beginPath(); c.moveTo(0, i * 10 + random() * 8); c.bezierCurveTo(40, i * 10 + random() * 20, 90, i * 10 - random() * 20, 128, i * 10 + random() * 8); c.stroke(); } }), roughness: 0.9 });
      s.box([1.05, 2.44, 0.03], [-4.68, EF + 0.1 + 1.22, GZ + 0.06], ply);
      s.box([1.05, 2.44, 0.03], [-3.66, EF + 0.1 + 1.22, GZ + 0.11], ply).rotation.z = 0.03;
      const note = s.label('CLOSED FOR REPAIRS', 0.9, 0.3, [-4.15, 1.9, GZ + 0.135], '#2a2a2a', '#f3ecd2');
      note.rotation.z = -0.04;
    }

    // The public side: brass rail, bench, bin, and whatever the hour left behind.
    const RZ = 0.05;
    s.rod([-5.1, 0.98, RZ], [5.2, 0.98, RZ], 0.034, brass);
    s.rod([-5.1, 0.52, RZ], [5.2, 0.52, RZ], 0.018, brass);
    for (let x = -5.1; x <= 5.21; x += 1.7166) { s.rod([x, 0, RZ], [x, 0.98, RZ], 0.024, brass); s.cylinder(0.06, 0.07, 0.03, [x, 0.015, RZ], brass, 12); s.ball([0.045, 0.045, 0.045], [x, 0.98, RZ], brass, 10); }
    const timber = s.material('#7a5536', { roughness: 0.6 });
    const iron = s.material('#2a2c2b', { roughness: 0.6, metalness: 0.4 });
    for (let i = 0; i < 4; i++) s.box([1.9, 0.04, 0.1], [3.9, 0.46, 3.3 + i * 0.125], timber);
    for (const x of [3.15, 4.65]) { s.box([0.06, 0.44, 0.5], [x, 0.22, 3.49], iron); }
    s.cylinder(0.2, 0.17, 0.62, [-4.75, 0.31, 0.75], s.material(pal.trim, { roughness: 0.5, metalness: 0.3 }), 16);
    s.cylinder(0.21, 0.21, 0.03, [-4.75, 0.635, 0.75], iron, 16);

    const litter = Math.round(mood.wear * mood.density * 14);
    const scraps: { at: [number, number, number]; size: number; color: string }[] = [];
    for (let i = 0; i < litter; i++) scraps.push({ at: [(random() - 0.5) * 9.8, 0.02, 0.5 + random() * 3.6], size: 0.035 + random() * 0.04, color: ['#e9e2cc', '#d9523a', '#e8c53a', '#7fa9c9'][i % 4] });
    if (scraps.length) s.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), scraps);

    let balloon: THREE.Group | null = null;
    if (a.hour === 'schooltrip') {
      const paper = s.material('#f4f1e6', { roughness: 0.9 });
      for (let i = 0; i < Math.round(5 + mood.density * 9); i++) {
        const sheet = s.box([0.21, 0.004, 0.3], [(random() - 0.5) * 9.4, 0.012, 0.4 + random() * 3.6], paper);
        sheet.rotation.y = random() * Math.PI;
        sheet.castShadow = false;
      }
      const packs = ['#d8402f', '#2f66b0', '#e8b92e', '#3f9a5a', '#c04a9a', '#e07a2a'];
      for (let i = 0; i < Math.round(3 + mood.density * 4); i++) {
        const z = 1.4 + i * 0.42, colour = packs[Math.floor(random() * packs.length)];
        const pack = s.ball([0.15, 0.2, 0.11], [-5.0, 0.19, z], s.material(colour, { roughness: 0.7 }), 12);
        pack.rotation.y = (random() - 0.5) * 0.6;
        s.box([0.16, 0.1, 0.05], [-4.88, 0.13, z], s.material(colour, { roughness: 0.6 })).rotation.y = pack.rotation.y;
      }
      balloon = new THREE.Group();
      balloon.position.set(1.4 + random() * 1.0, 0.98, RZ);
      s.root.add(balloon);
      const colour = ['#e23b2e', '#f2c21d', '#2f8fd0'][Math.floor(random() * 3)];
      balloon.add(s.rod([0, 0, 0], [0.1, 1.15, 0.05], 0.004, s.material('#f4f1e6')));
      balloon.add(s.ball([0.19, 0.24, 0.19], [0.1, 1.38, 0.05], s.material(colour, { roughness: 0.2, emissive: colour, emissiveIntensity: 0.15 }), 16));
    }
    if (closing) {
      const yellow = s.material('#f0c62a', { roughness: 0.5 });
      s.cylinder(0.19, 0.16, 0.3, [-4.2, 0.15, 3.3], yellow, 16);
      s.rod([-4.2, 0.1, 3.3], [-3.8, 1.3, 3.0], 0.016, timber);
      s.ball([0.14, 0.05, 0.1], [-4.2, 0.3, 3.3], s.material('#c9c5b6', { roughness: 1 }), 10);
      for (const side of [-1, 1]) { const board = s.box([0.3, 0.6, 0.02], [-3.1, 0.29, 3.6 + side * 0.09], yellow); board.rotation.x = side * -0.3; }
      const wet = s.mesh(new THREE.CircleGeometry(0.9, 24), new THREE.MeshStandardMaterial({ color: '#3a4046', transparent: true, opacity: 0.3, roughness: 0.02, depthWrite: false }), [-3.6, 0.012, 3.0]);
      wet.rotation.x = -Math.PI / 2;
      wet.scale.set(1.5, 1, 1);
      wet.castShadow = false;
    }
    if (a.hour === 'midday' && mood.density > 0.45) {
      // Somebody's forgotten cardigan on the bench.
      s.ball([0.3, 0.05, 0.16], [3.7, 0.5, 3.5], s.material('#8a4a5a', { roughness: 1 }), 10).rotation.y = 0.3;
    }

    const place = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      place(items);
      items.forEach((item, index) => {
        const slot = SLOTS[index % SLOTS.length];
        item.holder.scale.multiplyScalar(slot.k);
        item.holder.position.y = slot.y;
        item.holder.updateMatrixWorld(true);
      });
    };
    let t0 = 0;
    const energy = mix(0.15, 1.6, mood.energy);
    world.update = (dt: number) => {
      t0 += dt;
      for (const sw of swingers) sw.node.rotation.z = Math.sin(t0 * 1.4 + sw.phase) * sw.amp * energy;
      if (balloon) balloon.rotation.z = Math.sin(t0 * 0.9) * 0.08 * energy;
    };
    return world;
  },
});
