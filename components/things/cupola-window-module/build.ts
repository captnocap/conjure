import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const SHUTTERS = {
  open: 'Every shutter folded back like the petals of a flower, all seven windows uncovered.',
  opening: 'All the shutters half raised, caught mid-motion as the window wakes up.',
  'top-only': 'The six side shutters closed; only the round centre window is uncovered, a single porthole.',
  'one-stuck': 'Open all round except one side shutter that has jammed shut.',
  sealed: 'Every shutter closed and latched against debris: a blind armoured bud.',
} as const;
const WATCHERS = {
  one: 'One person, head and shoulders, looking out alone.',
  pair: 'Two people shoulder to shoulder, sharing the view.',
  hand: 'Nobody in view, only a hand pressed flat against the glass.',
  camera: 'Someone behind a long camera lens aimed down at the planet.',
  floating: 'Somebody asleep or daydreaming, floating sideways across the window.',
  nobody: 'Nobody: the lights are on and the window is empty.',
} as const;
const TAPED = {
  nothing: 'Nothing; clean glass.',
  photo: 'A family photograph taped in the corner.',
  drawing: "A child's crayon drawing of a house and a sun.",
  notes: 'A cluster of yellow sticky notes and a checklist.',
  flag: 'A small bright paper flag.',
  plant: 'A tiny seedling in a clear bag, taped where it gets the sun.',
} as const;
const LIGHTS = {
  work: 'Warm white work lights, mid-shift.',
  night: 'Dim red night lighting, crew asleep.',
  screens: 'Cold blue glow from laptop screens only.',
  dark: 'Dark inside so the eyes can adjust to the stars.',
} as const;
const SKINS = {
  white: 'White quilted thermal blanket, the familiar station look.',
  foil: 'Crinkled gold foil insulation.',
  aluminium: 'Bare ribbed aluminium, early and industrial.',
  patched: 'Grey shielding panels with mismatched replacement patches.',
} as const;
const EXTRAS = {
  handrails: 'Only gold handrails for spacewalkers.',
  dish: 'A small dish antenna on a stalk.',
  arm: 'A jointed robotic arm folded over the node.',
  lamps: 'Floodlamps and a camera boom pointing at the window.',
} as const;

