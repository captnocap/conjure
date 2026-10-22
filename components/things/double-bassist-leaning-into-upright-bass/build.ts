import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { RAD, anatomy, at, garment, moustache, paint, pick, pickSkin, reachHand, rig, shirtFront, slick, type P } from './milonga';

const VARNISH = {
  blond: 'Honey-blond spruce and pale maple, bright under the lights.',
  red: 'Classic red-brown varnish, warm and glowing.',
  dark: 'Dark old brown, almost black at the edges, a century of nights.',
  black: 'Painted black with cream binding, a jazz-club bass.',
} as const;
const VARNISH_COLOUR: Record<keyof typeof VARNISH, { centre: string; edge: string; ribs: string }> = {
  blond: { centre: '#e0a85a', edge: '#a8662a', ribs: '#b8783a' },
  red: { centre: '#b8562a', edge: '#5a1e10', ribs: '#7a3018' },
  dark: { centre: '#6a3a1e', edge: '#24120a', ribs: '#3a1e10' },
  black: { centre: '#2a2624', edge: '#141212', ribs: '#1a1818' },
};

/** The right half of the body outline, from the bottom up, in metres. Mirrored for the left. */
const OUTLINE: [number, number][] = [
  [0.2, 0.015], [0.3, 0.1], [0.345, 0.25], [0.33, 0.4], [0.28, 0.48], [0.215, 0.53], [0.2, 0.6], [0.215, 0.67], [0.255, 0.72],
  [0.27, 0.8], [0.25, 0.9], [0.18, 0.99], [0.09, 1.06],
];

