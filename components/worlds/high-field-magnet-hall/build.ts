import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';
import { type SignKind, blackboard, blueprint, clipping, clockFace, frogPoster, paint, pegboard, safetySign, stencil } from './paint';

type V = readonly [number, number, number];
type M = THREE.Material;

const W = 15, HX = W / 2, HZ = 5.5, ZF = 4.4, D = HZ + ZF, ZC = (ZF - HZ) / 2; // back wall at -HZ, open front edge at ZF
const SX = -3.9, SZ = -2.3; // the magnet's axis
const DECK = 3.0; // platform, gangway and mezzanine level
const MX = 1.6, MZ = -2.6; // the mezzanine runs from x = MX to the open right edge, and from the back wall to z = MZ
const GZ = -4.9; // the gangway along the back wall
const XB = -0.9; // where the bus bars turn for the power cabinets
const TAU = Math.PI * 2;

const ERA = {
  nineties: { bg: '#dde1dc', floor: '#b4b2a9', wall: '#ddd9c9', dado: '#86a294', trim: '#4f5c62', steel: '#5d6b75', flange: '#4a6274', deck: '#69737b', rail: '#e0b324', rack: '#cdc6b1', hose: '#25282a', cab: '#c4c2b6', porcelain: '#e9e4d8' },
  victorian: { bg: '#e7ddcb', floor: '#a69a86', wall: '#9a5b43', dado: '#4f3a2a', trim: '#2f4b3c', steel: '#2f4b3c', flange: '#b48c3f', deck: '#4a4038', rail: '#b48c3f', rack: '#5c3a25', hose: '#b39d76', cab: '#5c3a25', porcelain: '#7a4a2e' },
  future: { bg: '#e6ebee', floor: '#d5dadd', wall: '#eef1f2', dado: '#c7cfd5', trim: '#8f9ca5', steel: '#bfc8ce', flange: '#e3e8eb', deck: '#aab4bb', rail: '#d9e1e6', rack: '#2b3036', hose: '#39414a', cab: '#e3e7ea', porcelain: '#f2f4f5' },
  shed: { bg: '#e2e0d6', floor: '#a8a499', wall: '#a7aeb0', dado: '#8b9294', trim: '#6f5233', steel: '#7f8686', flange: '#93402c', deck: '#9a7a50', rail: '#d7a52a', rack: '#bdb7a6', hose: '#2a2a2a', cab: '#97a196', porcelain: '#e3ded2' },
} as const;
type Era = keyof typeof ERA;

