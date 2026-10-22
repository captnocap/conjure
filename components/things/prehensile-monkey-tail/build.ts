import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, noul, score } from '@conjure/kit';
import { type V3, blob, bough, coat, settle, skin, sweep, tufts } from './beast';

type Path = { points: V3[]; inner: (V3 | null)[] };

export default defineThing({
  questions: {
    grips: choice('What is the tail gripping?', {
      branch: 'The branch itself: the animal hangs beneath by its tail alone.',
      fruit: 'A fruit, curled up in the tip and held like a prize.',
      tail: 'Another tail, the two twisted together like held hands.',
      nothing: 'Nothing: it hangs slack with a loose hook at the tip.',
    }),
    coils: score('How many turns does the tip make?', ['A single loose hook', 'One full turn', 'Two turns', 'Three tight turns']),
    fur: choice('What is the fur like?', {
      sleek: 'Sleek glossy black, a spider monkey in its prime.',
      woolly: 'Thick woolly grey-brown, plush as a bottle brush.',
      rust: 'Rusty red, bright against green.',
      mangy: 'Mangy and thin with bald patches and a kink from an old break.',
    }),
    shows: choice('How much of the owner shows?', {
      tail: 'Only the tail, bound at the cut end: a loose part, trophy or specimen.',
      rump: 'Just a furry rump, the rest out of frame.',
      haunches: 'A rump and two dangling legs.',
    }),
    motion: choice('Is it moving?', {
      still: 'Dead still, hanging plumb.',
      swing: 'Swinging like a pendulum, caught at the end of its arc.',
      twitch: 'Still but for the tip, which flicks and tightens.',
    }),
    fruit: choice('If it holds a fruit, which?', {
      fig: 'A plump purple fig.',
      mango: 'A yellow-orange mango.',
      rambutan: 'A red hairy rambutan.',
    }),
    tag: noul('Is a collector\'s paper specimen tag tied to it?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const [base, streak] = { sleek: ['#2a2725', '#48413c'], woolly: ['#86705b', '#5c4a3a'], rust: ['#a9532a', '#6f2f14'], mangy: ['#5a4d43', '#3b322c'] }[a.fur];
    const fur = coat(context, new THREE.Color(base).offsetHSL((mood.warmth - 0.5) * 0.03, 0, 0), streak, { roughness: a.fur === 'sleek' ? 0.45 : 0.95 });
    const padSkin = skin(a.fur === 'sleek' ? '#7a5f58' : '#a67c6c', { roughness: 0.5 });
    const thick = { sleek: 1, woolly: 1.4, rust: 1.1, mangy: 0.8 }[a.fur];
    const turns = mix(0.55, 3.1, a.coils);
    const swing = a.motion === 'swing' ? (random() < 0.5 ? -1 : 1) * 0.17 : (random() - 0.5) * 0.04;

    // Stand: a broken trunk with one side branch.
    bough(root, context, [[-0.47, 0, 0.01], [-0.45, 0.6, -0.01], [-0.44, 1.27, 0]], (t) => mix(0.07, 0.05, t), { moss: mix(0.3, 1, mood.density), leafy: 0 });
    bough(root, context, [[-0.44, 1.08, 0], [0.05, 1.098, 0], [0.5, 1.12, 0]], (t) => mix(0.068, 0.055, t), { moss: mix(0.2, 0.9, mood.density), leafy: mix(0.1, 0.8, mood.density) });
    const bx = 0.1, by = 1.1, br = 0.041, S = 1.5;

    const tailR = (t: number) => mix(0.036, 0.017, t) * thick;
    const grow = (path: Path, material: THREE.Material, kink: boolean) => {
      const points = path.points.slice();
      if (kink) { const i = Math.max(1, Math.floor(points.length * 0.3)); const p = points[i]; points.splice(i, 0, [p[0] + 0.045, p[1] + 0.012, p[2] + 0.02]); path.inner.splice(i, 0, null); }
      const group = new THREE.Group();
      sweep(group, points, tailR, material, { segments: Math.max(60, points.length * 5), radial: 10 });
      // The bare grip pad along the inner side of the last third.
      const from = Math.floor(points.length * 0.62), pad: V3[] = [];
      for (let i = from; i < points.length; i++) {
        const inward = path.inner[i]; if (!inward) continue;
        const r = tailR(i / (points.length - 1)) * 0.62, p = points[i];
        pad.push([p[0] + inward[0] * r, p[1] + inward[1] * r, p[2] + inward[2] * r]);
      }
      if (pad.length > 3) sweep(group, pad, (t) => mix(0.014, 0.009, t) * thick, padSkin, { segments: pad.length * 4, radial: 7 });
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
      if (a.fur === 'woolly' || a.fur === 'rust') {
        const fluff = Array.from({ length: 110 }, () => { const t = random() * 0.8, p = curve.getPointAt(t), az = random() * 6.28; return { at: [p.x, p.y, p.z] as V3, dir: [Math.cos(az), -0.2 + Math.sin(az), random() - 0.5] as V3, len: tailR(t) * (a.fur === 'woolly' ? 1.7 : 1.4), r: tailR(t) * 0.5 }; });
        tufts(group, fluff, material);
      }
      if (a.fur === 'mangy' || mood.wear > 0.7) {
        for (let i = 0; i < 5; i++) { const t = 0.08 + random() * 0.6, p = curve.getPointAt(t), az = random() * 6.28, r = tailR(t); blob(group, [r * 0.7, r * 1.4, r * 0.5], [p.x + Math.cos(az) * r * 0.7, p.y, p.z + Math.sin(az) * r * 0.7], padSkin, [0, 0, 0], 8); }
        if (kink) { const p = points[Math.max(1, Math.floor(path.points.length * 0.3))]; blob(group, [0.03 * thick, 0.03 * thick, 0.03 * thick], p, material, [0, 0, 0], 10); }
      }
      return group;
    };

    const hanging = a.grips === 'branch';
    const pendulum = new THREE.Group(); // everything that swings
    root.add(pendulum);
    pendulum.scale.setScalar(S);
    const path: Path = { points: [], inner: [] };
    const add = (p: V3, inward: V3 | null = null) => { path.points.push(p); path.inner.push(inward); };
    let rump: V3, tagAt: V3;

    if (hanging) {
      // Tip coiled on the branch, owner below. The pendulum pivots on the branch.
      pendulum.position.set(bx, by, 0);
      const drop = 0.56;
      rump = [0, -drop - 0.07, 0];
      add([0, -drop, -0.02]); add([0.005, -drop * 0.62, -0.05]); add([0.0, -0.17, -0.055]);
      tagAt = [0.005, -drop * 0.8, -0.03];
      const R = br + 0.024 * thick, steps = Math.round(turns * 10);
      for (let i = 0; i <= steps; i++) {
        const phi = (i / 10) * Math.PI * 2, peel = i > steps - 3 ? (i - steps + 3) * 0.008 : 0;
        add([0.0 + (i / 10) * 0.05 * thick, Math.sin(phi) * (R + peel), -Math.cos(phi) * (R + peel)], [0, -Math.sin(phi), Math.cos(phi)]);
      }
      pendulum.rotation.z = swing * 1.6;
    } else {
      // Owner sat on the branch; the tail hangs behind and below it.
      pendulum.position.set(bx, by - 0.02, -0.1);
      rump = [0, br + 0.11, 0.09];
      if (a.shows === 'tail') { add([0.0, br + 0.035, 0.2]); add([0, br + 0.065, 0.11]); add([0, br + 0.03, 0.02]); }
      else add([0, 0.05, 0.02]);
      add([0, -0.14, -0.005]); add([0.0, -0.33, 0.03]);
      tagAt = [0, -0.2, 0.0];
      if (a.grips === 'nothing') {
        const c: V3 = [0, -0.5, 0.1], R = 0.075, steps = Math.round(mix(0.45, 1.6, a.coils) * 10);
        for (let i = 0; i <= steps; i++) { const phi = Math.PI + (i / 10) * Math.PI * 2, r = R * (1 - i / steps * 0.45); add([c[0] + i * 0.002, c[1] + Math.sin(phi) * r * -1, c[2] + Math.cos(phi) * r], [0, Math.sin(phi), -Math.cos(phi)]); }
      } else if (a.grips === 'fruit') {
        const c: V3 = [0, -0.5, 0.1], R = 0.062 + 0.012 * thick, steps = Math.round(Math.max(1, turns) * 10);
        for (let i = 0; i <= steps; i++) { const phi = Math.PI + (i / 10) * Math.PI * 2; add([c[0] - 0.03 + (i / steps) * 0.06, c[1] - Math.sin(phi) * R, c[2] + Math.cos(phi) * R], [0, Math.sin(phi), -Math.cos(phi)]); }
        const fruit = { fig: '#6a3b6e', mango: '#f0a22e', rambutan: '#c8312e' }[a.fruit];
        const flesh = skin(fruit, { roughness: 0.5 });
        blob(pendulum, [0.062, a.fruit === 'mango' ? 0.05 : 0.056, a.fruit === 'mango' ? 0.07 : 0.056], c, flesh, [0, 0, 0], 16);
        blob(pendulum, [0.008, 0.008, 0.008], [c[0] + 0.062, c[1], c[2]], skin('#4c3a22'), [0, 0, 0], 6);
        if (a.fruit === 'rambutan') tufts(pendulum, Array.from({ length: 60 }, () => { const u = random() * 6.28, v = Math.acos(random() * 2 - 1); const d: V3 = [Math.cos(v), Math.sin(v) * Math.sin(u), Math.sin(v) * Math.cos(u)]; return { at: [c[0] + d[0] * 0.055, c[1] + d[1] * 0.05, c[2] + d[2] * 0.05] as V3, dir: d, len: 0.022, r: 0.004 }; }), skin('#7fae3a'));
      } else {
        // Two tails twisted round a shared vertical axis.
        const steps = Math.round(Math.max(1, turns) * 8), top = -0.3, len = 0.3, hr = 0.021 * thick;
        for (let i = 0; i <= steps; i++) { const phi = (i / 8) * Math.PI * 2; add([Math.cos(phi) * hr + 0.03, top - (i / steps) * len, 0.04 + Math.sin(phi) * hr], [-Math.cos(phi), 0, -Math.sin(phi)]); }
        const other: Path = { points: [[-0.36, -0.12, 0.0], [-0.28, -0.07, 0.03], [-0.12, -0.2, 0.04]], inner: [null, null, null] };
        for (let i = 0; i <= steps; i++) { const phi = (i / 8) * Math.PI * 2 + Math.PI; other.points.push([Math.cos(phi) * hr + 0.03, top - (i / steps) * len, 0.04 + Math.sin(phi) * hr]); other.inner.push([-Math.cos(phi), 0, -Math.sin(phi)]); }
        pendulum.add(grow(other, coat(context, a.fur === 'rust' ? '#2a2725' : '#a9532a', a.fur === 'rust' ? '#48413c' : '#6f2f14'), false));
      }
      pendulum.rotation.z = swing * 0.9;
    }
    const tail = grow(path, fur, a.fur === 'mangy');
    pendulum.add(tail);

    if (a.shows === 'tail') {
      const end = path.points[0];
      blob(pendulum, [0.033 * thick, 0.03 * thick, 0.033 * thick], end, skin('#6b4a33', { roughness: 0.8 }), [0, 0, 0], 12);
      const twine = new THREE.Mesh(new THREE.TorusGeometry(0.031 * thick, 0.005, 6, 18), skin('#c9b383'));
      twine.position.set(path.points[1][0], path.points[1][1], path.points[1][2]);
      twine.rotation.x = hanging ? Math.PI / 2 : 0.3;
      twine.castShadow = true;
      pendulum.add(twine);
    } else {
      blob(pendulum, [0.12, 0.105, 0.11], rump, fur, [0, 0, 0], 20);
      for (const side of [-1, 1]) {
        blob(pendulum, [0.07, 0.085, 0.08], [rump[0] + side * 0.075, rump[1] - 0.02, rump[2] + 0.04], fur, [0, 0, 0], 14);
        if (a.shows === 'haunches') {
          const foot: V3 = [rump[0] + side * 0.1, rump[1] - 0.31 - random() * 0.04, rump[2] + 0.1];
          sweep(pendulum, [[rump[0] + side * 0.08, rump[1] - 0.03, rump[2] + 0.06], [rump[0] + side * 0.12, rump[1] - 0.12, rump[2] + 0.19], foot], (t) => mix(0.045, 0.02, t), fur);
          blob(pendulum, [0.022, 0.016, 0.05], [foot[0], foot[1] - 0.01, foot[2] + 0.025], skin('#2a2422'), [0.5, 0, 0], 10);
        }
      }
    }
    if (a.tag) {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#efe3c2'; ctx.fillRect(0, 0, 128, 64);
      ctx.fillStyle = '#3a2f25'; ctx.font = 'bold 22px monospace'; ctx.fillText(`No. ${10 + Math.floor(random() * 89)}`, 26, 28);
      ctx.fillRect(26, 40, 80, 3); ctx.beginPath(); ctx.arc(12, 32, 5, 0, 7); ctx.fill();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.003), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }));
      card.position.set(tagAt[0] + 0.1, tagAt[1] - 0.06, tagAt[2] + 0.05);
      card.rotation.set(0, -0.3, -0.5 + random() * 0.3);
      card.castShadow = true;
      pendulum.add(card);
      sweep(pendulum, [tagAt, [tagAt[0] + 0.03, tagAt[1] - 0.03, tagAt[2] + 0.04], [tagAt[0] + 0.05, tagAt[1] - 0.045, tagAt[2] + 0.05]], 0.0018, skin('#c9b383'), { segments: 8, radial: 4 });
    }

    settle(root);
    const speed = mix(0.4, 2.2, mood.energy), rest = pendulum.rotation.z;
    return {
      object: root,
      update(_dt, time) {
        if (a.motion === 'swing') pendulum.rotation.z = Math.cos(time * speed * 1.6) * Math.abs(rest) * Math.sign(rest || 1);
        else if (a.motion === 'twitch') tail.scale.y = 1 + Math.sin(time * speed * 7) * 0.012;
      },
      dispose: () => disposeTree(root),
    };
  },
});
