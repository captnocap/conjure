import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, visibleBounds, disposeTree } from '@conjure/kit';

function strataTexture(random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f4f2ec';
  ctx.fillRect(0, 0, 128, 64);
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = ['rgba(150,128,100,0.5)', 'rgba(120,120,120,0.35)', 'rgba(190,170,140,0.5)'][Math.floor(random() * 3)];
    ctx.fillRect(0, random() * 64, 128, 1.5 + random() * 3.5);
  }
  ctx.strokeStyle = 'rgba(90,80,70,0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 128, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function tinTexture(random: () => number, wear: number, straw: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  if (straw) {
    ctx.fillStyle = '#b89a55';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) {
      ctx.strokeStyle = ['#8f733a', '#d3b872', '#a3864a', '#6f5a2e'][Math.floor(random() * 4)];
      ctx.lineWidth = 1 + random();
      const x = random() * 256, y = random() * 256;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 8, y + 14 + random() * 22); ctx.stroke();
    }
  } else {
    for (let x = 0; x < 256; x++) {
      const v = 150 + Math.sin(x / 256 * Math.PI * 2 * 12) * 55;
      ctx.fillStyle = `rgb(${v},${v + 4},${v + 8})`;
      ctx.fillRect(x, 0, 1, 256);
    }
    for (let i = 0; i < 12 + wear * 90; i++) {
      ctx.fillStyle = ['rgba(150,78,40,0.55)', 'rgba(110,60,36,0.5)', 'rgba(190,120,60,0.4)'][Math.floor(random() * 3)];
      ctx.beginPath();
      ctx.ellipse(random() * 256, random() * 256, 5 + random() * 30, 8 + random() * 40, 0, 0, 6.3);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    plan: choice('What shape is the hut?', {
      square: 'A plain square room, as wide as it is deep.',
      long: 'A long low bunkhouse with the door off-centre.',
      tiny: 'A cramped sentry-box of a hut, barely room to lie down.',
      leanto: 'A square room with an open lean-to shelter of poles on one side.',
    }),
    roof: choice('What is the roof?', {
      mono: 'A single slope of corrugated tin weighed down with stones.',
      gable: 'A low pitched tin roof with a ridge, a child-drawing of a house.',
      thatch: 'A shaggy cap of dry grass thatch.',
      gone: 'No roof: bare pole rafters over ragged wall tops.',
    }),
    door: choice('How is the blue door?', {
      shut: 'Shut and padlocked.',
      ajar: 'Ajar, a slice of darkness showing.',
      open: 'Wide open, a striped blanket hung in the doorway.',
      fallen: 'Off its hinges, leaning against the wall beside a dark doorway.',
    }),
    blue: choice('What blue is the door?', {
      sky: 'Chalky sky blue.',
      cobalt: 'Deep cobalt.',
      turquoise: 'Bright turquoise green-blue.',
      peeling: 'Blue paint mostly peeled to grey wood.',
    }),
    life: choice('Is anyone living in it?', {
      lived: 'Yes: smoke from a tin pipe and a lit window.',
      shuttered: 'Closed up for the season, window boarded.',
      visited: 'Used now and then: tidy, cold, nobody home.',
      ruin: 'A ruin: a corner of wall has fallen in.',
    }),
    outside: choice('What is outside the door?', {
      bench: 'A bench and table built of salt blocks.',
      blocks: 'A stack of freshly cut salt blocks and a long saw.',
      bicycle: 'A bicycle leaning on the wall.',
      washing: 'A washing line with a few bright clothes.',
      solar: 'A small solar panel on a pole and a blue water barrel.',
      nothing: 'Nothing at all.',
    }),
    sign: choice('Is there a painted sign?', {
      none: 'No sign.',
      refugio: 'REFUGIO',
      hotel: 'HOTEL DE SAL',
      bano: 'BAÑO 5 Bs',
      sal: 'SE VENDE SAL',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const ruin = a.life === 'ruin';
    const W = { square: 3.5, long: 5.8, tiny: 2.5, leanto: 3.4 }[a.plan], D = { square: 3.3, long: 2.9, tiny: 2.3, leanto: 3.2 }[a.plan];
    const eave = a.plan === 'tiny' ? 2.0 : 2.15;
    const BW = 0.5, BH = 0.22, BT = 0.3;
    const mat = (c: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...extra });
    const roofAt = (x: number, z: number) =>
      a.roof === 'mono' ? eave + 0.25 + z * 0.24 : a.roof === 'gable' ? eave + (W / 2 - Math.abs(x)) * 0.36 : eave;
    // A ruin or an open roof leaves ragged wall tops.
    const n1 = random() * 6.3, n2 = random() * 6.3;
    const ragged = (x: number, z: number) => {
      const amount = ruin ? 0.55 : a.roof === 'gone' ? 0.22 : 0;
      if (!amount) return 99;
      const along = x + z * 1.7;
      const wave = 0.5 + 0.3 * Math.sin(along * 1.3 + n1) + 0.2 * Math.sin(along * 3.1 + n2);
      const corner = ruin ? Math.max(0, 1 - Math.hypot(x - W / 2, z + D / 2) / 2.2) : 0;
      return eave * (1 - amount * wave * 0.6 - corner * 0.8) + 0.2;
    };

    // Openings: the door in the front wall, a window beside it or on the side.
    const doorW = 0.9, doorH = 1.85;
    const doorX = a.plan === 'long' ? -W * 0.22 : a.plan === 'tiny' ? 0 : -W * 0.16;
    const winX = a.plan === 'tiny' ? null : a.plan === 'long' ? W * 0.2 : W * 0.24;
    const winW = 0.7, winY = 1.0, winH = 0.7;

    const blocks: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const dummy = new THREE.Object3D();
    const saltTone = () => new THREE.Color('#f1eee6').lerp(new THREE.Color(random() < 0.3 ? '#cdbfa6' : '#d8d6d0'), random() * (0.35 + wear * 0.4));
    const wall = (ax: number, az: number, bx: number, bz: number, front: boolean) => {
      const length = Math.hypot(bx - ax, bz - az), turn = Math.atan2(-(bz - az), bx - ax);
      const count = Math.round(length / BW);
      const step = length / count;
      for (let course = 0; course < 16; course++) {
        const y = course * BH;
        const shift = course % 2 ? 0.5 : 0;
        for (let i = 0; i < count + (shift ? 1 : 0); i++) {
          const t = ((i + 0.5 - shift) * step) / length;
          const tc = Math.min(1 - 0.25 * step / length, Math.max(0.25 * step / length, t));
          const x = mix(ax, bx, tc), z = mix(az, bz, tc);
          const top = y + BH;
          if (top > roofAt(x, z) + 0.06 || top > ragged(x, z)) continue;
          if (front) {
            if (Math.abs(x - doorX) < doorW / 2 + 0.02 && y < doorH - 0.05) continue;
            if (winX !== null && Math.abs(x - winX) < winW / 2 + 0.02 && top > winY + 0.05 && y < winY + winH - 0.05) continue;
          }
          const edge = t < 0.25 * step / length * 2 || t > 1 - 0.25 * step / length * 2;
          dummy.position.set(x + (random() - 0.5) * 0.015, y + BH / 2, z + (random() - 0.5) * 0.015);
          dummy.rotation.set(0, turn + (random() - 0.5) * 0.03, 0);
          dummy.scale.set((edge && shift ? 0.5 : 1) * (step / BW) * 0.97, 0.95, 1);
          dummy.updateMatrix();
          blocks.push({ m: dummy.matrix.clone(), c: saltTone() });
        }
      }
    };
    const hx = W / 2 - BT / 2, hz = D / 2 - BT / 2;
    wall(-W / 2, hz, W / 2, hz, true);
    wall(-W / 2, -hz, W / 2, -hz, false);
    wall(-hx, -D / 2, -hx, D / 2, false);
    wall(hx, -D / 2, hx, D / 2, false);
    const strata = strataTexture(random);
    const blockMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(BW, BH, BT), new THREE.MeshStandardMaterial({ map: strata, roughness: 0.9 }), blocks.length);
    blocks.forEach((block, i) => { blockMesh.setMatrixAt(i, block.m); blockMesh.setColorAt(i, block.c); });
    blockMesh.castShadow = blockMesh.receiveShadow = true;
    s.root.add(blockMesh);
    // The dark of the room, seen through door, window and gaps.
    const dark = mat('#17120f', { roughness: 1 });
    const innerH = ruin ? eave * 0.35 : a.roof === 'gone' ? eave * 0.7 : eave - 0.1;
    s.box([W - BT * 1.6, innerH, D - BT * 1.6], [0, innerH / 2, 0], dark);
    s.box([doorW, doorH, 0.05], [doorX, doorH / 2, D / 2 - BT * 0.75], dark);

    // Roof.
    const tin = tinTexture(random, wear, a.roof === 'thatch');
    const timber = mat('#6f5236', { roughness: 0.9 });
    const stone = mat('#7d766c', { roughness: 1, flatShading: true });
    const roofPaint = (rx: number, rz: number) => { const map = tin.clone(); map.repeat.set(rx, rz); map.needsUpdate = true; return new THREE.MeshStandardMaterial({ map, roughness: a.roof === 'thatch' ? 1 : 0.55, metalness: a.roof === 'thatch' ? 0 : 0.5, side: THREE.DoubleSide }); };
    const roofStones: { at: readonly [number, number, number]; size: number }[] = [];
    let pipeBase = eave + 0.2;
    if (a.roof === 'mono' && !ruin) {
      const angle = Math.atan(0.24), span = (D + 0.34) / Math.cos(angle);
      const sheet = s.box([W + 0.3, 0.04, span], [0, eave + 0.31, 0], roofPaint((W + 0.3) / 2.2, 1));
      sheet.rotation.x = -angle;
      for (const z of [-D / 2 + 0.1, 0, D / 2 - 0.1]) s.box([W + 0.3, 0.09, 0.09], [0, eave + 0.22 + z * 0.24, z], timber);
      for (let i = 0; i < 7 + Math.round(random() * 4); i++) { const x = (random() - 0.5) * W, z = (random() - 0.5) * D; roofStones.push({ at: [x, eave + 0.4 + z * 0.24, z], size: mix(0.09, 0.17, random()) }); }
      pipeBase = eave + 0.3;
    } else if (a.roof === 'gable' && !ruin) {
      const angle = Math.atan(0.36), span = (W / 2 + 0.2) / Math.cos(angle);
      for (const side of [-1, 1]) {
        const sheet = s.box([span, 0.04, D + 0.3], [side * (W / 4 + 0.09), eave + (W / 4 - 0.09) * 0.36 + 0.07, 0], roofPaint(1, (D + 0.3) / 2.2));
        (sheet.material as THREE.MeshStandardMaterial).map!.rotation = Math.PI / 2;
        sheet.rotation.z = -side * angle;
      }
      s.box([0.16, 0.05, D + 0.36], [0, eave + W / 2 * 0.36 + 0.1, 0], mat('#8d949a', { metalness: 0.5 }));
      for (let i = 0; i < 5; i++) { const x = (random() - 0.5) * W * 0.8, z = (random() - 0.5) * D; roofStones.push({ at: [x, eave + (W / 2 - Math.abs(x)) * 0.36 + 0.16, z], size: mix(0.08, 0.14, random()) }); }
      pipeBase = eave + W * 0.09;
    } else if (a.roof === 'thatch' && !ruin) {
      const cap = s.mesh(new THREE.ConeGeometry(1, 1, 4, 3).rotateY(Math.PI / 4), roofPaint(3, 2), [0, eave + 0.95, 0]);
      cap.scale.set((W + 0.4) * 0.707, 1.7, (D + 0.4) * 0.707);
      const skirt = s.mesh(new THREE.CylinderGeometry(0.98, 1.06, 0.16, 4, 1).rotateY(Math.PI / 4), roofPaint(3, 0.4), [0, eave + 0.04, 0]);
      skirt.scale.set((W + 0.4) * 0.707, 1, (D + 0.4) * 0.707);
      for (const [x, z] of [[-1, 0], [1, 0], [0, 1], [0, -1]] as const) s.rod([x * (W / 2 + 0.2), eave + 0.2, z * (D / 2 + 0.2)], [x * 0.2, eave + 1.62, z * 0.2], 0.03, timber);
      pipeBase = eave + 0.9;
    } else {
      // Bare rafters, some fallen in.
      const poles = Math.round(W / 0.75);
      for (let i = 0; i <= poles; i++) {
        if (ruin && random() < 0.45) continue;
        const x = -W / 2 + 0.2 + i * (W - 0.4) / poles, sag = ruin || random() < 0.25 ? mix(0.3, 1.2, random()) : 0;
        s.rod([x, Math.min(eave, ragged(x, -D / 2)) - 0.02 - sag, -D / 2 - 0.15], [x + (random() - 0.5) * 0.2, Math.min(eave, ragged(x, D / 2)) + 0.04, D / 2 + 0.2], 0.04, timber);
      }
      if (ruin) {
        const sheet = s.box([1.6, 0.03, 1.1], [W / 2 + 0.5, 0.3, -D / 2 + 0.2], roofPaint(0.8, 0.5));
        sheet.rotation.set(0.2, 0.5, -0.5);
      }
    }
    if (roofStones.length) s.scatter(new THREE.DodecahedronGeometry(1, 0), stone, roofStones);

    // Door, frame and step.
    const blue = new THREE.Color({ sky: '#6ea8d6', cobalt: '#1f4fa3', turquoise: '#1fa5a8', peeling: '#7f97a8' }[a.blue]);
    blue.offsetHSL(0, (mood.cheer - 0.5) * 0.25, 0).lerp(new THREE.Color('#9a958a'), wear * 0.25 + (a.blue === 'peeling' ? 0.25 : 0));
    const doorPaint = mat(blue, { roughness: 0.7 });
    const frontZ = D / 2;
    s.box([doorW + 0.3, 0.12, BT + 0.06], [doorX, doorH + 0.05, frontZ - BT / 2], timber);
    for (const side of [-1, 1]) s.box([0.08, doorH, 0.1], [doorX + side * (doorW / 2 + 0.03), doorH / 2, frontZ - 0.04], timber);
    s.box([doorW + 0.5, 0.12, 0.5], [doorX, 0.06, frontZ + 0.22], mat('#e4e0d6'));
    const leaf = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.04, doorH - 0.06, 0.05), doorPaint);
    panel.position.set((doorW - 0.04) / 2, doorH / 2, 0);
    leaf.add(panel);
    for (let i = 1; i < 5; i++) { const groove = new THREE.Mesh(new THREE.BoxGeometry(0.012, doorH - 0.08, 0.055), mat(blue.clone().multiplyScalar(0.6))); groove.position.set(i * (doorW - 0.04) / 5, doorH / 2, 0); leaf.add(groove); }
    for (const y of [0.35, doorH - 0.4]) { const brace = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.08, 0.1, 0.07), mat(blue.clone().multiplyScalar(0.85))); brace.position.set((doorW - 0.04) / 2, y, 0); leaf.add(brace); }
    if (a.blue === 'peeling') for (let i = 0; i < 9; i++) { const patch = new THREE.Mesh(new THREE.BoxGeometry(mix(0.08, 0.2, random()), mix(0.1, 0.45, random()), 0.056), mat('#8f8a7f')); patch.position.set(mix(0.1, doorW - 0.15, random()), mix(0.1, doorH - 0.2, random()), 0); leaf.add(patch); }
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.08), mat('#c9a13a', { metalness: 0.7, roughness: 0.4 }));
    lock.position.set(doorW - 0.14, doorH * 0.5, 0.01);
    leaf.add(lock);
    leaf.traverse((node) => { node.castShadow = true; });
    leaf.position.set(doorX - doorW / 2 + 0.02, 0.02, frontZ + 0.0);
    if (a.door === 'ajar') leaf.rotation.y = -mix(0.35, 0.6, random());
    else if (a.door === 'open') leaf.rotation.y = -mix(1.7, 2.2, random());
    else if (a.door === 'fallen') { leaf.position.set(doorX + doorW / 2 + 0.25, 0.02, frontZ + 0.42); leaf.rotation.set(-0.2, 0.08, 0.04); }
    s.root.add(leaf);
    if (a.door === 'open') {
      // A striped blanket hung in the doorway.
      const stripes = mood.cheer > 0.4 ? ['#c8342e', '#e8a424', '#2f7d5a', '#d94f8a', '#2f5f9a'] : ['#7a4a40', '#8d7a55', '#55604f', '#6b5560'];
      const rows = 9;
      for (let i = 0; i < rows; i++) s.box([doorW - 0.1, (doorH - 0.3) / rows + 0.002, 0.02], [doorX, 0.3 + (i + 0.5) * (doorH - 0.3) / rows, frontZ - 0.12], mat(stripes[i % stripes.length], { roughness: 1 }));
    }

    // Window.
    const lit = a.life === 'lived';
    if (winX !== null) {
      const z = frontZ - BT * 0.72;
      if (a.life === 'shuttered') {
        for (let i = 0; i < 4; i++) s.box([winW / 4 - 0.01, winH + 0.1, 0.03], [winX - winW / 2 + (i + 0.5) * winW / 4, winY + winH / 2, frontZ - 0.03], mat(i % 2 ? '#8a7350' : '#7a6444'));
        s.box([winW + 0.1, 0.07, 0.04], [winX, winY + winH / 2, frontZ - 0.005], timber).rotation.z = 0.5;
      } else {
        s.box([winW, winH, 0.03], [winX, winY + winH / 2, z], lit ? mat('#ffd98a', { emissive: '#ffb74a', emissiveIntensity: mix(0.6, 1.8, Math.abs(mood.daylight - 0.5) * 2) }) : dark);
        s.box([winW + 0.1, 0.05, 0.05], [winX, winY + winH / 2, frontZ - 0.05], doorPaint);
        s.box([0.05, winH + 0.05, 0.05], [winX, winY + winH / 2, frontZ - 0.05], doorPaint);
        for (const dy of [0, winH]) s.box([winW + 0.16, 0.07, 0.1], [winX, winY + dy, frontZ - 0.04], doorPaint);
        for (const side of [-1, 1]) s.box([0.07, winH + 0.1, 0.1], [winX + side * winW / 2, winY + winH / 2, frontZ - 0.04], doorPaint);
      }
    }

    // Stovepipe and smoke.
    const puffs: THREE.Mesh[] = [];
    if (a.life !== 'ruin' && a.roof !== 'gone') {
      const px = W / 2 - 0.6, pz = -D / 4;
      const pipeTop = pipeBase + 0.85;
      s.cylinder(0.06, 0.06, 1.0, [px, pipeTop - 0.5, pz], mat('#5d6266', { metalness: 0.6, roughness: 0.5 }), 10);
      s.cylinder(0.02, 0.13, 0.1, [px, pipeTop + 0.08, pz], mat('#5d6266', { metalness: 0.6 }), 10);
      if (lit) {
        const smoke = new THREE.MeshStandardMaterial({ color: '#d9d6d2', transparent: true, opacity: 0.4, depthWrite: false, roughness: 1 });
        for (let i = 0; i < 6; i++) {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), smoke);
          puff.userData.offset = i / 6;
          puff.userData.base = [px, pipeTop + 0.15, pz];
          s.root.add(puff);
          puffs.push(puff);
        }
      }
    }

    // Lean-to shelter on one side.
    if (a.plan === 'leanto') {
      const x0 = W / 2, x1 = W / 2 + 2.0;
      for (const z of [-D / 2 + 0.2, D / 2 - 0.2]) { s.rod([x1, 0, z], [x1 + 0.05, 1.75, z], 0.05, timber); s.rod([x0, eave - 0.1, z], [x1 + 0.15, 1.72, z], 0.04, timber); }
      const cover = s.box([2.25, 0.03, D], [(x0 + x1) / 2 + 0.05, 1.95, 0], roofPaint(1, D / 2.2));
      cover.rotation.z = -0.2;
      // Firewood (dry shrub) and sacks kept dry under it.
      for (let i = 0; i < 5; i++) s.ball([0.24, 0.14, 0.34], [x0 + 0.5 + (i % 2) * 0.5, 0.14 + Math.floor(i / 2) * 0.22, -D / 4 + (random() - 0.5) * 0.2], mat('#d3c7a4', { roughness: 1 }), 10).rotation.y = random();
      for (let i = 0; i < 8; i++) s.rod([x0 + 0.4 + random() * 0.8, 0.05 + random() * 0.25, D / 4 - 0.3], [x0 + 0.4 + random() * 0.8, 0.05 + random() * 0.25, D / 4 + 0.5], 0.025, mat('#7a6a55'));
    }

    // Fallen blocks around a ruin, or by wear.
    const rubble = Math.round((ruin ? 16 : 0) + wear * 5);
    if (rubble) {
      const loose = new THREE.InstancedMesh(new THREE.BoxGeometry(BW, BH, BT), blockMesh.material, rubble);
      for (let i = 0; i < rubble; i++) {
        const nearCorner = ruin && random() < 0.75;
        dummy.position.set(nearCorner ? W / 2 + mix(-0.9, 0.9, random()) : (random() - 0.5) * (W + 1.6), BH / 2 - 0.03, nearCorner ? -D / 2 + mix(-0.9, 0.7, random()) : (random() < 0.5 ? -1 : 1) * (D / 2 + mix(0.2, 0.7, random())));
        dummy.rotation.set((random() - 0.5) * 0.5, random() * 6.3, (random() - 0.5) * 0.5);
        dummy.scale.set(mix(0.5, 1, random()), 1, 1);
        dummy.updateMatrix();
        loose.setMatrixAt(i, dummy.matrix);
        loose.setColorAt(i, saltTone());
      }
      loose.castShadow = loose.receiveShadow = true;
      s.root.add(loose);
    }

    // Sign.
    if (a.sign !== 'none') {
      const text = { refugio: 'REFUGIO', hotel: 'HOTEL DE SAL', bano: 'BAÑO 5 Bs', sal: 'SE VENDE SAL' }[a.sign];
      const width = Math.min(W * 0.5, 0.3 + text.length * 0.13);
      const signX = winX !== null ? winX : doorX, signY = winX !== null ? winY + winH + 0.32 : doorH + 0.3;
      const board = s.label(text, width, 0.3, [signX, Math.min(signY, eave - 0.1), frontZ + 0.03], mood.cheer > 0.5 ? '#1f4fa3' : '#2b2a28', '#efe7d2');
      board.rotation.z = (random() - 0.5) * 0.08;
      board.castShadow = false;
    }

    // Outside the door.
    const px = winX !== null ? winX + 0.2 : doorX + 1.3, pz = frontZ + 0.9;
    if (a.outside === 'bench') {
      const slab = mat('#ebe8df');
      for (const dx of [-0.55, 0.55]) s.box([0.3, 0.4, 0.4], [px + dx, 0.2, pz - 0.5], slab);
      s.box([1.6, 0.1, 0.45], [px, 0.45, pz - 0.5], slab);
      s.box([0.5, 0.62, 0.5], [px, 0.31, pz + 0.3], slab);
      s.box([0.95, 0.09, 0.95], [px, 0.66, pz + 0.3], slab);
      s.cylinder(0.05, 0.04, 0.1, [px + 0.15, 0.76, pz + 0.25], mat('#3d7a8a'), 10);
    } else if (a.outside === 'blocks') {
      const stack = new THREE.InstancedMesh(new THREE.BoxGeometry(BW, BH, BT), blockMesh.material, 14);
      for (let i = 0; i < 14; i++) {
        const layer = Math.floor(i / 5);
        dummy.position.set(px - 0.5 + (i % 5 % 3) * 0.53 + layer * 0.1, BH / 2 + layer * BH, pz - 0.3 + Math.floor((i % 5) / 3) * 0.34);
        dummy.rotation.set(0, (random() - 0.5) * 0.15, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        stack.setMatrixAt(i, dummy.matrix);
        stack.setColorAt(i, new THREE.Color('#f6f4ee'));
      }
      stack.castShadow = stack.receiveShadow = true;
      s.root.add(stack);
      s.box([1.3, 0.14, 0.012], [px + 0.2, 0.5, pz + 0.45], mat('#8d949a', { metalness: 0.7, roughness: 0.4 })).rotation.set(0.3, 0.3, 0.5);
      s.box([0.16, 0.2, 0.03], [px - 0.35, 0.2, pz + 0.62], timber).rotation.set(0.3, 0.3, 0.5);
    } else if (a.outside === 'bicycle') {
      const frame = mat(mood.cheer > 0.5 ? '#c8342e' : '#3d4a44', { metalness: 0.4 });
      const tyre = mat('#1c1c1e');
      const bz = frontZ + 0.2, bx = px;
      const bike = new Sculpture(context);
      for (const dx of [-0.52, 0.52]) bike.ring(0.33, 0.02, [dx, 0.35, 0], tyre);
      bike.rod([-0.52, 0.35, 0], [-0.15, 0.82, 0], 0.016, frame);
      bike.rod([-0.52, 0.35, 0], [0, 0.36, 0], 0.016, frame);
      bike.rod([0, 0.36, 0], [-0.15, 0.82, 0], 0.016, frame);
      bike.rod([-0.15, 0.82, 0], [0.38, 0.86, 0], 0.016, frame);
      bike.rod([0, 0.36, 0], [0.38, 0.86, 0], 0.016, frame);
      bike.rod([0.52, 0.35, 0], [0.36, 0.98, 0], 0.016, frame);
      bike.rod([0.36, 0.98, -0.22], [0.36, 0.98, 0.22], 0.014, tyre);
      bike.box([0.22, 0.04, 0.1], [-0.18, 0.9, 0], tyre);
      bike.root.position.set(bx, 0, bz);
      bike.root.rotation.x = -0.2;
      s.root.add(bike.root);
    } else if (a.outside === 'washing') {
      const x0 = px - 1.1, x1 = px + 1.5, z = frontZ + 1.1;
      s.rod([x0, 0, z], [x0 - 0.05, 1.7, z], 0.03, timber);
      s.rod([x1, 0, z], [x1 + 0.06, 1.65, z], 0.03, timber);
      s.rod([x0 - 0.05, 1.62, z], [x1 + 0.06, 1.58, z], 0.008, mat('#d9d2c0'));
      const cloths = mood.cheer > 0.4 ? ['#e2562f', '#f2c12e', '#2f8fc2', '#f4f1e8', '#d43d7a'] : ['#8a8478', '#b8b0a0', '#6f7a84', '#e0dccf'];
      for (let i = 0; i < 5; i++) {
        const w = mix(0.28, 0.5, random()), h = mix(0.35, 0.7, random());
        const cloth = s.box([w, h, 0.012], [mix(x0 + 0.3, x1 - 0.3, i / 4), 1.6 - h / 2, z], mat(cloths[i % cloths.length], { roughness: 1, side: THREE.DoubleSide }));
        cloth.rotation.x = (random() - 0.5) * 0.4 * (0.3 + mood.energy);
      }
    } else if (a.outside === 'solar') {
      s.rod([px + 0.6, 0, pz], [px + 0.6, 1.9, pz], 0.035, mat('#8d949a', { metalness: 0.6 }));
      const panel = s.box([0.95, 0.03, 0.6], [px + 0.6, 1.95, pz], mat('#1d2f55', { metalness: 0.6, roughness: 0.25 }));
      panel.rotation.x = 0.55;
      const rim = s.box([1.0, 0.02, 0.65], [px + 0.6, 1.94, pz - 0.006], mat('#c9ccd0', { metalness: 0.6 }));
      rim.rotation.x = 0.55;
      s.cylinder(0.3, 0.28, 0.85, [px - 0.4, 0.425, pz - 0.45], mat('#2f6aa8', { roughness: 0.5 }), 16);
      s.cylinder(0.31, 0.31, 0.04, [px - 0.4, 0.86, pz - 0.45], mat('#1f4f86'), 16);
    }

    const bounds = visibleBounds(s.root);
    const centre = bounds.getCenter(new THREE.Vector3());
    s.root.position.set(-centre.x, 0, -centre.z);
    const speed = mix(0.08, 0.4, mood.energy), drift = mix(0.1, 1.4, mood.energy);
    const place = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.userData.offset + time * speed) % 1;
        const [bx, by, bz] = puff.userData.base as [number, number, number];
        puff.position.set(bx + t * t * drift, by + t * 1.5, bz + Math.sin(t * 5 + puff.userData.offset * 9) * 0.08);
        puff.scale.setScalar(0.1 + t * 0.32);
      }
    };
    place(0);
    return {
      object: s.root,
      update: puffs.length ? (_dt, time) => place(time) : undefined,
      dispose: () => { strata.dispose(); tin.dispose(); disposeTree(s.root); },
    };
  },
});
