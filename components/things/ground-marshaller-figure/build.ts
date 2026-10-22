import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

// Arm poses: [upper arm, forearm] as angles from hanging straight down, swinging outwards; pi is straight up.
const POSES = {
  ahead: { r: [1.55, 3.0], l: [1.55, 3.0] },
  stop: { r: [2.6, 3.75], l: [2.6, 3.75] },
  turn: { r: [1.57, 1.57], l: [1.5, 3.0] },
  slow: { r: [0.72, 0.9], l: [0.72, 0.9] },
  goodbye: { r: [2.75, 2.95], l: [0.12, 0.2] },
  bay: { r: [3.0, 3.1], l: [3.0, 3.1] },
  rest: { r: [0.12, 0.3], l: [0.12, 0.3] },
} as const;

export default defineThing({
  questions: {
    signal: choice('What signal is the marshaller giving?', {
      ahead: 'Come ahead: elbows out, both wands upright, beckoning back over the shoulders.',
      stop: 'Stop: both wands crossed high above the head.',
      turn: 'Turn: one arm pointing straight out to the side, the other beckoning.',
      slow: 'Slow down: both arms held low and wide, patting the air.',
      goodbye: 'Goodbye: one wand raised high and waving, the other arm at rest. The job is done.',
      bay: 'This bay: both arms straight up, wands parallel, a human goalpost.',
      rest: 'No signal: wands lowered at the sides, waiting.',
    }),
    wands: choice('What is in the hands?', {
      orange: 'Glowing orange marshalling wands.',
      red: 'Red lit wands.',
      green: 'Green lit wands.',
      white: 'Cold white lit wands.',
      paddles: 'Daytime paddles: round orange bats like oversized table-tennis rackets.',
      torches: 'Two old chrome torches with yellow beams, from before there were wands.',
    }),
    gear: choice('What are they wearing?', {
      vest: 'A hi-vis vest with silver bands over dark overalls.',
      rain: 'A long yellow rain cape with the hood up.',
      parka: 'A bulky orange parka with a fur-rimmed hood, for a frozen apron.',
      tropical: 'Shorts, short sleeves and a hi-vis vest, for a hot island airfield.',
      sixties: 'White overalls and a peaked cap, crisp 1960s ramp uniform.',
    }),
    defenders: choice('Where are the ear defenders?', {
      on: 'On the ears: the engines are running.',
      up: 'Pushed up on top of the head.',
      neck: 'Hanging round the neck: it has gone quiet.',
    }),
    audience: choice('Who is the signal for?', {
      nobody: 'Nobody. The apron in front is empty.',
      aircraft: 'An aircraft: twin nose wheels and a gear leg with a landing light stand just in front.',
      gull: 'A single gull standing on the concrete, unimpressed.',
    }),
    feet: choice('What is on the ground at their feet?', {
      nothing: 'Nothing.',
      stopbar: 'A painted yellow lead-in line ending in a stop bar.',
      chocks: 'A pair of rubber chocks and a cone, ready to go in.',
      flask: 'A kit bag and a thermos flask: they have been waiting a long time.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    const hiHex = mood.warmth > 0.62 ? '#f5761a' : '#d8ea1f';
    const hi = s.material(hiHex, { emissive: hiHex, emissiveIntensity: 0.22, roughness: 0.8 });
    const silver = new THREE.MeshStandardMaterial({ color: '#e9ecec', metalness: 0.7, roughness: 0.25, emissive: '#ffffff', emissiveIntensity: 0.15 + dusk * 0.3 });
    const overall = s.material(a.gear === 'sixties' ? '#f0efe8' : a.gear === 'parka' ? '#2a2f3a' : '#27324a', { roughness: 0.85 });
    const skin = s.material(['#c9a58a', '#8a5f45', '#e2c2a8', '#5e4032'][Math.floor(random() * 4)], { roughness: 0.8 });
    const dark = s.material('#1d1f22', { roughness: 0.8 });
    const build = mix(0.94, 1.06, random());

    const body = new THREE.Group(); s.root.add(body);
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], rot?: [number, number, number]) => {
      const m = new THREE.Mesh(geometry, material); m.position.set(...at); if (rot) m.rotation.set(...rot); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
    };

    // ---- Legs and boots, feet slightly apart, weight on both.
    const bare = a.gear === 'tropical';
    for (const side of [-1, 1]) {
      const x = side * 0.12;
      add(body, new THREE.CapsuleGeometry(0.085, 0.36, 4, 10), bare ? overall : overall, [x, 0.72, 0], [0, 0, side * -0.04]);
      add(body, new THREE.CapsuleGeometry(bare ? 0.06 : 0.078, 0.34, 4, 10), bare ? skin : overall, [x * 1.15, 0.3, 0]);
      add(body, new THREE.CapsuleGeometry(0.07, 0.16, 4, 8), dark, [x * 1.15, 0.07, 0.05], [Math.PI / 2, 0, 0]);
      if (!bare && a.gear !== 'sixties') add(body, new THREE.CylinderGeometry(0.082, 0.082, 0.05, 12), silver, [x * 1.15, 0.36, 0]);
    }

    // ---- Torso and outerwear.
    const bulky = a.gear === 'parka' ? 1.22 : 1;
    add(body, new THREE.CapsuleGeometry(0.19 * bulky, 0.34, 6, 14), a.gear === 'parka' ? hi : overall, [0, 1.18, 0]).scale.set(1, 1, 0.8);
    if (a.gear === 'vest' || a.gear === 'tropical') {
      const vest = add(body, new THREE.CylinderGeometry(0.2, 0.215, 0.5, 16, 1, true), hi, [0, 1.17, 0]); vest.scale.set(1, 1, 0.82); (vest.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      for (const y of [1.02, 1.14]) add(body, new THREE.CylinderGeometry(0.218, 0.22, 0.045, 16), silver, [0, y, 0]).scale.set(1, 1, 0.82);
      for (const x of [-0.11, 0.11]) add(body, new THREE.BoxGeometry(0.045, 0.3, 0.02), silver, [x, 1.3, 0.165]);
    } else if (a.gear === 'rain') {
      const cape = add(body, new THREE.CylinderGeometry(0.2, 0.42, 0.95, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#f2cf1d', roughness: 0.35, side: THREE.DoubleSide }), [0, 1.0, 0]); cape.scale.set(1, 1, 0.8);
      add(body, new THREE.SphereGeometry(0.165, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), cape.material as THREE.Material, [0, 1.67, -0.03], [-0.55, 0, 0]);
      add(body, new THREE.CylinderGeometry(0.405, 0.42, 0.05, 18), silver, [0, 0.62, 0]).scale.set(1, 1, 0.8);
    } else if (a.gear === 'parka') {
      for (const y of [1.0, 1.12]) add(body, new THREE.CylinderGeometry(0.245, 0.245, 0.04, 16), silver, [0, y, 0]).scale.set(1, 1, 0.82);
      add(body, new THREE.TorusGeometry(0.155, 0.05, 8, 18), s.material('#d8cdb8', { roughness: 1 }), [0, 1.66, 0.03], [0.25, 0, 0]);
      add(body, new THREE.SphereGeometry(0.162, 16, 10), hi, [0, 1.68, -0.085]);
    } else {
      add(body, new THREE.CylinderGeometry(0.2, 0.2, 0.045, 16), dark, [0, 0.98, 0]).scale.set(1, 1, 0.82);
      add(body, new THREE.BoxGeometry(0.05, 0.05, 0.02), silver, [0, 0.98, 0.165]);
    }

    // ---- Head: no face at all.
    add(body, new THREE.CylinderGeometry(0.055, 0.065, 0.1, 10), skin, [0, 1.49, 0]);
    add(body, new THREE.SphereGeometry(0.125, 20, 14), skin, [0, 1.65, 0]);
    if (a.gear === 'sixties') {
      add(body, new THREE.CylinderGeometry(0.135, 0.125, 0.07, 18), overall, [0, 1.76, 0]);
      add(body, new THREE.CylinderGeometry(0.15, 0.15, 0.015, 18, 1, false, -0.9, 1.8), dark, [0, 1.73, 0.07]);
      add(body, new THREE.CylinderGeometry(0.127, 0.127, 0.025, 18), dark, [0, 1.735, 0]);
    } else if (a.gear === 'tropical') {
      add(body, new THREE.SphereGeometry(0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), hi, [0, 1.67, 0]);
      add(body, new THREE.CylinderGeometry(0.13, 0.13, 0.012, 16, 1, false, -0.8, 1.6), hi, [0, 1.7, 0.08]);
    }
    // Ear defenders.
    const cup = s.material(mood.cheer > 0.5 ? '#d8282c' : '#2c3036', { roughness: 0.5 });
    const dy = a.defenders === 'on' ? 1.65 : a.defenders === 'up' ? 1.75 : 1.47;
    const dz = a.defenders === 'neck' ? 0.03 : 0;
    const spread = a.defenders === 'on' ? 0.135 : a.defenders === 'up' ? 0.12 : 0.1;
    const hoodUp = a.gear === 'rain' || a.gear === 'parka';
    for (const side of [-1, 1]) add(body, new THREE.SphereGeometry(0.058, 12, 8), cup, [side * (spread + (hoodUp && a.defenders === 'on' ? 0.05 : 0)), dy + (a.defenders === 'up' ? 0.04 : 0), dz], [0, 0, 0]).scale.set(0.6, 1.15, 1);
    const band = add(body, new THREE.TorusGeometry(spread + (hoodUp && a.defenders === 'on' ? 0.05 : 0), 0.012, 6, 18, Math.PI), dark, [0, dy + (a.defenders === 'up' ? 0.04 : 0), dz]);
    if (a.defenders === 'neck') band.rotation.x = Math.PI / 2 + 0.3;

    // ---- Arms: shoulder and elbow pivots so the signal can move.
    const lit = a.wands !== 'paddles';
    const tint = { orange: '#ff8a1e', red: '#ff3320', green: '#3fe06a', white: '#eaf4ff', paddles: '#f5761a', torches: '#ffe27a' }[a.wands];
    const glow = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: lit ? mix(1.3, 3.2, dusk) : 0.15, roughness: 0.4 });
    const sleeve = a.gear === 'parka' ? hi : a.gear === 'rain' ? new THREE.MeshStandardMaterial({ color: '#f2cf1d', roughness: 0.35 }) : a.gear === 'tropical' ? skin : overall;
    const limb = 0.29, thick = 0.058 * bulky;
    const arms = ([1, -1] as const).map((side) => {
      const pose = side === 1 ? POSES[a.signal].r : POSES[a.signal].l;
      const jitter = (random() - 0.5) * 0.12;
      const shoulder = new THREE.Group(); shoulder.position.set(side * 0.235 * bulky, 1.4, 0); body.add(shoulder);
      add(shoulder, new THREE.SphereGeometry(thick * 1.25, 10, 8), a.gear === 'tropical' ? hi : sleeve, [0, 0, 0]);
      add(shoulder, new THREE.CapsuleGeometry(thick, limb - thick, 4, 10), sleeve, [0, -limb / 2, 0]);
      const elbow = new THREE.Group(); elbow.position.set(0, -limb, 0); shoulder.add(elbow);
      add(elbow, new THREE.CapsuleGeometry(thick * 0.9, limb - thick, 4, 10), sleeve, [0, -limb / 2, 0]);
      add(elbow, new THREE.SphereGeometry(0.055, 10, 8), a.gear === 'parka' ? dark : skin, [0, -limb - 0.03, 0]);
      // The wand continues the line of the forearm.
      const wy = -limb - 0.04;
      if (a.wands === 'paddles') {
        add(elbow, new THREE.CylinderGeometry(0.018, 0.018, 0.2, 8), dark, [0, wy - 0.1, 0]);
        add(elbow, new THREE.CylinderGeometry(0.17, 0.17, 0.02, 20), glow, [0, wy - 0.36, 0], [Math.PI / 2, 0, 0]);
        add(elbow, new THREE.CylinderGeometry(0.1, 0.1, 0.024, 16), s.material('#f2e23a'), [0, wy - 0.36, 0], [Math.PI / 2, 0, 0]);
      } else if (a.wands === 'torches') {
        add(elbow, new THREE.CylinderGeometry(0.028, 0.028, 0.22, 10), s.material('#d5d9db', { metalness: 0.9, roughness: 0.2 }), [0, wy - 0.08, 0]);
        add(elbow, new THREE.CylinderGeometry(0.055, 0.03, 0.08, 12), s.material('#d5d9db', { metalness: 0.9, roughness: 0.2 }), [0, wy - 0.22, 0]);
        add(elbow, new THREE.CylinderGeometry(0.05, 0.05, 0.012, 12), glow, [0, wy - 0.265, 0]);
        const beam = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 14, 1, true), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
        beam.position.set(0, wy - 0.72, 0); elbow.add(beam);
      } else {
        add(elbow, new THREE.CylinderGeometry(0.024, 0.024, 0.14, 8), dark, [0, wy - 0.04, 0]);
        add(elbow, new THREE.CylinderGeometry(0.02, 0.036, 0.42, 12), glow, [0, wy - 0.32, 0]);
        add(elbow, new THREE.SphereGeometry(0.02, 8, 6), glow, [0, wy - 0.53, 0]);
        const halo = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.4, 4, 10), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.12 + dusk * 0.12, depthWrite: false }));
        halo.position.set(0, wy - 0.32, 0); elbow.add(halo);
      }
      const A = pose[0] + jitter, B = pose[1] + jitter;
      const set = (upper: number, fore: number, forward = 0) => { shoulder.rotation.set(-forward, 0, side * upper); elbow.rotation.set(0, 0, side * (fore - upper)); };
      set(A, B, a.signal === 'slow' ? 0.35 : a.signal === 'rest' ? 0 : 0.12);
      return { side, A, B, set };
    });

    // A slight lean and turn so the figure is not a mannequin.
    body.scale.setScalar(build);
    const lean = a.signal === 'goodbye' ? 0.06 : a.signal === 'turn' ? -0.05 : 0;
    body.rotation.z = lean;

    // ---- Who it is for.
    if (a.audience === 'aircraft') {
      const tyre = s.material('#1b1c1e', { roughness: 0.9 }), leg = s.material('#dcdfe0', { metalness: 0.5, roughness: 0.35 });
      const gx = -1.0 - random() * 0.3, gz = 1.7 + random() * 0.4;
      for (const dx of [-0.24, 0.24]) { const w = s.cylinder(0.38, 0.38, 0.2, [gx + dx, 0.38, gz], tyre, 20); w.rotation.z = Math.PI / 2; const h = s.cylinder(0.2, 0.2, 0.22, [gx + dx, 0.38, gz], leg, 14); h.rotation.z = Math.PI / 2; }
      s.cylinder(0.04, 0.04, 0.5, [gx, 0.38, gz], leg, 8).rotation.z = Math.PI / 2;
      s.cylinder(0.08, 0.1, 1.2, [gx, 0.98, gz], leg, 12); s.cylinder(0.055, 0.055, 1.0, [gx, 2.0, gz], s.material('#f4f4f2', { metalness: 0.9, roughness: 0.15 }), 12);
      s.rod([gx, 1.1, gz], [gx, 2.3, gz + 0.6], 0.03, leg);
      s.ball([0.07, 0.07, 0.05], [gx, 1.75, gz - 0.09], new THREE.MeshStandardMaterial({ color: '#fff9e0', emissive: '#fff1c0', emissiveIntensity: 3 }), 10);
    } else if (a.audience === 'gull') {
      const white = s.material('#f1f1ec', { roughness: 0.8 }), grey = s.material('#9aa3aa', { roughness: 0.8 });
      const gx = -0.5 + random() * 0.6, gz = 1.5 + random() * 0.5;
      s.ball([0.09, 0.085, 0.17], [gx, 0.19, gz], white, 12); s.ball([0.075, 0.03, 0.15], [gx, 0.24, gz - 0.03], grey, 10);
      s.ball([0.055, 0.055, 0.06], [gx, 0.31, gz - 0.13], white, 10); s.rod([gx, 0.31, gz - 0.18], [gx, 0.29, gz - 0.26], 0.014, s.material('#f2b417'), 0.004);
      for (const dx of [-0.03, 0.03]) s.rod([gx + dx, 0.12, gz], [gx + dx, 0, gz], 0.006, s.material('#f2b417'));
    }

    // ---- At the feet.
    if (a.feet === 'stopbar') {
      const paint = s.material('#f0c419', { roughness: 0.9 });
      const line = s.box([0.16, 0.012, 1.9], [0, 0.006, 0.95], paint); line.castShadow = false;
      const bar = s.box([1.5, 0.012, 0.18], [0, 0.006, 0.05], paint); bar.castShadow = false;
      const stop = s.label('STOP', 0.9, 0.3, [0, 0.008, -0.4], '#f0c419', '#6f716f'); stop.rotation.x = -Math.PI / 2; stop.castShadow = false;
    } else if (a.feet === 'chocks') {
      const rubber = s.material('#f1bd16', { roughness: 0.9 });
      for (const [x, r] of [[0.62, 0.3], [0.9, -0.5]] as const) { const c = s.cylinder(0.12, 0.12, 0.42, [x, 0.09, 0.15 + r * 0.3], rubber, 3); c.rotation.set(Math.PI / 2, 0, 0); c.rotation.y = r; }
      s.tube([[0.62, 0.1, 0.25], [0.75, 0.02, 0.5], [0.9, 0.1, 0.0]], 0.012, dark);
      const orange = s.material('#f0641e');
      s.cylinder(0.03, 0.14, 0.5, [-0.7, 0.29, 0.2], orange, 12); s.box([0.36, 0.035, 0.36], [-0.7, 0.02, 0.2], orange); s.cylinder(0.073, 0.094, 0.1, [-0.7, 0.32, 0.2], silver, 12);
    } else if (a.feet === 'flask') {
      const bag = s.ball([0.28, 0.15, 0.17], [-0.62, 0.15, 0.1], s.material('#3c4a3a', { roughness: 0.95 }), 14); bag.rotation.y = 0.4;
      s.tube([[-0.8, 0.26, 0.1], [-0.62, 0.38, 0.12], [-0.44, 0.26, 0.14]], 0.014, dark);
      s.cylinder(0.045, 0.045, 0.26, [-0.3, 0.13, 0.32], s.material('#b23a2a', { metalness: 0.4 }), 12); s.cylinder(0.05, 0.05, 0.06, [-0.3, 0.29, 0.32], s.material('#d5d9db', { metalness: 0.8, roughness: 0.3 }), 12);
    }

    const phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        const e = mix(0.25, 1, mood.energy), t = time * mix(1.6, 5, mood.energy) + phase;
        for (const arm of arms) {
          const w = Math.sin(t), k = arm.side;
          if (a.signal === 'ahead') arm.set(arm.A, arm.B + (w * 0.5 + 0.2) * 0.75 * e, 0.12);
          else if (a.signal === 'turn') { if (k === -1) arm.set(arm.A, arm.B + (w * 0.5 + 0.2) * 0.75 * e, 0.12); }
          else if (a.signal === 'slow') arm.set(arm.A + w * 0.22 * e, arm.B + w * 0.3 * e, 0.35);
          else if (a.signal === 'goodbye') { if (k === 1) arm.set(arm.A + w * 0.3 * e, arm.B + w * 0.55 * e, 0.12); }
          else if (a.signal === 'stop') arm.set(arm.A + Math.sin(t * 0.5) * 0.03 * e, arm.B, 0.12);
          else if (a.signal === 'bay') arm.set(arm.A, arm.B + Math.sin(t * 0.5) * 0.04 * e, 0.12);
        }
        body.rotation.z = lean + Math.sin(t * 0.5) * 0.012 * e;
      },
    });
  },
});
