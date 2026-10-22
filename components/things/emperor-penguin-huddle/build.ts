import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

/** One draw call per body part, however many birds there are. */
class Batch {
  private list: THREE.Matrix4[] = [];
  private mesh: THREE.InstancedMesh | null = null;
  constructor(readonly geometry: THREE.BufferGeometry, readonly material: THREE.Material) {}
  add(matrix: THREE.Matrix4) { this.list.push(matrix.clone()); return this.list.length - 1; }
  set(index: number, matrix: THREE.Matrix4) { this.list[index].copy(matrix); }
  commit(root: THREE.Object3D) {
    if (!this.list.length) { this.geometry.dispose(); return; }
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.list.length);
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.flush();
    root.add(this.mesh);
  }
  flush() {
    if (!this.mesh) return;
    this.list.forEach((matrix, index) => this.mesh!.setMatrixAt(index, matrix));
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

const pose = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));

function paint(geometry: THREE.BufferGeometry, colour: (x: number, y: number, z: number) => THREE.ColorRepresentation) {
  const position = geometry.getAttribute('position');
  const colours = new Float32Array(position.count * 3);
  const tint = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    tint.set(colour(position.getX(i), position.getY(i), position.getZ(i)));
    colours.set([tint.r, tint.g, tint.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  return geometry;
}
const blend = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), THREE.MathUtils.clamp(t, 0, 1));

interface Bird {
  x: number; z: number; yaw: number; size: number; lean: number; lying: boolean; chick: boolean;
  head: number; turn: number; phase: number; parts: { batch: Batch; index: number; local: THREE.Matrix4; headPart: boolean }[];
}

