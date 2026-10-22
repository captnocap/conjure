import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const W = 0.063, HC = 0.088, PX = 4000;
type Suit = 's' | 'h' | 'd' | 'c';
type Card = readonly [string, Suit];

const HANDS = {
  royal: 'A royal flush in spades: ten, jack, queen, king, ace. The hand of a lifetime.',
  deadman: 'The dead man\'s hand: black aces and black eights, the fifth card never turned.',
  aces: 'Four aces and a king. Too good to be honest.',
  fullhouse: 'A full house, kings over sevens. Strong, confident, maybe not enough.',
  hearts: 'A flush of hearts, all red.',
  pair: 'A miserable pair of twos.',
  nothing: 'Nothing at all: seven-two offsuit and junk, a pure bluff.',
} as const;
const DEALS: Record<keyof typeof HANDS, Card[]> = {
  royal: [['10', 's'], ['J', 's'], ['Q', 's'], ['K', 's'], ['A', 's']],
  deadman: [['A', 's'], ['A', 'c'], ['8', 's'], ['8', 'c'], ['Q', 'h']],
  aces: [['A', 's'], ['A', 'h'], ['A', 'd'], ['A', 'c'], ['K', 'h']],
  fullhouse: [['K', 'h'], ['K', 's'], ['K', 'd'], ['7', 'c'], ['7', 'd']],
  hearts: [['3', 'h'], ['7', 'h'], ['9', 'h'], ['J', 'h'], ['K', 'h']],
  pair: [['2', 'h'], ['2', 'c'], ['9', 'd'], ['J', 's'], ['5', 'c']],
  nothing: [['7', 'd'], ['2', 'c'], ['9', 's'], ['4', 'h'], ['J', 'd']],
};
const BACKS = {
  red: 'Classic red lattice backs, a drugstore deck.',
  blue: 'Blue lattice backs, the other drugstore deck.',
  casino: 'Black backs with a gold border and medallion, a casino deck.',
  green: 'Bottle-green backs with a pale ring pattern, an old club deck.',
} as const;
const BACK_INK: Record<keyof typeof BACKS, [string, string]> = {
  red: ['#b3262b', '#f4efe2'], blue: ['#27478f', '#f4efe2'], casino: ['#1b1a1e', '#d4ae45'], green: ['#1f5a3f', '#e9e2c8'],
};
const PIPS: Record<string, [number, number][]> = {
  '2': [[0.5, 0.22], [0.5, 0.78]],
  '3': [[0.5, 0.22], [0.5, 0.5], [0.5, 0.78]],
  '4': [[0.3, 0.22], [0.7, 0.22], [0.3, 0.78], [0.7, 0.78]],
  '5': [[0.3, 0.22], [0.7, 0.22], [0.3, 0.78], [0.7, 0.78], [0.5, 0.5]],
  '7': [[0.3, 0.22], [0.7, 0.22], [0.3, 0.78], [0.7, 0.78], [0.3, 0.5], [0.7, 0.5], [0.5, 0.36]],
  '8': [[0.3, 0.22], [0.7, 0.22], [0.3, 0.78], [0.7, 0.78], [0.3, 0.5], [0.7, 0.5], [0.5, 0.36], [0.5, 0.64]],
  '9': [[0.3, 0.2], [0.3, 0.4], [0.3, 0.6], [0.3, 0.8], [0.7, 0.2], [0.7, 0.4], [0.7, 0.6], [0.7, 0.8], [0.5, 0.5]],
  '10': [[0.3, 0.2], [0.3, 0.4], [0.3, 0.6], [0.3, 0.8], [0.7, 0.2], [0.7, 0.4], [0.7, 0.6], [0.7, 0.8], [0.5, 0.3], [0.5, 0.7]],
};

