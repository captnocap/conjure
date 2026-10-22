import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    layout: choice('How are the prisms arranged?', {
      grid: 'A square tray of a hundred small prisms in neat rows.',
      hex: 'A round honeycomb disc of close-packed prisms.',
      twin: 'Two long panels side by side, hundreds of prisms, the big expensive version.',
      ring: 'A sparse ring of a dozen large prisms around an open centre.',
    }),
    tilt: score('How steeply is the tray tilted?', ['Lying almost flat, facing straight up', 'Leaning back gently', 'Tipped up like a lectern', 'Propped steeply toward the horizon']),
    stand: choice('What holds it up?', {
      legs: 'Four thin levelling legs with little footpads.',
      pallet: 'A flat pallet on the ground with a rear prop.',
      post: 'A single post on a small tripod, with a ball joint.',
      rocks: 'It has been propped on a pile of stones, improvised.',
    }),
    glass: choice('What do the prisms look like?', {
      clear: 'Clear silver-blue glass, like drops of water.',
      gold: 'Gold-backed, warm and coppery.',
      rainbow: 'Iridescent, each one a different colour of oil-film.',
      amber: 'Deep amber, darkened by centuries of radiation.',
    }),
    condition: choice('What has happened to it?', {
      clean: 'Nothing: it is as clean and square as the day it was set down.',
      covered: 'The dust cover was only half pulled off, and still hangs over part of the tray.',
      drifted: 'Dust has drifted up over its lower edge and filmed the glass.',
      struck: 'A micrometeorite has punched a hole through it and cracked the prisms around.',
    }),
    beam: choice('Is a laser striking it?', {
      none: 'No. It waits.',
      green: 'A pencil-thin green beam comes down out of the sky and hits it square.',
      red: 'A deep red beam, steady and fixed.',
      pulses: 'Short bright pulses arrive one after another, and go back the way they came.',
    }),
    left: choice('What was left beside it?', {
      nothing: 'Nothing.',
      prints: 'A ring of bootprints where someone stood to level it.',
      tag: 'A pulled safety pin on a red REMOVE BEFORE FLIGHT ribbon.',
      spare: 'A second, smaller reflector set down next to it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const film = (a.condition === 'drifted' ? 0.5 : 0.05) + mood.wear * 0.3;
    const grime = new THREE.Color('#8d8982');
    const tone = (hex: string, extra = 1) => new THREE.Color(hex).lerp(grime, Math.min(0.85, film * extra));
    const metal = new THREE.MeshStandardMaterial({ color: tone('#c4c8cb'), metalness: 0.75 * (1 - film), roughness: mix(0.35, 0.9, film) });
    const dark = new THREE.MeshStandardMaterial({ color: tone('#2a2d31', 0.6), roughness: 0.7 });
    const goldFoil = new THREE.MeshStandardMaterial({ color: tone('#d2a43c'), metalness: 0.8 * (1 - film), roughness: 0.4 });

    // --- Where the prisms go -------------------------------------------------------------------
    const cells: { x: number; z: number; r: number }[] = [];
    let trayW = 0.66, trayD = 0.66, round = false;
    if (a.layout === 'grid') { for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) cells.push({ x: (i - 4.5) * 0.06, z: (j - 4.5) * 0.06, r: 0.023 }); }
    else if (a.layout === 'hex') { round = true; for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) { const x = (i + (j % 2 ? 0.5 : 0)) * 0.06, z = j * 0.052; if (Math.hypot(x, z) < 0.3) cells.push({ x, z, r: 0.024 }); } }
    else if (a.layout === 'twin') { trayW = 1.1; trayD = 0.62; for (const side of [-1, 1]) for (let i = 0; i < 9; i++) for (let j = 0; j < 11; j++) cells.push({ x: side * 0.28 + (i - 4) * 0.05, z: (j - 5) * 0.05, r: 0.019 }); }
    else { round = true; for (let i = 0; i < 14; i++) { const t = (i / 14) * Math.PI * 2; cells.push({ x: Math.cos(t) * 0.24, z: Math.sin(t) * 0.24, r: 0.045 }); } }

    const tray = new Sculpture(context);
    const T = tray.root;
    if (round) {
      tray.cylinder(0.33, 0.33, 0.07, [0, 0, 0], metal, 40);
      tray.cylinder(0.345, 0.345, 0.02, [0, 0.03, 0], dark, 40);
      if (a.layout === 'ring') { tray.cylinder(0.15, 0.15, 0.074, [0, 0, 0], dark, 28); tray.cylinder(0.05, 0.06, 0.05, [0, 0.05, 0], goldFoil, 14); }
    } else {
      tray.box([trayW, 0.07, trayD], [0, 0, 0], metal);
      tray.box([trayW + 0.03, 0.02, trayD + 0.03], [0, 0.03, 0], dark);
      if (a.layout === 'twin') tray.box([0.04, 0.085, trayD], [0, 0, 0], dark);
    }
    tray.box([round ? 0.6 : trayW - 0.04, 0.012, round ? 0.6 : trayD - 0.04], [0, 0.0355, 0], metal).visible = !round;
    if (round) tray.cylinder(0.32, 0.32, 0.012, [0, 0.0355, 0], metal, 40);

    // Which prisms are dead: hidden under the cover, cracked by the strike, or randomly dulled by age.
    const coverEdge = a.condition === 'covered' ? mix(-0.08, 0.12, random()) : -9;
    const strike = { x: (random() - 0.5) * trayW * 0.5, z: (random() - 0.5) * trayD * 0.5 };
    const palette = { clear: ['#bfe3f5', '#8fc4e8', '#e6f6ff'], gold: ['#e3a54a', '#c9772e', '#f4cf7a'], rainbow: ['#7ad7e0', '#e07ab8', '#e6d36a', '#8f8ae6', '#7be08c'], amber: ['#b5651d', '#8a4513', '#d48a2c'] }[a.glass];
    const glassMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.55, roughness: 0.12, emissive: new THREE.Color(palette[0]), emissiveIntensity: 0.18 * (1 - film) });
    const live = cells.filter((cell) => cell.x > coverEdge);
    const discs = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 14), glassMaterial, live.length);
    const sockets = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 14), dark, live.length);
    const spokeParts = [0, 1, 2].map((k) => new THREE.BoxGeometry(0.1, 1, 0.9).translate(0, 0, 0.45).rotateY((k * Math.PI * 2) / 3));
    const spokes = new THREE.InstancedMesh(mergeGeometries(spokeParts)!, new THREE.MeshStandardMaterial({ color: '#20262c', roughness: 0.4, metalness: 0.4 }), live.length);
    for (const part of spokeParts) part.dispose();
    const matrix = new THREE.Matrix4(), spin = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), colour = new THREE.Color();
    const base: THREE.Color[] = [];
    live.forEach((cell, i) => {
      const cracked = a.condition === 'struck' && Math.hypot(cell.x - strike.x, cell.z - strike.z) < 0.13;
      const dead = cracked || random() < mood.wear * 0.18;
      colour.set(palette[Math.floor(random() * palette.length)]).lerp(grime, Math.min(0.8, film * 1.2));
      if (dead) colour.set(cracked ? '#17191b' : '#6f6c66');
      base.push(colour.clone());
      discs.setColorAt(i, colour);
      discs.setMatrixAt(i, matrix.makeScale(cell.r, 0.01, cell.r).setPosition(cell.x, 0.044, cell.z));
      sockets.setMatrixAt(i, matrix.makeScale(cell.r * 1.22, 0.008, cell.r * 1.22).setPosition(cell.x, 0.0405, cell.z));
      spokes.setMatrixAt(i, matrix.compose(new THREE.Vector3(cell.x, 0.0492, cell.z), spin.setFromAxisAngle(up, a.glass === 'rainbow' ? random() * 2 : 0.5), new THREE.Vector3(cell.r, 0.002, cell.r)));
    });
    for (const mesh of [sockets, discs, spokes]) { mesh.receiveShadow = true; T.add(mesh); }

    // Aiming gear: a carry handle, a sun-compass gnomon and a bubble level.
    const halfW = round ? 0.33 : trayW / 2, halfD = round ? 0.33 : trayD / 2;
    tray.tube([[halfW, 0, -0.14], [halfW + 0.1, 0.02, -0.14], [halfW + 0.12, 0.02, 0], [halfW + 0.1, 0.02, 0.14], [halfW, 0, 0.14]], 0.01, metal);
    tray.cylinder(0.05, 0.05, 0.012, [-halfW - 0.07, 0.03, -halfD * 0.6], goldFoil, 18);
    tray.rod([-halfW - 0.07, 0.03, -halfD * 0.6], [-halfW - 0.07, 0.12, -halfD * 0.6], 0.004, dark);
    tray.box([0.04, 0.03, 0.06], [-halfW - 0.03, 0.01, -halfD * 0.6], metal);
    tray.cylinder(0.022, 0.022, 0.014, [-halfW - 0.05, 0.03, halfD * 0.5], new THREE.MeshStandardMaterial({ color: '#b6e36a', emissive: '#7fb82a', emissiveIntensity: 0.3, roughness: 0.2 }), 12);

    if (a.condition === 'covered') {
      const cloth = new THREE.MeshStandardMaterial({ color: tone('#e9e6dc'), roughness: 0.9, side: THREE.DoubleSide });
      const w = coverEdge + halfW + 0.03;
      tray.box([w, 0.012, halfD * 2 + 0.06], [-halfW - 0.015 + w / 2, 0.058, 0], cloth);
      const flap = tray.box([0.012, 0.26, halfD * 2 + 0.06], [-halfW - 0.03, -0.07, 0], cloth);
      flap.rotation.z = 0.12;
      tray.box([0.03, 0.014, 0.16], [coverEdge + 0.01, 0.062, halfD * 0.4], new THREE.MeshStandardMaterial({ color: tone('#c8242b'), roughness: 0.8 })).rotation.y = 0.5;
    } else if (a.condition === 'struck') {
      tray.cylinder(0.035, 0.035, 0.09, [strike.x, 0, strike.z], new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: 1 }), 9);
      for (let i = 0; i < 7; i++) { const t = random() * Math.PI * 2, len = mix(0.06, 0.2, random()); const crack = tray.box([len, 0.004, 0.006], [strike.x + Math.cos(t) * len / 2, 0.052, strike.z + Math.sin(t) * len / 2], dark); crack.rotation.y = -t; crack.castShadow = false; }
    }

    // --- Tilt and stand ----------------------------------------------------------------------------
    const tilt = mix(0.06, 1.05, a.tilt);
    const lift = (a.stand === 'pallet' ? 0.09 : a.stand === 'post' ? 0.5 : a.stand === 'rocks' ? 0.3 : 0.24) + Math.sin(tilt) * halfD;
    T.rotation.x = tilt;
    T.position.set(0, lift, 0);
    T.updateMatrixWorld(true);
    s.root.add(T);
    const under = (x: number, z: number): P3 => T.localToWorld(new THREE.Vector3(x, -0.035, z)).toArray() as P3;
    if (a.stand === 'legs') {
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const top = under(sx * halfW * 0.85, sz * halfD * 0.85), foot: P3 = [top[0] + sx * 0.12, 0.012, top[2] + sz * 0.1 + (sz < 0 ? -0.08 : 0)];
        s.rod(top, foot, 0.011, metal);
        s.cylinder(0.045, 0.05, 0.016, [foot[0], 0.008, foot[2]], goldFoil, 12);
      }
      s.rod(under(-halfW * 0.85, -halfD * 0.85), under(halfW * 0.85, halfD * 0.85), 0.006, metal);
    } else if (a.stand === 'pallet') {
      s.box([halfW * 2 + 0.16, 0.04, halfD * 2 + 0.2], [0, 0.02, -Math.sin(tilt) * 0.1], metal);
      for (const sx of [-1, 1]) {
        const top = under(sx * halfW * 0.8, -halfD * 0.9);
        s.rod(top, [top[0], 0.04, top[2] + (tilt > 0.5 ? 0.12 : 0)], 0.012, dark);
        const front = under(sx * halfW * 0.8, halfD * 0.95);
        s.box([0.05, Math.max(0.02, front[1] - 0.03), 0.05], [front[0], (front[1] + 0.04) / 2, front[2]], dark);
        s.cylinder(0.02, 0.02, 0.03, [sx * (halfW + 0.04), 0.055, halfD + 0.04 - Math.sin(tilt) * 0.1], goldFoil, 8);
      }
    } else if (a.stand === 'post') {
      const joint = under(0, 0);
      s.ball([0.04, 0.04, 0.04], [joint[0], joint[1] - 0.02, joint[2]], goldFoil, 12);
      s.cylinder(0.018, 0.022, joint[1] - 0.06, [joint[0], (joint[1] - 0.02) / 2, joint[2]], metal, 10);
      for (let i = 0; i < 3; i++) { const t = (i / 3) * Math.PI * 2 + 0.5; s.rod([joint[0], 0.16, joint[2]], [joint[0] + Math.cos(t) * 0.3, 0.01, joint[2] + Math.sin(t) * 0.3], 0.01, metal); s.cylinder(0.035, 0.04, 0.014, [joint[0] + Math.cos(t) * 0.3, 0.007, joint[2] + Math.sin(t) * 0.3], dark, 10); }
    } else {
      const stoneMaterial = new THREE.MeshStandardMaterial({ color: '#77736d', roughness: 1, flatShading: true });
      const pile = Array.from({ length: Math.round(mix(9, 20, mood.density)) }, () => {
        const x = (random() - 0.5) * halfW * 1.9, z = (random() - 0.5) * halfD * 1.5 - Math.sin(tilt) * 0.12;
        const ceiling = T.localToWorld(new THREE.Vector3(x, -0.04, 0)).y + (-z) * Math.tan(tilt) * 0.9;
        const size = Math.max(0.05, Math.min(0.16, ceiling * 0.55));
        return { at: [x, size * 0.7, z] as P3, size };
      });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), stoneMaterial, pile);
      for (const sx of [-1, 1]) { const top = under(sx * halfW * 0.7, -halfD * 0.8); const prop = s.mesh(new THREE.DodecahedronGeometry(1, 0), stoneMaterial, [top[0], top[1] / 2, top[2]]); prop.scale.set(0.11, top[1] / 2 + 0.02, 0.11); }
    }

    if (a.condition === 'drifted') {
      const dustMaterial = new THREE.MeshStandardMaterial({ color: '#8d8982', roughness: 1 });
      const lip = under(0, halfD);
      for (let i = 0; i < 4; i++) s.ball([mix(0.16, 0.26, random()), mix(0.5, 1, random()) * Math.min(0.11, lip[1] + 0.03), mix(0.1, 0.17, random())], [(i - 1.5) * halfW * 0.55, 0, lip[2] + 0.06], dustMaterial, 12).castShadow = false;
    }

    // --- Beam ---------------------------------------------------------------------------------------
    const normal = new THREE.Vector3(0, 1, 0).applyEuler(T.rotation);
    const hit = T.localToWorld(new THREE.Vector3(a.layout === 'ring' ? 0.24 : 0, 0.06, 0));
    const pulses: THREE.Mesh[] = [];
    const beamLength = 3.2;
    let glow: THREE.MeshBasicMaterial | null = null;
    if (a.beam !== 'none') {
      const hue = a.beam === 'red' ? '#ff2a2a' : '#3dff6e';
      glow = new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: 0.85, depthWrite: false });
      const aim = new THREE.Quaternion().setFromUnitVectors(up, normal);
      if (a.beam === 'pulses') {
        for (let i = 0; i < 5; i++) { const pulse = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 8), glow); pulse.quaternion.copy(aim); pulse.userData.offset = i / 5; pulse.position.copy(hit).addScaledVector(normal, 0.2 + (i / 5) * beamLength); s.root.add(pulse); pulses.push(pulse); }
      } else {
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, beamLength, 8), glow);
        beam.quaternion.copy(aim);
        beam.position.copy(hit).addScaledVector(normal, beamLength / 2);
        s.root.add(beam);
      }
      // The spot where it lands, and the star of light going back.
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: hue, emissiveIntensity: 2.5 }));
      spot.position.copy(hit); spot.scale.y = 0.4; spot.quaternion.copy(aim);
      s.root.add(spot);
      for (let k = 0; k < 3; k++) { const ray = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.003, 0.012), glow); ray.position.copy(hit).addScaledVector(normal, 0.01); ray.quaternion.copy(aim).multiply(new THREE.Quaternion().setFromAxisAngle(up, (k * Math.PI) / 3)); s.root.add(ray); }
    }

    // --- Left beside it ---------------------------------------------------------------------------
    if (a.left === 'prints') {
      const prints = Array.from({ length: 12 + Math.round(mood.density * 10) }, (_unused, i) => { const t = -0.4 + (i / 14) * 3.9 + random() * 0.2, r = halfW + mix(0.5, 0.75, random()); return { at: [Math.cos(t) * r, 0.004, Math.sin(t) * r + 0.1] as P3, turn: -t + (random() - 0.5) }; });
      const tread = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.055, 0.17, 2, 8).rotateX(Math.PI / 2).scale(1, 0.08, 1), new THREE.MeshStandardMaterial({ color: '#4d4a46', roughness: 1 }), prints.length);
      prints.forEach((print, i) => tread.setMatrixAt(i, matrix.makeRotationY(print.turn).setPosition(...print.at)));
      s.root.add(tread);
    } else if (a.left === 'tag') {
      const red = new THREE.MeshStandardMaterial({ color: tone('#c8242b'), roughness: 0.8, side: THREE.DoubleSide });
      const points: P3[] = [];
      for (let i = 0; i <= 8; i++) points.push([halfW + 0.3 + i * 0.07, 0.012 + Math.abs(Math.sin(i * 1.4)) * 0.03, 0.3 + Math.sin(i * 0.8) * 0.12]);
      const ribbon = s.tube(points, 0.03, red);
      ribbon.scale.y = 0.25;
      const pin = s.ring(0.03, 0.006, [halfW + 0.27, 0.01, 0.3], metal);
      pin.rotation.x = Math.PI / 2;
      s.rod([halfW + 0.24, 0.01, 0.3], [halfW + 0.12, 0.01, 0.26], 0.005, metal);
    } else if (a.left === 'spare') {
      const small = new Sculpture(context);
      small.box([0.3, 0.04, 0.3], [0, 0, 0], metal);
      const few = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 12), glassMaterial, 16);
      for (let i = 0; i < 16; i++) { few.setMatrixAt(i, matrix.makeScale(0.026, 0.01, 0.026).setPosition(((i % 4) - 1.5) * 0.066, 0.024, (Math.floor(i / 4) - 1.5) * 0.066)); few.setColorAt(i, colour.set(palette[i % palette.length]).lerp(grime, Math.min(0.8, film))); }
      small.root.add(few);
      small.root.rotation.set(0.35, 0.5, 0);
      small.root.position.set(halfW + 0.45, 0.09, 0.25);
      s.root.add(small.root);
      s.rod([halfW + 0.45, 0, 0.17], [halfW + 0.45, 0.1, 0.17], 0.012, dark);
    }

    // Glitter: a few prisms catch the light at a time.
    const flashes = Math.min(live.length, Math.max(3, Math.round(live.length * 0.08)));
    const lit: number[] = [];
    let clock = 0;
    const white = new THREE.Color('#ffffff');
    return s.finish({
      footprint: Math.max(halfW, halfD) + 0.25,
      update: (dt, time) => {
        clock += dt * mix(1.5, 9, mood.energy);
        if (clock > 1 && live.length) {
          clock = 0;
          for (const index of lit) discs.setColorAt(index, base[index]);
          lit.length = 0;
          for (let i = 0; i < flashes; i++) { const index = Math.floor(Math.abs(Math.sin(time * 91.7 + i * 12.9898)) * live.length) % live.length; lit.push(index); discs.setColorAt(index, white); }
          if (discs.instanceColor) discs.instanceColor.needsUpdate = true;
        }
        for (const pulse of pulses) { const along = 1 - ((time * mix(0.25, 1.2, mood.energy) + pulse.userData.offset) % 1); pulse.position.copy(hit).addScaledVector(normal, 0.2 + along * beamLength); }
        if (glow && a.beam !== 'pulses') glow.opacity = 0.75 + Math.sin(time * 30) * 0.1;
      },
    });
  },
});
