import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const GRAINS = {
  wheat: 'Hard red wheat, warm harvest gold.',
  barley: 'Barley, pale straw with a dusty bloom.',
  corn: 'Shelled corn, loud yellow-orange.',
  canola: 'Canola seed, a slick near-black heap that flows like water.',
  flax: 'Flax, glossy chestnut brown.',
  oats: 'Oats, light cream and chaffy.',
} as const;
const GRAIN_TINT: Record<keyof typeof GRAINS, string> = {
  wheat: '#d6a23a', barley: '#dcc588', corn: '#efae22', canola: '#33302c', flax: '#8b5a2f', oats: '#e9ddb6',
};
const PAINTS = {
  red: 'Implement red with white wheel rims.',
  green: 'Farm-equipment green with yellow wheels.',
  yellow: 'Bright safety yellow.',
  blue: 'Faded sky blue.',
  orange: 'Burnt orange, a 1970s dealer colour.',
  galvanised: 'Unpainted galvanised steel, dull silver.',
} as const;
const PAINT_TINT: Record<keyof typeof PAINTS, [string, string]> = {
  red: ['#b5281f', '#ebe6d8'], green: ['#2f6b34', '#e8c52f'], yellow: ['#e2b21d', '#2b2b2b'], blue: ['#5d8fb5', '#e6e2d6'], orange: ['#c7631f', '#e6e2d6'], galvanised: ['#a9b0b2', '#b5281f'],
};
type P = readonly [number, number, number];

