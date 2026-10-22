import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

const SCHEMES: Record<string, readonly (readonly [string, string])[]> = {
  mixed: [['#b3312a', '#e9dfc6'], ['#2f5d8c', '#e6e1cf'], ['#d9b441', '#26262a'], ['#4d7a45', '#e3c95a'], ['#b3312a', '#26262a'], ['#e9dfc6', '#2f5d8c']],
  red: [['#b3312a', '#8e241f'], ['#b3312a', '#e9dfc6'], ['#9c2a22', '#26262a']],
  'black-yellow': [['#26262a', '#d9b441'], ['#d9b441', '#26262a']],
  'blue-white': [['#2f5d8c', '#e6e1cf'], ['#e6e1cf', '#2f5d8c'], ['#24476b', '#8fb0cf']],
  plain: [['#b89c6e', '#a58a5f'], ['#c2a87c', '#8f7650'], ['#9c8460', '#b89c6e']],
};
const DEVICES = ['quartered', 'swirl', 'cross', 'band', 'rays', 'halves'] as const;
type Device = (typeof DEVICES)[number];

export default defineThing({
  questions: {
    arrangement: choice('How are the shields set down?', {
      tripod: 'Leaned in a ring around a cone of spears lashed together at the top.',
      rail: 'Leaned in an overlapping row against a timber rail, like outside a hall door.',
      heap: 'Dumped flat in a careless overlapping heap on the ground.',
      marker: 'A single shield hung on one spear driven into the earth with a helmet on top: a fallen man\'s marker.',
    }),
    aftermath: choice('Is this before the fight or after it?', {
      before: 'Before: every shield whole, paint clean, edges sharp.',
      arrows: 'After a hail of arrows: whole shields bristling with shafts.',
      hacked: 'After hand-to-hand: boards split and hacked, rims torn, a few arrows.',
      routed: 'After a defeat: most shields broken, spears snapped, fragments on the ground.',
    }),
    colours: choice('How are the shields painted?', {
      mixed: 'Every shield different: reds, blues, yellows, greens, a gathered war band.',
      red: 'All red, one lord\'s household.',
      'black-yellow': 'Black and yellow, stark and wasp-like.',
      'blue-white': 'Blue and white, cold and sea-coloured.',
      plain: 'Unpainted linden boards and rawhide, poor men\'s shields.',
    }),
    device: choice('What pattern do the faces carry?', {
      mixed: 'A different pattern on each.',
      quartered: 'Quartered in two colours.',
      swirl: 'A whirling pinwheel of curved segments.',
      cross: 'A broad cross.',
      band: 'A plain field with a contrasting rim band.',
      rays: 'A sunburst of pointed rays.',
    }),
    extras: choice('What else stands with the shields and spears?', {
      nothing: 'Nothing but the spears.',
      axe: 'A long bearded axe.',
      sword: 'A sword and a bearded axe.',
      banner: 'A raven banner on its pole.',
      helmets: 'Iron helmets with nose guards set down on top.',
    }),
    count: score('How many shields are there?', ['Two', 'Four', 'Six', 'Nine or more']),
    spears: score('How many spears?', ['One or two', 'A handful', 'A bristling sheaf']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const iron = s.material('#6b6e72', { metalness: 0.65, roughness: 0.42 });
    const steel = s.material('#b9bdc1', { metalness: 0.75, roughness: 0.3 });
    const ash = s.material('#b79a6d');
    const darkWood = s.material('#5a4630');
    const hide = s.material('#4a3a2a');
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const damageLevel = { before: 0, arrows: 0.15, hacked: 0.6, routed: 0.9 }[a.aftermath];
    const arrowLevel = { before: 0, arrows: 1, hacked: 0.35, routed: 0.5 }[a.aftermath];

    const place = (group: THREE.Object3D, from: P3, to: P3) => {
      const start = new THREE.Vector3(...from), dir = new THREE.Vector3(...to).sub(start).normalize();
      group.position.copy(start);
      group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      s.root.add(group);
      return group;
    };

    const paintFace = (pair: readonly [string, string], device: Device) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const [c1, c2] = pair;
      ctx.fillStyle = c1; ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = c2;
      ctx.translate(128, 128);
      ctx.rotate(random() * Math.PI);
      if (device === 'quartered') { ctx.fillRect(-128, -128, 128, 128); ctx.fillRect(0, 0, 128, 128); }
      if (device === 'halves') ctx.fillRect(-180, 0, 360, 180);
      if (device === 'cross') { ctx.fillRect(-26, -180, 52, 360); ctx.fillRect(-180, -26, 360, 52); }
      if (device === 'band') { ctx.beginPath(); ctx.arc(0, 0, 128, 0, 7); ctx.arc(0, 0, 92, 0, 7, true); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 50, 0, 7); ctx.arc(0, 0, 40, 0, 7, true); ctx.fill(); }
      if (device === 'rays') for (let i = 0; i < 12; i += 1) { ctx.save(); ctx.rotate((i / 12) * Math.PI * 2); ctx.beginPath(); ctx.moveTo(-17, 30); ctx.lineTo(17, 30); ctx.lineTo(0, 124); ctx.fill(); ctx.restore(); }
      if (device === 'swirl') {
        const arms = 8, twist = 1.1, at = (angle: number, r: number): [number, number] => [Math.cos(angle) * r, Math.sin(angle) * r];
        for (let i = 0; i < arms; i += 2) {
          const a0 = (i / arms) * Math.PI * 2, a1 = ((i + 1) / arms) * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(...at(a0 + twist * 0.2, 70), ...at(a0 + twist, 135));
          ctx.lineTo(...at(a1 + twist, 135));
          ctx.quadraticCurveTo(...at(a1 + twist * 0.2, 70), 0, 0);
          ctx.fill();
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // Board seams, scuffs and fading.
      ctx.strokeStyle = 'rgba(30,22,14,0.3)'; ctx.lineWidth = 1.5;
      for (let x = 20; x < 256; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 2, 256); ctx.stroke(); }
      ctx.fillStyle = `rgba(150,140,125,${mood.wear * 0.4})`; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(190,170,130,0.75)';
      for (let i = 0; i < (mood.wear * 10 + damageLevel * 16); i++) {
        const x = random() * 256, y = random() * 256, len = 10 + random() * 40, angle = random() * 6.3;
        ctx.lineWidth = 1 + random() * 2.5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len); ctx.stroke();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    /** One shield, facing +z, centred on its boss. */
    const shield = (radius: number, broken: number, arrows: number) => {
      const g = new Sculpture(context);
      const pair = pick(SCHEMES[a.colours]);
      const device = a.device === 'mixed' ? pick(DEVICES) : a.device;
      const points: THREE.Vector2[] = [];
      const notchAt = random() * Math.PI * 2, notchWide = broken > 0.5 ? mix(0.35, 1.3, random()) * broken : 0;
      const chord = broken > 0.8 && random() < 0.5 ? mix(0.1, 0.6, random()) * radius : radius * 2;
      const n = 56;
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2;
        const delta = Math.abs(((angle - notchAt + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        let r = radius;
        if (delta < notchWide) r = radius * mix(0.12, 1, Math.pow(delta / notchWide, 0.7)) * (0.92 + random() * 0.08);
        let x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (x > chord) { x = chord + (random() - 0.5) * 0.03; }
        points.push(new THREE.Vector2(x, y));
      }
      const shape = new THREE.Shape(points);
      const boards = new THREE.ExtrudeGeometry(shape, { depth: 0.022, bevelEnabled: false, curveSegments: 1 });
      const uv = boards.attributes.uv, at = boards.attributes.position;
      for (let i = 0; i < at.count; i++) uv.setXY(i, at.getX(i) / (radius * 2) + 0.5, at.getY(i) / (radius * 2) + 0.5);
      g.mesh(boards, [new THREE.MeshStandardMaterial({ map: paintFace(pair, device), roughness: 0.75 }), ash] as unknown as THREE.Material, [0, 0, -0.011]);
      const back = g.mesh(new THREE.ShapeGeometry(shape), s.material('#a58a5f', { side: THREE.DoubleSide }), [0, 0, -0.0125]);
      back.castShadow = false;
      const cutAngle = chord < radius ? Math.acos(chord / radius) + 0.12 : 0;
      if (notchWide === 0 && !cutAngle) g.ring(radius, 0.014, [0, 0, 0], hide);
      else if (cutAngle) g.mesh(new THREE.TorusGeometry(radius, 0.014, 6, 40, Math.PI * 2 - cutAngle * 2), hide).rotation.z = cutAngle;
      else g.mesh(new THREE.TorusGeometry(radius, 0.014, 6, 40, Math.max(0.5, Math.PI * 2 - notchWide * 2)), hide).rotation.z = notchAt + notchWide;
      if (chord > 0.14) {
        g.cylinder(0.095, 0.1, 0.012, [0, 0, 0.017], iron, 16).rotation.x = Math.PI / 2;
        g.ball([0.075, 0.075, 0.07], [0, 0, 0.02], iron, 12);
      }
      g.box([0.03, radius * 1.5, 0.02], [0, 0, -0.025], darkWood);
      for (let i = 0; i < arrows; i++) {
        const angle = random() * 6.3, r = radius * (0.25 + random() * 0.6);
        const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
        if (x > chord - 0.05) continue;
        const tip: P3 = [x, y, 0], tail: P3 = [x + (random() - 0.5) * 0.3, y + 0.12 + random() * 0.3, 0.5 + random() * 0.18];
        g.rod(tip, tail, 0.007, ash);
        const feather = g.rod([mix(tip[0], tail[0], 0.78), mix(tip[1], tail[1], 0.78), mix(tip[2], tail[2], 0.78)], tail, 0.028, s.material(pick(['#e6e1cf', '#7a7468', '#b3312a'])), 0.02);
        feather.scale.z = 0.15;
      }
      return g.root;
    };

    const spear = (length: number, snapped: boolean) => {
      const g = new Sculpture(context);
      const len = snapped ? length * mix(0.3, 0.65, random()) : length;
      g.cylinder(0.014, 0.018, len, [0, len / 2, 0], ash, 7);
      if (!snapped) {
        g.cylinder(0.012, 0.02, 0.1, [0, len + 0.03, 0], iron, 7);
        const head = g.cylinder(0, 0.04, 0.34, [0, len + 0.24, 0], steel, 4);
        head.scale.z = 0.3;
        const barb = g.cylinder(0.04, 0.012, 0.07, [0, len + 0.105, 0], steel, 4);
        barb.scale.z = 0.3;
      }
      return g.root;
    };

    const axe = () => {
      const g = new Sculpture(context);
      g.cylinder(0.016, 0.02, 1.15, [0, 0.575, 0], darkWood, 8);
      const blade = new THREE.Shape([[0, 0.06], [0.1, 0.09], [0.24, 0.14], [0.27, 0], [0.24, -0.2], [0.14, -0.1], [0.08, -0.05], [0, -0.05]].map(([x, y]) => new THREE.Vector2(x, y)));
      g.mesh(new THREE.ExtrudeGeometry(blade, { depth: 0.016, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.006, bevelSegments: 1 }), steel, [0.01, 1.06, -0.008]);
      g.box([0.05, 0.12, 0.04], [0, 1.065, 0], iron);
      return g.root;
    };

    const sword = () => {
      const g = new Sculpture(context);
      g.box([0.055, 0.78, 0.012], [0, 0.39, 0], steel);
      g.cylinder(0, 0.028, 0.07, [0, -0.03, 0], steel, 4).rotation.z = Math.PI;
      g.box([0.19, 0.03, 0.035], [0, 0.795, 0], s.material('#9a7a34', { metalness: 0.6, roughness: 0.4 }));
      g.cylinder(0.016, 0.018, 0.1, [0, 0.86, 0], hide, 8);
      g.ball([0.045, 0.03, 0.025], [0, 0.925, 0], s.material('#9a7a34', { metalness: 0.6, roughness: 0.4 }), 8);
      return g.root;
    };

    const helmet = (at: P3) => {
      const g = new Sculpture(context);
      g.lathe([[0.115, 0], [0.118, 0.06], [0.1, 0.13], [0.06, 0.18], [0.0, 0.2]], iron);
      g.ring(0.117, 0.01, [0, 0.005, 0], steel).rotation.x = Math.PI / 2;
      g.box([0.028, 0.13, 0.012], [0, -0.05, 0.116], steel);
      g.box([0.012, 0.2, 0.012], [0, 0.11, 0.09], steel).rotation.x = -0.75;
      g.root.position.set(...at);
      g.root.rotation.set((random() - 0.5) * 0.3, random() * 6.3, (random() - 0.5) * 0.3);
      s.root.add(g.root);
    };

    const banner = (from: P3, to: P3) => {
      const g = new Sculpture(context);
      g.cylinder(0.018, 0.022, 2.9, [0, 1.45, 0], ash, 8);
      g.cylinder(0, 0.03, 0.2, [0, 3.0, 0], steel, 4).scale.z = 0.3;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = mood.cheer > 0.4 ? '#b3312a' : '#e6e1cf'; ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#1b1a1c';
      ctx.beginPath(); ctx.ellipse(52, 60, 30, 15, -0.3, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(40, 55); ctx.lineTo(18, 18); ctx.lineTo(62, 44); ctx.fill();
      ctx.beginPath(); ctx.moveTo(56, 66); ctx.lineTo(60, 108); ctx.lineTo(74, 62); ctx.fill();
      ctx.beginPath(); ctx.arc(84, 46, 11, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(92, 42); ctx.lineTo(112, 50); ctx.lineTo(90, 53); ctx.fill();
      ctx.beginPath(); ctx.moveTo(26, 62); ctx.lineTo(4, 82); ctx.lineTo(8, 62); ctx.fill();
      ctx.strokeStyle = '#d9b441'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 122, 122);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      // A quarter-circle pennon with a scalloped edge.
      const flagShape = new THREE.Shape();
      flagShape.moveTo(0, 0); flagShape.lineTo(0, 0.75);
      for (let i = 1; i <= 8; i++) { const angle = (i / 8) * Math.PI * 0.5; flagShape.lineTo(Math.sin(angle) * 0.85 * (i % 2 ? 0.94 : 1), Math.cos(angle) * 0.75 * (i % 2 ? 0.94 : 1)); }
      flagShape.lineTo(0, 0);
      const flagGeometry = new THREE.ShapeGeometry(flagShape);
      const uv = flagGeometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 0.85, uv.getY(i) / 0.75);
      const flag = g.mesh(flagGeometry, new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, roughness: 0.95 }), [0.02, 2.05, 0]);
      place(g.root, from, to);
      return flag;
    };

    const count = a.arrangement === 'marker' ? 1 : Math.round(mix(2, 9, a.count) + (mood.density - 0.5) * 2);
    const spearCount = Math.max(1, Math.round(mix(1.5, 9, a.spears)));
    const newShield = () => shield(mix(0.4, 0.47, random()), random() < damageLevel ? 0.55 + random() * 0.45 : 0, Math.round(arrowLevel * random() * 5));
    const lean = (object: THREE.Object3D, at: P3, facing: number, tilt: number) => {
      object.rotation.order = 'YXZ';
      object.rotation.set(-tilt, facing, random() * 6.3);
      object.position.set(...at);
      s.root.add(object);
    };
    const snapped = () => random() < (a.aftermath === 'routed' ? 0.6 : a.aftermath === 'hacked' ? 0.2 : 0);
    let extraSpot: { foot: P3; top: P3 } = { foot: [0.9, 0, 0.5], top: [0.6, 1.0, 0.2] };
    let helmetSpots: P3[] = [];
    let flag: THREE.Mesh | null = null;

    if (a.arrangement === 'tripod') {
      const legs = Math.max(3, spearCount);
      for (let i = 0; i < legs; i++) {
        const angle = (i / legs) * Math.PI * 2 + 0.4, foot: P3 = [Math.cos(angle) * 0.62, 0, Math.sin(angle) * 0.62];
        const apex: P3 = [-foot[0] * 0.12 + (random() - 0.5) * 0.05, 1.85, -foot[2] * 0.12 + (random() - 0.5) * 0.05];
        place(spear(2.3 + random() * 0.3, snapped()), foot, apex);
      }
      s.ring(0.06, 0.018, [0, 1.72, 0], hide).rotation.x = Math.PI / 2;
      s.ring(0.065, 0.018, [0, 1.76, 0], hide).rotation.x = Math.PI / 2;
      for (let i = 0; i < count; i++) {
        const ringIndex = i < 6 ? 0 : 1, per = ringIndex ? count - 6 : Math.min(count, 6);
        const angle = (i / per) * Math.PI * 2 + ringIndex * 0.5 + (random() - 0.5) * 0.25, tilt = mix(0.3, 0.5, random());
        const r = 0.62 + ringIndex * 0.3 + random() * 0.05;
        lean(newShield(), [Math.sin(angle) * r, 0.45 * Math.cos(tilt) + 0.01, Math.cos(angle) * r], angle, tilt);
      }
      extraSpot = { foot: [0.55, 0, 1.25], top: [0.3, 1.02, 0.72] };
      helmetSpots = [[-0.75, 0, 1.0], [1.15, 0, 0.3], [-1.2, 0, -0.1]];
    }

    if (a.arrangement === 'rail') {
      const width = Math.max(1.6, count * 0.5 + 0.7), railY = 0.72;
      for (const x of [-width / 2 + 0.1, width / 2 - 0.1]) for (const z of [-1, 1]) s.rod([x, 0, z * 0.32], [x, railY + 0.22, -z * 0.1], 0.035, darkWood);
      s.rod([-width / 2 - 0.15, railY + 0.05, 0], [width / 2 + 0.15, railY + 0.05, 0], 0.04, darkWood);
      for (let i = 0; i < count; i++) {
        const x = (i - (count - 1) / 2) * 0.5, tilt = 0.36 + random() * 0.06;
        lean(newShield(), [x, 0.45 * Math.cos(tilt) + 0.01, 0.34 + (i % 2) * 0.05], (random() - 0.5) * 0.15, tilt);
      }
      for (let i = 0; i < spearCount; i++) {
        const x = (random() - 0.5) * width * 0.9, back = random() < 0.7;
        place(spear(2.2 + random() * 0.4, snapped()), [x + (random() - 0.5) * 0.3, 0, back ? -0.55 - random() * 0.2 : 0.75], [x, railY + 0.09, back ? -0.04 : 0.1]);
      }
      extraSpot = { foot: [width / 2 + 0.35, 0, 0.5], top: [width / 2 + 0.12, 0.9, 0.05] };
      helmetSpots = [[-width / 2 + 0.1, railY + 0.26, 0], [width / 2 - 0.1, railY + 0.26, 0], [0, railY + 0.1, 0]];
    }

    if (a.arrangement === 'heap') {
      for (let i = 0; i < count; i++) {
        const object = newShield(), r = 0.2 + random() * 0.45 * Math.sqrt(count / 4), angle = random() * 6.3;
        object.rotation.order = 'YXZ';
        object.rotation.set(-Math.PI / 2 + (random() - 0.5) * (i ? 0.5 : 0.1), random() * 6.3, random() * 6.3);
        object.position.set(Math.cos(angle) * r, 0.04 + i * 0.055 + (i ? 0.06 : 0), Math.sin(angle) * r);
        s.root.add(object);
      }
      for (let i = 0; i < spearCount; i++) {
        const angle = random() * Math.PI, x = (random() - 0.5) * 0.8, z = (random() - 0.5) * 0.8, len = 1.2;
        place(spear(2.2 + random() * 0.4, snapped()), [x - Math.cos(angle) * len, 0.03 + random() * 0.02, z - Math.sin(angle) * len * 0.6], [x + Math.cos(angle) * len, 0.05 + count * 0.05 * random(), z + Math.sin(angle) * len * 0.6]);
      }
      extraSpot = { foot: [0.95, 0.02, 0.7], top: [0.2, 0.1 + count * 0.05, 0.25] };
      helmetSpots = [[0.1, 0.1 + count * 0.06, 0], [-0.9, 0, 0.7], [0.9, 0, -0.5]];
    }

    if (a.arrangement === 'marker') {
      const top: P3 = [(random() - 0.5) * 0.25, 2.1, -0.12];
      place(spear(2.15, false), [0, -0.3, 0], top);
      s.ball([0.5, 0.14, 0.42], [0, 0, 0], s.material('#6f6a55'), 14);
      for (let i = 0; i < 7; i++) { const angle = (i / 7) * 6.3; s.ball([0.1, 0.07, 0.09], [Math.cos(angle) * 0.3, 0.1, Math.sin(angle) * 0.26], s.material(pick(['#8f9090', '#77797a', '#a3a29c'])), 7); }
      lean(newShield(), [top[0] * 0.5, 1.0, 0.07], (random() - 0.5) * 0.3, 0.08);
      helmet([top[0] * 0.92, 2.02, top[2] * 0.9]);
      for (let i = 1; i < spearCount && i < 4; i++) place(spear(2.2, snapped()), [(i % 2 ? 1 : -1) * (0.3 + i * 0.12), -0.2, -0.15], [(i % 2 ? 1 : -1) * (0.36 + i * 0.16), 1.6, -0.3]);
      extraSpot = { foot: [0.5, 0, 0.4], top: [0.2, 0.9, 0.12] };
      helmetSpots = [];
    }

    if (a.extras === 'axe' || a.extras === 'sword') place(axe(), extraSpot.foot, extraSpot.top).rotateY(random() * 6.3);
    if (a.extras === 'sword') {
      const x = -extraSpot.foot[0] - 0.1;
      const blade = place(sword(), [x, 0.93, extraSpot.foot[2] * 0.8], [x - 0.08, 0, extraSpot.foot[2] * 0.8 + 0.1]);
      blade.rotateY(0.4);
    }
    if (a.extras === 'banner') flag = banner([-extraSpot.foot[0] * 0.5, -0.2, -0.5], [-extraSpot.foot[0] * 0.5 - 0.15, 2, -0.6]);
    if (a.extras === 'helmets') for (const spot of helmetSpots.slice(0, 1 + Math.round(mood.density * 2))) helmet(spot);

    // After the fight: spent arrows in the turf and splinters of board.
    const litter = Math.round((arrowLevel * 6 + damageLevel * 4) * mix(0.5, 1.4, mood.density));
    for (let i = 0; i < litter; i++) {
      const angle = random() * 6.3, r = 0.9 + random() * 0.7, x = Math.cos(angle) * r, z = Math.sin(angle) * r * 0.8 + 0.2;
      if (i % 3 !== 2 || damageLevel < 0.5) {
        const topPoint: P3 = [x + (random() - 0.5) * 0.3, 0.45 + random() * 0.2, z + (random() - 0.5) * 0.3];
        s.rod([x, 0, z], topPoint, 0.007, ash);
        s.rod([mix(x, topPoint[0], 0.75), topPoint[1] * 0.75, mix(z, topPoint[2], 0.75)], topPoint, 0.026, s.material('#e6e1cf'), 0.018).scale.z = 0.15;
      } else {
        const board = s.box([0.12 + random() * 0.1, 0.02, 0.3 + random() * 0.25], [x, 0.012, z], s.material(pick(SCHEMES[a.colours])[0]));
        board.rotation.y = random() * 3;
      }
    }

    const sway = mix(0.02, 0.2, mood.energy);
    return s.finish({ update: flag ? (_dt, time) => { flag!.rotation.y = Math.sin(time * 1.7) * sway; } : undefined });
  },
});
