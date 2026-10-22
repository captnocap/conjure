import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { arc, ball, cone, cyl, horn, paint } from './parts';

type Species = 'scarlet' | 'bluegold' | 'cockatoo' | 'grey';

/** Feathers as overlapping scallops painted over a colour map. */
function feathers(colour: (u: number, v: number) => string, random: () => number, rows = 18) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const g = canvas.getContext('2d')!;
  for (let x = 0; x < 64; x++) for (let y = 0; y < 32; y++) { g.fillStyle = colour((x + 0.5) / 64, 1 - (y + 0.5) / 32); g.fillRect(x * 8, y * 8, 8, 8); }
  g.lineWidth = 2;
  const step = 256 / rows;
  for (let r = 0; r <= rows; r++) for (let c = 0; c < 40; c++) {
    const x = (c + (r % 2) * 0.5) * 12.8, y = r * step;
    g.strokeStyle = `rgba(0,0,0,${0.16 + random() * 0.14})`;
    g.beginPath(); g.arc(x, y, 7.5, 0.1, Math.PI - 0.1); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.beginPath(); g.arc(x, y - 2, 6, 0.3, Math.PI - 0.3); g.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The bare cheek: white skin crossed by lines of tiny feathers. */
function cheekTexture(lines: string | null) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#f3efe6';
  g.fillRect(0, 0, 128, 128);
  if (lines) {
    g.strokeStyle = lines; g.lineWidth = 2.5; g.setLineDash([3, 3]);
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, 30 + i * 9); g.bezierCurveTo(40, 22 + i * 9, 90, 40 + i * 9, 128, 30 + i * 9); g.stroke(); }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    species: choice('Which parrot is it?', {
      scarlet: 'A scarlet macaw: blazing red head, bare white cheek, bone-pale upper beak over a black lower one.',
      bluegold: 'A blue-and-gold macaw: blue crown, green brow, gold chest, black bib and black beak, cheek striped with black feather lines.',
      cockatoo: 'A white cockatoo with a yellow crest and a dark grey beak.',
      grey: 'An African grey: scalloped ash grey, white mask, black beak, pale straw eye.',
    }),
    feathers: choice('What are the crest and nape feathers doing?', {
      sleek: 'Lying sleek and tight, calm.',
      raised: 'Raised and fluffed out, excited or alarmed.',
      plucked: 'Plucked bare from stress: pink skin on the neck and chest with a few broken pin feathers left.',
    }),
    beak: choice('What is the beak doing?', {
      shut: 'Shut, hook over the lower mandible.',
      nut: 'Cracking a walnut between the mandibles.',
      perch: 'Gripping a finger-thick wooden perch and hanging on.',
      talking: 'Open mid-word, grey tongue raised.',
    }),
    pinning: score('How far are the pupils pinned?', ['Wide, soft and drowsy', 'Ordinary', 'Tightening', 'Pinned to dots, about to bite or shout']),
    condition: choice('What state is the beak in?', {
      trim: 'Neat and polished.',
      overgrown: 'Overgrown: the hook curls long past the chin, waiting for a trim.',
      chipped: 'Chipped and flaking at the tip and edge.',
    }),
    setting: choice('How is it presented?', {
      bust: 'Just the head, neck and shoulders.',
      towel: 'Wrapped firmly in a towel for an exam, only the head out.',
      moult: 'Shoulders bare of wrapping, with dropped feathers lying round it.',
    }),
    tilt: choice('How does it hold its head?', {
      level: 'Level, side-eyeing you.',
      cocked: 'Cocked right over to study you with one eye.',
      bowed: 'Bowed forward, asking for a scratch.',
      high: 'Stretched up tall and narrow.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const species = a.species as Species;
    const macaw = species === 'scarlet' || species === 'bluegold';
    const plucked = a.feathers === 'plucked', raised = a.feathers === 'raised';

    const body = { scarlet: '#d6282a', bluegold: '#1f6fc4', cockatoo: '#f4f1e8', grey: '#8c9096' }[species];
    const headColour = (u: number, v: number) => {
      if (species === 'bluegold') {
        const front = Math.abs(u - 0.25) < 0.14;
        if (front && v < 0.4) return '#191a1c';
        if (front && v > 0.66) return '#3f9a52';
        if (v < 0.3 && Math.abs(u - 0.25) < 0.25) return '#f0b62a';
        return '#1f6fc4';
      }
      if (species === 'grey') return Math.abs(u - 0.25) < 0.17 && v > 0.3 && v < 0.72 ? '#e9e7e2' : v > 0.6 ? '#9a9ea4' : '#84888e';
      return body;
    };
    const neckColour = (u: number, v: number) => {
      if (isBare(u, v)) return bare[(Math.floor(u * 64) * 7 + Math.floor(v * 32) * 13) % 96] < 0.85 ? '#e2a99d' : '#c98a80';
      const front = u < 0.22 || u > 0.78;
      if (species === 'bluegold') return front ? '#f0b62a' : '#1f6fc4';
      if (species === 'scarlet') return v < 0.25 ? (front ? '#d6282a' : '#2a62b8') : v < 0.42 && !front ? '#f1c42d' : '#d6282a';
      if (species === 'grey') return v < 0.5 ? '#7a7e84' : '#8c9096';
      return body;
    };
    const rough = 0.85;
    const HS = 1.45;
    const bare = Array.from({ length: 96 }, () => random());
    const isBare = (u: number, v: number) => plucked && v > 0.1 + bare[Math.floor(u * 63) % 96] * 0.08 && v < 0.82 + bare[(Math.floor(u * 63) + 7) % 96] * 0.1 && Math.min(u, 1 - u) < 0.2 + bare[Math.floor(v * 31) + 40] * 0.09;
    const headMat = new THREE.MeshStandardMaterial({ map: feathers(headColour, random, 20), roughness: rough });
    const neckMat = new THREE.MeshStandardMaterial({ map: feathers(neckColour, random, 14), roughness: rough });
    const plain = paint(body, { roughness: rough });
    const skin = paint('#e6aea2', { roughness: 0.6 });
    const upperHex = species === 'scarlet' ? '#e9dcc0' : species === 'cockatoo' ? '#3a3b3f' : '#1c1c1e';
    const upper = paint(upperHex, { roughness: 0.3 });
    const lower = paint(species === 'cockatoo' ? '#3a3b3f' : '#1a1a1c', { roughness: 0.35 });
    const tongueMat = paint('#77706c', { roughness: 0.8 });
    const black = paint('#050505', { roughness: 0.15 });
    const pupils: THREE.Mesh[] = [];

    // Neck and shoulders, or a towel burrito.
    const neckProfile: [number, number][] = [[0.0, 0], [0.085, 0], [0.09, 0.03], [0.075, 0.075], [0.052, 0.12], [0.044, 0.17], [0.04, 0.2]];
    const neck = s.lathe(neckProfile, neckMat);
    neck.scale.z = 0.92;
    if (a.setting === 'towel') {
      const towel = s.material(new THREE.Color().setHSL(mix(0.52, 0.09, mood.warmth), 0.3, 0.8), { roughness: 1 });
      const wrap = s.lathe([[0, 0], [0.1, 0], [0.108, 0.04], [0.095, 0.1], [0.07, 0.135], [0.062, 0.14], [0.05, 0.132]], towel);
      wrap.scale.z = 0.95;
      // The overlapping fold and a tucked corner.
      horn(s.root, towel, [[-0.07, 0.125, 0.04], [0, 0.085, 0.1], [0.085, 0.03, 0.07], [0.105, 0.012, 0.0]], (t) => 0.02 - t * 0.008, 1, 16, 8);
      ball(s.root, towel, [0.09, 0.012, -0.03], [0.05, 0.012, 0.04], [0, 0.5, 0]);
      for (let i = 0; i < 3; i++) arc(s.root, paint('#8fb0c0'), 0.1 - i * 0.004, 0.0025, Math.PI * 2, [0, 0.02 + i * 0.012, 0], [Math.PI / 2, 0, 0]).scale.y = 0.95;
    }
    if (plucked) {
      const n = 14 + Math.floor(random() * 6);
      for (let i = 0; i < n; i++) {
        const ang = (random() - 0.5) * 2.6, y = 0.045 + random() * 0.13;
        const r = (y < 0.075 ? 0.088 : mix(0.075, 0.042, (y - 0.075) / 0.1)) * 0.97;
        void skin;
        cone(s.root, paint('#f2f0ea'), 0.003, 0.024, [Math.sin(ang) * (r + 0.008), y, Math.cos(ang) * (r + 0.008) * 0.92], [Math.PI / 2 - 0.6, ang, 0], [1, 1, 1], 5);
      }
    }
    if (a.setting === 'moult' || plucked) {
      const n = (a.setting === 'moult' ? 5 : 2) + Math.floor(mood.density * 5);
      const tones = species === 'bluegold' ? ['#1f6fc4', '#f0b62a'] : species === 'scarlet' ? ['#d6282a', '#f1c42d', '#2a62b8'] : [body, '#d9d6cf'];
      for (let i = 0; i < n; i++) {
        const ang = random() * Math.PI * 2, r = 0.12 + random() * 0.08;
        const f = new THREE.Group();
        ball(f, paint(tones[Math.floor(random() * tones.length)], { roughness: 0.8 }), [0, 0, 0], [0.011, 0.002, 0.034], [0, 0, 0], 8);
        cyl(f, paint('#efe9da'), 0.0008, 0.0008, 0.075, [0, 0.002, 0.004], [Math.PI / 2, 0, 0], 5);
        f.position.set(Math.cos(ang) * r, 0.003, Math.sin(ang) * r); f.rotation.y = random() * 6;
        s.root.add(f);
      }
    }

    // Head.
    const head = new THREE.Group();
    s.root.add(head);
    ball(head, headMat, [0, 0, 0], [0.053, 0.055, 0.062], [0, 0, 0], 28);
    for (const x of [-1, 1]) {
      // Cheek patch and the eye set in it.
      if (macaw || species === 'grey') {
        const cheek = new THREE.MeshStandardMaterial({ map: cheekTexture(species === 'bluegold' ? '#111111' : species === 'scarlet' ? '#c96a62' : null), roughness: 0.6 });
        ball(head, cheek, [x * 0.034, -0.006, 0.026], [0.024, 0.032, 0.033], [0, x * 0.25, 0]);
      }
      const c: [number, number, number] = [x * 0.049, 0.008, 0.026];
      const irisHex = species === 'cockatoo' ? '#2a1a12' : species === 'grey' ? '#e8dc9a' : '#f1e6a8';
      ball(head, paint('#d9d2c2', { roughness: 0.5 }), c, [0.0068, 0.0115, 0.0115]);
      ball(head, paint(irisHex, { roughness: 0.15 }), [c[0] + x * 0.0022, c[1], c[2]], [0.0062, 0.0098, 0.0098]);
      const pr = mix(0.0075, 0.0026, a.pinning);
      const pupil = ball(head, black, [c[0] + x * 0.0056, c[1], c[2] + 0.001], [0.004, pr, pr]);
      pupils.push(pupil);
      ball(head, paint('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 }), [c[0] + x * 0.0085, c[1] + 0.003, c[2] + 0.003], [0.0016, 0.0016, 0.0016], [0, 0, 0], 6);
    }

    // Upper beak: a heavy hook sweeping forward, down and back.
    const over = a.condition === 'overgrown';
    const chipped = a.condition === 'chipped';
    const hook: [number, number, number][] = [[0, 0.014, 0.036], [0, 0.022, 0.066], [0, 0.006, 0.094], [0, -0.03, 0.1], [0, -0.056, 0.086]];
    if (over) hook.push([0, -0.078, 0.066], [0, -0.088, 0.044]);
    const big = macaw ? 1 : species === 'cockatoo' ? 0.82 : 0.78;
    const beak = new THREE.Group();
    beak.scale.setScalar(big);
    head.add(beak);
    horn(beak, upper, hook, (t) => (chipped && t > 0.86 ? 0.004 : 1) * 0.032 * Math.pow(1 - t, over ? 0.55 : 0.7) + 0.0006, 0.72, 26, 14);
    if (species === 'scarlet') horn(beak, lower, [[0, -0.014, 0.06], [0, -0.03, 0.082], [0, -0.05, 0.084]], (t) => 0.012 * (1 - t) + 0.001, 1.3, 8, 8);
    ball(beak, paint(species === 'scarlet' ? '#efe7d6' : '#2c2c2f', { roughness: 0.6 }), [0, 0.03, 0.05], [0.02, 0.012, 0.014]);
    for (const x of [-1, 1]) ball(beak, black, [x * 0.01, 0.033, 0.058], [0.0028, 0.0028, 0.0028], [0, 0, 0], 6);
    if (chipped) {
      const flake = paint('#cfc7b6', { roughness: 0.9 });
      for (let i = 0; i < 4; i++) ball(beak, flake, [(random() - 0.5) * 0.03, -0.01 - random() * 0.035, 0.092 + random() * 0.008], [0.006, 0.008, 0.003], [random(), random(), random()], 6);
    }
    // Lower mandible on a hinge.
    const open = { shut: 0.05, nut: 0.42, perch: 0.3, talking: 0.7 }[a.beak];
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.022, 0.03);
    beak.add(jaw);
    horn(jaw, lower, [[0, -0.004, 0], [0, -0.024, 0.024], [0, -0.022, 0.05], [0, -0.004, 0.064]], (t) => 0.024 - t * 0.016, 0.9, 14, 12);
    const tongue = ball(jaw, tongueMat, [0, -0.002, 0.04], [0.008, 0.007, 0.015], [-0.3, 0, 0]);
    tongue.visible = open > 0.2;
    jaw.rotation.x = open;
    if (a.beak === 'nut') {
      const nut = new THREE.Group();
      ball(nut, paint('#a9783f', { roughness: 0.9 }), [0, 0, 0], [0.015, 0.017, 0.015], [0, 0, 0], 12);
      arc(nut, paint('#5c3c1c'), 0.0152, 0.0012, Math.PI * 2, [0, 0, 0], [0, Math.PI / 2, 0]);
      nut.position.set(0, -0.034, 0.078);
      beak.add(nut);
      for (let i = 0; i < 4; i++) ball(s.root, paint('#a9783f', { roughness: 0.9 }), [(random() - 0.5) * 0.12, 0.003, 0.13 + random() * 0.06], [0.008, 0.003, 0.006], [0, random() * 3, 0], 6);
    }

    // Crest and nape.
    const crest: THREE.Object3D[] = [];
    if (species === 'cockatoo') {
      const yellow = paint('#f3d43a', { roughness: 0.8 });
      for (let i = 0; i < 7; i++) {
        const pivot = new THREE.Group();
        const len = 0.07 + i * 0.012;
        ball(pivot, i > 1 ? yellow : plain, [0, len / 2, 0], [0.01, len / 2, 0.004], [0, 0, 0], 10);
        ball(pivot, i > 1 ? yellow : plain, [0, len, 0.006], [0.008, 0.012, 0.004], [0.6, 0, 0], 8);
        pivot.position.set(0, 0.046 - i * 0.002, 0.028 - i * 0.011);
        pivot.rotation.x = plucked ? -1.5 : raised ? -0.15 - i * 0.16 : -1.25 - i * 0.03;
        pivot.rotation.z = (random() - 0.5) * (raised ? 0.25 : 0.05);
        if (plucked && i % 2) continue;
        head.add(pivot);
        crest.push(pivot);
      }
    } else if (raised) {
      for (let i = 0; i < 26; i++) {
        const u = (random() - 0.5) * 2.4, v = random() * 1.5 + 0.1;
        const dir = new THREE.Vector3(Math.sin(u) * Math.cos(v) * 0.6, Math.sin(v) * 0.9 + 0.2, -Math.cos(u) * Math.cos(v)).normalize();
        const p = dir.clone().multiply(new THREE.Vector3(0.05, 0.052, 0.058));
        const quill = cone(head, plain, 0.007, 0.03, [p.x, p.y, p.z], [0, 0, 0], [1, 1, 0.4], 5);
        quill.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.add(new THREE.Vector3(0, 0.3, -0.2)).normalize());
      }
      for (let i = 0; i < 10; i++) {
        const ang = Math.PI * (0.6 + random() * 0.8);
        cone(s.root, plain, 0.008, 0.03, [Math.sin(ang) * 0.046, 0.15 + random() * 0.05, Math.cos(ang) * 0.044], [-0.9, ang + Math.PI, 0], [1, 1, 0.4], 5);
      }
    }

    // Pose.
    const basePitch = a.tilt === 'bowed' ? 0.6 : a.tilt === 'high' ? -0.18 : 0.08;
    const baseRoll = a.tilt === 'cocked' ? (random() < 0.5 ? -1 : 1) * 0.55 : (random() - 0.5) * 0.12;
    const baseYaw = -0.75 + (random() - 0.5) * 0.4;
    head.position.set(0, (a.tilt === 'high' ? 0.25 : a.tilt === 'bowed' ? 0.215 : 0.232) + 0.03, a.tilt === 'bowed' ? 0.02 : 0.006);
    head.scale.setScalar(HS);
    if (a.tilt === 'high') { neck.scale.y = 1.1; }
    head.rotation.set(basePitch, baseYaw, baseRoll);

    if (a.beak === 'perch') {
      // A dowel held in the beak, on two uprights.
      const wood = s.material('#b58a52', { roughness: 0.85 });
      const grip = new THREE.Vector3(0, (-0.034) * big * HS, 0.07 * big * HS).applyEuler(head.rotation).add(head.position);
      const bar = cyl(s.root, wood, 0.012, 0.012, 0.36, [grip.x, grip.y, grip.z], [0, 0, Math.PI / 2], 12);
      for (const x of [-1, 1]) { cyl(s.root, wood, 0.008, 0.01, grip.y, [grip.x + x * 0.17, grip.y / 2, grip.z], [0, 0, 0], 10); cyl(s.root, wood, 0.03, 0.034, 0.008, [grip.x + x * 0.17, 0.004, grip.z], [0, 0, 0], 14); }
      for (let i = 0; i < 5 + mood.wear * 10; i++) ball(s.root, paint('#8a653a'), [bar.position.x + (random() - 0.5) * 0.12, grip.y + 0.006, grip.z + (random() - 0.5) * 0.01], [0.006, 0.004, 0.005], [0, 0, 0], 6);
    }

    const speed = mix(0.5, 5, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        head.rotation.y = baseYaw + Math.sin(time * speed * 0.6) * 0.12 * (0.3 + mood.energy);
        head.rotation.x = basePitch + Math.max(0, Math.sin(time * speed)) * 0.08 * mood.energy;
        const pulse = 1 + Math.sin(time * speed * 2.2) * 0.35 * a.pinning * mood.energy;
        for (const p of pupils) p.scale.set(0.004, mix(0.0075, 0.0026, a.pinning) * pulse, mix(0.0075, 0.0026, a.pinning) * pulse);
        if (a.beak === 'talking') jaw.rotation.x = open * (0.6 + 0.4 * Math.abs(Math.sin(time * speed * 1.7)));
        for (const [i, c] of crest.entries()) c.rotation.z = Math.sin(time * speed + i) * 0.03 * mood.energy;
      },
    });
  },
});
