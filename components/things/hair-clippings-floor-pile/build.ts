import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const WHOSE = {
  mix: 'A whole day of customers mixed together: browns, blacks, a little grey and one streak of red.',
  ponytail: 'One long severed ponytail, still in its elastic, lying across a few loose strands.',
  baby: 'A child’s first curls: a small scatter of pale gold ringlets.',
  beard: 'A shaved-off beard: a dense wiry dark mat in clumps.',
  punk: 'Dyed punk colours: hot pink, acid green and electric blue spikes.',
  grey: 'Grey and white, fine and thin, an old man’s fortnightly trim.',
} as const;

type Shade = [number, number, number];
const PALETTES: Record<keyof typeof WHOSE, Shade[]> = {
  mix: [[0.07, 0.5, 0.2], [0.08, 0.45, 0.1], [0.0, 0.0, 0.07], [0.1, 0.5, 0.38], [0.0, 0.0, 0.6], [0.03, 0.75, 0.36]],
  ponytail: [[0.09, 0.6, 0.36], [0.08, 0.55, 0.3]],
  baby: [[0.12, 0.75, 0.68], [0.11, 0.7, 0.6]],
  beard: [[0.06, 0.4, 0.1], [0.05, 0.5, 0.16], [0.0, 0.0, 0.3]],
  punk: [[0.9, 0.9, 0.55], [0.28, 0.9, 0.5], [0.58, 0.95, 0.52], [0.13, 1, 0.55]],
  grey: [[0.0, 0.0, 0.72], [0.6, 0.05, 0.86], [0.0, 0.0, 0.5]],
};

