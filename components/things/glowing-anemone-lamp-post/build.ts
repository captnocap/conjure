import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const COLOURS = {
  pink: 'Hot cartoon pink.',
  orange: 'Warm tangerine orange.',
  green: 'Acid sea-green.',
  violet: 'Deep violet.',
  blue: 'Cool electric blue.',
  yellow: 'Buttery yellow, like an old street lamp.',
} as const;
const GLOW: Record<keyof typeof COLOURS, { body: string; tip: string }> = {
  pink: { body: '#f0568f', tip: '#ffc2dc' },
  orange: { body: '#f07a2a', tip: '#ffd59a' },
  green: { body: '#4bc96a', tip: '#c9ffd0' },
  violet: { body: '#8c4fd9', tip: '#dcc4ff' },
  blue: { body: '#3f8fe8', tip: '#c2e3ff' },
  yellow: { body: '#e8c53a', tip: '#fff2b8' },
};

export default defineThing({
  questions: {
    colour: choice('What colour is the anemone?', COLOURS),
    post: choice('What is the post made of?', {
      iron: 'A fluted cast-iron street lamp post, Victorian and black.',
      coral: 'A knobbly branch of pink coral grown into a post.',
      kelp: 'A living kelp stalk with a few small blades, slightly curved.',
    }),
    heads: choice('How many anemone heads does it carry?', {
      one: 'A single head on top.',
      two: 'Two heads on arms, left and right.',
      three: 'Three heads on a crown of arms.',
    }),
    height: score('How tall is the post?', ['A garden lantern', 'An ordinary street lamp', 'A tall boulevard lamp']),
    tentacles: choice('What are the tentacles doing?', {
      open: 'Fully open and waving, brightly lit.',
      half: 'Half open, a soft glow.',
      closed: 'Drawn into a tight bud, the lamp off.',
    }),
    fish: noul('Is a small fish circling the light?'),
    foot: choice('What is at the foot of the post?', {
      bare: 'Bare sand.',
      plate: 'A street-name plate bolted to the post.',
      shells: 'A ring of shells planted around the base.',
      bucket: 'A tin bucket somebody left there.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(2, 4.2, a.height);
    const glow = GLOW[a.colour];
    const openness = { open: 1, half: 0.55, closed: 0 }[a.tentacles];
    const intensity = openness === 0 ? 0.08 : mix(0.6, 1.6, mood.daylight) * mix(0.7, 1.1, mood.cheer) * openness;

    // The post.
    const topOf = H;
    const iron = s.material('#2b2d30', { metalness: 0.5, roughness: 0.5 });
    const coral = s.material('#e8866f', { roughness: 0.85 });
    const kelpPaint = s.material('#6f9c3a', { roughness: 0.7 });
    let topAt: [number, number, number] = [0, topOf, 0];
    if (a.post === 'iron') {
      s.lathe([[0, 0], [0.24, 0], [0.24, 0.06], [0.16, 0.1], [0.14, 0.4], [0.1, 0.48], [0.06, 0.55], [0.06, H - 0.3], [0.09, H - 0.26], [0.09, H - 0.2], [0.06, H - 0.16], [0.06, H], [0, H]], iron);
      for (let i = 0; i < 8; i++) {
        const angle = i / 8 * Math.PI * 2;
        s.box([0.03, 0.3, 0.03], [Math.sin(angle) * 0.14, 0.25, Math.cos(angle) * 0.14], iron);
      }
    }
    if (a.post === 'coral') {
      const profile: [number, number][] = [[0, 0]];
      for (let i = 0; i <= 18; i++) {
        const y = i / 18 * H;
        profile.push([0.09 + 0.05 * Math.sin(i * 1.7) + (i === 0 ? 0.12 : 0) + (i === 18 ? -0.02 : 0), y]);
      }
      profile.push([0, H]);
      s.lathe(profile, coral);
      for (let i = 0; i < 12; i++) {
        const y = 0.2 + random() * (H - 0.4);
        const angle = random() * Math.PI * 2;
        const size = 0.04 + random() * 0.05;
        s.ball([size, size * 0.8, size], [Math.sin(angle) * 0.12, y, Math.cos(angle) * 0.12], coral, 8);
      }
      s.rod([0, H * 0.45, 0], [0.42, H * 0.65, 0.1], 0.045, coral, 0.025);
      s.rod([0, H * 0.3, 0], [-0.3, H * 0.42, -0.2], 0.04, coral, 0.02);
    }
    if (a.post === 'kelp') {
      const path: [number, number, number][] = [];
      const lean = (random() - 0.5) * 0.5;
      for (let i = 0; i <= 8; i++) {
        const f = i / 8;
        path.push([Math.sin(f * 3.2) * 0.12 + lean * f * f, f * H, Math.cos(f * 2.6) * 0.1]);
      }
      s.tube(path, 0.07, kelpPaint);
      s.lathe([[0, 0], [0.3, 0], [0.22, 0.08], [0.1, 0.12], [0, 0.12]], s.material('#4e6b2d'));
      const blade = s.material('#86b547', { roughness: 0.6, side: THREE.DoubleSide });
      for (let i = 0; i < 6; i++) {
        const p = path[2 + Math.floor(random() * 5)];
        const leaf = s.ball([0.22, 0.06, 0.012], [p[0] + (i % 2 ? 0.2 : -0.2), p[1] + 0.1, p[2]], blade, 10);
        leaf.rotation.z = (i % 2 ? -0.35 : 0.35) + (random() - 0.5) * 0.3;
        leaf.rotation.y = random() * Math.PI;
      }
      const last = path[8];
      topAt = [last[0], last[1], last[2]];
    }

    // Arms and heads.
    const count = { one: 1, two: 2, three: 3 }[a.heads];
    const armPaint = a.post === 'iron' ? iron : a.post === 'coral' ? coral : kelpPaint;
    const headScale = mix(0.85, 1.25, a.height);
    const heads: [number, number, number][] = [];
    if (count === 1) heads.push([topAt[0], topAt[1], topAt[2]]);
    else {
      const reach = 0.55 * headScale;
      for (let i = 0; i < count; i++) {
        const angle = count === 2 ? (i ? Math.PI / 2 : -Math.PI / 2) : i / 3 * Math.PI * 2 + Math.PI / 2;
        const tip: [number, number, number] = [topAt[0] + Math.sin(angle) * reach, topAt[1] - 0.05, topAt[2] + Math.cos(angle) * reach];
        s.tube([[topAt[0], topAt[1] - 0.35, topAt[2]], [topAt[0] + Math.sin(angle) * reach * 0.5, topAt[1] - 0.2, topAt[2] + Math.cos(angle) * reach * 0.5], tip], 0.035, armPaint);
        heads.push(tip);
      }
      s.ball([0.1, 0.1, 0.1], [topAt[0], topAt[1] - 0.02, topAt[2]], armPaint, 10);
    }

    const bodyPaint = new THREE.MeshStandardMaterial({ color: glow.body, emissive: glow.body, emissiveIntensity: intensity * 0.45, roughness: 0.5 });
    const tentaclePaint = new THREE.MeshStandardMaterial({ color: glow.body, emissive: glow.body, emissiveIntensity: intensity * 0.7, roughness: 0.5 });
    const tipPaint = new THREE.MeshStandardMaterial({ color: glow.tip, emissive: glow.tip, emissiveIntensity: intensity * 1.6, roughness: 0.3 });
    const tentacleGeometry = new THREE.CylinderGeometry(0.012, 0.03, 1, 6);
    tentacleGeometry.translate(0, 0.5, 0);
    const bulbGeometry = new THREE.SphereGeometry(0.035, 8, 6);
    interface Tentacle { az: number; r: number; tilt: number; length: number; phase: number; wob: number }
    const headSets: { origin: THREE.Vector3; mesh: THREE.InstancedMesh; bulbs: THREE.InstancedMesh; tentacles: Tentacle[] }[] = [];
    for (const at of heads) {
      const k = headScale;
      // The column body and oral disc.
      s.lathe([[0, 0], [0.14 * k, 0], [0.18 * k, 0.08 * k], [0.16 * k, 0.2 * k], [0.2 * k, 0.27 * k], [0.14 * k, 0.32 * k], [0, 0.33 * k]], bodyPaint, [at[0], at[1], at[2]]);
      const origin = new THREE.Vector3(at[0], at[1] + 0.31 * k, at[2]);
      const tentacles: Tentacle[] = [];
      const rings: [number, number, number, number][] = [[8, 0.05, 0.35, 0.3], [14, 0.11, 0.75, 0.36], [18, 0.16, 1.15, 0.3]];
      for (const [n, r, tilt, length] of rings)
        for (let i = 0; i < n; i++) {
          const az = i / n * Math.PI * 2 + (random() - 0.5) * 0.2;
          tentacles.push({ az, r: r * k, tilt, length: length * k * mix(0.85, 1.15, random()), phase: random() * Math.PI * 2, wob: 0.7 + random() * 0.6 });
        }
      const mesh = new THREE.InstancedMesh(tentacleGeometry, tentaclePaint, tentacles.length);
      const bulbs = new THREE.InstancedMesh(bulbGeometry, tipPaint, tentacles.length);
      mesh.castShadow = true;
      s.root.add(mesh, bulbs);
      headSets.push({ origin, mesh, bulbs, tentacles });
    }
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const tip = new THREE.Vector3();
    const sway = mix(0.03, 0.22, mood.energy);
    const pose = (time: number) => {
      for (const set of headSets) {
        for (const [i, t] of set.tentacles.entries()) {
          const wave = Math.sin(time * 1.4 * t.wob + t.phase) * sway;
          const tilt = mix(0.12, t.tilt, openness) + wave * openness;
          const length = t.length * mix(0.35, 1, openness);
          euler.set(tilt, t.az + Math.cos(time * 0.9 * t.wob + t.phase) * sway * 0.6, 0);
          quaternion.setFromEuler(euler);
          position.set(set.origin.x + Math.sin(t.az) * t.r, set.origin.y, set.origin.z + Math.cos(t.az) * t.r);
          scale.set(1, length, 1);
          matrix.compose(position, quaternion, scale);
          set.mesh.setMatrixAt(i, matrix);
          tip.set(0, length, 0).applyQuaternion(quaternion).add(position);
          matrix.makeScale(openness ? 1 : 0.6, openness ? 1 : 0.6, openness ? 1 : 0.6).setPosition(tip);
          set.bulbs.setMatrixAt(i, matrix);
        }
        set.mesh.instanceMatrix.needsUpdate = true;
        set.bulbs.instanceMatrix.needsUpdate = true;
      }
    };
    pose(0);

    // Company and the foot of the post.
    let fish: THREE.Group | null = null;
    const fishHome = heads[0];
    if (a.fish) {
      fish = new THREE.Group();
      const paint = s.material(['#ffd23a', '#ff7d2a', '#55c8ff'][Math.floor(random() * 3)], { roughness: 0.5 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), paint);
      body.scale.set(0.14, 0.08, 0.06);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 3), paint);
      tail.rotation.z = Math.PI / 2;
      tail.position.x = -0.15;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), s.material('#1b1b1b'));
      eye.position.set(0.07, 0.025, 0.05);
      body.castShadow = tail.castShadow = true;
      fish.add(body, tail, eye);
      s.root.add(fish);
    }
    if (a.foot === 'plate') {
      s.box([0.5, 0.14, 0.03], [0, 1.1, 0.05], s.material('#1f3b73'));
      s.label(['CONCH ST', 'PINEAPPLE LN', 'BIKINI AVE', 'SAND DOLLAR RD'][Math.floor(random() * 4)], 0.46, 0.11, [0, 1.1, 0.066], '#ffffff', '#1f3b73');
    }
    if (a.foot === 'shells') {
      const n = 9 + Math.floor(random() * 4);
      s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#f1e3cf', { roughness: 0.6 }), Array.from({ length: n }, (_, i) => {
        const angle = i / n * Math.PI * 2 + (random() - 0.5) * 0.2;
        return { at: [Math.sin(angle) * 0.4, 0.04, Math.cos(angle) * 0.4] as [number, number, number], size: 0.05 + random() * 0.03, color: random() < 0.4 ? '#f3c7b3' : '#f1e3cf' };
      }));
    }
    if (a.foot === 'bucket') {
      const tin = s.material('#9aa0a3', { metalness: 0.6, roughness: 0.45 });
      s.cylinder(0.14, 0.11, 0.26, [0.42, 0.13, 0.2], tin, 14);
      s.ring(0.12, 0.012, [0.42, 0.33, 0.2], tin, Math.PI).rotation.y = 0.4;
    }

    const speed = mix(0.4, 1.4, mood.energy);
    return s.finish({
      footprint: 0.35,
      update: (_dt, time) => {
        pose(time);
        if (fish) {
          const angle = time * 0.9 * speed;
          fish.position.set(fishHome[0] + Math.cos(angle) * 0.5 * headScale, fishHome[1] + 0.2 + Math.sin(time * 1.7) * 0.08, fishHome[2] - Math.sin(angle) * 0.5 * headScale);
          fish.rotation.y = angle + Math.PI;
        }
      },
    });
  },
});
