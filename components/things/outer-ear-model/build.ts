import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { DEG, bump, fuse, painted, placed, smooth, strut, sweep } from './form';

/** Outline radius every 30 degrees, from the front attachment (0) over the top (90), the back rim (180) and the lobe (270). */
const OUTLINE = [0.22, 0.3, 0.45, 0.52, 0.5, 0.42, 0.36, 0.36, 0.42, 0.48, 0.36, 0.24];
const wrap = (deg: number) => ((deg % 360) + 360) % 360;
const near = (theta: number, centre: number, width: number) => {
  const d = Math.abs(wrap(theta - centre + 180) - 180);
  return Math.exp(-((d / width) ** 2));
};

interface Hole { x: number; y: number; r: number; scallop: number; raw: boolean }

export default defineThing({
  questions: {
    kind: choice('What kind of ear is it?', {
      lifelike: 'A real-looking ear on its own, life size, cut edge and all, lying where it fell.',
      anatomical: 'An enlarged teaching model on a stand, with the ear canal, drum, tiny bones and coiled cochlea in bright colours behind it.',
      plaster: 'A white plaster cast of an ear on a rectangular plaque, the kind art students draw from.',
      prosthetic: 'A glossy silicone prosthetic ear resting on a little display wedge with a shade tag.',
    }),
    tone: choice('If it is flesh-coloured, what is the skin like?', {
      pale: 'Pale and pink, quick to flush.',
      olive: 'Warm olive tan.',
      brown: 'Mid brown.',
      deep: 'Deep dark brown.',
      dead: 'Waxy grey-green, drained of blood.',
    }),
    lobe: choice('What is the lobe like?', {
      attached: 'Attached: it runs straight into the cheek with no hanging part.',
      free: 'Free: a soft rounded lobe hanging clear.',
      stretched: 'Stretched: a long lobe with a wide open hole through it.',
      torn: 'Torn: split through where an earring was ripped out.',
    }),
    shape: choice('What shape is the ear?', {
      neat: 'Small and neat, close to the head.',
      jug: 'Big and sticking out, a cupped jug handle.',
      cauliflower: 'A boxer\'s cauliflower ear, its folds swollen shut into hard lumps.',
      pointed: 'Pointed at the top like an elf\'s or a faun\'s.',
    }),
    jewellery: choice('What is it wearing?', {
      none: 'Nothing.',
      stud: 'A single stud in the lobe.',
      ladder: 'A ladder of small rings climbing the rim.',
      aid: 'A beige hearing aid hooked over the top with a clear tube into the canal.',
    }),
    condition: choice('What state is it in?', {
      healthy: 'Healthy.',
      frostbitten: 'Frostbitten: the upper rim gone purple and black, blistered.',
      bandaged: 'Bandaged: gauze wound round the upper half, a little blood seeping through.',
      bitten: 'Bitten: a ragged crescent missing from the rim.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const flesh = a.kind !== 'plaster';

    // ---- outline ------------------------------------------------------------------------
    const R = [...OUTLINE];
    if (a.shape === 'neat') { R[5] *= 0.92; R[6] *= 0.9; R[7] *= 0.92; R[3] *= 0.96; }
    if (a.shape === 'jug') { for (const i of [3, 4, 5, 6, 7]) R[i] *= 1.13; }
    if (a.shape === 'cauliflower') { for (const i of [4, 5, 6, 7]) R[i] *= 1.05; }
    if (a.lobe === 'attached') { R[8] = 0.38; R[9] = 0.37; R[10] = 0.31; R[11] = 0.25; }
    if (a.lobe === 'free') { R[9] = 0.5; R[10] = 0.35; }
    if (a.lobe === 'stretched') { R[8] = 0.47; R[9] = 0.66; R[10] = 0.42; }
    for (let i = 0; i < 12; i++) R[i] *= 1 + jitter(0.03);
    const outline = (theta: number) => {
      const t = wrap(theta) / 30, i = Math.floor(t), f = t - i;
      const p0 = R[(i + 11) % 12], p1 = R[i % 12], p2 = R[(i + 1) % 12], p3 = R[(i + 2) % 12];
      let r = 0.5 * (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f * f * f);
      if (a.shape === 'pointed') r += 0.3 * near(theta, 108, 13) + 0.05 * near(theta, 108, 40);
      return r;
    };
    const cup = a.shape === 'jug' ? 0.3 : a.shape === 'neat' ? 0.08 : 0.14;
    const lumps = a.shape === 'cauliflower'
      ? Array.from({ length: 9 }, (_u, i) => {
        const theta = 70 + i * 22 + jitter(10), rho = 0.5 + random() * 0.32, r = outline(theta) * rho;
        return { x: r * Math.cos(theta * DEG), y: r * Math.sin(theta * DEG), w: 0.07 + random() * 0.05, h: 0.07 + random() * 0.06 };
      })
      : [];

    // ---- holes: bites, tears and stretched piercings ----------------------------------------
    const holes: Hole[] = [];
    const biteAt = 132 + jitter(18);
    if (a.condition === 'bitten') {
      const r = outline(biteAt);
      holes.push({ x: r * Math.cos(biteAt * DEG), y: r * Math.sin(biteAt * DEG), r: 0.15 + random() * 0.04, scallop: 0.16, raw: true });
    }
    if (a.lobe === 'stretched') holes.push({ x: 0, y: -R[9] * 0.68, r: 0.105, scallop: 0, raw: false });
    if (a.lobe === 'torn') {
      holes.push({ x: 0.01, y: -R[9] * 1.0, r: 0.055, scallop: 0.2, raw: true });
      holes.push({ x: 0.0, y: -R[9] * 0.84, r: 0.036, scallop: 0.2, raw: true });
    }

    // ---- relief ---------------------------------------------------------------------------
    const cupAt = (x: number) => cup * smooth(0.15, -0.45, x);
    const front = (x: number, y: number, rho: number, theta: number) => {
      const swollen = a.shape === 'cauliflower';
      const helixOn = smooth(15, 50, theta) * (1 - smooth(215, 250, theta));
      const antiOn = smooth(70, 115, theta) * (1 - smooth(235, 262, theta));
      let z = (swollen ? 0.095 : 0.078) * helixOn * bump(rho, 0.9, swollen ? 0.12 : 0.085);
      z += 0.075 * antiOn * bump(rho, 0.56 + 0.06 * bump(theta, 95, 35), swollen ? 0.16 : 0.1);
      z += 0.04 * bump(theta, 75, 22) * bump(rho, 0.62, 0.16);
      z -= 0.13 * (1 - smooth(0.2, 0.48, rho));
      z -= 0.1 * Math.exp(-(((x - 0.06) ** 2) + ((y + 0.02) ** 2)) / 0.005);
      // crus of the helix, running from the front attachment into the hollow
      const ax = 0.2, ay = 0.13, bx = -0.02, by = 0.05;
      const t = Math.min(1, Math.max(0, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
      z += 0.075 * (1 - t * 0.6) * Math.exp(-(((x - ax - (bx - ax) * t) ** 2) + ((y - ay - (by - ay) * t) ** 2)) / 0.0016);
      z += 0.125 * Math.exp(-((((x - 0.185) / 0.055) ** 2) + (((y + 0.045) / 0.085) ** 2)));
      z += 0.085 * Math.exp(-((((x + 0.04) / 0.075) ** 2) + (((y + 0.2) / 0.05) ** 2)));
      const lobeOn = smooth(235, 262, theta) * (1 - smooth(318, 345, theta));
      z += 0.04 * lobeOn * smooth(0.45, 0.75, rho);
      for (const l of lumps) z += l.h * Math.exp(-(((x - l.x) ** 2) + ((y - l.y) ** 2)) / (l.w * l.w));
      const edge = smooth(0.94, 1, rho);
      return cupAt(x) + z * (1 - edge * edge);
    };
    const back = (x: number, _y: number, rho: number, theta: number) => {
      const helixOn = smooth(15, 50, theta) * (1 - smooth(215, 250, theta));
      const edge = smooth(0.94, 1, rho);
      return cupAt(x) - 0.05 * (1 - rho ** 8) - 0.1 * (1 - smooth(0.25, 0.62, rho)) - 0.035 * helixOn * bump(rho, 0.9, 0.08) * (1 - edge * edge);
    };
    /** A point on the front surface, for hanging jewellery on. */
    const surface = (rho: number, theta: number, lift = 0) => {
      const r = outline(theta) * rho, x = r * Math.cos(theta * DEG), y = r * Math.sin(theta * DEG);
      return new THREE.Vector3(x, y, front(x, y, rho, wrap(theta)) + lift);
    };

    // ---- colour ---------------------------------------------------------------------------
    const skinBase = { pale: '#ecc0a6', olive: '#cf9f77', brown: '#9a6746', deep: '#6f4732', dead: '#a9ad94' }[a.tone];
    const skinDeep = { pale: '#b9655a', olive: '#96583f', brown: '#5f3524', deep: '#3a1f17', dead: '#5d6753' }[a.tone];
    const plasterTint = new THREE.Color('#efece2').lerp(new THREE.Color('#b9ae97'), mood.wear * 0.5);
    const base = flesh ? new THREE.Color(skinBase) : plasterTint.clone();
    const deep = flesh ? new THREE.Color(skinDeep) : plasterTint.clone().multiplyScalar(0.62);
    if (a.kind === 'anatomical') { base.lerp(new THREE.Color('#f0b7a4'), 0.35); }
    const blood = new THREE.Color(flesh ? (a.tone === 'dead' ? '#4a1518' : '#8f1418') : '#8d8571');
    const frostA = new THREE.Color('#6a3f66'), frostB = new THREE.Color('#1b1418');
    const grime = new THREE.Color('#5b5142');

    // ---- the shell ------------------------------------------------------------------------
    const NT = 144, NR = 44;
    const positions: number[] = [], colours: number[] = [], index: number[] = [];
    const c = new THREE.Color();
    for (const sheet of [0, 1])
      for (let it = 0; it <= NT; it++) {
        const theta = (it % NT) * 360 / NT, Rt = outline(theta);
        for (let ir = 0; ir <= NR; ir++) {
          const rho = ir / NR;
          const x0 = Rt * rho * Math.cos(theta * DEG), y0 = Rt * rho * Math.sin(theta * DEG);
          let x = x0, y = y0, pinch = 0, raw = 0;
          for (const h of holes) {
            const dx = x - h.x, dy = y - h.y, d = Math.hypot(dx, dy) || 1e-6;
            const rb = h.r * (1 - h.scallop + h.scallop * Math.abs(Math.cos(Math.atan2(dy, dx) * 3.5)));
            if (d < rb) { x = h.x + dx / d * rb; y = h.y + dy / d * rb; pinch = 1; if (h.raw) raw = 1; }
            else {
              const p = 1 - smooth(rb, rb * 1.4, d);
              pinch = Math.max(pinch, p);
              if (h.raw) raw = Math.max(raw, 1 - smooth(rb, rb * 1.22, d));
            }
          }
          const zf = front(x0, y0, rho, theta), zb = back(x0, y0, rho, theta), mid = (zf + zb) / 2;
          const z = sheet === 0 ? mix(zf, mid + 0.014, pinch) : mix(zb, mid - 0.014, pinch);
          positions.push(x, y, z);

          // colour: recesses run darker and redder, the canal goes nearly black
          const hollow = (1 - smooth(0.2, 0.5, rho)) * 0.55 + 0.25 * bump(rho, 0.76, 0.07) * smooth(60, 100, theta) * (1 - smooth(215, 250, theta));
          c.copy(base).lerp(deep, sheet === 0 ? hollow : 0.18);
          if (sheet === 0) c.lerp(new THREE.Color(flesh ? '#1a0b0a' : '#57503f'), 0.85 * Math.exp(-(((x0 - 0.07) ** 2) + ((y0 + 0.02) ** 2)) / 0.0035));
          if (flesh) {
            c.lerp(deep, 0.16 * smooth(0.7, 1, rho) + 0.12 * smooth(235, 262, theta) * (1 - smooth(318, 345, theta)));
            if (a.condition === 'frostbitten') {
              const f = smooth(0.5, 0.9, rho) * smooth(-0.08, 0.28, y0);
              c.lerp(frostA, f * 0.85).lerp(frostB, smooth(0.82, 1, rho) * smooth(0.05, 0.35, y0) * 0.9);
            }
            if (a.kind === 'lifelike') {
              const cut = near(theta, 0, 38) * smooth(0.82, 0.97, rho);
              c.lerp(blood, Math.min(1, cut * 1.2));
              if (sheet === 1) c.lerp(blood, (1 - smooth(0.3, 0.6, rho)) * 0.9);
            }
          }
          c.lerp(blood, raw * (flesh ? 0.95 : 0.7));
          c.lerp(grime, mood.wear * 0.22 * (0.4 + hollow));
          colours.push(c.r, c.g, c.b);
        }
      }
    const ring = NR + 1, per = (NT + 1) * ring;
    for (let it = 0; it < NT; it++)
      for (let ir = 0; ir < NR; ir++) {
        const v00 = it * ring + ir, v01 = v00 + 1, v10 = v00 + ring, v11 = v10 + 1;
        index.push(v00, v01, v11, v00, v11, v10);
        index.push(per + v00, per + v11, per + v01, per + v00, per + v10, per + v11);
      }
    const shell = new THREE.BufferGeometry();
    shell.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    shell.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    shell.setIndex(index);
    shell.computeVertexNormals();

    const E = new THREE.Group();
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = E) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const skinMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: { lifelike: 0.58, anatomical: 0.42, plaster: 0.93, prosthetic: 0.26 }[a.kind] + mood.wear * 0.1,
    });
    add(shell, skinMaterial);

    // ---- condition dressing -------------------------------------------------------------------
    if (a.condition === 'frostbitten' && flesh) {
      const blister = new THREE.MeshStandardMaterial({ color: '#d9c9a0', roughness: 0.3 });
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 9; i++) {
        const p = surface(0.8 + random() * 0.14, 60 + random() * 110, 0.004);
        parts.push(placed(new THREE.SphereGeometry(0.014 + random() * 0.014, 8, 6), [p.x, p.y, p.z], [1, 1, 0.6]));
      }
      add(fuse(parts, blister).geometry, blister);
    }
    if (a.condition === 'bandaged') {
      const gauze = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f1ede2').lerp(new THREE.Color('#b8ab8e'), mood.wear * 0.6), roughness: 0.95 });
      const parts: THREE.BufferGeometry[] = [];
      const levels = [0.15, 0.22, 0.29, 0.36, 0.43];
      levels.forEach((level, k) => {
        let lo = 1, hi = -1;
        for (let t = 0; t < 360; t += 2) {
          const r = outline(t), y = r * Math.sin(t * DEG);
          if (Math.abs(y - level) < 0.035) { lo = Math.min(lo, r * Math.cos(t * DEG)); hi = Math.max(hi, r * Math.cos(t * DEG)); }
        }
        if (hi < lo) return;
        const cx = (lo + hi) / 2, rx = (hi - lo) / 2 + 0.02, tilt = jitter(0.12) + (k % 2 ? 0.16 : -0.16);
        const loop: THREE.Vector3[] = [];
        for (let i = 0; i < 20; i++) {
          const t = i / 20 * Math.PI * 2, px = Math.cos(t) * rx;
          loop.push(new THREE.Vector3(cx + px, level + px * tilt + jitter(0.006), cupAt(cx + px) - 0.015 + Math.sin(t) * 0.115));
        }
        parts.push(sweep(loop, () => [0.006, 0.05], { closed: true, steps: 56, sides: 8 }));
      });
      add(fuse(parts, gauze).geometry, gauze);
      if (flesh) {
        const seep = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.75 ? '#b5606a' : '#8a1a1c', roughness: 0.8 });
        const p = surface(0.92, 150, 0);
        add(placed(new THREE.SphereGeometry(1, 14, 10), [p.x + 0.04, 0.22, cupAt(p.x) + 0.085], [0.07, 0.06, 0.035], [0, -0.7, 0]), seep);
      }
    }

    // ---- jewellery ----------------------------------------------------------------------------
    const metalColour = mood.warmth > 0.45 ? '#d6a93a' : '#cfd3d6';
    const metal = new THREE.MeshStandardMaterial({ color: metalColour, metalness: 0.9, roughness: 0.24 });
    if (a.jewellery === 'stud') {
      const p = a.lobe === 'stretched' ? surface(0.52, 262, 0.012) : a.lobe === 'torn' ? surface(0.66, 252, 0.012) : surface(0.72, 268, 0.012);
      const gem = random() < 0.5;
      add(placed(new THREE.SphereGeometry(0.034, 14, 10), [p.x, p.y, p.z]), gem ? new THREE.MeshStandardMaterial({ color: ['#c81e3a', '#2f6fd0', '#2fa36b', '#f4f4f6'][Math.floor(random() * 4)], roughness: 0.08, metalness: 0.2 }) : metal);
      if (gem) { const collar = new THREE.TorusGeometry(0.034, 0.008, 6, 20); add(placed(collar, [p.x, p.y, p.z - 0.006]), metal); }
    }
    if (a.jewellery === 'ladder') {
      const parts: THREE.BufferGeometry[] = [];
      const count = 4 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const theta = 96 + i * (118 / count) + jitter(3);
        if (a.condition === 'bitten' && Math.abs(theta - biteAt) < 30) continue;
        const p = surface(0.985, theta);
        const hoop = new THREE.TorusGeometry(0.05, 0.009, 6, 22);
        hoop.rotateX(Math.PI / 2);
        hoop.rotateZ(theta * DEG);
        parts.push(placed(hoop, [p.x * 0.98, p.y * 0.98, cupAt(p.x) + 0.005]));
      }
      if (parts.length) add(fuse(parts, metal).geometry, metal);
    }
    if (a.jewellery === 'aid') {
      const shellColour = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.8 ? '#e2557a' : '#c9a98a', roughness: 0.4 });
      const o = (theta: number, scale: number, z: number) => { const r = outline(theta) * scale; return new THREE.Vector3(r * Math.cos(theta * DEG), r * Math.sin(theta * DEG), cupAt(r * Math.cos(theta * DEG)) + z); };
      add(sweep([o(112, 1.04, -0.02), o(135, 1.1, -0.05), o(160, 1.14, -0.07), o(185, 1.12, -0.07), o(200, 1.05, -0.06)], (t) => { const r = 0.035 + 0.04 * Math.sin(Math.min(1, t * 1.25) * Math.PI) ** 0.7; return [r, r * 0.8]; }, { steps: 30, sides: 10, up: new THREE.Vector3(0, 0, 1) }), shellColour);
      const tubeMaterial = new THREE.MeshStandardMaterial({ color: '#e8eef0', roughness: 0.2 });
      add(sweep([o(112, 1.04, -0.02), o(88, 1.05, 0.03), o(62, 0.98, 0.09), o(40, 0.72, 0.12), new THREE.Vector3(0.1, 0.06, 0.03), new THREE.Vector3(0.07, -0.02, -0.07)], () => [0.011, 0.011], { steps: 40, sides: 6, up: new THREE.Vector3(0, 0, 1) }), tubeMaterial);
      add(placed(new THREE.SphereGeometry(0.04, 12, 8), [0.07, -0.02, -0.075]), tubeMaterial);
    }

    // ---- presentation -------------------------------------------------------------------------
    const P = new THREE.Group();
    P.add(E);
    s.root.add(P);
    const wood = s.material(['#5a3a22', '#2a2623', '#7a5632'][Math.floor(random() * 3)], { roughness: 0.55 });
    if (a.kind === 'lifelike') {
      const unit = a.shape === 'neat' ? 0.058 : 0.066;
      P.scale.setScalar(unit);
      E.rotation.order = 'YXZ';
      E.rotation.set(-0.8 + jitter(0.08), 0.25 + jitter(0.2), jitter(0.3));
      if (a.tone !== 'dead' && (a.condition === 'bitten' || mood.cheer < 0.4)) {
        // a small pool where it lies
        const pool = new THREE.Shape();
        const lobes = 9;
        for (let i = 0; i <= 48; i++) {
          const t = i / 48 * Math.PI * 2, r = 0.34 * (0.72 + 0.2 * Math.sin(t * 3 + random()) + 0.1 * Math.sin(t * lobes));
          if (i === 0) pool.moveTo(Math.cos(t) * r, Math.sin(t) * r); else pool.lineTo(Math.cos(t) * r, Math.sin(t) * r);
        }
        const g = new THREE.ExtrudeGeometry(pool, { depth: 0.006, bevelEnabled: false });
        g.rotateX(-Math.PI / 2);
        E.updateMatrixWorld(true);
        const low = new THREE.Box3().setFromObject(E).min.y;
        const mesh = add(placed(g, [0.08, low, 0.1]), new THREE.MeshStandardMaterial({ color: '#7a0f13', roughness: 0.12 }), P);
        mesh.castShadow = false;
      }
    } else if (a.kind === 'plaster') {
      P.scale.setScalar(0.13);
      const slab = new THREE.MeshStandardMaterial({ color: plasterTint, roughness: 0.95 });
      const lean = -0.3 + jitter(0.04);
      const board = new THREE.Group();
      board.rotation.x = lean;
      P.add(board);
      board.add(E);
      E.position.set(0.04, 0.04, 0.1);
      const top = Math.max(0.72, outline(100) + 0.17), bottom = -Math.max(0.66, R[9] + 0.16);
      const plate = new THREE.BoxGeometry(1.02, top - bottom, 0.09, 6, 8, 1);
      const pp = plate.attributes.position;
      for (let i = 0; i < pp.count; i++) pp.setXYZ(i, pp.getX(i) + jitter(0.006), pp.getY(i) + jitter(0.006), pp.getZ(i));
      plate.computeVertexNormals();
      add(placed(plate, [0, (top + bottom) / 2, -0.03]), slab, board);
      // bridging mass so the cast grows out of the plaque
      add(placed(new THREE.SphereGeometry(1, 20, 12), [0.1, 0.02, 0.01], [0.3, 0.42, 0.07]), slab, board);
      const hole = new THREE.MeshStandardMaterial({ color: '#3a352c', roughness: 1 });
      add(placed(new THREE.CylinderGeometry(0.03, 0.03, 0.094, 12), [0, top - 0.09, -0.03], [1, 1, 1], [Math.PI / 2, 0, 0]), hole, board);
      if (mood.wear > 0.45) add(placed(new THREE.SphereGeometry(0.1, 8, 6), [0.47, bottom + 0.06, 0.0], [1, 1.2, 0.5]), new THREE.MeshStandardMaterial({ color: '#cfc6b2', roughness: 1 }), board);
      // an easel strut behind
      add(strut([0, top * 0.4, -0.08], [0, bottom * Math.cos(lean) - 0.02, -0.62], 0.03, 0.03, 6), wood, P).rotation.x = 0;
      board.position.y = 0;
      const tag = painted(256, 96, (ctx, w, h) => {
        ctx.fillStyle = '#e9e1c8'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#3a3128'; ctx.font = 'italic 54px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`No. ${10 + Math.floor(random() * 80)}`, w / 2, h / 2 + 4);
      });
      add(placed(new THREE.PlaneGeometry(0.3, 0.11), [-0.3, bottom + 0.1, 0.018]), new THREE.MeshStandardMaterial({ map: tag, roughness: 0.9 }), board);
    } else if (a.kind === 'prosthetic') {
      P.scale.setScalar(0.066);
      E.rotation.x = -0.945;
      E.rotation.z = jitter(0.12);
      E.position.set(0, 0.53, 0.08);
      const wedgeMaterial = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#f3f1ec' : '#26262a', roughness: 0.35 });
      const wedge = new THREE.Shape();
      wedge.moveTo(-0.62, 0); wedge.lineTo(0.5, 0); wedge.lineTo(0.5, 0.06); wedge.lineTo(-0.5, 0.78); wedge.lineTo(-0.62, 0.78); wedge.closePath();
      const wg = new THREE.ExtrudeGeometry(wedge, { depth: 0.95, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
      wg.translate(0, 0, -0.475);
      wg.rotateY(-Math.PI / 2);
      add(wg, wedgeMaterial, P);
      const tagTexture = painted(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#f6f1e2'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#25303a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 50px monospace'; ctx.fillText(`${random() < 0.5 ? 'L' : 'R'} · ${String.fromCharCode(65 + Math.floor(random() * 6))}${1 + Math.floor(random() * 9)}`, w / 2, 46);
        ctx.font = '26px monospace'; ctx.fillText('SHADE MATCH', w / 2, 98);
      });
      const tagMesh = add(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshStandardMaterial({ map: tagTexture, roughness: 0.85, side: THREE.DoubleSide }), P);
      tagMesh.position.set(0.52, 0.012, 0.52);
      tagMesh.rotation.set(-Math.PI / 2, 0, 0.5 + jitter(0.4));
      add(strut([0.4, 0.014, 0.44], [0.08, 0.2, 0.2], 0.005, 0.005, 4), new THREE.MeshStandardMaterial({ color: '#b93a2e', roughness: 0.9 }), P);
    } else {
      // enlarged model with the middle and inner ear trailing inward behind it
      P.scale.setScalar(0.3);
      const M = new THREE.Group();
      P.add(M);
      M.add(E);
      const lift = Math.max(0.78, R[9] + 0.24);
      E.position.y = lift;
      M.rotation.y = -0.72 + jitter(0.06);
      const at = (x: number, y: number, z: number) => new THREE.Vector3(x, y + lift, z);
      const canalPink = new THREE.MeshStandardMaterial({ color: '#e59a8f', roughness: 0.45 });
      const bone = new THREE.MeshStandardMaterial({ color: new THREE.Color('#ede3c4').lerp(grime, mood.wear * 0.3), roughness: 0.6 });
      const snail = new THREE.MeshStandardMaterial({ color: mood.warmth > 0.5 ? '#7a57b8' : '#3f6fc4', roughness: 0.38 });
      const loops = new THREE.MeshStandardMaterial({ color: mood.warmth > 0.5 ? '#b58ad6' : '#77a8dc', roughness: 0.38 });
      const nerve = new THREE.MeshStandardMaterial({ color: '#e8c531', roughness: 0.5 });
      const red = new THREE.MeshStandardMaterial({ color: '#c23a35', roughness: 0.45 });
      // canal, a flared trumpet from the hollow of the ear
      add(sweep([at(0.07, -0.02, -0.1), at(0.09, 0.0, -0.3), at(0.1, 0.03, -0.5), at(0.11, 0.02, -0.66)], (t) => { const r = 0.115 - 0.035 * t; return [r, r * 0.9]; }, { steps: 20, sides: 14 }), canalPink, M);
      const drum = add(placed(new THREE.SphereGeometry(1, 18, 10), [0, 0, 0], [0.115, 0.115, 0.022]), new THREE.MeshStandardMaterial({ color: '#f1e7c8', roughness: 0.25 }), M);
      drum.position.copy(at(0.11, 0.02, -0.67));
      drum.rotation.set(0.3, 0.2, 0);
      // hammer, anvil, stirrup
      const ossicles = [
        strut([0.11, 0.0 + lift, -0.69], [0.12, 0.13 + lift, -0.74], 0.016, 0.026, 6),
        placed(new THREE.SphereGeometry(0.036, 8, 6), [0.12, 0.14 + lift, -0.75]),
        strut([0.12, 0.14 + lift, -0.76], [0.15, 0.04 + lift, -0.83], 0.024, 0.012, 6),
        placed(new THREE.TorusGeometry(0.03, 0.009, 5, 12), [0.16, 0.03 + lift, -0.86], [1, 1, 1], [0, 0.4, 0]),
      ];
      add(fuse(ossicles, bone).geometry, bone, M);
      // cochlea: a tapering spiral
      const spiral: THREE.Vector3[] = [];
      const turns = 2.6;
      for (let i = 0; i <= 60; i++) {
        const t = i / 60, angle = t * turns * Math.PI * 2, r = 0.2 * (1 - t * 0.8);
        spiral.push(at(0.22 + t * 0.14, -0.06 + Math.sin(angle) * r, -1.08 + Math.cos(angle) * r));
      }
      add(sweep(spiral, (t) => { const r = 0.062 * (1 - t * 0.62); return [r, r]; }, { steps: 120, sides: 10, up: new THREE.Vector3(1, 0, 0) }), snail, M);
      // three semicircular canals, each in its own plane
      const canals: THREE.BufferGeometry[] = [];
      for (const [turn, offset] of [[[0, 0, 0], [0, 0.26, -1.0]], [[0, Math.PI / 2, 0], [0.12, 0.27, -0.94]], [[Math.PI / 2, 0, 0.5], [0.1, 0.2, -0.88]]] as const) {
        const loop = new THREE.TorusGeometry(0.14, 0.03, 8, 30, Math.PI * 1.55);
        loop.rotateZ(-Math.PI * 0.27);
        canals.push(placed(loop, [0.1 + offset[0], offset[1] + lift, offset[2]], [1, 1, 1], turn));
      }
      canals.push(placed(new THREE.SphereGeometry(0.085, 12, 8), [0.16, 0.12 + lift, -0.95], [1, 0.9, 1.1]));
      add(fuse(canals, loops).geometry, loops, M);
      // the nerve leaving, and the tube down to the throat
      add(sweep([at(0.24, -0.02, -1.08), at(0.36, 0.06, -1.14), at(0.5, 0.16, -1.24), at(0.62, 0.3, -1.3)], (t) => [0.045 - 0.012 * t, 0.045 - 0.012 * t], { steps: 16, sides: 8 }), nerve, M);
      add(sweep([at(0.14, -0.04, -0.78), at(0.22, -0.2, -0.86), at(0.34, -0.4, -0.9), at(0.44, -0.56, -0.9)], (t) => [0.03 + 0.03 * t, 0.03 + 0.03 * t], { steps: 16, sides: 8 }), red, M);
      // stand: two rods on a long board
      const steel = new THREE.MeshStandardMaterial({ color: '#b9bcbd', metalness: 0.8, roughness: 0.3 });
      add(fuse([strut([0.1, 0.06, -0.38], [0.1, lift - 0.1, -0.38], 0.022, 0.022, 8), strut([0.2, 0.06, -1.02], [0.2, lift - 0.26, -1.06], 0.018, 0.018, 8)], steel).geometry, steel, M);
      const boardG = new THREE.BoxGeometry(0.62, 0.07, 1.62);
      add(placed(boardG, [0.14, 0.035, -0.62]), wood, M);
      const plate = painted(256, 64, (ctx, w, h) => {
        ctx.fillStyle = '#c9a955'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#2b2415'; ctx.font = 'bold 34px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`AURIS ×${3 + Math.floor(random() * 4)}`, w / 2, h / 2 + 2);
      });
      const brass = add(new THREE.PlaneGeometry(0.34, 0.085), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.4, metalness: 0.4 }), M);
      brass.position.set(0.451, 0.035, -0.4);
      brass.rotation.y = Math.PI / 2;
    }
    return s.finish();
  },
});
