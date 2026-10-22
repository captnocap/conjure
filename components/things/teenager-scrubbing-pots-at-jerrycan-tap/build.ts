import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type Figure, mix, noul, score } from '@conjure/kit';
import { type P, pick, pickSkin, rig, worldOf } from './rig';

export default defineThing({
  questions: {
    done: score('How many pots are already clean?', ['None yet, the dirty stack towering', 'A few clean ones drying upside down', 'Nearly all of them, one last pot in the suds']),
    jerrycan: choice('What colour is the jerrycan?', {
      yellow: 'Yellow, the water kind.',
      blue: 'Blue, with a white tap.',
      white: 'White, scuffed grey.',
      black: 'Black, an old fuel can scrubbed out for water.',
    }),
    hoodie: choice('What colour is the hoodie?', {
      grey: 'Heather grey.',
      black: 'Black.',
      red: 'Faded red.',
      green: 'Bottle green.',
      purple: 'Purple.',
      yellow: 'Mustard yellow.',
    }),
    scrubbing: choice('What is being scrubbed right now?', {
      stockpot: 'A big dented aluminium stockpot.',
      pan: 'A wide shallow frying pan, black on the bottom.',
      tray: 'A deep baking tray, burnt at the corners.',
      urn: 'A tea urn with its tap hanging open.',
    }),
    hood: noul('Is the hood up?'),
    helper: noul('Is a younger child drying the pots with a rag?'),
    suds: noul('Is there foam on the water and on the brush?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.5, 1.72, random());
    const skin = pickSkin(random);
    const hoodie = { grey: '#8a8a88', black: '#242426', red: '#a8302a', green: '#2f5a3a', purple: '#5a3a7a', yellow: '#d4a21c' }[a.hoodie];
    const person = figure(s, {
      height: H, build: 'slight', style: 'doll', skin, hair: a.hood ? 'hood' : pick(random, ['short', 'long', 'cap', 'bun']), hairColor: pick(random, ['#2a1d16', '#1d1d1f', '#8a5a2a', '#c9a060']),
      top: hoodie, bottom: pick(random, ['#3a3f4a', '#2b2f3a', '#5a5a4a']), shoes: pick(random, ['#efece4', '#2a2a2c', '#c9402a']), sleeves: 'short', pose: 'crouching', gaze: 'down',
    });
    s.root.add(person.root);
    const joints = rig(person);
    // Both hands down at the pot: one scrubbing inside, the other holding the rim.
    joints.arm('right', { forward: 14, out: -4, bend: 18, across: 20 });
    joints.arm('left', { forward: 8, out: 12, bend: 10, across: 0 });
    joints.look(34, -8);
    joints.settle();
    const limb = H * 0.036 * 0.85, foreL = H * 0.15;
    // Pushed-up sleeves: a rolled cuff at each elbow.
    for (const side of ['left', 'right'] as const) {
      const elbow = person.hands[side].parent!.parent!;
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(limb * 0.95, limb * 0.4, 6, 14), s.material(hoodie, { roughness: 0.95 }));
      cuff.position.y = -foreL * 0.2;
      cuff.rotation.x = Math.PI / 2;
      cuff.castShadow = true;
      elbow.add(cuff);
    }
    if (!a.hood) { const hood = new THREE.Mesh(new THREE.SphereGeometry(H * 0.075, 12, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.35), s.material(hoodie, { roughness: 0.95, side: THREE.DoubleSide })); hood.position.set(0, H * 0.28 * 0.9, -H * 0.03); hood.castShadow = true; joints.spine.add(hood); }
    person.root.updateMatrixWorld(true);
    const right = worldOf(person.hands.right), left = worldOf(person.hands.left);
    const hips = worldOf(person.pelvis);

    // The pot being scrubbed sits under the hands; the water in it is grey.
    const alu = s.material('#b8bcbe', { metalness: 0.75, roughness: mix(0.35, 0.6, mood.wear) });
    const dark = s.material('#2a2c2e', { roughness: 0.8 });
    const pot: P = [right.x + 0.06, 0, right.z - 0.04];
    let potH = 0.28, potR = 0.22;
    if (a.scrubbing === 'stockpot') {
      s.lathe([[0, 0], [potR - 0.01, 0], [potR, 0.012], [potR, potH], [potR + 0.012, potH + 0.01], [potR - 0.014, potH + 0.01], [potR - 0.014, 0.012], [0, 0.012]], alu, pot);
      for (const side of [-1, 1]) { const handle = s.ring(0.045, 0.01, [pot[0] + side * (potR + 0.01), potH - 0.05, pot[2]], alu, Math.PI); handle.rotation.set(-Math.PI / 2, 0, side > 0 ? -Math.PI / 2 : Math.PI / 2); }
    }
    if (a.scrubbing === 'pan') {
      potH = 0.08; potR = 0.24;
      s.lathe([[0, 0], [0.19, 0], [potR, potH], [potR - 0.012, potH], [0.18, 0.01], [0, 0.01]], alu, pot);
      s.cylinder(0.185, 0.185, 0.004, [pot[0], 0.002, pot[2]], dark, 24);
      s.rod([pot[0] + potR, potH - 0.02, pot[2]], [pot[0] + potR + 0.28, potH + 0.06, pot[2] - 0.05], 0.014, dark);
    }
    if (a.scrubbing === 'tray') {
      potH = 0.1; potR = 0.24;
      s.box([0.5, potH, 0.36], [pot[0], potH / 2, pot[2]], alu);
      s.box([0.46, 0.004, 0.32], [pot[0], potH + 0.002, pot[2]], s.material('#5a5048', { roughness: 0.95 }));
      for (const [dx, dz] of [[-0.22, -0.15], [0.22, -0.15], [-0.22, 0.15], [0.22, 0.15]] as const) s.box([0.06, 0.004, 0.06], [pot[0] + dx, potH + 0.003, pot[2] + dz], dark);
    }
    if (a.scrubbing === 'urn') {
      potH = 0.42; potR = 0.17;
      s.lathe([[0, 0], [potR, 0], [potR + 0.01, 0.02], [potR + 0.01, potH - 0.03], [potR + 0.02, potH], [potR - 0.012, potH], [potR - 0.012, 0.012], [0, 0.012]], alu, pot);
      s.rod([pot[0], 0.06, pot[2] - potR], [pot[0], 0.06, pot[2] - potR - 0.06], 0.012, dark);
      s.rod([pot[0], 0.06, pot[2] - potR - 0.06], [pot[0] + 0.03, 0.0, pot[2] - potR - 0.09], 0.008, dark);
    }
    const waterLevel = a.scrubbing === 'tray' || a.scrubbing === 'pan' ? potH * 0.5 : potH * 0.35;
    const water = a.scrubbing === 'tray'
      ? s.box([0.46, 0.006, 0.32], [pot[0], waterLevel, pot[2]], new THREE.MeshStandardMaterial({ color: '#8a8e86', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 }))
      : s.cylinder(potR - 0.015, potR - 0.015, 0.006, [pot[0], waterLevel, pot[2]], new THREE.MeshStandardMaterial({ color: '#8a8e86', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 }), 24);
    water.castShadow = false;
    const foam = s.material('#f6f6f2', { roughness: 1 });
    if (a.suds) s.scatter(new THREE.SphereGeometry(1, 6, 5), foam, Array.from({ length: 26 }, () => { const t = random() * 6.3, d = random() * (potR - 0.04); return { at: [pot[0] + Math.cos(t) * d * (a.scrubbing === 'tray' ? 1 : 1), waterLevel + 0.006, pot[2] + Math.sin(t) * d * 0.8] as P, size: 0.012 + random() * 0.014 }; }));
    // The brush in the right hand, bristles down into the pot.
    const brush = new THREE.Group();
    brush.position.copy(right).add(new THREE.Vector3(0, -0.01, 0.02));
    brush.rotation.x = 0.4;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.11), s.material(pick(random, ['#c9402a', '#2f6fc4', '#d4a21c']), { roughness: 0.6 }));
    const bristles = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.03, 0.1), s.material('#e9dc9a', { roughness: 1 }));
    bristles.position.y = -0.026;
    head.castShadow = bristles.castShadow = true;
    brush.add(head, bristles);
    if (a.suds) { const blob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), foam); blob.position.set(0.02, -0.03, 0.03); blob.scale.y = 0.6; brush.add(blob); }
    s.root.add(brush);
    void left;

    // The jerrycan on a crate beside the pot, its tap spout reaching over the rim, a trickle falling.
    const S = random() < 0.5 ? 1 : -1;
    const crateX = pot[0] + S * (potR + 0.34), crateZ = pot[2] + 0.05;
    const crateH = 0.34;
    s.box([0.42, crateH, 0.36], [crateX, crateH / 2, crateZ], s.material(pick(random, ['#2f6fc4', '#3a3a3a', '#c9402a', '#b48a5a']), { roughness: 0.6 }));
    s.scatter(new THREE.BoxGeometry(0.4, 0.012, 0.012), s.material('#1d1d1f'), Array.from({ length: 5 }, (_u, i) => ({ at: [crateX, 0.06 + i * 0.06, crateZ + 0.181] as P, size: 1 })));
    const canColour = { yellow: '#e2b61c', blue: '#2f5fb0', white: '#e8e6e0', black: '#2a2a2c' }[a.jerrycan];
    const can = s.material(new THREE.Color(canColour).lerp(new THREE.Color('#8a8a80'), mood.wear * 0.25), { roughness: 0.55 });
    const canW = 0.34, canH = 0.46, canD = 0.17;
    const canX = crateX + S * 0.02;
    s.box([canD, canH, canW], [canX, crateH + canH / 2, crateZ], can);
    s.box([canD * 0.7, 0.03, canW * 0.9], [canX, crateH + canH - 0.005, crateZ], can);
    s.cylinder(0.035, 0.035, 0.05, [canX, crateH + canH + 0.02, crateZ + canW * 0.3], s.material(a.jerrycan === 'blue' ? '#efece4' : '#1d1d1f'), 12);
    const handle = s.ring(0.05, 0.012, [canX, crateH + canH + 0.01, crateZ - 0.02], can, Math.PI);
    handle.rotation.y = Math.PI / 2;
    for (let i = 0; i < 3; i++) s.box([canD + 0.004, 0.012, canW * 0.8], [canX, crateH + 0.1 + i * 0.12, crateZ], can);
    // The tap on the inner lower edge, spout pointing over the pot.
    const tapY = crateH + 0.06, tapX = canX - S * canD / 2;
    s.rod([tapX, tapY, crateZ], [tapX - S * 0.09, tapY, crateZ], 0.012, s.material(a.jerrycan === 'blue' ? '#efece4' : '#2a2c2e'));
    s.rod([tapX - S * 0.09, tapY, crateZ], [tapX - S * 0.11, tapY - 0.04, crateZ], 0.009, s.material(a.jerrycan === 'blue' ? '#efece4' : '#2a2c2e'));
    s.box([0.03, 0.01, 0.04], [tapX - S * 0.06, tapY + 0.015, crateZ], s.material('#c9402a')).rotation.y = 0.3;
    // A short hose from the tap reaches over the rim, so the trickle lands in the pot whatever its size.
    const hoseEnd: P = [pot[0] + S * (potR - 0.07), Math.max(waterLevel + 0.1, potH + 0.06), pot[2] + 0.02];
    s.tube([[tapX - S * 0.11, tapY - 0.04, crateZ], [tapX - S * 0.14, tapY - 0.08, crateZ + 0.01], [(tapX + hoseEnd[0]) / 2, hoseEnd[1] + 0.05, (crateZ + hoseEnd[2]) / 2], hoseEnd], 0.011, s.material('#2a2c2e', { roughness: 0.7 }));
    const trickle = s.mesh(new THREE.CylinderGeometry(0.005, 0.009, hoseEnd[1] - waterLevel, 8), new THREE.MeshStandardMaterial({ color: '#dff0ff', transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false }), [hoseEnd[0], (hoseEnd[1] + waterLevel) / 2, hoseEnd[2]]);
    trickle.castShadow = false;

    // The bucket of grey water and the stacks of pots: dirty waiting, clean drying upside down.
    const bucketX = pot[0] - S * (potR + 0.32), bucketZ = pot[2] + 0.1;
    s.lathe([[0, 0], [0.13, 0], [0.15, 0.3], [0.16, 0.31], [0.14, 0.31], [0.14, 0.26], [0, 0.26]], s.material(pick(random, ['#1d1d1f', '#2f6fc4', '#8a8a86']), { roughness: 0.6 }), [bucketX, 0, bucketZ]);
    s.cylinder(0.135, 0.135, 0.004, [bucketX, 0.26, bucketZ], new THREE.MeshStandardMaterial({ color: '#7a7e78', roughness: 0.1, metalness: 0.2 }), 20).castShadow = false;
    const bail = s.ring(0.15, 0.008, [bucketX, 0.31, bucketZ], s.material('#9a9a94', { metalness: 0.6 }), Math.PI);
    bail.rotation.y = Math.PI / 2;
    bail.rotation.x = -0.9;
    const clean = Math.round(a.done * 6), dirty = Math.max(0, 6 - clean) + (a.done < 0.2 ? 2 : 0);
    const stackX = hips.x - S * 0.6, stackZ = hips.z - 0.15;
    if (clean) s.scatter(new THREE.CylinderGeometry(0.17, 0.16, 0.2, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#c4c8ca', metalness: 0.75, roughness: 0.3, side: THREE.DoubleSide }), Array.from({ length: clean }, (_u, i) => ({ at: [stackX + (random() - 0.5) * 0.02, 0.1 + i * 0.045, stackZ + (random() - 0.5) * 0.02] as P, size: 1 })));
    if (clean) s.scatter(new THREE.CylinderGeometry(0.16, 0.16, 0.01, 18), alu, Array.from({ length: clean }, (_u, i) => ({ at: [stackX, 0.2 + i * 0.045, stackZ] as P, size: 1 })));
    if (dirty) s.scatter(new THREE.CylinderGeometry(0.16, 0.15, 0.2, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#6a6a66', metalness: 0.4, roughness: 0.8, side: THREE.DoubleSide }), Array.from({ length: dirty }, (_u, i) => ({ at: [pot[0] + S * 0.02 + (random() - 0.5) * 0.04, 0.1 + i * 0.06, pot[2] - potR - 0.3 + (random() - 0.5) * 0.04] as P, size: 1 - i * 0.03 })));
    // Grey puddle around the washing-up.
    const puddle = s.mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshStandardMaterial({ color: '#5a605c', transparent: true, opacity: mix(0.2, 0.45, mood.wear), roughness: 0.08, metalness: 0.3, depthWrite: false }), [pot[0] - S * 0.1, 0.004, pot[2] + 0.1]);
    puddle.rotation.x = -Math.PI / 2;
    puddle.scale.x = 1.5;
    puddle.castShadow = false;

    // A younger child drying with a rag.
    let child: Figure | null = null;
    if (a.helper) {
      const Hc = mix(0.95, 1.2, random());
      child = figure(s, {
        height: Hc, build: 'slight', style: 'doll', skin, hair: pick(random, ['short', 'long', 'cap']), hairColor: '#2a1d16',
        top: pick(random, ['#b03a2e', '#2b3a5a', '#d4a21c', '#4a7a5a']), bottom: pick(random, ['#3a3f4a', '#6a4a3a']), shoes: '#2a2a2c', sleeves: 'long', pose: 'standing', gaze: 'down',
      });
      child.root.position.set(stackX - S * 0.4, 0, stackZ + 0.35);
      child.root.rotation.y = S * 0.9;
      s.root.add(child.root);
      const cj = rig(child);
      cj.arm('left', { forward: 50, out: 0, bend: 70, across: 35 });
      cj.arm('right', { forward: 60, out: 0, bend: 60, across: 35 });
      cj.look(30, 0);
      cj.settle(false);
      child.root.updateMatrixWorld(true);
      const cl = worldOf(child.hands.left), cr = worldOf(child.hands.right);
      const held = s.lathe([[0, 0], [0.08, 0], [0.09, 0.1], [0.08, 0.1], [0.08, 0.012], [0, 0.012]], alu, [(cl.x + cr.x) / 2, (cl.y + cr.y) / 2 - 0.03, (cl.z + cr.z) / 2 + 0.02]);
      held.rotation.z = 0.4;
      const rag = s.box([0.1, 0.004, 0.16], [cr.x, cr.y - 0.03, cr.z + 0.02], s.material(pick(random, ['#e8e2d2', '#c9b48a', '#8fc3d8']), { roughness: 1 }));
      rag.rotation.set(0.3, 0.4, 0.5);
    }

    const energy = mood.energy;
    const scrubPhase = random() * 6.3;
    const brushZ = brush.position.z, brushX = brush.position.x;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        child?.update(dt, time);
        // The scrubbing hand works back and forth.
        const rate = 4 + energy * 6;
        brush.position.x = brushX + Math.sin(time * rate + scrubPhase) * 0.015 * (0.3 + energy);
        brush.position.z = brushZ + Math.cos(time * rate * 0.7 + scrubPhase) * 0.01 * (0.3 + energy);
        trickle.scale.x = trickle.scale.z = 1 + Math.sin(time * 9) * 0.15;
      },
    });
  },
});
