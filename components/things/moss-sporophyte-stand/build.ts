import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';
import { Bag, type V3, aim, at, ball, lumpy, painted, taper, water } from './bits';

const FORMS = {
  haircap: 'Haircap moss: stiff upright shoots like tiny star-topped conifers, with straight tall stalks.',
  cushion: 'A tight rounded pincushion dome, pale and velvety, stalks rising from its crown.',
  feather: 'A flat ferny mat of feathery fronds sprawling outward, stalks arching out of it.',
  thread: 'Silvery thread moss: a low turf of tiny catkin buds with pear-shaped capsules hanging like lanterns.',
} as const;
const STAGES = {
  spears: 'Early spring: thin green spears with no capsules yet, each still wearing a pale pointed hood.',
  capped: 'Swelling capsules under papery straw-coloured hoods, like a crowd in pointed hats.',
  ripe: 'Fat orange-brown capsules nodding on their stalks, lids still on, about to go.',
  smoking: 'Lids off, toothed mouths open, capsules puffing golden spores into the air.',
  spent: 'Dark shrivelled empty capsules on twisted stalks, the season over.',
} as const;
const STALKS = {
  red: 'Wiry signal red, glowing when backlit.',
  amber: 'Translucent orange-amber, like fine copper wire.',
  straw: 'Pale yellow-green, fresh and soft.',
  wine: 'Dark wine-purple, almost black.',
} as const;
const BASES = {
  humus: 'A clod of dark crumbly humus.',
  bark: 'A flake of furrowed bark.',
  stone: 'A rounded grey pebble the moss has draped itself over.',
  stump: 'A chunk of soft rotting wood with its growth rings showing.',
} as const;
const EVENTS = {
  untouched: 'Nothing: the stand is whole and undisturbed.',
  raindrop: 'One enormous raindrop is caught among the stalks, bending them round it.',
  grazed: 'Something has grazed here: many stalks are bitten off short, headless.',
  flattened: 'A swath is pressed flat where something heavy walked through.',
  needle: 'A fallen pine needle lies across the stand like a felled trunk.',
} as const;

function shootGeometry(form: keyof typeof FORMS) {
  const leaves: THREE.BufferGeometry[] = [];
  const leaf = (length: number, width: number, y: number, tilt: number, turn: number) => {
    const g = new THREE.ConeGeometry(width, length, 3, 1, true);
    g.translate(0, length / 2, 0);
    g.applyMatrix4(at([0, y, 0], [tilt, turn, 0], 1));
    // Euler order XYZ applies the tilt first only if composed the other way round; rotate about y afterwards.
    leaves.push(g);
  };
  const ring = (count: number, length: number, width: number, y: number, tilt: number, phase: number) => {
    for (let i = 0; i < count; i++) {
      const g = new THREE.ConeGeometry(width, length, 3, 1, true);
      g.translate(0, length / 2, 0);
      g.rotateX(tilt);
      g.rotateY(phase + (i / count) * Math.PI * 2);
      g.translate(0, y, 0);
      leaves.push(g);
    }
  };
  if (form === 'haircap') {
    ring(6, 0.5, 0.055, 0.12, 1.25, 0);
    ring(6, 0.5, 0.055, 0.36, 1.1, 0.5);
    ring(6, 0.44, 0.05, 0.6, 0.9, 0.2);
    ring(5, 0.36, 0.045, 0.78, 0.55, 0.8);
    leaf(0.3, 0.05, 0.8, 0, 0);
    const stem = new THREE.ConeGeometry(0.05, 0.9, 3, 1, true);
    stem.translate(0, 0.45, 0);
    leaves.push(stem);
  } else if (form === 'cushion') {
    ring(5, 1, 0.09, 0, 0.3, 0);
    ring(3, 1.1, 0.08, 0, 0.1, 0.6);
  } else if (form === 'feather') {
    for (let i = 0; i < 6; i++)
      for (const side of [-1, 1]) {
        const g = new THREE.ConeGeometry(0.05, 0.42 * (1 - i * 0.1), 3, 1, true);
        g.translate(0, 0.21 * (1 - i * 0.1), 0);
        g.rotateZ(side * 1.05);
        g.translate(0, 0.1 + i * 0.15, 0);
        leaves.push(g);
      }
    const rib = new THREE.ConeGeometry(0.04, 1.1, 3, 1, true);
    rib.translate(0, 0.55, 0);
    leaves.push(rib);
  } else {
    for (let i = 0; i < 3; i++) {
      const g = new THREE.ConeGeometry(0.2 - i * 0.03, 0.5, 5, 1, true);
      g.translate(0, 0.25 + i * 0.27, 0);
      leaves.push(g);
    }
  }
  const merged = mergeGeometries(leaves)!;
  for (const g of leaves) g.dispose();
  return merged;
}

