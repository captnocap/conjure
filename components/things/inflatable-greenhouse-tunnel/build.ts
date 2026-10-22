import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const SIGNS = { none: '', potatoes: 'POTATOES', zip: 'KEEP ZIPPED', farm: 'FARM 01', hope: 'HOPE', dont: 'DO NOT EAT YET' } as const;

export default defineThing({
  questions: {
    crop: choice('What is growing inside?', {
      potatoes: 'Potatoes: dark bushy plants in ridged rows of soil.',
      lettuce: 'Pale lettuce heads in raised white hydroponic gutters.',
      tomatoes: 'Tall staked tomato vines hung with red fruit.',
      wheat: 'A dense stand of knee-high green-gold wheat.',
      sunflowers: 'A few absurd, cheerful sunflowers.',
      algae: 'Glowing green algae columns instead of plants.',
    }),
    state: choice('What state is the greenhouse in?', {
      thriving: 'Taut and full, crops lush and pressing against the skin.',
      limping: 'Sagging a little, the crop thin and yellowing in patches.',
      frosted: 'Still inflated, but everything inside has died brown and brittle.',
      burst: 'Burst: a section of skin torn open and flapping, ribs slumped, the crop freeze-dried black.',
    }),
    tape: score('How patched is the skin?', ['Not a mark on it', 'A few strips of silver tape', 'A quilt of patches over patches']),
    skin: choice('What is the membrane like?', {
      clear: 'Clear as a plastic bag.',
      milky: 'Milky white, the plants only shadows.',
      amber: 'Amber-gold radiation film.',
      rose: 'Flushed magenta from the grow lamps inside.',
    }),
    entry: choice('What is at the door end?', {
      zip: 'A zipped fabric flap.',
      hatch: 'A rigid round hatch in a metal frame.',
      hose: 'A corrugated crawl-tube leading off toward the habitat.',
    }),
    sign: choice('What does the hand-painted sign by the door say, if there is one?', {
      none: 'No sign.',
      potatoes: 'POTATOES',
      zip: 'KEEP ZIPPED',
      farm: 'FARM 01',
      hope: 'HOPE',
      dont: 'DO NOT EAT YET',
    }),
    harvest: noul('Is there a crate of harvest and a watering can left by the door?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 1.8, spacing = 0.8, bays = 7, L = bays * spacing;
    const dust = new THREE.Color('#b96a3f').lerp(new THREE.Color('#d6a064'), mood.warmth * 0.5);
    const dead = a.state === 'frosted' || a.state === 'burst';
    const burstAt = a.state === 'burst' ? 2 + Math.floor(random() * 3) : -9;
    const sag = { thriving: 1, limping: 0.9, frosted: 0.95, burst: 0.86 }[a.state];
    const ribHeight = Array.from({ length: bays + 1 }, (_unused, i) => {
      const gap = Math.min(Math.abs(i - burstAt), Math.abs(i - burstAt - 1));
      const slump = a.state === 'burst' ? (gap === 0 ? 0.55 : gap === 1 ? 0.8 : 1) : 1;
      return sag * slump * (a.state === 'limping' ? 0.94 + random() * 0.1 : 1);
    });
    const ribX = (i: number) => -L / 2 + i * spacing;

    const skinTone = { clear: '#dff1ee', milky: '#f3f1e8', amber: '#f2c66a', rose: '#f3a6d8' }[a.skin];
    const skin = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(skinTone).lerp(dust, mood.wear * 0.25), transparent: true, opacity: a.skin === 'milky' ? 0.5 : a.skin === 'clear' ? 0.24 : 0.36,
      roughness: 0.25, depthWrite: false, side: THREE.DoubleSide,
      emissive: a.skin === 'rose' && !dead ? '#ff4fc0' : '#000000', emissiveIntensity: 0.25,
    });
    const ribPaint = s.material(new THREE.Color('#eeeae0').lerp(dust, mood.wear * 0.3), { roughness: 0.6 });
    const dark = s.material('#3a3b3d', { roughness: 0.8 });
    const metal = s.material('#a9aeb2', { metalness: 0.6, roughness: 0.4 });
    const strap = s.material('#e2702a', { roughness: 0.8 });
    const tape = s.material('#b9bdc2', { metalness: 0.5, roughness: 0.4 });
    const soil = s.material('#4a3226', { roughness: 1 });
    const sand = s.material(dust, { roughness: 1 });

    // Floor, skirts and the inflated ribs.
    s.box([L + 0.1, 0.08, R * 2], [0, 0.04, 0], s.material('#6a6d70', { roughness: 0.9 }));
    for (const side of [-1, 1]) s.box([L + 0.3, 0.2, 0.24], [0, 0.1, side * R], dark);
    for (let i = 0; i <= bays; i++) {
      const rib = s.mesh(new THREE.TorusGeometry(R, 0.085, 8, 26, Math.PI), ribPaint, [ribX(i), 0.08, 0]);
      rib.rotation.y = Math.PI / 2;
      rib.scale.y = ribHeight[i];
      if (ribHeight[i] < sag * 0.7) rib.rotation.z = (random() - 0.5) * 0.3;
    }

    // Membrane, bay by bay, quilted between the ribs. Burst bays are left open.
    const positions: number[] = [], index: number[] = [];
    const around = 18, along = 4;
    for (let bay = 0; bay < bays; bay++) {
      if (bay === burstAt || bay === burstAt + 1) continue;
      const start = positions.length / 3;
      for (let u = 0; u <= along; u++) {
        const f = u / along, x = ribX(bay) + f * spacing;
        const height = mix(ribHeight[bay], ribHeight[bay + 1], f);
        const puff = 1 + 0.045 * Math.sin(f * Math.PI) * (a.state === 'limping' ? -0.6 : 1);
        for (let v = 0; v <= around; v++) {
          const theta = (v / around) * Math.PI;
          positions.push(x, 0.08 + Math.sin(theta) * R * puff * height, Math.cos(theta) * R * puff);
        }
      }
      for (let u = 0; u < along; u++)
        for (let v = 0; v < around; v++) {
          const i = start + u * (around + 1) + v;
          index.push(i, i + 1, i + around + 1, i + 1, i + around + 2, i + around + 1);
        }
    }
    const membrane = new THREE.BufferGeometry();
    membrane.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    membrane.setIndex(index);
    membrane.computeVertexNormals();
    const hull = s.mesh(membrane, skin);
    hull.castShadow = false;
    for (const side of [-1, 1]) {
      const cap = s.mesh(new THREE.CircleGeometry(R, 18, 0, Math.PI), skin, [side * L / 2, 0.08, 0]);
      cap.rotation.y = Math.PI / 2;
      cap.scale.y = ribHeight[side < 0 ? 0 : bays];
      cap.castShadow = false;
    }
    // A dusty tide line low on the skin.
    if (mood.wear > 0.25) {
      const tide = new THREE.MeshStandardMaterial({ color: dust, transparent: true, opacity: mix(0.2, 0.75, mood.wear), depthWrite: false, roughness: 1, side: THREE.DoubleSide });
      for (const side of [0, 1]) {
        const band = s.mesh(new THREE.CylinderGeometry(R * 1.05, R * 1.05, L, 12, 1, true, side ? Math.PI * 0.86 : 0, Math.PI * 0.14), tide, [0, 0.08, 0]);
        band.rotation.z = Math.PI / 2;
        band.castShadow = false;
      }
    }

    // Torn flaps round the burst.
    const flaps: THREE.Mesh[] = [];
    if (a.state === 'burst') {
      const shred = new THREE.MeshStandardMaterial({ color: skinTone, transparent: true, opacity: 0.62, roughness: 0.4, side: THREE.DoubleSide });
      for (const edge of [burstAt, burstAt + 2])
        for (let i = 0; i < 7; i++) {
          const theta = mix(0.25, 2.9, (i + random() * 0.6) / 7);
          const length = 0.35 + random() * 0.6;
          const geometry = new THREE.PlaneGeometry(0.3 + random() * 0.25, length, 1, 3);
          geometry.translate(0, -length / 2, 0);
          const flap = s.mesh(geometry, shred, [ribX(edge) + (edge === burstAt ? 0.05 : -0.05), 0.08 + Math.sin(theta) * R * ribHeight[edge], Math.cos(theta) * R]);
          flap.rotation.set((random() - 0.5) * 0.9, Math.PI / 2 + (random() - 0.5), (edge === burstAt ? -1 : 1) * random() * 0.9);
          flaps.push(flap);
        }
      for (let i = 0; i < 4; i++) {
        const rag = s.mesh(new THREE.PlaneGeometry(0.5 + random() * 0.5, 0.4 + random() * 0.4), shred, [ribX(burstAt + 1) + (random() - 0.5) * 1.4, 0.03 + i * 0.004, R + 0.5 + random() * 1.1]);
        rag.rotation.set(-Math.PI / 2 + (random() - 0.5) * 0.3, 0, random() * 3);
      }
    }

    // Tape patches and tie-down straps.
    const patches = Math.round(a.tape * 16 + mood.wear * 5);
    const dummy = new THREE.Object3D();
    if (patches) {
      const strips = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.012, 0.13), tape, patches * 2);
      let placed = 0;
      for (let i = 0; i < patches; i++) {
        let bay = Math.floor(random() * bays);
        if (bay === burstAt || bay === burstAt + 1) bay = (bay + 3) % bays;
        const x = ribX(bay) + mix(0.2, 0.6, random()), theta = mix(0.25, 1.9, random() ** 1.4);
        const height = mix(ribHeight[bay], ribHeight[bay + 1], 0.5);
        const cross = random() < 0.45 || a.tape > 0.8;
        for (let k = 0; k < 2; k++) {
          dummy.position.set(x, 0.08 + Math.sin(theta) * R * 1.05 * height, Math.cos(theta) * R * 1.05);
          dummy.rotation.set(Math.PI / 2 - theta, random() * 3 + k * 1.5, 0);
          dummy.scale.setScalar(k === 1 && !cross ? 0.001 : 0.8 + random() * 0.6);
          dummy.updateMatrix();
          strips.setMatrixAt(placed++, dummy.matrix);
        }
      }
      strips.castShadow = true;
      s.root.add(strips);
    }
    for (let bay = 0; bay < bays; bay += 2) {
      if (bay === burstAt || bay === burstAt + 1) continue;
      const x = ribX(bay) + spacing / 2, height = mix(ribHeight[bay], ribHeight[bay + 1], 0.5);
      const band = s.mesh(new THREE.TorusGeometry(R * 1.06, 0.022, 6, 24, Math.PI), strap, [x, 0.08, 0]);
      band.rotation.y = Math.PI / 2;
      band.scale.set(1, height, 1);
      for (const side of [-1, 1]) {
        s.rod([x, 0.12, side * R * 1.06], [x, 0, side * (R + 0.55)], 0.018, strap);
        s.rod([x, -0.05, side * (R + 0.6)], [x, 0.22, side * (R + 0.5)], 0.025, metal);
      }
    }
    const bagGeometry = new THREE.SphereGeometry(0.3, 8, 6).scale(1, 0.4, 0.65);
    const bagCount = 16;
    const bags = new THREE.InstancedMesh(bagGeometry, s.material(new THREE.Color('#cdb891').lerp(dust, 0.3), { roughness: 1 }), bagCount);
    for (let i = 0; i < bagCount; i++) {
      const side = i % 2 ? 1 : -1;
      dummy.position.set(-L / 2 + 0.4 + Math.floor(i / 2) * (L - 0.8) / 7 + (random() - 0.5) * 0.25, 0.12, side * (R + 0.26));
      dummy.rotation.set(0, (random() - 0.5) * 0.5, (random() - 0.5) * 0.2);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      bags.setMatrixAt(i, dummy.matrix);
    }
    bags.castShadow = true;
    s.root.add(bags);
    if (mood.wear > 0.45) for (let i = 0; i < 3; i++) s.ball([0.9 + random() * 0.6, 0.18 + mood.wear * 0.25, 0.5], [(random() - 0.5) * L * 0.8, 0, -R - 0.3], sand, 10);

    // The crop.
    const lush = dead ? 0 : a.state === 'limping' ? 0.45 : 1;
    const leaf = (hex: string) => {
      const colour = new THREE.Color(hex);
      if (a.state === 'burst') return colour.lerp(new THREE.Color('#2a2622'), 0.85);
      if (a.state === 'frosted') return colour.lerp(new THREE.Color('#8a6f48'), 0.85);
      if (a.state === 'limping' && random() < 0.5) return colour.lerp(new THREE.Color('#c9b445'), 0.6);
      return colour.lerp(new THREE.Color('#58c040'), mood.cheer * 0.25);
    };
    const fullness = mix(0.55, 1, mood.density) * (a.state === 'limping' ? 0.7 : 1);
    const rows = [-1, 0, 1];
    const wilt = dead ? 0.6 : 1;
    const plants = (geometry: THREE.BufferGeometry, hex: string, spots: { at: [number, number, number]; size: [number, number, number]; turn?: number }[], glow = 0) => {
      const material = new THREE.MeshStandardMaterial({ roughness: 0.85, emissive: glow && !dead ? hex : '#000000', emissiveIntensity: glow });
      const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
      spots.forEach((spot, i) => {
        dummy.position.set(...spot.at);
        dummy.rotation.set(0, spot.turn ?? random() * 6, dead ? (random() - 0.5) * 0.7 : 0);
        dummy.scale.set(...spot.size);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, leaf(hex));
      });
      mesh.castShadow = true;
      s.root.add(mesh);
    };
    const along_ = (step: number) => {
      const xs: number[] = [];
      for (let x = -L / 2 + 0.45; x < L / 2 - 0.4; x += step) if (random() < fullness) xs.push(x + (random() - 0.5) * step * 0.3);
      return xs;
    };
    const blob = new THREE.IcosahedronGeometry(1, 1);
    if (a.crop === 'potatoes') {
      for (const z of rows) {
        const ridge = s.cylinder(0.26, 0.26, L - 0.5, [0, 0.08, z], soil, 10);
        ridge.rotation.z = Math.PI / 2;
        ridge.scale.set(0.75, 1, 1);
      }
      plants(blob, '#2f6a2c', rows.flatMap((z) => along_(0.5).flatMap((x) => [0, 1].map(() => ({ at: [x + (random() - 0.5) * 0.2, 0.36 + random() * 0.1, z + (random() - 0.5) * 0.2] as [number, number, number], size: [0.22 * wilt, 0.2 * wilt, 0.22 * wilt] as [number, number, number] })))));
    } else if (a.crop === 'lettuce') {
      for (const z of rows) {
        s.box([L - 0.6, 0.1, 0.34], [0, 0.62, z], ribPaint);
        for (const x of [-L / 2 + 0.5, 0, L / 2 - 0.5]) s.box([0.05, 0.6, 0.3], [x, 0.3, z], metal);
      }
      plants(new THREE.SphereGeometry(1, 8, 6), '#8fd06a', rows.flatMap((z) => along_(0.38).map((x) => ({ at: [x, 0.72, z] as [number, number, number], size: [0.17, 0.11 * wilt, 0.17] as [number, number, number] }))));
    } else if (a.crop === 'tomatoes') {
      for (const z of rows) s.box([L - 0.6, 0.12, 0.3], [0, 0.14, z], soil);
      const spots = rows.flatMap((z) => along_(0.62).map((x) => ({ x, z, top: (z === 0 ? 1.45 : 1.0) * sag })));
      for (const spot of spots) s.rod([spot.x, 0.1, spot.z], [spot.x, spot.top + 0.1, spot.z], 0.014, metal);
      plants(blob, '#2f7a30', spots.flatMap((spot) => [0.3, 0.6, 0.9].map((f) => ({ at: [spot.x + (random() - 0.5) * 0.12, 0.2 + spot.top * f * wilt, spot.z + (random() - 0.5) * 0.12] as [number, number, number], size: [0.2, 0.22, 0.2] as [number, number, number] }))));
      if (!dead) plants(new THREE.SphereGeometry(1, 8, 6), '#e0392b', spots.flatMap((spot) => [0, 1, 2].filter(() => random() < lush * 0.8).map(() => ({ at: [spot.x + (random() - 0.5) * 0.3, 0.35 + random() * spot.top * 0.7, spot.z + 0.17 + random() * 0.06] as [number, number, number], size: [0.065, 0.065, 0.065] as [number, number, number] }))), 0.25);
    } else if (a.crop === 'wheat') {
      s.box([L - 0.5, 0.14, R * 1.5], [0, 0.13, 0], soil);
      const spots: { at: [number, number, number]; size: [number, number, number] }[] = [];
      for (let i = 0; i < Math.round(520 * fullness); i++) {
        const tall = (0.45 + random() * 0.3) * wilt;
        spots.push({ at: [(random() - 0.5) * (L - 0.7), 0.2 + tall / 2, (random() - 0.5) * R * 1.4], size: [0.035, tall, 0.035] });
      }
      plants(new THREE.ConeGeometry(1, 1, 5), '#a9b548', spots);
    } else if (a.crop === 'sunflowers') {
      s.box([L - 0.5, 0.14, 0.5], [0, 0.13, 0], soil);
      const xs = along_(0.95);
      for (const x of xs) s.rod([x, 0.15, 0], [x + (dead ? 0.2 : 0), 1.25 * sag * wilt, dead ? 0.15 : 0.05], 0.025, s.material(`#${leaf('#3f7a2e').getHexString()}`));
      plants(blob, '#3f7a2e', xs.flatMap((x) => [0.5, 0.8].map((y) => ({ at: [x + (random() - 0.5) * 0.25, y * wilt, (random() - 0.5) * 0.2] as [number, number, number], size: [0.2, 0.04, 0.12] as [number, number, number] }))));
      const facing = dead ? 1.2 : 0;
      const disc = new THREE.CylinderGeometry(1, 1, 0.3, 14).rotateX(Math.PI / 2);
      plants(disc, '#f2c01d', xs.map((x) => ({ at: [x + (dead ? 0.2 : 0), 1.25 * sag * wilt - facing * 0.1, 0.14] as [number, number, number], size: [0.24, 0.24, 0.12] as [number, number, number], turn: 0 })), 0.15);
      plants(disc, '#4a2c16', xs.map((x) => ({ at: [x + (dead ? 0.2 : 0), 1.25 * sag * wilt - facing * 0.1, 0.165] as [number, number, number], size: [0.12, 0.12, 0.12] as [number, number, number], turn: 0 })));
    } else {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#e6f4ee', transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.1 });
      const spots = [-0.6, 0.6].flatMap((z) => along_(0.55).map((x) => ({ x, z })));
      for (const spot of spots) {
        s.cylinder(0.17, 0.17, 0.14, [spot.x, 0.15, spot.z], dark, 12);
        s.cylinder(0.15, 0.15, 1.05, [spot.x, 0.72, spot.z], glass, 12).castShadow = false;
      }
      plants(new THREE.CylinderGeometry(1, 1, 1, 12), '#3fd060', spots.map((spot) => ({ at: [spot.x, 0.22 + 0.45 * wilt * (0.6 + random() * 0.4), spot.z] as [number, number, number], size: [0.13, 0.9 * wilt * (0.6 + random() * 0.4), 0.13] as [number, number, number] })), 0.7);
    }
    // Grow lamps along the ridge.
    const lampOn = !dead && (a.skin === 'rose' || mood.daylight < 0.25 || mood.daylight > 0.75);
    const lamp = s.material(lampOn ? '#ff7ae0' : '#77787c', { emissive: lampOn ? '#ff4fd0' : '#000000', emissiveIntensity: 1.6 });
    for (let bay = 0; bay < bays; bay++) {
      if (bay === burstAt || bay === burstAt + 1) continue;
      s.box([spacing * 0.6, 0.05, 0.12], [ribX(bay) + spacing / 2, 0.08 + R * mix(ribHeight[bay], ribHeight[bay + 1], 0.5) - 0.2, 0], lamp);
    }

    // Door end (+x) and the pump that keeps it up (-x).
    const doorX = L / 2 + 0.02, capHeight = ribHeight[bays];
    if (a.entry === 'zip') {
      const flap = s.mesh(new THREE.PlaneGeometry(0.9, 1.25 * capHeight), new THREE.MeshStandardMaterial({ color: new THREE.Color('#e9e6dc').lerp(dust, mood.wear * 0.3), roughness: 0.8, side: THREE.DoubleSide }), [doorX + 0.01, 0.08 + 0.63 * capHeight, 0]);
      flap.rotation.y = Math.PI / 2;
      s.box([0.03, 1.2 * capHeight, 0.035], [doorX + 0.03, 0.08 + 0.62 * capHeight, 0], dark);
      s.box([0.03, 0.04, 0.9], [doorX + 0.03, 0.08 + 1.24 * capHeight, 0], dark);
    } else {
      const frame = s.ring(0.62, 0.09, [doorX + 0.05, 0.78 * capHeight, 0], metal);
      frame.rotation.y = Math.PI / 2;
      if (a.entry === 'hatch') {
        const door = s.cylinder(0.58, 0.58, 0.1, [doorX + 0.08, 0.78 * capHeight, 0], s.material('#d9d5c8', { metalness: 0.3 }), 20);
        door.rotation.z = Math.PI / 2;
        s.ring(0.2, 0.03, [doorX + 0.15, 0.78 * capHeight, 0], dark).rotation.y = Math.PI / 2;
      } else {
        const bend = (random() - 0.5) * 1.6;
        const path: [number, number, number][] = [[doorX, 0.78 * capHeight, 0], [doorX + 0.7, 0.66, 0], [doorX + 1.5, 0.6, bend * 0.4], [doorX + 2.4, 0.6, bend]];
        s.tube(path, 0.52, s.material(new THREE.Color('#d8d4c8').lerp(dust, mood.wear * 0.3), { roughness: 0.7 }));
        const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));
        for (let i = 1; i < 10; i++) {
          const at = curve.getPoint(i / 10), tangent = curve.getTangent(i / 10);
          const hoop = s.ring(0.54, 0.035, [at.x, at.y, at.z], ribPaint);
          hoop.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        }
      }
    }
    s.box([0.55, 0.5, 0.45], [-L / 2 - 0.55, 0.25, 0.5], s.material('#d0a23a', { roughness: 0.6 }));
    const fan = s.cylinder(0.17, 0.17, 0.04, [-L / 2 - 0.55, 0.3, 0.74], dark, 12);
    fan.rotation.x = Math.PI / 2;
    s.tube([[-L / 2 - 0.3, 0.3, 0.5], [-L / 2 - 0.12, 0.35, 0.45], [-L / 2 + 0.03, 0.4, 0.3]], 0.06, dark);

    if (a.sign !== 'none') {
      const board = s.label(SIGNS[a.sign], 0.95, 0.34, [L / 2 + 0.75, 0.82, R + 0.2], '#2d3a2a', '#e8dfc6');
      board.rotation.set(0, 0.35, (random() - 0.5) * 0.16);
      s.rod([L / 2 + 0.75, 0, R + 0.19], [L / 2 + 0.75, 0.7, R + 0.19], 0.022, metal);
    }
    if (a.harvest) {
      const hx = L / 2 + 0.6, hz = R - 0.55;
      s.box([0.6, 0.3, 0.42], [hx, 0.15, hz], s.material('#9a7b4f', { roughness: 0.9 }));
      const produce = { potatoes: '#b8905a', lettuce: '#8fd06a', tomatoes: '#e0392b', wheat: '#d8b65a', sunflowers: '#f2c01d', algae: '#3fd060' }[a.crop];
      s.scatter(new THREE.IcosahedronGeometry(1, 1), s.material(dead ? '#5a4a3a' : produce, { roughness: 0.8 }), Array.from({ length: dead ? 3 : 11 }, () => ({ at: [hx + (random() - 0.5) * 0.45, 0.31 + random() * 0.06, hz + (random() - 0.5) * 0.3] as const, size: 0.06 + random() * 0.03 })));
      const can = s.material('#4f8f8a', { metalness: 0.4, roughness: 0.5 });
      s.cylinder(0.11, 0.13, 0.26, [hx + 0.55, 0.13, hz + 0.2], can, 12);
      s.rod([hx + 0.62, 0.1, hz + 0.2], [hx + 0.9, 0.3, hz + 0.2], 0.022, can);
      s.ring(0.09, 0.014, [hx + 0.44, 0.16, hz + 0.2], can);
    }

    const flutter = mix(0.3, 2.5, mood.energy);
    const rest = flaps.map((flap) => flap.rotation.x);
    return s.finish({
      update: (_dt, time) => {
        hull.scale.y = 1 + Math.sin(time * 0.9 * flutter) * 0.008 * flutter;
        flaps.forEach((flap, i) => { flap.rotation.x = rest[i] + Math.sin(time * 3 * flutter + i * 1.7) * 0.22 * Math.min(flutter, 1.5); });
        if (lampOn) lamp.emissiveIntensity = 1.5 + Math.sin(time * 1.3) * 0.15;
      },
    });
  },
});
