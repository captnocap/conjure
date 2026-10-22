import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PAINT = {
  'white-red': 'White enamel with fire-engine red trim, the standard fair trailer.',
  yellow: 'Sunshine yellow with brown trim, like the batter.',
  turquoise: 'Turquoise and cream, a 1950s canned-ham feeling.',
  pink: 'Cotton-candy pink with white trim.',
  aluminium: 'Bare ribbed aluminium with a blue stripe, plain and hardworking.',
  red: 'Solid carnival red with gold trim, loud from across the field.',
} as const;
const PAINT_COLOURS: Record<keyof typeof PAINT, [string, string]> = {
  'white-red': ['#f1ede2', '#c9302c'],
  yellow: ['#f0c63a', '#7a4a22'],
  turquoise: ['#49b3ad', '#f2ead2'],
  pink: ['#eb8fb0', '#fbf6ee'],
  aluminium: ['#b9bfc2', '#2f5fae'],
  red: ['#c4302b', '#e7b93c'],
};
const HEADLINES = {
  funnel: 'FUNNEL CAKES',
  dough: 'FRIED DOUGH',
  ears: 'ELEPHANT EARS',
  oreos: 'FRIED OREOS',
  everything: 'WE FRY ANYTHING',
} as const;
const TOPPINGS = {
  sugar: 'Plain powdered sugar, a white snowdrift.',
  strawberry: 'Red strawberry glop and whipped cream.',
  chocolate: 'Dark chocolate drizzle.',
  cinnamon: 'Brown cinnamon sugar.',
} as const;
const TOPPING_COLOUR: Record<keyof typeof TOPPINGS, string> = { sugar: '#ffffff', strawberry: '#d5283c', chocolate: '#4a2a18', cinnamon: '#a8682e' };

