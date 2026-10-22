import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, choice, defineWorld, disposeTree, mix } from '@conjure/kit';
import { PAINT, bladeGeometry, fret, glyph, lerpHex, paintCanvas, prism, stone, stoneTone, textured, weather } from './maya';

type P2 = [number, number];
type P3 = [number, number, number];

// The playing alley runs along z between the two side structures; the end zones widen it into an I.
const A = 3.6, Z0 = -11, Z1 = 7, EZ = 11.6, ZF = -17, MID = (Z0 + Z1) / 2, LEN = Z1 - Z0;
const SLOTS = [
  { x: 0, z: 5.6, h: 5, r: 2.6, want: 2.7 },
  { x: -1.9, z: -1.6, h: 3.8, r: 1.6, want: 2.0 },
  { x: 2.0, z: 1.0, h: 3.6, r: 1.5, want: 1.9 },
  { x: 0.3, z: -8.2, h: 4.4, r: 2.0, want: 2.4 },
  { x: 3.5, z: 9.4, h: 2.2, r: 1.1, want: 1.4 },
] as const;

interface Court { profile: P2[]; wall: { u: number; y0: number; y1: number; slab?: boolean }; rows: P2[]; ringY: number; back: number; top: number; apron?: { u0: number; y0: number; u1: number; y1: number } }

function court(kind: 'talud' | 'sheer' | 'stepped'): Court {
  if (kind === 'talud') return {
    profile: [[A, 0], [A, 0.5], [A + 0.5, 0.5], [A + 3.0, 2.3], [A + 3.0, 4.4], [A + 4.4, 4.4], [A + 4.4, 5.0], [A + 5.3, 5.0], [A + 5.3, 5.6], [A + 6.2, 5.6], [A + 6.2, 6.2], [A + 7.4, 6.2], [A + 7.4, 0]],
    wall: { u: A + 3.0, y0: 2.3, y1: 4.4 }, rows: [[A + 3.7, 4.4], [A + 4.85, 5.0], [A + 5.75, 5.6], [A + 6.8, 6.2]], ringY: 3.55, back: A + 7.4, top: 6.2,
    apron: { u0: A + 0.5, y0: 0.5, u1: A + 3.0, y1: 2.3 },
  };
  if (kind === 'sheer') return {
    profile: [[A, 0], [A, 0.8], [A + 1.3, 1.25], [A + 1.3, 5.6], [A + 2.9, 5.6], [A + 2.9, 6.2], [A + 3.9, 6.2], [A + 3.9, 6.8], [A + 5.6, 6.8], [A + 5.6, 0]],
    wall: { u: A + 1.3, y0: 1.25, y1: 5.6 }, rows: [[A + 2.1, 5.6], [A + 3.4, 6.2], [A + 4.7, 6.8]], ringY: 4.5, back: A + 5.6, top: 6.8,
    apron: { u0: A, y0: 0.8, u1: A + 1.3, y1: 1.25 },
  };
  const profile: P2[] = [[A, 0], [A, 0.6]], rows: P2[] = [];
  let u = A, y = 0.6;
  for (let i = 0; i < 6; i++) { rows.push([u + 0.5, y]); u += 1; profile.push([u, y]); y += 0.68; profile.push([u, y]); }
  rows.push([u + 0.7, y]); u += 1.5; profile.push([u, y], [u, 0]);
  return { profile, wall: { u: A + 3, y0: 0.6 + 3 * 0.68, y1: 5.4, slab: true }, rows, ringY: 4.2, back: u, top: y };
}

