import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, score } from '@conjure/kit';

type P2 = readonly [number, number];
// Drawn in a unit frame: x from the cheek (0.1) to the back rim (0.62), y from lobe (0) to crown (1).
const OUTLINE: P2[] = [[0.18, 0.8], [0.24, 0.94], [0.37, 1], [0.52, 0.95], [0.61, 0.8], [0.62, 0.62], [0.57, 0.44], [0.48, 0.28], [0.4, 0.13], [0.3, 0.01], [0.2, 0.03], [0.14, 0.15], [0.13, 0.3], [0.1, 0.42], [0.11, 0.55], [0.15, 0.68]];
const HELIX: P2[] = [[0.25, 0.56], [0.19, 0.66], [0.21, 0.8], [0.28, 0.9], [0.38, 0.94], [0.49, 0.89], [0.555, 0.77], [0.56, 0.62], [0.52, 0.46], [0.45, 0.33], [0.39, 0.23]];
const ANTIHELIX: P2[] = [[0.33, 0.27], [0.4, 0.36], [0.44, 0.48], [0.44, 0.6], [0.4, 0.7], [0.34, 0.78], [0.28, 0.8]];
const CRUS: P2[] = [[0.43, 0.62], [0.36, 0.64], [0.29, 0.66]];
const CANAL: P2 = [0.235, 0.45];

const smooth = (points: P2[], closed: boolean, samples: number): P2[] =>
  new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, 0)), closed).getSpacedPoints(samples).map((p) => [p.x, p.y] as const);

/** Distance to a polyline, the nearest point on it, and how far along it that point lies (0..1). */
function nearest(x: number, y: number, line: P2[]) {
  let best = Infinity, bx = 0, by = 0, along = 0;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1], [cx, cy] = line[i];
    const dx = cx - ax, dy = cy - ay;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    const px = ax + dx * t, py = ay + dy * t, d = Math.hypot(x - px, y - py);
    if (d < best) { best = d; bx = px; by = py; along = (i - 1 + t) / (line.length - 1); }
  }
  return { d: best, x: bx, y: by, along };
}
function inside(x: number, y: number, ring: P2[]) {
  let within = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) within = !within;
  }
  return within;
}

