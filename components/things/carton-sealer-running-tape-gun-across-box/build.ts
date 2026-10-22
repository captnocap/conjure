import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { HAIRS, type P, SKINS, anatomy, at, bow, coatSkirt, ground, joints, lean, look, mug, paint, pick, poseLeg, reach } from './rig';

const OVERALLS = {
  boiler: { top: '#3a5a9a', bottom: '#3a5a9a', skirt: null },
  coat: { top: '#6b4a2e', bottom: '#2e2e34', skirt: '#6b4a2e' },
  white: { top: '#efece4', bottom: '#3a3a40', skirt: '#efece4' },
  green: { top: '#3f6a4a', bottom: '#3f6a4a', skirt: null },
} as const;

export default defineThing({
  questions: {
    carton: choice('What do the cartons look like?', {
      printed: 'Brown cartons with a bold printed brand stripe round the middle.',
      plain: 'Plain brown cardboard, unprinted.',
      white: 'White cartons with a thin coloured stripe.',
    }),
    tape: choice('What tape is in the gun?', {
      clear: 'Clear packing tape, nearly invisible on the box.',
      brown: 'Brown parcel tape, a dark band down the seam.',
    }),
    box: choice('What is happening to the box on the table?', {
      closing: 'Being sealed: the flaps pressed shut, the tape half-way along the seam.',
      opening: 'Being opened: the tape slit and the flaps standing up.',
    }),
    overalls: choice('What are they wearing?', {
      boiler: 'A blue boiler suit.',
      coat: 'A brown warehouse coat over dark trousers.',
      white: 'A white overall coat.',
      green: 'A green boiler suit.',
    }),
    hair: choice('What is on their head?', {
      short: 'Short hair.',
      cap: 'A flat cap.',
      bun: 'Hair tied back in a bun.',
      bald: 'Nothing: a bald head.',
    }),
    stack: score('How high is the stack of sealed cartons behind?', ['One or two cartons', 'Waist high', 'Head high and leaning']),
    table: choice('What else is on the table?', {
      cutter: 'A box cutter and curls of cut tape.',
      labels: 'A pad of dispatch labels and a marker.',
      tea: 'A mug of tea going cold.',
      nothing: 'Nothing but the carton.',
    }),
    marker: noul('Is there a marker pen in the chest pocket?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.6, 1.84, random());
    const build = random() < 0.35 ? 'heavy' : 'average';
    const skin = pick(random, SKINS);
    const kit = OVERALLS[a.overalls];
    const person = figure(s, {
      height: H, build, style: 'doll', skin, sleeves: 'long',
      hair: a.hair === 'bald' ? 'none' : a.hair === 'cap' ? 'cap' : a.hair, hairColor: a.hair === 'cap' ? pick(random, ['#4a4038', '#2a3a4a', '#6a5a3a']) : pick(random, HAIRS),
      top: kit.top, bottom: kit.bottom, shoes: '#26262a',
      pose: 'standing', gaze: 'down',
    });
    s.root.add(person.root);
    const { torsoL, chestR } = anatomy(H, build);
    const { spine } = joints(person, 'left');
    if (kit.skirt) coatSkirt(person, H, build, s.material(kit.skirt, { roughness: 0.9 }), 0.22);
    const front = chestR + 0.002;
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(H * 0.055, H * 0.06, 0.006), s.material(kit.top, { roughness: 0.9 }));
    pocket.position.set(H * 0.06, torsoL * 0.68, front);
    spine.add(pocket);
    if (a.marker) {
      const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.07, 8), s.material('#1d1d1f', { roughness: 0.4 }));
      marker.position.set(H * 0.06, torsoL * 0.68 + H * 0.045, front + 0.006);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.02, 8), s.material('#8a8a8e', { roughness: 0.4 }));
      cap.position.set(H * 0.06, torsoL * 0.68 + H * 0.085, front + 0.006);
      spine.add(marker, cap);
    }

    // The low steel table with the carton on it.
    const steel = s.material('#8e9497', { metalness: 0.6, roughness: 0.45 });
    const dark = s.material('#2a2c2e', { roughness: 0.85 });
    const tableTop = 0.74, tableZ = 0.46;
    s.box([1.0, 0.03, 0.64], [0, tableTop - 0.015, tableZ], steel);
    for (const dx of [-0.45, 0.45]) for (const dz of [-0.27, 0.27]) s.box([0.04, tableTop - 0.03, 0.04], [dx, (tableTop - 0.03) / 2, tableZ + dz], dark);
    for (const dx of [-0.45, 0.45]) s.box([0.03, 0.03, 0.54], [dx, 0.2, tableZ], dark);
    s.box([0.9, 0.02, 0.5], [0, 0.21, tableZ], steel);

    const cardColour = a.carton === 'white' ? '#ece8df' : '#b9915c';
    const stripeColour = pick(random, ['#b8302a', '#1f4f9f', '#2a7a4a', '#d89a20']);
    const cardboard = new THREE.MeshStandardMaterial({ map: cartonPrint(a.carton, cardColour, stripeColour), roughness: 0.95 });
    cardboard.color.lerp(new THREE.Color('#8b8275'), mood.wear * 0.18);
    const plainCard = s.material(cardColour, { roughness: 0.95 });
    const W = 0.42, D = 0.32, Hc = 0.3;
    const boxAt: P = [0, tableTop, tableZ];
    s.box([W, Hc, D], [boxAt[0], boxAt[1] + Hc / 2, boxAt[2]], cardboard);
    // Flaps hinged along the long edges; the short end flaps are already folded in.
    const closing = a.box === 'closing';
    const flapAngle = closing ? 0.08 : 1.15;
    for (const side of [-1, 1]) {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(W, 0.006, D / 2), plainCard);
      flap.castShadow = flap.receiveShadow = true;
      const hinge = new THREE.Group();
      hinge.position.set(boxAt[0], boxAt[1] + Hc, boxAt[2] + side * D / 2);
      hinge.rotation.x = side * flapAngle;
      flap.position.set(0, 0.003, -side * D / 4);
      hinge.add(flap);
      s.root.add(hinge);
    }
    for (const end of [-1, 1]) {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(W / 2 - 0.01, 0.006, D - 0.02), plainCard);
      flap.castShadow = true;
      flap.position.set(boxAt[0] + end * W / 4, boxAt[1] + Hc - 0.004, boxAt[2]);
      s.root.add(flap);
    }
    if (!closing) {
      // Packets inside, showing through the open top.
      const packets = s.scatter(new THREE.BoxGeometry(0.06, 0.2, 0.09), s.material(pick(random, ['#d82a3a', '#1f4f9f', '#e6b020', '#2a8a5a']), { roughness: 0.6 }), Array.from({ length: 12 }, (_u, i) => ({ at: [boxAt[0] - 0.165 + (i % 6) * 0.066, boxAt[1] + 0.12, boxAt[2] - 0.06 + Math.floor(i / 6) * 0.11] as P, size: 1 })));
      void packets;
    }
    // Tape along the seam: already down from one end to where the gun is.
    const tapePaint = a.tape === 'clear'
      ? new THREE.MeshStandardMaterial({ color: '#dfe8ee', transparent: true, opacity: 0.35, roughness: 0.2, depthWrite: false })
      : new THREE.MeshStandardMaterial({ color: '#a8743a', roughness: 0.4 });
    const gunX = closing ? 0.07 : -0.12;
    const tapeFrom = -W / 2 - 0.02;
    const tapeLength = closing ? gunX - tapeFrom : W + 0.04;
    const tape = s.mesh(new THREE.BoxGeometry(tapeLength, 0.003, 0.048), tapePaint, [tapeFrom + tapeLength / 2, boxAt[1] + Hc + (closing ? 0.012 : 0.012), boxAt[2]]);
    tape.castShadow = false;
    if (!closing) {
      // The seam slit open: both halves of the tape ride up on the flaps.
      tape.visible = false;
      for (const side of [-1, 1]) {
        const half = s.mesh(new THREE.BoxGeometry(W + 0.04, 0.003, 0.024), tapePaint, [0, 0, 0]);
        half.castShadow = false;
        const hinge = new THREE.Group();
        hinge.position.set(boxAt[0], boxAt[1] + Hc, boxAt[2] + side * D / 2);
        hinge.rotation.x = side * flapAngle;
        half.position.set(0, 0.009, -side * (D / 2 - 0.012));
        hinge.add(half);
        s.root.add(hinge);
      }
    }

    // Bent over the table: one hand flat on the flaps, the other on the gun.
    lean(person, 5);
    bow(person, closing ? 34 : 30);
    look(person, 30, closing ? 4 : -6);
    poseLeg(person, 'left', { out: 6 });
    poseLeg(person, 'right', { out: 6 });
    person.root.position.set(0, 0, 0);
    person.root.updateMatrixWorld(true);
    const hips = at(person.pelvis);
    person.root.position.z = tableZ - 0.32 - 0.16 - hips.z;
    person.root.updateMatrixWorld(true);
    const lid = boxAt[1] + Hc;
    reach(person, 'left', new THREE.Vector3(-0.14, lid + 0.03, boxAt[2] - (closing ? 0.02 : 0.06)), { forward: [20, 110], out: [-10, 30], bend: [0, 110], across: [-20, 40] });
    reach(person, 'right', new THREE.Vector3(gunX + 0.02, lid + 0.11, boxAt[2] + 0.02), { forward: [20, 110], out: [-10, 30], bend: [0, 110], across: [-20, 40] });
    ground(person);

    // The tape gun under the right hand: a handle, a frame and the roll, trailing the strip.
    const right = at(person.hands.right);
    const gun = new THREE.Group();
    gun.position.set(gunX, lid + 0.015, boxAt[2]);
    gun.rotation.y = 0;
    s.root.add(gun);
    const plastic = s.material(pick(random, ['#d8402a', '#2a2a2e', '#3a6ab0', '#e0a020']), { roughness: 0.5 });
    const tapeRoll = s.material(a.tape === 'clear' ? '#cfd9df' : '#a8743a', { roughness: a.tape === 'clear' ? 0.25 : 0.5, transparent: a.tape === 'clear', opacity: a.tape === 'clear' ? 0.7 : 1, depthWrite: a.tape !== 'clear' });
    const addTo = (group: THREE.Group, mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh; };
    const roll = addTo(gun, new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.05, 20), tapeRoll));
    roll.rotation.x = Math.PI / 2;
    roll.position.set(-0.04, 0.07, 0);
    const core = addTo(gun, new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.054, 16), plastic));
    core.rotation.x = Math.PI / 2;
    core.position.copy(roll.position);
    const frame = addTo(gun, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.054), plastic));
    frame.position.set(0.01, 0.015, 0);
    const blade = addTo(gun, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.056), s.material('#9ea4a8', { metalness: 0.6, roughness: 0.35 })));
    blade.position.set(0.06, 0.02, 0);
    const handle = addTo(gun, new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.1, 0.03), plastic));
    handle.position.set(0.045, 0.075, 0);
    handle.rotation.z = -0.55;
    // The hand sits on the handle; nudge the gun under wherever the hand landed.
    gun.position.x = right.x - 0.04;
    gun.position.z = Math.min(Math.max(right.z, boxAt[2] - 0.06), boxAt[2] + 0.06);

    // What else lies on the table.
    if (a.table === 'cutter') {
      const cutter = s.box([0.14, 0.014, 0.03], [0.38, tableTop + 0.007, tableZ + 0.2], s.material('#e6b020', { roughness: 0.5 }));
      cutter.rotation.y = 0.5;
      s.box([0.04, 0.004, 0.012], [0.44, tableTop + 0.01, tableZ + 0.23], s.material('#c0c4c8', { metalness: 0.7, roughness: 0.3 })).rotation.y = 0.5;
      for (let i = 0; i < 4; i++) {
        const curl = s.ring(0.02, 0.004, [-0.36 + random() * 0.15, tableTop + 0.01, tableZ + 0.15 + random() * 0.12], tapePaint, Math.PI * 1.5);
        curl.rotation.set(Math.PI / 2 + (random() - 0.5), random() * 3, 0);
        curl.castShadow = false;
      }
    } else if (a.table === 'labels') {
      s.box([0.1, 0.012, 0.14], [0.36, tableTop + 0.006, tableZ + 0.2], s.material('#f1ede4', { roughness: 0.9 })).rotation.y = 0.2;
      s.box([0.08, 0.003, 0.02], [0.36, tableTop + 0.013, tableZ + 0.18], s.material('#2a2320')).rotation.y = 0.2;
      s.cylinder(0.008, 0.008, 0.12, [0.3, tableTop + 0.008, tableZ + 0.26], s.material('#1d1d1f', { roughness: 0.4 }), 8).rotation.set(Math.PI / 2, 0, 0.9);
    } else if (a.table === 'tea') {
      mug(s, [0.38, tableTop, tableZ + 0.2], { tea: true, colour: pick(random, ['#f1ede4', '#d9c9a8', '#6a8aa8']), yaw: random() * 3 });
    }

    // The stack of sealed cartons, to the side and behind.
    const high = 1 + Math.round(a.stack * 5);
    const stackX = -0.86, stackZ = tableZ - 0.25;
    const columns = high > 3 ? 2 : 1;
    const sealed: { at: P; size: number }[] = [];
    for (let col = 0; col < columns; col++) for (let i = 0; i < high; i++) {
      if (col === 1 && i >= high - 1 && random() < 0.5) continue;
      sealed.push({ at: [stackX + (random() - 0.5) * 0.03 + i * (a.stack > 0.7 ? 0.012 : 0), i * Hc + Hc / 2, stackZ + col * (D + 0.03) + (random() - 0.5) * 0.03], size: 1 });
    }
    const stackMesh = s.scatter(new THREE.BoxGeometry(W, Hc, D), cardboard, sealed);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    sealed.forEach((p, i) => { m.compose(new THREE.Vector3(...p.at), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (random() - 0.5) * 0.12), new THREE.Vector3(1, 1, 1)); stackMesh.setMatrixAt(i, m); });
    stackMesh.instanceMatrix.needsUpdate = true;
    // Tape seams along the top of each sealed carton.
    const seams = s.scatter(new THREE.BoxGeometry(W + 0.02, 0.003, 0.048), tapePaint, sealed.map((p) => ({ at: [p.at[0], p.at[1] + Hc / 2 + 0.002, p.at[2]] as P, size: 1 })));
    seams.castShadow = false;

    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});

function cartonPrint(kind: 'printed' | 'plain' | 'white', card: string, stripe: string) {
  return paint(128, 96, (c) => {
    c.fillStyle = card;
    c.fillRect(0, 0, 128, 96);
    if (kind === 'plain') {
      c.fillStyle = 'rgba(0,0,0,0.08)';
      c.fillRect(0, 0, 128, 3);
      c.fillRect(0, 93, 128, 3);
      return;
    }
    c.fillStyle = stripe;
    if (kind === 'printed') c.fillRect(0, 34, 128, 28);
    else c.fillRect(0, 44, 128, 8);
    c.fillStyle = kind === 'printed' ? card : stripe;
    for (let i = 0; i < 5; i++) c.fillRect(20 + i * 18, kind === 'printed' ? 43 : 64, 11, 10);
  });
}
