import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type G = CanvasRenderingContext2D;
type Brick = { at: readonly [number, number, number]; size: readonly [number, number, number]; color: THREE.ColorRepresentation; turn?: number };

const WALLS = { butter: '#f1e2a6', mint: '#bfdccb', rose: '#ecc4c8', sky: '#b9d2e8', lavender: '#cfc4e6', oat: '#e2d8c6' } as const;
const INKS = ['#e58a6f', '#6f9fd0', '#e9bd4e', '#7fb98a', '#b58bd0'];

function texture(w: number, h: number, draw: (g: G, w: number, h: number) => void) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

/** One 128 px cell of the frieze. */
function motif(g: G, kind: string, i: number, x: number) {
  const ink = INKS[i % INKS.length];
  g.save(); g.translate(x + 64, 64); g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = 5; g.lineCap = 'round';
  if (kind === 'ducks') {
    g.fillStyle = '#f0c648'; g.beginPath(); g.ellipse(-4, 12, 34, 22, 0, 0, 7); g.fill(); g.beginPath(); g.arc(24, -16, 17, 0, 7); g.fill();
    g.beginPath(); g.moveTo(-34, 6); g.lineTo(-50, -10); g.lineTo(-22, -2); g.fill();
    g.fillStyle = '#e8813a'; g.beginPath(); g.moveTo(38, -18); g.lineTo(56, -12); g.lineTo(38, -6); g.fill();
    g.fillStyle = '#3b3a40'; g.beginPath(); g.arc(28, -20, 3, 0, 7); g.fill();
    g.strokeStyle = '#7fa9cf'; g.beginPath(); g.moveTo(-60, 40); g.quadraticCurveTo(-30, 30, 0, 40); g.quadraticCurveTo(30, 50, 60, 40); g.stroke();
  } else if (kind === 'stars') {
    if (i % 3 === 2) { g.fillStyle = '#f1d27a'; g.beginPath(); g.arc(0, 0, 34, 0, 7); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(16, -8, 30, 0, 7); g.fill(); }
    else { g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 15 : 36, q = k * Math.PI / 5 - Math.PI / 2 + i; g.lineTo(Math.cos(q) * r, Math.sin(q) * r); } g.fill(); g.beginPath(); g.arc(44, -34, 5, 0, 7); g.arc(-46, 30, 4, 0, 7); g.fill(); }
  } else if (kind === 'balloons') {
    g.beginPath(); g.ellipse(0, -14, 26, 32, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(-6, 18); g.lineTo(6, 18); g.lineTo(0, 10); g.fill();
    g.strokeStyle = '#8a8478'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 18); g.quadraticCurveTo(12, 36, -4, 56); g.stroke();
  } else if (kind === 'alphabet') {
    g.font = 'bold 88px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i % 26], 0, 6);
  } else if (kind === 'boats') {
    g.fillStyle = '#b5553f'; g.beginPath(); g.moveTo(-40, 14); g.lineTo(40, 14); g.lineTo(26, 36); g.lineTo(-26, 36); g.fill();
    g.fillStyle = ink; g.beginPath(); g.moveTo(-2, 8); g.lineTo(-2, -44); g.lineTo(34, 8); g.fill(); g.fillStyle = '#f4efe2'; g.beginPath(); g.moveTo(-8, 8); g.lineTo(-8, -30); g.lineTo(-34, 8); g.fill();
    g.strokeStyle = '#7fa9cf'; g.beginPath(); g.moveTo(-60, 46); g.quadraticCurveTo(-30, 36, 0, 46); g.quadraticCurveTo(30, 56, 60, 46); g.stroke();
  } else {
    g.strokeStyle = '#8a8478'; g.lineWidth = 3; g.beginPath(); g.moveTo(-64, -40); g.quadraticCurveTo(0, -22, 64, -40); g.stroke();
    for (const dx of [-32, 32]) { g.fillStyle = INKS[(i * 2 + (dx > 0 ? 1 : 0)) % INKS.length]; g.beginPath(); g.moveTo(dx - 24, -34); g.lineTo(dx + 24, -34); g.lineTo(dx, 30); g.fill(); }
  }
  g.restore();
}

