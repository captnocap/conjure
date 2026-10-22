import * as THREE from 'three';
import { choice, defineThing, mix, noul } from '@conjure/kit';
import { Bag, TAU, V, arc, blob, dewMaterial, field, finish, instances, leaf, matte, paint, tube, xf } from './bits';

const AGES = {
  hatchling: { body: [0.0056, 0.0049, 0.0068], head: 0.0042, bill: 0.0048, neck: 0.0068, text: 'Days old: bare dark skin, eyes sealed shut as bulges, a stubby yellow bill and a thin line of grey fuzz down the back.' },
  pinfeathered: { body: [0.0068, 0.006, 0.0085], head: 0.0047, bill: 0.0078, neck: 0.008, text: 'A week or so: dark skin bristling with blue-grey pinfeather sheaths like tiny quills, the bill lengthening.' },
  feathered: { body: [0.0078, 0.0071, 0.0105], head: 0.0052, bill: 0.0105, neck: 0.0074, text: 'Nearly fledged: green feathers covering their backs, long dark bills, crammed in and nearly ready to fly.' },
} as const;
const GAPES = {
  yellow: { inside: '#f2d64a', flange: '#f7e78a', text: 'Pale lemon yellow inside, with soft yellow flanges at the corners.' },
  orange: { inside: '#f29a2e', flange: '#f7cf5a', text: 'Hot orange-yellow, a target painted for the mother.' },
  pink: { inside: '#e5657a', flange: '#f2c1a8', text: 'Raw pink-red, fleshy and startling.' },
} as const;
type Pose = 'beg' | 'slump' | 'sleep' | 'strain';

