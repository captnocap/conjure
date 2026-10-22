import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, score } from '@conjure/kit';
import { HAIRS, type P, SKINS, anatomy, at, bow, flatCap, ground, hipsAt, joints, lean, look, paint, pick, poseArm, poseLeg, reach } from './rig';

const JACKETS = {
  donkey: { top: '#2a2d33', bottom: '#3a3a40', patch: '#1a1a1c' },
  anorak: { top: '#4a7a3a', bottom: '#2e3440', patch: null },
  denim: { top: '#4d6a9c', bottom: '#35486b', patch: null },
  tweed: { top: '#8a7a5a', bottom: '#4a4238', patch: null },
  leather: { top: '#4a3020', bottom: '#2a2a30', patch: null },
} as const;
const TIMES = { early: [7, 50], sharp: [8, 0], late: [8, 12], home: [17, 0] } as const;

export default defineThing({
  questions: {
    clock: choice('What kind of punch clock is on the wall?', {
      round: 'A round-faced clock in a grey steel case, the card slot on top.',
      digital: 'A square case with flip numbers behind a little window.',
    }),
    time: choice('What time does it show?', {
      early: 'Ten to eight, early for once.',
      sharp: 'Eight o\'clock on the dot.',
      late: 'Twelve minutes past: late, and it will be on the card.',
      home: 'Five o\'clock: clocking out, not in.',
    }),
    hurry: choice('How is he arriving?', {
      late: 'Late: hunched, hurrying, cap pushed back, mid-stride.',
      unbothered: 'Unbothered: standing square, taking his time.',
    }),
    jacket: choice('What is he wearing?', {
      donkey: 'A black donkey jacket with leather shoulder patches.',
      anorak: 'A green nylon anorak.',
      denim: 'A denim jacket over worn jeans.',
      tweed: 'A tweed sports jacket, the one good one.',
      leather: 'A brown leather jacket.',
    }),
    head: choice('What is on his head?', {
      cap: 'A flat cap.',
      none: 'Nothing: short hair.',
      beanie: 'A woolly hat pulled down.',
    }),
    carrying: choice('What is in his other hand?', {
      bag: 'A paper lunch bag, folded over at the top.',
      flask: 'A tartan vacuum flask.',
      tin: 'A dented sandwich tin.',
      paper: 'A rolled newspaper.',
    }),
    rack: score('How full is the card rack?', ['Nearly empty: the shift is long started', 'Half the slots filled', 'Every slot has a card: nobody has clocked in yet']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.62, 1.86, random());
    const build = random() < 0.35 ? 'heavy' : 'average';
    const skin = pick(random, SKINS);
    const kit = JACKETS[a.jacket];
    const person = figure(s, {
      height: H, build, style: 'doll', skin, sleeves: 'long',
      hair: a.head === 'none' ? 'short' : 'none', hairColor: pick(random, HAIRS),
      top: kit.top, bottom: kit.bottom, shoes: '#1d1a18',
      pose: 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const { headR, torsoL, shoulderW, chestR } = anatomy(H, build);
    const { spine } = joints(person, 'left');
    if (a.head === 'cap') flatCap(s, person, H, pick(random, ['#4a4038', '#5a5a52', '#3a3a3a', '#6a5a3a']));
    if (a.head === 'beanie') {
      const wool = s.material(pick(random, ['#6a2a2a', '#2d3b5e', '#4a4a44', '#8a6a3a']), { roughness: 1 });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.12, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), wool);
      dome.position.y = headR * 0.02;
      dome.scale.y = 1.15;
      const fold = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.05, headR * 0.16, 8, 20), wool);
      fold.rotation.x = Math.PI / 2;
      fold.position.y = headR * 0.1;
      dome.castShadow = fold.castShadow = true;
      person.head.add(dome, fold);
    }
    if (kit.patch) {
      for (const side of [-1, 1]) {
        const patch = new THREE.Mesh(new THREE.BoxGeometry(shoulderW * 0.6, torsoL * 0.16, chestR * 2.2), s.material(kit.patch, { roughness: 0.35 }));
        patch.position.set(side * shoulderW * 0.72, torsoL - torsoL * 0.08, 0);
        patch.scale.x = 1;
        spine.add(patch);
      }
    }
    if (a.jacket === 'anorak' || a.jacket === 'denim' || a.jacket === 'leather') {
      const zip = new THREE.Mesh(new THREE.BoxGeometry(0.01, torsoL * 0.85, 0.004), s.material(a.jacket === 'denim' ? '#c9b48a' : '#b8bcc2', { metalness: 0.5, roughness: 0.4 }));
      zip.position.set(0, torsoL * 0.5, chestR + 0.002);
      spine.add(zip);
    }
    if (a.jacket === 'tweed') {
      for (const side of [-1, 1]) {
        const lapel = new THREE.Mesh(new THREE.BoxGeometry(H * 0.028, torsoL * 0.4, 0.008), s.material('#7a6a4a', { roughness: 0.9 }));
        lapel.position.set(side * H * 0.03, torsoL * 0.74, chestR + 0.002);
        lapel.rotation.z = side * 0.3;
        spine.add(lapel);
      }
    }

    // Laid out against a wall whose face looks along +x; the whole set is turned at the end so the
    // wall faces the viewer at an angle: card rack on the left, the clock, then him on the right.
    const wallX = -0.3, wallZ0 = -0.85, wallZ1 = 0.95, wallH = 2.2;
    const wallLength = wallZ1 - wallZ0, wallMid = (wallZ0 + wallZ1) / 2;
    const paintTop = s.material(pick(random, ['#e6dfc6', '#d9d3bf', '#efe8d2']), { roughness: 0.95 });
    const paintBottom = s.material(pick(random, ['#3f6a4a', '#4a6a8a', '#7a5a3a']), { roughness: 0.9 });
    const brickLine = 1.0;
    s.box([0.12, wallH - brickLine, wallLength], [wallX, brickLine + (wallH - brickLine) / 2, wallMid], paintTop);
    s.box([0.12, brickLine, wallLength], [wallX, brickLine / 2, wallMid], paintBottom);
    s.box([0.13, 0.03, wallLength], [wallX, brickLine, wallMid], s.material('#2a2a2c', { roughness: 0.8 }));
    s.box([0.14, 0.08, wallLength], [wallX, 0.04, wallMid], s.material('#2a2a2c', { roughness: 0.8 }));
    // Mortar lines scored across the painted brick band, and a scuffed strip where boots have kicked it.
    const mortar = s.scatter(new THREE.BoxGeometry(0.004, 0.006, wallLength - 0.02), s.material('#b8b2a0', { roughness: 1 }), Array.from({ length: 12 }, (_u, i) => ({ at: [wallX + 0.062, 0.12 + i * 0.075, wallMid] as P, size: 1 })));
    mortar.castShadow = false;
    if (mood.wear > 0.35) {
      const scuffs = Math.round(mix(2, 9, mood.wear));
      s.scatter(new THREE.BoxGeometry(0.003, 1, 1), s.material('#2a2622', { roughness: 1 }), Array.from({ length: scuffs }, () => ({ at: [wallX + 0.063, 0.12 + random() * 0.25, mix(wallZ0 + 0.1, wallZ1 - 0.1, random())] as P, size: 0.04 + random() * 0.05 })));
    }
    const face = wallX + 0.06;

    // The punch clock: a case with the dial or the flip window on the front and the slot on top.
    const clockZ = 0.12, clockY = 1.2;
    const grey = s.material('#8e9497', { metalness: 0.55, roughness: 0.4 });
    const caseDark = s.material('#3a3f44', { metalness: 0.4, roughness: 0.5 });
    const caseW = 0.32, caseH = a.clock === 'round' ? 0.46 : 0.36, caseD = 0.2;
    s.box([caseD, caseH, caseW], [face + caseD / 2, clockY, clockZ], a.clock === 'round' ? grey : caseDark);
    // A sloped hood on top carries the card slot.
    const hood = s.box([caseD * 0.7, 0.05, caseW * 0.8], [face + caseD * 0.55, clockY + caseH / 2 + 0.025, clockZ], caseDark);
    void hood;
    s.box([0.012, 0.012, 0.11], [face + caseD * 0.62, clockY + caseH / 2 + 0.051, clockZ], s.material('#121214'));
    const [hour, minute] = TIMES[a.time];
    const dialMap = a.clock === 'round' ? clockDial(hour, minute) : flipDisplay(hour, minute);
    let secondHand: THREE.Object3D | null = null;
    if (a.clock === 'round') {
      const bezel = s.cylinder(0.135, 0.135, 0.025, [face + caseD + 0.012, clockY + 0.05, clockZ], caseDark, 32);
      bezel.rotation.z = Math.PI / 2;
      const dial = s.mesh(new THREE.CircleGeometry(0.118, 32), new THREE.MeshStandardMaterial({ map: dialMap, roughness: 0.5 }), [face + caseD + 0.026, clockY + 0.05, clockZ]);
      dial.rotation.y = Math.PI / 2;
      // A red second hand sweeps the dial.
      const pivot = new THREE.Group();
      pivot.position.set(face + caseD + 0.03, clockY + 0.05, clockZ);
      const sweep = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.1, 0.004), s.material('#b0281c', { roughness: 0.5 }));
      sweep.position.y = 0.035;
      pivot.add(sweep);
      pivot.rotation.x = -random() * Math.PI * 2;
      s.root.add(pivot);
      secondHand = pivot;
      // The maker's plate under the dial.
      s.box([0.004, 0.03, 0.12], [face + caseD + 0.002, clockY - caseH / 2 + 0.07, clockZ], s.material('#c9a44a', { metalness: 0.6, roughness: 0.3 }));
    } else {
      const window = s.mesh(new THREE.PlaneGeometry(0.22, 0.09), new THREE.MeshStandardMaterial({ map: dialMap, roughness: 0.4, emissive: '#ffffff', emissiveMap: dialMap, emissiveIntensity: 0.25 }), [face + caseD + 0.003, clockY + 0.07, clockZ]);
      window.rotation.y = Math.PI / 2;
      s.box([0.004, 0.11, 0.24], [face + caseD - 0.001, clockY + 0.07, clockZ], s.material('#1a1a1c'));
      s.label(a.time === 'home' ? 'OUT' : 'IN', 0.08, 0.04, [face + caseD + 0.003, clockY - 0.07, clockZ], '#f1efe6', a.time === 'home' ? '#2a4a8a' : '#8a2a2a').rotation.y = Math.PI / 2;
    }
    // An enamel sign over the clock.
    const sign = s.label(a.time === 'home' ? 'CLOCK OUT' : 'CLOCK IN', 0.42, 0.1, [face + 0.006, clockY + caseH / 2 + 0.26, clockZ], '#f4f1e8', '#1f3a5a');
    sign.rotation.y = Math.PI / 2;

    // The card rack beside the clock: rows of pockets, some holding cards.
    const rackZ = 0.62, rackW = 0.48, rackH = 0.78, rackY = 1.28;
    const cols = 4, rows = 6;
    s.box([0.02, rackH, rackW], [face + 0.01, rackY, rackZ], caseDark);
    const pocketGeometry = new THREE.BoxGeometry(0.02, 0.05, rackW / cols - 0.014);
    const pockets: { at: P; size: number }[] = [];
    const cards: { at: P; size: number }[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const z = rackZ - rackW / 2 + (c + 0.5) * (rackW / cols);
      const y = rackY + rackH / 2 - 0.08 - r * (rackH / rows);
      pockets.push({ at: [face + 0.03, y - 0.03, z], size: 1 });
      if (random() < a.rack) cards.push({ at: [face + 0.03, y + 0.01, z + (random() - 0.5) * 0.008], size: 1 });
    }
    s.scatter(pocketGeometry, grey, pockets);
    if (cards.length) s.scatter(new THREE.BoxGeometry(0.004, 0.13, 0.085), s.material('#efe6c8', { roughness: 0.9 }), cards);

    // His stance: facing the clock from its right; late means a hurried stride and a hunch.
    const late = a.hurry === 'late';
    lean(person, late ? 7 : 1);
    bow(person, late ? 12 : 3);
    if (late) {
      poseLeg(person, 'left', { forward: 20, knee: 16, out: 2 });
      poseLeg(person, 'right', { forward: -14, out: 2, toes: 18 });
    } else { poseLeg(person, 'left', { out: 3 }); poseLeg(person, 'right', { out: 3 }); }
    ground(person);
    const stand = { x: face + (late ? 0.42 : 0.36), z: clockZ - (late ? 0.5 : 0.42) };
    const facing = Math.atan2(face + caseD / 2 - stand.x, clockZ - stand.z);
    hipsAt(person, stand.x, stand.z, facing);
    // The near hand pushes a card down into the slot; the far one holds his bag in front of him.
    const slot = new THREE.Vector3(face + caseD * 0.62, clockY + caseH / 2 + 0.11, clockZ);
    reach(person, 'left', slot, { forward: [30, 150], out: [-10, 40], bend: [0, 120], across: [-30, 50] });
    poseArm(person, 'right', { forward: late ? 30 : 18, out: 6, bend: late ? 80 : 70, across: 22 });
    // Looking at the clock face.
    look(person, late ? 18 : 24, 0);
    const card = s.box([0.004, 0.17, 0.085], [slot.x, slot.y - 0.03, slot.z], s.material('#efe6c8', { roughness: 0.9 }));
    card.rotation.y = 0;
    s.box([0.005, 0.006, 0.07], [slot.x + 0.001, slot.y + 0.02, slot.z], s.material(a.time === 'late' ? '#b0281c' : '#3a3f44'));
    const held = at(person.hands.right);
    if (a.carrying === 'bag') {
      const bag = s.box([0.14, 0.2, 0.1], [held.x, held.y - 0.11, held.z], s.material('#c9a877', { roughness: 1 }));
      bag.rotation.y = facing;
      s.box([0.14, 0.035, 0.105], [held.x, held.y - 0.01, held.z], s.material('#b8976a', { roughness: 1 })).rotation.y = facing;
    } else if (a.carrying === 'flask') {
      const tartan = new THREE.MeshStandardMaterial({ map: tartanMap(), roughness: 0.6 });
      s.cylinder(0.045, 0.045, 0.27, [held.x, held.y - 0.11, held.z], tartan, 16);
      s.cylinder(0.048, 0.048, 0.05, [held.x, held.y + 0.05, held.z], s.material('#f1ede4', { roughness: 0.5 }), 16);
    } else if (a.carrying === 'tin') {
      s.box([0.22, 0.12, 0.09], [held.x, held.y - 0.07, held.z], s.material('#9aa0a4', { metalness: 0.7, roughness: 0.35 })).rotation.y = facing + Math.PI / 2;
      s.box([0.06, 0.03, 0.02], [held.x, held.y, held.z], s.material('#2a2a2c')).rotation.y = facing + Math.PI / 2;
    } else {
      const roll = s.cylinder(0.028, 0.028, 0.32, [held.x, held.y - 0.06, held.z], new THREE.MeshStandardMaterial({ map: newsprint(), roughness: 0.9 }), 12);
      roll.rotation.set(0.25, facing, 0.2);
    }

    // Turn the whole set so the wall faces the viewer at an angle and he is seen side-on.
    s.root.rotation.y = -0.95;
    const tick = mix(0.6, 1.4, mood.energy);
    return s.finish({
      update: (dt, time) => {
        person.update(dt, time);
        if (secondHand) secondHand.rotation.x -= dt * tick * (Math.PI * 2) / 60;
      },
    });
  },
});

