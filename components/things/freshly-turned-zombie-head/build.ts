import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { HEAD, at, brow, ears, eye, hairCap, mouth, nose, parts, shoulders, skin } from './head';

const WHO = {
  nurse: 'A night-shift nurse in pale scrubs with a starched white cap and a tidy bun.',
  trucker: 'A long-haul trucker in a foam cap and plaid shirt, with a moustache.',
  prom: 'A prom queen with big blonde hair, a tiara and a pink strapless dress.',
  grandfather: 'A grandfather, bald with white tufts, bushy brows and a green cardigan.',
  mallcop: 'A mall security guard in a peaked cap and a dark uniform shirt.',
  jogger: 'A morning jogger in a sweatband and a bright vest.',
} as const;

/** Object3D transforms are read-only properties, so copy into them rather than assigning. */
function setup<T extends THREE.Object3D>(node: T, to: { position?: THREE.Vector3; rotation?: THREE.Euler; scale?: THREE.Vector3 }): T {
  if (to.position) node.position.copy(to.position);
  if (to.rotation) node.rotation.copy(to.rotation);
  if (to.scale) node.scale.copy(to.scale);
  return node;
}

export default defineThing({
  questions: {
    who: choice('Who were they an hour ago?', WHO),
    expression: choice('What is the face doing?', {
      confused: 'Confused: head cocked, one brow up, as if trying to remember a word.',
      hungry: 'Hungry: brows down, eyes wide, lips pulled back from the teeth.',
      sad: 'Sad: brows lifted in the middle, mouth turned down, looking at the floor.',
      slack: 'Slack: lids heavy, head lolling to one side, nobody home.',
    }),
    bite: choice('Where is the bite?', {
      neck: 'On the side of the neck.',
      cheek: 'On the cheek.',
      shoulder: 'Through the clothes on the shoulder.',
      forehead: 'On the forehead, improbably.',
      ear: 'One ear is simply gone.',
    }),
    wears: choice('What are they still wearing?', {
      nothing: 'Nothing extra.',
      glasses: 'Glasses knocked askew.',
      badge: 'A name badge pinned to the chest.',
      curlers: 'Pink hair curlers.',
      headphones: 'Headphones, music presumably still playing.',
    }),
    jaw: noul('Is the jaw hanging open?'),
    eyes: choice('How are the eyes?', {
      clouded: 'Both clouded over, milky.',
      one: 'One clouded, one still clear and human.',
      rolled: 'Rolled up so mostly white shows.',
      pinned: 'Pin-prick pupils locked on something.',
    }),
    turned: score('How far along is the change?', ['Minutes: still pink, just pale', 'An hour: grey', 'By morning: grey-green with dark veins']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const g = new THREE.Group();
    g.scale.setScalar(HEAD);
    s.root.add(g);
    const body = parts(g);
    const headGroup = new THREE.Group();
    g.add(headGroup);
    const f = parts(headGroup);

    const living = new THREE.Color(a.who === 'trucker' ? '#c99a7c' : a.who === 'grandfather' ? '#d6b3a0' : '#d2a98f');
    const tone = living.clone().lerp(new THREE.Color('#a3aaa2'), Math.min(1, a.turned * 1.7 + 0.25));
    if (a.turned > 0.55) tone.lerp(new THREE.Color('#84977a'), (a.turned - 0.55) * 1.3);
    const fleshM = s.material(tone, { roughness: 0.7 });
    const lidM = s.material(tone.clone().multiplyScalar(0.8), { roughness: 0.7 });
    const lipM = s.material(a.who === 'prom' ? '#b0446a' : tone.clone().lerp(new THREE.Color('#6b5560'), 0.55));
    const dark = s.material('#1c1214', { roughness: 0.8 });
    const blood = s.material('#6e1219', { roughness: 0.35 });
    const gore = s.material('#3b0a0f', { roughness: 0.5 });
    const teethM = s.material(mix(0.2, 1, 1 - mood.wear) > 0.5 ? '#e9e3cf' : '#cfc39a');

    const expr = {
      confused: { browL: 0.9, browR: -0.5, lid: 0.22, curve: -0.25, jaw: 0.14, rx: 0, rz: 0.24, look: [0.35, 0.1] },
      hungry: { browL: -1.1, browR: -1.1, lid: 0.02, curve: 0.5, jaw: 0.5, rx: 0.16, rz: -0.05, look: [0, -0.05] },
      sad: { browL: 1.2, browR: 1.2, lid: 0.42, curve: -1.2, jaw: 0, rx: 0.22, rz: 0.08, look: [0.1, -0.4] },
      slack: { browL: 0.1, browR: 0.2, lid: 0.5, curve: -0.2, jaw: 0.3, rx: 0.05, rz: -0.32, look: [-0.25, -0.2] },
    }[a.expression];
    const jaw = a.jaw ? Math.max(0.8, expr.jaw) : expr.jaw;

    // Skull, with a torn patch where a cheek bite went in.
    f.add(new THREE.Mesh(skin({ jaw }), fleshM));
    nose(f, fleshM, a.who === 'grandfather' || a.who === 'trucker' ? 1.2 : 0.95, jaw * 0.2);
    ears(f, fleshM, a.who === 'grandfather' ? 1.25 : 1, a.bite === 'ear' ? 1 : 0);

    const clouded = { white: s.material('#dfe3dc', { roughness: 0.25 }), iris: s.material('#b6c4c6'), pupil: s.material('#93a0a3') };
    const clear = { white: s.material('#ece8dc', { roughness: 0.25 }), iris: s.material(a.who === 'prom' ? '#3f7fb5' : '#5b3a1e'), pupil: s.material('#060606') };
    const shot = { white: s.material('#e4cfc8', { roughness: 0.25 }), iris: s.material('#9aa88a'), pupil: s.material('#060606') };
    const eyeballs: THREE.Group[] = [];
    for (const side of [-1, 1] as const) {
      const set = a.eyes === 'pinned' ? shot : a.eyes === 'one' && side === -1 ? clear : clouded;
      const look: [number, number] = a.eyes === 'rolled' ? [side * 0.1, 0.95] : [expr.look[0] + (side === 1 ? (random() - 0.5) * 0.3 * a.turned : 0), expr.look[1]];
      eyeballs.push(eye(f, { side, lid: a.eyes === 'rolled' ? Math.min(expr.lid, 0.3) : expr.lid + (side === 1 && a.expression === 'slack' ? 0.2 : 0), ...set, lidMaterial: lidM, look, pupilSize: a.eyes === 'pinned' ? 0.1 : 0.27 }));
      // Bruised hollows under the eyes.
      const under = f.ball([0.17, 0.05, 0.03], at(side * 0.33, -0.04, 0, 0.005), lidM);
      under.rotation.z = side * -0.15;
    }
    mouth(f, { jaw, curve: expr.curve, lip: lipM, dark, teeth: teethM, width: a.expression === 'hungry' ? 0.31 : 0.26 });

    // Who they were: hair, hat and clothes.
    const hairTint = { nurse: '#5b3a24', trucker: '#3a2c22', prom: '#e3c467', grandfather: '#e9e7df', mallcop: '#1f1b19', jogger: '#2a1d16' }[a.who];
    const hairM = s.material(hairTint, { roughness: 0.85 });
    const browM = a.who === 'prom' ? s.material('#8a6a3a') : hairM;
    brow(f, -1, browM, expr.browL, a.who === 'grandfather' ? 0.055 : 0.034);
    brow(f, 1, browM, expr.browR, a.who === 'grandfather' ? 0.055 : 0.034);
    const hat = a.wears !== 'curlers';
    const moustache = () => f.tube([at(-0.25, -0.4, 0, 0.04), at(-0.1, -0.33, 0, 0.06), at(0.1, -0.33, 0, 0.06), at(0.25, -0.4, 0, 0.04)], 0.05, hairM);
    let cloth: THREE.Material, top: THREE.Material;
    const collar = (m: THREE.Material) => { const c = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 8, 24), m); c.rotation.x = Math.PI / 2 - 0.15; c.position.set(0, -1.6, -0.1); body.add(c); };
    switch (a.who) {
      case 'nurse': {
        cloth = top = s.material('#a9cfd6');
        headGroup.add(hairCap(hairM, 1.42, -0.56, 0.05));
        f.ball([0.26, 0.24, 0.24], [0, 0.25, -1.08], hairM);
        if (hat) {
          const white = s.material('#f6f4ee');
          const cap = f.add(new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.42, 0.34, 20, 1, false, -1.6, 3.2), white));
          cap.position.set(0, 1.02, 0.12); cap.rotation.set(-0.25, 0, 0.12 + (random() - 0.5) * 0.3);
          const red = s.material('#c22a2a');
          const cross = new THREE.Group();
          cross.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.03), red), new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.03), red));
          cross.position.set(0, 0, 0.5); cap.add(cross);
        }
        collar(s.material('#8fbcc4'));
        break;
      }
      case 'trucker': {
        cloth = top = s.material('#a23a2c');
        headGroup.add(hairCap(hairM, 1.5, -0.55, 0.025));
        moustache();
        f.ball([0.42, 0.3, 0.12], at(0, -0.72, jaw, -0.05), s.material(tone.clone().lerp(new THREE.Color('#4a4038'), 0.4), { roughness: 0.95 }));
        if (hat) {
          const capM = s.material('#2f5e3a'), front = s.material('#efe9d6');
          const dome = hairCap(capM, 1.12, -0.12, 0.12); headGroup.add(dome);
          const panel = hairCap(front, 0.75, 0.62, 0.135); headGroup.add(panel);
          const bill = f.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 24, 1, false, -1.57, 3.14), capM));
          bill.scale.set(1, 1, 1.25); bill.position.set(0, 0.56, 0.72); bill.rotation.x = 0.12;
          dome.rotation.z = panel.rotation.z = (random() - 0.5) * 0.2;
        }
        collar(s.material('#7d2b21'));
        for (let i = -3; i <= 3; i++) body.add(setup(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 1.3), s.material('#3a2320')), { position: new THREE.Vector3(i * 0.48, -2.43, -0.12) }));
        break;
      }
      case 'prom': {
        cloth = s.material('#e58fb4', { roughness: 0.4 }); top = fleshM;
        headGroup.add(hairCap(hairM, 1.5, -0.55, 0.2));
        for (const sx of [-1, 1]) f.ball([0.32, 0.85, 0.42], [sx * 0.8, -0.65, -0.28], hairM);
        f.ball([0.7, 0.45, 0.5], [0, 0.95, -0.25], hairM);
        if (hat) {
          const gold = s.material('#e9c64a', { metalness: 0.7, roughness: 0.3, emissive: '#7a5a10', emissiveIntensity: 0.4 });
          const tiara = new THREE.Group();
          tiara.add(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 6, 24, Math.PI), gold));
          for (let i = -2; i <= 2; i++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.34 - Math.abs(i) * 0.08, 6), gold);
            const ang = Math.PI / 2 + i * 0.36;
            spike.position.set(Math.cos(ang) * 0.62, Math.sin(ang) * 0.62 + 0.12, 0);
            spike.rotation.z = ang - Math.PI / 2;
            tiara.add(spike);
          }
          tiara.position.set(0.08, 0.72, 0.3); tiara.rotation.set(-0.5, 0, -0.3 - random() * 0.25);
          f.add(tiara);
        }
        // A wrist corsage pinned to the dress instead, slightly crushed.
        const petal = s.material('#f6f1e6'), leaf = s.material('#5d8a4a');
        for (let i = 0; i < 6; i++) body.ball([0.13, 0.11, 0.1], [-0.72 + Math.cos(i * 1.05) * 0.14, -2.12 + Math.sin(i * 1.05) * 0.12, 0.62 + (i % 2) * 0.03], petal);
        body.ball([0.09, 0.09, 0.1], [-0.72, -2.12, 0.7], s.material('#e9c64a'));
        body.ball([0.2, 0.07, 0.05], [-0.5, -2.28, 0.66], leaf).rotation.z = -0.6;
        break;
      }
      case 'grandfather': {
        cloth = top = s.material('#5d7353');
        for (const sx of [-1, 1]) f.ball([0.13, 0.26, 0.42], [sx * 0.74, 0.22, -0.32], hairM);
        f.ball([0.6, 0.25, 0.2], [0, 0.05, -0.92], hairM);
        moustache();
        collar(s.material('#e9e4d4'));
        body.add(setup(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.3), s.material('#e9e4d4')), { position: new THREE.Vector3(0, -2.2, 0.48) }));
        break;
      }
      case 'mallcop': {
        cloth = top = s.material('#3c4658');
        headGroup.add(hairCap(hairM, 1.45, -0.55, 0.03));
        moustache();
        if (hat) {
          const navy = s.material('#1f2738'), gold = s.material('#d9b441', { metalness: 0.7, roughness: 0.3 });
          const cap = new THREE.Group();
          cap.add(setup(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.74, 0.34, 24), navy), { position: new THREE.Vector3(0, 0.2, 0) }));
          cap.add(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.76, 0.16, 24), s.material('#10141c')));
          const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.035, 24, 1, false, -1.3, 2.6), s.material('#0c0c0e', { roughness: 0.25 }));
          visor.position.set(0, -0.08, 0.42); visor.rotation.x = 0.22; cap.add(visor);
          cap.add(setup(new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), gold), { position: new THREE.Vector3(0, 0.2, 0.84) }));
          cap.position.set(0, 0.82, 0.02); cap.rotation.set(-0.12, 0, (random() - 0.3) * 0.35);
          f.add(cap);
        }
        collar(s.material('#2c3444'));
        for (const sx of [-1, 1]) body.add(setup(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.22), s.material('#1f2738')), { position: new THREE.Vector3(sx * 1.05, -1.72, -0.1), rotation: new THREE.Euler(0, 0, sx * -0.42) }));
        break;
      }
      default: {
        cloth = s.material('#e7d23a'); top = fleshM;
        headGroup.add(hairCap(hairM, 1.42, -0.56, 0.05));
        const tail = f.ball([0.16, 0.5, 0.18], [0, 0.1, -1.2], hairM); tail.rotation.x = 0.5;
        if (hat) {
          const band = f.add(new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.09, 8, 28), s.material('#e23b3b')));
          band.rotation.x = Math.PI / 2 - 0.2; band.scale.set(1, 1.12, 1); band.position.set(0, 0.5, -0.02);
        }
        for (const sx of [-1, 1]) body.add(setup(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.3), cloth), { position: new THREE.Vector3(sx * 0.72, -1.83, 0.02), rotation: new THREE.Euler(0, 0, sx * 0.5) }));
      }
    }
    shoulders(body, fleshM, top, cloth);

    // The bite: a dark torn patch ringed by tooth marks, with a run of blood.
    const wound = (host: ReturnType<typeof parts>, where: THREE.Vector3, normal: THREE.Vector3, size = 1) => {
      const w = new THREE.Group();
      w.position.copy(where);
      w.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
      w.add(setup(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), gore), { scale: new THREE.Vector3(0.2 * size, 0.15 * size, 0.035) }));
      w.add(setup(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), blood), { scale: new THREE.Vector3(0.27 * size, 0.21 * size, 0.018) }));
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.028 * size, 6, 5), dark);
        dot.position.set(Math.cos(ang) * 0.25 * size, Math.sin(ang) * 0.19 * size, 0.012);
        if (Math.abs(Math.cos(ang)) < 0.93) w.add(dot);
      }
      host.add(w);
      const runs = 1 + Math.round((1 - mood.cheer) * 3);
      for (let i = 0; i < runs; i++) {
        const start = where.clone().add(new THREE.Vector3((random() - 0.5) * 0.25 * size, -0.1, 0)).addScaledVector(normal, 0.015);
        const len = 0.25 + random() * 0.5;
        host.tube([start, start.clone().add(new THREE.Vector3(0, -len * 0.5, 0.01)), start.clone().add(new THREE.Vector3((random() - 0.5) * 0.05, -len, 0))], 0.022, blood);
      }
    };
    if (a.bite === 'neck') wound(body, new THREE.Vector3(0.3, -1.15, 0.19), new THREE.Vector3(0.7, 0.05, 0.7), 0.95);
    else if (a.bite === 'cheek') { const p = at(0.52, -0.3, jaw * 0.3, 0.012); wound(f, p, new THREE.Vector3(0.75, -0.1, 0.65), 0.9); }
    else if (a.bite === 'shoulder') {
      const p = new THREE.Vector3(0.97, -1.62, 0.17), nrm = new THREE.Vector3(0.32, 0.75, 0.58);
      const patch = body.ball([0.36, 0.3, 0.05], p.clone().addScaledVector(nrm.clone().normalize(), -0.01), fleshM);
      patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm.clone().normalize());
      wound(body, p.addScaledVector(nrm.clone().normalize(), 0.03), nrm, 1.1);
    } else if (a.bite === 'forehead') { const p = at(0.2, 0.5, 0, 0.012); wound(f, p, new THREE.Vector3(0.2, 0.35, 0.9), 0.8); }
    else {
      const p = new THREE.Vector3(0.78, 0, -0.06);
      wound(f, p, new THREE.Vector3(1, 0, 0.12), 0.75);
      f.ball([0.05, 0.07, 0.09], [0.82, 0.12, -0.1], fleshM);
    }

    // Dark veins creeping in once the change is well along.
    if (a.turned > 0.45) {
      const veinM = s.material('#3f4a4c', { roughness: 0.6 });
      const count = Math.round((a.turned - 0.45) * 14);
      for (let i = 0; i < count; i++) {
        const sx = random() < 0.5 ? -1 : 1;
        let x = sx * (0.45 + random() * 0.25), y = -0.55 + random() * 1.0;
        const pts = [at(x, y, jaw * 0.3, 0.004)];
        for (let k = 0; k < 3; k++) { x -= sx * (0.05 + random() * 0.08); y += (random() - 0.4) * 0.2; pts.push(at(x, y, jaw * 0.3, 0.004)); }
        f.tube(pts, 0.012, veinM);
      }
    }

    // What they still wear.
    if (a.wears === 'glasses') {
      const frame = s.material('#1b1b1f', { roughness: 0.4 });
      const glasses = new THREE.Group();
      for (const sx of [-1, 1]) {
        glasses.add(setup(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 20), frame), { position: new THREE.Vector3(sx * 0.27, 0, 0) }));
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 6), frame);
        arm.rotation.x = Math.PI / 2; arm.position.set(sx * 0.5, 0.02, -0.42); arm.rotation.z = sx * -0.25;
        glasses.add(arm);
      }
      glasses.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.025), frame));
      const lensCrack = mood.wear > 0.5;
      if (lensCrack) glasses.add(setup(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.01), s.material('#e9eef0')), { position: new THREE.Vector3(0.27, 0, 0.01), rotation: new THREE.Euler(0, 0, 0.9) }));
      const e = at(0.33, 0.1);
      glasses.position.set(0.03, 0.02, e.z + 0.13);
      glasses.rotation.z = (random() < 0.5 ? -1 : 1) * (0.28 + random() * 0.15);
      f.add(glasses);
    } else if (a.wears === 'badge') {
      const text = { nurse: 'BETTY  RN', trucker: 'EARL', prom: 'QUEEN', grandfather: 'HI: WALT', mallcop: 'SECURITY', jogger: 'RACE 041' }[a.who];
      const tag = s.label(text, 0.75, 0.3, [0, 0, 0], '#1c2733', a.who === 'mallcop' ? '#e3c765' : '#f6f2e4');
      g.add(tag);
      tag.position.set(-0.78, -2.3, 0.62); tag.rotation.set(-0.05, -0.38, 0.1 + (random() - 0.5) * 0.3);
    } else if (a.wears === 'curlers') {
      const pink = s.material('#ef86ae', { roughness: 0.5 });
      const d = new THREE.Vector3();
      for (let row = 0; row < 3; row++) for (let i = -1; i <= 1; i++) {
        if (random() < 0.12 * (1 + mood.wear * 2)) continue;
        d.set(i * 0.42, 0.75 - Math.abs(i) * 0.12, 0.45 - row * 0.5).normalize();
        const p = at(d.x, d.y, 0, 0);
        if (d.z < 0) { p.z = d.z * 0.95 * 1.06; }
        const roller = f.add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.36, 10), pink));
        roller.position.copy(p).addScaledVector(d, a.who === 'prom' ? 0.28 : 0.14);
        roller.rotation.set((random() - 0.5) * 0.3, (random() - 0.5) * 0.3, Math.PI / 2 + i * 0.5);
      }
    } else if (a.wears === 'headphones') {
      const plastic = s.material('#23262b', { roughness: 0.4 }), pad = s.material('#d9482f');
      const set = new THREE.Group();
      const lift = a.who === 'prom' ? 0.22 : a.who === 'mallcop' || a.who === 'trucker' ? 0.2 : 0.06;
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.93 + lift, 0.045, 6, 28, Math.PI), plastic);
      band.scale.y = 1.18; set.add(band);
      for (const sx of [-1, 1]) {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.2, 16), sx === 1 ? pad : plastic);
        cup.rotation.z = Math.PI / 2; cup.position.set(sx * (0.9 + lift * 0.4), -0.02, 0); set.add(cup);
      }
      set.position.set(0, 0.02, -0.08); set.rotation.z = (random() - 0.5) * 0.25; set.rotation.x = -0.1;
      f.add(set);
    }

    // Grime and old splashes when the scene is worn.
    const flecks = Math.round(mood.wear * 10);
    for (let i = 0; i < flecks; i++) {
      const p = at((random() - 0.5) * 1.1, -0.8 + random() * 1.2, jaw * 0.3, 0.004);
      f.ball([0.02 + random() * 0.05, 0.02 + random() * 0.04, 0.012], p, random() < 0.5 ? gore : blood, 6);
    }

    headGroup.rotation.set(expr.rx, (random() - 0.5) * 0.3, expr.rz);
    const rest = headGroup.rotation.clone();
    const energy = mood.energy, phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        const t = time * mix(0.5, 2.2, energy) + phase;
        const twitch = Math.max(0, Math.sin(t * 3.1) * Math.sin(t * 0.7) - 0.6) * 2.5;
        headGroup.rotation.set(rest.x + Math.sin(t * 0.8) * 0.04 * (0.3 + energy), rest.y + Math.sin(t * 0.5) * 0.1 * (0.3 + energy), rest.z + twitch * 0.18 * energy + Math.sin(t * 0.6) * 0.03);
        for (const ball of eyeballs) ball.rotation.y += Math.sin(t * 1.7 + ball.position.x * 9) * 0.002 * energy;
      },
    });
  },
});
