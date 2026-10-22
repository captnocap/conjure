import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const ORES = {
  nickel: 'Dull grey nickel-iron rubble, the ordinary paying dirt.',
  ice: 'Pale blue-white water ice, worth more than metal out here.',
  gold: 'Dark rock shot through with bright yellow flecks: a real strike.',
  copper: 'Rust-red and verdigris green copper ore.',
  carbon: 'Soot-black carbonaceous crumble, nearly worthless.',
  crystal: 'Violet crystal shards that catch the lamps.',
  hot: 'Sickly green glowing ore that nobody should be standing near.',
} as const;
const ORE_TINT: Record<keyof typeof ORES, { colours: string[]; glow: string; power: number }> = {
  nickel: { colours: ['#8a8d90', '#6f7275', '#a3a5a4'], glow: '#000000', power: 0 },
  ice: { colours: ['#cfe6f2', '#a9d2ea', '#eef8fb'], glow: '#7fc4ee', power: 0.25 },
  gold: { colours: ['#4c4238', '#e2b23a', '#5a4d40', '#f3cf58'], glow: '#e2a920', power: 0.3 },
  copper: { colours: ['#a3492f', '#3f9a84', '#7d3a2a'], glow: '#000000', power: 0 },
  carbon: { colours: ['#26262a', '#34343a', '#1c1c20'], glow: '#000000', power: 0 },
  crystal: { colours: ['#9a6fe0', '#c8a8f5', '#6a48b8'], glow: '#9a6fe0', power: 0.55 },
  hot: { colours: ['#5d6b3c', '#9df04a', '#3f4a2c'], glow: '#8cff3a', power: 0.9 },
};
const PAINT = {
  hazard: 'Hazard yellow with black chevrons, rental-yard standard.',
  oxide: 'Red oxide primer, never given its top coat.',
  bare: 'Bare scoured steel, every weld showing.',
  company: 'Company white with a blue band, corporate property.',
  teal: 'Hand-brushed teal, an owner-operator who loves the thing.',
} as const;
const PAINT_TINT: Record<keyof typeof PAINT, string> = { hazard: '#e2b21f', oxide: '#9c4a34', bare: '#8f979c', company: '#e6e8e4', teal: '#2f8f8a' };