export default defineThing({
  questions: {
    whose: choice('Whose hair is it?', WHOSE),
    amount: score('How much hair is there?', ['A few wisps', 'A modest handful', 'A good day’s heap', 'A great drift, knee-deep in barbershop terms']),
    state: choice('What stage is the sweeping at?', {
      midsweep: 'Mid-sweep: the broom is pushed into the heap with a trail of strays behind it.',
      heaped: 'Swept into a tidy cone and left, broom leaning ready.',
      scattered: 'Not swept at all: hair lies where it fell, the broom dropped flat on the floor.',
      scooped: 'Half of it is already in the dustpan, on its way to the bin.',
    }),
    broom: choice('What kind of broom is it?', {
      push: 'A wide wooden push broom with stiff dark bristles.',
      corn: 'An old straw corn broom, splayed and stitched with red thread.',
      soft: 'A narrow soft-bristle salon broom with a bright plastic head.',
    }),
    pan: choice('What kind of dustpan is beside it?', {
      lobby: 'An upright metal lobby pan on a long handle.',
      hand: 'A dented steel hand pan.',
      plastic: 'A cheap bright plastic pan with a clip-on brush.',
      none: 'No dustpan, just the broom.',
    }),
    kept: noul('Has one lock been set aside from the pile, tied with a ribbon to keep?'),
    footprint: noul('Has someone walked through it, leaving a shoe-shaped gap and a trail?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const amount = Math.max(0.04, a.amount) * mix(0.75, 1.15, mood.density);
    const palette = PALETTES[a.whose];
    const shade = () => {
      const [h, sat, l] = palette[Math.floor(random() * palette.length)];
      return new THREE.Color().setHSL(h + (random() - 0.5) * 0.02, sat * mix(1, 0.75, mood.wear), THREE.MathUtils.clamp(l + (random() - 0.5) * 0.1, 0.03, 0.95));
    };

    // Three clipping shapes: a curl, a fanned tuft and a straight snip.
    const curl = new THREE.TorusGeometry(0.6, 0.11, 5, 12, Math.PI * 1.6);
    const tuftParts = [-0.5, -0.15, 0.2, 0.55].map((lean) => {
      const blade = new THREE.ConeGeometry(0.11, 1.6, 4);
      blade.translate(0, 0.8, 0);
      blade.rotateZ(lean);
      return blade;
    });
    const tuft = mergeGeometries(tuftParts)!;
    tuftParts.forEach((part) => part.dispose());
    const snip = new THREE.CylinderGeometry(0.05, 0.07, 2, 4);
    const kinds = { curl, tuft, snip };
    const weights: Record<keyof typeof WHOSE, [number, number, number]> = {
      mix: [0.3, 0.45, 0.25], ponytail: [0.1, 0.2, 0.7], baby: [0.9, 0.1, 0], beard: [0.55, 0.4, 0.05], punk: [0.05, 0.75, 0.2], grey: [0.15, 0.45, 0.4],
    };
    const lists: Record<keyof typeof kinds, THREE.Matrix4[]> = { curl: [], tuft: [], snip: [] };
    const tints: Record<keyof typeof kinds, THREE.Color[]> = { curl: [], tuft: [], snip: [] };
    const sizeOf = { mix: 0.068, ponytail: 0.06, baby: 0.05, beard: 0.056, punk: 0.085, grey: 0.062 }[a.whose];

    const spread = a.state === 'scattered' ? mix(0.26, 0.48, amount) : mix(0.13, 0.34, amount);
    const peak = a.state === 'scattered' ? 0.012 : mix(0.035, 0.27, amount) * (a.state === 'heaped' ? 1.25 : 1) * (a.whose === 'baby' ? 0.5 : 1);
    const heapAt = (x: number, z: number) => peak * Math.exp(-(x * x + z * z) / (spread * spread * 0.55));
    const gap = a.footprint ? { x: (random() - 0.5) * spread * 0.5, z: spread * 0.25, turn: random() * 0.8 - 0.4 } : null;
    const inGap = (x: number, z: number) => {
      if (!gap) return false;
      const dx = x - gap.x, dz = z - gap.z;
      const u = dx * Math.cos(gap.turn) - dz * Math.sin(gap.turn), v = dx * Math.sin(gap.turn) + dz * Math.cos(gap.turn);
      return (u / 0.055) ** 2 + (v / 0.14) ** 2 < 1;
    };
    const dummy = new THREE.Object3D();
    const drop = (x: number, z: number, lift: number, scale = 1) => {
      if (inGap(x, z)) return;
      const roll = random();
      const w = weights[a.whose];
      const kind = roll < w[0] ? 'curl' : roll < w[0] + w[1] ? 'tuft' : 'snip';
      const size = sizeOf * mix(0.55, 1.5, random()) * scale;
      dummy.position.set(x, lift + size * 0.25, z);
      dummy.rotation.set((random() - 0.5) * (kind === 'tuft' ? 2.6 : 3.1), random() * Math.PI * 2, (random() - 0.5) * 2.6);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      lists[kind].push(dummy.matrix.clone());
      tints[kind].push(shade());
    };
    const gauss = () => (random() + random() + random() + random() - 2) * 0.9;

    const count = Math.round(mix(60, 1000, amount) * (a.whose === 'baby' ? 0.35 : a.whose === 'ponytail' ? 0.12 : 1));
    for (let i = 0; i < count; i++) {
      const x = gauss() * spread, z = gauss() * spread * 0.85;
      drop(x, z, heapAt(x, z) * mix(0.35, 1, random()));
    }
    // Strays: a few far from the heap, always.
    for (let i = 0; i < Math.round(mix(6, 40, amount)); i++) {
      const angle = random() * Math.PI * 2, r = spread * mix(1.1, 1.7, random());
      drop(Math.cos(angle) * r, Math.sin(angle) * r * 0.8, 0, 0.8);
    }
    // The sweep trail drags back toward where the broom came from.
    const trail = a.state === 'midsweep' || a.state === 'scooped';
    if (trail) for (let i = 0; i < Math.round(mix(10, 70, amount)); i++) drop(-spread * mix(1, 2.1, random()) - 0.05, (random() - 0.5) * 0.36, 0, 0.75);
    if (gap) for (let i = 0; i < 3; i++) for (let j = 0; j < 7; j++) drop(gap.x + Math.sin(gap.turn) * (0.2 + i * 0.2) + (i % 2 ? 0.07 : -0.07) + (random() - 0.5) * 0.06, gap.z + 0.22 + i * 0.2 + (random() - 0.5) * 0.12, 0, 0.6);

    // A soft body under the clippings so a big heap reads as a mass, not confetti.
    if (a.state !== 'scattered' && peak > 0.03 && a.whose !== 'ponytail') {
      const [h, sat, l] = palette[0];
      const core = s.ball([spread * 0.95, peak * 0.8, spread * 0.8], [0, 0, 0], new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(h, sat * 0.8, l * 0.75), roughness: 1 }), 18);
      core.castShadow = false;
    }

    // The ponytail: a thick tapering hank bound with an elastic.
    if (a.whose === 'ponytail') {
      const length = mix(0.42, 0.7, a.amount), base = 0.06;
      const bend = (random() - 0.5) * 0.3;
      const hair = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.09, 0.6, 0.34), roughness: 0.55 });
      for (let i = 0; i < 9; i++) {
        const off = (i - 4) * 0.011, wig = random() * 6;
        const points: [number, number, number][] = [];
        for (let k = 0; k <= 6; k++) {
          const t = k / 6, fan = t * t * (i - 4) * 0.03;
          points.push([-length / 2 + t * length, Math.max(0.012, base * (1 - (t - 0.3) ** 2 * 1.6)) + Math.abs(off) * 0.4, off + fan + Math.sin(t * 5 + wig) * 0.012 + bend * (t - 0.5) ** 2]);
        }
        const strand = s.tube(points, mix(0.022, 0.012, Math.abs(i - 4) / 4), hair);
        strand.material = i % 3 === 0 ? new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.1, 0.65, 0.44), roughness: 0.5 }) : hair;
      }
      const tie = s.ring(0.05, 0.016, [-length / 2 + length * 0.1, base * 0.82 + 0.006, 0], s.material(mood.cheer > 0.5 ? '#e0457b' : '#27272d', { roughness: 0.6 }));
      tie.rotation.y = Math.PI / 2;
      for (let i = 0; i < 5; i++) s.rod([-length / 2 + length * 0.1, base * 0.8, (i - 2) * 0.008], [-length / 2 - 0.03 - random() * 0.02, base * 0.5 + random() * 0.02, (i - 2) * 0.02], 0.006, hair, 0.002);
    }

    const hairMaterial = new THREE.MeshStandardMaterial({ roughness: mix(0.55, 0.9, mood.wear), emissive: a.whose === 'punk' ? '#3a1038' : '#000000', emissiveIntensity: a.whose === 'punk' ? 0.5 : 0 });
    for (const key of Object.keys(kinds) as (keyof typeof kinds)[]) {
      const matrices = lists[key];
      if (!matrices.length) { kinds[key].dispose(); continue; }
      const mesh = new THREE.InstancedMesh(kinds[key], hairMaterial, matrices.length);
      matrices.forEach((matrix, index) => { mesh.setMatrixAt(index, matrix); mesh.setColorAt(index, tints[key][index]); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    // The lock set aside, tied with a ribbon.
    if (a.kept) {
      const kx = spread * 0.75 + 0.1, kz = spread * 0.85 + 0.12;
      const [h, sat, l] = palette[0];
      const lock = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(h, sat, Math.min(0.8, l + 0.05)), roughness: 0.5 });
      for (let i = 0; i < 6; i++) s.tube([[kx - 0.15, 0.016, kz + (i - 2.5) * 0.008], [kx, 0.03, kz + (i - 2.5) * 0.01], [kx + 0.12, 0.02, kz + (i - 2.5) * 0.026], [kx + 0.17, 0.045, kz + (i - 2.5) * 0.034 + 0.02]], 0.011, lock);
      const ribbon = s.material(mood.cheer > 0.45 ? '#5b9bd8' : '#b8323c', { roughness: 0.5 });
      s.ring(0.03, 0.009, [kx - 0.06, 0.026, kz], ribbon).rotation.y = Math.PI / 2;
      for (const side of [-1, 1]) {
        s.ring(0.03, 0.007, [kx - 0.06, 0.066, kz + side * 0.03], ribbon).rotation.set(0.3 * side, Math.PI / 2, 0);
        s.rod([kx - 0.06, 0.05, kz], [kx - 0.06 + side * 0.025, 0.008, kz + 0.075 + side * 0.02], 0.007, ribbon);
      }
    }

    // --- The broom.
    const broom = new Sculpture(context);
    s.root.add(broom.root);
    const woodMat = s.material('#a8763f', { roughness: 0.65 });
    const handleLength = 0.95;
    let headWidth = 0.46;
    if (a.broom === 'push') {
      broom.box([headWidth, 0.045, 0.075], [0, 0.105, 0], woodMat);
      const bristle = s.material('#2b2520', { roughness: 0.95 });
      const block = broom.mesh(new THREE.BoxGeometry(headWidth - 0.01, 0.085, 0.065, 30, 1, 4), bristle, [0, 0.042, 0]);
      const p = block.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) { p.setZ(i, p.getZ(i) * 1.5 + (random() - 0.5) * 0.012); p.setY(i, p.getY(i) + random() * 0.012); }
      block.geometry.computeVertexNormals();
      broom.cylinder(0.022, 0.026, 0.05, [0, 0.14, 0], s.material('#7b8084', { metalness: 0.7, roughness: 0.4 }), 12).rotation.x = -0.5;
    } else if (a.broom === 'corn') {
      headWidth = 0.3;
      const straw = s.material('#d2b064', { roughness: 0.9 });
      const skirt = broom.mesh(new THREE.CylinderGeometry(0.035, 0.16, 0.34, 18, 6), straw, [0, 0.17, 0]);
      skirt.scale.z = 0.3;
      const p = skirt.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.1) p.setX(i, p.getX(i) * (1 + random() * 0.12 * (1 + mood.wear)));
      skirt.geometry.computeVertexNormals();
      const thread = s.material('#b3252a');
      for (const [y, w] of [[0.2, 0.086], [0.25, 0.066], [0.3, 0.048]] as const) broom.box([w * 2, 0.008, 0.052], [0, y, 0], thread);
    } else {
      headWidth = 0.3;
      const tint = mood.cheer > 0.5 ? '#e23d6d' : '#2f7fb8';
      broom.box([headWidth, 0.035, 0.05], [0, 0.11, 0], s.material(tint, { roughness: 0.4 }));
      const fluff = broom.mesh(new THREE.BoxGeometry(headWidth - 0.01, 0.095, 0.04, 20, 1, 3), s.material('#dfd9c8', { roughness: 0.95 }), [0, 0.046, 0]);
      const p = fluff.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setZ(i, p.getZ(i) * 1.8 + (random() - 0.5) * 0.01);
      fluff.geometry.computeVertexNormals();
    }
    const headTop = a.broom === 'corn' ? 0.33 : 0.13;
    const lean = a.broom === 'corn' ? 0.14 : 0.42;
    broom.rod([0, headTop, 0], [0, headTop + Math.cos(lean) * handleLength, -Math.sin(lean) * handleLength], 0.014, woodMat, 0.012);
    broom.ball([0.016, 0.016, 0.016], [0, headTop + Math.cos(lean) * handleLength, -Math.sin(lean) * handleLength], s.material('#b3252a'), 10);

    if (a.state === 'scattered') {
      // Dropped flat, handle along the floor.
      broom.root.rotation.set(-Math.PI / 2 + lean + 0.02, 0, 0);
      broom.root.position.set(-spread * 0.5, a.broom === 'corn' ? 0.05 : 0.11, 0.3);
      const tilt = new THREE.Group();
      s.root.add(tilt); tilt.add(broom.root);
      tilt.rotation.y = mix(0.5, 1.3, random());
    } else if (a.state === 'heaped') {
      // Standing a little apart, as if against a wall.
      broom.root.position.set(-spread - 0.3, 0, -0.1);
      broom.root.rotation.y = mix(0.2, 0.7, random());
    } else {
      // Head-down in the edge of the heap, pushing in from the left.
      broom.root.position.set(-spread * 0.85 - 0.05, 0, 0);
      broom.root.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.3;
    }

    // --- The dustpan.
    if (a.pan !== 'none') {
      const pan = new Sculpture(context);
      s.root.add(pan.root);
      const steel = s.material(a.pan === 'plastic' ? (mood.cheer > 0.5 ? '#f0c020' : '#cf3a2d') : '#8f979b', { metalness: a.pan === 'plastic' ? 0 : 0.75, roughness: a.pan === 'plastic' ? 0.45 : 0.4 });
      const w = a.pan === 'lobby' ? 0.3 : 0.28, d = a.pan === 'lobby' ? 0.26 : 0.24, h = a.pan === 'lobby' ? 0.13 : 0.06;
      // Mouth faces -x (toward the heap).
      pan.box([d, 0.006, w], [0, 0.004, 0], steel).rotation.z = -0.03;
      pan.box([0.006, h, w], [d / 2, h / 2, 0], steel);
      for (const side of [-1, 1]) {
        const cheek = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(d / 2, h), new THREE.Vector2(d * 0.1, h), new THREE.Vector2(-d / 2, 0.012)]);
        const wall = pan.mesh(new THREE.ExtrudeGeometry(cheek, { depth: 0.005, bevelEnabled: false }), steel, [0, 0, side * w / 2 - 0.0025]);
        wall.castShadow = true;
      }
      if (a.pan === 'lobby') {
        pan.box([d * 0.9, 0.006, w], [d * 0.05, h, 0], steel);
        pan.rod([d * 0.2, h, 0], [d * 0.2 + 0.08, h + 0.78, 0], 0.009, steel);
        pan.rod([d * 0.2 + 0.08 - 0.0, h + 0.78, -0.05], [d * 0.2 + 0.08, h + 0.78, 0.05], 0.014, s.material('#1e1f22'));
      } else {
        pan.rod([d / 2, h * 0.6, 0], [d / 2 + 0.14, h * 0.9 + 0.03, 0], 0.014, a.pan === 'plastic' ? steel : s.material('#7a4a26'));
        if (a.pan === 'plastic') {
          pan.box([0.16, 0.02, 0.03], [d / 2 + 0.03, h + 0.03, 0], steel).rotation.y = Math.PI / 2;
          pan.box([0.15, 0.035, 0.02], [d / 2 + 0.03, h + 0.0, 0], s.material('#2c2c2c', { roughness: 0.95 })).rotation.y = Math.PI / 2;
        } else if (mood.wear > 0.5) pan.box([0.05, 0.004, 0.06], [-0.02, 0.008, 0.05], s.material('#6d5a44', { roughness: 0.9 }));
      }
      if (a.state === 'scooped') {
        // Hair already inside the pan.
        const inside = Array.from({ length: Math.round(mix(12, 90, amount)) }, () => ({ at: [(random() - 0.5) * d * 0.8, 0.012 + random() * Math.min(h * 0.6, 0.02 + amount * 0.05), (random() - 0.5) * w * 0.8] as [number, number, number], size: sizeOf * mix(0.3, 0.6, random()), color: shade() }));
        pan.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), inside);
      }
      const reach = a.state === 'scooped' ? spread * 0.7 + d * 0.45 : a.state === 'scattered' ? spread * 0.7 + 0.2 : spread * 1.1 + d / 2 + 0.04;
      pan.root.position.set(reach, 0, a.state === 'scooped' ? 0 : (random() - 0.5) * 0.2);
      pan.root.rotation.y = a.state === 'scooped' ? (random() - 0.5) * 0.15 : (random() - 0.5) * 1.2 + (a.state === 'scattered' ? 2 : 0);
    }

    return s.finish({ footprint: Math.max(0.4, spread * 1.5) });
  },
});
