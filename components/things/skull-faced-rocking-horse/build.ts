import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const ROCK_R = 1.3, ARC = 0.5, RAIL_X = 0.17, RAIL = 0.024;
const railY = (z: number) => ROCK_R - Math.sqrt(Math.max(0, (ROCK_R - RAIL) ** 2 - z * z));

export default defineThing({
  questions: {
    face: choice('How much of its face has gone?', {
      chipped: 'Only the muzzle: the nose has flaked back to bone-white and bared the front teeth.',
      half: 'Half: from the eyes forward it is a bare skull, the brow and ears still dapple-grey.',
      bare: 'All of it: a bone-white horse skull on a painted wooden neck, ears gone.',
    }),
    mouth: choice('What is its mouth doing?', {
      gentle: 'Closed and gentle, a patient old toy.',
      bared: 'Lips drawn back, teeth bared.',
      screaming: 'Jaw dropped wide open in a silent whinny.',
    }),
    eye: choice('What is left of its eyes?', {
      amber: 'One amber glass eye, the other socket empty.',
      'wall-eye': 'One pale blue wall-eye, staring.',
      ember: 'No glass at all: a small red glow deep in one socket.',
      hollow: 'Both sockets empty and dark.',
    }),
    mane: choice('What are its mane and tail like?', {
      full: 'Full real horsehair, long and combed.',
      'moth-eaten': 'Moth-eaten: a few lank strands and a stump of tail.',
      none: 'Gone, leaving a row of empty peg holes.',
    }),
    rider: choice('Who is riding it?', {
      none: 'No one. The reins lie slack on its neck.',
      doll: 'A porcelain doll propped in the saddle.',
      ghost: 'A very small sheet ghost, holding on.',
      unseen: 'No one you can see, but the reins are pulled taut in the air and the stirrups are pushed out.',
    }),
    livery: choice('How is it painted and saddled?', {
      fairground: 'Red leather saddle with brass studs on bottle-green rockers.',
      mourning: 'Black saddle and bridle on black rockers.',
      'nursery-blue': 'A powder-blue saddle on cream rockers with a painted line.',
      'bare-wood': 'Cracked tan leather on rockers worn back to bare wood.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;

    // ---- dapple-grey paint over gesso over wood -------------------------------------------
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#6f757f';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 95; i++) {
      const x = random() * 512, y = random() * 512, r = mix(12, 27, random());
      const dapple = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
      dapple.addColorStop(0, 'rgba(214,218,224,0.8)'); dapple.addColorStop(0.7, 'rgba(180,186,194,0.4)'); dapple.addColorStop(1, 'rgba(70,74,82,0)');
      ctx.fillStyle = dapple;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < mix(3, 40, wear); i++) {
      const x = random() * 512, y = random() * 512, r = mix(8, 30, random());
      ctx.fillStyle = '#efe9da';
      ctx.beginPath();
      for (let k = 0; k < 9; k++) ctx.lineTo(x + Math.cos(k * 0.7) * r * mix(0.5, 1.2, random()), y + Math.sin(k * 0.7) * r * mix(0.5, 1.2, random()));
      ctx.fill();
      if (random() < 0.6) { ctx.fillStyle = '#7b5a3c'; ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, 7); ctx.fill(); }
    }
    ctx.strokeStyle = 'rgba(40,36,34,0.7)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < mix(4, 34, wear); i++) {
      let x = random() * 512, y = random() * 512;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (random() - 0.5) * 50; y += random() * 34; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    const coatMap = new THREE.CanvasTexture(canvas);
    coatMap.colorSpace = THREE.SRGBColorSpace;
    coatMap.wrapS = coatMap.wrapT = THREE.RepeatWrapping;
    const coat = new THREE.MeshStandardMaterial({ map: coatMap, roughness: mix(0.35, 0.8, wear) });
    const bone = new THREE.MeshStandardMaterial({ color: new THREE.Color('#ece3c8').lerp(new THREE.Color('#b9ab88'), wear * 0.5), roughness: 0.62 });
    const hollow = new THREE.MeshStandardMaterial({ color: '#0f0c0b', roughness: 1 });
    const tooth = new THREE.MeshStandardMaterial({ color: '#f1e7c4', roughness: 0.35 });
    const brass = s.material('#b9954a', { metalness: 0.85, roughness: 0.3 });
    const livery = {
      fairground: { saddle: '#a3271f', rocker: '#1f4a34', line: '#d8b24a' },
      mourning: { saddle: '#17151a', rocker: '#1a181c', line: '#5c5861' },
      'nursery-blue': { saddle: '#7fa0c4', rocker: '#e6dfc8', line: '#7fa0c4' },
      'bare-wood': { saddle: '#9c7446', rocker: '#8a6a48', line: '#6f5236' },
    }[a.livery];
    const leather = s.material(livery.saddle, { roughness: 0.5 });
    const rockerPaint = s.material(livery.rocker, { roughness: 0.5 });
    const linePaint = s.material(livery.line, { roughness: 0.5 });
    const hair = s.material(['#1d1a1b', '#d9d2bf', '#6b5a48'][Math.floor(random() * 3)], { roughness: 0.95 });

    const horse = new THREE.Group();
    // Stood a little side-on, as a rocking horse is seen across a room.
    const turner = new THREE.Group();
    turner.rotation.y = (random() < 0.5 ? -1 : 1) * mix(0.45, 0.7, random());
    s.root.add(turner);
    turner.add(horse);
    const ball = new THREE.SphereGeometry(1, 20, 14);
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number] = [0, 0, 0], size: [number, number, number] = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.scale.set(...size);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const rod = (parent: THREE.Object3D, from: [number, number, number], to: [number, number, number], r0: number, r1: number, material: THREE.Material, flat = 1) => {
      const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to), along = end.clone().sub(start);
      const mesh = add(parent, new THREE.CylinderGeometry(r1, r0, along.length(), 14), material, start.clone().add(end).multiplyScalar(0.5).toArray() as [number, number, number], [flat, 1, 1]);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.normalize());
      return mesh;
    };
    const tube = (parent: THREE.Object3D, points: [number, number, number][], radius: number, material: THREE.Material) =>
      add(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), points.length * 6, radius, 7), material);

    // ---- rockers --------------------------------------------------------------------------
    for (const x of [-1, 1]) {
      const arc: [number, number, number][] = [];
      for (let i = 0; i <= 16; i++) { const z = Math.sin(mix(-ARC, ARC, i / 16)) * (ROCK_R - RAIL); arc.push([x * RAIL_X, railY(z), z]); }
      const rail = tube(horse, arc, RAIL, rockerPaint);
      rail.scale.set(1, 1, 1);
      tube(horse, arc.map(([px, py, pz]) => [px + x * 0.017, py + 0.006, pz] as [number, number, number]), 0.009, linePaint);
      for (const end of [0, 16]) add(horse, ball, rockerPaint, arc[end], [0.034, 0.034, 0.034]);
    }
    for (const z of [-0.42, 0, 0.42]) add(horse, new THREE.BoxGeometry(RAIL_X * 2 + 0.05, 0.022, 0.07), rockerPaint, [0, railY(z) + 0.03, z]);
    add(horse, new THREE.BoxGeometry(0.2, 0.016, 0.82), rockerPaint, [0, railY(0.2) + 0.048, 0]);

    // ---- body, neck and legs --------------------------------------------------------------
    const BY = 0.62;
    add(horse, ball, coat, [0, BY, 0], [0.16, 0.165, 0.33]);
    add(horse, ball, coat, [0, BY + 0.01, 0.2], [0.15, 0.17, 0.17]);
    add(horse, ball, coat, [0, BY + 0.015, -0.2], [0.165, 0.175, 0.18]);
    rod(horse, [0, BY + 0.02, 0.24], [0, 0.95, 0.4], 0.125, 0.075, coat, 0.72);
    for (const x of [-1, 1]) {
      for (const front of [1, -1]) {
        const footZ = front * (front > 0 ? 0.52 : 0.55), kneeZ = front * (front > 0 ? 0.4 : 0.36);
        const top: [number, number, number] = [x * 0.1, BY - 0.06, front * 0.21];
        const knee: [number, number, number] = [x * 0.14, front > 0 ? 0.38 : 0.36, kneeZ];
        const foot: [number, number, number] = [x * RAIL_X, railY(footZ) + 0.05, footZ];
        rod(horse, top, knee, 0.058, 0.034, coat);
        add(horse, ball, coat, knee, [0.036, 0.036, 0.036]);
        rod(horse, knee, foot, 0.032, 0.024, coat);
        rod(horse, foot, [foot[0], foot[1] - 0.045, foot[2] + front * 0.01], 0.034, 0.03, hollow);
      }
    }

    // ---- saddle and tack ------------------------------------------------------------------
    add(horse, ball, s.material(livery.line, { roughness: 0.8 }), [0, BY + 0.085, -0.02], [0.168, 0.1, 0.22]);
    const seat = add(horse, ball, leather, [0, BY + 0.14, -0.02], [0.13, 0.055, 0.17]);
    add(horse, ball, leather, [0, BY + 0.185, 0.12], [0.06, 0.04, 0.035]);
    add(horse, ball, leather, [0, BY + 0.195, -0.17], [0.11, 0.05, 0.04]);
    for (let i = 0; i < 7; i++) for (const x of [-1, 1]) add(horse, ball, brass, [x * 0.128, BY + 0.125, -0.15 + i * 0.045], [0.008, 0.008, 0.008]);
    add(horse, new THREE.TorusGeometry(0.166, 0.012, 6, 28), leather, [0, BY, 0.05], [1, 1.03, 1]).rotation.y = Math.PI / 2;
    const pushed = a.rider === 'unseen';
    for (const x of [-1, 1]) {
      const strapEnd: [number, number, number] = [x * (pushed ? 0.3 : 0.185), BY - (pushed ? 0.1 : 0.17), pushed ? 0.12 : 0.02 + (random() - 0.5) * 0.04];
      rod(horse, [x * 0.14, BY + 0.11, 0.02], strapEnd, 0.008, 0.008, leather);
      const iron = add(horse, new THREE.TorusGeometry(0.032, 0.006, 6, 16), brass, [strapEnd[0], strapEnd[1] - 0.03, strapEnd[2]]);
      iron.rotation.y = Math.PI / 2;
    }

    // ---- head -----------------------------------------------------------------------------
    const head = new THREE.Group();
    head.position.set(0, 0.965, 0.385);
    head.rotation.set(0.82, (random() - 0.5) * 0.3, 0);
    head.scale.setScalar(1.22);
    horse.add(head);
    const skullAll = a.face === 'bare', skullFront = a.face !== 'chipped';
    const thin = (isBone: boolean) => (isBone ? 0.84 : 1);
    add(head, ball, skullAll ? bone : coat, [0, 0, 0], [0.085 * thin(skullAll), 0.092 * thin(skullAll), 0.115]);
    const snout = (from: number, to: number, r0: number, r1: number, isBone: boolean) => {
      const piece = add(head, new THREE.CylinderGeometry(r1, r0, to - from, 18), isBone ? bone : coat, [0, -0.012, (from + to) / 2], [thin(isBone), 1, 1.12]);
      piece.rotation.x = Math.PI / 2;
    };
    snout(0.04, 0.2, 0.074, 0.058, skullFront);
    snout(0.2, 0.31, 0.058 * (skullFront ? 1 : 0.9), 0.046, true);
    add(head, ball, bone, [0, -0.012, 0.31], [0.046 * 0.84, 0.05, 0.03]);
    if (!skullFront) {
      // The ragged edge where paint and gesso stop.
      for (let i = 0; i < 12; i++) { const angle = i / 12 * 6.283; add(head, ball, new THREE.MeshStandardMaterial({ color: '#f1ecdf', roughness: 0.9 }), [Math.cos(angle) * 0.058, -0.012 + Math.sin(angle) * 0.064, 0.2 + (random() - 0.5) * 0.03], [0.014, 0.014, mix(0.012, 0.03, random())]); }
      for (const x of [-1, 1]) add(head, ball, new THREE.MeshStandardMaterial({ color: '#b02a20', roughness: 0.5 }), [x * 0.03, 0.018, 0.19], [0.014, 0.01, 0.018]);
    } else {
      for (let i = 0; i < 14; i++) { const angle = i / 14 * 6.283; add(head, ball, new THREE.MeshStandardMaterial({ color: '#f1ecdf', roughness: 0.9 }), [Math.cos(angle) * 0.072, Math.sin(angle) * 0.08, (skullAll ? -0.1 : 0.045) + (random() - 0.5) * 0.03], [0.016, 0.016, mix(0.012, 0.03, random())]); }
    }
    // Nasal opening and the long bare bridge of the nose.
    add(head, ball, hollow, [0, 0.036, skullFront ? 0.235 : 0.275], [0.02, 0.014, skullFront ? 0.055 : 0.03]);
    if (skullFront) for (const x of [-1, 1]) add(head, ball, hollow, [x * 0.045, -0.02, 0.12], [0.008, 0.02, 0.04]);
    // Ears, or their stumps.
    for (const x of [-1, 1]) {
      if (skullAll) { add(head, ball, hollow, [x * 0.045, 0.07, -0.05], [0.012, 0.008, 0.012]); continue; }
      const ear = add(head, new THREE.ConeGeometry(0.026, 0.085, 8), coat, [x * 0.045, 0.105, -0.055], [1, 1, 0.55]);
      ear.rotation.set(-0.5, 0, -x * 0.2);
    }
    // Sockets: one keeps its glass, the other is always empty.
    const keeper = random() < 0.5 ? -1 : 1;
    let ember: THREE.MeshStandardMaterial | null = null;
    for (const x of [-1, 1]) {
      const at: [number, number, number] = [x * 0.066 * thin(skullAll), 0.022, 0.045];
      add(head, ball, hollow, at, [0.024, 0.036, 0.04]);
      const orbit = add(head, new THREE.TorusGeometry(0.036, skullFront ? 0.009 : 0.005, 6, 18), skullFront ? bone : coat, [at[0] + x * 0.012, at[1], at[2]]);
      orbit.rotation.y = Math.PI / 2 - x * 0.25;
      if (x !== keeper || a.eye === 'hollow') continue;
      if (a.eye === 'ember') {
        ember = new THREE.MeshStandardMaterial({ color: '#ff5a2a', emissive: '#ff3a10', emissiveIntensity: 2.4, roughness: 0.4 });
        add(head, ball, ember, [at[0] + x * 0.012, at[1], at[2]], [0.009, 0.009, 0.009]).castShadow = false;
      } else {
        add(head, ball, new THREE.MeshStandardMaterial({ color: a.eye === 'amber' ? '#a8621a' : '#b9d2e2', roughness: 0.08 }), [at[0] + x * 0.012, at[1], at[2]], [0.022, 0.024, 0.024]);
        add(head, ball, hollow, [at[0] + x * 0.03, at[1], at[2] + 0.003], [0.008, a.eye === 'amber' ? 0.013 : 0.007, a.eye === 'amber' ? 0.016 : 0.007]);
      }
    }
    // Jaw and teeth.
    const open = { gentle: 0.02, bared: 0.2, screaming: 0.62 }[a.mouth];
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.05, 0.0);
    jaw.rotation.x = open;
    head.add(jaw);
    const jawBone = skullFront ? bone : coat;
    const mandible = add(jaw, new THREE.CylinderGeometry(0.03, 0.05, 0.29, 14), jawBone, [0, -0.032, 0.15], [thin(skullFront) * 1.1, 1, 0.52]);
    mandible.rotation.x = Math.PI / 2;
    add(jaw, ball, jawBone, [0, -0.005, 0.01], [0.062 * thin(skullFront), 0.06, 0.05]);
    if (!skullFront) add(jaw, ball, bone, [0, -0.03, 0.29], [0.032, 0.018, 0.03]);
    const showTeeth = skullFront || a.mouth !== 'gentle';
    for (const upper of [true, false]) {
      const holder = upper ? head : jaw;
      const y = upper ? -0.072 : -0.008;
      for (let i = -2; i <= 2; i++) add(holder, new THREE.BoxGeometry(0.011, 0.022, 0.011), tooth, [i * 0.0125, y + (upper ? 0 : -0.004), (upper ? 0.325 : 0.3) - Math.abs(i) * 0.005]);
      if (showTeeth) for (const x of [-1, 1]) for (let i = 0; i < 5; i++) add(holder, new THREE.BoxGeometry(0.012, 0.02, 0.021), tooth, [x * (0.04 - (upper ? 0 : 0.004)), y + 0.004, 0.09 + i * 0.024]);
    }
    if (a.mouth !== 'gentle') add(head, ball, new THREE.MeshStandardMaterial({ color: skullFront ? '#1a1210' : '#7a1c18', roughness: 0.8 }), [0, -0.07, 0.17], [0.03, 0.012, 0.11]);
    // Bridle.
    add(head, new THREE.TorusGeometry(0.066, 0.007, 6, 22), leather, [0, -0.03, 0.17], [thin(skullFront), 1.3, 1]);
    const browband = add(head, new THREE.TorusGeometry(0.09, 0.007, 6, 22), leather, [0, -0.02, -0.02], [thin(skullAll), 1.25, 1]);
    browband.rotation.x = 0.35;
    const bit: THREE.Vector3[] = [];
    for (const x of [-1, 1]) {
      const ring = add(head, new THREE.TorusGeometry(0.02, 0.005, 6, 14), brass, [x * 0.062 * thin(skullFront), -0.062, 0.17]);
      ring.rotation.y = Math.PI / 2;
      bit.push(ring.position.clone());
    }

    // ---- mane and tail --------------------------------------------------------------------
    const maneSide = random() < 0.5 ? -1 : 1;
    const crest = (t: number): [number, number, number] => [0, mix(BY + 0.16, 0.99, t) + Math.sin(t * Math.PI) * 0.03, mix(0.14, 0.33, t)];
    if (a.mane === 'none') {
      for (let i = 0; i < 9; i++) add(horse, ball, hollow, crest(i / 8), [0.008, 0.008, 0.008]);
      add(horse, ball, hollow, [0, BY + 0.07, -0.375], [0.016, 0.016, 0.008]);
    } else {
      const strands = a.mane === 'full' ? 22 : 6;
      for (let i = 0; i < strands; i++) {
        const t = a.mane === 'full' ? i / (strands - 1) : random();
        const [x, y, z] = crest(t);
        const length = (a.mane === 'full' ? mix(0.16, 0.26, random()) : mix(0.06, 0.2, random()));
        const out = maneSide * mix(0.07, 0.1, random());
        tube(horse, [[x, y, z], [x + out, y - length * 0.3, z - 0.01], [x + out * 1.15, y - length, z + (random() - 0.5) * 0.04]], a.mane === 'full' ? 0.011 : 0.006, hair);
      }
      if (a.mane === 'full' && !skullAll) for (let i = -1; i <= 1; i++) tube(head, [[i * 0.02, 0.09, -0.02], [i * 0.028, 0.085, 0.06], [i * 0.035, 0.05, 0.12 + random() * 0.03]], 0.009, hair);
      const tails = a.mane === 'full' ? 9 : 3;
      for (let i = 0; i < tails; i++) {
        const spread = (i / Math.max(tails - 1, 1) - 0.5) * 0.12, drop = a.mane === 'full' ? mix(0.4, 0.52, random()) : mix(0.08, 0.2, random());
        tube(horse, [[0, BY + 0.07, -0.36], [spread * 0.5, BY + 0.1, -0.46], [spread, BY + 0.07 - drop * 0.5, -0.54 - random() * 0.04], [spread * 1.2, BY + 0.07 - drop, -0.52 + (random() - 0.5) * 0.06]], a.mane === 'full' ? 0.013 : 0.007, hair);
      }
      add(horse, ball, hair, [0, BY + 0.07, -0.37], [0.026, 0.026, 0.02]);
    }

    // ---- reins and rider ------------------------------------------------------------------
    s.root.updateMatrixWorld(true);
    const hands: [number, number, number] = a.rider === 'unseen' ? [0, BY + 0.36, 0.02] : a.rider === 'doll' ? [0, BY + 0.27, 0.07] : a.rider === 'ghost' ? [0, BY + 0.28, 0.08] : [0, BY + 0.2, 0.12];
    bit.forEach((local, index) => {
      const from = horse.worldToLocal(head.localToWorld(local.clone()));
      const side = index ? 1 : -1;
      const slack = a.rider === 'none' ? 0.1 : a.rider === 'unseen' ? -0.02 : 0.03;
      tube(horse, [from.toArray() as [number, number, number], [side * 0.07, mix(from.y, hands[1], 0.5) - slack, mix(from.z, hands[2], 0.5)], [side * 0.03, hands[1], hands[2]]], 0.006, leather);
    });
    if (a.rider === 'unseen') {
      seat.scale.y = 0.035;
      add(horse, ball, new THREE.MeshStandardMaterial({ color: new THREE.Color(livery.saddle).multiplyScalar(0.45), roughness: 0.8 }), [0, BY + 0.165, -0.03], [0.085, 0.012, 0.1]);
    }
    if (a.rider === 'doll') {
      const dress = s.material(mood.cheer < 0.35 ? '#2a2630' : '#e9e2d0', { roughness: 0.9 });
      const bisque = new THREE.MeshStandardMaterial({ color: '#f0d6c6', roughness: 0.4 });
      const doll = new THREE.Group();
      doll.position.set(0, BY + 0.17, -0.04);
      doll.rotation.set(mix(-0.05, 0.3, random()), 0, (random() - 0.5) * 0.3);
      horse.add(doll);
      add(doll, new THREE.ConeGeometry(0.1, 0.17, 16), dress, [0, 0.07, 0]);
      add(doll, ball, dress, [0, 0.13, 0], [0.045, 0.05, 0.04]);
      add(doll, ball, bisque, [0, 0.215, 0.005], [0.048, 0.05, 0.046]);
      add(doll, new THREE.SphereGeometry(1, 16, 10, 0, 6.283, 0, 1.5), s.material('#7c4a25', { roughness: 0.95 }), [0, 0.22, -0.006], [0.052, 0.054, 0.052]).rotation.x = -0.5;
      for (const x of [-1, 1]) {
        add(doll, ball, hollow, [x * 0.018, 0.222, 0.047], [0.007, 0.009, 0.005]);
        rod(doll, [x * 0.045, 0.155, 0], [x * 0.03, 0.105, 0.105], 0.012, 0.01, bisque);
        rod(doll, [x * 0.05, 0.02, 0.02], [x * 0.17, -0.03, 0.08], 0.014, 0.012, bisque);
        add(doll, ball, hollow, [x * 0.175, -0.035, 0.09], [0.016, 0.016, 0.026]);
      }
      add(doll, ball, new THREE.MeshStandardMaterial({ color: '#a82a32', roughness: 0.5 }), [0, 0.196, 0.046], [0.01, 0.005, 0.004]);
    }
    if (a.rider === 'ghost') {
      const sheet = new THREE.MeshStandardMaterial({ color: '#eef1f3', roughness: 0.95, emissive: '#9fb3cc', emissiveIntensity: 0.3, side: THREE.DoubleSide });
      const ghost = new THREE.Group();
      ghost.position.set(0, BY + 0.15, -0.04);
      ghost.rotation.set(0.12, (random() - 0.5) * 0.5, (random() - 0.5) * 0.2);
      horse.add(ghost);
      const drape = new THREE.LatheGeometry([[0.001, 0.34], [0.045, 0.325], [0.07, 0.28], [0.072, 0.23], [0.066, 0.2], [0.1, 0.14], [0.135, 0.06], [0.16, -0.02]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
      const position = drape.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const y = position.getY(i), fold = 1 + Math.sin(Math.atan2(position.getZ(i), position.getX(i)) * 7) * 0.1 * Math.max(0, (0.2 - y) / 0.22);
        position.setX(i, position.getX(i) * fold); position.setZ(i, position.getZ(i) * fold);
      }
      drape.computeVertexNormals();
      add(ghost, drape, sheet);
      for (const x of [-1, 1]) {
        add(ghost, ball, hollow, [x * 0.026, 0.275, 0.064], [0.012, 0.017, 0.006]);
        add(ghost, ball, sheet, [x * 0.07, 0.15, 0.1], [0.03, 0.03, 0.045]);
      }
    }

    // ---- rocking --------------------------------------------------------------------------
    const settle = (theta: number) => {
      horse.rotation.x = theta;
      horse.position.set(0, ROCK_R - ROCK_R * Math.cos(theta), ROCK_R * theta - ROCK_R * Math.sin(theta));
    };
    const rest = (random() - 0.5) * 0.12 + (a.rider === 'unseen' ? -0.08 : 0);
    settle(rest);
    const swing = mix(0, 0.2, mood.energy) + (a.rider === 'unseen' ? 0.04 : 0), phase = random() * 6;
    const glow = ember;
    return s.finish({
      footprint: 0.55,
      update: (_dt, time) => {
        settle(rest + Math.sin(time * 2.1 + phase) * swing);
        if (glow) glow.emissiveIntensity = 2 + Math.sin(time * 5 + phase) * 0.8;
      },
    });
  },
});
