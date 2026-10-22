import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, noul, visibleBounds } from '@conjure/kit';

type P3 = readonly [number, number, number];
const v3 = (p: P3) => new THREE.Vector3(...p);

/** A round tube that narrows along a curve. */
function taper(points: readonly THREE.Vector3[], from: number, to: number, segments = 18, sides = 8) {
  const curve = new THREE.CatmullRomCurve3(points as THREE.Vector3[]);
  const position: number[] = [], index: number[] = [];
  const n = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const p = curve.getPoint(u), t = curve.getTangent(u).normalize();
    n.addScaledVector(t, -n.dot(t));
    if (n.lengthSq() < 1e-6) n.set(0, 0, 1).addScaledVector(t, -t.z);
    n.normalize();
    const b = new THREE.Vector3().crossVectors(t, n);
    const r = mix(from, to, u);
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      const v = p.clone().addScaledVector(n, Math.cos(angle) * r).addScaledVector(b, Math.sin(angle) * r);
      position.push(v.x, v.y, v.z);
    }
  }
  const ring = sides + 1;
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * ring + j;
      index.push(a, a + 1, a + ring, a + 1, a + ring + 1, a + ring);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

const PLUMAGE = {
  scarlet: 'Pure saturated scarlet from crown to tail, black only at the wingtips.',
  white: 'Snow white with a red face, red bill and red legs.',
  glossy: 'Dark chestnut and bottle green with an oily iridescent sheen.',
  juvenile: 'A young bird: mottled brown above, white below, pink just starting to show.',
  blush: 'Washed-out salmon pink, a faded bird that has not been eating its shrimp.',
} as const;
const FEATHERS: Record<keyof typeof PLUMAGE, { body: string; wing: string; tip: string; bill: string; leg: string; belly: string | null; metal: number }> = {
  scarlet: { body: '#d8160f', wing: '#cc120d', tip: '#141416', bill: '#4a3530', leg: '#e2705f', belly: null, metal: 0 },
  white: { body: '#f3f0e8', wing: '#ebe7dc', tip: '#1a1a1c', bill: '#e0503a', leg: '#e0503a', belly: null, metal: 0 },
  glossy: { body: '#5a2a2c', wing: '#1e5746', tip: '#12332c', bill: '#6b5d4c', leg: '#4b443a', belly: null, metal: 0.55 },
  juvenile: { body: '#8a6b58', wing: '#6f5546', tip: '#2a2422', bill: '#c9a48e', leg: '#b08d82', belly: '#efe6da', metal: 0 },
  blush: { body: '#f0a08a', wing: '#eb957f', tip: '#2c2424', bill: '#b98f7c', leg: '#d9a295', belly: null, metal: 0 },
};
const POSES = {
  'one-leg': 'Standing on one leg with the other tucked up, neck folded, half asleep.',
  probing: 'Tipped forward with its curved bill sunk in the mud, feeling for crabs.',
  alert: 'Upright on both legs, neck stretched tall, watching you.',
  preening: 'Head twisted back, drawing a wing feather through its bill.',
  landing: 'Wings thrown up and wide, toes just touching down.',
  flying: 'Airborne, neck and legs stretched out straight, wings beating.',
} as const;
type Pose = keyof typeof POSES;

