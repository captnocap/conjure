import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

function paint(width: number, height: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

const BRANDS = {
  charge: 'CHARGE in white on electric green, a generic utility.',
  powerup: 'POWER UP on hot orange, loud and sponsored.',
  volt: 'volt in lower case on deep violet, a start-up.',
  bank: 'A bank advertising itself: FREE POWER on navy with a gold line.',
  telecom: 'A phone network: STAY CONNECTED on magenta.',
  airport: 'Plain airport wayfinding: a black plug pictogram on yellow.',
} as const;
const BRAND: Record<keyof typeof BRANDS, { text: string; fill: string; ink: string }> = {
  charge: { text: 'CHARGE', fill: '#18b85a', ink: '#ffffff' },
  powerup: { text: 'POWER UP', fill: '#f2651c', ink: '#ffffff' },
  volt: { text: 'volt', fill: '#5a2fc0', ink: '#ffffff' },
  bank: { text: 'FREE POWER', fill: '#1c2f66', ink: '#e8c35a' },
  telecom: { text: 'STAY CONNECTED', fill: '#d81c7a', ink: '#ffffff' },
  airport: { text: 'CHARGING', fill: '#ffd21e', ink: '#141414' },
};
const SCREENS = {
  message: 'A message thread with one last bubble sent and no reply under it.',
  low: 'A red empty-battery icon: it has only just started charging.',
  full: 'A green full battery: charged long ago, never collected.',
  call: 'An incoming call lighting it up, ringing to nobody.',
  missed: 'A lock screen stacked with missed calls and notifications.',
  photo: 'A lock-screen photograph of two people, the time above them.',
  cracked: 'A cracked screen, still glowing through the spiderweb.',
} as const;

export default defineThing({
  questions: {
    brand: choice('Whose branding is on the column?', BRANDS),
    form: choice('What shape is the charging point?', {
      round: 'A round column with a circular shelf ringing it at elbow height.',
      square: 'A square totem with a shelf on each face.',
      table: 'A tall round standing table with a power hub rising from its centre.',
      slim: 'A slim pole with one small shelf and a lit head, bolted to the floor.',
    }),
    screen: choice('What is on the screen of the phone left plugged in?', SCREENS),
    cables: score('How many charging cables dangle from it?', ['One, and the phone is on it', 'A few, neatly hanging', 'A full skirt of them', 'A knotted tangle, some torn off at the plug']),
    shelf: choice('What else has been left on the shelf?', {
      nothing: 'Nothing but the phone.',
      coffee: 'A half-drunk coffee.',
      passport: 'A passport with a boarding pass tucked in it.',
      earbuds: 'A pair of earbuds in an open case.',
      second: 'A second, older phone, face down and dark.',
      charger: 'A wall charger and a coiled cable somebody brought and forgot.',
    }),
    stools: noul('Are there bar stools pulled up to it?'),
    topper: choice('What is at the top of the column?', {
      ring: 'A glowing ring of light.',
      sign: 'A lit sign box with the brand on it.',
      bolt: 'A big lightning-bolt symbol.',
      plain: 'Nothing: a flat cap.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const brand = BRAND[a.brand];
    const glowLevel = mix(0.45, 1, mood.cheer);
    const shellColour = a.brand === 'airport' ? '#3a3d42' : '#e9ebe8';
    const shell = s.material(shellColour, { roughness: 0.4 });
    const tint = s.material(brand.fill, { roughness: 0.45, emissive: brand.fill, emissiveIntensity: 0.25 * glowLevel });
    const dark = s.material('#1c1e21', { roughness: 0.6 });
    const steel = s.material('#a7adb1', { metalness: 0.85, roughness: 0.3 });
    const wood = s.material('#c9a878', { roughness: 0.55 });
    const round = a.form !== 'square';
    const R = { round: 0.2, square: 0.2, table: 0.11, slim: 0.065 }[a.form];
    const shelfY = 1.06, shelfR = { round: 0.5, square: 0.46, table: 0.55, slim: 0.24 }[a.form];
    const top = { round: 2.1, square: 2.05, table: 1.55, slim: 1.75 }[a.form];

    // Column and base.
    if (round) {
      s.cylinder(R, R, top, [0, top / 2, 0], a.form === 'slim' ? steel : shell, 28);
      s.cylinder(a.form === 'table' ? 0.34 : R + 0.14, a.form === 'table' ? 0.36 : R + 0.16, 0.035, [0, 0.0175, 0], dark, 28);
      if (a.form !== 'slim') s.cylinder(R + 0.004, R + 0.004, 0.4, [0, 0.5, 0], tint, 28);
    } else {
      s.mesh(new RoundedBoxGeometry(R * 2, top, R * 2, 3, 0.03), shell, [0, top / 2, 0]);
      s.box([R * 2 + 0.2, 0.035, R * 2 + 0.2], [0, 0.0175, 0], dark);
      s.box([R * 2 + 0.008, 0.4, R * 2 + 0.008], [0, 0.5, 0], tint);
    }
    // Shelf.
    const shelfMat = a.form === 'table' ? wood : s.material('#f1f1ec', { roughness: 0.35 });
    if (a.form === 'square') { s.mesh(new RoundedBoxGeometry(shelfR * 2, 0.04, shelfR * 2, 3, 0.015), shelfMat, [0, shelfY, 0]); s.box([shelfR * 2 + 0.01, 0.014, shelfR * 2 + 0.01], [0, shelfY - 0.024, 0], tint); }
    else if (a.form === 'slim') { s.mesh(new RoundedBoxGeometry(0.44, 0.03, 0.3, 3, 0.012), shelfMat, [0, shelfY, 0.2]); s.rod([0, shelfY - 0.25, 0.05], [0, shelfY - 0.02, 0.3], 0.012, steel); }
    else { s.cylinder(shelfR, shelfR, 0.04, [0, shelfY, 0], shelfMat, 40); s.cylinder(shelfR + 0.005, shelfR + 0.005, 0.014, [0, shelfY - 0.024, 0], tint, 40); }

    // Brand panel wrapped around the column above the shelf.
    const wrap = paint(1024, 256, (c, w, h) => {
      c.fillStyle = brand.fill; c.fillRect(0, 0, w, h);
      c.fillStyle = brand.ink; c.textAlign = 'center'; c.textBaseline = 'middle';
      const repeats = a.form === 'slim' || a.form === 'table' ? 2 : round ? 3 : 4;
      for (let i = 0; i < repeats; i++) {
        const cx = (i + 0.5) * w / repeats, span = w / repeats - 40;
        c.font = `bold ${brand.text.length > 9 ? 44 : 76}px sans-serif`;
        c.fillText(brand.text, cx, 108, span);
        // A little plug pictogram under each.
        c.fillRect(cx - 16, 176, 32, 26); c.fillRect(cx - 11, 162, 6, 16); c.fillRect(cx + 5, 162, 6, 16); c.fillRect(cx - 3, 202, 6, 20);
      }
    });
    const wrapMat = new THREE.MeshStandardMaterial({ map: wrap, emissive: '#ffffff', emissiveMap: wrap, emissiveIntensity: 0.4 * glowLevel, roughness: 0.4 });
    const bandY = a.form === 'table' ? 1.36 : a.form === 'slim' ? 1.5 : 1.7, bandH = a.form === 'slim' ? 0.22 : a.form === 'table' ? 0.18 : 0.34;
    if (round) {
      const br = a.form === 'slim' ? 0.11 : R + 0.006;
      const band = s.mesh(new THREE.CylinderGeometry(br, br, bandH, 32, 1, true), wrapMat, [0, bandY, 0]);
      band.rotation.y = Math.PI / 2 * (a.form === 'slim' ? 1 : 1) + Math.PI / (a.form === 'slim' || a.form === 'table' ? 2 : 3) - Math.PI / 2;
      if (a.form === 'slim') { s.cylinder(0.11, 0.11, 0.012, [0, bandY + bandH / 2, 0], dark, 24); s.cylinder(0.11, 0.11, 0.012, [0, bandY - bandH / 2, 0], dark, 24); }
    } else {
      wrap.repeat.set(0.25, 1);
      for (let k = 0; k < 4; k++) { const plane = s.mesh(new THREE.PlaneGeometry(R * 2 - 0.02, bandH), wrapMat, [Math.sin(k * Math.PI / 2) * (R + 0.003), bandY, Math.cos(k * Math.PI / 2) * (R + 0.003)]); plane.rotation.y = k * Math.PI / 2; plane.castShadow = false; }
    }

    // Topper.
    const lightMat = new THREE.MeshStandardMaterial({ color: brand.fill, emissive: brand.fill, emissiveIntensity: 1.2 * glowLevel, roughness: 0.3 });
    if (a.topper === 'ring') { const halo = s.ring(Math.max(R + 0.06, 0.16), 0.022, [0, top - 0.04, 0], lightMat); halo.rotation.x = Math.PI / 2; halo.castShadow = false; s.cylinder(R * 0.9, R, 0.03, [0, top + 0.015, 0], dark, 24); }
    else if (a.topper === 'sign') {
      s.rod([0, top, 0], [0, top + 0.1, 0], 0.03, steel);
      s.mesh(new RoundedBoxGeometry(0.62, 0.24, 0.1, 2, 0.02), dark, [0, top + 0.22, 0]);
      for (const side of [1, -1]) { const face = s.label(brand.text, 0.58, 0.2, [0, top + 0.22, side * 0.052], brand.ink, brand.fill); face.rotation.y = side === 1 ? 0 : Math.PI; (face.material as THREE.MeshStandardMaterial).emissive.set('#ffffff'); (face.material as THREE.MeshStandardMaterial).emissiveMap = (face.material as THREE.MeshStandardMaterial).map; (face.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 * glowLevel; face.castShadow = false; }
    } else if (a.topper === 'bolt') {
      const shape = new THREE.Shape();
      [[0.05, 0.34], [-0.11, 0.12], [-0.015, 0.12], [-0.06, -0.08], [0.11, 0.17], [0.01, 0.17], [0.09, 0.34]].forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
      const bolt = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#ffd21e', emissive: '#ffc400', emissiveIntensity: 0.9 * glowLevel, roughness: 0.4 }), [0, top + 0.1, -0.025]);
      bolt.castShadow = true;
      s.cylinder(R * 0.9, R, 0.03, [0, top + 0.015, 0], dark, 24);
    } else s.cylinder(R * 0.92, R, 0.025, [0, top + 0.0125, 0], dark, 24);

    // Sockets and cables around the column, just above the shelf.
    const ports = a.form === 'slim' ? 3 : a.form === 'square' ? 8 : 8;
    const hang = Math.max(1, Math.round(mix(1, ports, Math.min(1, a.cables * 1.15))));
    const tangled = a.cables > 0.8;
    const cableColours = ['#1f2125', brand.fill, '#1f2125', '#f1f1ec', '#3a3d44', brand.fill];
    const portAt = (k: number) => {
      const angle = a.form === 'slim' ? (k - 1) * 0.6 : (k / ports) * Math.PI * 2 + (round ? 0.25 : Math.PI / 8 + (k % 2 ? 0.14 : -0.14));
      const r = a.form === 'slim' ? R : round ? R : R / Math.max(Math.abs(Math.sin(angle)), Math.abs(Math.cos(angle)));
      return { angle, x: Math.sin(angle) * r, z: Math.cos(angle) * r };
    };
    const socketY = shelfY + 0.24;
    let phonePort = 0;
    for (let k = 0; k < ports; k++) {
      const p = portAt(k);
      const plate = s.mesh(new RoundedBoxGeometry(0.075, 0.1, 0.012, 2, 0.005), dark, [p.x * 1.01, socketY, p.z * 1.01]);
      plate.rotation.y = p.angle;
      const led = s.box([0.012, 0.012, 0.004], [Math.sin(p.angle) * (Math.hypot(p.x, p.z) + 0.008) + Math.cos(p.angle) * 0.022, socketY + 0.035, Math.cos(p.angle) * (Math.hypot(p.x, p.z) + 0.008) - Math.sin(p.angle) * 0.022], new THREE.MeshStandardMaterial({ color: '#39d06a', emissive: '#39d06a', emissiveIntensity: random() < 1 - mood.wear * 0.6 ? 1 : 0 }));
      led.rotation.y = p.angle;
      if (Math.abs(p.angle - 0.25) < 0.01 || (a.form === 'slim' && k === 1)) phonePort = k;
    }
    // The phone: propped against the column, facing out, screen alight.
    const pp = portAt(phonePort);
    const out = new THREE.Vector3(Math.sin(pp.angle), 0, Math.cos(pp.angle));
    const baseR = Math.hypot(pp.x, pp.z);
    const phone = new THREE.Group();
    phone.position.set(out.x * (baseR + 0.075), shelfY + 0.02, out.z * (baseR + 0.075));
    phone.rotation.y = pp.angle;
    s.root.add(phone);
    const screenMap = paint(180, 360, (c, w, h) => {
      const bg = { message: '#f4f4f6', low: '#0a0a0c', full: '#0a0a0c', call: '#1d5f38', missed: '#283a5a', photo: '#d98a5a', cracked: '#3f6fc0' }[a.screen];
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      const pill = (x: number, y: number, pw: number, ph: number, fill: string) => { c.fillStyle = fill; c.beginPath(); c.roundRect(x, y, pw, ph, Math.min(ph / 2, 18)); c.fill(); };
      if (a.screen === 'message') { pill(14, 40, 100, 34, '#d9dade'); pill(60, 92, 106, 34, '#2a8cff'); pill(14, 144, 80, 34, '#d9dade'); pill(36, 200, 130, 60, '#2a8cff'); pill(100, 268, 66, 12, '#b9bcc2'); }
      else if (a.screen === 'low' || a.screen === 'full') { const col = a.screen === 'low' ? '#ff3b30' : '#34d05a'; c.strokeStyle = '#ffffff'; c.lineWidth = 7; c.strokeRect(34, 140, 104, 60); c.fillStyle = '#ffffff'; c.fillRect(140, 158, 10, 24); c.fillStyle = col; c.fillRect(42, 148, a.screen === 'low' ? 14 : 88, 44); }
      else if (a.screen === 'call') { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(90, 110, 44, 0, 7); c.fill(); pill(30, 180, 120, 16, '#ffffff'); c.fillStyle = '#ff3b30'; c.beginPath(); c.arc(46, 300, 28, 0, 7); c.fill(); c.fillStyle = '#34d05a'; c.beginPath(); c.arc(134, 300, 28, 0, 7); c.fill(); }
      else if (a.screen === 'missed') { c.fillStyle = '#ffffff'; c.font = 'bold 54px sans-serif'; c.textAlign = 'center'; c.fillText('04:1' + Math.floor(random() * 10), 90, 78); for (let i = 0; i < 4; i++) { pill(12, 116 + i * 58, 156, 48, 'rgba(255,255,255,0.82)'); c.fillStyle = '#ff3b30'; c.beginPath(); c.arc(32, 140 + i * 58, 10, 0, 7); c.fill(); } }
      else if (a.screen === 'photo') { c.fillStyle = '#f4c98a'; c.fillRect(0, 0, w, 190); c.fillStyle = '#3f2a2a'; c.beginPath(); c.arc(66, 230, 32, 0, 7); c.arc(118, 222, 30, 0, 7); c.fill(); c.fillRect(26, 258, 132, 102); c.fillStyle = '#ffffff'; c.font = 'bold 50px sans-serif'; c.textAlign = 'center'; c.fillText('04:0' + Math.floor(random() * 10), 90, 72); }
      else { c.fillStyle = '#ffffff'; c.font = 'bold 50px sans-serif'; c.textAlign = 'center'; c.fillText('04:2' + Math.floor(random() * 10), 90, 80); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2.5; const ox = 40 + random() * 100, oy = 200 + random() * 100; for (let i = 0; i < 11; i++) { const t = i * 0.6 + random() * 0.3; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + Math.cos(t) * 150, oy + Math.sin(t) * 400); c.stroke(); } for (const r of [28, 64, 110]) { c.beginPath(); c.arc(ox, oy, r, 0, 7); c.stroke(); } }
    });
    const tilt = -0.32;
    const slab = new THREE.Mesh(new RoundedBoxGeometry(0.078, 0.158, 0.011, 2, 0.005), dark);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.148), new THREE.MeshStandardMaterial({ map: screenMap, emissive: '#ffffff', emissiveMap: screenMap, emissiveIntensity: 1.1, roughness: 0.2 }));
    glass.position.z = 0.0062;
    const body = new THREE.Group();
    body.add(slab, glass);
    body.position.set(0, 0.078, 0);
    body.rotation.x = tilt;
    slab.castShadow = true;
    phone.add(body);
    // A soft bloom so the lit screen reads from across the hall.
    const bloomColour = { message: '#bcd8ff', low: '#ff5a50', full: '#5aff8a', call: '#5aff8a', missed: '#9db8ff', photo: '#ffc890', cracked: '#8fb0ff' }[a.screen];
    const bloomMat = new THREE.MeshBasicMaterial({ color: bloomColour, transparent: true, opacity: 0.26, depthWrite: false });
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), bloomMat);
    bloom.position.set(0, 0.09, 0.03);
    phone.add(bloom);

    for (let k = 0; k < hang; k++) {
      const port = (phonePort + k) % ports;
      const p = portAt(port);
      const dir = new THREE.Vector3(Math.sin(p.angle), 0, Math.cos(p.angle));
      const r0 = Math.hypot(p.x, p.z);
      const colour = cableColours[k % cableColours.length];
      const cable = s.material(colour, { roughness: 0.6 });
      const start: [number, number, number] = [dir.x * (r0 + 0.012), socketY - 0.02, dir.z * (r0 + 0.012)];
      s.box([0.022, 0.03, 0.03], start, cable).rotation.y = p.angle;
      if (k === 0) {
        // The one cable in use: down to the shelf and into the phone.
        s.tube([start, [dir.x * (r0 + 0.05), socketY - 0.14, dir.z * (r0 + 0.05)], [dir.x * (r0 + 0.16) + dir.z * 0.06, shelfY + 0.024, dir.z * (r0 + 0.16) - dir.x * 0.06], [dir.x * (r0 + 0.085), shelfY + 0.026, dir.z * (r0 + 0.085)]], 0.008, cable);
        continue;
      }
      if (tangled && random() < 0.3) { s.rod(start, [start[0] + dir.x * 0.03, socketY - 0.07, start[2] + dir.z * 0.03], 0.008, cable); continue; }
      // Off the shelf edge and hanging, or coiled on the shelf.
      const edge = (a.form === 'square' ? shelfR / Math.max(Math.abs(dir.x), Math.abs(dir.z)) : a.form === 'slim' ? 0.36 : shelfR) + 0.012;
      const swing = (random() - 0.5) * (tangled ? 0.5 : 0.12);
      const drop = mix(0.3, 0.8, random());
      const side = new THREE.Vector3(dir.z, 0, -dir.x);
      const at = (r: number, y: number, sway = 0): [number, number, number] => [dir.x * r + side.x * sway, y, dir.z * r + side.z * sway];
      s.tube([start, at(r0 + 0.07, socketY - 0.15, swing * 0.2), at((r0 + edge) / 2, shelfY + 0.026, swing * 0.5), at(edge - 0.01, shelfY + 0.024, swing * 0.8), at(edge + 0.012, shelfY - 0.08, swing), at(edge + 0.006 - (tangled ? random() * 0.1 : 0), shelfY - drop, swing * (tangled ? 2 : 1.1))], 0.008, cable);
      s.box([0.022, 0.05, 0.012], at(edge + 0.006, shelfY - drop - 0.012, swing * (tangled ? 2 : 1.1)), steel);
    }

    // Other things on the shelf, set a quarter turn round from the phone.
    const spot = (turn: number, r: number): [number, number] => { const t = pp.angle + turn; return a.form === 'slim' ? [turn > 0 ? 0.14 : -0.14, 0.26] : [Math.sin(t) * r, Math.cos(t) * r]; };
    const sy = shelfY + (a.form === 'slim' ? 0.015 : 0.02);
    const [ox, oz] = spot(0.7 + random() * 0.3, (baseR + shelfR) / 2 + 0.02);
    if (a.shelf === 'coffee') { s.cylinder(0.04, 0.03, 0.11, [ox, sy + 0.055, oz], s.material('#f0ece0'), 14); s.cylinder(0.042, 0.042, 0.012, [ox, sy + 0.115, oz], dark, 14); s.cylinder(0.055, 0.055, 0.002, [ox + 0.02, sy + 0.001, oz + 0.01], s.material('#8a5a34', { roughness: 0.4 }), 16); }
    else if (a.shelf === 'passport') { s.box([0.09, 0.012, 0.125], [ox, sy + 0.006, oz], s.material('#6a1f2a', { roughness: 0.6 })).rotation.y = random() * 3; s.box([0.2, 0.003, 0.08], [ox + 0.02, sy + 0.014, oz], s.material('#f3f0e6')).rotation.y = random() * 3; }
    else if (a.shelf === 'earbuds') { s.mesh(new RoundedBoxGeometry(0.06, 0.025, 0.05, 2, 0.01), s.material('#f4f4f0', { roughness: 0.3 }), [ox, sy + 0.0125, oz]); for (const d of [-0.035, 0.05]) s.ball([0.011, 0.011, 0.011], [ox + d, sy + 0.011, oz + 0.05], s.material('#f4f4f0'), 8); }
    else if (a.shelf === 'second') s.mesh(new RoundedBoxGeometry(0.075, 0.012, 0.15, 2, 0.005), s.material('#3a3d44', { roughness: 0.4 }), [ox, sy + 0.006, oz]).rotation.y = random() * 3;
    else if (a.shelf === 'charger') { s.box([0.05, 0.05, 0.03], [ox, sy + 0.025, oz], s.material('#f4f4f0')); const coil = s.ring(0.045, 0.006, [ox + 0.09, sy + 0.006, oz + 0.01], s.material('#f4f4f0')); coil.rotation.x = Math.PI / 2; s.ring(0.03, 0.006, [ox + 0.09, sy + 0.016, oz + 0.01], s.material('#f4f4f0')).rotation.x = Math.PI / 2; }
    // Rings left by a hundred cups, and a sticker someone has half peeled.
    for (let k = 0; k < Math.round(mood.wear * 5); k++) { const [rx, rz] = spot(1.5 + random() * 3.5, (baseR + shelfR) / 2); const ringMark = s.ring(0.035, 0.003, [rx, sy + 0.002, rz], s.material('#8a6a48', { roughness: 0.9 })); ringMark.rotation.x = Math.PI / 2; ringMark.castShadow = false; }

    if (a.stools && a.form !== 'slim') {
      const count = 2 + Math.floor(random() * 2 + mood.density);
      for (let k = 0; k < count; k++) {
        const t = pp.angle + Math.PI * 0.5 + (k / count) * Math.PI * 1.6 + (random() - 0.5) * 0.3, r = shelfR + 0.32 + random() * 0.2;
        const x = Math.sin(t) * r, z = Math.cos(t) * r;
        s.cylinder(0.2, 0.22, 0.02, [x, 0.01, z], steel, 20);
        s.cylinder(0.022, 0.022, 0.72, [x, 0.37, z], steel, 10);
        s.ring(0.14, 0.01, [x, 0.3, z], steel).rotation.x = Math.PI / 2;
        s.cylinder(0.17, 0.15, 0.06, [x, 0.76, z], k % 2 ? tint : dark, 20);
      }
    }

    // The screen dims and wakes; an incoming call pulses.
    const rate = a.screen === 'call' ? 5 : mix(0.5, 1.6, mood.energy);
    const glassMat = glass.material;
    return s.finish({
      footprint: a.stools && a.form !== 'slim' ? undefined : Math.max(shelfR, 0.3),
      update: (_dt, time) => {
        const wave = 0.5 + 0.5 * Math.sin(time * rate);
        glassMat.emissiveIntensity = a.screen === 'call' ? 0.6 + wave * 0.9 : 0.9 + wave * 0.3;
        bloomMat.opacity = 0.16 + wave * 0.14;
      },
    });
  },
});