export default defineThing({
  questions: {
    state: choice('What is the auger doing right now?', {
      running: 'Running flat out, a steady stream of grain pouring from the spout.',
      idle: 'Set up and waiting, silent, the pile already made.',
      transport: 'Cranked down low for towing, nothing flowing.',
      abandoned: 'Left where it last ran years ago, one tyre flat, grass grown through it.',
    }),
    grain: choice('What grain is it moving?', GRAINS),
    paint: choice('What colour is it painted?', PAINTS),
    length: score('How long is the tube?', ['A short yard auger', 'A standard farm auger', 'A very long reach for tall bins']),
    pile: score('How big is the cone of grain under the spout?', ['A few spilled handfuls', 'A knee-high heap', 'A cone as tall as a person', 'A small mountain']),
    drive: choice('What powers it?', {
      engine: 'A small petrol engine slung under the tube with a belt and a fuel can.',
      electric: 'An electric motor at the top with a cable trailing down.',
      pto: 'A yellow-guarded PTO shaft sticking out for a tractor that is not there.',
    }),
    nest: choice('What has moved into the hopper?', {
      nothing: 'Nothing: it is clean and in use.',
      birds: 'Sparrows: a straw nest in the hopper and birds along the tube.',
      cat: 'A farm cat sitting on the hopper rim.',
      tumbleweed: 'A tumbleweed blown in and wedged there.',
      kittens: 'A litter of kittens curled up in the hopper.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const abandoned = a.state === 'abandoned';
    const wear = Math.min(1, mood.wear + (abandoned ? 0.35 : 0));
    const [bodyTint, rimTint] = PAINT_TINT[a.paint];
    const rust = new THREE.Color('#7a4a2c');
    const paint = s.material(new THREE.Color(bodyTint).lerp(rust, wear * 0.5), { metalness: a.paint === 'galvanised' ? 0.6 : 0.2, roughness: 0.5 });
    const rim = s.material(new THREE.Color(rimTint).lerp(rust, wear * 0.4));
    const steel = s.material(new THREE.Color('#8e9496').lerp(rust, wear * 0.6), { metalness: 0.6, roughness: 0.45 });
    const rubber = s.material('#25262a', { roughness: 0.95 });
    const grainTint = new THREE.Color(GRAIN_TINT[a.grain]);
    const grain = new THREE.MeshStandardMaterial({ color: grainTint, roughness: a.grain === 'canola' || a.grain === 'flax' ? 0.45 : 0.95, emissive: grainTint, emissiveIntensity: mix(0.02, 0.14, mood.cheer) });

    const len = mix(9, 17, a.length) + random();
    const angle = a.state === 'transport' ? 0.17 : mix(0.46, 0.6, random());
    const R = 0.21;
    const dir = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
    const up = new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0);
    const A = new THREE.Vector3(0, 0.5, 0);
    const at = (t: number, lift = 0, z = 0): P => [A.x + dir.x * len * t + up.x * lift, A.y + dir.y * len * t + up.y * lift, z];

    // Tube, with the intake cage open at the foot.
    s.rod(at(0.07), at(1), R, paint);
    for (const t of [0.07, 0.35, 0.65, 1]) s.rod(at(t - 0.006), at(t + 0.006), R + 0.035, steel);
    for (let i = 0; i < 4; i++) {
      const ang = i * Math.PI / 2 + 0.4;
      const off = up.clone().multiplyScalar(Math.cos(ang) * R);
      s.rod([at(-0.01)[0] + off.x, at(-0.01)[1] + off.y, Math.sin(ang) * R], [at(0.07)[0] + off.x, at(0.07)[1] + off.y, Math.sin(ang) * R], 0.018, steel);
    }
    const flightHolder = new THREE.Group();
    flightHolder.position.set(...at(-0.01));
    flightHolder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const helix: THREE.Vector3[] = [];
    const exposed = len * 0.085;
    for (let i = 0; i <= 40; i++) helix.push(new THREE.Vector3(Math.cos(i * 0.7) * R * 0.8, (i / 40) * exposed, Math.sin(i * 0.7) * R * 0.8));
    const flight = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 80, 0.03, 5), s.material('#c9482f', { metalness: 0.3 }));
    flight.castShadow = true;
    flightHolder.add(flight);
    s.root.add(flightHolder);

    // Hopper: an open four-sided funnel on the ground.
    const hop = s.mesh(new THREE.CylinderGeometry(1.05, 0.42, 0.62, 4, 1, true), new THREE.MeshStandardMaterial({ color: paint.color, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide }), [0.15, 0.4, 0]);
    hop.rotation.y = Math.PI / 4;
    for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) s.box([x ? 0.05 : 1.5, 0.06, z ? 0.05 : 1.5], [0.15 + x * 0.74, 0.71, z * 0.74], steel);
    // Hitch tongue.
    s.rod([-0.5, 0.35, 0], [-1.7, 0.42, 0], 0.045, steel);
    s.ring(0.09, 0.025, [-1.78, 0.42, 0], steel).rotation.x = Math.PI / 2;

    // Undercarriage: axle, wheels and the two long A-frames.
    const track = 1.25;
    const ax = dir.x * len * (a.state === 'transport' ? 0.5 : 0.47);
    const flat = abandoned ? (random() > 0.5 ? 1 : -1) : 0;
    s.rod([ax, 0.45, -track], [ax, 0.45, track], 0.05, steel);
    for (const z of [-1, 1]) {
      const squash = flat === z ? 0.72 : 1;
      const tyre = s.mesh(new THREE.TorusGeometry(0.34, 0.17, 10, 24), rubber, [ax, 0.51 * squash, z * (track + 0.1)]);
      tyre.scale.y = squash;
      const hub = s.cylinder(0.2, 0.2, 0.16, [ax, 0.51 * squash, z * (track + 0.1)], rim, 16);
      hub.rotation.x = Math.PI / 2;
      s.rod([ax, 0.45, z * track], at(0.74, -R, z * 0.12), 0.04, paint);
      s.rod([ax, 0.45, z * track], at(0.2, -R, z * 0.12), 0.04, paint);
    }
    // Winch and the truss cable over king posts that keeps a long tube from sagging.
    s.box([0.22, 0.2, 0.3], at(0.2, -R - 0.14), steel);
    const posts = [0.3, 0.52, 0.74];
    const heights = [0.5, 0.8, 0.5];
    let last = at(0.1, R);
    posts.forEach((t, index) => {
      const topPoint = at(t, R + heights[index]);
      s.rod(at(t, R), topPoint, 0.025, steel);
      s.rod(last, topPoint, 0.014, steel);
      last = topPoint;
    });
    s.rod(last, at(0.96, R), 0.014, steel);

    // Head: drive housing and the downspout.
    const head = at(1);
    s.box([0.4, 0.4, 0.42], [head[0], head[1], 0], steel).rotation.z = angle;
    const spoutTop: P = [head[0] - 0.1, head[1] - 0.1, 0];
    const spoutEnd: P = [head[0] + 0.05, head[1] - 0.95, 0];
    s.rod(spoutTop, spoutEnd, 0.17, paint, 0.14);

    if (a.drive === 'engine') {
      const e = at(0.36, -R - 0.42);
      s.box([0.62, 0.45, 0.5], e, s.material('#3b4045', { metalness: 0.4 }));
      s.cylinder(0.14, 0.14, 0.3, [e[0], e[1] + 0.34, e[2]], s.material('#b5281f'), 12);
      s.rod([e[0] + 0.2, e[1] + 0.2, 0.2], [e[0] + 0.25, e[1] + 0.75, 0.2], 0.03, steel);
      const pulley = s.cylinder(0.18, 0.18, 0.05, [e[0], e[1], 0.3], steel, 16);
      pulley.rotation.x = Math.PI / 2;
      s.rod([e[0], e[1], 0.3], at(0.36, 0, 0.3), 0.02, rubber);
      s.box([0.26, 0.36, 0.18], [0.9, 0.18, 1.1 + random() * 0.4], s.material('#b5281f')).rotation.y = random();
    } else if (a.drive === 'electric') {
      const m = s.cylinder(0.17, 0.17, 0.5, [head[0] - 0.05, head[1] + 0.34, 0], s.material('#3c6a8a', { metalness: 0.4 }), 14);
      m.rotation.x = Math.PI / 2;
      const cable: P[] = [];
      for (let i = 0; i <= 8; i++) { const p = at(1 - i * 0.1, -R - 0.05 - Math.sin(i / 8 * Math.PI) * 0.25, 0.14); cable.push(p); }
      cable.push([cable[8][0] - 0.2, 0.05, 0.9], [cable[8][0] - 1.4, 0.03, 1.6 + random()]);
      s.tube(cable, 0.022, s.material('#e07b1c'));
    } else {
      s.box([0.34, 0.3, 0.34], [0.6, 0.55, 0.75], steel);
      s.rod([0.6, 0.55, 0.9], [0.5, 0.5, 2.5], 0.07, s.material('#e6c21f'));
      s.rod([0.5, 0.5, 2.5], [0.49, 0.5, 2.75], 0.035, steel);
      s.rod([0.5, 0, 2.3], [0.5, 0.5, 2.3], 0.025, steel);
    }

    // Grain: spilled round the hopper, and the cone under the spout.
    const heap = (radius: number, height: number, x: number, z: number) =>
      s.lathe([[radius, 0], [radius * 0.86, height * 0.1], [radius * 0.5, height * 0.52], [radius * 0.2, height * 0.86], [radius * 0.06, height * 0.98], [0, height]], grain, [x, 0, z]);
    if (!abandoned || a.pile > 0.5) heap(1.5 + random() * 0.5, 0.42, 0.25 + random() * 0.2, (random() - 0.5) * 0.3).scale.z = 1.2;
    s.cylinder(0.36, 0.4, 0.06, [0.15, a.state === 'transport' || abandoned ? 0.16 : 0.52, 0], grain, 4).rotation.y = Math.PI / 4;
    const coneR = mix(0.5, 3.4, a.pile) * (abandoned ? 0.6 : 1);
    const coneH = coneR * 0.62;
    const showCone = a.state !== 'transport';
    if (showCone) heap(coneR, coneH, spoutEnd[0], 0);
    const drops: THREE.InstancedMesh[] = [];
    const fall = Math.max(0.3, spoutEnd[1] - coneH);
    if (a.state === 'running') {
      s.rod([spoutEnd[0], spoutEnd[1], 0], [spoutEnd[0], coneH * 0.9, 0], 0.09, grain, 0.16);
      const count = 46;
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 4), grain, count);
      mesh.castShadow = true;
      s.root.add(mesh);
      drops.push(mesh);
      // Dust hangs where the stream lands.
      const dust = new THREE.MeshStandardMaterial({ color: grainTint.clone().lerp(new THREE.Color('#efe6cf'), 0.6), transparent: true, opacity: 0.16, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 5; i++) s.ball([0.7 + random() * 0.7, 0.4 + random() * 0.4, 0.7 + random() * 0.7], [spoutEnd[0] + (random() - 0.5) * 1.4, coneH + 0.2 + random() * 0.9, (random() - 0.5) * 1.4], dust, 10).castShadow = false;
    }
    const offsets = Array.from({ length: 46 }, () => [random(), (random() - 0.5) * 0.3, (random() - 0.5) * 0.3, 0.6 + random()]);

    // Squatters.
    const fur = s.material(random() > 0.5 ? '#d08a3c' : '#4a4640');
    const cat = (x: number, y: number, z: number, size: number, sitting: boolean) => {
      s.ball([0.16 * size, (sitting ? 0.22 : 0.12) * size, 0.2 * size], [x, y + (sitting ? 0.2 : 0.1) * size, z], fur, 10);
      s.ball([0.11 * size, 0.1 * size, 0.11 * size], [x, y + (sitting ? 0.46 : 0.2) * size, z + 0.12 * size], fur, 10);
      for (const side of [-1, 1]) s.mesh(new THREE.ConeGeometry(0.04 * size, 0.09 * size, 4), fur, [x + side * 0.06 * size, y + (sitting ? 0.58 : 0.31) * size, z + 0.12 * size]);
      if (sitting) s.tube([[x, y + 0.05, z - 0.18 * size], [x + 0.2 * size, y + 0.04, z - 0.22 * size], [x + 0.32 * size, y + 0.12, z - 0.05 * size]], 0.025 * size, fur);
    };
    if (a.nest === 'cat') cat(0.15, 0.72, 0.76, 1.5, true);
    if (a.nest === 'kittens') for (let i = 0; i < 4; i++) cat(0.15 + (random() - 0.5) * 0.7, 0.5, (random() - 0.5) * 0.7, 1, false);
    if (a.nest === 'birds') {
      s.ring(0.3, 0.13, [0.25, 0.62, 0.1], s.material('#b59a58')).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) s.ball([0.07, 0.09, 0.07], [0.25 + (i - 1) * 0.11, 0.66, 0.1 + (i % 2) * 0.1], s.material('#dfe9e6'), 8);
      const birds = Array.from({ length: 5 + Math.floor(random() * 5) }, () => ({ at: at(0.25 + random() * 0.72, R + 0.09), size: 1, color: '#6b5642' }));
      s.scatter(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.9 }), birds).scale.set(1, 1, 1);
    }
    if (a.nest === 'tumbleweed') {
      const weed = s.material('#a58b56');
      for (let i = 0; i < 9; i++) s.ring(0.5, 0.018, [0.15, 0.95, 0], weed).rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    }
    if (abandoned || wear > 0.75) {
      const blades = Array.from({ length: 150 }, () => { const size = 0.4 + random() * 0.9; return { at: [-1.5 + random() * (dir.x * len + 2), 0.5 * size, (random() - 0.5) * 3.6] as const, size, color: random() > 0.4 ? '#b9a865' : '#8f8a50' }; });
      s.scatter(new THREE.ConeGeometry(0.07, 1.1, 4), new THREE.MeshStandardMaterial({ roughness: 1 }), blades);
    }

    const matrix = new THREE.Matrix4();
    const speed = mix(0.5, 2.2, mood.energy);
    const place = (time: number) => {
      for (const mesh of drops) {
        offsets.forEach(([phase, dx, dz, rate], index) => {
          const t = (phase + time * speed * rate * 0.5) % 1;
          const spread = 1 + t * 1.6;
          matrix.makeTranslation(spoutEnd[0] + dx * spread, spoutEnd[1] - t * t * fall, dz * spread);
          mesh.setMatrixAt(index, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }
    };
    place(0);
    const turning = a.state === 'running';
    return s.finish({ update: (dt, time) => { if (turning) { flight.rotation.y -= dt * speed * 6; place(time); } } });
  },
});