/** A screw flight: a ribbon wound round the shaft, wider toward the top. */
function flight(inner: number, outer: (u: number) => number, height: number, turns: number) {
  const steps = Math.ceil(turns * 20);
  const positions: number[] = [], index: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, angle = u * turns * Math.PI * 2, y = u * height, r = outer(u);
    positions.push(Math.cos(angle) * inner, y + 0.06, Math.sin(angle) * inner, Math.cos(angle) * r, y, Math.sin(angle) * r);
  }
  for (let i = 0; i < steps; i++) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    state: choice('What is the rig doing right now?', {
      running: 'Running flat out: the bit spinning, spoil flying off the chute, dust hanging over the collar.',
      idling: 'Idling between shifts, lamps on, bit still, everything waiting.',
      seized: 'Seized solid: the bit jammed crooked in the hole, a red light going, a ladder and tools left against it.',
      abandoned: 'Abandoned: dark, a stay snapped and trailing, the pile long since picked over.',
    }),
    bit: choice('How big is the screw bit?', {
      core: 'A thin core-sampler bit, a prospecting needle.',
      standard: 'A standard working bit about as wide as a person.',
      wide: 'A wide production auger that fills the mast.',
      giant: 'A monstrous screw far too big for the rig carrying it.',
    }),
    ore: choice('What is it throwing up?', ORES),
    spoil: score('How much spoil has piled up beside it?', ['A few scattered lumps', 'A knee-high heap', 'A mound taller than a person', 'A slag hill burying the chute']),
    paint: choice('What is the rig painted like?', PAINT),
    stays: choice('How is it held down?', {
      three: 'Three harpoon stays, the minimum, trusting the rock.',
      four: 'Four stays, square and proper.',
      six: 'Six stays in a web, somebody afraid of it tearing loose.',
    }),
    cab: noul('Is there an operator cab hung on the mast?'),
    lamp: noul('Is a work lamp burning on the mast head?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = { core: 0.2, standard: 0.42, wide: 0.64, giant: 0.92 }[a.bit];
    const H = 5.2 + R * 1.6;
    const half = R + 0.5;
    const live = a.state === 'running' || a.state === 'idling';
    const ore = ORE_TINT[a.ore];
    const paint = s.material(PAINT_TINT[a.paint], { metalness: a.paint === 'bare' ? 0.7 : 0.25, roughness: a.paint === 'bare' ? 0.45 : 0.6 });
    const steel = s.material('#868d92', { metalness: 0.75, roughness: 0.38 });
    const dark = s.material('#2a2d30', { roughness: 0.7 });
    const stripe = s.material(a.paint === 'hazard' ? '#1d1d1f' : a.paint === 'company' ? '#2456a6' : '#d9a520');

    // Skid frame bolted to the rock.
    for (const z of [-1, 1]) s.box([half * 2 + 1.4, 0.2, 0.24], [0, 0.1, z * 1.05], paint);
    for (const x of [-1, 1]) s.box([0.24, 0.2, 2.34], [x * (half + 0.45), 0.1, 0], paint);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.cylinder(0.24, 0.28, 0.07, [x * (half + 0.7), 0.035, z * 1.05], steel, 8);
      s.cylinder(0.05, 0.05, 0.22, [x * (half + 0.7), 0.13, z * 1.05], dark, 6);
    }

    // The mast: two uprights, raking braces, a crosshead with the hoist sheave.
    for (const x of [-1, 1]) {
      s.box([0.22, H, 0.26], [x * half, H / 2, 0], paint);
      for (const z of [-1, 1]) s.rod([x * half, H * 0.42, 0], [x * (half + 0.45), 0.2, z * 1.05], 0.05, paint);
      for (let i = 0; i < 4; i++) s.box([0.24, 0.12, 0.28], [x * half, 0.9 + i * (H - 1.4) / 3, 0], stripe);
    }
    s.box([half * 2 + 0.7, 0.34, 0.46], [0, H + 0.17, 0], paint);
    s.cylinder(0.3, 0.3, 0.14, [0, H + 0.5, 0], steel, 16).rotation.x = Math.PI / 2;
    for (let i = 0; i < 12; i++) s.box([0.34, 0.035, 0.035], [half + 0.24, 0.5 + i * (H - 1) / 11, 0.16], steel);
    s.box([0.035, H - 0.6, 0.035], [half + 0.41, H / 2, 0.16], steel);

    // Drive head riding the mast, with its motor and gearbox.
    const headY = H - (a.state === 'running' ? 1.5 : a.state === 'seized' ? 2.0 : 1.0);
    s.box([half * 2 - 0.2, 0.62, 0.74], [0, headY, 0], dark);
    s.box([half * 2 - 0.16, 0.12, 0.78], [0, headY + 0.1, 0], stripe);
    s.cylinder(0.26, 0.26, 0.6, [-half * 0.45, headY + 0.5, -0.1], steel, 14);
    s.cylinder(0.12, 0.12, 0.36, [half * 0.4, headY + 0.42, 0.05], paint, 10);
    s.tube([[half * 0.4, headY + 0.6, 0.05], [half * 0.7, headY + 1.1, 0.2], [half * 0.2, H + 0.1, 0.1]], 0.035, dark);
    s.rod([0, headY + 0.3, 0], [0, H + 0.3, 0], 0.025, steel);

    // The bit itself.
    const bit = new THREE.Group();
    const bitSteel = s.material('#a4abb0', { metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide });
    const L = headY - 0.3;
    const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; bit.add(mesh); return mesh; };
    add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.26, R * 0.26, L, 14), bitSteel)).position.y = L / 2;
    add(new THREE.Mesh(new THREE.ConeGeometry(R * 0.55, 0.5, 6), s.material('#d8a13a', { metalness: 0.6, roughness: 0.35 }))).rotation.x = Math.PI;
    bit.children[1].position.y = 0.25;
    add(new THREE.Mesh(flight(R * 0.24, (u) => R * mix(0.55, 1, Math.min(1, u * 4)), L - 0.9, (L - 0.9) / (R * 1.15 + 0.12)), bitSteel)).position.y = 0.35;
    if (a.state === 'seized') { bit.rotation.z = 0.07; bit.rotation.x = -0.04; }
    s.root.add(bit);

    // Collar and deflector where the flights shed their load.
    s.ring(R + 0.16, 0.09, [0, 0.3, 0], dark).rotation.x = Math.PI / 2;
    s.cylinder(R + 0.2, R + 0.34, 0.26, [0, 0.13, 0], dark, 18).material = s.material('#3a3d40', { side: THREE.DoubleSide });

    // Spoil chute and the heap at its foot.
    const chute = new THREE.Group();
    const length = 2.5;
    const trough = (size: [number, number, number], at: [number, number, number]) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), paint);
      mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; chute.add(mesh);
    };
    trough([length, 0.05, 0.62], [length / 2, 0, 0]);
    for (const z of [-1, 1]) trough([length, 0.26, 0.05], [length / 2, 0.13, z * 0.31]);
    chute.position.set(R + 0.25, 1.15, 0.2);
    const heading = -0.62;
    chute.rotation.set(0, heading, -0.38);
    s.root.add(chute);
    const end = new THREE.Vector3(length, 0, 0).applyEuler(chute.rotation).add(chute.position);
    const mid = new THREE.Vector3(length * 0.5, 0, 0).applyEuler(chute.rotation).add(chute.position);
    for (const z of [-0.25, 0.25]) s.rod([mid.x, 0, mid.z + z], [mid.x, mid.y, mid.z + z], 0.035, steel);

    const lump = new THREE.DodecahedronGeometry(1, 0);
    const oreMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: a.ore === 'ice' || a.ore === 'crystal' ? 0.25 : 0.85, emissive: ore.glow, emissiveIntensity: ore.power * mix(0.5, 1, mood.energy) });
    const pick = () => ore.colours[Math.floor(random() * ore.colours.length)];
    const pileRadius = mix(0.45, 1.9, a.spoil), pileHeight = mix(0.12, 1.7, a.spoil);
    const heap: { at: [number, number, number]; size: number; color: string }[] = [];
    const pileX = end.x + pileRadius * 0.35, pileZ = end.z + pileRadius * 0.25;
    for (let i = 0; i < Math.round(mix(14, 150, a.spoil)); i++) {
      const r = Math.sqrt(random()) * pileRadius, angle = random() * Math.PI * 2;
      const size = mix(0.07, 0.2, random()) * mix(0.8, 1.3, a.spoil);
      heap.push({ at: [pileX + Math.cos(angle) * r, Math.max(size * 0.6, (1 - r / pileRadius) * pileHeight * mix(0.75, 1, random())), pileZ + Math.sin(angle) * r], size, color: pick() });
    }
    // A solid core so a big heap reads as a mound and not as a cloud.
    if (a.spoil > 0.25) s.mesh(new THREE.ConeGeometry(pileRadius * 0.82, pileHeight * 0.95, 9), new THREE.MeshStandardMaterial({ color: ore.colours[0], roughness: 0.9, flatShading: true }), [pileX, pileHeight * 0.47, pileZ]);
    if (a.state === 'running') {
      for (let i = 0; i < 16; i++) {
        const t = random();
        heap.push({ at: [mix(chute.position.x, end.x, t) + (random() - 0.5) * 0.3, mix(chute.position.y, end.y, t) + 0.15 + random() * 0.5, mix(chute.position.z, end.z, t) + (random() - 0.5) * 0.3], size: mix(0.05, 0.13, random()), color: pick() });
      }
      for (let i = 0; i < 12; i++) {
        const angle = random() * Math.PI * 2, r = R + 0.3 + random() * 0.9;
        heap.push({ at: [Math.cos(angle) * r, 0.4 + random() * 1.6, Math.sin(angle) * r * 0.8], size: mix(0.04, 0.1, random()), color: pick() });
      }
      const dust = new THREE.MeshStandardMaterial({ color: ore.colours[0], transparent: true, opacity: 0.16, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 5; i++) s.ball([0.7 + random() * 0.5, 0.5 + random() * 0.4, 0.7 + random() * 0.5], [(random() - 0.5) * 1.2, 0.5 + random() * 0.9, (random() - 0.5) * 1.2], dust, 10).castShadow = false;
    }
    s.scatter(lump, oreMaterial, heap);

    // Harpoon stays.
    const count = { three: 3, four: 4, six: 6 }[a.stays];
    const top: [number, number, number] = [0, H + 0.3, 0];
    for (let i = 0; i < count; i++) {
      const angle = (i + 0.5) / count * Math.PI * 2 + (count === 3 ? 0.5 : 0) + (random() - 0.5) * 0.2;
      const reach = 3.3 + random() * 0.6 + R;
      const ax = Math.cos(angle) * reach, az = Math.sin(angle) * reach * 0.82;
      const eye: [number, number, number] = [ax, 0.42, az];
      s.rod([ax * 1.1, 0, az * 1.1], eye, 0.065, steel, 0.045);
      s.ring(0.09, 0.03, eye, steel);
      s.cylinder(0.16, 0.2, 0.05, [ax * 1.1, 0.025, az * 1.1], dark, 6);
      for (const k of [0.35, 0.6]) s.mesh(new THREE.ConeGeometry(0.11, 0.16, 4), steel, [mix(ax * 1.1, ax, k), mix(0, 0.42, k), mix(az * 1.1, az, k)]);
      if (i === 0 && a.state === 'abandoned') {
        s.tube([top, [ax * 0.12, H * 0.6, az * 0.12], [ax * 0.2, H * 0.3, az * 0.16], [ax * 0.16, 1.2, az * 0.2]], 0.025, dark);
        s.tube([eye, [ax * 0.86, 0.06, az * 0.9], [ax * 0.7 + 0.3, 0.05, az * 0.72], [ax * 0.58, 0.05, az * 0.66 + 0.3]], 0.025, dark);
        continue;
      }
      s.rod(top, eye, 0.022, dark);
      s.rod([mix(0, ax, 0.72), mix(top[1], 0.42, 0.72), mix(0, az, 0.72)], [mix(0, ax, 0.8), mix(top[1], 0.42, 0.8), mix(0, az, 0.8)], 0.05, stripe);
    }

    if (a.cab) {
      const cx = -half - 0.75;
      s.box([1.1, 1.3, 1.1], [cx, 2.3, 0], paint);
      s.box([1.2, 0.08, 1.2], [cx, 2.99, 0], dark);
      s.box([0.8, 0.55, 0.04], [cx, 2.5, 0.56], s.material(live ? '#ffe9a8' : '#33414a', { emissive: live ? '#ffd27a' : '#000000', emissiveIntensity: live ? 0.9 : 0, roughness: 0.2 }));
      s.box([0.04, 0.55, 0.8], [cx - 0.56, 2.5, 0], s.material('#33414a', { roughness: 0.2 }));
      s.rod([cx, 1.65, 0], [-half, 1.2, 0], 0.05, steel);
      s.box([0.5, 0.06, 1.1], [cx + 0.5, 1.65, 0], steel);
    }

    // Lamp and status beacon.
    const lampOn = a.lamp && a.state !== 'abandoned';
    if (a.lamp) {
      s.box([0.5, 0.2, 0.34], [half * 0.55, H - 0.12, 0.34], dark).rotation.x = 0.5;
      s.box([0.42, 0.03, 0.28], [half * 0.55, H - 0.25, 0.4], new THREE.MeshStandardMaterial({ color: lampOn ? '#fff6d8' : '#5c6064', emissive: lampOn ? new THREE.Color().setHSL(mix(0.58, 0.11, mood.warmth), 0.8, 0.7) : new THREE.Color('#000000'), emissiveIntensity: lampOn ? 1.6 : 0 })).rotation.x = 0.5;
      if (lampOn) s.mesh(new THREE.ConeGeometry(1.5, H - 0.4, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }), [half * 0.55, (H - 0.4) / 2, 0.5]).castShadow = false;
    }
    const beaconColour = { running: '#ffb020', idling: '#49d66b', seized: '#ff2a1c', abandoned: '#3a3a3a' }[a.state];
    s.cylinder(0.05, 0.05, 0.3, [-half, H + 0.48, 0], dark, 6);
    const beacon = s.ball([0.13, 0.13, 0.13], [-half, H + 0.7, 0], new THREE.MeshStandardMaterial({ color: beaconColour, emissive: beaconColour, emissiveIntensity: a.state === 'abandoned' ? 0 : 1.4 }), 10);

    if (a.state === 'seized') {
      // A ladder and a breaker bar left where the crew gave up.
      for (const z of [-0.2, 0.2]) s.rod([-half - 1.0, 0, 0.9 + z], [-half * 0.3, headY - 0.3, 0.4 + z], 0.03, steel);
      for (let i = 1; i < 8; i++) s.rod([mix(-half - 1.0, -half * 0.3, i / 8), headY * i / 8 - 0.04 * i, mix(0.7, 0.2, i / 8)], [mix(-half - 1.0, -half * 0.3, i / 8), headY * i / 8 - 0.04 * i, mix(1.1, 0.6, i / 8)], 0.02, steel);
      s.rod([0.5, 0.05, 1.5], [1.6, 0.08, 1.2], 0.04, s.material('#b3352a'));
    }

    const speed = a.state === 'running' ? mix(1.2, 7, mood.energy) : 0;
    return s.finish({
      footprint: half + 1.6,
      update: (dt, time) => {
        bit.rotation.y -= dt * speed;
        if (a.state === 'seized') (beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(time * 6) > 0 ? 1.8 : 0.2;
      },
    });
  },
});
