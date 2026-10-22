import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

/** Many copies of one shape in one draw call, each with its own full transform. */
function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, matrices: readonly THREE.Matrix4[], colours?: readonly THREE.Color[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, matrices.length));
  mesh.count = matrices.length;
  matrices.forEach((m, i) => {
    mesh.setMatrixAt(i, m);
    if (colours) mesh.setColorAt(i, colours[i]);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

const SCHEMES = {
  blueorange: 'Blue data cables and bright orange fibre.',
  blue: 'All the same blue, a uniform install.',
  mixed: 'A rainbow mix of patch colours.',
  black: 'Black power cables with one yellow-green earth.',
  grey: 'Grey and beige, an old building.',
} as const;
const SCHEME_COLOURS: Record<keyof typeof SCHEMES, string[]> = {
  blueorange: ['#2a6fd6', '#2f7ae0', '#2562c4', '#f08a1c', '#f5901e', '#3b78cc', '#f07a10'],
  blue: ['#2a6fd6', '#2f7ae0', '#2562c4', '#3470d0'],
  mixed: ['#e03a3a', '#2a6fd6', '#f0b41c', '#3cb04a', '#8a46c8', '#f08a1c', '#e8e8e8', '#20b8c8'],
  black: ['#232323', '#262628', '#1f1f22', '#2a2a2c', '#b6c836'],
  grey: ['#9a9a96', '#b6b2a4', '#8c8c88', '#c8c2b0', '#a8a49a'],
};

/** A polyline the ants follow, with the surface normal of each leg so they stand on rods as well as cables. */
interface Leg { from: THREE.Vector3; to: THREE.Vector3; normal: THREE.Vector3; spread: number; length: number }

export default defineThing({
  questions: {
    ants: score('How many ants are marching on it?', ['A trickle of a dozen scouts', 'A thin single file', 'A busy stream', 'A thick column several abreast', 'A black carpet, the mesh crawling']),
    carry: choice('What are the ants carrying?', {
      nothing: 'Nothing: a bare marching line.',
      crumbs: 'Pale crumbs from somebody\'s sandwich.',
      scraps: 'Snipped scraps of coloured cable jacket.',
      chips: 'Tiny glowing green chips, each lit like a pixel.',
      eggs: 'White pupae, a whole nest on the move.',
    }),
    source: choice('Where do the ants come from?', {
      rod: 'Down one drop rod from the ceiling, then along the tray and off the far end.',
      hole: 'Out of a dark cable hole in the ceiling slab, down the rod and along the tray.',
      end: 'In at one end of the tray and out the other, the tray a highway.',
      mill: 'Nowhere: they circle in a closed mill on top of the cables, round and round.',
    }),
    tidy: choice('How are the cables laid in the tray?', {
      laced: 'Laced in neat parallel rows with velcro straps every half metre.',
      bundled: 'Loose bundles that mostly run straight.',
      spaghetti: 'A spaghetti tangle, loops climbing over the sides.',
      overflow: 'Heaped over the brim with loops hanging down one side.',
    }),
    scheme: choice('What colour are the cables?', SCHEMES),
    chewed: noul('Has a cable been chewed through to bare copper?'),
    tag: choice('What tag hangs from the tray?', {
      none: 'No tag.',
      fibre: 'A laminated FIBRE - DO NOT CUT tag.',
      ants: 'A hand-written note: ANTS?? CALL FACILITIES.',
      zone: 'A printed zone label: TRAY B-12.',
      hot: 'A red tag: LIVE - 400V.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const L = 1.3, W = 0.3, FLOOR = 0.035, BRIM = 0.145, CEIL = 0.5, ROD_Z = -0.21, HANG = [-0.4, 0.4];
    const galv = s.material(mood.wear > 0.65 ? '#a79c90' : '#b4b9bd', { metalness: 0.7, roughness: 0.45 });
    const steel = s.material('#8f9498', { metalness: 0.75, roughness: 0.4 });
    const concrete = s.material('#a39f98', { roughness: 0.96 });
    const black = s.material('#1c1c1e', { roughness: 0.7 });

    // The basket: longitudinal wires, U-shaped cross wires and a heavier top rim, all one instanced mesh.
    const wire = new THREE.BoxGeometry(1, 1, 1);
    const wires: THREE.Matrix4[] = [];
    const bar = (size: P3, at: P3) => wires.push(new THREE.Matrix4().makeScale(...size).setPosition(...at));
    for (let i = 0; i <= 6; i++) bar([L, 0.008, 0.008], [0, FLOOR, -W / 2 + i * 0.05]);
    for (const side of [-1, 1]) {
      bar([L, 0.008, 0.008], [0, (FLOOR + BRIM) / 2, side * W / 2]);
      bar([L, 0.012, 0.012], [0, BRIM, side * W / 2]);
    }
    for (let i = 0; i <= 13; i++) {
      const x = -L / 2 + i * 0.1;
      bar([0.008, 0.008, W + 0.008], [x, FLOOR, 0]);
      for (const side of [-1, 1]) bar([0.008, BRIM - FLOOR, 0.008], [x, (FLOOR + BRIM) / 2, side * W / 2]);
    }
    s.root.add(instanced(wire, galv, wires));

    // Two cantilever hangers: a strut arm under the tray, a threaded rod up to an anchor in a slab of ceiling.
    for (const hx of HANG) {
      s.box([0.041, 0.021, 0.42], [hx, 0.0105, -0.03], steel);
      s.cylinder(0.006, 0.006, CEIL - 0.02, [hx, 0.02 + (CEIL - 0.02) / 2, ROD_Z], steel, 10);
      s.cylinder(0.012, 0.012, 0.009, [hx, 0.026, ROD_Z], steel, 6);
      s.cylinder(0.012, 0.012, 0.009, [hx, CEIL - 0.012, ROD_Z], steel, 6);
      s.cylinder(0.03, 0.03, 0.006, [hx, CEIL - 0.003, ROD_Z], steel, 16);
    }
    s.box([L + 0.1, 0.07, 0.46], [0, CEIL + 0.035, -0.06], concrete);
    if (a.source === 'hole') {
      s.cylinder(0.045, 0.045, 0.074, [HANG[0] + 0.05, CEIL + 0.035, ROD_Z + 0.03], black, 20);
      for (const [y, flip] of [[CEIL - 0.002, Math.PI / 2], [CEIL + 0.072, -Math.PI / 2]] as const) {
        const smear = s.mesh(new THREE.CircleGeometry(0.11, 20), new THREE.MeshStandardMaterial({ color: '#3a3430', transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 }), [HANG[0] + 0.06, y, ROD_Z + 0.03]);
        smear.rotation.x = flip;
        smear.scale.x = 1.5;
      }
    }

    // Cables, laid as the tidiness question says. Density adds more of them.
    const palette = SCHEME_COLOURS[a.scheme];
    const count = Math.round(mix(8, 18, mood.density));
    const radius = 0.008;
    const perRow = 14;
    const cableMaterials = new Map<string, THREE.Material>();
    const paint = (colour: string) => {
      if (!cableMaterials.has(colour)) cableMaterials.set(colour, s.material(colour, { roughness: 0.55 }));
      return cableMaterials.get(colour)!;
    };
    const lay = (points: P3[], colour: string, r = radius) => s.tube(points, r, paint(colour));
    let top = FLOOR + radius * 2 * Math.ceil(count / perRow) + 0.004;
    for (let i = 0; i < count; i++) {
      const colour = a.scheme === 'black' && i === 2 ? '#b6c836' : pick(palette);
      const row = Math.floor(i / perRow), col = i % perRow;
      const z0 = -0.11 + (col + 0.5) * (0.22 / perRow), y0 = FLOOR + radius + row * radius * 2 + 0.002;
      const points: P3[] = [];
      if (a.tidy === 'laced' || a.tidy === 'bundled') {
        const jitter = a.tidy === 'laced' ? 0.0015 : 0.009;
        const drift = a.tidy === 'bundled' ? (random() - 0.5) * 0.06 : 0;
        for (let k = 0; k <= 6; k++) {
          const t = k / 6;
          points.push([-L / 2 - 0.06 + t * (L + 0.12), y0 + (random() - 0.5) * jitter, z0 + (random() - 0.5) * jitter + Math.sin(t * Math.PI) * drift]);
        }
      } else if (a.tidy === 'spaghetti') {
        for (let k = 0; k <= 7; k++) {
          const t = k / 7;
          const loop = random() < 0.3;
          points.push([-L / 2 - 0.04 + t * (L + 0.08) + (random() - 0.5) * 0.08, loop ? mix(0.12, 0.2, random()) : mix(FLOOR + radius, 0.1, random()), (random() - 0.5) * (loop ? 0.36 : 0.22)]);
        }
        top = 0.1;
      } else {
        // Overflow: heaped high, and some loops hang out over the front rim.
        const hang = random() < 0.35;
        const x0 = mix(-L / 2 + 0.1, L / 2 - 0.58, random());
        if (hang) points.push([-L / 2 - 0.04, y0 + 0.04, z0], [x0, y0 + 0.05, 0.06], [x0 + 0.06, 0.14, 0.17], [x0 + 0.12, -0.08, 0.22], [x0 + 0.22, -0.2 - random() * 0.08, 0.24], [x0 + 0.34, -0.08, 0.22], [x0 + 0.4, 0.14, 0.17], [x0 + 0.46, y0 + 0.05, 0.06], [L / 2 + 0.04, y0 + 0.04, z0]);
        else for (let k = 0; k <= 6; k++) points.push([-L / 2 - 0.06 + (k / 6) * (L + 0.12), y0 + 0.03 + (random() - 0.5) * 0.03 + Math.sin(k) * 0.02, z0 + (random() - 0.5) * 0.04]);
        top = 0.1;
      }
      lay(points, colour);
    }
    if (a.tidy === 'laced') for (let x = -L / 2 + 0.25; x < L / 2 - 0.2; x += 0.4) s.box([0.014, top - FLOOR + 0.006, 0.235], [x + (random() - 0.5) * 0.05, (FLOOR + top) / 2, 0], black);

    // One cable bitten through: the jacket ends frayed, bright copper in between, crumbs of jacket below.
    if (a.chewed) {
      const colour = pick(palette);
      const cx = mix(-0.25, 0.25, random()), cy = top + 0.004, cz = 0.06;
      lay([[-L / 2 - 0.05, cy - 0.01, cz + 0.02], [cx - 0.3, cy, cz], [cx - 0.08, cy, cz]], colour);
      lay([[cx + 0.08, cy, cz], [cx + 0.3, cy, cz], [L / 2 + 0.05, cy - 0.01, cz + 0.02]], colour);
      const copper = s.material('#c8762a', { metalness: 0.9, roughness: 0.3 });
      s.cylinder(0.0035, 0.0035, 0.18, [cx, cy, cz], copper, 8).rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) s.cylinder(side < 0 ? radius : 0.004, side < 0 ? 0.004 : radius, 0.02, [cx + side * 0.085, cy, cz], paint(colour), 8).rotation.z = Math.PI / 2;
      const crumbs: THREE.Matrix4[] = [];
      for (let i = 0; i < 24; i++) crumbs.push(new THREE.Matrix4().makeRotationY(random() * Math.PI).multiply(new THREE.Matrix4().makeScale(0.004 + random() * 0.004, 0.002, 0.003)).setPosition(cx + (random() - 0.5) * 0.3, FLOOR + 0.004, (random() - 0.5) * 0.2));
      s.root.add(instanced(new THREE.BoxGeometry(1, 1, 1), paint(colour), crumbs));
    }

    if (a.tag !== 'none') {
      const text = { fibre: 'FIBRE - DO NOT CUT', ants: 'ANTS?? CALL FACILITIES', zone: 'TRAY B-12', hot: 'LIVE - 400V' }[a.tag];
      const paper = { fibre: '#f5d93a', ants: '#f7efc0', zone: '#f2f2ee', hot: '#d8302a' }[a.tag];
      const ink = a.tag === 'hot' ? '#ffffff' : '#2a2a30';
      const tx = mix(0.1, 0.45, random());
      const label = s.label(text, 0.3, 0.14, [tx, BRIM - 0.09, W / 2 + 0.014], ink, paper);
      label.rotation.z = (random() - 0.5) * 0.2;
      s.rod([tx, BRIM, W / 2 + 0.005], [tx, BRIM - 0.02, W / 2 + 0.014], 0.002, black);
    }

    // The ants' road: legs with the normal they stand on, so they cling to the rod as well as the cables.
    const legs: Leg[] = [];
    const road = (points: readonly (readonly [P3, P3, number])[]) => {
      for (let i = 0; i + 1 < points.length; i++) {
        const [from, normal, spread] = points[i], [to] = points[i + 1];
        const f = new THREE.Vector3(...from), t = new THREE.Vector3(...to);
        legs.push({ from: f, to: t, normal: new THREE.Vector3(...normal), spread, length: f.distanceTo(t) });
      }
    };
    const UP: P3 = [0, 1, 0], OUT: P3 = [0, 0, 1];
    const walk = top + 0.003;
    const hx = HANG[0];
    const wander = (from: number, to: number, steps: number): [P3, P3, number][] =>
      Array.from({ length: steps + 1 }, (_u, k) => [[mix(from, to, k / steps), walk, (random() - 0.5) * 0.12], UP, 1] as [P3, P3, number]);
    if (a.source === 'rod' || a.source === 'hole') {
      road([[[hx, CEIL - 0.01, ROD_Z + 0.009], OUT, 0.12], [[hx, BRIM + 0.02, ROD_Z + 0.009], OUT, 0.12], [[hx, BRIM + 0.008, -W / 2], UP, 0.3], [[hx + 0.04, walk, -0.08], UP, 1], ...wander(hx + 0.1, L / 2 - 0.1, 5), [[L / 2 + 0.01, walk - 0.01, 0.02], UP, 1]]);
    } else if (a.source === 'end') {
      road([[[-L / 2 - 0.03, walk - 0.01, 0.01], UP, 1], ...wander(-L / 2 + 0.05, L / 2 - 0.05, 7), [[L / 2 + 0.03, walk - 0.01, -0.01], UP, 1]]);
    } else {
      const ring: [P3, P3, number][] = [];
      for (let k = 0; k <= 28; k++) {
        const t = (k / 28) * Math.PI * 2;
        ring.push([[0.05 + Math.cos(t) * 0.28, walk, Math.sin(t) * 0.085], UP, 0.8]);
      }
      road(ring);
    }
    const total = legs.reduce((sum, leg) => sum + leg.length, 0);
    const spread = mix(0.004, 0.1, a.ants * a.ants);

    // The ant itself: three beads in a row, 18 mm long, standing on its own y = 0 and walking along +x.
    const AS = 2.6;
    const bead = (sx: number, sy: number, sz: number, x: number, y: number) => new THREE.SphereGeometry(1, 7, 5).scale(sx * AS, sy * AS, sz * AS).translate(x * AS, y * AS, 0);
    const antGeometry = mergeGeometries([bead(0.0055, 0.0035, 0.0036, -0.0045, 0.0038), bead(0.003, 0.0026, 0.0026, 0.0015, 0.004), bead(0.0028, 0.0028, 0.0026, 0.0058, 0.0046)]);
    const antMaterial = s.material('#131110', { roughness: 0.55 });
    const n = Math.round(14 * Math.pow(50, a.ants));
    const ants = Array.from({ length: n }, () => ({
      u: random() * total,
      side: (random() - 0.5) * 2 * spread,
      pace: mix(0.7, 1.3, random()),
      laden: a.carry !== 'nothing' && random() < 0.6,
    }));
    const cargoColour = { nothing: '#000000', crumbs: '#efe2c0', scraps: pick(palette), chips: '#7cff6a', eggs: '#f6f2e8' }[a.carry];
    const cargoMaterial = a.carry === 'chips'
      ? new THREE.MeshStandardMaterial({ color: '#9affa0', emissive: '#4cff5a', emissiveIntensity: mix(0.8, 2.2, mood.cheer), roughness: 0.4 })
      : s.material(cargoColour, { roughness: 0.8 });
    const cargoGeometry = a.carry === 'eggs' ? new THREE.SphereGeometry(1, 6, 4).scale(0.004 * AS, 0.0028 * AS, 0.0028 * AS) : new THREE.BoxGeometry(0.0055 * AS, 0.0035 * AS, 0.0045 * AS);
    const cargoColours = ants.map(() => new THREE.Color(a.carry === 'scraps' ? pick(palette) : cargoColour));

    const forward = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), at = new THREE.Vector3();
    const basis = new THREE.Matrix4(), carried = new THREE.Matrix4(), lift = new THREE.Matrix4().makeTranslation(0.004 * AS, 0.0075 * AS, 0);
    const matrixOf = (ant: (typeof ants)[number], out: THREE.Matrix4) => {
      let u = ant.u % total;
      let leg = legs[0];
      for (const candidate of legs) {
        if (u <= candidate.length) { leg = candidate; break; }
        u -= candidate.length;
      }
      forward.subVectors(leg.to, leg.from).normalize();
      right.crossVectors(leg.normal, forward).normalize();
      up.crossVectors(forward, right).normalize();
      at.copy(leg.from).addScaledVector(forward, u).addScaledVector(right, ant.side * leg.spread);
      basis.makeBasis(forward, up, right).setPosition(at);
      out.copy(basis);
    };
    const antMatrices = ants.map((ant) => { const m = new THREE.Matrix4(); matrixOf(ant, m); return m; });
    const antMesh = instanced(antGeometry, antMaterial, antMatrices);
    s.root.add(antMesh);
    const laden = ants.map((ant, i) => i).filter((i) => ants[i].laden);
    const cargoMesh = laden.length ? instanced(cargoGeometry, cargoMaterial, laden.map((i) => carried.copy(antMatrices[i]).multiply(lift).clone()), laden.map((i) => cargoColours[i])) : null;
    if (cargoMesh) s.root.add(cargoMesh);

    const speed = mix(0, 0.05, mood.energy);
    const scratch = new THREE.Matrix4();
    return s.finish({
      update(dt) {
        if (speed === 0) return;
        ants.forEach((ant, i) => {
          ant.u = (ant.u + dt * speed * ant.pace) % total;
          matrixOf(ant, scratch);
          antMesh.setMatrixAt(i, scratch);
        });
        antMesh.instanceMatrix.needsUpdate = true;
        if (cargoMesh) {
          laden.forEach((i, k) => {
            antMesh.getMatrixAt(i, scratch);
            cargoMesh.setMatrixAt(k, carried.copy(scratch).multiply(lift));
          });
          cargoMesh.instanceMatrix.needsUpdate = true;
        }
      },
    });
  },
});