function drawSuit(ctx: CanvasRenderingContext2D, suit: Suit, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  if (suit === 'd') {
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.72, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.72, 0); ctx.closePath();
  } else if (suit === 'h' || suit === 's') {
    const k = suit === 'h' ? 1 : -1;
    ctx.moveTo(0, k * r);
    ctx.bezierCurveTo(-r * 1.5, k * -r * 0.1, -r * 0.75, k * -r * 1.15, 0, k * -r * 0.4);
    ctx.bezierCurveTo(r * 0.75, k * -r * 1.15, r * 1.5, k * -r * 0.1, 0, k * r);
    if (suit === 's') { ctx.moveTo(0, r * 0.2); ctx.lineTo(r * 0.38, r); ctx.lineTo(-r * 0.38, r); ctx.closePath(); }
  } else {
    for (const [cx, cy] of [[0, -r * 0.48], [-r * 0.5, r * 0.18], [r * 0.5, r * 0.18]]) { ctx.moveTo(cx + r * 0.45, cy); ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2); }
    ctx.moveTo(0, 0); ctx.lineTo(r * 0.35, r); ctx.lineTo(-r * 0.35, r); ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
}

function texture(canvas: HTMLCanvasElement) {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.6 });
}
function sheet() {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * PX); canvas.height = Math.round(HC * PX);
  return { canvas, ctx: canvas.getContext('2d')!, w: canvas.width, h: canvas.height };
}

