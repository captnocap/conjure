import * as THREE from 'three';
import { Sculpture, choice, defineThing } from '@conjure/kit';

type P3 = [number, number, number];
const CAST = {
  mouse: 'A grey mouse with huge round ears, pink nose and buck teeth.',
  chicken: 'A yellow chicken with a red comb and an orange beak.',
  chef: 'A human pizza chef with a tall white toque, round nose and a curled black moustache.',
  dog: 'A tan dog with long floppy ears and its tongue out.',
  monster: 'A shaggy purple monster with horns, three eyes and fangs.',
} as const;
type Character = keyof typeof CAST;
const TINT: Record<Character, string> = { mouse: '#9aa0a8', chicken: '#f0c93a', chef: '#e2b08c', dog: '#c9955a', monster: '#7b44b8' };

function plush(base: string, wear: number, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base; ctx.fillRect(0, 0, 96, 96);
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(random() * 96, random() * 96, 1, 2 + random() * 3);
  }
  for (let i = 0; i < wear * 16; i++) {
    const x = random() * 96, y = random() * 96, r = 6 + random() * 16;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(60,48,30,${0.2 + wear * 0.35})`); g.addColorStop(1, 'rgba(60,48,30,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

/** A crescent grin lying on a sphere of radius r: the black mesh panel the wearer sees through. */
function grinGeometry(r: number, width: number, depth: number, centre: number) {
  const positions: number[] = [], index: number[] = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const u = (i / steps) * 2 - 1, phi = u * width, bow = 1 - u * u;
    for (const polar of [centre + bow * depth * 0.25 - 0.02, centre + bow * depth + 0.02]) {
      positions.push(Math.sin(phi) * Math.sin(polar) * r, Math.cos(polar) * r, Math.cos(phi) * Math.sin(polar) * r);
    }
    if (i < steps) { const k = i * 2; index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    lead: choice('Which character sits in the middle of the shelf?', CAST),
    count: choice('How many heads are on the shelf?', {
      two: 'Just two, a double act.', three: 'Three in a row.', four: 'Four, the whole band.', five: 'Five, crowded ear to ear.',
    }),
    state: choice('What state are the heads in?', {
      clean: 'Clean and brushed, ready for the next party.',
      bagged: 'Each one sealed in a clear plastic bag, knotted on top.',
      matted: 'Matted, sweat-stained and sagging, ears bent.',
      turned: 'Fine, but one has been turned to face the wall.',
      fallen: 'One has rolled off and lies on the floor on its side.',
    }),
    below: choice('What hangs or sits below the shelf?', {
      nothing: 'Nothing: bare floor.',
      glove: 'A single empty white four-fingered glove on a hook.',
      suit: 'A limp headless body suit on a hanger.',
      shoes: 'A pair of enormous cartoon shoes, toes out.',
      boxes: 'Cardboard boxes of party supplies and a mop bucket.',
    }),
    feeling: choice('What is the feeling of the display?', {
      clutter: 'Staff-room clutter: heads shoved on at angles among mugs and a clipboard.',
      severed: 'A row of severed smiles: each head mounted dead level on its own post, evenly spaced.',
      inventory: 'Inventory: every head tagged with a numbered paper label.',
      fame: 'A hall of fame: gold name plaques and a star garland along the shelf edge.',
    }),
    rack: choice('What kind of shelf is it?', {
      wire: 'A chrome wire catering rack.',
      wood: 'A painted plywood shelf on timber uprights.',
      locker: 'The top of a row of dented steel staff lockers.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = Math.min(1, mood.wear + (a.state === 'matted' ? 0.45 : 0));
    const dark = s.material('#17140f', { roughness: 0.9, side: THREE.DoubleSide });
    const white = s.material('#f5f2ea', { roughness: 0.4 });
    const black = s.material('#141416', { roughness: 0.3 });
    const add = <T extends THREE.Object3D>(g: THREE.Object3D, m: T) => { g.add(m); return m; };

    const makeHead = (who: Character) => {
      const g = new THREE.Group();
      const R = 0.3;
      const fur = s.material('#ffffff', { map: plush(TINT[who], wear, random), roughness: 0.95 });
      const sag = a.state === 'matted' ? 0.9 : 1;
      add(g, s.ball([R, R * sag, R * 0.95], [0, R * sag, 0], fur, 24));
      add(g, s.cylinder(0.17, 0.19, 0.06, [0, 0.03, 0], dark, 16));
      const cy = R * sag;
      const grin = add(g, s.mesh(grinGeometry(R * 1.012, who === 'chicken' ? 0.5 : 0.85, 0.42, 1.78), dark, [0, cy, 0]));
      grin.scale.set(1, sag, 0.95);
      // Fixed cartoon eyes.
      const eyes: P3[] = who === 'monster' ? [[-0.13, 0.12, 0.25], [0, 0.17, 0.27], [0.13, 0.12, 0.25]] : [[-0.1, 0.1, 0.265], [0.1, 0.1, 0.265]];
      for (const [x, y, z] of eyes) {
        const big = who === 'monster' ? 0.8 : 1;
        add(g, s.ball([0.065 * big, 0.085 * big, 0.03], [x, cy + y, z * 0.95], white, 14));
        add(g, s.ball([0.03 * big, 0.04 * big, 0.016], [x + 0.008, cy + y - 0.012, z * 0.95 + 0.024], black, 10));
      }
      const pink = s.material('#e58aa0');
      if (who === 'mouse') {
        for (const side of [-1, 1]) {
          const ear = add(g, s.cylinder(0.2, 0.2, 0.04, [side * 0.27, cy + 0.3, -0.02], fur, 22));
          ear.rotation.x = Math.PI / 2; ear.rotation.z = side * (a.state === 'matted' ? 0.5 : 0.1);
          const inner = add(g, s.cylinder(0.14, 0.14, 0.042, [side * 0.27, cy + 0.3, -0.016], pink, 18));
          inner.rotation.x = Math.PI / 2;
        }
        add(g, s.ball([0.045, 0.035, 0.035], [0, cy - 0.01, 0.3], pink, 10));
        for (const x of [-0.025, 0.025]) add(g, s.box([0.045, 0.07, 0.015], [x, cy - 0.11, 0.286], white));
      } else if (who === 'chicken') {
        const orange = s.material('#ee8a1f', { roughness: 0.5 });
        const upper = add(g, s.mesh(new THREE.ConeGeometry(0.11, 0.24, 12), orange, [0, cy - 0.01, 0.37]));
        upper.rotation.x = Math.PI / 2; upper.scale.y = 1; upper.scale.z = 0.55;
        const lower = add(g, s.mesh(new THREE.ConeGeometry(0.09, 0.18, 12), orange, [0, cy - 0.1, 0.33]));
        lower.rotation.x = Math.PI / 2 + 0.35; lower.scale.z = 0.4;
        const comb = s.material('#d02b2b');
        for (let i = 0; i < 3; i++) add(g, s.ball([0.05, 0.08 - i * 0.01, 0.07], [0, cy + R * sag + 0.03 - i * 0.02, 0.08 - i * 0.1], comb, 10));
        add(g, s.ball([0.035, 0.07, 0.03], [0, cy - 0.2, 0.26], comb, 8));
      } else if (who === 'chef') {
        add(g, s.cylinder(0.2, 0.18, 0.22, [0, cy + R * sag + 0.05, -0.02], white, 20));
        add(g, s.ball([0.27, 0.15, 0.27], [0, cy + R * sag + 0.22, -0.02], white, 18));
        add(g, s.ball([0.07, 0.06, 0.06], [0, cy, 0.3], s.material('#d9907a'), 12));
        for (const side of [-1, 1]) {
          const m = add(g, s.mesh(new THREE.TorusGeometry(0.06, 0.022, 6, 12, Math.PI * 1.2), black, [side * 0.07, cy - 0.055, 0.29]));
          m.rotation.z = side === 1 ? Math.PI * 0.95 : Math.PI * 0.85 - Math.PI; m.scale.x = 1.2;
        }
      } else if (who === 'dog') {
        const brown = s.material('#6b4426', { roughness: 0.95 });
        for (const side of [-1, 1]) {
          const ear = add(g, s.ball([0.07, 0.24, 0.13], [side * 0.31, cy - 0.02, 0], brown, 12));
          ear.rotation.z = side * 0.18;
        }
        add(g, s.ball([0.15, 0.1, 0.1], [0, cy - 0.02, 0.27], s.material('#ecd9b8', { roughness: 0.95 }), 14));
        add(g, s.ball([0.055, 0.04, 0.04], [0, cy + 0.02, 0.36], black, 10));
        add(g, s.ball([0.05, 0.08, 0.02], [0.02, cy - 0.2, 0.275], s.material('#e0566c'), 10)).rotation.x = 0.35;
      } else {
        const horn = s.material('#ead9a8', { roughness: 0.5 });
        for (const side of [-1, 1]) {
          const h = add(g, s.mesh(new THREE.ConeGeometry(0.06, 0.24, 10), horn, [side * 0.19, cy + 0.3, 0]));
          h.rotation.z = -side * 0.5;
        }
        for (const x of [-0.12, -0.04, 0.04, 0.12]) add(g, s.mesh(new THREE.ConeGeometry(0.025, 0.07, 6), white, [x, cy - 0.105 - (0.0144 - x * x) * 3.4, 0.285 - Math.abs(x) * 0.25])).rotation.x = Math.PI;
        const tufts: { at: P3; size: number }[] = [];
        for (let i = 0; i < 26; i++) {
          const t = random() * Math.PI * 2, p = random() * 1.2;
          tufts.push({ at: [Math.sin(t) * Math.sin(p) * R, cy + Math.cos(p) * R, Math.cos(t) * Math.sin(p) * R * 0.95 - 0.02], size: 0.04 + random() * 0.03 });
        }
        add(g, s.scatter(new THREE.ConeGeometry(0.6, 1.6, 5), fur, tufts));
      }
      if (a.state === 'bagged') {
        const bag = new THREE.MeshPhysicalMaterial({ color: '#e8f2f6', transparent: true, opacity: 0.2, roughness: 0.1, depthWrite: false });
        add(g, s.ball([0.4, 0.42, 0.4], [0, cy + 0.03, 0], bag, 16));
        add(g, s.ball([0.05, 0.06, 0.05], [0, cy + 0.47, 0], s.material('#dfe9ec', { roughness: 0.2 }), 8));
      }
      return g;
    };

    const n = { two: 2, three: 3, four: 4, five: 5 }[a.count];
    const others = (Object.keys(CAST) as Character[]).filter((k) => k !== a.lead).sort(() => random() - 0.5);
    const order: Character[] = [];
    for (let i = 0; i < n; i++) order.push(i === Math.floor((n - 1) / 2) ? a.lead : others[(i > Math.floor((n - 1) / 2) ? i - 1 : i) % others.length]);
    const pitch = 0.78, width = n * pitch + 0.16, shelfY = 1.25, depth = 0.7;

    // The rack.
    if (a.rack === 'wire') {
      const chrome = s.material('#c9ced1', { metalness: 0.85, roughness: 0.25 });
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([x * width / 2, 0, z * depth / 2], [x * width / 2, shelfY + 0.9, z * depth / 2], 0.016, chrome);
      for (const y of [0.18, shelfY]) {
        for (const z of [-1, 1]) s.rod([-width / 2, y, z * depth / 2], [width / 2, y, z * depth / 2], 0.012, chrome);
        for (const x of [-1, 1]) s.rod([x * width / 2, y, -depth / 2], [x * width / 2, y, depth / 2], 0.012, chrome);
        const wires = s.material('#b9bfc2', { metalness: 0.7, roughness: 0.4 });
        const bars: { at: P3; size: number }[] = [];
        for (let i = 1; i < 12; i++) bars.push({ at: [0, y, -depth / 2 + (i / 12) * depth], size: 1 });
        s.scatter(new THREE.BoxGeometry(width, 0.008, 0.008), wires, bars);
      }
    } else if (a.rack === 'wood') {
      const paint = s.material(mood.cheer > 0.5 ? '#3f8fb0' : '#7a8a8c', { roughness: 0.8 });
      const timber = s.material('#b08a5a', { roughness: 0.85 });
      for (const x of [-1, 1]) s.box([0.06, shelfY + 0.9, depth], [x * (width / 2 + 0.03), (shelfY + 0.9) / 2, 0], timber);
      s.box([width, 0.045, depth], [0, shelfY - 0.022, 0], paint);
      s.box([width, 0.045, depth], [0, 0.16, 0], paint);
      s.box([width + 0.12, shelfY + 0.9, 0.02], [0, (shelfY + 0.9) / 2, -depth / 2], s.material('#d9d3c2', { roughness: 0.9 }));
    } else {
      const steel = s.material(mood.cheer > 0.5 ? '#5c8f8a' : '#7d8a92', { metalness: 0.4, roughness: 0.5 });
      const doors = Math.max(2, Math.round(width / 0.45));
      s.box([width, shelfY, depth], [0, shelfY / 2, 0], steel);
      for (let i = 0; i < doors; i++) {
        const x = -width / 2 + (i + 0.5) * width / doors;
        const ajar = random() < 0.2 + mood.wear * 0.2;
        const door = s.box([width / doors - 0.03, shelfY - 0.12, 0.015], [x, shelfY / 2, depth / 2 + 0.008], s.material(new THREE.Color(steel.color).multiplyScalar(1.12), { metalness: 0.4, roughness: 0.5 }));
        if (ajar) { door.rotation.y = -0.5; door.position.x -= 0.03; door.position.z += 0.09; }
        for (let v = 0; v < 4; v++) s.box([width / doors * 0.5, 0.012, 0.004], [x, shelfY - 0.2 - v * 0.035, depth / 2 + 0.018], s.material('#22262a'));
        s.box([0.02, 0.07, 0.02], [x + width / doors * 0.3, shelfY * 0.55, depth / 2 + 0.025], s.material('#d0d4d6', { metalness: 0.8, roughness: 0.3 }));
      }
    }

    // Heads on the shelf.
    const centreX = (i: number) => (i - (n - 1) / 2) * pitch;
    const odd = Math.floor(random() * n);
    order.forEach((who, i) => {
      const head = makeHead(who);
      let x = centreX(i), y = shelfY, z = 0.02;
      const tidy = a.feeling === 'severed';
      head.rotation.y = tidy ? 0 : (random() - 0.5) * (a.feeling === 'clutter' ? 0.9 : 0.35);
      if (a.feeling === 'clutter') { head.rotation.z = (random() - 0.5) * 0.25; x += (random() - 0.5) * 0.08; }
      if (tidy) {
        s.cylinder(0.02, 0.02, 0.22, [x, shelfY + 0.11, z], s.material('#2a2a2e', { metalness: 0.5 }), 8);
        s.cylinder(0.09, 0.1, 0.02, [x, shelfY + 0.01, z], s.material('#2a2a2e', { metalness: 0.5 }), 14);
        y += 0.2;
      }
      if (i === odd && a.state === 'turned') head.rotation.y = Math.PI + (random() - 0.5) * 0.3;
      if (i === odd && a.state === 'fallen') {
        head.rotation.set(0.2, 0.6 + random() * 0.8, Math.PI / 2 - 0.15);
        head.rotation.order = 'YXZ';
        x = centreX(i) + 0.25; y = 0.3; z = depth / 2 + 0.55;
      }
      head.position.set(x, y, z);
      s.root.add(head);
      if (a.feeling === 'inventory') {
        const tag = s.label(`No. ${String(11 + i * 7 + Math.floor(random() * 5)).padStart(3, '0')}`, 0.2, 0.09, [centreX(i) + 0.05, shelfY - 0.09, depth / 2 + 0.012], '#2a2620', '#ecdfb8');
        tag.rotation.z = (random() - 0.5) * 0.3;
      }
      if (a.feeling === 'fame') s.label({ mouse: 'MOZZY', chicken: 'CLUCK', chef: 'PAPA GIO', dog: 'BISCUIT', monster: 'GLOOP' }[who], 0.36, 0.08, [centreX(i), shelfY - 0.05, depth / 2 + 0.014], '#3a2a08', '#e2b93c');
    });
    if (a.feeling === 'fame') {
      const stars: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < n * 5; i++) {
        const t = i / (n * 5 - 1);
        stars.push({ at: [-width / 2 + t * width, shelfY - 0.16 - Math.abs(Math.sin(t * Math.PI * n)) * 0.09, depth / 2 + 0.02], size: 0.03, color: ['#f2d24a', '#e8503a', '#3fb6d8'][i % 3] });
      }
      s.scatter(new THREE.OctahedronGeometry(1), s.material('#ffffff', { emissive: '#554010', emissiveIntensity: mood.cheer }), stars);
    }
    if (a.feeling === 'clutter') {
      s.cylinder(0.045, 0.04, 0.1, [width / 2 - 0.1, shelfY + 0.05, depth / 2 - 0.08], s.material('#c8452f'), 12);
      const clip = s.box([0.24, 0.32, 0.015], [-width / 2 + 0.02, shelfY - 0.3, depth / 2 + 0.03], s.material('#8a6a3c'));
      clip.rotation.z = 0.08;
      s.box([0.2, 0.26, 0.004], [-width / 2 + 0.02, shelfY - 0.31, depth / 2 + 0.04], white).rotation.z = 0.08;
    }

    // Below the shelf.
    const leadFur = s.material('#ffffff', { map: plush(TINT[a.lead], wear, random), roughness: 0.95 });
    const front = a.rack === 'locker' ? depth / 2 + 0.06 : 0.05;
    const hookY = shelfY - 0.05;
    if (a.below === 'glove') {
      const gx = width * 0.2;
      s.rod([gx, hookY, front], [gx, hookY - 0.14, front], 0.006, s.material('#555'));
      s.ball([0.1, 0.12, 0.05], [gx, hookY - 0.34, front], white, 12);
      s.cylinder(0.075, 0.09, 0.12, [gx, hookY - 0.2, front], white, 12);
      for (let f = 0; f < 4; f++) {
        const fx = gx + (f - 1.5) * 0.055;
        s.rod([fx, hookY - 0.4, front], [fx + (f - 1.5) * 0.012, hookY - (f === 0 ? 0.47 : 0.56), front + 0.01], 0.028, white, 0.024);
      }
    } else if (a.below === 'suit') {
      const sx = -width * 0.12, top = hookY - 0.08;
      s.rod([sx - 0.28, top - 0.04, front], [sx + 0.28, top - 0.04, front], 0.01, s.material('#444'));
      s.rod([sx, top - 0.04, front], [sx, hookY, front], 0.006, s.material('#444'));
      s.ball([0.3, 0.36, 0.1], [sx, top - 0.4, front], leadFur, 16);
      s.ball([0.19, 0.2, 0.05], [sx, top - 0.42, front + 0.07], s.material('#efe3c8', { roughness: 0.95 }), 12);
      for (const side of [-1, 1]) {
        s.rod([sx + side * 0.26, top - 0.1, front], [sx + side * 0.36, top - 0.62, front], 0.075, leadFur, 0.065);
        s.rod([sx + side * 0.12, top - 0.68, front], [sx + side * 0.14, Math.max(0.12, top - 1.12), front + 0.02], 0.095, leadFur, 0.08);
      }
    } else if (a.below === 'shoes') {
      const shoe = s.material(mood.cheer > 0.5 ? '#d8362e' : '#8a3a34', { roughness: 0.35 });
      for (const side of [-1, 1]) {
        const z = depth / 2 + 0.28;
        const body = s.ball([0.15, 0.1, 0.27], [side * 0.2, 0.1, z], shoe, 14);
        body.rotation.y = side * 0.3;
        s.ball([0.17, 0.12, 0.16], [side * 0.24, 0.12, z + 0.16], shoe, 14);
        s.box([0.3, 0.03, 0.56], [side * 0.21, 0.015, z + 0.03], white).rotation.y = side * 0.3;
      }
    } else if (a.below === 'boxes') {
      const card = s.material('#b89363', { roughness: 0.95 });
      const bz = depth / 2 + 0.3;
      s.box([0.5, 0.36, 0.4], [-width * 0.22, 0.18, bz], card).rotation.y = 0.2;
      s.box([0.38, 0.28, 0.34], [-width * 0.22 + 0.04, 0.5, bz], card).rotation.y = -0.15;
      s.label('PARTY', 0.3, 0.1, [-width * 0.22 - 0.03, 0.2, bz + 0.21], '#3a2a1a', '#b89363').rotation.y = 0.2;
      s.cylinder(0.17, 0.14, 0.28, [width * 0.25, 0.14, bz], s.material('#e3c22a', { roughness: 0.5 }), 16);
      s.rod([width * 0.25, 0.1, bz], [width * 0.25 + 0.25, 1.3, bz - 0.2], 0.015, s.material('#a07a4a'));
    }

    return s.finish();
  },
});
