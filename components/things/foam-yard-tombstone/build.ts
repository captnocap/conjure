import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, paint, paintHex } from '@conjure/kit';

type R = () => number;
type XY = [number, number];

const EPITAPHS = {
  rip: ['R.I.P.'],
  boo: ['BOO!'],
  sick: ['I TOLD', 'YOU I WAS', 'SICK'],
  les: ['HERE LIES', 'LESTER', 'NO LES', 'NO MORE'],
  pieces: ['REST IN', 'PIECES'],
} as const;

/** Foam painted to look like granite: speckle, grime at the foot, the carving shaded as if cut in. */
function stoneFace(base: string, lines: readonly string[] | string[], box: { w: number; h: number; top: number }, random: R, wear: number, moss: boolean, icon: 'skull' | 'cross' | 'bats' | 'none') {
  const S = 512;
  const canvas = document.createElement('canvas'); canvas.width = S; canvas.height = Math.round(S * box.h / box.w);
  const H = canvas.height;
  const ctx = canvas.getContext('2d')!;
  const col = new THREE.Color(base);
  const shade = (k: number) => `#${col.clone().multiplyScalar(k).getHexString()}`;
  ctx.fillStyle = base; ctx.fillRect(0, 0, S, H);
  for (let i = 0; i < 2600; i++) { ctx.fillStyle = random() < 0.5 ? shade(0.72) : shade(1.22); ctx.globalAlpha = 0.25 + random() * 0.4; ctx.fillRect(random() * S, random() * H, 1 + random() * 2.5, 1 + random() * 2.5); }
  ctx.globalAlpha = 1;
  const grime = ctx.createLinearGradient(0, H * 0.55, 0, H);
  grime.addColorStop(0, 'rgba(40,34,26,0)'); grime.addColorStop(1, `rgba(40,34,26,${0.25 + wear * 0.45})`);
  ctx.fillStyle = grime; ctx.fillRect(0, 0, S, H);
  if (moss) for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(${70 + random() * 30},${110 + random() * 30},50,${0.3 + random() * 0.4})`; ctx.beginPath(); ctx.ellipse(random() * S, H * (0.65 + random() * 0.35), 8 + random() * 30, 5 + random() * 14, 0, 0, 7); ctx.fill(); }
  // Lettering: dark incised strokes with a bright lower lip, centred in the face area.
  const area = { x: S * 0.12, y: H * (1 - box.top) + H * 0.04, w: S * 0.76, h: H * box.top * 0.78 };
  let y0 = area.y;
  if (box.top < 0.05) lines = [];
  if (icon !== 'none' && lines.length) {
    const ix = S / 2, iy = area.y + area.h * 0.13, r = Math.min(area.w, area.h) * 0.1;
    const carve = (draw: () => void) => {
      ctx.save(); ctx.translate(2.5, 3); ctx.fillStyle = shade(1.35); ctx.strokeStyle = shade(1.35); draw(); ctx.restore();
      ctx.fillStyle = shade(0.42); ctx.strokeStyle = shade(0.42); draw();
    };
    if (icon === 'skull') carve(() => {
      ctx.beginPath(); ctx.ellipse(ix, iy, r, r * 0.9, 0, 0, 7); ctx.fill(); ctx.fillRect(ix - r * 0.55, iy + r * 0.5, r * 1.1, r * 0.6);
      ctx.save(); ctx.fillStyle = base; ctx.beginPath(); ctx.arc(ix - r * 0.4, iy, r * 0.27, 0, 7); ctx.arc(ix + r * 0.4, iy, r * 0.27, 0, 7); ctx.fill(); ctx.restore();
    });
    if (icon === 'cross') carve(() => { ctx.fillRect(ix - r * 0.15, iy - r, r * 0.3, r * 2); ctx.fillRect(ix - r * 0.7, iy - r * 0.45, r * 1.4, r * 0.3); });
    if (icon === 'bats') carve(() => {
      for (const dx of [-1.6, 0, 1.6]) {
        const bx = ix + dx * r, by = iy + (dx === 0 ? -r * 0.3 : 0), k = r * 0.06;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 8 * k, by - 9 * k, bx - 16 * k, by - 2 * k); ctx.quadraticCurveTo(bx - 11 * k, by, bx - 12 * k, by + 5 * k);
        ctx.quadraticCurveTo(bx - 6 * k, by + 1 * k, bx, by + 5 * k); ctx.quadraticCurveTo(bx + 6 * k, by + 1 * k, bx + 12 * k, by + 5 * k);
        ctx.quadraticCurveTo(bx + 11 * k, by, bx + 16 * k, by - 2 * k); ctx.quadraticCurveTo(bx + 8 * k, by - 9 * k, bx, by); ctx.fill();
      }
    });
    y0 += area.h * 0.28;
  }
  const rows = Math.max(1, lines.length);
  const avail = area.y + area.h - y0;
  const size = Math.min(avail / rows * 0.8, area.w / Math.max(...lines.map((l) => l.length)) * 1.45, 150);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${size}px Georgia, "Times New Roman", serif`;
  lines.forEach((line, i) => {
    const y = y0 + (i + 0.5) * avail / rows;
    ctx.fillStyle = shade(1.4); ctx.fillText(line, S / 2 + 2.5, y + 3, area.w);
    ctx.fillStyle = shade(0.38); ctx.fillText(line, S / 2, y, area.w);
  });
  // Chips knocked out of the paint show the white foam underneath.
  for (let i = 0; i < Math.round(wear * 14); i++) {
    ctx.fillStyle = '#f2f0ea';
    ctx.beginPath();
    const x = random() < 0.5 ? random() * S * 0.12 : S - random() * S * 0.12, y = random() * H;
    for (let k = 0; k < 6; k++) ctx.lineTo(x + (random() - 0.5) * 26, y + (random() - 0.5) * 20);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    shape: choice('What shape is the tombstone?', {
      arch: 'A classic rounded-top arch headstone.',
      cross: 'A chunky cross with flared arms.',
      obelisk: 'A small square obelisk tapering to a pyramid point on a plinth.',
      cracked: 'A slab split across by a jagged crack, the top half slipped askew.',
    }),
    epitaph: choice('What joke is carved on it?', {
      rip: 'R.I.P. in big serif capitals.',
      boo: 'BOO! — short and silly.',
      sick: 'I TOLD YOU I WAS SICK.',
      les: 'HERE LIES LESTER, NO LES NO MORE.',
      pieces: 'REST IN PIECES.',
    }),
    icon: choice('What little picture is carved above the words?', {
      none: 'Nothing, just the lettering.',
      skull: 'A cartoon skull.',
      cross: 'A plain little cross.',
      bats: 'Three flying bats.',
    }),
    reach: choice('Does anything poke up out of the turf in front of it?', {
      none: 'Nothing: just leaves and grass.',
      hand: 'A green rubber zombie hand clawing up out of a dirt mound.',
      skeleton: 'A bony plastic skeleton arm reaching up out of the ground.',
    }),
    lighting: choice('How is it lit?', {
      none: 'Not lit: it stands in whatever light there is.',
      purple: 'A little black spotlight in the grass washing it purple from below.',
      orange: 'An orange jack-o\'-lantern garden stake light glowing beside it.',
      green: 'A sickly green spotlight from below, like a horror film.',
    }),
    stone: paint('What colour is the painted foam stone?', ['grey', 'charcoal', 'tan', 'cream', 'olive', 'forest', 'white', 'lavender']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const base = paintHex(a.stone);
    const moss = a.stone === 'olive' || a.stone === 'forest' || wear > 0.6;
    const glow = clamp01(0.25 + 0.75 * (0.4 * mood.cheer + 0.3 * mood.warmth + 0.3 * mood.energy));
    const depth = 0.05, bevel = 0.008;

    // ---- the stone ----
    const stone = new THREE.Group();
    const extrude = (shape: THREE.Shape, face: THREE.Material, side: THREE.Material, d = depth) => {
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 20 });
      geometry.translate(0, 0, -d / 2);
      const mesh = new THREE.Mesh(geometry, [face, side]);
      mesh.castShadow = mesh.receiveShadow = true;
      stone.add(mesh);
      return mesh;
    };
    const sideMat = s.material(new THREE.Color(base).multiplyScalar(0.92), { roughness: 0.95 });
    const faceMat = (w: number, h: number, minX: number, minY: number, top: number) => {
      const map = stoneFace(base, EPITAPHS[a.epitaph], { w, h, top }, random, wear, moss, a.icon);
      map.repeat.set(1 / w, 1 / h); map.offset.set(-minX / w, -minY / h);
      return new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
    };
    let height = 0.6, width = 0.5;
    const tops: THREE.Mesh[] = [];
    if (a.shape === 'arch') {
      width = 0.48; height = 0.62;
      const r = width / 2, sh = new THREE.Shape();
      sh.moveTo(-r, 0); sh.lineTo(r, 0); sh.lineTo(r, height - r); sh.absarc(0, height - r, r, 0, Math.PI, false); sh.lineTo(-r, 0);
      const face = faceMat(width, height, -r, 0, 0.8);
      tops.push(extrude(sh, face, sideMat));
      // A raised border carved round the face.
      const rim = new THREE.Shape();
      const ri = r - 0.03;
      rim.moveTo(-ri, 0.05); rim.lineTo(ri, 0.05); rim.lineTo(ri, height - r); rim.absarc(0, height - r, ri, 0, Math.PI, false); rim.lineTo(-ri, 0.05);
      const hole = new THREE.Path(); const rh = ri - 0.015;
      hole.moveTo(-rh, 0.065); hole.lineTo(rh, 0.065); hole.lineTo(rh, height - r); hole.absarc(0, height - r, rh, 0, Math.PI, false); hole.lineTo(-rh, 0.065);
      rim.holes.push(hole);
      const border = new THREE.Mesh(new THREE.ExtrudeGeometry(rim, { depth: 0.006, bevelEnabled: false, curveSegments: 20 }), sideMat);
      border.position.z = depth / 2 + bevel - 0.002; border.castShadow = true; stone.add(border);
    } else if (a.shape === 'cross') {
      width = 0.46; height = 0.74;
      const sh = new THREE.Shape(), bw = 0.075, armY = 0.48, aw = 0.07;
      const pts: XY[] = [[-bw, 0], [bw, 0], [bw * 0.85, armY - aw], [width / 2, armY - aw * 1.5], [width / 2, armY + aw * 1.5], [bw * 0.85, armY + aw], [bw * 1.3, height], [-bw * 1.3, height], [-bw * 0.85, armY + aw], [-width / 2, armY + aw * 1.5], [-width / 2, armY - aw * 1.5], [-bw * 0.85, armY - aw]];
      pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
      sh.closePath();
      // The cross is too narrow for long words: the epitaph goes on the base block.
      const face = faceMat(width, height, -width / 2, 0, 0.0);
      tops.push(extrude(sh, face, sideMat));
      stone.children[0].position.y = 0.16;
      const block = new THREE.Shape(); block.moveTo(-0.24, 0); block.lineTo(0.24, 0); block.lineTo(0.22, 0.18); block.lineTo(-0.22, 0.18); block.closePath();
      const blockFace = faceMat(0.48, 0.18, -0.24, 0, 0.92);
      extrude(block, blockFace, sideMat, depth * 1.8);
      height += 0.16;
    } else if (a.shape === 'obelisk') {
      width = 0.34; height = 0.8;
      const mat = s.material(base, { roughness: 0.95 });
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.26), sideMat); plinth.position.y = 0.06;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * Math.SQRT2, 0.11 * Math.SQRT2, 0.55, 4, 1), mat);
      shaft.rotation.y = Math.PI / 4; shaft.position.y = 0.12 + 0.275;
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.075 * Math.SQRT2, 0.12, 4), mat);
      point.rotation.y = Math.PI / 4; point.position.y = 0.12 + 0.55 + 0.06;
      for (const m of [plinth, shaft, point]) { m.castShadow = m.receiveShadow = true; stone.add(m); }
      shaft.material = mat; (point.material as THREE.MeshStandardMaterial).flatShading = true;
      // The words go on a tablet on the plinth's front and up the shaft.
      const map = stoneFace(base, EPITAPHS[a.epitaph], { w: 0.2, h: 0.36, top: 0.98 }, random, wear, moss, a.icon);
      const tablet = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.34), new THREE.MeshStandardMaterial({ map, roughness: 0.95 }));
      // Lean the tablet back to lie on the tapering front face.
      tablet.position.set(0, 0.12 + 0.24, 0.0925 + 0.002);
      tablet.rotation.x = -Math.atan2(0.04, 0.55);
      stone.add(tablet);
      tops.push(shaft);
    } else {
      width = 0.5; height = 0.6;
      const w = width / 2;
      const crack: XY[] = [];
      for (let i = 0; i <= 7; i++) crack.push([-w + i * width / 7, 0.33 + i * 0.022 + (i % 2 ? 0.035 : -0.02) * (i > 0 && i < 7 ? 1 : 0) + (random() - 0.5) * 0.02]);
      const lower = new THREE.Shape(); lower.moveTo(-w, 0); lower.lineTo(w, 0);
      for (let i = crack.length - 1; i >= 0; i--) lower.lineTo(...crack[i]);
      lower.closePath();
      const upper = new THREE.Shape(); upper.moveTo(...crack[0]);
      for (const p of crack) upper.lineTo(...p);
      upper.lineTo(w, height - 0.05); upper.quadraticCurveTo(w, height, w - 0.05, height); upper.lineTo(-w + 0.05, height); upper.quadraticCurveTo(-w, height, -w, height - 0.05); upper.closePath();
      const face = faceMat(width, height, -w, 0, 0.82);
      extrude(lower, face, sideMat);
      const top = extrude(upper, face, sideMat);
      const slip = random() < 0.5 ? -1 : 1;
      top.position.set(slip * 0.02, -0.006, 0.006); top.rotation.z = slip * -0.07;
      tops.push(top);
    }
    // Staked crooked into the turf.
    const crooked = 0.05 + random() * 0.08 + wear * 0.1;
    stone.rotation.set(-(0.03 + random() * 0.08) * (random() < 0.7 ? 1 : -1), (random() - 0.5) * 0.25, crooked * (random() < 0.5 ? 1 : -1));
    stone.position.set(0, -0.03, -0.04);
    s.root.add(stone);

    // ---- the turf ----
    const R0 = Math.max(width * 0.85, 0.36);
    const grass = s.material(mood.cheer > 0.4 ? '#5d7f3c' : '#6b6f3e', { roughness: 1 });
    const turfGeo = new THREE.CylinderGeometry(R0, R0 * 1.05, 0.04, 40, 1);
    {
      // A ragged edge of cut sod, not a coaster.
      const k = [random() * 6, random() * 6], pos = turfGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
        if (r < 1e-4) continue;
        const th = Math.atan2(z, x), f = 1 + 0.1 * Math.sin(th * 3 + k[0]) + 0.06 * Math.sin(th * 7 + k[1]);
        pos.setX(i, x * f); pos.setZ(i, z * f);
      }
      turfGeo.computeVertexNormals();
    }
    const turf = s.mesh(turfGeo, grass, [0, 0.02, 0.06]);
    turf.scale.z = 0.85;
    const blades = Array.from({ length: 160 }, () => {
      const th = random() * Math.PI * 2, r = Math.sqrt(random()) * R0 * 0.98;
      return { at: [Math.sin(th) * r, 0.04, 0.06 + Math.cos(th) * r * 0.85] as [number, number, number], size: 0.6 + random() * 0.9, color: new THREE.Color('#5e8a3a').lerp(new THREE.Color('#9a9a52'), random() * (0.3 + wear * 0.5)) };
    });
    const blade = new THREE.ConeGeometry(0.006, 0.05, 3); blade.translate(0, 0.025, 0);
    s.scatter(blade, s.material('#ffffff', { roughness: 1 }), blades);
    const leafShape = new THREE.Shape(); leafShape.moveTo(0, -0.025); leafShape.quadraticCurveTo(0.02, 0, 0, 0.025); leafShape.quadraticCurveTo(-0.02, 0, 0, -0.025);
    const leafGeo = new THREE.ShapeGeometry(leafShape); leafGeo.rotateX(-Math.PI / 2);
    const leafCols = ['#c4501a', '#d98a1c', '#8e3a1c', '#b8892e', '#6a4424', '#d4b030'];
    const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }), Math.round(mix(10, 45, mood.density)));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < leaves.count; i++) {
      const th = random() * Math.PI * 2, r = Math.sqrt(random()) * R0 * 1.15;
      q.setFromEuler(new THREE.Euler((random() - 0.5) * 0.5, random() * 6, (random() - 0.5) * 0.5));
      m.compose(new THREE.Vector3(Math.sin(th) * r, 0.043 + random() * 0.01, 0.06 + Math.cos(th) * r * 0.85), q, new THREE.Vector3().setScalar(0.7 + random() * 0.8));
      leaves.setMatrixAt(i, m); leaves.setColorAt(i, new THREE.Color(leafCols[Math.floor(random() * leafCols.length)]));
    }
    leaves.castShadow = leaves.receiveShadow = true;
    s.root.add(leaves);

    // ---- what reaches up ----
    const wigglers: { object: THREE.Object3D; base: number; phase: number }[] = [];
    if (a.reach !== 'none') {
      const zombie = a.reach === 'hand';
      const dirt = s.material('#4a3424', { roughness: 1 });
      const at = new THREE.Vector3((random() - 0.5) * 0.18, 0.04, 0.22 + random() * 0.06);
      s.ball([0.09, 0.035, 0.07], [at.x, 0.035, at.z], dirt, 14);
      const clods = Array.from({ length: 10 }, () => ({ at: [at.x + (random() - 0.5) * 0.2, 0.045, at.z + (random() - 0.5) * 0.14] as [number, number, number], size: 0.6 + random() * 0.8 }));
      s.scatter(new THREE.DodecahedronGeometry(0.012, 0), dirt, clods);
      const mat = zombie ? s.material(random() < 0.5 ? '#8fa070' : '#7c9a64', { roughness: 0.6 }) : s.material('#ece6d2', { roughness: 0.55 });
      const arm = new THREE.Group();
      arm.position.copy(at);
      arm.rotation.set(-0.2 - random() * 0.25, random() * 6, (random() - 0.5) * 0.4);
      const add = (mesh: THREE.Mesh, parent: THREE.Object3D = arm) => { mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
      const forearm = 0.17;
      if (zombie) {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, forearm, 12), mat)).position.y = forearm / 2;
        // A torn cuff of sleeve at the dirt line.
        const cuff = add(new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.044, 0.05, 9, 1, true), s.material('#3e3a44', { roughness: 1, side: THREE.DoubleSide })));
        cuff.position.y = 0.035;
        const palm = add(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat)); palm.scale.set(0.04, 0.05, 0.02); palm.position.y = forearm + 0.03;
      } else {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, forearm, 8), mat)).position.set(-0.01, forearm / 2, 0);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, forearm, 8), mat)).position.set(0.012, forearm / 2, 0);
        const wrist = add(new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), mat)); wrist.position.y = forearm + 0.005; wrist.scale.set(1.4, 0.8, 0.8);
        const carpal = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.014), mat)); carpal.position.y = forearm + 0.03;
      }
      for (let f = 0; f < 5; f++) {
        const thumb = f === 4;
        const finger = new THREE.Group();
        finger.position.set(thumb ? 0.034 : -0.024 + f * 0.016, forearm + (thumb ? 0.03 : 0.065), 0);
        finger.rotation.set(0.3 + random() * 0.5, 0, thumb ? -0.8 : (f - 1.5) * -0.15);
        arm.add(finger);
        let parent: THREE.Object3D = finger;
        for (let k = 0; k < (thumb ? 2 : 3); k++) {
          const len = (thumb ? 0.024 : 0.026) * (1 - k * 0.15);
          const seg = add(new THREE.Mesh(zombie ? new THREE.CapsuleGeometry(0.0075, len, 3, 8) : new THREE.CylinderGeometry(0.004, 0.005, len, 6), mat), parent);
          seg.position.y = len / 2;
          if (!zombie) { const knuckle = add(new THREE.Mesh(new THREE.SphereGeometry(0.0065, 6, 5), mat), parent); knuckle.position.y = len; }
          const next = new THREE.Group(); next.position.y = len; next.rotation.x = 0.35 + random() * 0.35; parent.add(next);
          wigglers.push({ object: next, base: next.rotation.x, phase: random() * 6 });
          parent = next;
        }
      }
      s.root.add(arm);
    }

    // ---- the lighting ----
    let lamp: THREE.MeshStandardMaterial | null = null;
    const lightBase = mix(0.4, 2.6, glow);
    if (a.lighting === 'purple' || a.lighting === 'green') {
      const hue = a.lighting === 'purple' ? '#a040ff' : '#5cff4a';
      const can = s.material('#151517', { roughness: 0.5 });
      const spot = new THREE.Group();
      const side = random() < 0.5 ? -1 : 1;
      spot.position.set(side * 0.2, 0.06, 0.34);
      spot.rotation.y = side * 0.5;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.08, 14), can); body.rotation.x = -1.0; body.castShadow = true;
      lamp = new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: lightBase });
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), lamp);
      const axis = new THREE.Vector3(0, Math.cos(-1.0), Math.sin(-1.0));
      lens.position.copy(axis).multiplyScalar(0.041); lens.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis); spot.add(body, lens);
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 6), can); stake.position.y = -0.04; spot.add(stake);
      s.root.add(spot);
      // The wash: the painted face takes on the colour from below.
      for (const mesh of [...stone.children] as THREE.Mesh[]) {
        for (const mat of [mesh.material].flat() as THREE.MeshStandardMaterial[]) { mat.emissive = new THREE.Color(hue); mat.emissiveIntensity = 0.05 + glow * 0.18; }
      }
    } else if (a.lighting === 'orange') {
      const side = random() < 0.5 ? -1 : 1;
      const x = side * (width / 2 + 0.12), z = 0.16;
      s.rod([x, 0, z], [x, 0.3, z], 0.006, s.material('#1a1a1a'));
      lamp = new THREE.MeshStandardMaterial({ color: '#ff9a30', emissive: '#ff8a1a', emissiveIntensity: lightBase, roughness: 0.4 });
      const ball = s.ball([0.06, 0.05, 0.06], [x, 0.34, z], lamp, 16);
      // Its face is a black decal on the plastic.
      const face = s.material('#1a0e06');
      for (const dx of [-1, 1]) { const eye = s.mesh(new THREE.ConeGeometry(0.012, 0.016, 3), face, [x + dx * 0.02, 0.35, z + 0.056]); eye.rotation.x = Math.PI / 2; eye.scale.set(1, 1, 0.2); }
      s.box([0.05, 0.008, 0.004], [x, 0.322, z + 0.058], face);
      s.cylinder(0.006, 0.008, 0.02, [x, 0.395, z], s.material('#3a5a22'), 8);
      void ball;
      for (const mesh of [...stone.children] as THREE.Mesh[]) {
        for (const mat of [mesh.material].flat() as THREE.MeshStandardMaterial[]) { mat.emissive = new THREE.Color('#ff7a20'); mat.emissiveIntensity = 0.04 + glow * 0.14; }
      }
    }

    const energy = mood.energy;
    const thing = s.finish({
      update(_dt, time) {
        for (const w of wigglers) w.object.rotation.x = w.base + Math.sin(time * (1.5 + energy * 6) + w.phase) * 0.18 * energy;
        if (lamp) lamp.emissiveIntensity = lightBase * (1 + Math.sin(time * 13 + 1.7) * 0.06 * energy);
      },
    });
    void tops;
    return thing;
  },
});
