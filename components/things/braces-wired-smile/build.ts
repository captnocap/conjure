import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';
import { HUMAN, archLength, archPath, archSpots, lump, plate, sweep } from './teeth';
import { LOWER, type PlacedTooth, archTeeth, facePoint, gumRidge } from './arch';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const TEAMS = [['#c8102e', '#f2f2f2'], ['#0b3d91', '#f6c21c'], ['#0a6b3a', '#f2f2f2'], ['#111111', '#f47a1f'], ['#5a2d91', '#f6c21c'], ['#7bc4e8', '#f2f2f2']];

export default defineThing({
  questions: {
    age: choice('How old is the wearer?', {
      child: 'A child: small milk teeth, gaps, a missing tooth and two big new front ones.',
      teen: 'A teenager: a full set of new adult teeth.',
      adult: 'An adult who waited years to do this: larger, slightly worn teeth.',
    }),
    bands: choice('What colour are the brackets and elastics?', {
      steel: 'Plain steel all over, the classic train-track look.',
      rainbow: 'A different bright elastic on every tooth, a full rainbow.',
      team: 'Two alternating team colours.',
      ceramic: 'Discreet clear ceramic brackets on a pale frosted wire.',
      pink: 'All bubblegum pink.',
      black: 'All black, chosen on purpose.',
      neon: 'Glow-in-the-dark neon green.',
    }),
    alignment: score('How far along is the treatment?', ['Badly crowded, teeth overlapping and twisted, the wire zigzagging', 'Mid-treatment, still uneven', 'Nearly straight, the wire a clean curve']),
    extras: choice('What else is attached or lying with it?', {
      none: 'Nothing more.',
      headgear: 'A headgear facebow: a thick outer wire loop with a blue neck strap behind.',
      elastics: 'Amber rubber bands stretched from the upper teeth down to the lower molars.',
      retainer: 'A pink acrylic retainer with its wire bow lying beside it, for afterwards.',
    }),
    mouth: choice('What is the mouth doing?', {
      closed: 'Shyly closed, teeth together.',
      grin: 'A broad grin, teeth slightly parted.',
      bared: 'Bared wide, showing everything.',
      tongue: 'Open with the tongue stuck out.',
    }),
    state: choice('What has just happened?', {
      fine: 'Freshly tightened: everything gleaming and in place.',
      popped: 'A bracket has popped off and lies in front, the wire end poking loose.',
      lunch: 'Lunch: spinach and crumbs caught in the wire.',
      sore: 'Sore day: the gum line is angry red with a bead of blood.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const sc = { child: 0.84, teen: 0.96, adult: 1.04 }[a.age];
    const child = a.age === 'child';
    const mess = clamp01(1 - a.alignment) * (child ? 0.8 : 1);
    const gap = child ? 1.5 : mess * 0.2;

    const toothBase = new THREE.Color(a.age === 'adult' ? '#ece2c8' : '#f6f3ea');
    const plaque = new THREE.Color('#b9964a');
    const grime = clamp01(mood.wear * 0.6 + (a.age === 'adult' ? 0.15 : 0) + (a.state === 'lunch' ? 0.15 : 0));
    const enamel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.16, 0.5, mood.wear) });
    const sore = a.state === 'sore';
    const gumColor = new THREE.Color(sore ? '#d85a66' : '#e58894').lerp(new THREE.Color('#9a8078'), mood.wear * 0.25);
    const gumDeep = new THREE.Color(sore ? '#9c1f2c' : '#c9606f');
    const gumPaint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.36 });
    const ceramic = a.bands === 'ceramic';
    const steel = new THREE.MeshStandardMaterial({ color: ceramic ? '#eef0ee' : '#b4bcc2', metalness: ceramic ? 0.1 : 0.75, roughness: mix(0.22, 0.5, mood.wear), transparent: false });
    const wirePaint = new THREE.MeshStandardMaterial({ color: ceramic ? '#e3e6e4' : '#9aa3a9', metalness: ceramic ? 0.2 : 0.8, roughness: 0.3 });
    const glow = a.bands === 'neon' ? 0.8 : mix(0.05, 0.3, mood.cheer);
    const elasticPaint = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4, emissive: a.bands === 'neon' ? '#58ff5a' : '#000000', emissiveIntensity: a.bands === 'neon' ? glow : 0 });
    const team = TEAMS[Math.floor(random() * TEAMS.length)];
    const hueStart = random();
    const elasticColor = (index: number, molar: boolean) => {
      if (molar && a.bands !== 'neon') return new THREE.Color(ceramic ? '#dfe3e2' : '#aab2b8');
      switch (a.bands) {
        case 'steel': return new THREE.Color('#8f989e');
        case 'rainbow': return new THREE.Color().setHSL((hueStart + index / 10) % 1, 0.85, 0.55);
        case 'team': return new THREE.Color(team[index % 2]);
        case 'ceramic': return new THREE.Color('#f4f4ee');
        case 'pink': return new THREE.Color('#ff5fa2');
        case 'black': return new THREE.Color('#17181a');
        default: return new THREE.Color('#7dff5e');
      }
    };

    const lostSide = random() > 0.5 ? 1 : -1;
    const popKey = a.state === 'popped' ? `${random() > 0.5 ? 1 : -1}:${1 + Math.floor(random() * 2)}` : '';
    let poppedColor = new THREE.Color('#ffffff');
    const handles: Record<string, PlacedTooth> = {};

    const buildJaw = (upper: boolean) => {
      const group = new THREE.Group();
      const A = (upper ? 24 : 21.6) * sc, B = (upper ? 30 : 26.4) * sc;
      const list = (upper ? HUMAN : LOWER).slice(0, 6);
      const spots = archSpots(A, B, list, sc, gap);
      const reach = archLength(list, sc, gap) + 1.5;
      const plan = (spot: (typeof spots)[number]) => {
        const milk = child && !(upper && spot.order === 0) && spot.order !== 5 && !(!upper && spot.order < 2);
        const missing = child && ((upper && spot.order === 1 && spot.side === lostSide) || (!upper && spot.order === 2 && spot.side === -lostSide));
        const stagger = spot.order % 2 ? 1 : -1;
        const front = spot.order < 3;
        return {
          skip: missing,
          lift: -1 + (random() - 0.5) * 2 * mess * sc,
          push: (stagger * 1.5 + (random() - 0.5) * 1.6) * mess * sc * (front ? 1 : 0.4),
          turn: (random() - 0.5) * 1.0 * mess * (front ? 1 : 0.4),
          lean: (random() - 0.5) * 0.3 * mess,
          tilt: (random() - 0.5) * 0.2 * mess,
          tall: (front ? (upper ? 0.95 : 0.85) : 1.15) * (milk ? 0.72 : 1),
          wide: milk ? 0.8 : 0.96 + mess * 0.06,
          worn: a.age === 'adult' ? 0.5 : 0,
          shade: (t: number) => toothBase.clone().lerp(plaque, clamp01(grime * Math.pow(1 - t, 1.5) + random() * 0.04)),
        };
      };
      const teeth = archTeeth(spots, plan, { flip: upper, scale: sc, detail: 5 });
      if (teeth.geometry) group.add(new THREE.Mesh(teeth.geometry, enamel));
      const tint = (t: number) => gumColor.clone().lerp(gumDeep, clamp01(0.1 + 0.25 * Math.abs(Math.sin(t * 38)) + random() * 0.08));
      group.add(new THREE.Mesh(gumRidge(A, B, reach, upper ? -1.3 : 1.3, 9.5 * sc, 8.6 * sc, tint, { flip: upper, scallop: 12 }), gumPaint));
      if (sore) group.add(new THREE.Mesh(sweep(archPath(A, B, reach * 0.9, upper ? -1.2 : 1.2, 40, -3.6 * sc), () => 0.85 * sc, { radial: 8, steps: 60 }), new THREE.MeshStandardMaterial({ color: '#b01c2a', roughness: 0.25 })));

      // Brackets, elastics and the wire that visits each of them.
      const ordered = teeth.placed.slice().sort((p, q) => p.spot.s - q.spot.s);
      const wired = ordered.filter((tooth) => !(upper && `${tooth.spot.side}:${tooth.spot.order}` === popKey));
      const brackets = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), steel, wired.length);
      const elastics = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), elasticPaint, wired.length);
      const q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(), m = new THREE.Matrix4();
      wired.forEach((tooth, index) => {
        const molar = tooth.spot.order === 5;
        tooth.matrix.decompose(p, q, one);
        m.compose(facePoint(tooth, 0.5, 0.5 * sc), q, V(molar ? 3 : 2.9, molar ? 2.6 : 2.6, 1.1).multiplyScalar(sc));
        elastics.setMatrixAt(index, m);
        elastics.setColorAt(index, elasticColor(index, molar));
        m.compose(facePoint(tooth, 0.5, 1.1 * sc), q, V(molar ? 3.8 : 2.5, molar ? 2.5 : 1.7, 1.7).multiplyScalar(sc));
        brackets.setMatrixAt(index, m);
      });
      if (upper && popKey) poppedColor = elasticColor(3, false);
      elastics.instanceColor!.needsUpdate = true;
      group.add(brackets, elastics);
      const points = wired.map((tooth) => facePoint(tooth, 0.5, 1.7 * sc));
      if (points.length > 2) {
        const first = points[0], last = points[points.length - 1];
        const loose = upper && a.state === 'popped';
        points.unshift(first.clone().add(V(loose ? -3 : 0, loose ? -2 : 0, -3.5 * sc)));
        points.push(last.clone().add(V(0, 0, -3.5 * sc)));
        group.add(new THREE.Mesh(sweep(points, () => 0.45 * sc, { radial: 6, steps: points.length * 5 }), wirePaint));
      }
      for (const tooth of teeth.placed) handles[`${upper ? 'u' : 'l'}${tooth.spot.side}:${tooth.spot.order}`] = tooth;
      const back = Math.min(...spots.map((spot) => spot.z));
      return { group, A, B, back, reach, placed: teeth.placed };
    };

    const lower = buildJaw(false), upper = buildJaw(true);
    const zBack = Math.min(lower.back, upper.back) - 2 * sc;
    const Y = 16.6 * sc;
    const open = { closed: 0, grin: 3.2, bared: 10, tongue: 14 }[a.mouth] * sc * mix(0.8, 1.15, mood.cheer);
    const hinge = new THREE.Group();
    hinge.position.set(0, Y / 2, zBack);
    upper.group.position.set(0, Y / 2 + open * 0.55, -zBack);
    hinge.rotation.x = -open / (60 * sc) * 0.9;
    hinge.add(upper.group);
    const mouth = new THREE.Group();
    mouth.add(lower.group, hinge);
    s.root.add(mouth);
    mouth.updateMatrixWorld(true);
    const world = (upperJaw: boolean, point: THREE.Vector3) => (upperJaw ? upper.group.localToWorld(point) : point);

    // The cut ends of gum are joined at the back so the two arcs stand as one mouth.
    for (const x of [-1, 1]) {
      const from = V(x * lower.A, -3.5 * sc, zBack + 1), to = world(true, V(x * upper.A, 3.5 * sc, zBack + 1));
      const mid = from.clone().lerp(to, 0.5).add(V(x * 1.5, 0, -3 * sc));
      s.mesh(sweep([from, mid, to], (t) => [4 * sc, (4.2 - Math.sin(t * Math.PI) * 1.2) * sc], { radial: 12, normal: V(1, 0, 0), color: () => gumDeep.clone().lerp(gumColor, 0.3) }), gumPaint);
    }

    if (a.mouth === 'tongue') {
      const tongue = new THREE.Color('#e06a78');
      s.mesh(sweep([V(0, 1, zBack + 2), V(0, 7 * sc, lower.B * 0.35), V(0, 10.5 * sc, lower.B + 1), V(0, 6 * sc, lower.B + 10 * sc), V(0, 0, lower.B + 15 * sc)], (t) => [mix(4.2, 2.4, t) * sc, mix(10, 6.5, Math.pow(t, 2)) * sc], { radial: 14, steps: 30, color: (t) => tongue.clone().lerp(new THREE.Color('#b8404e'), clamp01(0.5 - t + random() * 0.1)) }), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3 }));
    }

    const floor = (1.3 - 9.5 * sc);
    if (a.state === 'lunch') {
      const leaf = new THREE.MeshStandardMaterial({ color: '#2f6b2a', roughness: 0.6 });
      const crumb = new THREE.MeshStandardMaterial({ color: '#d9b06a', roughness: 0.9 });
      const bits = 3 + Math.round(mood.density * 4);
      for (let i = 0; i < bits; i++) {
        const jaw = i % 3 === 2 ? lower : upper;
        const tooth = jaw.placed[Math.floor(random() * Math.min(6, jaw.placed.length))];
        if (!tooth) continue;
        const at = world(jaw === upper, facePoint(tooth, 0.35 + random() * 0.3, 1.6 * sc, (random() - 0.5) * 0.9));
        const bit = s.mesh(lump((i === 0 ? 2.4 : 1.2) * sc, random, 0.3, 1), i % 2 ? crumb : leaf, [at.x, at.y, at.z]);
        bit.scale.set(1, i === 0 ? 1.5 : 0.8, 0.5);
        bit.rotation.y = Math.atan2(at.x, at.z);
      }
    }
    if (sore) {
      const tooth = handles[`u${lostSide}:2`] ?? upper.placed[0];
      if (tooth) {
        const at = world(true, facePoint(tooth, 0.02, 1.6 * sc));
        const blood = new THREE.MeshStandardMaterial({ color: '#8a0b14', roughness: 0.1 });
        s.ball([1.1 * sc, 1.5 * sc, 1 * sc], [at.x, at.y - 1.6 * sc, at.z + 0.4], blood, 10);
        s.ball([0.7 * sc, 2.4 * sc, 0.6 * sc], [at.x, at.y - 0.2, at.z + 0.2], blood, 10);
      }
    }
    if (a.state === 'popped') {
      const at: [number, number, number] = [lostSide * 8 * sc, floor + 0.8 * sc, upper.B + 16 * sc + random() * 5];
      const band = s.ball([2.5 * sc, 0.9 * sc, 2.3 * sc], at, new THREE.MeshStandardMaterial({ color: poppedColor, roughness: 0.4 }), 12);
      band.rotation.y = random() * 3;
      const lost = s.box([2.4 * sc, 1.5 * sc, 1.6 * sc], [at[0], at[1] + 0.9 * sc, at[2]], steel);
      lost.rotation.y = band.rotation.y;
    }
    if (a.extras === 'elastics') {
      const latex = new THREE.MeshStandardMaterial({ color: '#e0a640', roughness: 0.35, emissive: '#7a4a08', emissiveIntensity: 0.3 });
      for (const side of [-1, 1]) {
        const top = handles[`u${side}:2`], bottom = handles[`l${side}:5`];
        if (!top || !bottom) continue;
        const from = world(true, facePoint(top, 0.5, 2.2 * sc)), to = facePoint(bottom, 0.5, 2.2 * sc);
        for (const offset of [-0.9, 0.9]) s.mesh(sweep([from.clone().add(V(0, offset * sc, 0)), from.clone().lerp(to, 0.5).add(V(side * 1.5 * sc, offset * sc, 0)), to.clone().add(V(0, offset * sc, 0))], () => 0.4 * sc, { radial: 6 }), latex);
      }
    }
    if (a.extras === 'headgear') {
      const bow = new THREE.MeshStandardMaterial({ color: '#b9c1c6', metalness: 0.8, roughness: 0.25 });
      const y = Y + open * 0.55 - 5.5 * sc, front = upper.B + 7 * sc, wide = upper.A + 19 * sc, tail = zBack - 14 * sc;
      s.mesh(sweep([V(-wide, y, tail), V(-wide, y, zBack + 8 * sc), V(-wide * 0.8, y, front * 0.75), V(0, y, front + 2), V(wide * 0.8, y, front * 0.75), V(wide, y, zBack + 8 * sc), V(wide, y, tail)], () => 1.05 * sc, { radial: 8, steps: 60 }), bow);
      s.mesh(sweep([V(-upper.A - 4 * sc, y, zBack + 3), V(-upper.A * 0.9, y, front * 0.72), V(0, y, front + 1.5), V(upper.A * 0.9, y, front * 0.72), V(upper.A + 4 * sc, y, zBack + 3)], () => 0.75 * sc, { radial: 6, steps: 40 }), bow);
      s.ball([2.4 * sc, 1.6 * sc, 1.6 * sc], [0, y, front + 2], bow, 10);
      const strapColor = new THREE.Color(mood.cheer > 0.5 ? '#2f6fd0' : '#3b4a66');
      s.mesh(sweep([V(-wide, y, tail + 2), V(-wide * 0.82, y, tail - 22 * sc), V(0, y, tail - 34 * sc), V(wide * 0.82, y, tail - 22 * sc), V(wide, y, tail + 2)], () => [6.5 * sc, 0.9 * sc], { radial: 10, steps: 40, color: (t) => strapColor.clone().offsetHSL(0, 0, Math.sin(t * 90) * 0.03) }), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
    }
    if (a.extras === 'retainer') {
      const retainer = new THREE.Group();
      const hue = ['#f27fa5', '#6fd0c4', '#b48cf0', '#f5c84a'][Math.floor(random() * 4)];
      const acrylic = new THREE.MeshStandardMaterial({ color: hue, roughness: 0.22, emissive: hue, emissiveIntensity: 0.12 });
      const outline = archPath(upper.A * 0.86, upper.B * 0.82, upper.reach * 0.8, 0, 30);
      const palate = new THREE.Mesh(plate(outline, 2.2 * sc, 0.7), acrylic);
      palate.position.y = 2.6 * sc;
      retainer.add(palate);
      retainer.add(new THREE.Mesh(sweep(archPath(upper.A * 0.98, upper.B * 0.98, upper.reach * 0.42, 6 * sc, 16), () => 0.5 * sc, { radial: 6 }), wirePaint));
      for (const x of [-1, 1]) {
        const end = archPath(upper.A * 0.98, upper.B * 0.98, upper.reach * 0.42, 6 * sc, 2)[x < 0 ? 0 : 2];
        retainer.add(new THREE.Mesh(sweep([end, end.clone().add(V(x * 1.5, 2.5 * sc, -2)), end.clone().add(V(-x * 2, -4 * sc, -5))], () => 0.5 * sc, { radial: 6 }), wirePaint));
      }
      retainer.position.set(upper.A * 2 + 16 * sc, floor, 4);
      retainer.rotation.y = -0.5 + random() * 0.6;
      s.root.add(retainer);
    }

    s.root.traverse((node) => { node.castShadow = node.receiveShadow = true; });
    const thing = s.finish();
    const outer = new THREE.Group();
    outer.name = 'REV_braces_2';
    outer.add(thing.object);
    outer.scale.setScalar(0.001 * (({ macro: 1, tabletop: 1.4, room: 12 } as Record<string, number>)[context.scale] ?? 12));
    return { object: outer, dispose: thing.dispose };
  },
});