export default defineThing({
  questions: {
    size: choice('How many penguins are there?', {
      pair: 'Just two, a couple leaning together.',
      few: 'A handful, five or six.',
      huddle: 'A proper huddle of a dozen or more.',
      colony: 'A great packed mass of forty or fifty, a living raft of backs.',
    }),
    formation: choice('How are they arranged?', {
      huddle: 'Pressed tight together, all facing inward with their backs to the wind.',
      march: 'Walking in single file, a long patient line across the ice, one or two sliding on their bellies.',
      loose: 'Standing about loosely in twos and threes, like people after a meeting.',
      ring: 'A ring of adults standing guard around an open middle.',
    }),
    chicks: choice('Are there chicks?', {
      none: 'No chicks, only adults.',
      eggs: 'No chicks yet: a few adults balance a single pale egg on their feet.',
      onfeet: 'Small grey chicks riding on their parents\' feet, tucked under the belly.',
      creche: 'A fluffy grey creche of bigger chicks standing together in the middle.',
    }),
    apart: choice('Is one of them apart from the rest?', {
      none: 'No, they are all together.',
      watcher: 'One adult stands a little way off, watching the others.',
      leaver: 'One adult is walking away alone, leaving a line of footprints.',
      chick: 'One chick stands alone outside the group, calling.',
    }),
    heads: choice('What are they doing with their heads?', {
      bowed: 'Bowed and tucked, asleep on their feet, waiting it out.',
      calling: 'Beaks lifted to the sky, trumpeting.',
      looking: 'Up and alert, looking this way and that.',
    }),
    ground: choice('What are they standing on?', {
      snow: 'Clean wind-packed snow with small drifts.',
      ice: 'Hard blue sea ice with cracks.',
      stained: 'Snow trampled and stained by a long winter in one place.',
    }),
    blizzard: noul('Is snow blowing through them?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const cool = mix(0.0, 0.06, mood.warmth);

    // Shared geometry, coloured by position so each bird is one body, one head.
    const bodyProfile: [number, number][] = [[0.001, 0], [0.15, 0.015], [0.215, 0.14], [0.25, 0.38], [0.235, 0.62], [0.18, 0.83], [0.115, 0.96], [0.085, 1.02], [0.001, 1.05]];
    const body = paint(new THREE.LatheGeometry(bodyProfile.map(([r, y]) => new THREE.Vector2(r, y)), 20), (x, y, z) => {
      const r = Math.hypot(x, z) || 1;
      const front = THREE.MathUtils.smoothstep(z / r, 0.0, 0.42);
      const belly = blend('#f6f3e6', '#f3cf62', (y - 0.72) / 0.22);
      const coat = blend('#2b3340', '#f6f3e6', front);
      if (y > 0.955) return '#14171c';
      if (y > 0.7) return blend('#1d222b', belly.getStyle(), front);
      return coat.lerp(new THREE.Color('#e9e2cf'), front * (1 - y) * 0.2);
    });
    body.scale(1, 1, 0.9);
    const head = paint(new THREE.SphereGeometry(0.1, 16, 12), (x, y, z) => {
      const side = Math.abs(x) / 0.1;
      if (side > 0.55 && y < 0.035 && z < 0.06) return blend('#f6a21c', '#f8dc70', (-y) / 0.09);
      return '#14171c';
    });
    const beak = paint(new THREE.ConeGeometry(0.026, 0.15, 8).rotateX(Math.PI / 2).translate(0, 0, 0.075), (_x, y) => (y < -0.004 ? '#e08a5a' : '#23262b'));
    const flipper = new THREE.SphereGeometry(1, 10, 8).scale(0.03, 0.29, 0.085).translate(0, -0.27, 0);
    const foot = new THREE.BoxGeometry(0.085, 0.03, 0.15).translate(0, 0.015, 0.06);
    const chickBody = paint(new THREE.LatheGeometry([[0.001, 0], [0.12, 0.02], [0.155, 0.16], [0.13, 0.33], [0.075, 0.44], [0.001, 0.47]].map(([r, y]) => new THREE.Vector2(r, y)), 14), (_x, y) => blend('#9aa0a8', '#c9cdd1', y / 0.45));
    const chickHead = paint(new THREE.SphereGeometry(0.085, 14, 10), (x, y, z) => (z > 0.01 && y < 0.045 && y > -0.07 && Math.abs(x) < 0.075 ? '#f4f4f0' : '#17191d'));
    const egg = new THREE.SphereGeometry(1, 10, 8).scale(0.06, 0.08, 0.06);

    const skin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 });
    const fluff = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1b1f26', roughness: 0.7 });
    const shell = new THREE.MeshStandardMaterial({ color: '#efe9d6', roughness: 0.5 });
    const B = {
      body: new Batch(body, skin), head: new Batch(head, skin), beak: new Batch(beak, skin), flipper: new Batch(flipper, dark), foot: new Batch(foot, dark),
      chickBody: new Batch(chickBody, fluff), chickHead: new Batch(chickHead, fluff), egg: new Batch(egg, shell),
    };

    const birds: Bird[] = [];
    const headBase = { bowed: 0.75, calling: -1.05, looking: 0.05 }[a.heads];
    const adult = (x: number, z: number, yaw: number, options: Partial<Bird> = {}): Bird => {
      const bird: Bird = { x, z, yaw, size: mix(0.92, 1.08, random()), lean: 0.04, lying: false, chick: false, head: headBase + (random() - 0.5) * 0.3, turn: a.heads === 'looking' ? (random() - 0.5) * 1.5 : (random() - 0.5) * 0.3, phase: random() * 6.3, parts: [], ...options };
      const add = (batch: Batch, local: THREE.Matrix4, headPart = false) => bird.parts.push({ batch, index: batch.add(local), local, headPart });
      add(B.body, pose(0, 0, 0));
      add(B.head, pose(0, 1.065, 0.012), true);
      add(B.beak, pose(0, 1.06, 0.085, -0.12), true);
      for (const side of [-1, 1]) {
        add(B.flipper, pose(side * 0.2, 0.86, 0.0, bird.lying ? 0.5 : 0, 0, side * (bird.lying ? 0.9 : 0.16 + random() * 0.12)));
        add(B.foot, pose(side * 0.085, 0, 0.06, 0, side * -0.25));
      }
      birds.push(bird);
      return bird;
    };
    const chick = (x: number, z: number, yaw: number, size: number, options: Partial<Bird> = {}) => {
      const bird: Bird = { x, z, yaw, size, lean: 0, lying: false, chick: true, head: (random() - 0.5) * 0.4, turn: (random() - 0.5) * 1.2, phase: random() * 6.3, parts: [], ...options };
      const add = (batch: Batch, local: THREE.Matrix4, headPart = false) => bird.parts.push({ batch, index: batch.add(local), local, headPart });
      add(B.chickBody, pose(0, 0, 0));
      add(B.chickHead, pose(0, 0.49, 0.015), true);
      add(B.beak, pose(0, 0.48, 0.075, 0, 0, 0, 0.55), true);
      birds.push(bird);
      return bird;
    };

    const want = Math.round({ pair: 2, few: 5.5, huddle: 14, colony: 40 }[a.size] * (a.size === 'pair' ? 1 : mix(0.8, 1.3, mood.density)));
    const spots: [number, number, number][] = []; // x, z, yaw
    let hollow = 0;
    if (a.formation === 'huddle') {
      const gap = a.chicks === 'creche' ? 0.6 : 0;
      hollow = gap;
      for (let i = 0; i < want; i++) {
        const r = gap + 0.34 * Math.sqrt(i + 0.6) * (want <= 2 ? 0.75 : 1), angle = i * 2.39996 + random() * 0.2;
        spots.push([Math.cos(angle) * r, Math.sin(angle) * r, Math.atan2(-Math.cos(angle), -Math.sin(angle)) + (random() - 0.5) * 0.5]);
      }
    } else if (a.formation === 'ring') {
      let placed = 0, ring = 0;
      hollow = Math.max(0.75, want * 0.5 / 6.28);
      while (placed < want) {
        const r = hollow + ring * 0.5, fit = Math.max(2, Math.min(want - placed, Math.floor(6.28 * r / 0.5)));
        for (let i = 0; i < fit; i++) {
          const angle = (i + ring * 0.5 + random() * 0.25) / fit * 6.283;
          spots.push([Math.cos(angle) * r, Math.sin(angle) * r, Math.atan2(-Math.cos(angle), -Math.sin(angle)) + (random() - 0.5) * 0.3]);
        }
        placed += fit; ring++;
      }
    } else if (a.formation === 'march') {
      const step = 0.62, bends = 1 + want / 14, length = want * step, amp = Math.min(1.6, length * 0.14);
      for (let i = 0; i < want; i++) {
        const t = i / Math.max(1, want - 1) - 0.5;
        const x = t * length * 0.82 + (random() - 0.5) * 0.12, z = Math.sin(t * bends * 3.1) * amp + (random() - 0.5) * 0.15;
        const slope = Math.cos(t * bends * 3.1) * amp * bends * 3.1 / (length * 0.82);
        spots.push([x, z, Math.atan2(1, slope)]);
      }
    } else {
      let guard = 0;
      const spread = 0.5 + Math.sqrt(want) * 0.55;
      while (spots.length < want && guard++ < 400) {
        const angle = random() * 6.283, r = Math.sqrt(random()) * spread;
        const cx = Math.cos(angle) * r, cz = Math.sin(angle) * r, group = Math.min(want - spots.length, 1 + Math.floor(random() * 3));
        if (spots.some(([x, z]) => Math.hypot(x - cx, z - cz) < 0.95)) continue;
        for (let i = 0; i < group; i++) {
          const around = i / group * 6.283 + random(), d = group === 1 ? 0 : 0.3;
          spots.push([cx + Math.cos(around) * d, cz + Math.sin(around) * d, group === 1 ? random() * 6.283 : Math.atan2(-Math.cos(around), -Math.sin(around)) + (random() - 0.5) * 0.6]);
        }
      }
    }

    const marching = a.formation === 'march';
    spots.forEach(([x, z, yaw], index) => {
      const lying = marching && want > 3 && (index % 6 === 4 || random() < 0.08);
      const bird = adult(x, z, yaw, { lying, lean: marching ? 0.14 : a.formation === 'huddle' ? 0.08 : 0.03 });
      if (lying) return;
      const brood = a.chicks === 'onfeet' ? random() < 0.6 || index === 0 : a.chicks === 'eggs' ? random() < 0.45 || index === 0 : false;
      if (!brood) return;
      const fx = x + Math.sin(yaw) * 0.2 * bird.size, fz = z + Math.cos(yaw) * 0.2 * bird.size;
      if (a.chicks === 'onfeet') chick(fx, fz, yaw + (random() - 0.5) * 0.8, mix(0.5, 0.72, random()), { lean: 0.045 });
      else B.egg.add(pose(fx - Math.sin(yaw) * 0.04, 0.085, fz - Math.cos(yaw) * 0.04, 0.3, yaw));
    });
    if (a.chicks === 'creche') {
      const crowd = Math.max(3, Math.round(want * 0.45));
      for (let i = 0; i < crowd; i++) {
        const r = marching ? 0 : Math.min(Math.max(hollow - 0.25, 0.3), 0.26 * Math.sqrt(i + 0.3)), angle = i * 2.39996;
        if (marching) {
          const [tx, tz, tyaw] = spots[Math.min(spots.length - 1, Math.floor((i + 0.5) / crowd * spots.length))];
          chick(tx + Math.cos(tyaw) * 0.42, tz - Math.sin(tyaw) * 0.42, tyaw, mix(0.95, 1.3, random()));
        } else if (a.formation === 'loose') {
          const [tx, tz] = spots[Math.floor(random() * spots.length)];
          const around = random() * 6.283;
          chick(tx + Math.cos(around) * 0.42, tz + Math.sin(around) * 0.42, random() * 6.283, mix(0.95, 1.3, random()));
        } else chick(Math.cos(angle) * r, Math.sin(angle) * r, random() * 6.283, mix(0.95, 1.35, random()));
      }
    }

    let reach = Math.max(0.6, ...birds.map((bird) => Math.hypot(bird.x, bird.z)));
    const prints: { at: [number, number, number]; size: number }[] = [];
    if (a.apart !== 'none') {
      const angle = marching ? Math.PI / 2 : 0.5 + random() * 0.8, far = (marching ? 1.6 : reach) + (a.apart === "leaver" ? 1.5 : 0.95);
      const ox = Math.cos(angle) * far * (marching ? 0.4 : 1), oz = Math.sin(angle) * far;
      if (a.apart === 'chick') chick(ox, oz, Math.atan2(-ox, -oz), 1.2, { head: -0.9, turn: 0 });
      else if (a.apart === 'watcher') adult(ox, oz, Math.atan2(-ox, -oz) + 0.3, { head: 0.05, turn: -0.3, lean: 0 });
      else {
        const away = Math.atan2(ox, oz);
        adult(ox, oz, away, { head: 0.2, turn: 0, lean: 0.16 });
        for (let i = 1; i < 12; i++) {
          const back = i * 0.17, side = (i % 2 ? 1 : -1) * 0.075;
          prints.push({ at: [ox - Math.sin(away) * back + Math.cos(away) * side, 0.012, oz - Math.cos(away) * back - Math.sin(away) * side], size: 1 });
        }
      }
      reach = Math.max(reach, Math.hypot(ox, oz));
    }

    // Ground: a low irregular floe they stand on.
    const groundColour = { snow: '#eef3f8', ice: '#b9d8ea', stained: '#e3e2d8' }[a.ground];
    const snow = s.material(new THREE.Color(groundColour).offsetHSL(cool, 0, 0), { roughness: a.ground === 'ice' ? 0.25 : 0.95, flatShading: true });
    const spreadX = Math.max(0.5, ...birds.map((bird) => Math.abs(bird.x))) + 0.5, spreadZ = Math.max(0.5, ...birds.map((bird) => Math.abs(bird.z))) + 0.5;
    const shape = new THREE.Shape();
    const corners = 13;
    for (let i = 0; i < corners; i++) {
      const angle = i / corners * 6.283, wobble = 0.88 + random() * 0.2;
      const px = Math.cos(angle) * spreadX * wobble * 1.04, pz = Math.sin(angle) * spreadZ * wobble * 1.04;
      if (i === 0) shape.moveTo(px, pz); else shape.lineTo(px, pz);
    }
    const slab = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.05, bevelSegments: 1 }).rotateX(Math.PI / 2), snow, [0, -0.05, 0]);
    slab.castShadow = false;
    if (a.ground === 'ice') {
      const crack = new THREE.MeshStandardMaterial({ color: '#4d7f9c', roughness: 0.4 });
      for (let i = 0; i < 6; i++) {
        const from: [number, number, number] = [(random() - 0.5) * spreadX * 1.5, 0.004, (random() - 0.5) * spreadZ * 1.5];
        const bearing = random() * 6.283, run = 0.6 + random() * 1.4;
        s.rod(from, [from[0] + Math.cos(bearing) * run, 0.004, from[2] + Math.sin(bearing) * run], 0.012, crack).castShadow = false;
      }
    } else {
      const drift = s.material(new THREE.Color('#f7fafc').offsetHSL(cool, 0, 0), { roughness: 1 });
      for (let i = 0; i < 5; i++) {
        const angle = random() * 6.283;
        const lump = s.ball([0.35 + random() * 0.5, 0.05 + random() * 0.05, 0.2 + random() * 0.25], [Math.cos(angle) * spreadX * 0.85, 0, Math.sin(angle) * spreadZ * 0.85], drift, 10);
        lump.rotation.y = 0.4;
      }
      if (a.ground === 'stained') {
        const stain = new THREE.MeshStandardMaterial({ color: '#b9a98a', roughness: 1, transparent: true, opacity: 0.75, depthWrite: false });
        for (let i = 0; i < 16; i++) {
          const bird = birds[Math.floor(random() * birds.length)];
          const patch = s.mesh(new THREE.CircleGeometry(0.12 + random() * 0.3, 9).rotateX(-Math.PI / 2), stain, [bird.x + (random() - 0.5) * 0.6, 0.006 + i * 0.0004, bird.z + (random() - 0.5) * 0.6]);
          patch.castShadow = false;
        }
      }
    }
    if (prints.length) s.scatter(new THREE.BoxGeometry(0.07, 0.012, 0.11), new THREE.MeshStandardMaterial({ color: '#8fa6b8', roughness: 1 }), prints).castShadow = false;

    const wind = mood.energy;
    if (a.blizzard) {
      // Drift banked against the windward (-x) side of each bird, and streaks in the air.
      const bank = s.material('#fbfdff', { roughness: 1 });
      s.scatter(new THREE.SphereGeometry(1, 8, 6).scale(0.26, 0.09, 0.2), bank, birds.filter((bird) => !bird.chick).map((bird) => ({ at: [bird.x - 0.2, 0, bird.z] as [number, number, number], size: bird.size * mix(0.8, 1.2, random()) })));
      const streak = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, depthWrite: false });
      const flakes = s.scatter(new THREE.BoxGeometry(0.5, 0.012, 0.012), streak, Array.from({ length: Math.round(mix(60, 160, wind)) }, () => ({ at: [(random() - 0.5) * spreadX * 2.3, 0.05 + random() ** 1.6 * 1.5, (random() - 0.5) * spreadZ * 2.3] as [number, number, number], size: 0.5 + random() }))); 
      flakes.castShadow = flakes.receiveShadow = false;
    }

    const matrix = new THREE.Matrix4(), headTurn = new THREE.Matrix4();
    const settle = (time: number) => {
      for (const bird of birds) {
        const sway = Math.sin(time * mix(0.8, 3.2, mood.energy) + bird.phase) * mix(0.015, 0.07, mood.energy) * (marching ? 1.8 : 1);
        const base = bird.lying
          ? pose(bird.x, 0.2 * bird.size, bird.z, 1.45, bird.yaw, sway, bird.size)
          : pose(bird.x, 0, bird.z, bird.lean, bird.yaw, sway, bird.size);
        const neck = bird.chick ? 0.44 : 0.99;
        headTurn.copy(pose(0, neck, 0)).multiply(pose(0, 0, 0, bird.lying ? -1.1 : bird.head + Math.sin(time * 0.7 + bird.phase) * 0.06 * mood.energy, bird.turn)).multiply(pose(0, -neck, 0));
        for (const part of bird.parts) {
          matrix.copy(base);
          if (part.headPart) matrix.multiply(headTurn);
          part.batch.set(part.index, matrix.multiply(part.local));
        }
      }
      for (const batch of Object.values(B)) batch.flush();
    };
    settle(0);
    for (const batch of Object.values(B)) batch.commit(s.root);

    const thing = s.finish({ update: (_dt, time) => settle(time) });
    return { ...thing, dispose: () => { thing.dispose(); skin.dispose(); fluff.dispose(); dark.dispose(); shell.dispose(); } };
  },
});
