import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { type Placeable, choice, defineWorld, diorama, mix, noul } from '@conjure/kit';
import { marble } from './marble';

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

/** A hex colour lightened or darkened by a factor, as a canvas style. */
const shade = (hex: string, f: number, alpha = 1) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgba(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)},${alpha})`;
};

/** A hex colour lightened or darkened by a factor, as a hex string for materials. */
const tint = (hex: string, f: number) => `#${new THREE.Color(hex).multiplyScalar(f).getHexString()}`;

const M = (at: P, scale: P = [1, 1, 1], rot: P = [0, 0, 0]) =>
  new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));

// ---- the plan, in metres: x across, z toward the camera, the prayer hall at -z
const SIDE_X = 4.2; // inner column lines of the two side arcades
const OUTER_X = 7.2; // the outer pier closing the portico's east bay
const WALL_X = -7.0; // inner face of the west wall
const BACK_Z = -3.6; // column line of the prayer-hall portico
const HALL_Z = -6.4; // face of the prayer hall
const END_Z = 5.1; // where the side arcades stop at the cut
const FLOOR = 0.15, SPRING = 3.0, ROOF = 4.45, ROOF_TOP = 4.7, CENTRAL_TOP = 5.35;
const FZ = -0.3; // centre of the fountain
const GX0 = -9.0, GX1 = 10.2, GZ0 = -13.4, GZ1 = 5.6;
const PX = 1024 / (GX1 - GX0);
const PH = Math.round((GZ1 - GZ0) * PX);
const toPx = (x: number, z: number): [number, number] => [(x - GX0) * PX, (z - GZ0) * PX];

interface Arch { points: THREE.Vector2[]; segments: { mid: THREE.Vector2; radial: THREE.Vector2; length: number }[]; apex: number }
/** A two-centred pointed arch from (a, spring) to (b, spring); each arc's radius is rFrac of the span. */
function pointedArch(a: number, b: number, spring: number, rFrac: number, n = 7): Arch {
  const span = b - a, r = rFrac * span, mid = (a + b) / 2;
  const cl = a + r, cr = b - r;
  const phiL = Math.acos((mid - cl) / r), phiR = Math.acos((mid - cr) / r);
  const points: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const phi = Math.PI + (phiL - Math.PI) * (i / n);
    points.push(new THREE.Vector2(cl + r * Math.cos(phi), spring + r * Math.sin(phi)));
  }
  for (let i = 1; i <= n; i++) {
    const phi = phiR * (1 - i / n);
    points.push(new THREE.Vector2(cr + r * Math.cos(phi), spring + r * Math.sin(phi)));
  }
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const mid2 = points[i].clone().add(points[i + 1]).multiplyScalar(0.5);
    const centre = new THREE.Vector2(i < n ? cl : cr, spring);
    segments.push({ mid: mid2, radial: mid2.clone().sub(centre).normalize(), length: points[i].distanceTo(points[i + 1]) });
  }
  return { points, segments, apex: spring + Math.sqrt(r * r - (span / 2 - r) ** 2) };
}

