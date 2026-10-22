import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
function paint(w: number, h: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function cushion() {
  const g = new THREE.SphereGeometry(1, 22, 14);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = Math.sign(p.getX(i)) * Math.abs(p.getX(i)) ** 0.6;
    const z = Math.sign(p.getZ(i)) * Math.abs(p.getZ(i)) ** 0.6;
    p.setXYZ(i, x, p.getY(i) * (1 - 0.55 * Math.max(Math.abs(x), Math.abs(z)) ** 3), z);
  }
  g.computeVertexNormals();
  return g;
}

/** A square-sectioned tapered carton: a four-sided frustum turned flat to the viewer. */
function frustum(top: number, bottom: number, height: number) {
  const g = new THREE.CylinderGeometry(top * Math.SQRT1_2, bottom * Math.SQRT1_2, height, 4);
  g.rotateY(Math.PI / 4);
  g.translate(0, height / 2, 0);
  return g;
}

interface Item { g: THREE.Group; w: number; h: number; d: number }
type Kind = 'pizza' | 'pail' | 'foil' | 'clam' | 'sushi' | 'parcel' | 'tub';

const POOLS: Record<string, Kind[]> = {
  chinese: ['pail', 'pail', 'foil', 'pail', 'tub', 'pail'],
  pizza: ['pizza', 'pizza', 'pizza', 'tub', 'pizza', 'clam'],
  indian: ['foil', 'foil', 'tub', 'foil', 'parcel', 'foil'],
  burger: ['clam', 'clam', 'parcel', 'clam', 'clam', 'tub'],
  sushi: ['sushi', 'sushi', 'tub', 'sushi', 'sushi', 'pail'],
  chippy: ['parcel', 'clam', 'parcel', 'tub', 'parcel', 'clam'],
};

