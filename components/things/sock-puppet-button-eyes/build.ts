import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    sock: choice('What kind of sock was it?', {
      workwear: 'A grey marled work sock with a red heel and cream cuff, the classic sock-monkey sock.',
      stripes: 'Bold rainbow stripes.',
      argyle: 'A green and navy argyle dress sock, somebody\'s father\'s.',
      dots: 'Yellow with big red polka dots.',
      sports: 'A white tube sock, greyed, with two blue bands at the cuff.',
      fuzzy: 'A fluffy neon pink bed sock.',
      black: 'A plain black office sock gone thin.',
    }),
    eyes: choice('What are its eyes?', {
      buttons: 'Two mismatched buttons, one big, one small, different colours.',
      googly: 'Stick-on googly eyes pointing different ways.',
      crosses: 'Two stitched black crosses, cartoon dead.',
      missing: 'One button; the other has fallen off and left its threads.',
      pompoms: 'White pom-poms with felt dots, on stalks.',
    }),
    mouth: choice('What is the mouth doing?', {
      closed: 'Closed in a flat line, the tip of the felt tongue just showing.',
      open: 'Wide open mid-sentence, red felt inside, tongue lolling out.',
      ajar: 'Hanging slightly open.',
    }),
    hair: choice('What hair does it have?', {
      mop: 'A mop of red yarn loops.',
      braids: 'Two yellow yarn braids tied with bows.',
      tuft: 'A single wild tuft of mixed scraps standing straight up.',
      bald: 'None.',
      fringe: 'A long green wool fringe hanging over the eyes.',
    }),
    pose: choice('How does it sit, and what does that say?', {
      perky: 'Bolt upright and facing front, eager, ready to speak.',
      slump: 'Folded forward with its head hanging, dejected, nobody inside.',
      tilt: 'Head cocked to one side, listening, a question.',
      up: 'Head thrown back, looking up, singing or howling.',
    }),
    prop: choice('What is it propped on?', {
      bottle: 'A green glass bottle.',
      form: 'A wooden glove-maker\'s hand form on a base.',
      mug: 'A wooden spoon standing in a mug.',
      jar: 'A jam jar of pencils and brushes.',
    }),
    maker: choice('Who made it?', {
      child: 'A child: glue blobs, pipe-cleaner arms, star stickers, nothing symmetrical.',
      parent: 'A tired parent at midnight: safety pins, a name tape, whatever was in the drawer.',
      therapist: 'A therapist: neat, soft and safe, with a small felt heart sewn on.',
      busker: 'A street performer: a tiny top hat, a bow tie, and a tin for coins beside it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const fade = (c: string) => '#' + new THREE.Color(c).lerp(new THREE.Color('#a39c90'), mood.wear * 0.4).getHexString();

    // Knit pattern, painted once along x (for the leg) and once along y (for the snout).
    const sockTexture = (swap: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const g = canvas.getContext('2d')!;
      if (swap) { g.translate(128, 128); g.rotate(Math.PI / 2); g.translate(-128, -128); }
      const fill = (c: string, x = 0, y = 0, w = 256, h = 256) => { g.fillStyle = fade(c); g.fillRect(x, y, w, h); };
      if (a.sock === 'workwear') { fill('#8d8f90'); for (let i = 0; i < 900; i++) fill(i % 2 ? '#c9c9c4' : '#5d6062', (i * 73) % 256, (i * 131) % 256, 3, 2); }
      else if (a.sock === 'stripes') ['#d8343a', '#f08a24', '#f2cf3a', '#3fa55a', '#3a78c9', '#7a4fb3'].forEach((c, i) => { fill(c, i * 43, 0, 43, 256); });
      else if (a.sock === 'argyle') { fill('#1f5a43'); g.fillStyle = fade('#1c2a55'); for (let i = -1; i < 5; i++) for (let j = -1; j < 5; j++) { const x = i * 64 + (j % 2 ? 32 : 0), y = j * 64; g.beginPath(); g.moveTo(x + 32, y); g.lineTo(x + 64, y + 64); g.lineTo(x + 32, y + 128); g.lineTo(x, y + 64); g.fill(); } g.strokeStyle = fade('#e6dcc0'); g.lineWidth = 2; for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 128, 256); g.moveTo(i * 64, 0); g.lineTo(i * 64 - 128, 256); g.stroke(); } }
      else if (a.sock === 'dots') { fill('#f0c832'); g.fillStyle = fade('#d1332e'); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(i * 64 + (j % 2 ? 48 : 16), j * 64 + 32, 18, 0, 7); g.fill(); } }
      else if (a.sock === 'sports') fill('#e4e1d8');
      else if (a.sock === 'fuzzy') { fill('#f24c9c'); for (let i = 0; i < 700; i++) fill(i % 2 ? '#ff86c0' : '#d62f82', (i * 89) % 256, (i * 151) % 256, 4, 4); }
      else fill('#232226');
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      return texture;
    };
    const legTexture = sockTexture(false), headTexture = sockTexture(true);
    legTexture.repeat.set(1.5, 2);
    const rough = a.sock === 'fuzzy' ? 1 : 0.9;
    const legMat = new THREE.MeshStandardMaterial({ map: legTexture, roughness: rough });
    const headMat = new THREE.MeshStandardMaterial({ map: headTexture, roughness: rough });
    const cuffMat = s.material(fade({ workwear: '#e9e2cc', stripes: '#d8343a', argyle: '#1c2a55', dots: '#d1332e', sports: '#2f5fb5', fuzzy: '#ff86c0', black: '#3a393e' }[a.sock]), { roughness: 0.95 });
    const accent = s.material(fade({ workwear: '#c22b2b', stripes: '#3a78c9', argyle: '#e6dcc0', dots: '#d1332e', sports: '#2f5fb5', fuzzy: '#fff1a8', black: '#77767c' }[a.sock]), { roughness: 0.95 });
    const felt = (c: string) => s.material(fade(c), { roughness: 1 });
    const black = s.material('#17161a', { roughness: 0.6 });
    const wood = s.material('#c79a63', { roughness: 0.7 });

    // The prop.
    let y0 = 0.2;      // where the sock's cuff sits
    if (a.prop === 'bottle') {
      const glass = new THREE.MeshStandardMaterial({ color: '#2f6b3f', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.88 });
      s.lathe([[0.001, 0], [0.036, 0], [0.038, 0.012], [0.038, 0.15], [0.03, 0.185], [0.015, 0.215], [0.013, 0.3]], glass);
      s.label('1987', 0.05, 0.05, [0, 0.08, 0.0385], '#5a1f1f', '#eadfc2');
      y0 = 0.19;
    } else if (a.prop === 'form') {
      s.box([0.13, 0.025, 0.1], [0, 0.0125, 0], wood);
      s.cylinder(0.016, 0.02, 0.1, [0, 0.07, 0], wood, 12);
      s.box([0.062, 0.14, 0.022], [0, 0.18, 0], wood);
      s.rod([-0.03, 0.14, 0], [-0.062, 0.2, 0], 0.011, wood);
      y0 = 0.15;
    } else if (a.prop === 'mug') {
      const glaze = s.material(mood.cheer > 0.5 ? '#e9b53a' : '#5a7a8c', { roughness: 0.3 });
      s.lathe([[0.001, 0], [0.04, 0], [0.043, 0.01], [0.043, 0.095], [0.039, 0.095], [0.037, 0.012]], new THREE.MeshStandardMaterial({ color: glaze.color, roughness: 0.3, side: THREE.DoubleSide }));
      const handle = s.ring(0.026, 0.007, [0.05, 0.05, 0], glaze, Math.PI); handle.rotation.z = -Math.PI / 2;
      s.rod([0, 0.01, 0], [0, 0.26, 0], 0.007, wood);
      y0 = 0.14;
    } else {
      const glass = new THREE.MeshStandardMaterial({ color: '#cfe3e0', roughness: 0.1, transparent: true, opacity: 0.45 });
      s.lathe([[0.001, 0], [0.04, 0], [0.042, 0.01], [0.042, 0.1], [0.036, 0.11], [0.036, 0.125]], glass);
      const pens = ['#d8343a', '#f2cf3a', '#3a78c9', '#3fa55a', '#17161a'];
      for (let i = 0; i < 5; i++) { const t = i * 1.4 + random(); s.rod([Math.cos(t) * 0.02, 0.01, Math.sin(t) * 0.02 - 0.008], [Math.cos(t) * 0.05, 0.17 + random() * 0.04, Math.sin(t) * 0.04 - 0.02], 0.0045, s.material(pens[i])); }
      s.rod([0, 0.01, 0.01], [0, 0.26, 0.01], 0.006, wood);
      y0 = 0.15;
    }

    // The sock: leg, then head.
    const pose = a.pose;
    const lean = pose === 'slump' ? 1 : 0;
    const neck: P3[] = lean
      ? [[0, y0, 0], [0, y0 + 0.06, 0], [0, y0 + 0.11, 0.012], [0, y0 + 0.135, 0.05], [0, y0 + 0.12, 0.085]]
      : [[0, y0, 0], [0, y0 + 0.06, 0], [0, y0 + 0.12, 0.002], [0, y0 + 0.16, 0.012]];
    const r = 0.04;
    s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(neck.map((p) => new THREE.Vector3(...p))), 24, r, 16), legMat);
    for (let k = 0; k < 3; k++) s.ring(r + 0.004 - k * 0.001, 0.0075, [0, y0 - 0.004 + k * 0.012, 0], cuffMat).rotation.x = Math.PI / 2;
    if (a.sock === 'sports') for (const k of [0, 1]) s.ring(r + 0.0015, 0.006, [0, y0 + 0.045 + k * 0.02, 0], accent).rotation.x = Math.PI / 2;
    // Slack sock hanging below the cuff over the prop.
    s.mesh(new THREE.CylinderGeometry(r * 0.96, r * (0.85 + random() * 0.2), 0.05, 16, 1, true), new THREE.MeshStandardMaterial({ map: legTexture, roughness: rough, side: THREE.DoubleSide }), [0, y0 - 0.03, 0]);

    const head = new THREE.Group();
    head.position.set(...neck[neck.length - 1]);
    s.root.add(head);
    head.scale.setScalar(1.3);
    const H = <T extends THREE.Object3D>(o: T) => { head.add(o); return o; };
    const snoutGeo = () => { const geo = new THREE.SphereGeometry(1, 24, 16); geo.rotateX(Math.PI / 2); return geo; };
    H(s.ball([0.046, 0.046, 0.046], [0, 0.006, 0], headMat, 18));
    const upper = H(s.mesh(snoutGeo(), headMat, [0, 0.014, 0.048]));
    upper.scale.set(0.047, 0.03, 0.072);
    const openAngle = { closed: 0.04, ajar: 0.3, open: 0.72 }[a.mouth] + (pose === 'up' ? 0.12 : 0);
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.004, -0.006);
    jaw.rotation.x = openAngle;
    head.add(jaw);
    const J = <T extends THREE.Object3D>(o: T) => { jaw.add(o); return o; };
    const lower = J(s.mesh(snoutGeo(), headMat, [0, -0.014, 0.05]));
    lower.scale.set(0.043, 0.021, 0.064);
    const mouthFelt = felt('#b3222e');
    H(s.ball([0.039, 0.004, 0.06], [0, 0.0, 0.052], mouthFelt, 14));
    J(s.ball([0.036, 0.004, 0.054], [0, -0.004, 0.052], mouthFelt, 14));
    if (a.sock === 'workwear') { H(s.ball([0.03, 0.022, 0.03], [0, 0.02, 0.098], accent, 12)); }
    const tongueOut = a.mouth === 'closed' ? 0.012 : a.mouth === 'ajar' ? 0.03 : 0.055;
    const tongue = J(s.ball([0.017, 0.004, 0.034], [0.004, 0.002, 0.09 + tongueOut - 0.03], felt('#f08aa0'), 12));
    tongue.rotation.x = a.mouth === 'open' ? 0.45 : 0.1;
    if (a.mouth !== 'closed') J(s.rod([0.004, 0.006, 0.05], [0.004, 0.006, 0.1 + tongueOut - 0.03], 0.001, felt('#c25a74')));

    // Eyes, on top of the snout.
    const pupils: THREE.Object3D[] = [];
    const child = a.maker === 'child', neat = a.maker === 'therapist';
    const eyeAt = (side: number): P3 => [side * (0.021 + (child ? random() * 0.008 : 0)), 0.04 + (child ? (random() - 0.5) * 0.012 : 0), 0.045 + (child ? (random() - 0.5) * 0.014 : 0)];
    const disc = (at: P3, radius: number, mat: THREE.Material, thick = 0.005) => { const d = H(s.cylinder(radius, radius, thick, at, mat, 16)); d.rotation.x = 0.85; return d; };
    const buttons = ['#2f5fb5', '#d1332e', '#f0ead8', '#1f1e22', '#3fa55a', '#e9a23a', '#7a4fb3'];
    const pick = () => buttons[Math.floor(random() * buttons.length)];
    for (const side of [-1, 1]) {
      const at = eyeAt(side);
      const fwd = (d: number): P3 => [at[0], at[1] + d * 0.66, at[2] + d * 0.75];
      if (a.eyes === 'buttons' || (a.eyes === 'missing' && side === -1)) {
        const big = neat ? 0.014 : side === -1 ? 0.018 : 0.011;
        const mat = s.material(pick(), { roughness: 0.3 });
        disc(at, big, mat);
        const rim = H(s.ring(big * 0.86, 0.0018, fwd(0.003), mat)); rim.rotation.x = 0.85 - Math.PI / 2;
        for (const [hx, hy] of [[-1, -1], [1, 1], [-1, 1], [1, -1]] as const) H(s.ball([0.0022, 0.0022, 0.0022], [at[0] + hx * big * 0.28, at[1] + 0.003 + hy * big * 0.2, at[2] + 0.003 - hy * big * 0.2], black, 6));
      } else if (a.eyes === 'missing') {
        for (let k = 0; k < 4; k++) H(s.rod(at, [at[0] + (random() - 0.5) * 0.03, at[1] + random() * 0.03, at[2] + random() * 0.03], 0.0009, black));
        H(s.ball([0.006, 0.003, 0.006], at, felt('#5a5650'), 8));
      } else if (a.eyes === 'googly') {
        const big = side === -1 ? 0.019 : 0.015;
        disc(at, big, s.material('#f8f6f0', { roughness: 0.2 }), 0.006);
        const t = random() * 6.3;
        const pupil = disc([at[0] + Math.cos(t) * big * 0.4, at[1] + 0.003 + Math.sin(t) * big * 0.3, at[2] + 0.0034 - Math.sin(t) * big * 0.3], big * 0.5, black, 0.004);
        pupil.userData = { c: fwd(0.0045), big, t };
        pupils.push(pupil);
      } else if (a.eyes === 'crosses') {
        for (const d of [-1, 1]) H(s.rod([at[0] - 0.011, at[1] + d * 0.008, at[2] - d * 0.008], [at[0] + 0.011, at[1] - d * 0.008, at[2] + d * 0.008], 0.0022, black));
      } else {
        const tip: P3 = [at[0] * 1.3, at[1] + 0.03, at[2] + 0.004];
        H(s.rod([at[0], at[1] - 0.01, at[2]], tip, 0.004, accent));
        H(s.ball([0.017, 0.017, 0.017], tip, felt('#f6f3ec'), 12));
        H(s.ball([0.007, 0.007, 0.004], [tip[0], tip[1] + 0.002, tip[2] + 0.015], black, 8));
      }
    }

    // Hair.
    const top: P3 = [0, 0.05, -0.008];
    if (a.hair === 'mop') {
      const yarn = felt('#d1402e');
      for (let i = 0; i < 16; i++) {
        const t = random() * 6.3, d = 0.01 + random() * 0.028;
        const x = Math.cos(t) * d, z = -0.012 + Math.sin(t) * d * 0.9;
        const loop = H(s.ring(0.012 + random() * 0.008, 0.0038, [x, 0.05 - d * 0.35 + 0.008, z], yarn));
        loop.rotation.set(random() * 0.8 - 0.4, t, random() * 0.8 - 0.4);
      }
    } else if (a.hair === 'braids') {
      const yarn = felt('#e9c23a');
      H(s.ball([0.04, 0.016, 0.04], [0, 0.046, -0.012], yarn, 12));
      for (const side of [-1, 1]) {
        let p: P3 = [side * 0.04, 0.03, -0.012];
        for (let k = 0; k < 6; k++) { H(s.ball([0.0105, 0.011, 0.0105], [p[0] + (k % 2 ? 0.004 : -0.004), p[1], p[2]], yarn, 8)); p = [p[0] + side * 0.003, p[1] - 0.016, p[2]]; }
        H(s.ball([0.012, 0.006, 0.006], [p[0], p[1] + 0.02, p[2] + 0.008], felt('#d1332e'), 8));
      }
    } else if (a.hair === 'tuft') {
      const scraps = ['#d1402e', '#3a78c9', '#e9c23a', '#3fa55a', '#f08aa0'];
      for (let i = 0; i < 11; i++) { const t = random() * 6.3; H(s.rod(top, [top[0] + Math.cos(t) * (0.012 + random() * 0.03), top[1] + 0.04 + random() * 0.05, top[2] + Math.sin(t) * (0.012 + random() * 0.03)], 0.0032, felt(scraps[i % 5]), 0.002)); }
    } else if (a.hair === 'fringe') {
      const yarn = felt('#3f9a5a');
      for (let i = 0; i < 13; i++) {
        const x = (i - 6) * 0.0075, len = 0.03 + random() * 0.03;
        H(s.tube([[x * 0.5, 0.05, -0.02], [x, 0.058, 0.01], [x * 1.1, 0.052, 0.04], [x * 1.15, 0.05 - len * 0.4, 0.058 + len * 0.3]], 0.0032, yarn));
      }
    }

    // What the maker added.
    if (child) {
      const pipe = felt(mood.cheer > 0.5 ? '#f08a24' : '#7a4fb3');
      const mid = y0 + 0.09;
      for (const side of [-1, 1]) s.tube([[side * 0.035, mid, 0], [side * 0.07, mid + 0.02 * side, 0.01], [side * 0.095, mid + 0.05 + random() * 0.03, 0.02], [side * 0.11, mid + 0.04, 0.03]], 0.004, pipe);
      const starMat = s.material('#f2cf3a', { metalness: 0.6, roughness: 0.3 });
      for (let i = 0; i < 5; i++) { const t = (random() - 0.5) * 2; const star = s.mesh(new THREE.CircleGeometry(0.008, 5), starMat, [Math.sin(t) * (r + 0.001), y0 + 0.03 + random() * 0.1, Math.cos(t) * (r + 0.001)]); star.rotation.y = t; }
      H(s.ball([0.007, 0.004, 0.007], [0.03, 0.03, 0.06], s.material('#f4f2e6', { roughness: 0.2 }), 8));
    } else if (a.maker === 'parent') {
      const pin = s.material('#c9ccd0', { metalness: 0.9, roughness: 0.2 });
      for (const [x, y] of [[-0.012, 0.11], [0.014, 0.06]] as const) { const p = s.ring(0.008, 0.0012, [x, y0 + y, r + 0.002], pin); p.scale.set(1, 0.35, 1); p.rotation.z = random() * 3; }
      const tape = s.label('SAM', 0.04, 0.012, [0, y0 + 0.022, r + 0.011], '#b3222e', '#f4f1e6'); tape.rotation.z = 0.08;
    } else if (neat) {
      const heart = felt('#d1334a');
      for (const side of [-1, 1]) s.ball([0.007, 0.007, 0.003], [side * 0.005, y0 + 0.1, r + 0.001], heart, 8);
      const tip = s.cylinder(0.011, 0.0005, 0.013, [0, y0 + 0.092, r + 0.001], heart, 4); tip.scale.z = 0.3;
    } else {
      const hat = black;
      H(s.cylinder(0.03, 0.03, 0.003, [0.004, 0.051, -0.014], hat, 18)).rotation.z = -0.14;
      H(s.cylinder(0.018, 0.017, 0.038, [0.007, 0.07, -0.014], hat, 18)).rotation.z = -0.14;
      H(s.cylinder(0.0178, 0.0178, 0.007, [0.005, 0.057, -0.014], felt('#b3222e'), 18)).rotation.z = -0.14;
      const bowY = neck[neck.length - 1][1] - 0.06, bowZ = neck[neck.length - 1][2] * 0.6 + r + 0.002;
      for (const side of [-1, 1]) { const wing = s.cylinder(0.014, 0.003, 0.022, [side * 0.013, bowY, bowZ], felt('#b3222e'), 4); wing.rotation.z = side * Math.PI / 2; wing.scale.z = 0.4; }
      s.ball([0.005, 0.005, 0.005], [0, bowY, bowZ], felt('#7a1418'), 8);
      const tin = s.material('#b9bcc0', { metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide });
      s.mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.045, 18, 1, true), tin, [0.12, 0.0225, 0.05]);
      s.cylinder(0.033, 0.033, 0.003, [0.12, 0.0015, 0.05], tin, 18);
      s.scatter(new THREE.CylinderGeometry(0.009, 0.009, 0.002, 10), s.material('#c9a23a', { metalness: 0.85, roughness: 0.3 }), Array.from({ length: 3 + Math.floor(random() * 4) }, () => ({ at: [0.12 + (random() - 0.5) * 0.04, 0.006 + random() * 0.01, 0.05 + (random() - 0.5) * 0.04] as P3, size: 1 })));
    }
    // Wear: a darned patch and a hole.
    if (mood.wear > 0.5) {
      const patch = s.box([0.03, 0.03, 0.002], [-0.012, y0 + 0.06, r * 0.93], felt(['#3a78c9', '#e9c23a', '#d1402e'][Math.floor(random() * 3)])); patch.rotation.set(0, -0.3, 0.2);
      for (let k = 0; k < 4; k++) s.rod([-0.03 + k * 0.009, y0 + 0.048, r * 0.97], [-0.027 + k * 0.009, y0 + 0.043, r * 0.99], 0.0008, black);
    }
    if (mood.wear > 0.75) H(s.ball([0.008, 0.006, 0.003], [-0.02, 0.012, 0.11], black, 8));

    // Pose.
    if (pose === 'slump') head.rotation.set(1.0, (random() - 0.5) * 0.3, (random() - 0.5) * 0.3);
    else if (pose === 'tilt') head.rotation.set(0.1, 0.45 * (random() < 0.5 ? -1 : 1), 0.5, 'YXZ');
    else if (pose === 'up') head.rotation.set(-0.38, (random() - 0.5) * 0.2, 0);
    else head.rotation.set(0.12, (random() - 0.5) * 0.15, 0);
    s.root.rotation.y = (random() - 0.5) * 0.3;

    const energy = mood.energy, baseX = head.rotation.x, baseJaw = jaw.rotation.x;
    return s.finish({
      update: (_dt, time) => {
        head.rotation.x = baseX + Math.sin(time * (0.8 + energy * 2.5)) * 0.03 * (0.3 + energy * 2);
        if (a.mouth === 'open') jaw.rotation.x = baseJaw - Math.abs(Math.sin(time * (2 + energy * 6))) * 0.3 * energy;
        for (const pupil of pupils) {
          const { c, big, t } = pupil.userData as { c: P3; big: number; t: number };
          const angle = t + Math.sin(time * (1 + energy * 5) + t) * (0.5 + energy * 2);
          pupil.position.set(c[0] + Math.cos(angle) * big * 0.4, c[1] + Math.sin(angle) * big * 0.3, c[2] - Math.sin(angle) * big * 0.3);
        }
      },
    });
  },
});
