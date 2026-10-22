import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = readonly [number, number, number];
type Part = readonly [size: P3, at: P3, shade: number];

// Seated plush animals, about 0.33 m tall, built from soft blobs. Shade multiplies the toy's own colour.
const BASE: readonly Part[] = [
  [[0.09, 0.1, 0.08], [0, 0.1, 0], 0.85],
  [[0.076, 0.07, 0.07], [0, 0.245, 0.01], 0.9],
  [[0.011, 0.011, 0.008], [0.028, 0.26, 0.068], 0.04], [[0.011, 0.011, 0.008], [-0.028, 0.26, 0.068], 0.04],
  [[0.034, 0.062, 0.034], [0.1, 0.13, 0.03], 0.8], [[0.034, 0.062, 0.034], [-0.1, 0.13, 0.03], 0.8],
  [[0.04, 0.04, 0.07], [0.055, 0.035, 0.075], 0.8], [[0.04, 0.04, 0.07], [-0.055, 0.035, 0.075], 0.8],
  [[0.025, 0.025, 0.01], [0.055, 0.04, 0.142], 1.25], [[0.025, 0.025, 0.01], [-0.055, 0.04, 0.142], 1.25],
];
const KINDS = {
  bear: [...BASE,
    [[0.03, 0.03, 0.016], [0.058, 0.305, 0], 0.8], [[0.03, 0.03, 0.016], [-0.058, 0.305, 0], 0.8],
    [[0.036, 0.028, 0.03], [0, 0.228, 0.068], 1.25], [[0.013, 0.01, 0.01], [0, 0.238, 0.097], 0.05], [[0.05, 0.06, 0.02], [0, 0.1, 0.068], 1.2]],
  rabbit: [...BASE,
    [[0.022, 0.09, 0.013], [0.032, 0.37, -0.005], 0.9], [[0.022, 0.09, 0.013], [-0.036, 0.36, -0.005], 0.9],
    [[0.012, 0.06, 0.006], [0.032, 0.37, 0.006], 1.3], [[0.012, 0.06, 0.006], [-0.036, 0.36, 0.006], 1.3],
    [[0.028, 0.022, 0.022], [0, 0.23, 0.066], 1.3], [[0.009, 0.008, 0.008], [0, 0.24, 0.086], 0.5], [[0.03, 0.03, 0.03], [0, 0.06, -0.085], 1.35]],
  dog: [...BASE,
    [[0.022, 0.065, 0.034], [0.08, 0.225, 0.005], 0.5], [[0.022, 0.065, 0.034], [-0.08, 0.225, 0.005], 0.5],
    [[0.036, 0.03, 0.05], [0, 0.225, 0.08], 1.2], [[0.015, 0.012, 0.012], [0, 0.238, 0.128], 0.05], [[0.045, 0.04, 0.03], [0.03, 0.27, 0.05], 0.5]],
  prize: [
    [[0.07, 0.11, 0.06], [0, 0.11, 0], 0.9], [[0.1, 0.062, 0.07], [0, 0.25, 0.01], 0.95],
    [[0.034, 0.034, 0.034], [0.045, 0.31, 0.03], 1.6], [[0.034, 0.034, 0.034], [-0.045, 0.31, 0.03], 1.6],
    [[0.014, 0.014, 0.01], [0.045, 0.312, 0.06], 0.03], [[0.014, 0.014, 0.01], [-0.045, 0.312, 0.06], 0.03],
    [[0.06, 0.012, 0.02], [0, 0.228, 0.07], 0.25],
    [[0.02, 0.12, 0.02], [0.095, 0.1, 0.02], 0.75], [[0.02, 0.12, 0.02], [-0.095, 0.1, 0.02], 0.75],
    [[0.03, 0.03, 0.03], [0.1, -0.01, 0.03], 1.3], [[0.03, 0.03, 0.03], [-0.1, -0.01, 0.03], 1.3],
    [[0.024, 0.024, 0.12], [0.045, 0.03, 0.1], 0.75], [[0.024, 0.024, 0.12], [-0.045, 0.03, 0.1], 0.75],
    [[0.035, 0.03, 0.03], [0.045, 0.03, 0.21], 1.3], [[0.035, 0.03, 0.03], [-0.045, 0.03, 0.21], 1.3]],
} as const satisfies Record<string, readonly Part[]>;
type Kind = keyof typeof KINDS;

