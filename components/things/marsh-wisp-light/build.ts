import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Xf = { p: [number, number, number]; r: [number, number, number]; s?: [number, number, number]; c: THREE.Color };

function instances(root: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, list: Xf[]) {
  if (!list.length) { geometry.dispose(); material.dispose(); return; }
  const mesh = new THREE.InstancedMesh(geometry, material, list.length);
  const d = new THREE.Object3D();
  d.rotation.order = 'YXZ';
  list.forEach((it, i) => {
    d.position.set(...it.p);
    d.rotation.set(...it.r);
    d.scale.set(...(it.s ?? [1, 1, 1]));
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
    mesh.setColorAt(i, it.c);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
}

const COLOURS = {
  corpse: 'Blue-green corpse light, the classic marsh fire.',
  blue: 'Cold pale blue, like a gas flame turned low.',
  sickly: 'Sickly yellow-green, phosphorescent and wrong.',
  ghost: 'Pale violet-white, barely there.',
  amber: 'Warm amber, exactly like a cottage window: the cruellest kind.',
  ember: 'A dull blood red, a warning nobody heeds.',
} as const;
const HEX: Record<keyof typeof COLOURS, string> = { corpse: '#2fd9b4', blue: '#4f9dff', sickly: '#a9d92a', ghost: '#b7a4ff', amber: '#ffa63a', ember: '#f04a3a' };

export default defineThing({
  questions: {
    count: choice('How many lights are there?', {
      one: 'A single flame, alone.',
      pair: 'Two, close together, like eyes or like companions.',
      trail: 'A line of four or five receding across the water, each smaller: follow me.',
      ring: 'A ring of them circling slowly, a dance.',
      swarm: 'A scatter of many small sparks, like a distant procession.',
    }),
    form: choice('What shape is each light?', {
      candle: 'An upright teardrop flame with no candle under it.',
      orb: 'A round soft ball of light.',
      wisp: 'A flame with a long thin tail curling up into nothing.',
      carried: 'A flame held at hand height by a faint hooded shape made of mist.',
    }),
    colour: choice('What colour do they burn?', COLOURS),
    height: score('How high do they hover?', ['Skimming the water', 'Knee high', 'Head high, like a carried lantern']),
    pool: choice('What do they hover over?', {
      round: 'A round black pool with a mossy rim.',
      reeds: 'A mire thick with reeds and rushes, open water only in the middle.',
      stones: 'A pool with a line of stepping stones that stops halfway across.',
      cutting: 'A straight-sided flooded turf cutting, long and narrow like a grave.',
    }),
    lure: choice('What shows that someone followed them?', {
      nothing: 'Nothing. Nobody has, or nothing is left.',
      hat: 'A hat floating on the water.',
      staff: 'A walking staff standing in the mud with a satchel hung on it.',
      bones: 'A skull and a few ribs at the water’s edge.',
      gold: 'Coins glinting just under the surface.',
      lantern: 'A dropped lantern, long dead, lying on the bank.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => lo + (hi - lo) * random();
    const C = (hex: string) => new THREE.Color(hex);
    const tint = C(HEX[a.colour]);
    const long = a.pool === 'cutting';
    const RX = long ? 1.55 : 1.3, RZ = long ? 0.7 : 1.05;

    // Pool and bank.
    const peat = C('#2e251e');
    const waterMaterial = new THREE.MeshStandardMaterial({ color: C('#172026').lerp(tint, 0.06), roughness: 0.08, metalness: 0.15 });
    if (long) {
      const water = s.box([RX * 2, 0.03, RZ * 2], [0, 0.015, 0], waterMaterial);
      water.castShadow = false;
      const bankMaterial = s.material(peat, { roughness: 0.8 });
      const turf = new THREE.MeshStandardMaterial({ color: C('#4d4a2c').lerp(C('#5e3848'), mood.cheer * 0.4), roughness: 1 });
      for (const side of [-1, 1]) {
        s.box([RX * 2 + 1.0, 0.3, 0.5], [0, 0.15, side * (RZ + 0.25)], bankMaterial);
        s.box([RX * 2 + 1.04, 0.05, 0.54], [0, 0.32, side * (RZ + 0.25)], turf);
        s.box([RX * 2, 0.14, 0.16], [0, 0.07, side * (RZ - 0.06)], bankMaterial);
        s.box([0.5, 0.3, RZ * 2], [side * (RX + 0.25), 0.15, 0], bankMaterial);
        s.box([0.54, 0.05, RZ * 2], [side * (RX + 0.25), 0.32, 0], turf);
      }
    } else {
      const water = s.cylinder(1, 1, 0.03, [0, 0.015, 0], waterMaterial, 40);
      water.scale.set(RX, 1, RZ);
      water.castShadow = false;
    }
    const bank: Xf[] = [];
    const bankTints = ['#3a3222', '#4c5527', '#4a3a28', '#55622c', '#4a2a33', '#43342a', '#4c5527'];
    const lumps = long ? 0 : 46;
    for (let i = 0; i < lumps; i++) {
      const th = (i / lumps) * 6.28 + rr(-0.05, 0.05), k = rr(1.0, 1.12), size = rr(0.14, 0.3);
      bank.push({ p: [Math.cos(th) * RX * k, 0.02, Math.sin(th) * RZ * k], r: [0, rr(0, 3), 0], s: [size * 1.3, size * rr(0.3, 0.55), size], c: C(bankTints[Math.floor(random() * bankTints.length)]) });
    }
    instances(s.root, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 1 }), bank);

    // Reeds: a dark screen behind the lights, sparse in front.
    const blades: Xf[] = [], heads: Xf[] = [];
    const reedy = a.pool === 'reeds';
    const clumps = Math.round(mix(14, 26, mood.density) * (reedy ? 2.2 : 1) * (long ? 0.7 : 1));
    for (let c = 0; c < clumps; c++) {
      const back = random() < 0.72;
      const th = back ? rr(Math.PI * 1.05, Math.PI * 1.95) : rr(0, Math.PI);
      const k = reedy && random() < 0.5 ? rr(0.55, 0.95) : rr(1.0, 1.18) + (long ? 0.3 : 0);
      const px = Math.cos(th) * RX * k, pz = Math.sin(th) * RZ * k;
      const y0 = long && k > 1 ? 0.33 : 0.02;
      const tall = back ? rr(0.9, 1.7) : rr(0.3, 0.7);
      const colour = C('#46512c').lerp(C('#8a7a45'), mood.wear * rr(0.2, 0.8)).offsetHSL(0, 0, rr(-0.04, 0.04));
      for (let i = 0; i < 9; i++) {
        const lean: [number, number, number] = [rr(-0.2, 0.2), 0, rr(-0.2, 0.2)];
        const h = tall * rr(0.6, 1.1);
        blades.push({ p: [px + rr(-0.08, 0.08), y0, pz + rr(-0.08, 0.08)], r: lean, s: [1, h, 1], c: colour });
        if (back && i < 2 && random() < 0.6) heads.push({ p: [px + rr(-0.06, 0.06) - Math.sin(lean[2]) * h * 0.9, y0 + h * 0.9, pz + rr(-0.06, 0.06) + Math.sin(lean[0]) * h * 0.9], r: lean, s: [1, 1, 1], c: C('#4a3223') });
      }
    }
    const blade = new THREE.ConeGeometry(0.016, 1, 4);
    blade.translate(0, 0.5, 0);
    instances(s.root, blade, new THREE.MeshStandardMaterial({ roughness: 0.9 }), blades);
    instances(s.root, new THREE.CylinderGeometry(0.022, 0.022, 0.16, 6), new THREE.MeshStandardMaterial({ roughness: 1 }), heads);

    if (a.pool === 'stones') {
      const rock = s.material('#77786f', { roughness: 0.9, flatShading: true });
      for (let i = 0; i < 5; i++) {
        const stone = s.mesh(new THREE.DodecahedronGeometry(rr(0.15, 0.22), 0), rock, [0.5 - i * 0.12 + rr(-0.06, 0.06), 0.02, RZ * 1.05 - i * 0.3]);
        stone.scale.y = 0.35;
        stone.rotation.y = rr(0, 3);
      }
    }

    // The lights.
    const base = mix(0.16, 1.55, a.height);
    type Spot = { x: number; z: number; y: number; k: number };
    const spots: Spot[] = [];
    const n = { one: 1, pair: 2, trail: 4 + Math.floor(random() * 2), ring: 5 + Math.floor(random() * 3), swarm: Math.round(mix(10, 18, mood.density)) }[a.count];
    for (let i = 0; i < n; i++) {
      if (a.count === 'one') spots.push({ x: 0, z: 0.05, y: base, k: 1.25 });
      else if (a.count === 'pair') spots.push({ x: i ? 0.3 : -0.28, z: i ? -0.1 : 0.12, y: base * (i ? 1.12 : 1), k: i ? 0.9 : 1.1 });
      else if (a.count === 'trail') { const t = i / (n - 1); spots.push({ x: mix(-0.75, 0.85, t) * (long ? 1.4 : 1), z: mix(0.5, -0.55, t) * (long ? 0.5 : 1), y: base * mix(1, 1.25, t), k: mix(1.15, 0.42, t) }); }
      else if (a.count === 'ring') { const th = (i / n) * 6.28; spots.push({ x: Math.cos(th) * 0.68 * (long ? 1.5 : 1), z: Math.sin(th) * 0.55 * (long ? 0.6 : 1), y: base * rr(0.9, 1.1), k: 0.8 }); }
      else { const th = random() * 6.28, d = Math.sqrt(random()) * 0.92; spots.push({ x: Math.cos(th) * d * RX, z: Math.sin(th) * d * RZ, y: Math.max(0.12, base * rr(0.5, 1.4)), k: rr(0.35, 0.65) }); }
    }
    const glow = mix(1.2, 2.4, mood.cheer * 0.5 + 0.25);
    const core = new THREE.MeshStandardMaterial({ color: tint.clone().lerp(C('#ffffff'), 0.25), emissive: tint, emissiveIntensity: glow, roughness: 0.4 });
    const halo = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.26, depthWrite: false });
    const haloWide = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.09, depthWrite: false });
    const sheen = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.4, depthWrite: false });
    const mist = new THREE.MeshStandardMaterial({ color: C('#9fb0ac').lerp(tint, 0.25), transparent: true, opacity: 0.2, depthWrite: false, roughness: 1, side: THREE.DoubleSide });
    const lights: { group: THREE.Group; spot: Spot; phase: number; sheen: THREE.Mesh }[] = [];
    spots.forEach((spot, index) => {
      const group = new THREE.Group();
      group.position.set(spot.x, spot.y, spot.z);
      s.root.add(group);
      const k = spot.k * 1.45;
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, shadow = false) => { const m = new THREE.Mesh(geometry, material); m.castShadow = shadow; group.add(m); return m; };
      if (a.form === 'orb') add(new THREE.SphereGeometry(0.085 * k, 14, 10), core);
      else {
        const profile = [[0, -0.1], [0.055, -0.07], [0.08, 0], [0.065, 0.09], [0.03, 0.2], [0, 0.3]].map(([r, y]) => new THREE.Vector2(r * k, y * k));
        const flame = add(new THREE.LatheGeometry(profile, 12), core);
        flame.rotation.z = rr(-0.15, 0.15);
        if (a.form === 'wisp') {
          const pts = Array.from({ length: 6 }, (_u, i) => new THREE.Vector3(Math.sin(i * 1.3 + index) * 0.07 * k * i * 0.5, (0.25 + i * 0.16) * k, Math.cos(i * 1.1 + index) * 0.05 * k * i * 0.5));
          const tail = add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.012 * k, 5), core);
          tail.scale.set(1, 1, 1);
        }
      }
      add(new THREE.SphereGeometry(0.2 * k, 14, 10), halo);
      add(new THREE.SphereGeometry(0.42 * k, 14, 10), haloWide);
      if (a.form === 'carried' && index === 0 && spot.y > 0.5) {
        // A walker made of mist, never quite solid, holding the flame out in front.
        const tall = spot.y + 0.55;
        const body = add(new THREE.CylinderGeometry(0.09, 0.3, tall - 0.2, 12, 1, true), mist);
        body.position.set(-0.32, -spot.y + (tall - 0.2) / 2, -0.12);
        const head = add(new THREE.SphereGeometry(0.14, 12, 10), mist);
        head.position.set(-0.32, tall - spot.y - 0.08, -0.12);
        head.scale.set(1, 1.15, 1.1);
        const arm = add(new THREE.CylinderGeometry(0.03, 0.045, 0.36, 6), mist);
        arm.position.set(-0.16, 0.1, -0.06);
        arm.rotation.z = -1.1;
      }
      // Reflection on the water below.
      const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.16 * k, 16), sheen);
      mirror.rotation.x = -Math.PI / 2;
      mirror.position.set(spot.x, 0.036, spot.z + 0.02);
      mirror.scale.y = 1.7;
      s.root.add(mirror);
      lights.push({ group, spot, phase: random() * 6.28, sheen: mirror });
    });

    // What they led here.
    const edge = (th: number, k: number): [number, number] => [Math.cos(th) * RX * k, Math.sin(th) * RZ * k];
    const bankY = long ? 0.35 : 0.06;
    if (a.lure === 'hat') {
      const felt = s.material(mood.cheer > 0.6 ? '#7a4a2a' : '#2a2724', { roughness: 1 });
      const [hx, hz] = edge(0.9, 0.5);
      const brim = s.cylinder(0.2, 0.2, 0.012, [hx, 0.04, hz], felt, 18);
      brim.rotation.z = 0.08;
      s.cylinder(0.09, 0.11, 0.1, [hx, 0.09, hz], felt, 14);
      const ring = s.ring(0.28, 0.005, [hx, 0.034, hz], new THREE.MeshStandardMaterial({ color: '#8f9aa0', roughness: 0.2 }));
      ring.rotation.x = Math.PI / 2;
      ring.castShadow = false;
    } else if (a.lure === 'staff') {
      const [sx, sz] = edge(0.5, 1.12);
      const wood = s.material('#7d6a4a', { roughness: 0.9 });
      s.rod([sx, 0, sz], [sx + 0.18, 1.35, sz - 0.05], 0.02, wood, 0.016);
      const bag = s.ball([0.14, 0.17, 0.08], [sx + 0.2, 0.92, sz + 0.02], s.material('#6a4a30', { roughness: 0.9 }), 10);
      bag.rotation.z = 0.15;
      s.rod([sx + 0.17, 1.25, sz - 0.04], [sx + 0.2, 1.02, sz + 0.02], 0.006, s.material('#3a2a20'));
    } else if (a.lure === 'bones') {
      const bone = s.material('#d9d2bd', { roughness: 0.8 });
      const [bx, bz] = edge(0.75, 0.92);
      const skull = s.ball([0.1, 0.1, 0.12], [bx, 0.1, bz], bone, 12);
      skull.rotation.z = 0.4;
      s.box([0.1, 0.05, 0.08], [bx + 0.03, 0.045, bz + 0.07], bone);
      for (const k of [-1, 1]) s.ball([0.025, 0.03, 0.02], [bx + k * 0.04 + 0.02, 0.11, bz + 0.105], s.material('#17120f'), 6);
      for (let i = 0; i < 4; i++) { const rib = s.ring(0.12 - i * 0.008, 0.012, [bx - 0.3 - i * 0.09, 0.03, bz - 0.05], bone, Math.PI); rib.rotation.y = Math.PI / 2 + rr(-0.15, 0.15); }
      s.rod([bx - 0.25, 0.05, bz + 0.2], [bx - 0.6, 0.04, bz + 0.3], 0.016, bone);
    } else if (a.lure === 'gold') {
      const coins = Array.from({ length: 22 }, () => { const th = rr(0, 6.28), d = Math.sqrt(random()) * 0.45; return { at: [0.25 + Math.cos(th) * d, 0.034, 0.35 + Math.sin(th) * d * 0.7] as const, size: rr(0.7, 1.3) }; });
      s.scatter(new THREE.CylinderGeometry(0.028, 0.028, 0.004, 10), new THREE.MeshStandardMaterial({ color: '#e0b63a', emissive: '#b8860b', emissiveIntensity: 0.7, metalness: 0.8, roughness: 0.25 }), coins);
    } else if (a.lure === 'lantern') {
      const [lx, lz] = edge(0.6, 1.1);
      const rust = s.material('#5a3a26', { metalness: 0.4, roughness: 0.8 });
      const g = new THREE.Group();
      g.position.set(lx, bankY + 0.08, lz);
      g.rotation.set(0, rr(0, 3), Math.PI / 2 - 0.15);
      s.root.add(g);
      const part = (geometry: THREE.BufferGeometry, y: number, material: THREE.Material = rust) => { const m = new THREE.Mesh(geometry, material); m.position.y = y; m.castShadow = true; g.add(m); };
      part(new THREE.CylinderGeometry(0.07, 0.08, 0.05, 10), 0);
      part(new THREE.CylinderGeometry(0.055, 0.055, 0.15, 10, 1, true), 0.1, new THREE.MeshStandardMaterial({ color: '#39403f', roughness: 0.3, side: THREE.DoubleSide }));
      part(new THREE.CylinderGeometry(0.03, 0.07, 0.07, 10), 0.21);
      part(new THREE.TorusGeometry(0.06, 0.006, 5, 14), 0.28);
    }

    const speed = mix(0.35, 2.2, mood.energy), drift = mix(0.03, 0.22, mood.energy);
    const circling = a.count === 'ring';
    return s.finish({
      footprint: RX * 0.9,
      update(_dt, time) {
        for (const light of lights) {
          const { group, spot, phase } = light;
          let x = spot.x + Math.sin(time * speed * 0.7 + phase) * drift * 0.6, z = spot.z + Math.cos(time * speed * 0.5 + phase * 1.7) * drift * 0.5;
          if (circling) { const ang = time * speed * 0.25; x = spot.x * Math.cos(ang) - (spot.z / 0.55) * 0.68 * Math.sin(ang); z = (spot.x / 0.68) * 0.55 * Math.sin(ang) + spot.z * Math.cos(ang); }
          group.position.set(x, spot.y + Math.sin(time * speed + phase) * drift * 0.5, z);
          light.sheen.position.set(x, 0.036, z + 0.02);
          const pulse = 1 + Math.sin(time * speed * 5.3 + phase) * 0.12 + Math.sin(time * speed * 9.1 + phase * 2) * 0.06;
          group.scale.setScalar(pulse);
        }
        core.emissiveIntensity = glow * (1 + Math.sin(time * speed * 7) * 0.15);
      },
    });
  },
});
