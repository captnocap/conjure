import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, noul } from '@conjure/kit';
import { type V3, blob, bough, coat, eye, leaves, settle, skin, sweep, tufts } from './beast';

type Wrap = 'cloaked' | 'peek' | 'stretch' | 'fan';
type Face = 'asleep' | 'curious' | 'yawn' | 'chew' | 'stare';

export default defineThing({
  questions: {
    wrap: choice('How are its wings held?', {
      cloaked: 'Fully cloaked: both wings folded tight round the body like a closed umbrella, only the face showing.',
      peek: 'Wings parted like an open coat, showing the furry chest.',
      stretch: 'One wing stretched out wide to the side in a long lazy stretch, the other still wrapped.',
      fan: 'Both wings half open and fanning to keep cool.',
    }),
    expression: choice('What is its face doing?', {
      asleep: 'Fast asleep, eyes shut, ears relaxed.',
      curious: 'A curious head tilt, eyes wide and shining.',
      yawn: 'A huge yawn showing needle teeth and a long pink tongue.',
      chew: 'Chewing a fig held at its mouth, cheeks bulging.',
      stare: 'A steady unblinking stare straight at the viewer.',
    }),
    collar: choice('What colour is the fur collar round its neck?', {
      gold: 'A bright golden-orange mantle.',
      rust: 'Deep rust red.',
      silver: 'Pale silver-grey with spectacle rings round the eyes.',
      black: 'Black all over, no contrast at all.',
    }),
    pup: noul('Is a pup clinging to its chest?'),
    company: choice('Is it alone?', {
      alone: 'One bat alone on the limb.',
      pair: 'Two hanging side by side, the second asleep.',
      cluster: 'A small cluster of three, shoulders touching.',
    }),
    roost: choice('What does it hang from?', {
      bough: 'A living mossy bough with a few leaves.',
      figs: 'A fruiting fig branch hung with ripe figs, some bitten.',
      snag: 'A bare grey dead snag, stripped by the colony.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const worn = mood.wear;
    const fur = coat(context, '#3d2c24', '#1f1613');
    const chest = coat(context, '#5a4032', '#33241c');
    const faceFur = coat(context, '#7a553c', '#4a3122');
    const [cb, cs] = { gold: ['#e09a2e', '#a8641a'], rust: ['#a6421f', '#6b2410'], silver: ['#c9c6bd', '#8d8a82'], black: ['#2b2422', '#161211'] }[a.collar];
    const collar = coat(context, new THREE.Color(cb).offsetHSL((mood.warmth - 0.5) * 0.04, 0, 0), cs);
    const membrane = new THREE.MeshStandardMaterial({ color: new THREE.Color('#2e2321').lerp(new THREE.Color('#5b4a44'), worn * 0.4), roughness: 0.5, side: THREE.DoubleSide });
    const bone = skin('#4a3833', { roughness: 0.5 });
    const dark = skin('#1c1514', { roughness: 0.4 });
    const pink = skin('#d9838a', { roughness: 0.4 });
    const earPink = skin('#7a4a48');
    const figSkin = skin('#6b3a6a', { roughness: 0.5 });
    const leaf = new THREE.MeshStandardMaterial({ color: new THREE.Color('#417f3f').lerp(new THREE.Color('#8f8a3c'), worn * 0.5), roughness: 0.7 });

    // The roost: a limb rising from the ground and arching over.
    const limb: V3[] = [[-0.42, 0, -0.08], [-0.42, 0.4, -0.04], [-0.32, 0.7, 0], [-0.1, 0.8, 0], [0.15, 0.8, 0], [0.38, 0.77, 0.02]];
    const limbR = (t: number) => mix(0.055, 0.03, t);
    const snag = a.roost === 'snag';
    bough(root, context, limb, limbR, { moss: snag ? 0 : mix(0.3, 1, mood.density), leafy: snag ? 0 : mix(0.2, 0.9, mood.density), tone: snag ? '#8d8880' : '#6b5a48' });
    const curve = new THREE.CatmullRomCurve3(limb.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
    const onLimb = (x: number) => {
      let best = 0.7, gap = 9;
      for (let i = 50; i <= 100; i++) { const d = Math.abs(curve.getPointAt(i / 100).x - x); if (d < gap) { gap = d; best = i / 100; } }
      return { p: curve.getPointAt(best), r: limbR(best) };
    };
    if (a.roost === 'figs') {
      const n = Math.round(mix(5, 14, mood.density));
      for (let i = 0; i < n; i++) {
        const { p, r } = onLimb(mix(-0.28, 0.36, random())), drop = 0.03 + random() * 0.07, z = (random() - 0.5) * 0.08;
        sweep(root, [[p.x, p.y - r * 0.6, p.z + z], [p.x, p.y - r - drop, p.z + z]], 0.003, leaf, { segments: 3, radial: 4 });
        blob(root, [0.024, 0.028, 0.024], [p.x, p.y - r - drop - 0.02, p.z + z], i % 3 ? figSkin : skin('#8aa23e'), [0, 0, 0], 10);
      }
      leaves(root, Array.from({ length: 12 }, () => { const { p, r } = onLimb(mix(-0.28, 0.36, random())); return { at: [p.x, p.y + r * 0.5, p.z + (random() - 0.5) * 0.1] as V3, size: 0.07 + random() * 0.04, rot: [random() - 0.5, random() * 6, 0.4 + random() * 0.6] as V3, long: 1.1 }; }), leaf);
    }

    const flappers: { group: THREE.Group; side: number; rest: number; amount: number }[] = [];
    const swayers: { pivot: THREE.Group; phase: number; amount: number }[] = [];
    const jaws: THREE.Group[] = [];

    /** One bat, modelled upright (feet at the origin, head on top) and then hung by its feet. */
    const bat = (x: number, scale: number, wrap: Wrap, face: Face, pup: boolean, turn: number) => {
      const { p, r } = onLimb(x);
      const pivot = new THREE.Group();
      pivot.position.set(p.x, p.y - r * 0.55, p.z);
      root.add(pivot);
      const b = new THREE.Group();
      b.rotation.set(0, turn, Math.PI);
      b.scale.setScalar(scale);
      pivot.add(b);
      swayers.push({ pivot, phase: random() * 6, amount: 0.03 + random() * 0.03 });
      // Feet hooked over the limb.
      for (const side of [-1, 1]) {
        const hook = new THREE.Mesh(new THREE.TorusGeometry(r + 0.004, 0.006 * scale, 6, 14, Math.PI * 1.1), dark);
        hook.position.set(p.x + side * 0.022 * scale, p.y, p.z);
        hook.rotation.set(0, Math.PI / 2, 0);
        hook.rotation.z = -0.3;
        hook.castShadow = true;
        root.add(hook);
        sweep(b, [[side * 0.022, -0.01, 0], [side * 0.03, 0.05, 0.0], [side * 0.035, 0.1, 0.0]], (t) => mix(0.007, 0.016, t), fur, { segments: 6, radial: 6 });
      }
      blob(b, [0.062, 0.115, 0.055], [0, 0.165, 0], fur, [0, 0, 0], 18);
      blob(b, [0.05, 0.085, 0.03], [0, 0.17, 0.034], chest, [0, 0, 0], 14);
      // Mantle.
      blob(b, [0.064, 0.042, 0.058], [0, 0.262, 0.002], collar, [0, 0, 0], 16);
      const ruff = [];
      for (let i = 0; i < 26; i++) { const az = random() * Math.PI * 2; ruff.push({ at: [Math.cos(az) * 0.055, 0.262, Math.sin(az) * 0.05] as V3, dir: [Math.cos(az), -0.9, Math.sin(az)] as V3, len: 0.03 + random() * 0.02, r: 0.011 }); }
      tufts(b, ruff, collar);

      // Wings.
      const ragged = worn > 0.6 ? 0.5 : 0.25;
      const shell = (side: number, open: number) => {
        blob(b, [0.062, 0.14, 0.042], [side * mix(0.028, 0.068, open), 0.145, mix(0.036, -0.006, open)], membrane, [0, side * mix(0.45, 1.15, open), side * 0.06], 16);
        const wrist: V3 = [side * mix(0.058, 0.09, open), 0.272, mix(0.05, 0.025, open)];
        for (let i = 0; i < 3; i++) sweep(b, [wrist, [side * mix(0.05 - i * 0.022, 0.1 - i * 0.02, open), 0.15, mix(0.075 - Math.abs(i - 1) * 0.004, 0.036, open)], [side * mix(0.03 - i * 0.016, 0.085 - i * 0.02, open), 0.02 + i * 0.01, mix(0.05, 0.02, open)]], 0.0042, bone, { segments: 10, radial: 5 });
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.026, 6), dark);
        claw.position.set(wrist[0], wrist[1] + 0.014, wrist[2] + 0.006);
        claw.rotation.x = 0.5;
        b.add(claw);
      };
      const fanWing = (side: number, fold: number, amount: number) => {
        const group = new THREE.Group();
        group.position.set(side * 0.05, 0.25, 0.01);
        b.add(group);
        const P = (px: number, py: number, pz = 0): V3 => [side * px, py, pz];
        const elbow = P(0.1, 0.045), wrist = P(0.19, 0.0, 0.01), hip = P(0.0, -0.19);
        const tips = [P(0.37, 0.1), P(0.36, -0.08), P(0.27, -0.2), P(0.14, -0.26)];
        const edge: V3[] = [];
        tips.forEach((tip, i) => {
          edge.push(tip);
          const next = tips[i + 1] ?? hip;
          edge.push([mix((tip[0] + next[0]) / 2, wrist[0], ragged + random() * 0.1), mix((tip[1] + next[1]) / 2, wrist[1], ragged + random() * 0.1), 0]);
        });
        edge.push(hip);
        const verts: number[] = [], add = (...ps: V3[]) => ps.forEach((q) => verts.push(q[0], q[1], q[2]));
        for (let i = 0; i < edge.length - 1; i++) add(wrist, edge[i], edge[i + 1]);
        add(wrist, hip, [0, 0, 0], wrist, [0, 0, 0], elbow);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geometry.computeVertexNormals();
        const sheet = new THREE.Mesh(geometry, membrane);
        sheet.castShadow = sheet.receiveShadow = true;
        group.add(sheet);
        sweep(group, [[0, 0, 0], elbow, wrist], (t) => mix(0.011, 0.007, t), fur, { segments: 8, radial: 6 });
        for (const tip of tips) sweep(group, [wrist, [mix(wrist[0], tip[0], 0.5), mix(wrist[1], tip[1], 0.5) + 0.012, 0.004], tip], (t) => mix(0.005, 0.0025, t), bone, { segments: 8, radial: 5 });
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.028, 6), dark);
        claw.position.set(wrist[0], wrist[1] + 0.02, 0.01);
        group.add(claw);
        group.rotation.y = -side * fold;
        if (amount > 0) flappers.push({ group, side, rest: fold, amount });
      };
      const lead = random() < 0.5 ? -1 : 1;
      if (wrap === 'cloaked') { shell(-1, 0); shell(1, 0); }
      else if (wrap === 'peek') { shell(-1, 1); shell(1, 1); }
      else if (wrap === 'stretch') { fanWing(lead, 0.12, 0.05); shell(-lead, 0.25); }
      else { fanWing(-1, 0.75, 0.35); fanWing(1, 0.75, 0.35); }

      // Head, curled up toward the chest so the face meets the viewer.
      const head = new THREE.Group();
      head.position.set(0, 0.318, 0.022);
      head.rotation.set(face === 'asleep' ? 1.15 : face === 'yawn' ? 0.6 : 0.9, (random() - 0.5) * 0.3, face === 'curious' ? lead * 0.5 : (random() - 0.5) * 0.12);
      head.scale.setScalar(1.42);
      b.add(head);
      blob(head, [0.043, 0.041, 0.046], [0, 0, 0], faceFur, [0, 0, 0], 18);
      blob(head, [0.036, 0.022, 0.03], [0, 0.026, -0.004], a.collar === 'black' ? fur : collar, [0, 0, 0], 12);
      sweep(head, [[0, -0.004, 0.022], [0, -0.01, 0.06], [0, -0.013, 0.094]], (t) => mix(0.028, 0.0135, t), faceFur, { flat: 0.82, radial: 10, segments: 10 });
      blob(head, [0.0105, 0.008, 0.008], [0, -0.008, 0.103], dark, [0, 0, 0], 10);
      const lid = face === 'asleep' ? 1 : face === 'yawn' ? 0.8 : face === 'chew' ? 0.3 : 0.02;
      for (const side of [-1, 1]) {
        if (a.collar === 'silver') blob(head, [0.019, 0.019, 0.006], [side * 0.022, 0.008, 0.036], collar, [0, side * 0.5, 0], 10);
        eye(head, { at: [side * 0.022, 0.008, 0.033], r: 0.0145, look: [side * 0.35, 0.05, 1], iris: '#b5701c', white: '#2a1a12', irisSize: 0.93, pupil: face === 'stare' ? 0.42 : 0.62, lid, lidMaterial: faceFur });
        const relaxed = face === 'asleep' ? 0.5 : 0;
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.058, 8), dark);
        ear.scale.z = 0.45;
        ear.position.set(side * 0.032, 0.05, -0.008);
        ear.rotation.set(-0.1, 0, -side * (0.35 + relaxed));
        ear.castShadow = true;
        const inner = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.04, 6), earPink);
        inner.position.set(0, -0.004, 0.012);
        ear.add(inner);
        head.add(ear);
      }
      const jaw = new THREE.Group();
      jaw.position.set(0, -0.018, 0.024);
      head.add(jaw);
      sweep(jaw, [[0, -0.006, 0], [0, -0.01, 0.036], [0, -0.011, 0.064]], (t) => mix(0.021, 0.0095, t), faceFur, { flat: 0.6, radial: 8, segments: 8 });
      if (face === 'yawn') {
        jaw.rotation.x = 0.85;
        blob(head, [0.017, 0.006, 0.03], [0, -0.019, 0.058], skin('#5a1a1c'), [0, 0, 0], 8);
        sweep(jaw, [[0, 0.002, 0.02], [0, 0.008, 0.055], [0, 0.0, 0.085], [0, -0.012, 0.098]], (t) => mix(0.011, 0.007, t), pink, { flat: 0.45, segments: 10, radial: 7 });
        for (const side of [-1, 1]) {
          const fang = new THREE.Mesh(new THREE.ConeGeometry(0.0035, 0.016, 5), skin('#f1ead6'));
          fang.position.set(side * 0.01, -0.027, 0.086);
          fang.rotation.x = Math.PI;
          head.add(fang);
          const low = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.012, 5), skin('#f1ead6'));
          low.position.set(side * 0.008, 0.004, 0.058);
          jaw.add(low);
        }
      } else if (face === 'chew') {
        jaw.rotation.x = 0.28;
        jaws.push(jaw);
        blob(head, [0.03, 0.033, 0.03], [0.004, -0.03, 0.105], figSkin, [0, 0, 0], 12);
        blob(head, [0.014, 0.014, 0.008], [0.012, -0.012, 0.118], skin('#d9a0a8'), [0, 0, 0], 8);
        for (const side of [-1, 1]) blob(head, [0.016, 0.014, 0.016], [side * 0.026, -0.016, 0.038], fur, [0, 0, 0], 8);
      }

      if (pup) {
        const out = wrap === 'cloaked' ? 0.045 : 0.0, px = lead * 0.012;
        blob(b, [0.03, 0.05, 0.028], [px, 0.165, 0.055 + out], chest, [0, 0, 0], 12);
        blob(b, [0.033, 0.045, 0.012], [px, 0.16, 0.078 + out], membrane, [0, 0, 0], 10);
        blob(b, [0.028, 0.027, 0.029], [px, 0.225, 0.07 + out], fur, [0, 0, 0], 12);
        blob(b, [0.014, 0.012, 0.016], [px, 0.218, 0.096 + out], fur, [0, 0, 0], 8);
        blob(b, [0.005, 0.004, 0.004], [px, 0.218, 0.112 + out], dark, [0, 0, 0], 6);
        for (const side of [-1, 1]) {
          blob(b, [0.0085, 0.0085, 0.006], [px + side * 0.014, 0.23, 0.092 + out], dark, [0, 0, 0], 8);
          blob(b, [0.0022, 0.0022, 0.002], [px + side * 0.014 - 0.003, 0.233, 0.098 + out], skin('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.5 }), [0, 0, 0], 5);
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.03, 6), dark);
          ear.scale.z = 0.5;
          ear.position.set(px + side * 0.02, 0.255, 0.065 + out);
          ear.rotation.z = -side * 0.45;
          b.add(ear);
        }
      }
    };

    bat(0.04, 1.4, a.wrap, a.expression, a.pup, (random() - 0.5) * 0.3);
    if (a.company !== 'alone') bat(0.28, 1.05 + random() * 0.1, 'cloaked', 'asleep', false, -0.4 + random() * 0.3);
    if (a.company === 'cluster') bat(-0.19, 0.95 + random() * 0.12, random() < 0.5 ? 'cloaked' : 'peek', random() < 0.5 ? 'asleep' : 'stare', false, 0.3 + random() * 0.3);

    settle(root);
    const speed = mix(0.4, 2.4, mood.energy);
    return {
      object: root,
      update(_dt, time) {
        for (const s of swayers) s.pivot.rotation.z = Math.sin(time * speed * 0.9 + s.phase) * s.amount * (0.4 + mood.energy);
        for (const f of flappers) f.group.rotation.y = -f.side * (f.rest + Math.sin(time * speed * 4) * f.amount);
        for (const jaw of jaws) jaw.rotation.x = 0.2 + Math.abs(Math.sin(time * speed * 5)) * 0.2;
      },
      dispose: () => disposeTree(root),
    };
  },
});
