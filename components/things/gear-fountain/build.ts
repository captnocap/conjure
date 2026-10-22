import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { gearGeometry, windKey } from './parts';

export default defineThing({
  questions: {
    pours: choice('What does the fountain pour?', {
      water: 'Clear blue water.',
      oil: 'Black machine oil, glossy and slow.',
      sand: 'Dry golden sand, heaping in little cones on every tier.',
      molten: 'Glowing molten brass, orange and dangerous.',
      wine: 'Dark red wine, for a festival.',
      quicksilver: 'Bright liquid mercury.',
    }),
    state: choice('How is it running?', {
      flowing: 'Sweetly: every wheel turning, every scoop full.',
      overflowing: 'Too hard: slopping over the rim and pooling across the ground.',
      grinding: 'Barely: a thin trickle, the wheels moving in jerks.',
      seized: 'Seized solid and dry, the top wheel knocked off its axle, a broken cog lying in the basin.',
    }),
    tiers: choice('How many cogwheel tiers does it have?', {
      two: 'Two broad tiers, squat and plain.',
      three: 'Three tiers, the usual civic fountain.',
      four: 'Four tiers, tall and showy.',
    }),
    basin: choice('What is the basin made of?', {
      stone: 'A round pale stone basin with a rolled lip.',
      brass: 'An eight-sided riveted brass tank.',
      tile: 'A round basin faced in blue and white tile.',
      iron: 'A low black cast-iron trough ring.',
    }),
    lift: choice('What lifts the liquid?', {
      wheel: 'One great upright scoop wheel at the side, meshing with the lowest tier.',
      twin: 'Two scoop wheels facing each other across the basin.',
      hidden: 'Nothing visible: the tiers alone, fed from inside the column.',
    }),
    crown: choice('What stands at the very top?', {
      key: 'A giant wind-up key.',
      bird: 'A brass bird with spread wings.',
      orb: 'An armillary sphere of rings.',
      jug: 'A small white porcelain figure tipping a jug.',
      jet: 'Nothing but a plain nozzle and its jet.',
    }),
    left: choice('What has been left in the basin?', {
      nothing: 'Nothing. It is kept clean.',
      coins: 'A scatter of wished-on coins.',
      cogs: 'Dropped cogs and shed teeth.',
      leaves: 'Drifts of fallen leaves.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const running = a.state !== 'seized';
    const brassTone = new THREE.Color('#c99a3e').lerp(new THREE.Color('#5f9a84'), mood.wear * 0.5);
    const brass = s.material(brassTone, { metalness: 0.55, roughness: 0.38 });
    const copper = s.material(new THREE.Color('#b96a3c').lerp(new THREE.Color('#5f9a84'), mood.wear * 0.4), { metalness: 0.55, roughness: 0.4 });
    const iron = s.material('#33363b', { metalness: 0.4, roughness: 0.6 });
    const fluidSpec: Record<typeof a.pours, THREE.MeshStandardMaterialParameters> = {
      water: { color: '#4aa3dc', roughness: 0.08, transparent: true, opacity: 0.82 },
      oil: { color: '#15120f', roughness: 0.08, metalness: 0.5 },
      sand: { color: '#dcbb78', roughness: 1 },
      molten: { color: '#ffb04a', emissive: '#ff7a1a', emissiveIntensity: 1.4, roughness: 0.5 },
      wine: { color: '#7c1432', roughness: 0.12 },
      quicksilver: { color: '#dfe4ea', roughness: 0.12, metalness: 0.45 },
    };
    const fluid = new THREE.MeshStandardMaterial(fluidSpec[a.pours]);
    const sandy = a.pours === 'sand';

    // Basin.
    const B = 1.9, wall = a.basin === 'iron' ? 0.36 : 0.52;
    const basinMaterial = { stone: s.material('#cfc8b6', { roughness: 0.9 }), brass, tile: s.material('#eef1f2', { roughness: 0.35 }), iron }[a.basin];
    const sides = a.basin === 'brass' ? 8 : 40;
    const profile: [number, number][] = a.basin === 'stone'
      ? [[B - 0.28, 0.12], [B - 0.22, wall - 0.04], [B - 0.16, wall], [B + 0.04, wall], [B + 0.08, wall - 0.06], [B - 0.02, wall - 0.14], [B - 0.06, 0.1], [B + 0.1, 0.06], [B + 0.1, 0]]
      : [[B - 0.24, 0.12], [B - 0.22, wall], [B, wall], [B, 0.08], [B + 0.08, 0.08], [B + 0.08, 0]];
    s.mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), sides), basinMaterial);
    s.cylinder(B - 0.2, B - 0.2, 0.12, [0, 0.06, 0], basinMaterial, sides);
    if (a.basin === 'tile') {
      const blue = s.material('#2f66b0', { roughness: 0.35 });
      const tiles = Array.from({ length: 36 }, (_unused, i) => ({ angle: i / 36 * Math.PI * 2, row: i % 2 }));
      for (const tile of tiles) {
        const box = s.box([0.16, 0.16, 0.02], [Math.sin(tile.angle) * (B + 0.005), 0.18 + tile.row * 0.18, Math.cos(tile.angle) * (B + 0.005)], blue);
        box.rotation.y = tile.angle;
      }
    } else if (a.basin === 'brass') {
      for (let i = 0; i < 8; i++) {
        const angle = (i + 0.5) / 8 * Math.PI * 2;
        const inset = Math.cos(Math.PI / 8) * B + 0.01;
        for (const dx of [-0.5, 0.5]) for (const y of [0.16, wall - 0.06]) {
          const tangent = [Math.cos(angle), -Math.sin(angle)];
          s.ball([0.03, 0.03, 0.03], [Math.sin(angle) * inset + tangent[0] * dx, y, Math.cos(angle) * inset + tangent[1] * dx], copper, 8);
        }
      }
    } else if (a.basin === 'iron') {
      for (let i = 0; i < 12; i++) {
        const angle = i / 12 * Math.PI * 2;
        s.box([0.1, wall, 0.08], [Math.sin(angle) * (B + 0.03), wall / 2, Math.cos(angle) * (B + 0.03)], iron).rotation.y = angle;
      }
    }
    const level = a.state === 'seized' ? 0.14 : a.state === 'grinding' ? wall - 0.24 : a.state === 'overflowing' ? wall + 0.01 : wall - 0.1;
    if (a.state === 'seized') {
      s.cylinder(B - 0.9, B - 0.9, 0.02, [0.3, 0.13, -0.2], fluid, 24).scale.set(1, 1, 0.7);
      s.ring(B - 0.24, 0.02, [0, wall - 0.12, 0], s.material('#6b6252', { roughness: 1 })).rotation.x = Math.PI / 2;
    } else s.cylinder(B - 0.2, B - 0.2, 0.04, [0, level - 0.02, 0], fluid, sides);

    // Central column and tiers.
    const tierCount = { two: 2, three: 3, four: 4 }[a.tiers];
    const tierY = [1.05, 1.85, 2.5, 3.0], tierR = [1.25, 0.9, 0.62, 0.42];
    if (tierCount === 2) { tierR[0] = 1.3; tierR[1] = 0.8; }
    const topTierY = tierY[tierCount - 1];
    s.lathe([[0, 0], [0.34, 0.1], [0.3, 0.5], [0.2, 0.7], [0.17, topTierY * 0.6], [0.14, topTierY], [0, topTierY]], copper);
    for (let i = 0; i < 4; i++) s.ring(0.21, 0.035, [0, 0.72 + i * 0.001, 0], brass).rotation.x = Math.PI / 2;
    const spinners: { node: THREE.Object3D; rate: number; axis: 'y' | 'z' }[] = [];
    const streams: THREE.Mesh[] = [];
    const surfaceOf = (index: number) => (index < 0 ? level : tierY[index] + 0.08);
    for (let i = 0; i < tierCount; i++) {
      const r = tierR[i], y = tierY[i];
      const tier = new THREE.Group();
      tier.position.set(0, y, 0);
      tier.rotation.y = random() * 3;
      s.root.add(tier);
      const wheel = s.mesh(gearGeometry(r, Math.round(r * 20), 0.12, 0, 0, Math.min(0.14, r * 0.2)), i % 2 ? copper : brass);
      wheel.rotation.x = Math.PI / 2;
      tier.add(wheel);
      tier.add(s.ring(r * 0.8, 0.045, [0, 0.07, 0], i % 2 ? brass : copper)).children.at(-1)!.rotation.x = Math.PI / 2;
      if (a.state !== 'seized') {
        const pool = s.cylinder(r * 0.78, r * 0.78, 0.03, [0, 0.075, 0], fluid, 32);
        tier.add(pool);
      }
      if (sandy && running) tier.add(s.cylinder(0, r * 0.45, r * 0.3, [0, 0.09 + r * 0.15, 0], fluid, 20));
      s.lathe([[0.15, -0.42], [0.2, -0.3], [r * 0.5, -0.07], [r * 0.5, -0.06]], i % 2 ? brass : copper, [0, y, 0]);
      if (i === tierCount - 1 && a.state === 'seized') {
        tier.rotation.z = 0.24 + random() * 0.12;
        tier.position.x += 0.12;
      }
      spinners.push({ node: tier, rate: (i % 2 ? -1 : 1) * 0.5 / r, axis: 'y' });
      // Spills from this tier to the one below.
      if (a.state !== 'seized') {
        const spills = a.state === 'grinding' ? 2 : a.state === 'overflowing' ? 9 : 5 + Math.round(mood.energy * 2);
        const below = surfaceOf(i - 1);
        for (let k = 0; k < spills; k++) {
          const angle = (k + random() * 0.6) / spills * Math.PI * 2;
          const width = (a.state === 'grinding' ? 0.012 : a.state === 'overflowing' ? 0.05 : 0.03) * (sandy ? 0.8 : 1);
          const stream = s.cylinder(width * 0.6, width, y - below, [Math.sin(angle) * r * 0.93, (y + below) / 2, Math.cos(angle) * r * 0.93], fluid, 8);
          stream.castShadow = false;
          streams.push(stream);
          if (sandy) s.cylinder(0, 0.12, 0.1, [Math.sin(angle) * r * 0.93, below + 0.05, Math.cos(angle) * r * 0.93], fluid, 10);
        }
      }
    }

    // Scoop wheels.
    const wheelCount = a.lift === 'wheel' ? 1 : a.lift === 'twin' ? 2 : 0;
    for (let w = 0; w < wheelCount; w++) {
      const side = w === 0 ? 1 : -1;
      const r = 0.92, cx = side * (tierR[0] + r * 0.62), cy = 0.24 + r;
      const wheel = new THREE.Group();
      wheel.position.set(cx, cy, 0);
      wheel.rotation.z = random() * 2;
      s.root.add(wheel);
      wheel.add(s.mesh(gearGeometry(r, 22, 0.1, 0.08, 6, 0.11), brass));
      const scoops = 8;
      for (let k = 0; k < scoops; k++) {
        const angle = k / scoops * Math.PI * 2;
        const cup = new THREE.Group();
        cup.position.set(Math.cos(angle) * r * 0.78, Math.sin(angle) * r * 0.78, 0.17);
        cup.rotation.z = angle + (side > 0 ? Math.PI : 0);
        const shell = s.mesh(new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: copper.color, metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide }));
        shell.rotation.z = Math.PI / 2;
        cup.add(shell);
        if (running) cup.add(s.ball([0.02, 0.11, 0.11], [-0.01, 0, 0], fluid, 10));
        wheel.add(cup);
      }
      spinners.push({ node: wheel, rate: -side * 0.5 / r, axis: 'z' });
      s.cylinder(0.06, 0.06, 0.5, [cx, cy, 0], iron, 12).rotation.x = Math.PI / 2;
      for (const z of [-1, 1]) for (const lean of [-1, 1]) s.rod([cx + lean * 0.5, 0, z * 0.24], [cx, cy, z * 0.2], 0.045, iron);
      // The chute that carries each lifted scoop to the top tier.
      if (running) {
        const from: [number, number, number] = [cx - side * 0.2, cy + r * 0.72, 0.17];
        s.rod(from, [side * 0.1, topTierY + 0.25, 0.1], 0.05, copper);
      }
    }

    // Crown.
    const crownY = topTierY + 0.1;
    const crown = new THREE.Group();
    crown.position.set(a.state === 'seized' ? 0.12 : 0, crownY, 0);
    crown.rotation.z = a.state === 'seized' ? 0.25 : 0;
    s.root.add(crown);
    const cr = <T extends THREE.Object3D>(node: T) => { crown.add(node); return node; };
    cr(s.lathe([[0.1, 0], [0.12, 0.06], [0.05, 0.16], [0.04, 0.3]], brass));
    let turning: THREE.Object3D | null = null;
    if (a.crown === 'key') {
      turning = cr(windKey(brass, 1.0, 'butterfly'));
      turning.position.y = 0.2;
    } else if (a.crown === 'bird') {
      cr(s.ball([0.1, 0.11, 0.18], [0, 0.42, 0], brass, 14));
      cr(s.ball([0.07, 0.07, 0.07], [0, 0.55, 0.13], brass, 12));
      cr(s.rod([0, 0.55, 0.19], [0, 0.53, 0.28], 0.02, copper, 0.002));
      for (const side of [-1, 1]) {
        const wing = cr(s.ball([0.3, 0.02, 0.12], [side * 0.3, 0.52, -0.02], brass, 12));
        wing.rotation.z = side * 0.45;
      }
      cr(s.ball([0.05, 0.02, 0.16], [0, 0.42, -0.24], brass, 10)).rotation.x = -0.3;
    } else if (a.crown === 'orb') {
      turning = new THREE.Group();
      turning.position.y = 0.62;
      cr(turning);
      for (let i = 0; i < 3; i++) {
        const ring = s.ring(0.3 - i * 0.03, 0.015, [0, 0, 0], i === 1 ? copper : brass);
        ring.rotation.set(i * 1.1, i * 0.7, 0);
        turning.add(ring);
      }
      turning.add(s.ball([0.08, 0.08, 0.08], [0, 0, 0], fluid, 14));
    } else if (a.crown === 'jug') {
      const porcelain = s.material('#f3efe6', { roughness: 0.3 });
      cr(s.cylinder(0.05, 0.16, 0.5, [0, 0.52, 0], porcelain, 14));
      cr(s.ball([0.07, 0.08, 0.07], [0, 0.84, 0], porcelain, 12));
      cr(s.rod([0.04, 0.72, 0], [0.2, 0.62, 0.1], 0.025, porcelain));
      cr(s.lathe([[0, 0], [0.06, 0.02], [0.07, 0.1], [0.03, 0.16], [0.04, 0.2]], copper, [0.24, 0.5, 0.12])).rotation.z = -1.1;
      if (running) cr(s.rod([0.36, 0.56, 0.12], [0.4, 0.02, 0.12], 0.014, fluid));
    }
    if (a.crown === 'jet' && running) {
      const jetHeight = a.state === 'grinding' ? 0.12 : a.state === 'overflowing' ? 1.0 : 0.6;
      cr(s.cylinder(0.015, 0.03, jetHeight, [0, 0.3 + jetHeight / 2, 0], fluid, 8));
      cr(s.ball([0.07, 0.05, 0.07], [0, 0.3 + jetHeight, 0], fluid, 10));
    }

    // Trouble: overflow, wreckage.
    if (a.state === 'overflowing') {
      for (let k = 0; k < 7; k++) {
        const angle = random() * Math.PI * 2;
        s.box([0.3 + random() * 0.4, wall, 0.03], [Math.sin(angle) * (B + 0.1), wall / 2, Math.cos(angle) * (B + 0.1)], fluid).rotation.y = angle;
        const puddle = s.cylinder(0.3 + random() * 0.3, 0.35 + random() * 0.3, 0.014, [Math.sin(angle) * (B + 0.25 + random() * 0.2), 0.007, Math.cos(angle) * (B + 0.25 + random() * 0.2)], fluid, 18);
        puddle.scale.set(1, 1, 0.6 + random() * 0.4);
        puddle.rotation.y = angle;
      }
    }
    if (a.state === 'seized') {
      const broken = s.mesh(gearGeometry(0.5, 11, 0.1, 0.07, 4), copper, [-0.9, 0.42, 0.9]);
      broken.rotation.set(-1.15, 0.5, 0.3);
      const snapped = s.mesh(gearGeometry(0.3, 9, 0.08, 0.05), brass, [1.0, 0.16, -0.5]);
      snapped.rotation.x = Math.PI / 2;
    }
    const floor = a.state === 'seized' ? 0.125 : level + 0.004;
    if (a.left === 'coins') {
      const coin = s.material('#e8c552', { metalness: 0.5, roughness: 0.3 });
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.3, 10), coin, Array.from({ length: 40 + Math.round(mood.density * 60) }, () => {
        const angle = random() * Math.PI * 2, d = 0.5 + random() * (B - 0.75);
        return { at: [Math.sin(angle) * d, floor, Math.cos(angle) * d] as const, size: 0.03 + random() * 0.015 };
      }));
    } else if (a.left === 'cogs') {
      for (let i = 0; i < 6 + Math.round(mood.density * 6); i++) {
        const angle = random() * Math.PI * 2, d = 0.6 + random() * (B - 0.9), r = 0.08 + random() * 0.12;
        const cog = s.mesh(gearGeometry(r, 7 + Math.floor(random() * 5), 0.03, r * 0.25), random() > 0.5 ? brass : copper, [Math.sin(angle) * d, floor + 0.012, Math.cos(angle) * d]);
        cog.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.3, 0, random() * 3);
      }
    } else if (a.left === 'leaves') {
      s.scatter(new THREE.SphereGeometry(1, 6, 3).scale(1, 0.12, 0.6), s.material('#b8742c', { roughness: 0.9 }), Array.from({ length: 50 + Math.round(mood.density * 70) }, () => {
        const angle = random() * Math.PI * 2, d = 0.5 + random() * (B + 0.1);
        const inside = d < B - 0.25;
        return { at: [Math.sin(angle) * d, inside ? floor : d > B + 0.1 ? 0.01 : wall + 0.01, Math.cos(angle) * d] as const, size: 0.05 + random() * 0.05, color: ['#b8742c', '#8a4a1f', '#d19a35', '#6c5a2a'][Math.floor(random() * 4)] };
      }));
    }

    const speed = a.state === 'seized' ? 0 : mix(0.25, 1.4, mood.energy) * (a.state === 'overflowing' ? 1.8 : 1);
    let phase = 0;
    return s.finish({
      footprint: B + 0.2,
      update: (dt, time) => {
        // A grinding fountain moves in ticks rather than a sweep.
        const step = a.state === 'grinding' ? (Math.sin(time * 3) > 0.8 ? dt * speed * 1.5 : 0) : dt * speed;
        phase += step;
        for (const spinner of spinners) spinner.node.rotation[spinner.axis] += step * spinner.rate;
        if (turning) turning.rotation.y += step;
        for (const [index, stream] of streams.entries()) stream.scale.x = stream.scale.z = 1 + Math.sin(phase * 9 + index * 1.7) * 0.25;
      },
    });
  },
});
