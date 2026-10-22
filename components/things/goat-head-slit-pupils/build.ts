import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type P3, ball, box, eye, eyeMaterial, furMaterial, group, limb, part, plaque, taper, tufts, woodMaterial } from './parts';

export default defineThing({
  questions: {
    horns: choice('What form do the horns take?', {
      nubs: 'Short blunt nubs, barely through the hair.',
      scimitar: 'Long ridged scimitars sweeping up and back.',
      markhor: 'Tall corkscrew markhor spirals, mythic.',
      jacob: 'Four horns: two upright, two curling down past the cheeks.',
      wide: 'Flat horns twisting out sideways like handlebars.',
    }),
    expression: choice('What is the goat doing?', {
      chewing: 'Blank sideways chewing, a stalk of hay in its mouth.',
      bleat: 'A sideways-jawed bleat with the tongue out.',
      sideeye: 'A sly side-eye, judging you.',
      butt: 'Head lowered, horns forward, about to butt.',
      stare: 'A dead-level stare straight at you, unblinking and unsettling.',
    }),
    ears: choice('What are the ears like?', {
      airplane: 'Held straight out sideways like aeroplane wings.',
      nubian: 'Long, soft, drooping Nubian ears.',
      lamancha: 'Tiny LaMancha nubs, almost no ears at all.',
      pricked: 'Pricked up and alert.',
    }),
    age: score('How old is the goat?', ['A big-eyed kid', 'A yearling', 'A grown nanny', 'A shaggy old billy']),
    beard: choice('What hangs from its chin?', {
      none: 'A clean chin.',
      tuft: 'A neat little chin tuft.',
      long: 'A long, wispy patriarch beard.',
    }),
    wattles: noul('Does it have a pair of wattles dangling at the throat?'),
    coat: choice('What colour is the coat?', {
      white: 'Creamy white all over.',
      black: 'Black, glossy, a little sinister.',
      alpine: 'Brown with dark face stripes and a dark dorsal line.',
      grey: 'Slate grey with white stripes down the face.',
    }),
    collar: choice('What is round its neck?', {
      bare: 'Nothing.',
      bell: 'A leather collar with a brass bell.',
      rope: 'A frayed rope halter, as if it chewed through.',
      flowers: 'A garland of flowers.',
    }),
    setting: choice('How is the head presented?', {
      fence: 'Alive, neck stretched over a wooden fence rail.',
      bust: 'Alive, head and shoulders, standing square.',
      mounted: 'Mounted on a wall plaque, glass eyes and all.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const root = s.root, wear = mood.wear;
    const mounted = a.setting === 'mounted';
    const k = mix(0.62, 1.12, a.age);
    const young = 1 - a.age;
    const tone = { white: '#ebe4d2', black: '#2b2624', alpine: '#8c5e3a', grey: '#7d7b78' }[a.coat];
    const hide = furMaterial(random, tone, { bald: mounted ? Math.max(0, wear - 0.55) * 1.6 : 0, dust: mounted ? wear : wear * 0.4, streak: 0.16 });
    const stripe = s.material(a.coat === 'alpine' ? '#2d201a' : '#efe9dc', { roughness: 1 });
    const nose = s.material(a.coat === 'white' ? '#d79a94' : '#2a2220', { roughness: 0.4 });
    const hornMat = s.material(a.horns === 'markhor' ? '#8b7a62' : '#5b5248', { roughness: 0.6 });
    const dark = s.material('#1a1513');

    // Body or plaque, and the neck that carries the head.
    let headAt: P3, neckFrom: P3, neckMid: P3;
    if (mounted) {
      plaque(root, 'oval', 0.36 * k, 0.46 * k, woodMaterial(random, '#5a3823', 0.7 - wear * 0.5), 0.028);
      neckFrom = [0, -0.05 * k, 0]; neckMid = [0, 0, 0.14 * k]; headAt = [0, 0.09 * k, 0.27 * k];
    } else {
      ball(root, [0.17 * k, 0.16 * k, 0.24 * k], [0, 0.16 * k, -0.1 * k], hide);
      for (const sx of [-1, 1]) limb(root, [sx * 0.08 * k, 0.12 * k, 0.02 * k], [sx * 0.085 * k, 0, 0.03 * k], 0.04 * k, 0.03 * k, hide);
      neckFrom = [0, 0.2 * k, 0.02 * k]; neckMid = [0, 0.38 * k, 0.1 * k]; headAt = [0, 0.56 * k, 0.2 * k];
      if (a.setting === 'fence') {
        const rail = woodMaterial(random, mix(0, 1, wear) > 0.5 ? '#8f8674' : '#b08d5f', 0);
        for (const y of [0.16, 0.4]) box(root, [0.95, 0.07, 0.03], [0, y * k, 0.19 * k], rail, [0, 0, (random() - 0.5) * 0.04]);
        for (const x of [-0.42, 0.42]) box(root, [0.07, 0.62 * k, 0.07], [x, 0.31 * k, 0.16 * k], rail);
        headAt = [0, 0.54 * k, 0.33 * k]; neckMid = [0, 0.42 * k, 0.16 * k];
      }
    }
    const butt = a.expression === 'butt';
    if (butt) headAt = [headAt[0], headAt[1] - 0.07 * k, headAt[2] + 0.02 * k];
    const yaw = (a.expression === 'sideeye' ? 0.55 : 0) * (random() < 0.5 ? -1 : 1) + (random() - 0.5) * 0.3;
    taper(root, [neckFrom, neckMid, [headAt[0], headAt[1] - 0.03 * k, headAt[2] - 0.05 * k]], (mounted ? 0.12 : 0.1) * k, 0.07 * k, hide, 14);
    if (a.age > 0.7) {
      const mane: { at: P3; dir: P3; len: number; r: number }[] = [];
      for (let i = 0; i < 40; i++) { const t = random(); mane.push({ at: [(random() - 0.5) * 0.12 * k, mix(neckFrom[1], headAt[1] - 0.06 * k, t), mix(neckFrom[2], headAt[2] - 0.08 * k, t) + 0.03 * k], dir: [(random() - 0.5) * 0.6, -1, 0.5], len: 0.09 * k * mix(0.6, 1.2, random()), r: 0.012 * k }); }
      tufts(root, hide, mane);
    }

    const H = group(root, headAt, [butt ? 0.95 : a.expression === 'stare' ? 0.02 : 0.18, yaw, a.expression === 'chewing' ? 0.12 : 0]);
    H.scale.setScalar(k * mix(1, 1.12, young));
    ball(H, [0.066, 0.076, 0.088], [0, 0, 0], hide);
    limb(H, [0, -0.012, 0.045], [0, -0.066, 0.172], 0.056, 0.036, hide, 0.82);
    ball(H, [0.027, 0.018, 0.014], [0, -0.064, 0.203], nose);
    for (const sx of [-1, 1]) ball(H, [0.006, 0.01, 0.004], [sx * 0.012, -0.062, 0.215], dark, [0, 0, sx * 0.5], 8);
    if (a.coat === 'alpine' || a.coat === 'grey') for (const sx of [-1, 1]) ball(H, [0.012, 0.016, 0.085], [sx * 0.03, 0.025, 0.11], stripe, [0.33, sx * -0.12, 0]);
    // Jaw: goats chew sideways.
    const open = { chewing: 0.07, bleat: 0.5, sideeye: 0.02, butt: 0.02, stare: 0.02 }[a.expression];
    const slide = a.expression === 'chewing' || a.expression === 'bleat' ? (random() < 0.5 ? -1 : 1) * 0.016 : 0;
    const J = group(H, [slide, -0.058, 0.01], [open, 0, slide * 9]);
    limb(J, [0, 0, 0], [0, -0.03, 0.158], 0.04, 0.024, hide, 0.85);
    if (open > 0.3) {
      ball(J, [0.022, 0.01, 0.07], [0, 0.012, 0.1], s.material('#6e2a30'));
      limb(J, [0, 0.012, 0.08], [slide * 3, 0.0, 0.19], 0.016, 0.015, s.material('#de8088', { roughness: 0.35 }), 1.4);
      ball(H, [0.024, 0.012, 0.07], [0, -0.085, 0.13], s.material('#6e2a30'));
      for (let i = 0; i < 4; i++) box(J, [0.008, 0.012, 0.006], [(i - 1.5) * 0.009, -0.01, 0.175], s.material('#efe6c8'));
    }
    if (a.expression === 'chewing') {
      const hay = s.material('#d2b659');
      for (let i = 0; i < 3; i++) limb(J, [slide, 0.0, 0.15], [slide * 4 + (random() - 0.5) * 0.08, -0.02 - random() * 0.05, 0.25 + random() * 0.06], 0.002, 0.0015, hay);
    }
    // The eyes: pale, with the flat bar pupil.
    const big = mix(1, 1.35, young);
    const iris = eyeMaterial(a.coat === 'black' ? '#e6c75a' : '#ddcb8c', 'hslit', a.expression === 'sideeye');
    const side = Math.sign(yaw) || 1;
    for (const sx of [-1, 1]) {
      const at: P3 = [sx * 0.054, 0.02, 0.06];
      const look: [number, number] = a.expression === 'sideeye' ? [sx * 0.75 - side * 0.75, 0.05] : a.expression === 'stare' ? [sx * 0.5, 0] : [sx * 0.95, 0];
      eye(H, at, 0.027 * big, iris, look);
      ball(H, [0.033 * big, 0.012, 0.03 * big], [at[0] * 0.98, at[1] + (a.expression === 'sideeye' ? 0.017 : 0.026) * big, at[2]], hide, [0, 0, sx * -0.25], 10);
      // Ears.
      const e = group(H, [sx * 0.064, 0.035, -0.035]);
      const droop = mounted ? wear * 0.4 : 0;
      if (a.ears === 'airplane') { e.rotation.set(0, sx * -0.2, sx * (-0.05 - droop) + (random() - 0.5) * 0.2); ball(e, [0.065, 0.026, 0.012], [sx * 0.06, 0, 0], hide); ball(e, [0.045, 0.016, 0.008], [sx * 0.06, 0, 0.008], s.material('#c99a8f')); }
      else if (a.ears === 'nubian') { e.rotation.set(0.1, 0, sx * 0.25 + (random() - 0.5) * 0.15); ball(e, [0.04, 0.115, 0.014], [sx * 0.012, -0.1, 0.01], hide); }
      else if (a.ears === 'lamancha') ball(e, [0.016, 0.014, 0.012], [0, 0, 0], hide);
      else { e.rotation.set(0.1, sx * 0.4, sx * (-0.9 - droop * 2)); ball(e, [0.028, 0.07, 0.012], [0, 0.06, 0], hide); ball(e, [0.017, 0.05, 0.008], [0, 0.06, 0.008], s.material('#c99a8f')); }
    }
    // Horns.
    const hk = mix(0.28, 1.25, a.age);
    for (const sx of [-1, 1]) {
      const g = group(H, [sx * 0.03, 0.068, -0.02]);
      g.scale.setScalar(hk);
      const snapped = mounted && wear > 0.75 && sx === 1;
      if (a.horns === 'nubs') taper(g, [[0, 0, 0], [sx * 0.004, 0.03, -0.006], [sx * 0.008, 0.05, -0.016]], 0.016, 0.007, hornMat, 8);
      else if (a.horns === 'scimitar') taper(g, ([[0, 0, 0], [sx * 0.015, 0.11, -0.03], [sx * 0.045, 0.21, -0.13], [sx * 0.08, 0.25, -0.28], [sx * 0.1, 0.23, -0.38]] as P3[]).slice(0, snapped ? 3 : 5), 0.021, snapped ? 0.014 : 0.004, hornMat, 8);
      else if (a.horns === 'markhor') {
        const pts: P3[] = [];
        for (let i = 0; i <= 20; i++) { const t = i / 20, ang = t * Math.PI * 4.6 * sx, r = 0.024 * (1 - t * 0.5); pts.push([sx * t * 0.11 + Math.cos(ang) * r - r, t * 0.44, -t * 0.08 + Math.sin(ang) * r]); }
        taper(g, pts.slice(0, snapped ? 9 : 21), 0.022, snapped ? 0.014 : 0.004, hornMat, 8);
      } else if (a.horns === 'jacob') {
        taper(g, [[0, 0, 0], [sx * 0.012, 0.12, -0.01], [sx * 0.03, 0.26, -0.03]], 0.017, 0.004, hornMat, 8);
        taper(g, [[sx * 0.035, -0.012, -0.012], [sx * 0.085, 0.01, -0.04], [sx * 0.1, -0.07, -0.03], [sx * 0.07, -0.13, 0.04], [sx * 0.085, -0.15, 0.1]], 0.016, 0.004, hornMat, 8);
      } else taper(g, [[0, 0, 0], [sx * 0.04, 0.07, -0.03], [sx * 0.14, 0.1, -0.05], [sx * 0.24, 0.07, -0.02], [sx * 0.33, 0.11, 0.0]], 0.02, 0.004, hornMat, 8);
      if (a.horns !== 'nubs') for (let i = 1; i < 5; i++) part(g, new THREE.TorusGeometry(0.02 - i * 0.0018, 0.003, 5, 12), hornMat, [sx * i * 0.003, i * 0.022, -i * 0.005], 1, [Math.PI / 2 - 0.2, 0, 0]);
    }
    ball(H, [0.04, 0.02, 0.03], [0, 0.07, 0.01], hide);
    // Beard and wattles.
    const chin: P3 = [0, -0.035, 0.1];
    if (a.beard !== 'none' && a.age > 0.15) {
      const long = a.beard === 'long' ? 1 : 0.45, strands: { at: P3; dir: P3; len: number; r: number }[] = [];
      for (let i = 0; i < 14; i++) strands.push({ at: [(random() - 0.5) * 0.02, chin[1] - 0.012, chin[2] + (random() - 0.5) * 0.04], dir: [(random() - 0.5) * 0.3, -1, (random() - 0.6) * 0.5], len: 0.15 * long * mix(0.6, 1.1, random()), r: 0.008 });
      tufts(J, a.coat === 'black' ? hide : stripe.color.getHex() === 0x2d201a ? stripe : hide, strands);
    }
    if (a.wattles) for (const sx of [-1, 1]) limb(H, [sx * 0.022, -0.085, -0.005], [sx * 0.026, -0.14, 0.0], 0.007, 0.01, hide);
    // What it wears.
    const cAt: P3 = [mix(neckFrom[0], headAt[0], 0.62), mix(neckFrom[1], headAt[1], 0.62), mix(neckFrom[2], headAt[2], 0.62) - 0.02 * k];
    const tilt = mounted ? 1.05 : 0.5;
    if (a.collar === 'bell' || a.collar === 'rope') {
      const band = a.collar === 'bell' ? s.material('#6a3b22', { roughness: 0.7 }) : s.material('#c8b48a', { roughness: 1 });
      part(root, new THREE.TorusGeometry(0.094 * k, a.collar === 'bell' ? 0.012 : 0.008, 8, 28), band, cAt, [1, 1, a.collar === 'bell' ? 1.8 : 1], [tilt + Math.PI / 2, 0, 0]);
      const hang: P3 = [cAt[0], cAt[1] - 0.085 * k, cAt[2] + (mounted ? 0.06 : 0.075) * k];
      if (a.collar === 'bell') {
        const brass = s.material('#c9a03c', { metalness: 0.8, roughness: 0.3 });
        part(root, new THREE.CylinderGeometry(0.014, 0.03, 0.045, 14), brass, [hang[0], hang[1] - 0.02, hang[2]]);
        ball(root, [0.008, 0.008, 0.008], [hang[0], hang[1] - 0.047, hang[2]], dark, [0, 0, 0], 8);
      } else {
        limb(root, hang, [hang[0] + 0.03, hang[1] - 0.16 * k, hang[2] + 0.02], 0.008, 0.008, band);
        const fray: { at: P3; dir: P3; len: number; r: number }[] = [];
        for (let i = 0; i < 6; i++) fray.push({ at: [hang[0] + 0.03, hang[1] - 0.16 * k, hang[2] + 0.02], dir: [(random() - 0.5), -1, (random() - 0.5)], len: 0.035, r: 0.003 });
        tufts(root, band, fray);
      }
    } else if (a.collar === 'flowers') {
      const hues = ['#f2c530', '#e8559a', '#f4f1e6', '#e2552d', '#8e5bd0'];
      for (let i = 0; i < 20; i++) {
        const t = (i / 20) * Math.PI * 2, r = 0.1 * k;
        const p = new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r).applyEuler(new THREE.Euler(tilt, 0, 0));
        ball(root, [0.022, 0.022, 0.016], [cAt[0] + p.x, cAt[1] + p.y, cAt[2] + p.z], s.material(hues[Math.floor(random() * hues.length)], { roughness: 0.6 }), [random(), random(), 0], 8);
      }
    }
    // Chewing and bleating keep going when the goat is alive.
    const speed = mix(0.6, 3.2, mood.energy);
    const live = !mounted && (a.expression === 'chewing' || a.expression === 'bleat');
    return s.finish({
      update: live ? (_dt, time) => { J.position.x = slide * Math.sin(time * speed * 3); J.rotation.x = open * (0.75 + 0.25 * Math.sin(time * speed * 3 + 1)); } : undefined,
    });
  },
});
