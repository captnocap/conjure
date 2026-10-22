import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type P3, type Section, canvasTexture, card, loft, sectionAt, taper } from './lib';

const COATS = {
  bay: 'Bay: rich red-brown with black mane and a dark muzzle.',
  grey: 'Dapple grey: pale silver mottled with darker rings, charcoal mane.',
  black: 'Black: glossy near-black all over, a funeral or cavalry horse.',
  chestnut: 'Chestnut: bright copper with a mane the same colour.',
  palomino: 'Palomino: gold coat with a cream-white mane, a parade horse.',
  piebald: 'Piebald: big irregular black and white patches, a cob or a circus horse.',
} as const;
const COAT_PAINT: Record<keyof typeof COATS, [string, string]> = {
  bay: ['#6e3b1f', '#16110f'], grey: ['#bdbab4', '#55524f'], black: ['#24201f', '#0e0d0d'],
  chestnut: ['#a6552b', '#b56a3a'], palomino: ['#d8b168', '#f0e6cb'], piebald: ['#f1ede4', '#1c1817'],
};

const S = (z: number, y: number, w: number, h: number): Section => ({ z, y, w, h });

export default defineThing({
  questions: {
    state: choice('What state is the head in?', {
      flehmen: 'Alive, neck stretched and nose in the air, top lip curled right back off the long front teeth and pink gum: the horse laugh.',
      nicker: 'Alive and calm, head lowered, lips soft and closed, a quiet greeting.',
      yawn: 'Alive with the mouth gaping wide in a yawn or a bray, tongue and both rows of front teeth on show.',
      skull: 'The bare bleached skull on a brass rod: long nasal bones, empty orbits, the gap between front teeth and grinders.',
      half: 'An anatomical teaching model: one side coat and eye, the other side cut away to the skull and tooth roots.',
    }),
    age: score('How old do the teeth say it is?', ['A foal: short, small, white milk teeth', 'A young adult: neat upright ivory teeth', 'Middle-aged: longer and yellowing', 'Very old: long, brown-streaked, slanting far forward']),
    tack: choice('If it wears tack, what is it?', {
      none: 'Nothing, a bare head.',
      bridle: 'A brown leather bridle with noseband, browband, steel bit rings and reins.',
      halter: 'A plain rope halter with a lead rope hanging down.',
      plumed: 'Black funeral or parade harness with brass rosettes and a tall feather plume on the poll.',
    }),
    ears: choice('What are the ears doing?', {
      pricked: 'Both pricked sharply forward, alert.',
      pinned: 'Both pinned flat back, angry or frightened.',
      airplane: 'Flopped out sideways, dozing or bored.',
      split: 'One forward and one turned back, listening two ways.',
    }),
    coat: choice('What colour is the horse?', COATS),
    blaze: choice('What white marking is on the face?', {
      none: 'None, a solid face.',
      star: 'A small white star between the eyes.',
      blaze: 'A white blaze running from forehead to nostrils.',
      bald: 'A bald face: white across most of the front with a pink muzzle.',
    }),
    display: choice('How is it presented?', {
      plain: 'On a simple turned base, nothing else.',
      labelled: 'With a handwritten card giving a name and dates, a loved or famous animal.',
      numbered: 'With small numbered flags pinned to it and a typed key, a teaching specimen.',
      rosette: 'With a prize rosette and ribbon tails pinned beside it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const bare = a.state === 'skull', half = a.state === 'half', living = !bare;
    const turn = new THREE.Group();
    turn.rotation.y = -0.6 + (random() - 0.5) * 0.15;
    s.root.add(turn);
    const head = new THREE.Group();
    turn.add(head);
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = head) => { parent.add(node); return node; };

    const flehmen = a.state === 'flehmen', yawn = a.state === 'yawn';
    const gape = flehmen ? 0.14 : yawn ? 0.55 : bare ? 0.1 : half ? 0.06 : 0;

    // ---- Materials -------------------------------------------------------------------------
    const [coat, maneColour] = COAT_PAINT[a.coat];
    const pinkNose = a.blaze === 'bald';
    const skinMap = canvasTexture(256, 512, (ctx, w, h) => {
      ctx.fillStyle = coat; ctx.fillRect(0, 0, w, h);
      if (a.coat === 'piebald') {
        ctx.fillStyle = maneColour;
        for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 30 + random() * 60, 40 + random() * 80, random() * 3, 0, 7); ctx.fill(); }
      }
      if (a.coat === 'grey') for (let i = 0; i < 160; i++) { ctx.strokeStyle = `rgba(90,88,85,${0.15 + random() * 0.25})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(random() * w, random() * h, 6 + random() * 9, 0, 7); ctx.stroke(); }
      // Darker soft muzzle toward the nose (top of the canvas is the nose end).
      const nose = ctx.createLinearGradient(0, 0, 0, h * 0.28);
      nose.addColorStop(0, pinkNose ? '#d9a39a' : a.coat === 'palomino' || a.coat === 'chestnut' ? '#5a4036' : '#221d1c');
      nose.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = nose; ctx.fillRect(0, 0, w, h * 0.28);
      ctx.fillStyle = '#f4f0e6';
      const v = (t: number) => h * (1 - t);
      if (a.blaze === 'star') { ctx.beginPath(); ctx.ellipse(w / 2, v(0.3), 15, 26, 0, 0, 7); ctx.fill(); }
      if (a.blaze === 'blaze') { ctx.beginPath(); ctx.moveTo(w / 2 - 14, v(0.2)); ctx.quadraticCurveTo(w / 2 - 26, v(0.5), w / 2 - 14, v(0.93)); ctx.lineTo(w / 2 + 16, v(0.93)); ctx.quadraticCurveTo(w / 2 + 22, v(0.5), w / 2 + 12, v(0.2)); ctx.closePath(); ctx.fill(); }
      if (a.blaze === 'bald') { ctx.beginPath(); ctx.moveTo(w / 2 - 30, v(0.16)); ctx.quadraticCurveTo(w / 2 - 66, v(0.5), w / 2 - 50, v(0.8)); ctx.lineTo(w / 2 + 50, v(0.8)); ctx.quadraticCurveTo(w / 2 + 66, v(0.5), w / 2 + 30, v(0.16)); ctx.closePath(); ctx.fill(); }
      // Short hair grain.
      for (let i = 0; i < 500; i++) { ctx.strokeStyle = `rgba(0,0,0,${0.03 + random() * 0.06})`; const x = random() * w, y = random() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 3, y - 5 - random() * 6); ctx.stroke(); }
    });
    const dusty = mood.wear * 0.25;
    const skin = new THREE.MeshStandardMaterial({ map: skinMap, roughness: 0.75 + dusty, side: THREE.DoubleSide });
    const neckPaint = s.material(a.coat === 'piebald' ? '#e9e4da' : coat, { roughness: 0.8 });
    const manePaint = s.material(a.coat === 'piebald' ? '#1c1817' : maneColour, { roughness: 0.95 });
    const boneColour = new THREE.Color('#ece4cf').lerp(new THREE.Color('#b79f76'), mood.wear * 0.5);
    const bone = new THREE.MeshStandardMaterial({ color: boneColour, roughness: 0.8 });
    const hollow = new THREE.MeshStandardMaterial({ color: '#1c1613', roughness: 1 });
    const enamel = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f7f3e4').lerp(new THREE.Color('#b9893c'), Math.min(1, a.age * 0.75 + mood.wear * 0.2)), roughness: 0.35 });
    const gum = s.material('#d9828a', { roughness: 0.45 });
    const flesh = s.material('#a8404a', { roughness: 0.6, side: THREE.DoubleSide });
    const brass = s.material('#b9944a', { metalness: 0.8, roughness: 0.3 });
    const wood = s.material('#4a2d1b', { roughness: 0.5 });
    const dark = s.material('#15110f', { roughness: 0.35 });

    // ---- Sections --------------------------------------------------------------------------
    const lipUp = flehmen ? 1 : 0;
    const upper: Section[] = [
      S(-0.05, 0.02, 0.07, 0.09), S(0.02, 0.03, 0.105, 0.12), S(0.14, 0.03, 0.112, 0.115), S(0.28, 0.03, 0.086, 0.09),
      S(0.42, 0.025, 0.062, 0.066), S(0.54, 0.016 + lipUp * 0.008, 0.06, 0.06), S(0.61, 0.01 + lipUp * 0.035, 0.057, 0.052 - lipUp * 0.012), S(0.648, 0.0 + lipUp * 0.075, 0.036, 0.034 - lipUp * 0.006),
    ];
    const lower: Section[] = [S(0.0, -0.085, 0.08, 0.075), S(0.12, -0.1, 0.085, 0.07), S(0.26, -0.085, 0.06, 0.045), S(0.42, -0.066, 0.042, 0.03), S(0.56, -0.064, 0.042, 0.026), S(0.615, -0.066, 0.03, 0.02)];
    const skullUpper: Section[] = [S(-0.04, 0.035, 0.05, 0.055), S(0.03, 0.045, 0.082, 0.08), S(0.14, 0.035, 0.094, 0.075), S(0.27, 0.03, 0.06, 0.066), S(0.4, 0.02, 0.04, 0.048), S(0.52, 0.004, 0.034, 0.034), S(0.6, -0.002, 0.04, 0.03), S(0.635, -0.006, 0.03, 0.022)];

    const jaw = new THREE.Group();
    jaw.position.set(0, -0.02, 0.04);
    jaw.rotation.x = gape;
    head.add(jaw);
    const inJaw = (p: P3): P3 => [p[0], p[1] + 0.02, p[2] - 0.04];

    // ---- Teeth (shared by every state that shows them) -------------------------------------
    const toothLength = mix(0.018, 0.05, a.age), slant = mix(0.05, 0.75, a.age);
    const incisors = (parent: THREE.Object3D, y: number, z: number, direction: 1 | -1, at: (p: P3) => P3 = (p) => p) => {
      for (let i = 0; i < 6; i++) {
        const x = (i - 2.5) * 0.0128;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.0104, toothLength, 0.009), enamel);
        tooth.geometry.translate(0, -toothLength / 2, 0);
        tooth.position.set(...at([x, y, z - x * x * 16]));
        tooth.rotation.set(direction * -slant, 0, direction > 0 ? 0 : Math.PI);
        tooth.castShadow = true;
        parent.add(tooth);
      }
    };
    const grinders = (parent: THREE.Object3D, y: number, up: boolean, at: (p: P3) => P3 = (p) => p) => {
      for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.026, 0.024), enamel);
        tooth.position.set(...at([side * (0.05 - i * 0.002), y + (up ? 0.008 : -0.008), 0.19 + i * 0.027]));
        tooth.castShadow = true;
        parent.add(tooth);
      }
    };

    // ---- The skull (bare, or inside the half model) ----------------------------------------
    if (bare || half) {
      add(s.mesh(loft(skullUpper, { sides: 16 }), bone));
      for (const side of [-1, 1]) {
        if (half && side < 0) continue;
        add(s.ball([0.03, 0.036, 0.036], [side * 0.078, 0.05, 0.135], hollow, 12));
        const rim = add(s.ring(0.04, 0.008, [side * 0.094, 0.05, 0.135], bone));
        rim.rotation.y = Math.PI / 2;
        // Zygomatic bar and the facial crest.
        add(s.tube([[side * 0.09, 0.02, 0.03], [side * 0.105, 0.005, 0.1], [side * 0.092, 0.0, 0.2], [side * 0.062, 0.0, 0.3]], 0.008, bone));
        // Jaw bone: a deep ramus plate and a long bar to the chin.
        add(s.ball([0.011, 0.095, 0.062], inJaw([side * 0.078, -0.07, 0.07]), bone, 12), jaw);
        add(s.mesh(taper([inJaw([side * 0.076, -0.14, 0.09]), inJaw([side * 0.06, -0.105, 0.24]), inJaw([side * 0.034, -0.078, 0.44]), inJaw([side * 0.02, -0.072, 0.58]), inJaw([0, -0.07, 0.62])], (t) => 0.024 - t * 0.01, { segments: 20, sides: 8 }), bone), jaw);
        add(s.ball([0.012, 0.03, 0.02], [side * 0.08, 0.03, 0.03], bone, 8), jaw);
      }
      add(s.ball([0.022, 0.016, 0.075], [0, 0.036, 0.52], hollow, 12));
      grinders(head, -0.04, false);
      grinders(jaw, -0.058, true, inJaw);
      incisors(head, -0.022, 0.634, 1);
      incisors(jaw, -0.056, 0.628, -1, inJaw);
    }

    // ---- The living head -------------------------------------------------------------------
    const ears: THREE.Group[] = [];
    if (living) {
      const span = half ? { from: 0, to: 0.5 } : {};
      add(s.mesh(loft(upper, { sides: 20, ...(half ? { from: 0, to: 0.63 } : {}) }), skin));
      const jawSkin = add(s.mesh(loft(lower.map((q) => ({ ...q, y: q.y + 0.02, z: q.z - 0.04 })), { sides: 16, ...span }), skin), jaw);
      // Reuse the face texture low on the jaw, where it is plain coat.
      const uv = jawSkin.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.05 + uv.getX(i) * 0.1, 0.05 + uv.getY(i) * (pinkNose ? 0.92 : 0.9));
      if (half) {
        // The cut face of the section, in muscle red, just inside the skin.
        add(s.mesh(loft(upper.map((q) => ({ ...q, w: q.w * 0.96, h: q.h * 0.96 })), { sides: 20, from: 0, to: 0.63 }), flesh));
        add(s.mesh(loft(lower.map((q) => ({ ...q, y: q.y + 0.02, z: q.z - 0.04, w: q.w * 0.94, h: q.h * 0.94 })), { sides: 16, from: 0, to: 0.5 }), flesh), jaw);
      }
      for (const side of [-1, 1]) {
        if (half && side > 0) continue;
        // Eye, lid and the bony ridge above it.
        add(s.ball([0.02, 0.024, 0.026], [side * 0.098, 0.062, 0.135], dark, 14));
        add(s.ball([0.004, 0.004, 0.004], [side * 0.116, 0.07, 0.143], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.5 }), 6));
        const lid = add(s.ball([0.022, 0.014, 0.032], [side * 0.097, 0.082 - (a.state === 'nicker' ? 0.006 : 0), 0.132], neckPaint, 10));
        lid.rotation.z = side * -0.3;
        // Nostril: wide and flared when the lip is curled.
        const nostril = add(s.ball([0.012, flehmen || yawn ? 0.02 : 0.013, 0.02], [side * 0.04, upper[6].y + 0.03, 0.605], dark, 10));
        nostril.rotation.y = side * 0.5;
        // Cheek: the round jaw muscle.
        add(s.ball([0.03, 0.085, 0.085], inJaw([side * 0.07, -0.06, 0.1]), neckPaint, 14), jaw);
      }
      if (!half) for (const side of [-1, 1]) {
        const ear = new THREE.Group();
        ear.position.set(side * 0.058, 0.118, -0.005);
        const shell = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.15, 10, 1, true), skin);
        shell.geometry.translate(0, 0.075, 0);
        shell.scale.z = 0.55;
        shell.castShadow = true;
        const inner = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.11, 8), s.material('#3a2a26', { roughness: 1 }));
        inner.geometry.translate(0, 0.062, 0.012);
        inner.scale.z = 0.4;
        ear.add(shell, inner);
        const back = a.ears === 'pinned' || (a.ears === 'split' && side > 0);
        ear.rotation.set(a.ears === 'airplane' ? -0.5 : back ? -2.0 : -0.42, 0, a.ears === 'airplane' ? side * -1.25 : side * -0.18);
        head.add(ear);
        ears.push(ear);
      } else {
        const ear = new THREE.Group();
        ear.position.set(-0.058, 0.118, -0.005);
        const shell = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.15, 10, 1, true), skin);
        shell.geometry.translate(0, 0.075, 0); shell.scale.z = 0.55; shell.castShadow = true;
        ear.add(shell);
        ear.rotation.set(a.ears === 'pinned' ? -2.0 : -0.42, 0, a.ears === 'airplane' ? 1.25 : 0.18);
        head.add(ear);
        ears.push(ear);
      }
      // Forelock.
      for (let i = 0; i < 5; i++) add(s.mesh(taper([[(i - 2) * 0.016, 0.12, -0.01], [(i - 2) * 0.022 + (random() - 0.5) * 0.02, 0.14, 0.05], [(i - 2) * 0.026 + (random() - 0.5) * 0.03, 0.125, 0.12 + random() * 0.06]], (t) => 0.014 * (1 - t * 0.8), { segments: 8, sides: 6 }), manePaint));

      // Mouth: gum, teeth and tongue where the lips are drawn back.
      if (flehmen || yawn) {
        add(s.ball([0.043, 0.02, 0.018], [0, -0.012 + (flehmen ? 0.012 : 0), 0.628], gum, 12));
        incisors(head, -0.018 + (flehmen ? 0.008 : 0), 0.638, 1);
        add(s.ball([0.038, 0.012, 0.016], inJaw([0, -0.05, 0.612]), gum, 12), jaw);
        incisors(jaw, -0.05, 0.622, -1, inJaw);
      }
      if (yawn) {
        const tongue = add(s.mesh(taper([inJaw([0, -0.06, 0.2]), inJaw([0, -0.04, 0.42]), inJaw([0, -0.03, 0.58])], (t) => 0.034 - t * 0.012, { segments: 12, sides: 10, flat: 0.45 }), s.material('#c9616d', { roughness: 0.4 })), jaw);
        tongue.castShadow = true;
        add(s.ball([0.05, 0.03, 0.14], [0, -0.03, 0.36], s.material('#7a2a35', { roughness: 0.7 }), 12));
        grinders(jaw, -0.058, true, inJaw);
      }
      if (half) { /* teeth already built with the skull */ }
    }

    // ---- Tack ------------------------------------------------------------------------------
    const loop = (z: number, pad: number, radius: number, paint: THREE.Material, wholeHead = true) => {
      const u = sectionAt(living ? upper : skullUpper, z), l = sectionAt(lower, z);
      const top = u.y + u.h + pad, bottom = wholeHead ? l.y - l.h - pad - Math.sin(gape) * (z - 0.04) : u.y - u.h - pad;
      const points: P3[] = [];
      for (let i = 0; i < 16; i++) { const angle = (i / 16) * Math.PI * 2; points.push([Math.sin(angle) * (Math.max(u.w, l.w) + pad), (top + bottom) / 2 + Math.cos(angle) * (top - bottom) / 2, z]); }
      return add(s.tube(points, radius, paint, true));
    };
    if (a.tack !== 'none' && living && !half) {
      const rope = a.tack === 'halter';
      const strap = s.material(rope ? '#c8b68a' : a.tack === 'plumed' ? '#141214' : '#6a3f22', { roughness: 0.8 });
      const r = rope ? 0.007 : 0.006;
      loop(0.44, 0.004, r * 1.2, strap);
      for (const side of [-1, 1]) {
        add(s.tube([[side * 0.07, 0.125, -0.03], [side * 0.112, 0.06, 0.03], [side * 0.105, 0.0, 0.2], [side * 0.07, -0.015, 0.44]], r, strap));
        if (!rope) {
          const ring = add(s.ring(0.026, 0.004, [side * 0.066, -0.035, 0.54], s.material('#c9ccce', { metalness: 0.9, roughness: 0.25 })));
          ring.rotation.y = Math.PI / 2;
          add(s.rod([side * 0.07, -0.015, 0.44], [side * 0.066, -0.012, 0.54], r, strap));
          // Reins back to the neck.
          add(s.tube([[side * 0.068, -0.06, 0.54], [side * 0.11, -0.16, 0.3], [side * 0.1, -0.12, 0.0], [side * 0.04, 0.02, -0.2]], 0.004, strap));
        }
      }
      add(s.tube([[-0.108, 0.075, 0.03], [-0.06, 0.135, 0.035], [0, 0.152, 0.04], [0.06, 0.135, 0.035], [0.108, 0.075, 0.03]], r, a.tack === 'plumed' ? s.material('#9a1c22') : strap));
      add(s.tube([[-0.1, 0.03, -0.03], [-0.085, -0.09, -0.0], [0, -0.15, 0.02], [0.085, -0.09, 0.0], [0.1, 0.03, -0.03]], r, strap));
      if (rope) add(s.tube([[0, -0.1, 0.44], [0.01, -0.3, 0.42], [-0.02, -0.5, 0.4 + random() * 0.1], [0.03, -0.62, 0.34]], 0.008, strap));
      if (a.tack === 'plumed') {
        for (const side of [-1, 1]) add(s.cylinder(0.022, 0.022, 0.008, [side * 0.11, 0.078, 0.03], brass, 14)).rotation.z = Math.PI / 2;
        add(s.cylinder(0.012, 0.016, 0.05, [0, 0.16, -0.02], brass, 10));
        for (let i = 0; i < 7; i++) {
          const lean = (i - 3) * 0.035;
          add(s.mesh(taper([[0, 0.18, -0.02], [lean * 0.6, 0.3, -0.03], [lean * 1.6, 0.4 + random() * 0.04, -0.05 - Math.abs(lean) * 0.4]], (t) => 0.02 * Math.sin(Math.min(1, t + 0.15) * Math.PI) + 0.004, { segments: 10, sides: 6 }), s.material(i % 2 ? '#17141a' : mood.cheer > 0.6 ? '#b3202a' : '#2a2530', { roughness: 1 })));
        }
      }
    } else if (a.tack !== 'none' && bare) {
      // All that is left of the bridle: a rusted bit still lying in the gap of the teeth.
      const rust = s.material('#7a4a2c', { metalness: 0.4, roughness: 0.9 });
      add(s.rod([-0.06, -0.05, 0.47], [0.06, -0.05, 0.47], 0.006, rust));
      for (const side of [-1, 1]) add(s.ring(0.026, 0.005, [side * 0.064, -0.06, 0.47], rust)).rotation.y = Math.PI / 2;
    }

    // ---- Neck, stand and pose --------------------------------------------------------------
    let labelZ = 0.3;
    if (living) {
      const pitch = flehmen ? -0.5 : yawn ? 0.35 : half ? 0.75 : 1.0;
      const poll: P3 = flehmen ? [0, 0.86, 0.1] : yawn ? [0, 0.8, 0.02] : [0, 0.76, 0];
      head.position.set(...poll);
      head.rotation.x = pitch + (random() - 0.5) * 0.1;
      head.rotation.z = (random() - 0.5) * (flehmen ? 0.3 : 0.1);
      const neck = add(s.rod([0, 0.02, -0.34], [poll[0], poll[1] - 0.06, poll[2] - 0.05], 0.2, neckPaint, 0.105), turn);
      neck.scale.x = 0.6;
      // Mane falling down one side of the crest.
      const from = new THREE.Vector3(0, 0.08, -0.5), to = new THREE.Vector3(poll[0], poll[1] + 0.05, poll[2] - 0.1);
      for (let i = 0; i < 12; i++) {
        const p = from.clone().lerp(to, i / 11);
        add(s.mesh(taper([[p.x, p.y, p.z], [p.x + 0.07, p.y - 0.05, p.z + 0.01], [p.x + 0.1 + random() * 0.03, p.y - 0.17 - random() * 0.08, p.z + 0.04]], (t) => 0.026 * (1 - t * 0.75), { segments: 8, sides: 6 }), manePaint), turn);
      }
      add(s.lathe([[0.3, 0], [0.31, 0.02], [0.27, 0.045], [0.24, 0.05], [0.235, 0.075], [0, 0.08]], half ? s.material('#e8e6df', { roughness: 0.3 }) : wood), turn).position.set(0, 0, -0.26);
      const collar = add(s.cylinder(0.2, 0.22, 0.03, [0, 0.09, -0.3], brass, 24), turn);
      collar.scale.x = 0.66;
      labelZ = 0.08;
    } else {
      head.position.set(0, 0.47, -0.28);
      head.rotation.x = 0.16;
      add(s.box([0.3, 0.035, 0.62], [0, 0.0175, 0.02], wood), turn);
      add(s.box([0.27, 0.01, 0.59], [0, 0.04, 0.02], wood), turn);
      add(s.rod([0, 0.04, -0.06], [0, 0.4, -0.06], 0.008, brass), turn);
      add(s.rod([0, 0.04, 0.16], [0, 0.34, 0.16], 0.006, brass), turn);
      for (const z of [-0.06, 0.16]) add(s.ball([0.016, 0.01, 0.016], [0, 0.045, z], brass, 10), turn);
      labelZ = 0.34;
    }

    // ---- Display extras --------------------------------------------------------------------
    if (a.display === 'labelled') {
      const names = ['Old Captain', 'Duchess', 'Sorrel', 'Major', 'Bess', 'Thunder'];
      const born = 1880 + Math.floor(random() * 60);
      const tag = card([names[Math.floor(random() * names.length)], `${born} - ${born + Math.round(mix(1, 34, a.age))}`], 0.24, 0.1);
      tag.position.set(living ? 0.2 : 0, 0.05, labelZ + (living ? 0 : 0.01));
      tag.rotation.set(-0.5, living ? 0.3 : 0, 0);
      turn.add(tag);
    } else if (a.display === 'numbered') {
      const pin = s.material('#b3202a');
      const spots: P3[] = bare ? [[0.03, 0.1, 0.1], [0.02, 0.06, 0.4], [0.06, 0.02, 0.2], [0.02, 0.03, 0.6]] : [[-0.06, 0.13, 0.1], [-0.03, 0.09, 0.4], [0.07, 0.07, 0.14], [0.03, 0.04, 0.55]];
      spots.forEach((spot, i) => {
        add(s.rod(spot, [spot[0] * 1.5, spot[1] + 0.07, spot[2]], 0.0025, brass));
        const flag = card([`${i + 1}`], 0.035, 0.03, '#ffffff', '#b3202a', 'sans-serif');
        flag.position.set(spot[0] * 1.5, spot[1] + 0.082, spot[2]);
        flag.rotation.y = 0.6;
        head.add(flag);
        add(s.ball([0.006, 0.006, 0.006], spot, pin, 6));
      });
      const key = card(['1 nasal  2 orbit', '3 molars  4 incisors'], 0.26, 0.09, '#1e1b16', '#f0ece0', 'monospace');
      key.position.set(living ? 0.2 : 0, 0.05, labelZ + (living ? 0 : 0.01));
      key.rotation.set(-0.5, living ? 0.3 : 0, 0);
      turn.add(key);
    } else if (a.display === 'rosette') {
      const colour = mood.cheer > 0.66 ? '#c2202b' : mood.cheer > 0.33 ? '#1f4fa3' : '#e8c531';
      const ribbon = s.material(colour, { roughness: 0.6, side: THREE.DoubleSide });
      const at: P3 = living ? [0.17, 0.2, -0.12] : [0.1, 0.13, 0.3];
      const rosette = new THREE.Group();
      rosette.position.set(...at);
      rosette.rotation.set(-0.3, 0.5, 0);
      for (let i = 0; i < 14; i++) { const petal = new THREE.Mesh(new THREE.CircleGeometry(0.022, 8), ribbon); petal.position.set(Math.cos(i * 0.45) * 0.045, Math.sin(i * 0.45) * 0.045, 0); petal.castShadow = true; rosette.add(petal); }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 18), s.material('#f1ead8')); hub.rotation.x = Math.PI / 2; hub.position.z = 0.004; rosette.add(hub);
      for (const side of [-1, 1]) { const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.14), ribbon); tail.position.set(side * 0.022, -0.1, -0.002); tail.rotation.z = side * 0.2; tail.castShadow = true; rosette.add(tail); }
      turn.add(rosette);
      if (!living) add(s.rod([at[0], 0.04, at[2]], [at[0], at[1] - 0.05, at[2]], 0.003, brass), turn);
    }

    const twitch = living ? mix(0, 0.35, mood.energy) : 0;
    const rest = ears.map((ear) => ear.rotation.x), phase = random() * 6, jawRest = gape;
    return s.finish({
      update: twitch > 0 ? (_dt, time) => {
        ears.forEach((ear, i) => { ear.rotation.x = rest[i] + Math.max(0, Math.sin(time * (2.1 + i * 0.7) + phase + i * 2)) ** 6 * twitch; });
        if (flehmen || yawn) jaw.rotation.x = jawRest + Math.sin(time * 1.3 + phase) * 0.03 * twitch;
      } : undefined,
    });
  },
});
