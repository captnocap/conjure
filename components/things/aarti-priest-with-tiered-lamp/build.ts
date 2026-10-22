import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type Figure, mix, noul, score } from '@conjure/kit';

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

export default defineThing({
  questions: {
    raises: choice('What does he raise?', {
      tiered: 'A tall brass lamp of stacked tiers, each ringed with small flames.',
      single: 'A single oil lamp on a brass plate, one flame cupped from the wind.',
      incense: 'A smoking incense burner swung on a chain.',
      conch: 'A white conch shell blown with both hands, cheeks full.',
    }),
    tiers: score('If it is the tiered lamp, how tall is it?', ['Three tiers', 'Five tiers', 'Seven tiers, a tower of fire']),
    cloth: choice('What colour is his cloth?', {
      red: 'Deep red with a gold border.',
      saffron: 'Saffron orange.',
      yellow: 'Bright turmeric yellow.',
      white: 'White silk with a red border.',
      maroon: 'Maroon, almost brown in low light.',
    }),
    chest: choice('What is he wearing on top?', {
      bare: 'A bare chest with a sacred thread and a sandal-paste mark.',
      kurta: 'A kurta the same colour as the dhoti.',
      shawl: 'A gold-edged shawl over one shoulder.',
    }),
    stage: choice('What stage is the ceremony at?', {
      beginning: 'The lamp just lit, flames small and new, the crowd still gathering.',
      peak: 'The height of it: every flame tall, the bell ringing, arms swept wide.',
      ending: 'Winding down: flames guttering, the lamp lowered, smoke thick.',
    }),
    drummer: noul('Does a drummer boy stand beside him with a drum slung at his waist?'),
    petals: noul('Are petals scattered round his feet?'),
    platform: choice('What does he stand on?', {
      chauki: 'A square wooden platform covered with a red cloth.',
      stone: 'Bare stone steps.',
      carpet: 'A long red carpet runner.',
      marble: 'A white marble temple floor.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = 1.72;
    const clothColour = { red: '#a8201e', saffron: '#e07a14', yellow: '#e3b31c', white: '#efe8da', maroon: '#6a1f22' }[a.cloth];
    const skin = ['#8a5a3c', '#6b4a33', '#a06c48'][Math.floor(random() * 3)];
    const person = figure(s, {
      height: H, build: 'average', style: 'doll', hair: 'short', skin,
      pose: 'standing', gaze: a.raises === 'conch' ? 'ahead' : 'down', // the kit's 'down' lifts the chin
      top: a.chest === 'kurta' ? clothColour : skin, bottom: clothColour, shoes: skin, sleeves: a.chest === 'kurta' ? 'long' : 'short',
    });
    s.root.add(person.root);
    const joints = rig(person);
    const peak = a.stage === 'peak' ? 1 : a.stage === 'ending' ? 0 : 0.5;
    const arm = (side: 'left' | 'right', forward: number, out: number, bend: number, inward: number) => {
      const sign = side === 'left' ? 1 : -1;
      joints[side].shoulder.rotation.set(-forward * RAD, 0, sign * out * RAD);
      joints[side].elbow.rotation.set(-bend * RAD, -sign * inward * RAD, 0);
    };
    if (a.raises === 'tiered') { const lift = mix(118, 142, peak); arm('left', lift, 16, 48, 58); arm('right', lift, 16, 48, 58); }
    if (a.raises === 'single') { arm('right', 96, 10, 30, 30); arm('left', 20, 8, 40, 20); }
    if (a.raises === 'incense') { arm('right', 70, 18, 60, 20); arm('left', 14, 6, 20, 0); }
    if (a.raises === 'conch') { arm('left', 62, 10, 120, 48); arm('right', 62, 10, 120, 48); }
    person.root.updateMatrixWorld(true);
    const left = person.hands.left.getWorldPosition(new THREE.Vector3());
    const right = person.hands.right.getWorldPosition(new THREE.Vector3());
    const hips = person.pelvis.getWorldPosition(new THREE.Vector3());
    const head = person.head.getWorldPosition(new THREE.Vector3());
    const headR = H * 0.064;

    // The floor he stands on.
    const platformH = a.platform === 'chauki' ? 0.22 : a.platform === 'marble' ? 0.04 : 0.03;
    if (a.platform === 'chauki') {
      s.box([1.3, 0.2, 1.3], [hips.x, 0.1, hips.z], s.material('#6a4a2e', { roughness: 0.8 }));
      s.box([1.36, 0.03, 1.36], [hips.x, 0.215, hips.z], s.material('#9c1f1c', { roughness: 0.95 }));
    } else if (a.platform === 'carpet') s.box([1.1, 0.03, 2.4], [hips.x, 0.015, hips.z - 0.2], s.material('#9c1f1c', { roughness: 0.95 }));
    else s.box([1.8, platformH, 1.5], [hips.x, platformH / 2, hips.z], s.material(a.platform === 'marble' ? '#eae6dc' : new THREE.Color('#b3a58d').lerp(new THREE.Color('#5a5a52'), mood.wear * 0.4), { roughness: a.platform === 'marble' ? 0.3 : 0.9 }));
    person.root.position.y = platformH;
    const floorY = platformH;

    const brass = s.material('#c9962e', { metalness: 0.75, roughness: 0.3 });
    const flameMaterial = new THREE.MeshStandardMaterial({ color: '#ffe9a0', emissive: '#ff8a10', emissiveIntensity: mix(2, 3.6, mood.energy), transparent: true, opacity: 0.95, depthWrite: false });
    const flames: { mesh: THREE.InstancedMesh; seeds: { at: P; size: number; phase: number }[] } | null = a.raises === 'tiered' || a.raises === 'single' ? { mesh: new THREE.InstancedMesh(new THREE.ConeGeometry(0.021, 0.085, 7), flameMaterial, 80), seeds: [] } : null;
    const flameSize = mix(0.5, 1.25, peak) * mix(0.8, 1.25, mood.energy);
    const addFlame = (at: P, size = 1) => flames?.seeds.push({ at, size: size * flameSize, phase: random() * 6.3 });

    // Sacred thread or shawl, the garland.
    if (a.chest === 'bare') {
      const thread = s.box([0.012, 0.42, 0.012], [hips.x - 0.03, hips.y + floorY + 0.22, hips.z + 0.075], s.material('#f4f1e6'));
      thread.rotation.set(0.15, 0, 0.5);
    }
    if (a.chest === 'shawl') {
      const shawl = s.box([0.1, 0.5, 0.03], [hips.x + 0.02, hips.y + floorY + 0.24, hips.z + 0.085], s.material('#e9c86a', { roughness: 0.6 }));
      shawl.rotation.set(0.1, 0, -0.5);
    }
    const garland = s.mesh(new THREE.TorusGeometry(headR * 1.55, 0.024, 8, 26), s.material('#f0831a', { emissive: '#7a3000', emissiveIntensity: 0.25, roughness: 0.9 }), [head.x, head.y + floorY - headR * 2.2, head.z + 0.04]);
    garland.rotation.x = Math.PI / 2 - 0.5;
    garland.scale.y = 1.4;

    // What he raises.
    const grip = new THREE.Vector3().addVectors(left, right).multiplyScalar(0.5);
    grip.y += floorY;
    let swing: THREE.Group | null = null;
    const smokes: { mesh: THREE.Mesh; size: number }[] = [];
    const puff = (x: number, y: number, z: number, size: number) => {
      const mesh = s.ball([size, size, size], [x, y, z], new THREE.MeshStandardMaterial({ color: '#d9d6cf', transparent: true, opacity: 0.18, depthWrite: false }), 8);
      mesh.castShadow = false;
      smokes.push({ mesh, size });
    };
    if (a.raises === 'tiered') {
      const tiers = 3 + Math.round(a.tiers * 4);
      const stemBottom = grip.y - 0.1, step = 0.1;
      s.rod([grip.x, stemBottom, grip.z], [grip.x, stemBottom + 0.2 + tiers * step + 0.08, grip.z], 0.016, brass, 0.011);
      s.cylinder(0.035, 0.03, 0.08, [grip.x, grip.y, grip.z], brass, 12);
      for (let tier = 0; tier < tiers; tier++) {
        const y = stemBottom + 0.22 + tier * step;
        const radius = 0.17 - tier * (0.11 / Math.max(1, tiers - 1));
        s.cylinder(radius, radius - 0.01, 0.014, [grip.x, y, grip.z], brass, 24);
        const count = Math.max(6, Math.round(radius * 60));
        for (let i = 0; i < count; i++) {
          const t = (i / count) * Math.PI * 2 + tier * 0.3;
          const fx = grip.x + Math.cos(t) * (radius - 0.02), fz = grip.z + Math.sin(t) * (radius - 0.02);
          addFlame([fx, y + 0.045, fz]);
        }
        s.scatter(new THREE.CylinderGeometry(0.012, 0.008, 0.016, 8), brass, Array.from({ length: count }, (_u, i) => { const t = (i / count) * Math.PI * 2 + tier * 0.3; return { at: [grip.x + Math.cos(t) * (radius - 0.02), y + 0.012, grip.z + Math.sin(t) * (radius - 0.02)] as P, size: 1 }; }));
      }
      s.ball([0.03, 0.03, 0.03], [grip.x, stemBottom + 0.22 + tiers * step + 0.03, grip.z], brass, 10);
    }
    if (a.raises === 'single') {
      const r = right.clone(); r.y += floorY;
      s.cylinder(0.11, 0.1, 0.012, [r.x, r.y + 0.01, r.z + 0.02], brass, 20);
      s.lathe([[0, 0], [0.04, 0], [0.05, 0.03], [0.03, 0.05], [0, 0.05]], brass, [r.x, r.y + 0.016, r.z + 0.02]);
      addFlame([r.x, r.y + 0.09, r.z + 0.02], 1.6);
    }
    if (a.raises === 'incense') {
      const r = right.clone(); r.y += floorY;
      swing = new THREE.Group();
      swing.position.copy(r);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.3, 6), brass);
      chain.position.y = -0.15;
      const burner = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.05, 0], [0.07, 0.03], [0.065, 0.07], [0.03, 0.1], [0.04, 0.13], [0, 0.14]].map(([x, y]) => new THREE.Vector2(x, y)), 18), brass);
      burner.position.y = -0.42;
      burner.castShadow = chain.castShadow = true;
      swing.add(chain, burner);
      s.root.add(swing);
      for (let i = 0; i < 6; i++) puff(r.x + (random() - 0.5) * 0.08, r.y - 0.3 + i * 0.14, r.z + (random() - 0.5) * 0.08, 0.025 + i * 0.01);
    }
    if (a.raises === 'conch') {
      const conch = s.ball([0.13, 0.075, 0.08], [grip.x, grip.y + 0.02, grip.z + 0.03], s.material('#efe8dc', { roughness: 0.5 }), 14);
      conch.rotation.set(0.2, 0.6, 0.3);
      s.cylinder(0.006, 0.04, 0.1, [grip.x + 0.1, grip.y + 0.03, grip.z + 0.05], s.material('#efe8dc', { roughness: 0.5 }), 8).rotation.z = Math.PI / 2 - 0.4;
    }
    if (a.stage === 'ending') for (let i = 0; i < 4; i++) puff(grip.x + (random() - 0.5) * 0.2, grip.y + 0.55 + i * 0.12, grip.z + (random() - 0.5) * 0.15, 0.03 + i * 0.012);

    // The conch at his feet and the bell on its stand.
    const conch = s.ball([0.11, 0.065, 0.07], [hips.x - 0.3, floorY + 0.06, hips.z + 0.32], s.material('#efe8dc', { roughness: 0.5 }), 12);
    conch.rotation.y = 0.5;
    s.cylinder(0.005, 0.035, 0.09, [hips.x - 0.21, floorY + 0.045, hips.z + 0.36], s.material('#efe8dc', { roughness: 0.5 }), 8).rotation.z = Math.PI / 2 - 0.4;
    const wood = s.material('#5a3a22', { roughness: 0.8 });
    const bx = hips.x + 0.62, bz = hips.z + 0.05;
    for (const dz of [-0.14, 0.14]) s.rod([bx, floorY, bz + dz], [bx, floorY + 0.62, bz + dz], 0.018, wood);
    s.rod([bx, floorY + 0.62, bz - 0.17], [bx, floorY + 0.62, bz + 0.17], 0.016, wood);
    const bell = new THREE.Group();
    bell.position.set(bx, floorY + 0.6, bz);
    const bellMesh = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.065, 0.03], [0.045, 0.1], [0.03, 0.14], [0.012, 0.16], [0, 0.16]].map(([x, y]) => new THREE.Vector2(x, y)), 20), brass);
    bellMesh.position.y = -0.2;
    bellMesh.castShadow = true;
    const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), s.material('#3a3836', { metalness: 0.5 }));
    clapper.position.y = -0.2;
    bell.add(bellMesh, clapper);
    s.root.add(bell);

    // Petals, and the drummer boy.
    const petalCount = a.petals ? Math.round(14 + mood.cheer * 24) : 0;
    if (petalCount) s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#f0831a', { roughness: 0.8 }), Array.from({ length: petalCount }, (_u, i) => {
      const t = random() * Math.PI * 2, d = 0.25 + random() * 0.55;
      return { at: [hips.x + Math.cos(t) * d, floorY + 0.01, hips.z + 0.1 + Math.sin(t) * d * 0.8] as P, size: 0.014 + random() * 0.01, color: i % 3 ? '#f0831a' : '#f2b21c' };
    }));
    let boy: Figure | null = null;
    if (a.drummer) {
      boy = figure(s, { height: 1.22, build: 'slight', style: 'doll', hair: 'short', skin: ['#8a5a3c', '#6b4a33'][Math.floor(random() * 2)], pose: 'carrying', top: '#efe8da', bottom: '#3a3a44', shoes: '#2a2a2c', sleeves: 'short', gaze: 'ahead' });
      boy.root.position.set(hips.x - 0.78, floorY, hips.z - 0.12);
      boy.root.rotation.y = 0.5;
      s.root.add(boy.root);
      boy.root.updateMatrixWorld(true);
      const bh = boy.pelvis.getWorldPosition(new THREE.Vector3());
      const drum = s.cylinder(0.1, 0.1, 0.26, [bh.x, bh.y + floorY + 0.1, bh.z + 0.22], s.material('#b58a4a', { roughness: 0.7 }), 16);
      drum.rotation.set(0, 0.5, Math.PI / 2);
      const strap = s.mesh(new THREE.TorusGeometry(0.17, 0.008, 6, 20), s.material('#7a2a2a'), [bh.x, bh.y + floorY + 0.3, bh.z + 0.04]);
      strap.rotation.set(0.3, 0, 0.6);
    }

    if (flames) {
      const seeds = flames.seeds;
      flames.mesh.count = seeds.length;
      const matrix = new THREE.Matrix4();
      for (const [i, seed] of seeds.entries()) {
        matrix.makeScale(seed.size, seed.size, seed.size).setPosition(...seed.at);
        flames.mesh.setMatrixAt(i, matrix);
      }
      flames.mesh.instanceMatrix.needsUpdate = true;
      flames.mesh.castShadow = false;
      s.root.add(flames.mesh);
    }

    const energy = mood.energy;
    const matrix = new THREE.Matrix4();
    const ringing = a.stage === 'peak';
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        boy?.update(dt, time);
        if (flames) {
          const rate = 9 + energy * 8;
          for (const [i, seed] of flames.seeds.entries()) {
            const flicker = seed.size * (1 + Math.sin(time * rate + seed.phase) * 0.18 * (0.3 + energy));
            matrix.makeScale(seed.size * (1 + Math.sin(time * 7 + seed.phase) * 0.08), flicker, seed.size).setPosition(seed.at[0], seed.at[1] + (flicker - seed.size) * 0.02, seed.at[2]);
            flames.mesh.setMatrixAt(i, matrix);
          }
          flames.mesh.instanceMatrix.needsUpdate = true;
        }
        if (swing) swing.rotation.x = Math.sin(time * (1.5 + energy)) * 0.3 * (0.3 + energy);
        bell.rotation.z = ringing ? Math.sin(time * (5 + energy * 4)) * 0.22 * (0.4 + energy) : Math.sin(time * 0.9) * 0.015 * energy;
        for (const [i, { mesh, size }] of smokes.entries()) {
          mesh.position.x += Math.sin(time * 0.8 + i) * 0.0005 * (0.3 + energy);
          mesh.scale.setScalar(size * (1 + Math.sin(time * 1.1 + i * 0.7) * 0.08));
        }
      },
    });
  },
});
