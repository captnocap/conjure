import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
type BallKind = 'basket' | 'foot' | 'net' | 'rugby' | 'foam';
const RADIUS: Record<BallKind, number> = { basket: 0.12, foot: 0.11, net: 0.108, rugby: 0.09, foam: 0.095 };
interface Ball { kind: BallKind; at: THREE.Vector3; flat: number; colour: string; spin: THREE.Euler }

export default defineThing({
  questions: {
    cage: choice('What kind of cage is it?', {
      trolley: 'A low rectangular wire trolley with a push handle and a hinged lid.',
      tower: 'A tall narrow lockable cage, head high, with a door on the front.',
      drum: 'A round open-topped wire bin on castors.',
    }),
    balls: choice('What balls are in it?', {
      mixed: 'A jumble of everything: basketballs, footballs, netballs and a rugby ball or two.',
      basket: 'Mostly orange basketballs.',
      foot: 'Mostly black and white footballs.',
      net: 'Netballs and volleyballs, white with coloured panels.',
      foam: 'Soft foam dodgeballs in bright colours.',
      rugby: 'Rugby balls piled like eggs.',
    }),
    fullness: score('How full is the cage?', ['A few balls rolling around the bottom', 'Half full', 'Full to the rim', 'Heaped above the rim']),
    lock: choice('Is the cage locked up?', {
      open: 'Open, the lid or door thrown back mid-lesson.',
      locked: 'Shut and padlocked for the holidays.',
      missing: 'It has no lid or door at all.',
    }),
    bibs: choice('What bibs are draped over the rim?', {
      none: 'No bibs.',
      yellow: 'A couple of fluorescent yellow bibs.',
      teams: 'Two teams’ worth, orange on one side and blue on the other.',
      heap: 'A tangled heap of every colour dumped over one corner.',
    }),
    stray: choice('Has a ball got out?', {
      none: 'No; every ball is in the cage.',
      rolled: 'One has rolled away and come to rest on the floor.',
      bouncing: 'One is still bouncing beside the cage, as if just dropped.',
      perched: 'One is balanced on top of the cage.',
      punctured: 'A dead flat one lies folded on the floor like a bowl.',
    }),
    extra: choice('What other PE kit is with it?', {
      none: 'Nothing else.',
      hoops: 'Plastic hula hoops hung on the side in bright colours.',
      cones: 'A tall stack of marker cones.',
      pump: 'A ball pump and a whistle on a lanyard.',
      ropes: 'Skipping ropes knotted over the handle.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const round = a.cage === 'drum';
    const W = a.cage === 'trolley' ? 1.05 : a.cage === 'tower' ? 0.66 : 0.84, D = a.cage === 'trolley' ? 0.66 : a.cage === 'tower' ? 0.6 : 0.84;
    const H = a.cage === 'tower' ? 1.5 : a.cage === 'trolley' ? 0.72 : 0.8, BASE = 0.14;
    const textures: THREE.Texture[] = [];
    const steelColour = new THREE.Color(a.cage === 'tower' ? '#3f5f8a' : '#c2c7c9').lerp(new THREE.Color('#7a5a3a'), wear * 0.35);
    const steel = new THREE.MeshStandardMaterial({ color: steelColour, metalness: 0.75, roughness: 0.35 + wear * 0.35 });
    const dark = s.material('#1f2022', { roughness: 0.7 });

    // Wire: everything axis-aligned is merged into one mesh.
    const wires: THREE.BufferGeometry[] = [];
    const wire = (from: P3, to: P3, t = 0.008) => {
      const size: P3 = [Math.abs(to[0] - from[0]) + t, Math.abs(to[1] - from[1]) + t, Math.abs(to[2] - from[2]) + t];
      wires.push(new THREE.BoxGeometry(...size).translate((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2));
    };
    const flush = (target: THREE.Object3D) => {
      const geometry = mergeGeometries(wires)!;
      for (const g of wires) g.dispose();
      wires.length = 0;
      const mesh = new THREE.Mesh(geometry, steel);
      mesh.castShadow = mesh.receiveShadow = true;
      target.add(mesh);
      return mesh;
    };
    const panel = (origin: P3, u: P3, v: P3, lu: number, lv: number, pitch = 0.1, frame = 0.022) => {
      const at = (i: number, j: number): P3 => [origin[0] + u[0] * i + v[0] * j, origin[1] + u[1] * i + v[1] * j, origin[2] + u[2] * i + v[2] * j];
      const nu = Math.max(1, Math.round(lu / pitch)), nv = Math.max(1, Math.round(lv / pitch));
      for (let i = 0; i <= nu; i++) wire(at(lu * i / nu, 0), at(lu * i / nu, lv), i === 0 || i === nu ? frame : 0.008);
      for (let j = 0; j <= nv; j++) wire(at(0, j * lv / nv), at(lu, j * lv / nv), j === 0 || j === nv ? frame : 0.008);
    };
    const y0 = BASE, y1 = BASE + H;
    const lidGroup = new THREE.Group();
    if (!round) {
      panel([-W / 2, y0, -D / 2], [1, 0, 0], [0, 0, 1], W, D);
      panel([-W / 2, y0, -D / 2], [1, 0, 0], [0, 1, 0], W, H);
      for (const side of [-1, 1]) panel([side * W / 2, y0, -D / 2], [0, 0, 1], [0, 1, 0], D, H);
      if (a.cage === 'trolley') {
        panel([-W / 2, y0, D / 2], [1, 0, 0], [0, 1, 0], W, H);
        // Push handle at one end.
        for (const z of [-1, 1]) { wire([W / 2, y1 - 0.02, z * (D / 2 - 0.04)], [W / 2 + 0.16, y1 - 0.02, z * (D / 2 - 0.04)], 0.022); wire([W / 2 + 0.16, y1 - 0.02, z * (D / 2 - 0.04)], [W / 2 + 0.16, y1 + 0.16, z * (D / 2 - 0.04)], 0.022); }
        wire([W / 2 + 0.16, y1 + 0.16, -D / 2 + 0.04], [W / 2 + 0.16, y1 + 0.16, D / 2 - 0.04], 0.026);
        flush(s.root);
        if (a.lock !== 'missing') {
          panel([-W / 2, 0, 0], [1, 0, 0], [0, 0, 1], W, D);
          flush(lidGroup);
          lidGroup.position.set(0, y1 + 0.012, -D / 2);
          lidGroup.rotation.x = a.lock === 'open' ? -mix(1.7, 2.1, random()) : 0;
        }
      } else {
        panel([-W / 2, y1, -D / 2], [1, 0, 0], [0, 0, 1], W, D);
        // The lower half of the front is fixed; the door is the upper half.
        panel([-W / 2, y0, D / 2], [1, 0, 0], [0, 1, 0], W, H * 0.4);
        flush(s.root);
        if (a.lock !== 'missing') {
          panel([0, 0, 0], [1, 0, 0], [0, 1, 0], W, H * 0.6);
          flush(lidGroup);
          lidGroup.position.set(-W / 2, y0 + H * 0.4, D / 2 + 0.012);
          lidGroup.rotation.y = a.lock === 'open' ? -mix(1.5, 2.3, random()) : 0;
        }
      }
      s.root.add(lidGroup);
    } else {
      const R = W / 2;
      const parts: THREE.BufferGeometry[] = [];
      for (let j = 0; j <= 7; j++) parts.push(new THREE.TorusGeometry(R, j === 0 || j === 7 ? 0.012 : 0.005, 6, 40).rotateX(Math.PI / 2).translate(0, y0 + H * j / 7, 0));
      for (let i = 0; i < 26; i++) { const t = i / 26 * Math.PI * 2; parts.push(new THREE.CylinderGeometry(0.005, 0.005, H, 5).translate(Math.cos(t) * R, y0 + H / 2, Math.sin(t) * R)); }
      for (let i = -4; i <= 4; i++) { const x = i * R / 4.5, l = Math.sqrt(Math.max(0.0001, R * R - x * x)) * 2; parts.push(new THREE.BoxGeometry(0.008, 0.008, l).translate(x, y0, 0), new THREE.BoxGeometry(l, 0.008, 0.008).translate(0, y0, x)); }
      const mesh = new THREE.Mesh(mergeGeometries(parts.map((g) => g.toNonIndexed()))!, steel);
      for (const g of parts) g.dispose();
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    // Castors.
    const feet: [number, number][] = round ? [0, 1, 2, 3].map((i) => [Math.cos(i * Math.PI / 2 + 0.78) * W * 0.4, Math.sin(i * Math.PI / 2 + 0.78) * W * 0.4]) : [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => [x * (W / 2 - 0.06), z * (D / 2 - 0.06)]);
    for (const [x, z] of feet) {
      const swivel = random() * 6.3;
      s.cylinder(0.016, 0.016, 0.05, [x, BASE - 0.03, z], dark, 8);
      const wheel = s.cylinder(0.05, 0.05, 0.03, [x + Math.sin(swivel) * 0.02, 0.05, z + Math.cos(swivel) * 0.02], dark, 14);
      wheel.rotation.set(0, swivel, Math.PI / 2);
    }
    if (a.lock === 'locked' && !round) {
      const brass = s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 });
      const lx = a.cage === 'trolley' ? 0 : W / 2 - 0.03, ly = a.cage === 'trolley' ? y1 - 0.06 : y0 + H * 0.7, lz = D / 2 + 0.03;
      s.box([0.06, 0.05, 0.022], [lx, ly, lz], brass);
      s.ring(0.022, 0.006, [lx, ly + 0.035, lz], s.material('#c2c7c9', { metalness: 0.9, roughness: 0.2 }), Math.PI);
      s.tube([[lx - 0.12, ly + 0.07, lz - 0.02], [lx - 0.05, ly + 0.02, lz + 0.01], [lx, ly + 0.05, lz], [lx + 0.06, ly + 0.02, lz + 0.01], [lx + 0.1, ly + 0.08, lz - 0.02]], 0.008, s.material('#8a8f92', { metalness: 0.8 }));
    }

    // Balls: dropped one at a time into the lowest free spot.
    const mixes: Record<typeof a.balls, BallKind[]> = { mixed: ['basket', 'basket', 'foot', 'foot', 'net', 'rugby', 'foam'], basket: ['basket', 'basket', 'basket', 'basket', 'foot'], foot: ['foot', 'foot', 'foot', 'foot', 'net'], net: ['net', 'net', 'net', 'basket'], foam: ['foam'], rugby: ['rugby', 'rugby', 'rugby', 'foot'] };
    const FOAM = ['#e2382c', '#f2c21c', '#2f8fd8', '#3fb65a', '#e85aa0', '#8a4fc8'];
    const tintFor = (kind: BallKind) => {
      const fade = new THREE.Color('#ffffff').lerp(new THREE.Color('#b8ad98'), wear * (0.2 + random() * 0.5));
      if (kind === 'foam') fade.multiply(new THREE.Color(FOAM[Math.floor(random() * FOAM.length)]));
      return `#${fade.getHexString()}`;
    };
    const newBall = (kind: BallKind, at: THREE.Vector3, flat = 1): Ball => ({ kind, at, flat, colour: tintFor(kind), spin: new THREE.Euler(random() * 6.3, random() * 6.3, random() * 6.3) });
    const balls: Ball[] = [];
    const capacity = round ? 30 : a.cage === 'tower' ? 34 : 38;
    const want = Math.round(mix(4, capacity, Math.min(1, a.fullness * 1.08)));
    const ceiling = a.lock === 'locked' || a.cage === 'tower' ? y1 - 0.02 : y1 + mix(-0.1, 0.24, a.fullness);
    for (let n = 0; n < want; n++) {
      const kind = mixes[a.balls][Math.floor(random() * mixes[a.balls].length)];
      const r = RADIUS[kind];
      let best: THREE.Vector3 | null = null;
      for (let attempt = 0; attempt < 14; attempt++) {
        let x: number, z: number;
        if (round) { const t = random() * 6.3, d = Math.sqrt(random()) * (W / 2 - r - 0.01); x = Math.cos(t) * d; z = Math.sin(t) * d; }
        else { x = (random() - 0.5) * (W - 2 * r - 0.02); z = (random() - 0.5) * (D - 2 * r - 0.02); }
        let y = y0 + r + 0.005;
        for (const other of balls) {
          const reach = r + RADIUS[other.kind], d2 = (x - other.at.x) ** 2 + (z - other.at.z) ** 2;
          if (d2 < reach * reach) y = Math.max(y, other.at.y + Math.sqrt(reach * reach - d2) * 0.96);
        }
        if (!best || y < best.y) best = new THREE.Vector3(x, y, z);
      }
      if (!best || best.y + r > ceiling) continue;
      const flat = random() < wear * 0.45 + 0.06 ? mix(0.45, 0.75, random()) : 1;
      balls.push(newBall(kind, best, flat));
    }

    // The stray.
    const strayKind = mixes[a.balls][0];
    const sr = RADIUS[strayKind];
    let bouncer = -1;
    const farX = -(W / 2 + 0.2 + random() * 0.1), farZ = D / 2 + 0.05 + random() * 0.15;
    if (a.stray === 'rolled') balls.push(newBall(strayKind, new THREE.Vector3(farX, sr, farZ)));
    if (a.stray === 'bouncing') { bouncer = balls.length; balls.push(newBall(strayKind, new THREE.Vector3(farX + 0.1, sr + 0.45, farZ - 0.1))); }
    if (a.stray === 'perched') {
      const onLid = !round && (a.cage === 'tower' || a.lock === 'locked');
      balls.push(newBall(strayKind, new THREE.Vector3(onLid ? (random() - 0.5) * 0.2 : round ? W / 2 - 0.02 : -W / 2 + 0.02, y1 + sr * (onLid ? 1 : 0.86) + 0.012, onLid ? 0 : round ? 0 : D / 2 - 0.02)));
    }
    if (a.stray === 'punctured') balls.push(newBall(strayKind, new THREE.Vector3(farX, sr * 0.3, farZ), 0.3));

    // Painted skins, one texture and one instanced mesh per kind.
    const skin = (kind: BallKind) => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 128;
      const g = c.getContext('2d')!;
      if (kind === 'basket') {
        g.fillStyle = '#d8691f'; g.fillRect(0, 0, 256, 128);
        g.fillStyle = 'rgba(120,50,10,0.25)'; for (let i = 0; i < 900; i++) g.fillRect(random() * 256, random() * 128, 1.5, 1.5);
        g.strokeStyle = '#1b1512'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(0, 64); g.lineTo(256, 64); g.stroke();
        for (const x of [0, 128, 256]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
        for (const x of [64, 192]) { g.beginPath(); g.ellipse(x, 64, 34, 52, 0, 0, 7); g.stroke(); }
      } else if (kind === 'foot') {
        g.fillStyle = '#f2f0e8'; g.fillRect(0, 0, 256, 128);
        g.fillStyle = '#1b1b1d';
        const spots: [number, number, number][] = [[128, 6, 60], [128, 122, 60]];
        for (let i = 0; i < 5; i++) spots.push([i * 51.2 + 20, 42, 15], [i * 51.2 + 46, 86, 15]);
        for (const [x, y, r] of spots) for (const dx of [-256, 0, 256]) { g.beginPath(); for (let k = 0; k < 5; k++) { const t = k * 1.2566 - 1.57; g.lineTo(x + dx + Math.cos(t) * r * (y < 20 || y > 108 ? 4 : 1), y + Math.sin(t) * r * (y < 20 || y > 108 ? 0.25 : 1)); } g.fill(); }
      } else if (kind === 'net') {
        g.fillStyle = '#f3f1e8'; g.fillRect(0, 0, 256, 128);
        for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#2f6fd0' : '#f0c020'; g.beginPath(); g.moveTo(i * 42.7, 0); g.bezierCurveTo(i * 42.7 + 40, 40, i * 42.7 - 20, 90, i * 42.7 + 22, 128); g.lineTo(i * 42.7 + 40, 128); g.bezierCurveTo(i * 42.7 + 2, 90, i * 42.7 + 58, 40, i * 42.7 + 16, 0); g.fill(); }
      } else if (kind === 'rugby') {
        g.fillStyle = '#f1eee2'; g.fillRect(0, 0, 256, 128);
        g.fillStyle = '#8a4a26'; g.fillRect(0, 0, 256, 30); g.fillRect(0, 98, 256, 30);
        g.fillStyle = '#1f3f7a'; g.fillRect(0, 58, 256, 12);
      } else { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 128); g.fillStyle = 'rgba(0,0,0,0.06)'; for (let i = 0; i < 500; i++) g.fillRect(random() * 256, random() * 128, 2, 2); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; textures.push(t);
      return t;
    };
    const meshes = new Map<BallKind, { mesh: THREE.InstancedMesh; ids: number[] }>();
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), tilt = new THREE.Quaternion();
    const matrixFor = (ball: Ball, y = ball.at.y) => {
      const r = RADIUS[ball.kind];
      // Flat balls squash along world y after their random spin; rugby balls are long along their own axis.
      q.setFromEuler(ball.spin);
      const spinM = new THREE.Matrix4().makeRotationFromQuaternion(q);
      const shape = new THREE.Matrix4().makeScale(r, r * (ball.kind === 'rugby' ? 1.6 : 1), r);
      if (ball.kind === 'rugby') spinM.makeRotationFromQuaternion(tilt.setFromEuler(new THREE.Euler(Math.PI / 2 + (ball.spin.x - 3.15) * 0.12, ball.spin.y, 0, 'YXZ')));
      return m4.makeTranslation(ball.at.x, y - (1 - ball.flat) * r * 0.9, ball.at.z).multiply(new THREE.Matrix4().makeScale(1, ball.flat, 1)).multiply(spinM).multiply(shape);
    };
    for (const kind of ['basket', 'foot', 'net', 'rugby', 'foam'] as BallKind[]) {
      const ids = balls.map((ball, i) => (ball.kind === kind ? i : -1)).filter((i) => i >= 0);
      if (!ids.length) continue;
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ map: skin(kind), roughness: kind === 'foam' ? 0.95 : 0.6 + wear * 0.25 }), ids.length);
      ids.forEach((id, slot) => { mesh.setMatrixAt(slot, matrixFor(balls[id])); mesh.setColorAt(slot, new THREE.Color(balls[id].colour)); });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
      s.root.add(mesh);
      meshes.set(kind, { mesh, ids });
    }

    // Bibs over the rim.
    const bib = (x: number, z: number, facing: number, colour: string) => {
      const g = new THREE.Group();
      g.position.set(x, y1, z); g.rotation.y = facing;
      const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colour).lerp(new THREE.Color('#b8ad98'), wear * 0.35), roughness: 0.9, emissive: colour, emissiveIntensity: 0.12 });
      const trim = new THREE.MeshStandardMaterial({ color: '#f3f1e8', roughness: 0.9 });
      const add = (size: P3, at: P3, material: THREE.Material, rz = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material); m.position.set(...at); m.rotation.z = rz; m.castShadow = true; g.add(m); };
      const out = 0.26 + random() * 0.12, skew = (random() - 0.5) * 0.14;
      add([0.3, 0.02, 0.07], [0, 0.022, 0], mat);
      add([0.3, out, 0.012], [0, 0.02 - out / 2, 0.036], mat, skew);
      add([0.3, 0.5 - out, 0.012], [0, 0.02 - (0.5 - out) / 2, -0.036], mat, -skew);
      add([0.3, 0.025, 0.014], [Math.sin(skew) * out, 0.03 - out, 0.037], trim, skew);
      add([0.1, 0.12, 0.014], [Math.sin(skew) * out * 0.5, 0.02 - out * 0.5, 0.038], trim, skew);
      s.root.add(g);
    };
    const rim = (t: number): [number, number, number] => {
      // A point on the front or side rim and the direction a bib there faces.
      if (round) { const ang = (t - 0.5) * 2.4; return [Math.sin(ang) * W / 2, Math.cos(ang) * W / 2, ang]; }
      if (t < 0.72) return [(t / 0.72 - 0.5) * (W - 0.36), D / 2, 0];
      return [-W / 2, (0.5 - (t - 0.72) / 0.28) * (D - 0.36), -Math.PI / 2];
    };
    const NEON = { yellow: '#d6ee1c', orange: '#ff7a1c', blue: '#2f7fe0', green: '#3fc04f', pink: '#f04a9a' };
    if (a.cage !== 'tower') {
      const list: [number, string][] = a.bibs === 'yellow' ? [[0.2, NEON.yellow], [0.52, NEON.yellow]] : a.bibs === 'teams' ? [[0.08, NEON.orange], [0.3, NEON.orange], [0.56, NEON.blue], [0.86, NEON.blue]] : a.bibs === 'heap' ? [[0.5, NEON.yellow], [0.62, NEON.pink], [0.7, NEON.green], [0.8, NEON.orange], [0.9, NEON.blue], [0.56, NEON.blue]] : [];
      for (const [t, colour] of list) { const [x, z, f] = rim(t + (random() - 0.5) * 0.04); bib(x, z, f + (random() - 0.5) * 0.15, colour); }
    } else if (a.bibs !== 'none') {
      // On the tall cage, bibs hang from the fixed front panel's top bar.
      const colours = a.bibs === 'yellow' ? [NEON.yellow, NEON.yellow] : a.bibs === 'teams' ? [NEON.orange, NEON.blue] : [NEON.yellow, NEON.pink, NEON.green];
      colours.forEach((colour, i) => {
        const g = new THREE.Group(); g.position.set(-W / 2 - 0.0, y0 + H * mix(0.55, 0.95, i / Math.max(1, colours.length - 1)) - 0.2, (i - (colours.length - 1) / 2) * 0.2 * 0); s.root.add(g);
        const mat = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.9, emissive: colour, emissiveIntensity: 0.12 });
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.4, 0.3), mat); m.position.set(-0.02, 0, (random() - 0.5) * 0.2); m.rotation.x = (random() - 0.5) * 0.2; m.castShadow = true; g.add(m);
        const n = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.12, 0.1), new THREE.MeshStandardMaterial({ color: '#f3f1e8' })); n.position.copy(m.position).add(new THREE.Vector3(-0.002, 0.02, 0)); n.rotation.copy(m.rotation); g.add(n);
      });
    }

    // Other kit.
    const sideX = W / 2 + (a.cage === 'trolley' ? 0.2 : 0.02);
    if (a.extra === 'hoops') {
      const n = 3 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) {
        const r = 0.36 + random() * 0.06;
        const hoop = s.ring(r, 0.011, [(random() - 0.5) * 0.12, Math.max(r + 0.012, y1 - r * 0.9 - i * 0.02), -D / 2 - 0.03 - i * 0.03], s.material(FOAM[(i + Math.floor(random() * 6)) % FOAM.length], { roughness: 0.35 }));
        hoop.rotation.x = 0.1 + random() * 0.08; hoop.rotation.z = random();
      }
    } else if (a.extra === 'cones') {
      const cx = sideX + 0.22, cz = D / 2 - 0.1;
      const n = 6 + Math.floor(random() * 8);
      for (let i = 0; i < n; i++) s.lathe([[0.1, 0], [0.095, 0.012], [0.035, 0.07], [0.03, 0.07]], s.material(['#ff7a1c', '#d6ee1c', '#2f7fe0', '#e2382c'][Math.floor(i / 3) % 4], { roughness: 0.5, side: THREE.DoubleSide }), [cx + (random() - 0.5) * 0.012, i * 0.022, cz + (random() - 0.5) * 0.012]);
    } else if (a.extra === 'pump') {
      const px = sideX + 0.18, pz = D / 2;
      const red = s.material('#d8352c', { roughness: 0.4 });
      s.cylinder(0.022, 0.022, 0.4, [px, 0.22, pz], red, 12);
      s.box([0.2, 0.02, 0.05], [px, 0.01, pz], dark);
      s.rod([px, 0.42, pz], [px, 0.58, pz], 0.006, steel);
      s.box([0.16, 0.022, 0.03], [px, 0.59, pz], dark);
      s.tube([[px, 0.06, pz + 0.02], [px + 0.08, 0.02, pz + 0.12], [px - 0.06, 0.012, pz + 0.22], [px - 0.14, 0.012, pz + 0.14]], 0.006, dark);
      const wx = round ? 0 : -W / 2 + 0.1, wz = round ? W / 2 + 0.012 : D / 2 + 0.014;
      s.tube([[wx - 0.05, y1 + 0.012, wz - 0.01], [wx - 0.04, y1 - 0.14, wz + 0.006], [wx, y1 - 0.24, wz + 0.01], [wx + 0.04, y1 - 0.14, wz + 0.006], [wx + 0.05, y1 + 0.012, wz - 0.01]], 0.004, s.material('#2f7fe0'));
      s.box([0.05, 0.028, 0.02], [wx, y1 - 0.262, wz + 0.012], s.material('#c2c7c9', { metalness: 0.9, roughness: 0.2 }));
    } else if (a.extra === 'ropes') {
      const hx = a.cage === 'trolley' ? W / 2 + 0.16 : round ? W / 2 : W / 2 + 0.012, top = a.cage === 'trolley' ? y1 + 0.16 : y1;
      for (let i = 0; i < 3; i++) {
        const z = (i - 1) * 0.14 + (random() - 0.5) * 0.05, col = s.material(['#f2c21c', '#e85aa0', '#3fb65a', '#f3f1e8'][Math.floor(random() * 4)], { roughness: 0.8 });
        const drop = 0.4 + random() * 0.25;
        s.tube([[hx - 0.03, top - drop * 0.8, z - 0.03], [hx - 0.02, top + 0.02, z], [hx + 0.025, top + 0.02, z], [hx + 0.04, top - drop * 0.5, z + 0.02], [hx + 0.05, top - drop, z - 0.02], [hx + 0.045, top - drop * 0.6, z - 0.06]], 0.007, col);
        s.cylinder(0.012, 0.012, 0.1, [hx + 0.045, top - drop * 0.6 + 0.04, z - 0.06], s.material('#d8352c', { roughness: 0.4 }), 8);
      }
    }

    const speed = mix(1.6, 4.2, mood.energy), height = mix(0.3, 0.85, mood.energy);
    const thing = s.finish({
      update: bouncer >= 0 ? (_dt, time) => {
        const ball = balls[bouncer], entry = meshes.get(ball.kind);
        if (!entry) return;
        const y = RADIUS[ball.kind] + Math.abs(Math.sin(time * speed)) * height;
        entry.mesh.setMatrixAt(entry.ids.indexOf(bouncer), matrixFor(ball, y));
        entry.mesh.instanceMatrix.needsUpdate = true;
      } : undefined,
    });
    const dispose = thing.dispose;
    return { ...thing, dispose: () => { for (const t of textures) t.dispose(); dispose(); } };
  },
});
