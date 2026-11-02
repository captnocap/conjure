import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type P3 = [number, number, number];
type Rnd = () => number;
type Item = { at: P3; scale?: P3; turn?: P3; color?: THREE.ColorRepresentation };

const W = 14, D = 5.5, WALL_Z = -3.05, WALL_TOP = 6.4;

function instances(geometry: THREE.BufferGeometry, material: THREE.Material, items: readonly Item[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  items.forEach((item, i) => {
    q.setFromEuler(e.set(...(item.turn ?? [0, 0, 0])));
    matrix.compose(new THREE.Vector3(...item.at), q, new THREE.Vector3(...(item.scale ?? [1, 1, 1])));
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, new THREE.Color(item.color ?? '#ffffff'));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function topTexture(kind: string, wear: number, r: Rnd) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const base = { black: '#3b3e44', teak: '#8a5a34', tile: '#e4e2d8', slate: '#6c7a78' }[kind] ?? '#3b3e44';
  ctx.fillStyle = base; ctx.fillRect(0, 0, 1024, 512);
  if (kind === 'teak') {
    for (let y = 0; y < 512; y += 64) {
      ctx.fillStyle = `rgba(${40 + r() * 40},${20 + r() * 20},10,${0.08 + r() * 0.14})`; ctx.fillRect(0, y, 1024, 64);
      ctx.strokeStyle = 'rgba(50,28,12,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
      ctx.strokeStyle = 'rgba(60,35,15,0.25)'; ctx.lineWidth = 1;
      for (let k = 0; k < 7; k++) { const gy = y + r() * 64; ctx.beginPath(); ctx.moveTo(0, gy); ctx.bezierCurveTo(300, gy + (r() - 0.5) * 14, 700, gy + (r() - 0.5) * 14, 1024, gy); ctx.stroke(); }
    }
  } else if (kind === 'tile') {
    ctx.strokeStyle = '#a9aaa2'; ctx.lineWidth = 3;
    for (let x = 0; x <= 1024; x += 46) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke(); }
    for (let y = 0; y <= 512; y += 46.5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke(); }
  } else {
    for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.02 + r() * 0.05})`; ctx.beginPath(); ctx.ellipse(r() * 1024, r() * 512, 4 + r() * 40, 2 + r() * 10, r() * 3, 0, Math.PI * 2); ctx.fill(); }
  }
  // Use leaves marks: pale rings, scratches, burns.
  const marks = Math.round(wear * 22);
  for (let i = 0; i < marks; i++) {
    const x = r() * 1024, y = r() * 512;
    if (r() < 0.5) { ctx.strokeStyle = kind === 'tile' ? 'rgba(120,90,50,0.4)' : 'rgba(225,225,215,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 12 + r() * 16, 0, Math.PI * 2); ctx.stroke(); }
    else if (r() < 0.5) { ctx.fillStyle = 'rgba(20,14,10,0.5)'; ctx.beginPath(); ctx.ellipse(x, y, 6 + r() * 16, 5 + r() * 10, r() * 3, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.strokeStyle = 'rgba(230,230,220,0.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 160, y + (r() - 0.5) * 60); ctx.stroke(); }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, base };
}

function boardTexture(kind: 'periodic' | 'chalk' | 'safety', r: Rnd) {
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  if (kind === 'periodic') {
    ctx.fillStyle = '#f3f0e4'; ctx.fillRect(0, 0, 768, 512);
    const cw = 38, ch = 44, x0 = 42, y0 = 70;
    const block = (c: number, row: number) => (c < 2 ? '#e8776a' : c > 11 ? (c === 17 ? '#8f7fd6' : '#6fb6d8') : '#f0c05a');
    for (let row = 0; row < 7; row++) for (let c = 0; c < 18; c++) {
      const present = row === 0 ? c === 0 || c === 17 : row < 3 ? c < 2 || c > 11 : true;
      if (!present) continue;
      ctx.fillStyle = block(c, row); ctx.fillRect(x0 + c * cw, y0 + row * ch, cw - 4, ch - 4);
      ctx.fillStyle = 'rgba(30,30,40,0.75)'; ctx.fillRect(x0 + c * cw + 7, y0 + row * ch + 10, 14 + r() * 8, 6); ctx.fillRect(x0 + c * cw + 7, y0 + row * ch + 24, 20, 3);
    }
    for (let row = 0; row < 2; row++) for (let c = 0; c < 14; c++) { ctx.fillStyle = row ? '#9fcf8a' : '#d79ad0'; ctx.fillRect(x0 + (c + 2.5) * cw, y0 + (7.4 + row) * ch, cw - 4, ch - 4); }
    ctx.fillStyle = '#26303a'; ctx.font = 'bold 34px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('PERIODIC TABLE OF THE ELEMENTS', 384, 44);
  } else if (kind === 'chalk') {
    ctx.fillStyle = '#2f4a3c'; ctx.fillRect(0, 0, 768, 512);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.04})`; ctx.beginPath(); ctx.ellipse(r() * 768, r() * 512, 60 + r() * 140, 18 + r() * 30, (r() - 0.5) * 0.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#f2f1e6'; ctx.textAlign = 'left';
    ctx.font = 'italic 62px Georgia, serif'; ctx.fillText('2H₂ + O₂ → 2H₂O', 60, 130);
    ctx.font = 'italic 46px Georgia, serif'; ctx.fillText('acid + base → salt + water', 60, 230);
    ctx.fillStyle = '#f2d86a'; ctx.font = 'bold 70px Georgia, serif'; ctx.fillText('TEST FRIDAY', 150, 400);
    ctx.strokeStyle = '#f2d86a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(140, 424); ctx.lineTo(620, 416); ctx.stroke();
  } else {
    ctx.fillStyle = '#f2c81e'; ctx.fillRect(0, 0, 768, 512);
    ctx.strokeStyle = '#1c1c1c'; ctx.lineWidth = 16; ctx.strokeRect(16, 16, 736, 480);
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath(); ctx.roundRect(170, 90, 428, 170, 70); ctx.fill();
    ctx.fillStyle = '#bfe3ee'; ctx.beginPath(); ctx.ellipse(290, 175, 78, 58, 0, 0, Math.PI * 2); ctx.ellipse(478, 175, 78, 58, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c1c1c'; ctx.font = 'bold 96px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GOGGLES ON', 384, 400);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineWorld({
  questions: {
    utilities: choice('What services are fitted along the rear of the bench?', {
      gas: 'Traditional paired gas taps for burners.',
      electric: 'Raised electrical outlet boxes replace the gas taps.',
      water: 'Small water outlets and drain hoses serve wet experiments.',
      mixed: 'Gas taps and a separate raised electrical supply rail.',
    }),
    enclosure: choice('How is the reagent shelving enclosed?', {
      open: 'Open shelves let the bottle rows show clearly.',
      glazed: 'Sliding glazed panels with narrow metal frames.',
      guarded: 'A low guard rail prevents bottles falling from each shelf.',
      shutters: 'Half-closed timber shutters cover part of the reagent store.',
    }),
    drying: choice('How is washed glassware dried near the sink?', {
      none: 'No separate drying fixture.',
      pegs: 'A wall-mounted board with slanted glassware pegs.',
      draining: 'A metal draining rack stands on the sink-side corner.',
      towel: 'A folded cloth and two upturned beakers drain at the sink edge.',
    }),
    records: choice('What working records are attached to the bench?', {
      none: 'No added working records.',
      numbers: 'Large station numbers label the cupboard fronts.',
      cards: 'Small practical instruction cards hang below the worktop.',
      inventory: 'An inventory clipboard hangs at the end of the reagent shelf.',
    }),
    ventilation: choice('What ventilation fixture is visible above the work area?', {
      none: 'A plain wall without a mechanical vent.',
      fan: 'A round extractor fan with visible blades.',
      grille: 'A long louvred ventilation grille high on the wall.',
      hood: 'A compact extraction hood with a short duct above the left end.',
    }),
    screens: choice('What splash screens divide the work area?', {
      none: 'An open continuous bench.',
      ends: 'Short clear splash shields protect both end stations.',
      rear: 'A low clear shield separates the front work area from rear services.',
      folding: 'A folded two-panel splash shield stands at the right rear.',
    }),
    preparation: choice('What small preparation set occupies a gap at the back?', {
      clear: 'The gap is clear and ready for work.',
      labels: 'A label roll, marker and blank sample cards are laid out.',
      gloves: 'A glove dispenser and folded blue gloves wait for the next practical.',
      weights: 'A small wooden box of reference weights stands open.',
    }),
    top: choice('What is the bench top made of?', {
      black: 'Black acid-proof resin, matt and chalky with use.',
      teak: 'Thick oiled teak boards, a century of burns and initials.',
      tile: 'White glazed tiles with grey grout.',
      slate: 'Cool grey-green slate.',
    }),
    era: choice('What kind of laboratory is it?', {
      school: 'A 1970s school lab: cream walls, varnished wooden cupboards, yellow gas taps.',
      victorian: 'A Victorian teaching laboratory: dark panelling, brass fittings, arched windows.',
      modern: 'A modern school lab: white walls, pale grey units with blue doors, chrome taps.',
    }),
    window: choice('What do the windows behind the bench show?', {
      bright: 'Tall clear windows full of cool morning light.',
      blinds: 'Venetian blinds half drawn, the light cut into bars.',
      rain: 'Grey rain running down the glass.',
      dusk: 'Blue dusk outside; pendant lamps are lit over the bench.',
      frosted: 'Small high frosted panes, an inner room.',
    }),
    shelf: choice('How is the reagent shelf kept?', {
      ordered: 'Rows of identical brown bottles with white labels, shoulder to shoulder.',
      mixed: 'Clear bottles of every colour of solution, like a sweet shop.',
      sparse: 'Half empty: gaps, a few dusty bottles, stock run down.',
      toppled: 'Disturbed: bottles knocked over, one leaking down the shelf.',
    }),
    wall: choice('What hangs on the wall beside the windows?', {
      periodic: 'A big coloured periodic table poster.',
      chalk: 'A green chalkboard with an equation and TEST FRIDAY.',
      safety: 'A yellow GOGGLES ON safety poster.',
      clock: 'A round school clock, minutes from the bell.',
      bare: 'Nothing: bare wall.',
    }),
    moment: choice('What moment is this on the bench?', {
      before: 'Before the lesson: wiped down and waiting.',
      practical: 'Mid-practical: beakers, a wash bottle and paper towels pushed aside.',
      wrong: 'It has just gone wrong: smoke rising, broken glass, a bright spill creeping to the edge.',
      after: 'After the bell: abandoned kit, a lab coat left behind, exercise books in a heap.',
    }),
    sink: choice('What state is the sink in?', {
      dry: 'Dry and clean.',
      running: 'The tap has been left running.',
      piled: 'Piled with dirty glassware.',
      dyed: 'Stained with a bright dye swirling to the plughole.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const palette = {
      school: { wall: '#e6dfc6', unit: '#a8743e', door: '#b9844a', trim: '#6b4a2a', tap: '#e2b21e', metal: '#c2a04a', frame: '#f2efe4', bg: '#dfe3dc' },
      victorian: { wall: '#cfc6ad', unit: '#5a3a26', door: '#6b452c', trim: '#3a2418', tap: '#c79a3c', metal: '#c79a3c', frame: '#4a3020', bg: '#d9d8cc' },
      modern: { wall: '#eef0ee', unit: '#c9ced2', door: '#3f7fc0', trim: '#8b9399', tap: '#c9ced0', metal: '#c9ced0', frame: '#dfe3e6', bg: '#e4e8ea' },
    }[a.era];
    const dusk = a.window === 'dusk';
    const { art: s, world } = diorama(context, {
      background: dusk ? '#aab4c8' : palette.bg, floor: null, width: W, depth: D, maxHeight: 3.1, radius: 1.42, pitch: 17, yaw: 13,
      slots: [[0, 0.95], [-3.55, 0.75], [2.85, 0.9], [-1.85, -0.85, 0, 0.7], [1.45, -0.85, 0, 0.7], [-5.75, 0.1, 0, 0.72]],
    });
    world.keyLight?.color.lerp(new THREE.Color(dusk ? '#aebcff' : '#e2ecff'), 0.5);

    // Bench top, cut around the sink.
    const { texture, base } = topTexture(a.top, mood.wear, random);
    const rough = a.top === 'tile' ? 0.3 : a.top === 'teak' ? 0.6 : 0.85;
    const topMat = new THREE.MeshStandardMaterial({ map: texture, roughness: rough });
    const plain = new THREE.MeshStandardMaterial({ color: base, roughness: rough });
    const sx0 = 4.3, sx1 = 6.5, sz0 = -1.6, sz1 = 0.6;
    const ground = s.mesh(new THREE.BoxGeometry(sx0 + W / 2, 0.24, D), topMat, [(sx0 - W / 2) / 2, -0.12, 0]);
    world.ground = ground;
    s.box([W / 2 - sx1, 0.24, D], [(sx1 + W / 2) / 2, -0.12, 0], plain);
    s.box([sx1 - sx0, 0.24, D / 2 - sz1], [(sx0 + sx1) / 2, -0.12, (sz1 + D / 2) / 2], plain);
    s.box([sx1 - sx0, 0.24, sz0 + D / 2], [(sx0 + sx1) / 2, -0.12, (sz0 - D / 2) / 2], plain);
    s.box([W, 0.34, 0.14], [0, 0.05, -D / 2 + 0.07], plain);

    // Units below: drawers over cupboard doors.
    const unit = s.material(palette.unit), door = s.material(palette.door), trim = s.material(palette.trim), metal = s.material(palette.metal, { metalness: 0.8, roughness: 0.3 });
    const H = 1.5;
    s.box([sx0 + W / 2 - 0.2, H, D - 0.3], [(sx0 - W / 2) / 2, -0.24 - H / 2, 0], unit);
    s.box([W / 2 - sx0 - 0.1, H, 0.25], [(sx0 + W / 2) / 2 - 0.05, -0.24 - H / 2, D / 2 - 0.28], unit);
    s.box([0.22, H, D - 0.3], [W / 2 - 0.21, -0.24 - H / 2, 0], unit);
    s.box([W - 0.3, 0.16, D - 0.5], [0, -0.24 - H - 0.08, -0.1], trim);
    const bays = 8, bw = (W - 0.4) / bays, fz = D / 2 - 0.15;
    for (let i = 0; i < bays; i++) {
      const x = -W / 2 + 0.2 + bw * (i + 0.5);
      s.box([bw - 0.12, 0.36, 0.05], [x, -0.24 - 0.26, fz + 0.02], door);
      s.box([0.34, 0.05, 0.05], [x, -0.24 - 0.26, fz + 0.07], metal);
      const ajar = mood.wear > 0.55 && random() < 0.25;
      const d = s.box([bw - 0.12, 0.92, 0.05], [x, -0.24 - 0.98, fz + 0.02], door);
      if (ajar) { d.rotation.y = -0.35; d.position.z += 0.12; }
      s.box([0.05, 0.22, 0.05], [x + (i % 2 ? -1 : 1) * (bw / 2 - 0.2), -0.24 - 0.85, fz + 0.07], metal);
    }

    // The sink and its swan-neck tap.
    const china = s.material('#f1efe6', { roughness: 0.25 });
    const cx = (sx0 + sx1) / 2, cz = (sz0 + sz1) / 2, depthS = 0.95;
    s.box([sx1 - sx0, 0.08, sz1 - sz0], [cx, -depthS, cz], china);
    for (const side of [-1, 1]) {
      s.box([0.1, depthS, sz1 - sz0], [cx + side * ((sx1 - sx0) / 2 - 0.05), -depthS / 2, cz], china);
      s.box([sx1 - sx0, depthS, 0.1], [cx, -depthS / 2, cz + side * ((sz1 - sz0) / 2 - 0.05)], china);
    }
    s.cylinder(0.13, 0.13, 0.02, [cx, -depthS + 0.05, cz], s.material('#3a3d40', { metalness: 0.6 }), 16);
    const tapMat = s.material(palette.tap === '#e2b21e' ? '#c9ced0' : palette.tap, { metalness: 0.85, roughness: 0.25 });
    s.cylinder(0.09, 0.11, 0.5, [cx, 0.25, sz0 - 0.5], tapMat, 14);
    s.tube([[cx, 0.5, sz0 - 0.5], [cx, 1.25, sz0 - 0.5], [cx, 1.55, sz0 - 0.25], [cx, 1.5, sz0 + 0.3], [cx, 1.15, sz0 + 0.55]], 0.055, tapMat);
    s.box([0.5, 0.07, 0.09], [cx, 0.52, sz0 - 0.5], s.material(a.era === 'school' ? '#2f6fc0' : palette.tap, { metalness: 0.4 }));
    const water = s.material('#a9d4e8', { roughness: 0.1, transparent: true, opacity: 0.8 });
    const drips: THREE.Mesh[] = [];
    if (a.sink === 'running') {
      s.rod([cx, 1.15, sz0 + 0.55], [cx, -depthS + 0.3, sz0 + 0.55], 0.04, water);
      s.box([sx1 - sx0 - 0.2, 0.04, sz1 - sz0 - 0.2], [cx, -depthS + 0.3, cz], water);
    } else if (a.sink === 'dyed') {
      const dye = s.material(['#7b2fc0', '#2a8fe0', '#e84a9a', '#58c42e'][Math.floor(random() * 4)], { roughness: 0.2 });
      s.box([sx1 - sx0 - 0.2, 0.03, sz1 - sz0 - 0.2], [cx, -depthS + 0.07, cz], dye);
      for (let i = 0; i < 5; i++) s.cylinder(0.12 + random() * 0.2, 0.1, 0.012, [sx0 - 0.3 - random() * 0.5, 0.008, cz + (random() - 0.5) * 1.6], dye, 14);
      s.box([0.5, 0.012, 0.18], [sx0 - 0.02, 0.008, cz + 0.2], dye);
    } else if (a.sink === 'piled') {
      const glassy = new THREE.MeshPhysicalMaterial({ color: '#d5ecf0', transparent: true, opacity: 0.5, roughness: 0.05 });
      for (let i = 0; i < 6; i++) {
        const b = s.mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.6, 14, 1, true), glassy, [cx + (random() - 0.5) * 1.3, -0.35 + random() * 0.3, cz + (random() - 0.5) * 1.3]);
        b.material.side = THREE.DoubleSide; b.rotation.set((random() - 0.5) * 1.6, random() * 3, (random() - 0.5) * 1.6);
      }
      s.cylinder(0.18, 0.4, 0.5, [cx + 0.3, 0.05, cz - 0.3], glassy, 14).rotation.z = 0.5;
    }
    if (a.sink === 'dry' || a.sink === 'piled') drips.push(s.ball([0.04, 0.06, 0.04], [cx, 1.05, sz0 + 0.55], water, 8));

    // Gas taps along the back.
    const lever = s.material(palette.tap, { metalness: a.era === 'school' ? 0.1 : 0.8, roughness: 0.4 });
    if (a.utilities === 'gas' || a.utilities === 'mixed') for (const x of [-3.9, -0.25, 2.9]) {
      const z = -1.95;
      s.lathe([[0, 0], [0.16, 0], [0.17, 0.04], [0.08, 0.1], [0.07, 0.62], [0.1, 0.66], [0.1, 0.78], [0, 0.8]], metal, [x, 0, z]);
      for (const side of [-1, 1]) {
        s.rod([x, 0.7, z], [x + side * 0.3, 0.62, z + 0.2], 0.04, metal);
        s.rod([x + side * 0.3, 0.62, z + 0.2], [x + side * 0.36, 0.5, z + 0.32], 0.036, metal, 0.02);
        for (let k = 0; k < 3; k++) s.ring(0.034 - k * 0.004, 0.008, [x + side * (0.32 + k * 0.016), 0.585 - k * 0.032, z + 0.24 + k * 0.03], metal).rotation.set(0.9, side * 0.4, 0);
        s.box([0.07, 0.2, 0.05], [x + side * 0.16, 0.8, z + 0.1], lever).rotation.z = side * (random() < 0.3 ? 1.2 : 0.2);
      }
    }

    if (a.utilities === 'electric' || a.utilities === 'mixed') for (const x of [-4.1, -0.5, 3.3]) {
      s.box([0.12, 0.8, 0.12], [x, 0.4, -1.82], metal);
      s.box([0.7, 0.46, 0.24], [x, 0.92, -1.82], s.material('#deded4'));
      for (const side of [-1, 1]) {
        s.box([0.2, 0.26, 0.025], [x + side * 0.17, 0.92, -1.687], s.material('#faf6e7'));
        for (const dx of [-0.04, 0.04]) s.box([0.025, 0.06, 0.01], [x + side * 0.17 + dx, 0.95, -1.67], s.material('#354343'));
      }
    }
    if (a.utilities === 'water') for (const x of [-3.9, -0.25, 2.9]) {
      s.cylinder(0.11, 0.14, 0.12, [x, 0.06, -1.95], metal, 14);
      s.tube([[x, 0.1, -1.95], [x, 0.74, -1.95], [x + 0.25, 0.85, -1.95], [x + 0.36, 0.63, -1.95]], 0.045, metal);
      s.box([0.28, 0.06, 0.09], [x, 0.5, -1.95], s.material('#477a96'));
      s.tube([[x + 0.36, 0.63, -1.95], [x + 0.4, 0.12, -1.65], [x + 0.58, 0.03, -1.5], [x + 0.9, 0.03, -1.6]], 0.03, s.material('#9cbaa9'));
    }

    // Wall, windows and what hangs there.
    const wallMat = s.material(palette.wall, { roughness: 0.95 });
    s.box([W, WALL_TOP + 1.9, 0.2], [0, (WALL_TOP - 1.9) / 2, WALL_Z], wallMat);
    if (a.era === 'victorian') s.box([W, 2.3, 0.08], [0, 1.15, WALL_Z + 0.13], s.material(palette.unit));
    if (a.era === 'modern') s.box([W, 0.5, 0.05], [0, 0.6, WALL_Z + 0.12], s.material('#dfe8ee', { roughness: 0.3 }));
    const frameMat = s.material(palette.frame);
    const glassColour = { bright: '#d9ecf8', blinds: '#d3e4ee', rain: '#a9b6c0', dusk: '#51669a', frosted: '#e6edf0' }[a.window];
    const glow = mix(0.35, 0.75, 1 - Math.abs(mood.daylight - 0.5) * 2) * (dusk ? 0.5 : a.window === 'rain' ? 0.6 : 1);
    const glassMat = new THREE.MeshStandardMaterial({ color: glassColour, emissive: glassColour, emissiveIntensity: glow, roughness: 0.3 });
    const hasBoard = a.wall !== 'bare';
    const windowXs = hasBoard ? [-0.6, 2.7, 5.5] : [-5.2, -1.9, 1.4, 4.7];
    const small = a.window === 'frosted';
    const wy0 = small ? 4.0 : 2.75, wy1 = small ? 5.7 : 5.95, ww = 2.3;
    const slats: Item[] = [], streaks: Item[] = [];
    for (const x of windowXs) {
      const wz = WALL_Z + 0.11;
      s.box([ww + 0.3, wy1 - wy0 + 0.3, 0.06], [x, (wy0 + wy1) / 2, wz], frameMat);
      s.box([ww, wy1 - wy0, 0.04], [x, (wy0 + wy1) / 2, wz + 0.03], glassMat);
      if (a.era === 'victorian' && !small) {
        const arch = s.cylinder(ww / 2 + 0.15, ww / 2 + 0.15, 0.06, [x, wy1, wz], frameMat, 24); arch.rotation.x = Math.PI / 2;
        const pane = s.cylinder(ww / 2, ww / 2, 0.04, [x, wy1, wz + 0.03], glassMat, 24); pane.rotation.x = Math.PI / 2;
      }
      s.box([0.08, wy1 - wy0, 0.05], [x, (wy0 + wy1) / 2, wz + 0.05], frameMat);
      for (let k = 1; k < (small ? 1 : 3); k++) s.box([ww, 0.08, 0.05], [x, wy0 + (wy1 - wy0) * k / 3, wz + 0.05], frameMat);
      s.box([ww + 0.5, 0.1, 0.3], [x, wy0 - 0.2, wz + 0.12], frameMat);
      if (a.window === 'blinds') {
        const drop = mix(0.45, 0.75, random());
        for (let y = wy1 - 0.1; y > wy1 - (wy1 - wy0) * drop; y -= 0.16) slats.push({ at: [x, y, wz + 0.1], scale: [ww + 0.1, 0.035, 0.12], turn: [0.5, 0, 0] });
      }
      if (a.window === 'rain') for (let k = 0; k < 16; k++) streaks.push({ at: [x + (random() - 0.5) * (ww - 0.2), mix(wy0 + 0.3, wy1 - 0.3, random()), wz + 0.056], scale: [0.02, 0.25 + random() * 0.6, 0.01], turn: [0, 0, 0.08] });
    }
    if (slats.length) s.root.add(instances(new THREE.BoxGeometry(1, 1, 1), s.material('#ece8da'), slats));
    if (streaks.length) s.root.add(instances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#e6eef2', emissive: '#e6eef2', emissiveIntensity: 0.4 }), streaks));
    const lamps: THREE.Mesh[] = [];
    if (dusk) for (const x of [-4.2, 0, 4.2]) {
      s.rod([x, WALL_TOP, -0.6], [x, 4.75, -0.6], 0.02, s.material('#2a2a2a'));
      s.lathe([[0.06, 0.5], [0.12, 0.42], [0.62, 0.02], [0.66, 0]], s.material(a.era === 'victorian' ? '#2f5a44' : '#e6e3d8', { side: THREE.DoubleSide }), [x, 4.3, -0.6]);
      lamps.push(s.ball([0.2, 0.2, 0.2], [x, 4.36, -0.6], new THREE.MeshStandardMaterial({ color: '#fff0c0', emissive: '#ffd98a', emissiveIntensity: 1.6 }), 12));
    }
    if (a.wall === 'clock') {
      const face = s.cylinder(0.95, 0.95, 0.1, [-4.4, 4.4, WALL_Z + 0.15], s.material('#f4f1e6'), 32); face.rotation.x = Math.PI / 2;
      const rim = s.ring(0.95, 0.07, [-4.4, 4.4, WALL_Z + 0.2], s.material('#26282b'));
      void rim;
      const dark = s.material('#1c1c1e');
      for (let k = 0; k < 12; k++) s.box([0.05, 0.16, 0.02], [-4.4 + Math.sin(k * Math.PI / 6) * 0.78, 4.4 + Math.cos(k * Math.PI / 6) * 0.78, WALL_Z + 0.21], dark).rotation.z = -k * Math.PI / 6;
      const hour = mix(8.6, 15.4, mood.daylight), hands: [number, number, number][] = [[(hour % 12) / 12, 0.45, 0.07], [(hour % 1), 0.7, 0.045]];
      for (const [turn, len, wide] of hands) {
        const hand = s.box([wide, len, 0.02], [-4.4 + Math.sin(turn * Math.PI * 2) * len / 2, 4.4 + Math.cos(turn * Math.PI * 2) * len / 2, WALL_Z + 0.23], dark);
        hand.rotation.z = -turn * Math.PI * 2;
      }
    } else if (hasBoard) {
      const kind = a.wall as 'periodic' | 'chalk' | 'safety';
      const bwid = kind === 'safety' ? 2.7 : 3.9, bht = kind === 'safety' ? 1.8 : 2.6;
      s.box([bwid + 0.16, bht + 0.16, 0.06], [-4.5, 4.35, WALL_Z + 0.12], s.material(kind === 'chalk' ? palette.trim : '#e9e6da'));
      s.mesh(new THREE.PlaneGeometry(bwid, bht), new THREE.MeshStandardMaterial({ map: boardTexture(kind, random), roughness: 0.9 }), [-4.5, 4.35, WALL_Z + 0.16]);
      if (kind === 'chalk') s.box([bwid, 0.06, 0.16], [-4.5, 4.35 - bht / 2 - 0.08, WALL_Z + 0.2], s.material(palette.trim));
    }

    // Reagent shelf standing at the back of the bench.
    const shelfMat = s.material(palette.unit);
    const shX0 = -3.4, shX1 = 3.4, shZ = -2.42, shD = 0.52;
    const tiers = [0.22, 1.24];
    for (const y of [...tiers, 2.26]) s.box([shX1 - shX0 + 0.1, 0.07, shD], [0, y, shZ], shelfMat);
    for (const x of [shX0, 0, shX1]) s.box([0.08, 2.3, shD], [x, 1.15, shZ], shelfMat);
    s.box([shX1 - shX0, 2.3, 0.04], [0, 1.15, shZ - shD / 2], s.material(palette.trim));
    const bodies: Item[] = [], stoppers: Item[] = [], labels: Item[] = [];
    const solution = ['#2a8fe0', '#6fd12c', '#e84a9a', '#f2c81e', '#7b2fc0', '#e0661e', '#27b8a0', '#d42a2a', '#dfe9ee'];
    const keep = a.shelf === 'sparse' ? 0.45 : mix(0.8, 1, mood.density);
    let leak: P3 | null = null;
    tiers.forEach((y, tier) => {
      for (let x = shX0 + 0.3; x < shX1 - 0.2; x += 0.34 + random() * 0.04) {
        if (Math.abs(x) < 0.2 || random() > keep) continue;
        const k = a.shelf === 'ordered' ? 1 : 0.8 + random() * 0.45, h = 0.62 * (a.shelf === 'ordered' ? 1 : 0.75 + random() * 0.5);
        const colour = a.shelf === 'mixed' ? solution[Math.floor(random() * solution.length)] : a.shelf === 'ordered' ? '#7a431c' : random() < 0.6 ? '#7a431c' : random() < 0.5 ? '#2f6b4a' : solution[Math.floor(random() * solution.length)];
        const down = a.shelf === 'toppled' && random() < 0.3;
        const by = y + 0.035;
        if (down) {
          const yaw = (random() - 0.5) * 0.8;
          bodies.push({ at: [x, by + 0.15 * k, shZ + 0.02], scale: [k, h / 0.62, k], turn: [Math.PI / 2 + yaw * 0.2, yaw, Math.PI / 2], color: colour });
          if (!leak && tier === 1) leak = [x, by, shZ + shD / 2];
        } else {
          bodies.push({ at: [x, by, shZ + (random() - 0.5) * 0.06], scale: [k, h / 0.62, k], color: colour });
          stoppers.push({ at: [x, by + h * 1.0, shZ], scale: [k, 1, k], color: a.shelf === 'mixed' ? '#b98a55' : '#1e1e20' });
          if (a.shelf !== 'sparse' || random() < 0.6) labels.push({ at: [x, by + h * 0.38, shZ + 0.151 * k], scale: [0.2 * k, 0.17, 0.012], color: mood.wear > 0.6 ? '#ddd0aa' : '#f5f1e4' });
        }
      }
    });
    const bottleGeo = new THREE.LatheGeometry([[0, 0], [0.14, 0], [0.15, 0.03], [0.15, 0.4], [0.11, 0.5], [0.055, 0.55], [0.055, 0.62], [0, 0.62]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
    if (bodies.length) s.root.add(instances(bottleGeo, new THREE.MeshStandardMaterial({ roughness: 0.2 }), bodies));
    if (stoppers.length) s.root.add(instances(new THREE.CylinderGeometry(0.07, 0.05, 0.1, 10), new THREE.MeshStandardMaterial({ roughness: 0.6 }), stoppers));
    if (labels.length) s.root.add(instances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9 }), labels));
    if (a.enclosure === 'guarded') for (const y of tiers) {
      for (const x of [shX0, 0, shX1]) s.rod([x, y + 0.035, shZ + 0.27], [x, y + 0.27, shZ + 0.27], 0.018, metal);
      s.rod([shX0, y + 0.27, shZ + 0.27], [shX1, y + 0.27, shZ + 0.27], 0.018, metal);
    }
    if (a.enclosure === 'glazed') {
      const glazing = s.material('#b9d6d5', { transparent: true, opacity: 0.12, depthWrite: false, roughness: 0.15 });
      for (const x of [-1.7, 1.7]) {
        s.box([3.25, 2.14, 0.025], [x, 1.22, shZ + 0.32], glazing);
        for (const dx of [-1.62, 1.62]) s.box([0.045, 2.18, 0.035], [x + dx, 1.22, shZ + 0.34], metal);
        for (const y of [0.14, 2.3]) s.box([3.28, 0.045, 0.035], [x, y, shZ + 0.34], metal);
        s.box([0.055, 0.28, 0.08], [x - 1.42, 1.2, shZ + 0.36], metal);
      }
    }
    if (a.enclosure === 'shutters') for (const x of [-2.5, 2.5]) {
      s.box([1.65, 2.19, 0.06], [x, 1.2, shZ + 0.33], shelfMat);
      for (let i = 0; i < 5; i++) s.box([0.022, 2.15, 0.02], [x - 0.65 + i * 0.325, 1.2, shZ + 0.37], trim);
      s.box([0.07, 0.25, 0.05], [x + (x < 0 ? 0.65 : -0.65), 1.2, shZ + 0.39], metal);
    }
    // A few big named bottles on top.
    const names = ['HCl', 'NaOH', 'CuSO4', 'H2SO4', 'KMnO4', 'AgNO3', 'NH3', 'ETHANOL'];
    const bigTint: Record<string, string> = { CuSO4: '#2a8fe0', KMnO4: '#7b2fc0' };
    const tall = a.shelf === 'sparse' ? 2 : 4;
    for (let i = 0; i < tall; i++) {
      const name = names[Math.floor(random() * names.length)], x = mix(shX0 + 0.5, shX1 - 0.5, (i + 0.5) / tall) + (random() - 0.5) * 0.4;
      const mat = s.material(bigTint[name] ?? (a.shelf === 'mixed' ? '#dfe9ee' : '#7a431c'), { roughness: 0.2 });
      s.lathe([[0, 0], [0.2, 0], [0.22, 0.04], [0.22, 0.52], [0.16, 0.66], [0.08, 0.72], [0.08, 0.82], [0, 0.82]], mat, [x, 2.3, shZ]);
      s.cylinder(0.1, 0.07, 0.12, [x, 3.16, shZ], s.material('#1e1e20'), 10);
      s.label(name, 0.36, 0.26, [x, 2.6, shZ + 0.225], '#1c1c1c', '#f5f1e4');
    }
    if (leak) {
      const [lx, ly, lz] = leak as P3;
      const acid = s.material('#c9d22a', { roughness: 0.2, emissive: '#6a7010', emissiveIntensity: 0.3 });
      s.box([0.3, 0.015, 0.2], [lx, ly + 0.008, lz - 0.1], acid);
      s.rod([lx, ly, lz + 0.01], [lx + 0.03, tiers[0] + 0.04, lz + 0.01], 0.022, acid);
      s.cylinder(0.3, 0.26, 0.015, [lx + 0.05, 0.008, lz + 0.25], acid, 16);
    }

    // The moment: loose kit in the gaps between the standing places.
    const glass = new THREE.MeshPhysicalMaterial({ color: '#d5ecf0', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const rim = s.material('#eaf5f6', { roughness: 0.1 });
    const beaker = (x: number, z: number, colour: string, level = 0.5, r = 0.2) => {
      s.mesh(new THREE.CylinderGeometry(r, r * 0.96, r * 2.3, 20, 1, true), glass, [x, r * 1.15, z]);
      s.ring(r, 0.012, [x, r * 2.3, z], rim).rotation.x = Math.PI / 2;
      s.cylinder(r * 0.93, r * 0.9, r * 2.3 * level, [x, r * 2.3 * level / 2 + 0.01, z], s.material(colour, { roughness: 0.15 }), 20);
    };
    const smoke: THREE.Mesh[] = [];
    const bright = solution[Math.floor(random() * 8)];
    if (a.moment === 'practical' || a.moment === 'after') {
      beaker(-4.6, -1.35, bright, 0.55);
      beaker(3.75, -1.3, solution[Math.floor(random() * 8)], 0.3, 0.16);
      // Wash bottle.
      s.lathe([[0, 0], [0.14, 0], [0.15, 0.4], [0.08, 0.5], [0.06, 0.56], [0, 0.56]], s.material('#eef2ea', { roughness: 0.4 }), [-0.2, 0, -1.2]);
      s.cylinder(0.07, 0.07, 0.06, [-0.2, 0.58, -1.2], s.material('#d42a2a'), 12);
      s.tube([[-0.2, 0.6, -1.2], [-0.2, 0.72, -1.2], [-0.05, 0.74, -1.15], [0.08, 0.6, -1.1]], 0.014, s.material('#d42a2a'));
      for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) s.box([0.5, 0.02, 0.4], [5.6 + (random() - 0.5) * 0.4, 0.012 + i * 0.022, 1.65 + (random() - 0.5) * 0.3], s.material('#e9efe6', { roughness: 1 })).rotation.y = (random() - 0.5) * 0.8;
      s.rod([-6.5, 0.02, -1.5], [-5.9, 0.02, -1.15], 0.02, rim);
    }
    if (a.moment === 'after') {
      const coat = s.material('#f1f0ea', { roughness: 1 });
      s.box([1.1, 0.1, 1.2], [-6.35, 0.05, 1.8], coat).rotation.y = 0.15;
      s.box([1.0, 1.1, 0.08], [-6.35, -0.55, D / 2 + 0.06], coat).rotation.z = 0.04;
      s.box([0.24, 0.5, 0.09], [-5.95, -1.15, D / 2 + 0.08], coat).rotation.z = -0.2;
      const covers = ['#3f7fc0', '#d42a2a', '#f2c81e', '#2f6b4a', '#e0661e'];
      for (let i = 0; i < 3 + Math.round(mood.density * 4); i++) s.box([0.62, 0.035, 0.82], [5.55 + (random() - 0.5) * 0.12, 0.02 + i * 0.037, 1.65 + (random() - 0.5) * 0.12], s.material(covers[i % covers.length])).rotation.y = (random() - 0.5) * 0.5;
    }
    if (a.moment === 'wrong') {
      const spillMat = s.material(bright, { roughness: 0.15, emissive: bright, emissiveIntensity: 0.2 });
      const px = 4.0 + random() * 0.3, pz = 1.75;
      for (let i = 0; i < 9; i++) s.cylinder(0.25 + random() * 0.35, 0.3, 0.014, [px + (random() - 0.5) * 1.1, 0.008 + i * 0.0006, pz + (random() - 0.5) * 0.9], spillMat, 18).scale.z = 0.6 + random() * 0.5;
      // It has reached the front edge and is running down the cupboards.
      for (let i = 0; i < 3; i++) { const x = px + (i - 1) * 0.3 + (random() - 0.5) * 0.1; s.box([0.07, 0.3 + random() * 0.6, 0.02], [x, -0.24 - 0.2 - random() * 0.2, D / 2 + 0.012], spillMat); s.box([0.16, 0.016, 0.5], [x, 0.008, D / 2 - 0.25], spillMat); }
      const shard = new THREE.MeshPhysicalMaterial({ color: '#e3f3f5', roughness: 0.05, transparent: true, opacity: 0.85 });
      for (let i = 0; i < 12; i++) { const b = s.box([0.08 + random() * 0.16, 0.012, 0.05 + random() * 0.1], [px + (random() - 0.5) * 1.3, 0.03, pz + (random() - 0.5) * 0.9], shard); b.rotation.set((random() - 0.5) * 0.7, random() * 3, (random() - 0.5) * 0.7); }
      s.mesh(new THREE.CylinderGeometry(0.06, 0.24, 0.3, 14, 1, true), shard, [px + 0.5, 0.12, pz - 0.3]).rotation.z = 1.4;
      // A scorched crucible still pouring smoke at the back.
      const bx = -4.6, bz = -1.35;
      s.cylinder(0.5, 0.55, 0.012, [bx, 0.007, bz], s.material('#17161a', { roughness: 1 }), 20);
      s.lathe([[0, 0], [0.12, 0], [0.2, 0.22], [0.17, 0.22], [0.1, 0.04], [0, 0.04]], s.material('#3a3632', { roughness: 0.9 }), [bx, 0.01, bz]);
      s.ball([0.1, 0.03, 0.1], [bx, 0.1, bz], new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff5a10', emissiveIntensity: 1.4 }), 10);
      const haze = new THREE.MeshStandardMaterial({ color: '#8d8f96', transparent: true, opacity: 0.45, roughness: 1, depthWrite: false });
      let ox = 0;
      for (let i = 0; i < 9; i++) { ox += (random() - 0.4) * 0.22; smoke.push(s.ball([0.16 + i * 0.07, 0.16 + i * 0.06, 0.16 + i * 0.07], [bx + ox, 0.4 + i * 0.42, bz - i * 0.05], haze, 12)); }
      s.rod([-0.6, 0.02, -1.3], [0.1, 0.02, -1.1], 0.02, rim);
    }
    if (a.moment === 'before') {
      for (let i = 0; i < 4; i++) s.box([0.5, 0.02, 0.4], [5.6, 0.012 + i * 0.021, 1.65], s.material('#e9efe6', { roughness: 1 }));
      beaker(-4.6, -1.45, '#dfe9ee', 0, 0.2); beaker(-4.6 + 0.02, -1.45, '#dfe9ee', 0, 0.15);
    }
    // Chalky dust and crumbs of use.
    if (mood.wear > 0.3) {
      const dust: Item[] = [];
      for (let i = 0; i < Math.round(mood.wear * 60); i++) dust.push({ at: [(random() - 0.5) * (W - 3.5) - 1.3, 0.006, (random() - 0.5) * (D - 0.6)], scale: [0.03 + random() * 0.05, 0.006, 0.03 + random() * 0.04], turn: [0, random() * 3, 0], color: random() < 0.5 ? '#e9e6d8' : '#5a4a36' });
      s.root.add(instances(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 1 }), dust));
    }

    if (a.drying === 'pegs') {
      s.box([1.2, 1.25, 0.08], [5.55, 1.72, WALL_Z + 0.18], s.material('#c2c8bb'));
      for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) s.rod([5.1 + col * 0.3, 1.3 + row * 0.37, WALL_Z + 0.22], [5.1 + col * 0.3, 1.45 + row * 0.37, WALL_Z + 0.62], 0.025, metal);
    } else if (a.drying === 'draining') {
      for (const x of [6.6, 6.94]) s.rod([x, 0.025, -1.0], [x, 0.025, 0.1], 0.025, metal);
      for (let i = 0; i < 7; i++) s.tube([[6.6, 0.025, -0.95 + i * 0.17], [6.65, 0.25, -0.95 + i * 0.17], [6.89, 0.25, -0.95 + i * 0.17], [6.94, 0.025, -0.95 + i * 0.17]], 0.022, metal);
    } else if (a.drying === 'towel') {
      s.box([0.35, 0.025, 0.9], [6.75, 0.0125, -0.3], s.material('#e4dfcf'));
      for (const z of [-0.55, -0.05]) {
        s.mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.31, 16, 1, true), glass, [6.75, 0.18, z]);
        s.ring(0.14, 0.012, [6.75, 0.025, z], rim).rotation.x = Math.PI / 2;
      }
    }
    if (a.records === 'numbers' || a.records === 'cards') for (let i = 0; i < 4; i++) {
      const x = -5.2 + i * 3.4;
      s.label(a.records === 'numbers' ? String(i + 1).padStart(2, '0') : ['RECORD', 'MEASURE', 'COMPARE', 'CLEAN'][i], a.records === 'numbers' ? 0.44 : 0.8, 0.23, [x, -0.52, D / 2 - 0.055], '#324b50', '#e8e1c9');
    }
    if (a.records === 'inventory') {
      s.box([0.75, 1.0, 0.035], [-3.8, 1.25, WALL_Z + 0.18], trim);
      s.label('STOCK', 0.64, 0.85, [-3.8, 1.25, WALL_Z + 0.205], '#3b4c46', '#e5dfc8');
      s.box([0.25, 0.11, 0.045], [-3.8, 1.73, WALL_Z + 0.23], metal);
    }
    if (a.ventilation === 'fan') {
      s.box([1.05, 1.05, 0.18], [-5.7, 5.8, WALL_Z + 0.24], s.material('#7f8a87'));
      s.cylinder(0.43, 0.43, 0.08, [-5.7, 5.8, WALL_Z + 0.37], s.material('#465b5c'), 24).rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2;
        s.ball([0.1, 0.28, 0.025], [-5.7 + Math.sin(angle) * 0.19, 5.8 + Math.cos(angle) * 0.19, WALL_Z + 0.43], metal, 12).rotation.z = -angle - 0.2;
      }
      s.ball([0.09, 0.09, 0.04], [-5.7, 5.8, WALL_Z + 0.46], metal, 12);
    } else if (a.ventilation === 'grille') {
      s.box([3.2, 0.4, 0.12], [-3.7, 6.09, WALL_Z + 0.2], s.material('#566564'));
      for (let i = 0; i < 16; i++) s.box([0.045, 0.31, 0.1], [-5.13 + i * 0.19, 6.09, WALL_Z + 0.3], metal).rotation.y = 0.3;
    } else if (a.ventilation === 'hood') {
      s.cylinder(0.13, 0.13, 1.5, [-5.7, 5.5, -2.4], metal, 16);
      s.lathe([[0.14, 0.5], [0.21, 0.35], [0.68, 0.03], [0.7, 0]], s.material('#94a5a0', { side: THREE.DoubleSide }), [-5.7, 4.25, -2.4]);
      s.rod([-5.7, 6.15, -2.4], [-5.7, 6.15, WALL_Z + 0.1], 0.12, metal);
    }
    if (a.screens !== 'none') {
      const screen = s.material('#c3d9d7', { transparent: true, opacity: 0.16, depthWrite: false, roughness: 0.15 });
      const panel = (x: number, z: number, width: number, yaw: number) => {
        const g = new THREE.Group();
        const add = (o: THREE.Object3D) => g.add(o);
        add(s.box([width, 1.25, 0.025], [0, 0.7, 0], screen));
        for (const side of [-1, 1]) {
          add(s.box([0.045, 1.35, 0.045], [side * width / 2, 0.675, 0], metal));
          add(s.box([0.25, 0.045, 0.35], [side * width / 2, 0.0225, 0], metal));
        }
        add(s.box([width, 0.045, 0.045], [0, 1.33, 0], metal));
        g.position.set(x, 0, z); g.rotation.y = yaw; s.root.add(g);
      };
      if (a.screens === 'ends') { panel(-6.7, -0.5, 1.8, Math.PI / 2); panel(6.8, 1.4, 1.65, Math.PI / 2); }
      if (a.screens === 'rear') { panel(-2.1, -1.45, 2.4, 0); panel(1.1, -1.45, 2.4, 0); }
      if (a.screens === 'folding') { panel(4.4, 1.7, 0.9, 0.35); panel(5.25, 1.55, 0.9, 0); }
    }
    if (a.preparation === 'labels') {
      s.cylinder(0.15, 0.15, 0.1, [-5.3, 0.05, -2.13], s.material('#e6d9b5'), 18);
      s.cylinder(0.06, 0.06, 0.101, [-5.3, 0.05, -2.13], trim, 16);
      s.box([0.45, 0.015, 0.27], [-5.85, 0.008, -2.1], s.material('#eee5d0'));
      s.rod([-6.2, 0.035, -1.9], [-5.65, 0.035, -1.85], 0.025, s.material('#344f62'));
    } else if (a.preparation === 'gloves') {
      s.box([0.8, 0.3, 0.45], [-5.7, 0.15, -2.1], s.material('#a9c8cf'));
      s.box([0.4, 0.01, 0.1], [-5.7, 0.305, -2.1], s.material('#354b56'));
      s.label('GLOVES', 0.55, 0.17, [-5.7, 0.16, -1.868], '#35545b', '#c6dadd');
      for (const x of [-5.45, -5.95]) { s.ball([0.16, 0.026, 0.15], [x, 0.026, -1.58], s.material('#86b9c8'), 12); for (let i = 0; i < 4; i++) s.rod([x - 0.11 + i * 0.065, 0.026, -1.5], [x - 0.11 + i * 0.065, 0.025, -1.26], 0.025, s.material('#86b9c8')); }
    } else if (a.preparation === 'weights') {
      s.box([1.15, 0.13, 0.55], [-5.65, 0.065, -2.0], trim);
      s.box([1.15, 0.52, 0.05], [-5.65, 0.32, -2.27], shelfMat);
      for (let i = 0; i < 5; i++) { const r = 0.06 + i * 0.012, x = -6.1 + i * 0.23; s.cylinder(r, r, 0.12 + i * 0.025, [x, 0.13 + (0.12 + i * 0.025) / 2, -2.0], metal, 14); s.cylinder(r * 0.45, r * 0.45, 0.045, [x, 0.13 + 0.12 + i * 0.025 + 0.0225, -2.0], metal, 12); }
    }

    const energy = mix(0.3, 1.6, mood.energy);
    const starts = smoke.map((m) => m.position.clone());
    world.update = (_dt, time) => {
      smoke.forEach((m, i) => { m.position.x = starts[i].x + Math.sin(time * 0.7 * energy + i * 0.8) * 0.05 * i; m.position.y = starts[i].y + Math.sin(time * energy + i) * 0.04; });
      drips.forEach((m) => { const t = (time * 0.5 * energy) % 1; m.position.y = 1.05 - t * t * 1.6; });
      lamps.forEach((m, i) => { (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.6 + Math.sin(time * 9 + i * 4) * 0.05 * mood.wear; });
    };
    return world;
  },
});
