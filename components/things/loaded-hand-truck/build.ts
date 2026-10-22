import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const WORDS = { fragile: 'FRAGILE', kitchen: 'KITCHEN', keep: 'KEEP', misc: 'MISC', dad: "DAD'S", books: 'BOOKS', blank: '' } as const;

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
    truck: choice('What kind of hand truck is it?', {
      red: 'The classic red tubular steel dolly with loop handles.',
      aluminium: 'A bright aluminium appliance truck with a tall back.',
      rental: 'Orange and scuffed, stencilled as rental property.',
      antique: 'An old wooden porter\'s truck with iron wheels.',
    }),
    load: choice('What is stacked on it?', {
      boxes: 'Mismatched cardboard boxes from liquor stores and supermarkets.',
      office: 'Identical white banker\'s boxes with lids: a desk or a firm cleared out.',
      totes: 'Coloured plastic storage totes with snap lids.',
      appliance: 'A mini fridge with a microwave and a box on top.',
      crates: 'Milk crates of records with a speaker cabinet underneath.',
      wardrobe: 'One tall wardrobe carton that fills the whole truck.',
    }),
    balance: choice('How is the load riding?', {
      square: 'Squared up and strapped tight, packed by someone who has done this before.',
      leaning: 'Stacked carelessly, each box a little off the one below.',
      toppling: 'Caught mid-lean, the tower going over sideways.',
      spilled: 'Already gone: the top boxes are on the ground in front of it.',
    }),
    strap: choice('What holds the load on?', {
      ratchet: 'A bright orange ratchet strap.',
      bungee: 'Two crossed bungee cords.',
      rope: 'A length of fraying rope knotted round it.',
      nothing: 'Nothing but hope.',
    }),
    topper: choice('What rides on top of the stack?', {
      lamp: 'A table lamp with its shade still on.',
      plant: 'A houseplant in a pot.',
      birdcage: 'An empty wire birdcage.',
      bear: 'A worn teddy bear sat on top.',
      picture: 'A framed picture laid face up.',
      none: 'Nothing; the top box is the top.',
    }),
    rug: noul('Is a rolled rug strapped up the side?'),
    marker: choice('What is written in marker on the front box?', {
      fragile: 'FRAGILE', kitchen: 'KITCHEN', keep: 'KEEP', misc: 'MISC', dad: "DAD'S", books: 'BOOKS', blank: 'Nothing is written on it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const antique = a.truck === 'antique';
    const frameTint = { red: '#c2302a', aluminium: '#cdd2d4', rental: '#e8742a', antique: '#7a5636' }[a.truck];
    const frame = s.material(frameTint, { metalness: a.truck === 'aluminium' ? 0.85 : antique ? 0 : 0.35, roughness: a.truck === 'aluminium' ? 0.3 : 0.55 });
    const tyre = s.material(antique ? '#3a3a3c' : '#1e1f21', { roughness: 0.9, metalness: antique ? 0.6 : 0 });
    const steel = s.material('#b9bfc1', { metalness: 0.8, roughness: 0.35 });
    const tall = a.truck === 'aluminium' ? 1.62 : 1.42;
    const FZ = -0.02; // the back of the load rests against the frame here

    // Frame: two rails, cross rungs, loop handles, toe plate, axle and wheels.
    const r = antique ? 0.024 : 0.02;
    for (const x of [-0.23, 0.23]) {
      if (antique) s.box([0.05, tall, 0.035], [x, tall / 2 + 0.03, FZ - 0.03], frame);
      else s.tube([[x, 0.03, FZ - 0.02], [x, tall * 0.6, FZ - 0.02], [x, tall, FZ - 0.02], [x, tall + 0.1, FZ - 0.1], [x, tall + 0.04, FZ - 0.24], [x, tall - 0.14, FZ - 0.2]], r, frame);
    }
    if (antique) { s.rod([-0.3, tall + 0.02, FZ - 0.03], [0.3, tall + 0.02, FZ - 0.03], 0.02, frame); }
    else if (a.truck !== 'red') s.rod([-0.23, tall + 0.06, FZ - 0.07], [0.23, tall + 0.06, FZ - 0.07], r, frame);
    for (let y = 0.3; y < tall - 0.05; y += antique ? 0.42 : 0.3) s.box([0.46, antique ? 0.06 : 0.035, 0.015], [0, y, FZ - 0.02], antique ? frame : frame);
    s.box([0.03, tall * 0.7, 0.012], [0, tall * 0.42, FZ - 0.022], frame);
    const toe = s.box([0.5, 0.014, 0.3], [0, 0.012, FZ + 0.13], antique ? s.material('#55504a', { metalness: 0.7 }) : steel);
    toe.castShadow = true;
    const wheelR = antique ? 0.11 : 0.14;
    s.rod([-0.31, wheelR, FZ - 0.14], [0.31, wheelR, FZ - 0.14], 0.012, steel);
    for (const x of [-0.23, 0.23]) s.rod([x, 0.24, FZ - 0.02], [x, wheelR, FZ - 0.14], 0.014, frame);
    const flat = mood.wear > 0.75 ? (random() < 0.5 ? -1 : 1) : 0;
    for (const x of [-1, 1]) {
      const wheel = s.cylinder(wheelR, wheelR, antique ? 0.035 : 0.07, [x * 0.315, wheelR, FZ - 0.14], tyre, 20);
      wheel.rotation.z = Math.PI / 2;
      if (flat === x) wheel.scale.set(1, 1, 0.82);
      const hub = s.cylinder(wheelR * 0.5, wheelR * 0.5, antique ? 0.04 : 0.075, [x * 0.315, wheelR, FZ - 0.14], antique ? tyre : s.material('#e8e4d6'), 12);
      hub.rotation.z = Math.PI / 2;
    }
    if (a.truck === 'rental') s.label('RENTAL', 0.4, 0.09, [0, tall - 0.12, FZ - 0.03], '#ffffff', '#1c1c1c').rotation.y = Math.PI;

    // The load is built in its own group so it can lean as one.
    const stack = new THREE.Group();
    const add = <T extends THREE.Object3D>(mesh: T, to: THREE.Object3D = stack) => { s.root.remove(mesh); to.add(mesh); return mesh; };
    const card = ['#b88f5c', '#a67c4b', '#c49b6a', '#9c7647', '#bfa074'];
    const sloppy = { square: 0.012, leaning: 0.055, toppling: 0.07, spilled: 0.06 }[a.balance];
    const tape = s.material('#d9cfae', { roughness: 0.5 });
    const spilled: THREE.Object3D[] = [];
    let y = 0.02, top = { w: 0.42, d: 0.34, x: 0, z: 0.17 };
    let index = 0;
    const carton = (w: number, h: number, d: number, tint: string, opts: { lid?: string; text?: string; taped?: boolean } = {}) => {
      const g = new THREE.Group();
      const body = add(s.box([w, h, d], [0, h / 2, 0], s.material(tint, { roughness: 0.9 })), g);
      if (mood.wear > 0.6 && random() < 0.5) body.scale.set(1, 1 - random() * 0.12, 1);
      if (opts.taped) { add(s.box([0.05, 0.004, d + 0.004], [0, h + 0.001, 0], tape), g); add(s.box([0.05, h * 0.25, 0.004], [0, h * 0.88, d / 2 + 0.002], tape), g); }
      if (opts.lid) add(s.box([w + 0.02, 0.06, d + 0.02], [0, h - 0.02, 0], s.material(opts.lid, { roughness: 0.6 })), g);
      if (opts.text) {
        const text = opts.text;
        const map = paint(256, 128, (ctx) => {
          ctx.fillStyle = tint; ctx.fillRect(0, 0, 256, 128);
          ctx.fillStyle = '#1c1a18'; ctx.font = `bold ${text.length > 6 ? 46 : 60}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.translate(128, 64); ctx.rotate((random() - 0.5) * 0.16); ctx.fillText(text, 0, 0, 236);
          ctx.fillRect(-90, 34, 180, 5);
        });
        add(s.mesh(new THREE.PlaneGeometry(w * 0.8, w * 0.4), new THREE.MeshStandardMaterial({ map, roughness: 0.9 }), [0, h * 0.45, d / 2 + 0.003]), g);
      }
      return g;
    };
    const put = (g: THREE.Group, w: number, h: number, d: number) => {
      const x = (random() - 0.5) * sloppy * 4 + (a.balance === 'toppling' ? index * 0.02 : 0);
      const z = d / 2 + 0.005 + random() * sloppy;
      g.rotation.y = (random() - 0.5) * sloppy * 6;
      g.position.set(x, y, z);
      stack.add(g);
      y += h + 0.003;
      top = { w, d, x, z };
      index++;
    };
    const count = Math.round(mix(2.6, 5.4, mood.density));
    const text = WORDS[a.marker];
    if (a.load === 'boxes') {
      for (let i = 0; i < count; i++) {
        const w = mix(0.48, 0.32, i / count) + random() * 0.06, h = 0.24 + random() * 0.14, d = 0.3 + random() * 0.08;
        put(carton(w, h, d, card[Math.floor(random() * card.length)], { taped: true, text: i === 1 || (count < 3 && i === 0) ? text : undefined }), w, h, d);
      }
    } else if (a.load === 'office') {
      for (let i = 0; i < count; i++) put(carton(0.4, 0.26, 0.32, '#ece8dc', { lid: '#f6f3ea', text: i === 1 ? text || '2019' : undefined }), 0.4, 0.26, 0.32);
    } else if (a.load === 'totes') {
      const lids = ['#2f6fb5', '#c8372e', '#3d8a55', '#7a3fa0', '#e0a21f'];
      for (let i = 0; i < Math.min(count, 4); i++) { const lid = lids[Math.floor(random() * lids.length)]; put(carton(0.44, 0.3, 0.34, i % 2 ? '#d9dde0' : lid, { lid, text: i === 1 ? text : undefined }), 0.44, 0.3, 0.34); }
    } else if (a.load === 'appliance') {
      const fridge = carton(0.46, 0.82, 0.36, mood.warmth > 0.6 ? '#e9e2cf' : '#e4e6e6');
      add(s.box([0.44, 0.005, 0.005], [0, 0.56, 0.182], tyre), fridge); add(s.box([0.02, 0.18, 0.02], [0.18, 0.4, 0.19], steel), fridge);
      put(fridge, 0.46, 0.82, 0.36);
      const micro = carton(0.44, 0.26, 0.32, '#2c2e31');
      add(s.box([0.28, 0.18, 0.005], [-0.06, 0.13, 0.162], s.material('#0d0e10', { roughness: 0.2 })), micro);
      put(micro, 0.44, 0.26, 0.32);
      if (count > 3) put(carton(0.36, 0.24, 0.3, card[0], { taped: true, text }), 0.36, 0.24, 0.3);
    } else if (a.load === 'crates') {
      const cab = carton(0.46, 0.5, 0.34, '#26282b');
      add(s.cylinder(0.15, 0.15, 0.01, [0, 0.27, 0.172], s.material('#55585a'), 20), cab).rotation.x = Math.PI / 2;
      add(s.cylinder(0.05, 0.05, 0.012, [0, 0.27, 0.174], s.material('#1a1b1d'), 14), cab).rotation.x = Math.PI / 2;
      put(cab, 0.46, 0.5, 0.34);
      const crateCols = ['#2f6fb5', '#c8372e', '#2c2e31', '#3d8a55'];
      for (let i = 0; i < Math.max(1, count - 2); i++) {
        const tint = crateCols[Math.floor(random() * crateCols.length)];
        const g = carton(0.36, 0.26, 0.34, tint);
        // Record spines showing over the rim.
        for (let k = 0; k < 14; k++) add(s.box([0.018, 0.05, 0.3], [-0.15 + k * 0.023, 0.27, 0], s.material(['#e8dcc0', '#3a3a40', '#b5523c', '#d9b54a', '#5d7f8a'][Math.floor(random() * 5)])), g);
        put(g, 0.36, 0.26, 0.34);
      }
    } else {
      const g = carton(0.46, 1.25, 0.42, card[2], { taped: true, text: text || 'WARDROBE' });
      add(s.box([0.464, 0.03, 0.424], [0, 0.95, 0], tape), g);
      put(g, 0.46, 1.25, 0.42);
    }

    // When it has spilled, the upper part of the stack is on the ground instead.
    if (a.balance === 'spilled' && stack.children.length > 1) {
      const fallen = stack.children.slice(Math.max(1, Math.ceil(stack.children.length / 2)));
      let fy = Infinity;
      fallen.forEach((g, i) => {
        fy = Math.min(fy, g.position.y);
        stack.remove(g);
        g.position.set(-0.35 + i * 0.42 + (random() - 0.5) * 0.15, 0.0, 0.75 + random() * 0.3);
        g.rotation.set(i % 2 ? Math.PI / 2 : 0, random() * 3, i % 2 ? 0 : (random() < 0.5 ? Math.PI / 2 : 0));
        if (g.rotation.x || g.rotation.z) g.position.y = 0.19;
        spilled.push(g);
        s.root.add(g);
      });
      y = fy;
      const last = stack.children[stack.children.length - 1];
      top = { ...top, x: last.position.x, z: last.position.z };
    }

    // Topper.
    const tg = new THREE.Group();
    if (a.topper === 'lamp') {
      const brass = s.material('#b9954a', { metalness: 0.6, roughness: 0.4 });
      add(s.lathe([[0, 0], [0.09, 0], [0.085, 0.02], [0.03, 0.05], [0.05, 0.12], [0.06, 0.2], [0.02, 0.28], [0.012, 0.42]], brass), tg);
      const shade = add(s.lathe([[0.17, 0.3], [0.1, 0.56]], s.material(mood.warmth > 0.5 ? '#ecdcae' : '#e6e6dc', { side: THREE.DoubleSide, roughness: 0.9 })), tg);
      shade.rotation.z = a.balance === 'square' ? 0 : (random() - 0.5) * 0.5;
    } else if (a.topper === 'plant') {
      add(s.cylinder(0.11, 0.08, 0.17, [0, 0.085, 0], s.material('#b5613f')), tg);
      const leaf = s.material('#4f8a4a');
      for (let i = 0; i < 9; i++) { const t = i * 0.7, l = 0.25 + random() * 0.2; add(s.rod([0, 0.17, 0], [Math.cos(t) * l * 0.6, 0.17 + l, Math.sin(t) * l * 0.6], 0.012, leaf, 0.03), tg); }
    } else if (a.topper === 'birdcage') {
      const wire = s.material('#d9c27a', { metalness: 0.7, roughness: 0.35 });
      add(s.cylinder(0.14, 0.14, 0.02, [0, 0.01, 0], wire, 18), tg);
      for (let i = 0; i < 14; i++) { const t = (i / 14) * Math.PI * 2; add(s.tube([[Math.cos(t) * 0.135, 0.02, Math.sin(t) * 0.135], [Math.cos(t) * 0.135, 0.26, Math.sin(t) * 0.135], [Math.cos(t) * 0.09, 0.36, Math.sin(t) * 0.09], [0, 0.4, 0]], 0.004, wire), tg); }
      add(s.ring(0.135, 0.005, [0, 0.14, 0], wire), tg).rotation.x = Math.PI / 2;
      add(s.ring(0.02, 0.005, [0, 0.42, 0], wire), tg);
    } else if (a.topper === 'bear') {
      const fur = s.material(mood.wear > 0.5 ? '#8f7350' : '#b0875a', { roughness: 1 });
      add(s.ball([0.1, 0.11, 0.09], [0, 0.11, 0], fur, 14), tg); add(s.ball([0.075, 0.07, 0.07], [0, 0.26, 0.01], fur, 14), tg);
      for (const x of [-1, 1]) { add(s.ball([0.03, 0.03, 0.02], [x * 0.06, 0.32, 0], fur, 8), tg); add(s.ball([0.04, 0.04, 0.07], [x * 0.08, 0.04, 0.09], fur, 8), tg); add(s.ball([0.035, 0.06, 0.035], [x * 0.11, 0.14, 0.03], fur, 8), tg); }
      add(s.ball([0.03, 0.025, 0.03], [0, 0.245, 0.07], s.material('#e3d2b2'), 8), tg);
      for (const x of [-1, 1]) add(s.ball([0.01, 0.01, 0.01], [x * 0.03, 0.28, 0.065], s.material('#111'), 6), tg);
      tg.rotation.z = (random() - 0.5) * 0.4;
    } else if (a.topper === 'picture') {
      add(s.box([0.36, 0.03, 0.28], [0, 0.015, 0], s.material('#b9954a', { metalness: 0.5 })), tg);
      add(s.box([0.3, 0.032, 0.22], [0, 0.016, 0], s.material(mood.cheer > 0.5 ? '#7fb0c8' : '#6b6f72', { roughness: 0.2 })), tg);
      tg.rotation.y = (random() - 0.5) * 0.8;
    }
    if (a.topper !== 'none') {
      if (a.balance === 'spilled') {
        tg.position.set(0.5 + random() * 0.2, a.topper === 'picture' ? 0 : 0.1, 0.5 + random() * 0.2);
        if (a.topper !== 'picture') tg.rotation.z = Math.PI / 2 - 0.15;
        tg.rotation.y = random() * 3;
        s.root.add(tg);
      } else { tg.position.set(top.x, y, top.z); stack.add(tg); }
    }

    // Restraint, wrapped round the stack and the frame at about two-thirds height.
    const bandY = Math.min(y * 0.62, tall - 0.2);
    const loose = a.balance === 'toppling' || a.balance === 'spilled';
    const band = (yy: number, mat: THREE.Material, thick: number, tilt = 0) => {
      const w = 0.56, d = 0.46;
      const g = new THREE.Group();
      add(s.box([w, thick, 0.006], [0, 0, d - 0.06], mat), g); add(s.box([0.006, thick, d], [-w / 2, 0, d / 2 - 0.06], mat), g); add(s.box([0.006, thick, d], [w / 2, 0, d / 2 - 0.06], mat), g);
      g.position.y = yy; g.rotation.z = tilt;
      (loose ? s.root : stack).add(g);
      return g;
    };
    if (a.strap === 'ratchet') {
      const orange = s.material('#f0742a', { roughness: 0.6, emissive: '#f0742a', emissiveIntensity: 0.12 });
      if (loose) { s.tube([[0.2, tall * 0.7, FZ], [0.32, 0.3, 0.05], [0.4, 0.02, 0.3], [0.2, 0.012, 0.6], [0.5, 0.012, 0.75]], 0.012, orange).scale.y = 1; }
      else { const g = band(bandY, orange, 0.045); add(s.box([0.09, 0.07, 0.04], [0.12, 0, 0.42], steel), g); }
    } else if (a.strap === 'bungee') {
      const cord = s.material('#2f8f5a', { roughness: 0.6 }), cord2 = s.material('#c8372e', { roughness: 0.6 });
      if (loose) s.tube([[-0.2, tall * 0.5, FZ], [-0.34, 0.4, 0.05], [-0.38, 0.02, 0.2]], 0.008, cord);
      else { band(bandY - 0.08, cord, 0.016, 0.12); band(bandY + 0.08, cord2, 0.016, -0.12); }
    } else if (a.strap === 'rope') {
      const rope = s.material('#cdbb8c', { roughness: 1 });
      if (loose) s.tube([[0.2, tall * 0.6, FZ], [0.35, 0.3, 0.1], [0.3, 0.015, 0.4], [0.0, 0.015, 0.55], [0.15, 0.015, 0.8]], 0.009, rope);
      else { band(bandY, rope, 0.02, 0.04); band(bandY + 0.03, rope, 0.02, -0.03); add(s.ball([0.03, 0.03, 0.03], [0.05, bandY + 0.01, 0.41], rope, 8)); }
    }

    if (a.rug) {
      const rugTint = mood.cheer > 0.55 ? '#a8342f' : '#5a4a6a';
      const map = paint(64, 256, (ctx) => {
        ctx.fillStyle = rugTint; ctx.fillRect(0, 0, 64, 256);
        for (let i = 0; i < 16; i++) { ctx.fillStyle = ['#d9b54a', '#1d2d5a', '#e8dcc0'][i % 3]; ctx.fillRect(0, i * 16 + 4, 64, 3); }
      });
      const rug = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1.45, 16), new THREE.MeshStandardMaterial({ map, roughness: 1 }));
      rug.castShadow = true;
      rug.position.set(0.37, 0.75, 0.12);
      rug.rotation.z = a.balance === 'square' ? -0.03 : -0.12 - random() * 0.1;
      (a.balance === 'spilled' ? s.root : stack).add(rug);
      if (a.balance === 'spilled') { rug.rotation.set(0, 0.3, Math.PI / 2); rug.position.set(0.1, 0.085, 1.25); }
      const end = add(s.ring(0.045, 0.012, [0, 0.726, 0], s.material('#e8dcc0')), rug); end.rotation.x = Math.PI / 2;
    }

    // Lean of the whole tower.
    if (a.balance === 'toppling') { stack.rotation.z = -(0.2 + random() * 0.12); stack.position.x = 0.02; }
    else if (a.balance === 'leaning') stack.rotation.z = (random() - 0.5) * 0.08;
    s.root.add(stack);

    const wobble = a.balance === 'toppling' || a.balance === 'leaning' ? stack : null;
    const rest = stack.rotation.z, amp = mix(0.002, 0.02, mood.energy);
    return s.finish({ footprint: 0.55, update: wobble ? (_dt, time) => { wobble.rotation.z = rest + Math.sin(time * 2.3) * amp; } : undefined });
  },
});
