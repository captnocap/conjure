import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const STRIPES = {
  'red-white': 'Classic red and white, the circus default.',
  'blue-yellow': 'Royal blue and sunflower yellow, loud and cheerful.',
  'green-cream': 'Bottle green and cream, an older, gentler fair.',
  'pink-teal': 'Bubblegum pink and teal, boardwalk candy colours.',
  'orange-black': 'Orange and black, a little menacing, late October.',
  'purple-gold': 'Purple and gold, showy and slightly crooked.',
} as const;
const STRIPE_COLOURS: Record<keyof typeof STRIPES, [string, string]> = {
  'red-white': ['#c9342f', '#f3ecdc'],
  'blue-yellow': ['#2c4fa3', '#f2c53d'],
  'green-cream': ['#2f6b4a', '#efe6c8'],
  'pink-teal': ['#e86a9a', '#3aa6a0'],
  'orange-black': ['#e2762a', '#2b2a2c'],
  'purple-gold': ['#6a3b96', '#e0b441'],
};
const SIGNS = {
  ring: 'RING TOSS',
  wins: 'EVERYONE WINS',
  price: '3 RINGS $5',
  big: 'WIN BIG',
  luck: 'TRY YOUR LUCK',
  refunds: 'NO REFUNDS',
} as const;

function stripeTexture(a: string, b: string, repeat: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 8;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, 32, 8);
  ctx.fillStyle = b;
  ctx.fillRect(32, 0, 32, 8);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, 1);
  return texture;
}

interface Blob { at: [number, number, number]; scale: [number, number, number]; color: string; turn?: [number, number, number] }

