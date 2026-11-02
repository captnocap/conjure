import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, paint, paintHex } from '@conjure/kit';
import { Batch, archBand, canvasTexture, dome, heightUV, jaliTexture, night as nightOf, onion, planarUV, pointedArch, stoneTexture, wallWithHoles, washTexture } from './parts';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    state: choice('What state is the stone in?', {
      restored: 'Freshly restored: the yellow basalt scrubbed honey-gold, every carving crisp.',
      weathered: 'Its everyday self: warm stone gone dusty, grey streaks under every ledge.',
      monsoon: 'Monsoon-stained and dark: the stone soaked brown-black, green-black streaks down every face.',
      scaffold: 'Half wrapped in bamboo scaffolding tied with rope, green netting over one side hall.',
    }),
    lighting: choice('How is it lit after dark?', {
      golden: 'Golden floodlights from the plaza, the arch glowing honey against the night.',
      tricolour: 'Independence Day: washed in saffron, white and green bands from top to bottom.',
      coloured: 'Washed in a single festival colour from the floodlights.',
      dark: 'No floodlights: a dark silhouette against the harbour.',
    }),
    wash: paint('If washed in a single festival colour, which?', ['magenta', 'purple', 'blue', 'turquoise', 'red', 'pink', 'amber', 'green']),
    surround: choice('What surrounds it on the bunder?', {
      pigeons: 'A carpet of grey pigeons on the plaza, seed-sellers squatting by their baskets, visitors strolling.',
      ferries: 'The sea wall behind with Elephanta launches bobbing at the steps, a few people waiting.',
      dawn: 'An empty dawn: the plaza bare and still, nobody about.',
      wave: 'A monsoon wave bursting white over the sea wall behind it, the plaza shining wet.',
    }),
    flags: noul('Do flags fly from the turrets?'),
    crowd: choice('Who is under the arch?', {
      nobody: 'Nobody: the great arch frames only sky and sea.',
      family: 'A family posing for a photograph in the arch.',
      couple: 'A couple standing close, looking out to the water.',
      guard: 'A lone policeman standing at the barrier.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const night = nightOf(mood.daylight);
    const wet = a.state === 'monsoon' || a.surround === 'wave';
    const stain = a.state === 'restored' ? 0.04 + mood.wear * 0.15 : a.state === 'monsoon' ? 0.75 + mood.wear * 0.25 : 0.25 + mood.wear * 0.55;
    const darken = a.state === 'monsoon' ? 0.62 : a.state === 'restored' ? 1.06 : 0.92 - mood.wear * 0.1;

    // Stone, trim, grilles and the floodlight wash.
    const stoneMap = stoneTexture(random, stain, 8, 4);
    const trimMap = stoneTexture(random, stain * 0.7, 4, 2, 'rgba(90,70,40,0.35)');
    const washKind = a.lighting === 'tricolour' ? 'tricolour' : a.lighting === 'dark' ? 'even' : 'flood';
    const washColour = a.lighting === 'golden' ? '#ffb24d' : a.lighting === 'coloured' ? paintHex(a.wash) : '#000000';
    const wash = washTexture(washKind, washColour); wash.channel = 1;
    const glow = a.lighting === 'dark' ? 0 : mix(0.02, a.lighting === 'tricolour' ? 0.85 : a.lighting === 'coloured' ? 0.42 : 0.6, night);
    const basalt = s.material(new THREE.Color('#c9a264').multiplyScalar(darken), { map: stoneMap, roughness: wet ? 0.38 : 0.86, emissive: '#ffffff', emissiveMap: wash, emissiveIntensity: glow });
    const trim = s.material(new THREE.Color('#e6cf9c').multiplyScalar(darken), { map: trimMap, roughness: wet ? 0.35 : 0.8, emissive: '#ffffff', emissiveMap: wash, emissiveIntensity: glow * 1.1 });
    const jaliMap = jaliTexture('diamonds'); jaliMap.repeat.set(1 / 0.8, 1 / 0.8);
    const jali = s.material(new THREE.Color('#d9b97f').multiplyScalar(darken), { map: jaliMap, alphaTest: 0.5, side: THREE.DoubleSide, emissive: '#ffd08a', emissiveIntensity: glow * 0.5 });
    const recess = s.material('#3a2b1c', { roughness: 0.95, emissive: '#ffb860', emissiveIntensity: a.lighting === 'dark' ? 0 : night * 0.25 });
    const plaza = s.material(wet ? '#8f8573' : '#b9ae97', { roughness: wet ? 0.18 : 0.9, metalness: wet ? 0.2 : 0 });

    const b = new Batch();
    const P = 1.2; // platform top
    // Platform of two broad steps.
    b.box(plaza, [40, 0.6, 34], [0, 0.3, 4]);
    b.box(plaza, [37, 0.6, 31], [0, 0.9, 4]);

    // ---- The central arch pavilion: four walls pierced by arches, the great pointed arch front and back.
    const bigArch = pointedArch(0, 0, 8.4, 8, 0.75, 12);
    const sideArch = pointedArch(0, 0, 6, 5, 0.75, 10);
    for (const z of [6.4, -8]) b.add(basalt, wallWithHoles(16, 17, 1.6, [bigArch]), [0, P, z]);
    for (const x of [6.4, -8]) b.add(basalt, wallWithHoles(12.8, 17, 1.6, [sideArch]), [x, P, 0], [0, Math.PI / 2, 0]);
    b.box(recess, [12.8, 1, 12.8], [0, P + 15.6, 0]);
    // Archivolts, the frame round the arch, carved spandrel roundels.
    for (const [z, face] of [[8, 1], [-8.25, -1]] as const) {
      b.add(trim, archBand(bigArch, 0.65, 0.25), [0, P, z]);
      for (const x of [-5.3, 5.3]) b.box(trim, [0.5, 15.6, 0.3], [x, P + 7.8, z + 0.12 * face + (face < 0 ? 0.12 : 0)]);
      b.box(trim, [11.1, 0.5, 0.3], [0, P + 15.4, z + 0.12]);
      for (const x of [-4.1, 4.1]) b.add(trim, new THREE.CylinderGeometry(0.75, 0.75, 0.2, 16), [x, P + 13.6, z + 0.15], [Math.PI / 2, 0, 0]);
      // Small blind niches flanking the arch.
      for (const x of [-6.7, 6.7]) for (const y of [3, 9.5]) {
        const niche = pointedArch(0, 0, 1.3, 2, 0.8, 6);
        b.add(recess, new THREE.ShapeGeometry(new THREE.Shape(niche)), [x, P + y, z + (face > 0 ? 0.02 : -0.02)], [0, face > 0 ? 0 : Math.PI, 0]);
        b.add(trim, archBand(niche, 0.18, 0.12), [x, P + y, z], [0, face > 0 ? 0 : Math.PI, 0]);
      }
    }
    for (const x of [8, -8.25]) b.add(trim, archBand(sideArch, 0.45, 0.25), [x, P, 0], [0, Math.PI / 2, 0]);
    // Cornice, attic with jali screens, top cornice and the parapet of little domes.
    b.box(trim, [17.2, 0.7, 17.2], [0, P + 17.2, 0]);
    b.box(basalt, [15.4, 3.6, 15.4], [0, P + 19.3, 0]);
    b.box(trim, [16.2, 0.55, 16.2], [0, P + 21.3, 0]);
    for (let side = 0; side < 4; side++) {
      const an = side * Math.PI / 2;
      for (const off of [-4.6, 0, 4.6]) {
        const nx = Math.sin(an), nz = Math.cos(an);
        const tx = Math.cos(an), tz = -Math.sin(an);
        const px = nx * 7.72 + tx * off, pz = nz * 7.72 + tz * off;
        b.add(recess, new THREE.BoxGeometry(3.4, 2.3, 0.1), [px, P + 19.3, pz], [0, an, 0]);
        const shape = new THREE.Shape(pointedArch(0, 0, 3.0, 1.2, 0.7, 8));
        b.add(jali, new THREE.ShapeGeometry(shape), [px + nx * 0.08, P + 18.2, pz + nz * 0.08], [0, an, 0]);
      }
    }
    const domelets = (cx: number, cz: number, w: number, d: number, y: number, step: number, edges: ('n' | 's' | 'e' | 'w')[]) => {
      const add = (x: number, z: number) => {
        b.box(trim, [0.36, 0.55, 0.36], [x, y + 0.27, z]);
        b.add(trim, dome(0.24, 0.32, 8), [x, y + 0.55, z]);
      };
      for (const e of edges) {
        const along = e === 'n' || e === 's' ? w : d;
        const n = Math.max(2, Math.round(along / step));
        for (let i = 0; i <= n; i++) {
          const t = -along / 2 + (along * i) / n;
          if (e === 's') add(cx + t, cz + d / 2); else if (e === 'n') add(cx + t, cz - d / 2);
          else if (e === 'e') add(cx + w / 2, cz + t); else add(cx - w / 2, cz + t);
        }
      }
    };
    domelets(0, 0, 15.8, 15.8, P + 21.55, 1.15, ['n', 's', 'e', 'w']);
    // The low central dome and its finial.
    b.add(basalt, dome(6.2, 3.1, 24), [0, P + 21.55, 0]);
    b.add(trim, onion(0.5, 1.4), [0, P + 24.6, 0]);
    b.rod(trim, [0, P + 25.9, 0], [0, P + 26.9, 0], 0.06);
    // The pointed Gujarati crown rising over the arch, front and back.
    for (const [z, rot] of [[7.6, 0], [-7.6, Math.PI]] as const) {
      const crown = new THREE.Shape(pointedArch(0, 0, 7.4, 1.0, 0.95, 12));
      crown.holes.push(new THREE.Path(pointedArch(0, 0.5, 4.4, 0.6, 0.85, 8)));
      b.add(trim, new THREE.ExtrudeGeometry(crown, { depth: 0.6, bevelEnabled: false }), [0, P + 21.55, z - 0.3], [0, rot, 0]);
      b.add(jali, new THREE.ShapeGeometry(new THREE.Shape(pointedArch(0, 0.5, 4.4, 0.6, 0.85, 8))), [0, P + 21.55, z], [0, rot, 0]);
      b.add(trim, onion(0.42, 1.1), [0, P + 21.55 + 5.3, z]);
    }

    // ---- Four slim octagonal corner turrets with open cupolas.
    const turret = (x: number, z: number, top: number, r: number) => {
      b.cyl(basalt, r, r * 1.08, top, [x, P + top / 2, z], 8, Math.PI / 8);
      for (const y of [top * 0.27, top * 0.5, top * 0.77, top]) b.cyl(trim, r * 1.18, r * 1.18, 0.35, [x, P + y, z], 8, Math.PI / 8);
      const post = top + 1.5;
      for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2 + Math.PI / 8; b.rod(trim, [x + Math.cos(an) * r * 0.82, P + top, z + Math.sin(an) * r * 0.82], [x + Math.cos(an) * r * 0.82, P + post, z + Math.sin(an) * r * 0.82], r * 0.07); }
      b.cyl(trim, r * 1.15, r * 1.15, 0.25, [x, P + post + 0.1, z], 8, Math.PI / 8);
      b.add(basalt, onion(r * 0.95, r * 1.7), [x, P + post + 0.2, z]);
      b.rod(trim, [x, P + post + 0.1 + r * 1.7, z], [x, P + post + r * 1.7 + 0.9, z], 0.05);
      return P + post + r * 1.7 + 0.9;
    };
    let mastTop = 0;
    for (const x of [-8, 8]) for (const z of [-8, 8]) mastTop = turret(x, z, 22, 1.35);

    // ---- The two side halls, each with smaller arches and a domed parapet.
    for (const sx of [-1, 1]) {
      const cx = sx * 12.5;
      const lower = [pointedArch(-2.15, 0, 2.8, 3.6, 0.8, 8), pointedArch(2.15, 0, 2.8, 3.6, 0.8, 8)];
      const upper = [pointedArch(-2.15, 7, 1.6, 1.3, 0.8, 6), pointedArch(2.15, 7, 1.6, 1.3, 0.8, 6)];
      for (const z of [4.8, -6]) {
        b.add(basalt, wallWithHoles(9, 11, 1.2, [...lower, ...upper]), [cx, P, z]);
        for (const arch of [...lower, ...upper]) {
          b.add(trim, archBand(arch, 0.3, 0.15), [cx, P, z > 0 ? 6 : -6.15]);
        }
        for (const arch of upper) b.add(jali, new THREE.ShapeGeometry(new THREE.Shape(arch)), [cx, P, z + 0.6]);
      }
      const endArch = pointedArch(0, 0, 4, 4, 0.8, 8);
      b.add(basalt, wallWithHoles(12, 11, 1.2, [endArch]), [cx + sx * 3.9 - 0.6, P, 0], [0, Math.PI / 2, 0]);
      b.add(trim, archBand(endArch, 0.35, 0.15), [cx + sx * 4.5 + (sx > 0 ? 0 : -0.15), P, 0], [0, Math.PI / 2, 0]);
      b.box(recess, [8.8, 0.6, 11], [cx, P + 10.4, 0]);
      b.box(basalt, [9, 0.4, 12], [cx, P + 10.85, 0]);
      b.box(trim, [9.6, 0.5, 12.6], [cx, P + 11.2, 0]);
      b.box(trim, [9.3, 0.3, 12.3], [cx, P + 6.3, 0]);
      domelets(cx + sx * 0.2, 0, 9.2, 12.2, P + 11.45, 1.15, sx > 0 ? ['s', 'n', 'e'] : ['s', 'n', 'w']);
      for (const z of [-6, 6]) turret(cx + sx * 4.5, z, 11.5, 0.75);
    }

    // ---- Surroundings.
    const props = new Batch();
    const people: ReturnType<typeof figure>[] = [];
    const bobbers: { g: THREE.Group; phase: number }[] = [];
    const skins = ['#8a5a3c', '#a8714c', '#6f472f', '#c08a62'];
    const clothes = ['#e8e2d4', '#c8324a', '#2f6fb3', '#e0a020', '#3b8a5a', '#7b2fa8', '#f2f0ea', '#d65a8a'];
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const person = (x: number, z: number, pose: 'standing' | 'walking' | 'crouching' | 'pointing' | 'arms-crossed' | 'sitting', turn: number, height = 1.65, extra: { hair?: 'short' | 'long' | 'bun' | 'cap' | 'hat'; top?: string } = {}) => {
      const p = figure(s, { height, pose, style: 'doll', hair: extra.hair ?? pick(['short', 'long', 'bun', 'short'] as const), skin: pick(skins), top: extra.top ?? pick(clothes), bottom: pick(['#2a2f3a', '#e8e2d4', '#4a3a2a', '#c8324a']), shoes: '#2a2422', mirror: random() < 0.5 });
      s.root.add(p.root);
      p.root.position.set(x, P, z);
      p.root.rotation.y = turn;
      people.push(p);
      return p;
    };
    const busy = 0.3 + mood.density * 0.7;
    const sea = a.surround === 'ferries' || a.surround === 'wave';
    if (sea) {
      // The sea wall and harbour water behind.
      const waterMat = s.material(wet ? '#4a5a5c' : '#4f6d70', { roughness: 0.2, metalness: 0.3 });
      props.box(s.material('#8c8676', { roughness: 0.9 }), [44, 1.6, 1.2], [0, 0.8, -13.6]);
      props.box(waterMat, [56, 0.3, 14], [0, 0.15, -21]);
    }
    if (a.surround === 'ferries') {
      const hullCols = ['#f2efe6', '#2f6fb3', '#e2c23a'];
      for (let i = 0; i < 3; i++) {
        const g = new THREE.Group();
        const L = 11 + random() * 3;
        const hull = s.material(hullCols[i % 3]);
        const add = (geo: THREE.BufferGeometry, m: THREE.Material, at: V3) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(...at); mesh.castShadow = true; g.add(mesh); };
        const hs = new THREE.Shape([new THREE.Vector2(-L / 2, -1.6), new THREE.Vector2(L * 0.3, -1.6), new THREE.Vector2(L / 2, 0), new THREE.Vector2(L * 0.3, 1.6), new THREE.Vector2(-L / 2, 1.6)]);
        const hg = new THREE.ExtrudeGeometry(hs, { depth: 1.2, bevelEnabled: false }).rotateX(-Math.PI / 2);
        add(hg, hull, [0, 0, 0]);
        add(new THREE.BoxGeometry(L * 0.7, 1.4, 2.8), s.material('#f4f2ec'), [0, 1.9, 0]);
        add(new THREE.BoxGeometry(L * 0.78, 0.15, 3.3), s.material('#c8324a'), [0, 2.7, 0]);
        add(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), s.material('#3a3a3a'), [L * 0.3, 3.7, 0]);
        g.position.set(-14 + i * 13 + random() * 2, 0.3, -17.5 - (i % 2) * 4);
        g.rotation.y = (random() - 0.5) * 0.3;
        s.root.add(g);
        bobbers.push({ g, phase: random() * 6 });
      }
      for (let i = 0; i < Math.round(2 + busy * 4); i++) person(-6 + random() * 12, -11.5 + random() * 1.2, pick(['standing', 'arms-crossed'] as const), Math.PI + (random() - 0.5));
    }
    let spray: THREE.InstancedMesh | null = null;
    if (a.surround === 'wave') {
      const pts: { at: V3; size: number }[] = [];
      for (const cx of [-17, 16]) for (let i = 0; i < 70; i++) {
        const t = random();
        pts.push({ at: [cx + (random() - 0.5) * 10 * (0.5 + t), 1.6 + t * 13 + random(), -13.5 - random() * 2 + t * 2], size: 0.8 + random() * 1.6 * (1 - t * 0.4) });
      }
      spray = s.scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#f2f6f6', transparent: true, opacity: 0.75, depthWrite: false, roughness: 0.9 }), pts);
      spray.castShadow = false;
    }
    if (a.surround === 'pigeons') {
      const birds: { at: V3; size: number; color: string }[] = [];
      const n = Math.round(30 + busy * 110);
      for (let i = 0; i < n; i++) {
        const r = Math.sqrt(random()) * 7, an = random() * Math.PI * 2;
        birds.push({ at: [-2 + Math.cos(an) * r * 1.6, P + 0.12, 14.6 + Math.sin(an) * r * 0.4], size: 0.16 + random() * 0.04, color: pick(['#8a8d93', '#6f737a', '#a3a5a8', '#5d6066', '#cfcfcf']) });
      }
      const birdGeo = new THREE.SphereGeometry(1, 8, 6).scale(0.75, 0.75, 1.3);
      s.scatter(birdGeo, s.material('#ffffff', { roughness: 0.8 }), birds);
      // Seed-sellers squatting by their baskets.
      for (const [x, z] of [[-8.5, 15.5], [5.5, 16.2]] as const) {
        person(x, z, 'crouching', -0.4 + random() * 0.8, 1.6, { hair: pick(['cap', 'short'] as const), top: pick(['#e8e2d4', '#d9a020', '#4a6fa0']) });
        props.cyl(s.material('#a07a42'), 0.45, 0.3, 0.35, [x + 0.8, P + 0.18, z + 0.4], 12);
        props.cyl(s.material('#d8b866'), 0.42, 0.42, 0.06, [x + 0.8, P + 0.36, z + 0.4], 12);
      }
      for (let i = 0; i < Math.round(1 + busy * 6); i++) person(-14 + random() * 28, 11 + random() * 6.5, pick(['walking', 'standing', 'pointing'] as const), random() * Math.PI * 2);
    }
    if (a.surround === 'wave') for (let i = 0; i < Math.round(busy * 3); i++) person(-10 + random() * 20, 12 + random() * 4, 'walking', random() * 6.28, 1.65, { top: pick(['#2f6fb3', '#c8324a', '#3a3a3a']) });
    // Who stands in the arch.
    if (a.crowd === 'family') {
      person(-0.9, 2, 'standing', 0, 1.7); person(0, 2.1, 'standing', 0, 1.58); person(0.8, 2.3, 'standing', 0, 1.1); person(-0.2, 7.5, 'pointing', Math.PI, 1.7);
    } else if (a.crowd === 'couple') {
      person(-0.3, -4, 'standing', Math.PI + 0.2, 1.72); person(0.3, -4, 'standing', Math.PI - 0.2, 1.6, { hair: 'long', top: '#c8324a' });
    } else if (a.crowd === 'guard') {
      person(0, 9.3, 'arms-crossed', 0, 1.75, { hair: 'cap', top: '#c9b48a' });
      for (let i = 0; i < 5; i++) props.box(s.material('#d8d2c0'), [1.8, 0.9, 0.12], [-4 + i * 2, P + 0.45, 9.8]);
    }
    // Floodlight cans along the plaza edge, glowing toward night.
    if (a.lighting !== 'dark') {
      const lens = s.material('#fff4d8', { emissive: a.lighting === 'coloured' ? paintHex(a.wash) : '#ffd08a', emissiveIntensity: mix(0.1, 2.2, night) });
      const can = s.material('#2e2c28', { metalness: 0.5, roughness: 0.5 });
      for (const x of [-15, -9, -3, 3, 9, 15]) {
        props.box(can, [0.5, 0.4, 0.5], [x, P + 0.2, 10.6]);
        props.box(lens, [0.42, 0.32, 0.05], [x, P + 0.22, 10.33]);
      }
    }
    // Bamboo scaffolding over the left hall and part of the arch.
    if (a.state === 'scaffold') {
      const bamboo = s.material('#c7a46a', { roughness: 0.7 });
      const fz = 6.9;
      for (let x = -17.5; x <= 1; x += 1.6) {
        const top = x < -8 ? 13 : 19;
        props.rod(bamboo, [x + random() * 0.1, P, fz + random() * 0.1], [x, P + top, fz], 0.06, 5);
        props.rod(bamboo, [x, P, fz + 1.2], [x + random() * 0.1, P + top - 0.5, fz + 1.2], 0.06, 5);
      }
      for (let y = 1.8; y < 19; y += 1.8) {
        const end = y > 12.5 ? 1 : 1;
        const start = y > 12.5 ? -8 : -17.5;
        for (const z of [fz, fz + 1.2]) props.rod(bamboo, [start, P + y, z], [end, P + y + (random() - 0.5) * 0.2, z], 0.05, 5);
        props.box(s.material('#9a7a4a'), [Math.max(1, end - start), 0.05, 1.2], [(start + end) / 2, P + y + 0.06, fz + 0.6]);
      }
      for (let x = -17.5; x < 0; x += 3.2) props.rod(bamboo, [x, P + 0.3, fz + 1.25], [x + 3.2, P + 12, fz + 1.25], 0.045, 5);
      const net = s.mesh(new THREE.PlaneGeometry(9.5, 12.5), new THREE.MeshStandardMaterial({ color: '#3f8a52', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, roughness: 0.9 }), [-12.7, P + 6.4, fz + 1.4]);
      net.castShadow = false;
    }
    // Flags on the turret tops.
    const flags: THREE.Mesh[] = [];
    if (a.flags) {
      const flagMap = canvasTexture(96, 64, (c) => {
        c.fillStyle = '#ff9933'; c.fillRect(0, 0, 96, 22); c.fillStyle = '#ffffff'; c.fillRect(0, 21, 96, 22); c.fillStyle = '#138808'; c.fillRect(0, 42, 96, 22);
        c.strokeStyle = '#000080'; c.lineWidth = 2; c.beginPath(); c.arc(48, 32, 8, 0, 7); c.stroke();
        for (let i = 0; i < 24; i++) { const an = i / 24 * Math.PI * 2; c.beginPath(); c.moveTo(48, 32); c.lineTo(48 + Math.cos(an) * 8, 32 + Math.sin(an) * 8); c.stroke(); }
      }, false);
      const flagMat = new THREE.MeshStandardMaterial({ map: flagMap, side: THREE.DoubleSide, roughness: 0.8 });
      const pole = s.material('#e8e4da', { metalness: 0.4 });
      for (const x of [-8, 8]) {
        props.rod(pole, [x, mastTop - 0.9, 8], [x, mastTop + 2.6, 8], 0.06, 6);
        const geo = new THREE.PlaneGeometry(2.4, 1.6, 8, 1).translate(1.2, 0, 0);
        const flag = s.mesh(geo, flagMat, [x, mastTop + 1.8, 8]);
        flag.rotation.y = -0.4;
        flags.push(flag);
      }
    }
    b.flush(s, { uv: new Map([[basalt, (g: THREE.BufferGeometry) => { planarUV(g, 3.2); heightUV(g, 27, 1); }], [trim, (g: THREE.BufferGeometry) => { planarUV(g, 1.6); heightUV(g, 27, 1); }], [plaza, (g: THREE.BufferGeometry) => planarUV(g, 3)]]) });
    props.flush(s);

    // Turned so the arch's depth and one side hall read.
    s.root.rotation.y = -0.6;
    const flutter = mix(0.6, 3.5, mood.energy);
    return s.finish({
      update: (dt, time) => {
        for (const p of people) p.update(dt, time);
        flags.forEach((f, i) => {
          const pos = f.geometry.attributes.position as THREE.BufferAttribute;
          for (let k = 0; k < pos.count; k++) { const x = pos.getX(k); pos.setZ(k, Math.sin(x * 2.2 - time * flutter * 2 + i) * 0.12 * (x / 2.4)); }
          pos.needsUpdate = true;
        });
        for (const { g, phase } of bobbers) { g.position.y = 0.3 + Math.sin(time * 1.1 + phase) * 0.12 * (0.5 + mood.energy); g.rotation.z = Math.sin(time * 0.8 + phase) * 0.03; }
        if (spray) { const k = 0.85 + Math.sin(time * mix(0.8, 2.5, mood.energy)) * 0.15; spray.scale.set(1, k, 1); }
      },
    });
  },
});