function menuTexture(style: 'painted' | 'prices' | 'chalk' | 'faded', main: string, trim: string, topping: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;
  const chalk = style === 'chalk';
  ctx.fillStyle = chalk ? '#26302b' : style === 'faded' ? '#d9d2bd' : '#fff6dc';
  ctx.fillRect(0, 0, 256, 384);
  ctx.strokeStyle = chalk ? '#e9e6da' : trim;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 374);
  ctx.textAlign = 'center';
  ctx.fillStyle = chalk ? '#f3f0e4' : style === 'faded' ? '#9b8f80' : trim;
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('MENU', 128, 54);
  const cake = (cx: number, cy: number, r: number) => {
    ctx.fillStyle = chalk ? '#26302b' : '#ffffff';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.2, r * 1.25, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = chalk ? '#f0d9a0' : style === 'faded' ? '#c8b48c' : '#d79a3c';
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    for (let i = 0; i <= 160; i++) {
      const t = i / 160 * Math.PI * 2;
      const rr = r * (0.55 + 0.38 * Math.sin(t * 7)) ;
      const x = cx + Math.cos(t * 3) * rr, y = cy + Math.sin(t * 3) * rr * 0.6;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = style === 'faded' ? '#e6dfd0' : topping;
    for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(cx + Math.cos(i * 2.4) * r * 0.6 * ((i % 5) / 5 + 0.2), cy + Math.sin(i * 2.4) * r * 0.35 * ((i % 4) / 4 + 0.2), r * 0.07, 0, Math.PI * 2); ctx.fill(); }
  };
  if (style === 'painted' || style === 'faded') {
    cake(128, 170, 84);
    ctx.fillStyle = style === 'faded' ? '#9b8f80' : main === '#f1ede2' ? trim : '#c9302c';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('HOT & FRESH', 128, 300);
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('$6', 128, 350);
  } else {
    cake(128, 104, 38);
    const rows: [string, string][] = [['FUNNEL CAKE', '6'], ['W/ TOPPING', '8'], ['FRIED OREOS', '5'], ['CORN DOG', '4'], ['LEMONADE', '3'], ['WATER', '2']];
    ctx.font = chalk ? 'italic 22px serif' : 'bold 21px sans-serif';
    rows.forEach(([name, price], i) => {
      const y = 180 + i * 34;
      ctx.fillStyle = chalk ? '#f3f0e4' : '#3a2a22';
      ctx.textAlign = 'left'; ctx.fillText(name, 24, y);
      ctx.fillStyle = chalk ? '#f2d36a' : trim;
      ctx.textAlign = 'right'; ctx.fillText('$' + price, 234, y);
    });
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    paint: choice('What colour is the trailer?', PAINT),
    state: choice('What is the trailer doing right now?', {
      frying: 'Flap up, lights blazing, steam pouring from the vent, plates going out.',
      lull: 'Open and lit but nobody is ordering; the fryer is idling.',
      soldout: 'Flap still up, lights off, a SOLD OUT card in the window.',
      shuttered: 'Flap folded down and latched, ready to be hitched and towed to the next town.',
    }),
    headline: choice('What do the big roof letters say?', HEADLINES),
    menu: choice('What is the menu board like?', {
      painted: 'A giant hand-painted funnel cake with a price under it.',
      prices: 'A tidy printed list of items and prices.',
      chalk: 'A chalkboard in looping handwriting.',
      faded: 'A sun-bleached picture, the colours nearly gone.',
    }),
    topping: choice('What goes on top of the cake?', TOPPINGS),
    topper: choice('What sits on the roof beside the sign?', {
      cake: 'A giant fibreglass funnel cake on a tilted plate.',
      bunting: 'Strings of little triangular flags.',
      bulbs: 'A double row of bare bulbs.',
      nothing: 'Just the vent pipe.',
    }),
    plates: score('How tall is the stack of paper plates on the counter?', ['Down to the last one', 'A handful', 'A healthy stack', 'A leaning tower']),
    barrel: noul('Is there a trash barrel beside it overflowing with used plates?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [main, trim] = PAINT_COLOURS[a.paint];
    const L = 4.4, D = 2.1, floorY = 0.55, H = 2.2, top = floorY + H;
    const open = a.state !== 'shuttered', lit = a.state === 'frying' || a.state === 'lull';
    const body = s.material(main, a.paint === 'aluminium' ? { metalness: 0.7, roughness: 0.4 } : { roughness: 0.45 });
    const trimMat = s.material(trim, { roughness: 0.5 });
    const steel = s.material('#b9bfc2', { metalness: 0.7, roughness: 0.35 });
    const dark = s.material('#26272a');
    const paper = s.material('#f6f3ea');
    const dough = s.material('#d9a24a', { roughness: 0.8 });
    const front = D / 2;

    // Body shell: built as panels around a dark interior so the window is a real opening.
    const wx = -0.45, ww = 2.5, wy0 = floorY + 0.72, wy1 = floorY + 1.72;
    s.box([L, H, 0.05], [0, floorY + H / 2, -front], body);
    for (const x of [-1, 1]) s.box([0.05, H, D], [x * L / 2, floorY + H / 2, 0], body);
    s.box([L, 0.08, D], [0, floorY + 0.04, 0], dark);
    s.box([L + 0.08, 0.08, D + 0.08], [0, top, 0], body);
    s.box([L, wy0 - floorY, 0.05], [0, (wy0 + floorY) / 2, front], body);
    s.box([L, top - wy1, 0.05], [0, (top + wy1) / 2, front], body);
    const leftW = wx - ww / 2 + L / 2, rightW = L / 2 - (wx + ww / 2);
    s.box([leftW, wy1 - wy0, 0.05], [-L / 2 + leftW / 2, (wy0 + wy1) / 2, front], body);
    s.box([rightW, wy1 - wy0, 0.05], [L / 2 - rightW / 2, (wy0 + wy1) / 2, front], body);
    // Trim band, ribs, corner caps.
    s.box([L + 0.02, 0.22, D + 0.02], [0, floorY + 0.3, 0], trimMat);
    s.box([L + 0.1, 0.07, D + 0.1], [0, top - 0.08, 0], trimMat);
    if (a.paint === 'aluminium') for (let i = 0; i < 22; i++) s.box([0.02, H - 0.5, 0.012], [-L / 2 + 0.1 + i * 0.2, floorY + H / 2 + 0.12, front + 0.03], steel).visible = Math.abs(-L / 2 + 0.1 + i * 0.2 - wx) > ww / 2 + 0.05 && -L / 2 + 0.1 + i * 0.2 < 0.95;

    // Interior: warm glow, fryer and a hanging heat lamp.
    const glow = new THREE.MeshStandardMaterial({ color: lit ? '#ffe2a6' : '#4a4640', emissive: '#ffb95e', emissiveIntensity: lit ? mix(0.5, 1.1, mood.cheer) : 0 });
    s.box([ww + 0.5, wy1 - wy0 + 0.4, 0.04], [wx, (wy0 + wy1) / 2, -0.35], glow);
    s.box([0.9, 0.5, 0.6], [wx - 0.5, wy0 + 0.05, 0.35], steel);
    s.box([0.8, 0.03, 0.5], [wx - 0.5, wy0 + 0.31, 0.35], s.material('#c9892e', { roughness: 0.2 }));
    s.box([0.5, 0.6, 0.5], [wx + 0.75, wy0 + 0.1, 0.3], steel);

    // Counter shelf with brackets.
    s.box([ww + 0.3, 0.05, 0.42], [wx, wy0 - 0.02, front + 0.2], steel);
    for (const x of [-1, 1]) s.rod([wx + x * ww * 0.45, wy0 - 0.04, front + 0.36], [wx + x * ww * 0.45, wy0 - 0.38, front + 0.02], 0.015, steel);

    // Serving flap: hinged at the top of the window.
    const flap = new THREE.Group();
    flap.position.set(wx, wy1 + 0.02, front + 0.04);
    const flapH = wy1 - wy0 + 0.04;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.1, flapH, 0.04), body);
    panel.position.y = -flapH / 2;
    const band = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.12, 0.16, 0.05), trimMat);
    band.position.y = -flapH + 0.12;
    panel.castShadow = band.castShadow = true;
    flap.add(panel, band);
    const lift = open ? -mix(1.5, 1.8, random()) : 0;
    flap.rotation.x = lift;
    s.root.add(flap);
    if (open) {
      const ey = wy1 + 0.02 - Math.cos(lift) * flapH * 0.9, ez = front + 0.04 - Math.sin(lift) * flapH * 0.9;
      for (const x of [-1, 1]) s.rod([wx + x * (ww / 2 - 0.05), wy0 + 0.02, front + 0.38], [wx + x * (ww / 2 - 0.05), ey, ez], 0.014, steel);
      const bulbMat = new THREE.MeshStandardMaterial({ color: lit ? '#fff2c2' : '#8d897c', emissive: '#ffc15a', emissiveIntensity: lit ? 1.3 : 0 });
      const edgeY = wy1 + 0.02 - Math.cos(lift) * flapH, edgeZ = front + 0.04 - Math.sin(lift) * flapH;
      for (let i = 0; i < 11; i++) if (random() > mood.wear * 0.4) s.mesh(new THREE.SphereGeometry(0.035, 8, 6), bulbMat, [wx + (i - 5) * ww / 10.5, edgeY - 0.04, edgeZ]);
    } else {
      for (const x of [-0.8, 0.8]) s.box([0.08, 0.14, 0.03], [wx + x, wy0 + 0.02, front + 0.08], steel);
    }

    // Menu board beside the window.
    const menu = s.mesh(new THREE.PlaneGeometry(1.05, 1.5), new THREE.MeshStandardMaterial({ map: menuTexture(a.menu, main, trim === '#f2ead2' || trim === '#fbf6ee' ? '#c9302c' : trim, TOPPING_COLOUR[a.topping]), roughness: 0.8 }), [L / 2 - rightW / 2 - 0.02, floorY + 1.22, front + 0.032]);
    menu.rotation.z = (random() - 0.5) * 0.03 * (1 + mood.wear * 3);
    // Small service door on the left end and a sold-out card.
    s.box([0.03, 1.7, 0.7], [-L / 2 - 0.02, floorY + 0.95, -0.2], trimMat);
    if (a.state === 'soldout') s.label('SOLD OUT', 1.1, 0.36, [wx + (random() - 0.5) * 0.6, wy0 + 0.5, front + 0.06], '#c9302c', '#fbf6ee').rotation.z = (random() - 0.5) * 0.2;

    // Roof sign, vent and topper.
    const light = main === '#f1ede2' || main === '#f0c63a' || main === '#b9bfc2';
    const sign = s.label(HEADLINES[a.headline], L * 0.82, 0.62, [0, top + 0.42, front - 0.2], light ? '#fff6dc' : trim, light ? trim : '#3a1d16');
    s.box([L * 0.86, 0.7, 0.07], [0, top + 0.42, front - 0.25], trimMat);
    const signMat = sign.material as THREE.MeshStandardMaterial;
    if (lit) { signMat.emissive = new THREE.Color('#ffffff'); signMat.emissiveMap = signMat.map; signMat.emissiveIntensity = mix(0.2, 0.55, mood.cheer); }
    const ventX = wx - 0.5, ventZ = -0.45;
    s.cylinder(0.11, 0.11, 0.5, [ventX, top + 0.28, ventZ], steel, 12);
    s.cylinder(0.19, 0.19, 0.04, [ventX, top + 0.6, ventZ], steel, 12);

    const squiggle = (r: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 140; i++) {
        const t = i / 140 * Math.PI * 2, rr = r * (0.55 + 0.4 * Math.sin(t * 7));
        pts.push(new THREE.Vector3(Math.cos(t * 3) * rr, Math.sin(t * 11) * r * 0.06, Math.sin(t * 3) * rr));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 150, r * 0.085, 5);
    };
    const cakeOn = (group: THREE.Object3D, r: number) => {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.2, r * 0.95, r * 0.08, 20), paper);
      const cake = new THREE.Mesh(squiggle(r), dough);
      cake.position.y = r * 0.14;
      const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: TOPPING_COLOUR[a.topping], roughness: 0.9 }), 40);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 40; i++) {
        const ang = random() * Math.PI * 2, rad = Math.sqrt(random()) * r * 0.8, sz = r * mix(0.05, 0.13, random());
        m.makeScale(sz, sz * 0.6, sz).setPosition(Math.cos(ang) * rad, r * 0.24, Math.sin(ang) * rad);
        dots.setMatrixAt(i, m);
      }
      plate.castShadow = cake.castShadow = dots.castShadow = true;
      group.add(plate, cake, dots);
    };
    if (a.topper === 'cake') {
      const g = new THREE.Group();
      cakeOn(g, 0.55);
      g.position.set(L / 2 - 0.85, top + 0.62, -0.35);
      g.rotation.x = 0.75;
      s.root.add(g);
      s.rod([L / 2 - 0.85, top, -0.45], [L / 2 - 0.85, top + 0.55, -0.42], 0.04, steel);
    } else if (a.topper === 'bunting') {
      const flags: { at: [number, number, number]; size: number; color: string }[] = [];
      const cols = [main, trim, '#f2c53d', '#3f8fd0', '#e86a9a'];
      for (const z of [front - 0.05, -front + 0.05]) {
        s.rod([-L / 2, top + 0.06, z], [L / 2, top + 0.06, z], 0.006, dark);
      }
      for (let i = 0; i < 22; i++) flags.push({ at: [-L / 2 + 0.1 + i * (L - 0.2) / 21, top - 0.02 + Math.abs(Math.sin(i * 0.6)) * 0.03, front + 0.07], size: 0.13, color: cols[i % cols.length] });
      for (const x of [-1, 1]) for (let i = 0; i < 9; i++) flags.push({ at: [x * (L / 2 + 0.07), top - 0.02, -front + 0.15 + i * 0.22], size: 0.13, color: cols[(i + 2) % cols.length] });
      const g = new THREE.ConeGeometry(0.8, 1.6, 3); g.rotateX(Math.PI); g.translate(0, -0.8, 0);
      s.scatter(g, new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), flags);
    } else if (a.topper === 'bulbs') {
      const bm = new THREE.MeshStandardMaterial({ color: lit ? '#fff2c2' : '#8d897c', emissive: '#ffc15a', emissiveIntensity: lit ? 1.3 : 0 });
      const pts: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 24; i++) for (const y of [0.04, 0.8]) pts.push({ at: [-L * 0.42 + i * L * 0.84 / 23, top + y, front - 0.2], size: 0.04 });
      s.scatter(new THREE.SphereGeometry(1, 8, 6), bm, pts);
    }

    // Plates on the counter, with one served cake.
    if (open) {
      const n = Math.max(1, Math.round(mix(1, 34, a.plates)));
      const px = wx + ww / 2 - 0.25;
      for (let i = 0; i < n; i += 2) s.cylinder(0.12, 0.1, 0.014, [px + Math.sin(i * 0.6) * a.plates * 0.012 * (i / 6), wy0 + 0.012 + i * 0.007, front + 0.24], paper, 14);
      if (a.state !== 'soldout') {
        const count = a.state === 'frying' ? 1 + Math.round(mood.density * 2) : 1;
        for (let i = 0; i < count; i++) {
          const g = new THREE.Group();
          cakeOn(g, 0.1);
          g.position.set(wx - 0.6 + i * 0.36 + (random() - 0.5) * 0.06, wy0 + 0.02, front + 0.24);
          g.rotation.y = random() * 6;
          s.root.add(g);
        }
      }
      // Napkin box and sugar shaker.
      s.box([0.14, 0.12, 0.12], [wx - ww / 2 + 0.2, wy0 + 0.06, front + 0.22], steel);
      s.cylinder(0.035, 0.04, 0.12, [wx - ww / 2 + 0.42, wy0 + 0.06, front + 0.26], steel, 10);
    }

    // Running gear: axle, wheels, fenders, tongue with propane and jack.
    const tyre = s.material('#1f1f21', { roughness: 0.9 });
    for (const z of [-1, 1]) {
      const wheel = s.cylinder(0.34, 0.34, 0.2, [0.2, 0.34, z * (front - 0.02)], tyre, 18);
      wheel.rotation.x = Math.PI / 2;
      const hub = s.cylinder(0.16, 0.16, 0.21, [0.2, 0.34, z * (front - 0.01)], steel, 12);
      hub.rotation.x = Math.PI / 2;
      s.box([0.95, 0.06, 0.26], [0.2, 0.74, z * (front + 0.02)], trimMat);
    }
    const hx = L / 2 + 1.05;
    for (const z of [-1, 1]) s.rod([L / 2, floorY + 0.05, z * 0.6], [hx, floorY + 0.02, 0], 0.035, dark);
    s.box([0.16, 0.1, 0.12], [hx + 0.04, floorY + 0.03, 0], steel);
    s.rod([hx - 0.2, floorY + 0.4, 0], [hx - 0.2, 0.02, 0], 0.025, steel);
    s.cylinder(0.09, 0.09, 0.02, [hx - 0.2, 0.01, 0], steel, 10);
    for (const z of [-0.2, 0.2]) {
      s.cylinder(0.15, 0.15, 0.5, [L / 2 + 0.3, floorY + 0.36, z], paper, 14);
      s.ball([0.15, 0.1, 0.15], [L / 2 + 0.3, floorY + 0.61, z], paper, 12);
      s.cylinder(0.05, 0.05, 0.1, [L / 2 + 0.3, floorY + 0.72, z], steel, 8);
    }
    for (const x of [-1, 1]) s.box([0.12, floorY + 0.02, 0.12], [x * (L / 2 - 0.2), floorY / 2, -front + 0.15], dark);
    // Folding step below the window when open.
    if (open && mood.density > 0.3) s.box([0.9, 0.06, 0.5], [wx, 0.2, front + 0.5], s.material('#7d7366', { metalness: 0.4 }));

    // Trash barrel.
    if (a.barrel) {
      const bx = -L / 2 - 0.55, bz = front + 0.35;
      s.cylinder(0.3, 0.27, 0.9, [bx, 0.45, bz], s.material('#3f6b8f', { metalness: 0.3 }), 16);
      for (const y of [0.3, 0.6]) s.ring(0.3, 0.015, [bx, y, bz], steel).rotation.x = Math.PI / 2;
      for (let i = 0; i < 9; i++) {
        const p = s.cylinder(0.12, 0.1, 0.012, [bx + (random() - 0.5) * 0.4, 0.92 + random() * 0.22, bz + (random() - 0.5) * 0.4], paper, 12);
        p.rotation.set((random() - 0.5) * 1.4, 0, (random() - 0.5) * 1.4);
      }
      for (let i = 0; i < 4; i++) s.cylinder(0.12, 0.1, 0.012, [bx + (random() - 0.5) * 1.1, 0.008, bz + 0.3 + random() * 0.5], paper, 12);
    }

    // Steam puffs from the vent.
    const puffs: THREE.Mesh[] = [];
    if (a.state === 'frying' || a.state === 'lull') {
      const steam = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: a.state === 'frying' ? 0.3 : 0.14, depthWrite: false, roughness: 1 });
      const n = a.state === 'frying' ? 7 : 3;
      for (let i = 0; i < n; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), steam);
        puff.userData.phase = i / n + random() * 0.1;
        puff.userData.drift = (random() - 0.5) * 0.6;
        s.root.add(puff);
        puffs.push(puff);
      }
    }
    const place = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.userData.phase + time * mix(0.08, 0.3, mood.energy)) % 1;
        puff.position.set(ventX + puff.userData.drift * t + t * 0.5, top + 0.7 + t * 1.5, ventZ + puff.userData.drift * t * 0.5);
        puff.scale.setScalar(0.14 + t * 0.4);
      }
    };
    place(0);
    return s.finish({ update: (_dt, time) => place(time) });
  },
});
