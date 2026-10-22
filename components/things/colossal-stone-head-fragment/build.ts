import * as THREE from 'three';
import { Sculpture, choice, defineThing, disposeTree, mix } from '@conjure/kit';
import { headForm, noise3, ramp } from './head';

type Cut = { n: [number, number, number]; d: number };

export default defineThing({
  questions: {
    culture: choice('Whose face was it?', {
      roman: 'A Roman emperor in white marble: cropped locks, straight brow, a hard mouth.',
      pharaoh: 'An Egyptian pharaoh in sandstone, wearing the striped nemes headcloth and a false beard.',
      olmec: 'An Olmec colossal head in dark basalt: broad flat nose, thick frowning lips, a close helmet with a band.',
      khmer: 'A Khmer temple face in grey-green sandstone: closed eyes, a wide calm smile, a diadem.',
      dictator: 'A toppled modern dictator in bronze: heavy moustache, slick hair, a cable still round the neck.',
    }),
    remains: choice('How much of the head remains?', {
      whole: 'The whole head, broken off at the neck.',
      half: 'One half, split top to bottom beside the nose.',
      mask: 'Only the face: the back of the skull is gone, leaving a hollow-backed mask.',
      fragment: 'A single slab with one eye, a cheek and half the mouth.',
    }),
    lies: choice('How does it lie?', {
      upright: 'Upright but sunk to the lips and tipped back a little, staring past whoever stands there.',
      side: 'On its side, one cheek pressed into the earth.',
      skyward: 'On its back, face turned up to the sky.',
      pitched: 'Pitched over at an angle and half swallowed, as it landed.',
    }),
    grows: choice('What grows on it?', {
      nothing: 'Nothing: bare stone.',
      moss: 'Moss and lichen in every hollow.',
      vines: 'Leafy vines creeping over the brow and cheek.',
      roots: 'Thick tree roots gripping it like fingers.',
      sapling: 'A young tree has rooted on top of it, with grass in the cracks.',
    }),
    figure: choice('Who is near it, for scale?', {
      nobody: 'Nobody.',
      traveller: 'A lone traveller standing looking at it.',
      child: 'A child sitting on top of it, legs dangling.',
      surveyor: 'A surveyor with a red and white ranging pole.',
      goat: 'A goat grazing beside it, indifferent.',
    }),
    ground: choice('What ground has it sunk into?', {
      sand: 'Drifted desert sand.', jungle: 'Dark jungle earth and leaf litter.', grass: 'Rough pasture grass.', rubble: 'Broken paving and rubble, a city square.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const S = 1.5, seed = context.seed;
    const side = random() < 0.5 ? -1 : 1;
    const stone = {
      roman: { base: '#e6e1d5', cavity: '#9a917f', scar: '#f6f3ea', rough: 0.6, metal: 0 },
      pharaoh: { base: '#c9a878', cavity: '#8a6a45', scar: '#e0c79e', rough: 0.9, metal: 0 },
      olmec: { base: '#6d675e', cavity: '#3a3631', scar: '#8d877c', rough: 0.9, metal: 0 },
      khmer: { base: '#8f927f', cavity: '#4f5546', scar: '#b3b5a3', rough: 0.95, metal: 0 },
      dictator: { base: '#5e4a30', cavity: '#4f9a84', scar: '#8a6d42', rough: 0.45, metal: 0.65 },
    }[a.culture];
    const green = a.grows === 'moss' || a.grows === 'sapling';
    const tints = {
      base: stone.base, scar: stone.scar, cavity: green ? '#55703a' : stone.cavity, mottle: green ? '#7c8f4c' : stone.cavity,
      cavityAmount: mix(1.2, 1.9, mood.wear) + (green ? 0.5 : 0), mottleAmount: mix(0.15, 0.5, mood.wear) + (green ? 0.25 : 0),
    };
    const cuts: Cut[] = [{ n: [0, -1, 0], d: 0.97 }];
    const cut = (x: number, y: number, z: number, d: number) => { const l = Math.hypot(x, y, z); cuts.push({ n: [x / l, y / l, z / l], d }); };
    if (a.remains === 'half') cut(-1, 0.12, -0.2, 0.3);
    if (a.remains === 'mask') cut(0, 0.15, -1, 0.02);
    if (a.remains === 'fragment') { cut(-1, 0.1, -0.2, 0.22); cut(0.2, 0.1, -1, 0.0); cut(0.45, 1, 0.1, 0.8); }
    if (mood.wear > 0.4) cut(0.6, 0.6, 0.5, mix(0.95, 0.86, mood.wear));
    const kept = (x: number, y: number, z: number, margin = 0) => cuts.every((c) => x * c.n[0] + y * c.n[1] + z * c.n[2] - c.d < margin);
    /** Collapse whatever lies beyond a break onto the break itself. Head units. */
    const sever = (geometry: THREE.BufferGeometry) => {
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        for (const c of cuts) { const over = x * c.n[0] + y * c.n[1] + z * c.n[2] - c.d; if (over > 0) { x -= c.n[0] * over; y -= c.n[1] * over; z -= c.n[2] * over; } }
        pos.setXYZ(i, x * S, y * S, z * S);
      }
      geometry.computeVertexNormals();
      return geometry;
    };

    const face = {
      roman: { hair: 'crop', jaw: 0.9, brow: 1.2, lips: 0.9, smile: -0.2, eyes: 'blank', nose: 1.1, noseWide: 1, long: 1, moustache: 0 },
      pharaoh: { hair: 'bald', jaw: 0.5, brow: 0.8, lips: 1.25, smile: 0.15, eyes: 'open', nose: 0.95, noseWide: 1.15, long: 1, moustache: 0 },
      olmec: { hair: 'bald', jaw: 1, brow: 1.3, lips: 1.8, smile: -0.5, eyes: 'open', nose: 0.7, noseWide: 1.9, long: 0.86, moustache: 0 },
      khmer: { hair: 'bald', jaw: 0.75, brow: 0.9, lips: 1.6, smile: 0.6, eyes: 'closed', nose: 0.85, noseWide: 1.5, long: 0.95, moustache: 0 },
      dictator: { hair: 'crop', jaw: 0.95, brow: 1.5, lips: 0.8, smile: -0.3, eyes: 'open', nose: 1.15, noseWide: 1.1, long: 1, moustache: 1.6 },
    }[a.culture];
    const head = headForm({
      size: S, seed, res: 1.1, ...tints, ...face, hair: face.hair as 'crop', eyes: face.eyes as 'open', hairTint: stone.base,
      noseBreak: a.culture === 'dictator' ? 0 : mix(0.2, 0.7, mood.wear), cuts, lumpy: mix(0.01, 0.04, mood.wear), socket: 1.5, lumpScale: 6,
      cheek: a.culture === 'olmec' ? 0.4 : 1, chin: a.culture === 'olmec' ? 0.6 : 1,
    });
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: stone.rough, metalness: stone.metal });
    const plain = new THREE.MeshStandardMaterial({ color: stone.base, roughness: stone.rough, metalness: stone.metal });
    const group = new THREE.Group();
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = group) => { node.traverse((child) => { child.castShadow = child.receiveShadow = true; }); parent.add(node); return node; };
    add(new THREE.Mesh(head.geometry, material));

    // Headgear, in head units, severed by the same breaks.
    const fade = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color(stone.base), mix(0.35, 0.8, mood.wear));
    if (a.culture === 'pharaoh') {
      const nu = 80, nv = 44;
      const g = new THREE.PlaneGeometry(1, 1, nu, nv);
      const pos = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(pos.count * 3);
      const blue = fade('#2f5f8a'), gold = fade('#c9a43a'), c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const az = pos.getX(i) * Math.PI * 2, v = 0.5 - pos.getY(i);
        const y = mix(1.15, -1.12, v);
        let rx: number, rz: number;
        if (y > 0.35) { const k = Math.sqrt(Math.max(0, 1 - (y / 1.16) ** 2)); rx = 0.87 * k / 0.953; rz = 0.98 * k / 0.953; }
        else { const t = (0.35 - y) / 1.5; rx = mix(0.87, 1.36, Math.pow(t, 0.8)); rz = mix(0.98, 0.8, t); }
        const x = Math.sin(az) * rx;
        let z = Math.cos(az) * rz - 0.05;
        if (y < 0.5) z = Math.min(z, 0.2 - 0.12 * ramp(0.35, -1.1, y));
        pos.setXYZ(i, x, y, z);
        const stripe = y > 0.35 ? Math.sin(Math.atan2(y - 0.1, Math.cos(az) * rz + 0.5) * 30) : Math.sin(y * 30 + Math.abs(x) * 4);
        c.copy(stripe > 0 ? blue : gold);
        if (y > 0.4 && y < 0.52 && Math.cos(az) > 0.2) c.copy(gold);
        c.toArray(col, i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      add(new THREE.Mesh(sever(g), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide })));
      if (kept(0, -1.2, 0.6)) { const beard = new THREE.CylinderGeometry(0.11, 0.17, 0.75, 10); beard.translate(0, -1.3, 0.62); add(new THREE.Mesh(sever(beard), plain)); }
      if (kept(0, 0.6, 0.85)) { const cobra = new THREE.ConeGeometry(0.07, 0.3, 8); cobra.rotateX(0.5); cobra.translate(0, 0.6, 0.86); add(new THREE.Mesh(sever(cobra), plain)); }
    } else if (a.culture === 'olmec' || a.culture === 'khmer') {
      const cap = new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, 0, a.culture === 'olmec' ? 1.2 : 0.95);
      cap.scale(0.84, 1.07 * face.long, 0.98); cap.translate(0, 0, -0.04);
      add(new THREE.Mesh(sever(cap), plain));
      const band = new THREE.SphereGeometry(1, 40, 4, 0, Math.PI * 2, a.culture === 'olmec' ? 0.98 : 0.78, 0.22);
      band.scale(0.9, 1.1 * face.long, 1.04); band.translate(0, 0, -0.04);
      add(new THREE.Mesh(sever(band), new THREE.MeshStandardMaterial({ color: new THREE.Color(stone.base).multiplyScalar(0.82), roughness: stone.rough })));
      if (a.culture === 'olmec')
        for (const sgn of [-1, 1]) if (kept(sgn * 0.8, -0.1, -0.05)) { const flap = new THREE.BoxGeometry(0.1, 0.75, 0.42); flap.translate(sgn * 0.8, 0.0, -0.08); add(new THREE.Mesh(sever(flap), plain)); }
      if (a.culture === 'khmer')
        for (let i = 0; i < 9; i++) {
          const ang = (i - 4) * 0.33, x = Math.sin(ang) * 0.8, z = Math.cos(ang) * 0.95 - 0.04;
          if (!kept(x, 0.85, z)) continue;
          const petal = new THREE.ConeGeometry(0.13, 0.42, 4); petal.translate(x * 0.92, 0.95 - Math.abs(i - 4) * 0.035, z * 0.9);
          add(new THREE.Mesh(sever(petal), plain));
        }
    } else if (a.culture === 'dictator') {
      const iron = new THREE.MeshStandardMaterial({ color: '#4a2f22', roughness: 0.8, metalness: 0.5 });
      for (let i = 0; i < 5; i++) { const bar = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5 + random() * 0.5, 6), iron)); bar.position.set((random() - 0.5) * 0.5 * S, -1.1 * S, (random() - 0.5) * 0.5 * S); bar.rotation.set((random() - 0.5) * 0.9, 0, (random() - 0.5) * 0.9); }
      const cable: THREE.Vector3[] = [];
      for (let i = 0; i <= 14; i++) { const ang = i / 14 * Math.PI * 2; cable.push(new THREE.Vector3(Math.sin(ang) * 0.58 * S, (-0.8 + 0.08 * Math.sin(ang * 2)) * S, (Math.cos(ang) * 0.62 - 0.08) * S)); }
      add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cable, true), 60, 0.035, 6, true), new THREE.MeshStandardMaterial({ color: '#8a8a86', roughness: 0.5, metalness: 0.7 })));
    }
    if ((face.eyes === 'open') && a.culture !== 'roman')
      for (const ex of [-0.31, 0.31]) {
        const spot = head.at(ex, 0.075);
        if (!kept(spot.p.x / S, spot.p.y / S, spot.p.z / S, -0.06)) continue;
        const pupil = add(new THREE.Mesh(new THREE.CircleGeometry(S * 0.045, 12), new THREE.MeshStandardMaterial({ color: stone.cavity === '#4f9a84' ? '#2b2118' : stone.cavity, roughness: 0.95 })));
        pupil.position.copy(spot.p).addScaledVector(spot.n, S * 0.02); pupil.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), spot.n);
      }

    // Growth, placed on the head before it is laid down.
    const pose = { upright: [-0.38, 0, 0.07 * side, 0.5], side: [-0.55, 0, side * 0.8, 0.45], skyward: [-1.05, 0, 0.12 * side, 0.32], pitched: [-0.2, 0.25 * side, 0.5 * side, 0.36] }[a.lies];
    group.rotation.set(pose[0], pose[1], pose[2]);
    group.position.y = pose[3] * S * (a.remains === 'mask' && a.lies === 'skyward' ? 0.4 : 1);
    group.updateMatrixWorld(true);
    s.root.add(group);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(group.quaternion.clone().invert());
    const surface = (dir: THREE.Vector3) => {
      const X = dir.x, Y = dir.y;
      if (dir.z > 0.15) return head.at(X, Y).p;
      return new THREE.Vector3(dir.x * 0.8, dir.y * 1.02, dir.z * 0.95 - 0.04).multiplyScalar(S);
    };
    const randomUpper = () => {
      for (let tries = 0; tries < 30; tries++) {
        const d = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
        if (d.dot(up) > -0.05 && kept(d.x * 0.75, d.y, d.z * 0.85, -0.08)) return d;
      }
      return up.clone();
    };
    if (a.grows === 'vines' || a.grows === 'sapling' || a.grows === 'moss') {
      const count = a.grows === 'vines' ? Math.round(mix(260, 520, mood.density)) : 110;
      const leaf = a.grows === 'vines' ? new THREE.SphereGeometry(1, 6, 4) : new THREE.ConeGeometry(0.4, 1.6, 4);
      if (a.grows === 'vines') leaf.scale(0.085, 0.02, 0.07); else leaf.scale(0.07, 0.11, 0.07);
      const leaves = new THREE.InstancedMesh(leaf, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), count);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
      let d = randomUpper();
      for (let i = 0; i < count; i++) {
        if (a.grows !== 'vines' || i % 26 === 0) d = randomUpper();
        else { d = d.clone().add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.16)).normalize(); if (!kept(d.x * 0.75, d.y, d.z * 0.85, -0.05)) d = randomUpper(); }
        const p = surface(d).addScaledVector(d, 0.03);
        if (a.grows === 'vines') e.set(random() * 6, random() * 6, random() * 6); else q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
        m.compose(p, a.grows === 'vines' ? q.setFromEuler(e) : q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.7 + random() * 0.9));
        leaves.setMatrixAt(i, m);
        leaves.setColorAt(i, c.setHSL(0.24 + random() * 0.08, 0.5, 0.2 + random() * 0.16));
      }
      add(leaves);
    }
    const bark = new THREE.MeshStandardMaterial({ color: '#8a7d68', roughness: 0.95 });
    if (a.grows === 'roots') {
      const crown = surface(up.clone()).addScaledVector(up, 0.15);
      for (let i = 0; i < 7; i++) {
        const ang = i / 7 * Math.PI * 2 + random() * 0.5;
        const t1 = new THREE.Vector3().crossVectors(up, new THREE.Vector3(0.3, 0.2, 1)).normalize(), t2 = new THREE.Vector3().crossVectors(up, t1);
        const out = t1.clone().multiplyScalar(Math.cos(ang)).addScaledVector(t2, Math.sin(ang));
        const pts = [crown.clone()];
        for (let k = 1; k <= 6; k++) {
          const d = up.clone().multiplyScalar(Math.cos(k * 0.36)).addScaledVector(out, Math.sin(k * 0.36)).add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.18)).normalize();
          pts.push(surface(d).addScaledVector(d, 0.06));
        }
        add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.09 - (i % 3) * 0.02, 7), bark));
      }
      const trunk = add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.5, 9), bark));
      trunk.position.copy(crown).addScaledVector(up, 0.7); trunk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
      const canopy = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), new THREE.MeshStandardMaterial({ color: '#4c6b3a', roughness: 0.9 })));
      canopy.position.copy(crown).addScaledVector(up, 1.8); canopy.scale.set(1.3, 0.8, 1.2);
    }
    if (a.grows === 'sapling') {
      const d = up.clone().add(new THREE.Vector3(side * 0.2, 0, -0.2)).normalize();
      const foot = surface(d);
      const trunk = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 1.1, 6), bark));
      trunk.position.copy(foot).addScaledVector(up, 0.5); trunk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
      for (let i = 0; i < 4; i++) { const tuft = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 + random() * 0.12, 0), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.27, 0.45, 0.3 + random() * 0.1), roughness: 0.9 }))); tuft.position.copy(foot).addScaledVector(up, 0.9 + i * 0.16).add(new THREE.Vector3((random() - 0.5) * 0.4, 0, (random() - 0.5) * 0.4)); }
    }

    // Ground and rubble.
    const earth = { sand: '#d8bf8c', jungle: '#4d4534', grass: '#7f9550', rubble: '#9d9a92' }[a.ground];
    const box = new THREE.Box3().setFromObject(group);
    const gx = side * (Math.max(Math.abs(box.min.x), Math.abs(box.max.x)) + 0.5), gz = 0.9;
    const R = Math.max(2.1, Math.abs(gx) + 0.55);
    const patch = new THREE.SphereGeometry(1, 36, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const pp = patch.attributes.position as THREE.BufferAttribute, pc = new Float32Array(pp.count * 3), c = new THREE.Color();
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i) * R, z = pp.getZ(i) * R * 0.9;
      const drift = a.ground === 'sand' ? 0.45 + 0.25 * Math.sin(x * 1.3 + z * 0.6) : 0.25;
      pp.setXYZ(i, x, pp.getY(i) * drift * (0.7 + 0.6 * noise3(x * 0.6 + 5, 0, z * 0.6)), z);
      c.set(earth).multiplyScalar(0.8 + 0.4 * noise3(x * 1.1, 2, z * 1.1)).toArray(pc, i * 3);
    }
    patch.setAttribute('color', new THREE.BufferAttribute(pc, 3)); patch.computeVertexNormals();
    add(new THREE.Mesh(patch, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })), s.root);
    const bits = Math.round(mix(8, 46, mood.density));
    const chunks = new THREE.InstancedMesh(a.ground === 'rubble' ? new THREE.BoxGeometry(0.4, 0.09, 0.4) : new THREE.DodecahedronGeometry(0.16, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }), bits);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < bits; i++) {
      const ang = random() * 6.28, r = R * (0.5 + random() * 0.42);
      e.set(random() * (a.ground === 'rubble' ? 0.4 : 6), random() * 6, random() * (a.ground === 'rubble' ? 0.4 : 6));
      m.compose(new THREE.Vector3(Math.cos(ang) * r, 0.1 + random() * 0.06, Math.sin(ang) * r * 0.9), q.setFromEuler(e), new THREE.Vector3(1, 1, 1).multiplyScalar(0.5 + random() * 1.3));
      chunks.setMatrixAt(i, m);
      chunks.setColorAt(i, c.set(a.ground === 'rubble' && i % 2 ? '#8f8c85' : stone.base).multiplyScalar(0.7 + random() * 0.4));
    }
    add(chunks, s.root);
    if (a.ground === 'grass' || a.ground === 'jungle') {
      const blades = new THREE.InstancedMesh(new THREE.ConeGeometry(0.045, 0.34, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), 160);
      for (let i = 0; i < 160; i++) {
        const ang = random() * 6.28, r = R * (0.4 + Math.sqrt(random()) * 0.55);
        e.set((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5);
        m.compose(new THREE.Vector3(Math.cos(ang) * r, 0.2, Math.sin(ang) * r * 0.9), q.setFromEuler(e), new THREE.Vector3(1, 0.6 + random() * 1.5, 1));
        blades.setMatrixAt(i, m); blades.setColorAt(i, c.setHSL(0.25 + random() * 0.06, 0.45, a.ground === 'jungle' ? 0.2 + random() * 0.1 : 0.3 + random() * 0.14));
      }
      add(blades, s.root);
    }

    // A figure for scale.
    const person = (height: number, coat: string) => {
      const figure = new THREE.Group(), k = height / 1.7;
      const cloth = new THREE.MeshStandardMaterial({ color: coat, roughness: 0.85 }), skin = new THREE.MeshStandardMaterial({ color: '#c79a78', roughness: 0.8 }), dark = new THREE.MeshStandardMaterial({ color: '#2d3038', roughness: 0.9 });
      add(new THREE.Mesh(new THREE.CapsuleGeometry(0.19 * k, 0.5 * k, 4, 10), cloth), figure).position.y = 1.1 * k;
      for (const sgn of [-1, 1]) { const leg = add(new THREE.Mesh(new THREE.CylinderGeometry(0.075 * k, 0.065 * k, 0.78 * k, 8), dark), figure); leg.position.set(sgn * 0.09 * k, 0.39 * k, 0); leg.name = 'leg'; }
      add(new THREE.Mesh(new THREE.SphereGeometry(0.125 * k, 12, 10), skin), figure).position.y = 1.62 * k;
      return figure;
    };
    if (a.figure === 'traveller' || a.figure === 'surveyor') {
      const who = person(1.72, a.figure === 'surveyor' ? '#d9a02f' : mood.cheer > 0.5 ? '#c8442f' : '#4a5a6a');
      who.position.set(gx, 0.14, gz); who.rotation.y = -side * 2.2;
      if (a.figure === 'traveller') { add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.18), new THREE.MeshStandardMaterial({ color: '#6b5a3c', roughness: 0.9 })), who).position.set(0, 1.18, -0.24); add(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.03, 14), new THREE.MeshStandardMaterial({ color: '#d9cba0', roughness: 0.9 })), who).position.y = 1.74; }
      else { for (let i = 0; i < 8; i++) add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 6), new THREE.MeshStandardMaterial({ color: i % 2 ? '#f1f1ec' : '#c8262b', roughness: 0.6 })), who).position.set(0.32, 0.125 + i * 0.25, 0.1); add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 14), new THREE.MeshStandardMaterial({ color: '#f1f1ec', roughness: 0.6 })), who).position.y = 1.76; }
      s.root.add(who);
    } else if (a.figure === 'child') {
      const kid = person(1.15, mood.cheer > 0.5 ? '#e0b02f' : '#7a3b3b');
      kid.traverse((node) => { if (node.name === 'leg') { node.rotation.x = -1.35; node.position.y = 0.52 * (1.15 / 1.7); node.position.z = 0.25; } });
      kid.position.set((box.min.x + box.max.x) / 2 - side * 0.1, box.max.y - 0.42, (box.min.z + box.max.z) / 2 + 0.1);
      s.root.add(kid);
    } else if (a.figure === 'goat') {
      const goat = new THREE.Group(), hide = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#e6dfd0' : '#5a4a3a', roughness: 0.95 });
      const body = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), hide), goat); body.rotation.z = Math.PI / 2; body.position.y = 0.55;
      for (const x of [-0.25, 0.25]) for (const z of [-0.09, 0.09]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.45, 6), hide), goat).position.set(x, 0.22, z);
      const neck = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.4, 8), hide), goat); neck.position.set(0.42, 0.42, 0); neck.rotation.z = -2.2;
      const skull = add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.12), hide), goat); skull.position.set(0.58, 0.22, 0); skull.rotation.z = -0.7;
      for (const z of [-0.04, 0.04]) { const horn = add(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.2, 6), new THREE.MeshStandardMaterial({ color: '#3a332b' })), goat); horn.position.set(0.47, 0.37, z); horn.rotation.z = 0.9; }
      goat.position.set(gx, 0.14, gz + 0.2); goat.rotation.y = side > 0 ? 2.4 : 0.7;
      s.root.add(goat);
    }
    return { object: s.root, footprint: R, dispose: () => disposeTree(s.root) };
  },
});
