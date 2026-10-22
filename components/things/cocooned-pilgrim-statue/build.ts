import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type P3, cluster, glow, motes, mottle, mushroom, paint, put, strand, toadstoolGeometry } from './fungi';

const ARMS: Record<string, { elbow: P3; hand: P3 }[]> = {
  // [right (+x), left (−x)], figure space, metres
  prayer: [{ elbow: [0.25, 0.72, 0.12], hand: [0.025, 1.0, 0.3] }, { elbow: [-0.25, 0.72, 0.12], hand: [-0.025, 1.0, 0.3] }],
  orans: [{ elbow: [0.38, 0.93, 0.08], hand: [0.52, 1.34, 0.16] }, { elbow: [-0.38, 0.93, 0.08], hand: [-0.52, 1.34, 0.16] }],
  offering: [{ elbow: [0.25, 0.7, 0.1], hand: [0.1, 0.82, 0.46] }, { elbow: [-0.25, 0.7, 0.1], hand: [-0.1, 0.82, 0.46] }],
  shielding: [{ elbow: [0.28, 0.88, 0.22], hand: [0.07, 1.24, 0.2] }, { elbow: [-0.28, 0.88, 0.22], hand: [-0.07, 1.24, 0.2] }],
  reaching: [{ elbow: [0.27, 1.2, 0.12], hand: [0.33, 1.6, 0.24] }, { elbow: [-0.26, 0.7, 0.1], hand: [-0.04, 0.86, 0.2] }],
};