export default defineWorld({
  questions: {
    story: choice('Whose room is this, and when?', {
      expected: 'Expected: being made ready before the birth, paint tin and stepladder still out, the frieze half finished, shelves waiting.',
      lived: 'Lived-in: a baby sleeps here now; toys on the floor, laundry, a night light, the mess of care.',
      outgrown: 'Outgrown: the child is older; posters over the frieze, boxes of baby things packed against the wall.',
      unused: 'Never used: everything ready and untouched under dust sheets, a sagging balloon, nobody came home to it.',
    }),
    walls: choice('What colour are the walls?', {
      butter: 'Buttery pastel yellow.',
      mint: 'Soft mint green.',
      rose: 'Powdery rose pink.',
      sky: 'Pale sky blue.',
      lavender: 'Lavender.',
      oat: 'Neutral oatmeal cream.',
    }),
    frieze: choice('What runs along the frieze below the ceiling?', {
      ducks: 'A row of yellow ducks on a painted ripple.',
      stars: 'Stencilled stars and crescent moons.',
      balloons: 'Balloons on curling strings.',
      alphabet: 'The alphabet in fat coloured letters.',
      boats: 'Little sailing boats on waves.',
      bunting: 'Painted bunting flags.',
    }),
    window: choice('What is the window doing?', {
      line: 'Blackout curtain drawn, a single bright line of dawn leaking down one edge.',
      sealed: 'Blackout curtain sealed tight, only a hairline glow around it.',
      half: 'Curtain pulled half back on a grey early morning.',
      moon: 'Curtain open on deep night, a moon in the pane.',
    }),
    door: choice('How is the door to the hall?', {
      ajar: 'Ajar, a wedge of warm hall light across the floor.',
      wide: 'Wide open, the hall light flooding in.',
      closed: 'Closed, a thin line of light beneath it.',
    }),
    rug: choice('What rug is on the floor?', {
      round: 'A round cream wool rug with a coloured border.',
      stripes: 'A cheerful striped cotton rug.',
      star: 'A big star-shaped rug.',
      roads: 'A play mat printed with roads and fields.',
      fleece: 'A shaggy sheepskin.',
      none: 'No rug, bare boards.',
    }),
    shelf: choice('What is on the wall shelves?', {
      books: 'Board books faced out along picture ledges, a full low bookcase beneath.',
      toys: 'Soft toys and a few books, lined up to watch the room.',
      sparse: 'Nearly empty: a couple of books and a lot of bare shelf.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const Wd = 14, Dp = 11, Hh = 5.8;
    const { art: s, world } = diorama(context, {
      background: '#adacc8', floor: '#9c8a76', width: Wd, depth: Dp, maxHeight: 3.3, radius: 1.5, pitch: 30, yaw: 31,
      slots: [[0.5, -2.7], [4.4, -1.4, 0, 0.85], [-3.3, -1.3, 0, 0.8], [1.0, 2.2, 0.04, 0.5], [3.3, 3.1, 0.04, 0.45], [-1.1, 3.7, 0.04, 0.45]],
    });
    const root = s.root;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const bricks = (list: Brick[], material: THREE.Material = s.material('#ffffff')) => {
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, list.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      list.forEach((b, i) => { m.compose(new THREE.Vector3(...b.at), q.setFromAxisAngle(up, b.turn ?? 0), new THREE.Vector3(...b.size)); mesh.setMatrixAt(i, m); mesh.setColorAt(i, new THREE.Color(b.color)); });
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };
    const glow = (colour: THREE.ColorRepresentation, opacity: number) => new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
    const floorPatch = (points: readonly (readonly [number, number])[], material: THREE.Material, y = 0.03) => {
      const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
      mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; root.add(mesh);
      return mesh;
    };

    // ---- Half-light: dim the stock stage lights and cool them ----
    const dawn = a.window === 'moon' ? 0 : mix(0.5, 1, mood.daylight < 0.5 ? 1 - mood.daylight : mood.daylight * 0.6);
    root.traverse((node) => {
      const hemi = node as THREE.HemisphereLight;
      if (hemi.isHemisphereLight) { hemi.intensity = 0.8; hemi.color.set('#c9cbf2'); hemi.groundColor.set('#6a6478'); }
      const sun = node as THREE.DirectionalLight;
      if (sun.isDirectionalLight && sun !== world.keyLight) { sun.intensity = 0.25; sun.color.set('#c2c9f0'); }
    });
    if (world.keyLight) { world.keyLight.intensity = 1.05; world.keyLight.color.set(a.window === 'moon' ? '#c9d3ff' : '#e6dcf2'); }
    const hall = new THREE.Color().setHSL(mix(0.11, 0.07, mood.warmth), 0.95, mix(0.72, 0.62, mood.warmth));
    const doorOpen = { ajar: 0.55, wide: 1.4, closed: 0 }[a.door];
    const lamp = new THREE.PointLight(hall, doorOpen * 20 + 5, 15, 1.6);
    lamp.position.set(-6.2, 2.8, 2.3);
    root.add(lamp);

    // ---- Walls ----
    const faded = a.story === 'outgrown' || a.story === 'unused' ? 0.2 : 0;
    const wallTint = new THREE.Color(WALLS[a.walls]).lerp(new THREE.Color('#9d98b2'), 0.3 + faded + (1 - mood.cheer) * 0.15);
    const wall = s.material(wallTint, { roughness: 0.95 });
    const trim = s.material('#ece7dc', { roughness: 0.6 });
    const zb = -Dp / 2, xl = -Wd / 2;
    s.box([Wd + 0.22, Hh, 0.22], [-0.11, Hh / 2, zb - 0.11], wall);
    const dz0 = 1.3, dz1 = 3.3, dh = 4.4;
    s.box([0.22, Hh, dz0 - zb], [xl - 0.11, Hh / 2, (dz0 + zb) / 2], wall);
    s.box([0.22, Hh, Dp / 2 - dz1], [xl - 0.11, Hh / 2, (dz1 + Dp / 2) / 2], wall);
    s.box([0.22, Hh - dh, dz1 - dz0], [xl - 0.11, (Hh + dh) / 2, (dz0 + dz1) / 2], wall);
    // Skirting and a picture rail under the frieze.
    s.box([Wd, 0.32, 0.06], [0, 0.16, zb + 0.03], trim);
    s.box([0.06, 0.32, dz0 - zb], [xl + 0.03, 0.16, (dz0 + zb) / 2], trim);
    s.box([0.06, 0.32, Dp / 2 - dz1], [xl + 0.03, 0.16, (dz1 + Dp / 2) / 2], trim);
    const fy = 4.9, fh = 0.8;
    s.box([Wd, 0.07, 0.07], [0, fy - fh / 2 - 0.06, zb + 0.035], trim);
    s.box([0.07, 0.07, Dp], [xl + 0.035, fy - fh / 2 - 0.06, 0], trim);

    // ---- Frieze ----
    const cells = 8;
    const strip = texture(128 * cells, 128, (g, w, h) => {
      const base = wallTint.clone().lerp(new THREE.Color('#fbf7ec'), 0.6);
      g.fillStyle = `#${base.getHexString(THREE.SRGBColorSpace)}`; g.fillRect(0, 0, w, h);
      for (let i = 0; i < cells; i++) motif(g, a.frieze, i, i * 128);
      g.fillStyle = 'rgba(255,255,255,0.0)';
      if (faded || mood.wear > 0.5) { g.fillStyle = `rgba(200,196,200,${0.3 + mood.wear * 0.25})`; g.fillRect(0, 0, w, h); }
    });
    strip.wrapS = THREE.RepeatWrapping;
    const band = (length: number) => { const map = strip.clone(); map.needsUpdate = true; map.repeat.set(length / (fh * cells), 1); return new THREE.MeshStandardMaterial({ map, roughness: 0.95 }); };
    const done = a.story === 'expected' ? mix(0.35, 0.7, random()) : 1;
    const backBand = s.mesh(new THREE.PlaneGeometry(Wd * done, fh), band(Wd * done), [xl + Wd * done / 2, fy, zb + 0.012]);
    backBand.castShadow = false;
    const sideBand = s.mesh(new THREE.PlaneGeometry(Dp, fh), band(Dp), [xl + 0.012, fy, 0]);
    sideBand.rotation.y = Math.PI / 2; sideBand.castShadow = false;
    if (done < 1) {
      // Pencil guide lines and a strip of masking tape where the stencilling stopped.
      for (const dy of [-fh / 2, fh / 2]) s.box([Wd * (1 - done), 0.015, 0.01], [xl + Wd * done + Wd * (1 - done) / 2, fy + dy, zb + 0.01], s.material('#8d8a90'));
      s.box([0.12, fh + 0.2, 0.012], [xl + Wd * done + 0.06, fy, zb + 0.014], s.material('#e8d79a'));
    }

    // ---- Floorboards ----
    bricks(Array.from({ length: 13 }, (_, i) => ({ at: [0, 0.004, -Dp / 2 + (i + 0.5) * Dp / 13 + 0.4] as const, size: [Wd, 0.008, 0.03] as const, color: '#7d6c5a' })), s.material('#ffffff', { roughness: 0.9 }));

    // ---- Window and blackout curtain ----
    const wx = 0.5, sill = 2.05, ww = 3.1, wh = 2.45, wy = sill + wh / 2;
    const sky = a.window === 'moon' ? new THREE.Color('#2b3566') : a.window === 'half' ? new THREE.Color('#c9cfdb') : new THREE.Color().setHSL(mix(0.07, 0.11, mood.daylight), 0.9, 0.78);
    s.box([ww + 0.3, wh + 0.3, 0.1], [wx, wy, zb + 0.05], trim);
    const pane = s.mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshStandardMaterial({ color: sky, emissive: sky, emissiveIntensity: a.window === 'moon' ? 0.5 : 0.95, roughness: 0.2 }), [wx, wy, zb + 0.105]);
    pane.castShadow = false;
    s.box([0.07, wh, 0.05], [wx, wy, zb + 0.13], trim); s.box([ww, 0.07, 0.05], [wx, wy + 0.2, zb + 0.13], trim);
    s.box([ww + 0.5, 0.09, 0.3], [wx, sill - 0.16, zb + 0.15], trim);
    if (a.window === 'moon') {
      const moon = s.mesh(new THREE.CircleGeometry(0.36, 24), new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#fff1c0', emissiveIntensity: 1.3 }), [wx + 0.7, wy + 0.6, zb + 0.108]); moon.castShadow = false;
      bricks(Array.from({ length: 9 }, () => ({ at: [wx - ww / 2 + 0.2 + random() * (ww - 0.4), sill + 0.2 + random() * (wh - 0.4), zb + 0.108] as const, size: [0.05, 0.05, 0.004] as const, color: '#fff6d8', turn: 0 })), new THREE.MeshStandardMaterial({ emissive: '#fff1c0', emissiveIntensity: 1 }));
    }
    const pole = s.rod([wx - ww / 2 - 0.5, sill + wh + 0.32, zb + 0.3], [wx + ww / 2 + 0.5, sill + wh + 0.32, zb + 0.3], 0.045, s.material('#8a6f52'));
    pole.castShadow = true;
    for (const x of [-1, 1]) s.ball([0.09, 0.09, 0.09], [wx + x * (ww / 2 + 0.52), sill + wh + 0.32, zb + 0.3], s.material('#8a6f52'), 12);
    const curtainTint = new THREE.Color(pick(['#2f3554', '#3a3f4f', '#4a3d58', '#2f4a4f']));
    const cover = { line: 0.93, sealed: 1.03, half: 0.5, moon: 0.2 }[a.window];
    const cw = (ww + 0.5) * cover, cx0 = wx - ww / 2 - 0.25, ch = wh + 0.75, cyc = sill + wh + 0.28 - ch / 2;
    const folds = Math.max(4, Math.round(cw / 0.2));
    const curtain = bricks(Array.from({ length: folds }, (_, i) => ({
      at: [cx0 + (i + 0.5) * cw / folds, cyc, zb + 0.3 + (i % 2 ? 0.045 : 0)] as const,
      size: [cw / folds * 1.06, ch + (i % 2 ? 0 : 0.04), 0.06] as const,
      color: curtainTint.clone().multiplyScalar(i % 2 ? 1 : 0.8),
    })), s.material('#ffffff', { roughness: 1 }));
    // Light that gets past it: a hot edge beside the curtain and a slash across the floor.
    const leak = { line: 1, sealed: 0.3, half: 0.7, moon: 0.45 }[a.window] * dawn + (a.window === 'moon' ? 0.45 : 0);
    const dawnTint = a.window === 'moon' ? new THREE.Color('#cfd8ff') : a.window === 'half' ? new THREE.Color('#e9ecf5') : new THREE.Color().setHSL(mix(0.08, 0.12, mood.daylight), 1, 0.8);
    const edgeX = cx0 + cw, gap = Math.max(0.07, wx + ww / 2 - edgeX);
    const hot = new THREE.MeshStandardMaterial({ color: dawnTint, emissive: dawnTint, emissiveIntensity: 1.6 });
    if (a.window === 'line' || a.window === 'sealed') {
      s.mesh(new THREE.PlaneGeometry(a.window === 'line' ? 0.13 : 0.04, wh), hot, [wx + ww / 2 - (a.window === 'line' ? 0.065 : 0.02), wy, zb + 0.395]).castShadow = false;
      s.mesh(new THREE.PlaneGeometry(cw * 0.96, 0.035), hot, [cx0 + cw / 2, cyc - ch / 2 - 0.03, zb + 0.33]).castShadow = false;
    }
    const slashW = a.window === 'line' ? 0.3 : a.window === 'sealed' ? 0.1 : gap;
    const sx = wx + ww / 2 - slashW, skew = mix(-2.2, 2.2, mood.daylight);
    const slash = floorPatch([[sx, zb + 0.4], [sx + slashW, zb + 0.4], [sx + slashW * 1.6 + skew, zb + 6.4], [sx + skew - slashW * 0.2, zb + 6.4]], glow(dawnTint, 0.75 * leak));
    floorPatch([[sx - 0.25, zb + 0.4], [sx + slashW + 0.25, zb + 0.4], [sx + slashW * 1.6 + skew + 0.7, zb + 7.2], [sx + skew - 0.9, zb + 7.2]], glow(dawnTint, 0.22 * leak), 0.025);

    // ---- Doorway and hall light ----
    const hallGlow = new THREE.MeshStandardMaterial({ color: hall, emissive: hall, emissiveIntensity: 1.1 });
    const beyond = s.mesh(new THREE.PlaneGeometry(dz1 - dz0, dh), hallGlow, [xl - 0.8, dh / 2, (dz0 + dz1) / 2]);
    beyond.rotation.y = Math.PI / 2; beyond.castShadow = false;
    s.box([0.9, 0.2, dz1 - dz0], [xl - 0.45, -0.1, (dz0 + dz1) / 2], s.material('#c79a63'));
    for (const z of [dz0, dz1]) s.box([0.3, dh + 0.12, 0.12], [xl - 0.08, (dh + 0.12) / 2, z], trim);
    s.box([0.3, 0.14, dz1 - dz0 + 0.24], [xl - 0.08, dh + 0.07, (dz0 + dz1) / 2], trim);
    const leaf = new THREE.Group(); leaf.position.set(xl + 0.02, 0, dz0 + 0.06); leaf.rotation.y = doorOpen; root.add(leaf);
    const doorPaint = s.material('#efeae0', { roughness: 0.55 });
    const slab = s.box([0.09, dh - 0.06, dz1 - dz0 - 0.14], [0, (dh - 0.06) / 2 + 0.04, (dz1 - dz0 - 0.14) / 2], doorPaint); leaf.add(slab);
    for (const y of [1.3, 3.2]) leaf.add(s.box([0.11, 1.5, 1.2], [0, y, (dz1 - dz0 - 0.14) / 2], s.material('#e3ddd0', { roughness: 0.55 })));
    leaf.add(s.ball([0.08, 0.08, 0.08], [0.1, 2.1, dz1 - dz0 - 0.35], s.material('#b89b5a', { metalness: 0.6, roughness: 0.3 }), 12));
    if (a.door === 'closed') {
      s.mesh(new THREE.PlaneGeometry(dz1 - dz0 - 0.2, 0.05), hallGlow, [xl + 0.08, 0.035, (dz0 + dz1) / 2]).rotation.y = Math.PI / 2;
      floorPatch([[xl + 0.1, dz0 + 0.1], [xl + 0.1, dz1 - 0.1], [xl + 1.3, dz1 + 0.2], [xl + 1.3, dz0 - 0.2]], glow(hall, 0.3));
    } else {
      const zA = dz0 + (dz1 - dz0) * Math.cos(doorOpen) * (a.door === 'wide' ? 0 : 0.75), reach = a.door === 'wide' ? 7.5 : 5.6;
      floorPatch([[xl + 0.05, zA], [xl + 0.05, dz1], [xl + reach, dz1 + 2.1], [xl + reach, zA + (a.door === 'wide' ? -1.4 : 0.9)]], glow(hall, a.door === 'wide' ? 0.55 : 0.65));
      floorPatch([[xl + 0.05, zA - 0.3], [xl + 0.05, dz1 + 0.1], [xl + reach + 1.2, dz1 + 2.6], [xl + reach + 1.2, zA - (a.door === 'wide' ? 2.2 : -0.3)]], glow(hall, 0.2), 0.025);
    }
    if (a.story === 'outgrown') bricks(Array.from({ length: 6 }, (_, i) => ({ at: [xl + 0.07, 1.5 + i * 0.36 + random() * 0.1, dz0 - 0.1] as const, size: [0.02, 0.02, 0.22] as const, color: '#5a5560' })));

    // ---- Shelves of board books on the side wall ----
    const bookInks = ['#d9534a', '#3f7fc0', '#f0b838', '#4fa56e', '#8a62c0', '#ef8a4a', '#f3efe2', '#42b4b8'];
    const shelfWood = s.material('#eee9de', { roughness: 0.6 });
    const sz0 = -4.7, sz1 = 0.5;
    const stock = a.shelf === 'books' ? 1 : a.shelf === 'toys' ? 0.55 : 0.16;
    const emptied = a.story === 'expected' ? 0.5 : 1;
    const books: Brick[] = [];
    for (const y of [2.5, 3.55]) {
      s.box([0.34, 0.06, sz1 - sz0], [xl + 0.17, y, (sz0 + sz1) / 2], shelfWood);
      s.box([0.04, 0.16, sz1 - sz0], [xl + 0.33, y + 0.08, (sz0 + sz1) / 2], shelfWood);
      for (let z = sz0 + 0.35; z < sz1 - 0.3; z += 0.62 + random() * 0.12) {
        if (random() > stock * emptied + 0.05) continue;
        const h = 0.55 + random() * 0.22;
        books.push({ at: [xl + 0.2, y + 0.03 + h / 2, z], size: [0.06, h, 0.5 + random() * 0.08], color: pick(bookInks) });
      }
    }
    // Low bookcase beneath.
    s.box([0.8, 1.5, 3.4], [xl + 0.4, 0.75, -2.4], shelfWood);
    s.box([0.1, 1.3, 3.2], [xl + 0.78, 0.75, -2.4], s.material('#cfc8ba'));
    for (const y of [0.12, 0.8]) {
      let z = -3.95;
      while (z < -0.95) {
        const t = 0.07 + random() * 0.1, h = 0.4 + random() * 0.18;
        if (random() < stock * emptied + 0.08) books.push({ at: [xl + 0.62, y + h / 2 + 0.02, z + t / 2], size: [0.42, h, t], color: pick(bookInks) });
        z += t + 0.012 + (random() < 0.12 ? 0.2 : 0);
      }
    }
    if (books.length) bricks(books, s.material('#ffffff', { roughness: 0.7 }));
    s.box([0.84, 0.05, 3.44], [xl + 0.42, 1.52, -2.4], shelfWood);
    if (a.shelf === 'toys') {
      for (let i = 0; i < 4; i++) {
        const z = -3.7 + i * 0.85 + random() * 0.2, fur = s.material(pick(['#d9c3a0', '#c9a27c', '#e9e2d4', '#b9c4cf', '#e6b9bf']), { roughness: 1 });
        s.ball([0.2, 0.24, 0.2], [xl + 0.42, 1.78, z], fur, 12); s.ball([0.16, 0.15, 0.15], [xl + 0.44, 2.1, z], fur, 12);
        for (const side of [-1, 1]) s.ball([0.06, i % 2 ? 0.14 : 0.06, 0.05], [xl + 0.42, i % 2 ? 2.3 : 2.24, z + side * 0.11], fur, 8);
      }
    } else if (a.story !== 'expected') {
      // A lamp on the bookcase, off: the night is doing the lighting.
      s.cylinder(0.14, 0.18, 0.06, [xl + 0.42, 1.58, -1.3], s.material('#d9d2c2'), 16);
      s.cylinder(0.03, 0.03, 0.4, [xl + 0.42, 1.8, -1.3], s.material('#d9d2c2'), 8);
      s.cylinder(0.2, 0.3, 0.38, [xl + 0.42, 2.15, -1.3], s.material('#f1e6cc', { roughness: 0.9 }), 16);
    }

    // ---- Rug ----
    const rx = 1.2, rz = 2.7;
    const rugTint = pick(INKS);
    if (a.rug === 'round') {
      s.cylinder(2.6, 2.6, 0.04, [rx, 0.02, rz], s.material(rugTint, { roughness: 1 }), 48);
      s.cylinder(2.3, 2.3, 0.045, [rx, 0.0225, rz], s.material('#efe8d8', { roughness: 1 }), 48);
    } else if (a.rug === 'stripes' || a.rug === 'roads') {
      const map = texture(512, 384, (g, w, h) => {
        if (a.rug === 'stripes') { for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#f1eadb' : INKS[(i / 2) % INKS.length | 0]; g.fillRect(i * w / 12, 0, w / 12 + 1, h); } }
        else {
          g.fillStyle = '#9cc48f'; g.fillRect(0, 0, w, h);
          g.strokeStyle = '#6c6f78'; g.lineWidth = 42; g.lineJoin = 'round'; g.strokeRect(70, 60, w - 140, h - 120); g.beginPath(); g.moveTo(w / 2, 60); g.lineTo(w / 2, h - 60); g.stroke();
          g.strokeStyle = '#f4f0dc'; g.lineWidth = 4; g.setLineDash([16, 14]); g.strokeRect(70, 60, w - 140, h - 120); g.beginPath(); g.moveTo(w / 2, 60); g.lineTo(w / 2, h - 60); g.stroke();
          g.fillStyle = '#7fb3d9'; g.beginPath(); g.ellipse(160, h / 2, 46, 32, 0, 0, 7); g.fill();
          for (const [x, y, c] of [[350, 150, '#d9534a'], [380, 250, '#f0b838'], [140, 130, '#f3efe2']] as const) { g.fillStyle = c; g.fillRect(x, y, 40, 34); }
        }
      });
      const mat = new THREE.Mesh(new THREE.BoxGeometry(5, 0.04, 3.8), [wall, wall, new THREE.MeshStandardMaterial({ map, roughness: 1 }), wall, wall, wall]);
      mat.position.set(rx, 0.02, rz); mat.receiveShadow = true; root.add(mat);
      mat.rotation.y = (random() - 0.5) * 0.2;
    } else if (a.rug === 'star') {
      const star = new THREE.Shape(Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 1.45 : 2.9, q = i * Math.PI / 5 + 0.3; return new THREE.Vector2(Math.cos(q) * r, Math.sin(q) * r); }));
      const mesh = s.mesh(new THREE.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false }), s.material(rugTint, { roughness: 1 }), [rx, 0, rz]);
      mesh.rotation.x = -Math.PI / 2;
    } else if (a.rug === 'fleece') {
      const hide = new THREE.Shape(Array.from({ length: 48 }, (_, i) => { const q = i / 48 * Math.PI * 2, r = 1 + 0.1 * Math.cos(q * 4) + 0.05 * Math.sin(q * 11 + random()); return new THREE.Vector2(Math.cos(q) * r * 2.7, Math.sin(q) * r * 1.8); }));
      const mesh = s.mesh(new THREE.ExtrudeGeometry(hide, { depth: 0.07, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.04, bevelSegments: 2 }), s.material('#f1ecdf', { roughness: 1 }), [rx, 0, rz]);
      mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = 0.3;
    }

    // ---- What the room's story left lying about ----
    const card = s.material('#c39a66', { roughness: 0.95 });
    const boxStack = (x: number, z: number, n: number, text: string) => {
      let y = 0;
      for (let i = 0; i < n; i++) {
        const w = 1.3 - i * 0.15 + random() * 0.2, h = 0.75 + random() * 0.25, turn = (random() - 0.5) * 0.5;
        const b = s.box([w, h, w * 0.8], [x + (random() - 0.5) * 0.15, y + h / 2, z], card); b.rotation.y = turn;
        const tag = s.label(text, w * 0.7, 0.26, [0, 0, w * 0.4 + 0.006], '#3a2c1c', '#d8bd8c'); b.add(tag);
        b.add(s.box([w + 0.01, 0.01, 0.16], [0, h / 2, 0], s.material('#e3d2ae', { roughness: 0.4 })));
        y += h;
      }
    };
    const clutter = Math.round(mix(1, 5, mood.density));
    if (a.story === 'expected') {
      // Stepladder, paint tin, dust sheet, flat-packed furniture.
      const lx = 5.4, lz = -4.2, metal = s.material('#b9bec4', { metalness: 0.5, roughness: 0.4 });
      for (const side of [-1, 1]) { s.rod([lx + side * 0.45, 0, lz + 0.7], [lx + side * 0.35, 3.1, lz], 0.04, metal); s.rod([lx + side * 0.45, 0, lz - 0.6], [lx + side * 0.35, 3.1, lz], 0.035, metal); }
      for (let i = 1; i < 5; i++) s.box([0.82, 0.05, 0.22], [lx, i * 0.62, lz + 0.7 - i * 0.14], metal);
      s.box([0.8, 0.06, 0.4], [lx, 3.12, lz], metal);
      floorPatch([[2.7, -4.9], [4.6, -5.1], [4.9, -3.3], [3.0, -3.0]], s.material('#ece8dd', { roughness: 1, side: THREE.DoubleSide }), 0.012).receiveShadow = true;
      s.cylinder(0.3, 0.3, 0.55, [3.5, 0.29, -4.3], s.material('#d5d8dc', { metalness: 0.5, roughness: 0.35 }), 20);
      s.cylinder(0.27, 0.27, 0.02, [3.5, 0.57, -4.3], s.material(WALLS[a.walls], { roughness: 0.25 }), 20);
      s.box([0.1, 0.03, 0.7], [3.9, 0.6, -4.2], s.material('#a9794a')).rotation.y = 0.6;
      const flat = s.box([2.6, 1.6, 0.26], [-3.6, 0.8, -5.1], card); flat.rotation.x = -0.14;
      flat.add(s.label('COT BED', 1.6, 0.4, [0, 0.1, 0.135], '#3a2c1c', '#d8bd8c'));
      if (clutter > 2) boxStack(6.1, 0.2, 1 + (clutter > 3 ? 1 : 0), 'NURSERY');
    } else if (a.story === 'lived') {
      // Laundry basket, a nappy box, toys strewn off the rug, a night light.
      const bx = -3.6, bz = -4.6;
      s.lathe([[0, 0], [0.55, 0], [0.7, 1.1], [0.66, 1.1], [0.52, 0.06], [0, 0.06]], s.material('#c9b08a', { roughness: 1, side: THREE.DoubleSide }), [bx, 0, bz]);
      for (let i = 0; i < 2 + clutter; i++) s.ball([0.3 + random() * 0.2, 0.16, 0.26], [bx + (random() - 0.5) * 0.5, 1.0 + random() * 0.25, bz + (random() - 0.5) * 0.4], s.material(pick(['#f3efe6', '#f3c6cf', '#bcdcee', '#f6e6a8', '#c2e3c8']), { roughness: 1 }), 10).rotation.y = random() * 3;
      if (clutter > 2) { const sock = s.ball([0.34, 0.05, 0.22], [bx + 1.0, 0.05, bz + 0.7], s.material('#f3efe6', { roughness: 1 }), 10); sock.rotation.y = 0.7; }
      const toys: Brick[] = [];
      for (let i = 0; i < 3 + clutter * 2; i++) toys.push({ at: [5.0 + random() * 1.5, 0.11, -0.2 + random() * 5.2], size: [0.22, 0.22, 0.22], color: pick(bookInks), turn: random() * 3 });
      bricks(toys, s.material('#ffffff', { roughness: 0.6 }));
      s.ball([0.24, 0.24, 0.24], [5.3 + random(), 0.24, -2.8 - random()], s.material(pick(INKS), { roughness: 0.5 }), 16);
      boxStack(6.0, -4.5, 1 + (clutter > 3 ? 1 : 0), 'NAPPIES');
    } else if (a.story === 'outgrown') {
      boxStack(5.6, -4.4, 2 + (clutter > 2 ? 1 : 0), pick(['BABY THINGS', 'KEEP', 'ATTIC', '0-12 MONTHS']));
      boxStack(-3.4, -4.6, 1 + (clutter > 3 ? 1 : 0), pick(['TOYS', 'CLOTHES', 'CHARITY']));
      // Posters pinned over the baby wallpaper.
      const posters = [texture(128, 176, (g, w, h) => { g.fillStyle = '#1f2a55'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2efe4'; g.beginPath(); g.moveTo(64, 26); g.quadraticCurveTo(90, 70, 82, 124); g.lineTo(46, 124); g.quadraticCurveTo(38, 70, 64, 26); g.fill(); g.fillStyle = '#e05a3c'; g.beginPath(); g.moveTo(46, 124); g.lineTo(28, 146); g.lineTo(50, 136); g.moveTo(82, 124); g.lineTo(100, 146); g.lineTo(78, 136); g.fill(); g.fillStyle = '#f0c040'; for (let i = 0; i < 14; i++) g.fillRect(random() * w, random() * h, 3, 3); }),
        texture(128, 176, (g, w, h) => { g.fillStyle = '#e8c23c'; g.fillRect(0, 0, w, h); g.fillStyle = '#26262c'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.fillText('GO', 64, 70); g.fillText('TEAM', 64, 120); g.fillRect(14, 140, 100, 8); })];
      posters.forEach((map, i) => { const p = s.mesh(new THREE.PlaneGeometry(1.25, 1.7), new THREE.MeshStandardMaterial({ map, roughness: 0.8 }), [3.4 + i * 1.7, 3.2 + i * 0.3, zb + 0.014]); p.rotation.z = (random() - 0.5) * 0.12; p.castShadow = false; });
      s.ball([0.36, 0.36, 0.36], [6.1, 0.36, 1.2], s.material('#f1ece2', { roughness: 0.6 }), 16);
    } else {
      // Dust sheets over shapes nobody uncovered, and a balloon three weeks old.
      const sheet = s.material('#e9e6de', { roughness: 1 });
      for (const [x, z, w, h] of [[5.3, -4.3, 1.5, 2.0], [-3.5, -4.6, 1.2, 1.3], [6.0, 0.6, 1.0, 1.5]].slice(0, 1 + Math.min(2, clutter)) as [number, number, number, number][]) {
        s.box([w, h, w * 0.8], [x, h / 2, z], sheet);
        s.lathe([[0, h + 0.03], [w * 0.62, h + 0.03], [w * 0.74, h * 0.55], [w * 0.8, 0.02]], s.material('#e9e6de', { roughness: 1, side: THREE.DoubleSide }), [x, 0, z]).scale.set(1, 1, 0.85);
      }
      const bz = -3.6, bx = 3.2, by = mix(1.0, 2.6, mood.cheer);
      const balloon = s.ball([0.5, 0.58, 0.5], [bx, by, bz], s.material(pick(['#c9a8b4', '#a9b9cc', '#d6c79a']), { roughness: 0.35, metalness: 0.3 }), 18);
      balloon.scale.multiplyScalar(mix(0.85, 1, mood.cheer));
      s.tube([[bx, by - 0.5, bz], [bx + 0.15, by * 0.5, bz + 0.1], [bx - 0.1, 0.1, bz + 0.2], [bx + 0.3, 0.03, bz + 0.5]], 0.012, s.material('#f0ece2'));
      if (clutter > 2) boxStack(2.9, -4.7, 1, 'FRAGILE');
    }
    // A plug-in night light on the back wall: lit when a baby is here.
    const night = s.ball([0.14, 0.18, 0.08], [-1.9, 0.75, zb + 0.1], new THREE.MeshStandardMaterial({ color: '#fff2c9', emissive: '#ffd98a', emissiveIntensity: a.story === 'lived' ? 1.4 : 0.05, roughness: 0.4 }), 12);
    night.castShadow = false;
    if (a.story === 'lived') { const halo = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 10), glow('#ffd98a', 0.1)); halo.position.set(-1.9, 0.75, zb + 0.2); root.add(halo); }

    const sway = mix(0.002, 0.014, mood.energy), phase = random() * 6;
    const slashGlow = slash.material as THREE.MeshBasicMaterial, baseLeak = slashGlow.opacity;
    world.update = (_dt, time) => {
      curtain.position.x = Math.sin(time * 0.7 + phase) * sway;
      curtain.rotation.z = Math.sin(time * 0.5 + phase) * sway * 0.3;
      slashGlow.opacity = baseLeak * (0.9 + 0.1 * Math.sin(time * 0.7 + phase));
      hot.emissiveIntensity = 1.5 + 0.25 * Math.sin(time * 0.7 + phase);
    };
    return world;
  },
});
