import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

const EGGS = {
  bone: 'Bone white with faint blue veins.',
  mottled: 'Olive green mottled with brown.',
  slate: 'Slate blue-grey, dull as stone.',
  amber: 'Translucent amber with something dark curled inside.',
  black: 'Oily black with a rainbow sheen.',
} as const;
const EGG_TONE: Record<keyof typeof EGGS, { shell: string; inner: string; rough: number }> = {
  bone: { shell: '#e9e3d4', inner: '#d3b9a8', rough: 0.75 },
  mottled: { shell: '#8a8f58', inner: '#c7b48e', rough: 0.85 },
  slate: { shell: '#6f7781', inner: '#b9b4aa', rough: 0.9 },
  amber: { shell: '#c98a3a', inner: '#e4b26a', rough: 0.3 },
  black: { shell: '#1f2224', inner: '#7a6f64', rough: 0.25 },
};

export default defineThing({
  questions: {
    eggs: choice('What colour are the eggs?', EGGS),
    hatched: choice('What state is the clutch in?', {
      whole: 'Every egg whole, leathery and a little sunken.',
      one: 'One egg split open and empty, the rest whole.',
      most: 'Most split open and empty; a couple still whole.',
      all: 'Every shell split and collapsed, nothing left inside.',
    }),
    glisten: choice('What glistens nearby?', {
      nothing: 'Nothing: dry ground.',
      trail: 'A slime trail leading away through the grass.',
      membrane: 'A shed membrane, wet and crumpled, beside the shells.',
      smear: 'A wet smear up the side of a stone.',
      strands: 'Long strands of slime stretched between the shells.',
    }),
    ring: choice('What surrounds the scrape?', {
      trampled: 'A ring of trampled, flattened grass.',
      bare: 'Bare scraped earth and nothing else.',
      stones: 'A ring of stones set deliberately around it.',
      bones: 'Small bones and old shell fragments scattered around.',
    }),
    lining: choice('What lines the nest?', {
      earth: 'Bare dark earth.',
      grass: 'Pulled grass packed into a bowl.',
      down: 'Pale fibrous down, like wool.',
    }),
    inside: noul('Is something still half inside one split egg?'),
    count: score('How many eggs?', ['Just two', 'A clutch of five', 'A heap of nine']),
    size: score('How big are the eggs?', ['Hen-sized', 'Melon-sized', 'As big as a bucket']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { random, mood } = context;
    const n = 2 + Math.round(a.count * 7);
    const r = mix(0.04, 0.24, a.size ** 1.2); // half-width of an egg
    const tone = EGG_TONE[a.eggs];
    const shell = s.material(tone.shell, { roughness: tone.rough, metalness: a.eggs === 'black' ? 0.3 : 0 });
    const inner = s.material(tone.inner, { roughness: 0.4, side: THREE.DoubleSide });
    const slime = new THREE.MeshStandardMaterial({ color: '#d7efe0', roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.75, depthWrite: false, emissive: '#9fd9b8', emissiveIntensity: 0.15 });

    // The scrape: a shallow bowl of lining with a raised lip.
    const nestR = r * (1.6 + Math.sqrt(n) * 0.9);
    const earth = s.material('#4f4133', { roughness: 1 });
    const lining = { earth, grass: s.material('#8c8a56', { roughness: 1 }), down: s.material('#e6e0d0', { roughness: 1 }) }[a.lining];
    s.cylinder(nestR, nestR * 1.1, r * 0.3, [0, r * 0.15, 0], earth, 28);
    const bowl = s.cylinder(nestR * 0.92, nestR * 0.85, r * 0.08, [0, r * 0.3, 0], lining, 28);
    bowl.castShadow = false;
    const lip = s.ring(nestR * 0.98, r * 0.22, [0, r * 0.3, 0], lining);
    lip.rotation.x = Math.PI / 2;
    if (a.lining !== 'earth') {
      const tufts: { at: P3; size: number }[] = [];
      for (let i = 0; i < 40; i++) { const t = random() * Math.PI * 2, d = nestR * mix(0.82, 1.08, random()); tufts.push({ at: [Math.sin(t) * d, r * 0.4, Math.cos(t) * d], size: r * mix(0.12, 0.25, random()) }); }
      s.scatter(new THREE.BoxGeometry(2.2, 0.3, 0.5), lining, tufts);
    }

    // Lay the eggs in the bowl, packed from the centre out, each tilted a little.
    const spots: { x: number; z: number; split: boolean; yaw: number }[] = [];
    const splitCount = { whole: 0, one: 1, most: Math.max(1, n - 2), all: n }[a.hatched];
    for (let i = 0; i < n; i++) {
      let x = 0, z = 0;
      for (let tries = 0; tries < 30; tries++) {
        const t = random() * Math.PI * 2, d = i === 0 ? 0 : Math.sqrt(random()) * (nestR * 0.78 - r);
        x = Math.sin(t) * d; z = Math.cos(t) * d;
        if (spots.every((p) => Math.hypot(p.x - x, p.z - z) > r * 1.9)) break;
      }
      spots.push({ x, z, split: i < splitCount, yaw: random() * Math.PI * 2 });
    }
    const half = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const y0 = r * 0.34;
    const splitTops: P3[] = [];
    for (const [i, spot] of spots.entries()) {
      if (!spot.split) {
        const egg = s.ball([r, r * 1.3, r], [spot.x, y0 + r * 0.95, spot.z], shell, 16);
        egg.rotation.set((random() - 0.5) * 0.5, spot.yaw, (random() - 0.5) * 0.5);
        if (a.eggs === 'mottled') {
          const spots2: { at: P3; size: number }[] = [];
          for (let k = 0; k < 12; k++) { const u = (random() - 0.5) * 1.4, t = random() * Math.PI * 2, rr = Math.sqrt(1 - u * u); spots2.push({ at: [spot.x + Math.sin(t) * rr * r * 0.98, y0 + r * 0.95 + u * r * 1.3, spot.z + Math.cos(t) * rr * r * 0.98], size: r * mix(0.08, 0.16, random()) }); }
          s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#5a4a2c', { roughness: 0.9 }), spots2);
        }
        if (a.eggs === 'amber') s.ball([r * 0.5, r * 0.6, r * 0.45], [spot.x, y0 + r * 0.9, spot.z], s.material('#3a2214', { roughness: 0.8 }), 10).rotation.y = spot.yaw;
        continue;
      }
      // A split egg: the lower cup stays upright and empty; the top half lies beside it, open side up.
      const cup = s.mesh(half, new THREE.MeshStandardMaterial({ color: shell.color, roughness: tone.rough, side: THREE.DoubleSide }), [spot.x, y0, spot.z]);
      cup.scale.set(r, r * 0.95, r);
      cup.rotation.set(Math.PI, spot.yaw, 0);
      cup.position.y = y0 + r * 0.95;
      // Inner: the wet lining shows through the open top.
      const floor = s.cylinder(r * 0.85, r * 0.85, r * 0.04, [spot.x, y0 + r * 0.2, spot.z], inner, 14);
      floor.castShadow = false;
      // Torn edge: a few jagged flaps standing up from the rim.
      for (let k = 0; k < 4; k++) {
        const t = spot.yaw + k * 1.6 + random() * 0.5;
        const flap = s.box([r * 0.35, r * mix(0.25, 0.5, random()), r * 0.05], [spot.x + Math.sin(t) * r * 0.9, y0 + r * 1.05, spot.z + Math.cos(t) * r * 0.9], shell);
        flap.rotation.set((random() - 0.5) * 0.6, t, (random() - 0.5) * 0.5);
      }
      const lidT = spot.yaw + Math.PI * 0.5, lidX = spot.x + Math.sin(lidT) * r * 1.5, lidZ = spot.z + Math.cos(lidT) * r * 1.5;
      const lid = s.mesh(half, new THREE.MeshStandardMaterial({ color: shell.color, roughness: tone.rough, side: THREE.DoubleSide }), [lidX, y0 + r * 0.12, lidZ]);
      lid.scale.set(r * 0.95, r * 0.6, r * 0.95);
      lid.rotation.set(Math.PI + 0.35, random() * 3, 0.2);
      splitTops.push([spot.x, y0 + r * 1.0, spot.z]);
      if (a.inside && i === 0) {
        // Something dark and wet, curled, half out of the shell.
        const wet = s.material('#2b3a2a', { roughness: 0.15, metalness: 0.2 });
        s.ball([r * 0.45, r * 0.4, r * 0.5], [spot.x, y0 + r * 0.6, spot.z], wet, 12);
        s.tube([[spot.x, y0 + r * 0.7, spot.z], [spot.x + r * 0.5, y0 + r * 0.9, spot.z + r * 0.4], [spot.x + r * 1.0, y0 + r * 0.5, spot.z + r * 0.9], [spot.x + r * 1.5, y0 + r * 0.2, spot.z + r * 1.0]], r * 0.14, wet);
        for (let k = 0; k < 3; k++) s.rod([spot.x + r * 0.2, y0 + r * 0.8, spot.z], [spot.x + r * mix(0.4, 0.9, random()), y0 + r * mix(1.1, 1.5, random()), spot.z + r * (random() - 0.5)], r * 0.05, wet, r * 0.02);
      }
    }

    // What glistens.
    if (a.glisten === 'strands' || (a.glisten === 'nothing' && splitCount > 1 && mood.wear < 0.5)) {
      const from = splitTops.length ? splitTops : [[0, y0 + r, 0] as P3];
      for (let k = 0; k < Math.max(2, from.length + 1); k++) {
        const p0 = from[k % from.length], target = spots[Math.floor(random() * spots.length)];
        const p1: P3 = [target.x, y0 + r * 1.3, target.z];
        if (Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) < r * 0.5) continue;
        const mid: P3 = [(p0[0] + p1[0]) / 2, Math.min(p0[1], p1[1]) - r * 0.3, (p0[2] + p1[2]) / 2];
        const strand = s.tube([p0, mid, p1], r * 0.03, slime);
        strand.castShadow = false;
      }
    }
    if (a.glisten === 'trail') {
      const t = random() * Math.PI * 2, steps = 9;
      for (let k = 0; k < steps; k++) {
        const d = nestR * 0.6 + k * r * 1.1, w = Math.sin(k * 1.3) * r * 0.5;
        const dab = s.ball([r * mix(0.35, 0.6, 1 - k / steps), r * 0.05, r * mix(0.5, 0.9, 1 - k / steps)], [Math.sin(t) * d + Math.cos(t) * w, r * (k < 2 ? 0.32 : 0.02), Math.cos(t) * d - Math.sin(t) * w], slime, 10);
        dab.rotation.y = t;
        dab.castShadow = false;
      }
    }
    if (a.glisten === 'membrane') {
      const t = random() * Math.PI * 2, mx = Math.sin(t) * nestR * 1.15, mz = Math.cos(t) * nestR * 1.15;
      const skin = new THREE.MeshStandardMaterial({ color: '#d9d2c6', roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85, depthWrite: false });
      for (let k = 0; k < 6; k++) {
        const m = s.ball([r * mix(0.35, 0.7, random()), r * 0.12, r * mix(0.3, 0.6, random())], [mx + (random() - 0.5) * r * 1.2, r * 0.08 + k * r * 0.05, mz + (random() - 0.5) * r], skin, 8);
        m.rotation.y = random() * 3;
        m.castShadow = false;
      }
    }
    if (a.glisten === 'smear') {
      const t = random() * Math.PI * 2, sx = Math.sin(t) * nestR * 1.3, sz = Math.cos(t) * nestR * 1.3, R = r * 1.3;
      const rock = s.mesh(new THREE.IcosahedronGeometry(1, 1), s.material('#8a8378', { roughness: 0.95, flatShading: true }), [sx, R * 0.5, sz]);
      rock.scale.set(R * 1.2, R * 0.9, R);
      rock.rotation.y = random() * 3;
      const smear = s.ball([R * 0.5, R * 0.7, R * 0.2], [sx - Math.sin(t) * R * 0.95, R * 0.45, sz - Math.cos(t) * R * 0.95], slime, 10);
      smear.rotation.y = t;
      smear.castShadow = false;
    }

    // Around the scrape.
    if (a.ring === 'trampled') {
      const blades: { at: P3; size: number }[] = [];
      for (let i = 0; i < 90; i++) {
        const t = random() * Math.PI * 2, d = nestR * mix(1.1, 1.7, random());
        blades.push({ at: [Math.sin(t) * d, r * 0.06, Math.cos(t) * d], size: r * mix(0.3, 0.55, random()) });
      }
      const blade = new THREE.ConeGeometry(0.12, 1, 4);
      blade.rotateX(1.25); // flattened outward
      const flat = new THREE.InstancedMesh(blade, s.material('#8a9a5c', { roughness: 1 }), blades.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      blades.forEach((b, i) => {
        const ang = Math.atan2(b.at[0], b.at[2]);
        e.set(0, ang + (random() - 0.5) * 0.6, 0);
        m.compose(new THREE.Vector3(...b.at), q.setFromEuler(e), new THREE.Vector3(b.size, b.size, b.size));
        flat.setMatrixAt(i, m);
      });
      flat.instanceMatrix.needsUpdate = true;
      flat.castShadow = flat.receiveShadow = true;
      s.root.add(flat);
    } else if (a.ring === 'stones') {
      const stones: { at: P3; size: number }[] = [];
      const count = 8 + Math.floor(random() * 5);
      for (let i = 0; i < count; i++) { const t = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.2, d = nestR * 1.2; stones.push({ at: [Math.sin(t) * d, r * 0.2, Math.cos(t) * d], size: r * mix(0.3, 0.45, random()) }); }
      s.scatter(new THREE.IcosahedronGeometry(1, 1), s.material('#8d877b', { roughness: 0.95, flatShading: true }), stones);
    } else if (a.ring === 'bones') {
      const bits: { at: P3; size: number }[] = [];
      for (let i = 0; i < 16; i++) { const t = random() * Math.PI * 2, d = nestR * mix(1.1, 1.9, random()); bits.push({ at: [Math.sin(t) * d, r * 0.05, Math.cos(t) * d], size: r * mix(0.12, 0.3, random()) }); }
      const bone = new THREE.CapsuleGeometry(0.25, 1.4, 3, 6);
      bone.rotateZ(Math.PI / 2);
      s.scatter(bone, s.material('#e3dccb', { roughness: 0.85 }), bits);
      const frags: { at: P3; size: number }[] = [];
      for (let i = 0; i < 10; i++) { const t = random() * Math.PI * 2, d = nestR * mix(1.05, 1.5, random()); frags.push({ at: [Math.sin(t) * d, r * 0.04, Math.cos(t) * d], size: r * mix(0.15, 0.3, random()) }); }
      s.scatter(half, shell, frags);
    }

    // The slime pulses faintly with the scene's energy; eggs do not move.
    const beat = mix(0.2, 1.2, mood.energy);
    return s.finish({ update: (_dt, time) => { slime.emissiveIntensity = 0.15 + Math.sin(time * beat * 2) * 0.08; } });
  },
});