export default defineThing({
  questions: {
    cuisine: choice('What kind of takeaway is it?', {
      chinese: 'White folded oyster-pail cartons with wire handles and red print, noodles and chopsticks.',
      pizza: 'Flat square pizza boxes with greasy lids and a pot of dip.',
      indian: 'Foil trays with scribbled cardboard lids and tubs of orange sauce.',
      burger: 'Polystyrene clamshells, a carton of fries and a big cup with a straw.',
      sushi: 'Black plastic trays with clear lids and rows of coloured pieces.',
      chippy: 'Paper-wrapped parcels of fish and chips gone translucent with grease.',
    }),
    nights: score('How many nights of eating does the stack represent?', ['A single meal for one', 'A long weekend', 'A working week', 'A fortnight nobody has cleared']),
    age: choice('How old is the food?', {
      fresh: 'Just delivered: lids shut, steam curling up, bag still knotted.',
      eating: 'Being eaten right now: the top carton open with a utensil stuck in it.',
      cold: 'Last night’s, cold and closed, grease soaking through.',
      fossil: 'Fossilised: open, dried out, blooming with green-grey mould and a few flies.',
    }),
    stack: choice('How is it stacked?', {
      neat: 'Squared up into a tidy tower, almost proud.',
      leaning: 'A tower leaning well past where it should have fallen.',
      toppled: 'Half of it has slid off and lies scattered round the base.',
    }),
    bag: choice('What did it come in?', {
      knotted: 'A thin white plastic carrier bag, handles knotted, sagging beside the stack.',
      striped: 'A blue-and-white striped corner-shop carrier bag, knotted.',
      paper: 'A brown paper bag with a grease window and a receipt stapled to it.',
      none: 'No bag in sight.',
    }),
    top: choice('What is left with it?', {
      chopsticks: 'A pair of wooden chopsticks.',
      fork: 'A white plastic fork.',
      fortune: 'A cracked fortune cookie and its paper slip.',
      receipt: 'A long curling till receipt.',
      sachets: 'A scatter of unopened sauce sachets and napkins.',
      nothing: 'Nothing extra.',
    }),
    drink: choice('What was there to drink?', {
      cola: 'Cans of cola.',
      beer: 'A couple of beer bottles.',
      cup: 'A large paper cup with a lid and straw.',
      none: 'Nothing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const fossil = a.age === 'fossil';
    const sat = mix(0.6, 1.1, mood.cheer) * (fossil ? 0.6 : 1);
    const grease = Math.min(1, mood.wear * 0.7 + (a.age === 'cold' ? 0.35 : fossil ? 0.5 : 0));
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const blotch = (ctx: CanvasRenderingContext2D, w: number, h: number, n: number) => {
      for (let i = 0; i < n; i++) { ctx.fillStyle = `rgba(110,80,30,${0.12 + random() * 0.2})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 12 + random() * 40, 10 + random() * 30, random() * 3, 0, 7); ctx.fill(); }
    };

    const white = s.material('#f1efe8', { roughness: 0.7 });
    const kraft = s.material('#b98f5e', { roughness: 0.95 });
    const foil = s.material('#cfd3d6', { metalness: 0.85, roughness: 0.32 });
    const poly = s.material('#f3ecd2', { roughness: 0.9 });
    const wood = s.material('#d9bd8a', { roughness: 0.8 });
    const paper = s.material(grease > 0.5 ? '#d9cfae' : '#ece6d4', { roughness: 0.95 });
    const foodColour = (c: string) => s.material(new THREE.Color(c).lerp(new THREE.Color('#6f7658'), fossil ? 0.55 : 0), { roughness: fossil ? 1 : 0.55 });
    const brand = new THREE.Color().setHSL(pick([0.0, 0.03, 0.33, 0.6, 0.08]), 0.75 * sat, 0.42);
    const brandStyle = brand.getStyle();

    const pailPrint = paint(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#f1efe8'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = brandStyle;
      for (let i = 0; i < 3; i++) { const y = 30 + i * 22, hw = 16 + i * 10; ctx.beginPath(); ctx.moveTo(w / 2 - hw - 8, y + 12); ctx.quadraticCurveTo(w / 2, y - 14, w / 2 + hw + 8, y + 12); ctx.lineTo(w / 2 + hw - 4, y + 12); ctx.lineTo(w / 2 + hw - 4, y + 22); ctx.lineTo(w / 2 - hw + 4, y + 22); ctx.lineTo(w / 2 - hw + 4, y + 12); ctx.fill(); }
      ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'; ctx.fillText('THANK YOU', w / 2, 114);
      blotch(ctx, w, h, Math.floor(grease * 5));
    });
    const pailMaterial = new THREE.MeshStandardMaterial({ map: pailPrint, roughness: 0.8 });
    const pizzaLid = () => paint(256, 256, (ctx, w, h) => {
      const brown = random() < 0.5;
      ctx.fillStyle = brown ? '#b98f5e' : '#efe9d8'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = brandStyle; ctx.lineWidth = 8; ctx.strokeRect(14, 14, w - 28, h - 28);
      ctx.fillStyle = brandStyle; ctx.beginPath(); ctx.arc(w / 2, 104, 58, 0, 7); ctx.fill();
      ctx.fillStyle = brown ? '#b98f5e' : '#efe9d8'; for (let k = 0; k < 4; k++) { ctx.save(); ctx.translate(w / 2, 104); ctx.rotate(k * Math.PI / 4); ctx.fillRect(-60, -2, 120, 4); ctx.restore(); }
      ctx.fillStyle = brandStyle; ctx.font = 'bold 38px monospace'; ctx.textAlign = 'center';
      ctx.fillText(pick(['PIZZA', 'HOT+FRESH', '2 FOR 1', 'NAPOLI', 'SLICE']), w / 2, 212, 210);
      blotch(ctx, w, h, Math.floor(grease * 9));
    });
    const scribble = () => paint(160, 112, (ctx, w, h) => {
      ctx.fillStyle = '#f4f1e6'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1b1c22'; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center';
      ctx.save(); ctx.translate(w / 2, h / 2 + 10); ctx.rotate((random() - 0.5) * 0.4); ctx.fillText(pick(['TIKKA', 'LAMB', 'RICE', 'SAAG', 'No 42', 'KORMA', 'DAL', 'BEEF', 'x2']), 0, 0, 140); ctx.restore();
      blotch(ctx, w, h, Math.floor(grease * 5));
    });

    const mould = (g: THREE.Group, w: number, d: number, y: number) => {
      const n = 3 + Math.floor(random() * 5);
      for (let i = 0; i < n; i++) {
        const r = 0.008 + random() * 0.02;
        const m = put(g, new THREE.SphereGeometry(r, 8, 6), s.material(pick(['#7d8f5a', '#aab59a', '#5e7a66', '#d8dccf']), { roughness: 1 }), (random() - 0.5) * w * 0.7, y, (random() - 0.5) * d * 0.7);
        m.scale.y = 0.3;
      }
    };

    const make = (kind: Kind, open: boolean): Item => {
      const g = new THREE.Group();
      if (kind === 'pizza') {
        const w = 0.3 + random() * 0.12, h = 0.042;
        put(g, new THREE.BoxGeometry(w, h, w), kraft, 0, h / 2, 0);
        const lid = new THREE.Group();
        lid.position.set(0, h, -w / 2);
        g.add(lid);
        const face = put(lid, new THREE.PlaneGeometry(w * 0.99, w * 0.99), new THREE.MeshStandardMaterial({ map: pizzaLid(), roughness: 0.9, side: THREE.DoubleSide }), 0, 0.0012, w / 2);
        face.rotation.x = -Math.PI / 2;
        if (open) {
          lid.rotation.x = -mix(1.3, 2.0, random());
          put(g, new THREE.BoxGeometry(w * 0.96, 0.002, w * 0.96), s.material('#d9c9a2'), 0, h + 0.001, 0);
          const left = fossil ? 1 + Math.floor(random() * 2) : Math.floor(random() * 5);
          if (left) {
            const pie = put(g, new THREE.CylinderGeometry(w * 0.42, w * 0.42, 0.012, 24, 1, false, random() * 6, left * Math.PI / 4), foodColour('#d9a655'), 0, h + 0.008, 0);
            put(pie, new THREE.CylinderGeometry(w * 0.36, w * 0.36, 0.013, 24, 1, false, (pie.geometry as THREE.CylinderGeometry).parameters.thetaStart, left * Math.PI / 4), foodColour('#c8452c'), 0, 0.001, 0);
          }
          for (let i = 0; i < 2 + Math.floor(random() * 3); i++) { const crust = put(g, new THREE.TorusGeometry(w * 0.2, 0.012, 6, 10, 0.8), foodColour('#c99a55'), (random() - 0.5) * w * 0.5, h + 0.012, (random() - 0.5) * w * 0.5); crust.rotation.set(Math.PI / 2, 0, random() * 6); }
          if (fossil) mould(g, w, w, h + 0.016);
        } else lid.rotation.x = -random() * 0.06 * (1 + mood.wear * 3);
        return { g, w, h: h + 0.004, d: w };
      }
      if (kind === 'pail') {
        const h = 0.1 + random() * 0.02, tw = 0.105, bw = 0.078;
        put(g, frustum(tw, bw, h), pailMaterial);
        const handle = put(g, new THREE.TorusGeometry(tw * 0.52, 0.0022, 5, 20, Math.PI), foil, 0, h * 0.86, 0);
        handle.rotation.set(open ? 1.2 : 0.25, Math.PI / 2, 0);
        if (open) {
          for (let k = 0; k < 4; k++) { const hinge = new THREE.Group(); hinge.rotation.y = k * Math.PI / 2; hinge.position.y = h; g.add(hinge); const flap = put(hinge, new THREE.BoxGeometry(tw * 0.96, 0.003, 0.05), white, 0, 0, tw / 2 + 0.022); flap.rotation.x = -0.6 - random() * 0.8; flap.position.y = 0.018; }
          const food = pick(['#e2bf6a', '#c97a34', '#e8e2cf', '#8d5a2c']);
          const heap = put(g, new THREE.IcosahedronGeometry(tw * 0.5, 1), foodColour(food), 0, h - 0.012, 0);
          heap.scale.y = 0.5; (heap.material as THREE.MeshStandardMaterial).flatShading = true;
          if (fossil) mould(g, tw, tw, h + 0.012);
          return { g, w: tw, h: h + 0.03, d: tw };
        }
        return { g, w: tw, h, d: tw };
      }
      if (kind === 'foil') {
        const w = 0.19 + random() * 0.05, d = 0.125, h = 0.045;
        const tray = put(g, frustum(1, 0.82, h), foil); tray.scale.set(w, 1, d);
        put(g, new THREE.BoxGeometry(w + 0.014, 0.004, d + 0.014), foil, 0, h, 0);
        if (open) {
          put(g, new THREE.BoxGeometry(w * 0.9, 0.006, d * 0.86), foodColour(pick(['#d9762b', '#e3b33a', '#f1ecdd', '#6f8f3a', '#a8482a'])), 0, h + 0.002, 0);
          if (fossil) mould(g, w, d, h + 0.007);
        } else put(g, new THREE.BoxGeometry(w + 0.004, 0.004, d + 0.004), new THREE.MeshStandardMaterial({ map: scribble(), roughness: 0.9 }), 0, h + 0.004, 0);
        return { g, w, h: h + 0.007, d };
      }
      if (kind === 'clam') {
        const w = 0.16 + random() * 0.07, d = w * (random() < 0.5 ? 1 : 0.72), h = 0.036;
        const lower = put(g, frustum(1, 0.8, h), poly); lower.scale.set(w, 1, d);
        const lid = new THREE.Group(); lid.position.set(0, h, -d / 2); g.add(lid);
        const upper = put(lid, frustum(0.8, 1, h), poly, 0, 0, d / 2); upper.scale.set(w, 1, d);
        if (open) {
          lid.rotation.x = -mix(0.9, 1.9, random());
          const bun = put(g, new THREE.SphereGeometry(w * 0.3, 14, 8, 0, 6.3, 0, Math.PI / 2), foodColour('#b9783a'), (random() - 0.5) * 0.02, h * 0.6, 0);
          bun.scale.y = 0.75;
          put(g, new THREE.CylinderGeometry(w * 0.31, w * 0.31, 0.012, 14), foodColour('#5a3622'), bun.position.x, h * 0.55, 0);
          put(g, new THREE.CylinderGeometry(w * 0.33, w * 0.33, 0.004, 9), foodColour('#6fa43a'), bun.position.x, h * 0.48, 0);
          if (fossil) mould(g, w * 0.6, d * 0.6, h * 0.6 + w * 0.22);
          return { g, w, h: h * 2, d };
        }
        lid.rotation.x = -random() * 0.12;
        return { g, w, h: h * 2 + 0.003, d };
      }
      if (kind === 'sushi') {
        const w = 0.21 + random() * 0.05, d = 0.13, h = 0.04;
        put(g, new THREE.BoxGeometry(w, 0.012, d), s.material('#17181b', { roughness: 0.3 }), 0, 0.006, 0);
        const cols = 4, rows = 2;
        const gone = open ? Math.floor(random() * 6) : 0;
        for (let i = gone; i < cols * rows; i++) {
          const x = ((i % cols) - 1.5) * w * 0.21, z = (Math.floor(i / cols) - 0.5) * d * 0.44;
          put(g, new THREE.BoxGeometry(w * 0.15, 0.016, d * 0.26), foodColour('#f3f0e6'), x, 0.02, z);
          put(g, new THREE.BoxGeometry(w * 0.16, 0.007, d * 0.3), foodColour(pick(['#f0803c', '#e0453a', '#f3d7c0', '#f2c94c', '#3d6b3a'])), x, 0.031, z);
        }
        if (!open) put(g, new THREE.BoxGeometry(w, h - 0.012, d), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false }), 0, 0.012 + (h - 0.012) / 2, 0);
        else if (fossil) mould(g, w, d, 0.036);
        put(g, new THREE.BoxGeometry(w + 0.006, 0.003, d + 0.006), s.material('#17181b', { roughness: 0.3 }), 0, open ? 0.012 : h, 0).visible = !open;
        return { g, w, h: open ? 0.036 : h, d };
      }
      if (kind === 'parcel') {
        const w = 0.24 + random() * 0.08, d = 0.14 + random() * 0.04, h = 0.075;
        if (open) {
          put(g, new THREE.BoxGeometry(w * 1.3, 0.003, d * 1.6), paper, 0, 0.0015, 0).rotation.y = random();
          const fish = put(g, cushion(), foodColour('#d9a445'), -w * 0.1, 0.022, 0); fish.scale.set(w * 0.32, 0.02, d * 0.22); fish.rotation.y = random();
          const chip = new THREE.BoxGeometry(0.05, 0.009, 0.009);
          for (let i = 0; i < 12; i++) { const c = put(g, chip, foodColour('#e8c765'), (random() - 0.2) * w * 0.5, 0.008 + random() * 0.02, (random() - 0.5) * d * 0.9); c.rotation.set(random(), random() * 3, random() * 0.6); }
          if (fossil) mould(g, w, d, 0.03);
          return { g, w, h: 0.04, d };
        }
        const lump = put(g, cushion(), paper, 0, h / 2, 0); lump.scale.set(w / 2, h / 2, d / 2);
        put(g, new THREE.BoxGeometry(w * 0.5, 0.002, d * 0.7), paper, w * 0.1, h - 0.006, 0).rotation.set(0.1, 0.5, 0.08);
        return { g, w, h: h * 0.92, d };
      }
      const r = 0.05 + random() * 0.012, h = 0.065;
      const fill = pick(['#d9762b', '#e8e0c8', '#7fa03c', '#a53a26', '#5a3a24']);
      put(g, new THREE.CylinderGeometry(r, r * 0.86, h, 20), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, roughness: 0.1, depthWrite: false }), 0, h / 2, 0);
      put(g, new THREE.CylinderGeometry(r * 0.94, r * 0.82, h * (0.3 + random() * 0.55), 20), foodColour(fill), 0, h * 0.3, 0).position.y = h * 0.34;
      if (!open) put(g, new THREE.CylinderGeometry(r + 0.004, r + 0.004, 0.006, 20), s.material('#e9edf0', { roughness: 0.3 }), 0, h, 0);
      else { put(g, new THREE.TorusGeometry(r, 0.003, 6, 20), white, 0, h, 0).rotation.x = Math.PI / 2; if (fossil) mould(g, r, r, h * 0.75); }
      return { g, w: r * 2, h: h + 0.004, d: r * 2 };
    };

    // ----- Build the items and stack them -----
    const total = Math.max(1, Math.round(2 + a.nights * 11 + (mood.density - 0.5) * 2));
    const pool = POOLS[a.cuisine];
    const kinds: Kind[] = Array.from({ length: total }, (_unused, i) => (i < 2 ? pool[i] : pick(pool)));
    if (total >= 4 && random() < 0.75) kinds[2] = 'pizza';
    const topOpen = a.age === 'eating' || fossil;
    const towers = total > 8 ? 2 : 1;
    const perTower = Math.ceil(total / towers);
    const size: Record<Kind, number> = { pizza: 6, parcel: 4, foil: 3.4, sushi: 3.3, clam: 3, pail: 2, tub: 1 };
    const lean = a.stack === 'neat' ? 0 : a.stack === 'leaning' ? mix(0.22, 0.36, random()) : 0.14;
    const jitter = a.stack === 'neat' ? 0.008 : 0.03 + mood.energy * 0.02;
    const tops: [number, number, number][] = [];
    const fallen: Kind[] = [];
    let reach = 0, baseR = 0.06;
    for (let t = 0; t < towers; t++) {
      const mine = kinds.slice(t * perTower, (t + 1) * perTower).sort((p, q) => size[q] - size[p]);
      const keep = a.stack === 'toppled' ? Math.max(1, Math.ceil(mine.length * 0.45)) : mine.length;
      fallen.push(...mine.slice(keep));
      const tower = new THREE.Group();
      const dir = random() * Math.PI * 2;
      const tx = t === 0 ? 0 : baseR + 0.2 + random() * 0.04, tz = t === 0 ? 0 : -0.12 + random() * 0.2;
      tower.position.set(tx, 0, tz);
      tower.rotation.y = random() * 0.6 - 0.3;
      s.root.add(tower);
      let y = 0, ox = 0, oz = 0, prevW = 1;
      mine.slice(0, keep).forEach((kind, i) => {
        const last = i === keep - 1;
        const item = make(kind, topOpen && last && (t === 0 || fossil) || (fossil && random() < 0.3 && last));
        ox += Math.cos(dir) * lean * item.h + (random() - 0.5) * jitter;
        oz += Math.sin(dir) * lean * item.h + (random() - 0.5) * jitter;
        // Never let a carton hang entirely off the one below.
        const limit = prevW * 0.38;
        ox = Math.max(-limit * (i + 1), Math.min(limit * (i + 1), ox));
        item.g.position.set(ox, y, oz);
        item.g.rotation.y = (random() - 0.5) * (a.stack === 'neat' ? 0.12 : 0.7);
        item.g.rotation.z = -Math.cos(dir) * lean * 0.25 * i * 0.3;
        item.g.rotation.x = Math.sin(dir) * lean * 0.25 * i * 0.3;
        tower.add(item.g);
        y += item.h;
        prevW = item.w;
        reach = Math.max(reach, tx + item.w / 2);
        if (t === 0 && i === 0) baseR = item.w / 2;
        if (last) tops.push([tx + ox, y, tz + oz]);
      });
    }
    fallen.forEach((kind, i) => {
      const item = make(kind, (fossil || a.age === 'eating') && random() < 0.5);
      const ang = random() * Math.PI * 2, r = baseR + 0.12 + random() * 0.14 + i * 0.02;
      const tipped = kind === 'pail' || kind === 'tub' ? random() < 0.6 : false;
      item.g.position.set(Math.cos(ang) * r + (towers - 1) * 0.18, tipped ? item.w / 2 : 0, Math.abs(Math.sin(ang)) * r * 0.9 + 0.05);
      item.g.rotation.y = random() * 6;
      if (tipped) item.g.rotation.z = Math.PI / 2;
      else item.g.rotation.x = (random() - 0.5) * 0.1;
      s.root.add(item.g);
    });
    const [topX, topY, topZ] = tops[0];

    // ----- Burger meals come with fries and nothing stacks on them -----
    const leftX = -(baseR + 0.09 + random() * 0.03), frontZ = baseR + 0.1;
    if (a.cuisine === 'burger') {
      const fx = leftX, fz = 0.1;
      s.mesh(frustum(0.085, 0.06, 0.1), s.material(brand), [fx, 0, fz]).scale.z = 0.5;
      const fry = new THREE.BoxGeometry(0.008, 0.07, 0.008);
      const n = fossil ? 4 : 9 + Math.floor(random() * 6);
      for (let i = 0; i < n; i++) { const f = s.mesh(fry, foodColour('#e8c765'), [fx + (random() - 0.5) * 0.065, 0.1 + random() * 0.02, fz + (random() - 0.5) * 0.02]); f.rotation.z = (random() - 0.5) * 0.5; }
    }

    // ----- Utensils and leftovers -----
    if (a.top === 'chopsticks') {
      const stuck = topOpen;
      for (const k of [-1, 1]) {
        if (stuck) s.rod([topX + k * 0.008, topY - 0.05, topZ], [topX + 0.07 + k * 0.012, topY + 0.16, topZ - 0.04 + k * 0.01], 0.003, wood, 0.0022);
        else s.rod([topX - 0.11, topY + 0.004, topZ + k * 0.006 + 0.02], [topX + 0.12, topY + 0.004, topZ + k * 0.012 - 0.03], 0.003, wood, 0.0022);
      }
      const sleeve = s.box([0.19, 0.002, 0.03], [leftX + 0.08, 0.001, frontZ], s.material('#e8dfc8'));
      sleeve.rotation.y = random() * 2;
    } else if (a.top === 'fork') {
      const fork = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.003, 0.11), white); handle.position.z = 0.02; handle.castShadow = true; fork.add(handle);
      for (let k = 0; k < 4; k++) { const tine = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.04), white); tine.position.set((k - 1.5) * 0.005, 0, -0.055); fork.add(tine); }
      if (topOpen) { fork.position.set(topX, topY + 0.03, topZ); fork.rotation.set(1.2, random() * 3, 0); }
      else { fork.position.set(topX, topY + 0.003, topZ); fork.rotation.y = random() * 3; }
      s.root.add(fork);
    } else if (a.top === 'fortune') {
      const cx = leftX + 0.1, cz = frontZ;
      for (const k of [-1, 1]) { const half = s.mesh(new THREE.TorusGeometry(0.028, 0.013, 6, 12, 2.2), s.material('#d9a85a', { roughness: 0.7 }), [cx + k * 0.03, 0.014, cz + k * 0.012]); half.rotation.set(Math.PI / 2, 0, k * 1.4 + random()); }
      const slip = s.label(pick(['YOU WILL REST SOON', 'CALL YOUR MOTHER', 'NOT TONIGHT', 'A CHANGE IS COMING', 'TRY AGAIN TOMORROW']), 0.14, 0.022, [cx + 0.02, 0.002, cz + 0.07], '#b03226', '#f7f3e6');
      slip.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.8);
    } else if (a.top === 'receipt') {
      const roll = paint(96, 384, (ctx, w, h) => {
        ctx.fillStyle = '#f6f4ec'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#44464c';
        ctx.fillRect(20, 14, 56, 10);
        for (let i = 0; i < 20; i++) { ctx.fillRect(8, 40 + i * 15, 30 + random() * 26, 4); ctx.fillRect(w - 28, 40 + i * 15, 20, 4); }
        ctx.fillRect(8, h - 30, 80, 8);
      });
      const g = new THREE.PlaneGeometry(0.075, 0.34, 1, 24);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const v = p.getY(i) / 0.34 + 0.5; p.setZ(i, Math.sin(v * 5) * 0.02 * v); }
      g.computeVertexNormals();
      const m = s.mesh(g, new THREE.MeshStandardMaterial({ map: roll, roughness: 0.9, side: THREE.DoubleSide }), [leftX + 0.1, 0.004, frontZ + 0.1]);
      m.rotation.set(-Math.PI / 2 + 0.03, 0, random() * 1.2 - 0.6);
    }
    const litter = a.top === 'sachets' ? 5 + Math.floor(mood.density * 6) : Math.floor(mood.density * 4);
    for (let i = 0; i < litter; i++) {
      const ang = random() * Math.PI * 2, r = baseR + 0.08 + random() * 0.16;
      const x = Math.cos(ang) * r + (towers - 1) * 0.15, z = Math.abs(Math.sin(ang)) * r + 0.06;
      if (i % 3 === 2) { const nap = s.box([0.1, 0.004, 0.1], [x, 0.002, z], s.material('#f4f1e6', { roughness: 1 })); nap.rotation.y = random() * 3; }
      else { const sachet = s.box([0.05, 0.004, 0.03], [x, 0.002, z], s.material(pick(['#c9302a', '#e3b52c', '#3a2a22', '#f1efe8']), { roughness: 0.3 })); sachet.rotation.y = random() * 3; }
    }

    // ----- The bag -----
    const bagX = reach + 0.14 + random() * 0.03, bagZ = 0.08 + random() * 0.14;
    if (a.bag === 'knotted' || a.bag === 'striped') {
      const g = new THREE.IcosahedronGeometry(1, 3);
      const p = g.attributes.position;
      const k1 = random() * 6, k2 = random() * 6;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const n = 1 + 0.09 * Math.sin(x * 5 + k1) * Math.sin(z * 6 + k2) + 0.06 * Math.sin(y * 9 + x * 4 + k1);
        const sag = y < 0 ? 1 + 0.25 * -y : 1 - 0.25 * y;
        p.setXYZ(i, x * n * sag, Math.max(y, -0.62) * n, z * n * sag);
      }
      g.computeVertexNormals();
      const skin = paint(128, 128, (ctx, w, h) => {
        ctx.fillStyle = '#f2f1ec'; ctx.fillRect(0, 0, w, h);
        if (a.bag === 'striped') { ctx.fillStyle = `hsl(215,${70 * sat}%,48%)`; for (let i = 0; i < 8; i++) ctx.fillRect(i * 16, 0, 8, h); }
        else { ctx.fillStyle = brandStyle; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'; for (let i = 0; i < 4; i++) ctx.fillText('THANK YOU', w / 2, 26 + i * 28); }
      });
      const film = new THREE.MeshStandardMaterial({ map: skin, roughness: 0.35, flatShading: true });
      const br = a.age === 'fresh' ? 0.15 : 0.11;
      const bag = s.mesh(g, film, [bagX, br * 0.62 * (a.age === 'fresh' ? 1 : 0.7), bagZ]);
      bag.scale.set(br * 1.1, br * (a.age === 'fresh' ? 1 : 0.7), br);
      bag.rotation.y = random() * 3;
      const topY2 = bag.position.y + bag.scale.y * 0.95;
      s.ball([0.022, 0.018, 0.022], [bagX, topY2 + 0.01, bagZ], film, 8);
      for (const k of [-1, 1]) { const ear = s.mesh(new THREE.ConeGeometry(0.02, 0.085, 6), film, [bagX + k * 0.035, topY2 + 0.04, bagZ]); ear.rotation.z = Math.PI - k * 0.75; ear.scale.z = 0.4; }
    } else if (a.bag === 'paper') {
      const h = a.age === 'fresh' ? 0.3 : 0.2;
      const bag = s.mesh(frustum(0.2, 0.18, h), kraft, [bagX, 0, bagZ]);
      bag.scale.z = 0.6; bag.rotation.y = (random() - 0.5) * 0.6;
      const fold = s.box([0.2, 0.05, 0.02], [bagX, h + 0.012, bagZ], kraft); fold.rotation.set(0.5, bag.rotation.y, 0);
      const win = s.mesh(new THREE.CircleGeometry(0.05, 14), s.material('#8a6638', { transparent: true, opacity: 0.55 + grease * 0.35 }), [0, 0, 0]);
      win.castShadow = false; win.position.set(0.02, h * 0.4, 0.096); win.scale.z = 1; bag.add(win); s.root.remove(win); bag.add(win);
      const slipTag = s.label(`TOTAL ${(8 + random() * 30).toFixed(2)}`, 0.09, 0.03, [0, 0, 0], '#333', '#f6f4ec');
      slipTag.position.set(-0.03, h * 0.82, 0.1); bag.add(slipTag);
    }

    // ----- Drinks -----
    const dx = leftX, dz = -0.07;
    if (a.drink === 'cola') {
      const n = 1 + Math.floor(random() * 2 + a.nights * 3);
      for (let i = 0; i < n; i++) {
        const tipped = i > 0 && random() < 0.4;
        const can = s.cylinder(0.033, 0.033, 0.122, [dx - (i % 3) * 0.075 + (random() - 0.5) * 0.02, tipped ? 0.033 : 0.061, dz + Math.floor(i / 3) * 0.09 + (random() - 0.5) * 0.03], s.material(i % 4 === 3 ? '#c9ced2' : '#c2281f', { metalness: 0.6, roughness: 0.35 }), 16);
        if (tipped) { can.rotation.z = Math.PI / 2; can.rotation.y = random() * 3; }
        else s.cylinder(0.029, 0.029, 0.003, [can.position.x, 0.1225, can.position.z], foil, 14);
      }
    } else if (a.drink === 'beer') {
      const n = 2 + Math.floor(random() * 2 + a.nights * 2);
      const glassTone = pick(['#5a3a1a', '#2f5a34']);
      for (let i = 0; i < n; i++) {
        const b = s.lathe([[0.001, 0], [0.03, 0], [0.031, 0.12], [0.026, 0.15], [0.013, 0.19], [0.0125, 0.23], [0.001, 0.23]], s.material(glassTone, { roughness: 0.15, transparent: true, opacity: 0.88 }), [dx - (i % 3) * 0.08 + (random() - 0.5) * 0.03, 0, dz + Math.floor(i / 3) * 0.09 + (random() - 0.5) * 0.04]);
        const lab = s.cylinder(0.0315, 0.0315, 0.05, [0, 0.08, 0], s.material(pick(['#e8dcb8', '#c9302a', '#e8e8e8'])), 16); s.root.remove(lab); b.add(lab);
      }
    } else if (a.drink === 'cup') {
      s.lathe([[0.001, 0], [0.034, 0], [0.047, 0.17], [0.001, 0.17]], s.material(brand.clone().lerp(new THREE.Color('#ffffff'), 0.1)), [dx, 0, dz]);
      s.cylinder(0.05, 0.05, 0.012, [dx, 0.176, dz], s.material('#f1f1ee', { roughness: 0.3 }), 20);
      s.rod([dx + 0.01, 0.17, dz], [dx + 0.035, 0.29, dz + 0.01], 0.004, s.material(pick(['#d2372b', '#f1f1ee', '#2c7fd2'])));
    }

    // ----- Steam for fresh food, flies for the fossils -----
    const wisps: THREE.Mesh[] = [];
    if (a.age === 'fresh' || a.age === 'eating') {
      const vapour = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: a.age === 'fresh' ? 0.16 : 0.09, depthWrite: false });
      for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), vapour); w.userData = { phase: i / 5 + random() * 0.1, x: topX + (random() - 0.5) * 0.08, z: topZ + (random() - 0.5) * 0.08 }; s.root.add(w); wisps.push(w); }
    }
    const flies: THREE.Mesh[] = [];
    if (fossil) {
      const black = s.material('#16161a');
      for (let i = 0; i < 3 + Math.floor(mood.wear * 4); i++) { const f = s.ball([0.005, 0.004, 0.007], [topX, topY + 0.04, topZ], black, 6); f.userData = { phase: random() * 6, r: 0.05 + random() * 0.1, h: 0.03 + random() * 0.1, v: 2 + random() * 3 }; flies.push(f); }
    }
    const place = (time: number) => {
      for (const w of wisps) {
        const u = (time * mix(0.12, 0.5, mood.energy) + w.userData.phase) % 1;
        w.position.set(w.userData.x + Math.sin(u * 6 + w.userData.phase * 9) * 0.03, topY + 0.02 + u * 0.32, w.userData.z);
        w.scale.setScalar(0.6 + u * 1.6);
      }
      for (const f of flies) {
        const q = time * f.userData.v * mix(0.4, 1.6, mood.energy) + f.userData.phase;
        f.position.set(topX + Math.cos(q) * f.userData.r, topY + f.userData.h + Math.sin(q * 1.7) * 0.02, topZ + Math.sin(q) * f.userData.r);
      }
    };
    place(0);
    return s.finish({ update: (_dt, time) => place(time) });
  },
});
