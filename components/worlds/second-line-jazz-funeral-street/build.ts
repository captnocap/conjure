import * as THREE from 'three';
import { choice, defineWorld, diorama, figure, mix } from '@conjure/kit';
import { clapboard, instances, louvres, paint, part, rodIn, taperTube, type Instance, type P } from './set';

// The block in metres: the street runs along x, the camera looks from the +z side.
const W = 16, D = 11.6;
const BACK = -2.3, FRONT = 2.5; // the two kerb lines
const KERB = 0.16; // sidewalk height
const WALK_BACK = -3.8, WALK_FRONT = 3.9; // outer edges of the two sidewalks
const PORCH = -3.9; // front edge of the back row's porches
const FLOOR = 0.8; // porch floor, the houses are raised on piers
const FACADE = -5.5; // house fronts behind the porches
const WALL = 3.4; // wall height above the porch floor
const REAR = -8.6; // where the houses end; the sky shows past the ridges
const MID = (BACK + FRONT) / 2, HALF = (FRONT - BACK) / 2;
/** The asphalt is crowned: highest down the middle, falling to the gutters. */
const crown = (z: number) => 0.012 + 0.07 * Math.cos(Math.max(-1, Math.min(1, (z - MID) / HALF)) * Math.PI / 2);

const PALETTES = {
  pastel: { walls: ['#bfe3cf', '#f2c6cf', '#d6c8ea', '#f4e3a1', '#bcd8ec'], shutters: ['#3f6f5c', '#35607e', '#7a4458', '#5a6a3e', '#2f4f4f'], trim: '#f6f3ea' },
  tropical: { walls: ['#2fb5ad', '#f0775f', '#f6b23a', '#8a64d8', '#46b86c'], shutters: ['#f3efe6', '#1f4f7a', '#c42a4a', '#2a2a30', '#e8c62a'], trim: '#f6f3ea' },
  faded: { walls: ['#cfc8b8', '#b9c2b8', '#d8cfc0', '#c2bbb0', '#cbbfae'], shutters: ['#6a7a70', '#7a7466', '#5a6670', '#857a6a'], trim: '#e2ddd0' },
  mixed: { walls: ['#f0775f', '#dcd8cc', '#bcd8ec'], shutters: ['#f3efe6', '#8a8478', '#35607e'], trim: '#f6f3ea' },
} as const;

