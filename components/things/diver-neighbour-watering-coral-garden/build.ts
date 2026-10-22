import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';

const SUITS = {
  canvas: 'Old tan canvas suit, the classic deep-sea diver.',
  red: 'Cherry red suit.',
  yellow: 'Sunny yellow suit.',
  navy: 'Navy blue suit.',
  green: 'Pea green suit.',
} as const;
const SUIT_COLOUR: Record<keyof typeof SUITS, string> = { canvas: '#c9b48a', red: '#c8382e', yellow: '#e8c23a', navy: '#2f4470', green: '#6f8a3c' };

export default defineThing({
  questions: {
    suit: choice('What colour is the diving suit?', SUITS),
    helmet: choice('What kind of helmet?', {
      brass: 'A polished brass helmet with three portholes.',
      copper: 'A dull copper helmet with one big round window.',
      painted: 'A white-painted helmet, chipped at the edges.',
    }),
    tool: choice('What are they holding?', {
      can: 'A tin watering can tipped to pour on the bed.',
      hose: 'A green garden hose, held out and spraying.',
      rake: 'A wooden rake, raking the sand smooth.',
    }),
    garden: choice('What grows in the garden bed?', {
      coral: 'Branching pink and orange coral, pruned like rose bushes.',
      kelp: 'Rows of leafy green kelp.',
      flowers: 'Bright cartoon flowers on stems.',
      sponges: 'Round tube sponges in neat rows.',
    }),
    edge: choice('What edges the garden bed?', {
      pebbles: 'A ring of grey pebbles.',
      planks: 'A low frame of wooden planks.',
      shells: 'A row of scallop shells pushed into the sand.',
      none: 'No edge, just bare sand.',
    }),
    fence: noul('Is there a white picket fence section behind the garden?'),
    height: score('How tall is the diver?', ['A small child', 'Average height', 'Tall and lanky']),
    company: choice('What else is in the garden?', {
      nothing: 'Nothing else.',
      gnome: 'A garden gnome in a red pointed hat.',
      sign: 'A little sign reading KEEP OFF THE CORAL.',
      barrow: 'A wheelbarrow heaped with fresh sand.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.05, 1.95, a.height);
    const suit = SUIT_COLOUR[a.suit];
    const person = figure(s, {
      height: H, build: 'heavy', style: 'doll', hair: 'none', face: 'blank',
      top: suit, bottom: suit, shoes: '#3a2e24', skin: suit, sleeves: 'long',
    });
    s.root.add(person.root);
    const { joints } = person;
    if (a.tool === 'rake') {
      for (const side of ['left', 'right'] as const) {
        joints.shoulders[side].rotation.x = side === 'right' ? -0.95 : -0.55;
        joints.shoulders[side].rotation.z = side === 'left' ? 0.12 : -0.12;
        joints.elbows[side].rotation.x = -0.35;
      }
      joints.spine.rotation.x = 0.18;
      joints.neck.rotation.x = 0.3;
    } else {
      joints.shoulders.right.rotation.x = -0.95;
      joints.shoulders.right.rotation.z = -0.3;
      joints.elbows.right.rotation.x = -0.4;
      joints.shoulders.left.rotation.x = 0.12;
      joints.shoulders.left.rotation.z = 0.6;
      joints.elbows.left.rotation.set(-1.5, -0.9, 0);
      joints.neck.rotation.x = 0.35;
    }
    person.settle();
    person.root.updateMatrixWorld(true);

    // The helmet: a sphere over the head with portholes, a corselet ring and an air hose.
    const headR = H * 0.064;
    const helmetR = headR * 1.5;
    const metal = s.material({ brass: '#c9a24a', copper: '#a86a3a', painted: '#e9e6dc' }[a.helmet], { metalness: a.helmet === 'painted' ? 0.2 : 0.75, roughness: a.helmet === 'painted' ? 0.6 : 0.3 });
    const rim = s.material(a.helmet === 'painted' ? '#8c8578' : '#8a6a2a', { metalness: 0.7, roughness: 0.35 });
    const glass = new THREE.MeshStandardMaterial({ color: '#8fc8e6', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.7 });
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(helmetR, 24, 16), metal);
    helmet.castShadow = true;
    person.head.add(helmet);
    const porthole = (angle: number, r: number) => {
      const group = new THREE.Group();
      group.rotation.y = angle;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.18, 8, 24), rim);
      ring.position.z = helmetR * 0.98;
      const pane = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 24), glass);
      pane.position.z = helmetR * 0.985;
      ring.castShadow = true;
      group.add(ring, pane);
      person.head.add(group);
    };
    porthole(0, a.helmet === 'copper' ? helmetR * 0.6 : helmetR * 0.46);
    if (a.helmet === 'brass') { porthole(Math.PI / 2, helmetR * 0.32); porthole(-Math.PI / 2, helmetR * 0.32); }
    const eye = s.material('#2a2320', { roughness: 0.4 });
    for (const side of [-1, 1]) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(helmetR * 0.07, 8, 6), eye);
      dot.position.set(side * helmetR * 0.16, helmetR * 0.05, helmetR * 0.96);
      person.head.add(dot);
    }
    const corselet = new THREE.Mesh(new THREE.TorusGeometry(helmetR * 0.78, H * 0.02, 8, 24), rim);
    corselet.rotation.x = Math.PI / 2;
    corselet.position.y = -helmetR * 0.72;
    person.head.add(corselet);
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(helmetR * 0.14, helmetR * 0.14, helmetR * 0.2, 10), rim);
    valve.position.y = helmetR * 1.02;
    person.head.add(valve);
    const headAt = person.head.getWorldPosition(new THREE.Vector3());
    const hoseStart = headAt.clone().add(new THREE.Vector3(0, -helmetR * 0.2, -helmetR));
    s.tube([
      [hoseStart.x, hoseStart.y, hoseStart.z],
      [hoseStart.x + 0.05 * H, hoseStart.y - 0.25 * H, hoseStart.z - 0.12 * H],
      [hoseStart.x + 0.1 * H, 0.08, hoseStart.z - 0.35 * H],
      [hoseStart.x + 0.3 * H, 0.03, hoseStart.z - 0.45 * H],
    ], 0.012 * H, s.material('#55524a', { roughness: 0.8 }));

    // The tool in hand.
    const bedZ = 0.5 + 0.32 * H;
    const bedW = 1.15, bedD = 0.7;
    const tin = s.material('#9ea5a8', { metalness: 0.6, roughness: 0.45 });
    const water = new THREE.MeshStandardMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.6, roughness: 0.1, depthWrite: false });
    const drops: { mesh: THREE.Mesh; phase: number }[] = [];
    let spout = new THREE.Vector3();
    const hold = (hand: THREE.Object3D) => {
      hand.updateWorldMatrix(true, false);
      const group = new THREE.Group();
      group.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()).invert());
      hand.add(group);
      return group;
    };
    if (a.tool === 'can') {
      const can = hold(person.hands.right);
      const k = H * 0.14;
      const tilt = new THREE.Group();
      tilt.rotation.x = 0.55;
      can.add(tilt);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(k * 0.5, k * 0.55, k, 16), tin);
      body.position.set(0, -k * 0.75, k * 0.1);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(k * 0.4, k * 0.05, 8, 20, Math.PI), tin);
      handle.position.set(0, -k * 0.3, k * 0.1);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(k * 0.06, k * 0.08, k * 0.9, 8), tin);
      neck.position.set(0, -k * 0.45, k * 0.75);
      neck.rotation.x = -0.9;
      const rose = new THREE.Mesh(new THREE.CylinderGeometry(k * 0.16, k * 0.1, k * 0.12, 10), tin);
      rose.position.set(0, -k * 0.1, k * 1.1);
      rose.rotation.x = -0.9;
      for (const part of [body, handle, neck, rose]) { part.castShadow = true; tilt.add(part); }
      tilt.updateWorldMatrix(true, true);
      spout = rose.getWorldPosition(new THREE.Vector3());
    }
    if (a.tool === 'hose') {
      const nozzle = hold(person.hands.right);
      const k = H * 0.1;
      const brass = s.material('#c9a24a', { metalness: 0.7, roughness: 0.3 });
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(k * 0.12, k * 0.15, k * 1.2, 10), brass);
      grip.rotation.x = Math.PI / 2 - 0.5;
      grip.position.set(0, -k * 0.2, k * 0.3);
      grip.castShadow = true;
      nozzle.add(grip);
      nozzle.updateWorldMatrix(true, true);
      spout = grip.localToWorld(new THREE.Vector3(0, k * 0.6, 0));
      const back = grip.localToWorld(new THREE.Vector3(0, -k * 0.6, 0));
      const hose = s.material('#3f8f3a', { roughness: 0.7 });
      s.tube([
        [back.x, back.y, back.z],
        [back.x + 0.1 * H, back.y - 0.3 * H, back.z - 0.15 * H],
        [back.x + 0.25 * H, 0.03, back.z - 0.4 * H],
        [back.x + 0.05 * H, 0.03, back.z - 0.6 * H],
      ], 0.014 * H, hose);
      s.ring(0.12 * H, 0.014 * H, [back.x + 0.05 * H, 0.03, back.z - 0.7 * H], hose).rotation.x = Math.PI / 2;
      s.ring(0.1 * H, 0.014 * H, [back.x + 0.06 * H, 0.055, back.z - 0.7 * H], hose).rotation.x = Math.PI / 2;
    }
    if (a.tool === 'rake') {
      const right = person.hands.right.getWorldPosition(new THREE.Vector3());
      const left = person.hands.left.getWorldPosition(new THREE.Vector3());
      const grip = right.clone().lerp(left, 0.5);
      const headAt = new THREE.Vector3(0.15 * H, 0.03, bedZ - bedD * 0.5 - 0.05);
      const dir = headAt.clone().sub(grip).normalize();
      const top = grip.clone().addScaledVector(dir, -0.25 * H);
      s.rod(top.toArray() as [number, number, number], headAt.toArray() as [number, number, number], 0.012 * H, s.material('#a8824f'));
      const rake = new THREE.Group();
      rake.position.copy(headAt);
      rake.rotation.y = Math.atan2(dir.x, dir.z);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.36 * H, 0.025 * H, 0.03 * H), s.material('#7a5a34'));
      bar.castShadow = true;
      rake.add(bar);
      for (let i = 0; i < 7; i++) {
        const tine = new THREE.Mesh(new THREE.BoxGeometry(0.012 * H, 0.06 * H, 0.012 * H), s.material('#5a5a5a', { metalness: 0.5 }));
        tine.position.set((i - 3) * 0.055 * H, -0.03 * H, 0);
        rake.add(tine);
      }
      s.root.add(rake);
    }
    if (a.tool !== 'rake') {
      const target = new THREE.Vector3((random() - 0.5) * 0.3, 0.1, bedZ - 0.1);
      const n = a.tool === 'hose' ? 10 : 7;
      for (let i = 0; i < n; i++) {
        const drop = s.ball([0.02 * H, 0.03 * H, 0.02 * H], [0, 0, 0], water, 6);
        drop.castShadow = false;
        drops.push({ mesh: drop, phase: i / n });
      }
      const place = (time: number) => {
        for (const d of drops) {
          const t = (d.phase + time * 0.6) % 1;
          const spreadX = a.tool === 'hose' ? Math.sin(d.phase * 19) * 0.12 * t : 0;
          d.mesh.position.lerpVectors(spout, target, t);
          d.mesh.position.y += Math.sin(t * Math.PI) * 0.15 * H;
          d.mesh.position.x += spreadX;
        }
      };
      place(0);
      s.root.userData.place = place;
    }

    // The garden bed in front.
    const sand = s.material('#d9c79a', { roughness: 0.95 });
    s.box([bedW, 0.05, bedD], [0, 0.02, bedZ], s.material('#c9ae7c', { roughness: 0.95 }));
    void sand;
    if (a.edge === 'pebbles') {
      const n = 26;
      s.scatter(new THREE.SphereGeometry(1, 7, 5), s.material('#8e8a80', { roughness: 0.9 }), Array.from({ length: n }, (_, i) => {
        const f = i / n;
        const perimeter = 2 * (bedW + bedD);
        let d = f * perimeter, x = 0, z = 0;
        if (d < bedW) { x = -bedW / 2 + d; z = -bedD / 2; } else if ((d -= bedW) < bedD) { x = bedW / 2; z = -bedD / 2 + d; } else if ((d -= bedD) < bedW) { x = bedW / 2 - d; z = bedD / 2; } else { d -= bedW; x = -bedW / 2; z = bedD / 2 - d; }
        return { at: [x, 0.05, bedZ + z] as [number, number, number], size: 0.05 + random() * 0.03, color: random() < 0.3 ? '#bdb6a6' : '#8e8a80' };
      }));
    }
    if (a.edge === 'planks') {
      const plank = s.material('#9a7b4f', { roughness: 0.85 });
      s.box([bedW + 0.08, 0.1, 0.05], [0, 0.07, bedZ - bedD / 2], plank);
      s.box([bedW + 0.08, 0.1, 0.05], [0, 0.07, bedZ + bedD / 2], plank);
      s.box([0.05, 0.1, bedD], [-bedW / 2, 0.07, bedZ], plank);
      s.box([0.05, 0.1, bedD], [bedW / 2, 0.07, bedZ], plank);
    }
    if (a.edge === 'shells') {
      const shell = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      shell.scale(1, 0.9, 0.5);
      const n = 12;
      s.scatter(shell, s.material('#f1dfc9', { roughness: 0.6 }), Array.from({ length: n }, (_, i) => ({
        at: [-bedW / 2 + (i + 0.5) / n * bedW, 0.03, bedZ + bedD / 2 + 0.03] as [number, number, number], size: 0.055 + random() * 0.015, color: random() < 0.4 ? '#f3c3b3' : '#f1dfc9',
      })));
    }
    const cheer = mood.cheer;
    if (a.garden === 'coral') {
      const tints = ['#ff6f9c', '#ff8c42', '#c76bff', '#ff5a5a'];
      for (let i = 0; i < 8; i++) {
        const x = -bedW / 2 + 0.15 + random() * (bedW - 0.3), z = bedZ - bedD / 2 + 0.12 + random() * (bedD - 0.24);
        const paint = s.material(tints[Math.floor(random() * tints.length)], { roughness: 0.8, emissive: tints[i % 4], emissiveIntensity: mix(0, 0.2, cheer) });
        const h = 0.22 + random() * 0.2;
        s.rod([x, 0.04, z], [x + (random() - 0.5) * 0.08, 0.04 + h, z], 0.02, paint, 0.012);
        for (let b = 0; b < 3; b++) {
          const y = 0.04 + h * (0.35 + b * 0.22);
          const angle = random() * Math.PI * 2;
          s.rod([x, y, z], [x + Math.sin(angle) * 0.12, y + 0.1 + random() * 0.08, z + Math.cos(angle) * 0.12], 0.012, paint, 0.007);
        }
      }
    }
    if (a.garden === 'kelp') {
      const stem = s.material('#5f8a2e', { roughness: 0.7 });
      const blade = s.material('#86b547', { roughness: 0.6, side: THREE.DoubleSide });
      for (let i = 0; i < 8; i++) {
        const x = -bedW / 2 + 0.12 + (i % 4) / 3 * (bedW - 0.24), z = bedZ - bedD / 4 + Math.floor(i / 4) * bedD / 2;
        const h = 0.35 + random() * 0.25;
        s.tube([[x, 0.04, z], [x + 0.03, 0.04 + h * 0.5, z + 0.02], [x - 0.02, 0.04 + h, z]], 0.015, stem);
        for (let b = 0; b < 2; b++) {
          const leaf = s.ball([0.12, 0.04, 0.01], [x + (b ? 0.1 : -0.1), 0.04 + h * (0.5 + b * 0.3), z], blade, 8);
          leaf.rotation.z = b ? -0.5 : 0.5;
        }
      }
    }
    if (a.garden === 'flowers') {
      const stem = s.material('#4f8f3a', { roughness: 0.7 });
      const tints = ['#ff4f8b', '#ffd23a', '#ff7a3a', '#5aa0ff', '#ffffff'];
      for (let i = 0; i < 9; i++) {
        const x = -bedW / 2 + 0.12 + (i % 3) / 2 * (bedW - 0.24) + (random() - 0.5) * 0.1, z = bedZ - bedD / 2 + 0.12 + Math.floor(i / 3) / 2 * (bedD - 0.24);
        const h = 0.18 + random() * 0.15;
        s.rod([x, 0.04, z], [x, 0.04 + h, z], 0.01, stem);
        const tint = tints[Math.floor(random() * tints.length)];
        s.ball([0.07, 0.04, 0.07], [x, 0.04 + h, z], s.material(tint, { roughness: 0.7, emissive: tint, emissiveIntensity: mix(0, 0.25, cheer) }), 10);
        s.ball([0.025, 0.025, 0.025], [x, 0.065 + h, z], s.material('#5a3a1a'), 8);
      }
    }
    if (a.garden === 'sponges') {
      const tints = ['#ff6b8a', '#ffa43b', '#b35cff', '#3fd3c8', '#ffe14a'];
      for (let i = 0; i < 8; i++) {
        const x = -bedW / 2 + 0.14 + (i % 4) / 3 * (bedW - 0.28), z = bedZ - bedD / 4 + Math.floor(i / 4) * bedD / 2;
        const tint = tints[i % tints.length];
        const h = 0.2 + random() * 0.15;
        s.cylinder(0.05, 0.04, h, [x, 0.04 + h / 2, z], s.material(tint, { roughness: 0.9, emissive: tint, emissiveIntensity: mix(0, 0.2, cheer) }), 10);
        s.cylinder(0.035, 0.035, 0.02, [x, 0.05 + h, z], s.material('#3a2a3a'), 10);
      }
    }
    if (a.fence) {
      const white = s.material('#f2f0ea', { roughness: 0.8 });
      const fenceZ = bedZ + bedD / 2 + 0.18;
      const n = 9;
      for (let i = 0; i < n; i++) {
        const x = -bedW / 2 - 0.1 + i / (n - 1) * (bedW + 0.2);
        s.box([0.06, 0.5, 0.02], [x, 0.25, fenceZ], white);
        const point = s.mesh(new THREE.ConeGeometry(0.042, 0.06, 4), white, [x, 0.53, fenceZ]);
        point.rotation.y = Math.PI / 4;
      }
      s.box([bedW + 0.26, 0.04, 0.02], [0, 0.18, fenceZ - 0.02], white);
      s.box([bedW + 0.26, 0.04, 0.02], [0, 0.4, fenceZ - 0.02], white);
    }

    // Company.
    const cornerX = bedW / 2 + 0.22, cornerZ = bedZ + 0.1;
    let gnome: ReturnType<typeof figure> | null = null;
    if (a.company === 'gnome') {
      gnome = figure(s, { height: 0.5, build: 'heavy', style: 'doll', hair: 'hat', hairColor: '#d92d2d', top: '#2f6fd6', bottom: '#6b4a2e', shoes: '#3a2a1a', skin: '#f0c8a8', pose: 'hands-on-hips', face: 'dots' });
      gnome.root.position.set(-cornerX, 0, cornerZ);
      gnome.root.rotation.y = 0.5;
      s.root.add(gnome.root);
      const beard = new THREE.Mesh(new THREE.SphereGeometry(0.5 * 0.064 * 0.9, 10, 8), s.material('#f4f1ea'));
      beard.position.set(0, -0.5 * 0.064 * 0.5, 0.5 * 0.064 * 0.6);
      beard.scale.set(1, 1.3, 0.7);
      gnome.head.add(beard);
    }
    if (a.company === 'sign') {
      s.cylinder(0.015, 0.02, 0.45, [cornerX, 0.22, cornerZ], s.material('#6b4a2e'), 8);
      s.box([0.42, 0.16, 0.025], [cornerX, 0.5, cornerZ], s.material('#e8dcb0'));
      s.label('KEEP OFF THE CORAL', 0.4, 0.13, [cornerX, 0.5, cornerZ + 0.014], '#2a2418', '#e8dcb0');
    }
    if (a.company === 'barrow') {
      const barrow = new THREE.Group();
      barrow.position.set(cornerX + 0.1, 0, cornerZ - 0.1);
      barrow.rotation.y = -0.7;
      const steel = s.material('#7f8a8e', { metalness: 0.5, roughness: 0.5 });
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.6), steel);
      tray.position.set(0, 0.3, 0);
      const heap = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), s.material('#dcc89c', { roughness: 0.95 }));
      heap.scale.set(0.19, 0.12, 0.27);
      heap.position.set(0, 0.42, 0);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 14), s.material('#2a2a2a'));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.12, 0.32);
      tray.castShadow = heap.castShadow = wheel.castShadow = true;
      barrow.add(tray, heap, wheel);
      for (const x of [-0.15, 0.15]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), steel);
        leg.position.set(x, 0.1, -0.2);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), s.material('#a8824f'));
        arm.rotation.x = Math.PI / 2 - 0.25;
        arm.position.set(x, 0.42, -0.5);
        barrow.add(leg, arm);
      }
      s.root.add(barrow);
    }

    return s.finish({
      update: (dt, time) => {
        person.update(dt, time);
        gnome?.update(dt, time);
        (s.root.userData.place as ((t: number) => void) | undefined)?.(time);
      },
    });
  },
});
