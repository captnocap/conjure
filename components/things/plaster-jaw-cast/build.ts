import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix } from '@conjure/kit';
import { HUMAN, type ToothKind, archLength, archPath, archSpots, lump, plate, sweep } from './teeth';
import { LOWER, archTeeth, gumRidge } from './arch';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export default defineThing({
  questions: {
    pose: choice('How is the cast posed?', {
      closed: 'On its articulator, bitten shut.',
      open: 'On its articulator, hinged wide open.',
      stacked: 'No articulator: the upper cast simply resting on the lower, slightly askew.',
      upper: 'The upper cast alone, lying teeth-up on the bench.',
    }),
    bite: choice('What kind of bite does it record?', {
      ideal: 'A textbook bite, even and closed.',
      overbite: 'A deep overbite, the upper teeth jutting well forward.',
      underbite: 'An underbite, the lower jaw thrust out in front.',
      gappy: 'Gappy: small teeth with spaces between every one.',
      crowded: 'Crowded and crooked, teeth twisted over each other.',
      missing: 'Several molars missing, each empty socket crossed in red pencil.',
    }),
    material: choice('What is it cast in?', {
      plaster: 'Chalk-white plaster of Paris.',
      stone: 'Hard yellow dental stone.',
      wax: 'A wax-up: ivory teeth set in pink modelling wax on white plaster bases.',
      aligner: 'White plaster wearing a glossy clear aligner tray over the teeth.',
      blue: 'Pale blue die stone, a modern lab model.',
    }),
    labelling: choice('How is it labelled?', {
      number: 'A patient number lettered on the side of the base.',
      pencil: 'Red pencil marks: a midline, a circled tooth, the pencil left beside it.',
      sticker: 'A paper label with a date and a coloured dot.',
      none: 'Unmarked and anonymous.',
    }),
    subject: choice('Whose teeth does it record?', {
      child: 'A child: small milk teeth and a short arch.',
      adult: 'An ordinary adult.',
      elderly: 'An old mouth: teeth worn flat and short, some gone.',
      fanged: 'A fanged oddity: canines far too long to be human.',
    }),
    hinge: choice('If it is on an articulator, what kind?', {
      brass: 'A plain cast-brass hinge with thumb nuts.',
      wire: 'A cheap bent-wire articulator, the casts held in blobs of plaster.',
      black: 'A black enamelled lab articulator with a steel incisal pin at the front.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const child = a.subject === 'child', old = a.subject === 'elderly', fanged = a.subject === 'fanged';
    const sc = child ? 0.82 : 1;
    const base = new THREE.Color({ plaster: '#f3f1ea', stone: '#e6d08a', wax: '#f3f1ea', aligner: '#f3f1ea', blue: '#b9d3e6' }[a.material]).lerp(new THREE.Color('#b3a58e'), mood.wear * 0.35);
    const toothTint = a.material === 'wax' ? new THREE.Color('#f1e6c8') : base.clone().lerp(new THREE.Color('#fffdf4'), 0.6);
    const ridgeTint = a.material === 'wax' ? new THREE.Color('#e88a8a') : base.clone().offsetHSL(0, 0.02, -0.07);
    const noise = () => (random() - 0.5) * 0.035;
    const stone = new THREE.MeshStandardMaterial({ color: base, roughness: 0.92 });
    const toothPaint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: a.material === 'wax' ? 0.35 : 0.9 });
    const ridgePaint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: a.material === 'wax' ? 0.45 : 0.92 });
    const red = new THREE.MeshStandardMaterial({ color: '#c2261d', roughness: 0.8 });
    const side = random() > 0.5 ? 1 : -1;
    const gone = new Set<string>();
    if (a.bite === 'missing') ['l' + side + ':5', 'l' + -side + ':6', 'l' + -side + ':5', 'u' + side + ':6', 'u' + -side + ':5'].forEach((k) => gone.add(k));
    if (old) for (let i = 0; i < 5; i++) gone.add((random() > 0.5 ? 'u' : 'l') + (random() > 0.5 ? 1 : -1) + ':' + (1 + Math.floor(random() * 6)));
    if (mood.wear > 0.7) gone.add('u' + side + ':1');
    const gap = a.bite === 'gappy' ? 1.6 : child ? 0.7 : 0;
    const mess = a.bite === 'crowded' ? 1 : 0.12;
    const baseHigh = 8.5 * sc, shelf = 4.2 * sc;

    const buildJaw = (upper: boolean) => {
      const group = new THREE.Group();
      const tag = upper ? 'u' : 'l';
      const A = (upper ? 25 : 22.6) * sc, B = (upper ? 36 : 32.4) * sc;
      const list = upper ? HUMAN : LOWER;
      const spots = archSpots(A, B, list, sc, gap);
      const reach = archLength(list, sc, gap) + 1.5;
      const plan = (spot: (typeof spots)[number]) => {
        const front = spot.order < 3, stagger = spot.order % 2 ? 1 : -1;
        const fang = fanged && spot.order === 2;
        return {
          skip: gone.has(`${tag}${spot.side}:${spot.order}`),
          kind: (fang ? 'fang' : spot.kind) as ToothKind,
          lift: -0.9,
          push: (stagger * 1.6 + (random() - 0.5) * 1.5) * mess * (front ? 1 : 0.3),
          turn: (random() - 0.5) * 1.1 * mess * (front ? 1 : 0.3),
          lean: (random() - 0.5) * 0.3 * mess,
          tall: (fang ? (upper ? 1 : 0.6) : (front ? (upper ? 0.9 : 0.82) : upper ? 1 : 0.92) * (old ? 0.62 : 1) * (child ? 0.85 : 1)) * (fanged && front && !fang ? 0.9 : 1),
          wide: a.bite === 'gappy' ? 0.8 : fang ? 1.15 : 0.96,
          deep: fang ? 1.5 : 1,
          worn: old ? 1 : child ? 0.2 : 0.1,
          shade: () => toothTint.clone().offsetHSL(0, 0, noise()),
        };
      };
      const teeth = archTeeth(spots, plan, { flip: upper, scale: sc, detail: 5 });
      if (teeth.geometry) group.add(new THREE.Mesh(teeth.geometry, toothPaint));
      if (a.material === 'aligner' && (upper || a.pose !== 'upper')) {
        const tray = archTeeth(spots, (spot) => ({ ...plan(spot), wide: 1.12, deep: 1.18, tall: (plan(spot).tall ?? 1) * 1.06, worn: 0.6 }), { flip: upper, scale: sc, detail: 4 });
        if (tray.geometry) {
          const shell = new THREE.Mesh(tray.geometry, new THREE.MeshStandardMaterial({ color: '#bfe9ff', transparent: true, opacity: 0.42, depthWrite: false, roughness: 0.03, emissive: '#8fd4ff', emissiveIntensity: 0.25 }));
          shell.renderOrder = 2;
          group.add(shell);
        }
      }
      const dir = upper ? -1 : 1;
      group.add(new THREE.Mesh(gumRidge(A, B, reach, dir * 0.9, 8 * sc, 11 * sc, () => ridgeTint.clone().offsetHSL(0, 0, noise()), { flip: upper, scallop: 14 }), ridgePaint));
      const back = Math.min(...spots.map((spot) => spot.z)) - 5.5 * sc, front = B + 6.5 * sc, w = A + 7.5 * sc;
      const right: [number, number][] = upper
        ? [[0, front + 4 * sc], [w * 0.78, front - 12 * sc], [w, front - 27 * sc], [w, back + 8 * sc], [w - 8 * sc, back]]
        : [[0, front], [w * 0.5, front - 2.5 * sc], [w * 0.86, front - 11 * sc], [w, front - 25 * sc], [w, back + 8 * sc], [w - 8 * sc, back]];
      const outline = [...right.map(([x, z]) => V(x, 0, z)), ...right.slice(1).reverse().map(([x, z]) => V(-x, 0, z))];
      const slab = new THREE.Mesh(plate(outline, baseHigh, 0.7), stone);
      slab.position.y = dir > 0 ? -shelf : shelf + baseHigh;
      group.add(slab);
      const mark = (at: THREE.Vector3) => {
        for (const turn of [0.8, -0.8]) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(8 * sc, 0.5, 1), red);
          bar.position.copy(at);
          bar.rotation.y = turn;
          group.add(bar);
        }
      };
      if (a.bite === 'missing') for (const spot of spots) if (gone.has(`${tag}${spot.side}:${spot.order}`) && spot.order >= 5) mark(V(spot.x, dir * 1.3, spot.z));
      if (a.labelling === 'pencil') {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.9, baseHigh * 0.8, 0.5), red);
        line.position.set(0, dir * -(shelf + baseHigh / 2), right[0][1] + 0.5);
        if (!upper) group.add(line);
        const circled = spots.find((spot) => spot.side === side && spot.order === 3);
        if (circled && upper) {
          const loop = new THREE.Mesh(new THREE.TorusGeometry(6.2 * sc, 0.45, 6, 28), red);
          loop.position.set(circled.x + Math.sin(circled.turn) * 5 * sc, -5 * sc, circled.z + Math.cos(circled.turn) * 5 * sc);
          loop.rotation.y = circled.turn;
          group.add(loop);
        }
      }
      return { group, back, front, w, A, B };
    };

    const lower = buildJaw(false), upper = buildJaw(true);
    const zBack = Math.min(lower.back, upper.back);
    const Y = 13.6 * sc * (old ? 0.72 : 1) + (fanged ? 1.5 : 0);
    const shift = a.bite === 'overbite' ? 5.5 * sc : a.bite === 'underbite' ? -6 * sc : 0;
    const pivot = V(0, 7 * sc, zBack - 10);
    const hinge = new THREE.Group();
    const mounted = a.pose === 'closed' || a.pose === 'open';
    const angle = a.pose === 'open' ? mix(0.5, 0.8, random()) : 0;
    const bottom = -shelf - baseHigh, top = Y + shelf + baseHigh;

    if (a.pose === 'upper') {
      upper.group.rotation.z = Math.PI;
      upper.group.rotation.y = (random() - 0.5) * 0.5;
      s.root.add(upper.group);
    } else {
      hinge.position.copy(pivot);
      upper.group.position.set(0, Y - pivot.y, shift - pivot.z);
      if (a.pose === 'stacked') { upper.group.rotation.y = (random() - 0.5) * 0.16; upper.group.position.x += (random() - 0.5) * 4; }
      hinge.add(upper.group);
      hinge.rotation.x = -angle;
      s.root.add(lower.group, hinge);
    }

    if (mounted) {
      const metal = a.hinge === 'brass'
        ? s.material('#b8923e', { metalness: 0.8, roughness: mix(0.25, 0.55, mood.wear) })
        : a.hinge === 'wire' ? s.material('#aab1b6', { metalness: 0.8, roughness: 0.3 }) : s.material('#1d1f22', { metalness: 0.4, roughness: 0.35 });
      const bright = s.material('#c9d0d4', { metalness: 0.85, roughness: 0.25 });
      const frame = new Sculpture(context), arm = new Sculpture(context);
      const reachZ = lower.front * 0.45, armTop = top - pivot.y + 1.6, wide = a.hinge === 'wire' ? 17 : lower.w + 4.5;
      if (a.hinge === 'wire') {
        for (const x of [-1, 1]) {
          frame.mesh(sweep([V(x * 6, bottom - 1.2, reachZ), V(x * 9, bottom - 1.2, 0), V(x * wide, bottom - 1.2, pivot.z + 3), V(x * wide, bottom + 6, pivot.z), V(x * wide, pivot.y, pivot.z)], () => 1.2, { radial: 8 }), metal);
          arm.mesh(sweep([V(x * wide * 0.82, 0, 0), V(x * wide * 0.82, armTop * 0.7, 1), V(x * 9, armTop, 12), V(x * 6, armTop, reachZ - pivot.z)], () => 1.2, { radial: 8 }), metal);
        }
        const blob = (target: Sculpture, at: [number, number, number]) => { const m = target.mesh(lump(13, random, 0.18, 2), stone, at); m.scale.y = 0.3; };
        blob(frame, [0, bottom - 0.5, reachZ * 0.6]);
        blob(arm, [0, armTop - 0.6, reachZ * 0.6 - pivot.z]);
      } else {
        frame.box([wide * 2 + 6, 3, 7], [0, bottom - 1.5, pivot.z], metal);
        frame.box([13, 3, reachZ - pivot.z], [0, bottom - 1.5, (reachZ + pivot.z) / 2], metal);
        for (const x of [-1, 1]) frame.box([4.5, pivot.y - bottom + 7, 6], [x * wide, (pivot.y + bottom) / 2, pivot.z], metal);
        for (const x of [-1, 1]) arm.rod([x * (wide - 5), 0, 0], [x * 5, armTop, 9], 2.2, metal);
        arm.box([13, 3, reachZ - pivot.z - 6], [0, armTop, (reachZ - pivot.z) / 2 + 3], metal);
        const screw = arm.cylinder(4, 4, 5, [0, armTop + 3.5, (reachZ - pivot.z) * 0.6], bright, 10);
        screw.rotation.y = random();
        if (a.hinge === 'black') {
          const pinZ = lower.front + 12;
          frame.box([9, 3, pinZ - reachZ + 4], [0, bottom - 1.5, (pinZ + reachZ) / 2], metal);
          arm.box([9, 3, pinZ - reachZ + 4], [0, armTop, (pinZ + reachZ) / 2 - pivot.z], metal);
          arm.rod([0, armTop + 9, pinZ - pivot.z], [0, bottom - pivot.y + 1, pinZ - pivot.z], 1.5, bright);
          arm.ball([2.6, 2.6, 2.6], [0, armTop + 9, pinZ - pivot.z], bright, 10);
        }
      }
      const rod = frame.cylinder(a.hinge === 'wire' ? 1.3 : 2, a.hinge === 'wire' ? 1.3 : 2, wide * 2 + 8, [0, pivot.y, pivot.z], bright, 12);
      rod.rotation.z = Math.PI / 2;
      if (a.hinge !== 'wire') for (const x of [-1, 1]) frame.cylinder(4.2, 4.2, 4, [x * (wide + 5), pivot.y, pivot.z], metal, 8).rotation.z = Math.PI / 2;
      s.root.add(frame.root);
      hinge.add(arm.root);
    }

    s.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(s.root);
    const floor = box.min.y;
    const host = a.pose === 'upper' ? upper : lower;
    if (a.labelling === 'number' || a.labelling === 'sticker') {
      const sticker = a.labelling === 'sticker';
      const text = sticker ? `${1 + Math.floor(random() * 28)}.${1 + Math.floor(random() * 12)}.${String(48 + Math.floor(random() * 50))}` : `No ${100 + Math.floor(random() * 8900)}`;
      const label = new Sculpture(context);
      const paper = sticker ? (mood.wear > 0.5 ? '#e2d3a6' : '#fbf7e8') : `#${base.getHexString()}`;
      label.label(text, 26 * sc, 8 * sc, [0, 0, 0], sticker ? '#2a3a6a' : '#3a3a3a', paper);
      if (sticker) { const dot = label.cylinder(3 * sc, 3 * sc, 0.4, [-17 * sc, 0, 0], label.material(['#d8342a', '#2f8fd0', '#2f9e55', '#e6b422'][Math.floor(random() * 4)]), 16); dot.rotation.x = Math.PI / 2; }
      label.root.position.set(host.w + 0.9, a.pose === 'upper' ? shelf + baseHigh / 2 : -shelf - baseHigh / 2, (host.front - 27 * sc + host.back + 8 * sc) / 2);
      label.root.rotation.set(a.pose === 'upper' ? Math.PI : 0, Math.PI / 2, 0);
      host.group.add(label.root);
    }
    if (a.labelling === 'pencil') {
      const pencil = new Sculpture(context);
      pencil.cylinder(3.2, 3.2, 90, [0, 0, 0], pencil.material('#c2261d', { roughness: 0.5 }), 6).rotation.z = Math.PI / 2;
      pencil.cylinder(3.2, 0.8, 9, [49.5, 0, 0], pencil.material('#e3c08e'), 6).rotation.z = -Math.PI / 2;
      pencil.cylinder(0.8, 0.1, 3, [55.5, 0, 0], pencil.material('#b01c14'), 6).rotation.z = -Math.PI / 2;
      pencil.root.position.set(0, floor + 3, box.max.z + 14);
      pencil.root.rotation.y = (random() - 0.5) * 0.5;
      s.root.add(pencil.root);
    }
    const crumbs = Math.round(mood.wear * 9 + mood.density * 4);
    for (let i = 0; i < crumbs; i++) {
      const r = mix(0.8, 3.2, random() * random());
      s.mesh(lump(r, random, 0.3, 1), stone, [mix(box.min.x - 8, box.max.x + 8, random()), floor + r * 0.4, box.max.z + random() * 12 - (i % 2 ? 0 : box.max.z - box.min.z + 12)]).scale.y = 0.6;
    }

    s.root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = (mesh.material as THREE.Material).depthWrite;
    });
    const thing = s.finish();
    const outer = new THREE.Group();
    outer.name = 'REV_cast_3';
    outer.add(thing.object);
    outer.scale.setScalar(0.001 * (({ macro: 1, tabletop: 1, room: 9 } as Record<string, number>)[context.scale] ?? 9));
    return { object: outer, dispose: thing.dispose };
  },
});
