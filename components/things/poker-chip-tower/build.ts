import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Suit = 's' | 'h' | 'd' | 'c';
type Card = readonly [string, Suit];

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

function pip(c: CanvasRenderingContext2D, k: Suit, x: number, y: number, r: number) {
  c.save(); c.translate(x, y);
  c.fillStyle = k === 'h' || k === 'd' ? '#c8102e' : '#16181c';
  c.beginPath();
  if (k === 'd') { c.moveTo(0, -r); c.lineTo(r * 0.75, 0); c.lineTo(0, r); c.lineTo(-r * 0.75, 0); }
  else if (k === 'h') { c.moveTo(0, r); c.bezierCurveTo(-r * 1.6, -r * 0.1, -r * 0.6, -r * 1.4, 0, -r * 0.45); c.bezierCurveTo(r * 0.6, -r * 1.4, r * 1.6, -r * 0.1, 0, r); }
  else if (k === 's') { c.moveTo(0, -r); c.bezierCurveTo(-r * 1.6, r * 0.1, -r * 0.6, r * 1.3, 0, r * 0.4); c.bezierCurveTo(r * 0.6, r * 1.3, r * 1.6, r * 0.1, 0, -r); c.rect(-r * 0.13, r * 0.3, r * 0.26, r * 0.7); }
  else { for (const [dx, dy] of [[0, -0.45], [-0.48, 0.2], [0.48, 0.2]]) { c.moveTo(dx * r + r * 0.44, dy * r); c.arc(dx * r, dy * r, r * 0.44, 0, 7); } c.rect(-r * 0.12, r * 0.1, r * 0.24, r * 0.9); }
  c.fill(); c.restore();
}

