import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { SKINS, anatomy, at, coatSkirt, collar, ground, joints, look, necktie, overTorso, paint, penBehindEar, pencilMoustache, pick, poseLeg, reach } from './rig';

const COATS = { brown: '#6b4a2e', white: '#eeeae0', grey: '#8a8c88' } as const;

export default defineThing({
  questions: {
    coat: choice('What colour is his warehouse coat?', {
      brown: 'A brown cotton warehouse coat, the foreman\'s uniform.',
      white: 'A white coat, laboratory clean, buttoned to the neck.',
      grey: 'A grey coat, dusty and anonymous.',
    }),
    board: choice('What does he hold up in his other hand?', {
      clipboard: 'A clipboard with a timing sheet under the clip.',
      ledger: 'A thick bound ledger with a red spine label.',
    }),
    watch: choice('How is he timing them?', {
      stopwatch: 'A chrome stopwatch on a lanyard round his neck, held up in front of his face.',
      wristwatch: 'His wrist raised, reading the wristwatch.',
    }),
    gaze: choice('Where are his eyes?', {
      watch: 'On the watch, counting the seconds.',
      workers: 'Over the top of the watch, straight at the workers.',
    }),
    sheet: choice('What is on the sheet?', {
      blank: 'A fresh blank sheet: the study is only starting.',
      ticks: 'Neat columns of ticks and times.',
      red: 'Red circles and underlinings: somebody is below rate.',
    }),
    pocket: choice('What is in the breast pocket?', {
      pens: 'A row of pens and a slide rule.',
      badge: 'A plastic name badge.',
      nothing: 'Nothing: the pocket is flat.',
    }),
    hair: choice('What is his hair like?', {
      slick: 'Dark hair slicked flat with a sharp parting.',
      grey: 'Grey, cropped close.',
      bald: 'Bald on top, a fringe over the ears.',
    }),
    moustache: noul('Does he have a pencil moustache?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.7, 1.86, random());
    const build = random() < 0.3 ? 'slight' : 'average';
    const skin = pick(random, SKINS.slice(0, 5));
    const coatColour = COATS[a.coat];
    const person = figure(s, {
      height: H, build, style: 'doll', skin, sleeves: 'long',
      hair: a.hair === 'bald' ? 'none' : 'short', hairColor: a.hair === 'grey' ? pick(random, ['#b8b4ad', '#9a958e']) : '#1f1a18',
      top: coatColour, bottom: pick(random, ['#2a2a30', '#3a3530', '#26303a']), shoes: '#1a1816',
      pose: 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const { headR, torsoL, chestR } = anatomy(H, build);
    const { spine } = joints(person, 'left');
    const cloth = s.material(coatColour, { roughness: 0.9 });
    const front = chestR * 1.12 * torsoMeshScale(person) + 0.004;
    overTorso(person, H, build, cloth, { grow: 1.12, length: 1.0 });
    coatSkirt(person, H, build, cloth, 0.3);
    collar(s, person, H, build, '#f3f1ea');
    necktie(s, person, H, build, pick(random, ['#6a1f2a', '#1f3f6f', '#3a5a2a', '#8a6a1a']), front + 0.002);
    // Lapels and a line of buttons down the coat.
    const lapelPaint = s.material(new THREE.Color(coatColour).multiplyScalar(0.85), { roughness: 0.9 });
    for (const side of [-1, 1]) {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(H * 0.03, torsoL * 0.42, 0.008), lapelPaint);
      lapel.position.set(side * H * 0.035, torsoL * 0.74, front);
      lapel.rotation.z = side * 0.3;
      spine.add(lapel);
    }
    for (let i = 0; i < 4; i++) {
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), s.material('#2a2320'));
      button.position.set(0, torsoL * (0.12 + i * 0.14), front);
      spine.add(button);
    }
    // Breast pocket and whatever lives in it.
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(H * 0.055, H * 0.06, 0.006), cloth);
    pocket.position.set(H * 0.06, torsoL * 0.7, front);
    spine.add(pocket);
    if (a.pocket === 'pens') {
      for (let i = 0; i < 3; i++) {
        const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 6), s.material(['#1f3f8f', '#8a1f2a', '#1d1d1f'][i], { roughness: 0.4 }));
        pen.position.set(H * 0.045 + i * 0.012, torsoL * 0.7 + H * 0.045, front + 0.004);
        spine.add(pen);
      }
      const rule = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.004), s.material('#e8e2d0', { roughness: 0.5 }));
      rule.position.set(H * 0.08, torsoL * 0.7 + H * 0.04, front + 0.004);
      spine.add(rule);
    } else if (a.pocket === 'badge') {
      const badge = new THREE.Mesh(new THREE.BoxGeometry(H * 0.045, H * 0.018, 0.004), s.material('#f1efe6', { roughness: 0.4 }));
      badge.position.set(H * 0.06, torsoL * 0.76, front + 0.005);
      spine.add(badge);
      const name = new THREE.Mesh(new THREE.BoxGeometry(H * 0.03, H * 0.005, 0.002), s.material('#2a2320'));
      name.position.set(H * 0.06, torsoL * 0.76, front + 0.008);
      spine.add(name);
    }
    if (a.hair === 'bald') {
      // A fringe of hair round the sides, the top bare.
      const fringe = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.05, 16, 10, 0, Math.PI * 2, Math.PI * 0.28, Math.PI * 0.27), s.material(random() < 0.5 ? '#8a847c' : '#4a3a30', { roughness: 0.9 }));
      fringe.position.y = headR * 0.1;
      fringe.castShadow = true;
      person.head.add(fringe);
    }
    if (a.hair === 'slick') {
      const parting = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.06, headR * 0.03, headR * 1.1), s.material(skin));
      parting.position.set(-headR * 0.3, headR * 1.12, -headR * 0.1);
      person.head.add(parting);
    }
    if (a.moustache) pencilMoustache(s, person, H);
    penBehindEar(s, person, H, 'left', pick(random, ['#1f3f8f', '#8a1f2a', '#d8a020']));

    // Stiff: feet together, straight back, chin up a little.
    poseLeg(person, 'left', { out: 0 });
    poseLeg(person, 'right', { out: 0 });
    joints(person, 'left').spine.rotation.x = -0.03;
    const head = at(person.head);

    // Right hand raised before the face with the watch; left holds the board up at the chest.
    const watchAt = new THREE.Vector3(-0.07, head.y - 0.03 * (a.gaze === 'watch' ? 1 : 1.6), head.z + 0.24);
    reach(person, 'right', watchAt, { forward: [40, 130], out: [-10, 20], bend: [40, 135], across: [0, 50] });
    const boardAt = new THREE.Vector3(0.2, head.y - 0.36, head.z + 0.17);
    reach(person, 'left', boardAt, { forward: [20, 90], out: [-5, 25], bend: [30, 120], across: [-10, 45] });
    look(person, a.gaze === 'watch' ? 22 : -4, a.gaze === 'watch' ? -14 : 6);
    ground(person);

    const chrome = s.material('#dfe3e6', { metalness: 0.9, roughness: 0.2 });
    const right = at(person.hands.right);
    if (a.watch === 'stopwatch') {
      // The watch disc in the fingers, its face toward him, the crown on top; a lanyard from the neck.
      const disc = s.cylinder(0.031, 0.031, 0.011, [right.x - 0.005, right.y + 0.03, right.z + 0.01], chrome, 24);
      disc.rotation.x = Math.PI / 2 - 0.25;
      const face = s.mesh(new THREE.CircleGeometry(0.026, 24), new THREE.MeshStandardMaterial({ map: watchFace(), roughness: 0.5 }), [right.x - 0.005, right.y + 0.03 + 0.006 * Math.sin(0.25), right.z + 0.01 - 0.006 * Math.cos(0.25)]);
      face.rotation.x = Math.PI - 0.25;
      s.cylinder(0.005, 0.005, 0.012, [right.x - 0.005, right.y + 0.066, right.z + 0.001], chrome, 8);
      s.ball([0.007, 0.007, 0.007], [right.x - 0.005, right.y + 0.074, right.z], chrome, 8);
      const neck = at(joints(person, 'left').neck);
      const cord = s.material('#2a2a2c', { roughness: 0.9 });
      s.tube([[neck.x + 0.04, neck.y - 0.02, neck.z + 0.05], [neck.x + 0.05, neck.y - 0.15, neck.z + 0.09], [right.x + 0.02, right.y + 0.05, right.z - 0.02]], 0.004, cord);
      s.tube([[neck.x - 0.04, neck.y - 0.02, neck.z + 0.05], [neck.x - 0.08, neck.y - 0.14, neck.z + 0.08], [right.x - 0.02, right.y + 0.05, right.z - 0.02]], 0.004, cord);
    } else {
      // A wristwatch on the raised wrist, the hand open.
      const wrist = at(joints(person, 'right').wrist);
      const strap = s.ring(0.024, 0.006, [wrist.x, wrist.y, wrist.z], s.material('#3a2a1a', { roughness: 0.8 }));
      strap.rotation.x = Math.PI / 2;
      const dial = s.cylinder(0.016, 0.016, 0.008, [wrist.x, wrist.y + 0.004, wrist.z + 0.024], chrome, 16);
      dial.rotation.x = Math.PI / 2;
      const face = s.mesh(new THREE.CircleGeometry(0.013, 16), new THREE.MeshStandardMaterial({ map: watchFace(), roughness: 0.5 }), [wrist.x, wrist.y + 0.004, wrist.z + 0.0285]);
      void face;
    }

    const left = at(person.hands.left);
    const hold = new THREE.Group();
    hold.position.set(left.x + 0.02, left.y + 0.1, left.z + 0.03);
    // Tilted back toward him so he can read it while it faces the floor.
    hold.rotation.set(-0.45, 0.35, 0.1);
    s.root.add(hold);
    const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; hold.add(mesh); return mesh; };
    if (a.board === 'clipboard') {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.32, 0.008), s.material('#5a3f28', { roughness: 0.8 })));
      const clip = add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.018), chrome));
      clip.position.set(0, 0.15, 0.008);
      const sheet = add(new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.29), new THREE.MeshStandardMaterial({ map: timingSheet(a.sheet, random), roughness: 0.9 })));
      sheet.position.set(0, -0.012, 0.0045);
    } else {
      const cover = add(new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.29, 0.036), s.material(pick(random, ['#1f2a1f', '#1a1a1e', '#3a2a1a']), { roughness: 0.6 })));
      void cover;
      const pages = add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.03), s.material('#efe8d4', { roughness: 0.95 })));
      pages.position.set(0.008, 0, 0);
      const label = add(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.08, 0.03), s.material('#9a2a2a', { roughness: 0.6 })));
      label.position.set(-0.105, 0.06, 0);
      const sheet = add(new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.2), new THREE.MeshStandardMaterial({ map: timingSheet(a.sheet, random), roughness: 0.9 })));
      sheet.position.set(0.015, 0, 0.0185);
    }

    void mood;
    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});

