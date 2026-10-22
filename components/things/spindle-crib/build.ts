import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type G = CanvasRenderingContext2D;
function paint(w: number, h: number, draw: (g: G, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const poly = (points: readonly (readonly [number, number])[]) => new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
const arc = (n: number, f: (t: number) => readonly [number, number]) => Array.from({ length: n }, (_, i) => f(i / (n - 1)));
const SHAPES = {
  star: () => poly(Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 0.45 : 1, t = i * Math.PI / 5 + Math.PI / 2; return [Math.cos(t) * r, Math.sin(t) * r] as const; })),
  moon: () => poly([
    ...arc(18, (t) => { const q = mix(50, 310, t) * Math.PI / 180; return [Math.cos(q) + 0.2, Math.sin(q)] as const; }),
    ...arc(14, (t) => { const q = mix(280.6, 79.4, t) * Math.PI / 180; return [0.7 + 0.779 * Math.cos(q), 0.779 * Math.sin(q)] as const; }),
  ]),
  cloud: () => poly(arc(40, (t) => { const q = t * Math.PI * 2, r = 1 + 0.16 * Math.cos(q * 5 + 0.6); return [Math.cos(q) * r, Math.sin(q) * r * 0.62 + (Math.sin(q) < 0 ? 0.12 : 0)] as const; })),
  bird: () => poly([[-1, 0.3], [-0.5, 0.6], [0, 0.18], [0.5, 0.6], [1, 0.3], [0.5, 0.3], [0, -0.4], [-0.5, 0.3]]),
  fish: () => poly([...arc(24, (t) => { const q = mix(20, 340, t) * Math.PI / 180; return [-0.2 + Math.cos(q) * 0.8, Math.sin(q) * 0.5] as const; }), [1.05, -0.5] as const, [0.85, 0] as const, [1.05, 0.5] as const]),
  heart: () => poly(arc(40, (t) => { const q = t * Math.PI * 2; return [16 * Math.sin(q) ** 3 / 17, (13 * Math.cos(q) - 5 * Math.cos(2 * q) - 2 * Math.cos(3 * q) - Math.cos(4 * q)) / 17 + 0.1] as const; })),
};

const WOOD = { white: '#f1eee6', beech: '#d8b78a', walnut: '#6d4b36', mint: '#b5d6c6', grey: '#98a2a8' } as const;