function sticker(kind: keyof typeof TAPED, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d')!;
  if (kind === 'photo') {
    c.fillStyle = '#f6f1e4'; c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#8fc0e0'; c.fillRect(10, 10, 108, 64);
    c.fillStyle = '#6da85a'; c.fillRect(10, 74, 108, 30);
    for (const [x, h, tint] of [[38, 44, '#c9483c'], [64, 54, '#2f4a7a'], [90, 34, '#e0b23c']] as const) {
      c.fillStyle = tint; c.fillRect(x - 10, 100 - h, 20, h);
      c.fillStyle = '#e8c4a0'; c.beginPath(); c.arc(x, 92 - h, 9, 0, 7); c.fill();
    }
  } else if (kind === 'drawing') {
    c.fillStyle = '#fbfaf2'; c.fillRect(0, 0, 128, 128);
    c.lineWidth = 6; c.lineCap = 'round';
    c.strokeStyle = '#f2b319'; c.beginPath(); c.arc(98, 28, 14, 0, 7); c.stroke();
    c.strokeStyle = '#d2382e'; c.beginPath(); c.moveTo(24, 70); c.lineTo(52, 40); c.lineTo(80, 70); c.stroke();
    c.strokeStyle = '#2d57b8'; c.strokeRect(28, 70, 48, 38);
    c.strokeStyle = '#3d9a45'; c.beginPath(); c.moveTo(6, 116); c.lineTo(122, 112); c.stroke();
  } else if (kind === 'notes') {
    c.fillStyle = '#f7e36a'; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#4a4630'; c.lineWidth = 5;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(14, 24 + i * 20); c.lineTo(60 + random() * 54, 24 + i * 20); c.stroke(); }
  } else if (kind === 'flag') {
    const stripes = [['#d83a34', '#f4f1e8', '#2d4fa3'], ['#1f8f4e', '#f4f1e8', '#e2542b'], ['#f2c21b', '#2d4fa3', '#d83a34']][Math.floor(random() * 3)];
    stripes.forEach((tint, i) => { c.fillStyle = tint; c.fillRect(0, i * 43, 128, 43); });
  } else {
    c.fillStyle = '#e9f3ea'; c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#6b4a2e'; c.fillRect(24, 92, 80, 26);
    c.strokeStyle = '#3d9a45'; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(64, 92); c.lineTo(64, 46); c.stroke();
    c.fillStyle = '#4fb356';
    c.beginPath(); c.ellipse(46, 44, 20, 10, -0.5, 0, 7); c.fill();
    c.beginPath(); c.ellipse(84, 36, 20, 10, 0.5, 0, 7); c.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    shutters: choice('How are the window shutters?', SHUTTERS),
    watcher: choice('Who is at the window?', WATCHERS),
    taped: choice('What is taped to the glass?', TAPED),
    light: choice('What light is on inside?', LIGHTS),
    skin: choice('What is the outside of the module covered in?', SKINS),
    extras: choice('What is mounted on the node around the window?', EXTRAS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rig = new THREE.Group();
    s.root.add(rig);
    const add = <T extends THREE.Object3D>(parent: THREE.Object3D, child: T) => { parent.add(child); return child; };

    const skinTint = { white: '#eceae2', foil: '#c99a3a', aluminium: '#aab0b4', patched: '#9a9fa3' }[a.skin];
    const skin = s.material(skinTint, { metalness: a.skin === 'white' ? 0.05 : 0.7, roughness: a.skin === 'white' ? 0.9 : a.skin === 'foil' ? 0.38 : 0.5, flatShading: a.skin === 'foil' });
    const frame = s.material('#d8d6cf', { metalness: 0.5, roughness: 0.45 });
    const dark = s.material('#2c3036', { metalness: 0.4, roughness: 0.6 });
    const gold = s.material('#d3a534', { metalness: 0.85, roughness: 0.3 });
    const shutterPaint = s.material(a.skin === 'foil' ? '#e6e2d6' : '#f3f1ea', { roughness: 0.8, side: THREE.DoubleSide });
    const glow = { work: '#ffdca0', night: '#ff3a26', screens: '#63c8ff', dark: '#27324a' }[a.light];
    const strength = { work: 1.5, night: 1.25, screens: 1.2, dark: 0.5 }[a.light] * mix(0.75, 1.2, mood.cheer);
    const interior = new THREE.MeshStandardMaterial({ color: '#30323a', emissive: glow, emissiveIntensity: strength, roughness: 0.9 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#8fb4d8', transparent: true, opacity: 0.26, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
    const shade = new THREE.MeshStandardMaterial({ color: '#0f1116', roughness: 0.95 });

    // The node: a short pressurised can lying on its side, with a berthing port at each end.
    const node = add(rig, s.cylinder(1.12, 1.12, 2.7, [0, 0, 0], skin, a.skin === 'foil' ? 18 : 40));
    node.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      const cone = add(rig, s.cylinder(0.72, 1.12, 0.34, [side * 1.52, 0, 0], skin, 40));
      cone.rotation.z = -side * Math.PI / 2;
      const port = add(rig, s.cylinder(0.62, 0.62, 0.16, [side * 1.75, 0, 0], dark, 32));
      port.rotation.z = Math.PI / 2;
      const lip = add(rig, s.ring(0.62, 0.05, [side * 1.84, 0, 0], frame));
      lip.rotation.y = Math.PI / 2;
    }
    for (const x of [-0.82, 0.82]) {
      const seam = add(rig, s.ring(1.125, 0.03, [x, 0, 0], a.skin === 'aluminium' ? dark : frame));
      seam.rotation.y = Math.PI / 2;
    }
    if (a.skin === 'aluminium') for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      add(rig, s.box([1.6, 0.035, 0.05], [0, Math.cos(angle) * 1.13, Math.sin(angle) * 1.13], frame)).rotation.x = angle;
    }
    if (a.skin === 'patched') for (let i = 0; i < 9; i++) {
      const angle = random() * Math.PI * 2, x = (random() - 0.5) * 2.1;
      const patch = add(rig, s.box([0.3 + random() * 0.4, 0.02, 0.3 + random() * 0.3], [x, Math.cos(angle) * 1.125, Math.sin(angle) * 1.125], s.material(['#c9c6ba', '#6f757b', '#b08a4a', '#e8e6de'][Math.floor(random() * 4)], { roughness: 0.8 })));
      patch.rotation.x = angle;
    }
    // Handrails run along the node whatever else is fitted.
    for (const angle of [-0.75, 0.75, 2.4]) for (const x of [-0.85, 0.3]) {
      const y = Math.cos(angle) * 1.2, z = Math.sin(angle) * 1.2, y0 = Math.cos(angle) * 1.1, z0 = Math.sin(angle) * 1.1;
      add(rig, s.rod([x, y, z], [x + 0.55, y, z], 0.018, gold));
      add(rig, s.rod([x, y0, z0], [x, y, z], 0.014, gold));
      add(rig, s.rod([x + 0.55, y0, z0], [x + 0.55, y, z], 0.014, gold));
    }

    // The cupola is modelled pointing up its own +y, then swung out of the node's side toward +z.
    const cupola = add(rig, new THREE.Group());
    cupola.position.z = 1.0;
    cupola.rotation.x = Math.PI / 2;
    const R0 = 1.34, R1 = 0.62, Y0 = 0.34, Y1 = 1.08;
    add(cupola, s.cylinder(1.3, 1.36, 0.34, [0, 0.17, 0], skin, 36));
    add(cupola, s.ring(1.36, 0.045, [0, 0.34, 0], frame)).rotation.x = Math.PI / 2;
    add(cupola, s.cylinder(1.24, 1.24, 0.03, [0, 0.33, 0], interior, 36));
    add(cupola, s.cylinder(R1 * 0.97, R0 * 0.97, Y1 - Y0, [0, (Y0 + Y1) / 2, 0], glass, 6)).castShadow = false;
    const pane = add(cupola, s.mesh(new THREE.CircleGeometry(R1 * 0.86, 32), glass, [0, Y1, 0]));
    pane.rotation.x = -Math.PI / 2;
    pane.castShadow = false;
    const corner = (index: number, radius: number, y: number): [number, number, number] => {
      const angle = (index / 6) * Math.PI * 2;
      return [Math.sin(angle) * radius, y, Math.cos(angle) * radius];
    };
    for (let i = 0; i < 6; i++) {
      add(cupola, s.rod(corner(i, R0, Y0), corner(i, R1, Y1), 0.06, frame));
      add(cupola, s.rod(corner(i, R0, Y0), corner(i + 1, R0, Y0), 0.055, frame));
      add(cupola, s.rod(corner(i, R1, Y1), corner(i + 1, R1, Y1), 0.06, frame));
      add(cupola, s.ball([0.075, 0.075, 0.075], corner(i, R1, Y1), frame, 10));
    }

    // Shutters: six trapezoid petals hinged along the sill and a round lid over the centre pane.
    const sealed = a.shutters === 'sealed';
    const outline = new THREE.Shape();
    outline.moveTo(-0.64, 0); outline.lineTo(0.64, 0); outline.lineTo(0.3, 0.95); outline.lineTo(-0.3, 0.95); outline.closePath();
    const petal = new THREE.ExtrudeGeometry(outline, { depth: 0.045, bevelEnabled: false });
    const stuck = Math.floor(random() * 6);
    const apothem = R0 * Math.cos(Math.PI / 6);
    const CLOSED = -0.7;
    for (let i = 0; i < 6; i++) {
      const angle = ((i + 0.5) / 6) * Math.PI * 2;
      const hinge = add(cupola, new THREE.Group());
      hinge.position.set(Math.sin(angle) * (apothem + 0.07), Y0, Math.cos(angle) * (apothem + 0.07));
      hinge.rotation.y = angle;
      const leaf = add(hinge, new THREE.Group());
      leaf.rotation.x = {
        open: 1.75 + random() * 0.25,
        opening: 0.2 + random() * 0.5,
        'top-only': CLOSED,
        'one-stuck': i === stuck ? CLOSED : 1.75 + random() * 0.25,
        sealed: CLOSED,
      }[a.shutters];
      const panel = add(leaf, s.mesh(petal, shutterPaint));
      panel.position.z = 0.02;
      add(leaf, s.box([0.5, 0.05, 0.05], [0, 0.5, 0.09], dark));
      add(leaf, s.box([1.2, 0.07, 0.07], [0, 0, 0.03], dark));
    }
    const lidHinge = add(cupola, new THREE.Group());
    lidHinge.position.set(0, Y1 + 0.05, -R1 - 0.02);
    lidHinge.rotation.x = sealed ? 0 : a.shutters === 'opening' ? -1.0 : -2.5 - random() * 0.2;
    add(lidHinge, s.cylinder(R1 + 0.04, R1 + 0.04, 0.05, [0, 0, R1 + 0.02], shutterPaint, 32));
    add(lidHinge, s.box([0.3, 0.06, 0.12], [0, 0, 0.02], dark));

    // Whoever is inside reads as a dark shape against the lit interior.
    const crew = add(cupola, new THREE.Group());
    // Each floats face to the glass, so from outside they read as a head and shoulders in the pane.
    const person = (x: number, z: number, turn: number, scale = 1) => {
      const body = add(crew, new THREE.Group());
      body.position.set(x, 0.74, z);
      body.rotation.set(-Math.PI / 2, 0, turn);
      body.scale.setScalar(scale);
      add(body, s.ball([0.34, 0.2, 0.17], [0, 0.13, 0], shade, 14));
      add(body, s.ball([0.27, 0.4, 0.16], [0, -0.14, 0], shade, 14));
      add(body, s.cylinder(0.07, 0.08, 0.1, [0, 0.3, 0], shade, 10));
      add(body, s.ball([0.15, 0.18, 0.15], [0, 0.46, 0.01], shade, 14));
      return body;
    };
    let head: THREE.Object3D | null = null;
    if (a.watcher === 'one') head = person(0, 0.3, (random() - 0.5) * 0.5, 1.2);
    if (a.watcher === 'pair') { head = person(-0.27, 0.3, 0.22, 1.05); person(0.28, 0.36, -0.2, 0.95); }
    if (a.watcher === 'camera') {
      head = person(-0.08, 0.34, 0.15, 1.15);
      const lens = add(head, s.cylinder(0.1, 0.08, 0.3, [0.02, 0.46, 0.22], shade, 14));
      lens.rotation.x = Math.PI / 2;
      add(head, s.box([0.3, 0.2, 0.12], [0.02, 0.46, 0.1], shade));
      for (const side of [-1, 1]) add(head, s.rod([side * 0.3, 0.14, 0.02], [side * 0.14, 0.44, 0.12], 0.05, shade));
    }
    if (a.watcher === 'floating') {
      head = person(0.12, 0.05, 1.2 + random() * 0.5, 1.05);
      add(head, s.rod([-0.1, -0.4, 0], [-0.2, -0.95, 0.05], 0.085, shade));
      add(head, s.rod([0.1, -0.4, 0], [0.26, -0.9, -0.05], 0.085, shade));
      add(head, s.rod([0.3, 0.14, 0], [0.62, 0.36, 0.04], 0.06, shade));
    }
    if (a.watcher === 'hand') {
      const hand = add(crew, new THREE.Group());
      hand.position.set(0.1, Y1 - 0.03, 0.14);
      hand.rotation.y = 0.4;
      hand.scale.setScalar(1.7);
      add(hand, s.ball([0.1, 0.02, 0.11], [0, 0, 0], shade, 12));
      for (let f = 0; f < 5; f++) {
        const spread = (f - 2) * 0.32 + (f === 0 ? -0.5 : 0);
        add(hand, s.rod([Math.sin(spread) * 0.07, 0, -Math.cos(spread) * 0.07], [Math.sin(spread) * 0.2, 0, -Math.cos(spread) * (f === 0 ? 0.13 : 0.22)], 0.022, shade));
      }
    }
    if (a.taped !== 'nothing' && !sealed) {
      const count = a.taped === 'notes' ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const note = add(cupola, s.mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshStandardMaterial({ map: sticker(a.taped, random), roughness: 0.9, emissive: '#ffffff', emissiveIntensity: 0.12, side: THREE.DoubleSide }), [0.26 - i * 0.2 + (random() - 0.5) * 0.06, Y1 + 0.012 + i * 0.002, 0.24 - i * 0.13]));
        note.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.6);
        note.castShadow = false;
      }
    }

    if (a.extras === 'dish') {
      add(rig, s.rod([-0.9, 1.05, 0.2], [-1.05, 1.9, 0.3], 0.035, frame));
      const dish = add(rig, s.lathe([[0.02, 0], [0.25, 0.04], [0.45, 0.14], [0.55, 0.26]], s.material('#e9e8e2', { side: THREE.DoubleSide, roughness: 0.6 }), [-1.05, 1.9, 0.3]));
      dish.rotation.set(0.9, 0, 0.5);
      add(rig, s.rod([-1.05, 1.9, 0.3], [-1.2, 2.1, 0.62], 0.012, dark));
    }
    if (a.extras === 'arm') {
      const elbow: [number, number, number] = [0.2, 2.25, 0.5], wrist: [number, number, number] = [1.05, 1.5, 1.6];
      add(rig, s.cylinder(0.14, 0.16, 0.2, [-1.0, 1.15, 0], dark, 16));
      add(rig, s.rod([-1.0, 1.2, 0], elbow, 0.08, frame));
      add(rig, s.rod(elbow, wrist, 0.07, frame));
      for (const joint of [elbow, [-1.0, 1.25, 0] as [number, number, number]]) add(rig, s.ball([0.12, 0.12, 0.12], joint, dark, 12));
      add(rig, s.cylinder(0.11, 0.09, 0.26, wrist, gold, 14)).rotation.set(0.9, 0, -0.6);
    }
    if (a.extras === 'lamps') {
      for (const x of [-1.0, 1.0]) {
        add(rig, s.rod([x, 0.9, 0.6], [x * 1.15, 1.5, 1.5], 0.03, frame));
        add(rig, s.cylinder(0.13, 0.08, 0.16, [x * 1.15, 1.5, 1.5], dark, 14)).rotation.set(2.2, 0, x * 0.5);
        add(rig, s.ball([0.1, 0.1, 0.04], [x * 1.1, 1.44, 1.43], new THREE.MeshStandardMaterial({ color: '#fff6da', emissive: '#fff0c0', emissiveIntensity: mix(0.4, 2, mood.cheer) }), 12)).rotation.set(2.2, 0, x * 0.5);
      }
    }

    // Tip the whole module back so the window looks up and out at whoever is watching.
    rig.rotation.x = -0.5;
    rig.rotation.y = (random() - 0.5) * 0.35;

    const sway = mix(0.15, 1.1, mood.energy);
    const phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        if (head) head.rotation.z += Math.sin(time * sway + phase) * 0.0012 * sway;
        interior.emissiveIntensity = strength * (a.light === 'screens' ? 0.85 + 0.15 * Math.sin(time * 3.1 * sway + phase) : 1);
      },
    });
  },
});
