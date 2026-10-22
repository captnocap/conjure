import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A barrel-vault cross-section run along x: the domed lid and everything that wraps over it. */
function arch(a: number, b: number, thickness: number, length: number) {
  const shape = new THREE.Shape();
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const t = Math.PI * i / n;
    if (i === 0) shape.moveTo(a * Math.cos(t), b * Math.sin(t)); else shape.lineTo(a * Math.cos(t), b * Math.sin(t));
  }
  const ia = Math.max(a - thickness, 0.001), ib = Math.max(b - thickness, 0.001);
  for (let i = n; i >= 0; i--) { const t = Math.PI * i / n; shape.lineTo(ia * Math.cos(t), ib * Math.sin(t)); }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-length / 2, 0, 0);
  return geometry;
}

const COVERS = {
  'tan-leather': 'Honey-brown saddle leather over wood, the classic emigrant trunk.',
  'black-oilcloth': 'Black oilcloth with pale wooden slats, sober and official.',
  'green-canvas': 'Olive-green painted canvas, military or expedition issue.',
  oxblood: 'Deep oxblood leather with bright brass, a wealthy traveller\'s luggage.',
  'blue-tin': 'Embossed tin painted a dusty sea blue, cheap and cheerful.',
  'bare-pine': 'Plain unpainted pine boards, home-made for a single crossing.',
} as const;
const COVER_COLOUR: Record<keyof typeof COVERS, [string, string]> = {
  'tan-leather': ['#9a6337', '#5a3a22'],
  'black-oilcloth': ['#2b2a2a', '#b08a57'],
  'green-canvas': ['#5c6444', '#3f3324'],
  oxblood: ['#6b1f22', '#3a1c16'],
  'blue-tin': ['#557f95', '#7a5a38'],
  'bare-pine': ['#c39a62', '#8a6337'],
};
const CONTENTS = {
  letters: 'Bundles of letters tied with ribbon, and loose envelopes.',
  uniform: 'A folded military uniform with brass buttons, a peaked cap and a medal.',
  linens: 'Stacks of pressed white linen and lace, a trousseau never used.',
  clothes: 'A bright heap of old dresses and scarves, crumpled and colourful.',
  toys: 'A child\'s things: wooden blocks, a ball, a small bear.',
  nothing: 'Nothing at all but the lining, a key and a few mothballs.',
} as const;
const LININGS = {
  floral: 'Cream paper sprigged with small pink flowers.',
  ticking: 'Blue and white striped ticking cloth.',
  newsprint: 'Pasted-in yellowed newspaper.',
  crimson: 'Plain crimson felt.',
  bare: 'Bare unlined wood.',
} as const;
const PORTS = ['NEW YORK', 'HAMBURG', 'LISBOA', 'BOMBAY', 'LIVERPOOL', 'GENOVA', 'CUNARD', 'P & O', 'ODESSA', 'HAVANA', 'CABIN', 'HOLD', 'WANTED', 'SYDNEY', 'CAIRO', 'BREMEN'];

