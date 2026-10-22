import * as THREE from 'three';
import { Sculpture, choice, defineThing, noul } from '@conjure/kit';

type P3 = [number, number, number];
const NAMES = { pirate: 'CAPTAIN BOGEY', dinosaur: 'REX', gorilla: 'KING PUTT', mermaid: 'PEARL', clown: 'CHUCKLES' } as const;

export default defineThing({
  questions: {
    who: choice('Who is the figure?', {
      pirate: 'A peg-leg pirate with a hook, an eyepatch, a black beard and a tricorn hat.',
      dinosaur: 'A grinning green cartoon dinosaur standing upright, all teeth and tiny arms.',
      gorilla: 'A giant black gorilla, hunched, one fist on the ground and one raised overhead.',
      mermaid: 'A mermaid sitting on a rock with a scaled tail and long bright hair, waving.',
      clown: 'A huge clown head with a gaping red mouth that swallows golf balls down its tongue.',
    }),
    missing: choice('What is broken or missing?', {
      nothing: 'Nothing, it is somehow intact.',
      hand: 'A hand, snapped off at the wrist, the steel armature poking out.',
      eye: 'An eye, leaving a dark socket.',
      nose: 'The nose, knocked off and never replaced.',
      head: 'A great chunk of the head, patched over with a bucket of filler.',
    }),
    repaint: choice('How faithfully was it last repainted?', {
      faithful: 'Carefully, in the right colours, glossy as the day it arrived.',
      faded: 'Not for decades: chalky pastel ghosts of the original colours.',
      garish: 'In completely the wrong colours, lurid and bright.',
      onetin: 'Slapped all over with the one tin that was open, only the eyes picked out.',
      wonky: 'In the right colours by an unsteady amateur, eyes wandering in different directions.',
    }),
    holds: choice('What is it holding?', {
      nothing: 'Nothing, an empty raised hand.',
      putter: 'A real rental putter wedged into its fist.',
      flag: 'A numbered hole flag on a pole.',
      cone: 'A giant fibreglass ice-cream cone with a flake.',
      sword: 'A plywood cutlass painted silver.',
      ball: 'An oversized dimpled golf ball.',
    }),
    plinth: choice('What does it stand on?', {
      block: 'A plain painted concrete block.',
      drum: 'An oil drum painted in seaside stripes.',
      rock: 'A lumpy fake rock mound.',
      brick: 'A pedestal of painted brick.',
    }),
    sign: choice('What does the notice on the plinth say?', {
      name: 'The name somebody gave it.',
      climb: 'DO NOT CLIMB',
      photo: 'PHOTOS 50p',
      none: 'There is no notice.',
    }),
    gull: noul('Is a seagull perched on its head?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const who = a.who;
    const B = a.plinth === 'drum' ? 0.62 : a.plinth === 'rock' ? 0.36 : 0.45;
    const chalk = new THREE.Color('#e2dccb');
    const tin = new THREE.Color(['#3f8fbf', '#efe6cc', '#2f9a52', '#d8322b', '#f2b90f'][Math.floor(random() * 5)]);
    const shift = 0.2 + random() * 0.6;
    const wonky = a.repaint === 'wonky';
    const tone = (hex: string) => {
      const c = new THREE.Color(hex);
      if (a.repaint === 'faded') {
        const hsl = { h: 0, s: 0, l: 0 };
        c.getHSL(hsl);
        c.setHSL(hsl.h, hsl.s * 0.6, hsl.l + (0.8 - hsl.l) * 0.5);
      }
      if (a.repaint === 'onetin') c.lerp(tin, 0.84);
      if (a.repaint === 'garish') {
        const hsl = { h: 0, s: 0, l: 0 };
        c.getHSL(hsl);
        c.setHSL((hsl.h + shift) % 1, Math.min(1, hsl.s * 0.6 + 0.55), Math.min(0.62, Math.max(0.4, hsl.l)));
      }
      return c.lerp(chalk, mood.wear * 0.1);
    };
    const cache = new Map<string, THREE.MeshStandardMaterial>();
    const paint = (hex: string) => {
      if (!cache.has(hex)) cache.set(hex, new THREE.MeshStandardMaterial({ color: tone(hex), roughness: a.repaint === 'faded' ? 0.9 : 0.32 + mood.wear * 0.3 }));
      return cache.get(hex)!;
    };
    const raw = (hex: string, rough = 0.6) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: rough });
    const eyeWhite = raw(a.repaint === 'faded' ? '#e9e4d6' : '#fbf8ee', 0.3), pupil = raw(a.repaint === 'faded' ? '#6d6a66' : '#111315', 0.3);
    const glass = raw('#8b8c86', 0.95), rebar = raw('#6b3d22', 0.8);

    const skins: { c: P3; r: P3 }[] = [];
    const ball = (r: P3, at: P3, m: THREE.Material, seg = 20) => {
      if (Math.min(r[0], r[1]) > 0.14) skins.push({ c: [at[0], at[1] + B, at[2]], r });
      return s.ball(r, [at[0], at[1] + B, at[2]], m, seg);
    };
    const cyl = (top: number, bottom: number, h: number, at: P3, m: THREE.Material, seg = 18) => s.cylinder(top, bottom, h, [at[0], at[1] + B, at[2]], m, seg);
    const rod = (from: P3, to: P3, r: number, m: THREE.Material, end = r) => s.rod([from[0], from[1] + B, from[2]], [to[0], to[1] + B, to[2]], r, m, end);
    const box = (size: P3, at: P3, m: THREE.Material) => s.box(size, [at[0], at[1] + B, at[2]], m);
    const parts: Record<'hand' | 'eye' | 'nose', { obj: THREE.Object3D; at: P3; r: number }[]> = { hand: [], eye: [], nose: [] };
    const eye = (x: number, y: number, z: number, r: number) => {
      const group = new THREE.Group();
      const j = wonky ? r * 0.9 : 0;
      const px = x + (random() - 0.5) * j, py = y + (random() - 0.5) * j * 1.6;
      group.add(ball([r, r, r * 0.8], [px, py, z], eyeWhite, 14));
      group.add(ball([r * 0.5, r * 0.5, r * 0.4], [px + (random() - 0.5) * j * 1.3, py + (random() - 0.5) * j * 1.3, z + r * 0.62], pupil, 10));
      s.root.add(group);
      parts.eye.push({ obj: group, at: [px, py, z], r });
    };
    const arm = (shoulder: P3, elbow: P3, hand: P3, r: number, m: THREE.Material, handMat: THREE.Material, handR = r * 1.25) => {
      rod(shoulder, elbow, r, m);
      ball([r, r, r], elbow, m, 12);
      rod(elbow, hand, r, m, r * 0.85);
      const fist = ball([handR, handR, handR], hand, handMat, 14);
      parts.hand.push({ obj: fist, at: hand, r: handR });
      return fist;
    };

    let top: P3 = [0, 2, 0], grip: P3 = [0.5, 1.4, 0.2], spare = 0;
    if (who === 'pirate') {
      const skin = paint('#e0a57c'), navy = paint('#263a66'), black = paint('#1b1c1f'), gold = paint('#e3b23a'), red = paint('#c92f2a');
      cyl(0.1, 0.1, 0.75, [-0.17, 0.42, 0], navy);
      cyl(0.115, 0.125, 0.32, [-0.17, 0.16, 0], black);
      ball([0.12, 0.08, 0.19], [-0.17, 0.08, 0.1], black, 14);
      cyl(0.105, 0.1, 0.36, [0.17, 0.62, 0], navy);
      rod([0.17, 0.46, 0], [0.17, 0, 0], 0.035, paint('#8a5a30'), 0.06);
      const stripes = document.createElement('canvas');
      stripes.width = 8; stripes.height = 64;
      const c = stripes.getContext('2d')!;
      for (let i = 0; i < 8; i++) { c.fillStyle = '#' + tone(i % 2 ? '#f4efe0' : '#c92f2a').getHexString(); c.fillRect(0, i * 8, 8, 8); }
      const shirt = new THREE.CanvasTexture(stripes);
      shirt.colorSpace = THREE.SRGBColorSpace;
      ball([0.31, 0.4, 0.23], [0, 1.1, 0], new THREE.MeshStandardMaterial({ map: shirt, roughness: 0.45 }));
      cyl(0.3, 0.3, 0.09, [0, 0.84, 0], black);
      box([0.11, 0.11, 0.03], [0, 0.84, 0.29], gold);
      for (const side of [-1, 1]) ball([0.1, 0.36, 0.2], [side * 0.26, 1.08, -0.02], navy, 14);
      const sleeve = paint('#f4efe0');
      arm([0.3, 1.34, 0], [0.52, 1.1, 0.08], [0.56, 1.4, 0.24], 0.075, sleeve, skin);
      rod([-0.3, 1.34, 0], [-0.5, 1.02, 0.12], 0.075, sleeve);
      cyl(0.085, 0.085, 0.08, [-0.52, 0.98, 0.14], black);
      const hook = s.ring(0.07, 0.018, [-0.55, 0.86 + B, 0.17], raw('#c4c8c9', 0.25), Math.PI * 1.4);
      hook.rotation.z = Math.PI * 0.75;
      parts.hand.unshift({ obj: hook, at: [-0.52, 0.94, 0.14], r: 0.08 });
      ball([0.2, 0.21, 0.2], [0, 1.68, 0], skin);
      ball([0.2, 0.2, 0.16], [0, 1.56, 0.05], black, 16);
      box([0.11, 0.03, 0.02], [0, 1.6, 0.2], eyeWhite);
      const nose = ball([0.05, 0.055, 0.06], [0, 1.68, 0.2], red, 12);
      parts.nose.push({ obj: nose, at: [0, 1.68, 0.2], r: 0.05 });
      eye(0.085, 1.75, 0.165, 0.042);
      ball([0.055, 0.055, 0.02], [-0.085, 1.75, 0.175], black, 12);
      s.ring(0.2, 0.012, [0, 1.76 + B, 0], black).rotation.set(Math.PI / 2, 0.25, 0);
      ball([0.36, 0.045, 0.28], [0, 1.86, 0], black, 18);
      cyl(0.15, 0.21, 0.17, [0, 1.94, 0], black);
      ball([0.05, 0.055, 0.02], [0, 1.94, 0.19], eyeWhite, 10);
      s.ring(0.2, 0.014, [0, 1.87 + B, 0], gold).rotation.x = Math.PI / 2;
      top = [0, 2.03, 0]; grip = [0.56, 1.4, 0.24];
    } else if (who === 'dinosaur') {
      const green = paint('#4fa544'), belly = paint('#eedf9a'), orange = paint('#ef7f1a'), mouth = paint('#b3262a');
      for (const side of [-1, 1]) {
        cyl(0.17, 0.15, 0.56, [side * 0.26, 0.3, 0], green);
        ball([0.18, 0.09, 0.27], [side * 0.26, 0.09, 0.12], green, 14);
        for (let k = -1; k <= 1; k++) s.mesh(new THREE.ConeGeometry(0.035, 0.1, 6), eyeWhite, [side * 0.26 + k * 0.1, 0.07 + B, 0.37]).rotation.x = Math.PI / 2;
      }
      ball([0.43, 0.6, 0.38], [0, 0.98, 0], green);
      ball([0.33, 0.48, 0.3], [0, 0.92, 0.13], belly);
      const tail: P3[] = [[0, 0.62, -0.3], [0.2, 0.44, -0.5], [0.45, 0.27, -0.55], [0.7, 0.17, -0.42], [0.88, 0.12, -0.2], [0.97, 0.1, 0.02]];
      tail.forEach((p, i) => ball([0.3 - i * 0.045, 0.3 - i * 0.045, 0.3 - i * 0.045], p, green, 14));
      ball([0.3, 0.27, 0.34], [0, 1.74, 0.1], green);
      ball([0.25, 0.17, 0.3], [0, 1.7, 0.4], green);
      const jaw = ball([0.21, 0.07, 0.27], [0, 1.5, 0.34], green, 16);
      jaw.rotation.x = 0.3;
      ball([0.19, 0.06, 0.24], [0, 1.57, 0.36], mouth, 14);
      const teeth: { at: P3; size: number }[] = [];
      for (let i = 0; i < 11; i++) {
        const t = (i / 10 - 0.5) * Math.PI * 0.95;
        teeth.push({ at: [Math.sin(t) * 0.23, 1.59 + B, 0.4 + Math.cos(t) * 0.26], size: 1 });
      }
      const fangs = s.scatter(new THREE.ConeGeometry(0.028, 0.09, 6).rotateX(Math.PI), eyeWhite, teeth);
      fangs.frustumCulled = false;
      for (const side of [-1, 1]) {
        ball([0.022, 0.022, 0.022], [side * 0.08, 1.76, 0.67], pupil, 8);
        eye(side * 0.17, 1.9, 0.26, 0.075);
        box([0.17, 0.035, 0.06], [side * 0.17, 1.985, 0.28], green).rotation.z = side * -0.35;
      }
      const snout = ball([0.13, 0.07, 0.08], [0, 1.77, 0.63], green, 12);
      parts.nose.push({ obj: snout, at: [0, 1.77, 0.63], r: 0.1 });
      arm([-0.38, 1.22, 0.14], [-0.44, 1.08, 0.3], [-0.4, 1.12, 0.46], 0.055, green, green, 0.07);
      arm([0.38, 1.22, 0.14], [0.46, 1.1, 0.3], [0.44, 1.2, 0.46], 0.055, green, green, 0.07);
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        s.mesh(new THREE.ConeGeometry(0.07, 0.19, 4), orange, [0, 1.98 - t * 1.05 + B + (i === 0 ? -0.02 : 0), -0.02 - Math.sin(t * Math.PI * 0.75) * 0.36 - (i === 0 ? 0.06 : 0)]).rotation.x = -0.5 - t * 0.9;
      }
      top = [0, 2.0, 0.12]; grip = [0.44, 1.2, 0.46]; spare = 0;
    } else if (who === 'gorilla') {
      const fur = paint('#34302f'), hide = paint('#6e6663'), red = paint('#b3262a');
      for (const side of [-1, 1]) {
        cyl(0.18, 0.16, 0.46, [side * 0.27, 0.24, 0], fur);
        ball([0.17, 0.08, 0.24], [side * 0.27, 0.08, 0.1], hide, 14);
      }
      ball([0.52, 0.56, 0.4], [0, 1.02, 0], fur);
      ball([0.37, 0.3, 0.2], [0, 1.14, 0.24], hide);
      ball([0.3, 0.24, 0.2], [0, 0.8, 0.22], fur);
      ball([0.25, 0.27, 0.25], [0, 1.64, 0.12], fur);
      ball([0.16, 0.16, 0.18], [0, 1.86, 0.04], fur, 14);
      ball([0.18, 0.2, 0.13], [0, 1.59, 0.28], hide, 16);
      box([0.32, 0.06, 0.09], [0, 1.71, 0.31], fur);
      eye(-0.075, 1.65, 0.37, 0.034);
      eye(0.075, 1.65, 0.37, 0.034);
      const nose = ball([0.07, 0.045, 0.045], [0, 1.57, 0.41], fur, 12);
      parts.nose.push({ obj: nose, at: [0, 1.57, 0.41], r: 0.06 });
      box([0.17, 0.05, 0.025], [0, 1.48, 0.385], red);
      box([0.15, 0.028, 0.03], [0, 1.485, 0.39], eyeWhite);
      arm([-0.5, 1.32, 0], [-0.76, 0.86, 0.1], [-0.64, 0.14, 0.32], 0.14, fur, hide, 0.15);
      arm([0.5, 1.32, 0], [0.82, 1.36, 0.08], [0.76, 1.86, 0.2], 0.14, fur, hide, 0.15);
      top = [0, 2.0, 0.04]; grip = [0.76, 1.86, 0.2]; spare = 0;
    } else if (who === 'mermaid') {
      const skin = paint('#f0b48e'), teal = paint('#1f9d93'), hair = paint(mood.warmth > 0.5 ? '#d9432a' : '#f0c53c'), shell = paint('#e8669a'), stone = paint('#8d8f8a');
      ball([0.55, 0.36, 0.45], [0, 0.3, -0.05], stone, 9);
      ball([0.32, 0.25, 0.3], [0.38, 0.2, 0.25], stone, 7);
      ball([0.26, 0.2, 0.25], [-0.42, 0.14, -0.2], stone, 7);
      const tail: P3[] = [[0, 0.78, 0.05], [-0.03, 0.74, 0.25], [-0.1, 0.62, 0.42], [-0.22, 0.46, 0.52], [-0.36, 0.3, 0.55], [-0.5, 0.18, 0.5], [-0.62, 0.12, 0.4]];
      tail.forEach((p, i) => ball([0.22 - i * 0.024, 0.2 - i * 0.021, 0.22 - i * 0.024], p, teal, 14));
      for (const side of [-1, 1]) {
        const fin = ball([0.2, 0.03, 0.09], [-0.72 + side * 0.02, 0.2 + side * 0.07, 0.33 + side * 0.1], paint('#39c0ae'), 12);
        fin.rotation.set(0.3, side * 0.7 + 0.5, 0.7 + side * 0.5);
      }
      ball([0.19, 0.3, 0.14], [0, 1.05, 0], skin);
      for (const side of [-1, 1]) ball([0.075, 0.075, 0.06], [side * 0.085, 1.14, 0.11], shell, 12);
      cyl(0.06, 0.07, 0.12, [0, 1.36, 0], skin, 12);
      ball([0.17, 0.18, 0.17], [0, 1.53, 0.02], skin);
      ball([0.2, 0.19, 0.19], [0, 1.58, -0.045], hair);
      ball([0.21, 0.5, 0.1], [0, 1.2, -0.15], hair);
      for (const side of [-1, 1]) ball([0.06, 0.3, 0.08], [side * 0.18, 1.36, 0.02], hair, 12);
      eye(-0.065, 1.55, 0.16, 0.034);
      eye(0.065, 1.55, 0.16, 0.034);
      const nose = ball([0.025, 0.03, 0.03], [0, 1.49, 0.185], skin, 8);
      parts.nose.push({ obj: nose, at: [0, 1.49, 0.185], r: 0.035 });
      box([0.07, 0.022, 0.02], [0, 1.43, 0.165], paint('#c92f2a'));
      ball([0.05, 0.05, 0.02], [0.13, 1.7, 0.1], paint('#f2b90f'), 5);
      arm([-0.2, 1.24, 0], [-0.38, 1.0, 0.05], [-0.42, 0.74, 0.16], 0.05, skin, skin, 0.06);
      arm([0.2, 1.24, 0], [0.42, 1.22, 0.08], [0.48, 1.56, 0.14], 0.05, skin, skin, 0.06);
      top = [0, 1.78, -0.03]; grip = [0.48, 1.56, 0.14];
    } else {
      const face = paint('#f4efe2'), red = paint('#d8261f'), blue = paint('#2c6fd0'), yellow = paint('#f2b90f'), hair = paint(mood.cheer > 0.5 ? '#ef7f1a' : '#3fa34a');
      for (let i = 0; i < 12; i++) {
        const t = i / 12 * Math.PI * 2;
        const wedge = s.mesh(new THREE.ConeGeometry(0.2, 0.42, 4), i % 2 ? yellow : blue, [Math.sin(t) * 0.52, 0.12 + B, Math.cos(t) * 0.5]);
        wedge.rotation.set(Math.PI / 2, 0, -t, 'YXZ');
        wedge.rotation.y = t;
        wedge.rotation.z = 0;
      }
      cyl(0.5, 0.56, 0.16, [0, 0.08, 0], blue, 24);
      ball([0.64, 0.7, 0.6], [0, 0.86, 0], face, 28);
      const lips = s.ring(0.25, 0.07, [0, 0.52 + B, 0.5], red);
      lips.rotation.x = -0.35;
      lips.scale.set(1.15, 0.9, 1);
      const gullet = cyl(0.25, 0.25, 0.3, [0, 0.52, 0.38], raw('#190d0e', 0.9), 24);
      gullet.rotation.x = Math.PI / 2 - 0.35;
      gullet.scale.set(1.15, 1, 0.9);
      const tongue = box([0.34, 0.035, 0.5], [0, 0.24, 0.62], red);
      tongue.rotation.x = 0.52;
      ball([0.045, 0.045, 0.045], [(random() - 0.5) * 0.14, 0.3, 0.6], raw('#f4c20d', 0.35), 12);
      const nose = ball([0.12, 0.12, 0.12], [0, 0.98, 0.62], red, 16);
      parts.nose.push({ obj: nose, at: [0, 0.98, 0.62], r: 0.12 });
      for (const side of [-1, 1]) {
        box([0.035, 0.34, 0.02], [side * 0.23, 1.17, 0.535], blue).rotation.x = -0.3;
        eye(side * 0.23, 1.17, 0.5, 0.085);
        ball([0.2, 0.3, 0.02], [side * 0.3, 0.72, 0.5], paint('#f6a8b4'), 12).visible = false;
        ball([0.1, 0.1, 0.03], [side * 0.36, 0.8, 0.5], paint('#f08a9c'), 12).rotation.y = side * 0.6;
        for (const [dy, dz, r] of [[0.0, 0, 0.2], [0.22, -0.05, 0.17], [-0.14, 0.12, 0.15]] as const) ball([r, r, r], [side * (0.64 + r * 0.3), 1.02 + dy, dz], hair, 12);
        arm([side * 0.5, 0.2, 0.15], [side * 0.72, 0.3, 0.3], [side * 0.84, 0.62, 0.36], 0.06, yellow, face, 0.12);
      }
      const hat = s.mesh(new THREE.ConeGeometry(0.2, 0.5, 20), blue, [0.14, 1.72 + B, 0]);
      hat.rotation.z = -0.25;
      ball([0.07, 0.07, 0.07], [0.215, 1.98, 0], yellow, 10);
      s.ring(0.19, 0.035, [0.08, 1.5 + B, 0], yellow).rotation.set(Math.PI / 2, -0.25, 0);
      top = [-0.24, 1.47, 0.08]; grip = [0.84, 0.62, 0.36]; spare = 0;
    }

    // Damage: something has come off and nobody ordered the replacement.
    const gone = a.missing === 'head' ? null : a.missing === 'nothing' ? null : parts[a.missing][a.missing === 'hand' ? spare : Math.floor(random() * parts[a.missing].length)];
    if (gone) {
      gone.obj.visible = false;
      const [x, y, z] = gone.at;
      if (a.missing === 'hand') {
        ball([gone.r * 0.75, gone.r * 0.5, gone.r * 0.75], [x, y, z], glass, 8);
        rod([x, y, z], [x + (random() - 0.5) * 0.1, y + 0.1 + (who === 'pirate' ? -0.25 : 0.06), z + 0.08], 0.012, rebar);
        rod([x, y, z], [x + 0.06, y + (who === 'pirate' ? -0.14 : 0.1), z - 0.03], 0.01, rebar);
      } else if (a.missing === 'eye') ball([gone.r * 0.9, gone.r * 0.9, gone.r * 0.5], [x, y, z], raw('#1a1414', 1), 10);
      else ball([gone.r * 0.9, gone.r * 0.9, gone.r * 0.35], [x, y, z - gone.r * 0.35], glass, 7);
    }
    if (a.missing === 'head') {
      const filler = raw('#b9b4a4', 1);
      const [x, y, z] = top;
      for (let i = 0; i < 5; i++) ball([0.11 + random() * 0.06, 0.07 + random() * 0.04, 0.11 + random() * 0.06], [x - 0.12 + (random() - 0.5) * 0.14, y - 0.14 - random() * 0.12, z + 0.06 + random() * 0.1], filler, 6);
      rod([x - 0.14, y - 0.1, z + 0.05], [x - 0.2, y + 0.08, z + 0.1], 0.012, rebar);
    }
    const scabs: { at: P3; size: number }[] = [];
    for (let i = 0; i < Math.round(mood.wear * 14); i++) {
      const skin = skins[Math.floor(random() * skins.length)];
      const t = random() * Math.PI * 2, u = (random() - 0.35) * 1.4;
      const flat = Math.cos(u);
      scabs.push({ at: [skin.c[0] + Math.sin(t) * flat * skin.r[0] * 0.97, skin.c[1] + Math.sin(u) * skin.r[1] * 0.97, skin.c[2] + Math.abs(Math.cos(t)) * flat * skin.r[2] * 0.97], size: 0.5 + random() });
    }
    if (scabs.length) s.scatter(new THREE.IcosahedronGeometry(0.036, 0), raw('#77756c', 1), scabs);

    // What it holds, in the hand that is always still attached.
    const [gx, gy0, gz] = grip;
    const gy = gy0 + B;
    if (a.holds === 'putter') {
      s.rod([gx + 0.06, gy - 0.75, gz + 0.3], [gx - 0.02, gy + 0.3, gz - 0.06], 0.014, raw('#b9bfc0', 0.3));
      s.rod([gx - 0.005, gy + 0.08, gz - 0.02], [gx - 0.02, gy + 0.32, gz - 0.06], 0.026, raw('#d8322b', 0.8));
      s.box([0.05, 0.05, 0.16], [gx + 0.06, gy - 0.76, gz + 0.36], raw('#1c1f22'));
    } else if (a.holds === 'flag') {
      s.rod([gx, gy - 0.5, gz], [gx, gy + 0.95, gz], 0.014, raw('#f1ece0', 0.5));
      const n = 1 + Math.floor(random() * 18);
      s.label(String(n), 0.36, 0.25, [gx + 0.19, gy + 0.8, gz], '#fdf6dc', '#d8261f');
    } else if (a.holds === 'cone') {
      s.mesh(new THREE.ConeGeometry(0.13, 0.42, 14).rotateX(Math.PI), raw('#d9a45a', 0.8), [gx, gy + 0.06, gz]);
      s.ball([0.15, 0.13, 0.15], [gx, gy + 0.3, gz], raw('#fbf3df', 0.5), 14);
      s.ball([0.11, 0.11, 0.11], [gx, gy + 0.42, gz], raw('#f6a8b4', 0.5), 14);
      s.rod([gx + 0.04, gy + 0.4, gz + 0.04], [gx + 0.13, gy + 0.62, gz + 0.08], 0.022, raw('#5a3320', 0.8));
    } else if (a.holds === 'sword') {
      const blade = s.box([0.03, 0.78, 0.11], [gx + 0.07, gy + 0.46, gz], raw('#c9cdd0', 0.3));
      blade.rotation.z = -0.18;
      s.box([0.05, 0.05, 0.24], [gx, gy + 0.09, gz], raw('#e3b23a', 0.4));
      s.rod([gx - 0.02, gy - 0.1, gz], [gx, gy + 0.08, gz], 0.025, raw('#3a2a20'));
    } else if (a.holds === 'ball') {
      const dimpled = s.mesh(new THREE.IcosahedronGeometry(0.19, 2), new THREE.MeshStandardMaterial({ color: '#f7f4ea', roughness: 0.5, flatShading: true }), [gx, gy + 0.24, gz]);
      dimpled.rotation.y = random();
    }

    if (a.gull) {
      const bird = new THREE.Group();
      const white = raw('#f6f4ee', 0.7), wing = raw('#9aa2a8', 0.7), beak = raw('#f2b90f', 0.5);
      const put = (mesh: THREE.Mesh, x: number, y: number, z: number) => { mesh.position.set(x, y, z); mesh.castShadow = true; bird.add(mesh); return mesh; };
      put(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), white), 0, 0.14, 0).scale.set(0.085, 0.085, 0.16);
      put(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), wing), 0, 0.16, -0.04).scale.set(0.092, 0.06, 0.16);
      put(new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 8), white), 0, 0.25, 0.12);
      put(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 6), beak), 0, 0.245, 0.2).rotation.x = Math.PI / 2;
      for (const x of [-0.03, 0.03]) put(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 5), beak), x, 0.03, 0);
      bird.position.set(top[0], top[1] + B - 0.02, top[2]);
      bird.rotation.y = (random() - 0.5) * 2.4;
      bird.scale.setScalar(1.25);
      s.root.add(bird);
    }

    // Plinth.
    const base = s.material(new THREE.Color('#cfcabd'), { roughness: 0.95 });
    if (a.plinth === 'block') {
      s.box([1.5, B - 0.06, 1.3], [0, (B - 0.06) / 2, 0], base);
      s.box([1.36, 0.06, 1.16], [0, B - 0.03, 0], s.material(mood.cheer > 0.5 ? '#3f8fbf' : '#7f8f96'));
    } else if (a.plinth === 'drum') {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 16;
      const c = canvas.getContext('2d')!;
      const pair = mood.cheer > 0.5 ? ['#d8261f', '#f4efe2'] : ['#2c5f8f', '#e6e1d2'];
      for (let i = 0; i < 16; i++) { c.fillStyle = pair[i % 2]; c.fillRect(i * 8, 0, 8, 16); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      s.cylinder(0.7, 0.7, B, [0, B / 2, 0], new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5 + mood.wear * 0.4 }), 28);
      for (const y of [0.02, B * 0.5, B - 0.02]) s.ring(0.705, 0.02, [0, y, 0], s.material('#4a4f55', { metalness: 0.5 })).rotation.x = Math.PI / 2;
    } else if (a.plinth === 'rock') {
      const stone = s.material('#9a968a', { roughness: 1, flatShading: true });
      s.mesh(new THREE.CylinderGeometry(0.72, 0.98, B, 9, 2), stone, [0, B / 2, 0]).rotation.y = random() * 3;
      for (let i = 0; i < 6; i++) {
        const t = random() * Math.PI * 2;
        s.mesh(new THREE.IcosahedronGeometry(0.2 + random() * 0.16, 0), stone, [Math.sin(t) * 0.86, 0.1, Math.cos(t) * 0.86]).rotation.set(random() * 3, random() * 3, 0);
      }
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 64;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#d9d2c0'; c.fillRect(0, 0, 128, 64);
      for (let row = 0; row < 4; row++) for (let col = -1; col < 4; col++) {
        c.fillStyle = ['#b5523c', '#a8472f', '#c0603f', '#e9e2cf'][Math.floor(random() * (3 + mood.wear * 0.99))];
        c.fillRect(col * 32 + (row % 2) * 16 + 1, row * 16 + 1, 30, 14);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      s.box([1.4, B - 0.06, 1.2], [0, (B - 0.06) / 2, 0], new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }));
      s.box([1.52, 0.06, 1.32], [0, B - 0.03, 0], base);
    }
    if (a.sign !== 'none') {
      const text = a.sign === 'name' ? NAMES[who] : a.sign === 'climb' ? 'DO NOT CLIMB' : 'PHOTOS 50p';
      const front = a.plinth === 'drum' ? 0.72 : a.plinth === 'rock' ? 1.0 : a.plinth === 'brick' ? 0.61 : 0.66;
      const plate = s.label(text, 0.9, 0.2, [0, Math.min(B * 0.5, 0.24), front], a.sign === 'climb' ? '#c21f1a' : '#1d2f4a', '#f4efdf');
      plate.rotation.z = (random() - 0.5) * 0.08 * (1 + mood.wear * 2);
      if (a.plinth === 'rock') { plate.position.y = 0.3; s.rod([0, 0, front - 0.02], [0, 0.3, front - 0.02], 0.02, base); }
    }

    return s.finish();
  },
});