function cardFace([rank, suit]: Card) {
  return paint(128, 180, (c) => {
    c.fillStyle = '#fbf8ee'; c.fillRect(0, 0, 128, 180);
    c.strokeStyle = '#b9b3a0'; c.lineWidth = 4; c.strokeRect(2, 2, 124, 176);
    c.fillStyle = suit === 'h' || suit === 'd' ? '#c8102e' : '#16181c';
    c.font = `bold ${rank === '10' ? 58 : 70}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(rank, 38, 44, 68);
    pip(c, suit, 100, 36, 18);
    pip(c, suit, 66, 122, 40);
  });
}

const SCHEMES = {
  classic: 'Classic red, white, blue, green and black clay.',
  highroller: 'High-roller black, purple, gold and burnt orange.',
  macau: 'Macau pastels: pink, jade, pearl and peach with gold.',
  faded: 'Faded old clay: brick, mustard, slate and cream, a kitchen-table game.',
  neon: 'Loud neon plastic: lime, magenta, cyan and yellow, a cheap party set.',
} as const;
const SCHEME: Record<keyof typeof SCHEMES, readonly string[]> = {
  classic: ['#c4162a', '#f2ede0', '#1c4fb0', '#1e8a4a', '#17171b'],
  highroller: ['#17171b', '#6a2a9a', '#d9a520', '#d8621c', '#8a0f1a'],
  macau: ['#f08aa8', '#4fb89a', '#f1eadb', '#f5b58a', '#d9a93a'],
  faded: ['#9a4a3a', '#c9a24a', '#5a6470', '#e6dcc0', '#3f5a45'],
  neon: ['#8ee21c', '#ff2fa8', '#19d3e6', '#ffe01a', '#7a3cff'],
};
const HANDS = {
  royal: 'A royal flush in spades, ten to ace: the unbeatable hand.',
  rockets: 'Pocket aces, two cards, the best start there is.',
  deadman: "The dead man's hand: black aces and eights.",
  quads: 'Four kings and a stray card.',
  rags: 'Seven-deuce offsuit, the worst hand in poker: a bluff.',
  mucked: 'Thrown away face down, nobody will ever know.',
} as const;
const HAND: Record<keyof typeof HANDS, readonly Card[]> = {
  royal: [['10', 's'], ['J', 's'], ['Q', 's'], ['K', 's'], ['A', 's']],
  rockets: [['A', 's'], ['A', 'h']],
  deadman: [['A', 's'], ['A', 'c'], ['8', 's'], ['8', 'c'], ['Q', 'h']],
  quads: [['K', 's'], ['K', 'h'], ['K', 'd'], ['K', 'c'], ['4', 'd']],
  rags: [['7', 'h'], ['2', 'c']],
  mucked: [],
};

export default defineThing({
  questions: {
    fortune: choice('What do the chips say about the player\'s fortunes?', {
      hoard: "A towering winner's hoard, rank on rank of tall stacks.",
      tower: 'One absurd teetering spire stacked as high as it will go, built by restless fingers.',
      allin: 'Everything shoved all-in to the centre, stacks sheared and collapsing over the line.',
      modest: 'A few tidy medium stacks, holding steady.',
      last: 'One last chip, alone where the stacks used to stand.',
    }),
    scheme: choice('What colours are the chips?', SCHEMES),
    denomination: choice('What denomination is printed on the chips?', {
      one: '$1, a friendly game.',
      five: '$5.',
      twentyfive: '$25.',
      hundred: '$100.',
      thousand: '$1,000.',
      plaque: '$25,000, chips most people never touch.',
    }),
    cards: choice('What cards lie face up beside the chips?', HANDS),
    button: choice('What marker sits on the felt?', {
      dealer: 'A white DEALER button.',
      allin: 'A red ALL IN triangle.',
      blind: 'A yellow BIG BLIND button.',
      none: 'No marker.',
    }),
    baize: choice('What colour is the baize?', {
      green: 'Classic card-table green.',
      blue: 'Tournament blue.',
      red: 'Deep casino red.',
      black: 'Black speed-cloth.',
      grey: 'Worn grey felt, a back room.',
    }),
    left: choice('What else has been left on the felt?', {
      nothing: 'Nothing else.',
      dice: 'A pair of red dice.',
      whiskey: 'A tumbler of whiskey.',
      shades: 'A pair of dark sunglasses.',
      roll: 'A fat roll of banknotes in a rubber band.',
      watch: 'A wristwatch taken off and thrown in.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const colours = SCHEME[a.scheme];
    const felt = { green: '#1e7a48', blue: '#1b55ad', red: '#8f1d28', black: '#232529', grey: '#6f746f' }[a.baize];
    const ink = a.baize === 'black' ? '#d9a93a' : '#f4ecc8';
    const value = { one: '1', five: '5', twentyfive: '25', hundred: '100', thousand: '1K', plaque: '25K' }[a.denomination];
    const FW = 0.47, FD = 0.35, T = 0.03, CR = 0.0195, CH = 0.0034;
    const ghosts: [number, number][] = [];

    const chips: { at: THREE.Vector3; turn: THREE.Euler; color: string }[] = [];
    const tops: { x: number; y: number; z: number; color: string; tilt?: THREE.Euler }[] = [];
    const stack = (x: number, z: number, count: number, colour: string, shear: readonly [number, number] = [0, 0], wobble = 0.0005) => {
      let dx = 0, dz = 0;
      for (let i = 0; i < count; i++) {
        dx += shear[0] + (random() - 0.5) * wobble; dz += shear[1] + (random() - 0.5) * wobble;
        chips.push({ at: new THREE.Vector3(x + dx, T + CH * (i + 0.5), z + dz), turn: new THREE.Euler(0, random() * 6, 0), color: colour });
      }
      tops.push({ x: x + dx, y: T + CH * count + 0.0002, z: z + dz, color: colour });
    };
    const topple = (x: number, z: number, count: number, colour: string, heading: number) => {
      const dir = new THREE.Vector3(Math.cos(heading), 0, Math.sin(heading));
      for (let i = 0; i < count; i++) {
        const phi = mix(1.0, 1.38, i / count) + (random() - 0.5) * 0.05;
        const turn = new THREE.Euler(0, -heading, -phi, 'YXZ');
        const at = new THREE.Vector3(x, T + CR * Math.sin(phi) + (CH / 2) * Math.cos(phi), z).addScaledVector(dir, i * 0.0052);
        chips.push({ at, turn, color: colour });
        if (i === 0) tops.push({ x: at.x - dir.x * 0.0018, y: at.y, z: at.z - dir.z * 0.0018, color: colour, tilt: new THREE.Euler(0, -heading, -phi, 'YXZ') });
      }
    };
    const pick = () => colours[Math.floor(random() * colours.length)];
    const busy = mix(0.7, 1.25, mood.density);

    if (a.fortune === 'hoard') {
      const rows = [5, 4, 3];
      rows.forEach((n, row) => { for (let i = 0; i < n; i++) stack(-0.19 + (i + row * 0.5) * 0.043, -0.115 + row * 0.04, Math.round(mix(28, 58, random()) * busy * (1 - row * 0.22)), colours[(i + row) % colours.length]); });
      topple(-0.19, 0.045, 24, colours[0], 0.2 + random() * 0.25);
      for (let i = 0; i < 9; i++) stack(-0.2 + random() * 0.2, 0.08 + random() * 0.06, 1 + Math.floor(random() * 2), pick());
    } else if (a.fortune === 'tower') {
      const lean: [number, number] = [(random() - 0.5) * 0.0005, (random() - 0.5) * 0.0005];
      let dx = 0, dz = 0;
      const height = Math.round(mix(62, 90, random()));
      for (let i = 0; i < height; i++) {
        dx += lean[0] * (i / 20) + (random() - 0.5) * 0.0012; dz += lean[1] * (i / 20) + (random() - 0.5) * 0.0012;
        chips.push({ at: new THREE.Vector3(-0.1 + dx, T + CH * (i + 0.5), -0.05 + dz), turn: new THREE.Euler(0, random() * 6, 0), color: colours[Math.floor(i / 5) % colours.length] });
      }
      tops.push({ x: -0.1 + dx, y: T + CH * height + 0.0002, z: -0.05 + dz, color: colours[Math.floor((height - 1) / 5) % colours.length] });
      for (let i = 0; i < 4; i++) stack(-0.19 + i * 0.045 + (i > 1 ? 0.05 : 0), -0.03 + (i % 2) * 0.05, 4 + Math.floor(random() * 9), pick());
      topple(-0.19, 0.08, 14, colours[1], 0.1 + random() * 0.3);
    } else if (a.fortune === 'allin') {
      for (let i = 0; i < 9; i++) {
        const t = random() * 6.3, r = 0.02 + random() * 0.085;
        stack(-0.05 + Math.cos(t) * r, -0.04 + Math.sin(t) * r * 0.75, Math.round(mix(8, 24, random()) * busy), colours[i % colours.length], [(random() * 0.9 + 0.2) * 0.0011, (random() - 0.6) * 0.0012], 0.001);
      }
      topple(-0.17, 0.0, 20, colours[2], -0.3 + random() * 0.4);
      topple(0.0, 0.045, 16, colours[0], 0.5 + random() * 0.5);
      for (let i = 0; i < 26; i++) stack(-0.16 + random() * 0.3, -0.1 + random() * 0.17, 1, pick());
    } else if (a.fortune === 'modest') {
      const n = 3 + Math.round(random() * 2);
      for (let i = 0; i < n; i++) stack(-0.17 + i * 0.045, -0.06 + (i % 2) * 0.012, Math.round(mix(12, 26, random())), colours[i % colours.length]);
      topple(-0.16, 0.04, 11, colours[1], 0.2 + random() * 0.4);
    } else {
      for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) ghosts.push([-0.19 + i * 0.045, -0.1 + row * 0.045]);
      stack(-0.1, 0.0, 1, colours[0]);
    }

    // Felt mat in a padded rail, with ghost rings where stacks once stood.
    const feltTexture = paint(940, 700, (c) => {
      c.scale(2, 2);
      c.fillStyle = felt; c.fillRect(0, 0, 470, 350);
      for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '0,0,0'},0.04)`; c.fillRect(random() * 470, random() * 350, 1.5, 1.5); }
      for (let i = 0; i < mood.wear * 10; i++) { c.fillStyle = 'rgba(30,20,10,0.16)'; c.beginPath(); c.ellipse(random() * 470, random() * 350, 10 + random() * 30, 8 + random() * 20, random() * 3, 0, 7); c.fill(); }
      c.strokeStyle = ink; c.lineWidth = 3; c.globalAlpha = 0.85;
      c.beginPath(); c.ellipse(235, 600, 440, 500, 0, Math.PI * 1.2, Math.PI * 1.8); c.stroke();
      c.globalAlpha = 0.3; c.lineWidth = 2; c.strokeStyle = '#000';
      for (const [x, z] of ghosts) { c.beginPath(); c.arc((x + FW / 2) * 1000, (z + FD / 2) * 1000, 19.5, 0, 7); c.stroke(); }
    });
    const leather = s.material('#2a1b17', { roughness: 0.7 });
    const rim = s.mesh(new THREE.ExtrudeGeometry(roundRect(FW + 0.04, FD + 0.04, 0.05), { depth: T - 0.014, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 8 }), leather, [0, 0.006, 0]);
    rim.rotation.x = -Math.PI / 2;
    const feltGeometry = new THREE.ShapeGeometry(roundRect(FW, FD, 0.035), 8);
    const uv = feltGeometry.attributes.uv, position = feltGeometry.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (position.getX(i) + FW / 2) / FW, (position.getY(i) + FD / 2) / FD);
    const top = s.mesh(feltGeometry, new THREE.MeshStandardMaterial({ map: feltTexture, roughness: 0.95 }), [0, T, 0]);
    top.rotation.x = -Math.PI / 2; top.castShadow = false;

    // Chips: one instanced mesh; printed faces on every stack top.
    const edge = paint(128, 8, (c) => { c.fillStyle = '#000'; c.fillRect(0, 0, 128, 8); c.fillStyle = '#fff'; for (let i = 0; i < 6; i++) c.fillRect(i * 21.3 + 2, 0, 9, 8); });
    const plain = paint(64, 64, (c) => { c.fillStyle = '#000'; c.fillRect(0, 0, 64, 64); c.translate(32, 32); c.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.fillRect(-5, -32, 10, 9); } });
    const chipMaterial = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.3, roughness: 0.55 });
    if (chips.length) {
      const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(CR, CR, CH, 20), [chipMaterial(edge), chipMaterial(plain), chipMaterial(plain)], chips.length);
      const matrix = new THREE.Matrix4(), colour = new THREE.Color(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
      chips.forEach((chip, i) => { matrix.compose(chip.at, q.setFromEuler(chip.turn), one); mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, colour.set(chip.color)); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    const faces = new Map<string, THREE.Material>();
    const faceFor = (colour: string) => {
      if (!faces.has(colour)) {
        const pale = new THREE.Color(colour).getHSL({ h: 0, s: 0, l: 0 }).l > 0.6;
        faces.set(colour, new THREE.MeshStandardMaterial({ roughness: 0.55, map: paint(128, 128, (c) => {
          c.fillStyle = colour; c.fillRect(0, 0, 128, 128); c.translate(64, 64);
          c.fillStyle = pale ? '#1c4fb0' : '#f6f2e4'; for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); c.fillRect(-9, -64, 18, 15); }
          c.beginPath(); c.arc(0, 0, 40, 0, 7); c.fill();
          c.strokeStyle = colour; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 34, 0, 7); c.stroke();
          c.fillStyle = pale ? '#f6f2e4' : '#17171b'; c.font = `bold ${value.length > 2 ? 30 : value.length > 1 ? 38 : 50}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(value, 0, 3);
        }) }));
      }
      return faces.get(colour)!;
    };
    const faceGeometry = new THREE.CircleGeometry(CR * 0.99, 20).rotateX(-Math.PI / 2);
    for (const face of tops.slice(0, 40)) {
      const mesh = s.mesh(faceGeometry, faceFor(face.color), [face.x, face.y, face.z]);
      mesh.castShadow = false;
      if (face.tilt) { mesh.rotation.copy(face.tilt); mesh.translateY(-CH / 2 - 0.0002); mesh.rotateX(Math.PI); }
      else mesh.rotation.y = random() * 6;
    }

    // Cards: a fan, face up or thrown away.
    const white = new THREE.MeshStandardMaterial({ color: '#f4f1e6', roughness: 0.7 });
    const backTexture = paint(96, 134, (c) => {
      c.fillStyle = '#fbf8ee'; c.fillRect(0, 0, 96, 134);
      c.fillStyle = mood.warmth > 0.5 ? '#a3161f' : '#1a3f8f'; c.fillRect(7, 7, 82, 120);
      c.strokeStyle = '#ffffff55'; c.lineWidth = 2;
      for (let i = -140; i < 140; i += 12) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 134, 134); c.moveTo(i + 134, 0); c.lineTo(i, 134); c.stroke(); }
    });
    const back = new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.6 });
    const cardGeometry = new THREE.BoxGeometry(0.063, 0.0006, 0.088);
    const hand = HAND[a.cards];
    const cx = 0.1, cz = 0.075;
    if (hand.length) {
      hand.forEach((value, k) => {
        const turn = -(k - (hand.length - 1) / 2) * (hand.length > 2 ? 0.26 : 0.34);
        const card = s.mesh(cardGeometry, [white, white, new THREE.MeshStandardMaterial({ map: cardFace(value), roughness: 0.6 }), white, white, white] as unknown as THREE.Material, [cx - Math.sin(turn) * 0.11, T + 0.0006 + k * 0.0007, cz + 0.1 - Math.cos(turn) * 0.11]);
        card.rotation.y = turn;
      });
    } else {
      for (let k = 0; k < 2; k++) {
        const card = s.mesh(cardGeometry, [white, white, back, white, white, white] as unknown as THREE.Material, [cx - 0.02 + k * 0.035, T + 0.0006 + k * 0.0007, cz - 0.02 + k * 0.012]);
        card.rotation.y = 0.5 + k * 0.7 + random() * 0.4;
      }
    }
    // The deck stub.
    s.mesh(new THREE.BoxGeometry(0.063, 0.012 + random() * 0.01, 0.088), [white, white, back, white, white, white] as unknown as THREE.Material, [0.17, T + 0.008, -0.1]).rotation.y = -0.3 + random() * 0.3;

    // Marker button.
    if (a.button !== 'none') {
      const [bx, bz] = [0.045 + random() * 0.03, -0.115 + random() * 0.02];
      if (a.button === 'allin') {
        const tri = new THREE.Shape(); tri.moveTo(-0.04, -0.03); tri.lineTo(0.04, -0.03); tri.lineTo(0, 0.04); tri.closePath();
        const mesh = s.mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.008, bevelEnabled: false }), s.material('#c4162a'), [bx, T, bz]);
        mesh.rotation.x = -Math.PI / 2;
        s.label('ALL IN', 0.045, 0.016, [bx, T + 0.0085, bz + 0.012], '#fbf6e2', '#c4162a').rotation.x = -Math.PI / 2;
      } else {
        const tone = a.button === 'dealer' ? '#f6f2e4' : '#f2c416';
        s.cylinder(0.03, 0.03, 0.009, [bx, T + 0.0045, bz], s.material(tone, { roughness: 0.3 }), 28);
        const text = a.button === 'dealer' ? 'DEALER' : 'BIG BLIND';
        const disc = s.mesh(new THREE.CircleGeometry(0.027, 28), new THREE.MeshStandardMaterial({ roughness: 0.4, map: paint(128, 128, (c) => {
          c.fillStyle = tone; c.fillRect(0, 0, 128, 128); c.strokeStyle = '#17171b'; c.lineWidth = 4; c.beginPath(); c.arc(64, 64, 56, 0, 7); c.stroke();
          c.fillStyle = '#17171b'; c.font = 'bold 26px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 64, 66, 100);
        }) }), [bx, T + 0.0092, bz]);
        disc.rotation.x = -Math.PI / 2; disc.rotation.z = (random() - 0.5) * 0.8; disc.castShadow = false;
      }
    }

    // Left on the felt.
    const lx = 0.155, lz = -0.005;
    if (a.left === 'dice') {
      const dieTexture = paint(64, 64, (c) => { c.fillStyle = '#c4162a'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#fff'; for (const [x, y] of [[16, 16], [48, 48], [32, 32], [16, 48], [48, 16]]) { c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); } });
      for (let k = 0; k < 2; k++) s.mesh(new THREE.BoxGeometry(0.016, 0.016, 0.016), new THREE.MeshStandardMaterial({ map: dieTexture, roughness: 0.2 }), [lx + k * 0.03, T + 0.008, lz + k * 0.018 - 0.02]).rotation.y = random() * 3;
    } else if (a.left === 'whiskey') {
      s.cylinder(0.038, 0.033, 0.085, [lx + 0.02, T + 0.0425, lz - 0.03], new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }), 20);
      s.cylinder(0.034, 0.031, 0.03, [lx + 0.02, T + 0.02, lz - 0.03], s.material('#b5651d', { roughness: 0.15, emissive: '#6a3408', emissiveIntensity: 0.8 }), 20);
      s.cylinder(0.036, 0.034, 0.006, [lx + 0.02, T + 0.003, lz - 0.03], s.material('#dfe6ea', { roughness: 0.1 }), 20);
    } else if (a.left === 'shades') {
      const lens = s.material('#101114', { roughness: 0.08, metalness: 0.6 });
      for (const side of [-1, 1]) {
        s.cylinder(0.024, 0.024, 0.004, [lx + side * 0.028, T + 0.02, lz], lens, 18).rotation.x = Math.PI / 2 - 0.25;
        s.rod([lx + side * 0.052, T + 0.022, lz], [lx + side * 0.056, T + 0.004, lz - 0.11], 0.0022, lens);
      }
      s.rod([lx - 0.008, T + 0.026, lz], [lx + 0.008, T + 0.026, lz], 0.0025, lens);
    } else if (a.left === 'roll') {
      const roll = s.cylinder(0.022, 0.022, 0.07, [lx, T + 0.022, lz], s.material('#8fb58a', { roughness: 0.9 }), 16);
      roll.rotation.set(Math.PI / 2, 0, 0.4, 'YXZ'); roll.rotation.y = 0.6;
      const bandMesh = s.cylinder(0.0228, 0.0228, 0.006, [lx, T + 0.022, lz], s.material('#c4162a'), 16);
      bandMesh.rotation.copy(roll.rotation);
    } else if (a.left === 'watch') {
      const gold = s.material('#f0c040', { metalness: 1, roughness: 0.2, emissive: '#6a4a08', emissiveIntensity: 0.5 });
      const strap = s.ring(0.026, 0.006, [lx, T + 0.012, lz], gold); strap.rotation.y = 0.4; strap.scale.set(1, 0.75, 1.7);
      s.cylinder(0.021, 0.021, 0.008, [lx, T + 0.033, lz], gold, 20);
      s.cylinder(0.017, 0.017, 0.0085, [lx, T + 0.0335, lz], s.material('#fbf8ee', { roughness: 0.3 }), 20);
    }
    return s.finish();
  },
});