export default defineThing({
  questions: {
    stripes: choice('What colours is the canvas striped in?', STRIPES),
    state: choice('What is happening at the booth right now?', {
      busy: 'Open and lit, the rail crowded with prizes, rings all over the bottles.',
      slow: 'Open but quiet: lights on, rings stacked neatly, nobody playing.',
      closing: 'The front awning is half lowered and the bulbs are off; the last night.',
      shut: 'Canvas dropped all the way to the counter with a CLOSED card pinned to it.',
    }),
    roof: choice('What shape is the top?', {
      peak: 'A pointed pyramid tent top with a little pennant.',
      slope: 'A lean-to awning sloping down toward the players.',
      marquee: 'A flat top carrying a tall lit signboard.',
    }),
    bottles: choice('What are the bottles on the table?', {
      cola: 'Green-tinted old soda bottles.',
      milk: 'Pale frosted milk bottles.',
      amber: 'Brown beer bottles.',
      rainbow: 'A jumble of every colour of glass.',
    }),
    prizes: choice('What prizes hang from the rail?', {
      bears: 'Teddy bears in pastel colours.',
      bananas: 'Plush bananas with faces, inexplicably.',
      aliens: 'Lime-green big-eyed aliens.',
      mixed: 'A bit of everything.',
      none: 'None left: bare hooks.',
    }),
    sign: choice('What does the sign say?', SIGNS),
    littered: score('How many thrown rings are lying among the bottles?', ['None', 'A few', 'Dozens', 'The table is buried in them']),
    winner: noul('Has one ring actually landed on a bottle neck?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [c1, c2] = STRIPE_COLOURS[a.stripes];
    const W = 3.2, D = 2.4, H = 2.3;
    const open = a.state === 'busy' || a.state === 'slow';
    const fade = mood.wear * 0.35;
    const canvasMat = (repeat: number) => {
      const m = new THREE.MeshStandardMaterial({ map: stripeTexture(c1, c2, repeat), roughness: 0.9, side: THREE.DoubleSide });
      m.color.lerp(new THREE.Color('#b9b2a2'), fade);
      return m;
    };
    const wood = s.material('#8a6a48');
    const pole = s.material('#d9d4c6', { metalness: 0.3 });
    const dark = s.material('#3a3632');

    // Frame: corner poles and top rails.
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.035, 0.035, H, [x * W / 2, H / 2, z * D / 2], pole, 8);
    for (const z of [-1, 1]) s.box([W, 0.05, 0.05], [0, H, z * D / 2], pole);
    for (const x of [-1, 1]) s.box([0.05, 0.05, D], [x * W / 2, H, 0], pole);

    // Counter with striped skirt on three sides, wood top.
    const skirt = canvasMat(8);
    s.box([W + 0.1, 0.86, 0.04], [0, 0.43, D / 2], skirt);
    for (const x of [-1, 1]) s.box([0.04, 0.86, D], [x * W / 2, 0.43, 0], canvasMat(6));
    s.box([W + 0.3, 0.05, 0.32], [0, 0.89, D / 2], wood);
    for (const x of [-1, 1]) s.box([0.26, 0.05, D], [x * W / 2, 0.89, 0], wood);
    // Back wall.
    s.box([W, H, 0.03], [0, H / 2, -D / 2], canvasMat(8));

    // Roof.
    const roofMat = canvasMat(a.roof === 'peak' ? 16 : 9);
    let signY = H + 0.32, signZ = D / 2 + 0.12;
    if (a.roof === 'peak') {
      const g = new THREE.ConeGeometry(1, 1, 4, 1);
      g.rotateY(Math.PI / 4);
      const roof = s.mesh(g, roofMat, [0, H + 0.4, 0]);
      roof.scale.set((W + 0.5) / Math.SQRT2, 0.8, (D + 0.5) / Math.SQRT2);
      s.rod([0, H + 0.8, 0], [0, H + 1.3, 0], 0.012, pole);
      const flag = new THREE.Shape();
      flag.moveTo(0, 0); flag.lineTo(0.34, -0.09); flag.lineTo(0, -0.18);
      const pennant = s.mesh(new THREE.ShapeGeometry(flag), new THREE.MeshStandardMaterial({ color: c1, side: THREE.DoubleSide }), [0, H + 1.29, 0]);
      pennant.rotation.y = random() * 0.8 - 0.4;
      signY = H + 0.2;
    } else if (a.roof === 'slope') {
      const roof = s.box([W + 0.5, 0.04, D + 0.9], [0, H + 0.33, 0.1], roofMat);
      roof.rotation.x = 0.26;
      for (const x of [-1, 1]) s.rod([x * W / 2, H, -D / 2], [x * W / 2, H + 0.62, -D / 2], 0.03, pole);
      signY = H + 0.02; signZ = D / 2 + 0.52;
    } else {
      s.box([W + 0.4, 0.08, D + 0.4], [0, H + 0.07, 0], roofMat);
      s.box([W + 0.2, 0.75, 0.1], [0, H + 0.5, D / 2 + 0.05], s.material(c1));
      signY = H + 0.5; signZ = D / 2 + 0.11;
    }
    // Valance with scallops on the front and sides.
    const valance = canvasMat(10);
    if (a.roof !== 'slope') {
      s.box([W + 0.42, 0.22, 0.02], [0, H - 0.06, D / 2 + 0.2], valance);
      for (const x of [-1, 1]) s.box([0.02, 0.22, D + 0.42], [x * (W / 2 + 0.2), H - 0.06, 0], valance);
    }
    const text = SIGNS[a.sign];
    const sign = s.label(text, a.roof === 'marquee' ? W * 0.92 : W * 0.7, a.roof === 'marquee' ? 0.55 : 0.32, [0, signY, signZ + (a.roof === 'slope' ? 0 : 0.11)], c2 === '#2b2a2c' ? '#f3ecdc' : c2, c1 === '#2b2a2c' ? '#e2762a' : c1);
    if (a.roof === 'slope') sign.position.y = H - 0.02;
    const signMat = sign.material as THREE.MeshStandardMaterial;
    if (open) { signMat.emissive = new THREE.Color('#ffffff'); signMat.emissiveMap = signMat.map; signMat.emissiveIntensity = mix(0.15, 0.5, mood.cheer); }

    // Bottle table.
    s.box([2.2, 0.06, 1.3], [0, 0.6, -0.25], wood);
    s.box([2.1, 0.57, 1.2], [0, 0.29, -0.25], canvasMat(7));
    const bottleGeo = new THREE.LatheGeometry([[0, 0], [0.036, 0], [0.036, 0.12], [0.014, 0.18], [0.014, 0.232], [0.018, 0.24], [0, 0.24]].map(([x, y]) => new THREE.Vector2(x, y)), 10);
    const glassTint = { cola: ['#5fa277', '#4f946b', '#78b48a'], milk: ['#e9ece6', '#dfe6e4', '#f3f1e6'], amber: ['#8a5325', '#774319', '#9b6431'], rainbow: ['#5fa277', '#c94a3f', '#3f6fc0', '#e0b441', '#8a5325', '#e9ece6', '#9050b0'] }[a.bottles];
    const nx = 10, nz = 6, spots: [number, number][] = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (random() < mood.wear * 0.25) continue;
      spots.push([(i - (nx - 1) / 2) * 0.2 + (random() - 0.5) * 0.02, -0.25 + (j - (nz - 1) / 2) * 0.19 + (random() - 0.5) * 0.02]);
    }
    const bottles = new THREE.InstancedMesh(bottleGeo, new THREE.MeshStandardMaterial({ roughness: 0.18, metalness: 0.1 }), spots.length);
    const m4 = new THREE.Matrix4();
    spots.forEach(([x, z], i) => {
      m4.makeTranslation(x, 0.63, z);
      bottles.setMatrixAt(i, m4);
      bottles.setColorAt(i, new THREE.Color(glassTint[Math.floor(random() * glassTint.length)]));
    });
    bottles.castShadow = bottles.receiveShadow = true;
    s.root.add(bottles);

    // Rings: thrown ones among the bottles, stacks on the counter.
    const ringGeo = new THREE.TorusGeometry(0.052, 0.008, 6, 18);
    ringGeo.rotateX(Math.PI / 2);
    const ringColours = ['#e23b3b', '#f2c53d', '#3f8fd0', '#58b368', '#f08a2c'];
    const rings: { m: THREE.Matrix4; c: string }[] = [];
    const q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    const thrown = a.state === 'shut' ? 0 : Math.round(a.littered * a.littered * 70 * mix(0.6, 1.2, mood.density));
    for (let i = 0; i < thrown; i++) {
      e.set((random() - 0.5) * 0.7, random() * 3, (random() - 0.5) * 0.7);
      rings.push({ m: new THREE.Matrix4().compose(new THREE.Vector3((random() - 0.5) * 2.0, 0.645 + random() * 0.1, -0.25 + (random() - 0.5) * 1.15), q.setFromEuler(e), one), c: ringColours[Math.floor(random() * ringColours.length)] });
    }
    if (a.state !== 'shut') {
      const stacks = a.state === 'busy' ? 2 : a.state === 'slow' ? 4 : 1;
      for (let k = 0; k < stacks; k++) {
        const x = (k - (stacks - 1) / 2) * 0.55 + (random() - 0.5) * 0.2, n = 3 + Math.floor(random() * 6);
        for (let i = 0; i < n; i++) rings.push({ m: new THREE.Matrix4().makeTranslation(x + (random() - 0.5) * 0.012, 0.925 + i * 0.016, D / 2 + 0.02), c: ringColours[(k + i) % ringColours.length] });
      }
    }
    if (rings.length) {
      const mesh = new THREE.InstancedMesh(ringGeo, new THREE.MeshStandardMaterial({ roughness: 0.5 }), rings.length);
      rings.forEach((r, i) => { mesh.setMatrixAt(i, r.m); mesh.setColorAt(i, new THREE.Color(r.c)); });
      mesh.castShadow = true;
      s.root.add(mesh);
    }
    if (a.winner && spots.length && a.state !== 'shut') {
      const [x, z] = spots[Math.floor(random() * spots.length)];
      const win = s.mesh(ringGeo.clone(), new THREE.MeshStandardMaterial({ color: '#ffd23a', emissive: '#ffb400', emissiveIntensity: 0.9 }), [x, 0.63 + 0.17, z]);
      win.scale.setScalar(1.25);
      win.rotation.z = 0.25;
    }

    // Plush prizes hanging from the front and side rails.
    const blobs: Blob[] = [];
    const pastel = ['#e9a6b8', '#9cc4e4', '#f2d98c', '#b9a0d8', '#c9895a', '#f4f0e6'];
    const kinds = ['bears', 'bananas', 'aliens'] as const;
    const plush = (x: number, y: number, z: number, kind: (typeof kinds)[number], size: number) => {
      const p = (dx: number, dy: number, dz: number): [number, number, number] => [x + dx * size, y + dy * size, z + dz * size];
      const sc = (sx: number, sy: number, sz: number): [number, number, number] => [sx * size, sy * size, sz * size];
      if (kind === 'bears') {
        const c = pastel[Math.floor(random() * pastel.length)];
        blobs.push({ at: p(0, -0.3, 0), scale: sc(0.13, 0.15, 0.11), color: c }, { at: p(0, -0.1, 0), scale: sc(0.1, 0.1, 0.1), color: c });
        for (const side of [-1, 1]) blobs.push({ at: p(side * 0.08, -0.02, 0), scale: sc(0.04, 0.04, 0.03), color: c }, { at: p(side * 0.13, -0.24, 0.03), scale: sc(0.045, 0.07, 0.045), color: c }, { at: p(side * 0.07, -0.44, 0.04), scale: sc(0.05, 0.06, 0.06), color: c });
        blobs.push({ at: p(0, -0.12, 0.085), scale: sc(0.04, 0.03, 0.03), color: '#f6efe2' });
      } else if (kind === 'bananas') {
        for (let i = 0; i < 5; i++) blobs.push({ at: p(Math.sin(i * 0.5) * 0.07 - 0.05, -0.06 - i * 0.09, 0), scale: sc(0.055, 0.075, 0.055), color: i === 0 ? '#6b4a22' : '#f4d03f' });
        for (const side of [-1, 1]) blobs.push({ at: p(side * 0.025 + 0.01, -0.2, 0.05), scale: sc(0.014, 0.018, 0.012), color: '#1c1c1c' });
      } else {
        blobs.push({ at: p(0, -0.14, 0), scale: sc(0.13, 0.12, 0.11), color: '#8fd94a' }, { at: p(0, -0.34, 0), scale: sc(0.07, 0.12, 0.06), color: '#8fd94a' });
        for (const side of [-1, 1]) blobs.push({ at: p(side * 0.055, -0.15, 0.085), scale: sc(0.04, 0.055, 0.025), color: '#151515', turn: [0, 0, side * 0.5] }, { at: p(side * 0.07, -0.47, 0), scale: sc(0.03, 0.07, 0.03), color: '#8fd94a' });
      }
    };
    const strings: [number, number, number][] = [];
    const prizeKind = a.prizes;
    if (prizeKind !== 'none') {
      const share = a.state === 'busy' ? 1 : a.state === 'slow' ? 0.7 : a.state === 'closing' ? 0.3 : 0;
      const hang = (x: number, z: number) => {
        if (random() > share * mix(0.55, 1.05, mood.density)) return;
        const kind = prizeKind === 'mixed' ? kinds[Math.floor(random() * 3)] : prizeKind;
        strings.push([x, H, z]);
        plush(x, H - 0.08, z, kind, mix(0.85, 1.35, random()));
      };
      for (let i = 0; i < 9; i++) hang((i - 4) * 0.36, D / 2 - 0.02);
      for (const x of [-1, 1]) for (let i = 0; i < 5; i++) hang(x * (W / 2 - 0.02), -0.9 + i * 0.4);
      for (let i = 0; i < 7; i++) hang((i - 3) * 0.44, -D / 2 + 0.14);
    }
    for (const [x, y, z] of strings) s.rod([x, y, z], [x, y - 0.1, z], 0.006, dark);
    if (blobs.length) {
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ roughness: 0.95 }), blobs.length);
      blobs.forEach((b, i) => {
        e.set(...(b.turn ?? [0, 0, 0]));
        mesh.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(...b.at), q.setFromEuler(e), new THREE.Vector3(...b.scale)));
        mesh.setColorAt(i, new THREE.Color(b.color));
      });
      mesh.castShadow = true;
      s.root.add(mesh);
    }

    // The dropped awning.
    if (!open) {
      const drop = a.state === 'closing' ? mix(0.55, 0.85, random()) : H - 0.93;
      const flap = s.box([W + 0.1, drop, 0.025], [0, H - drop / 2, D / 2 + 0.05], canvasMat(9));
      if (a.state === 'closing') { flap.rotation.z = (random() - 0.5) * 0.06; flap.rotation.x = -0.05; }
      else s.label('CLOSED', 0.7, 0.26, [(random() - 0.5) * 0.8, 1.55, D / 2 + 0.07], '#2b2a2c', '#f1ead6').rotation.z = (random() - 0.5) * 0.2;
    }

    // Bulbs in three chase groups along the front edge and marquee.
    const groups: THREE.MeshStandardMaterial[] = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: open ? '#fff2c2' : '#9a9584', emissive: new THREE.Color().setHSL(mix(0.14, 0.09, mood.warmth), 1, 0.6), emissiveIntensity: open ? 1.2 : 0 }));
    const bulbGeo = new THREE.SphereGeometry(0.035, 8, 6);
    const bulbs: [number, number, number][] = [];
    const by = a.roof === 'marquee' ? H + 0.9 : a.roof === 'slope' ? H + 0.17 : H + 0.07, bz = a.roof === 'slope' ? D / 2 + 0.56 : D / 2 + 0.22;
    for (let i = 0; i < 17; i++) bulbs.push([(i - 8) * (W + 0.3) / 16, by, bz]);
    if (a.roof === 'marquee') for (let i = 0; i < 17; i++) bulbs.push([(i - 8) * (W + 0.1) / 16, H + 0.14, bz - 0.08]);
    bulbs.forEach((at, i) => { if (random() > mood.wear * 0.45) s.mesh(bulbGeo, groups[i % 3], at).castShadow = false; });

    const speed = mix(1.5, 9, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (!open) return;
        const step = Math.floor(time * speed) % 3;
        groups.forEach((g, i) => { g.emissiveIntensity = i === step ? 1.6 : 0.35; });
      },
    });
  },
});
