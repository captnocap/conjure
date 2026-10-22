import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';
import { blob, hazePaint, hull, limb, makeNoise, rimPaint, softBall, tint, vec } from './cosmos';

const HUES = {
  ice: 'Blue-white, the colour of a welding arc.',
  sapphire: 'Deep saturated sapphire blue.',
  violet: 'Ultraviolet purple, almost beyond seeing.',
  cyan: 'Electric cyan, cold and synthetic.',
} as const;
// Deep surface tone, bright surface tone, corona.
const HUE: Record<keyof typeof HUES, [string, string, string]> = {
  ice: ['#3f86ff', '#f2f8ff', '#5a9dff'],
  sapphire: ['#1f55e0', '#bcd6ff', '#3f7bff'],
  violet: ['#7a4dff', '#ead9ff', '#9a6bff'],
  cyan: ['#1fb8e8', '#e2fbff', '#3fd2f2'],
};

const gauss = (t: number, centre: number, width: number) => Math.exp(-(((t - centre) / width) ** 2));

export default defineThing({
  questions: {
    company: choice('Is it alone?', {
      alone: 'Alone: one enormous star.',
      pair: 'A tight pair: a giant and a smaller partner almost touching it.',
      trio: 'A tight trio huddled together, like the heart of a cluster.',
    }),
    hue: choice('What colour is its light?', HUES),
    glare: choice('How does its glare show?', {
      four: 'Four long diffraction spikes in a clean cross.',
      six: 'Six spikes, a snowflake of light.',
      soft: 'No spikes: a huge soft halo.',
      ragged: 'A ragged burst of many uneven rays.',
    }),
    wind: score('How violent is its wind?', ['A calm steady shine', 'A stiff breeze of streamers', 'A howling gale tearing off its surface']),
    surroundings: choice('What is it doing to its surroundings?', {
      cavity: 'It has carved a crater: a ring wall of dark dust stands back from it, lit on the inside.',
      fingers: 'It is eroding the cloud into small fingers that all point at it accusingly.',
      bubble: 'It has blown a thin glassy bubble around itself.',
      scoured: 'It has swept everything away: only streaks and a few crumbs remain.',
    }),
    stage: choice('Where is it in its short life?', {
      prime: 'In its prime: taut, steady and merciless.',
      swollen: 'Swollen and unstable, puffing off shell after shell.',
      erupting: 'Erupting: two fat lobes of ejected gas balloon out from its poles.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const noise = makeNoise(context.seed);
    const [deepHex, brightHex, coronaHex] = HUE[a.hue];
    const deep = new THREE.Color(deepHex), bright = new THREE.Color(brightHex), corona = new THREE.Color(coronaHex);
    const wind = clamp01(a.wind * 0.85 + mood.energy * 0.15);
    const R = a.stage === 'swollen' ? 1.1 : 0.9;
    const reach = 3.3;
    const wobble = (amount: number) => (random() - 0.5) * amount;
    const shade = new THREE.Color();

    const members = {
      alone: [{ at: vec(0, 0, 0), r: R }],
      pair: [{ at: vec(-0.45 * R, 0, 0), r: R * 0.88 }, { at: vec(0.95 * R, 0.25 * R, 0.3 * R), r: R * 0.48 }],
      trio: [{ at: vec(-0.7 * R, -0.2 * R, 0.1), r: R * 0.68 }, { at: vec(0.72 * R, -0.1 * R, -0.15), r: R * 0.56 }, { at: vec(0.05, 0.75 * R, 0.25), r: R * 0.44 }],
    }[a.company];

    const pulsers: THREE.Object3D[] = [];
    const streamPaint = hazePaint(corona, 0.34);
    const streamSets: { mesh: THREE.InstancedMesh; rays: { dir: THREE.Vector3; length: number; phase: number; width: number }[]; r: number }[] = [];
    const up = vec(0, 1, 0), turn = new THREE.Quaternion(), matrix = new THREE.Matrix4(), scale = new THREE.Vector3(), origin = new THREE.Vector3();
    for (const [index, member] of members.entries()) {
      const node = new THREE.Group();
      node.position.copy(member.at);
      s.root.add(node);
      const geometry = new THREE.SphereGeometry(member.r, 48, 32);
      const offset = random() * 20;
      tint(geometry, (p) => {
        const grain = noise(p.x * 3.2 / member.r + offset, p.y * 3.2 / member.r, p.z * 3.2 / member.r, 4) * 0.5 + 0.5;
        return shade.copy(deep).lerp(bright, clamp01(grain * 1.5 - 0.15) ** 1.4 * mix(0.75, 1, mood.cheer));
      });
      const body = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true }));
      body.castShadow = true;
      node.add(body, softBall(member.r * 1.22, corona, 0.75, 1.6), softBall(member.r * mix(1.9, 2.5, wind) * (a.glare === 'soft' ? 1.5 : 1), corona, a.glare === 'soft' ? 0.6 : 0.42, 2.4));
      pulsers.push(node);

      // Corona streamers: one instanced set per star, lengthening with the wind.
      const count = Math.round(mix(14, 64, wind));
      const cone = new THREE.ConeGeometry(1, 1, 6, 1, true);
      cone.translate(0, 0.5, 0);
      const mesh = new THREE.InstancedMesh(cone, streamPaint, count);
      const rays = Array.from({ length: count }, () => ({
        dir: vec(wobble(2), wobble(2), wobble(2)).normalize(),
        length: member.r * mix(0.5, 1.2, random()) * mix(0.7, 2.1, wind),
        phase: random() * 6.28,
        width: member.r * mix(0.05, 0.13, random()),
      }));
      node.add(mesh);
      streamSets.push({ mesh, rays, r: member.r });

      // Diffraction spikes lie in the plane facing the viewer.
      const spikePaint = new THREE.MeshBasicMaterial({ color: corona.clone().lerp(bright, 0.15) });
      const angles = a.glare === 'four' ? [0, Math.PI / 2] : a.glare === 'six' ? [Math.PI / 2, Math.PI / 6, -Math.PI / 6] : a.glare === 'ragged' ? Array.from({ length: 7 }, () => random() * Math.PI) : [];
      for (const angle of angles) {
        const long = member.r * (index === 0 ? 3.6 : 2.4) * (a.glare === 'ragged' ? mix(0.45, 1.1, random()) : angle === 0 && a.glare === 'four' ? 0.8 : 1);
        const spike = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), spikePaint);
        spike.scale.set(long, member.r * 0.11, member.r * 0.11);
        spike.rotation.z = angle + (a.glare === 'ragged' ? 0 : 0.12);
        node.add(spike);
      }
    }
    if (a.company !== 'alone') {
      // Gas bridges between close companions.
      for (let i = 1; i < members.length; i++) {
        const bridge = limb([members[0].at, members[0].at.clone().lerp(members[i].at, 0.5).add(vec(0, 0.12, 0.1)), members[i].at], { rings: 16, sides: 8, radius: (t) => members[i].r * (0.3 + 0.25 * (2 * t - 1) ** 2) });
        s.root.add(new THREE.Mesh(bridge, hazePaint(bright, 0.45)));
      }
    }

    if (a.stage === 'swollen') {
      const count = 2 + Math.floor(random() * 2);
      for (let i = 0; i < count; i++) {
        const radius = R * (1.55 + i * 0.5);
        const shell = softBall(radius, corona, 0.6, 2.5, true);
        const band = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.022, 6, 72), new THREE.MeshBasicMaterial({ color: corona.clone().lerp(bright, 0.3) }));
        band.rotation.set(Math.PI / 2 + wobble(0.7), wobble(0.7), 0);
        s.root.add(shell, band);
      }
    }
    if (a.stage === 'erupting') {
      // Prominences: arches and tongues of surface torn loose, heaviest on one side.
      const flarePaint = new THREE.MeshBasicMaterial({ color: corona.clone().lerp(bright, 0.3) });
      const veilPaint = hazePaint(corona, 0.3);
      const bias = vec(wobble(1), 0.6, 0.5).normalize();
      const count = 4 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const from = vec(wobble(2), wobble(2), wobble(2)).normalize().lerp(bias, 0.45).normalize();
        const swing = vec(wobble(2), wobble(2), wobble(2)).cross(from).normalize();
        const tongue = i === 0 || random() < 0.35;
        const to = from.clone().applyAxisAngle(swing, tongue ? 0.25 : mix(0.7, 1.2, random()));
        const height = R * (tongue ? mix(2.2, 3, random()) : mix(1.5, 2, random()));
        const points = tongue
          ? [from.clone().multiplyScalar(R * 0.9), from.clone().lerp(to, 0.5).normalize().multiplyScalar(height * 0.7), to.clone().multiplyScalar(height)]
          : [from.clone().multiplyScalar(R * 0.9), from.clone().lerp(to, 0.25).normalize().multiplyScalar(height * 0.92), from.clone().lerp(to, 0.5).normalize().multiplyScalar(height), from.clone().lerp(to, 0.75).normalize().multiplyScalar(height * 0.92), to.clone().multiplyScalar(R * 0.9)];
        const girth = R * mix(0.07, 0.13, random());
        const shape = (t: number) => (tongue ? girth * 1.6 * (1 - t) ** 0.7 + 0.01 : girth * (0.7 + 0.6 * Math.sin(Math.PI * t)));
        s.root.add(new THREE.Mesh(limb(points, { rings: 28, sides: 8, radius: shape, rough: (p) => 1 + 0.3 * noise(p.x * 4, p.y * 4, p.z * 4, 2) }), flarePaint));
        s.root.add(new THREE.Mesh(limb(points, { rings: 28, sides: 8, radius: (t) => shape(t) * 2.4 }), veilPaint));
      }
    }

    // What it has done to the cloud around it.
    const dustLow = new THREE.Color('#0d0c1c').lerp(new THREE.Color('#1c0d08'), mood.warmth);
    const dustHigh = new THREE.Color('#2b2d52').lerp(new THREE.Color('#54301c'), mood.warmth);
    const dust = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    const rim = rimPaint(corona.clone().lerp(bright, 0.35));
    const haze = hazePaint(corona, 0.14, THREE.BackSide);
    const centre = vec(0, 0, 0);
    const toStar = new THREE.Vector3();
    const dress = (geometry: THREE.BufferGeometry, width: number) => {
      tint(geometry, (p, n) => shade.copy(dustLow).lerp(dustHigh, clamp01(0.45 + 0.5 * noise(p.x * 1.3, p.y * 1.3, p.z * 1.3, 3))).lerp(corona, 0.3 * Math.max(0, n.dot(toStar.copy(centre).sub(p).normalize())) ** 2));
      const body = new THREE.Mesh(geometry, dust);
      body.castShadow = body.receiveShadow = true;
      // Only the faces turned toward the star carry a thick bright rim.
      const lit = (p: THREE.Vector3, n: THREE.Vector3) => Math.max(0, n.dot(toStar.copy(centre).sub(p).normalize()));
      s.root.add(body, new THREE.Mesh(hull(geometry, (p, n) => width * (0.3 + 1.6 * lit(p, n))), rim), new THREE.Mesh(hull(geometry, (p, n) => width * (1.2 + 4 * lit(p, n))), haze));
    };
    const floor = -R * 1.9;
    if (a.surroundings === 'cavity') {
      const count = 9 + Math.floor(random() * 3 + mood.density * 3);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + wobble(0.3);
        // The wall dips at the front so the star stays in view.
        const front = Math.max(0, Math.cos(angle - Math.PI / 2 + 0.6)) ** 2;
        const size = mix(0.75, 1.15, random()) * mix(1, 0.6, front);
        const geometry = blob(size, (d) => 1 + 0.3 * noise(d.x * 1.9 + i * 4, d.y * 1.9, d.z * 1.9, 4), 9);
        geometry.scale(1, mix(1.5, 2.1, random()) * mix(1, 0.55, front), 1);
        geometry.translate(Math.cos(angle) * reach * mix(0.95, 1.1, random()), floor + size * 0.5, Math.sin(angle) * reach * mix(0.95, 1.1, random()));
        geometry.computeVertexNormals();
        dress(geometry, 0.07);
      }
    } else if (a.surroundings === 'fingers') {
      const count = 5 + Math.floor(random() * 2 + mood.density * 2);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + wobble(0.5);
        const out = vec(Math.cos(angle), 0, Math.sin(angle));
        const foot = out.clone().multiplyScalar(reach * mix(1, 1.15, random())).setY(floor);
        const tip = out.clone().multiplyScalar(reach * mix(0.5, 0.66, random())).setY(floor + mix(1.2, 2.4, random()));
        const girth = mix(0.3, 0.46, random());
        const geometry = limb([foot, foot.clone().lerp(tip, 0.45).add(vec(0, 0.35, 0)), tip], {
          rings: 30, sides: 16,
          radius: (t) => girth * (mix(1.5, 0.6, t) + 0.3 * gauss(t, 0.84, 0.09)) * (t > 0.92 ? Math.sqrt(Math.max(0, 1 - ((t - 0.92) / 0.08) ** 2)) : 1),
          rough: (p) => 1 + 0.26 * noise(p.x * 2.4 + i * 3, p.y * 2, p.z * 2.4, 4),
        });
        dress(geometry, 0.05);
      }
    } else if (a.surroundings === 'bubble') {
      const radius = reach * 0.92;
      s.root.add(softBall(radius, corona, 0.85, 2.2, true), softBall(radius * 0.93, bright, 0.35, 5, true));
      // A few beads of swept-up gas ride on the skin of the bubble.
      const film = new THREE.MeshBasicMaterial({ color: corona.clone().lerp(bright, 0.3) });
      for (let i = 0; i < 9 + Math.floor(mood.density * 8); i++) {
        const bead = new THREE.Mesh(new THREE.SphereGeometry(mix(0.03, 0.08, random()), 8, 6), film);
        bead.position.copy(vec(wobble(2), wobble(2), wobble(2)).normalize().multiplyScalar(radius));
        s.root.add(bead);
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const angle = random() * Math.PI * 2;
        const geometry = blob(mix(0.12, 0.26, random()), (d) => 1 + 0.35 * noise(d.x * 2 + i, d.y * 2, d.z * 2, 2), 5);
        geometry.translate(Math.cos(angle) * reach * mix(0.9, 1.15, random()), floor + 0.1 + random() * 0.4, Math.sin(angle) * reach * mix(0.9, 1.15, random()));
        dress(geometry, 0.03);
      }
    }

    // The wind itself: streaks flying outward and reborn at the surface.
    const streakCount = Math.round(mix(0, 90, wind) * (a.surroundings === 'scoured' ? 1.5 : 1));
    const streakGeometry = new THREE.BoxGeometry(0.014, 1, 0.014);
    const streaks = new THREE.InstancedMesh(streakGeometry, hazePaint(deep.clone().lerp(corona, 0.5), 0.7), Math.max(1, streakCount));
    streaks.count = streakCount;
    const flights = Array.from({ length: streakCount }, () => ({ dir: vec(wobble(2), wobble(1.3), wobble(2)).normalize(), u: random(), length: mix(0.25, 0.7, random()) }));
    s.root.add(streaks);

    const settle = (time: number) => {
      for (const set of streamSets) {
        for (const [i, ray] of set.rays.entries()) {
          turn.setFromUnitVectors(up, ray.dir);
          const breathe = 1 + 0.22 * Math.sin(time * 1.7 + ray.phase);
          scale.set(ray.width, ray.length * breathe, ray.width);
          matrix.compose(origin.copy(ray.dir).multiplyScalar(set.r * 0.85), turn, scale);
          set.mesh.setMatrixAt(i, matrix);
        }
        set.mesh.instanceMatrix.needsUpdate = true;
      }
      for (const [i, flight] of flights.entries()) {
        const distance = mix(R * 1.5, reach * 1.05, flight.u);
        turn.setFromUnitVectors(up, flight.dir);
        scale.set(1, flight.length * Math.sin(Math.PI * flight.u) + 0.01, 1);
        matrix.compose(origin.copy(flight.dir).multiplyScalar(distance), turn, scale);
        streaks.setMatrixAt(i, matrix);
      }
      streaks.instanceMatrix.needsUpdate = true;
    };
    settle(0);

    const pace = mix(0.4, 2.4, mood.energy);
    let clock = 0;
    return s.finish({
      footprint: a.surroundings === 'cavity' || a.surroundings === 'fingers' ? reach * 1.1 : R * 2,
      update: (dt, time) => {
        clock += dt * pace;
        for (const flight of flights) flight.u = (flight.u + dt * pace * mix(0.08, 0.4, wind)) % 1;
        settle(clock);
        const swell = a.stage === 'swollen' ? 0.06 : 0.02;
        for (const [i, node] of pulsers.entries()) node.scale.setScalar(1 + swell * Math.sin(time * pace * 1.3 + i * 2));
      },
    });
  },
});
