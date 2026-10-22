import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const NOVELTY = ['#d8334a', '#2f7fd6', '#3aa860', '#f0b429', '#e86fb0', '#7a4fc9', '#f4f4f4', '#222222', '#ff7a1a'];

/** A flat key outline in metres, hanging from its bow at the origin, blade pointing down. */
function keyShape(kind: 'house' | 'car' | 'skeleton' | 'big') {
  const shape = new THREE.Shape();
  if (kind === 'skeleton') {
    shape.absellipse(0, -0.016, 0.016, 0.016, 0, Math.PI * 2);
    const hole = new THREE.Path();
    hole.absellipse(0, -0.016, 0.009, 0.009, 0, Math.PI * 2);
    shape.holes.push(hole);
    const shaft = new THREE.Shape();
    shaft.moveTo(-0.003, -0.03); shaft.lineTo(0.003, -0.03); shaft.lineTo(0.003, -0.075); shaft.lineTo(0.02, -0.075);
    shaft.lineTo(0.02, -0.09); shaft.lineTo(0.011, -0.09); shaft.lineTo(0.011, -0.084); shaft.lineTo(0.003, -0.084);
    shaft.lineTo(0.003, -0.095); shaft.lineTo(-0.003, -0.095); shaft.closePath();
    return [shape, shaft];
  }
  const r = kind === 'house' ? 0.014 : 0.017;
  if (kind === 'car') {
    shape.moveTo(-0.014, -0.002); shape.lineTo(0.014, -0.002); shape.lineTo(0.017, -0.03); shape.lineTo(-0.017, -0.03); shape.closePath();
  } else if (kind === 'big') {
    // novelty heads: wide rounded square
    shape.moveTo(-0.019, 0); shape.lineTo(0.019, 0); shape.lineTo(0.019, -0.034); shape.lineTo(-0.019, -0.034); shape.closePath();
  } else {
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4 + Math.PI / 8;
      const x = Math.cos(angle) * r, y = -r + Math.sin(angle) * r;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
  }
  const hole = new THREE.Path();
  hole.absellipse(0, -0.007, 0.0035, 0.0035, 0, Math.PI * 2);
  shape.holes.push(hole);
  const blade = new THREE.Shape();
  const top = kind === 'house' ? -0.026 : -0.03;
  blade.moveTo(-0.0045, top); blade.lineTo(0.0045, top); blade.lineTo(0.0045, top - 0.04); blade.lineTo(0, top - 0.046);
  blade.lineTo(-0.0045, top - 0.04); blade.closePath();
  return [shape, blade];
}
function cutBlade() {
  // A blade whose edge has been bitten into teeth.
  const blade = new THREE.Shape();
  blade.moveTo(-0.0045, -0.026); blade.lineTo(0.0045, -0.026);
  const teeth = [0.004, 0.001, 0.0035, 0.0005, 0.003, 0.0015, 0.004];
  teeth.forEach((x, i) => blade.lineTo(x, -0.03 - i * 0.0055));
  blade.lineTo(0, -0.072); blade.lineTo(-0.0045, -0.066); blade.closePath();
  return blade;
}

