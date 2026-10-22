import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = readonly [number, number, number];

const SIGNS = {
  none: 'No sign, just the boxes.',
  'shady-pines': 'A routed plank reading SHADY PINES.',
  'sunset-acres': 'A sun-faded board reading SUNSET ACRES.',
  'rent-due': 'A blunt office notice: LOT RENT DUE THE 1ST.',
  'no-soliciting': 'NO SOLICITING.',
  'desert-rose': 'A pink-lettered board reading DESERT ROSE.',
} as const;

export default defineThing({
  questions: {
    kind: choice('What kind of mailbox bank is it?', {
      'rural-row': 'A single row of arched tin rural mailboxes screwed to a plank.',
      'double-decker': 'Two stacked rows of arched rural mailboxes on one frame.',
      cabinet: 'A grey postal cluster cabinet on a pedestal, a grid of small locked doors.',
    }),
    households: score('How many boxes are there?', ['Three', 'Five', 'Eight', 'A dozen']),
    state: choice('What has happened to it?', {
      tidy: 'Kept straight and shut; somebody here takes care of it.',
      neglected: 'Several doors hang open and nobody closes them.',
      clipped: 'A truck clipped it: the whole bank leans hard and one box has dropped off.',
      vandalised: 'One box is bashed in by a baseball bat, its door gone.',
    }),
    mail: choice('What is in the boxes?', {
      empty: 'Nothing; the mail has been collected.',
      flyers: 'Bright grocery flyers and coupon sheets poking out of every one.',
      overdue: 'Pink and red-stamped overdue notices, one taped to a door.',
      'one-overflowing': 'All empty but one, crammed with weeks of uncollected mail.',
      parcels: 'A few parcels left on the ground beneath because they would not fit.',
    }),
    flags: score('How many red flags are up for outgoing mail?', ['None', 'One or two', 'Most of them']),
    boxes: choice('What do the boxes look like?', {
      mismatched: 'Every household bought its own: black, silver, green, one bright one.',
      black: 'All matching black.',
      galvanised: 'All plain galvanised silver.',
      white: 'All white, repainted by the park.',
    }),
    numbering: choice('How are the boxes marked?', {
      lots: 'Lot numbers in stencilled digits.',
      'house-numbers': 'Stick-on reflective three-digit numbers.',
      letters: 'Lot letters: A, B, C.',
    }),
    sign: choice('Is there a sign above the boxes?', SIGNS),
  },

  build(a, context) {
    const root = new Sculpture(context);
    const s = new Sculpture(context); // the leaning bank
    const { mood, random } = context;
    const count = Math.round(mix(3, 12, a.households));
    const timber = s.material(mood.wear > 0.5 ? '#8f8573' : '#a07a4e', { roughness: 0.95 });
    const tin: Record<string, string[]> = {
      mismatched: ['#26282b', '#b9bfc2', '#3f6b4c', '#f0ede2', mood.cheer > 0.5 ? '#e8b92f' : '#8a3a30', '#3a5a8a'],
      black: ['#26282b'], galvanised: ['#b9bfc2'], white: ['#f0ede2'],
    };
    const tag = (index: number) => a.numbering === 'lots' ? String(index + 1) : a.numbering === 'letters' ? String.fromCharCode(65 + index) : String(101 + index * 2 + (index % 2 ? 7 : 0));
    const paperColours = a.mail === 'flyers' ? ['#f2d21f', '#ee6b2f', '#3fb4e0', '#f4f1e6', '#e03a3a'] : a.mail === 'overdue' ? ['#f4f1e6', '#f5a9bd', '#f4f1e6', '#e86a7a'] : ['#f4f1e6', '#e6dcc0', '#cfe0ee', '#f2d21f'];
    const flaps: { node: THREE.Object3D; base: number; phase: number }[] = [];
    const overflowing = Math.floor(random() * count);
    const bashed = a.state === 'vandalised' ? Math.floor(random() * count) : -1;
    const dropped = a.state === 'clipped' ? Math.floor(random() * count) : -1;
    const lean = (a.state === 'clipped' ? 0.3 : 0.03 + mood.wear * 0.12) * (random() < 0.5 ? -1 : 1);

    const letters = (to: Sculpture, at: P, amount: number, width = 0.12) => {
      for (let i = 0; i < amount; i++) {
        const sheet = to.box([width * mix(0.7, 1, random()), 0.004 + random() * 0.006, 0.2], [at[0] + (random() - 0.5) * 0.02, at[1] + 0.012 + i * 0.012, at[2] + random() * 0.07], to.material(paperColours[Math.floor(random() * paperColours.length)], { roughness: 0.9 }));
        sheet.rotation.set((random() - 0.5) * 0.3, (random() - 0.5) * 0.3, (random() - 0.5) * 0.2);
      }
    };

    let width = 0.8, top = 1.5;
    if (a.kind !== 'cabinet') {
      const W = 0.17, H = 0.22, L = 0.46, pitch = 0.215;
      const arch = new THREE.Shape();
      arch.moveTo(-W / 2, 0); arch.lineTo(W / 2, 0); arch.lineTo(W / 2, H - W / 2);
      arch.absarc(0, H - W / 2, W / 2, 0, Math.PI, false); arch.lineTo(-W / 2, 0);
      const bodyGeometry = new THREE.ExtrudeGeometry(arch, { depth: L, bevelEnabled: false, curveSegments: 8 });
      bodyGeometry.translate(0, 0, -L / 2);
      const doorGeometry = new THREE.ExtrudeGeometry(arch, { depth: 0.012, bevelEnabled: false, curveSegments: 8 });
      const mouthGeometry = new THREE.ShapeGeometry(arch, 8);
      const dark = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 1 });
      const flagRed = s.material('#d0312a', { roughness: 0.5 });
      const rows = a.kind === 'double-decker' ? 2 : 1;
      const perRow = Math.ceil(count / rows);
      width = perRow * pitch + 0.1;
      const plankY = (row: number) => 1.02 + row * 0.36;
      top = plankY(rows - 1) + H;
      const postX = perRow > 3 ? width / 2 - 0.2 : 0;
      for (const x of perRow > 3 ? [-postX, postX] : [0]) {
        s.box([0.09, top + 0.35 + (a.sign !== 'none' ? 0.3 : -0.3), 0.09], [x, (top + (a.sign !== 'none' ? 0.3 : -0.3) - 0.35) / 2, -0.02], timber);
        if (rows === 1) s.rod([x, 0.62, 0.0], [x + (x <= 0 ? 0.3 : -0.3), 0.99, 0.0], 0.03, timber);
      }
      for (let row = 0; row < rows; row++) s.box([width, 0.04, 0.2], [0, plankY(row) - 0.02, 0.05], timber);
      for (let index = 0; index < count; index++) {
        const row = Math.floor(index / perRow), column = index % perRow;
        const inRow = Math.min(perRow, count - row * perRow);
        const colour = tin[a.boxes][(index * 7 + Math.floor(random() * 2)) % tin[a.boxes].length];
        const metal = s.material(colour, { metalness: colour === '#b9bfc2' ? 0.7 : 0.25, roughness: mix(0.4, 0.8, mood.wear) });
        const box = new Sculpture(context);
        box.mesh(bodyGeometry, metal);
        const isBashed = index === bashed, isDropped = index === dropped;
        const open = isBashed ? 0 : a.state === 'neglected' ? (random() < 0.55 ? 1.6 + random() * 0.5 : 0) : (a.mail === 'one-overflowing' && index === overflowing) || (a.mail === 'flyers' && random() < 0.4) ? 1.5 + random() * 0.3 : random() < mood.wear * 0.3 ? 1.7 : 0;
        if (open > 0 || isBashed) box.mesh(mouthGeometry, dark, [0, 0, L / 2 + 0.001]);
        if (!isBashed) {
          const hinge = new THREE.Group();
          hinge.position.set(0, 0.005, L / 2);
          const door = new THREE.Mesh(doorGeometry, metal);
          door.castShadow = true;
          hinge.add(door);
          const number = box.label(tag(index), 0.11, 0.075, [0, 0.09, 0.0135], colour === '#26282b' || colour === '#3f6b4c' || colour === '#3a5a8a' || colour === '#8a3a30' ? '#f4f1e6' : '#1c1c1c', colour);
          hinge.add(number);
          const latch = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.015), metal);
          latch.position.set(0, H - 0.02, 0.015);
          hinge.add(latch);
          hinge.rotation.x = open;
          box.root.add(hinge);
          if (open > 0) flaps.push({ node: hinge, base: open, phase: random() * 6 });
        }
        const up = random() < mix(0, 0.85, a.flags) || (a.flags > 0.3 && index === 0);
        const pivot = new THREE.Group();
        pivot.position.set(W / 2 + 0.006, 0.1, 0.12);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.17, 0.02), flagRed);
        arm.position.y = 0.085;
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.055, 0.075), flagRed);
        plate.position.set(0, 0.145, -0.03);
        arm.castShadow = plate.castShadow = true;
        pivot.add(arm, plate);
        pivot.rotation.x = up && !isDropped ? 0 : -Math.PI / 2;
        box.root.add(pivot);
        const stuffed = a.mail === 'one-overflowing' ? (index === overflowing ? 9 : 0) : a.mail === 'empty' || a.mail === 'parcels' ? 0 : open > 0 ? 2 + Math.floor(random() * 4) : 0;
        if (stuffed && !isDropped) letters(box, [0, 0, L / 2 - 0.08], stuffed);
        if (a.mail === 'overdue' && open === 0 && !isBashed && random() < 0.5) {
          const notice = box.label(random() < 0.5 ? 'FINAL NOTICE' : 'PAST DUE', 0.14, 0.05, [0.01, 0.045, L / 2 + 0.016], '#c81e1e', '#f5c9d2');
          notice.rotation.z = (random() - 0.5) * 0.3;
        }
        if (isBashed) { box.root.scale.set(1.12, 0.62, 1); box.root.rotation.z = 0.18; }
        if (isDropped) {
          // Fallen face-down in the dirt in front of the post.
          box.root.position.set((column - (inRow - 1) / 2) * pitch + 0.1, W / 2, 0.75);
          box.root.rotation.set(0.1, 0.7 + random(), Math.PI / 2);
          root.root.add(box.root);
        } else {
          box.root.position.set((column - (inRow - 1) / 2) * pitch, plankY(row), 0.05);
          box.root.rotation.y = (random() - 0.5) * mood.wear * 0.25;
          s.root.add(box.root);
        }
      }
    } else {
      // Postal cluster cabinet: two columns of small doors over a parcel locker.
      const rowsOfDoors = Math.ceil(count / 2);
      const dh = 0.11, cw = 0.72, ch = rowsOfDoors * dh + 0.42, base = 0.72;
      width = cw; top = base + ch;
      const grey = s.material(a.boxes === 'white' ? '#cfcabb' : a.boxes === 'black' ? '#2c2f32' : a.boxes === 'mismatched' ? '#5f7f96' : '#7f8a8e', { metalness: 0.4, roughness: mix(0.45, 0.8, mood.wear) });
      s.box([0.2, base, 0.2], [0, base / 2, 0], grey);
      s.box([0.42, 0.03, 0.42], [0, 0.015, 0], grey);
      s.box([cw, ch, 0.45], [0, base + ch / 2, 0], grey);
      s.box([cw + 0.06, 0.04, 0.5], [0, top + 0.02, 0.01], grey);
      const face = s.material(a.boxes === 'white' ? '#f4f2ea' : a.boxes === 'black' ? '#4d5156' : a.boxes === 'mismatched' ? '#a9c0cf' : '#b9c1c4', { metalness: 0.5, roughness: 0.5 });
      const dark = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 1 });
      const ink = a.boxes === 'black' ? '#f4f1e6' : '#1c1c1c', paper = a.boxes === 'white' ? '#f4f2ea' : a.boxes === 'black' ? '#4d5156' : a.boxes === 'mismatched' ? '#a9c0cf' : '#b9c1c4';
      s.box([0.69, rowsOfDoors * dh + 0.01, 0.006], [0, top - 0.07 - (rowsOfDoors - 1) * dh / 2, 0.224], dark);
      for (let index = 0; index < rowsOfDoors * 2; index++) {
        const column = index % 2, row = Math.floor(index / 2);
        const x = (column - 0.5) * 0.34, y = top - 0.07 - row * dh;
        const isBashed = index === bashed;
        const open = isBashed || a.state === 'neglected' ? (isBashed || random() < 0.4 ? 1.2 + random() * 0.8 : 0) : a.mail === 'one-overflowing' && index === overflowing ? 1.4 : a.state === 'clipped' && random() < 0.3 ? 0.9 : 0;
        const hinge = new THREE.Group();
        hinge.position.set(x - 0.16, y, 0.232);
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.32, dh - 0.016, 0.012), face);
        door.position.x = 0.16;
        door.castShadow = true;
        const number = s.label(tag(index), 0.1, 0.05, [0, 0, 0], ink, paper);
        number.position.set(0.11, 0, 0.0075);
        const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 10), s.material('#d8c27a', { metalness: 0.8, roughness: 0.3 }));
        lock.rotation.x = Math.PI / 2;
        lock.position.set(0.27, 0, 0.01);
        hinge.add(door, number, lock);
        hinge.rotation.y = -open;
        if (isBashed) hinge.rotation.z = 0.25;
        s.root.add(hinge);
        if (open > 0) {
          
          const stuffed = a.mail === 'empty' || a.mail === 'parcels' ? 0 : a.mail === 'one-overflowing' ? (index === overflowing ? 8 : 0) : 3;
          if (stuffed) { const pile = new Sculpture(context); letters(pile, [0, 0, 0], stuffed, 0.24); pile.root.position.set(x, y - dh / 2 + 0.01, 0.14); pile.root.scale.y = 0.7; s.root.add(pile.root); }
          flaps.push({ node: hinge, base: -open, phase: random() * 6 });
        } else if (a.mail === 'overdue' && random() < 0.35) {
          s.label('PAST DUE', 0.16, 0.045, [x - 0.04, y - 0.005, 0.238], '#c81e1e', '#f5c9d2').rotation.z = (random() - 0.5) * 0.3;
        } else if (a.mail === 'flyers' && random() < 0.6) {
          s.box([0.2, 0.004, 0.08], [x, y + dh / 2 - 0.012, 0.25], s.material(paperColours[Math.floor(random() * 5)])).rotation.x = 0.5 + random() * 0.6;
        }
      }
      // Outgoing slot and parcel locker.
      s.box([0.66, 0.16, 0.012], [0, base + 0.31, 0.228], face);
      s.box([0.4, 0.02, 0.014], [0, base + 0.33, 0.229], dark);
      s.label('OUTGOING MAIL', 0.3, 0.035, [0, base + 0.27, 0.236], ink, paper);
      s.box([0.66, 0.2, 0.012], [0, base + 0.11, 0.228], face);
      s.label('PARCEL', 0.16, 0.035, [-0.18, base + 0.11, 0.236], ink, paper);
      const flagUp = a.flags > 0.4;
      if (flagUp) s.box([0.01, 0.1, 0.07], [cw / 2 + 0.008, top - 0.1, 0.1], s.material('#d0312a'));
    }

    if (a.sign !== 'none') {
      const text = { 'shady-pines': 'SHADY PINES', 'sunset-acres': 'SUNSET ACRES', 'rent-due': 'LOT RENT DUE THE 1ST', 'no-soliciting': 'NO SOLICITING', 'desert-rose': 'DESERT ROSE' }[a.sign];
      const board = { 'shady-pines': ['#f1e6c0', '#2f5a3a'], 'sunset-acres': ['#fff1cf', '#c2552a'], 'rent-due': ['#1c1c1c', '#f4f1e6'], 'no-soliciting': ['#ffffff', '#b3261e'], 'desert-rose': ['#d83f7a', '#f6ead8'] }[a.sign];
      const w = Math.max(width + 0.1, 0.8), y = top + 0.3;
      if (a.kind === 'cabinet') for (const x of [-0.3, 0.3]) s.box([0.04, 0.3, 0.04], [x, top + 0.15, -0.1], timber);
      s.box([w, 0.24, 0.03], [0, y, a.kind === 'cabinet' ? -0.1 : 0.03], timber);
      const sign = s.label(text, w - 0.04, 0.2, [0, y, (a.kind === 'cabinet' ? -0.1 : 0.03) + 0.017], board[0], board[1]);
      sign.rotation.z = (random() - 0.5) * mood.wear * 0.08;
    }

    s.root.rotation.z = lean;
    s.root.rotation.x = -Math.abs(lean) * 0.35;
    root.root.add(s.root);

    // What gathers at the foot of it.
    const weeds = Array.from({ length: Math.round(mix(10, 60, mood.wear)) }, () => ({ at: [(random() - 0.5) * (random() - 0.5) * 2 * (width + 0.5), 0.04 + random() * 0.04, (random() - 0.5) * 0.45] as P, size: 0.5 + random() * 1.1, color: random() < mood.wear ? '#a39a55' : '#5f8f45' }));
    root.scatter(new THREE.ConeGeometry(0.014, 0.2, 4), root.material('#ffffff', { roughness: 1 }), weeds);
    if (a.mail === 'parcels') {
      const card = root.material('#b98d5a', { roughness: 0.9 });
      for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) {
        const size = 0.16 + random() * 0.2;
        const parcel = root.box([size * 1.3, size * 0.7, size], [(i - 1) * 0.36 + (random() - 0.5) * 0.1, size * 0.35, 0.42 + random() * 0.15], card);
        parcel.rotation.y = (random() - 0.5) * 0.8;
        root.box([size * 1.31, size * 0.71, 0.04], [parcel.position.x, size * 0.35, parcel.position.z], root.material('#e9dfc4')).rotation.y = parcel.rotation.y;
      }
    }
    const litter = a.mail === 'empty' ? 0 : Math.round(mood.density * 5 + (a.mail === 'one-overflowing' ? 3 : 0) + (a.mail === 'flyers' ? 2 : 0));
    for (let i = 0; i < litter; i++) {
      const sheet = root.box([0.12 + random() * 0.08, 0.004, 0.18], [(random() - 0.5) * (width + 0.5), 0.004 + i * 0.001, 0.25 + random() * 0.6], root.material(paperColours[Math.floor(random() * paperColours.length)], { roughness: 0.95 }));
      sheet.rotation.y = random() * 3;
    }

    const gust = mix(0.01, 0.16, mood.energy);
    return root.finish({ update: (_dt, time) => { for (const flap of flaps) { const swing = Math.sin(time * 2.1 + flap.phase) * gust; if (flap.node.rotation.x !== 0) flap.node.rotation.x = flap.base + swing; else flap.node.rotation.y = flap.base + swing; } } });
  },
});
