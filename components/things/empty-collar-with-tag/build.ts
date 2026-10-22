import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { arc, ball, cyl, paint, tube, type V3 } from './parts';

const NAMES = ['BISCUIT', 'MOCHI', 'PICKLE', 'DUKE', 'LUNA', 'GIZMO', 'OLIVE', 'TANK', 'PEANUT', 'SOCKS', 'BEAR', 'DAISY'];

/** A flat strap standing on its edge, swept along a path in the x-z plane. */
function strap(parent: THREE.Object3D, material: THREE.Material, path: readonly (readonly [number, number])[], width: number, thickness: number, y0 = 0) {
  const positions: number[] = [], index: number[] = [];
  const n = path.length;
  for (let i = 0; i < n; i++) {
    const [x, z] = path[i], [ax, az] = path[Math.max(0, i - 1)], [bx, bz] = path[Math.min(n - 1, i + 1)];
    const tx = bx - ax, tz = bz - az, l = Math.hypot(tx, tz) || 1;
    const nx = tz / l * thickness / 2, nz = -tx / l * thickness / 2;
    const o = [x + nx, z + nz], inn = [x - nx, z - nz], b = y0, t = y0 + width;
    // Four faces with their own vertices so the edges stay crisp.
    positions.push(o[0], b, o[1], o[0], t, o[1], o[0], t, o[1], inn[0], t, inn[1], inn[0], t, inn[1], inn[0], b, inn[1], inn[0], b, inn[1], o[0], b, o[1]);
  }
  for (let i = 0; i < n - 1; i++) for (let f = 0; f < 4; f++) {
    const a = i * 8 + f * 2, c = a + 8;
    index.push(a, a + 1, c, a + 1, c + 1, c);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function disc(text: string[], metal: string, wear: number, random: () => number, shape: 'round' | 'bone') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 160;
  const g = canvas.getContext('2d')!;
  g.fillStyle = metal; g.fillRect(0, 0, 160, 160);
  const sheen = g.createLinearGradient(0, 0, 160, 160);
  sheen.addColorStop(0, 'rgba(255,255,255,0.35)'); sheen.addColorStop(0.5, 'rgba(255,255,255,0)'); sheen.addColorStop(1, 'rgba(0,0,0,0.18)');
  g.fillStyle = sheen; g.fillRect(0, 0, 160, 160);
  g.fillStyle = 'rgba(30,30,34,0.9)'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = text.length, span = shape === 'bone' ? 150 : 120;
  text.forEach((line, i) => {
    const size = Math.min(lines === 1 ? 44 : 26, (span / Math.max(3, line.length)) * 1.55);
    g.font = `bold ${size}px monospace`;
    g.fillText(line, 80, 84 + (i - (lines - 1) / 2) * 30);
  });
  for (let i = 0; i < (text.length ? wear * 16 : 14 + wear * 20); i++) {
    g.strokeStyle = `rgba(${random() < 0.5 ? '255,255,255' : '40,40,44'},${0.25 + random() * 0.35})`; g.lineWidth = 0.8 + random() * 1.4;
    const x = random() * 160, y = random() * 160; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (random() - 0.5) * 80, y + (random() - 0.5) * 50); g.stroke();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function card(lines: string[], paper: string, ink: string, w = 256, h = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d')!;
  g.fillStyle = paper; g.fillRect(0, 0, w, h);
  g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((line, i) => { g.font = `bold ${Math.min(h / (lines.length + 1), (w / Math.max(4, line.length)) * 1.5)}px monospace`; g.fillText(line, w / 2, ((i + 1) * h) / (lines.length + 1)); });
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, g, canvas };
}

export default defineThing({
  questions: {
    size: choice('Whose collar was it?', {
      kitten: 'A kitten: a thin breakaway band no bigger than a bracelet, with a round bell.',
      medium: 'A middling dog: ordinary nylon webbing with a plastic clip and a steel ring.',
      mastiff: 'A giant: wide heavy leather with a brass buckle and studs.',
      flea: 'A pale plastic flea collar, the long spare end never trimmed.',
    }),
    colour: choice('What colour is the strap?', {
      red: 'Fire-engine red.',
      blue: 'Royal blue.',
      pink: 'Bubblegum pink.',
      green: 'Grass green.',
      tan: 'Tan saddle leather.',
      black: 'Black.',
    }),
    state: choice('How was it left?', {
      buckled: 'Still buckled in a neat circle, the shape of the neck it fitted.',
      open: 'Unbuckled and fallen open in a loose curl.',
      cut: 'Cut through with scissors in a hurry, the buckle still fastened.',
    }),
    placement: choice('Where is it?', {
      lying: 'Lying on the table top.',
      hook: 'Hung on a peg board by the door, beside two empty pegs.',
    }),
    tag: choice('What does the tag say?', {
      name: 'Just a name, deeply stamped.',
      call: 'IF FOUND CALL and a number.',
      blank: 'Nothing any more: scratched blank by years of rattling on a bowl.',
      none: 'There is no name tag, only the vaccination disc.',
    }),
    with: choice('What lies with it?', {
      nothing: 'Nothing. Just the collar.',
      leash: 'Its leash, coiled.',
      paw: 'A clay paw print impression with a ribbon.',
      fur: 'A clipped lock of fur in a small plastic bag.',
      puppy: 'A new puppy collar, tiny, still on its shop card.',
    }),
    fur: choice('What colour are the hairs caught in the buckle?', {
      white: 'White.',
      ginger: 'Ginger.',
      black: 'Black.',
      grey: 'Grizzled grey.',
      golden: 'Golden.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const kitten = a.size === 'kitten', mastiff = a.size === 'mastiff', flea = a.size === 'flea';
    const R = kitten ? 0.042 : mastiff ? 0.1 : flea ? 0.055 : 0.07;
    const w = kitten ? 0.011 : mastiff ? 0.042 : flea ? 0.009 : 0.022;
    const th = mastiff ? 0.0055 : flea ? 0.003 : 0.003;
    const hue = { red: '#cf2a2a', blue: '#2450b8', pink: '#ee6fa5', green: '#3f9a45', tan: '#a8703c', black: '#27272a' }[a.colour];
    const strapHex = flea ? '#e6e4d6' : new THREE.Color(hue).lerp(new THREE.Color('#9a9488'), mood.wear * 0.4).getStyle();
    const strapMat = s.material(strapHex, { roughness: mastiff ? 0.6 : 0.9 });
    const strapDark = paint(new THREE.Color(strapHex).multiplyScalar(0.55), { roughness: 0.9 });
    const brass = mastiff || a.colour === 'tan';
    const metal = paint(brass ? '#c9a24a' : '#cfd3d6', { metalness: 0.9, roughness: mix(0.22, 0.5, mood.wear) });
    const furHex = { white: '#f3f0e8', ginger: '#cf7a2e', black: '#1f1d1c', grey: '#8b8b8b', golden: '#d9ae5c' }[a.fur];
    const furMat = paint(furHex, { roughness: 1 });
    const name = NAMES[Math.floor(random() * NAMES.length)];

    const collar = new THREE.Group();
    const P = (theta: number, r: number): [number, number] => [Math.sin(theta) * r, Math.cos(theta) * r];
    const overlap = flea ? 2.1 : mastiff ? 0.75 : 0.6;
    const cutAt = Math.PI * (0.55 + random() * 0.25);
    const radius = (theta: number) => {
      if (a.state === 'open') { const u = Math.abs(theta - Math.PI) / Math.PI; return R * (1.02 + 0.5 * u * u * u) * (1 + 0.06 * Math.sin(theta * 3)); }
      return R + th * 1.15 * Math.max(0, theta - (Math.PI * 2 - 0.5)) / 0.5 * (theta > Math.PI * 2 - 0.5 ? 1 : 0) + (a.state === 'cut' && theta > cutAt ? 0.016 * Math.exp(-(theta - cutAt) * 3) : 0);
    };
    const from = a.state === 'open' ? 0.5 : 0, to = a.state === 'open' ? Math.PI * 2 - 0.42 : Math.PI * 2 + overlap;
    const run = (t0: number, t1: number) => { const pts: [number, number][] = []; const steps = Math.max(8, Math.round((t1 - t0) * 16)); for (let i = 0; i <= steps; i++) { const t = mix(t0, t1, i / steps); pts.push(P(t, radius(t))); } return pts; };
    if (a.state === 'cut') { strap(collar, strapMat, run(from, cutAt - 0.05), w, th); strap(collar, strapMat, run(cutAt + 0.05, to), w, th); }
    else strap(collar, strapMat, run(from, to), w, th);
    // Frayed threads at a cut, and along the edge with wear.
    const threads = (theta: number, count: number) => { for (let i = 0; i < count; i++) { const [x, z] = P(theta, radius(theta)); const d = (random() - 0.5) * 0.03; tube(collar, strapMat, [[x, w * random(), z], [x + Math.cos(theta) * d * 0.5 + (random() - 0.5) * 0.006, w * random(), z - Math.sin(theta) * d * 0.5 + (random() - 0.5) * 0.006], [x + Math.cos(theta) * d, w * random() * 0.6, z - Math.sin(theta) * d]], 0.0006); } };
    if (a.state === 'cut') { threads(cutAt - 0.05, 5); threads(cutAt + 0.05, 5); }
    if (!flea && !mastiff) for (let i = 0; i < mood.wear * 9; i++) threads(from + 0.4 + random() * (Math.PI * 2 - 1), 1);

    // Tail end: adjustment holes, stitching or studs.
    const tailFrom = a.state === 'open' ? to - 0.9 : Math.PI * 2 - 0.1, tailTo = to - 0.08;
    const outward = (theta: number, lift: number, y: number): V3 => { const [x, z] = P(theta, radius(theta) + th / 2 + lift); return [x, y, z]; };
    if (!kitten) for (let i = 0; i < (flea ? 9 : 5); i++) {
      const t = mix(tailFrom + 0.12, tailTo, i / (flea ? 8 : 4));
      const hole = cyl(collar, paint('#141414'), w * 0.11, w * 0.11, 0.0012, outward(t, 0.0002, w / 2), [0, 0, 0], 8);
      hole.rotation.set(Math.PI / 2, 0, 0); hole.rotation.y = 0; hole.lookAt(0, w / 2, 0); hole.rotateX(Math.PI / 2);
    }
    if (mastiff) for (let i = 0; i < 9; i++) {
      const t = 0.9 + i * 0.5;
      if (a.state === 'cut' && Math.abs(t - cutAt) < 0.15) continue;
      ball(collar, metal, outward(t, 0.001, w / 2), [0.006, 0.006, 0.006], [0, 0, 0], 10);
    }
    if (flea) for (let i = 0; i < 24; i++) { const t = random() * Math.PI * 2; ball(collar, paint('#ffffff', { roughness: 1 }), outward(t, 0.0003, random() * w), [0.0012, 0.0012, 0.0012], [0, 0, 0], 5); }

    // Fastening at theta = from.
    const fx = P(from, radius(from) + th * 0.5);
    const buckle = new THREE.Group();
    buckle.position.set(fx[0], w / 2, fx[1]);
    buckle.rotation.y = from;
    collar.add(buckle);
    if (kitten || a.size === 'medium') {
      // Side-release plastic clip.
      const clip = paint('#1d1d20', { roughness: 0.4 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(w * 1.5, w * 1.15, 0.007), clip); body.castShadow = true; buckle.add(body);
      for (const y of [-1, 1]) { const tooth = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, w * 0.16, 0.009), paint('#3a3a3f')); tooth.position.set(w * 0.2, y * w * 0.45, 0); buckle.add(tooth); }
    } else if (mastiff) {
      for (const y of [-1, 1]) cyl(buckle, metal, 0.003, 0.003, w * 1.3, [0, y * w * 0.62, 0.003], [0, 0, Math.PI / 2], 8);
      for (const x of [-1, 1]) cyl(buckle, metal, 0.003, 0.003, w * 1.24, [x * w * 0.65, 0, 0.003], [0, 0, 0], 8);
      cyl(buckle, metal, 0.002, 0.002, w * 0.7, [w * 0.3, 0, 0.006], [0, 0, Math.PI / 2], 6);
      // Keeper loop a little further on.
      const k = outward(from + 0.42, 0.002, w / 2);
      const keeper = new THREE.Mesh(new THREE.BoxGeometry(0.012, w * 1.12, 0.006), strapDark); keeper.position.set(...k); keeper.rotation.y = from + 0.42; keeper.castShadow = true; collar.add(keeper);
    } else {
      const loop = new THREE.Mesh(new THREE.BoxGeometry(0.01, w * 1.5, 0.006), paint('#f4f2e6', { roughness: 0.5 })); loop.castShadow = true; buckle.add(loop);
    }
    // Hairs caught in the fastening.
    for (let i = 0; i < 3 + Math.round(mood.wear * 6 + random() * 2); i++) {
      const l = 0.012 + random() * (mastiff ? 0.035 : 0.02), dir = from + (random() - 0.5) * 1.6;
      const b: V3 = [fx[0] + (random() - 0.5) * 0.008, w * (0.2 + random() * 0.7), fx[1] + (random() - 0.5) * 0.004];
      tube(collar, furMat, [b, [b[0] + Math.sin(dir) * l * 0.5, b[1] + (random() - 0.3) * l * 0.5, b[2] + Math.cos(dir) * l * 0.5], [b[0] + Math.sin(dir + 0.5) * l, Math.max(0.0008, b[1] + (random() - 0.6) * l), b[2] + Math.cos(dir + 0.5) * l]], 0.0005);
    }

    // The ring and what hangs from it.
    const thetaD = a.state === 'open' ? from + 0.75 : Math.PI * 2 - 0.5;
    const ringR = kitten ? 0.006 : mastiff ? 0.014 : 0.009;
    const tags = new THREE.Group();
    const d0 = P(thetaD, radius(thetaD) + th / 2);
    tags.position.set(d0[0], 0, d0[1]);
    tags.rotation.y = thetaD;
    collar.add(tags);
    if (!flea) {
      const ring = arc(tags, metal, ringR, ringR * 0.16, Math.PI * 2, [0, w * 0.3, ringR * 0.75], [-1.05, 0, 0]);
      ring.castShadow = true;
      const tagR = kitten ? 0.011 : mastiff ? 0.021 : 0.016;
      const hang: { r: number; tilt: number; side: number }[] = [];
      if (a.tag !== 'none') hang.push({ r: tagR, tilt: 0, side: random() < 0.5 ? -1 : 1 });
      const out0 = ringR * 1.6;
      if (a.tag !== 'none') {
        const text = a.tag === 'name' ? [name] : a.tag === 'call' ? ['IF FOUND', 'CALL', `555-01${10 + Math.floor(random() * 89)}`] : [];
        const bone = !kitten && random() < 0.4;
        const top = new THREE.MeshStandardMaterial({ map: disc(text, brass ? '#d9b65a' : '#d5d9dc', mood.wear, random, bone ? 'bone' : 'round'), metalness: 0.55, roughness: mix(0.3, 0.6, mood.wear) });
        const tag = new THREE.Group();
        if (bone) {
          const shape = new THREE.Shape();
          const bw = tagR * 1.5, bh = tagR * 0.55, k = tagR * 0.5;
          shape.moveTo(-bw + k, -bh);
          shape.lineTo(bw - k, -bh); shape.absarc(bw - k * 0.3, -bh - k * 0.1, k, Math.PI, Math.PI * 2.4, false); shape.absarc(bw - k * 0.3, bh + k * 0.1, k, -Math.PI * 0.4, Math.PI, false);
          shape.lineTo(-bw + k, bh); shape.absarc(-bw + k * 0.3, bh + k * 0.1, k, 0, Math.PI * 1.4, false); shape.absarc(-bw + k * 0.3, -bh - k * 0.1, k, Math.PI * 0.6, Math.PI * 2, false);
          const geometry = new THREE.ShapeGeometry(shape, 8);
          const uv = geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / (tagR * 4) + 0.5, uv.getY(i) / (tagR * 4) + 0.5);
          const flat = new THREE.Mesh(geometry, top); flat.rotation.x = -Math.PI / 2; flat.position.y = 0.0016; tag.add(flat);
          const under = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.0014, bevelEnabled: false }), metal); under.rotation.x = -Math.PI / 2; under.castShadow = true; tag.add(under);
          tag.position.set(hang[0].side * tagR * 0.5, 0.0006, out0 + tagR * 1.25);
        } else {
          cyl(tag, metal, tagR, tagR, 0.0015, [0, 0.00075, 0], [0, 0, 0], 28);
          const flat = new THREE.Mesh(new THREE.CircleGeometry(tagR * 0.97, 28), top); flat.rotation.x = -Math.PI / 2; flat.position.y = 0.0017; tag.add(flat);
          tag.position.set(hang[0].side * tagR * 0.45, 0.0006, out0 + tagR * 0.95);
        }
        tag.rotation.y = hang[0].side * -0.3 + (random() - 0.5) * 0.3;
        tags.add(tag);
      }
      // Vaccination disc (or a kitten's bell): a small bright anodised shape.
      const side = hang.length ? -hang[0].side : 1;
      if (kitten) {
        const bell = paint('#e3b93c', { metalness: 0.85, roughness: 0.25 });
        ball(tags, bell, [side * 0.009, 0.0075, out0 + 0.006], [0.0075, 0.0075, 0.0075], [0, 0, 0], 16);
        cyl(tags, paint('#2a2208'), 0.0012, 0.0012, 0.012, [side * 0.009, 0.0078, out0 + 0.0095], [0.5, 0, Math.PI / 2], 6);
      } else {
        const tones = ['#d8362f', '#2f6fd8', '#2f9e58', '#e08a1e', '#8a4fd0'];
        const vacc = paint(tones[Math.floor(random() * tones.length)], { metalness: 0.7, roughness: 0.35 });
        const kind = Math.floor(random() * 3), r = tagR * 0.72;
        const shape = new THREE.Shape();
        if (kind === 0) { shape.moveTo(0, -r); shape.bezierCurveTo(r * 1.6, r * 0.1, r * 0.7, r * 1.3, 0, r * 0.5); shape.bezierCurveTo(-r * 0.7, r * 1.3, -r * 1.6, r * 0.1, 0, -r); }
        else if (kind === 1) for (let i = 0; i <= 40; i++) { const t = (i / 40) * Math.PI * 2, rr = r * (0.9 + 0.14 * Math.cos(t * 6)); if (i) shape.lineTo(Math.cos(t) * rr, Math.sin(t) * rr); else shape.moveTo(rr, 0); }
        else shape.absellipse(0, 0, r * 0.75, r * 1.05, 0, Math.PI * 2, false, 0);
        const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.0013, bevelEnabled: false }), vacc);
        mesh.rotation.set(-Math.PI / 2, 0, side * 0.5 + Math.PI); mesh.position.set(side * tagR * 0.75, 0.0022, out0 + r * 1.05); mesh.castShadow = true;
        tags.add(mesh);
      }
    }

    // Place it: on the table, or hung on a peg.
    const drop = new THREE.Group();
    s.root.add(drop);
    let propX = R * 1.25 + 0.1, propZ = 0.03;
    if (a.placement === 'hook') {
      const gap = Math.max(0.09, R * 1.75), boardW = gap * 2 + Math.max(0.1, R * 1.9), boardH = Math.max(0.24, R * 3.5 + 0.1), peg = boardH - 0.07;
      const wood = s.material(new THREE.Color().setHSL(mix(0.09, 0.07, mood.warmth), 0.3, mix(0.5, 0.8, mood.cheer)), { roughness: 0.8 });
      s.box([boardW, boardH, 0.018], [0, boardH / 2, -0.03], wood);
      s.box([boardW, 0.022, 0.03], [0, boardH - 0.011, -0.02], s.material('#efece2', { roughness: 0.7 }));
      for (const x of [-gap, 0, gap]) { cyl(s.root, metal, 0.005, 0.005, 0.05, [x, peg, 0.0], [Math.PI / 2, 0, 0], 10); ball(s.root, metal, [x, peg, 0.027], [0.008, 0.008, 0.008], [0, 0, 0], 10); }
      const hangX = [-gap, 0, gap][Math.floor(random() * 3)];
      // Turn the loop into the wall plane with the ring at the bottom, and let gravity lengthen it.
      const inner = new THREE.Group();
      inner.add(collar);
      inner.rotation.x = Math.PI / 2;
      const open = a.state === 'open';
      inner.scale.set(open ? 0.5 : 0.78, 1, open ? 1.3 : 1.22);
      const turn = new THREE.Group();
      turn.add(inner);
      turn.rotation.z = open ? (random() - 0.5) * 0.2 : -thetaD + (random() - 0.5) * 0.15;
      const topReach = open ? radius(Math.PI) * 1.3 : radius(thetaD + Math.PI > Math.PI * 2 ? thetaD - Math.PI : thetaD + Math.PI) * 1.2;
      turn.position.set(hangX, peg - topReach + 0.004, 0.006 + w * 0.2);
      drop.add(turn);
      propX = hangX > 0.01 ? -0.08 : 0.08; propZ = 0.13;
    } else {
      collar.rotation.y = (random() - 0.5) * 0.9 + 0.35;
      drop.add(collar);
    }

    // What lies with it.
    const prop = new THREE.Group();
    prop.position.set(propX, 0, propZ);
    s.root.add(prop);
    if (a.with === 'leash') {
      const pts: V3[] = [];
      for (let i = 0; i <= 40; i++) { const t = i / 40, ang = t * Math.PI * 5.2, r = mix(0.035, 0.075, t) + (random() - 0.5) * 0.004; pts.push([Math.cos(ang) * r, 0.006 + (1 - t) * 0.012 + (i % 9 === 0 ? 0.004 : 0), Math.sin(ang) * r]); }
      pts.push([0.11, 0.006, 0.03], [0.15, 0.006, 0.07]);
      const lead = tube(prop, strapMat, pts, 0.0048);
      lead.scale.y = 1; lead.castShadow = true;
      arc(prop, strapMat, 0.035, 0.0048, Math.PI * 2, [0.175, 0.006, 0.1], [Math.PI / 2, 0, 0]).scale.set(1, 1.5, 1);
      cyl(prop, metal, 0.005, 0.004, 0.035, [0.035, 0.02, 0.0], [Math.PI / 2, 0, 0.5], 8);
      arc(prop, metal, 0.008, 0.002, Math.PI * 1.6, [0.035, 0.02, 0.022], [Math.PI / 2, 0, 0]);
    } else if (a.with === 'paw') {
      const clay = card([], '#efe6d4', '#000');
      const g = clay.g;
      const dent = (x: number, y: number, rx: number, ry: number, rot = 0) => { const grad = g.createRadialGradient(x - 3, y - 4, 2, x, y, Math.max(rx, ry)); grad.addColorStop(0, '#b9a98c'); grad.addColorStop(0.8, '#cbbda2'); grad.addColorStop(1, '#f7f0e2'); g.fillStyle = grad; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); };
      dent(128, 150, 44, 36);
      for (const [i, ang] of [-0.95, -0.33, 0.33, 0.95].entries()) dent(128 + Math.sin(ang) * 72, 150 - Math.cos(ang) * 72 + (i === 0 || i === 3 ? 6 : -4), 19, 25, ang);
      g.fillStyle = '#a89878'; g.font = 'bold 24px monospace'; g.textAlign = 'center'; g.fillText(name, 128, 220);
      clay.map.needsUpdate = true;
      const rr = kitten ? 0.04 : 0.055;
      cyl(prop, paint('#ebe1cd', { roughness: 0.95 }), rr, rr * 1.03, 0.012, [0, 0.006, 0.02], [0, 0, 0], 36);
      const top = new THREE.Mesh(new THREE.CircleGeometry(rr * 0.97, 36), new THREE.MeshStandardMaterial({ map: clay.map, roughness: 0.95 }));
      top.rotation.x = -Math.PI / 2; top.position.set(0, 0.0125, 0.02); top.receiveShadow = true; prop.add(top);
      const ribbon = s.material(new THREE.Color().setHSL(mix(0.6, 0.95, mood.cheer), 0.55, 0.6), { roughness: 0.8 });
      tube(prop, ribbon, [[0, 0.013, 0.02 - rr * 0.8], [-0.012, 0.01, 0.02 - rr * 1.25], [-0.03, 0.003, 0.02 - rr * 1.5], [0.0, 0.003, 0.02 - rr * 1.75], [0.03, 0.003, 0.02 - rr * 1.5], [0.012, 0.01, 0.02 - rr * 1.25], [0, 0.013, 0.02 - rr * 0.8]], 0.0022);
      prop.rotation.y = (random() - 0.5) * 0.5;
    } else if (a.with === 'fur') {
      const bag = new THREE.MeshPhysicalMaterial({ color: '#eaf4f7', transparent: true, opacity: 0.32, roughness: 0.12, depthWrite: false });
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.006, 0.13), bag); sheet.position.set(0, 0.004, 0.02); prop.add(sheet);
      s.box([0.1, 0.0015, 0.006], [0, 0.0015, -0.036], paint('#2f6fd8')).removeFromParent();
      const zip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.002, 0.006), paint('#2f6fd8')); zip.position.set(0, 0.008, -0.036); prop.add(zip);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.001, 0.13), paint('#f4f6f6', { roughness: 0.4 })); base.position.set(0, 0.0005, 0.02); base.receiveShadow = true; prop.add(base);
      const lab = card([name], '#ffffff', '#2a2a30', 256, 96);
      const tagMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.024), new THREE.MeshStandardMaterial({ map: lab.map, roughness: 0.9 }));
      tagMesh.rotation.x = -Math.PI / 2; tagMesh.position.set(0, 0.0078, -0.015); prop.add(tagMesh);
      for (let i = 0; i < 16; i++) {
        const off = (random() - 0.5) * 0.012, curl = (random() - 0.5) * 0.035;
        tube(prop, furMat, [[-0.03, 0.003 + random() * 0.003, 0.04 + off * 0.4], [-0.005, 0.004, 0.04 + off], [0.02, 0.004, 0.04 + off * 1.8 + curl * 0.5], [0.036, 0.003, 0.04 + off * 2.4 + curl]], 0.0011);
      }
      arc(prop, paint('#c23a3a'), 0.005, 0.0012, Math.PI * 2, [-0.026, 0.004, 0.04], [0, Math.PI / 2, 0]);
      prop.rotation.y = (random() - 0.5) * 0.8;
    } else if (a.with === 'puppy') {
      const bright = new THREE.Color().setHSL(random(), mix(0.35, 0.8, mood.cheer), mix(0.5, 0.62, mood.cheer));
      const front = card(['MY FIRST', 'COLLAR', '', '', 'XS  PUPPY'], `#${new THREE.Color().setHSL(0.13, 0.5, 0.9).getHexString()}`, `#${bright.clone().multiplyScalar(0.6).getHexString()}`, 256, 384);
      front.g.fillStyle = '#ffffff'; front.g.beginPath(); front.g.arc(128, 26, 12, 0, Math.PI * 2); front.g.fill();
      for (let i = 0; i < 22; i++) { front.g.fillStyle = '#222'; front.g.fillRect(150 + i * 4, 344, random() < 0.5 ? 1 : 3, 26); }
      front.map.needsUpdate = true;
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.002, 0.15), [paint('#d8cfb8'), paint('#d8cfb8'), new THREE.MeshStandardMaterial({ map: front.map, roughness: 0.8 }), paint('#d8cfb8'), paint('#d8cfb8'), paint('#d8cfb8')]);
      board.position.set(0, 0.001, 0.03); board.castShadow = board.receiveShadow = true; prop.add(board);
      const tiny = s.material(bright, { roughness: 0.85 });
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.108, 0.003, 0.012), tiny); band.position.set(0, 0.0035, 0.045); band.castShadow = true; prop.add(band);
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.005, 0.015), paint('#1d1d20')); clip.position.set(-0.02, 0.0045, 0.045); prop.add(clip);
      arc(prop, paint('#cfd3d6', { metalness: 0.9, roughness: 0.3 }), 0.006, 0.001, Math.PI * 2, [0.02, 0.0045, 0.054], [Math.PI / 2, 0, 0]);
      ball(prop, paint('#e3b93c', { metalness: 0.85, roughness: 0.25 }), [0.02, 0.008, 0.064], [0.006, 0.006, 0.006], [0, 0, 0], 12);
      prop.rotation.y = (random() - 0.5) * 0.7 - 0.2;
    }

    return s.finish();
  },
});
