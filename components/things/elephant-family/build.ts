import * as THREE from 'three';
import { choice, defineThing, mix, score } from '@conjure/kit';
import { Batch, type P3, vary } from './sav';

type Trunk = 'down' | 'reach' | 'up' | 'touch' | 'dust';
type Tusks = 'sweeping' | 'short' | 'broken' | 'none';

interface Spec {
  size: number;
  calf: boolean;
  trunk: Trunk;
  flare: number;
  stride: number;
  phase: number;
  tusks: Tusks;
  skin: THREE.Color;
  ragged: number;
}

/** One elephant in adult-cow metres, walking toward +x. */
function elephant(spec: Spec, random: () => number) {
  const b = new Batch();
  const skin = spec.skin, dark = skin.clone().multiplyScalar(0.78), ivory = '#efe5cc';
  const head = spec.calf ? 1.18 : 1;
  b.ball([0.72, 0.82, 0.6], [0.55, 1.85, 0], skin, undefined, 14);
  b.ball([0.98, 0.72, 0.66], [-0.05, 1.68, 0], skin, undefined, 14);
  b.ball([0.7, 0.8, 0.6], [-0.72, 1.72, 0], skin, undefined, 14);
  // Head: skull, domed brow and the root of the trunk.
  const hx = 1.38, hy = 2.08;
  b.ball([0.5 * head, 0.58 * head, 0.44 * head], [hx, hy, 0], skin, undefined, 14);
  b.ball([0.34 * head, 0.3 * head, 0.36 * head], [hx - 0.08, hy + 0.4 * head, 0], skin, undefined, 10);
  b.ball([0.3 * head, 0.4 * head, 0.3 * head], [hx + 0.34 * head, hy - 0.25, 0], skin, undefined, 10);
  for (const z of [-1, 1]) b.ball([0.035, 0.035, 0.035], [hx + 0.36 * head, hy + 0.12, z * 0.33 * head], '#14110f', undefined, 6);

  // Ears: wide fans with a hanging lower lobe.
  for (const z of [-1, 1]) {
    const f = spec.flare * mix(0.85, 1.15, random()), c = Math.cos(f), s = Math.sin(f), e = spec.calf ? 0.85 : 1;
    b.ball([0.56 * e, 0.7 * e * (1 - spec.ragged * 0.15), 0.055], [1.3 - 0.5 * c * e, 2.08, z * (0.4 + 0.5 * s * e)], dark, [0, z * f, 0], 12);
    b.ball([0.4 * e, 0.46 * e, 0.05], [1.36 - 0.45 * c * e, 1.6, z * (0.42 + 0.45 * s * e)], dark, [0, z * f, z * -0.15], 10);
  }

  // Legs: four columns, swung through a walking stride.
  const swings = [spec.phase, -spec.phase, -spec.phase * 0.8, spec.phase * 0.8];
  [[0.72, 0.36], [0.72, -0.36], [-0.78, 0.36], [-0.78, -0.36]].forEach(([x, z], i) => {
    const fx = x + swings[i] * spec.stride * 0.62, lift = Math.max(0, swings[i]) * spec.stride * 0.12;
    b.rod([x, 1.45, z], [fx, 0.1 + lift, z], 0.27, 0.215, skin, 9);
    b.drum(0.25, 0.16, [fx + 0.02, 0.08 + lift, z], dark, undefined, 9, 0.22);
  });

  // Tail with a dark tuft.
  b.tube([[-1.36, 1.98, 0], [-1.6, 1.5, 0.03], [-1.56, 0.95, 0.06]], 0.06, 0.025, dark, 5);
  b.ball([0.05, 0.12, 0.05], [-1.56, 0.86, 0.06], '#1b1714', undefined, 6);

  // Trunk.
  const tx = hx + 0.5 * head, ty = hy - 0.3;
  const paths: Record<Trunk, P3[]> = {
    down: [[tx, ty, 0], [tx + 0.3, ty - 0.55, 0], [tx + 0.28, 0.75, 0], [tx + 0.12, 0.32, 0], [tx + 0.3, 0.2, 0]],
    reach: [[tx, ty, 0], [tx + 0.4, ty - 0.35, 0], [tx + 0.85, ty - 0.55, 0.04], [tx + 1.25, ty - 0.35, 0.06]],
    up: [[tx, ty, 0], [tx + 0.5, ty + 0.1, 0], [tx + 0.75, ty + 0.75, 0], [tx + 0.5, ty + 1.3, 0], [tx + 0.7, ty + 1.65, 0]],
    touch: [[tx, ty, 0], [tx + 0.35, ty - 0.6, 0], [tx + 0.6, 0.7, 0], [tx + 0.95, 0.16, 0], [tx + 1.2, 0.12, 0]],
    dust: [[tx, ty, 0], [tx + 0.45, ty + 0.25, 0.1], [tx + 0.3, ty + 1.0, 0.3], [tx - 0.3, ty + 1.3, 0.45], [tx - 0.75, ty + 1.15, 0.5]],
  };
  const reach = spec.calf ? 0.82 : 1;
  b.shaped(paths[spec.trunk].map(([x, y, z]) => [tx + (x - tx) * reach, y, z] as const), (t) => mix(0.25, 0.075, t ** 0.8) * head, skin, 9);

  // Tusks.
  if (!spec.calf && spec.tusks !== 'none')
    for (const z of [-1, 1]) {
      const stump = spec.tusks === 'broken' && z > 0;
      const long = stump ? 0.3 : spec.tusks === 'sweeping' ? 1.15 : 0.6;
      const pts: P3[] = [[tx - 0.12, ty - 0.12, z * 0.2], [tx + 0.12 * long + 0.1, ty - 0.55 - 0.15 * long, z * 0.27], [tx + 0.5 * long + 0.12, ty - 0.72 - 0.1 * long, z * 0.3]];
      if (!stump) pts.push([tx + 0.95 * long + 0.1, ty - 0.62 + 0.2 * long, z * (0.3 - 0.06 * long)]);
      b.tube(pts, 0.075, stump ? 0.06 : 0.018, ivory, 7);
    }
  const mesh = b.mesh({ roughness: 0.95 });
  mesh.scale.setScalar(spec.size);
  return mesh;
}

