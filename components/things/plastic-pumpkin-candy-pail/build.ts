import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, clamp01, defineThing, mix, noul, paint, paintHex, score } from '@conjure/kit';

type R = () => number;
interface Piece { at: THREE.Vector3; turn: THREE.Euler; colour: THREE.Color }
const BRIGHT = ['#c8102e', '#ee7a12', '#f4d40c', '#1f5fd1', '#7b2fa8', '#2f9e44', '#d6198a', '#f4f2ec', '#5a3320', '#111214'];

function wrapperTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#c4c4c4'; ctx.fillRect(0, 0, 14, 64); ctx.fillRect(114, 0, 14, 64);
  ctx.fillStyle = '#7d7d7d'; ctx.fillRect(14, 0, 100, 9); ctx.fillRect(14, 55, 100, 9);
  ctx.fillStyle = '#f8f8f8'; ctx.beginPath(); ctx.ellipse(64, 32, 30, 13, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#5a5a5a'; ctx.fillRect(44, 29, 40, 6);
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function cornTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f6c21a'; ctx.fillRect(0, 0, 8, 64); ctx.fillStyle = '#f07a12'; ctx.fillRect(0, 22, 8, 22); ctx.fillStyle = '#fbf6ea'; ctx.fillRect(0, 0, 8, 22);
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Five kinds of loot, each one instanced mesh. */
function loot(parent: THREE.Object3D, lists: Piece[][]) {
  const geos: THREE.BufferGeometry[] = [];
  geos.push(new THREE.BoxGeometry(0.06, 0.014, 0.028));
  {
    const ball = new THREE.SphereGeometry(0.011, 10, 7); ball.scale(1.25, 0.85, 0.85);
    const l = new THREE.ConeGeometry(0.008, 0.012, 7); l.rotateZ(-Math.PI / 2); l.translate(-0.018, 0, 0);
    const r = new THREE.ConeGeometry(0.008, 0.012, 7); r.rotateZ(Math.PI / 2); r.translate(0.018, 0, 0);
    geos.push(mergeGeometries([ball, l, r])!); ball.dispose(); l.dispose(); r.dispose();
  }
  { const c = new THREE.ConeGeometry(0.009, 0.022, 6); c.scale(1, 1, 0.55); geos.push(c); }
  { const head = new THREE.SphereGeometry(0.014, 12, 8); head.translate(0, 0.05, 0); geos.push(head); }
  geos.push(new THREE.BoxGeometry(0.024, 0.032, 0.01));
  const mats = [
    new THREE.MeshStandardMaterial({ map: wrapperTexture(), roughness: 0.35, metalness: 0.15 }),
    new THREE.MeshStandardMaterial({ roughness: 0.22, metalness: 0.25 }),
    new THREE.MeshStandardMaterial({ map: cornTexture(), roughness: 0.5 }),
    new THREE.MeshStandardMaterial({ roughness: 0.2 }),
    new THREE.MeshStandardMaterial({ roughness: 0.6 }),
  ];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  lists.forEach((list, k) => {
    if (!list.length) { geos[k].dispose(); mats[k].map?.dispose(); mats[k].dispose(); return; }
    const mesh = new THREE.InstancedMesh(geos[k], mats[k], list.length);
    list.forEach((p, i) => { q.setFromEuler(p.turn); m.compose(p.at, q, one); mesh.setMatrixAt(i, m); mesh.setColorAt(i, k === 2 ? new THREE.Color('#fff') : p.colour); });
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    if (k === 3) {
      // Lollipop sticks, white, on the same matrices.
      const stick = new THREE.CylinderGeometry(0.0024, 0.0024, 0.06, 5); stick.translate(0, 0.01, 0);
      const sticks = new THREE.InstancedMesh(stick, new THREE.MeshStandardMaterial({ color: '#f4f1e8', roughness: 0.7 }), list.length);
      for (let i = 0; i < list.length; i++) { mesh.getMatrixAt(i, m); sticks.setMatrixAt(i, m); }
      sticks.castShadow = true;
      parent.add(sticks);
    }
  });
}

export default defineThing({
  questions: {
    face: choice('What face is moulded on the pail?', {
      classic: 'The classic: triangle eyes and nose over a grin with two square teeth.',
      toothy: 'A huge sawtooth grin full of jagged teeth under squinting eyes.',
      cute: 'A cute round-eyed face with shiny highlights, a tiny smile and pink cheeks.',
      scary: 'A scowl: slanted angry eyes and a jagged frown with fangs.',
    }),
    colour: paint('What colour is the plastic?', ['orange', 'lime', 'purple', 'black', 'white', 'pink', 'turquoise', 'red']),
    fill: choice('How much loot is in it?', {
      empty: 'Empty: the night has only just begun.',
      half: 'Half full: a few streets done, a good rattle of candy.',
      overflowing: 'Overflowing: crammed past the rim, a triumphant haul.',
    }),
    lightup: noul('Does it have a battery light-up insert that makes the whole pail glow?'),
    state: choice('What has happened to it?', {
      upright: 'Standing upright, handle up, ready to go.',
      tipped: 'Dropped and tipped over on its side, candy spilling out across the ground.',
      dumped: 'Turned upside down, the haul dumped out and sorted into piles beside it.',
    }),
    size: score('How big is it?', ['A tiny toddler pail', 'The classic size', 'A jumbo bucket']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const glow = clamp01(0.25 + 0.75 * (0.4 * mood.cheer + 0.2 * mood.warmth + 0.4 * mood.energy));
    const Hp = 0.19, ribs = 8;
    const radius = (v: number, th: number) => {
      let r = 0.082 + 0.036 * Math.sin(Math.PI * (0.12 + 0.78 * v));
      if (v < 0.08) r *= 0.82 + 0.18 * Math.sin(Math.PI / 2 * v / 0.08);
      r *= 1 - 0.04 * Math.pow(1 - Math.abs(Math.cos(ribs * th / 2)), 3) * Math.sin(Math.PI * Math.min(1, v * 1.05));
      return r;
    };
    const shape = (u: number, v: number, t: THREE.Vector3, k = 1, lift = 0) => {
      const th = Math.PI * 2 * u + Math.PI;
      const r = radius(v, th) * k;
      return t.set(r * Math.sin(th), lift + v * (Hp - lift), r * Math.cos(th));
    };

    // ---- the moulded face ----
    const body = paintHex(a.colour);
    const ink = a.colour === 'black' ? '#ee7a12' : '#141414';
    const W = 1024, Hc = 256;
    const colour = document.createElement('canvas'); colour.width = W; colour.height = Hc;
    const glowMap = document.createElement('canvas'); glowMap.width = W; glowMap.height = Hc;
    const c = colour.getContext('2d')!, e = glowMap.getContext('2d')!;
    c.fillStyle = body; c.fillRect(0, 0, W, Hc);
    e.fillStyle = '#fff'; e.fillRect(0, 0, W, Hc);
    // Moulding seams and a little shine streak per rib.
    for (let k = 0; k < ribs; k++) {
      const x = ((k + 0.5) / ribs + 0.5) % 1 * W;
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x - 3, 0, 6, Hc);
    }
    const vF = 0.5;
    const p0 = shape(0.5, vF, new THREE.Vector3()), pu = shape(0.52, vF, new THREE.Vector3()), pv = shape(0.5, vF + 0.02, new THREE.Vector3());
    const pxU = W * 0.02 / p0.distanceTo(pu), pxV = Hc * 0.02 / p0.distanceTo(pv);
    const U = 0.052;
    const P = (x: number, y: number): [number, number] => [W / 2 + x * U * pxU, (1 - vF) * Hc - y * U * pxV];
    const both = (draw: (ctx: CanvasRenderingContext2D) => void, col: string, lit: string) => {
      for (const [ctx, f] of [[c, col], [e, lit]] as const) { ctx.fillStyle = f; ctx.strokeStyle = f; ctx.beginPath(); draw(ctx); }
    };
    const poly = (pts: [number, number][], col = ink, lit = '#000') => both((ctx) => { pts.forEach((p, i) => (i ? ctx.lineTo(...P(...p)) : ctx.moveTo(...P(...p)))); ctx.closePath(); ctx.fill(); }, col, lit);
    const oval = (x: number, y: number, rx: number, ry: number, col = ink, lit = '#000') => both((ctx) => { ctx.ellipse(...P(x, y), rx * U * pxU, ry * U * pxV, 0, 0, 7); ctx.fill(); }, col, lit);
    const mirror = (pts: [number, number][]) => pts.map(([x, y]) => [-x, y] as [number, number]);
    if (a.face === 'classic') {
      const eye: [number, number][] = [[-0.85, 0.15], [-0.2, 0.15], [-0.52, 0.75]];
      poly(eye); poly(mirror(eye)); poly([[-0.15, -0.12], [0.15, -0.12], [0, 0.15]]);
      both((ctx) => { ctx.moveTo(...P(-1, -0.3)); ctx.quadraticCurveTo(...P(0, -0.75), ...P(1, -0.3)); ctx.quadraticCurveTo(...P(0, -1.35), ...P(-1, -0.3)); ctx.fill(); }, ink, '#000');
      poly([[-0.35, -0.5], [-0.12, -0.52], [-0.12, -0.78], [-0.35, -0.74]], body, '#fff');
      poly([[0.12, -0.84], [0.35, -0.82], [0.35, -0.62], [0.12, -0.66]], body, '#fff');
    } else if (a.face === 'toothy') {
      const eye: [number, number][] = [[-0.9, 0.35], [-0.2, 0.2], [-0.4, 0.6]];
      poly(eye); poly(mirror(eye));
      const pts: [number, number][] = [];
      for (let i = 0; i <= 10; i++) { const x = -1.05 + i * 0.21; pts.push([x, -0.15 - Math.sin(i / 10 * Math.PI) * 0.25 - (i % 2 ? 0.16 : 0)]); }
      for (let i = 10; i >= 0; i--) { const x = -1.05 + i * 0.21; pts.push([x, -0.15 - Math.sin(i / 10 * Math.PI) * 0.75 + (i % 2 ? 0.16 : 0)]); }
      poly(pts);
    } else if (a.face === 'cute') {
      oval(-0.48, 0.3, 0.26, 0.3); oval(0.48, 0.3, 0.26, 0.3);
      oval(-0.4, 0.4, 0.08, 0.09, '#ffffff', '#000'); oval(0.56, 0.4, 0.08, 0.09, '#ffffff', '#000');
      both((ctx) => { ctx.moveTo(...P(-0.28, -0.35)); ctx.quadraticCurveTo(...P(0, -0.65), ...P(0.28, -0.35)); ctx.lineWidth = 0.09 * U * pxU; ctx.lineCap = 'round'; ctx.stroke(); }, ink, '#000');
      oval(-0.85, -0.25, 0.2, 0.12, '#f08aa8', '#888'); oval(0.85, -0.25, 0.2, 0.12, '#f08aa8', '#888');
    } else {
      const eye: [number, number][] = [[-0.9, 0.62], [-0.15, 0.3], [-0.3, 0.05], [-0.8, 0.2]];
      poly(eye); poly(mirror(eye));
      const pts: [number, number][] = [];
      for (let i = 0; i <= 8; i++) { const x = -0.95 + i * 0.2375; pts.push([x, -0.75 + Math.sin(i / 8 * Math.PI) * 0.35 + (i % 2 ? -0.08 : 0.06)]); }
      pts.push([0.95, -0.95], [0.5, -0.75], [0, -0.8], [-0.5, -0.75], [-0.95, -0.95]);
      poly(pts);
      poly([[-0.42, -0.45], [-0.2, -0.47], [-0.32, -0.78]], body, '#fff');
      poly([[0.42, -0.45], [0.2, -0.47], [0.32, -0.78]], body, '#fff');
    }
    // Stamped on the base, a scuff or two from the pavement.
    for (let i = 0; i < Math.round(mood.wear * 30); i++) { c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1.5; c.beginPath(); const x = random() * W, y = Hc * (0.6 + random() * 0.4); c.moveTo(x, y); c.lineTo(x + (random() - 0.5) * 30, y + (random() - 0.5) * 10); c.stroke(); }
    const map = new THREE.CanvasTexture(colour); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
    const glowTex = new THREE.CanvasTexture(glowMap); glowTex.colorSpace = THREE.SRGBColorSpace;
    const gitd = a.colour === 'lime';
    const emissiveLevel = a.lightup ? mix(0.25, 1.1, glow) : gitd ? mix(0.08, 0.35, glow) : 0;
    const plastic = new THREE.MeshStandardMaterial({ map, roughness: 0.32, emissive: new THREE.Color(body).lerp(new THREE.Color('#ffd27a'), a.lightup ? 0.35 : 0), emissiveMap: glowTex, emissiveIntensity: emissiveLevel });
    const insideMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(body).multiplyScalar(0.7), roughness: 0.4, side: THREE.DoubleSide, emissive: new THREE.Color(body), emissiveIntensity: a.lightup ? emissiveLevel * 1.4 : emissiveLevel * 0.6 });

    // ---- the pail ----
    const pail = new THREE.Group();
    const shell = s.surface((u, v, t) => shape(u, v, t), plastic, { segments: [96, 24], wrap: true });
    const inner = s.surface((u, v, t) => shape(u, v, t, 0.94, 0.008), insideMat, { segments: [48, 12], wrap: true, flip: true });
    const base = s.cylinder(radius(0, 0) * 0.84, radius(0, 0) * 0.84, 0.004, [0, 0.002, 0], s.material(new THREE.Color(body).multiplyScalar(0.85), { roughness: 0.4 }), 32);
    // The inside floor, seen from above.
    pail.add(s.cylinder(radius(0, 0) * 0.8, radius(0, 0) * 0.8, 0.002, [0, 0.0055, 0], insideMat, 32));
    const rimR = radius(1, 0);
    const rim = s.ring(rimR - 0.001, 0.0065, [0, Hp, 0], plastic.clone());
    (rim.material as THREE.MeshStandardMaterial).map = null;
    (rim.material as THREE.MeshStandardMaterial).color = new THREE.Color(body);
    (rim.material as THREE.MeshStandardMaterial).emissiveMap = null;
    rim.rotation.x = Math.PI / 2;
    const handleMat = s.material('#151515', { roughness: 0.4 });
    const handle = new THREE.Group();
    handle.position.set(0, Hp - 0.016, 0);
    const pts: [number, number, number][] = [];
    const hr = rimR + 0.006, hh = 0.13;
    for (let i = 0; i <= 16; i++) { const t = Math.PI * (1 - i / 16); pts.push([hr * Math.cos(t), hh * Math.sin(t), 0]); }
    const tube = s.tube(pts, 0.0055, handleMat);
    const knobs = [-1, 1].map((x) => s.cylinder(0.011, 0.011, 0.012, [x * (hr - 0.002), 0, 0], handleMat, 12));
    for (const k of knobs) k.rotation.z = Math.PI / 2;
    handle.add(tube, ...knobs);
    for (const m of [shell, inner, base, rim]) pail.add(m);
    pail.add(handle);
    s.root.add(pail);
    let lightMesh: THREE.Mesh | null = null;
    if (a.lightup) {
      lightMesh = s.cylinder(0.03, 0.034, 0.03, [0, 0.02, 0], new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#ffe7a0', emissiveIntensity: mix(0.4, 2, glow) }), 16);
      pail.add(lightMesh);
    }

    // ---- the loot ----
    const lists: Piece[][] = [[], [], [], [], []];
    const weights = [0.42, 0.22, 0.12, 0.12, 0.12];
    const kind = () => { let r = random(); for (let i = 0; i < 5; i++) if ((r -= weights[i]) < 0) return i; return 0; };
    const piece = (k: number, at: THREE.Vector3, flat: number, upright = false) => {
      const turn = upright ? new THREE.Euler((random() - 0.5) * 0.8, 0, (random() - 0.5) * 0.8) : new THREE.Euler((random() - 0.5) * flat, random() * 6, (random() - 0.5) * flat);
      lists[k].push({ at, turn, colour: new THREE.Color(pick(BRIGHT)).lerp(new THREE.Color('#8a7a6a'), (1 - mood.cheer) * 0.25) });
    };
    const inside: Piece[][] = [[], [], [], [], []];
    const insidePiece = (k: number, at: THREE.Vector3, flat: number) => {
      const turn = k === 3 ? new THREE.Euler((random() - 0.5) * 0.8, 0, (random() - 0.5) * 0.8) : new THREE.Euler((random() - 0.5) * flat, random() * 6, (random() - 0.5) * flat);
      inside[k].push({ at, turn, colour: new THREE.Color(pick(BRIGHT)).lerp(new THREE.Color('#8a7a6a'), (1 - mood.cheer) * 0.25) });
    };
    const level = a.fill === 'empty' ? 0 : a.fill === 'half' ? Hp * 0.5 : Hp + 0.045;
    if (a.fill !== 'empty' && a.state !== 'dumped') {
      const target = a.fill === 'half' ? 60 : 110;
      for (let tries = 0, n = 0; tries < 5000 && n < target; tries++) {
        const r = rimR * Math.sqrt(random()), th = random() * Math.PI * 2;
        const top = level * (a.fill === 'overflowing' ? 1 - 0.75 * (r / rimR) ** 2 : 1) + (a.fill === 'overflowing' ? 0.03 : 0);
        const y = 0.012 + random() * (Math.max(top, 0.02) - 0.012);
        if (y < top - 0.05) continue;
        if (r > radius(Math.min(1, y / Hp), th) * 0.94 - 0.016) continue;
        const at = new THREE.Vector3(Math.sin(th) * r, y, Math.cos(th) * r);
        // Tipped: what is left inside has slid to the low side, which is +x.
        if (a.state === 'tipped' && at.x < 0.01) continue;
        insidePiece(kind(), at, top - y < 0.02 ? 0.7 : Math.PI);
        n++;
      }
    }
    if (a.fill === 'empty' && random() < 0.6) insidePiece(1, new THREE.Vector3(0.01, 0.016, 0.02), 0.3);
    loot(pail, inside);

    // ---- what it is doing ----
    if (a.state === 'upright') {
      handle.rotation.x = -(0.15 + random() * 0.6);
    } else if (a.state === 'tipped') {
      handle.rotation.x = -Math.PI / 2 + (random() - 0.5) * 0.3;
      pail.rotation.z = -Math.PI / 2 + 0.12;
      pail.rotation.y = (random() - 0.5) * 0.5;
      pail.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(shell);
      pail.position.y = -box.min.y;
      const mouth = new THREE.Vector3(Hp, rimR * 0.2, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), pail.rotation.y);
      const spill = a.fill === 'empty' ? 2 : a.fill === 'half' ? 26 : 50;
      for (let i = 0; i < spill; i++) {
        const d = 0.03 + Math.pow(random(), 0.7) * (a.fill === 'overflowing' ? 0.42 : 0.3);
        const spread = (random() - 0.5) * (0.4 + d * 1.6);
        const dir = pail.rotation.y + spread;
        const k = kind() === 3 ? 0 : kind();
        piece(k, new THREE.Vector3(mouth.x + Math.cos(dir) * d, k === 0 ? 0.007 : k === 2 ? 0.006 : k === 4 ? 0.005 : 0.009, -Math.sin(dir) * d + mouth.z * 0.2), 0.08);
        if (k === 4) lists[4][lists[4].length - 1].turn = new THREE.Euler(-Math.PI / 2, 0, random() * 6);
      }
    } else {
      handle.rotation.x = Math.PI / 2 - 0.08;
      pail.rotation.z = Math.PI;
      // The moulded maker's ring on the base, so the upturned bottom reads as a bottom.
      const ring = s.ring(radius(0, 0) * 0.5, 0.003, [0, -0.001, 0], s.material(new THREE.Color(body).multiplyScalar(0.7)));
      ring.rotation.x = Math.PI / 2; pail.add(ring);
      pail.position.x = -0.07;
      pail.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(shell);
      pail.position.y = -box.min.y;
      // The haul, sorted: one pile per kind in a row in front.
      const amount = a.fill === 'empty' ? 0.3 : a.fill === 'half' ? 0.7 : 1.2;
      [0, 1, 2, 4, 3].forEach((k, col) => {
        const cx = -0.22 + col * 0.11 + 0.07, cz = 0.3 + (col % 2) * 0.05;
        const n = Math.round((k === 0 ? 14 : 8) * amount);
        for (let i = 0; i < n; i++) {
          const r = 0.035 * Math.sqrt(random()), th = random() * 6;
          piece(k, new THREE.Vector3(cx + Math.cos(th) * r, k === 3 ? 0.0 : 0.007 + (1 - r / 0.035) * 0.02 * random(), cz + Math.sin(th) * r), 0.4, false);
          if (k === 3) lists[3][lists[3].length - 1].turn = new THREE.Euler(Math.PI / 2 - 0.05, 0, Math.PI / 2 + (random() - 0.5) * 0.6);
          if (k === 3) lists[3][lists[3].length - 1].at.y = 0.014;
        }
      });
    }
    loot(s.root, lists);

    const scale = mix(0.72, 1.45, a.size);
    const all = new THREE.Group(); all.add(...s.root.children); all.scale.setScalar(scale); s.root.add(all);
    const energy = mood.energy;
    return s.finish({
      update(_dt, time) {
        if (a.lightup) plastic.emissiveIntensity = emissiveLevel * (1 + Math.sin(time * (2 + energy * 6)) * 0.08 * energy);
      },
    });
  },
});
