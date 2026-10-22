import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { type P3, canvasTexture, card, taper } from './lib';

const SPECIES = {
  barn: 'Barn owl: a white heart-shaped face with small black eyes, pale breast and golden wings; ghostly.',
  'great-grey': 'Great grey owl: an enormous round grey face of concentric rings around small yellow eyes, with a white bow-tie.',
  eagle: 'Eagle owl: tawny and heavy with tall ear tufts, a dark-rimmed face and huge orange eyes; imperious.',
  'saw-whet': 'Saw-whet owl: tiny and round-headed with oversized yellow eyes and white streaks, permanently astonished.',
  snowy: 'Snowy owl: white all over with sparse dark flecks and yellow eyes in a smooth round head.',
} as const;
type Species = keyof typeof SPECIES;

interface Look {
  head: number; disc: number; eye: number; eyeX: number; eyeY: number;
  body: string; mark: string; marks: 'spots' | 'bars' | 'streaks'; wing: string;
  face: string; rim: string; iris: string; beak: string;
}
const LOOKS: Record<Species, Look> = {
  barn: { head: 0.085, disc: 1.0, eye: 0.13, eyeX: 0.3, eyeY: 0.12, body: '#efe3c6', mark: '#8a6a3c', marks: 'spots', wing: '#c9984a', face: '#f8f3e6', rim: '#b98445', iris: '#16110e', beak: '#e6d3b4' },
  'great-grey': { head: 0.125, disc: 1.14, eye: 0.1, eyeX: 0.3, eyeY: 0.14, body: '#96928b', mark: '#55514b', marks: 'bars', wing: '#6c6862', face: '#c2beb6', rim: '#4a4641', iris: '#f2cf2e', beak: '#d8c36a' },
  eagle: { head: 0.11, disc: 0.95, eye: 0.2, eyeX: 0.38, eyeY: 0.12, body: '#c0914f', mark: '#33241a', marks: 'streaks', wing: '#6a4728', face: '#cfa066', rim: '#2b1e16', iris: '#f0861a', beak: '#2a2622' },
  'saw-whet': { head: 0.052, disc: 1.0, eye: 0.22, eyeX: 0.4, eyeY: 0.1, body: '#f0e7d3', mark: '#8c5b36', marks: 'streaks', wing: '#7b5334', face: '#d7c09c', rim: '#6d4a2e', iris: '#f6d32b', beak: '#2a2622' },
  snowy: { head: 0.105, disc: 0.86, eye: 0.15, eyeX: 0.36, eyeY: 0.14, body: '#f4f3ee', mark: '#3d3b38', marks: 'bars', wing: '#e9e8e2', face: '#fbfaf6', rim: '#dcdad2', iris: '#f4d21f', beak: '#2a2622' },
};

