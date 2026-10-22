import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const PALETTES = {
  'red-yellow': ['#c8302a', '#f2c230', '#2b2b30'],
  'blue-silver': ['#2f5fa8', '#cfd4d8', '#d8402c'],
  'green-cream': ['#4f8a5b', '#efe3c2', '#b5422e'],
  'black-orange': ['#2a2c31', '#ee7a26', '#d9d2c0'],
  'pink-turquoise': ['#e77c9c', '#38b5b0', '#fbf0d5'],
  'bare-tin': ['#b9bcbb', '#8f9698', '#c8302a'],
} as const;

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    face: choice('What face does the robot have?', {
      stern: 'Stern: level dial eyes and a straight barred grille mouth.',
      smiling: 'Friendly: wide dial eyes and an upturned grille smile.',
      surprised: 'Surprised: big round eyes and a round open O of a mouth.',
      visor: 'No eyes, just a single glowing red visor slit that sparks, over a small grille.',
    }),
    colours: choice('What are its lithographed colours?', {
      'red-yellow': 'Fire-engine red with yellow panels, the classic.',
      'blue-silver': 'Space blue with silver panels and red details.',
      'green-cream': 'Army green and cream, sober and military.',
      'black-orange': 'Black with orange, a menacing invader.',
      'pink-turquoise': 'Candy pink and turquoise, sweet and odd.',
      'bare-tin': 'Mostly bare silvery tin with a few red printed details.',
    }),
    origin: choice('Where and when was it made?', {
      japan: '1950s Japan: boxy riveted body, ear dials, busy printed gauges.',
      soviet: 'Soviet: a plain drum-shaped body, a star on the chest, austere printing.',
      repro: 'A modern reproduction: glossy, taller, claw hands, a bit too perfect.',
    }),
    state: choice('What state is it in?', {
      boxed: 'Mint, standing beside its printed cardboard box, never played with.',
      played: 'Played with for years: scratched, an arm hanging loose, antenna bent.',
      rusted: 'Key lost, rusted through in patches, seized still.',
    }),
    pose: choice('What is it doing right now?', {
      stride: 'Caught mid-stride, one foot forward, arms swinging.',
      fallen: 'Fallen flat on its face, legs still trying to walk.',
      guard: 'Standing square and still, on guard.',
    }),
    chest: choice('What is printed on its chest?', {
      gauges: 'Two round pressure gauges and a row of switches.',
      gears: 'A window showing printed cogs and gears.',
      bolt: 'A big lightning bolt.',
      number: 'A large unit number.',
    }),
    topper: choice('What sits on top of its head?', {
      coil: 'A springy coil antenna with a ball on the end.',
      bulbs: 'Two little coloured light bulbs.',
      dish: 'A tiny radar dish.',
      none: 'Nothing, a flat riveted lid.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [c1, c2, c3] = PALETTES[a.colours];
    const rusted = a.state === 'rusted';
    const wear = rusted ? 1 : a.state === 'boxed' ? 0 : mix(0.35, 0.8, mood.wear);
    const tone = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#6e4630'), rusted ? 0.45 : wear * 0.12);
    const gloss = a.origin === 'repro' ? 0.22 : 0.4;
    const tin = (hex: string) => new THREE.MeshStandardMaterial({ color: tone(hex), metalness: 0.55, roughness: gloss + wear * 0.4 });
    const mA = tin(c1), mB = tin(c2), mC = tin(c3), dark = tin('#1d1e22'), bare = tin('#c6c8c6');
    const rust = new THREE.MeshStandardMaterial({ color: '#7a3d1e', roughness: 0.95 });
    const tall = a.origin === 'repro' ? 1.12 : 1;

    const bot = new THREE.Group();
    s.root.add(bot);
    const part = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const rivets = (parent: THREE.Object3D, w: number, h: number, y: number, z: number) => {
      const g = new THREE.SphereGeometry(0.0022, 6, 4);
      for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) part(parent, g, bare, sx * (w / 2 - 0.005), y - h / 2 + 0.008 + i * (h - 0.016) / 4, z);
    };

    // Legs: hip pivots so they can swing.
    const hipY = 0.072 * tall;
    const legs = [-1, 1].map((side) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.024, hipY, 0);
      part(leg, new THREE.BoxGeometry(0.028, hipY - 0.01, 0.034), mB, 0, -(hipY - 0.01) / 2, 0);
      for (let i = 0; i < 3; i++) part(leg, new THREE.BoxGeometry(0.03, 0.003, 0.036), dark, 0, -0.015 - i * 0.014 * tall, 0);
      part(leg, new THREE.BoxGeometry(0.038, 0.016, 0.062), mA, 0, -hipY + 0.008, 0.008);
      part(leg, new THREE.BoxGeometry(0.04, 0.004, 0.064), dark, 0, -hipY + 0.002, 0.008);
      bot.add(leg);
      return leg;
    });

    // Body with a printed chest plate.
    const bw = 0.094, bh = 0.1 * tall, bd = 0.06, by = hipY + bh / 2;
    if (a.origin === 'soviet') {
      part(bot, new THREE.CylinderGeometry(0.048, 0.048, bh, 28), mA, 0, by, 0);
      for (const y of [-1, 1]) part(bot, new THREE.TorusGeometry(0.048, 0.003, 6, 28), bare, 0, by + y * (bh / 2 - 0.004), 0).rotation.x = Math.PI / 2;
    } else {
      part(bot, new THREE.BoxGeometry(bw, bh, bd), mA, 0, by, 0);
      rivets(bot, bw, bh, by, bd / 2 + 0.0005);
      if (a.origin === 'repro') for (const side of [-1, 1]) part(bot, new THREE.BoxGeometry(0.03, 0.018, 0.066), mB, side * 0.045, by + bh / 2 - 0.004, 0);
    }
    const unit = 1 + Math.floor(random() * 98);
    const chest = paint(256, 256, (c) => {
      c.fillStyle = '#' + tone(c2).getHexString(); c.fillRect(0, 0, 256, 256);
      c.strokeStyle = '#' + tone(c3).getHexString(); c.lineWidth = 10; c.strokeRect(10, 10, 236, 236);
      c.fillStyle = '#18181c';
      if (a.chest === 'gauges') {
        for (const x of [78, 178]) {
          c.fillStyle = '#f4efe0'; c.beginPath(); c.arc(x, 92, 42, 0, 7); c.fill();
          c.strokeStyle = '#18181c'; c.lineWidth = 6; c.stroke();
          for (let i = 0; i < 9; i++) { const t = Math.PI * (1 + i / 8); c.beginPath(); c.moveTo(x + Math.cos(t) * 30, 92 + Math.sin(t) * 30); c.lineTo(x + Math.cos(t) * 38, 92 + Math.sin(t) * 38); c.lineWidth = 3; c.stroke(); }
          const n = Math.PI * (1.1 + random() * 0.8); c.strokeStyle = '#c8302a'; c.lineWidth = 6; c.beginPath(); c.moveTo(x, 92); c.lineTo(x + Math.cos(n) * 32, 92 + Math.sin(n) * 32); c.stroke();
        }
        for (let i = 0; i < 5; i++) { c.fillStyle = ['#c8302a', '#f2c230', '#2f5fa8', '#4f8a5b', '#f4efe0'][i]; c.fillRect(38 + i * 38, 168, 26, 46); c.strokeStyle = '#18181c'; c.lineWidth = 4; c.strokeRect(38 + i * 38, 168, 26, 46); }
      } else if (a.chest === 'gears') {
        c.fillStyle = '#18181c'; c.fillRect(36, 36, 184, 184);
        for (const [x, y, r, col] of [[100, 104, 46, '#f2c230'], [166, 160, 34, '#cfd4d8'], [84, 182, 22, '#d8402c']] as const) {
          c.fillStyle = col; c.beginPath();
          for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2, rr = r * (i % 2 ? 1 : 0.78); c.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); }
          c.fill(); c.fillStyle = '#18181c'; c.beginPath(); c.arc(x, y, r * 0.25, 0, 7); c.fill();
        }
      } else if (a.chest === 'bolt') {
        c.fillStyle = '#' + tone(c3).getHexString(); c.beginPath();
        c.moveTo(150, 26); c.lineTo(70, 140); c.lineTo(122, 140); c.lineTo(98, 232); c.lineTo(190, 106); c.lineTo(136, 106); c.closePath(); c.fill();
        c.strokeStyle = '#18181c'; c.lineWidth = 6; c.stroke();
      } else {
        c.font = 'bold 150px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(unit), 128, 138, 200);
      }
      if (a.origin === 'soviet') {
        c.fillStyle = '#c8302a'; c.beginPath();
        for (let i = 0; i < 10; i++) { const t = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 9 : 22; c.lineTo(128 + Math.cos(t) * r, 40 + Math.sin(t) * r); }
        c.fill();
      }
      // Scratches and rust blooms.
      for (let i = 0; i < wear * 40; i++) { c.strokeStyle = rusted ? '#6b3418' : '#b9bcbb'; c.lineWidth = 1 + random() * 3; c.beginPath(); const x = random() * 256, y = random() * 256; c.moveTo(x, y); c.lineTo(x + (random() - 0.5) * 70, y + (random() - 0.5) * 70); c.stroke(); }
      if (rusted) for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(110,55,24,0.8)'; c.beginPath(); c.arc(random() * 256, random() * 256, 8 + random() * 26, 0, 7); c.fill(); }
    });
    const plate = new THREE.MeshStandardMaterial({ map: chest, metalness: 0.4, roughness: gloss + wear * 0.4 });
    const chestZ = a.origin === 'soviet' ? 0.0485 : bd / 2 + 0.001;
    part(bot, new THREE.PlaneGeometry(0.066, 0.07 * tall), plate, 0, by - 0.002, chestZ);

    // Arms.
    const armY = by + bh / 2 - 0.016;
    const arms = [-1, 1].map((side) => {
      const arm = new THREE.Group();
      arm.position.set(side * (bw / 2 + 0.012), armY, 0);
      const cyl = part(arm, new THREE.CylinderGeometry(0.012, 0.012, 0.014, 14), bare); cyl.rotation.z = Math.PI / 2;
      part(arm, new THREE.BoxGeometry(0.018, 0.07 * tall, 0.02), mB, 0, -0.03 * tall, 0);
      if (a.origin === 'repro') {
        for (const dz of [-1, 1]) part(arm, new THREE.BoxGeometry(0.014, 0.024, 0.005), mC, 0, -0.074 * tall, dz * 0.009);
      } else part(arm, new THREE.SphereGeometry(0.013, 12, 8), mC, 0, -0.07 * tall, 0);
      bot.add(arm);
      return arm;
    });

    // Head.
    const head = new THREE.Group();
    const hw = 0.072, hh = 0.06, hd = 0.056;
    head.position.set(0, hipY + bh + 0.008 + hh / 2, 0);
    bot.add(head);
    part(bot, new THREE.CylinderGeometry(0.014, 0.018, 0.01, 12), bare, 0, hipY + bh + 0.004, 0);
    part(head, new THREE.BoxGeometry(hw, hh, hd), mB);
    part(head, new THREE.BoxGeometry(hw + 0.004, 0.006, hd + 0.004), mA, 0, hh / 2, 0);
    rivets(head, hw, hh, 0, hd / 2 + 0.0005);
    const fz = hd / 2;
    const glow = new THREE.MeshStandardMaterial({ color: '#ff3a24', emissive: '#ff2a10', emissiveIntensity: rusted ? 0.05 : mix(0.8, 2.4, mood.energy) });
    const dialGeo = (r: number) => { const g = new THREE.CylinderGeometry(r, r, 0.008, 20); g.rotateX(Math.PI / 2); return g; };
    const needles: THREE.Object3D[] = [];
    if (a.face === 'visor') {
      part(head, new THREE.BoxGeometry(hw * 0.86, 0.016, 0.006), dark, 0, 0.01, fz);
      part(head, new THREE.BoxGeometry(hw * 0.78, 0.008, 0.008), glow, 0, 0.01, fz + 0.001);
      if (!rusted) for (let i = 0; i < 5; i++) part(head, new THREE.OctahedronGeometry(0.0025 + random() * 0.002), glow, (random() - 0.5) * hw, 0.01 + (random() - 0.5) * 0.03, fz + 0.008 + random() * 0.012);
    } else {
      const r = a.face === 'surprised' ? 0.015 : a.face === 'smiling' ? 0.013 : 0.011;
      for (const side of [-1, 1]) {
        part(head, dialGeo(r + 0.003), a.face === 'stern' ? dark : mA, side * 0.018, 0.009, fz);
        part(head, dialGeo(r), new THREE.MeshStandardMaterial({ color: rusted ? '#b9a98a' : '#f6f1e2', roughness: 0.4 }), side * 0.018, 0.009, fz + 0.002);
        const needle = new THREE.Group();
        needle.position.set(side * 0.018, 0.009, fz + 0.0065);
        part(needle, new THREE.BoxGeometry(0.003, r * 0.9, 0.001), dark, 0, r * 0.4, 0);
        part(needle, dialGeo(a.face === 'surprised' ? 0.006 : 0.004), dark).scale.z = 0.3;
        needle.rotation.z = a.face === 'stern' ? side * 0.9 : a.face === 'smiling' ? -side * 0.5 : random() * 6;
        head.add(needle); needles.push(needle);
        if (a.face === 'stern') part(head, new THREE.BoxGeometry(0.03, 0.005, 0.006), dark, side * 0.018, 0.024, fz + 0.003).rotation.z = -side * 0.3;
      }
    }
    // Mouth.
    if (a.face === 'surprised') {
      part(head, dialGeo(0.011), dark, 0, -0.016, fz - 0.002);
      part(head, new THREE.TorusGeometry(0.011, 0.002, 6, 20), mC, 0, -0.016, fz + 0.002);
    } else {
      const smile = a.face === 'smiling';
      part(head, new THREE.BoxGeometry(0.042, smile ? 0.012 : 0.01, 0.003), dark, 0, -0.017, fz);
      for (let i = 0; i < 7; i++) {
        const x = (i - 3) * 0.006;
        part(head, new THREE.BoxGeometry(0.0022, 0.012, 0.004), bare, x, -0.017 + (smile ? (x * x) * 9 : 0), fz + 0.001);
      }
      if (smile) for (const side of [-1, 1]) part(head, new THREE.BoxGeometry(0.008, 0.004, 0.004), dark, side * 0.023, -0.011, fz + 0.001).rotation.z = side * 0.6;
    }
    if (a.origin !== 'soviet') for (const side of [-1, 1]) { const ear = part(head, new THREE.CylinderGeometry(0.011, 0.011, 0.008, 14), mC, side * (hw / 2 + 0.004), 0, 0); ear.rotation.z = Math.PI / 2; }

    // Topper.
    const bent = a.state === 'played' ? 0.5 + random() * 0.4 : rusted ? 0.9 : 0;
    const top = new THREE.Group();
    top.position.set(0, hh / 2 + 0.003, 0);
    top.rotation.z = bent * (random() < 0.5 ? -1 : 1);
    head.add(top);
    let bobble: THREE.Object3D | null = null;
    if (a.topper === 'coil') {
      const pts = Array.from({ length: 60 }, (_u, i) => new THREE.Vector3(Math.cos(i * 0.9) * 0.005, i * 0.0006, Math.sin(i * 0.9) * 0.005));
      part(top, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.0009, 5), bare);
      bobble = part(top, new THREE.SphereGeometry(0.007, 12, 8), mC, 0, 0.041, 0);
    } else if (a.topper === 'bulbs') {
      for (const side of [-1, 1]) {
        part(top, new THREE.CylinderGeometry(0.004, 0.005, 0.006, 10), bare, side * 0.02, 0.003, 0);
        part(top, new THREE.SphereGeometry(0.008, 12, 8), new THREE.MeshStandardMaterial({ color: side < 0 ? '#ff5038' : '#49d06a', emissive: side < 0 ? '#ff2a10' : '#1fae45', emissiveIntensity: rusted ? 0 : mix(0.4, 1.8, mood.energy), roughness: 0.25 }), side * 0.02, 0.012, 0);
      }
    } else if (a.topper === 'dish') {
      part(top, new THREE.CylinderGeometry(0.002, 0.002, 0.018, 6), bare, 0, 0.009, 0);
      const dish = part(top, new THREE.LatheGeometry([[0.001, 0], [0.01, 0.003], [0.018, 0.009]].map(([x, y]) => new THREE.Vector2(x, y)), 20), new THREE.MeshStandardMaterial({ color: tone(c3), metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide }), 0, 0.02, 0);
      dish.rotation.x = 0.7; bobble = dish;
    } else for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(top, new THREE.SphereGeometry(0.003, 6, 4), bare, x * 0.026, 0.002, z * 0.02);

    // Wind-up key in the back (lost when rusted, leaving the square shaft).
    const key = new THREE.Group();
    key.position.set(0.012, by - 0.01, -(a.origin === 'soviet' ? 0.048 : bd / 2));
    bot.add(key);
    const shaft = part(key, new THREE.CylinderGeometry(0.003, 0.003, 0.03, 8), bare, 0, 0, -0.015); shaft.rotation.x = Math.PI / 2;
    if (!rusted) {
      const brass = new THREE.MeshStandardMaterial({ color: '#c9a544', metalness: 0.8, roughness: 0.3 + wear * 0.3 });
      for (const side of [-1, 1]) { const wing = part(key, new THREE.TorusGeometry(0.012, 0.003, 6, 18), brass, side * 0.014, 0, -0.03); wing.scale.y = 1.25; }
      part(key, new THREE.BoxGeometry(0.008, 0.008, 0.006), brass, 0, 0, -0.03);
    }
    // Rust patches as shallow blisters.
    if (wear > 0.5) {
      const count = rusted ? 16 : 5;
      for (let i = 0; i < count; i++) {
        const blob = part(bot, new THREE.SphereGeometry(0.004 + random() * 0.005, 8, 6), rust, (random() - 0.5) * bw * 0.8, hipY + 0.008 + random() * (bh - 0.016), (random() < 0.7 ? 1 : -1) * (bd / 2 - 0.002));
        blob.scale.z = 0.25;
      }
    }

    // Pose.
    const loose = a.state === 'played' ? (random() < 0.5 ? 0 : 1) : -1;
    const stride = a.pose === 'stride' ? 0.42 : 0;
    legs[0].rotation.x = -stride; legs[1].rotation.x = stride;
    arms[0].rotation.x = stride * 1.3; arms[1].rotation.x = -stride * 1.3;
    if (a.pose === 'guard') { arms[0].rotation.x = arms[1].rotation.x = -0.12; }
    if (loose >= 0) arms[loose].rotation.z = (loose ? 1 : -1) * 0.22;
    if (a.pose === 'fallen') {
      bot.rotation.x = Math.PI / 2;
      bot.rotation.z = (random() - 0.5) * 0.5;
      arms[0].rotation.x = -2.4; arms[1].rotation.x = -1.2 - random();
      legs[0].rotation.x = -0.3; legs[1].rotation.x = 0.3;
    } else bot.rotation.y = (random() - 0.5) * 0.25;

    // Cardboard box for the mint one.
    if (a.state === 'boxed') {
      const boxH = 0.27 * tall, boxW = 0.15, boxD = 0.1;
      const art = paint(256, 460, (c) => {
        c.fillStyle = c1; c.fillRect(0, 0, 256, 460);
        c.fillStyle = c2; c.beginPath(); c.arc(128, 250, 150, 0, 7); c.fill();
        c.fillStyle = '#18181c'; c.fillRect(88, 150, 80, 64); c.fillRect(74, 222, 108, 110); c.fillRect(86, 336, 34, 70); c.fillRect(136, 336, 34, 70);
        c.fillStyle = '#f6f1e2'; c.beginPath(); c.arc(110, 176, 12, 0, 7); c.arc(146, 176, 12, 0, 7); c.fill();
        c.fillStyle = '#fff8e0'; c.font = 'bold 54px monospace'; c.textAlign = 'center';
        c.fillText(a.origin === 'soviet' ? 'РОБОТ' : 'ROBOT', 128, 70, 230);
        c.font = 'bold 22px monospace';
        c.fillText(a.origin === 'japan' ? 'MADE IN JAPAN' : a.origin === 'soviet' ? 'ЗАВОДНОЙ' : 'TIN TOY CLASSIC', 128, 104, 230);
        c.fillText(a.origin === 'soviet' ? '2 руб 40 коп' : 'WIND-UP · WALKS!', 128, 440, 230);
      });
      const card = new THREE.MeshStandardMaterial({ color: '#b89a6c', roughness: 0.9 });
      const boxGroup = new THREE.Group();
      boxGroup.position.set(-0.15, 0, -0.05);
      boxGroup.rotation.y = 0.3 + random() * 0.3;
      part(boxGroup, new THREE.BoxGeometry(boxW, boxH, boxD), card, 0, boxH / 2, 0);
      part(boxGroup, new THREE.PlaneGeometry(boxW - 0.004, boxH - 0.004), new THREE.MeshStandardMaterial({ map: art, roughness: 0.7 }), 0, boxH / 2, boxD / 2 + 0.0008);
      const flap = part(boxGroup, new THREE.BoxGeometry(boxW, 0.002, boxD * 0.9), card, 0, boxH + 0.028, -boxD * 0.82);
      flap.rotation.x = 0.75;
      s.root.add(boxGroup);
    }

    const still = rusted || (a.pose === 'guard' && mood.energy < 0.35);
    const speed = mix(2.5, 11, mood.energy);
    let t = random() * 6;
    return s.finish({
      update: (dt) => {
        if (still) return;
        t += dt * speed;
        const swing = Math.sin(t) * (a.pose === 'guard' ? 0.06 : 0.42);
        if (a.pose === 'fallen') { legs[0].rotation.x = -swing; legs[1].rotation.x = swing; }
        else {
          legs[0].rotation.x = -swing; legs[1].rotation.x = swing;
          arms[0].rotation.x = swing * 1.3; arms[1].rotation.x = -swing * 1.3;
          bot.rotation.z = Math.cos(t) * 0.05;
        }
        key.rotation.z -= dt * speed * 0.6;
        if (bobble) bobble.position.x = Math.sin(t * 2.3) * 0.002;
        for (const needle of needles) if (a.face === 'surprised') needle.rotation.z += dt * speed * 0.4;
      },
    });
  },
});
