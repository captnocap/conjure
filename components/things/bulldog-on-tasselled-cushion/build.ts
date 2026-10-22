import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
type P = [number, number, number];
const canvasTexture = (size: number, draw: (ctx: Ctx, w: number, h: number) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
};

const CUSHIONS = {
  oxblood: { description: 'Oxblood red velvet with gold fringe.', tint: '#6e1e24', fringe: '#c9a44a' },
  green: { description: 'Bottle green velvet with gold fringe.', tint: '#1f4a34', fringe: '#c9a44a' },
  purple: { description: 'Royal purple velvet with silver fringe.', tint: '#4a2a6a', fringe: '#d0d0d6' },
  gold: { description: 'Mustard gold velvet with brown fringe.', tint: '#b8862a', fringe: '#5a3a1a' },
  pink: { description: 'Dusty pink velvet with cream fringe.', tint: '#c87a8a', fringe: '#f0e6d0' },
  navy: { description: 'Navy velvet with red fringe.', tint: '#1e2a52', fringe: '#b8302a' },
} as const;

export default defineThing({
  questions: {
    coat: choice('What colour is the dog?', {
      brindle: 'Brindle: tiger-streaked brown and black.',
      white: 'White with a brown patch over one eye.',
      fawn: 'Fawn with a black mask on the muzzle.',
      red: 'Red-brown all over.',
      pied: 'Pied: white with big brindle patches.',
    }),
    position: choice('How is it lying?', {
      sprawled: 'Sprawled flat on its belly, back legs splayed out behind like a frog.',
      sitting: 'Sitting up on its haunches, front legs straight.',
      'over-shoulder': 'Lying down but looking back over its shoulder.',
      'belly-up': 'Flat on its back, legs in the air, head lolling.',
    }),
    state: choice('What is going on with it?', {
      guilty: 'Guilty: head low, one eye open, pretending nothing happened.',
      asleep: 'Fast asleep, both eyes shut, tongue out, snoring.',
      alert: 'Alert: head up, both eyes open, ears pricked, hoping for food.',
      innocent: 'Looking away with studied innocence after letting one go.',
    }),
    wearing: choice('What is it wearing?', {
      nothing: 'Nothing but its wrinkles.',
      collar: 'A studded leather collar with a round tag.',
      sweater: 'A striped knitted sweater.',
      bandana: 'A red spotted bandana round its neck.',
      bow: 'A ridiculous satin bow on top of its head.',
    }),
    cushion: choice('What is the cushion like?', Object.fromEntries(Object.entries(CUSHIONS).map(([key, value]) => [key, value.description])) as Record<keyof typeof CUSHIONS, string>),
    beside: choice('What lies beside the cushion?', {
      nothing: 'Nothing.',
      slipper: 'A chewed slipper.',
      ball: 'A slobbered tennis ball.',
      bowl: 'An empty food bowl licked clean.',
      bone: 'A big rawhide bone.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const cushion = CUSHIONS[a.cushion];

    // ---- The cushion: a rounded velvet slab with a hanging fringe and corner tassels.
    const CW = 0.62, CH = 0.1, CD = 0.5;
    const velvet = s.material(cushion.tint, { roughness: 1 });
    s.mesh(new RoundedBoxGeometry(CW, CH, CD, 4, 0.045), velvet, [0, CH / 2, 0]);
    const fringeMat = s.material(cushion.fringe, { roughness: 0.8 });
    const fringe: { at: P; size: number }[] = [];
    const step = 0.014;
    for (let x = -CW / 2 + 0.02; x <= CW / 2 - 0.02; x += step) for (const z of [-CD / 2, CD / 2]) fringe.push({ at: [x + rnd(-0.002, 0.002), CH * 0.38 - 0.018, z + (z > 0 ? 0.004 : -0.004)], size: 1 });
    for (let z = -CD / 2 + 0.02; z <= CD / 2 - 0.02; z += step) for (const x of [-CW / 2, CW / 2]) fringe.push({ at: [x + (x > 0 ? 0.004 : -0.004), CH * 0.38 - 0.018, z + rnd(-0.002, 0.002)], size: 1 });
    s.scatter(new THREE.CylinderGeometry(0.0025, 0.002, 0.04, 5), fringeMat, fringe);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      const tassel = s.cylinder(0.006, 0.022, 0.07, [x * (CW / 2 + 0.02), 0.03, z * (CD / 2 + 0.02)], fringeMat, 10);
      tassel.rotation.set(z * 0.3, 0, -x * 0.3);
      s.ball([0.016, 0.016, 0.016], [x * (CW / 2 + 0.01), CH * 0.6, z * (CD / 2 + 0.01)], fringeMat, 10);
    }
    // Sagging where the dog lies: a darker dent painted as a flattened disc.
    s.ball([0.2, 0.004, 0.17], [0, CH + 0.001, 0.02], s.material(new THREE.Color(cushion.tint).multiplyScalar(0.75), { roughness: 1 }), 16);

    // ---- The coat, painted.
    const base = { brindle: '#8a5a30', white: '#f2eee6', fawn: '#c9a070', red: '#a65a32', pied: '#f2eee6' }[a.coat];
    const coatMap = canvasTexture(256, (ctx, w, h) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
      if (a.coat === 'brindle' || a.coat === 'pied') {
        ctx.save();
        if (a.coat === 'pied') {
          ctx.fillStyle = '#8a5a30';
          ctx.beginPath(); ctx.ellipse(w * 0.3, h * 0.35, w * 0.22, h * 0.3, 0.4, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.ellipse(w * 0.8, h * 0.7, w * 0.2, h * 0.24, -0.3, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.ellipse(w * 0.3, h * 0.35, w * 0.22, h * 0.3, 0.4, 0, 7); ctx.ellipse(w * 0.8, h * 0.7, w * 0.2, h * 0.24, -0.3, 0, 7); ctx.clip();
        }
        ctx.strokeStyle = '#2a1a10'; ctx.lineCap = 'round';
        for (let i = 0; i < 60; i++) {
          ctx.lineWidth = 2 + random() * 5; ctx.globalAlpha = 0.5 + random() * 0.5;
          const x = random() * w, y0 = random() * h;
          ctx.beginPath(); ctx.moveTo(x, y0);
          for (let k = 1; k < 5; k++) ctx.lineTo(x + Math.sin(k * 1.3 + i) * 8, y0 + k * 12);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (a.coat === 'white') {
        ctx.fillStyle = '#6a4424';
        ctx.beginPath(); ctx.ellipse(w * 0.62, h * 0.42, w * 0.13, h * 0.16, 0.3, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(w * 0.2, h * 0.75, w * 0.1, h * 0.08, 0, 0, 7); ctx.fill();
      }
      // Fur grain.
      ctx.globalAlpha = 1;
      for (let i = 0; i < 2500; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'; ctx.fillRect(random() * w, random() * h, 1.5, 3); }
      if (mood.wear > 0.5) for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(70,50,30,${(mood.wear - 0.5) * 0.4})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 20, 14, random() * 3, 0, 7); ctx.fill(); }
    });
    const coat = new THREE.MeshStandardMaterial({ map: coatMap, roughness: 0.95 });
    const maskColour = a.coat === 'fawn' ? '#2e2420' : a.coat === 'red' ? '#5a3220' : base;
    const mask = a.coat === 'fawn' || a.coat === 'red' ? s.material(maskColour, { roughness: 0.95 }) : coat;
    const skinPink = s.material('#c98a90', { roughness: 0.8 });
    const black = s.material('#1c1a1a', { roughness: 0.45 });
    const white = s.material('#f4f2ee', { roughness: 0.5 });

    // ---- The dog, built on the cushion top. Everything hangs off a few named positions per pose.
    const dog = new THREE.Group();
    dog.position.y = CH - 0.012;
    s.root.add(dog);
    const part = (mesh: THREE.Mesh, parent: THREE.Object3D = dog) => { s.root.remove(mesh); parent.add(mesh); return mesh; };
    const ball = (size: P, at: P, material: THREE.Material, parent: THREE.Object3D = dog, segments = 18) => part(s.ball(size, at, material, segments), parent);
    const rod = (from: P, to: P, radius: number, material: THREE.Material, parent: THREE.Object3D = dog) => part(s.rod(from, to, radius, material), parent);

    const lying = a.position !== 'sitting';
    const bellyUp = a.position === 'belly-up';
    const bodyGroup = new THREE.Group();
    dog.add(bodyGroup);
    let neck: P;
    if (a.position === 'sitting') {
      ball([0.15, 0.19, 0.16], [0, 0.2, -0.06], coat, bodyGroup);
      ball([0.17, 0.15, 0.13], [0, 0.25, 0.07], coat, bodyGroup);
      for (const x of [-1, 1]) {
        rod([x * 0.1, 0.22, 0.11], [x * 0.1, 0.03, 0.14], 0.035, coat);
        ball([0.045, 0.03, 0.055], [x * 0.1, 0.028, 0.17], coat);
        ball([0.07, 0.085, 0.11], [x * 0.13, 0.085, -0.1], coat);
        ball([0.045, 0.03, 0.06], [x * 0.15, 0.028, 0.0], coat);
      }
      neck = [0, 0.33, 0.1];
    } else if (bellyUp) {
      ball([0.17, 0.13, 0.22], [0, 0.13, -0.03], coat, bodyGroup);
      ball([0.12, 0.1, 0.17], [0, 0.17, -0.02], a.coat === 'white' || a.coat === 'pied' ? coat : s.material('#e8d8c0', { roughness: 0.95 }), bodyGroup);
      ball([0.16, 0.12, 0.14], [0, 0.13, 0.1], coat, bodyGroup);
      for (const x of [-1, 1]) {
        rod([x * 0.1, 0.18, 0.1], [x * 0.14, 0.36, 0.14 + rnd(-0.03, 0.03)], 0.034, coat);
        ball([0.045, 0.055, 0.03], [x * 0.145, 0.38, 0.14], coat);
        rod([x * 0.12, 0.16, -0.14], [x * 0.19, 0.3, -0.2 + rnd(-0.03, 0.03)], 0.04, coat);
        ball([0.05, 0.05, 0.035], [x * 0.2, 0.32, -0.2], coat);
      }
      neck = [0, 0.14, 0.2];
    } else {
      ball([0.15, 0.13, 0.22], [0, 0.13, -0.05], coat, bodyGroup);
      ball([0.17, 0.14, 0.14], [0, 0.14, 0.08], coat, bodyGroup);
      for (const x of [-1, 1]) {
        rod([x * 0.1, 0.09, 0.1], [x * 0.11, 0.04, 0.34], 0.036, coat);
        ball([0.05, 0.035, 0.06], [x * 0.11, 0.03, 0.37], coat);
        ball([0.075, 0.065, 0.1], [x * 0.14, 0.07, -0.17], coat);
        rod([x * 0.14, 0.05, -0.2], [x * 0.15, 0.035, -0.33], 0.03, coat);
        ball([0.045, 0.03, 0.06], [x * 0.15, 0.028, -0.35], coat);
      }
      neck = [0, 0.2, 0.17];
    }
    const tail = part(s.ring(0.03, 0.014, [0.03, lying ? 0.17 : 0.1, lying ? -0.27 : -0.22], coat, Math.PI * 1.3));
    tail.rotation.set(0.6, 0.4, 0);

    // ---- The head: skull, muzzle, pushed-in nose, jowls, underbite, eyes and rose ears.
    const head = new THREE.Group();
    head.position.set(...neck);
    dog.add(head);
    ball([0.15, 0.125, 0.14], [0, 0.02, 0.09], coat, head);
    ball([0.1, 0.07, 0.065], [0, -0.045, 0.19], mask, head);
    ball([0.028, 0.022, 0.02], [0, -0.01, 0.245], black, head, 12);
    const jowls: THREE.Mesh[] = [];
    for (const x of [-1, 1]) {
      jowls.push(ball([0.058, 0.062, 0.05], [x * 0.075, -0.085, 0.18], mask, head));
      // Wrinkle folds over the brow.
      const fold = ball([0.06, 0.012, 0.03], [x * 0.05, 0.1, 0.17], coat, head, 10);
      fold.rotation.z = -x * 0.3;
    }
    part(s.box([0.09, 0.03, 0.04], [0, -0.1, 0.205], mask), head);
    for (let i = 0; i < 4; i++) part(s.box([0.01, 0.012, 0.006], [-0.03 + i * 0.02, -0.084, 0.226], white), head);
    const asleep = a.state === 'asleep';
    const eyeOpen = { guilty: [true, false], asleep: [false, false], alert: [true, true], innocent: [true, true] }[a.state];
    [-1, 1].forEach((x, i) => {
      if (eyeOpen[i]) {
        ball([0.024, 0.024, 0.02], [x * 0.062, 0.03, 0.2], white, head, 12);
        const pupil = ball([0.013, 0.013, 0.008], [x * 0.062 + (a.state === 'innocent' ? x * 0.006 : 0), 0.03 + (a.state === 'innocent' ? 0.008 : a.state === 'guilty' ? -0.006 : 0), 0.216], black, head, 10);
        void pupil;
      } else part(s.box([0.038, 0.005, 0.01], [x * 0.062, 0.03, 0.212], black), head);
    });
    if (asleep || a.state === 'guilty') part(s.box([0.03, 0.008, 0.045], [0.02, -0.112, 0.225], skinPink), head).rotation.x = 0.3;
    for (const x of [-1, 1]) {
      const ear = part(s.cylinder(0.002, 0.034, 0.075, [x * 0.11, 0.09, 0.03], coat, 8), head);
      ear.rotation.set(a.state === 'alert' ? -0.4 : -1.1, 0, -x * (a.state === 'alert' ? 0.5 : 1.0));
    }
    // Pose the head: low and sheepish, lolling, up and hopeful, or turned away.
    if (bellyUp) head.rotation.set(2.6, 0.3, 0.2);
    else if (a.position === 'over-shoulder') head.rotation.set(0.1, (random() < 0.5 ? -1 : 1) * 1.7, 0);
    else if (a.state === 'guilty') { head.rotation.x = 0.35; head.position.y -= 0.03; }
    else if (a.state === 'alert') head.rotation.x = -0.25;
    else if (a.state === 'innocent') head.rotation.set(-0.3, (random() < 0.5 ? -1 : 1) * 0.9, 0.15);
    else if (asleep) { head.rotation.set(0.45, 0.25, 0.3); head.position.y -= 0.04; }

    // ---- What it wears.
    const collarAt: P = lying ? [neck[0], neck[1] - 0.02, neck[2] - 0.03] : [neck[0], neck[1] - 0.03, neck[2] - 0.02];
    if (a.wearing === 'collar') {
      const leather = s.material('#4a2a1a', { roughness: 0.5 });
      const collar = part(s.ring(0.12, 0.014, collarAt, leather));
      collar.rotation.x = Math.PI / 2 + (lying ? 0.4 : 0.15);
      collar.scale.set(1.1, 1, 1);
      for (let i = 0; i < 10; i++) { const t = i / 10 * Math.PI * 2; ball([0.006, 0.006, 0.006], [collarAt[0] + Math.cos(t) * 0.132, collarAt[1] + (lying ? Math.sin(t) * 0.04 : 0), collarAt[2] + Math.sin(t) * 0.11], s.material('#d8dadc', { metalness: 0.9, roughness: 0.2 }), dog, 8); }
      part(s.cylinder(0.018, 0.018, 0.003, [collarAt[0], collarAt[1] - 0.06, collarAt[2] + 0.1], s.material('#c9a44a', { metalness: 0.8, roughness: 0.3 }), 14)).rotation.x = Math.PI / 2 - 0.4;
    } else if (a.wearing === 'sweater') {
      const stripes = canvasTexture(64, (ctx, w, h) => {
        const [c0, c1] = [['#b8302a', '#f2ead8'], ['#2a4a8a', '#e8c43a'], ['#3a7a4a', '#f2ead8'], ['#6a3a8a', '#e88aa0']][Math.floor(random() * 4)];
        ctx.fillStyle = c0; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = c1; for (let y = 0; y < h; y += 16) ctx.fillRect(0, y, w, 8);
        ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = 0; x < w; x += 4) ctx.fillRect(x, 0, 1, h);
      });
      stripes.repeat.set(3, 1);
      const knit = new THREE.MeshStandardMaterial({ map: stripes, roughness: 1 });
      const body = part(s.cylinder(lying ? 0.19 : 0.19, lying ? 0.175 : 0.17, lying ? 0.22 : 0.2, lying ? [0, 0.13, 0.0] : [0, 0.2, 0.0], knit, 24));
      body.rotation.x = lying ? Math.PI / 2 : 0.25;
      if (bellyUp) body.rotation.x = Math.PI / 2;
      part(s.cylinder(0.11, 0.13, 0.05, [collarAt[0], collarAt[1] + 0.01, collarAt[2] - 0.02], knit, 20)).rotation.x = lying ? 0.9 : 0.3;
    } else if (a.wearing === 'bandana') {
      const dots = canvasTexture(64, (ctx, w, h) => { ctx.fillStyle = '#c0282a'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#f4f0e8'; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { ctx.beginPath(); ctx.arc(i * 11 + (j % 2) * 5, j * 11, 2.2, 0, 7); ctx.fill(); } });
      const cloth = new THREE.MeshStandardMaterial({ map: dots, roughness: 0.9, side: THREE.DoubleSide });
      const shape = new THREE.Shape(); shape.moveTo(-0.11, 0); shape.lineTo(0.11, 0); shape.lineTo(0.01, -0.15); shape.closePath();
      const flag = new THREE.Mesh(new THREE.ShapeGeometry(shape), cloth);
      flag.position.set(collarAt[0], collarAt[1] - 0.01, collarAt[2] + 0.1);
      flag.rotation.x = lying ? 0.9 : 0.35;
      flag.castShadow = true;
      dog.add(flag);
      part(s.ring(0.12, 0.012, collarAt, cloth)).rotation.x = Math.PI / 2 + (lying ? 0.4 : 0.15);
    } else if (a.wearing === 'bow') {
      const satin = s.material(['#e84a8a', '#3a8ae8', '#f2d24a'][Math.floor(random() * 3)], { roughness: 0.3 });
      for (const x of [-1, 1]) { const loop = ball([0.05, 0.03, 0.025], [x * 0.045, 0.13, 0.08], satin, head, 12); loop.rotation.z = x * 0.4; }
      ball([0.02, 0.02, 0.02], [0, 0.13, 0.08], satin, head, 10);
    }

    // ---- Beside the cushion.
    const bx = (random() < 0.5 ? -1 : 1) * (CW / 2 + rnd(0.1, 0.18)), bz = rnd(-0.15, 0.15);
    if (a.beside === 'slipper') {
      const slip = s.ball([0.06, 0.035, 0.13], [bx, 0.03, bz], s.material('#8a6a9a', { roughness: 1 }), 14);
      slip.rotation.y = rnd(0, 6);
      s.ball([0.055, 0.03, 0.06], [bx, 0.045, bz + 0.03], s.material('#d8c8d8', { roughness: 1 }), 12);
    } else if (a.beside === 'ball') {
      s.ball([0.033, 0.033, 0.033], [bx, 0.033, bz], s.material('#c8d83a', { roughness: 1 }), 16);
      s.ring(0.03, 0.003, [bx, 0.033, bz], white).rotation.set(rnd(0, 3), rnd(0, 3), 0);
    } else if (a.beside === 'bowl') {
      s.lathe([[0, 0], [0.08, 0], [0.1, 0.02], [0.095, 0.05], [0.08, 0.05], [0.075, 0.015], [0, 0.012]], s.material('#c8c8cc', { metalness: 0.8, roughness: 0.3 }), [bx, 0, bz]);
    } else if (a.beside === 'bone') {
      const bone = s.material('#e8dcc0', { roughness: 0.8 });
      const turn = rnd(0, 6);
      const dx = Math.cos(turn) * 0.09, dz = Math.sin(turn) * 0.09;
      s.rod([bx - dx, 0.025, bz - dz], [bx + dx, 0.025, bz + dz], 0.018, bone);
      for (const e of [-1, 1]) for (const k of [-1, 1]) s.ball([0.028, 0.025, 0.028], [bx + e * dx + k * Math.sin(turn) * 0.022, 0.025, bz + e * dz - k * Math.cos(turn) * 0.022], bone, 12);
    }

    // ---- Breathing: slow when asleep, quicker when the room is lively; the jowls quiver with it.
    const rate = (asleep ? 0.9 : 1.6) * mix(0.7, 1.5, mood.energy);
    const phase = random() * 6;
    return s.finish({
      update(_dt, time) {
        const breath = Math.sin(time * rate + phase);
        bodyGroup.scale.set(1 + breath * 0.02, 1 + breath * 0.035, 1);
        // ball() stores the jowl's size in its scale, so quiver about that, not about 1.
        for (const jowl of jowls) jowl.scale.y = 0.062 * (1 + Math.max(0, -breath) * 0.08);
      },
    });
  },
});
