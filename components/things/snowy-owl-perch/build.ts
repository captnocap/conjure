import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { Batch, blend, paint, type P3 } from './tundra';

function featherTexture(plumage: 'male' | 'female' | 'juvenile', random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = plumage === 'juvenile' ? '#d9d5cb' : '#f6f4ee';
  ctx.fillRect(0, 0, 512, 512);
  const chance = { male: 0.14, female: 0.8, juvenile: 1 }[plumage];
  ctx.strokeStyle = plumage === 'male' ? 'rgba(80,72,64,0.55)' : '#40372f';
  ctx.lineCap = 'round';
  for (let row = 0; row < 15; row++) {
    const y = 60 + row * 30;
    for (let i = 0; i < 13; i++) {
      const x = (i + (row % 2) * 0.5) * 40 + (random() - 0.5) * 10, u = (x / 512 + 1) % 1;
      const bib = (u < 0.14 || u > 0.86) && y < 300;
      if (bib || random() > chance) continue;
      ctx.lineWidth = plumage === 'juvenile' ? 9 : 6;
      ctx.beginPath();
      ctx.ellipse(x, y, 13, 7, 0, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    perch: choice('What is the owl sitting on?', {
      hummock: 'A frost-heaved hummock of rusty sedge.',
      stake: 'A leaning wooden survey stake with faded red and white bands.',
      drum: 'A rusted fuel drum half sunk in the ground.',
      snow: 'The wind-carved crest of a snowdrift.',
      cairn: 'A small cairn of lichen-spotted stones.',
    }),
    plumage: choice('What is its plumage like?', {
      male: 'Almost pure white, an old male, a ghost.',
      female: 'White scalloped all over with dark bars.',
      juvenile: 'Dusky and heavily barred, a young bird with a white face.',
    }),
    pose: choice('How is it sitting?', {
      hunched: 'Hunched low and round against the wind.',
      upright: 'Tall and upright, alert.',
      shoulder: 'Back to the viewer, head swivelled right round over its shoulder.',
      lifting: 'Wings half open, about to lift off.',
    }),
    gaze: choice('How does it look at the viewer?', {
      straight: 'Dead straight, a level unblinking stare.',
      tilted: 'Head cocked to one side, curious.',
      aside: 'Turned partly away, watching something far off.',
    }),
    eyes: choice('What are its eyes doing?', {
      wide: 'Wide open, round and yellow.',
      narrowed: 'Narrowed to yellow slits, unimpressed.',
      wink: 'One open, one closed.',
      asleep: 'Both shut, dozing in the low sun.',
    }),
    feet: choice('What is at its feet?', {
      nothing: 'Nothing.',
      lemming: 'A lemming pinned under one foot.',
      pellets: 'Grey pellets and a few dropped white feathers: it sits here often.',
      nest: 'A scrape with pale eggs and one fluffy grey chick.',
    }),
    frost: noul('Is the perch rimed with frost?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const white = blend('#f6f4ee', '#d8d2c4', mood.wear * 0.5);
    const frost = a.frost ? 0.55 : 0;
    const perch = new Batch();
    let seat: P3 = [0, 0.4, 0];

    const tufts = (count: number, radius: number, heightAt: (x: number, z: number) => number, cx = 0, cz = 0) => {
      for (let i = 0; i < count; i++) {
        const t = random() * 6.283, d = Math.sqrt(random()) * radius, x = cx + Math.cos(t) * d, z = cz + Math.sin(t) * d * 0.85;
        if (Math.hypot(x - seat[0], z - seat[2]) < 0.16) continue;
        const y = heightAt(x, z), lean = (random() - 0.5) * 0.16;
        perch.rod([x, y - 0.03, z], [x + lean, y + 0.12 + random() * 0.16, z + (random() - 0.5) * 0.12], 0.018, 0.003, blend(blend('#b9702a', '#c9a23e', random()), '#eef2f2', frost * random()), 4);
      }
    };
    const dome = (r: number, h: number) => (x: number, z: number) => h * Math.sqrt(Math.max(0, 1 - (x * x + z * z) / (r * r)));

    if (a.perch === 'hummock') {
      perch.ball([0.62, 0.38, 0.52], [0, 0, 0], blend(blend('#8a5a2c', '#6d6a3a', random()), '#e8eeee', frost * 0.6), undefined, 14);
      perch.ball([0.3, 0.2, 0.26], [0.5, 0, 0.22], blend('#7a5230', '#e8eeee', frost * 0.6), undefined, 10);
      seat = [0, 0.37, 0];
      tufts(70, 0.6, dome(0.62, 0.38));
    } else if (a.perch === 'stake') {
      const lean = mix(0.12, 0.3, mix(random(), 1, mood.wear * 0.5)), len = 1.25;
      const tip: P3 = [Math.sin(lean) * len, Math.cos(lean) * len, 0];
      const bands = 7;
      for (let i = 0; i < bands; i++) {
        const f = (i + 0.5) / bands;
        perch.box([0.085, len / bands + 0.005, 0.085], [tip[0] * f, tip[1] * f, 0], blend(i % 2 ? '#b8322a' : '#e6e0d0', '#8b8275', mix(0.15, 0.7, mood.wear)), [0, 0, -lean]);
      }
      perch.box([0.16, 0.1, 0.012], [tip[0] * 0.72 + 0.01, tip[1] * 0.72, 0.05], '#a9aeb0', [0, 0, -lean]);
      perch.ball([0.34, 0.14, 0.3], [0, 0, 0], blend('#6f5230', '#e8eeee', frost * 0.6), undefined, 10);
      seat = [tip[0], tip[1] - 0.01, 0];
      tufts(26, 0.34, dome(0.34, 0.14));
    } else if (a.perch === 'drum') {
      const rustTint = blend('#8b4a28', '#3f6a8c', random() < 0.4 ? 0.5 : 0);
      perch.drum(0.29, 0.88, [0, 0.16, 0], blend(rustTint, '#e8eeee', frost * 0.4), [Math.PI / 2 + 0.12, 0, Math.PI / 2 - 0.5], 14);
      for (const k of [-0.28, 0, 0.28]) perch.add(new THREE.TorusGeometry(0.295, 0.014, 4, 14), '#5c3620', new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.PI / 2 + 0.12, 0, Math.PI / 2 - 0.5)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).setPosition(k * Math.cos(0.5), 0.16 + k * 0.1, -k * Math.sin(0.5) * 1.0));
      seat = [0, 0.44, 0];
      tufts(22, 0.55, () => 0);
    } else if (a.perch === 'snow') {
      perch.ball([0.6, 0.42, 0.42], [0, 0, 0], '#f4f6f6', [0, 0.3, 0], 14);
      perch.ball([0.42, 0.2, 0.32], [-0.45, 0, 0.15], '#e6edf0', [0, 0.3, 0], 12);
      perch.ball([0.32, 0.12, 0.25], [0.48, 0, -0.1], '#e6edf0', undefined, 10);
      seat = [0, 0.41, 0];
      for (let i = 0; i < 6; i++) perch.rod([0.3 + random() * 0.4, 0.05, 0.25 + random() * 0.2], [0.35 + random() * 0.4, 0.3 + random() * 0.15, 0.3 + random() * 0.2], 0.012, 0.003, '#b9702a', 3);
    } else {
      const stone = () => blend(blend('#8d8a84', '#5f5c57', random()), '#b9a94a', random() < 0.3 ? 0.35 : 0);
      for (let i = 0; i < 12; i++) {
        const lvl = i < 6 ? 0 : i < 10 ? 1 : 2, n = [6, 4, 2][lvl], k = lvl === 0 ? i : lvl === 1 ? i - 6 : i - 10;
        const t = (k / n) * 6.283 + lvl, r = [0.32, 0.18, 0.06][lvl], size = 0.2 - lvl * 0.03 + random() * 0.05;
        perch.ball([size, size * 0.6, size * 0.85], [Math.cos(t) * r, 0.1 + lvl * 0.2, Math.sin(t) * r], blend(stone(), '#eef2f2', frost * 0.5), [0, random() * 3, random() * 0.3], 7);
      }
      perch.ball([0.2, 0.07, 0.17], [0, 0.6, 0], blend(stone(), '#eef2f2', frost * 0.5), undefined, 7);
      seat = [0, 0.66, 0];
      tufts(18, 0.6, () => 0);
    }

    // Things at its feet.
    const sideways: P3 = a.perch === 'stake' ? [0.3, 0.1, 0.2] : [seat[0] + 0.28, seat[1] - 0.08, seat[2] + 0.2];
    if (a.feet === 'pellets') {
      for (let i = 0; i < 5; i++) perch.ball([0.035, 0.022, 0.022], [sideways[0] + (random() - 0.5) * 0.3, sideways[1] + 0.02, sideways[2] + (random() - 0.3) * 0.25], '#5c564f', [0, random() * 3, 0], 6);
      for (let i = 0; i < 4; i++) perch.box([0.09, 0.004, 0.03], [sideways[0] + (random() - 0.5) * 0.4, sideways[1] + 0.03, sideways[2] + (random() - 0.3) * 0.3], '#fbfaf6', [random() * 0.4, random() * 3, 0]);
    } else if (a.feet === 'nest') {
      const [nx, ny, nz] = a.perch === 'stake' ? [0.32, 0.08, 0.25] : [seat[0] - 0.3, seat[1] - 0.1, seat[2] + 0.22];
      perch.add(new THREE.TorusGeometry(0.13, 0.04, 5, 12), '#7a6a4a', new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(nx, ny + 0.02, nz));
      for (const [dx, dz] of [[-0.04, 0.02], [0.05, 0.04]]) perch.ball([0.032, 0.04, 0.032], [nx + dx, ny + 0.05, nz + dz], '#f1ecdc', [0.6, 0, 0], 7);
      perch.ball([0.055, 0.06, 0.055], [nx + 0.01, ny + 0.08, nz - 0.05], '#9b978f', undefined, 8);
      perch.ball([0.04, 0.04, 0.04], [nx + 0.01, ny + 0.15, nz - 0.03], '#b5b1a8', undefined, 7);
      perch.rod([nx + 0.01, ny + 0.15, nz + 0.005], [nx + 0.01, ny + 0.14, nz + 0.03], 0.012, 0.003, '#2a2622', 4);
    }
    s.root.add(perch.mesh(paint(mood.wear)));

    // The owl.
    const owl = new THREE.Group();
    const hunched = a.pose === 'hunched', tall = a.pose === 'upright' || a.pose === 'lifting';
    const stretch = tall ? 1.12 : hunched ? 0.9 : 1, girth = hunched ? 1.12 : tall ? 0.94 : 1;
    const map = featherTexture(a.plumage, random);
    const feathers = new THREE.MeshStandardMaterial({ map, color: white, roughness: 0.95 });
    const profile = ([[0.001, 0], [0.09, 0.005], [0.155, 0.07], [0.185, 0.19], [0.178, 0.3], [0.15, 0.4], [0.115, 0.47], [0.06, 0.52], [0.001, 0.54]] as const).map(([r, y]) => new THREE.Vector2(r * girth, y * stretch));
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), feathers);
    body.scale.z = 0.92;
    body.castShadow = body.receiveShadow = true;
    owl.add(body);
    const wingGeometry = new THREE.SphereGeometry(1, 14, 10);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(wingGeometry, feathers);
      wing.castShadow = true;
      if (a.pose === 'lifting') {
        wing.scale.set(0.36, 0.035, 0.17);
        wing.position.set(side * 0.44, 0.42 * stretch, -0.04);
        wing.rotation.set(0.25, side * 0.25, side * 0.5);
      } else {
        wing.scale.set(0.05, 0.17 * stretch, 0.125);
        wing.position.set(side * 0.165 * girth, 0.2 * stretch, -0.035);
        wing.rotation.set(-0.22, 0, side * 0.1);
      }
      owl.add(wing);
    }
    const trim = new Batch();
    if (a.pose === 'lifting') for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
      const from: P3 = [side * (0.6 + i * 0.03), 0.52 * stretch + i * 0.012, -0.14 + i * 0.045];
      trim.box([0.2, 0.008, 0.04], [from[0] + side * 0.1, from[1] + 0.05, from[2]], i % 2 && a.plumage !== 'male' ? '#5a5048' : white, [0, side * (0.5 - i * 0.2), side * 0.5]);
    }
    trim.box([0.16, 0.02, 0.2], [0, 0.07, -0.19], white, [0.55, 0, 0]);
    if (a.plumage !== 'male') for (let i = 0; i < 3; i++) trim.box([0.165, 0.022, 0.025], [0, 0.1 - i * 0.035, -0.15 - i * 0.055], '#4a4038', [0.55, 0, 0]);
    for (const side of [-1, 1]) {
      trim.ball([0.05, 0.035, 0.065], [side * 0.065, 0.02, 0.07], white, undefined, 8);
      for (let k = -1; k <= 1; k++) trim.rod([side * 0.065 + k * 0.025, 0.012, 0.12], [side * 0.065 + k * 0.03, -0.012, 0.155], 0.009, 0.002, '#1c1a18', 4);
    }
    if (a.feet === 'lemming') {
      trim.ball([0.035, 0.03, 0.065], [0.065, 0.0, 0.125], '#8a623e', undefined, 8);
      trim.ball([0.022, 0.02, 0.025], [0.065, 0.005, 0.185], '#7a5536', undefined, 6);
      trim.rod([0.065, 0, 0.065], [0.09, -0.01, 0.03], 0.005, 0.002, '#5c4030', 3);
    }
    const flat = paint(mood.wear * 0.3, { roughness: 0.95 });
    owl.add(trim.mesh(flat));

    // Head: round, no ear tufts, the face always white.
    const head = new THREE.Group();
    const face = new Batch();
    face.ball([0.125, 0.112, 0.12], [0, 0, 0], white, undefined, 18);
    if (a.plumage !== 'male') for (let i = 0; i < 16; i++) {
      const t = random() * 6.283, up = 0.3 + random() * 0.6, r = Math.sqrt(1 - up * up);
      if (Math.cos(t) * r > 0.35) continue;
      face.ball([0.014, 0.006, 0.01], [Math.sin(t) * r * 0.125, up * 0.112, Math.cos(t) * r * 0.12], '#4a4038', [0, t, 0], 5);
    }
    for (const side of [-1, 1]) {
      const ex = side * 0.05, ey = 0.012, ez = 0.098;
      const shut = a.eyes === 'asleep' || (a.eyes === 'wink' && side === 1);
      face.ball([0.043, 0.043, 0.016], [ex, ey, ez], '#2a2622', undefined, 10);
      if (shut) {
        face.ball([0.04, 0.04, 0.02], [ex, ey, ez + 0.006], white, undefined, 10);
        face.rod([ex - 0.028, ey - 0.006, ez + 0.026], [ex + 0.028, ey - 0.006, ez + 0.026], 0.004, 0.004, '#2a2622', 4);
      } else {
        face.ball([0.036, 0.036, 0.02], [ex, ey, ez + 0.008], '#f5c211', undefined, 12);
        face.ball([0.017, 0.017, 0.012], [ex, ey, ez + 0.022], '#0f0e0d', undefined, 8);
        face.ball([0.004, 0.004, 0.004], [ex + 0.008, ey + 0.008, ez + 0.033], '#ffffff', undefined, 5);
        if (a.eyes === 'narrowed') {
          face.ball([0.044, 0.024, 0.026], [ex, ey + 0.028, ez + 0.01], white, [0, 0, side * -0.25], 10);
          face.ball([0.044, 0.018, 0.026], [ex, ey - 0.031, ez + 0.01], white, undefined, 10);
        }
      }
      face.ball([0.032, 0.03, 0.028], [side * 0.026, -0.04, 0.095], white, undefined, 8);
    }
    face.rod([0, -0.012, 0.118], [0, -0.062, 0.127], 0.017, 0.003, '#24211e', 5);
    head.add(face.mesh(flat));
    head.position.set(0, 0.5 * stretch + (hunched ? -0.035 : 0), hunched ? 0.035 : 0.015);
    owl.add(head);

    const bodyYaw = a.pose === 'shoulder' ? Math.PI * 0.82 * (random() < 0.5 ? -1 : 1) : (random() - 0.5) * 0.7;
    const gazeYaw = a.gaze === 'aside' ? (random() < 0.5 ? -1 : 1) * 0.75 : 0.1;
    const tilt = a.gaze === 'tilted' ? (random() < 0.5 ? -1 : 1) * 0.42 : (random() - 0.5) * 0.08;
    owl.rotation.y = bodyYaw;
    owl.rotation.x = 0;
    const lean = hunched ? 0.2 : a.pose === 'lifting' ? 0.28 : 0.04;
    body.rotation.x = lean;
    head.position.z += Math.sin(lean) * 0.5;
    head.position.y -= (1 - Math.cos(lean)) * 0.5;
    // The head always ends up facing the viewer whatever the body does.
    const headYaw = -bodyYaw + gazeYaw;
    head.rotation.set(0, headYaw, tilt, 'YXZ');
    const size = mix(1.25, 1.45, random());
    owl.scale.setScalar(size);
    owl.position.set(seat[0], seat[1], seat[2]);
    s.root.add(owl);

    const speed = mix(0.15, 1.2, mood.energy);
    const thing = s.finish({
      update: (_dt, time) => {
        const swivel = a.eyes === 'asleep' ? 0 : Math.sin(time * speed * 0.5) * Math.sin(time * speed * 0.17) * 0.5;
        head.rotation.y = headYaw + swivel;
        head.rotation.z = tilt + Math.sin(time * speed * 0.9) * 0.03;
      },
    });
    const dispose = thing.dispose;
    return { ...thing, dispose: () => { map.dispose(); dispose(); } };
  },
});
