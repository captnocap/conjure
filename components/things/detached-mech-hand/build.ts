import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type V, add, ball, box, cyl, decal, group, hazard, paint, rod, stencil, tube } from './h';

const LIVERY = { olive: '#5f6d47', desert: '#b99b69', arctic: '#d6dbdd', navy: '#4c5b6c', hazard: '#d88a1f', crimson: '#8f302b' } as const;

export default defineThing({
  questions: {
    reason: choice('Why is the hand off its machine?', {
      repair: 'In for repair: on a wheeled yellow cradle, primer patches, cables tagged and tidy.',
      loss: 'Torn off in battle: a jagged scorched wrist, a finger sheared short, dumped on timbers over a tarp.',
      trophy: 'A trophy taken from an enemy: mounted on a dark plinth with a brass plaque and a rope in front.',
      spare: 'A new spare never fitted: still in its timber shipping frame, fingertips wrapped, red tags on.',
    }),
    palm: choice('What sits in the palm?', {
      nothing: 'Nothing; the open palm is its own statement.',
      sleeper: 'A mechanic curled up asleep in it, cap over their eyes.',
      cat: 'The hangar cat, curled tight.',
      nest: 'A bird nest with three pale eggs.',
      flowers: 'A bunch of flowers someone laid there.',
      helmet: 'A pilot helmet, set down carefully.',
      puddle: 'A pool of rainwater or leaked fluid, holding the light.',
    }),
    digits: choice('What kind of hand is it?', {
      three: 'Three thick claws and a thumb, an industrial grab.',
      four: 'Four fingers and a thumb, blunt and soldierly.',
      five: 'Five slender fingers, uncannily human.',
    }),
    curl: score('How are the fingers held?', ['Laid open flat', 'Gently cupped', 'Half curled', 'Closing into a fist']),
    livery: choice('What colour is its armour?', {
      olive: 'Flat olive drab.', desert: 'Sand tan.', arctic: 'Winter white-grey.', navy: 'Blue-grey.', hazard: 'Hazard orange.', crimson: 'Deep red.',
    }),
    cables: score('How much trails from the wrist?', ['A clean capped stub', 'A few cables', 'A thick mane of cables and hoses']),
    twitch: noul('Does one finger still twitch now and then?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = s.root;
    const tone = LIVERY[a.livery];
    const armour = s.material(tone, { roughness: a.reason === 'spare' ? 0.4 : 0.7, metalness: 0.15 });
    const frame = s.material('#303437', { roughness: 0.55, metalness: 0.5 });
    const steel = s.material('#8b9296', { roughness: 0.35, metalness: 0.8 });
    const chrome = s.material('#d3d8da', { roughness: 0.2, metalness: 0.9 });
    const pad = s.material('#1c1d1f', { roughness: 0.95 });
    const primer = s.material('#9c4a35', { roughness: 0.9 });
    const scorch = new THREE.MeshStandardMaterial({ color: '#1b1917', roughness: 1 });
    const red = new THREE.MeshStandardMaterial({ color: '#d5281f', roughness: 0.7, side: THREE.DoubleSide });
    const wrap = new THREE.MeshStandardMaterial({ color: '#e9ecec', roughness: 0.35 });
    const count = { three: 3, four: 4, five: 5 }[a.digits];
    const fw = { three: 0.4, four: 0.31, five: 0.24 }[a.digits];
    const PL = 1.5, PW = 1.55, PH = 0.42;
    const palmY = a.reason === 'trophy' ? 1.25 : 1.0;
    const occupied = a.palm !== 'nothing';
    const curl = mix(0.12, 1.15, Math.min(a.curl, occupied ? 0.6 : 1));

    const hand = group(R, [0, palmY, 0], [(random() - 0.5) * 0.08, 0, 0.05]);
    // Palm: an armoured tray with a dark grip pad and tendon rods running to each finger.
    box(hand, [PL, PH, PW], [0, 0, 0], armour);
    box(hand, [PL * 0.8, 0.05, PW * 0.78], [0.02, PH / 2 + 0.01, 0], pad);
    box(hand, [PL * 0.94, PH * 0.6, PW * 0.9], [0, -PH * 0.35, 0], frame);
    for (const sz of [-1, 1]) box(hand, [PL * 0.9, 0.12, 0.1], [0, PH / 2 + 0.04, sz * (PW / 2 - 0.06)], armour);
    if (a.reason === 'repair') { box(hand, [0.5, 0.03, 0.4], [-0.3, PH / 2 + 0.05, -0.4], primer); box(hand, [0.03, PH * 0.7, 0.5], [0.2, 0, PW / 2 + 0.01], primer); }

    // Fingers: nested joints so each curls from its own knuckle.
    const lengths = [0.62, 0.48, 0.36];
    const tips: THREE.Group[] = [];
    let twitcher: THREE.Group | null = null, twitchBase = 0;
    const sheared = a.reason === 'loss' ? Math.floor(random() * count) : -1;
    const finger = (root: THREE.Group, width: number, bend: number, scale: number, index: number) => {
      let joint = root;
      const segs = index === sheared ? 1 : 3;
      for (let k = 0; k < segs; k++) {
        const l = lengths[k] * scale;
        if (k > 0) { joint = group(joint, [lengths[k - 1] * scale, 0, 0], [0, 0, bend * (0.8 + k * 0.25)]); if (k === 1 && index === 1) { twitcher = joint; twitchBase = joint.rotation.z; } }
        cyl(joint, width * 0.52, width * 0.52, width * 1.12, [0, 0, 0], steel, [Math.PI / 2, 0, 0], 12);
        box(joint, [l - width * 0.5, width * 0.78, width * 0.72], [l / 2, 0, 0], frame);
        box(joint, [l - width * 0.62, width * 0.34, width], [l / 2, -width * 0.3, 0], random() < (a.reason === 'repair' ? 0.25 : 0) ? primer : armour);
        box(joint, [l - width * 0.7, 0.04, width * 0.62], [l / 2, width * 0.4, 0], pad);
        rod(joint, [width * 0.2, width * 0.3, width * 0.42], [l - width * 0.2, width * 0.3, width * 0.42], 0.025, chrome, 6);
        if (k === segs - 1) {
          if (segs < 3) {
            // Sheared: torn metal and a scorched stump.
            for (let j = 0; j < 4; j++) box(joint, [0.2, 0.03, width * 0.3], [l + 0.03, (random() - 0.5) * width * 0.6, (random() - 0.5) * width * 0.7], frame, [random(), random(), random() * 2]);
            ball(joint, [0.08, width * 0.4, width * 0.4], [l, 0, 0], scorch, 8);
          } else {
            ball(joint, [width * 0.42, width * 0.4, width * 0.5], [l, 0, 0], armour, 10);
            if (a.reason === 'spare') ball(joint, [width * 0.6, width * 0.56, width * 0.66], [l - 0.04, 0, 0], wrap, 10);
          }
        }
      }
      tips.push(joint);
    };
    for (let i = 0; i < count; i++) {
      const z = (i - (count - 1) / 2) * (PW - fw) / (count - 1 || 1) * 0.98;
      const middle = 1 - Math.abs(i - (count - 1) / 2) / count;
      const bend = curl * (0.8 + random() * 0.4) * (i === count - 1 ? 1.12 : 1);
      const root = group(hand, [PL / 2 + fw * 0.2, 0.02, -z], [0, (i - (count - 1) / 2) * -0.06, bend * 0.75]);
      finger(root, fw, bend, (0.85 + middle * 0.3) * (a.digits === 'three' ? 1.1 : 1), i);
      rod(hand, [-PL * 0.4, PH / 2 + 0.07, -z * 0.5], [PL / 2, PH / 2 + 0.07, -z], 0.03, chrome, 6);
    }
    // Thumb: from the near flank, swung out and curling over the palm.
    const thumbRoot = group(hand, [-PL * 0.18, 0.02, PW / 2 + fw * 0.15], [0, -1.05, curl * 0.7 + 0.25]);
    finger(thumbRoot, fw * 1.2, curl * 0.9, 0.9, -2);
    ball(hand, [0.42, 0.26, 0.3], [-PL * 0.2, -0.02, PW / 2], armour, 12);

    // Wrist: a collar ring and the socket that used to turn in a forearm.
    const wx = -PL / 2;
    box(hand, [0.35, PH * 1.15, PW * 0.8], [wx - 0.12, 0, 0], frame);
    cyl(hand, 0.5, 0.56, 0.36, [wx - 0.42, 0, 0], armour, [0, 0, Math.PI / 2], 20);
    cyl(hand, 0.42, 0.42, 0.2, [wx - 0.66, 0, 0], steel, [0, 0, Math.PI / 2], 20);
    for (let i = 0; i < 8; i++) cyl(hand, 0.04, 0.04, 0.06, [wx - 0.61, Math.sin(i * 0.785) * 0.5, Math.cos(i * 0.785) * 0.5], chrome, [0, 0, Math.PI / 2], 6);
    if (a.reason === 'loss') {
      for (let i = 0; i < 9; i++) box(hand, [0.3 + random() * 0.3, 0.03, 0.16 + random() * 0.14], [wx - 0.8 - random() * 0.1, Math.sin(i * 0.7) * 0.4, Math.cos(i * 0.7) * 0.4], i % 3 ? frame : armour, [random() * 2, random() * 0.8 - 0.4, random() * 1.2 - 0.6]);
      for (let i = 0; i < 4; i++) ball(hand, [0.2 + random() * 0.2, 0.16 + random() * 0.14, 0.03], [(random() - 0.5) * PL * 0.7, (random() - 0.5) * 0.2, PW / 2 + 0.012], scorch, 8);
      ball(hand, [0.03, 0.34, 0.4], [wx - 0.62, 0.1, 0.1], scorch, 8);
    } else if (a.cables < 0.12) cyl(hand, 0.36, 0.3, 0.14, [wx - 0.82, 0, 0], a.reason === 'spare' ? red : pad, [0, 0, Math.PI / 2], 16);

    // Cables trailing from the wrist to the floor.
    const strands = a.cables < 0.12 ? 0 : Math.round(mix(3, 12, a.cables));
    const hues = ['#17181a', '#17181a', '#b3261e', '#d8a21c', '#2f5f9a', '#17181a', '#cfd4d6'];
    const floorY = a.reason === 'trophy' ? 0.52 : 0.05;
    for (let i = 0; i < strands; i++) {
      const ang = random() * Math.PI * 2, rr = random() * 0.32;
      const y0 = palmY + Math.sin(ang) * rr - 0.04, z0 = Math.cos(ang) * rr;
      const reach = 0.5 + random() * 1.1, side = z0 + (random() - 0.5) * 1.4;
      const thick = 0.025 + random() * 0.035;
      const m = s.material(hues[Math.floor(random() * hues.length)], { roughness: 0.8 });
      const short = a.reason === 'loss' && random() < 0.4;
      const pts: V[] = short
        ? [[wx - 0.7, y0, z0], [wx - 0.95, y0 + 0.05, z0], [wx - 1.15, y0 - 0.25 - random() * 0.3, mix(z0, side, 0.3)]]
        : [[wx - 0.7, y0, z0], [wx - 1.0, y0 - 0.05, z0], [wx - 1.15, mix(y0, floorY, 0.7), mix(z0, side, 0.4)], [wx - 1.25 - reach * 0.4, floorY + thick, mix(z0, side, 0.8)], [wx - 1.2 - reach, floorY + thick, side + (random() - 0.5) * 0.5]];
      tube(R, pts, thick, m);
      const end = pts[pts.length - 1];
      if (short) ball(R, [0.05, 0.05, 0.05], end, new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff9a2e', emissiveIntensity: mood.energy * 2 }), 6);
      else if (a.reason === 'repair' || a.reason === 'spare') box(R, [0.1, 0.16, 0.005], [end[0], end[1] + 0.03, end[2]], a.reason === 'spare' ? red : s.material('#f1efe6'), [Math.PI / 2 - 0.2, random() * 3, 0]);
      else cyl(R, thick * 1.6, thick * 1.6, 0.14, end, steel, [0, 0, Math.PI / 2], 8);
    }

    // What it rests on.
    const under = palmY - PH * 0.65;
    if (a.reason === 'repair') {
      const yellow = s.material('#dba91c', { roughness: 0.55 });
      const stripes = new THREE.MeshStandardMaterial({ map: hazard(), roughness: 0.7 });
      for (const sz of [-1, 1]) { rod(R, [-1.3, 0.34, sz * 0.75], [1.1, 0.34, sz * 0.75], 0.06, yellow); box(R, [2.2, 0.14, 0.03], [-0.1, 0.34, sz * 0.82], stripes); }
      for (const x of [-0.55, 0.45]) {
        rod(R, [x, 0.34, -0.75], [x, 0.34, 0.75], 0.06, yellow);
        for (const sz of [-1, 1]) rod(R, [x, 0.34, sz * 0.7], [x, under, sz * 0.45], 0.05, yellow);
        box(R, [0.3, 0.1, 1.3], [x, under, 0], yellow); box(R, [0.32, 0.04, 1.2], [x, under + 0.07, 0], pad);
      }
      for (const sx of [-1.3, 1.1]) for (const sz of [-1, 1]) { cyl(R, 0.14, 0.14, 0.1, [sx, 0.14, sz * 0.75], pad, [Math.PI / 2, 0, 0], 12); box(R, [0.08, 0.14, 0.14], [sx, 0.27, sz * 0.75], frame); }
      rod(R, [1.1, 0.34, 0], [1.75, 0.8, 0], 0.035, yellow); rod(R, [1.75, 0.8, -0.25], [1.75, 0.8, 0.25], 0.035, pad);
      // A tool roll left open beside it.
      box(R, [0.7, 0.02, 0.32], [0.4, 0.01, 1.35], s.material('#5a4a36', { roughness: 1 }), [0, 0.2, 0]);
      for (let i = 0; i < 5; i++) rod(R, [0.15 + i * 0.13, 0.04, 1.26], [0.17 + i * 0.13, 0.04, 1.48], 0.015, chrome, 5);
    } else if (a.reason === 'loss') {
      const tarp = new THREE.PlaneGeometry(3.6, 2.6, 12, 8);
      const p = tarp.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 3.1) * Math.cos(p.getY(i) * 2.7) * 0.03 + 0.035);
      tarp.computeVertexNormals();
      add(R, tarp, new THREE.MeshStandardMaterial({ color: '#4d5a4a', roughness: 0.95, side: THREE.DoubleSide }), [-0.2, 0, 0], [-Math.PI / 2, 0, random() * 0.3]);
      const wood = s.material('#8f6f45', { roughness: 0.95 });
      for (const x of [-0.6, 0.15, 0.7]) { box(R, [0.24, under - 0.07, 1.9], [x, (under + 0.07) / 2, 0], wood, [0, (random() - 0.5) * 0.2, 0]); }
    } else if (a.reason === 'trophy') {
      const stone = s.material('#3a3d42', { roughness: 0.7 });
      box(R, [3.6, 0.22, 2.4], [0.1, 0.11, 0], stone);
      box(R, [3.2, 0.3, 2.0], [0.1, 0.37, 0], stone);
      for (const x of [-0.5, 0.5]) box(R, [0.3, under - 0.52, 1.1], [x, (under + 0.52) / 2, 0], s.material('#2a2c30'));
      const names = ['TAKEN AT THE RIVER', 'FIRST KILL · 3RD COY', 'HILL 204', 'GIFT OF THE REGIMENT', 'LEST WE FORGET'];
      const words = names[Math.floor(random() * names.length)];
      const plaque = paint(512, 128, (ctx, w, h) => { ctx.fillStyle = '#b8923a'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#6b5220'; ctx.lineWidth = 8; ctx.strokeRect(8, 8, w - 16, h - 16); stencil(ctx, words, w / 2, h / 2 + 2, 44, '#3a2c10', 'center', w - 50); });
      decal(R, plaque, 1.3, 0.32, [0.1, 0.36, 1.012], [0, 0, 0], { alphaTest: 0, metalness: 0.6, roughness: 0.4 });
      const brass = s.material('#c9a23a', { metalness: 0.85, roughness: 0.3 });
      for (const x of [-1.5, 1.7]) { cyl(R, 0.035, 0.035, 0.95, [x, 0.475, 1.55], brass, [0, 0, 0], 10); cyl(R, 0.16, 0.18, 0.05, [x, 0.025, 1.55], brass, [0, 0, 0], 14); ball(R, [0.06, 0.06, 0.06], [x, 0.98, 1.55], brass, 10); }
      tube(R, [[-1.5, 0.9, 1.55], [-0.7, 0.66, 1.55], [0.1, 0.6, 1.55], [0.9, 0.66, 1.55], [1.7, 0.9, 1.55]], 0.03, s.material(mood.cheer > 0.5 ? '#b3261e' : '#4a2030', { roughness: 0.95 }));
      // The victor's mark daubed across the back of the wrist.
      const daub = paint(128, 128, (ctx, w) => { ctx.clearRect(0, 0, w, w); ctx.strokeStyle = '#f1efe6'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(24, 24); ctx.lineTo(104, 104); ctx.moveTo(104, 24); ctx.lineTo(24, 104); ctx.stroke(); });
      decal(hand, daub, 0.34, 0.34, [0.1, 0, PW / 2 + 0.014]);
    } else {
      const wood = s.material('#b08a55', { roughness: 0.95 });
      for (const z of [-0.8, 0, 0.8]) box(R, [3.5, 0.14, 0.22], [0.25, 0.07, z], wood);
      for (const x of [-1.2, -0.3, 0.6, 1.7]) box(R, [0.22, 0.1, 2.0], [x, 0.19, 0], wood);
      for (const x of [-0.5, 0.45]) box(R, [0.3, under - 0.24, 1.3], [x, (under + 0.24) / 2, 0], wood);
      for (const sx of [-1.35, 1.9]) for (const sz of [-1, 1]) box(R, [0.1, 2.0, 0.1], [sx, 1.24, sz * 0.95], wood);
      for (const sz of [-1, 1]) { box(R, [3.35, 0.1, 0.1], [0.27, 2.2, sz * 0.95], wood); }
      for (const sx of [-1.35, 1.9]) box(R, [0.1, 0.1, 2.0], [sx, 2.2, 0], wood);
      box(R, [0.1, 2.6, 0.03], [0.27, 1.25, -0.98], wood, [0, 0, 1.0]);
      const label = paint(256, 128, (ctx, w, h) => { ctx.clearRect(0, 0, w, h); stencil(ctx, 'THIS WAY UP', w / 2, 40, 40, '#1d1d1b', 'center', w - 10); stencil(ctx, `HAND ASSY ${random() < 0.5 ? 'L' : 'R'}`, w / 2, 92, 36, '#1d1d1b', 'center', w - 10); });
      decal(R, label, 0.9, 0.2, [0.25, 0.07, 0.915], [0, 0, 0]).scale.set(1, 0.7, 1);
      for (let i = 0; i < 3; i++) box(hand, [0.12, 0.6, 0.01], [-0.4 + i * 0.5, -0.3, PW / 2 + 0.03 + i * 0.01], red, [0, 0, (random() - 0.5) * 0.3]);
    }

    // What sits in the palm.
    const top = PH / 2 + 0.04;
    let breather: THREE.Object3D | null = null;
    if (a.palm === 'sleeper') {
      const g = group(hand, [-0.05, top, 0.05], [0, 0.3 + random() * 0.4, 0]);
      const overall = s.material(mood.cheer > 0.5 ? '#3f6fb0' : '#6a7078', { roughness: 0.95 });
      const skin = s.material(['#e8c7a4', '#b98a62', '#7a5238'][Math.floor(random() * 3)], { roughness: 0.8 });
      const body = ball(g, [0.42, 0.17, 0.2], [0, 0.17, 0], overall, 12); breather = body;
      const thigh = cyl(g, 0.1, 0.09, 0.42, [-0.4, 0.13, 0.14], overall, [0.9, 0, Math.PI / 2 - 0.5], 8); thigh.rotation.set(0, -0.8, Math.PI / 2);
      cyl(g, 0.08, 0.07, 0.42, [-0.42, 0.11, 0.38], overall, [0, 0.9, Math.PI / 2], 8);
      box(g, [0.24, 0.1, 0.1], [-0.22, 0.06, 0.52], pad, [0, 0.9, 0]);
      ball(g, [0.12, 0.12, 0.12], [0.5, 0.15, 0.02], skin, 12);
      cyl(g, 0.125, 0.125, 0.07, [0.52, 0.2, 0.06], s.material('#c22a1e'), [1.0, 0, 0.2], 12);
      box(g, [0.14, 0.02, 0.12], [0.55, 0.19, 0.17], s.material('#c22a1e'), [0.9, 0, 0.2]);
      cyl(g, 0.06, 0.055, 0.4, [0.28, 0.12, 0.22], overall, [0, -0.5, Math.PI / 2], 8);
      ball(g, [0.06, 0.05, 0.06], [0.48, 0.1, 0.33], skin, 8);
    } else if (a.palm === 'cat') {
      const fur = s.material(['#d98a3a', '#2b2b2d', '#8d8d8a', '#efe9dc'][Math.floor(random() * 4)], { roughness: 1 });
      const g = group(hand, [0, top, 0.1], [0, random() * 6, 0]);
      const body = ball(g, [0.26, 0.13, 0.2], [0, 0.12, 0], fur, 14); breather = body;
      ball(g, [0.1, 0.09, 0.1], [0.17, 0.12, 0.13], fur, 10);
      for (const t of [-1, 1]) add(g, new THREE.ConeGeometry(0.035, 0.07, 4), fur, [0.17 + t * 0.05, 0.22, 0.13 - t * 0.03]);
      add(g, new THREE.TorusGeometry(0.2, 0.035, 6, 14, Math.PI * 1.1), fur, [0, 0.05, 0], [Math.PI / 2, 0, 1.2]);
    } else if (a.palm === 'nest') {
      const twig = s.material('#7a5c38', { roughness: 1 });
      const g = group(hand, [0.05, top, 0], [0, random() * 3, 0]);
      for (let i = 0; i < 4; i++) add(g, new THREE.TorusGeometry(0.22 - i * 0.025, 0.045, 5, 14), twig, [0, 0.04 + i * 0.035, 0], [Math.PI / 2 + (random() - 0.5) * 0.15, 0, 0]);
      for (let i = 0; i < 10; i++) rod(g, [Math.cos(i) * 0.3, 0.04 + random() * 0.1, Math.sin(i) * 0.3], [Math.cos(i + 1.3) * 0.26, 0.05 + random() * 0.12, Math.sin(i + 1.3) * 0.26], 0.012, twig, 4);
      for (let i = 0; i < 3; i++) ball(g, [0.055, 0.07, 0.055], [Math.cos(i * 2.1) * 0.07, 0.1, Math.sin(i * 2.1) * 0.07], s.material('#cfe3e0', { roughness: 0.5 }), 10).rotation.z = 0.8;
    } else if (a.palm === 'flowers') {
      const g = group(hand, [0, top, 0], [0, 0.5 + random(), 0]);
      const bloom = ['#f1efe6', '#e8c11f', '#d8452b', '#c77fb6', '#f1efe6'];
      for (let i = 0; i < 9; i++) {
        const z = (i - 4) * 0.035, lift = 0.04 + random() * 0.06;
        rod(g, [-0.35, 0.03, z * 0.3], [0.3, lift, z * 2.2], 0.01, s.material('#4d7a45'), 5);
        ball(g, [0.07, 0.05, 0.07], [0.32, lift + 0.02, z * 2.2], s.material(bloom[i % bloom.length]), 8);
      }
      box(g, [0.14, 0.06, 0.12], [-0.2, 0.04, 0], s.material('#e9e4d0'));
    } else if (a.palm === 'helmet') {
      const g = group(hand, [0.05, top, 0], [0, -0.6 + random() * 1.2, 0]);
      ball(g, [0.2, 0.2, 0.23], [0, 0.2, 0], s.material('#eeeeea', { roughness: 0.3 }), 18);
      add(g, new THREE.SphereGeometry(0.205, 16, 8, Math.PI * 0.08, Math.PI * 0.84, Math.PI * 0.32, Math.PI * 0.3), new THREE.MeshStandardMaterial({ color: '#16191c', metalness: 0.8, roughness: 0.15 }), [0, 0.2, 0.035]).scale.set(1, 1, 1.1);
      add(g, new THREE.TorusGeometry(0.212, 0.02, 4, 16, Math.PI), s.material('#c22a1e'), [0, 0.2, 0], [0, Math.PI / 2, 0]).scale.set(1.12, 1, 1);
      cyl(g, 0.17, 0.15, 0.04, [0, 0.02, 0], pad, [0, 0, 0], 14);
    } else if (a.palm === 'puddle') {
      const tint = new THREE.Color().setHSL(mix(0.55, 0.09, mood.warmth), 0.5, 0.6);
      const water = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.35, roughness: 0.03, metalness: 0.5 });
      const m = cyl(hand, 1, 1, 0.02, [0.05, top - 0.005, 0], water, [0, 0, 0], 24); m.scale.set(0.52, 1, 0.48);
      const m2 = cyl(hand, 1, 1, 0.02, [0.35, top - 0.006, 0.2], water, [0, 0, 0], 16); m2.scale.set(0.25, 1, 0.3);
    }

    // Wear: grime in the knuckles shows as rust blooms on the armour flank.
    const blooms = Math.round(mood.wear * 6);
    const rust = new THREE.MeshStandardMaterial({ color: '#7a4628', roughness: 1 });
    for (let i = 0; i < blooms; i++) ball(hand, [0.08 + random() * 0.12, 0.05 + random() * 0.08, 0.01], [(random() - 0.5) * PL * 0.8, (random() - 0.5) * PH * 0.6, PW / 2 + 0.006], rust, 8);

    const tw = twitcher as THREE.Group | null;
    return s.finish({
      update: (_dt, time) => {
        if (tw && a.twitch) { const beat = (time * mix(0.25, 1.2, mood.energy)) % 1; tw.rotation.z = twitchBase + (beat < 0.12 ? Math.sin((beat / 0.12) * Math.PI) * 0.28 : 0); }
        if (breather) breather.scale.y = (a.palm === 'cat' ? 0.13 : 0.17) * (1 + Math.sin(time * 1.6) * 0.06);
      },
    });
  },
});
