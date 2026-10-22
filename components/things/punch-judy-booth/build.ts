import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const STRIPES = {
  'red-white': 'Classic red and white, a stick of rock.',
  'blue-white': 'Blue and white deckchair canvas.',
  'yellow-red': 'Mustard yellow and red, fairground loud.',
  'green-cream': 'Bottle green and cream, an Edwardian promenade.',
  'black-white': 'Black and white, a funeral for a joke.',
  'pink-mint': 'Candy pink and mint, ice-cream parlour sweet.',
} as const;
const STRIPE_COLOURS: Record<keyof typeof STRIPES, [string, string]> = {
  'red-white': ['#c8262b', '#f3eee0'], 'blue-white': ['#2c5fae', '#f1efe6'], 'yellow-red': ['#e0aa22', '#b8302a'],
  'green-cream': ['#256b4a', '#efe4c4'], 'black-white': ['#1e1d20', '#ecebe6'], 'pink-mint': ['#ee8fae', '#b9e6cf'],
};
const BANNERS = {
  punch: 'PUNCH & JUDY', way: "THAT'S THE WAY TO DO IT", professor: 'PROF. BONES', times: 'SHOWS 11 · 2 · 4', closed: 'CLOSED', blank: '',
} as const;

export default defineThing({
  questions: {
    stripes: choice('What colours are the canvas stripes?', STRIPES),
    cast: choice('Who is up on the playboard?', {
      punch: 'Punch alone with his slapstick, owning the stage.',
      'punch-judy': 'Punch and Judy side by side, mid-quarrel.',
      crocodile: 'The green crocodile with a string of sausages in its jaws, Punch recoiling.',
      policeman: 'The policeman in his tall helmet come to arrest Punch.',
      nobody: 'Nobody: an empty stage with the slapstick left lying on the board.',
    }),
    expression: choice("What is Punch's expression, if he is up?", {
      grin: 'His fixed wide grin, stick at rest on his shoulder.',
      rage: 'Furious, brows down, stick raised high to strike.',
      sly: 'Turned side-on, leaning out over the board to confide in the audience.',
      shock: 'Mouth a round O, both arms thrown up.',
    }),
    banner: choice('What does the banner over the stage say?', {
      punch: 'PUNCH & JUDY', way: "THAT'S THE WAY TO DO IT", professor: 'PROF. BONES', times: 'Show times: 11, 2 and 4', closed: 'CLOSED', blank: 'Nothing: a bare painted board.',
    }),
    state: choice('What state is the booth in?', {
      show: 'Mid-show: standing square, bunting up, puppets alive.',
      waiting: 'Set up and waiting, stage curtains half drawn across the opening.',
      winter: 'Shut for winter: the stage laced closed with a canvas flap and rope wound round the booth.',
      storm: 'Storm-battered: leaning, canvas torn away in strips to show the timber frame, puppets slumped.',
    }),
    front: choice('What stands in front of it?', {
      nothing: 'Nothing.',
      bottle: 'An upturned hat for coins on the ground.',
      board: 'A small A-frame chalkboard.',
      deckchairs: 'Two tiny striped deckchairs for the audience.',
      sand: 'A drift of beach sand with a bucket and spade.',
    }),
    top: choice('How does the booth finish at the top?', {
      pediment: 'A flat cap with an arched painted pediment.',
      tent: 'A striped pyramid tent roof with a ball finial.',
      flag: 'A flat top with a pennant flag on a pole.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.96, D = 0.9, N = 8, sw = W / N, top = 2.15, openY0 = 1.32, openY1 = 1.88;
    const storm = a.state === 'storm', winter = a.state === 'winter', up = a.state === 'show' || a.state === 'waiting';
    const dull = (c: string) => new THREE.Color(c).lerp(new THREE.Color('#948a7a'), mood.wear * 0.4 + (storm ? 0.12 : 0));
    const paint = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => s.material(dull(c), { roughness: 0.8, ...o });
    const [ca, cb] = STRIPE_COLOURS[a.stripes];
    const canvas = [paint(ca), paint(cb)];
    const wood = paint('#a57a4a'), gold = paint('#e3b23a', { roughness: 0.5 }), dark = paint('#1d2233'), black = paint('#191719');

    // Timber frame: always there, only seen where canvas is gone.
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.035, top, 0.035], [x * (W / 2 - 0.03), top / 2, z * (D / 2 - 0.03)], wood);
    for (const y of [0.05, openY0 - 0.03, top - 0.03]) {
      for (const z of [-1, 1]) s.box([W - 0.06, 0.03, 0.03], [0, y, z * (D / 2 - 0.03)], wood);
      for (const x of [-1, 1]) s.box([0.03, 0.03, D - 0.06], [x * (W / 2 - 0.03), y, 0], wood);
    }

    // Canvas in vertical strips, so that it can be torn away one stripe at a time.
    const strip = (side: number, i: number, y0: number, y1: number) => {
      let lo = y0, hi = y1, flap = 0;
      if (storm || mood.wear > 0.8) {
        const roll = random(), chance = storm ? 1 : 0.3;
        if (roll < 0.22 * chance) return;
        if (roll < 0.5 * chance) { lo = mix(y0, y1, 0.3 + random() * 0.5); flap = (random() - 0.5) * 0.5; }
        else if (roll < 0.6 * chance) hi = mix(y0, y1, 0.3 + random() * 0.4);
      }
      const t = (i + 0.5) * sw - W / 2, u = (i + 0.5) * (D / N) - D / 2;
      const along = side < 2 ? sw : D / N;
      const mesh = s.box(side < 2 ? [along + 0.002, hi - lo, 0.012] : [0.012, hi - lo, along + 0.002],
        side === 0 ? [t, (lo + hi) / 2, D / 2] : side === 1 ? [t, (lo + hi) / 2, -D / 2] : side === 2 ? [-W / 2, (lo + hi) / 2, u] : [W / 2, (lo + hi) / 2, u], canvas[i % 2]);
      if (flap) { if (side < 2) mesh.rotation.x = flap * 0.5; else mesh.rotation.z = flap * 0.5; mesh.rotation.y = flap * 0.3; }
    };
    for (let i = 0; i < N; i++) {
      for (const side of [1, 2, 3]) strip(side, i, 0.02, top);
      if (i === 0 || i === N - 1 || winter) strip(0, i, 0.02, top);
      else { strip(0, i, 0.02, openY0); strip(0, i, openY1, top); }
    }
    s.box([W - 0.03, 0.02, D - 0.03], [0, top - 0.005, 0], canvas[0]);

    // Proscenium: backcloth, gilded posts, playboard, scalloped pelmet.
    const ow = W - 2 * sw;
    if (!winter) {
      s.box([ow, openY1 - openY0, 0.01], [0, (openY0 + openY1) / 2, D / 2 - 0.3], dark);
      for (const x of [-1, 1]) s.box([0.035, openY1 - openY0 + 0.04, 0.03], [x * (ow / 2 + 0.01), (openY0 + openY1) / 2, D / 2 + 0.012], gold);
      s.box([ow + 0.06, 0.035, 0.03], [0, openY1 + 0.01, D / 2 + 0.012], gold);
      for (let i = 0; i < 7; i++) {
        const scallop = s.cylinder(ow / 14, ow / 14, 0.012, [-ow / 2 + (i + 0.5) * ow / 7, openY1 - 0.005, D / 2 + 0.02], canvas[(i + 1) % 2], 14);
        scallop.rotation.x = Math.PI / 2;
      }
      if (a.state === 'waiting') for (const x of [-1, 1]) {
        const curtain = paint('#7a1f2b');
        for (let k = 0; k < 4; k++) s.cylinder(0.03, 0.036, openY1 - openY0 - 0.04, [x * (ow / 2 - 0.035 - k * 0.055), (openY0 + openY1) / 2 - 0.01, D / 2 - 0.02], curtain, 8);
      }
    } else {
      // Laced flap and rope.
      const rope = paint('#c9b48a');
      for (let k = 0; k < 5; k++) {
        const y = openY0 + 0.06 + k * 0.11;
        s.rod([-0.05, y, D / 2 + 0.012], [0.05, y + 0.06, D / 2 + 0.012], 0.006, rope);
        s.rod([0.05, y, D / 2 + 0.012], [-0.05, y + 0.06, D / 2 + 0.012], 0.006, rope);
      }
      for (const y of [0.75, 0.83, 1.6]) {
        const tilt = (random() - 0.5) * 0.06;
        for (const z of [-1, 1]) s.rod([-W / 2 - 0.012, y - tilt, z * (D / 2 + 0.012)], [W / 2 + 0.012, y + tilt, z * (D / 2 + 0.012)], 0.009, rope);
        for (const x of [-1, 1]) s.rod([x * (W / 2 + 0.012), y + x * tilt, -D / 2 - 0.012], [x * (W / 2 + 0.012), y + x * tilt, D / 2 + 0.012], 0.009, rope);
      }
    }
    s.box([ow + 0.14, 0.03, 0.2], [0, openY0 - 0.005, D / 2 + 0.07], paint('#7b4b2a'));
    for (const x of [-1, 1]) s.rod([x * ow / 2, openY0 - 0.02, D / 2 + 0.15], [x * ow / 2, openY0 - 0.2, D / 2 + 0.01], 0.012, wood);

    // Top.
    const text = BANNERS[a.banner];
    const boardY = a.top === 'pediment' ? top + 0.1 : (openY1 + top) / 2 + 0.01;
    if (a.top === 'pediment') {
      s.box([W + 0.08, 0.22, 0.03], [0, boardY, D / 2 + 0.005], gold);
      const arch = s.cylinder(0.3, 0.3, 0.03, [0, top + 0.18, D / 2 + 0.004], gold, 28);
      arch.rotation.x = Math.PI / 2; arch.scale.set(1.2, 1, 0.55);
      s.ball([0.05, 0.05, 0.05], [0, top + 0.37, D / 2], paint(ca), 12);
    } else if (a.top === 'tent') {
      const roof = s.mesh(new THREE.ConeGeometry(W * 0.74, 0.5, 4, 1), canvas[0], [0, top + 0.25, 0]);
      roof.rotation.y = Math.PI / 4; roof.scale.z = D / W;
      for (let k = 0; k < 8; k++) for (const z of [-1, 1]) s.cylinder(sw / 2, sw / 2, 0.014, [(k + 0.5) * sw - W / 2, top, z * (D / 2 + 0.008)], canvas[(k + 1) % 2], 12).rotation.x = Math.PI / 2;
      s.ball([0.055, 0.055, 0.055], [0, top + 0.53, 0], gold, 12);
    } else {
      s.rod([W / 2 - 0.05, top, -D / 2 + 0.05], [W / 2 - 0.05, top + 0.6, -D / 2 + 0.05], 0.012, wood);
      const flag = s.mesh(new THREE.ConeGeometry(0.09, 0.34, 3, 1), paint(ca, { side: THREE.DoubleSide }), [W / 2 - 0.05 - 0.17, top + 0.5, -D / 2 + 0.05]);
      flag.rotation.z = Math.PI / 2; flag.scale.z = 0.08;
      flag.rotation.y = storm ? 0.8 : 0;
    }
    if (text) {
      const label = s.label(text, a.top === 'pediment' ? W - 0.02 : ow, a.top === 'pediment' ? 0.16 : 0.15, [0, boardY, D / 2 + 0.024], a.banner === 'closed' ? '#f3eee0' : '#7a1c1c', a.banner === 'closed' ? '#2b2a2c' : '#f1dc9a');
      if (winter || storm) label.rotation.z = (random() - 0.5) * 0.14;
    }
    if (a.state === 'show') {
      // Bunting from the top corners out to two leaning poles.
      const flagGeo = new THREE.ConeGeometry(0.045, 0.1, 3, 1);
      const flags: { at: [number, number, number]; size: number; color: string }[] = [];
      for (const x of [-1, 1]) {
        const far: [number, number, number] = [x * (W / 2 + 0.75), 1.5, D / 2 + 0.05];
        s.rod([far[0], 0, far[2]], [far[0] + x * 0.03, 1.54, far[2]], 0.012, wood);
        const pts: [number, number, number][] = [];
        for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([mix(x * W / 2, far[0], t), mix(top - 0.04, far[1], t) - Math.sin(t * Math.PI) * 0.16, far[2]]); }
        s.tube(pts, 0.004, black);
        for (let k = 1; k < 8; k++) flags.push({ at: [pts[k][0], pts[k][1] - 0.05, pts[k][2]], size: 1, color: '#' + dull([ca, cb, '#e3b23a', '#3d74c2'][k % 4]).getHexString() });
      }
      const bunting = s.scatter(flagGeo, new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), flags);
      bunting.rotation.x = 0; bunting.scale.set(1, 1, 1);
      // Flags point down: flip each instance.
      const m = new THREE.Matrix4(), flip = new THREE.Matrix4().makeRotationX(Math.PI).scale(new THREE.Vector3(1, 1, 0.1));
      flags.forEach((f, k) => { m.makeTranslation(...f.at).multiply(flip); bunting.setMatrixAt(k, m); });
      bunting.instanceMatrix.needsUpdate = true;
    }

    // Glove puppets.
    const actors: { g: THREE.Group; phase: number; y: number }[] = [];
    const base = (x: number, colour: string, skin: string) => {
      const g = new THREE.Group();
      g.position.set(x, openY0 + 0.01, D / 2 - 0.02);
      s.root.add(g);
      const add = <T extends THREE.Object3D>(o: T) => { g.add(o); return o; };
      const body = paint(colour), skinMat = paint(skin, { roughness: 0.55 });
      add(s.lathe([[0.085, -0.06], [0.075, 0.08], [0.05, 0.17], [0.001, 0.19]], body));
      add(s.ball([0.078, 0.085, 0.08], [0, 0.27, 0], skinMat, 16));
      const arm = (side: number, hand: [number, number, number]) => { add(s.rod([side * 0.05, 0.14, 0.01], hand, 0.022, body)); add(s.ball([0.024, 0.024, 0.024], hand, skinMat, 8)); };
      const eyes = (y = 0.29, r = 0.014) => { for (const e of [-1, 1]) { add(s.ball([r * 1.5, r * 1.5, r], [e * 0.032, y, 0.07], paint('#f7f3ea'), 8)); add(s.ball([r * 0.7, r * 0.7, r * 0.6], [e * 0.032, y - 0.002, 0.08], black, 6)); } };
      g.scale.setScalar(1.28);
      actors.push({ g, phase: random() * 6, y: g.position.y });
      return { g, add, body, skinMat, arm, eyes };
    };
    const punch = (x: number) => {
      const p = base(x, '#c4242b', '#eab493');
      const yellow = paint('#f0c22e');
      p.add(s.ring(0.055, 0.016, [0, 0.185, 0], yellow)).rotation.x = Math.PI / 2;
      p.add(s.ball([0.06, 0.06, 0.05], [0.02, 0.15, -0.07], p.body, 10));
      p.add(s.tube([[0, 0.285, 0.07], [0, 0.29, 0.13], [0, 0.25, 0.155], [0, 0.215, 0.14]], 0.02, paint('#d9655a')));
      p.add(s.tube([[0, 0.205, 0.05], [0, 0.19, 0.11], [0, 0.215, 0.135]], 0.017, p.skinMat));
      for (const e of [-1, 1]) p.add(s.ball([0.022, 0.02, 0.012], [e * 0.052, 0.255, 0.058], paint('#d9534a'), 8));
      p.eyes(0.3);
      p.add(s.tube([[0, 0.33, -0.01], [0, 0.42, 0.0], [0, 0.46, 0.06], [0, 0.44, 0.11]], 0.034, p.body));
      p.add(s.ring(0.07, 0.016, [0, 0.335, -0.005], yellow)).rotation.x = Math.PI / 2 - 0.15;
      p.add(s.ball([0.022, 0.022, 0.022], [0, 0.43, 0.125], yellow, 8));
      const e = a.expression;
      if (e === 'shock') p.add(s.ball([0.02, 0.026, 0.012], [0, 0.235, 0.073], black, 8));
      else { const grin = p.add(s.ring(0.034, 0.008, [0, 0.262, 0.064], paint('#7a1418'), Math.PI)); grin.rotation.z = Math.PI; grin.rotation.x = -0.2; }
      if (e === 'rage') for (const side of [-1, 1]) p.add(s.box([0.04, 0.01, 0.01], [side * 0.032, 0.318, 0.074], black)).rotation.z = -side * 0.5;
      const stickMat = paint('#d9c08a');
      const stick = (from: [number, number, number], to: [number, number, number]) => p.add(s.rod(from, to, 0.012, stickMat));
      if (storm) { p.arm(-1, [-0.09, 0.02, 0.1]); p.arm(1, [0.09, 0.02, 0.1]); p.g.rotation.x = 1.25; p.g.position.z += 0.02; p.g.position.y -= 0.02; }
      else if (e === 'rage') { p.arm(-1, [-0.11, 0.13, 0.08]); p.arm(1, [0.12, 0.3, 0.04]); stick([0.12, 0.26, 0.04], [0.16, 0.56, 0.0]); p.g.rotation.x = 0.15; }
      else if (e === 'shock') { p.arm(-1, [-0.13, 0.3, 0.03]); p.arm(1, [0.13, 0.3, 0.03]); p.g.rotation.x = -0.18; }
      else if (e === 'sly') { p.arm(-1, [-0.1, 0.1, 0.1]); p.arm(1, [0.1, 0.1, 0.1]); p.g.rotation.set(0.45, 0.7, 0); stick([0.1, 0.1, 0.1], [0.3, 0.06, 0.12]); }
      else { p.arm(-1, [-0.11, 0.12, 0.08]); p.arm(1, [0.09, 0.17, 0.06]); stick([0.09, 0.13, 0.07], [0.1, 0.4, -0.06]); }
      return p;
    };
    const judy = (x: number) => {
      const p = base(x, '#2d62a8', '#efc3a4');
      const white = paint('#f4f1e8');
      p.add(s.ball([0.095, 0.075, 0.09], [0, 0.33, -0.02], white, 14));
      p.add(s.ring(0.082, 0.014, [0, 0.3, 0.0], white)).rotation.x = Math.PI / 2 - 0.5;
      p.add(s.ring(0.05, 0.014, [0, 0.185, 0], white)).rotation.x = Math.PI / 2;
      const nose = p.add(s.cylinder(0.001, 0.018, 0.07, [0, 0.265, 0.1], p.skinMat, 8)); nose.rotation.x = Math.PI / 2 + 0.3;
      for (const e of [-1, 1]) p.add(s.ball([0.02, 0.018, 0.012], [e * 0.05, 0.25, 0.06], paint('#d9534a'), 8));
      p.eyes();
      p.add(s.box([0.04, 0.008, 0.01], [0, 0.228, 0.07], paint('#7a1418')));
      p.arm(-1, [-0.1, 0.16, 0.08]); p.arm(1, [0.1, 0.22, 0.08]);
      if (storm) { p.g.rotation.z = 1.2; p.g.position.y += 0.05; }
      return p;
    };
    const policeman = (x: number) => {
      const p = base(x, '#1d2a4d', '#e6b595');
      const navy = paint('#141d38');
      p.add(s.lathe([[0.09, 0], [0.08, 0.03], [0.07, 0.1], [0.04, 0.16], [0.001, 0.17]], navy, [0, 0.31, 0]));
      p.add(s.ball([0.02, 0.025, 0.012], [0, 0.39, 0.068], paint('#d8dadb', { metalness: 0.8, roughness: 0.3 }), 8));
      p.add(s.ball([0.014, 0.014, 0.014], [0, 0.485, 0], paint('#d8dadb', { metalness: 0.8, roughness: 0.3 }), 8));
      p.add(s.box([0.07, 0.016, 0.02], [0, 0.245, 0.075], black));
      p.add(s.ball([0.02, 0.02, 0.02], [0, 0.265, 0.082], paint('#d9655a'), 8));
      p.eyes();
      for (let k = 0; k < 3; k++) p.add(s.ball([0.01, 0.01, 0.008], [0, 0.07 + k * 0.035, 0.072 - k * 0.008], paint('#d8dadb', { metalness: 0.8 }), 6));
      p.arm(-1, [-0.1, 0.12, 0.08]); p.arm(1, [0.11, 0.25, 0.06]);
      p.add(s.rod([0.11, 0.22, 0.06], [0.14, 0.42, 0.03], 0.014, black));
      if (storm) p.g.rotation.x = 1.2;
      return p;
    };
    const crocodile = (x: number) => {
      const g = new THREE.Group();
      g.position.set(x, openY0 + 0.01, D / 2 - 0.02);
      s.root.add(g);
      const add = <T extends THREE.Object3D>(o: T) => { g.add(o); return o; };
      const green = paint('#3f8f3a'), mouth = paint('#b32d3a'), tooth = paint('#f6f1e4');
      add(s.lathe([[0.08, -0.06], [0.07, 0.1], [0.06, 0.18], [0.001, 0.2]], green));
      const jaw = (upper: boolean) => {
        const j = new THREE.Group();
        j.position.set(0, 0.17, 0.02);
        g.add(j);
        const k = (o: THREE.Mesh) => { j.add(o); return o; };
        k(s.box([0.11, 0.035, 0.3], [0, upper ? 0.018 : -0.018, 0.15], green));
        k(s.box([0.095, 0.006, 0.28], [0, upper ? -0.002 : 0.002, 0.15], mouth));
        for (let i = 0; i < 7; i++) for (const e of [-1, 1]) k(s.cylinder(upper ? 0.009 : 0.001, upper ? 0.001 : 0.009, 0.03, [e * 0.045, upper ? -0.016 : 0.016, 0.04 + i * 0.038], tooth, 5));
        if (upper) { for (const e of [-1, 1]) { k(s.ball([0.026, 0.028, 0.026], [e * 0.036, 0.05, 0.03], green, 8)); k(s.ball([0.016, 0.018, 0.012], [e * 0.036, 0.055, 0.05], paint('#f2e36a'), 8)); k(s.ball([0.006, 0.014, 0.006], [e * 0.036, 0.055, 0.061], black, 6)); } for (const e of [-1, 1]) k(s.ball([0.012, 0.01, 0.012], [e * 0.025, 0.04, 0.285], green, 6)); }
        j.rotation.x = upper ? -0.38 : 0.22;
        return j;
      };
      jaw(true); jaw(false);
      const sausage = paint('#c9785f', { roughness: 0.45 });
      const path: [number, number, number][] = [[0, 0.16, 0.2], [0.03, 0.12, 0.3], [0.06, 0.02, 0.34], [0.1, -0.08, 0.36], [0.16, -0.2, 0.37]];
      for (let i = 0; i < path.length - 1; i++) add(s.rod(path[i], path[i + 1], 0.019, sausage, 0.019));
      for (const pnt of path) add(s.ball([0.012, 0.012, 0.012], pnt, paint('#7a3a2a'), 6));
      g.rotation.y = -0.35;
      g.scale.setScalar(1.28);
      if (storm) g.rotation.x = 0.5;
      actors.push({ g, phase: random() * 6, y: g.position.y });
    };

    const stageX = ow / 2 - 0.14;
    if (!winter) {
      if (a.cast === 'punch') punch((random() - 0.5) * 0.15);
      else if (a.cast === 'punch-judy') { punch(-stageX * 0.7).g.rotation.y += 0.35; judy(stageX * 0.7).g.rotation.y -= 0.35; }
      else if (a.cast === 'crocodile') { crocodile(stageX * 0.75); punch(-stageX * 0.85).g.rotation.y += 0.3; }
      else if (a.cast === 'policeman') { punch(-stageX * 0.7).g.rotation.y += 0.35; policeman(stageX * 0.7).g.rotation.y -= 0.35; }
      else { const stick = s.rod([-0.14, openY0 + 0.022, D / 2 + 0.1], [0.16, openY0 + 0.022, D / 2 + 0.13], 0.012, paint('#d9c08a')); stick.rotation.y += 0.1; }
    }

    // What stands in front.
    const fz = D / 2 + 0.55;
    if (a.front === 'bottle') {
      s.lathe([[0.001, 0.0], [0.1, 0.0], [0.12, 0.12], [0.125, 0.13], [0.2, 0.135], [0.2, 0.14], [0.11, 0.14], [0.1, 0.02]], paint('#2a2523', { side: THREE.DoubleSide }), [0.15, 0, fz]);
      s.scatter(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 8), s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 }), Array.from({ length: 4 + Math.floor(random() * 6) }, () => ({ at: [0.15 + (random() - 0.5) * 0.5, 0.004, fz + (random() - 0.5) * 0.3] as [number, number, number], size: 1 })));
    } else if (a.front === 'board') {
      for (const z of [-1, 1]) { const b = s.box([0.4, 0.62, 0.02], [-0.45, 0.3, fz + z * 0.1], z > 0 ? black : wood); b.rotation.x = -z * 0.3; }
      const l = s.label(a.banner === 'closed' || winter ? 'NO SHOW' : 'SHOW 2PM', 0.34, 0.2, [-0.45, 0.38, fz + 0.1], '#f3eee0', '#232224'); l.rotation.x = -0.3; l.position.z += 0.0;
      l.position.set(-0.45, 0.4, fz + 0.106);
    } else if (a.front === 'deckchairs') {
      for (const x of [-0.42, 0.42]) {
        const cz = fz + 0.25, turn = (random() - 0.5) * 0.4;
        const chair = new THREE.Group(); chair.position.set(x, 0, cz); chair.rotation.y = Math.PI + turn; s.root.add(chair);
        for (const e of [-1, 1]) { chair.add(s.rod([e * 0.2, 0, -0.25], [e * 0.2, 0.55, 0.28], 0.013, wood)); chair.add(s.rod([e * 0.2, 0, 0.2], [e * 0.2, 0.4, -0.2], 0.013, wood)); }
        const sling = s.box([0.38, 0.012, 0.6], [0, 0.3, 0.06], canvas[0]); sling.rotation.x = -0.75; chair.add(sling);
        for (const e of [-1, 0, 1]) { const st = s.box([0.06, 0.014, 0.6], [e * 0.12, 0.3, 0.06], canvas[1]); st.rotation.x = -0.75; chair.add(st); }
      }
    } else if (a.front === 'sand') {
      const sand = paint('#dcc590', { roughness: 1 });
      for (let k = 0; k < 6; k++) s.ball([0.4 + random() * 0.5, 0.05 + random() * 0.06, 0.3 + random() * 0.3], [(random() - 0.5) * 1.4, 0, fz - 0.35 + (random() - 0.3) * 0.5], sand, 12);
      s.cylinder(0.11, 0.08, 0.18, [0.5, 0.13, fz + 0.05], paint('#e3b23a'), 14);
      s.rod([0.2, 0.06, fz + 0.2], [0.3, 0.5, fz + 0.12], 0.012, paint('#2c5fae'));
      s.box([0.09, 0.12, 0.012], [0.19, 0.06, fz + 0.21], paint('#2c5fae')).rotation.z = 0.2;
    }

    if (storm) s.root.rotation.z = (random() < 0.5 ? -1 : 1) * mix(0.08, 0.16, random());
    const lively = a.state === 'show' ? mix(0.3, 1.6, mood.energy) : 0;
    return s.finish({
      update: (_dt, time) => {
        if (!lively) return;
        for (const actor of actors) {
          actor.g.position.y = actor.y + Math.abs(Math.sin(time * 3 * lively + actor.phase)) * 0.025 * lively;
          actor.g.rotation.z = Math.sin(time * 2.2 * lively + actor.phase) * 0.12 * lively;
        }
      },
    });
  },
});
