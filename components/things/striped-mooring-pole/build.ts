import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score, visibleBounds } from '@conjure/kit';

const COLOURS = {
  'red-white': 'Red and white candy spirals, the postcard palina.',
  'blue-white': 'Sky blue and white, a hotel landing.',
  'blue-gold': 'Deep blue wound with gold, an old noble house.',
  'green-white': 'Dark green and cream, quiet and private.',
  'black-gold': 'Black and gold, severe and ceremonial.',
  'red-gold': 'Ox-blood red and yellow, loud and proud.',
  bare: 'No paint left: bare grey oak with a ghost of old stripes.',
} as const;
const PAIRS: Record<keyof typeof COLOURS, [string, string]> = {
  'red-white': ['#c4222c', '#f2ede0'], 'blue-white': ['#3f8fd0', '#f4f1e6'], 'blue-gold': ['#1f3f8a', '#e3b53f'],
  'green-white': ['#1f5c40', '#eee6cc'], 'black-gold': ['#1c1b1f', '#dcae3a'], 'red-gold': ['#8f1d1d', '#eac24a'], bare: ['#857a6a', '#9a8f7e'],
};

type P3 = [number, number, number];

function spiral(a: string, b: string, wear: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = b;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = a;
  for (let x = -128; x < 256; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 128); ctx.lineTo(x + 32, 128); ctx.lineTo(x + 160, 0); ctx.lineTo(x + 128, 0);
    ctx.fill();
  }
  // Paint flaking back to wood as the mood wears.
  ctx.fillStyle = 'rgba(122,110,94,0.9)';
  for (let i = 0; i < wear * 90; i++) {
    const x = (i * 53) % 128, y = (i * 97) % 128;
    ctx.fillRect(x, y, 3 + (i % 5), 8 + (i % 14));
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    colours: choice('What colours are the spiral stripes?', COLOURS),
    count: choice('How many poles stand together?', {
      one: 'A single pole alone in the water.',
      two: 'A pair marking a berth between them.',
      three: 'Three in a tight group.',
      five: 'A crowd of five, a grand palace landing.',
    }),
    stance: choice('How do they stand?', {
      upright: 'Straight and proud, freshly driven.',
      splayed: 'Leaning gently apart, loosened by years of tide.',
      toppling: 'One has heeled right over and leans on the others or the water.',
      lashed: 'Leaning together and bound with rope near the top, like a bricola.',
    }),
    cap: choice('What tops each pole?', {
      ball: 'A gilded ball.',
      doge: "A gilded pointed cap shaped like the doge's horned hat.",
      crown: 'A small gilded crown.',
      flame: 'A turned gilded flame or pine-cone finial.',
      sawn: 'Nothing: sawn flat, the cap stolen or rotted off.',
    }),
    rope: choice('Is there a rope?', {
      none: 'No rope.',
      nothing: 'A rope still tied on and trailing into the water, tied to nothing.',
      coil: 'A neat coil hung over a pole, waiting for the boat to come back.',
      snapped: 'A short frayed end, snapped.',
      taut: 'A rope pulled taut off toward a boat just out of sight.',
    }),
    visitor: choice('What else is on the poles?', {
      nothing: 'Nothing.',
      gull: 'A gull standing on the tallest cap.',
      lantern: 'A small lit lantern on an iron bracket.',
      crest: 'A painted family shield nailed on.',
      wreath: 'A weathered wreath of flowers hung on one pole.',
    }),
    tide: score('Where is the tide?', ['Dead low: a tall dark band of weed and barnacles exposed', 'Mid tide', 'High: water up over the weed line']),
    shaftHeight: score('How tall are the driven poles?', ['Low working moorings', 'Full-height landing poles', 'Tall ceremonial paline']),
    spacing: score('If several poles are present, how widely do they mark the berth?', ['A tightly gathered cluster', 'A working berth', 'A broad landing entrance']),
    collars: choice('What collars reinforce the shafts?', {
      bare: 'Painted timber with no extra collars.', iron: 'Two narrow black iron straps around each pole.',
      rope: 'Three close rope turns around the lower shaft.', brass: 'Broad brass bands with a row of rivets.',
    }),
    cleats: choice('What fastening is fitted to each pole?', {
      none: 'No extra fastening.', horns: 'A small two-horned cleat on the front.',
      eye: 'A round iron mooring eye on a short bracket.', cross: 'A transverse timber pin through the pole.',
    }),
    fenders: choice('What hangs between the boat and the pole?', {
      none: 'No fenders.', tyre: 'An old dark tyre on a short hanging line.',
      timber: 'A long narrow timber rubbing block.', rope: 'A fat wrapped rope fender with rounded ends.',
    }),
    waterPatch: choice('What shape of water surrounds this small mooring study?', {
      round: 'A circular patch of green canal.', square: 'A square-cut section of canal.',
      octagon: 'An eight-sided canal section.', oval: 'An elongated oval patch of canal.',
    }),
    landing: choice('What little landing stands beside the berth?', {
      none: 'Only poles and water.', timber: 'A narrow planked landing on two piles.',
      stone: 'A raised stone ledge on two square piers.', ladder: 'A short timber landing with a water ladder.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [c1, c2] = PAIRS[a.colours];
    const striped = new THREE.MeshStandardMaterial({ map: spiral(c1, c2, a.colours === 'bare' ? 0.3 : mood.wear), roughness: mix(0.45, 0.9, mood.wear) });
    const gilt = s.material('#e9bd45', { metalness: 0.3, roughness: 0.3, emissive: '#c8962a', emissiveIntensity: mix(0.1, 0.35, mood.cheer) });
    const weed = s.material('#2f4a2c', { roughness: 1 });
    const slime = s.material('#55703a', { roughness: 1 });
    const ropeMat = s.material('#d5c79d');
    const iron = s.material('#2b2b2e');

    const n = { one: 1, two: 2, three: 3, five: 5 }[a.count];
    const layouts: Record<number, [number, number][]> = {
      1: [[0, 0]], 2: [[-0.55, 0], [0.55, 0.1]], 3: [[-0.5, 0.25], [0.5, 0.2], [0, -0.45]],
      5: [[-0.85, 0.3], [0.8, 0.35], [0, -0.5], [-0.35, 0.75], [0.95, -0.4]],
    };
    const weedTop = mix(1.15, 0.2, a.tide);
    const poles: { group: THREE.Group; height: number; radius: number; x: number; z: number }[] = [];
    layouts[n].forEach(([px, pz], index) => {
      const group = new THREE.Group();
      const spread = mix(0.72, 1.4, a.spacing), x = px * spread + (random() - 0.5) * 0.15, z = pz * spread + (random() - 0.5) * 0.15;
      group.position.set(x, 0, z);
      s.root.add(group);
      const G = <T extends THREE.Object3D>(node: T) => { group.add(node); return node; };
      const height = mix(3.3, 4.5, random()) * mix(.95, 1.18, a.shaftHeight) * (index === 0 ? 1.05 : 1), radius = 0.15 + random() * 0.025;
      const material = striped.clone();
      material.map = striped.map!.clone();
      material.map.repeat.set(index % 2 ? -2 : 2, height / 0.75);
      material.map.offset.set(random(), 0);
      G(s.cylinder(radius * 0.92, radius, height, [0, height / 2 - 0.3, 0], material, 20));
      // Tideline: dark weed sleeve, a brighter slime ring and hanging tufts.
      G(s.cylinder(radius + 0.012, radius + 0.03, weedTop + 0.3, [0, weedTop / 2 - 0.15, 0], weed, 16));
      G(s.cylinder(radius + 0.016, radius + 0.016, 0.1, [0, weedTop + 0.03, 0], slime, 16));
      for (let i = 0; i < 7; i++) {
        const angle = random() * Math.PI * 2, y = weedTop * random();
        G(s.rod([Math.cos(angle) * radius, y + 0.1, Math.sin(angle) * radius], [Math.cos(angle) * (radius + 0.05), y - 0.12, Math.sin(angle) * (radius + 0.05)], 0.02, slime, 0.004));
      }
      const top = height - 0.3;
      if (a.cap !== 'sawn') {
        G(s.cylinder(radius + 0.03, radius + 0.03, 0.07, [0, top + 0.02, 0], gilt, 20));
        if (a.cap === 'ball') G(s.ball([0.17, 0.17, 0.17], [0, top + 0.2, 0], gilt, 18));
        else if (a.cap === 'doge') {
          G(s.lathe([[0.15, 0], [0.17, 0.1], [0.13, 0.24], [0.09, 0.32], [0, 0.34]], gilt, [0, top + 0.05, 0]));
          G(s.ball([0.07, 0.11, 0.07], [0, top + 0.36, -0.07], gilt, 12)).rotation.x = -0.5;
        } else if (a.cap === 'crown') {
          G(s.cylinder(0.17, 0.14, 0.14, [0, top + 0.12, 0], gilt, 20));
          for (let i = 0; i < 6; i++) G(s.cylinder(0, 0.04, 0.13, [Math.cos(i * 1.047) * 0.15, top + 0.25, Math.sin(i * 1.047) * 0.15], gilt, 6));
        } else G(s.lathe([[0.06, 0], [0.16, 0.12], [0.13, 0.26], [0.05, 0.42], [0, 0.5]], gilt, [0, top + 0.05, 0]));
      } else G(s.cylinder(radius * 0.9, radius * 0.9, 0.012, [0, top + 0.006, 0], s.material('#b89f78'), 20));
      if (a.collars === 'iron' || a.collars === 'brass') for (const y of [1.32, top * .78]) {
        G(s.cylinder(radius + .015, radius + .015, a.collars === 'brass' ? .16 : .075, [0, y, 0], a.collars === 'brass' ? gilt : iron, 20));
        if (a.collars === 'brass') for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; G(s.ball([.012, .012, .012], [Math.sin(t) * (radius + .018), y, Math.cos(t) * (radius + .018)], gilt, 6)); }
      } else if (a.collars === 'rope') for (let i = 0; i < 3; i++) G(s.ring(radius + .02, .02, [0, 1.25 + i * .045, 0], ropeMat)).rotation.x = Math.PI / 2;
      if (a.cleats === 'horns') { G(s.box([.1, .2, .04], [0, 1.5, radius + .012], iron)); G(s.rod([0, 1.5, radius], [0, 1.5, radius + .14], .025, iron)); G(s.tube([[-.15, 1.55, radius + .13], [-.08, 1.5, radius + .13], [.08, 1.5, radius + .13], [.15, 1.55, radius + .13]], .024, iron)); }
      else if (a.cleats === 'eye') { G(s.rod([0, 1.5, radius], [0, 1.5, radius + .11], .025, iron)); G(s.ring(.09, .02, [0, 1.42, radius + .11], iron)); }
      else if (a.cleats === 'cross') G(s.rod([-.31, 1.5, 0], [.31, 1.5, 0], .04, s.material('#8a6d4d')));
      if (a.fenders !== 'none') {
        const zf = radius + .14, fy = .9;
        G(s.rod([0, 1.7, radius], [0, fy + .25, zf], .012, ropeMat));
        if (a.fenders === 'tyre') { G(s.ring(.19, .065, [0, fy, zf], s.material('#333a36'))); G(s.rod([0, fy + .25, zf], [0, fy + .18, zf], .012, ropeMat)); }
        else if (a.fenders === 'timber') G(s.box([.16, .66, .15], [0, fy - .08, zf], s.material('#88755a')));
        else { G(s.cylinder(.08, .08, .45, [0, fy, zf], ropeMat, 16)); for (const y of [fy - .225, fy + .225]) G(s.ball([.08, .07, .08], [0, y, zf], ropeMat, 10)); for (let i = 0; i < 9; i++) G(s.ring(.082, .012, [0, fy - .2 + i * .05, zf], s.material('#aa9b78'))).rotation.x = Math.PI / 2; }
      }
      poles.push({ group, height: top, radius, x, z });
    });

    // Stance.
    poles.forEach(({ group, x, z }, index) => {
      const out = Math.atan2(z, x || 0.001);
      if (a.stance === 'upright') group.rotation.set((random() - 0.5) * 0.02, 0, (random() - 0.5) * 0.02);
      else if (a.stance === 'splayed' || (a.stance === 'toppling' && index !== n - 1)) {
        const lean = 0.07 + random() * 0.09;
        group.rotation.set(Math.sin(out) * lean * (n === 1 ? 1 : 1), 0, -Math.cos(out) * lean);
        if (n === 1) group.rotation.z = lean;
      } else if (a.stance === 'toppling') group.rotation.set(0.15, 0, n === 1 ? 0.4 : 0.62);
      else {
        const lean = n === 1 ? 0 : 0.13 + Math.hypot(x, z) * 0.1;
        group.rotation.set(-Math.sin(out) * lean, 0, Math.cos(out) * lean);
      }
    });
    if (a.stance === 'lashed' && n > 1) for (let turn = 0; turn < 4; turn++) {
      const y = 2.3 + turn * .065, points: [number, number][] = [];
      for (const pole of poles) {
        pole.group.updateMatrixWorld(true);
        const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(pole.group.quaternion), p = new THREE.Vector3(pole.x, 0, pole.z).addScaledVector(direction, y / direction.y);
        for (let j = 0; j < 12; j++) { const t = j * Math.PI / 6, r = pole.radius + .04; points.push([p.x + Math.cos(t) * r, p.z + Math.sin(t) * r]); }
      }
      points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cross = (a: number[], b: number[], c: number[]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const half = (ps: [number, number][]) => { const h: [number, number][] = []; for (const p of ps) { while (h.length > 1 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop(); h.push(p); } return h; };
      const lo = half(points), hi = half([...points].reverse()); lo.pop(); hi.pop();
      s.tube([...lo, ...hi].map(([x, z]) => [x, y, z] as P3), .026, ropeMat, true);
    }

    // The rope and whatever else is on the tallest pole.
    const main = poles[0], M = <T extends THREE.Object3D>(node: T) => { main.group.add(node); return node; };
    const tieY = 1.75;
    if (a.rope !== 'none') {
      for (let i = 0; i < 3; i++) M(s.ring(0.185, 0.022, [0, tieY + i * 0.04, 0], ropeMat)).rotation.x = Math.PI / 2;
      if (a.rope === 'nothing') {
        main.group.updateMatrixWorld(true);
        const anchor = main.group.localToWorld(new THREE.Vector3(.16, tieY, .05)), end: P3 = [main.x + .5, .025, main.z + .6];
        s.tube([anchor.toArray() as P3, [anchor.x + .2, anchor.y * .55, anchor.z + .25], end, [main.x + .9, .025, main.z + .95], [main.x + .5, .025, main.z + 1.35], [main.x + 1.1, .025, main.z + 1.6], [main.x + 1.5, .025, main.z + 1.3]], .022, ropeMat);
      } else if (a.rope === 'coil') {
        for (let i = 0; i < 5; i++) {
          const loop = M(s.ring(0.24, 0.024, [0.03, tieY - 0.28, 0.17 + i * 0.012], ropeMat));
          loop.scale.set(0.75 + i * 0.03, 1.25, 1);
        }
      } else if (a.rope === 'snapped') {
        M(s.tube([[0.16, tieY, 0.05], [0.24, tieY - 0.3, 0.12], [0.22, tieY - 0.7, 0.1]], 0.022, ropeMat));
        for (let i = 0; i < 5; i++) M(s.rod([0.22, tieY - 0.7, 0.1], [0.22 + (random() - 0.5) * 0.14, tieY - 0.88, 0.1 + (random() - 0.5) * 0.14], 0.007, ropeMat));
      } else M(s.rod([0.15, tieY + 0.04, 0.05], [2.3, 0.75, 1.5], 0.02, ropeMat));
    }
    if (a.visitor === 'gull') {
      const capTop = main.height + (a.cap === 'sawn' ? 0.01 : a.cap === 'ball' ? 0.36 : a.cap === 'crown' ? 0.3 : 0.5);
      const white = s.material('#f4f3ee'), grey = s.material('#8e969c'), yellow = s.material('#e8a824');
      for (const side of [-1, 1]) M(s.rod([0, capTop, side * 0.03], [0, capTop + 0.14, side * 0.03], 0.008, yellow));
      M(s.ball([0.2, 0.11, 0.1], [0, capTop + 0.22, 0], white, 14)).rotation.z = 0.25;
      M(s.ball([0.19, 0.05, 0.11], [-0.05, capTop + 0.25, 0], grey, 12)).rotation.z = 0.2;
      M(s.ball([0.07, 0.07, 0.065], [0.16, capTop + 0.36, 0], white, 12));
      M(s.rod([0.21, capTop + 0.36, 0], [0.31, capTop + 0.33, 0], 0.018, yellow, 0.004));
      M(s.ball([0.012, 0.012, 0.012], [0.19, capTop + 0.385, 0.05], iron, 6));
    } else if (a.visitor === 'lantern') {
      const y = 2.5;
      M(s.tube([[0, y, 0.12], [0, y + 0.18, 0.3], [0, y + 0.12, 0.48]], 0.016, iron));
      M(s.cylinder(0.02, 0.1, 0.07, [0, y, 0.48], iron, 8));
      M(s.cylinder(0.08, 0.06, 0.2, [0, y - 0.13, 0.48], s.material('#ffe0a0', { emissive: '#ffae3a', emissiveIntensity: mix(2.2, 1, mood.daylight > 0.5 ? 1 - mood.daylight : mood.daylight) }), 8));
      M(s.cylinder(0.07, 0.07, 0.025, [0, y - 0.24, 0.48], iron, 8));
    } else if (a.visitor === 'crest') {
      const shield = new THREE.Shape();
      shield.moveTo(-0.2, 0.25); shield.lineTo(0.2, 0.25); shield.lineTo(0.2, -0.02);
      shield.quadraticCurveTo(0.18, -0.25, 0, -0.33); shield.quadraticCurveTo(-0.18, -0.25, -0.2, -0.02);
      M(s.mesh(new THREE.ExtrudeGeometry(shield, { depth: 0.03, bevelEnabled: false }), s.material(c1), [0, 2.55, 0.14]));
      M(s.box([0.4, 0.09, 0.012], [0, 2.56, 0.175], s.material(c2))).rotation.z = 0.6;
      M(s.ball([0.05, 0.05, 0.02], [0, 2.7, 0.178], gilt, 10));
    } else if (a.visitor === 'wreath') {
      const y = 2.35;
      const wreath = M(s.ring(0.27, 0.07, [0, y, 0.19], s.material(mix(0, 1, mood.wear) > 0.5 ? '#77683f' : '#3d6b3a', { roughness: 1 })));
      wreath.rotation.x = 0.12;
      const petals = mood.wear > 0.6 ? ['#a08a6a', '#8a6f5a'] : ['#f2e9dc', '#e58aa0', '#f0c84a'];
      for (let i = 0; i < 9; i++) M(s.ball([0.055, 0.055, 0.04], [Math.cos(i * 0.7) * 0.27, y + Math.sin(i * 0.7) * 0.27, 0.26], s.material(petals[i % petals.length]), 8));
      M(s.box([0.07, 0.4, 0.008], [0.06, y - 0.42, 0.24], s.material(c1))).rotation.z = 0.15;
    }

    if (a.landing !== 'none') {
      const px = -1.65, pz = .8, timber = s.material('#9d815d'), stone = s.material('#c5bba3'), surface = a.landing === 'stone' ? stone : timber;
      s.box([.72, .12, 2.0], [px, .22, pz], surface);
      for (const z of [pz - .75, pz + .75]) {
        if (a.landing === 'stone') s.box([.5, .61, .35], [px, -.145, z], stone);
        else s.cylinder(.075, .085, .61, [px, -.145, z], timber, 12);
      }
      if (a.landing !== 'stone') for (let i = 0; i < 12; i++) s.box([.73, .012, .018], [px, .286, pz - .92 + i * .167], ropeMat);
      if (a.landing === 'ladder') {
        for (const z of [pz - .23, pz + .23]) s.rod([px + .43, -.4, z], [px + .43, .65, z], .025, iron);
        for (let i = 0; i < 5; i++) s.rod([px + .43, -.3 + i * .18, pz - .23], [px + .43, -.3 + i * .18, pz + .23], .022, iron);
        for (const z of [pz - .23, pz + .23]) s.rod([px + .43, .28, z], [px + .28, .28, z], .022, iron);
      }
    }
    // A real volume of water contains the embedded pole feet and landing piles.
    const contentBounds = visibleBounds(s.root), centre = contentBounds.getCenter(new THREE.Vector3()), size = contentBounds.getSize(new THREE.Vector3());
    const reach = Math.max(1.35, Math.hypot(size.x, size.z) / 2 + .22);
    const water = new THREE.MeshStandardMaterial({ color: new THREE.Color('#4f8372').lerp(new THREE.Color('#6c7f58'), mood.wear * .6), roughness: .24, metalness: .12 });
    const waterRadius = a.waterPatch === 'octagon' ? reach / Math.cos(Math.PI / 8) : reach;
    const pond = a.waterPatch === 'square'
      ? s.box([reach * 2, .5, reach * 2], [centre.x, -.25, centre.z], water)
      : s.cylinder(waterRadius, waterRadius, .5, [centre.x, -.25, centre.z], water, a.waterPatch === 'octagon' ? 8 : 48);
    if (a.waterPatch === 'oval') pond.scale.set(1.17, 1, 1);
    pond.castShadow = false;
    const rippleMaterial = new THREE.MeshBasicMaterial({ color: '#d9ece2', transparent: true, opacity: 0.6, depthWrite: false });
    const ripples = [0, 1, 2].map((k) => {
      const ring = s.ring(1, 0.014, [0, 0.014, 0], rippleMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.castShadow = false;
      ring.userData.phase = k / 3;
      return ring;
    });

    const energy = mix(0.25, 1.3, mood.energy), phase = random() * 6;
    const update = (_dt: number, time: number) => {
      for (const ring of ripples) {
        const f = ((time + phase) * 0.14 * energy + ring.userData.phase) % 1;
        ring.position.set(centre.x, 0.014, centre.z);
        ring.scale.setScalar(reach * (0.35 + f * 0.62));
      }
    };
    update(0, 0);
    return s.finish({ footprint: reach * (a.waterPatch === 'oval' ? 1.17 : a.waterPatch === 'square' ? Math.SQRT2 : a.waterPatch === 'octagon' ? 1 / Math.cos(Math.PI / 8) : 1), update });
  },
});
