import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Bag, type V3, at, ball, lumpy, taper } from './bits';

const PERCHES = {
  twig: 'A bare upright twig with a bud or two.',
  cane: 'A jointed bamboo garden cane.',
  reed: 'A broad green grass blade, bending under the weight.',
  bark: 'A slab of rough furrowed tree bark.',
  post: 'A weathered grey fence post with a rusty nail in it.',
} as const;
const ATTITUDES = {
  climbing: 'Upright, head to the sky, exactly where it stopped climbing.',
  leaning: 'Hanging from the underside of a leaning stem, back to the ground.',
  fallen: 'Let go at last: lying on its side on the ground at the foot of the stem, claws grasping at nothing.',
} as const;
const TINTS = {
  honey: { hex: '#c98a3a', glow: '#8a4a08', text: 'Honey amber, glowing where the light comes through.' },
  straw: { hex: '#dcc38a', glow: '#8a6c2c', text: 'Pale straw, papery and nearly clear.' },
  mud: { hex: '#7c5c3e', glow: '#2a1a0c', text: 'Dull brown and caked with the dried mud it dug up through.' },
  gold: { hex: '#e6a628', glow: '#c06a00', text: 'Bright lit gold, like a little lantern.' },
} as const;
type Tint = keyof typeof TINTS;
const COMPANY = {
  alone: 'Just the one.',
  stacked: 'A second husk clings a little higher up the same stem.',
  piggyback: 'Another husk clings to this one\'s back, having climbed over it.',
  queue: 'Three in a row up the stem, like a queue that never moved.',
} as const;
const LEFT = {
  nothing: 'Nothing: whatever came out is long gone.',
  adult: 'The cicada itself, pale green and soft, resting just above its old skin while its wings dry.',
  wing: 'A single clear veined wing lying on the ground below.',
  hole: 'The neat round hole it dug out of, with a little mud chimney, at the foot of the stem.',
} as const;