export default defineWorld({
  questions: {
    court: choice('How is the court built?', {
      talud: 'Low benches, long sloping aprons the ball can run up, a modest upper wall and stepped stands above.',
      sheer: 'Tall sheer walls rising straight from a low bench: a canyon of stone, the players dwarfed.',
      stepped: 'Stands stepping down like a stadium right to the edge of the alley.',
    }),
    far: choice('What closes the far end of the court?', {
      temple: 'A stepped platform with a steep stair and a small temple crowned by a roof comb.',
      terrace: 'A broad stair up to a terrace where a carved stela stands behind a round altar.',
      open: 'Only a low wall: beyond it, over the treetops, a distant pyramid.',
    }),
    goals: choice('What are the goals?', {
      rings: 'Stone hoops set high in the middle of each wall.',
      macaws: 'Carved macaw heads tenoned out along the top of each slope.',
      none: 'No goals: only the markers in the floor.',
    }),
    floor: choice('What is the playing floor?', {
      plaster: 'Smooth pale lime plaster with a painted centre line and three carved marker discs.',
      earth: 'Hard-packed red earth.',
      turf: 'Short green turf, as kept at an excavated site.',
      flooded: 'Plaster under a sheet of standing rainwater after a storm.',
    }),
    occasion: choice('What is happening in the court?', {
      empty: 'Nothing. Heat and silence.',
      crowd: 'A game day: spectators packed along the stands.',
      rite: 'A rite before the game: braziers smoking down the alley and a line of marigold petals on the centre line.',
      dig: 'An excavation: string grids, ladders against the wall, crates and a shade tarp.',
    }),
    paint: choice('If the stucco is still painted, what colour dominates?', {
      red: 'Deep red walls with cream trim.',
      cream: 'Cream walls with red and blue bands.',
      blue: 'Maya blue walls with red trim.',
      ochre: 'Golden ochre walls.',
    }),
    jungle: choice('What forest crowds the rim?', {
      ceiba: 'Great pale-trunked ceiba trees with flaring buttress roots and umbrella crowns.',
      broadleaf: 'A dense dark wall of broadleaf jungle, no trunks visible.',
      palms: 'Tall leaning palms above lower scrub.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const wear = mood.wear;
    const fresh = Math.max(0, Math.min(1, 1.15 - wear * 1.5));
    const festive = fresh * (0.35 + 0.65 * mood.cheer);
    const base = stoneTone(wear);
    const main = { red: PAINT.red, cream: PAINT.cream, blue: PAINT.blue, ochre: PAINT.ochre }[a.paint];
    const trim = a.paint === 'red' || a.paint === 'ochre' ? PAINT.cream : PAINT.red;
    const C = court(a.court);
    const put = <M extends THREE.Object3D>(node: M, parent: THREE.Object3D = root) => { parent.add(node); return node; };
    const solid = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: P3 = [0, 0, 0]) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); return mesh; };
    const box = (size: P3, at: P3, material: THREE.Material | THREE.Material[]) => solid(new THREE.BoxGeometry(...size), material, at);
    const std = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...options });

    // ---- light: hard sun from high overhead, swinging across the alley with the time of day
    const sky = new THREE.Color(lerpHex('#dde8ec', '#f0e8d2', mood.warmth)).lerp(new THREE.Color('#f4f3ea'), 0.25);
    root.add(new THREE.HemisphereLight('#f4f6ff', lerpHex('#6c7358', '#8a7c5c', mood.warmth), 1.25));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.14, 0.09, mood.warmth), 0.45, 0.9), 3.3);
    const swing = (mood.daylight - 0.5) * 2;
    key.target.position.set(0, 0, -6);
    key.position.set(-5 + swing * 26, 30 - Math.abs(swing) * 13, 12).add(key.target.position);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const shadow = key.shadow.camera;
    shadow.left = shadow.bottom = -30; shadow.right = shadow.top = 30; shadow.near = 1; shadow.far = 110; shadow.updateProjectionMatrix();
    key.shadow.bias = -0.0006; key.shadow.normalBias = 0.06;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#dfe8f2', 0.55); fill.position.set(6, 10, 30); root.add(fill);

    // ---- floor: one plane painted with the I of the court and the forest floor around it
    const FS = 72, FZ = -8, PX = 1024 / FS;
    const floorTone = a.floor === 'earth' ? lerpHex('#b9744c', '#8f7a62', wear * 0.5) : a.floor === 'turf' ? lerpHex('#8fae58', '#6f8a4a', wear * 0.6) : lerpHex('#eae2cc', '#a9a594', wear * 0.8);
    const floorArt = paintCanvas(1024, 1024, (ctx, w, h) => {
      const X = (x: number) => (x + FS / 2) * PX, Z = (z: number) => (z - FZ + FS / 2) * PX;
      ctx.fillStyle = lerpHex('#55703c', '#6f7a44', mood.warmth * 0.6); ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${40 + random() * 60},${70 + random() * 70},${30 + random() * 30},0.35)`; ctx.beginPath(); ctx.arc(random() * w, random() * h, 3 + random() * 12, 0, 7); ctx.fill(); }
      const zones: [number, number, number, number][] = [[-A - 0.2, Z0 - 0.5, A + 0.2, Z1 + 0.5], [-EZ, ZF, EZ, Z0], [-EZ, Z1, EZ, Z1 + 21]];
      ctx.fillStyle = floorTone;
      for (const [x0, z0, x1, z1] of zones) ctx.fillRect(X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0));
      ctx.save(); ctx.beginPath(); for (const [x0, z0, x1, z1] of zones) ctx.rect(X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0)); ctx.clip();
      for (let i = 0; i < 1400; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(60,45,30,0.06)' : 'rgba(255,250,235,0.08)'; const size = 2 + random() * 12; ctx.fillRect(random() * w, random() * h, size, size * (0.4 + random())); }
      if (a.floor === 'turf') for (let i = 0; i < 700; i++) { ctx.fillStyle = `rgba(${90 + random() * 60},${130 + random() * 60},${50 + random() * 30},0.3)`; ctx.fillRect(random() * w, random() * h, 2 + random() * 6, 5 + random() * 10); }
      if (a.floor !== 'turf') {
        // Painted lines and the three carved markers down the centre.
        const ink = lerpHex(floorTone, a.floor === 'earth' ? '#f1e6cf' : PAINT.red, 0.25 + fresh * 0.7);
        ctx.fillStyle = ink;
        ctx.fillRect(X(-0.09), Z(Z0), X(0.09) - X(-0.09), Z(Z1) - Z(Z0));
        for (const x of [-A + 0.25, A - 0.4]) ctx.fillRect(X(x), Z(Z0), 0.15 * PX, Z(Z1) - Z(Z0));
        for (const z of [Z0, Z1]) ctx.fillRect(X(-A), Z(z) - 1, X(A) - X(-A), 3);
      }
      for (const z of [-8, -2, 4]) {
        ctx.fillStyle = lerpHex(base, '#6d665a', 0.35); ctx.beginPath(); ctx.arc(X(0), Z(z), 0.62 * PX, 0, 7); ctx.fill();
        ctx.strokeStyle = '#2f2823'; ctx.lineWidth = 1.5;
        for (const r of [0.6, 0.42]) { ctx.beginPath(); ctx.arc(X(0), Z(z), r * PX, 0, 7); ctx.stroke(); }
        ctx.fillStyle = lerpHex(base, PAINT.red, fresh * 0.7); ctx.beginPath(); ctx.arc(X(0), Z(z), 0.22 * PX, 0, 7); ctx.fill();
      }
      if (a.floor === 'flooded') {
        for (let i = 0; i < 16; i++) {
          const x = (random() - 0.5) * (i < 9 ? A * 1.7 : EZ * 1.7), z = i < 9 ? Z0 + random() * LEN : (random() < 0.5 ? ZF + random() * 5 : Z1 + random() * 3);
          const pool = ctx.createRadialGradient(X(x), Z(z), 2, X(x), Z(z), (2 + random() * 3.2) * PX);
          pool.addColorStop(0, 'rgba(120,150,160,0.85)'); pool.addColorStop(0.8, 'rgba(140,168,172,0.75)'); pool.addColorStop(1, 'rgba(140,168,172,0)');
          ctx.fillStyle = pool; ctx.save(); ctx.translate(X(x), Z(z)); ctx.scale(1, 1.8); ctx.translate(-X(x), -Z(z)); ctx.fillRect(0, -h, w, h * 3); ctx.restore();
        }
      }
      // The forest comes back in from the edges: grass in the cracks, leaf litter, moss.
      if (wear > 0.3) {
        const amount = (wear - 0.3) / 0.7;
        ctx.strokeStyle = 'rgba(40,34,26,0.6)';
        for (let i = 0; i < amount * 26; i++) { let x = X((random() - 0.5) * EZ * 2), z = Z(ZF + random() * 34); ctx.lineWidth = 1 + random() * 1.5; ctx.beginPath(); ctx.moveTo(x, z); for (let k = 0; k < 8; k++) { x += (random() - 0.5) * 34; z += (random() - 0.5) * 34; ctx.lineTo(x, z); } ctx.stroke(); }
        for (let i = 0; i < amount * 520; i++) {
          const edge = random() < 0.6;
          const x = edge ? (random() < 0.5 ? -1 : 1) * (A - random() * random() * A * 1.2) : (random() - 0.5) * EZ * 2, z = ZF + random() * 40;
          ctx.fillStyle = random() < 0.75 ? `rgba(${70 + random() * 40},${110 + random() * 50},${50 + random() * 20},${0.35 + random() * 0.4})` : `rgba(${120 + random() * 50},${90 + random() * 30},40,0.5)`;
          const r = (0.12 + random() * 0.55) * PX * (0.6 + amount);
          ctx.beginPath(); ctx.ellipse(X(x), Z(z), r, r * (0.5 + random()), random() * 3, 0, 7); ctx.fill();
        }
      }
      ctx.restore();
    });
    floorArt.wrapS = floorArt.wrapT = THREE.ClampToEdgeWrapping;
    const ground = solid(new THREE.PlaneGeometry(FS, FS), new THREE.MeshStandardMaterial({ map: floorArt, roughness: a.floor === 'flooded' ? 0.45 : 0.95 }), [0, 0, FZ]);
    ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
    const skirt = solid(new THREE.PlaneGeometry(400, 400), std(lerpHex('#55703c', '#6f7a44', mood.warmth * 0.6), { roughness: 1 }), [0, -0.05, FZ]);
    skirt.rotation.x = -Math.PI / 2; skirt.castShadow = false;

    // ---- masonry
    const stucco = lerpHex(base, PAINT.cream, fresh * 0.55);
    const tile = textured(paintCanvas(512, 512, (ctx, w, h) => stone(ctx, w, h, random, { base: stucco, wear, course: 64, block: 128 })), { side: THREE.DoubleSide });
    const tintTile = (colour: string) => textured(paintCanvas(512, 512, (ctx, w, h) => stone(ctx, w, h, random, { base: lerpHex(base, colour, fresh * 0.85), wear, course: 64, block: 128 })));
    const mainTile = tintTile(main), trimTile = tintTile(trim);
    trimTile.side = THREE.DoubleSide;
    const plain = std(stucco), dark = std(lerpHex(base, '#3f3a33', 0.6));
    const sweep = (profile: P2[], z0: number, z1: number, side: number, material: THREE.Material) => {
      const mesh = solid(prism(profile, z1 - z0, 0.25), material, [0, 0, (z0 + z1) / 2]);
      mesh.rotation.y = side * Math.PI / 2;
      return mesh;
    };
    const friezeArt = (length: number, height: number) => paintCanvas(1024, Math.max(64, Math.round(1024 * height / length)), (ctx, w, h) => {
      stone(ctx, w, h, random, { base: lerpHex(base, main, fresh * 0.9), wear: 0, course: h / 4, block: h / 2 });
      const band = h * 0.2;
      ctx.fillStyle = lerpHex(base, trim, fresh * 0.9); ctx.fillRect(0, 0, w, band); ctx.fillRect(0, h - band * 0.6, w, band * 0.6);
      fret(ctx, 2, band * 0.12, w, band * 0.76, '#2c2520');
      const size = (h - band * 1.9), n = Math.floor(w / (size * 1.5));
      for (let i = 0; i < n; i++) glyph(ctx, (i + 0.25) * (w / n), band * 1.15, size, random, '#2c2520', lerpHex(base, i % 2 ? PAINT.ochre : PAINT.cream, Math.max(0.15, fresh) * 0.9));
      weather(ctx, w, h, random, wear);
    });

    for (const side of [-1, 1]) {
      sweep(C.profile, Z0, Z1, side, tile);
      const wallH = C.wall.y1 - C.wall.y0;
      if (C.wall.slab) {
        box([0.7, wallH, 3], [side * (C.wall.u + 0.35), C.wall.y0 + wallH / 2, MID], mainTile);
        box([0.9, 0.25, 3.3], [side * (C.wall.u + 0.35), C.wall.y1 + 0.12, MID], plain);
      } else {
        const art = textured(friezeArt(LEN, wallH - 0.3), { bumpScale: 1.6 });
        box([0.1, wallH - 0.3, LEN - 0.3], [side * (C.wall.u - 0.04), C.wall.y0 + (wallH - 0.3) / 2 + 0.05, MID], [art, art, plain, plain, plain, plain]);
        box([0.5, 0.3, LEN + 0.2], [side * (C.wall.u + 0.1), C.wall.y1 + 0.02, MID], plain);
      }
      // Bench front: a painted dado.
      const benchH = C.profile[1][1];
      box([0.08, benchH - 0.06, LEN - 0.2], [side * (A - 0.03), benchH / 2, MID], trimTile);
      // End faces of the structure get a cornice so the I-shape reads.
      for (const z of [Z0, Z1]) box([C.back - A - 0.2, 0.25, 0.3], [side * (A + C.back) / 2, C.top + 0.1, z], plain).visible = a.court !== 'stepped';

      if (a.goals === 'rings') {
        const fallen = wear > 0.8 && side > 0;
        const stoneRing = std(lerpHex(base, trim, fresh * 0.8), { roughness: 0.85 });
        const ring = solid(new THREE.TorusGeometry(0.62, 0.17, 8, 28), stoneRing);
        if (fallen) { ring.position.set(side * (A - 1.1), 0.2, MID + 1.6); ring.rotation.set(Math.PI / 2 - 0.2, 0, 0.4); }
        else { ring.position.set(side * (C.wall.u - 0.95), C.ringY, MID); ring.rotation.y = Math.PI / 2; }
        box([fallen ? 0.35 : 0.9, 0.3, 0.28], [side * (C.wall.u - (fallen ? 0.12 : 0.4)), C.ringY, MID], stoneRing);
      } else if (a.goals === 'macaws') {
        const u = C.apron ? C.apron.u1 - 0.35 : C.wall.u - 0.3, y = C.apron ? C.apron.y1 + 0.02 : C.wall.y0 + 0.4;
        for (const z of [Z0 + 3, MID, Z1 - 3]) {
          if (wear > 0.6 && random() < wear - 0.5) continue;
          const head = std(lerpHex(base, PAINT.red, fresh * 0.9));
          box([0.75, 0.5, 0.45], [side * (u - 0.2), y + 0.15, z], head);
          const beak = solid(new THREE.ConeGeometry(0.2, 0.55, 5), std(lerpHex(base, PAINT.ochre, fresh * 0.9)), [side * (u - 0.72), y + 0.05, z]);
          beak.rotation.z = side * 2.2;
          for (const dz of [-0.24, 0.24]) solid(new THREE.SphereGeometry(0.09, 8, 6), std('#2a2420'), [side * (u - 0.35), y + 0.25, z + dz]);
        }
      }
      // Low walls round the far end zone.
      box([1.2, 2.8, Z0 - ZF + 1.2], [side * (EZ + 0.6), 1.4, (Z0 + ZF) / 2 - 0.6], tile);
      box([1.5, 0.25, Z0 - ZF + 1.4], [side * (EZ + 0.6), 2.9, (Z0 + ZF) / 2 - 0.6], plain);
    }

    // ---- far end
    const topY = (() => {
      if (a.far === 'open') {
        for (const side of [-1, 1]) { box([EZ - 2.5, 1.3, 1.2], [side * (EZ + 2.5) / 2 + side * 0.6, 0.65, ZF - 0.6], tile); box([1.4, 2.2, 1.4], [side * 3.4, 1.1, ZF - 0.6], plain); }
        // The distant pyramid, hazed toward the sky.
        const haze = (colour: string) => std(new THREE.Color(colour).lerp(sky, 0.32), { roughness: 1 });
        const far = haze(lerpHex(base, main, fresh * 0.5)), px = 5, pz = -62;
        for (let i = 0; i < 9; i++) box([30 - i * 2.9, 2.2, 30 - i * 2.9], [px, 1.1 + i * 2.2, pz], far);
        box([3.4, 20, 1.2], [px, 9.8, pz + 15.2 - 4.4], haze(stucco)).rotation.x = -0.6;
        box([6, 3, 5], [px, 21.3, pz], haze(lerpHex(base, trim, fresh * 0.5)));
        box([4.6, 2.6, 0.9], [px, 24, pz - 0.6], far);
        return 3;
      }
      const tiers: [number, number, number, number][] = a.far === 'temple' ? [[17, 1.5, 6.5, -19.6], [13, 1.5, 5, -20], [9.4, 1.3, 3.8, -20.3]] : [[19, 1.5, 7, -19.8], [16, 1.5, 5.4, -20.3]];
      let y = 0;
      for (const [w, h, d, z] of tiers) { box([w, h, d], [0, y + h / 2, z], tile); box([w + 0.3, 0.22, d + 0.3], [0, y + h - 0.02, z], plain); y += h; }
      const width = a.far === 'temple' ? 3.6 : 9, n = Math.round(y / 0.3), rise = y / n, run = a.far === 'temple' ? 0.33 : 0.42;
      const zTop = tiers[tiers.length - 1][3] + tiers[tiers.length - 1][2] / 2, profile: P2[] = [[zTop - 0.2, 0], [zTop + n * run, 0]];
      for (let i = 0; i < n; i++) profile.push([zTop + (n - i) * run, (i + 1) * rise], [zTop + (n - i - 1) * run, (i + 1) * rise]);
      profile.push([zTop - 0.2, y]);
      solid(prism(profile, width, 0.25), tile);
      for (const side of [-1, 1]) solid(prism([[zTop - 0.2, 0], [zTop + n * run + 0.5, 0], [zTop + n * run + 0.5, 0.5], [zTop + 0.3, y + 0.4], [zTop - 0.2, y + 0.4]], 0.6, 0.25), trimTile, [side * (width / 2 + 0.3), 0, 0]);
      const zc = tiers[tiers.length - 1][3] - 0.3;
      if (a.far === 'temple') {
        box([5.4, 2.6, 2.6], [0, y + 1.3, zc], mainTile);
        box([1.4, 1.9, 0.3], [0, y + 0.95, zc + 1.2], std('#231d1a'));
        box([1.9, 0.3, 0.4], [0, y + 2.05, zc + 1.25], plain);
        const roof = solid(new THREE.CylinderGeometry(2.9, 3.9, 1, 4, 1), trimTile, [0, y + 3.1, zc]); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.62;
        const combH = wear > 0.7 ? 1.1 + random() * 0.6 : 2.6;
        const comb = textured(paintCanvas(512, 256, (ctx, w, h) => {
          stone(ctx, w, h, random, { base: lerpHex(base, main, fresh * 0.9), wear: 0 });
          ctx.fillStyle = '#231d1a'; for (let row = 0; row < 3; row++) for (let col = 0; col < 9; col++) ctx.fillRect(28 + col * 54 + (row % 2) * 12, 30 + row * 74, 22, 44);
          weather(ctx, w, h, random, wear);
        }));
        box([4.4, combH, 0.6], [0, y + 3.6 + combH / 2, zc - 0.3], [plain, plain, plain, plain, comb, comb]);
        return y + 3.6 + combH;
      }
      const stela = textured(paintCanvas(256, 640, (ctx, w, h) => {
        stone(ctx, w, h, random, { base: lerpHex(base, trim, fresh * 0.6), wear: 0 });
        ctx.strokeStyle = '#2c2520'; ctx.lineWidth = 8; ctx.strokeRect(14, 14, w - 28, h - 28);
        for (let row = 0; row < 6; row++) for (let col = 0; col < 2; col++) glyph(ctx, 34 + col * 96, 34 + row * 96, 92, random, '#2c2520', lerpHex(base, PAINT.cream, Math.max(0.15, fresh) * 0.8));
        weather(ctx, w, h, random, wear);
      }), { bumpScale: 2 });
      const slab = box([1.6, 4, 0.5], [0, y + 2, zc - 0.4], [plain, plain, plain, plain, stela, stela]);
      slab.rotation.z = wear > 0.6 ? (random() - 0.5) * 0.24 : 0;
      solid(new THREE.CylinderGeometry(1, 1.05, 0.55, 20), trimTile, [0, y + 0.28, zc + 1.3]);
      return y + 4;
    })();
    void topY;

    // ---- jungle
    const leafBase = ['#3d7a3a', '#55893c', '#2f6634', '#739c45', '#467f4a'].map((tint) => lerpHex(lerpHex(tint, '#8a9a3c', mood.warmth * 0.35), '#5f6e52', (1 - mood.cheer) * 0.3));
    const blobs: { p: THREE.Vector3; s: THREE.Vector3; c: THREE.Color }[] = [];
    const fronds: { p: THREE.Vector3; r: THREE.Euler; s: number; c: THREE.Color }[] = [];
    const leaf = (distance = 0) => new THREE.Color(leafBase[Math.floor(random() * leafBase.length)]).lerp(sky, distance);
    const bark = std(a.jungle === 'ceiba' ? '#b3ad98' : a.jungle === 'palms' ? '#8d795c' : '#5e4b37', { roughness: 1 });
    const tree = (x: number, y: number, z: number, h: number, kind: typeof a.jungle, distance = 0) => {
      const r = h * (kind === 'ceiba' ? 0.055 : kind === 'palms' ? 0.022 : 0.04);
      const trunkH = h * (kind === 'broadleaf' ? 0.45 : kind === 'palms' ? 0.95 : 0.68);
      const trunk = solid(new THREE.CylinderGeometry(r * 0.65, r, trunkH, 7), bark, [x, y + trunkH / 2, z]);
      const lean = kind === 'palms' ? (random() - 0.5) * 0.35 : (random() - 0.5) * 0.06;
      trunk.rotation.z = lean;
      const tx = x - Math.sin(lean) * trunkH / 2 * 2 * 0.5, ty = y + trunkH;
      if (kind === 'ceiba') for (let i = 0; i < 5; i++) { const t = i / 5 * Math.PI * 2 + random(); const fin = solid(new THREE.ConeGeometry(r * 2.6, h * 0.22, 3), bark, [x + Math.cos(t) * r * 1.3, y + h * 0.1, z + Math.sin(t) * r * 1.3]); fin.scale.z = 0.25; fin.rotation.y = -t; }
      if (kind === 'palms') {
        for (let i = 0; i < 11; i++) fronds.push({ p: new THREE.Vector3(tx, ty, z), r: new THREE.Euler(0.5 + random() * 0.9, i / 11 * Math.PI * 2 + random() * 0.3, 0, 'YXZ'), s: h * (0.3 + random() * 0.1), c: leaf(distance) });
        return;
      }
      const spread = h * (kind === 'ceiba' ? 0.42 : 0.3), n = kind === 'ceiba' ? 8 : 9;
      for (let i = 0; i < n; i++) {
        const t = random() * Math.PI * 2, d = Math.sqrt(random()) * spread;
        const size = h * (0.16 + random() * 0.12);
        blobs.push({ p: new THREE.Vector3(tx + Math.cos(t) * d, kind === 'ceiba' ? ty + h * 0.08 + random() * h * 0.14 : y + h * (0.4 + random() * 0.55), z + Math.sin(t) * d), s: new THREE.Vector3(size * 1.15, size * (kind === 'ceiba' ? 0.62 : 0.9), size * 1.15), c: leaf(distance) });
      }
    };
    for (const side of [-1, 1]) {
      for (let i = 0; i < 12; i++) {
        const z = -30 + i * 3.4 + random() * 1.5;
        tree(side * (Math.max(C.back, z < Z0 ? EZ + 1.2 : 0) + 2.2 + random() * 7), 0, z, 11 + random() * 7, i % 4 === 3 && a.jungle !== 'broadleaf' ? 'broadleaf' : a.jungle, random() * 0.15);
      }
      // Scrub leaning over the back of the stands: the forest crowding the rim.
      for (let i = 0; i < 16; i++) { const size = 1.1 + random() * 1.5; blobs.push({ p: new THREE.Vector3(side * (C.back + 0.3 + random() * 1.6), C.top - 0.6 + random() * 2.2, Z0 - 3 + random() * (LEN + 4)), s: new THREE.Vector3(size, size * 0.8, size), c: leaf() }); }
    }
    for (let i = 0; i < 11; i++) {
      const x = -24 + i * 4.8 + random() * 2;
      if (a.far === 'open' && Math.abs(x - 5) < 12) { for (let k = 0; k < 3; k++) { const size = 2 + random() * 1.6; blobs.push({ p: new THREE.Vector3(x + (random() - 0.5) * 4, 1.5 + random() * 2.2, -24 - random() * 6), s: new THREE.Vector3(size * 1.3, size * 0.8, size), c: leaf(0.12) }); } continue; }
      tree(x, 0, -27 - random() * 8, 12 + random() * 7, a.jungle === 'palms' && i % 2 ? 'palms' : a.jungle === 'palms' ? 'broadleaf' : a.jungle, 0.14 + random() * 0.1);
    }
    for (let i = 0; i < 14; i++) { const size = 1.4 + random() * 1.8; blobs.push({ p: new THREE.Vector3((random() - 0.5) * 34, 1 + random() * 2.4, ZF - 3.6 - random() * 2.5), s: new THREE.Vector3(size * 1.2, size * 0.8, size), c: leaf(0.08) }); }

    // The ruin: trees and roots on the structures, scrub on the slopes, fallen blocks.
    const rootBark = std('#7b6a52', { roughness: 1 });
    if (wear > 0.42) {
      const growth = (wear - 0.42) / 0.58;
      for (const side of [-1, 1]) {
        const n = Math.round(growth * (1.2 + mood.density * 2));
        for (let i = 0; i < n; i++) {
          const row = C.rows[Math.floor(random() * C.rows.length)], z = Z0 + 1 + random() * 11;
          const h = 4.5 + random() * 4 * growth;
          tree(side * row[0], row[1], z, h, a.jungle === 'palms' && random() < 0.5 ? 'palms' : a.jungle === 'palms' ? 'broadleaf' : a.jungle);
          if (wear > 0.62) for (let k = 0; k < 3; k++) {
            // Roots pour down the wall and across the slope to the floor.
            const zz = z + (k - 1) * 0.5, path: THREE.Vector3[] = [new THREE.Vector3(side * row[0], row[1] + 0.5, z)];
            path.push(new THREE.Vector3(side * (C.wall.u + 0.2), C.wall.y1 + 0.25, zz + (random() - 0.5) * 0.4));
            path.push(new THREE.Vector3(side * (C.wall.u - 0.16), (C.wall.y0 + C.wall.y1) / 2, zz + (random() - 0.5) * 0.8));
            if (C.apron) path.push(new THREE.Vector3(side * (C.apron.u1 - 0.2), C.apron.y1 + 0.1, zz + (random() - 0.5) * 0.9), new THREE.Vector3(side * ((C.apron.u0 + C.apron.u1) / 2), (C.apron.y0 + C.apron.y1) / 2 + 0.1, zz + (random() - 0.5) * 1.4));
            path.push(new THREE.Vector3(side * (A - 0.15), C.profile[1][1] + 0.08, zz + (random() - 0.5) * 1.8), new THREE.Vector3(side * (A - 0.5 - random() * 0.8), 0.02, zz + (random() - 0.5) * 2.2));
            const tubeMesh = solid(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 40, 0.09 + random() * 0.09, 6), rootBark); void tubeMesh;
          }
        }
        for (let i = 0; i < growth * 22; i++) {
          const size = 0.4 + random() * 0.9 * growth, z = Z0 + random() * LEN;
          if (C.apron && random() < 0.6) { const t = random(); blobs.push({ p: new THREE.Vector3(side * mix(C.apron.u0, C.apron.u1, t), mix(C.apron.y0, C.apron.y1, t) + size * 0.3, z), s: new THREE.Vector3(size, size * 0.6, size), c: leaf() }); }
          else { const row = C.rows[Math.floor(random() * C.rows.length)]; blobs.push({ p: new THREE.Vector3(side * (row[0] + (random() - 0.5) * 0.6), row[1] + size * 0.3, z), s: new THREE.Vector3(size, size * 0.7, size), c: leaf() }); }
        }
        // Vines hang over the lip of the wall.
        for (let i = 0; i < growth * 34; i++) fronds.push({ p: new THREE.Vector3(side * (C.wall.u - 0.12), C.wall.y1 + 0.1, C.wall.slab ? MID + (random() - 0.5) * 3 : Z0 + random() * LEN), r: new THREE.Euler(Math.PI - 0.05 + random() * 0.1, side * Math.PI / 2, 0, 'YXZ'), s: 0.8 + random() * (C.wall.y1 - C.wall.y0 - 0.6), c: leaf() });
      }
      const rubble = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.6, 0.7), std(lerpHex(base, '#77705f', 0.3)), Math.round(growth * (14 + mood.density * 26)));
      const dummy = new THREE.Object3D();
      for (let i = 0; i < rubble.count; i++) {
        const side = random() < 0.5 ? -1 : 1, size = 0.3 + random() * 0.55;
        const onSlope = C.apron && random() < 0.35, t = random();
        if (onSlope && C.apron) dummy.position.set(side * mix(C.apron.u0, C.apron.u1, t), mix(C.apron.y0, C.apron.y1, t) + size * 0.2, Z0 + random() * LEN);
        else dummy.position.set(side * (A - 0.3 - random() * random() * 2.2), size * 0.25, random() < 0.8 ? Z0 + random() * LEN : ZF + random() * 5);
        dummy.rotation.set(random() * 0.6, random() * 3, random() * 0.6); dummy.scale.setScalar(size); dummy.updateMatrix();
        rubble.setMatrixAt(i, dummy.matrix);
      }
      rubble.castShadow = rubble.receiveShadow = true; put(rubble);
      if (a.far !== 'open') tree(-5.5 + random() * 2, 1.5, -19.5, 7 + growth * 5, a.jungle === 'palms' ? 'broadleaf' : a.jungle);
    }
    const dummy = new THREE.Object3D();
    if (blobs.length) {
      const canopy = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), blobs.length);
      blobs.forEach((blob, index) => { dummy.position.copy(blob.p); dummy.rotation.set(random() * 3, random() * 3, 0); dummy.scale.copy(blob.s); dummy.updateMatrix(); canopy.setMatrixAt(index, dummy.matrix); canopy.setColorAt(index, blob.c); });
      canopy.castShadow = canopy.receiveShadow = true; canopy.frustumCulled = false; put(canopy);
    }
    if (fronds.length) {
      const palm = new THREE.InstancedMesh(bladeGeometry(1, 0.2, 1.5, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide }), fronds.length);
      fronds.forEach((frond, index) => { dummy.position.copy(frond.p); dummy.rotation.copy(frond.r); dummy.scale.set(frond.s * 1.2, frond.s, frond.s); dummy.updateMatrix(); palm.setMatrixAt(index, dummy.matrix); palm.setColorAt(index, frond.c); });
      palm.castShadow = true; palm.frustumCulled = false; put(palm);
    }

    // ---- festival dressing, by how fresh and how glad the day is
    const swaying: { node: THREE.Object3D; phase: number }[] = [];
    const cloths = [PAINT.red, PAINT.ochre, PAINT.blue, PAINT.green, PAINT.cream];
    const bannerCount = Math.round(festive * 6) + (a.occasion === 'crowd' && fresh > 0.2 ? 2 : 0);
    for (const side of [-1, 1]) {
      for (let i = 0; i < bannerCount; i++) {
        const z = Z0 + (i + 0.5) / bannerCount * LEN + (random() - 0.5) * 0.6, length = Math.min(C.wall.y1 - C.wall.y0 - 0.3, 2.4) * (0.6 + fresh * 0.4) * (0.8 + random() * 0.2);
        if (C.wall.slab && Math.abs(z - MID) > 1.4) continue;
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.15, length, 1, 4), new THREE.MeshStandardMaterial({ color: lerpHex(cloths[Math.floor(random() * cloths.length)], '#9a927f', wear * 0.6), roughness: 0.9, side: THREE.DoubleSide }));
        cloth.geometry.translate(0, -length / 2, 0);
        cloth.position.set(side * (C.wall.u - 0.2), C.wall.y1 - 0.05, z); cloth.rotation.y = side * Math.PI / 2; cloth.castShadow = true;
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.22), new THREE.MeshStandardMaterial({ color: lerpHex(cloths[Math.floor(random() * cloths.length)], '#9a927f', wear * 0.6), roughness: 0.9, side: THREE.DoubleSide }));
        stripe.position.set(0, -length + 0.3, 0.01 * -side); cloth.add(stripe);
        put(cloth); swaying.push({ node: cloth, phase: random() * 6 });
      }
      if (festive > 0.3) for (let i = 0; i < 3; i++) {
        // Feather standards along the top of the stands.
        const z = Z0 + 2.5 + i * (LEN - 5) / 2, row = C.rows[C.rows.length - 1];
        solid(new THREE.CylinderGeometry(0.05, 0.06, 3.4, 6), std('#7a5230'), [side * (row[0] + 0.3), row[1] + 1.7, z]);
        for (let k = 0; k < 9; k++) { const feather = solid(bladeGeometry(1.5, 0.22, -0.5, 5), new THREE.MeshStandardMaterial({ color: k % 3 ? '#16936a' : PAINT.ochre, roughness: 0.6, side: THREE.DoubleSide }), [side * (row[0] + 0.3), row[1] + 3.2, z]); feather.rotation.set(0, 0, (k - 4) * 0.36); feather.rotation.y = side * 0.3; }
        solid(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 16), std(cloths[i % cloths.length]), [side * (row[0] + 0.3), row[1] + 3.2, z + 0.02]).rotation.x = Math.PI / 2;
      }
    }
    if (a.occasion === 'crowd') {
      const seats: P3[] = [];
      for (const side of [-1, 1]) for (const [u, y] of C.rows) for (let z = Z0 + 0.5; z < Z1 - 0.3; z += 0.72) if (random() < 0.25 + mood.density * 0.7) seats.push([side * (u + (random() - 0.5) * 0.3), y, z + (random() - 0.5) * 0.2]);
      const robe = new THREE.CylinderGeometry(0.2, 0.3, 0.95, 7); robe.translate(0, 0.475, 0);
      const head = new THREE.SphereGeometry(0.17, 8, 6); head.translate(0, 1.12, 0);
      const hat = new THREE.CylinderGeometry(0.2, 0.14, 0.14, 7); hat.translate(0, 1.3, 0);
      const bodies = new THREE.InstancedMesh(mergeGeometries([robe, hat])!, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), seats.length);
      const heads = new THREE.InstancedMesh(head, std('#9a6a48'), seats.length);
      const tints = ['#f1e9d6', '#f1e9d6', PAINT.red, PAINT.ochre, PAINT.blue, PAINT.green, '#e9dcbd'].map((tint) => lerpHex(tint, '#8f8a7c', wear * 0.5 + (1 - mood.cheer) * 0.2));
      seats.forEach((seat, index) => {
        dummy.position.set(...seat); dummy.rotation.set(0, random() * 0.6, (random() - 0.5) * 0.12); dummy.scale.setScalar(0.92 + random() * 0.25); dummy.updateMatrix();
        bodies.setMatrixAt(index, dummy.matrix); heads.setMatrixAt(index, dummy.matrix); bodies.setColorAt(index, new THREE.Color(tints[Math.floor(random() * tints.length)]));
      });
      bodies.castShadow = heads.castShadow = true; bodies.frustumCulled = heads.frustumCulled = false; put(bodies); put(heads);
      robe.dispose(); hat.dispose();
    }
    const flames: THREE.Mesh[] = [], plumes: THREE.Object3D[] = [];
    if (a.occasion === 'rite') {
      const clay = std('#a85a3a'), fire = new THREE.MeshStandardMaterial({ color: '#ffb23a', emissive: '#ff6a12', emissiveIntensity: 2, roughness: 1 });
      const smoke = new THREE.MeshBasicMaterial({ color: '#f3f1ea', transparent: true, opacity: 0.3, depthWrite: false });
      for (const side of [-1, 1]) for (const z of [-9, -5.5, 5.5]) {
        const x = side * (A - 0.9);
        solid(new THREE.LatheGeometry([[0.26, 0], [0.14, 0.16], [0.11, 0.6], [0.2, 0.82], [0.4, 1.1], [0.36, 1.12], [0.14, 0.9], [0, 0.9]].map(([px, py]) => new THREE.Vector2(px, py)), 14), clay, [x, 0, z]);
        flames.push(solid(new THREE.ConeGeometry(0.24, 0.7, 7), fire, [x, 1.42, z]));
        const column = solid(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 1.6, 0], [0.3, 3, 0.15], [-0.25, 4.6, -0.1], [0.4, 6.4, 0.2], [0.1, 8.4, 0]].map((p) => new THREE.Vector3(...p))), 20, 0.16, 6), smoke, [x, 0, z]);
        column.castShadow = column.receiveShadow = false; plumes.push(column);
      }
      const petals = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), 260);
      for (let i = 0; i < 260; i++) { dummy.position.set((random() - 0.5) * (random() < 0.8 ? 0.5 : 1.6), 0.04, Z0 + random() * LEN); dummy.rotation.set(random() * 3, random() * 3, 0); dummy.scale.setScalar(0.7 + random() * 0.8); dummy.updateMatrix(); petals.setMatrixAt(i, dummy.matrix); petals.setColorAt(i, new THREE.Color(random() < 0.7 ? '#f29a1f' : '#f7d038')); }
      petals.castShadow = true; put(petals);
    } else if (a.occasion === 'dig') {
      const cord = std('#f2efe4'), wood = std('#b08a55'), stake = std('#d9482e');
      for (let i = 0; i <= 3; i++) { box([0.03, 0.03, 6], [-A + 0.6 + i * 1.5, 0.28, -7.5], cord); box([4.5, 0.03, 0.03], [-A + 2.85, 0.28, -10.5 + i * 2], cord); for (const z of [-10.5, -4.5]) box([0.06, 0.5, 0.06], [-A + 0.6 + i * 1.5, 0.25, z], stake); }
      const ladderX = C.apron ? C.apron.u0 + 0.3 : A + 0.4, lean = C.apron ? 0.75 : 0.22, length = C.apron ? 6.2 : 5.6;
      const ladder = new THREE.Group();
      for (const dz of [-0.28, 0.28]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, length, 0.07), wood); rail.position.set(0, length / 2, dz); rail.castShadow = true; ladder.add(rail); }
      for (let i = 1; i < 14; i++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.56), wood); rung.position.y = i * length / 14; rung.castShadow = true; ladder.add(rung); }
      ladder.position.set(ladderX, C.profile[1][1], 2.5); ladder.rotation.z = -lean; put(ladder);
      for (let i = 0; i < 4; i++) box([0.9, 0.55, 0.6], [A - 1.1 - (i % 2) * 0.2, 0.28 + (i > 1 ? 0.56 : 0), 4.4 + (i % 2) * 0.75], std(i % 2 ? '#c2a36c' : '#a98a58')).rotation.y = (random() - 0.5) * 0.3;
      const tarp = solid(new THREE.PlaneGeometry(4.2, 3.4, 4, 4), new THREE.MeshStandardMaterial({ color: '#3f7fb0', roughness: 0.7, side: THREE.DoubleSide }), [-A + 2.6, 2.3, -1.2]);
      tarp.rotation.set(-Math.PI / 2 + 0.12, 0, 0.05);
      for (const [dx, dz] of [[-2, -1.6], [2, -1.6], [-2, 1.6], [2, 1.6]]) solid(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), wood, [-A + 2.6 + dx, 1.2, -1.2 + dz]);
    }

    // Birds wheel over the court.
    const flock = new THREE.Group(); flock.position.set(0, 13, -8); put(flock);
    const birdCount = 2 + Math.round(mood.density * 3);
    for (let i = 0; i < birdCount; i++) {
      const bird = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.16, 3), std(wear > 0.5 ? '#2a2623' : lerpHex('#c8402e', '#2f6f8c', random())));
      bird.scale.set(1.6, 1, 0.5); const t = i / birdCount * Math.PI * 2;
      bird.position.set(Math.cos(t) * (5 + i), (i % 3) * 0.8, Math.sin(t) * (5 + i)); bird.rotation.y = -t;
      flock.add(bird);
    }

    // ---- camera: standing in the near end zone, looking down the alley
    const camera = new THREE.PerspectiveCamera(46, 1, 0.5, 260);
    camera.position.set(1.3, 7.2, 22);
    camera.lookAt(0, 2.7, -6);

    const place = (items: readonly Placeable[]) => {
      items.forEach((item, index) => {
        const slot = SLOTS[index % SLOTS.length];
        const height = Math.max(item.height, 0.05), radius = Math.max(item.radius, 0.05);
        const fit = Math.min(slot.h / height, slot.r / radius);
        // True size when it fits the court; shrunk when it does not; small things are enlarged to read at this distance.
        const scale = Math.min(fit, Math.max(1, Math.min(slot.want / height, 5)));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(slot.x, 0, slot.z);
        item.holder.rotation.y = Math.atan2(camera.position.x - slot.x, camera.position.z - slot.z) * 0.5 + (context.random() - 0.5) * 0.35;
        item.holder.updateMatrixWorld(true);
      });
      camera.updateMatrixWorld(true);
    };

    const speed = mix(0.4, 3, mood.energy), reach = mix(0.03, 0.22, mood.energy);
    return {
      object: root, camera, background: sky, capacity: SLOTS.length, ground, keyLight: key, place,
      update(_dt, time) {
        for (const item of swaying) item.node.rotation.x = Math.sin(time * speed + item.phase) * reach;
        flames.forEach((flame, index) => flame.scale.set(1 + Math.sin(time * speed * 3 + index) * 0.12, 1 + Math.sin(time * speed * 4 + index * 2) * 0.22, 1));
        plumes.forEach((plume, index) => { plume.rotation.y = Math.sin(time * speed * 0.3 + index) * 0.5; });
        flock.rotation.y = time * speed * 0.12;
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
