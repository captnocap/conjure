import * as THREE from 'three';
import { NATURAL_FRAMING, type Placeable, choice, clamp01, defineWorld, diorama, mix, score, visibleBounds } from '@conjure/kit';

type P = [number, number, number];
type Ctx = CanvasRenderingContext2D;

const paint = (w: number, h: number, draw: (c: Ctx) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

/** The nave as metres: x across, z along the aisle, the chancel at -z. */
const W = 15, D = 13, EAST = -6.5, CHANCEL = -3.8, STEP = 0.32, PIER_X = 4.3, AISLE = 1.1;
const GLASS = ['#8e1a24', '#b4202a', '#1b3380', '#2a4aa8', '#c48f14', '#e2b43a', '#1f5a2e', '#3a7a3a', '#55227a', '#7a3a9a', '#e8e2c8', '#d9d2b8', '#b05a16'];

/** Lozenges of coloured window light, sheared as if thrown along the floor from the east. */
function lozenges(c: Ctx, toPx: (x: number, z: number) => [number, number], x0: number, x1: number, z0: number, z1: number, strength: number, shear: number, random: () => number) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const cell = 0.42;
  for (let z = z0; z < z1; z += cell * 0.9) for (let x = x0; x < x1; x += cell) {
    const fade = strength * (1 - Math.abs((x - (x0 + x1) / 2) / ((x1 - x0) / 2)) * 0.6) * (0.5 + 0.5 * (1 - (z - z0) / (z1 - z0)));
    if (fade <= 0.03) continue;
    c.fillStyle = GLASS[Math.floor(random() * GLASS.length)];
    c.globalAlpha = fade * (0.55 + random() * 0.35);
    const [cx, cz] = toPx(x + cell / 2 + (z - z0) * shear, z + cell * 0.45);
    const [hx] = toPx(x + cell, z);
    const halfW = (hx - toPx(x, z)[0]) / 2;
    const halfH = (toPx(x, z + cell * 0.9)[1] - toPx(x, z)[1]) / 2;
    c.beginPath();
    c.moveTo(cx, cz - halfH);
    c.lineTo(cx + halfW, cz);
    c.lineTo(cx, cz + halfH);
    c.lineTo(cx - halfW, cz);
    c.closePath();
    c.fill();
  }
  c.restore();
}