export default defineThing({
  questions: {
    nature: choice('What was it before the threads took it?', {
      statue: 'A carved grey stone statue on a plinth, never alive.',
      saint: 'A painted and gilded saint with a halo, an object of devotion.',
      person: 'A living traveller in a cloak with a pack on their back, who knelt and did not get up.',
      knight: 'A knight in rusted plate, helmet still on, sword laid down.',
    }),
    gesture: choice('What are its hands doing?', {
      prayer: 'Pressed palm to palm before the chest.',
      orans: 'Both arms raised wide and open to the sky.',
      offering: 'Cupped and held out in front, holding a small bowl.',
      shielding: 'Raised over the face, as if warding something off.',
      reaching: 'One arm stretched straight up toward something, the other on its heart.',
    }),
    head: choice('Where is the head turned?', {
      bowed: 'Bowed low, submitting.',
      lifted: 'Tipped back, looking up.',
      aside: 'Turned over one shoulder, as if someone called its name.',
    }),
    cocoon: score('How far has the wrapping gone?', ['A few threads trailing from the shoulders', 'Bound to the waist, arms webbed', 'A full white cocoon with only hands and head free']),
    crown: choice('What grows from its head?', {
      halo: 'A ring of small caps fanned out like the rays of a halo.',
      hat: 'One great cap worn like a wide pilgrim’s hat.',
      antlers: 'Branching coral fungus, like pale antlers.',
      cluster: 'A crowded tuft of thin glowing mushrooms of many heights.',
      mould: 'Only a soft cap of mould, no fruit yet.',
    }),
    anchor: choice('What do the threads tie it to?', {
      floor: 'Only the floor around it, like guy ropes.',
      pillar: 'A broken column stub just behind it.',
      niche: 'A pointed stone niche that it kneels in.',
      umbrella: 'A giant mushroom that has grown up behind and shelters it.',
    }),
    heart: noul('Does something still glow inside its chest?'),
    left: choice('What has been left in front of it?', {
      nothing: 'Nothing.',
      candles: 'A huddle of candle stubs.',
      flowers: 'Fresh cut flowers: somebody still visits.',
      staff: 'A walking staff, a wide hat and a scallop shell.',
      coins: 'A dish of coins and little clay bowls.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = new THREE.Color().setHSL(mix(0.45, 0.1, mood.warmth), 0.85, 0.62);
    const level = mix(0.6, 1.5, mood.cheer);
    const wrap = a.cocoon;

    // ---- materials by what it was
    const stoneTex = () => mottle(random, '#aaa698', ['#8d9976', '#c8c3b4', '#77756c', '#6f7f5c'], Math.round(mix(60, 220, mood.wear)));
    const stone = paint('#ffffff', { map: stoneTex(), roughness: 0.95 });
    const gold = paint('#c9a13c', { metalness: 0.8, roughness: 0.35, emissive: '#6a4a10', emissiveIntensity: 0.3 });
    let robe: THREE.Material = stone, skin: THREE.Material = stone, trim: THREE.Material = stone;
    if (a.nature === 'saint') {
      robe = paint('#ffffff', { map: mottle(random, mood.warmth > 0.5 ? '#8a3b3b' : '#3b5590', ['#2c3f6a', '#c8c3b4', '#8d9976'], Math.round(mix(30, 160, mood.wear))) });
      skin = paint('#dcbf9f', { roughness: 0.6 });
      trim = gold;
    } else if (a.nature === 'person') {
      robe = paint('#ffffff', { map: mottle(random, '#6b5440', ['#4a3a2c', '#80694f', '#8d9976', '#d8d2c0'], Math.round(mix(50, 200, mood.wear))) });
      skin = paint(new THREE.Color('#d2b49a').lerp(new THREE.Color('#a9b39a'), 0.3 + mood.wear * 0.5), { roughness: 0.7 });
      trim = paint('#3c3028');
    } else if (a.nature === 'knight') {
      robe = paint('#ffffff', { map: mottle(random, '#8b9095', ['#a2522c', '#6c3a22', '#b9bec2', '#8d9976'], Math.round(mix(40, 260, mood.wear))), metalness: 0.65, roughness: 0.5 });
      skin = robe;
      trim = paint('#8a2a2a');
    }
    const thread = paint('#f3eedf', { roughness: 0.9, emissive: tint, emissiveIntensity: 0.08 * level });
    const web = paint('#ffffff', { map: mottle(random, '#efe9d8', ['#ffffff', '#d9d1b8', '#cfd6bd'], 120), roughness: 0.95 });
    const capMat = glow(tint, level * 0.7, { side: THREE.DoubleSide });
    const paleMat = paint('#efe7d0');

    // ---- what it kneels on
    const baseY = a.nature === 'statue' ? 0.3 : a.nature === 'saint' ? 0.16 : 0;
    if (a.nature === 'statue') {
      s.box([0.95, 0.22, 1.25], [0, 0.11, -0.1], stone);
      s.box([0.82, 0.08, 1.12], [0, 0.26, -0.1], stone);
    } else if (a.nature === 'saint') {
      s.cylinder(0.62, 0.68, 0.1, [0, 0.05, -0.1], robe, 8);
      s.cylinder(0.56, 0.6, 0.06, [0, 0.13, -0.1], gold, 8);
    }

    // ---- the kneeling figure
    const figure = new THREE.Group();
    put(s.root, figure, [0, baseY, 0]);
    const limb = (from: P3, to: P3, r0: number, r1: number, material: THREE.Material) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to);
      const mesh = put(figure, new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, p.distanceTo(q), 9), material));
      mesh.position.copy(p).add(q).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize());
      put(figure, new THREE.Mesh(new THREE.SphereGeometry(r1, 9, 7), material), to);
    };
    const skirt = put(figure, new THREE.Mesh(new THREE.LatheGeometry([[0.4, 0], [0.37, 0.12], [0.26, 0.42], [0.2, 0.55], [0.001, 0.56]].map(([x, y]) => new THREE.Vector2(x, y)), 18), robe), [0, 0, -0.12]);
    skirt.scale.set(1, 1, 1.4);
    for (const side of [-1, 1]) {
      put(figure, new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), robe), [side * 0.12, 0.12, 0.28]);
      if (a.nature === 'person' || a.nature === 'knight') put(figure, new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.1), trim), [side * 0.12, 0.1, -0.72]).rotation.x = -0.5;
    }
    const torso = put(figure, new THREE.Mesh(new THREE.LatheGeometry([[0.19, 0.42], [0.2, 0.6], [0.225, 0.86], [0.2, 0.99], [0.085, 1.06], [0.06, 1.1], [0.001, 1.1]].map(([x, y]) => new THREE.Vector2(x, y)), 14), robe));
    torso.scale.set(1.15, 1, 0.8);
    if (a.nature === 'saint') {
      put(figure, new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 16), gold), [0, 1.05, 0]).rotation.x = Math.PI / 2;
      put(figure, new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.022, 6, 20), gold), [0, 0.56, 0]).rotation.x = Math.PI / 2;
    } else if (a.nature === 'person') {
      put(figure, new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.2), trim), [0, 0.8, -0.27]);
      put(figure, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.42, 10), paint('#7d8a5a')), [0, 1.07, -0.27]).rotation.z = Math.PI / 2;
    } else if (a.nature === 'knight') {
      for (const side of [-1, 1]) put(figure, new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), robe), [side * 0.24, 1.0, 0]).scale.y = 0.75;
      put(figure, new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.46, 0.02), trim), [0, 0.74, 0.185]);
      put(figure, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.025), paleMat), [0, 0.78, 0.19]);
      put(figure, new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.025), paleMat), [0, 0.83, 0.19]);
    }

    const broken = (a.nature === 'statue' || a.nature === 'saint') && mood.wear > 0.72;
    const hands: P3[] = [];
    ARMS[a.gesture].forEach((arm, index) => {
      const side = index === 0 ? 1 : -1;
      const shoulder: P3 = [side * 0.22, 0.98, 0.02];
      limb(shoulder, arm.elbow, 0.075, 0.07, robe);
      if (broken && side === -1) {
        put(s.root, new THREE.Mesh(new THREE.SphereGeometry(0.05, 9, 7), skin), [-0.45 - random() * 0.2, baseY + 0.03, 0.5]).scale.set(1, 0.5, 1.5);
        return;
      }
      limb(arm.elbow, arm.hand, 0.065, a.nature === 'knight' ? 0.05 : 0.08, robe);
      const hand = put(figure, new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skin), [arm.hand[0], arm.hand[1] + 0.06, arm.hand[2] + (a.gesture === 'offering' ? 0.06 : 0.01)]);
      hand.scale.set(a.gesture === 'prayer' ? 0.35 : 0.8, a.gesture === 'offering' ? 0.4 : 1.4, a.gesture === 'offering' ? 1.3 : 0.5);
      hands.push([arm.hand[0], arm.hand[1] + 0.1 + baseY, arm.hand[2]]);
    });
    if (a.gesture === 'offering') {
      put(figure, new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.06, 0], [0.13, 0.08], [0.12, 0.08], [0.05, 0.02], [0.001, 0.02]].map(([x, y]) => new THREE.Vector2(x, y)), 14), paint('#a8643c', { side: THREE.DoubleSide })), [0, 0.9, 0.52]);
      put(figure, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 12), capMat), [0, 0.965, 0.52]);
    }

    // ---- head
    const head = new THREE.Group();
    put(figure, head, [0, 1.08, 0]);
    head.rotation.set(a.head === 'bowed' ? 0.55 : a.head === 'lifted' ? -0.5 : 0.1, a.head === 'aside' ? (random() < 0.5 ? -1 : 1) * 0.95 : (random() - 0.5) * 0.2, (random() - 0.5) * 0.15);
    if (a.nature === 'knight') {
      put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.115, 0.2, 12), robe), [0, 0.13, 0.01]);
      put(head, new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), robe), [0, 0.23, 0.01]);
      put(head, new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.022, 0.03), paint('#111014')), [0, 0.16, 0.115]);
      put(head, new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.03), paint('#111014')), [0, 0.11, 0.115]);
    } else {
      put(head, new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), skin), [0, 0.14, 0.02]).scale.set(0.92, 1.1, 1);
      put(head, new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 5), skin), [0, 0.13, 0.12]).rotation.x = 0.35;
      for (const side of [-1, 1]) put(head, new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), paint('#2a2622')), [side * 0.04, 0.16, 0.103]);
      const hood = put(head, new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), a.nature === 'person' ? paint('#3a2c22', { side: THREE.DoubleSide }) : robe), [0, 0.14, 0.0]);
      (hood.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      hood.rotation.x = -0.6;
      hood.scale.set(1, 1.08, 1.05);
    }
    if (a.nature === 'saint') {
      const halo = put(head, new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.012, 24), gold), [0, 0.18, -0.13]);
      halo.rotation.x = Math.PI / 2;
    }

    // ---- crown
    const crownY = 0.245;
    const coral: THREE.Vector3[] = [];
    if (a.crown === 'halo') {
      const n = 9 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + random() * 0.2, tip = 0.75 + random() * 0.25;
        mushroom(head, { at: [Math.sin(angle) * 0.07, crownY - 0.04, 0.02 + Math.cos(angle) * 0.07], height: 0.13 + random() * 0.07, cap: 0.045 + random() * 0.02, lean: [Math.cos(angle) * tip, -Math.sin(angle) * tip], capMat, gillMat: paleMat, stalkMat: paleMat });
      }
    } else if (a.crown === 'hat') {
      mushroom(head, { at: [0, crownY - 0.03, 0.02], height: 0.12, cap: 0.26, capHeight: 0.11, stalk: 0.07, shape: 0.45, lean: [(random() - 0.5) * 0.3, (random() - 0.5) * 0.3], capMat: paint('#ffffff', { map: mottle(random, '#8f3f2c', ['#f3ead2', '#f3ead2', '#6d2a1e'], 60, 64), side: THREE.DoubleSide }), gillMat: capMat, stalkMat: paleMat });
      put(head, new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), paint("#7a3324")), [0, crownY + 0.13, 0.02]);
    } else if (a.crown === 'antlers') {
      const coralMat = paint('#f2e3c4', { emissive: tint, emissiveIntensity: level * 0.25 });
      const grow = (from: THREE.Vector3, dir: THREE.Vector3, length: number, radius: number, depth: number) => {
        const to = from.clone().addScaledVector(dir, length);
        const mesh = put(head, new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.65, radius, length, 6), coralMat));
        mesh.position.copy(from).add(to).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        if (depth === 0) { coral.push(to); return; }
        for (let i = 0; i < 2; i++) grow(to, dir.clone().add(new THREE.Vector3((random() - 0.5) * 1.3, 0.25, (random() - 0.5) * 0.9)).normalize(), length * 0.72, radius * 0.65, depth - 1);
      };
      for (const side of [-1, 1]) grow(new THREE.Vector3(side * 0.05, crownY - 0.03, 0.02), new THREE.Vector3(side * 0.75, 1, 0).normalize(), 0.2, 0.026, 3);
      cluster(head, new THREE.SphereGeometry(1, 6, 5), capMat, coral.map((p) => ({ at: p.toArray() as P3, size: 0.016 })));
    } else if (a.crown === 'cluster') {
      const n = 7 + Math.floor(random() * 6);
      for (let i = 0; i < n; i++) mushroom(head, { at: [(random() - 0.5) * 0.14, crownY - 0.04, 0.02 + (random() - 0.5) * 0.14], height: 0.1 + random() ** 1.5 * 0.34, cap: 0.03 + random() * 0.035, shape: 1.6, lean: [(random() - 0.5) * 0.5, (random() - 0.5) * 0.5], capMat, gillMat: paleMat, stalkMat: paleMat });
    } else {
      cluster(head, new THREE.IcosahedronGeometry(1, 1), web, Array.from({ length: 16 }, () => ({ at: [(random() - 0.5) * 0.18, crownY - 0.05 + random() * 0.06, 0.01 + (random() - 0.5) * 0.18] as P3, size: 0.03 + random() * 0.035 })));
    }

    // ---- the cocoon: shell, bindings, guy threads
    if (wrap > 0.5) {
      const top = mix(0.45, 1.0, (wrap - 0.5) / 0.5);
      const profile: [number, number][] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        profile.push([Math.max(0.001, (0.43 - 0.17 * t) * Math.sqrt(1 - t ** 8)), t * top]);
      }
      const shell = put(figure, new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 20), web), [0, 0, -0.1]);
      shell.scale.set(1, 1, 1.42);
      shell.rotation.y = random() * 6;
    }
    const bands = Math.round(wrap * 16);
    for (let i = 0; i < bands; i++) {
      const y = mix(0.25, 1.02, random()), reach = y > 0.9 ? 0.2 : mix(0.33, 0.24, y) + (wrap > 0.5 ? 0.06 : 0);
      const band = put(figure, new THREE.Mesh(new THREE.TorusGeometry(reach, 0.008 + random() * 0.01, 5, 20), thread), [0, y, -0.02]);
      band.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.7, (random() - 0.5) * 0.7, 0);
      band.scale.set(1.12, 0.92, 1);
    }
    const bodyPoint = (): P3 => {
      const angle = random() * Math.PI * 2, y = mix(0.35, 1.15, random());
      return [Math.sin(angle) * 0.2, baseY + y, Math.cos(angle) * 0.16];
    };
    const guys = Math.round(mix(5, 22, wrap) + mood.density * 8);
    const feet: P3[] = [];
    for (let i = 0; i < guys; i++) {
      const from = bodyPoint(), angle = Math.atan2(from[0], from[2]) + (random() - 0.5) * 1.1, reach = mix(0.55, 0.95, random());
      const to: P3 = [Math.sin(angle) * reach, 0, Math.cos(angle) * reach - 0.1];
      feet.push(to);
      strand(s.root, from, to, random() * 0.1, 0.006 + random() * 0.007, thread);
    }
    for (const hand of hands) {
      if (wrap > 0.2) strand(s.root, hand, [hand[0] * 0.3, baseY + 1.2, 0.08], 0.08 + random() * 0.1, 0.007, thread);
      if (wrap > 0.5) strand(s.root, hand, [hand[0] * 1.5 + (random() - 0.5) * 0.3, 0, hand[2] + 0.4 + random() * 0.3], 0.1, 0.008, thread);
    }
    if (hands.length === 2 && wrap > 0.3 && a.gesture !== 'prayer') strand(s.root, hands[0], hands[1], 0.12 + random() * 0.1, 0.007, thread);

    // ---- what the threads tie to
    const tops: P3[] = [];
    if (a.anchor === 'pillar') {
      const h = 1.2 + baseY + random() * 0.35;
      s.cylinder(0.17, 0.19, h, [0.15, h / 2, -0.95], stone, 12);
      s.cylinder(0.26, 0.29, 0.16, [0.15, 0.08, -0.95], stone, 8);
      s.cylinder(0.14, 0.17, 0.22, [0.15, h + 0.08, -0.95], stone, 7).rotation.z = 0.25;
      s.cylinder(0.17, 0.17, 0.36, [-0.62, 0.17, -0.85], stone, 12).rotation.set(Math.PI / 2, 0, 0.6 + random());
      for (let i = 0; i < 5; i++) tops.push([0.15 + (random() - 0.5) * 0.3, h * mix(0.55, 1.05, random()), -0.8]);
    } else if (a.anchor === 'niche') {
      const h = 1.4 + baseY;
      const back = s.mesh(new THREE.CylinderGeometry(0.7, 0.7, h, 16, 1, true, Math.PI / 2, Math.PI), paint('#ffffff', { map: stoneTex(), side: THREE.DoubleSide, roughness: 0.95 }), [0, h / 2, -0.2]);
      back.scale.z = 0.8;
      const hoodStone = s.mesh(new THREE.SphereGeometry(0.7, 16, 8, Math.PI, Math.PI, 0, Math.PI / 2), back.material as THREE.Material, [0, h, -0.2]);
      hoodStone.scale.set(1, 1.15, 0.8);
      for (const side of [-1, 1]) s.cylinder(0.07, 0.07, h, [side * 0.72, h / 2, -0.2], stone, 8);
      for (let i = 0; i < 6; i++) tops.push([(random() - 0.5) * 1.0, h * mix(0.7, 1.3, random()), -0.5 - random() * 0.15]);
    } else if (a.anchor === 'umbrella') {
      const h = 1.85 + baseY + random() * 0.3;
      s.tube([[0.1, 0, -0.95], [0.18, h * 0.5, -0.9], [0.08, h * 0.85, -0.6], [0, h, -0.2]], 0.11, paleMat);
      const big = mushroom(s.root, { at: [0, h - 0.12, -0.15], height: 0.15, cap: 0.9, capHeight: 0.42, stalk: 0.12, shape: 0.85, lean: [0.22, (random() - 0.5) * 0.2], capMat: paint(new THREE.Color('#9a5a3a').lerp(tint, 0.2), { side: THREE.DoubleSide }), gillMat: capMat, stalkMat: paleMat });
      big.rotation.y = random();
      for (let i = 0; i < 7; i++) { const angle = random() * 6.28; tops.push([Math.sin(angle) * 0.65, h - 0.1, -0.15 + Math.cos(angle) * 0.65]); }
    }
    tops.forEach((top, index) => strand(s.root, index < hands.length ? hands[index] : bodyPoint(), top, 0.1 + random() * 0.25, 0.007 + random() * 0.006, thread, random));

    // ---- the glow in the chest
    let heart: THREE.MeshStandardMaterial | null = null;
    if (a.heart) {
      heart = glow(tint.clone().offsetHSL(0, 0.1, -0.2), level);
      put(figure, new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), heart), [-0.04, 0.84, wrap > 0.5 ? mix(0.2, 0.27, wrap) : 0.15]).scale.set(1, 1.15, 0.6);
      for (let i = 0; i < (wrap > 0.5 ? 0 : 7); i++) {
        const angle = (i / 7) * Math.PI * 2 + random();
        strand(figure, [-0.04, 0.84, 0.17], [-0.04 + Math.sin(angle) * 0.22, 0.84 + Math.cos(angle) * 0.24, 0.12], -0.02, 0.008, heart);
      }
    }

    // ---- small growth on the ground and the body
    const shrooms = Math.round(mix(4, 26, mood.density));
    cluster(s.root, toadstoolGeometry(1.3), glow(tint, level * 0.35), [
      ...feet.slice(0, shrooms).map((foot) => ({ at: [foot[0] * 0.95, 0, foot[2] * 0.95] as P3, size: 0.07 + random() * 0.1, color: '#ffffff' })),
      ...Array.from({ length: Math.round(shrooms / 3) }, () => { const p = bodyPoint(); return { at: [p[0] * 1.4, p[1] * 0.6 + 0.1, p[2] - 0.25] as P3, size: 0.05 + random() * 0.06, turn: [-0.6, 0, (random() - 0.5)] as P3 }; }),
    ]);

    // ---- left in front of it
    const front = 0.85 + (a.nature === 'statue' ? 0.15 : 0);
    if (a.left === 'candles') {
      const wax = paint('#efe4c4'), flame = glow('#ffb84a', 1.8);
      const n = Math.round(mix(4, 11, mood.density));
      for (let i = 0; i < n; i++) {
        const x = (random() - 0.5) * 0.7, z = front + (random() - 0.5) * 0.3, h = 0.05 + random() * 0.16;
        s.cylinder(0.022, 0.028, h, [x, h / 2, z], wax, 7);
        if (random() < mix(0.2, 1, mood.cheer)) s.ball([0.014, 0.032, 0.014], [x, h + 0.03, z], flame, 6);
      }
    } else if (a.left === 'flowers') {
      const stem = paint('#4f7a3a');
      const colours = ['#e8506a', '#f2c230', '#f4f0e6', '#8f6ad8'];
      const heads: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 7; i++) {
        const x = (random() - 0.5) * 0.25, tipX = x + (random() - 0.5) * 0.35;
        s.rod([x, 0.02, front + 0.25], [tipX, 0.04 + random() * 0.05, front - 0.15], 0.006, stem);
        heads.push({ at: [tipX, 0.07, front - 0.17], size: 0.035 + random() * 0.02, color: colours[Math.floor(random() * colours.length)] });
      }
      cluster(s.root, new THREE.IcosahedronGeometry(1, 1), paint('#ffffff'), heads);
      s.box([0.1, 0.012, 0.03], [0, 0.03, front + 0.12], paint('#c9a13c'));
    } else if (a.left === 'staff') {
      const wood = s.material('#6a4b34');
      s.rod([-0.75, 0.025, front - 0.2], [0.8, 0.025, front + 0.2], 0.022, wood, 0.018);
      s.cylinder(0.3, 0.32, 0.015, [0.25, 0.012, front + 0.02], s.material('#8a7350'), 18);
      s.ball([0.13, 0.1, 0.13], [0.25, 0.04, front + 0.02], s.material('#8a7350'), 12);
      s.mesh(new THREE.CylinderGeometry(0.075, 0.02, 0.012, 9, 1, false, 0, Math.PI), paint('#f1e6d2'), [-0.3, 0.012, front + 0.08]).rotation.y = random() * 3;
    } else if (a.left === 'coins') {
      const clay = s.material('#a8643c');
      const dish = (x: number, z: number, r: number) => s.lathe([[0.001, 0], [r * 0.5, 0], [r, r * 0.45], [r * 0.9, r * 0.45], [r * 0.4, 0.012], [0.001, 0.012]], clay, [x, 0, z]);
      dish(0, front, 0.15);
      cluster(s.root, new THREE.CylinderGeometry(1, 1, 0.12, 8), paint('#d8b44a', { metalness: 0.85, roughness: 0.3 }), Array.from({ length: 12 }, () => ({ at: [(random() - 0.5) * 0.16, 0.025 + random() * 0.02, front + (random() - 0.5) * 0.16] as P3, size: 0.018, turn: [(random() - 0.5) * 0.8, 0, (random() - 0.5) * 0.8] as P3 })));
      for (let i = 0; i < 3; i++) dish((i - 1) * 0.3 + (random() - 0.5) * 0.1, front + 0.25 + random() * 0.1, 0.06 + random() * 0.03);
    }
    if (a.nature === 'knight') {
      const steel = paint('#aeb4b8', { metalness: 0.8, roughness: 0.35 });
      const sword = new THREE.Group();
      put(sword, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.95), steel), [0, 0, 0.3]);
      put(sword, new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.035), gold), [0, 0, -0.18]);
      put(sword, new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.18, 6), paint('#3c3028')), [0, 0, -0.28]).rotation.x = Math.PI / 2;
      sword.rotation.y = 0.9 + random() * 0.5;
      put(s.root, sword, [0.7, 0.02, 0.45]);
    }

    // ---- spores lifting off the crown
    const seeds = Array.from({ length: Math.round(mix(10, 40, mood.density)) }, () => ({ age: random(), x: (random() - 0.5) * 0.5, z: (random() - 0.5) * 0.5, size: 0.008 + random() * 0.012 }));
    const cloud = motes(s.root, tint, seeds.map(() => ({ at: [0, 0, 0] as P3, size: 0.01 })));
    cloud.frustumCulled = false;
    const matrix = new THREE.Matrix4();
    const speed = mix(0.03, 0.3, mood.energy);
    const breathe = (time: number) => {
      if (heart) heart.emissiveIntensity = level * (1 + mix(0.1, 0.9, mood.energy) * Math.sin(time * mix(0.8, 4, mood.energy)));
      seeds.forEach((seed, index) => {
        const age = (seed.age + time * speed) % 1, size = seed.size * (1 - age * 0.6);
        matrix.makeScale(size, size, size).setPosition(seed.x * (0.4 + age) + Math.sin(age * 5 + index) * 0.04, baseY + 1.3 + age * 0.9, seed.z * (0.4 + age));
        cloud.setMatrixAt(index, matrix);
      });
      cloud.instanceMatrix.needsUpdate = true;
    };
    breathe(0);
    return s.finish({ footprint: 0.8, update: (_dt, time) => breathe(time) });
  },
});
