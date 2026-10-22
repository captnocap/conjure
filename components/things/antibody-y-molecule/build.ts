import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, noul, score } from '@conjure/kit';
import { STYLES, instances, paint, tone } from './membrane';

const CHAINS: Record<keyof typeof STYLES, { heavy: string; light: string; tip: string; hinge: string }> = {
  pastel: { heavy: '#7d9fdc', light: '#f2a58e', tip: '#ffd24f', hinge: '#9aa6c2' },
  micrograph: { heavy: '#55554f', light: '#9c9c95', tip: '#f4f4ec', hinge: '#3e3e3a' },
  glossy: { heavy: '#2f6fe0', light: '#ff5a3c', tip: '#ffd21f', hinge: '#1d3f8a' },
};
const TARGETS: Record<keyof typeof STYLES, Record<'bacterium' | 'virus' | 'pollen' | 'toxin', [string, string]>> = {
  pastel: { bacterium: ['#a8cf7a', '#6f9a48'], virus: ['#c9ccd3', '#e8726b'], pollen: ['#f1d77a', '#c9a33c'], toxin: ['#b991d8', '#8a62ae'] },
  micrograph: { bacterium: ['#cfcfc8', '#8a8a84'], virus: ['#d2d2cb', '#8f8f89'], pollen: ['#d8d8d0', '#9a9a93'], toxin: ['#c8c8c1', '#8a8a84'] },
  glossy: { bacterium: ['#5fbf3a', '#2f7a1c'], virus: ['#d9dde4', '#e8262c'], pollen: ['#ffc21f', '#d98a00'], toxin: ['#a35cf0', '#6a2fb8'] },
};