export default defineThing({
  questions: {
    varnish: choice('What does the bass look like?', VARNISH),
    play: choice('How is he playing?', {
      pizz: 'Plucking with two fingers, the bow tucked in at the tailpiece.',
      arco: 'Drawing the bow long across the strings just above the bridge.',
      slap: 'Slapping: the right hand pulled away from the strings mid-beat, rockabilly fashion.',
    }),
    moment: choice('Where is his attention?', {
      fingerboard: 'Down at the fingerboard, finding the note.',
      eyesShut: 'Eyes shut, head up, cheek against the neck, inside the sound.',
      cue: 'Turned toward the band, watching for the cue.',
    }),
    lean: score('How far does he lean into the bass?', ['Standing upright beside it', 'Leaning his hip into it', 'Wrapped round it, cheek on the neck']),
    dress: choice('What is he wearing?', {
      suit: 'A dark suit, jacket on, thin tie.',
      shirtsleeves: 'Jacket off, shirtsleeves rolled, braces.',
      waistcoat: 'A waistcoat over a white shirt.',
      white: 'A white dinner jacket and a bow tie.',
    }),
    hair: choice('What is on his head?', {
      dark: 'Short dark hair, slicked.',
      grey: 'Short grey hair.',
      bald: 'Bald.',
      hat: 'A narrow-brimmed hat.',
    }),
    stand: noul('Is there a music stand beside him?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.72, 1.88, random());
    const build = random() < 0.3 ? 'heavy' : 'average';
    const skin = pickSkin(random);
    const { headR, torsoL, chestR } = anatomy(H, build);

    // ---- the player, feet apart, leaning toward his left where the bass stands
    const suitColour = { suit: '#23232a', shirtsleeves: '#2e2e36', waistcoat: '#2b2a31', white: '#efe9dc' }[a.dress];
    const person = figure(s, {
      height: H, build, style: 'doll', skin, hair: a.hair === 'hat' ? 'hat' : 'none', hairColor: '#2a2320',
      top: a.dress === 'suit' || a.dress === 'white' ? suitColour : '#f3f0e8', bottom: a.dress === 'white' ? '#1c1b1f' : suitColour,
      shoes: '#121014', sleeves: a.dress === 'shirtsleeves' ? 'short' : 'long', pose: 'standing', gaze: 'down',
    });
    s.root.add(person.root);
    const pose = rig(person);
    const lean = a.lean;
    pose.leg('left', { forward: 4, out: 9 + lean * 3, knee: 6 });
    pose.leg('right', { forward: -3, out: 9, knee: 3 + lean * 8 });
    pose.lean(4 + lean * 4, -2 - lean * 5);
    pose.bow(6 + lean * 8, -3 - lean * 7, 12);
    const tilt = -(4 + lean * 10);
    if (a.moment === 'fingerboard') pose.look(28, 30, tilt);
    else if (a.moment === 'eyesShut') pose.look(-6, 22, tilt - 6);
    else pose.look(4, -48, tilt * 0.5);
    person.settle();
    const head = at(s, person.head);

    // ---- the bass: an extruded body with a painted top, neck, fingerboard, scroll, bridge, strings and endpin
    const colours = VARNISH_COLOUR[a.varnish];
    const bass = new THREE.Group();
    const endpin = 0.17, depth = 0.17;
    const front = depth / 2 + 0.022;
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], position: P, rotation: P = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      mesh.castShadow = mesh.receiveShadow = true;
      bass.add(mesh);
      return mesh;
    };
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.splineThru([...OUTLINE.map(([x, y]) => new THREE.Vector2(x, y)), new THREE.Vector2(0, 1.085), ...OUTLINE.slice().reverse().map(([x, y]) => new THREE.Vector2(-x, y)), new THREE.Vector2(0, 0)]);
    const body = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.018, bevelSegments: 3, curveSegments: 60 });
    body.translate(0, endpin, -depth / 2);
    // The top: a varnish burst, purfling inset from the edge, and two f-holes.
    const W = 0.74, Ht = 1.12;
    const top = paint(256, 384, (c) => {
      const px = (x: number) => (x / W + 0.5) * 256, py = (y: number) => (1 - (y + 0.02) / Ht) * 384;
      const burst = c.createRadialGradient(128, py(0.36), 10, 128, py(0.5), 230);
      burst.addColorStop(0, colours.centre);
      burst.addColorStop(1, colours.edge);
      c.fillStyle = burst;
      c.fillRect(0, 0, 256, 384);
      if (a.varnish !== 'black') {
        c.globalAlpha = 0.12;
        c.strokeStyle = '#2a140a';
        for (let x = 4; x < 256; x += 7 + (x % 5)) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 3, 384); c.stroke(); }
        c.globalAlpha = 1;
      }
      c.strokeStyle = a.varnish === 'black' ? '#e9e0c8' : '#1a0c06';
      c.lineWidth = 3;
      c.beginPath();
      const inset = 0.94;
      OUTLINE.forEach(([x, y], index) => (index ? c.lineTo(px(x * inset), py(0.54 + (y - 0.54) * inset)) : c.moveTo(px(0), py(0.54 - 0.54 * inset))));
      c.lineTo(px(0), py(0.54 + (1.085 - 0.54) * inset));
      OUTLINE.slice().reverse().forEach(([x, y]) => c.lineTo(px(-x * inset), py(0.54 + (y - 0.54) * inset)));
      c.closePath();
      c.stroke();
      c.strokeStyle = c.fillStyle = '#0e0806';
      c.lineWidth = 5;
      for (const side of [-1, 1]) {
        const x = side * 0.125;
        c.beginPath();
        c.moveTo(px(x - side * 0.03), py(0.7));
        c.bezierCurveTo(px(x + side * 0.03), py(0.65), px(x - side * 0.03), py(0.52), px(x + side * 0.03), py(0.45));
        c.stroke();
        for (const [ex, ey] of [[x - side * 0.03, 0.705], [x + side * 0.03, 0.445]]) { c.beginPath(); c.arc(px(ex), py(ey), 4.5, 0, Math.PI * 2); c.fill(); }
      }
    });
    top.repeat.set(1 / W, 1 / Ht);
    top.offset.set(0.5, 0.02 / Ht);
    const varnish = new THREE.MeshStandardMaterial({ map: top, roughness: 0.32, metalness: 0.05 });
    const ribs = s.material(colours.ribs, { roughness: 0.35 });
    part(body, [varnish, ribs], [0, 0, 0]);
    const ebony = s.material('#141010', { roughness: 0.4 });
    const maple = s.material(a.varnish === 'black' ? '#d9c7a0' : '#d9b880', { roughness: 0.6 });
    const bodyTop = endpin + 1.085;
    // Neck and fingerboard, tipped back so the strings rise off the top at the bridge.
    const neckTop = bodyTop + 0.5;
    part(new THREE.BoxGeometry(0.055, neckTop - bodyTop + 0.08, 0.07), ribs, [0, (bodyTop + neckTop) / 2 - 0.02, front - 0.005]);
    const boardLength = neckTop - (endpin + 0.78);
    const board = part(new THREE.BoxGeometry(0.075, boardLength, 0.022), ebony, [0, endpin + 0.78 + boardLength / 2, front + 0.045]);
    board.rotation.x = -0.035;
    // Pegbox and scroll.
    part(new THREE.BoxGeometry(0.06, 0.2, 0.07), ribs, [0, neckTop + 0.09, front - 0.015], [-0.12, 0, 0]);
    part(new THREE.TorusGeometry(0.036, 0.02, 8, 18), ribs, [0, neckTop + 0.215, front - 0.045], [0, Math.PI / 2, 0]);
    part(new THREE.SphereGeometry(0.018, 10, 8), ribs, [0, neckTop + 0.215, front - 0.045]);
    const brass = s.material('#c9a44a', { metalness: 0.8, roughness: 0.3 });
    for (const side of [-1, 1]) {
      part(new THREE.BoxGeometry(0.006, 0.17, 0.035), brass, [side * 0.033, neckTop + 0.09, front - 0.02], [-0.12, 0, 0]);
      for (let i = 0; i < 2; i++) part(new THREE.CylinderGeometry(0.012, 0.012, 0.035, 10), brass, [side * 0.055, neckTop + 0.045 + i * 0.08, front - 0.02], [0, 0, Math.PI / 2]);
    }
    // Bridge, tailpiece, strings, endpin.
    const bridgeY = endpin + 0.53;
    part(new THREE.BoxGeometry(0.15, 0.014, 0.13), maple, [0, bridgeY, front + 0.065]);
    const tailTop = endpin + 0.36, tailBottom = endpin + 0.1;
    part(new THREE.CylinderGeometry(0.05, 0.028, tailTop - tailBottom, 4), ebony, [0, (tailTop + tailBottom) / 2, front + 0.02], [0, Math.PI / 4, 0]).scale.set(1, 1, 0.3);
    const steel = s.material('#b8b4a8', { metalness: 0.8, roughness: 0.3 });
    const strings: { from: P; mid: P; to: P }[] = [];
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 0.02;
      strings.push({ from: [x * 1.4, tailTop, front + 0.035], mid: [x * 1.7, bridgeY + 0.065, front + 0.13], to: [x * 0.8, neckTop, front + 0.06] });
    }
    for (const string of strings) {
      const a1 = new THREE.Vector3(...string.from), b1 = new THREE.Vector3(...string.mid), c1 = new THREE.Vector3(...string.to);
      for (const [from, to] of [[a1, b1], [b1, c1]] as const) {
        const rod = part(new THREE.CylinderGeometry(0.0025, 0.0025, from.distanceTo(to), 5), steel, from.clone().add(to).multiplyScalar(0.5).toArray() as P);
        rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      }
    }
    part(new THREE.CylinderGeometry(0.006, 0.004, endpin, 8), steel, [0, endpin / 2, 0]);
    part(new THREE.LatheGeometry([[0, 0], [0.03, 0], [0.034, 0.02], [0.018, 0.04], [0, 0.04]].map(([x, y]) => new THREE.Vector2(x, y)), 16), ebony, [0, endpin - 0.03, 0]);

    // Lean it back into him and turn its face a little toward his right, then bring the neck to his cheek.
    const tiltBack = (12 + lean * 6) * RAD;
    bass.rotation.set(-tiltBack, -24 * RAD, 0, 'XYZ');
    s.root.add(bass);
    bass.updateMatrixWorld(true);
    const neckAt = (y: number) => s.root.worldToLocal(bass.localToWorld(new THREE.Vector3(0, y, 0.02)));
    let local = bodyTop + 0.2;
    for (let i = 0; i < 8; i++) local += (head.y - neckAt(local).y) / Math.cos(tiltBack);
    const cheek = head.clone().add(new THREE.Vector3(headR + 0.03 + (1 - lean) * 0.07, 0, 0.02));
    bass.position.copy(cheek.sub(neckAt(local)));
    bass.position.y = 0;
    bass.updateMatrixWorld(true);
    // Keep the bass's back off his belly: push it forward until the upper back clears his chest.
    const chest = at(s, person.joints.spine).add(new THREE.Vector3(0, torsoL * 0.6, chestR * 1.05));
    const back = s.root.worldToLocal(bass.localToWorld(new THREE.Vector3(-0.12, endpin + 0.85, -depth / 2 - 0.02)));
    if (back.z < chest.z) bass.position.z += chest.z - back.z;
    bass.updateMatrixWorld(true);
    const onBass = (x: number, y: number, z: number) => s.root.worldToLocal(bass.localToWorld(new THREE.Vector3(x, y, z)));

    // ---- hands: the left high on the neck, the right on the strings (or pulled away, or holding the bow)
    reachHand(s, person, 'left', onBass(-0.035, neckTop - 0.12 - lean * 0.08, front + 0.02), { across: true, outMin: 0, outMax: 80 });
    if (a.play === 'pizz') reachHand(s, person, 'right', onBass(-0.03, endpin + 0.84, front + 0.11), { across: true, outMin: -10, outMax: 50 });
    else if (a.play === 'slap') reachHand(s, person, 'right', onBass(-0.22, endpin + 0.98, front + 0.2), { across: true, outMin: -10, outMax: 60 });
    else reachHand(s, person, 'right', onBass(-0.3, bridgeY + 0.12, front + 0.13), { across: true, outMin: -10, outMax: 60 });

    // ---- the bow: drawn across below the bridge, or tucked through the tailpiece
    const bowWood = s.material('#5a2a14', { roughness: 0.4 });
    const hair = s.material('#efe9da', { roughness: 0.9 });
    const bowAt = (from: THREE.Vector3, to: THREE.Vector3) => {
      const stick = s.rod(from.toArray() as P, to.toArray() as P, 0.006, bowWood, 0.004);
      const offset = new THREE.Vector3(0, -0.025, 0);
      s.rod(from.clone().add(offset).toArray() as P, to.clone().add(offset.multiplyScalar(0.6)).toArray() as P, 0.004, hair);
      s.box([0.03, 0.035, 0.018], from.clone().add(new THREE.Vector3(0, -0.012, 0)).toArray() as P, ebony).quaternion.copy(stick.quaternion);
    };
    if (a.play === 'arco') {
      s.root.updateMatrixWorld(true);
      const grip = at(s, person.hands.right);
      const across = onBass(0.2, bridgeY + 0.1, front + 0.13);
      const direction = across.clone().sub(grip).normalize();
      bowAt(grip, grip.clone().addScaledVector(direction, 0.72));
    } else {
      const from = onBass(-0.12, tailTop - 0.04, front + 0.06), to = onBass(0.3, endpin + 0.55, front + 0.04);
      bowAt(from, from.clone().addScaledVector(to.clone().sub(from).normalize(), 0.72));
    }

    // ---- clothes, hair, a music stand
    if (a.dress === 'suit' || a.dress === 'white') {
      const jacketMat = s.material(suitColour, { roughness: a.dress === 'white' ? 0.7 : 0.85, side: THREE.DoubleSide });
      garment(person, H, build, jacketMat, { grow: 1.12, length: 1.04, open: 36, flare: 1.1, lift: -0.02 });
      for (const side of [-1, 1]) {
        const lapel = new THREE.Mesh(new THREE.BoxGeometry(chestR * 0.34, torsoL * 0.44, 0.012), jacketMat);
        lapel.position.set(side * chestR * 0.42, torsoL * 0.72, chestR * 1.06);
        lapel.rotation.set(0, side * 0.5, side * 0.12);
        person.joints.spine.add(lapel);
      }
      shirtFront(s, person, H, build, { tie: a.dress === 'white' ? 'bow' : 'tie', tieColour: a.dress === 'white' ? '#1c1b1f' : pick(random, ['#7a1f2a', '#1f2a4a', '#2a2a30']) });
    } else if (a.dress === 'waistcoat') {
      garment(person, H, build, s.material('#2b2a31', { roughness: 0.8, side: THREE.DoubleSide }), { grow: 1.1, length: 0.9, open: 44, lift: 0.04 });
      shirtFront(s, person, H, build, { tie: 'tie', tieColour: pick(random, ['#7a1f2a', '#1f2a4a', '#5a3a1a']) });
    } else {
      const brace = s.material(pick(random, ['#2a2a30', '#7a1f2a']), { roughness: 0.8 });
      for (const side of [-1, 1]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.03, torsoL * 0.95, 0.008), brace);
        strap.position.set(side * chestR * 0.5, torsoL * 0.5, chestR * 1.0);
        strap.rotation.y = side * 0.25;
        person.joints.spine.add(strap);
      }
    }
    if (a.hair === 'dark' || a.hair === 'grey') slick(person, H, s.material(a.hair === 'grey' ? pick(random, ['#b5b2ab', '#d9d6cf']) : '#1a1410', { roughness: 0.35 }));
    if (random() < 0.35) moustache(person, H, s.material(a.hair === 'grey' || a.hair === 'bald' ? '#8a8780' : '#1a1410', { roughness: 0.6 }));
    if (a.stand) {
      const iron = s.material('#2a2a2c', { metalness: 0.6, roughness: 0.4 });
      const sx = -0.62, sz = 0.42;
      for (let i = 0; i < 3; i++) { const angle = i * Math.PI * 2 / 3 + 0.3; s.rod([sx, 0.2, sz], [sx + Math.sin(angle) * 0.2, 0, sz + Math.cos(angle) * 0.2], 0.007, iron); }
      s.cylinder(0.008, 0.01, 0.95, [sx, 0.65, sz], iron, 8);
      const desk = s.box([0.42, 0.32, 0.012], [sx, 1.2, sz - 0.04], iron);
      desk.rotation.set(-0.5, 0.45, 0, 'YXZ');
      const sheet = s.label('BASSO', 0.3, 0.22, [sx + 0.012, 1.21, sz - 0.03], '#3a3a3a', '#efe8d6');
      sheet.rotation.set(-0.5, 0.45, 0, 'YXZ');
    }

    // ---- a nodding head and a pulsing pluck, quicker with the evening
    const energy = mood.energy;
    const elbow = person.joints.elbows.right;
    const restElbow = elbow.rotation.x;
    const neck = person.joints.neck;
    const restNod = neck.rotation.x;
    const tempo = mix(1.5, 4.5, energy);
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        const beat = Math.max(0, Math.sin(time * tempo)) ** 4;
        elbow.rotation.x = restElbow + beat * (a.play === 'slap' ? 0.25 : 0.08) * (0.3 + energy);
        neck.rotation.x = restNod + beat * 0.05 * (0.3 + energy);
      },
    });
  },
});
