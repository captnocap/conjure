import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, visibleBounds } from '@conjure/kit';

// One unit is roughly half the width of the jaw, in metres, at each scale.
const UNITS: Record<string, number> = { cosmic: 6, planetary: 6, landscape: 6, street: 2.2, room: 0.55, tabletop: 0.08, macro: 0.02 };
const STONE = {
  granite: { base: '#a39a96', light: '#d6cdc6', deep: '#5d5657', rough: 0.8, metal: 0 },
  marble: { base: '#ebe7df', light: '#ffffff', deep: '#9698a2', rough: 0.4, metal: 0 },
  bronze: { base: '#5d9e8b', light: '#93c9b4', deep: '#5a4226', rough: 0.55, metal: 0.6 },
  adobe: { base: '#b98a5e', light: '#d8b58a', deep: '#7a5334', rough: 1, metal: 0 },
} as const;
const bell = (value: number, centre: number, spread: number) => Math.exp(-(((value - centre) / spread) ** 2));
const dome = (x: number, half: number) => Math.sqrt(Math.max(0, 1 - (x / half) ** 2));
const ramp = (from: number, to: number, value: number) => { const t = Math.min(1, Math.max(0, (value - from) / (to - from))); return t * t * (3 - 2 * t); };

export default defineThing({
  questions: {
    material: choice('What was the colossus made of?', {
      granite: 'Grey-pink speckled granite.',
      marble: 'White veined marble.',
      bronze: 'Hollow cast bronze, green with verdigris and brown where it is rubbed.',
      adobe: 'Mud brick and plaster, crumbling in courses.',
    }),
    kept: choice('How much of the face survives?', {
      chin: 'Only the chin and lower lip: the break runs through the mouth.',
      mouth: 'The chin and the whole stern mouth, broken off under the nose.',
      beard: 'The mouth and a long carved beard in ridged curls, like an Assyrian king.',
      cheek: 'The mouth and one cheek, with a channel carved down it for a tear.',
    }),
    expression: choice('What expression does the mouth hold?', {
      sneer: 'A sneer of cold command: one corner of the lip curled up.',
      calm: 'Calm: a straight, level mouth.',
      anguish: 'Anguish: the mouth open and the corners dragged down.',
    }),
    lies: choice('How does the fragment lie?', {
      upright: 'Upright, as if the rest of the head were buried below.',
      faceup: 'On its back, the mouth open to the sky.',
      side: 'Tipped over on its side.',
    }),
    time: choice('What has time done to it?', {
      wind: 'Wind has sanded the features soft and heaped drifts against it.',
      graffiti: 'Visitors have scrawled names, hearts and a moustache on it.',
      tree: 'A tree has taken root in the break and split the face with a crack.',
      pristine: 'Nothing. The carving is as crisp as the day it fell.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const K = (UNITS[context.scale] ?? 2.2) * mix(0.9, 1.1, random());
    const stone = STONE[a.material];
    const beard = a.kept === 'beard', cheek = a.kept === 'cheek', open = a.expression === 'anguish';
    const sharp = { wind: 0.62, graffiti: 1, tree: 1, pristine: 1.2 }[a.time] * mix(1.05, 0.85, mood.wear);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, where: readonly [number, number, number] = [0, 0, 0], parent: THREE.Object3D = root) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...where);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // The face, in units: x across, y up from the point of the chin, z out of the face.
    const bottom = beard ? -1.3 : -0.3;
    const widthAt = (y: number) => {
      const jaw = 1.15 * (1 - Math.exp(-(Math.max(y, -0.3) + 0.3) / 0.55)) ** 0.75;
      if (!beard) return jaw;
      return mix(0.5 * (1 - Math.exp(-(y + 1.3) / 0.08)) ** 0.6, jaw, ramp(-0.5, 0.55, y));
    };
    const mouthCurve = (x: number) => { const k = x / 0.66; return ({ calm: -0.02, sneer: k > 0 ? 0.15 : -0.05, anguish: -0.14 }[a.expression]) * k * k; };
    const crackAt = (y: number) => -0.22 + 0.06 * Math.sin(y * 5);
    const tearAt = (y: number) => 0.66 - 0.07 * (y - 1.2);
    const surface = (phi: number, y: number) => {
      const w = widthAt(y), x = w * Math.sin(phi), front = Math.cos(phi);
      let z = 1 - 0.9 * w + 0.9 * w * front * (front < 0 ? 0.55 : 1);
      if (front > -0.2) {
        const yy = y - mouthCurve(x);
        let carve = 0.2 * bell(x, 0, 0.42) * bell(y, 0.22, 0.3) - 0.13 * bell(x, 0, 0.6) * bell(y, 0.62, 0.11);
        carve += 0.27 * bell(yy, open ? 0.79 : 0.85, 0.11) * dome(x, 0.66);
        carve -= (open ? 0.3 : 0.15) * bell(yy, open ? 0.98 : 1, open ? 0.08 : 0.035) * dome(x, 0.74);
        carve += 0.22 * bell(yy, open ? 1.19 : 1.13, 0.09) * dome(x, 0.68) * (1 - 0.3 * bell(x, 0, 0.1));
        carve += 0.34 * bell(x, 0, 0.23) * bell(y, 1.72, 0.2) + 0.12 * bell(Math.abs(x), 0.2, 0.1) * bell(y, 1.6, 0.11) - 0.045 * bell(Math.abs(x), 0.42 + 0.35 * (y - 1.1), 0.05) * ramp(1.1, 1.25, y);
        carve -= 0.05 * bell(x, 0, 0.09) * ramp(1.2, 1.3, yy) * ramp(1.55, 1.45, yy);
        if (a.expression === 'sneer') carve -= 0.06 * bell(x, 0.74 + 0.25 * (y - 1), 0.06) * ramp(0.9, 1.05, y);
        if (cheek) carve += 0.1 * bell(x, 0.7, 0.35) * bell(y, 2, 0.45) - 0.055 * bell(x, tearAt(y), 0.04) * ramp(1.15, 1.3, y);
        if (a.time === 'tree') carve -= 0.07 * bell(x, crackAt(y), 0.03);
        z += carve * sharp * ramp(-0.2, 0.2, front);
      }
      if (beard) {
        const hang = ramp(0.6, 0.42, y) * ramp(-0.5, 0, front);
        z += hang * (0.12 + (0.07 * sharp * Math.cos(phi * 20) + 0.03 * sharp * Math.cos(y * 12 + Math.cos(phi * 20) * 2)) * ramp(-0.1, 0.3, front)) * Math.max(front, 0.3);
      }
      return new THREE.Vector3(x, y, z);
    };
    const columns = 128, rows = 64;
    const breakBase = { chin: 0.97, mouth: 1.8, beard: 1.8, cheek: 1.8 }[a.kept];
    const jagged = (a.time === 'pristine' ? 0.35 : 1) * (a.material === 'adobe' ? 1.6 : 1), p1 = random() * 6, p2 = random() * 6, p3 = random() * 6;
    const breakAt = (phi: number) => {
      let y = breakBase + jagged * (0.07 * Math.sin(phi * 3 + p1) + 0.05 * Math.sin(phi * 7 + p2) + 0.03 * Math.sin(phi * 17 + p3));
      if (cheek) y += 1.1 * ramp(0.08, 0.5, phi) * ramp(2.4, 1.7, phi);
      return y - 0.3 * ramp(0.1, -0.6, Math.cos(phi));
    };
    const top = cheek ? 3.15 : breakBase + 0.25;
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
    const rim: THREE.Vector3[] = [];
    for (let j = 0; j <= columns; j++) {
      const phi = (j / columns * 2 - 1) * Math.PI, high = breakAt(j === columns ? -Math.PI : phi);
      for (let i = 0; i <= rows; i++) {
        const y = mix(bottom, high, i / rows), p = surface(phi, y);
        if (Math.cos(phi) < -0.1) p.multiplyScalar(1).add(new THREE.Vector3((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.05).multiplyScalar(i > 0 && j > 0 && j < columns ? 1 : 0));
        positions.push(p.x * K, p.y * K, p.z * K);
        uvs.push(j / columns, (y - bottom) / (top - bottom));
        if (i === rows && j < columns) rim.push(p);
      }
    }
    for (let j = 0; j < columns; j++) for (let i = 0; i < rows; i++) {
      const p = j * (rows + 1) + i, q = p + rows + 1;
      indices.push(p, q, p + 1, q, q + 1, p + 1);
    }
    const shell = new THREE.BufferGeometry();
    shell.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    shell.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    shell.setIndex(indices);
    shell.computeVertexNormals();

    // Painted stone: grain, weather, the dark of the mouth, and whatever people added.
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const pin = (x: number, y: number): [number, number] => [(Math.asin(Math.min(1, Math.max(-1, x / Math.max(widthAt(y), 0.05)))) / (Math.PI * 2) + 0.5) * 1024, (1 - (y - bottom) / (top - bottom)) * 512];
    const unit = 1024 / (Math.PI * 2);
    const base = new THREE.Color(stone.base).lerp(new THREE.Color(mix(0.5, 1, mood.warmth) > 0.75 ? '#c9a57a' : '#8f9296'), 0.12 + mood.wear * 0.12);
    ctx.fillStyle = '#' + base.getHexString();
    ctx.fillRect(0, 0, 1024, 512);
    if (a.material === 'granite') for (let i = 0; i < 9000; i++) { ctx.globalAlpha = 0.25 + random() * 0.5; ctx.fillStyle = [stone.light, stone.deep, '#c9a79c'][Math.floor(random() * 3)]; ctx.fillRect(random() * 1024, random() * 512, 1 + random() * 3, 1 + random() * 3); }
    if (a.material === 'marble') for (let i = 0; i < 16; i++) {
      let x = random() * 1024, y = random() * 512;
      ctx.strokeStyle = stone.deep; ctx.globalAlpha = 0.15 + random() * 0.3; ctx.lineWidth = 1 + random() * 3; ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 14; k++) { x += 20 + random() * 50; y += (random() - 0.5) * 60; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    if (a.material === 'bronze') {
      for (let i = 0; i < 260; i++) { ctx.globalAlpha = 0.15 + random() * 0.3; ctx.fillStyle = random() < 0.5 ? stone.light : '#3f6f62'; ctx.beginPath(); ctx.ellipse(random() * 1024, random() * 512, 6 + random() * 40, 5 + random() * 24, random() * 3, 0, Math.PI * 2); ctx.fill(); }
      for (const [x, y, r] of [[0, 0.22, 0.34], [0, 0.85, 0.3], [-0.3, 0.85, 0.2], [0.3, 0.85, 0.2], [0, 1.13, 0.26], [0.7, 2, 0.3]] as const) {
        const [cx, cy] = pin(x, y + mouthCurve(x)), rub = ctx.createRadialGradient(cx, cy, 2, cx, cy, r * unit);
        rub.addColorStop(0, 'rgba(120,84,44,0.9)'); rub.addColorStop(1, 'rgba(120,84,44,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = rub; ctx.fillRect(cx - r * unit, cy - r * unit, r * unit * 2, r * unit * 2);
      }
    }
    if (a.material === 'adobe') {
      ctx.strokeStyle = stone.deep; ctx.lineWidth = 2;
      for (let row = 0; row * 26 < 512; row++) {
        ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.moveTo(0, row * 26); ctx.lineTo(1024, row * 26); ctx.stroke();
        for (let x = (row % 2) * 30; x < 1024; x += 60) { ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.moveTo(x, row * 26); ctx.lineTo(x, row * 26 + 26); ctx.stroke(); }
      }
      for (let i = 0; i < 70; i++) { ctx.globalAlpha = 0.5 + random() * 0.4; ctx.fillStyle = random() < 0.6 ? stone.light : '#e6d6b8'; ctx.beginPath(); ctx.ellipse(random() * 1024, random() * 512, 10 + random() * 46, 8 + random() * 30, random() * 3, 0, Math.PI * 2); ctx.fill(); }
    }
    for (let i = 0; i < 30 + mood.wear * 90; i++) { ctx.globalAlpha = 0.05 + random() * 0.12 + mood.wear * 0.08; ctx.fillStyle = random() < 0.7 ? stone.deep : '#d9c59a'; ctx.fillRect(random() * 1024, random() * 300, 2 + random() * 7, 60 + random() * 260); }
    const stroke = (points: readonly (readonly [number, number])[], colour: string, width: number, alpha: number) => {
      ctx.globalAlpha = alpha; ctx.strokeStyle = colour; ctx.lineWidth = width * unit; ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath();
      points.forEach(([x, y], i) => { const [cx, cy] = pin(x, y); if (i) ctx.lineTo(cx, cy); else ctx.moveTo(cx, cy); });
      ctx.stroke();
    };
    const span = (from: number, to: number, f: (x: number) => number) => Array.from({ length: 25 }, (_unused, i) => { const x = mix(from, to, i / 24); return [x, f(x)] as const; });
    const shade = a.material === 'bronze' ? '#1f2a22' : '#2a221d';
    stroke(span(-0.68, 0.68, (x) => (open ? 0.98 : 1) + mouthCurve(x)), shade, open ? 0.13 : 0.05, 0.85 * Math.min(1, sharp + 0.2));
    stroke(span(-0.45, 0.45, (x) => 0.66 + mouthCurve(x) * 0.4 - 0.06 * (x / 0.4) ** 2), shade, 0.12, 0.3);
    if (a.kept !== 'chin') for (const side of [-1, 1]) stroke([[side * 0.08, 1.5], [side * 0.17, 1.52]], shade, 0.09, 0.85);
    stroke(span(-0.5, 0.5, (x) => 1.26 + mouthCurve(x)), shade, 0.05, 0.14);
    if (cheek) { stroke(span(1.2, 2.6, (y) => y).map(([y]) => [tearAt(y), y] as const), shade, 0.045, 0.7); stroke(span(1.2, 2.6, (y) => y).map(([y]) => [tearAt(y) + 0.02, y] as const), '#6fb0d0', 0.02, a.material === 'bronze' ? 0 : 0.6); }
    if (a.time === 'tree') stroke(span(0, top, (y) => y).map(([y]) => [crackAt(y), y] as const), '#17120f', 0.04, 0.95);
    if (a.time === 'graffiti') {
      const inks = ['#d8263c', '#1f6fe8', '#1c1c1c', '#f2c230', '#2fa45a', '#e04fb0'];
      stroke([[-0.5, 1.3], [-0.3, 1.22], [-0.08, 1.3], [0, 1.26], [0.08, 1.3], [0.3, 1.22], [0.5, 1.3]].map(([x, y]) => [x, Math.min(y + mouthCurve(x), breakBase - 0.12)] as const), '#1c1c1c', 0.07, 0.95);
      const words = ['WAS HERE', 'OZY', 'LOOK ON MY', 'KING OF ?', 'J + M', 'NOTHING', '1818', 'DESPAIR'];
      for (let i = 0; i < 7; i++) {
        const [cx, cy] = pin((random() - 0.5) * 1.5, mix(bottom + 0.4, Math.min(breakBase, 1.4) - 0.5, random()));
        ctx.save(); ctx.translate(cx + (i > 4 ? (random() < 0.5 ? -260 : 260) : 0), cy); ctx.rotate((random() - 0.5) * 0.5);
        ctx.globalAlpha = 0.92; ctx.fillStyle = ctx.strokeStyle = inks[Math.floor(random() * inks.length)];
        if (i % 3 === 0) { ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 14); ctx.bezierCurveTo(-34, -14, -12, -32, 0, -10); ctx.bezierCurveTo(12, -32, 34, -14, 0, 14); ctx.stroke(); }
        else { ctx.font = `bold ${22 + Math.floor(random() * 16)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(words[Math.floor(random() * words.length)], 0, 0); }
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const hollow = a.material === 'bronze';
    const skin = new THREE.MeshStandardMaterial({ map, roughness: Math.min(1, stone.rough + mood.wear * 0.2), metalness: stone.metal, side: hollow ? THREE.DoubleSide : THREE.FrontSide });
    const raw = new THREE.MeshStandardMaterial({ color: base.clone().lerp(new THREE.Color(a.material === 'adobe' ? '#8a5f3c' : stone.light), 0.45), roughness: 1, flatShading: true });
    const piece = new THREE.Group();
    root.add(piece);
    add(shell, skin, [0, 0, 0], piece);

    // The break: a rough face of raw stone across the top (bronze is hollow and left open).
    const middle = rim.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(1 / rim.length);
    if (!hollow) {
      const cap: number[] = [], faces: number[] = [];
      for (const p of rim) cap.push(p.x * K, p.y * K, p.z * K);
      for (const p of rim) { const inner = p.clone().lerp(middle, 0.5); inner.y = Math.min(p.y, inner.y) - 0.04 + (random() - 0.5) * 0.16 * jagged; cap.push(inner.x * K, inner.y * K, inner.z * K); }
      cap.push(middle.x * K, (middle.y - 0.15) * K, middle.z * K);
      for (let j = 0; j < columns; j++) {
        const next = (j + 1) % columns;
        faces.push(j, next, columns + j, next, columns + next, columns + j, columns + j, columns + next, columns * 2);
      }
      const fracture = new THREE.BufferGeometry();
      fracture.setAttribute('position', new THREE.Float32BufferAttribute(cap, 3));
      fracture.setIndex(faces);
      const flat = fracture.toNonIndexed();
      fracture.dispose();
      flat.computeVertexNormals();
      add(flat, raw, [0, 0, 0], piece);
    }
    if (cheek) {
      const drop = surface(Math.asin(tearAt(1.2) / widthAt(1.2)), 1.14);
      const tear = add(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#8fd0ee', roughness: 0.05, clearcoat: 1, emissive: '#2f7fa8', emissiveIntensity: 0.35 }), [drop.x * K, drop.y * K, (drop.z + 0.02) * K], piece);
      tear.scale.set(0.07 * K, 0.11 * K, 0.05 * K);
    }

    // How it came to rest.
    const lean = (random() - 0.5) * 0.2;
    if (a.lies === 'upright') piece.rotation.set(-0.32 + lean * 0.4, (random() - 0.5) * 0.3, lean);
    if (a.lies === 'faceup') piece.rotation.set(-Math.PI / 2 + mix(0.15, 0.4, random()), 0, lean);
    if (a.lies === 'side') piece.rotation.set(-0.55, (random() - 0.5) * 0.3, (random() < 0.5 ? -1 : 1) * mix(0.5, 0.75, random()));
    let bounds = visibleBounds(root);
    const sunk = { upright: 0.1, faceup: 0.3, side: 0.18 }[a.lies] + (a.time === 'wind' ? 0.06 : 0);
    piece.position.y = -bounds.min.y - sunk * (bounds.max.y - bounds.min.y);
    root.updateMatrixWorld(true);
    bounds = visibleBounds(root);
    const size = bounds.getSize(new THREE.Vector3()), centre = bounds.getCenter(new THREE.Vector3());

    const sand = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d9c59a').lerp(new THREE.Color('#b9ad9a'), 1 - mood.warmth), roughness: 1 });
    const drifts = (a.time === 'wind' ? 5 : 2) + Math.round(mood.wear * 2);
    for (let i = 0; i < drifts; i++) {
      const angle = random() * Math.PI * 2, wide = (0.3 + random() * 0.35) * K * (a.time === 'wind' ? 1.5 : 1);
      add(new THREE.SphereGeometry(1, 20, 10), sand, [centre.x + Math.cos(angle) * size.x * 0.48, -0.04 * K, centre.z + Math.sin(angle) * size.z * 0.48]).scale.set(wide, (0.14 + random() * 0.16) * K * (a.time === 'wind' ? 1.5 : 1), wide * (0.7 + random() * 0.5));
    }
    const chunks = Math.round(mix(2, 12, mood.wear * 0.5 + mood.density * 0.5)) + (a.material === 'adobe' ? 5 : 0);
    for (let i = 0; i < chunks; i++) {
      const angle = random() * Math.PI * 2, reach = 0.56 + random() * 0.5, big = (0.08 + random() * random() * 0.38) * K;
      const chunk = add(a.material === 'adobe' ? new THREE.BoxGeometry(big * 2, big, big * 1.2) : new THREE.DodecahedronGeometry(big, 0), a.material === 'bronze' ? skin : raw, [centre.x + Math.cos(angle) * size.x * reach, big * 0.4, centre.z + Math.sin(angle) * size.z * reach]);
      chunk.rotation.set(random() * 0.6, random() * 3, random() * 0.6);
    }

    // The tree in the break.
    const leaves: THREE.Object3D[] = [];
    if (a.time === 'tree') {
      const bark = new THREE.MeshStandardMaterial({ color: '#4a3a2c', roughness: 1 });
      const green = new THREE.MeshStandardMaterial({ color: new THREE.Color('#56783a').lerp(new THREE.Color('#9a8a4a'), mood.wear * 0.6), roughness: 1, flatShading: true });
      const seed = piece.localToWorld(new THREE.Vector3(crackAt(breakBase) * 0.6, middle.y - 0.25, middle.z + 0.2).multiplyScalar(K));
      const limb = (from: THREE.Vector3, to: THREE.Vector3, radius: number) => {
        const bend = from.clone().lerp(to, 0.5).add(new THREE.Vector3((random() - 0.5) * 0.3 * K, 0.1 * K, (random() - 0.5) * 0.3 * K));
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, bend, to]), 10, radius, 6), bark);
      };
      const crown = seed.clone().add(new THREE.Vector3((random() - 0.5) * 0.5 * K, mix(1.3, 1.9, random()) * K, (random() - 0.5) * 0.4 * K));
      limb(seed, crown, 0.1 * K);
      const boughs = 4 + Math.round(mood.density * 3);
      for (let i = 0; i < boughs; i++) {
        const angle = i / boughs * Math.PI * 2 + random(), tip = crown.clone().add(new THREE.Vector3(Math.cos(angle) * (0.5 + random() * 0.5) * K, (0.2 + random() * 0.6) * K, Math.sin(angle) * (0.5 + random() * 0.5) * K));
        limb(seed.clone().lerp(crown, 0.6 + random() * 0.4), tip, 0.04 * K);
        if (mood.wear < 0.8) { const leaf = add(new THREE.IcosahedronGeometry((0.3 + random() * 0.25) * K, 1), green, [tip.x, tip.y, tip.z]); leaf.scale.y = 0.7; leaves.push(leaf); }
      }
      const foot = piece.localToWorld(surface(Math.asin(crackAt(0.5) / widthAt(0.5)), 0.5).multiplyScalar(K));
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([seed, seed.clone().lerp(foot, 0.5).add(new THREE.Vector3(0, 0, 0.12 * K)), foot]), 12, 0.045 * K, 6), bark);
    }

    const body = new THREE.Group();
    body.add(root);
    const all = visibleBounds(root).getCenter(new THREE.Vector3());
    root.position.set(-all.x, 0, -all.z);
    const sway = mix(0.3, 2, mood.energy), beat = random() * 6;
    return {
      object: body,
      update(_dt, time) { leaves.forEach((leaf, i) => { leaf.rotation.z = Math.sin(time * sway + beat + i) * 0.06; }); },
      dispose() { map.dispose(); disposeTree(body); },
    };
  },
});
