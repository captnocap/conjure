import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const HERO = {
  kitchen: 'KITCHEN', moms: "MOM'S", photos: 'PHOTOS', donot: 'DO NOT OPEN', xmas: 'XMAS', baby: 'BABY', his: 'HIS', taxes: 'TAXES 2009', keep: 'KEEP?',
} as const;
const OTHERS = ['BOOKS', 'MISC', 'BATHROOM', 'LINENS', 'GARAGE', 'FRAGILE', 'DESK', 'WINTER', 'CABLES', 'TOYS', 'ATTIC', 'DONATE', 'PLATES', 'OFFICE'];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    arrangement: choice('How are the boxes arranged?', {
      pyramid: 'A tidy pyramid, big boxes at the bottom, squared up.',
      tower: 'One tall column that leans and should not be standing.',
      sprawl: 'Spread low across the floor, mid-sort, nothing on top of anything.',
      wall: 'A flat wall of boxes two deep, like the back of a storage unit.',
      pair: 'Just two boxes, one on the other: all that is left.',
    }),
    headline: choice('What does the box facing us say?', {
      kitchen: 'KITCHEN: ordinary, practical.',
      moms: "MOM'S: somebody else's things, inherited.",
      photos: 'PHOTOS: the box you save from a fire.',
      donot: 'DO NOT OPEN: underlined twice.',
      xmas: 'XMAS: once a year, or not at all any more.',
      baby: 'BABY: outgrown, or never used.',
      his: 'HIS: divided property.',
      taxes: 'TAXES 2009: paperwork nobody will read again.',
      keep: 'KEEP? with a question mark.',
    }),
    hand: choice('How are the labels written?', {
      block: 'Neat black block capitals, the same on every box.',
      scrawl: 'A fast slanted scrawl, written against a knee.',
      crayon: 'Coloured crayon in a child\'s wobbly letters.',
      sticker: 'Printed white stickers with a colour stripe, a system.',
    }),
    cardboard: choice('What are the boxes?', {
      brown: 'Plain new brown moving cartons.',
      mixed: 'Whatever was free: liquor-store and supermarket boxes with printed sides.',
      white: 'White archive boxes with hand holes.',
      branded: 'Matching rental-company cartons with a printed stripe.',
    }),
    spill: choice('One box has split open. What has spilled from it?', {
      sealed: 'Nothing: every box is still taped shut.',
      photos: 'Loose photographs fanned across the floor.',
      books: 'Paperbacks and a few hardbacks.',
      baubles: 'Christmas baubles and a rope of tinsel.',
      clothes: 'Folded clothes and a single shoe.',
      trophies: 'Small gold trophies and medals on ribbons.',
      toys: 'Wooden blocks and a toy car.',
      letters: 'Bundles of letters tied with string.',
    }),
    history: choice('What has happened to the stack?', {
      fresh: 'Packed this morning, tape still bright.',
      stored: 'Left for years: dust on every top, a cobweb in the corner.',
      damp: 'Water has got in: the bottom boxes are dark and sagging.',
      rummaged: 'Someone has been through them: flaps up, tape slit.',
    }),
    tools: noul('Have a tape gun and a marker been left on top?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const palette = { brown: ['#b88f5c', '#b08653', '#bf9763'], mixed: ['#b88f5c', '#9c7647', '#cdb48a', '#a67c4b', '#d9cdb0'], white: ['#ece8dc', '#e6e1d2'], branded: ['#c49b6a', '#c09664'] }[a.cardboard];
    const stripe = mood.cheer > 0.5 ? '#e8742a' : '#2f5fa8';
    const others = [...OTHERS].sort(() => random() - 0.5);
    let labelIndex = 0;

    const labelTexture = (text: string, tint: string, damp: boolean) => paint(256, 160, (ctx) => {
      ctx.fillStyle = tint; ctx.fillRect(0, 0, 256, 160);
      if (a.cardboard === 'branded') { ctx.fillStyle = stripe; ctx.fillRect(0, 128, 256, 18); }
      if (a.cardboard === 'mixed' && random() < 0.5) { ctx.fillStyle = pick(['#a8342f', '#2f6f4a', '#1d2d5a']); ctx.globalAlpha = 0.75; ctx.fillRect(0, 0, 256, 34); ctx.globalAlpha = 1; }
      if (a.cardboard === 'white') { ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.ellipse(128, 34, 30, 9, 0, 0, Math.PI * 2); ctx.fill(); }
      if (text) {
        const size = Math.min(70, 300 / text.length + 12);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.translate(128, 86);
        if (a.hand === 'sticker') {
          ctx.fillStyle = '#f7f5ee'; ctx.fillRect(-110, -40, 220, 80);
          ctx.fillStyle = pick(['#c8372e', '#2f6fb5', '#3d8a55', '#e0a21f']); ctx.fillRect(-110, -40, 16, 80);
          ctx.fillStyle = '#1b1b1b'; ctx.font = `bold ${size * 0.72}px monospace`; ctx.fillText(text, 6, 2, 190);
        } else if (a.hand === 'crayon') {
          ctx.rotate((random() - 0.5) * 0.25);
          ctx.font = `bold ${size}px sans-serif`;
          const each = 220 / text.length;
          [...text].forEach((letter, i) => { ctx.fillStyle = pick(['#c8372e', '#2f6fb5', '#3d8a55', '#7a3fa0', '#d9731f']); ctx.fillText(letter, (i - (text.length - 1) / 2) * Math.min(each, size * 0.7), (random() - 0.5) * 14); });
        } else {
          ctx.rotate(a.hand === 'scrawl' ? -0.1 + (random() - 0.5) * 0.2 : (random() - 0.5) * 0.04);
          ctx.fillStyle = '#18161a';
          ctx.font = a.hand === 'scrawl' ? `italic bold ${size}px serif` : `bold ${size}px sans-serif`;
          ctx.fillText(text, 0, 0, 236);
          if (text.startsWith('DO NOT')) { ctx.fillRect(-105, size * 0.5, 210, 5); ctx.fillRect(-100, size * 0.5 + 10, 200, 5); }
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      if (damp) { const g = ctx.createLinearGradient(0, 60, 0, 160); g.addColorStop(0, 'rgba(60,40,20,0)'); g.addColorStop(0.4, 'rgba(60,40,20,0.5)'); g.addColorStop(1, 'rgba(50,34,18,0.7)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 160); }
    });

    const tape = s.material(a.history === 'fresh' ? '#e2d49a' : '#cfc5a2', { roughness: 0.35 });
    const dust = s.material('#d8d4c8', { roughness: 1, transparent: true, opacity: 0.55, depthWrite: false });
    const inside = s.material('#5c452a', { roughness: 1 });

    /** One carton, standing on y = 0 of its own group. */
    const carton = (w: number, h: number, d: number, opts: { text?: string; open?: boolean; damp?: boolean } = {}) => {
      const g = new THREE.Group();
      const add = <T extends THREE.Object3D>(mesh: T) => { s.root.remove(mesh); g.add(mesh); return mesh; };
      const bodyMat = s.material(opts.damp ? `#${new THREE.Color(pick(palette)).multiplyScalar(0.62).getHexString()}` : pick(palette), { roughness: 0.92 });
      const tint = `#${bodyMat.color.getHexString()}`;
      const crush = (opts.damp ? 0.07 : 0) + mood.wear * 0.035;
      const geometry = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
      const offsets = new Map<string, [number, number, number]>();
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
        if (!offsets.has(key)) offsets.set(key, [(random() - 0.5) * crush, (random() - 0.5) * crush, (random() - 0.5) * crush]);
        const o = offsets.get(key)!;
        const lift = p.getY(i) > -h / 2 + 0.001 ? 1 : 0; // keep the base flat
        p.setXYZ(i, p.getX(i) + o[0] * lift, p.getY(i) + (p.getY(i) > 0.001 ? -Math.abs(o[1]) : 0) * lift, p.getZ(i) + o[2] * lift);
      }
      geometry.computeVertexNormals();
      const body = add(s.mesh(geometry, bodyMat, [0, h / 2, 0]));
      const text = opts.text ?? (random() < 0.75 ? others[labelIndex++ % others.length] : '');
      const face = add(s.mesh(new THREE.PlaneGeometry(w * 0.94, h * 0.9), new THREE.MeshStandardMaterial({ map: labelTexture(text, tint, !!opts.damp), roughness: 0.92 }), [0, h / 2, d / 2 + 0.004 + crush * 0.5]));
      face.castShadow = false;
      if (opts.open) {
        add(s.box([w - 0.02, 0.004, d - 0.02], [0, h + 0.002, 0], inside));
        const flap = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.92, side: THREE.DoubleSide });
        const lift = () => 0.5 + random() * 1.5;
        for (const side of [-1, 1]) {
          const fa = new THREE.Group(); fa.position.set(side * w / 2, h, 0); fa.rotation.z = -side * lift();
          const m = add(s.box([w / 2, 0.006, d], [side * -w / 4, 0, 0], flap)); g.remove(m); fa.add(m); g.add(fa);
          const fb = new THREE.Group(); fb.position.set(0, h, side * d / 2); fb.rotation.x = side * lift();
          const n = add(s.box([w, 0.006, d / 2], [0, 0, side * -d / 4], flap)); g.remove(n); fb.add(n); g.add(fb);
        }
      } else {
        add(s.box([0.055, 0.004, d + 0.006], [0, h + 0.002 - crush * 0.4, 0], tape));
        add(s.box([0.055, h * 0.22, 0.004], [0, h * 0.9, d / 2 + 0.006 + crush * 0.5], tape));
        if (a.history === 'stored') add(s.box([w * 0.96, 0.003, d * 0.96], [0, h + 0.005, 0], dust));
      }
      void body;
      return { g, w, h, d };
    };
    const place = (c: ReturnType<typeof carton>, x: number, y: number, z: number, turn = 0) => {
      c.g.position.set(x, y, z); c.g.rotation.y = turn; s.root.add(c.g);
    };
    const size = (big = 1) => [0.4 + random() * 0.16 * big, 0.3 + random() * 0.14, 0.36 + random() * 0.1] as const;
    const heroText = HERO[a.headline];
    const rummage = () => a.history === 'rummaged' && random() < 0.6;
    const jitter = mix(0.02, 0.09, mood.wear) + mix(0, 0.05, mood.energy);
    let topSpot: [number, number, number] = [0, 0.4, 0];

    if (a.arrangement === 'pyramid') {
      const base = Math.round(mix(2, 4, mood.density));
      let made = 0;
      for (let row = 0; row < base; row++) {
        const n = base - row, y0 = row * 0.36;
        for (let i = 0; i < n; i++) {
          const hero = row === Math.min(1, base - 1) && i === Math.floor((n - 1) / 2) && !made;
          if (hero) made = 1;
          const c = carton(0.5, 0.36 - 0.002, 0.42, { text: hero ? heroText : undefined, damp: a.history === 'damp' && row === 0, open: row === base - 1 && rummage() });
          place(c, (i - (n - 1) / 2) * 0.53 + (random() - 0.5) * jitter, y0, (random() - 0.5) * jitter, (random() - 0.5) * jitter * 2);
          if (row === base - 1) topSpot = [c.g.position.x, y0 + 0.36, 0];
        }
      }
    } else if (a.arrangement === 'tower') {
      const n = Math.round(mix(4, 7, mood.density));
      let y = 0, x = 0;
      for (let i = 0; i < n; i++) {
        const [w, h, d] = size(1 - i / n);
        const c = carton(w, h, d, { text: i === 1 ? heroText : undefined, damp: a.history === 'damp' && i === 0, open: i === n - 1 && rummage() });
        x += (random() - 0.3) * 0.07;
        place(c, x, y, (random() - 0.5) * 0.06, (random() - 0.5) * 0.5);
        c.g.rotation.z = -i * 0.012;
        y += h - 0.004;
        topSpot = [x, y, 0];
      }
    } else if (a.arrangement === 'sprawl') {
      const n = Math.round(mix(4, 8, mood.density));
      for (let i = 0; i < n; i++) {
        const [w, h, d] = size();
        const col = i % 4, row = Math.floor(i / 4);
        const c = carton(w, h, d, { text: i === 1 ? heroText : undefined, damp: a.history === 'damp' && random() < 0.5, open: i !== 1 && (rummage() || random() < 0.25) });
        place(c, (col - 1.5) * 0.66 + (random() - 0.5) * 0.15, 0, -row * 0.62 + (random() - 0.5) * 0.15, (random() - 0.5) * 0.9);
        if (i === 0) topSpot = [c.g.position.x, h, c.g.position.z];
      }
    } else if (a.arrangement === 'wall') {
      const cols = 3, rows = Math.round(mix(2, 4, mood.density));
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        if (row === rows - 1 && random() < 0.35 && col !== 1) continue;
        const hero = row === Math.min(1, rows - 1) && col === 1;
        const c = carton(0.52, 0.38, 0.44, { text: hero ? heroText : undefined, damp: a.history === 'damp' && row === 0, open: row === rows - 1 && rummage() });
        place(c, (col - 1) * 0.54 + (random() - 0.5) * jitter * 0.6, row * 0.38, (random() - 0.5) * jitter, (random() - 0.5) * jitter);
        if (col === 1) topSpot = [0, (row + 1) * 0.38, 0];
        if (row < rows - 1 || random() < 0.5) place(carton(0.52, 0.38, 0.44, { text: '' }), (col - 1) * 0.54, row * 0.38, -0.46);
      }
    } else {
      const c1 = carton(0.56, 0.4, 0.46, { text: heroText, damp: a.history === 'damp' });
      place(c1, 0, 0, 0, (random() - 0.5) * 0.2);
      const c2 = carton(0.42, 0.3, 0.36, { open: rummage() });
      place(c2, (random() - 0.5) * 0.1, 0.4, 0, (random() - 0.5) * 0.6);
      topSpot = [c2.g.position.x, 0.7, 0];
    }

    // The split box: on its side in front, mouth toward us, its contents on the floor.
    if (a.spill !== 'sealed') {
      const sx = 0.55 + random() * 0.15, sz = 0.72;
      const c = carton(0.46, 0.36, 0.4, { text: '', open: true });
      c.g.rotation.set(Math.PI / 2 - 0.02, -0.5 - random() * 0.3, 0, 'YXZ');
      c.g.position.set(sx + 0.1, 0.2, sz - 0.3);
      s.root.add(c.g);
      const count = Math.round(mix(5, 14, mood.density));
      const spot = (reach = 1) => [sx - 0.25 - random() * 0.9 * reach, 0, sz + 0.1 + (random() - 0.3) * 0.5] as const;
      if (a.spill === 'photos') {
        for (let i = 0; i < count + 4; i++) {
          const [x, , z] = spot();
          const tone = pick(['#e9e4d6', '#d8c9a8', '#cfd6d8', '#e6d3b0']);
          const border = s.box([0.15, 0.003, 0.11], [x, 0.003 + i * 0.0015, z], s.material('#f3f0e6', { roughness: 0.4 }));
          border.rotation.y = random() * 3;
          const image = s.box([0.12, 0.004, 0.085], [x, 0.004 + i * 0.0015, z], s.material(tone, { roughness: 0.3 }));
          image.rotation.y = border.rotation.y;
          const dot = s.box([0.03, 0.005, 0.04], [x, 0.0045 + i * 0.0015, z], s.material(pick(['#6d5a4a', '#4a6470', '#8a4a3a'])));
          dot.rotation.y = border.rotation.y;
        }
      } else if (a.spill === 'books') {
        for (let i = 0; i < count; i++) {
          const [x, , z] = spot(0.8);
          const b = s.box([0.13 + random() * 0.05, 0.025 + random() * 0.03, 0.19 + random() * 0.04], [x, 0.02 + (i % 3) * 0.035, z], s.material(pick(['#8a2f2a', '#2f4f7a', '#3d6b4a', '#d9c27a', '#4a3a5a', '#e8e0cc']), { roughness: 0.7 }));
          b.rotation.y = random() * 3;
          if (random() < 0.25) { b.rotation.z = 0.5; b.position.y += 0.04; }
        }
      } else if (a.spill === 'baubles') {
        for (let i = 0; i < count; i++) {
          const [x, , z] = spot();
          const tint = pick(['#c8272e', '#d9a82a', '#2f7d4f', '#c9cfd4', '#2f5fa8']);
          s.ball([0.04, 0.04, 0.04], [x, 0.04, z], s.material(tint, { metalness: 0.7, roughness: 0.2, emissive: tint, emissiveIntensity: 0.12 }), 12);
          s.cylinder(0.01, 0.01, 0.015, [x, 0.085, z], s.material('#d9c27a', { metalness: 0.8 }), 6);
        }
        const pts: [number, number, number][] = [];
        for (let i = 0; i < 7; i++) pts.push([sx - 0.1 - i * 0.16, 0.02, sz + Math.sin(i * 1.3) * 0.15 + 0.1]);
        s.tube(pts, 0.022, s.material('#d9d4c0', { metalness: 0.8, roughness: 0.4, emissive: '#b9a24a', emissiveIntensity: 0.2 }));
      } else if (a.spill === 'clothes') {
        for (let i = 0; i < count * 0.6; i++) {
          const [x, , z] = spot(0.7);
          const f = s.box([0.26, 0.03 + random() * 0.03, 0.2], [x, 0.02 + (i % 2) * 0.04, z], s.material(pick(['#5d7f9a', '#b5523c', '#e8e0cc', '#4a5a4a', '#d9a8b0', '#30343a']), { roughness: 1 }));
          f.rotation.y = random() * 3;
        }
        const [x, , z] = spot();
        s.ball([0.05, 0.035, 0.12], [x, 0.035, z], s.material('#5a3a22', { roughness: 0.5 }), 10).rotation.y = random() * 3;
      } else if (a.spill === 'trophies') {
        const gold = s.material('#d9b23a', { metalness: 0.85, roughness: 0.25, emissive: '#7a5a10', emissiveIntensity: 0.2 });
        for (let i = 0; i < Math.max(3, count * 0.45); i++) {
          const [x, , z] = spot(0.8);
          const g = new THREE.Group();
          const add = (m: THREE.Object3D) => { s.root.remove(m); g.add(m); };
          add(s.box([0.07, 0.04, 0.07], [0, 0.02, 0], s.material('#2a221c')));
          add(s.lathe([[0.012, 0.04], [0.012, 0.09], [0.03, 0.11], [0.045, 0.17], [0.05, 0.2]], gold));
          g.position.set(x, 0, z);
          if (random() < 0.6) { g.rotation.z = Math.PI / 2; g.position.y = 0.04; g.rotation.y = random() * 3; }
          s.root.add(g);
        }
        for (let i = 0; i < 3; i++) { const [x, , z] = spot(); s.cylinder(0.03, 0.03, 0.006, [x, 0.004, z], gold, 14); s.box([0.03, 0.003, 0.12], [x, 0.003, z - 0.07], s.material(pick(['#2f5fa8', '#c8372e']))).rotation.y = (random() - 0.5) * 0.6; }
      } else if (a.spill === 'toys') {
        for (let i = 0; i < count; i++) {
          const [x, , z] = spot();
          const b = s.box([0.06, 0.06, 0.06], [x, 0.03, z], s.material(pick(['#c8372e', '#2f6fb5', '#3d8a55', '#e0a21f', '#e8dcc0']), { roughness: 0.6 }));
          b.rotation.y = random() * 3;
        }
        const [x, , z] = spot(0.5);
        s.box([0.16, 0.04, 0.07], [x, 0.04, z], s.material('#c8372e')); s.box([0.08, 0.035, 0.065], [x - 0.01, 0.075, z], s.material('#c8372e'));
        for (const dx of [-0.05, 0.05]) for (const dz of [-0.037, 0.037]) s.cylinder(0.02, 0.02, 0.012, [x + dx, 0.02, z + dz], s.material('#1e1f21'), 10).rotation.x = Math.PI / 2;
      } else {
        for (let i = 0; i < count * 0.6; i++) {
          const [x, , z] = spot(0.8);
          const thick = 0.03 + random() * 0.04;
          const bundle = s.box([0.2, thick, 0.11], [x, 0.03, z], s.material(pick(['#efe8d2', '#e6dcc0', '#dfe4e6', '#ecd9c0']), { roughness: 0.8 }));
          bundle.rotation.y = random() * 3;
          const string = s.box([0.012, thick + 0.004, 0.114], [x, 0.03, z], s.material('#a8342f'));
          string.rotation.y = bundle.rotation.y;
        }
        for (let i = 0; i < 4; i++) { const [x, , z] = spot(); s.box([0.2, 0.002, 0.1], [x, 0.002, z], s.material('#f3efe2')).rotation.y = random() * 3; }
      }
    }

    if (a.tools) {
      const [tx, ty, tz] = topSpot;
      const red = s.material('#c8372e', { roughness: 0.5 });
      const gun = new THREE.Group();
      const add = (m: THREE.Object3D) => { s.root.remove(m); gun.add(m); };
      const roll = s.cylinder(0.05, 0.05, 0.055, [0, 0.055, 0], tape, 16);
      roll.rotation.x = Math.PI / 2;
      add(roll);
      add(s.box([0.03, 0.11, 0.05], [0.07, 0.04, 0], red));
      add(s.box([0.12, 0.02, 0.06], [0.01, 0.1, 0], red));
      gun.position.set(tx - 0.08, ty + 0.01, tz + 0.05); gun.rotation.y = random() * 2;
      s.root.add(gun);
      const pen = s.cylinder(0.009, 0.009, 0.13, [tx + 0.12, ty + 0.012, tz - 0.05], s.material('#18161a'), 8);
      pen.rotation.set(Math.PI / 2, 0, random() * 3);
    }
    if (a.history === 'stored') {
      // A cobweb strung from the stack to the floor.
      const web = s.material('#f2f0ea', { transparent: true, opacity: 0.5, depthWrite: false });
      for (let i = 0; i < 3; i++) s.rod([topSpot[0] - 0.25, topSpot[1], 0.2], [topSpot[0] - 0.5 - i * 0.08, i * 0.12, 0.25 + i * 0.03], 0.002, web);
    }
    if (a.history === 'damp') {
      const pool = new THREE.Mesh(new THREE.CircleGeometry(0.7, 28), new THREE.MeshStandardMaterial({ color: '#4a4640', roughness: 0.15, transparent: true, opacity: 0.45, depthWrite: false }));
      pool.rotation.x = -Math.PI / 2; pool.scale.set(1.3, 0.8, 1); pool.position.set(0.1, 0.003, 0.15);
      s.root.add(pool);
    }
    return s.finish();
  },
});
