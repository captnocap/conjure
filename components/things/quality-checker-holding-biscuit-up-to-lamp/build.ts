import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { BISCUIT_COLOUR, HAIRS, type P, SKINS, at, bow, coatSkirt, glasses, ground, hairnet, joints, look, paint, pick, poseLeg, reach, seat } from './rig';

export default defineThing({
  questions: {
    lamp: choice('What is the desk lamp like?', {
      green: 'A brass lamp with a green glass shade.',
      steel: 'A grey steel anglepoise, the shade scuffed.',
      red: 'A red enamel anglepoise.',
    }),
    biscuit: choice('What is the biscuit she is holding up?', {
      perfect: 'A perfect golden round, nothing wrong with it.',
      broken: 'A broken half, the crack showing.',
      burnt: 'A dark one, burnt at the edge.',
    }),
    bin: score('How full is the reject bin?', ['Empty, a good batch', 'A few broken ones', 'Full and spilling onto the bench']),
    person: choice('Who is checking?', {
      young: 'A young woman, keen, first month in the job.',
      older: 'An older woman who has seen every fault there is.',
      man: 'A thin man with a careful manner.',
    }),
    tool: choice('What is on the bench besides the bin?', {
      callipers: 'A pair of steel callipers for measuring the diameter.',
      ruler: 'A steel ruler and a magnifying glass.',
      scales: 'A small set of balance scales.',
      nothing: 'Nothing: she judges by eye.',
    }),
    glasses: noul('Does she wear glasses?'),
    tally: noul('Is there a tally sheet with a pencil on the bench?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = { young: mix(1.58, 1.7, random()), older: mix(1.52, 1.64, random()), man: mix(1.68, 1.8, random()) }[a.person];
    const build = a.person === 'man' ? 'slight' : random() < 0.4 ? 'heavy' : 'average';
    const skin = pick(random, SKINS);
    const white = '#efece4';
    const person = figure(s, {
      height: H, build, style: 'doll', skin, sleeves: 'long',
      hair: a.person === 'man' ? 'short' : 'bun', hairColor: a.person === 'older' ? pick(random, ['#c9c4bc', '#a8a39c']) : pick(random, HAIRS),
      top: white, bottom: pick(random, ['#2e3440', '#3a3a3a', '#4a4238']), shoes: '#26262a',
      pose: 'sitting', gaze: 'ahead',
    });
    s.root.add(person.root);
    hairnet(s, person, H);
    if (a.glasses) glasses(s, person, H);
    const cloth = s.material(white, { roughness: 0.9 });
    coatSkirt(person, H, build, cloth, 0.16, { flare: 1.6 });
    const torsoL = H * 0.28;
    const chestR = H * 0.036 * { slight: 0.85, average: 1, heavy: 1.3 }[build] * 1.35 * (build === 'heavy' ? 1.25 : 1);
    const { spine } = joints(person, 'left');
    for (let i = 0; i < 4; i++) {
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), s.material('#d8d2c4'));
      button.position.set(0, torsoL * (0.2 + i * 0.2), chestR + 0.002);
      spine.add(button);
    }
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(H * 0.055, H * 0.06, 0.006), cloth);
    pocket.position.set(H * 0.06, torsoL * 0.68, chestR + 0.002);
    spine.add(pocket);

    // The high stool: a round seat on splayed legs with a foot ring.
    const seatY = 0.72;
    const steel = s.material('#8e9497', { metalness: 0.6, roughness: 0.45 });
    const dark = s.material('#2a2c2e', { roughness: 0.85 });
    const stoolZ = 0;
    s.cylinder(0.17, 0.17, 0.03, [0, seatY - 0.015, stoolZ], s.material(pick(random, ['#6a4a2e', '#2a2a2e', '#8a3a2a']), { roughness: 0.7 }), 24);
    for (let i = 0; i < 4; i++) {
      const t = i * Math.PI / 2 + Math.PI / 4;
      s.rod([Math.cos(t) * 0.22, 0, stoolZ + Math.sin(t) * 0.22], [Math.cos(t) * 0.13, seatY - 0.03, stoolZ + Math.sin(t) * 0.13], 0.012, dark);
    }
    s.ring(0.19, 0.008, [0, 0.28, stoolZ], dark).rotation.x = Math.PI / 2;
    // Seated with the hips on the seat, feet on the ring.
    person.root.position.set(0, 0, 0);
    person.root.updateMatrixWorld(true);
    seat(person, seatY + 0.045 * H);
    poseLeg(person, 'left', { forward: 70, knee: 95, out: 8, toes: 15 });
    poseLeg(person, 'right', { forward: 70, knee: 95, out: 8, toes: 15 });
    const hips = at(person.pelvis);
    person.root.position.x -= hips.x;
    person.root.position.z += stoolZ - hips.z + 0.02;
    person.root.updateMatrixWorld(true);

    // The bench in front, with the lamp, the bin and the tools.
    const benchTop = 0.9, benchZ = 0.52, benchW = 1.0, benchD = 0.55;
    const timber = s.material(pick(random, ['#b08a5a', '#d9cdb0', '#8a7a6a']), { roughness: 0.85 });
    s.box([benchW, 0.04, benchD], [0, benchTop - 0.02, benchZ], timber);
    for (const dx of [-benchW / 2 + 0.04, benchW / 2 - 0.04]) for (const dz of [-benchD / 2 + 0.04, benchD / 2 - 0.04]) s.box([0.04, benchTop - 0.04, 0.04], [dx, (benchTop - 0.04) / 2, benchZ + dz], steel);
    s.box([benchW - 0.1, 0.03, 0.03], [0, 0.25, benchZ + benchD / 2 - 0.04], steel);

    // The lamp at the far corner, its shade angled down over the bench.
    const lampX = -0.32, lampZ = benchZ + 0.17;
    const lampColour = { green: '#c9a44a', steel: '#7d8286', red: '#b8302a' }[a.lamp];
    const lampPaint = s.material(lampColour, { metalness: a.lamp === 'green' ? 0.7 : 0.4, roughness: 0.4 });
    const shadePaint = a.lamp === 'green' ? s.material('#2a6a4a', { roughness: 0.3, metalness: 0.1 }) : lampPaint;
    s.cylinder(0.08, 0.09, 0.02, [lampX, benchTop + 0.01, lampZ], lampPaint, 20);
    const joint1: P = [lampX + 0.05, benchTop + 0.38, lampZ - 0.08];
    const joint2: P = [lampX + 0.16, benchTop + 0.48, lampZ - 0.24];
    s.rod([lampX, benchTop + 0.02, lampZ], joint1, 0.012, lampPaint);
    s.ball([0.022, 0.022, 0.022], joint1, lampPaint, 10);
    s.rod(joint1, joint2, 0.012, lampPaint);
    s.ball([0.022, 0.022, 0.022], joint2, lampPaint, 10);
    const shade = s.lathe([[0, 0], [0.03, 0], [0.045, 0.02], [0.08, 0.1], [0.095, 0.14], [0.085, 0.14], [0.07, 0.1], [0.04, 0.03], [0.025, 0.02], [0, 0.02]], shadePaint, [0, 0, 0]);
    shade.position.set(joint2[0] + 0.03, joint2[1] - 0.06, joint2[2] + 0.02);
    shade.rotation.set(Math.PI - 0.55, 0.3, 0);
    const bulb = s.mesh(new THREE.CircleGeometry(0.06, 20), new THREE.MeshStandardMaterial({ color: '#fff4d0', emissive: '#ffe9a8', emissiveIntensity: mix(0.8, 2.2, 1 - mood.daylight) }), [0, 0, 0]);
    bulb.position.copy(shade.position).add(new THREE.Vector3(-0.055, -0.1, 0.09));
    bulb.rotation.set(-Math.PI / 2 + 0.55, 0.3, 0);
    bulb.castShadow = false;

    // The reject bin on her left, broken biscuits in and around it.
    const binX = 0.3, binZ = benchZ - 0.05, binR = 0.1, binH = 0.2;
    s.cylinder(binR, binR * 0.92, binH, [binX, benchTop + binH / 2, binZ], s.material(pick(random, ['#9aa0a4', '#d4303a', '#2f6fc4']), { metalness: 0.5, roughness: 0.45 }), 20);
    s.label('REJECTS', 0.12, 0.04, [binX, benchTop + binH * 0.55, binZ + binR + 0.002], '#2a2320', '#f1ede4');
    const halfGeometry = new THREE.CylinderGeometry(0.034, 0.034, 0.009, 16, 1, false, 0, Math.PI);
    const biscuitPaint = s.material(BISCUIT_COLOUR.round, { roughness: 0.9 });
    const inBin = Math.round(a.bin * 14);
    if (inBin) {
      const pile = s.scatter(halfGeometry, biscuitPaint, Array.from({ length: inBin }, (_u, i) => ({ at: [binX + (random() - 0.5) * 0.1, benchTop + binH - 0.06 + (i / inBin) * 0.08 * a.bin, binZ + (random() - 0.5) * 0.1] as P, size: 1 })));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < inBin; i++) { pile.getMatrixAt(i, m); const p = new THREE.Vector3().setFromMatrixPosition(m); m.compose(p, q.setFromEuler(new THREE.Euler((random() - 0.5) * 1.5, random() * 6.3, (random() - 0.5) * 1.5)), new THREE.Vector3(1, 1, 1)); pile.setMatrixAt(i, m); }
      pile.instanceMatrix.needsUpdate = true;
    }
    if (a.bin > 0.6) {
      const spill = s.scatter(halfGeometry, biscuitPaint, Array.from({ length: 6 }, () => ({ at: [binX + (random() - 0.5) * 0.3, benchTop + 0.005, binZ - 0.08 + (random() - 0.5) * 0.2] as P, size: 1 })));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < 6; i++) { spill.getMatrixAt(i, m); const p = new THREE.Vector3().setFromMatrixPosition(m); m.compose(p, q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * 6.3), new THREE.Vector3(1, 1, 1)); spill.setMatrixAt(i, m); }
      spill.instanceMatrix.needsUpdate = true;
    }
    const crumbs = s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#c9a06a', { roughness: 1 }), Array.from({ length: Math.round(mix(3, 14, a.bin)) }, () => ({ at: [(random() - 0.5) * 0.8, benchTop + 0.004, benchZ + (random() - 0.5) * 0.4] as P, size: 0.004 + random() * 0.005 })));
    crumbs.castShadow = false;
    // A tray of biscuits waiting to be checked, on the near edge.
    const trayX = -0.05, trayZ = benchZ - 0.14;
    const card = s.material('#b9915c', { roughness: 0.95 });
    s.box([0.3, 0.008, 0.2], [trayX, benchTop + 0.004, trayZ], card);
    for (const side of [-1, 1]) { s.box([0.3, 0.035, 0.008], [trayX, benchTop + 0.02, trayZ + side * 0.096], card); s.box([0.008, 0.035, 0.2], [trayX + side * 0.146, benchTop + 0.02, trayZ], card); }
    const waiting = 4 + Math.floor(random() * 8);
    s.scatter(new THREE.CylinderGeometry(0.034, 0.034, 0.009, 16), biscuitPaint, Array.from({ length: waiting }, (_u, i) => ({ at: [trayX - 0.1 + (i % 4) * 0.07, benchTop + 0.012 + Math.floor(i / 4) * 0.009, trayZ - 0.05 + Math.floor(i / 4) * 0.07] as P, size: 1 })));

    if (a.tool === 'callipers') {
      const chrome = s.material('#c9ced2', { metalness: 0.8, roughness: 0.25 });
      s.box([0.18, 0.006, 0.016], [0.1, benchTop + 0.006, benchZ + 0.18], chrome).rotation.y = 0.4;
      s.box([0.02, 0.006, 0.07], [0.02, benchTop + 0.006, benchZ + 0.22], chrome).rotation.y = 0.4;
      s.box([0.02, 0.006, 0.07], [0.09, benchTop + 0.006, benchZ + 0.19], chrome).rotation.y = 0.4;
    } else if (a.tool === 'ruler') {
      s.box([0.3, 0.004, 0.03], [0.05, benchTop + 0.004, benchZ + 0.18], s.material('#c9ced2', { metalness: 0.8, roughness: 0.25 })).rotation.y = 0.25;
      s.ring(0.03, 0.005, [0.12, benchTop + 0.008, benchZ + 0.12], s.material('#2a2320', { roughness: 0.5 })).rotation.x = Math.PI / 2;
      s.cylinder(0.028, 0.028, 0.003, [0.12, benchTop + 0.008, benchZ + 0.12], new THREE.MeshStandardMaterial({ color: '#dfe8ee', transparent: true, opacity: 0.4, depthWrite: false }), 16).castShadow = false;
      s.rod([0.145, benchTop + 0.008, benchZ + 0.135], [0.2, benchTop + 0.01, benchZ + 0.17], 0.006, s.material('#2a2320'));
    } else if (a.tool === 'scales') {
      const brass = s.material('#c9a44a', { metalness: 0.7, roughness: 0.3 });
      s.cylinder(0.05, 0.06, 0.012, [0.08, benchTop + 0.006, benchZ + 0.2], brass, 16);
      s.rod([0.08, benchTop + 0.012, benchZ + 0.2], [0.08, benchTop + 0.17, benchZ + 0.2], 0.008, brass);
      s.box([0.22, 0.006, 0.006], [0.08, benchTop + 0.17, benchZ + 0.2], brass).rotation.z = 0.06;
      for (const side of [-1, 1]) {
        s.rod([0.08 + side * 0.1, benchTop + 0.17 + side * 0.006, benchZ + 0.2], [0.08 + side * 0.1, benchTop + 0.08 + side * 0.006, benchZ + 0.2], 0.002, brass);
        s.cylinder(0.035, 0.03, 0.006, [0.08 + side * 0.1, benchTop + 0.075 + side * 0.006, benchZ + 0.2], brass, 16);
      }
    }
    if (a.tally) {
      const sheet = s.mesh(new THREE.PlaneGeometry(0.15, 0.2), new THREE.MeshStandardMaterial({ map: tallySheet(random), roughness: 0.95 }), [0.22, benchTop + 0.002, benchZ + 0.17]);
      sheet.rotation.set(-Math.PI / 2, 0, 0.3);
      sheet.castShadow = false;
      s.cylinder(0.004, 0.004, 0.14, [0.28, benchTop + 0.006, benchZ + 0.12], s.material('#e6b020', { roughness: 0.5 }), 6).rotation.set(Math.PI / 2, 0, 0.7);
    }

    // Arms: the right hand lifts the biscuit to eye level under the lamp; the left rests on the bin's rim.
    bow(person, 6);
    const head = at(person.head);
    const hold = new THREE.Vector3(-0.13, head.y - 0.01, head.z + 0.24);
    reach(person, 'right', hold, { forward: [50, 130], out: [-10, 35], bend: [40, 130], across: [-10, 50] });
    reach(person, 'left', new THREE.Vector3(binX - 0.03, benchTop + binH + 0.03, binZ - 0.04), { forward: [20, 100], out: [-5, 35], bend: [0, 100], across: [-30, 30] });
    look(person, 6, -24);
    ground(person);
    // Her seat may have shifted with the pose: put the hips back on the stool.
    seat(person, seatY + 0.045 * H);
    const right = at(person.hands.right);
    const held = a.biscuit === 'broken'
      ? s.mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.009, 16, 1, false, 0.3, Math.PI), biscuitPaint, [right.x - 0.01, right.y + 0.035, right.z + 0.01])
      : s.cylinder(0.034, 0.034, 0.009, [right.x - 0.01, right.y + 0.035, right.z + 0.01], a.biscuit === 'burnt' ? s.material('#6a3a1a', { roughness: 0.9 }) : biscuitPaint, 16);
    held.rotation.set(Math.PI / 2, 0, -0.5);
    if (a.biscuit === 'burnt') {
      const edge = s.mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 16, Math.PI * 0.8), s.material('#2a1a10', { roughness: 0.9 }), [right.x - 0.01, right.y + 0.035, right.z + 0.012]);
      edge.rotation.set(0, 0, 1.2);
    }

    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});

function tallySheet(random: () => number) {
  return paint(96, 128, (c) => {
    c.fillStyle = '#f6f2e6';
    c.fillRect(0, 0, 96, 128);
    c.strokeStyle = '#9aa0b0';
    c.lineWidth = 1;
    for (let y = 20; y < 128; y += 14) { c.beginPath(); c.moveTo(6, y); c.lineTo(90, y); c.stroke(); }
    c.strokeStyle = '#2a3a6a';
    c.lineWidth = 2;
    for (let row = 0; row < 7; row++) {
      const groups = Math.floor(random() * 4);
      for (let g = 0; g < groups; g++) {
        const x0 = 10 + g * 20, y0 = 24 + row * 14;
        for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x0 + i * 4, y0); c.lineTo(x0 + i * 4, y0 + 10); c.stroke(); }
        c.beginPath(); c.moveTo(x0 - 2, y0 + 8); c.lineTo(x0 + 15, y0 + 2); c.stroke();
      }
    }
  });
}
