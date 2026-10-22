import * as THREE from 'three';
import { choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Bag, type Tone, V, aim, arc, finish, matte, tube, xf } from './bits';

const SILKS = { tan: '#c9a56a', gold: '#e3bb3f', white: '#ebe7da', grey: '#a09a8c', green: '#b3b877' } as const;

export default defineThing({
  questions: {
    state: choice('What stage has it reached?', {
      sealed: 'Sealed tight and silent, the eggs waiting out the cold.',
      cluster: 'Just hatched: the spiderlings sit massed in a golden ball on the threads beside it.',
      ballooning: 'Torn open, a cloud of pinhead spiderlings climbing the threads and sailing away on gossamer.',
      empty: 'A torn and empty husk, everyone long gone.',
    }),
    shape: choice('What shape is the sac?', {
      teardrop: 'A hanging teardrop, narrow at the top.',
      ball: 'A plain round ball.',
      flask: 'A flask or urn with a narrow neck and a flared lip.',
      cushion: 'A flattened lens-shaped cushion.',
      fluff: 'A shapeless woolly mass of floss.',
    }),
    silk: choice('What colour is the silk?', {
      tan: 'Papery tan, like a wasp nest.',
      gold: 'Golden yellow floss.',
      white: 'Fresh clean white.',
      grey: 'Weathered grey.',
      green: 'Faintly green, camouflaged.',
    }),
    mount: choice('What is it fixed to?', {
      stem: 'The side of a tall dry stem, with a blade to guy it to.',
      fork: 'The fork of a bare twig.',
      leaf: 'Under the roof of a curled dead leaf.',
      umbel: 'Among the spokes of a dry seed head.',
    }),
    guys: score('How many guy threads hold it?', ['Three or four lines', 'A dozen', 'A dense tangle of scaffolding']),
    mother: noul('Is the dead mother still clinging to it?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group(), plume = new THREE.Group();
    const plant = new Bag(), sac = new Bag(), silk = new Bag(), tiny = new Bag(), gossamer = new Bag(), flyers = new Bag();
    const tone = (c: Tone, lift = 0) => new THREE.Color(c).offsetHSL((mood.warmth - 0.5) * 0.03, (mood.cheer - 0.5) * 0.2, lift);
    const silkTone = tone(SILKS[a.silk]).lerp(new THREE.Color('#9b9486'), mood.wear * 0.35);
    const line = new THREE.Color('#8d9aa5').lerp(silkTone, 0.3);
    const stemTone = tone('#b59c62').lerp(new THREE.Color('#6f9a45'), (1 - mood.wear) * 0.35);
    const twigTone = tone('#4d3c31');
    const R = 0.062, C = V(0, 0.25, 0);
    const anchors: THREE.Vector3[] = [];

    // What it hangs on.
    if (a.mount === 'stem') {
      const stem = arc(V(-0.1, 0, 0), V(-0.07, 0.46, 0), V(-0.015, 0, 0), 14);
      plant.add(tube(stem, (t) => mix(0.008, 0.004, t), { sides: 6 }), stemTone);
      const blade = arc(stem[5], stem[5].clone().add(V(0.22, 0.2, 0.02)), V(0.03, 0.05, 0), 10);
      plant.add(tube(blade, (t) => mix(0.011, 0.001, t), { sides: 5, flat: 0.18 }), stemTone);
      for (let i = 0; i < 7; i++) { const p = stem[14].clone().add(V(0, 0.011 * i, 0)); plant.add(new THREE.SphereGeometry(1, 8, 6), stemTone.clone().offsetHSL(0, 0, -0.06), aim(p, p.clone().add(V(i % 2 ? 0.6 : -0.6, 1, 0)), V(0.006, 0.013, 0.006))); }
      anchors.push(...stem.slice(4, 14), ...blade.slice(2, 10));
    } else if (a.mount === 'fork') {
      const trunk = arc(V(0.01, 0, 0), V(0, 0.15, 0), V(0.01, 0, 0), 6);
      const left = arc(V(0, 0.15, 0), V(-0.14, 0.44, 0.01), V(-0.03, 0, 0), 8), right = arc(V(0, 0.15, 0), V(0.13, 0.4, -0.01), V(0.035, 0, 0), 8);
      plant.add(tube(trunk, 0.011, { sides: 7 }), twigTone);
      for (const branch of [left, right]) {
        plant.add(tube(branch, (t) => mix(0.009, 0.003, t), { sides: 6 }), twigTone);
        plant.add(new THREE.SphereGeometry(1, 8, 6), tone('#7a5a3a'), xf(branch[8].clone().add(V(0, 0.008, 0)), V(0.006, 0.011, 0.006)));
        const twig = branch[5], side = branch === left ? -1 : 1;
        plant.add(tube([twig, twig.clone().add(V(side * 0.06, 0.05, 0.02))], (t) => mix(0.004, 0.002, t), { sides: 5 }), twigTone);
        anchors.push(...branch.slice(2));
      }
    } else if (a.mount === 'leaf') {
      const stem = arc(V(-0.13, 0, 0), V(-0.1, 0.4, 0), V(-0.02, 0, 0), 12);
      plant.add(tube(stem, (t) => mix(0.008, 0.004, t), { sides: 6 }), stemTone);
      const leafTone = tone('#9a6a36').lerp(new THREE.Color('#6d5a3d'), mood.wear * 0.5);
      const roof = arc(stem[12], V(0.14, 0.27, 0.01), V(0.04, 0.1, 0), 12);
      plant.add(tube(roof, (t) => 0.004 + 0.085 * Math.sin(Math.min(1, t * 1.1) * Math.PI) ** 0.7, { sides: 10, flat: 0.07, up: V(0, 1, 0) }), leafTone);
      plant.add(tube(roof.map((p) => p.clone().add(V(0, 0.004, 0))), 0.0022, { sides: 4 }), leafTone.clone().offsetHSL(0, 0, -0.1));
      anchors.push(...stem.slice(5, 12), ...roof.slice(2, 12), ...roof.slice(3, 10).map((p) => p.clone().add(V(0, 0, 0.05))), ...roof.slice(3, 10).map((p) => p.clone().add(V(0, 0, -0.05))));
    } else {
      const stem = arc(V(0.03, 0, 0), V(0, 0.15, 0), V(-0.015, 0, 0), 8);
      plant.add(tube(stem, (t) => mix(0.009, 0.006, t), { sides: 6 }), stemTone);
      const spokes = 10 + Math.floor(random() * 4);
      for (let i = 0; i < spokes; i++) {
        const angle = (i / spokes) * Math.PI * 2, tip = V(Math.cos(angle) * 0.15, 0.36 + random() * 0.06, Math.sin(angle) * 0.15);
        const spoke = arc(stem[8], tip, V(Math.cos(angle) * 0.03, -0.03, Math.sin(angle) * 0.03), 8);
        plant.add(tube(spoke, 0.0024, { sides: 5 }), stemTone);
        for (let k = 0; k < 5; k++) { const end = tip.clone().add(V((random() - 0.5) * 0.04, 0.02 + random() * 0.02, (random() - 0.5) * 0.04)); plant.add(tube([tip, end], 0.001, { sides: 3 }), stemTone); plant.add(new THREE.SphereGeometry(1, 5, 4), stemTone.clone().offsetHSL(0, 0, -0.1), xf(end, V(0.004, 0.003, 0.004))); }
        anchors.push(...spoke.slice(3));
      }
    }

    // The sac itself.
    const torn = a.state === 'ballooning' || a.state === 'empty';
    const shape = (x: number, y: number, z: number) => {
      const around = Math.atan2(z, x);
      if (a.shape === 'teardrop') { const k = 1 - 0.55 * Math.max(0, y) ** 1.4; return V(x * k, y * 1.3 + 0.1, z * k); }
      if (a.shape === 'flask') {
        if (y > 0.6) { const n = (y - 0.6) / 0.4, k = (0.34 + 0.2 * n ** 4) / Math.max(0.05, Math.hypot(x, z)); return V(x * k, 0.6 + n * 0.75, z * k); }
        return V(x * 1.02, y, z * 1.02);
      }
      if (a.shape === 'cushion') return V(x * 1.2, y * 1.15, z * 0.55);
      if (a.shape === 'fluff') { const k = 1.08 + 0.14 * Math.sin(around * 3 + y * 4) + 0.1 * Math.sin(y * 9 + around * 5); return V(x * k, y * k * 0.95, z * k); }
      return V(x, y, z);
    };
    const tearAt = V(0.45, -0.25, 0.86).normalize();
    {
      const shell = new THREE.SphereGeometry(1, 32, 24);
      const p = shell.getAttribute('position'), colours = new Float32Array(p.count * 3), tint = new THREE.Color();
      const dark = new THREE.Color('#2b2018'), slump = a.state === 'empty' ? 0.09 : 0;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), around = Math.atan2(z, x);
        const q = shape(x, y, z);
        const crumple = 1 + (mood.wear * 0.05 + slump) * Math.sin(around * 5 + y * 7) * Math.sin(y * 6);
        p.setXYZ(i, q.x * crumple, q.y * (1 - slump * 0.5), q.z * crumple);
        tint.copy(silkTone).offsetHSL(0, 0, 0.05 * Math.sin(y * 26 + around * 3) + 0.03 * Math.sin(around * 17));
        if (torn) { const near = V(x, y, z).distanceTo(tearAt); if (near < 0.5) tint.lerp(dark, Math.min(1, (0.5 - near) / 0.12)); }
        colours.set([tint.r, tint.g, tint.b], i * 3);
      }
      shell.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      shell.computeVertexNormals();
      sac.add(shell, null, xf(C, R));
    }
    const surface = (d: THREE.Vector3, out = 1) => { const q = shape(d.x, d.y, d.z); return C.clone().addScaledVector(q, R * out); };
    if (torn) {
      // Ragged flaps of the outer wall peel back round the hole.
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2 + random() * 0.5;
        const side = V().crossVectors(tearAt, V(0, 1, 0)).normalize(), up = V().crossVectors(side, tearAt);
        const edge = tearAt.clone().addScaledVector(side, Math.cos(angle) * 0.46).addScaledVector(up, Math.sin(angle) * 0.46).normalize();
        const from = surface(edge), tip = from.clone().addScaledVector(tearAt, 0.03 + random() * 0.025).addScaledVector(edge.clone().sub(tearAt), 0.035);
        sac.add(tube([from, from.clone().lerp(tip, 0.5).addScaledVector(tearAt, 0.012), tip], (t) => mix(0.016, 0.003, t), { sides: 5, flat: 0.15, up: tearAt, smooth: 6 }), silkTone.clone().offsetHSL(0, 0, 0.05));
      }
    }
    if (a.shape === 'fluff' || a.silk === 'gold') {
      for (let i = 0; i < 90; i++) {
        const d = V(random() - 0.5, random() - 0.5, random() - 0.5).normalize(), from = surface(d, 0.95);
        const tip = from.clone().addScaledVector(d, 0.012 + random() * 0.02).add(V((random() - 0.5) * 0.02, (random() - 0.5) * 0.02, (random() - 0.5) * 0.02));
        sac.add(tube([from, tip], 0.0011, { sides: 3 }), silkTone.clone().offsetHSL(0, 0, 0.06));
      }
    }
    // Windings over the surface and the guy lines out to the plant.
    for (let k = 0; k < 3; k++) {
      const axis = V(random() - 0.5, random() - 0.5, random() - 0.5).normalize(), u = V().crossVectors(axis, V(0.3, 1, 0.2)).normalize(), w = V().crossVectors(axis, u);
      const loop = Array.from({ length: 25 }, (_unused, i) => { const t = (i / 24) * Math.PI * 2; return surface(u.clone().multiplyScalar(Math.cos(t)).addScaledVector(w, Math.sin(t)).addScaledVector(axis, 0.3 * Math.sin(t * 2)).normalize(), 1.02); });
      silk.add(tube(loop, 0.001, { sides: 4 }), line);
    }
    const guyCount = Math.round(mix(4, 26, a.guys));
    const ends: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < guyCount; i++) {
      const to = anchors[Math.floor(random() * anchors.length)];
      const d = to.clone().sub(C).normalize().add(V((random() - 0.5) * 0.9, (random() - 0.5) * 0.9, (random() - 0.5) * 0.9)).normalize();
      const from = surface(d, 0.98);
      silk.add(tube([from, to], 0.0011, { sides: 4 }), line);
      ends.push([from, to]);
    }
    // Always one line straight up so it never floats loose.
    const topAnchor = anchors.reduce((best, p) => (p.y > best.y ? p : best), anchors[0]);
    silk.add(tube([surface(V(0, 1, 0), 0.98), topAnchor], 0.0013, { sides: 4 }), line);
    ends.push([surface(V(0, 1, 0)), topAnchor]);

    // Spiderlings: a yellow bead of a body with a dark patch and a dark head.
    const yolk = tone('#e9b93a'), ink = tone('#2a211a');
    const ling = (bag: Bag, p: THREE.Vector3, size: number) => {
      const turn = new THREE.Euler(random() * 3, random() * 3, random() * 3);
      bag.add(new THREE.SphereGeometry(1, 6, 5), yolk, xf(p, V(size, size * 1.25, size), turn));
      const m = xf(p, size, turn);
      bag.add(new THREE.SphereGeometry(1, 5, 4), ink, m.clone().multiply(xf(V(0, -0.9, 0.35), V(0.6, 0.55, 0.5))));
      bag.add(new THREE.SphereGeometry(1, 5, 4), ink, m.clone().multiply(xf(V(0, 1.35, 0), 0.6)));
      for (const sx of [-1, 1]) bag.add(tube([V(sx * 0.3, 1.2, 0), V(sx * 1.5, 1.9, 0.3), V(sx * 1.9, 0.6, -0.2)], 0.09, { sides: 3 }), ink, m);
    };
    const crowd = Math.round(mix(40, 150, mood.density));
    if (a.state === 'cluster') {
      const [from, to] = ends[ends.length - 1];
      const ballAt = from.clone().lerp(to, 0.45).add(V(0.035, 0.0, 0.03)), br = mix(0.03, 0.045, mood.density);
      for (let i = 0; i < crowd * 1.3; i++) {
        const d = V(random() - 0.5, random() - 0.5, random() - 0.5).normalize().multiplyScalar(br * random() ** 0.4);
        ling(tiny, ballAt.clone().add(d), 0.0042 + random() * 0.0012);
      }
      for (let i = 0; i < 8; i++) silk.add(tube([ballAt.clone().add(V((random() - 0.5) * 0.05, (random() - 0.5) * 0.05, (random() - 0.5) * 0.05)), anchors[Math.floor(random() * anchors.length)]], 0.0009, { sides: 3 }), line);
      silk.add(tube([ballAt, surface(V(0.3, 0.8, 0.4).normalize())], 0.001, { sides: 3 }), line);
    } else if (a.state === 'ballooning') {
      // Some still spill from the tear, some climb the guys, the boldest sail off on gossamer.
      for (let i = 0; i < crowd * 0.35; i++) ling(tiny, surface(tearAt.clone().add(V((random() - 0.5) * 0.9, (random() - 0.5) * 0.9, (random() - 0.5) * 0.5)).normalize(), 1.04), 0.005 + random() * 0.0015);
      for (let i = 0; i < crowd * 0.5; i++) { const [from, to] = ends[Math.floor(random() * ends.length)]; ling(tiny, from.clone().lerp(to, random()), 0.005 + random() * 0.0015); }
      const lift = Math.round(mix(7, 20, mood.density));
      for (let i = 0; i < lift; i++) {
        const t = random(), start = topAnchor.clone().add(V(0.02 + t * 0.17 + (random() - 0.5) * 0.08, 0.01 + t * 0.13 + (random() - 0.3) * 0.08, (random() - 0.5) * 0.12));
        ling(flyers, start, 0.006);
        const end = start.clone().add(V(0.04 + random() * 0.05, 0.05 + random() * 0.05, (random() - 0.5) * 0.04));
        gossamer.add(tube([start, start.clone().lerp(end, 0.5).add(V(0.015, -0.012, 0)), end], 0.001, { sides: 3, smooth: 8 }), '#98a3ab');
      }
    } else if (a.state === 'empty') {
      for (let i = 0; i < 5; i++) ling(tiny, surface(V(random() - 0.5, random() - 0.2, random()).normalize(), 1.03), 0.0035);
    }

    // The mother: shrivelled, legs drawn in, still holding on.
    if (a.mother) {
      const u = 0.021, d = V(-0.2, 0.5, 0.85).normalize(), at = surface(d, 1.1), husk = tone('#5f4a38'), q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), d);
      const m = xf(at, u, q);
      sac.add(new THREE.SphereGeometry(1, 12, 8), husk, m.clone().multiply(xf(V(0, 0.5, 0.2), V(0.42, 0.5, 0.3))));
      const belly = new THREE.SphereGeometry(1, 14, 10);
      const p = belly.getAttribute('position');
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (1 - 0.25 * Math.sin(p.getY(i) * 6) ** 2), p.getY(i), p.getZ(i) * (1 - 0.3 * Math.sin(p.getY(i) * 5 + 1) ** 2));
      belly.computeVertexNormals();
      sac.add(belly, husk.clone().offsetHSL(0.01, 0, 0.05), m.clone().multiply(xf(V(0, -0.55, 0.3), V(0.6, 0.75, 0.5))));
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
        const y = 0.75 - i * 0.2, reach = 0.9 + (i % 2) * 0.3;
        sac.add(tube([V(side * 0.35, y, 0.2), V(side * (0.9 + reach * 0.5), y + 0.5 - i * 0.3, 0.75), V(side * (1.1 + reach * 0.5), y + 0.4 - i * 0.45, 0.1), V(side * (0.8 + reach * 0.3), y + 0.2 - i * 0.5, -0.25)], (t) => mix(0.1, 0.04, t), { sides: 5, colour: (t) => (Math.floor(t * 5.99) % 2 ? '#b89c78' : '#4d3a28') }), null, m);
      }
    }

    plant.into(root, matte({ roughness: 0.85 }));
    sac.into(root, matte({ roughness: 0.92 }));
    silk.into(root, matte({ roughness: 0.5, emissive: '#56626c', emissiveIntensity: 0.25 }));
    tiny.into(root, matte({ roughness: 0.5 }));
    root.add(plume);
    flyers.into(plume, matte({ roughness: 0.5 }));
    gossamer.into(plume, matte({ roughness: 0.5, emissive: '#6d7880', emissiveIntensity: 0.3 }));

    const pace = mix(0.2, 1.6, mood.energy), wind = mix(0.2, 1, mood.energy);
    return finish(root, (_dt, time) => {
      plume.position.set(Math.sin(time * pace * 0.6) * 0.012 * wind, Math.sin(time * pace) * 0.01 * wind, 0);
      plume.rotation.z = Math.sin(time * pace * 0.4) * 0.03 * wind;
    }, 0.17);
  },
});