/** The wall carried by an arcade: its lower edge scalloped by the arches, its top stepped by `tops`. */
function spandrel(u0: number, u1: number, arches: Arch[], tops: [number, number, number][], depth = 0.5) {
  const shape = new THREE.Shape();
  shape.moveTo(u0, SPRING);
  for (const arch of arches) for (const p of arch.points) shape.lineTo(p.x, p.y);
  shape.lineTo(u1, SPRING);
  for (let i = tops.length - 1; i >= 0; i--) {
    const [from, to, y] = tops[i];
    shape.lineTo(to, y);
    shape.lineTo(from, y);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
}

const STONES = {
  marble: { wall: '#e4dfd4', trim: '#cbc5b8', column: '#9a9d9f', paving: '#e2ddd3', joint: '#a8a399', vA: '#ddd8cd', vB: '#b8b2a6', veins: true },
  limestone: { wall: '#dcc8a0', trim: '#c4ad82', column: '#9c9fa0', paving: '#e0d2b4', joint: '#a8987a', vA: '#e3d1aa', vB: '#c2aa7e', veins: false },
  ablaq: { wall: '#e6dcc6', trim: '#d6cbb4', column: '#7f8486', paving: '#dcd6ca', joint: '#9e978a', vA: '#efe7d6', vB: '#a8483a', veins: true },
  granite: { wall: '#bdbcb5', trim: '#9e9d97', column: '#85898c', paving: '#b3b2ab', joint: '#7f7e78', vA: '#c4c3bc', vB: '#9a9993', veins: false },
} as const;

export default defineWorld({
  questions: {
    moment: choice('What is happening in the courtyard right now?', {
      quiet: 'Still an hour early: the taps dry, the great doors shut, the shoe racks nearly empty, the pigeons have the stones to themselves.',
      washing: 'Men washing for prayer: several taps running into the channel, wet footprints drying on the marble toward the portico.',
      adhan: 'The call to prayer sounding from the minaret loudspeakers: the doors thrown open, a few taps running, pigeons lifting off the paving.',
      arriving: 'Minutes before the sermon: every tap running, the racks overflowing with shoes, prayer rugs laid out in rows under the arcades for the overflow.',
    }),
    stone: choice('What is the courtyard built of?', {
      marble: 'White marble paving and walls, grey veined marble columns: cool, bright and polished by feet.',
      limestone: 'Honey limestone walls with grey marble columns, warm as bread in the low sun.',
      ablaq: 'Cream stone with arches striped in alternating red and white voussoirs.',
      granite: 'Plain grey granite and ashlar, sober and northern.',
    }),
    fountain: choice('What is the ablution fountain like?', {
      canopy: 'An octagonal marble drum of taps under a broad lead dome on eight slim columns with deep painted eaves.',
      kiosk: 'A closed marble kiosk with bronze grilles above the taps and a small lead dome on top.',
      basin: 'An open octagonal basin with a stone bowl brimming at its heart, the taps round its sides, no roof.',
    }),
    domes: choice('What covers the domes?', {
      lead: 'Dull blue-grey lead sheeting with gilt crescent finials.',
      copper: 'Copper gone verdigris green.',
      white: 'Small whitewashed domes, plain and bright.',
    }),
    green: choice('What grows over the walls?', {
      cypress: 'A single tall cypress standing dark over the west wall.',
      cypresses: 'A row of three cypresses behind the west arcade, like dark candles.',
      plane: 'A huge old plane tree leaning over the wall, its crown hanging above the domes.',
      none: 'Nothing green: only stone, lead and sky.',
    }),
    portal: choice('What hangs on the portico wall beside the great doors?', {
      clocks: 'A wooden board of six clock faces showing the prayer times.',
      tiles: 'Panels of blue and turquoise tiles with red tulips framing the doors.',
      notices: 'A cork noticeboard of pinned papers and a green donation box.',
      bare: 'Nothing: plain stone.',
    }),
    feeding: noul('Has someone scattered grain, drawing a crowd of pigeons into one patch of the courtyard?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const stone = STONES[a.stone];
    const sky = new THREE.Color('#e3e4df').lerp(new THREE.Color('#f0e0c2'), mood.warmth * 0.55).lerp(new THREE.Color('#c9ced3'), (1 - mood.cheer) * 0.3);
    const slots: [number, number, number?, number?][] = [[0.4, 3.0], [-2.9, 1.2], [3.0, -1.3], [-2.4, -4.7, FLOOR, 0.9], [3.1, 3.9], [-3.1, 4.1]];
    const { art: s, world } = diorama(context, {
      background: `#${sky.getHexString()}`, floor: null, pitch: 30, yaw: 30, maxHeight: 1.9, radius: 0.9, scale: [0.8, 1.35],
      viewBox: [[-6, 0, -5], [6, 6, 5]], slots,
    });
    const root = s.root;
    // Less sky fill and a stronger sun, so the arcades throw long shadows across the paving.
    for (const light of root.children) if ((light as THREE.HemisphereLight).isHemisphereLight) (light as THREE.HemisphereLight).intensity *= 0.72;
    if (world.keyLight) world.keyLight.intensity *= 1.18;
    const running = { quiet: 0, washing: 0.45, adhan: 0.3, arriving: 0.9 }[a.moment];
    const open = a.moment !== 'quiet';

    // ---- materials
    const ashlar = paint(256, 256, (c) => {
      c.fillStyle = shade(stone.wall, 0.86);
      c.fillRect(0, 0, 256, 256);
      for (let row = 0; row < 5; row++) {
        let x = -random() * 60;
        while (x < 256) {
          const w = 70 + random() * 60;
          c.fillStyle = shade(stone.wall, 0.95 + random() * 0.09);
          c.fillRect(x + 1.5, row * 51.2 + 1.5, w - 3, 48);
          x += w;
        }
      }
    });
    ashlar.wrapS = ashlar.wrapT = THREE.RepeatWrapping;
    const ashlarFor = (w: number, h: number) => {
      const t = ashlar.clone();
      t.repeat.set(w / 2, h / 2);
      t.needsUpdate = true;
      return s.material('#ffffff', { map: t, roughness: 0.9 });
    };
    const wallFlat = s.material(stone.wall, { roughness: 0.9 });
    const trim = s.material(stone.trim, { roughness: 0.8 });
    const column = s.material(stone.column, { roughness: 0.35 });
    const domeTone = { lead: '#7f8791', copper: '#6e9d88', white: '#ebe7de' }[a.domes];
    const lead = s.material(domeTone, { roughness: a.domes === 'white' ? 0.9 : 0.55, metalness: a.domes === 'white' ? 0 : 0.3 });
    const gold = s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 });
    const brass = s.material('#b8913a', { metalness: 0.75, roughness: 0.35 });
    const wood = s.material(pick(['#5a3a22', '#6b4a2e', '#4a3020']), { roughness: 0.6 });
    const gallery = (w: number, d: number) => {
      const t = marble(random, stone.paving, shade(stone.paving, 0.92));
      t.repeat.set(w / 1.6, d / 1.6);
      return s.material('#ffffff', { map: t, roughness: 0.55 });
    };
    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], items: { m: THREE.Matrix4; color?: THREE.ColorRepresentation }[]) => {
      if (!items.length) return null;
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      items.forEach((item, i) => {
        mesh.setMatrixAt(i, item.m);
        if (item.color !== undefined) mesh.setColorAt(i, new THREE.Color(item.color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };

    // ---- the paving: slabs, the ring round the fountain, the garden strip, wet feet, stains, grain
    const footprints = (from: [number, number], to: [number, number], c: Ctx) => {
      const dx = to[0] - from[0], dz = to[1] - from[1], len = Math.hypot(dx, dz);
      const ux = dx / len, uz = dz / len;
      for (let d = 0, i = 0; d < len; d += 0.34, i++) {
        const side = i % 2 ? 1 : -1;
        const fade = 0.32 * (1 - d / len) + 0.05;
        const [px, py] = toPx(from[0] + ux * d - uz * side * 0.09, from[1] + uz * d + ux * side * 0.09);
        c.fillStyle = `rgba(60,62,66,${fade})`;
        c.beginPath();
        c.ellipse(px, py, 0.05 * PX, 0.12 * PX, Math.atan2(ux, -uz), 0, Math.PI * 2);
        c.fill();
      }
    };
    const paving = paint(1024, PH, (c) => {
      c.fillStyle = stone.joint;
      c.fillRect(0, 0, 1024, PH);
      for (let z = GZ0; z < GZ1; z += 0.8) {
        let x = GX0 - random() * 0.8;
        while (x < GX1) {
          const len = 0.8 + random() * 0.6;
          const [x0, y0] = toPx(x, z), [x1, y1] = toPx(x + len, z + 0.8);
          c.fillStyle = shade(stone.paving, 0.94 + random() * 0.1);
          c.fillRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2);
          x += len;
        }
      }
      if (stone.veins) {
        c.strokeStyle = 'rgba(110,106,100,0.22)';
        for (let v = 0; v < 60; v++) {
          c.lineWidth = 0.6 + random();
          c.beginPath();
          let x = random() * 1024, y = random() * PH;
          c.moveTo(x, y);
          for (let k = 0; k < 6; k++) c.lineTo((x += (random() - 0.5) * 30), (y += (random() - 0.3) * 20));
          c.stroke();
        }
      }
      // A ring of radial slabs round the fountain, banded in the darker stone.
      const [fx, fy] = toPx(0, FZ);
      for (let k = 0; k < 32; k++) {
        const a0 = (k / 32) * Math.PI * 2, a1 = ((k + 1) / 32) * Math.PI * 2;
        c.fillStyle = k % 2 ? shade(stone.paving, 0.9) : shade(stone.vB, 1.05);
        c.beginPath();
        c.arc(fx, fy, 3.2 * PX, a0, a1);
        c.arc(fx, fy, 2.6 * PX, a1, a0, true);
        c.closePath();
        c.fill();
      }
      c.strokeStyle = stone.joint;
      c.lineWidth = 2;
      for (const r of [2.6, 3.2]) {
        c.beginPath();
        c.arc(fx, fy, r * PX, 0, Math.PI * 2);
        c.stroke();
      }
      // Earth and grass beyond the west wall, where the trees stand.
      const [gx] = toPx(-7.5, 0);
      c.fillStyle = '#7f7356';
      c.fillRect(0, 0, gx, PH);
      for (let i = 0; i < 260; i++) {
        c.fillStyle = pick(['#6f8448', '#5f7a40', '#88935a', '#6c6248']);
        c.beginPath();
        c.ellipse(random() * gx, random() * PH, 4 + random() * 10, 3 + random() * 6, random() * 3, 0, Math.PI * 2);
        c.fill();
      }
      // Water: the dark wet ring round the fountain and footprints drying toward the portico.
      if (running > 0) {
        const wet = c.createRadialGradient(fx, fy, 2.2 * PX, fx, fy, 3.4 * PX);
        wet.addColorStop(0, `rgba(55,62,70,${0.18 + running * 0.25})`);
        wet.addColorStop(1, 'rgba(55,62,70,0)');
        c.fillStyle = wet;
        c.fillRect(fx - 3.5 * PX, fy - 3.5 * PX, 7 * PX, 7 * PX);
        const trails = Math.round(mix(2, 6, running));
        for (let t = 0; t < trails; t++) {
          const ang = Math.PI * (1.05 + random() * 0.9);
          footprints([Math.cos(ang) * 2.4, FZ + Math.sin(ang) * 2.4], [(random() - 0.5) * 1.6, BACK_Z + 0.3], c);
        }
      }
      // Wear: stains, cracks and droppings; grain if someone has been feeding the birds.
      for (let i = 0; i < Math.round(mood.wear * 50); i++) {
        c.fillStyle = `rgba(70,60,48,${0.06 + random() * 0.12})`;
        c.beginPath();
        c.ellipse(random() * 1024, random() * PH, 6 + random() * 30, 4 + random() * 16, random() * 3, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = 'rgba(60,55,50,0.45)';
      for (let i = 0; i < Math.round(mood.wear * 24); i++) {
        c.lineWidth = 1;
        c.beginPath();
        let x = random() * 1024, y = random() * PH;
        c.moveTo(x, y);
        for (let k = 0; k < 4; k++) c.lineTo((x += (random() - 0.5) * 26), (y += (random() - 0.5) * 26));
        c.stroke();
      }
      c.fillStyle = 'rgba(245,245,240,0.8)';
      for (let i = 0; i < Math.round(20 + mood.wear * 60); i++) {
        const [px, py] = toPx(-3.9 + random() * 7.8, -3.2 + random() * 8.4);
        c.fillRect(px, py, 2, 2);
      }
      if (a.feeding) {
        const [cx, cy] = toPx(-1.3, 4.3);
        for (let i = 0; i < 500; i++) {
          const r = Math.sqrt(random()) * 1.0 * PX, ang = random() * Math.PI * 2;
          c.fillStyle = pick(['#c9a24a', '#b08a3a', '#e0c070']);
          c.fillRect(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.8, 2, 2);
        }
      }
    });
    const groundSide = s.material(tint(stone.paving, 0.8), { roughness: 0.9 });
    const groundTop = new THREE.MeshStandardMaterial({ map: paving, roughness: a.stone === 'marble' ? 0.45 : 0.8 });
    const ground = new THREE.Mesh(new THREE.BoxGeometry(GX1 - GX0, 0.3, GZ1 - GZ0), [groundSide, groundSide, groundTop, groundSide, groundSide, groundSide]);
    ground.position.set((GX0 + GX1) / 2, -0.15, (GZ0 + GZ1) / 2);
    ground.receiveShadow = true;
    root.add(ground);
    world.ground = ground;

    // ---- gallery floors, one step up from the court
    s.box([14.45, FLOOR, 3.05], [0.225, FLOOR / 2, (HALL_Z + BACK_Z + 0.25) / 2], gallery(14.45, 3.05));
    s.box([3.05, FLOOR, END_Z - BACK_Z - 0.25], [WALL_X + 1.525, FLOOR / 2, (END_Z + BACK_Z + 0.25) / 2], gallery(3.05, 8.45));
    s.box([3.5, FLOOR, END_Z - BACK_Z - 0.25], [SIDE_X - 0.25 + 1.75, FLOOR / 2, (END_Z + BACK_Z + 0.25) / 2], gallery(3.5, 8.45));

    // ---- the arcades: spandrel walls over pointed arches, columns, voussoirs, roofs and domes
    const sideCols = [BACK_Z, -0.8, 2.0, 4.8];
    const backCols = [-SIDE_X, -1.4, 1.4, SIDE_X];
    const sideArches = [pointedArch(-3.35, -1.05, SPRING, 0.6), pointedArch(-0.55, 1.75, SPRING, 0.6), pointedArch(2.25, 4.55, SPRING, 0.6)];
    const central = pointedArch(-1.15, 1.15, SPRING, 0.85);
    const backArches = [pointedArch(-6.75, -4.45, SPRING, 0.6), pointedArch(-3.95, -1.65, SPRING, 0.6), central, pointedArch(1.65, 3.95, SPRING, 0.6), pointedArch(4.45, 7.0, SPRING, 0.55)];
    const back = new THREE.Mesh(spandrel(WALL_X, 7.4, backArches, [[WALL_X, -1.65, ROOF_TOP], [-1.65, 1.65, CENTRAL_TOP], [1.65, 7.4, ROOF_TOP]]), ashlarFor(1, 1));
    back.position.z = BACK_Z - 0.25;
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(spandrel(BACK_Z - 0.25, END_Z, sideArches, [[BACK_Z - 0.25, END_Z, ROOF_TOP]]), ashlarFor(1, 1));
      wall.rotation.y = -Math.PI / 2;
      wall.position.x = side * SIDE_X + 0.25;
      root.add(wall);
    }
    root.add(back);
    // ExtrudeGeometry's faces take world-unit UVs, so ashlarFor(1, 1) repeats the 2 m canvas once per 2 m.
    for (const m of root.children) if ((m as THREE.Mesh).geometry instanceof THREE.ExtrudeGeometry) m.castShadow = m.receiveShadow = true;
    // Voussoirs: a ring of alternating blocks round every arch, standing proud of both faces.
    const vouss: { m: THREE.Matrix4; color: string }[] = [];
    const addVoussoirs = (arch: Arch, toWorld: (u: number, y: number) => THREE.Vector3, side: boolean) => {
      arch.segments.forEach((seg, i) => {
        const r = seg.radial, t = new THREE.Vector2(r.y, -r.x);
        const X = side ? new THREE.Vector3(0, t.y, t.x) : new THREE.Vector3(t.x, t.y, 0);
        const Y = side ? new THREE.Vector3(0, r.y, r.x) : new THREE.Vector3(r.x, r.y, 0);
        const Z = new THREE.Vector3().crossVectors(X, Y);
        const centre = seg.mid.clone().addScaledVector(r, 0.15);
        const m = new THREE.Matrix4().makeBasis(X, Y, Z).scale(new THREE.Vector3(seg.length * 0.94, 0.3, 0.56));
        m.setPosition(toWorld(centre.x, centre.y));
        vouss.push({ m, color: i % 2 ? stone.vA : stone.vB });
      });
    };
    for (const arch of backArches) addVoussoirs(arch, (u, y) => new THREE.Vector3(u, y, BACK_Z), false);
    for (const side of [-1, 1]) for (const arch of sideArches) addVoussoirs(arch, (u, y) => new THREE.Vector3(side * SIDE_X, y, u), true);
    instanced(new THREE.BoxGeometry(1, 1, 1), s.material('#ffffff', { roughness: 0.75 }), vouss);
    // Columns: base, shaft, lozenge capital, impost.
    const colAt: [number, number][] = [...backCols.map((x) => [x, BACK_Z] as [number, number]), ...[-1, 1].flatMap((side) => sideCols.slice(1).map((z) => [side * SIDE_X, z] as [number, number]))];
    instanced(new THREE.BoxGeometry(0.44, 0.2, 0.44), trim, colAt.map(([x, z]) => ({ m: M([x, FLOOR + 0.1, z]) })));
    instanced(new THREE.CylinderGeometry(0.16, 0.18, 2.27, 16), column, colAt.map(([x, z]) => ({ m: M([x, FLOOR + 0.2 + 1.135, z]) })));
    instanced(new THREE.CylinderGeometry(0.36, 0.2, 0.3, 4), trim, colAt.map(([x, z]) => ({ m: M([x, 2.77, z], [1, 1, 1], [0, Math.PI / 4, 0]) })));
    instanced(new THREE.BoxGeometry(0.52, 0.08, 0.52), trim, colAt.map(([x, z]) => ({ m: M([x, 2.96, z]) })));
    // Square piers: one against the west wall, and the open outer piers of the east gallery.
    s.box([0.25, SPRING - FLOOR, 0.5], [WALL_X + 0.125, (SPRING + FLOOR) / 2, BACK_Z], wallFlat);
    instanced(new THREE.BoxGeometry(0.4, ROOF - FLOOR, 0.4), wallFlat, [BACK_Z, HALL_Z + 0.25].map((z) => ({ m: M([OUTER_X, (ROOF + FLOOR) / 2, z]) })));
    // Roof slabs, the raised central bay, and the domes.
    const roofMat = s.material(tint(stone.wall, 0.93), { roughness: 0.85 });
    s.box([5.95, ROOF_TOP - ROOF, 3.15], [(-7.6 - 1.65) / 2, (ROOF + ROOF_TOP) / 2, (HALL_Z + BACK_Z + 0.35) / 2], roofMat);
    s.box([5.95, ROOF_TOP - ROOF, 3.15], [(7.6 + 1.65) / 2, (ROOF + ROOF_TOP) / 2, (HALL_Z + BACK_Z + 0.35) / 2], roofMat);
    s.box([3.3, CENTRAL_TOP - 4.9, 3.15], [0, (4.9 + CENTRAL_TOP) / 2, (HALL_Z + BACK_Z + 0.35) / 2], roofMat);
    s.box([3.75, ROOF_TOP - ROOF, END_Z - BACK_Z - 0.35], [(-7.6 - SIDE_X + 0.1) / 2, (ROOF + ROOF_TOP) / 2, (END_Z + BACK_Z + 0.35) / 2], roofMat);
    // The east arcade is the diorama's cut side: a free-standing screen of arches with a coping, open to the camera.
    s.box([0.66, 0.14, END_Z - BACK_Z + 0.3], [SIDE_X, ROOF_TOP + 0.07, (END_Z + BACK_Z - 0.3) / 2], roofMat);
    const domeAt: [number, number, number, number][] = [
      ...[-5.6, -2.8, 2.8, 5.7].map((x) => [x, -4.9, ROOF_TOP, 1.12] as [number, number, number, number]),
      [0, -4.9, CENTRAL_TOP, 1.32],
      ...[-2.2, 0.6, 3.4].map((z) => [-5.6, z, ROOF_TOP, 1.12] as [number, number, number, number]),
    ];
    const domeProfile = [[1, 0], [0.985, 0.17], [0.94, 0.36], [0.84, 0.56], [0.68, 0.74], [0.47, 0.88], [0.24, 0.97], [0, 1.03]].map(([x, y]) => new THREE.Vector2(x, y));
    const domeGeo = new THREE.LatheGeometry(domeProfile, 24);
    instanced(new THREE.CylinderGeometry(1, 1.05, 1, 8), roofMat, domeAt.map(([x, z, y, r]) => ({ m: M([x, y + 0.14, z], [r, 0.28, r], [0, Math.PI / 8, 0]) })));
    instanced(domeGeo, lead, domeAt.map(([x, z, y, r]) => ({ m: M([x, y + 0.28, z], [r, r, r]) })));
    const crescent = new THREE.TorusGeometry(0.09, 0.022, 6, 14, Math.PI * 1.35);
    crescent.rotateZ(-Math.PI * 0.18);
    crescent.translate(0, 0.42, 0);
    const finialGeo = mergeGeometries([
      new THREE.CylinderGeometry(0.02, 0.025, 0.36, 6).translate(0, 0.18, 0),
      new THREE.SphereGeometry(0.06, 10, 8).translate(0, 0.14, 0),
      new THREE.SphereGeometry(0.045, 10, 8).translate(0, 0.27, 0),
      crescent,
    ]);
    instanced(finialGeo, gold, domeAt.map(([x, z, y, r]) => ({ m: M([x, y + 0.28 + r * 1.02, z], [r, r, r]) })));

    // ---- the west wall and its windows, the prayer hall and its portal
    const westL = END_Z - HALL_Z;
    const west = new THREE.Mesh(new THREE.BoxGeometry(0.5, ROOF_TOP, westL), [ashlarFor(westL, ROOF_TOP), wallFlat, wallFlat, wallFlat, wallFlat, wallFlat]);
    west.position.set(WALL_X - 0.25, ROOF_TOP / 2, (END_Z + HALL_Z) / 2);
    west.castShadow = west.receiveShadow = true;
    root.add(west);
    const hall = new THREE.Mesh(new THREE.BoxGeometry(15.2, 10, 7), [ashlarFor(7, 10), ashlarFor(7, 10), wallFlat, wallFlat, ashlarFor(15.2, 10), wallFlat]);
    hall.position.set(0, 5, HALL_Z - 3.5);
    hall.castShadow = hall.receiveShadow = true;
    root.add(hall);
    s.box([15.5, 0.35, 0.4], [0, 10.0, HALL_Z + 0.05], trim);
    // The great dome over the hall: seen only when the frame pulls back.
    s.cylinder(4.7, 4.9, 1.4, [0, 10.7, HALL_Z - 3.5], wallFlat, 16);
    const bigDome = new THREE.Mesh(domeGeo, lead);
    bigDome.position.set(0, 11.4, HALL_Z - 3.5);
    bigDome.scale.setScalar(4.7);
    bigDome.castShadow = true;
    root.add(bigDome);
    for (const [x, z] of [[-6.9, HALL_Z - 0.6], [6.9, HALL_Z - 0.6], [-6.9, HALL_Z - 6.4], [6.9, HALL_Z - 6.4]] as [number, number][]) {
      s.cylinder(0.45, 0.5, 1.6, [x, 10.8, z], wallFlat, 8);
      s.cylinder(0.02, 0.5, 1.0, [x, 12.1, z], lead, 8);
    }
    // Windows: barred rectangles below, pointed lights above, round oculi under the cornice.
    const windowTex = (arched: boolean, round = false) => paint(64, 128, (c) => {
      c.clearRect(0, 0, 64, 128);
      const path = () => {
        c.beginPath();
        if (round) c.arc(32, 64, 30, 0, Math.PI * 2);
        else if (arched) {
          c.moveTo(4, 126);
          c.lineTo(4, 50);
          c.quadraticCurveTo(4, 16, 32, 2);
          c.quadraticCurveTo(60, 16, 60, 50);
          c.lineTo(60, 126);
        } else c.rect(2, 2, 60, 124);
        c.closePath();
      };
      path();
      c.fillStyle = stone.trim;
      c.fill();
      c.save();
      path();
      c.clip();
      c.fillStyle = '#2b3138';
      c.fillRect(8, 8, 48, 112);
      c.strokeStyle = arched || round ? '#c9b98a' : '#1a1a1c';
      c.lineWidth = arched || round ? 2 : 3;
      for (let x = 14; x < 56; x += 10) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 128); c.stroke(); }
      for (let y = 18; y < 128; y += arched || round ? 14 : 22) { c.beginPath(); c.moveTo(0, y); c.lineTo(64, y); c.stroke(); }
      c.restore();
    });
    const windowMat = (tex: THREE.Texture) => new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.7 });
    const plane = new THREE.PlaneGeometry(1, 1);
    const fz = HALL_Z + 0.012;
    instanced(plane, windowMat(windowTex(false)), [
      ...[-5.6, 5.7].map((x) => ({ m: M([x, FLOOR + 1.55, fz], [1.0, 1.5, 1]) })),
      ...[-2.2, 0.6, 3.4].map((z) => ({ m: M([WALL_X + 0.012, FLOOR + 1.55, z], [1.0, 1.5, 1], [0, Math.PI / 2, 0]) })),
    ]);
    instanced(plane, windowMat(windowTex(true)), [-6.4, -4.4, -2.5, 2.5, 4.4, 6.4].map((x) => ({ m: M([x, 7.5, fz], [0.9, 1.8, 1]) })));
    instanced(plane, windowMat(windowTex(false, true)), [-5.5, -2.75, 0, 2.75, 5.5].map((x) => ({ m: M([x, 9.15, fz], [0.7, 1.4, 1]) })));

    // The portal: a tall frame, a pointed niche with muqarnas, an inscription, the doors.
    const portalZ = HALL_Z + 0.3;
    s.box([3.3, 7.2, 0.3], [0, FLOOR + 3.6, HALL_Z + 0.15], trim);
    const nicheArch = pointedArch(-1.05, 1.05, 4.0, 0.85, 10);
    const nicheShape = (grow: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(-1.05 - grow, FLOOR);
      for (const p of nicheArch.points) shape.lineTo(p.x + Math.sign(p.x) * grow, p.y + grow * (p.y > 4 ? 1 : 0));
      shape.lineTo(1.05 + grow, FLOOR);
      shape.closePath();
      return shape;
    };
    const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(nicheShape(0.14), { depth: 0.02, bevelEnabled: false }), s.material(a.stone === 'ablaq' ? stone.vB : tint(stone.wall, 1.05), { roughness: 0.7 }));
    rim.position.z = portalZ;
    const niche = new THREE.Mesh(new THREE.ExtrudeGeometry(nicheShape(0), { depth: 0.02, bevelEnabled: false }), s.material(tint(stone.wall, 0.62), { roughness: 0.9 }));
    niche.position.z = portalZ + 0.02;
    rim.receiveShadow = niche.receiveShadow = true;
    root.add(rim, niche);
    const cells: { m: THREE.Matrix4 }[] = [];
    for (let row = 0; row < 5; row++) for (let k = 0; k < 6 - row; k++) {
      const x = (k - (5 - row) / 2) * 0.32;
      cells.push({ m: M([x, 4.15 + row * 0.3, portalZ + 0.07], [0.26, 0.22, 0.08]) });
    }
    instanced(new THREE.BoxGeometry(1, 1, 1), s.material(tint(stone.wall, 1.08), { roughness: 0.7 }), cells);
    const inscription = paint(256, 64, (c) => {
      c.fillStyle = '#1f3a2c';
      c.fillRect(0, 0, 256, 64);
      c.strokeStyle = '#d4b04a';
      c.lineWidth = 3;
      for (let i = 0; i < 9; i++) {
        const x = 18 + i * 25;
        c.beginPath();
        c.moveTo(x, 46);
        c.bezierCurveTo(x + 6, 10 + random() * 10, x + 16, 52, x + 22, 16 + random() * 20);
        c.stroke();
      }
      c.strokeRect(4, 4, 248, 56);
    });
    s.mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshStandardMaterial({ map: inscription, roughness: 0.6, metalness: 0.2 }), [0, 3.45, portalZ + 0.045]);
    if (open) {
      const inside = paint(64, 128, (c) => {
        const g = c.createLinearGradient(0, 0, 0, 128);
        g.addColorStop(0, '#2a1c14');
        g.addColorStop(0.7, '#4a2a1c');
        g.addColorStop(0.72, '#7a1f22');
        g.addColorStop(1, '#8e2a26');
        c.fillStyle = g;
        c.fillRect(0, 0, 64, 128);
        for (let i = 0; i < 9; i++) {
          c.fillStyle = 'rgba(255,214,140,0.9)';
          c.beginPath();
          c.arc(6 + random() * 52, 20 + random() * 30, 1.6, 0, Math.PI * 2);
          c.fill();
        }
      });
      s.mesh(new THREE.PlaneGeometry(1.7, 2.9), new THREE.MeshStandardMaterial({ map: inside, roughness: 0.9, emissive: '#5a2a14', emissiveIntensity: 0.25 + mood.cheer * 0.2, emissiveMap: inside }), [0, FLOOR + 1.45, portalZ + 0.045]);
      // The leaves folded back against the reveals.
      for (const side of [-1, 1]) s.box([0.08, 2.9, 0.4], [side * 0.92, FLOOR + 1.45, portalZ + 0.24], wood);
    } else {
      const doorTex = paint(64, 128, (c) => {
        c.fillStyle = '#5a3a22';
        c.fillRect(0, 0, 64, 128);
        c.strokeStyle = '#3a2414';
        c.lineWidth = 3;
        for (const [y, h] of [[8, 34], [48, 34], [88, 32]] as [number, number][]) c.strokeRect(8, y, 48, h);
        c.fillStyle = '#c9a23a';
        for (let y = 12; y < 124; y += 10) { c.fillRect(3, y, 2, 2); c.fillRect(59, y, 2, 2); }
      });
      const doorMat = new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.6 });
      for (const side of [-1, 1]) s.box([0.84, 2.9, 0.08], [side * 0.43, FLOOR + 1.45, portalZ + 0.06], doorMat);
      s.ring(0.05, 0.012, [-0.08, FLOOR + 1.3, portalZ + 0.11], brass);
      s.ring(0.05, 0.012, [0.08, FLOOR + 1.3, portalZ + 0.11], brass);
    }

    // ---- the shoe racks either side of the doors, and the shoes
    const rackZ = HALL_Z + 0.2;
    const boards: { m: THREE.Matrix4 }[] = [];
    const holes: [number, number][] = [];
    for (const cx of [-2.5, 2.5]) {
      boards.push({ m: M([cx, FLOOR + 0.6, rackZ - 0.17], [1.7, 1.2, 0.02]) });
      for (const e of [-1, 1]) boards.push({ m: M([cx + e * 0.835, FLOOR + 0.6, rackZ], [0.03, 1.2, 0.36]) });
      for (let k = 0; k < 4; k++) boards.push({ m: M([cx, FLOOR + 0.015 + k * 0.39, rackZ], [1.7, 0.03, 0.36]) });
      for (let j = 1; j < 6; j++) boards.push({ m: M([cx - 0.85 + j * (1.7 / 6), FLOOR + 0.6, rackZ], [0.025, 1.17, 0.34]) });
      for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) holes.push([cx - 0.85 + (col + 0.5) * (1.7 / 6), FLOOR + 0.03 + row * 0.39]);
    }
    instanced(new THREE.BoxGeometry(1, 1, 1), wood, boards);
    const fill = Math.min(1, { quiet: 0.12, washing: 0.5, adhan: 0.55, arriving: 0.88 }[a.moment] + mood.density * 0.2);
    const shoeColours = ['#1c1a19', '#2a211b', '#4a3324', '#6b4a2e', '#e8e4dc', '#2b3a6b', '#8a6a44', '#3a3a40', '#efeee8'];
    const shoes: { m: THREE.Matrix4; color: string }[] = [];
    const pair = (x: number, y: number, z: number, yaw: number, colour: string, spread = 0.055) => {
      for (const e of [-1, 1]) shoes.push({ m: M([x + e * spread * Math.cos(yaw), y + 0.037, z - e * spread * Math.sin(yaw)], [1, 1, 1], [0, yaw + (random() - 0.5) * 0.15, 0]), color: colour });
    };
    for (const [x, y] of holes) if (random() < fill) pair(x, y, rackZ + 0.03, 0, pick(shoeColours));
    if (fill > 0.7) for (let i = 0; i < Math.round((fill - 0.6) * 18); i++) {
      const side = random() < 0.5 ? -1 : 1;
      pair(side * (1.8 + random() * 1.6), FLOOR, HALL_Z + 0.7 + random() * 0.8, (random() - 0.5) * 1.2, pick(shoeColours));
    }
    instanced(new RoundedBoxGeometry(0.09, 0.075, 0.26, 2, 0.03), s.material('#ffffff', { roughness: 0.55 }), shoes);

    // ---- the runner from the doors out into the court
    const runnerTex = paint(64, 256, (c) => {
      c.fillStyle = '#8e1f22';
      c.fillRect(0, 0, 64, 256);
      c.fillStyle = '#d9b45a';
      c.fillRect(4, 0, 3, 256);
      c.fillRect(57, 0, 3, 256);
      c.fillStyle = '#1f2c52';
      c.fillRect(9, 0, 4, 256);
      c.fillRect(51, 0, 4, 256);
      c.fillStyle = 'rgba(217,180,90,0.6)';
      for (let y = 10; y < 256; y += 24) { c.beginPath(); c.moveTo(32, y); c.lineTo(40, y + 8); c.lineTo(32, y + 16); c.lineTo(24, y + 8); c.closePath(); c.fill(); }
    });
    const runner = new THREE.MeshStandardMaterial({ map: runnerTex, roughness: 0.95 });
    s.box([1.1, 0.012, BACK_Z + 0.25 - portalZ], [0, FLOOR + 0.006, (BACK_Z + 0.25 + portalZ) / 2], runner);
    s.box([1.1, FLOOR, 0.012], [0, FLOOR / 2, BACK_Z + 0.256], runner);
    s.box([1.1, 0.012, 0.8], [0, 0.006, BACK_Z + 0.66], runner);

    // ---- the portico wall beside the doors
    if (a.portal === 'clocks') {
      const board = paint(256, 96, (c) => {
        c.fillStyle = '#4a2e1c';
        c.fillRect(0, 0, 256, 96);
        c.fillStyle = '#c9a23a';
        c.fillRect(8, 6, 240, 14);
        for (let i = 0; i < 6; i++) {
          const x = 26 + i * 41, y = 58;
          c.fillStyle = '#f3efe4';
          c.beginPath(); c.arc(x, y, 16, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#1a1a1c';
          c.lineWidth = 2;
          const h = random() * Math.PI * 2, m = random() * Math.PI * 2;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(h) * 9, y - Math.cos(h) * 9); c.stroke();
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(m) * 13, y - Math.cos(m) * 13); c.stroke();
        }
      });
      s.box([1.6, 0.6, 0.05], [-2.5, FLOOR + 1.95, HALL_Z + 0.03], s.material('#4a2e1c'));
      s.mesh(new THREE.PlaneGeometry(1.6, 0.6), new THREE.MeshStandardMaterial({ map: board, roughness: 0.6 }), [-2.5, FLOOR + 1.95, HALL_Z + 0.056]);
    }
    if (a.portal === 'tiles') {
      const tiles = paint(128, 96, (c) => {
        for (let y = 0; y < 96; y += 32) for (let x = 0; x < 128; x += 32) {
          c.fillStyle = '#f2f0ea';
          c.fillRect(x, y, 32, 32);
          c.fillStyle = '#1f4f9a';
          c.beginPath(); c.arc(x + 16, y + 16, 11, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#2ab0b0';
          c.beginPath(); c.arc(x + 16, y + 16, 6, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#c0392b';
          c.beginPath(); c.ellipse(x + 16, y + 9, 3, 5, 0, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#1f4f9a';
          c.lineWidth = 1;
          c.strokeRect(x + 0.5, y + 0.5, 31, 31);
        }
      });
      for (const x of [-2.5, 2.5]) s.mesh(new THREE.PlaneGeometry(1.7, 1.2), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.25 }), [x, FLOOR + 2.0, HALL_Z + 0.015]);
    }
    if (a.portal === 'notices') {
      const cork = paint(128, 80, (c) => {
        c.fillStyle = '#b08a5a';
        c.fillRect(0, 0, 128, 80);
        for (let i = 0; i < 7; i++) {
          c.fillStyle = pick(['#f3efe4', '#f6e6a0', '#e8f0f6', '#f3d6d6']);
          const x = 6 + random() * 90, y = 6 + random() * 44;
          c.fillRect(x, y, 22 + random() * 10, 26);
          c.fillStyle = '#5a5a60';
          for (let l = 0; l < 4; l++) c.fillRect(x + 3, y + 5 + l * 5, 16, 1.5);
        }
      });
      s.box([1.3, 0.8, 0.04], [-2.5, FLOOR + 2.0, HALL_Z + 0.03], s.material('#6b4a2e'));
      s.mesh(new THREE.PlaneGeometry(1.2, 0.72), new THREE.MeshStandardMaterial({ map: cork, roughness: 0.9 }), [-2.5, FLOOR + 2.0, HALL_Z + 0.052]);
      s.box([0.3, 0.42, 0.22], [2.5, FLOOR + 1.6, HALL_Z + 0.12], s.material('#2f6a4a', { roughness: 0.5, metalness: 0.3 }));
    }

    // ---- the ablution fountain
    const fountain = new THREE.Group();
    fountain.position.set(0, 0, FZ);
    root.add(fountain);
    const add = (mesh: THREE.Mesh, at: P, turn = Math.PI / 8) => {
      mesh.position.set(...at);
      mesh.rotation.y = turn;
      mesh.castShadow = mesh.receiveShadow = true;
      fountain.add(mesh);
      return mesh;
    };
    const fMarble = s.material('#ffffff', { map: marble(random, '#e8e4dc', '#d2cdc3'), roughness: 0.35 });
    add(new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.3, 0.14, 8), fMarble), [0, 0.07, 0]);
    const water = new THREE.MeshStandardMaterial({ color: '#7896a4', roughness: 0.08, metalness: 0.25, emissive: '#2a3a44', emissiveIntensity: 0.3 });
    const channel = add(new THREE.Mesh(new THREE.RingGeometry(1.36, 1.56, 8, 1), water), [0, 0.142, 0], 0);
    channel.rotation.set(-Math.PI / 2, 0, Math.PI / 8);
    add(new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.34, 0.35, 8), fMarble), [0, 0.315, 0]);
    const panels = paint(1024, 160, (c) => {
      c.fillStyle = '#e6e1d6';
      c.fillRect(0, 0, 1024, 160);
      for (let k = 0; k < 8; k++) {
        const x0 = k * 128;
        c.fillStyle = '#cfc8b9';
        c.fillRect(x0, 0, 128, 10);
        c.fillRect(x0, 150, 128, 10);
        c.fillStyle = '#d6d0c2';
        c.beginPath();
        c.moveTo(x0 + 26, 100);
        c.lineTo(x0 + 26, 50);
        c.quadraticCurveTo(x0 + 26, 24, x0 + 64, 14);
        c.quadraticCurveTo(x0 + 102, 24, x0 + 102, 50);
        c.lineTo(x0 + 102, 100);
        c.closePath();
        c.fill();
        c.strokeStyle = '#a9a192';
        c.lineWidth = 2;
        c.stroke();
        c.fillStyle = '#b8913a';
        for (let p = 0; p < 8; p++) {
          const ang = (p / 8) * Math.PI * 2;
          c.beginPath();
          c.ellipse(x0 + 64 + Math.cos(ang) * 9, 58 + Math.sin(ang) * 9, 5, 3, ang, 0, Math.PI * 2);
          c.fill();
        }
        c.strokeStyle = '#efeae0';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x0 + 2, 0);
        c.lineTo(x0 + 2, 160);
        c.stroke();
      }
    });
    const drumSide = new THREE.MeshStandardMaterial({ map: panels, roughness: 0.4 });
    add(new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.0, 8), [drumSide, fMarble, fMarble]), [0, 0.99, 0]);
    add(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.08, 0.14, 8), fMarble), [0, 1.56, 0]);
    // Taps: two to a face, brass, with stools before them.
    const tapGeo = mergeGeometries([
      new THREE.CylinderGeometry(0.045, 0.045, 0.012, 12).rotateX(Math.PI / 2).translate(0, 0, 0.006),
      new THREE.CylinderGeometry(0.017, 0.017, 0.14, 8).rotateX(Math.PI / 2).translate(0, 0, 0.07),
      new THREE.CylinderGeometry(0.014, 0.012, 0.07, 8).translate(0, -0.03, 0.135),
      new THREE.SphereGeometry(0.024, 8, 6).translate(0, 0.034, 0.06),
    ]);
    const taps: { m: THREE.Matrix4 }[] = [], stools: { m: THREE.Matrix4 }[] = [], streams: { m: THREE.Matrix4 }[] = [];
    const apothem = 1.05 * Math.cos(Math.PI / 8);
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang)), tan = new THREE.Vector3(Math.cos(ang), 0, -Math.sin(ang));
      for (const e of [-0.22, 0.22]) {
        const base = dir.clone().multiplyScalar(apothem).addScaledVector(tan, e);
        taps.push({ m: M([base.x, 0.8, FZ + base.z], [1, 1, 1], [0, ang, 0]) });
        const stool = dir.clone().multiplyScalar(1.78).addScaledVector(tan, e * 1.5);
        stools.push({ m: M([stool.x, 0.29, FZ + stool.z], [1, 1, 1], [0, ang + (random() - 0.5) * 0.3, 0]) });
        if (random() < running) {
          const spout = base.clone().addScaledVector(dir, 0.135);
          streams.push({ m: M([spout.x, (0.735 + 0.49) / 2, FZ + spout.z], [1, 0.245, 1]) });
        }
      }
    }
    instanced(tapGeo, brass, taps);
    instanced(new THREE.CylinderGeometry(0.13, 0.15, 0.3, 10), fMarble, stools);
    const streamMat = new THREE.MeshStandardMaterial({ color: '#d6ecf4', transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.05, emissive: '#6a8a96', emissiveIntensity: 0.25 });
    const streamMesh = instanced(new THREE.CylinderGeometry(0.012, 0.009, 1, 6), streamMat, streams);
    if (streamMesh) streamMesh.castShadow = false;
    if (a.fountain === 'canopy') {
      const lathe = new THREE.Mesh(domeGeo, fMarble);
      lathe.scale.set(0.95, 0.5, 0.95);
      add(lathe, [0, 1.63, 0], 0);
      instanced(new THREE.CylinderGeometry(0.075, 0.09, 2.86, 10), column, Array.from({ length: 8 }, (_, k) => {
        const ang = ((k + 0.5) / 8) * Math.PI * 2;
        return { m: M([Math.sin(ang) * 2.08, 0.14 + 1.43, FZ + Math.cos(ang) * 2.08]) };
      }));
      const soffit = paint(256, 256, (c) => {
        c.fillStyle = '#6b3a24';
        c.fillRect(0, 0, 256, 256);
        c.strokeStyle = '#c9a23a';
        c.lineWidth = 3;
        for (let r = 30; r < 128; r += 22) { c.beginPath(); c.arc(128, 128, r, 0, Math.PI * 2); c.stroke(); }
        c.fillStyle = '#2a5a6a';
        for (let k = 0; k < 16; k++) { const ang = (k / 16) * Math.PI * 2; c.beginPath(); c.arc(128 + Math.cos(ang) * 96, 128 + Math.sin(ang) * 96, 7, 0, Math.PI * 2); c.fill(); }
      });
      add(new THREE.Mesh(new THREE.CylinderGeometry(1.55, 2.75, 0.55, 8), [lead, lead, new THREE.MeshStandardMaterial({ map: soffit, roughness: 0.8 })]), [0, 3.275, 0]);
      add(new THREE.Mesh(new THREE.CylinderGeometry(2.77, 2.77, 0.14, 8, 1, true), s.material('#7a4a2a', { side: THREE.DoubleSide })), [0, 2.99, 0]);
      add(new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.5, 0.42, 8), trim), [0, 3.76, 0]);
      const dome = add(new THREE.Mesh(domeGeo, lead), [0, 3.97, 0], 0);
      dome.scale.setScalar(1.45);
      const fin = add(new THREE.Mesh(finialGeo, gold), [0, 3.97 + 1.45 * 1.03, 0], 0);
      fin.scale.setScalar(1.6);
    }
    if (a.fountain === 'kiosk') {
      const grille = paint(128, 128, (c) => {
        c.clearRect(0, 0, 128, 128);
        c.strokeStyle = '#8a6a2e';
        c.lineWidth = 6;
        c.strokeRect(3, 3, 122, 122);
        c.lineWidth = 3.5;
        for (let i = -128; i < 256; i += 22) {
          c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 128, 128); c.stroke();
          c.beginPath(); c.moveTo(i + 128, 0); c.lineTo(i, 128); c.stroke();
        }
      });
      grille.wrapS = THREE.RepeatWrapping;
      grille.repeat.set(8, 1);
      add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.4, 8, 1, true), new THREE.MeshStandardMaterial({ map: grille, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 })), [0, 2.33, 0]);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 1.4, 8), s.material('#e0dbd0')), [0, 2.33, 0]);
      add(new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.08, 0.22, 8), fMarble), [0, 3.14, 0]);
      const dome = add(new THREE.Mesh(domeGeo, lead), [0, 3.25, 0], 0);
      dome.scale.setScalar(1.18);
      const fin = add(new THREE.Mesh(finialGeo, gold), [0, 3.25 + 1.18 * 1.03, 0], 0);
      fin.scale.setScalar(1.4);
    }
    if (a.fountain === 'basin') {
      add(new THREE.Mesh(new THREE.LatheGeometry([[0.2, 0], [0.7, 0.1], [1.0, 0.3], [1.12, 0.42], [1.08, 0.46], [0.95, 0.36]].map(([x, y]) => new THREE.Vector2(x, y)), 24), fMarble), [0, 1.63, 0], 0);
      add(new THREE.Mesh(new THREE.CircleGeometry(0.98, 24).rotateX(-Math.PI / 2), water), [0, 1.98, 0], 0);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.9, 10), fMarble), [0, 2.3, 0], 0);
      add(new THREE.Mesh(new THREE.LatheGeometry([[0.05, 0], [0.3, 0.06], [0.42, 0.16], [0.4, 0.2]].map(([x, y]) => new THREE.Vector2(x, y)), 18), fMarble), [0, 2.72, 0], 0);
      const jet = add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.5, 8), streamMat), [0, 3.1, 0], 0);
      jet.castShadow = false;
    }

    // ---- prayer rugs laid out for the overflow
    const rugCount = Math.round({ quiet: 0, washing: 0, adhan: 3 + mood.density * 5, arriving: 8 + mood.density * 18 }[a.moment]);
    if (rugCount > 0) {
      const rugTex = paint(64, 96, (c) => {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, 64, 96);
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.fillRect(0, 0, 64, 96);
        c.fillStyle = '#ffffff';
        c.fillRect(6, 6, 52, 84);
        c.fillStyle = 'rgba(0,0,0,0.12)';
        c.beginPath();
        c.moveTo(14, 84); c.lineTo(14, 34); c.quadraticCurveTo(14, 16, 32, 10); c.quadraticCurveTo(50, 16, 50, 34); c.lineTo(50, 84); c.closePath();
        c.fill();
        c.fillStyle = 'rgba(255,230,160,0.9)';
        c.fillRect(30, 18, 4, 14);
      });
      const rugEdge = s.material('#ffffff', { roughness: 0.95 });
      const rugTop = new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.95 });
      const spots: [number, number, number][] = [];
      for (const x of [-6.3, -5.5, -4.7]) for (const z of [-2.6, -1.3, 0.0, 1.3, 2.6, 3.9]) spots.push([x, z, FLOOR]);
      for (const x of [4.9, 5.7, 6.5]) for (const z of [-2.6, -1.3, 0.0, 1.3, 2.6, 3.9]) spots.push([x, z, FLOOR]);
      for (const x of [-3.6, -2.8, 2.8, 3.6]) spots.push([x, -3.0, 0]);
      for (let i = spots.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [spots[i], spots[j]] = [spots[j], spots[i]];
      }
      const rugColours = ['#8e2a22', '#2f5a3a', '#22386e', '#7a2a4a', '#2a7a7e', '#a8642a'];
      instanced(new THREE.BoxGeometry(0.66, 0.012, 1.05), [rugEdge, rugEdge, rugTop, rugEdge, rugEdge, rugEdge],
        spots.slice(0, rugCount).map(([x, z, y]) => ({ m: M([x + (random() - 0.5) * 0.06, y + 0.006, z + (random() - 0.5) * 0.06], [1, 1, 1], [0, (random() - 0.5) * 0.06, 0]), color: pick(rugColours) })));
    }

    // ---- the minaret at the outer corner, rising out of the frame
    const mx = 9.1, mz = 2.2;
    const minaret = new THREE.Group();
    minaret.position.set(mx, 0, mz);
    root.add(minaret);
    const madd = (mesh: THREE.Mesh, y: number) => {
      mesh.position.y = y;
      mesh.castShadow = mesh.receiveShadow = true;
      minaret.add(mesh);
      return mesh;
    };
    madd(new THREE.Mesh(new THREE.BoxGeometry(1.7, 4.4, 1.7), ashlarFor(1.7, 4.4)), 2.2);
    madd(new THREE.Mesh(new THREE.CylinderGeometry(0.72, 1.12, 0.9, 8), wallFlat), 4.85).rotation.y = Math.PI / 8;
    const shaftMat = s.material(tint(stone.wall, 1.03), { roughness: 0.75, flatShading: true });
    madd(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.66, 8.0, 16), shaftMat), 9.3);
    for (const y of [7.0, 10.6]) madd(new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.05, 6, 20).rotateX(Math.PI / 2), trim), y);
    madd(new THREE.Mesh(new THREE.LatheGeometry([[0.6, 0], [0.68, 0.18], [0.82, 0.36], [1.0, 0.56], [1.02, 0.64]].map(([x, y]) => new THREE.Vector2(x, y)), 20), trim), 12.9);
    const parapet = paint(128, 64, (c) => {
      c.fillStyle = stone.trim;
      c.fillRect(0, 0, 128, 64);
      c.globalCompositeOperation = 'destination-out';
      for (let x = 8; x < 128; x += 16) {
        c.beginPath();
        c.moveTo(x, 54); c.lineTo(x, 26); c.quadraticCurveTo(x, 14, x + 5, 10); c.quadraticCurveTo(x + 10, 14, x + 10, 26); c.lineTo(x + 10, 54);
        c.closePath();
        c.fill();
      }
    });
    parapet.wrapS = THREE.RepeatWrapping;
    parapet.repeat.set(5, 1);
    madd(new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.8, 24, 1, true), new THREE.MeshStandardMaterial({ map: parapet, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 })), 13.94);
    madd(new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.05, 6, 24).rotateX(Math.PI / 2), trim), 14.34);
    madd(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 4.4, 16), shaftMat), 15.74);
    madd(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.6, 5.8, 16), lead), 20.84);
    madd(new THREE.Mesh(finialGeo, gold), 23.7).scale.setScalar(2);
    // Loudspeaker horns on the upper shaft.
    const horns: { m: THREE.Matrix4 }[] = [];
    for (let k = 0; k < 4; k++) {
      const ang = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const out = new THREE.Vector3(Math.sin(ang), -0.2, Math.cos(ang)).normalize();
      horns.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(mx + Math.sin(ang) * 0.62, 16.4, mz + Math.cos(ang) * 0.62), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), out), new THREE.Vector3(1, 1, 1)) });
    }
    instanced(new THREE.CylinderGeometry(0.16, 0.04, 0.4, 10, 1, true), s.material('#9a9ea2', { side: THREE.DoubleSide, metalness: 0.5, roughness: 0.4 }), horns);
    const door = new THREE.Mesh(plane, windowMat(windowTex(true)));
    door.position.set(0, 1.0, 0.856);
    door.scale.set(0.8, 1.8, 1);
    minaret.add(door);

    // ---- trees over the west wall
    const leafMat = s.material(a.green === 'plane' ? '#5f7a3a' : '#2c4630', { roughness: 0.95, flatShading: true });
    const cypress = (x: number, z: number, h: number) => {
      const prof: THREE.Vector2[] = [];
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const r = (t < 0.15 ? mix(0.3, 0.85, t / 0.15) : 0.85 * Math.pow(1 - (t - 0.15) / 0.85, 0.8)) * (0.9 + random() * 0.2);
        prof.push(new THREE.Vector2(Math.max(0.01, r * h / 10), 0.6 + t * (h - 0.6)));
      }
      prof[prof.length - 1].x = 0;
      const mesh = s.mesh(new THREE.LatheGeometry(prof, 10), leafMat, [x, 0, z]);
      mesh.rotation.z = (random() - 0.5) * 0.04;
      s.cylinder(0.08, 0.12, 1.0, [x, 0.5, z], wood, 8);
    };
    if (a.green === 'cypress') cypress(-8.3, -3.2, 11);
    if (a.green === 'cypresses') for (const [z, h] of [[-4.2, 10.5], [-0.6, 12], [3.0, 9.5]] as [number, number][]) cypress(-8.2 + (random() - 0.5) * 0.3, z, h);
    if (a.green === 'plane') {
      s.rod([-8.4, 0, -0.8], [-7.6, 6.2, -0.6], 0.32, s.material('#8a8274', { roughness: 0.9 }), 0.2);
      const crown: { m: THREE.Matrix4 }[] = [];
      for (let i = 0; i < 9; i++) crown.push({ m: M([-7.4 + (random() - 0.5) * 3.4, 7.0 + random() * 1.6, -0.6 + (random() - 0.5) * 4.4], [1.4 + random() * 0.6, 1.0 + random() * 0.4, 1.4 + random() * 0.6]) });
      instanced(new THREE.IcosahedronGeometry(1, 1), leafMat, crown);
    }

    // ---- pigeons: some pecking on the paving, some lifting off if the call has startled them
    const birds: { x: number; z: number; yaw: number; phase: number; rate: number }[] = [];
    const avoid = (x: number, z: number) => Math.hypot(x, z - FZ) < 2.5 || slots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 0.7) || Math.abs(x) < 0.7 && z < -1.8;
    const walkers = Math.round(mix(5, 24, mood.density));
    for (let tries = 0; birds.length < walkers && tries < 400; tries++) {
      const x = -3.8 + random() * 7.6, z = -3.0 + random() * 8.2;
      if (!avoid(x, z)) birds.push({ x, z, yaw: random() * Math.PI * 2, phase: random() * 10, rate: 2 + random() * 3 });
    }
    if (a.feeding) for (let i = 0; i < 16; i++) {
      const r = Math.sqrt(random()) * 1.0, ang = random() * Math.PI * 2;
      birds.push({ x: -1.3 + Math.cos(ang) * r, z: 4.3 + Math.sin(ang) * r * 0.8, yaw: ang + Math.PI + (random() - 0.5), phase: random() * 10, rate: 3 + random() * 3 });
    }
    const flyers = a.moment === 'adhan' ? 6 : mood.energy > 0.7 ? 2 : 0;
    const flights = Array.from({ length: flyers }, () => ({ cx: (random() - 0.5) * 3, cz: 0.5 + (random() - 0.5) * 3, r: 2 + random() * 2.5, a0: random() * Math.PI * 2, speed: (0.35 + random() * 0.3) * (random() < 0.5 ? 1 : -1), alt: 3.2 + random() * 2.2, phase: random() * 10 }));
    const pigeonColours = ['#8d929c', '#7d828c', '#9aa0a8', '#6f6a66', '#d9d6d0', '#8a7a6a', '#868b95'];
    const total = birds.length + flights.length;
    const bodyMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), s.material('#ffffff', { roughness: 0.8 }), total);
    const headMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.8 }), total);
    const wingMesh = flights.length ? new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), s.material('#ffffff', { roughness: 0.8 }), flights.length * 2) : null;
    for (let i = 0; i < total; i++) {
      const colour = new THREE.Color(pick(pigeonColours));
      bodyMesh.setColorAt(i, colour);
      headMesh.setColorAt(i, colour.clone().multiplyScalar(0.8));
      if (wingMesh && i >= birds.length) for (const w of [0, 1]) wingMesh.setColorAt((i - birds.length) * 2 + w, colour.clone().multiplyScalar(0.92));
    }
    for (const mesh of [bodyMesh, headMesh, wingMesh]) if (mesh) {
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      root.add(mesh);
    }
    const q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), mat = new THREE.Matrix4();
    const pose = (time: number) => {
      birds.forEach((b, i) => {
        const peck = Math.pow(Math.max(0, Math.sin(time * b.rate * (0.4 + mood.energy) + b.phase)), 3);
        e.set(0.25 * peck, b.yaw, 0);
        q.setFromEuler(e);
        bodyMesh.setMatrixAt(i, mat.compose(v.set(b.x, 0.1, b.z), q, sc.set(0.075, 0.068, 0.14)));
        const head = new THREE.Vector3(0, 0.075 - peck * 0.07, 0.12 + peck * 0.03).applyAxisAngle(new THREE.Vector3(0, 1, 0), b.yaw);
        headMesh.setMatrixAt(i, mat.compose(v.set(b.x + head.x, 0.1 + head.y, b.z + head.z), q, sc.set(0.045, 0.045, 0.045)));
      });
      flights.forEach((f, k) => {
        const i = birds.length + k;
        const ang = f.a0 + time * f.speed * (0.5 + mood.energy);
        const x = f.cx + Math.cos(ang) * f.r, z = f.cz + Math.sin(ang) * f.r;
        const yaw = Math.atan2(-Math.sin(ang) * Math.sign(f.speed), Math.cos(ang) * Math.sign(f.speed));
        const y = f.alt + Math.sin(time * 1.3 + f.phase) * 0.15;
        e.set(0, yaw, 0);
        q.setFromEuler(e);
        bodyMesh.setMatrixAt(i, mat.compose(v.set(x, y, z), q, sc.set(0.075, 0.068, 0.15)));
        const head = new THREE.Vector3(0, 0.03, 0.15).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        headMesh.setMatrixAt(i, mat.compose(v.set(x + head.x, y + head.y, z + head.z), q, sc.set(0.045, 0.045, 0.045)));
        const flap = Math.sin(time * (9 + mood.energy * 6) + f.phase) * 0.7;
        for (const side of [-1, 1]) {
          const wq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, side * flap, 'YXZ'));
          const off = new THREE.Vector3(side * 0.17, 0.02, 0).applyQuaternion(wq);
          wingMesh!.setMatrixAt(k * 2 + (side < 0 ? 0 : 1), mat.compose(v.set(x + off.x, y + off.y, z + off.z), wq, sc.set(0.26, 0.012, 0.11)));
        }
      });
      bodyMesh.instanceMatrix.needsUpdate = headMesh.instanceMatrix.needsUpdate = true;
      if (wingMesh) wingMesh.instanceMatrix.needsUpdate = true;
    };
    pose(0);
    for (const mesh of [bodyMesh, headMesh, wingMesh]) if (mesh) { mesh.computeBoundingBox(); mesh.computeBoundingSphere(); }

    // ---- weeds in the joints where the wear has got in; geraniums when the day is kind
    const weeds: { m: THREE.Matrix4 }[] = [];
    for (let i = 0; i < Math.round(mood.wear * 40); i++) {
      const along = random();
      const [x, z] = random() < 0.5 ? [-SIDE_X + 0.28 + random() * 0.1, mix(-3.3, 5.0, along)] : random() < 0.5 ? [SIDE_X - 0.28 - random() * 0.1, mix(-3.3, 5.0, along)] : [mix(-3.8, 3.8, along), BACK_Z + 0.35 + random() * 0.1];
      weeds.push({ m: M([x, 0.04, z], [1, 0.6 + random() * 0.8, 1], [0, random() * 3, 0]) });
    }
    instanced(new THREE.ConeGeometry(0.06, 0.12, 5), s.material('#6a8a3a', { roughness: 0.9 }), weeds);
    if (mood.cheer > 0.45) {
      const pots: [number, number, number][] = [[-1.6, BACK_Z + 0.55, 0], [1.6, BACK_Z + 0.55, 0], [-SIDE_X + 0.55, 4.9, 0], [SIDE_X - 0.55, 4.9, 0]];
      instanced(new THREE.CylinderGeometry(0.2, 0.14, 0.34, 12), s.material('#a8583a', { roughness: 0.85 }), pots.map(([x, z, y]) => ({ m: M([x, y + 0.17, z]) })));
      instanced(new THREE.IcosahedronGeometry(0.24, 1), s.material('#3f6a32', { roughness: 0.9 }), pots.map(([x, z, y]) => ({ m: M([x, y + 0.48, z], [1, 0.8, 1]) })));
      const blooms: { m: THREE.Matrix4 }[] = [];
      for (const [x, z, y] of pots) for (let k = 0; k < 6; k++) blooms.push({ m: M([x + (random() - 0.5) * 0.36, y + 0.55 + random() * 0.14, z + (random() - 0.5) * 0.36]) });
      instanced(new THREE.SphereGeometry(0.045, 6, 5), s.material('#d42a2a', { roughness: 0.6 }), blooms);
    }

    // ---- light: the sun kept low so it rakes across the stone, whatever the hour
    const basePlace = world.place;
    world.place = (items: readonly Placeable[]) => {
      basePlace(items);
      const key = world.keyLight!;
      const centre = key.target.position.clone();
      const dist = key.position.distanceTo(centre);
      const d = mood.daylight, noon = 1 - Math.abs(d - 0.5) * 2;
      key.position.copy(centre).add(new THREE.Vector3(-10 + d * 16, 3.0 + noon * 4.0, 6.5).normalize().multiplyScalar(dist));
    };
    const streamBase = streamMat.opacity;
    world.update = (_dt: number, time: number) => {
      pose(time);
      streamMat.opacity = streamBase + Math.sin(time * 9) * 0.06 * (0.3 + mood.energy);
    };
    return world;
  },
});