export default defineThing({
  questions: {
    form: choice('What kind of moss is the cushion?', FORMS),
    stage: choice('How far along are the spore capsules?', STAGES),
    stalk: choice('What colour are the stalks?', STALKS),
    height: score('How tall do the stalks stand over the moss?', ['Barely clearing the leaves', 'A modest stand', 'Towering and spindly, like bare pines']),
    crowd: score('How many stalks are there?', ['Three or four loners', 'A scattered copse', 'A dense thicket']),
    base: choice('What is the moss growing on?', BASES),
    event: choice('What has happened to the stand?', EVENTS),
    dew: noul('Is it beaded with dew?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const bag = new Bag();
    const R = 22;
    const hC = { haircap: 6, cushion: 13, feather: 4, thread: 5 }[a.form];
    const y0 = { humus: 3.2, bark: 2.6, stone: 9.5, stump: 11.5 }[a.base];
    const p1 = random() * 6.3, p2 = random() * 6.3;
    const edge = (theta: number) => R * (1 + 0.14 * Math.sin(2 * theta + p1) + 0.09 * Math.sin(3 * theta + p2));
    const surface = (theta: number, f: number): V3 => {
      const r = edge(theta) * f;
      return [Math.cos(theta) * r, y0 + hC * Math.sqrt(Math.max(0, 1 - f * f)), Math.sin(theta) * r];
    };
    const dry = clamp01(mood.wear * 0.8 + (a.stage === 'spent' ? 0.25 : 0));
    const green = new THREE.Color().setHSL(mix(0.33, 0.21, mood.warmth) , mix(0.35, 0.68, mood.cheer), a.form === 'cushion' ? 0.5 : a.form === 'thread' ? 0.46 : 0.34);
    if (a.form === 'thread') green.lerp(new THREE.Color('#c9d6b4'), 0.35);
    green.lerp(new THREE.Color('#8a6f3a'), dry * 0.55);
    const plain = s.material('#ffffff', { roughness: 0.85 });
    const glossy = s.material('#ffffff', { roughness: 0.4 });

    // Base.
    if (a.base === 'humus') {
      const g = lumpy(ball(1, 22), 0.16, 4.2, random() * 9);
      bag.add(plain, g, at([0, 0.6, 0], [0, 0, 0], [R * 1.28, 4.2, R * 1.2]), '#3b2c20');
      for (let i = 0; i < 26; i++) {
        const t = random() * 6.3, r = R * (1.05 + random() * 0.3);
        bag.add(plain, new THREE.DodecahedronGeometry(0.6 + random() * 1.3), at([Math.cos(t) * r, 0.5, Math.sin(t) * r], [random() * 3, random() * 3, 0]), random() < 0.3 ? '#6b5136' : '#33261c');
      }
    } else if (a.base === 'bark') {
      const shape = new THREE.Shape();
      const n = 11;
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2, r = R * (1.15 + random() * 0.4);
        if (i === 0) shape.moveTo(Math.cos(t) * r * 1.2, Math.sin(t) * r); else shape.lineTo(Math.cos(t) * r * 1.2, Math.sin(t) * r);
      }
      const g = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: true, bevelThickness: 0.7, bevelSize: 0.9, bevelSegments: 1 });
      bag.add(plain, g, at([0, 3.4, 0], [Math.PI / 2, 0, 0]), '#5d4634');
      for (let i = 0; i < 9; i++) bag.add(plain, new THREE.BoxGeometry(R * (0.8 + random()), 0.9, 1.1 + random()), at([(random() - 0.5) * R * 1.4, 3.6, (random() - 0.5) * R * 2.2], [0, (random() - 0.5) * 0.3, 0]), '#3f2e22');
    } else if (a.base === 'stone') {
      bag.add(glossy, lumpy(ball(1, 22), 0.07, 2.2, random() * 9), at([0, 5.6, 0], [0, random() * 3, 0], [R * 1.22, 7.5, R * 1.08]), '#8d9092');
    } else {
      const top = painted(256, 256, (ctx, w) => {
        ctx.fillStyle = '#8a6a48';
        ctx.fillRect(0, 0, w, w);
        for (let r = 6; r < w * 0.7; r += 7 + random() * 6) {
          ctx.strokeStyle = random() < 0.5 ? '#5c4129' : '#a8875f';
          ctx.lineWidth = 1.5 + random() * 2.5;
          ctx.beginPath();
          ctx.ellipse(w * 0.46, w * 0.52, r, r * 0.93, 0.3, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.strokeStyle = '#2e2016';
        ctx.lineWidth = 3;
        for (let i = 0; i < 7; i++) {
          const t = random() * 6.3;
          ctx.beginPath();
          ctx.moveTo(w * 0.46 + Math.cos(t) * 20, w * 0.52 + Math.sin(t) * 20);
          ctx.lineTo(w * 0.46 + Math.cos(t) * 150, w * 0.52 + Math.sin(t) * 150);
          ctx.stroke();
        }
      });
      const wood = new THREE.Mesh(lumpy(new THREE.CylinderGeometry(R * 1.22, R * 1.3, 12, 20, 3), 0.05, 0.3, random() * 9), [s.material('#4a3526', { roughness: 0.95 }), s.material('#ffffff', { map: top, roughness: 0.9 }), s.material('#3a2a1e')]);
      wood.position.y = 6;
      wood.castShadow = wood.receiveShadow = true;
      s.root.add(wood);
    }

    // The cushion body under the leaves.
    const dome = new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const dp = dome.getAttribute('position');
    for (let i = 0; i < dp.count; i++) {
      const x = dp.getX(i), z = dp.getZ(i), theta = Math.atan2(z, x), r = edge(theta);
      dp.setXYZ(i, x * r, y0 + dp.getY(i) * hC * 0.94, z * r);
    }
    dome.computeVertexNormals();
    bag.add(plain, dome, undefined, green.clone().multiplyScalar(0.62));

    // Stalk plan first, so the raindrop and the flattened swath can shape both moss and stalks.
    const drop: V3 | null = a.event === 'raindrop' ? surface(random() * 6.3, 0.25 + random() * 0.2) : null;
    const dropR = 5.5 + random() * 1.5;
    const swathAngle = random() * Math.PI, sx = Math.cos(swathAngle), sz = Math.sin(swathAngle);
    const inSwath = (p: V3) => a.event === 'flattened' && Math.abs(p[0] * -sz + p[2] * sx) < R * 0.3;

    // Leafy shoots, instanced.
    const shoots = Math.round({ haircap: 250, cushion: 420, feather: 230, thread: 400 }[a.form] * mix(0.75, 1.15, mood.density));
    const shootSize = { haircap: 7.5, cushion: 3.4, feather: 8.5, thread: 3.6 }[a.form];
    const carpet = new THREE.InstancedMesh(shootGeometry(a.form), s.material('#ffffff', { roughness: 0.8, side: THREE.DoubleSide }), shoots);
    const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), tint = new THREE.Color();
    for (let i = 0; i < shoots; i++) {
      const theta = random() * Math.PI * 2, f = Math.sqrt(random()) * 0.98, p = surface(theta, f);
      const outward = new THREE.Vector3(Math.cos(theta) * f, mix(1.2, 0.35, f) * (a.form === 'feather' ? 0.35 : 1), Math.sin(theta) * f).normalize();
      dummy.position.set(p[0], p[1] - 0.5, p[2]);
      dummy.quaternion.setFromUnitVectors(up, outward);
      dummy.rotateY(random() * 6.3);
      let size = shootSize * mix(0.7, 1.25, random());
      if (inSwath(p)) { dummy.rotateX(1.1); size *= 0.8; }
      if (drop && Math.hypot(p[0] - drop[0], p[2] - drop[2]) < dropR * 0.8) size *= 0.5;
      dummy.scale.set(size, size, size);
      dummy.updateMatrix();
      carpet.setMatrixAt(i, dummy.matrix);
      tint.copy(green).offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.16);
      if (random() < dry * 0.5) tint.lerp(new THREE.Color('#a8853f'), 0.7);
      carpet.setColorAt(i, tint);
    }
    carpet.instanceMatrix.needsUpdate = true;
    if (carpet.instanceColor) carpet.instanceColor.needsUpdate = true;
    carpet.castShadow = carpet.receiveShadow = true;
    s.root.add(carpet);

    // Stalks and capsules.
    const stand = new THREE.Group();
    s.root.add(stand);
    const wire = s.material('#ffffff', { roughness: 0.45, emissive: { red: '#7a0c08', amber: '#7a3c06', straw: '#4d5a12', wine: '#1c0610' }[a.stalk], emissiveIntensity: mix(0.25, 0.7, mood.cheer) });
    const stalkColour = new THREE.Color({ red: '#d8301f', amber: '#e08a2a', straw: '#c3cf6a', wine: '#5a1f38' }[a.stalk]);
    const count = Math.round(mix(3, 34, clamp01(a.crowd * 0.75 + mood.density * 0.25)));
    const upright = a.form === 'haircap';
    const stages = Object.keys(STAGES) as (keyof typeof STAGES)[];
    const mouths: { at: V3; out: THREE.Vector3 }[] = [];
    const tips: V3[] = [];
    const capsuleProfile = [[0.04, 0], [0.16, 0.06], [0.27, 0.25], [0.31, 0.55], [0.27, 0.82], [0.2, 1]].map(([x, y]) => new THREE.Vector2(x, y));
    const wind = random() * 6.3;
    for (let i = 0; i < count; i++) {
      const theta = random() * Math.PI * 2, f = Math.sqrt(random()) * 0.72, p = surface(theta, f);
      if (drop && Math.hypot(p[0] - drop[0], p[2] - drop[2]) < dropR * 0.75) continue;
      const H = mix(11, 44, a.height) * mix(0.72, 1.12, random());
      const lean = wind + (random() - 0.5) * 2.4, lx = Math.cos(lean), lz = Math.sin(lean);
      let stage = a.stage;
      if (random() < 0.3) stage = stages[Math.max(0, Math.min(stages.length - 1, stages.indexOf(a.stage) + (random() < 0.5 ? -1 : 1)))];
      const flat = inSwath(p), bitten = a.event === 'grazed' && random() < 0.55;
      const twist = stage === 'spent' ? 0.22 : 0.08;
      let path: V3[];
      if (flat) {
        const d = random() < 0.5 ? 1 : -1;
        path = [p, [p[0] + sx * d * H * 0.3, p[1] + H * 0.2, p[2] + sz * d * H * 0.3], [p[0] + sx * d * H * 0.85, p[1] + H * 0.1, p[2] + sz * d * H * 0.85]];
      } else {
        path = [p, [p[0] + lx * H * twist, p[1] + H * 0.5, p[2] + lz * H * twist], [p[0] + lx * H * 0.18 + (random() - 0.5) * H * twist, p[1] + H, p[2] + lz * H * 0.18]];
        if (drop) {
          const dx = p[0] - drop[0], dz = p[2] - drop[2], d = Math.hypot(dx, dz);
          if (d < dropR * 2) path[1] = [p[0] + (dx / d) * dropR * 0.8, p[1] + H * 0.5, p[2] + (dz / d) * dropR * 0.8];
        }
      }
      const top = path[2];
      if (bitten) {
        const cut = 0.35 + random() * 0.4;
        bag.add(wire, taper([p, [mix(p[0], path[1][0], cut), mix(p[1], path[1][1], cut), mix(p[2], path[1][2], cut)], [mix(p[0], top[0], cut), mix(p[1], top[1], cut), mix(p[2], top[2], cut)]], () => 0.3, 8, 5), undefined, stalkColour);
        continue;
      }
      const nod = !upright && !flat && stage !== 'spears';
      const hang: V3 = nod ? [top[0] + lx * 2.6, top[1] - 0.6, top[2] + lz * 2.6] : top;
      if (nod) path.push([top[0] + lx * 1.4, top[1] + 0.5, top[2] + lz * 1.4], hang);
      bag.add(wire, taper(path, (t) => mix(0.44, 0.3, t), 14, 5), undefined, stalkColour.clone().offsetHSL(0, 0, (random() - 0.5) * 0.08));
      // Capsule direction: along the stalk when upright, drooping when nodding.
      const before = path[path.length - 2];
      const dir = new THREE.Vector3(hang[0] - before[0], hang[1] - before[1], hang[2] - before[2]).normalize();
      if (nod) dir.set(lx * 0.75, -0.62, lz * 0.75).normalize();
      else if (upright) dir.lerp(new THREE.Vector3(lx, 0.2, lz), 0.25).normalize();
      const L = mix(5.6, 7.8, random()) * (a.form === 'thread' ? 0.85 : 1) * mix(0.85, 1.2, a.height);
      const end: V3 = [hang[0] + dir.x * L, hang[1] + dir.y * L, hang[2] + dir.z * L];
      const pose = (y: number, scale: V3 | number = L) => {
        const m = aim(hang, end, scale);
        return m.multiply(new THREE.Matrix4().makeTranslation(0, y, 0));
      };
      if (stage === 'spears') {
        bag.add(plain, new THREE.ConeGeometry(0.11, 1.5, 6), pose(0.6), '#a9b85a');
        bag.add(plain, new THREE.ConeGeometry(0.1, 0.9, 6), pose(1.25), '#e3d6a4');
        tips.push(end);
        continue;
      }
      const fat = stage === 'spent' ? 0.72 : stage === 'capped' ? 0.85 : a.form === 'thread' ? 1.25 : 1.05;
      const capsuleColour = { capped: '#93ad45', ripe: '#cf7a2c', smoking: '#a5672c', spent: '#4c3626' }[stage];
      const capsule = new THREE.LatheGeometry(capsuleProfile, 10);
      if (stage === 'spent') lumpy(capsule, 0.16, 9, i);
      bag.add(glossy, capsule, aim(hang, end, [L * fat, L, L * fat]), new THREE.Color(capsuleColour).offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.08));
      tips.push(end);
      if (stage === 'capped') {
        const big = upright ? 1.35 : 1;
        const hood = new THREE.ConeGeometry(0.33 * big, 1.25 * big, 8);
        bag.add(plain, hood, pose(1.02 - (big - 1) * 0.3, [L * fat, L, L * fat]).multiply(at([0.03, 0, 0], [0, 0, upright ? 0.05 : 0.22])), upright ? '#d9a94a' : '#e6d9a8');
      } else if (stage === 'ripe') {
        bag.add(glossy, new THREE.ConeGeometry(0.21, 0.36, 8), pose(1.17, [L * fat, L, L * fat]), '#b3311c');
        bag.add(plain, new THREE.TorusGeometry(0.2, 0.035, 4, 10), pose(1, [L * fat, L, L * fat]).multiply(at([0, 0, 0], [Math.PI / 2, 0, 0])), '#5e2a16');
      } else {
        bag.add(plain, new THREE.CircleGeometry(0.19, 10), pose(1.005, [L * fat, L, L * fat]).multiply(at([0, 0, 0], [-Math.PI / 2, 0, 0])), '#1d120c');
        for (let k = 0; k < 10; k++) {
          const t = (k / 10) * Math.PI * 2;
          bag.add(plain, new THREE.ConeGeometry(0.035, 0.2, 3), pose(1, [L * fat, L, L * fat]).multiply(at([Math.cos(t) * 0.2, 0.08, Math.sin(t) * 0.2], [Math.sin(t) * 0.5, 0, -Math.cos(t) * 0.5])), stage === 'spent' ? '#7a5a3a' : '#f0c05a');
        }
        if (stage === 'smoking') mouths.push({ at: end, out: dir.clone() });
      }
    }
    bag.flush(stand);

    // Spores: a short golden plume from every open mouth, plus a soft haze that is not measured.
    const sporeGroup = new THREE.Group();
    s.root.add(sporeGroup);
    if (mouths.length) {
      const perMouth = Math.round(mix(8, 26, mood.energy));
      const spores = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#f3d36a', emissive: '#d99a1e', emissiveIntensity: 0.9, roughness: 0.6 }), mouths.length * perMouth);
      const haze = new THREE.MeshStandardMaterial({ color: '#f4dc8a', emissive: '#e0b040', emissiveIntensity: 0.5, transparent: true, opacity: 0.17, depthWrite: false, roughness: 1 });
      let index = 0;
      const wx = Math.cos(wind) * 0.6, wz = Math.sin(wind) * 0.6;
      for (const mouth of mouths) {
        for (let k = 0; k < perMouth; k++) {
          const d = 0.6 + random() * 7, spread = d * 0.32;
          dummy.position.set(mouth.at[0] + (mouth.out.x + wx) * d + (random() - 0.5) * spread, mouth.at[1] + mouth.out.y * d * 0.5 + (random() - 0.3) * spread, mouth.at[2] + (mouth.out.z + wz) * d + (random() - 0.5) * spread);
          dummy.quaternion.identity();
          dummy.scale.setScalar(mix(0.34, 0.14, d / 8));
          dummy.updateMatrix();
          spores.setMatrixAt(index++, dummy.matrix);
        }
        const puff = new THREE.Mesh(ball(1, 10), haze);
        puff.position.set(mouth.at[0] + (mouth.out.x + wx) * 3, mouth.at[1] + mouth.out.y * 1.2 + 0.4, mouth.at[2] + (mouth.out.z + wz) * 3);
        puff.scale.set(3.4, 2.4, 3.4);
        sporeGroup.add(puff);
      }
      spores.instanceMatrix.needsUpdate = true;
      spores.castShadow = true;
      sporeGroup.add(spores);
    }

    // Water.
    const wet = water();
    const bead = (p: V3, r: number) => {
      const m = new THREE.Mesh(ball(r, 14), wet);
      m.position.set(p[0], p[1], p[2]);
      s.root.add(m);
      const glint = new THREE.Mesh(ball(r * 0.22, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false }));
      glint.position.set(p[0] - r * 0.45, p[1] + r * 0.55, p[2] + r * 0.5);
      s.root.add(glint);
    };
    if (drop) bead([drop[0], drop[1] + dropR * 0.8, drop[2]], dropR);
    if (a.dew) {
      for (const tip of tips) if (random() < 0.6) bead([tip[0], tip[1] - 0.5, tip[2]], 0.7 + random() * 0.5);
      for (let i = 0; i < 16; i++) {
        const p = surface(random() * 6.3, Math.sqrt(random()) * 0.95);
        bead([p[0], p[1] + shootSize * 0.5, p[2]], 0.7 + random() * 1.1);
      }
    }
    if (a.event === 'needle') {
      const needle = new Bag(), tone = s.material('#ffffff', { roughness: 0.6 });
      const t = random() * 6.3, c = Math.cos(t), z = Math.sin(t), top = y0 + hC + shootSize * 0.55;
      const butt: V3 = [-c * R * 1.25, y0 + shootSize * 0.5, -z * R * 1.25];
      for (const side of [-1, 1]) needle.add(tone, taper([butt, [0, top + 1.2, 0], [c * R * 1.35 - z * side * 3.5, top - hC * 0.55, z * R * 1.35 + c * side * 3.5]], (u) => mix(0.75, 0.3, u), 12, 5), undefined, mood.wear > 0.5 ? '#9a6a34' : '#b58b3c');
      needle.add(tone, new THREE.CylinderGeometry(0.95, 0.8, 3.2, 6), aim(butt, [0, top + 1.2, 0]), '#3a281c');
      needle.flush(s.root);
    }

    s.root.scale.setScalar(0.001);
    const sway = mix(0.004, 0.035, mood.energy), pace = mix(0.5, 2.2, mood.energy);
    return s.finish({
      footprint: R * 0.0013,
      update: (_dt, time) => {
        stand.rotation.x = Math.sin(time * pace) * sway;
        stand.rotation.z = Math.cos(time * pace * 0.73) * sway;
        sporeGroup.position.y = Math.sin(time * pace * 0.5) * 0.8;
        sporeGroup.rotation.y = Math.sin(time * pace * 0.31) * sway * 2;
      },
    });
  },
});