export default defineThing({
  questions: {
    species: choice('Which owl is it?', SPECIES),
    eyes: choice('What are the eyes doing?', {
      wide: 'Both wide open and fixed on you.',
      wink: 'One eye shut, the other wide: a wink, or half asleep.',
      sleepy: 'Both narrowed to drowsy slits.',
      closed: 'Both fully closed, roosting through the day.',
      membrane: 'Caught mid-blink with a milky third eyelid sliding across.',
      glare: 'Lids slanted down toward the beak in a furious glare.',
    }),
    head: choice('How is the head turned?', {
      level: 'Level and square to the viewer.',
      cocked: 'Cocked to one side, curious.',
      sideways: 'Tilted a full ninety degrees, one eye above the other, the uncanny owl tilt.',
      backward: 'Body facing away, head turned completely backward to look at you over its own spine.',
      aside: 'Turned to look off to one side at something else.',
    }),
    perch: choice('What is it perched on?', {
      stump: 'A bare weathered tree stump.',
      stand: 'A turned wooden museum T-stand with a brass label: a taxidermy mount.',
      glove: "A thick leather falconer's glove with jesses trailing, held on a display arm.",
      books: 'A leaning stack of old cloth-bound books.',
      gravestone: 'The top of a small mossy headstone.',
    }),
    carrying: choice('Is there something in its beak?', {
      nothing: 'Nothing.',
      mouse: 'A limp grey mouse hanging by its scruff.',
      feather: 'A single long feather.',
      key: 'An old brass key on a ribbon.',
      letter: 'A sealed envelope with a red wax seal.',
    }),
    plumage: choice('What condition is the plumage in?', {
      sleek: 'Sleek and tight, feathers lying flat.',
      fluffed: 'Fluffed up round against the cold, almost a ball.',
      ragged: 'Ragged and patchy with feathers sticking out, a moulting or badly stuffed bird.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const look = LOOKS[a.species];
    const R = look.head;
    const fluff = a.plumage === 'fluffed' ? 1.2 : a.plumage === 'ragged' ? 0.95 : 1;
    const dusty = (hex: string) => `#${new THREE.Color(hex).lerp(new THREE.Color('#8f8676'), mood.wear * 0.3).getHexString()}`;

    // ---- Perch -----------------------------------------------------------------------------
    const wood = s.material('#5a3a22', { roughness: 0.6 });
    const brass = s.material('#b9944a', { metalness: 0.8, roughness: 0.3 });
    let top = 0; // where the feet grip
    const grip = R * 0.8; // radius of whatever the toes wrap
    if (a.perch === 'stump') {
      top = R * 3.2;
      const barkMap = canvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#6d5a47'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 90; i++) { ctx.strokeStyle = `rgba(${30 + random() * 40},${22 + random() * 25},15,${0.3 + random() * 0.5})`; ctx.lineWidth = 1 + random() * 4; const x = random() * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + 10, h * 0.3, x - 12, h * 0.6, x + (random() - 0.5) * 20, h); ctx.stroke(); }
      });
      const bark = new THREE.MeshStandardMaterial({ map: barkMap, roughness: 0.95 });
      s.lathe([[R * 2.1, 0], [R * 1.5, R * 0.5], [R * 1.25, R * 1.6], [R * 1.2, top - R * 0.1], [R * 1.1, top], [0, top]], bark);
      s.cylinder(R * 1.08, R * 1.08, 0.004, [0, top + 0.002, 0], s.material('#b89f78', { roughness: 0.9 }), 20);
      for (let i = 0; i < 4; i++) { const angle = i * 1.6 + random(); s.mesh(taper([[Math.cos(angle) * R * 1.3, R * 0.5, Math.sin(angle) * R * 1.3], [Math.cos(angle) * R * 2.2, R * 0.12, Math.sin(angle) * R * 2.2], [Math.cos(angle) * R * 3, 0, Math.sin(angle) * R * 3]], (t) => R * 0.4 * (1 - t * 0.8), { segments: 8, sides: 8 }), bark); }
      s.mesh(taper([[R * 1.1, top * 0.6, 0], [R * 1.9, top * 0.75, R * 0.2], [R * 2.3, top * 1.0, R * 0.3]], (t) => R * 0.22 * (1 - t * 0.7), { segments: 8, sides: 6 }), bark);
    } else if (a.perch === 'stand') {
      top = R * 3.4;
      s.lathe([[R * 1.9, 0], [R * 1.9, R * 0.15], [R * 1.5, R * 0.3], [R * 0.5, R * 0.45], [R * 0.22, R * 0.8], [R * 0.3, R * 1.4], [R * 0.2, R * 1.7], [R * 0.22, top - R * 0.5], [R * 0.34, top - R * 0.3], [0, top - R * 0.25]], wood);
      const bar = s.cylinder(R * 0.3, R * 0.3, R * 3.2, [0, top - R * 0.3, 0], wood, 14);
      bar.rotation.z = Math.PI / 2;
      for (const x of [-1, 1]) s.ball([R * 0.36, R * 0.36, R * 0.36], [x * R * 1.6, top - R * 0.3, 0], wood, 10);
      const label = card([a.species === 'barn' ? 'Tyto alba' : a.species === 'great-grey' ? 'Strix nebulosa' : a.species === 'eagle' ? 'Bubo bubo' : a.species === 'snowy' ? 'Bubo scandiacus' : 'Aegolius acadicus', `coll. ${1860 + Math.floor(random() * 70)}`], R * 2.2, R * 0.9, '#33250c', '#c9a857');
      label.position.set(0, R * 0.62, R * 1.62);
      label.rotation.x = -0.75;
      s.root.add(label);
    } else if (a.perch === 'glove') {
      top = R * 4.2;
      const leather = s.material('#8a5a2c', { roughness: 0.8 });
      const dark = s.material('#2b2a2b', { metalness: 0.5, roughness: 0.5 });
      s.cylinder(R * 1.5, R * 1.6, R * 0.2, [-R * 2.2, R * 0.1, 0], dark, 24);
      s.rod([-R * 2.2, R * 0.2, 0], [-R * 2.2, top - R * 1.2, 0], R * 0.14, dark);
      // Cuff along x, fist at the origin.
      const cuff = s.mesh(new THREE.LatheGeometry([[R * 0.75, 0], [R * 0.72, R * 1.6], [R * 0.95, R * 3.2], [R * 1.25, R * 4.2], [R * 1.2, R * 4.25]].map(([x, y]) => new THREE.Vector2(x, y)), 20), leather, [-R * 0.2, top - R * 0.85, 0]);
      cuff.rotation.z = Math.PI / 2;
      (cuff.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      s.ball([R * 1.0, R * 0.85, R * 0.9], [0, top - R * 0.85, 0], leather, 14);
      s.mesh(taper([[-R * 0.3, top - R * 0.6, R * 0.6], [R * 0.3, top - R * 0.4, R * 0.95], [R * 0.9, top - R * 0.5, R * 0.75]], (t) => R * 0.3 * (1 - t * 0.3), { segments: 8, sides: 8 }), leather);
      for (let i = 0; i < 4; i++) s.ball([R * 0.3, R * 0.28, R * 0.32], [R * 0.75, top - R * (0.45 + i * 0.28), R * (0.35 - i * 0.22)], leather, 8);
      // Jesses and a bell.
      const strap = s.material('#3d2817', { roughness: 0.9 });
      for (const x of [-1, 1]) s.tube([[x * R * 0.3, top + R * 0.2, R * 0.2], [x * R * 0.45, top - R * 0.6, R * 1.0], [x * R * 0.2 - R * 0.4, top - R * 2.0, R * 1.05], [x * R * 0.3 - R * 0.6, top - R * 3.0 - random() * R, R * 0.95]], R * 0.045, strap);
      s.ball([R * 0.14, R * 0.14, R * 0.14], [R * 0.3, top + R * 0.12, R * 0.45], brass, 8);
      for (let i = 0; i < 5; i++) s.rod([-R * (3.2 + i * 0.22), top - R * 1.95, R * 0.4], [-R * (3.2 + i * 0.22), top + R * 0.2, R * 0.55], R * 0.02, strap);
    } else if (a.perch === 'books') {
      const cloths = ['#6d1f24', '#1f3d35', '#2a3358', '#7a5a22', '#3b2a22', '#5b2d4d'];
      const count = 3 + Math.floor(random() * 3);
      let y = 0;
      for (let i = 0; i < count; i++) {
        const h = R * (0.5 + random() * 0.5), w = R * (3.6 - i * 0.25 + random() * 0.5), d = R * (2.7 - i * 0.15 + random() * 0.3);
        const book = new THREE.Group();
        book.position.set((random() - 0.5) * R * 0.5, y, (random() - 0.5) * R * 0.3);
        book.rotation.y = (random() - 0.5) * 0.7;
        const cloth = s.material(cloths[Math.floor(random() * cloths.length)], { roughness: 0.8 });
        const cover = s.box([w, h, d], [0, h / 2, 0], cloth);
        const pages = s.box([w * 0.94, h * 0.78, d * 0.96], [w * 0.035, h / 2, 0.012 * (R / 0.08)], s.material('#e3d7b8', { roughness: 0.95 }));
        const band = s.box([0.004, h * 0.9, d * 0.5], [-w / 2 - 0.001, h / 2, 0], brass);
        book.add(cover, pages, band);
        s.root.add(book);
        y += h;
      }
      top = y;
    } else {
      top = R * 4.4;
      const stoneMap = canvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#9a9a92'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(${random() > 0.6 ? '70,95,55' : '60,60,58'},${0.08 + random() * 0.2})`; ctx.beginPath(); ctx.arc(random() * w, h - Math.pow(random(), 1.6) * h, 3 + random() * 12, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#3f3f3b'; ctx.textAlign = 'center'; ctx.font = 'bold 30px serif';
        ctx.fillText('IN MEMORY', w / 2, 90); ctx.font = 'italic 24px serif'; ctx.fillText('of one who', w / 2, 126); ctx.fillText('kept watch', w / 2, 154);
      });
      const stone = new THREE.MeshStandardMaterial({ map: stoneMap, roughness: 0.95 });
      const outline = new THREE.Shape();
      const hw = R * 2.2;
      outline.moveTo(-hw, 0); outline.lineTo(hw, 0); outline.lineTo(hw, top - hw * 0.6); outline.quadraticCurveTo(hw, top, 0, top); outline.quadraticCurveTo(-hw, top, -hw, top - hw * 0.6);
      const slabGeometry = new THREE.ExtrudeGeometry(outline, { depth: R * 0.9, bevelEnabled: true, bevelSize: R * 0.08, bevelThickness: R * 0.08, bevelSegments: 1 });
      const uv = slabGeometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / (hw * 2) + 0.5, uv.getY(i) / top);
      const slab = s.mesh(slabGeometry, stone, [0, 0, -R * 0.45]);
      slab.rotation.z = (random() - 0.5) * 0.08;
      s.ball([R * 3, R * 0.35, R * 1.6], [0, 0, 0], s.material('#5d6f42', { roughness: 1 }), 12);
    }

    // ---- Bird ------------------------------------------------------------------------------
    const bird = new THREE.Group();
    bird.position.y = top;
    s.root.add(bird);
    const put = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = bird) => { parent.add(node); return node; };

    const plumageMap = canvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = dusty(look.body); ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = ctx.fillStyle = look.mark;
      const n = a.species === 'snowy' ? 60 : look.marks === 'spots' ? 70 : 150;
      for (let i = 0; i < n; i++) {
        const x = random() * w, y = random() * h;
        ctx.globalAlpha = 0.45 + random() * 0.5;
        if (look.marks === 'spots') { ctx.beginPath(); ctx.arc(x, y, 1.5 + random() * 2, 0, 7); ctx.fill(); }
        else if (look.marks === 'bars') { ctx.lineWidth = 2 + random() * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10, y + 5, x + 20 + random() * 12, y); ctx.stroke(); }
        else { ctx.lineWidth = 2 + random() * 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 4, y + 14 + random() * 26); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
    });
    const plumage = new THREE.MeshStandardMaterial({ map: plumageMap, roughness: 0.95 });
    const wingPaint = s.material(look.wing, { roughness: 0.95 });
    const dark = s.material('#1b1714', { roughness: 0.4 });

    const body = new THREE.Group();
    put(body);
    const torso = put(s.lathe([[0, 0], [0.55, 0.04], [0.92, 0.55], [1.0, 1.2], [0.86, 1.9], [0.6, 2.3], [0, 2.42]].map(([x, y]) => [x * R * fluff, y * R] as const), plumage), body);
    torso.scale.z = 0.86;
    torso.rotation.y = -Math.PI / 2;
    for (const side of [-1, 1]) {
      const wing = put(s.ball([R * 0.32, R * 1.15, R * 0.78], [side * R * 0.86 * fluff, R * 1.25, -R * 0.22], wingPaint, 14), body);
      wing.rotation.set(0.25, 0, side * 0.14);
      for (let i = 0; i < 3; i++) put(s.ball([R * 0.1, R * 0.55, R * 0.26], [side * R * (0.92 - i * 0.07) * fluff, R * (0.75 - i * 0.2), -R * (0.3 + i * 0.18)], s.material(i % 2 ? look.wing : look.mark, { roughness: 0.95 }), 8), body).rotation.x = 0.5;
    }
    put(s.box([R * 0.9, R * 0.08, R * 0.9], [0, R * 0.05, -R * 0.85], wingPaint), body).rotation.x = -0.9;
    // Toes over the edge of the perch.
    const horn = s.material('#c9b27a', { roughness: 0.6 });
    for (const side of [-1, 1]) for (let toe = -1; toe <= 1; toe++) {
      const x = side * R * 0.42 + toe * R * 0.16;
      put(s.mesh(taper([[x, R * 0.12, R * 0.3], [x + toe * R * 0.05, R * 0.1, R * 0.62], [x + toe * R * 0.08, -R * 0.08, R * 0.82]], (t) => R * 0.085 * (1 - t * 0.4), { segments: 6, sides: 6 }), horn), body);
      put(s.mesh(taper([[x + toe * R * 0.08, -R * 0.06, R * 0.82], [x + toe * R * 0.09, -R * 0.2, R * 0.86], [x + toe * R * 0.09, -R * 0.3, R * 0.76]], (t) => R * 0.045 * (1 - t * 0.9), { segments: 5, sides: 5 }), dark), body);
    }
    if (a.plumage === 'ragged') {
      for (let i = 0; i < 14; i++) {
        const angle = random() * 6.3, y = R * (0.4 + random() * 1.8);
        const quill = put(s.box([R * 0.05, R * 0.5, R * 0.14], [Math.cos(angle) * R * 0.95, y, Math.sin(angle) * R * 0.8], i % 3 ? plumage : wingPaint), body);
        quill.rotation.set(random() * 1.2 - 0.6, -angle, 0.8 + random());
      }
    }

    // Head: a pivot so it can tilt and turn independently of the body.
    const head = new THREE.Group();
    head.position.set(0, R * 2.72, R * 0.06);
    put(head);
    const skull = put(s.ball([R * Math.max(1.06, look.disc * 1.03) * fluff, R * 0.85, R * Math.max(0.98, look.disc * 1.0) * (a.species === 'barn' ? 1.04 : 1)], [0, 0, -R * 0.08], plumage, 20), head);
    skull.rotation.x = -Math.PI / 2;

    // The facial disc: a shallow bowl with a central ridge, painted with feather rays.
    const heart = a.species === 'barn';
    const outline = (phi: number) => {
      const sin = Math.sin(phi);
      return look.disc * (heart ? 1 - 0.3 * Math.pow(Math.max(0, sin), 7) + 0.3 * Math.pow(Math.max(0, -sin), 2.2) - 0.1 * Math.pow(Math.abs(Math.cos(phi)), 2) * (sin < 0 ? 1 : 0) : 1 - 0.07 * Math.pow(Math.max(0, sin), 3));
    };
    // The disc hugs the front of the skull: flat in the middle, falling back to meet the head at its rim,
    // with a shallow dish around each eye and a ridge down to the beak.
    const depth = (x: number, y: number, rho: number) => R * (1.0 - 0.7 * Math.pow(rho, 2.6)
      - 0.07 * Math.exp(-(((Math.abs(x) - look.eyeX) ** 2 + (y - look.eyeY) ** 2) / 0.07))
      + 0.1 * Math.exp(-((x / 0.15) ** 2)) * THREE.MathUtils.smoothstep(0.5 - y, 0, 0.5));
    const discZ = 0;
    const rings = 10, spokes = 48;
    const position: number[] = [0, 0, depth(0, 0, 0)], uv: number[] = [0.5, 0.5], index: number[] = [];
    const rim: P3[] = [];
    for (let ring = 1; ring <= rings; ring++)
      for (let k = 0; k < spokes; k++) {
        const phi = (k / spokes) * Math.PI * 2, rho = ring / rings, r = outline(phi) * rho;
        const x = Math.cos(phi) * r, y = Math.sin(phi) * r;
        position.push(x * R, y * R, depth(x, y, rho));
        uv.push(x / 2.8 + 0.5, y / 2.8 + 0.5);
        if (ring === rings && k % 3 === 0) rim.push([x * R, y * R, depth(x, y, rho) + discZ]);
      }
    for (let k = 0; k < spokes; k++) index.push(0, 1 + k, 1 + ((k + 1) % spokes));
    for (let ring = 0; ring < rings - 1; ring++)
      for (let k = 0; k < spokes; k++) {
        const p = 1 + ring * spokes + k, q = 1 + ring * spokes + ((k + 1) % spokes);
        index.push(p, p + spokes, q, q, p + spokes, q + spokes);
      }
    const discGeometry = new THREE.BufferGeometry();
    discGeometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    discGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    discGeometry.setIndex(index);
    discGeometry.computeVertexNormals();
    const faceMap = canvasTexture(512, 512, (ctx, w) => {
      const px = (x: number) => (x / 2.8 + 0.5) * w, py = (y: number) => (0.5 - y / 2.8) * w, unit = w / 2.8;
      ctx.fillStyle = dusty(look.face); ctx.fillRect(0, 0, w, w);
      for (const side of [-1, 1]) {
        const cx = px(side * look.eyeX), cy = py(look.eyeY);
        // Feather rays out of each eye.
        for (let i = 0; i < 90; i++) {
          const angle = random() * 6.3, from = unit * (look.eye + 0.02), to = unit * (0.5 + random() * 0.75);
          ctx.strokeStyle = look.rim; ctx.globalAlpha = a.species === 'barn' || a.species === 'snowy' ? 0.08 : 0.2; ctx.lineWidth = 1 + random() * 2;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle) * from, cy + Math.sin(angle) * from); ctx.lineTo(cx + Math.cos(angle) * to, cy + Math.sin(angle) * to); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (a.species === 'great-grey') {
          ctx.strokeStyle = look.rim; ctx.lineWidth = 5;
          for (let ring = 1; ring <= 6; ring++) { ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.arc(cx, cy, unit * (look.eye + 0.02 + ring * 0.105), 0, 7); ctx.stroke(); }
          ctx.globalAlpha = 1;
          // White brows and the bow tie.
          ctx.strokeStyle = '#f4f2ec'; ctx.lineWidth = 12;
          ctx.beginPath(); ctx.arc(cx - side * unit * 0.02, cy, unit * (look.eye + 0.1), side > 0 ? Math.PI * 0.75 : -Math.PI * 0.35, side > 0 ? Math.PI * 1.35 : Math.PI * 0.25); ctx.stroke();
          ctx.fillStyle = '#f4f2ec'; ctx.beginPath(); ctx.ellipse(px(side * 0.3), py(-0.62), unit * 0.26, unit * 0.09, side * 0.25, 0, 7); ctx.fill();
        }
        if (a.species === 'barn') {
          ctx.fillStyle = 'rgba(150,95,50,0.5)'; ctx.beginPath(); ctx.ellipse(cx - side * unit * 0.12, cy + unit * 0.02, unit * 0.1, unit * 0.2, side * 0.5, 0, 7); ctx.fill();
        }
        if (a.species === 'saw-whet' || a.species === 'eagle') {
          ctx.strokeStyle = '#f6f0e2'; ctx.lineWidth = 9; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(px(side * 0.06), py(-0.1)); ctx.quadraticCurveTo(px(side * 0.12), py(0.35), px(side * 0.5), py(0.5)); ctx.stroke();
        }
      }
      if (a.species === 'great-grey') { ctx.fillStyle = '#1f1c1a'; ctx.beginPath(); ctx.ellipse(px(0), py(-0.6), unit * 0.07, unit * 0.12, 0, 0, 7); ctx.fill(); }
      // A darker edge so the disc reads against the head.
      const edge = ctx.createRadialGradient(px(0), py(0), unit * 0.7, px(0), py(0), unit * 1.25);
      edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, look.rim);
      ctx.globalAlpha = a.species === 'snowy' ? 0.2 : 0.5; ctx.fillStyle = edge; ctx.fillRect(0, 0, w, w); ctx.globalAlpha = 1;
    });
    const face = put(new THREE.Mesh(discGeometry, new THREE.MeshStandardMaterial({ map: faceMap, roughness: 0.9 })), head);
    face.position.z = discZ;
    face.receiveShadow = true;
    put(s.tube(rim, R * 0.065, s.material(new THREE.Color(look.rim).lerp(new THREE.Color(look.body), a.species === 'eagle' || a.species === 'great-grey' ? 0.25 : 0.5), { roughness: 0.95 }), true), head);

    // Ear tufts.
    if (a.species === 'eagle') for (const side of [-1, 1]) {
      const tuft = put(s.mesh(taper([[side * R * 0.55, R * 0.6, R * 0.2], [side * R * 0.8, R * 1.2, R * 0.15], [side * R * 1.15, R * 1.75, R * 0.05]], (t) => R * 0.26 * (1 - t * 0.92), { segments: 10, sides: 8, flat: 0.4 }), s.material(look.mark, { roughness: 0.95 })), head);
      tuft.castShadow = true;
    }
    if (a.plumage === 'ragged') for (let i = 0; i < 5; i++) put(s.box([R * 0.04, R * 0.4, R * 0.1], [(random() - 0.5) * R * 1.4, R * 0.9, (random() - 0.5) * R * 0.6], plumage), head).rotation.z = random() - 0.5;

    // Eyes with lids.
    const lids: Record<typeof a.eyes, [number, number][]> = {
      wide: [[0.14, 0.08], [0.14, 0.08]], wink: [[0.62, 0.42], [0.12, 0.06]], sleepy: [[0.43, 0.36], [0.43, 0.36]],
      closed: [[0.6, 0.42], [0.6, 0.42]], membrane: [[0.2, 0.1], [0.2, 0.1]], glare: [[0.36, 0.12], [0.36, 0.12]],
    };
    const flip = random() > 0.5;
    const iris = new THREE.MeshStandardMaterial({ color: look.iris, roughness: 0.15, emissive: look.iris, emissiveIntensity: a.species === 'barn' ? 0 : mix(0.05, 0.35, 1 - mood.daylight * 0.5) });
    const lidPaint = s.material(dusty(look.face), { roughness: 0.95, side: THREE.DoubleSide });
    [-1, 1].forEach((side, n) => {
      const r = look.eye * R * 1.3;
      const eye = new THREE.Group();
      eye.position.set(side * look.eyeX * R, look.eyeY * R, discZ + depth(side * look.eyeX, look.eyeY, 0.4) + r * 0.2);
      eye.scale.z = 0.6;
      put(eye, head);
      put(new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), iris), eye);
      if (a.species !== 'barn') put(new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 14, 10), dark), eye).position.z = r * 0.62;
      const glint = put(new THREE.Mesh(new THREE.SphereGeometry(r * 0.14, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.6 })), eye);
      glint.position.set(-r * 0.3, r * 0.38, r * 1.0);
      const [upper, lower] = lids[a.eyes][(flip ? 1 - n : n)];
      const topLid = put(new THREE.Mesh(new THREE.SphereGeometry(r * 1.1, 18, 10, 0, Math.PI * 2, 0, Math.PI * upper), lidPaint), eye);
      if (a.eyes === 'glare') topLid.rotation.z = side * 0.6;
      const lowLid = put(new THREE.Mesh(new THREE.SphereGeometry(r * 1.1, 18, 10, 0, Math.PI * 2, 0, Math.PI * lower), lidPaint), eye);
      lowLid.rotation.z = Math.PI;
      if (a.eyes === 'membrane') {
        const film = put(new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 18, 10, 0, Math.PI * 2, 0, Math.PI * (n === 0 ? 0.62 : 0.4)), new THREE.MeshStandardMaterial({ color: '#cfd9e2', roughness: 0.3, transparent: true, opacity: 0.82 })), eye);
        film.rotation.z = side * 1.1;
      }
      // A dark ring of skin around the eye.
      const ring = put(new THREE.Mesh(new THREE.TorusGeometry(r * 1.08, r * 0.1, 6, 24), dark), eye);
      ring.position.z = r * 0.1;
    });

    // Beak: a short hook down the ridge.
    const beakPaint = s.material(look.beak, { roughness: 0.4 });
    const beakTop: P3 = [0, -R * 0.02, R * 1.07];
    const beakTip: P3 = [0, -R * 0.52, R * 1.03];
    put(s.mesh(taper([beakTop, [0, -R * 0.22, R * 1.2], beakTip], (t) => R * 0.15 * (1 - t * 0.85), { segments: 10, sides: 8, flat: 0.8 }), beakPaint), head);

    // Something carried.
    if (a.carrying !== 'nothing') {
      const item = new THREE.Group();
      item.position.set(beakTip[0], beakTip[1], beakTip[2]);
      put(item, head);
      const u = R; // carried things scale with the bird
      if (a.carrying === 'mouse') {
        const fur = s.material('#8d8880', { roughness: 1 });
        put(s.ball([u * 0.28, u * 0.5, u * 0.26], [0, -u * 0.5, 0], fur, 12), item);
        put(s.ball([u * 0.18, u * 0.2, u * 0.18], [0, -u * 0.05, u * 0.05], fur, 10), item);
        for (const x of [-1, 1]) put(s.ball([u * 0.09, u * 0.09, u * 0.03], [x * u * 0.14, u * 0.02, 0], s.material('#d7a6a0'), 8), item);
        put(s.tube([[0, -u * 0.95, 0], [u * 0.08, -u * 1.3, 0.01], [-u * 0.05, -u * 1.7, 0]], u * 0.025, s.material('#c79a94')), item);
        for (const x of [-1, 1]) put(s.rod([x * u * 0.2, -u * 0.75, u * 0.1], [x * u * 0.26, -u * 0.98, u * 0.14], u * 0.03, s.material('#d7a6a0')), item);
      } else if (a.carrying === 'feather') {
        const vane = new THREE.Shape();
        vane.moveTo(0, 0); vane.quadraticCurveTo(u * 0.35, -u * 0.6, u * 0.06, -u * 1.8); vane.quadraticCurveTo(-u * 0.3, -u * 0.7, 0, 0);
        const feather = put(s.mesh(new THREE.ShapeGeometry(vane), s.material(a.species === 'snowy' ? '#2e2c2a' : '#f4f1e8', { side: THREE.DoubleSide })), item);
        feather.rotation.z = 0.5;
        put(s.rod([0, 0, 0.002], [u * 0.75, -u * 1.5, 0.002], u * 0.015, horn), item);
      } else if (a.carrying === 'key') {
        put(s.tube([[0, 0, 0], [u * 0.12, -u * 0.3, 0], [0, -u * 0.6, 0]], u * 0.03, s.material('#8c1f2a')), item);
        put(s.ring(u * 0.2, u * 0.05, [0, -u * 0.8, 0], brass), item);
        put(s.rod([0, -u * 1.0, 0], [0, -u * 1.9, 0], u * 0.05, brass), item);
        for (const y of [1.6, 1.8]) put(s.box([u * 0.2, u * 0.08, u * 0.05], [u * 0.12, -u * y, 0], brass), item);
      } else {
        const paper = put(s.box([u * 1.5, u * 0.95, u * 0.03], [0, -u * 0.42, u * 0.02], s.material('#f1e8d0', { roughness: 0.9 })), item);
        paper.rotation.z = 0.12;
        put(s.cylinder(u * 0.16, u * 0.16, u * 0.035, [u * 0.02, -u * 0.5, u * 0.045], s.material('#a31621', { roughness: 0.4 }), 14), item).rotation.x = Math.PI / 2;
        put(s.rod([-u * 0.7, -u * 0.02, u * 0.04], [0, -u * 0.5, u * 0.04], u * 0.008, s.material('#b9ad92')), item);
        put(s.rod([u * 0.72, -u * 0.2, u * 0.04], [0, -u * 0.5, u * 0.04], u * 0.008, s.material('#b9ad92')), item);
      }
    }

    // Pose.
    const roll = { level: 0, cocked: 0.42, sideways: Math.PI / 2, backward: 0.06, aside: 0.08 }[a.head] * (random() > 0.5 ? 1 : -1);
    const yaw = a.head === 'aside' ? (random() > 0.5 ? 1 : -1) * 0.95 : 0;
    head.rotation.set(a.head === 'sideways' ? 0 : -0.04, yaw, roll);
    if (a.head === 'backward') { body.rotation.y = Math.PI + (random() - 0.5) * 0.3; head.position.z = -R * 0.06; }
    if (a.head === 'sideways') head.position.y += R * 0.08;

    const sway = mix(0, 0.16, mood.energy), phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        head.rotation.y = yaw + Math.sin(time * 0.9 + phase) * sway;
        head.position.x = Math.sin(time * 1.8 + phase) * sway * R * 0.5;
      },
    });
  },
});