export default defineWorld({
  questions: {
    era: choice('What generation of laboratory is it?', {
      nineties: 'A 1990s university hall: pale painted block walls with a green dado, grey steel, beige racks and CRT monitors.',
      victorian: 'A brass Victorian laboratory: red brick and tall arched windows, green cast-iron columns, mahogany cabinets and brass dials.',
      future: 'A chrome future facility: white panels, a polished chrome magnet ringed with cyan light, glass balustrades.',
      shed: 'Big science in a shed: corrugated metal walls, plywood decking, scaffold rails and improvised plumbing.',
    }),
    dominant: choice('What dominates the hall?', {
      stack: 'The magnet itself: a towering copper coil stack, taller and fatter than everything else.',
      hoses: 'The cooling: a jungle of thick black hoses snaking from the stack to a wall of pipes, valves and a heat exchanger.',
      racks: 'The electronics: a mezzanine crammed with blinking racks, cables pouring off the edge to the magnet.',
      power: 'The power: a bank of rectifier cabinets, a transformer and copper bus bars as thick as logs.',
    }),
    state: choice('What is the magnet doing right now?', {
      idle: 'Idle: green lamps, the display reads zero, everything still.',
      ramping: 'Ramping up: amber beacons turning, the field climbing, a crane hook leaning toward the magnet.',
      full: 'At full field: the display at its record, a hum you can feel, loose steel straining toward the stack.',
      alarm: 'Alarm: red beacons flashing, FAULT on the display, a rope barrier across the floor.',
      open: 'Opened for maintenance: the top coil lifted out on the chain hoist, hoses disconnected, tape barriers up.',
    }),
    story: choice('What has happened here today?', {
      routine: 'An ordinary shift: a chair pulled out at the desk, mugs, a clipboard hung on the rail.',
      frog: 'The famous demonstration: a small frog floats calmly above the magnet bore in a glass tube, a camera watching.',
      stuck: 'Someone forgot: a chair, a wrench and a fire extinguisher stuck to the side of the magnet at wild angles, a lost shoe.',
      record: 'A record field: paper bunting strung across the hall, a banner and a cake on a trestle table.',
      leak: 'A cooling hose has burst: a spray of water, a spreading puddle, a mop bucket and a wet-floor sign.',
    }),
    walls: choice('What hangs on the walls?', {
      safety: 'Rows of warning signs: magnet triangles, no pacemakers, no metal, ear defenders required.',
      chalk: 'A long blackboard of field equations with a chalk frog doodled in the corner.',
      frog: 'A big poster of the flying frog and framed newspaper clippings.',
      pegboard: 'A tool pegboard of painted outlines with nearly every tool missing.',
      blueprints: 'Pinned blue engineering drawings of coil plates and cross-sections.',
      bare: 'Bare wall: conduit runs, junction boxes and a red fire hose reel.',
    }),
    sign: choice('What is lettered big on the back wall?', {
      cell: 'The cell number and its field, like CELL 5 · 33 T.',
      lab: 'HIGH FIELD MAGNET LABORATORY',
      danger: 'DANGER · STRONG MAGNETIC FIELD',
      joke: 'MAGNETS: HOW DO THEY WORK?',
    }),
    view: choice('Where is the hall seen from?', {
      floor: 'Low from the floor, the stack looming two storeys overhead.',
      gallery: 'From a visitors gallery, a three-quarter view over the whole hall.',
      crane: 'High in the roof, looking steeply down on the floor stripes.',
      axis: 'Square-on to the back wall, formal and symmetrical.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const era: Era = a.era;
    const P = ERA[era];
    const st = a.state;
    const big = a.dominant === 'stack';
    const H = big ? 8.0 : 7.4; // the hall grows with its magnet
    const jit = (v: number) => (random() - 0.5) * 2 * v;
    const [pitch, yaw] = ({ floor: [16, 31], gallery: [30, 27], crane: [50, 22], axis: [22, 4] } as const)[a.view];
    const backdrop = new THREE.Color(P.bg).lerp(new THREE.Color(mood.warmth > 0.5 ? '#f2dcbc' : '#d0deec'), Math.abs(mood.warmth - 0.5) * 0.6);
    const { art: s, world } = diorama(context, {
      background: `#${backdrop.getHexString()}`, floor: null, width: W, depth: ZF * 2, pitch, yaw,
      maxHeight: 2.3, radius: 1.2, scale: [0.8, 1.6],
      slots: [[0.5, 1.5], [3.9, -0.6], [-3.2, 2.3], [4.1, 3.0]],
    });
    const R = s.root;

    // ---- Small local vocabulary: every mesh casts and receives shadow and lands under a parent.
    const add = (geometry: THREE.BufferGeometry, material: M | M[], at: V = [0, 0, 0], rot: V = [0, 0, 0], parent: THREE.Object3D = R) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(at[0], at[1], at[2]);
      mesh.rotation.set(rot[0], rot[1], rot[2]);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const box = (size: V, at: V, material: M | M[], rot: V = [0, 0, 0], parent: THREE.Object3D = R) => add(new THREE.BoxGeometry(size[0], size[1], size[2]), material, at, rot, parent);
    const cyl = (top: number, bottom: number, height: number, at: V, material: M, segments = 18, rot: V = [0, 0, 0], parent: THREE.Object3D = R) =>
      add(new THREE.CylinderGeometry(top, bottom, height, segments), material, at, rot, parent);
    const ball = (size: V, at: V, material: M, parent: THREE.Object3D = R) => {
      const mesh = add(new THREE.SphereGeometry(1, 14, 10), material, at, [0, 0, 0], parent);
      mesh.scale.set(size[0], size[1], size[2]);
      return mesh;
    };
    const span = (from: V, to: V, geometry: (length: number) => THREE.BufferGeometry, material: M, parent: THREE.Object3D = R) => {
      const A = new THREE.Vector3(from[0], from[1], from[2]), B = new THREE.Vector3(to[0], to[1], to[2]);
      const dir = B.clone().sub(A);
      const mesh = add(geometry(Math.max(dir.length(), 0.001)), material, [(A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2], [0, 0, 0], parent);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      return mesh;
    };
    const rod = (from: V, to: V, r: number, material: M, parent: THREE.Object3D = R) => span(from, to, (l) => new THREE.CylinderGeometry(r, r, l, 8), material, parent);
    const beam = (from: V, to: V, w: number, d: number, material: M, parent: THREE.Object3D = R) => span(from, to, (l) => new THREE.BoxGeometry(w, l, d), material, parent);
    const tube = (points: readonly V[], r: number, material: M, parent: THREE.Object3D = R, segments = 0) =>
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2]))), segments || Math.max(16, points.length * 7), r, 7, false), material, [0, 0, 0], [0, 0, 0], parent);
    const decal = (texture: THREE.Texture, w: number, h: number, at: V, rot: V = [0, 0, 0], extra: THREE.MeshStandardMaterialParameters = {}, parent: THREE.Object3D = R) => {
      const mesh = add(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, ...extra }), at, rot, parent);
      mesh.castShadow = false;
      return mesh;
    };
    const compose = (at: V, rot: V = [0, 0, 0], scale: V = [1, 1, 1]) =>
      new THREE.Matrix4().compose(new THREE.Vector3(at[0], at[1], at[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])), new THREE.Vector3(scale[0], scale[1], scale[2]));
    const instanced = (geometry: THREE.BufferGeometry, material: M, matrices: THREE.Matrix4[], parent: THREE.Object3D = R) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, matrices.length));
      matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      if (!matrices.length) mesh.count = 0;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const mat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => s.material(colour, options);
    const glow = (colour: THREE.ColorRepresentation, intensity = 1.3) => new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: intensity, roughness: 0.4 });

    // ---- Light: a fluorescent interior, cool or warm with the mood, washed red in an alarm.
    const tubeColour = new THREE.Color('#e8f2ff').lerp(new THREE.Color('#ffe6c2'), mood.warmth);
    for (const child of R.children) {
      const hemi = child as THREE.HemisphereLight;
      if (!hemi.isHemisphereLight) continue;
      hemi.intensity = 1.75;
      hemi.color.copy(tubeColour);
      if (st === 'alarm') hemi.color.lerp(new THREE.Color('#ff8a7a'), 0.3);
      hemi.groundColor.set('#8b8778');
    }
    world.keyLight!.intensity = 2.0;

    const steel = mat(P.steel, { metalness: 0.45, roughness: 0.5 });
    const trim = mat(P.trim, { metalness: 0.2 });
    const dark = mat('#2b2d2f', { roughness: 0.7 });
    const railMat = mat(P.rail, { metalness: era === 'victorian' || era === 'future' ? 0.75 : 0.2, roughness: 0.4 });
    const deckMat = mat(P.deck, { metalness: era === 'shed' ? 0 : 0.3 });
    const flangeMat = mat(P.flange, { metalness: era === 'future' || era === 'victorian' ? 0.8 : 0.35, roughness: 0.32 });
    const brass = mat('#b58f3e', { metalness: 0.8, roughness: 0.35 });
    const hoseMat = mat(P.hose, { roughness: 0.75 });
    const copperBar = mat('#c4743e', { metalness: 0.75, roughness: 0.3 });
    const tubeLit = glow(tubeColour, 1.5);
    const tubeDead = mat('#9a9e9f');
    const yellow = era === 'victorian' ? '#e7dcc0' : '#e6b423';
    const lamps: { material: THREE.MeshStandardMaterial; mode: 'steady' | 'spin' | 'flash' | 'flicker'; phase: number; peak: number }[] = [];

    // ---- The magnet's proportions decide the floor markings, so settle them first.
    const rs = big ? 1.12 : 0.92, nMod = big ? 4 : 3, modH = big ? 1.22 : 1.2, base = 0.72;
    const yTop = base + nMod * modH, yCap = yTop + 0.22;
    const lift = st === 'open' ? (big ? 0.75 : 1.15) : 0, swingOut = st === 'open' ? -0.75 : 0;
    const pull = st === 'full' ? 0.55 : st === 'ramping' ? 0.34 : st === 'alarm' ? 0.18 : 0;
    const HXP = -HX + 0.32; // header pipe line on the left wall

    const nh = (a.dominant === 'hoses' ? 13 : 6) + Math.round(mood.density * 2);
    const rh = a.dominant === 'hoses' ? 0.085 : 0.065;
    const hoses = Array.from({ length: nh }, (_, i) => {
      const t = (i + 0.5) / nh;
      const th = mix(0.8 * Math.PI, 1.46 * Math.PI, t) + jit(0.035);
      const c = Math.cos(th), sn = Math.sin(th);
      const y = mix(base + 0.35, DECK - 0.4, (i * 0.618) % 1);
      const header = i % 2 === 0 ? 0.75 : 1.35;
      const zEnd = mix(0.55, -4.75, t) + jit(0.06);
      const out = (r: number, yy: number): V => [SX + c * r, yy, SZ + sn * r];
      const floorR = rs + 1.35 + random() * 0.5;
      const loose = st === 'open' && i % 3 === 0;
      const head: V[] = loose ? [out(rs + 0.5, rh), out(rs + 0.9, rh)] : [out(rs + 0.1, y), out(rs + 0.55, y - 0.14), out(rs + 0.95, Math.max(0.5, y * 0.45))];
      const pts: V[] = [...head, out(floorR, rh), [mix(SX + c * floorR, -6.5, 0.6), rh, mix(SZ + sn * floorR, zEnd, 0.75)], [-6.55, rh + 0.01, zEnd], [-6.8, header - 0.25, zEnd], [HXP + 0.1, header, zEnd]];
      return { th, c, sn, y, pts, loose, burst: out(floorR, rh) };
    });
    const burst = hoses[0].burst;

    // ---- Floor: painted concrete (or flags, or epoxy) with the 5-gauss line, walkways and stencils.
    const fm = 136, FW = Math.round(W * fm), FH = Math.round(D * fm);
    const fx = (x: number) => (x + HX) * fm, fz = (z: number) => (z + HZ) * fm;
    const cellNo = 1 + Math.floor(random() * 9);
    const fieldMax = [30, 33, 35, 37.5, 38.5, 45][Math.floor(random() * 6)];
    const floorTex = paint(FW, FH, (ctx) => {
      ctx.fillStyle = P.floor; ctx.fillRect(0, 0, FW, FH);
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = `rgba(${random() < 0.5 ? '40,36,30' : '255,255,250'},${0.02 + random() * 0.035})`;
        ctx.beginPath(); ctx.ellipse(random() * FW, random() * FH, 30 + random() * 190, 20 + random() * 110, random() * 3, 0, TAU); ctx.fill();
      }
      ctx.lineWidth = 3;
      if (era === 'victorian') {
        ctx.strokeStyle = 'rgba(50,40,30,0.4)';
        for (let row = 0, z = -HZ; z < ZF; row++, z += 0.9)
          for (let x = -HX - (row % 2) * 0.55; x < HX;) {
            const w = 0.9 + random() * 0.7;
            ctx.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,255,255'},${random() * 0.07})`;
            ctx.fillRect(fx(x), fz(z), w * fm, 0.9 * fm); ctx.strokeRect(fx(x), fz(z), w * fm, 0.9 * fm);
            x += w;
          }
      } else if (era === 'future') {
        for (let x = -HX; x <= HX; x += 1.5) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(fx(x), 0, 3, FH); ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(fx(x) + 3, 0, 2, FH); }
        for (let z = -HZ; z <= ZF; z += 1.5) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(0, fz(z), FW, 3); ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(0, fz(z) + 3, FW, 2); }
      } else {
        ctx.strokeStyle = 'rgba(30,28,24,0.3)';
        for (let x = -HX + 3.75; x < HX; x += 3.75) { ctx.beginPath(); ctx.moveTo(fx(x), 0); ctx.lineTo(fx(x), FH); ctx.stroke(); }
        for (let z = -HZ + 3.3; z < ZF; z += 3.3) { ctx.beginPath(); ctx.moveTo(0, fz(z)); ctx.lineTo(FW, fz(z)); ctx.stroke(); }
      }
      // Oil and scuffs by wear, cracks once it is old.
      for (let i = 0; i < Math.round(3 + mood.wear * 34); i++) {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, `rgba(30,26,22,${0.22 + mood.wear * 0.35})`); g.addColorStop(1, 'rgba(30,26,22,0)');
        ctx.save(); ctx.translate(random() * FW, random() * FH); ctx.scale(20 + random() * 110, 14 + random() * 70);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
      }
      ctx.strokeStyle = 'rgba(25,22,18,0.5)'; ctx.lineWidth = 2;
      for (let i = 0; i < Math.round(Math.max(0, mood.wear - 0.3) * 18); i++) {
        let x = random() * FW, y = random() * FH;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 7; k++) { x += jit(40); y += jit(40); ctx.lineTo(x, y); }
        ctx.stroke();
      }
      // Chequer-plate covers over the bus bar trench.
      const trench = (x0: number, z0: number, x1: number, z1: number) => {
        ctx.fillStyle = '#8f9394'; ctx.fillRect(fx(x0), fz(z0), (x1 - x0) * fm, (z1 - z0) * fm);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
        for (let y = fz(z0) + 7, j = 0; y < fz(z1) - 4; y += 13, j++)
          for (let x = fx(x0) + 7, i = 0; x < fx(x1) - 4; x += 13, i++) { ctx.beginPath(); ctx.moveTo(x - 3, y + ((i + j) % 2 ? 3 : -3)); ctx.lineTo(x + 3, y + ((i + j) % 2 ? -3 : 3)); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 3; ctx.strokeRect(fx(x0), fz(z0), (x1 - x0) * fm, (z1 - z0) * fm);
      };
      trench(SX + rs + 0.4, SZ - 0.62, XB + 0.62, SZ + 0.62);
      trench(XB - 0.62, GZ + 0.3, XB + 0.62, SZ - 0.62);
      // The 5-gauss line: a hatched ring round the magnet.
      const r0 = (rs + 1.85) * fm, r1 = (rs + 2.15) * fm;
      ctx.save(); ctx.beginPath(); ctx.arc(fx(SX), fz(SZ), r1, 0, TAU); ctx.arc(fx(SX), fz(SZ), r0, 0, TAU, true); ctx.clip();
      ctx.fillStyle = yellow; ctx.fillRect(0, 0, FW, FH);
      ctx.strokeStyle = '#1f1e1b'; ctx.lineWidth = 0.13 * fm;
      for (let d = -FH; d < FW; d += 0.36 * fm) { ctx.beginPath(); ctx.moveTo(d, FH); ctx.lineTo(d + FH, 0); ctx.stroke(); }
      ctx.restore();
      stencil(ctx, '5 GAUSS LINE', fx(SX + 0.4), fz(SZ + rs + 2.5), 0.3 * fm, yellow);
      stencil(ctx, 'NO FERROUS METAL BEYOND', fx(SX + 0.4), fz(SZ + rs + 2.85), 0.17 * fm, 'rgba(40,36,30,0.85)');
      // Walkways and the staging square where the cast stands.
      ctx.fillStyle = yellow;
      ctx.fillRect(fx(0.2), fz(-1.95) - 0.05 * fm, 6.2 * fm, 0.1 * fm);
      ctx.fillRect(fx(6.35) - 0.05 * fm, fz(-1.95), 0.1 * fm, (ZF + 1.95) * fm);
      ctx.setLineDash([0.45 * fm, 0.25 * fm]); ctx.strokeStyle = yellow; ctx.lineWidth = 0.08 * fm;
      ctx.strokeRect(fx(-0.9), fz(0.1), 2.8 * fm, 2.8 * fm); ctx.setLineDash([]);
      stencil(ctx, `CELL ${cellNo}`, fx(0.5), fz(3.5), 0.45 * fm, 'rgba(250,246,232,0.75)');
      stencil(ctx, 'KEEP CLEAR', fx(6.95), fz(1.75), 0.2 * fm, yellow, 1.0 * fm);
      if (a.story === 'leak') {
        const g = ctx.createRadialGradient(fx(burst[0]), fz(burst[2] + 0.6), 0, fx(burst[0]), fz(burst[2] + 0.6), 2.2 * fm);
        g.addColorStop(0, 'rgba(40,52,60,0.55)'); g.addColorStop(1, 'rgba(40,52,60,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, FW, FH);
      }
    });
    const ground = new THREE.Group();
    R.add(ground);
    box([W, 0.24, D], [0, -0.121, ZC], mat(P.floor), [0, 0, 0], ground).castShadow = false;
    add(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: era === 'future' ? 0.3 : 0.88, metalness: era === 'future' ? 0.08 : 0 }), [0, 0.002, ZC], [-Math.PI / 2, 0, 0], ground).castShadow = false;
    world.ground = ground;

    // ---- Walls: the back and the left, painted for the era, with grime by wear.
    const PXM = 88;
    const wallTexture = (length: number) => paint(Math.round(length * PXM), Math.round(H * PXM), (ctx, w, h) => {
      const yy = (y: number) => h - y * PXM;
      ctx.fillStyle = P.wall; ctx.fillRect(0, 0, w, h);
      if (era === 'nineties') {
        ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1.5;
        for (let r = 0; r * 0.2 < H; r++) {
          ctx.beginPath(); ctx.moveTo(0, yy(r * 0.2)); ctx.lineTo(w, yy(r * 0.2)); ctx.stroke();
          for (let x = (r % 2) * 0.2; x < length; x += 0.4) { ctx.beginPath(); ctx.moveTo(x * PXM, yy(r * 0.2)); ctx.lineTo(x * PXM, yy(r * 0.2 + 0.2)); ctx.stroke(); }
        }
        ctx.fillStyle = P.dado; ctx.fillRect(0, yy(1.5), w, 1.5 * PXM);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, yy(1.5), w, 4);
      } else if (era === 'victorian') {
        for (let r = 0; r * 0.09 < H; r++)
          for (let x = (r % 2) * -0.115; x < length; x += 0.23) {
            const k = random();
            ctx.fillStyle = `rgb(${130 + k * 40},${70 + k * 22},${50 + k * 16})`;
            ctx.fillRect(x * PXM + 1, yy(r * 0.09 + 0.09) + 1, 0.23 * PXM - 2, 0.09 * PXM - 2);
          }
        ctx.fillStyle = P.dado; ctx.fillRect(0, yy(1.3), w, 1.3 * PXM);
        ctx.strokeStyle = 'rgba(255,240,210,0.18)'; ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 0.15 * PXM) { ctx.beginPath(); ctx.moveTo(x, yy(1.3)); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0.15; y < 1.3; y += 0.15) { ctx.beginPath(); ctx.moveTo(0, yy(y)); ctx.lineTo(w, yy(y)); ctx.stroke(); }
        ctx.fillStyle = '#c7a25a'; ctx.fillRect(0, yy(1.36), w, 0.06 * PXM);
      } else if (era === 'future') {
        ctx.strokeStyle = 'rgba(80,95,105,0.3)'; ctx.lineWidth = 2;
        for (let x = 0; x < length; x += 1.5) { ctx.beginPath(); ctx.moveTo(x * PXM, 0); ctx.lineTo(x * PXM, h); ctx.stroke(); }
        for (let y = 0; y < H; y += 1.2) { ctx.beginPath(); ctx.moveTo(0, yy(y)); ctx.lineTo(w, yy(y)); ctx.stroke(); }
        ctx.fillStyle = P.dado; ctx.fillRect(0, yy(1.0), w, 1.0 * PXM);
        ctx.fillStyle = '#41cdea'; ctx.fillRect(0, yy(1.06), w, 0.05 * PXM);
      } else {
        const tile = document.createElement('canvas'); tile.width = 8; tile.height = 8;
        const tc = tile.getContext('2d')!, gr = tc.createLinearGradient(0, 0, 8, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0.2)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0.2)');
        tc.fillStyle = gr; tc.fillRect(0, 0, 8, 8);
        ctx.fillStyle = ctx.createPattern(tile, 'repeat')!; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        for (let y = 2.4; y < H; y += 2.4) ctx.fillRect(0, yy(y), w, 3);
        for (let i = 0; i < Math.round(4 + mood.wear * 20); i++) {
          const x = random() * w, y = yy(2.4 * Math.ceil(random() * 3)), g = ctx.createLinearGradient(0, y, 0, y + 120);
          g.addColorStop(0, 'rgba(140,72,30,0.45)'); g.addColorStop(1, 'rgba(140,72,30,0)');
          ctx.fillStyle = g; ctx.fillRect(x, y, 3 + random() * 6, 120);
        }
        ctx.fillStyle = '#9b9a93'; ctx.fillRect(0, yy(0.9), w, 0.9 * PXM);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        for (let r = 0; r < 4; r++) { ctx.beginPath(); ctx.moveTo(0, yy(r * 0.225)); ctx.lineTo(w, yy(r * 0.225)); ctx.stroke(); }
      }
      ctx.fillStyle = 'rgba(30,30,30,0.5)'; ctx.fillRect(0, yy(0.12), w, 0.12 * PXM);
      const grime = ctx.createLinearGradient(0, h, 0, yy(1.5));
      grime.addColorStop(0, `rgba(50,44,36,${0.08 + mood.wear * 0.35})`); grime.addColorStop(1, 'rgba(50,44,36,0)');
      ctx.fillStyle = grime; ctx.fillRect(0, yy(1.5), w, 1.5 * PXM);
      for (let i = 0; i < Math.round(mood.wear * 14); i++) {
        const x = random() * w, g = ctx.createLinearGradient(0, 0, 0, 200 + random() * 200);
        g.addColorStop(0, 'rgba(70,60,50,0.3)'); g.addColorStop(1, 'rgba(70,60,50,0)');
        ctx.fillStyle = g; ctx.fillRect(x, 0, 4 + random() * 8, 400);
      }
    });
    const edge = mat(P.trim);
    const backWall = add(new THREE.BoxGeometry(W + 0.3, H, 0.3), [edge, edge, edge, edge, new THREE.MeshStandardMaterial({ map: wallTexture(W + 0.3), roughness: 0.9 }), edge], [-0.15, H / 2, -HZ - 0.15]);
    const leftWall = add(new THREE.BoxGeometry(0.3, H, D), [new THREE.MeshStandardMaterial({ map: wallTexture(D), roughness: 0.9 }), edge, edge, edge, edge, edge], [-HX - 0.15, H / 2, ZC]);
    backWall.castShadow = leftWall.castShadow = false;
    box([W + 0.3, 0.32, 0.42], [-0.15, H - 0.16, -HZ + 0.06], trim).castShadow = false;
    box([0.42, 0.32, D], [-HX + 0.06, H - 0.16, ZC], trim).castShadow = false;
    for (const [x, z] of [[-HX + 0.18, ZF - 0.18], [HX - 0.18, -HZ + 0.18], [-HX + 0.18, -HZ + 0.18]] as const) {
      if (era === 'victorian') {
        cyl(0.14, 0.17, H - 0.4, [x, (H - 0.4) / 2, z], trim, 14);
        box([0.44, 0.22, 0.44], [x, H - 0.45, z], trim);
        box([0.4, 0.3, 0.4], [x, 0.15, z], trim);
      } else box([0.32, H, 0.32], [x, H / 2, z], era === 'shed' ? mat('#8d9393', { metalness: 0.4 }) : steel);
    }

    // Windows high on the left wall, lit by the time of day.
    const sky = new THREE.Color('#f4c9a6').lerp(new THREE.Color('#cfe3f4'), 1 - Math.abs(mood.daylight - 0.5) * 2);
    const arched = era === 'victorian';
    const windowTex = paint(256, arched ? 512 : 220, (ctx, w, h) => {
      const top = arched ? w / 2 : 0;
      ctx.beginPath();
      if (arched) { ctx.moveTo(0, h); ctx.lineTo(0, top); ctx.arc(w / 2, top, w / 2, Math.PI, 0); ctx.lineTo(w, h); ctx.closePath(); } else ctx.rect(0, 0, w, h);
      ctx.fillStyle = era === 'victorian' ? '#2f4b3c' : era === 'future' ? '#9aa6ae' : '#4c5458'; ctx.fill();
      ctx.save(); ctx.clip();
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, `#${sky.getHexString()}`); g.addColorStop(1, '#ffffff');
      const cols = era === 'future' ? 2 : 4, rows = arched ? 7 : 3, pad = 9;
      ctx.fillStyle = g;
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        const x = pad + c * (w - pad) / cols, y = pad + r * (h - pad) / rows;
        ctx.fillRect(x, y, (w - pad) / cols - pad, (h - pad) / rows - pad);
      }
      if (arched) { ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w / 2, top, w / 2 - pad, Math.PI, 0); ctx.fill(); ctx.strokeStyle = '#2f4b3c'; ctx.lineWidth = 8; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(w / 2, top); ctx.lineTo(w / 2 + Math.cos(Math.PI + i * Math.PI / 4) * w / 2, top + Math.sin(Math.PI + i * Math.PI / 4) * w / 2); ctx.stroke(); } }
      ctx.fillStyle = `rgba(80,80,70,${mood.wear * 0.35})`; ctx.fillRect(0, 0, w, h);
      ctx.restore();
    });
    const windowMat = new THREE.MeshStandardMaterial({ map: windowTex, emissive: '#ffffff', emissiveMap: windowTex, emissiveIntensity: 0.45 + (1 - Math.abs(mood.daylight - 0.5) * 2) * 0.25, alphaTest: 0.4, roughness: 0.3, side: THREE.DoubleSide });
    for (const z of [-3.2, -0.4, 2.9]) {
      const pane = add(new THREE.PlaneGeometry(arched ? 1.5 : 2.0, arched ? 3.0 : 1.7), windowMat, [-HX + 0.02, arched ? 5.05 : 5.55, z], [0, Math.PI / 2, 0]);
      pane.castShadow = false;
    }

    // Fluorescent battens (gas globes in the Victorian hall).
    const fitting = (at: V, alongZ: boolean, lit: boolean) => {
      if (era === 'victorian') {
        rod([at[0] + (alongZ ? -0.1 : 0), at[1] + 0.2, at[2] + (alongZ ? 0 : -0.1)], [at[0] + (alongZ ? 0.25 : 0), at[1], at[2] + (alongZ ? 0 : 0.25)], 0.02, brass);
        const globe = ball([0.13, 0.13, 0.13], [at[0] + (alongZ ? 0.25 : 0), at[1] - 0.12, at[2] + (alongZ ? 0 : 0.25)], lit ? glow('#ffe2a8', 1.4) : tubeDead);
        globe.castShadow = false;
        return globe;
      }
      box(alongZ ? [0.16, 0.09, 1.5] : [1.5, 0.09, 0.16], at, era === 'future' ? mat('#e6eaec') : dark);
      const material = lit ? tubeLit.clone() : tubeDead;
      const t = box(alongZ ? [0.07, 0.05, 1.4] : [1.4, 0.05, 0.07], [at[0] + (alongZ ? 0.03 : 0), at[1] - 0.06, at[2] + (alongZ ? 0 : 0.03)], material);
      t.castShadow = false;
      return t;
    };
    let flickered = false;
    for (const x of [-6.2, -3.6, -1.0, 1.6, 4.2, 6.6]) {
      const lit = random() > mood.wear * 0.3;
      const t = fitting([x, H - 0.48, -HZ + 0.12], false, lit);
      if (lit && !flickered && mood.wear > 0.45) { flickered = true; lamps.push({ material: t.material as THREE.MeshStandardMaterial, mode: 'flicker', phase: random() * 9, peak: 1.5 }); }
    }
    for (const z of [-3.2, -0.4, 2.9]) fitting([-HX + 0.12, arched ? 3.2 : 4.3, z], true, random() > mood.wear * 0.3);

    // ---- The lettering high on the back wall.
    const signText = { cell: `CELL ${cellNo}  ·  ${fieldMax} T`, lab: 'HIGH FIELD MAGNET LABORATORY', danger: 'DANGER  ·  STRONG MAGNETIC FIELD', joke: 'MAGNETS: HOW DO THEY WORK?' }[a.sign];
    const signTex = paint(2048, 160, (ctx, w, h) => {
      if (era === 'victorian') { ctx.fillStyle = '#1e1c1a'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#c7a25a'; ctx.lineWidth = 8; ctx.strokeRect(6, 6, w - 12, h - 12); }
      else if (era === 'future') { ctx.fillStyle = '#20262c'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#41cdea'; ctx.fillRect(0, h - 8, w, 8); }
      const ink = era === 'victorian' ? '#e0bd6a' : era === 'future' ? '#f2f6f8' : a.sign === 'danger' ? '#b3261e' : era === 'shed' ? '#b3261e' : '#2f3d44';
      stencil(ctx, signText, w / 2, h / 2 + 4, 112, ink, w - 60, era === 'victorian' ? 'serif' : 'sans-serif');
    });
    decal(signTex, 9.6, 0.75, [2.3, H - 1.2, -HZ + 0.02], [0, 0, 0], era === 'victorian' || era === 'future' ? {} : { transparent: true, alphaTest: 0.2 });

    // ---- The magnet: a two-storey stack of copper Bitter coils on a plinth, with a platform round it.
    const stack = new THREE.Group();
    stack.position.set(SX, 0, SZ);
    R.add(stack);
    const top = new THREE.Group();
    top.position.set(swingOut, lift, 0);
    stack.add(top);
    const coilTex = paint(64, 512, (ctx, w, h) => {
      const step = era === 'victorian' ? 5 : 8;
      for (let y = 0; y < h; y += step) {
        const k = random();
        ctx.fillStyle = `rgb(${176 + k * 40},${92 + k * 30},${50 + k * 18})`; ctx.fillRect(0, y, w, step - 1);
        ctx.fillStyle = 'rgba(50,22,10,0.6)'; ctx.fillRect(0, y + step - 1, w, 1);
      }
      if (era !== 'victorian') { ctx.fillStyle = 'rgba(40,18,8,0.35)'; for (let i = 0; i < 4; i++) ctx.fillRect(i * 16 + 6, 0, 3, h); }
    });
    coilTex.wrapS = coilTex.wrapT = THREE.RepeatWrapping;
    coilTex.repeat.set(5, 1);
    const copper = new THREE.MeshStandardMaterial({ map: coilTex, metalness: 0.55, roughness: 0.36 + mood.wear * 0.2 });
    const chrome = mat('#dfe5ea', { metalness: 0.9, roughness: 0.18 });
    const cyan = glow('#47d3f0', st === 'open' || st === 'idle' ? 0.5 : 1.6);
    cyl(rs + 0.8, rs + 0.85, 0.3, [0, 0.15, 0], mat(era === 'victorian' ? '#8b8476' : '#a9a69c'), 8, [0, Math.PI / 8, 0], stack);
    cyl(rs + 0.3, rs + 0.34, base - 0.3, [0, 0.3 + (base - 0.3) / 2, 0], era === 'future' ? chrome : steel, 32, [0, 0, 0], stack);
    const rodGeo = new THREE.CylinderGeometry(0.026, 0.026, modH, 6);
    const lowerRods: THREE.Matrix4[] = [], upperRods: THREE.Matrix4[] = [];
    for (let i = 0; i < nMod; i++) {
      const y0 = base + i * modH, last = i === nMod - 1;
      const parent = last ? top : stack;
      if (era === 'future') {
        cyl(rs, rs, modH - 0.06, [0, y0 + modH / 2, 0], chrome, 40, [0, 0, 0], parent);
        cyl(rs + 0.04, rs + 0.04, 0.07, [0, y0 + 0.04, 0], cyan, 40, [0, 0, 0], parent).castShadow = false;
        // A slot in the chrome showing the copper plates inside.
        const slot = add(new THREE.CylinderGeometry(rs + 0.01, rs + 0.01, modH - 0.3, 12, 1, true, 0.15 * Math.PI, 0.18 * Math.PI), copper, [0, y0 + modH / 2, 0], [0, 0, 0], parent);
        slot.castShadow = false;
      } else {
        cyl(rs, rs, modH - 0.12, [0, y0 + 0.12 + (modH - 0.12) / 2, 0], copper, 44, [0, 0, 0], parent);
        cyl(rs + 0.13, rs + 0.13, 0.12, [0, y0 + 0.06, 0], flangeMat, 40, [0, 0, 0], parent);
        for (let k = 0; k < 8; k++) {
          const ang = (k + 0.5) / 8 * TAU;
          (last ? upperRods : lowerRods).push(compose([Math.cos(ang) * (rs + 0.08), y0 + modH / 2, Math.sin(ang) * (rs + 0.08)]));
        }
      }
    }
    if (lowerRods.length) instanced(rodGeo, dark, lowerRods, stack);
    if (upperRods.length) instanced(rodGeo, dark, upperRods, top);
    cyl(rs + 0.2, rs + 0.2, 0.22, [0, yTop + 0.11, 0], era === 'future' ? chrome : flangeMat, 40, [0, 0, 0], top);
    const boltGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.06, 6);
    instanced(boltGeo, dark, Array.from({ length: 16 }, (_, k) => compose([Math.cos(k / 16 * TAU) * (rs + 0.08), yCap + 0.03, Math.sin(k / 16 * TAU) * (rs + 0.08)])), top);
    add(new THREE.TorusGeometry(0.22, 0.04, 8, 24), mat('#9aa2a8', { metalness: 0.8, roughness: 0.3 }), [0, yCap + 0.01, 0], [Math.PI / 2, 0, 0], top);
    cyl(0.2, 0.2, 0.02, [0, yCap + 0.002, 0], mat('#121314'), 20, [0, 0, 0], top);
    const fieldOn = st === 'ramping' || st === 'full' || st === 'alarm';
    if (fieldOn || a.story === 'frog') {
      // The bore glows when the field is up.
      const halo = add(new THREE.CircleGeometry(0.45, 28), new THREE.MeshBasicMaterial({ color: '#a8e6ff', transparent: true, opacity: fieldOn ? 0.7 : 0.35, depthWrite: false, toneMapped: false }), [0, yCap + 0.025, 0], [-Math.PI / 2, 0, 0], top);
      halo.castShadow = halo.receiveShadow = false;
    }
    // A hum you can feel: ripples running out across the floor while the field is live.
    const ripples: THREE.Mesh[] = [];
    if (st === 'ramping' || st === 'full') {
      const tone = st === 'full' ? '#ff8a2a' : '#ffbf2a';
      for (let i = 0; i < 3; i++) {
        const ripple = add(new THREE.RingGeometry(0.95, 1, 72), new THREE.MeshBasicMaterial({ color: tone, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), [0, 0.03 + i * 0.002, 0], [-Math.PI / 2, 0, 0], stack);
        ripple.castShadow = ripple.receiveShadow = false;
        const r = mix(rs + 0.95, rs + 1.85, i / 3);
        ripple.scale.set(r, r, 1);
        ripples.push(ripple);
      }
    }
    box([0.32, 0.22, 0.24], [rs - 0.2, yCap + 0.11, -0.3], mat(era === 'victorian' ? '#5c3a25' : '#7d8589'), [0, 0.4, 0], top);
    if (st === 'open') {
      // The seat the top coil was lifted from, open to the sky.
      cyl(rs - 0.05, rs - 0.05, 0.03, [0, yTop - modH + 0.02, 0], mat('#3a2a20'), 32, [0, 0, 0], stack);
      cyl(0.2, 0.2, 0.04, [0, yTop - modH + 0.04, 0], mat('#0f1011'), 20, [0, 0, 0], stack);
    }

    // The platform round the stack at first-floor height, with a ladder up the front.
    const ringShape = new THREE.Shape();
    ringShape.absarc(0, 0, rs + 1.0, 0, TAU, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, rs + 0.15, 0, TAU, true);
    ringShape.holes.push(hole);
    const ringGeo = new THREE.ExtrudeGeometry(ringShape, { depth: 0.12, bevelEnabled: false, curveSegments: 40 });
    ringGeo.rotateX(-Math.PI / 2);
    add(ringGeo, deckMat, [0, DECK - 0.12, 0], [0, 0, 0], stack);
    const postGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6);
    instanced(postGeo, railMat, Array.from({ length: 16 }, (_, k) => compose([Math.cos(k / 16 * TAU) * (rs + 0.95), DECK + 0.5, Math.sin(k / 16 * TAU) * (rs + 0.95)])), stack);
    for (const y of [DECK + 1.0, DECK + 0.5]) add(new THREE.TorusGeometry(rs + 0.95, 0.028, 6, 56), railMat, [0, y, 0], [Math.PI / 2, 0, 0], stack);
    for (const ang of [0.1, 0.6, 1.1, 1.6]) rod([Math.cos(ang * Math.PI) * (rs + 0.85), 0.3, Math.sin(ang * Math.PI) * (rs + 0.85)], [Math.cos(ang * Math.PI) * (rs + 0.85), DECK - 0.12, Math.sin(ang * Math.PI) * (rs + 0.85)], 0.05, steel, stack);
    {
      const la = 0.62 * Math.PI, r = rs + 1.08, cx = Math.cos(la) * r, cz = Math.sin(la) * r, tx = -Math.sin(la), tz = Math.cos(la);
      for (const side of [-1, 1]) rod([cx + tx * side * 0.22, 0, cz + tz * side * 0.22], [cx + tx * side * 0.22, DECK + 1.0, cz + tz * side * 0.22], 0.025, railMat, stack);
      const rung = new THREE.CylinderGeometry(0.018, 0.018, 0.44, 5);
      rung.rotateZ(Math.PI / 2);
      instanced(rung, railMat, Array.from({ length: 11 }, (_, k) => compose([cx, 0.28 + k * 0.28, cz], [0, -la - Math.PI / 2, 0])), stack);
    }

    // Couplings on the stack, and the hoses running to the headers on the left wall.
    const couplingGeo = new THREE.CylinderGeometry(rh * 1.5, rh * 1.5, 0.16, 10);
    const couplings: THREE.Matrix4[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    for (const hose of hoses) {
      tube(hose.pts, rh, hoseMat, R, 54);
      const q = new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(hose.c, 0, hose.sn));
      couplings.push(new THREE.Matrix4().compose(new THREE.Vector3(SX + hose.c * (rs + 0.06), hose.y, SZ + hose.sn * (rs + 0.06)), q, new THREE.Vector3(1, 1, 1)));
      if (hose.loose) couplings.push(new THREE.Matrix4().compose(new THREE.Vector3(hose.pts[0][0], rh, hose.pts[0][2]), q, new THREE.Vector3(1, 1, 1)));
      const end = hose.pts[hose.pts.length - 1];
      couplings.push(new THREE.Matrix4().compose(new THREE.Vector3(end[0] + 0.05, end[1], end[2]), new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(1, 0, 0)), new THREE.Vector3(1, 1, 1)));
    }
    instanced(couplingGeo, brass, couplings);

    // The headers, risers, valves and pump on the left wall.
    const supply = mat(era === 'victorian' ? '#8a6a3a' : '#3d6f9c', { metalness: 0.3 }), ret = mat(era === 'victorian' ? '#6d4a2a' : '#a8443a', { metalness: 0.3 });
    const hz0 = -5.05, hz1 = 0.8;
    for (const [y, material] of [[0.75, supply], [1.35, ret]] as const) {
      cyl(0.15, 0.15, hz1 - hz0, [HXP, y, (hz0 + hz1) / 2], material, 14, [Math.PI / 2, 0, 0]);
      for (const z of [hz0, hz1]) ball([0.17, 0.17, 0.17], [HXP, y, z], material);
    }
    for (const [z, y, material] of [[hz0, 0.75, supply], [hz1, 1.35, ret]] as const) {
      cyl(0.15, 0.15, H - 0.7 - y, [HXP, y + (H - 0.7 - y) / 2, z], material, 14);
      ball([0.17, 0.17, 0.17], [HXP, H - 0.7, z], material);
      cyl(0.15, 0.15, 0.4, [HXP - 0.2, H - 0.7, z], material, 14, [0, 0, Math.PI / 2]);
    }
    const valveMat = mat('#c8302a', { metalness: 0.3 });
    for (const z of [-3.9, -2.2, -0.5]) {
      rod([HXP, 1.35, z], [HXP + 0.32, 1.35, z], 0.035, steel);
      add(new THREE.TorusGeometry(0.13, 0.022, 6, 18), valveMat, [HXP + 0.34, 1.35, z], [0, Math.PI / 2, 0]);
    }
    if (a.dominant === 'hoses') {
      // A heat exchanger lying along the wall, piped into the headers.
      cyl(0.55, 0.55, 2.8, [-6.7, 0.85, 2.8], mat(era === 'victorian' ? '#6a5a3c' : '#7a8c80', { metalness: 0.4 }), 24, [Math.PI / 2, 0, 0]);
      for (const z of [1.4, 4.2]) ball([0.55, 0.55, 0.2], [-6.7, 0.85, z], mat('#5d6b64', { metalness: 0.4 }));
      for (const z of [1.8, 3.8]) box([1.1, 0.35, 0.18], [-6.7, 0.17, z], dark);
      tube([[-6.7, 1.4, 1.8], [-6.7, 1.7, 1.2], [HXP + 0.05, 1.5, 0.95], [HXP, 1.35, 0.8]], 0.1, ret);
      tube([[-6.7, 0.3, 1.6], [-6.85, 0.5, 1.1], [HXP, 0.75, 0.85]], 0.1, supply);
      for (let i = 0; i < 4; i++) tube([[-6.5 + i * 0.05, 1.38, 2.0 + i * 0.6], [-5.9 + jit(0.1), 0.6, 1.9 + i * 0.6], [-5.4 + jit(0.2), rh, 1.2 + i * 0.4], [-5.1 + jit(0.3), rh, -0.3 + i * 0.2]], rh, hoseMat);
    } else {
      cyl(0.22, 0.22, 0.5, [-6.75, 0.42, 1.55], mat('#3d6f9c', { metalness: 0.3 }), 16, [0, 0, Math.PI / 2]);
      cyl(0.28, 0.28, 0.24, [-6.35, 0.42, 1.55], mat('#4a5157'), 16, [0, 0, Math.PI / 2]);
      box([0.9, 0.16, 0.6], [-6.6, 0.08, 1.55], dark);
      tube([[-6.35, 0.7, 1.55], [-6.5, 1.0, 1.2], [HXP + 0.1, 0.75, 0.85]], 0.08, supply);
    }

    // Bus bars, thick as logs, from the stack to the power cabinets under the gangway.
    const power = a.dominant === 'power';
    const nb = power ? 6 : 4, t = power ? 0.3 : 0.22, pairs = nb / 2, zCab = -HZ + 0.82;
    const insulators: THREE.Matrix4[] = [];
    const x0 = SX + rs - 0.05;
    for (let k = 0; k < nb; k++) {
      const p = Math.floor(k / 2), level = k % 2, y = 0.82 + level * (t + 0.1);
      const dz = (p - (pairs - 1) / 2) * (t + 0.16), z = SZ + dz, xt = XB + dz;
      box([xt - x0 + t / 2, t, t], [(x0 + xt + t / 2) / 2, y, z], copperBar);
      box([t, t, z - zCab + t / 2], [xt, y, (z + t / 2 + zCab) / 2], copperBar);
      if (level === 0) {
        insulators.push(compose([(x0 + XB - 0.6) / 2 + 0.25, y - t / 2 - 0.12, z]));
        insulators.push(compose([xt, y - t / 2 - 0.12, mix(SZ - 0.6, zCab, 0.5)]));
      }
    }
    instanced(new THREE.CylinderGeometry(0.07, 0.07, 0.24, 10), mat(P.porcelain, { roughness: 0.25 }), insulators);
    const spread = (pairs - 1) / 2 * (t + 0.16) + 0.3;
    for (const [cx, cz, alongX] of [[(x0 + XB - 0.6) / 2 + 0.25, SZ, false], [XB, mix(SZ - 0.6, zCab, 0.5), true]] as const) {
      const by = 0.82 - t / 2 - 0.26;
      box(alongX ? [spread * 2, 0.08, 0.14] : [0.14, 0.08, spread * 2], [cx, by, cz], steel);
      for (const sgn of [-1, 1]) box([0.08, by, 0.08], [cx + (alongX ? sgn * spread : 0), by / 2, cz + (alongX ? 0 : sgn * spread)], steel);
    }
    const cabTex = paint(200, 460, (ctx, w, h) => {
      ctx.fillStyle = P.cab; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3; ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.beginPath(); ctx.moveTo(w / 2, 8); ctx.lineTo(w / 2, h - 8); ctx.stroke();
      for (const cx of [52, 148]) {
        ctx.fillStyle = era === 'victorian' ? '#c7a25a' : '#2a2c2e'; ctx.beginPath(); ctx.arc(cx, 82, 40, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f4f0e2'; ctx.beginPath(); ctx.arc(cx, 82, 33, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#1d1d1b'; ctx.lineWidth = 2;
        for (let i = 0; i <= 8; i++) { const ang = Math.PI * (1.15 + i * 0.0875); ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * 24, 86 + Math.sin(ang) * 24); ctx.lineTo(cx + Math.cos(ang) * 30, 86 + Math.sin(ang) * 30); ctx.stroke(); }
        const needle = Math.PI * (1.2 + (st === 'idle' || st === 'open' ? 0 : st === 'ramping' ? 0.35 : 0.62) + random() * 0.05);
        ctx.strokeStyle = '#c8261e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, 86); ctx.lineTo(cx + Math.cos(needle) * 28, 86 + Math.sin(needle) * 28); ctx.stroke();
      }
      ['#3fd36b', '#ffb02a', '#ff3b2a', '#f4f0e2'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(40 + i * 40, 160, 10, 0, TAU); ctx.fill(); });
      ctx.fillStyle = era === 'victorian' ? '#c7a25a' : '#f2efe4'; ctx.fillRect(30, 196, 140, 38);
      stencil(ctx, era === 'victorian' ? 'DYNAMO' : 'RECTIFIER', w / 2, 216, 22, '#1d1d1b', 130);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      for (let y = 280; y < 430; y += 14) { ctx.fillRect(24, y, 64, 6); ctx.fillRect(112, y, 64, 6); }
    });
    const cabBody = mat(P.cab, { metalness: era === 'future' ? 0.3 : 0.1 });
    const cabFront = new THREE.MeshStandardMaterial({ map: cabTex, roughness: 0.6 });
    for (const x of power ? [-2.55, -1.45, -0.35, 0.75] : [-1.45, -0.35, 0.75]) add(new THREE.BoxGeometry(1.0, 2.3, 0.8), [cabBody, cabBody, cabBody, cabBody, cabFront, cabBody], [x, 1.15, -HZ + 0.42]);
    if (power) {
      // A transformer with cooling fins and bushings under the mezzanine.
      const tank = mat(era === 'victorian' ? '#3d3a35' : '#6d7a72', { metalness: 0.3 });
      box([1.5, 1.8, 1.1], [2.55, 0.9, -4.75], tank);
      instanced(new THREE.BoxGeometry(0.04, 1.4, 0.3), tank, Array.from({ length: 9 }, (_, k) => compose([1.95 + k * 0.15, 0.9, -4.05])));
      for (const x of [2.1, 2.55, 3.0]) { cyl(0.07, 0.1, 0.5, [x, 2.05, -4.75], mat(P.porcelain, { roughness: 0.25 }), 10); }
      tube([[0.75, 2.3, -5.0], [1.4, 2.6, -4.95], [2.1, 2.3, -4.75]], 0.06, copperBar);
    }

    // ---- Gangway along the back wall, and the mezzanine of racks with a stair down.
    const gx0 = SX + 0.3;
    box([MX - gx0, 0.12, 1.0], [(gx0 + MX) / 2, DECK - 0.06, GZ], deckMat);
    const gPosts: THREE.Matrix4[] = [];
    for (let x = gx0 + 0.6; x < MX; x += 1.05) gPosts.push(compose([x, DECK + 0.5, GZ + 0.48]));
    instanced(postGeo, railMat, gPosts);
    for (const y of [DECK + 1.0, DECK + 0.5]) rod([gx0 + 0.6, y, GZ + 0.48], [MX, y, GZ + 0.48], 0.026, railMat);
    rod([-2.3, 0, GZ + 0.45], [-2.3, DECK - 0.12, GZ + 0.45], 0.05, steel);
    for (const x of [-1.0, 0.6]) beam([x, DECK - 1.0, -HZ + 0.02], [x, DECK - 0.12, GZ + 0.45], 0.06, 0.06, steel);

    box([HX - MX, 0.22, MZ + HZ], [(MX + HX) / 2, DECK - 0.11, (-HZ + MZ) / 2], deckMat);
    box([HX - MX, 0.3, 0.1], [(MX + HX) / 2, DECK - 0.16, MZ + 0.05], era === 'future' ? chrome : steel);
    for (const x of [MX + 0.1, 4.55, HX - 0.12]) box([0.14, DECK - 0.22, 0.14], [x, (DECK - 0.22) / 2, MZ + 0.08], steel);
    if (era === 'future') {
      const glass = new THREE.MeshStandardMaterial({ color: '#cfeefa', transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.05, side: THREE.DoubleSide });
      add(new THREE.PlaneGeometry(6.6 - MX, 1.0), glass, [(MX + 6.6) / 2, DECK + 0.5, MZ + 0.05]).castShadow = false;
      add(new THREE.PlaneGeometry(MZ + HZ, 1.0), glass, [HX - 0.05, DECK + 0.5, (-HZ + MZ) / 2], [0, Math.PI / 2, 0]).castShadow = false;
      rod([MX, DECK + 1.0, MZ + 0.05], [6.6, DECK + 1.0, MZ + 0.05], 0.03, chrome);
      rod([HX - 0.05, DECK + 1.0, -HZ], [HX - 0.05, DECK + 1.0, MZ], 0.03, chrome);
    } else {
      const mPosts: THREE.Matrix4[] = [];
      for (let x = MX + 0.1; x < 6.65; x += 0.95) mPosts.push(compose([x, DECK + 0.5, MZ + 0.05]));
      for (let z = -HZ + 0.4; z < MZ; z += 0.95) mPosts.push(compose([HX - 0.05, DECK + 0.5, z]));
      instanced(postGeo, railMat, mPosts);
      for (const y of [DECK + 1.0, DECK + 0.5]) {
        rod([MX, y, MZ + 0.05], [6.6, y, MZ + 0.05], 0.026, railMat);
        rod([HX - 0.05, y, -HZ], [HX - 0.05, y, MZ], 0.026, railMat);
      }
    }
    {
      // A steep stair down the open end of the mezzanine.
      const steps = 14, rise = DECK / steps, run = 0.27, zBottom = MZ + steps * run;
      instanced(new THREE.BoxGeometry(0.8, 0.04, 0.28), era === 'victorian' ? brass : deckMat, Array.from({ length: steps - 1 }, (_, i) => compose([7.0, DECK - (i + 1) * rise, MZ + (i + 0.5) * run])));
      for (const x of [6.58, 7.42]) {
        beam([x, DECK, MZ], [x, 0, zBottom], 0.06, 0.22, steel);
        rod([x, DECK + 0.95, MZ], [x, 0.95, zBottom], 0.025, railMat);
        rod([x, 0, zBottom], [x, 0.95, zBottom], 0.025, railMat);
      }
    }
    const nr = a.dominant === 'racks' ? 8 : 5;
    const rackTex = paint(120, 400, (ctx, w, h) => {
      ctx.fillStyle = era === 'victorian' ? '#4a2e1c' : era === 'future' ? '#15191d' : '#2c2f31'; ctx.fillRect(0, 0, w, h);
      if (era === 'victorian') {
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = '#c7a25a'; ctx.beginPath(); ctx.arc(60, 50 + i * 90, 32, 0, TAU); ctx.fill();
          ctx.fillStyle = '#f4ecd6'; ctx.beginPath(); ctx.arc(60, 50 + i * 90, 26, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#1d1d1b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(60, 50 + i * 90); ctx.lineTo(60 + Math.cos(4 + random()) * 22, 50 + i * 90 + Math.sin(4 + random()) * 22); ctx.stroke();
        }
        return;
      }
      for (let y = 10; y < h - 10;) {
        const u = 14 + Math.floor(random() * 3) * 14;
        ctx.fillStyle = era === 'future' ? '#20262c' : era === 'shed' ? (random() < 0.5 ? '#c9c3b2' : '#8e979a') : (random() < 0.6 ? '#d8d1bc' : '#9aa0a2');
        ctx.fillRect(8, y, w - 16, u - 3);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        for (let x = 14; x < w - 40; x += 6) ctx.fillRect(x, y + 3, 3, u - 9);
        if (era === 'future') { ctx.fillStyle = '#41cdea'; ctx.fillRect(w - 34, y + u / 2 - 3, 18, 2); }
        y += u;
      }
    });
    const rackBody = mat(P.rack, { metalness: era === 'future' ? 0.4 : 0.15 });
    const rackFront = new THREE.MeshStandardMaterial({ map: rackTex, roughness: 0.5 });
    const rackGeo = new THREE.BoxGeometry(0.6, 2.0, 0.8);
    const ledSpots: THREE.Matrix4[] = [];
    const rackRows: [number, number][] = [];
    for (let k = 0; k < nr; k++) rackRows.push([MX + 0.5 + k * 0.66, -HZ + 0.45]);
    if (a.dominant === 'racks') for (let k = 0; k < 5; k++) rackRows.push([MX + 0.9 + k * 0.66, -3.45]);
    for (const [x, z] of rackRows) {
      add(rackGeo, [rackBody, rackBody, rackBody, rackBody, rackFront, rackBody], [x, DECK + 1.0, z]);
      for (let i = 0; i < 9; i++) ledSpots.push(compose([x + 0.2 - random() * 0.12, DECK + 0.15 + random() * 1.75, z + 0.41]));
    }
    const ledColours = ['#4bff7a', '#ffb52a', '#5ad0ff', '#ff4a3a'];
    const leds = instanced(new THREE.BoxGeometry(0.035, 0.022, 0.012), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), ledSpots);
    leds.castShadow = false;
    const ledBase = ledSpots.map(() => new THREE.Color(ledColours[Math.floor(random() * (st === 'alarm' ? 4 : 3))]));
    ledBase.forEach((c, i) => leds.setColorAt(i, c));
    if (a.dominant === 'racks') {
      // Cable trays above the racks and a loom of cables pouring off the deck to the magnet.
      box([HX - MX, 0.06, 0.4], [(MX + HX) / 2, DECK + 2.3, -4.6], steel);
      const cableColours = ['#2d2f31', '#d9822b', '#3a6ea5', '#6b6f72', '#c9c3b2'];
      for (let i = 0; i < 5; i++) {
        const o = i * 0.07;
        tube([[2.2 + o, DECK + 2.25, -4.4], [2.0 + o, DECK + 1.4, -3.2], [1.8 + o, DECK + 0.1, MZ + 0.1], [1.5 + o, 1.6, MZ + 0.5], [1.3 + o, 0.05, -1.8 + o], [-0.6, 0.05, -1.55 + o], [SX + rs + 0.9, 0.05, SZ + 0.9 + o], [SX + rs + 0.15, 0.55, SZ + 0.5 + o]], 0.035, mat(cableColours[i]), R, 70);
      }
    }
    // Under the mezzanine: the control desk, its monitors and the field display.
    const deskX0 = power ? 3.6 : 2.2, deskX1 = power ? 6.6 : 5.4, deskMid = (deskX0 + deskX1) / 2;
    const deskMat = mat(era === 'victorian' ? '#5c3a25' : era === 'future' ? '#e6eaec' : '#8a8f8c');
    box([deskX1 - deskX0, 0.06, 0.75], [deskMid, 0.76, -5.05], deskMat);
    for (const x of [deskX0 + 0.04, deskX1 - 0.04]) box([0.06, 0.74, 0.7], [x, 0.37, -5.05], deskMat);
    const screenTex = paint(256, 192, (ctx, w, h) => {
      ctx.fillStyle = era === 'victorian' ? '#f2e8cc' : '#0c1a12'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = era === 'victorian' ? 'rgba(80,60,30,0.4)' : 'rgba(90,220,120,0.25)'; ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.strokeStyle = era === 'victorian' ? '#5a2a1a' : era === 'future' ? '#5fd6f5' : '#7dff9a'; ctx.lineWidth = 4; ctx.beginPath();
      const level = st === 'idle' || st === 'open' ? 0.05 : st === 'ramping' ? 0.55 : 0.85;
      for (let x = 0; x <= w; x += 4) { const p = x / w, y = h - 16 - (st === 'alarm' && p > 0.7 ? 0.1 : Math.min(level, p * 1.4 * level)) * (h - 40); if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
    });
    const screenMat = new THREE.MeshStandardMaterial({ map: screenTex, emissive: '#ffffff', emissiveMap: screenTex, emissiveIntensity: era === 'victorian' ? 0.15 : 0.9, roughness: 0.3 });
    for (let i = 0; i < 3; i++) {
      const x = deskX0 + 0.55 + i * (deskX1 - deskX0 - 1.1) / 2;
      if (era === 'nineties' || (era === 'shed' && i !== 1)) {
        box([0.46, 0.4, 0.42], [x, 0.99, -5.15], mat('#d6cfb8'));
        decal(screenTex, 0.36, 0.28, [x, 1.0, -4.935], [0, 0, 0], { emissive: '#ffffff', emissiveMap: screenTex, emissiveIntensity: 0.9 });
      } else if (era === 'victorian') {
        box([0.5, 0.45, 0.2], [x, 1.02, -5.2], brass);
        const dial = cyl(0.17, 0.17, 0.03, [x, 1.04, -5.09], mat('#f4ecd6'), 20, [Math.PI / 2, 0, 0]);
        dial.castShadow = false;
      } else {
        box([0.62, 0.38, 0.03], [x, 1.1, -5.2], dark);
        add(new THREE.PlaneGeometry(0.58, 0.34), screenMat, [x, 1.1, -5.183]).castShadow = false;
        rod([x, 0.79, -5.22], [x, 0.93, -5.22], 0.02, dark);
      }
    }
    const display = { idle: ['0.00 T', '#4bff7a'], ramping: [`RAMP ${(fieldMax * (0.4 + random() * 0.3)).toFixed(1)} T`, '#ffb52a'], full: [`${fieldMax.toFixed(1)} T`, '#ff7a2a'], alarm: ['FAULT', '#ff3a2a'], open: ['OFF', '#5a6064'] }[st];
    const displayTex = paint(512, 128, (ctx, w, h) => {
      ctx.fillStyle = '#0d0f10'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; for (let x = 0; x < w; x += 6) ctx.fillRect(x, 0, 2, h);
      stencil(ctx, display[0], w / 2, h / 2 + 4, 86, display[1], w - 30, 'monospace');
    });
    box([2.2, 0.62, 0.12], [4.3, DECK - 0.62, MZ + 0.06], dark);
    const displayMat = new THREE.MeshStandardMaterial({ map: displayTex, emissive: '#ffffff', emissiveMap: displayTex, emissiveIntensity: st === 'open' ? 0.2 : 1.2, roughness: 0.4 });
    add(new THREE.PlaneGeometry(2.06, 0.5), displayMat, [4.3, DECK - 0.62, MZ + 0.125]).castShadow = false;
    if (st === 'alarm') lamps.push({ material: displayMat, mode: 'flash', phase: 0, peak: 1.4 });
    for (const x of [2.6, 4.4, 6.2]) {
      const t2 = box([0.07, 0.05, 2.2], [x, DECK - 0.26, -4.0], st === 'alarm' ? glow('#ffd6cf', 1.2) : tubeLit);
      t2.castShadow = false;
    }
    const clock = decal(clockFace(), 0.42, 0.42, [deskMid, 2.2, -HZ + 0.02]);
    clock.castShadow = false;

    // ---- Warning lamps, beacons and the MAGNET ON sign, all following the state.
    const beaconColour = { idle: '#3fd36b', ramping: '#ffae1a', full: '#ff8a1a', alarm: '#ff2a1f', open: '#55595c' }[st];
    const beaconMode = st === 'alarm' ? 'flash' : st === 'ramping' || st === 'full' ? 'spin' : 'steady';
    const beacon = (at: V, parent: THREE.Object3D = R) => {
      cyl(0.1, 0.11, 0.08, [at[0], at[1] + 0.04, at[2]], dark, 12, [0, 0, 0], parent);
      const material = st === 'open' ? mat('#6a6e70') : glow(beaconColour, 1.4);
      const lamp = cyl(0.08, 0.08, 0.18, [at[0], at[1] + 0.17, at[2]], material, 12, [0, 0, 0], parent);
      lamp.castShadow = false;
      if (st !== 'open') lamps.push({ material: material as THREE.MeshStandardMaterial, mode: beaconMode, phase: random() * 6, peak: 1.6 });
    };
    beacon([Math.cos(-0.3 * Math.PI) * (rs + 0.05), yCap, Math.sin(-0.3 * Math.PI) * (rs + 0.05)], top);
    beacon([HX - 0.12, DECK + 1.05, MZ + 0.08]);
    beacon([gx0 + 0.6, DECK + 1.05, GZ + 0.48]);
    {
      // A three-colour stack light on the mezzanine corner post.
      const lit = { idle: 2, ramping: 1, full: 1, alarm: 0, open: -1 }[st];
      rod([MX + 0.1, DECK + 1.0, MZ + 0.08], [MX + 0.1, DECK + 1.35, MZ + 0.08], 0.02, dark);
      ['#ff3b2a', '#ffb02a', '#3fd36b'].forEach((tone, i) => {
        const material = i === lit ? glow(tone, 1.6) : mat(new THREE.Color(tone).multiplyScalar(0.35).getStyle());
        cyl(0.075, 0.075, 0.13, [MX + 0.1, DECK + 1.78 - i * 0.14, MZ + 0.08], material, 12).castShadow = false;
        if (i === lit) lamps.push({ material: material as THREE.MeshStandardMaterial, mode: st === 'alarm' ? 'flash' : 'steady', phase: 0, peak: 1.6 });
      });
    }
    {
      const on = st === 'ramping' || st === 'full' || st === 'alarm';
      const signFace = paint(256, 80, (ctx, w, h) => {
        ctx.fillStyle = '#141516'; ctx.fillRect(0, 0, w, h);
        stencil(ctx, on ? 'MAGNET ON' : 'MAGNET OFF', w / 2, h / 2 + 2, 44, on ? '#ff4a3a' : '#7a7f82', w - 20);
      });
      const ang = 0.38 * Math.PI, r = rs + 1.0;
      const holder = new THREE.Group();
      holder.position.set(Math.cos(ang) * r, DECK + 0.75, Math.sin(ang) * r);
      holder.rotation.y = Math.PI / 2 - ang;
      stack.add(holder);
      box([0.9, 0.3, 0.07], [0, 0, 0], dark, [0, 0, 0], holder);
      const face = add(new THREE.PlaneGeometry(0.84, 0.26), new THREE.MeshStandardMaterial({ map: signFace, emissive: '#ffffff', emissiveMap: signFace, emissiveIntensity: on ? 1.3 : 0.1 }), [0, 0, 0.04], [0, 0, 0], holder);
      face.castShadow = false;
    }

    // ---- The wall jib hoist, its hook drawn toward the field, or lifting the top coil out.
    const jy = Math.min(H - 0.32, yCap + lift + 1.4);
    const armEnd = SX + 0.8;
    box([0.3, 0.6, 0.4], [-HX + 0.15, jy - 0.1, SZ], steel);
    beam([-HX + 0.1, jy, SZ], [armEnd, jy, SZ], 0.16, 0.24, mat(era === 'victorian' ? '#2f4b3c' : '#e0b324', { metalness: 0.3 }));
    rod([-HX + 0.12, jy - 1.6, SZ], [-HX + 2.2, jy - 0.1, SZ], 0.045, steel);
    const trolleyX = st === 'open' ? SX + swingOut : -5.6;
    box([0.32, 0.2, 0.32], [trolleyX, jy - 0.22, SZ], dark);
    const swing = new THREE.Group();
    swing.position.set(trolleyX, jy - 0.32, SZ);
    R.add(swing);
    const chainMat = mat('#3a3c3e', { metalness: 0.6 });
    const hookMat = mat('#e0b324', { metalness: 0.3 });
    if (st === 'open') {
      const drop = jy - 0.32 - (yCap + lift + 0.35);
      rod([0, 0, 0], [0, -drop, 0], 0.025, chainMat, swing);
      box([0.24, 0.2, 0.16], [0, -drop - 0.05, 0], hookMat, [0, 0, 0], swing);
      for (let k = 0; k < 4; k++) {
        const ang = k / 4 * TAU + Math.PI / 4;
        rod([0, -drop - 0.12, 0], [Math.cos(ang) * (rs + 0.05), -drop - 0.35, Math.sin(ang) * (rs + 0.05)], 0.015, chainMat, swing);
      }
      // Tape barriers round the opened magnet.
    } else {
      const drop = Math.max(0.8, jy - yCap - 0.15);
      rod([0, 0, 0], [0, -drop, 0], 0.025, chainMat, swing);
      box([0.24, 0.24, 0.16], [0, -drop - 0.1, 0], hookMat, [0, 0, 0], swing);
      add(new THREE.TorusGeometry(0.1, 0.03, 6, 12, Math.PI * 1.4), steel, [0, -drop - 0.32, 0], [0, 0, -Math.PI * 0.7], swing);
      swing.rotation.z = pull;
    }

    // ---- Rope or tape barriers in front of the gauss line.
    if (st === 'alarm' || st === 'open') {
      const posts: THREE.Matrix4[] = [], rr = rs + 2.45;
      const angles = [0.06, 0.22, 0.38, 0.54, 0.7, 0.86].map((k) => k * Math.PI);
      for (const ang of angles) posts.push(compose([SX + Math.cos(ang) * rr, 0.45, SZ + Math.sin(ang) * rr]));
      instanced(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), mat(st === 'alarm' ? '#d8d8d4' : '#e6b423'), posts);
      instanced(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 12), dark, posts.map((m) => m.clone().multiply(new THREE.Matrix4().makeTranslation(0, -0.42, 0))));
      const ropeMat = mat(st === 'alarm' ? '#c8261e' : '#e6b423');
      for (let i = 0; i < angles.length - 1; i++) {
        const A: V = [SX + Math.cos(angles[i]) * rr, 0.86, SZ + Math.sin(angles[i]) * rr], B: V = [SX + Math.cos(angles[i + 1]) * rr, 0.86, SZ + Math.sin(angles[i + 1]) * rr];
        tube([A, [(A[0] + B[0]) / 2, 0.72, (A[2] + B[2]) / 2], B], 0.022, ropeMat, R, 12);
      }
    }

    // ---- Wall dressing on the back wall above the gangway and on the front of the left wall.
    const zoneA = { x0: -2.6, x1: 1.4, y: 4.85 }, zoneB = { z0: 1.4, z1: 4.2, y: 2.35 };
    const onBack = (texture: THREE.Texture, w: number, h: number, x: number, y: number, frame?: M, tilt = 0) => {
      if (frame) box([w + 0.08, h + 0.08, 0.04], [x, y, -HZ + 0.02], frame, [0, 0, tilt]).castShadow = false;
      return decal(texture, w, h, [x, y, -HZ + 0.05], [0, 0, tilt]);
    };
    const onLeft = (texture: THREE.Texture, w: number, h: number, z: number, y: number, frame?: M, tilt = 0) => {
      if (frame) box([0.04, h + 0.08, w + 0.08], [-HX + 0.02, y, z], frame, [tilt, 0, 0]).castShadow = false;
      return decal(texture, w, h, [-HX + 0.05, y, z], [tilt, Math.PI / 2, 0]);
    };
    const signSet: [SignKind, string][] = [['magnet', 'STRONG\nMAGNETIC FIELD'], ['pacemaker', 'NO\nPACEMAKERS'], ['metal', 'NO LOOSE\nSTEEL'], ['ears', 'EAR DEFENDERS\nREQUIRED'], ['watch', 'REMOVE\nWATCHES & CARDS']];
    const signs = (count: number, place: (texture: THREE.Texture, i: number) => void) => {
      for (let i = 0; i < count; i++) { const [kind, caption] = signSet[i % signSet.length]; place(safetySign(kind, caption), i); }
    };
    const woodFrame = mat(era === 'victorian' ? '#c7a25a' : '#5a3d26');
    if (a.walls === 'safety') {
      signs(5, (tex, i) => onBack(tex, 0.62, 0.8, mix(zoneA.x0 + 0.4, zoneA.x1 - 0.4, i / 4), zoneA.y));
      signs(4, (tex, i) => onLeft(tex, 0.62, 0.8, mix(zoneB.z0 + 0.4, zoneB.z1 - 0.4, i / 3), zoneB.y + 0.3));
      const long = paint(512, 96, (ctx, w, h) => { ctx.fillStyle = '#f2c230'; ctx.fillRect(0, 0, w, h); stencil(ctx, 'DANGER  STRONG MAGNETIC FIELD', w / 2, h / 2, 40, '#1d1d1b', w - 30); });
      onLeft(long, 3.0, 0.5, (zoneB.z0 + zoneB.z1) / 2, zoneB.y - 0.55);
    } else if (a.walls === 'chalk') {
      onBack(blackboard(random, mood.wear), 3.8, 1.26, (zoneA.x0 + zoneA.x1) / 2, zoneA.y);
      box([3.7, 0.05, 0.1], [(zoneA.x0 + zoneA.x1) / 2, zoneA.y - 0.66, -HZ + 0.07], woodFrame);
      signs(2, (tex, i) => onLeft(tex, 0.62, 0.8, mix(zoneB.z0 + 0.6, zoneB.z1 - 0.6, i), zoneB.y + 0.2));
    } else if (a.walls === 'frog') {
      onBack(frogPoster(), 1.15, 1.47, -0.6, zoneA.y, woodFrame);
      const heads = ['FROG DEFIES GRAVITY', 'LEVITATING FROG STUNS LAB', 'MAGNETS: NOT JUST FOR FRIDGES', 'WATER, FROGS AND 16 TESLA', 'WILL IT FLOAT? IT FLOATS'];
      [[-2.1, 0.0, 0.06], [0.75, 0.25, -0.05], [1.05, -0.45, 0.04]].forEach(([x, dy, tilt], i) => onBack(clipping(heads[i], random), 0.55, 0.69, x, zoneA.y + dy, undefined, tilt));
      for (let i = 0; i < 3; i++) onLeft(clipping(heads[(i + 3) % heads.length], random), 0.7, 0.88, mix(zoneB.z0 + 0.5, zoneB.z1 - 0.5, i / 2), zoneB.y + jit(0.2), woodFrame, jit(0.04));
    } else if (a.walls === 'pegboard') {
      onBack(pegboard(random), 3.6, 1.44, (zoneA.x0 + zoneA.x1) / 2, zoneA.y);
      signs(2, (tex, i) => onLeft(tex, 0.62, 0.8, mix(zoneB.z0 + 0.6, zoneB.z1 - 0.6, i), zoneB.y + 0.2));
    } else if (a.walls === 'blueprints') {
      const titles = ['BITTER PLATE', 'COIL SECTION', 'COOLING HOLES', 'BORE INSERT', 'BUS JOINT'];
      for (let i = 0; i < 3; i++) onBack(blueprint(titles[i], random), 1.15, 0.82, mix(zoneA.x0 + 0.65, zoneA.x1 - 0.65, i / 2), zoneA.y + jit(0.12), undefined, jit(0.03));
      for (let i = 0; i < 2; i++) onLeft(blueprint(titles[i + 3], random), 1.3, 0.93, mix(zoneB.z0 + 0.8, zoneB.z1 - 0.8, i), zoneB.y + jit(0.1), undefined, jit(0.03));
    } else {
      const conduit = mat('#8d9396', { metalness: 0.4 });
      for (const y of [zoneA.y - 0.3, zoneA.y + 0.1]) rod([zoneA.x0, y, -HZ + 0.08], [zoneA.x1 + 3, y, -HZ + 0.08], 0.035, conduit);
      for (const x of [-1.6, 0.4]) box([0.3, 0.3, 0.12], [x, zoneA.y - 0.1, -HZ + 0.08], mat('#9aa0a2'));
      for (const y of [zoneB.y + 0.8, zoneB.y + 1.1]) rod([-HX + 0.08, y, zoneB.z0 - 1], [-HX + 0.08, y, ZF], 0.035, conduit);
      cyl(0.36, 0.36, 0.18, [-HX + 0.14, zoneB.y, 3.7], mat('#c8302a'), 20, [0, 0, Math.PI / 2]);
      add(new THREE.TorusGeometry(0.26, 0.05, 6, 20), mat('#d8c9a0'), [-HX + 0.26, zoneB.y, 3.7], [0, Math.PI / 2, 0]);
      cyl(0.09, 0.09, 0.55, [-HX + 0.2, zoneB.y - 0.85, 2.5], mat('#c8302a'), 12);
    }

    // ---- What happened today.
    const crowd: THREE.Object3D[] = [];
    let frog: THREE.Group | null = null;
    const frogBase = yCap + (st === 'idle' || st === 'open' ? 0.3 : 0.95);
    const banner = (text: string, ink: string) => {
      const tex = paint(1024, 190, (ctx, w, h) => {
        ctx.fillStyle = '#f7f3ea'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.05)'; for (let x = 0; x < w; x += 90) ctx.fillRect(x, 0, 30, h);
        stencil(ctx, text, w / 2, h / 2 + 6, 120, ink, w - 60, '"Comic Sans MS", cursive, sans-serif');
      });
      const flag = add(new THREE.PlaneGeometry(2.7, 0.5, 8, 1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }), [4.1, DECK + 0.55, MZ + 0.1]);
      const pos = flag.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 3) * 0.03);
      flag.geometry.computeVertexNormals();
    };
    if (a.story === 'frog') {
      frog = new THREE.Group();
      frog.position.set(0, frogBase, 0);
      frog.scale.setScalar(1.7);
      top.add(frog);
      const skin = mat('#4f9a3c', { roughness: 0.45 }), belly = mat('#d8e2a6');
      ball([0.15, 0.09, 0.19], [0, 0, 0], skin, frog);
      ball([0.12, 0.05, 0.15], [0, -0.04, 0.01], belly, frog);
      ball([0.11, 0.075, 0.1], [0, 0.03, 0.15], skin, frog);
      for (const sgn of [-1, 1]) {
        ball([0.04, 0.04, 0.04], [sgn * 0.065, 0.1, 0.17], skin, frog);
        ball([0.018, 0.018, 0.018], [sgn * 0.075, 0.11, 0.2], mat('#141414'), frog);
        tube([[sgn * 0.11, -0.02, -0.1], [sgn * 0.24, -0.08, -0.04], [sgn * 0.27, -0.14, -0.2], [sgn * 0.32, -0.16, -0.3]], 0.022, skin, frog, 16);
        tube([[sgn * 0.09, -0.03, 0.12], [sgn * 0.17, -0.1, 0.2], [sgn * 0.2, -0.15, 0.25]], 0.017, skin, frog, 12);
      }
      const glass = new THREE.MeshStandardMaterial({ color: '#c9ecff', transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.05, side: THREE.DoubleSide });
      add(new THREE.CylinderGeometry(0.62, 0.62, 1.75, 28, 1, true), glass, [0, yCap + 0.88, 0], [0, 0, 0], top).castShadow = false;
      for (const y of [yCap + 0.03, yCap + 1.75]) add(new THREE.TorusGeometry(0.62, 0.035, 6, 32), brass, [0, y, 0], [Math.PI / 2, 0, 0], top);
      // A camera on a tripod on the platform, watching.
      const tri = new THREE.Group();
      const ang = 0.15 * Math.PI, r = rs + 0.6;
      tri.position.set(Math.cos(ang) * r, DECK, Math.sin(ang) * r);
      tri.rotation.y = -ang - Math.PI / 2;
      stack.add(tri);
      for (let k = 0; k < 3; k++) { const la = k / 3 * TAU; rod([0, 1.3, 0], [Math.cos(la) * 0.3, 0, Math.sin(la) * 0.3], 0.015, dark, tri); }
      box([0.22, 0.16, 0.3], [0, 1.4, 0], dark, [0.6, 0, 0], tri);
      cyl(0.06, 0.07, 0.16, [0, 1.48, 0.17], dark, 12, [Math.PI / 2 + 0.6, 0, 0], tri);
      banner('IT FLEW!', '#2b6e2a');
    } else if (a.story === 'stuck') {
      // Live field: everything steel is pinned to the magnet. Field off: it has all dropped in a heap.
      const stuck = (ang: number, y: number, object: THREE.Object3D, roll: number) => {
        const holder = new THREE.Group();
        if (fieldOn) {
          holder.position.set(Math.cos(ang) * (rs + 0.02), y, Math.sin(ang) * (rs + 0.02));
          holder.rotation.set(0, Math.PI / 2 - ang, 0);
          object.rotation.z = roll;
        } else {
          holder.position.set(Math.cos(ang) * (rs + 0.55), 0.3, Math.sin(ang) * (rs + 0.55));
          holder.rotation.set(-Math.PI / 2 + 0.5, roll, 0);
        }
        stack.add(holder);
        holder.add(object);
      };
      const legMat = mat('#a3a9ad', { metalness: 0.7, roughness: 0.3 });
      // An office chair, pinned by its steel base with the seat sticking out into the room.
      const chair = new THREE.Group();
      const seatMat = mat('#e0662c');
      for (let k = 0; k < 5; k++) { const ang = k / 5 * TAU; rod([0, 0, 0.04], [Math.cos(ang) * 0.32, Math.sin(ang) * 0.32, 0.04], 0.022, legMat, chair); }
      rod([0, 0, 0.04], [0, 0, 0.5], 0.03, legMat, chair);
      box([0.52, 0.5, 0.08], [0, 0, 0.54], seatMat, [0, 0, 0], chair);
      box([0.5, 0.07, 0.55], [0, 0.26, 0.85], seatMat, [0, 0, 0], chair);
      stuck(0.3 * Math.PI, 1.9, chair, 2.5);
      const wrench = new THREE.Group();
      box([0.7, 0.07, 0.03], [0, 0, 0.03], legMat, [0, 0, 0], wrench);
      add(new THREE.TorusGeometry(0.07, 0.028, 6, 12), legMat, [0.38, 0, 0.03], [0, 0, 0], wrench);
      add(new THREE.TorusGeometry(0.06, 0.026, 6, 12, Math.PI * 1.4), legMat, [-0.38, 0, 0.03], [0, 0, 0.9], wrench);
      stuck(0.16 * Math.PI, 1.3, wrench, 0.9);
      const ext = new THREE.Group();
      cyl(0.11, 0.11, 0.62, [0, 0, 0.12], mat('#d42a1e'), 14, [0, 0, 0], ext);
      cyl(0.04, 0.06, 0.12, [0, 0.37, 0.12], dark, 8, [0, 0, 0], ext);
      tube([[0, 0.42, 0.12], [0.12, 0.38, 0.2], [0.16, 0.1, 0.24]], 0.015, dark, ext, 10);
      stuck(0.47 * Math.PI, 2.4, ext, -1.15);
      const toolbox = new THREE.Group();
      box([0.5, 0.24, 0.24], [0, 0, 0.12], mat('#f2c230'), [0, 0, 0], toolbox);
      box([0.3, 0.04, 0.04], [0, 0.15, 0.12], dark, [0, 0, 0], toolbox);
      stuck(0.22 * Math.PI, 2.55, toolbox, 0.35);
      const clip = new THREE.Group();
      box([0.3, 0.4, 0.015], [0, 0, 0.01], mat('#8a6a44'), [0, 0, 0], clip);
      box([0.26, 0.33, 0.004], [0, -0.01, 0.02], mat('#f4f2ea'), [0, 0, 0], clip);
      stuck(0.4 * Math.PI, 1.35, clip, -0.5);
      // One shoe, left behind on the gauss line.
      const shoe = new THREE.Group();
      ball([0.07, 0.05, 0.14], [0, 0.05, 0], mat('#2a2522'), shoe);
      box([0.13, 0.025, 0.29], [0, 0.012, 0], mat('#d8d2c4'), [0, 0, 0], shoe);
      shoe.position.set(SX + 1.0, 0, SZ + rs + 1.95);
      shoe.rotation.set(0, 0.8, 0.3);
      R.add(shoe);
    } else if (a.story === 'record') {
      banner('NEW RECORD!', '#b3261e');
      const flagGeo = new THREE.BufferGeometry();
      flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.11, 0, 0, 0.11, 0, 0, 0, -0.22, 0], 3));
      flagGeo.computeVertexNormals();
      const runs: [V, V][] = [[[-HX + 0.1, 5.4, 1.8], [SX, DECK + 1.02, SZ + rs + 0.95]], [[SX + rs + 0.95, DECK + 1.02, SZ], [MX + 0.2, DECK + 1.02, MZ + 0.05]], [[6.4, DECK + 1.02, MZ + 0.05], [HX - 0.18, 5.6, -HZ + 0.2]]];
      const flags: THREE.Matrix4[] = [];
      const string = mat('#efe9dc');
      for (const [A, B] of runs) {
        const pts: V[] = [];
        const len = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), n = Math.max(4, Math.round(len / 0.32));
        for (let i = 0; i <= n; i++) { const q = i / n; pts.push([mix(A[0], B[0], q), mix(A[1], B[1], q) - Math.sin(q * Math.PI) * 0.45, mix(A[2], B[2], q)]); }
        tube(pts, 0.008, string, R, 24);
        const turn = -Math.atan2(B[2] - A[2], B[0] - A[0]);
        for (let i = 1; i < n; i++) flags.push(compose(pts[i], [0, turn, 0]));
      }
      const bunting = instanced(flagGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.8 }), flags);
      const tones = ['#d8432e', '#f2c230', '#3a7fc4', '#4caf5a', '#f4f0e6'];
      flags.forEach((_, i) => bunting.setColorAt(i, new THREE.Color(tones[i % tones.length])));
      bunting.castShadow = false;
      // A trestle table with the cake.
      const tx = -1.7, tz = 3.75;
      box([1.6, 0.05, 0.7], [tx, 0.75, tz], mat('#c9b48e'));
      for (const sx of [-0.6, 0.6]) for (const sz of [-0.28, 0.28]) rod([tx + sx, 0.73, tz + sz * 0.3], [tx + sx * 1.08, 0, tz + sz], 0.02, steel);
      cyl(0.24, 0.24, 0.16, [tx, 0.86, tz], mat('#f4ece0'), 24);
      cyl(0.16, 0.16, 0.12, [tx, 1.0, tz], mat('#f2b6c2'), 24);
      for (let i = 0; i < 5; i++) { const ang = i / 5 * TAU; cyl(0.008, 0.008, 0.08, [tx + Math.cos(ang) * 0.09, 1.1, tz + Math.sin(ang) * 0.09], glow('#ffd36a', 1.2), 5); }
      for (let i = 0; i < 6; i++) cyl(0.035, 0.028, 0.1, [tx + 0.35 + (i % 3) * 0.11, 0.83, tz - 0.15 + Math.floor(i / 3) * 0.2], mat(['#d8432e', '#3a7fc4'][i % 2]), 8);
    } else if (a.story === 'leak') {
      // The burst: droplets thrown up from a split hose, a puddle, a mop bucket and a sign.
      const water = new THREE.MeshStandardMaterial({ color: '#cfe6f5', transparent: true, opacity: 0.75, depthWrite: false, roughness: 0.1 });
      const drops = instanced(new THREE.SphereGeometry(0.035, 6, 4), water, Array.from({ length: 40 }, () => compose(burst)));
      drops.castShadow = false;
      crowd.push(drops);
      const puddle = new THREE.MeshStandardMaterial({ color: '#8fb3c8', transparent: true, opacity: 0.45, depthWrite: false, roughness: 0.04, metalness: 0.2 });
      for (let i = 0; i < 3; i++) {
        const p = add(new THREE.CircleGeometry(1, 24), puddle, [burst[0] + jit(0.5) + 0.2, 0.01 + i * 0.002, burst[2] + 0.5 + i * 0.4], [-Math.PI / 2, 0, random()]);
        p.scale.set(0.8 + random() * 0.6, 0.5 + random() * 0.4, 1);
        p.castShadow = false;
      }
      const bucket = mat('#f2c230');
      cyl(0.2, 0.17, 0.32, [-6.3, 0.16, 1.9], bucket, 16);
      box([0.24, 0.12, 0.2], [-6.3, 0.38, 1.82], mat('#3a3d40'));
      rod([-6.25, 0.3, 1.95], [-6.0, 1.45, 2.3], 0.018, mat('#a88a5a'));
      const sign = new THREE.Group();
      sign.position.set(-5.0, 0, 0.95);
      sign.rotation.y = 0.5;
      R.add(sign);
      const wet = paint(128, 200, (ctx, w, h) => { ctx.fillStyle = '#f2c230'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#1d1d1b'; ctx.beginPath(); ctx.moveTo(w / 2, 30); ctx.lineTo(w - 20, 120); ctx.lineTo(20, 120); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#f2c230'; ctx.font = 'bold 60px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', w / 2, 112); stencil(ctx, 'WET FLOOR', w / 2, 160, 24, '#1d1d1b', w - 10); });
      for (const sgn of [-1, 1]) {
        const panel = box([0.32, 0.62, 0.02], [0, 0.3, sgn * 0.12], new THREE.MeshStandardMaterial({ map: wet, roughness: 0.6 }), [sgn * 0.2, 0, 0], sign);
        panel.rotation.x = -sgn * 0.2;
        if (sgn < 0) panel.rotation.y = Math.PI;
      }
    } else {
      // An ordinary shift: chair pulled out, mugs, a clipboard on the platform rail, a hard hat.
      const chair = new THREE.Group();
      chair.position.set(deskMid - 0.4, 0, -4.35);
      chair.rotation.y = 0.5;
      R.add(chair);
      cyl(0.24, 0.24, 0.07, [0, 0.48, 0], mat('#3a3d40'), 16, [0, 0, 0], chair);
      box([0.42, 0.45, 0.06], [0, 0.78, -0.22], mat('#3a3d40'), [0, 0, 0], chair);
      rod([0, 0.06, 0], [0, 0.46, 0], 0.025, steel, chair);
      for (let k = 0; k < 5; k++) { const ang = k / 5 * TAU; rod([0, 0.06, 0], [Math.cos(ang) * 0.26, 0.03, Math.sin(ang) * 0.26], 0.018, steel, chair); }
      for (const x of [deskX0 + 0.3, deskX1 - 0.8]) cyl(0.045, 0.04, 0.1, [x, 0.84, -4.85], mat(['#f2f0ea', '#c8432e', '#3a6ea5'][Math.floor(random() * 3)]), 10);
      const ang = 0.45 * Math.PI;
      const clip = box([0.24, 0.32, 0.015], [SX + Math.cos(ang) * (rs + 1.0), DECK + 0.8, SZ + Math.sin(ang) * (rs + 1.0) + 0.04], mat('#8a6a44'), [0.1, Math.PI / 2 - ang, 0]);
      clip.castShadow = false;
      ball([0.16, 0.1, 0.18], [MX + 0.6, DECK + 1.08, MZ + 0.05], mat('#f2c230', { roughness: 0.4 }));
    }
    if (st === 'full' || st === 'ramping') {
      // Small loose steel already clinging to the stack.
      const bits: THREE.Matrix4[] = [];
      for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) {
        const ang = mix(0.05, 0.55, random()) * Math.PI;
        bits.push(compose([SX + Math.cos(ang) * (rs + 0.03), mix(0.9, 2.8, random()), SZ + Math.sin(ang) * (rs + 0.03)], [random() * 3, Math.PI / 2 - ang, random() * 3]));
      }
      instanced(new THREE.BoxGeometry(0.03, 0.16, 0.02), mat('#9aa0a4', { metalness: 0.7 }), bits);
    }

    // ---- Clutter along the edges, kept clear of the cast's slots.
    const clutterCount = Math.round(mix(2, 11, mood.density));
    const zones: { x: [number, number]; z: [number, number]; tall: boolean }[] = [
      { x: [-7.0, -6.0], z: [3.0, 4.1], tall: a.dominant !== 'hoses' },
      { x: [6.0, 7.1], z: [2.0, 4.1], tall: false },
      { x: [-2.4, 2.6], z: [3.95, 4.2], tall: false },
    ];
    if (!power) zones.push({ x: [5.7, 7.1], z: [-5.1, -3.4], tall: true });
    const taken: [number, number][] = a.story === 'record' ? [[-1.7, 3.75], [-0.9, 3.75], [-2.5, 3.75]] : [];
    const crateMat = mat(era === 'victorian' ? '#7a5a36' : '#a68a5c'), drumMat = mat(['#2f5f7c', '#3d4a3a', '#a4432c'][Math.floor(random() * 3)], { metalness: 0.3 }), coneMat = mat('#ef6a24');
    for (let i = 0; i < clutterCount; i++) {
      const zone = zones[i % zones.length];
      let x = 0, z = 0, ok = false;
      for (let tries = 0; tries < 8 && !ok; tries++) {
        x = mix(zone.x[0], zone.x[1], random()); z = mix(zone.z[0], zone.z[1], random());
        ok = !taken.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 0.75);
      }
      if (!ok) continue;
      taken.push([x, z]);
      const kind = zone.tall ? Math.floor(random() * 4) : 4 + Math.floor(random() * 3);
      const ry = jit(0.4);
      if (kind === 0) { const h = 0.5 + random() * 0.4; box([0.8, h, 0.6], [x, h / 2, z], crateMat, [0, ry, 0]); if (random() < 0.5) box([0.55, 0.4, 0.45], [x, h + 0.2, z], crateMat, [0, ry + 0.3, 0]); }
      else if (kind === 1) for (let k = 0; k < 2; k++) cyl(0.12, 0.12, 1.4, [x + k * 0.27, 0.7, z], mat(['#3d6f4a', '#6a6f72', '#2a2c2e'][k % 3], { metalness: 0.3 }), 12);
      else if (kind === 2) { for (const o of [-0.22, 0.22]) cyl(0.42, 0.42, 0.05, [x, 0.45, z + o], mat('#a68a5c'), 18, [Math.PI / 2, 0, 0]); cyl(0.26, 0.26, 0.44, [x, 0.45, z], mat('#2d2f31'), 16, [Math.PI / 2, 0, 0]); }
      else if (kind === 3) cyl(0.3, 0.3, 0.9, [x, 0.45, z], drumMat, 18);
      else if (kind === 4) { cyl(0.03, 0.17, 0.5, [x, 0.27, z], coneMat, 12); box([0.34, 0.03, 0.34], [x, 0.015, z], coneMat); }
      else if (kind === 5) box([0.5, 0.24, 0.24], [x, 0.12, z], mat('#c8302a'), [0, ry, 0]);
      else { box([1.0, 0.12, 0.8], [x, 0.06, z], crateMat, [0, ry, 0]); box([0.7, 0.35, 0.5], [x, 0.3, z], mat('#c9b48e'), [0, ry, 0]); }
    }

    // ---- Indoor key: the diorama's sun is swapped for steep overhead light, as from roof lights.
    const basePlace = world.place;
    world.place = (items) => {
      basePlace(items);
      const key = world.keyLight!;
      const distance = key.position.distanceTo(key.target.position);
      key.position.copy(key.target.position).add(new THREE.Vector3(mix(-5, 5, mood.daylight), 13, 6).normalize().multiplyScalar(distance));
      key.updateMatrixWorld();
    };

    // ---- Motion: beacons turn and flash, LEDs chatter, the hook trembles, the frog turns, the leak sprays.
    const speed = mix(0.5, 2.2, mood.energy);
    const hash = (n: number) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
    const off = new THREE.Color('#1b1d1e');
    let ledClock = -1;
    const dropMatrix = new THREE.Matrix4();
    world.update = (_dt, time) => {
      for (const lamp of lamps) {
        const p = time * speed + lamp.phase;
        if (lamp.mode === 'spin') lamp.material.emissiveIntensity = 0.3 + Math.pow(Math.max(0, Math.sin(p * 4)), 3) * lamp.peak * 1.4;
        else if (lamp.mode === 'flash') lamp.material.emissiveIntensity = Math.sin(p * 7) > 0 ? lamp.peak : 0.15;
        else if (lamp.mode === 'flicker') lamp.material.emissiveIntensity = hash(Math.floor(time * 12)) < 0.25 ? 0.2 : lamp.peak;
      }
      const tick = Math.floor(time * mix(2, 9, mood.energy));
      if (tick !== ledClock) {
        ledClock = tick;
        ledBase.forEach((c, i) => leds.setColorAt(i, hash(i * 7.3 + tick) < (st === 'idle' ? 0.15 : 0.35) ? off : c));
        if (leds.instanceColor) leds.instanceColor.needsUpdate = true;
      }
      ripples.forEach((ripple, i) => {
        const phase = (time * 0.45 * speed + i / ripples.length) % 1, r = mix(rs + 0.95, rs + 1.85, phase);
        ripple.scale.set(r, r, 1);
        (ripple.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - phase);
      });
      if (st !== 'open') swing.rotation.z = pull + (pull ? Math.sin(time * 31) * 0.012 * (0.5 + mood.energy) : Math.sin(time * 0.7) * 0.01);
      if (frog) {
        frog.position.y = frogBase + (st === 'idle' || st === 'open' ? 0 : Math.sin(time * 1.3 * speed) * 0.06);
        frog.rotation.y = st === 'idle' || st === 'open' ? 0.4 : time * 0.35 * speed;
      }
      const drops = crowd[0] as THREE.InstancedMesh | undefined;
      if (drops) {
        for (let i = 0; i < drops.count; i++) {
          const phase = (time * 0.9 * speed + i / drops.count) % 1, spread = (hash(i) - 0.5) * 0.9;
          dropMatrix.makeTranslation(burst[0] + spread * phase * 1.2, burst[1] + 0.1 + phase * 2.4 - phase * phase * 2.6, burst[2] + phase * 1.3 + hash(i + 40) * 0.3 * phase);
          drops.setMatrixAt(i, dropMatrix);
        }
        drops.instanceMatrix.needsUpdate = true;
      }
    };

    return world;
  },
});