function plush(parts: readonly Part[]) {
  const blobs = parts.map(([size, at, shade]) => {
    const blob = new THREE.SphereGeometry(1, 9, 6);
    blob.scale(...size); blob.translate(at[0], at[1] - 0.16, at[2]);
    const tint = new Float32Array(blob.attributes.position.count * 3).fill(shade);
    blob.setAttribute('color', new THREE.BufferAttribute(tint, 3));
    return blob;
  });
  const merged = mergeGeometries(blobs)!;
  for (const blob of blobs) blob.dispose();
  return merged;
}

const PALETTES = {
  natural: ['#8a5a33', '#b98b56', '#d9c19a', '#5c3b22', '#efe6d2', '#a37246', '#8b8680', '#c4783c'],
  pastel: ['#f6b0cb', '#a9d6f2', '#fff0a0', '#bfe8b8', '#dcbef0', '#ffffff', '#ffd2b0'],
  neon: ['#ff3fa4', '#35e85f', '#ffe600', '#00c8f5', '#ff7a1a', '#a64dff', '#ff2d2d'],
  faded: ['#b9b2a6', '#a39a8c', '#c9c1b3', '#8f8a80', '#d6cfc2', '#a9a08e', '#9aa3a8'],
} as const;

export default defineThing({
  questions: {
    kind: choice('What kind of toy dominates the heap?', {
      bears: 'Teddy bears, round-eared and button-eyed.',
      rabbits: 'Long-eared rabbits, Easter leftovers.',
      dogs: 'Floppy-eared puppies with patches over one eye.',
      prizes: 'Gangly fairground prizes with bulging eyes and dangling limbs, won and then unwanted.',
      mixed: 'A jumble of every species.',
    }),
    colours: choice('What colours are the toys?', {
      natural: 'Honey, chocolate and oatmeal browns, classic and well loved.',
      pastel: 'Nursery pastels: pink, powder blue, lemon.',
      neon: 'Garish synthetic neons from a claw machine.',
      faded: 'Washed-out greys and beiges, colour loved out of them.',
    }),
    fill: score('How full is the bin?', ['A few toys left at the bottom', 'Half full', 'Full to the rim', 'Heaped high above the rim and toppling']),
    giant: noul('Is one enormous toy slumped on top of the heap?'),
    loner: noul('Is a single toy sitting apart on the floor, facing outward, as if waiting?'),
    spill: noul('Have some toys tumbled out onto the floor around the bin?'),
    sign: choice('What does the price sign say, if there is one?', {
      none: 'No sign.',
      each: '50¢ EACH',
      three: '3 FOR $1',
      fill: 'FILL A BAG $2',
      free: 'FREE TO A GOOD HOME',
      washed: 'ALL TOYS WASHED',
    }),
    cage: choice('What kind of bin is it?', {
      tall: 'A tall narrow chrome roll cage on casters.',
      dump: 'A low, wide dump bin in painted wire, easy for children to reach into.',
      pallet: 'A big square industrial pallet cage in heavy galvanised mesh.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const [w, d, h, floor, gauge] = { tall: [0.72, 0.58, 0.95, 0.13, 0.0045], dump: [1.2, 0.75, 0.5, 0.2, 0.005], pallet: [1.05, 0.85, 0.78, 0.1, 0.007] }[a.cage];
    const top = floor + h;
    const wireColour = a.cage === 'dump' ? (mood.cheer > 0.5 ? '#d8342c' : '#2f5fb3') : a.cage === 'tall' ? '#d5dadd' : '#9aa0a0';
    const wire = s.material(new THREE.Color(wireColour).lerp(new THREE.Color('#7a4a2a'), mood.wear * 0.4), { metalness: a.cage === 'dump' ? 0.2 : 0.8, roughness: mix(0.3, 0.75, mood.wear) });

    // Cage: one merged mesh of thin bars.
    const bars: THREE.BufferGeometry[] = [];
    const bar = (from: P3, to: P3, r = gauge) => {
      const size: [number, number, number] = [Math.abs(to[0] - from[0]) + r * 2, Math.abs(to[1] - from[1]) + r * 2, Math.abs(to[2] - from[2]) + r * 2];
      const g = new THREE.BoxGeometry(...size);
      g.translate((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2);
      bars.push(g);
    };
    const stepX = a.cage === 'pallet' ? 0.105 : 0.08, rows = Math.max(3, Math.round(h / (a.cage === 'pallet' ? 0.11 : 0.19)));
    for (let i = 0; i <= Math.round(w / stepX); i++) { const x = -w / 2 + i * w / Math.round(w / stepX); for (const z of [-d / 2, d / 2]) bar([x, floor, z], [x, top, z]); bar([x, floor, -d / 2], [x, floor, d / 2]); }
    for (let i = 1; i < Math.round(d / stepX); i++) { const z = -d / 2 + i * d / Math.round(d / stepX); for (const x of [-w / 2, w / 2]) bar([x, floor, z], [x, top, z]); if (i % 2 === 0) bar([-w / 2, floor, z], [w / 2, floor, z]); }
    for (let j = 0; j <= rows; j++) { const y = floor + j * h / rows, r = j === 0 || j === rows ? gauge * 2.2 : gauge; for (const z of [-d / 2, d / 2]) bar([-w / 2, y, z], [w / 2, y, z], r); for (const x of [-w / 2, w / 2]) bar([x, y, -d / 2], [x, y, d / 2], r); }
    for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) {
      bar([x, a.cage === 'pallet' ? 0 : floor - 0.03, z], [x, top, z], gauge * 2.4);
      if (a.cage === 'pallet') s.box([0.09, 0.012, 0.09], [x * 0.98, 0.006, z * 0.98], wire);
      else { const wheel = s.cylinder(0.04, 0.04, 0.028, [x * 0.94, 0.04, z * 0.94], s.material('#232326'), 14); wheel.rotation.z = Math.PI / 2; wheel.rotation.y = random() * 3; s.box([0.035, 0.06, 0.035], [x * 0.94, floor - 0.05, z * 0.94], wire); }
    }
    const cage = s.mesh(mergeGeometries(bars)!, wire);
    for (const g of bars) g.dispose();
    if (mood.wear > 0.5) cage.rotation.z = (random() - 0.5) * 0.02;

    // The toys.
    const kinds: readonly Kind[] = { bears: ['bear'], rabbits: ['rabbit'], dogs: ['dog'], prizes: ['prize'], mixed: ['bear', 'rabbit', 'dog', 'prize'] }[a.kind] as readonly Kind[];
    const palette = PALETTES[a.colours];
    const grime = new THREE.Color('#8c8474');
    const colour = () => {
      const c = new THREE.Color(pick(palette)), k = { h: 0, s: 0, l: 0 };
      c.getHSL(k); c.setHSL(k.h + (random() - 0.5) * 0.03, clamp01(k.s * mix(0.7, 1.1, mood.cheer)), k.l * mix(0.9, 1.05, random()));
      return c.lerp(grime, mood.wear * 0.35);
    };
    interface Toy { kind: Kind; matrix: THREE.Matrix4; colour: THREE.Color; }
    const toys: Toy[] = [];
    const add = (at: THREE.Vector3, turn: THREE.Euler, size: number, kind = pick(kinds)) =>
      toys.push({ kind, colour: colour(), matrix: new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromEuler(turn), new THREE.Vector3(size, size, size)) });
    const tumble = () => new THREE.Euler((random() - 0.5) * 2.6 - 0.7, random() * 6.3, (random() - 0.5) * 2.2);

    const fill = clamp01(a.fill * 0.85 + mood.density * 0.2);
    const heapTop = mix(floor + 0.14, top + 0.3, fill);
    const volume = w * d * Math.max(0.12, heapTop - floor);
    const count = Math.round(Math.min(64, Math.max(4, volume * 105)));
    let peak = new THREE.Vector3(0, floor + 0.15, 0);
    for (let i = 0; i < count; i++) {
      const u = random() * 2 - 1, v = random() * 2 - 1;
      const dome = heapTop - (u * u + v * v) * 0.5 * Math.max(0, heapTop - top + 0.12);
      const y = mix(floor + 0.1, Math.max(floor + 0.1, dome - 0.12), Math.sqrt(random()));
      const inset = y > top - 0.1 ? 0.2 : 0.12;
      const at = new THREE.Vector3(u * (w / 2 - inset), y, v * (d / 2 - inset));
      if (at.y > peak.y && Math.abs(u) < 0.5 && Math.abs(v) < 0.5) peak = at.clone();
      add(at, tumble(), mix(0.75, 1.15, random()));
    }
    if (a.giant) {
      const size = a.cage === 'tall' ? 2.1 : 2.6;
      add(new THREE.Vector3((random() - 0.5) * 0.1, Math.max(peak.y, floor + 0.2) + 0.16 * size * 0.72, -0.03), new THREE.Euler(mix(0.1, 0.45, random()), (random() - 0.5) * 0.7, (random() - 0.5) * 0.35, 'YXZ'), size);
    }
    if (a.spill) {
      const fallen = 3 + Math.floor(random() * 3 + mood.density * 3);
      for (let i = 0; i < fallen; i++) {
        const t = random() * Math.PI * 2, size = mix(0.8, 1.1, random());
        const at = new THREE.Vector3(Math.cos(t) * (w / 2 + 0.16 + random() * 0.22), 0.085 * size, Math.sin(t) * (d / 2 + 0.16 + random() * 0.22));
        if (a.loner && at.z > d / 2 && Math.abs(at.x) < 0.3) at.x += 0.45;
        add(at, new THREE.Euler(random() < 0.5 ? -Math.PI / 2 : Math.PI / 2, random() * 6.3, 0, 'YXZ'), size);
      }
    }
    if (a.loner) add(new THREE.Vector3((random() - 0.5) * 0.25, 0.16, d / 2 + 0.36), new THREE.Euler(-0.06, (random() - 0.5) * 0.3, (random() - 0.5) * 0.12, 'YXZ'), 1.05);

    const fur = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 });
    let used = false;
    for (const kind of Object.keys(KINDS) as Kind[]) {
      const group = toys.filter((toy) => toy.kind === kind);
      if (!group.length) continue;
      const mesh = new THREE.InstancedMesh(plush(KINDS[kind]), fur, group.length);
      group.forEach((toy, index) => { mesh.setMatrixAt(index, toy.matrix); mesh.setColorAt(index, toy.colour); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      used = true;
    }
    if (!used) fur.dispose();

    // Hand-lettered price card on a clip-on pole.
    if (a.sign !== 'none') {
      const lines = { each: ['50¢', 'EACH'], three: ['3 FOR', '$1'], fill: ['FILL A BAG', '$2'], free: ['FREE TO A', 'GOOD HOME'], washed: ['ALL TOYS', 'WASHED'] }[a.sign];
      const sunny = mood.cheer > 0.4;
      const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = a.sign === 'free' ? '#f4efe2' : sunny ? '#ffd829' : '#f1e3b8'; ctx.fillRect(0, 0, 384, 256);
      ctx.strokeStyle = a.sign === 'free' ? '#2a3d7a' : '#c4241c'; ctx.lineWidth = 12; ctx.strokeRect(10, 10, 364, 236);
      ctx.fillStyle = ctx.strokeStyle; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lines.forEach((line, i) => { ctx.font = `bold ${line.length > 6 ? 62 : 104}px sans-serif`; ctx.fillText(line, 192, 82 + i * 100, 330); });
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const side = random() < 0.5 ? -1 : 1, x = side * (w / 2 - 0.16), y = top + (a.giant ? 0.75 : 0.45);
      s.rod([side * w / 2, top - 0.2, -d / 2], [x, y - 0.1, -d / 2], 0.008, wire);
      const card = s.mesh(new THREE.PlaneGeometry(0.36, 0.24), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, side: THREE.DoubleSide }), [x, y, -d / 2 + 0.012]);
      card.rotation.z = (random() - 0.5) * mix(0.05, 0.3, mood.wear);
    }
    return s.finish();
  },
});
