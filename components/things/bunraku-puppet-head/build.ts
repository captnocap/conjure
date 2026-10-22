import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

export default defineThing({
  questions: {
    character: choice('Which stock character is the head?', {
      heroine: 'Musume: a young heroine, smooth white oval face, tiny red mouth.',
      warrior: 'Bunshichi: a warrior, heavy jaw, thick black brows, red kumadori lines, a topknot.',
      elder: 'An old man: bald pate, drooping white brows, wispy white beard and side hair.',
      gabu: 'Gabu: a beauty built to transform, with horns and a splitting jaw hidden inside.',
      villain: 'A flushed red-faced villain with a scowl and a bristling black beard.',
    }),
    expression: choice('What are the toggles doing to the face right now?', {
      serene: 'Nothing: at rest, level brows, eyes ahead, mouth closed.',
      rage: 'Brows slammed down and eyes crossed inward in a mie of rage.',
      fangs: 'Mouth split from ear to ear to show gold fangs, eyes flipped to glaring gold, horns out if it has them.',
      asleep: 'Eyes rolled shut, lids down, the face of the sleeping or the dead.',
      surprise: 'Brows shot up, eyes wide, jaw dropped open.',
    }),
    hair: choice('How is the hair?', {
      dressed: 'Formally dressed and oiled, with every comb and pin in place.',
      loose: 'Undone and hanging in long loose strands, as for madness, grief or a ghost.',
      bare: 'Wig off: the bare wooden pate with its nail holes.',
    }),
    mount: choice('Where is the head resting?', {
      stand: 'Upright on a turned wooden stand, on display.',
      box: 'Lying face up in a paulownia box lined with silk, lid set beside it.',
      rack: 'Pegged upright in a backstage rack between blank unpainted spare heads.',
    }),
    mechanism: choice('How much of the mechanism shows?', {
      dressed: 'None: the grip is hidden under a shoulder board and kimono collar.',
      grip: 'The bare neck grip with its three toggles and strings running up into the neck.',
      open: 'Everything: the side of the skull is opened to show the eye axle, baleen spring and strings inside.',
    }),
    collar: choice('If it wears a collar, what colour is the kimono?', {
      scarlet: 'Scarlet with a white under-collar.',
      indigo: 'Deep indigo.',
      black: 'Black with gold edging.',
      white: 'White on white, for death.',
      purple: 'Wisteria purple.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const skinTone = { heroine: '#f6f1e8', warrior: '#eecdb0', elder: '#e8d2b4', gabu: '#f7f3ec', villain: '#c9584a' }[a.character];
    const skin = new THREE.MeshStandardMaterial({ color: new THREE.Color(skinTone).lerp(new THREE.Color('#b9a98c'), wear * 0.3), roughness: 0.38 + wear * 0.4, side: THREE.DoubleSide });
    const wood = s.material('#c9a878', { roughness: 0.7 });
    const darkWood = s.material('#6b4a2f', { roughness: 0.75, side: THREE.DoubleSide });
    const black = s.material('#141216', { roughness: 0.3 });
    const white = s.material('#f4f1ea', { roughness: 0.5 });
    const red = s.material('#b3202a', { roughness: 0.45 });
    const gold = s.material('#e0b43a', { metalness: 0.8, roughness: 0.25, emissive: '#6b4a05', emissiveIntensity: 0.4 });
    const stringMat = s.material('#d8cdb0', { roughness: 0.9 });
    const hairMat = a.character === 'elder' ? s.material('#e9e6dd', { roughness: 0.7, side: THREE.DoubleSide }) : new THREE.MeshStandardMaterial({ color: '#17151a', roughness: 0.32, side: THREE.DoubleSide });

    const unit = new THREE.Group();   // head + grip, origin at the bottom of the grip
    s.root.add(unit);
    const head = new THREE.Group();
    const gripLen = 0.15;
    head.position.y = gripLen;
    unit.add(head);
    const H = <T extends THREE.Object3D>(o: T) => { head.add(o); return o; };
    const U = <T extends THREE.Object3D>(o: T) => { unit.add(o); return o; };

    const open = a.mechanism === 'open';
    const fangs = a.expression === 'fangs', rage = a.expression === 'rage', asleep = a.expression === 'asleep', surprise = a.expression === 'surprise';
    const heavy = a.character === 'warrior' || a.character === 'villain';
    const fx = heavy ? 0.058 : 0.051, fy = 0.07, fz = 0.056, cy = 0.095;
    const cut = (r: number) => new THREE.SphereGeometry(r, 36, 24, open ? Math.PI * 1.2 : 0, open ? Math.PI * 1.52 : Math.PI * 2);

    // Neck and face.
    H(s.cylinder(0.02, 0.024, 0.05, [0, 0.015, -0.004], skin, 16));
    const face = H(s.mesh(cut(1), skin, [0, cy, 0]));
    face.scale.set(fx, fy, fz);
    const jawDrop = surprise ? 0.014 : fangs ? 0.02 : 0;
    const chin = H(s.ball([fx * (heavy ? 0.78 : 0.6), 0.03, fz * 0.72], [0, cy - fy * 0.72 - jawDrop, fz * 0.22], skin, 18));
    chin.rotation.x = jawDrop * 8;
    if (open) {
      const inner = H(s.mesh(cut(1), darkWood, [0, cy, 0]));
      inner.scale.set(fx * 0.94, fy * 0.94, fz * 0.94);
      // Eye axle, baleen spring and strings.
      H(s.rod([-0.03, cy + 0.012, 0.02], [0.05, cy + 0.012, 0.02], 0.0035, wood));
      H(s.ball([0.012, 0.012, 0.012], [0.03, cy + 0.012, 0.028], white, 10));
      H(s.tube([[0.03, cy + 0.045, -0.02], [0.036, cy + 0.03, 0.0], [0.034, cy + 0.0, 0.01], [0.03, cy - 0.03, 0.0]], 0.003, s.material('#d9c58a')));
      for (const [x, z] of [[0.03, 0.02], [0.034, 0.0], [0.024, -0.012]] as const) H(s.rod([x, cy + 0.012, z], [0.008, -0.01, -0.012], 0.0016, stringMat));
      H(s.box([0.006, 0.05, 0.03], [0.018, cy - 0.01, 0.0], wood));
    }
    // Nose.
    const nose = H(s.cylinder(0.001, heavy ? 0.013 : 0.009, 0.034, [0, cy - 0.004, fz + 0.002], skin, 10));
    nose.rotation.x = 0.42; nose.scale.z = 1.3;
    // Eyes.
    const eyeY = cy + 0.014, eyeX = fx * 0.42;
    for (const side of [-1, 1]) {
      if (open && side === 1 && false) continue;
      const ez = fz * 0.9;
      const wide = fangs || surprise ? 1.5 : rage ? 1.25 : 1;
      if (asleep) { const lid = H(s.ring(0.011, 0.0018, [side * eyeX, eyeY + 0.004, ez + 0.002], black, Math.PI)); lid.rotation.z = Math.PI; lid.rotation.y = side * 0.4; }
      else {
        const eye = H(s.ball([0.0125, 0.0052 * wide, 0.004], [side * eyeX, eyeY, ez], fangs ? gold : white, 12));
        eye.rotation.y = side * 0.42; eye.rotation.z = -side * (heavy || rage ? -0.22 : 0.1);
        const px = side * eyeX - (rage ? side * 0.0065 : 0);
        H(s.ball([0.0048, 0.0048 * Math.min(wide, 1.2), 0.003], [px, eyeY, ez + 0.0035 - (rage ? 0.001 : 0)], black, 8));
        const liner = H(s.ring(0.0125, 0.0013, [side * eyeX, eyeY - 0.0035 + 0.004 * wide, ez + 0.001], black, Math.PI)); liner.rotation.y = side * 0.42; liner.scale.y = 0.45 * wide;
      }
      // Brows.
      const browMat = a.character === 'elder' ? white : black;
      const thick = heavy ? 0.0052 : a.character === 'elder' ? 0.0045 : 0.0022;
      const lift = surprise ? 0.012 : rage || fangs ? -0.003 : 0;
      const slant = rage || fangs ? -0.55 : a.character === 'elder' ? 0.4 : heavy ? -0.28 : 0.12;
      const by = eyeY + 0.021 + lift;
      const brow = H(s.tube([[side * (eyeX - 0.014), by - slant * 0.012, fz * 0.94], [side * eyeX, by + 0.003, fz * 0.9], [side * (eyeX + 0.016), by + slant * 0.012, fz * 0.74]], thick, browMat));
      brow.castShadow = false;
      if (a.character === 'warrior' || (a.character === 'gabu' && fangs)) H(s.tube([[side * (eyeX + 0.004), eyeY - 0.012, fz * 0.86], [side * (eyeX + 0.016), eyeY - 0.004, fz * 0.74], [side * (eyeX + 0.022), eyeY + 0.016, fz * 0.6]], 0.0022, red));
      if (a.character === 'heroine' || a.character === 'gabu') H(s.ball([0.012, 0.009, 0.003], [side * fx * 0.6, cy - 0.018, fz * 0.68], s.material('#f0b9b4', { roughness: 0.6 }), 8)).rotation.y = side * 0.8;
    }
    // Mouth.
    const my = cy - 0.036;
    if (fangs) {
      const gash = H(s.tube([[-fx * 0.86, my + 0.016, fz * 0.42], [-fx * 0.5, my - 0.002, fz * 0.78], [0, my - 0.008, fz * 0.9], [fx * 0.5, my - 0.002, fz * 0.78], [fx * 0.86, my + 0.016, fz * 0.42]], 0.0075, s.material('#5e0d14', { roughness: 0.5 })));
      gash.scale.y = 1.5; gash.position.y = -my * 0.5 - 0.004;
      for (let i = -3; i <= 3; i++) {
        const t = i / 3, x = t * fx * 0.6, z = fz * (0.94 - Math.abs(t) * 0.2);
        const big = Math.abs(i) === 2;
        H(s.cylinder(0.0028, 0.0004, big ? 0.017 : 0.008, [x, my - 0.0 + Math.abs(t) * 0.004 - (big ? 0.004 : 0), z], gold, 6));
        if (i % 2) H(s.cylinder(0.0004, 0.0028, 0.009, [x, my - 0.022 + Math.abs(t) * 0.004, z - 0.002], gold, 6));
      }
    } else if (surprise) H(s.ball([0.011, 0.012, 0.004], [0, my - 0.004, fz * 0.9], s.material('#3a0a10'), 10));
    else {
      const w = heavy ? 0.016 : 0.0085;
      H(s.ball([w, 0.0032, 0.004], [0, my + 0.002, fz * 0.88], red, 10));
      H(s.ball([w * 0.8, 0.004, 0.004], [0, my - 0.003, fz * 0.87], red, 10));
      if (heavy || rage) { for (const side of [-1, 1]) H(s.rod([side * w, my, fz * 0.86], [side * (w + 0.008), my - 0.008, fz * 0.78], 0.0015, black)); }
    }
    if (a.character === 'elder') {
      for (let i = 0; i < 3; i++) H(s.tube([[-0.024, cy + 0.044 + i * 0.007, fz * 0.74], [0, cy + 0.047 + i * 0.007, fz * (0.83 - i * 0.05)], [0.024, cy + 0.044 + i * 0.007, fz * 0.74]], 0.001, s.material('#a08a6a')));
      H(s.cylinder(0.014, 0.001, 0.085, [0, cy - 0.098 - jawDrop, fz * 0.38], white, 8)).rotation.x = -0.15;
    }
    if (a.character === 'villain') { const beard = H(s.ball([fx * 0.86, 0.036, fz * 0.7], [0, cy - 0.066 - jawDrop, fz * 0.1], black, 14)); beard.rotation.x = 0.2; }
    // Ears.
    for (const side of [-1, 1]) if (!(open && side === 1)) H(s.ball([0.006, 0.014, 0.01], [side * fx * 0.98, cy + 0.002, -0.004], skin, 8));

    // Hair.
    const hairCut = (r: number) => new THREE.SphereGeometry(r, 28, 18, open ? Math.PI * 1.2 : 0, open ? Math.PI * 1.52 : Math.PI * 2);
    const horns = a.character === 'gabu' && fangs;
    if (a.hair === 'bare') {
      for (let i = 0; i < 9; i++) { const t = (i / 8 - 0.5) * 2.2; H(s.ball([0.002, 0.002, 0.002], [Math.sin(t) * fx * 0.86, cy + Math.cos(t) * fy * 0.8 + 0.006, fz * 0.42], darkWood, 6)); }
    } else {
      const bald = a.character === 'elder', shaved = a.character === 'warrior';
      const cap = H(s.mesh(hairCut(1), hairMat, [0, cy + (bald ? -0.004 : 0.016), bald ? -0.03 : shaved ? -0.024 : -0.012]));
      cap.scale.set(fx * 1.07, fy * (bald ? 0.8 : 0.98), fz * (bald ? 0.85 : 1.06));
      if (a.hair === 'dressed') {
        if (a.character === 'heroine' || a.character === 'gabu') {
          for (const side of [-1, 1]) if (!(open && side === 1)) H(s.ball([0.03, 0.04, 0.036], [side * fx * 1.05, cy + 0.02, -0.012], hairMat, 14));
          H(s.ball([0.036, 0.03, 0.045], [0, cy - 0.01, -fz * 1.1], hairMat, 14));
          const bun = H(s.ring(0.03, 0.02, [0, cy + fy + 0.03, -0.014], hairMat)); bun.rotation.y = Math.PI / 2; bun.scale.set(1.25, 1, 1);
          H(s.cylinder(0.014, 0.014, 0.05, [0, cy + fy + 0.012, -0.014], red, 10)).rotation.z = Math.PI / 2;
          H(s.box([0.058, 0.02, 0.005], [0, cy + fy + 0.004, 0.026], gold)).rotation.x = -0.5;
          for (const side of [-1, 1]) {
            H(s.rod([side * 0.016, cy + fy + 0.028, -0.01], [side * 0.085, cy + fy + 0.04, 0.006], 0.0022, gold));
            H(s.ball([0.008, 0.008, 0.008], [side * 0.088, cy + fy + 0.04, 0.007], red, 8));
            for (let k = 0; k < 3; k++) H(s.box([0.005, 0.012, 0.001], [side * 0.078 + (k - 1) * 0.008, cy + fy + 0.027 - k * 0.002, 0.008], gold));
          }
        } else if (a.character === 'warrior' || a.character === 'villain') {
          for (const side of [-1, 1]) if (!(open && side === 1)) H(s.ball([0.02, 0.034, 0.034], [side * fx * 1.02, cy + 0.016, -0.016], hairMat, 12));
          H(s.tube([[0, cy + 0.03, -fz * 1.05], [0, cy + fy + 0.022, -0.045], [0, cy + fy + 0.03, -0.01], [0, cy + fy + 0.012, 0.026]], 0.011, hairMat));
          H(s.ring(0.012, 0.004, [0, cy + fy + 0.024, -0.04], white)).rotation.x = 0.6;
        } else for (const side of [-1, 1]) if (!(open && side === 1)) H(s.ball([0.014, 0.026, 0.03], [side * fx * 1.0, cy + 0.0, -0.02], hairMat, 10));
      } else {
        // Loose strands down the back and over the shoulders.
        const n = a.character === 'elder' ? 9 : 16;
        for (let i = 0; i < n; i++) {
          const t = (i / (n - 1) - 0.5) * Math.PI * 1.5;
          if (open && t > 0.5 && t < 1.9) continue;
          const x = Math.sin(t) * fx * 1.02, z = -Math.cos(t) * fz * 1.02 - 0.004;
          const len = (a.character === 'elder' ? 0.09 : 0.2) * mix(0.7, 1.1, random());
          H(s.tube([[x * 0.6, cy + fy * 0.7, z * 0.6], [x, cy + 0.01, z], [x * 1.12 + (random() - 0.5) * 0.02, cy - len * 0.5, z * 1.1 + (random() - 0.5) * 0.02], [x * 1.05 + (random() - 0.5) * 0.04, cy - len, z + (random() - 0.5) * 0.04]], 0.0055, hairMat));
        }
        if (a.character !== 'elder') for (const side of [-1, 1]) H(s.tube([[side * 0.012, cy + fy * 0.96, fz * 0.3], [side * fx * 0.9, cy + 0.03, fz * 0.62], [side * fx * 1.02, cy - 0.04, fz * 0.55], [side * fx * 0.85, cy - 0.1 - random() * 0.04, fz * 0.6]], 0.0045, hairMat));
      }
    }
    if (horns) for (const side of [-1, 1]) H(s.tube([[side * 0.022, cy + fy * 0.8, fz * 0.45], [side * 0.034, cy + fy + 0.02, fz * 0.6], [side * 0.04, cy + fy + 0.05, fz * 0.55]], 0.006, gold)).scale.set(1, 1, 1);

    // Wear: chips in the gofun.
    if (wear > 0.45) for (let i = 0; i < Math.round((wear - 0.4) * 9); i++) {
      const t = (random() < 0.5 ? -1 : 1) * (0.55 + random() * 0.5), v = (random() - 0.5) * 1.5;
      const p = new THREE.Vector3(Math.sin(t) * Math.cos(v) * fx, cy + Math.sin(v) * fy, Math.cos(t) * Math.cos(v) * fz).multiplyScalar(1.004);
      p.y = cy + (p.y - cy) * 1.0;
      const chip = H(s.ball([0.002 + random() * 0.004, 0.002 + random() * 0.004, 0.001], [p.x, p.y, p.z], darkWood, 6));
      chip.lookAt(new THREE.Vector3(p.x * 3, cy + (p.y - cy) * 3 + gripLen, p.z * 3));
    }

    // Neck grip (dogushi) with toggles.
    U(s.box([0.022, gripLen + 0.02, 0.028], [0, gripLen / 2, -0.004], wood));
    if (a.mechanism !== 'dressed') {
      for (let k = 0; k < 3; k++) {
        const y = 0.04 + k * 0.032;
        const out = k === 1 && (rage || fangs) ? 0.2 : k === 0 && (fangs || surprise) ? 0.25 : 0;
        U(s.box([0.012, 0.007, 0.034], [0.014 * (k % 2 ? -1 : 1), y - out * 0.03, 0.02], s.material(['#b3202a', '#2d2a2a', '#d9c08a'][k]))).rotation.x = 0.3 + out * 2;
        U(s.rod([0.014 * (k % 2 ? -1 : 1), y, 0.012], [0.006 * (k % 2 ? -1 : 1), gripLen + 0.02, -0.02], 0.0013, stringMat));
      }
      U(s.box([0.03, 0.012, 0.036], [0, 0.006, -0.004], wood));
    } else {
      const kimono = s.material({ scarlet: '#b8242c', indigo: '#243a6b', black: '#1b1a1e', white: '#eeebe2', purple: '#7b5aa6' }[a.collar], { roughness: 0.75 });
      const board = U(s.cylinder(0.11, 0.12, 0.045, [0, gripLen - 0.045, -0.004], kimono, 24)); board.scale.z = 0.5;
      const bundle = U(s.lathe([[0.03, 0], [0.05, 0.03], [0.1, 0.09], [0.11, 0.11]], kimono, [0, 0, -0.004])); bundle.scale.z = 0.5;
      for (const [mat, lift, r] of [[white, 0.0, 0.0075], [a.collar === 'black' ? gold : a.collar === 'white' ? white : kimono, -0.012, 0.0095]] as const)
        for (const side of [-1, 1]) U(s.tube([[0, gripLen + 0.02 + lift, -0.036], [side * 0.03, gripLen + 0.012 + lift, -0.016], [side * 0.036 - side * lift, gripLen - 0.016 + lift, 0.03 - lift * 0.4], [-side * 0.012, gripLen - 0.07 + lift, 0.058 - lift * 0.4]], r, mat));
    }

    // Mount.
    if (a.mount === 'stand') {
      s.lathe([[0.001, 0], [0.085, 0], [0.085, 0.012], [0.03, 0.022], [0.016, 0.04], [0.02, 0.085], [0.026, 0.09], [0.026, 0.11], [0.001, 0.11]], darkWood);
      unit.position.y = 0.1;
      unit.rotation.y = (random() - 0.5) * 0.5;
    } else if (a.mount === 'rack') {
      const n = 3, gap = 0.15;
      s.box([gap * n + 0.06, 0.03, 0.09], [0, 0.2, 0], darkWood);
      for (const x of [-1, 1]) { s.box([0.03, 0.2, 0.09], [x * (gap * n / 2 + 0.015), 0.1, 0], darkWood); s.box([0.04, 0.02, 0.14], [x * (gap * n / 2 + 0.015), 0.01, 0], darkWood); }
      const slot = Math.floor(random() * 3);
      unit.position.set((slot - 1) * gap, 0.1, 0);
      unit.rotation.y = (random() - 0.5) * 0.4;
      for (let k = 0; k < 3; k++) if (k !== slot) {
        const x = (k - 1) * gap, turn = (random() - 0.5) * 0.8;
        s.box([0.022, 0.16, 0.028], [x, 0.17, 0], wood);
        const blank = s.ball([0.05, 0.068, 0.055], [x, 0.345, 0], wood, 20);
        s.cylinder(0.02, 0.024, 0.05, [x, 0.265, 0], wood, 12);
        const n2 = s.cylinder(0.001, 0.009, 0.03, [x + Math.sin(turn) * 0.056, 0.34, Math.cos(turn) * 0.056], wood, 8); n2.rotation.set(0.42, turn, 0, 'YXZ');
        blank.rotation.y = turn;
      }
    } else {
      const paulownia = s.material('#e0cfa6', { roughness: 0.8 });
      const silk = s.material({ scarlet: '#b8242c', indigo: '#3a4f8a', black: '#6b1f5a', white: '#ece6d6', purple: '#7b5aa6' }[a.collar], { roughness: 0.35 });
      const bw = 0.3, bl = 0.5, bh = 0.12;
      s.box([bw, 0.01, bl], [0, 0.005, 0], paulownia);
      for (const x of [-1, 1]) s.box([0.01, bh, bl], [x * bw / 2, bh / 2, 0], paulownia);
      for (const z of [-1, 1]) s.box([bw, bh, 0.01], [0, bh / 2, z * bl / 2], paulownia);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) s.ball([0.06, 0.03 + random() * 0.014, 0.06], [(j - 1) * 0.085, 0.035, (i - 2) * 0.095], silk, 10);
      const lid = s.box([bw + 0.02, 0.012, bl + 0.02], [bw * 0.5 + 0.06, 0.125, -0.02], paulownia); lid.rotation.z = -1.15; lid.position.x = bw / 2 + 0.07;
      unit.rotation.set(-1.22, 0, 0);
      unit.position.set(0, 0.075, 0.2);
      unit.rotation.z = (random() - 0.5) * 0.2;
    }
    return s.finish();
  },
});
