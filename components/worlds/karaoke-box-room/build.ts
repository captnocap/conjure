import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
type P = [number, number, number];

const LEDS = {
  'magenta-cyan': ['#ff2fa8', '#22d8ff'],
  sunset: ['#ff7a2a', '#ff3f8e'],
  violet: ['#3a6aff', '#b04dff'],
  lime: ['#3dea5a', '#e4ff3a'],
  rainbow: ['#ff3f5a', '#3ad0ff'],
  house: ['#fff0cc', '#ffe6b0'],
} as const;
const SEATS = { oxblood: '#8a1f28', teal: '#2f9a94', black: '#34323c', pink: '#f06fa6', mustard: '#d6a62a' } as const;
const STYLE = {
  chain: { wall: '#f1dcd6', trim: '#e0567a', floor: '#c9a678' },
  noraebang: { wall: '#6b4aa0', trim: '#ffd22e', floor: '#5a5670' },
  showa: { wall: '#9a3a44', trim: '#5a3a22', floor: '#a83a3a' },
  space: { wall: '#3f4f9a', trim: '#8a6ad8', floor: '#4a4a7a' },
  budget: { wall: '#ddd2ae', trim: '#8a8a7a', floor: '#9aa09a' },
} as const;

function paint(w: number, h: number, draw: (c: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
function starPath(c: Ctx, x: number, y: number, r: number, spin = 0) {
  c.beginPath();
  for (let k = 0; k < 10; k++) { const t = (k / 10) * Math.PI * 2 + spin, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.sin(t) * rr, y - Math.cos(t) * rr); }
  c.closePath();
}
function heartPath(c: Ctx, x: number, y: number, r: number) {
  c.beginPath(); c.moveTo(x, y + r);
  c.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.3, x, y - r * 0.4);
  c.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r);
}