export default defineThing({
  questions: {
    state: choice('What state is the cot in right now?', {
      made: 'Made up and empty, sheet pulled smooth, waiting for someone.',
      bundle: 'Occupied-looking: a small swaddled bundle asleep on the mattress.',
      rumpled: 'Just lifted out of: a blanket kicked into a heap, still warm.',
      stripped: 'Stripped to the bare striped mattress, outgrown or put away.',
      flatpack: 'Never assembled: still flat-packed in its cardboard box, leaning with the wrapped mattress.',
    }),
    side: choice('If it is assembled, how is the front side set?', {
      up: 'Raised and latched, a full cage of spindles.',
      down: 'Dropped low for lifting a baby in and out.',
      off: 'Removed entirely, converted into a toddler bed with a short guard rail.',
    }),
    mobile: choice('What hangs from the mobile over it?', {
      stars: 'Felt stars in soft colours.',
      moons: 'Crescent moons and clouds.',
      birds: 'A flock of little felt birds.',
      fish: 'Fish swimming in a slow circle.',
      hearts: 'Stitched felt hearts.',
      none: 'Nothing: no mobile at all, just the cot.',
    }),
    wood: choice('What is the cot made of?', {
      white: 'White painted wood, the catalogue classic.',
      beech: 'Pale natural beech.',
      walnut: 'Dark walnut-stained hand-me-down.',
      mint: 'Pastel mint green paint.',
      grey: 'Modern dove grey.',
    }),
    sheet: choice('What is the fitted sheet like?', {
      plain: 'Plain white cotton.',
      gingham: 'Yellow gingham checks.',
      stars: 'Scattered navy stars on cream.',
      stripes: 'Soft blue and white stripes.',
      spots: 'Dusty pink with white polka dots.',
    }),
    blanket: noul('Is a knitted blanket folded over the end rail?'),
    toy: noul('Is a soft toy rabbit propped in the corner of the cot?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wood = s.material(WOOD[a.wood], { roughness: 0.5 });
    const L = 1.24, D = 0.66;
    const pastel = (hue: number) => new THREE.Color().setHSL(hue, mix(0.3, 0.75, mood.cheer), mix(0.5, 0.62, mood.cheer));
    const hues = [0.08, 0.55, 0.13, 0.95, 0.38, 0.72].map((h) => h + (random() - 0.5) * 0.05);

    if (a.state === 'flatpack') {
      const card = '#c49a66';
      const face = paint(768, 448, (g, w, h) => {
        g.fillStyle = card; g.fillRect(0, 0, w, h);
        g.strokeStyle = g.fillStyle = '#4a3622'; g.lineWidth = 6;
        g.strokeRect(60, 110, 300, 200); g.strokeRect(60, 250, 300, 10);
        for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(60 + i * 30, 110); g.lineTo(60 + i * 30, 250); g.stroke(); }
        g.font = 'bold 76px sans-serif'; g.fillText('COT BED', 400, 170);
        g.font = 'bold 34px sans-serif'; g.fillText('BOX 1 OF 2', 404, 225); g.fillText('0 - 4 YEARS', 404, 270);
        g.font = '26px monospace'; g.fillText('ASSEMBLY REQUIRED', 404, 315);
        for (let i = 0; i < 30; i++) g.fillRect(560 + i * 6, 360, i % 3 ? 2 : 4, 50);
        g.lineWidth = 5;
        for (const x of [80, 150]) { g.beginPath(); g.moveTo(x, 420); g.lineTo(x, 360); g.lineTo(x - 18, 380); g.moveTo(x, 360); g.lineTo(x + 18, 380); g.stroke(); }
        g.fillStyle = 'rgba(214,190,150,0.85)'; g.fillRect(0, 30, w, 44);
      });
      const cardboard = s.material(card, { roughness: 0.9 });
      const lean = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.76, 0.17), [cardboard, cardboard, cardboard, cardboard, new THREE.MeshStandardMaterial({ map: face, roughness: 0.9 }), cardboard]);
      box.position.y = 0.38; box.castShadow = box.receiveShadow = true;
      lean.add(box); lean.rotation.x = -0.2; lean.rotation.y = (random() - 0.5) * 0.12;
      s.root.add(lean);
      // The wrapped mattress it leans on, and the second, slimmer box.
      s.box([1.18, 0.6, 0.11], [0.03, 0.3, -0.27], s.material('#e9eef0', { roughness: 0.25 }));
      for (const x of [-0.35, 0.1, 0.42]) s.box([0.02, 0.605, 0.115], [x, 0.3, -0.27], s.material('#cfd9dd', { roughness: 0.2 }));
      const two = s.box([1.3, 0.09, 0.5], [0.05, 0.045, 0.42], cardboard);
      two.rotation.y = 0.1 + random() * 0.15;
      s.box([1.3, 0.004, 0.07], [0.05, 0.092, 0.42], s.material('#d9c39c')).rotation.y = two.rotation.y;
      if (a.mobile !== 'none') {
        const tint = pastel(hues[0]);
        const m = s.box([0.26, 0.2, 0.2], [-0.25 + random() * 0.2, 0.19, 0.42], s.material(tint));
        m.rotation.y = random() - 0.5;
        const shape = new THREE.Mesh(new THREE.ExtrudeGeometry(SHAPES[a.mobile === 'moons' ? 'moon' : a.mobile === 'stars' ? 'star' : a.mobile === 'birds' ? 'bird' : a.mobile === 'fish' ? 'fish' : 'heart'](), { depth: 0.1, bevelEnabled: false }), s.material('#fffaf0'));
        shape.scale.set(0.06, 0.06, 0.02); shape.position.set(0, 0, 0.1); m.add(shape);
      }
      if (a.toy) rabbit(s, [0.5, 0.09, 0.42], random);
      // Allen key and a bag of fittings on the floor.
      s.box([0.012, 0.012, 0.12], [-0.5, 0.006, 0.78], s.material('#555a60', { metalness: 0.6 }));
      s.box([0.05, 0.012, 0.012], [-0.48, 0.006, 0.84], s.material('#555a60', { metalness: 0.6 }));
      s.ball([0.07, 0.025, 0.05], [-0.3, 0.02, 0.8], s.material('#dfe6e8', { roughness: 0.2 }), 12);
      return s.finish();
    }

    // Frame: corner posts, end arches, rails.
    for (const x of [-L / 2, L / 2]) {
      for (const z of [-D / 2, D / 2]) {
        s.box([0.055, 1.0, 0.055], [x, 0.5, z], wood);
        s.ball([0.036, 0.036, 0.036], [x, 1.02, z], wood, 14);
      }
      s.box([0.04, 0.06, D], [x, 0.3, 0], wood);
      s.box([0.04, 0.05, D], [x, 0.95, 0], wood);
      s.tube([[x, 0.97, -D / 2], [x, 1.1, -D / 4], [x, 1.13, 0], [x, 1.1, D / 4], [x, 0.97, D / 2]], 0.022, wood);
    }
    const drop = a.side === 'down' ? -0.26 : 0;
    s.box([L, 0.06, 0.04], [0, 0.3, -D / 2], wood);
    s.box([L, 0.05, 0.04], [0, 0.95, -D / 2], wood);
    if (a.side === 'off') {
      s.box([L, 0.07, 0.04], [0, 0.3, D / 2], wood);
      s.box([L * 0.42, 0.04, 0.035], [-L * 0.27, 0.62, D / 2], wood);
    } else {
      s.box([L, 0.06, 0.04], [0, 0.3 + drop, D / 2], wood);
      s.box([L, 0.05, 0.04], [0, 0.95 + drop, D / 2], wood);
    }

    // Turned spindles, one draw call.
    const profile: [number, number][] = [[0.013, 0], [0.013, 0.07], [0.021, 0.11], [0.012, 0.15], [0.017, 0.5], [0.012, 0.85], [0.021, 0.89], [0.013, 0.93], [0.013, 1]];
    const turned = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 10);
    const spots: { x: number; y: number; z: number; len: number }[] = [];
    const gone = () => mood.wear > 0.6 && random() < (mood.wear - 0.55) * 0.3;
    for (let i = 1; i < 15; i++) {
      const x = -L / 2 + i * L / 15;
      if (!gone()) spots.push({ x, y: 0.32, z: -D / 2, len: 0.61 });
      if (a.side === 'off') { if (x < -L * 0.07 && !gone()) spots.push({ x, y: 0.33, z: D / 2, len: 0.28 }); }
      else if (!gone()) spots.push({ x, y: 0.32 + drop, z: D / 2, len: 0.61 });
    }
    for (let i = 1; i < 8; i++) for (const x of [-L / 2, L / 2]) spots.push({ x, y: 0.32, z: -D / 2 + i * D / 8, len: 0.61 + Math.sin(i / 8 * Math.PI) * 0.15 });
    const spindles = new THREE.InstancedMesh(turned, wood, spots.length);
    const matrix = new THREE.Matrix4();
    spots.forEach((p, i) => spindles.setMatrixAt(i, matrix.makeScale(1, p.len, 1).setPosition(p.x, p.y, p.z)));
    spindles.castShadow = spindles.receiveShadow = true;
    s.root.add(spindles);

    // Mattress and sheet.
    const top = 0.5;
    const ticking = paint(256, 128, (g, w, h) => {
      g.fillStyle = '#ebe6d8'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#6f86a6'; for (let x = 6; x < w; x += 20) { g.fillRect(x, 0, 5, h); g.fillRect(x + 8, 0, 1.5, h); }
      if (mood.wear > 0.4) { g.fillStyle = `rgba(150,120,70,${mood.wear * 0.35})`; g.beginPath(); g.ellipse(w * (0.3 + random() * 0.4), h * 0.5, 34, 22, 0.4, 0, 7); g.fill(); }
    });
    const cloth = paint(256, 128, (g, w, h) => {
      const base = { plain: '#f6f4ee', gingham: '#fbf3c8', stars: '#f5efde', stripes: '#f4f6f8', spots: '#dba9ae' }[a.sheet];
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      if (a.sheet === 'gingham') { g.fillStyle = 'rgba(226,176,40,0.5)'; for (let x = 0; x < w; x += 24) g.fillRect(x, 0, 12, h); for (let y = 0; y < h; y += 24) g.fillRect(0, y, w, 12); }
      if (a.sheet === 'stripes') { g.fillStyle = '#9db9d6'; for (let y = 4; y < h; y += 18) g.fillRect(0, y, w, 8); }
      if (a.sheet === 'spots') { g.fillStyle = '#fff8f4'; for (let x = 0; x < 9; x++) for (let y = 0; y < 5; y++) { g.beginPath(); g.arc(x * 30 + (y % 2) * 15 + 8, y * 28 + 10, 6, 0, 7); g.fill(); } }
      if (a.sheet === 'stars') { g.fillStyle = '#2f3f6e'; g.font = '26px serif'; for (let i = 0; i < 26; i++) g.fillText('★', random() * w, random() * h); }
    });
    s.box([L - 0.07, 0.1, D - 0.07], [0, top - 0.05, 0], s.material('#f0ede4'));
    const cover = s.box([L - 0.065, 0.06, D - 0.065], [0, top - 0.027, 0], new THREE.MeshStandardMaterial({ map: a.state === 'stripped' ? ticking : cloth, roughness: 0.95 }));
    cover.receiveShadow = true;

    let breath: THREE.Mesh | null = null;
    if (a.state === 'bundle') {
      const wrap = s.material(pastel(hues[1]).lerp(new THREE.Color('#ffffff'), 0.45), { roughness: 0.95 });
      breath = s.ball([0.19, 0.075, 0.105], [0.05, top + 0.07, 0.02], wrap, 18);
      breath.rotation.y = 0.15 + (random() - 0.5) * 0.3;
      s.ball([0.07, 0.065, 0.068], [-0.2, top + 0.065, -0.01], s.material('#e9c9b4'), 16);
      s.ball([0.074, 0.05, 0.072], [-0.215, top + 0.085, -0.01], s.material('#f7f3ea'), 16);
      s.rod([-0.09, top + 0.1, -0.07], [0.2, top + 0.11, 0.1], 0.012, s.material('#ffffff'));
    }
    if (a.state === 'rumpled' || a.state === 'made') {
      const geometry = new THREE.PlaneGeometry(a.state === 'made' ? 0.72 : 0.6, D - 0.09, 18, 12);
      const p = geometry.attributes.position, f1 = random() * 6, f2 = random() * 6, heap = a.state === 'rumpled' ? 1 : 0.12;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        p.setZ(i, heap * (0.045 + 0.04 * Math.sin(x * 21 + f1) * Math.cos(y * 17 + f2) + 0.03 * Math.sin((x + y) * 33 + f1)) + 0.006);
        if (a.state === 'rumpled') p.setX(i, x * (0.62 + 0.2 * Math.sin(y * 9 + f2)));
      }
      geometry.computeVertexNormals();
      const knit = s.mesh(geometry, s.material(pastel(hues[1]).lerp(new THREE.Color('#ffffff'), 0.3), { roughness: 1, side: THREE.DoubleSide }), [a.state === 'made' ? 0.22 : 0.1 + random() * 0.25, top + 0.004, 0]);
      knit.rotation.x = -Math.PI / 2;
      knit.rotation.z = a.state === 'rumpled' ? (random() - 0.5) * 0.7 : 0;
      if (a.state === 'made') s.ball([0.12, 0.03, 0.17], [-0.42, top + 0.02, 0], s.material('#fbfaf5'), 16);
    }
    if (a.toy) rabbit(s, [L / 2 - 0.13, top, -D / 2 + 0.13], random);
    if (mood.density > 0.65 && a.state !== 'stripped') s.ball([0.05, 0.05, 0.05], [-L / 2 + 0.14, top + 0.05, D / 2 - 0.14], s.material(pastel(hues[4])), 14);

    if (a.blanket) {
      const throwMat = s.material(pastel(hues[3]).lerp(new THREE.Color('#ffffff'), 0.25), { roughness: 1 });
      const z = (random() - 0.5) * 0.2;
      s.box([0.012, 0.4, 0.3], [L / 2 + 0.028, 0.77, z], throwMat);
      s.box([0.012, 0.26, 0.3], [L / 2 - 0.028, 0.84, z], throwMat);
      s.box([0.07, 0.02, 0.3], [L / 2, 0.98, z], throwMat);
    }

    // Mobile: a clamped arm reaching over the middle, with felt shapes turning under a hub.
    const spinner = new THREE.Group();
    const danglers: THREE.Object3D[] = [];
    if (a.mobile !== 'none') {
      const arm = s.material('#f3efe6', { roughness: 0.4 });
      const mx = -0.28;
      s.box([0.07, 0.09, 0.07], [mx, 0.95, -D / 2], arm);
      s.tube([[mx, 0.95, -D / 2], [mx, 1.3, -D / 2 - 0.02], [mx, 1.56, -D / 2 + 0.08], [mx, 1.62, -D / 4], [mx, 1.58, 0]], 0.02, arm);
      spinner.position.set(mx, 1.52, 0);
      s.root.add(spinner);
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = true; spinner.add(mesh); return mesh; };
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.07, 14), arm)).position.y = 0.03;
      const kinds: (keyof typeof SHAPES)[] = { stars: ['star'], moons: ['moon', 'cloud'], birds: ['bird'], fish: ['fish'], hearts: ['heart'] }[a.mobile] as (keyof typeof SHAPES)[];
      const string = new THREE.MeshStandardMaterial({ color: '#8d8a84' });
      const count = 5;
      for (let i = 0; i <= count; i++) {
        const centre = i === count;
        const q = i / count * Math.PI * 2, r = centre ? 0 : 0.25;
        if (!centre) {
          const spoke = add(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, r, 6), arm));
          spoke.rotation.z = Math.PI / 2; spoke.rotation.y = -q; spoke.position.set(Math.cos(q) * r / 2, 0, Math.sin(q) * r / 2);
        }
        if (mood.wear > 0.7 && !centre && random() < 0.3) continue;
        const hang = centre ? 0.3 : 0.14 + random() * 0.12;
        const thread = add(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, hang, 5), string));
        thread.position.set(Math.cos(q) * r, -hang / 2, Math.sin(q) * r);
        const size = centre ? 0.11 : 0.085;
        const felt = add(new THREE.Mesh(new THREE.ExtrudeGeometry(SHAPES[kinds[i % kinds.length]](), { depth: 0.3, bevelEnabled: false }), s.material(pastel(hues[i % hues.length]), { roughness: 1 })));
        felt.geometry.translate(0, 0, -0.15);
        felt.scale.setScalar(size);
        felt.position.set(Math.cos(q) * r, -hang - size * 0.9, Math.sin(q) * r);
        felt.rotation.y = random() * Math.PI;
        danglers.push(felt);
      }
    }

    const speed = mix(0.12, 1.3, mood.energy);
    return s.finish({
      update: (dt, time) => {
        spinner.rotation.y += dt * speed;
        for (const [i, d] of danglers.entries()) d.rotation.y -= dt * speed * (1.4 + i * 0.2);
        if (breath) breath.scale.y = 0.075 * (1 + 0.06 * Math.sin(time * 1.6));
      },
    });
  },
});

function rabbit(s: Sculpture, at: readonly [number, number, number], random: () => number) {
  const fur = s.material('#d9cdbd', { roughness: 1 });
  const [x, y, z] = at;
  s.ball([0.055, 0.07, 0.05], [x, y + 0.065, z], fur, 14);
  s.ball([0.042, 0.04, 0.04], [x, y + 0.16, z + 0.005], fur, 14);
  const flop = random() < 0.5 ? 0.9 : 0.15;
  s.ball([0.013, 0.05, 0.009], [x - 0.02, y + 0.23, z], fur, 10).rotation.z = 0.15;
  s.ball([0.013, 0.05, 0.009], [x + 0.03, y + 0.22, z], fur, 10).rotation.z = -flop;
  for (const dx of [-0.045, 0.045]) s.ball([0.02, 0.02, 0.035], [x + dx, y + 0.02, z + 0.04], fur, 10);
  for (const dx of [-0.015, 0.015]) s.ball([0.006, 0.006, 0.006], [x + dx, y + 0.165, z + 0.04], s.material('#2a2422'), 8);
}
