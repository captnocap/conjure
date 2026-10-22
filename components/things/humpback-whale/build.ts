import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score, visibleBounds } from '@conjure/kit';
import { afloat, painted, waterPatch } from './sea';

type Frame = { p: THREE.Vector3; t: THREE.Vector3; u: THREE.Vector3; w: THREE.Vector3 };
const SINK = -0.6; // nothing is drawn deeper than this; the sea hides the rest
const PROFILE: [number, number][] = [[0, 0.05], [0.015, 0.34], [0.05, 0.72], [0.12, 1.12], [0.25, 1.48], [0.4, 1.45], [0.55, 1.16], [0.7, 0.72], [0.85, 0.36], [0.95, 0.2], [1, 0.15]];
const girth = (s: number) => {
  for (let i = 1; i < PROFILE.length; i++) if (s <= PROFILE[i][0]) {
    const [s0, r0] = PROFILE[i - 1], [s1, r1] = PROFILE[i], f = (s - s0) / (s1 - s0);
    return mix(r0, r1, f * f * (3 - 2 * f));
  }
  return 0.15;
};

/** A body lofted along a posed spine. `phi` is the pitch of the direction toward the snout, in degrees, at s from snout (0) to tail (1). */
function spine(L: number, phi: (s: number) => number, roll: number, level: (ys: (s: number) => number) => number) {
  const K = 160;
  const points: THREE.Vector3[] = [new THREE.Vector3()];
  for (let k = 1; k <= K; k++) {
    const angle = THREE.MathUtils.degToRad(phi((k - 0.5) / K));
    points.push(points[k - 1].clone().add(new THREE.Vector3(-Math.cos(angle), -Math.sin(angle), 0).multiplyScalar(L / K)));
  }
  const at = (s: number) => { const f = Math.min(Math.max(s, 0), 1) * K, k = Math.min(K - 1, Math.floor(f)); return points[k].clone().lerp(points[k + 1], f - k); };
  const shift = level((s) => at(s).y);
  const mid = at(0.5).x;
  const scale = L / 13;
  const frame = (s: number): Frame => {
    const angle = THREE.MathUtils.degToRad(phi(Math.min(Math.max(s, 0.003), 0.997)));
    const t = new THREE.Vector3(-Math.cos(angle), -Math.sin(angle), 0);
    const up = new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0);
    const u = up.multiplyScalar(Math.cos(roll)).add(new THREE.Vector3(0, 0, Math.sin(roll)));
    const p = at(s);
    p.x -= mid; p.y += shift;
    return { p, t, u, w: t.clone().cross(u) };
  };
  const surface = (s: number, theta: number, lift = 0) => {
    const { p, u, w } = frame(s), r = girth(s) * scale;
    const high = s < 0.2 ? mix(0.55, 0.85, s / 0.2) : 0.85, low = s < 0.5 ? 1.08 : mix(1.08, 0.85, (s - 0.5) / 0.5);
    return p.addScaledVector(w, Math.cos(theta) * (r + lift)).addScaledVector(u, Math.sin(theta) * (r * (Math.sin(theta) > 0 ? high : low) + lift));
  };
  const geometry = (rings = 52, segments = 24) => {
    const positions: number[] = [], uvs: number[] = [], index: number[] = [], deep: boolean[] = [];
    for (let i = 0; i <= rings; i++) for (let j = 0; j <= segments; j++) {
      const s = i / rings, v = surface(s, (j / segments) * Math.PI * 2);
      positions.push(v.x, Math.max(v.y, SINK), v.z);
      deep.push(v.y < SINK);
      uvs.push(j / segments, s);
    }
    // Whatever is wholly under water is left out, so nothing shows beneath a shallow floor.
    for (let i = 0; i < rings; i++) for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j, b = a + segments + 1;
      if (!(deep[a] && deep[a + 1] && deep[b] && deep[b + 1])) index.push(a, a + 1, b, a + 1, b + 1, b);
    }
    const built = new THREE.BufferGeometry();
    built.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    built.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    built.setIndex(index);
    built.computeVertexNormals();
    return built;
  };
  return { frame, surface, geometry };
}

