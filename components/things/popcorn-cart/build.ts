import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;
function paint(w: number, h: number, draw: (c: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const WARES = {
  popcorn: 'Popcorn: a heap of pale yellow popped corn under a hanging kettle.',
  floss: 'Candy floss: pink and blue clouds of spun sugar on sticks.',
  nuts: 'Roasted nuts: a brown glazed heap, with paper cones ready.',
  apples: 'Toffee apples: glossy red apples on sticks in rows.',
} as const;
const SIGNS: Record<keyof typeof WARES, string> = { popcorn: 'POPCORN', floss: 'CANDY FLOSS', nuts: 'HOT NUTS', apples: 'TOFFEE APPLES' };
const SCHEMES = {
  red: 'Bright red with gold lettering and red-and-white stripes: the classic.',
  cream: 'Cream and bottle green, an Edwardian park kiosk.',
  blue: 'Sky blue and yellow, seaside cheerful.',
  black: 'Black and gold, a smart cinema lobby cart.',
  pink: 'Candy pink and white, sugar-sweet.',
} as const;
const HUES: Record<keyof typeof SCHEMES, { body: string; stripe: string; trim: string; ink: string }> = {
  red: { body: '#c8212a', stripe: '#f5efe2', trim: '#e9b930', ink: '#f6d24a' },
  cream: { body: '#efe4c4', stripe: '#1f6a4a', trim: '#1f6a4a', ink: '#1f6a4a' },
  blue: { body: '#3f8fd0', stripe: '#f6d24a', trim: '#f6d24a', ink: '#fdf6dc' },
  black: { body: '#1d1c20', stripe: '#d6aa3c', trim: '#d6aa3c', ink: '#e6bd4e' },
  pink: { body: '#ee86ac', stripe: '#fbf7f0', trim: '#fbf7f0', ink: '#fbf7f0' },
};
const PRICES = { five: '5¢', ten: '10¢', quarter: '25¢', dollar: '$1', free: 'FREE', sold: 'SOLD OUT' } as const;

export default defineThing({
  questions: {
    wares: choice('What does the cart sell?', WARES),
    fill: score('How full is the glass case?', ['Empty but for crumbs', 'A few handfuls left', 'Half full', 'Heaped to the top, overflowing']),
    price: choice('What does the hand-lettered price card say?', {
      five: '5¢, a long time ago.', ten: '10¢.', quarter: '25¢.', dollar: '$1.', free: 'FREE, a gift or a trap.', sold: 'SOLD OUT.',
    }),
    spilled: noul('Does a spilled box lie on the ground beside it, its contents scattered?'),
    scheme: choice('What colours is the cart?', SCHEMES),
    canopy: choice('What shelters the cart?', {
      awning: 'A flat striped awning with a scalloped valance on four slim posts.',
      roof: 'A curved striped tin roof like a little bandstand.',
      umbrella: 'A big striped umbrella on a pole.',
      none: 'Nothing: the case stands open to the sky.',
    }),
    state: choice('What is the cart doing?', {
      popping: 'In full swing: the lamp is lit, the kettle steaming, fresh boxes stacked ready.',
      waiting: 'Lit and stocked but quiet, waiting for a customer.',
      closed: 'Shut for the night: lamp out, a cloth thrown over the case.',
      abandoned: 'Abandoned mid-shift: lamp still on, the scoop dropped, a box left half filled.',
    }),
    extras: choice('What else is on the counter?', {
      boxes: 'Just the stacks of striped boxes.',
      bell: 'A brass service bell and a jar of paper straws.',
      till: 'A small cash tin with coins spilling out.',
      balloons: 'A few balloons tied to the corner post.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const p = HUES[a.scheme];
    const closed = a.state === 'closed';
    const lit = !closed;
    const W = 1.5, D = 0.78, BASE = 0.62, BODY = 0.42, COUNTER = BASE + BODY, CASE = 0.72;
    const CX = -0.2, CW = 0.9;
    const rough = 0.42 + mood.wear * 0.4;
    const wear = (c: Ctx, w: number, h: number, n: number) => {
      for (let i = 0; i < n * mood.wear; i++) {
        c.fillStyle = random() < 0.5 ? 'rgba(95,70,50,0.8)' : 'rgba(205,195,175,0.8)';
        c.beginPath();
        c.ellipse(random() * w, random() * h, 3 + random() * 12, 2 + random() * 7, random() * 3, 0, 7);
        c.fill();
      }
    };
    const stripes = (n: number, vertical = true) => paint(256, 64, (c, w, h) => {
      for (let i = 0; i < n; i++) { c.fillStyle = i % 2 ? p.stripe : p.body; if (vertical) c.fillRect((i * w) / n, 0, w / n + 1, h); else c.fillRect(0, (i * h) / n, w, h / n + 1); }
    });
    const bodyMap = paint(512, 160, (c, w, h) => {
      c.fillStyle = p.body; c.fillRect(0, 0, w, h);
      c.strokeStyle = p.trim; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20);
      c.lineWidth = 2; c.strokeRect(20, 20, w - 40, h - 40);
      c.fillStyle = p.ink; c.textAlign = 'center'; c.textBaseline = 'middle';
      const text = SIGNS[a.wares];
      c.font = `bold ${Math.min(92, (w * 1.45) / text.length)}px Georgia, serif`;
      c.fillText(text, w / 2, h / 2 + 4, w - 60);
      wear(c, w, h, 110);
    });
    const body = s.material(p.body, { roughness: rough });
    const front = new THREE.MeshStandardMaterial({ map: bodyMap, roughness: rough });
    const trim = s.material(p.trim, { metalness: a.scheme === 'cream' || a.scheme === 'pink' ? 0.05 : 0.5, roughness: 0.4 });
    const steel = s.material('#c9cdd0', { metalness: 0.8, roughness: 0.28 });
    const iron = s.material('#232327', { metalness: 0.5, roughness: 0.5 });
    const wood = s.material('#8a6238');
    const glass = new THREE.MeshPhysicalMaterial({ color: '#eaf6f8', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false });

    // Wagon body, counter, push handle, wheels.
    s.mesh(new THREE.BoxGeometry(W, BODY, D), [body, body, body, body, front, front] as unknown as THREE.Material, [0, BASE + BODY / 2, 0]);
    s.box([W + 0.14, 0.05, D + 0.14], [0, COUNTER + 0.025, 0], steel);
    s.box([W + 0.06, 0.05, D + 0.06], [0, BASE - 0.02, 0], trim);
    for (const z of [-1, 1]) s.tube([[-W / 2, COUNTER - 0.1, z * (D / 2 - 0.06)], [-W / 2 - 0.3, COUNTER + 0.02, z * (D / 2 - 0.06)], [-W / 2 - 0.42, COUNTER + 0.06, z * (D / 2 - 0.06)]], 0.02, steel);
    s.rod([-W / 2 - 0.42, COUNTER + 0.06, -D / 2 + 0.06], [-W / 2 - 0.42, COUNTER + 0.06, D / 2 - 0.06], 0.026, wood);
    const wheel = (r: number, at: P3) => {
      const g = new Sculpture(context);
      g.ring(r - 0.03, 0.03, [0, 0, 0], iron);
      g.ring(r - 0.07, 0.02, [0, 0, 0], trim);
      for (let i = 0; i < 6; i++) g.box([(r - 0.05) * 2, 0.028, 0.025], [0, 0, 0], i % 2 ? trim : body).rotation.z = (i * Math.PI) / 6;
      g.cylinder(0.06, 0.06, 0.1, [0, 0, 0], trim, 12).rotation.x = Math.PI / 2;
      g.root.position.set(...at);
      g.root.rotation.z = random() * 6;
      s.root.add(g.root);
    };
    const RW = 0.44;
    for (const z of [-1, 1]) wheel(RW, [-0.22, RW, z * (D / 2 + 0.07)]);
    s.rod([-0.22, RW, -D / 2 - 0.07], [-0.22, RW, D / 2 + 0.07], 0.03, iron);
    wheel(0.2, [W / 2 - 0.2, 0.2, 0]);
    s.rod([W / 2 - 0.2, 0.2, -0.07], [W / 2 - 0.2, BASE, -0.07], 0.02, iron);
    s.rod([W / 2 - 0.2, 0.2, 0.07], [W / 2 - 0.2, BASE, 0.07], 0.02, iron);
    s.rod([-W / 2 + 0.12, BASE, 0], [-W / 2 + 0.1, 0, 0], 0.02, iron);

    // Glass case: corner posts, top rail, panes, lamp, and the wares inside.
    const caseY = COUNTER + 0.05;
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.035, CASE, 0.035], [CX + x * (CW / 2), caseY + CASE / 2, z * (D / 2 - 0.06)], trim);
    s.box([CW + 0.06, 0.045, D - 0.06], [CX, caseY + CASE + 0.02, 0], trim);
    s.box([CW + 0.04, 0.03, D - 0.08], [CX, caseY + 0.015, 0], trim);
    s.box([CW, CASE, D - 0.12], [CX, caseY + CASE / 2, 0], glass).castShadow = false;
    const lamp = new THREE.MeshStandardMaterial({ color: lit ? '#fff0b8' : '#8d8a80', emissive: lit ? '#ffc04a' : '#000000', emissiveIntensity: lit ? mix(0.8, 2.0, 1 - mood.daylight * 0.5) : 0 });
    s.ball([0.06, 0.06, 0.06], [CX + CW / 2 - 0.14, caseY + CASE - 0.08, 0], lamp, 12);
    const fill = a.fill;
    const heap = (n: number, hues: string[], size: number, glossy = false) => {
      const pts: { at: P3; size: number; color: string }[] = [];
      const hx = CW / 2 - 0.07, hz = D / 2 - 0.13, top = mix(0.02, CASE * 0.62, fill);
      for (let i = 0; i < n; i++) {
        const x = (random() * 2 - 1) * hx, z = (random() * 2 - 1) * hz;
        const lump = top * (1 - 0.45 * ((x / hx) ** 2 * 0.6 + (z / hz) ** 2 * 0.4));
        pts.push({ at: [CX + x, caseY + 0.03 + lump * Math.pow(random(), 0.45) + size * 0.5, z], size: size * (0.8 + random() * 0.5), color: hues[Math.floor(random() * hues.length)] });
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: glossy ? 0.3 : 0.85, flatShading: !glossy }), pts);
      if (top > 0.08) s.box([CW - 0.12, top * 0.72, D - 0.24], [CX, caseY + 0.03 + top * 0.36, 0], s.material(hues[0], { roughness: 0.9 }));
    };
    const steamPuffs: { mesh: THREE.Mesh; home: THREE.Vector3; phase: number; size: number }[] = [];
    if (a.wares === 'popcorn') {
      heap(Math.round(30 + fill * 260), ['#f6e7a8', '#fbf3cf', '#f1d77a', '#fff8dd'], 0.03);
      // Kettle hanging from the roof of the case on a bracket.
      const kx = CX - 0.15, ky = caseY + CASE - 0.26;
      s.rod([kx, caseY + CASE, 0], [kx, ky + 0.1, 0], 0.012, steel);
      s.lathe([[0.001, -0.09], [0.1, -0.08], [0.125, 0], [0.12, 0.06], [0.128, 0.065]], steel, [kx, ky, 0]).material.side = THREE.DoubleSide;
      s.cylinder(0.13, 0.13, 0.012, [kx, ky + 0.085, 0], steel, 16).rotation.z = a.state === 'popping' ? 0.5 : 0;
      s.rod([kx + 0.12, ky, 0], [kx + 0.24, ky + 0.02, 0], 0.012, iron);
    } else if (a.wares === 'floss') {
      const n = Math.round(1 + fill * 7);
      const hues = ['#f7a8c8', '#a8d4f2', '#f7a8c8', '#fbe3a0', '#c8b0ee'];
      for (let i = 0; i < n; i++) {
        const x = CX - CW / 2 + 0.12 + ((i % 4) + 0.5 * (Math.floor(i / 4) % 2)) * 0.2, z = (Math.floor(i / 4) - 0.5) * 0.24;
        const tilt = (random() - 0.5) * 0.3;
        s.rod([x, caseY + 0.03, z], [x + tilt * 0.3, caseY + 0.3, z], 0.008, s.material('#f1e6c8'));
        const cloud = s.material(hues[(i + Math.floor(random() * 2)) % hues.length], { roughness: 1 });
        for (let k = 0; k < 4; k++) s.ball([0.075 - k * 0.006, 0.07, 0.075 - k * 0.006], [x + tilt * (0.3 + k * 0.05) + (random() - 0.5) * 0.03, caseY + 0.32 + k * 0.065, z + (random() - 0.5) * 0.03], cloud, 9);
      }
      // The spinning pan.
      s.cylinder(0.16, 0.12, 0.07, [CX + CW / 2 - 0.2, caseY + 0.065, 0.02], steel, 20);
    } else if (a.wares === 'nuts') {
      heap(Math.round(30 + fill * 240), ['#7a4a22', '#96602c', '#5e3718', '#b07a3a'], 0.026, true);
      s.cylinder(0.12, 0.09, 0.08, [CX + CW / 2 - 0.16, caseY + mix(0.08, CASE * 0.5, fill), 0.1], s.material('#b06a2a', { metalness: 0.7, roughness: 0.35 }), 16);
    } else {
      const n = Math.round(1 + fill * 13);
      const toffee = new THREE.MeshStandardMaterial({ color: '#b3141e', roughness: 0.12, metalness: 0.1 });
      const tray = s.material('#e9e4d6', { metalness: 0.4, roughness: 0.4 });
      s.box([CW - 0.1, 0.02, D - 0.22], [CX, caseY + 0.05, 0], tray);
      s.box([CW - 0.1, 0.02, D * 0.3], [CX, caseY + 0.34, -0.1], tray);
      for (let i = 0; i < n; i++) {
        const shelf = i >= 8 ? 1 : 0, k = shelf ? i - 8 : i;
        const x = CX - CW / 2 + 0.13 + (k % 4) * 0.2 + (shelf ? 0.1 : 0), z = shelf ? -0.1 : (Math.floor(k / 4) - 0.5) * 0.22, y = caseY + (shelf ? 0.4 : 0.11);
        s.ball([0.062, 0.058, 0.062], [x, y, z], toffee, 12);
        s.rod([x, y + 0.04, z], [x + (random() - 0.5) * 0.04, y + 0.19, z + (random() - 0.5) * 0.04], 0.007, s.material('#e8dab0'));
      }
    }
    if (a.state === 'popping') {
      const steam = s.material('#f5f5f2', { roughness: 1 });
      for (let i = 0; i < 5; i++) {
        const u = (i + 1) / 5, size = 0.05 + u * 0.07;
        const home = new THREE.Vector3(CX - 0.1 + (random() - 0.5) * 0.2 * u, caseY + CASE + 0.12 + u * 0.75 + (a.canopy === 'none' ? 0 : 0.75), (random() - 0.5) * 0.2 * u);
        steamPuffs.push({ mesh: s.ball([size, size, size], home.toArray() as P3, steam, 8), home, phase: random() * 6, size });
      }
    }
    if (closed) {
      const cloth = paint(64, 64, (c, w, h) => { c.fillStyle = '#e9e2cf'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(120,110,90,0.25)'; for (let i = 0; i < 8; i++) c.fillRect(i * 8, 0, 2, h); });
      const geo = new THREE.BoxGeometry(CW + 0.1, CASE * 0.75, D - 0.02, 10, 5, 6);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) if (pos.getY(i) < -CASE * 0.3) pos.setY(i, pos.getY(i) + Math.sin(pos.getX(i) * 14 + pos.getZ(i) * 11) * 0.06);
      geo.computeVertexNormals();
      s.mesh(geo, new THREE.MeshStandardMaterial({ map: cloth, roughness: 1, side: THREE.DoubleSide }), [CX, caseY + CASE * 0.66, 0]);
    }

    // Canopy.
    const topY = caseY + CASE + 0.04;
    const awnMap = stripes(12);
    const awn = new THREE.MeshStandardMaterial({ map: awnMap, roughness: 0.8, side: THREE.DoubleSide });
    if (a.canopy === 'awning' || a.canopy === 'roof') {
      const AY = topY + 0.5, AW = W + 0.3, AD = D + 0.5;
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([x * (W / 2 - 0.02), COUNTER, z * (D / 2 - 0.02)], [x * (W / 2 - 0.02), AY, z * (D / 2 - 0.02)], 0.018, trim);
      if (a.canopy === 'awning') {
        const top = s.mesh(new THREE.BoxGeometry(AW, 0.04, AD), awn, [0, AY + 0.1, 0]);
        top.rotation.x = 0.1;
        // Scalloped valance all round.
        const pts: { at: P3; size: number; color: string }[] = [];
        const n = 12;
        for (let i = 0; i < n; i++) for (const z of [-1, 1]) pts.push({ at: [-AW / 2 + (i + 0.5) * (AW / n), AY + 0.08 - z * 0.03, z * (AD / 2)], size: 1, color: i % 2 ? p.stripe : p.body });
        const scallop = new THREE.CylinderGeometry(AW / n / 2, AW / n / 2, 0.02, 12, 1, false, Math.PI / 2, Math.PI);
        scallop.rotateX(Math.PI / 2);
        s.scatter(scallop, new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), pts);
      } else {
        const geo = new THREE.CylinderGeometry(AD * 0.62, AD * 0.62, AW, 20, 1, true, -0.95, 1.9);
        geo.rotateZ(Math.PI / 2);
        geo.rotateX(-Math.PI / 2);
        awnMap.center.set(0.5, 0.5);
        awnMap.rotation = Math.PI / 2;
        s.mesh(geo, awn, [0, AY - AD * 0.62 * Math.cos(0.95) + 0.06, 0]);
        s.ball([0.05, 0.08, 0.05], [0, AY + AD * 0.62 * (1 - Math.cos(0.95)) + 0.12, 0], trim, 10);
        for (const x of [-1, 1]) s.box([0.03, 0.06, AD * 0.62 * Math.sin(0.95) * 2], [x * (AW / 2), AY + 0.06, 0], trim);
      }
    } else if (a.canopy === 'umbrella') {
      const ux = W / 2 - 0.15, uz = -D / 2 + 0.1, UY = topY + 0.85;
      s.rod([ux, COUNTER, uz], [ux, UY + 0.1, uz], 0.02, wood);
      const brolly = s.mesh(new THREE.ConeGeometry(1.05, 0.38, 12, 1, true), awn, [ux - 0.3, UY, uz + 0.25]);
      brolly.rotation.set(0.14, random() * 6, 0.14);
      s.ball([0.04, 0.06, 0.04], [ux - 0.33, UY + 0.22, uz + 0.28], trim, 8);
    }

    // Price card on the case front.
    const priceText = PRICES[a.price];
    const cardMap = paint(256, 160, (c, w, h) => {
      c.fillStyle = '#f6efd8'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#2a2420'; c.lineWidth = 5; c.strokeRect(8, 8, w - 16, h - 16);
      c.fillStyle = a.price === 'sold' ? '#b3141e' : '#2a2420'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.translate(w / 2, h / 2); c.rotate((random() - 0.5) * 0.12);
      c.font = `italic bold ${Math.min(110, (w * 1.5) / priceText.length)}px Georgia, serif`;
      c.fillText(priceText, 0, 6, w - 30);
    });
    const card = s.mesh(new THREE.PlaneGeometry(0.34, 0.21), new THREE.MeshStandardMaterial({ map: cardMap, roughness: 0.9, side: THREE.DoubleSide }), [CX + (random() - 0.5) * 0.2, caseY + CASE * 0.6, D / 2 - 0.035]);
    card.rotation.z = (random() - 0.5) * 0.14;
    card.castShadow = false;

    // Stacked striped boxes on the open end of the counter, and the scoop.
    const boxMap = stripes(8);
    const boxPaint = new THREE.MeshStandardMaterial({ map: boxMap, roughness: 0.8 });
    const box = (at: P3, turn: number) => {
      const b = s.mesh(new THREE.CylinderGeometry(0.075, 0.055, 0.17, 4, 1, true), boxPaint, at);
      b.rotation.y = Math.PI / 4 + turn;
      b.material.side = THREE.DoubleSide;
      return b;
    };
    const stackX = W / 2 - 0.22;
    const stacks = a.state === 'closed' ? 1 : 1 + Math.round(mood.density * 2);
    for (let k = 0; k < stacks; k++) {
      const n = 3 + Math.floor(random() * 5);
      const sx = stackX + (k % 2) * 0.16 - 0.08, sz = -0.2 + Math.floor(k / 2) * 0.2 + (k % 2) * 0.08;
      for (let i = 0; i < n; i++) box([sx, COUNTER + 0.05 + 0.085 + i * 0.045, sz], 0).rotation.x = Math.PI;
    }
    const filled = box([stackX - 0.02, COUNTER + 0.135, 0.22], random() * 0.5);
    const wareHue = { popcorn: '#f6e7a8', floss: '#f7a8c8', nuts: '#7a4a22', apples: '#b3141e' }[a.wares];
    if (!closed) s.ball([0.075, 0.05, 0.075], [filled.position.x, COUNTER + 0.225, 0.22], s.material(wareHue, { roughness: 0.9 }), 8);
    const scoop = new Sculpture(context);
    scoop.cylinder(0.05, 0.05, 0.16, [0, 0, 0], steel, 12).rotation.z = Math.PI / 2;
    scoop.rod([0.08, 0, 0], [0.2, 0.01, 0], 0.014, wood);
    if (a.state === 'abandoned') { scoop.root.position.set(W / 2 + 0.1 + random() * 0.2, 0.05, D / 2 + 0.25); scoop.root.rotation.y = random() * 6; }
    else { scoop.root.position.set(stackX - 0.22, COUNTER + 0.1, 0.25); scoop.root.rotation.y = 0.6; }
    s.root.add(scoop.root);

    if (a.extras === 'bell') {
      s.mesh(new THREE.SphereGeometry(0.06, 14, 8, 0, 7, 0, Math.PI / 2), s.material('#d8a93a', { metalness: 0.8, roughness: 0.25 }), [stackX + 0.1, COUNTER + 0.06, 0.3]);
      s.cylinder(0.012, 0.012, 0.03, [stackX + 0.1, COUNTER + 0.13, 0.3], iron, 8);
      s.cylinder(0.04, 0.035, 0.13, [stackX - 0.1, COUNTER + 0.115, -0.3], glass, 12).castShadow = false;
      for (let i = 0; i < 6; i++) s.rod([stackX - 0.1, COUNTER + 0.06, -0.3], [stackX - 0.1 + (random() - 0.5) * 0.05, COUNTER + 0.24, -0.3 + (random() - 0.5) * 0.05], 0.005, s.material(i % 2 ? '#d3262c' : '#f5efe2'));
    } else if (a.extras === 'till') {
      s.box([0.2, 0.08, 0.14], [stackX + 0.05, COUNTER + 0.09, 0.3], s.material('#3f5a4a', { metalness: 0.4 }));
      const lid = s.box([0.2, 0.015, 0.14], [stackX + 0.05, COUNTER + 0.18, 0.24], s.material('#3f5a4a', { metalness: 0.4 }));
      lid.rotation.x = -1.0;
      const coin = s.material('#d8b84a', { metalness: 0.8, roughness: 0.3 });
      for (let i = 0; i < 7; i++) s.cylinder(0.018, 0.018, 0.004, [stackX - 0.12 + random() * 0.26, COUNTER + 0.055 + (i < 3 ? 0.085 : 0), 0.26 + random() * 0.1], coin, 10);
    } else if (a.extras === 'balloons') {
      const hues = ['#d3262c', '#f6d24a', '#3f8fd0', '#ee86ac', '#58b368'];
      const n = 3 + Math.floor(mood.density * 3);
      for (let i = 0; i < n; i++) {
        const dx = 0.15 + random() * 0.5, dz = (random() - 0.3) * 0.5, h = 1.1 + random() * 0.6;
        const from: P3 = [W / 2 - 0.02, COUNTER + 0.3, D / 2 - 0.02];
        s.rod(from, [from[0] + dx, from[1] + h, from[2] + dz], 0.005, s.material('#f1ede2'));
        s.ball([0.15, 0.18, 0.15], [from[0] + dx, from[1] + h + 0.16, from[2] + dz], s.material(hues[i % hues.length], { roughness: 0.25 }), 14);
      }
    }

    // A spilled box on the ground with its contents scattered.
    if (a.spilled) {
      const bx = 0.25 + random() * 0.4, bz = D / 2 + 0.38 + random() * 0.15, turn = random() * 6;
      const b = box([bx, 0.06, bz], 0);
      b.rotation.set(Math.PI / 2, 0, turn, 'ZXY');
      b.scale.setScalar(1.5);
      const dir = new THREE.Vector3(Math.cos(turn + Math.PI / 2), 0, Math.sin(turn + Math.PI / 2));
      const pts: { at: P3; size: number; color: string }[] = [];
      const n = a.wares === 'apples' ? 0 : 40 + Math.floor(mood.density * 50);
      const hues = { popcorn: ['#f6e7a8', '#fbf3cf', '#f1d77a'], floss: ['#f7a8c8', '#f9c2d8'], nuts: ['#7a4a22', '#96602c', '#5e3718'], apples: ['#b3141e'] }[a.wares];
      for (let i = 0; i < n; i++) {
        const reach = 0.15 + Math.pow(random(), 1.6) * 0.75, side = (random() - 0.5) * (0.15 + reach * 0.9);
        pts.push({ at: [bx + dir.x * reach - dir.z * side, 0.025, bz + Math.abs(dir.z * reach) * 0.6 + dir.x * side * 0.5 + 0.05], size: 0.03 * (0.7 + random() * 0.7), color: hues[Math.floor(random() * hues.length)] });
      }
      if (n) s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), pts);
      else {
        const ax = bx + 0.3, az = bz + 0.12;
        s.ball([0.09, 0.085, 0.09], [ax, 0.085, az], new THREE.MeshStandardMaterial({ color: '#b3141e', roughness: 0.12 }), 12);
        s.rod([ax, 0.1, az], [ax + 0.22, 0.03, az + 0.1], 0.01, s.material('#e8dab0'));
        s.cylinder(0.16, 0.18, 0.006, [ax - 0.02, 0.003, az], s.material('#8a3a1a', { roughness: 0.2 }), 14);
      }
    }

    const lively = mix(0.3, 2, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const puff of steamPuffs) {
          const beat = 0.8 + 0.3 * Math.sin(time * lively * 3 + puff.phase);
          puff.mesh.scale.setScalar(puff.size * beat);
          puff.mesh.position.y = puff.home.y + Math.sin(time * lively + puff.phase) * 0.04;
        }
        if (lit) lamp.emissiveIntensity = mix(0.8, 2.0, 1 - mood.daylight * 0.5) * (0.92 + 0.08 * Math.sin(time * 11));
      },
    });
  },
});
