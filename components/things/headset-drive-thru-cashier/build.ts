import * as THREE from 'three';
import { type Figure, Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';

type V3 = [number, number, number];
const RAD = Math.PI / 180;

const UNIFORMS = {
  red: { top: '#c42a2a', bottom: '#2a2a2e', visor: '#c42a2a', stripe: '#c42a2a' },
  blue: { top: '#2d5fa8', bottom: '#1f2330', visor: '#2d5fa8', stripe: '#2d5fa8' },
  stripes: { top: '#8a5a2a', bottom: '#5a3a1a', visor: '#e0a81c', stripe: '#e0a81c' },
  black: { top: '#1f1f22', bottom: '#1f1f22', visor: '#f2c21b', stripe: '#f2c21b' },
  green: { top: '#2f7a4a', bottom: '#2a2a2e', visor: '#2f7a4a', stripe: '#2f7a4a' },
} as const;

/** Where a joint or attachment sits in the sculpture's space right now. */
function at(node: THREE.Object3D) {
  node.updateWorldMatrix(true, false);
  return node.getWorldPosition(new THREE.Vector3());
}

function arm(person: Figure, side: 'left' | 'right', forward: number, bend: number, out = 0, inward = 0) {
  const sign = side === 'left' ? 1 : -1;
  person.joints.shoulders[side].rotation.set(-forward * RAD, 0, sign * out * RAD);
  person.joints.elbows[side].rotation.set(-bend * RAD, sign * inward * RAD, 0);
}

export default defineThing({
  questions: {
    handing: choice('What are they handing over?', {
      bag: 'A folded-over brown paper bag.',
      tray: 'A tray with a wrapped burger, fries and a drink.',
      carrier: 'A cardboard drink carrier with two or three lidded cups.',
      nothing: 'Nothing yet: hands on the sill, waiting on the kitchen.',
    }),
    stance: choice('How are they standing?', {
      leaning: 'Leaning right out of the window, eager, arms outstretched.',
      slumped: 'Slumped on the sill, bored, chin in one hand.',
      shouting: 'Turned over a shoulder, a hand on the headset, shouting an order back to the kitchen.',
      pointing: 'Pointing you on to the next window.',
    }),
    uniform: choice('What is the uniform?', {
      red: 'A red polo shirt and black trousers.',
      blue: 'A royal blue polo and dark trousers.',
      stripes: 'A 1970s brown and mustard striped shirt.',
      black: 'All black with yellow trim.',
      green: 'A green polo, like a coffee chain.',
    }),
    hat: choice('What is on their head?', {
      visor: 'A branded visor over the hair.',
      paper: 'A white folded paper hat.',
      cap: 'A baseball cap.',
      hairnet: 'A hairnet over a bun.',
      none: 'Nothing, just hair.',
    }),
    tag: noul('Are they wearing a name tag?'),
    setting: choice('Where are they?', {
      window: 'Leaning from a sliding pickup window in a cladded wall, the kitchen glowing behind them.',
      counter: 'Standing behind a front counter with a register.',
      alone: 'Standing alone, nothing around them.',
    }),
    second: noul('Is a second cashier standing behind them?'),
    height: score('How tall are they?', ['A short teenager', 'Average height', 'Tall and gangly']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const uniform = UNIFORMS[a.uniform];
    const H = mix(1.52, 1.88, a.height);
    const skin = pick(['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0', '#9a6b4b', '#e3c2a4']);
    const hairColour = pick(['#2a1f18', '#5a3a22', '#c99a4a', '#1a1a1c', '#8a4a2a']);
    const hair = a.hat === 'cap' ? 'cap' : a.hat === 'hairnet' ? 'bun' : pick(['short', 'short', 'long', 'bun'] as const);
    const twoHanded = a.handing === 'tray' || a.handing === 'carrier';
    const wall = s.material(pick(['#e8dfc8', '#d9d4c4', '#c9b89a', '#e6e2d6']), { roughness: 0.9 });
    const trim = s.material(uniform.stripe, { roughness: 0.6 });
    const steel = s.material('#b9bec0', { metalness: 0.75, roughness: 0.3 });
    const dark = s.material('#2b2b2e', { roughness: 0.6 });

    // ---- the person
    const person = figure(s, {
      height: H, style: 'doll', pose: 'standing', hair, hairColor: a.hat === 'cap' ? uniform.visor : hairColour, skin,
      top: uniform.top, bottom: uniform.bottom, shoes: '#1d1a18', sleeves: 'short',
      build: random() < 0.25 ? 'heavy' : random() < 0.3 ? 'slight' : 'average',
      gaze: a.stance === 'shouting' ? 'over-shoulder' : a.stance === 'pointing' ? 'right' : a.stance === 'slumped' ? 'down' : 'ahead',
    });
    s.root.add(person.root);
    const { joints } = person;
    const hold = (side: 'left' | 'right') => arm(person, side, a.handing === 'nothing' ? 42 : 58, a.handing === 'nothing' ? 25 : 32, 2, twoHanded ? 12 : 0);
    if (a.stance === 'leaning') {
      joints.body.rotation.x = mix(0.14, 0.26, mood.cheer);
      joints.spine.rotation.x = 0.12;
      hold('left');
      hold('right');
    } else if (a.stance === 'slumped') {
      joints.body.rotation.x = 0.05;
      joints.spine.rotation.x = 0.26;
      joints.neck.rotation.x += 0.08;
      arm(person, 'left', 70, 125, 4, 35);
      hold('right');
      if (twoHanded) hold('left');
    } else if (a.stance === 'shouting') {
      joints.spine.rotation.x = -0.08;
      joints.spine.rotation.y = 0.35;
      arm(person, 'left', 50, 140, 65, 0);
      hold('right');
      if (twoHanded) arm(person, 'left', 58, 32, 2, 12);
    } else {
      joints.spine.rotation.y = -0.2;
      arm(person, 'right', 88, 4, 8, 0);
      hold('left');
      if (twoHanded) arm(person, 'right', 58, 32, 2, 12);
    }
    person.settle();
    person.root.updateMatrixWorld(true);
    const headR = H * 0.064;
    const limb = H * 0.036;
    const torsoL = H * 0.28;

    // ---- headgear, headset and name tag hang off the figure's own joints
    const headAdd = (mesh: THREE.Mesh, pos: V3, rot: V3 = [0, 0, 0]) => { mesh.position.set(...pos); mesh.rotation.set(...rot); mesh.castShadow = true; person.head.add(mesh); return mesh; };
    if (a.hat === 'visor') {
      const band = headAdd(new THREE.Mesh(new THREE.TorusGeometry(headR * 1.06, headR * 0.16, 6, 20, Math.PI * 1.6), s.material(uniform.visor, { roughness: 0.6 })), [0, headR * 0.45, 0], [Math.PI / 2, 0, Math.PI * 0.7]);
      band.scale.y = 1.4;
      headAdd(new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.5, headR * 1.5, headR * 0.1, 20, 1, false, -Math.PI * 0.42, Math.PI * 0.84), s.material(uniform.visor, { roughness: 0.6 })), [0, headR * 0.5, headR * 0.2], [0.12, 0, 0]);
    } else if (a.hat === 'paper') {
      const paper = s.material('#f6f4ee', { roughness: 0.9 });
      headAdd(new THREE.Mesh(new THREE.BoxGeometry(headR * 1.0, headR * 0.9, headR * 2.1), paper), [0, headR * 1.3, 0], [0, 0, 0.08]);
      headAdd(new THREE.Mesh(new THREE.BoxGeometry(headR * 0.2, headR * 0.5, headR * 1.9), trim), [0, headR * 1.55, 0], [0, 0, 0.08]);
    } else if (a.hat === 'hairnet') {
      headAdd(new THREE.Mesh(new THREE.SphereGeometry(headR * 1.12, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: '#d9d9d9', transparent: true, opacity: 0.35, depthWrite: false, roughness: 0.9 })), [0, headR * 0.08, 0]);
    }
    // The headset: a band over the crown, an earpiece and a boom mic to the mouth.
    const plastic = s.material('#1b1b1e', { roughness: 0.4 });
    headAdd(new THREE.Mesh(new THREE.TorusGeometry(headR * 1.08, headR * 0.06, 6, 20, Math.PI), plastic), [0, headR * 0.15, -headR * 0.15], [0, Math.PI / 2, 0]).scale.set(1, 1, 1);
    headAdd(new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.28, headR * 0.28, headR * 0.14, 12), plastic), [headR * 1.05, 0, -headR * 0.1], [0, 0, Math.PI / 2]);
    const boom = new THREE.Vector3(headR * 0.5, -headR * 0.55, headR * 0.95);
    const earpiece = new THREE.Vector3(headR * 1.05, 0, -headR * 0.05);
    const boomMesh = headAdd(new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.04, headR * 0.04, boom.distanceTo(earpiece), 6), plastic), earpiece.clone().lerp(boom, 0.5).toArray() as V3);
    boomMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), boom.clone().sub(earpiece).normalize());
    headAdd(new THREE.Mesh(new THREE.SphereGeometry(headR * 0.12, 8, 6), s.material('#3a3a3c', { roughness: 1 })), boom.toArray() as V3);
    if (a.tag) {
      const tag = s.label(pick(['KAYLA', 'MARCUS', 'TREY', 'JESS', 'DEV', 'PRIYA', 'TRAINEE']), 0.075, 0.028, [0, 0, 0], '#1a1a1a', '#f6f4ee');
      s.root.remove(tag);
      tag.position.set(-H * 0.06, torsoL * 0.76, limb * 1.35 + 0.012);
      joints.spine.add(tag);
    }
    // A collar and placket on the polo.
    const collar = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.1, limb * 0.22, 6, 18), s.material(a.uniform === 'stripes' ? '#e0a81c' : '#f3f1ea', { roughness: 0.8 }));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = torsoL + 0.004;
    joints.spine.add(collar);
    if (a.uniform === 'stripes') for (let i = 0; i < 4; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(H * 0.2, torsoL * 0.05, limb * 2.8), s.material('#e0a81c', { roughness: 0.8 }));
      stripe.position.set(0, torsoL * (0.2 + i * 0.18), 0);
      joints.spine.add(stripe);
    }

    // ---- the thing handed over, at the hands
    const hl = at(person.hands.left), hr = at(person.hands.right);
    const holdSide = a.stance === 'pointing' ? hl : hr;
    const both = hl.clone().add(hr).multiplyScalar(0.5);
    const paper = s.material('#b98a5a', { roughness: 0.95 });
    if (a.handing === 'bag') {
      const bag = new THREE.Group();
      bag.position.set(holdSide.x, holdSide.y - 0.02, holdSide.z + 0.04);
      bag.rotation.y = jitter(0.3);
      s.root.add(bag);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.27, 0.12), paper);
      body.position.y = -0.14;
      body.castShadow = body.receiveShadow = true;
      bag.add(body);
      const fold = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.07), s.material('#a87a4a', { roughness: 0.95 }));
      fold.position.set(0, 0.0, -0.02);
      fold.rotation.x = 0.4;
      bag.add(fold);
      const logo = s.label(pick(['THANK YOU', 'HOT', 'EAT', 'TO GO']), 0.14, 0.05, [0, 0, 0], uniform.stripe, '#b98a5a');
      s.root.remove(logo);
      logo.position.set(0, -0.14, 0.061);
      bag.add(logo);
      if (mood.wear > 0.4) {
        const grease = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), s.material('#8a6236', { roughness: 0.6 }));
        grease.position.set(0.04, -0.2, 0.062);
        bag.add(grease);
      }
    } else if (a.handing === 'tray') {
      const tray = new THREE.Group();
      tray.position.set(both.x, both.y + 0.015, both.z + 0.02);
      tray.rotation.y = jitter(0.2);
      s.root.add(tray);
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, pos: V3) => { const m = new THREE.Mesh(geometry, material); m.position.set(...pos); m.castShadow = m.receiveShadow = true; tray.add(m); return m; };
      add(new THREE.BoxGeometry(0.42, 0.012, 0.3), s.material(pick(['#5a1f24', '#2b2b2e', '#4c3a2a']), { roughness: 0.5 }), [0, 0, 0]);
      add(new THREE.PlaneGeometry(0.38, 0.26).rotateX(-Math.PI / 2), s.material('#f3ead6', { roughness: 0.95 }), [0, 0.007, 0]);
      add(new THREE.BoxGeometry(0.11, 0.07, 0.11), s.material('#f1ede4', { roughness: 0.9 }), [0.08, 0.042, -0.04]);
      add(new THREE.BoxGeometry(0.07, 0.09, 0.045), s.material(uniform.stripe, { roughness: 0.6 }), [-0.09, 0.05, -0.04]);
      for (let i = 0; i < 9; i++) { const fry = add(new THREE.BoxGeometry(0.007, 0.07, 0.007), s.material('#e9c25a', { roughness: 0.7 }), [-0.09 + jitter(0.045), 0.11, -0.04 + jitter(0.02)]); fry.rotation.set(jitter(0.5), 0, jitter(0.5)); }
      add(new THREE.CylinderGeometry(0.04, 0.032, 0.14, 16), s.material('#f1ede4', { roughness: 0.7 }), [0.12, 0.077, 0.08]);
      add(new THREE.CylinderGeometry(0.043, 0.043, 0.008, 16), s.material('#f6f6f3', { roughness: 0.5 }), [0.12, 0.15, 0.08]);
      add(new THREE.CylinderGeometry(0.0035, 0.0035, 0.1, 6), s.material('#d8262c'), [0.13, 0.19, 0.08]).rotation.z = -0.15;
    } else if (a.handing === 'carrier') {
      const carrier = new THREE.Group();
      carrier.position.set(both.x, both.y + 0.01, both.z + 0.02);
      carrier.rotation.y = jitter(0.3);
      s.root.add(carrier);
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, pos: V3) => { const m = new THREE.Mesh(geometry, material); m.position.set(...pos); m.castShadow = m.receiveShadow = true; carrier.add(m); return m; };
      const board = s.material('#c9b08a', { roughness: 0.95 });
      add(new THREE.BoxGeometry(0.26, 0.05, 0.26), board, [0, 0.025, 0]);
      add(new THREE.BoxGeometry(0.26, 0.025, 0.02), board, [0, 0.0625, 0]);
      add(new THREE.BoxGeometry(0.02, 0.025, 0.26), board, [0, 0.0625, 0]);
      const cups = 2 + Math.round(random() * 2);
      const spots: V3[] = [[-0.065, 0, -0.065], [0.065, 0, -0.065], [-0.065, 0, 0.065], [0.065, 0, 0.065]];
      for (let i = 0; i < cups; i++) {
        const [x, , z] = spots[i];
        add(new THREE.CylinderGeometry(0.04, 0.032, 0.14, 16), s.material(pick(['#f1ede4', uniform.stripe, '#e9e6de']), { roughness: 0.7 }), [x, 0.09, z]);
        add(new THREE.CylinderGeometry(0.043, 0.043, 0.008, 16), s.material('#f6f6f3', { roughness: 0.5 }), [x, 0.164, z]);
        add(new THREE.CylinderGeometry(0.0035, 0.0035, 0.1, 6), s.material(pick(['#d8262c', '#2b7bd6', '#f4f4f4'])), [x + 0.01, 0.2, z]).rotation.z = -0.2;
      }
    }

    // ---- the setting the figure stands in
    const feet = at(person.root);
    const hips = at(person.pelvis);
    if (a.setting === 'window') {
      // The figure stands behind a cladded wall and leans through the opening; the sill sits just below the hands.
      const sillY = Math.max(0.85, Math.min(hips.y + 0.12, both.y - 0.08));
      const wallZ = hips.z + 0.22 + (a.stance === 'leaning' ? 0.1 : 0);
      const WW = 1.7, WH = 2.3, OW = 1.3, OH = 1.1;
      const openBottom = sillY, openTop = sillY + OH;
      s.box([WW, openBottom, 0.2], [feet.x, openBottom / 2, wallZ], wall);
      s.box([WW, WH - openTop, 0.2], [feet.x, openTop + (WH - openTop) / 2, wallZ], wall);
      for (const side of [-1, 1]) s.box([(WW - OW) / 2, OH, 0.2], [feet.x + side * (OW / 2 + (WW - OW) / 4), openBottom + OH / 2, wallZ], wall);
      s.box([WW, 0.1, 0.24], [feet.x, WH + 0.05, wallZ], trim);
      s.box([WW, 0.08, 0.22], [feet.x, openBottom - 0.3, wallZ], trim);
      // Sill, frame and the sliding pane pushed to one side.
      s.box([OW + 0.1, 0.05, 0.36], [feet.x, openBottom - 0.025, wallZ + 0.08], steel);
      for (const side of [-1, 1]) s.box([0.04, OH + 0.04, 0.06], [feet.x + side * (OW / 2 + 0.02), openBottom + OH / 2, wallZ + 0.1], steel);
      s.box([OW + 0.1, 0.04, 0.06], [feet.x, openTop + 0.02, wallZ + 0.1], steel);
      const paneSide = random() < 0.5 ? -1 : 1;
      const pane = new THREE.Mesh(new THREE.BoxGeometry(OW / 2 - 0.02, OH - 0.04, 0.015), new THREE.MeshPhysicalMaterial({ color: '#cfe3ea', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false }));
      pane.position.set(feet.x + paneSide * OW / 4, openBottom + OH / 2, wallZ + 0.12);
      s.root.add(pane);
      s.box([0.02, OH - 0.04, 0.03], [feet.x + paneSide * 0.02, openBottom + OH / 2, wallZ + 0.12], steel);
      // The lit kitchen behind: a warm back wall, a ceiling and a strip light.
      const glow = new THREE.Color().setHSL(mix(0.1, 0.08, mood.warmth), 0.6, 0.78);
      const inside = new THREE.Mesh(new THREE.PlaneGeometry(WW - 0.2, WH - 0.2), new THREE.MeshStandardMaterial({ color: '#f3e4c4', emissive: glow, emissiveIntensity: mix(0.35, 0.7, mood.cheer), roughness: 0.9 }));
      inside.position.set(feet.x, WH / 2, wallZ - 1.08);
      s.root.add(inside);
      const sideGlow = new THREE.MeshStandardMaterial({ color: '#e9dcc0', emissive: glow, emissiveIntensity: 0.25, roughness: 0.9 });
      for (const side of [-1, 1]) s.box([0.1, WH, 1.1], [feet.x + side * (WW / 2 - 0.05), WH / 2, wallZ - 0.55], sideGlow);
      s.box([WW, 0.1, 1.1], [feet.x, WH - 0.05, wallZ - 0.55], s.material('#f3efe4', { roughness: 0.9 }));
      s.box([WW, 0.02, 1.1], [feet.x, 0.01, wallZ - 0.55], s.material('#8a8578', { roughness: 0.9 }));
      s.box([0.9, 0.04, 0.12], [feet.x, WH - 0.14, wallZ - 0.5], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4d6', emissiveIntensity: 0.9 }));
      // A shelf of bagged orders and a hanging ticket rail inside.
      s.box([1.2, 0.03, 0.3], [feet.x, 1.55, wallZ - 0.9], steel);
      for (let i = 0; i < 3; i++) s.box([0.18, 0.2, 0.1], [feet.x - 0.45 + i * 0.4 + jitter(0.06), 1.67, wallZ - 0.9], paper);
      s.label(pick(['PICK UP', 'DRIVE THRU', 'WINDOW 2', 'THANK YOU']), 0.9, 0.18, [feet.x, openTop + 0.25, wallZ + 0.101], '#f6f4ee', uniform.stripe);
    } else if (a.setting === 'counter') {
      const counterZ = hips.z + 0.4;
      const top = Math.max(0.9, Math.min(hips.y + 0.08, both.y - 0.1));
      s.box([1.6, top - 0.02, 0.55], [feet.x, (top - 0.02) / 2, counterZ], s.material(pick(['#d9c7a3', '#e8e2d6', '#c9d3cf']), { roughness: 0.85 }));
      s.box([1.64, 0.035, 0.6], [feet.x, top - 0.0175, counterZ], s.material(pick(['#8a8a86', '#f1ece0', '#5a3a2a']), { roughness: 0.5 }));
      s.box([1.6, 0.1, 0.02], [feet.x, top * 0.55, counterZ + 0.28], trim);
      // Register and a cup of straws.
      s.box([0.34, 0.12, 0.3], [feet.x - 0.55, top + 0.06, counterZ - 0.05], dark);
      const screen = s.box([0.28, 0.2, 0.03], [feet.x - 0.55, top + 0.24, counterZ - 0.15], dark);
      screen.rotation.x = -0.3;
      s.box([0.24, 0.15, 0.005], [feet.x - 0.55, top + 0.245, counterZ - 0.132], new THREE.MeshStandardMaterial({ color: '#dff3ff', emissive: '#8fd0ff', emissiveIntensity: 0.6 }));
      s.cylinder(0.04, 0.04, 0.1, [feet.x + 0.6, top + 0.05, counterZ + 0.1], s.material('#f1ede4'), 12);
      for (let i = 0; i < 8; i++) s.cylinder(0.003, 0.003, 0.2, [feet.x + 0.6 + jitter(0.04), top + 0.17, counterZ + 0.1 + jitter(0.04)], s.material(pick(['#d8262c', '#f4f4f4', '#2b7bd6'])), 5).rotation.set(jitter(0.3), 0, jitter(0.3));
      s.label(pick(['ORDER HERE', 'PAY HERE', 'WELCOME']), 0.5, 0.1, [feet.x, top * 0.55, counterZ + 0.291], '#f6f4ee', uniform.stripe);
    }

    // ---- a second cashier further back
    let other: Figure | null = null;
    if (a.second) {
      const altTop = new THREE.Color(uniform.top).lerp(new THREE.Color('#ffffff'), 0.12).getStyle();
      other = figure(s, {
        height: mix(1.55, 1.85, random()), style: 'doll', pose: pick(['standing', 'arms-crossed', 'hands-on-hips', 'walking'] as const), hair: pick(['short', 'long', 'bun', 'cap'] as const), hairColor: pick(['#2a1f18', '#5a3a22', '#c99a4a']),
        skin: pick(['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0']), top: altTop, bottom: uniform.bottom, shoes: '#1d1a18', sleeves: 'short', gaze: pick(['left', 'right', 'down'] as const),
      });
      other.root.position.set(feet.x + (random() < 0.5 ? -0.45 : 0.45), 0, hips.z - (a.setting === 'window' ? 0.55 : 0.75));
      other.root.rotation.y = jitter(1.2);
      s.root.add(other.root);
    }

    return s.finish({ update: (dt, time) => { person.update(dt, time); other?.update(dt, time); } });
  },
});