export default defineThing({
  questions: {
    arrangement: choice('How are the antibodies gathered?', {
      lone: 'A single antibody standing on its stem, arms raised, the classic Y.',
      tagging: 'A squad of them clamped onto one target by their tips, stems sticking out like flags.',
      clumping: 'Antibodies bridging two or three targets, gluing them into a clump.',
      pentamer: 'Five Ys joined at the stem into a big star, gripping the floor like a spider.',
    }),
    target: choice('What have they caught?', {
      bacterium: 'A rod-shaped bacterium with hair-like pili.',
      virus: 'A round virus studded with spikes.',
      pollen: 'A spiky golden pollen grain: an allergy.',
      toxin: 'Lumpy toxin molecules, small and poisonous.',
    }),
    spread: score('How wide are the arms spread?', ['Narrow, a tight V', 'A classic Y', 'Flung wide like a T']),
    lit: noul('Are the binding tips glowing as they lock on?'),
    complement: noul('Is a tulip-shaped alarm protein docking onto the stems, calling in the kill?'),
    style: choice('How is it drawn?', STYLES),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const chains = CHAINS[a.style];
    const [targetColour, targetDark] = TARGETS[a.style][a.target];
    const heavy = paint(chains.heavy, context, a.style);
    const light = paint(chains.light, context, a.style);
    const hinge = paint(chains.hinge, context, a.style);
    const tipColour = tone(chains.tip, context);
    const tip = paint(chains.tip, context, a.style, a.lit ? { emissive: tipColour, emissiveIntensity: 0.7 } : {});
    const targetMaterial = paint(targetColour, context, a.style);
    const targetDarkMaterial = paint(targetDark, context, a.style);
    const ball = new THREE.SphereGeometry(1, 16, 12);
    const rod = new THREE.CylinderGeometry(1, 1, 1, 8);
    const Y = new THREE.Vector3(0, 1, 0);
    const theta = mix(0.42, 1.25, a.spread);

    const domain = (group: THREE.Group, at: THREE.Vector3, along: THREE.Vector3, size: [number, number, number], material: THREE.Material) => {
      const mesh = new THREE.Mesh(ball, material);
      mesh.position.copy(at);
      mesh.quaternion.setFromUnitVectors(Y, along);
      mesh.scale.set(...size);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const link = (group: THREE.Group, from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(rod, material);
      const d = to.clone().sub(from);
      mesh.position.copy(from).add(to).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(Y, d.clone().normalize());
      mesh.scale.set(radius, d.length(), radius);
      mesh.castShadow = true;
      group.add(mesh);
    };

    /** One IgG in its own frame: stem foot at the origin, arms up in the x-y plane. */
    const hingeY = 0.108;
    const armLength = 0.122;
    const tipX = Math.sin(theta) * armLength, tipY = hingeY + 0.012 + Math.cos(theta) * armLength;
    const antibody = (bend = 0) => {
      const group = new THREE.Group();
      for (const side of [-1, 1]) {
        domain(group, new THREE.Vector3(side * 0.019, 0.026, 0), Y, [0.018, 0.025, 0.017], heavy);
        domain(group, new THREE.Vector3(side * 0.022, 0.074, 0), new THREE.Vector3(side * 0.15, 1, 0).normalize(), [0.017, 0.024, 0.016], heavy);
        link(group, new THREE.Vector3(side * 0.016, 0.094, 0), new THREE.Vector3(side * 0.004, hingeY, 0), 0.0045, hinge);
      }
      for (const side of [-1, 1]) {
        const angle = theta + (side > 0 ? bend : -bend * 0.5);
        const u = new THREE.Vector3(side * Math.sin(angle), Math.cos(angle), 0);
        const across = new THREE.Vector3(Math.cos(angle) * side, -Math.sin(angle), 0).multiplyScalar(1);
        const base = new THREE.Vector3(0, hingeY, 0).addScaledVector(u, 0.014);
        link(group, new THREE.Vector3(0, hingeY, 0), base, 0.0045, hinge);
        const outer = across.clone().multiplyScalar(0.0165), inner = across.clone().multiplyScalar(-0.0165);
        // Constant then variable domains: heavy chain on the inside, light chain outside.
        domain(group, base.clone().addScaledVector(u, 0.03).add(inner), u, [0.0165, 0.024, 0.0155], heavy);
        domain(group, base.clone().addScaledVector(u, 0.03).add(outer), u, [0.0155, 0.023, 0.0145], light);
        domain(group, base.clone().addScaledVector(u, 0.078).add(inner), u, [0.016, 0.023, 0.015], heavy);
        domain(group, base.clone().addScaledVector(u, 0.078).add(outer), u, [0.015, 0.022, 0.014], light);
        // The binding tip: a little cluster of loops.
        const end = base.clone().addScaledVector(u, 0.106);
        for (let k = 0; k < 3; k++) domain(group, end.clone().add(across.clone().multiplyScalar((k - 1) * 0.011)).addScaledVector(u, k === 1 ? 0.004 : 0), u, [0.0075, 0.0085, 0.0075], tip);
      }
      return group;
    };
    /** Stand an antibody so its tips meet a surface: point at the surface, normal out, arm line along tangent. */
    const mount = (group: THREE.Group, point: THREE.Vector3, normal: THREE.Vector3, tangent: THREE.Vector3, reach = tipY) => {
      const y = normal.clone().negate().normalize();
      const x = tangent.clone().sub(y.clone().multiplyScalar(tangent.dot(y))).normalize();
      const z = new THREE.Vector3().crossVectors(x, y);
      group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
      group.position.copy(point).addScaledVector(normal, reach);
      root.add(group);
    };

    /** A complement bouquet: six tulip heads on the stem end, gathered into a stalk pointing away. */
    const bouquet = (group: THREE.Group) => {
      const b = new THREE.Group();
      const bud = paint(a.style === 'micrograph' ? '#4c4c49' : '#e64a6b', context, a.style);
      const stem = paint(a.style === 'micrograph' ? '#6e6e6a' : '#3f9b6a', context, a.style);
      const gather = new THREE.Vector3(0, -0.065, 0);
      for (let k = 0; k < 6; k++) {
        const angle = (k / 6) * Math.PI * 2;
        const head = new THREE.Vector3(Math.cos(angle) * 0.03, -0.004, Math.sin(angle) * 0.022);
        domain(b, head, Y, [0.009, 0.011, 0.009], bud);
        link(b, head, gather, 0.0025, stem);
      }
      link(b, gather, new THREE.Vector3(0, -0.11, 0), 0.006, stem);
      group.add(b);
    };

    const motion: { group: THREE.Group; axis: THREE.Vector3; phase: number }[] = [];
    const count = (low: number, high: number) => Math.round(mix(low, high, mood.density));

    // Targets.
    const spikyBall = (centre: THREE.Vector3, radius: number, pollen: boolean) => {
      const body = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 3), targetMaterial);
      body.position.copy(centre);
      body.castShadow = body.receiveShadow = true;
      root.add(body);
      const n = pollen ? 60 : 34;
      const spikes: { matrix: THREE.Matrix4 }[] = [];
      const knobs: { matrix: THREE.Matrix4 }[] = [];
      for (let i = 0; i < n; i++) {
        const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), t = i * 2.39996;
        const dir = new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r);
        const q = new THREE.Quaternion().setFromUnitVectors(Y, dir);
        spikes.push({ matrix: new THREE.Matrix4().compose(centre.clone().addScaledVector(dir, radius * (pollen ? 1.08 : 1.09)), q, new THREE.Vector3(1, 1, 1)) });
        if (!pollen) knobs.push({ matrix: new THREE.Matrix4().compose(centre.clone().addScaledVector(dir, radius * 1.19), q, new THREE.Vector3().setScalar(radius * 0.06)) });
      }
      root.add(instances(pollen ? new THREE.ConeGeometry(radius * 0.08, radius * 0.22, 6) : new THREE.CylinderGeometry(radius * 0.035, radius * 0.035, radius * 0.18, 5), targetDarkMaterial, spikes));
      if (knobs.length) root.add(instances(new THREE.SphereGeometry(1, 8, 6), targetDarkMaterial, knobs));
    };
    const toxin = (centre: THREE.Vector3, radius: number) => {
      for (let k = 0; k < 4; k++) {
        const lump = new THREE.Mesh(ball, k % 2 ? targetDarkMaterial : targetMaterial);
        lump.scale.setScalar(radius * mix(0.55, 0.75, random()));
        lump.position.copy(centre).add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(radius * 0.7));
        lump.castShadow = true;
        root.add(lump);
      }
    };

    if (a.arrangement === 'lone') {
      const one = antibody();
      root.add(one);
      motion.push({ group: one, axis: new THREE.Vector3(0, 0, 1), phase: 0 });
      // Whatever it caught, held in its tips.
      for (const side of [-1, 1]) {
        const centre = new THREE.Vector3(side * (tipX + 0.03 * Math.sin(theta)), tipY + 0.012 + 0.03 * Math.cos(theta), 0);
        if (a.target === 'toxin') toxin(centre, 0.028);
        else if (a.target === 'bacterium') {
          const pill = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.04, 6, 12), targetMaterial);
          pill.position.copy(centre);
          pill.rotation.z = side * theta;
          pill.castShadow = true;
          root.add(pill);
        } else spikyBall(centre, 0.024, a.target === 'pollen');
      }
    } else if (a.arrangement === 'tagging') {
      if (a.target === 'bacterium') {
        const rb = 0.075, half = 0.13;
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(rb, half * 2, 8, 20), targetMaterial);
        body.rotation.z = Math.PI / 2;
        body.position.y = rb;
        body.castShadow = body.receiveShadow = true;
        root.add(body);
        for (let k = 0; k < 22; k++) {
          const x = (random() - 0.5) * half * 2.2, angle = random() * Math.PI * 1.2 - 0.1;
          const from = new THREE.Vector3(x, rb + Math.cos(angle) * rb, Math.sin(angle) * rb);
          const out = new THREE.Vector3(0, Math.cos(angle), Math.sin(angle));
          link(root, from, from.clone().addScaledVector(out, 0.02 + random() * 0.025).add(new THREE.Vector3((random() - 0.5) * 0.02, 0, 0)), 0.0016, targetDarkMaterial);
        }
        const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-half - rb * 0.9, rb, 0), new THREE.Vector3(-half - rb - 0.05, rb + 0.02, 0.02), new THREE.Vector3(-half - rb - 0.1, rb - 0.01, -0.02), new THREE.Vector3(-half - rb - 0.15, rb + 0.02, 0.01)]), 24, 0.004, 5), targetDarkMaterial);
        root.add(tail);
        const n = count(3, 7);
        for (let i = 0; i < n; i++) {
          const x = -half + (i + 0.5) * (half * 2 / n) + (random() - 0.5) * 0.02;
          const angle = (i % 2 ? 1 : -1) * mix(0.1, 1.1, random());
          const normal = new THREE.Vector3(0, Math.cos(angle), Math.sin(angle));
          const point = new THREE.Vector3(x, rb, 0).addScaledVector(normal, rb);
          const ab = antibody(random() * 0.1);
          mount(ab, point, normal, new THREE.Vector3(1, 0, (random() - 0.5) * 0.8), tipY + 0.008);
          motion.push({ group: ab, axis: normal, phase: random() * 6 });
          if (a.complement && i % 3 === 1) bouquet(ab);
        }
      } else {
        const radius = a.target === 'toxin' ? 0.06 : 0.1;
        const centre = new THREE.Vector3(0, radius + 0.01, 0);
        if (a.target === 'toxin') toxin(centre, radius * 1.3); else spikyBall(centre, radius, a.target === 'pollen');
        const n = count(3, 7);
        for (let i = 0; i < n; i++) {
          const y = mix(0.95, -0.1, i / n), r = Math.sqrt(1 - y * y), t = i * 2.39996 + random() * 0.4;
          const normal = new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r);
          const reach = radius * (a.target === 'virus' ? 1.2 : a.target === 'pollen' ? 1.15 : 1);
          const ab = antibody(random() * 0.1);
          mount(ab, centre.clone().addScaledVector(normal, reach), normal, new THREE.Vector3(-normal.z, 0.3, normal.x), tipY - 0.006 + (1 - Math.cos(Math.asin(Math.min(0.99, tipX / reach)))) * reach * -0.6);
          motion.push({ group: ab, axis: normal, phase: random() * 6 });
          if (a.complement && i % 3 === 0) bouquet(ab);
        }
      }
    } else if (a.arrangement === 'clumping') {
      const targets = mood.density > 0.5 ? 3 : 2;
      const radius = a.target === 'bacterium' ? 0.06 : a.target === 'toxin' ? 0.045 : 0.07;
      const gap = tipX * 2 - 0.01;
      const step = gap + radius * 2;
      for (let t = 0; t < targets; t++) {
        const x = (t - (targets - 1) / 2) * step;
        const centre = new THREE.Vector3(x, radius + 0.02, (t % 2) * 0.02);
        if (a.target === 'toxin') toxin(centre, radius * 1.2);
        else if (a.target === 'bacterium') {
          const pill = new THREE.Mesh(new THREE.CapsuleGeometry(radius * 0.8, radius * 1.6, 8, 16), targetMaterial);
          pill.position.copy(centre);
          pill.rotation.x = Math.PI / 2;
          pill.castShadow = pill.receiveShadow = true;
          root.add(pill);
        } else spikyBall(centre, radius * 0.88, a.target === 'pollen');
        if (t === targets - 1) break;
        // Antibodies bridging this target to the next, fanned round the line between them.
        const middle = new THREE.Vector3(x + step / 2, radius + 0.02, 0.01);
        const n = Math.max(2, count(2, 4));
        for (let i = 0; i < n; i++) {
          const roll = mix(-1.3, 1.3, n === 1 ? 0.5 : i / (n - 1)) + (random() - 0.5) * 0.2;
          const normal = new THREE.Vector3(0, Math.cos(roll), Math.sin(roll));
          const ab = antibody();
          mount(ab, middle.clone().addScaledVector(normal, 0.012), normal, new THREE.Vector3(1, 0, 0));
          motion.push({ group: ab, axis: normal, phase: random() * 6 });
          if (a.complement && i === 0) bouquet(ab);
        }
      }
    } else {
      // IgM: five Ys joined at the stem, arms reaching down to grip the floor, a J-chain at the hub.
      const hub = new THREE.Vector3(0, tipY * 0.7, 0);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.012, 8, 20), hinge);
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(hub);
      ring.castShadow = true;
      root.add(ring);
      const j = new THREE.Mesh(ball, paint(chains.tip, context, a.style));
      j.scale.set(0.014, 0.012, 0.014);
      j.position.copy(hub).add(new THREE.Vector3(0, 0.012, 0));
      root.add(j);
      for (let k = 0; k < 5; k++) {
        const angle = (k / 5) * Math.PI * 2 + 0.3;
        const out = new THREE.Vector3(Math.cos(angle), -0.62, Math.sin(angle)).normalize();
        const ab = antibody();
        ab.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)), out, new THREE.Vector3().crossVectors(new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)), out)));
        ab.position.copy(hub).addScaledVector(out, 0.012);
        root.add(ab);
        motion.push({ group: ab, axis: out, phase: random() * 6 });
        // What it caught, pinned under its tips.
        if (k % 2 === 0 || mood.density > 0.5) {
          const local = new THREE.Vector3(tipX * (random() < 0.5 ? 1 : -1), tipY + 0.02, 0).applyQuaternion(ab.quaternion).add(ab.position);
          if (a.target === 'toxin') toxin(local, 0.03); else spikyBall(local, 0.026, a.target === 'pollen');
        }
      }
      if (a.complement) {
        const b = new THREE.Group();
        b.position.copy(hub).add(new THREE.Vector3(0, 0.02, 0));
        b.rotation.x = Math.PI;
        bouquet(b);
        root.add(b);
      }
    }

    // Settle on the floor and centre: the lowest visible point at y = 0.
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const holder = new THREE.Group();
    holder.add(root);
    root.position.set(-(bounds.min.x + bounds.max.x) / 2, -bounds.min.y, -(bounds.min.z + bounds.max.z) / 2);

    const speed = mix(0.4, 2.4, mood.energy);
    const start = motion.map(({ group }) => group.quaternion.clone());
    const update = (_dt: number, time: number) => {
      motion.forEach(({ group, axis, phase }, i) => {
        const wobble = new THREE.Quaternion().setFromAxisAngle(axis, Math.sin(time * speed + phase) * 0.06);
        group.quaternion.copy(start[i]).premultiply(wobble);
      });
      if (a.lit) (tip.emissiveIntensity = 0.5 + Math.sin(time * speed * 2) * 0.25);
    };
    return { object: holder, update, dispose: () => disposeTree(holder) };
  },
});