function faceMaterial([rank, suit]: Card, paper: string, blemish: 'none' | 'ring' | 'burn' | 'blood', random: () => number) {
  const { canvas, ctx, w, h } = sheet();
  ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
  const ink = suit === 'h' || suit === 'd' ? '#c2242b' : '#17171a';
  ctx.fillStyle = ink; ctx.strokeStyle = ink;
  for (const flip of [0, 1]) {
    ctx.save();
    if (flip) { ctx.translate(w, h); ctx.rotate(Math.PI); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${rank === '10' ? 54 : 70}px sans-serif`;
    ctx.fillText(rank, 38, 46);
    drawSuit(ctx, suit, 38, 104, 22);
    ctx.restore();
  }
  if (PIPS[rank]) for (const [u, v] of PIPS[rank]) drawSuit(ctx, suit, mix(30, w - 30, u), mix(14, h - 14, v), 22);
  else if (rank === 'A') drawSuit(ctx, suit, w / 2, h / 2, suit === 's' ? 78 : 58);
  else {
    ctx.lineWidth = 5; ctx.strokeRect(62, 50, w - 124, h - 100);
    ctx.globalAlpha = 0.16; ctx.fillRect(62, 50, w - 124, h - 100); ctx.globalAlpha = 1;
    ctx.fillStyle = '#d9a92f'; ctx.fillRect(62, h / 2 - 12, w - 124, 24);
    ctx.fillStyle = ink;
    for (const flip of [0, 1]) {
      ctx.save(); ctx.translate(w / 2, h / 2); if (flip) ctx.rotate(Math.PI);
      ctx.font = 'bold 96px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(rank, 0, -78);
      drawSuit(ctx, suit, 38, -128, 14);
      ctx.restore();
    }
  }
  if (blemish === 'ring') {
    ctx.strokeStyle = 'rgba(150,96,30,0.55)'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(w * mix(0.3, 0.9, random()), h * mix(0.2, 0.8, random()), 86, 0, Math.PI * 2); ctx.stroke();
  } else if (blemish === 'burn') {
    const x = w * mix(0.3, 0.7, random()), y = h * mix(0.25, 0.75, random());
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 44);
    glow.addColorStop(0, '#120c08'); glow.addColorStop(0.45, '#2a180c'); glow.addColorStop(0.8, 'rgba(120,70,20,0.7)'); glow.addColorStop(1, 'rgba(120,70,20,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - 50, y - 50, 100, 100);
  } else if (blemish === 'blood') {
    ctx.fillStyle = 'rgba(120,12,16,0.88)';
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(w * random(), h * random(), 4 + random() * random() * 34, 0, Math.PI * 2); ctx.fill(); }
  }
  return texture(canvas);
}

function backMaterial(design: keyof typeof BACKS, paper: string, marked: boolean) {
  const { canvas, ctx, w, h } = sheet();
  const [ink, line] = BACK_INK[design];
  ctx.fillStyle = design === 'casino' ? ink : paper; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = ink; ctx.fillRect(16, 16, w - 32, h - 32);
  ctx.save();
  ctx.beginPath(); ctx.rect(16, 16, w - 32, h - 32); ctx.clip();
  ctx.strokeStyle = line; ctx.lineWidth = design === 'casino' ? 2 : 4;
  if (design === 'green') {
    for (let x = 0; x < 7; x++) for (let y = 0; y < 9; y++) { ctx.beginPath(); ctx.arc(34 + x * 32 + (y % 2) * 16, 30 + y * 38, 12, 0, Math.PI * 2); ctx.stroke(); }
  } else {
    for (let i = -h; i < w + h; i += design === 'casino' ? 30 : 26) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i, h); ctx.lineTo(i + h, 0); ctx.stroke();
    }
  }
  ctx.restore();
  ctx.strokeStyle = line; ctx.lineWidth = 5; ctx.strokeRect(22, 22, w - 44, h - 44);
  if (design === 'casino' || design === 'green') {
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(w / 2, h / 2, 50, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = line; drawSuit(ctx, 's', w / 2, h / 2, 26);
  }
  if (marked) {
    ctx.strokeStyle = design === 'casino' || design === 'blue' ? '#ff5038' : '#1a1a1e'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    for (const [x, y] of [[52, 56], [w - 52, h - 56]]) {
      ctx.beginPath(); ctx.moveTo(x - 20, y - 20); ctx.lineTo(x + 20, y + 20); ctx.moveTo(x + 20, y - 20); ctx.lineTo(x - 20, y + 20); ctx.stroke();
    }
  }
  return texture(canvas);
}

function cardGeometry(part: 'full' | 'top' | 'bottom', jag: number[]) {
  const w = W / 2, h = HC / 2, r = 0.0035, shape = new THREE.Shape();
  const tear = jag.map((y, i) => [mix(-w, w, i / (jag.length - 1)), y] as const);
  if (part === 'full') {
    shape.moveTo(-w + r, -h); shape.lineTo(w - r, -h); shape.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false);
    shape.lineTo(w, h - r); shape.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
    shape.lineTo(-w + r, h); shape.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(-w, -h + r); shape.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5, false);
  } else if (part === 'top') {
    shape.moveTo(tear[0][0], tear[0][1]);
    for (const [x, y] of tear.slice(1)) shape.lineTo(x, y);
    shape.lineTo(w, h - r); shape.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
    shape.lineTo(-w + r, h); shape.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false);
  } else {
    shape.moveTo(-w + r, -h); shape.lineTo(w - r, -h); shape.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false);
    for (const [x, y] of tear.slice().reverse()) shape.lineTo(x, y);
    shape.lineTo(-w, -h + r); shape.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5, false);
  }
  const geometry = new THREE.ShapeGeometry(shape, 4);
  const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / W + 0.5, position.getY(i) / HC + 0.5);
  return geometry;
}

export default defineThing({
  questions: {
    hand: choice('What is the hand?', HANDS),
    reveal: choice('How are the five cards showing?', {
      fan: 'Fanned face up on the table for everyone to read.',
      propped: 'Fanned and propped upright against the deck, faces to the viewer, like a hand still being held.',
      down: 'All face down in a tight overlapping row, never shown.',
      peek: 'Face down, except the last card which has been turned over.',
      thrown: 'Thrown in face up, scattered at angles in disgust or in a hurry.',
    }),
    back: choice('What do the card backs look like?', BACKS),
    flaw: choice('What is wrong with one of the cards?', {
      none: 'Nothing: a clean, honest hand.',
      torn: 'One card has been ripped in half, the pieces lying apart.',
      marked: 'One card lies face down showing small inked crosses on its back: a marked deck.',
      burn: 'A cigarette burn scorched into the face of a card.',
      ring: 'Brown rings from a wet whiskey glass across the cards.',
      blood: 'Dark red spatter across the faces.',
      sixth: 'A sixth card, an extra ace, half hidden under the hand.',
    }),
    deck: choice('What state is the rest of the deck in?', {
      squared: 'A neat squared stack, set down by a dealer.',
      cut: 'Cut into two uneven halves, one askew on the other.',
      ribbon: 'Spread face down in a long curved ribbon across the table.',
      spilled: 'Knocked over and spilled, cards slid everywhere, a few face up.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const paper = '#' + new THREE.Color('#f7f3e8').lerp(new THREE.Color('#cdb98a'), mood.wear * 0.7).getHexString();
    const hand = DEALS[a.hand].slice();
    const full = cardGeometry('full', []);
    const back = backMaterial(a.back, paper, false);
    const edge = s.material(paper, { roughness: 0.8 });
    const hurry = mix(0.15, 1, mood.energy);

    /** A card lying flat at the origin: +y is its face when `up`. Returns the group to move. */
    const card = (face: THREE.Material, backing: THREE.Material, up: boolean, geometry: THREE.BufferGeometry = full) => {
      const flat = new THREE.Group(), front = new THREE.Mesh(geometry, face), rear = new THREE.Mesh(geometry, backing);
      front.position.z = 0.00012; rear.position.z = -0.00012; rear.rotation.y = Math.PI;
      front.castShadow = rear.castShadow = front.receiveShadow = rear.receiveShadow = true;
      flat.add(front, rear);
      flat.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
      const group = new THREE.Group();
      group.add(flat);
      return group;
    };

    const blemished = a.flaw === 'burn' ? [Math.floor(random() * 5)] : a.flaw === 'ring' ? [1, 2, 3] : a.flaw === 'blood' ? [0, 1, 2, 3, 4] : [];
    const special = a.flaw === 'torn' || a.flaw === 'marked' ? 1 + Math.floor(random() * 3) : -1;
    const faces = hand.map((entry, index) => faceMaterial(entry, paper, blemished.includes(index) ? (a.flaw as 'ring' | 'burn' | 'blood') : 'none', random));
    const markedBack = a.flaw === 'marked' ? backMaterial(a.back, paper, true) : back;
    const handRoot = new THREE.Group();
    s.root.add(handRoot);

    const showing = (index: number) => {
      if (a.flaw === 'marked' && index === special) return false;
      if (a.reveal === 'down') return false;
      if (a.reveal === 'peek') return index === 4;
      if (a.hand === 'deadman' && index === 4) return false;
      return true;
    };
    const lay = (index: number, x: number, z: number, turn: number, y: number) => {
      const up = showing(index), backing = index === special && a.flaw === 'marked' ? markedBack : back;
      if (index === special && a.flaw === 'torn') {
        const jag = Array.from({ length: 9 }, () => (random() - 0.5) * 0.012);
        for (const [part, slide] of [['top', -1], ['bottom', 1]] as const) {
          const half = card(faces[index], backing, up, cardGeometry(part, jag));
          const gap = slide * mix(0.006, 0.02, random()) * (up ? 1 : -1);
          half.position.set(x + Math.sin(turn) * gap + slide * 0.004, y, z + Math.cos(turn) * gap);
          half.rotation.y = turn + slide * mix(0.05, 0.4, random());
          handRoot.add(half);
        }
        return;
      }
      const group = card(faces[index], backing, up);
      group.position.set(x, y, z);
      group.rotation.y = turn;
      handRoot.add(group);
    };

    if (a.reveal === 'fan' || a.reveal === 'propped') {
      const pivot = 0.075, step = mix(0.2, 0.3, random());
      hand.forEach((_entry, index) => {
        const angle = -(index - 2) * step + (random() - 0.5) * 0.06 * hurry;
        const radius = pivot + HC / 2;
        lay(index, -Math.sin(angle) * radius, pivot + HC / 2 - Math.cos(angle) * radius + HC / 2, angle, 0.0004 + index * 0.0005);
      });
      if (a.flaw === 'sixth') {
        const extra = card(faceMaterial(['A', a.hand === 'royal' ? 'h' : 's'], paper, 'none', random), back, true);
        extra.position.set(0.035, 0.0001, HC * 0.95);
        extra.rotation.y = -0.5;
        handRoot.add(extra);
      }
    } else if (a.reveal === 'thrown') {
      hand.forEach((_entry, index) => lay(index, (index - 2) * 0.034 + (random() - 0.5) * 0.06, (random() - 0.5) * 0.09 + 0.05, (random() - 0.5) * 2.6, 0.0004 + index * 0.0006));
      if (a.flaw === 'sixth') {
        const extra = card(faceMaterial(['A', 's'], paper, 'none', random), back, true);
        extra.position.set(0.1, 0.0001, 0.11); extra.rotation.y = 1.1;
        handRoot.add(extra);
      }
    } else {
      hand.forEach((_entry, index) => lay(index, (index - 2) * (a.reveal === 'peek' ? 0.05 : 0.03) + (random() - 0.5) * 0.008 * hurry, 0.05 + (random() - 0.5) * 0.012 * hurry, (random() - 0.5) * 0.3 * hurry, 0.0004 + index * 0.0005));
      if (a.flaw === 'sixth') {
        const extra = card(faceMaterial(['A', 's'], paper, 'none', random), back, true);
        extra.position.set(0.085, 0.0001, 0.085); extra.rotation.y = -0.7;
        handRoot.add(extra);
      }
    }

    // The rest of the deck.
    const deckCards = 46, thick = deckCards * 0.0003;
    const block = (count: number, x: number, y: number, z: number, turn: number) => {
      const height = count * 0.0003;
      const mesh = s.box([W, height, HC], [x, y + height / 2, z], edge);
      (mesh as THREE.Mesh).material = [edge, edge, back, edge, edge, edge];
      mesh.rotation.y = turn;
      return mesh;
    };
    const deckX = a.reveal === 'propped' ? 0 : -0.15, deckZ = a.reveal === 'propped' ? -0.02 : 0.03;
    const loose = (x: number, z: number, turn: number, y: number, up = false) => {
      const entry: Card = [['3', '6', 'Q', '9', 'K', '4'][Math.floor(random() * 6)] === '6' ? '5' : ['3', 'Q', '9', 'K', '4'][Math.floor(random() * 5)], (['s', 'h', 'd', 'c'] as const)[Math.floor(random() * 4)]];
      const group = card(up ? faceMaterial(entry, paper, 'none', random) : back, back, true);
      group.position.set(x, y, z); group.rotation.y = turn;
      s.root.add(group);
    };
    const baseTurn = (random() - 0.5) * 0.7;
    if (a.deck === 'squared') {
      block(deckCards, deckX, 0, deckZ, a.reveal === 'propped' ? 0 : baseTurn);
    } else if (a.deck === 'cut') {
      const lower = 14 + Math.floor(random() * 18);
      block(lower, deckX, 0, deckZ, a.reveal === 'propped' ? 0 : baseTurn);
      block(deckCards - lower, deckX + (a.reveal === 'propped' ? -0.085 : 0.012), a.reveal === 'propped' ? 0 : lower * 0.0003, deckZ + 0.01, baseTurn + 0.45);
    } else if (a.deck === 'ribbon') {
      const count = Math.round(mix(18, 34, mood.density)), bend = (random() - 0.5) * 1.6;
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1) - 0.5, angle = t * bend;
        loose(t * count * 0.0105 + (random() - 0.5) * 0.002 * hurry, -0.09 - Math.cos(angle * 1.4) * 0.03 + 0.03, -angle + (random() - 0.5) * 0.1 * hurry, 0.0003 + i * 0.00035);
      }
      if (a.reveal === 'propped') block(12, deckX, 0, deckZ, 0);
    } else {
      block(16, deckX, 0, deckZ, a.reveal === 'propped' ? 0 : baseTurn);
      const count = Math.round(mix(10, 24, mood.density));
      const heading = a.reveal === 'propped' ? Math.PI : baseTurn - 1.2;
      for (let i = 0; i < count; i++) {
        const d = 0.02 + i * 0.012 + random() * 0.02, sway = (random() - 0.5) * 1.1;
        loose(deckX + Math.sin(heading + sway) * d, deckZ - Math.abs(Math.cos(heading + sway)) * d * 0.9 - 0.02, random() * 6.28, thick * 0.1 + 0.0005 + i * 0.0004, random() < 0.25);
      }
    }

    if (a.reveal === 'propped') {
      // Stand the fan up against the deck block.
      for (const child of handRoot.children) child.position.z -= HC + 0.001;
      handRoot.rotation.x = 1.15;
      handRoot.position.set(0, 0, 0.03);
    }
    return s.finish();
  },
});
