import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type P3, ball, box, eye, eyeMaterial, furMaterial, group, limb, part, plaque, taper, tufts, woodMaterial } from './parts';

type Tuft = { at: P3; dir: P3; len: number; r: number };

export default defineThing({
  questions: {
    species: choice('Whose snarl is it?', {
      wolf: 'A grey wolf: long muzzle, heavy ruff, pale cheeks.',
      coyote: 'A coyote: narrow, tawny, big-eared and wiry.',
      hyena: 'A spotted hyena: blunt bone-crushing jaws, round ears, sloped neck.',
      terrier: 'A small scruffy white terrier, furious out of all proportion.',
      black: 'A black wolf, a shape from a fairy tale.',
    }),
    intensity: score('How far has the snarl gone?', ['A warning twitch of the lip', 'Lips lifted, teeth bared', 'Jaws parted, nose fully wrinkled', 'A full open snap']),
    ears: choice('What are the ears doing?', {
      forward: 'Pricked forward, confident and dominant.',
      back: 'Pinned flat back, fear behind the threat.',
      torn: 'One upright, one ragged and torn from old fights.',
    }),
    eyes: choice('What are the eyes like?', {
      yellow: 'Hard yellow glass, fixed on you.',
      afraid: 'Soft, wide and afraid behind the threat, whites showing.',
      missing: 'One socket empty and dark.',
      pale: 'Pale ice blue, unreadable.',
    }),
    wet: choice('How wet is the mouth?', {
      dry: 'Dry painted gums, plainly a made thing.',
      glossy: 'Glossy wet gums and tongue.',
      drool: 'Strings of drool hanging from the jaws.',
      foam: 'Flecks of foam at the lips, rabid.',
    }),
    holding: choice('Is there anything in its jaws?', {
      nothing: 'Nothing but teeth.',
      bone: 'A gnawed bone it will not give up.',
      cloth: 'A torn shred of red cloth.',
      slipper: 'A chewed slipper, the comedy version.',
    }),
    form: choice('What kind of object is it?', {
      mount: 'A trophy head mounted on a wall plaque.',
      jawset: 'A bare taxidermy jaw set: gums, teeth and tongue only, on a wire stand.',
      living: 'A living head and shoulders, hackles up, head low.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const root = s.root, wear = mood.wear, I = a.intensity;
    const spec = {
      wolf: { fur: '#86817b', cheek: '#ddd6c8', len: 0.19, wide: 0.92, r1: 0.034, k: 1, ear: 1 },
      coyote: { fur: '#b08a5c', cheek: '#e6dcc6', len: 0.18, wide: 0.78, r1: 0.028, k: 0.82, ear: 1.3 },
      hyena: { fur: '#b39a6c', cheek: '#4a3a2c', len: 0.14, wide: 1.1, r1: 0.045, k: 1.05, ear: 0.8 },
      terrier: { fur: '#ece6d8', cheek: '#f4f0e6', len: 0.1, wide: 1, r1: 0.032, k: 0.55, ear: 0.8 },
      black: { fur: '#26221f', cheek: '#3a3430', len: 0.2, wide: 0.92, r1: 0.034, k: 1.05, ear: 1 },
    }[a.species];
    const k = spec.k, L = spec.len;
    const mounted = a.form === 'mount', bare = a.form === 'jawset';
    const hide = furMaterial(random, spec.fur, { dust: mounted ? wear : wear * 0.3, bald: mounted ? Math.max(0, wear - 0.6) * 1.6 : 0 });
    const cheek = furMaterial(random, spec.cheek, { dust: wear * 0.5, streak: 0.12 });
    const gloss = a.wet === 'dry' ? 0.75 : 0.18;
    const gum = s.material(a.wet === 'dry' ? '#b0606a' : '#8a3340', { roughness: gloss });
    const tongueMat = s.material('#d9727c', { roughness: gloss });
    const tooth = s.material(mix(0, 1, wear) > 0.6 ? '#d9cf9e' : '#f2ecd6', { roughness: 0.3 });
    const dark = s.material('#14100e', { roughness: 0.4 });

    let headAt: P3 = [0, 0.05 * k, 0.26 * k], pitch = mix(-0.05, -0.3, I);
    if (mounted) {
      plaque(root, 'shield', 0.4 * k, 0.5 * k, woodMaterial(random, '#5d3a22', 0.7 - wear * 0.5), 0.028);
      taper(root, [[0, -0.03 * k, 0], [0, 0, 0.12 * k], [0, 0.04 * k, 0.22 * k]], 0.15 * k, 0.1 * k, hide, 14);
    } else if (bare) {
      box(root, [0.2, 0.025, 0.14], [0, 0.0125, 0], woodMaterial(random, '#6b4a2e', 0.4));
      const steel = s.material('#8f9497', { metalness: 0.8, roughness: 0.35 });
      limb(root, [0, 0.02, -0.02], [0, 0.17 * k + 0.03, -0.01], 0.004, 0.004, steel);
      headAt = [0, 0.2 * k + 0.05, -0.1 * k]; pitch = 0.0;
    } else {
      ball(root, [0.17 * k, 0.18 * k, 0.22 * k], [0, 0.18 * k, -0.08 * k], hide);
      for (const sx of [-1, 1]) limb(root, [sx * 0.09 * k, 0.12 * k, 0.04 * k], [sx * 0.1 * k, 0, 0.07 * k], 0.04 * k, 0.032 * k, hide);
      taper(root, [[0, 0.24 * k, 0], [0, 0.29 * k, 0.12 * k], [0, 0.3 * k, 0.22 * k]], 0.13 * k, 0.095 * k, hide, 14);
      headAt = [0, 0.3 * k, 0.27 * k]; pitch = mix(0.08, -0.12, I);
    }
    const H = group(root, headAt, [pitch, (random() - 0.5) * (bare ? 0.2 : 0.6), (random() - 0.5) * 0.15]);
    H.scale.setScalar(k);
    const upper = group(H);
    const J = group(H, [0, -0.066, 0.0], [bare ? mix(0.3, 0.6, I) : mix(0.1, 0.72, I), 0, 0]);
    upper.rotation.x = bare ? -mix(0.15, 0.4, I) : -I * 0.13;
    const hold = a.holding !== 'nothing';
    if (hold) J.rotation.x = Math.max(J.rotation.x, 0.32);
    const z0 = 0.06, zt = z0 + L;

    if (!bare) {
      ball(H, [0.088, 0.082, 0.1], [0, 0, 0], hide);
      limb(upper, [0, -0.002, z0], [0, -0.028 + I * 0.012, zt], 0.056, spec.r1, hide, spec.wide);
      for (const sx of [-1, 1]) ball(H, [0.04, 0.045, 0.05], [sx * 0.06, -0.03, 0.03], cheek);
      limb(J, [0, -0.006, 0.01], [0, -0.012, L + 0.035], 0.04, spec.r1 * 0.66, a.species === 'hyena' || a.species === 'black' ? hide : cheek, spec.wide * 0.9);
      // Nose pad, and the wrinkles that pile up behind it as the snarl grows.
      ball(upper, [0.022 * spec.wide, 0.017, 0.016], [0, -0.022 + I * 0.012, zt + spec.r1 * 0.75], s.material('#14100e', { roughness: a.wet === 'dry' ? 0.6 : 0.15 }));
      const folds = Math.round(I * 5);
      for (let i = 0; i < folds; i++) { const t = (i + 1) / 6; part(upper, new THREE.TorusGeometry(mix(spec.r1, 0.05, 1 - t) * spec.wide * 0.95, 0.006, 6, 14, Math.PI), hide, [0, mix(-0.028, -0.004, 1 - t) + I * 0.012 + 0.004, mix(zt, z0, 1 - t) - 0.012], 1, [0.25, 0, 0]); }
    }
    // Both jaws are horseshoe arches of gum carrying the teeth; a snarl is how much of them shows.
    const lift = bare ? 1 : I;
    const show = bare || I > 0.12 || hold;
    const arch = (u: number, w: number, zf: number, zb: number): [number, number] => {
      const sg = Math.sign(u) || 1, v = Math.abs(u), wf = 0.029 * w, wb = 0.047 * w;
      if (v < 0.35) { const t = (v / 0.35) * Math.PI / 2; return [sg * wf * Math.sin(t), zf - (1 - Math.cos(t)) * wf]; }
      const t = (v - 0.35) / 0.65;
      return [sg * mix(wf, wb, t), mix(zf - wf, zb, t)];
    };
    const fang = (parent: THREE.Object3D, x: number, y: number, z: number, len: number, r: number, down: boolean, deep = 1) =>
      part(parent, new THREE.ConeGeometry(r, len, 8), tooth, [x, y + (down ? -len / 2 : len / 2), z], [1, 1, deep], [down ? 0.1 : -0.1, 0, down ? Math.PI : 0]);
    const jaw = (parent: THREE.Object3D, y: number, w: number, zf: number, zb: number, down: boolean, canine: number) => {
      const pts: P3[] = [];
      for (let i = 0; i <= 18; i++) { const [x, z] = arch(-1 + i / 9, w, zf, zb); pts.push([x, y, z]); }
      taper(parent, pts, 0.0115, 0.0115, gum, 8);
      const ty = y + (down ? -0.006 : 0.006), small = a.species === 'terrier' ? 0.75 : 1;
      for (const sx of [-1, 1]) {
        const at = (u: number) => arch(sx * u, w, zf, zb);
        const [cx, cz] = at(down ? 0.4 : 0.31);
        fang(parent, cx * 1.04, ty, cz, canine * small, 0.0085, down);
        if (!show) continue;
        for (const u of [0.06, 0.17, 0.26]) { const [x, z] = at(u); fang(parent, x, ty, z, 0.011, 0.0042, down); }
        for (const u of [0.54, 0.65, 0.76]) { const [x, z] = at(u); fang(parent, x, ty, z, 0.013 * small, 0.0062, down, 1.3); }
        const [mx, mz] = at(0.9);
        fang(parent, mx, ty, mz, 0.019 * small, 0.0085, down, 1.9);
      }
    };
    const out = 1 + lift * 0.14, uy = -0.05 - lift * 0.013, uzf = zt + 0.006 + lift * 0.006, lzf = L + 0.04, ly = 0.017;
    jaw(upper, uy, spec.wide * out, uzf, z0 + 0.012, true, mix(0.026, 0.044, lift));
    jaw(J, ly, spec.wide * 0.86 * mix(1, out, 0.5), lzf, 0.05, false, mix(0.02, 0.032, lift));
    if (bare) {
      // A bare jaw set: ridged palate above, mouth floor below, a wire hinge behind.
      ball(upper, [0.04 * spec.wide, 0.009, L * 0.5], [0, uy + 0.006, z0 + L * 0.5], gum);
      const ridge = s.material('#d79aa0', { roughness: gloss });
      for (let i = 0; i < 6; i++) box(upper, [(0.07 - i * 0.007) * spec.wide, 0.005, 0.007], [0, uy - 0.003, z0 + 0.03 + i * L * 0.13], ridge);
      ball(J, [0.036 * spec.wide, 0.008, L * 0.48], [0, ly - 0.006, 0.05 + L * 0.46], gum);
      const steel = s.material('#8f9497', { metalness: 0.8, roughness: 0.35 });
      for (const sx of [-1, 1]) part(H, new THREE.TorusGeometry(0.016, 0.003, 6, 14), steel, [sx * 0.045 * spec.wide, -0.05, 0.05], 1, [0, Math.PI / 2, 0]);
    } else {
      if (J.rotation.x > 0.15) ball(H, [0.038, 0.03, 0.045], [0, -0.045, 0.06], s.material('#4a1a22'));
      ball(upper, [0.034 * spec.wide, 0.008, L * 0.46], [0, uy + 0.004, z0 + L * 0.5], gum);
    }
    // Tongue, curled at the tip.
    if (show || J.rotation.x > 0.15) {
      const curl = mix(0.0, 0.03, I);
      const { mesh } = taper(J, [[0, 0.018, 0.04], [0, 0.028, L * 0.5], [0, 0.026 + curl * 0.3, L * 0.9], [0, 0.03 + curl, L + 0.012]], 0.015, 0.011, tongueMat, 8);
      mesh.scale.x = 1.5;
    }

    const quiver: THREE.Object3D[] = [];
    if (!bare) {
      // Eyes and brows.
      const iris = a.eyes === 'pale' ? '#b9d4e6' : a.eyes === 'afraid' ? '#8a5a22' : '#e6b21c';
      const glass = eyeMaterial(iris, a.eyes === 'afraid' ? 'wide' : 'round', a.eyes === 'afraid');
      for (const sx of [-1, 1]) {
        const at: P3 = [sx * 0.048, 0.03, 0.075];
        if (a.eyes === 'missing' && sx === -1) { ball(H, [0.016, 0.014, 0.01], at, dark, [0, sx * 0.4, 0]); ball(H, [0.02, 0.006, 0.012], [at[0], at[1] + 0.012, at[2] + 0.004], hide, [0, 0, sx * 0.4], 8); }
        else {
          eye(H, at, a.eyes === 'afraid' ? 0.0165 : 0.0135, glass, [sx * 0.4, a.eyes === 'afraid' ? 0.15 : -0.05]);
          const angry = a.eyes === 'afraid' ? -0.45 : mix(0.2, 0.75, I);
          ball(H, [0.026, 0.009, 0.018], [at[0] * 1.02, at[1] + (a.eyes === 'afraid' ? 0.021 : 0.014), at[2] + 0.006], hide, [0.1, sx * 0.4, sx * angry], 10);
        }
        // Ears.
        const E = group(H, [sx * 0.056, 0.065, -0.03]);
        const back = a.ears === 'back', torn = a.ears === 'torn' && sx === 1;
        E.rotation.set(back ? -1.25 : 0.12, sx * 0.3, -sx * (back ? 0.5 : 0.25) + (random() - 0.5) * 0.15);
        const e = spec.ear;
        if (a.species === 'hyena') { ball(E, [0.036, 0.04, 0.012], [0, 0.035, 0], hide); ball(E, [0.024, 0.028, 0.006], [0, 0.035, 0.01], dark); }
        else if (a.species === 'terrier') { ball(E, [0.026, 0.03, 0.01], [0, 0.025, 0], hide); const flap = group(E, [0, 0.05, 0], [1.9, 0, 0]); ball(flap, [0.024, 0.026, 0.008], [0, 0.022, 0], furMaterial(random, '#b5743c', {})); }
        else {
          part(E, new THREE.ConeGeometry(0.036, (torn ? 0.05 : 0.095) * e, 8), hide, [0, (torn ? 0.025 : 0.047) * e, 0], [1, 1, 0.35]);
          part(E, new THREE.ConeGeometry(0.022, (torn ? 0.035 : 0.07) * e, 8), s.material('#c9968c'), [0, (torn ? 0.02 : 0.04) * e, 0.009], [1, 1, 0.2]);
          if (torn) for (let i = 0; i < 3; i++) part(E, new THREE.ConeGeometry(0.008, 0.03, 4), hide, [(i - 1) * 0.014, 0.055 * e, 0], [1, 1, 0.4], [0, 0, (i - 1) * 0.3]);
        }
      }
      // Ruff and hackles.
      const hairs: Tuft[] = [];
      const rise = mix(0.3, 1, I) * mix(0.75, 1.25, mood.energy);
      for (let i = 0; i < 46; i++) { const t = random(), sx = (random() - 0.5) * 0.09; hairs.push({ at: [sx, 0.07 - t * 0.03, -0.03 - t * 0.12], dir: [sx * 4, 0.6 + rise, -1 + rise * 0.6], len: mix(0.03, 0.085, rise) * mix(0.6, 1.2, random()), r: 0.011 }); }
      for (let i = 0; i < 44; i++) { const sx = random() < 0.5 ? -1 : 1, t = random(); hairs.push({ at: [sx * mix(0.065, 0.09, t), -0.01 - random() * 0.07, -0.02 + random() * 0.07], dir: [sx * 1.2, -0.7, -0.5], len: mix(0.035, 0.075, random()), r: 0.012 }); }
      if (a.species === 'terrier') for (let i = 0; i < 30; i++) { const sx = random() < 0.5 ? -1 : 1; hairs.push({ at: [sx * random() * 0.035, -0.03 - random() * 0.02, z0 + random() * L], dir: [sx * 0.8, -1, 0.5], len: 0.045, r: 0.008 }); }
      const ruff = tufts(H, a.species === 'terrier' ? cheek : hide, hairs);
      if (ruff) quiver.push(ruff);
      if (a.species === 'hyena') for (let i = 0; i < 16; i++) { const t = random() * 6.28; ball(H, [0.012, 0.012, 0.006], [Math.cos(t) * 0.07, 0.03 + Math.sin(t) * 0.05, -0.05 + random() * 0.05], dark, [0, 0, 0], 8); }
      if (a.species === 'terrier') ball(H, [0.035, 0.03, 0.03], [0.045, 0.045, 0.05], furMaterial(random, '#b5743c', {}));
      if (mounted && wear > 0.6) for (let i = 0; i < 8; i++) box(H, [0.005, 0.014, 0.004], [0.005 * (i % 2 ? 1 : -1), 0.083 - i * 0.003, -0.02 + i * 0.014], s.material('#d8cfb8'), [0.4, 0, (i % 2 ? 1 : -1) * 0.9]);
    }
    // Drool or foam.
    if (a.wet === 'drool') {
      const spit = new THREE.MeshStandardMaterial({ color: '#e9f1f2', transparent: true, opacity: 0.55, roughness: 0.05, depthWrite: false });
      for (let i = 0; i < 5; i++) { const x = (random() - 0.5) * 0.05, z = L * mix(0.4, 1.05, random()), len = mix(0.03, 0.1, random()); limb(J, [x, 0.0, z], [x, -len, z + 0.004], 0.002, 0.0012, spit); ball(J, [0.004, 0.006, 0.004], [x, -len, z + 0.004], spit, [0, 0, 0], 8); }
    } else if (a.wet === 'foam') {
      const foam = s.material('#f4f4ee', { roughness: 0.9 });
      const dots = Array.from({ length: 34 }, () => { const sx = random() < 0.5 ? -1 : 1; return { at: [sx * mix(0.02, 0.04, random()) * spec.wide, 0.018 + random() * 0.012, L * mix(0.3, 1.1, random())] as P3, size: mix(0.004, 0.009, random()) }; });
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), foam, dots.length), m = new THREE.Matrix4();
      dots.forEach((d, i) => mesh.setMatrixAt(i, m.makeScale(d.size, d.size, d.size).setPosition(...d.at)));
      mesh.castShadow = true;
      J.add(mesh);
    }
    // What it holds.
    if (a.holding === 'bone') {
      const bone = s.material('#e9e0c4', { roughness: 0.6 });
      const B = group(J, [0, 0.04, L * 0.75], [0, 0, 0.15]);
      part(B, new THREE.CylinderGeometry(0.011, 0.011, 0.2, 10), bone, [0, 0, 0], 1, [0, 0, Math.PI / 2]);
      for (const sx of [-1, 1]) for (const dz of [-1, 1]) ball(B, [0.017, 0.017, 0.017], [sx * 0.1, 0, dz * 0.011], bone, [0, 0, 0], 10);
    } else if (a.holding === 'cloth') {
      const cloth = s.material('#b8261f', { roughness: 0.9, side: THREE.DoubleSide });
      const C = group(J, [0.01, 0.03, L * 0.9]);
      part(C, new THREE.PlaneGeometry(0.09, 0.14, 4, 6), cloth, [0.02, -0.05, 0.01], 1, [0.2, 0.5, 0.2]);
      part(C, new THREE.PlaneGeometry(0.05, 0.09, 2, 4), cloth, [-0.03, -0.03, 0.0], 1, [-0.2, -0.6, -0.3]);
    } else if (a.holding === 'slipper') {
      const plaid = s.material('#7a3b3b', { roughness: 0.95 }), sole = s.material('#d9c9a8');
      const S = group(J, [0, 0.035, L * 0.8], [0.2, 0, 0.3]);
      ball(S, [0.1, 0.016, 0.04], [0, 0, 0], sole);
      ball(S, [0.055, 0.035, 0.043], [0.045, 0.02, 0], plaid);
      ball(S, [0.015, 0.015, 0.015], [0.08, 0.05, 0], s.material('#f1ede0', { roughness: 1 }), [0, 0, 0], 8);
    }

    const speed = mix(4, 22, mood.energy), amount = mounted || bare ? 0 : mix(0.004, 0.03, mood.energy) * (0.4 + I);
    const baseJaw = J.rotation.x;
    return s.finish({ update: (_dt, time) => { if (!amount) return; J.rotation.x = baseJaw + Math.sin(time * speed) * amount; upper.position.y = Math.sin(time * speed * 1.3) * amount * 0.05; } });
  },
});