function clockDial(hour: number, minute: number) {
  return paint(128, 128, (c) => {
    c.fillStyle = '#f4f1e8';
    c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#2a2320';
    c.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * Math.PI * 2;
      c.beginPath();
      c.moveTo(64 + Math.cos(t) * 50, 64 + Math.sin(t) * 50);
      c.lineTo(64 + Math.cos(t) * 58, 64 + Math.sin(t) * 58);
      c.stroke();
    }
    const h = ((hour % 12) / 12 + minute / 720) * Math.PI * 2 - Math.PI / 2, m = (minute / 60) * Math.PI * 2 - Math.PI / 2;
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(h) * 30, 64 + Math.sin(h) * 30); c.stroke();
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(m) * 46, 64 + Math.sin(m) * 46); c.stroke();
    c.fillStyle = '#a32a1c';
    c.beginPath(); c.arc(64, 64, 4, 0, Math.PI * 2); c.fill();
  });
}

function flipDisplay(hour: number, minute: number) {
  return paint(160, 64, (c) => {
    c.fillStyle = '#141416';
    c.fillRect(0, 0, 160, 64);
    const text = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    c.fillStyle = '#f4f1e8';
    c.font = 'bold 44px monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, 80, 34);
    c.fillStyle = '#141416';
    c.fillRect(0, 31, 160, 2);
  });
}

function tartanMap() {
  return paint(64, 64, (c) => {
    c.fillStyle = '#8a2a2a';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = 'rgba(20,40,20,0.6)';
    for (let i = 0; i < 64; i += 16) { c.fillRect(i, 0, 6, 64); c.fillRect(0, i, 64, 6); }
    c.fillStyle = 'rgba(240,220,120,0.5)';
    for (let i = 8; i < 64; i += 16) { c.fillRect(i, 0, 2, 64); c.fillRect(0, i, 64, 2); }
  });
}

function newsprint() {
  return paint(64, 64, (c) => {
    c.fillStyle = '#e8e4d8';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#5a5a5a';
    for (let y = 6; y < 64; y += 6) c.fillRect(4, y, 56, 2);
    c.fillStyle = '#1a1a1a';
    c.fillRect(4, 2, 40, 5);
  });
}
