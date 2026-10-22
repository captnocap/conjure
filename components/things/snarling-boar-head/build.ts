import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type P3, ball, box, card, eye, eyeMaterial, furMaterial, group, limb, part, plaque, taper, tufts, woodMaterial } from './parts';

export default defineThing({
  questions: {
    species: choice('Which animal is it?', {
      boar: 'A wild boar: black-brown, long wedge snout, heavy shoulders.',
      warthog: 'A warthog: grey, flat wide face with warts and great upswept tusks.',
      peccary: 'A peccary: small, grizzled grey with a pale collar and short straight tusks.',
      pig: 'A pink farm pig, a butcher’s-shop or feast-table head.',
    }),
    mouth: choice('What is the mouth doing?', {
      shut: 'Shut and sullen, a long resentful line.',
      snarl: 'Open in a snarl, tongue and teeth showing.',
      grin: 'A wide comic grin with a row of teeth.',
      squeal: 'Gaping as wide as it goes, mid-squeal.',
    }),
    tusks: score('How big are the tusks?', ['Stubs barely past the lip', 'Modest curved tusks', 'Long sharp tusks', 'Great ivory hooks curling past the eyes']),
    finish: choice('How good is the taxidermy?', {
      lifelike: 'Lifelike and symmetrical, a professional job.',
      lumpy: 'Lumpy and lopsided: eyes at different heights, snout askew.',
      balding: 'Balding, with bare hide patches and the stitched seam showing.',
    }),
    crest: score('How does the bristle crest stand?', ['Slicked flat', 'A rough ridge', 'Raised hackles', 'A wild mohawk']),
    dressing: choice('Has anyone dressed it up?', {
      none: 'No, it is left to its dignity.',
      apple: 'A red apple wedged in its mouth.',
      sunglasses: 'A pair of dark sunglasses.',
      cigar: 'A lit cigar in the corner of its mouth.',
      wreath: 'A wreath of green leaves and red berries round its neck.',
    }),
    mount: choice('What is it mounted on?', {
      oval: 'A dark polished oval plaque.',
      shield: 'A carved shield with a brass name plate.',
      board: 'A rough square of barn board.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const root = s.root, wear = mood.wear;
    const lumpy = a.finish === 'lumpy', balding = a.finish === 'balding';
    const off = (amount: number) => (lumpy ? (random() - 0.5) * amount : 0);
    const spec = {
      boar: { fur: '#3b2c22', skin: '#8f7466', len: 0.3, wide: 0.9, r1: 0.05, k: 1, disc: '#b98a80' },
      warthog: { fur: '#787068', skin: '#9a8f86', len: 0.3, wide: 1.3, r1: 0.062, k: 1.05, disc: '#8c7f79' },
      peccary: { fur: '#5e5a52', skin: '#8a8078', len: 0.21, wide: 0.85, r1: 0.04, k: 0.8, disc: '#a98d86' },
      pig: { fur: '#e2a394', skin: '#e9b5a8', len: 0.2, wide: 1.05, r1: 0.06, k: 0.95, disc: '#f0a79a' },
    }[a.species];
    const k = spec.k;
    const hide = furMaterial(random, spec.fur, { bald: balding ? 0.9 : Math.max(0, wear - 0.6) * 1.5, dust: wear, skin: spec.skin, streak: a.species === 'pig' ? 0.06 : 0.24 });
    const dark = s.material('#15100e', { roughness: 0.5 });
    const ivory = s.material('#eadfbe', { roughness: 0.35 });
    const gum = s.material('#7c2f33', { roughness: 0.3 });
    const wood = woodMaterial(random, { oval: '#4a2c1a', shield: '#6e4526', board: '#8d7a62' }[a.mount], a.mount === 'board' ? 0 : 0.8 - wear * 0.6);

    if (a.mount === 'oval') plaque(root, 'oval', 0.46 * k, 0.56 * k, wood, 0.03);
    else if (a.mount === 'shield') plaque(root, 'shield', 0.5 * k, 0.66 * k, wood, 0.03);
    else part(root, new THREE.BoxGeometry(0.5 * k, 0.5 * k, 0.025), wood, [0, 0, 0.0125], 1, [0, 0, (random() - 0.5) * 0.08]);
    if (a.mount === 'shield') card(root, [a.species === 'pig' ? 'BEST IN SHOW' : `${['OLD', 'BIG', 'MEAN'][Math.floor(random() * 3)]} ${['TUSKER', 'GRUNT', 'HOGZILLA'][Math.floor(random() * 3)]}`, `${1961 + Math.floor(random() * 55)}`], 0.16, 0.055, [0, -0.265 * k, 0.034], { paper: '#c8a24a', ink: '#2e210c', metal: true, border: true });

    const all = group(root, [0, 0.02, 0], [0, 0, 0]);
    all.scale.setScalar(k);
    taper(all, [[0, -0.02, 0], [0, 0, 0.12], [0, 0.03, 0.24]], 0.2, 0.15, hide, 16);
    const yaw = (random() - 0.5) * 0.5 + off(0.3);
    const H = group(all, [0, 0.04, 0.25], [0.14, yaw, off(0.25)]);
    ball(H, [0.135, 0.14, 0.15], [0, 0, 0], hide);
    if (lumpy) ball(H, [0.06, 0.07, 0.07], [0.09, -0.04 + off(0.05), 0.04], hide);
    const tipX = off(0.05), L = spec.len;
    const upper = group(H);
    limb(upper, [0, -0.015, 0.07], [tipX, -0.055, 0.07 + L], 0.1, spec.r1, hide, spec.wide);
    // The wet snout disc and nostrils.
    const wet = s.material(spec.disc, { roughness: mix(0.12, 0.6, wear) });
    const disc = group(upper, [tipX, -0.055, 0.07 + L + spec.r1 * 0.55], [0.12, off(0.3), 0]);
    part(disc, new THREE.CylinderGeometry(spec.r1 * 1.06, spec.r1 * 1.0, 0.02, 20), wet, [0, 0, 0], [spec.wide, 1, 1], [Math.PI / 2, 0, 0]);
    for (const sx of [-1, 1]) ball(disc, [0.011, 0.016, 0.006], [sx * 0.02 * spec.wide, 0.002, 0.011], dark, [0, 0, sx * 0.3], 10);

    const open = { shut: 0.02, snarl: 0.42, grin: 0.14, squeal: 0.75 }[a.mouth] + (a.dressing === 'apple' ? 0.32 : 0);
    const J = group(H, [off(0.02), -0.075, 0.02], [open, 0, off(0.25)]);
    limb(J, [0, 0, 0], [0, -0.012, L + 0.02], 0.07, spec.r1 * 0.72, hide, spec.wide * 0.95);
    if (open > 0.1) {
      ball(upper, [0.05 * spec.wide, 0.02, L * 0.42], [0, -0.085, 0.07 + L * 0.5], gum);
      ball(J, [0.045 * spec.wide, 0.018, L * 0.45], [0, 0.035, L * 0.5], gum);
      if (a.dressing !== 'apple') limb(J, [0, 0.045, 0.06], [off(0.03) + (a.mouth === 'squeal' ? 0.02 : 0), 0.05 + (a.mouth === 'snarl' ? 0.01 : 0), L + (a.mouth === 'grin' ? -0.04 : 0.03)], 0.022, 0.02, s.material('#d9787f', { roughness: 0.35 }), 1.5);
      const teeth = a.mouth === 'grin' ? 8 : 5;
      for (const sx of [-1, 1])
        for (let i = 0; i < teeth; i++) {
          const z = mix(0.1, L - 0.02, i / (teeth - 1)), x = sx * mix(0.055, 0.03, i / (teeth - 1)) * spec.wide;
          box(J, [0.012, 0.016, 0.014], [x, 0.045, z], ivory);
          box(upper, [0.012, 0.016, 0.014], [x, -0.1 + i * 0.002, 0.07 + z], ivory);
        }
    }
    // Tusks: the lowers sweep up and out, the uppers whet against them.
    const T = mix(0.5, 2.4, a.tusks) * (a.species === 'peccary' ? 0.5 : 1);
    for (const sx of [-1, 1]) {
      const t = T * (lumpy ? mix(0.7, 1.2, random()) : 1) * (wear > 0.75 && sx === 1 && random() < 0.5 ? 0.3 : 1);
      if (a.species === 'warthog') {
        const o: P3 = [sx * 0.05 * spec.wide, -0.07, 0.07 + L * 0.72];
        taper(upper, [o, [o[0] + sx * 0.06 * t, o[1] - 0.005, o[2] + 0.01], [o[0] + sx * 0.1 * t, o[1] + 0.05 * t, o[2]], [o[0] + sx * 0.085 * t, o[1] + 0.12 * t, o[2] - 0.02]], 0.016, 0.003, ivory, 8);
        taper(J, [[sx * 0.045, 0.02, L * 0.7], [sx * 0.07, 0.045, L * 0.72], [sx * 0.085, 0.08, L * 0.7]], 0.009, 0.002, ivory, 7);
      } else {
        const o: P3 = [sx * 0.04 * spec.wide, 0.02, L * 0.72];
        taper(J, [o, [o[0] + sx * 0.03 * t, o[1] + 0.035 * t, o[2] + 0.012], [o[0] + sx * 0.04 * t, o[1] + 0.075 * t, o[2] - 0.006 * t], [o[0] + sx * 0.028 * t, o[1] + 0.105 * t, o[2] - 0.03 * t]], 0.012, 0.002, ivory, 8);
        taper(upper, [[sx * 0.045 * spec.wide, -0.075, 0.07 + L * 0.7], [sx * 0.065 * spec.wide, -0.07, 0.07 + L * 0.72], [sx * (0.07 * spec.wide + 0.012 * t), -0.045, 0.07 + L * 0.7]], 0.009, 0.003, ivory, 7);
      }
    }
    if (a.species === 'warthog') for (const sx of [-1, 1]) { ball(H, [0.03, 0.04, 0.03], [sx * 0.125, -0.02, 0.09], hide); ball(upper, [0.02, 0.02, 0.025], [sx * 0.07, -0.035, 0.07 + L * 0.55], hide); }
    if (a.species === 'peccary') part(all, new THREE.TorusGeometry(0.168, 0.02, 8, 28), furMaterial(random, '#cfc6b4', { dust: wear }), [0, 0.012, 0.13], [1, 1, 1.4], [0.1, 0, 0]);

    // Eyes and ears.
    const amber = eyeMaterial(a.species === 'pig' ? '#5c7fa0' : '#8a4a16', 'round', lumpy);
    for (const sx of [-1, 1]) {
      const at: P3 = [sx * 0.092, 0.05 + off(0.045), 0.1 + off(0.02)];
      ball(H, [0.022, 0.018, 0.016], [at[0] * 0.97, at[1], at[2]], dark, [0, sx * 0.75, 0], 10);
      eye(H, at, 0.0155 * (lumpy ? mix(0.8, 1.5, random()) : 1), amber, [sx * 0.7 + off(0.8), off(0.5)]);
      if (a.mouth === 'snarl' || a.mouth === 'shut') ball(H, [0.03, 0.012, 0.022], [at[0] * 0.95, at[1] + 0.017, at[2] + 0.004], hide, [0.2, sx * 0.7, sx * 0.55], 10);
      const ear = group(H, [sx * 0.1, 0.1, -0.05], [0.25 + off(0.5), sx * 0.3, -sx * (0.55 + off(0.8) + (a.species === 'pig' ? 0.5 : 0))]);
      ball(ear, [0.045, 0.085, 0.016], [0, 0.07, 0], hide);
      ball(ear, [0.028, 0.06, 0.008], [0, 0.07, 0.012], s.material('#b78579'));
    }
    // Bristles: a crest from the brow back over the neck, and a beard under the jaw.
    const bristle = s.material(a.species === 'pig' ? '#f2d8cc' : a.species === 'warthog' ? '#b0a08a' : '#1e1612', { roughness: 1 });
    const hairs: { at: P3; dir: P3; len: number; r: number }[] = [];
    const lift = mix(0.2, 1, a.crest) * mix(0.8, 1.2, mood.energy);
    const count = a.species === 'pig' ? 14 : Math.round(mix(40, 90, a.crest) * (balding ? 0.4 : 1));
    for (let i = 0; i < count; i++) {
      const t = random(), ang = mix(-0.5, 2.0, t);
      hairs.push({ at: [(random() - 0.5) * 0.05, Math.cos(ang) * 0.135, -Math.sin(ang) * 0.13 + 0.03], dir: [(random() - 0.5) * 0.5, Math.cos(ang) + lift * 0.6, -Math.sin(ang) - (1 - lift) * 1.2], len: mix(0.03, 0.11, lift) * mix(0.6, 1.2, random()), r: 0.006 });
    }
    if (a.species !== 'pig') for (let i = 0; i < 26; i++) { const sx = random() < 0.5 ? -1 : 1; hairs.push({ at: [sx * mix(0.07, 0.125, random()), -0.07 - random() * 0.05, random() * 0.1 - 0.02], dir: [sx * 0.7, -1, 0.2], len: mix(0.03, 0.07, random()), r: 0.006 }); }
    tufts(H, bristle, hairs);
    if (balding || wear > 0.7) {
      for (let i = 0; i < 9; i++) box(H, [0.006, 0.02, 0.005], [0.006 * (i % 2 ? 1 : -1), 0.13 - i * 0.004, 0.06 + i * 0.022], s.material('#d8cfb8'), [0.5, 0, (i % 2 ? 1 : -1) * 0.9]);
      for (let i = 0; i < 4; i++) ball(H, [0.012, 0.016, 0.01], [0.11, -0.02 - i * 0.012, -0.04 - i * 0.01], s.material('#e6dcc0', { roughness: 1 }), [0, 0, 0], 8);
    }

    // Dressing.
    if (a.dressing === 'apple') {
      const A = group(H, [tipX * 0.7, -0.105, 0.07 + L * 0.78]);
      ball(A, [0.052, 0.048, 0.052], [0, 0, 0], s.material(mood.cheer > 0.3 ? '#c8242b' : '#7da63a', { roughness: 0.25 }));
      part(A, new THREE.CylinderGeometry(0.003, 0.003, 0.03, 6), s.material('#4a3320'), [0.004, 0.055, 0], 1, [0, 0, -0.3]);
      ball(A, [0.018, 0.004, 0.01], [0.022, 0.06, 0], s.material('#3f8a3a'), [0, 0, 0.4], 8);
    } else if (a.dressing === 'sunglasses') {
      const shade = s.material('#0b0c10', { roughness: 0.08, metalness: 0.6 });
      const G = group(H, [0, 0.055, 0.155], [0.15, 0, off(0.3)]);
      for (const sx of [-1, 1]) {
        part(G, new THREE.CylinderGeometry(0.042, 0.042, 0.008, 20), shade, [sx * 0.058, 0, 0], [1.15, 1, 0.85], [Math.PI / 2, 0, 0]);
        box(G, [0.005, 0.006, 0.17], [sx * 0.112, 0.012, -0.085], shade, [0, sx * 0.1, 0]);
      }
      box(G, [0.04, 0.008, 0.008], [0, 0.012, 0], shade);
    } else if (a.dressing === 'cigar') {
      const C = group(J, [0.05 * spec.wide, 0.05, L * 0.75], [-0.3 - open, 0.7, 0]);
      part(C, new THREE.CylinderGeometry(0.012, 0.011, 0.11, 10), s.material('#6b4426', { roughness: 0.8 }), [0, 0, 0.055], 1, [Math.PI / 2, 0, 0]);
      part(C, new THREE.CylinderGeometry(0.0125, 0.0125, 0.012, 10), s.material('#c9a23c', { metalness: 0.6 }), [0, 0, 0.04], 1, [Math.PI / 2, 0, 0]);
      ball(C, [0.012, 0.012, 0.01], [0, 0, 0.112], new THREE.MeshStandardMaterial({ color: '#ff6a1c', emissive: '#ff4a10', emissiveIntensity: mix(0.6, 2, mood.energy) }), [0, 0, 0], 8);
      ball(C, [0.011, 0.011, 0.012], [0, 0, 0.125], s.material('#b9b6ae', { roughness: 1 }), [0, 0, 0], 8);
    } else if (a.dressing === 'wreath') {
      const leaf = s.material('#2f6b34', { roughness: 0.6 }), berry = s.material('#c21f2a', { roughness: 0.3 });
      for (let i = 0; i < 34; i++) {
        const t = (i / 34) * Math.PI * 2, r = 0.185;
        ball(all, [0.035, 0.014, 0.008], [Math.cos(t) * r, Math.sin(t) * r + 0.005, 0.1 + (random() - 0.5) * 0.03], leaf, [random(), random(), t + random() - 0.5], 8);
        if (i % 4 === 0) ball(all, [0.011, 0.011, 0.011], [Math.cos(t) * (r + 0.012), Math.sin(t) * (r + 0.012), 0.115], berry, [0, 0, 0], 8);
      }
    }
    return s.finish();
  },
});
