import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { blob, bust, eye, fur, jaw } from './ape';

export default defineThing({
  questions: {
    gape: score('How wide is the yawn?', ['Lips just parting, the canine tips showing', 'Half open, a lazy warning', 'Wide open, every tooth on show', 'Hinged right back past a right angle, head thrown up']),
    species: choice('Which baboon is it?', {
      olive: 'An olive baboon: grizzled grey-green coat, dark grey face, a modest ruff.',
      hamadryas: 'A hamadryas male: a huge silver-white cape of mane and a bare pink face.',
      gelada: 'A gelada: dark face, golden-brown mane, upper lip flipped right up over the nose to show pink gums, a red hourglass of bare skin on the chest.',
      chacma: 'A chacma: big, dark brown, long drooping muzzle, hardly any mane.',
    }),
    teeth: choice('What state are the teeth in?', {
      whole: 'White and whole, four long sharp canines.',
      broken: 'One upper canine snapped off to a stub, a front tooth missing.',
      stumps: 'Worn brown stumps with gaps: an old animal still making the gesture.',
    }),
    eyes: choice('What are the eyes doing during the yawn?', {
      glare: 'Open and fixed on the target, small and amber under the brow.',
      flash: 'Brows pulled back so the pale, chalk-white eyelids flash like signals.',
      shut: 'Squeezed shut, as if it really were only tired.',
    }),
    mane: score('How much mane and cheek whisker does it carry?', ['Sleek, almost none', 'A short ruff', 'Full cheek tufts and a shoulder cape', 'An enormous cape hiding the shoulders']),
    form: choice('Is it a living head or a bare skull?', {
      living: 'A living head on furred shoulders.',
      skull: 'A clean bare skull on a museum stand, the jaw wired open to show the canines.',
      halfway: 'A weathered carcass head: skull showing through on one side, scraps of dry hide and mane still on.',
    }),
    aim: choice('Who is the yawn aimed at?', {
      viewer: 'Straight at whoever is looking.',
      rival: 'Turned to one side at a rival out of frame.',
      sky: 'Up at the sky, a display for the whole troop.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const skull = a.form === 'skull', half = a.form === 'halfway', living = a.form === 'living';
    const sp = {
      olive: { coat: '#6b6a48', mane: '#7d7b58', face: '#3b3836', muzzle: '#2f2c2b', maneK: 0.7, mL: 0.2 },
      hamadryas: { coat: '#9b9890', mane: '#d7d6d0', face: '#c98b82', muzzle: '#b5766f', maneK: 1.35, mL: 0.19 },
      gelada: { coat: '#6a4a2c', mane: '#b98a45', face: '#33271f', muzzle: '#2a201b', maneK: 1.1, mL: 0.16 },
      chacma: { coat: '#4a3d30', mane: '#55473a', face: '#2a2625', muzzle: '#221f1e', maneK: 0.45, mL: 0.24 },
    }[a.species];
    const coat = new THREE.Color(sp.coat).lerp(new THREE.Color('#77705f'), mood.wear * 0.4);
    const maneCol = new THREE.Color(sp.mane).lerp(new THREE.Color('#8a8474'), mood.wear * 0.4);
    const boneCol = new THREE.Color('#e9dfc4').lerp(new THREE.Color('#a8956c'), mood.wear * 0.6);
    const bone = new THREE.MeshStandardMaterial({ color: boneCol, roughness: 0.6 });
    const boneDark = new THREE.MeshStandardMaterial({ color: boneCol.clone().multiplyScalar(0.55), roughness: 0.8 });
    const under = s.material(coat.clone().multiplyScalar(0.7), { roughness: 0.95 });
    const face = skull ? bone : s.material(sp.face, { roughness: 0.65 });
    const muz = skull ? bone : s.material(sp.muzzle, { roughness: 0.6 });
    const gum = skull ? boneDark : s.material(half ? '#6a3a36' : '#c5606c', { roughness: 0.4 });
    const tooth = s.material(a.teeth === 'whole' ? '#f6f0dc' : '#e2d3a4', { roughness: 0.3 });
    const socket = new THREE.MeshStandardMaterial({ color: '#120d0a', roughness: 0.9 });

    const gape = mix(0.32, 1.5, a.gape);
    const turn = random() < 0.5 ? -1 : 1;
    const mane = a.mane * sp.maneK;
    const sw = 0.22 + mane * 0.06, sh = 0.25, sd = 0.18;
    const head = new THREE.Group();
    let headY = sh + 0.1;

    if (skull) {
      // Museum mount: turned base, brass rod, a cradle under the braincase.
      const wood = s.material('#3b2a1e', { roughness: 0.5 });
      const brass = s.material('#b08a3c', { metalness: 0.7, roughness: 0.35 });
      s.cylinder(0.11, 0.125, 0.03, [0, 0.015, 0], wood, 28);
      s.cylinder(0.095, 0.11, 0.012, [0, 0.036, 0], wood, 28);
      headY = 0.36;
      s.cylinder(0.006, 0.006, headY - 0.08, [0, (headY - 0.08) / 2 + 0.04, -0.03], brass, 8);
      s.ring(0.03, 0.005, [0, headY - 0.045, -0.03], brass).rotation.x = Math.PI / 2;
      const tag = s.label(['PAPIO', 'No. 114', 'THEROPITHECUS', 'M. ADULT'][Math.floor(random() * 4)], 0.09, 0.028, [0, 0.05, 0.1], '#3a2f22', '#efe6cc');
      tag.rotation.x = -0.9;
    } else {
      s.root.add(bust(s, [sw, sh, sd], under));
      fur(s, { at: [0, 0, 0], radii: [sw, sh, sd], count: half ? 380 : 900, length: 0.055 + mane * 0.07, color: mane > 0.6 ? maneCol : coat, droop: mix(0.55, 0.72, mood.wear), width: 0.3, mess: 0.2 + mood.wear * 0.4, keep: (d) => d.y > 0.03 && !(half && random() < 0.3), colorAt: (d) => (d.y < 0.35 && mane < 1 ? coat : undefined) });
      if (a.species === 'gelada' && !half) {
        // The bleeding-heart patch: an hourglass of bare red skin.
        const red = s.material('#d2343c', { roughness: 0.5, emissive: '#7a1218', emissiveIntensity: mix(0.1, 0.4, mood.cheer) });
        blob(s, [0.05, 0.036, 0.02], [0, sh * 0.5, sd * 0.86], red, [-0.5, 0, 0]);
        blob(s, [0.036, 0.03, 0.02], [0, sh * 0.5 - 0.055, sd * 0.94], red, [-0.3, 0, 0]);
      }
    }
    head.position.set(0, headY, skull ? 0 : 0.07);
    s.root.add(head);
    const yaw = a.aim === 'rival' ? 0.7 * turn : 0;
    const pitch = -0.2 - gape * 0.22 - (a.aim === 'sky' ? 0.4 : 0);
    head.rotation.set(pitch, yaw, (random() - 0.5) * 0.14);
    head.scale.setScalar(1.15);

    // Braincase: low and rounded, sloping back from a shelf of brow.
    blob(s, [0.088, 0.082, 0.105], [0, 0.03, -0.035], skull ? bone : under, [0, 0, 0], head);
    const bareSide = half ? turn : 0;
    if (!skull) {
      fur(s, { parent: head, at: [0, 0.03, -0.035], radii: [0.088, 0.082, 0.105], count: half ? 260 : 650, length: 0.035 + mane * 0.02, color: coat, droop: 0.5, mess: 0.25 + mood.wear * 0.4, keep: (d) => (d.z < 0.3 || d.y > 0.7) && !(half && d.x * bareSide > -0.1) });
      for (const sx of [-1, 1]) {
        if (half && sx === bareSide) continue;
        // Cheek whiskers sweeping back and out; the mane starts here.
        fur(s, { parent: head, at: [sx * 0.07, -0.02, -0.02], radii: [0.055, 0.08, 0.08], count: Math.round(mix(40, 420, Math.min(1, mane))), length: mix(0.03, 0.15, Math.min(1, mane / 1.2)), color: maneCol, droop: 0.3, width: 0.22, mess: 0.3, keep: (d) => d.x * sx > 0.05 && d.z < 0.5 });
        blob(s, [0.01, 0.024, 0.018], [sx * 0.09, 0.03, -0.03], face, [0, sx * 0.6, 0], head, 10);
      }
      if (half) {
        // Bone showing through where the hide has gone.
        blob(s, [0.07, 0.076, 0.1], [bareSide * 0.024, 0.032, -0.035], bone, [0, 0, 0], head);
        blob(s, [0.02, 0.018, 0.01], [bareSide * 0.03, 0.035, 0.07], socket, [0, 0, 0], head, 12);
      }
    }
    // Face plate and the heavy overhanging brow.
    blob(s, [0.074, 0.062, 0.04], [0, 0.022, 0.045], face, [0, 0, 0], head);
    const browLift = a.eyes === 'flash' ? 0.014 : 0;
    blob(s, [0.082, 0.02, 0.032], [0, 0.064 + browLift, 0.068], face, [0.35, 0, 0], head, 16);
    const lidMat = a.eyes === 'flash' ? s.material('#efe6d6', { roughness: 0.5 }) : face;
    for (const sx of [-1, 1]) {
      const at: [number, number, number] = [sx * 0.029, 0.036, 0.074];
      if (skull || (half && sx === bareSide)) {
        blob(s, [0.02, 0.018, 0.014], at, socket, [0, 0, 0], head, 14);
        const rim = s.mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 18), bone, at);
        rim.position.z += 0.006;
        head.add(rim);
      } else {
        if (a.eyes === 'flash') blob(s, [0.024, 0.02, 0.012], [at[0], at[1] + 0.008, at[2] + 0.004], lidMat, [0.2, 0, 0], head, 12);
        eye(s, { parent: head, at, r: 0.014, iris: '#c9801a', gaze: [a.aim === 'rival' ? -0.3 * turn : 0, a.aim === 'sky' ? 0.2 : -0.2], lid: a.eyes === 'shut' ? 1 : a.eyes === 'flash' ? 0.55 : 0.18, lidMat, pupil: 0.3 });
      }
    }
    if (skull) {
      // Cheekbone arches and a nasal opening.
      for (const sx of [-1, 1]) head.add(s.tube([[sx * 0.05, 0.012, 0.07], [sx * 0.085, 0.004, 0.02], [sx * 0.08, 0.012, -0.05]], 0.007, bone));
    }

    // The long muzzle on its hinge.
    const mL = sp.mL, mW = 0.1;
    const j = jaw(s, {
      parent: head, hinge: [0, -0.028, 0.03], length: mL, width: mW, slope: 0.42,
      upperHeight: 0.044, lowerHeight: 0.03, gape, lift: 0.38,
      upper: muz, lower: muz, gum, tooth, lip: skull ? undefined : s.material(half ? '#3a2a26' : '#1c1716', { roughness: 0.5 }), lipRadius: 0.004,
      canine: 0.068, lowerCanine: 0.028, incisor: 0.012, molars: 4, teeth: a.teeth,
      tongue: living ? s.material('#e07886', { roughness: 0.4 }) : null, ridges: skull ? 0 : 7,
    });
    // Ridges of bone running down each side of the nose, nostrils at the very tip.
    for (const sx of [-1, 1]) {
      j.upper.add(s.tube([[sx * 0.02, 0.05, 0.0], [sx * 0.028, 0.042, mL * 0.45], [sx * 0.022, 0.026, mL * 0.86]], 0.008, muz));
      if (skull) continue;
      blob(s, [0.007, 0.006, 0.006], [sx * 0.011, 0.016, mL * 0.985], socket, [0, sx * 0.4, 0], j.upper, 8);
    }
    if (skull) blob(s, [0.016, 0.014, 0.03], [0, 0.03, mL * 0.72], socket, [0.35, 0, 0], j.upper, 12);
    else blob(s, [0.028, 0.02, 0.022], [0, 0.014, mL * 0.94], muz, [0.3, 0, 0], j.upper, 14);
    if (a.species === 'gelada' && !skull) {
      // The lip flip: upper lip everted over the nose, a wet pink shield above the teeth.
      const flip = blob(s, [mW * 0.5, 0.036, 0.014], [0, 0.03, mL * 0.97], s.material('#e58b96', { roughness: 0.3 }), [-0.45, 0, 0], j.upper, 16);
      flip.castShadow = true;
      blob(s, [mW * 0.42, 0.012, 0.012], [0, 0.004, mL * 1.0], s.material('#c5606c', { roughness: 0.3 }), [0, 0, 0], j.upper, 12);
    }
    // Chin tuft.
    if (!skull) fur(s, { parent: j.lower, at: [0, -0.016, mL * 0.4], radii: [mW * 0.5, 0.03, mL * 0.4], count: half ? 40 : 160, length: 0.03 + mane * 0.03, color: maneCol, droop: 0.7, width: 0.25, keep: (d) => d.y < -0.2 && d.z < 0.7 });
    if (half) {
      // Scraps of hide curling off the bare side.
      for (let i = 0; i < 5; i++) blob(s, [0.02 + random() * 0.02, 0.004, 0.012 + random() * 0.02], [bareSide * (0.06 + random() * 0.03), -0.03 + random() * 0.1, -0.08 + random() * 0.12], s.material('#5a4636', { roughness: 0.95 }), [random() * 2, random() * 2, random() * 2], head, 8);
    }

    let t0 = random() * 10;
    const rest = head.rotation.clone(), restJaw = j.lower.rotation.x, restUp = j.upper.rotation.x;
    const speed = living ? mix(0.3, 1.8, mood.energy) : 0;
    return s.finish({
      update: (dt) => {
        if (!speed) return;
        t0 += dt * speed;
        const breathe = Math.sin(t0 * 0.9) * 0.06;
        j.lower.rotation.x = restJaw * (1 + breathe);
        j.upper.rotation.x = restUp * (1 + breathe);
        head.rotation.x = rest.x - breathe * 0.1;
      },
    });
  },
});