export default defineWorld({
  questions: {
    moment: choice('Where is the funeral right now?', {
      dirge: 'The dirge: the hearse open at the curb, the casket sliding out under flowers, the church doors open, the street hushed and waiting.',
      cutloose: 'The body cut loose: the hearse shut, the church emptied, confetti, streamers and parasols, the whole block dancing.',
      gathering: 'Before it starts: folding chairs set out, the banner propped up, neighbours drifting onto porches in their whites.',
      after: 'After it has passed: cups and petals everywhere, a chair tipped over, the banner left leaning, one or two people left.',
    }),
    houses: choice('What colour are the shotgun houses?', {
      pastel: 'Soft pastels, mint, pink, lavender and butter yellow, with white trim and dark louvred shutters.',
      tropical: 'Loud Caribbean colours, turquoise, coral and mango, shutters in contrasting paint.',
      faded: 'Faded and chalky, paint peeling to grey wood, one window boarded with plywood.',
      mixed: 'A mixed row: one coral with a ladder against it, one in bare grey primer, one fresh baby blue.',
    }),
    overhang: choice('What hangs over the street?', {
      moss: 'Great live oak limbs dripping grey Spanish moss.',
      beads: 'Live oak limbs tangled with years of carnival beads in purple, gold and green.',
      myrtle: 'Crepe myrtles in pink bloom, lighter and lower.',
      wires: 'No trees: leaning utility poles and sagging wires, a pair of sneakers hanging by the laces.',
    }),
    hearse: choice('What hearse waits at the curb?', {
      modern: 'A long black limousine hearse with chrome landau bars and curtained windows.',
      vintage: 'A vintage hearse with tail fins, whitewall tyres and a lot of chrome.',
      pearl: 'A pearl-white hearse with gold trim, for someone who went too young.',
    }),
    banner: choice('What does the banner on the poles say?', {
      memorial: 'IN LOVING MEMORY over a painted portrait oval and doves.',
      club: 'A satin social aid and pleasure club banner, the club name in gold, fringed.',
      band: 'A brass band banner, the band name round a painted trumpet.',
      choir: 'A church choir banner with a dove and a cross.',
    }),
    door: choice('What marks the church door?', {
      wreath: 'A wreath of white carnations on the door, a purple ribbon across it.',
      roses: 'A wreath of red roses on the door.',
      bunting: 'Black and purple mourning bunting swagged over the doorway.',
      portrait: 'A framed portrait on an easel by the steps, with a spray of lilies.',
    }),
    porch: choice('What is set out on the porches?', {
      chairs: 'Folding chairs and a red cooler, settled in for the day.',
      food: 'A table of foil pans on the porch and a barbecue grill smoking on the sidewalk.',
      rockers: 'Rocking chairs and hanging ferns.',
      bare: 'Bare porches, shutters closed, a For Sale sign on one.',
    }),
    street: choice('What is the street like?', {
      patched: 'Patched asphalt with black tar seams.',
      potholed: 'Potholed, old brick showing through the holes.',
      wet: 'Wet from a passing shower, puddles holding the sky.',
      brick: 'Old red brick paving, uneven and sunk.',
    }),
    litter: choice('What lies scattered underfoot?', {
      petals: 'Rose petals, go-cups and their lids.',
      confetti: 'Confetti and broken carnival beads.',
      programmes: 'Funeral programmes and palm fronds.',
      leaves: 'Only oak leaves; somebody swept.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const cutloose = a.moment === 'cutloose', dirge = a.moment === 'dirge', after = a.moment === 'after', gathering = a.moment === 'gathering';
    const grey = new THREE.Color('#a8a49a');
    const tone = (hex: string, extra = 0) => `#${new THREE.Color(hex).lerp(grey, Math.min(0.7, (1 - mood.cheer) * 0.28 + mood.wear * 0.1 + extra)).getHexString()}`;

    // The hero stands on the crown of the asphalt; the band strings out behind the hearse.
    const slots: [number, number, number, number][] = [
      [0.4, 0.3, crown(0.3), 1],
      [2.8, -1.0, crown(-1.0), 1],
      [-1.7, 1.3, crown(1.3), 1],
      [5.0, 1.1, crown(1.1), 1],
      [-3.8, 1.5, crown(1.5), 1],
    ];
    const sky = new THREE.Color('#dce4e6').lerp(new THREE.Color('#f0dcc0'), mood.warmth * 0.7).lerp(new THREE.Color('#e6cbc0'), Math.abs(mood.daylight - 0.5) * 0.8);
    const { art: s, world } = diorama(context, {
      background: `#${sky.getHexString()}`, floor: '#7a7166', width: W, depth: D, maxHeight: 2.0, radius: 1.1, pitch: 30, yaw: 24,
      scale: [0.8, 1.35], slots, viewBox: [[-5.2, 0, -4.6], [5.6, 4.4, 3.2]],
    });
    const root = s.root;
    const motion: ((dt: number, time: number) => void)[] = [];

    // ── The street ────────────────────────────────────────────────────────────────────────
    const streetMap = paint(1024, 320, (c) => {
      if (a.street === 'brick') {
        c.fillStyle = '#6a5048';
        c.fillRect(0, 0, 1024, 320);
        for (let row = 0; row < 320 / 6.4; row++) {
          const offset = (row % 2) * 6.4;
          for (let x = -offset; x < 1024; x += 12.8) {
            const r = 120 + random() * 50, g = 58 + random() * 24, b = 44 + random() * 18;
            c.fillStyle = `rgb(${r},${g},${b})`;
            c.fillRect(x + 0.8, row * 6.4 + 0.8, 11.2, 4.8);
          }
        }
        // Asphalt patches where the bricks were dug up.
        for (let i = 0; i < 3 + mood.wear * 6; i++) { c.fillStyle = '#4a4744'; c.fillRect(random() * 980, random() * 280, 40 + random() * 120, 20 + random() * 50); }
      } else {
        c.fillStyle = a.street === 'wet' ? '#3e3c3b' : '#4c4946';
        c.fillRect(0, 0, 1024, 320);
        for (let i = 0; i < 2600; i++) { const v = 50 + random() * 60; c.fillStyle = `rgba(${v},${v - 2},${v - 5},0.5)`; c.fillRect(random() * 1024, random() * 320, 2, 2); }
        for (let i = 0; i < 5 + mood.wear * 8; i++) {
          c.fillStyle = random() < 0.5 ? '#3a3836' : '#5a5650';
          c.fillRect(random() * 980, random() * 290, 50 + random() * 160, 24 + random() * 60);
        }
        c.strokeStyle = '#1e1d1c';
        c.lineWidth = 3;
        for (let i = 0; i < 10 + mood.wear * 16; i++) {
          let x = random() * 1024, y = random() * 320;
          c.beginPath(); c.moveTo(x, y);
          for (let k = 0; k < 8; k++) { x += (random() - 0.3) * 40; y += (random() - 0.5) * 30; c.lineTo(x, y); }
          c.stroke();
        }
        if (a.street === 'potholed') {
          for (let i = 0; i < 6 + mood.wear * 5; i++) {
            const x = 40 + random() * 940, y = 30 + random() * 260, rx = 18 + random() * 34, ry = 12 + random() * 20;
            c.save();
            c.beginPath(); c.ellipse(x, y, rx, ry, random(), 0, Math.PI * 2);
            c.fillStyle = '#2a2624'; c.fill(); c.clip();
            for (let by = y - ry; by < y + ry; by += 6.4) for (let bx = x - rx - ((by / 6.4) % 2) * 6.4; bx < x + rx; bx += 12.8) {
              c.fillStyle = `rgb(${120 + random() * 40},${58 + random() * 20},${44 + random() * 14})`;
              c.fillRect(bx + 1, by + 1, 11, 4.6);
            }
            c.restore();
            c.strokeStyle = '#222'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.stroke();
          }
        }
        if (a.street === 'wet') {
          for (let i = 0; i < 12; i++) {
            const x = random() * 1024, y = random() < 0.5 ? 8 + random() * 30 : 280 - random() * 30;
            c.fillStyle = `rgba(${Math.round(sky.r * 200)},${Math.round(sky.g * 210)},${Math.round(sky.b * 220)},0.75)`;
            c.beginPath(); c.ellipse(x, y, 30 + random() * 70, 6 + random() * 14, 0, 0, Math.PI * 2); c.fill();
          }
          for (let i = 0; i < 5; i++) {
            c.fillStyle = 'rgba(200,210,220,0.45)';
            c.beginPath(); c.ellipse(100 + random() * 820, 90 + random() * 140, 20 + random() * 50, 6 + random() * 10, 0, 0, Math.PI * 2); c.fill();
          }
        }
      }
      // Gutters: dark along both kerbs.
      const gutter = (y0: number, y1: number) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(25,22,20,0.55)'); g.addColorStop(1, 'rgba(25,22,20,0)'); c.fillStyle = g; c.fillRect(0, Math.min(y0, y1), 1024, Math.abs(y1 - y0)); };
      gutter(0, 22); gutter(320, 298);
    });
    const streetGeometry = new THREE.PlaneGeometry(W, FRONT - BACK, 1, 24);
    streetGeometry.rotateX(-Math.PI / 2);
    streetGeometry.translate(0, 0, MID);
    const sp = streetGeometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < sp.count; i++) sp.setY(i, crown(sp.getZ(i)));
    streetGeometry.computeVertexNormals();
    const wet = a.street === 'wet';
    const street = part(root, streetGeometry, new THREE.MeshStandardMaterial({ map: streetMap, roughness: wet ? 0.22 : 0.93, metalness: wet ? 0.2 : 0 }));
    street.castShadow = false;

    // Sidewalks: concrete slabs, cracked and heaved by the oak roots, granite kerbs.
    const walkMap = paint(1024, 96, (c) => {
      c.fillStyle = '#c3bdb1';
      c.fillRect(0, 0, 1024, 96);
      for (let i = 0; i < 900; i++) { const v = 170 + random() * 50; c.fillStyle = `rgba(${v},${v - 4},${v - 12},0.5)`; c.fillRect(random() * 1024, random() * 96, 2, 2); }
      c.fillStyle = 'rgba(60,55,50,0.45)';
      for (let x = 0; x < 1024; x += 80) c.fillRect(x, 0, 2, 96);
      c.fillRect(0, 47, 1024, 1);
      c.strokeStyle = 'rgba(50,45,40,0.6)';
      c.lineWidth = 1.5;
      for (let i = 0; i < 6 + mood.wear * 14; i++) { let x = random() * 1024, y = random() * 96; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (random() - 0.5) * 40; y += (random() - 0.5) * 30; c.lineTo(x, y); } c.stroke(); }
      for (let i = 0; i < 5 + mood.wear * 10; i++) { c.fillStyle = `rgba(80,70,55,${0.1 + random() * 0.15})`; c.beginPath(); c.ellipse(random() * 1024, random() * 96, 8 + random() * 30, 4 + random() * 10, 0, 0, Math.PI * 2); c.fill(); }
    });
    const walkMaterial = new THREE.MeshStandardMaterial({ map: walkMap, roughness: 0.95 });
    const kerbMaterial = s.material('#a9a59c', { roughness: 0.8 });
    part(root, new THREE.BoxGeometry(W, KERB, BACK - WALK_BACK), walkMaterial, [0, KERB / 2, (BACK + WALK_BACK) / 2]);
    part(root, new THREE.BoxGeometry(W, KERB, WALK_FRONT - FRONT), walkMaterial, [0, KERB / 2, (FRONT + WALK_FRONT) / 2]);
    part(root, new THREE.BoxGeometry(W, KERB + 0.01, 0.16), kerbMaterial, [0, (KERB + 0.01) / 2, BACK - 0.08]);
    part(root, new THREE.BoxGeometry(W, KERB + 0.01, 0.16), kerbMaterial, [0, (KERB + 0.01) / 2, FRONT + 0.08]);

    // Stairs: a stepped profile extruded across their width; `toward` is the way they descend.
    const stairs = (x: number, z: number, width: number, top: number, toward: 1 | -1, material: THREE.Material) => {
      const n = Math.max(2, Math.round((top - KERB) / 0.17)), rise = (top - KERB) / n, run = 0.27, length = n * run;
      const points = [new THREE.Vector2(0, 0), new THREE.Vector2(length, 0)];
      for (let i = 1; i <= n; i++) points.push(new THREE.Vector2(length - (i - 1) * run, i * rise), new THREE.Vector2(length - i * run, i * rise));
      const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(points), { depth: width, bevelEnabled: false });
      geometry.rotateY(toward === 1 ? -Math.PI / 2 : Math.PI / 2);
      return part(root, geometry, material, [x + (toward === 1 ? width / 2 : -width / 2), KERB, z]);
    };

    // ── The shotgun houses ───────────────────────────────────────────────────────────────
    const palette = PALETTES[a.houses];
    const walls = [...palette.walls].sort(() => random() - 0.5);
    const shutters = [...palette.shutters].sort(() => random() - 0.5);
    if (a.houses === 'mixed') { walls.splice(0, walls.length, ...palette.walls); shutters.splice(0, shutters.length, ...palette.shutters); }
    const trimMaterial = s.material(tone(palette.trim), { roughness: 0.7 });
    const plankMap = paint(128, 256, (c) => {
      c.fillStyle = pick(['#7d8a8f', '#8a8f86', '#6f7f8a', '#9a8a72']);
      c.fillRect(0, 0, 128, 256);
      for (let x = 0; x < 128; x += 10) { c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(x, 0, 1.5, 256); }
      for (let i = 0; i < mood.wear * 30; i++) { c.fillStyle = 'rgba(150,140,120,0.5)'; c.fillRect(random() * 128, random() * 256, 4, 8 + random() * 20); }
    });
    const plankMaterial = new THREE.MeshStandardMaterial({ map: plankMap, roughness: 0.85 });
    const pierMaterial = s.material('#5a4840', { roughness: 0.95 });
    const latticeMap = (w: number) => paint(512, 96, (c) => {
      c.fillStyle = '#3a302a';
      c.fillRect(0, 0, 512, 96);
      c.strokeStyle = tone(palette.trim);
      c.lineWidth = 4;
      for (let x = -96; x < 512 + 96; x += 22) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 96, 96); c.stroke(); c.beginPath(); c.moveTo(x + 96, 0); c.lineTo(x, 96); c.stroke(); }
      const pier = 512 * 0.3 / w;
      c.fillStyle = '#8a4a3a';
      for (const x of [0, 512 / 2 - pier / 2, 512 - pier]) { c.fillRect(x, 0, pier, 96); c.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < 96; y += 12) c.fillRect(x, y, pier, 2); c.fillStyle = '#8a4a3a'; }
      c.fillStyle = tone(palette.trim); c.fillRect(0, 0, 512, 8);
    });
    const roofMaterial = (hex: string) => {
      const map = paint(16, 64, (c) => { const g = c.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#b8b8b8'); g.addColorStop(1, '#ffffff'); c.fillStyle = g; c.fillRect(0, 0, 16, 64); });
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(1, 60);
      return s.material(hex, { map, roughness: 0.55, metalness: 0.35 });
    };
    const roofHexes = ['#9aa2a6', '#8a9196', '#5a6a5e', '#7a4a3e', '#6a6e72'];
    const beams: { x0: number; x1: number; y: number }[] = [];

    const houses = [
      { x0: -3.3, w: 3.6, door: 'right' as const },
      { x0: 0.9, w: 3.6, door: 'right' as const },
      { x0: 5.1, w: 3.6, door: 'left' as const },
    ];
    houses.forEach((house, index) => {
      const { x0, w } = house;
      const cx = x0 + w / 2, gable = 1.7;
      const wallHex = tone(walls[index % walls.length], a.houses === 'faded' ? 0.15 : 0);
      const shutterHex = tone(shutters[index % shutters.length]);
      const primer = a.houses === 'mixed' && index === 1;
      const wear = Math.min(1, mood.wear + (a.houses === 'faded' ? 0.45 : 0) + (primer ? 0.25 : 0));
      const siding = clapboard(wallHex, wear, random);
      siding.repeat.set(0.5, 0.5);
      const wallMaterial = new THREE.MeshStandardMaterial({ map: siding, roughness: 0.85 });
      const doorX = house.door === 'right' ? w * 0.72 : w * 0.28, windowX = house.door === 'right' ? w * 0.28 : w * 0.72;
      const openW = 0.95, openH = 2.45;
      const doorOpen = (dirge || cutloose) ? random() < 0.7 : random() < 0.3;
      const doorHex = tone(pick(['#2a2a30', '#7a2a2a', '#1f4f7a', '#2f5a3a', shutterHex]));
      // The front wall is the extrusion's cap: its UVs are metres, so the facade is painted to that scale.
      const facade = paint(512, Math.round(512 * (WALL + gable) / w), (c) => {
        const k = 512 / w, H = c.canvas.height;
        const Y = (m: number) => H - m * k; // metres above the porch floor to canvas rows
        c.fillStyle = wallHex;
        c.fillRect(0, 0, 512, H);
        for (let m = 0; m < WALL + gable; m += 0.125) { c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect(0, Y(m) - 4, 512, 4); }
        for (let i = 0; i < wear * 30; i++) { c.fillStyle = random() < 0.5 ? '#9c9686' : '#b8b2a2'; c.fillRect(random() * 512, Y(random() * WALL), 8 + random() * 50, 6 + random() * 10); }
        const casing = (centre: number, height: number) => { c.fillStyle = tone(palette.trim); c.fillRect((centre - openW / 2 - 0.1) * k, Y(height + 0.12), (openW + 0.2) * k, (height + 0.12) * k); };
        // Door, with a transom light above.
        casing(doorX, openH + 0.45);
        c.fillStyle = '#2a2e34'; c.fillRect((doorX - openW / 2) * k, Y(openH + 0.42), openW * k, 0.36 * k);
        if (doorOpen) {
          c.fillStyle = '#1b1a1c'; c.fillRect((doorX - openW / 2) * k, Y(openH), openW * k, openH * k);
          c.fillStyle = doorHex; c.fillRect((doorX - openW / 2) * k, Y(openH), openW * 0.18 * k, openH * k);
        } else {
          c.fillStyle = doorHex; c.fillRect((doorX - openW / 2) * k, Y(openH), openW * k, openH * k);
          c.fillStyle = 'rgba(0,0,0,0.25)';
          for (const [px, py, pw, ph] of [[0.12, 0.2, 0.3, 0.9], [0.53, 0.2, 0.3, 0.9], [0.12, 1.3, 0.3, 0.95], [0.53, 1.3, 0.3, 0.95]]) c.fillRect((doorX - openW / 2 + px) * k, Y(py + ph), pw * k, ph * k);
          c.fillStyle = '#d9b23a'; c.beginPath(); c.arc((doorX + openW * 0.38) * k, Y(1.05), 5, 0, Math.PI * 2); c.fill();
        }
        // The tall front window, six over six.
        casing(windowX, openH);
        c.fillStyle = '#34404a'; c.fillRect((windowX - openW / 2) * k, Y(openH - 0.05), openW * k, (openH - 0.15) * k);
        c.fillStyle = 'rgba(190,210,225,0.35)'; c.fillRect((windowX - openW / 2 + 0.05) * k, Y(openH - 0.1), openW * 0.4 * k, (openH - 0.3) * k);
        c.fillStyle = tone(palette.trim);
        for (let i = 1; i < 3; i++) c.fillRect((windowX - openW / 2 + (openW * i) / 3) * k - 2, Y(openH - 0.05), 4, (openH - 0.15) * k);
        for (let i = 1; i < 4; i++) c.fillRect((windowX - openW / 2) * k, Y(0.1 + ((openH - 0.15) * i) / 4) - 2, openW * k, 4);
      });
      facade.repeat.set(1 / w, 1 / (WALL + gable));
      const facadeMaterial = new THREE.MeshStandardMaterial({ map: facade, roughness: 0.85 });
      const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(w, 0), new THREE.Vector2(w, WALL), new THREE.Vector2(w / 2, WALL + gable), new THREE.Vector2(0, WALL)]);
      part(root, new THREE.ExtrudeGeometry(shape, { depth: FACADE - REAR, bevelEnabled: false }), [facadeMaterial, wallMaterial], [x0, FLOOR, REAR]);

      // Raised floor: lattice and brick piers in front, painted planks on the porch.
      const lattice = new THREE.MeshStandardMaterial({ map: latticeMap(w), roughness: 0.9 });
      part(root, new THREE.BoxGeometry(w, FLOOR, PORCH - REAR), [pierMaterial, pierMaterial, plankMaterial, pierMaterial, lattice, pierMaterial], [cx, FLOOR / 2, (PORCH + REAR) / 2]);

      // The roof runs out over the porch to a front gable carried on two turned columns.
      const roof = roofMaterial(tone(pick(roofHexes)));
      const half = w / 2 + 0.25, slope = Math.atan2(gable, w / 2);
      const eaveY = FLOOR + WALL - 0.25 * Math.tan(slope), ridgeY = FLOOR + WALL + gable;
      const roofLength = PORCH + 0.3 - REAR + 0.2;
      for (const side of [-1, 1]) {
        part(root, new THREE.BoxGeometry(Math.hypot(half, ridgeY - eaveY), 0.08, roofLength), roof, [cx + side * half / 2, (eaveY + ridgeY) / 2 + 0.05, PORCH + 0.3 - roofLength / 2], [0, 0, -side * slope]);
      }
      const pediment = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.12, 0), new THREE.Vector2(w / 2 + 0.12, 0), new THREE.Vector2(0, gable + 0.1)]);
      part(root, new THREE.ExtrudeGeometry(pediment, { depth: 0.14, bevelEnabled: false }), [wallMaterial, trimMaterial], [cx, FLOOR + WALL, PORCH - 0.04]);
      part(root, new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16), trimMaterial, [cx, FLOOR + WALL + gable * 0.42, PORCH + 0.12], [Math.PI / 2, 0, 0]);
      part(root, new THREE.BoxGeometry(w + 0.3, 0.3, 0.2), trimMaterial, [cx, FLOOR + WALL - 0.15, PORCH + 0.02]);
      beams.push({ x0: x0 + 0.15, x1: x0 + w - 0.15, y: FLOOR + WALL - 0.32 });
      // Gingerbread: a spindle frieze with scrolled brackets at each column.
      const frieze = paint(512, 80, (c) => {
        c.clearRect(0, 0, 512, 80);
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, 512, 8);
        c.fillRect(0, 34, 512, 5);
        for (let x = 6; x < 506; x += 12) c.fillRect(x, 8, 4, 26);
        for (const [x, dir] of [[0, 1], [512, -1]] as const) {
          c.beginPath(); c.moveTo(x, 0); c.lineTo(x + dir * 70, 0); c.quadraticCurveTo(x + dir * 8, 10, x, 80); c.closePath(); c.fill();
          c.save(); c.globalCompositeOperation = 'destination-out';
          c.beginPath(); c.arc(x + dir * 22, 22, 9, 0, Math.PI * 2); c.fill();
          c.restore();
        }
      });
      part(root, new THREE.PlaneGeometry(w - 0.2, 0.45), new THREE.MeshStandardMaterial({ color: tone(palette.trim), map: frieze, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 }), [cx, FLOOR + WALL - 0.3 - 0.225, PORCH + 0.08]);
      const columnHeight = WALL - 0.3;
      const turned: [number, number][] = [[0, 0], [0.1, 0], [0.1, 0.12], [0.07, 0.17], [0.065, 0.55], [0.08, 0.65], [0.06, 0.78], [0.055, columnHeight - 0.25], [0.075, columnHeight - 0.15], [0.09, columnHeight], [0, columnHeight]];
      for (const x of [x0 + 0.15, x0 + w - 0.15]) {
        s.lathe(turned, trimMaterial, [x, FLOOR, PORCH + 0.1]);
      }

      // Steps down to the sidewalk under the door, a railing either side of them.
      stairs(x0 + doorX, PORCH, 1.05, FLOOR, 1, s.material(pick(['#b8b0a2', '#8a4a3a', '#9a958a']), { roughness: 0.9 }));
      const railing = paint(512, 96, (c) => {
        c.clearRect(0, 0, 512, 96);
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, 512, 9); c.fillRect(0, 84, 512, 7);
        for (let x = 4; x < 512; x += 16) c.fillRect(x, 9, 6, 75);
        const gap0 = ((doorX - 0.62) / w) * 512, gap1 = ((doorX + 0.62) / w) * 512;
        c.clearRect(gap0, 0, gap1 - gap0, 96);
      });
      part(root, new THREE.PlaneGeometry(w - 0.3, 0.85), new THREE.MeshStandardMaterial({ color: tone(palette.trim), map: railing, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 }), [cx, FLOOR + 0.43, PORCH + 0.06]);

      // Louvred shutters, folded back or closed over the glass.
      const louvre = new THREE.MeshStandardMaterial({ map: louvres(shutterHex, wear, random), roughness: 0.75 });
      const boarded = (a.houses === 'faded' && index === 2) || (a.porch === 'bare' && index === 2);
      for (const [centre, isDoor] of [[doorX, true], [windowX, false]] as const) {
        const closed = boarded || (isDoor ? !doorOpen && random() < 0.3 : random() < 0.3 + mood.wear * 0.3);
        const leaf = openW / 2 + 0.01, height = isDoor ? openH : openH - 0.05;
        for (const side of [-1, 1]) {
          const x = x0 + centre + side * (closed ? leaf / 2 : openW / 2 + 0.14 + leaf / 2);
          part(root, new THREE.BoxGeometry(leaf, height, 0.04), louvre, [x, FLOOR + height / 2 + 0.02, FACADE + 0.04], [0, closed ? 0 : side * 0.12, 0]);
        }
        if (boarded && !isDoor) part(root, new THREE.BoxGeometry(openW + 0.2, openH * 0.7, 0.03), s.material('#c9a878', { roughness: 0.95 }), [x0 + centre, FLOOR + openH * 0.5, FACADE + 0.08], [0, 0, 0.03]);
      }

      // A ladder against the coral house in the mixed row.
      if (a.houses === 'mixed' && index === 0) {
        const wood = s.material('#c9a878', { roughness: 0.85 });
        const lx = x0 + 0.9, foot: P = [lx, KERB, -2.75], head: P = [lx, FLOOR + WALL - 0.1, PORCH + 0.18];
        rodIn(root, [foot[0] - 0.22, foot[1], foot[2]], [head[0] - 0.22, head[1], head[2]], 0.03, wood);
        rodIn(root, [foot[0] + 0.22, foot[1], foot[2]], [head[0] + 0.22, head[1], head[2]], 0.03, wood);
        const rungs: Instance[] = [];
        for (let i = 1; i < 12; i++) {
          const t = i / 12;
          rungs.push({ at: [lx, mix(foot[1], head[1], t), mix(foot[2], head[2], t)], rotation: [0, 0, Math.PI / 2], scale: [1, 1, 1] });
        }
        instances(root, new THREE.CylinderGeometry(0.018, 0.018, 0.44, 6), wood, rungs);
        part(root, new THREE.CylinderGeometry(0.1, 0.09, 0.16, 12), s.material('#f3efe6', { roughness: 0.6 }), [lx + 0.6, KERB + 0.08, -3.3]);
      }
    });

    // ── The corner church ────────────────────────────────────────────────────────────────
    const church = { x0: -8.0, w: 4.1, front: -4.35, wall: 5.0, gable: 2.0 };
    const churchKind = pick(['brick', 'stucco', 'white'] as const);
    const churchName = churchKind === 'stucco' ? ['ST. JUDE', 'CATHOLIC CHURCH'] : pick([['TRUE VINE', 'BAPTIST CHURCH'], ['GREATER MORNING STAR', 'BAPTIST CHURCH'], ['MT. PILGRIM REST', 'BAPTIST CHURCH']]);
    const doorW = 1.8, doorH = 2.5, doorBase = KERB + 0.45, cxChurch = church.x0 + church.w / 2;
    const churchFace = paint(512, Math.round(512 * (church.wall + church.gable) / church.w), (c) => {
      const k = 512 / church.w, H = c.canvas.height;
      const Y = (m: number) => H - m * k;
      const X = (m: number) => (m - church.x0) * k;
      if (churchKind === 'brick') {
        c.fillStyle = '#8a4636'; c.fillRect(0, 0, 512, H);
        for (let y = 0; y < H; y += 8) for (let x = -((y / 8) % 2) * 9; x < 512; x += 18) { c.fillStyle = `rgb(${130 + random() * 35},${58 + random() * 18},${44 + random() * 14})`; c.fillRect(x + 1, y + 1, 16, 6); }
      } else {
        c.fillStyle = churchKind === 'stucco' ? tone('#e9dcc0') : tone('#f1eee6'); c.fillRect(0, 0, 512, H);
        if (churchKind === 'white') for (let m = 0; m < church.wall + church.gable; m += 0.14) { c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, Y(m) - 3, 512, 3); }
        for (let i = 0; i < mood.wear * 20; i++) { c.fillStyle = 'rgba(120,100,80,0.25)'; c.fillRect(random() * 512, Y(random() * church.wall), 10 + random() * 40, 6 + random() * 30); }
      }
      // Quoins or corner boards, the base course, and the sign over the door.
      c.fillStyle = churchKind === 'brick' ? '#e8e2d4' : 'rgba(0,0,0,0.12)';
      for (let m = 0.6; m < church.wall; m += 0.5) { c.fillRect(0, Y(m + 0.3), 0.35 * k, 0.28 * k); c.fillRect(512 - 0.35 * k, Y(m + 0.3), 0.35 * k, 0.28 * k); }
      c.fillStyle = 'rgba(40,30,25,0.35)'; c.fillRect(0, Y(0.6), 512, 0.6 * k);
      // Tall arched stained-glass windows either side of the door, a rose window in the gable.
      const glass = (x: number, y: number, w: number, h: number) => {
        c.save();
        c.beginPath(); c.moveTo(X(x - w / 2), Y(y)); c.lineTo(X(x - w / 2), Y(y + h - w / 2)); c.arc(X(x), Y(y + h - w / 2), (w / 2) * k, Math.PI, 0); c.lineTo(X(x + w / 2), Y(y)); c.closePath();
        c.fillStyle = '#e8e2d4'; c.lineWidth = 8; c.strokeStyle = '#e8e2d4'; c.stroke(); c.clip();
        const tints = ['#3a5a9a', '#9a2a3a', '#d8a83a', '#3a7a4a', '#6a3a8a'];
        for (let gy = 0; gy < h * k; gy += 10) for (let gx = 0; gx < w * k; gx += 10) { c.fillStyle = tints[Math.floor(random() * tints.length)]; c.fillRect(X(x - w / 2) + gx, Y(y + h) + gy, 10, 10); }
        c.restore();
      };
      glass(cxChurch - 1.45, 1.4, 0.55, 2.6);
      glass(cxChurch + 1.45, 1.4, 0.55, 2.6);
      c.save(); c.beginPath(); c.arc(X(cxChurch), Y(church.wall + 0.55), 0.55 * k, 0, Math.PI * 2); c.fillStyle = '#e8e2d4'; c.fill(); c.clip();
      for (let i = 0; i < 12; i++) { c.fillStyle = ['#3a5a9a', '#9a2a3a', '#d8a83a', '#6a3a8a'][i % 4]; c.beginPath(); c.moveTo(X(cxChurch), Y(church.wall + 0.55)); c.arc(X(cxChurch), Y(church.wall + 0.55), 0.48 * k, (i / 12) * Math.PI * 2, ((i + 0.8) / 12) * Math.PI * 2); c.fill(); }
      c.restore();
      c.fillStyle = '#f3efe6'; c.fillRect(X(cxChurch - 1.3), Y(4.7), 2.6 * k, 0.62 * k);
      c.strokeStyle = '#2a2a30'; c.lineWidth = 3; c.strokeRect(X(cxChurch - 1.3), Y(4.7), 2.6 * k, 0.62 * k);
      c.fillStyle = '#2a2a30'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `bold ${Math.round(0.22 * k)}px serif`; c.fillText(churchName[0], X(cxChurch), Y(4.47), 2.4 * k);
      c.font = `${Math.round(0.15 * k)}px serif`; c.fillText(churchName[1], X(cxChurch), Y(4.2), 2.4 * k);
    });
    churchFace.repeat.set(1 / church.w, 1 / (church.wall + church.gable));
    churchFace.offset.set(-church.x0 / church.w, 0);
    const churchSide = s.material(churchKind === 'brick' ? '#8a4636' : churchKind === 'stucco' ? tone('#e9dcc0') : tone('#f1eee6'), { roughness: 0.9 });
    const churchShape = new THREE.Shape([new THREE.Vector2(church.x0, 0), new THREE.Vector2(church.x0 + church.w, 0), new THREE.Vector2(church.x0 + church.w, church.wall), new THREE.Vector2(cxChurch, church.wall + church.gable), new THREE.Vector2(church.x0, church.wall)]);
    part(root, new THREE.ExtrudeGeometry(churchShape, { depth: church.front - REAR - 0.4, bevelEnabled: false }), [new THREE.MeshStandardMaterial({ map: churchFace, roughness: 0.9 }), churchSide], [0, 0, REAR - 0.4]);
    const churchRoof = roofMaterial(tone('#4a4e52'));
    {
      const half = church.w / 2 + 0.2, slope = Math.atan2(church.gable, church.w / 2), eaveY = church.wall - 0.2 * Math.tan(slope), ridgeY = church.wall + church.gable;
      const length = church.front + 0.15 - (REAR - 0.6);
      for (const side of [-1, 1]) part(root, new THREE.BoxGeometry(Math.hypot(half, ridgeY - eaveY), 0.1, length), churchRoof, [cxChurch + side * half / 2, (eaveY + ridgeY) / 2 + 0.06, church.front + 0.15 - length / 2], [0, 0, -side * slope]);
    }
    const crossMaterial = s.material(churchKind === 'brick' ? '#f3efe6' : '#d9b23a', { roughness: 0.4, metalness: churchKind === 'brick' ? 0 : 0.6 });
    part(root, new THREE.BoxGeometry(0.12, 1.1, 0.12), crossMaterial, [cxChurch, church.wall + church.gable + 0.5, church.front + 0.05]);
    part(root, new THREE.BoxGeometry(0.6, 0.12, 0.12), crossMaterial, [cxChurch, church.wall + church.gable + 0.7, church.front + 0.05]);
    stairs(cxChurch, church.front, 2.7, doorBase, 1, s.material(churchKind === 'brick' ? '#b8b0a2' : '#9a958a', { roughness: 0.9 }));
    // The arched door: open on the dark nave for the service, shut before and after it.
    const churchOpen = dirge || cutloose;
    const archShape = new THREE.Shape();
    archShape.moveTo(-doorW / 2, 0); archShape.lineTo(doorW / 2, 0); archShape.lineTo(doorW / 2, doorH); archShape.absarc(0, doorH, doorW / 2, 0, Math.PI, false); archShape.lineTo(-doorW / 2, 0);
    part(root, new THREE.ShapeGeometry(archShape, 16), s.material(churchOpen ? '#17151a' : '#e8e2d4', { roughness: 0.9 }), [cxChurch, doorBase, church.front + 0.012]);
    const leafMaterial = s.material(tone(pick(['#7a2a2a', '#f3efe6', '#4a2e22', '#2a3a5a'])), { roughness: 0.6 });
    const leaves: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set(cxChurch + side * doorW / 2, doorBase, church.front + 0.04);
      hinge.rotation.y = churchOpen ? side * 1.25 : 0;
      part(hinge, new THREE.BoxGeometry(doorW / 2 - 0.03, doorH - 0.02, 0.06), leafMaterial, [-side * (doorW / 4), (doorH - 0.02) / 2, 0]);
      part(hinge, new THREE.BoxGeometry(doorW / 2 - 0.25, 0.9, 0.02), new THREE.MeshStandardMaterial({ color: '#000000', transparent: true, opacity: 0.18, depthWrite: false, roughness: 0.6 }), [-side * (doorW / 4), 1.7, 0.035]);
      root.add(hinge);
      leaves.push(hinge);
    }
    // What marks the door.
    if (a.door === 'wreath' || a.door === 'roses') {
      const leaf = leaves[0];
      const ring = new THREE.TorusGeometry(0.3, 0.085, 10, 28);
      const bloom = a.door === 'roses' ? '#b81e2e' : '#f6f3ec';
      part(leaf, ring, s.material('#3e5a32', { roughness: 0.9 }), [doorW / 4, 1.65, 0.1]);
      const flowers: Instance[] = [];
      for (let i = 0; i < 26; i++) {
        const t = (i / 26) * Math.PI * 2;
        flowers.push({ at: [doorW / 4 + Math.cos(t) * 0.3, 1.65 + Math.sin(t) * 0.3, 0.17 + random() * 0.03], scale: [0.055, 0.055, 0.04].map((v) => v * (0.8 + random() * 0.4)) as P, color: random() < 0.85 ? bloom : '#e8d8c8' });
      }
      instances(leaf, new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.8 }), flowers);
      part(leaf, new THREE.BoxGeometry(0.1, 0.62, 0.02), s.material(a.door === 'roses' ? '#f3efe6' : '#5a2a8a', { roughness: 0.5 }), [doorW / 4 + 0.05, 1.4, 0.2], [0, 0, 0.25]);
    } else if (a.door === 'bunting') {
      const purple = s.material('#4a1f6a', { roughness: 0.7 }), black = s.material('#141416', { roughness: 0.7 });
      const top = doorBase + doorH + doorW / 2 + 0.25;
      for (const [material, sag, radius] of [[purple, 0.55, 0.07], [black, 0.38, 0.06]] as const) {
        const points: P[] = [];
        for (let i = 0; i <= 16; i++) { const t = i / 16; points.push([cxChurch - 1.3 + t * 2.6, top - Math.abs(Math.sin(t * Math.PI * 2)) * sag, church.front + 0.08]); }
        part(root, taperTube(points, radius, radius).geometry, material);
      }
      for (const x of [-1.3, 0, 1.3]) part(root, new THREE.CylinderGeometry(0.16, 0.16, 0.05, 14), purple, [cxChurch + x, top, church.front + 0.12], [Math.PI / 2, 0, 0]);
    } else {
      // An easel by the steps: a framed portrait (a silhouette, never a likeness) and lilies.
      const easel = new THREE.Group();
      easel.position.set(church.x0 + 0.55, KERB, church.front + 0.6);
      easel.rotation.y = 0.3;
      const wood = s.material('#5a3e2a', { roughness: 0.7 });
      rodIn(easel, [-0.3, 0, 0.15], [0, 1.7, 0], 0.02, wood);
      rodIn(easel, [0.3, 0, 0.15], [0, 1.7, 0], 0.02, wood);
      rodIn(easel, [0, 0, -0.35], [0, 1.6, 0], 0.02, wood);
      const portrait = paint(192, 240, (c) => {
        c.fillStyle = '#d9b23a'; c.fillRect(0, 0, 192, 240);
        const g = c.createLinearGradient(0, 0, 0, 240); g.addColorStop(0, '#9ab8d8'); g.addColorStop(1, '#e8e0d0');
        c.fillStyle = g; c.fillRect(16, 16, 160, 208);
        c.fillStyle = '#3a2e2a'; c.beginPath(); c.ellipse(96, 100, 34, 42, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(96, 220, 70, 62, 0, Math.PI, 0); c.fill();
      });
      part(easel, new THREE.BoxGeometry(0.6, 0.75, 0.04), new THREE.MeshStandardMaterial({ map: portrait, roughness: 0.6 }), [0, 1.3, 0.1], [-0.12, 0, 0]);
      const lilies: Instance[] = [];
      for (let i = 0; i < 9; i++) lilies.push({ at: [(random() - 0.5) * 0.6, 0.85 + random() * 0.12, 0.2 + random() * 0.1], rotation: [-0.4 + random() * 0.4, random() * 6, 0], scale: [0.06, 0.1, 0.06] });
      instances(easel, new THREE.ConeGeometry(1, 1, 8, 1, true), new THREE.MeshStandardMaterial({ color: '#f6f3ec', side: THREE.DoubleSide, roughness: 0.8 }), lilies);
      part(easel, new THREE.BoxGeometry(0.62, 0.06, 0.22), s.material('#3e5a32', { roughness: 0.9 }), [0, 0.85, 0.2]);
      root.add(easel);
    }

    // ── The hearse at the kerb ───────────────────────────────────────────────────────────
    {
      const hearse = new THREE.Group();
      hearse.position.set(-5.0, 0.04, BACK + 1.03);
      root.add(hearse);
      const pearl = a.hearse === 'pearl', vintage = a.hearse === 'vintage';
      const paintHex = pearl ? '#ece7dc' : vintage ? '#1a1a1f' : '#131316';
      const body = s.material(paintHex, { roughness: pearl ? 0.3 : 0.2, metalness: pearl ? 0.2 : 0.55 });
      const chrome = s.material(pearl ? '#d9b23a' : '#d8dce0', { roughness: 0.15, metalness: 0.95 });
      const glass = s.material('#1c2026', { roughness: 0.1, metalness: 0.4 });
      const profile: [number, number][] = vintage
        ? [[-2.85, 0.34], [-2.85, 0.8], [-2.6, 0.92], [-1.35, 0.98], [-0.85, 1.48], [-0.6, 1.54], [2.35, 1.56], [2.7, 1.42], [2.88, 1.1], [2.9, 0.38], [2.65, 0.32]]
        : [[-2.8, 0.32], [-2.8, 0.78], [-2.62, 0.9], [-1.45, 0.98], [-0.85, 1.5], [-0.65, 1.57], [2.55, 1.6], [2.75, 1.52], [2.82, 1.3], [2.82, 0.36], [2.6, 0.3]];
      const bodyShape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)));
      part(hearse, new THREE.ExtrudeGeometry(bodyShape, { depth: 1.84, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 }), body, [0, 0, -0.92]);
      // Glass: the windscreen, the cab windows and the long curtained side windows.
      const [[sx0, sy0], [sx1, sy1]] = [profile[3], profile[4]];
      const rake = Math.atan2(sy1 - sy0, sx1 - sx0);
      part(hearse, new THREE.BoxGeometry(Math.hypot(sx1 - sx0, sy1 - sy0), 0.02, 1.8), glass, [(sx0 + sx1) / 2 - Math.sin(rake) * 0.025, (sy0 + sy1) / 2 + Math.cos(rake) * 0.025, 0], [0, 0, rake]);
      part(hearse, new THREE.BoxGeometry(0.7, 0.4, 1.96), glass, [-0.62, 1.24, 0]);
      const curtains = paint(256, 64, (c) => {
        c.fillStyle = '#1c2026'; c.fillRect(0, 0, 256, 64);
        for (let x = 0; x < 256; x += 9) { c.fillStyle = pearl ? '#d8cfc0' : '#c9c4ba'; c.fillRect(x, 0, 5, 64); c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x + 5, 0, 2, 64); }
        c.fillStyle = '#1c2026'; c.beginPath(); c.moveTo(60, 0); c.quadraticCurveTo(128, 70, 196, 0); c.fill();
      });
      part(hearse, new THREE.BoxGeometry(1.8, 0.4, 1.965), new THREE.MeshStandardMaterial({ map: curtains, roughness: 0.4 }), [0.55, 1.24, 0]);
      // Landau bars on the rear quarters.
      for (const z of [-0.98, 0.98]) {
        const bar = new THREE.CatmullRomCurve3([new THREE.Vector3(1.7, 1.42, z), new THREE.Vector3(1.95, 1.3, z), new THREE.Vector3(2.2, 1.18, z), new THREE.Vector3(2.45, 1.08, z), new THREE.Vector3(2.62, 1.2, z)]);
        part(hearse, new THREE.TubeGeometry(bar, 20, 0.028, 6), chrome);
      }
      // Wheels, bumpers, grille and lamps.
      const wheelSpots: Instance[] = [];
      for (const x of [-1.85, 1.75]) for (const z of [-0.84, 0.84]) wheelSpots.push({ at: [x, 0.36, z], rotation: [Math.PI / 2, 0, 0] });
      instances(hearse, new THREE.CylinderGeometry(0.36, 0.36, 0.26, 20), s.material('#18181a', { roughness: 0.9 }), wheelSpots);
      instances(hearse, new THREE.CylinderGeometry(vintage ? 0.27 : 0.2, vintage ? 0.27 : 0.2, 0.28, 18), vintage ? s.material('#f3efe6', { roughness: 0.6 }) : chrome, wheelSpots);
      if (vintage) instances(hearse, new THREE.CylinderGeometry(0.14, 0.14, 0.3, 14), chrome, wheelSpots);
      part(hearse, new THREE.BoxGeometry(0.14, 0.16, 2.0), chrome, [-2.88, 0.44, 0]);
      part(hearse, new THREE.BoxGeometry(0.14, 0.16, 2.0), chrome, [2.92, 0.44, 0]);
      part(hearse, new THREE.BoxGeometry(0.05, 0.28, 1.1), chrome, [-2.84, 0.64, 0]);
      for (const z of [-0.66, 0.66]) part(hearse, new THREE.CylinderGeometry(0.09, 0.09, 0.05, 14), s.material('#f6f1dc', { emissive: '#fff4cc', emissiveIntensity: 0.25, roughness: 0.3 }), [-2.84, 0.7, z], [0, 0, Math.PI / 2]);
      part(hearse, new THREE.BoxGeometry(5.3, 0.035, 1.97), chrome, [0, 0.82, 0]);
      if (vintage) for (const z of [-0.88, 0.88]) {
        const fin = new THREE.Shape([new THREE.Vector2(1.6, 1.05), new THREE.Vector2(2.9, 1.05), new THREE.Vector2(2.95, 1.42)]);
        part(hearse, new THREE.ExtrudeGeometry(fin, { depth: 0.07, bevelEnabled: false }), body, [0, 0, z - 0.035]);
      }
      // Purple funeral flags on the front wings.
      const flag = paint(128, 64, (c) => { c.fillStyle = '#4a1f6a'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#f3efe6'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 26px sans-serif'; c.fillText('FUNERAL', 64, 33, 120); });
      for (const z of [-0.8, 0.8]) {
        rodIn(hearse, [-2.55, 0.9, z], [-2.55, 1.32, z], 0.008, chrome);
        part(hearse, new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshStandardMaterial({ map: flag, side: THREE.DoubleSide, roughness: 0.7 }), [-2.4, 1.24, z], [0, 0.15, 0]);
      }
      // The rear door: swung open on its hinge for the casket, or shut.
      const rearOpen = dirge || gathering;
      const pivot = new THREE.Group();
      pivot.position.set(2.86, 0.92, -0.9);
      pivot.rotation.y = rearOpen ? 1.75 : 0;
      part(pivot, new THREE.BoxGeometry(0.06, 1.05, 1.76), body, [0, 0, 0.88]);
      part(pivot, new THREE.BoxGeometry(0.07, 0.36, 1.2), new THREE.MeshStandardMaterial({ map: curtains, roughness: 0.4 }), [0, 0.3, 0.88]);
      hearse.add(pivot);
      if (rearOpen) {
        part(hearse, new THREE.PlaneGeometry(1.72, 1.02), s.material('#141210', { roughness: 1 }), [2.875, 0.95, 0], [0, Math.PI / 2, 0]);
        part(hearse, new THREE.BoxGeometry(1.4, 0.06, 0.9), s.material('#8a8a90', { metalness: 0.7, roughness: 0.3 }), [2.4, 0.52, 0]);
      }
      if (dirge) {
        // The casket sliding out, a spray of flowers on its lid.
        const casket = new THREE.Group();
        casket.position.set(3.3, 0.6, 0);
        const wood = s.material(pick(['#5a2a1e', '#f1ece0', '#2a2a30', '#7a5a3a']), { roughness: 0.25, metalness: 0.2 });
        part(casket, new THREE.BoxGeometry(2.1, 0.4, 0.66), wood, [0, 0.2, 0]);
        part(casket, new THREE.CapsuleGeometry(0.33, 1.5, 4, 12), wood, [0, 0.42, 0], [0, 0, Math.PI / 2], [1, 0.42, 1]);
        for (const z of [-0.35, 0.35]) part(casket, new THREE.BoxGeometry(1.7, 0.035, 0.035), chrome, [0, 0.22, z]);
        const spray: Instance[] = [];
        const blooms = ['#f6f3ec', '#b81e2e', '#f6f3ec', '#e8a0b8'];
        for (let i = 0; i < 34; i++) spray.push({ at: [(random() - 0.5) * 0.9, 0.58 + random() * 0.08, (random() - 0.5) * 0.4], scale: [0.06, 0.05, 0.06], color: i < 8 ? '#3e5a32' : pick(blooms) });
        instances(casket, new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.8 }), spray);
        hearse.add(casket);
      }
    }

    // ── Overhead: oaks, moss, beads, myrtles or wires ───────────────────────────────────
    const trunks: [number, number][] = [[-3.6, -3.3], [4.8, -3.25]];
    if (a.overhang === 'moss' || a.overhang === 'beads') {
      const bark = s.material('#4a4038', { roughness: 1 });
      const leafClusters: Instance[] = [];
      const moss: Instance[] = [];
      const beads: Instance[] = [];
      trunks.forEach(([tx, tz], t) => {
        part(root, taperTube([[tx, -0.1, tz], [tx + 0.08, 1.3, tz + 0.04], [tx, 2.5, tz]], 0.42, 0.3, 10, 12).geometry, bark);
        s.lathe([[0.0, 0], [0.75, 0], [0.5, 0.12], [0.38, 0.4], [0.0, 0.4]], bark, [tx, KERB - 0.02, tz]);
        const angles = t === 0 ? [0.15, 0.85, -0.5, 2.6, 3.4] : [0.25, -0.6, 2.9, 2.2, 0.9];
        angles.forEach((angle, i) => {
          const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle) * 0.75);
          const reach = 3.6 + random() * 2.4;
          // Live oak limbs rise, then run out almost level and dip at the tips.
          const start = new THREE.Vector3(tx, 2.3 + i * 0.08, tz);
          const pts: P[] = [start, start.clone().addScaledVector(dir, reach * 0.22).add(new THREE.Vector3(0, 1.6, 0)), start.clone().addScaledVector(dir, reach * 0.55).add(new THREE.Vector3(0, 2.7 + random() * 0.4, 0)), start.clone().addScaledVector(dir, reach).add(new THREE.Vector3(0, 2.4 + random() * 0.6, 0))].map((v) => [v.x, v.y, Math.min(v.z, 0.2)] as P);
          const { geometry, curve } = taperTube(pts, 0.24, 0.05, 18, 8);
          part(root, geometry, bark);
          const p = new THREE.Vector3();
          for (let k = 0; k < 13; k++) {
            curve.getPointAt(0.3 + (k / 12) * 0.7, p);
            leafClusters.push({ at: [p.x + (random() - 0.5) * 0.9, p.y + 0.15 + random() * 0.4, p.z + (random() - 0.5) * 0.9], rotation: [random(), random() * 6, random()], scale: [0.3 + random() * 0.22, 0.18 + random() * 0.1, 0.3 + random() * 0.22], color: pick(['#4d5a36', '#56643c', '#44502f', '#5e6a42']) });
          }
          const strands = a.overhang === 'moss' ? 13 : 4;
          for (let k = 0; k < strands; k++) {
            curve.getPointAt(0.3 + random() * 0.7, p);
            moss.push({ at: [p.x + (random() - 0.5) * 0.4, p.y - 0.08, p.z + (random() - 0.5) * 0.4], rotation: [0, random() * Math.PI, 0], scale: [0.9 + random() * 0.6, 0.8 + random() * (a.overhang === 'moss' ? 1.2 : 0.5), 1] });
          }
          if (a.overhang === 'beads') {
            for (let k = 0; k < 3; k++) {
              curve.getPointAt(0.35 + random() * 0.6, p);
              const hue = pick(['#6a2a9a', '#e2b43a', '#2a9a4a', '#c8ccd2', '#c42a4a']);
              const drop = 0.4 + random() * 1.0, span = 0.2 + random() * 0.3, turn = random() * Math.PI;
              for (let b = 0; b <= 22; b++) {
                const u = b / 22;
                beads.push({ at: [p.x + Math.cos(turn) * (u - 0.5) * span, p.y - 0.05 - Math.sin(u * Math.PI) * drop, p.z + Math.sin(turn) * (u - 0.5) * span], scale: [0.035, 0.035, 0.035], color: hue });
              }
            }
          }
        });
      });
      instances(root, new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { roughness: 0.95 }), leafClusters);
      const mossMap = paint(64, 256, (c) => {
        c.clearRect(0, 0, 64, 256);
        for (let i = 0; i < 22; i++) {
          let x = 4 + random() * 56;
          const length = 80 + random() * 176;
          c.strokeStyle = `rgba(${220 + random() * 30},${225 + random() * 30},${205 + random() * 30},1)`;
          c.lineWidth = 1.5 + random() * 2.5;
          c.beginPath(); c.moveTo(x, 0);
          for (let y = 0; y < length; y += 12) { x += (random() - 0.5) * 6; c.lineTo(x, y); }
          c.stroke();
        }
      });
      const mossGeometry = new THREE.PlaneGeometry(0.42, 1.2);
      mossGeometry.translate(0, -0.6, 0);
      const mossMesh = instances(root, mossGeometry, new THREE.MeshStandardMaterial({ color: tone('#bcc0aa'), map: mossMap, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 1 }), moss);
      mossMesh.castShadow = false;
      if (beads.length) instances(root, new THREE.SphereGeometry(1, 6, 5), s.material('#ffffff', { roughness: 0.25, metalness: 0.5 }), beads);
    } else if (a.overhang === 'myrtle') {
      // Crepe myrtles: smooth mottled stems flaring like a vase, a crown of small pink panicles and leaves.
      const bark = s.material('#b89a7a', { roughness: 0.6 });
      const crown: Instance[] = [];
      for (const [tx, tz] of trunks) {
        const stems = 5;
        for (let i = 0; i < stems; i++) {
          const t = (i / stems) * Math.PI * 2 + random() * 0.5, spread = 0.7 + random() * 0.4;
          const tip: P = [tx + Math.cos(t) * spread, 3.4 + random() * 0.5, tz + Math.sin(t) * spread * 0.7];
          part(root, taperTube([[tx + Math.cos(t) * 0.08, KERB, tz + Math.sin(t) * 0.08], [tx + Math.cos(t) * spread * 0.35, 1.6, tz + Math.sin(t) * spread * 0.25], tip], 0.07, 0.035, 10, 6).geometry, bark);
          for (let k = 0; k < 24; k++) {
            const r = random() * 0.9, a2 = random() * Math.PI * 2;
            const bloom = random() < 0.62;
            crown.push({ at: [tip[0] + Math.cos(a2) * r, tip[1] + 0.2 + random() * 0.6 - r * 0.3, tip[2] + Math.sin(a2) * r * 0.8], rotation: [0, random() * 6, 0], scale: bloom ? [0.11, 0.17, 0.11] : [0.15, 0.08, 0.15], color: bloom ? pick(['#e86aa8', '#d84a8a', '#f08cc0', '#c8407a']) : pick(['#4e6a36', '#5a7a3e']) });
          }
        }
      }
      instances(root, new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.9 }), crown);
    } else {
      // Utility poles and their wires, one pair of sneakers thrown over.
      const wood = s.material('#5e5040', { roughness: 0.95 });
      const wireMaterial = s.material('#1a1a1c', { roughness: 0.6 });
      const tops: THREE.Vector3[] = [];
      trunks.forEach(([tx, tz], i) => {
        const top = new THREE.Vector3(tx + (i ? -0.2 : 0.25), 8.4, tz - 0.1);
        rodIn(root, [tx, 0, tz], top.toArray() as P, 0.14, wood, 0.11);
        part(root, new THREE.BoxGeometry(1.8, 0.12, 0.12), wood, [top.x, 7.6, top.z]);
        part(root, new THREE.CylinderGeometry(0.28, 0.28, 0.7, 12), s.material('#7a8288', { roughness: 0.5, metalness: 0.4 }), [top.x + 0.35, 6.6, top.z + 0.25]);
        tops.push(top);
      });
      const sag = (from: THREE.Vector3, to: THREE.Vector3, droop: number) => {
        const pts: P[] = [];
        for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([mix(from.x, to.x, t), mix(from.y, to.y, t) - Math.sin(t * Math.PI) * droop, mix(from.z, to.z, t)]); }
        part(root, taperTube(pts, 0.014, 0.014, 24, 4).geometry, wireMaterial);
        return pts;
      };
      for (const dx of [-0.8, 0, 0.8]) {
        const a0 = new THREE.Vector3(tops[0].x + dx, 7.65, tops[0].z), a1 = new THREE.Vector3(tops[1].x + dx, 7.65, tops[1].z);
        sag(new THREE.Vector3(-8, 7.6, a0.z), a0, 0.4);
        sag(a0, a1, 0.9);
        sag(a1, new THREE.Vector3(8, 7.6, a1.z), 0.4);
      }
      const across = sag(new THREE.Vector3(tops[0].x + 0.3, 6.6, tops[0].z), new THREE.Vector3(tops[0].x + 3.2, 6.2, 6.8), 1.0);
      const hang = across[5];
      const shoe = s.material(pick(['#f3efe6', '#c42a2a', '#2a6ad8']), { roughness: 0.7 });
      for (const side of [-1, 1]) {
        rodIn(root, hang, [hang[0] + side * 0.12, hang[1] - 0.45, hang[2]], 0.006, s.material('#f3efe6', { roughness: 0.8 }));
        part(root, new THREE.BoxGeometry(0.11, 0.1, 0.3), shoe, [hang[0] + side * 0.12, hang[1] - 0.52, hang[2]], [0.5, 0, side * 0.2]);
      }
    }

    // ── The lamp post and the banner leaning on it ────────────────────────────────────────
    const lampX = 2.0, lampZ = -3.35;
    const iron = s.material('#2c362f', { roughness: 0.55, metalness: 0.35 });
    s.lathe([[0, 0], [0.17, 0], [0.17, 0.1], [0.13, 0.22], [0.1, 0.55], [0.07, 0.65], [0.055, 3.55], [0.09, 3.62], [0.05, 3.72], [0, 3.72]], iron, [lampX, KERB, lampZ]);
    part(root, new THREE.CylinderGeometry(0.21, 0.13, 0.52, 4, 1), s.material('#f6efd2', { emissive: '#ffe9a8', emissiveIntensity: 0.15 + Math.abs(mood.daylight - 0.5) * 0.9, roughness: 0.3 }), [lampX, KERB + 4.0, lampZ], [0, Math.PI / 4, 0]);
    part(root, new THREE.ConeGeometry(0.28, 0.26, 4), iron, [lampX, KERB + 4.39, lampZ], [0, Math.PI / 4, 0]);
    part(root, new THREE.SphereGeometry(0.05, 8, 6), iron, [lampX, KERB + 4.55, lampZ]);
    const bannerFace = paint(512, 480, (c) => {
      const satin = a.banner === 'memorial' ? '#f6f3ec' : a.banner === 'club' ? pick(['#5a2a8a', '#1f6a4a', '#9a1f2e', '#1f3f7a']) : a.banner === 'band' ? '#18181c' : '#f3efe6';
      const ink = a.banner === 'memorial' ? '#4a1f6a' : a.banner === 'choir' ? '#5a2a8a' : '#e2b43a';
      c.clearRect(0, 0, 512, 480);
      const g = c.createLinearGradient(0, 0, 512, 0);
      g.addColorStop(0, satin); g.addColorStop(0.45, `#${new THREE.Color(satin).lerp(new THREE.Color('#ffffff'), 0.25).getHexString()}`); g.addColorStop(1, satin);
      c.fillStyle = g; c.fillRect(0, 0, 512, 420);
      c.strokeStyle = '#d9b23a'; c.lineWidth = 12; c.strokeRect(14, 14, 484, 392);
      c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
      const line = (text: string, y: number, size: number, font = 'serif') => { c.font = `bold ${size}px ${font}`; c.fillText(text, 256, y, 450); };
      if (a.banner === 'memorial') {
        line('IN LOVING MEMORY', 62, 44);
        c.fillStyle = '#d9b23a'; c.beginPath(); c.ellipse(256, 210, 92, 112, 0, 0, Math.PI * 2); c.fill();
        const sky = c.createLinearGradient(0, 110, 0, 310); sky.addColorStop(0, '#8ab0d8'); sky.addColorStop(1, '#f0e8d8');
        c.fillStyle = sky; c.beginPath(); c.ellipse(256, 210, 80, 100, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#3a2e2a'; c.beginPath(); c.ellipse(256, 188, 30, 38, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(256, 300, 62, 64, 0, Math.PI, 0); c.fill();
        c.fillStyle = '#ffffff';
        for (const [x, d] of [[110, 1], [402, -1]] as const) { c.beginPath(); c.ellipse(x, 160, 30, 13, d * 0.4, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(x, 160); c.lineTo(x + d * 30, 128); c.lineTo(x + d * 8, 150); c.fill(); }
        c.fillStyle = ink; line('GONE HOME', 360, 40);
      } else if (a.banner === 'club') {
        const name = pick(['ROSEBUD STEPPERS', 'GOLDEN SATIN STRUTTERS', "BACK O' TOWN BUCKJUMPERS", 'NEW ORLEANS FEATHER LADIES']);
        line('SOCIAL AID & PLEASURE CLUB', 70, 26, 'sans-serif');
        const words = name.split(' ');
        const half = Math.ceil(words.length / 2);
        line(words.slice(0, half).join(' '), 170, 62);
        line(words.slice(half).join(' '), 245, 62);
        c.fillStyle = ink; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(136 + i * 60, 330, 12, 0, Math.PI * 2); c.fill(); }
        line('EST. 1968', 375, 26, 'sans-serif');
      } else if (a.banner === 'band') {
        line(pick(['ST. CLAUDE', 'BAYOU ROAD', 'ORLEANS AVENUE', 'NORTH RAMPART']), 70, 52);
        line('BRASS BAND', 360, 52);
        c.fillStyle = '#d9b23a';
        c.fillRect(150, 205, 170, 16); c.beginPath(); c.moveTo(320, 213); c.lineTo(390, 160); c.lineTo(390, 266); c.closePath(); c.fill();
        for (let i = 0; i < 3; i++) c.fillRect(205 + i * 26, 175, 12, 32);
        c.beginPath(); c.arc(150, 213, 16, 0, Math.PI * 2); c.fill();
      } else {
        line('TRUE VINE', 64, 50); line('MASS CHOIR', 360, 46);
        c.fillStyle = '#d9b23a'; c.fillRect(240, 120, 32, 190); c.fillRect(190, 165, 132, 30);
        c.fillStyle = '#ffffff'; c.strokeStyle = '#8a8a90'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(330, 140, 40, 16, -0.3, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(320, 140); c.lineTo(370, 100); c.lineTo(345, 145); c.fill(); c.stroke();
      }
      // A gold fringe, cut into strands.
      c.fillStyle = '#d9b23a';
      for (let x = 0; x < 512; x += 7) c.fillRect(x, 420, 4, 52 + random() * 8);
    });
    const bannerCloth = new THREE.PlaneGeometry(1.9, 1.75, 14, 6);
    const bannerBase = Float32Array.from((bannerCloth.getAttribute('position') as THREE.BufferAttribute).array as Float32Array);
    const bannerTilt = after ? 0.42 : 0.23;
    const banner = new THREE.Group();
    banner.position.set(lampX, KERB, -2.55);
    banner.rotation.set(-bannerTilt, after ? 0.25 : -0.08, after ? 0.08 : 0);
    root.add(banner);
    const brass = s.material('#c9a23a', { roughness: 0.3, metalness: 0.8 });
    const poleLength = 3.4;
    for (const side of [-1, 1]) {
      rodIn(banner, [side * 0.99, 0, 0], [side * 0.97, poleLength, 0], 0.026, s.material('#3a2a1e', { roughness: 0.6 }));
      part(banner, new THREE.ConeGeometry(0.05, 0.16, 8), brass, [side * 0.97, poleLength + 0.08, 0]);
    }
    rodIn(banner, [-1.0, poleLength - 0.12, 0], [1.0, poleLength - 0.12, 0], 0.02, brass);
    part(banner, bannerCloth, new THREE.MeshStandardMaterial({ map: bannerFace, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.35, metalness: 0.1 }), [0, poleLength - 0.12 - 0.875, 0.02]);
    const ripple = (time: number) => {
      const position = bannerCloth.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) {
        const x = bannerBase[i * 3], y = bannerBase[i * 3 + 1];
        position.setZ(i, Math.sin(x * 2.6 + time * mix(0.6, 3, mood.energy)) * 0.05 * (0.6 - y * 0.25) + (x * x) * 0.03);
      }
      position.needsUpdate = true;
      bannerCloth.computeVertexNormals();
    };
    ripple(random() * 10);
    motion.push((_dt, time) => ripple(time));

    // ── The near side: front yards behind a low iron fence, gate paths, a hydrant ───────
    {
      part(root, new THREE.BoxGeometry(W, KERB, D / 2 - WALK_FRONT), s.material('#7d7a58', { roughness: 1 }), [0, KERB / 2, (WALK_FRONT + D / 2) / 2]);
      const gates = [0.18, 0.43, 0.68, 0.92];
      const fence = paint(1024, 64, (c) => {
        c.clearRect(0, 0, 1024, 64);
        c.fillStyle = '#ffffff';
        c.fillRect(0, 8, 1024, 4); c.fillRect(0, 54, 1024, 4);
        for (let x = 2; x < 1024; x += 9) { c.fillRect(x, 4, 3, 56); c.beginPath(); c.moveTo(x - 2, 6); c.lineTo(x + 1.5, 0); c.lineTo(x + 5, 6); c.fill(); }
        for (const gate of gates) c.clearRect(gate * 1024, 0, 50, 64);
      });
      part(root, new THREE.PlaneGeometry(W, 0.8), new THREE.MeshStandardMaterial({ color: '#1e2420', map: fence, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.3 }), [0, KERB + 0.4, WALK_FRONT + 0.25]);
      const paths: Instance[] = [], shrubs: Instance[] = [];
      for (const gate of gates) {
        const gx = -W / 2 + gate * W + 0.39;
        paths.push({ at: [gx, KERB + 0.01, (WALK_FRONT + D / 2) / 2], scale: [0.8, 1, D / 2 - WALK_FRONT] });
        for (const side of [-1, 1]) for (let k = 0; k < 2; k++) {
          shrubs.push({ at: [gx + side * (0.75 + k * 0.9 + random() * 0.3), KERB + 0.12, WALK_FRONT + 0.7 + random() * 0.7], rotation: [0, random() * 6, 0], scale: [0.24 + random() * 0.1, 0.16 + random() * 0.1, 0.24 + random() * 0.1], color: pick(['#4e6e3a', '#5e7e42', '#3e5e32', '#6a7a3a']) });
        }
      }
      instances(root, new THREE.BoxGeometry(1, 0.02, 1), s.material('#9a5a44', { roughness: 0.9 }), paths);
      instances(root, new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { roughness: 0.95 }), shrubs);
      // A hydrant at the front kerb.
      s.lathe([[0, 0], [0.16, 0], [0.16, 0.06], [0.12, 0.1], [0.12, 0.55], [0.15, 0.58], [0.12, 0.66], [0.06, 0.74], [0, 0.76]], s.material(pick(['#d8b23a', '#c8ccd0', '#c42a2a']), { roughness: 0.5, metalness: 0.3 }), [-2.6, KERB, 3.35]);
    }

    // ── Porches: chairs and a cooler, a table and a grill, rockers and ferns, or nothing ─
    const foldingChair = (x: number, y: number, z: number, turn: number, tipped = false, seatH = 0.45) => {
      const chair = new THREE.Group();
      chair.position.set(x, y, z);
      chair.rotation.y = turn;
      const frame = s.material(pick(['#c9ccd0', '#5a4a3a', '#2a2a30']), { roughness: 0.4, metalness: 0.5 });
      const seat = s.material(pick(['#3a8a4a', '#2a6ad8', '#c42a2a', '#e8c62a', '#5a4a3a']), { roughness: 0.8 });
      part(chair, new THREE.BoxGeometry(0.46, 0.04, 0.42), seat, [0, seatH, 0]);
      part(chair, new THREE.BoxGeometry(0.46, 0.38, 0.03), seat, [0, seatH + 0.27, -0.22], [-0.12, 0, 0]);
      for (const sx of [-0.22, 0.22]) {
        rodIn(chair, [sx, 0, 0.22], [sx, seatH + 0.47, -0.26], 0.014, frame);
        rodIn(chair, [sx, 0, -0.24], [sx, seatH + 0.01, 0.2], 0.014, frame);
      }
      if (tipped) { chair.rotation.x = -1.35; chair.position.y += 0.2; }
      root.add(chair);
      return chair;
    };
    if (a.porch === 'chairs') {
      foldingChair(-2.35, FLOOR, -4.85, 0.2, after);
      const cooler = s.material(pick(['#c42a2a', '#2a6ad8', '#f3efe6']), { roughness: 0.5 });
      part(root, new THREE.BoxGeometry(0.62, 0.36, 0.4), cooler, [-2.95, FLOOR + 0.18, -4.6]);
      const lid = part(root, new THREE.BoxGeometry(0.64, 0.07, 0.42), s.material('#f3efe6', { roughness: 0.5 }), [-2.95, FLOOR + 0.395, -4.6]);
      if (after) { lid.rotation.x = -1.2; lid.position.set(-2.95, FLOOR + 0.55, -4.83); }
    } else if (a.porch === 'food') {
      const table = new THREE.Group();
      table.position.set(-2.5, FLOOR, -4.75);
      part(table, new THREE.BoxGeometry(1.1, 0.04, 0.6), s.material('#f3efe6', { roughness: 0.7 }), [0, 0.72, 0]);
      for (const sx of [-0.5, 0.5]) for (const sz of [-0.27, 0.27]) rodIn(table, [sx, 0, sz], [sx, 0.72, sz], 0.014, s.material('#5a5a60', { metalness: 0.6, roughness: 0.4 }));
      const foil: Instance[] = [];
      for (let i = 0; i < 3; i++) foil.push({ at: [-0.32 + i * 0.32, 0.78, (random() - 0.5) * 0.2], scale: [1, 1, 1] });
      instances(table, new THREE.BoxGeometry(0.26, 0.08, 0.34), s.material('#d8dce0', { metalness: 0.9, roughness: 0.3 }), foil);
      root.add(table);
      // A kettle grill on the sidewalk, smoke climbing from it.
      const grill = new THREE.Group();
      grill.position.set(-2.1, KERB, -3.25);
      const black = s.material('#1a1a1c', { roughness: 0.5, metalness: 0.3 });
      part(grill, new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), black, [0, 0.78, 0]);
      part(grill, new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), black, [0.06, 0.82, 0], [0, 0, -0.5]);
      for (let i = 0; i < 3; i++) { const t = (i / 3) * Math.PI * 2; rodIn(grill, [Math.cos(t) * 0.26, 0, Math.sin(t) * 0.26], [Math.cos(t) * 0.16, 0.6, Math.sin(t) * 0.16], 0.012, black); }
      root.add(grill);
      const smoke = new THREE.MeshStandardMaterial({ color: '#d8d4cc', transparent: true, opacity: 0.35, depthWrite: false, roughness: 1 });
      const puffs: THREE.Mesh[] = [];
      for (let i = 0; i < 6; i++) { const puff = part(grill, new THREE.SphereGeometry(0.16 + i * 0.05, 10, 8), smoke, [0, 1.0 + i * 0.3, 0]); puff.castShadow = false; puffs.push(puff); }
      motion.push((_dt, time) => puffs.forEach((puff, i) => {
        const t = (time * mix(0.08, 0.3, mood.energy) + i / puffs.length) % 1;
        puff.position.set(Math.sin(t * 5 + i) * 0.15 + t * 0.4, 1.0 + t * 1.8, -t * 0.2);
        puff.scale.setScalar(0.6 + t * 1.6);
      }));
    } else if (a.porch === 'rockers') {
      const wood = s.material(pick(['#f3efe6', '#3a5a3a', '#6a4a2a']), { roughness: 0.7 });
      for (const [x, turn] of [[-2.6, 0.3], [1.5, 0]] as const) {
        const rocker = new THREE.Group();
        rocker.position.set(x, FLOOR, -4.75);
        rocker.rotation.y = turn;
        part(rocker, new THREE.BoxGeometry(0.5, 0.05, 0.46), wood, [0, 0.45, 0]);
        part(rocker, new THREE.BoxGeometry(0.5, 0.62, 0.04), wood, [0, 0.8, -0.24], [-0.15, 0, 0]);
        for (const sx of [-0.23, 0.23]) {
          part(rocker, new THREE.TorusGeometry(0.6, 0.02, 6, 16, 0.9), wood, [sx, 0.62, 0], [0, Math.PI / 2, Math.PI * 1.5 - 0.45]);
          rodIn(rocker, [sx, 0.06, 0.18], [sx, 0.45, 0.18], 0.016, wood);
          rodIn(rocker, [sx, 0.06, -0.2], [sx, 0.45, -0.2], 0.016, wood);
        }
        root.add(rocker);
      }
      const ferns: Instance[] = [];
      for (const beam of beams) for (const x of [beam.x0 + 0.5, beam.x1 - 0.5]) {
        ferns.push({ at: [x, beam.y - 0.75, PORCH + 0.35], scale: [0.42, 0.32, 0.42], color: pick(['#4e7a3a', '#5e8a42']) });
        rodIn(root, [x, beam.y, PORCH + 0.35], [x, beam.y - 0.5, PORCH + 0.35], 0.006, s.material('#2a2a2a'));
      }
      instances(root, new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { roughness: 0.95 }), ferns);
    } else {
      // A For Sale sign tied to the railing of the last house.
      const sign = s.label('FOR SALE', 0.6, 0.4, [6.3, FLOOR + 0.55, PORCH + 0.1], '#c42a2a', '#f3efe6');
      sign.rotation.y = -0.1;
    }

    // Mourning swags on the porch beams: purple and black for the service, carnival colours once it is cut loose.
    if (!after) {
      const colours = cutloose ? ['#6a2a9a', '#e2b43a', '#2a9a4a'] : ['#4a1f6a', '#141416'];
      colours.forEach((hex, ci) => {
        const material = s.material(hex, { roughness: 0.7 });
        for (const beam of beams.slice(0, 2)) {
          const pts: P[] = [];
          const swags = 3;
          for (let i = 0; i <= swags * 8; i++) {
            const t = i / (swags * 8);
            pts.push([mix(beam.x0, beam.x1, t), beam.y + 0.12 - Math.abs(Math.sin(t * swags * Math.PI)) * (0.42 - ci * 0.1), PORCH + 0.16 + ci * 0.02]);
          }
          part(root, taperTube(pts, 0.05 - ci * 0.008, 0.05 - ci * 0.008, 48, 6).geometry, material);
        }
      });
    }

    // ── Litter on the asphalt and the sidewalks ────────────────────────────────────────
    {
      const amount = { dirge: 0.6, cutloose: 1.15, gathering: 0.3, after: 1.6 }[a.moment];
      const n = Math.round((70 + 240 * mood.density) * amount);
      const spot = (): P => {
        const r = random();
        if (r < 0.62) {
          // On the street, gathering in the gutters.
          const g = random();
          const z = g < 0.3 ? BACK + 0.05 + random() * 0.35 : g < 0.55 ? FRONT - 0.05 - random() * 0.35 : BACK + 0.2 + random() * (FRONT - BACK - 0.4);
          return [-7.6 + random() * 15.2, crown(z) + 0.006, z];
        }
        if (r < 0.82) { const z = WALK_BACK + 0.1 + random() * (BACK - WALK_BACK - 0.2); return [-7.6 + random() * 15.2, KERB + 0.006, z]; }
        const z = FRONT + 0.2 + random() * (WALK_FRONT - FRONT - 0.3);
        return [-7.6 + random() * 15.2, KERB + 0.006, z];
      };
      const flat = (scale: P, colours: readonly string[], count: number): Instance[] => Array.from({ length: count }, () => ({ at: spot(), rotation: [(random() - 0.5) * 0.3, random() * Math.PI * 2, (random() - 0.5) * 0.3] as P, scale: scale.map((v) => v * (0.7 + random() * 0.6)) as P, color: pick(colours) }));
      const white = s.material('#ffffff', { roughness: 0.85 });
      const cups = (count: number) => {
        instances(root, new THREE.CylinderGeometry(0.045, 0.034, 0.13, 10, 1, true), new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.5 }), Array.from({ length: count }, () => {
          const at = spot();
          return { at: [at[0], at[1] + 0.04, at[2]] as P, rotation: [0, random() * Math.PI * 2, Math.PI / 2] as P, color: pick(['#f3efe6', '#c42a2a', '#2a6ad8', '#f3efe6']) };
        }));
        instances(root, new THREE.CylinderGeometry(0.048, 0.048, 0.008, 12), white, flat([1, 1, 1], ['#f3efe6', '#e8eef0', '#c42a2a'], Math.round(count * 1.4)));
      };
      if (a.litter === 'petals') {
        instances(root, new THREE.SphereGeometry(0.028, 6, 4), white, flat([1, 0.18, 0.7], ['#b81e2e', '#d8304a', '#f6f3ec', '#e8a0b8', '#6a2a7a'], n));
        cups(Math.round(4 + n / 16));
      } else if (a.litter === 'confetti') {
        instances(root, new THREE.BoxGeometry(0.035, 0.003, 0.035), white, flat([1, 1, 1], ['#e8c62a', '#d8309a', '#2a8ad8', '#3ab85a', '#f0a030', '#f3efe6'], Math.round(n * 1.4)));
        const beads: Instance[] = [];
        for (let i = 0; i < Math.round(n / 25); i++) {
          const at = spot(), hue = pick(['#6a2a9a', '#e2b43a', '#2a9a4a', '#c8ccd2']), turn = random() * Math.PI * 2;
          for (let b = 0; b < 14; b++) { const t = b / 13; beads.push({ at: [at[0] + Math.cos(turn) * t * 0.5 + Math.sin(t * 6) * 0.04, at[1] + 0.012, at[2] + Math.sin(turn) * t * 0.5], scale: [0.022, 0.022, 0.022], color: hue }); }
        }
        if (beads.length) instances(root, new THREE.SphereGeometry(1, 6, 5), s.material('#ffffff', { roughness: 0.25, metalness: 0.5 }), beads);
        cups(Math.round(3 + n / 30));
      } else if (a.litter === 'programmes') {
        const programme = paint(128, 176, (c) => { c.fillStyle = '#f3efe6'; c.fillRect(0, 0, 128, 176); c.fillStyle = '#4a1f6a'; c.fillRect(10, 10, 108, 26); c.fillStyle = '#8a9ab0'; c.beginPath(); c.ellipse(64, 92, 32, 40, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#3a2e2a'; c.beginPath(); c.ellipse(64, 84, 14, 18, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#6a6a70'; for (let i = 0; i < 3; i++) c.fillRect(24, 140 + i * 10, 80, 3); });
        instances(root, new THREE.BoxGeometry(0.15, 0.004, 0.21), new THREE.MeshStandardMaterial({ map: programme, roughness: 0.9 }), flat([1, 1, 1], ['#ffffff'], Math.round(6 + n / 7)));
        instances(root, new THREE.SphereGeometry(1, 8, 4), s.material('#ffffff', { roughness: 0.8 }), flat([0.05, 0.012, 0.36], ['#5e7a3a', '#6e8a42', '#8a9a52'], Math.round(4 + n / 12)));
        cups(Math.round(2 + n / 40));
      } else {
        instances(root, new THREE.SphereGeometry(1, 6, 4), white, flat([0.035, 0.006, 0.022], ['#6a5a3a', '#7a6a42', '#5a5a32', '#8a6a3a'], n));
      }
    }

    // ── Neighbours on the porches and the sidewalk ───────────────────────────────────────
    {
      const spots = [
        { at: [-1.55, FLOOR, -4.8] as P, sit: true },
        { at: [-4.35, KERB, -3.35] as P, sit: false },
        { at: [3.3, KERB, -2.95] as P, sit: false },
        { at: [3.0, FLOOR, -4.4] as P, sit: false },
        { at: [2.3, FLOOR, -4.75] as P, sit: true },
      ];
      const count = after ? 1 + Math.round(mood.density) : Math.min(spots.length, 1 + Math.round(mood.density * 3.2) + (cutloose ? 1 : 0));
      const skins = ['#6e4630', '#8a5a3c', '#5a3a28', '#a6714b', '#3f2a1e', '#c58f62', '#dfb48f'];
      const mourning = dirge || gathering;
      const hero = slots[0];
      for (let i = 0; i < count; i++) {
        const spot = spots[i];
        const top = mourning ? pick(['#f3efe6', '#f3efe6', '#141416', '#4a1f6a']) : pick(['#e8c62a', '#e85a2a', '#2a8ad8', '#d8309a', '#3ab85a', '#f3efe6']);
        const person = figure(s, {
          height: mix(1.55, 1.85, random()), build: pick(['slight', 'average', 'heavy'] as const), style: 'doll', skin: pick(skins),
          pose: spot.sit ? 'sitting' : cutloose ? pick(['waving', 'standing', 'hands-on-hips'] as const) : pick(['standing', 'arms-crossed', 'hands-on-hips'] as const),
          hair: pick(['short', 'hat', 'cap', 'bun', 'long'] as const), hairColor: mourning ? '#141416' : pick(['#141416', '#f3efe6', '#c42a2a', '#1a1512']),
          top, bottom: mourning ? '#141416' : pick(['#3a5a8a', '#1d1c22', '#c9b07a', '#f3efe6']), shoes: '#1d1c22', sleeves: pick(['short', 'long'] as const), gaze: 'ahead',
        });
        person.root.position.set(...spot.at);
        person.root.rotation.y = Math.atan2(hero[0] - spot.at[0], hero[1] - spot.at[2]) * 0.6;
        root.add(person.root);
        if (spot.sit) {
          // The chair goes under the hips, at the sitter's own seat height.
          person.root.updateMatrixWorld(true);
          const hips = root.worldToLocal(person.pelvis.getWorldPosition(new THREE.Vector3()));
          foldingChair(hips.x, spot.at[1], hips.z - 0.04, person.root.rotation.y, false, person.hipHeight - 0.03);
        }
        if (cutloose && !spot.sit && random() < 0.7) {
          // A small parasol, twirled.
          const parasol = new THREE.Group();
          const hue = pick(['#e8c62a', '#d8309a', '#2a8ad8', '#f3efe6']);
          part(parasol, new THREE.CylinderGeometry(0.008, 0.008, 0.6, 6), s.material('#2a2320'), [0, -0.25, 0]);
          part(parasol, new THREE.ConeGeometry(0.34, 0.16, 12, 1, true), new THREE.MeshStandardMaterial({ color: hue, side: THREE.DoubleSide, roughness: 0.6 }), [0, -0.55, 0], [Math.PI, 0, 0]);
          person.hands.right.add(parasol);
        }
        motion.push((dt, time) => person.update(dt, time));
      }
    }

    // The banner ripples, the grill smokes and the neighbours breathe, all scaled by the scene's energy.
    const original = world.update;
    world.update = (dt: number, time: number) => {
      original?.(dt, time);
      for (const step of motion) step(dt, time);
    };
    return world;
  },
});
