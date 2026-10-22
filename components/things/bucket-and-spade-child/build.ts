import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { paint, pickSkin, rig, worldOf } from './rig';

const BUCKETS: Record<string, string> = { red: '#d8352c', yellow: '#f2c21c', blue: '#2b6fb8', green: '#3aa655', pink: '#ee6fa0' };

export default defineThing({
  questions: {
    progress: score('How far along is the sandcastle?', ['A first lump of sand', 'One upturned-bucket tower', 'Three turrets and a moat', 'A turreted fortress with walls, shells and a flag']),
    doing: choice('What is the child doing right now?', {
      patting: 'Patting the top of a turret flat with both hands.',
      digging: 'Digging the moat with the spade, sand flying.',
      flag: 'Reaching to plant the flag on the highest turret.',
      admiring: 'Sitting back on their heels, hands on knees, admiring it.',
    }),
    outfit: choice('What is the child wearing?', {
      swimsuit: 'A floppy sun hat and a swimsuit.',
      rash: 'A long-sleeved bright rash shirt and a cap.',
      hoodie: 'A hoodie with the hood up against the wind.',
      bare: 'Trunks and a sunburnt back, no hat.',
    }),
    flag: choice('What is the flag on the castle?', {
      triangle: 'A red paper triangle on a stick.',
      sun: 'A white square with a drawn sun.',
      pennant: 'A striped pennant.',
      shell: 'A seashell stuck on the top turret instead of a flag.',
      stick: 'A bare lolly stick, the flag lost.',
    }),
    company: choice('Who else is here?', {
      alone: 'Nobody, the child is absorbed and alone.',
      parent: 'A parent standing over them, looking down.',
      sibling: 'A second, smaller child kneeling on the far side, helping or wrecking.',
      both: 'A parent standing by and a second child kneeling opposite.',
    }),
    bucket: choice('What colour are the bucket and spade?', {
      red: 'Red.', yellow: 'Yellow.', blue: 'Blue.', green: 'Green.', pink: 'Pink.',
    }),
    wave: noul('Has a wave reached the moat and filled it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const skin = pickSkin(random);
    const plastic = s.material(BUCKETS[a.bucket], { roughness: 0.35 });
    const dry = s.material('#e6d3a4', { roughness: 1 });
    const wet = s.material('#c4a874', { roughness: 0.95 });
    const H = mix(0.92, 1.08, random());
    const bright = ['#ff7a1a', '#2bb5b0', '#f2c21c', '#ee6fa0', '#5a7bd8'][Math.floor(random() * 5)];
    const kneeling = a.doing === 'admiring';
    const child = figure(s, {
      height: H, build: 'average', style: 'doll', skin,
      hair: a.outfit === 'swimsuit' ? 'hat' : a.outfit === 'rash' ? 'cap' : a.outfit === 'hoodie' ? 'hood' : 'short',
      hairColor: a.outfit === 'swimsuit' ? '#f1e7c8' : a.outfit === 'rash' ? bright : '#3a2a1e',
      top: a.outfit === 'bare' ? skin : a.outfit === 'swimsuit' ? (random() < 0.5 ? skin : bright) : bright,
      bottom: a.outfit === 'hoodie' ? '#3d4652' : bright, shoes: skin, sleeves: a.outfit === 'swimsuit' || a.outfit === 'bare' ? 'short' : 'long',
      pose: kneeling ? 'kneeling' : 'crouching', gaze: 'ahead',
    });
    child.root.position.set(0, 0, -0.36);
    s.root.add(child.root);
    const joints = rig(child);
    if (a.doing === 'patting') {
      joints.arm('left', { forward: 70, out: 14, bend: 10 });
      joints.arm('right', { forward: 70, out: 14, bend: 10 });
      joints.look(32, 0);
    } else if (a.doing === 'digging') {
      joints.arm('right', { forward: 50, out: 18, bend: 40, across: 20 });
      joints.arm('left', { forward: 60, out: 10, bend: 20 });
      joints.look(28, -14);
    } else if (a.doing === 'flag') {
      joints.arm('right', { forward: 95, out: 6, bend: 12, across: 20 });
      joints.arm('left', { forward: 40, out: 20, bend: 30 });
      joints.look(16, 0);
    } else {
      joints.arm('left', { forward: 30, out: 8, bend: 50 });
      joints.arm('right', { forward: 30, out: 8, bend: 50 });
      joints.look(20, 0);
    }
    joints.settle(false);

    // The castle: a base, then towers, walls and a keep as the afternoon goes on.
    const cx = 0, cz = 0.18;
    const towers = a.progress < 0.18 ? 0 : a.progress < 0.5 ? 1 : 3;
    const walls = a.progress >= 0.78;
    const keep = a.progress >= 0.5;
    const baseR = mix(0.22, 0.42, a.progress);
    s.ball([baseR, mix(0.1, 0.07, a.progress), baseR], [cx, 0, cz], dry, 18);
    if (towers) s.cylinder(baseR * 0.95, baseR, 0.06, [cx, 0.03, cz], dry, 24);
    const tower = (x: number, z: number, r: number, h: number) => {
      s.cylinder(r * 0.92, r, h, [x, 0.06 + h / 2, z], dry, 18);
      const merlons = 7;
      for (let i = 0; i < merlons; i++) {
        const t = (i / merlons) * Math.PI * 2;
        s.box([r * 0.42, r * 0.3, r * 0.3], [x + Math.sin(t) * r * 0.78, 0.06 + h + r * 0.15, z + Math.cos(t) * r * 0.78], dry).rotation.y = t;
      }
      return [x, 0.06 + h, z] as const;
    };
    const tops: (readonly [number, number, number])[] = [];
    if (towers === 1) tops.push(tower(cx, cz, 0.11, 0.2));
    if (towers === 3) {
      const ring = baseR * 0.62;
      for (let i = 0; i < 3; i++) {
        const t = (i / 3) * Math.PI * 2 + 0.5;
        tops.push(tower(cx + Math.sin(t) * ring, cz + Math.cos(t) * ring, 0.1, 0.2));
      }
      if (walls) for (let i = 0; i < 3; i++) {
        const from = tops[i], to = tops[(i + 1) % 3];
        const mx = (from[0] + to[0]) / 2, mz = (from[2] + to[2]) / 2;
        const wall = s.box([Math.hypot(to[0] - from[0], to[2] - from[2]) - 0.1, 0.12, 0.05], [mx, 0.12, mz], dry);
        wall.rotation.y = Math.atan2(to[0] - from[0], to[2] - from[2]) + Math.PI / 2;
        for (let m = -1; m <= 1; m++) {
          const mer = s.box([0.035, 0.03, 0.05], [mx + Math.sin(wall.rotation.y + Math.PI / 2) * m * 0.07, 0.195, mz + Math.cos(wall.rotation.y + Math.PI / 2) * m * 0.07], dry);
          mer.rotation.y = wall.rotation.y;
        }
      }
    }
    if (keep) tops.push(tower(cx, cz, 0.13, towers === 3 ? 0.3 : 0.26));
    const summit = tops.length ? tops[tops.length - 1] : ([cx, mix(0.1, 0.07, a.progress), cz] as const);

    // The flag, or a shell, on the highest point (or held up in the hand when planting it).
    const stick = s.material('#d9c9a0');
    const flagMap = paint(64, 48, (c) => {
      if (a.flag === 'triangle') { c.clearRect(0, 0, 64, 48); c.fillStyle = '#d8352c'; c.beginPath(); c.moveTo(0, 0); c.lineTo(64, 24); c.lineTo(0, 48); c.fill(); }
      else if (a.flag === 'sun') { c.fillStyle = '#f7f2e4'; c.fillRect(0, 0, 64, 48); c.fillStyle = '#f2b21c'; c.beginPath(); c.arc(32, 24, 11, 0, 7); c.fill(); c.strokeStyle = '#f2b21c'; c.lineWidth = 3; for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; c.beginPath(); c.moveTo(32 + Math.cos(t) * 14, 24 + Math.sin(t) * 14); c.lineTo(32 + Math.cos(t) * 20, 24 + Math.sin(t) * 20); c.stroke(); } }
      else { c.clearRect(0, 0, 64, 48); for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#2b6fb8' : '#f7f2e4'; c.beginPath(); c.moveTo(0, i * 8); c.lineTo(64 - i * 10.6, 24); c.lineTo(0, i * 8 + 8); c.fill(); } }
    });
    const flagPaint = new THREE.MeshStandardMaterial({ map: flagMap, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 });
    const flagAt = (parent: THREE.Object3D, at: [number, number, number], length: number) => {
      const group = new THREE.Group();
      group.position.set(...at);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, length, 6), stick);
      pole.position.y = length / 2;
      pole.castShadow = true;
      group.add(pole);
      if (a.flag !== 'stick' && a.flag !== 'shell') {
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.065), flagPaint);
        cloth.position.set(0.045, length - 0.04, 0);
        cloth.castShadow = true;
        group.add(cloth);
      }
      parent.add(group);
      return group;
    };
    let flag: THREE.Group | null = null;
    if (a.flag === 'shell') s.ball([0.035, 0.02, 0.03], [summit[0], summit[1] + 0.02, summit[2]], s.material('#f4ece0'), 10);
    else if (a.doing === 'flag') {
      const hand = worldOf(child.hands.right);
      flag = flagAt(s.root, [hand.x, hand.y - 0.05, hand.z], 0.16);
    } else flag = flagAt(s.root, [summit[0], summit[1] - 0.01, summit[2]], 0.16);

    // The moat: a ring of darker, dug sand; filled with sea water when a wave has reached it.
    const moatR = baseR + 0.12;
    if (a.progress > 0.3 || a.wave) {
      const moat = s.mesh(new THREE.RingGeometry(moatR - 0.07, moatR + 0.07, 36), wet, [cx, 0.003, cz]);
      moat.rotation.x = -Math.PI / 2;
      moat.castShadow = false;
      const bank = s.mesh(new THREE.TorusGeometry(moatR + 0.1, 0.03, 6, 36), dry, [cx, 0, cz]);
      bank.rotation.x = Math.PI / 2;
      bank.scale.y = 0.5;
      if (a.wave) {
        const water = s.mesh(new THREE.RingGeometry(moatR - 0.065, moatR + 0.065, 36), new THREE.MeshStandardMaterial({ color: '#5fb6c9', roughness: 0.1, metalness: 0.1, emissive: '#3b8fa3', emissiveIntensity: 0.15 }), [cx, 0.008, cz]);
        water.rotation.x = -Math.PI / 2;
        water.castShadow = false;
        // The wet streak the wave left, and a bit of foam.
        const streak = s.mesh(new THREE.CircleGeometry(0.4, 24), wet, [cx + 0.2, 0.002, cz + 0.5]);
        streak.rotation.x = -Math.PI / 2;
        streak.scale.set(1.4, 0.5, 1);
        streak.castShadow = false;
        const foam = s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#f7f6ef'), Array.from({ length: 14 }, () => ({ at: [cx + 0.2 + (random() - 0.5) * 1.0, 0.006, cz + 0.6 + (random() - 0.5) * 0.12] as const, size: 0.012 + random() * 0.014 })));
        foam.scale.y = 0.4;
      }
    }

    // Spade in the hand or stuck in the sand; bucket beside, upturned when a tower has just been made.
    const bladeMaterial = plastic;
    const spade = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.3, 8), plastic);
    handle.position.y = -0.1;
    const grip = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 6, 12, Math.PI), plastic);
    grip.position.y = 0.05;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.012), bladeMaterial);
    blade.position.y = -0.3;
    handle.castShadow = blade.castShadow = true;
    spade.add(handle, grip, blade);
    if (a.doing === 'digging') {
      spade.position.set(0, -0.02, 0.01);
      spade.rotation.set(0.2, 0, 0);
      child.hands.right.add(spade);
      // Sand flying off the blade.
      const hand = worldOf(child.hands.right);
      s.scatter(new THREE.SphereGeometry(1, 5, 4), dry, Array.from({ length: 10 }, () => ({ at: [hand.x + 0.1 + random() * 0.25, 0.1 + random() * 0.25, hand.z + 0.1 + random() * 0.2] as const, size: 0.008 + random() * 0.01 })));
    } else {
      spade.position.set(0.42, 0.26, 0.42);
      spade.rotation.set(0.5, 0.6, -0.3);
      s.root.add(spade);
    }
    const bucketAt: [number, number, number] = [-0.42, 0, 0.26];
    const upturned = a.doing === 'patting' && towers > 0;
    if (upturned) {
      s.cylinder(0.11, 0.095, 0.15, [bucketAt[0], 0.075, bucketAt[2]], plastic, 18);
      s.ring(0.09, 0.008, [bucketAt[0], 0.16, bucketAt[2]], plastic, Math.PI).rotation.set(0, 0.8, 0);
    } else {
      s.lathe([[0.095, 0], [0.1, 0.01], [0.11, 0.16], [0.12, 0.17], [0.1, 0.17], [0.09, 0.02]], plastic, bucketAt);
      const arc = s.ring(0.11, 0.008, [bucketAt[0], 0.17, bucketAt[2]], plastic, Math.PI);
      arc.rotation.set(0, 0.8, 0);
      s.cylinder(0.085, 0.085, 0.1, [bucketAt[0], 0.07, bucketAt[2]], wet, 16);
    }

    // Shells and small footprints in the sand around the work.
    const shells = Math.round(mix(1, 6, a.progress) + mood.density * 3);
    s.scatter(new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), s.material('#f3eadb'), Array.from({ length: shells }, () => {
      const t = random() * Math.PI * 2, r = moatR + 0.15 + random() * 0.25;
      return { at: [cx + Math.sin(t) * r, 0.003, cz + Math.cos(t) * r] as const, size: 0.02 + random() * 0.02 };
    }));
    const prints = s.scatter(new THREE.SphereGeometry(1, 6, 4), wet, Array.from({ length: 10 }, (_u, i) => ({ at: [-0.25 + i * 0.06 + (i % 2) * 0.06, 0.001, -0.62 + i * 0.025 + (random() - 0.5) * 0.04] as const, size: 0.028 })));
    prints.scale.set(1, 0.15, 1.5);

    // Company: a parent looking down, a second child kneeling opposite.
    const others: ReturnType<typeof figure>[] = [];
    if (a.company === 'parent' || a.company === 'both') {
      const Hp = mix(1.62, 1.84, random());
      const parentSkin = pickSkin(random);
      const parent = figure(s, {
        height: Hp, style: 'doll', skin: parentSkin, hair: (['short', 'long', 'bun', 'hat'] as const)[Math.floor(random() * 4)], hairColor: random() < 0.3 ? '#f1e7c8' : '#3a2a1e',
        top: random() < 0.5 ? parentSkin : ['#f4f1e8', '#2b6fb8', '#ee6fa0'][Math.floor(random() * 3)], bottom: ['#d8352c', '#1d1d1f', '#2bb5b0'][Math.floor(random() * 3)],
        shoes: parentSkin, sleeves: 'short', pose: 'standing', gaze: 'ahead',
      });
      parent.root.position.set(-0.6, 0, -0.42);
      parent.root.rotation.y = 0.55;
      s.root.add(parent.root);
      const pr = rig(parent);
      pr.arm('left', { forward: -8, out: 30, bend: 50, across: 70 });
      pr.arm('right', { forward: 6, out: 10, bend: 14 });
      pr.look(34, 0);
      pr.settle(false);
      others.push(parent);
    }
    if (a.company === 'sibling' || a.company === 'both') {
      const Hs = H * mix(0.78, 0.95, random());
      const sib = figure(s, {
        height: Hs, style: 'doll', skin: random() < 0.6 ? skin : pickSkin(random), hair: random() < 0.5 ? 'hat' : 'short', hairColor: random() < 0.5 ? '#f1e7c8' : '#3a2a1e',
        top: ['#f2c21c', '#5a7bd8', '#ff7a1a'][Math.floor(random() * 3)], bottom: ['#d8352c', '#2bb5b0', '#f4f1e8'][Math.floor(random() * 3)], shoes: skin, sleeves: 'short',
        pose: 'kneeling', gaze: 'ahead',
      });
      sib.root.position.set(0.52, 0, 0.26);
      sib.root.rotation.y = -Math.PI / 2 + 0.2;
      s.root.add(sib.root);
      const sr = rig(sib);
      sr.arm('left', { forward: 60, out: 10, bend: 20 });
      sr.arm('right', { forward: 45, out: 16, bend: 40 });
      sr.look(30, 0);
      sr.settle(false);
      others.push(sib);
    }

    const energy = mood.energy;
    return s.finish({
      update: (dt, time) => {
        child.update(dt, time);
        for (const other of others) other.update(dt, time);
        if (flag) flag.rotation.y = Math.sin(time * 2.2) * 0.1 * (0.2 + energy);
      },
    });
  },
});
