import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { grime, panel, pick, tone, write } from './lib';

const NAMES = {
  'mt-olive': ['GREATER', 'MT. OLIVE', 'BAPTIST CHURCH'],
  'new-life': ['NEW LIFE', 'ASSEMBLY', 'OF GOD'],
  'st-paul': ['ST. PAUL', 'A.M.E. ZION', 'EST. 1887'],
  'roca-eterna': ['IGLESIA', 'ROCA ETERNA', 'PENTECOSTAL'],
  'first-lutheran': ['FIRST LUTHERAN', 'YOUTH', 'MINISTRY'],
  'holy-ghost': ['HOLY GHOST', 'DELIVERANCE', 'TABERNACLE'],
  'country-chapel': ['PLEASANT GROVE', 'COMMUNITY', 'CHAPEL'],
} as const;

export default defineThing({
  questions: {
    name: choice('Whose name is on the side of the van?', {
      'mt-olive': 'Greater Mt. Olive Baptist Church, a Black Baptist congregation.',
      'new-life': 'New Life Assembly of God.',
      'st-paul': 'St. Paul A.M.E. Zion, established 1887.',
      'roca-eterna': 'Iglesia Roca Eterna Pentecostal.',
      'first-lutheran': 'First Lutheran Youth Ministry.',
      'holy-ghost': 'Holy Ghost Deliverance Tabernacle.',
      'country-chapel': 'Pleasant Grove Community Chapel.',
    }),
    lettering: choice('How was the name put on?', {
      'brush-script': 'Hand-painted by a member in looping brush script, a little uneven, with a cross.',
      'block-vinyl': 'Neat stick-on vinyl block capitals, properly centred.',
      'painted-over': 'Lettered over the ghost of a previous owner: AIRPORT SHUTTLE still shows through the white.',
      stencil: 'Sprayed through a stencil in black, plain as a crate.',
    }),
    paint: choice('What does the bodywork look like?', {
      white: 'Plain fleet white.',
      'blue-stripe': 'White with a broad blue stripe down the side.',
      'two-tone': 'Old two-tone: tan below, cream above, from the eighties.',
      'primer-patch': 'White with grey primer patches and one door from a different van.',
      maroon: 'Deep maroon with gold lettering.',
    }),
    door: choice('How is the sliding side door?', {
      open: 'Slid all the way back, the benches and whatever is on them in plain view.',
      ajar: 'Half open, as if someone just stepped out.',
      closed: 'Shut.',
    }),
    cargo: choice('If you can see inside, what is on the front bench seat?', {
      'cooler-hymnals': 'A red cooler and a stack of hymnals.',
      casseroles: 'Casserole carriers and a sheet cake box, held level on the seat.',
      robes: 'Choir robes on hangers hooked over the seat back.',
      'youth-bags': 'Backpacks, pillows and a sleeping bag for a youth trip.',
      'folding-chairs': 'Folding chairs leaned in a row, and a box of tracts.',
      empty: 'Nothing but the worn vinyl bench.',
    }),
    errand: choice('What is the van in the middle of doing?', {
      parked: 'Just parked, waiting for next Sunday.',
      'elder-pickup': 'Picking up the elders: a step stool on the ground at the door and a folded walker beside it.',
      'road-trip': 'Leaving on a trip: luggage and a tarp roped to the roof rack.',
      'broken-down': 'Broken down: hood propped up and a cone behind it.',
      procession: 'In a funeral procession: headlights on and a small purple flag on the front fender.',
      'car-wash': 'The youth-group car wash: soap suds on the panels, a bucket and sponge beside it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;

    const baseHex = { white: '#f3f2ec', 'blue-stripe': '#f3f2ec', 'two-tone': '#efe6cc', 'primer-patch': '#eeede6', maroon: '#6e1c26' }[a.paint];
    const bodyHex = tone(new THREE.Color(baseHex).lerp(new THREE.Color('#9b9484'), wear * 0.25), 0);
    const body = new THREE.MeshStandardMaterial({ color: bodyHex, roughness: mix(0.3, 0.75, wear), metalness: 0.1 });
    const lowerHex = a.paint === 'two-tone' ? '#b39566' : bodyHex;
    const lower = a.paint === 'two-tone' ? new THREE.MeshStandardMaterial({ color: lowerHex, roughness: 0.6 }) : body;
    const glass = new THREE.MeshStandardMaterial({ color: '#26323a', roughness: 0.15, metalness: 0.3 });
    const black = s.material('#1c1c1e', { roughness: 0.8 });
    const chrome = s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 });
    const vinyl = s.material(pick(random, ['#6a7884', '#7a6a5a', '#5a6470']), { roughness: 0.6 });
    const inside = s.material('#8f8c84');
    const ink = a.paint === 'maroon' ? '#e0b84a' : a.lettering === 'stencil' ? '#1c1c1e' : pick(random, ['#1f3b6e', '#7a1f1f', '#1c1c1e', '#234a34']);
    const add = <T extends THREE.Object3D>(mesh: T, at: readonly [number, number, number], rotY = 0) => { mesh.position.set(...at); mesh.rotation.y = rotY; s.root.add(mesh); return mesh; };
    const box = (size: readonly [number, number, number], at: readonly [number, number, number], material: THREE.Material) => s.box(size, at, material);

    // Dimensions: nose points +x, the sliding-door side faces +z.
    const X0 = -2.9, X1 = 1.3, Y0 = 0.5, Y1 = 2.15, Z = 1.0, T = 0.06, BELT = 1.22;
    const doorA = 0.05, doorB = 1.2;

    // ---- Passenger box, built from walls so the sliding door is a real opening
    box([X1 - X0, 0.12, Z * 2], [(X0 + X1) / 2, Y0 + 0.06, 0], lower);
    box([X1 - X0, 0.1, Z * 2 - 0.02], [(X0 + X1) / 2, Y1 - 0.05, 0], body);
    box([X1 - X0 - 0.3, 0.07, Z * 2 - 0.35], [(X0 + X1) / 2, Y1 + 0.03, 0], body);
    box([T, Y1 - Y0, Z * 2], [X0 + T / 2, (Y0 + Y1) / 2, 0], body);
    box([X1 - X0, BELT - Y0, T], [(X0 + X1) / 2, (Y0 + BELT) / 2, -Z + T / 2], lower);
    box([X1 - X0, Y1 - BELT, T], [(X0 + X1) / 2, (BELT + Y1) / 2, -Z + T / 2], body);
    // near side: behind the door, ahead of the door, header above it
    box([doorA - X0, BELT - Y0, T], [(X0 + doorA) / 2, (Y0 + BELT) / 2, Z - T / 2], lower);
    box([doorA - X0, Y1 - BELT, T], [(X0 + doorA) / 2, (BELT + Y1) / 2, Z - T / 2], body);
    box([X1 - doorB, Y1 - Y0, T], [(doorB + X1) / 2, (Y0 + Y1) / 2, Z - T / 2], body);
    box([doorB - doorA, 0.2, T], [(doorA + doorB) / 2, Y1 - 0.1, Z - T / 2], body);
    box([X1 - X0 - 0.1, 0.03, Z * 2 - 0.1], [(X0 + X1) / 2, Y0 + 0.13, 0], inside);
    box([0.02, Y1 - Y0 - 0.2, Z * 2 - 0.12], [X1 - 0.1, (Y0 + Y1) / 2, 0], inside);

    // ---- Cab and nose
    const profile = new THREE.Shape();
    profile.moveTo(X1, Y0); profile.lineTo(X1, Y1); profile.lineTo(X1 + 0.2, Y1 - 0.02);
    profile.lineTo(X1 + 0.82, 1.3); profile.lineTo(X1 + 1.42, 1.16); profile.quadraticCurveTo(X1 + 1.56, 1.1, X1 + 1.56, 0.95);
    profile.lineTo(X1 + 1.56, Y0); profile.closePath();
    const cab = s.mesh(new THREE.ExtrudeGeometry(profile, { depth: Z * 2 - 0.04, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 }), body, [0, 0, -Z + 0.02]);
    cab.castShadow = true;
    // windshield
    const wsLen = Math.hypot(0.62, Y1 - 0.02 - 1.3);
    const ws = box([wsLen * 0.86, 0.02, Z * 2 - 0.3], [X1 + 0.51 + 0.012, (Y1 + 1.3) / 2 + 0.008, 0], glass);
    ws.rotation.z = -Math.atan2(Y1 - 0.02 - 1.3, 0.62);
    // cab side windows and door seams
    const cabWin = new THREE.Shape();
    cabWin.moveTo(X1 + 0.08, 1.32); cabWin.lineTo(X1 + 0.08, Y1 - 0.2); cabWin.lineTo(X1 + 0.22, Y1 - 0.2); cabWin.lineTo(X1 + 0.72, 1.32); cabWin.closePath();
    for (const side of [1, -1]) {
      const mesh = add(new THREE.Mesh(new THREE.ShapeGeometry(cabWin), glass), [0, 0, side * (Z + 0.003)]);
      if (side < 0) { mesh.rotation.y = Math.PI; mesh.position.x = 0; mesh.scale.x = -1; (mesh.material as THREE.Material).side = THREE.DoubleSide; }
      box([0.012, 0.75, 0.01], [X1 + 0.03, 0.92, side * (Z + 0.003)], black);
      box([0.012, 0.75, 0.01], [X1 + 0.9, 0.92, side * (Z + 0.003)], black);
      box([0.1, 0.03, 0.03], [X1 + 0.2, 1.2, side * (Z + 0.02)], black);
      // mirror
      box([0.05, 0.22, 0.14], [X1 + 0.78, 1.5, side * (Z + 0.16)], black);
      s.rod([X1 + 0.76, 1.4, side * Z], [X1 + 0.78, 1.45, side * (Z + 0.14)], 0.012, black);
    }
    // grille, lights, bumpers, plate
    const nose = X1 + 1.58;
    box([0.03, 0.3, 1.1], [nose, 0.92, 0], black);
    for (let i = 0; i < 4; i++) box([0.035, 0.012, 1.05], [nose + 0.004, 0.81 + i * 0.07, 0], chrome);
    const lamps = a.errand === 'procession' || mood.daylight > 0.85 || mood.daylight < 0.12;
    const lampMat = s.material('#fdf6dc', lamps ? { emissive: '#fff2c0', emissiveIntensity: 1.4 } : { roughness: 0.2 });
    for (const z of [-0.75, 0.75]) { box([0.03, 0.2, 0.3], [nose, 0.93, z], lampMat); box([0.03, 0.08, 0.3], [nose, 0.77, z], s.material('#f0a020')); }
    box([0.14, 0.16, Z * 2 + 0.06], [nose + 0.02, 0.56, 0], chrome);
    box([0.14, 0.16, Z * 2 + 0.06], [X0 - 0.03, 0.56, 0], chrome);
    for (const z of [-0.85, 0.85]) box([0.03, 0.42, 0.14], [X0 - 0.005, 1.2, z], s.material('#b3261e', lamps ? { emissive: '#ff2a1a', emissiveIntensity: 0.9 } : {}));
    // rear doors and windows
    box([0.012, Y1 - Y0 - 0.25, 0.012], [X0 - 0.004, (Y0 + Y1) / 2, 0], black);
    for (const z of [-0.45, 0.45]) box([0.012, 0.5, 0.62], [X0 - 0.004, 1.58, z], glass);
    add(panel(0.3, 0.15, (ctx, w, h) => { ctx.fillStyle = '#f4f1e6'; ctx.fillRect(0, 0, w, h); write(ctx, pick(random, ['PS 23', 'GOD 1ST', 'JN 3:16', 'CHR 15']), w / 2, h / 2, h * 0.5, '#1f3b6e', { max: w * 0.9 }); }, { px: 128 }), [X0 - 0.012, 0.86, 0], -Math.PI / 2);

    // ---- Side windows on the passenger box
    const winY = 1.6, winH = 0.56;
    const sideWindows = (side: number, from: number, to: number, count: number) => {
      const span = (to - from) / count;
      for (let i = 0; i < count; i++) box([span - 0.12, winH, 0.012], [from + (i + 0.5) * span, winY, side * (Z + 0.002)], glass);
    };
    sideWindows(-1, X0 + 0.1, X1 - 0.05, 4);
    sideWindows(1, X0 + 0.1, doorA - 0.02, 3);
    // far-side trim seam
    box([X1 - X0 + 1.5, 0.02, 0.01], [(X0 + X1) / 2 + 0.75, BELT - 0.25, -Z - 0.004], black);

    // ---- Stripe
    if (a.paint === 'blue-stripe') {
      const stripe = s.material(mood.cheer > 0.5 ? '#2a6fd0' : '#3a4f7a');
      for (const side of [1, -1]) {
        box([doorA - X0 - 0.02, 0.1, 0.008], [(X0 + doorA) / 2, 1.2, side * (Z + 0.003)], stripe);
        box([X1 + 1.45 - doorB, 0.1, 0.008], [(doorB + X1 + 1.45) / 2, 1.2, side * (Z + 0.003)], stripe);
        if (side < 0) box([doorB - doorA, 0.1, 0.008], [(doorA + doorB) / 2, 1.2, side * (Z + 0.003)], stripe);
      }
    }
    if (a.paint === 'primer-patch') {
      const primer = s.material('#8f9296', { roughness: 0.95 });
      for (let i = 0; i < 4; i++) { const w = 0.3 + random() * 0.6; box([w, 0.2 + random() * 0.35, 0.008], [X0 + 0.4 + random() * 2.2, 0.7 + random() * 0.3, (i % 2 ? -1 : 1) * (Z + 0.003)], primer); }
      box([0.85, 0.62, 0.008], [X1 + 0.47, 0.92, Z + 0.004], s.material(pick(random, ['#3a5f8a', '#7a8a6a', '#b0a070'])));
    }

    // ---- Lettering
    const lines = NAMES[a.name];
    const drawName = (bg: string) => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      if (a.lettering === 'painted-over') {
        ctx.globalAlpha = 0.22; write(ctx, 'AIRPORT', w * 0.48, h * 0.34, h * 0.36, '#3a5a7a', { max: w * 0.95 }); write(ctx, 'SHUTTLE', w * 0.52, h * 0.7, h * 0.36, '#3a5a7a', { max: w * 0.95 }); ctx.globalAlpha = 1;
      }
      const script = a.lettering === 'brush-script' || a.lettering === 'painted-over';
      lines.forEach((line, i) => {
        const size = h * (i === 1 ? 0.46 : 0.25);
        const y = h * [0.15, 0.52, 0.88][i];
        const tilt = script ? (random() - 0.5) * 0.06 - 0.03 : 0;
        write(ctx, script && i !== 1 ? line.charAt(0) + line.slice(1).toLowerCase() : line, w / 2 + (script ? (random() - 0.5) * w * 0.05 : 0), y, size, ink, {
          max: w * 0.94, tilt, font: script ? 'italic bold' : 'bold', face: a.lettering === 'stencil' ? "'Courier New', monospace" : script ? "Georgia, 'Times New Roman', serif" : 'Arial, Helvetica, sans-serif',
        });
      });
      if (a.lettering === 'brush-script') { ctx.fillStyle = ink; ctx.fillRect(w * 0.035, h * 0.3, w * 0.022, h * 0.42); ctx.fillRect(w * 0.012, h * 0.4, w * 0.07, h * 0.055); }
      grime(ctx, w, h, wear * 0.7, random, '110,80,50');
    };
    const signW = doorA - X0 - 0.2, signH = BELT - Y0 - 0.16;
    add(panel(signW, signH, drawName(lowerHex), { px: 512, roughness: 0.5 }), [(X0 + doorA) / 2, (Y0 + BELT) / 2 - 0.02, Z + 0.004]);
    add(panel(signW, signH, drawName(lowerHex), { px: 512, roughness: 0.5 }), [(X0 + X1) / 2 - 0.3, (Y0 + BELT) / 2 - 0.02, -Z - 0.006], Math.PI);

    // ---- Rust and dirt along the sills
    if (wear > 0.3) {
      const rust = s.material('#8a4a26', { roughness: 1 });
      const n = Math.round((wear - 0.3) * 18);
      for (let i = 0; i < n; i++) { const w = 0.1 + random() * 0.4; box([w, 0.04 + random() * 0.12 * wear, 0.008], [X0 + 0.2 + random() * 5.2, Y0 + 0.04 + random() * 0.06, (random() < 0.6 ? 1 : -1) * (Z + 0.004)], rust); }
    }

    // ---- Wheels
    const hubless = wear > 0.6 && random() < 0.7;
    for (const x of [-1.7, 1.95]) for (const z of [-1, 1]) {
      const arch = s.cylinder(0.47, 0.47, 0.02, [x, 0.42, z * (Z + 0.004)], black, 20); arch.rotation.x = Math.PI / 2;
      const tyre = s.cylinder(0.38, 0.38, 0.26, [x, 0.38, z * (Z - 0.13)], black, 20); tyre.rotation.x = Math.PI / 2;
      const hub = s.cylinder(0.22, 0.22, 0.02, [x, 0.38, z * (Z + 0.012)], hubless && x < 0 && z > 0 ? s.material('#3a3a3c') : chrome, 14); hub.rotation.x = Math.PI / 2;
    }

    // ---- Benches
    for (let i = 0; i < 4; i++) {
      const x = 0.1 - i * 0.78;
      box([0.45, 0.14, 1.4], [x + 0.22, Y0 + 0.5, -0.24], vinyl);
      box([0.1, 0.62, 1.4], [x, Y0 + 0.82, -0.24], vinyl);
      box([0.06, 0.36, 0.06], [x + 0.22, Y0 + 0.3, 0.3], black);
    }

    // ---- Sliding door
    const slide = a.door === 'open' ? -(doorB - doorA) - 0.02 : a.door === 'ajar' ? -(doorB - doorA) * 0.5 : 0;
    const out = a.door === 'closed' ? 0.002 : 0.07;
    const dw = doorB - doorA - 0.02;
    box([dw, BELT - Y0 - 0.04, 0.04], [(doorA + doorB) / 2 + slide, (Y0 + BELT) / 2 + 0.02, Z - 0.02 + out], lower);
    box([dw, Y1 - BELT - 0.22, 0.04], [(doorA + doorB) / 2 + slide, (BELT + Y1 - 0.22) / 2, Z - 0.02 + out], body);
    box([dw - 0.14, winH, 0.045], [(doorA + doorB) / 2 + slide, winY, Z - 0.015 + out], glass);
    box([0.14, 0.03, 0.03], [doorB - 0.2 + slide, 1.12, Z + 0.015 + out], black);
    box([doorB - doorA + 1.3, 0.025, 0.02], [(doorA + doorB) / 2 - 0.6, 1.3, Z + 0.006], black);
    if (a.door !== 'closed') box([doorB - doorA, 0.04, 0.22], [(doorA + doorB) / 2, Y0 - 0.08, Z - 0.02], black);

    // ---- What rides on the front bench
    const sx = 0.34, sy = Y0 + 0.57, sz = 0.2;
    if (a.cargo === 'cooler-hymnals') {
      box([0.36, 0.3, 0.52], [sx, sy + 0.15, sz - 0.1], s.material('#c8262c', { roughness: 0.5 }));
      box([0.38, 0.06, 0.54], [sx, sy + 0.33, sz - 0.1], s.material('#f4f1e6', { roughness: 0.5 }));
      const n = 4 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) box([0.22, 0.035, 0.15], [sx, sy + 0.018 + i * 0.036, sz - 0.62 + (random() - 0.5) * 0.03], s.material(pick(random, ['#7a1f1f', '#1f3b6e', '#234a34']))).rotation.y = (random() - 0.5) * 0.3;
    } else if (a.cargo === 'casseroles') {
      for (let i = 0; i < 3; i++) box([0.34, 0.1, 0.28], [sx, sy + 0.05 + (i === 2 ? 0.1 : 0), sz - 0.05 - (i % 2) * 0.34], s.material(pick(random, ['#3a6f8a', '#b3261e', '#d5d8da']), { roughness: 0.5 }));
      box([0.4, 0.09, 0.5], [sx, sy + 0.05, sz - 0.85], s.material('#f7f5ee'));
    } else if (a.cargo === 'robes') {
      const robe = pick(random, ['#5a1f6e', '#7a1f1f', '#1f3b6e', '#f4f1e6']);
      for (let i = 0; i < 6; i++) { box([0.05, 0.75, 0.3], [0.17 + (i % 2) * 0.04, Y0 + 0.75, sz - i * 0.2], s.material(tone(robe, (random() - 0.5) * 0.08))); box([0.055, 0.12, 0.31], [0.17 + (i % 2) * 0.04, Y0 + 1.06, sz - i * 0.2], s.material('#e0b84a')); }
    } else if (a.cargo === 'youth-bags') {
      for (let i = 0; i < 5; i++) s.ball([0.17, 0.2, 0.15], [sx + (random() - 0.5) * 0.1, sy + 0.18, sz - i * 0.27], s.material(pick(random, ['#2a6fd0', '#d8263c', '#2f8a4f', '#f0a020', '#7a4fc0'])), 10);
      const roll = s.cylinder(0.12, 0.12, 0.5, [sx + 0.05, sy + 0.45, sz - 0.3], s.material('#3a5f4a'), 12); roll.rotation.x = Math.PI / 2;
      box([0.3, 0.1, 0.4], [sx, sy + 0.42, sz - 0.9], s.material('#f7f5ee'));
    } else if (a.cargo === 'folding-chairs') {
      for (let i = 0; i < 5; i++) { const chair = box([0.04, 0.8, 0.44], [0.3 + i * 0.07, Y0 + 0.6, sz - 0.1], s.material('#8a7a5a', { metalness: 0.4 })); chair.rotation.z = -0.25; }
      box([0.3, 0.22, 0.36], [sx, sy + 0.11, sz - 0.75], s.material('#b98a4a'));
    }

    // ---- The errand
    const extras: THREE.Object3D[] = [];
    if (a.errand === 'elder-pickup') {
      box([0.4, 0.2, 0.3], [(doorA + doorB) / 2, 0.1, Z + 0.3], s.material('#3a6f8a', { roughness: 0.5 }));
      const alu = s.material('#c9cdd0', { metalness: 0.7, roughness: 0.3 });
      const wx = doorB + 0.5, wz = Z + 0.22;
      for (const dx of [-0.22, 0.22]) { s.rod([wx + dx, 0, wz], [wx + dx, 0.85, wz + 0.05], 0.014, alu); s.rod([wx + dx, 0, wz + 0.3], [wx + dx, 0.85, wz + 0.1], 0.014, alu); s.rod([wx + dx, 0.85, wz + 0.05], [wx + dx, 0.85, wz + 0.1], 0.02, black); }
      s.rod([wx - 0.22, 0.5, wz + 0.03], [wx + 0.22, 0.5, wz + 0.03], 0.012, alu);
      for (const dx of [-0.22, 0.22]) s.ball([0.03, 0.03, 0.03], [wx + dx, 0.03, wz + 0.3], s.material('#b7d22a'), 8);
    } else if (a.errand === 'road-trip') {
      for (const x of [X0 + 0.5, X1 - 0.5]) { s.rod([x, Y1 + 0.06, -Z + 0.15], [x, Y1 + 0.2, -Z + 0.15], 0.015, black); s.rod([x, Y1 + 0.06, Z - 0.15], [x, Y1 + 0.2, Z - 0.15], 0.015, black); s.rod([x, Y1 + 0.2, -Z + 0.15], [x, Y1 + 0.2, Z - 0.15], 0.018, black); }
      for (const z of [-Z + 0.15, Z - 0.15]) s.rod([X0 + 0.3, Y1 + 0.2, z], [X1 - 0.3, Y1 + 0.2, z], 0.018, black);
      const n = Math.round(mix(4, 11, mood.density));
      for (let i = 0; i < n; i++) {
        const w = 0.4 + random() * 0.4, h = 0.2 + random() * 0.25, d = 0.35 + random() * 0.4;
        const item = random() < 0.5 ? box([w, h, d], [0, 0, 0], s.material(pick(random, ['#2a3a5a', '#5a3320', '#8a2a2a', '#2f5a3a', '#30343a', '#b08a4a']))) : s.ball([w * 0.55, h * 0.6, d * 0.5], [0, 0, 0], s.material(pick(random, ['#d8263c', '#2a6fd0', '#f0a020', '#3a3a3c'])), 10);
        item.position.set(X0 + 0.7 + (i / n) * (X1 - X0 - 1.4) + (random() - 0.5) * 0.2, Y1 + 0.22 + h / 2, (random() - 0.5) * 1.0);
        item.rotation.y = (random() - 0.5) * 0.5;
      }
      const tarp = box([1.6, 0.03, 1.5], [X0 + 1.2, Y1 + 0.62, 0], s.material('#2a6fd0', { roughness: 0.6 })); tarp.rotation.z = 0.06;
    } else if (a.errand === 'broken-down') {
      const hood = box([0.66, 0.03, Z * 2 - 0.14], [X1 + 0.92, 1.52, 0], body); hood.rotation.z = 0.95;
      box([0.6, 0.02, Z * 2 - 0.2], [X1 + 1.12, 1.215, 0], black).rotation.z = -0.23;
      s.rod([X1 + 1.35, 1.15, 0.6], [X1 + 1.02, 1.62, 0.6], 0.01, chrome);
      const cone = s.cylinder(0.03, 0.14, 0.45, [X0 - 1.0, 0.24, 0.5], s.material('#f06a1c'), 12);
      extras.push(cone);
      box([0.36, 0.03, 0.36], [X0 - 1.0, 0.015, 0.5], s.material('#f06a1c'));
      s.cylinder(0.075, 0.09, 0.08, [X0 - 1.0, 0.3, 0.5], s.material('#f7f5ee'), 12);
    } else if (a.errand === 'procession') {
      s.rod([X1 + 1.3, 1.16, Z - 0.1], [X1 + 1.3, 1.62, Z - 0.1], 0.008, chrome);
      box([0.26, 0.17, 0.008], [X1 + 1.17, 1.53, Z - 0.1], s.material('#5a2a8a'));
      add(panel(0.2, 0.1, (ctx, w, h) => { ctx.fillStyle = '#5a2a8a'; ctx.fillRect(0, 0, w, h); write(ctx, 'FUNERAL', w / 2, h / 2, h * 0.5, '#ffffff', { max: w * 0.9 }); }, { px: 128 }), [X1 + 1.17, 1.53, Z - 0.094]);
    } else if (a.errand === 'car-wash') {
      const suds = s.material('#ffffff', { roughness: 0.3 });
      s.scatter(new THREE.SphereGeometry(1, 7, 5), suds, Array.from({ length: Math.round(mix(40, 130, mood.density)) }, () => {
        const sideZ = random() < 0.7 ? 1 : -1, x = X0 + random() * 5.4;
        return { at: [x, random() < 0.25 ? 0.03 : 0.5 + random() * random() * 1.5, random() < 0.25 ? sideZ * (Z + 0.2 + random() * 0.6) : sideZ * (Z + 0.03)] as const, size: 0.03 + random() * 0.06 };
      }));
      s.cylinder(0.16, 0.13, 0.26, [doorB + 0.9, 0.13, Z + 0.55], s.material(pick(random, ['#d8263c', '#2a6fd0', '#f0a020'])), 14);
      s.ball([0.12, 0.05, 0.08], [doorB + 0.55, 0.05, Z + 0.7], s.material('#f2d23a'), 8);
      add(panel(0.6, 0.45, (ctx, w, h) => { ctx.fillStyle = '#f7f1d8'; ctx.fillRect(0, 0, w, h); write(ctx, 'CAR WASH', w / 2, h * 0.3, h * 0.24, '#d8263c', { max: w * 0.9 }); write(ctx, 'YOUTH MISSIONS', w / 2, h * 0.58, h * 0.13, '#1f3b6e', { max: w * 0.9 }); write(ctx, '$5', w / 2, h * 0.82, h * 0.22, '#1c1c1e'); }, { px: 256 }), [X0 + 0.2, 0.4, Z + 0.75]).rotation.x = -0.25;
      s.rod([X0 + 0.2, 0, Z + 0.85], [X0 + 0.2, 0.55, Z + 0.72], 0.012, s.material('#b98a4a'));
    }

    // antenna, wipers, roof vent
    s.rod([X1 + 1.2, 1.18, -Z + 0.1], [X1 + 1.12, 1.95, -Z + 0.1], 0.006, black);
    box([0.5, 0.06, 0.5], [X0 + 1.4, Y1 + 0.09, 0], s.material('#dcdcd4'));

    // sagging suspension when worn; idle shake when the day is busy
    s.root.rotation.z = (random() - 0.5) * 0.02 * wear;
    const thing = s.finish({ footprint: 3 });
    const baseY = s.root.position.y;
    const shake = a.errand === 'broken-down' ? 0 : mix(0, 0.006, mood.energy);
    thing.update = (_dt, time) => { s.root.position.y = baseY + Math.sin(time * 38) * shake; };
    return thing;
  },
});
