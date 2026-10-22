import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix } from '@conjure/kit';
import { HUMAN, archLength, archPath, archSpots, crownGeometry, lump, paint, plate, sweep } from './teeth';
import { LOWER, archTeeth, gumRidge } from './arch';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const ERAS = {
  vulcanite: { gum: '#63291f', deep: '#3d1712', rough: 0.62 },
  midcentury: { gum: '#f28a9c', deep: '#dd6682', rough: 0.26 },
  modern: { gum: '#dc7a84', deep: '#a94c5c', rough: 0.4 },
  chrome: { gum: '#e98e98', deep: '#c66673', rough: 0.34 },
} as const;

export default defineThing({
  questions: {
    rest: choice('Where are the dentures resting?', {
      glass: 'Sunk in a bedside tumbler of water, bubbles rising.',
      napkin: 'Set down on a folded napkin, mouth shut, as if at the dinner table.',
      clacked: 'Clacked shut on the bare surface, a complete disembodied grin.',
      yawning: 'Propped wide open like a clam, every tooth on show.',
      apart: 'Taken apart: the upper and lower plates lying side by side, teeth up.',
    }),
    shade: choice('What shade are the teeth?', {
      porcelain: 'Bright porcelain white, too perfect to be real.',
      ivory: 'Soft ivory, a believable shade.',
      tea: 'Tea-stained beige, brown along the gum line.',
      nicotine: 'Nicotine yellow with dark amber necks, a lifelong smoker.',
    }),
    fit: choice('What state is the set in?', {
      perfect: 'Complete and even, every tooth in place.',
      missing: 'One front tooth has dropped out and lies beside it, leaving a gap.',
      cracked: 'The upper plate has cracked through and been glued and pinned back together.',
      chipped: 'Several teeth are chipped short and ground flat.',
      gold: 'Complete, with one proud gold tooth among the white.',
    }),
    expression: choice('What expression do they hold?', {
      grin: 'An even, friendly grin with the teeth just parted.',
      grimace: 'A clenched grimace, the lower jaw skewed to one side.',
      sneer: 'A lopsided sneer, one side lifted.',
      laugh: 'Thrown open in a laugh.',
    }),
    era: choice('What are the plates made of?', {
      vulcanite: 'Antique dark brown vulcanite rubber with brass coil springs at the back.',
      midcentury: 'Glossy bubblegum-pink acrylic, the mid-century classic.',
      modern: 'Modern gum-toned acrylic, darker toward the base, almost lifelike.',
      chrome: 'Pink gums on a polished chrome-cobalt palate.',
    }),
    bite: choice('If they are out of the water and together, what are they biting?', {
      nothing: 'Nothing at all.',
      pencil: 'A yellow pencil clamped crosswise.',
      cigar: 'A fat cigar with a glowing tip.',
      apple: 'A red apple, bitten into and stuck.',
      rose: 'A long-stemmed red rose held like a tango dancer.',
    }),
    kept: choice('What is kept beside them?', {
      nothing: 'Nothing.',
      tube: 'A squeezed tube of fixative cream.',
      brush: 'A denture brush with stiff white bristles.',
      spectacles: 'A folded pair of wire spectacles, the rest of the nightstand.',
      tablet: 'A cleaning tablet: fizzing if there is water, in its foil if not.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const era = ERAS[a.era];
    const inGlass = a.rest === 'glass', apart = a.rest === 'apart';
    const bite = inGlass || apart ? 'nothing' : a.bite;

    const toothBase = new THREE.Color({ porcelain: '#f8f5ee', ivory: '#ece1c6', tea: '#dcc391', nicotine: '#d4ae54' }[a.shade]);
    if (a.era === 'vulcanite') toothBase.lerp(new THREE.Color('#cfc6b0'), 0.35);
    const stain = new THREE.Color(a.shade === 'nicotine' ? '#6e4a12' : '#8a6a36');
    const grime = clamp01({ porcelain: 0.04, ivory: 0.2, tea: 0.55, nicotine: 0.8 }[a.shade] + mood.wear * 0.4);
    const shade = (t: number) => toothBase.clone().lerp(stain, clamp01(grime * Math.pow(1 - t, 1.6) + random() * 0.05));
    const enamel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.16, 0.5, mood.wear) });
    const gumColor = new THREE.Color(era.gum).lerp(new THREE.Color('#8f7f72'), mood.wear * 0.25), gumDeep = new THREE.Color(era.deep);
    const gumPaint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: era.rough + mood.wear * 0.2 });
    const platePaint = a.era === 'chrome'
      ? new THREE.MeshStandardMaterial({ color: '#c9d0d4', metalness: 0.75, roughness: mix(0.2, 0.5, mood.wear) })
      : new THREE.MeshStandardMaterial({ color: gumColor.clone().lerp(gumDeep, 0.25), roughness: era.rough + mood.wear * 0.2 });
    const gold = new THREE.MeshStandardMaterial({ color: '#e2b033', metalness: 0.85, roughness: 0.22, emissive: '#e2a020', emissiveIntensity: 0.25 });
    const brass = s.material('#b8923e', { metalness: 0.8, roughness: 0.35 });

    const key = (spot: { side: number; order: number }) => `${spot.side}:${spot.order}`;
    const side = random() > 0.5 ? 1 : -1;
    const lostKey = a.fit === 'missing' ? `${side}:${random() > 0.5 ? 0 : 1}` : '';
    const goldKey = a.fit === 'gold' ? `${side}:${random() > 0.4 ? 2 : 1}` : '';
    const chips = new Set<string>();
    const chipCount = a.fit === 'chipped' ? 5 : Math.round(mood.wear * 2 * random());
    for (let i = 0; i < chipCount; i++) chips.add(`${random() > 0.5 ? 1 : -1}:${Math.floor(random() * 4)}`);

    const buildJaw = (upper: boolean) => {
      const group = new THREE.Group();
      const A = upper ? 25 : 22.6, B = upper ? 36 : 32.2, list = upper ? HUMAN : LOWER;
      const spots = archSpots(A, B, list, 1);
      const reach = archLength(list, 1) + 1.5;
      const plan = (spot: (typeof spots)[number]) => {
        const chipped = chips.has(key(spot)) && (upper || a.fit === 'chipped');
        const front = spot.order < 3;
        return {
          lift: -0.9,
          tall: (front ? (upper ? 0.86 : 0.8) : upper ? 1 : 0.9) * (chipped ? 0.55 + random() * 0.25 : 1),
          worn: chipped ? 1 : mood.wear * 0.4,
          lean: (random() - 0.5) * 0.03,
          shade: (t: number) => shade(t),
        };
      };
      const special = (spot: (typeof spots)[number]) => upper && (key(spot) === lostKey || key(spot) === goldKey);
      const teeth = archTeeth(spots.filter((spot) => !special(spot)), plan, { flip: upper, detail: 5 });
      if (teeth.geometry) group.add(new THREE.Mesh(teeth.geometry, enamel));
      const goldSpot = spots.filter((spot) => upper && key(spot) === goldKey);
      if (goldSpot.length) {
        const capped = archTeeth(goldSpot, (spot) => ({ ...plan(spot), wide: 1.02, deep: 1.05 }), { flip: true, detail: 6 });
        if (capped.geometry) group.add(new THREE.Mesh(capped.geometry, gold));
      }
      const tint = (t: number) => gumColor.clone().lerp(gumDeep, clamp01((a.era === 'modern' ? 0.25 + 0.3 * Math.abs(Math.sin(t * 44)) : 0.08) + random() * 0.08));
      group.add(new THREE.Mesh(gumRidge(A, B, reach, upper ? -0.9 : 0.9, 11, 10.5, tint, { flip: upper, scallop: 14 }), gumPaint));
      const back = Math.min(...spots.map((spot) => spot.z)) - 5.5;
      if (upper) {
        const palate = new THREE.Mesh(plate(archPath(A, B, reach, 0, 36, 1.2), 2.6, 0.9), platePaint);
        palate.position.y = 11.2;
        group.add(palate);
      } else if (a.era === 'chrome') {
        group.add(new THREE.Mesh(sweep(archPath(A, B, reach * 0.8, -6, 30, 5.5), () => [1.6, 0.9], { radial: 8 }), platePaint));
      }
      return { group, back, A, B };
    };

    const jaws = new THREE.Group();
    const lower = buildJaw(false), upper = buildJaw(true);
    const zBack = Math.min(lower.back, upper.back), occlusal = 6.4, L = 34 - zBack;
    const hinge = new THREE.Group();
    const biteGap = { nothing: 0, pencil: 7.5, cigar: 12, apple: 21, rose: 3.5 }[bite];
    let angle = { grin: 0.07, grimace: 0, sneer: 0.05, laugh: 0.36 }[a.expression] * mix(0.7, 1.2, mood.cheer);
    if (a.rest === 'yawning') angle = Math.max(angle, mix(0.7, 0.95, random()));
    if (biteGap) angle = (biteGap + 3) / L;
    if (inGlass) angle = mix(0.12, 0.3, random());

    if (apart) {
      lower.group.position.set(-31, 0, 0);
      lower.group.rotation.y = (random() - 0.5) * 0.5;
      upper.group.rotation.set(0, (random() - 0.5) * 0.5, Math.PI);
      upper.group.position.set(33, 0.8, 2);
      jaws.add(lower.group, upper.group);
    } else {
      hinge.position.set(0, occlusal, zBack);
      upper.group.position.set(0, 13.4 - occlusal, -zBack);
      hinge.add(upper.group);
      hinge.rotation.x = -angle;
      if (a.expression === 'grimace') { lower.group.position.x = 2.6 * side; lower.group.rotation.y = 0.06 * side; }
      if (a.expression === 'sneer') hinge.rotation.z = 0.11 * side;
      jaws.add(lower.group, hinge);
    }
    s.root.add(jaws);

    if (a.fit === 'cracked') {
      const glue = new THREE.MeshStandardMaterial({ color: '#c98a1e', roughness: 0.2, emissive: '#7a4a08', emissiveIntensity: 0.35 });
      const front = upper.B + 5.3;
      const zig = (z: number) => (random() - 0.5) * 5 + Math.sin(z) * 1.5;
      const path = [V(0.4, -0.5, front), V(0.2, 8.5, front - 0.4), V(0, 11.9, front - 4)];
      for (let z = upper.B - 9; z > upper.back + 3; z -= 7) path.push(V(zig(z), 11.9, z));
      upper.group.add(new THREE.Mesh(sweep(path, () => 0.75, { radial: 6, straight: true, steps: path.length * 4 }), glue));
      for (const index of [3, 5]) {
        const at = path[Math.min(index, path.length - 1)];
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 9, 6), brass);
        pin.rotation.z = Math.PI / 2;
        pin.position.set(at.x, 12.1, at.z);
        upper.group.add(pin);
      }
    }

    if (bite !== 'nothing') {
      const held = new THREE.Group();
      held.position.set(0, occlusal, zBack);
      held.rotation.x = -angle / 2;
      const prop = new Sculpture(context);
      const at = V(0, 2.2, L);
      if (bite === 'pencil') {
        const body = prop.cylinder(3.4, 3.4, 78, [0, 0, 0], prop.material('#eab52c', { roughness: 0.5 }), 6);
        body.rotation.z = Math.PI / 2;
        prop.cylinder(3.5, 3.5, 6, [-42, 0, 0], prop.material('#b9bcc0', { metalness: 0.7 }), 12).rotation.z = Math.PI / 2;
        prop.cylinder(3.3, 3.3, 7, [-48.5, 0, 0], prop.material('#e58a94'), 12).rotation.z = Math.PI / 2;
        prop.cylinder(3.4, 0.9, 9, [43.5, 0, 0], prop.material('#e3c08e'), 6).rotation.z = Math.PI / 2;
        prop.cylinder(0.9, 0.1, 3, [49.5, 0, 0], prop.material('#2a2a2c'), 6).rotation.z = Math.PI / 2;
        prop.root.rotation.y = (random() - 0.5) * 0.2;
      } else if (bite === 'cigar') {
        const leaf = prop.material('#6b4326', { roughness: 0.85 });
        prop.mesh(sweep([V(0, 0, -6), V(0, 0, 20), V(0, -1, 50), V(0, -2, 66)], (t) => 5.6 * (t < 0.1 ? mix(0.6, 1, t * 10) : 1), { radial: 12, color: () => '#ffffff' }), new THREE.MeshStandardMaterial({ color: leaf.color, roughness: 0.85 }));
        const band = prop.cylinder(5.9, 5.9, 7, [0, -0.3, 24], prop.material('#b3212b'), 16);
        band.rotation.x = Math.PI / 2;
        const ash = prop.cylinder(5.2, 5.5, 6, [0, -2.2, 68], prop.material('#b9b5ad', { roughness: 1 }), 12);
        ash.rotation.x = Math.PI / 2;
        const ember = prop.cylinder(5.4, 5.5, 2, [0, -2.05, 65], new THREE.MeshStandardMaterial({ color: '#ff5a1e', emissive: '#ff4a12', emissiveIntensity: mix(0.6, 1.6, mood.energy) }), 12);
        ember.rotation.x = Math.PI / 2;
        prop.root.rotation.y = 0.3 * side;
      } else if (bite === 'apple') {
        const red = random() > 0.3;
        const apple = prop.mesh(lump(20, random, 0.04, 3, (v) => new THREE.Color(red ? '#c0202a' : '#8fbf3a').lerp(new THREE.Color(red ? '#e6c75a' : '#d6dc7a'), clamp01(v.y / 30 + random() * 0.2))), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3 }), [0, 0, 13]);
        apple.scale.set(1, 0.92, 1);
        prop.rod([0, 16, 13], [1.5, 25, 12], 0.8, prop.material('#5a3d20'));
        const leafMesh = prop.ball([5, 0.6, 2.6], [6, 24, 12], prop.material('#4f8a2e'), 10);
        leafMesh.rotation.z = 0.5;
      } else {
        const green = prop.material('#3f7a34');
        prop.mesh(sweep([V(-52, 0, 0), V(-20, 0.6, 1), V(15, 0, -1), V(44, 1, 0)], () => 1.3, { radial: 6 }), green);
        for (const x of [-30, 12]) { const leafMesh = prop.ball([8, 0.6, 3.6], [x, 2, 4 * Math.sign(x)], green, 10); leafMesh.rotation.y = 0.8 * Math.sign(x); }
        const petal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });
        const bloom = prop.mesh(lump(9.5, random, 0.1, 2, (v) => new THREE.Color('#b3121f').lerp(new THREE.Color('#5e0710'), clamp01(0.5 - v.x / 20 + random() * 0.3))), petal, [52, 1, 0]);
        bloom.scale.set(1.1, 0.95, 0.95);
        for (let i = 0; i < 5; i++) {
          const turn = i / 5 * Math.PI * 2;
          const outer = prop.ball([6, 7, 2.2], [50, 1 + Math.sin(turn) * 6.5, Math.cos(turn) * 6.5], prop.material('#c2182a', { roughness: 0.5 }), 10);
          outer.rotation.x = -turn + Math.PI / 2;
        }
        prop.cylinder(3.4, 1.4, 5, [42.5, 1, 0], green, 8).rotation.z = Math.PI / 2;
      }
      prop.root.position.copy(at);
      held.add(prop.root);
      jaws.add(held);
    }

    // Antique sets were pushed apart by a coiled spring on each side.
    if (a.era === 'vulcanite' && !apart) {
      jaws.updateMatrixWorld(true);
      for (const x of [-1, 1]) {
        const from = V(x * (lower.A + 6.5), 3, zBack + 9);
        const to = jaws.worldToLocal(upper.group.localToWorld(V(x * (upper.A + 6.5), -3, zBack + 9)));
        const bulge = from.clone().lerp(to, 0.5).add(V(x * 2, 0, -9 - angle * 10));
        const points: THREE.Vector3[] = [];
        const turns = 9, count = turns * 8;
        for (let i = 0; i <= count; i++) {
          const t = i / count, phase = t * turns * Math.PI * 2;
          const p = from.clone().multiplyScalar((1 - t) * (1 - t)).addScaledVector(bulge, 2 * t * (1 - t)).addScaledVector(to, t * t);
          points.push(p.add(V(Math.cos(phase) * 2, 0, Math.sin(phase) * 2)));
        }
        jaws.add(new THREE.Mesh(sweep(points, () => 0.42, { radial: 5, steps: count * 2 }), brass));
      }
    }

    // Where and how the whole set sits.
    let bubbles: THREE.InstancedMesh | null = null;
    const bubbleData: { x: number; z: number; y: number; r: number; speed: number; phase: number }[] = [];
    const R = 52, tall = 118, level = tall * mix(0.7, 0.86, random());
    if (inGlass) {
      jaws.rotation.set(-0.3 - random() * 0.2, (random() - 0.5) * 0.9, (random() - 0.5) * 0.3, 'YXZ');
      jaws.position.set(0, 30, 6);
      const glass = new THREE.MeshStandardMaterial({ color: '#e4f3f5', transparent: true, opacity: 0.2, depthWrite: false, roughness: 0.05, side: THREE.DoubleSide });
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.88, tall, 40, 1, true), glass);
      wall.position.y = tall / 2;
      wall.renderOrder = 3;
      const tea = new THREE.Color('#9fd6e0').lerp(new THREE.Color('#cfc79a'), mood.wear * 0.6);
      const water = new THREE.Mesh(new THREE.CylinderGeometry(R * (0.88 + 0.12 * level / tall) - 1, R * 0.88 - 1, level - 6, 40), new THREE.MeshStandardMaterial({ color: tea, transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.05 }));
      water.position.y = 6 + (level - 6) / 2;
      water.renderOrder = 2;
      s.root.add(water, wall);
      s.cylinder(R * 0.885, R * 0.87, 6, [0, 3, 0], s.material('#d5e6e8', { roughness: 0.15 }), 40);
      s.ring(R, 1.3, [0, tall, 0], s.material('#f1f8f9', { roughness: 0.1 })).rotation.x = Math.PI / 2;
      s.ring(R * (0.88 + 0.12 * level / tall) - 0.6, 0.7, [0, level, 0], s.material('#f6fbfb', { roughness: 0.1, emissive: '#bfe6ee', emissiveIntensity: 0.3 })).rotation.x = Math.PI / 2;
      const count = Math.round(8 + mood.density * 18 + mood.energy * 10 + (a.kept === 'tablet' ? 34 : 0));
      for (let i = 0; i < count; i++) {
        const radius = Math.sqrt(random()) * R * 0.74, turn = random() * Math.PI * 2;
        bubbleData.push({ x: Math.cos(turn) * radius, z: Math.sin(turn) * radius, y: random(), r: mix(0.9, 2.6, random() * random()), speed: mix(0.5, 1.4, random()), phase: random() * 6 });
      }
      bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, emissive: '#dff6fa', emissiveIntensity: 0.5 }), count);
      s.root.add(bubbles);
      if (a.kept === 'tablet') {
        const tablet = s.cylinder(9, 9, 4, [R * 0.45, 8.5, R * 0.4], s.material('#f4f8ff', { emissive: '#bfe6ff', emissiveIntensity: 0.3 }), 20);
        tablet.rotation.z = 0.25;
      }
    }
    jaws.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(jaws);
    if (inGlass) box.set(V(-R, 0, -R), V(R, tall, R));
    let floor = box.min.y;
    if (inGlass) jaws.position.y += 7.5 - new THREE.Box3().setFromObject(jaws).min.y;

    if (a.rest === 'napkin') {
      const gingham = mood.cheer > 0.62;
      const cloth = paint(256, 256, (ctx, w, h) => {
        ctx.fillStyle = mood.wear > 0.6 ? '#e6dfcc' : '#f6f3ea';
        ctx.fillRect(0, 0, w, h);
        if (gingham) {
          ctx.fillStyle = 'rgba(196,40,48,0.45)';
          for (let i = 0; i < 8; i++) { ctx.fillRect(i * 32, 0, 16, h); ctx.fillRect(0, i * 32, w, 16); }
        } else {
          ctx.strokeStyle = 'rgba(120,130,150,0.35)'; ctx.lineWidth = 3;
          ctx.strokeRect(14, 14, w - 28, h - 28); ctx.strokeRect(24, 24, w - 48, h - 48);
        }
        for (let i = 0; i < mood.wear * 9; i++) { ctx.fillStyle = `rgba(150,110,50,${0.1 + random() * 0.15})`; ctx.beginPath(); ctx.arc(random() * w, random() * h, 6 + random() * 22, 0, 7); ctx.fill(); }
      });
      const clothPaint = new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.95 });
      const size = 104, turn = 0.3 + random() * 0.5;
      const under = s.box([size, 1.2, size], [2, floor - 1.9, 3], clothPaint);
      under.rotation.y = turn + 0.09;
      const over = s.box([size * 0.98, 1.2, size * 0.98], [0, floor - 0.6, 0], clothPaint);
      over.rotation.y = turn;
      floor -= 2.5;
    }

    const span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
    if (a.fit === 'missing') {
      const loose = s.mesh(crownGeometry('incisor', 8.2, 9.5, 7, { shade: (t) => shade(t) }), enamel, [box.max.x * 0.4, a.rest === 'napkin' ? floor + 5.3 : floor + 2.6, box.max.z + 10 + random() * 5]);
      loose.rotation.set(Math.PI / 2 - 0.15, 0, 0.9 + random(), 'YXZ');
    }
    const besideX = box.min.x - 24, besideZ = (box.min.z + box.max.z) / 2;
    if (a.kept === 'tube') {
      const hue = mood.warmth > 0.5 ? '#d8497a' : '#2f8fb5';
      const tube = new THREE.Group();
      const body = new THREE.Mesh(sweep([V(0, 0, -32), V(0, 0, -10), V(0, 0, 12), V(0, 0, 34)], (t) => [mix(7, 0.7, Math.pow(t, 1.4)), mix(7, 11, t)], { radial: 14, steps: 24, color: (t) => (t > 0.28 && t < 0.72 ? hue : '#f4f2ec') }), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.2 }));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.2, 10, 12), s.material('#f7f7f4'));
      cap.rotation.x = Math.PI / 2;
      cap.position.z = -37;
      tube.add(body, cap);
      tube.position.set(besideX + 4, floor + 7.2, besideZ);
      tube.rotation.y = 0.3 + (random() - 0.5) * 0.6;
      s.root.add(tube);
    } else if (a.kept === 'brush') {
      const hue = ['#3a9aa8', '#e0a02e', '#c9506a', '#5a8f4a'][Math.floor(random() * 4)];
      const brush = new Sculpture(context);
      brush.mesh(sweep([V(0, 3, -48), V(0, 2.4, -10), V(0, 4, 22), V(0, 6.5, 46)], (t) => [mix(3, 2.2, t), mix(4.5, 5.5, t)], { radial: 10 }), brush.material(hue, { roughness: 0.35 }));
      brush.box([10, 9, 24], [0, 13, 34], brush.material('#f5f3ea', { roughness: 0.95 }));
      brush.root.position.set(besideX + 6, floor, besideZ + 2);
      brush.root.rotation.y = -0.25 + (random() - 0.5) * 0.5;
      s.root.add(brush.root);
    } else if (a.kept === 'spectacles') {
      const specs = new Sculpture(context);
      const wire = specs.material(a.era === 'vulcanite' ? '#b8923e' : '#3a2c22', { metalness: 0.7, roughness: 0.35 });
      const lens = new THREE.MeshStandardMaterial({ color: '#dff0f4', transparent: true, opacity: 0.25, depthWrite: false, roughness: 0.05, side: THREE.DoubleSide });
      for (const x of [-20, 20]) {
        specs.ring(16, 1.2, [x, 17.2, 0], wire);
        specs.mesh(new THREE.CircleGeometry(15, 24), lens, [x, 17.2, 0]);
        specs.mesh(sweep([V(x * 1.85, 19, 0), V(x * 1.8, 19, -6), V(-x * 1.2, 15, -9 - Math.sign(x) * 3), V(-x * 1.9, 8, -10 - Math.sign(x) * 3)], () => 0.9, { radial: 6 }), wire);
      }
      specs.ring(5, 1.1, [0, 20, 0], wire, Math.PI).position.y = 19;
      specs.root.position.set(besideX - 14, floor, besideZ + 4);
      specs.root.rotation.y = 0.75 + (random() - 0.5) * 0.4;
      s.root.add(specs.root);
    } else if (a.kept === 'tablet' && !inGlass) {
      const foil = s.box([30, 1.6, 30], [besideX, floor + 0.8, besideZ], s.material('#cfd6da', { metalness: 0.7, roughness: 0.3 }));
      foil.rotation.y = random();
      s.cylinder(9.5, 9.5, 2.2, [besideX, floor + 2.4, besideZ], s.material('#3f8fc4', { roughness: 0.4 }), 20);
      const tablet = s.cylinder(9, 9, 4, [besideX + 22, floor + 2, besideZ + 20], s.material('#f4f8ff', { roughness: 0.8 }), 20);
      tablet.rotation.y = random();
    }
    void span;

    s.root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = (mesh.material as THREE.Material).depthWrite;
    });

    const dummy = new THREE.Matrix4();
    const setBubbles = (time: number) => {
      if (!bubbles) return;
      const speed = mix(0.04, 0.5, mood.energy);
      bubbleData.forEach((b, index) => {
        const rise = (b.y + time * speed * b.speed) % 1;
        const wobble = Math.sin(time * 2 * b.speed + b.phase) * 1.5;
        dummy.makeScale(b.r, b.r, b.r).setPosition(b.x + wobble, 9 + rise * (level - 12), b.z);
        bubbles!.setMatrixAt(index, dummy);
      });
      bubbles.instanceMatrix.needsUpdate = true;
    };
    setBubbles(0);

    const thing = s.finish();
    const outer = new THREE.Group();
    outer.name = 'REV_denture_1';
    outer.add(thing.object);
    outer.scale.setScalar(0.001 * (({ macro: 1, tabletop: 1, room: 10, street: 45 } as Record<string, number>)[context.scale] ?? 10));
    const chatter = !apart && !inGlass && bite === 'nothing' && mood.energy > 0.55;
    return {
      object: outer,
      update: (_dt, time) => {
        setBubbles(time);
        if (chatter) hinge.rotation.x = -(angle + Math.abs(Math.sin(time * mix(4, 14, mood.energy))) * 0.12 * mood.energy);
      },
      dispose: thing.dispose,
    };
  },
});
