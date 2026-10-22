import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';

type Outline = readonly (readonly [number, number])[];
interface Cut { outline: Outline; depth: number; }

// Half silhouettes, hanging from the rail at y = 0: neck first, down the outside, ending at the centre line.
const CUTS = {
  coat: { outline: [[0.05, -0.03], [0.25, -0.09], [0.31, -0.68], [0.23, -0.69], [0.245, -1.04], [0, -1.04]], depth: 0.085 },
  shirt: { outline: [[0.05, -0.03], [0.21, -0.08], [0.33, -0.25], [0.27, -0.31], [0.2, -0.23], [0.21, -0.72], [0, -0.72]], depth: 0.032 },
  gown: { outline: [[0.035, -0.02], [0.06, -0.1], [0.15, -0.15], [0.11, -0.44], [0.2, -0.8], [0.32, -1.3], [0, -1.34]], depth: 0.1 },
  coverall: { outline: [[0.05, -0.03], [0.23, -0.08], [0.29, -0.62], [0.22, -0.63], [0.2, -0.32], [0.2, -1.3], [0.035, -1.3], [0.02, -0.74], [0, -0.74]], depth: 0.05 },
  dungaree: { outline: [[0.035, -0.02], [0.06, -0.02], [0.07, -0.14], [0.14, -0.15], [0.15, -0.5], [0.025, -0.5], [0.015, -0.32], [0, -0.32]], depth: 0.03 },
  tee: { outline: [[0.03, -0.02], [0.12, -0.05], [0.19, -0.15], [0.15, -0.19], [0.115, -0.14], [0.12, -0.4], [0, -0.4]], depth: 0.026 },
} as const satisfies Record<string, Cut>;
type CutName = keyof typeof CUTS;

function cutGeometry(cut: Cut) {
  const right = cut.outline;
  const left = right.filter(([x]) => x !== 0).reverse().map(([x, y]) => [-x, y] as const);
  const shape = new THREE.Shape();
  [...right, ...left].forEach(([x, y], index) => (index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: cut.depth * 0.6, bevelEnabled: true, bevelThickness: cut.depth * 0.2, bevelSize: 0.01, bevelSegments: 2 });
  geometry.translate(0, 0, -cut.depth * 0.3);
  return geometry;
}

function bar(from: readonly [number, number, number], to: readonly [number, number, number], radius: number) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a);
  const geometry = new THREE.CylinderGeometry(radius, radius, d.length(), 5);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  geometry.translate(...(a.add(b).multiplyScalar(0.5).toArray() as [number, number, number]));
  return geometry;
}

/** A wire hanger whose hook loops over a rail at y = 0. */
function hangerGeometry(span: number) {
  const hook = new THREE.TorusGeometry(0.022, 0.0035, 5, 12, Math.PI * 1.4);
  hook.rotateZ(-Math.PI * 0.2);
  hook.translate(0, 0.001, 0);
  const drop = span * 0.42;
  return mergeGeometries([
    hook,
    bar([0.02, -0.01, 0], [0, -0.05, 0], 0.0035),
    bar([0, -0.05, 0], [span, -0.05 - drop, 0], 0.0035),
    bar([0, -0.05, 0], [-span, -0.05 - drop, 0], 0.0035),
    bar([-span, -0.05 - drop, 0], [span, -0.05 - drop, 0], 0.0035),
  ])!;
}

/** A rumpled cloth heap: a low dome with folds pushed into it. */
function crumple(random: () => number) {
  const geometry = new THREE.SphereGeometry(1, 18, 10);
  const spot = geometry.attributes.position, a = random() * 6, b = random() * 6;
  for (let i = 0; i < spot.count; i++) {
    const x = spot.getX(i), y = spot.getY(i), z = spot.getZ(i);
    const fold = 1 + Math.sin(x * 7 + a) * 0.13 + Math.sin(z * 9 + b) * 0.12 + Math.sin((x + z) * 5) * 0.1;
    spot.setXYZ(i, x * fold, Math.max(y, -0.5) * fold * (1 + Math.sin(x * 11 + z * 6 + a) * 0.3), z * fold);
  }
  geometry.computeVertexNormals();
  return geometry;
}