export default defineThing({
  questions: {
    age: choice('How old are the chicks?', Object.fromEntries(Object.entries(AGES).map(([key, value]) => [key, value.text])) as Record<keyof typeof AGES, string>),
    doing: choice('What are the two of them doing?', {
      begging: 'Both necks stretched straight up, beaks gaped wide, begging at once.',
      'one-fed': 'One still begging, the other fed and slumped asleep with its beak closed.',
      sleeping: 'Both asleep in a huddled ball, heads tucked down, beaks shut.',
      jostling: 'Both straining the same way toward an arriving parent, one climbing over the other.',
    }),
    gape: choice('What colour is the inside of their mouths?', Object.fromEntries(Object.entries(GAPES).map(([key, value]) => [key, value.text])) as Record<keyof typeof GAPES, string>),
    bed: choice('What are they sitting in?', {
      'down-pad': 'A loose pad of pale plant down, the lining of a nest.',
      'nest-cup': 'A tiny lichen-shingled nest cup, only their necks and heads above the rim.',
      'berry-basket': 'A green plastic berry basket lined with tissue: a rescued brood being hand-raised.',
      bare: 'Nothing: they huddle on the bare surface.',
    }),
    eyes: noul('Are their eyes open yet?'),
    beside: choice('What else is there with them?', {
      nothing: 'Nothing else.',
      eggshell: 'A broken half of white eggshell left beside them.',
      nectar: 'A glistening drop of nectar caught on one beak tip.',
      feather: "A green feather from the mother's breast, fallen at their side.",
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const noise = field(random);
    const age = AGES[a.age];
    const gape = GAPES[a.gape];
    const [rx, ry, rz] = age.body;

    // ---- What they sit in, and how high they sit.
    let floor = 0;
    const bed = new Bag(), fibres = new Bag();
    const flakes: { matrix: THREE.Matrix4; colour: string }[] = [];
    const downTone = new THREE.Color('#e5d9c1'), downShade = new THREE.Color('#ad9e82');
    const fluff = (radius: number, height: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = random() * TAU, reach = radius * (0.7 + random() * 0.35);
        const from = V(Math.cos(angle) * reach, height + random() * 0.002, Math.sin(angle) * reach);
        const to = from.clone().add(V(Math.cos(angle) * 0.004 * random(), (random() - 0.3) * 0.003, Math.sin(angle) * 0.004 * random()));
        fibres.add(tube(arc(from, to, V(0, 0.001 * random(), 0), 4), 0.0001, { sides: 3 }), random() < 0.5 ? '#efe6d2' : '#d0c2a6');
      }
    };
    let cupRim = 0;
    if (a.bed === 'down-pad') {
      bed.add(paint(blob(V(0.022, 0.0045, 0.019), noise, 0.15, 3, 28, 12), (_p, n) => downTone.clone().lerp(downShade, Math.max(0, -n.y) * 0.8)), null, xf(V(0, 0.0025, 0)));
      fluff(0.02, 0.003, 60);
      floor = 0.0048;
    } else if (a.bed === 'nest-cup') {
      const profile: [number, number][] = [[0.0008, 0], [0.009, 0.0008], [0.0145, 0.0038], [0.0183, 0.0095], [0.0198, 0.0155], [0.0196, 0.0205], [0.0182, 0.0238], [0.0163, 0.025], [0.0146, 0.0238], [0.0138, 0.0205], [0.0128, 0.0155], [0.0098, 0.0118], [0.0045, 0.0104], [0.0005, 0.0102]];
      const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 40);
      const pos = g.getAttribute('position'), p = V();
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i);
        const push = 1 + noise(p, 260) * 0.05;
        pos.setXYZ(i, p.x * push, p.y, p.z * push);
      }
      g.computeVertexNormals();
      paint(g, (q, n) => ((q.x * n.x + q.z * n.z) / (Math.hypot(q.x, q.z) || 1) < -0.1 || (q.y > 0.0235 && n.y > 0.6) ? downTone : new THREE.Color('#7d7866')));
      bed.add(g);
      const outer = (y: number) => {
        for (let i = 0; i < 7; i++) {
          const [r0, y0] = profile[i], [r1, y1] = profile[i + 1];
          if (y >= y0 && y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0 || 1);
        }
        return 0.016;
      };
      const palette = ['#8fae9a', '#7a9c8a', '#a3b896', '#5f8577', '#b0bfa0', '#7f97a0'];
      for (let i = 0; i < 120; i++) {
        const y = 0.0025 + random() * 0.02, angle = random() * TAU, r = outer(y) + 0.0003;
        const n = V(Math.cos(angle), 0.25, Math.sin(angle)).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), n).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), random() * TAU));
        const size = 0.0017 + random() * 0.002;
        flakes.push({ matrix: new THREE.Matrix4().compose(V(Math.cos(angle) * r, y, Math.sin(angle) * r), q, V(size, size, size)), colour: palette[Math.floor(random() * palette.length)] });
      }
      fluff(0.0152, 0.0245, 36);
      floor = 0.0104;
      cupRim = 0.025;
    } else if (a.bed === 'berry-basket') {
      // A green plastic punnet: a lattice of square holes, lined with crumpled tissue.
      const green = mood.wear > 0.6 ? '#4f8a52' : '#2f9a4a';
      const W = 0.05, D = 0.042, H = 0.026, bar = 0.0016;
      bed.add(new THREE.BoxGeometry(W, bar, D), green, xf(V(0, bar / 2, 0)));
      const wall = (length: number, at: (s: number) => THREE.Vector3, turn: number) => {
        for (let k = 0; k <= 5; k++) bed.add(new THREE.BoxGeometry(length, bar, bar), green, xf(at(0).add(V(0, (k / 5) * H, 0)), 1, new THREE.Euler(0, turn, 0)));
        for (let k = 0; k <= 8; k++) {
          const s = k / 8 - 0.5;
          bed.add(new THREE.BoxGeometry(bar, H, bar), green, xf(at(s).add(V(0, H / 2, 0)), 1, new THREE.Euler(0, turn, 0)));
        }
      };
      wall(W, (s) => V(s * W, 0, D / 2), 0);
      wall(W, (s) => V(s * W, 0, -D / 2), 0);
      wall(D, (s) => V(W / 2, 0, s * D), Math.PI / 2);
      wall(D, (s) => V(-W / 2, 0, s * D), Math.PI / 2);
      for (let i = 0; i < 7; i++) {
        const x = (random() - 0.5) * 0.026, z = (random() - 0.5) * 0.02;
        bed.add(paint(blob(V(0.012, 0.007, 0.01), noise, 0.3, 5, 16, 10), (_p, n) => new THREE.Color('#f7f6f1').lerp(new THREE.Color('#c9c8c2'), Math.max(0, -n.y) * 0.8)), null, xf(V(x, 0.008, z), 1, new THREE.Euler(random(), random() * TAU, random())));
      }
      floor = 0.012;
    }
    bed.into(root, matte({ roughness: a.bed === 'berry-basket' ? 0.45 : 0.95 }));
    fibres.into(root, matte({ roughness: 1, emissive: '#fff6e6', emissiveIntensity: 0.1 }));
    if (flakes.length) {
      const shape = new THREE.Shape();
      for (let i = 0; i <= 18; i++) {
        const angle = (i / 18) * TAU, r = 0.82 + 0.16 * Math.cos(angle * 6) + (random() - 0.5) * 0.12;
        if (i === 0) shape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      const flake = new THREE.ShapeGeometry(shape);
      flake.rotateX(-Math.PI / 2);
      instances(root, flake, matte({ side: THREE.DoubleSide, roughness: 0.95 }), flakes);
    }

    // ---- The chicks.
    const skin = new THREE.Color('#4b4146').lerp(new THREE.Color('#6a5148'), mood.warmth * 0.4);
    const belly = new THREE.Color('#77605f').lerp(new THREE.Color('#8a6a5e'), mood.warmth * 0.4);
    const greenBack = new THREE.Color('#4f7d43'), paleBelly = new THREE.Color('#b9b6aa');
    const flesh = new Bag(), quills: { matrix: THREE.Matrix4; colour: string }[] = [];
    const sways: { neck: THREE.Group; head: THREE.Group; amp: number; phase: number; rest: THREE.Euler; upper: THREE.Object3D | null; gape: number }[] = [];
    const poses: Pose[] = { begging: ['beg', 'beg'], 'one-fed': ['beg', 'slump'], sleeping: ['sleep', 'sleep'], jostling: ['strain', 'strain'] }[a.doing] as Pose[];
    const chickMeshes = new THREE.Group();
    root.add(chickMeshes);

    const tipPoints: THREE.Vector3[] = [];
    poses.forEach((pose, index) => {
      const sideOf = index === 0 ? -1 : 1;
      const chick = new THREE.Group();
      const climbing = pose === 'strain' && index === 1;
      chick.position.set(sideOf * rx * (pose === 'sleep' ? 0.85 : 0.95) + (climbing ? -rx * 0.55 : 0), floor + ry * 0.8 + (climbing ? ry * 0.55 : 0), (random() - 0.5) * 0.002 + (climbing ? -rz * 0.25 : 0));
      chick.rotation.set(climbing ? -0.25 : 0, sideOf * (pose === 'sleep' ? 0.6 : 0.2) + (random() - 0.5) * 0.2, climbing ? 0.35 : sideOf * -0.08);
      chickMeshes.add(chick);

      // Body: a lumpy bag of skin, darker on top.
      const torso = paint(blob(V(rx, ry, rz), noise, 0.06, 4, 20, 14), (q, n) => {
        if (a.age === 'feathered') return paleBelly.clone().lerp(greenBack, Math.min(1, Math.max(0, n.y + 0.2) * 1.3));
        return belly.clone().lerp(skin, Math.min(1, Math.max(0, n.y + 0.3) * 1.4)).multiplyScalar(1 + noise(q, 900) * 0.05);
      });
      const local = new Bag();
      local.add(torso);
      // Wing stubs.
      for (const s of [-1, 1]) {
        const w = a.age === 'feathered' ? 0.0028 : 0.0016;
        local.add(tube([V(s * rx * 0.85, ry * 0.25, rz * 0.3), V(s * rx * 1.0, ry * 0.15, -rz * 0.3), V(s * rx * 0.7, ry * 0.25, -rz * (a.age === 'feathered' ? 1.15 : 0.7))], (t) => w * (1 - t * 0.6), { sides: 6, flat: 0.35, smooth: 8, up: V(s, 1, 0).normalize() }), a.age === 'feathered' ? '#3f5e3a' : skin.clone().multiplyScalar(0.9));
      }
      if (a.age === 'feathered') local.add(tube([V(0, ry * 0.2, -rz * 0.85), V(0, ry * 0.35, -rz * 1.3)], 0.0022, { sides: 6, flat: 0.2, up: V(0, 1, 0) }), '#3a5236');
      // Pinfeathers along back and wings, or a hatchling's fuzz.
      if (a.age !== 'feathered') {
        const count = a.age === 'pinfeathered' ? 70 : 14;
        for (let i = 0; i < count; i++) {
          const u = random() * TAU, v = random() * 0.85;
          const n = V(Math.cos(u) * Math.sin(Math.acos(1 - v)), 1 - v, Math.sin(u) * Math.sin(Math.acos(1 - v)));
          if (n.y < 0.05) continue;
          const at = V(n.x * rx, n.y * ry, n.z * rz);
          const dir = V(n.x, n.y * 0.7, n.z - 0.8).normalize();
          const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir);
          if (a.age === 'pinfeathered') quills.push({ matrix: new THREE.Matrix4().compose(at.applyEuler(chick.rotation).add(chick.position), q.premultiply(new THREE.Quaternion().setFromEuler(chick.rotation)), V(0.00042, 0.0024 + random() * 0.0012, 0.00042)), colour: random() < 0.3 ? '#9fb0c2' : '#6c7a8e' });
          else local.add(tube(arc(at, at.clone().add(dir.multiplyScalar(0.003)), V(0, 0.0008, 0), 4), 0.00012, { sides: 3 }), '#b8b4b4');
        }
      }
      for (const piece of [local]) flesh.add(mergeLocal(piece), null, chick.matrix.compose(chick.position, new THREE.Quaternion().setFromEuler(chick.rotation), V(1, 1, 1)).clone());

      // Neck and head on a pivot at the shoulders, so they can sway.
      const neckGroup = new THREE.Group();
      const anchor = V(0, ry * 0.6, rz * 0.55).applyEuler(chick.rotation).add(chick.position);
      neckGroup.position.copy(anchor);
      root.add(neckGroup);
      let headAt: THREE.Vector3, nod: number, gapeAngle: number;
      const reach = age.neck;
      if (pose === 'beg') { headAt = V(sideOf * 0.0015, reach * 1.5, 0.002); nod = -1.0 + (random() - 0.5) * 0.2; gapeAngle = 0.95; }
      else if (pose === 'strain') { headAt = V(0.003 + sideOf * 0.001, reach * 1.2, 0.0045); nod = -0.75; gapeAngle = 0.7; }
      else if (pose === 'slump') { headAt = V(sideOf * -0.002, -ry * 0.25, rz * 0.55); nod = 0.5; gapeAngle = 0.02; }
      else { headAt = V(sideOf * -rx * 0.9, -ry * 0.05, rz * 0.2); nod = 0.35; gapeAngle = 0.02; }
      const neckPath = [V(0, -ry * 0.25, -rz * 0.15), V(headAt.x * 0.4, headAt.y * 0.5, headAt.z * 0.3 - 0.0018), headAt.clone().add(V(0, -age.head * 0.55, -age.head * 0.35))];
      const neckBag = new Bag();
      neckBag.add(tube(neckPath, (t) => mix(age.head * 0.62, age.head * 0.4, Math.min(1, t * 1.4)), { sides: 10, smooth: 10, colour: () => (a.age === 'feathered' ? '#9a9c8e' : skin) }));
      const head = new THREE.Group();
      head.position.copy(headAt);
      head.rotation.order = 'YXZ';
      head.rotation.set(nod, pose === 'sleep' ? sideOf * -1.0 : (random() - 0.5) * 0.4, 0);
      neckGroup.add(head);
      neckBag.add(paint(blob(V(age.head, age.head * 0.92, age.head * 1.05), noise, 0.03, 3, 18, 12), (_q, n) => (a.age === 'feathered' ? paleBelly.clone().lerp(greenBack, Math.max(0, n.y + 0.1)) : skin.clone().multiplyScalar(0.95 + Math.max(0, n.y) * 0.1))), null, xf(head.position).multiply(new THREE.Matrix4().makeRotationFromEuler(head.rotation)));
      neckBag.into(neckGroup, matte({ roughness: a.age === 'feathered' ? 0.5 : 0.62, metalness: a.age === 'feathered' ? 0.25 : 0 }));

      // Eyes: sealed bulges, or open and shining.
      const eyes = new Bag();
      for (const s of [-1, 1]) {
        const at = V(s * age.head * 0.66, age.head * 0.32, age.head * 0.38);
        const resting = pose === 'sleep' || pose === 'slump';
        if (((a.eyes && a.age !== 'hatchling') || a.age === 'feathered') && !resting) eyes.add(new THREE.SphereGeometry(age.head * 0.22, 10, 8), '#0b0a0b', xf(at.multiplyScalar(1.12)));
        else if (a.age !== 'hatchling') eyes.add(tube([at.clone().multiplyScalar(1.1).add(V(0, 0, -age.head * 0.2)), at.clone().multiplyScalar(1.1).add(V(0, -age.head * 0.03, age.head * 0.18))], age.head * 0.05, { sides: 3 }), '#121014');
        else {
          eyes.add(paint(blob(V(age.head * 0.4, age.head * 0.36, age.head * 0.46), null), () => '#2b2540'), null, xf(at));
          eyes.add(tube([at.clone().add(V(s * age.head * 0.3, 0, -age.head * 0.2)), at.clone().add(V(s * age.head * 0.32, 0, age.head * 0.25))], age.head * 0.04, { sides: 3 }), '#121014');
        }
      }
      eyes.into(head, matte({ roughness: 0.2 }));

      // The bill: two mandibles hinged at the gape, a bright mouth between them.
      const billTone = a.age === 'hatchling' ? '#e9cf6a' : a.age === 'pinfeathered' ? '#3a3236' : '#1e1b1d';
      const hinge = V(0, -age.head * 0.18, age.head * 0.72);
      const upper = new THREE.Group(), lower = new THREE.Group();
      upper.position.copy(hinge); lower.position.copy(hinge);
      upper.rotation.x = -gapeAngle / 2; lower.rotation.x = gapeAngle / 2;
      head.add(upper, lower);
      const width = age.head * (a.age === 'hatchling' ? 0.62 : 0.5);
      const mandible = (length: number, droop: number) => tube([V(0, 0, 0), V(0, droop * 0.4, length * 0.5), V(0, droop, length)], (t) => mix(width, width * 0.12, Math.pow(t, 0.8)), { sides: 8, flat: 0.45, up: V(0, 1, 0), smooth: 8 });
      const bills = new Bag();
      bills.add(mandible(age.bill, -0.0003), billTone);
      const upperMesh = bills.into(upper, matte({ roughness: 0.35 }));
      const lowerBag = new Bag();
      lowerBag.add(mandible(age.bill * 0.93, 0.0002), billTone);
      lowerBag.into(lower, matte({ roughness: 0.35 }));
      // The gape: flanges at the corners and the mouth lining, bright and slightly glowing.
      const mouth = new Bag();
      if (gapeAngle > 0.1) mouth.add(paint(blob(V(width * 0.9, width * 0.9 * gapeAngle + width * 0.25, age.bill * 0.45), null), () => gape.inside), null, xf(hinge.clone().add(V(0, 0, age.bill * 0.3))));
      const flange = width * (a.age === 'feathered' ? 0.2 : 0.4);
      for (const s of [-1, 1]) mouth.add(new THREE.SphereGeometry(flange, 8, 6), gape.flange, xf(hinge.clone().add(V(s * width * 0.85, 0, width * 0.15))));
      mouth.into(head, matte({ roughness: 0.4, emissive: gape.inside, emissiveIntensity: 0.35 }));
      root.updateMatrixWorld(true);
      sways.push({ neck: neckGroup, head, amp: pose === 'beg' || pose === 'strain' ? 1 : 0.15, phase: random() * TAU, rest: neckGroup.rotation.clone(), upper: upperMesh ? upper : null, gape: gapeAngle });
      const tip = V(0, 0, age.bill).applyEuler(upper.rotation).add(hinge);
      tipPoints.push(head.localToWorld(tip.clone()));
    });

    flesh.into(chickMeshes, matte({ roughness: a.age === 'feathered' ? 0.5 : 0.6, metalness: a.age === 'feathered' ? 0.25 : 0 }));
    instances(chickMeshes, (() => { const g = new THREE.ConeGeometry(1, 1, 5); g.translate(0, 0.5, 0); return g; })(), matte({ roughness: 0.5 }), quills);

    // ---- Beside them.
    const extra = new Bag();
    if (a.beside === 'eggshell') {
      // Half an eggshell, its broken rim jagged, tipped so the hollow shows.
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = (i / 10) * Math.PI * 0.58;
        pts.push(new THREE.Vector2(Math.max(1e-5, Math.sin(t) * 0.0043), -Math.cos(t) * 0.0065));
      }
      const shell = new THREE.LatheGeometry(pts, 24);
      const sp = shell.getAttribute('position');
      const top = -Math.cos(Math.PI * 0.58) * 0.0065;
      for (let i = 0; i < sp.count; i++)
        if (Math.abs(sp.getY(i) - top) < 1e-6) {
          const angle = Math.atan2(sp.getX(i), sp.getZ(i));
          sp.setY(i, top - (Math.round(angle * 4) % 2 === 0 ? 0.0012 : 0) - Math.abs(Math.sin(angle * 2.5)) * 0.0008);
        }
      shell.computeVertexNormals();
      paint(shell, (_q, n) => new THREE.Color('#f4f1ea').lerp(new THREE.Color('#d8cdbb'), Math.max(0, n.y) * 0.5));
      const reach = a.bed === 'nest-cup' ? 0.0105 : a.bed === 'berry-basket' ? 0.016 : 0.017;
      // The membrane lining the hollow, darker, so the shell reads as broken open.
      const lining = shell.clone();
      lining.scale(0.92, 0.97, 0.92);
      paint(lining, () => '#b9a68a');
      const place = xf(V(reach, floor + 0.0042, 0.006), 1, new THREE.Euler(0.95, 0.4, -0.35));
      extra.add(shell, null, place);
      extra.add(lining, null, place);
    } else if (a.beside === 'feather') {
      const vane = leaf(0.011, 0.005, { fold: -0.08, droop: 0.12, tip: 0.7, colour: (t) => new THREE.Color('#2f6d4a').lerp(new THREE.Color('#c8c4b4'), Math.max(0, 0.35 - t) * 2.6) });
      const reach = a.bed === 'nest-cup' ? 0.0125 : 0.015;
      extra.add(vane, null, xf(V(-reach, (a.bed === 'nest-cup' ? cupRim : floor) + 0.0004, 0.004), 1, new THREE.Euler(0.1, 2.2, 0.15)));
    }
    extra.into(root, matte({ side: THREE.DoubleSide, roughness: 0.6, metalness: a.beside === 'feather' ? 0.35 : 0 }));
    if (a.beside === 'nectar' && tipPoints.length) {
      const drop = tipPoints[0].clone().add(V(0, -0.0007, 0));
      instances(root, new THREE.SphereGeometry(1, 14, 10), dewMaterial('#f6e9c8', '#c98a3a', 0.5), [{ matrix: xf(drop, V(0.0009, 0.0011, 0.0009)) }]);
    }

    // ---- Motion: begging chicks sway and pump their gapes, more wildly the hungrier the moment.
    const amp = mix(0.04, 0.42, Math.pow(mood.energy, 1.3));
    const speed = mix(1.5, 7, mood.energy);
    return finish(root, (_dt, time) => {
      for (const s of sways) {
        const wobble = Math.sin(time * speed + s.phase);
        s.neck.rotation.z = s.rest.z + wobble * amp * s.amp;
        s.neck.rotation.x = s.rest.x + Math.sin(time * speed * 0.7 + s.phase * 2) * amp * 0.4 * s.amp;
        if (s.upper && s.gape > 0.1) s.upper.rotation.x = -s.gape / 2 - Math.max(0, Math.sin(time * speed * 1.3 + s.phase)) * 0.15 * mood.energy;
      }
    });
  },
});

/** Merge a bag's pieces into one geometry, for re-bagging under a transform. */
function mergeLocal(bag: Bag) {
  const holder = new THREE.Group();
  const mesh = bag.into(holder, new THREE.MeshBasicMaterial());
  const geometry = mesh!.geometry;
  (mesh!.material as THREE.Material).dispose();
  return geometry;
}