const torsoMeshScale = (person: ReturnType<typeof figure>) => {
  const { spine } = joints(person, 'left');
  const torso = spine.children.find((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh;
  return torso.scale.x;
};

function watchFace() {
  return paint(64, 64, (c) => {
    c.fillStyle = '#f4f1e8';
    c.fillRect(0, 0, 64, 64);
    c.strokeStyle = '#2a2320';
    c.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * Math.PI * 2;
      c.beginPath();
      c.moveTo(32 + Math.cos(t) * 24, 32 + Math.sin(t) * 24);
      c.lineTo(32 + Math.cos(t) * 28, 32 + Math.sin(t) * 28);
      c.stroke();
    }
    c.beginPath(); c.moveTo(32, 32); c.lineTo(32, 8); c.stroke();
    c.strokeStyle = '#a32a1c';
    c.beginPath(); c.moveTo(32, 32); c.lineTo(50, 40); c.stroke();
  });
}

function timingSheet(state: 'blank' | 'ticks' | 'red', random: () => number) {
  return paint(128, 176, (c) => {
    c.fillStyle = '#f6f2e6';
    c.fillRect(0, 0, 128, 176);
    c.strokeStyle = '#9aa0b0';
    c.lineWidth = 1;
    for (let y = 24; y < 176; y += 12) { c.beginPath(); c.moveTo(8, y); c.lineTo(120, y); c.stroke(); }
    for (const x of [8, 40, 72, 104, 120]) { c.beginPath(); c.moveTo(x, 12); c.lineTo(x, 172); c.stroke(); }
    c.fillStyle = '#2a2320';
    c.fillRect(8, 12, 112, 10);
    if (state === 'blank') return;
    c.strokeStyle = '#2a3a6a';
    c.lineWidth = 2;
    for (let y = 30; y < 170; y += 12) for (const x of [16, 48, 80]) {
      if (random() < 0.2) continue;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 4, y + 5); c.lineTo(x + 12, y - 5); c.stroke();
    }
    if (state === 'red') {
      c.strokeStyle = '#c0281c';
      c.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const y = 40 + Math.floor(random() * 10) * 12, x = 16 + Math.floor(random() * 3) * 32;
        c.beginPath(); c.ellipse(x + 8, y, 16, 9, 0, 0, Math.PI * 2); c.stroke();
      }
      c.beginPath(); c.moveTo(8, 165); c.lineTo(120, 162); c.stroke();
    }
  });
}