export default defineThing({
  questions: {
    machine: choice('What kind of duplicator is it?', {
      castiron: 'A pre-war cast-iron machine in dark green with an exposed belt and flywheel.',
      hammertone: 'A 1960s hammertone-blue duplicator with a chrome belt guard.',
      beige: 'A beige 1980s kiosk machine with a clear plastic safety shield.',
      red: 'A compact modern bright-red machine with yellow warning stickers.',
    }),
    fullness: score('How full is the board of blanks?', ['Nearly bare hooks', 'Picked over with gaps', 'Well stocked', 'Every hook crowded']),
    blanks: choice('What blanks hang on the board?', {
      brass: 'Plain brass house keys, row after row of gold.',
      mixed: 'Brass and nickel-silver in alternating columns, by keyway.',
      novelty: 'Novelty blanks with painted heads: flags, flowers, team colours, glitter.',
      car: 'Car keys with fat black plastic heads.',
      skeleton: 'Old skeleton and mortise keys with round bows, for doors a century old.',
    }),
    job: choice('What is happening on the machine right now?', {
      idle: 'Nothing; the vises are empty and the wheel is still.',
      fresh: 'A freshly cut key gleams in the vise beside its worn original, brass filings everywhere.',
      cutting: 'Mid-cut: the wheel is biting the blank and throwing a fan of sparks.',
      covered: 'Switched off under a dust cloth, with a hand-lettered card propped on it.',
    }),
    ring: noul('Is there a big tagged ring of unclaimed keys?'),
    sign: choice('What does the sign on the board say, if anything?', {
      none: 'No sign.',
      cut: 'KEYS CUT',
      wait: 'WHILE U WAIT',
      price: '2 FOR $5',
      lost: 'NO DUPLICATES',
    }),
    bench: choice('What does the machine sit on?', {
      wood: 'A scarred wooden workbench with a drawer.',
      steel: 'A grey steel cabinet with a locked door.',
      counter: 'A shop counter stub with a worn laminate top.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 1.0, benchH = 0.88, D = 0.52;
    const wood = s.material('#8b6844');
    const darkWood = s.material('#5a4029');
    const steel = s.material('#b7bcc0', { metalness: 0.8, roughness: 0.3 });
    const dark = s.material('#232527', { roughness: 0.7 });
    const brass = new THREE.MeshStandardMaterial({ color: '#d4a640', metalness: 0.85, roughness: 0.3, emissive: '#6b4a08', emissiveIntensity: 0.25 });

    // Bench.
    if (a.bench === 'wood') {
      s.box([W, 0.06, D], [0, benchH - 0.03, 0], wood);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.07, benchH - 0.06, 0.07], [x * (W / 2 - 0.06), (benchH - 0.06) / 2, z * (D / 2 - 0.06)], darkWood);
      s.box([W - 0.14, 0.14, 0.03], [0, benchH - 0.14, D / 2 - 0.05], darkWood);
      s.box([0.34, 0.1, 0.02], [0.15, benchH - 0.14, D / 2 - 0.03], wood);
      s.box([0.1, 0.015, 0.02], [0.15, benchH - 0.14, D / 2 - 0.015], steel);
      s.box([W - 0.14, 0.03, D - 0.14], [0, 0.2, 0], darkWood);
    } else if (a.bench === 'steel') {
      const grey = s.material('#7f888c', { metalness: 0.4, roughness: 0.5 });
      s.box([W, benchH - 0.04, D], [0, (benchH - 0.04) / 2, 0], grey);
      s.box([W + 0.03, 0.04, D + 0.03], [0, benchH - 0.02, 0], dark);
      s.box([0.005, benchH - 0.2, 0.004], [0, benchH / 2, D / 2 + 0.002], dark);
      s.cylinder(0.014, 0.014, 0.01, [0.05, benchH * 0.55, D / 2 + 0.004], steel, 12).rotation.x = Math.PI / 2;
      for (let i = 0; i < 5; i++) s.box([0.2, 0.008, 0.004], [-0.25, 0.18 + i * 0.025, D / 2 + 0.002], dark);
    } else {
      s.box([W, benchH - 0.04, D], [0, (benchH - 0.04) / 2, 0], s.material('#6f553b'));
      s.box([W + 0.04, 0.04, D + 0.05], [0, benchH - 0.02, 0.01], s.material('#c9b48a', { roughness: 0.4 }));
      for (let i = 0; i < 4; i++) s.box([W * 0.21, benchH - 0.2, 0.012], [-W * 0.36 + i * W * 0.24, benchH / 2 - 0.02, D / 2 + 0.004], s.material('#806447'));
      s.box([W, 0.09, 0.02], [0, 0.045, D / 2 + 0.006], dark);
    }

    // Board behind, rising from the back of the bench.
    const boardH = 0.92, boardY = benchH + 0.08 + boardH / 2, boardZ = -D / 2 + 0.03;
    const boardColour = { castiron: '#6b4f33', hammertone: '#d8d2bf', beige: '#c9b792', red: '#e9e7e0' }[a.machine];
    s.box([W, boardH, 0.03], [0, boardY, boardZ], s.material(boardColour, { roughness: 0.9 }));
    for (const x of [-1, 1]) s.box([0.045, benchH + 0.1 + boardH, 0.045], [x * (W / 2 - 0.02), (benchH + 0.1 + boardH) / 2, boardZ - 0.035], darkWood);
    s.box([W + 0.02, 0.04, 0.05], [0, boardY + boardH / 2 + 0.02, boardZ], darkWood);
    let top = boardY + boardH / 2 - 0.05;
    if (a.sign !== 'none') {
      const text = { cut: 'KEYS CUT', wait: 'WHILE U WAIT', price: '2 FOR $5', lost: 'NO DUPLICATES' }[a.sign];
      const colours = mood.cheer > 0.5 ? ['#fff4c2', '#b3261e'] : ['#efe8d2', '#1f2a36'];
      s.label(text, W * 0.8, 0.12, [0, top - 0.04, boardZ + 0.018], colours[1], colours[0]);
      top -= 0.16;
    }

    // Rows of hooks with blanks.
    const kind = a.blanks === 'skeleton' ? 'skeleton' : a.blanks === 'car' ? 'car' : a.blanks === 'novelty' ? 'big' : 'house';
    const [bowShape, bladeShape] = keyShape(kind);
    const keyLen = kind === 'skeleton' ? 0.1 : 0.08;
    const scale = 1.55;
    const pitchX = kind === 'skeleton' ? 0.068 : 0.06, pitchY = keyLen * scale + 0.022;
    const cols = Math.floor((W - 0.12) / pitchX), rows = Math.max(1, Math.floor((top - (benchH + 0.3)) / pitchY));
    const bowGeo = new THREE.ExtrudeGeometry(bowShape, { depth: 0.003, bevelEnabled: false });
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.0025, bevelEnabled: false });
    const metal = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.75, roughness: 0.35, emissive: '#3a2a08', emissiveIntensity: 0.2 });
    const headMat = kind === 'car' || kind === 'big' ? new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }) : metal;
    const slots: { x: number; y: number; z: number; tilt: number; bow: THREE.Color; blade: THREE.Color }[] = [];
    const pegs: { at: readonly [number, number, number]; size: number }[] = [];
    const keep = mix(0.12, 1, a.fullness);
    const brassC = new THREE.Color('#d9a93c'), nickel = new THREE.Color('#c8ccd0'), iron = new THREE.Color('#4d4a48');
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * pitchX, y = top - 0.03 - r * pitchY;
      pegs.push({ at: [x, y, boardZ + 0.03], size: 1 });
      // Whole hooks sell out together, so emptiness comes in runs.
      const hookStock = random() < keep ? 1 + Math.floor(random() * mix(1, 4, a.fullness)) : 0;
      const metalColour = kind === 'skeleton' ? (random() < 0.6 ? iron : brassC) : a.blanks === 'mixed' && c % 2 ? nickel : a.blanks === 'car' ? nickel : brassC;
      for (let k = 0; k < hookStock; k++) {
        const bow = a.blanks === 'novelty' ? new THREE.Color(NOVELTY[(c + Math.floor(random() * 2)) % NOVELTY.length]) : a.blanks === 'car' ? new THREE.Color('#1c1c1e') : metalColour.clone();
        slots.push({ x: x + (random() - 0.5) * 0.004, y, z: boardZ + 0.022 + k * 0.006, tilt: (random() - 0.5) * mix(0.05, 0.5, mood.wear), bow, blade: metalColour.clone().multiplyScalar(mix(1, 0.75, mood.wear * random())) });
      }
    }
    s.scatter(new THREE.CylinderGeometry(0.003, 0.003, 0.04, 6).rotateX(Math.PI / 2), steel, pegs);
    if (slots.length) {
      const bows = new THREE.InstancedMesh(bowGeo, headMat, slots.length);
      const blades = new THREE.InstancedMesh(bladeGeo, metal, slots.length);
      const dummy = new THREE.Object3D();
      slots.forEach((slot, index) => {
        dummy.position.set(slot.x, slot.y, slot.z);
        dummy.rotation.set(0, 0, slot.tilt);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        bows.setMatrixAt(index, dummy.matrix); blades.setMatrixAt(index, dummy.matrix);
        bows.setColorAt(index, slot.bow); blades.setColorAt(index, slot.blade);
      });
      bows.castShadow = blades.castShadow = true;
      s.root.add(bows, blades);
    }

    // The machine.
    const paint = { castiron: '#2f4a3a', hammertone: '#4a6f93', beige: '#cdbf9f', red: '#c8281f' }[a.machine];
    const body = s.material(paint, { metalness: a.machine === 'beige' ? 0.05 : 0.45, roughness: 0.45 });
    const mx = -0.08, my = benchH, mz = 0.02;
    const machine = new THREE.Group();
    machine.position.set(mx, my, mz);
    machine.scale.setScalar(1.3);
    s.root.add(machine);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      machine.add(mesh);
      return mesh;
    };
    add(new THREE.BoxGeometry(0.42, 0.05, 0.3), body, 0, 0.025, 0);
    // Motor housing at the back.
    const motor = add(new THREE.CylinderGeometry(0.075, 0.075, 0.24, 20), a.machine === 'castiron' ? dark : body, -0.04, 0.14, -0.07);
    motor.rotation.z = Math.PI / 2;
    for (let i = 0; i < 6; i++) add(new THREE.TorusGeometry(0.077, 0.004, 6, 20), dark, -0.13 + i * 0.035, 0.14, -0.07).rotation.y = Math.PI / 2;
    add(new THREE.BoxGeometry(0.1, 0.07, 0.12), body, -0.04, 0.085, -0.07);
    // Spindle with cutter wheel (right) and wire brush (far left).
    const spindle = add(new THREE.CylinderGeometry(0.01, 0.01, 0.46, 10), steel, 0, 0.14, 0.06);
    spindle.rotation.z = Math.PI / 2;
    const wheel = add(new THREE.CylinderGeometry(0.055, 0.055, 0.008, 28), steel, 0.11, 0.14, 0.06);
    wheel.rotation.z = Math.PI / 2;
    const teeth = add(new THREE.CylinderGeometry(0.06, 0.06, 0.004, 14), s.material('#70767a', { metalness: 0.9, roughness: 0.4 }), 0.11, 0.14, 0.06);
    teeth.rotation.z = Math.PI / 2;
    const brush = add(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16), s.material('#c9b26a', { roughness: 1 }), -0.2, 0.14, 0.06);
    brush.rotation.z = Math.PI / 2;
    for (const x of [-0.16, 0.18]) add(new THREE.BoxGeometry(0.03, 0.12, 0.05), body, x, 0.1, 0.06);
    // Belt: exposed on the old machine, guarded on the others.
    if (a.machine === 'castiron') {
      const fly = add(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 24), dark, 0.2, 0.14, -0.07);
      fly.rotation.z = Math.PI / 2;
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), dark, 0.2, 0.14, 0.06).rotation.z = Math.PI / 2;
      add(new THREE.BoxGeometry(0.012, 0.012, 0.14), s.material('#5b4028'), 0.2, 0.2, -0.005).rotation.x = -0.28;
      add(new THREE.BoxGeometry(0.012, 0.012, 0.14), s.material('#5b4028'), 0.2, 0.09, -0.005).rotation.x = 0.28;
    } else {
      add(new THREE.BoxGeometry(0.035, 0.16, 0.2), a.machine === 'hammertone' ? steel : body, 0.2, 0.14, -0.005);
    }
    if (a.machine === 'beige' || a.machine === 'red') {
      const shield = add(new THREE.BoxGeometry(0.2, 0.13, 0.004), new THREE.MeshPhysicalMaterial({ color: a.machine === 'red' ? '#ffd24a' : '#ffffff', transparent: true, opacity: 0.25, roughness: 0.1, depthWrite: false }), 0.08, 0.2, 0.15);
      shield.rotation.x = -0.5;
    }
    if (a.machine === 'red') {
      const sticker = add(new THREE.PlaneGeometry(0.06, 0.03), s.material('#f5c518'), -0.12, 0.028, 0.151);
      sticker.castShadow = false;
    }
    // Carriage: a bar carrying two vises, with the tracing stylus on the left.
    const carriage = new THREE.Group();
    carriage.position.set(0, 0.06, 0.13);
    machine.add(carriage);
    const cadd = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      carriage.add(mesh);
      return mesh;
    };
    cadd(new THREE.CylinderGeometry(0.012, 0.012, 0.44, 10), steel, 0, 0, 0).rotation.z = Math.PI / 2;
    for (const x of [-0.07, 0.11]) {
      cadd(new THREE.BoxGeometry(0.06, 0.035, 0.05), dark, x, 0.022, -0.01);
      cadd(new THREE.BoxGeometry(0.06, 0.012, 0.05), steel, x, 0.052, -0.01);
      cadd(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 8), steel, x, 0.07, 0);
      cadd(new THREE.BoxGeometry(0.05, 0.01, 0.014), body, x, 0.097, 0).rotation.y = random() * 3;
    }
    cadd(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8), steel, 0.02, 0.01, 0.07).rotation.x = Math.PI / 2 - 0.3;
    cadd(new THREE.SphereGeometry(0.022, 12, 8), s.material(a.machine === 'red' ? '#111111' : '#b3261e', { roughness: 0.3 }), 0.02, 0.035, 0.145);
    add(new THREE.BoxGeometry(0.012, 0.05, 0.03), steel, -0.07, 0.125, 0.085); // stylus guide

    // The job in hand.
    const filings: { at: readonly [number, number, number]; size: number }[] = [];
    const sparks: THREE.Mesh[] = [];
    const [, plainBlade] = keyShape('house');
    const [houseBow] = keyShape('house');
    const houseBowGeo = new THREE.ExtrudeGeometry(houseBow, { depth: 0.003, bevelEnabled: false });
    const layKey = (x: number, material: THREE.Material, cut: boolean) => {
      const key = new THREE.Group();
      const bow = new THREE.Mesh(houseBowGeo, material);
      const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(cut ? cutBlade() : plainBlade, { depth: 0.0025, bevelEnabled: false }), material);
      bow.castShadow = blade.castShadow = true;
      key.add(bow, blade);
      key.rotation.x = -Math.PI / 2; // lie flat, blade toward the wheel (-z)
      key.rotation.z = 0;
      key.scale.setScalar(1.5);
      key.position.set(x, 0.061, 0.06);
      key.rotateZ(Math.PI);
      carriage.add(key);
    };
    if (a.job === 'fresh' || a.job === 'cutting') {
      layKey(-0.07, new THREE.MeshStandardMaterial({ color: '#8f8a7a', metalness: 0.7, roughness: 0.55 }), true);
      layKey(0.11, brass, true);
      const amount = a.job === 'fresh' ? 90 : 45;
      for (let i = 0; i < amount; i++) {
        const angle = random() * Math.PI * 2, distance = Math.pow(random(), 1.6) * 0.22;
        const x = mx + 0.11 + Math.cos(angle) * distance, z = mz + 0.2 + Math.abs(Math.sin(angle)) * distance * 0.8;
        const onBench = Math.abs(x) < W / 2 - 0.02 && z < D / 2 - 0.01;
        if (onBench) filings.push({ at: [x, benchH + 0.003, z], size: mix(0.6, 1.5, random()) });
      }
    }
    if (a.job === 'cutting') {
      carriage.rotation.x = -0.12;
      const sparkMat = new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffb640', emissiveIntensity: 2.5, transparent: true, opacity: 0.9, depthWrite: false });
      for (let i = 0; i < 16; i++) {
        const spark = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, mix(0.02, 0.07, random())), sparkMat);
        const yaw = mix(-0.7, 0.7, random()), pitch = mix(-0.5, 0.25, random()), reach = mix(0.06, 0.26, random());
        spark.position.set(0.11 + Math.sin(yaw) * reach, 0.13 + Math.sin(pitch) * reach, 0.1 + Math.cos(yaw) * reach);
        spark.lookAt(0.11, 0.14, 0.06);
        spark.userData.phase = random() * 6;
        machine.add(spark);
        sparks.push(spark);
      }
    }
    if (a.job === 'covered') {
      const clothMat = s.material(mood.warmth > 0.5 ? '#a9a184' : '#8f9a94', { roughness: 1 });
      const cloth = add(new THREE.CylinderGeometry(0.2, 0.3, 0.25, 4, 1), clothMat, 0.01, 0.125, 0.02);
      cloth.rotation.y = Math.PI / 4;
      cloth.scale.set(1.25, 1, 0.85);
      const hem = add(new THREE.CylinderGeometry(0.305, 0.31, 0.02, 4, 1), s.material('#6d6a5c', { roughness: 1 }), 0.01, 0.012, 0.02);
      hem.rotation.y = Math.PI / 4;
      hem.scale.set(1.25, 1, 0.85);
      const text = mood.cheer > 0.5 ? 'BACK IN 5' : 'OUT OF ORDER';
      const cardMesh = s.label(text, 0.24, 0.1, [mx, benchH + 0.06, D / 2 - 0.02], '#2a2a2a', '#f1ead2');
      cardMesh.rotation.x = -0.35;
    }
    if (filings.length) s.scatter(new THREE.BoxGeometry(0.006, 0.002, 0.003), brass, filings);

    // Tagged ring of unclaimed keys, hung from a nail on the bench front corner post.
    if (a.ring) {
      const rx = W / 2 - 0.16, ry = benchH + 0.014, rz = 0.1;
      const ring = s.ring(0.075, 0.004, [rx, ry, rz], steel);
      ring.rotation.x = Math.PI / 2;
      const count = 7 + Math.floor(random() * 7);
      for (let i = 0; i < count; i++) {
        const angle = mix(-1.3, 2.2, i / count) + random() * 0.2;
        const key = new THREE.Group();
        const material = new THREE.MeshStandardMaterial({ color: random() < 0.5 ? '#c9a14a' : '#b9bdc0', metalness: 0.75, roughness: 0.4 });
        const bow = new THREE.Mesh(houseBowGeo, material), blade = new THREE.Mesh(bladeGeo === undefined ? houseBowGeo : new THREE.ExtrudeGeometry(plainBlade, { depth: 0.0025, bevelEnabled: false }), material);
        bow.castShadow = true;
        key.add(bow, blade);
        key.scale.setScalar(1.4);
        key.rotation.x = -Math.PI / 2;
        key.position.set(rx + Math.cos(angle) * 0.075, ry + i * 0.001, rz + Math.sin(angle) * 0.075);
        key.rotation.z = -angle + Math.PI / 2;
        s.root.add(key);
        if (i % 2 === 0) {
          const tag = s.box([0.04, 0.002, 0.065], [rx + Math.cos(angle) * 0.2, ry + 0.004 + i * 0.001, rz + Math.sin(angle) * 0.2], s.material(['#e8dcb4', '#e7b0a0', '#efe9da'][i % 3], { roughness: 0.95 }));
          tag.rotation.y = -angle + Math.PI / 2 + (random() - 0.5) * 0.5;
        }
      }
    }

    // Bench clutter grows with density: boxes of blanks, an oil can, a jar of rejects.
    if (mood.density > 0.3 && a.bench !== undefined) {
      const bx = -W / 2 + 0.13;
      s.box([0.14, 0.05, 0.1], [bx, benchH + 0.025, 0.14], s.material('#3e5f8a', { roughness: 0.9 })).rotation.y = 0.2;
      if (mood.density > 0.55) s.box([0.13, 0.05, 0.09], [bx + 0.01, benchH + 0.075, 0.13], s.material('#b98f5c', { roughness: 0.9 })).rotation.y = -0.15;
      if (mood.density > 0.7) {
        s.lathe([[0, 0], [0.035, 0], [0.035, 0.05], [0.006, 0.09], [0.004, 0.16]], s.material('#9c3a2a', { metalness: 0.5 }), [W / 2 - 0.1, benchH, -0.12]);
      }
    }

    const spin = a.job === 'covered' || a.job === 'idle' ? mix(0, 3, Math.max(0, mood.energy - 0.6)) : mix(4, 30, mood.energy);
    return s.finish({
      update: (dt, time) => {
        wheel.rotation.x += dt * spin; teeth.rotation.x += dt * spin; brush.rotation.x += dt * spin;
        for (const spark of sparks) spark.visible = Math.sin(time * 23 + spark.userData.phase) > -0.3;
      },
    });
  },
});
