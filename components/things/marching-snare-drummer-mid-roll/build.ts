import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { paint, pick, pickSkin, reach, rig } from './rig';

const UNIFORMS = {
  white: 'A white tunic with gold braid, the parade uniform.',
  black: 'Black shirt and black trousers, a brass-band regular.',
  red: 'A red tunic with white trim, school-band style.',
  navy: 'Navy blue tunic with a white chest sash.',
  purple: 'Purple and gold, club colours.',
} as const;
const UNIFORM_COLOURS: Record<keyof typeof UNIFORMS, [string, string, string]> = {
  white: ['#f1ede4', '#1d1c22', '#e2b43a'], black: ['#1d1c22', '#1d1c22', '#8a8a90'], red: ['#b8262a', '#1d1c22', '#f1ede4'], navy: ['#1f2a5a', '#1d1c22', '#f1ede4'], purple: ['#5a2a8a', '#1d1c22', '#e2b43a'],
};

export default defineThing({
  questions: {
    uniform: choice('What is the uniform?', UNIFORMS),
    cap: choice('What is on the head?', {
      peaked: 'A peaked band cap with a badge.',
      shako: 'A tall shako with a white plume.',
      bare: 'Bare head, hair cropped.',
      bandana: 'A bandana tied over the head.',
    }),
    sticks: choice('Where are the sticks?', {
      split: 'One stick high over the head, the other half-raised, mid-roll.',
      high: 'Both sticks crossed high above the head, the flourish before the beat.',
      low: 'Both sticks down on the head, a tight buzz roll.',
    }),
    shell: choice('What does the drum shell look like?', {
      pearl: 'White marine pearl with chrome hardware.',
      chrome: 'All chrome, dazzling.',
      sparkle: 'Red sparkle wrap.',
      black: 'Matt black with black hardware.',
      wood: 'A natural wood shell, old and scuffed.',
    }),
    cowbell: noul('Is a cowbell clipped to the rim of the drum?'),
    badge: noul('Does the strap carry a round club badge?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.62, 1.84, random());
    const build = pick(random, ['slight', 'average', 'average', 'heavy'] as const);
    const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const limb = H * 0.036 * wide, torsoL = H * 0.28, shoulderW = H * 0.115 * wide, hipW = H * 0.075 * wide, headR = H * 0.064;
    const [tunicHex, trouserHex, trimHex] = UNIFORM_COLOURS[a.uniform];
    const person = figure(s, {
      height: H, build, style: 'doll', skin: pickSkin(random), hair: a.cap === 'bare' ? 'none' : a.cap === 'peaked' ? 'cap' : 'short', hairColor: a.cap === 'peaked' ? trouserHex : '#1a1512',
      top: tunicHex, bottom: trouserHex, shoes: pick(random, ['#141416', '#f1ede4']), sleeves: 'long', pose: 'walking', gaze: 'down',
    });
    s.root.add(person.root);
    const r = rig(person);
    r.leg('left', { forward: 16, out: 4, knee: 6 });
    r.leg('right', { forward: -12, out: 4, knee: 6 });
    r.lean(3, 0);
    r.bow(4, 0, 0);
    r.look(28, 0, 0);

    // The drum: a shallow cylinder hung from the strap at the hip, tilted toward the player.
    const spine = person.joints.spine;
    const chrome = new THREE.MeshStandardMaterial({ color: '#dfe3e6', metalness: 0.9, roughness: 0.2 });
    const shellHex = { pearl: '#f0ece2', chrome: '#dfe3e6', sparkle: '#c42a2a', black: '#1d1c22', wood: '#9a6a3a' }[a.shell];
    const hardware = a.shell === 'black' ? s.material('#2a2a30', { metalness: 0.6, roughness: 0.4 }) : chrome;
    const shellMap = paint(512, 128, (c) => {
      c.fillStyle = shellHex;
      c.fillRect(0, 0, 512, 128);
      if (a.shell === 'sparkle' || a.shell === 'pearl') for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(255,255,255,${random() * 0.5})`; c.fillRect(random() * 512, random() * 128, 2, 2); }
      if (a.shell === 'wood') { c.strokeStyle = 'rgba(60,35,10,0.35)'; for (let i = 0; i < 30; i++) { c.beginPath(); c.moveTo(0, random() * 128); c.lineTo(512, random() * 128); c.stroke(); } }
      // Lugs: dark slots at the top and bottom, eight round the shell.
      c.fillStyle = a.shell === 'black' ? '#3a3a40' : '#c9ccd0';
      for (let i = 0; i < 8; i++) { c.fillRect(i * 64 + 26, 14, 12, 30); c.fillRect(i * 64 + 26, 84, 12, 30); }
    });
    const snareMap = paint(256, 256, (c) => {
      c.fillStyle = '#e9e2cf';
      c.beginPath(); c.arc(128, 128, 128, 0, 6.3); c.fill();
      c.strokeStyle = '#9a9ca0';
      c.lineWidth = 2;
      for (let i = 0; i < 14; i++) { c.beginPath(); c.moveTo(20, 86 + i * 6); c.lineTo(236, 86 + i * 6); c.stroke(); }
      c.fillStyle = '#5a5c60';
      c.fillRect(8, 80, 18, 96); c.fillRect(230, 80, 18, 96);
    });
    const drumR = 0.175, drumH = 0.14;
    const drum = new THREE.Group();
    drum.position.set(0.02, -0.02, hipW * 1.1 + drumR * 0.9);
    drum.rotation.set(0.32, -0.15, 0);
    spine.add(drum);
    const add = (mesh: THREE.Mesh, parent: THREE.Object3D = drum) => { mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    add(new THREE.Mesh(new THREE.CylinderGeometry(drumR, drumR, drumH, 32), [
      new THREE.MeshStandardMaterial({ map: shellMap, roughness: a.shell === 'chrome' ? 0.2 : 0.5, metalness: a.shell === 'chrome' ? 0.9 : 0.1 }),
      s.material('#efe9d8', { roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ map: snareMap, roughness: 0.6 }),
    ]));
    for (const y of [drumH / 2, -drumH / 2]) {
      const hoop = add(new THREE.Mesh(new THREE.TorusGeometry(drumR + 0.004, 0.009, 8, 40), hardware));
      hoop.rotation.x = Math.PI / 2;
      hoop.position.y = y;
    }
    const lugs: { at: [number, number, number]; size: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.2;
      lugs.push({ at: [Math.cos(angle) * (drumR + 0.012), 0, Math.sin(angle) * (drumR + 0.012)], size: 1 });
    }
    drum.add(s.scatter(new THREE.BoxGeometry(0.018, drumH * 0.75, 0.018), hardware, lugs));
    if (a.cowbell) {
      const bell = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.1, 4), s.material(a.shell === 'black' ? '#8a8a90' : '#2a2a30', { metalness: 0.5, roughness: 0.4 })));
      bell.position.set(-drumR * 0.7, drumH / 2 + 0.05, drumR * 0.55);
      bell.rotation.set(0.5, 0.4, 0.6);
      const clamp = add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.03), hardware));
      clamp.position.set(-drumR * 0.62, drumH / 2 + 0.012, drumR * 0.72);
    }
    // The strap: over the left shoulder, down to the hook on the drum, and the counter-strap round the back.
    const strapHex = a.uniform === 'black' ? '#1a1a1e' : '#f1ede4';
    const strap = new THREE.MeshStandardMaterial({ color: strapHex, roughness: 0.9, side: THREE.DoubleSide });
    const shoulderTop = new THREE.Vector3(shoulderW * 0.75, torsoL + limb * 0.1, 0);
    const hook = drum.position.clone().add(new THREE.Vector3(-drumR * 0.8, drumH / 2 - 0.02, -drumR * 0.3));
    const band = (from: THREE.Vector3, to: THREE.Vector3) => {
      const dir = to.clone().sub(from);
      const mesh = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, dir.length(), 0.01), strap), spine);
      mesh.position.copy(from).add(to).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      return mesh;
    };
    band(shoulderTop.clone().add(new THREE.Vector3(0, 0, limb * 1.3)), hook);
    band(shoulderTop.clone().add(new THREE.Vector3(0.01, 0, -limb * 1.3)), new THREE.Vector3(-hipW * 0.9, 0.02, -limb * 1.3));
    const pad = add(new THREE.Mesh(new THREE.TorusGeometry(limb * 1.2, 0.02, 6, 12, Math.PI), strap), spine);
    pad.position.copy(shoulderTop).add(new THREE.Vector3(0, -0.005, 0));
    pad.rotation.y = Math.PI / 2;
    if (a.badge) {
      const badge = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 18), new THREE.MeshStandardMaterial({ map: paint(64, 64, (c) => { c.fillStyle = trimHex; c.beginPath(); c.arc(32, 32, 32, 0, 6.3); c.fill(); c.fillStyle = tunicHex === trimHex ? '#1a1a1e' : tunicHex; c.beginPath(); c.arc(32, 32, 20, 0, 6.3); c.fill(); c.fillStyle = trimHex; c.beginPath(); c.arc(32, 32, 9, 0, 6.3); c.fill(); }), roughness: 0.5 })), spine);
      const mid = shoulderTop.clone().add(new THREE.Vector3(0, 0, limb * 1.3)).lerp(hook, 0.45);
      badge.position.copy(mid).add(new THREE.Vector3(0, 0, 0.012));
      badge.rotation.x = Math.PI / 2 + 0.3;
    }
    if (a.uniform === 'navy') {
      const sash = add(new THREE.Mesh(new THREE.PlaneGeometry(0.09, torsoL * 1.1), new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: 0.8, side: THREE.DoubleSide })), spine);
      sash.position.set(0.02, torsoL * 0.5, limb * 1.36);
      sash.rotation.z = -0.45;
    }
    if (a.uniform === 'white' || a.uniform === 'purple') {
      for (let i = 0; i < 3; i++) {
        const braid = add(new THREE.Mesh(new THREE.BoxGeometry(shoulderW * 1.2, 0.012, 0.01), s.material(trimHex, { metalness: 0.5, roughness: 0.4 })), spine);
        braid.position.set(0, torsoL * (0.45 + i * 0.17), limb * 1.36);
      }
    }

    // Headgear beyond the kit's cap.
    if (a.cap === 'shako') {
      const felt = s.material(tunicHex === '#f1ede4' ? '#1d1c22' : tunicHex, { roughness: 0.8 });
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.08, headR * 0.98, headR * 1.45, 20), felt);
      crown.position.set(0, headR * 1.3, -headR * 0.08);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.14, headR * 1.14, headR * 0.1, 20), s.material(trimHex, { metalness: 0.5, roughness: 0.4 }));
      lid.position.set(0, headR * 2.0, -headR * 0.08);
      const peak = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.3, headR * 0.08, headR * 0.7), s.material('#141416', { roughness: 0.3 }));
      peak.position.set(0, headR * 0.6, headR * 1.15);
      peak.rotation.x = 0.2;
      const plume = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.36, 10, 8), s.material('#f6f2ea', { roughness: 1 }));
      plume.scale.set(0.8, 3.4, 0.8);
      plume.position.set(0, headR * 3.0, headR * 0.6);
      const chin = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.02, 0.006, 6, 20, Math.PI), s.material(trimHex, { metalness: 0.6, roughness: 0.4 }));
      chin.position.set(0, -headR * 0.05, headR * 0.35);
      chin.rotation.z = Math.PI;
      crown.castShadow = peak.castShadow = plume.castShadow = true;
      person.head.add(crown, lid, peak, plume, chin);
    }
    if (a.cap === 'bandana') {
      const cloth = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.08, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), s.material(pick(random, ['#c42a2a', '#2a3a7a', '#1a1a1e', '#e2b43a']), { roughness: 1 }));
      cloth.position.y = headR * 0.12;
      const knot = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, headR * 0.25, headR * 0.3), cloth.material);
      knot.position.set(0, headR * 0.2, -headR * 1.0);
      cloth.castShadow = true;
      person.head.add(cloth, knot);
    }
    if (a.cap === 'peaked') {
      const emblem = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.22, headR * 0.22, 0.006, 12), s.material(trimHex, { metalness: 0.5, roughness: 0.4 }));
      emblem.position.set(0, headR * 0.65, headR * 1.05);
      emblem.rotation.x = Math.PI / 2;
      person.head.add(emblem);
    }

    // The arms and sticks: a stick in each fist, pointing on past the fingers.
    person.root.updateMatrixWorld(true);
    const drumTop = drum.localToWorld(new THREE.Vector3(0, drumH / 2, 0));
    if (a.sticks === 'high') {
      r.arm('right', { forward: 162, out: 10, bend: 22, across: 6 });
      r.arm('left', { forward: 156, out: 12, bend: 28, across: 6 });
    } else if (a.sticks === 'low') {
      reach(person, 'right', drumTop.clone().add(new THREE.Vector3(-0.08, 0.1, 0.06)), { forward: 40, out: 10, bend: 80, across: 20 });
      reach(person, 'left', drumTop.clone().add(new THREE.Vector3(0.1, 0.1, 0.04)), { forward: 40, out: 10, bend: 80, across: 20 });
    } else {
      r.arm('right', { forward: 150, out: 22, bend: 30, across: 10 });
      reach(person, 'left', drumTop.clone().add(new THREE.Vector3(0.14, 0.3, 0.05)), { forward: 90, out: 20, bend: 80, across: 20 });
    }
    person.settle();
    const stickMaterial = s.material('#d9c49a', { roughness: 0.6 });
    // Each stick hangs from its fist but points where the roll needs it: at the head, or crossing overhead.
    person.root.updateMatrixWorld(true);
    const headCentre = drum.localToWorld(new THREE.Vector3(0, drumH / 2, 0));
    for (const side of ['left', 'right'] as const) {
      const hand = person.hands[side];
      const handAt = hand.getWorldPosition(new THREE.Vector3());
      const sign = side === 'left' ? 1 : -1;
      const direction = a.sticks === 'low'
        ? headCentre.clone().add(new THREE.Vector3(sign * 0.05, 0.02, -0.03)).sub(handAt).normalize()
        : a.sticks === 'high'
          ? new THREE.Vector3(-sign * 0.55, 1, 0.12).normalize()
          : side === 'right' ? new THREE.Vector3(0.12, 1, -0.05).normalize() : new THREE.Vector3(-0.3, 0.9, 0.45).normalize();
      const desired = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      const holder = new THREE.Group();
      holder.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(desired);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.0065, 0.4, 8), stickMaterial);
      stick.position.y = 0.13;
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), stickMaterial);
      tip.position.y = 0.33;
      stick.castShadow = tip.castShadow = true;
      holder.add(stick, tip);
      hand.add(holder);
    }

    // The roll: the stick hands flutter with the energy; the body walks a little.
    const energy = mood.energy;
    const phase = random() * Math.PI * 2;
    const elbows = person.joints.elbows;
    const restL = elbows.left.rotation.x, restR = elbows.right.rotation.x;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        const rate = mix(6, 22, energy);
        elbows.left.rotation.x = restL + Math.sin(time * rate + phase) * mix(0.02, 0.09, energy);
        elbows.right.rotation.x = restR + Math.sin(time * rate * 1.07 + phase + 1.5) * mix(0.02, 0.09, energy);
      },
    });
  },
});
