import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const SCREENS = {
  insert: 'INSERT TICKET, with a patient blinking arrow.',
  due: 'AMOUNT DUE and a price that is more than you expected.',
  lost: 'LOST TICKET? PRESS HELP: the full-day penalty.',
  coins: 'COINS ONLY, the card reader has failed.',
  thanks: 'PAID. THANK YOU. You have 15 minutes to exit.',
  closed: 'CLOSED on a red field.',
  crash: 'A blue crash screen of white system text.',
  dark: 'Nothing: the screen is black.',
} as const;
const SCREEN: Record<keyof typeof SCREENS, { bg: string; ink: string; lines: string[] }> = {
  insert: { bg: '#0c3a2c', ink: '#b9ffcf', lines: ['INSERT', 'TICKET', '>>>'] },
  due: { bg: '#0f2f4a', ink: '#ffe08a', lines: ['AMOUNT DUE', '$38.00', 'CASH / CARD'] },
  lost: { bg: '#4a3a0c', ink: '#ffe9a8', lines: ['LOST TICKET?', 'PRESS HELP', 'FEE $60'] },
  coins: { bg: '#3b2a10', ink: '#ffc34a', lines: ['COINS ONLY', 'NO CARDS', 'NO CHANGE'] },
  thanks: { bg: '#0c3a2c', ink: '#b9ffcf', lines: ['PAID', 'THANK YOU', 'EXIT: 15 MIN'] },
  closed: { bg: '#7a1410', ink: '#ffe3dc', lines: ['', 'CLOSED', ''] },
  crash: { bg: '#1836b8', ink: '#e8ecff', lines: ['FATAL 0x0000007B', 'KIOSK.EXE HALTED', 'PRESS ANY KEY _'] },
  dark: { bg: '#07090a', ink: '#07090a', lines: ['', '', ''] },
};

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A paper strip of the given width following a path in the y/z plane. */
function ribbon(path: readonly (readonly [number, number])[], width: number) {
  const geometry = new THREE.PlaneGeometry(width, 1, 1, path.length - 1);
  const p = geometry.attributes.position;
  for (let i = 0; i < path.length; i++) for (const side of [0, 1]) {
    const index = i * 2 + side;
    p.setXYZ(index, (side - 0.5) * width, path[i][0], path[i][1]);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    screen: choice('What is on the screen?', SCREENS),
    body: choice('What colour is the kiosk?', {
      blue: 'Deep parking blue with a white P.',
      yellow: 'Bright yellow, impossible to miss.',
      steel: 'Bare brushed steel, a vault with a screen.',
      red: 'Tomato red, a private operator.',
      green: 'Municipal green, slightly old-fashioned.',
    }),
    header: choice('What does the sign on top say?', {
      pay: 'PAY HERE',
      station: 'PAY STATION',
      before: 'PAY BEFORE EXIT',
      p: 'Just a big white P in a square.',
      none: 'No header sign at all, a flat top.',
    }),
    receipt: choice('What is coming out of the receipt slot?', {
      none: 'Nothing.',
      curl: 'A single receipt curling out, never taken.',
      streamer: 'A long jammed streamer of paper spilling down to the floor.',
    }),
    dropped: choice('What has been left on the ground in front of it?', {
      nothing: 'Nothing.',
      coins: 'A scatter of dropped coins, some rolled away.',
      ticket: 'One lost ticket lying face down.',
      litter: 'A drift of crumpled receipts and a coffee cup.',
      bag: 'A forgotten shopping bag leaning against the base.',
    }),
    canopy: noul('Does it stand under its own small lit canopy?'),
    bollards: noul('Is it guarded by two yellow bollards?'),
    note: noul('Is a handwritten notice taped across the front?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = { blue: '#234f9c', yellow: '#e8b61f', steel: '#a9b0b3', red: '#c8402c', green: '#2f6b4c' }[a.body];
    const body = s.material(tint, { metalness: a.body === 'steel' ? 0.65 : 0.15, roughness: 0.48 });
    const dark = s.material('#22272a');
    const steel = s.material('#c3c9cb', { metalness: 0.75, roughness: 0.3 });
    const paper = s.material('#f4f1e6', { side: THREE.DoubleSide, roughness: 0.9 });
    const W = 0.86, D = 0.56, H = 1.72;
    const on = a.screen !== 'dark';

    // Plinth and carcass with a recessed, sloping fascia.
    s.box([W + 0.1, 0.1, D + 0.1], [0, 0.05, 0], s.material('#9d9c94', { roughness: 0.95 }));
    s.box([W, 0.62, D], [0, 0.41, 0], body);
    s.box([W, H - 0.72, D - 0.14], [0, 0.72 + (H - 0.72) / 2, -0.07], body);
    for (const x of [-1, 1]) s.box([0.07, H - 0.72, 0.14], [x * (W / 2 - 0.035), 0.72 + (H - 0.72) / 2, D / 2 - 0.07], body);
    s.box([W, 0.08, D], [0, H - 0.04, 0], body);
    s.box([W + 0.04, 0.04, D + 0.04], [0, H + 0.02, 0], dark);
    const fascia = new THREE.Group();
    fascia.position.set(0, 0.74, D / 2 - 0.01);
    fascia.rotation.x = -0.12;
    s.root.add(fascia);
    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true;
      fascia.add(mesh);
      return mesh;
    };
    put(new THREE.BoxGeometry(W - 0.14, 0.92, 0.03), dark, 0, 0.46, -0.03);

    // Screen.
    const spec = SCREEN[a.screen];
    const screenMap = paint(320, 240, (ctx) => {
      ctx.fillStyle = spec.bg; ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = spec.ink; ctx.textAlign = a.screen === 'crash' ? 'left' : 'center'; ctx.textBaseline = 'middle';
      spec.lines.forEach((line, i) => {
        ctx.font = `bold ${a.screen === 'crash' ? 24 : i === 1 ? 56 : 36}px monospace`;
        ctx.fillText(line, a.screen === 'crash' ? 14 : 160, 50 + i * 72, 296);
      });
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = 0; y < 240; y += 4) ctx.fillRect(0, y, 320, 1);
    });
    const screenMat = new THREE.MeshStandardMaterial({ map: screenMap, emissiveMap: screenMap, emissive: '#ffffff', emissiveIntensity: on ? mix(0.95, 1.5, mood.cheer) : 0, roughness: 0.25 });
    put(new THREE.BoxGeometry(0.46, 0.36, 0.02), steel, -0.1, 0.68, -0.008);
    put(new THREE.PlaneGeometry(0.42, 0.32), screenMat, -0.1, 0.68, 0.004);

    // Right column: coin slot, note slot, card reader with keypad.
    const amber = new THREE.MeshStandardMaterial({ color: '#ffb23a', emissive: '#ff9a1a', emissiveIntensity: on ? 1.5 : 0.05 });
    const green = new THREE.MeshStandardMaterial({ color: '#58e283', emissive: '#2fd765', emissiveIntensity: on && a.screen !== 'coins' ? 1.4 : 0.03 });
    put(new THREE.BoxGeometry(0.15, 0.13, 0.03), steel, 0.25, 0.8, 0);
    put(new THREE.BoxGeometry(0.012, 0.075, 0.035), dark, 0.25, 0.8, 0.002);
    put(new THREE.BoxGeometry(0.13, 0.012, 0.012), amber, 0.25, 0.88, 0.008);
    put(new THREE.BoxGeometry(0.15, 0.05, 0.03), steel, 0.25, 0.67, 0);
    put(new THREE.BoxGeometry(0.11, 0.01, 0.035), dark, 0.25, 0.67, 0.002);
    const reader = put(new THREE.BoxGeometry(0.15, 0.24, 0.07), s.material('#3a4146'), 0.25, 0.44, 0.02);
    reader.rotation.x = -0.25;
    put(new THREE.BoxGeometry(0.1, 0.008, 0.02), green, 0.25, 0.555, 0.062);
    const keys = s.material('#d9dcd8');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) put(new THREE.BoxGeometry(0.03, 0.03, 0.012), r === 3 && c === 2 ? green : r === 3 && c === 0 ? s.material('#d9422e') : keys, 0.21 + c * 0.04, 0.5 - r * 0.04 , 0.058 + r * 0.01);

    // Left column under the screen: ticket slot, help button, speaker.
    put(new THREE.BoxGeometry(0.2, 0.06, 0.03), steel, -0.2, 0.42, 0);
    put(new THREE.BoxGeometry(0.14, 0.012, 0.035), dark, -0.2, 0.42, 0.002);
    put(new THREE.BoxGeometry(0.18, 0.012, 0.012), green, -0.2, 0.465, 0.008);
    const help = put(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), new THREE.MeshStandardMaterial({ color: '#e23b2e', emissive: '#e23b2e', emissiveIntensity: a.screen === 'lost' ? 1.6 : 0.25 }), 0.03, 0.42, 0.01);
    help.rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++) put(new THREE.BoxGeometry(0.16, 0.007, 0.01), steel, -0.2, 0.3 + i * 0.018, 0);

    // Receipt mouth and coin cup, below.
    put(new THREE.BoxGeometry(0.2, 0.04, 0.04), steel, -0.2, 0.16, 0.005);
    put(new THREE.BoxGeometry(0.15, 0.01, 0.05), dark, -0.2, 0.16, 0.006);
    put(new THREE.BoxGeometry(0.2, 0.13, 0.05), dark, 0.2, 0.1, 0);
    const cup = put(new THREE.CylinderGeometry(0.075, 0.075, 0.1, 16, 1, false, 0, Math.PI), steel, 0.2, 0.07, 0.01);
    cup.rotation.y = Math.PI / 2; cup.rotation.x = 0; cup.rotation.z = 0; cup.rotation.set(0, -Math.PI / 2, 0);

    if (a.receipt !== 'none') {
      // Paper leaves the mouth, sags and curls back on itself.
      const path: [number, number][] = [];
      const y0 = 0.74 + 0.16, z0 = D / 2 + 0.005;
      const long = a.receipt === 'streamer';
      const fall = long ? y0 - 0.02 : mix(0.18, 0.3, random());
      const steps = long ? 30 : 16;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const wave = long ? Math.sin(t * 9) * 0.03 * t : 0;
        path.push([y0 - fall * t * t * (long ? 1 : 0.9) - (long ? fall * 0.0 : 0), z0 + 0.1 * Math.sin(Math.min(1, t * 2.2) * Math.PI / 2) + wave]);
      }
      if (long) {
        // Folds piling on the floor.
        for (let i = 1; i <= 8; i++) path.push([0.012 + i * 0.004, z0 + 0.1 + (i % 2 ? 0.2 : 0.02) + random() * 0.05]);
      } else {
        const [ey, ez] = path[path.length - 1];
        const r = 0.035;
        for (let i = 1; i <= 10; i++) { const th = i / 10 * Math.PI * 1.7; path.push([ey - r + Math.cos(th) * r, ez - Math.sin(th) * r * 0.9 - 0.0]); }
      }
      const strip = s.mesh(ribbon(path, 0.075), paper, [-0.2, 0, 0]);
      strip.rotation.y = (random() - 0.5) * 0.12;
    }

    // Header sign and canopy.
    let top = H + 0.04;
    if (a.header !== 'none') {
      const text = { pay: 'PAY HERE', station: 'PAY STATION', before: 'PAY BEFORE EXIT', p: 'P' }[a.header];
      const square = a.header === 'p';
      const w = square ? 0.4 : W, h = square ? 0.4 : 0.24;
      s.box([w + 0.04, h + 0.04, 0.12], [0, top + h / 2 + 0.02, -0.05], dark);
      const sign = s.label(text, w, h, [0, top + h / 2 + 0.02, 0.012], '#ffffff', a.body === 'blue' || square ? '#1f4fa8' : '#1c2226');
      const m = sign.material as THREE.MeshStandardMaterial;
      m.emissiveMap = m.map; m.emissive = new THREE.Color('#ffffff'); m.emissiveIntensity = mix(0.35, 0.9, mood.cheer);
      top += h + 0.04;
    }
    if (a.canopy) {
      const roofY = Math.max(top + 0.12, 2.25);
      for (const x of [-1, 1]) s.cylinder(0.03, 0.03, roofY, [x * (W / 2 + 0.16), roofY / 2, -D / 2 + 0.05], steel, 10);
      const roof = s.box([W + 0.5, 0.06, D + 0.3], [0, roofY + 0.03, 0.08], body);
      roof.rotation.x = 0.07;
      s.box([W + 0.2, 0.03, 0.12], [0, roofY - 0.025, 0.2], new THREE.MeshStandardMaterial({ color: '#fff3c9', emissive: '#ffe9a6', emissiveIntensity: mix(0.9, 1.8, mood.cheer) }));
    }
    if (a.bollards) {
      const yellow = s.material('#e8b61f');
      for (const x of [-1, 1]) {
        const bx = x * (W / 2 + 0.38), bz = D / 2 + 0.42;
        s.cylinder(0.065, 0.065, 0.95, [bx, 0.475, bz], yellow, 16);
        s.ball([0.065, 0.045, 0.065], [bx, 0.95, bz], yellow, 14);
        s.cylinder(0.068, 0.068, 0.09, [bx, 0.78, bz], dark, 16);
      }
    }
    if (a.note) {
      const scrawl = ['CARD ONLY', 'NO CHANGE', 'BROKEN', 'USE LEVEL 2', 'ATE MY $20'][Math.floor(random() * 5)];
      const note = s.label(scrawl, 0.34, 0.2, [-0.1 + (random() - 0.5) * 0.1, 1.44, D / 2 + 0.035], '#1f2a4a', '#f6f1dc');
      note.rotation.set(-0.12, 0, (random() - 0.5) * 0.25);
      const tape = s.material('#c9c2a0');
      for (const x of [-1, 1]) s.box([0.07, 0.03, 0.002], [note.position.x + x * 0.15, 1.535, D / 2 + 0.03], tape).rotation.set(-0.12, 0, x * 0.6);
    }

    // What was left behind.
    const front = D / 2 + 0.05;
    if (a.dropped === 'coins') {
      const brass = s.material('#c9a23f', { metalness: 0.8, roughness: 0.35 }), silver = s.material('#c9ced0', { metalness: 0.8, roughness: 0.3 });
      const n = 5 + Math.floor(random() * 6 + mood.density * 6);
      for (let i = 0; i < n; i++) s.cylinder(0.016, 0.016, 0.004, [(random() - 0.5) * 0.9, 0.003, front + 0.08 + random() * random() * 0.8], i % 3 ? silver : brass, 12);
    } else if (a.dropped === 'ticket') {
      const t = s.label('P  0417', 0.16, 0.085, [mix(-0.3, 0.3, random()), 0.004, front + mix(0.15, 0.4, random())], '#333', '#f1e9c8');
      t.rotation.set(-Math.PI / 2, 0, random() * 3);
    } else if (a.dropped === 'litter') {
      const n = 6 + Math.floor(mood.density * 10);
      for (let i = 0; i < n; i++) {
        const r = 0.025 + random() * 0.03;
        s.mesh(new THREE.IcosahedronGeometry(r, 0), paper, [(random() - 0.5) * 1.0, r * 0.8, front + 0.05 + random() * 0.55]).rotation.set(random() * 3, random() * 3, 0);
      }
      const cupX = mix(-0.5, 0.5, random());
      const c = s.cylinder(0.04, 0.03, 0.11, [cupX, 0.04, front + 0.3], s.material('#e9e2cf'), 14);
      c.rotation.set(Math.PI / 2, 0, random() * 3);
      s.cylinder(0.042, 0.042, 0.03, [cupX, 0.04, front + 0.3], s.material('#7a4a2a'), 14).rotation.copy(c.rotation);
    } else if (a.dropped === 'bag') {
      const bagTint = ['#f2f2ee', '#e9c84a', '#d86a5a', '#6fa3c9'][Math.floor(random() * 4)];
      const bx = mix(-0.25, 0.3, random());
      const bagMat = s.material(bagTint, { roughness: 0.6 });
      const sack = new THREE.CylinderGeometry(0.17, 0.13, 0.34, 4, 1);
      const bag = s.mesh(sack, bagMat, [bx, 0.17, front + 0.12]);
      bag.rotation.y = Math.PI / 4; bag.scale.set(1, 1, 0.55);
      bag.rotation.z = (random() - 0.5) * 0.2;
      for (const z of [-0.035, 0.035]) s.ring(0.06, 0.006, [bx, 0.34, front + 0.12 + z], dark, Math.PI);
      s.box([0.03, 0.2, 0.03], [bx + 0.04, 0.4, front + 0.12], s.material('#5d8a3c')).rotation.z = -0.3;
    }

    // Wear: rust runs from the plinth, stickers and scratched patches.
    if (mood.wear > 0.4) {
      const rust = s.material('#6e4a33', { roughness: 1 });
      const n = Math.round((mood.wear - 0.4) * 14);
      for (let i = 0; i < n; i++) s.box([0.02 + random() * 0.05, 0.04 + random() * 0.16, 0.004], [(random() - 0.5) * (W - 0.1), 0.13 + random() * 0.16, D / 2 + 0.001], rust);
      const stickers = ['#e8e24a', '#e2574a', '#58b6e2', '#f2f2f2'];
      for (let i = 0; i < n / 2; i++) s.box([0.07 + random() * 0.05, 0.05 + random() * 0.04, 0.003], [W / 2 + 0.001, 0.6 + random() * 0.9, (random() - 0.5) * 0.35], s.material(stickers[i % 4])).rotation.set(random() * 0.5, Math.PI / 2, 0);
    }

    const glow = screenMat.emissiveIntensity;
    const blink = a.screen === 'insert' || a.screen === 'crash' || a.screen === 'coins';
    return s.finish({
      update: on ? (_dt, time) => {
        const rate = mix(1.2, 8, mood.energy);
        amber.emissiveIntensity = Math.sin(time * rate) > 0 ? 1.6 : 0.3;
        if (blink) screenMat.emissiveIntensity = glow * (Math.sin(time * rate * 0.5) > -0.6 ? 1 : mix(0.75, 0.2, mood.wear));
      } : undefined,
    });
  },
});