export default defineWorld({
  questions: {
    stone: choice('What era and colour is the stone?', {
      honey: 'Medieval honey-coloured limestone, worn soft at every edge.',
      grey: 'Crisp grey Victorian ashlar, cold and exact.',
      brick: 'Red-brick Gothic revival with pale stone dressings.',
      whitewash: 'Whitewashed plaster over old stone, bright and plain.',
      soot: 'Sandstone blackened by a century of city smoke.',
    }),
    season: choice('What season and light is it?', {
      summer: 'High summer, Sunday morning: hard sun through the east window, the floor spattered with colour.',
      autumn: 'Autumn afternoon: low gold light raking down the aisle, long lozenges on the flags.',
      winter: 'Winter evensong: almost dark, the window a dull blue, candles and the red sanctuary lamp doing the work.',
      spring: 'Spring: soft pale light, lilies and blossom on the sills, the stone washed clean.',
    }),
    pews: score('How full are the pews?', ['Empty, the service for nobody', 'A scattered few, all at the back', 'Half full', 'Packed to the walls']),
    service: choice('What is the service?', {
      sunday: 'An ordinary Sunday: hymn numbers on the board, a jug of flowers, nothing more.',
      funeral: 'A funeral: a coffin under a purple pall before the altar, tall candles at its head, lilies.',
      wedding: 'A wedding: white ribbons and flowers on every pew end, a red carpet down the aisle.',
      baptism: 'A baptism: the stone font uncovered at the front, a white cloth, a tall lit candle beside it.',
      carols: 'A carol service: a tall lit Christmas tree by the chancel arch, candles on the pew ends.',
    }),
    floor: choice('What is underfoot?', {
      flags: 'Grey flagstones, uneven and patched.',
      tiles: 'Victorian encaustic tiles in red, black and cream.',
      marble: 'A chequer of black and white marble down the aisle.',
      ledgers: 'Flagstones set with dark ledger stones, the names worn away.',
    }),
    window: choice('What is the great east window like?', {
      perpendicular: 'One huge window of mullions and transoms, a grid of coloured panels.',
      lancets: 'Three tall narrow lancets side by side.',
      rose: 'A great rose window of petals above a row of small lights.',
    }),
    hangings: choice('What hangs on the piers?', {
      nothing: 'Nothing: bare stone.',
      banners: 'Embroidered guild and parish banners on poles.',
      wreaths: 'Wreaths of greenery with red ribbon, one to each pier.',
      plaques: 'Brass memorial plaques and a faded regimental flag.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const winter = a.season === 'winter';
    const sun = { summer: 1, autumn: 0.75, winter: 0, spring: 0.55 }[a.season];
    const stone = {
      honey: { wall: '#d6c39b', pier: '#c9b48a', trim: '#b89c6a' },
      grey: { wall: '#b3b1a9', pier: '#a7a59d', trim: '#8e8c84' },
      brick: { wall: '#8e5243', pier: '#c8bca3', trim: '#b9ad94' },
      whitewash: { wall: '#ebe7dc', pier: '#dfdacd', trim: '#c9c3b4' },
      soot: { wall: '#625e57', pier: '#6c6861', trim: '#4f4b45' },
    }[a.stone];
    const background = new THREE.Color(winter ? '#8f8b84' : '#d6d1c6').lerp(new THREE.Color(stone.wall), 0.35).lerp(new THREE.Color('#ead9b8'), mood.warmth * 0.2);
    const { art: s, world } = diorama(context, {
      background: `#${background.getHexString()}`, floor: null, width: W, depth: D, pitch: 21, yaw: 12, maxHeight: 2.6, radius: 1.2, scale: [0.8, 1.35],
      slots: [[0, -2.9], [1.0, 0.5], [-1.0, 3.6], [-1.4, -4.9, STEP, 0.85], [1.4, -4.9, STEP, 0.85], [0.9, 5.4, 0, 0.9]],
    });
    const root = s.root;
    // Light: the diorama's sun stands in for the window; evensong turns it down and lets the candles glow.
    if (world.keyLight) world.keyLight.intensity *= winter ? 0.3 : mix(0.8, 1.15, sun);
    for (const light of root.children) if ((light as THREE.HemisphereLight).isHemisphereLight) (light as THREE.HemisphereLight).intensity *= winter ? 0.5 : 1;

    const wall = s.material(stone.wall, { roughness: 0.95 });
    const pier = s.material(stone.pier, { roughness: 0.9 });
    const trim = s.material(stone.trim, { roughness: 0.9 });
    const darkWood = s.material(pick(['#3a2614', '#4a3320', '#2e1f12']), { roughness: 0.5 });
    const brass = s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 });
    const white = s.material('#f1ece0', { roughness: 0.9 });
    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, places: { at: P; scale?: P; rotate?: P; color?: THREE.ColorRepresentation }[]) => {
      if (!places.length) return null;
      const mesh = new THREE.InstancedMesh(geometry, material, places.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      places.forEach((place, i) => {
        e.set(...(place.rotate ?? [0, 0, 0]));
        q.setFromEuler(e);
        m.compose(new THREE.Vector3(...place.at), q, new THREE.Vector3(...(place.scale ?? [1, 1, 1])));
        mesh.setMatrixAt(i, m);
        if (place.color !== undefined) mesh.setColorAt(i, new THREE.Color(place.color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };

    // ---- the floor: painted flags, tiles or marble, the worn path, the carpet, the window light
    const toPx = (x: number, z: number): [number, number] => [((x + W / 2) / W) * 1024, ((z - EAST) / D) * 1024];
    const floorMap = paint(1024, 1024, (c) => {
      const base = { flags: '#8f8c84', tiles: '#b58a62', marble: '#d9d4c8', ledgers: '#8a8780' }[a.floor];
      c.fillStyle = base;
      c.fillRect(0, 0, 1024, 1024);
      if (a.floor === 'flags' || a.floor === 'ledgers') {
        for (let z = EAST; z < D / 2; z += 0.85) for (let x = -W / 2 + ((Math.round((z - EAST) / 0.85) % 2) * 0.5); x < W / 2; x += 1.1) {
          const [px, pz] = toPx(x, z);
          const [qx, qz] = toPx(x + 1.1, z + 0.85);
          c.fillStyle = pick(['#8d8a82', '#999690', '#827f78', '#a29e94', '#8a8680']);
          c.fillRect(px + 2, pz + 2, qx - px - 4, qz - pz - 4);
        }
        if (a.floor === 'ledgers') for (let i = 0; i < 9; i++) {
          const x = -AISLE + random() * 2 * AISLE - 0.9, z = -2.4 + random() * 7;
          const [px, pz] = toPx(x, z);
          const [qx, qz] = toPx(x + 0.9, z + 1.9);
          c.fillStyle = '#4f4d4a';
          c.fillRect(px, pz, qx - px, qz - pz);
          c.fillStyle = 'rgba(200,195,185,0.35)';
          for (let line = 0; line < 4; line++) c.fillRect(px + 8, pz + 14 + line * 18, (qx - px) * (0.4 + random() * 0.4), 4);
        }
      } else if (a.floor === 'tiles') {
        for (let z = EAST; z < D / 2; z += 0.3) for (let x = -W / 2; x < W / 2; x += 0.3) {
          const [px, pz] = toPx(x, z);
          const [qx, qz] = toPx(x + 0.3, z + 0.3);
          const i = Math.round(x / 0.3) + Math.round((z - EAST) / 0.3);
          c.fillStyle = i % 4 === 0 ? '#1f1a18' : i % 2 ? '#c84a2a' : '#e8d9b8';
          c.fillRect(px + 1, pz + 1, qx - px - 2, qz - pz - 2);
        }
      } else {
        for (let z = EAST; z < D / 2; z += 0.5) for (let x = -W / 2; x < W / 2; x += 0.5) {
          const [px, pz] = toPx(x, z);
          const [qx, qz] = toPx(x + 0.5, z + 0.5);
          const i = Math.round(x / 0.5) + Math.round((z - EAST) / 0.5);
          c.fillStyle = Math.abs(x) < AISLE + 0.2 || z < CHANCEL ? (i % 2 ? '#1c1c1e' : '#e9e5da') : pick(['#c9c3b6', '#d2ccbf']);
          c.fillRect(px + 1, pz + 1, qx - px - 2, qz - pz - 2);
        }
      }
      // Dust, damp and the path worn pale down the middle of the aisle, by wear.
      const [ax0] = toPx(-AISLE, 0), [ax1] = toPx(AISLE, 0);
      const path = c.createLinearGradient(ax0, 0, ax1, 0);
      path.addColorStop(0, 'rgba(60,55,50,0)');
      path.addColorStop(0.5, `rgba(60,55,50,${0.1 + mood.wear * 0.3})`);
      path.addColorStop(1, 'rgba(60,55,50,0)');
      c.fillStyle = path;
      c.fillRect(ax0, 0, ax1 - ax0, 1024);
      for (let i = 0; i < Math.round(mood.wear * 30); i++) {
        c.fillStyle = `rgba(50,45,40,${0.1 + random() * 0.2})`;
        c.beginPath();
        c.ellipse(random() * 1024, random() * 1024, 10 + random() * 40, 6 + random() * 20, random() * 3, 0, Math.PI * 2);
        c.fill();
      }
      if (a.service === 'wedding') {
        const [cx0, cz0] = toPx(-0.8, -3.6), [cx1, cz1] = toPx(0.8, D / 2);
        c.fillStyle = '#9a1c26';
        c.fillRect(cx0, cz0, cx1 - cx0, cz1 - cz0);
        c.fillStyle = 'rgba(255,230,200,0.25)';
        c.fillRect(cx0 + 4, cz0, 3, cz1 - cz0);
        c.fillRect(cx1 - 7, cz0, 3, cz1 - cz0);
      }
      if (sun > 0) {
        const strength = sun * mix(0.55, 1, mood.cheer);
        lozenges(c, toPx, -1.9, 1.9, -3.75, 0.6, strength, a.season === 'autumn' ? 0.35 : 0.12, random);
        lozenges(c, toPx, -1.9, 1.9, -3.75, 0.6, strength * 0.7, a.season === 'autumn' ? 0.35 : 0.12, random);
      }
      else {
        // The candle pool before the altar at evensong.
        const [gx, gz] = toPx(0, -3.2);
        const glow = c.createRadialGradient(gx, gz, 10, gx, gz, 220);
        glow.addColorStop(0, 'rgba(255,190,110,0.5)');
        glow.addColorStop(1, 'rgba(255,190,110,0)');
        c.fillStyle = glow;
        c.fillRect(0, 0, 1024, 1024);
      }
    });
    const floor = s.mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.85 }), [0, 0, 0]);
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false;
    world.ground = floor;
    s.box([W, 0.3, D], [0, -0.16, 0], s.material('#7a766e')).castShadow = false;

    // ---- the chancel: two steps up, tiled floor, altar on its own step, rail, stalls
    const chancelDepth = EAST - CHANCEL;
    s.box([2 * PIER_X + 0.4, STEP, -chancelDepth + 0.2], [0, STEP / 2, (EAST + CHANCEL) / 2 - 0.1], trim);
    s.box([2 * PIER_X + 0.4, STEP / 2, 0.42], [0, STEP / 4, CHANCEL + 0.21], trim);
    const chancelMap = paint(512, 256, (c) => {
      for (let v = 0; v < 256; v += 16) for (let u = 0; u < 512; u += 16) {
        const i = u / 16 + v / 16;
        c.fillStyle = i % 4 === 0 ? '#1f1a18' : i % 2 ? '#b8452a' : '#e3d4b0';
        c.fillRect(u + 1, v + 1, 14, 14);
      }
      if (sun > 0) {
        c.save();
        c.globalCompositeOperation = 'screen';
        for (let i = 0; i < 40; i++) {
          c.fillStyle = GLASS[Math.floor(random() * GLASS.length)];
          c.globalAlpha = 0.35 * sun * mix(0.5, 1, mood.cheer);
          const cx = 256 + (random() - 0.5) * 220, cy = 60 + random() * 180;
          c.beginPath(); c.moveTo(cx, cy - 14); c.lineTo(cx + 11, cy); c.lineTo(cx, cy + 14); c.lineTo(cx - 11, cy); c.closePath(); c.fill();
        }
        c.restore();
      }
    });
    const chancelFloor = s.mesh(new THREE.PlaneGeometry(2 * PIER_X + 0.4, -chancelDepth), new THREE.MeshStandardMaterial({ map: chancelMap, roughness: 0.8 }), [0, STEP + 0.005, (EAST + CHANCEL) / 2]);
    chancelFloor.rotation.x = -Math.PI / 2;
    chancelFloor.castShadow = false;
    // Altar on a further step, with its frontal, cloth, cross and candles.
    const frontalColour = { sunday: '#2f6a3a', funeral: '#4a2a6a', wedding: '#efe8d2', baptism: '#efe8d2', carols: '#a31f2a' }[a.service];
    s.box([5, 0.16, 1.7], [0, STEP + 0.08, EAST + 0.95], trim);
    s.box([2.4, 1.0, 0.8], [0, STEP + 0.16 + 0.5, EAST + 0.75], s.material(frontalColour, { roughness: 0.9 }));
    s.box([2.5, 0.03, 0.9], [0, STEP + 1.17, EAST + 0.75], white);
    s.box([2.5, 0.25, 0.02], [0, STEP + 1.03, EAST + 1.16], white);
    s.box([0.05, 0.6, 0.05], [0, STEP + 1.5, EAST + 0.6], brass);
    s.box([0.32, 0.05, 0.05], [0, STEP + 1.62, EAST + 0.6], brass);
    const flames: THREE.Mesh[] = [];
    const flameMat = new THREE.MeshStandardMaterial({ color: '#fff1c0', emissive: new THREE.Color().setHSL(mix(0.13, 0.07, mood.warmth), 1, 0.6), emissiveIntensity: winter ? 2.6 : 1.4, transparent: true, opacity: 0.92, depthWrite: false });
    const candle = (x: number, y: number, z: number, height: number, radius = 0.025) => {
      s.cylinder(radius, radius * 1.1, height, [x, y + height / 2, z], s.material('#f3ead2', { roughness: 0.7 }), 10);
      const flame = s.ball([radius * 0.7, radius * 2, radius * 0.7], [x, y + height + radius * 1.6, z], flameMat, 8);
      flame.castShadow = false;
      flames.push(flame);
    };
    for (const x of [-0.8, 0.8]) {
      s.cylinder(0.06, 0.09, 0.04, [x, STEP + 1.2, EAST + 0.75], brass, 12);
      s.cylinder(0.02, 0.025, 0.32, [x, STEP + 1.38, EAST + 0.75], brass, 10);
      candle(x, STEP + 1.54, EAST + 0.75, 0.3);
    }
    // The altar rail with a gap in the middle, and choir stalls along the chancel sides.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) s.cylinder(0.025, 0.03, 0.75, [side * (0.7 + i * 0.75), STEP + 0.375, CHANCEL - 0.5], brass, 8);
      s.box([1.6, 0.05, 0.07], [side * 1.45, STEP + 0.77, CHANCEL - 0.5], darkWood);
      s.box([1.6, 0.1, 0.3], [side * 1.45, STEP + 0.05, CHANCEL - 0.2], s.material('#7a1f2a', { roughness: 1 }));
      const sx = side * 2.9, sz = (CHANCEL - 0.9 + EAST + 1.6) / 2;
      s.box([0.5, 0.45, 2.2], [sx, STEP + 0.225, sz], darkWood);
      s.box([0.1, 1.1, 2.2], [sx + side * 0.25, STEP + 0.55, sz], darkWood);
      s.box([0.5, 0.04, 2.2], [sx - side * 0.5, STEP + 0.85, sz], darkWood).rotation.z = side * 0.4;
      s.box([0.08, 0.85, 2.2], [sx - side * 0.7, STEP + 0.425, sz], darkWood);
      for (let i = 0; i < 4; i++) s.box([0.14, 0.03, 0.2], [sx - side * 0.5, STEP + 0.9, sz - 0.9 + i * 0.6], s.material(pick(['#8a1f24', '#1f2a5a']), { roughness: 0.7 })).rotation.z = side * 0.4;
    }
    // Lectern on the right of the chancel step, pulpit on the left of the nave before the arch.
    s.cylinder(0.3, 0.34, 0.08, [2.3, STEP + 0.04, CHANCEL - 0.3], brass, 12);
    s.cylinder(0.04, 0.05, 1.1, [2.3, STEP + 0.63, CHANCEL - 0.3], brass, 10);
    s.ball([0.12, 0.09, 0.16], [2.3, STEP + 1.22, CHANCEL - 0.3], brass, 10);
    s.box([0.5, 0.03, 0.38], [2.3, STEP + 1.32, CHANCEL - 0.3], darkWood).rotation.x = -0.5;
    const px = -2.3, pz = CHANCEL + 0.75;
    s.cylinder(0.22, 0.28, 1.2, [px, 0.6, pz], trim, 8);
    s.cylinder(0.58, 0.22, 0.35, [px, 1.35, pz], darkWood, 8);
    s.cylinder(0.6, 0.56, 0.9, [px, 1.95, pz], darkWood, 8);
    s.cylinder(0.65, 0.63, 0.06, [px, 2.42, pz], s.material('#6b4a2e', { roughness: 0.5 }), 8);
    s.box([0.85, 2.4, 0.06], [px, 2.6, pz - 0.6], darkWood);
    s.cylinder(0.85, 0.85, 0.08, [px, 3.85, pz - 0.1], darkWood, 6);
    s.cylinder(0.02, 0.08, 0.25, [px, 4.0, pz - 0.1], darkWood, 6);
    for (let i = 0; i < 4; i++) s.box([0.5, 0.3 + i * 0.3, 0.3], [px - 0.7, (0.3 + i * 0.3) / 2, pz - 0.9 + i * 0.32], darkWood);

    // ---- pews either side of the aisle, with kneelers and book ledges, and the congregation
    const pewRows = 8, pewPitch = 0.92, frontZ = -1.95, pewWidth = PIER_X - 0.45 - AISLE;
    const pewColour = pick(['#3f2a18', '#4a3320', '#2e1f12', '#5a3b22']);
    const pewWood = s.material(pewColour, { roughness: 0.5 });
    const seats: { at: P; scale?: P; rotate?: P }[] = [], backs: typeof seats = [], rails: typeof seats = [], ends: typeof seats = [], caps: typeof seats = [], kneelers: typeof seats = [], ledges: typeof seats = [];
    const pewCentres: { x: number; z: number; side: number }[] = [];
    for (let row = 0; row < pewRows; row++) for (const side of [-1, 1]) {
      const z = frontZ + row * pewPitch, cx = side * (AISLE + pewWidth / 2);
      pewCentres.push({ x: cx, z, side });
      seats.push({ at: [cx, 0.44, z] });
      backs.push({ at: [cx, 0.72, z + 0.22], rotate: [-0.14, 0, 0] });
      rails.push({ at: [cx, 0.97, z + 0.26], rotate: [-0.14, 0, 0] });
      for (const e of [-1, 1]) {
        ends.push({ at: [cx + e * pewWidth / 2, 0.49, z + 0.05] });
        caps.push({ at: [cx + e * pewWidth / 2, 0.98, z + 0.05], rotate: [0, 0, Math.PI / 2] });
      }
      kneelers.push({ at: [cx, 0.045, z - 0.45] });
      ledges.push({ at: [cx, 0.86, z + 0.33] });
    }
    instanced(new THREE.BoxGeometry(pewWidth, 0.045, 0.42), s.material(pick(['#6b4a2e', '#7a5a3a']), { roughness: 0.6 }), seats);
    instanced(new THREE.BoxGeometry(pewWidth, 0.5, 0.04), pewWood, backs);
    instanced(new THREE.BoxGeometry(pewWidth, 0.06, 0.09), pewWood, rails);
    instanced(new THREE.BoxGeometry(0.05, 0.98, 0.5), pewWood, ends);
    instanced(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 10), pewWood, caps);
    instanced(new THREE.BoxGeometry(pewWidth - 0.1, 0.07, 0.26), s.material(pick(['#7a1f2a', '#2a3a6a', '#3a5a3a']), { roughness: 0.95 }), kneelers);
    instanced(new THREE.BoxGeometry(pewWidth - 0.1, 0.03, 0.12), pewWood, ledges);
    // Hymn books in the ledges, service sheets on the seats, by density.
    const books: { at: P; rotate?: P; color?: string }[] = [], sheets: typeof books = [];
    for (const pew of pewCentres) {
      const count = Math.round(mood.density * 5 * random());
      for (let i = 0; i < count; i++) books.push({ at: [pew.x + (random() - 0.5) * (pewWidth - 0.4), 0.95, pew.z + 0.33], rotate: [-0.1, 0, 0], color: pick(['#8a1f24', '#1f2a5a', '#2a4a2a']) });
      if (random() < mood.density * 0.7) sheets.push({ at: [pew.x + (random() - 0.5) * (pewWidth - 0.4), 0.47, pew.z], rotate: [0, random() * 0.6, 0] });
    }
    instanced(new THREE.BoxGeometry(0.1, 0.14, 0.025), s.material('#ffffff', { roughness: 0.7 }), books);
    instanced(new THREE.BoxGeometry(0.15, 0.004, 0.21), white, sheets);
    // The congregation: seated bodies, laps, heads and hair, filling from the back.
    const bodies: { at: P; scale?: P; color?: string }[] = [], laps: typeof bodies = [], heads: typeof bodies = [], hairs: typeof bodies = [], hats: typeof bodies = [];
    const funeral = a.service === 'funeral';
    const coats = funeral ? ['#1c1c20', '#2a2a30', '#141416', '#3a3a40'] : ['#2a2a30', '#4a3f33', '#5a4a3a', '#1f2a3a', '#6b3a3a', '#3a5a4a', '#8a7a5a', '#b8905a', '#4a4a6a', '#9a3a4a'];
    const skins = ['#f1d2b6', '#e3c2a4', '#dfb48f', '#c58f62', '#a6714b', '#7a4f33'];
    const hairColours = ['#2a1e18', '#4a3222', '#8a5a2a', '#d8b86a', '#e2dfd8', '#9a948a', '#1a1512'];
    for (const pew of pewCentres) {
      const row = Math.round((pew.z - frontZ) / pewPitch);
      const chance = clamp01(a.pews * 1.1 * (0.6 + 0.6 * row / (pewRows - 1)) + Math.max(0, a.pews - 0.8) * 3);
      for (let seat = 0; seat < 6; seat++) {
        if (random() > chance) continue;
        const x = pew.x - pewWidth / 2 + 0.28 + seat * ((pewWidth - 0.5) / 5) + (random() - 0.5) * 0.06;
        const z = pew.z + 0.03;
        const tall = 0.52 + random() * 0.1;
        bodies.push({ at: [x, 0.45 + tall / 2, z], scale: [1, tall, 1], color: pick(coats) });
        laps.push({ at: [x, 0.52, z - 0.24], color: pick(coats) });
        heads.push({ at: [x, 0.45 + tall + 0.1, z - 0.02], color: pick(skins) });
        if (random() < 0.85) hairs.push({ at: [x, 0.45 + tall + 0.13, z - 0.02], scale: [1, random() < 0.4 ? 1.2 : 0.8, 1], color: pick(hairColours) });
        if ((a.service === 'wedding' || funeral) && random() < 0.25) hats.push({ at: [x, 0.45 + tall + 0.2, z - 0.02], color: funeral ? '#141416' : pick(['#f1ece0', '#d9a8b8', '#9ab8d8', '#e2c25a']) });
      }
    }
    instanced(new THREE.BoxGeometry(0.4, 1, 0.3), s.material('#ffffff', { roughness: 0.95 }), bodies);
    instanced(new THREE.BoxGeometry(0.36, 0.14, 0.34), s.material('#ffffff', { roughness: 0.95 }), laps);
    instanced(new THREE.SphereGeometry(0.1, 8, 6), s.material('#ffffff', { roughness: 0.6 }), heads);
    instanced(new THREE.SphereGeometry(0.105, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.55), s.material('#ffffff', { roughness: 0.9 }), hairs);
    instanced(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 12), s.material('#ffffff', { roughness: 0.8 }), hats);

    // ---- piers, arcade arches, chancel arch, clerestory and the outer aisle walls
    const bayZ = [CHANCEL + 0.2, CHANCEL + 4.2, CHANCEL + 8.2];
    const springY = 5.6;
    const cores: { at: P; scale?: P; rotate?: P }[] = [], shafts: typeof cores = [], bases: typeof cores = [], capitals: typeof cores = [];
    for (const side of [-1, 1]) for (const z of bayZ) {
      const x = side * PIER_X;
      cores.push({ at: [x, springY / 2, z] });
      bases.push({ at: [x, 0.2, z] });
      capitals.push({ at: [x, springY - 0.05, z] });
      for (const [dx, dz] of [[0.42, 0], [-0.42, 0], [0, 0.42], [0, -0.42]]) shafts.push({ at: [x + dx, springY / 2, z + dz] });
    }
    instanced(new THREE.CylinderGeometry(0.4, 0.42, springY, 12), pier, cores);
    instanced(new THREE.CylinderGeometry(0.13, 0.14, springY, 8), pier, shafts);
    instanced(new THREE.CylinderGeometry(0.64, 0.7, 0.4, 8), trim, bases);
    instanced(new THREE.CylinderGeometry(0.62, 0.44, 0.4, 8), trim, capitals);
    const arch = (from: P, to: P, tube: number, material: THREE.Material) => {
      // A pointed arch: two 60-degree arcs of radius span, each centred on the opposite springer, meeting at the apex.
      const span = Math.hypot(to[0] - from[0], to[2] - from[2]);
      const theta = Math.atan2(to[0] - from[0], to[2] - from[2]) - Math.PI / 2;
      const first = s.mesh(new THREE.TorusGeometry(span, tube, 6, 22, Math.PI / 3), material, from);
      first.rotation.set(0, theta, 0);
      const second = s.mesh(new THREE.TorusGeometry(span, tube, 6, 22, Math.PI / 3), material, to);
      second.rotation.set(0, theta, 2 * Math.PI / 3);
    };
    for (const side of [-1, 1]) for (let i = 0; i < bayZ.length - 1; i++) arch([side * PIER_X, springY, bayZ[i]], [side * PIER_X, springY, bayZ[i + 1]], 0.16, pier);
    arch([-PIER_X, springY, CHANCEL + 0.2], [PIER_X, springY, CHANCEL + 0.2], 0.22, pier);
    // Spandrel wall and clerestory above the arcade, with glowing lancets.
    const clerestoryMat = new THREE.MeshStandardMaterial({ color: '#dfe6f0', emissive: a.season === 'winter' ? '#5a6a9a' : '#e8e0c8', emissiveIntensity: winter ? 0.5 : mix(0.6, 1.2, sun) });
    const lancets: { at: P; scale?: P; rotate?: P }[] = [];
    for (const side of [-1, 1]) {
      s.box([0.4, 3.6, D + 2], [side * PIER_X, springY + 3.2 + 1.8, 0.5], wall);
      s.box([0.5, 0.25, D + 2], [side * PIER_X, springY + 3.3, 0.5], trim);
      for (const z of [CHANCEL + 2.2, CHANCEL + 6.2, CHANCEL + 9.4]) for (const dz of [-0.55, 0.55]) lancets.push({ at: [side * (PIER_X - 0.21), springY + 5.1, z + dz], rotate: [0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0] });
      // Side aisle: outer wall with windows, glimpsed between the piers.
      const ox = side * (W / 2 - 0.2);
      s.box([0.4, 6.5, D + 2], [ox, 3.25, 0.5], wall);
      for (const z of [CHANCEL + 2.2, CHANCEL + 6.2, CHANCEL + 9.4]) lancets.push({ at: [ox - side * 0.21, 3.4, z], scale: [1.6, 2.4, 1], rotate: [0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0] });
    }
    instanced(new THREE.PlaneGeometry(0.5, 1.6), clerestoryMat, lancets);
    // Transverse arches over the nave, rising out of the top of the frame.
    for (const z of bayZ) arch([-PIER_X + 0.3, springY + 3.5, z], [PIER_X - 0.3, springY + 3.5, z], 0.14, trim);

    // ---- the east wall and the great window
    const windowMap = paint(512, 768, (c) => {
      c.fillStyle = stone.wall;
      c.fillRect(0, 0, 512, 768);
      const lead = '#1a1a1c';
      const glassAt = (x: number, y: number, w: number, h: number) => {
        // Each pane is two or three leaded pieces of near colours, so the glass reads as glass and not as tiles.
        const hue = pick(GLASS);
        c.fillStyle = hue;
        c.fillRect(x, y, w, h);
        c.fillStyle = `rgba(255,255,255,${random() * 0.22})`;
        c.fillRect(x, y, w, h * (0.3 + random() * 0.4));
        c.fillStyle = `rgba(0,0,0,${random() * 0.28})`;
        c.fillRect(x + w * (0.4 + random() * 0.3), y, w * 0.3, h);
        c.strokeStyle = lead;
        c.lineWidth = 2;
        c.strokeRect(x, y, w, h);
        c.beginPath();
        c.moveTo(x, y + h * 0.5 + (random() - 0.5) * h * 0.4);
        c.lineTo(x + w, y + h * 0.5 + (random() - 0.5) * h * 0.4);
        c.stroke();
      };
      const pointed = (x: number, y: number, w: number, h: number, draw: () => void) => {
        // An equilateral pointed arch of width w with its apex at y: springers at y + 0.866 w.
        const ys = y + w * 0.866;
        c.save();
        c.beginPath();
        c.moveTo(x, y + h);
        c.lineTo(x, ys);
        c.arc(x + w, ys, w, Math.PI, Math.PI * 4 / 3, false);
        c.arc(x, ys, w, Math.PI * 5 / 3, Math.PI * 2, false);
        c.lineTo(x + w, y + h);
        c.closePath();
        c.clip();
        draw();
        c.restore();
      };
      if (a.window === 'lancets') {
        for (let i = 0; i < 3; i++) {
          const x = 40 + i * 150, w = 120, h = i === 1 ? 700 : 620, y = 768 - 30 - h;
          pointed(x, y, w, h, () => {
            for (let r = 0; r < 20; r++) for (let col = 0; col < 4; col++) glassAt(x + col * 30, y + r * 36, 30, 36);
            c.fillStyle = lead;
            c.fillRect(x + 58, y + 100, 5, h);
          });
        }
      } else if (a.window === 'rose') {
        const cx = 256, cy = 230, R = 190;
        c.fillStyle = lead;
        c.beginPath(); c.arc(cx, cy, R + 8, 0, Math.PI * 2); c.fill();
        for (let ring = 0; ring < 3; ring++) {
          const r0 = 40 + ring * 50, r1 = r0 + 46, n = 8 + ring * 4;
          for (let i = 0; i < n; i++) {
            const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2 - 0.03;
            c.fillStyle = pick(GLASS);
            c.beginPath(); c.arc(cx, cy, r1, a0, a1); c.arc(cx, cy, r0, a1, a0, true); c.closePath(); c.fill();
          }
        }
        c.fillStyle = '#e8e2c8'; c.beginPath(); c.arc(cx, cy, 34, 0, Math.PI * 2); c.fill();
        for (let i = 0; i < 5; i++) { const x = 36 + i * 90, w = 70, h = 260, y = 768 - 30 - h; pointed(x, y, w, h, () => { for (let r = 0; r < 6; r++) glassAt(x, y + r * 45, w, 45); }); }
      } else {
        const x = 36, w = 440, h = 720, y = 768 - 30 - h;
        pointed(x, y, w, h, () => {
          for (let r = 0; r < 18; r++) for (let col = 0; col < 8; col++) glassAt(x + col * 55, y + r * 40, 55, 40);
          c.fillStyle = lead;
          for (let col = 1; col < 8; col++) c.fillRect(x + col * 55 - 3, y, 6, h);
          for (let r = 2; r < 18; r += 4) c.fillRect(x, y + r * 40 - 3, w, 6);
        });
      }
    });
    s.box([2 * PIER_X + 0.4, 13, 0.4], [0, 6.5, EAST - 0.2], wall);
    const windowMat = new THREE.MeshStandardMaterial({ map: windowMap, emissiveMap: windowMap, emissive: '#ffffff', emissiveIntensity: winter ? 0.25 : mix(0.7, 1.6, sun) * mix(0.8, 1.1, mood.cheer), roughness: 0.9 });
    const windowW = 3.4, windowH = 5.1;
    s.mesh(new THREE.PlaneGeometry(windowW, windowH), windowMat, [0, STEP + 1.9 + windowH / 2, EAST + 0.01]).castShadow = false;
    s.box([windowW + 0.4, 0.2, 0.3], [0, STEP + 1.8, EAST + 0.1], trim);
    // Sanctuary lamp: red glass on chains from the chancel ceiling.
    const lampMat = new THREE.MeshStandardMaterial({ color: '#a01818', emissive: '#ff3a1a', emissiveIntensity: winter ? 2.2 : 0.8, transparent: true, opacity: 0.9, depthWrite: false });
    const lamp = new THREE.Group();
    lamp.position.set(1.3, 4.5, CHANCEL - 1.4);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.16, 10), lampMat);
    bowl.position.y = -1.3;
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.25, 4), brass);
    chain.position.y = -0.62;
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.04, 10), brass);
    holder.position.y = -1.22;
    bowl.castShadow = false;
    lamp.add(bowl, chain, holder);
    root.add(lamp);
    let altarLight: THREE.PointLight | null = null;
    if (winter) {
      altarLight = new THREE.PointLight(new THREE.Color().setHSL(0.08, 0.9, 0.6), 7, 12, 1.6);
      altarLight.position.set(0, STEP + 2.2, EAST + 1.2);
      root.add(altarLight);
    }

    // ---- hangings on the piers
    if (a.hangings === 'banners') {
      for (const side of [-1, 1]) for (const z of bayZ.slice(1)) {
        const colour = pick(['#8a1f24', '#1f2a5a', '#2f6a3a', '#6a2a8a', '#c9a23a']);
        s.rod([side * (PIER_X - 0.45), 4.1, z - 0.5], [side * (PIER_X - 0.45), 4.1, z + 0.5], 0.02, darkWood);
        s.box([0.03, 1.5, 0.9], [side * (PIER_X - 0.48), 3.3, z], s.material(colour, { roughness: 0.95 }));
        s.box([0.035, 0.6, 0.12], [side * (PIER_X - 0.5), 3.35, z], s.material('#e9d8a0', { roughness: 0.9 }));
        s.box([0.035, 0.12, 0.45], [side * (PIER_X - 0.5), 3.5, z], s.material('#e9d8a0', { roughness: 0.9 }));
      }
    } else if (a.hangings === 'wreaths') {
      for (const side of [-1, 1]) for (const z of bayZ) {
        const ring = s.ring(0.32, 0.09, [side * (PIER_X - 0.47), 3.2, z], s.material('#2f5a2a', { roughness: 1 }));
        ring.rotation.y = Math.PI / 2;
        s.box([0.03, 0.14, 0.22], [side * (PIER_X - 0.57), 3.55, z], s.material('#b0242a', { roughness: 0.7 }));
      }
    } else if (a.hangings === 'plaques') {
      for (const side of [-1, 1]) for (const z of bayZ) for (let i = 0; i < 2; i++) s.box([0.03, 0.3 + random() * 0.2, 0.4 + random() * 0.2], [side * (PIER_X - 0.46), 1.6 + i * 0.7, z + (random() - 0.5) * 0.3], brass);
      s.rod([-PIER_X + 0.3, 7.6, CHANCEL + 2], [-PIER_X + 0.3, 7.6, CHANCEL + 3.4], 0.03, darkWood);
      s.box([0.04, 2.0, 1.2], [-PIER_X + 0.33, 6.55, CHANCEL + 2.7], s.material('#8a7a5a', { roughness: 1 }));
    }

    // ---- the service: coffin, ribbons and carpet, font, tree, or the hymn board and flowers
    const hymnBoard = () => {
      s.box([0.04, 0.9, 0.6], [PIER_X - 0.46, 2.6, CHANCEL + 4.2], s.material('#1a1612', { roughness: 0.8 }));
      s.label(`${12 + Math.floor(random() * 500)}  ${12 + Math.floor(random() * 500)}  ${12 + Math.floor(random() * 500)}`, 0.5, 0.2, [PIER_X - 0.47, 2.55, CHANCEL + 4.2], '#f1ece0', '#1a1612').rotation.y = -Math.PI / 2;
      s.label('HYMNS', 0.4, 0.12, [PIER_X - 0.47, 2.9, CHANCEL + 4.2], '#f1ece0', '#1a1612').rotation.y = -Math.PI / 2;
    };
    const flowers = (x: number, y: number, z: number, count: number, palette: readonly string[], spread = 0.3) =>
      s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#ffffff', { roughness: 0.85 }), Array.from({ length: count }, () => ({ at: [x + (random() - 0.5) * spread, y + random() * spread * 0.5, z + (random() - 0.5) * spread * 0.7] as P, size: 0.04 + random() * 0.04, color: pick(palette) })));
    const pedestal = (x: number, z: number) => {
      s.cylinder(0.12, 0.16, 1.0, [x, 0.5, z], trim, 10);
      s.cylinder(0.2, 0.14, 0.2, [x, 1.1, z], s.material('#c9c3b4', { roughness: 0.6 }), 12);
      s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#3f6a3a', { roughness: 1 }), Array.from({ length: 6 }, () => ({ at: [x + (random() - 0.5) * 0.4, 1.2 + random() * 0.2, z + (random() - 0.5) * 0.3] as P, size: 0.08 })));
    };
    if (a.service === 'funeral') {
      const cz = CHANCEL - 1.0;
      for (const tx of [-0.55, 0.55]) s.box([0.08, 0.6, 0.6], [tx, STEP + 0.3, cz], darkWood);
      s.box([1.95, 0.5, 0.7], [0, STEP + 0.85, cz], s.material('#4a2a6a', { roughness: 0.95 }));
      s.box([1.85, 0.03, 0.75], [0, STEP + 1.1, cz], s.material('#4a2a6a', { roughness: 0.95 }));
      s.box([0.1, 0.02, 0.5], [0, STEP + 1.12, cz], s.material('#e9d8a0', { roughness: 0.9 }));
      s.box([0.4, 0.02, 0.1], [0.1, STEP + 1.12, cz], s.material('#e9d8a0', { roughness: 0.9 }));
      for (const side of [-1, 1]) { s.cylinder(0.02, 0.03, 1.3, [side * 1.4, STEP + 0.65, cz + 0.2], brass, 8); candle(side * 1.4, STEP + 1.3, cz + 0.2, 0.45, 0.03); }
      flowers(0, STEP + 1.15, cz + 0.2, 10, ['#f6f3ea', '#efe8d2'], 0.5);
      pedestal(-1.9, CHANCEL + 0.4); flowers(-1.9, 1.3, CHANCEL + 0.4, 9, ['#f6f3ea', '#efe8d2', '#e9d8a0']);
      pedestal(1.9, CHANCEL + 0.4); flowers(1.9, 1.3, CHANCEL + 0.4, 9, ['#f6f3ea', '#efe8d2', '#e9d8a0']);
    } else if (a.service === 'wedding') {
      const ribbons: { at: P; rotate?: P }[] = [], posies: { at: P; size: number; color?: string }[] = [];
      for (const pew of pewCentres) {
        const ex = pew.x - pew.side * (pewWidth / 2 + 0.03);
        ribbons.push({ at: [ex, 0.92, pew.z + 0.05], rotate: [0.3, 0, 0] }, { at: [ex, 0.92, pew.z + 0.05], rotate: [-0.3, 0, 0] });
        for (let i = 0; i < 5; i++) posies.push({ at: [ex - pew.side * 0.02 + (random() - 0.5) * 0.14, 1.0 + random() * 0.08, pew.z + 0.05 + (random() - 0.5) * 0.1], size: 0.04 + random() * 0.03, color: pick(['#f6f3ea', '#f2b7c6', '#e9d8a0']) });
      }
      instanced(new THREE.BoxGeometry(0.03, 0.22, 0.05), white, ribbons);
      s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#ffffff', { roughness: 0.85 }), posies);
      pedestal(-1.9, CHANCEL + 0.4); flowers(-1.9, 1.3, CHANCEL + 0.4, 12, ['#f6f3ea', '#f2b7c6', '#e9d8a0', '#d9a8b8']);
      pedestal(1.9, CHANCEL + 0.4); flowers(1.9, 1.3, CHANCEL + 0.4, 12, ['#f6f3ea', '#f2b7c6', '#e9d8a0', '#d9a8b8']);
    } else if (a.service === 'baptism') {
      const fx = 2.4, fz = CHANCEL + 0.9;
      s.cylinder(0.45, 0.5, 0.12, [fx, 0.06, fz], trim, 8);
      s.cylinder(0.18, 0.24, 0.6, [fx, 0.42, fz], trim, 8);
      s.cylinder(0.42, 0.36, 0.35, [fx, 0.9, fz], trim, 8);
      s.cylinder(0.3, 0.3, 0.02, [fx, 1.07, fz], new THREE.MeshStandardMaterial({ color: '#9fc0d0', roughness: 0.1, metalness: 0.2 }), 16);
      s.box([0.5, 0.01, 0.4], [fx + 0.35, 1.08, fz], white).rotation.z = -0.25;
      const lid = s.cylinder(0.44, 0.44, 0.06, [fx + 0.7, 0.44, fz + 0.1], darkWood, 8);
      lid.rotation.z = Math.PI / 2 - 0.2;
      s.cylinder(0.1, 0.12, 0.9, [fx - 0.7, 0.45, fz + 0.1], brass, 10);
      candle(fx - 0.7, 0.9, fz + 0.1, 0.8, 0.045);
      hymnBoard();
    } else if (a.service === 'carols') {
      const tx = 2.5, tz = CHANCEL + 0.8;
      s.box([0.9, 0.12, 0.9], [tx, 0.06, tz], s.material('#8a1f24', { roughness: 0.9 }));
      s.cylinder(0.06, 0.09, 0.6, [tx, 0.4, tz], s.material('#4a2c18', { roughness: 0.9 }), 8);
      const green = s.material('#1f4a2a', { roughness: 1 });
      for (let i = 0; i < 5; i++) s.cylinder(0.01, 1.2 - i * 0.2, 0.9, [tx, 0.9 + i * 0.6, tz], green, 10);
      s.ball([0.14, 0.14, 0.14], [tx, 4.05, tz], new THREE.MeshStandardMaterial({ color: '#ffe08a', emissive: '#ffd040', emissiveIntensity: 1.8 }), 8);
      const lights: { at: P; size: number; color?: string }[] = [];
      for (let i = 0; i < 70; i++) {
        const y = 0.8 + random() * 3.0, r = (1.25 - (y - 0.8) / 3.0 * 1.1) * 0.95, angle = random() * Math.PI * 2;
        lights.push({ at: [tx + Math.cos(angle) * r, y, tz + Math.sin(angle) * r], size: 0.035 + random() * 0.02, color: pick(['#ffd040', '#ff4a3a', '#3a8aff', '#ffffff', '#4aff8a']) });
      }
      s.scatter(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1.2 }), lights);
      const holders: { at: P }[] = [], sticks: { at: P }[] = [], pewFlames: { at: P }[] = [];
      for (const pew of pewCentres) {
        const ex = pew.x - pew.side * (pewWidth / 2);
        holders.push({ at: [ex, 1.04, pew.z + 0.05] });
        sticks.push({ at: [ex, 1.19, pew.z + 0.05] });
        pewFlames.push({ at: [ex, 1.33, pew.z + 0.05] });
      }
      instanced(new THREE.BoxGeometry(0.08, 0.08, 0.08), brass, holders);
      instanced(new THREE.CylinderGeometry(0.018, 0.02, 0.22, 8), s.material('#f3ead2', { roughness: 0.7 }), sticks);
      const pewFlameMesh = instanced(new THREE.SphereGeometry(1, 6, 5), flameMat, pewFlames.map((f) => ({ ...f, scale: [0.013, 0.036, 0.013] as P })));
      if (pewFlameMesh) pewFlameMesh.castShadow = false;
    } else {
      hymnBoard();
      s.lathe([[0.03, 0], [0.08, 0.01], [0.1, 0.1], [0.06, 0.2], [0.07, 0.26], [0.0, 0.26]], s.material('#9ab8c8', { roughness: 0.3 }), [-1.9, STEP + 0.16 + 0.3, CHANCEL - 0.2]);
      s.box([0.5, 0.3, 0.5], [-1.9, STEP + 0.15, CHANCEL - 0.2], trim);
      flowers(-1.9, STEP + 0.7, CHANCEL - 0.2, 8, ['#f2c94c', '#f6f3ea', '#e85a3a', '#8a5aa8']);
    }
    if (a.season === 'spring' && a.service !== 'funeral') for (const side of [-1, 1]) for (const z of bayZ) flowers(side * (W / 2 - 0.75), 1.2, z + 1.8, 7, ['#f6f3ea', '#f2b7c6', '#e9d8a0'], 0.5);

    // ---- the frame: fit the camera to the lower reaches of the nave and the cast; the vault runs off the top as it does for anyone standing in it.
    const camera = world.camera as THREE.OrthographicCamera;
    const framing = context.framing ?? NATURAL_FRAMING;
    const yaw = (12 + framing.turn * 22) * Math.PI / 180;
    const pitch = Math.min(68, Math.max(12, 21 + (framing.elevation - 0.5) * 44)) * Math.PI / 180;
    const closeness = framing.distance < 0.5 ? 0.62 + framing.distance * 2 * 0.38 : 1 + (framing.distance - 0.5) * 2 * 0.55;
    const tilt = ((context.seed & 1 ? 1 : -1) * framing.tilt * 7) * Math.PI / 180;
    const place = world.place;
    world.place = (items: readonly Placeable[]) => {
      place(items);
      const boxes = [new THREE.Box3(new THREE.Vector3(-PIER_X + 0.1, 0, EAST), new THREE.Vector3(PIER_X - 0.1, 6.4, 4.6))];
      for (const item of items) boxes.push(visibleBounds(item.holder));
      const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3());
      const centre = bounds.getCenter(new THREE.Vector3());
      const direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      camera.position.copy(centre).addScaledVector(direction, 80);
      camera.rotation.set(0, 0, 0);
      camera.lookAt(centre);
      camera.updateMatrixWorld(true);
      const projection = new THREE.Box2();
      const corner = new THREE.Vector3();
      for (const box of boxes)
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
          corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
          projection.expandByPoint(new THREE.Vector2(corner.x, corner.y));
        }
      const middle = projection.getCenter(new THREE.Vector2());
      const size = projection.getSize(new THREE.Vector2());
      const extent = Math.max(size.x, size.y) * 0.5 * closeness;
      const anchor = framing.anchor === 'left' ? extent * 0.22 : framing.anchor === 'right' ? -extent * 0.22 : 0;
      camera.translateX(middle.x + anchor);
      camera.translateY(middle.y);
      if (tilt) camera.rotateZ(tilt);
      camera.left = camera.bottom = -extent;
      camera.right = camera.top = extent;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    };

    const flicker = mix(0.04, 0.25, mood.energy);
    const sway = mix(0.004, 0.03, mood.energy);
    world.update = (_dt, time) => {
      flames.forEach((flame, i) => { flame.scale.y = flame.scale.y * 0.8 + (flame.scale.x * 2.8 * (1 + Math.sin(time * 14 + i * 1.7) * flicker + Math.sin(time * 5.3 + i) * flicker * 0.5)) * 0.2; });
      lamp.rotation.z = Math.sin(time * 0.9) * sway;
      lamp.rotation.x = Math.cos(time * 0.7) * sway * 0.6;
      if (altarLight) altarLight.intensity = 7 * (1 + Math.sin(time * 11) * flicker * 0.3);
    };
    return world;
  },
});
