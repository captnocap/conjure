import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, noul, score } from '@conjure/kit';
import { PALETTES, STYLES, bilayer, instances, paint, tone } from './membrane';

const RING: Record<keyof typeof STYLES, { stave: [string, string]; hammer: string; water: string }> = {
  pastel: { stave: ['#8d5fcf', '#7449b8'], hammer: '#e0606a', water: '#7cc6ee' },
  micrograph: { stave: ['#5a5a56', '#6c6c67'], hammer: '#3e3e3b', water: '#d9e2e4' },
  glossy: { stave: ['#8f2fd6', '#6a1fb0'], hammer: '#ff3b4f', water: '#3fb6ff' },
};

export default defineThing({
  questions: {
    stage: choice('How far has the attack got?', {
      assembling: 'Still assembling: an open C-shaped arc, more units drifting in to close it.',
      complete: 'A complete ring, a neat round hole punched straight through.',
      riddled: 'Riddled: several smaller rings have holed the membrane all over.',
      torn: 'Torn open: the ring has ripped a ragged hole and some units have fallen over.',
    }),
    leak: choice('How fast is the fluid pouring in?', {
      trickle: 'A trickle of droplets slipping over the rim.',
      stream: 'A steady swirl of water spiralling down the hole.',
      flood: 'A flood: a whirlpool funnel dragging water and ions into the cell.',
    }),
    decline: score('How far gone is the cell?', ['Still firm and colourful', 'Paling around the wound', 'Bleached white and blistering']),
    width: score('How wide is the ring?', ['Narrow, a dozen units', 'Medium', 'Wide, twenty-odd units']),
    marks: noul('Are antibody flags planted beside it, the marks that called the attack?'),
    style: choice('How is it drawn?', STYLES),
  },

  build(a, context) {
    const { mood, random } = context;
    const palette = PALETTES[a.style];
    const ring = RING[a.style];
    const root = new THREE.Group();
    const R = 0.013, T = 0.12;
    const W = 0.58, D = 0.48;
    const Y = new THREE.Vector3(0, 1, 0);
    const decline = a.decline * 0.85 + mood.wear * 0.15;

    // The rings: where they stand and how big.
    const pores: { x: number; z: number; s: number; fraction: number }[] = [];
    if (a.stage === 'riddled') {
      const n = 3 + Math.round(mood.density);
      for (let i = 0; i < n && pores.length < n; i++) {
        for (let tries = 0; tries < 40; tries++) {
          const x = (random() - 0.5) * (W - 0.2), z = (random() - 0.5) * (D - 0.2);
          if (pores.some((p) => Math.hypot(p.x - x, p.z - z) < 0.16)) continue;
          pores.push({ x, z, s: mix(0.5, 0.65, random()), fraction: 1 });
          break;
        }
      }
    } else pores.push({ x: 0, z: 0, s: 1, fraction: a.stage === 'assembling' ? mix(0.55, 0.75, random()) : 1 });
    const inner = mix(0.05, 0.078, a.width);
    const torn = a.stage === 'torn';
    const ragged = (angle: number) => (torn ? 1 + 0.35 * (0.5 + 0.5 * Math.sin(angle * 3 + 1)) + 0.2 * Math.sin(angle * 7) : 1);

    // Blisters: bumps in the bilayer where the cell is swelling.
    const blebs = Array.from({ length: Math.round(decline * 4) }, () => ({ x: (random() - 0.5) * W * 0.8, z: (random() - 0.5) * D * 0.8, h: mix(0.02, 0.05, random()) * decline }));
    const lift = (x: number, z: number) => {
      let h = 0;
      for (const b of blebs) h += b.h * Math.exp(-((x - b.x) ** 2 + (z - b.z) ** 2) / (2 * 0.045 ** 2));
      for (const p of pores) if (torn) {
        const d = Math.hypot(x - p.x, z - p.z);
        // The torn lip curls up around the hole.
        h += 0.025 * Math.exp(-((d - inner * 1.6) ** 2) / (2 * 0.02 ** 2));
      }
      return h;
    };
    const patch = bilayer(context, palette, {
      width: W, depth: D, head: R, thickness: T, lift,
      hole: (x, z) => pores.some((p) => {
        const d = Math.hypot(x - p.x, z - p.z);
        return d < (inner + 0.03) * p.s * ragged(Math.atan2(z - p.z, x - p.x));
      }),
      pale: (x, z) => {
        const d = Math.min(...pores.map((p) => Math.hypot(x - p.x, z - p.z)));
        return Math.min(0.92, decline * (0.35 + 0.65 * Math.exp(-d / 0.13)));
      },
      mix: 0.3,
      ragged: torn ? 0.4 : 0,
    });
    root.add(patch.group);

    // Staves: tall slabs standing in a ring, each with a bulge at its outer top.
    const staves: { matrix: THREE.Matrix4; color: THREE.Color }[] = [];
    const caps: { matrix: THREE.Matrix4; color: THREE.Color }[] = [];
    const fallen: { matrix: THREE.Matrix4; color: THREE.Color }[] = [];
    const tones = ring.stave.map((hex) => tone(hex, context, decline * 0.15));
    const units = Math.round(mix(12, 22, a.width));
    const tall = T + 0.13;
    const hammers: { base: THREE.Vector3; pore: THREE.Vector3 }[] = [];
    for (const p of pores) {
      const r0 = inner * p.s;
      const width = (Math.PI * 2 * (r0 + 0.012 * p.s)) / units * 0.92;
      const count = Math.round(units * p.fraction);
      const start = random() * Math.PI * 2;
      for (let k = 0; k < count; k++) {
        const angle = start + (k / units) * Math.PI * 2;
        const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
        const colour = tones[k % 2];
        const breaks = torn && random() < 0.25;
        if (breaks) {
          // A unit knocked flat on the membrane beside the hole.
          const at = new THREE.Vector3(p.x, T + 0.012, p.z).addScaledVector(radial, r0 * 1.9 + random() * 0.04);
          const q = new THREE.Quaternion().setFromUnitVectors(Y, radial.clone().applyAxisAngle(Y, (random() - 0.5) * 1.2));
          fallen.push({ matrix: new THREE.Matrix4().compose(at, q, new THREE.Vector3(width, tall * 0.6, 0.024).multiplyScalar(p.s)), color: colour });
          continue;
        }
        const r = r0 * (torn ? ragged(angle) * 0.9 : 1) + 0.012 * p.s;
        const at = new THREE.Vector3(p.x, (tall / 2 - 0.012) * p.s + (1 - p.s) * T * 0.5, p.z).addScaledVector(radial, r);
        const twist = new THREE.Quaternion().setFromAxisAngle(radial, 0.18);
        const lean = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-radial.z, 0, radial.x), torn ? -0.15 - random() * 0.25 : -0.05);
        const face = new THREE.Quaternion().setFromAxisAngle(Y, -angle + Math.PI / 2);
        const q = lean.multiply(twist).multiply(face);
        staves.push({ matrix: new THREE.Matrix4().compose(at, q, new THREE.Vector3(width, tall, 0.024).multiplyScalar(p.s)), color: colour });
        const top = new THREE.Vector3(p.x, (tall - 0.02) * p.s + (1 - p.s) * T * 0.5, p.z).addScaledVector(radial, r + 0.016 * p.s);
        caps.push({ matrix: new THREE.Matrix4().compose(top, q, new THREE.Vector3(width * 0.6, 0.026, 0.02).multiplyScalar(p.s)), color: colour.clone().lerp(new THREE.Color('#ffffff'), 0.2) });
      }
      hammers.push({ base: new THREE.Vector3(p.x + Math.cos(start - 0.4) * (r0 + 0.035), T, p.z + Math.sin(start - 0.4) * (r0 + 0.035)), pore: new THREE.Vector3(p.x, T, p.z) });
      // Stragglers drifting in to close an open ring.
      if (p.fraction < 1) {
        const missing = units - count;
        for (let k = 0; k < Math.min(missing, 4); k++) {
          const angle = start + ((count + k + 0.5) / units) * Math.PI * 2;
          const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
          const at = new THREE.Vector3(p.x, tall * 0.5 + 0.06 + k * 0.05, p.z).addScaledVector(radial, r0 * 1.8 + k * 0.03);
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(random() - 0.5, -angle, 0.6 + random() * 0.6));
          fallen.push({ matrix: new THREE.Matrix4().compose(at, q, new THREE.Vector3(width, tall * 0.9, 0.024)), color: tones[k % 2] });
        }
      }
    }
    const staveMaterial = paint('#ffffff', context, a.style);
    const slab = new THREE.CapsuleGeometry(0.5, 1, 4, 10);
    slab.scale(1, 1 / 2, 1);
    root.add(instances(slab, staveMaterial, staves));
    root.add(instances(new THREE.SphereGeometry(1, 12, 8), staveMaterial, caps));
    if (fallen.length) root.add(instances(slab, staveMaterial, fallen));

    // The trigger complex: a lumpy hooked arm leaning into the ring.
    const hammerMaterial = paint(ring.hammer, context, a.style);
    for (const { base, pore } of hammers.slice(0, a.stage === 'riddled' ? 2 : 1)) {
      const s = a.stage === 'riddled' ? 0.6 : 1;
      const toward = pore.clone().sub(base).setY(0).normalize();
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const blob = new THREE.Mesh(new THREE.SphereGeometry((0.024 - i * 0.002) * s, 14, 10), hammerMaterial);
        blob.position.copy(base).add(new THREE.Vector3(0, (0.03 + Math.sin(t * 2.4) * 0.11) * s, 0)).addScaledVector(toward, -0.03 * s + t * 0.07 * s);
        blob.scale.set(1, 1.25, 1);
        blob.castShadow = true;
        root.add(blob);
      }
    }

    // Antibody flags that marked the cell.
    if (a.marks) {
      const heavy = paint(a.style === 'micrograph' ? '#33332f' : '#2f6fe0', context, a.style);
      const light = paint(a.style === 'micrograph' ? '#8a8a84' : '#ff8a5c', context, a.style);
      for (let k = 0; k < 2 + Math.round(mood.density); k++) {
        const angle = random() * Math.PI * 2;
        const d = inner * 2.3 + random() * 0.06;
        const flag = new THREE.Group();
        const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.05, 4, 8), heavy);
        stem.position.y = 0.035;
        flag.add(stem);
        for (const side of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, 0.045, 4, 8), side < 0 ? light : heavy);
          arm.position.set(side * 0.022, 0.085, 0);
          arm.rotation.z = -side * 0.75;
          flag.add(arm);
        }
        flag.traverse((node) => { node.castShadow = true; });
        flag.position.set(pores[0].x + Math.cos(angle) * d, T - 0.004 + lift(Math.cos(angle) * d, Math.sin(angle) * d), pores[0].z + Math.sin(angle) * d);
        flag.rotation.y = -angle;
        root.add(flag);
      }
    }

    // Water pouring in: droplets on spiral paths down every hole, and a funnel for the stronger leaks.
    const water = tone(ring.water, context);
    const dropMaterial = new THREE.MeshStandardMaterial({ color: water, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.85, emissive: water, emissiveIntensity: 0.15 });
    const drops = Math.round({ trickle: 12, stream: 32, flood: 60 }[a.leak] * mix(0.7, 1.2, mood.density));
    const paths = Array.from({ length: drops }, (_unused, i) => ({ pore: pores[i % pores.length], phase: random(), start: random() * Math.PI * 2, size: mix(0.006, 0.012, random()), ion: a.leak === 'flood' && i % 4 === 0 }));
    const dropMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), dropMaterial, drops);
    dropMesh.castShadow = true;
    root.add(dropMesh);
    const ionMesh = a.leak === 'flood' ? new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: tone(a.style === 'micrograph' ? '#2e2e2c' : '#ffcf3a', context), roughness: 0.4 }), drops) : null;
    if (ionMesh) { ionMesh.castShadow = true; root.add(ionMesh); }
    const funnels: THREE.Mesh[] = [];
    if (a.leak !== 'trickle') {
      for (const p of pores) {
        const r0 = inner * p.s;
        const profile = [new THREE.Vector2(r0 * 0.25, -0.02), new THREE.Vector2(r0 * 0.5, T * 0.6), new THREE.Vector2(r0 * 0.85, tall * p.s * 0.95), new THREE.Vector2(r0 * (a.leak === 'flood' ? 1.3 : 1.0), tall * p.s + 0.01)];
        const funnel = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), new THREE.MeshStandardMaterial({ color: water, transparent: true, opacity: a.leak === 'flood' ? 0.26 : 0.18, depthWrite: false, side: THREE.DoubleSide, roughness: 0.1 }));
        funnel.position.set(p.x, 0, p.z);
        root.add(funnel);
        funnels.push(funnel);
      }
    }
    const m = new THREE.Matrix4();
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    const speed = mix(0.08, 0.45, mood.energy) * (a.leak === 'flood' ? 1.6 : a.leak === 'stream' ? 1.1 : 0.7);
    const place = (time: number) => {
      paths.forEach((path, i) => {
        const t = (path.phase + time * speed) % 1;
        const p = path.pore;
        const r0 = inner * p.s;
        // Over the rim, then spiralling down the throat.
        const outside = (a.leak === 'flood' ? 2.6 : 1.7) * r0;
        const radius = t < 0.45 ? mix(outside, r0 * 0.75, t / 0.45) : mix(r0 * 0.7, r0 * 0.25, (t - 0.45) / 0.55);
        const y = t < 0.45 ? tall * p.s + 0.015 - (t / 0.45) * 0.01 : mix(tall * p.s, -0.04, (t - 0.45) / 0.55);
        const angle = path.start + t * Math.PI * (a.leak === 'flood' ? 6 : 3);
        m.makeScale(path.size, path.size * 1.2, path.size).setPosition(p.x + Math.cos(angle) * radius, y, p.z + Math.sin(angle) * radius);
        if (path.ion && ionMesh) { ionMesh.setMatrixAt(i, m); dropMesh.setMatrixAt(i, hidden); }
        else { dropMesh.setMatrixAt(i, m); ionMesh?.setMatrixAt(i, hidden); }
      });
      dropMesh.instanceMatrix.needsUpdate = true;
      if (ionMesh) ionMesh.instanceMatrix.needsUpdate = true;
    };
    place(0);

    const update = (_dt: number, time: number) => {
      place(time);
      for (const funnel of funnels) funnel.rotation.y = time * speed * 4;
    };
    return { object: root, update, dispose: () => disposeTree(root) };
  },
});
