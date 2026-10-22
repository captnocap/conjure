import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul } from '@conjure/kit';
import { type ToothKind, archLength, archPath, archSpots, paint, plate, sweep } from './teeth';
import { archTeeth, gumRidge } from './arch';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const THEMES = {
  classic: { gum: '#d81f26', tooth: '#fbfbf4', glow: '#000000', power: 0, metal: 0 },
  zombie: { gum: '#55c93a', tooth: '#ece47c', glow: '#3cff3c', power: 0.5, metal: 0 },
  gold: { gum: '#d9a82a', tooth: '#f6e29a', glow: '#b97a10', power: 0.2, metal: 0.8 },
  pink: { gum: '#ff7fb2', tooth: '#ffffff', glow: '#000000', power: 0, metal: 0 },
  bone: { gum: '#232124', tooth: '#efe8d2', glow: '#000000', power: 0, metal: 0 },
} as const;

export default defineThing({
  questions: {
    doing: choice('What is it doing right now?', {
      chatter: 'Chattering flat out, caught mid-hop with its jaws flung open.',
      wound: 'Wound up and held still, jaws shut, about to go off.',
      fallen: 'Fallen on its side, feet kicking, still clacking uselessly.',
      marching: 'Marching steadily forward, jaws snapping in time.',
    }),
    colour: choice('What colours is it?', {
      classic: 'Classic glossy red gums and bright white teeth.',
      zombie: 'Glow-in-the-dark green gums with sickly yellow teeth.',
      gold: 'A gold-plated novelty, gums and teeth all gilt.',
      pink: 'Bubblegum pink with white teeth.',
      bone: 'Black gums and bone-coloured teeth, a skeleton edition.',
    }),
    feet: choice('What is it standing on?', {
      bare: 'Two bare rounded plastic feet.',
      shoes: 'Two little lace-up shoes.',
      chicken: 'Yellow three-toed chicken feet.',
      none: 'No feet: it sits straight on its lower jaw.',
    }),
    teeth: choice('What style are the teeth?', {
      human: 'Big even human teeth, a cartoon grin.',
      vampire: 'Human teeth with two long vampire fangs.',
      monkey: 'A monkey grin: gappy teeth and four big canines.',
      shark: 'Rows of pointed triangles.',
      buck: 'Two enormous buck teeth in front.',
    }),
    hold: choice('If it is upright, what has it got hold of?', {
      nothing: 'Nothing: free to chatter.',
      finger: 'A rubber joke finger, bitten crosswise.',
      pencil: 'A chewed yellow pencil.',
      banknote: 'A stolen banknote.',
      cigar: 'A cigar sticking out the front.',
    }),
    key: choice('What does the wind-up key look like?', {
      butterfly: 'A butterfly key with two round brass wings.',
      ring: 'A single large ring.',
      tbar: 'A plain T-bar.',
    }),
    eyes: noul('Does it have googly eyes on springs?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const theme = THEMES[a.colour];
    const gumColor = new THREE.Color(theme.gum).lerp(new THREE.Color('#7d7468'), mood.wear * 0.3);
    const toothColor = new THREE.Color(theme.tooth).lerp(new THREE.Color('#c9b57a'), mood.wear * 0.4);
    const gumPaint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.2, 0.6, mood.wear), metalness: theme.metal, emissive: theme.glow, emissiveIntensity: theme.power });
    const platePaint = new THREE.MeshStandardMaterial({ color: gumColor, roughness: mix(0.2, 0.6, mood.wear), metalness: theme.metal, emissive: theme.glow, emissiveIntensity: theme.power });
    const enamel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.15, 0.5, mood.wear), metalness: theme.metal * 0.6 });
    const brass = s.material('#c79a35', { metalness: 0.85, roughness: mix(0.22, 0.55, mood.wear), emissive: '#6b4708', emissiveIntensity: 0.2 });
    const dark = s.material('#3a3d42', { metalness: 0.6, roughness: 0.45 });

    const monkey = a.teeth === 'monkey';
    const A = monkey ? 33 : 30, B = 34;
    const list: (readonly [ToothKind, number])[] = [['block', 10.5], ['block', 10], ['block', 10], ['block', 11], ['block', 11]];
    const gap = monkey ? 1.2 : 0.3;
    const reach = archLength(list, 1, gap) + 2;
    const spots = archSpots(A, B, list, 1, gap);
    const buildJaw = (upper: boolean) => {
      const group = new THREE.Group();
      const plan = (spot: (typeof spots)[number]) => {
        let kind: ToothKind = 'block', tall = upper ? 1.05 : 0.95, wide = 0.94, deep = 1;
        if (a.teeth === 'vampire' && upper && spot.order === 2) { kind = 'fang'; tall = 1.05; wide = 0.85; deep = 1.3; }
        if (monkey && spot.order === 2) { kind = 'canine'; tall = upper ? 1.45 : 1.2; wide = 1.05; }
        if (monkey && spot.order !== 2) wide = 0.84;
        if (a.teeth === 'shark') { kind = 'canine'; tall = (spot.order % 2 ? 0.8 : 1.05) * (upper ? 1 : 0.85); wide = 1; }
        if (a.teeth === 'buck' && upper && spot.order === 0) { tall = 1.75; wide = 1.02; deep = 1.2; }
        if (a.teeth === 'buck' && upper && spot.order === 1) wide = 0.8;
        return { kind, tall, wide, deep, lift: -1, lean: (random() - 0.5) * 0.04 * (1 + mood.wear * 3), shade: (t: number) => toothColor.clone().lerp(new THREE.Color('#9a8a5a'), clamp01(mood.wear * 0.5 * (1 - t) + random() * 0.03)) };
      };
      const teeth = archTeeth(spots, plan, { flip: upper, detail: 4 });
      if (teeth.geometry) group.add(new THREE.Mesh(teeth.geometry, enamel));
      group.add(new THREE.Mesh(gumRidge(A, B, reach, upper ? -1 : 1, 15, 9.5, () => gumColor.clone().offsetHSL(0, 0, (random() - 0.5) * 0.03), { flip: upper, scallop: 10 }), gumPaint));
      const lid = new THREE.Mesh(plate(archPath(A, B, reach, 0, 36, -1.5), 4.5, 2), platePaint);
      lid.position.y = upper ? 16.5 : -10.5;
      group.add(lid);
      return group;
    };

    const zBack = Math.min(...spots.map((spot) => spot.z)) - 5;
    const occlusal = 9, Y = 18.3 + (a.teeth === 'shark' ? -3 : 0), L = B - zBack;
    const legHigh = a.feet === 'none' ? 0 : 14;
    const toy = new THREE.Group(), body = new THREE.Group();
    const lowerJaw = buildJaw(false), upperJaw = buildJaw(true);
    const hinge = new THREE.Group();
    hinge.position.set(0, occlusal, zBack);
    upperJaw.position.set(0, Y - occlusal, -zBack);
    hinge.add(upperJaw);
    body.add(lowerJaw, hinge);

    // Clockwork between the jaws, and the key that winds it.
    const works = new Sculpture(context);
    works.box([34, 19, 17], [0, occlusal, zBack + 9], dark);
    for (const x of [-1, 1]) {
      const gear = works.cylinder(8, 8, 2, [x * 18, occlusal, zBack + 9], brass, 12);
      gear.rotation.z = Math.PI / 2;
    }
    const hingeRod = works.cylinder(2, 2, A * 2 + 6, [0, occlusal, zBack], s.material('#c9d0d4', { metalness: 0.85, roughness: 0.25 }), 10);
    hingeRod.rotation.z = Math.PI / 2;
    body.add(works.root);
    const key = new Sculpture(context);
    key.cylinder(1.8, 1.8, 24, [0, 0, -12], brass, 10).rotation.x = Math.PI / 2;
    if (a.key === 'butterfly') for (const x of [-1, 1]) { key.ring(8, 2, [x * 9.5, 0, -25], brass); key.cylinder(8, 8, 1.6, [x * 9.5, 0, -25], brass, 20).rotation.x = Math.PI / 2; }
    else if (a.key === 'ring') key.ring(13, 2.2, [0, 0, -25], brass);
    else { key.cylinder(2.6, 2.6, 34, [0, 0, -24], brass, 10).rotation.z = Math.PI / 2; for (const x of [-1, 1]) key.ball([3.6, 3.6, 3.6], [x * 17, 0, -24], brass, 10); }
    key.root.position.set(0, occlusal + 1, zBack + 2);
    body.add(key.root);

    // What it has hold of.
    const hold = a.doing === 'fallen' ? 'nothing' : a.hold;
    const gapFor = { nothing: 0, finger: 12, pencil: 7, banknote: 1.5, cigar: 11 }[hold];
    const baseAngle = gapFor ? (gapFor + 0.5) / L : 0.03;
    if (hold !== 'nothing') {
      const held = new THREE.Group();
      held.position.set(0, occlusal, zBack);
      held.rotation.x = -baseAngle / 2;
      const prop = new Sculpture(context);
      if (hold === 'finger') {
        const skin = new THREE.Color(['#e9b99a', '#c98f6c', '#8a5a3c', '#f1c9b0'][Math.floor(random() * 4)]);
        prop.mesh(sweep([V(-46, 0, 2), V(-18, 0.5, 0), V(12, 0, -1), V(36, -3, 3), V(44, -5, 5)], (t) => 6.4 * (t > 0.86 ? mix(1, 0.55, (t - 0.86) / 0.14) : 1 + 0.07 * Math.sin(t * 20)), { radial: 12, steps: 30, color: (t) => skin.clone().lerp(new THREE.Color('#8a0b14'), clamp01((0.1 - t) * 12)) }), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
        const nail = prop.ball([5, 1.2, 4.6], [38, 2.2, 3.6], prop.material('#f6e3da', { roughness: 0.25 }), 12);
        nail.rotation.z = -0.3;
        prop.ball([5.5, 5.5, 2], [-46, 0, 2], prop.material('#7d0a10', { roughness: 0.2 }), 12).rotation.y = Math.PI / 2;
      } else if (hold === 'pencil') {
        prop.cylinder(3.4, 3.4, 84, [0, 0, 0], prop.material('#eab52c', { roughness: 0.5 }), 6).rotation.z = Math.PI / 2;
        prop.cylinder(3.5, 3.5, 6, [-45, 0, 0], prop.material('#b9bcc0', { metalness: 0.7 }), 12).rotation.z = Math.PI / 2;
        prop.cylinder(3.3, 3.3, 7, [-51.5, 0, 0], prop.material('#e58a94'), 12).rotation.z = Math.PI / 2;
        prop.cylinder(3.4, 0.9, 9, [46.5, 0, 0], prop.material('#e3c08e'), 6).rotation.z = Math.PI / 2;
        prop.cylinder(0.9, 0.1, 3, [52.5, 0, 0], prop.material('#2a2a2c'), 6).rotation.z = Math.PI / 2;
        prop.root.rotation.y = (random() - 0.5) * 0.3;
      } else if (hold === 'banknote') {
        const value = ['1', '5', '20', '50', '100'][Math.floor(random() * 5)];
        const note = paint(256, 128, (ctx, w, h) => {
          ctx.fillStyle = '#b9d2a4'; ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#2f5a35'; ctx.lineWidth = 6; ctx.strokeRect(8, 8, w - 16, h - 16);
          ctx.fillStyle = '#4a7a4f'; ctx.beginPath(); ctx.ellipse(w / 2, h / 2, 34, 44, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#2f5a35'; ctx.font = 'bold 34px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          for (const [x, y] of [[36, 30], [w - 36, 30], [36, h - 30], [w - 36, h - 30]]) ctx.fillText(value, x, y);
        });
        const bill = prop.box([78, 0.7, 36], [0, 0, 12], new THREE.MeshStandardMaterial({ map: note, roughness: 0.8 }));
        bill.rotation.set(0.12, (random() - 0.5) * 0.4, (random() - 0.5) * 0.12);
      } else {
        prop.mesh(sweep([V(0, 0, -6), V(0, 0, 20), V(0, -1, 46), V(0, -2, 60)], () => 5.4, { radial: 12 }), prop.material('#6b4326', { roughness: 0.85 }));
        prop.cylinder(5.7, 5.7, 7, [0, -0.3, 22], prop.material('#b3212b'), 16).rotation.x = Math.PI / 2;
        prop.cylinder(5, 5.3, 6, [0, -2.2, 62], prop.material('#b9b5ad', { roughness: 1 }), 12).rotation.x = Math.PI / 2;
        prop.cylinder(5.2, 5.3, 2, [0, -2.05, 59], new THREE.MeshStandardMaterial({ color: '#ff5a1e', emissive: '#ff4a12', emissiveIntensity: mix(0.6, 1.6, mood.energy) }), 12).rotation.x = Math.PI / 2;
        prop.root.rotation.y = 0.35 * (random() > 0.5 ? 1 : -1);
      }
      prop.root.position.set(0, 0.6, L - 3);
      held.add(prop.root);
      body.add(held);
    }

    // Googly eyes ride on the upper jaw.
    const eyes: THREE.Group[] = [];
    if (a.eyes) {
      for (const x of [-1, 1]) {
        const eye = new Sculpture(context);
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 40; i++) points.push(V(Math.cos(i * 0.9) * 2.6, i * 0.5, Math.sin(i * 0.9) * 2.6));
        eye.mesh(sweep(points, () => 0.55, { radial: 5, steps: 80 }), dark);
        eye.ball([9, 9, 9], [0, 27, 0], eye.material('#fbfbf7', { roughness: 0.2 }), 18);
        eye.ball([4.2, 4.2, 2.4], [(random() - 0.5) * 5, 27 + (random() - 0.5) * 5, 7.6], eye.material('#111114', { roughness: 0.2 }), 12);
        eye.root.position.set(x * 13, 16, 14);
        upperJaw.add(eye.root);
        eyes.push(eye.root);
      }
    }

    // Feet.
    const feet: THREE.Group[] = [];
    if (legHigh) {
      for (const x of [-1, 1]) {
        const foot = new Sculpture(context);
        if (a.feet === 'chicken') {
          const yellow = foot.material('#f2b21c', { roughness: 0.45 });
          foot.rod([0, 0, 0], [0, -legHigh + 1.5, 0], 2, yellow);
          for (const turn of [-0.6, 0, 0.6]) foot.rod([0, -legHigh + 1.5, 0], [Math.sin(turn) * 15, -legHigh + 1.2, Math.cos(turn) * 15], 1.7, yellow, 1.1);
          foot.rod([0, -legHigh + 1.5, 0], [0, -legHigh + 1.2, -6], 1.5, yellow, 1);
        } else if (a.feet === 'shoes') {
          const hue = ['#2f6fd0', '#f2c21c', '#1d1f22', '#2f9e55', '#fbfbf4'][Math.floor(random() * 5)];
          foot.cylinder(4, 4.6, legHigh - 4, [0, -(legHigh - 4) / 2, 0], foot.material('#f4f2ea'), 12);
          foot.ball([8.5, 5.5, 14], [0, -legHigh + 5.6, 7], foot.material(hue, { roughness: 0.45 }), 16);
          foot.box([16.5, 2.2, 28], [0, -legHigh + 1.1, 7], foot.material('#f6f4ee'));
          foot.ball([7.6, 3.6, 5.5], [0, -legHigh + 4.6, 17.5], foot.material('#f6f4ee', { roughness: 0.4 }), 12);
        } else {
          foot.cylinder(4.4, 5, legHigh - 4, [0, -(legHigh - 4) / 2, 0], platePaint, 12);
          foot.ball([9, 5.2, 14.5], [0, -legHigh + 5.2, 8], platePaint, 16);
          for (const toe of [-1, 0, 1]) foot.ball([2.6, 2.6, 3], [toe * 5.2, -legHigh + 4.2, 21], platePaint, 8);
        }
        foot.root.position.set(x * 17, -15, 15);
        toy.add(foot.root);
        feet.push(foot.root);
      }
    }
    toy.add(body);
    const stance = new THREE.Group();
    stance.add(toy);
    const fallen = a.doing === 'fallen';
    if (fallen) stance.rotation.set(0, 0.3 + random() * 0.5, (random() > 0.5 ? 1 : -1) * (Math.PI / 2 - 0.12), 'YXZ');
    else stance.rotation.y = (random() - 0.5) * 0.4;
    s.root.add(stance);
    s.root.traverse((node) => { node.castShadow = node.receiveShadow = true; });

    const rate = mix(5, 17, mood.energy), swing = mix(0.25, 1, mood.energy);
    const still = a.doing === 'wound';
    const chatAmp = gapFor ? 0.03 : a.doing === 'chatter' ? 0.55 : a.doing === 'marching' ? 0.3 : fallen ? 0.22 : 0.012;
    const hopHigh = a.doing === 'chatter' ? mix(5, 16, mood.energy) : a.doing === 'marching' ? mix(1, 4, mood.energy) : 0;
    const pose = (time: number) => {
      const phase = time * rate;
      const clack = 0.5 - 0.5 * Math.cos(phase * 2);
      hinge.rotation.x = -(baseAngle + chatAmp * (still ? Math.abs(Math.sin(phase * 3)) : clack));
      const hop = Math.abs(Math.sin(phase * 0.5));
      toy.position.y = hop * hopHigh;
      toy.rotation.x = a.doing === 'chatter' ? -0.16 * Math.sin(phase * 0.5) * swing : 0;
      toy.rotation.z = a.doing === 'marching' ? 0.09 * Math.sin(phase * 0.5) : still ? Math.sin(phase * 5) * 0.006 * mood.energy : 0;
      feet.forEach((foot, index) => { foot.rotation.x = still ? 0 : Math.sin(phase * 0.5 + index * Math.PI) * (fallen ? 0.7 : 0.45) * swing; foot.position.y = -15 - (still || fallen ? 0 : hop * hopHigh * 0.25); });
      key.root.rotation.z = still ? 0.4 : phase * 0.35;
      eyes.forEach((eye, index) => { eye.rotation.z = Math.sin(phase * 0.7 + index * 2) * 0.3 * (still ? 0.15 : 1); eye.rotation.x = Math.cos(phase * 0.9 + index) * 0.25 * (still ? 0.15 : 1); });
    };
    pose(0);
    const thing = s.finish();
    pose(Math.PI / rate * 0.8);
    const outer = new THREE.Group();
    outer.name = 'REV_windup_2';
    outer.add(thing.object);
    outer.scale.setScalar(0.001 * (({ macro: 1, tabletop: 1, room: 9, street: 40 } as Record<string, number>)[context.scale] ?? 9));
    return { object: outer, update: (_dt, time) => pose(time + Math.PI / rate * 0.8), dispose: thing.dispose };
  },
});
