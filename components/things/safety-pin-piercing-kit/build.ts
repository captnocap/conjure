import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    piercing: choice('Which piercing was being attempted?', {
      ear: 'An ear lobe, the classic first one.',
      nose: 'A nostril.',
      lip: 'A lip, just under the corner of the mouth.',
      eyebrow: 'An eyebrow.',
      septum: 'The septum, straight through the middle of the nose.',
    }),
    stage: choice('Did they go through with it?', {
      chickened: 'No: lost their nerve. The pins are still closed and clean, and the bottle got drunk instead.',
      halfway: 'It is about to happen: one pin open, the lighter lit to sterilise it, the cork ready.',
      done: 'Yes: a bloody pin stuck in the cork, a spotted tissue and an empty earring card.',
      wrong: 'It went wrong: blood on everything, a heap of tissues, the cup knocked over.',
    }),
    who: choice('Whose kit was it?', {
      friends: 'Two best friends: two cups, a photo-booth strip and a friendship bracelet.',
      alone: 'Someone alone with a pocket mirror.',
      dare: 'A dare: a pile of crumpled notes, coins and a row of shot glasses.',
      band: 'A whole band doing it together: four pins lined up on a strip of tape with initials.',
    }),
    ice: choice('What is left of the ice?', {
      fresh: 'Fresh cubes heaped in the cup.',
      half: 'One cube half melted, floating.',
      water: 'Only water and a ring of condensation.',
    }),
    bottle: choice('What is in the bottle?', {
      vodka: 'Cheap clear vodka.',
      whisky: 'Amber whisky.',
      schnapps: 'Sticky peach schnapps, orange.',
      spirit: 'Blue surgical spirit borrowed from a bathroom cabinet.',
    }),
    surface: choice('What is it laid out on?', {
      tile: 'A white tiled ledge.',
      steel: 'A dented stainless-steel shelf.',
      cistern: 'The porcelain lid of a toilet cistern.',
      sill: 'A painted wooden windowsill, flaking.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const TOP = 0.035, SW = 0.58, SD = 0.27;
    const gone = a.stage === 'done' || a.stage === 'wrong';
    const steel = s.material('#cfd4d6', { metalness: 0.9, roughness: 0.25 });
    const blood = new THREE.MeshStandardMaterial({ color: '#a30f1c', roughness: 0.3 });
    const white = s.material('#f3f1e8', { roughness: 0.9 });

    // --- The surface and a tiled upstand behind it.
    const slabMaterial =
      a.surface === 'tile' ? new THREE.MeshStandardMaterial({ roughness: 0.3, map: paint(512, 256, (g, w, h) => {
        g.fillStyle = '#9a968a'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { const l = 232 - mood.wear * 40 + (random() - 0.5) * 14; g.fillStyle = `rgb(${l},${l - 2},${l - 12})`; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }
      }) }) :
      a.surface === 'steel' ? s.material('#b9c0c3', { metalness: 0.85, roughness: 0.35 }) :
      a.surface === 'cistern' ? new THREE.MeshStandardMaterial({ color: new THREE.Color('#f1efe6').lerp(new THREE.Color('#c9c2a8'), mood.wear * 0.5), roughness: 0.22 }) :
      s.material(pick(['#e9e4d2', '#9fc0b4', '#d9a9a0']), { roughness: 0.6 });
    s.box([SW, TOP, SD], [0, TOP / 2, 0], slabMaterial);
    if (a.surface === 'cistern') { s.box([SW - 0.04, 0.012, SD - 0.04], [0, TOP + 0.004, 0], slabMaterial); s.cylinder(0.022, 0.024, 0.012, [SW / 2 - 0.06, TOP + 0.014, -0.06], steel, 18); }
    if (a.surface === 'sill') for (let k = 0; k < 6 + mood.wear * 20; k++) { const chip = s.box([0.01 + random() * 0.03, 0.001, 0.008 + random() * 0.02], [(random() - 0.5) * SW * 0.95, TOP + 0.0006, (random() - 0.5) * SD * 0.9], s.material('#8a6a48')); chip.rotation.y = random() * 3; }
    if (a.surface === 'steel') for (const x of [-1, 1]) s.box([0.02, 0.06, SD * 0.8], [x * (SW / 2 - 0.03), -0.03 + TOP, 0], steel);
    const upstand = paint(512, 192, (g, w, h) => {
      g.fillStyle = '#8f8b80'; g.fillRect(0, 0, w, h);
      const tint = pick(['#e7e4d9', '#a9cdbb', '#dcb7bc', '#2f2f36', '#e7e4d9']);
      for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) { const c = new THREE.Color(tint); c.offsetHSL(0, 0, (random() - 0.5) * 0.05 - mood.wear * 0.06); g.fillStyle = c.getStyle(); g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }
      g.font = 'bold 26px sans-serif';
      for (let k = 0; k < 2 + mood.density * 4; k++) { g.fillStyle = pick(['#15131a', '#c4122f', '#1d4dff']); g.save(); g.translate(random() * w * 0.8, 30 + random() * 130); g.rotate((random() - 0.5) * 0.4); g.fillText(pick(['OI!', 'JO', 'KAOS', 'XXX', 'VIV', '<3', 'RATS']), 0, 0); g.restore(); }
    });
    const back = new THREE.Mesh(new THREE.BoxGeometry(SW, 0.2, 0.02), new THREE.MeshStandardMaterial({ map: upstand, roughness: 0.35 }));
    back.position.set(0, TOP + 0.1, -SD / 2 + 0.01);
    back.castShadow = back.receiveShadow = true;
    s.root.add(back);
    const wallZ = -SD / 2 + 0.021;

    // --- A safety pin lying flat: clasp, two wires, a coil, and the sharp arm sprung open or not.
    const pin = (x: number, z: number, turn: number, open: boolean, bloody: boolean, length = 0.062) => {
      const cos = Math.cos(turn), sin = Math.sin(turn), y = TOP + 0.0022;
      const at = (lx: number, lz: number, ly = 0): P3 => [x + cos * lx - sin * lz, y + ly, z + sin * lx + cos * lz];
      const r = 0.0015, gap = 0.0055;
      s.rod(at(-length / 2, gap), at(length / 2, gap), r, steel);
      const coil = s.ring(gap * 0.75, r, at(length / 2 + gap * 0.5, 0), steel);
      coil.rotation.x = Math.PI / 2;
      const head = s.ball([0.0075, 0.0028, 0.0085], at(-length / 2 - 0.003, gap * 0.25), steel, 10);
      head.rotation.y = -turn;
      const swing = open ? 0.38 + random() * 0.2 : 0;
      const tip = at(length / 2 - Math.cos(swing) * length * 0.98, -gap - Math.sin(swing) * length * 0.98, open ? 0.001 : 0);
      s.rod(at(length / 2, -gap), tip, r, steel, 0.0004);
      if (bloody) s.rod(at(length / 2 - Math.cos(swing) * length * 0.55, -gap - Math.sin(swing) * length * 0.55), tip, r * 1.25, blood, 0.0005);
    };
    const drop = (x: number, z: number, size: number) => { const d = s.ball([size, size * 0.18, size * (0.8 + random() * 0.5)], [x, TOP + 0.0006, z], blood, 10); d.rotation.y = random() * 3; d.castShadow = false; };

    // --- Bottle.
    const drinkColour = { vodka: '#dfeef2', whisky: '#b8742a', schnapps: '#f09a4a', spirit: '#5aa0e8' }[a.bottle];
    const level = { chickened: 0.14, halfway: 0.7, done: 0.5, wrong: 0.3 }[a.stage] * mix(0.8, 1.1, random());
    const bx = -0.2, bz = -0.035;
    const glass = new THREE.MeshStandardMaterial({ color: '#e6f3f5', roughness: 0.06, transparent: true, opacity: 0.42 });
    s.cylinder(0.033, 0.033, 0.16 * level, [bx, TOP + 0.006 + 0.08 * level, bz], new THREE.MeshStandardMaterial({ color: drinkColour, roughness: 0.15, emissive: drinkColour, emissiveIntensity: 0.12 }), 20);
    s.lathe([[0, 0], [0.036, 0], [0.038, 0.01], [0.038, 0.16], [0.031, 0.19], [0.015, 0.215], [0.013, 0.262], [0.015, 0.264], [0.015, 0.27]], glass, [bx, TOP, bz]);
    const labelText = { vodka: 'VODKA', whisky: 'WHISKY', schnapps: 'PEACH', spirit: 'SPIRIT' }[a.bottle];
    const labelArt = paint(256, 160, (g, w, h) => {
      g.fillStyle = a.bottle === 'spirit' ? '#f4f1e6' : pick(['#f4f1e6', '#c4122f', '#1c2a6b', '#17151a']);
      const dark = g.fillStyle !== '#f4f1e6';
      g.fillRect(0, 0, w, h);
      g.fillStyle = dark ? '#f4f1e6' : '#b01a2c';
      g.fillRect(0, 12, w, 8); g.fillRect(0, h - 20, w, 8);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `bold ${labelText.length > 5 ? 50 : 58}px sans-serif`;
      g.fillText(labelText, w / 2, h * 0.45, w - 16);
      g.font = 'bold 22px sans-serif';
      g.fillText(a.bottle === 'spirit' ? 'DO NOT DRINK' : pick(['40% VOL', 'IMPORTED', 'VALUE', 'TRIPLE X']), w / 2, h * 0.76, w - 16);
    });
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.0386, 0.0386, 0.085, 24, 1, true, -1.15 + 0.35, 2.3), new THREE.MeshStandardMaterial({ map: labelArt, roughness: 0.7 }));
    label.position.set(bx, TOP + 0.085, bz);
    label.rotation.y = (random() - 0.5) * 0.6;
    label.castShadow = true;
    s.root.add(label);
    const capMaterial = s.material(pick(['#c4122f', '#d9b23a', '#1c2a6b', '#18171a']), { metalness: 0.4, roughness: 0.4 });
    if (a.stage === 'halfway') s.cylinder(0.016, 0.016, 0.02, [bx, TOP + 0.277, bz], capMaterial, 16);
    else s.cylinder(0.016, 0.016, 0.02, [bx + 0.07 + random() * 0.02, TOP + 0.01, bz + 0.1 + random() * 0.02], capMaterial, 16);

    // --- Cup of ice.
    const cx = -0.065, cz = -0.03;
    const cup = new THREE.Group();
    const clear = new THREE.MeshStandardMaterial({ color: '#f2fbff', roughness: 0.1, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    const shell = new THREE.Mesh(new THREE.LatheGeometry([[0.029, 0], [0.04, 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 28), clear);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.0017, 8, 32), white);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.1;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.004, 24), s.material('#e3eef2', { roughness: 0.2 }));
    foot.position.y = 0.002;
    rim.castShadow = foot.castShadow = true;
    cup.add(shell, rim, foot);
    const waterMaterial = new THREE.MeshStandardMaterial({ color: '#a9d2e6', roughness: 0.08, transparent: true, opacity: 0.8 });
    const iceMaterial = new THREE.MeshStandardMaterial({ color: '#eefaff', roughness: 0.12, emissive: '#bfe6f5', emissiveIntensity: 0.35 });
    const tipped = a.stage === 'wrong';
    const waterLevel = tipped ? 0 : { fresh: 0.012, half: 0.045, water: 0.06 }[a.ice];
    if (waterLevel > 0) { const water = new THREE.Mesh(new THREE.CylinderGeometry(0.029 + waterLevel * 0.11, 0.029, waterLevel, 24), waterMaterial); water.position.y = 0.004 + waterLevel / 2; cup.add(water); }
    const cubes = { fresh: 5, half: 1, water: 0 }[a.ice];
    for (let k = 0; k < cubes; k++) {
      const size = a.ice === 'fresh' ? 0.026 : 0.018;
      const cube = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), iceMaterial);
      if (tipped) cube.position.set((random() - 0.5) * 0.03, 0.02 + random() * 0.02, 0.1 + k * 0.022 + random() * 0.02);
      else cube.position.set(a.ice === 'fresh' ? Math.sin(k * 2.4) * 0.014 : 0.005, a.ice === 'fresh' ? 0.02 + k * 0.019 : waterLevel, a.ice === 'fresh' ? Math.cos(k * 2.4) * 0.014 : 0);
      cube.rotation.set(random() * 3, random() * 3, random() * 3);
      cube.castShadow = true;
      cup.add(cube);
    }
    if (tipped) {
      cup.position.set(cx, TOP + 0.036, cz + 0.01);
      cup.rotation.set(Math.PI / 2 - 0.1, 0, -0.5 - random() * 0.4, 'YXZ');
      cup.rotation.y = 0.5 + random() * 0.5;
      for (let k = 0; k < 4; k++) { const pool = s.cylinder(0.035 + random() * 0.03, 0.04, 0.002, [cx + 0.03 + random() * 0.08, TOP + 0.001 + k * 0.0002, cz + 0.07 + random() * 0.06], waterMaterial, 20); pool.scale.x = 1 + random() * 0.6; pool.castShadow = false; }
    } else {
      cup.position.set(cx, TOP, cz);
      const ringMark = s.ring(0.034, 0.0025, [cx + 0.004, TOP + 0.0006, cz + 0.003], waterMaterial);
      ringMark.rotation.x = Math.PI / 2;
      ringMark.scale.z = 0.3;
      if (a.ice !== 'fresh') { const pool = s.cylinder(0.05, 0.05, 0.0015, [cx + 0.01, TOP + 0.0008, cz + 0.012], waterMaterial, 24); pool.scale.set(1.15, 1, 0.9); pool.castShadow = false; }
    }
    s.root.add(cup);

    // --- The plan: a marker sketch taped to the tiles.
    const sketch = paint(300, 260, (g, w, h) => {
      g.fillStyle = pick(['#f3eedb', '#fff6a8', '#f3eedb', '#ffd3e2']);
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(80,120,170,0.35)'; g.lineWidth = 1.5;
      for (let y = 30; y < h; y += 26) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = '#17151a'; g.lineWidth = 9; g.lineCap = g.lineJoin = 'round';
      let dot: [number, number] = [150, 150];
      g.beginPath();
      if (a.piercing === 'ear') {
        g.moveTo(170, 205); g.bezierCurveTo(40, 190, 40, 30, 150, 30); g.bezierCurveTo(250, 30, 250, 130, 190, 160); g.bezierCurveTo(215, 215, 185, 240, 160, 232); g.bezierCurveTo(140, 225, 150, 200, 170, 205);
        g.moveTo(160, 70); g.bezierCurveTo(100, 70, 95, 140, 150, 150);
        dot = [178, 208];
      } else if (a.piercing === 'nose') {
        g.moveTo(120, 20); g.bezierCurveTo(125, 90, 190, 130, 215, 165); g.bezierCurveTo(230, 190, 200, 205, 170, 195); g.bezierCurveTo(150, 215, 115, 205, 110, 185);
        g.moveTo(160, 165); g.bezierCurveTo(150, 150, 175, 140, 190, 152);
        dot = [182, 172];
      } else if (a.piercing === 'lip') {
        g.moveTo(40, 120); g.bezierCurveTo(100, 70, 130, 80, 150, 100); g.bezierCurveTo(170, 80, 200, 70, 260, 120); g.bezierCurveTo(200, 200, 100, 200, 40, 120);
        g.moveTo(40, 120); g.bezierCurveTo(120, 135, 180, 135, 260, 120);
        dot = [205, 185];
      } else if (a.piercing === 'eyebrow') {
        g.moveTo(40, 150); g.bezierCurveTo(100, 95, 200, 95, 260, 150); g.bezierCurveTo(200, 195, 100, 195, 40, 150);
        g.moveTo(182, 148); g.arc(150, 148, 32, 0, 6.3);
        g.moveTo(30, 90); g.bezierCurveTo(100, 30, 210, 35, 275, 85);
        dot = [235, 62];
      } else {
        g.moveTo(130, 20); g.bezierCurveTo(125, 90, 70, 120, 62, 160); g.bezierCurveTo(60, 195, 110, 195, 125, 175); g.bezierCurveTo(140, 195, 160, 195, 175, 175); g.bezierCurveTo(190, 195, 240, 195, 238, 160); g.bezierCurveTo(230, 120, 175, 90, 170, 20);
        dot = [150, 190];
      }
      g.stroke();
      g.fillStyle = '#17151a';
      if (a.piercing === 'eyebrow') { g.beginPath(); g.arc(150, 148, 13, 0, 7); g.fill(); }
      // Where the hole goes: a red dot, a ring, an arrow.
      g.fillStyle = '#d3122a'; g.strokeStyle = '#d3122a';
      g.beginPath(); g.arc(dot[0], dot[1], 11, 0, 7); g.fill();
      g.lineWidth = 5;
      g.beginPath(); g.arc(dot[0], dot[1], 24, 0, 7); g.stroke();
      const ax = dot[0] < 150 ? 60 : -60, ay = dot[1] > 130 ? 36 : -36;
      g.beginPath(); g.moveTo(dot[0] - ax * 1.6, dot[1] + ay * 1.3); g.lineTo(dot[0] - ax * 0.5, dot[1] + ay * 0.45); g.stroke();
      g.font = 'bold 30px sans-serif'; g.textAlign = 'center';
      g.fillText(gone ? pick(['OW', 'DONE!', 'YES']) : pick(['HERE', 'HERE?', 'X']), Math.min(w - 46, Math.max(46, dot[0] - ax * 1.9)), Math.min(h - 12, Math.max(28, dot[1] + ay * 1.7)));
    });
    const note = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.13), new THREE.MeshStandardMaterial({ map: sketch, roughness: 0.9, side: THREE.DoubleSide }));
    note.position.set(0.065, TOP + 0.118, wallZ + 0.004);
    note.rotation.set(-0.06, 0, (random() - 0.5) * 0.2);
    note.castShadow = true;
    s.root.add(note);
    const tape = s.material('#d8d0a8', { roughness: 0.6 });
    const strip = s.box([0.045, 0.014, 0.001], [0.065 + (random() - 0.5) * 0.04, TOP + 0.183, wallZ + 0.007], tape);
    strip.rotation.z = (random() - 0.5) * 0.5;

    // --- Cork, with the pin through it once the deed is done.
    const corkX = 0.0, corkZ = 0.07;
    const cork = s.cylinder(0.011, 0.0125, 0.034, [corkX, TOP + 0.0125, corkZ], s.material('#b98a58', { roughness: 0.95 }), 14);
    cork.rotation.set(Math.PI / 2, 0, 0.6 + random() * 0.8);
    if (gone) {
      const y = TOP + 0.014;
      s.rod([corkX - 0.04, y, corkZ + 0.012], [corkX + 0.035, y + 0.003, corkZ - 0.012], 0.0015, steel, 0.0004);
      s.rod([corkX + 0.005, y + 0.0015, corkZ - 0.002], [corkX + 0.035, y + 0.003, corkZ - 0.012], 0.002, blood, 0.0005);
      s.ball([0.007, 0.004, 0.006], [corkX - 0.043, y, corkZ + 0.013], steel, 10);
      drop(corkX + 0.04, corkZ - 0.008, 0.006);
    }

    // --- Lighter.
    const lx = 0.105, lz = 0.03;
    const plastic = new THREE.MeshStandardMaterial({ color: pick(['#ff2a7a', '#27d0e8', '#ffe02a', '#7be02a', '#ff7a1a', '#8a3be0']), roughness: 0.25, emissive: '#000000' });
    let flame: THREE.Mesh | null = null;
    if (a.stage === 'halfway') {
      s.box([0.024, 0.058, 0.012], [lx, TOP + 0.029, lz], plastic);
      s.box([0.022, 0.016, 0.012], [lx, TOP + 0.066, lz], steel);
      const wheel = s.cylinder(0.006, 0.006, 0.01, [lx + 0.006, TOP + 0.076, lz], s.material('#6f7477', { metalness: 0.8, roughness: 0.5 }), 12);
      wheel.rotation.x = Math.PI / 2;
      flame = s.mesh(new THREE.ConeGeometry(0.007, 0.034, 12), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff9a20', emissiveIntensity: 2 }), [lx - 0.004, TOP + 0.094, lz]);
      flame.castShadow = false;
      s.ball([0.004, 0.008, 0.004], [lx - 0.004, TOP + 0.084, lz], new THREE.MeshStandardMaterial({ color: '#7ab8ff', emissive: '#3a7aff', emissiveIntensity: 1.5 }), 8);
      // The pin being sterilised, propped against the lighter.
      pin(lx - 0.055, lz + 0.045, 0.3, true, false);
    } else {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.012, 0.024), plastic);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.012, 0.022), steel);
      hood.position.x = 0.037;
      body.castShadow = hood.castShadow = true;
      group.add(body, hood);
      group.position.set(lx, TOP + 0.006, lz);
      group.rotation.y = random() * 3;
      s.root.add(group);
    }

    // --- Tissue.
    const tissue = (x: number, z: number, size: number, spots: number) => {
      const geometry = new THREE.SphereGeometry(1, 12, 9);
      const position = geometry.attributes.position as THREE.BufferAttribute;
      const pa = random() * 6, pb = random() * 6;
      for (let i = 0; i < position.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(position, i);
        const r = 1 + 0.26 * Math.sin(v.x * 6 + pa) * Math.sin(v.y * 7 + pb) + 0.16 * Math.sin(v.z * 11 + pa * 2);
        position.setXYZ(i, v.x * r, v.y * r * 0.62, v.z * r);
      }
      geometry.computeVertexNormals();
      const ball = s.mesh(geometry, new THREE.MeshStandardMaterial({ color: '#f5f3ea', roughness: 0.95, flatShading: true }), [x, TOP + size * 0.6, z]);
      ball.scale.setScalar(size);
      ball.rotation.y = random() * 6;
      for (let k = 0; k < spots; k++) {
        const t = random() * 6.3, up = 0.2 + random() * 0.6;
        s.ball([size * (0.22 + random() * 0.2), size * 0.14, size * (0.2 + random() * 0.2)], [x + Math.cos(t) * size * 0.75 * (1 - up * 0.6), TOP + size * (0.55 + up * 0.55), z + Math.sin(t) * size * 0.75 * (1 - up * 0.6)], blood, 10);
      }
    };
    const tx = 0.2, tz = 0.065;
    if (a.stage === 'chickened') {
      for (let k = 0; k < 3; k++) { const sheet = s.box([0.07, 0.003, 0.07], [tx, TOP + 0.002 + k * 0.003, tz], white); sheet.rotation.y = 0.2 + k * 0.12; }
    } else {
      tissue(tx, tz, 0.032, { halfway: 1, done: 5, wrong: 8 }[a.stage]);
      if (a.stage === 'wrong') { tissue(tx - 0.06, tz + 0.03, 0.026, 6); tissue(tx + 0.03, tz - 0.06, 0.028, 5); tissue(-0.02, 0.11, 0.022, 4); }
    }
    if (gone) for (let k = 0; k < (a.stage === 'wrong' ? 14 : 4); k++) drop(0.02 + random() * 0.2, -0.02 + random() * 0.13, 0.003 + random() * (a.stage === 'wrong' ? 0.009 : 0.004));
    if (a.stage === 'wrong') {
      const smear = s.box([0.11, 0.0008, 0.016], [0.1, TOP + 0.0005, 0.105], blood);
      smear.rotation.y = 0.25;
      smear.castShadow = false;
      pin(0.07, 0.09, 2.6, true, true);
    }

    // --- The jewellery waiting on its card.
    const jx = 0.235, jz = -0.03;
    const card = s.box([0.05, 0.002, 0.065], [jx, TOP + 0.001, jz], s.material('#17151a', { roughness: 0.8 }));
    card.rotation.y = -0.2 + random() * 0.4;
    const gold = s.material(pick(['#d9b23a', '#cfd4d6']), { metalness: 0.9, roughness: 0.22 });
    const jewel = (x: number, z: number) => {
      if (a.piercing === 'eyebrow' || a.piercing === 'lip') {
        s.rod([x - 0.008, TOP + 0.005, z], [x + 0.008, TOP + 0.005, z + 0.004], 0.0013, gold);
        s.ball([0.0032, 0.0032, 0.0032], [x - 0.008, TOP + 0.005, z], gold, 10);
        s.ball([0.0032, 0.0032, 0.0032], [x + 0.008, TOP + 0.005, z + 0.004], gold, 10);
      } else {
        const hoop = s.ring(a.piercing === 'septum' ? 0.008 : 0.0065, 0.0013, [x, TOP + 0.0045, z], gold, a.piercing === 'septum' ? 5 : 6.283);
        hoop.rotation.x = Math.PI / 2;
        if (a.piercing !== 'septum') s.ball([0.0028, 0.0028, 0.0028], [x + 0.0065, TOP + 0.0045, z], gold, 10);
      }
    };
    if (a.stage === 'wrong') jewel(0.14 + random() * 0.04, 0.1);
    else if (a.stage !== 'done') { jewel(jx - 0.008, jz - 0.012); if (a.piercing === 'ear') jewel(jx + 0.008, jz + 0.012); }
    else if (a.piercing === 'ear') jewel(jx + 0.008, jz + 0.012);

    // --- Who it belonged to.
    const loose = (count: number, x0: number, x1: number, z0: number, z1: number) => { for (let k = 0; k < count; k++) pin(mix(x0, x1, (k + random() * 0.6) / count), mix(z0, z1, random()), random() * 6.3, random() < (a.stage === 'chickened' ? 0 : 0.35), false, 0.05 + random() * 0.02); };
    if (a.who === 'friends') {
      const red = s.material(pick(['#d8202a', '#1f6fd0', '#f4f1e6']), { roughness: 0.5 });
      s.lathe([[0.027, 0], [0.038, 0.1], [0.035, 0.1], [0.026, 0.006], [0, 0.006]], red, [0.15, TOP, -0.055]);
      const straw = s.rod([0.145, TOP + 0.01, -0.055], [0.175, TOP + 0.15, -0.045], 0.003, s.material('#ffe02a'));
      straw.castShadow = true;
      const photo = paint(64, 256, (g, w, h) => {
        g.fillStyle = '#f4f1e6'; g.fillRect(0, 0, w, h);
        for (let k = 0; k < 4; k++) {
          g.fillStyle = pick(['#3a4a5a', '#5a3a4a', '#2a2a30']); g.fillRect(6, 6 + k * 62, w - 12, 56);
          for (const dx of [-11, 11]) { g.fillStyle = pick(['#d9b39d', '#b98666', '#8a5c44']); g.beginPath(); g.arc(w / 2 + dx, 42 + k * 62, 10, 0, 7); g.fill(); g.fillStyle = dx < 0 ? '#ff2a9a' : '#3fe01c'; g.beginPath(); g.moveTo(w / 2 + dx - 10, 38 + k * 62); g.lineTo(w / 2 + dx, 16 + k * 62); g.lineTo(w / 2 + dx + 10, 38 + k * 62); g.fill(); }
        }
      });
      const stripMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.16), new THREE.MeshStandardMaterial({ map: photo, roughness: 0.6, side: THREE.DoubleSide }));
      stripMesh.position.set(0.215, TOP + 0.105, wallZ + 0.004);
      stripMesh.rotation.set(-0.05, 0, 0.12);
      stripMesh.castShadow = true;
      s.root.add(stripMesh);
      const bracelet = s.ring(0.022, 0.003, [-0.13, TOP + 0.003, 0.1], s.material(pick(['#ff2a7a', '#27d0e8', '#7be02a']), { roughness: 0.8 }));
      bracelet.rotation.x = Math.PI / 2;
      loose(a.stage === 'chickened' ? 3 : 2, -0.25, -0.16, 0.05, 0.1);
    } else if (a.who === 'alone') {
      const shell = s.material(pick(['#18171a', '#d9b23a', '#e04a8a']), { metalness: 0.5, roughness: 0.35 });
      s.cylinder(0.035, 0.035, 0.008, [0.15, TOP + 0.004, -0.045], shell, 24);
      const lid = new THREE.Group();
      const lidShell = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.006, 24), shell);
      const lidGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.002, 24), new THREE.MeshStandardMaterial({ color: '#dfeef2', roughness: 0.05, metalness: 0.6, emissive: '#bcd3da', emissiveIntensity: 0.5 }));
      lidGlass.position.y = 0.004;
      lidShell.castShadow = true;
      lid.add(lidShell, lidGlass);
      lid.position.set(0.15, TOP + 0.04, -0.085);
      lid.rotation.x = Math.PI / 2 - 0.25;
      s.root.add(lid);
      loose(a.stage === 'chickened' ? 3 : 2, -0.25, -0.12, 0.05, 0.1);
    } else if (a.who === 'dare') {
      for (let k = 0; k < 3; k++) {
        const money = s.box([0.075, 0.002, 0.036], [0.15 + (random() - 0.5) * 0.02, TOP + 0.002 + k * 0.003, -0.05 + (random() - 0.5) * 0.02], s.material(pick(['#7fae82', '#9a8fc0', '#c9a27a']), { roughness: 0.9 }));
        money.rotation.set((random() - 0.5) * 0.15, random() * 3, (random() - 0.5) * 0.15);
      }
      for (let k = 0; k < 4; k++) s.cylinder(0.009, 0.009, 0.002, [0.11 + random() * 0.08, TOP + 0.012, -0.07 + random() * 0.05], k % 2 ? steel : s.material('#c98a3a', { metalness: 0.8, roughness: 0.35 }), 14);
      const shot = new THREE.MeshStandardMaterial({ color: '#eaf6f8', roughness: 0.08, transparent: true, opacity: 0.55 });
      for (let k = 0; k < 4; k++) {
        const x = -0.25 + k * 0.045, z = 0.085 + (random() - 0.5) * 0.012, fallen = k === 3 && random() < 0.6;
        const glassMesh = s.cylinder(0.016, 0.012, 0.04, [x, TOP + (fallen ? 0.016 : 0.02), z], shot, 14);
        if (fallen) glassMesh.rotation.z = Math.PI / 2;
        else if (k < 1 + Math.round(random() * 2)) s.cylinder(0.0125, 0.011, 0.018, [x, TOP + 0.013, z], new THREE.MeshStandardMaterial({ color: drinkColour, roughness: 0.2 }), 12);
      }
      loose(2, 0.03, 0.12, 0.095, 0.115);
    } else {
      const gaffer = s.box([0.2, 0.0012, 0.045], [-0.16, TOP + 0.0006, 0.09], s.material('#d8d0a8', { roughness: 0.7 }));
      gaffer.rotation.y = 0.05;
      const initials = ['J', 'K', 'V', 'S', 'R', 'D', 'M', 'X'];
      for (let k = 0; k < 4; k++) {
        const x = -0.235 + k * 0.05;
        pin(x, 0.085, Math.PI / 2 + (random() - 0.5) * 0.15, false, gone && k < 2 + Math.floor(random() * 3), 0.04);
        const letter = s.label(pick(initials), 0.016, 0.012, [x, TOP + 0.0016, 0.106], '#17151a', '#d8d0a8');
        letter.rotation.x = -Math.PI / 2;
        letter.castShadow = false;
      }
      loose(1, 0.04, 0.1, 0.1, 0.115);
    }

    const energy = mood.energy, phase = random() * 6;
    const lit = flame;
    return s.finish({
      update: lit ? (_dt, time) => {
        const wobble = Math.sin(time * (9 + energy * 20) + phase);
        lit.scale.set(1 + wobble * 0.12 * energy, 1 + Math.sin(time * 13 + phase) * (0.06 + energy * 0.2), 1);
        lit.rotation.z = wobble * 0.15 * energy;
      } : undefined,
    });
  },
});