const PALETTES: Record<string, readonly string[]> = {
  coats: ['#27324a', '#b08a5b', '#3a3a3d', '#5b6240', '#6e2630', '#8c8f93', '#1d1d20', '#b33a2c', '#c9bfa8', '#3f5d4f'],
  hawaiian: ['#19b3b0', '#ff6f59', '#ffd23f', '#ff4f9a', '#7ed321', '#ff9422', '#2f6fe0', '#f4f0e1', '#b23ad1'],
  prom: ['#d81b78', '#12908e', '#b79be8', '#8fc5ee', '#0f8a55', '#ecd9b0', '#c21f2c', '#1c1c24', '#f5a9c4', '#5a2d91'],
  children: ['#ff6b6b', '#ffd166', '#4ecdc4', '#6c8cff', '#ff9ecb', '#9be564', '#ffa94d', '#f6f1e4'],
  uniforms: ['#243a63', '#b9a773', '#f26a1b', '#3f9c8b', '#7a1f2b', '#5c6166'],
};

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    stock: choice('What hangs on the rack?', {
      coats: 'Heavy winter coats and parkas in navy, camel and charcoal, bulky and shoulder to shoulder.',
      hawaiian: 'Short-sleeved Hawaiian shirts in loud tropical prints, every one a different holiday.',
      prom: 'Long satin prom and bridesmaid dresses in jewel colours, hems nearly brushing the floor.',
      uniforms: 'Identical work coveralls or scrubs, one colour all the way round, somebody\'s old job.',
      children: 'Tiny dungarees and T-shirts in bright primaries on a low rail, outgrown in a season.',
      mixed: 'Everything at once: coats beside sundresses beside a boiler suit, unsorted donations.',
    }),
    order: choice('How are the garments arranged?', {
      rainbow: 'Sorted by colour into a full rainbow wheel, a volunteer\'s proud work.',
      tonal: 'Graded from dark to pale around the ring.',
      chaos: 'No order at all, colours clashing at random.',
    }),
    fullness: score('How full is the rail?', ['A handful of garments among bare hangers', 'Half empty, picked over', 'Comfortably full', 'Crammed so tight nothing slides']),
    happened: choice('What has just happened at this rack?', {
      untouched: 'Nothing: it was straightened this morning and nobody has been by.',
      rummaged: 'Someone shoved the hangers apart, leaving a wide gap at the front.',
      slipping: 'Several garments have half slid off their hangers and hang lopsided.',
      draped: 'A rejected garment has been thrown over the top of the rail instead of rehung.',
    }),
    pile: noul('Is there a pile of fallen clothes and hangers on the floor beneath it?'),
    sign: choice('What does the round sign on top say, if it has one?', {
      size: 'A size letter: M.',
      price: 'ALL $3',
      half: '50% OFF',
      fresh: 'NEW IN',
      last: 'LAST CHANCE',
      none: 'No sign, just the capped pole.',
    }),
    finish: choice('What is the rack made of?', {
      chrome: 'Bright chrome tube, standard shop fitting.',
      white: 'White enamelled tube, chipped at the joints.',
      black: 'Matt black tube, boutique or stockroom.',
      brass: 'Warm brass-coloured tube, an old department store fixture.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    const railY = { coats: 1.42, hawaiian: 1.32, prom: 1.62, uniforms: 1.6, children: 0.98, mixed: 1.6 }[a.stock];
    const R = a.stock === 'children' ? 0.42 : 0.5;
    const metal = s.material({ chrome: '#d9dee2', white: '#ecebe4', black: '#26272a', brass: '#b89146' }[a.finish], {
      metalness: a.finish === 'white' || a.finish === 'black' ? 0.2 : 0.9,
      roughness: mix(a.finish === 'chrome' ? 0.18 : 0.38, 0.7, mood.wear),
    });
    const rubber = s.material('#1b1b1d', { roughness: 0.9 });

    // Frame: crossed base on casters, centre pole, spokes and the hanging ring.
    for (const turn of [Math.PI / 4, -Math.PI / 4]) {
      const leg = s.box([R * 2.1, 0.035, 0.05], [0, 0.085, 0], metal);
      leg.rotation.y = turn;
      for (const side of [-1, 1]) {
        const x = Math.cos(turn) * R * 1.02 * side, z = -Math.sin(turn) * R * 1.02 * side;
        s.cylinder(0.012, 0.012, 0.04, [x, 0.06, z], metal, 8);
        s.cylinder(0.035, 0.035, 0.03, [x, 0.035, z], rubber, 12).rotation.z = Math.PI / 2;
      }
    }
    const poleTop = railY + (a.sign === 'none' ? 0.06 : 0.3);
    s.cylinder(0.022, 0.022, poleTop - 0.08, [0, (poleTop + 0.08) / 2, 0], metal, 12);
    s.cylinder(0.03, 0.03, 0.12, [0, railY * 0.55, 0], metal, 12);
    s.ball([0.028, 0.02, 0.028], [0, poleTop, 0], metal, 10);
    const ring = s.ring(R, 0.014, [0, railY, 0], metal);
    ring.rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const t = i * Math.PI / 2 + Math.PI / 4;
      s.rod([0, railY - 0.02, 0], [Math.sin(t) * R, railY, Math.cos(t) * R], 0.01, metal);
    }

    // Round topper sign, readable from both sides.
    if (a.sign !== 'none') {
      const text = { size: 'M', price: 'ALL $3', half: '50% OFF', fresh: 'NEW IN', last: 'LAST CHANCE' }[a.sign];
      const ground = a.sign === 'size' ? '#f4f1e8' : a.sign === 'fresh' ? '#2d8a57' : mood.cheer > 0.45 ? '#e23b2e' : '#c7a528';
      const ink = a.sign === 'size' ? '#1c2f66' : '#fffbe8';
      const face = new THREE.MeshStandardMaterial({ roughness: 0.7, map: paint(256, 256, (ctx) => {
        ctx.fillStyle = ground; ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = ink; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const words = text.split(' ');
        if (a.sign === 'size') { ctx.font = 'bold 150px sans-serif'; ctx.fillText(text, 128, 138); ctx.font = 'bold 26px sans-serif'; ctx.fillText('SIZE', 128, 46); }
        else words.forEach((word, i) => { ctx.font = `bold ${words.length > 1 ? 62 : 70}px sans-serif`; ctx.fillText(word, 128, 128 + (i - (words.length - 1) / 2) * 66, 190); });
      }) });
      const disc = s.cylinder(0.2, 0.2, 0.012, [0, railY + 0.34, 0], [s.material('#e9e6dc'), face, face] as unknown as THREE.Material, 40);
      disc.rotation.x = Math.PI / 2;
      disc.rotation.z = (random() - 0.5) * mood.wear * 0.5;
    }

    // Garments and hangers around the ring.
    const sway = new THREE.Group();
    s.root.add(sway);
    const kinds: readonly CutName[] = { coats: ['coat'], hawaiian: ['shirt'], prom: ['gown'], uniforms: ['coverall'], children: ['dungaree', 'tee'], mixed: ['coat', 'shirt', 'gown', 'coverall', 'shirt'] }[a.stock] as readonly CutName[];
    const palette = a.stock === 'mixed' ? [...PALETTES.coats, ...PALETTES.hawaiian, ...PALETTES.prom] : PALETTES[a.stock];
    const uniformColour = new THREE.Color(pick(PALETTES.uniforms));
    const fill = clamp01(mix(0.1, 0.92, a.fullness) + (mood.density - 0.5) * 0.25);
    const saturation = mix(0.55, 1.08, mood.cheer) * mix(1, 0.75, mood.wear);
    const gapWidth = a.happened === 'rummaged' ? mix(0.75, 1.15, random()) : 0;
    const gapAt = (random() - 0.5) * 0.6;

    interface Hung { cut: CutName; matrix: THREE.Matrix4; colour: THREE.Color; }
    const hung: Hung[] = [];
    const hangers: THREE.Matrix4[] = [];
    const spacingOf = (cut: CutName) => CUTS[cut].depth * 1.12 + 0.012;
    const hsl = { h: 0, s: 0, l: 0 };
    let theta = random() * 0.2;
    let slipBudget = a.happened === 'slipping' ? 3 + Math.floor(random() * 4) : 0;
    while (theta < Math.PI * 2 - 0.04) {
      const cut = pick(kinds);
      const step = spacingOf(cut) / R * mix(1.9, 1, fill);
      const signed = Math.atan2(Math.sin(theta - gapAt), Math.cos(theta - gapAt));
      const inGap = Math.abs(signed) < gapWidth / 2;
      const present = !inGap && random() < mix(0.12, 1, fill);
      const lean = (random() - 0.5) * 0.16 + (gapWidth && Math.abs(signed) < gapWidth / 2 + 0.5 ? Math.sign(signed) * 0.22 : 0);
      const yaw = theta - Math.PI / 2 + lean;
      const at = new THREE.Vector3(Math.sin(theta) * R, railY, Math.cos(theta) * R);
      if (present || random() < (inGap ? 0.3 : 0.5)) {
        const tilt = present ? 0 : (random() - 0.5) * 0.5;
        hangers.push(new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, tilt, 'YXZ')), new THREE.Vector3(1, 1, 1)));
      }
      if (present) {
        const colour = new THREE.Color(a.stock === 'uniforms' ? uniformColour : pick(palette));
        colour.getHSL(hsl);
        const turn = theta / (Math.PI * 2);
        if (a.stock === 'uniforms') colour.offsetHSL(0, 0, (random() - 0.5) * 0.07);
        else if (a.order === 'rainbow') colour.setHSL(turn, Math.max(0.4, hsl.s), mix(0.34, 0.6, hsl.l));
        else if (a.order === 'tonal') colour.setHSL(hsl.h, hsl.s * 0.8, mix(0.12, 0.82, turn));
        colour.getHSL(hsl);
        colour.setHSL(hsl.h, clamp01(hsl.s * saturation), hsl.l);
        const slipped = slipBudget > 0 && random() < 0.16;
        if (slipped) slipBudget--;
        const roll = slipped ? (random() < 0.5 ? -1 : 1) * mix(0.22, 0.42, random()) : (random() - 0.5) * 0.06;
        const drop = slipped ? -0.2 - random() * 0.12 : -0.045 - random() * 0.015;
        const size = mix(0.9, 1.08, random());
        hung.push({ cut, colour, matrix: new THREE.Matrix4().compose(
          at.clone().add(new THREE.Vector3(0, drop, 0)),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, roll, 'YXZ')),
          new THREE.Vector3(size, size * mix(0.88, 1.06, random()), 1),
        ) });
      }
      theta += step * mix(0.85, 1.2, random());
    }

    // A garment thrown over the top of the rail.
    if (a.happened === 'draped') {
      const t = (random() - 0.5) * 1.4, wide = a.stock === 'children' ? 0.3 : 0.48, long = a.stock === 'children' ? 0.6 : 1.05;
      const cloth = new THREE.PlaneGeometry(wide, long, 4, 24);
      const spot = cloth.attributes.position;
      const inside = long * mix(0.25, 0.4, random());
      for (let i = 0; i < spot.count; i++) {
        // Bend the strip over the rail: a short tail inside the ring, a crest, a long fall outside.
        const along = spot.getY(i) + long / 2 - inside, across = spot.getX(i);
        const bend = 0.05, fall = Math.abs(along) - bend;
        const out = Math.abs(along) < bend ? Math.sin(along / bend * Math.PI / 2) * bend * 0.7 : Math.sign(along) * (bend * 0.7 + fall * 0.16);
        const y = Math.abs(along) < bend ? Math.cos(along / bend * Math.PI / 2) * 0.03 : -fall * 0.97;
        spot.setXYZ(i, across * (1 + Math.max(0, fall) * 0.25), y + Math.sin(across * 19) * 0.012, out + Math.sin(across * 23 + along * 9) * 0.02);
      }
      cloth.computeVertexNormals();
      const thrown = new THREE.Mesh(cloth, new THREE.MeshStandardMaterial({ color: new THREE.Color(pick(palette)).offsetHSL(0, 0, 0.06), roughness: 0.9, side: THREE.DoubleSide }));
      thrown.position.set(Math.sin(t) * R, railY + 0.035, Math.cos(t) * R);
      thrown.rotation.y = t;
      thrown.castShadow = thrown.receiveShadow = true;
      sway.add(thrown);
    }

    // Fallen clothes and hangers on the floor.
    const lumps: { matrix: THREE.Matrix4; colour: THREE.Color }[] = [];
    if (a.pile) {
      const centre = (random() - 0.5) * 1.2;
      const count = 6 + Math.floor(random() * 4 + mood.density * 5);
      for (let i = 0; i < count; i++) {
        const t = centre + (random() - 0.5) * 0.7, r = R + 0.1 + random() * 0.26;
        const size = new THREE.Vector3(mix(0.17, 0.3, random()), mix(0.035, 0.07, random()), mix(0.13, 0.22, random()));
        lumps.push({ colour: new THREE.Color(a.stock === 'uniforms' ? uniformColour : pick(palette)), matrix: new THREE.Matrix4().compose(
          new THREE.Vector3(Math.sin(t) * r, size.y * 0.7 + (i > 4 ? 0.07 : 0) + (i > 8 ? 0.06 : 0), Math.cos(t) * r),
          new THREE.Quaternion().setFromEuler(new THREE.Euler((random() - 0.5) * 0.5, random() * 6.3, (random() - 0.5) * 0.5)), size) });
      }
      const flat = pick(kinds);
      const t = centre + 0.35, r = R + 0.3;
      hung.push({ cut: flat, colour: new THREE.Color(pick(palette)), matrix: new THREE.Matrix4().compose(
        new THREE.Vector3(Math.sin(t) * r, 0.03, Math.cos(t) * r + CUTS[flat].outline.at(-1)![1] * -0.3),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.04, 0, random() * 6.3, 'YXZ')), new THREE.Vector3(1, 1, 1)) });
      for (let i = 0; i < 3; i++) {
        const u = centre - 0.5 + random() * 0.6, v = R + 0.2 + random() * 0.35;
        hangers.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.sin(u) * v, 0.012, Math.cos(u) * v),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, random() * 6.3, 'YXZ')), new THREE.Vector3(1, 1, 1)));
      }
    }

    const print = paint(128, 128, (ctx) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 26; i++) {
        const x = random() * 128, y = random() * 128, r = 6 + random() * 9;
        ctx.fillStyle = ['#ffffff', '#3f3f3f', '#8c8c8c', '#d9d9d9'][i % 4];
        for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.ellipse(x + Math.cos(p * 1.257) * r, y + Math.sin(p * 1.257) * r, r * 0.75, r * 0.4, p * 1.257, 0, Math.PI * 2); ctx.fill(); }
      }
    });
    print.wrapS = print.wrapT = THREE.RepeatWrapping;
    print.repeat.set(5, 5);
    for (const cut of Object.keys(CUTS) as CutName[]) {
      const group = hung.filter((item) => item.cut === cut);
      if (!group.length) continue;
      const shiny = cut === 'gown';
      const material = new THREE.MeshStandardMaterial({ roughness: shiny ? 0.32 : 0.88, metalness: shiny ? 0.15 : 0, map: cut === 'shirt' && a.stock !== 'uniforms' ? print : null });
      const mesh = new THREE.InstancedMesh(cutGeometry(CUTS[cut]), material, group.length);
      group.forEach((item, index) => { mesh.setMatrixAt(index, item.matrix); mesh.setColorAt(index, item.colour); });
      mesh.castShadow = mesh.receiveShadow = true;
      sway.add(mesh);
    }
    if (!hung.some((item) => item.cut === 'shirt')) print.dispose();
    if (hangers.length) {
      const span = a.stock === 'children' ? 0.13 : 0.2;
      const wire = new THREE.InstancedMesh(hangerGeometry(span), s.material(mood.wear > 0.6 ? '#8e8f8c' : '#f2f2ee', { metalness: 0.4, roughness: 0.4 }), hangers.length);
      hangers.forEach((matrix, index) => wire.setMatrixAt(index, matrix));
      wire.castShadow = true;
      sway.add(wire);
    }
    if (lumps.length) {
      const heap = new THREE.InstancedMesh(crumple(random), new THREE.MeshStandardMaterial({ roughness: 0.95 }), lumps.length);
      lumps.forEach((lump, index) => { heap.setMatrixAt(index, lump.matrix); heap.setColorAt(index, lump.colour); });
      heap.castShadow = heap.receiveShadow = true;
      s.root.add(heap);
    }
    // Plastic size dividers clipped on the rail.
    const dividers = a.stock === 'children' ? 3 : 4;
    for (let i = 0; i < dividers; i++) {
      const t = (i + 0.5) / dividers * Math.PI * 2 + 0.3;
      const tab = s.cylinder(0.05, 0.05, 0.006, [Math.sin(t) * R, railY, Math.cos(t) * R], s.material(['#f3f0e6', '#f0c330', '#3d7edb', '#e2553f'][i % 4]), 16);
      tab.rotation.set(Math.PI / 2, 0, -t, 'YXZ');
      tab.rotation.y = t + Math.PI / 2; tab.rotation.z = 0;
    }

    const amount = mix(0.004, 0.035, mood.energy);
    return s.finish({ update: (_dt, time) => { sway.rotation.y = Math.sin(time * mix(0.4, 1.6, mood.energy)) * amount; } });
  },
});
