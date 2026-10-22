import * as THREE from 'three';
import { type Figure, Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { type Build, HAT_COLOURS, type P, STEEL, VEST_COLOURS, arm, beamGeometry, boots, hardHat, leg, look, pick, pickSkin, vest, worldOf } from './site';

export default defineThing({
  questions: {
    signal: choice('What signal is he giving?', {
      up: 'One arm straight up, finger raised: hoist.',
      swing: 'Arm up with the forearm circling: keep hoisting.',
      stop: 'Arm out level with a fist: stop.',
      point: 'Arm out to the side, pointing where the load should swing.',
      lower: 'Arm down, finger pointing at the ground: lower away.',
    }),
    load: choice('What hangs from the hook?', {
      nothing: 'Nothing visible yet: the hook is still out of frame.',
      near: 'A steel beam in slings, just above the heads.',
      high: 'A steel beam far up on the hook, small against the sky.',
      rebar: 'A bundle of rebar in chain slings, just above.',
      kibble: 'A concrete kibble dribbling as it comes down.',
    }),
    vest: choice('What colour is his vest?', { orange: 'Orange hi-vis.', yellow: 'Yellow hi-vis.', lime: 'Lime-green hi-vis.' }),
    mate: noul('Does a second worker steady the load with a tagline?'),
    hat: choice('What colour is his hard hat?', { white: 'White.', yellow: 'Yellow.', orange: 'Orange.', blue: 'Blue.', red: 'Red.' }),
    rope: choice('Where is his tagline?', {
      feet: 'Coiled neatly at his feet.',
      hand: 'Hanging from his free hand.',
      shoulder: 'Slung over one shoulder in a coil.',
      none: 'No tagline: only the radio.',
    }),
    radio: choice('How is the radio held?', {
      mouth: 'Pressed to the mouth, mid-call.',
      chest: 'Clipped to the chest strap, hand free.',
      ear: 'Held up to the ear, listening.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.72, 1.9, random());
    const build: Build = random() < 0.4 ? 'heavy' : 'average';
    const signalSide = random() < 0.55 ? 'right' : 'left';
    const other = signalSide === 'right' ? 'left' : 'right';
    const person = figure(s, {
      height: H, build, style: 'doll', pose: 'standing', hair: 'none', skin: pickSkin(random),
      top: pick(random, ['#3a4a6a', '#8a8c8e', '#5b7a9c', '#d9d6cc']), bottom: '#3f4a5c', shoes: '#5a4030', sleeves: random() < 0.5 ? 'short' : 'long',
    });
    s.root.add(person.root);
    leg(person, 'left', { forward: -4, out: 9 });
    leg(person, 'right', { forward: 6, out: 9 });
    const signalPose = {
      up: { forward: 176, out: 6, bend: 4, across: 0 },
      swing: { forward: 165, out: 12, bend: 55, across: 0 },
      stop: { forward: 92, out: 4, bend: 2, across: 0 },
      point: { forward: 10, out: 92, bend: 2, across: 0 },
      lower: { forward: 36, out: 14, bend: 2, across: 0 },
    }[a.signal];
    arm(person, signalSide, signalPose);
    if (a.radio === 'mouth') arm(person, other, { forward: 50, out: 8, bend: 142, across: 30 });
    else if (a.radio === 'ear') arm(person, other, { forward: 40, out: 36, bend: 148, across: 10 });
    else arm(person, other, a.rope === 'hand' ? { forward: 12, out: 10, bend: 10, across: 0 } : { forward: -8, out: 36, bend: 96, across: 60 });
    const upward = a.load === 'high' ? -42 : a.load === 'nothing' ? -36 : -26;
    look(person, a.signal === 'lower' ? 24 : upward, a.signal === 'point' ? (signalSide === 'right' ? -30 : 30) : 6);
    person.joints.spine.rotation.x = a.signal === 'lower' ? 0.08 : -0.1;
    person.settle();
    person.root.updateMatrixWorld(true);
    hardHat(s, person, H, HAT_COLOURS[a.hat], { tilt: 6 });
    vest(s, person, H, build, VEST_COLOURS[a.vest]);
    boots(s, person, H);
    const dark = s.material('#2a2c30', { roughness: 0.6 });
    const skinTone = (person.hands.left.parent!.children.find((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh).material as THREE.Material;
    // The signalling hand: a raised finger, a fist, or a pointing finger.
    const signalHand = worldOf(person.hands[signalSide]);
    const fingerDir = { up: [0, 1, 0], swing: [0, 1, 0], stop: [0, 0, 0], point: [signalSide === 'right' ? -1 : 1, 0, 0], lower: [0, -1, 0] }[a.signal] as P;
    if (a.signal === 'stop') s.ball([0.045, 0.045, 0.045], [signalHand.x, signalHand.y, signalHand.z], skinTone, 10);
    else s.rod([signalHand.x, signalHand.y, signalHand.z], [signalHand.x + fingerDir[0] * 0.08, signalHand.y + fingerDir[1] * 0.08, signalHand.z + fingerDir[2] * 0.08], 0.011, skinTone);
    // The radio.
    const radioAt = a.radio === 'chest'
      ? person.joints.spine.localToWorld(new THREE.Vector3(-H * 0.045, H * 0.28 * 0.72, H * 0.036 * 1.35 * (build === 'heavy' ? 1.25 : 1) + 0.03))
      : worldOf(person.hands[other]).add(new THREE.Vector3(0, 0.03, 0.02));
    s.box([0.06, 0.15, 0.035], [radioAt.x, radioAt.y, radioAt.z], dark);
    s.rod([radioAt.x - 0.02, radioAt.y + 0.07, radioAt.z], [radioAt.x - 0.03, radioAt.y + 0.24, radioAt.z - 0.01], 0.004, dark);
    s.box([0.035, 0.025, 0.004], [radioAt.x, radioAt.y + 0.035, radioAt.z + 0.019], s.material('#5aa0d8', { emissive: '#3a80c8', emissiveIntensity: 0.6 }));

    // ---- the tagline
    const rope = s.material(pick(random, ['#f2e2a0', '#f0a020', '#e8e4da']), { roughness: 0.9 });
    const feet = worldOf(person.pelvis);
    if (a.rope === 'feet') {
      const at: P = [feet.x + (signalSide === 'right' ? -0.4 : 0.4), 0.012, feet.z + 0.2];
      for (let i = 0; i < 3; i++) { const coil = s.ring(0.14 - i * 0.012, 0.011, [at[0] + (random() - 0.5) * 0.03, 0.012 + i * 0.02, at[2] + (random() - 0.5) * 0.03], rope); coil.rotation.x = Math.PI / 2; }
      s.rod([at[0] + 0.12, 0.012, at[2]], [at[0] + 0.3, 0.012, at[2] + 0.2], 0.011, rope);
    } else if (a.rope === 'hand') {
      const hand = worldOf(person.hands[other]);
      for (let i = 0; i < 4; i++) { const loop = s.ring(0.12, 0.01, [hand.x + (random() - 0.5) * 0.02, hand.y - 0.12, hand.z + i * 0.012], rope); loop.scale.y = 1.7; }
    } else if (a.rope === 'shoulder') {
      const shoulder = person.joints.shoulders[other];
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.016, 8, 28), rope);
      coil.rotation.set(0, Math.PI / 2, 0.25);
      coil.position.set(0, -0.05, 0);
      coil.scale.set(1, 1.3, 1);
      coil.castShadow = true;
      shoulder.add(coil);
    }

    // ---- the load on the hook
    const loadGroup = new THREE.Group();
    let hookY = 0;
    const steel = s.material(STEEL.primer.colour, { roughness: STEEL.primer.roughness, metalness: STEEL.primer.metalness });
    const cable = s.material('#5a5e62', { metalness: 0.7, roughness: 0.4 });
    const chain = s.material('#4a4c50', { metalness: 0.6, roughness: 0.45 });
    const loadX = signalSide === 'right' ? -1.0 : 1.0, loadZ = 0.9;
    const addHook = (y: number, top: number) => {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.12), dark);
      block.position.y = y + 0.18;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.08, 0.125), s.material('#f2c21c', { roughness: 0.5 }));
      stripe.position.y = y + 0.18;
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.024, 8, 20, Math.PI * 1.45), s.material('#9a9ea2', { metalness: 0.7, roughness: 0.35 }));
      hook.position.y = y - 0.04;
      hook.rotation.z = Math.PI * 0.55;
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, top - y - 0.36, 8), cable);
      line.position.y = (top + y + 0.36) / 2;
      for (const mesh of [block, stripe, hook, line]) { mesh.castShadow = true; loadGroup.add(mesh); }
      const sheave = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16), s.material('#9a9ea2', { metalness: 0.7, roughness: 0.35 }));
      sheave.rotation.x = Math.PI / 2;
      sheave.position.y = y + 0.3;
      loadGroup.add(sheave);
    };
    const slings = (y: number, points: P[], material: THREE.Material, radius = 0.012) => {
      for (const p of points) {
        const from = new THREE.Vector3(0, y - 0.1, 0), to = new THREE.Vector3(...p);
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), 6), material);
        mesh.position.copy(from).add(to).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
        mesh.castShadow = true;
        loadGroup.add(mesh);
      }
    };
    let beamEnd: THREE.Vector3 | null = null;
    if (a.load === 'near' || a.load === 'high') {
      const beamY = a.load === 'near' ? 2.35 : 3.5;
      hookY = beamY + 0.95;
      addHook(hookY, hookY + 1.3);
      const beam = new THREE.Mesh(beamGeometry(3.2, 0.3, 0.25), steel);
      beam.rotation.y = Math.PI / 2;
      beam.position.y = beamY;
      beam.castShadow = true;
      loadGroup.add(beam);
      slings(hookY, [[-1.1, beamY + 0.15, 0], [1.1, beamY + 0.15, 0]], cable);
      beamEnd = new THREE.Vector3(loadX + 1.6, beamY, loadZ);
    } else if (a.load === 'rebar') {
      const beamY = 2.3;
      hookY = beamY + 1.0;
      addHook(hookY, hookY + 1.3);
      const bars = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), s.material('#6a4a3a', { roughness: 0.95 }), 24);
      const along = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < 24; i++) {
        const t = (i / 24) * Math.PI * 2, d = 0.06 + random() * 0.09;
        matrix.compose(new THREE.Vector3(0, beamY + Math.sin(t) * d, Math.cos(t) * d), along, new THREE.Vector3(0.012, 3.0 + random() * 0.4, 0.012));
        bars.setMatrixAt(i, matrix);
      }
      bars.instanceMatrix.needsUpdate = true;
      bars.castShadow = true;
      loadGroup.add(bars);
      slings(hookY, [[-1.0, beamY + 0.1, 0], [1.0, beamY + 0.1, 0]], chain, 0.016);
      beamEnd = new THREE.Vector3(loadX + 1.5, beamY, loadZ);
    } else if (a.load === 'kibble') {
      const bottom = 2.0;
      hookY = bottom + 1.5;
      addHook(hookY, hookY + 1.3);
      const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.3, 0.9, 20), s.material('#f2c21c', { roughness: 0.6 }));
      bucket.position.y = bottom + 0.45;
      bucket.castShadow = true;
      loadGroup.add(bucket);
      const bail = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.025, 8, 24, Math.PI), s.material('#4a4c50', { metalness: 0.6, roughness: 0.45 }));
      bail.position.y = bottom + 0.85;
      loadGroup.add(bail);
      slings(hookY, [[0, bottom + 1.3, 0]], chain, 0.016);
      const slurry = s.material('#8a8a84', { roughness: 1 });
      const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.5, 6), slurry);
      drip.position.set(0.08, bottom - 0.25, 0.05);
      loadGroup.add(drip);
      const splat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.01, 14), slurry);
      splat.position.set(0.1, 0.005, 0.08);
      splat.receiveShadow = true;
      loadGroup.add(splat);
      beamEnd = new THREE.Vector3(loadX + 0.45, bottom + 0.6, loadZ);
    }
    if (a.load !== 'nothing') {
      loadGroup.position.set(loadX, 0, loadZ);
      s.root.add(loadGroup);
    }

    // ---- the mate steadying the load with a tagline
    let mate: Figure | null = null;
    if (a.mate) {
      const HM = mix(1.66, 1.82, random());
      const buildM: Build = random() < 0.3 ? 'slight' : 'average';
      mate = figure(s, { height: HM, build: buildM, style: 'doll', pose: 'standing', hair: 'none', skin: pickSkin(random), top: pick(random, ['#b8302a', '#5b7a9c', '#6e7074']), bottom: '#3f4a5c', shoes: '#5a4030', sleeves: 'short' });
      s.root.add(mate.root);
      const atX = beamEnd ? beamEnd.x + (signalSide === 'right' ? 0.7 : -0.7) * 0.0 + 0.55 : loadX + 1.3;
      const atZ = beamEnd ? beamEnd.z + 0.6 : loadZ + 0.6;
      mate.root.position.set(atX, 0, atZ);
      mate.root.rotation.y = Math.PI + 0.5;
      leg(mate, 'left', { forward: 10, out: 12, knee: 12 });
      leg(mate, 'right', { forward: -12, out: 10 });
      arm(mate, 'left', { forward: 125, out: 10, bend: 18, across: 6 });
      arm(mate, 'right', { forward: 95, out: 8, bend: 28, across: 10 });
      look(mate, -30, 10);
      mate.joints.body.rotation.x = -0.1;
      mate.settle();
      mate.root.updateMatrixWorld(true);
      hardHat(s, mate, HM, pick(random, [HAT_COLOURS.yellow, HAT_COLOURS.orange, HAT_COLOURS.white]));
      vest(s, mate, HM, buildM, pick(random, [VEST_COLOURS.orange, VEST_COLOURS.yellow]));
      boots(s, mate, HM);
      mate.root.updateMatrixWorld(true);
      const hands = [worldOf(mate.hands.left), worldOf(mate.hands.right)];
      const anchor = beamEnd ?? new THREE.Vector3(loadX + 1.2, 2.6, loadZ);
      s.rod([anchor.x, anchor.y, anchor.z], [hands[0].x, hands[0].y, hands[0].z], 0.011, rope);
      s.rod([hands[0].x, hands[0].y, hands[0].z], [hands[1].x, hands[1].y - 0.02, hands[1].z], 0.011, rope);
      // The rope's slack tail.
      s.rod([hands[1].x, hands[1].y, hands[1].z], [hands[1].x + 0.2, 0.01, hands[1].z + 0.3], 0.01, rope);
    }

    const energy = mood.energy;
    const swingArm = a.signal === 'swing' ? person.joints.elbows[signalSide] : null;
    const swingShoulder = a.signal === 'swing' ? person.joints.shoulders[signalSide] : null;
    const baseShoulder = swingShoulder ? swingShoulder.rotation.clone() : null;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        mate?.update(dt, time);
        if (a.load !== 'nothing') {
          loadGroup.rotation.z = Math.sin(time * 0.9) * 0.025 * (0.2 + energy);
          loadGroup.rotation.y = Math.sin(time * 0.4) * 0.06 * (0.2 + energy);
        }
        if (swingArm && swingShoulder && baseShoulder) {
          swingArm.rotation.y = time * (2 + energy * 4);
          swingShoulder.rotation.z = baseShoulder.z + Math.sin(time * (2 + energy * 4)) * 0.08;
        }
      },
    });
  },
});
