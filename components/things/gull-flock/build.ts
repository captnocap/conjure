import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const KINDS = {
  gulls: 'Herring gulls: white bodies, grey wings with black tips, yellow bills.',
  crows: 'Crows: all black, ragged, clever, flapping hard.',
  kites: 'Black kites: brown raptors with long fingered wings and forked tails, soaring without effort.',
  storks: 'Marabou-like storks: huge white birds with black flight feathers, long legs and long red bills.',
  starlings: 'Starlings: a dense murmuration of many tiny dark birds.',
} as const;
interface Kind { body: string; wing: string; tip: string; beak: string; legs: string; span: number; chord: number; size: number; flap: number; rate: number; neck: number; bill: number; leg: number; fork: boolean; many: number }
const SPEC: Record<keyof typeof KINDS, Kind> = {
  gulls: { body: '#f3f2ec', wing: '#a9b3ba', tip: '#1f2227', beak: '#e9b528', legs: '#d79a3c', span: 0.62, chord: 0.11, size: 1.35, flap: 0.4, rate: 5, neck: 0, bill: 0.09, leg: 0.1, fork: false, many: 1 },
  crows: { body: '#1d1e24', wing: '#23242b', tip: '#0d0d11', beak: '#2b2b2e', legs: '#2b2b2e', span: 0.5, chord: 0.15, size: 1.3, flap: 0.65, rate: 7, neck: 0, bill: 0.1, leg: 0.09, fork: false, many: 1 },
  kites: { body: '#7c502e', wing: '#694126', tip: '#281a12', beak: '#d9c33c', legs: '#d9c33c', span: 0.85, chord: 0.15, size: 1.5, flap: 0.12, rate: 2, neck: 0, bill: 0.06, leg: 0.08, fork: true, many: 0.7 },
  storks: { body: '#efeee8', wing: '#e9e8e2', tip: '#17181c', beak: '#c94b2b', legs: '#b8452e', span: 1.05, chord: 0.2, size: 1.7, flap: 0.18, rate: 2.2, neck: 0.3, bill: 0.24, leg: 0.5, fork: false, many: 0.5 },
  starlings: { body: '#2a2f3c', wing: '#333848', tip: '#15171d', beak: '#d8b63a', legs: '#7a5a48', span: 0.3, chord: 0.1, size: 0.75, flap: 0.9, rate: 12, neck: 0, bill: 0.05, leg: 0.06, fork: false, many: 2.6 },
};

const painted = (geometry: THREE.BufferGeometry, colour: (x: number, y: number, z: number) => string) => {
  const position = geometry.getAttribute('position'), c = new THREE.Color();
  const colours = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) c.set(colour(position.getX(i), position.getY(i), position.getZ(i))).toArray(colours, i * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  return geometry;
};

