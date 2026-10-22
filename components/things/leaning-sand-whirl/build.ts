import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { sandGround, sandTone } from './sand';

type P3 = readonly [number, number, number];

const SANDS = {
  gold: 'Pale golden sand.',
  ochre: 'Red ochre dust, like dried blood in the air.',
  white: 'White gypsum or salt, a ghost of a whirl.',
  ash: 'Grey-black ash and soot.',
  rose: 'Dusky pink sand.',
} as const;
const SAND: Record<keyof typeof SANDS, string> = { gold: '#d9b274', ochre: '#b8643a', white: '#e4dfd2', ash: '#5d5856', rose: '#d39a86' };

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Slanting streaks that wrap sideways, so a sliding texture reads as sand winding up the column. */
function streaks(random: () => number, base: THREE.Color, veil: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d')!;
  const light = `#${base.clone().lerp(new THREE.Color('#fff6e2'), 0.5).getHexString()}`;
  const dark = `#${base.clone().multiplyScalar(0.58).getHexString()}`;
  if (!veil) { g.fillStyle = `#${base.getHexString()}`; g.fillRect(0, 0, 256, 256); }
  for (let i = 0; i < (veil ? 34 : 50); i++) {
    g.strokeStyle = veil ? (random() < 0.7 ? `#${base.getHexString()}` : light) : random() < 0.5 ? light : dark;
    g.globalAlpha = veil ? 0.35 + random() * 0.5 : 0.3 + random() * 0.45;
    g.lineWidth = 3 + random() * (veil ? 16 : 9);
    const x = random() * 256, y = random() * 256, run = 50 + random() * 120;
    for (const dx of [-256, 0, 256]) { g.beginPath(); g.moveTo(x + dx, y); g.lineTo(x + dx + run, y - run * 1.1); g.stroke(); }
  }
  if (veil) {
    // Fade the veil out toward its top so the column frays instead of ending.
    const fade = g.createLinearGradient(0, 0, 0, 256);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(0.3, 'rgba(0,0,0,0.9)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = fade;
    g.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    form: choice('What shape is the whirl?', {
      thread: 'A single hair-thin thread of sand, impossibly tall for its width.',
      serpent: 'A column that snakes in an S as it rises, like a charmed cobra.',
      funnel: 'A narrow foot opening into a wider, ragged top.',
      broken: 'Severed in the middle: the top is drifting off while the foot still spins. It is dying.',
      pair: 'A tall one with a small one trotting beside it, like parent and child.',
    }),
    lean: score('How far does it lean?', ['Bolt upright', 'Leaning like someone walking into the wind', 'Bent almost double']),
    height: score('How tall is it?', ['Barely head high, a playground twister', 'As high as a house', 'Tall as a minaret']),
    sand: choice('What is it made of?', SANDS),
    debris: choice('What has it picked up and is carrying round its foot?', {
      grit: 'Only grit and small stones.',
      thorn: 'Dry thorn twigs and a tumbling ball of dead brush.',
      litter: 'Plastic bags in white, blue and black, the litter of a roadside.',
      fronds: 'Dead palm fronds torn from an oasis.',
      pages: 'Loose sheets of paper, someone\'s letters or schoolwork.',
      cloth: 'One long indigo headcloth, wound up round the column like a ribbon.',
    }),
    heart: choice('Is there anything inside it?', {
      empty: 'Nothing. It is only wind and sand.',
      figure: 'The dim shape of a tall robed figure standing in the middle of it.',
      eyes: 'Two ember-coloured points high up, like eyes.',
      bird: 'A kite circling above, riding the same rising air.',
    }),
    wake: choice('What has it left on the ground behind it?', {
      nothing: 'No trace at all.',
      trail: 'A swept wandering trail that shows where it has walked from.',
      spiral: 'Spiral scour marks round its foot.',
      dropped: 'A scatter of things it has already dropped.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const sand = sandTone(SAND[a.sand], a.sand === 'ash' || a.sand === 'white' ? 0.5 : mood.warmth);
    const H = mix(2.4, 24, a.height ** 1.4) * mix(0.92, 1.08, random());
    const slim = { thread: 0.022, serpent: 0.04, funnel: 0.05, broken: 0.04, pair: 0.036 }[a.form];
    const unit = Math.min(0.55, Math.max(0.12, H * 0.035));
    const hollow = a.heart === 'figure';
    const spin = mix(0.5, 3.2, mood.energy);

    const coreMap = streaks(random, sand, false);
    const veilMap = streaks(random, sand, true);
    const wispMap = streaks(random, sand.clone().lerp(new THREE.Color('#fff6e2'), 0.25), true);
    coreMap.repeat.set(2, 1); veilMap.repeat.set(2, 1); wispMap.repeat.set(1, 1);
    const coreMaterial = new THREE.MeshStandardMaterial({ map: coreMap, roughness: 1, transparent: hollow, opacity: hollow ? 0.4 : 1, depthWrite: !hollow, side: THREE.DoubleSide });
    const veilMaterial = new THREE.MeshStandardMaterial({ map: veilMap, roughness: 1, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
    const wispMaterial = new THREE.MeshStandardMaterial({ map: wispMap, roughness: 1, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    const skirtMaterial = new THREE.MeshStandardMaterial({ map: coreMap, roughness: 1, side: THREE.DoubleSide });

    interface Column { axis: (t: number) => THREE.Vector3; radius: (t: number) => number; height: number; parts: [number, number][]; drift: (t: number) => number }
    const columns: Column[] = [];
    const shell = (column: Column, t0: number, t1: number, scale: number, ragged: number, material: THREE.Material, taper: boolean) => {
      const S = 26, R = Math.max(8, Math.round((t1 - t0) * 44));
      const p1 = random() * 6.28, p2 = random() * 6.28, p3 = random() * 6.28;
      const positions: number[] = [], uvs: number[] = [], index: number[] = [];
      for (let i = 0; i <= R; i++) {
        const k = i / R, t = mix(t0, t1, k), c = column.axis(t);
        const ends = taper ? Math.min(1, smooth(0, 0.12, k) * 0.6 + 0.4) * (1 - smooth(0.72, 1, k)) : 1;
        const r = column.radius(t) * scale * ends;
        for (let j = 0; j <= S; j++) {
          const angle = (j / S) * Math.PI * 2;
          const n = 1 + ragged * (Math.sin(3 * angle + t * 9 + p1) * 0.5 + Math.sin(5 * angle - t * 14 + p2) * 0.3 + Math.sin(2 * angle + t * 5 + p3) * 0.4);
          positions.push(c.x + Math.cos(angle + t * 5) * r * n, c.y, c.z + Math.sin(angle + t * 5) * r * n);
          uvs.push(j / S, t);
        }
      }
      for (let i = 0; i < R; i++) for (let j = 0; j < S; j++) { const p = i * (S + 1) + j, q = p + S + 1; index.push(p, p + 1, q, p + 1, q + 1, q); }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = material === coreMaterial && !hollow || material === skirtMaterial;
      s.root.add(mesh);
      return mesh;
    };

    const raise = (height: number, at: readonly [number, number], broken: boolean) => {
      const lean = mix(0.02, 0.62, a.lean) * mix(0.85, 1.15, random()), heading = (random() - 0.5) * 0.8;
      const sway = (a.form === 'serpent' ? 0.13 : 0.035) * height, phase = random() * 6.28, r0 = height * slim;
      const column: Column = {
        height,
        parts: broken ? [[0, 0.46], [0.56, 1]] : [[0, 1]],
        drift: (t) => (broken && t > 0.5 ? height * 0.14 : 0),
        axis: (t) => {
          const out = lean * height * t ** 1.5 + Math.sin(t * Math.PI * 2 + phase) * sway * t + column.drift(t);
          const side = Math.cos(t * Math.PI * 1.6 + phase) * sway * t * 0.8;
          return new THREE.Vector3(at[0] + Math.cos(heading) * out - Math.sin(heading) * side, height * t * mix(1, 0.72, a.lean * t), at[1] + Math.sin(heading) * out + Math.cos(heading) * side);
        },
        radius: (t) => r0 * (a.form === 'funnel' ? 0.7 + 2.6 * t ** 1.6 : a.form === 'thread' ? 0.8 + 0.7 * t : 0.75 + 1.3 * t ** 1.3),
      };
      columns.push(column);
      for (const [t0, t1] of column.parts) {
        shell(column, t0, t1, 0.62, 0.1, coreMaterial, true);
        shell(column, t0, Math.min(1, t1 + 0.04), 1, 0.28, veilMaterial, false);
        shell(column, t0 + (t1 - t0) * 0.3, Math.min(1, t1 + 0.06), 1.55, 0.5, wispMaterial, false);
      }
      // The skirt: a ragged cone of kicked-up sand where the column meets the ground.
      const skirtHeight = Math.min(0.2, 0.7 / height + 0.08);
      const foot: Column = { ...column, radius: (t) => r0 * (0.9 + 2.7 * Math.max(0, 1 - t / skirtHeight) ** 2.2) };
      shell(foot, 0.001, skirtHeight, 1, 0.55, skirtMaterial, false);
      shell(foot, 0.001, skirtHeight * 1.5, 1.5, 0.6, veilMaterial, false);
      return column;
    };
    const main = raise(H, [0, 0], a.form === 'broken');
    if (a.form === 'pair') raise(H * mix(0.3, 0.45, random()), [H * 0.22 + 1, H * 0.1 + 0.6], false);

    // Ground.
    const radius = Math.max(1.4, H * 0.3) + (a.form === 'pair' ? H * 0.12 : 0);
    const ground = sandGround({ radius, colour: sandTone('#dcbf8a', mood.warmth).lerp(sand, 0.35), random, dome: 0.04, rows: 22, ripple: 0.8 });
    s.root.add(ground.mesh);
    const on = (x: number, z: number, lift = 0): P3 => [x, ground.y(x, z) + lift, z];
    const scour = new THREE.MeshStandardMaterial({ color: sand.clone().multiplyScalar(0.55), roughness: 1 });
    if (a.wake === 'trail') {
      const from = random() * 6.28;
      const curve = new THREE.CatmullRomCurve3([[1, 0], [0.7, 0.35], [0.4, -0.2], [0.18, 0.12], [0, 0]].map(([r, bend]) => new THREE.Vector3(Math.cos(from + bend) * r * radius * 0.95, 0, Math.sin(from + bend) * r * radius * 0.95)));
      const marks = Array.from({ length: 150 }, (_unused, i) => { const p = curve.getPointAt(i / 149), w = (random() - 0.5) * radius * 0.07; return { at: on(p.x + w, p.z + w, -radius * 0.012), size: radius * mix(0.018, 0.034, random()) }; });
      s.scatter(new THREE.SphereGeometry(1, 6, 4), scour, marks).castShadow = false;
    } else if (a.wake === 'spiral') {
      const marks = Array.from({ length: 170 }, (_unused, i) => { const t = i / 169, angle = t * 15, r = radius * (0.12 + 0.6 * t); return { at: on(Math.cos(angle) * r, Math.sin(angle) * r, -radius * 0.012), size: radius * 0.024 }; });
      s.scatter(new THREE.SphereGeometry(1, 6, 4), scour, marks).castShadow = false;
    }

    // Debris geometry by kind.
    const twig = (() => {
      const parts = [0, 1, 2, 3].map((i) => { const g = new THREE.CylinderGeometry(0.04, 0.06, 1.6, 4); g.rotateZ(i * 0.9 + 0.3); g.rotateY(i * 1.3); return g; });
      return mergeGeometries(parts)!;
    })();
    const sheet = new THREE.PlaneGeometry(1, 1.35, 2, 2);
    { const p = sheet.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 3) * 0.18 + Math.cos(p.getY(i) * 2.4) * 0.12); sheet.computeVertexNormals(); }
    const frond = new THREE.PlaneGeometry(0.5, 3.4, 1, 5);
    { const p = frond.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, (p.getY(i) / 1.7) ** 2 * 0.5); frond.computeVertexNormals(); }
    const chip = new THREE.DodecahedronGeometry(0.35, 0);
    const kinds = {
      grit: { geometry: chip, colours: ['#6b5f55', '#8a7b6a'], count: 14 },
      thorn: { geometry: twig, colours: ['#5a4634', '#7b6448', '#3f3126'], count: 20 },
      litter: { geometry: sheet, colours: ['#f2f2ee', '#2e6fd0', '#1f1d1d', '#e9a3b8', '#f2f2ee'], count: 22 },
      fronds: { geometry: frond, colours: ['#7d7a3e', '#a08a4c', '#5d6b34'], count: 13 },
      pages: { geometry: sheet, colours: ['#f7f4ea', '#efe9d6', '#f7f4ea', '#dfe7ee'], count: 26 },
      cloth: { geometry: chip, colours: ['#6b5f55'], count: 8 },
    }[a.debris];
    const count = Math.round(kinds.count * mix(0.6, 1.5, mood.density));
    const flotsam = new THREE.InstancedMesh(kinds.geometry, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide }), count);
    const riders = Array.from({ length: count }, (_unused, i) => {
      flotsam.setColorAt(i, new THREE.Color(kinds.colours[i % kinds.colours.length]));
      return { column: columns[i % columns.length], t: 0.02 + random() ** 1.8 * 0.5, angle: random() * 6.28, wide: 1.3 + random() * 2.2, speed: 0.5 + random(), tumble: random() * 6.28, size: unit * mix(0.6, 1.3, random()) * (a.debris === 'grit' ? 0.5 : 1) };
    });
    flotsam.castShadow = true;
    flotsam.frustumCulled = false;
    s.root.add(flotsam);
    if (a.debris === 'thorn') {
      const brush = s.mesh(new THREE.IcosahedronGeometry(unit * 1.5, 1), new THREE.MeshStandardMaterial({ color: '#6b563c', wireframe: true }), on(radius * 0.4, radius * 0.3, unit * 1.3));
      brush.castShadow = false;
    }
    if (a.wake === 'dropped') {
      const fallen = new THREE.InstancedMesh(kinds.geometry, flotsam.material, 12);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 12; i++) {
        const angle = random() * 6.28, r = radius * (0.35 + random() * 0.55);
        dummy.position.set(...on(Math.cos(angle) * r, Math.sin(angle) * r, unit * 0.12));
        dummy.rotation.set(-Math.PI / 2 + (random() - 0.5) * 0.4, 0, random() * 6.28);
        dummy.scale.setScalar(unit * mix(0.7, 1.2, random()));
        dummy.updateMatrix();
        fallen.setMatrixAt(i, dummy.matrix);
        fallen.setColorAt(i, new THREE.Color(kinds.colours[i % kinds.colours.length]));
      }
      fallen.castShadow = true;
      s.root.add(fallen);
    }

    // Grit: many small grains wound round the skirt and up the column.
    const grainCount = Math.round(mix(160, 420, mood.energy));
    const grains = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: sand.clone().multiplyScalar(0.8), roughness: 1 }), grainCount);
    const specks = Array.from({ length: grainCount }, (_unused, i) => ({ column: columns[i % columns.length], t: random() ** 2.6, angle: random() * 6.28, wide: 0.9 + random() * 1.6, speed: 0.8 + random() * 1.4, size: unit * mix(0.07, 0.2, random()) }));
    grains.frustumCulled = false;
    grains.castShadow = true;
    s.root.add(grains);

    // The ribbon of cloth.
    let ribbon: THREE.Mesh | null = null;
    const RIBBON = 70;
    if (a.debris === 'cloth') {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((RIBBON + 1) * 6), 3));
      const index: number[] = [];
      for (let i = 0; i < RIBBON; i++) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      geometry.setIndex(index);
      ribbon = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: mood.cheer > 0.6 ? '#2a52c4' : '#27306b', roughness: 0.9, side: THREE.DoubleSide }));
      ribbon.castShadow = true;
      ribbon.frustumCulled = false;
      s.root.add(ribbon);
    }

    // What is inside.
    const eyes: THREE.Mesh[] = [];
    let kite: THREE.Group | null = null;
    if (a.heart === 'figure') {
      const shade = new THREE.MeshStandardMaterial({ color: '#2b2228', roughness: 1 });
      const tall = Math.max(1.5, H * 0.4), at = (t: number) => main.axis((t * tall) / (main.height * mix(1, 0.72, a.lean * 0.4)));
      const robe = new THREE.Group();
      const body = s.cylinder(tall * 0.065, tall * 0.015, tall * 0.8, [0, tall * 0.4, 0], shade, 12);
      const shoulders = s.ball([tall * 0.1, tall * 0.05, tall * 0.055], [0, tall * 0.8, 0], shade, 14);
      const head = s.ball([tall * 0.055, tall * 0.07, tall * 0.06], [0, tall * 0.91, 0], shade, 14);
      robe.add(body, shoulders, head);
      const base = at(0.05), top = at(0.9);
      robe.position.set(base.x, 0, base.z);
      robe.rotation.z = -Math.atan2(top.x - base.x, tall) * 0.9;
      robe.rotation.x = Math.atan2(top.z - base.z, tall) * 0.9;
      s.root.add(robe);
    } else if (a.heart === 'eyes') {
      const ember = new THREE.MeshStandardMaterial({ color: '#ffb056', emissive: '#ff6a1c', emissiveIntensity: 2.4, roughness: 0.4 });
      const t = a.form === 'broken' ? 0.36 : 0.74, c = main.axis(t), r = main.radius(t);
      for (const side of [-1, 1]) eyes.push(s.ball([r * 0.2, r * 0.13, r * 0.12], [c.x + side * r * 0.36, c.y, c.z + r * 0.62], ember, 10));
    } else if (a.heart === 'bird') {
      kite = new THREE.Group();
      const feather = s.material('#2a2320', { side: THREE.DoubleSide });
      const wing = new THREE.Shape().moveTo(0, 0.25).lineTo(1.5, 0.05).lineTo(1.1, -0.2).lineTo(0, -0.3).lineTo(-1.1, -0.2).lineTo(-1.5, 0.05).lineTo(0, 0.25);
      const wings = s.mesh(new THREE.ShapeGeometry(wing), feather);
      wings.rotation.x = -Math.PI / 2;
      const tail = s.box([0.18, 0.04, 0.7], [0, 0, 0.45], feather);
      kite.add(wings, tail, s.ball([0.14, 0.12, 0.3], [0, 0, -0.1], feather, 8));
      kite.scale.setScalar(Math.max(0.5, unit * 2.2));
      s.root.add(kite);
    }
    // Stones the wind could not lift.
    s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#7d7064', { flatShading: true }), Array.from({ length: 6 + Math.round(mood.density * 16) }, () => {
      const angle = random() * 6.28, r = radius * (0.3 + random() * 0.6);
      return { at: on(Math.cos(angle) * r, Math.sin(angle) * r, 0.01), size: unit * mix(0.12, 0.3, random()) };
    }));

    const dummy = new THREE.Object3D();
    const matrix = new THREE.Matrix4();
    const crown = main.axis(1);
    const animate = (time: number) => {
      const turn = time * spin;
      coreMap.offset.x = -turn * 0.18; veilMap.offset.x = -turn * 0.13; wispMap.offset.x = -turn * 0.08;
      riders.forEach((rider, i) => {
        const t = (rider.t + time * 0.012 * rider.speed) % 0.55, c = rider.column.axis(t);
        const r = rider.column.radius(t) * rider.wide + rider.column.height * slim * 3.2 * (1 - smooth(0, 0.12, t)), angle = rider.angle + turn * rider.speed;
        dummy.position.set(c.x + Math.cos(angle) * r, Math.max(c.y, rider.size * 0.4), c.z + Math.sin(angle) * r);
        dummy.rotation.set(rider.tumble + turn * 0.7, -angle, rider.tumble * 2 + turn * 0.4);
        dummy.scale.setScalar(rider.size * rider.column.height / H ** 1 * (rider.column === main ? 1 : 1.6));
        dummy.updateMatrix();
        flotsam.setMatrixAt(i, dummy.matrix);
      });
      flotsam.instanceMatrix.needsUpdate = true;
      specks.forEach((speck, i) => {
        const t = (speck.t + time * 0.03 * speck.speed) % 1, c = speck.column.axis(t);
        const r = speck.column.radius(t) * speck.wide + speck.column.height * slim * 3.6 * (1 - smooth(0, 0.1, t)) * (0.4 + (i % 7) / 7), angle = speck.angle + turn * speck.speed * 1.4;
        matrix.makeScale(speck.size, speck.size, speck.size).setPosition(c.x + Math.cos(angle) * r, c.y + speck.size, c.z + Math.sin(angle) * r);
        grains.setMatrixAt(i, matrix);
      });
      grains.instanceMatrix.needsUpdate = true;
      if (ribbon) {
        const p = ribbon.geometry.attributes.position, width = Math.max(0.22, H * 0.02);
        for (let i = 0; i <= RIBBON; i++) {
          const k = i / RIBBON, t = 0.06 + k * 0.5, c = main.axis(t), r = main.radius(t) * (1.5 + 0.5 * Math.sin(k * 9 + turn)), angle = k * 16 - turn * 1.2;
          const flutter = Math.sin(k * 30 - turn * 5) * width * 0.35;
          p.setXYZ(i * 2, c.x + Math.cos(angle) * r, c.y - width / 2 + flutter, c.z + Math.sin(angle) * r);
          p.setXYZ(i * 2 + 1, c.x + Math.cos(angle) * r * 1.04, c.y + width / 2 + flutter, c.z + Math.sin(angle) * r * 1.04);
        }
        p.needsUpdate = true;
        ribbon.geometry.computeVertexNormals();
      }
      if (kite) {
        const angle = time * 0.5, r = Math.max(1.2, H * 0.16);
        kite.position.set(crown.x + Math.cos(angle) * r, crown.y + unit * 2, crown.z + Math.sin(angle) * r);
        kite.rotation.set(0, -angle, 0.35);
      }
      for (const eye of eyes) (eye.material as THREE.MeshStandardMaterial).emissiveIntensity = 2 + Math.sin(time * 3.1) * 0.6;
    };
    animate(0);
    void coreMaterial;

    return s.finish({ footprint: radius * 0.8, update: (_dt, time) => animate(time) });
  },
});
