import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type Figure, mix, noul } from '@conjure/kit';

type P = [number, number, number];
const RAD = Math.PI / 180;

/** Reach the figure's arm joints through its hands, so the arms can be re-posed after it is built. */
function rig(person: Figure) {
  const arm = (side: 'left' | 'right') => {
    const wrist = person.hands[side].parent!, elbow = wrist.parent!, shoulder = elbow.parent!;
    elbow.rotation.order = 'YXZ';
    return { shoulder, elbow, wrist };
  };
  return { left: arm('left'), right: arm('right') };
}

/** Half-width of the hull at a point along its length: pointed bow, square stern. */
const beam = (t: number, half: number) => half * Math.min(1, Math.sin(Math.min(1, t * 1.6) * Math.PI / 2) ** 0.6) * (t > 0.9 ? 0.92 : 1);

export default defineThing({
  questions: {
    waiting: choice('What does he wait for?', {
      fare: 'A first fare: looking back up the steps for anyone coming down.',
      priest: 'A priest with an offering: a garland hung ready on the bow.',
      sun: 'The sun: facing out over the water, in no hurry at all.',
      rain: 'The rain to stop: a tarpaulin pulled half over the boat.',
    }),
    cargo: choice('What is stacked in the boat?', {
      baskets: 'Baskets of marigolds, orange heaped over the rims.',
      cushion: 'A tourist\'s flowered cushion and a folded umbrella.',
      nets: 'A heap of fishing net and a float.',
      nothing: 'Nothing: bare planks and a little bilge water.',
    }),
    hull: choice('What colour is the hull?', {
      blue: 'Blue planks with a white gunwale.',
      green: 'Green planks with a red stripe.',
      tar: 'Black with tar, the planks showing through.',
      weathered: 'Bare grey weathered wood.',
      red: 'Red and white in bands.',
    }),
    boatman: choice('Who is the boatman?', {
      old: 'An old man, thin, in a grey shawl.',
      young: 'A young man in a red t-shirt, lean and bored.',
      boy: 'A boy of twelve, swallowed by his father\'s shawl.',
    }),
    hook: choice('What hangs from the bow hook?', {
      lantern: 'A hurricane lantern, still lit.',
      garland: 'A marigold garland.',
      flag: 'A small orange pennant.',
      nothing: 'Only the empty hook.',
    }),
    brazier: noul('Does a kettle sit on a small coal brazier beside him?'),
    second: noul('Does a second boat lie alongside, empty?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const L = 3.1, HALF = 0.55, DEPTH = 0.42;
    const hullColour = { blue: '#2f5f9e', green: '#3f7a4a', tar: '#26241f', weathered: '#9a948a', red: '#b8302a' }[a.hull];
    const trimColour = { blue: '#efece2', green: '#b8302a', tar: '#4a4038', weathered: '#7d786e', red: '#efece2' }[a.hull];
    const wood = s.material('#8a6a44', { roughness: 0.85 });

    /** A plank hull: three overlapping strakes a side, a bottom, ribs, a bow post and a stern board. */
    const hullAt = (origin: P, turn: number) => {
      const group = new THREE.Group();
      group.position.set(...origin);
      group.rotation.y = turn;
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh; };
      const plank = s.material(hullColour, { roughness: 0.8 });
      const trim = s.material(trimColour, { roughness: 0.7 });
      const segments = 12;
      const strakes = 3;
      const instanced = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), plank, segments * strakes * 2);
      const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      let index = 0;
      for (let side = -1; side <= 1; side += 2) for (let strake = 0; strake < strakes; strake++) for (let i = 0; i < segments; i++) {
        const t0 = i / segments, t1 = (i + 1) / segments;
        const y0 = 0.05 + strake * (DEPTH / strakes), h = DEPTH / strakes + 0.02;
        const flare = 1 + strake * 0.09;
        const x0 = -L / 2 + t0 * L, x1 = -L / 2 + t1 * L;
        const z0 = side * beam(t0, HALF) * flare, z1 = side * beam(t1, HALF) * flare;
        const len = Math.hypot(x1 - x0, z1 - z0);
        e.set(0, -Math.atan2(z1 - z0, x1 - x0), 0);
        q.setFromEuler(e);
        matrix.compose(new THREE.Vector3((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2), q, new THREE.Vector3(len + 0.012, h, 0.03));
        instanced.setMatrixAt(index++, matrix);
      }
      instanced.instanceMatrix.needsUpdate = true;
      add(instanced);
      // The bottom: a flat shape following the plan.
      const shape = new THREE.Shape();
      for (let i = 0; i <= segments; i++) { const t = i / segments; const x = -L / 2 + t * L; i === 0 ? shape.moveTo(x, beam(t, HALF)) : shape.lineTo(x, beam(t, HALF)); }
      for (let i = segments; i >= 0; i--) { const t = i / segments; shape.lineTo(-L / 2 + t * L, -beam(t, HALF)); }
      const bottom = add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false }), s.material(hullColour, { roughness: 0.9 })));
      bottom.rotation.x = Math.PI / 2;
      bottom.position.y = 0.055;
      // Gunwale rail, ribs, stern board, bow post.
      for (let side = -1; side <= 1; side += 2) for (let i = 0; i < segments; i++) {
        const t0 = i / segments, t1 = (i + 1) / segments;
        const x0 = -L / 2 + t0 * L, x1 = -L / 2 + t1 * L, z0 = side * beam(t0, HALF) * 1.18, z1 = side * beam(t1, HALF) * 1.18;
        const rail = add(new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(x1 - x0, z1 - z0) + 0.02, 0.035, 0.05), trim));
        rail.position.set((x0 + x1) / 2, DEPTH + 0.07, (z0 + z1) / 2);
        rail.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      }
      for (let i = 1; i < 6; i++) {
        const t = i / 6, x = -L / 2 + t * L;
        const rib = add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, beam(t, HALF) * 2.1), wood));
        rib.position.set(x, 0.095, 0);
      }
      const stern = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, DEPTH + 0.05, HALF * 2 * 0.92 * 1.1), trim));
      stern.position.set(L / 2, DEPTH / 2 + 0.06, 0);
      const post = add(new THREE.Mesh(new THREE.BoxGeometry(0.07, DEPTH + 0.2, 0.07), trim));
      post.position.set(-L / 2 + 0.02, DEPTH / 2 + 0.1, 0);
      // Benches.
      for (const x of [-L * 0.28, L * 0.12]) { const bench = add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, beam(0.5, HALF) * 2.05), wood)); bench.position.set(x, DEPTH - 0.02, 0); }
      s.root.add(group);
      return group;
    };

    // The boat lies across the view, bow to the left, on a stone step with its stern in the water.
    const tilt = 0.06;
    const boat = hullAt([0, 0, 0], 0);
    boat.rotation.z = tilt;
    boat.position.y = 0.04;
    const slab = s.box([2.2, 0.08, 1.6], [-0.9, 0.04, 0], s.material(new THREE.Color('#b3a58d').lerp(new THREE.Color('#5a5a52'), mood.wear * 0.4), { roughness: 0.92 }));
    void slab;
    if (a.second) {
      const other = hullAt([0.35, 0.03, 1.35], 0.08);
      other.rotation.z = tilt * 0.6;
      s.rod([-L / 2 + 0.1, DEPTH + 0.15, 0.1], [-L / 2 + 0.4, DEPTH + 0.1, 1.3], 0.012, s.material('#d5c79d'));
    }

    // The boatman on the forward bench, oars crossed on his knees.
    const HB = { old: 1.64, young: 1.74, boy: 1.3 }[a.boatman];
    const look = {
      old: { top: '#8c8a82', bottom: '#efece2', skin: '#7a5a46', hair: 'none' as const, shawl: '#8c8a82' },
      young: { top: '#c22a2a', bottom: '#3a3a44', skin: '#8a5a3c', hair: 'short' as const, shawl: '' },
      boy: { top: '#6a6a72', bottom: '#4a4a52', skin: '#8a5a3c', hair: 'short' as const, shawl: '#6a6a72' },
    }[a.boatman];
    const gaze = a.waiting === 'fare' ? 'over-shoulder' : a.waiting === 'sun' ? 'left' : 'ahead';
    const man = figure(s, { height: HB, build: 'slight', style: 'doll', pose: 'sitting', hair: look.hair, hairColor: '#2a1d14', skin: look.skin, top: look.top, bottom: look.bottom, shoes: look.skin, sleeves: look.shawl ? 'long' : 'short', gaze });
    const benchX = -L * 0.28, benchTop = DEPTH;
    const seat = Math.max(0.12, man.hipHeight - 0.03);
    man.root.position.set(benchX, benchTop + 0.04 - seat + 0.05, 0);
    man.root.rotation.y = Math.PI / 2;
    s.root.add(man.root);
    const joints = rig(man);
    for (const side of ['left', 'right'] as const) {
      const sign = side === 'left' ? 1 : -1;
      joints[side].shoulder.rotation.set(-28 * RAD, 0, sign * 10 * RAD);
      joints[side].elbow.rotation.set(-50 * RAD, -sign * 10 * RAD, 0);
    }
    man.root.updateMatrixWorld(true);
    const hips = man.pelvis.getWorldPosition(new THREE.Vector3());
    const head = man.head.getWorldPosition(new THREE.Vector3());
    const headR = HB * 0.064;
    if (look.shawl) {
      const shawl = s.mesh(new THREE.ConeGeometry(0.21 * HB / 1.7, 0.42 * HB / 1.7, 18, 1, true), s.material(look.shawl, { roughness: 0.95, side: THREE.DoubleSide }), [head.x, head.y - headR * 1.5 - 0.18 * HB / 1.7, head.z]);
      shawl.scale.z = 0.8;
    }
    // Oars crossed over the knees, blades out over the water.
    const oar = (from: P, to: P) => { s.rod(from, to, 0.016, wood); const blade = s.box([0.5, 0.02, 0.13], [to[0] + (to[0] - from[0]) * 0.08, to[1] + (to[1] - from[1]) * 0.08, to[2] + (to[2] - from[2]) * 0.08], wood); blade.lookAt(new THREE.Vector3(...from)); blade.rotateY(Math.PI / 2); };
    const kneeY = hips.y + 0.02, kneeX = hips.x + 0.2;
    oar([kneeX - 0.3, kneeY + 0.06, -0.95], [kneeX + 0.35, kneeY + 0.02, 1.1]);
    oar([kneeX - 0.2, kneeY + 0.1, 1.0], [kneeX + 0.42, kneeY + 0.05, -1.05]);

    // The bow hook and what hangs from it.
    const brass = s.material('#c9962e', { metalness: 0.75, roughness: 0.3 });
    const hookTop: P = [-L / 2 + 0.02, DEPTH + 0.45, 0];
    s.rod([-L / 2 + 0.02, DEPTH + 0.2, 0], hookTop, 0.014, s.material('#3a3836', { metalness: 0.5 }));
    s.rod(hookTop, [hookTop[0] - 0.18, hookTop[1] - 0.02, 0], 0.012, s.material('#3a3836', { metalness: 0.5 }));
    const hangAt: P = [hookTop[0] - 0.17, hookTop[1] - 0.05, 0];
    let flame: THREE.Mesh | null = null;
    if (a.hook === 'lantern') {
      const lantern = new THREE.Group();
      lantern.position.set(...hangAt);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), s.material('#3a3836', { metalness: 0.5 }));
      body.position.y = -0.16;
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 10, 1, true), new THREE.MeshStandardMaterial({ color: '#ffe6b0', emissive: '#ffb347', emissiveIntensity: mix(0.6, 1.6, 1 - mood.daylight * 0.6), transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
      glass.position.y = -0.05;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.04, 10), s.material('#3a3836', { metalness: 0.5 }));
      cap.position.y = 0.02;
      flame = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 6), new THREE.MeshStandardMaterial({ color: '#ffe9a0', emissive: '#ff8a10', emissiveIntensity: 2.5, transparent: true, opacity: 0.9, depthWrite: false }));
      flame.position.y = -0.07;
      body.castShadow = cap.castShadow = true;
      lantern.add(body, glass, cap, flame);
      s.root.add(lantern);
    }
    if (a.hook === 'garland' || a.waiting === 'priest') {
      const garland = s.mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 24), s.material('#f0831a', { emissive: '#7a3000', emissiveIntensity: 0.25, roughness: 0.9 }), [hangAt[0], hangAt[1] - 0.12, hangAt[2]]);
      garland.scale.y = 1.5;
    }
    if (a.hook === 'flag') {
      const flag = s.box([0.3, 0.14, 0.006], [hangAt[0] - 0.12, hangAt[1] + 0.1, hangAt[2]], s.material('#f0731a', { side: THREE.DoubleSide }));
      flag.rotation.y = 0.2;
    }

    // Cargo behind the bench.
    const cargoX = L * 0.12 + 0.35;
    if (a.cargo === 'baskets') for (let i = 0; i < 3; i++) {
      const bx = cargoX + (i % 2) * 0.42 - 0.1, bz = (i - 1) * 0.3;
      s.mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.2, 12, 1, true), s.material('#b48a4e', { roughness: 0.9, side: THREE.DoubleSide }), [bx, 0.2, bz]);
      s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#f0831a', { emissive: '#7a3000', emissiveIntensity: 0.25 }), Array.from({ length: 10 }, (_u, j) => { const t = random() * 6.3, d = random() * 0.15; return { at: [bx + Math.cos(t) * d, 0.31 + random() * 0.04, bz + Math.sin(t) * d] as P, size: 0.03 + random() * 0.012, color: j % 3 ? '#f0831a' : '#f2b21c' }; }));
    }
    if (a.cargo === 'cushion') {
      s.box([0.5, 0.1, 0.45], [cargoX, 0.15, 0], s.material('#c93a6a', { roughness: 0.95 }));
      s.scatter(new THREE.SphereGeometry(1, 5, 4), s.material('#f5d84a'), Array.from({ length: 8 }, () => ({ at: [cargoX + (random() - 0.5) * 0.4, 0.2, (random() - 0.5) * 0.35] as P, size: 0.02 })));
      const umbrella = s.cylinder(0.03, 0.04, 0.8, [cargoX + 0.2, 0.16, -0.25], s.material('#2a2a44'), 8);
      umbrella.rotation.z = Math.PI / 2 - 0.1;
    }
    if (a.cargo === 'nets') {
      s.ball([0.35, 0.16, 0.3], [cargoX, 0.2, 0], s.material('#5a6a5a', { roughness: 1 }), 12);
      s.ball([0.08, 0.08, 0.08], [cargoX + 0.25, 0.26, 0.2], s.material('#efece2'), 10);
    }
    if (a.cargo === 'nothing') {
      const bilge = s.mesh(new THREE.PlaneGeometry(1.0, 0.6), new THREE.MeshStandardMaterial({ color: '#6a7a78', transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.2, depthWrite: false }), [cargoX + 0.1, 0.11, 0]);
      bilge.rotation.x = -Math.PI / 2;
      bilge.castShadow = false;
    }
    if (a.waiting === 'rain') {
      const tarp = s.box([0.9, 0.02, 1.2], [L / 2 - 0.55, DEPTH + 0.14, 0], s.material('#2b4f8a', { roughness: 0.6, side: THREE.DoubleSide }));
      tarp.rotation.z = -0.08;
    }
    // The brazier and kettle beside him, on the bench.
    let ember: THREE.MeshStandardMaterial | null = null;
    if (a.brazier) {
      const bx = benchX, bz = -0.42;
      s.cylinder(0.1, 0.07, 0.12, [bx, benchTop + 0.06, bz], s.material('#3a3836', { metalness: 0.5, roughness: 0.6 }), 10);
      ember = new THREE.MeshStandardMaterial({ color: '#2a1a12', emissive: '#ff5a10', emissiveIntensity: mix(0.5, 1.6, mood.energy), roughness: 1 });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), ember, Array.from({ length: 6 }, () => ({ at: [bx + (random() - 0.5) * 0.1, benchTop + 0.11, bz + (random() - 0.5) * 0.1] as P, size: 0.025 })));
      s.lathe([[0, 0], [0.07, 0], [0.08, 0.06], [0.05, 0.1], [0.03, 0.11], [0, 0.11]], s.material('#9a9a94', { metalness: 0.7, roughness: 0.35 }), [bx, benchTop + 0.125, bz]);
      s.rod([bx + 0.07, benchTop + 0.17, bz], [bx + 0.14, benchTop + 0.23, bz], 0.008, s.material('#9a9a94', { metalness: 0.7, roughness: 0.35 }));
    }
    // Moored to the step: a rope to an iron ring.
    s.rod([-L / 2 + 0.05, DEPTH + 0.15, 0.05], [-1.6, 0.1, 0.45], 0.012, s.material('#d5c79d'));
    const ring = s.ring(0.06, 0.012, [-1.6, 0.09, 0.5], s.material('#3a3836', { metalness: 0.5 }));
    ring.rotation.x = Math.PI / 2;

    const energy = mood.energy;
    return s.finish({
      update(dt, time) {
        man.update(dt, time);
        if (flame) flame.scale.y = 1 + Math.sin(time * 9) * 0.15 * (0.3 + energy);
        if (ember) ember.emissiveIntensity = mix(0.5, 1.6, energy) * (1 + Math.sin(time * 3) * 0.15);
      },
    });
  },
});
