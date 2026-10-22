import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

function cover(title: readonly string[], width: number, height: number, ink: string, paper: string, band: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = Math.round((256 * height) / width);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = band; ctx.fillRect(0, canvas.height * 0.62, canvas.width, canvas.height * 0.22);
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.08);
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  title.forEach((line, i) => { ctx.font = `bold ${Math.min(52, 330 / line.length)}px serif`; ctx.fillText(line, 128, canvas.height * (0.22 + i * 0.17), 236); });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
}

export default defineThing({
  questions: {
    guard: choice('Where is the guard?', {
      slumped: 'Still here, in a way: the jacket sits in the chair as a slumped coat-shape with the cap tipped down over where a face would be, trouser legs stretched out.',
      stepped: 'Just stepped out: jacket hung neatly over the chair back, cap on the seat, a cup still steaming.',
      gone: 'Long gone: the jacket has slid to the floor, the cap lies upside down and everything is filmed with dust.',
      vigilant: 'Never sits: the jacket is buttoned round the chair back like a scarecrow and the cap perches on top, keeping watch on its own.',
      packed: 'Finished for the night: the chair folded flat and leaned up, jacket and cap piled on it.',
    }),
    uniform: choice('What colour is the uniform?', {
      navy: 'Navy blue with silver buttons.',
      bottle: 'Bottle green with brass buttons.',
      maroon: 'Maroon with gold braid, slightly theatrical.',
      grey: 'Institutional grey, almost a janitor’s coat.',
      black: 'Black, a night-security jacket with a yellow stripe.',
    }),
    chair: choice('What kind of chair is it?', {
      slatted: 'A folding wooden chair with a slatted seat and back, varnish worn through.',
      bentwood: 'A round-seated bentwood café chair.',
      steel: 'A grey folding steel chair with a dented seat.',
      stool: 'A tall wooden stool with a low backrest, so the guard can see over heads.',
    }),
    book: choice('What is the paperback left face-down?', {
      western: 'A yellow-jacketed western, spine cracked in three places.',
      romance: 'A pink romance with a lurid cover.',
      crime: 'A black and red crime thriller.',
      catalogue: 'The museum’s own catalogue, which the guard no longer believes.',
      crossword: 'A book of crosswords with a pencil stub on it.',
      none: 'No book at all.',
    }),
    flask: choice('What is there to drink?', {
      tartan: 'A red tartan thermos with its cup unscrewed.',
      steel: 'A dented steel flask.',
      mug: 'A chipped enamel mug on the floor.',
      none: 'Nothing.',
    }),
    extra: choice('What else has been left by the chair?', {
      nothing: 'Nothing else.',
      radio: 'A small transistor radio with its aerial up.',
      keys: 'A huge ring of keys.',
      torch: 'A heavy torch, left switched on.',
      lunch: 'A lunch box with half a sandwich.',
      shoes: 'A pair of shoes, taken off and set side by side.',
    }),
    notice: noul('Is there a small "back in 5 minutes" card propped on or by the chair?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const clothTint = { navy: '#1f2c4f', bottle: '#1f4a35', maroon: '#6a1d2a', grey: '#6d7275', black: '#1d1d21' }[a.uniform];
    const cloth = s.material(clothTint, { roughness: 0.95 });
    const clothDark = s.material(new THREE.Color(clothTint).multiplyScalar(0.7), { roughness: 0.95 });
    const trim = s.material(a.uniform === 'navy' || a.uniform === 'grey' ? '#cfd3d6' : a.uniform === 'black' ? '#e9d23a' : '#d0a93f', { metalness: a.uniform === 'black' ? 0 : 0.8, roughness: 0.35 });
    const woodTint = a.chair === 'bentwood' ? '#3c241a' : '#a9773f';
    const wood = s.material(a.chair === 'steel' ? '#8c9396' : woodTint, a.chair === 'steel' ? { metalness: 0.6, roughness: 0.45 } : { roughness: 0.6 });
    const dark = s.material('#1c1a19', { roughness: 0.7 });

    const packed = a.guard === 'packed' && a.chair !== 'stool';
    const stool = a.chair === 'stool';
    const seatY = stool ? 0.74 : 0.45, seatW = stool ? 0.36 : 0.42, seatD = stool ? 0.34 : 0.4;
    const backTop = seatY + (stool ? 0.3 : 0.44);
    const chair = new THREE.Group();
    s.root.add(chair);
    const add = <T extends THREE.Object3D>(child: T, parent: THREE.Object3D = chair) => { parent.add(child); return child; };
    const rod = (from: P3, to: P3, r: number, material: THREE.Material, end = r) => add(s.rod(from, to, r, material, end), chair);

    // ---- Chair ----
    const hx = seatW / 2 - 0.02;
    if (a.chair === 'slatted' || a.chair === 'steel') {
      const r = a.chair === 'steel' ? 0.011 : 0.016;
      for (const x of [-hx, hx]) {
        rod([x, 0, seatD / 2 + 0.06], [x, backTop, -seatD / 2 - 0.06], r, wood); // front foot up to back top
        rod([x * 0.9, 0, -seatD / 2 - 0.08], [x * 0.9, seatY, seatD / 2 - 0.02], r, wood); // crossing leg
        add(s.cylinder(0.012, 0.012, 0.03, [x + Math.sign(x) * 0.012, seatY * 0.55, 0], dark, 8)).rotation.z = Math.PI / 2;
      }
      rod([-hx, 0.12, seatD / 2 + 0.035], [hx, 0.12, seatD / 2 + 0.035], r * 0.7, wood);
      rod([-hx * 0.9, 0.1, -seatD / 2 - 0.055], [hx * 0.9, 0.1, -seatD / 2 - 0.055], r * 0.7, wood);
      if (a.chair === 'slatted') {
        for (let i = 0; i < 6; i++) add(s.box([seatW, 0.016, seatD / 6 - 0.012], [0, seatY, -seatD / 2 + (i + 0.5) * (seatD / 6)], wood));
        for (let i = 0; i < 3; i++) { const y = backTop - 0.04 - i * 0.085, z = -seatD / 2 - 0.06 + (backTop - y) * 0.26; add(s.box([seatW - 0.02, 0.06, 0.014], [0, y, z + 0.012], wood)).rotation.x = -0.26; }
      } else {
        add(s.box([seatW, 0.014, seatD], [0, seatY, 0], wood));
        add(s.box([seatW - 0.02, 0.18, 0.012], [0, backTop - 0.11, -seatD / 2 - 0.02], wood)).rotation.x = -0.26;
      }
    } else if (a.chair === 'bentwood') {
      add(s.cylinder(seatW / 2, seatW / 2, 0.03, [0, seatY, 0], s.material('#b98c55', { roughness: 0.7 }), 28));
      add(s.ring(seatW / 2, 0.016, [0, seatY, 0], wood)).rotation.x = Math.PI / 2;
      add(s.ring(seatW / 2 - 0.04, 0.01, [0, seatY * 0.5, 0], wood)).rotation.x = Math.PI / 2;
      for (const x of [-1, 1]) {
        rod([x * 0.19, 0, 0.19], [x * 0.14, seatY, 0.14], 0.016, wood, 0.019);
        rod([x * 0.2, 0, -0.2], [x * 0.15, seatY, -0.15], 0.016, wood, 0.019);
      }
      add(s.tube([[-0.15, seatY, -0.15], [-0.17, seatY + 0.3, -0.21], [-0.1, backTop, -0.24], [0.1, backTop, -0.24], [0.17, seatY + 0.3, -0.21], [0.15, seatY, -0.15]], 0.015, wood));
      add(s.tube([[-0.08, seatY, -0.19], [-0.09, seatY + 0.24, -0.22], [0, backTop - 0.09, -0.24], [0.09, seatY + 0.24, -0.22], [0.08, seatY, -0.19]], 0.011, wood));
    } else {
      add(s.cylinder(seatW / 2, seatW / 2 - 0.02, 0.04, [0, seatY, 0], wood, 24));
      for (let i = 0; i < 4; i++) { const t = Math.PI / 4 + (i * Math.PI) / 2; rod([Math.cos(t) * 0.27, 0, Math.sin(t) * 0.27], [Math.cos(t) * 0.13, seatY, Math.sin(t) * 0.13], 0.019, wood, 0.016); }
      add(s.ring(0.19, 0.01, [0, 0.26, 0], s.material('#8c9396', { metalness: 0.6 }))).rotation.x = Math.PI / 2;
      for (const x of [-0.12, 0.12]) rod([x, seatY, -seatD / 2 + 0.02], [x, backTop, -seatD / 2 - 0.03], 0.013, wood);
      add(s.box([0.32, 0.09, 0.02], [0, backTop - 0.03, -seatD / 2 - 0.03], wood));
    }
    const backZ = stool ? -seatD / 2 - 0.03 : a.chair === 'bentwood' ? -0.24 : -seatD / 2 - 0.06;

    // ---- Uniform pieces ----
    const makeCap = () => {
      const cap = new THREE.Group();
      const crown = s.cylinder(0.105, 0.085, 0.06, [0, 0.04, 0], cloth, 24); cap.add(crown);
      cap.add(s.cylinder(0.086, 0.086, 0.028, [0, 0.014, 0], dark, 24));
      const peak = s.cylinder(0.085, 0.085, 0.006, [0, 0.006, 0.07], s.material('#111113', { roughness: 0.25 }), 20); peak.scale.set(1, 1, 0.75); peak.rotation.x = 0.2; cap.add(peak);
      cap.add(s.ball([0.022, 0.026, 0.008], [0, 0.042, 0.092], trim, 10));
      const band = s.ring(0.088, 0.004, [0, 0.028, 0], trim); band.rotation.x = Math.PI / 2; cap.add(band);
      return cap;
    };
    const buttons = (parent: THREE.Object3D, x: number, yTop: number, yBottom: number, z: number, count = 4) => {
      for (let i = 0; i < count; i++) add(s.ball([0.011, 0.011, 0.006], [x, mix(yTop, yBottom, i / (count - 1)), z], trim, 8), parent);
    };
    const sleeve = (parent: THREE.Object3D, points: P3[]) => { const t = s.tube(points, 0.045, cloth); add(t, parent); add(s.cylinder(0.047, 0.047, 0.02, points[points.length - 1], trim, 12), parent).visible = a.uniform === 'maroon' || a.uniform === 'black'; return t; };

    let capAt: P3 = [0, seatY + 0.02, 0.02], capTilt: P3 = [0, jitter(0.8), 0];
    if (a.guard === 'slumped') {
      // A figure made only of clothes.
      const torso = add(s.ball([0.19, 0.27, 0.13], [0.02, seatY + 0.27, -0.09], cloth, 20));
      torso.rotation.set(-0.3, 0, 0.1);
      add(s.ball([0.21, 0.09, 0.13], [0.0, seatY + 0.46, -0.15], cloth, 16)).rotation.z = 0.1; // shoulders
      add(s.box([0.012, 0.36, 0.01], [0.03, seatY + 0.26, 0.035], clothDark)).rotation.set(-0.3, 0, 0.1);
      buttons(chair, 0.05, seatY + 0.4, seatY + 0.14, 0.0);
      chair.children.slice(-4).forEach((b, i) => { b.position.z = 0.0 + i * 0.027 + 0.01; });
      sleeve(chair, [[-0.19, seatY + 0.46, -0.14], [-0.25, seatY + 0.25, -0.05], [-0.13, seatY + 0.12, 0.1], [0.0, seatY + 0.1, 0.13]]);
      sleeve(chair, [[0.2, seatY + 0.47, -0.14], [0.26, seatY + 0.27, -0.06], [0.16, seatY + 0.13, 0.1], [0.03, seatY + 0.13, 0.13]]);
      const trousers = s.material('#2b2c33', { roughness: 0.95 });
      for (const x of [-0.09, 0.1]) {
        add(s.tube([[x, seatY + 0.05, -0.05], [x * 1.1, seatY + 0.06, 0.22], [x * 1.4, 0.3, 0.42], [x * 1.6, 0.06, 0.62 + jitter(0.06)]], 0.06, trousers));
        add(s.ball([0.05, 0.04, 0.11], [x * 1.65, 0.04, 0.7], dark, 12));
      }
      capAt = [0.03, seatY + 0.5, -0.07]; capTilt = [0.75, 0.15, 0.12];
    } else if (a.guard === 'gone') {
      const heap = add(s.ball([0.3, 0.05, 0.22], [0.12, 0.04, -0.42], cloth, 18)); heap.rotation.y = 0.5;
      add(s.ball([0.16, 0.06, 0.2], [-0.05, 0.05, -0.36], cloth, 14));
      sleeve(chair, [[0.25, 0.04, -0.45], [0.42, 0.045, -0.3], [0.5, 0.04, -0.1], [0.45, 0.04, 0.05]]);
      sleeve(chair, [[-0.1, 0.05, -0.4], [-0.25, 0.04, -0.5], [-0.38, 0.04, -0.42]]);
      capAt = [0.34 + jitter(0.08), 0.085, 0.36]; capTilt = [Math.PI, jitter(2), 0.12];
    } else if (packed) {
      // handled below, pieces go on the leaned chair
    } else {
      // Jacket over the chair back: a draped panel in front and behind, shoulders over the top rail.
      const w = a.guard === 'vigilant' ? 0.4 : 0.44, drop = a.guard === 'vigilant' ? 0.5 : 0.4;
      const frontZ = backZ + 0.045, rearZ = backZ - 0.05;
      add(s.box([w, drop, 0.03], [0, backTop - drop / 2 + 0.02, rearZ - 0.01], cloth)).rotation.x = 0.06;
      add(s.box([w * 0.48, drop * 0.9, 0.03], [-w * 0.26, backTop - drop * 0.45 + 0.02, frontZ + 0.01], cloth)).rotation.x = -0.1;
      add(s.box([w * 0.48, drop * 0.9, 0.03], [w * 0.26, backTop - drop * 0.45 + 0.02, frontZ + 0.01], cloth)).rotation.x = -0.1;
      add(s.ball([w / 2 + 0.03, 0.05, 0.075], [0, backTop + 0.02, backZ], cloth, 18));
      add(s.box([w * 0.5, 0.05, 0.03], [0, backTop + 0.05, backZ - 0.03], clothDark)).rotation.x = 0.5; // collar
      buttons(chair, 0.04, backTop - 0.06, backTop - drop * 0.8, frontZ + 0.035);
      for (const x of [-1, 1]) {
        add(s.box([0.11, 0.012, 0.014], [x * w * 0.26, backTop - drop * 0.55, frontZ + 0.03], clothDark)); // pocket flap
        add(s.box([0.1, 0.02, 0.06], [x * (w / 2 - 0.03), backTop + 0.062, backZ], trim)).rotation.z = -x * 0.25; // epaulette
        if (a.guard === 'vigilant') sleeve(chair, [[x * (w / 2 + 0.01), backTop + 0.01, backZ], [x * (w / 2 + 0.06), backTop - 0.2, backZ + 0.07], [x * (w / 2 - 0.02), backTop - 0.33, backZ + 0.14], [x * 0.05, backTop - 0.35, backZ + 0.17]]);
        else sleeve(chair, [[x * (w / 2 + 0.01), backTop + 0.01, backZ], [x * (w / 2 + 0.05), backTop - 0.2, backZ - 0.01 + jitter(0.04)], [x * (w / 2 + 0.04), backTop - 0.48 + jitter(0.06), backZ + jitter(0.05)]]);
      }
      if (a.guard === 'vigilant') { capAt = [0, backTop + 0.07, backZ]; capTilt = [-0.05, 0, 0]; }
    }

    // Folded and leaned: tip the whole chair and stack the clothes on it.
    if (packed) {
      chair.scale.set(1, 1, 0.22);
      chair.rotation.x = -0.24;
      chair.position.set(0, 0, -0.1);
      const bundle = s.ball([0.2, 0.07, 0.16], [0.0, 0.07, 0.22], cloth, 16); bundle.rotation.y = 0.3;
      s.box([0.3, 0.05, 0.22], [0.0, 0.035, 0.22], cloth).rotation.y = 0.3;
      for (let i = 0; i < 3; i++) s.ball([0.011, 0.011, 0.006], [0.02 + i * 0.05, 0.135, 0.25 + i * 0.012], trim, 8);
      capAt = [0.02, 0.13, 0.2]; capTilt = [0.1, jitter(1), 0];
    }
    const cap = makeCap();
    cap.position.set(...capAt); cap.rotation.set(...capTilt);
    s.root.add(cap);

    // ---- Things on the floor beside the chair ----
    const side = random() < 0.5 ? -1 : 1;
    const fx = side * (seatW / 2 + 0.2);
    const seatFree = !packed && a.guard !== 'slumped' && a.guard !== 'stepped';
    if (a.flask === 'tartan' || a.flask === 'steel') {
      const tint = a.flask === 'tartan' ? '#b3262b' : '#aeb5b8';
      const body = s.cylinder(0.042, 0.042, 0.24, [fx, 0.12, 0.08], s.material(tint, a.flask === 'steel' ? { metalness: 0.8, roughness: 0.3 } : { roughness: 0.6 }), 20);
      if (a.flask === 'tartan') for (let i = 0; i < 5; i++) s.cylinder(0.0428, 0.0428, 0.008, [fx, 0.04 + i * 0.04, 0.08], s.material(i % 2 ? '#1f3b2a' : '#f0e6c0'), 20);
      s.cylinder(0.03, 0.042, 0.03, [fx, 0.255, 0.08], s.material('#d8d8d2', { metalness: 0.6, roughness: 0.3 }), 16);
      if (a.guard === 'gone') { body.rotation.z = Math.PI / 2; body.position.set(fx, 0.042, 0.08); }
      const cupOn = a.guard === 'stepped' || a.guard === 'slumped';
      const cx = fx + side * 0.11, cz = 0.17;
      s.cylinder(0.04, 0.032, 0.055, [cx, 0.0275, cz], s.material(a.flask === 'tartan' ? '#f1ead8' : '#aeb5b8', { metalness: a.flask === 'steel' ? 0.8 : 0 }), 16);
      s.cylinder(0.035, 0.035, 0.004, [cx, 0.052, cz], s.material('#5a3a22', { roughness: 0.2 }), 14);
      if (cupOn && a.guard === 'stepped') {
        const steam = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false });
        for (let i = 0; i < 3; i++) s.tube([[cx + jitter(0.02), 0.07, cz], [cx + 0.02, 0.13, cz + jitter(0.03)], [cx - 0.015, 0.19, cz], [cx + 0.01, 0.25 + i * 0.03, cz + jitter(0.03)]], 0.006, steam).castShadow = false;
      }
    } else if (a.flask === 'mug') {
      const enamel = s.material('#e9eef0', { roughness: 0.3 });
      s.cylinder(0.045, 0.042, 0.085, [fx, 0.0425, 0.1], enamel, 18);
      s.ring(0.045, 0.004, [fx, 0.085, 0.1], s.material('#22386b')).rotation.x = Math.PI / 2;
      s.ring(0.026, 0.006, [fx + side * 0.05, 0.045, 0.1], enamel);
      s.cylinder(0.04, 0.04, 0.004, [fx, 0.078, 0.1], s.material('#5a3a22', { roughness: 0.2 }), 14);
    }

    if (a.book !== 'none') {
      const spec = {
        western: { t: ['DUST AT', 'NOON'], ink: '#3a1c0c', paper: '#e8bf3a', band: '#b8451f' },
        romance: { t: ['HER SECRET', 'CURATOR'], ink: '#6a1034', paper: '#f1a7bf', band: '#d0447a' },
        crime: { t: ['THE LAST', 'EXHIBIT'], ink: '#f2ece0', paper: '#19181b', band: '#b3231f' },
        catalogue: { t: ['MUSEUM', 'GUIDE'], ink: '#22313a', paper: '#e9e4d3', band: '#3f6c78' },
        crossword: { t: ['100', 'CROSSWORDS'], ink: '#1b1b1b', paper: '#f4f4ee', band: '#2a2a2a' },
      }[a.book];
      const book = new THREE.Group();
      const jacket = cover(spec.t, 0.11, 0.17, spec.ink, spec.paper, spec.band);
      // Face-down and tented: two covers meeting at a raised spine.
      for (const x of [-1, 1]) {
        const half = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.012, 0.17), [s.material('#efe8d4'), s.material('#efe8d4'), jacket, s.material('#efe8d4'), s.material('#efe8d4'), s.material('#efe8d4')]);
        half.position.set(x * 0.052, 0.018, 0); half.rotation.z = -x * 0.3; half.castShadow = true;
        book.add(half);
      }
      book.add(s.box([0.016, 0.01, 0.17], [0, 0.037, 0], s.material(spec.band)));
      if (a.book === 'crossword') { const pencil = s.rod([-0.06, 0.03, -0.06], [0.07, 0.022, 0.05], 0.005, s.material('#e3b024')); book.add(pencil); }
      if (seatFree || (a.guard === 'stepped' && a.flask === 'none')) book.position.set(0.05, seatY + (a.chair === 'stool' ? 0.02 : 0.008), 0.05);
      else if (a.guard === 'slumped') book.position.set(0.02, seatY + 0.17, 0.1);
      else book.position.set(-fx * 0.9, 0, 0.16);
      if (a.guard === 'stepped') book.position.set(-fx * 0.95, 0, 0.14);
      book.rotation.y = jitter(1.2);
      s.root.add(book);
    }

    const ex = -fx, ez = -0.08;
    if (a.extra === 'radio') {
      s.box([0.2, 0.13, 0.06], [ex, 0.065, ez], s.material('#6b3a25'));
      s.box([0.1, 0.09, 0.005], [ex - 0.04, 0.065, ez + 0.032], s.material('#c9b98f'));
      s.cylinder(0.022, 0.022, 0.01, [ex + 0.06, 0.08, ez + 0.034], trim, 14).rotation.x = Math.PI / 2;
      s.rod([ex + 0.08, 0.13, ez], [ex + 0.2, 0.42, ez - 0.02], 0.003, s.material('#cfd3d6', { metalness: 0.8 }));
    } else if (a.extra === 'keys') {
      const steel = s.material('#b9bdc0', { metalness: 0.85, roughness: 0.3 });
      const hoop = s.ring(0.06, 0.005, [ex, 0.008, ez + 0.15], steel); hoop.rotation.x = Math.PI / 2;
      for (let i = 0; i < 9; i++) { const t = 0.6 + i * 0.32 + jitter(0.1); s.rod([ex + Math.cos(t) * 0.06, 0.006, ez + 0.15 + Math.sin(t) * 0.06], [ex + Math.cos(t) * 0.14, 0.006, ez + 0.15 + Math.sin(t) * 0.14], 0.005, i % 3 ? steel : trim); s.ball([0.014, 0.004, 0.014], [ex + Math.cos(t) * 0.075, 0.006, ez + 0.15 + Math.sin(t) * 0.075], i % 3 ? steel : trim, 8); }
    } else if (a.extra === 'torch') {
      const body = s.cylinder(0.022, 0.022, 0.2, [ex, 0.035, ez + 0.1], dark, 14); body.rotation.z = Math.PI / 2; body.rotation.y = 0.5;
      const head = s.cylinder(0.035, 0.024, 0.06, [ex + 0.11, 0.035, ez + 0.04], s.material('#b9bdc0', { metalness: 0.8 }), 14); head.rotation.z = -Math.PI / 2; head.rotation.y = 0.5;
      const glow = new THREE.MeshStandardMaterial({ color: '#fff4c2', emissive: '#ffe9a0', emissiveIntensity: 1.6, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
      const beam = s.mesh(new THREE.CircleGeometry(0.34, 20, -0.5, 1.0), glow, [ex + 0.13, 0.004, ez + 0.03]); beam.rotation.set(-Math.PI / 2, 0, 0.5); beam.castShadow = false;
      s.ball([0.03, 0.03, 0.01], [ex + 0.14, 0.035, ez + 0.024], s.material('#fff8d8', { emissive: '#ffefb0', emissiveIntensity: 2 }), 10).rotation.y = 0.5 + Math.PI / 2;
    } else if (a.extra === 'lunch') {
      s.box([0.2, 0.07, 0.14], [ex, 0.035, ez + 0.1], s.material('#3f7f9a'));
      const lidBox = s.box([0.2, 0.012, 0.14], [ex, 0.1, ez + 0.02], s.material('#3f7f9a')); lidBox.rotation.x = 1.1;
      const bread = s.material('#e3c88f');
      s.box([0.09, 0.03, 0.09], [ex + 0.02, 0.085, ez + 0.1], bread).rotation.y = 0.4;
      s.box([0.085, 0.008, 0.085], [ex + 0.02, 0.085, ez + 0.1], s.material('#7fae4a')).rotation.y = 0.4;
    } else if (a.extra === 'shoes') {
      for (const x of [-0.06, 0.06]) { s.ball([0.045, 0.035, 0.12], [x, 0.035, seatD / 2 + 0.22], dark, 12); s.cylinder(0.036, 0.04, 0.03, [x, 0.06, seatD / 2 + 0.16], s.material('#3a3632'), 12); }
    }

    if (a.notice) {
      const card = s.label('BACK IN 5 MIN', 0.2, 0.09, [0, 0, 0], '#27272b', '#f6f1df');
      if (seatFree) { card.position.set(-0.07, seatY + 0.055, -0.04); card.rotation.x = -0.3; }
      else if (a.guard === 'stepped' && !stool) { card.position.set(0.0, backTop - 0.26, backZ + 0.11); card.rotation.x = -0.1; }
      else { card.position.set(side * 0.05, 0.05, seatD / 2 + 0.3); card.rotation.x = -0.45; s.box([0.2, 0.09, 0.006], [side * 0.05, 0.045, seatD / 2 + 0.27], s.material('#d8d2bf')).rotation.x = 0.4; }
      card.rotation.z = jitter(0.12);
    }

    // Dust and a cobweb when the place is worn, or the guard is long gone.
    if (a.guard === 'gone' || mood.wear > 0.75) {
      const web = s.material('#f1efe8', { transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
      const strand = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.3, -0.02), new THREE.Vector2(0.08, -0.1), new THREE.Vector2(0.02, -0.34)])), web);
      strand.position.set(-hx, backTop, backZ);
      chair.add(strand);
    }

    const breathing = a.guard === 'slumped' ? chair.children.filter((c) => (c as THREE.Mesh).material === cloth).slice(0, 2) : [];
    const rate = mix(0.6, 1.5, mood.energy);
    return s.finish({
      footprint: 0.5,
      update: (_dt, time) => {
        const breath = Math.sin(time * rate);
        breathing.forEach((part) => { part.scale.x = (part.userData.sx ??= part.scale.x) * (1 + breath * 0.02); });
        if (a.guard === 'slumped') cap.rotation.x = 0.75 + breath * 0.03;
      },
    });
  },
});