export default defineThing({
  questions: {
    perch: choice('What is the husk clinging to?', PERCHES),
    attitude: choice('How is it holding on?', ATTITUDES),
    tint: choice('What colour is the shell?', Object.fromEntries(Object.entries(TINTS).map(([key, value]) => [key, value.text])) as Record<Tint, string>),
    split: score('How wide is the split down its back?', ['A hairline crack', 'Clearly open', 'Gaping wide, the whole back burst']),
    threads: noul('Do white threads trail out of the split?'),
    company: choice('Is it the only one?', COMPANY),
    left: choice('What else has been left at the scene?', LEFT),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = TINTS[a.tint];
    const amber = new THREE.Color(tint.hex).lerp(new THREE.Color('#7c5c3e'), mood.wear * 0.35);
    const muddy = a.tint === 'mud';
    const shell = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: muddy ? 0.85 : 0.28, side: THREE.DoubleSide, emissive: tint.glow, emissiveIntensity: mix(0.18, 0.5, mood.cheer) * (1 - mood.wear * 0.4) });
    const dull = s.material('#ffffff', { roughness: 0.95 });
    const hollow = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: THREE.DoubleSide });

    const makeHusk = () => {
      const husk = new THREE.Group(), bag = new Bag();
      const shade = (k: number) => amber.clone().offsetHSL(0, 0, k);
      // Abdomen: overlapping rings tapering to the tail, curled toward the stem.
      for (let i = 0; i < 8; i++) {
        const t = i / 7, r = mix(1.5, 4.3, Math.sin(t * Math.PI * 0.55 + 0.12));
        bag.add(shell, ball(1, 14), at([0, 0.9 + i * 1.72, -((1 - t) ** 2) * 2.4], [0.25 * (1 - t), 0, 0], [r, 1.35, r * 0.88]), shade(i % 2 ? 0.02 : -0.04));
      }
      // Thorax: two half shells swung apart about the belly, the gap showing the hollow.
      const gap = mix(0.035, 0.3, a.split);
      for (const side of [-1, 1]) {
        const half = new THREE.SphereGeometry(1, 14, 14, side > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI);
        half.scale(4.7, 4.9, 4.5);
        half.translate(0, 0, 4.5);
        half.rotateY(side * gap);
        half.translate(0, 17.3, -3.7);
        bag.add(shell, half, undefined, shade(0.03));
        // The ragged pale lip of the tear.
        bag.add(dull, taper([[side * Math.sin(gap) * 8.2, 13.6, 4.2], [side * Math.sin(gap) * 9.2, 17.5, 5.2], [side * Math.sin(gap) * 7.4, 21.6, 3.6]], () => 0.2, 8, 4), undefined, '#f2e6c8');
      }
      bag.add(hollow, ball(1, 12), at([0, 17.3, 0.4], [0, 0, 0], [3.6, 4.2, 3.6]), '#4a2e14');
      if (a.threads) for (let i = 0; i < 4; i++) {
        const x = (random() - 0.5) * 1.2, y = 15 + random() * 5;
        bag.add(dull, taper([[x, y, 3.2], [x + (random() - 0.5) * 2, y + 1 + random() * 2, 6.5 + random() * 2], [x + (random() - 0.5) * 4, y - 1 + random() * 3, 8.5 + random() * 3], [x + (random() - 0.5) * 5, y - 3 + random() * 2, 9 + random() * 3]], () => 0.11, 12, 4), undefined, '#fbf8ef');
      }
      // Head, eye caps, ribbed face and antennae.
      bag.add(shell, ball(1, 14), at([0, 22.7, 0.2], [0, 0, 0], [4.3, 2.3, 3.2]), shade(0));
      for (const side of [-1, 1]) {
        bag.add(shell, ball(1.35, 12), at([side * 4.1, 23.1, 0.4]), shade(0.1));
        bag.add(shell, taper([[side * 1.4, 24.2, -1.2], [side * 2, 26, -2], [side * 2.4, 27.2, -3.2]], (t) => mix(0.2, 0.07, t), 6, 4), undefined, shade(-0.05));
        // Wing buds.
        bag.add(shell, ball(1, 10), at([side * 4.3, 14.6, -0.8], [0.2, 0, side * 0.2], [1.3, 3.7, 2.5]), shade(0.05));
        // Digging forelegs: thick, toothed, hooked onto the stem.
        bag.add(shell, taper([[side * 2.6, 20.2, -2.2], [side * 5.6, 21.8, -4.6], [side * 4.2, 24.6, -6.6], [side * 2.3, 25, -7.3]], (t) => mix(1.25, 0.35, t), 12, 6), undefined, shade(-0.02));
        for (let k = 0; k < 3; k++) bag.add(shell, new THREE.ConeGeometry(0.34, 1.1, 4), at([side * (5.3 - k * 0.5), 22.4 + k * 0.9, -5.6 - k * 0.4], [-1.2, 0, side * 0.5]), shade(-0.1));
        bag.add(shell, taper([[side * 3, 17.6, -2.8], [side * 6.6, 17.2, -4.8], [side * 5, 18.4, -6.9], [side * 2.4, 18.8, -7.4]], (t) => mix(0.55, 0.2, t), 10, 5), undefined, shade(-0.03));
        bag.add(shell, taper([[side * 3, 15.4, -2.8], [side * 6.4, 12.6, -4.6], [side * 4.8, 11.2, -6.9], [side * 2.3, 10.6, -7.4]], (t) => mix(0.55, 0.2, t), 10, 5), undefined, shade(-0.03));
      }
      const face = ball(1, 10);
      bag.add(shell, face, at([0, 22.4, -2.7], [0, 0, 0], [1.9, 2.3, 1.7]), shade(-0.03));
      for (let k = 0; k < 5; k++) bag.add(shell, new THREE.TorusGeometry(1.75, 0.13, 4, 12, Math.PI), at([0, 21 + k * 0.7, -2.9], [Math.PI / 2, 0, 0], [1, 0.95, 1]).multiply(at([0, 0, 0], [0, 0, Math.PI])), shade(-0.12));
      if (muddy || mood.wear > 0.6) for (let i = 0; i < 22; i++) {
        const y = random() * 24, t = random() * 6.3;
        bag.add(dull, new THREE.DodecahedronGeometry(0.3 + random() * 0.5), at([Math.cos(t) * 3.9, y, Math.sin(t) * 3.4], [random() * 3, random() * 3, 0]), '#5a4330');
      }
      bag.flush(husk);
      return husk;
    };

    // The perch. Its front face sits at z = 0 and it rises from y = 0.
    const stand = new THREE.Group(), bag = new Bag();
    s.root.add(stand);
    let tall = 64, gripY = 22;
    if (a.perch === 'twig') {
      const bark = new THREE.Color('#5c4636');
      bag.add(dull, taper([[0.4, 0, -2.4], [-0.3, 22, -2.5], [0.3, 44, -2.2], [-0.2, tall, -1.9]], (t) => mix(2.5, 1.7, t), 18, 8), undefined, bark);
      bag.add(dull, taper([[0.2, 46, -2.2], [5, 52, -4], [8, 60, -4.5]], (t) => mix(1.1, 0.5, t), 8, 6), undefined, bark);
      bag.add(dull, new THREE.ConeGeometry(1, 3, 6), at([8.2, 61, -4.5], [0, 0, -0.3]), '#7a5a3a');
      bag.add(dull, new THREE.ConeGeometry(1.5, 3.6, 6), at([-0.2, tall + 1.6, -1.9]), '#7a5a3a');
    } else if (a.perch === 'cane') {
      tall = 70;
      const cane = new THREE.Color('#b9a86a').lerp(new THREE.Color('#8f9a56'), 0.3 * (1 - mood.wear));
      bag.add(s.material('#ffffff', { roughness: 0.45 }), new THREE.CylinderGeometry(2.5, 2.7, tall, 12), at([0, tall / 2, -2.7]), cane);
      for (let y = 8; y < tall; y += 17) bag.add(dull, new THREE.TorusGeometry(2.75, 0.4, 5, 14), at([0, y, -2.7], [Math.PI / 2, 0, 0]), '#6e6238');
      bag.add(dull, new THREE.CircleGeometry(1.7, 10), at([0, tall + 0.05, -2.7], [-Math.PI / 2, 0, 0]), '#4a4026');
    } else if (a.perch === 'reed') {
      tall = 72;
      const blade = new THREE.Color().setHSL(mix(0.3, 0.2, mood.warmth), mix(0.4, 0.65, mood.cheer), 0.38).lerp(new THREE.Color('#a8975c'), mood.wear * 0.6);
      const g = taper([[0, 0, -0.5], [0, 24, -0.5], [0, 48, -1.2], [0, 62, -5], [0, tall, -14]], (t) => mix(1, 0.12, t ** 3), 20, 8);
      g.scale(4.2, 1, 1);
      const p = g.getAttribute('position');
      for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * 1 - Math.abs(p.getX(i)) * 0.18 + (p.getZ(i) > -0.5 ? -0.55 : 0));
      g.computeVertexNormals();
      bag.add(s.material('#ffffff', { roughness: 0.6, side: THREE.DoubleSide }), g, undefined, blade);
      bag.add(dull, taper([[0, 0, -0.2], [0, 48, -0.9], [0, 62, -4.7]], () => 0.3, 10, 4), undefined, blade.clone().offsetHSL(0, 0, 0.12));
    } else if (a.perch === 'bark') {
      tall = 60;
      bag.add(dull, lumpy(new THREE.BoxGeometry(30, tall, 6, 6, 8, 1), 0.03, 0.2, random() * 9), at([0, tall / 2, -3.4]), '#4d3a2c');
      for (let i = 0; i < 16; i++) {
        const x = -13.5 + i * 1.8 + random() * 0.8, h = tall * (0.3 + random() * 0.5);
        bag.add(dull, new THREE.BoxGeometry(0.9 + random() * 0.8, h, 1), at([x, random() * (tall - h) + h / 2, -0.5], [0, 0, (random() - 0.5) * 0.06]), random() < 0.5 ? '#33251b' : '#665040');
      }
      gripY = 18;
    } else {
      tall = 56;
      const grey = new THREE.Color('#8b877c').lerp(new THREE.Color('#6d6558'), mood.wear * 0.5);
      bag.add(dull, new THREE.BoxGeometry(15, tall, 15), at([0, tall / 2, -7.5]), grey);
      bag.add(dull, new THREE.ConeGeometry(10.6, 3, 4), at([0, tall + 1.5, -7.5], [0, Math.PI / 4, 0]), grey.clone().offsetHSL(0, 0, 0.05));
      for (let i = 0; i < 9; i++) bag.add(dull, new THREE.BoxGeometry(0.35, tall * (0.3 + random() * 0.6), 0.2), at([-6.5 + i * 1.6 + random(), tall * (0.3 + random() * 0.4), 0.02]), '#5d584e');
      bag.add(s.material('#ffffff', { roughness: 0.6, metalness: 0.5 }), new THREE.CylinderGeometry(0.35, 0.35, 4, 6), at([4.6, tall - 9, 1.5], [Math.PI / 2 - 0.3, 0, 0]), '#8a4a2a');
      bag.add(s.material('#ffffff', { roughness: 0.6, metalness: 0.5 }), new THREE.CylinderGeometry(1, 1, 0.3, 8), at([4.6, tall - 8.4, 3.4], [Math.PI / 2 - 0.3, 0, 0]), '#8a4a2a');
      gripY = 16;
    }
    bag.flush(stand);

    const husks: THREE.Group[] = [];
    const plan: { y: number; x: number; z: number; scale: number; tilt: number }[] = [{ y: gripY, x: 0, z: 7.3, scale: 1, tilt: (random() - 0.5) * 0.12 }];
    if (a.company === 'stacked') plan.push({ y: gripY + 19 + random() * 2, x: (random() - 0.5) * 2, z: 7.3 * 0.85, scale: 0.85, tilt: (random() - 0.5) * 0.3 });
    if (a.company === 'piggyback') plan.push({ y: gripY + 7, x: 0.5, z: 7.3 + 6.6, scale: 0.86, tilt: 0.1 });
    if (a.company === 'queue') { plan[0].y = gripY - 10; plan.push({ y: gripY + 7, x: 0.6, z: 7.3 * 0.8, scale: 0.8, tilt: -0.1 }, { y: gripY + 22, x: -0.4, z: 7.3 * 0.72, scale: 0.72, tilt: 0.12 }); }
    plan.forEach((spot, index) => {
      const husk = makeHusk();
      husk.scale.setScalar(spot.scale);
      husk.position.set(spot.x, spot.y, spot.z);
      husk.rotation.z = spot.tilt;
      if (a.attitude === 'fallen' && index === 0) {
        husk.rotation.set(0.25, 0.5 + random() * 0.5, Math.PI / 2 - 0.2);
        husk.position.set(9, 0, 13);
        s.root.add(husk);
        husk.updateMatrixWorld(true);
        husk.position.y -= new THREE.Box3().setFromObject(husk).min.y - 0.6;
      } else stand.add(husk);
      husks.push(husk);
    });

    const extra = new Bag();
    if (a.left === 'adult') {
      const soft = new THREE.Color('#bfe2a8').lerp(new THREE.Color('#e9f0c8'), mood.cheer * 0.4);
      const skin = s.material('#ffffff', { roughness: 0.45, emissive: '#3a5a20', emissiveIntensity: 0.25 });
      const top = Math.max(...plan.map((spot) => spot.y + 27 * spot.scale));
      const y0 = Math.min(top + 2, tall - 22), z0 = a.perch === 'reed' ? 3.6 : 4.2;
      const body = new THREE.LatheGeometry([[0.05, 0], [1.6, 2], [3.2, 7], [3.9, 12], [4.1, 16], [3.5, 19.5], [0.05, 20.5]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
      extra.add(skin, body, at([0, y0, z0], [0, 0, 0], [1, 1, 0.85]), soft);
      extra.add(skin, ball(1, 12), at([0, y0 + 20.2, z0 - 0.2], [0, 0, 0], [4.2, 2, 2.9]), soft.clone().offsetHSL(0, 0, -0.04));
      for (const side of [-1, 1]) {
        extra.add(s.material('#ffffff', { roughness: 0.15 }), ball(1.2, 10), at([side * 4, y0 + 20.6, z0]), '#8a2f24');
        for (let leg = 0; leg < 3; leg++) extra.add(skin, taper([[side * 2.4, y0 + 17 - leg * 2.6, z0 - 2], [side * 5.2, y0 + 18 - leg * 3, z0 - 3.4], [side * 2.6, y0 + 19.5 - leg * 3.4, -0.2]], (t) => mix(0.5, 0.2, t), 8, 5), undefined, soft.clone().offsetHSL(0, 0, -0.1));
        // Wings: still soft and pale, folded like a tent, with one firm leading vein each.
        const outline = new THREE.Shape();
        outline.moveTo(0, 0);
        outline.bezierCurveTo(5.5, -3, 8.5, -16, 4.5, -27);
        outline.bezierCurveTo(1.5, -29, -1.5, -22, 0, 0);
        const wing = new THREE.Mesh(new THREE.ShapeGeometry(outline, 10), new THREE.MeshStandardMaterial({ color: '#e9f6dc', transparent: true, opacity: 0.42, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false, emissive: '#9fc48a', emissiveIntensity: 0.3 }));
        wing.position.set(side * 2.2, y0 + 17.5, z0 + 2.4);
        wing.rotation.set(0.12, side * 1.05, side * 0.16, 'YXZ');
        if (side < 0) wing.scale.x = -1;
        stand.add(wing);
        extra.add(skin, taper([[side * 2.2, y0 + 17.5, z0 + 2.4], [side * 5, y0 + 6, z0 + 6.4], [side * 3.4, y0 - 8.5, z0 + 7.6]], (t) => mix(0.36, 0.14, t), 10, 4), undefined, '#8fb56e');
        extra.add(skin, taper([[side * 2, y0 + 17, z0 + 2.6], [side * 2.4, y0 + 4, z0 + 4.6], [side * 2.8, y0 - 8, z0 + 7.4]], () => 0.12, 8, 4), undefined, '#8fb56e');
      }
    }
    extra.flush(stand);

    // The ground at the foot of the stem.
    const floor = new Bag();
    floor.add(dull, lumpy(ball(1, 16), 0.1, 3, random() * 9), at([0, -0.3, a.perch === 'post' ? -4 : 0], [0, 0, 0], [a.perch === 'bark' ? 19 : 14, 1.6, 13]), '#3a2b1f');
    for (let i = 0; i < 18; i++) {
      const t = random() * 6.3, r = 6 + random() * 8;
      floor.add(dull, new THREE.DodecahedronGeometry(0.5 + random() * 0.9), at([Math.cos(t) * r, 0.6, Math.sin(t) * r * 0.85], [random() * 3, random() * 3, 0]), random() < 0.3 ? '#6a5139' : '#2c2018');
    }
    if (a.left === 'hole') {
      floor.add(dull, new THREE.LatheGeometry([[2.4, 0], [4, 0.2], [3.4, 3.6], [2.6, 4.4], [2.2, 4.2], [2.3, 0.4]].map(([x, y]) => new THREE.Vector2(x, y)), 14), at([-7, 0.9, 8]), '#5e4732');
      floor.add(hollow, new THREE.CircleGeometry(2.3, 14), at([-7, 4.4, 8], [-Math.PI / 2, 0, 0]), '#0d0806');
    }
    if (a.left === 'wing') {
      const outline = new THREE.Shape();
      outline.moveTo(0, 0);
      outline.bezierCurveTo(6, -3, 9, -17, 4.5, -29);
      outline.bezierCurveTo(1.5, -31, -1.5, -23, 0, 0);
      const veins = new THREE.Group();
      veins.position.set(-11, 1.9, 6);
      veins.rotation.set(-Math.PI / 2 + 0.12, 0, -1.9, 'YXZ');
      const membrane = new THREE.Mesh(new THREE.ShapeGeometry(outline, 10), new THREE.MeshStandardMaterial({ color: '#f1f4e6', transparent: true, opacity: 0.6, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false }));
      veins.add(membrane);
      const lines = new Bag();
      lines.add(dull, taper([[0, 0, 0.05], [6, -9, 0.05], [5, -28, 0.05]], () => 0.28, 12, 4), undefined, '#4a3a22');
      lines.add(dull, taper([[0, 0, 0.05], [-0.4, -14, 0.05], [3.2, -29.5, 0.05]], () => 0.18, 12, 4), undefined, '#4a3a22');
      for (let k = 0; k < 4; k++) lines.add(dull, taper([[0.4, -3 - k, 0.05], [2.6 + k * 0.5, -12 - k * 2, 0.05], [3.4 + k * 0.4, -22 - k * 1.8, 0.05]], () => 0.12, 8, 4), undefined, '#6a5632');
      lines.flush(veins);
      s.root.add(veins);
    }
    floor.flush(s.root);

    if (a.attitude === 'leaning') {
      stand.rotation.x = 0.5;
      stand.rotation.z = (random() - 0.5) * 0.2;
    } else stand.rotation.z = (random() - 0.5) * 0.08;

    s.root.scale.setScalar(0.0021);
    const pace = mix(0.4, 2.6, mood.energy), amount = mix(0.003, 0.03, mood.energy), baseZ = stand.rotation.z;
    return s.finish({ footprint: 0.03, update: (_dt, time) => { stand.rotation.z = baseZ + Math.sin(time * pace) * amount; } });
  },
});
