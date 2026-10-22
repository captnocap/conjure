import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V = [number, number, number];

function tint(geometry: THREE.BufferGeometry, colour: string) {
  const c = new THREE.Color(colour);
  const count = geometry.attributes.position.count;
  const data = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) data.set([c.r, c.g, c.b], i * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(data, 3));
  return geometry;
}
/** A tapered stick from one point to another. */
function stick(from: V, to: V, r0: number, r1: number, colour: string, sides = 8) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const g = new THREE.CylinderGeometry(r1, r0, dir.length(), sides);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
  g.translate(...(a.add(b).multiplyScalar(0.5).toArray() as V));
  return tint(g, colour);
}
function blob(at: V, size: V, colour: string) {
  const g = new THREE.SphereGeometry(1, 10, 7);
  g.scale(...size);
  g.translate(...at);
  return tint(g, colour);
}

const COSTUMES = {
  none: 'Nothing, just the birds.',
  'santa-hats': 'Little red Santa hats, left up since December.',
  sunglasses: 'Black sunglasses, too cool for the lawn.',
  beads: 'Mardi Gras beads in purple, green and gold round their necks.',
  'party-hats': 'Pointed birthday party hats.',
} as const;

function bird(pose: 'up' | 'down', costume: keyof typeof COSTUMES) {
  const pink = '#ffffff', deep = '#d9d9d9'; // multiplied by the per-bird colour
  const neck: V[] = pose === 'up'
    ? [[0, 0.54, 0.13], [0, 0.6, 0.23], [0, 0.71, 0.21], [0, 0.79, 0.14], [0, 0.87, 0.16], [0, 0.885, 0.215]]
    : [[0, 0.54, 0.13], [0, 0.57, 0.25], [0, 0.47, 0.33], [0, 0.31, 0.34], [0, 0.2, 0.3]];
  const head: V = pose === 'up' ? [0, 0.88, 0.235] : [0, 0.175, 0.295];
  const beakMid: V = pose === 'up' ? [0, 0.86, 0.3] : [0, 0.12, 0.31];
  const beakTip: V = pose === 'up' ? [0, 0.815, 0.325] : [0, 0.075, 0.275];
  const parts: THREE.BufferGeometry[] = [
    blob([0, 0.52, 0], [0.085, 0.08, 0.17], pink),
    blob([0, 0.555, -0.03], [0.092, 0.05, 0.12], deep),
    stick([0, 0.53, -0.12], [0, 0.6, -0.27], 0.05, 0.004, pink),
    tint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(neck.map((p) => new THREE.Vector3(...p))), 12, 0.02, 6), pink),
    blob(head, [0.034, 0.034, 0.04], pink),
    stick(head, beakMid, 0.024, 0.018, '#fff4c0'),
    stick(beakMid, beakTip, 0.018, 0.003, '#1c1a1a'),
    stick([0.03, 0.47, 0], [0.036, -0.12, 0.005], 0.005, 0.005, '#4b4b4b', 5),
    stick([-0.03, 0.47, 0], [-0.036, -0.12, -0.005], 0.005, 0.005, '#4b4b4b', 5),
    blob([head[0] + 0.03, head[1] + 0.008, head[2] + 0.012], [0.008, 0.008, 0.008], '#111111'),
    blob([head[0] - 0.03, head[1] + 0.008, head[2] + 0.012], [0.008, 0.008, 0.008], '#111111'),
  ];
  const extras: THREE.BufferGeometry[] = [];
  const top: V = [head[0], head[1] + 0.03, head[2] - 0.005];
  if (costume === 'santa-hats') {
    extras.push(stick(top, [top[0] + 0.03, top[1] + 0.11, top[2] - 0.03], 0.04, 0.006, '#c8242a'));
    extras.push(blob([top[0] + 0.03, top[1] + 0.115, top[2] - 0.03], [0.018, 0.018, 0.018], '#f5f2ea'));
    const brim = new THREE.TorusGeometry(0.036, 0.012, 6, 14);
    brim.rotateX(Math.PI / 2);
    brim.translate(...top);
    extras.push(tint(brim, '#f5f2ea'));
  } else if (costume === 'party-hats') {
    extras.push(stick(top, [top[0], top[1] + 0.13, top[2] - 0.01], 0.036, 0.003, '#ffd23f'));
    extras.push(blob([top[0], top[1] + 0.135, top[2] - 0.01], [0.014, 0.014, 0.014], '#2aa6e0'));
  } else if (costume === 'sunglasses') {
    const bar = new THREE.BoxGeometry(0.09, 0.024, 0.02);
    bar.translate(head[0], head[1] + 0.01, head[2] + 0.028);
    extras.push(tint(bar, '#111111'));
  } else if (costume === 'beads') {
    ['#7b2fa8', '#2f9a4b', '#e8b92f'].forEach((colour, index) => {
      const loop = new THREE.TorusGeometry(0.045 + index * 0.012, 0.007, 5, 16);
      loop.rotateX(Math.PI / 2 - 0.5);
      loop.translate(0, 0.585 - index * 0.012, 0.19 + index * 0.012);
      extras.push(tint(loop, colour));
    });
  }
  return { body: mergeGeometries(parts)!, extras: extras.length ? mergeGeometries(extras)! : null };
}

