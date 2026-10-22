import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { HUMAN, faceEllipse, faceLine, headGeometry, paint, part, rod, tube, type HeadSpec } from './head';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export default defineThing({
  questions: {
    era: choice('What generation of dummy is it?', {
      seventies: '1970s: bare steel limb bones and joints with tan vinyl only on head, chest and pelvis.',
      modern: 'Modern instrumented: full yellow-tan vinyl flesh, black joints, a fat cable bundle trailing from its back.',
      child: 'A child-size dummy, small in the adult seat, feet not reaching the floor.',
      orange: 'A bright orange aerospace dummy with stencilled panels, built for ejection tests.',
    }),
    posture: choice('How is it sitting?', {
      upright: 'Upright and ready, hands on thighs, facing dead ahead.',
      slumped: 'Slumped forward against the harness after impact, head hanging, arms loose.',
      turned: 'Upright with the head turned sharply to one side.',
      thrown: 'Thrown back and sideways, head lolling over the seat edge, one arm flung out.',
    }),
    damage: choice('What damage does it show?', {
      pristine: 'Pristine, fresh from calibration.',
      scuffed: 'Grease-paint on forehead, nose and chin smeared and scuffed from contact.',
      cracked: 'Skull cap cracked and knocked askew.',
      forearm: 'One forearm missing at the elbow, wires hanging out.',
    }),
    seat: choice('What is it seated in?', {
      sled: 'A bare steel sled seat on rails, all tube and plate.',
      car: 'A cut-out car seat with headrest and a steering wheel on a column.',
      aircraft: 'A tall-backed aircraft seat with a yellow and black pull handle.',
    }),
    harness: choice('What harness holds it?', {
      red: 'A red four-point racing harness.', blue: 'Blue webbing straps.', grey: 'An ordinary grey lap-and-diagonal seat belt.', none: 'None; unrestrained.',
    }),
    number: choice('What is stencilled on its chest?', {
      test: 'A test number, like T-0417.', serial: 'A long serial number.', name: 'A nickname someone in the lab gave it.', target: 'Only a large calibration target.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const child = a.era === 'child';
    const k = child ? 0.62 : 1;
    const fleshHex = { seventies: '#d6a070', modern: '#e2b458', child: '#e6c08a', orange: '#f07820' }[a.era];
    const flesh = new THREE.MeshStandardMaterial({ color: new THREE.Color(fleshHex).lerp(new THREE.Color('#6a6258'), wear * 0.25), roughness: 0.55 + wear * 0.3 });
    const steel = new THREE.MeshStandardMaterial({ color: '#a9afb3', metalness: 0.8, roughness: 0.3 + wear * 0.35 });
    const frameM = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6d767c').lerp(new THREE.Color('#6a4a34'), wear * 0.5), metalness: 0.5, roughness: 0.5 });
    const rubber = new THREE.MeshStandardMaterial({ color: '#1b1c1e', roughness: 0.85 });
    const target = paint(128, 128, (c) => {
      c.fillStyle = '#f5cc1a'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill();
      c.fillStyle = '#111'; c.beginPath(); c.moveTo(64, 64); c.arc(64, 64, 62, 0, Math.PI / 2); c.fill();
      c.beginPath(); c.moveTo(64, 64); c.arc(64, 64, 62, Math.PI, Math.PI * 1.5); c.fill();
      c.strokeStyle = '#111'; c.lineWidth = 5; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.stroke();
    });
    const targetM = new THREE.MeshStandardMaterial({ map: target, roughness: 0.6, side: THREE.DoubleSide });
    const disc = (parent: THREE.Object3D, r: number, x: number, y: number, z: number, facing: 'x' | 'z', sign = 1) => {
      const m = part(parent, new THREE.CircleGeometry(r, 24), targetM, x, y, z);
      if (facing === 'x') m.rotation.y = sign * Math.PI / 2;
      m.rotation.z = random() * 0.6;
      m.castShadow = false;
      return m;
    };

    // Sled and seat.
    const seatY = 0.46;
    for (const side of [-1, 1]) {
      part(s.root, new THREE.BoxGeometry(0.05, 0.05, 1.36), steel, side * 0.3, 0.025, 0.14);
      part(s.root, new THREE.BoxGeometry(0.09, 0.05, 0.16), frameM, side * 0.3, 0.075, -0.25);
      part(s.root, new THREE.BoxGeometry(0.09, 0.05, 0.16), frameM, side * 0.3, 0.075, 0.5);
      rod(s.root, V(side * 0.26, 0.1, -0.25), V(side * 0.26, seatY, -0.17), 0.02, frameM);
      rod(s.root, V(side * 0.26, 0.1, 0.5), V(side * 0.26, seatY - 0.02, 0.3), 0.02, frameM);
      rod(s.root, V(side * 0.26, 0.1, -0.25), V(side * 0.26, seatY - 0.02, 0.3), 0.014, frameM);
    }
    for (let i = 0; i < 6; i++) part(s.root, new THREE.BoxGeometry(0.66, 0.012, 0.02), rubber, 0, 0.006, -0.46 + i * 0.24);
    part(s.root, new THREE.BoxGeometry(0.6, 0.02, 0.9), frameM, 0, 0.11, 0.13);
    const foot = part(s.root, new THREE.BoxGeometry(0.5, 0.015, 0.3), steel, 0, 0.16, 0.58); foot.rotation.x = -0.45;
    const cushion = a.seat === 'sled' ? frameM : new THREE.MeshStandardMaterial({ color: a.seat === 'car' ? '#3a3d44' : '#55604a', roughness: 0.9 });
    const thick = a.seat === 'sled' ? 0.02 : 0.09;
    part(s.root, new THREE.BoxGeometry(0.5, thick, 0.48), cushion, 0, seatY - thick / 2, 0.08);
    const back = new THREE.Group(); back.position.set(0, seatY, -0.16); back.rotation.x = -0.12; s.root.add(back);
    const backH = a.seat === 'aircraft' ? 0.95 : a.seat === 'car' ? 0.62 : 0.7;
    part(back, new THREE.BoxGeometry(0.48, backH, thick), cushion, 0, backH / 2, -thick / 2);
    if (a.seat === 'sled') {
      for (const side of [-1, 1]) part(back, new THREE.BoxGeometry(0.035, backH + 0.05, 0.035), steel, side * 0.25, backH / 2, -0.02);
      part(back, new THREE.BoxGeometry(0.54, 0.035, 0.035), steel, 0, backH + 0.02, -0.02);
      for (let i = 0; i < 3; i++) for (const side of [-1, 1]) { const hole = part(back, new THREE.CylinderGeometry(0.03, 0.03, 0.022, 14), rubber, side * 0.11, 0.15 + i * 0.2, -0.01); hole.rotation.x = Math.PI / 2; }
      for (const side of [-1, 1]) rod(s.root, V(side * 0.26, 0.1, -0.33), V(side * 0.25, seatY + 0.5, -0.24), 0.016, frameM);
    } else if (a.seat === 'car') {
      for (const side of [-1, 1]) rod(back, V(side * 0.07, backH, -0.045), V(side * 0.07, backH + 0.08, -0.045), 0.008, steel);
      part(back, new THREE.BoxGeometry(0.26, 0.17, 0.09), cushion, 0, backH + 0.15, -0.04);
      rod(s.root, V(0.0, 0.12, 0.72), V(0, seatY + 0.36, 0.44), 0.022, rubber);
      const wheel = part(s.root, new THREE.TorusGeometry(0.17, 0.016, 10, 36), rubber, 0, seatY + 0.37, 0.43); wheel.rotation.x = -0.9;
      for (let i = 0; i < 3; i++) { const spoke = part(s.root, new THREE.BoxGeometry(0.17, 0.02, 0.012), rubber, 0, seatY + 0.37, 0.43); spoke.rotation.set(-0.9, 0, 0); spoke.rotateZ(i * 2.094 + 0.52); spoke.translateX(0.085); }
    } else {
      part(back, new THREE.BoxGeometry(0.3, 0.2, 0.12), cushion, 0, backH - 0.08, 0.0);
      for (const side of [-1, 1]) part(back, new THREE.BoxGeometry(0.04, backH + 0.06, 0.12), frameM, side * 0.26, backH / 2, -0.03);
      const stripes = paint(64, 256, (c) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#111' : '#f5cc1a'; c.beginPath(); c.moveTo(0, i * 32 - 32); c.lineTo(64, i * 32); c.lineTo(64, i * 32 + 32); c.lineTo(0, i * 32); c.fill(); } });
      const handle = part(s.root, new THREE.TorusGeometry(0.06, 0.012, 8, 20, Math.PI), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6 }), 0, seatY + 0.02, 0.33);
      handle.rotation.x = -0.3;
    }

    // The dummy.
    const dummy = new THREE.Group(); dummy.position.set(0, seatY + (child ? 0.0 : 0), 0); dummy.scale.setScalar(k); s.root.add(dummy);
    const bare = a.era === 'seventies';
    const limb = (parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, r: number) => {
      if (bare) {
        rod(parent, from, to, 0.016, steel);
        const mid = from.clone().lerp(to, 0.5), d = to.clone().sub(from);
        const pad = rod(parent, mid.clone().addScaledVector(d, -0.22), mid.clone().addScaledVector(d, 0.22), r * 0.8, flesh, 12); pad.scale.z = 0.7;
      } else {
        const d = to.clone().sub(from);
        const m = part(parent, new THREE.CapsuleGeometry(r, Math.max(0.01, d.length() - r), 4, 12), flesh);
        m.position.copy(from).addScaledVector(d, 0.5);
        m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
      }
    };
    const joint = (parent: THREE.Object3D, at: THREE.Vector3, r: number, side: number) => {
      part(parent, new THREE.SphereGeometry(r, 14, 10), bare ? steel : rubber, at.x, at.y, at.z);
      disc(parent, r * 0.85, at.x + side * (r + 0.004), at.y, at.z, 'x', side);
    };
    // Pelvis and legs.
    const pelvis = part(dummy, new THREE.CapsuleGeometry(0.085, 0.14, 4, 12), flesh, 0, 0.09, 0); pelvis.rotation.z = Math.PI / 2; pelvis.scale.z = 1.25;
    const flail = a.posture === 'thrown' ? 1 : 0;
    for (const side of [-1, 1]) {
      const spread = side * (0.02 + flail * random() * 0.08);
      const hip = V(side * 0.09, 0.09, 0.06), knee = V(side * 0.1 + spread * 2, 0.1, 0.46);
      const ankle = child ? V(knee.x, -0.24, 0.56 + random() * 0.05) : V(knee.x + spread, -0.3, 0.56);
      limb(dummy, hip, knee, 0.065);
      joint(dummy, knee, 0.055, side);
      limb(dummy, knee, ankle, 0.048);
      part(dummy, new THREE.SphereGeometry(0.035, 10, 8), bare ? steel : rubber, ankle.x, ankle.y, ankle.z);
      const shoe = part(dummy, new THREE.BoxGeometry(0.09, 0.06, 0.24), rubber, ankle.x, ankle.y - 0.045, ankle.z + 0.07); shoe.rotation.x = -0.45;
      disc(dummy, 0.04, side * 0.185, 0.1, 0.03, 'x', side);
    }
    // Torso.
    const torso = new THREE.Group(); torso.position.set(0, 0.1, -0.02); dummy.add(torso);
    const lean = { upright: -0.1, slumped: 0.78, turned: -0.1, thrown: -0.32 }[a.posture];
    torso.rotation.x = lean; torso.rotation.z = a.posture === 'thrown' ? 0.3 : a.posture === 'slumped' ? (random() - 0.5) * 0.2 : 0;
    part(torso, new THREE.CylinderGeometry(0.1, 0.11, 0.16, 20), rubber, 0, 0.1, 0);
    for (let i = 0; i < 3; i++) part(torso, new THREE.TorusGeometry(0.105, 0.008, 6, 24), rubber, 0, 0.05 + i * 0.05, 0).rotation.x = Math.PI / 2;
    const chest = part(torso, new THREE.SphereGeometry(1, 24, 16), flesh, 0, 0.31, 0); chest.scale.set(0.17, 0.165, 0.118);
    part(torso, new THREE.CylinderGeometry(0.024, 0.024, 0.42, 12), steel, 0, 0.42, 0).rotation.z = Math.PI / 2;
    // Chest marking.
    const text = { test: `T-${String(100 + Math.floor(random() * 9800)).padStart(4, '0')}`, serial: `H3-${50 + Math.floor(random() * 49)}M-${1000 + Math.floor(random() * 8999)}`, name: ['BUSTER', 'LARRY', 'VINCE', 'SIERRA SAM', 'OSCAR', 'DOLORES'][Math.floor(random() * 6)], target: '' }[a.number];
    if (text) {
      const lab = s.label(text, 0.19, 0.06, [0, 0, 0], '#161616', fleshHex);
      torso.add(lab); lab.position.set(0, 0.36, 0.113); lab.rotation.x = -0.2; lab.castShadow = false;
      disc(torso, 0.035, 0, 0.27, 0.119, 'z');
    } else disc(torso, 0.075, 0, 0.32, 0.12, 'z');
    // Harness, riding with the torso.
    if (a.harness !== 'none') {
      const web = new THREE.MeshStandardMaterial({ color: { red: '#c8281e', blue: '#2456a8', grey: '#6b6e72' }[a.harness], roughness: 0.8 });
      const strap = (from: THREE.Vector3, to: THREE.Vector3, parent: THREE.Object3D = torso) => { const m = rod(parent, from, to, 0.024, web, 8); m.scale.z = 0.18; m.scale.x = 1; return m; };
      if (a.harness === 'grey') {
        tube(torso, [V(0.15, 0.47, -0.04), V(0.11, 0.42, 0.1), V(0.0, 0.26, 0.135), V(-0.13, 0.08, 0.1), V(-0.16, 0.0, 0.0)], 0.014, web).scale.set(1, 1, 1);
      } else for (const side of [-1, 1]) {
        tube(torso, [V(side * 0.1, 0.5, -0.1), V(side * 0.1, 0.47, 0.03), V(side * 0.085, 0.4, 0.105), V(side * 0.05, 0.25, 0.132), V(0, 0.07, 0.115)], 0.014, web);
      }
      tube(dummy, [V(-0.22, 0.06, -0.05), V(-0.17, 0.15, 0.06), V(0, 0.17, 0.115), V(0.17, 0.15, 0.06), V(0.22, 0.06, -0.05)], 0.014, web);
      if (a.harness !== 'grey') { const buckle = part(dummy, new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), steel, 0, 0.17, 0.125); buckle.rotation.x = Math.PI / 2; void strap; }
    }
    // Arms.
    const lost = a.damage === 'forearm' ? (random() < 0.5 ? -1 : 1) : 0;
    for (const side of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(side * 0.215, 0.42, 0); torso.add(sh);
      part(sh, new THREE.SphereGeometry(0.058, 14, 10), bare ? steel : rubber);
      disc(sh, 0.045, side * 0.062, 0, 0, 'x', side);
      const out = a.posture === 'thrown' && side > 0;
      sh.rotation.x = a.posture === 'slumped' ? -lean + 0.25 + random() * 0.2 : out ? -0.4 : 0.12;
      sh.rotation.z = out ? 1.2 : side * (a.posture === 'slumped' ? 0.12 : 0.06);
      const elbow = V(0, -0.27, 0);
      limb(sh, V(0, -0.03, 0), elbow, 0.045);
      part(sh, new THREE.SphereGeometry(0.042, 12, 8), bare ? steel : rubber, 0, elbow.y, 0);
      disc(sh, 0.035, side * 0.046, elbow.y, 0, 'x', side);
      const fore = new THREE.Group(); fore.position.copy(elbow); sh.add(fore);
      fore.rotation.x = a.posture === 'slumped' ? -0.25 : out ? -0.5 : -1.3;
      if (side === lost) {
        const cols = ['#d8402c', '#f2c230', '#2f5fa8', '#e8e2d4'];
        for (let i = 0; i < 4; i++) tube(fore, [V(0, 0, 0), V((random() - 0.5) * 0.05, -0.06, (random() - 0.5) * 0.05), V((random() - 0.5) * 0.12, -0.1 - random() * 0.08, (random() - 0.5) * 0.1)], 0.004, new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.6 }));
        part(fore, new THREE.CylinderGeometry(0.02, 0.02, 0.03, 10), steel, 0, -0.03, 0);
      } else {
        limb(fore, V(0, -0.02, 0), V(0, -0.24, 0), 0.038);
        const hand = part(fore, new THREE.BoxGeometry(0.07, 0.1, 0.035), flesh, 0, -0.3, 0); hand.rotation.x = 0.2;
        part(fore, new THREE.SphereGeometry(0.03, 10, 8), bare ? steel : rubber, 0, -0.245, 0);
      }
    }
    // Neck and head.
    for (let i = 0; i < 5; i++) part(torso, new THREE.CylinderGeometry(0.046, 0.046, 0.016, 18), i % 2 ? steel : rubber, 0, 0.475 + i * 0.017, 0.005);
    const head = new THREE.Group(); head.position.set(0, 0.56, 0.005); torso.add(head);
    head.rotation.set(a.posture === 'slumped' ? 0.6 : a.posture === 'thrown' ? -0.35 : 0.05, a.posture === 'turned' ? (random() < 0.5 ? -0.9 : 0.9) : a.posture === 'thrown' ? 0.5 : 0, a.posture === 'thrown' ? 0.35 : a.posture === 'slumped' ? (random() - 0.5) * 0.4 : 0);
    const o: HeadSpec = { ...HUMAN, nose: 0.015, lips: 0.002, socket: 0.005, brow: 0.003, jaw: 0.34 };
    const hs = child ? 1.5 : 1.12;
    const W = 1024, Hc = 512;
    const faceMap = paint(W, Hc, (c) => {
      c.fillStyle = fleshHex; c.fillRect(0, 0, W, Hc);
      // Forehead target and seam lines.
      const quad = (X: number, Y: number, r: number) => {
        c.fillStyle = '#f5cc1a'; faceEllipse(c, o, X, Y, r, r); c.fill();
        c.fillStyle = '#111';
        faceLine(c, o, [[X, Y], [X + r, Y], [X + r * 0.7, Y + r * 0.7], [X, Y + r]]); c.closePath(); c.fill();
        faceLine(c, o, [[X, Y], [X - r, Y], [X - r * 0.7, Y - r * 0.7], [X, Y - r]]); c.closePath(); c.fill();
        c.strokeStyle = '#111'; c.lineWidth = 2; faceEllipse(c, o, X, Y, r, r); c.stroke();
      };
      quad(0, 0.062, 0.017);
      c.strokeStyle = 'rgba(40,30,20,0.55)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(0, Hc * 0.24); c.lineTo(W, Hc * 0.24); c.stroke();
      for (const side of [-1, 1]) { c.fillStyle = 'rgba(40,30,20,0.35)'; faceEllipse(c, o, side * o.eyeX, o.eyeY, 0.011, 0.005); c.fill(); }
      c.strokeStyle = 'rgba(40,30,20,0.5)'; c.lineWidth = 3; faceLine(c, o, [[-0.018, o.eyeY - 0.07], [0.018, o.eyeY - 0.07]]); c.stroke();
      if (a.damage === 'scuffed') {
        const dab = (X: number, Y: number, rx: number, ry: number, col: string) => {
          c.fillStyle = col; faceEllipse(c, o, X, Y, rx, ry); c.fill();
          c.strokeStyle = col; c.lineCap = 'round';
          for (let i = 0; i < 7; i++) { c.globalAlpha = 0.25 + random() * 0.4; c.lineWidth = 3 + random() * 10; const dx = (random() - 0.3) * 0.05, dy = (random() - 0.5) * 0.03; faceLine(c, o, [[X + (random() - 0.5) * rx, Y + (random() - 0.5) * ry], [X + dx, Y + dy - 0.015]]); c.stroke(); }
          c.globalAlpha = 1;
        };
        dab(0, 0.045, 0.03, 0.012, '#2a62c8'); dab(0, -0.02, 0.011, 0.014, '#d8281e'); dab(0, -0.088, 0.02, 0.011, '#2f9a4a');
        dab(-0.042, -0.02, 0.012, 0.014, '#e8a020'); dab(0.042, -0.02, 0.012, 0.014, '#e8a020');
      }
      if (a.damage === 'cracked') {
        c.strokeStyle = '#1a1512';
        for (let n = 0; n < 5; n++) { let x = random() * W * 0.5, y = Hc * 0.24; c.lineWidth = 2 + random() * 2; c.beginPath(); c.moveTo(x, y); for (let j = 0; j < 8; j++) { x += (random() - 0.5) * 50; y += (n % 2 ? 1 : -1) * (6 + random() * 14); c.lineTo(x, y); } c.stroke(); }
      }
      for (let i = 0; i < wear * 60; i++) { c.fillStyle = `rgba(40,36,30,${0.05 + random() * 0.12})`; c.beginPath(); c.arc(random() * W, random() * Hc, 4 + random() * 22, 0, 7); c.fill(); }
    });
    const faceM = new THREE.MeshStandardMaterial({ map: faceMap, roughness: 0.5 + wear * 0.3, side: THREE.DoubleSide });
    const hg = new THREE.Group(); hg.position.y = 0.105 * hs; hg.scale.setScalar(hs); head.add(hg);
    const capT = 0.77;
    part(hg, headGeometry(o, 0, Math.PI * 2, capT, Math.PI - capT), faceM);
    const cap = part(hg, headGeometry(o, 0, Math.PI * 2, 0, capT, 1.0), faceM);
    if (a.damage === 'cracked') { cap.position.set(0.006, 0.01, -0.012); cap.rotation.set(-0.16, 0.1, 0.1); part(hg, new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), steel, 0, 0.07, 0); }
    for (const side of [-1, 1]) { disc(hg, 0.022, side * 0.079, 0.03, 0, 'x', side); part(hg, new THREE.CylinderGeometry(0.007, 0.007, 0.006, 8), steel, side * 0.074, -0.02, -0.01).rotation.z = Math.PI / 2; }

    // Instrumentation.
    if (a.era === 'modern' || a.era === 'orange') {
      const cols = ['#1b1c1e', '#1b1c1e', '#d8402c', '#2f5fa8', '#e8e2d4'];
      for (let i = 0; i < 5; i++) {
        const off = (i - 2) * 0.012;
        tube(s.root, [V(off, seatY + 0.2 * k, -0.2), V(off * 2, seatY + 0.05, -0.32), V(off * 3 - 0.05, 0.14, -0.42 - i * 0.01), V(-0.2 + off * 4, 0.05, -0.5), V(-0.4 + off * 3, 0.012, -0.5 + i * 0.02)], 0.008, new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.7 }));
      }
      part(s.root, new THREE.BoxGeometry(0.16, 0.1, 0.12), new THREE.MeshStandardMaterial({ color: '#d8a020', roughness: 0.5 }), -0.16, 0.17, -0.2);
    }
    if (a.era === 'orange') for (const y of [0.2, 0.42]) { const st = s.label(y > 0.3 ? 'RESCUE' : 'NO STEP', 0.1, 0.03, [0, 0, 0], '#111', fleshHex); torso.add(st); st.position.set(-0.168, y - 0.02, 0.01); st.rotation.y = -Math.PI / 2; st.visible = y < 0.3; }

    let t = 0;
    const sway = mix(0.004, 0.03, mood.energy);
    const baseX = head.rotation.x, baseZ = torso.rotation.z;
    return s.finish({
      footprint: 0.6,
      update: (dt) => { t += dt * mix(1.5, 9, mood.energy); head.rotation.x = baseX + Math.sin(t) * sway * 2; torso.rotation.z = baseZ + Math.sin(t * 0.7) * sway * 0.5; },
    });
  },
});