export default defineThing({
  questions: {
    herd: choice('How many elephants are in the family?', {
      three: 'Three: two adults and a calf.',
      four: 'Four: a matriarch, a half-grown youngster, a calf and its mother.',
      five: 'Five: a long file of cows and young with the biggest at the head.',
    }),
    doing: choice('What are they doing right now?', {
      march: 'Walking steadily in single file, trunks swinging low, going somewhere they have always gone.',
      tails: 'Trunk to tail: each one reaches forward to the tail of the one ahead, like a paper chain.',
      alarm: 'Halted and bunched tight around the calf, the matriarch out front with ears spread wide and trunk raised to the wind.',
      mourning: 'Stopped in a half circle around the bleached bones of one of their own, trunks lowered to touch them.',
      dusting: 'Standing in a loose line throwing dust over their backs with curled trunks.',
    }),
    tone: choice('How do they read against the light?', {
      silhouette: 'Near-black cut-outs against a low sun, only the tusks pale.',
      grey: 'Dusty warm grey, wrinkled and matt, the classic elephant.',
      red: 'Stained brick red by the earth they bathe in, like the elephants of Tsavo.',
      mud: 'Dark wet mud-brown, fresh from a waterhole, legs darker than backs.',
    }),
    tusks: choice('What are the adults carrying for tusks?', {
      sweeping: 'Long sweeping ivory that almost reaches the ground: old, unhunted animals.',
      short: 'Modest working tusks.',
      broken: 'One tusk snapped to a stump on each: fighters and diggers.',
      none: 'No tusks at all, a herd shaped by generations of poaching.',
    }),
    calf: choice('Where is the calf?', {
      between: 'Tucked in the middle of the file, shielded front and back.',
      trailing: 'Lagging at the very back, hurrying to keep up.',
      ahead: 'Trotting out in front, trunk waving, too young to know better.',
      under: "Pressed against its mother's flank, half under her belly.",
    }),
    company: choice('What travels with them?', {
      nothing: 'Nothing, just the animals.',
      egrets: 'White cattle egrets riding on their backs and stalking beside their feet.',
      dust: 'A low haze of kicked-up dust hanging behind every footfall.',
      trail: 'A worn strip of bare red earth under their feet, a path walked for generations.',
    }),
    spacing: score('How strung out are they?', ['Shoulder to rump, touching', 'An easy walking gap', 'Strung far apart across the plain']),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const base = new THREE.Color({ silhouette: '#2b2623', grey: '#857d73', red: '#9c5c42', mud: '#54463a' }[a.tone]);
    if (a.tone !== 'silhouette') base.lerp(new THREE.Color('#b08a5e'), mood.warmth * 0.2).lerp(new THREE.Color('#77736c'), mood.wear * 0.2);

    type Role = 'lead' | 'cow' | 'young' | 'calf';
    const order: Role[] = { three: ['lead', 'calf', 'cow'], four: ['lead', 'young', 'calf', 'cow'], five: ['lead', 'cow', 'calf', 'young', 'cow'] }[a.herd] as Role[];
    const roles: Role[] = order.filter((r) => r !== 'calf');
    const calfAt = a.calf === 'ahead' ? 0 : a.calf === 'trailing' ? roles.length : a.calf === 'under' ? roles.length - 1 : Math.ceil(roles.length / 2);
    roles.splice(calfAt, 0, 'calf');
    const sizeOf = (r: Role) => ({ lead: 1.08, cow: mix(0.9, 1, random()), young: mix(0.62, 0.72, random()), calf: mix(0.38, 0.46, random()) })[r];

    const still = a.doing === 'alarm' || a.doing === 'mourning' || a.doing === 'dusting';
    const stride = still ? 0.12 : mix(0.45, 1, mood.energy);
    const gap = mix(0.8, 1.75, a.spacing);
    const animals: { mesh: THREE.Mesh; size: number; x: number; z: number; heading: number; role: Role }[] = [];
    let x = 0;
    roles.forEach((role, i) => {
      const size = sizeOf(role), length = 3.5 * size;
      const first = i === 0, last = i === roles.length - 1;
      let trunk: Trunk = 'down', flare = mix(0.3, 0.5, random());
      if (a.doing === 'tails' && !first) trunk = 'reach';
      if (a.doing === 'alarm') { flare = role === 'lead' ? 1.25 : 0.8; trunk = role === 'lead' || random() < 0.3 ? 'up' : 'down'; }
      if (a.doing === 'mourning') trunk = role === 'calf' ? 'down' : 'touch';
      if (a.doing === 'dusting') trunk = role === 'calf' || random() < 0.3 ? 'down' : 'dust';
      if (role === 'calf' && a.calf === 'ahead') trunk = 'up';
      const skin = vary(base, random, a.tone === 'silhouette' ? 0.02 : 0.07);
      if (role === 'calf' && a.tone !== 'silhouette') skin.offsetHSL(0, 0, 0.04);
      const mesh = elephant({ size, calf: role === 'calf', trunk, flare, stride, phase: (i % 2 ? -1 : 1) * mix(0.6, 1, random()), tusks: role === 'young' && a.tusks === 'sweeping' ? 'short' : a.tusks, skin, ragged: mood.wear }, random);
      if (a.tone === 'mud') {
        // Darker, wetter legs.
        const colour = mesh.geometry.getAttribute('color'), position = mesh.geometry.getAttribute('position');
        for (let v = 0; v < colour.count; v++) if (position.getY(v) < 1.1) colour.setXYZ(v, colour.getX(v) * 0.62, colour.getY(v) * 0.6, colour.getZ(v) * 0.6);
      }
      x -= i === 0 ? 0 : length * 0.5 * gap;
      let px = x, pz = (random() - 0.5) * 0.7 + Math.sin(i * 1.3) * 0.25 * a.spacing, heading = (random() - 0.5) * 0.12;
      if (role === 'calf' && a.calf === 'under' && animals.length) {
        const mother = animals[animals.length - 1];
        px = mother.x + 0.15; pz = mother.z + 0.95 * mother.size; x += length * 0.5 * gap;
      } else x -= length * 0.5 * gap;
      if (first && role === 'calf') px += 1.2;
      if (last && role === 'calf' && a.calf === 'trailing') px -= 1.5 * a.spacing + 0.4;
      animals.push({ mesh, size, x: px, z: pz, heading, role });
    });

    if (a.doing === 'mourning' || a.doing === 'alarm') {
      // Regroup: a half circle facing the bones, or a knot around the calf.
      const n = animals.length;
      const others = animals.filter((e) => e.role !== 'calf');
      others.forEach((e, i) => {
        if (a.doing === 'mourning') {
          const t = mix(-1.5, 1.5, others.length === 1 ? 0.5 : i / (others.length - 1)) + Math.PI;
          const r = 2.5 + 1.75 * e.size;
          e.x = Math.cos(t) * r; e.z = Math.sin(t) * r * 0.9; e.heading = Math.atan2(e.z, -e.x) + (random() - 0.5) * 0.15;
        } else if (e.role === 'lead') { e.x = 3.3; e.z = 0.3; e.heading = 0.1; }
        else { const t = 1.2 + (i / n) * 4.2; e.x = Math.cos(t) * 2.3 - 0.6; e.z = Math.sin(t) * 2.0; e.heading = t * 0.5 + (random() - 0.5) * 0.4 - 0.9; }
      });
      const calf = animals.find((e) => e.role === 'calf')!;
      if (a.doing === 'mourning') { calf.x = -2.6; calf.z = 1.9; calf.heading = -0.5; } else { calf.x = -0.4; calf.z = 0.1; calf.heading = 0.3; }
    }

    const extra = new Batch();
    const haze: THREE.Mesh[] = [];
    const dustMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d9b88a').lerp(new THREE.Color('#c98a5e'), a.tone === 'red' ? 0.6 : mood.warmth * 0.4), transparent: true, opacity: 0.3, depthWrite: false, roughness: 1 });
    const puffGeometry = new THREE.IcosahedronGeometry(1, 1);
    const puff = (px: number, py: number, pz: number, s: number) => {
      const m = new THREE.Mesh(puffGeometry, dustMaterial);
      m.position.set(px, py, pz); m.scale.set(s * 1.3, s * 0.7, s);
      haze.push(m); root.add(m);
    };

    for (const e of animals) {
      const holder = new THREE.Group();
      holder.add(e.mesh);
      holder.position.set(e.x, 0, e.z);
      holder.rotation.y = e.heading;
      root.add(holder);
      const top = 2.7 * e.size;
      if (a.company === 'egrets' && (e.role !== 'calf' ? random() < 0.75 : false)) {
        const k = 1 + Math.floor(random() * 2);
        for (let i = 0; i < k; i++) egret(extra, [e.x + (random() - 0.6) * 1.4 * e.size, top - 0.08, e.z + (random() - 0.5) * 0.4], random);
      }
      if (a.company === 'egrets' && random() < 0.6) egret(extra, [e.x + (random() - 0.5) * 2, 0, e.z + 1.2 + random() * 0.8], random, true);
      if (a.company === 'dust' || a.doing === 'dusting') {
        const k = 2 + Math.floor(random() * 3 + mood.energy * 2);
        for (let i = 0; i < k; i++) puff(e.x - (0.5 + random() * 2.4) * e.size, 0.3 + random() * 0.5, e.z + (random() - 0.5) * 1.4, mix(0.5, 1.1, random()) * e.size);
      }
      if (a.doing === 'dusting' && e.role !== 'calf') for (let i = 0; i < 3; i++) puff(e.x + (random() - 0.5) * 1.6, top + 0.25 + random() * 0.6, e.z + (random() - 0.2) * 1.0, mix(0.45, 0.8, random()));
    }

    if (a.doing === 'mourning') {
      const bone = '#e9e2cf';
      extra.blob([0.5, 0.42, 0.42], [0.2, 0.36, 0.1], bone, [0, 0.4, 0.3], 1);
      extra.blob([0.26, 0.3, 0.3], [0.62, 0.22, 0.25], bone, [0, 0.4, 0], 1);
      for (const z of [-1, 1]) extra.tube([[0.7, 0.2, 0.25 + z * 0.18], [1.2, 0.1, 0.3 + z * 0.4], [1.75, 0.3, 0.3 + z * 0.3]], 0.07, 0.02, '#f2ead5', 6);
      for (let i = 0; i < 7; i++) { const rx = -0.5 - i * 0.24; extra.tube([[rx, 0, -0.45], [rx + 0.05, 0.62 - i * 0.04, 0], [rx, 0.02, 0.5]], 0.035, 0.025, bone, 5); }
      extra.rod([0, 0.07, 0.05], [-2.3, 0.07, 0.1], 0.06, 0.05, bone, 6);
      for (let i = 0; i < 4; i++) { const t = random() * 6.28, d = 0.8 + random() * 1.2; extra.rod([Math.cos(t) * d, 0.07, Math.sin(t) * d], [Math.cos(t) * d + (random() - 0.5) * 1.3, 0.07, Math.sin(t) * d + (random() - 0.5) * 1.3], 0.075, 0.075, bone, 6); }
    }

    if (a.company === 'trail') {
      const earth = new THREE.Color('#a8583a').lerp(new THREE.Color('#8a6a55'), mood.wear * 0.3);
      const xs = animals.map((e) => e.x), from = Math.min(...xs) - 3, to = Math.max(...xs) + 3.5;
      for (let px = from; px <= to; px += 0.8) extra.drum(mix(0.8, 1.25, random()), 0.035, [px, 0.012 + random() * 0.01, (random() - 0.5) * 0.5 + Math.sin(px * 0.25) * 0.4], vary(earth, random, 0.06), undefined, 9);
      for (let i = 0; i < 26; i++) { const px = mix(from, to, random()), side = random() < 0.5 ? -1 : 1, c = vary('#c8ae68', random, 0.1); for (let k = 0; k < 3; k++) extra.cone(0.04, mix(0.3, 0.6, random()), [px + random() * 0.15, 0.18, side * mix(1.3, 2, random()) + Math.sin(px * 0.25) * 0.4], c, [(random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5], 4); }
    }
    if (!extra.empty) root.add(extra.mesh({ roughness: 0.9 }));

    // Centre the group on the origin.
    const xs = animals.map((e) => e.x), zs = animals.map((e) => e.z);
    root.position.set(-(Math.min(...xs) + Math.max(...xs)) / 2 - 0.2, 0, -(Math.min(...zs) + Math.max(...zs)) / 2);

    const holders = root.children.filter((child) => (child as THREE.Group).isGroup);
    const pace = mix(0.5, 1.6, mood.energy), amount = still ? 0.006 : 0.014;
    return {
      object: root,
      update: (dt, time) => {
        holders.forEach((holder, i) => {
          holder.rotation.z = Math.sin(time * pace * 1.6 + i * 1.7) * amount;
          holder.position.y = Math.abs(Math.sin(time * pace * 1.6 + i * 1.7)) * amount * 1.5;
        });
        for (const [i, m] of haze.entries()) { m.position.y += dt * 0.04 * Math.sin(time * 0.5 + i); m.rotation.y += dt * 0.1; }
      },
      dispose: () => {
        root.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        });
        puffGeometry.dispose();
        dustMaterial.dispose();
        root.removeFromParent();
      },
    };
  },
});

function egret(b: Batch, at: P3, random: () => number, standing = false) {
  const [x, y, z] = at, dir = random() < 0.5 ? -1 : 1, white = '#f6f4ec';
  const legs = standing ? 0.28 : 0.08;
  for (const s of [-1, 1]) b.rod([x + s * 0.03, y, z], [x + s * 0.03, y + legs, z], 0.008, 0.008, '#3a3a32', 3);
  b.ball([0.15, 0.09, 0.08], [x, y + legs + 0.07, z], white, [0, 0, dir * 0.3], 8);
  b.tube([[x + dir * 0.1, y + legs + 0.1, z], [x + dir * 0.13, y + legs + 0.24, z], [x + dir * 0.2, y + legs + 0.34, z]], 0.03, 0.022, white, 5);
  b.ball([0.04, 0.035, 0.035], [x + dir * 0.22, y + legs + 0.36, z], white, undefined, 6);
  b.cone(0.016, 0.11, [x + dir * 0.3, y + legs + 0.35, z], '#e6a52e', [0, 0, -dir * 1.57], 4);
}