export default defineThing({
  questions: {
    pose: choice('What is the ibis doing?', POSES),
    plumage: choice('What colour is it?', PLUMAGE),
    company: choice('Is it alone?', {
      alone: 'One bird alone.',
      pair: 'A pair standing close.',
      flock: 'A small flock scattered across the mud, each busy with something.',
      skein: 'One below, and a line of three more passing overhead toward the roost.',
    }),
    perch: choice('Where is it standing?', {
      mud: 'On a bare bar of wet mud printed with its own tracks.',
      shallows: 'Ankle deep in still brown water, rings spreading from its legs.',
      root: 'Balanced on an arching mangrove root above the water.',
      post: 'On top of an old leaning post.',
    }),
    crab: noul('Has it caught a small crab in the tip of its bill?'),
    feathers: noul('Are shed feathers lying on the ground around it?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const F = FEATHERS[a.plumage];
    const glow = a.plumage === 'scarlet' ? mix(0.12, 0.42, mood.cheer) : a.plumage === 'glossy' ? 0.05 : mix(0.02, 0.12, mood.cheer);
    const dull = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#7d7468'), mood.wear * 0.14);
    const feather = new THREE.MeshStandardMaterial({ color: dull(F.body), emissive: F.body, emissiveIntensity: glow, roughness: F.metal ? 0.3 : 0.65, metalness: F.metal });
    const wingPaint = new THREE.MeshStandardMaterial({ color: dull(F.wing), emissive: F.wing, emissiveIntensity: glow, roughness: F.metal ? 0.25 : 0.6, metalness: F.metal });
    const tipPaint = new THREE.MeshStandardMaterial({ color: F.tip, roughness: 0.5 });
    const sail = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: F.wing, emissiveIntensity: glow * 0.7, roughness: 0.6, metalness: F.metal });
    const billPaint = new THREE.MeshStandardMaterial({ color: F.bill, roughness: 0.4 });
    const legPaint = new THREE.MeshStandardMaterial({ color: F.leg, roughness: 0.5 });
    const bellyPaint = F.belly ? new THREE.MeshStandardMaterial({ color: F.belly, roughness: 0.7 }) : feather;
    const black = new THREE.MeshStandardMaterial({ color: '#0c0c0e', roughness: 0.2 });
    const facePaint = new THREE.MeshStandardMaterial({ color: a.plumage === 'white' ? '#e0503a' : dull(F.body), roughness: 0.5 });
    const flappers: { wing: THREE.Group; side: number; phase: number; rest: number }[] = [];
    const bobbers: { group: THREE.Group; baseY: number; phase: number }[] = [];

    const bird = (pose: Pose, withCrab: boolean) => {
      const group = new THREE.Group();
      const add = <T extends THREE.Object3D>(parent: THREE.Object3D, node: T, at: P3 = [0, 0, 0]) => { node.position.set(...at); node.traverse((c) => { c.castShadow = c.receiveShadow = true; }); parent.add(node); return node; };
      const limb = (from: THREE.Vector3, to: THREE.Vector3, r0: number, r1: number, material: THREE.Material) => {
        const span = to.clone().sub(from);
        const mesh = add(group, new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, span.length(), 6), material), from.clone().add(to).multiplyScalar(0.5).toArray() as [number, number, number]);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.normalize());
      };
      const air = pose === 'flying';
      const lift = air ? 0.1 : 0;
      const centres: Record<Pose, P3> = { 'one-leg': [0, 0.36, 0], probing: [0, 0.31, 0.02], alert: [0, 0.37, 0], preening: [0, 0.36, 0], landing: [0, 0.36, -0.02], flying: [0, 0.3, 0] };
      const centre = v3(centres[pose]);
      centre.y += lift;
      const pitch = { 'one-leg': -0.3, probing: 0.55, alert: -0.45, preening: -0.25, landing: -0.7, flying: 0.02 }[pose];
      const torso = new THREE.Group();
      torso.position.copy(centre);
      torso.rotation.x = pitch;
      group.add(torso);
      const body = add(torso, new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), feather));
      body.scale.set(0.075, 0.085, 0.145);
      if (F.belly) add(torso, new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), bellyPaint), [0, -0.02, 0.01]).scale.set(0.07, 0.075, 0.13);
      const tail = add(torso, new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), feather), [0, 0.0, -0.15]);
      tail.scale.set(0.05, 0.018, 0.075);
      tail.rotation.x = 0.25;
      const open = pose === 'landing' || pose === 'flying';
      if (!open) {
        for (const e of [-1, 1]) {
          const fold = add(torso, new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), wingPaint), [e * 0.062, 0.015, -0.03]);
          fold.scale.set(0.026, 0.066, 0.135);
          fold.rotation.set(0.12, e * 0.1, 0);
          const tip = add(torso, new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), tipPaint), [e * 0.045, -0.012, -0.16]);
          tip.scale.set(0.014, 0.022, 0.05);
          tip.rotation.x = 0.2;
        }
      } else {
        for (const e of [-1, 1]) {
          const span = 0.46, chord = 0.19;
          const plane = new THREE.PlaneGeometry(1, 1, 10, 3);
          const pos = plane.attributes.position;
          const colours: number[] = [];
          const base = dull(F.wing), dark = new THREE.Color(F.tip);
          for (let i = 0; i < pos.count; i++) {
            const u = pos.getX(i) + 0.5, w = pos.getY(i) + 0.5;
            const c = chord * (1 - 0.72 * u ** 2.2);
            const scallop = w < 0.01 ? Math.abs(Math.sin(u * 22)) * 0.018 * (0.4 + u) : 0;
            pos.setXYZ(i, u * span, -(u ** 2) * 0.05 * (air ? 1 : -1.6), 0.06 - u * 0.05 - (1 - w) * c - scallop);
            const shade = u > 0.8 ? dark : base;
            colours.push(shade.r, shade.g, shade.b);
          }
          plane.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
          plane.computeVertexNormals();
          const wing = new THREE.Group();
          add(wing, new THREE.Mesh(plane, sail));
          add(wing, new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.014, span * 0.92, 6), wingPaint), [span * 0.46, 0.004, 0.05]).rotation.z = Math.PI / 2 - 0.06;
          wing.scale.x = e;
          wing.position.set(e * 0.05, 0.05, 0.04);
          const rest = air ? 0.15 : 0.95;
          wing.rotation.z = e * rest;
          if (!air) wing.rotation.x = 0.5;
          torso.add(wing);
          flappers.push({ wing, side: e, phase: random() * 6, rest });
        }
      }

      // Neck, head and the sickle bill.
      torso.updateMatrix();
      const neckBase = v3([0, 0.035, 0.115]).applyMatrix4(torso.matrix);
      const reach: Record<Pose, { head: P3; via: P3[]; f: P3; d: P3 }> = {
        'one-leg': { head: [0, 0.5, 0.115], via: [[0, 0.43, 0.2], [0, 0.5, 0.2]], f: [0, -0.45, 1], d: [0, -1, -0.45] },
        alert: { head: [0, 0.645, 0.13], via: [[0, 0.5, 0.2], [0, 0.6, 0.14]], f: [0, -0.22, 1], d: [0, -1, -0.22] },
        probing: { head: [0, 0.17, 0.31], via: [[0, 0.33, 0.25], [0, 0.26, 0.32]], f: [0, -0.92, 0.38], d: [0, -0.38, -0.92] },
        preening: { head: [0.075, 0.47, -0.01], via: [[0.01, 0.5, 0.15], [0.07, 0.54, 0.07]], f: [0.1, -0.85, -0.5], d: [-0.4, -0.3, 0.5] },
        landing: { head: [0, 0.66, 0.12], via: [[0, 0.52, 0.17], [0, 0.61, 0.13]], f: [0, -0.3, 1], d: [0, -1, -0.3] },
        flying: { head: [0, 0.345 + lift, 0.36], via: [[0, 0.33 + lift, 0.24]], f: [0, -0.12, 1], d: [0, -1, -0.12] },
      };
      const r = reach[pose];
      const head = v3(r.head), f = v3(r.f).normalize(), d = v3(r.d).normalize();
      add(group, new THREE.Mesh(taper([neckBase, ...r.via.map(v3), head], 0.034, 0.017), feather));
      const skull = add(group, new THREE.Mesh(new THREE.SphereGeometry(0.027, 12, 10), facePaint), head.toArray() as [number, number, number]);
      skull.scale.set(0.9, 1, 1.15);
      for (const e of [-1, 1]) add(group, new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 5), black), head.clone().addScaledVector(new THREE.Vector3().crossVectors(d, f).normalize(), e * 0.022).addScaledVector(f, 0.008).addScaledVector(d, -0.006).toArray() as [number, number, number]);
      const billPoints = [head.clone().addScaledVector(f, 0.015), head.clone().addScaledVector(f, 0.075).addScaledVector(d, 0.006), head.clone().addScaledVector(f, 0.13).addScaledVector(d, 0.03), head.clone().addScaledVector(f, 0.165).addScaledVector(d, 0.066)];
      add(group, new THREE.Mesh(taper(billPoints, 0.013, 0.0035), billPaint));
      if (withCrab && pose !== 'preening') {
        const at = billPoints[3];
        const shell = add(group, new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#d98a2c', roughness: 0.5 })), at.toArray() as [number, number, number]);
        shell.scale.set(0.022, 0.011, 0.016);
        for (let i = 0; i < 6; i++) limb(at, at.clone().add(new THREE.Vector3((i < 3 ? -1 : 1) * 0.032, -0.012 + (i % 3) * 0.004, ((i % 3) - 1) * 0.016)), 0.003, 0.0015, shell.material);
      }

      // Legs.
      const hips = [-1, 1].map((e) => v3([e * 0.03, -0.065, -0.01]).applyMatrix4(torso.matrix));
      hips.forEach((hip, i) => {
        const e = i === 0 ? -1 : 1;
        let knee: THREE.Vector3, foot: THREE.Vector3, toes = true;
        if (air) { knee = hip.clone().add(new THREE.Vector3(0, -0.02, -0.14)); foot = knee.clone().add(new THREE.Vector3(0, 0.0, -0.17)); toes = false; }
        else if (pose === 'one-leg' && i === 1) { knee = hip.clone().add(new THREE.Vector3(0, -0.075, 0.07)); foot = knee.clone().add(new THREE.Vector3(0, 0.03, -0.1)); toes = false; }
        else if (pose === 'one-leg') { knee = new THREE.Vector3(0.005, 0.17, -0.02); foot = new THREE.Vector3(0.005, 0, 0.005); }
        else if (pose === 'landing') { knee = new THREE.Vector3(e * 0.035, 0.16, 0.05); foot = new THREE.Vector3(e * 0.04, 0, 0.09 + i * 0.03); }
        else { knee = new THREE.Vector3(e * 0.032, 0.17, -0.03 + (pose === 'probing' ? 0.0 : 0) + i * 0.02); foot = new THREE.Vector3(e * 0.034, 0, i * 0.045 - 0.01); }
        if (pose === 'one-leg' && i === 0) hip.x = 0.01;
        limb(hip, knee, 0.012, 0.0075, legPaint);
        limb(knee, foot, 0.007, 0.006, legPaint);
        add(group, new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 5), legPaint), knee.toArray() as [number, number, number]);
        if (toes) for (const turn of [-0.55, 0, 0.55, Math.PI]) limb(foot.clone().setY(0.006), foot.clone().add(new THREE.Vector3(Math.sin(turn) * 0.05, 0.003, Math.cos(turn) * (turn === Math.PI ? 0.025 : 0.05))), 0.005, 0.0025, legPaint);
        else for (const turn of [-0.3, 0, 0.3]) limb(foot, foot.clone().add(new THREE.Vector3(Math.sin(turn) * 0.03, -0.012, -0.04)), 0.004, 0.002, legPaint);
      });
      return group;
    };

    // Where they stand.
    const others = { alone: 0, pair: 1, flock: 3 + Math.floor(random() * 2 + mood.density * 2), skein: 0 }[a.company];
    const R = a.company === 'flock' ? 0.62 : a.company === 'pair' ? 0.44 : 0.34;
    const put = <T extends THREE.Object3D>(node: T, at: P3 = [0, 0, 0]) => { node.position.set(...at); node.traverse((c) => { c.castShadow = c.receiveShadow = true; }); root.add(node); return node; };
    const tea = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6a5334').lerp(new THREE.Color('#7f8f86'), 0.3), roughness: 0.06, metalness: 0.35 });
    const mudPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6c5a48').lerp(new THREE.Color('#80603f'), mood.warmth * 0.6), roughness: mix(0.3, 0.6, mood.wear), metalness: 0.1 });
    const ripple = new THREE.MeshStandardMaterial({ color: '#b5b8a0', roughness: 0.2 });
    const wet = a.perch !== 'mud';
    const sheet = put(new THREE.Mesh(new THREE.CylinderGeometry(R * 1.12, R * 1.12, 0.006, 44), tea), [0, -0.002, 0]);
    sheet.scale.z = 0.88;
    let deck = 0;
    if (!wet) {
      deck = 0.03;
      put(new THREE.Mesh(new THREE.LatheGeometry([[R, 0], [R * 0.93, 0.014], [R * 0.75, 0.027], [0, 0.03]].map(([x, y]) => new THREE.Vector2(x, y)), 40), mudPaint)).scale.z = 0.86;
    }
    const ringAt = (x: number, z: number, radius: number) => put(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.003, 4, 28), ripple), [x, 0.003, z]).rotation.x = Math.PI / 2;
    const yaw = -0.6 + (random() - 0.5) * 0.3;
    const hero = bird(a.pose, a.crab);
    let heroY = deck;
    if (a.perch === 'root') {
      heroY = 0.27;
      const bark = new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.85 });
      const dir = new THREE.Vector3(Math.cos(yaw + 0.5), 0, -Math.sin(yaw + 0.5));
      const arch = [-1.5, -1, -0.45, 0, 0.5, 1, 1.4].map((k) => new THREE.Vector3(dir.x * k * 0.24, k < -1.2 || k > 1.2 ? -0.06 : 0.26 - 0.26 * Math.abs(k) ** 2.2, dir.z * k * 0.24));
      put(new THREE.Mesh(taper(arch, 0.03, 0.022, 30, 8), bark));
      const strut = [new THREE.Vector3(dir.x * 0.05, 0.25, dir.z * 0.05), new THREE.Vector3(-dir.z * 0.12, 0.14, dir.x * 0.12), new THREE.Vector3(-dir.z * 0.2, -0.05, dir.x * 0.2)];
      put(new THREE.Mesh(taper(strut, 0.02, 0.014, 16, 7), bark));
      for (const k of [-1.12, 1.08]) ringAt(dir.x * k * 0.24, dir.z * k * 0.24, 0.07);
      const oysters = Array.from({ length: Math.floor(3 + mood.wear * 8) }, () => (random() < 0.5 ? -1 : 1) * mix(0.85, 1.1, random()));
      for (const k of oysters) put(new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), new THREE.MeshStandardMaterial({ color: '#c9c5b8', roughness: 0.9, flatShading: true })), [dir.x * k * 0.24 + 0.02, 0.26 - 0.26 * Math.abs(k) ** 2.2, dir.z * k * 0.24]);
    } else if (a.perch === 'post') {
      heroY = 0.34;
      const post = put(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.46, 9), new THREE.MeshStandardMaterial({ color: dull('#6b5a4a'), roughness: 0.9, flatShading: true })), [0, 0.11, 0]);
      put(new THREE.Mesh(new THREE.CylinderGeometry(0.067, 0.07, 0.14, 9), new THREE.MeshStandardMaterial({ color: '#3f4a36', roughness: 0.8 })), [0, 0.05, 0]);
      ringAt(0, 0, 0.11);
      void post;
    } else if (a.perch === 'shallows') {
      heroY = -0.045;
    }
    const heroAt = a.company === 'pair' ? new THREE.Vector3(-0.12, 0, 0.05) : new THREE.Vector3(0, 0, 0);
    if (a.perch === 'root' || a.perch === 'post') heroAt.set(0, 0, 0);
    hero.position.set(heroAt.x, a.pose === 'flying' ? Math.max(heroY, 0) + 0.2 : heroY, heroAt.z);
    hero.rotation.y = yaw;
    root.add(hero);
    if (a.pose === 'flying') bobbers.push({ group: hero, baseY: hero.position.y, phase: 0 });
    if (a.perch === 'shallows' && a.pose !== 'flying') { ringAt(heroAt.x, heroAt.z, 0.06); ringAt(heroAt.x, heroAt.z, 0.11); }
    const standing: Pose[] = ['one-leg', 'probing', 'alert', 'preening', 'probing', 'one-leg'];
    const groundY = a.perch === 'mud' ? deck : -0.045;
    const taken: THREE.Vector3[] = [heroAt.clone()];
    for (let i = 0; i < others; i++) {
      let at = new THREE.Vector3();
      for (let attempt = 0; attempt < 30; attempt++) {
        const angle = random() * Math.PI * 2, reach = R * mix(0.3, 0.78, random());
        at = new THREE.Vector3(Math.sin(angle) * reach, 0, Math.cos(angle) * reach * 0.86);
        if (taken.every((t) => t.distanceTo(at) > 0.27)) break;
      }
      if (a.company === 'pair') at.set(0.17, 0, -0.08);
      taken.push(at);
      const mate = bird(standing[Math.floor(random() * standing.length)], false);
      mate.position.set(at.x, groundY, at.z);
      mate.rotation.y = a.company === 'pair' ? yaw + Math.PI * 0.85 : random() * Math.PI * 2;
      mate.scale.setScalar(mix(0.82, 0.97, random()));
      root.add(mate);
      if (wet) ringAt(at.x, at.z, 0.07);
    }
    if (a.company === 'skein') {
      for (let i = 0; i < 3; i++) {
        const flyer = bird('flying', false);
        flyer.scale.setScalar(0.6);
        flyer.position.set(-0.22 + i * 0.2, 0.86 + i * 0.09 + Math.max(0, heroY), -0.18 + i * 0.12);
        flyer.rotation.y = yaw + 0.2;
        root.add(flyer);
        bobbers.push({ group: flyer, baseY: flyer.position.y, phase: i * 1.3 });
      }
    }
    if (a.perch === 'mud') {
      // Three-toed tracks wandering off across the bar.
      const prints: THREE.Matrix4[] = [];
      let x = heroAt.x, z = heroAt.z, heading = yaw + Math.PI + (random() - 0.5);
      for (let i = 0; i < 16; i++) {
        heading += (random() - 0.5) * 0.5;
        x += Math.sin(heading) * 0.065; z += Math.cos(heading) * 0.065;
        if (Math.hypot(x, z / 0.86) > R * 0.72) break;
        for (const turn of [-0.5, 0, 0.5]) prints.push(new THREE.Matrix4().compose(new THREE.Vector3(x + (i % 2 ? 0.02 : -0.02), deck + 0.0005, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, heading + Math.PI + turn, 0)), new THREE.Vector3(0.004, 0.001, 0.045)));
      }
      if (prints.length) {
        const tracks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5), new THREE.MeshStandardMaterial({ color: '#33291f', roughness: 0.4 }), prints.length);
        prints.forEach((m, i) => tracks.setMatrixAt(i, m));
        put(tracks);
      }
    }
    if (a.feathers) {
      for (let i = 0; i < 5 + Math.floor(mood.density * 5); i++) {
        const angle = random() * Math.PI * 2, reach = R * mix(0.25, 0.9, random());
        const plume = put(new THREE.Mesh(new THREE.SphereGeometry(1, 8, 5), feather), [Math.sin(angle) * reach, (wet ? 0.004 : reach > R * 0.75 ? 0.016 : deck) + 0.003, Math.cos(angle) * reach * 0.86]);
        plume.scale.set(0.012, 0.003, 0.045);
        plume.rotation.y = random() * 6;
      }
    }

    root.updateMatrixWorld(true);
    const centre = visibleBounds(root).getCenter(new THREE.Vector3());
    for (const child of root.children) { child.position.x -= centre.x; child.position.z -= centre.z; }
    const energy = mix(0.35, 1.8, mood.energy);
    return {
      object: root,
      footprint: R * 1.1,
      update: (_dt, time) => {
        for (const flap of flappers) flap.wing.rotation.z = flap.side * (flap.rest + Math.sin(time * (flap.rest > 0.5 ? 3 : 7) * energy + flap.phase * 0) * (flap.rest > 0.5 ? 0.18 : 0.55));
        for (const bob of bobbers) bob.group.position.y = bob.baseY + Math.sin(time * 7 * energy + bob.phase) * 0.012;
      },
      dispose: () => disposeTree(root),
    };
  },
});
