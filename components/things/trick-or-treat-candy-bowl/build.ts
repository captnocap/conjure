import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, paint, paintHex, paintIsMetal } from '@conjure/kit';

type R = () => number;
interface Piece { at: THREE.Vector3; turn: THREE.Euler; size: number; colour: THREE.Color }

const SIGNS = {
  none: '',
  one: 'TAKE ONE\nPLEASE',
  two: 'PLEASE\nTAKE 2!',
  watching: 'TAKE ONE...\nWE ARE\nWATCHING',
  happy: 'HAPPY\nHALLOWEEN!',
  honour: 'HONOR\nSYSTEM :)',
} as const;

/** Marker lettering, each letter a little off its line, so it reads as a person's hand. */
function lettered(text: string, ink: string, paper: string, random: R, doodles: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 320;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, 512, 320);
  // A faint fold shadow and fibres in the card.
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let i = 0; i < 60; i++) ctx.fillRect(random() * 512, random() * 320, 2 + random() * 6, 1);
  const lines = text.split('\n');
  const size = Math.min(92, 300 / lines.length * 0.8, 470 / Math.max(...lines.map((l) => l.length)) * 1.6);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, row) => {
    const y = 160 + (row - (lines.length - 1) / 2) * size * 1.08 + (random() - 0.5) * 6;
    ctx.font = `bold ${size}px "Comic Sans MS", "Chalkboard", cursive, sans-serif`;
    const total = ctx.measureText(line).width;
    let x = 256 - total / 2 + (random() - 0.5) * 14;
    const slope = (random() - 0.5) * 0.08;
    for (const ch of line) {
      const w = ctx.measureText(ch).width;
      ctx.save();
      ctx.translate(x + w / 2, y + (x - 256) * slope + (random() - 0.5) * size * 0.08);
      ctx.rotate((random() - 0.5) * 0.18);
      ctx.scale(0.92 + random() * 0.16, 0.92 + random() * 0.16);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      x += w * (0.96 + random() * 0.08);
    }
  });
  if (doodles) {
    // A lopsided pumpkin in one corner and a bat in the other.
    ctx.fillStyle = '#ee7a12';
    ctx.beginPath(); ctx.ellipse(58, 268, 30, 24, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2f6e2a'; ctx.fillRect(54, 238, 7, 12);
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath(); ctx.moveTo(46, 262); ctx.lineTo(52, 252); ctx.lineTo(56, 262); ctx.fill();
    ctx.beginPath(); ctx.moveTo(62, 262); ctx.lineTo(68, 252); ctx.lineTo(72, 262); ctx.fill();
    ctx.fillRect(46, 274, 26, 4);
    ctx.save(); ctx.translate(452, 48); ctx.scale(1.4, 1.4);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-14, -14, -30, -4); ctx.quadraticCurveTo(-22, 0, -24, 8); ctx.quadraticCurveTo(-12, 2, 0, 8);
    ctx.quadraticCurveTo(12, 2, 24, 8); ctx.quadraticCurveTo(22, 0, 30, -4); ctx.quadraticCurveTo(14, -14, 0, 0); ctx.fill();
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The printed wrapper of a fun-size bar: crimped ends and a label band, tinted per bar. */
function wrapperTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#c9c9c9';
  ctx.fillRect(0, 0, 14, 64); ctx.fillRect(114, 0, 14, 64);
  ctx.strokeStyle = '#9a9a9a'; ctx.lineWidth = 1.5;
  for (let y = 0; y < 64; y += 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(13, y + 2.5); ctx.moveTo(115, y + 2.5); ctx.lineTo(128, y); ctx.stroke(); }
  ctx.fillStyle = '#7d7d7d'; ctx.fillRect(14, 0, 100, 9); ctx.fillRect(14, 55, 100, 9);
  ctx.fillStyle = '#f8f8f8'; ctx.beginPath(); ctx.ellipse(64, 32, 30, 13, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#5a5a5a'; ctx.fillRect(44, 29, 40, 6);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function cornTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 8; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f6c21a'; ctx.fillRect(0, 0, 8, 64);
  ctx.fillStyle = '#f07a12'; ctx.fillRect(0, 22, 8, 22);
  ctx.fillStyle = '#fbf6ea'; ctx.fillRect(0, 0, 8, 22);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    bowl: choice('What kind of bowl holds the candy?', {
      plastic: 'A wide glossy plastic party bowl from the seasonal aisle.',
      punch: 'A cut-glass punch bowl on a pedestal foot, borrowed from the good cupboard, candy showing through the facets.',
      cauldron: 'A pot-bellied witch\'s cauldron on three stubby legs with a rolled rim and ear handles.',
      mixing: 'A plain kitchen mixing bowl with a contrasting band, pressed into service at the last minute.',
    }),
    fill: choice('How full is it?', {
      overflowing: 'Overflowing: heaped high above the rim, sweets sliding off onto the floor around it.',
      heaped: 'Freshly filled, a generous rounded mound at the rim.',
      half: 'Half gone: the good ones picked out, a sunken layer left.',
      scraped: 'Scraped to the last few unwanted ones rattling around the bottom: raisins, wax-paper taffy.',
    }),
    lurker: choice('Does anything lurk in the candy?', {
      nothing: 'Nothing: just candy.',
      hand: 'A rubber zombie hand reaching up out of the sweets, ready to grab.',
      spider: 'A big hairy plastic spider squatting on top of the pile.',
      both: 'A rubber hand clawing up through the candy and a fat spider on the rim.',
    }),
    sign: choice('If there is a hand-lettered card propped in front, what does it say?', {
      none: 'There is no card.',
      one: 'TAKE ONE PLEASE, in careful marker.',
      two: 'PLEASE TAKE 2!, a generous house.',
      watching: 'TAKE ONE... WE ARE WATCHING, a threat with a wink.',
      happy: 'HAPPY HALLOWEEN! with doodles.',
      honour: 'HONOR SYSTEM :) — nobody is home to hand it out.',
    }),
    colour: paint('What colour is the bowl?', ['orange', 'black', 'purple', 'lime', 'red', 'white', 'cream', 'silver', 'green']),
    candy: choice('What kind of candy is mostly in it?', {
      bars: 'Mostly fun-size chocolate bars in bright wrappers.',
      mixed: 'A mixed bag: bars, lollipops, candy corn and twist-wrapped sweets.',
      lollipops: 'A forest of lollipops sticking up among wrapped sweets.',
      cheap: 'Bulk cheap stuff: candy corn, wax-paper taffy, tiny boxes.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const disposables: { dispose(): void }[] = [];
    const tex = <T extends THREE.Texture>(t: T) => { disposables.push(t); return t; };

    // ---- the bowl ----
    const body = paintHex(a.colour);
    const metal = paintIsMetal(a.colour);
    let rim = 0.2, rimY = 0.15, floorY = 0.012;
    let inner: (y: number) => number;
    const lathe = (points: [number, number][], material: THREE.Material, segments = 40) => {
      const mesh = s.mesh(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments), material);
      return mesh;
    };
    const profile = (outer: (t: number) => number, y0: number, y1: number, wall: number, lip: number, base: number) => {
      const points: [number, number][] = [[0, y0], [outer(0) * 0.9, y0]];
      for (let i = 0; i <= 20; i++) points.push([outer(i / 20), y0 + (y1 - y0) * i / 20]);
      points.push([outer(1) + lip, y1 + 0.004], [outer(1) - wall * 0.3, y1 + 0.006]);
      for (let i = 20; i >= 0; i--) {
        const y = y0 + base + (y1 - y0 - base) * i / 20;
        const t = (y - y0) / (y1 - y0);
        points.push([Math.max(0.001, outer(t) - wall), y]);
      }
      points.push([0, y0 + base]);
      return points;
    };
    if (a.bowl === 'plastic') {
      const outer = (t: number) => 0.1 + 0.105 * Math.pow(t, 0.62);
      const mat = s.material(body, { roughness: 0.28, metalness: metal ? 0.7 : 0.02, side: THREE.DoubleSide });
      lathe(profile(outer, 0, 0.15, 0.006, 0.012, 0.008), mat);
      s.cylinder(0.095, 0.1, 0.01, [0, 0.005, 0], mat, 32);
      rim = outer(1); rimY = 0.15; floorY = 0.01;
      inner = (y) => outer(Math.min(1, Math.max(0, y / 0.15))) - 0.006;
    } else if (a.bowl === 'punch') {
      const tint = new THREE.Color(body).lerp(new THREE.Color('#ffffff'), 0.55);
      const glass = new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide, flatShading: true });
      const edge = new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.1, transparent: true, opacity: 0.5, depthWrite: false, flatShading: true });
      const y0 = 0.075;
      const outer = (t: number) => 0.045 + 0.17 * Math.pow(t, 0.5);
      lathe(profile(outer, y0, y0 + 0.15, 0.007, 0.006, 0.01), glass, 12);
      lathe([[0, 0], [0.1, 0], [0.1, 0.008], [0.06, 0.016], [0.026, 0.03], [0.022, 0.055], [0.04, y0], [0, y0]], edge, 12);
      s.ring(outer(1) + 0.002, 0.004, [0, y0 + 0.152, 0], edge).rotation.x = Math.PI / 2;
      rim = outer(1); rimY = y0 + 0.15; floorY = y0 + 0.01;
      inner = (y) => outer(Math.min(1, Math.max(0, (y - y0) / 0.15))) - 0.007;
    } else if (a.bowl === 'cauldron') {
      const iron = s.material(body, { roughness: 0.55, metalness: metal ? 0.8 : 0.35 });
      const y0 = 0.035, h = 0.2;
      const outer = (t: number) => 0.06 + 0.13 * Math.sin(Math.PI * (0.18 + 0.66 * t)) + (t > 0.85 ? -0.01 : 0);
      lathe(profile(outer, y0, y0 + h, 0.008, 0.004, 0.012), new THREE.MeshStandardMaterial({ color: iron.color, roughness: 0.6, metalness: iron.metalness, side: THREE.DoubleSide }));
      s.ring(outer(1) + 0.006, 0.013, [0, y0 + h, 0], iron).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const angle = i * Math.PI * 2 / 3 + 0.5;
        const leg = s.cylinder(0.016, 0.022, 0.06, [Math.sin(angle) * 0.1, 0.03, Math.cos(angle) * 0.1], iron, 10);
        leg.rotation.z = Math.cos(angle) * 0.15; leg.rotation.x = -Math.sin(angle) * 0.15;
      }
      for (const side of [-1, 1]) {
        const ear = s.ring(0.03, 0.006, [side * (outer(0.86) + 0.012), y0 + h * 0.86, 0], iron);
        ear.rotation.y = Math.PI / 2;
      }
      rim = outer(1); rimY = y0 + h; floorY = y0 + 0.012;
      inner = (y) => outer(Math.min(1, Math.max(0, (y - y0) / h))) - 0.008;
    } else {
      const ceramic = !metal;
      const mat = s.material(metal ? '#c9ccd1' : body, { roughness: ceramic ? 0.3 : 0.25, metalness: metal ? 0.85 : 0, side: THREE.DoubleSide });
      const outer = (t: number) => 0.075 + 0.14 * Math.pow(t, 0.75);
      lathe(profile(outer, 0, 0.13, 0.006, 0.01, 0.008), mat);
      if (ceramic) {
        const band = s.material(a.colour === 'white' || a.colour === 'cream' ? '#3d6fb0' : '#f2ecdc', { roughness: 0.3 });
        lathe([[outer(0.72) + 0.0015, 0.13 * 0.72], [outer(0.86) + 0.0015, 0.13 * 0.86]], band);
      }
      s.cylinder(0.072, 0.075, 0.008, [0, 0.004, 0], mat, 32);
      rim = outer(1); rimY = 0.13; floorY = 0.008;
      inner = (y) => outer(Math.min(1, Math.max(0, y / 0.13))) - 0.006;
    }
    const see = a.bowl === 'punch';

    // ---- the candy ----
    const cheer = mood.cheer;
    const bright = ['#c8102e', '#ee7a12', '#f4d40c', '#1f5fd1', '#7b2fa8', '#2f9e44', '#d6198a', '#f4f2ec', '#5a3320', '#111214', '#e0c060'];
    const drab = ['#6b4428', '#3b2a22', '#a07a50', '#8a3a28', '#5c5a52'];
    const tone = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#8a7a6a'), (1 - cheer) * 0.28);
    const bars: Piece[] = [], sweets: Piece[] = [], corn: Piece[] = [], pops: Piece[] = [], boxes: Piece[] = [];
    const weights = {
      bars: [0.66, 0.1, 0.06, 0.08, 0.1],
      mixed: [0.36, 0.22, 0.16, 0.14, 0.12],
      lollipops: [0.2, 0.3, 0.04, 0.4, 0.06],
      cheap: [0.08, 0.38, 0.36, 0.04, 0.14],
    }[a.candy];
    const lists = [bars, sweets, corn, pops, boxes];
    const which = () => { let r = random(); for (let i = 0; i < 5; i++) { if ((r -= weights[i]) < 0) return i; } return 0; };
    const add = (kind: number, at: THREE.Vector3, flat: number, colour?: string) => {
      const turn = new THREE.Euler((random() - 0.5) * flat, random() * Math.PI * 2, (random() - 0.5) * flat);
      const c = colour ?? (kind === 2 ? '#ffffff' : pick(bright));
      lists[kind].push({ at, turn, size: 0.9 + random() * 0.25, colour: tone(c) });
    };
    const surface = (r: number) => {
      const t = Math.min(1, r / rim);
      if (a.fill === 'overflowing') return rimY + 0.105 * (1 - t * t) - 0.004;
      if (a.fill === 'heaped') return rimY + 0.045 * (1 - t * t) - 0.008;
      return floorY + (rimY - floorY) * 0.45 + 0.018 * (1 - t * t);
    };
    let wrappers: { geometry: THREE.BufferGeometry; material: THREE.Material; bits: Piece[] } | null = null;
    if (a.fill === 'scraped') {
      const count = 4 + Math.floor(random() * 4);
      for (let i = 0; i < count; i++) {
        const r = random() * inner(floorY + 0.01) * 0.7, th = random() * Math.PI * 2;
        const at = new THREE.Vector3(Math.sin(th) * r, floorY + 0.012, Math.cos(th) * r);
        const kind = random() < 0.5 ? 1 : 4;
        add(kind, at, 0.3, kind === 1 ? pick(['#111214', '#ee7a12', '#e9dfc4']) : pick(drab));
      }
      // The night's evidence: empty wrappers dropped around the bowl.
      const litter = s.material('#ffffff', { roughness: 0.35, metalness: 0.2 });
      const crumple = new THREE.IcosahedronGeometry(0.02, 0);
      const bits: Piece[] = [];
      for (let i = 0, n = 5 + Math.floor(random() * 6); i < n; i++) {
        const th = random() * Math.PI * 2, r = rim + 0.05 + random() * 0.22;
        bits.push({ at: new THREE.Vector3(Math.sin(th) * r, 0.008, Math.cos(th) * r), turn: new THREE.Euler(random() * 6, random() * 6, random() * 6), size: 0.7 + random() * 0.6, colour: tone(pick(bright)) });
      }
      wrappers = { geometry: crumple, material: litter, bits };
    } else {
      const density = mix(0.85, 1.2, mood.density);
      const target = Math.round((see ? 230 : a.fill === 'overflowing' ? 190 : 140) * density * (a.fill === 'half' ? 0.75 : 1));
      const top = surface(0);
      for (let tries = 0, n = 0; tries < 9000 && n < target; tries++) {
        const r = rim * Math.sqrt(random()), th = random() * Math.PI * 2;
        const y = floorY + 0.01 + random() * (top - floorY);
        const s0 = surface(r);
        if (y > s0) continue;
        if (!see && y < s0 - 0.045) continue;
        if (r > inner(Math.min(y, rimY)) - 0.02) continue;
        const kind = which();
        add(kind, new THREE.Vector3(Math.sin(th) * r, y, Math.cos(th) * r), s0 - y < 0.02 ? 0.7 : Math.PI);
        n++;
      }
      if (a.fill === 'overflowing') {
        const spill = 7 + Math.floor(random() * 8);
        for (let i = 0; i < spill; i++) {
          const th = random() * Math.PI * 2, r = rim + 0.05 + random() * 0.16;
          const kind = which() === 3 ? 0 : which();
          add(kind, new THREE.Vector3(Math.sin(th) * r, kind === 0 ? 0.009 : kind === 2 ? 0.006 : 0.011, Math.cos(th) * r), 0.05);
        }
      }
    }
    const instance = (geometry: THREE.BufferGeometry, material: THREE.Material, pieces: Piece[], lift = 0) => {
      if (!pieces.length) { geometry.dispose(); return; }
      const mesh = new THREE.InstancedMesh(geometry, material, pieces.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      pieces.forEach((p, i) => {
        q.setFromEuler(p.turn);
        const at = p.at.clone(); at.y += lift;
        m.compose(at, q, new THREE.Vector3(p.size, p.size, p.size));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, p.colour);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    };
    instance(new THREE.BoxGeometry(0.072, 0.016, 0.034), new THREE.MeshStandardMaterial({ map: tex(wrapperTexture()), roughness: 0.35, metalness: 0.15 }), bars);
    {
      const ball = new THREE.SphereGeometry(0.013, 12, 8); ball.scale(1.25, 0.85, 0.85);
      const left = new THREE.ConeGeometry(0.009, 0.014, 8); left.rotateZ(-Math.PI / 2); left.translate(-0.021, 0, 0);
      const right = new THREE.ConeGeometry(0.009, 0.014, 8); right.rotateZ(Math.PI / 2); right.translate(0.021, 0, 0);
      const merged = mergeGeometries([ball, left, right])!;
      ball.dispose(); left.dispose(); right.dispose();
      instance(merged, new THREE.MeshStandardMaterial({ roughness: 0.22, metalness: 0.25 }), sweets);
    }
    {
      const cone = new THREE.ConeGeometry(0.011, 0.026, 6); cone.scale(1, 1, 0.55);
      instance(cone, new THREE.MeshStandardMaterial({ map: tex(cornTexture()), roughness: 0.5 }), corn);
    }
    {
      // Lollipops stand up out of the pile, stick first.
      const upright = pops.map((p) => ({ ...p, turn: new THREE.Euler((random() - 0.5) * 0.9, 0, (random() - 0.5) * 0.9) }));
      const head = new THREE.SphereGeometry(0.017, 14, 10); head.translate(0, 0.06, 0);
      instance(head, new THREE.MeshStandardMaterial({ roughness: 0.18, metalness: 0.05 }), upright);
      const stick = new THREE.CylinderGeometry(0.0028, 0.0028, 0.075, 6); stick.translate(0, 0.012, 0);
      instance(stick, new THREE.MeshStandardMaterial({ color: '#f4f1e8', roughness: 0.7 }), upright.map((p) => ({ ...p, colour: new THREE.Color('#ffffff') })));
    }
    if (wrappers) {
      // Crushed flat into foil twists.
      wrappers.geometry.scale(1.6, 0.45, 1);
      instance(wrappers.geometry, wrappers.material, wrappers.bits);
    }
    instance(new THREE.BoxGeometry(0.028, 0.038, 0.012), new THREE.MeshStandardMaterial({ roughness: 0.6 }), boxes);

    // ---- what lurks ----
    const twitchers: { object: THREE.Object3D; base: number; phase: number; axis: 'x' | 'z' }[] = [];
    const pileTop = (r: number) => (a.fill === 'scraped' ? floorY + 0.005 : surface(r));
    if (a.lurker === 'hand' || a.lurker === 'both') {
      const rubber = s.material(pick(['#9fb07a', '#c9b49a', '#8e9c6e']), { roughness: 0.55 });
      const nail = s.material('#4a2a24', { roughness: 0.4 });
      const hand = new THREE.Group();
      const r = rim * 0.35, th = random() * Math.PI * 2;
      hand.position.set(Math.sin(th) * r, pileTop(r) - 0.03, Math.cos(th) * r);
      hand.rotation.set(-0.35 + (random() - 0.5) * 0.3, random() * Math.PI * 2, (random() - 0.5) * 0.4);
      const add3 = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; hand.add(mesh); return mesh; };
      add3(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.07, 12), rubber)).position.y = 0.0;
      const palm = add3(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), rubber));
      palm.scale.set(0.04, 0.05, 0.018); palm.position.y = 0.07;
      for (let f = 0; f < 5; f++) {
        const thumb = f === 4;
        const finger = new THREE.Group();
        finger.position.set(thumb ? 0.036 : -0.027 + f * 0.018, thumb ? 0.06 : 0.11, 0);
        finger.rotation.z = thumb ? -0.9 : (f - 1.5) * -0.12;
        finger.rotation.x = 0.35 + random() * 0.4;
        const len = thumb ? 0.035 : 0.042 + (f === 1 || f === 2 ? 0.008 : 0);
        const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.0075, len, 4, 8), rubber);
        seg.position.y = len / 2; seg.castShadow = true; finger.add(seg);
        const tip = new THREE.Group(); tip.position.y = len; tip.rotation.x = 0.5 + random() * 0.4; finger.add(tip);
        const seg2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0068, len * 0.6, 4, 8), rubber);
        seg2.position.y = len * 0.3; seg2.castShadow = true; tip.add(seg2);
        const nailMesh = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), nail);
        nailMesh.scale.set(1, 1.3, 0.5); nailMesh.position.set(0, len * 0.6, 0.004); tip.add(nailMesh);
        hand.add(finger);
        twitchers.push({ object: tip, base: tip.rotation.x, phase: random() * 6, axis: 'x' });
      }
      s.root.add(hand);
    }
    if (a.lurker === 'spider' || a.lurker === 'both') {
      const black = s.material('#141214', { roughness: 0.45 });
      const spider = new THREE.Group();
      // On the pile when there is one; on the floor beside the bowl, creeping off, when it is scraped bare.
      const floor = a.fill === 'scraped';
      const th = random() * Math.PI * 2;
      const r = floor ? rim + 0.16 : a.lurker === 'both' ? rim * 0.5 : rim * 0.3 * random();
      spider.position.set(Math.sin(th) * r, floor ? 0.004 : pileTop(r) + 0.006, Math.cos(th) * r);
      spider.rotation.y = th + (floor ? 0 : random() * 6);
      const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.034, 16, 12), black);
      abdomen.scale.set(1, 0.8, 1.15); abdomen.position.set(0, 0.03, -0.04); abdomen.castShadow = true; spider.add(abdomen);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10), black);
      head.position.set(0, 0.025, 0.012); head.castShadow = true; spider.add(head);
      const eyes = new THREE.MeshStandardMaterial({ color: '#d0202a', emissive: '#ff2a1a', emissiveIntensity: 0.4 + mood.energy * 0.8 });
      for (const side of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 6), eyes); e.position.set(side * 0.008, 0.034, 0.03); spider.add(e); }
      if (random() < 0.5) {
        const mark = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), new THREE.MeshStandardMaterial({ color: '#c8102e', roughness: 0.4 }));
        mark.scale.set(0.8, 0.4, 1.6); mark.position.set(0, 0.057, -0.045); spider.add(mark);
      }
      for (let i = 0; i < 8; i++) {
        const side = i < 4 ? -1 : 1, k = i % 4;
        const leg = new THREE.Group();
        leg.position.set(side * 0.012, 0.022, 0.02 - k * 0.012);
        leg.rotation.y = side * (Math.PI / 2 - 0.8 + k * 0.52);
        const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.045, 0.04), new THREE.Vector3(0, 0.02, 0.085), new THREE.Vector3(0, -0.025, 0.105)]);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 16, 0.0035, 6), black);
        tube.castShadow = true;
        leg.add(tube);
        spider.add(leg);
        twitchers.push({ object: leg, base: leg.rotation.x, phase: random() * 6, axis: 'x' });
      }
      s.root.add(spider);
    }

    // ---- the card ----
    if (a.sign !== 'none') {
      const paper = pick(['#f6f1e2', '#f5a04a', '#efe3c4', '#d9c3f0']);
      const ink = paper === '#f6f1e2' || paper === '#efe3c4' ? pick(['#111214', '#c8501a', '#5a2a8a']) : '#111214';
      const map = tex(lettered(SIGNS[a.sign], ink, paper, random, a.sign === 'happy' || cheer > 0.6));
      const card = new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide });
      const back = s.material(paper, { roughness: 0.9, side: THREE.DoubleSide });
      const w = 0.2, h = 0.125, lean = 0.32;
      const tent = new THREE.Group();
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), card);
      face.position.set(0, Math.cos(lean) * h / 2, Math.sin(lean) * h / 2);
      face.rotation.x = -lean; face.castShadow = true;
      const rear = new THREE.Mesh(new THREE.PlaneGeometry(w, h), back);
      rear.position.set(0, Math.cos(lean) * h / 2, -Math.sin(lean) * h / 2);
      rear.rotation.x = lean; rear.castShadow = true;
      tent.add(face, rear);
      const side = random() < 0.5 ? -1 : 1;
      tent.position.set(side * rim * 0.45, 0, rim + 0.1);
      tent.rotation.y = -side * 0.25;
      s.root.add(tent);
    }

    const energy = mood.energy;
    const thing = s.finish({
      update(_dt, time) {
        for (const t of twitchers) t.object.rotation[t.axis] = t.base + Math.sin(time * (2 + energy * 9) + t.phase) * 0.12 * energy;
      },
    });
    const release = thing.dispose;
    return { ...thing, dispose() { release(); for (const d of disposables) d.dispose(); } };
  },
});
