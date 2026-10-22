import * as THREE from 'three';
import { clamp01, choice, defineWorld, diorama, mix } from '@conjure/kit';

type P3 = [number, number, number];
const W = 22, D = 18;
const BACK = -D / 2, LEFT = -W / 2, FRONT = D / 2, RIGHT = W / 2;
const DEEP = 2.6;                      // depth of the arcades
const SCREEN_Z = BACK + DEEP, SCREEN_X = LEFT + DEEP;
const GATE_X = 1.3, GATE_W = 6;

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineWorld({
  questions: {
    build: choice('What is the caravanserai built of?', {
      mud: 'Sun-dried mud brick under a skin of straw plaster, the colour of the desert itself, with roof beams poking out.',
      brick: 'Fired red-gold brick banded with turquoise glazed tile, a royal road-station.',
      stone: 'Big pale dressed stone blocks, a fortress of a han built to last.',
      plaster: 'Whitewashed plaster, glaring in the sun, stained where the rain runs.',
    }),
    roofline: choice('What runs along the top of the walls?', {
      parapet: 'A plain flat parapet.',
      battlements: 'Notched battlements: the place can be defended.',
      gallery: 'An upper gallery of smaller arches, rooms for the richer guests.',
      tower: 'A flat roof with a domed watchtower at the corner.',
    }),
    gate: choice('How does the great gate stand?', {
      open: 'Both leaves thrown wide onto the bright desert road.',
      shut: 'Shut and barred for the night.',
      ajar: 'One leaf left ajar with a lamp hung in the arch for latecomers.',
      broken: 'Doorless: the leaves are long gone and the sand walks in.',
    }),
    centre: choice('What stands in the middle of the yard?', {
      well: 'A stone-ringed well with a timber windlass, the reason the place exists.',
      platform: 'A low raised stone platform for unloading, sleeping and prayer, where the most important thing is set.',
      kiosk: 'A tiny domed prayer kiosk on four pillars.',
      tree: 'One old mulberry tree giving the only shade.',
      nothing: 'Nothing: bare open ground.',
    }),
    yard: choice('What has the caravan trade left about the yard?', {
      bales: 'Piles of corded bales and pack saddles stacked along the arcades.',
      fodder: 'Heaps of fodder, a hitching rail and a long water trough.',
      fires: 'Cook fires with blackened pots on tripods.',
      stalls: 'Striped awnings on poles where traders have set out their goods.',
      bare: 'Nothing but swept ground.',
    }),
    bays: choice('What shows inside the arcade bays?', {
      dark: 'Only cool darkness.',
      carpets: 'Carpets and washing hung over rails between the arches.',
      goods: 'Sacks and big storage jars stacked in the shade.',
      doors: 'Low plank doors to the lodging cells, each with its own lamp niche.',
    }),
    ground: choice('What is underfoot?', {
      earth: 'Packed earth, scuffed by hooves.',
      flags: 'Big worn flagstones.',
      cobbles: 'Rounded river cobbles with a drain running to the gate.',
      sand: 'Loose rippled sand.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    // Dusk comes on as the key light sinks; a cold mood makes it bluer.
    const dusk = clamp01((mood.daylight - 0.62) / 0.3) * mix(1, 0.75, mood.warmth) + clamp01((0.12 - mood.daylight) / 0.12) * 0.5;
    const busy = mood.density, ruin = mood.wear;
    const sky = new THREE.Color('#efdcb4').lerp(new THREE.Color('#e3e4dc'), 1 - mood.warmth).lerp(new THREE.Color('#7f8cb6'), dusk);
    const tones = { mud: '#c9a273', brick: '#bf7d4c', stone: '#d2c6a8', plaster: '#ebe2cf' } as const;
    const wallHex = tones[a.build];
    const groundHex = { earth: '#c7a77c', flags: '#c2b79f', cobbles: '#aba08e', sand: '#dcc493' }[a.ground];
    const CX = 1.3, CZ = -0.4;
    const slots: [number, number, number?, number?][] = [
      a.centre === 'platform' ? [CX, CZ, 0.55] : [CX, a.centre === 'nothing' ? 0.6 : 3.7],
      [-4.4, 1.4], [7.2, 1.6], [-3.6, 6.2], [6.2, 6.2], [7, -3.6],
    ];
    const { art: s, world } = diorama(context, { background: `#${sky.getHexString()}`, floor: groundHex, width: W, depth: D, maxHeight: 3.3, radius: 1.9, pitch: 31, yaw: 30, slots });
    const root = s.root;

    // Light: late-afternoon gold sinking to blue dusk.
    const key = world.keyLight!;
    key.color.lerp(new THREE.Color('#ffc48a'), 0.45 * (1 - dusk)).lerp(new THREE.Color('#9fb0e6'), dusk * 0.8);
    key.intensity = mix(3.0, 0.75, dusk);
    for (const child of root.children) {
      const hemi = child as THREE.HemisphereLight;
      if (hemi.isHemisphereLight) { hemi.color.lerp(new THREE.Color('#93a4e0'), dusk * 0.8); hemi.groundColor.lerp(new THREE.Color('#c9a070'), 0.5); hemi.intensity = mix(1.35, 0.62, dusk); }
    }
    const glow = mix(0.5, 2.6, dusk);

    // Materials.
    const tint = (hex: string, amount = 1) => new THREE.Color(hex).multiplyScalar(amount);
    const wallTexture = canvasTexture(512, 512, (ctx) => {
      ctx.fillStyle = wallHex; ctx.fillRect(0, 0, 512, 512);
      const course = a.build === 'stone' ? 64 : 32, len = a.build === 'stone' ? 128 : 64;
      if (a.build !== 'plaster') for (let row = 0; row < 512 / course; row++) for (let i = -1; i < 512 / len + 1; i++) {
        const x = i * len + (row % 2) * len / 2, shadeBy = random();
        ctx.fillStyle = shadeBy < 0.5 ? `rgba(60,35,10,${shadeBy * (a.build === 'mud' ? 0.14 : 0.24)})` : `rgba(255,240,210,${(shadeBy - 0.5) * 0.24})`;
        ctx.fillRect(x + 2, row * course + 2, len - 4, course - 4);
        if (a.build !== 'mud') { ctx.fillStyle = 'rgba(70,50,30,0.3)'; ctx.fillRect(x, row * course, len, 2); ctx.fillRect(x, row * course, 2, course); }
      }
      for (let i = 0; i < 20 + ruin * 60; i++) {
        ctx.fillStyle = `rgba(${a.build === 'plaster' ? '150,120,80' : '70,45,20'},${0.05 + random() * 0.12 * (0.5 + ruin)})`;
        ctx.beginPath(); ctx.ellipse(random() * 512, random() * 512, 10 + random() * 60, 6 + random() * 30, 0, 0, 7); ctx.fill();
      }
    });
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(0.25, 0.25);
    const wall = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 1 });
    const plain = s.material(wallHex, { roughness: 1 });
    const shade = s.material(tint(wallHex, 0.55), { roughness: 1 });
    const roofMat = s.material(tint(wallHex, 0.93), { roughness: 1 });
    const timber = s.material('#6b4a30');
    const tile = new THREE.MeshStandardMaterial({ color: '#2aa6a0', roughness: 0.3, emissive: '#0d5a5a', emissiveIntensity: 0.5 });
    const trim = a.build === 'brick' ? tile : s.material(tint(wallHex, 0.78), { roughness: 1 });
    const lampMat = new THREE.MeshStandardMaterial({ color: '#ffd58a', emissive: '#ffae3a', emissiveIntensity: glow });
    const haloMat = new THREE.MeshBasicMaterial({ color: '#ffc46a', transparent: true, opacity: mix(0.08, 0.36, dusk), depthWrite: false });
    const poolMat = new THREE.MeshBasicMaterial({ color: '#ffb75a', transparent: true, opacity: mix(0.0, 0.42, dusk), depthWrite: false });
    const sand = s.material(new THREE.Color(groundHex).lerp(new THREE.Color('#e0c896'), 0.6), { roughness: 1 });

    const inYard = (x: number, z: number) => x > SCREEN_X + 0.9 && x < RIGHT - 0.9 && z > SCREEN_Z + 0.9 && z < FRONT - 0.9;
    const clear = (x: number, z: number, gap = 2.9) => inYard(x, z) && slots.every(([sx, sz]) => Math.hypot(sx - x, sz - z) > gap) && (a.centre === 'nothing' || Math.hypot(CX - x, CZ - z) > 3.1) && !(Math.abs(x - GATE_X) < 2.4 && z < SCREEN_Z + 3.5);
    const spot = (tries = 30, gap = 2.9): [number, number] | null => {
      for (let i = 0; i < tries; i++) { const x = mix(SCREEN_X + 1, RIGHT - 1, random()), z = mix(SCREEN_Z + 1, FRONT - 1, random()); if (clear(x, z, gap)) return [x, z]; }
      return null;
    };
    /** A spot hugging the foot of an arcade, where things get stacked out of the way. */
    const edgeSpot = (): [number, number] | null => {
      for (let i = 0; i < 30; i++) {
        const alongBack = random() < 0.5;
        const x = alongBack ? mix(SCREEN_X + 1, RIGHT - 1.2, random()) : SCREEN_X + 1 + random() * 0.8, z = alongBack ? SCREEN_Z + 1 + random() * 0.8 : mix(SCREEN_Z + 1, FRONT - 1.2, random());
        if (clear(x, z, 2.5)) return [x, z];
      }
      return null;
    };
    const lamp = (at: P3, pool = true) => {
      s.rod([at[0], at[1] + 0.55, at[2]], [at[0], at[1] + 0.12, at[2]], 0.012, timber);
      s.mesh(new THREE.OctahedronGeometry(0.17, 0), lampMat, at).scale.y = 1.35;
      s.mesh(new THREE.SphereGeometry(0.75, 12, 8), haloMat, at).castShadow = false;
      if (pool && dusk > 0.05) { const disc = s.mesh(new THREE.CircleGeometry(2.3, 24), poolMat, [at[0], 0.02, at[2]]); disc.rotation.x = -Math.PI / 2; disc.castShadow = false; }
    };

    // Ground texture.
    const floor = world.ground as THREE.Mesh;
    (floor.material as THREE.MeshStandardMaterial).map = canvasTexture(1024, 1024, (ctx) => {
      ctx.fillStyle = groundHex; ctx.fillRect(0, 0, 1024, 1024);
      const speck = (count: number, size: number, alpha: number) => { for (let i = 0; i < count; i++) { ctx.fillStyle = random() < 0.5 ? `rgba(70,50,25,${alpha * random()})` : `rgba(255,245,220,${alpha * random()})`; ctx.beginPath(); ctx.ellipse(random() * 1024, random() * 1024, size * (0.4 + random()), size * (0.3 + random() * 0.6), random() * 3, 0, 7); ctx.fill(); } };
      if (a.ground === 'flags') {
        ctx.strokeStyle = 'rgba(80,65,45,0.55)'; ctx.lineWidth = 3;
        for (let row = 0; row < 16; row++) { let x = -random() * 60; while (x < 1024) { const w = 50 + random() * 60; ctx.fillStyle = `rgba(${random() < 0.5 ? '90,75,55' : '255,250,235'},${random() * 0.14})`; ctx.fillRect(x, row * 64, w, 64); ctx.strokeRect(x, row * 64, w, 64); x += w; } }
      } else if (a.ground === 'cobbles') {
        for (let i = 0; i < 5200; i++) { const x = random() * 1024, y = random() * 1024; ctx.fillStyle = `rgba(${random() < 0.5 ? '70,60,48' : '235,228,210'},${0.08 + random() * 0.2})`; ctx.beginPath(); ctx.ellipse(x, y, 5 + random() * 4, 4 + random() * 3, random() * 3, 0, 7); ctx.fill(); }
        const gx = ((GATE_X - LEFT) / W) * 1024;
        ctx.fillStyle = 'rgba(60,50,40,0.6)'; ctx.fillRect(gx - 6, 0, 12, 560); ctx.fillStyle = 'rgba(230,222,205,0.5)'; ctx.fillRect(gx - 11, 0, 4, 560); ctx.fillRect(gx + 7, 0, 4, 560);
      } else if (a.ground === 'sand') {
        ctx.strokeStyle = 'rgba(150,115,60,0.3)'; ctx.lineWidth = 3;
        for (let y = 0; y < 1024; y += 14) { ctx.beginPath(); for (let x = 0; x <= 1024; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.02 + y * 0.05) * 6 + random() * 3); ctx.stroke(); }
      } else {
        speck(900, 14, 0.12);
        ctx.fillStyle = 'rgba(80,55,30,0.3)';
        for (let i = 0; i < 380 * (0.3 + busy); i++) { const x = random() * 1024, y = random() * 1024, turn = random() * 6; for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + Math.cos(turn) * 3 * side, y + Math.sin(turn) * 3 * side, 3.4, 2.2, turn, 0, 7); ctx.fill(); } }
      }
      speck(260, 26, 0.07);
      // A trodden path from the gate to the centre, and damp earth round the well.
      const gx = ((GATE_X - LEFT) / W) * 1024, cz = ((CZ - BACK) / D) * 1024;
      const path = ctx.createLinearGradient(gx - 130, 0, gx + 130, 0);
      path.addColorStop(0, 'rgba(90,65,35,0)'); path.addColorStop(0.5, 'rgba(90,65,35,0.2)'); path.addColorStop(1, 'rgba(90,65,35,0)');
      ctx.fillStyle = path; ctx.fillRect(gx - 130, 0, 260, cz);
      if (a.centre === 'well') { const damp = ctx.createRadialGradient(gx, cz, 20, gx, cz, 150); damp.addColorStop(0, 'rgba(70,50,30,0.5)'); damp.addColorStop(1, 'rgba(70,50,30,0)'); ctx.fillStyle = damp; ctx.fillRect(gx - 160, cz - 160, 320, 320); }
      // Sand creeping in from the edges of a neglected yard.
      for (let i = 0; i < (ruin + (1 - busy)) * 26; i++) { const edge = random() < 0.5; ctx.fillStyle = 'rgba(224,202,150,0.55)'; ctx.beginPath(); ctx.ellipse(edge ? 140 + random() * 140 : random() * 1024, edge ? random() * 1024 : 150 + random() * 120, 40 + random() * 110, 24 + random() * 50, random() * 0.6, 0, 7); ctx.fill(); }
    });

    // ---- Architecture ----
    const H = 4.5, upper = a.roofline === 'gallery' ? 3.0 : 0, TOP = H + 0.35 + upper + (upper ? 0.3 : 0);
    /** A wall pierced by pointed arches, in x 0..length and y 0..height, extruded 0..thick in z. */
    const arcade = (length: number, bays: number, height: number, thick: number, openW: number, spring: number, apex: number, sill = 0) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(length, 0); shape.lineTo(length, height); shape.lineTo(0, height); shape.closePath();
      const bay = length / bays;
      for (let i = 0; i < bays; i++) {
        const cx = (i + 0.5) * bay, l = cx - openW / 2, r = cx + openW / 2, hole = new THREE.Path();
        hole.moveTo(l, sill); hole.lineTo(l, spring);
        hole.quadraticCurveTo(l + openW * 0.04, spring + (apex - spring) * 0.72, cx, apex);
        hole.quadraticCurveTo(r - openW * 0.04, spring + (apex - spring) * 0.72, r, spring);
        hole.lineTo(r, sill); hole.closePath();
        shape.holes.push(hole);
      }
      return new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 8 });
    };
    const leftOfGate = GATE_X - GATE_W / 2, rightOfGate = GATE_X + GATE_W / 2;
    const runs: { from: P3; length: number; bays: number; turn: number }[] = [
      { from: [SCREEN_X, 0, SCREEN_Z - 0.5], length: leftOfGate - SCREEN_X, bays: 2, turn: 0 },
      { from: [rightOfGate, 0, SCREEN_Z - 0.5], length: RIGHT - rightOfGate, bays: 2, turn: 0 },
      { from: [SCREEN_X - 0.5, 0, FRONT], length: FRONT - SCREEN_Z, bays: 5, turn: Math.PI / 2 },
    ];
    const bayCentres: { x: number; z: number; alongX: boolean }[] = [];
    for (const run of runs) {
      const screen = s.mesh(arcade(run.length, run.bays, H, 0.5, (run.length / run.bays) * 0.68, 2.0, 3.55), wall, run.from);
      screen.rotation.y = run.turn;
      if (upper) {
        const loft = s.mesh(arcade(run.length, run.bays * 2, upper, 0.4, (run.length / run.bays / 2) * 0.56, 1.5, 2.3, 0.75), wall, [run.from[0] + (run.turn ? 0.05 : 0), H + 0.35, run.from[2] + (run.turn ? 0 : 0.05)]);
        loft.rotation.y = run.turn;
      }
      for (let i = 0; i < run.bays; i++) {
        const along = (i + 0.5) * (run.length / run.bays);
        bayCentres.push(run.turn ? { x: SCREEN_X, z: FRONT - along, alongX: false } : { x: run.from[0] + along, z: SCREEN_Z, alongX: true });
      }
    }
    // Rear walls, roofs and the cut edges of the two walls we look over.
    const rearH = TOP - 0.02;
    s.box([leftOfGate - LEFT, rearH, 0.5], [(leftOfGate + LEFT) / 2, rearH / 2, BACK + 0.25], shade);
    s.box([RIGHT - rightOfGate, rearH, 0.5], [(RIGHT + rightOfGate) / 2, rearH / 2, BACK + 0.25], shade);
    s.box([0.5, rearH, D], [LEFT + 0.25, rearH / 2, 0], shade);
    for (const y of upper ? [H + 0.175, TOP - 0.15] : [H + 0.175]) {
      s.box([leftOfGate - LEFT, 0.35, DEEP + 0.15], [(leftOfGate + LEFT) / 2, y, BACK + DEEP / 2 + 0.075], roofMat);
      s.box([RIGHT - rightOfGate, 0.35, DEEP + 0.15], [(RIGHT + rightOfGate) / 2, y, BACK + DEEP / 2 + 0.075], roofMat);
      s.box([DEEP + 0.15, 0.35, FRONT - SCREEN_Z], [LEFT + DEEP / 2 + 0.075, y, (FRONT + SCREEN_Z) / 2], roofMat);
    }
    s.box([0.6, 0.5, FRONT - SCREEN_Z], [RIGHT - 0.3, 0.25, (FRONT + SCREEN_Z) / 2], plain);
    s.box([RIGHT - SCREEN_X, 0.5, 0.6], [(RIGHT + SCREEN_X) / 2, 0.25, FRONT - 0.3], plain);
    s.box([0.9, rearH, 0.9], [RIGHT - 0.45, rearH / 2, SCREEN_Z - 0.25], wall);
    s.box([0.9, rearH, 0.9], [SCREEN_X - 0.25, rearH / 2, FRONT - 0.45], wall);

    // Roofline dressing.
    const edgeY = TOP;
    const edges: { from: [number, number]; to: [number, number] }[] = [
      { from: [SCREEN_X, SCREEN_Z - 0.25], to: [leftOfGate, SCREEN_Z - 0.25] },
      { from: [rightOfGate, SCREEN_Z - 0.25], to: [RIGHT, SCREEN_Z - 0.25] },
      { from: [SCREEN_X - 0.25, SCREEN_Z], to: [SCREEN_X - 0.25, FRONT] },
    ];
    const merlons: { at: P3; size: number }[] = [], beams: { at: P3; size: number }[] = [];
    for (const edge of edges) {
      const length = Math.hypot(edge.to[0] - edge.from[0], edge.to[1] - edge.from[1]), alongX = edge.from[1] === edge.to[1];
      const cx = (edge.from[0] + edge.to[0]) / 2, cz = (edge.from[1] + edge.to[1]) / 2;
      s.box(alongX ? [length, 0.5, 0.5] : [0.5, 0.5, length], [cx, edgeY + 0.25, cz], plain);
      if (a.build === 'brick') s.box(alongX ? [length, 0.3, 0.04] : [0.04, 0.3, length], [cx + (alongX ? 0 : 0.27), H - 0.05, cz + (alongX ? 0.27 : 0)], tile);
      for (let d = 0.5; d < length; d += 1.1) {
        const t = d / length, x = mix(edge.from[0], edge.to[0], t), z = mix(edge.from[1], edge.to[1], t);
        if (a.roofline === 'battlements' && random() > ruin * 0.35) merlons.push({ at: [x, edgeY + 0.82, z], size: 1 });
        if (a.build === 'mud' && !upper) beams.push({ at: [x + (alongX ? 0 : 0.42), H + 0.05, z + (alongX ? 0.42 : 0)], size: 1 });
      }
    }
    if (merlons.length) s.scatter(new THREE.BoxGeometry(0.55, 0.65, 0.5), plain, merlons);
    if (beams.length) s.scatter(new THREE.SphereGeometry(0.1, 8, 6), timber, beams);
    if (a.roofline === 'tower') {
      const tx = LEFT + DEEP / 2, tz = BACK + DEEP / 2;
      s.cylinder(1.7, 1.9, TOP + 2.6, [tx, (TOP + 2.6) / 2, tz], wall, 14);
      s.cylinder(1.95, 1.7, 0.4, [tx, TOP + 2.75, tz], plain, 14);
      const dome = s.mesh(new THREE.SphereGeometry(1.55, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), a.build === 'brick' ? tile : roofMat, [tx, TOP + 2.9, tz]);
      dome.scale.y = 1.15;
      s.cylinder(0.02, 0.07, 0.8, [tx, TOP + 5.0, tz], timber, 6);
      for (let i = 0; i < 4; i++) { const angle = i * 1.571 + 0.78; s.box([0.35, 0.9, 0.12], [tx + Math.sin(angle) * 1.72, TOP + 1.7, tz + Math.cos(angle) * 1.72], s.material('#2a2018')).rotation.y = angle; }
    }

    // The great gate: a tall portal block standing proud of the arcade.
    const gateH = TOP + 2.6, gateDepth = DEEP + 0.9, openW = 3.3, spring = 3.3, apex = 5.3;
    const portal = s.mesh(arcade(GATE_W, 1, gateH, gateDepth, openW, spring, apex), wall, [leftOfGate, 0, BACK - 0.2]);
    portal.receiveShadow = true;
    const face = BACK - 0.2 + gateDepth;
    // A raised frame round the arch, tiled on the royal road.
    for (const [w, h, x, y] of [[GATE_W - 0.8, 0.28, GATE_X, gateH - 0.6], [0.28, gateH - 1.0, leftOfGate + 0.55, (gateH - 0.2) / 2], [0.28, gateH - 1.0, rightOfGate - 0.55, (gateH - 0.2) / 2]] as const) s.box([w, h, 0.08], [x, y, face + 0.04], trim);
    s.box([GATE_W + 0.3, 0.4, gateDepth + 0.3], [GATE_X, gateH + 0.2, BACK - 0.2 + gateDepth / 2], plain);
    if (a.roofline === 'battlements') for (let i = 0; i < 5; i++) s.box([0.6, 0.7, 0.5], [leftOfGate + 0.6 + i * 1.2, gateH + 0.75, face - 0.3], plain);
    for (const side of [-1, 1]) for (let i = 0; i < 2; i++) s.box([0.7, 1.0, 0.06], [GATE_X + side * 2.25, 1.9 + i * 2.3, face + 0.03], shade);
    // What is seen through it.
    const outside = canvasTexture(128, 256, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, `#${sky.clone().lerp(new THREE.Color('#ffffff'), 0.35).getHexString()}`);
      g.addColorStop(0.62, `#${new THREE.Color('#ffe9b8').lerp(new THREE.Color('#f0a878'), dusk).getHexString()}`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 256);
      ctx.fillStyle = `#${new THREE.Color('#e2c389').lerp(new THREE.Color('#6f6f92'), dusk).getHexString()}`;
      ctx.beginPath(); ctx.moveTo(0, 256); ctx.lineTo(0, 170); ctx.quadraticCurveTo(40, 140, 80, 168); ctx.quadraticCurveTo(105, 150, 128, 160); ctx.lineTo(128, 256); ctx.fill();
      ctx.fillStyle = `#${new THREE.Color('#d1ae72').lerp(new THREE.Color('#585a7c'), dusk).getHexString()}`;
      ctx.beginPath(); ctx.moveTo(0, 256); ctx.lineTo(0, 205); ctx.quadraticCurveTo(70, 180, 128, 215); ctx.lineTo(128, 256); ctx.fill();
    });
    const leafW = openW / 2, leafH = apex - 0.1, doorZ = BACK + 0.9;
    const leaf = (side: number, swing: number) => {
      const g = new THREE.Group();
      g.position.set(GATE_X + side * leafW, 0, doorZ);
      const planks = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, 0.14), timber);
      planks.position.set(-side * leafW / 2, leafH / 2, 0);
      planks.castShadow = planks.receiveShadow = true;
      g.add(planks);
      const iron = s.material('#2d2925', { metalness: 0.4 });
      for (const y of [0.8, 2.2, 3.6]) { const band = new THREE.Mesh(new THREE.BoxGeometry(leafW, 0.14, 0.18), iron); band.position.set(-side * leafW / 2, y, 0); g.add(band); }
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { const stud = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), iron); stud.position.set(-side * (0.3 + i * 0.5), 1.2 + j * 0.75, 0.09); g.add(stud); }
      g.rotation.y = side * swing;
      root.add(g);
    };
    if (a.gate !== 'shut') {
      const view = s.mesh(new THREE.PlaneGeometry(openW + 0.4, apex + 0.2), new THREE.MeshStandardMaterial({ map: outside, emissiveMap: outside, emissive: '#ffffff', emissiveIntensity: mix(0.85, 0.5, dusk), roughness: 1 }), [GATE_X, (apex + 0.2) / 2, BACK - 0.1]);
      view.castShadow = false;
    }
    if (a.gate === 'open') { leaf(-1, -1.35); leaf(1, -1.35); }
    else if (a.gate === 'shut') { leaf(-1, 0); leaf(1, 0); s.box([openW + 0.5, 0.2, 0.2], [GATE_X, 1.5, doorZ + 0.2], timber); }
    else if (a.gate === 'ajar') { leaf(-1, 0); leaf(1, -1.0); }
    else {
      s.box([0.2, 2.2, 0.14], [GATE_X - leafW + 0.12, 1.1, doorZ], timber).rotation.z = 0.06;
      for (let i = 0; i < 3; i++) s.ball([1.3 + random() * 0.6, 0.2 + random() * 0.2, 1.1 + random() * 0.6], [GATE_X - 0.8 + i * 0.8, 0, SCREEN_Z - 0.6 + i * 0.8], sand, 12);
    }
    if (a.gate === 'ajar' || busy < 0.3 || dusk > 0.5) lamp([GATE_X, apex - 1.0, face - 0.5]);

    // Bays.
    const darkDoor = s.material('#3a2a1e'), jarMat = s.material('#a9683f'), sackMat = s.material('#bfa57a', { roughness: 1 });
    const carpetHues = ['#a8281f', '#243a78', '#c98a2e', '#3f7a5a', '#8a2f5a', '#e6dcc2'];
    bayCentres.forEach((bay, index) => {
      const inX = bay.alongX ? 0 : -1, inZ = bay.alongX ? -1 : 0;          // direction into the bay
      const at = (along: number, deep: number, y: number): P3 => [bay.x + (bay.alongX ? along : 0) + inX * deep, y, bay.z + (bay.alongX ? 0 : along) + inZ * deep];
      const facing = bay.alongX ? 0 : Math.PI / 2;
      if (a.bays === 'doors') {
        s.box([1.0, 1.9, 0.1], at(0, DEEP - 0.55, 0.95), darkDoor).rotation.y = facing;
        s.box([1.2, 0.16, 0.14], at(0, DEEP - 0.56, 1.98), timber).rotation.y = facing;
        const niche = s.box([0.3, 0.36, 0.1], at(0.95, DEEP - 0.55, 1.5), lampMat);
        niche.rotation.y = facing; niche.castShadow = false;
      } else if (a.bays === 'carpets') {
        if (random() < 0.85) {
          s.rod(at(-1.0, 0.3, 2.05), at(1.0, 0.3, 2.05), 0.03, timber);
          const count = 1 + Math.floor(random() * 2.5);
          for (let i = 0; i < count; i++) {
            const w = 0.6 + random() * 0.5, h = 0.8 + random() * 0.8, hue = carpetHues[Math.floor(random() * carpetHues.length)];
            const cloth = s.box([w, h, 0.04], at(-0.7 + i * 0.75 + random() * 0.2, 0.3, 2.05 - h / 2), s.material(hue, { roughness: 1 }));
            cloth.rotation.y = facing;
            s.box([w, 0.1, 0.045], at(cloth.position.x - bay.x, 0.3, 2.05 - h + 0.2), s.material('#e6dcc2')).position.set(cloth.position.x, 2.05 - h + 0.22, cloth.position.z);
          }
        }
      } else if (a.bays === 'goods') {
        const count = Math.round(mix(1, 6, busy) * mix(0.6, 1.2, random()));
        for (let i = 0; i < count; i++) {
          const along = (random() - 0.5) * 1.7, deep = 0.7 + random() * 1.2;
          if (random() < 0.5) s.lathe([[0, 0], [0.16, 0], [0.33, 0.35], [0.34, 0.6], [0.2, 0.9], [0.17, 1.0], [0.22, 1.06]], jarMat, at(along, deep, 0));
          else { s.ball([0.36, 0.3, 0.3], at(along, deep, 0.26), sackMat, 10); if (random() < 0.5) s.ball([0.33, 0.26, 0.28], at(along + 0.08, deep, 0.72), sackMat, 10); }
        }
      }
      // More lamps as night comes on and the place fills; an emptied yard keeps only the one at the gate.
      const lit = busy > 0.3 && (a.bays === 'doors' ? index % 2 === 0 : random() < mix(0.15, 0.7, busy));
      if (lit) lamp(at(0, -0.25, 2.75), dusk > 0.4);
    });

    // ---- The centre ----
    if (a.centre === 'well') {
      const stone = s.material('#b9ad96', { roughness: 1 });
      const blocks: { at: P3; size: number; color: THREE.Color }[] = [];
      for (let c = 0; c < 3; c++) for (let i = 0; i < 12; i++) { const angle = ((i + (c % 2) * 0.5) / 12) * Math.PI * 2; blocks.push({ at: [CX + Math.cos(angle) * 1.0, 0.14 + c * 0.27, CZ + Math.sin(angle) * 1.0], size: 1, color: tint('#c3b79e', mix(0.82, 1.08, random())) }); }
      s.scatter(new THREE.DodecahedronGeometry(0.3, 1), new THREE.MeshStandardMaterial({ roughness: 1 }), blocks);
      s.cylinder(0.85, 0.85, 0.05, [CX, 0.5, CZ], s.material('#27323a', { roughness: 0.2 }), 18);
      for (const side of [-1, 1]) { s.rod([CX + side * 1.35, 0, CZ], [CX + side * 1.3, 2.25, CZ], 0.1, timber, 0.08); for (const f of [-1, 1]) s.rod([CX + side * 1.3, 2.1, CZ], [CX + side * 1.3, 2.5, CZ + f * 0.2], 0.05, timber); }
      s.rod([CX - 1.7, 2.3, CZ], [CX + 1.7, 2.3, CZ], 0.12, timber);
      s.rod([CX + 1.7, 2.3, CZ], [CX + 1.7, 1.95, CZ + 0.25], 0.035, timber);
      s.rod([CX + 1.68, 1.95, CZ + 0.25], [CX + 2.0, 1.95, CZ + 0.25], 0.035, timber);
      for (let i = 0; i < 5; i++) s.ring(0.14, 0.022, [CX - 0.1 + i * 0.05, 2.3, CZ], s.material('#c2a56e')).rotation.y = Math.PI / 2;
      s.rod([CX, 2.2, CZ + 0.12], [CX, 1.3, CZ + 0.12], 0.018, s.material('#c2a56e'));
      s.cylinder(0.2, 0.15, 0.32, [CX, 1.15, CZ + 0.12], s.material('#5b3a24'), 12);
      s.box([2.4, 0.4, 0.7], [CX - 0.2, 0.2, CZ + 1.75], stone);
      s.box([2.15, 0.06, 0.48], [CX - 0.2, 0.39, CZ + 1.75], s.material('#3f6a78', { roughness: 0.15, emissive: '#1d4a58', emissiveIntensity: 0.3 }));
    } else if (a.centre === 'platform') {
      const stone = s.material(tint(wallHex, 0.95), { roughness: 1 });
      s.box([5.6, 0.55, 4.4], [CX, 0.275, CZ], stone);
      s.box([5.9, 0.12, 4.7], [CX, 0.5, CZ], s.material(tint(wallHex, 1.06), { roughness: 1 }));
      s.box([1.6, 0.28, 0.5], [CX, 0.14, CZ + 2.55], stone);
      for (const [x, z] of [[-2.6, -1.9], [2.6, -1.9], [-2.6, 1.9], [2.6, 1.9]] as const) s.cylinder(0.16, 0.2, 0.5, [CX + x, 0.8, CZ + z], stone, 8);
    } else if (a.centre === 'kiosk') {
      for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]] as const) { s.box([0.45, 3.0, 0.45], [CX + x, 1.5, CZ + z], wall); s.box([0.6, 0.18, 0.6], [CX + x, 3.0, CZ + z], plain); }
      s.box([3.4, 0.5, 3.4], [CX, 3.34, CZ], wall);
      s.box([3.2, 0.25, 3.2], [CX, 0.125, CZ], plain);
      s.cylinder(1.5, 1.6, 0.4, [CX, 3.78, CZ], plain, 8);
      const dome = s.mesh(new THREE.SphereGeometry(1.42, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), a.build === 'brick' ? tile : roofMat, [CX, 3.95, CZ]);
      dome.scale.y = 1.1;
      s.cylinder(0.02, 0.06, 0.7, [CX, 5.8, CZ], s.material('#c99b3a', { metalness: 0.6 }), 6);
      lamp([CX, 2.5, CZ]);
    } else if (a.centre === 'tree') {
      const bark = s.material('#6a5038', { roughness: 1 });
      s.cylinder(1.5, 1.6, 0.3, [CX, 0.15, CZ], plain, 10);
      s.rod([CX, 0, CZ], [CX + 0.15, 2.3, CZ - 0.1], 0.38, bark, 0.26);
      const leafMat = s.material(new THREE.Color('#6f8a4a').lerp(new THREE.Color('#a39a6a'), ruin * 0.7), { roughness: 1 });
      const boughs: P3[] = [[-1.4, 3.9, 0.3], [1.5, 4.1, -0.4], [0.2, 4.8, 0.9], [-0.3, 4.3, -1.3], [0.9, 3.7, 1.1]];
      for (const [x, y, z] of boughs) {
        s.rod([CX + 0.15, 2.2, CZ - 0.1], [CX + x * 0.8, y - 0.5, CZ + z * 0.8], 0.17, bark, 0.08);
        if (ruin < 0.85) s.mesh(new THREE.DodecahedronGeometry(1.3 + random() * 0.5, 1), leafMat, [CX + x, y, CZ + z]).scale.y = 0.72;
      }
    }

    // ---- What the caravans left ----
    const smokeAt: P3[] = [];
    const amount = (most: number) => Math.round(most * mix(0.15, 1, busy));
    if (a.yard === 'bales') {
      const felt = ['#8d8980', '#7a5435', '#cdbf9f', '#6f6a5a'];
      const pieces: { at: P3; size: number; color: THREE.Color }[] = [];
      for (let pile = 0; pile < amount(7); pile++) {
        const where = edgeSpot() ?? spot();
        if (!where) continue;
        const n = 2 + Math.floor(random() * 5), hue = felt[Math.floor(random() * felt.length)];
        for (let i = 0; i < n; i++) pieces.push({ at: [where[0] + (i % 3 - 1) * 0.95 + (random() - 0.5) * 0.15, 0.24 + Math.floor(i / 3) * 0.47, where[1] + (random() - 0.5) * 0.3], size: 1, color: tint(hue, mix(0.85, 1.1, random())) });
        if (random() < 0.6) { const x = where[0] + 1.7, z = where[1] + 0.3; for (const side of [-1, 1]) s.rod([x - 0.4, 0, z + side * 0.3], [x + 0.1, 0.75, z - side * 0.05], 0.035, timber); s.rod([x - 0.5, 0.4, z - 0.32], [x + 0.5, 0.42, z - 0.3], 0.03, timber); }
      }
      if (pieces.length) s.scatter(new THREE.BoxGeometry(0.9, 0.46, 0.56), new THREE.MeshStandardMaterial({ roughness: 1 }), pieces);
    } else if (a.yard === 'fodder') {
      const hay = s.material('#c9aa5a', { roughness: 1 });
      for (let i = 0; i < amount(6); i++) { const where = spot(); if (where) { const r = 0.8 + random() * 0.7; s.lathe([[r, 0], [r * 0.85, r * 0.35], [r * 0.45, r * 0.75], [0, r * 0.95]], hay, [where[0], 0, where[1]]); } }
      const rz = FRONT - 3.2;
      if (clear(-5.5, rz, 2.2)) { for (const x of [-7, -5.5, -4]) s.rod([x, 0, rz], [x, 1.15, rz], 0.07, timber); s.rod([-7.3, 1.05, rz], [-3.7, 1.05, rz], 0.06, timber); }
      const tx = RIGHT - 1.6;
      s.box([0.8, 0.5, 4.2], [tx, 0.25, 3.5], s.material('#b9ad96', { roughness: 1 }));
      s.box([0.56, 0.05, 3.9], [tx, 0.49, 3.5], s.material('#3f6a78', { roughness: 0.15, emissive: '#1d4a58', emissiveIntensity: 0.3 }));
    } else if (a.yard === 'fires') {
      const ember = new THREE.MeshStandardMaterial({ color: '#ff8a3a', emissive: '#ff5a1a', emissiveIntensity: mix(1.0, 2.6, dusk) });
      const pot = s.material('#26221f', { metalness: 0.3, roughness: 0.6 });
      for (let i = 0; i < Math.max(1, amount(4)); i++) {
        const where = spot(40, 3.2);
        if (!where) continue;
        const [x, z] = where;
        const stones: { at: P3; size: number }[] = [];
        for (let k = 0; k < 9; k++) stones.push({ at: [x + Math.cos(k * 0.7) * 0.5, 0.08, z + Math.sin(k * 0.7) * 0.5], size: 0.12 + random() * 0.05 });
        s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#6f675c'), stones);
        s.mesh(new THREE.ConeGeometry(0.3, 0.3, 7), ember, [x, 0.14, z]).castShadow = false;
        for (let k = 0; k < 3; k++) { const angle = k * 2.094 + random(); s.rod([x + Math.cos(angle) * 0.75, 0, z + Math.sin(angle) * 0.75], [x, 1.45, z], 0.03, timber); }
        s.rod([x, 1.4, z], [x, 0.9, z], 0.012, pot);
        s.mesh(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.7), pot, [x, 0.72, z]);
        if (dusk > 0.05) { const disc = s.mesh(new THREE.CircleGeometry(2.0, 20), poolMat, [x, 0.021, z]); disc.rotation.x = -Math.PI / 2; disc.castShadow = false; }
        smokeAt.push([x, 1.2, z]);
      }
    } else if (a.yard === 'stalls') {
      const stripes = [['#a8281f', '#eadcb8'], ['#243a78', '#eadcb8'], ['#c98a2e', '#5a3520'], ['#3f7a5a', '#eadcb8']];
      for (let i = 0; i < Math.max(1, amount(5)); i++) {
        const where = edgeSpot() ?? spot();
        if (!where) continue;
        const [x, z] = where, pair = stripes[i % stripes.length];
        const map = canvasTexture(64, 64, (ctx) => { for (let k = 0; k < 8; k++) { ctx.fillStyle = pair[k % 2]; ctx.fillRect(k * 8, 0, 8, 64); } });
        for (const [px, pz, h] of [[-1.3, -0.9, 2.5], [1.3, -0.9, 2.5], [-1.3, 0.9, 2.05], [1.3, 0.9, 2.05]] as const) s.rod([x + px, 0, z + pz], [x + px, h, z + pz], 0.04, timber);
        const awning = s.box([3.0, 0.05, 2.2], [x, 2.3, z], new THREE.MeshStandardMaterial({ map, roughness: 1, side: THREE.DoubleSide }));
        awning.rotation.x = 0.24 + ruin * 0.2 * random();
        s.box([2.2, 0.08, 0.9], [x, 0.6, z], timber);
        for (const px of [-0.9, 0.9]) s.box([0.1, 0.6, 0.8], [x + px, 0.3, z], timber);
        for (let k = 0; k < 4; k++) s.ball([0.2, 0.16 + random() * 0.12, 0.2], [x - 0.75 + k * 0.5, 0.74, z + (random() - 0.5) * 0.3], s.material(['#d9481c', '#f0b01c', '#2c2622', '#d77f95', '#9fb86a'][Math.floor(random() * 5)]), 8);
      }
    }
    // Whatever was asked, a full yard cooks and an empty one silts up.
    if (busy > 0.62 && !smokeAt.length) smokeAt.push([RIGHT - 3, 0.6, SCREEN_Z + 2.2]);
    if (busy > 0.62 && a.yard !== 'fires') { const [x, , z] = smokeAt[0]; s.mesh(new THREE.ConeGeometry(0.3, 0.3, 7), new THREE.MeshStandardMaterial({ color: '#ff8a3a', emissive: '#ff5a1a', emissiveIntensity: mix(1.0, 2.6, dusk) }), [x, 0.14, z]).castShadow = false; s.ring(0.45, 0.09, [x, 0.05, z], s.material('#6f675c')).rotation.x = Math.PI / 2; }
    const drifts = Math.round((1 - busy) * 6 + ruin * 4);
    for (let i = 0; i < drifts; i++) {
      const alongBack = random() < 0.5, x = alongBack ? mix(SCREEN_X + 1, RIGHT - 1, random()) : SCREEN_X + 0.4 + random() * 0.6, z = alongBack ? SCREEN_Z + 0.4 + random() * 0.6 : mix(SCREEN_Z + 1, FRONT - 1, random());
      if (Math.abs(x - GATE_X) < 2.2 && alongBack && a.gate !== 'broken') continue;
      s.ball(alongBack ? [1.4 + random() * 1.2, 0.18 + random() * 0.25, 0.7 + random() * 0.4] : [0.7 + random() * 0.4, 0.18 + random() * 0.25, 1.4 + random() * 1.2], [x, 0, z], sand, 12);
    }
    // Ruin: fallen brick at the foot of the walls.
    if (ruin > 0.55) {
      const rubble: { at: P3; size: number; color: THREE.Color }[] = [];
      for (let heap = 0; heap < Math.round((ruin - 0.5) * 10); heap++) { const where = edgeSpot(); if (!where) continue; for (let i = 0; i < 12; i++) rubble.push({ at: [where[0] + (random() - 0.5) * 1.8, 0.1 + random() * 0.25, where[1] + (random() - 0.5) * 1.2], size: 0.14 + random() * 0.2, color: tint(wallHex, mix(0.7, 1, random())) }); }
      if (rubble.length) s.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), rubble);
    }

    // Cook smoke, rising and thinning.
    const puffs: { mesh: THREE.Mesh; base: P3; offset: number }[] = [];
    const smokeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e9e4da').lerp(new THREE.Color('#aab0c8'), dusk), transparent: true, opacity: 0.34, depthWrite: false });
    for (const base of smokeAt) for (let i = 0; i < 7; i++) {
      const mesh = s.mesh(new THREE.SphereGeometry(1, 10, 8), smokeMat, base);
      mesh.castShadow = mesh.receiveShadow = false;
      puffs.push({ mesh, base, offset: i / 7 + random() * 0.05 });
    }
    const drift = mix(0.2, 1.4, mood.energy);
    const rise = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.offset + time * 0.06 * mix(0.6, 1.6, mood.energy)) % 1;
        puff.mesh.position.set(puff.base[0] + t * t * 2.2 * drift + Math.sin(t * 9 + puff.offset * 20) * 0.2, puff.base[1] + t * 6.2, puff.base[2] + Math.cos(t * 7 + puff.offset * 9) * 0.25);
        puff.mesh.scale.setScalar(0.3 + t * 1.25);
      }
    };
    rise(0);
    let clock = 0;
    world.update = (dt, time) => {
      clock = time;
      rise(clock);
      const flicker = 1 + Math.sin(time * 9) * 0.06 * (0.4 + mood.energy);
      lampMat.emissiveIntensity = glow * flicker;
    };
    return world;
  },
});
