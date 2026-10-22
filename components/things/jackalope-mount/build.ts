import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type P3, ball, box, card, eye, eyeMaterial, furMaterial, group, limb, part, plaque, taper, tufts, woodMaterial } from './parts';

type Tuft = { at: P3; dir: P3; len: number; r: number };

export default defineThing({
  questions: {
    gaff: choice('Which hoax creature is it?', {
      jackalope: 'A jackalope: a hare head with small deer antlers.',
      wolpertinger: 'A wolpertinger: antlered hare with fangs and bird wings, Bavarian and feral.',
      trout: 'A fur-bearing trout: a fish in a thick white pelt, mounted side-on.',
      mermaid: 'A Fiji mermaid: a shrivelled monkey torso sewn to a fish tail, screaming.',
    }),
    convincing: score('How convincing is the fakery?', ['Seamless, you almost believe it', 'Good until you look closely', 'Mismatched fur and a visible seam', 'Blobs of glue, crooked parts, shameless']),
    expression: choice('What is its expression?', {
      smug: 'Smug and half-lidded, in on the joke.',
      startled: 'Wide-eyed and startled.',
      fierce: 'Fierce, teeth bared, the terror of the prairie.',
      dopey: 'Dopey and cross-eyed.',
    }),
    antlers: score('If it has antlers, how big are they?', ['Tiny velvet buds', 'Neat little forks', 'A proper small rack', 'Absurdly oversized for the head']),
    ears: choice('If it has hare ears, how are they held?', {
      up: 'Both straight up, alert.',
      flopped: 'One up, one flopped over.',
      back: 'Both laid back flat.',
      wide: 'Splayed out sideways.',
    }),
    text: choice('What does the plaque or tag say?', {
      none: 'Nothing at all.',
      souvenir: 'A souvenir greeting from a small western town.',
      latin: 'A solemn fake Latin species name.',
      price: 'A dangling price tag.',
      warning: 'GENUINE, in capitals, which settles it.',
    }),
    dressing: choice('Has it been given anything extra?', {
      none: 'No, the animal alone.',
      hat: 'A tiny cowboy hat.',
      bandana: 'A red bandana round the neck or body.',
      pipe: 'A little pipe in its mouth.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const root = s.root, wear = mood.wear, bad = a.convincing;
    const wood = woodMaterial(random, mood.warmth > 0.5 ? '#7b4b27' : '#5a3a26', 0.7 - wear * 0.5);
    const fur = furMaterial(random, '#a8875f', { dust: wear, bald: Math.max(0, wear - 0.6) * 1.5 });
    const odd = furMaterial(random, bad > 0.5 ? '#8a8d92' : '#a8875f', { dust: wear });
    const pale = furMaterial(random, '#e8dcc4', { dust: wear, streak: 0.1 });
    const dark = s.material('#17110e');
    const horn = s.material('#cdb78c', { roughness: 0.55 });
    const tooth = s.material('#efe6c8', { roughness: 0.4 });
    const glue = s.material('#d8b85a', { roughness: 0.15 });
    const skew = (amount: number) => (random() - 0.5) * amount * bad;
    let tagAt: P3 = [0.05, 0.1, 0.1], hatAt: P3 = [0, 0.1, 0.1], textAt: P3 = [0, -0.12, 0.03], pipeAt: P3 = [0, 0, 0.2], neckAt: P3 = [0, 0, 0.06], neckR = 0.06;
    let textW = 0.15;

    if (a.gaff === 'jackalope' || a.gaff === 'wolpertinger') {
      const wolp = a.gaff === 'wolpertinger';
      plaque(root, wolp ? 'oval' : 'shield', 0.27, 0.35, wood, 0.022);
      taper(root, [[0, -0.01, 0], [0, 0.01, 0.05], [0, 0.03, 0.1]], 0.07, 0.045, fur, 12);
      if (bad > 0.45) for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; box(root, [0.004, 0.016, 0.004], [Math.cos(t) * 0.06, Math.sin(t) * 0.06 + 0.005, 0.045], dark, [0, 0, t]); }
      const H = group(root, [0, 0.04, 0.115], [0.1, (random() - 0.5) * 0.5, skew(0.5)]);
      ball(H, [0.048, 0.05, 0.058], [0, 0, 0], fur);
      limb(H, [0, -0.008, 0.03], [0, -0.028, 0.095], 0.036, 0.022, fur, 1.1);
      for (const sx of [-1, 1]) ball(H, [0.026, 0.024, 0.028], [sx * 0.022, -0.034, 0.07], pale);
      ball(H, [0.009, 0.007, 0.006], [0, -0.022, 0.118], s.material('#c9777a', { roughness: 0.4 }));
      const fierce = a.expression === 'fierce' || wolp;
      for (const sx of [-1, 1]) box(H, [0.007, fierce ? 0.02 : 0.014, 0.004], [sx * 0.0045, -0.052, 0.098], tooth);
      if (wolp) for (const sx of [-1, 1]) taper(H, [[sx * 0.016, -0.045, 0.092], [sx * 0.018, -0.065, 0.097], [sx * 0.016, -0.085, 0.09]], 0.005, 0.001, tooth, 6);
      if (a.expression === 'dopey') limb(H, [0, -0.05, 0.085], [0.012, -0.075, 0.1], 0.008, 0.009, s.material('#de8088'), 1.4);
      const whiskers: Tuft[] = [];
      for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) whiskers.push({ at: [sx * 0.03, -0.03 + i * 0.004, 0.085], dir: [sx, (i - 2) * 0.18, 0.25], len: 0.065, r: 0.0012 });
      tufts(H, s.material('#f1ead8'), whiskers, 4);
      const eyeMat = eyeMaterial(wolp ? '#c4401e' : '#6b3c14', a.expression === 'startled' ? 'round' : 'wide', a.expression === 'startled' || a.expression === 'dopey');
      for (const sx of [-1, 1]) {
        const at: P3 = [sx * 0.041, 0.014 + skew(0.03), 0.03];
        const r = 0.0135 * (a.expression === 'startled' ? 1.3 : 1) * (1 + (sx === 1 ? bad * 0.35 * random() : 0));
        eye(H, at, r, eyeMat, a.expression === 'dopey' ? [sx * 0.2, sx * 0.3] : [sx * 0.85, 0]);
        if (a.expression === 'smug') ball(H, [r * 1.15, r * 0.75, r * 1.15], [at[0], at[1] + r * 0.55, at[2]], fur, [0, 0, sx * -0.15], 10);
        if (fierce) ball(H, [0.02, 0.007, 0.012], [at[0] * 0.92, at[1] + 0.015, at[2] + 0.012], fur, [0, sx * 0.6, sx * 0.6], 8);
        // Ears.
        const earMat = sx === 1 ? odd : fur;
        const pose = { up: [0.05, 0.12], flopped: sx === 1 ? [0.1, 0.25] : [0.05, 0.1], back: [-1.15, 0.2], wide: [0.0, 1.15] }[a.ears];
        const E = group(H, [sx * 0.022, 0.04, -0.018], [pose[0], 0, -sx * pose[1] + skew(0.4)]);
        const flop = a.ears === 'flopped' && sx === 1;
        ball(E, [0.021, flop ? 0.04 : 0.078, 0.008], [0, flop ? 0.04 : 0.078, 0], earMat);
        ball(E, [0.012, flop ? 0.03 : 0.06, 0.005], [0, flop ? 0.04 : 0.078, 0.006], s.material('#d6a69a'));
        if (flop) { const tip = group(E, [0, 0.078, 0], [1.9, 0, -0.3]); ball(tip, [0.02, 0.045, 0.008], [0, 0.04, 0], earMat); }
        // Antlers, glued on.
        const k = mix(0.35, 1.9, a.antlers);
        const A = group(H, [sx * 0.019, 0.046, 0.002], [skew(0.7), 0, skew(0.9)]);
        A.scale.setScalar(k);
        const { curve } = taper(A, [[0, 0, 0], [sx * 0.018, 0.035, -0.012], [sx * 0.04, 0.075, -0.012], [sx * 0.04, 0.115, 0.012]], 0.0065, a.antlers < 0.2 ? 0.006 : 0.0015, a.antlers < 0.2 ? s.material('#6a4a34', { roughness: 1 }) : horn, 7);
        if (a.antlers >= 0.2) for (const t of a.antlers > 0.55 ? [0.12, 0.45, 0.7] : [0.4]) {
          const o = curve.getPointAt(t);
          taper(A, [[o.x, o.y, o.z], [o.x + sx * 0.004, o.y + 0.02, o.z + 0.012], [o.x + sx * 0.002, o.y + 0.045, o.z + 0.02]], 0.0045, 0.001, horn, 6);
        }
        if (bad > 0.6) ball(H, [0.012, 0.007, 0.012], [sx * 0.019, 0.047, 0.002], glue, [0, 0, 0], 8);
        if (sx === 1) { root.updateMatrixWorld(true); const p = A.localToWorld(new THREE.Vector3(sx * 0.04, 0.075, -0.012)); tagAt = [p.x, p.y, p.z]; }
      }
      if (wolp) {
        const feather = s.material('#6b4a2e', { roughness: 0.8 }), bar = s.material('#c9b28a', { roughness: 0.8 });
        for (const sx of [-1, 1]) {
          const W = group(root, [sx * 0.06, 0.02, 0.03], [0, sx * -0.35, sx * (-0.25 + skew(0.5))]);
          for (let i = 0; i < 7; i++) {
            const ang = mix(0.15, 1.5, i / 6);
            ball(W, [0.07 + i * 0.006, 0.014, 0.004], [sx * Math.cos(ang) * (0.07 + i * 0.006), Math.sin(ang) * (0.07 + i * 0.006), 0.004 * i], i % 2 ? feather : bar, [0, 0, sx > 0 ? ang : Math.PI - ang], 10);
          }
        }
      }
      root.updateMatrixWorld(true);
      const top = H.localToWorld(new THREE.Vector3(0, 0.05, 0.005)), mouth = H.localToWorld(new THREE.Vector3(0.012, -0.05, 0.1));
      hatAt = [top.x, top.y, top.z]; pipeAt = [mouth.x, mouth.y, mouth.z]; textAt = [0, -0.118, 0.026]; neckAt = [0, 0.012, 0.062]; neckR = 0.058; textW = 0.15;
    } else if (a.gaff === 'trout') {
      plaque(root, 'slab', 0.5, 0.2, wood, 0.022);
      const F = group(root, [0, 0.012, 0.055], [0, 0, 0.06 + skew(0.3)]);
      const scale = s.material('#7c8a6a', { roughness: 0.35, metalness: 0.3 });
      ball(F, [0.16, 0.048, 0.03], [0, 0, 0], pale);
      ball(F, [0.05, 0.04, 0.027], [-0.125, -0.002, 0], scale);
      const fin = s.material(bad > 0.6 ? '#d97a3a' : '#a0764a', { roughness: 0.5, side: THREE.DoubleSide });
      const tri = (pts: [number, number][], at: P3) => { const sh = new THREE.Shape(); sh.moveTo(...pts[0]); for (const p of pts.slice(1)) sh.lineTo(...p); return part(F, new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: false }), fin, at); };
      tri([[0, 0], [0.085, 0.065], [0.06, 0], [0.085, -0.065]], [0.14, 0, 0]);
      tri([[-0.03, 0], [0.01, 0.045], [0.05, 0]], [0, 0.042, 0]);
      tri([[0, 0], [0.04, -0.035], [0.045, 0]], [-0.06, -0.03, 0.02]);
      tri([[0, 0], [0.03, -0.03], [0.04, 0]], [0.06, -0.036, 0]);
      const open = a.expression === 'fierce' || a.expression === 'startled' ? 0.5 : 0.12;
      const jaw = group(F, [-0.14, -0.012, 0], [0, 0, open]);
      ball(jaw, [0.03, 0.008, 0.02], [-0.025, 0, 0], scale);
      if (open > 0.3) { ball(F, [0.02, 0.012, 0.016], [-0.15, -0.01, 0], s.material('#7c2f33')); if (a.expression === 'fierce') for (let i = 0; i < 5; i++) box(jaw, [0.003, 0.008, 0.003], [-0.045 + i * 0.008, 0.008, 0.012], tooth); }
      const fishEye = eyeMaterial('#d8c56a', a.expression === 'smug' ? 'hslit' : 'fish', a.expression === 'startled' || a.expression === 'dopey');
      eye(F, [-0.135, 0.012, 0.022], a.expression === 'startled' ? 0.015 : 0.011, fishEye, a.expression === 'dopey' ? [-0.6, 0.5] : [-0.15, 0]);
      const pelt: Tuft[] = [];
      const n = Math.round(mix(230, 120, bad));
      for (let i = 0; i < n; i++) {
        const u = mix(-0.55, 0.9, random()), v = (random() - 0.5) * 2.4;
        const r = Math.sqrt(Math.max(0, 1 - u * u));
        pelt.push({ at: [u * 0.16, Math.sin(v) * 0.046 * r, Math.cos(v) * 0.029 * r], dir: [0.9, Math.sin(v) * 0.7, Math.cos(v) * 0.5], len: mix(0.025, 0.05, random()), r: 0.007 });
      }
      tufts(F, random() < bad * 0.8 ? furMaterial(random, '#d98a3c', {}) : pale, pelt);
      if (bad > 0.6) for (let i = 0; i < 4; i++) ball(F, [0.01, 0.006, 0.008], [-0.09 + skew(0.02), -0.03 + i * 0.02, 0.022], glue, [0, 0, 0], 8);
      tagAt = [0.2, 0.06, 0.06]; hatAt = [-0.125, 0.052, 0.055]; pipeAt = [-0.172, -0.008, 0.06]; textAt = [0.11, -0.072, 0.024]; neckAt = [-0.08, 0.012, 0.055]; neckR = 0.05; textW = 0.17;
    } else {
      // The Fiji mermaid, propped on its arms on a little stand.
      box(root, [0.44, 0.03, 0.18], [0, 0.015, 0], wood);
      const M = group(root, [0, 0.03, 0], [0, -0.35, 0]);
      const dried = s.material(mix(0, 1, bad) > 0.5 ? '#6a4a30' : '#4a3626', { roughness: 0.9 });
      const tailMat = s.material(bad > 0.5 ? '#6f7a52' : '#4d4630', { roughness: 0.6, metalness: 0.15 });
      taper(M, [[0.19, 0.03, 0.02], [0.1, 0.03, 0.035], [0.02, 0.04, 0.01], [-0.05, 0.08, 0], [-0.085, 0.13, 0]], 0.009, 0.034, tailMat, 10);
      const finMat = s.material('#3c3324', { roughness: 0.7, side: THREE.DoubleSide });
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.07, 0.06); sh.lineTo(0.05, 0); sh.lineTo(0.07, -0.05); sh.lineTo(0, 0);
      part(M, new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: false }), finMat, [0.185, 0.03, 0.02], 1, [-1.2, 0, 0]);
      for (let i = 0; i < 4; i++) part(M, new THREE.ExtrudeGeometry(sh, { depth: 0.002, bevelEnabled: false }), finMat, [0.1 - i * 0.04, 0.055 + i * 0.012, 0.02 - i * 0.008], 0.35, [0, 0, 1.2]);
      const torso = group(M, [-0.085, 0.13, 0], [0, 0, 0.75]);
      limb(torso, [0, 0, 0], [0, 0.075, 0], 0.034, 0.03, dried, 1.15);
      for (let i = 0; i < 5; i++) part(torso, new THREE.TorusGeometry(0.031, 0.004, 5, 14), dried, [0, 0.015 + i * 0.014, 0], [1.2, 1, 1], [Math.PI / 2, 0, 0]);
      if (bad > 0.4) for (let i = 0; i < 10; i++) { const t = (i / 10) * Math.PI * 2; box(torso, [0.003, 0.014, 0.003], [Math.cos(t) * 0.04, -0.004, Math.sin(t) * 0.034], s.material('#d9cfb4'), [0, 0, 0.5]); }
      const H = group(torso, [0.0, 0.118, 0], [0, 1.2 + skew(0.5), -0.75 + skew(0.3)]);
      ball(H, [0.034, 0.038, 0.038], [0, 0, 0], dried);
      limb(H, [0, -0.012, 0.02], [0, -0.016, 0.045], 0.02, 0.015, dried);
      const open = a.expression === 'smug' ? 0.15 : 0.75;
      const jaw = group(H, [0, -0.026, 0.01], [open, 0, 0]);
      limb(jaw, [0, 0, 0], [0, 0, 0.042], 0.016, 0.012, dried);
      ball(H, [0.012, 0.012, 0.014], [0, -0.03, 0.035], dark);
      for (let i = 0; i < 5; i++) { box(jaw, [0.003, 0.007, 0.003], [(i - 2) * 0.005, 0.012, 0.045], tooth); box(H, [0.003, 0.007, 0.003], [(i - 2) * 0.005, -0.03, 0.055], tooth); }
      const glass = eyeMaterial('#c9a23c', 'round', true);
      for (const sx of [-1, 1]) {
        ball(H, [0.011, 0.012, 0.008], [sx * 0.015, 0.006, 0.031], dark, [0, 0, 0], 8);
        if (a.expression !== 'fierce') eye(H, [sx * 0.015, 0.006 + skew(0.012), 0.03], a.expression === 'startled' ? 0.0095 : 0.007, glass, a.expression === 'dopey' ? [-sx * 0.5, 0.2] : [0, 0]);
        // Arms: elbows on the stand, hands to the cheeks.
        const sh0: P3 = [0.005, 0.07, sx * 0.035], el: P3 = [0.07, 0.0, sx * 0.055], hand: P3 = [0.02, 0.105, sx * 0.045];
        limb(torso, sh0, el, 0.009, 0.007, dried);
        limb(torso, el, hand, 0.007, 0.006, dried);
        for (let f = 0; f < 3; f++) limb(torso, hand, [hand[0] - 0.012 + f * 0.008, hand[1] + 0.024, hand[2] - sx * 0.008], 0.003, 0.002, dried);
      }
      const hair: Tuft[] = [];
      for (let i = 0; i < 22; i++) hair.push({ at: [(random() - 0.5) * 0.04, 0.03, -0.01 + (random() - 0.5) * 0.03], dir: [(random() - 0.5), 0.6, -0.6 - random()], len: mix(0.03, 0.07, random()), r: 0.003 });
      tufts(H, s.material(bad > 0.6 ? '#c9b98a' : '#2a2019', { roughness: 1 }), hair, 4);
      root.updateMatrixWorld(true);
      const top = H.localToWorld(new THREE.Vector3(0, 0.038, 0)), mouth = H.localToWorld(new THREE.Vector3(0.008, -0.03, 0.05)), n = torso.localToWorld(new THREE.Vector3(0, 0.085, 0));
      hatAt = [top.x, top.y, top.z]; pipeAt = [mouth.x, mouth.y, mouth.z]; neckAt = [n.x, n.y, n.z]; neckR = 0.03;
      tagAt = [0.18, 0.1, 0.05]; textAt = [0.02, 0.016, 0.0905]; textW = 0.2;
      if (a.text === 'price') limb(root, [0.17, 0.065, 0.03], tagAt, 0.001, 0.001, dark);
    }

    // Lettering.
    const town = ['DOUGLAS, WYO.', 'WALL, S. DAK.', 'TUCUMCARI, N.M.', 'PIGEON FORGE'][Math.floor(random() * 4)];
    const latin = { jackalope: 'LEPUS CORNUTUS', wolpertinger: 'CRISENSUS BAVARICUS', trout: 'SALMO PELLITUS', mermaid: 'SIRENA FEEJEENSIS' }[a.gaff];
    if (a.text === 'souvenir') card(root, ['GREETINGS FROM', town], textW, 0.045, textAt, { paper: '#f0dfae', ink: '#a02b1c', border: true, rot: [0, 0, skew(0.3)] });
    else if (a.text === 'latin') card(root, [latin], textW, 0.03, textAt, { paper: '#c8a24a', ink: '#2e210c', metal: true, border: true });
    else if (a.text === 'warning') card(root, ['GENUINE', a.gaff.toUpperCase()], textW * 0.8, 0.045, textAt, { paper: '#f4f0e0', ink: '#1c1c1c', border: true, rot: [0, 0, skew(0.3)] });
    else if (a.text === 'price') {
      limb(root, tagAt, [tagAt[0] + 0.01, tagAt[1] - 0.05, tagAt[2] + 0.01], 0.0008, 0.0008, dark);
      card(root, [`$${4 + Math.floor(random() * 30)}.95`], 0.06, 0.035, [tagAt[0] + 0.012, tagAt[1] - 0.067, tagAt[2] + 0.012], { paper: '#f6efd6', ink: '#b0271f', rot: [0, 0.3, (random() - 0.5) * 0.6] });
    }
    // Extras.
    if (a.dressing === 'hat') {
      const felt = s.material('#8a5a34', { roughness: 0.9 });
      const hat = group(root, hatAt, [0.1, random(), (random() - 0.5) * 0.4 - 0.1]);
      part(hat, new THREE.CylinderGeometry(0.04, 0.042, 0.004, 20), felt, [0, 0.002, 0], [1.25, 1, 1]);
      part(hat, new THREE.CylinderGeometry(0.018, 0.024, 0.03, 16), felt, [0, 0.018, 0]);
      part(hat, new THREE.TorusGeometry(0.0235, 0.003, 5, 16), s.material('#2a1a12'), [0, 0.006, 0], 1, [Math.PI / 2, 0, 0]);
      for (const sx of [-1, 1]) ball(hat, [0.012, 0.01, 0.04], [sx * 0.045, 0.008, 0], felt, [0, 0, sx * 0.6], 8);
    } else if (a.dressing === 'bandana') {
      const red = s.material('#c22a25', { roughness: 0.8 });
      part(root, new THREE.TorusGeometry(neckR, 0.009, 8, 22), red, neckAt, [1, 1, 1.5], a.gaff === 'trout' ? [0, Math.PI / 2, 0] : a.gaff === 'mermaid' ? [Math.PI / 2, 0, 0.7] : [0.2, 0, 0]);
      ball(root, [0.022, 0.03, 0.008], [neckAt[0] + 0.01, neckAt[1] - neckR - 0.012, neckAt[2] + (a.gaff === 'jackalope' || a.gaff === 'wolpertinger' ? 0.02 : 0.028)], red, [0, 0, 0.3], 8);
    } else if (a.dressing === 'pipe') {
      const briar = s.material('#4a2a18', { roughness: 0.5 });
      const dir: P3 = a.gaff === 'trout' ? [-0.05, -0.012, 0.012] : [0.022, -0.012, 0.04];
      const end: P3 = [pipeAt[0] + dir[0], pipeAt[1] + dir[1], pipeAt[2] + dir[2]];
      limb(root, pipeAt, end, 0.003, 0.0035, briar);
      part(root, new THREE.CylinderGeometry(0.01, 0.008, 0.02, 10), briar, [end[0], end[1] + 0.008, end[2]]);
      ball(root, [0.008, 0.003, 0.008], [end[0], end[1] + 0.018, end[2]], new THREE.MeshStandardMaterial({ color: '#ff7a2a', emissive: '#ff5a10', emissiveIntensity: mix(0.3, 1.5, mood.energy) }), [0, 0, 0], 8);
    }
    return s.finish();
  },
});
