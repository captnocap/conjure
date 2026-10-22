import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Suit = 's' | 'h' | 'd' | 'c';
type Card = readonly [string, Suit];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS: readonly Suit[] = ['s', 'h', 'd', 'c'];

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
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
  return paint(96, 134, (c) => {
    c.fillStyle = '#fbf8ee'; c.fillRect(0, 0, 96, 134);
    c.strokeStyle = '#b9b3a0'; c.lineWidth = 3; c.strokeRect(1.5, 1.5, 93, 131);
    c.fillStyle = suit === 'h' || suit === 'd' ? '#c8102e' : '#16181c';
    c.font = `bold ${rank === '10' ? 46 : 54}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(rank, 30, 34, 54);
    pip(c, suit, 76, 28, 14);
    pip(c, suit, 50, 92, 30);
  });
}

function halfMoon(r: number, back = 0) {
  const shape = new THREE.Shape();
  shape.moveTo(r, -back);
  shape.absarc(0, 0, r, 0, Math.PI, false);
  shape.lineTo(-r, -back);
  shape.closePath();
  return shape;
}

const BAIZE = {
  green: 'Classic casino green.',
  blue: 'Bright blue, a cruise ship or a new Strip resort.',
  red: 'Rich red, a high-roller pit.',
  black: 'Black felt with gold print, a late-night lounge.',
  tan: 'Sandy tan, a faded desert casino.',
  purple: 'Royal purple, a themed party pit.',
} as const;
const FELT: Record<keyof typeof BAIZE, string> = { green: '#1e7a48', blue: '#1b55ad', red: '#8f1d28', black: '#202227', tan: '#b08a55', purple: '#5b2b7c' };

export default defineThing({
  questions: {
    hand: choice('What hands are showing?', {
      natural: 'A natural 21: an ace and a king in front of the middle seat, a fat payout stacked beside the bet.',
      bust: 'A bust: ten, six and a nine, one card too many, the bet already gone.',
      split: 'A split pair of aces, two bets side by side, waiting on the next cards.',
      double: 'A double down on eleven: six and five, one card dealt sideways, the stake doubled.',
      dealer: 'The dealer has turned over blackjack, ace and jack of spades; every player loses.',
      fresh: 'No hands dealt; the dealer has ribbon-spread a new deck across the felt.',
    }),
    seats: choice('How many seats are in play?', {
      one: 'One player alone against the dealer.',
      three: 'Three seats in play, gaps between them.',
      five: 'Five seats in play, a lively table.',
      seven: 'Every seat full, elbow to elbow.',
    }),
    left: choice('What did a player leave behind?', {
      nothing: 'Nothing unusual.',
      ring: 'A gold wedding ring set among the chips of the bet.',
      drink: 'A drink sweating on the armrest.',
      stool: 'An empty stool pushed well back from the table, the player gone.',
      jacket: 'A dinner jacket hung over the back of a stool.',
    }),
    fortune: choice('How is the middle player doing?', {
      short: 'Down to a last few chips.',
      even: 'A modest couple of stacks.',
      heaped: 'A wall of high-denomination stacks, on a heater.',
    }),
    baize: choice('What colour is the felt?', BAIZE),
    placard: choice('What does the limit placard say?', {
      five: 'MIN $5, the cheap table.',
      twentyfive: '$25 - $500.',
      hundred: '$100 MIN, high limit.',
      reserved: 'RESERVED.',
      closed: 'CLOSED.',
    }),
    base: choice('What is the table built from?', {
      wood: 'A panelled dark wood drum with a brass foot rail.',
      lacquer: 'Black lacquer with a gold foot rail.',
      chrome: 'A slim chrome pedestal on a disc foot, modern and bare.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 1.2, T = 0.98, PX = 1024 / (R * 2);
    const felt = FELT[a.baize];
    const ink = a.baize === 'black' ? '#e3b94f' : a.baize === 'tan' ? '#3a2616' : '#f4ecc8';
    const wood = s.material(a.base === 'wood' ? '#4a2718' : '#17161a', { roughness: a.base === 'wood' ? 0.5 : 0.25 });
    const metal = s.material(a.base === 'chrome' ? '#dfe3e6' : '#d9a93a', { metalness: 0.92, roughness: 0.22 });
    const chrome = s.material('#dfe3e6', { metalness: 0.95, roughness: 0.2 });
    const leather = s.material(a.base === 'lacquer' ? '#7a1622' : '#2a1b17', { roughness: 0.75 });
    const dark = s.material('#15161a', { roughness: 0.5 });
    const seatIndex = { one: [3], three: [1, 3, 5], five: [1, 2, 3, 4, 5], seven: [0, 1, 2, 3, 4, 5, 6] }[a.seats];
    const angle = (i: number) => ((24 + i * 22) * Math.PI) / 180;
    const at = (t: number, r: number, side = 0): [number, number] => [Math.cos(t) * r + Math.sin(t) * side, Math.sin(t) * r - Math.cos(t) * side];

    // Felt, painted with circles and the curved house rules.
    const feltTexture = paint(1024, 512, (c) => {
      c.fillStyle = felt; c.fillRect(0, 0, 1024, 512);
      for (let i = 0; i < 700; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '0,0,0'},0.035)`; c.fillRect(random() * 1024, random() * 512, 3, 3); }
      for (let i = 0; i < mood.wear * 12; i++) { c.fillStyle = 'rgba(30,20,10,0.17)'; c.beginPath(); c.ellipse(random() * 1024, random() * 512, 15 + random() * 40, 10 + random() * 26, random() * 3, 0, 7); c.fill(); }
      c.translate(512, 0);
      c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 4;
      for (let i = 0; i < 7; i++) { const [x, z] = at(angle(i), 0.9); c.beginPath(); c.arc(x * PX, z * PX, 0.075 * PX, 0, 7); c.stroke(); }
      for (const r of [0.52, 0.62]) { c.beginPath(); c.arc(0, 0, r * PX, 0.32, Math.PI - 0.32); c.stroke(); }
      const arc = (text: string, r: number, size: number, spread: number) => {
        c.font = `bold ${size}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        [...text].forEach((ch, i) => {
          const t = Math.PI / 2 + spread / 2 - (i / (text.length - 1)) * spread;
          c.save(); c.translate(Math.cos(t) * r * PX, Math.sin(t) * r * PX); c.rotate(t - Math.PI / 2); c.fillText(ch, 0, 0); c.restore();
        });
      };
      arc('BLACKJACK PAYS 3 TO 2', 0.44, 30, 1.9);
      arc('INSURANCE PAYS 2 TO 1', 0.57, 24, 1.75);
    });
    const slab = s.mesh(new THREE.ExtrudeGeometry(halfMoon(R, 0.02), { depth: 0.1, bevelEnabled: false, curveSegments: 40 }), wood, [0, T - 0.105, 0]);
    slab.rotation.x = Math.PI / 2; slab.position.y = T - 0.005;
    const feltGeometry = new THREE.ShapeGeometry(halfMoon(R - 0.1), 40);
    const uv = feltGeometry.attributes.uv, position = feltGeometry.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (position.getX(i) + R) / (R * 2), 1 - position.getY(i) / R);
    const top = s.mesh(feltGeometry, new THREE.MeshStandardMaterial({ map: feltTexture, roughness: 0.95, side: THREE.DoubleSide }), [0, T, 0]);
    top.rotation.x = Math.PI / 2; top.castShadow = false;
    // Padded armrest round the players' arc.
    s.tube(Array.from({ length: 41 }, (_u, i) => { const [x, z] = at((i / 40) * Math.PI, R - 0.05); return [x, T + 0.012, z] as const; }), 0.055, leather);
    s.box([R * 2 - 0.1, 0.03, 0.05], [0, T, 0.005], wood);

    // Base.
    if (a.base === 'chrome') {
      s.cylinder(0.1, 0.1, T - 0.14, [0, (T - 0.1) / 2, 0.42], chrome, 20);
      s.cylinder(0.55, 0.6, 0.04, [0, 0.02, 0.42], chrome, 32);
      s.cylinder(0.3, 0.12, 0.08, [0, T - 0.15, 0.42], chrome, 24);
    } else {
      const drum = s.mesh(new THREE.ExtrudeGeometry(halfMoon(0.78, 0.12), { depth: T - 0.2, bevelEnabled: false, curveSegments: 30 }), wood);
      drum.rotation.x = Math.PI / 2; drum.position.set(0, T - 0.1, 0.06);
      const plinth = s.mesh(new THREE.ExtrudeGeometry(halfMoon(0.84, 0.14), { depth: 0.1, bevelEnabled: false, curveSegments: 30 }), dark);
      plinth.rotation.x = Math.PI / 2; plinth.position.set(0, 0.1, 0.06);
      s.tube(Array.from({ length: 31 }, (_u, i) => { const [x, z] = at(0.12 + (i / 30) * (Math.PI - 0.24), 0.95); return [x, 0.2, z + 0.06] as const; }), 0.02, metal);
      for (let i = 0; i < 5; i++) { const [x, z] = at(0.3 + i * 0.635, 0.95); const [bx, bz] = at(0.3 + i * 0.635, 0.78); s.rod([x, 0.2, z + 0.06], [bx, 0.16, bz + 0.06], 0.014, metal); }
      for (let i = 0; i < 6; i++) { const [x, z] = at(0.4 + i * 0.47, 0.785); const panel = s.box([0.24, 0.5, 0.015], [x, 0.5, z + 0.06], metal); panel.rotation.y = Math.PI / 2 - (0.4 + i * 0.47); panel.scale.set(1, 1, 0.5); }
    }

    // Chips: instanced, with striped edges.
    const edge = paint(128, 8, (c) => { c.fillStyle = '#000'; c.fillRect(0, 0, 128, 8); c.fillStyle = '#fff'; for (let i = 0; i < 6; i++) c.fillRect(i * 21.3 + 2, 0, 9, 8); });
    const face = paint(64, 64, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, 64, 64); c.translate(32, 32); c.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.fillRect(-5, -32, 10, 9); }
      c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 17, 0, 7); c.stroke();
    });
    const chipMaterial = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.32, roughness: 0.55 });
    const CR = 0.03, CH = 0.009;
    const chips: { at: [number, number, number]; color: string }[] = [];
    const COLOURS = ['#c4162a', '#1e8a4a', '#17171b', '#7a2e9a', '#e8a01c', '#1c4fb0', '#f2ede0'];
    const stack = (x: number, z: number, count: number, colour: string, wobble = 0.004) => {
      let dx = 0, dz = 0;
      for (let i = 0; i < count; i++) { dx += (random() - 0.5) * wobble; dz += (random() - 0.5) * wobble; chips.push({ at: [x + dx, T + CH * (i + 0.5), z + dz], color: colour }); }
      return T + CH * count;
    };

    // Cards.
    const backTexture = paint(96, 134, (c) => {
      c.fillStyle = '#fbf8ee'; c.fillRect(0, 0, 96, 134);
      c.fillStyle = mood.warmth > 0.5 ? '#a3161f' : '#1a3f8f'; c.fillRect(7, 7, 82, 120);
      c.strokeStyle = '#ffffff55'; c.lineWidth = 2;
      for (let i = -140; i < 140; i += 12) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 134, 134); c.moveTo(i + 134, 0); c.lineTo(i, 134); c.stroke(); }
    });
    const white = new THREE.MeshStandardMaterial({ color: '#f4f1e6', roughness: 0.7 });
    const backMaterial = new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.6 });
    const CWd = 0.105, CHt = 0.147;
    let lift = 0;
    const card = (x: number, z: number, turn: number, value: Card | null) => {
      const faceMaterial = value ? new THREE.MeshStandardMaterial({ map: cardFace(value), roughness: 0.6 }) : backMaterial;
      const mesh = s.mesh(new THREE.BoxGeometry(CWd, 0.0016, CHt), [white, white, faceMaterial, white, white, white] as unknown as THREE.Material, [x, T + 0.002 + (lift += 0.0017), z]);
      mesh.rotation.y = turn;
      return mesh;
    };
    const anyCard = (): Card => [RANKS[Math.floor(random() * 13)], SUITS[Math.floor(random() * 4)]];
    const hand = (t: number, cards: readonly Card[], r = 0.72, sideways = -1) => cards.forEach((value, k) => {
      const [x, z] = at(t, r + k * 0.022, (k - (cards.length - 1) / 2) * 0.05);
      card(x, z, Math.PI / 2 - t + (k === sideways ? Math.PI / 2 : (random() - 0.5) * 0.12), value);
    });

    const hero = angle(3);
    const dealt = a.hand !== 'fresh';
    for (const i of seatIndex) {
      const t = angle(i), isHero = i === 3;
      const colour = COLOURS[Math.floor(random() * 5)];
      const [bx, bz] = at(t, 0.9);
      if (!isHero) {
        if (dealt) hand(t, random() < 0.6 ? [anyCard(), anyCard()] : [anyCard(), anyCard(), anyCard()]);
        if (a.hand !== 'dealer' || random() < 0.4) stack(bx, bz, 1 + Math.floor(random() * 6), colour);
        const piles = 1 + Math.floor(random() * 2 + mood.density * 2);
        for (let k = 0; k < piles; k++) { const [x, z] = at(t, 1.04, -0.18 + k * 0.068); stack(x, z, 2 + Math.floor(random() * 12), COLOURS[Math.floor(random() * 6)]); }
      }
    }
    // The middle seat tells the story.
    const [hx, hz] = at(hero, 0.9);
    const heroColour = a.fortune === 'heaped' ? '#17171b' : a.fortune === 'short' ? '#c4162a' : '#1e8a4a';
    let betTop = T;
    if (a.hand === 'natural') {
      hand(hero, [['A', 's'], ['K', 'h']]);
      betTop = stack(hx, hz, 6, heroColour);
      stack(hx + 0.075, hz - 0.02, 9, heroColour); stack(hx + 0.14, hz + 0.01, 3, '#c4162a');
    } else if (a.hand === 'bust') {
      hand(hero, [['10', 'c'], ['6', 'd'], ['9', 's']]);
    } else if (a.hand === 'split') {
      for (const side of [-1, 1]) { const [x, z] = at(hero, 0.72, side * 0.1); card(x, z, (random() - 0.5) * 0.1, ['A', side < 0 ? 'h' : 's']); }
      betTop = stack(hx - 0.04, hz, 5, heroColour); stack(hx + 0.04, hz, 5, heroColour);
    } else if (a.hand === 'double') {
      hand(hero, [['6', 'c'], ['5', 'h'], anyCard()], 0.7, 2);
      betTop = stack(hx - 0.035, hz, 6, heroColour); stack(hx + 0.035, hz, 6, heroColour);
    } else if (a.hand === 'dealer') {
      hand(hero, [['K', 'd'], ['Q', 'c']]);
    } else {
      betTop = stack(hx, hz, 3, heroColour);
      for (let k = 0; k < 34; k++) { const t = 0.75 + (k / 33) * (Math.PI - 1.5); const [x, z] = at(t, 0.72); card(x, z, Math.PI / 2 - t + Math.PI / 2, k === 33 ? ['A', 's'] : null); }
    }
    const heroPiles = { short: 1, even: 3, heaped: 7 }[a.fortune];
    for (let k = 0; k < heroPiles; k++) {
      const [x, z] = at(hero, 1.045 - (k > 3 ? 0.07 : 0), 0.13 + (k % 4) * 0.066 + (k > 3 ? 0.03 : 0));
      stack(x, z, a.fortune === 'short' ? 2 + Math.floor(random() * 2) : a.fortune === 'heaped' ? 14 + Math.floor(random() * 8) : 5 + Math.floor(random() * 8), a.fortune === 'heaped' ? COLOURS[2 + (k % 3)] : COLOURS[k % 3]);
    }
    // Dealer's hand, in front of the tray.
    if (dealt) {
      const up: Card = a.hand === 'dealer' ? ['A', 's'] : a.hand === 'natural' ? ['9', 'd'] : anyCard();
      card(-0.06, 0.31, (random() - 0.5) * 0.08, up);
      card(0.06, 0.315, (random() - 0.5) * 0.08, a.hand === 'dealer' ? ['J', 's'] : a.hand === 'bust' ? ['K', 'c'] : null);
    }

    // Chip tray: channels of chips lying on edge.
    s.box([0.74, 0.03, 0.2], [0, T + 0.012, 0.13], chrome);
    const channel = paint(8, 128, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 8, 128); c.fillStyle = '#00000055'; for (let i = 0; i < 128; i += 6) c.fillRect(0, i, 8, 1.5); });
    channel.wrapT = THREE.RepeatWrapping;
    for (let i = 0; i < 10; i++) {
      const fill = mix(0.35, 1, random()) * 0.17;
      const row = s.cylinder(0.032, 0.032, fill, [-0.315 + i * 0.07, T + 0.04, 0.045 + fill / 2], new THREE.MeshStandardMaterial({ color: COLOURS[[6, 0, 0, 1, 1, 2, 2, 3, 4, 5][i]], map: channel, roughness: 0.6 }), 14);
      row.rotation.x = Math.PI / 2;
    }
    // Dealing shoe on one side, discard holder on the other.
    const shoe = new THREE.Group();
    const shoeBody = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.3), dark);
    shoeBody.position.y = 0.06;
    const shoeLip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.1), dark);
    shoeLip.position.set(0, 0.03, 0.19); shoeLip.rotation.x = 0.35;
    const shoeCards = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.012), white);
    shoeCards.position.set(0, 0.075, 0.155); shoeCards.rotation.x = -0.45;
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.13, 10), chrome);
    roller.rotation.z = Math.PI / 2; roller.position.set(0, 0.13, -0.08);
    shoe.add(shoeBody, shoeLip, shoeCards, roller);
    shoe.traverse((n) => { n.castShadow = true; });
    shoe.position.set(-0.62, T, 0.2); shoe.rotation.y = 0.5;
    s.root.add(shoe);
    const clearRed = new THREE.MeshStandardMaterial({ color: '#c8202e', transparent: true, opacity: 0.55, roughness: 0.15 });
    s.box([0.14, 0.09, 0.012], [0.62, T + 0.045, 0.1], clearRed);
    s.box([0.012, 0.09, 0.17], [0.69, T + 0.045, 0.19], clearRed);
    s.box([0.14, 0.008, 0.18], [0.62, T + 0.004, 0.19], clearRed);
    s.box([0.105, 0.012 + random() * 0.05, 0.147], [0.615, T + 0.03, 0.19], white);

    // Limit placard.
    const text = { five: 'MIN $5', twentyfive: '$25-$500', hundred: '$100 MIN', reserved: 'RESERVED', closed: 'CLOSED' }[a.placard];
    const tone = { five: '#c4162a', twentyfive: '#1e8a4a', hundred: '#17171b', reserved: '#7a5a12', closed: '#5a5d63' }[a.placard];
    const sign = s.label(text, 0.24, 0.13, [-0.92, T + 0.1, 0.3], '#fbf6e2', tone);
    sign.rotation.y = 0.55; sign.rotation.x = -0.2;
    s.box([0.2, 0.02, 0.07], [-0.92, T + 0.02, 0.29], chrome).rotation.y = 0.55;

    // Left behind.
    if (a.left === 'ring') {
      const gold = s.material('#f0c040', { metalness: 1, roughness: 0.15, emissive: '#6a4a08', emissiveIntensity: 0.6 });
      const band = s.ring(0.026, 0.006, [hx - 0.005, Math.max(betTop, T) + 0.006, hz + 0.004], gold);
      band.rotation.x = Math.PI / 2 - 0.25;
      s.mesh(new THREE.OctahedronGeometry(0.011), s.material('#eaf6ff', { roughness: 0.05, emissive: '#bfe6ff', emissiveIntensity: 0.9 }), [hx - 0.005, Math.max(betTop, T) + 0.014, hz + 0.034]);
    } else if (a.left === 'drink') {
      const [x, z] = at(angle(seatIndex.length > 1 ? seatIndex[0] : 2), R - 0.05, 0.2);
      s.cylinder(0.038, 0.032, 0.11, [x, T + 0.125, z], new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }), 16);
      s.cylinder(0.033, 0.029, 0.07, [x, T + 0.108, z], s.material('#b5651d', { roughness: 0.2, emissive: '#5a2a08' }), 16);
      s.rod([x, T + 0.09, z], [x + 0.03, T + 0.22, z - 0.01], 0.003, s.material('#d3122a'));
      s.box([0.1, 0.003, 0.1], [x, T + 0.068, z], s.material('#f4f1e6'));
    }

    // Stools round the arc.
    const seat = s.material(a.base === 'lacquer' ? '#7a1622' : a.base === 'chrome' ? '#22242a' : '#3a2a22', { roughness: 0.8 });
    for (let i = 0; i < 7; i++) {
      if (a.base === 'chrome' && i % 2 === 1 && !seatIndex.includes(i)) continue;
      const t = angle(i);
      const g = new THREE.Group();
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.09, 20), seat); pad.position.y = 0.74;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.7, 10), chrome); post.position.y = 0.37;
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.035, 20), chrome); foot.position.y = 0.018;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 24), chrome); ring.rotation.x = Math.PI / 2; ring.position.y = 0.32;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.05), seat); back.position.set(0, 1.0, 0.17);
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.02), chrome); spine.position.set(0, 0.84, 0.19);
      g.add(pad, post, foot, ring, back, spine);
      let r = R + 0.3 + random() * 0.06;
      g.rotation.y = Math.PI / 2 - t + (random() - 0.5) * 0.35;
      if (i === 3 && a.left === 'stool') { r = R + 0.85; g.rotation.y += 0.9; }
      if (i === (a.left === 'jacket' ? 3 : -1)) {
        const cloth = new THREE.MeshStandardMaterial({ color: '#1b1d24', roughness: 0.9 });
        const drape = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.46, 0.09), cloth); drape.position.set(0, 0.9, 0.18);
        const shoulders = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 10), cloth); shoulders.rotation.z = Math.PI / 2; shoulders.position.set(0, 1.13, 0.17);
        const lining = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.01), new THREE.MeshStandardMaterial({ color: '#8f1d28', roughness: 0.5 })); lining.position.set(0, 0.95, 0.13);
        for (const side of [-1, 1]) { const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.5, 8), cloth); sleeve.position.set(side * 0.23, 0.82, 0.18); sleeve.rotation.z = side * 0.12; g.add(sleeve); }
        g.add(drape, shoulders, lining);
      }
      g.traverse((n) => { n.castShadow = true; });
      const [x, z] = at(t, r);
      g.position.set(x, 0, z);
      s.root.add(g);
    }

    if (chips.length) {
      const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(CR, CR, CH, 18), [chipMaterial(edge), chipMaterial(face), chipMaterial(face)], chips.length);
      const matrix = new THREE.Matrix4(), colour = new THREE.Color();
      chips.forEach((chip, i) => { matrix.makeRotationY(random() * 6).setPosition(...chip.at); mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, colour.set(chip.color)); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    return s.finish();
  },
});