export default defineThing({
  questions: {
    centre: choice('What do the flamingos stand around?', {
      'tyre-planter': 'An old tyre painted and turned into a flower planter.',
      'gazing-ball': 'A mirrored gazing ball on a concrete pedestal.',
      birdbath: 'A concrete birdbath.',
      nothing: 'Nothing: the birds are the whole display.',
    }),
    flock: score('How many flamingos are there?', ['A lone pair', 'A family of five', 'A dozen', 'The whole lawn has been flocked']),
    arrangement: choice('How are they arranged, and what has happened to them?', {
      ring: 'A proud ring facing outward, tended and straightened every week.',
      parade: 'Marching in a single-file line across the yard.',
      huddle: 'Bunched together facing each other like gossiping neighbours.',
      'storm-toppled': 'Scattered and knocked flat by last night\'s wind, a few still standing.',
      'last-one': 'Most are gone or fallen; one stubborn bird still stands upright.',
    }),
    plastic: choice('What colour is the plastic?', {
      'hot-pink': 'Classic hot flamingo pink.',
      coral: 'Soft coral orange-pink.',
      magenta: 'Loud neon magenta.',
      'odd-one-out': 'All pink, except one black flamingo in the middle of them.',
    }),
    pose: choice('How do they hold their necks?', {
      'heads-up': 'All heads up, alert S-curved necks.',
      feeding: 'All heads down, beaks to the grass.',
      mixed: 'A mix of heads-up and feeding birds.',
    }),
    costume: choice('Are the flamingos dressed up?', COSTUMES),
    paint: choice('If there is a tyre planter, what colour is it painted?', {
      white: 'Whitewashed.',
      turquoise: 'Swimming-pool turquoise.',
      yellow: 'Sunflower yellow.',
      pink: 'Pink to match the birds.',
      bare: 'Unpainted black rubber.',
    }),
    planting: choice('If there is a planter, what grows in it?', {
      petunias: 'Purple and pink petunias spilling over the rim.',
      marigolds: 'A tight mound of orange marigolds.',
      'plastic-flowers': 'Plastic daisies that never need watering.',
      weeds: 'Dry stalks and weeds; whoever planted it has stopped.',
    }),
    sign: choice('Is there a little yard sign among them?', {
      none: 'No sign.',
      welcome: 'A hand-painted WELCOME.',
      flocked: 'A prank sign: YOU\'VE BEEN FLOCKED!',
      'keep-off': 'KEEP OFF THE GRASS.',
      'for-sale': 'FOR SALE.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const bleach = mood.wear * mood.wear;
    const base = new THREE.Color({ 'hot-pink': '#ff4f93', coral: '#ff7a6b', magenta: '#f0229c', 'odd-one-out': '#ff4f93' }[a.plastic]);
    const hasCentre = a.centre !== 'nothing';
    const count = Math.max(2, Math.round(mix(2, 18, Math.pow(a.flock, 1.4)) + (mood.density - 0.5) * 3));
    const inner = hasCentre ? 0.62 : 0.2;

    // Where each bird stands, which way it faces, and whether it has fallen.
    const birds: { x: number; z: number; yaw: number; fallen: boolean; lean: number; pose: 'up' | 'down'; colour: THREE.Color; phase: number }[] = [];
    for (let i = 0; i < count; i++) {
      let x = 0, z = 0, yaw = 0;
      const ringSize = Math.min(count - Math.floor(i / 9) * 9, 9), ringIndex = Math.floor(i / 9);
      const angle = (i % 9) / ringSize * Math.PI * 2 + ringIndex * 0.35 + (random() - 0.5) * 0.25;
      const radius = inner + 0.1 + ringIndex * 0.36 + random() * 0.12;
      if (a.arrangement === 'parade') {
        const t = i - (count - 1) / 2;
        x = t * 0.36 + (random() - 0.5) * 0.06;
        z = (hasCentre ? 0.85 : 0) + Math.sin(i * 0.9) * 0.1 + (count > 12 ? ((i % 2) - 0.5) * 0.5 : 0);
        if (count > 12) x *= 0.55;
        yaw = Math.PI / 2 + (random() - 0.5) * 0.25;
      } else if (a.arrangement === 'huddle') {
        x = Math.sin(angle) * radius * 0.85; z = Math.cos(angle) * radius * 0.85;
        yaw = angle + Math.PI + (random() - 0.5) * 0.5;
      } else if (a.arrangement === 'ring') {
        x = Math.sin(angle) * radius; z = Math.cos(angle) * radius;
        yaw = angle + (random() - 0.5) * 0.2;
      } else {
        const r = inner + 0.15 + Math.sqrt(random()) * Math.sqrt(count) * 0.19, th = random() * Math.PI * 2;
        x = Math.sin(th) * r; z = Math.cos(th) * r;
        yaw = random() * Math.PI * 2;
      }
      const fallen = a.arrangement === 'storm-toppled' ? random() < 0.65 : a.arrangement === 'last-one' ? i > 0 : random() < bleach * 0.2;
      const pose = a.pose === 'mixed' ? (random() < 0.4 ? 'down' : 'up') : a.pose === 'feeding' ? 'down' : 'up';
      const colour = base.clone().lerp(new THREE.Color('#f3d9d2'), bleach * (0.55 + random() * 0.4)).offsetHSL((random() - 0.5) * 0.02, 0, (random() - 0.5) * 0.05);
      if (a.plastic === 'odd-one-out' && i === Math.min(count - 1, 1)) colour.set('#2a2630');
      birds.push({ x, z, yaw, fallen, lean: (random() - 0.5) * (0.12 + mood.wear * 0.5), pose, colour, phase: random() * 6.28 });
    }
    if (a.arrangement === 'last-one') { birds[0].fallen = false; birds[0].lean = 0.03; birds[0].pose = 'up'; }

    const plastic = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.32, 0.75, mood.wear) });
    const matrixFor = (b: (typeof birds)[number], wobble: number) => {
      const e = b.fallen ? new THREE.Euler(0.12, b.yaw, Math.PI / 2 * (b.lean > 0 ? 1 : -1) * 0.97, 'YXZ') : new THREE.Euler(wobble * 0.6, b.yaw, b.lean + wobble, 'YXZ');
      return new THREE.Matrix4().compose(new THREE.Vector3(b.x, b.fallen ? 0.085 : 0, b.z), new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(1, 1, 1));
    };
    const groups: { members: typeof birds; meshes: THREE.InstancedMesh[] }[] = [];
    for (const pose of ['up', 'down'] as const) {
      const members = birds.filter((b) => b.pose === pose);
      if (!members.length) continue;
      const { body, extras } = bird(pose, a.costume);
      const meshes = [new THREE.InstancedMesh(body, plastic, members.length)];
      if (extras) meshes.push(new THREE.InstancedMesh(extras, plastic, members.length));
      members.forEach((b, index) => {
        const m = matrixFor(b, 0);
        meshes.forEach((mesh, which) => { mesh.setMatrixAt(index, m); mesh.setColorAt(index, which === 0 ? b.colour : new THREE.Color('#ffffff')); });
      });
      for (const mesh of meshes) { mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false; s.root.add(mesh); }
      groups.push({ members, meshes });
    }

    if (a.centre === 'tyre-planter') {
      const paintColour = { white: '#f0ede2', turquoise: '#2fb5b0', yellow: '#f2c230', pink: '#f77fae', bare: '#2b2b2c' }[a.paint];
      const rubber = s.material(paintColour, { roughness: a.paint === 'bare' ? 0.9 : 0.55 });
      const tyre = s.ring(0.3, 0.115, [0, 0.115, 0], rubber);
      tyre.rotation.x = Math.PI / 2;
      // Tread blocks, where the paint has worn back to rubber.
      const treads = Array.from({ length: 28 }, (_u, i) => ({ at: [Math.cos(i / 28 * 6.283) * 0.412, 0.115, Math.sin(i / 28 * 6.283) * 0.412] as V, size: 1 }));
      s.scatter(new THREE.BoxGeometry(0.03, 0.14, 0.03), s.material(mood.wear > 0.45 || a.paint === 'bare' ? '#2b2b2c' : paintColour), treads);
      // The scalloped crown cut from the sidewall.
      for (let i = 0; i < 12; i++) {
        const angle = i / 12 * Math.PI * 2;
        const petal = s.mesh(new THREE.ConeGeometry(0.075, 0.2, 4), rubber, [Math.cos(angle) * 0.3, 0.27, Math.sin(angle) * 0.3]);
        petal.scale.z = 0.35;
        petal.rotation.set(0, -angle + Math.PI / 2, 0);
        petal.rotateX(0.5);
      }
      s.cylinder(0.25, 0.25, 0.2, [0, 0.11, 0], s.material('#4a3a2c', { roughness: 1 }), 20);
      const blooms: { at: V; size: number; color: string }[] = [], leaves: { at: V; size: number; color: string }[] = [];
      const palette = { petunias: ['#8a3fc2', '#e85aa8', '#f4f1f8'], marigolds: ['#f28a1e', '#f5b32a', '#e8601c'], 'plastic-flowers': ['#ffffff', '#ffe04a', '#ff5a5a', '#4a9aff'], weeds: ['#b9a66a', '#8f8457'] }[a.planting];
      const n = a.planting === 'weeds' ? 16 : Math.round(mix(26, 60, mood.density));
      for (let i = 0; i < n; i++) {
        const r = Math.sqrt(random()) * (a.planting === 'petunias' ? 0.36 : 0.24), th = random() * 6.283;
        const y = a.planting === 'weeds' ? 0.3 + random() * 0.4 : 0.26 + (1 - r / 0.36) * 0.16 + random() * 0.05 - (r > 0.26 ? (r - 0.26) * 1.4 : 0);
        blooms.push({ at: [Math.cos(th) * r, y, Math.sin(th) * r], size: a.planting === 'weeds' ? 0.4 : 0.8 + random() * 0.6, color: palette[Math.floor(random() * palette.length)] });
        leaves.push({ at: [Math.cos(th) * r * 0.9, y - 0.04, Math.sin(th) * r * 0.9], size: 1 + random(), color: a.planting === 'weeds' ? '#8f8a52' : random() < 0.5 ? '#3f8a3a' : '#57a04a' });
      }
      if (a.planting === 'weeds') for (const b of blooms) s.rod([b.at[0] * 0.6, 0.2, b.at[2] * 0.6], b.at, 0.004, s.material('#9a8f5a'));
      s.scatter(new THREE.IcosahedronGeometry(0.04, 0), s.material('#ffffff', { roughness: 0.6 }), blooms);
      s.scatter(new THREE.IcosahedronGeometry(0.045, 0), s.material('#ffffff', { roughness: 0.9 }), leaves);
    } else if (a.centre === 'gazing-ball') {
      const stone = s.material('#b9b4a6', { roughness: 0.95 });
      s.lathe([[0, 0], [0.2, 0], [0.2, 0.05], [0.12, 0.09], [0.07, 0.2], [0.06, 0.45], [0.1, 0.56], [0.13, 0.6], [0.09, 0.62], [0, 0.62]], stone);
      const ballColour = mood.cheer > 0.66 ? '#c94fd0' : mood.cheer > 0.33 ? '#3f6fe0' : '#c9ccd2';
      s.ball([0.16, 0.16, 0.16], [0, 0.76, 0], new THREE.MeshStandardMaterial({ color: ballColour, metalness: 1, roughness: mix(0.05, 0.35, mood.wear), emissive: ballColour, emissiveIntensity: 0.12 }), 28);
    } else if (a.centre === 'birdbath') {
      const stone = s.material('#bdb8aa', { roughness: 0.95, side: THREE.DoubleSide });
      s.lathe([[0, 0], [0.22, 0], [0.22, 0.05], [0.1, 0.1], [0.07, 0.3], [0.08, 0.58], [0.14, 0.64], [0.4, 0.74], [0.42, 0.78], [0.38, 0.77], [0.12, 0.68], [0, 0.68]], stone);
      if (mood.wear < 0.75) s.cylinder(0.33, 0.33, 0.01, [0, 0.745, 0], s.material(mood.wear > 0.4 ? '#7fa07a' : '#8fd0e8', { roughness: 0.1, metalness: 0.2 }), 28);
      else s.scatter(new THREE.IcosahedronGeometry(0.03, 0), s.material('#8a6a3a'), Array.from({ length: 9 }, () => ({ at: [(random() - 0.5) * 0.4, 0.72, (random() - 0.5) * 0.4] as V, size: 0.6 + random() })));
    }

    if (a.sign !== 'none') {
      const text = { welcome: 'WELCOME', flocked: "YOU'VE BEEN FLOCKED!", 'keep-off': 'KEEP OFF THE GRASS', 'for-sale': 'FOR SALE' }[a.sign];
      const sx = hasCentre ? 0.95 : 0.55, sz = 0.75;
      const tilt = (random() - 0.5) * (0.1 + mood.wear * 0.5);
      const post = new Sculpture(context);
      post.box([0.03, 0.55, 0.02], [0, 0.2, -0.012], post.material('#c9b48a'));
      post.box([0.5, 0.26, 0.012], [0, 0.48, -0.004], post.material(a.sign === 'for-sale' ? '#c8242a' : '#f3ecd6'));
      post.label(text, 0.48, 0.24, [0, 0.48, 0.004], a.sign === 'for-sale' ? '#ffffff' : a.sign === 'flocked' ? '#e0237f' : '#2c2a26', a.sign === 'for-sale' ? '#c8242a' : '#f3ecd6');
      post.root.position.set(sx, 0, sz);
      post.root.rotation.set(0, -0.35, tilt);
      s.root.add(post.root);
    }

    // Grass tufts around the wire legs.
    const lawn = new THREE.Color(mix(0.3, 0.2, mood.wear) > 0.25 ? '#5f9a45' : '#9a9a52');
    const tufts = birds.flatMap((b) => Array.from({ length: 3 }, () => ({ at: [b.x + (random() - 0.5) * 0.2, 0.03, b.z + (random() - 0.5) * 0.2] as V, size: 0.6 + random() * 0.9, color: lawn.clone().offsetHSL(0, 0, (random() - 0.5) * 0.12).getStyle() })));
    s.scatter(new THREE.ConeGeometry(0.03, 0.07, 4), s.material('#ffffff', { roughness: 1 }), tufts);

    const sway = mix(0.004, 0.07, mood.energy);
    const thing = s.finish({
      update: (_dt, time) => {
        for (const { members, meshes } of groups) {
          members.forEach((b, index) => {
            if (b.fallen) return;
            const m = matrixFor(b, Math.sin(time * 2.3 + b.phase) * sway);
            for (const mesh of meshes) mesh.setMatrixAt(index, m);
          });
          for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
        }
      },
    });
    return thing;
  },
});
