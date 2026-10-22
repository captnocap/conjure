import * as THREE from 'three';
import { choice, clamp01, defineWorld, diorama, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
type XZ = [number, number];
type Ctx = CanvasRenderingContext2D;

function painted(w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineWorld({
  questions: {
    pool: choice('What shape is the hot pool?', {
      plunge: 'A long rectangular plunge sunk into the floor, with step-seats all round inside.',
      round: 'A round pool like a great bowl in the floor.',
      apse: 'A half-round pool tucked against the back wall.',
    }),
    floor: choice('What is the floor made of?', {
      mosaic: 'Black and white mosaic: wave borders and swimming fish.',
      sectile: 'Cut coloured marble in squares, circles and diamonds, purple, green and gold.',
      slabs: 'Big plain slabs of grey-veined marble.',
      tile: 'Honest red terracotta tiles, a small-town bath.',
    }),
    walls: choice('How are the walls finished?', {
      marble: 'Veneered in tall panels of coloured marble above a dark dado.',
      fresco: 'Painted Pompeian red and black with thin gold borders.',
      stucco: 'White stucco with pale blue pilasters, cool and plain.',
      brick: 'Bare brick-faced concrete, never finished or long since stripped.',
    }),
    vault: choice('What is the vault overhead like?', {
      coffered: 'Deep square coffers between heavy ribs.',
      stars: 'Painted midnight blue and sprinkled with gilt stars.',
      plaster: 'Smooth pale plaster, streaked where the steam runs.',
      gold: 'Covered in gold glass mosaic that catches every light.',
    }),
    fittings: choice('What lines the side wall?', {
      benches: 'A long marble bench.',
      statues: 'Arched niches holding marble statues.',
      columns: 'A row of columns carrying a beam.',
    }),
    traces: choice('Who was here last, and what did they leave?', {
      bathers: 'Afternoon bathers: towels on the benches, sandals by the pool, a jug and cups on the rim.',
      attendants: 'Attendants before opening: a bucket, a broom, a stack of folded towels.',
      party: 'A private party: wine amphorae, garlands on the wall, a tray of cups.',
      nobody: 'Nobody for a very long time: drifted leaves and dust.',
      diggers: 'Archaeologists: a scaffold, a ladder into the pool, crates and a string grid.',
      shepherd: 'A shepherd using the ruin as a fold: hay, a hurdle fence and a dead campfire.',
    }),
    steam: score('How much steam hangs in the room?', ['Clear air', 'Wisps over the water', 'Thick rolling steam']),
  },

  build(a, context) {
    const { mood, random } = context;
    const wear = mood.wear;
    const ruin = clamp01((wear - 0.45) / 0.55);
    const W = 14, D = 11, WALL = 3.6, R = 6, yC = WALL - Math.sqrt(R * R - (D / 2) ** 2);
    const arc = (z: number) => yC + Math.sqrt(Math.max(0.01, R * R - z * z));
    const hole2 = wear > 0.62; // the floor has fallen into the hypocaust in the front right corner
    const bg = new THREE.Color('#ece6d8').lerp(new THREE.Color('#f1dcc0'), mood.warmth * 0.5).lerp(new THREE.Color('#cfd4cc'), ruin * 0.8);
    const { art: s, world } = diorama(context, {
      background: `#${bg.getHexString()}`, floor: null, width: W, depth: D, maxHeight: 2.6, radius: 1.25, pitch: 30, yaw: 31,
      slots: [[1.7, 1.9], [5.0, -0.3], [-4.8, 2.7], [-1.3, 4.1, 0, 0.8], [5.3, -3.0, 0, 0.85], [2.4, -5.02, 0.56, 0.4]],
    });
    const pick = <V,>(list: readonly V[]) => list[Math.floor(random() * list.length)];
    const aged = (hex: string, k = 0.5) => new THREE.Color(hex).lerp(new THREE.Color('#857c6a'), wear * k);
    const marble = s.material('#e6e1d4', { roughness: mix(0.25, 0.9, wear) });
    const brickMat = s.material('#a45a3c', { roughness: 1 });
    const bronze = s.material(aged('#b9823c', 0.2).lerp(new THREE.Color('#4f8f78'), wear * 0.6), { metalness: 0.7, roughness: 0.4 });
    const timber = s.material('#9c7a4c', { roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: '#191715', roughness: 1 });

    // ---- pool outline, grown or shrunk ----
    const pool = (grow: number): XZ[] => {
      if (a.pool === 'plunge') { const x0 = -5.3 - grow, x1 = -0.3 + grow, z0 = -4.5 - grow, z1 = -1.1 + grow; return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]; }
      if (a.pool === 'round') return Array.from({ length: 40 }, (_u, i) => [-2.9 + Math.cos(i / 40 * Math.PI * 2) * (2.25 + grow), -2.5 + Math.sin(i / 40 * Math.PI * 2) * (2.25 + grow)] as XZ);
      const pts: XZ[] = [];
      for (let i = 0; i <= 24; i++) { const an = Math.PI * i / 24; pts.push([-2.7 + Math.cos(an) * (2.7 + grow), -5.35 + Math.sin(an) * (2.7 + grow)]); }
      return pts;
    };
    const toShape = (pts: XZ[]) => new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const poolCentre: XZ = a.pool === 'plunge' ? [-2.8, -2.8] : a.pool === 'round' ? [-2.9, -2.5] : [-2.7, -4.2];
    const inPool = (x: number, z: number, grow = 0.5) => a.pool === 'plunge' ? x > -5.3 - grow && x < -0.3 + grow && z > -4.5 - grow && z < -1.1 + grow : a.pool === 'round' ? Math.hypot(x + 2.9, z + 2.5) < 2.25 + grow : Math.hypot(x + 2.7, z + 5.35) < 2.7 + grow;
    const inHole2 = (x: number, z: number) => hole2 && x > 3.0 && z > 2.5;
    const slotsXZ: XZ[] = [[1.7, 1.9], [5.0, -0.3], [-4.8, 2.7], [-1.3, 4.1], [5.3, -3.0]];
    const clear = (x: number, z: number, r = 1.3) => slotsXZ.every(([sx, sz]) => Math.hypot(sx - x, sz - z) > r);
    const floorSpot = (tries = 30): XZ => { for (let i = 0; i < tries; i++) { const x = (random() - 0.5) * (W - 1), z = (random() - 0.5) * (D - 1); if (!inPool(x, z, 0.5) && !inHole2(x, z) && clear(x, z)) return [x, z]; } return [6.2, -4.6]; };

    // ---- floor with its holes ----
    const floorMap = painted(1024, 800, (ctx, w, h) => {
      const X = (x: number) => (x / W + 0.5) * w, Z = (z: number) => (z / D + 0.5) * h, U = w / W;
      if (a.floor === 'mosaic') {
        ctx.fillStyle = '#e9e3d2'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#1e1c1b'; ctx.lineWidth = U * 0.16; ctx.strokeRect(U * 0.35, U * 0.35, w - U * 0.7, h - U * 0.7);
        ctx.lineWidth = U * 0.06; ctx.strokeRect(U * 0.62, U * 0.62, w - U * 1.24, h - U * 1.24);
        ctx.fillStyle = '#1e1c1b';
        for (let x = U * 0.9; x < w - U; x += U * 0.5) for (const y of [U * 0.78, h - U * 0.98]) { ctx.beginPath(); ctx.arc(x, y + U * 0.1, U * 0.14, Math.PI, 0); ctx.fill(); }
        for (let i = 0; i < 16; i++) {
          const [x, z] = floorSpot(); const turn = random() * Math.PI * 2, k = U * (0.3 + random() * 0.25);
          ctx.save(); ctx.translate(X(x), Z(z)); ctx.rotate(turn);
          ctx.beginPath(); ctx.ellipse(0, 0, k, k * 0.36, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-k * 0.8, 0); ctx.lineTo(-k * 1.4, -k * 0.45); ctx.lineTo(-k * 1.4, k * 0.45); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#e9e3d2'; ctx.beginPath(); ctx.arc(k * 0.55, -k * 0.06, k * 0.08, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1e1c1b';
          ctx.restore();
        }
        ctx.strokeStyle = 'rgba(120,112,96,0.35)'; ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 7) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y < h; y += 7) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      } else if (a.floor === 'sectile') {
        const tones = ['#7a3048', '#3f6a52', '#d9ab57', '#e6e1d4', '#9a9a97'];
        for (let i = 0; i < W; i++) for (let j = 0; j < D; j++) {
          const base = tones[(i + j * 2) % 2 === 0 ? 3 : 4], inlay = tones[(i * 3 + j) % 3];
          ctx.fillStyle = base; ctx.fillRect(i * U, j * U, U, U);
          ctx.fillStyle = inlay; ctx.beginPath();
          if ((i + j) % 2) ctx.arc((i + 0.5) * U, (j + 0.5) * U, U * 0.36, 0, Math.PI * 2);
          else { ctx.moveTo((i + 0.5) * U, (j + 0.08) * U); ctx.lineTo((i + 0.92) * U, (j + 0.5) * U); ctx.lineTo((i + 0.5) * U, (j + 0.92) * U); ctx.lineTo((i + 0.08) * U, (j + 0.5) * U); }
          ctx.fill();
          ctx.strokeStyle = '#5d564a'; ctx.lineWidth = 2; ctx.strokeRect(i * U, j * U, U, U);
        }
      } else if (a.floor === 'slabs') {
        for (let i = 0; i < 7; i++) for (let j = 0; j < 8; j++) {
          const l = 80 + random() * 9; ctx.fillStyle = `hsl(40,10%,${l}%)`; ctx.fillRect(i * U * 2, j * U * 1.375, U * 2, U * 1.375);
          ctx.strokeStyle = 'rgba(120,124,132,0.5)'; ctx.lineWidth = 1 + random() * 2;
          for (let v = 0; v < 2; v++) { ctx.beginPath(); let x = i * U * 2 + random() * U * 2, y = j * U * 1.375; ctx.moveTo(x, y); for (let q = 0; q < 4; q++) { x += (random() - 0.5) * 40; y += U * 0.34; ctx.lineTo(x, y); } ctx.stroke(); }
          ctx.strokeStyle = '#8b857a'; ctx.lineWidth = 2; ctx.strokeRect(i * U * 2, j * U * 1.375, U * 2, U * 1.375);
        }
      } else {
        ctx.fillStyle = '#6e4c3c'; ctx.fillRect(0, 0, w, h);
        const c = U * 0.5;
        for (let i = 0; i < W * 2; i++) for (let j = 0; j < D * 2; j++) { ctx.fillStyle = `hsl(${12 + random() * 10},${44 + random() * 10}%,${42 + random() * 12}%)`; ctx.fillRect(i * c + 1.5, j * c + 1.5, c - 3, c - 3); }
      }
      // age: grime, bare patches, cracks, green
      ctx.fillStyle = `rgba(96,88,70,${wear * 0.3})`; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < wear * 60; i++) {
        const x = random() * w, y = random() * h, r = U * (0.2 + random() * 0.9) * wear;
        const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r); const tone = random() < 0.4 + ruin * 0.3 ? '86,104,58' : '140,128,104';
        g.addColorStop(0, `rgba(${tone},0.95)`); g.addColorStop(1, `rgba(${tone},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.strokeStyle = 'rgba(40,36,30,0.8)';
      for (let i = 0; i < wear * 14; i++) { ctx.lineWidth = 1 + random() * 2.5; ctx.beginPath(); let x = random() * w, y = random() * h; ctx.moveTo(x, y); for (let q = 0; q < 7; q++) { x += (random() - 0.5) * U * 1.6; y += (random() - 0.5) * U * 1.6; ctx.lineTo(x, y); } ctx.stroke(); }
    });
    floorMap.repeat.set(1 / W, 1 / D); floorMap.offset.set(0.5, 0.5);
    const floorShape = new THREE.Shape([new THREE.Vector2(-W / 2, -D / 2), new THREE.Vector2(W / 2, -D / 2), new THREE.Vector2(W / 2, D / 2), new THREE.Vector2(-W / 2, D / 2)]);
    floorShape.holes.push(new THREE.Path(toShape(pool(0)).getPoints()));
    const hole2Pts: XZ[] = [];
    if (hole2) {
      const raw: XZ[] = [[3.4, 5.5], [3.2, 4.4], [3.9, 3.3], [5.0, 2.9], [6.2, 3.2], [7, 2.8]];
      floorShape.autoClose = true;
      const outer: XZ[] = [[-W / 2, D / 2], [-W / 2, -D / 2], [W / 2, -D / 2]];
      for (const p of raw) hole2Pts.push([p[0] + (random() - 0.5) * 0.3, p[1] + (random() - 0.5) * 0.3]);
      hole2Pts[0][1] = D / 2; hole2Pts[hole2Pts.length - 1][0] = W / 2;
      const ring: XZ[] = [...outer, ...hole2Pts.slice().reverse()];
      floorShape.curves.length = 0;
      floorShape.setFromPoints(ring.map(([x, z]) => new THREE.Vector2(x, -z)));
    }
    const floorSide = s.material('#a79d8b', { roughness: 1 });
    const floor = new THREE.Mesh(new THREE.ExtrudeGeometry(floorShape, { depth: 0.24, bevelEnabled: false }).rotateX(-Math.PI / 2), [new THREE.MeshStandardMaterial({ map: floorMap, roughness: mix(a.floor === 'tile' ? 0.7 : 0.3, 0.95, wear) }), floorSide]);
    floor.position.y = -0.24; floor.receiveShadow = true;
    s.root.add(floor);
    world.ground = floor;

    // ---- the pool ----
    const extrude = (outer: XZ[], inner: XZ[] | null, y0: number, y1: number, material: THREE.Material) => {
      const shape = toShape(outer);
      if (inner) shape.holes.push(new THREE.Path(toShape(inner).getPoints()));
      const mesh = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false }).rotateX(-Math.PI / 2), material, [0, y0, 0]);
      return mesh;
    };
    const poolStone = s.material(aged(a.floor === 'tile' ? '#c9b9a0' : '#dedad0', 0.6), { roughness: mix(0.3, 0.95, wear) });
    extrude(pool(0.34), pool(0), -0.02, 0.2, poolStone);
    extrude(pool(0.3), pool(-0.02), -1.15, -0.03, poolStone);
    extrude(pool(-0.02), pool(-0.5), -1.12, -0.34, poolStone);
    extrude(pool(-0.5), pool(-0.98), -1.12, -0.7, poolStone);
    const poolBed = s.mesh(new THREE.ShapeGeometry(toShape(pool(-0.9))).rotateX(-Math.PI / 2), s.material(aged('#9fc4c0', 0.9), { roughness: 0.8 }), [0, -1.1, 0]);
    poolBed.castShadow = false;
    const fill = clamp01(1 - (wear - 0.35) / 0.4);
    const level = mix(-1.02, -0.07, fill);
    const hot = fill > 0.5;
    if (fill > 0.03) {
      const tint = new THREE.Color('#74c2c4').lerp(new THREE.Color('#5c7448'), clamp01(wear * 1.5 - 0.2));
      const water = s.mesh(new THREE.ShapeGeometry(toShape(pool(-0.03))).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.06, metalness: 0.2, transparent: true, opacity: mix(0.95, 0.78, fill) }), [0, level, 0]);
      water.castShadow = false;
    }
    // a bronze spout feeding it from the back wall
    const spoutX = poolCentre[0] + (a.pool === 'apse' ? 0 : 0.2);
    s.box([0.7, 0.7, 0.12], [spoutX, 1.25, -5.44], marble);
    s.ball([0.2, 0.22, 0.12], [spoutX, 1.25, -5.36], bronze, 12);
    s.rod([spoutX, 1.18, -5.36], [spoutX, 1.14, -5.12], 0.035, bronze);
    if (hot) { const stream = s.tube([[spoutX, 1.14, -5.12], [spoutX, 1.0, -4.95], [spoutX, 0.4, -4.8], [spoutX, level, -4.74]], 0.03, new THREE.MeshStandardMaterial({ color: '#bfe6e6', roughness: 0.1, transparent: true, opacity: 0.8 })); stream.castShadow = false; }
    else if (wear > 0.4) { const stain = s.box([0.24, 1.1, 0.01], [spoutX, 0.6, -5.485], new THREE.MeshStandardMaterial({ color: '#55703f', roughness: 1, transparent: true, opacity: 0.7 })); stain.castShadow = false; }

    // ---- walls ----
    const wallMap = (length: number) => painted(1024, 256, (ctx, w, h) => {
      const U = w / length, brickwork = () => { ctx.fillStyle = '#8f8676'; ctx.fillRect(0, 0, w, h); for (let r = 0; r < 28; r++) { let x = -random() * 30; while (x < w) { const bw = 26 + random() * 10; ctx.fillStyle = `hsl(${12 + random() * 12},${38 + random() * 14}%,${36 + random() * 14}%)`; ctx.fillRect(x + 1, r * h / 28 + 1, bw - 2, h / 28 - 2); x += bw; } } };
      if (a.walls === 'brick') { brickwork(); ctx.fillStyle = '#3a2f28'; for (let x = U; x < w; x += U * 1.7) for (const y of [h * 0.3, h * 0.62]) ctx.fillRect(x, y, 7, 7); }
      else if (a.walls === 'marble') {
        ctx.fillStyle = '#ddd7c8'; ctx.fillRect(0, 0, w, h);
        const tones = ['#d3a556', '#7a3048', '#e9e5da', '#3f6a52'];
        const n = Math.round(length / 1.4);
        for (let i = 0; i < n; i++) { ctx.fillStyle = tones[i % 4]; ctx.fillRect((i + 0.08) * w / n, h * 0.1, w / n * 0.84, h * 0.56); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; for (let v = 0; v < 3; v++) { ctx.beginPath(); let x = (i + 0.1 + random() * 0.8) * w / n, y = h * 0.1; ctx.moveTo(x, y); while (y < h * 0.66) { x += (random() - 0.5) * 16; y += 14; ctx.lineTo(x, Math.min(y, h * 0.66)); } ctx.stroke(); } }
        ctx.fillStyle = '#2f4a3c'; ctx.fillRect(0, h * 0.72, w, h * 0.28); ctx.fillStyle = '#cdbf9e'; ctx.fillRect(0, h * 0.69, w, h * 0.03); ctx.fillRect(0, 0, w, h * 0.05);
      } else if (a.walls === 'fresco') {
        ctx.fillStyle = mood.cheer > 0.4 ? '#a8322a' : '#7d3b34'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1f1b1a'; ctx.fillRect(0, h * 0.74, w, h * 0.26); ctx.fillStyle = '#e6d6a8'; ctx.fillRect(0, 0, w, h * 0.09);
        const n = Math.round(length / 1.75);
        for (let i = 0; i < n; i++) { ctx.strokeStyle = '#e0b84e'; ctx.lineWidth = 3; ctx.strokeRect((i + 0.1) * w / n, h * 0.15, w / n * 0.8, h * 0.52); ctx.fillStyle = '#1f1b1a'; ctx.fillRect((i + 0.96) * w / n, h * 0.09, w / n * 0.08, h * 0.65); ctx.fillStyle = '#e8dcb8'; ctx.beginPath(); ctx.ellipse((i + 0.5) * w / n, h * 0.4, 9, 13, 0, 0, Math.PI * 2); ctx.fill(); }
      } else {
        ctx.fillStyle = '#eeeae0'; ctx.fillRect(0, 0, w, h);
        const n = Math.round(length / 1.75);
        for (let i = 0; i <= n; i++) { ctx.fillStyle = '#b9cbd6'; ctx.fillRect(i * w / n - 10, h * 0.08, 20, h * 0.92); ctx.fillStyle = '#9fb2be'; ctx.fillRect(i * w / n - 14, h * 0.06, 28, h * 0.04); }
        ctx.fillStyle = '#cfd9de'; ctx.fillRect(0, h * 0.8, w, h * 0.2); ctx.fillStyle = '#d9d2c0'; ctx.fillRect(0, 0, w, h * 0.06);
      }
      // steam streaks, soot, and plaster fallen away to brick
      for (let i = 0; i < 30 + wear * 60; i++) { const x = random() * w, len = h * (0.2 + random() * 0.6); const g = ctx.createLinearGradient(0, 0, 0, len); const tone = random() < 0.5 ? '60,70,50' : '70,58,46'; g.addColorStop(0, `rgba(${tone},${0.08 + wear * 0.3})`); g.addColorStop(1, `rgba(${tone},0)`); ctx.fillStyle = g; ctx.fillRect(x, random() * h * 0.3, 3 + random() * 10, len); }
      if (a.walls !== 'brick') for (let i = 0; i < (wear - 0.25) * 34; i++) {
        const x = random() * w, y = random() < 0.6 ? h * (0.6 + random() * 0.4) : random() * h, r = U * (0.3 + random() * 1.2 * wear);
        ctx.save(); ctx.beginPath(); for (let q = 0; q < 9; q++) { const an = q / 9 * Math.PI * 2, rr = r * (0.6 + random() * 0.5); ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.7); } ctx.closePath(); ctx.clip();
        ctx.fillStyle = '#8f8676'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
        for (let ry = y - r; ry < y + r; ry += 9) for (let rx = x - r - random() * 20; rx < x + r; rx += 30) { ctx.fillStyle = `hsl(${12 + random() * 12},40%,${38 + random() * 12}%)`; ctx.fillRect(rx + 1, ry + 1, 28, 7); }
        ctx.restore();
      }
    });
    const plaster = s.material(aged(a.walls === 'brick' ? '#a8664a' : a.walls === 'fresco' ? '#e6d6a8' : '#e4dfd2', 0.5), { roughness: 0.95 });
    s.box([W + 0.4, WALL, 0.4], [-0.2, WALL / 2, -D / 2 - 0.2], plaster);
    const backFace = s.mesh(new THREE.PlaneGeometry(W, WALL), new THREE.MeshStandardMaterial({ map: wallMap(W), roughness: a.walls === 'marble' ? mix(0.3, 0.9, wear) : 0.9 }), [0, WALL / 2, -D / 2 + 0.006]);
    backFace.castShadow = false;
    const leftFace = s.mesh(new THREE.PlaneGeometry(D, WALL), new THREE.MeshStandardMaterial({ map: wallMap(D), roughness: a.walls === 'marble' ? mix(0.3, 0.9, wear) : 0.9 }), [-W / 2 + 0.006, WALL / 2, 0]);
    leftFace.rotation.y = Math.PI / 2; leftFace.castShadow = false;
    s.box([W, 0.16, 0.2], [0, WALL + 0.02, -D / 2 + 0.08], marble);

    // the end wall with its lunette and round window
    const topAt = (z: number) => { const full = arc(z); const drop = ruin * (0.3 + 0.7 * clamp01((z + 5.5) / 9) ** 1.3) * (full - 1.7) + ruin * (random() - 0.5) * 0.7; return Math.max(1.2, full - drop); };
    const profile: THREE.Vector2[] = [new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0)];
    let eyeTop = 0;
    const eye0 = 0;
    for (let i = 0; i <= 30; i++) { const z = -D / 2 + (i / 30) * D; const y = topAt(z); if (Math.abs(z - eye0) < 1.0) eyeTop = eyeTop ? Math.min(eyeTop, y) : y; profile.push(new THREE.Vector2(-z, y)); }
    const endShape = new THREE.Shape(profile);
    const eye = { z: 0, y: 5.5, r: 0.72 };
    const hasEye = eyeTop > eye.y + eye.r + 0.2;
    if (hasEye) { const path = new THREE.Path(); path.absarc(-eye.z, eye.y, eye.r, 0, Math.PI * 2, false); endShape.holes.push(path); }
    const endWall = s.mesh(new THREE.ExtrudeGeometry(endShape, { depth: 0.4, bevelEnabled: false }).rotateY(Math.PI / 2), plaster, [-W / 2 - 0.4, 0, 0]);
    endWall.receiveShadow = true;
    if (hasEye) { const rim = s.ring(eye.r + 0.06, 0.07, [-W / 2 + 0.02, eye.y, eye.z], marble); rim.rotation.y = Math.PI / 2; }
    s.box([0.2, 0.16, D], [-W / 2 + 0.08, WALL + 0.02, 0], marble);

    // ---- the vault: a cut strip springing from the back wall ----
    const zCut = mix(-3.15, -4.7, ruin) + (random() - 0.5) * 0.2;
    const vaultTone = { coffered: '#e2dccd', stars: '#22305e', plaster: '#ebe6da', gold: '#c9a23f' }[a.vault];
    const vaultMat = new THREE.MeshStandardMaterial({ color: aged(vaultTone, 0.45), roughness: a.vault === 'gold' ? 0.35 : 0.9, metalness: a.vault === 'gold' ? 0.55 : 0, side: THREE.DoubleSide });
    const section = (rIn: number, rOut: number, zEnd: number) => {
      const pts: THREE.Vector2[] = [];
      const y = (r: number, z: number) => yC + Math.sqrt(Math.max(0.01, r * r - z * z));
      for (let i = 0; i <= 14; i++) { const z = mix(-D / 2, zEnd, i / 14); pts.push(new THREE.Vector2(-z, y(rIn, z))); }
      for (let i = 14; i >= 0; i--) { const z = mix(-D / 2 - 0.05, zEnd, i / 14); pts.push(new THREE.Vector2(-z, y(rOut, z))); }
      return new THREE.Shape(pts);
    };
    // the strip is built in bays so a ruined vault can lose some of them
    const bays = 8, bayW = W / bays;
    const edgeBlocks: { at: P3; size: number; color: string }[] = [];
    for (let b = 0; b < bays; b++) {
      const lost = random() < ruin * 0.75 && b !== 0;
      const end = lost ? Math.min(zCut, -4.9 + random() * 0.4) : zCut + (ruin > 0.1 ? (random() - 0.5) * ruin * 1.6 : 0);
      if (end < -5.2) continue;
      s.mesh(new THREE.ExtrudeGeometry(section(R, R + 0.34, end), { depth: bayW + 0.002, bevelEnabled: false }).rotateY(Math.PI / 2), vaultMat, [-W / 2 + b * bayW, 0, 0]);
      const ribMat = a.vault === 'coffered' ? marble : vaultMat;
      s.mesh(new THREE.ExtrudeGeometry(section(R - 0.16, R + 0.02, end), { depth: 0.24, bevelEnabled: false }).rotateY(Math.PI / 2), ribMat, [-W / 2 + b * bayW - 0.12 + (b === 0 ? 0.12 : 0), 0, 0]);
      if (a.vault === 'coffered') for (let z = -5.05; z < end - 0.2; z += 0.62) { const rib = s.box([bayW, 0.16, 0.22], [-W / 2 + (b + 0.5) * bayW, arc(z) - 0.1, z], marble); rib.rotation.x = -Math.atan(-z / Math.sqrt(R * R - z * z)); }
      if (ruin > 0.05) for (let k = 0; k < 3; k++) edgeBlocks.push({ at: [-W / 2 + (b + random()) * bayW, arc(end) + 0.12, end + random() * 0.14], size: 0.1 + random() * 0.1, color: random() < 0.6 ? '#a45a3c' : '#b9af9c' });
    }
    if (edgeBlocks.length) s.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), edgeBlocks);
    if (a.vault === 'stars' || a.vault === 'gold') {
      const starMat = new THREE.MeshStandardMaterial({ color: '#f1d27a', emissive: '#c99a2e', emissiveIntensity: 0.5, roughness: 0.4, metalness: 0.5 });
      const stars: { at: P3; size: number }[] = [];
      for (let k = 0; k < 110; k++) { const z = mix(-5.3, zCut - 0.6, random()); if (z > zCut - 0.4) continue; stars.push({ at: [(random() - 0.5) * (W - 0.6), arc(z) - 0.03, z], size: a.vault === 'stars' ? 0.035 + random() * 0.035 : 0.02 }); }
      if (stars.length && ruin < 0.8) s.scatter(new THREE.OctahedronGeometry(1, 0), starMat, stars).castShadow = false;
    }

    // ---- doorway and back bench ----
    const door = new THREE.Shape(); door.moveTo(-0.7, 0); door.lineTo(-0.7, 1.75); door.absarc(0, 1.75, 0.7, Math.PI, 0, true); door.lineTo(0.7, 0);
    const doorway = s.mesh(new THREE.ShapeGeometry(door), dark, [5.3, 0, -D / 2 + 0.012]); doorway.castShadow = false;
    const archRing = s.ring(0.78, 0.09, [5.3, 1.75, -D / 2 + 0.03], marble, Math.PI);
    archRing.castShadow = false;
    for (const x of [-0.78, 0.78]) s.box([0.18, 1.75, 0.1], [5.3 + x, 0.875, -D / 2 + 0.05], marble);
    const bench = (x: number, z: number, length: number, alongX: boolean) => {
      s.box(alongX ? [length, 0.1, 0.56] : [0.56, 0.1, length], [x, 0.5, z], marble);
      const n = Math.max(2, Math.round(length / 1.4));
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n - 0.5; s.box(alongX ? [0.16, 0.45, 0.46] : [0.46, 0.45, 0.16], [x + (alongX ? t * length : 0), 0.225, z + (alongX ? 0 : t * length)], marble); }
    };
    bench(2.5, -5.2, 3.4, true);

    // ---- side wall fittings ----
    if (a.fittings === 'benches') bench(-6.68, 2.6, 4.6, false);
    else if (a.fittings === 'statues') {
      for (const z of [1.2, 3.9]) {
        const niche = new THREE.Shape(); niche.moveTo(-0.6, 0); niche.lineTo(-0.6, 1.5); niche.absarc(0, 1.5, 0.6, Math.PI, 0, true); niche.lineTo(0.6, 0);
        const recess = s.mesh(new THREE.ShapeGeometry(niche), new THREE.MeshStandardMaterial({ color: aged('#5b6f86', 0.6), roughness: 1 }), [-W / 2 + 0.014, 0.7, z]); recess.rotation.y = Math.PI / 2; recess.castShadow = false;
        s.box([0.5, 0.7, 0.9], [-6.72, 0.35, z], marble);
        const fallen = random() < ruin * 0.8;
        const figure = new THREE.Group();
        const add = (mesh: THREE.Mesh) => { s.root.remove(mesh); figure.add(mesh); };
        add(s.lathe([[0.001, 0], [0.26, 0], [0.22, 0.25], [0.17, 0.7], [0.2, 0.95], [0.24, 1.12], [0.1, 1.2], [0.001, 1.2]], marble));
        if (random() > ruin * 0.7) add(s.ball([0.11, 0.13, 0.11], [0, 1.33, 0], marble, 12));
        add(s.rod([0.2, 1.05, 0], [0.3, 0.7, 0.14], 0.055, marble));
        if (fallen) { figure.rotation.z = -Math.PI / 2 + 0.1; figure.position.set(-5.9, 0.24, z + 0.3); figure.rotation.y = random() - 0.5; } else figure.position.set(-6.7, 0.7, z);
        s.root.add(figure);
      }
    } else {
      const shaft = s.material(aged(pick(['#d9ab57', '#e6e1d4', '#9aa39c']), 0.5), { roughness: mix(0.3, 0.9, wear) });
      let standing = 0;
      for (const z of [0.6, 2.7, 4.8]) {
        const broken = random() < ruin * 0.7;
        const h = broken ? 0.7 + random() * 1.2 : 3.0;
        s.cylinder(0.24, 0.27, h, [-6.25, 0.15 + h / 2, z], shaft, 16);
        s.cylinder(0.34, 0.36, 0.15, [-6.25, 0.075, z], marble, 16);
        if (!broken) { s.box([0.66, 0.2, 0.66], [-6.25, 3.25, z], marble); s.cylinder(0.33, 0.25, 0.14, [-6.25, 3.1, z], marble, 16); standing++; }
        else { const drum = s.cylinder(0.25, 0.25, 0.9, [-5.3 + random() * 0.6, 0.25, z + (random() - 0.5)], shaft, 16); drum.rotation.set(Math.PI / 2, 0, random() * 3); }
      }
      if (standing === 3) s.box([0.6, 0.26, 4.9], [-6.25, 3.48, 2.7], marble);
    }

    // ---- the fallen-in corner: hypocaust pillars under the floor ----
    if (hole2) {
      const sootMat = new THREE.MeshStandardMaterial({ color: '#3b332d', roughness: 1, side: THREE.DoubleSide });
      const pit = s.mesh(new THREE.ShapeGeometry(toShape([...hole2Pts, [W / 2, D / 2]])).rotateX(-Math.PI / 2), sootMat, [0, -1.0, 0]); pit.castShadow = false;
      for (let k = 0; k < hole2Pts.length - 1; k++) {
        const [x0, z0] = hole2Pts[k], [x1, z1] = hole2Pts[k + 1];
        const back = s.mesh(new THREE.PlaneGeometry(Math.hypot(x1 - x0, z1 - z0), 0.78), sootMat, [(x0 + x1) / 2, -0.62, (z0 + z1) / 2]);
        back.rotation.y = -Math.atan2(z1 - z0, x1 - x0); back.castShadow = false;
      }
      const pilae: { at: P3; size: number; color: string }[] = [];
      for (let x = 3.6; x < 7; x += 0.62) for (let z = 3.1; z < 5.5; z += 0.62) {
        if (!(x > 3.5 && z > 3.4 - (x - 3.5) * 0.15)) continue;
        const n = random() < 0.3 ? 3 + Math.floor(random() * 4) : 8;
        for (let k = 0; k < n; k++) pilae.push({ at: [x + (random() - 0.5) * 0.03, -0.95 + k * 0.09, z + (random() - 0.5) * 0.03], size: 0.115, color: `#${new THREE.Color(pick(['#a4563a', '#8f4a34', '#b3684a'])).lerp(new THREE.Color('#1b1917'), 0.25 + random() * 0.3).getHexString()}` });
      }
      const stack = s.scatter(new THREE.BoxGeometry(2, 0.72, 2), new THREE.MeshStandardMaterial({ roughness: 1 }), pilae);
      stack.receiveShadow = true;
      for (let k = 0; k < 5; k++) { const chunk = s.box([0.5 + random() * 0.5, 0.2, 0.4 + random() * 0.4], [4 + random() * 2.6, -0.75 + random() * 0.3, 3.5 + random() * 1.8], floorSide); chunk.rotation.set((random() - 0.5) * 0.9, random() * 3, (random() - 0.5) * 0.9); }
    }

    // ---- light from the round window ----
    const beamTint = new THREE.Color('#fff3d0').lerp(new THREE.Color('#ffc98a'), mood.warmth * 0.6).lerp(new THREE.Color('#dfe8ee'), (1 - mood.warmth) * 0.4);
    if (hasEye || ruin > 0.5) {
      const from = new THREE.Vector3(-W / 2 + 0.1, hasEye ? eye.y : 5.6, eye.z), to = new THREE.Vector3(mix(-1.2, 3.2, mood.daylight), 0.02, 1.9);
      const axis = to.clone().sub(from), length = axis.length();
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(hasEye ? eye.r : 1.6, hasEye ? 1.25 : 2.4, length, 20, 1, true), new THREE.MeshBasicMaterial({ color: beamTint, transparent: true, opacity: mix(0.13, 0.26, a.steam) * (hasEye ? 1 : 0.6), depthWrite: false, side: THREE.DoubleSide }));
      beam.position.copy(from).addScaledVector(axis, 0.5);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), axis.clone().normalize());
      s.root.add(beam);
      const pool2 = new THREE.Mesh(new THREE.CircleGeometry(hasEye ? 1.3 : 2.4, 28), new THREE.MeshBasicMaterial({ color: beamTint, transparent: true, opacity: 0.3, depthWrite: false }));
      pool2.rotation.x = -Math.PI / 2; pool2.scale.x = Math.min(2.4, length / from.y * 0.75); pool2.position.set(to.x, 0.012, to.z);
      s.root.add(pool2);
    }

    // ---- steam ----
    const puffs: THREE.Mesh[] = [];
    const steamCount = hot ? Math.round(a.steam * 26 * mix(0.6, 1.2, mood.warmth)) : 0;
    const steamMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, depthWrite: false, roughness: 1 });
    for (let k = 0; k < steamCount; k++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), steamMat);
      const an = random() * Math.PI * 2, r = Math.sqrt(random()) * 2.1;
      puff.userData = { x: poolCentre[0] + Math.cos(an) * r * (a.pool === 'plunge' ? 1.15 : 1), z: poolCentre[1] + Math.sin(an) * r * 0.75, phase: random(), size: 0.35 + random() * 0.6, sway: random() * 6 };
      s.root.add(puff); puffs.push(puff);
    }
    const drift = (time: number) => { for (const puff of puffs) { const u = puff.userData, t = (u.phase + time * mix(0.015, 0.07, mood.energy)) % 1; puff.position.set(u.x + Math.sin(u.sway + t * 5) * 0.4 + t * 0.6, level + 0.2 + t * 3.4, u.z + Math.cos(u.sway + t * 4) * 0.3 + t * 0.5); puff.scale.setScalar(u.size * (0.5 + t * 1.3)); } };
    drift(0);

    // ---- age on the ground: weeds, rubble, leaves ----
    if (wear > 0.5) {
      const weeds: { at: P3; size: number; color: string }[] = [];
      for (let k = 0; k < (wear - 0.5) * 130; k++) { const [x, z] = floorSpot(); const tall = 1 + Math.floor(random() * 3 * wear); for (let b = 0; b < tall + 2; b++) weeds.push({ at: [x + (random() - 0.5) * 0.14, 0.04 + b * 0.07 * random(), z + (random() - 0.5) * 0.14], size: 0.05 + random() * 0.06, color: pick(['#5f7d36', '#7f8f3a', '#4d6b3a', '#93984a']) }); }
      s.scatter(new THREE.TetrahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), weeds);
    }
    if (ruin > 0.15) {
      const rubble: { at: P3; size: number; color: string }[] = [];
      for (let k = 0; k < ruin * 46; k++) {
        const inTub = random() < 0.4 && fill < 0.3;
        let x = poolCentre[0] + (random() - 0.5) * 2.4, z = poolCentre[1] + (random() - 0.5) * 1.4, y = -1.0;
        if (!inTub) { x = (random() - 0.5) * (W - 1.2); z = -5.2 + random() * 2.2; y = 0.06; if (inPool(x, z, 0.5) || !clear(x, z, 1.5) || (x > 0.6 && x < 4.4 && z < -4.7) || (x > 4.4 && x < 6.2 && z < -4.4)) continue; }
        rubble.push({ at: [x, y + random() * 0.12, z], size: 0.08 + random() * 0.2, color: pick(['#a45a3c', '#b9af9c', '#8f8676', '#d9d2c2']) });
      }
      if (rubble.length) s.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), rubble);
      if (ruin > 0.7 && fill < 0.1) {
        const [tx, tz] = [poolCentre[0] + 0.5, poolCentre[1] + 0.2];
        s.tube([[tx, -1.1, tz], [tx + 0.08, -0.3, tz + 0.05], [tx - 0.05, 0.7, tz], [tx + 0.1, 1.5, tz - 0.05]], 0.05, s.material('#5c4630'));
        for (let k = 0; k < 7; k++) s.ball([0.4 + random() * 0.3, 0.3 + random() * 0.2, 0.4 + random() * 0.3], [tx + (random() - 0.5) * 1.1, 1.3 + random() * 0.9, tz + (random() - 0.5) * 1.1], s.material(pick(['#5f7d36', '#6f8f3a', '#4d6b3a']), { roughness: 1 }), 8);
      }
    }

    // ---- who was here ----
    const rim = pool(0.75).filter(([x, z]) => z > poolCentre[1] + 0.4 && x > -6.2 && x < 0.9 && clear(x, z, 1.5) && !inPool(x, z, 0.55));
    const rimSpot = (): XZ => rim.length ? [pick(rim)[0] + (random() - 0.5) * 0.5, pick(rim)[1] + random() * 0.3] : [0.6, -0.6];
    const nearRim = (): XZ => { const p = rim.length ? pick(rim) : ([0.6, -0.5] as XZ); return [p[0] + (random() - 0.5) * 0.4, p[1] + (random() - 0.5) * 0.2]; };
    const benchSpot = (): P3 => [pick([1.05, 1.5, 3.3, 3.8]) + (random() - 0.5) * 0.2, 0.55, -5.2 + (random() - 0.5) * 0.15];
    const busy = Math.round(mix(2, 7, mood.density));
    const cloth = () => s.material(mood.cheer > 0.45 ? pick(['#ece2c8', '#c9553f', '#e0b84e', '#6f9fb0', '#efe9d8']) : pick(['#d9d2c2', '#b9b0a0', '#8f8a7c']), { roughness: 1 });
    const towelPile = (at: P3, n: number) => { for (let k = 0; k < n; k++) s.box([0.42, 0.05, 0.3], [at[0], at[1] + 0.025 + k * 0.052, at[2]], cloth()).rotation.y = (random() - 0.5) * 0.2; };
    const jug = (x: number, y: number, z: number, k = 1) => { const clay = s.material('#b5683f', { roughness: 0.8, side: THREE.DoubleSide }); s.lathe([[0.001, 0], [0.06 * k, 0], [0.13 * k, 0.14 * k], [0.1 * k, 0.26 * k], [0.04 * k, 0.33 * k], [0.06 * k, 0.4 * k]], clay, [x, y, z]); s.ring(0.05 * k, 0.012 * k, [x + 0.09 * k, y + 0.3 * k, z], clay, Math.PI).rotation.z = -Math.PI / 2; };
    if (a.traces === 'bathers') {
      for (let k = 0; k < busy; k++) {
        const [x, y, z] = benchSpot();
        const drape = s.box([0.5, 0.03, 0.62], [x, y + 0.016, z + 0.02], cloth()); drape.rotation.y = (random() - 0.5) * 0.3;
        s.box([0.5, 0.3, 0.03], [x, y - 0.13, z + 0.31], drape.material as THREE.Material).rotation.y = drape.rotation.y;
      }
      const wood = s.material('#b88a55');
      for (let k = 0; k < busy + 1; k++) { const [x, z] = nearRim(); const yaw = random() * 3; for (const side of [-1, 1]) { const clog = s.box([0.1, 0.05, 0.26], [x + Math.cos(yaw) * side * 0.08, 0.025, z - Math.sin(yaw) * side * 0.08], wood); clog.rotation.y = yaw + (random() - 0.5) * 0.4; } }
      const [jx, jz] = rimSpot(); jug(jx, 0.2, jz - 0.5 < poolCentre[1] ? jz : jz, 1.1);
      for (let k = 0; k < 3; k++) s.cylinder(0.05, 0.035, 0.08, [jx + 0.25 + k * 0.14, 0.04, jz + (random() - 0.5) * 0.2], bronze, 10);
      if (a.fittings === 'benches') towelPile([-6.68, 0.55, 1.2 + random() * 2.6], 3);
    } else if (a.traces === 'attendants') {
      towelPile(benchSpot(), 4 + Math.round(mood.density * 4)); towelPile([1.3, 0.55, -5.2], 3);
      const [x, z] = rimSpot();
      s.lathe([[0.001, 0], [0.16, 0], [0.2, 0.34], [0.185, 0.34], [0.15, 0.02], [0.001, 0.02]], new THREE.MeshStandardMaterial({ color: '#7a5a38', roughness: 0.9, side: THREE.DoubleSide }), [x, 0, z + 0.3]);
      s.rod([6.6, 0, -4.6], [6.75, 2.0, -5.35], 0.025, timber);
      s.cylinder(0.05, 0.16, 0.35, [6.58, 0.18, -4.5], s.material('#c9b170', { roughness: 1 }), 10);
      const wet = s.cylinder(0.9, 0.9, 0.004, [x + 0.8, 0.004, z + 0.9], new THREE.MeshStandardMaterial({ color: '#9fb9bb', roughness: 0.05, transparent: true, opacity: 0.4, depthWrite: false }), 20); wet.scale.z = 0.6;
    } else if (a.traces === 'party') {
      for (let k = 0; k < 2 + Math.round(mood.density * 3); k++) { const x = 6.2 + (random() - 0.5) * 0.5 - k * 0.42, lean = (random() - 0.5) * 0.3; const body = s.lathe([[0.001, 0], [0.05, 0.05], [0.2, 0.45], [0.19, 0.75], [0.07, 0.95], [0.08, 1.15], [0.06, 1.15]], s.material('#b5683f', { roughness: 0.8, side: THREE.DoubleSide }), [x, 0, -4.9 + k * 0.1]); body.rotation.x = -0.22; body.rotation.z = lean; }
      const flowers: { at: P3; size: number; color: string }[] = [];
      for (let g = 0; g < 4; g++) { const x0 = -6 + g * 2.7, pts: P3[] = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([x0 + t * 2.7, 3.2 - Math.sin(t * Math.PI) * 0.55, -5.42]); if (i % 1 === 0) flowers.push({ at: [x0 + t * 2.7, 3.2 - Math.sin(t * Math.PI) * 0.55, -5.36], size: 0.08, color: pick(['#d9486e', '#e9c33f', '#f1eee4', '#c9553f']) }); } s.tube(pts, 0.035, s.material('#4d6b3a')).castShadow = false; }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), flowers);
      const [x, y, z] = benchSpot();
      s.cylinder(0.3, 0.3, 0.02, [x, y + 0.01, z], bronze, 20);
      for (let k = 0; k < 5; k++) s.cylinder(0.05, 0.03, 0.09, [x + Math.cos(k * 1.25) * 0.17, y + 0.065, z + Math.sin(k * 1.25) * 0.17], bronze, 10);
      const [rx, rz] = rimSpot(); jug(rx, 0.2, rz, 1.3);
    } else if (a.traces === 'nobody') {
      const leaves: { at: P3; size: number; color: string }[] = [];
      for (let k = 0; k < mix(40, 160, mood.density); k++) { const corner = random() < 0.5; const [fx, fz] = floorSpot(); const x = corner ? -6.6 + random() ** 2 * 3 : fx, z = corner ? -5.1 + random() ** 2 * 3 : fz; if (inPool(x, z, 0.4) && fill > 0.03) continue; leaves.push({ at: [x, inPool(x, z, 0) ? -1.07 : 0.02 + random() * 0.03, z], size: 0.05 + random() * 0.05, color: pick(['#8a5a2b', '#a9772f', '#5e4526', '#b08c3e']) }); }
      const mesh = s.scatter(new THREE.CircleGeometry(1, 5).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }), leaves); mesh.castShadow = false;
    } else if (a.traces === 'diggers') {
      const steel = s.material('#7d868b', { metalness: 0.6, roughness: 0.5 });
      const sx = 2.5, sz = -4.3;
      for (const dx of [-1, 1]) for (const dz of [-0.45, 0.45]) s.rod([sx + dx * 1.1, 0, sz + dz], [sx + dx * 1.1, 3.3, sz + dz], 0.03, steel);
      for (const y of [1.6, 3.1]) { s.box([2.3, 0.05, 1.0], [sx, y, sz], timber); for (const dz of [-0.45, 0.45]) s.rod([sx - 1.1, y - 0.6, sz + dz], [sx + 1.1, y - 0.05, sz + dz], 0.018, steel); }
      const lx = poolCentre[0] + 1.2, lz = poolCentre[1] + (a.pool === 'apse' ? 1.2 : 1.5);
      for (const side of [-0.2, 0.2]) s.rod([lx + side, -1.1, lz - 0.7], [lx + side, 0.9, lz + 0.25], 0.025, timber);
      for (let k = 0; k < 6; k++) s.rod([lx - 0.2, -0.9 + k * 0.3, lz - 0.61 + k * 0.142], [lx + 0.2, -0.9 + k * 0.3, lz - 0.61 + k * 0.142], 0.018, timber);
      for (let k = 0; k < 2 + Math.round(mood.density * 2); k++) { const crate = s.box([0.7, 0.4, 0.5], [6.3 - (k % 2) * 0.1, 0.2 + Math.floor(k / 2) * 0.41, -3.9 + (k % 2) * 0.62 - 0.9], timber); crate.rotation.y = (random() - 0.5) * 0.2; }
      const cord = s.material('#f5e9a0');
      for (let k = 0; k < 3; k++) { s.rod([-6.5, 0.12, 0.4 + k * 1.6], [0.2, 0.12, 0.4 + k * 1.6], 0.012, cord).castShadow = false; s.rod([-6.2 + k * 2.4, 0.12, 0.2], [-6.2 + k * 2.4, 0.12, 5.2], 0.012, cord).castShadow = false; }
    } else {
      const hay = s.material('#d2b45c', { roughness: 1 });
      const inside = fill < 0.1;
      const [hx, hz] = inside ? poolCentre : [-5.6, -0.2] as XZ;
      for (let k = 0; k < 6; k++) s.ball([0.7 + random() * 0.5, 0.25 + random() * 0.25, 0.6 + random() * 0.4], [hx + (random() - 0.5) * 1.4, (inside ? -1.0 : 0.1) + random() * 0.15, hz + (random() - 0.5) * 0.9], hay, 8);
      const z = a.pool === 'apse' ? -0.9 : -0.35;
      for (let k = 0; k < 4; k++) { const x0 = -5.6 + k * 1.5; for (const dx of [0, 1.4]) s.rod([x0 + dx, 0, z], [x0 + dx, 0.95, z + (random() - 0.5) * 0.08], 0.03, timber); for (const y of [0.3, 0.6, 0.88]) s.rod([x0, y, z], [x0 + 1.4, y + (random() - 0.5) * 0.08, z], 0.022, timber); }
      const ash = s.cylinder(0.5, 0.55, 0.03, [3.4, 0.015, -1.6], s.material('#4a4541', { roughness: 1 }), 16); ash.castShadow = false;
      for (let k = 0; k < 8; k++) s.ball([0.1, 0.07, 0.1], [3.4 + Math.cos(k * 0.785) * 0.5, 0.05, -1.6 + Math.sin(k * 0.785) * 0.5], s.material('#8f8676', { roughness: 1 }), 6);
      for (let k = 0; k < 3; k++) s.rod([3.2 + k * 0.15, 0.05, -1.75], [3.5 + k * 0.05, 0.07, -1.45], 0.025, s.material('#2a2422'));
    }

    world.update = (_dt, time) => drift(time);
    return world;
  },
});
