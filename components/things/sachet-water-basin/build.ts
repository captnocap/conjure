import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];

/** A panelled market parasol with a scalloped valance. Returns a group pivoting at the pole top. */
function parasol(s: Sculpture, radius: number, rise: number, colours: readonly string[], missing: (panel: number) => boolean, fade: number) {
  const group = new THREE.Group();
  const positions: number[] = [], tints: number[] = [];
  const panels = 8, drop = 0.12;
  const pale = new THREE.Color('#ddd6c4');
  for (let i = 0; i < panels; i++) {
    if (missing(i)) continue;
    const a0 = (i / panels) * Math.PI * 2, a1 = ((i + 1) / panels) * Math.PI * 2;
    const p0 = [Math.cos(a0) * radius, 0, Math.sin(a0) * radius], p1 = [Math.cos(a1) * radius, 0, Math.sin(a1) * radius];
    const colour = new THREE.Color(colours[i % colours.length]).lerp(pale, fade);
    const push = (...points: number[][]) => points.forEach((point) => { positions.push(...point); tints.push(colour.r, colour.g, colour.b); });
    push([0, rise, 0], p1, p0);
    push(p0, p1, [p1[0], -drop, p1[2]]);
    push(p0, [p1[0], -drop, p1[2]], [p0[0], -drop, p0[2]]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(tints, 3));
  geometry.computeVertexNormals();
  const cloth = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }));
  cloth.castShadow = cloth.receiveShadow = true;
  group.add(cloth);
  const metal = s.material('#b9b6ac', { metalness: 0.5 });
  for (let i = 0; i < panels; i++) {
    const t = (i / panels) * Math.PI * 2;
    group.add(s.rod([0, rise - 0.01, 0], [Math.cos(t) * radius, -0.005, Math.sin(t) * radius], 0.008, metal));
    group.add(s.rod([0, rise - 0.45, 0], [Math.cos(t) * radius * 0.5, rise * 0.48, Math.sin(t) * radius * 0.5], 0.006, metal));
  }
  group.add(s.cylinder(0.03, 0.03, 0.06, [0, rise + 0.02, 0], metal, 8));
  return group;
}

