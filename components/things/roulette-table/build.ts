import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const RED = '#c4162a', BLACK = '#17171b', ZERO = '#178a45';
const pocket = (n: number) => (n === 0 ? ZERO : REDS.has(n) ? RED : BLACK);

const BAIZE = {
  green: 'Classic billiard green.',
  blue: 'Royal blue, a modern Vegas floor.',
  burgundy: 'Deep burgundy red, an old European salon.',
  purple: 'Plum purple, a high-limit room.',
  black: 'Black felt with gold lines, a private club.',
  teal: 'Faded teal, a seaside casino past its best.',
} as const;
const FELT: Record<keyof typeof BAIZE, string> = { green: '#1f7a46', blue: '#1d4fa3', burgundy: '#7d1f2c', purple: '#5a2a78', black: '#22242a', teal: '#2f8580' };

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function roundRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

// Layout geometry in table metres: x along the table, z toward the players.
const W = 2.6, DP = 1.3, GX = -0.15, CW = 0.105, GZ = -0.2, RH = 0.14;
const spot = (n: number): [number, number] => n === 0 ? [GX - 0.06, GZ + RH * 1.5] : [GX + (Math.floor((n - 1) / 3) + 0.5) * CW, GZ + (2 - ((n - 1) % 3) + 0.5) * RH];

