import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, paint, paintHex } from '@conjure/kit';

type P = [number, number, number];

const BOARDS = {
  abuali: 'فول أبو علي',
  saada: 'فول السعادة',
  bismillah: 'بسم الله',
  hamd: 'الحمد لله',
} as const;

/** A hand-painted sign: border, flourishes, Arabic lettering. */
function boardMap(text: string, ground: string, ink: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 160;
  const g = canvas.getContext('2d')!;
  g.fillStyle = ground; g.fillRect(0, 0, 512, 160);
  g.strokeStyle = ink; g.lineWidth = 6; g.strokeRect(10, 10, 492, 140);
  g.fillStyle = ink;
  for (const x of [40, 472]) { g.beginPath(); g.arc(x, 80, 16, 0, Math.PI * 2); g.fill(); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 74px sans-serif';
  g.fillText(text, 256, 84, 400);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

/** Painted panel flowers and stripes for the cart sides. */
function panelMap(ground: string, accent: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 192;
  const g = canvas.getContext('2d')!;
  g.fillStyle = ground; g.fillRect(0, 0, 512, 192);
  g.fillStyle = accent; g.fillRect(0, 0, 512, 18); g.fillRect(0, 174, 512, 18);
  for (let i = 0; i < 4; i++) {
    const cx = 64 + i * 128, cy = 96;
    g.strokeStyle = accent; g.lineWidth = 5; g.strokeRect(cx - 52, cy - 58, 104, 116);
    for (let k = 0; k < 6; k++) { const t = (k / 6) * Math.PI * 2; g.beginPath(); g.ellipse(cx + Math.cos(t) * 18, cy + Math.sin(t) * 18, 12, 7, t, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#f4f2ec'; g.beginPath(); g.arc(cx, cy, 8, 0, Math.PI * 2); g.fill(); g.fillStyle = accent;
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function puffMap() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,0.85)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export default defineThing({
  questions: {
    moment: choice('What moment of the morning is it?', {
      queue: 'The dawn rush: a queue of workers and schoolboys waiting with bread in hand.',
      serving: 'Steady trade: one customer eating standing at the counter.',
      after: 'After the rush: empty, used bowls stacked, the bread nearly gone, a spill of beans.',
      setup: 'Setting up in the dark: lid on the pot, crates of bread still wrapped.',
    }),
    vendor: noul('Is the vendor there, ladling beans from the pot?'),
    steam: noul('Is steam curling from the mouth of the pot?'),
    radio: noul('Is a little radio playing on a stool beside it?'),
    lantern: noul('Is a Ramadan fanous lantern hung from the cart?'),
    cart: paint('What colour is the cart painted?', ['green', 'blue', 'turquoise', 'red', 'yellow', 'orange', 'teal', 'white', 'sky']),
    board: paint('What colour is the name board?', ['yellow', 'white', 'red', 'green', 'blue', 'cream', 'orange']),
    name: choice('What does the name board say?', {
      abuali: 'Ful Abu Ali: the owner\'s name in big Arabic letters.',
      saada: 'Ful el-Saada: beans of happiness.',
      bismillah: 'Bismillah: in the name of God, a blessing on the trade.',
      hamd: 'Alhamdulillah: thanks be to God.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const glow = Math.min(1, Math.max(0, lowSun * 1.25 - 0.25));

    const cartHex = paintHex(a.cart), boardHex = paintHex(a.board);
    const accent = ['yellow', 'orange', 'white', 'cream'].includes(a.cart) ? '#b0302a' : '#f2d23a';
    const body = s.material(cartHex, { roughness: 0.6 });
    const panel = new THREE.MeshStandardMaterial({ color: new THREE.Color('#ffffff').lerp(new THREE.Color('#bdb3a0'), wear * 0.4), map: panelMap(cartHex, accent), roughness: 0.65 });
    const wood = s.material(new THREE.Color('#8a6440').lerp(new THREE.Color('#5a4a3a'), wear * 0.5), { roughness: 0.85 });
    const steel = s.material('#b9bec2', { metalness: 0.7, roughness: 0.35 });
    const copper = s.material(new THREE.Color('#c8743e').lerp(new THREE.Color('#7a5a3e'), wear * 0.5), { metalness: 0.85, roughness: 0.3 + wear * 0.3 });
    const dark = s.material('#222224', { roughness: 0.7 });

    // The cart box on two bicycle wheels, a leg at the front, handles at the back.
    const CW = 1.8, CD = 0.9, CY0 = 0.42, CY1 = 1.0;
    s.box([CW, CY1 - CY0, CD], [0, (CY0 + CY1) / 2, 0], body);
    s.box([CW - 0.04, CY1 - CY0 - 0.12, 0.01], [0, (CY0 + CY1) / 2, CD / 2 + 0.005], panel);
    s.box([CW + 0.12, 0.05, CD + 0.12], [0, CY1 + 0.025, 0], s.material(accent, { roughness: 0.5 }));
    s.box([CW + 0.06, 0.02, CD + 0.06], [0, CY1 + 0.06, 0], steel);
    for (const z of [-1, 1]) {
      const wx = 0, wz = z * (CD / 2 + 0.08), r = 0.34;
      s.ring(r, 0.022, [wx, r, wz], dark);
      s.ring(r - 0.03, 0.01, [wx, r, wz], steel);
      const spokes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 4), steel, 16);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 16; i++) { const t = (i / 16) * Math.PI; m.makeRotationZ(t).scale(new THREE.Vector3(1, (r - 0.03) * 2, 1)).setPosition(wx, r, wz); spokes.setMatrixAt(i, m); }
      s.root.add(spokes);
      s.cylinder(0.035, 0.035, 0.06, [wx, r, wz], steel, 10).rotation.x = Math.PI / 2;
    }
    s.rod([0, 0.34, -CD / 2 - 0.08], [0, 0.34, CD / 2 + 0.08], 0.015, steel);
    s.rod([CW / 2 - 0.1, CY0, 0], [CW / 2 - 0.05, 0, 0], 0.03, wood);
    for (const z of [-0.3, 0.3]) s.rod([-CW / 2, CY1 - 0.15, z], [-CW / 2 - 0.55, CY1 - 0.05, z * 0.9], 0.025, wood);

    // The qidra: a big-bellied copper pot sunk into the counter, only its shoulder and neck showing.
    const potX = -0.4, top = CY1 + 0.07;
    s.lathe([[0, -0.4], [0.2, -0.38], [0.33, -0.15], [0.36, 0.05], [0.31, 0.2], [0.18, 0.32], [0.12, 0.38], [0.12, 0.46], [0.16, 0.5], [0.14, 0.52]], copper, [potX, top, 0]);
    s.ring(0.37, 0.025, [potX, top + 0.005, 0], steel).rotation.x = Math.PI / 2;
    if (a.moment === 'setup') s.lathe([[0, 0.08], [0.06, 0.07], [0.16, 0.02], [0.17, 0]], copper, [potX, top + 0.5, 0]);
    else s.cylinder(0.11, 0.11, 0.02, [potX, top + 0.45, 0], s.material('#6a4a2a', { roughness: 0.8 }), 16);
    // The long ladle: in the vendor's hand, or resting in the neck.
    const ladle = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 6), steel);
    handle.position.y = 0.3;
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), steel);
    for (const mesh of [handle, cup]) { mesh.castShadow = true; ladle.add(mesh); }
    ladle.position.set(potX + 0.02, top + 0.4, 0);
    ladle.rotation.z = -0.35;
    s.root.add(ladle);

    // Bowls of oil, cumin and tahini, lemons, pickles in a jar, a stack of baladi bread.
    const bowl = (x: number, z: number, fill: string) => {
      s.lathe([[0, 0], [0.06, 0], [0.08, 0.05], [0.085, 0.06]], steel, [x, top, z]);
      s.cylinder(0.075, 0.075, 0.01, [x, top + 0.05, z], s.material(fill, { roughness: 0.3 }), 12);
    };
    bowl(0.15, 0.25, '#c9b030');
    bowl(0.35, 0.28, '#7a4a28');
    bowl(0.15, 0.05, '#e0d0a8');
    s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#f0d838', { roughness: 0.6 }), Array.from({ length: 7 }, () => ({ at: [0.42 + (random() - 0.5) * 0.18, top + 0.04, 0.05 + (random() - 0.5) * 0.14] as P, size: 0.032 })));
    s.cylinder(0.08, 0.08, 0.22, [0.65, top + 0.11, 0.25], s.material('#e8f0ea', { transparent: true, opacity: 0.4, depthWrite: false, roughness: 0.1 }), 12);
    s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#e86a2a'), Array.from({ length: 10 }, (_u, i) => ({ at: [0.65 + (random() - 0.5) * 0.08, top + 0.04 + i * 0.016, 0.25 + (random() - 0.5) * 0.08] as P, size: 0.028, color: i % 3 ? '#e86a2a' : '#c83a6a' })));
    const loaves = a.moment === 'after' ? 2 : a.moment === 'setup' ? 0 : 9 + Math.floor(random() * 5);
    const bread = s.material('#d9a868', { roughness: 0.9 });
    for (let i = 0; i < loaves; i++) s.cylinder(0.12, 0.12, 0.025, [0.6 + (random() - 0.5) * 0.02, top + 0.015 + i * 0.026, -0.18 + (random() - 0.5) * 0.02], bread, 16);
    if (a.moment === 'setup') {
      s.box([0.5, 0.22, 0.4], [0.55, top + 0.11, -0.15], s.material('#c9a06a'));
      s.box([0.52, 0.03, 0.42], [0.55, top + 0.23, -0.15], s.material('#e8e2d2', { roughness: 1 }));
    }
    if (a.moment === 'after') {
      for (let i = 0; i < 5; i++) s.lathe([[0, 0], [0.06, 0], [0.08, 0.04]], steel, [0.2, top + i * 0.03, -0.25]);
      s.cylinder(0.12, 0.15, 0.005, [0.75, top, 0.25], s.material('#6a4a2a', { roughness: 0.4 }), 12);
      s.cylinder(0.2, 0.25, 0.005, [0.6, 0.004, 0.75], s.material('#6a4a2a', { roughness: 0.4 }), 12);
    }

    // The name board on two posts at the back.
    s.rod([-CW / 2 + 0.05, CY1, -CD / 2 + 0.05], [-CW / 2 + 0.05, 1.95, -CD / 2 + 0.05], 0.022, wood);
    s.rod([CW / 2 - 0.05, CY1, -CD / 2 + 0.05], [CW / 2 - 0.05, 1.95, -CD / 2 + 0.05], 0.022, wood);
    const ink = ['white', 'cream', 'yellow'].includes(a.board) ? '#b0302a' : '#f6f2e6';
    s.mesh(new THREE.BoxGeometry(CW, 0.5, 0.03), new THREE.MeshStandardMaterial({ color: '#ffffff', map: boardMap(BOARDS[a.name], boardHex, ink), roughness: 0.7 }), [0, 1.8, -CD / 2 + 0.05]);

    // Lantern, radio, steam.
    if (a.lantern) {
      s.rod([CW / 2 - 0.05, 1.95, -CD / 2 + 0.05], [CW / 2 + 0.25, 1.95, -CD / 2 + 0.05], 0.015, wood);
      const glass = new THREE.MeshStandardMaterial({ color: '#f0c050', emissive: '#ffb030', emissiveIntensity: mix(0.6, 2.0, glow), roughness: 0.4 });
      s.rod([CW / 2 + 0.25, 1.95, -CD / 2 + 0.05], [CW / 2 + 0.25, 1.82, -CD / 2 + 0.05], 0.005, dark);
      s.cylinder(0.02, 0.09, 0.08, [CW / 2 + 0.25, 1.78, -CD / 2 + 0.05], copper, 6);
      s.cylinder(0.09, 0.06, 0.2, [CW / 2 + 0.25, 1.64, -CD / 2 + 0.05], glass, 6);
      s.cylinder(0.06, 0.02, 0.06, [CW / 2 + 0.25, 1.51, -CD / 2 + 0.05], copper, 6);
    }
    if (a.radio) {
      const sx = CW / 2 + 0.45, sz = 0.2;
      for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) s.rod([sx + dx, 0, sz + dz], [sx + dx * 0.8, 0.42, sz + dz * 0.8], 0.012, wood);
      s.cylinder(0.17, 0.17, 0.03, [sx, 0.43, sz], wood, 14);
      s.box([0.24, 0.14, 0.08], [sx, 0.52, sz], s.material('#3a3c40'));
      s.cylinder(0.035, 0.035, 0.01, [sx - 0.05, 0.52, sz + 0.04], s.material('#c9c2b2'), 12).rotation.x = Math.PI / 2;
      s.rod([sx + 0.08, 0.59, sz], [sx + 0.2, 0.85, sz - 0.05], 0.004, steel);
    }
    const puffs: { mesh: THREE.Mesh; y0: number; phase: number }[] = [];
    if (a.steam && a.moment !== 'setup') {
      const puff = puffMap();
      const steamMat = new THREE.MeshBasicMaterial({ map: puff, color: '#f4f4f0', transparent: true, opacity: 0.58, depthWrite: false, side: THREE.DoubleSide });
      for (let i = 0; i < 7; i++) {
        const size = 0.25 + i * 0.09;
        const mesh = s.mesh(new THREE.PlaneGeometry(size, size), steamMat, [potX + (random() - 0.5) * 0.08 * i, top + 0.55 + i * 0.12, (random() - 0.5) * 0.05]);
        mesh.castShadow = false;
        puffs.push({ mesh, y0: mesh.position.y, phase: random() * 6 });
      }
    }

    // People: the vendor behind the pot, and customers in front.
    const skins = ['#c9956a', '#a8724b', '#7c5236', '#e2b894'];
    if (a.vendor) {
      const v = figure(s, { height: 1.72, build: 'heavy', style: 'doll', pose: 'standing', hair: 'cap', top: '#e8e2d2', bottom: '#4a4038', skin: skins[1], gaze: 'down' });
      s.root.add(v.root);
      v.root.position.set(-CW / 2 - 0.3, 0, 0.05);
      v.root.rotation.y = Math.PI / 2;
      v.root.updateMatrixWorld(true);
      const hand = new THREE.Vector3(potX - 0.2, top + 0.7, 0.05);
      v.reach('right', hand, { space: s.root });
      v.lookAt(new THREE.Vector3(potX, top, 0), s.root);
      ladle.position.copy(hand).add(new THREE.Vector3(0.05, -0.55, 0.03));
      ladle.rotation.z = -0.2;
    }
    const customer = (x: number, z: number, pose: 'standing' | 'carrying' | 'arms-crossed', top: string, hair: 'short' | 'cap' | 'hood' | 'none') => {
      const c = figure(s, { height: 1.55 + random() * 0.25, style: 'doll', pose, hair, top, bottom: ['#3a3a3e', '#4a5a6a', '#6a5a48'][Math.floor(random() * 3)], skin: skins[Math.floor(random() * 4)], mirror: random() < 0.5 });
      s.root.add(c.root);
      c.root.position.set(x, 0, z);
      c.root.rotation.y = Math.PI + (random() - 0.5) * 0.6;
      return c;
    };
    if (a.moment === 'queue') {
      customer(0.3, CD / 2 + 0.45, 'carrying', '#e8e2d2', 'cap');
      customer(-0.35, CD / 2 + 0.95, 'standing', '#4a6a8a', 'short');
      customer(0.2, CD / 2 + 1.45, 'arms-crossed', '#7a3a2a', 'none');
      customer(-0.3, CD / 2 + 1.9, 'standing', '#e6e0c8', 'hood');
    }
    if (a.moment === 'serving') customer(-0.2, CD / 2 + 0.45, 'carrying', '#5a6a4a', 'short');

    const energy = mood.energy;
    return s.finish({
      update: (_dt, time) => {
        for (const { mesh, y0, phase } of puffs) {
          mesh.position.y = y0 + ((time * (0.08 + energy * 0.1) + phase * 0.05) % 0.3);
          mesh.rotation.z = Math.sin(time * 0.5 + phase) * 0.4;
        }
      },
    });
  },
});