export default defineWorld({
  questions: {
    style: choice('What kind of karaoke place is it?', {
      chain: 'A bright Tokyo chain box: pale walls with a bold colour wave, laminate floor, everything wipe-clean.',
      noraebang: 'A Seoul noraebang: purple walls scrawled with neon stars and hearts, checker floor.',
      showa: 'An old Showa-era snack lounge: wood panelling, burgundy flock wallpaper, patterned red carpet.',
      space: 'A themed galaxy room: a blue mural of planets and stars, speckled carpet.',
      budget: 'A tired budget box: yellowed walls, water stains, a peeling poster, grey vinyl tiles.',
    }),
    hour: choice('What moment of the night is it?', {
      opening: 'Early evening: the room freshly cleaned and waiting.',
      party: 'Peak of the party: confetti, balloons, coats heaped on the seat, shoes kicked off by the door.',
      'last-train': 'Three in the morning, the last train long gone: one coat, one bag, very quiet.',
      aftermath: 'Just after closing time: cans on the floor, a bin bag and a mop bucket by the door.',
    }),
    screen: choice('What is on the lyric screen?', {
      ballad: 'A heartbreak ballad over a sunset beach, the highlight creeping along the line.',
      idol: 'Idol pop: pink sparkles, hearts and exclamation marks.',
      enka: 'An enka ballad: a snowy harbour and lines of dense characters.',
      duet: 'A duet, one part sung in blue and the other part waiting unsung in pink.',
      score: 'The score screen: a huge number and a burst of stars.',
      idle: 'The idle screen: SELECT A SONG and a ranking list.',
      timeup: 'A red warning: ten minutes left.',
    }),
    leds: choice('What colour are the LED strips along the ceiling coving?', {
      'magenta-cyan': 'Magenta and cyan.',
      sunset: 'Orange and hot pink.',
      violet: 'Blue and violet.',
      lime: 'Acid green and yellow.',
      rainbow: 'A slow rainbow chase.',
      house: 'Plain warm white: the house lights are up.',
    }),
    seats: choice('What colour is the banquette?', {
      oxblood: 'Oxblood vinyl.',
      teal: 'Teal vinyl.',
      black: 'Charcoal leatherette.',
      pink: 'Bubblegum pink.',
      mustard: 'Mustard yellow.',
    }),
    size: choice('How big is the room?', {
      solo: 'A tight box for one or two.',
      standard: 'An ordinary room for six.',
      party: 'A big party room.',
    }),
    door: choice('How is the door?', {
      closed: 'Shut, corridor light glowing in its little window.',
      ajar: 'Ajar, a wedge of corridor light across the floor.',
      open: 'Wide open: someone has just left, or staff are about to walk in.',
    }),
    neon: choice('What neon sign hangs on the side wall?', {
      note: 'A musical note.',
      heart: 'A heart.',
      star: 'A star.',
      cocktail: 'A cocktail glass.',
      none: 'No neon: just the posters.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const [W, D] = a.size === 'solo' ? [9.5, 8.5] : a.size === 'party' ? [15, 11] : [12.5, 10];
    const H = 5, X0 = -W / 2, X1 = W / 2, Z0 = -D / 2, Z1 = D / 2;
    const sx = W / 12.5, sz = D / 10;
    const [ledA, ledB] = LEDS[a.leds];
    const style = STYLE[a.style];
    const screenW = a.size === 'solo' ? 3.3 : a.size === 'party' ? 5.6 : 4.6, screenH = screenW * 0.5625;
    const doorX = X1 - 1.45, screenX = doorX - 1.35 - screenW / 2 - 0.25, screenY = 3.05;
    const ret = screenX - screenW / 2 - 0.35 - X0;
    const background = `#${new THREE.Color('#e6dde6').lerp(new THREE.Color(ledA), 0.22).getHexString()}`;
    const { art: s, world } = diorama(context, {
      background, floor: null, width: W, depth: D, maxHeight: 2.5, radius: 1.35, pitch: 30, yaw: 30,
      slots: [
        [0.7 * sx, 1.0 * sz], [-2.5 * sx, -1.5 * sz, 0, 0.9], [3.3 * sx, 2.5 * sz, 0, 0.85], [-2.0 * sx, 3.2 * sz, 0, 0.8],
        [screenX, Z0 + 0.7, 1.0, 0.5], [X0 + 0.75, 1.3 * sz, 0.84, 0.5],
      ],
    });
    // Dusk rather than daylight: tint the stock lights toward the LEDs.
    for (const child of s.root.children) {
      const hemi = child as THREE.HemisphereLight, sun = child as THREE.DirectionalLight;
      if (hemi.isHemisphereLight) { hemi.color.set('#fff0f6').lerp(new THREE.Color(ledB), 0.3); hemi.groundColor.set('#6a5a7a').lerp(new THREE.Color(ledA), 0.25); hemi.intensity = 1.5; }
      else if (sun.isDirectionalLight && sun.castShadow) { sun.color.lerp(new THREE.Color(ledA), 0.25); sun.intensity = 2.1; }
    }
    const flat = (hex: THREE.ColorRepresentation, rough = 0.85) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough });
    const glowMat = (hex: THREE.ColorRepresentation, power = 1) => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: power * mix(0.9, 1.7, mood.cheer), roughness: 0.4 });
    const wash = (hex: string, opacity: number, map: THREE.Texture) => new THREE.MeshBasicMaterial({ color: hex, map, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const fadeMap = paint(8, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#000000'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    const poolMap = paint(128, 128, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#000000'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    const age = mood.wear;

    // --- Floor.
    const floorMap = paint(1024, Math.round((1024 * D) / W), (c, w, h) => {
      const px = w / W;
      c.fillStyle = style.floor; c.fillRect(0, 0, w, h);
      if (a.style === 'chain') {
        for (let y = 0; y < h; y += px * 0.45) { let x = -random() * 150; while (x < w) { const len = 150 + random() * 250, t = random(); c.fillStyle = `rgb(${196 + t * 22},${160 + t * 20},${112 + t * 20})`; c.fillRect(x, y, len - 1.5, px * 0.45 - 1.5); x += len; } }
      } else if (a.style === 'noraebang' || a.style === 'budget') {
        const size = px * (a.style === 'budget' ? 1 : 1.25);
        for (let y = 0; y < h / size; y++) for (let x = 0; x < w / size; x++) {
          const t = random() * 14;
          c.fillStyle = a.style === 'budget' ? `rgb(${150 + t},${156 + t},${150 + t})` : (x + y) % 2 ? '#3c3852' : '#b9b2cc';
          c.fillRect(x * size, y * size, size - 2, size - 2);
        }
      } else if (a.style === 'showa') {
        c.strokeStyle = '#e0b04a'; c.lineWidth = 3; c.fillStyle = '#7a2228';
        for (let y = 0; y < h / px + 1; y += 1.1) for (let x = (Math.round(y / 1.1) % 2) * 0.55; x < W + 1; x += 1.1) {
          c.beginPath(); c.moveTo(x * px, (y - 0.4) * px); c.lineTo((x + 0.4) * px, y * px); c.lineTo(x * px, (y + 0.4) * px); c.lineTo((x - 0.4) * px, y * px); c.closePath(); c.fill(); c.stroke();
        }
      } else {
        const tints = ['#ff7ac8', '#7af0ff', '#fff27a', '#b8a0ff'];
        for (let i = 0; i < 900; i++) { c.fillStyle = tints[i % 4]; c.globalAlpha = 0.5 + random() * 0.4; c.fillRect(random() * w, random() * h, 2 + random() * 4, 2 + random() * 4); }
        c.globalAlpha = 1;
      }
      for (let i = 0; i < age * 40; i++) { c.fillStyle = `rgba(40,30,30,${0.05 + random() * 0.12})`; c.beginPath(); c.ellipse(random() * w, random() * h, 8 + random() * 40, 6 + random() * 24, random() * 3, 0, 7); c.fill(); }
    });
    const edge = flat('#7a6a78');
    const ground = new THREE.Mesh(new THREE.BoxGeometry(W, 0.24, D), [edge, edge, new THREE.MeshStandardMaterial({ map: floorMap, roughness: a.style === 'showa' || a.style === 'space' ? 1 : 0.5 }), edge, edge, edge]);
    ground.position.y = -0.12; ground.receiveShadow = true; s.root.add(ground); world.ground = ground;

    // --- Walls. Canvas x runs left to right as seen from inside the room.
    const wallArt = (c: Ctx, w: number, h: number, span: number, back: boolean) => {
      const px = w / span;
      c.fillStyle = style.wall; c.fillRect(0, 0, w, h);
      if (a.style === 'chain') {
        c.fillStyle = style.trim; c.beginPath(); c.moveTo(0, h * 0.62);
        for (let x = 0; x <= w; x += 16) c.lineTo(x, h * 0.6 + Math.sin(x / px * 1.1 + (back ? 1 : 0)) * h * 0.07);
        c.lineTo(w, h * 0.78); for (let x = w; x >= 0; x -= 16) c.lineTo(x, h * 0.76 + Math.sin(x / px * 1.1 + 0.6) * h * 0.05); c.fill();
        c.fillStyle = '#ffd22e'; for (let x = 0; x < w; x += px * 0.9) { c.beginPath(); c.arc(x, h * 0.86, px * 0.09, 0, 7); c.fill(); }
      } else if (a.style === 'noraebang') {
        const tints = ['#ffd22e', '#ff5ab0', '#5af0ff', '#9aff6a', '#ffffff'];
        c.lineWidth = 5; c.lineCap = 'round';
        for (let i = 0; i < span * 2.2; i++) {
          const x = random() * w, y = random() * h * 0.92, r = (0.12 + random() * 0.22) * px;
          c.strokeStyle = c.fillStyle = tints[i % 5];
          if (i % 3 === 0) { starPath(c, x, y, r, random()); c.stroke(); }
          else if (i % 3 === 1) { heartPath(c, x, y, r * 0.8); c.stroke(); }
          else { c.beginPath(); c.moveTo(x - r, y); c.bezierCurveTo(x - r / 2, y - r, x + r / 2, y + r, x + r, y); c.stroke(); }
        }
      } else if (a.style === 'showa') {
        c.fillStyle = '#b8505a';
        for (let y = 0; y < h * 0.6; y += px * 0.55) for (let x = (Math.round(y / (px * 0.55)) % 2) * px * 0.3; x < w; x += px * 0.6) {
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + px * 0.16, y + px * 0.2, x, y + px * 0.4); c.quadraticCurveTo(x - px * 0.16, y + px * 0.2, x, y); c.fill();
        }
        c.fillStyle = '#6a4428'; c.fillRect(0, h * 0.6, w, h * 0.4);
        for (let x = 0; x < w; x += px * 0.5) { c.fillStyle = ['#74492c', '#5e3c22', '#6a4428'][Math.floor(random() * 3)]; c.fillRect(x, h * 0.62, px * 0.5 - 3, h * 0.38); }
        c.fillStyle = '#d8b04a'; c.fillRect(0, h * 0.595, w, 6);
      } else if (a.style === 'space') {
        const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#4a3a9a'); g.addColorStop(1, '#3a6ab0'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        for (let i = 0; i < span * 14; i++) { c.fillStyle = ['#ffffff', '#fff27a', '#ffb0e0'][i % 3]; const r = 1.5 + random() * 3; c.beginPath(); c.arc(random() * w, random() * h, r, 0, 7); c.fill(); }
        for (let i = 0; i < Math.max(2, span / 4); i++) {
          const x = (0.12 + random() * 0.76) * w, y = (0.25 + random() * 0.5) * h, r = (0.3 + random() * 0.4) * px;
          c.fillStyle = ['#ff9a5a', '#7af0d0', '#ff7ac8', '#f0e08a'][i % 4]; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
          c.fillStyle = 'rgba(40,20,80,0.25)'; c.beginPath(); c.arc(x + r * 0.25, y + r * 0.2, r * 0.8, 0, 7); c.fill();
          if (i % 2 === 0) { c.strokeStyle = '#fff27a'; c.lineWidth = 5; c.beginPath(); c.ellipse(x, y, r * 1.7, r * 0.4, -0.35, 0, 7); c.stroke(); }
        }
      } else {
        for (let i = 0; i < 12 + age * 20; i++) { c.fillStyle = `rgba(150,120,60,${0.08 + random() * 0.12})`; const x = random() * w; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 20 + random() * 60, 0); c.lineTo(x + random() * 30, h * (0.2 + random() * 0.5)); c.fill(); }
        c.fillStyle = '#b8ae90'; c.fillRect(0, h * 0.8, w, 5);
      }
      if (!back) {
        // Posters toward the front end of the side wall.
        const poster = (x: number, y: number, pw: number, ph: number, top: string, body: string, big: string, small: string) => {
          c.save(); c.translate(x * px, h - y * px); c.rotate((random() - 0.5) * 0.06);
          c.fillStyle = body; c.fillRect(0, -ph * px, pw * px, ph * px);
          c.fillStyle = top; c.fillRect(0, -ph * px, pw * px, ph * px * 0.38);
          c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold ${ph * px * 0.22}px sans-serif`;
          c.fillText(big, pw * px / 2, -ph * px * 0.8, pw * px * 0.9);
          c.fillStyle = top; c.font = `bold ${ph * px * 0.26}px sans-serif`; c.fillText(small, pw * px / 2, -ph * px * 0.33, pw * px * 0.9);
          c.restore();
        };
        poster(0.9, 2.2, 1.3, 1.8, '#d8201c', '#fff3c4', 'ALL YOU CAN', 'DRINK');
        if (a.size !== 'solo') poster(2.6, 2.5, 1.1, 1.5, '#2a5ac8', '#eaf2ff', 'FREE TIME', '¥980');
        if (a.style === 'budget') { c.fillStyle = style.wall; c.beginPath(); c.moveTo(0.9 * px, h - 4.0 * px); c.lineTo(1.5 * px, h - 4.0 * px); c.lineTo(0.9 * px, h - 3.3 * px); c.fill(); }
      }
      for (let i = 0; i < age * 22; i++) { c.fillStyle = `rgba(50,35,30,${0.04 + random() * 0.1})`; c.beginPath(); c.ellipse(random() * w, random() * h, 10 + random() * 50, 8 + random() * 30, 0, 0, 7); c.fill(); }
    };
    const shell = flat(new THREE.Color(style.wall).multiplyScalar(0.8));
    s.box([W + 0.3, H, 0.3], [-0.15, H / 2, Z0 - 0.15], shell);
    s.box([0.3, H, D], [X0 - 0.15, H / 2, 0], shell);
    const backFace = s.mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: paint(1024, 420, (c, w, h) => wallArt(c, w, h, W, true)), roughness: 0.85 }), [0, H / 2, Z0 + 0.005]);
    backFace.castShadow = false;
    const sideFace = s.mesh(new THREE.PlaneGeometry(D, H), new THREE.MeshStandardMaterial({ map: paint(1024, 512, (c, w, h) => wallArt(c, w, h, D, false)), roughness: 0.85 }), [X0 + 0.005, H / 2, 0]);
    sideFace.rotation.y = Math.PI / 2; sideFace.castShadow = false;

    // --- Coving with LED strips, and their wash down the walls.
    const coving = flat(new THREE.Color(style.wall).multiplyScalar(0.92));
    s.box([W, 0.4, 0.7], [0, H - 0.2, Z0 + 0.35], coving);
    s.box([0.7, 0.4, D - 0.7], [X0 + 0.35, H - 0.2, 0.35], coving);
    const rainbow = a.leds === 'rainbow';
    const ledMats = Array.from({ length: 6 }, () => glowMat(ledA, 0.45));
    const seg = 0.62;
    for (let i = 0; i < Math.floor((W - 0.9) / seg); i++) s.box([seg - 0.08, 0.22, 0.1], [X0 + 0.9 + i * seg + seg / 2, H - 0.26, Z0 + 0.73], ledMats[i % 6]).castShadow = false;
    for (let i = 0; i < Math.floor((D - 0.9) / seg); i++) s.box([0.1, 0.22, seg - 0.08], [X0 + 0.73, H - 0.26, Z0 + 0.9 + i * seg + seg / 2], ledMats[(i + 3) % 6]).castShadow = false;
    const washA = wash(ledA, 0.62, fadeMap), washB = wash(ledB, 0.62, fadeMap);
    s.mesh(new THREE.PlaneGeometry(W - 0.7, 2.4), washA, [0.35, H - 1.6, Z0 + 0.012]).castShadow = false;
    const sideWash = s.mesh(new THREE.PlaneGeometry(D - 0.7, 2.4), washB, [X0 + 0.012, H - 1.6, 0.35]);
    sideWash.rotation.y = Math.PI / 2; sideWash.castShadow = false;

    // --- Banquette: side wall run and a return along the back wall.
    const profile = new THREE.Shape();
    profile.moveTo(0, 0.14); profile.lineTo(0, 0.38); profile.quadraticCurveTo(0, 0.43, 0.05, 0.425);
    profile.lineTo(0.41, 0.42); profile.quadraticCurveTo(0.445, 0.42, 0.45, 0.46);
    profile.lineTo(0.5, 0.88); profile.quadraticCurveTo(0.51, 0.94, 0.56, 0.94);
    profile.lineTo(0.6, 0.94); profile.quadraticCurveTo(0.64, 0.94, 0.64, 0.9); profile.lineTo(0.64, 0.14); profile.closePath();
    const K = 2, BD = 0.64 * K, seatTint = SEATS[a.seats];
    const seatMap = paint(128, 128, (c, w, h) => {
      c.fillStyle = seatTint; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 64) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, y, w, 7); c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillRect(0, y + 9, w, 6); }
      c.strokeStyle = 'rgba(240,240,230,0.5)'; c.lineWidth = 1;
      for (let i = 0; i < age * 18; i++) { let x = random() * w, y = random() * h; c.beginPath(); c.moveTo(x, y); for (let j = 0; j < 3; j++) { x += (random() - 0.5) * 24; y += (random() - 0.5) * 24; c.lineTo(x, y); } c.stroke(); }
    });
    seatMap.wrapS = seatMap.wrapT = THREE.RepeatWrapping;
    const seatMat = new THREE.MeshStandardMaterial({ map: seatMap, roughness: mix(0.3, 0.6, age) });
    const plinth = flat('#3a3440');
    const bench = (len: number) => {
      const g = new THREE.Group();
      const geometry = new THREE.ExtrudeGeometry(profile, { depth: len, bevelEnabled: false, curveSegments: 6 });
      geometry.scale(K, K, 1);
      const body = new THREE.Mesh(geometry, seatMat); body.castShadow = body.receiveShadow = true; g.add(body);
      const base = new THREE.Mesh(new THREE.BoxGeometry(BD - 0.16, 0.28, len - 0.04), plinth); base.position.set(0.16 + (BD - 0.16) / 2, 0.14, len / 2); g.add(base);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, len - 0.1), ledMats[1]); strip.position.set(0.13, 0.2, len / 2); g.add(strip);
      s.root.add(g);
      return g;
    };
    const sideLen = D - 0.9;
    const sideBench = bench(sideLen);
    sideBench.rotation.y = Math.PI; sideBench.position.set(X0 + BD, 0, Z0 + sideLen);
    if (ret > BD + 0.6) { const back = bench(ret); back.rotation.y = Math.PI / 2; back.position.set(X0, -0.006, Z0 + BD); }
    const SEAT_Y = 0.845;

    // --- Lyric screen.
    const fakeLine = (c: Ctx, x: number, y: number, n: number, size: number) => {
      for (let i = 0; i < n; i++) {
        const gx = x + i * size * 1.15;
        c.beginPath();
        for (let k = 0; k < 4; k++) { const u = random() * size, v = random() * size; if (random() < 0.5) { c.moveTo(gx, y + u); c.lineTo(gx + size, y + u); } else { c.moveTo(gx + v, y); c.lineTo(gx + v, y + size); } }
        c.stroke();
      }
    };
    const scoreValue = Math.round(mix(41, 99, mood.cheer));
    const lyricsY = 0.8;
    const screenMap = paint(640, 360, (c, w, h) => {
      const lyric = (text: string, y: number, sung: number, tint: string) => {
        c.font = 'bold 34px sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
        const width = Math.min(c.measureText(text).width, w - 60), x = (w - width) / 2;
        c.lineWidth = 7; c.strokeStyle = '#141428'; c.strokeText(text, x, y, w - 60);
        c.fillStyle = '#ffffff'; c.fillText(text, x, y, w - 60);
        if (sung > 0) { c.save(); c.beginPath(); c.rect(x, y - 24, width * sung, 48); c.clip(); c.strokeStyle = '#ffffff'; c.strokeText(text, x, y, w - 60); c.fillStyle = tint; c.fillText(text, x, y, w - 60); c.restore(); }
      };
      const g = c.createLinearGradient(0, 0, 0, h);
      if (a.screen === 'ballad' || a.screen === 'duet') {
        g.addColorStop(0, '#5a3a9a'); g.addColorStop(0.55, '#ff8a4a'); g.addColorStop(0.56, '#3a4a9a'); g.addColorStop(1, '#22306a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.fillStyle = '#ffe07a'; c.beginPath(); c.arc(w * 0.68, h * 0.5, 46, Math.PI, 0); c.fill();
        c.fillStyle = 'rgba(255,224,122,0.5)'; for (let i = 0; i < 7; i++) c.fillRect(w * 0.68 - 40 + i * 6, h * 0.58 + i * 12, 80 - i * 12, 4);
        if (a.screen === 'ballad') { lyric('EVEN NOW I CALL YOUR NAME', h * 0.72, 1, '#ff5ab0'); lyric('INTO THE EMPTY NIGHT', h * 0.87, 0.45, '#ff5ab0'); }
        else { lyric('I WAITED AT THE STATION', h * 0.72, 1, '#5ab0ff'); lyric('(AND YOU NEVER CAME)', h * 0.87, 0, '#ff5ab0'); c.fillStyle = '#ff5ab0'; heartPath(c, 40, h * 0.87, 12); c.fill(); c.fillStyle = '#5ab0ff'; c.beginPath(); c.arc(40, h * 0.72, 11, 0, 7); c.fill(); }
      } else if (a.screen === 'idol') {
        g.addColorStop(0, '#ff8ac8'); g.addColorStop(1, '#ffe07a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 26; i++) { c.fillStyle = ['#ffffff', '#ff4a9a', '#7af0ff'][i % 3]; if (i % 2) { starPath(c, random() * w, random() * h * 0.62, 8 + random() * 22, random()); } else heartPath(c, random() * w, random() * h * 0.62, 8 + random() * 18); c.fill(); }
        lyric('LOVE LOVE SHOOTING STAR!', h * 0.72, 1, '#ff2f8e'); lyric('CATCH ME IF YOU CAN!!', h * 0.87, 0.6, '#ff2f8e');
      } else if (a.screen === 'enka') {
        g.addColorStop(0, '#5a6a8a'); g.addColorStop(0.6, '#a8b4c8'); g.addColorStop(0.61, '#46587a'); g.addColorStop(1, '#2a3a5a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.fillStyle = '#2a3048'; c.beginPath(); c.moveTo(60, h * 0.6); c.lineTo(110, h * 0.5); c.lineTo(230, h * 0.5); c.lineTo(260, h * 0.6); c.fill(); c.fillRect(150, h * 0.3, 8, h * 0.2);
        c.fillStyle = '#ffffff'; for (let i = 0; i < 90; i++) { c.beginPath(); c.arc(random() * w, random() * h, 1.5 + random() * 2.5, 0, 7); c.fill(); }
        c.lineWidth = 9; c.strokeStyle = '#141428'; fakeLine(c, 110, h * 0.66, 11, 30); fakeLine(c, 170, h * 0.81, 8, 30);
        c.lineWidth = 4; c.strokeStyle = '#ffffff'; fakeLine(c, 110, h * 0.66, 11, 30); c.strokeStyle = '#ffd22e'; fakeLine(c, 170, h * 0.81, 8, 30);
      } else if (a.screen === 'score') {
        g.addColorStop(0, '#2a2a7a'); g.addColorStop(1, '#6a3ab0'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 30; i++) { c.fillStyle = ['#fff27a', '#ff7ac8', '#7af0ff'][i % 3]; starPath(c, random() * w, random() * h, 6 + random() * 16, random()); c.fill(); }
        c.fillStyle = '#fff27a'; c.strokeStyle = '#ff3f8e'; c.lineWidth = 10; c.font = 'bold 190px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.strokeText(String(scoreValue), w / 2, h * 0.48); c.fillText(String(scoreValue), w / 2, h * 0.48);
        c.font = 'bold 40px sans-serif'; c.fillStyle = '#ffffff'; c.fillText(scoreValue > 85 ? 'SUPERSTAR!!' : scoreValue > 60 ? 'NOT BAD!' : 'TRY AGAIN...', w / 2, h * 0.87);
      } else if (a.screen === 'idle') {
        c.fillStyle = '#243a8a'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#ffd22e'; c.font = 'bold 46px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SELECT A SONG', w / 2, 52);
        for (let i = 0; i < 5; i++) { c.fillStyle = i ? '#3a56b8' : '#ff3f8e'; c.fillRect(70, 100 + i * 48, w - 140, 38); c.fillStyle = '#ffffff'; c.font = 'bold 24px sans-serif'; c.textAlign = 'left'; c.fillText(`${i + 1}`, 84, 120 + i * 48); c.fillRect(124, 112 + i * 48, 120 + random() * 220, 12); }
      } else {
        c.fillStyle = '#b81e22'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#ffd22e'; for (let x = -h; x < w; x += 70) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 34, 0); c.lineTo(x + 34 + 40, 40); c.lineTo(x + 40, 40); c.fill(); c.beginPath(); c.moveTo(x, h - 40); c.lineTo(x + 34, h - 40); c.lineTo(x + 74, h); c.lineTo(x + 40, h); c.fill(); }
        c.fillStyle = '#ffffff'; c.font = 'bold 96px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('10 MIN', w / 2, h * 0.4); c.font = 'bold 44px sans-serif'; c.fillText('LEFT · EXTEND? DIAL 9', w / 2, h * 0.7, w - 60);
      }
      if (age > 0.6) { c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, h * mix(0.2, 0.7, random()), w, 5); }
    });
    const screenTint = { ballad: '#ff9a6a', duet: '#ff9a6a', idol: '#ff8ac8', enka: '#a8c0e8', score: '#a06aff', idle: '#5a7aff', timeup: '#ff4a3a' }[a.screen];
    s.box([screenW + 0.28, screenH + 0.28, 0.2], [screenX, screenY, Z0 + 0.1], flat('#1c1c22', 0.4));
    const screenMat = new THREE.MeshStandardMaterial({ color: '#606060', map: screenMap, emissive: '#ffffff', emissiveMap: screenMap, emissiveIntensity: mix(0.55, 0.75, mood.cheer), roughness: 0.3 });
    s.mesh(new THREE.PlaneGeometry(screenW, screenH), screenMat, [screenX, screenY, Z0 + 0.205]).castShadow = false;
    const pool = s.mesh(new THREE.PlaneGeometry(screenW * 1.5, 3.4 * sz), wash(screenTint, 0.42, poolMap), [screenX, 0.012, Z0 + 2.3]);
    pool.rotation.x = -Math.PI / 2; pool.castShadow = false;
    const halo = s.mesh(new THREE.PlaneGeometry(screenW * 1.5, screenH * 1.7), wash(screenTint, 0.3, poolMap), [screenX, screenY, Z0 + 0.015]);
    halo.castShadow = false;
    const lamp = new THREE.PointLight(screenTint, 26, 13, 2);
    lamp.position.set(screenX, screenY - 0.3, Z0 + 1.8);
    s.root.add(lamp);
    // The bouncing ball that follows the lyric.
    const singing = a.screen === 'ballad' || a.screen === 'idol' || a.screen === 'enka' || a.screen === 'duet';
    const ball = s.ball([0.07, 0.07, 0.04], [screenX, screenY, Z0 + 0.24], glowMat('#fff27a', 1.6), 12);
    ball.visible = singing; ball.castShadow = false;
    // Console shelf under the screen: a low cabinet with a tissue box and the remote cradle.
    s.box([screenW * 0.9, 0.9, 1.0], [screenX, 0.45, Z0 + 0.5], flat(a.style === 'showa' ? '#5a3a22' : '#3a3644', 0.6));
    s.box([screenW * 0.9 + 0.08, 0.1, 1.08], [screenX, 0.95, Z0 + 0.52], flat(a.style === 'showa' ? '#74492c' : '#55506a', 0.5));
    for (const x of [-1, 1]) s.box([screenW * 0.4, 0.62, 0.03], [screenX + x * screenW * 0.22, 0.45, Z0 + 1.01], flat('#2a2832', 0.6));
    s.box([0.5, 0.22, 0.28], [screenX - screenW * 0.36, 1.11, Z0 + 0.45], flat('#f0f0f4', 0.7));
    s.box([0.16, 0.1, 0.02], [screenX - screenW * 0.36, 1.26, Z0 + 0.45], flat('#ffffff', 0.9));

    // --- Speakers high on the back wall, and an air conditioner on the side wall.
    const cone = flat('#55555e', 0.5), cab = flat('#26262c', 0.6);
    for (const x of [screenX - screenW / 2 - 0.7, screenX + screenW / 2 + 0.7]) {
      const g = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.15, 0.6), cab); box.castShadow = true; g.add(box);
      for (const [y, r] of [[-0.2, 0.26], [0.33, 0.12]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.6, 0.06, 20), cone); c.rotation.x = Math.PI / 2; c.position.set(0, y, 0.31); g.add(c); }
      g.position.set(x, H - 1.25, Z0 + 0.5); g.rotation.x = 0.28; g.rotation.y = x < screenX ? 0.25 : -0.25;
      s.root.add(g);
    }
    s.box([0.5, 0.62, 2.0], [X0 + 0.26, H - 1.1, Z0 + 2.3 * sz], flat('#eeeef0', 0.5));
    for (let i = 0; i < 4; i++) s.box([0.02, 0.03, 1.8], [X0 + 0.52, H - 1.3 + i * 0.07, Z0 + 2.3 * sz], flat('#b8b8c0'));

    // --- Door in the back wall, with the corridor beyond.
    const DW = 1.9, DH = 4.1;
    const frame = flat('#3a3440', 0.6);
    s.box([DW + 0.3, 0.15, 0.12], [doorX, DH + 0.075, Z0 + 0.06], frame);
    for (const x of [-1, 1]) s.box([0.15, DH, 0.12], [doorX + x * (DW / 2 + 0.075), DH / 2, Z0 + 0.06], frame);
    const swing = a.door === 'closed' ? 0 : a.door === 'ajar' ? 0.5 : 1.45;
    const corridor = new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: '#ffe9b0', emissiveIntensity: 1.1 });
    if (swing > 0) s.mesh(new THREE.PlaneGeometry(DW, DH), corridor, [doorX, DH / 2, Z0 + 0.012]).castShadow = false;
    const hinge = new THREE.Group();
    hinge.position.set(doorX + DW / 2, 0, Z0 + 0.08); hinge.rotation.y = -swing;
    const leafTint = { chain: '#e0567a', noraebang: '#2a2a3a', showa: '#5a3a22', space: '#5a4ab0', budget: '#8a8a7a' }[a.style];
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(DW, DH, 0.1), flat(leafTint, 0.5)); leaf.position.set(-DW / 2, DH / 2, 0); leaf.castShadow = true; hinge.add(leaf);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.3, 0.12), corridor); pane.position.set(-DW / 2 + 0.3, DH * 0.68, 0); hinge.add(pane);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.2), flat('#d8d8de', 0.3)); handle.position.set(-DW + 0.22, DH * 0.48, 0.05); hinge.add(handle);
    const plateMap = paint(128, 64, (c, w, h) => { c.fillStyle = '#fffbe8'; c.fillRect(0, 0, w, h); c.fillStyle = '#22222a'; c.font = 'bold 48px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(101 + Math.floor(random() * 30)), w / 2, h / 2 + 3); });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshStandardMaterial({ map: plateMap, roughness: 0.5 })); plate.position.set(-DW / 2, DH * 0.9, 0.056); hinge.add(plate);
    s.root.add(hinge);
    if (swing > 0) {
      const wedge = new THREE.Shape(); wedge.moveTo(-DW / 2, 0); wedge.lineTo(DW / 2, 0); wedge.lineTo(DW / 2 - 0.3 - swing * 0.6, -4.2 * sz); wedge.lineTo(-DW / 2 - 1.2 - swing, -4.2 * sz); wedge.closePath();
      const spill = s.mesh(new THREE.ShapeGeometry(wedge), new THREE.MeshBasicMaterial({ color: '#ffe9b0', transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }), [doorX, 0.014, Z0 + 0.1]);
      spill.rotation.x = Math.PI / 2; spill.castShadow = false;
    }
    // Wall clock above the banquette return: the hour tells the story.
    const [hour, minute] = { opening: [6, 5], party: [10, 40], 'last-train': [3, 10], aftermath: [5, 2] }[a.hour];
    const clockMap = paint(128, 128, (c) => {
      c.fillStyle = '#fffdf2'; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill(); c.strokeStyle = '#22222a'; c.lineWidth = 7; c.stroke();
      for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; c.fillStyle = '#22222a'; c.beginPath(); c.arc(64 + Math.sin(t) * 48, 64 - Math.cos(t) * 48, i % 3 ? 2.5 : 5, 0, 7); c.fill(); }
      const hand = (t: number, len: number, width: number, tint: string) => { c.strokeStyle = tint; c.lineWidth = width; c.lineCap = 'round'; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.sin(t) * len, 64 - Math.cos(t) * len); c.stroke(); };
      hand(((hour + minute / 60) / 12) * Math.PI * 2, 28, 8, '#22222a'); hand((minute / 60) * Math.PI * 2, 44, 5, '#22222a');
    });
    const clockX = Math.min(X0 + Math.max(ret, 1.8) * 0.5 + 0.4, screenX - screenW / 2 - 1.5);
    const clock = s.mesh(new THREE.CircleGeometry(0.48, 28), new THREE.MeshStandardMaterial({ map: clockMap, roughness: 0.5 }), [Math.max(clockX, X0 + 1.3), 3.55, Z0 + 0.03]);
    clock.castShadow = false;

    // --- Neon on the side wall. Local x runs toward the back of the room, y up.
    const neonTubes: THREE.MeshStandardMaterial[] = [];
    if (a.neon !== 'none') {
      const g = new THREE.Group();
      g.position.set(X0 + 0.1, 3.0, 0.4 * sz + (a.size === 'solo' ? 1.2 : 0.6)); g.rotation.y = Math.PI / 2;
      const tube = (pts: [number, number][], tint: string, closed = false) => {
        const m = glowMat(tint, 1.7); neonTubes.push(m);
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), closed, 'catmullrom', 0.2), pts.length * 10, 0.045, 6, closed), m);
        g.add(mesh);
      };
      const circle = (cx: number, cy: number, rx: number, ry: number): [number, number][] => Array.from({ length: 12 }, (_u, i) => [cx + Math.cos((i / 12) * 6.283) * rx, cy + Math.sin((i / 12) * 6.283) * ry]);
      if (a.neon === 'note') { tube(circle(-0.3, -0.55, 0.3, 0.22), ledA, true); tube([[0, -0.5], [0, 0.75], [0.25, 0.55], [0.5, 0.2], [0.42, -0.05]], ledA); tube([[0.75, 0.6], [0.95, 0.75], [1.0, 0.5]], ledB); }
      else if (a.neon === 'heart') { const pts: [number, number][] = []; for (let i = 0; i < 20; i++) { const t = (i / 20) * 6.283; pts.push([0.05 * 16 * Math.sin(t) ** 3, 0.05 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]); } tube(pts, '#ff3f8e', true); tube(pts.map(([x, y]) => [x * 0.55, y * 0.55 + 0.03]), ledB, true); }
      else if (a.neon === 'star') { const pts: [number, number][] = []; for (let k = 0; k < 10; k++) { const t = (k / 10) * 6.283, r = k % 2 ? 0.38 : 0.9; pts.push([Math.sin(t) * r, Math.cos(t) * r]); } const m = glowMat('#ffe23a', 1.7); neonTubes.push(m); for (let k = 0; k < 10; k++) { const p = pts[k], q = pts[(k + 1) % 10]; const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, Math.hypot(q[0] - p[0], q[1] - p[1]) + 0.04, 6), m); rod.position.set((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, 0); rod.rotation.z = Math.atan2(q[1] - p[1], q[0] - p[0]) + Math.PI / 2; g.add(rod); } }
      else { tube([[-0.7, 0.7], [0.7, 0.7], [0, -0.1], [-0.7, 0.7]], ledA); tube([[0, -0.1], [0, -0.75]], ledA); tube([[-0.4, -0.8], [0.4, -0.8]], ledA); tube(circle(0.45, 0.85, 0.16, 0.16), '#ff5a3a', true); tube([[0.2, 0.45], [0.75, 1.15]], ledB); }
      for (const m of g.children) (m as THREE.Mesh).castShadow = false;
      s.root.add(g);
      const neonWash = s.mesh(new THREE.PlaneGeometry(3.6, 3.2), wash(a.neon === 'star' ? '#ffe23a' : a.neon === 'heart' ? '#ff3f8e' : ledA, 0.3, poolMap), [X0 + 0.02, 3.0, g.position.z]);
      neonWash.rotation.y = Math.PI / 2; neonWash.castShadow = false;
    }

    // --- The hour's dressing.
    const dummy = new THREE.Object3D();
    const strew = (geometry: THREE.BufferGeometry, material: THREE.Material, count: number, place: (i: number) => { at: P; rot: P; scale: P; tint: string }) => {
      if (count < 1) return;
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      for (let i = 0; i < count; i++) {
        const p = place(i);
        dummy.position.set(...p.at); dummy.rotation.set(...p.rot); dummy.scale.set(...p.scale); dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, new THREE.Color(p.tint));
      }
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    };
    const anywhere = (): [number, number] => [mix(X0 + BD + 0.3, X1 - 0.3, random()), mix(Z0 + 1.4, Z1 - 0.3, random())];
    const festive = ['#ff3f8e', '#ffd22e', '#2fd0ff', '#6ae04a', '#ff7a2a', '#a05aff', '#ffffff'];
    const coatTints = ['#2a3040', '#b08a58', '#3a3a44', '#6a7078', '#5a2a2e', '#3a4a3a'];
    const benchZ = (t: number) => mix(Z0 + BD + 0.4, Z0 + sideLen - 0.6, t);
    const coats = (count: number) => {
      for (let i = 0; i < count; i++) {
        const z = benchZ(0.05 + 0.4 * random()), y = SEAT_Y + 0.14 + i * 0.07;
        const coat = s.ball([0.42, 0.14, 0.6 + random() * 0.2], [X0 + 0.62 + (random() - 0.5) * 0.2, y, z], flat(coatTints[i % 6], 0.95), 14);
        coat.rotation.set((random() - 0.5) * 0.3, (random() - 0.5) * 0.8, (random() - 0.5) * 0.3);
        if (i % 2 === 0) s.tube([[X0 + 0.7, y, z + 0.2], [X0 + BD - 0.02, SEAT_Y + 0.04, z + 0.3], [X0 + BD + 0.05, 0.5 + random() * 0.2, z + 0.34]], 0.07, flat(coatTints[i % 6], 0.95));
      }
    };
    const shoes = (pairs: number) => strew(new THREE.SphereGeometry(1, 10, 8), flat('#ffffff', 0.4), pairs * 2, (i) => {
      const pair = Math.floor(i / 2), tidy = a.hour === 'last-train';
      const bx = doorX - 1.6 - pair * 0.55 + (tidy ? 0 : (random() - 0.5) * 0.3), bz = Z0 + 1.55 + (tidy ? 0 : random() * 0.8);
      return { at: [bx + (i % 2) * 0.2, 0.065, bz], rot: [0, tidy ? 0 : random() * 3, 0], scale: [0.085, 0.065, 0.22], tint: ['#1c1c20', '#5a3a22', '#e8e8ec', '#c8262c', '#22346e'][pair % 5] };
    });
    if (a.hour === 'party') {
      const bits = Math.round(mix(120, 420, mood.density));
      strew(new THREE.BoxGeometry(1, 1, 1), flat('#ffffff', 0.6), bits, () => { const [x, z] = anywhere(); return { at: [x, 0.012, z], rot: [0, random() * 3, 0], scale: [0.09, 0.008, 0.06], tint: festive[Math.floor(random() * 7)] }; });
      strew(new THREE.BoxGeometry(1, 1, 1), flat('#ffffff', 0.6), Math.round(bits / 12), () => { const [x, z] = anywhere(); return { at: [x, 0.016, z], rot: [0, random() * 3, 0], scale: [0.9 + random() * 0.8, 0.012, 0.05], tint: festive[Math.floor(random() * 6)] }; });
      const balloons = Math.round(mix(3, 8, mood.density));
      for (let i = 0; i < balloons; i++) {
        const onSeat = i % 3 === 0;
        const tint = festive[i % 6];
        s.ball([0.36, 0.42, 0.36], onSeat ? [X0 + 0.7, SEAT_Y + 0.42, benchZ(0.55 + 0.4 * random())] : [X1 - 0.6 - random() * 0.5, 0.42, mix(-0.5, Z1 - 0.6, random())], new THREE.MeshStandardMaterial({ color: tint, roughness: 0.25, emissive: tint, emissiveIntensity: 0.15 }), 16);
      }
      coats(Math.round(mix(3, 7, mood.density)));
      shoes(Math.round(mix(2, 5, mood.density)));
    } else if (a.hour === 'last-train') {
      coats(1);
      const bag = s.box([0.55, 0.42, 0.24], [X0 + 0.7, SEAT_Y + 0.21, benchZ(0.62)], flat('#2a2a32', 0.5)); bag.rotation.y = 0.3;
      s.ring(0.16, 0.02, [X0 + 0.7, SEAT_Y + 0.44, benchZ(0.62)], flat('#2a2a32', 0.5), Math.PI).rotation.y = Math.PI / 2 + 0.3;
      shoes(1);
      const blanket = s.box([0.9, 0.08, 1.5], [X0 + 0.55, SEAT_Y + 0.05, benchZ(0.3)], flat(mood.warmth > 0.5 ? '#d8a878' : '#8aa0c0', 1)); blanket.rotation.y = 0.08;
    } else if (a.hour === 'aftermath') {
      const cans = Math.round(mix(5, 22, mood.density));
      strew(new THREE.CylinderGeometry(0.075, 0.075, 0.26, 10), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.6, roughness: 0.35 }), cans, () => { const [x, z] = anywhere(); const up = random() < 0.3; return { at: [x, up ? 0.13 : 0.075, z], rot: [up ? 0 : Math.PI / 2, 0, random() * 3], scale: [1, 1, 1], tint: ['#d8dce0', '#e8c22a', '#3a9a5a', '#d8362c', '#3a6ad8'][Math.floor(random() * 5)] }; });
      strew(new THREE.IcosahedronGeometry(1, 0), flat('#ffffff', 0.95), cans * 2, () => { const [x, z] = anywhere(); return { at: [x, 0.06, z], rot: [random() * 3, random() * 3, 0], scale: [0.08, 0.06, 0.08], tint: '#f4f2ec' }; });
      strew(new THREE.BoxGeometry(1, 1, 1), flat('#ffffff', 0.6), Math.round(mix(30, 140, mood.density)), () => { const [x, z] = anywhere(); return { at: [x, 0.012, z], rot: [0, random() * 3, 0], scale: [0.09, 0.008, 0.06], tint: festive[Math.floor(random() * 7)] }; });
      const bx = X1 - 0.8, bz = mix(Z0 + 2.2, -0.3, 0.5);
      const sack = s.mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#4a5a8a', roughness: 0.4, flatShading: true }), [bx, 0.5, bz + 1.1]);
      sack.scale.set(0.5, 0.55, 0.5);
      s.mesh(new THREE.ConeGeometry(0.16, 0.3, 8), flat('#4a5a8a', 0.4), [bx, 1.12, bz + 1.1]).rotation.x = Math.PI;
      s.cylinder(0.36, 0.3, 0.62, [bx, 0.31, bz], flat('#ffd22e', 0.5), 18);
      s.cylinder(0.33, 0.33, 0.02, [bx, 0.55, bz], new THREE.MeshStandardMaterial({ color: '#6a8aa0', roughness: 0.1 }), 18);
      s.rod([bx + 0.1, 0.3, bz], [bx + 0.5, 3.0, Z0 + 2.3 > bz - 1.6 ? bz - 0.4 : bz - 0.6], 0.035, flat('#c8a878', 0.6));
      s.box([0.5, 0.12, 0.2], [bx + 0.08, 0.26, bz], flat('#e8e4d8', 1)).rotation.y = 0.4;
      const cushion = s.box([0.8, 0.22, 0.8], [X0 + BD + 0.9, 0.11, benchZ(0.7)], flat(new THREE.Color(seatTint).multiplyScalar(0.8), 0.7)); cushion.rotation.y = 0.5;
    } else {
      // Opening: squared-up cushions and a folded cloth on the seat.
      for (let i = 0; i < 3; i++) { const cushion = s.box([0.24, 0.7, 0.7], [X0 + 0.5, SEAT_Y + 0.38, benchZ(0.12 + i * 0.36)], flat(i % 2 ? '#f0e6d0' : new THREE.Color(ledA).lerp(new THREE.Color('#ffffff'), 0.3), 0.8)); cushion.rotation.z = -0.2; }
      const sign = s.label('CLEANED', 0.9, 0.3, [X0 + BD - 0.3, SEAT_Y + 0.17, benchZ(0.9)], '#2a7a4a', '#fffbe8'); sign.rotation.y = Math.PI / 2 - 0.4; sign.rotation.x = 0;
    }

    // --- Motion: the coving chases, the ball bounces along the lyric, tired tubes flicker.
    const A = new THREE.Color(ledA), B = new THREE.Color(ledB), tmp = new THREE.Color();
    const paintLeds = (time: number) => {
      ledMats.forEach((m, k) => {
        const phase = time * mix(0.25, 2.4, mood.energy) + (k / 6) * Math.PI * 2;
        if (rainbow) tmp.setHSL(((phase / 6.283) % 1 + 1) % 1, 0.95, 0.58); else tmp.copy(A).lerp(B, 0.5 + 0.5 * Math.sin(phase));
        m.color.copy(tmp); m.emissive.copy(tmp);
      });
      if (rainbow) { washA.color.copy(ledMats[0].color); washB.color.copy(ledMats[3].color); }
    };
    paintLeds(0);
    const span = screenW * 0.62, lineY = screenY - screenH * (lyricsY - 0.5) + screenH * 0.12;
    const neonBase = neonTubes.map((m) => m.emissiveIntensity);
    const flicker = random() * 10;
    world.update = (_dt, time) => {
      paintLeds(time);
      if (singing) {
        const t = (time * mix(0.08, 0.3, mood.energy)) % 1;
        ball.position.x = screenX - span / 2 + t * span;
        ball.position.y = lineY + Math.abs(Math.sin(t * Math.PI * 9)) * screenH * 0.07;
      }
      if (age > 0.5 && neonTubes.length) neonTubes[0].emissiveIntensity = neonBase[0] * (Math.sin(time * 31 + flicker) * Math.sin(time * 7.3) > 0.55 ? 0.15 : 1);
    };
    world.update(0, 0);
    return world;
  },
});