export default defineThing({
  questions: {
    ball: choice('Where is the ball?', {
      spinning: 'Still racing round the rim, nothing decided.',
      zero: 'Settled in green zero: the house takes everything.',
      red: 'Resting in a red pocket.',
      black: 'Resting in a black pocket.',
      escaped: 'Jumped the rim and lying out on the baize, a no-spin.',
    }),
    bets: choice('How are the chips bet?', {
      reckless: 'One tall reckless stack on a single number, everything on it.',
      spread: 'Spread thin, small bets dotted across numbers, lines and corners.',
      outside: 'Cautious fat stacks on red, black and the dozens.',
      raked: 'The spin is over: the rake is dragging a heap of losing chips away.',
      cleared: 'Cleared away, bare baize waiting for the next bets.',
    }),
    baize: choice('What colour is the baize?', BAIZE),
    wood: choice('What is the table built from?', {
      mahogany: 'Red-brown mahogany with brass trim, Monte Carlo.',
      lacquer: 'Black lacquer with gold trim, Macau high-limit.',
      oak: 'Pale honey oak, a provincial casino or a cruise ship.',
      walnut: 'Dark walnut, worn smooth, a private gaming room.',
    }),
    seats: choice('Who is seated at it?', {
      empty: 'No stools at all, a standing table.',
      one: 'A single stool, one player alone against the wheel.',
      full: 'A row of stools along the players\' side.',
      pushed: 'Stools left askew, one tipped back, everyone just walked away.',
    }),
    left: choice('What has been left on the table?', {
      nothing: 'Nothing but the game.',
      drink: 'A cocktail on the rail with a slice of lime.',
      keys: 'A set of car keys thrown onto the layout as a bet.',
      cigar: 'A glass ashtray with a cigar burning down.',
      cash: 'A fan of banknotes dropped on the baize, waiting to be changed.',
    }),
    float: choice('How big is the croupier\'s chip float?', {
      thin: 'A few short stacks; the house is being cleaned out.',
      normal: 'Tidy ranks of stacks by the wheel.',
      heavy: 'A wall of chips, the house is winning tonight.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const T = 0.9;
    const felt = FELT[a.baize];
    const line = a.baize === 'black' ? '#e3b94f' : '#f2ead0';
    const woodColour = { mahogany: '#6d2f1c', lacquer: '#17161a', oak: '#b98a4e', walnut: '#40281a' }[a.wood];
    const wood = s.material(woodColour, { roughness: a.wood === 'lacquer' ? 0.25 : 0.5 });
    const trim = s.material(a.wood === 'lacquer' || a.wood === 'mahogany' ? '#d9a93a' : '#c9ccd0', { metalness: 0.9, roughness: 0.25 });
    const chrome = s.material('#e3e6e8', { metalness: 0.95, roughness: 0.2 });
    const leather = s.material(a.wood === 'oak' ? '#3d2a20' : a.wood === 'lacquer' ? '#7a1622' : '#2a1a16', { roughness: 0.75 });

    // Baize with the painted layout.
    const PX = 420;
    const baizeTexture = paint(Math.round(W * PX), Math.round(DP * PX), (c) => {
      const X = (x: number) => (x + W / 2) * PX, Z = (z: number) => (z + DP / 2) * PX;
      c.fillStyle = felt; c.fillRect(0, 0, W * PX, DP * PX);
      for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '0,0,0'},0.035)`; c.fillRect(random() * W * PX, random() * DP * PX, 3, 3); }
      for (let i = 0; i < mood.wear * 14; i++) { c.fillStyle = 'rgba(30,20,10,0.16)'; c.beginPath(); c.ellipse(random() * W * PX, random() * DP * PX, 20 + random() * 50, 12 + random() * 30, random() * 3, 0, 7); c.fill(); }
      c.strokeStyle = line; c.lineWidth = 4; c.textAlign = 'center'; c.textBaseline = 'middle';
      const cell = (x: number, z: number, w: number, h: number, text: string, fill: string | null, size = 30) => {
        if (fill) { c.fillStyle = fill; c.fillRect(X(x), Z(z), w * PX, h * PX); }
        c.strokeRect(X(x), Z(z), w * PX, h * PX);
        c.fillStyle = line; c.font = `bold ${size}px serif`;
        c.save(); c.translate(X(x + w / 2), Z(z + h / 2));
        if (text.length <= 2 && fill) c.rotate(-Math.PI / 2);
        c.fillText(text, 0, 2, Math.max(w, h) * PX - 10); c.restore();
      };
      for (let n = 1; n <= 36; n++) { const [x, z] = spot(n); cell(x - CW / 2, z - RH / 2, CW, RH, String(n), pocket(n), 32); }
      // Zero: a rounded green nose toward the wheel.
      c.fillStyle = ZERO; c.beginPath(); c.moveTo(X(GX), Z(GZ)); c.lineTo(X(GX - 0.07), Z(GZ)); c.quadraticCurveTo(X(GX - 0.15), Z(GZ + RH * 1.5), X(GX - 0.07), Z(GZ + RH * 3)); c.lineTo(X(GX), Z(GZ + RH * 3)); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = line; c.font = 'bold 40px serif'; c.fillText('0', X(GX - 0.06), Z(GZ + RH * 1.5));
      for (let r = 0; r < 3; r++) cell(GX + CW * 12, GZ + r * RH, 0.1, RH, '2-1', null, 22);
      ['1st 12', '2nd 12', '3rd 12'].forEach((t, i) => cell(GX + i * CW * 4, GZ + RH * 3, CW * 4, 0.12, t, null, 30));
      ['1-18', 'EVEN', '', '', 'ODD', '19-36'].forEach((t, i) => cell(GX + i * CW * 2, GZ + RH * 3 + 0.12, CW * 2, 0.12, t, null, 26));
      [RED, BLACK].forEach((colour, i) => {
        const cx = X(GX + (2.5 + i) * CW * 2 - CW), cz = Z(GZ + RH * 3 + 0.18);
        c.fillStyle = colour; c.beginPath(); c.moveTo(cx - 34, cz); c.lineTo(cx, cz - 17); c.lineTo(cx + 34, cz); c.lineTo(cx, cz + 17); c.closePath(); c.fill(); c.stroke();
      });
    });
    const tableShape = roundRect(W + 0.22, DP + 0.22, 0.3);
    const slab = s.mesh(new THREE.ExtrudeGeometry(tableShape, { depth: 0.11, bevelEnabled: false, curveSegments: 10 }), wood, [0, T - 0.115, 0]);
    slab.rotation.x = -Math.PI / 2;
    const baizeGeometry = new THREE.ShapeGeometry(roundRect(W, DP, 0.22), 10);
    const uv = baizeGeometry.attributes.uv, position = baizeGeometry.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (position.getX(i) + W / 2) / W, (position.getY(i) + DP / 2) / DP);
    const baize = s.mesh(baizeGeometry, new THREE.MeshStandardMaterial({ map: baizeTexture, roughness: 0.95 }), [0, T, 0]);
    baize.rotation.x = -Math.PI / 2; baize.castShadow = false;
    const railPoints = roundRect(W + 0.1, DP + 0.1, 0.26).getPoints(6).map((p) => [p.x, T + 0.012, -p.y] as const);
    railPoints.pop();
    s.tube(railPoints, 0.05, leather, true);
    const skirt = s.mesh(new THREE.ExtrudeGeometry(roundRect(W - 0.1, DP - 0.1, 0.2), { depth: 0.2, bevelEnabled: false, curveSegments: 8 }), wood, [0, T - 0.31, 0]);
    skirt.rotation.x = -Math.PI / 2;
    const trimBand = s.mesh(new THREE.ExtrudeGeometry(roundRect(W - 0.08, DP - 0.08, 0.21), { depth: 0.025, bevelEnabled: false, curveSegments: 8 }), trim, [0, T - 0.33, 0]);
    trimBand.rotation.x = -Math.PI / 2;
    // Two turned pedestals on spreading feet.
    for (const x of [-0.8, 0.8]) {
      s.lathe([[0.3, 0], [0.32, 0.03], [0.22, 0.09], [0.11, 0.16], [0.09, 0.3], [0.14, 0.42], [0.1, 0.52], [0.16, 0.6]], wood, [x, 0, 0]);
      s.ring(0.115, 0.014, [x, 0.17, 0], trim).rotation.x = Math.PI / 2;
      s.box([0.9, 0.05, 0.12], [x, 0.03, 0], wood).rotation.y = Math.PI / 2;
    }
    s.rod([-0.8, 0.12, 0], [0.8, 0.12, 0], 0.03, wood);

    // The wheel: wooden bowl, sloped ball track, turning rotor and turret.
    const WX = -0.84;
    s.lathe([[0.27, 0.012], [0.3, 0.02], [0.355, 0.075], [0.375, 0.085], [0.395, 0.07], [0.4, 0], [0.27, 0]], wood, [WX, T, 0]);
    s.ring(0.385, 0.008, [WX, T + 0.082, 0], trim).rotation.x = Math.PI / 2;
    const rotorTexture = paint(512, 512, (c) => {
      c.translate(256, 256);
      const step = (Math.PI * 2) / 37;
      ORDER.forEach((n, i) => {
        const from = (i - 0.5) * step, to = (i + 0.5) * step;
        c.fillStyle = pocket(n); c.beginPath(); c.arc(0, 0, 254, from, to); c.arc(0, 0, 130, to, from, true); c.closePath(); c.fill();
        c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.arc(0, 0, 186, from, to); c.arc(0, 0, 130, to, from, true); c.closePath(); c.fill();
        c.strokeStyle = '#e8c56a'; c.lineWidth = 3; c.beginPath(); c.moveTo(Math.cos(from) * 130, Math.sin(from) * 130); c.lineTo(Math.cos(from) * 254, Math.sin(from) * 254); c.stroke();
        c.save(); c.rotate(i * step); c.translate(221, 0); c.rotate(Math.PI / 2);
        c.fillStyle = '#fff8e6'; c.font = 'bold 27px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), 0, 1); c.restore();
      });
      c.strokeStyle = '#e8c56a'; c.lineWidth = 4; for (const r of [130, 186, 252]) { c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); }
      c.fillStyle = woodColour; c.beginPath(); c.arc(0, 0, 128, 0, 7); c.fill();
    });
    const rotor = new THREE.Group();
    rotor.position.set(WX, T + 0.014, 0);
    s.root.add(rotor);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.272, 48), new THREE.MeshStandardMaterial({ map: rotorTexture, roughness: 0.45 }));
    disc.rotation.x = -Math.PI / 2; disc.receiveShadow = true;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.05, 32), wood);
    cone.position.y = 0.025; cone.castShadow = true;
    const turret = new THREE.Mesh(new THREE.LatheGeometry([[0.05, 0.03], [0.022, 0.06], [0.03, 0.1], [0.015, 0.13], [0.035, 0.15], [0.02, 0.175], [0, 0.18]].map(([x, y]) => new THREE.Vector2(x, y)), 20), trim);
    turret.castShadow = true;
    rotor.add(disc, cone, turret);
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.16, 8), trim);
      arm.rotation.z = Math.PI / 2; arm.rotation.y = (i * Math.PI) / 2; arm.position.y = 0.105;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), trim);
      knob.position.set(Math.cos((i * Math.PI) / 2) * 0.08, 0.105, Math.sin((i * Math.PI) / 2) * 0.08);
      rotor.add(arm, knob);
    }
    s.scatter(new THREE.OctahedronGeometry(0.016), trim, Array.from({ length: 8 }, (_u, i) => ({ at: [WX + Math.cos(i * 0.785 + 0.3) * 0.325, T + 0.052, Math.sin(i * 0.785 + 0.3) * 0.325] as const, size: 1 })));

    // The ball, and the number it landed on.
    const ivory = s.material('#fbf7ea', { roughness: 0.2 });
    const landed = a.ball === 'zero' ? 0 : a.ball === 'red' ? [...REDS][Math.floor(random() * 18)] : a.ball === 'black' ? ORDER.filter((n) => n && !REDS.has(n))[Math.floor(random() * 18)] : -1;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.016, 14, 10), ivory);
    ball.castShadow = true;
    const orbit = new THREE.Group();
    orbit.position.set(WX, T, 0);
    if (landed >= 0) {
      const angle = (ORDER.indexOf(landed) * Math.PI * 2) / 37;
      ball.position.set(Math.cos(angle) * 0.165, 0.016, Math.sin(angle) * 0.165);
      rotor.add(ball);
    } else if (a.ball === 'spinning') {
      ball.position.set(0.345, 0.082, 0);
      orbit.rotation.y = random() * 6;
      orbit.add(ball); s.root.add(orbit);
    } else {
      ball.position.set(GX + 0.3 + random() * 0.6, T + 0.016, GZ - 0.12 - random() * 0.1);
      s.root.add(ball);
    }
    rotor.rotation.y = random() * 6;

    // Chips: one instanced mesh, striped edges and inlaid faces from emissive maps.
    const edge = paint(128, 8, (c) => { c.fillStyle = '#000'; c.fillRect(0, 0, 128, 8); c.fillStyle = '#fff'; for (let i = 0; i < 6; i++) c.fillRect(i * 21.3 + 2, 0, 9, 8); });
    const face = paint(64, 64, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, 64, 64); c.translate(32, 32); c.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.fillRect(-5, -32, 10, 9); }
      c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 17, 0, 7); c.stroke();
    });
    const chipMaterial = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.32, roughness: 0.55 });
    const CR = 0.026, CH = 0.0075;
    const chips: { at: [number, number, number]; size: number; color: string }[] = [];
    const COLOURS = ['#c4162a', '#1c4fb0', '#1e8a4a', '#17171b', '#7a2e9a', '#e8a01c', '#e86a9a', '#f2ede0'];
    const stack = (x: number, z: number, count: number, colour: string, wobble = 0.004) => {
      let dx = 0, dz = 0;
      for (let i = 0; i < count; i++) { dx += (random() - 0.5) * wobble; dz += (random() - 0.5) * wobble; chips.push({ at: [x + dx, T + CH * (i + 0.5), z + dz], size: 1, color: colour }); }
    };
    const anywhere = (): [number, number] => {
      const roll = random();
      if (roll < 0.6) { const [x, z] = spot(Math.floor(random() * 37)); return [x + (random() < 0.3 ? CW / 2 : 0), z + (random() < 0.3 ? RH / 2 : 0)]; }
      if (roll < 0.8) return [GX + (Math.floor(random() * 3) + 0.5) * CW * 4, GZ + RH * 3 + 0.06];
      return [GX + (Math.floor(random() * 6) + 0.5) * CW * 2, GZ + RH * 3 + 0.18];
    };
    const busy = mix(0.6, 1.5, mood.density);
    let rakeFrom: [number, number] = [0.25, -0.5], rakeTo: [number, number] = [1.05, -0.42];
    if (a.bets === 'reckless') {
      const n = landed > 0 && random() < 0.5 ? landed : 1 + Math.floor(random() * 36);
      const [x, z] = spot(n), colour = COLOURS[Math.floor(random() * 6)];
      stack(x, z, Math.round(mix(26, 40, random())), colour, 0.003);
    } else if (a.bets === 'spread') {
      const mine = COLOURS[Math.floor(random() * 8)];
      for (let i = 0; i < Math.round(20 * busy); i++) { const [x, z] = anywhere(); stack(x, z, 1 + Math.floor(random() * 4), random() < 0.5 ? mine : COLOURS[Math.floor(random() * 8)]); }
    } else if (a.bets === 'outside') {
      for (const i of [2, 3]) if (i === 2 || random() < 0.7) stack(GX + (i + 0.5) * CW * 2, GZ + RH * 3 + 0.18, Math.round(mix(10, 22, random())), COLOURS[i]);
      for (let i = 0; i < 3; i++) if (random() < 0.6 * busy) stack(GX + (i + 0.5) * CW * 4, GZ + RH * 3 + 0.06, Math.round(mix(6, 16, random())), COLOURS[Math.floor(random() * 8)]);
      stack(GX + (random() < 0.5 ? 0.5 : 5.5) * CW * 2, GZ + RH * 3 + 0.18, Math.round(mix(4, 12, random())), COLOURS[5]);
    } else if (a.bets === 'raked') {
      const hx = 0.35 + random() * 0.4, hz = GZ + 0.05 + random() * 0.1;
      for (let i = 0; i < Math.round(60 * busy); i++) {
        const r = Math.sqrt(random()) * 0.17, t = random() * 6.3;
        chips.push({ at: [hx + Math.cos(t) * r, T + CH * (0.5 + Math.floor(random() * 3 * (1 - r / 0.17))) , hz + Math.sin(t) * r * 0.7], size: 1, color: COLOURS[Math.floor(random() * 8)] });
      }
      for (let i = 0; i < 6; i++) { const [x, z] = anywhere(); stack(x, z, 1, COLOURS[Math.floor(random() * 8)]); }
      rakeFrom = [hx - 0.75, -0.6]; rakeTo = [hx + 0.2, hz + 0.02];
    }
    // The croupier's float, ranked behind the layout.
    const columns = { thin: 3, normal: 8, heavy: 12 }[a.float];
    for (let i = 0; i < columns; i++) for (let row = 0; row < (a.float === 'heavy' ? 3 : a.float === 'normal' ? 2 : 1); row++) {
      stack(-0.28 + i * 0.062, -0.5 + row * 0.06 - (a.float === 'heavy' ? 0.04 : 0), a.float === 'thin' ? 3 + Math.floor(random() * 6) : 20, COLOURS[i % 8], 0.0015);
    }
    if (chips.length) {
      const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(CR, CR, CH, 18), [chipMaterial(edge), chipMaterial(face), chipMaterial(face)], chips.length);
      const matrix = new THREE.Matrix4(), colour = new THREE.Color();
      chips.forEach((chip, i) => { matrix.makeRotationY(random() * 6).setPosition(...chip.at); mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, colour.set(chip.color)); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    // The marker dolly on the winning number.
    if (landed >= 0) {
      const [x, z] = spot(landed);
      const glass = s.material('#f4efe2', { roughness: 0.15, metalness: 0.2 });
      const lift = chips.filter((chip) => Math.hypot(chip.at[0] - x, chip.at[2] - z) < 0.02).length * CH;
      s.lathe([[0.026, 0], [0.028, 0.008], [0.012, 0.03], [0.009, 0.055], [0.017, 0.07], [0.012, 0.082], [0, 0.085]], glass, [x, T + lift, z]);
    }
    // The rake.
    const stick = s.material('#2b1c12', { roughness: 0.5 });
    s.rod([rakeFrom[0], T + 0.03, rakeFrom[1]], [rakeTo[0], T + 0.012, rakeTo[1]], 0.009, stick);
    const head = s.box([0.035, 0.012, 0.22], [rakeTo[0], T + 0.009, rakeTo[1]], stick);
    head.rotation.y = -Math.atan2(rakeTo[1] - rakeFrom[1], rakeTo[0] - rakeFrom[0]);

    // What was left behind.
    if (a.left === 'drink') {
      const x = 0.3 + random() * 0.7, z = DP / 2 + 0.03;
      const clear = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false });
      s.cylinder(0.035, 0.03, 0.1, [x, T + 0.115, z], clear, 16);
      s.cylinder(0.031, 0.027, 0.065, [x, T + 0.1, z], s.material(mood.cheer > 0.5 ? '#f08a2c' : '#a8571c', { roughness: 0.2, emissive: '#5a2a08' }), 16);
      s.cylinder(0.022, 0.022, 0.006, [x + 0.03, T + 0.165, z], s.material('#9bd13a'), 14).rotation.z = 1.2;
      s.rod([x - 0.01, T + 0.08, z], [x - 0.03, T + 0.2, z + 0.01], 0.003, s.material('#d3122a'));
    } else if (a.left === 'keys') {
      const [x, z] = spot(1 + Math.floor(random() * 36));
      s.ring(0.022, 0.003, [x, T + 0.004, z], chrome).rotation.x = Math.PI / 2;
      s.box([0.04, 0.012, 0.06], [x + 0.04, T + 0.007, z + 0.03], s.material('#16181c')).rotation.y = 0.6;
      for (const t of [0.2, -0.5]) s.box([0.012, 0.004, 0.06], [x - 0.03, T + 0.004, z + 0.03 * Math.sign(t)], chrome).rotation.y = t;
    } else if (a.left === 'cigar') {
      const x = -0.2 + random() * 0.3, z = DP / 2 - 0.1;
      s.cylinder(0.06, 0.05, 0.022, [x, T + 0.011, z], new THREE.MeshPhysicalMaterial({ color: '#cfe0dc', roughness: 0.1, transparent: true, opacity: 0.75 }), 20);
      s.rod([x - 0.02, T + 0.03, z], [x + 0.09, T + 0.035, z + 0.03], 0.009, s.material('#5a3a22'));
      s.ball([0.011, 0.011, 0.011], [x - 0.022, T + 0.03, z - 0.001], s.material('#ff7a2a', { emissive: '#ff5a1a', emissiveIntensity: 1.5 }), 8);
      const smoke = new THREE.MeshStandardMaterial({ color: '#f2f2f2', transparent: true, opacity: 0.18, depthWrite: false });
      s.tube([[x - 0.02, T + 0.04, z], [x - 0.04, T + 0.13, z + 0.01], [x, T + 0.22, z - 0.01], [x - 0.03, T + 0.34, z]], 0.008, smoke).castShadow = false;
    } else if (a.left === 'cash') {
      const note = s.material('#b9d2a4', { roughness: 0.9 });
      for (let i = 0; i < 5; i++) { const bill = s.box([0.16, 0.002, 0.07], [0.95 + i * 0.012, T + 0.003 + i * 0.002, 0.52], note); bill.rotation.y = -0.5 + i * 0.22; }
    }

    // Stools on the players' side.
    const seat = s.material(a.wood === 'lacquer' ? '#7a1622' : '#3a2a22', { roughness: 0.8 });
    const count = { empty: 0, one: 1, full: 4, pushed: 3 }[a.seats];
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.09, 20), seat); pad.position.y = 0.7;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.66, 10), chrome); post.position.y = 0.35;
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.035, 20), chrome); foot.position.y = 0.018;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 24), chrome); ring.rotation.x = Math.PI / 2; ring.position.y = 0.3;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.05), seat); back.position.set(0, 0.93, 0.17);
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.02), chrome); spine.position.set(0, 0.79, 0.19);
      g.add(pad, post, foot, ring, back, spine);
      g.traverse((n) => { n.castShadow = true; });
      const x = count === 1 ? 0.3 + random() * 0.5 : -0.25 + i * (count === 4 ? 0.47 : 0.62);
      g.position.set(x + (random() - 0.5) * 0.06, 0, DP / 2 + 0.42 + random() * 0.05);
      g.rotation.y = (random() - 0.5) * 0.3;
      if (a.seats === 'pushed') {
        g.rotation.y = (random() - 0.5) * 2.4; g.position.z += 0.04 + random() * 0.2;
        if (i === 1) { g.rotation.set(0, random() * 3, Math.PI / 2); g.position.y = 0.2; g.position.z += 0.1; }
      }
      s.root.add(g);
    }

    const speed = mix(0.15, 2.6, mood.energy);
    return s.finish({
      update: (dt) => {
        rotor.rotation.y += dt * speed;
        if (a.ball === 'spinning') orbit.rotation.y -= dt * speed * 2.4;
      },
    });
  },
});
