import * as THREE from 'three';
import { choice, clamp01, defineThing, disposeTree, mix, score, visibleBounds } from '@conjure/kit';
import { displace, instances, mat, mesh, noise, paint, range, rod, settle, tube, type Spot, type V3 } from './lib';

const SHELL = {
  lilac: ['#d9c6d6', '#a98aa8'],
  bone: ['#efe8d8', '#c2b59a'],
  sand: ['#dcc39a', '#a8875a'],
  slate: ['#8f97a6', '#59606f'],
  rose: ['#f0c4c0', '#c8847f'],
  amber: ['#e0a860', '#a86a2a'],
} as const;

export default defineThing({
  questions: {
    posture: choice('What posture is it in?', {
      crawling: 'Crawling flat over the bottom on all fourteen legs.',
      ball: 'Rolled tight into an armoured ball.',
      hunched: 'Half curled, hunched and wary, legs tucked.',
      rearing: 'Reared up on its back legs, front legs and antennae raised.',
      flipped: 'Flipped on its back, legs waving in the air.',
      swimming: 'Swimming just off the bottom, legs folded, tail fans beating.',
    }),
    size: score('How big is it?', ['A large woodlouse, hand-sized', 'The size of a cat', 'As long as a forearm and a half', 'A record-breaking monster']),
    colour: choice('What colour is its armour?', {
      lilac: 'Pale lilac-pink, the usual deep-sea pallor.',
      bone: 'Bone white.',
      sand: 'Sandy tan.',
      slate: 'Blue-grey slate.',
      rose: 'Soft shrimp rose.',
      amber: 'Translucent amber, like an old toenail.',
    }),
    eating: choice('What is it eating?', {
      nothing: 'Nothing; it has not eaten for years.',
      fish: 'The head and backbone of a dead fish.',
      blubber: 'A torn lump of whale blubber.',
      squid: 'A limp squid tentacle.',
      chip: 'A single tortilla chip, as if somebody is testing it at an aquarium.',
      bone: 'A whale vertebra it is slowly rasping at.',
    }),
    fed: score('How well fed is it?', ['Flat and starved after years of fasting', 'Lean', 'Comfortable', 'Gorged so full it can barely walk']),
    eyes: choice('What are its eyes like?', {
      dark: 'Large glossy black triangles.',
      shine: 'Reflecting light back like a cat\'s eyes, pale green-white.',
      milky: 'Milky and blind.',
    }),
    tail: choice('What is its tail fan like?', {
      smooth: 'A broad smooth-edged shield.',
      toothed: 'Edged with a row of short spines.',
      chipped: 'Chipped and missing a corner from some old fight.',
    }),
    company: choice('Is it alone?', {
      alone: 'Alone.',
      young: 'Trailed by a few tiny pale juveniles.',
      pair: 'A second, smaller one is close behind it.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const n = noise(random);
    const [light, shade] = SHELL[a.colour].map((c) => new THREE.Color(c));
    const grime = new THREE.Color('#77705f');
    const shellMat = mat('#ffffff', { vertexColors: true, roughness: mix(0.32, 0.7, mood.wear), side: THREE.DoubleSide });
    const limb = mat(light.clone().lerp(new THREE.Color('#ffffff'), 0.25), { roughness: 0.5 });
    const under = mat(shade.clone().multiplyScalar(0.75), { roughness: 0.8 });
    const feelers: THREE.Object3D[] = [], walkers: { g: THREE.Object3D; phase: number; side: number }[] = [], fans: THREE.Object3D[] = [];

    // One arched plate: a half-lathe laid along z with its arch up, trailing lip overlapping the next.
    const plate = (width: number, height: number, length: number, index: number) => {
      const profile = [[0.9, 0.52], [0.97, 0.35], [1, 0], [1.0, -0.4], [1.05, -0.62], [1.02, -0.68]].map(([r, y]) => new THREE.Vector2(r, y));
      const g = new THREE.LatheGeometry(profile, 22, 0, Math.PI);
      g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
      // Flatten the crown and pinch the flanks into a skirt.
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setXYZ(i, x * (1 + 0.08 * (1 - y)), Math.pow(Math.max(y, 0), 0.8), p.getZ(i)); }
      g.scale(width / 2, height, length);
      g.computeVertexNormals();
      paint(g, (q, c) => {
        const back = clamp01(-q.z / (length * 0.68));
        c.copy(light).lerp(shade, back * back * 0.9 + clamp01(1 - q.y / height) * 0.25 + n(q.x * 30, index, q.z * 30) * 0.08);
        c.lerp(grime, mood.wear * (0.2 + 0.3 * clamp01(n(q.x * 12, index * 3, q.z * 12))));
      });
      return g;
    };

    const make = (B: number, posture: typeof a.posture, detail: boolean) => {
      const animal = new THREE.Group(), body = new THREE.Group();
      animal.add(body);
      const W = B * 0.44, H = B * mix(0.13, 0.25, a.fed);
      const ball = posture === 'ball', curled = ball || posture === 'hunched';
      const clearance = posture === 'crawling' || posture === 'rearing' ? B * mix(0.07, 0.035, a.fed) : B * 0.03;
      // Segment plan: head, seven thoracic plates, five narrow tail plates, telson.
      const plan: { len: number; w: number; h: number; kind: 'head' | 'thorax' | 'pleon' | 'telson' }[] = [{ len: B * 0.115, w: W * 0.74, h: H * 0.8, kind: 'head' }];
      for (let i = 0; i < 7; i++) plan.push({ len: B * 0.08, w: W * (0.86 + 0.14 * Math.sin(((i + 1) / 8) * Math.PI)), h: H * (0.88 + 0.12 * Math.sin(((i + 0.5) / 7) * Math.PI)), kind: 'thorax' });
      for (let i = 0; i < 5; i++) plan.push({ len: B * 0.034, w: W * (0.86 - i * 0.025), h: H * (0.78 - i * 0.05), kind: 'pleon' });
      plan.push({ len: B * 0.2, w: W * 0.72, h: H * 0.42, kind: 'telson' });
      const bendFor = (i: number) => ball ? -0.455 : posture === 'hunched' ? -0.2 : posture === 'rearing' ? (i < 5 ? 0.11 : -0.03) : posture === 'flipped' ? 0.05 : posture === 'swimming' ? (i > 7 ? 0.07 : 0.01) : (i > 8 ? -0.07 : -0.012);
      let parent: THREE.Object3D = body, previous = 0;
      plan.forEach((seg, i) => {
        const g = new THREE.Group();
        g.position.z = i === 0 ? 0 : -(previous + seg.len) * 0.5;
        g.rotation.x = i === 0 ? 0 : bendFor(i) + range(random, -0.012, 0.012);
        parent.add(g);
        const inner = new THREE.Group(); inner.position.z = i === 0 ? 0 : 0; g.add(inner);
        if (seg.kind === 'telson') {
          // The tail shield: a broad flattened half-dome with side flaps.
          const shield = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
          const sp = shield.attributes.position;
          for (let k = 0; k < sp.count; k++) { const z = sp.getZ(k), x = sp.getX(k); const chip = a.tail === 'chipped' && x > 0.35 && z < -0.35 ? 0.62 : 1; sp.setXYZ(k, x * (z < 0 ? 1 : 0.98) * chip, sp.getY(k), (z < 0 ? z * 1.25 : z * 0.5) * chip); }
          shield.scale(seg.w / 2, seg.h, seg.len * 0.72); shield.computeVertexNormals();
          paint(shield, (q, c) => { c.copy(light).lerp(shade, clamp01(Math.hypot(q.x / seg.w * 2, q.z / seg.len) * 0.8) + n(q.x * 20, 3, q.z * 20) * 0.1).lerp(grime, mood.wear * 0.3); });
          mesh(inner, shield, shellMat, [0, 0, seg.len * 0.22]);
          mesh(inner, new THREE.CylinderGeometry(seg.len * 0.035, seg.len * 0.05, seg.len * 0.85, 6), mat(shade, { roughness: 0.5 }), [0, seg.h * 0.82, -seg.len * 0.12], 1, [Math.PI / 2 - 0.42, 0, 0]);
          if (a.tail === 'toothed') { const spikes: Spot[] = []; for (let k = 0; k < 9; k++) { const ang = Math.PI + (k / 8 - 0.5) * 2.2; spikes.push({ at: [Math.sin(ang) * seg.w * 0.47, seg.h * 0.08, seg.len * 0.22 + Math.cos(ang) * seg.len * 0.86], scale: [seg.len * 0.035, seg.len * 0.16, seg.len * 0.035], rot: [-Math.PI / 2, 0, -Math.sin(ang) * 0.7] }); } instances(inner, new THREE.ConeGeometry(1, 1, 5), limb, spikes); }
          for (const side of [-1, 1]) {
            const flap = new THREE.Group(); flap.position.set(side * seg.w * 0.4, seg.h * 0.1, seg.len * 0.15); flap.rotation.y = side * (posture === 'swimming' ? -0.75 : -0.3); inner.add(flap);
            mesh(flap, new THREE.SphereGeometry(1, 10, 6), limb, [0, 0, -seg.len * 0.4], [seg.w * 0.13, seg.h * 0.18, seg.len * 0.45]);
            fans.push(flap);
          }
        } else {
          mesh(inner, plate(seg.w, seg.h, seg.len * 1.12, i), shellMat);
          if (!ball && detail) mesh(inner, new THREE.BoxGeometry(seg.w * 0.72, H * 0.12, seg.len * 0.96), under, [0, H * 0.02, 0]);
        }
        if (seg.kind === 'head') {
          // Eyes, mouthparts and two pairs of antennae.
          const eyeMat = a.eyes === 'dark' ? mat('#0d0e12', { roughness: 0.08, metalness: 0.3 }) : a.eyes === 'shine' ? mat('#e9ffd9', { emissive: '#bfffa0', emissiveIntensity: 1.5, roughness: 0.2 }) : mat('#cfd3d6', { roughness: 0.35 });
          for (const side of [-1, 1]) mesh(inner, new THREE.SphereGeometry(1, 14, 10), eyeMat, [side * seg.w * 0.33, seg.h * 0.52, seg.len * 0.36], [seg.w * 0.17, seg.h * 0.24, seg.len * 0.3], [0.2, side * 0.6, side * -0.5]);
          if (detail) mesh(inner, new THREE.SphereGeometry(1, 12, 8), under, [0, seg.h * 0.18, seg.len * 0.42], [seg.w * 0.26, seg.h * 0.22, seg.len * 0.25]);
          if (!ball && detail) for (const side of [-1, 1]) {
            const long = new THREE.Group(); long.position.set(side * seg.w * 0.2, seg.h * 0.25, seg.len * 0.5); inner.add(long);
            const reach = B * 0.42, lift = posture === 'rearing' ? 0.6 : posture === 'hunched' ? -0.1 : 0.18;
            tube(long, [[0, 0, 0], [side * reach * 0.25, reach * lift * 0.5, reach * 0.3], [side * reach * 0.55, reach * lift, reach * 0.4], [side * reach * 0.95, reach * lift * 0.6, reach * 0.2 + range(random, -0.1, 0.1) * reach]], B * 0.011, limb, 6, 18);
            feelers.push(long);
            tube(inner, [[side * seg.w * 0.1, seg.h * 0.22, seg.len * 0.5], [side * seg.w * 0.2, seg.h * 0.3, seg.len * 0.5 + B * 0.07], [side * seg.w * 0.34, seg.h * 0.2, seg.len * 0.5 + B * 0.11]], B * 0.007, limb, 5, 10);
          }
        }
        if (seg.kind === 'thorax' && !ball && detail) {
          const pair = i - 1;
          for (const side of [-1, 1]) {
            const hip = new THREE.Group(); hip.position.set(side * seg.w * 0.34, H * 0.04, 0); inner.add(hip);
            const fore = pair < 3 ? 1 : -1, l = B * (0.19 + 0.04 * Math.sin((pair / 6) * Math.PI));
            const sweep = fore * l * mix(0.3, 0.12, Math.abs(pair - 3) / 3);
            let knee: V3, foot: V3;
            if (posture === 'crawling' || (posture === 'rearing' && pair > 2)) { knee = [side * l * 0.62, l * 0.22, sweep * 0.5]; foot = [side * l * 0.92, -clearance - H * 0.04, sweep]; }
            else if (posture === 'rearing') { knee = [side * l * 0.6, l * 0.1, l * 0.35]; foot = [side * l * 0.75, l * 0.2 + range(random, -0.1, 0.1) * l, l * 0.8]; }
            else if (posture === 'flipped') { knee = [side * l * 0.5, -l * 0.4, sweep * 0.4]; foot = [side * l * range(random, 0.15, 0.6), -l * range(random, 0.75, 1), sweep + range(random, -0.2, 0.2) * l]; }
            else { knee = [side * l * 0.36, -l * 0.12, -l * 0.2]; foot = [side * l * 0.2, -l * 0.2, -l * 0.55]; }
            rod(hip, [0, 0, 0], knee, B * 0.016, limb, B * 0.012, 6);
            rod(hip, knee, foot, B * 0.012, limb, B * 0.004, 6);
            mesh(hip, new THREE.SphereGeometry(B * 0.017, 8, 6), limb, knee);
            walkers.push({ g: hip, phase: pair * 0.9 + (side > 0 ? 0 : Math.PI), side });
          }
        }
        parent = g; previous = seg.len;
      });
      // Pose the whole animal.
      if (posture === 'rearing') body.rotation.x = -0.55;
      if (posture === 'flipped') body.rotation.set(range(random, -0.08, 0.08), 0, Math.PI + range(random, -0.15, 0.15));
      if (ball) body.rotation.x = 1.25;
      if (posture === 'hunched') body.rotation.x = 0.5;
      void curled;
      settle(animal, visibleBounds);
      return { animal, body, H, W, clearance };
    };

    const B = mix(0.16, 0.78, a.size * a.size * 0.4 + a.size * 0.6);
    const hero = make(B, a.posture, true);
    root.add(hero.animal);
    const hover = a.posture === 'swimming' ? Math.min(0.26, B * 0.3) : 0;
    hero.animal.position.y += hover;
    const front = visibleBounds(hero.animal).max.z;

    // Supper, set down in front of its mouth.
    const u = B * 0.16, at: V3 = [range(random, -0.3, 0.3) * u, 0, front + u * 0.5];
    if (a.eating === 'fish') {
      const g = new THREE.Group(), silver = mat('#c4ced2', { roughness: 0.3, metalness: 0.4 }), boneMat = mat('#efe9d8', { roughness: 0.7 });
      mesh(g, new THREE.SphereGeometry(1, 12, 8), silver, [0, u * 0.3, 0], [u * 0.3, u * 0.32, u * 0.5]);
      mesh(g, new THREE.SphereGeometry(u * 0.08, 8, 6), mat('#f4f2ea'), [u * 0.26, u * 0.4, u * 0.15]);
      rod(g, [0, u * 0.2, -u * 0.4], [0, u * 0.08, -u * 2], u * 0.05, boneMat);
      for (let k = 0; k < 7; k++) for (const side of [-1, 1]) rod(g, [0, u * 0.18, -u * (0.6 + k * 0.2)], [side * u * (0.34 - k * 0.03), u * 0.04, -u * (0.7 + k * 0.2)], u * 0.02, boneMat);
      g.position.set(...at); g.rotation.y = range(random, 0.8, 2.2); root.add(g);
      g.traverse((node) => { node.castShadow = true; });
    } else if (a.eating === 'blubber') {
      const lump = displace(new THREE.SphereGeometry(1, 16, 10), (p) => n(p.x, p.y, p.z, 2.5) * 0.25);
      paint(lump, (p, c) => { c.set('#e9c9c0').lerp(new THREE.Color('#a8545a'), clamp01(n(p.x, p.y, p.z, 3) + 0.2)); });
      mesh(root, lump, mat('#ffffff', { vertexColors: true, roughness: 0.4 }), [at[0], u * 0.3, at[2] + u * 0.3], [u * 1.1, u * 0.5, u * 0.9]);
    } else if (a.eating === 'squid') {
      const flesh = mat('#d9a3a8', { roughness: 0.35 });
      tube(root, [[at[0] - u, u * 0.14, at[2]], [at[0], u * 0.16, at[2] + u * 0.5], [at[0] + u, u * 0.12, at[2] + u * 0.2], [at[0] + u * 1.8, u * 0.08, at[2] + u * 0.9]], u * 0.14, flesh, 8, 24);
      const suckers: Spot[] = []; for (let k = 0; k < 8; k++) suckers.push({ at: [at[0] - u * 0.8 + k * u * 0.33, u * 0.26, at[2] + u * (0.1 + 0.35 * Math.sin(k * 0.7))], scale: u * 0.05 });
      instances(root, new THREE.SphereGeometry(1, 6, 5), mat('#f4e6e6'), suckers);
    } else if (a.eating === 'chip') {
      const shape = new THREE.Shape(); shape.moveTo(0, u); shape.lineTo(u * 0.9, -u * 0.55); shape.lineTo(-u * 0.9, -u * 0.55); shape.closePath();
      mesh(root, new THREE.ExtrudeGeometry(shape, { depth: u * 0.06, bevelEnabled: false }), mat('#e8a23a', { roughness: 0.8 }), [at[0], u * 0.25, at[2] + u * 0.2], 1, [-1.2, 0, 0.3]);
    } else if (a.eating === 'bone') {
      const g = new THREE.Group(), boneMat = mat('#e6dfc8', { roughness: 0.8 });
      mesh(g, new THREE.CylinderGeometry(u * 0.75, u * 0.75, u * 0.6, 14), boneMat, [0, u * 0.3, 0]);
      for (const side of [-1, 1]) mesh(g, new THREE.BoxGeometry(u * 1.1, u * 0.14, u * 0.4), boneMat, [side * u * 1.1, u * 0.3, 0], 1, [0, 0, side * 0.2]);
      mesh(g, new THREE.BoxGeometry(u * 0.14, u * 0.9, u * 0.4), boneMat, [0, u * 0.9, 0]);
      g.position.set(at[0], 0, at[2] + u * 0.5); g.rotation.y = random() * 3; root.add(g);
      g.traverse((node) => { node.castShadow = true; });
    }

    // Company.
    if (a.company === 'pair') {
      const other = make(B * range(random, 0.55, 0.75), random() < 0.5 ? 'crawling' : 'hunched', true);
      other.animal.position.x += B * 0.55; other.animal.position.z -= B * 0.75; other.animal.rotation.y = range(random, -0.5, 0.2);
      root.add(other.animal);
    } else if (a.company === 'young') {
      const total = 3 + Math.round(mood.density * 4);
      for (let k = 0; k < total; k++) {
        const young = make(B * range(random, 0.13, 0.2), random() < 0.25 ? 'ball' : 'crawling', false);
        const ang = Math.PI + range(random, -1.1, 1.1), d = B * range(random, 0.6, 1);
        young.animal.position.x += Math.sin(ang) * d; young.animal.position.z += Math.cos(ang) * d * 0.9; young.animal.rotation.y = range(random, -0.8, 0.8);
        root.add(young.animal);
      }
    }

    const all = visibleBounds(root), mid = all.getCenter(new THREE.Vector3());
    root.position.set(-mid.x, 0, -mid.z);
    const energy = mix(0.15, 1.4, mood.energy), baseY = hero.animal.position.y, moving = a.posture !== 'ball';
    return {
      object: root,
      update(_dt, time) {
        feelers.forEach((f, i) => { f.rotation.y = Math.sin(time * 1.3 * energy + i * 2) * 0.16; f.rotation.x = Math.sin(time * 0.9 * energy + i) * 0.08; });
        if (moving) for (const w of walkers) w.g.rotation.y = Math.sin(time * (a.posture === 'flipped' ? 5 : 2.6) * energy + w.phase) * (a.posture === 'flipped' ? 0.3 : 0.14);
        if (a.posture === 'swimming') { hero.animal.position.y = baseY + Math.sin(time * 1.1 * energy) * hover * 0.15; fans.forEach((f, i) => { f.rotation.x = Math.sin(time * 6 * energy + i) * 0.3; }); }
        if (a.posture === 'ball') hero.body.rotation.z = Math.sin(time * 0.7 * energy) * 0.04;
      },
      dispose: () => disposeTree(root),
    };
  },
});