export default defineThing({
  questions: {
    kind: choice('What kind of birds are they?', KINDS),
    size: score('How big is the flock?', ['A handful of stragglers', 'A couple of dozen', 'A proper flock', 'A sky-darkening cloud']),
    behaviour: choice('What is the flock doing?', {
      wheeling: 'Wheeling in a tall slow column above the spot, a few down on the ground.',
      mobbing: 'Mobbing: a tight low frenzy diving on the prize, birds piled on each other.',
      settled: 'Mostly settled on the ground, all facing into the wind, a few lazy circlers overhead.',
      scattering: 'Startled and bursting upward and outward in a widening funnel.',
    }),
    prize: choice('What are they fighting over?', {
      bag: 'A torn black bin bag with its insides pulled out.',
      fish: 'A crate of fish heads and offal.',
      chips: 'A dropped paper of chips, scattered everywhere.',
      bread: 'Slices of stale bread somebody threw for them.',
      pizza: 'An open pizza box with half a pizza still in it.',
      nothing: 'Nothing at all: they are only loafing and waiting.',
    }),
    perch: choice('What do they have to stand on?', {
      ground: 'Only the bare ground.',
      posts: 'A row of leaning fence posts with sagging wire, one bird to a post.',
      heap: 'A low heap of rubbish they have made their own.',
      lamp: 'A tall lamp post with birds along its arm.',
    }),
    reach: score('How high does the flock reach?', ['Skimming just overhead', 'Roof height', 'A towering column']),
    mess: noul('Is the ground under them spattered with droppings and loose feathers?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const k = SPEC[a.kind];
    const dirty = (hex: string) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#7d7466'), mood.wear * 0.3).getHexString();

    // One bird: a body with head, bill and tail, and a separate wing so it can flap.
    const parts: THREE.BufferGeometry[] = [];
    const part = (geometry: THREE.BufferGeometry, hex: string) => { parts.push(painted(geometry, () => hex)); };
    part(new THREE.SphereGeometry(1, 8, 6).scale(0.085, 0.08, 0.2), dirty(k.body));
    if (k.neck) part(new THREE.CylinderGeometry(0.025, 0.035, k.neck, 6).rotateX(1.1).translate(0, 0.05, 0.16 + k.neck * 0.45), dirty(k.body));
    const hz = 0.2 + k.neck * 0.9, hy = 0.035 + k.neck * 0.35;
    part(new THREE.SphereGeometry(0.055, 8, 6).translate(0, hy, hz), a.kind === 'kites' ? '#b89a78' : dirty(k.body));
    part(new THREE.ConeGeometry(0.02, k.bill, 5).rotateX(Math.PI / 2).translate(0, hy - 0.01, hz + 0.04 + k.bill / 2), k.beak);
    if (k.fork) for (const e of [-1, 1]) part(new THREE.BoxGeometry(0.06, 0.012, 0.2).rotateY(e * 0.3).translate(e * 0.04, 0, -0.26), dirty(k.wing));
    else part(new THREE.BoxGeometry(0.1, 0.012, 0.13).translate(0, 0, -0.24), a.kind === 'gulls' ? dirty(k.body) : dirty(k.wing));
    const bodyGeometry = mergeGeometries(parts)!;
    for (const p of parts) p.dispose();
    const wingShape = new THREE.Shape([[0, -k.chord], [k.span * 0.45, -k.chord * 1.15], [k.span * 0.8, -k.chord * 0.6], [k.span, 0.02], [k.span * 0.75, k.chord * 0.55], [k.span * 0.4, k.chord * 0.8], [0, k.chord * 0.9]].map(([x, y]) => new THREE.Vector2(x, y)));
    const wingGeometry = painted(new THREE.ShapeGeometry(wingShape).rotateX(-Math.PI / 2), (x) => (x > k.span * 0.7 ? k.tip : dirty(k.wing)));
    const legGeometry = mergeGeometries([-1, 1].map((e) => new THREE.CylinderGeometry(0.008, 0.008, 1, 4).translate(e * 0.035, -0.5, 0)))!;

    const total = Math.max(5, Math.round(mix(8, 95, a.size) * mix(0.7, 1.25, mood.density) * k.many));
    const share = { wheeling: 0.2, mobbing: 0.4, settled: 0.78, scattering: 0.06 }[a.behaviour];
    const perched = a.perch === 'posts' ? 5 : a.perch === 'lamp' ? 4 : 0;
    const landed = Math.max(a.behaviour === 'scattering' ? 1 : 3, Math.round(total * share)) + perched;
    const flying = Math.max(3, total - landed + perched);
    const count = landed + flying;

    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
    const wingMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
    const bodies = new THREE.InstancedMesh(bodyGeometry, material, count);
    const right = new THREE.InstancedMesh(wingGeometry, wingMaterial, count);
    const left = new THREE.InstancedMesh(wingGeometry, wingMaterial, count);
    const legs = new THREE.InstancedMesh(legGeometry, new THREE.MeshStandardMaterial({ color: k.legs, roughness: 0.7 }), landed);
    for (const mesh of [bodies, right, left, legs]) { mesh.castShadow = true; mesh.frustumCulled = false; s.root.add(mesh); }

    // Set dressing: what they stand on and what they want.
    const wood = s.material('#7b6a55', { roughness: 0.95 });
    const roosts: [number, number, number][] = [];
    let heapTop = 0;
    if (a.perch === 'posts') {
      const tops: [number, number, number][] = [];
      for (let i = 0; i < 5; i++) {
        const x = -3 + i * 1.5, h = 1.1 + random() * 0.3, lean = (random() - 0.5) * 0.3;
        s.rod([x, -0.2, -2.4], [x + lean, h, -2.4 + (random() - 0.5) * 0.2], 0.06, wood, 0.05);
        tops.push([x + lean, h, -2.4]);
        roosts.push([x + lean, h, -2.4]);
      }
      for (const drop of [0.25, 0.6]) s.tube(tops.flatMap((t, i) => (i ? [[(t[0] + tops[i - 1][0]) / 2, t[1] - drop - 0.12, t[2]] as const, [t[0], t[1] - drop, t[2]] as const] : [[t[0], t[1] - drop, t[2]] as const])), 0.008, s.material('#5c5b58', { metalness: 0.5 }));
    }
    if (a.perch === 'lamp') {
      const steel = s.material('#7f8a8c', { metalness: 0.4 });
      s.cylinder(0.06, 0.09, 5.2, [-2.6, 2.6, -1.8], steel, 10);
      s.rod([-2.6, 5.1, -1.8], [-0.6, 5.35, -1.8], 0.04, steel);
      s.box([0.6, 0.1, 0.24], [-0.5, 5.33, -1.8], s.material('#d8d6c8', { emissive: '#ffe9a8', emissiveIntensity: mix(0.9, 0, Math.sin(mood.daylight * Math.PI)) }));
      for (let i = 0; i < 4; i++) roosts.push([-2.3 + i * 0.42, 5.17 + i * 0.05, -1.8]);
    }
    if (a.perch === 'heap') {
      heapTop = 0.55;
      const junk = ['#2b2c30', '#e9e6dc', '#4d7fb5', '#c5a06c', '#c9483a', '#8d9296', '#d9c04a'];
      s.scatter(new THREE.DodecahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), Array.from({ length: 70 }, () => {
        const r = Math.sqrt(random()) * 2.4, t = random() * 6.28;
        return { at: [Math.cos(t) * r, (1 - r / 2.4) * heapTop * random() + 0.05, Math.sin(t) * r * 0.8] as const, size: 0.35 + random() * 0.5, color: new THREE.Color(junk[Math.floor(random() * junk.length)]).lerp(new THREE.Color('#6b5d4a'), mood.wear * 0.5) };
      }));
    }
    const P = 1.7, py = heapTop;
    if (a.prize === 'bag') {
      const bag = s.ball([0.4 * P, 0.26 * P, 0.34 * P], [0, py + 0.2 * P, 0], s.material('#1f2023', { roughness: 0.35 }), 9);
      bag.rotation.z = 0.3;
      s.ball([0.08 * P, 0.1 * P, 0.08 * P], [-0.18 * P, py + 0.5 * P, 0], s.material('#1f2023', { roughness: 0.35 }), 6);
      s.scatter(new THREE.BoxGeometry(1, 0.5, 0.8), new THREE.MeshStandardMaterial({ roughness: 0.8 }), Array.from({ length: 16 }, () => ({ at: [0.4 + random() * 1.1, py + 0.04, (random() - 0.5) * 1.2] as const, size: 0.08 + random() * 0.12, color: ['#e9e4d2', '#d2553f', '#e8c64a', '#6aa3c9', '#8a5a3a'][Math.floor(random() * 5)] })));
    }
    if (a.prize === 'fish') {
      const crate = s.material('#3f78b5');
      s.box([0.7 * P, 0.05, 0.45 * P], [0, py + 0.03, 0], crate);
      for (const e of [-1, 1]) { s.box([0.7 * P, 0.22 * P, 0.03], [0, py + 0.11 * P, e * 0.225 * P], crate); s.box([0.03, 0.22 * P, 0.45 * P], [e * 0.35 * P, py + 0.11 * P, 0], crate); }
      for (let i = 0; i < 11; i++) {
        const out = i > 7;
        const fish = s.ball([0.13 * P, 0.035 * P, 0.045 * P], [out ? 0.7 + random() * 0.8 : (random() - 0.5) * 0.5 * P, py + (out ? 0.04 : 0.17 * P + random() * 0.05), (random() - 0.5) * (out ? 1.4 : 0.3 * P)], s.material(random() < 0.5 ? '#c9d2d6' : '#e5a79c', { metalness: 0.5, roughness: 0.3 }), 7);
        fish.rotation.y = random() * 3;
      }
    }
    if (a.prize === 'chips') {
      s.cylinder(0.3 * P, 0.02, 0.34 * P, [0, py + 0.09 * P, 0], s.material('#eee8d8'), 7).rotation.set(1.35, 0, 0.4);
      const fry = s.material('#e6b63c', { roughness: 0.6 });
      for (let i = 0; i < 26; i++) {
        const t = random() * 6.28, r = 0.15 + random() * 1.3;
        s.box([0.035, 0.035, 0.2 + random() * 0.12], [Math.cos(t) * r, py + 0.02, Math.sin(t) * r], fry).rotation.y = random() * 3;
      }
    }
    if (a.prize === 'bread') {
      const crumb = s.material('#ecdcb4'), crust = s.material('#a8743c');
      for (let i = 0; i < 9; i++) {
        const t = random() * 6.28, r = random() * 1.2;
        const slice = s.box([0.22 * P, 0.03, 0.22 * P], [Math.cos(t) * r, py + 0.03 + (r < 0.3 ? i * 0.03 : 0), Math.sin(t) * r], crumb);
        slice.rotation.y = random() * 3;
        s.box([0.24 * P, 0.02, 0.24 * P], [slice.position.x, slice.position.y - 0.012, slice.position.z], crust).rotation.y = slice.rotation.y;
      }
    }
    if (a.prize === 'pizza') {
      const card = s.material('#c9a777');
      s.box([0.7 * P, 0.04, 0.7 * P], [0, py + 0.03, 0], card);
      s.box([0.7 * P, 0.7 * P, 0.03], [0, py + 0.3 * P, -0.38 * P], card).rotation.x = -0.35;
      s.mesh(new THREE.CylinderGeometry(0.3 * P, 0.3 * P, 0.03, 20, 1, false, 0, Math.PI * (0.8 + random() * 0.7)), s.material('#d9a13c'), [0, py + 0.07, 0]);
      s.mesh(new THREE.CylinderGeometry(0.26 * P, 0.26 * P, 0.035, 20, 1, false, 0.1, Math.PI * 0.7), s.material('#c4402c'), [0, py + 0.075, 0]);
      const slice = s.mesh(new THREE.CylinderGeometry(0.3 * P, 0.3 * P, 0.03, 4, 1, false, 0, 0.7), s.material('#d9a13c'), [0.8, py + 0.03, 0.5]);
      slice.rotation.y = 2;
    }
    if (a.mess) {
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.012, 7), new THREE.MeshStandardMaterial({ color: '#f1efe6', roughness: 0.9 }), Array.from({ length: Math.round(mix(25, 70, mood.wear)) }, () => {
        const t = random() * 6.28, r = Math.sqrt(random()) * 3.6;
        return { at: [Math.cos(t) * r, 0.008, Math.sin(t) * r] as const, size: 0.04 + random() * 0.09 };
      }));
      const quill = s.material(dirty(k.wing), { side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) {
        const t = random() * 6.28, r = 0.6 + random() * 2.8;
        const feather = s.ball([0.03, 0.004, 0.13], [Math.cos(t) * r, 0.012, Math.sin(t) * r], quill, 6);
        feather.rotation.y = random() * 3;
      }
    }

    // Every bird: where it stands, or the circle it flies.
    interface Bird { x: number; y: number; z: number; yaw: number; size: number; radius: number; height: number; speed: number; phase: number; swoop: number; flap: number }
    const birds: Bird[] = [];
    const wind = random() * 6.28;
    const patch = Math.min(3.4, 0.9 + Math.sqrt(landed) * 0.42) * (a.behaviour === 'mobbing' ? 0.6 : 1);
    for (let i = 0; i < landed; i++) {
      const roost = roosts[i];
      const t = random() * 6.28, r = (a.prize === 'nothing' ? 0 : 0.45) + Math.sqrt(random()) * patch;
      const x = roost ? roost[0] : Math.cos(t) * r, z = roost ? roost[2] : Math.sin(t) * r * 0.85;
      const ground = roost ? roost[1] : heapTop * Math.max(0, 1 - Math.hypot(x, z) / 2.4);
      const facing = a.behaviour === 'settled' || roost ? wind + (random() - 0.5) * 0.5 : Math.atan2(-x, -z) + (random() - 0.5) * 0.7;
      birds.push({ x, y: ground, z, yaw: facing, size: k.size * mix(0.85, 1.1, random()), radius: 0, height: 0, speed: 0, phase: random() * 6.28, swoop: 0, flap: 0 });
    }
    const top = mix(2.2, 9, a.reach) * (a.behaviour === 'mobbing' ? 0.5 : 1);
    const big = Math.min(1.5, Math.max(1, k.span * k.size * 1.25));
    for (let i = 0; i < flying; i++) {
      const u = random();
      const height = a.behaviour === 'mobbing' ? (0.7 + u * top) * big : 1.3 + u * top;
      const radius = a.behaviour === 'mobbing' ? (0.6 + random() * 2.1) * big : a.behaviour === 'scattering' ? 1 + (height / top) * 4.2 + random() * 1.2 : 1.4 + random() * 3.2;
      birds.push({ x: 0, y: 0, z: 0, yaw: 0, size: k.size * mix(0.85, 1.1, random()), radius, height,
        speed: (random() < 0.82 ? 1 : -1) * mix(0.35, 1.5, mood.energy) * (a.behaviour === 'mobbing' ? 1.8 : a.behaviour === 'settled' ? 0.6 : 1) * mix(0.7, 1.3, random()) * 2.2 / (1 + radius),
        phase: random() * 6.28, swoop: a.behaviour === 'mobbing' ? 0.3 + random() * 0.5 : 0.1 + random() * 0.15, flap: k.flap * mix(0.7, 1.2, random()) });
    }

    const m = new THREE.Matrix4(), w = new THREE.Matrix4(), fold = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const mirror = new THREE.Matrix4().makeScale(-1, 1, 1);
    const pose = (time: number, all: boolean) => {
      for (let i = all ? 0 : landed; i < count; i++) {
        const b = birds[i];
        const grounded = i < landed;
        let beat = 0;
        if (grounded) {
          const stand = k.leg * b.size;
          e.set(a.kind === 'storks' ? -0.3 : -0.12, b.yaw, 0, 'YXZ');
          m.compose(v.set(b.x, b.y + stand + 0.06 * b.size, b.z), q.setFromEuler(e), sc.setScalar(b.size));
          w.compose(v.set(b.x, b.y + stand + 0.02, b.z), q.setFromEuler(e.set(0, b.yaw, 0)), sc.set(b.size, stand + 0.02, b.size));
          legs.setMatrixAt(i, w);
        } else {
          const angle = b.phase + time * b.speed;
          const dip = Math.sin(angle * 1.7 + b.phase * 3) * b.swoop;
          const radius = b.radius * (1 + dip * 0.35);
          e.set(dip * 0.3, -angle + (b.speed < 0 ? Math.PI : 0), -Math.sign(b.speed) * mix(0.12, 0.42, Math.min(1, 1.6 / b.radius)), 'YXZ');
          m.compose(v.set(Math.cos(angle) * radius, b.height * (1 + dip * 0.5), Math.sin(angle) * radius), q.setFromEuler(e), sc.setScalar(b.size));
          beat = Math.sin(time * k.rate + b.phase * 5) * b.flap + 0.12;
        }
        bodies.setMatrixAt(i, m);
        fold.makeRotationFromEuler(grounded ? e.set(0, 1.42, -0.25) : e.set(0, 0.08, beat));
        if (grounded) fold.scale(sc.set(0.72, 1, 0.85));
        fold.setPosition(grounded ? 0.035 : 0.05, 0.04, grounded ? 0.08 : 0.02);
        right.setMatrixAt(i, w.multiplyMatrices(m, fold));
        left.setMatrixAt(i, w.multiplyMatrices(m, mirror).multiply(fold));
      }
      for (const mesh of [bodies, right, left]) mesh.instanceMatrix.needsUpdate = true;
    };
    pose(0, true);
    legs.instanceMatrix.needsUpdate = true;
    return s.finish({ footprint: 3.2, update: (_dt, time) => pose(time, false) });
  },
});