export default defineThing({
  questions: {
    sold: choice('What is being sold from the basin?', {
      sachets: 'Only pure-water sachets, a slithering heap of clear pillows.',
      mixed: 'Sachets with a few soft-drink bottles standing among them.',
      bottles: 'Bottled water and fizzy drinks standing upright, caps in every colour.',
      zobo: 'Home-made zobo and kunu in reused bottles: deep hibiscus red and milky white.',
    }),
    left: score('How much is left?', ['Two or three at the bottom', 'A thin layer', 'Half a basin', 'Heaped over the rim, restock bags waiting beside']),
    ice: choice('What state is the ice in?', {
      fresh: 'Fresh blocks, white and sharp, just chipped off the big bar.',
      slush: 'Half melted: slivers floating in cold water.',
      melted: 'All gone: the drinks sit in lukewarm water.',
      dry: 'There never was any; a dry basin.',
    }),
    basin: choice('What is the basin like?', {
      enamel: 'White enamel with a blue rim, chipped black where it has been dropped.',
      flowers: 'Cream enamel painted with red flowers.',
      plastic: 'A bright plastic wash basin.',
      aluminium: 'A dented aluminium basin, dull silver.',
    }),
    takings: choice("What do the day's takings look like?", {
      none: 'Nothing yet.',
      coins: 'A small pile of coins on the corner of the stool.',
      notes: 'Soft folded notes pinned under a stone beside a few coins.',
      tin: 'A milk tin so full of coins the lid sits beside it.',
    }),
    minder: choice('Who is minding the stall?', {
      child: 'A child in school uniform on a tiny stool, holding a sachet out to the road.',
      asleep: 'A child asleep on the tiny stool, head on folded arms on their knees.',
      homework: 'Nobody for the moment: an open exercise book and a pencil left on the small stool.',
      nobody: 'Nobody at all, only a pair of slippers.',
    }),
    shade: choice('What is the parasol like?', {
      red: 'Red and white panels, sun-bleached to pink.',
      blue: 'Faded blue with one patched panel.',
      yellow: 'A yellow give-away from a phone company, still fairly bright.',
      green: 'Green and white, a brewery hand-me-down.',
      torn: 'Torn: panels missing, ribs showing, a nylon bag tied over one gap.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const wood = s.material('#8a6a44'), dark = s.material('#2a2a2c');

    // Low stool.
    s.box([0.5, 0.04, 0.44], [0, 0.36, 0], wood);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([x * 0.2, 0.36, z * 0.17], [x * 0.25, 0, z * 0.21], 0.022, wood);
    for (const z of [-1, 1]) s.rod([-0.23, 0.14, z * 0.19], [0.23, 0.14, z * 0.19], 0.014, wood);

    // Basin.
    const basinColour = { enamel: '#f1f0e8', flowers: '#efe6cc', plastic: pick(['#d8342c', '#2a62c8', '#2ca05a', '#e87a20']), aluminium: '#aeb2b2' }[a.basin];
    const basinMat = s.material(basinColour, { side: THREE.DoubleSide, roughness: a.basin === 'aluminium' ? 0.4 : 0.35, metalness: a.basin === 'aluminium' ? 0.7 : 0.05 });
    const base = 0.38;
    s.lathe([[0, 0], [0.25, 0], [0.42, 0.2], [0.455, 0.2], [0.455, 0.215], [0.41, 0.215], [0.245, 0.025], [0, 0.025]], basinMat, [0, base, 0]);
    if (a.basin === 'enamel' || a.basin === 'flowers') s.ring(0.455, 0.012, [0, base + 0.21, 0], s.material(a.basin === 'enamel' ? '#1f3f9a' : '#b3261e')).rotation.x = Math.PI / 2;
    if (a.basin === 'flowers') for (let i = 0; i < 9; i++) {
      const t = (i / 9) * Math.PI * 2 + random() * 0.3, r = 0.345;
      const bloom = s.ball([0.045, 0.045, 0.012], [Math.cos(t) * r, base + 0.11, Math.sin(t) * r], s.material(i % 3 ? '#c8322a' : '#2c8a56'), 8);
      bloom.lookAt(0, base + 0.5, 0);
    }
    const chips = Math.round(mood.wear * 7);
    if (a.basin !== 'plastic') for (let i = 0; i < chips; i++) {
      const t = random() * Math.PI * 2, h = random();
      const chip = s.ball([0.02 + random() * 0.025, 0.02 + random() * 0.02, 0.008], [Math.cos(t) * mix(0.27, 0.44, h), base + mix(0.03, 0.19, h), Math.sin(t) * mix(0.27, 0.44, h)], dark, 6);
      chip.lookAt(0, base + 0.6, 0);
    }

    // Water or ice.
    const fill = mix(0.08, 1, a.left);
    const level = a.ice === 'dry' ? 0 : a.ice === 'fresh' ? 0.03 : mix(0.06, 0.14, random());
    if (level > 0) {
      const r = 0.25 + (level / 0.2) * 0.165;
      s.cylinder(r, r, 0.006, [0, base + 0.025 + level, 0], s.material(a.ice === 'melted' ? '#9fb4b0' : '#bcd9e6', { roughness: 0.08, metalness: 0.1 }), 24);
    }
    const cubes = a.ice === 'fresh' ? 9 + Math.floor(random() * 5) : a.ice === 'slush' ? 4 : 0;
    const iceMat = s.material('#eaf6fb', { roughness: 0.15, emissive: '#bfe6f5', emissiveIntensity: 0.2 });

    // Stock.
    const heap = fill * 0.2;
    const surface = (r: number) => base + 0.035 + Math.max(level, heap * (1.25 - r / 0.36));
    const sachetCount = a.sold === 'sachets' ? Math.round(4 + fill * 70) : a.sold === 'mixed' ? Math.round(3 + fill * 38) : 0;
    if (sachetCount) {
      const sachets = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.18, emissive: '#cfe6f0', emissiveIntensity: 0.18 }), sachetCount);
      const dummy = new THREE.Object3D();
      const tones = ['#e9f3f6', '#d6e8f0', '#f6fafa', '#c4dcec'];
      for (let i = 0; i < sachetCount; i++) {
        const t = random() * Math.PI * 2, r = Math.sqrt(random()) * Math.min(0.38, 0.24 + fill * 0.16);
        dummy.position.set(Math.cos(t) * r, mix(base + 0.05, surface(r), 0.35 + random() * 0.65), Math.sin(t) * r);
        dummy.rotation.set((random() - 0.5) * 0.9, random() * Math.PI, (random() - 0.5) * 0.9);
        dummy.scale.set(0.07, 0.022, 0.05);
        dummy.updateMatrix();
        sachets.setMatrixAt(i, dummy.matrix);
        sachets.setColorAt(i, new THREE.Color(pick(tones)));
      }
      sachets.castShadow = sachets.receiveShadow = true;
      s.root.add(sachets);
    }
    const bottleKinds = a.sold === 'zobo'
      ? [['#7a1030', '#e8e2d0'], ['#7a1030', '#2a62c8'], ['#efe9d8', '#c8322a'], ['#efe9d8', '#e8c020'], ['#8a1a3a', '#2ca05a']]
      : [['#3a1c10', '#c8322a'], ['#e8801c', '#2a62c8'], ['#3aa04a', '#3aa04a'], ['#d8ecf4', '#2a62c8'], ['#d8ecf4', '#2a62c8'], ['#5a2c14', '#e8c020'], ['#e8d020', '#c8322a']];
    const bottleCount = a.sold === 'sachets' ? 0 : a.sold === 'mixed' ? Math.round(1 + fill * 5) : Math.round(2 + fill * 17);
    for (let i = 0; i < bottleCount; i++) {
      const t = random() * Math.PI * 2, r = Math.sqrt(random()) * 0.3;
      const [liquid, cap] = pick(bottleKinds);
      const tall = a.sold === 'zobo' ? 0.2 : mix(0.2, 0.27, random());
      const group = new THREE.Group();
      group.add(s.cylinder(0.034, 0.036, tall * 0.68, [0, tall * 0.34, 0], s.material(liquid, { roughness: 0.2 }), 10));
      group.add(s.cylinder(0.014, 0.034, tall * 0.24, [0, tall * 0.8, 0], s.material(liquid, { roughness: 0.2 }), 10));
      group.add(s.cylinder(0.017, 0.017, tall * 0.08, [0, tall * 0.96, 0], s.material(cap), 8));
      const y = base + 0.02 + (r > 0.22 ? (r - 0.22) * 1.2 : 0) + (a.sold === 'mixed' ? heap * 0.5 : 0);
      group.position.set(Math.cos(t) * r, y, Math.sin(t) * r);
      group.rotation.set((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5);
      s.root.add(group);
    }
    for (let i = 0; i < cubes; i++) {
      const t = random() * Math.PI * 2, r = Math.sqrt(random()) * 0.33, size = a.ice === 'fresh' ? 0.05 + random() * 0.07 : 0.03 + random() * 0.03;
      const cube = s.box([size, size * 0.7, size * 1.2], [Math.cos(t) * r, surface(r) + (a.ice === 'fresh' ? size * 0.25 : -0.005), Math.sin(t) * r], iceMat);
      cube.rotation.set(random(), random() * 3, random());
    }
    // Restock bags when business is heaped (or the mood is crowded).
    const bags = (a.left > 0.72 ? 1 : 0) + (a.left > 0.9 ? 1 : 0) + (mood.density > 0.75 ? 1 : 0);
    for (let i = 0; i < bags; i++) {
      const bag = s.ball([0.3, 0.12, 0.22], [0.1 + i * 0.5 + (random() - 0.5) * 0.1, 0.11, -0.62 + (random() - 0.5) * 0.12], s.material('#e3eef2', { roughness: 0.25, emissive: '#cfe6f0', emissiveIntensity: 0.12 }), 12);
      bag.rotation.y = random() * 3;
      s.ball([0.05, 0.05, 0.05], [bag.position.x + 0.24, bag.position.y + 0.08, bag.position.z], s.material('#e3eef2'), 6);
    }

    // Takings.
    const coin = (at: P) => { const c = s.cylinder(0.014, 0.014, 0.004, at, s.material(random() > 0.5 ? '#c9a84a' : '#b8bcc0', { metalness: 0.8, roughness: 0.3 }), 8); c.rotation.set((random() - 0.5) * 0.4, 0, (random() - 0.5) * 0.4); };
    if (a.takings === 'coins' || a.takings === 'notes') for (let i = 0; i < (a.takings === 'coins' ? 9 : 4); i++) coin([0.2 + (random() - 0.5) * 0.06, 0.383 + (i % 4) * 0.004, 0.17 + (random() - 0.5) * 0.05]);
    if (a.takings === 'notes') {
      for (let i = 0; i < 3; i++) s.box([0.13, 0.004, 0.065], [-0.18 + i * 0.012, 0.384 + i * 0.004, 0.17], s.material(pick(['#7a9a6a', '#b08a6a', '#9a7a9a']))).rotation.y = (random() - 0.5) * 0.5;
      s.ball([0.045, 0.03, 0.04], [-0.17, 0.41, 0.17], s.material('#7d7b74'), 8);
    }
    if (a.takings === 'tin') {
      const tx = 0.52, tz = 0.3;
      s.cylinder(0.05, 0.05, 0.1, [tx, 0.05, tz], s.material('#c8322a', { metalness: 0.4, roughness: 0.4 }), 14);
      s.cylinder(0.051, 0.051, 0.03, [tx, 0.05, tz], s.material('#f1f0e8'), 14);
      s.cylinder(0.052, 0.052, 0.006, [tx + 0.12, 0.004, tz + 0.05], s.material('#b8bcc0', { metalness: 0.7 }), 14);
      for (let i = 0; i < 12; i++) coin([tx + (random() - 0.5) * (i < 7 ? 0.06 : 0.25), i < 7 ? 0.104 + i * 0.002 : 0.004, tz + (random() - 0.5) * (i < 7 ? 0.06 : 0.25)]);
    }

    // Parasol in a concrete-filled tyre.
    const px = -0.55, pz = -0.42;
    s.ring(0.2, 0.085, [px, 0.085, pz], s.material('#232326', { roughness: 0.95 })).rotation.x = Math.PI / 2;
    s.cylinder(0.2, 0.2, 0.13, [px, 0.075, pz], s.material('#a9a79c'), 16);
    const shadeColours = { red: ['#d2362c', '#f0ece0'], blue: ['#3a6ab8', '#3a6ab8', '#3a6ab8', '#c8b08a'], yellow: ['#f0c41c'], green: ['#2c8a56', '#f0ece0'], torn: [pick(['#d2362c', '#3a6ab8', '#2c8a56']), '#e6e0cc'] }[a.shade];
    const gone = a.shade === 'torn' ? [Math.floor(random() * 8), Math.floor(random() * 8), Math.floor(random() * 8)] : mood.wear > 0.8 ? [Math.floor(random() * 8)] : [];
    const fade = a.shade === 'yellow' ? mood.wear * 0.4 : mix(0.08, 0.5, mood.wear) - mood.cheer * 0.08;
    const top = parasol(s, 1.05, 0.34, shadeColours, (panel) => gone.includes(panel), Math.max(0, fade));
    const lean = new THREE.Group();
    lean.position.set(px, 0.1, pz);
    lean.rotation.set((random() - 0.3) * 0.16, 0, -0.08 - random() * 0.1);
    lean.add(s.rod([0, 0, 0], [0, 1.98, 0], 0.02, s.material('#c9c6ba', { metalness: 0.5 })));
    top.position.y = 1.72;
    top.rotation.y = random() * 0.8;
    lean.add(top);
    if (a.shade === 'torn') {
      const t = ((gone[0] + 0.5) / 8) * Math.PI * 2;
      const nylon = s.ball([0.3, 0.02, 0.24], [Math.cos(t) * 0.6, 0.15, Math.sin(t) * 0.6], s.material('#1f1f24', { roughness: 0.3 }), 8);
      nylon.lookAt(Math.cos(t) * 3, 0.15 - 1, Math.sin(t) * 3);
      nylon.rotation.set(0, -t, -0.31);
      top.add(nylon);
    }
    s.root.add(lean);

    // The minder's place.
    const mx = 0.72, mz = -0.1;
    if (a.minder !== 'nobody') {
      s.box([0.26, 0.03, 0.22], [mx, 0.22, mz], wood);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([mx + x * 0.1, 0.22, mz + z * 0.08], [mx + x * 0.12, 0, mz + z * 0.1], 0.014, wood);
    }
    if (a.minder === 'homework') {
      const book = s.box([0.24, 0.008, 0.17], [mx, 0.24, mz], s.material('#f4f1e4'));
      book.rotation.y = 0.3;
      s.box([0.004, 0.01, 0.17], [mx, 0.242, mz], s.material('#3a6ab8')).rotation.y = 0.3;
      for (let i = 0; i < 5; i++) s.box([0.08, 0.002, 0.004], [mx - 0.06, 0.246, mz - 0.05 + i * 0.022], s.material('#4a5a9a')).rotation.y = 0.3;
      s.rod([mx + 0.06, 0.25, mz + 0.06], [mx + 0.13, 0.25, mz - 0.03], 0.005, s.material('#e8c020'));
    }
    if (a.minder === 'child' || a.minder === 'asleep') {
      const uniform = pick([['#2c8a56', '#f1f0e8'], ['#2a4a9a', '#bcd4f0'], ['#7a2a3a', '#f0e6c0'], ['#e87a9a', '#f1f0e8']]);
      const flesh = s.material(pick(['#5a3a28', '#6b4630', '#4a2f20']));
      const sleeping = a.minder === 'asleep';
      s.rod([mx, 0.25, mz], [mx - (sleeping ? 0.14 : 0.02), 0.6, mz], 0.1, s.material(uniform[1]), 0.085);
      s.box([0.24, 0.1, 0.22], [mx, 0.28, mz], s.material(uniform[0]));
      const head: P = sleeping ? [mx - 0.25, 0.56, mz] : [mx - 0.02, 0.76, mz];
      s.ball([0.085, 0.095, 0.085], head, flesh, 12);
      s.ball([0.088, 0.06, 0.088], [head[0] + 0.012, head[1] + 0.045, head[2]], dark, 10);
      for (const z of [-1, 1]) {
        s.rod([mx - 0.02, 0.28, mz + z * 0.07], [mx - 0.28, 0.33, mz + z * 0.08], 0.045, flesh);
        s.rod([mx - 0.28, 0.33, mz + z * 0.08], [mx - 0.32, 0.03, mz + z * 0.08], 0.035, flesh);
        s.box([0.12, 0.02, 0.05], [mx - 0.35, 0.012, mz + z * 0.08], s.material(pick(['#2a62c8', '#c8322a', '#2c8a56'])));
      }
      if (sleeping) for (const z of [-1, 1]) s.rod([mx - 0.1, 0.56, mz + z * 0.1], [mx - 0.3, 0.4, mz + z * 0.03], 0.03, flesh);
      else {
        s.rod([mx - 0.03, 0.58, mz - 0.1], [mx - 0.1, 0.4, mz - 0.12], 0.03, flesh);
        s.rod([mx - 0.03, 0.58, mz + 0.1], [mx - 0.22, 0.66, mz + 0.34], 0.03, flesh);
        s.ball([0.06, 0.02, 0.045], [mx - 0.25, 0.69, mz + 0.38], s.material('#eef6fa', { emissive: '#cfe6f0', emissiveIntensity: 0.3 }), 8);
      }
    }
    if (a.minder === 'nobody') for (const z of [0, 0.1]) s.box([0.2, 0.02, 0.075], [mx + z * 0.4, 0.012, mz + z], s.material('#2a62c8')).rotation.y = 0.3 + z * 4;
    // A wet ring on the ground where the cold basin sweats and customers spill.
    if (a.ice !== 'dry') s.cylinder(0.5, 0.5, 0.003, [0.05, 0.002, 0.1], s.material('#6f6a5e', { roughness: 0.3 }), 20).scale.z = 0.8;
    // Spent sachets on the ground: more when the place is worn or busy.
    const litter = Math.round((mood.wear * 0.6 + mood.density * 0.4) * 9);
    for (let i = 0; i < litter; i++) {
      const flat = s.box([0.1, 0.004, 0.07], [(random() - 0.5) * 1.9, 0.003, 0.3 + random() * 0.7], s.material('#dfe9ec', { roughness: 0.3 }));
      flat.rotation.y = random() * 3;
    }

    const sway = mix(0.004, 0.03, mood.energy), tilt = lean.rotation.z;
    return s.finish({ footprint: 0.95, update: (_dt, time) => { lean.rotation.z = tilt + Math.sin(time * 1.3) * sway; } });
  },
});