export default defineThing({
  questions: {
    state: choice('How has the trunk been left?', {
      closed: 'Shut and strapped, exactly as it was packed.',
      ajar: 'Lid lifted a hand\'s width, as if someone just peeked.',
      open: 'Lid thrown fully back, the contents on show.',
      forced: 'Broken into: lock hanging off, lid wrenched crooked, things pulled out onto the floor.',
    }),
    contents: choice('If it is open, what is inside?', CONTENTS),
    cover: choice('What is the trunk covered in?', COVERS),
    lid: choice('What shape is the lid?', {
      dome: 'A high barrel dome, the proud steamer silhouette.',
      camel: 'A low camelback curve.',
      flat: 'Nearly flat, made to be stacked in a hold.',
    }),
    lining: choice('What is it lined with inside?', LININGS),
    labels: score('How many shipping labels and stickers are pasted on it?', ['None, it never travelled', 'One or two', 'A handful from different ports', 'Plastered with a lifetime of voyages']),
    initials: noul('Are an owner\'s initials stencilled on the front?'),
    straps: noul('Is it bound with leather straps and buckles?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.96, D = 0.54, H = 0.4, T = 0.022, BASE = 0.025;
    const domeH = { dome: 0.21, camel: 0.13, flat: 0.055 }[a.lid];
    const [coverHex, slatHex] = COVER_COLOUR[a.cover];
    const cover = s.material(coverHex, { roughness: a.cover === 'blue-tin' ? 0.45 : 0.75, metalness: a.cover === 'blue-tin' ? 0.4 : 0 });
    const slat = s.material(slatHex, { roughness: 0.7 });
    const brassTint = new THREE.Color('#c9a046').lerp(new THREE.Color('#5d6b4c'), mood.wear * 0.55);
    const brass = new THREE.MeshStandardMaterial({ color: brassTint, metalness: 0.85, roughness: mix(0.25, 0.7, mood.wear) });
    const leather = s.material('#4a2d1a', { roughness: 0.8 });
    const iron = s.material('#2a2724', { metalness: 0.6, roughness: 0.5 });

    const liningTexture = paint(256, 256, (ctx) => {
      const base = { floral: '#efe3c8', ticking: '#e9e6da', newsprint: '#d9cba0', crimson: '#8f1f2b', bare: '#b08a5a' }[a.lining];
      ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
      if (a.lining === 'floral') for (let i = 0; i < 16; i++) {
        const x = (i % 4) * 64 + 32 + (Math.floor(i / 4) % 2) * 32, y = Math.floor(i / 4) * 64 + 32;
        ctx.fillStyle = '#4f7a4a'; ctx.fillRect(x - 1, y, 3, 16);
        ctx.fillStyle = '#d0607c'; for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p * 1.257) * 7, y + Math.sin(p * 1.257) * 7, 5, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#f3d36a'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill();
      }
      if (a.lining === 'ticking') { ctx.fillStyle = '#3f5f96'; for (let x = 0; x < 256; x += 32) { ctx.fillRect(x, 0, 9, 256); ctx.fillRect(x + 14, 0, 2, 256); } }
      if (a.lining === 'newsprint') { ctx.fillStyle = '#4a4233'; for (let col = 0; col < 4; col++) { ctx.fillRect(col * 64 + 6, 8, 52, 9); for (let y = 24; y < 250; y += 6) ctx.fillRect(col * 64 + 6, y, 30 + ((y * 7 + col * 13) % 22), 2); } }
      if (a.lining === 'bare') { ctx.strokeStyle = '#8a6840'; for (let y = 6; y < 256; y += 11) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(80, y + 6, 170, y - 6, 256, y + 2); ctx.stroke(); } }
    });
    liningTexture.wrapS = liningTexture.wrapT = THREE.RepeatWrapping;
    const lining = new THREE.MeshStandardMaterial({ map: liningTexture, roughness: 0.9, side: THREE.DoubleSide });
    const liningArch = lining.clone(); liningArch.map = liningTexture.clone(); liningArch.map.repeat.set(3, 3);

    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P3) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const box = (parent: THREE.Object3D, size: P3, at: P3, material: THREE.Material) => put(parent, new THREE.BoxGeometry(...size), material, at);

    // ---- body: a hollow box with runners, slats, corners and side handles
    const body = s.root;
    for (const x of [-0.3, 0.3]) box(body, [0.06, BASE, D * 0.94], [x, BASE / 2, 0], slat);
    box(body, [W, T, D], [0, BASE + T / 2, 0], cover);
    for (const z of [-1, 1]) box(body, [W, H, T], [0, BASE + H / 2, z * (D - T) / 2], cover);
    for (const x of [-1, 1]) box(body, [T, H, D - T * 2], [x * (W - T) / 2, BASE + H / 2, 0], cover);
    const inner = { x: W / 2 - T - 0.002, z: D / 2 - T - 0.002, y: BASE + T + 0.002 };
    box(body, [inner.x * 2, 0.002, inner.z * 2], [0, inner.y, 0], lining);
    for (const z of [-1, 1]) box(body, [inner.x * 2, H - T - 0.01, 0.002], [0, BASE + T + (H - T) / 2, z * inner.z], lining);
    for (const x of [-1, 1]) box(body, [0.002, H - T - 0.01, inner.z * 2], [x * inner.x, BASE + T + (H - T) / 2, 0], lining);
    // slats run along the front, back and ends; a rim caps the top edge
    for (const y of [BASE + 0.03, BASE + H - 0.03]) {
      for (const z of [-1, 1]) box(body, [W + 0.012, 0.045, 0.012], [0, y, z * (D / 2 + 0.004)], slat);
      for (const x of [-1, 1]) box(body, [0.012, 0.045, D + 0.012], [x * (W / 2 + 0.004), y, 0], slat);
    }
    for (const x of [-0.24, 0.24]) for (const z of [-1, 1]) box(body, [0.045, H - 0.1, 0.01], [x, BASE + H / 2, z * (D / 2 + 0.004)], slat);
    for (const x of [-1, 1]) for (const z of [-1, 1]) for (const y of [BASE + 0.035, BASE + H - 0.035]) {
      box(body, [0.075, 0.075, 0.075], [x * (W / 2 - 0.028), y, z * (D / 2 - 0.028)], brass);
      put(body, new THREE.SphereGeometry(0.012, 8, 6), brass, [x * (W / 2 - 0.02), y, z * (D / 2 + 0.012)]);
    }
    for (const x of [-1, 1]) {
      // drop handles on the ends
      for (const z of [-0.09, 0.09]) box(body, [0.014, 0.05, 0.03], [x * (W / 2 + 0.012), BASE + H * 0.62, z], iron);
      const handle = put(body, new THREE.TorusGeometry(0.085, 0.011, 6, 18, Math.PI), leather, [x * (W / 2 + 0.03), BASE + H * 0.62, 0]);
      handle.rotation.set(Math.PI, Math.PI / 2, 0); handle.scale.y = 0.55;
    }

    // ---- lid: hinged along the back top edge
    const lid = new THREE.Group();
    lid.position.set(0, BASE + H, -D / 2);
    body.add(lid);
    const skirt = 0.05, zc = D / 2;
    for (const z of [-1, 1]) box(lid, [W, skirt, T], [0, skirt / 2, zc + z * (D - T) / 2], cover);
    for (const x of [-1, 1]) box(lid, [T, skirt, D - T * 2], [x * (W - T) / 2, skirt / 2, zc], cover);
    put(lid, arch(D / 2, domeH, 0.018, W), cover, [0, skirt, zc]);
    put(lid, arch(D / 2 - 0.019, domeH - 0.019, 0.003, W - 0.03), liningArch, [0, skirt, zc]);
    for (const x of [-1, 1]) {
      put(lid, arch(D / 2 - 0.001, domeH - 0.001, D, 0.02), cover, [x * (W / 2 - 0.01), skirt, zc]);
      put(lid, arch(D / 2 + 0.006, domeH + 0.006, 0.03, 0.05), brass, [x * (W / 2 - 0.02), skirt, zc]);
    }
    for (const z of [-1, 1]) box(lid, [W + 0.012, 0.04, 0.012], [0, skirt / 2, zc + z * (D / 2 + 0.004)], slat);
    // slats laid over the dome
    const slatCount = a.lid === 'flat' ? 3 : 5;
    for (let i = 0; i < slatCount; i++) {
      const t = Math.PI * (0.18 + 0.64 * i / (slatCount - 1));
      const m = box(lid, [W + 0.004, 0.012, 0.04], [0, skirt + (domeH + 0.004) * Math.sin(t), zc + (D / 2 + 0.004) * Math.cos(t)], slat);
      m.rotation.x = -Math.atan2((domeH) * Math.cos(t), (D / 2) * Math.sin(t));
    }
    const strapXs = [-0.24, 0.24];
    const brokenStrap = a.state === 'forced' ? 1 : mood.wear > 0.7 ? 0 : -1;
    if (a.straps) strapXs.forEach((x, index) => {
      put(lid, arch(D / 2 + 0.014, domeH + 0.014, 0.006, 0.05), leather, [x, skirt, zc]);
      box(lid, [0.05, skirt, 0.006], [x, skirt / 2, zc + D / 2 + 0.013], leather);
      if (index === brokenStrap) {
        const flap = box(body, [0.05, 0.2, 0.006], [x + 0.03, BASE + H - 0.14, D / 2 + 0.03], leather); flap.rotation.z = 0.5; flap.rotation.x = 0.25;
      } else if (a.state === 'closed' || a.state === 'ajar') {
        box(body, [0.05, H * 0.55, 0.006], [x, BASE + H * 0.72, D / 2 + 0.013], leather);
        box(body, [0.066, 0.05, 0.01], [x, BASE + H * 0.62, D / 2 + 0.018], brass);
      } else {
        const tail = box(body, [0.05, 0.24, 0.006], [x, BASE + H - 0.13, D / 2 + 0.022], leather); tail.rotation.x = 0.1;
        box(body, [0.066, 0.05, 0.01], [x, BASE + H * 0.5, D / 2 + 0.04], brass);
      }
    });
    // lock: a plate on the body and a hasp on the lid
    box(body, [0.1, 0.11, 0.008], [0, BASE + H - 0.075, D / 2 + 0.006], brass);
    put(body, new THREE.CylinderGeometry(0.012, 0.012, 0.012, 10), iron, [0, BASE + H - 0.085, D / 2 + 0.011]).rotation.x = Math.PI / 2;
    const hasp = box(lid, [0.055, 0.1, 0.008], [0, -0.01, zc + D / 2 + 0.012], brass);
    for (const x of [-0.36, 0.36]) { box(body, [0.05, 0.05, 0.008], [x, BASE + H - 0.04, D / 2 + 0.006], brass); box(lid, [0.04, 0.06, 0.01], [x, 0.012, zc + D / 2 + 0.012], brass); }
    for (const x of [-0.3, 0.3]) box(lid, [0.07, 0.035, 0.012], [x, 0.005, -0.008], brass);

    const openAngle = { closed: 0, ajar: 0.3 + random() * 0.15, open: 1.75 + random() * 0.2, forced: 1.0 + random() * 0.35 }[a.state];
    lid.rotation.x = -openAngle;
    if (a.state === 'forced') {
      lid.rotation.z = (random() < 0.5 ? -1 : 1) * 0.09; lid.rotation.y = 0.06;
      hasp.position.set(0.05, -0.06, zc + D / 2 + 0.03); hasp.rotation.z = 0.9;
      // the crowbar that did it, and splinters
      const bar = s.rod([0.2, 0.012, D / 2 + 0.3], [0.62, 0.012, D / 2 + 0.16], 0.011, iron);
      bar.castShadow = true;
      s.rod([0.62, 0.012, D / 2 + 0.16], [0.66, 0.05, D / 2 + 0.15], 0.011, iron, 0.004);
      for (let i = 0; i < 6; i++) { const chip = s.box([0.05 + random() * 0.05, 0.006, 0.012], [-0.1 + random() * 0.25, 0.004, D / 2 + 0.05 + random() * 0.12], slat); chip.rotation.y = random() * 3; }
    }

    // ---- labels
    const labelCount = Math.round(mix(0, 11, a.labels ** 1.3) * mix(0.8, 1.2, random()));
    const fade = mood.wear * 0.5;
    for (let i = 0; i < labelCount; i++) {
      const shape = Math.floor(random() * 3), hue = Math.floor(random() * 360), text = PORTS[Math.floor(random() * PORTS.length)];
      const texture = paint(128, 96, (ctx) => {
        ctx.clearRect(0, 0, 128, 96);
        const paper = `hsl(${hue} ${mix(55, 18, fade)}% ${mix(62, 72, fade)}%)`, ink = `hsl(${(hue + 180) % 360} 45% ${mix(18, 38, fade)}%)`;
        ctx.fillStyle = paper; ctx.strokeStyle = ink; ctx.lineWidth = 5;
        ctx.beginPath();
        if (shape === 0) ctx.rect(4, 8, 120, 80); else if (shape === 1) ctx.ellipse(64, 48, 60, 44, 0, 0, 7); else { ctx.moveTo(64, 3); ctx.lineTo(125, 48); ctx.lineTo(64, 93); ctx.lineTo(3, 48); ctx.closePath(); }
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f4ead2'; ctx.fillRect(shape === 2 ? 30 : 14, 34, shape === 2 ? 68 : 100, 28);
        ctx.fillStyle = ink; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, 64, 49, shape === 2 ? 62 : 94);
        if (shape !== 2) { ctx.fillRect(20, 18, 88, 5); ctx.fillRect(20, 72, 88, 5); }
      });
      const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.5, roughness: 0.9, side: THREE.DoubleSide });
      const size = 0.11 + random() * 0.06;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.75), material);
      const where = random();
      if (where < 0.55) { mesh.position.set((random() - 0.5) * (W - 0.2), BASE + 0.1 + random() * (H - 0.26), D / 2 + 0.012 + i * 0.0006); }
      else if (where < 0.8) { const side = random() < 0.5 ? -1 : 1; mesh.position.set(side * (W / 2 + 0.012 + i * 0.0006), BASE + 0.1 + random() * 0.12, (random() - 0.5) * (D - 0.2)); mesh.rotation.y = side * Math.PI / 2; }
      else {
        const t = Math.PI * (0.3 + random() * 0.4);
        mesh.position.set((random() - 0.5) * (W - 0.25), skirt + (domeH + 0.012 + i * 0.0006) * Math.sin(t), zc + (D / 2 + 0.012) * Math.cos(t));
        mesh.rotation.x = -Math.PI / 2 + Math.atan2(Math.cos(t) * D / 2, Math.sin(t) * domeH) * (domeH / (D / 2));
        lid.add(mesh); mesh.rotation.z = (random() - 0.5) * 0.6; continue;
      }
      mesh.rotation.z = (random() - 0.5) * 0.5;
      body.add(mesh);
    }
    if (a.initials) {
      const letters = 'ABCDEFGHJKLMNOPRSTVW';
      const text = `${letters[Math.floor(random() * letters.length)]}. ${letters[Math.floor(random() * letters.length)]}. ${letters[Math.floor(random() * letters.length)]}.`;
      const texture = paint(256, 64, (ctx) => { ctx.clearRect(0, 0, 256, 64); ctx.fillStyle = a.cover === 'bare-pine' || a.cover === 'blue-tin' ? '#1d1a17' : '#e7d7a8'; ctx.font = 'bold 46px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 128, 34); });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.075), new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.4, roughness: 0.9 }));
      mesh.position.set(0, BASE + 0.1, D / 2 + 0.0125); body.add(mesh);
    }

    // ---- contents
    const showsInside = a.state === 'open' || a.state === 'forced';
    if (showsInside || a.state === 'ajar') {
      const floorY = inner.y + 0.002, fillTop = BASE + H - 0.07;
      const rx = inner.x - 0.02, rz = inner.z - 0.02;
      const spillN = a.state === 'forced' ? 5 + Math.floor(random() * 4) : 0;
      const spillAt = (): P3 => [(random() - 0.5) * 1.1, 0, D / 2 + 0.1 + random() * 0.32];
      const cloth = (colour: THREE.ColorRepresentation) => s.material(colour, { roughness: 0.95 });
      const many = mix(0.5, 1, mood.density);
      if (a.contents === 'letters') {
        const papers = ['#efe6cf', '#e6d7b2', '#d9c9a0', '#f1ead9', '#cfd9dd'];
        const ribbons = ['#b3283a', '#2e5a9a', '#3d7a52', '#c8a034'];
        for (let ix = -1; ix <= 1; ix++) for (const iz of [-1, 1]) {
          const layers = Math.round((1 + random() * 3) * many);
          let y = floorY;
          for (let l = 0; l < layers; l++) {
            const h = 0.045 + random() * 0.035;
            const at: P3 = [ix * rx * 0.64 + (random() - 0.5) * 0.02, y + h / 2, iz * rz * 0.5 + (random() - 0.5) * 0.02];
            const bundle = box(body, [0.24, h, 0.15], at, cloth(papers[Math.floor(random() * papers.length)]));
            bundle.rotation.y = (random() - 0.5) * 0.3;
            const ribbon = cloth(ribbons[Math.floor(random() * ribbons.length)]);
            const r1 = box(body, [0.245, h + 0.004, 0.018], at, ribbon), r2 = box(body, [0.018, h + 0.004, 0.155], at, ribbon);
            r1.rotation.y = r2.rotation.y = bundle.rotation.y;
            y += h;
            if (y > fillTop) break;
          }
        }
        const loose = (at: P3, flat: boolean) => {
          const env = box(body, [0.17, 0.004, 0.11], at, cloth(papers[Math.floor(random() * papers.length)]));
          env.rotation.set(flat ? 0 : (random() - 0.5) * 0.5, random() * 6.3, flat ? 0 : (random() - 0.5) * 0.5);
          const stamp = box(env, [0.025, 0.002, 0.03], [0.06, 0.003, -0.03], cloth(random() < 0.5 ? '#b3283a' : '#2e5a9a')); stamp.castShadow = false;
        };
        for (let i = 0; i < Math.round(7 * many); i++) loose([(random() - 0.5) * rx * 1.6, fillTop - 0.05 + random() * 0.06, (random() - 0.5) * rz * 1.5], false);
        for (let i = 0; i < (spillN ? spillN + 3 : 0); i++) { const p = spillAt(); loose([p[0], 0.004 + i * 0.001, p[2]], true); }
      } else if (a.contents === 'uniform') {
        const navy = mood.warmth < 0.45;
        const wool = cloth(navy ? '#27324d' : '#6f6a3f'), dark = cloth(navy ? '#151b2c' : '#4a4628');
        box(body, [rx * 1.9, fillTop - floorY - 0.1, rz * 1.9], [0, (floorY + fillTop - 0.1) / 2, 0], cloth('#8a8a6c'));
        const jy = fillTop - 0.05;
        const jacket = new THREE.Group(); jacket.position.set(-0.13, jy, 0); jacket.rotation.y = (random() - 0.5) * 0.12; body.add(jacket);
        box(jacket, [0.5, 0.09, 0.38], [0, 0, 0], wool);
        for (const side of [-1, 1]) { const lapel = box(jacket, [0.05, 0.012, 0.2], [side * 0.05, 0.048, -0.08], dark); lapel.rotation.y = side * 0.35; box(jacket, [0.12, 0.014, 0.05], [side * 0.18, 0.05, -0.15], dark); for (let i = 0; i < 3; i++) put(jacket, new THREE.SphereGeometry(0.012, 8, 6), brass, [side * 0.035, 0.05, 0.03 + i * 0.055]); }
        box(jacket, [0.5, 0.012, 0.045], [0, 0.048, 0.14], cloth('#3a2718'));
        box(jacket, [0.05, 0.016, 0.055], [0, 0.05, 0.14], brass);
        // medal
        box(jacket, [0.03, 0.006, 0.045], [-0.15, 0.05, -0.03], cloth('#b3283a'));
        put(jacket, new THREE.CylinderGeometry(0.02, 0.02, 0.006, 12), brass, [-0.15, 0.05, 0.005]);
        const cap = new THREE.Group(); cap.position.set(0.3, jy + 0.045, a.state === 'forced' ? 0.05 : -0.04); cap.rotation.y = -0.5 + random() * 0.4; body.add(cap);
        put(cap, new THREE.CylinderGeometry(0.115, 0.095, 0.035, 20), wool, [0, 0.06, 0]);
        put(cap, new THREE.CylinderGeometry(0.095, 0.095, 0.045, 20), dark, [0, 0.022, 0]);
        const visor = put(cap, new THREE.CylinderGeometry(0.11, 0.11, 0.006, 16, 1, false, -0.9, 1.8), s.material('#111111', { roughness: 0.3 }), [0, 0.006, 0.045]); visor.rotation.x = 0.25;
        put(cap, new THREE.SphereGeometry(0.018, 8, 6), brass, [0, 0.035, 0.095]);
        for (let i = 0; i < spillN; i++) { const p = spillAt(); const rag = s.ball([0.1 + random() * 0.08, 0.025, 0.08 + random() * 0.06], [p[0], 0.02, p[2]], i % 2 ? wool : cloth('#d8d2bd'), 10); rag.rotation.y = random() * 3; }
      } else if (a.contents === 'linens') {
        const whites = ['#f2efe6', '#e9e3d2', '#f6f3ee', '#dfe6ea', '#efe2d6'];
        for (const ix of [-1, 1]) for (const iz of [-1, 1]) {
          const layers = Math.round((3 + random() * 6) * many);
          let y = floorY;
          for (let l = 0; l < layers && y < fillTop; l++) {
            const h = 0.022 + random() * 0.014;
            const sheet = box(body, [rx * 0.9, h, rz * 0.9], [ix * rx * 0.5 + (random() - 0.5) * 0.012, y + h / 2, iz * rz * 0.5 + (random() - 0.5) * 0.012], cloth(whites[Math.floor(random() * whites.length)]));
            sheet.rotation.y = (random() - 0.5) * 0.06;
            y += h + 0.002;
          }
          if (random() < 0.7) for (let k = 0; k < 9; k++) put(body, new THREE.SphereGeometry(0.014, 8, 6), cloth('#fbfaf5'), [ix * rx * 0.5 - rx * 0.4 + k * rx * 0.1, y - 0.006, iz * rz * 0.5 + rz * 0.45]).scale.y = 0.4;
          if (random() < 0.6) { box(body, [rx * 0.92, 0.004, 0.03], [ix * rx * 0.5, y, iz * rz * 0.5], cloth(mood.cheer > 0.5 ? '#7fa6d4' : '#8a7f9c')); }
        }
        for (let i = 0; i < spillN; i++) { const p = spillAt(); const rag = s.ball([0.13 + random() * 0.1, 0.03 + random() * 0.03, 0.1 + random() * 0.08], [p[0], 0.025, p[2]], cloth(whites[i % whites.length]), 10); rag.rotation.y = random() * 3; }
      } else if (a.contents === 'clothes') {
        const dyes = ['#b8324a', '#2f6f8f', '#d9a531', '#6b4a8a', '#3f8a5a', '#d97a55', '#e3d9c4', '#22303f'];
        box(body, [rx * 1.9, (fillTop - floorY) * 0.6, rz * 1.9], [0, floorY + (fillTop - floorY) * 0.3, 0], cloth(dyes[Math.floor(random() * dyes.length)]));
        for (let i = 0; i < Math.round(16 * many); i++) {
          const lump = s.ball([0.1 + random() * 0.12, 0.04 + random() * 0.05, 0.08 + random() * 0.09], [(random() - 0.5) * rx * 1.6, fillTop - 0.07 + random() * 0.08, (random() - 0.5) * rz * 1.5], cloth(dyes[Math.floor(random() * dyes.length)]), 10);
          lump.rotation.set(random() - 0.5, random() * 3, random() - 0.5);
        }
        // a sleeve trailing over the front edge
        const sleeve = cloth(dyes[Math.floor(random() * dyes.length)]); const sx = (random() - 0.5) * 0.5;
        s.tube([[sx, fillTop, 0.1], [sx + 0.02, BASE + H + 0.03, D / 2 - 0.01], [sx + 0.04, BASE + H - 0.1, D / 2 + 0.035], [sx + 0.03, BASE + H - 0.26, D / 2 + 0.04]], 0.035, sleeve).scale.z = 1;
        for (let i = 0; i < spillN; i++) { const p = spillAt(); const rag = s.ball([0.12 + random() * 0.1, 0.03 + random() * 0.03, 0.1 + random() * 0.08], [p[0], 0.025, p[2]], cloth(dyes[Math.floor(random() * dyes.length)]), 10); rag.rotation.y = random() * 3; }
      } else if (a.contents === 'toys') {
        const paints = ['#c8382f', '#2f66b0', '#e0b02e', '#3f8f52', '#e8e2d0'];
        box(body, [rx * 1.9, (fillTop - floorY) * 0.45, rz * 1.9], [0, floorY + (fillTop - floorY) * 0.225, 0], cloth('#b9a98a'));
        const top = floorY + (fillTop - floorY) * 0.45;
        const block = (at: P3) => { const b = box(body, [0.07, 0.07, 0.07], at, s.material(paints[Math.floor(random() * paints.length)])); b.rotation.set(random() * 0.5, random() * 3, random() * 0.5); };
        for (let i = 0; i < Math.round(14 * many); i++) block([(random() - 0.5) * rx * 1.5, top + 0.04 + random() * 0.08, (random() - 0.5) * rz * 1.4]);
        s.ball([0.075, 0.075, 0.075], [-rx * 0.55, top + 0.08, rz * 0.3], s.material('#c8382f'), 16);
        s.ring(0.075, 0.012, [-rx * 0.55, top + 0.08, rz * 0.3], s.material('#e8e2d0'));
        // a small bear sitting up against the back
        const fur = cloth('#9a6a3c'); const bx = rx * 0.45, bz = -rz * 0.35;
        s.ball([0.075, 0.09, 0.065], [bx, top + 0.09, bz], fur, 14);
        s.ball([0.06, 0.058, 0.055], [bx, top + 0.21, bz + 0.01], fur, 14);
        for (const side of [-1, 1]) { s.ball([0.022, 0.022, 0.012], [bx + side * 0.045, top + 0.26, bz], fur, 8); s.ball([0.03, 0.05, 0.03], [bx + side * 0.085, top + 0.1, bz + 0.03], fur, 8); s.ball([0.008, 0.008, 0.008], [bx + side * 0.022, top + 0.222, bz + 0.058], s.material('#111111'), 6); }
        s.ball([0.026, 0.02, 0.02], [bx, top + 0.198, bz + 0.058], cloth('#d9c19a'), 8);
        for (let i = 0; i < spillN; i++) { const p = spillAt(); block([p[0], 0.036, p[2]]); }
      } else {
        // nothing: a key, mothballs, a cobweb when it has been a long time
        s.ring(0.014, 0.004, [0.1, floorY + 0.004, 0.05], iron).rotation.x = Math.PI / 2;
        s.rod([0.114, floorY + 0.004, 0.05], [0.18, floorY + 0.004, 0.06], 0.004, iron);
        for (let i = 0; i < 4; i++) s.ball([0.013, 0.013, 0.013], [(random() - 0.5) * rx * 1.5, floorY + 0.013, (random() - 0.5) * rz * 1.4], s.material('#f1efe9'), 8);
        if (mood.wear > 0.45) { const web = new THREE.MeshStandardMaterial({ color: '#e9e9e4', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }); for (let i = 0; i < 5; i++) { const strand = s.rod([-inner.x, BASE + H - 0.02 - i * 0.05, -inner.z + 0.02], [-inner.x + 0.06 + i * 0.05, BASE + H - 0.02, -inner.z], 0.002, web); strand.castShadow = false; } }
      }
    }
    return s.finish();
  },
});