export default defineThing({
  questions: {
    moment: choice('What moment is this?', {
      breach: 'A full breach: two thirds of the body launched out of the sea, twisting, flippers flung wide.',
      fluke: 'The fluke-up dive: only the tail stock and great flukes raised, streaming water, about to slide under.',
      spyhop: 'A spy-hop: the head standing straight up out of the water, an eye above the surface, looking.',
      blow: 'Back and blow: a long dark back rolling at the surface under a bushy plume of breath.',
      pecslap: 'Lying on its side with one huge white flipper raised straight up, about to slap the water.',
    }),
    colouring: choice('How is it coloured?', {
      classic: 'Dark slate above with a white throat and belly and pale flippers.',
      pale: 'Very white: white flanks reaching high up the sides, pure white flippers.',
      dark: 'Nearly all black, only the throat grooves and flipper edges showing grey.',
    }),
    flukes: choice('What is the pattern under its flukes, the mark it is known by?', {
      white: 'Mostly white with a black trailing edge and centre line.',
      black: 'Solid black with a few pale scratches.',
      mottled: 'White tips with a ragged black centre and speckles.',
      scarred: 'Dark and raked with parallel tooth scars and round bite marks.',
    }),
    barnacles: score('How encrusted with barnacles is it?', ['Clean skin', 'Clusters on the chin and flipper edges', 'Heavily crusted, an old traveller']),
    company: choice('Who is with it?', {
      alone: 'No one.',
      calf: 'A calf surfacing close alongside.',
      birds: 'Seabirds wheeling overhead.',
      dolphins: 'Dolphins leaping around it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const w = new Sculpture(context);
    s.root.add(w.root);
    const { mood, random } = context;
    const L = 13;
    const skin = a.colouring === 'dark' ? '#1b2026' : '#27313a', pale = '#ebe9df';
    const belly = a.colouring === 'pale' ? 0.3 : a.colouring === 'dark' ? 0.1 : 0.2;

    // Skin: u runs around the body (0.25 is the back, 0.75 the belly), v from snout to tail.
    const hide = painted(512, 1024, (ctx, W, H) => {
      const y = (v: number) => (1 - v) * H;
      ctx.fillStyle = skin; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = a.colouring === 'dark' ? '#8d949a' : pale;
      ctx.beginPath();
      const steps = 40;
      for (let i = 0; i <= steps; i++) { const v = i / steps * 0.86, half = belly * (v < 0.5 ? 1 : mix(1, 0.25, (v - 0.5) / 0.36)) + Math.sin(v * 40) * 0.012; ctx.lineTo((0.75 - half) * W, y(v)); }
      for (let i = steps; i >= 0; i--) { const v = i / steps * 0.86, half = belly * (v < 0.5 ? 1 : mix(1, 0.25, (v - 0.5) / 0.36)) + Math.cos(v * 34) * 0.012; ctx.lineTo((0.75 + half) * W, y(v)); }
      ctx.fill();
      for (let i = 0; i < 70; i++) { const v = random() * 0.8, side = random() < 0.5 ? -1 : 1; ctx.beginPath(); ctx.ellipse((0.75 + side * (belly + mix(-0.03, 0.05, random()))) * W, y(v), mix(3, 12, random()), mix(4, 20, random()), 0, 0, 7); ctx.fill(); }
      // Throat grooves.
      ctx.strokeStyle = a.colouring === 'dark' ? '#15191d' : '#59636b'; ctx.lineWidth = 3;
      for (let i = 0; i < 15; i++) { const u = 0.75 + (i - 7) * 0.024; ctx.beginPath(); ctx.moveTo(u * W, y(0.03)); ctx.lineTo((0.75 + (i - 7) * 0.028) * W, y(0.3)); ctx.lineTo(u * W, y(0.5)); ctx.stroke(); }
      // Mouth line.
      ctx.strokeStyle = '#14181b'; ctx.lineWidth = 5;
      for (const u of [0.535, 0.965]) { ctx.beginPath(); ctx.moveTo(u * W, y(0.005)); ctx.quadraticCurveTo((u < 0.75 ? u - 0.035 : u + 0.035) * W, y(0.12), u * W, y(0.215)); ctx.stroke(); }
      // Scars.
      ctx.strokeStyle = '#c9cdd0'; ctx.lineWidth = 2;
      for (let i = 0; i < mood.wear * 40; i++) { const x = random() * W, y0 = random() * H; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + mix(-30, 30, random()), y0 + mix(-60, 60, random())); ctx.stroke(); }
    });
    hide.wrapS = THREE.RepeatWrapping;
    const body = new THREE.MeshStandardMaterial({ map: hide, roughness: 0.6, metalness: 0, side: THREE.DoubleSide });
    const dark = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6, metalness: 0 });
    const finTint = new THREE.MeshStandardMaterial({ color: a.colouring === 'dark' ? '#4a535b' : a.colouring === 'pale' ? '#f1efe6' : '#dedcd2', roughness: 0.35 });
    const white = new THREE.MeshStandardMaterial({ color: '#f6f9f9', roughness: 0.75 });

    const rad = THREE.MathUtils.degToRad;
    const peak = (target: number) => (ys: (s: number) => number) => { let top = -Infinity; for (let i = 0; i <= 40; i++) top = Math.max(top, ys(i / 40)); return target - top; };
    const poses = {
      breach: { phi: (v: number) => 36 + 44 * v, roll: rad(-100), level: (ys: (s: number) => number) => SINK - ys(0.64), yaw: -0.35 },
      fluke: { phi: (v: number) => (v < 0.5 ? -30 : -30 - 48 * ((v - 0.5) / 0.5)), roll: 0, level: (ys: (s: number) => number) => -ys(0.75), yaw: Math.PI / 2 - 0.45 },
      spyhop: { phi: () => 84, roll: 0, level: (ys: (s: number) => number) => -ys(0.34), yaw: -0.95 },
      blow: { phi: (v: number) => -12 + 30 * v, roll: 0, level: peak(0.45), yaw: 0.4 },
      pecslap: { phi: (v: number) => -3 + 8 * v, roll: rad(-108), level: peak(0.1), yaw: 0.3 },
    } as const;
    const pose = poses[a.moment];
    const whale = spine(L, pose.phi, pose.roll, pose.level);
    w.mesh(whale.geometry(), body);
    const above = (v: THREE.Vector3) => v.y > 0.05;
    const basis = (mesh: THREE.Object3D, x: THREE.Vector3, yHint: THREE.Vector3, at: THREE.Vector3) => {
      const xa = x.clone().normalize(), ya = yHint.clone().addScaledVector(xa, -yHint.dot(xa)).normalize(), za = xa.clone().cross(ya);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.makeBasis(xa, ya, za).setPosition(at);
      return { xa, ya, za };
    };

    // Long knobbly flippers.
    const drips: THREE.Vector3[] = [];
    const paddle = new THREE.Shape();
    paddle.moveTo(0, -0.38);
    paddle.lineTo(0, 0.36);
    for (let i = 1; i <= 9; i++) paddle.lineTo(i * 0.42, 0.42 + (i % 2 ? 0.07 : 0) - (i / 9) ** 3 * 0.3);
    paddle.quadraticCurveTo(4.35, 0.0, 3.9, -0.22);
    paddle.quadraticCurveTo(2.0, -0.6, 0, -0.38);
    const paddleGeometry = new THREE.ExtrudeGeometry(paddle, { depth: 0.16, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
    paddleGeometry.translate(0, 0, -0.08);
    const finTips: THREE.Vector3[] = [];
    for (const side of [-1, 1]) {
      const f = whale.frame(0.3);
      const root = whale.surface(0.3, side > 0 ? -0.55 : Math.PI + 0.55, -0.15);
      let direction: THREE.Vector3 | null = null;
      if (a.moment === 'breach') direction = f.w.clone().multiplyScalar(side * 0.85).addScaledVector(f.t, 0.2).addScaledVector(f.u, -0.5);
      else if (a.moment === 'spyhop') direction = f.w.clone().multiplyScalar(side * 0.95).addScaledVector(f.t, 0.42).addScaledVector(f.u, -0.2);
      else if (a.moment === 'pecslap' && f.w.clone().multiplyScalar(side).y > 0) direction = new THREE.Vector3(0.12, 1, 0.1);
      if (!direction || root.y < -0.6) continue;
      const fin = w.mesh(paddleGeometry, finTint);
      const { xa, ya } = basis(fin, direction, f.t.clone().negate(), root);
      for (let i = 2; i <= 9; i++) { const edge = root.clone().addScaledVector(xa, i * 0.43).addScaledVector(ya, -0.35); if (above(edge)) drips.push(edge); }
      for (let i = 1; i <= 9; i++) finTips.push(root.clone().addScaledVector(xa, i * 0.42).addScaledVector(ya, 0.42 - (i / 9) ** 3 * 0.3));
    }

    // Flukes, with the identifying pattern on the underside.
    const end = whale.frame(1);
    const flukeTips: THREE.Vector3[] = [];
    if (end.p.y > -0.3) {
      const outline = new THREE.Shape();
      const half: [number, number][] = [[0.25, -0.2], [1.2, -0.05], [2.0, 0.4], [2.35, 0.8], [2.0, 1.0], [1.6, 1.14], [1.25, 1.04], [0.9, 1.16], [0.55, 1.02], [0.25, 1.08], [0, 0.82]];
      outline.moveTo(0, -0.25);
      for (const [x, y] of half) outline.lineTo(x, y);
      for (const [x, y] of half.slice(0, -1).reverse()) outline.lineTo(-x, y);
      outline.closePath();
      const blade = new THREE.ExtrudeGeometry(outline, { depth: 0.14, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.04, bevelSegments: 2 });
      blade.translate(0, 0, -0.07);
      const mark = painted(256, 128, (ctx, W, H) => {
        const darkFill = '#1f252b', paleFill = '#f1efe6';
        const base = a.flukes === 'white' || a.flukes === 'mottled' ? paleFill : darkFill;
        ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
        if (a.flukes === 'white') { ctx.fillStyle = darkFill; ctx.fillRect(0, 0, W, 20); ctx.fillRect(W / 2 - 7, 0, 14, H); for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(random() * W, 20 + random() * 80, mix(2, 6, random()), 0, 7); ctx.fill(); } }
        else if (a.flukes === 'mottled') { ctx.fillStyle = darkFill; ctx.fillRect(0, 0, W, 14); for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.ellipse(W / 2 + (random() - 0.5) * W * 0.5, random() * H, mix(8, 30, random()), mix(6, 22, random()), random() * 3, 0, 7); ctx.fill(); } for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(random() * W, random() * H, 2.5, 0, 7); ctx.fill(); } }
        else if (a.flukes === 'black') { ctx.strokeStyle = '#c9cdd0'; ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { ctx.beginPath(); const x = random() * W, y = random() * H; ctx.moveTo(x, y); ctx.lineTo(x + mix(-40, 40, random()), y + mix(-20, 20, random())); ctx.stroke(); } }
        else { ctx.strokeStyle = '#e3e5e2'; ctx.lineWidth = 3; for (let g = 0; g < 5; g++) { const x = random() * W, y = random() * H * 0.6, slant = mix(-20, 20, random()); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + k * 7, y); ctx.lineTo(x + k * 7 + slant, y + 44); ctx.stroke(); } } for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(random() * W, random() * H, 7, 0, 7); ctx.stroke(); } }
      });
      const plate = new THREE.ShapeGeometry(outline);
      const pp = plate.attributes.position as THREE.BufferAttribute, uv = plate.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < pp.count; i++) uv.setXY(i, (pp.getX(i) + 2.35) / 4.7, (pp.getY(i) + 0.25) / 1.41);
      const dip = new THREE.Vector3(0, a.moment === 'fluke' ? 0.25 : 0, 0);
      const tailAxis = end.t.clone().add(dip).normalize();
      const fluke = w.mesh(blade, dark);
      const { xa, ya, za } = basis(fluke, end.w, tailAxis, end.p.clone().addScaledVector(end.t, -0.1));
      const under = w.mesh(plate, new THREE.MeshStandardMaterial({ map: mark, roughness: 0.35, side: THREE.DoubleSide }));
      under.matrixAutoUpdate = false;
      under.matrix.makeBasis(xa, ya, za).setPosition(end.p.clone().addScaledVector(end.t, -0.1).addScaledVector(za, -0.118));
      under.castShadow = false;
      for (const [x, y] of half.slice(3, 10)) for (const side of [-1, 1]) { const edge = end.p.clone().addScaledVector(xa, side * x).addScaledVector(ya, y - 0.1); if (above(edge)) drips.push(edge); }
      for (const side of [-1, 1]) for (let i = 0; i < 6; i++) flukeTips.push(end.p.clone().addScaledVector(xa, side * mix(1.7, 2.3, random())).addScaledVector(ya, mix(0.4, 0.85, random())).addScaledVector(za, 0.09 * (random() < 0.5 ? -1 : 1)));
    }

    // Dorsal fin on its hump, eyes, and the knobs on the head.
    const hump = whale.frame(0.66), humpAt = whale.surface(0.66, Math.PI / 2, -0.06);
    if (humpAt.y > -0.4) {
      const fin = new THREE.Shape();
      fin.moveTo(-0.5, 0); fin.quadraticCurveTo(0.1, 0.12, 0.42, 0.44); fin.quadraticCurveTo(0.6, 0.3, 0.62, 0); fin.closePath();
      const dorsal = new THREE.ExtrudeGeometry(fin, { depth: 0.1, bevelEnabled: false });
      dorsal.translate(0, 0, -0.05);
      basis(w.mesh(dorsal, dark), hump.t, hump.u, humpAt);
    }
    const knobs: { at: readonly [number, number, number]; size: number }[] = [];
    for (let i = 0; i < 26; i++) {
      const v = mix(0.012, 0.17, random()), theta = random() < 0.7 ? mix(0.5, 2.64, random()) : (random() < 0.5 ? -0.15 : Math.PI + 0.15) + mix(-0.2, 0.2, random());
      const at = whale.surface(v, theta, -0.02);
      if (at.y > SINK) knobs.push({ at: at.toArray(), size: mix(0.06, 0.1, random()) });
    }
    if (knobs.length) w.scatter(new THREE.SphereGeometry(1, 8, 6), dark, knobs);
    for (const theta of [-0.2, Math.PI + 0.2]) { const eye = whale.surface(0.225, theta, 0.01); if (eye.y > SINK) w.ball([0.07, 0.07, 0.07], eye.toArray(), new THREE.MeshStandardMaterial({ color: '#0d0f11', roughness: 0.15 }), 10); }

    // Barnacles: chin, flipper edges, fluke tips.
    const crust: { at: readonly [number, number, number]; size: number }[] = [];
    const count = Math.round(a.barnacles * 150);
    for (let i = 0; i < count; i++) {
      const where = random();
      let at: THREE.Vector3;
      if (where < 0.45) at = whale.surface(mix(0.01, 0.12, random() ** 1.5), -Math.PI / 2 + mix(-0.9, 0.9, random()), 0);
      else if (where < 0.75 && finTips.length) at = finTips[Math.floor(random() * finTips.length)].clone().add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.16));
      else if (flukeTips.length) at = flukeTips[Math.floor(random() * flukeTips.length)];
      else at = whale.surface(mix(0.2, 0.8, random()), mix(0, Math.PI * 2, random()), 0);
      if (at.y > SINK) crust.push({ at: at.toArray(), size: mix(0.035, 0.075, random()) });
    }
    if (crust.length) w.scatter(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ color: '#d9d2bb', roughness: 0.9 }), crust);

    // White water.
    const lively = mix(0.5, 1.5, mood.energy);
    const foam: { at: readonly [number, number, number]; size: number }[] = [];
    const crossing = (v: number) => { const p = whale.frame(v).p; return new THREE.Vector3(p.x, 0, p.z); };
    const ring = (centre: THREE.Vector3, rx: number, rz: number, n: number, size: number, tall: number) => {
      for (let i = 0; i < n; i++) { const angle = random() * 6, d = mix(0.75, 1.15, random()); foam.push({ at: [centre.x + Math.cos(angle) * rx * d, random() * tall, centre.z + Math.sin(angle) * rz * d], size: size * mix(0.5, 1.3, random()) }); }
    };
    const spray = (centre: THREE.Vector3, reach: number, arcs: number, speed: number) => {
      for (let i = 0; i < arcs; i++) {
        const angle = random() * 6, out = mix(0.5, 1, random()) * reach, up = mix(0.5, 1, random()) * speed;
        for (let k = 1; k <= 6; k++) { const f = k / 6; foam.push({ at: [centre.x + Math.cos(angle) * (reach * 0.4 + out * f), up * 4 * f * (1 - f) + 0.05, centre.z + Math.sin(angle) * (reach * 0.4 + out * f)], size: mix(0.3, 0.1, f) * mix(0.7, 1.2, random()) }); }
      }
    };
    const shown = a.moment;
    if (shown === 'breach') {
      const base = crossing(0.64);
      ring(base, 2.3, 2.0, Math.round(60 * lively), 0.42, 0.9);
      spray(base, 3.2, Math.round(16 * lively), 2.8);
      for (let i = 0; i < 46 * lively; i++) { const at = whale.surface(mix(0.25, 0.62, random() ** 0.7), mix(0, Math.PI * 2, random()), 0.02); if (at.y > 0) foam.push({ at: at.toArray(), size: mix(0.08, 0.22, random()) }); }
    } else if (shown === 'fluke') {
      ring(crossing(0.75), 0.9, 0.9, Math.round(22 * lively), 0.22, 0.25);
    } else if (shown === 'spyhop') {
      ring(crossing(0.34), 1.9, 1.9, Math.round(26 * lively), 0.2, 0.2);
    } else if (shown === 'blow') {
      for (let i = 0; i < 40 * lively; i++) { const v = mix(0.05, 0.8, random()), p = whale.frame(v).p, side = random() < 0.5 ? -1 : 1; foam.push({ at: [p.x + (random() - 0.5) * 0.5, 0.02, p.z + side * (girth(v) + mix(0, 0.5, random()))], size: mix(0.08, 0.2, random()) }); }
    } else {
      const base = crossing(0.3);
      ring(base, 2.0, 2.2, Math.round(40 * lively), 0.3, 0.5);
      spray(base, 2.4, Math.round(8 * lively), 1.6);
    }
    if (foam.length) w.scatter(new THREE.SphereGeometry(1, 8, 6), white, foam).castShadow = false;
    // Water sheeting off flippers and flukes in thin falling strands.
    if (drips.length) {
      const strand = new THREE.CylinderGeometry(0.02, 0.035, 1, 5);
      strand.translate(0, -0.5, 0);
      const falls = new THREE.InstancedMesh(strand, white, drips.length * 2);
      const dummy = new THREE.Object3D();
      drips.forEach((at, i) => { for (let k = 0; k < 2; k++) {
        dummy.position.copy(at).add(new THREE.Vector3((random() - 0.5) * 0.25, 0, (random() - 0.5) * 0.25));
        dummy.scale.set(mix(0.8, 2.2, random()), Math.min(at.y, mix(0.5, 2.6, random())), mix(0.8, 2.2, random()));
        dummy.updateMatrix(); falls.setMatrixAt(i * 2 + k, dummy.matrix);
      } });
      falls.castShadow = false;
      w.root.add(falls);
    }
    // The blow.
    const puffs: THREE.Mesh[] = [];
    if (a.moment === 'blow' || a.moment === 'spyhop') {
      const hole = whale.surface(0.17, Math.PI / 2, 0), spout = whale.frame(0.17).u;
      const tall = a.moment === 'blow' ? mix(2.6, 4, mood.energy) : 1.2, lean = mix(0.1, 1.4, mood.energy);
      for (let i = 0; i < 9; i++) {
        const f = i / 8;
        const puff = w.ball([1, 1, 1], hole.clone().addScaledVector(spout, 0.2 + f * tall).add(new THREE.Vector3(-lean * f * f, 0, (random() - 0.5) * 0.3 * f)).toArray(), white, 10);
        puff.scale.setScalar(mix(0.16, 0.75, f ** 0.8) * mix(0.85, 1.15, random()) * (a.moment === 'blow' ? 1 : 0.5));
        puff.userData.size = puff.scale.x;
        puff.castShadow = false;
        puffs.push(puff);
      }
    }

    w.root.rotation.y = pose.yaw + (random() - 0.5) * 0.2;
    w.root.updateMatrixWorld(true);

    // Company.
    const reach = new THREE.Box3();
    const grow = (v: THREE.Vector3) => { if (v.y > 0) reach.expandByPoint(v.clone().applyMatrix4(w.root.matrixWorld)); };
    for (let i = 0; i <= 40; i++) for (let j = 0; j < 12; j++) grow(whale.surface(i / 40, (j / 12) * Math.PI * 2));
    for (const tip of [...finTips, ...flukeTips, ...drips]) grow(tip);
    for (const blob of foam) grow(new THREE.Vector3(...blob.at).setY(1));
    if (reach.isEmpty()) reach.copy(visibleBounds(w.root));
    const span = reach.getSize(new THREE.Vector3()), middle = reach.getCenter(new THREE.Vector3());
    let rx = Math.max(span.x / 2 + 1.7, 3), rz = Math.max(span.z / 2 + 1.7, 3);
    const leapers: THREE.Group[] = [];
    if (a.company === 'calf') {
      const calf = spine(5.6, (v) => -8 + 20 * v, 0.12, peak(-0.12));
      const young = s.mesh(calf.geometry(30, 16), body);
      const group = new THREE.Group();
      group.add(young);
      const calfFin = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 4), dark);
      calfFin.position.copy(calf.surface(0.66, Math.PI / 2, 0.04));
      calfFin.scale.z = 0.3;
      group.add(calfFin);
      group.position.set(middle.x + 0.6, 0, middle.z + rz * 0.8);
      group.rotation.y = pose.yaw * 0.3 + 0.2;
      s.root.add(group);
      for (let i = 0; i < 4; i++) s.ball([0.16, 0.16, 0.16], [group.position.x + 1.2 + (random() - 0.5) * 0.4, 0.35 + i * 0.28, group.position.z + (random() - 0.5) * 0.3], white, 8).scale.setScalar(0.12 + i * 0.06);
      rz += 1.6; rx = Math.max(rx, 4);
    } else if (a.company === 'birds') {
      const gull = new THREE.BufferGeometry();
      gull.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, 0.5, 0.16, 0, 0, 0, -0.12, 0.5, 0.16, 0, 1.0, 0.02, -0.1, 0, 0, -0.12, 0, 0, 0.12, 0, 0, -0.12, -0.5, 0.16, 0, -0.5, 0.16, 0, 0, 0, -0.12, -1.0, 0.02, -0.1], 3));
      gull.computeVertexNormals();
      const flock = new THREE.InstancedMesh(gull, new THREE.MeshStandardMaterial({ color: '#f7f7f2', roughness: 0.8, side: THREE.DoubleSide }), 5 + Math.floor(mood.density * 6));
      const dummy = new THREE.Object3D();
      for (let i = 0; i < flock.count; i++) {
        const angle = random() * 6, d = mix(0.3, 0.95, random());
        dummy.position.set(middle.x + Math.cos(angle) * rx * d, Math.max(span.y * mix(0.45, 1.05, random()), 2.2), middle.z + Math.sin(angle) * rz * d);
        dummy.rotation.set((random() - 0.5) * 0.4, random() * 6, (random() - 0.5) * 0.7);
        dummy.scale.setScalar(mix(0.55, 0.85, random()));
        dummy.updateMatrix(); flock.setMatrixAt(i, dummy.matrix);
      }
      flock.castShadow = true;
      s.root.add(flock);
    } else if (a.company === 'dolphins') {
      const grey = new THREE.MeshStandardMaterial({ color: '#7d8a94', roughness: 0.3 });
      for (let i = 0; i < 3; i++) {
        const dolphin = new Sculpture(context);
        const arc = (f: number): [number, number, number] => [Math.cos(mix(2.75, 0.4, f)) * 0.95, Math.sin(mix(2.75, 0.4, f)) * 0.95 - 0.3, 0];
        for (let k = 0; k <= 12; k++) { const f = k / 12, r = 0.2 * Math.sin(Math.min(1, f * 1.15 + 0.08) * Math.PI) ** 0.7 + 0.03; dolphin.ball([r * 1.5, r, r], arc(f), grey, 10).rotation.z = mix(2.75, 0.4, f) - Math.PI / 2; }
        const beakAt = arc(1.04);
        dolphin.ball([0.14, 0.05, 0.05], beakAt, grey, 8).rotation.z = -1.1;
        const top = arc(0.48);
        const fin = dolphin.mesh(new THREE.ConeGeometry(0.12, 0.3, 4), grey, [top[0] - 0.05, top[1] + 0.26, 0]);
        fin.scale.z = 0.25; fin.rotation.z = 0.5;
        const tail = dolphin.mesh(new THREE.ConeGeometry(0.22, 0.2, 4), grey, arc(-0.05));
        tail.scale.x = 0.25; tail.rotation.z = 0.9;
        const angle = 0.5 + i * 1.3 + random() * 0.5;
        dolphin.root.position.set(middle.x + Math.cos(angle) * rx * 0.86, 0, middle.z + Math.sin(angle) * rz * 0.86);
        dolphin.root.rotation.y = -angle + Math.PI / 2 + 0.4;
        s.root.add(dolphin.root);
        leapers.push(dolphin.root);
      }
      rx += 0.6; rz += 0.6;
    }
    waterPatch(s, rx, rz, { rings: 3, foam: 14, at: [middle.x, middle.z] });

    const sway = mix(0.004, 0.02, mood.energy);
    return afloat(s, {
      footprint: Math.max(rx, rz),
      update: (_dt, time) => {
        w.root.rotation.z = Math.sin(time * 0.6) * sway;
        puffs.forEach((puff, i) => puff.scale.setScalar(puff.userData.size * (1 + Math.sin(time * 1.6 + i * 0.7) * 0.07)));
        leapers.forEach((leaper, i) => { leaper.position.y = Math.sin(time * mix(1, 2.4, mood.energy) + i * 2) * 0.18 - 0.05; });
      },
    });
  },
});