export default defineThing({
  questions: {
    material: choice('What is the ear made of?', {
      flesh: 'Flesh-pink and soft, a real ear grown to the size of a hill.',
      marble: 'White veined marble, broken from a colossal statue.',
      iron: 'Rusted iron plate, orange and brown, like a wreck.',
      wax: 'Pale yellow wax, slumping and melting into puddles at its edges.',
    }),
    buried: choice('How deep in the sand is it?', {
      top: 'Resting on top, propped up on a dune so the whole ear shows.',
      half: 'Half under: one side raised, the other swallowed by a drift.',
      rim: 'Almost gone: only the rim and the inner ridges break the surface.',
    }),
    canal: choice('What is in the ear canal?', {
      darkness: 'Only darkness, a black hole into the head that is not there.',
      light: 'A warm light glowing up out of it.',
      ladder: 'A ladder poking up out of it, as if someone climbed down.',
      water: 'Water has pooled in the bowl around it, still and blue.',
      figure: 'A small figure stands at its edge with a hand cupped, listening back.',
    }),
    jewellery: choice('Does it wear any jewellery?', {
      none: 'None.',
      ring: 'One gold ring through the lobe, the size of a hoop gate.',
      several: 'Several: rings climbing the rim and a stud like a boulder.',
    }),
    listening: choice('What is it listening to?', {
      wind: 'The wind: pale streaks of air curl into it.',
      gramophone: 'A tiny gramophone set down beside it, horn aimed at the canal.',
      nothing: 'Nothing at all.',
    }),
    size: score('How big is it?', ['An armchair', 'A parked car', 'An amphitheatre']),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const ear = new THREE.Group();
    root.add(ear);
    const S = mix(1.2, 22, a.size ** 1.4);
    const wax = a.material === 'wax';

    // Skin: a painted map multiplied by a height shade baked into vertex colours.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const base = { flesh: '#eba894', marble: '#ecebe6', iron: '#a8603a', wax: '#f0dc9a' }[a.material];
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    const speck = (colour: string, count: number, size: number, alpha: number) => {
      ctx.fillStyle = colour;
      for (let i = 0; i < count; i++) { ctx.globalAlpha = alpha * (0.4 + random() * 0.6); const r = size * (0.3 + random()); ctx.fillRect(random() * 256, random() * 256, r, r); }
      ctx.globalAlpha = 1;
    };
    if (a.material === 'flesh') { speck('#d9705f', 220, 9, 0.08); speck('#fbd3c4', 200, 6, 0.1); }
    if (a.material === 'iron') { speck('#c96a2c', 500, 5, 0.22); speck('#5d3b2c', 250, 4, 0.2); speck('#e39a4a', 250, 3, 0.3); }
    if (a.material === 'wax') { speck('#fff3c4', 200, 12, 0.12); speck('#d7b866', 150, 10, 0.1); }
    if (a.material === 'marble') {
      ctx.strokeStyle = '#8f93a0';
      for (let i = 0; i < 10; i++) {
        ctx.globalAlpha = 0.2 + random() * 0.35; ctx.lineWidth = 0.5 + random() * 1.5; ctx.beginPath();
        let x = random() * 256, y = 0; ctx.moveTo(x, y);
        while (y < 256) { x += (random() - 0.5) * 44; y += 10 + random() * 22; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    speck('#6b5a48', 200 + mood.wear * 900, 2.5, 0.08 + mood.wear * 0.1);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const skin = new THREE.MeshStandardMaterial({
      map, vertexColors: true, side: THREE.DoubleSide,
      roughness: { flesh: 0.55, marble: 0.4, iron: 0.85, wax: 0.3 }[a.material] + mood.wear * 0.15,
      metalness: a.material === 'iron' ? 0.5 : 0,
    });
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: readonly [number, number, number] = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Height field over the ear outline: a rounded slab, rim and ridges raised, the bowl pressed in.
    const outline = smooth(OUTLINE, true, 90), helix = smooth(HELIX, false, 60), anti = smooth(ANTIHELIX, false, 40), crus = smooth(CRUS, false, 16);
    const slump = wax ? 0.72 : 1;
    const height = (x: number, y: number, edge: number) => {
      const rise = Math.min(1, edge / 0.07);
      let h = 0.075 * Math.sqrt(1 - (1 - rise) ** 2);
      const firm = Math.min(1, edge / 0.03);
      const rim = nearest(x, y, helix);
      h += 0.11 * slump * Math.exp(-((rim.d / 0.036) ** 2)) * firm * Math.min(1, (1 - rim.along) * 5 + 0.15) * Math.min(1, rim.along * 9 + 0.35);
      h += 0.08 * slump * Math.exp(-((nearest(x, y, anti).d / 0.04) ** 2)) * firm;
      h += 0.06 * slump * Math.exp(-((nearest(x, y, crus).d / 0.035) ** 2)) * firm;
      h += 0.055 * Math.exp(-(((x - 0.155) / 0.035) ** 2 + ((y - 0.45) / 0.06) ** 2)) * firm; // tragus
      h += 0.04 * Math.exp(-(((x - 0.31) / 0.04) ** 2 + ((y - 0.27) / 0.04) ** 2)) * firm; // antitragus
      h += 0.03 * Math.exp(-(((x - 0.26) / 0.09) ** 2 + ((y - 0.13) / 0.09) ** 2)) * firm; // lobe
      h -= 0.07 * Math.exp(-(((x - 0.29) / 0.085) ** 2 + ((y - 0.47) / 0.11) ** 2)); // concha bowl
      h -= 0.03 * Math.exp(-(((x - 0.37) / 0.05) ** 2 + ((y - 0.84) / 0.05) ** 2)); // triangular fossa
      if (wax) h += Math.sin(x * 31 + y * 17) * 0.006 - (1 - rise) * 0.01;
      return h + (random() - 0.5) * 0.004 * mood.wear;
    };
    const NX = 62, NY = 108, x0 = 0.07, y0 = -0.02, cell = 1.04 / NY;
    const positions: number[] = [], colours: number[] = [], uvs: number[] = [], back: number[] = [];
    const ids = new Int32Array((NX + 1) * (NY + 1)).fill(-1);
    const tone = new THREE.Color();
    const toLocal = (x: number, y: number, h: number): [number, number, number] => [-(x - 0.36) * S, h * S, -(y - 0.5) * S];
    for (let j = 0; j <= NY; j++) {
      for (let i = 0; i <= NX; i++) {
        let x = x0 + i * cell, y = y0 + j * cell;
        const edge = nearest(x, y, outline);
        const within = inside(x, y, outline);
        if (!within && edge.d > cell * 1.5) continue;
        if (!within) { x = edge.x; y = edge.y; }
        const h = within ? height(x, y, edge.d) : 0;
        ids[j * (NX + 1) + i] = positions.length / 3;
        positions.push(...toLocal(x, y, h));
        back.push(...toLocal(x, y, within ? -0.1 * Math.sqrt(Math.min(1, edge.d / 0.14)) : 0));
        const shade = mix(0.42, 1.08, Math.min(1, Math.max(0, (h - 0.005) / 0.15)));
        tone.setScalar(shade);
        if (a.material === 'flesh') tone.multiply(new THREE.Color(1, mix(0.78, 1, shade), mix(0.74, 1, shade)));
        colours.push(tone.r, tone.g, tone.b);
        uvs.push(x * 1.5, y);
      }
    }
    const index: number[] = [], under: number[] = [];
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const p = ids[j * (NX + 1) + i], q = ids[j * (NX + 1) + i + 1], r = ids[(j + 1) * (NX + 1) + i], s = ids[(j + 1) * (NX + 1) + i + 1];
        if (p >= 0 && q >= 0 && r >= 0) { index.push(p, q, r); under.push(p, r, q); }
        if (q >= 0 && s >= 0 && r >= 0) { index.push(q, s, r); under.push(q, r, s); }
      }
    }
    const surface = (points: number[], order: number[]) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(order);
      geometry.computeVertexNormals();
      return geometry;
    };
    add(ear, surface(positions, index), skin);
    add(ear, surface(back, under), skin);
    const local = (x: number, y: number, lift = 0) => new THREE.Vector3(...toLocal(x, y, (inside(x, y, outline) ? height(x, y, nearest(x, y, outline).d) : 0) + lift));

    // Canal mouth.
    const dark = new THREE.MeshStandardMaterial({ color: '#120c0c', roughness: 1 });
    const hole = add(ear, new THREE.SphereGeometry(1, 20, 12), dark);
    hole.position.copy(local(...CANAL, 0.004));
    hole.scale.set(0.05 * S, 0.012 * S, 0.062 * S);

    // How it lies.
    const pose = { top: [0.5, 0.05], half: [0.85, -0.14], rim: [0.07, 0.03] }[a.buried];
    ear.rotation.set(pose[0], (random() - 0.5) * 0.35, pose[1]);
    ear.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(ear);
    const tall = bounds.max.y - bounds.min.y;
    const sink = { top: 0.03, half: 0.3, rim: 0 }[a.buried] * tall;
    ear.position.set(-(bounds.min.x + bounds.max.x) / 2, a.buried === 'rim' ? -0.07 * S - bounds.min.y * 0.3 : -bounds.min.y - sink, -(bounds.min.z + bounds.max.z) / 2);
    ear.updateMatrixWorld(true);
    const world = (x: number, y: number, lift = 0) => local(x, y, lift).applyMatrix4(ear.matrixWorld);

    // Sand: the dune it rests on or the drift that has taken it.
    const sandColour = new THREE.Color('#dcc8a0').lerp(new THREE.Color('#d2a878'), mood.warmth * 0.7);
    const sand = new THREE.MeshStandardMaterial({ color: sandColour, roughness: 1 });
    const ball = new THREE.SphereGeometry(1, 24, 14);
    const mound = (x: number, z: number, rx: number, ry: number, rz: number) => add(root, ball, sand, [x, 0, z]).scale.set(rx, ry, rz);
    if (a.buried === 'top') {
      const crown = world(0.4, 0.82), mid = world(0.38, 0.6);
      mound(crown.x, crown.z - 0.16 * S, 0.3 * S, crown.y * 0.8, 0.22 * S);
      mound(mid.x, mid.z - 0.1 * S, 0.34 * S, mid.y * 0.75, 0.2 * S);
      mound(0, 0.12 * S, 0.5 * S, 0.02 * S, 0.5 * S);
    } else if (a.buried === 'half') {
      mound(0, 0.02 * S, 0.5 * S, 0.035 * S, 0.34 * S);
      mound((random() - 0.5) * 0.3 * S, -0.2 * S, 0.36 * S, 0.1 * S, 0.2 * S);
      mound(0.2 * S, 0.1 * S, 0.2 * S, 0.05 * S, 0.16 * S);
    } else {
      mound(0, 0, 0.5 * S, 0.014 * S, 0.68 * S);
      for (let i = 0; i < 3; i++) mound((random() < 0.5 ? -1 : 1) * (0.3 + random() * 0.1) * S, (random() - 0.5) * 0.8 * S, (0.1 + random() * 0.1) * S, (0.025 + random() * 0.03) * S, (0.12 + random() * 0.14) * S);
    }

    // Melting wax runs off the low edges and pools.
    if (wax) {
      const waxy = new THREE.MeshStandardMaterial({ color: '#efd98f', roughness: 0.3 });
      for (let i = 0; i < 10 + Math.round(mood.wear * 10); i++) {
        const [ox, oy] = outline[Math.floor(random() * outline.length)];
        const p = world(ox, oy);
        if (p.y < 0.03 * S) { add(root, ball, waxy, [p.x, 0, p.z]).scale.set((0.04 + random() * 0.07) * S, 0.012 * S, (0.04 + random() * 0.07) * S); continue; }
        const drip = add(root, ball, waxy, [p.x, p.y - Math.min(p.y, 0.05 * S) * 0.8, p.z]);
        drip.scale.set(0.014 * S, Math.min(p.y, (0.04 + random() * 0.06) * S), 0.014 * S);
        add(root, ball, waxy, [p.x, 0, p.z]).scale.set(0.045 * S, 0.01 * S, 0.045 * S);
      }
    }

    // What is in the canal.
    const mouth = world(...CANAL, 0.005);
    let glow: THREE.MeshStandardMaterial | null = null;
    const person = Math.min(1.75, 0.09 * S);
    const pole = new THREE.MeshStandardMaterial({ color: '#8a6a45', roughness: 0.9 });
    const bar = (from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material = pole) => {
      const rod = add(root, new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), 6), material);
      rod.position.copy(from).add(to).multiplyScalar(0.5);
      rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      return rod;
    };
    if (a.canal === 'light') {
      glow = new THREE.MeshStandardMaterial({ color: '#fff0b8', emissive: '#ffc35a', emissiveIntensity: 2.2, roughness: 0.4 });
      hole.material = glow;
      const beam = add(root, new THREE.CylinderGeometry(0.1 * S, 0.045 * S, 0.5 * S, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd98a', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }), [mouth.x, mouth.y + 0.25 * S, mouth.z]);
      beam.castShadow = false;
    }
    if (a.canal === 'ladder') {
      const top = mouth.clone().add(new THREE.Vector3(0.02 * S, 0.2 * S, 0.03 * S)), foot = mouth.clone().add(new THREE.Vector3(0, -0.02 * S, 0));
      const half = new THREE.Vector3(0.016 * S, 0, 0);
      bar(foot.clone().sub(half), top.clone().sub(half), 0.0035 * S);
      bar(foot.clone().add(half), top.clone().add(half), 0.0035 * S);
      for (let i = 1; i < 9; i++) { const p = foot.clone().lerp(top, i / 9); bar(p.clone().sub(half), p.clone().add(half), 0.0028 * S); }
    }
    if (a.canal === 'water') {
      const water = add(ear, new THREE.SphereGeometry(1, 28, 10), new THREE.MeshStandardMaterial({ color: '#3f8fb8', roughness: 0.08, metalness: 0.3, emissive: '#1d5f86', emissiveIntensity: 0.25 }));
      water.position.copy(local(0.3, 0.47, 0.03));
      water.scale.set(0.11 * S, 0.012 * S, 0.15 * S);
    }
    if (a.canal === 'figure') {
      const cloth = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#c7402f' : '#2c2f3a', roughness: 0.8 });
      const feet = world(0.3, 0.44);
      const body = add(root, new THREE.CylinderGeometry(person * 0.1, person * 0.16, person * 0.62, 10), cloth, [feet.x, feet.y + person * 0.31, feet.z]);
      body.rotation.z = 0.12;
      add(root, new THREE.SphereGeometry(person * 0.1, 12, 10), new THREE.MeshStandardMaterial({ color: '#d9a98a', roughness: 0.7 }), [feet.x - person * 0.05, feet.y + person * 0.74, feet.z]);
      bar(new THREE.Vector3(feet.x - person * 0.02, feet.y + person * 0.55, feet.z), new THREE.Vector3(feet.x - person * 0.2, feet.y + person * 0.75, feet.z + person * 0.05), person * 0.03, cloth);
    }

    // Jewellery.
    const gold = new THREE.MeshStandardMaterial({ color: '#e3b23c', metalness: 0.9, roughness: 0.25, emissive: '#7a5410', emissiveIntensity: 0.25 });
    const hoop = (x: number, y: number, radius: number) => {
      const centre = world(x, y);
      const out = centre.clone().sub(world(0.33, 0.5)).setY(0).normalize();
      const ring = add(root, new THREE.TorusGeometry(radius, radius * 0.11, 10, 40), gold, [centre.x + out.x * radius * 0.55, Math.max(centre.y, radius * 0.55), centre.z + out.z * radius * 0.55]);
      ring.rotation.y = Math.atan2(out.x, out.z) + Math.PI / 2;
      ring.rotation.z = (random() - 0.5) * 0.5;
    };
    if (a.jewellery !== 'none') hoop(0.26, 0.07, 0.085 * S);
    if (a.jewellery === 'several') {
      hoop(0.57, 0.5, 0.05 * S);
      hoop(0.6, 0.66, 0.042 * S);
      hoop(0.53, 0.9, 0.036 * S);
      const stud = world(0.3, 0.2, 0.012);
      add(root, new THREE.IcosahedronGeometry(0.03 * S, 1), new THREE.MeshStandardMaterial({ color: '#dff4ff', metalness: 0.4, roughness: 0.08, emissive: '#7fc8ff', emissiveIntensity: 0.4, flatShading: true }), [stud.x, stud.y, stud.z]);
    }

    // What it listens to.
    const streaks: THREE.Mesh[] = [];
    let record: THREE.Object3D | null = null;
    if (a.listening === 'wind') {
      const air = new THREE.MeshBasicMaterial({ color: '#b9cbdc', transparent: true, opacity: 0.75, depthWrite: false });
      for (let i = 0; i < 4 + Math.round(mood.energy * 4); i++) {
        const angle = -0.6 + random() * 1.6, far = (0.55 + random() * 0.35) * S, lift = (0.12 + random() * 0.2) * S;
        const start = new THREE.Vector3(mouth.x + Math.cos(angle) * far, mouth.y + lift, mouth.z + Math.sin(angle) * far);
        const curve = new THREE.CatmullRomCurve3([start, start.clone().lerp(mouth, 0.45).add(new THREE.Vector3((random() - 0.5) * 0.2 * S, 0.08 * S, (random() - 0.5) * 0.2 * S)), start.clone().lerp(mouth, 0.8).add(new THREE.Vector3(0, 0.07 * S, 0)), mouth.clone().add(new THREE.Vector3(0, 0.03 * S, 0))]);
        const streak = add(root, new THREE.TubeGeometry(curve, 30, 0.006 * S, 5), air);
        streak.castShadow = false;
        streaks.push(streak);
      }
    }
    if (a.listening === 'gramophone') {
      const g = new THREE.Group();
      const u = Math.max(0.5, Math.min(2.2, 0.16 * S));
      const brass = new THREE.MeshStandardMaterial({ color: '#d9a441', metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide });
      add(g, new THREE.BoxGeometry(u, u * 0.4, u), new THREE.MeshStandardMaterial({ color: '#5a3320', roughness: 0.6 }), [0, u * 0.2, 0]);
      record = add(g, new THREE.CylinderGeometry(u * 0.42, u * 0.42, u * 0.03, 24), new THREE.MeshStandardMaterial({ color: '#16161a', roughness: 0.35 }), [0, u * 0.42, 0]);
      add(g, new THREE.CylinderGeometry(u * 0.13, u * 0.13, u * 0.035, 16), new THREE.MeshStandardMaterial({ color: '#c7402f' }), [0, u * 0.425, 0]);
      const neck = add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(u * 0.3, u * 0.45, 0), new THREE.Vector3(u * 0.42, u * 0.9, -u * 0.25), new THREE.Vector3(u * 0.2, u * 1.25, -u * 0.3), new THREE.Vector3(-u * 0.1, u * 1.35, 0)]), 20, u * 0.045, 6), brass);
      neck.castShadow = true;
      const horn = add(g, new THREE.LatheGeometry([[0.05, 0], [0.09, 0.3], [0.2, 0.6], [0.42, 0.85], [0.75, 1]].map(([r, y]) => new THREE.Vector2(r * u, y * u)), 20), brass, [-u * 0.1, u * 1.35, 0]);
      horn.rotation.set(Math.PI / 2 - 0.25, 0, 0);
      const spot = world(0.3, 0.36);
      g.position.set(mouth.x + 0.34 * S, 0, mouth.z + 0.36 * S);
      g.lookAt(spot.x, 0, spot.z);
      root.add(g);
    }

    const energy = mix(0.2, 1.4, mood.energy);
    return {
      object: root,
      update: (dt, time) => {
        if (glow) glow.emissiveIntensity = 2.2 + Math.sin(time * 2.2 * energy) * 0.7;
        if (record) record.rotation.y += dt * 3.4 * energy;
        streaks.forEach((streak, i) => { streak.position.y = Math.sin(time * 1.6 * energy + i * 1.7) * 0.012 * S; });
      },
      dispose: () => { map.dispose(); disposeTree(root); },
    };
  },
});
