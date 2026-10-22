import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { blob, bust, eye, fur, jaw } from './ape';

export default defineThing({
  questions: {
    colour: score('How intense is the face colour?', ['Dull brown-grey: a female or a beaten subordinate', 'Muted slate blue and brick pink', 'Strong blue and red', 'Blazing: electric blue ridges and scarlet stripe of the dominant male']),
    expression: choice('What is the face doing?', {
      closed: 'Mouth closed, composed, looking down its long nose.',
      grin: 'A teeth-baring grin with the lips lifted off the front teeth: a mandrill greeting.',
      yawn: 'A full yawn: jaw swung wide open, dagger canines and the whole pink mouth on show.',
      threat: 'A head-bob threat: head thrust forward and low, brows raised, pale eyelids flashing, mouth a little open.',
    }),
    hair: score('How long are the beard and crest?', ['Cropped short, hardly any beard', 'A neat pointed beard', 'A full yellow beard and a tall crest', 'A great spade beard, white whiskers and a towering crest']),
    age: choice('How old is it?', {
      juvenile: 'A juvenile with a short muzzle, big eyes and only a hint of colour.',
      prime: 'A prime adult, everything full size.',
      old: 'An old animal: greying whiskers, worn yellow teeth, the colours a little slack.',
    }),
    form: choice('How much of the animal is there?', {
      whole: 'The whole living head on a ruff of olive fur and shoulders.',
      mask: 'The face only, like a carved and painted mask on a slender stand, eye holes empty.',
    }),
    gaze: choice('Where do the amber eyes look?', {
      viewer: 'Straight at the viewer.',
      aside: 'Off to one side.',
      down: 'Down along the nose.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const young = a.age === 'juvenile', old = a.age === 'old', mask = a.form === 'mask';
    const vivid = Math.max(0, Math.min(1, a.colour * (young ? 0.45 : old ? 0.85 : 1) - mood.wear * 0.12));
    const K = young ? 0.72 : 1;
    const blue = new THREE.Color('#5a5660').lerp(new THREE.Color('#1f6cf2'), vivid);
    const ridge = new THREE.Color('#7d7a86').lerp(new THREE.Color('#9fd0ff'), vivid);
    const red = new THREE.Color('#6b4840').lerp(new THREE.Color('#e3172a'), vivid);
    const glow = vivid * mix(0.1, 0.4, mood.cheer);
    const blueMat = s.material(blue, { roughness: 0.5, emissive: blue, emissiveIntensity: glow });
    const ridgeMat = s.material(ridge, { roughness: 0.45, emissive: ridge, emissiveIntensity: glow * 0.6 });
    const redMat = s.material(red, { roughness: 0.4, emissive: red, emissiveIntensity: glow });
    const dark = s.material('#27221f', { roughness: 0.7 });
    const coat = new THREE.Color('#5c5437').lerp(new THREE.Color('#6d675c'), mood.wear * 0.5);
    const under = s.material(coat.clone().multiplyScalar(0.7), { roughness: 0.95 });
    const yellow = new THREE.Color(old ? '#cdbf8a' : '#e9b530').lerp(new THREE.Color('#b9ab7a'), 1 - Math.max(0.35, vivid));
    const gum = s.material('#c0626a', { roughness: 0.4 });
    const tooth = s.material(old ? '#cdb672' : '#f1e9cf', { roughness: 0.35 });
    const bone = s.material('#3a2a1e', { roughness: 0.6 });

    const yawn = a.expression === 'yawn', threat = a.expression === 'threat';
    const head = new THREE.Group();
    const headY = mask ? 0.34 : young ? 0.25 : 0.33;
    head.position.set(0, headY, mask ? 0 : 0.08);
    s.root.add(head);
    const side = random() < 0.5 ? -1 : 1;
    const gaze: [number, number] = a.gaze === 'aside' ? [0.6 * side, 0] : a.gaze === 'down' ? [0, -0.4] : [0, 0];
    head.rotation.set(mask ? -0.18 : -0.3 + (threat ? 0.3 : 0) + (yawn ? -0.25 : 0), mask ? 0 : gaze[0] * 0.4, mask ? 0 : (random() - 0.5) * 0.1);
    if (threat && !mask) head.position.z += 0.07;

    if (!mask) {
      const sw = young ? 0.17 : 0.24, sh = young ? 0.18 : 0.24, sd = young ? 0.14 : 0.19;
      s.root.add(bust(s, [sw, sh, sd], under));
      fur(s, { at: [0, 0, 0], radii: [sw, sh, sd], count: 900, length: 0.06, color: coat, droop: 0.6, keep: (d) => d.y > 0.03, colorAt: (d) => (d.z > 0.55 && d.y < 0.6 ? '#d9cfae' : undefined) });
      blob(s, [0.092, 0.095, 0.105], [0, 0.03, -0.03], under, [0, 0, 0], head);
      fur(s, { parent: head, at: [0, 0.03, -0.03], radii: [0.092, 0.095, 0.105], count: 700, length: 0.04, color: coat, droop: 0.45, keep: (d) => d.z < 0.25 || d.y > 0.75 });
      // Crest on the crown.
      const crest = mix(0.03, 0.13, a.hair) * (young ? 0.6 : 1);
      fur(s, { parent: head, at: [0, 0.07, -0.03], radii: [0.06, 0.07, 0.09], count: Math.round(mix(120, 420, a.hair)), length: crest, color: coat.clone().multiplyScalar(0.75), droop: 0.05, width: 0.25, keep: (d) => d.y > 0.35 });
      for (const sx of [-1, 1]) {
        blob(s, [0.011, 0.03, 0.022], [sx * 0.094, 0.035, -0.02], s.material('#b98a80', { roughness: 0.6 }), [0, sx * 0.6, 0], head, 12);
        // White cheek whiskers sweeping back.
        fur(s, { parent: head, at: [sx * 0.07, -0.03, 0.0], radii: [0.05, 0.07, 0.07], count: Math.round(mix(60, 260, a.hair)), length: mix(0.03, 0.085, a.hair), color: old ? '#cfcfc8' : '#efe9d6', droop: 0.35, keep: (d) => d.x * sx > 0.1 && d.z < 0.6 });
      }
    } else {
      // A mask: a shallow dished shell, hung on a slender stand.
      const shell = s.mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI, 0, Math.PI), s.material('#5a4630', { roughness: 0.8, side: THREE.DoubleSide }));
      shell.scale.set(0.1, 0.13, 0.05);
      shell.position.set(0, 0.03, 0.045);
      head.add(shell);
      const wood = s.material('#3d2f22', { roughness: 0.6 });
      s.cylinder(0.008, 0.008, headY, [0, headY / 2, -0.04], wood, 8);
      s.rod([0, headY - 0.03, -0.04], [0, headY + 0.02, 0.03], 0.008, wood);
      s.cylinder(0.09, 0.1, 0.025, [0, 0.0125, -0.04], wood, 24);
    }

    // Brow and eyes.
    blob(s, [0.082, 0.07, 0.04], [0, 0.03, 0.06], dark, [0, 0, 0], head);
    blob(s, [0.08, 0.02, 0.03], [0, 0.07 + (threat ? 0.012 : 0), 0.085], dark, [0.3, 0, 0], head, 16);
    const pale = s.material('#e6d9c8', { roughness: 0.5 });
    for (const sx of [-1, 1]) {
      const at: [number, number, number] = [sx * 0.03, 0.043, 0.088];
      if (mask) blob(s, [0.017, 0.013, 0.012], at, s.material('#050404'), [0, 0, 0], head, 12);
      else eye(s, { parent: head, at, r: young ? 0.0145 : 0.0125, iris: '#e08a12', gaze, lid: threat ? 0.5 : yawn ? 0.8 : 0.2, lidMat: threat ? pale : dark, pupil: 0.3 });
    }

    // The long muzzle: jaw, red nose stripe, blue ridged cheek swellings.
    const mL = young ? 0.13 : 0.2, mW = young ? 0.085 : 0.1;
    const gape = { closed: 0, grin: 0.07, yawn: 1.15, threat: 0.2 }[a.expression];
    const j = jaw(s, {
      parent: head, hinge: [0, -0.03, 0.035], length: mL, width: mW, slope: 0.5,
      upperHeight: 0.04, lowerHeight: 0.03, gape, lift: 0.3,
      upper: dark, lower: dark, gum, tooth, lip: s.material(red.clone().lerp(new THREE.Color('#2a1c1a'), 0.4), { roughness: 0.5 }), lipRadius: 0.004,
      canine: young ? 0.008 : 0.058, lowerCanine: young ? 0.006 : 0.022, incisor: 0.011, molars: 4,
      teeth: mask && !yawn && a.expression !== 'grin' ? 'none' : old ? (mood.wear > 0.6 ? 'stumps' : 'broken') : 'whole',
      bared: a.expression === 'grin', tongue: s.material('#de7480', { roughness: 0.45 }), ridges: 6,
    });
    // Stripe from between the eyes to the nose tip.
    j.upper.add(s.tube([[0, 0.05, -0.02], [0, 0.047, mL * 0.3], [0, 0.04, mL * 0.65], [0, 0.022, mL * 0.93]], young ? 0.011 : 0.014, redMat));
    blob(s, [0.03, 0.02, 0.02], [0, 0.012, mL * 0.95], redMat, [0.3, 0, 0], j.upper, 14);
    for (const sx of [-1, 1]) {
      blob(s, [0.008, 0.006, 0.006], [sx * 0.012, 0.012, mL * 0.95 + 0.017], s.material('#120808'), [0, sx * 0.4, 0], j.upper, 8);
      const swell = blob(s, [mW * 0.3, 0.03, mL * 0.4], [sx * mW * 0.33, 0.024, mL * 0.47], blueMat, [0, sx * 0.07, sx * -0.35], j.upper, 20);
      swell.castShadow = true;
      for (let i = 0; i < 5; i++) {
        const u = (i - 0.6) / 4.2; // from the stripe outward and down
        const ang = mix(0.35, 1.5, u);
        const x = sx * (mW * 0.33 + Math.sin(ang) * mW * 0.3 * 0.9 - mW * 0.1), y = 0.024 + Math.cos(ang) * 0.032;
        j.upper.add(s.tube([[x * 0.92, y, mL * 0.14], [x, y + 0.004, mL * 0.45], [x * 0.9, y - 0.004, mL * 0.8]], 0.0042, ridgeMat));
      }
    }
    // Beard: yellow below the chin, running orange toward the throat.
    const beard = mix(0.025, 0.14, a.hair) * (young ? 0.5 : 1);
    fur(s, {
      parent: j.lower, at: [0, -0.025, mL * 0.4], radii: [mW * 0.55, 0.035, mL * 0.42], count: Math.round(mix(120, 520, a.hair)), length: beard, color: yellow, droop: 0.75, width: 0.26,
      keep: (d) => d.y < -0.05 && d.z < 0.85, colorAt: (d) => (d.z < -0.3 ? yellow.clone().lerp(new THREE.Color('#d9772a'), 0.6) : undefined),
    });

    s.root.scale.setScalar(K);
    let t0 = random() * 10;
    const rest = head.rotation.clone(), restZ = head.position.z, restJaw = j.lower.rotation.x;
    const speed = mix(0.4, 2.2, mood.energy);
    return s.finish({
      update: (dt) => {
        t0 += dt * speed;
        if (mask) return;
        if (threat) { const bob = Math.max(0, Math.sin(t0 * 4)); head.rotation.x = rest.x + bob * 0.18; head.position.z = restZ + bob * 0.02; }
        else head.rotation.y = rest.y + Math.sin(t0 * 0.6) * 0.04;
        if (yawn) j.lower.rotation.x = restJaw * (1 + Math.sin(t0 * 0.8) * 0.05);
      },
    });
  },
});
