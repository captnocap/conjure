import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, disposeTree, mix } from '@conjure/kit';

const W = 9, D = 8, HW = 3.3, RC = 1.5, PHI = 0.96; // room, wall height, cove radius and sweep
const BACK = -D / 2 + 0.15, LEFT = -W / 2 + 0.15; // inner wall faces

function brickCanvas(random: () => number, base: string, mortar: string, grime: number) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = mortar; ctx.fillRect(0, 0, 512, 512);
  const tone = new THREE.Color();
  for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) {
    tone.set(base).offsetHSL((random() - 0.5) * 0.02, (random() - 0.5) * 0.1, (random() - 0.5) * 0.13);
    ctx.fillStyle = tone.getStyle();
    const x = (c + (r % 2) / 2) * 128;
    ctx.fillRect(x + 4, r * 64 + 4, 120, 56);
    if (x + 128 > 512) ctx.fillRect(x - 512 + 4, r * 64 + 4, 120, 56);
  }
  for (let i = 0; i < grime * 70; i++) { ctx.fillStyle = `rgba(24,20,16,${0.05 + random() * 0.1})`; ctx.beginPath(); ctx.arc(random() * 512, random() * 512, 20 + random() * 70, 0, 7); ctx.fill(); }
  return canvas;
}

/** A soft round stain, scorch or pool of light to lay on a wall or the floor. */
function blot(colour: string, alpha: number, rays = 0, random: () => number = () => 0.5) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 126);
  g.addColorStop(0, colour); g.addColorStop(0.35, colour); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = colour; ctx.lineCap = 'round';
  for (let i = 0; i < rays; i++) { const a = random() * 6.28, r = 60 + random() * 64; ctx.globalAlpha = alpha * 0.6; ctx.lineWidth = 3 + random() * 12; ctx.beginPath(); ctx.moveTo(128 + Math.cos(a) * 20, 128 + Math.sin(a) * 20); ctx.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); ctx.stroke(); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
}

/** A strip of vault springing from a wall top: axis along x, rising from the -z side. */
function coveGeometry(length: number, tilesAlong: number) {
  const n = 12, positions: number[] = [], uvs: number[] = [], index: number[] = [];
  for (let i = 0; i <= n; i++) {
    const phi = (i / n) * PHI, y = Math.sin(phi) * RC, z = RC - Math.cos(phi) * RC;
    positions.push(-length / 2, y, z, length / 2, y, z);
    uvs.push(0, (i / n) * 1.2, tilesAlong, (i / n) * 1.2);
  }
  for (let i = 0; i < n; i++) { const p = i * 2; index.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index); geometry.computeVertexNormals();
  return geometry;
}

export default defineWorld({
  questions: {
    state: choice('What state is the workshop in?', {
      feverish: 'Mid-experiment: fire roaring, every surface in use, papers everywhere, no sleep for days.',
      quiet: 'Late and still: the fire banked, things put away, one candle left burning.',
      stripped: 'Stripped by the bailiffs: shelves bare, lot numbers chalked up, crates by the door, a notice nailed to the wall.',
      exploded: 'The aftermath of an explosion: a scorched star on floor and wall, shelves down, brick and glass thrown across the room.',
      abandoned: 'Shut up for years: cobwebs in the arches, dust over everything, the hearth long cold.',
    }),
    masonry: choice('What are the walls built of?', {
      red: 'Soft old red brick.',
      limewash: 'Brick under flaking white limewash, brighter and poorer.',
      stone: 'Grey-brown rubble stone, an older cellar than the house above.',
      damp: 'Dark brick stained green and black with damp.',
    }),
    window: choice('What comes through the barred street-level window?', {
      day: 'A dusty shaft of daylight.',
      moon: 'Cold blue moonlight.',
      snow: 'Flat white light, with snow heaped against the bars.',
      boarded: 'Almost nothing: it has been boarded over from inside, slivers only.',
    }),
    shelves: choice('What stands on the shelves in the arches?', {
      glass: 'Coloured glass: flasks, bottles and jars of liquids.',
      stoneware: 'Earthenware crocks and stoppered jars.',
      books: 'Books, ledgers and rolled parchments.',
      curios: 'Skulls, shells, horns and pickled things in jars.',
      mixed: 'A jumble of everything.',
    }),
    hearth: choice('What is built against the side wall?', {
      open: 'A wide arched hearth with a cauldron hung over the fire.',
      range: 'A long brick range with a row of small furnace mouths and pans on top.',
      bricked: 'A hearth that has been bricked up, with only an iron stove pipe left.',
    }),
    floor: choice('What is the floor?', {
      flagstone: 'Big uneven flagstones.',
      brick: 'Brick laid on edge.',
      earth: 'Packed earth strewn with straw.',
      wet: 'Flagstones standing in puddles.',
    }),
    hanging: choice('What hangs from the iron brackets?', {
      herbs: 'Bunches of drying herbs and roots.',
      chains: 'Chains and hooks.',
      lanterns: 'Horn lanterns.',
      none: 'Nothing at all.',
    }),
    writing: choice('What is on the wall under the window?', {
      sums: 'Chalked calculations, triangles and half-rubbed-out symbols.',
      tally: 'A long tally of days in groups of five.',
      ouroboros: 'A big chalk drawing of a serpent biting its own tail.',
      notice: 'A printed official notice with a red seal.',
      none: 'Bare wall.',
    }),
    door: choice('How is the door at the top of the steps?', {
      shut: 'Shut and barred from inside.',
      ajar: 'Ajar, with warm light from the house above.',
      forced: 'Forced: hanging from one hinge, the frame splintered.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const state = a.state;
    const grime = Math.min(1, mood.wear * 0.6 + { feverish: 0.3, quiet: 0.15, stripped: 0.2, exploded: 0.7, abandoned: 0.5 }[state]);
    const backdrop = new THREE.Color({ feverish: '#dccdb2', quiet: '#c2c0bd', stripped: '#d9d7cf', exploded: '#c6bfb5', abandoned: '#d0cfc4' }[state]).lerp(new THREE.Color('#9a958b'), (1 - mood.cheer) * 0.3);
    const { art: s, world } = diorama(context, {
      background: `#${backdrop.getHexString()}`, floor: '#8c877c', width: W, depth: D, maxHeight: 2.5, radius: 1.25, pitch: 30, yaw: 30,
      slots: [[0.6, 0.9], [-1.8, -1.2], [2.9, -1.2], [2.9, 2.0], [-1.6, 2.3]],
    });
    const root = s.root;
    const dusty = (colour: string, amount = state === 'abandoned' ? 0.45 : 0) => `#${new THREE.Color(colour).lerp(new THREE.Color('#a9a497'), amount).getHexString()}`;
    for (const child of root.children) if ((child as THREE.HemisphereLight).isHemisphereLight) { (child as THREE.HemisphereLight).intensity *= mix(0.72, 1, mood.cheer); (child as THREE.HemisphereLight).groundColor.set('#8a7460'); }

    // Masonry.
    const [brickBase, mortar] = ({ red: ['#a35a41', '#cfc4ae'], limewash: ['#d9d3c2', '#bfb8a6'], stone: ['#958b79', '#6f685b'], damp: ['#6f4a3c', '#4c4a40'] } as const)[a.masonry];
    const bricks = brickCanvas(random, brickBase, mortar, grime);
    if (a.masonry === 'damp' || a.masonry === 'limewash') {
      const ctx = bricks.getContext('2d')!;
      if (a.masonry === 'damp') for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(60,90,50,${0.1 + random() * 0.2})`; ctx.fillRect(random() * 512, random() * 512, 30 + random() * 90, 20 + random() * 60); }
      else for (let i = 0; i < 5 + grime * 8; i++) { ctx.fillStyle = `rgba(163,90,65,${0.5 + random() * 0.3})`; const r = Math.floor(random() * 8), c = Math.floor(random() * 4); ctx.fillRect((c + (r % 2) / 2) * 128 + 4, r * 64 + 4, 120, 56); }
    }
    const brickMat = (rx: number, ry: number) => {
      const map = new THREE.CanvasTexture(bricks); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(rx, ry);
      return new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide });
    };
    const stone = s.material(dusty(a.masonry === 'damp' ? '#77756a' : '#b3aa98'), { roughness: 0.95 });
    const iron = s.material('#2a292c', { metalness: 0.45, roughness: 0.7 });
    const timber = s.material(dusty('#6a4c30'), { roughness: 0.95 });
    const darkTimber = s.material(dusty('#4a3422'), { roughness: 0.95 });
    const black = s.material('#141110', { roughness: 1 });

    s.box([W, HW, 0.3], [0, HW / 2, -D / 2], brickMat(W / 1.2, HW / 1.2));
    s.box([0.3, HW, D], [-W / 2, HW / 2, 0], brickMat(D / 1.2, HW / 1.2));
    s.mesh(coveGeometry(W, W / 1.2), brickMat(1, 1), [0, HW, BACK]);
    const sideCove = s.mesh(coveGeometry(D, D / 1.2), brickMat(1, 1), [LEFT, HW, 0]); sideCove.rotation.y = Math.PI / 2;
    const rib = (along: number, side: boolean) => {
      const points: [number, number, number][] = [];
      for (let i = 0; i <= 6; i++) { const phi = (i / 6) * PHI, up = HW + Math.sin(phi) * (RC - 0.03), out = RC - Math.cos(phi) * (RC - 0.03); points.push(side ? [LEFT + out, up, along] : [along, up, BACK + out]); }
      s.tube(points, 0.09, stone);
    };
    for (const x of [-1.5, 1.5, 4.35]) rib(x, false);
    for (const z of [0.45, 3.85]) rib(z, true);

    // Floor.
    const fc = document.createElement('canvas'); fc.width = fc.height = 1024;
    const f = fc.getContext('2d')!;
    const floorBase = { flagstone: '#8d887c', brick: '#99604a', earth: '#7d6a50', wet: '#6f706c' }[a.floor];
    const tone = new THREE.Color();
    f.fillStyle = a.floor === 'earth' ? floorBase : '#4a463e'; f.fillRect(0, 0, 1024, 1024);
    const cell = (x: number, y: number, w: number, h: number, gap = 3) => { tone.set(floorBase).offsetHSL(0, (random() - 0.5) * 0.05, (random() - 0.5) * 0.09); f.fillStyle = tone.getStyle(); f.fillRect(x + gap, y + gap, w - gap * 2, h - gap * 2); };
    if (a.floor === 'flagstone' || a.floor === 'wet') { let y = 0; while (y < 1024) { const h = 90 + random() * 70; let x = -random() * 100; while (x < 1024) { const w = 100 + random() * 110; cell(x, y, w, h); x += w; } y += h; } }
    if (a.floor === 'brick') for (let r = 0; r < 44; r++) for (let c = -1; c < 16; c++) cell((c + (r % 2) / 2) * 68, r * 23.3, 68, 23.3, 1.5);
    for (let i = 0; i < 300 + grime * 500; i++) { f.fillStyle = `rgba(${random() < 0.6 ? '25,20,15' : '200,190,170'},${0.03 + random() * 0.07})`; f.beginPath(); f.arc(random() * 1024, random() * 1024, 4 + random() * 40, 0, 7); f.fill(); }
    if (a.floor === 'earth') { f.strokeStyle = 'rgba(214,190,110,0.75)'; f.lineWidth = 2; for (let i = 0; i < 500; i++) { const x = random() * 1024, y = random() * 1024, g = random() * 6.28, l = 8 + random() * 22; f.beginPath(); f.moveTo(x, y); f.lineTo(x + Math.cos(g) * l, y + Math.sin(g) * l); f.stroke(); } }
    const blast: [number, number] = [-2.3, -2.5]; // where it went off, by the back-left arch
    if (state === 'exploded') {
      const bx = (blast[0] / W + 0.5) * 1024, by = (blast[1] / D + 0.5) * 1024;
      const g = f.createRadialGradient(bx, by, 10, bx, by, 430); g.addColorStop(0, 'rgba(8,6,5,0.96)'); g.addColorStop(0.3, 'rgba(14,10,8,0.75)'); g.addColorStop(1, 'rgba(14,10,8,0)');
      f.fillStyle = g; f.fillRect(0, 0, 1024, 1024);
      f.strokeStyle = 'rgba(10,8,6,0.45)'; f.lineCap = 'round';
      for (let i = 0; i < 40; i++) { const ang = random() * Math.PI * 0.75 - 0.1, r1 = 250 + random() * 420; f.lineWidth = 5 + random() * 22; f.beginPath(); f.moveTo(bx + Math.cos(ang) * 70, by + Math.sin(ang) * 70); f.lineTo(bx + Math.cos(ang) * r1, by + Math.sin(ang) * r1); f.stroke(); }
    }
    if (state === 'stripped') { f.strokeStyle = 'rgba(240,236,224,0.8)'; f.lineWidth = 5; f.lineCap = 'round'; for (let i = 0; i < 4; i++) { const x = 180 + random() * 660, y = 200 + random() * 650, r = 22; f.beginPath(); f.moveTo(x - r, y - r); f.lineTo(x + r, y + r); f.moveTo(x + r, y - r); f.lineTo(x - r, y + r); f.stroke(); } }
    const floorMap = new THREE.CanvasTexture(fc); floorMap.colorSpace = THREE.SRGBColorSpace; floorMap.anisotropy = 4;
    const ground = world.ground as THREE.Mesh;
    (ground.material as THREE.Material).dispose();
    ground.material = new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.95 });
    if (a.floor === 'wet') {
      const water = new THREE.MeshStandardMaterial({ color: '#5a6a72', roughness: 0.08, metalness: 0.5, transparent: true, opacity: 0.7, depthWrite: false });
      for (let i = 0; i < 7; i++) { const p = s.mesh(new THREE.CircleGeometry(0.4 + random() * 0.6, 20), water, [-3.5 + random() * 7, 0.012, -3 + random() * 6.5]); p.rotation.x = -Math.PI / 2; p.scale.y = 0.5 + random() * 0.5; p.castShadow = false; }
    }

    // Three blind arches along the back wall.
    for (const cx of [-3, 0, 3]) { const ring = s.ring(1.25, 0.1, [cx, 2.0, BACK + 0.02], stone, Math.PI); ring.castShadow = false; }
    for (const x of [-4.3, -1.5, 1.5, 4.4]) { s.box([0.36, 2.0, 0.2], [x, 1.0, BACK + 0.1], brickMat(0.3, 2.0 / 1.2)); s.box([0.46, 0.1, 0.26], [x, 2.05, BACK + 0.12], stone); }

    // The window in the right-hand arch.
    const lightColour = new THREE.Color({ day: '#fff1cf', moon: '#a8c2ff', snow: '#eef5ff', boarded: '#fff1cf' }[a.window]);
    if (a.window === 'day') lightColour.lerp(new THREE.Color('#ffc890'), Math.abs(mood.daylight - 0.5) * 1.2);
    const brightness = a.window === 'boarded' ? 0.25 : a.window === 'moon' ? 0.75 : 1;
    const pane = s.mesh(new THREE.CircleGeometry(0.72, 24, 0, Math.PI), new THREE.MeshStandardMaterial({ color: lightColour, emissive: lightColour, emissiveIntensity: brightness }), [3, 2.2, BACK + 0.012]);
    pane.castShadow = false;
    s.ring(0.74, 0.07, [3, 2.2, BACK + 0.03], stone, Math.PI);
    s.box([1.75, 0.1, 0.3], [3, 2.16, BACK + 0.12], stone);
    for (let i = -2; i <= 2; i++) { const x = 3 + i * 0.26, h = Math.sqrt(Math.max(0.01, 0.72 * 0.72 - (i * 0.26) ** 2)); s.rod([x, 2.2, BACK + 0.06], [x, 2.2 + h, BACK + 0.06], 0.022, iron); }
    s.rod([2.3, 2.5, BACK + 0.065], [3.7, 2.5, BACK + 0.065], 0.018, iron);
    if (a.window === 'boarded') for (let i = 0; i < 3; i++) { const b = s.box([1.55, 0.2, 0.04], [3, 2.33 + i * 0.22, BACK + 0.1], timber); b.rotation.z = (random() - 0.5) * 0.14; }
    if (a.window === 'snow') { s.ball([0.7, 0.2, 0.12], [3, 2.24, BACK + 0.07], s.material('#ffffff', { roughness: 1 }), 14); s.ball([0.4, 0.07, 0.2], [3.1, 2.22, BACK + 0.2], s.material('#ffffff', { roughness: 1 }), 12); }
    // The shaft falls across the middle of the room, onto the hero.
    const fall = new THREE.Vector3(1.3, 0.02, -0.3);
    if (a.window !== 'boarded' || true) {
      const top = [[2.3, 2.22], [3.7, 2.22], [3.5, 2.8], [2.5, 2.8]].map(([x, y]) => new THREE.Vector3(x, y, BACK + 0.1));
      const foot = [[-0.9, 0.7], [0.9, 0.7], [0.7, -0.7], [-0.7, -0.7]].map(([x, z]) => new THREE.Vector3(fall.x + x, 0.02, fall.z + z));
      const pts = [...top, ...foot].flatMap((v) => [v.x, v.y, v.z]);
      const shaft = new THREE.BufferGeometry(); shaft.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      shaft.setIndex([0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]); shaft.computeVertexNormals();
      const beam = s.mesh(shaft, new THREE.MeshBasicMaterial({ color: lightColour, transparent: true, opacity: 0.17 * brightness * mix(0.7, 1.3, grime), depthWrite: false, side: THREE.DoubleSide }));
      beam.castShadow = beam.receiveShadow = false;
      const pc = document.createElement('canvas'); pc.width = pc.height = 128; const p = pc.getContext('2d')!;
      p.fillStyle = `#${lightColour.getHexString()}`; p.beginPath(); p.moveTo(8, 120); p.lineTo(120, 120); p.lineTo(104, 14); p.lineTo(24, 14); p.closePath(); p.fill();
      p.globalCompositeOperation = 'destination-out'; p.fillStyle = 'rgba(0,0,0,0.8)'; for (let i = 1; i < 6; i++) p.fillRect(i * 21 - 3, 0, 6, 128); p.fillRect(0, 60, 128, 5);
      const patchMap = new THREE.CanvasTexture(pc); patchMap.colorSpace = THREE.SRGBColorSpace;
      const patch = s.mesh(new THREE.PlaneGeometry(2, 1.6), new THREE.MeshBasicMaterial({ map: patchMap, transparent: true, opacity: 0.4 * brightness, depthWrite: false }), [fall.x, 0.015, fall.z]);
      patch.rotation.x = -Math.PI / 2; patch.castShadow = false;
    }

    // Writing under the window.
    if (a.writing !== 'none') {
      const wc = document.createElement('canvas'); wc.width = 512; wc.height = 320; const w = wc.getContext('2d')!;
      const chalk = a.masonry === 'limewash' ? '#3a2a22' : '#f2efe6';
      w.strokeStyle = w.fillStyle = chalk; w.lineCap = 'round'; w.lineWidth = 5; w.textAlign = 'center';
      if (a.writing === 'sums') {
        w.font = 'italic 44px Georgia, serif';
        ['Sol : Luna  1 : 7', 'Hg + S = ?', 'V.I.T.R.I.O.L.', 'xl dies  — iterum'].forEach((line, i) => { w.save(); w.translate(200 + random() * 60, 60 + i * 72); w.rotate((random() - 0.5) * 0.1); w.globalAlpha = i === 2 && random() < 0.6 ? 0.35 : 0.9; w.fillText(line, 0, 0); w.restore(); });
        w.globalAlpha = 0.9;
        for (let i = 0; i < 2; i++) { const x = 430, y = 90 + i * 130, d = i ? -1 : 1; w.beginPath(); w.moveTo(x, y - 40 * d); w.lineTo(x + 42, y + 34 * d); w.lineTo(x - 42, y + 34 * d); w.closePath(); w.stroke(); w.beginPath(); w.moveTo(x - 28, y + 6 * d); w.lineTo(x + 28, y + 6 * d); w.stroke(); }
      } else if (a.writing === 'tally') {
        const groups = Math.round(mix(12, 34, mood.density));
        for (let g = 0; g < groups; g++) { const x = 30 + (g % 9) * 53, y = 30 + Math.floor(g / 9) * 74; for (let i = 0; i < 4; i++) { w.beginPath(); w.moveTo(x + i * 9 + random() * 3, y); w.lineTo(x + i * 9 + random() * 3, y + 46); w.stroke(); } w.beginPath(); w.moveTo(x - 6, y + 38); w.lineTo(x + 34, y + 8); w.stroke(); }
      } else if (a.writing === 'ouroboros') {
        w.lineWidth = 15; w.beginPath(); w.arc(256, 160, 118, 0.35, Math.PI * 2 - 0.1); w.stroke();
        w.lineWidth = 5; for (let i = 0; i < 26; i++) { const g = 0.5 + i * 0.22; w.beginPath(); w.moveTo(256 + Math.cos(g) * 108, 160 + Math.sin(g) * 108); w.lineTo(256 + Math.cos(g + 0.08) * 128, 160 + Math.sin(g + 0.08) * 128); w.globalCompositeOperation = 'destination-out'; w.stroke(); w.globalCompositeOperation = 'source-over'; }
        w.beginPath(); w.ellipse(256 + 118, 160 - 6, 24, 34, 0.2, 0, 7); w.fill(); w.globalCompositeOperation = 'destination-out'; w.beginPath(); w.arc(256 + 126, 160 - 18, 5, 0, 7); w.fill(); w.globalCompositeOperation = 'source-over';
        w.font = 'bold 30px Georgia, serif'; w.fillText('EN TO PAN', 256, 170);
      } else {
        w.fillStyle = '#e9e0c4'; w.fillRect(136, 10, 240, 300); w.fillStyle = '#1c1612'; w.font = 'bold 40px Georgia, serif'; w.fillText('NOTICE', 256, 62); w.font = 'bold 20px Georgia, serif'; w.fillText('SEIZED BY ORDER', 256, 96);
        for (let i = 0; i < 8; i++) w.fillRect(160, 120 + i * 17, 150 + random() * 40, 4);
        w.fillStyle = '#a3161a'; w.beginPath(); w.arc(330, 272, 24, 0, 7); w.fill();
      }
      const map = new THREE.CanvasTexture(wc); map.colorSpace = THREE.SRGBColorSpace;
      const sheet = s.mesh(new THREE.PlaneGeometry(2.2, 1.375), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, opacity: a.writing === 'notice' ? 1 : mix(0.95, 0.6, mood.wear) }), [3, 1.15, BACK + 0.012]);
      sheet.castShadow = false;
    }

    // Shelves and what stands on them.
    type Shelf = { x: number; y: number; z: number; length: number; side: boolean; broken: boolean };
    const shelves: Shelf[] = [];
    for (const cx of [-3, 0]) for (const y of [0.72, 1.28, 1.84]) shelves.push({ x: cx, y, z: BACK + 0.2, length: 2.3, side: false, broken: (state === 'exploded' && cx === -3) || (state === 'abandoned' && random() < 0.25) || (state === 'stripped' && random() < 0.15) });
    for (const y of [1.25, 1.85]) shelves.push({ x: LEFT + 0.2, y, z: 1.1, length: 1.7, side: true, broken: false });
    const kinds = { glass: ['flask', 'bottle', 'jar'], stoneware: ['crock', 'jar'], books: ['book', 'book', 'scroll'], curios: ['skull', 'jar', 'horn'], mixed: ['flask', 'bottle', 'crock', 'book', 'skull', 'jar'] }[a.shelves];
    const fullness = { feverish: 0.95, quiet: 0.85, stripped: 0.07, exploded: 0.55, abandoned: 0.5 }[state] * mix(0.55, 1, mood.density);
    const liquids = ['#c8321e', '#e8c62a', '#2f8a5a', '#3f6fc8', '#8a3fc0', '#d9d4c4', '#e88a2a', '#2a2a30'];
    const earths = ['#a58e68', '#8a6a4a', '#b9a88a', '#6a5a4a', '#c0b090'];
    const leathers = ['#5a2a22', '#2f3f33', '#3a3048', '#6a5630', '#7a3a24', '#2a2a30'];
    const stock: Record<string, { at: readonly [number, number, number]; size: number; color: string }[]> = {};
    for (const shelf of shelves) {
      const plank = s.box(shelf.side ? [0.3, 0.045, shelf.length] : [shelf.length, 0.045, 0.3], [shelf.x, shelf.y, shelf.z], timber);
      if (shelf.broken) { plank.rotation[shelf.side ? 'x' : 'z'] = (random() < 0.5 ? -1 : 1) * (0.35 + random() * 0.3); plank.position.y -= 0.25; continue; }
      for (const e of [-0.42, 0.42]) { const bx = shelf.side ? shelf.x : shelf.x + e * shelf.length, bz = shelf.side ? shelf.z + e * shelf.length : shelf.z; s.rod([bx - (shelf.side ? 0.14 : 0), shelf.y - 0.22, bz - (shelf.side ? 0 : 0.14)], [bx + (shelf.side ? 0.12 : 0), shelf.y - 0.02, bz + (shelf.side ? 0 : 0.12)], 0.016, iron); }
      let t = -shelf.length / 2 + 0.14;
      while (t < shelf.length / 2 - 0.1) {
        const step = 0.17 + random() * 0.12;
        if (random() < fullness) {
          const kind = kinds[Math.floor(random() * kinds.length)];
          const colour = kind === 'book' || kind === 'scroll' ? (kind === 'scroll' ? '#d9cba6' : leathers[Math.floor(random() * leathers.length)]) : kind === 'crock' ? earths[Math.floor(random() * earths.length)] : kind === 'skull' || kind === 'horn' ? '#d9d0b6' : liquids[Math.floor(random() * liquids.length)];
          (stock[kind] ??= []).push({ at: shelf.side ? [shelf.x + (random() - 0.5) * 0.06, shelf.y + 0.023, shelf.z + t] : [shelf.x + t, shelf.y + 0.023, shelf.z + (random() - 0.5) * 0.06], size: 0.8 + random() * 0.45, color: dusty(colour, state === 'abandoned' ? 0.5 : grime * 0.2) });
        }
        t += step;
      }
    }
    const lathe = (profile: [number, number][]) => new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 12);
    const skull = new THREE.SphereGeometry(0.085, 10, 8); skull.translate(0, 0.085, 0);
    const horn = new THREE.ConeGeometry(0.05, 0.3, 7); horn.translate(0, 0.15, 0);
    const book = new THREE.BoxGeometry(0.06, 0.27, 0.2); book.translate(0, 0.135, 0);
    const scroll = new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8); scroll.rotateX(Math.PI / 2); scroll.translate(0, 0.035, 0);
    const shapes: Record<string, THREE.BufferGeometry> = {
      flask: lathe([[0, 0], [0.06, 0.005], [0.085, 0.07], [0.07, 0.14], [0.022, 0.2], [0.02, 0.27], [0.03, 0.28], [0, 0.28]]),
      bottle: lathe([[0, 0], [0.045, 0.005], [0.048, 0.18], [0.018, 0.24], [0.018, 0.3], [0.025, 0.31], [0, 0.31]]),
      jar: lathe([[0, 0], [0.06, 0.005], [0.065, 0.19], [0.05, 0.21], [0.055, 0.24], [0, 0.245]]),
      crock: lathe([[0, 0], [0.06, 0], [0.085, 0.09], [0.075, 0.19], [0.055, 0.21], [0.06, 0.225], [0, 0.23]]),
      skull, horn, book, scroll,
    };
    for (const [kind, list] of Object.entries(stock)) {
      const glassy = kind === 'flask' || kind === 'bottle' || kind === 'jar';
      s.scatter(shapes[kind], new THREE.MeshStandardMaterial({ roughness: glassy ? 0.2 : 0.85, emissive: glassy ? '#ffffff' : '#000000', emissiveIntensity: glassy ? 0.04 + mood.cheer * 0.06 : 0 }), list);
    }
    for (const [kind, geometry] of Object.entries(shapes)) if (!stock[kind]) geometry.dispose();

    // Hearth against the left wall.
    const hz = -1.6, face = LEFT + 0.7;
    const fireLevel = a.hearth === 'bricked' ? 0 : { feverish: 1, quiet: 0.35, stripped: 0, exploded: 0.15, abandoned: 0 }[state];
    const fireColour = new THREE.Color().setHSL(mix(0.02, 0.09, fireLevel), 1, mix(0.4, 0.55, fireLevel));
    const fire = new THREE.MeshStandardMaterial({ color: fireLevel ? fireColour : new THREE.Color('#4c4844'), emissive: fireColour, emissiveIntensity: fireLevel ? mix(0.7, 1.4, fireLevel) : 0, roughness: 0.9 });
    s.box([0.7, HW + 0.5, 2.4], [LEFT + 0.35, (HW + 0.5) / 2, hz], brickMat(2, (HW + 0.5) / 1.2));
    s.box([0.8, 0.14, 2.6], [LEFT + 0.4, 1.62, hz], stone);
    const flames: THREE.Mesh[] = [];
    const flameMat = new THREE.MeshStandardMaterial({ color: '#ff9a2a', emissive: '#ff6a10', emissiveIntensity: 1, transparent: true, opacity: 0.9, depthWrite: false });
    const mouth = (z: number, w: number, h: number, y0: number) => {
      s.box([0.06, h, w], [face + 0.005, y0 + h / 2, z], black);
      const arch = s.cylinder(w / 2, w / 2, 0.06, [face + 0.005, y0 + h, z], black, 20); arch.rotation.z = Math.PI / 2;
      const ring = s.ring(w / 2 + 0.07, 0.07, [face + 0.02, y0 + h, z], stone, Math.PI); ring.rotation.y = Math.PI / 2;
      s.box([0.05, h * 0.3, w * 0.86], [face + 0.03, y0 + h * 0.15 + 0.01, z], fire);
      if (fireLevel > 0.2) for (let i = 0; i < 2 + Math.round(fireLevel * 3); i++) { const fl = s.mesh(new THREE.ConeGeometry(w * 0.09, h * (0.35 + random() * 0.4) * fireLevel + 0.1, 6), flameMat, [face + 0.08, y0 + h * 0.4, z + (random() - 0.5) * w * 0.6]); fl.castShadow = false; flames.push(fl); }
    };
    if (a.hearth === 'open') {
      mouth(hz, 1.5, 0.85, 0);
      s.rod([face - 0.05, 1.35, hz], [face + 0.55, 1.2, hz], 0.022, iron); // crane
      s.rod([face + 0.5, 1.2, hz], [face + 0.5, 0.82, hz], 0.012, iron);
      if (state !== 'stripped') { const pot = s.lathe([[0, 0], [0.16, 0.02], [0.26, 0.14], [0.27, 0.3], [0.22, 0.4], [0.24, 0.43]], iron, [face + 0.5, 0.38, hz]); (pot.material as THREE.Material).side = THREE.DoubleSide; s.ring(0.2, 0.012, [face + 0.5, 0.8, hz], iron, Math.PI).rotation.y = Math.PI / 2; }
    } else if (a.hearth === 'range') {
      s.box([0.75, 0.85, 2.3], [face + 0.37, 0.425, hz], brickMat(2, 0.7));
      s.box([0.82, 0.07, 2.36], [face + 0.37, 0.885, hz], stone);
      const rangeFace = face + 0.745;
      for (const dz of [-0.75, 0, 0.75]) {
        s.box([0.05, 0.26, 0.3], [rangeFace, 0.3, hz + dz], black);
        const d = s.cylinder(0.15, 0.15, 0.05, [rangeFace, 0.43, hz + dz], black, 14); d.rotation.z = Math.PI / 2;
        s.box([0.04, 0.12, 0.25], [rangeFace + 0.012, 0.24, hz + dz], fire);
        if (state !== 'stripped') { const pan = s.lathe([[0, 0], [0.13, 0.01], [0.17, 0.13], [0.18, 0.14]], s.material(dusty(dz ? '#b0703f' : '#2a292c'), { metalness: 0.6, roughness: 0.45, side: THREE.DoubleSide }), [face + 0.37, 0.92, hz + dz]); pan.rotation.y = random() * 3; }
      }
    } else {
      s.box([0.06, 0.95, 1.4], [face + 0.005, 0.475, hz], brickMat(1.1, 0.8)).material = new THREE.MeshStandardMaterial({ color: dusty('#c9bda4'), roughness: 1 });
      s.ring(0.77, 0.07, [face + 0.02, 0.95, hz], stone, Math.PI).rotation.y = Math.PI / 2;
      s.tube([[face + 0.02, 2.2, hz], [face + 0.35, 2.25, hz], [face + 0.4, 2.6, hz], [face + 0.4, HW + 0.5, hz]], 0.09, iron);
    }
    if (fireLevel > 0) { const lamp = new THREE.PointLight(fireColour, fireLevel * mix(14, 46, mood.warmth), 9, 1.6); lamp.position.set(face + 1.0, 0.9, hz); root.add(lamp); }
    if (fireLevel > 0) { const pool = s.mesh(new THREE.PlaneGeometry(4.4, 4.4), blot('rgba(255,140,50,1)', 0.55 * fireLevel * mix(0.6, 1, mood.warmth)), [face + 1.5, 0.014, hz]); pool.rotation.x = -Math.PI / 2; pool.castShadow = false; (pool.material as THREE.MeshBasicMaterial).blending = THREE.AdditiveBlending; }
    if (grime > 0.25) { const soot = s.mesh(new THREE.PlaneGeometry(2.4, 2.2), blot('rgba(14,11,9,1)', Math.min(0.85, grime)), [face + 0.012, 2.3, hz]); soot.rotation.y = Math.PI / 2; soot.castShadow = false; }

    // Door at the top of three steps, front of the left wall.
    const dz = 2.85;
    for (let i = 0; i < 3; i++) s.box([0.42 * (3 - i), 0.2, 1.5], [LEFT + 0.21 * (3 - i), 0.1 + i * 0.2, dz], stone);
    s.box([0.08, 2.0, 1.15], [LEFT + 0.03, 1.6, dz], black);
    for (const e of [-1, 1]) s.box([0.2, 2.05, 0.14], [LEFT + 0.08, 1.62, dz + e * 0.64], stone);
    s.box([0.2, 0.16, 1.42], [LEFT + 0.08, 2.7, dz], stone);
    const door = new THREE.Group(); door.position.set(LEFT + 0.1, 0.6, dz - 0.56); root.add(door);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.98, 1.1), darkTimber); leaf.position.set(0, 0.99, 0.55); leaf.castShadow = true; door.add(leaf);
    for (const y of [0.4, 1.55]) { const strap = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.9), iron); strap.position.set(0.045, y, 0.5); door.add(strap); }
    const knob = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 14), iron); knob.position.set(0.06, 1.0, 0.95); knob.rotation.y = Math.PI / 2; door.add(knob);
    if (a.door === 'ajar' || a.door === 'forced') { const glow = s.box([0.02, 1.96, 1.08], [LEFT + 0.075, 1.59, dz], new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffc070', emissiveIntensity: a.door === 'ajar' ? 0.9 : 0.5 })); glow.castShadow = false; }
    if (a.door === 'ajar') door.rotation.y = 0.75;
    if (a.door === 'forced') { door.rotation.set(0.12, 1.25, -0.16); door.position.y = 0.52; for (let i = 0; i < 6; i++) { const sp = s.box([0.03, 0.02, 0.2 + random() * 0.3], [LEFT + 0.5 + random() * 0.9, 0.62 - Math.floor(random() * 3) * 0.2 + 0.01, dz - 0.5 + random()], timber); sp.rotation.y = random() * 3; } }
    if (a.door === 'shut') { s.box([0.06, 0.1, 1.36], [LEFT + 0.17, 1.6, dz], timber); for (const e of [-1, 1]) s.box([0.1, 0.16, 0.06], [LEFT + 0.16, 1.58, dz + e * 0.6], iron); }

    // Iron brackets and what hangs from them.
    const swinging: THREE.Object3D[] = [];
    const lanternMat = new THREE.MeshStandardMaterial({ color: '#ffd890', emissive: '#ffb040', emissiveIntensity: state === 'stripped' || state === 'abandoned' ? 0 : 1.1 });
    for (const bx of [-1.5, 1.5]) {
      s.rod([bx, 3.0, BACK + 0.18], [bx, 3.0, BACK + 1.15], 0.022, iron);
      s.rod([bx, 2.6, BACK + 0.2], [bx, 2.98, BACK + 0.7], 0.016, iron);
      if (a.hanging === 'none' || (state === 'stripped' && a.hanging !== 'chains')) continue;
      const n = a.hanging === 'lanterns' ? 1 : 2 + Math.round(mood.density * 2);
      for (let i = 0; i < n; i++) {
        const hang = new THREE.Group(); hang.position.set(bx, 2.98, BACK + (n === 1 ? 1.1 : 0.45 + (i / (n - 1)) * 0.68)); root.add(hang); swinging.push(hang);
        const drop = 0.2 + random() * 0.35;
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, drop, 5), iron); cord.position.y = -drop / 2; hang.add(cord);
        if (a.hanging === 'herbs') { const bunch = new THREE.Mesh(new THREE.ConeGeometry(0.1 + random() * 0.05, 0.4 + random() * 0.15, 7), new THREE.MeshStandardMaterial({ color: dusty(['#6a7a3a', '#8a8a4a', '#7a6a8a', '#a89a5a'][Math.floor(random() * 4)], grime * 0.4), roughness: 1, flatShading: true })); bunch.position.y = -drop - 0.2; bunch.castShadow = true; hang.add(bunch); }
        else if (a.hanging === 'chains') { const hook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 14, Math.PI * 1.4), iron); hook.position.y = -drop - 0.06; hook.rotation.z = -2.2; hang.add(hook); cord.scale.y = 1; }
        else { const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.26, 6), lanternMat); cage.position.y = -drop - 0.13; hang.add(cage); const cap = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.1, 6), iron); cap.position.y = -drop + 0.03; cap.castShadow = true; hang.add(cap); const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 6), iron); foot.position.y = -drop - 0.27; hang.add(foot); }
      }
    }

    // State dressing on the floor, kept clear of where the cast stands.
    const papers: THREE.Mesh[] = [];
    const smoke: THREE.Mesh[] = [];
    if (state === 'feverish' || state === 'quiet') {
      const sheet = s.material('#ece3c8', { roughness: 0.95, side: THREE.DoubleSide });
      const n = state === 'feverish' ? Math.round(mix(14, 40, mood.density)) : 3;
      for (let i = 0; i < n; i++) { const p = s.mesh(new THREE.PlaneGeometry(0.3, 0.4), sheet, [-3.2 + random() * 7, 0.012 + i * 0.0006, -2.2 + random() * 5.8]); p.rotation.set(-Math.PI / 2, 0, random() * 6.28); p.castShadow = false; papers.push(p); }
      // A candle on a wall spike by the door, and a stool.
      const cy = 1.7; s.box([0.24, 0.03, 0.16], [LEFT + 0.12, cy, 1.15 + 0.98], iron);
      s.cylinder(0.03, 0.032, 0.16, [LEFT + 0.16, cy + 0.09, 2.13], s.material('#e8dcb8'), 8);
      const fl = s.ball([0.022, 0.05, 0.022], [LEFT + 0.16, cy + 0.22, 2.13], new THREE.MeshStandardMaterial({ color: '#ffc050', emissive: '#ffa030', emissiveIntensity: 1.3 }), 8); fl.castShadow = false; flames.push(fl);
      s.cylinder(0.2, 0.2, 0.05, [-3.2, 0.5, 0.3], timber, 14);
      for (let i = 0; i < 3; i++) { const g = i * 2.094; s.rod([-3.2 + Math.cos(g) * 0.2, 0, 0.3 + Math.sin(g) * 0.2], [-3.2 + Math.cos(g) * 0.12, 0.48, 0.3 + Math.sin(g) * 0.12], 0.025, darkTimber); }
    }
    if (state === 'stripped') {
      for (const [x, z, r] of [[-3.3, 0.9, 0.2], [-2.6, 3.3, -0.3], [3.6, 3.2, 0.5]] as const) {
        const crate = new THREE.Group(); crate.position.set(x, 0, z); crate.rotation.y = r; root.add(crate);
        for (const [sx, sy, sz, px, py, pz] of [[0.9, 0.05, 0.6, 0, 0.025, 0], [0.9, 0.5, 0.04, 0, 0.3, 0.28], [0.9, 0.5, 0.04, 0, 0.3, -0.28], [0.04, 0.5, 0.6, 0.43, 0.3, 0], [0.04, 0.5, 0.6, -0.43, 0.3, 0]] as const) { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), timber); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; crate.add(m); }
        const straw = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), s.material('#d2b660', { roughness: 1 })); straw.position.y = 0.25; crate.add(straw);
      }
      for (const cx of [-3, 0]) { const tag = s.label(`LOT ${Math.floor(random() * 40) + 3}`, 0.6, 0.22, [cx + 0.7, 2.25, BACK + 0.02], '#1c1612', '#e9e0c4'); tag.rotation.z = (random() - 0.5) * 0.2; tag.castShadow = false; }
    }
    if (state === 'exploded') {
      const wallScorch = s.mesh(new THREE.PlaneGeometry(4.6, 4), blot('rgba(10,8,6,1)', 0.92, 26, random), [-2.7, 1.7, BACK + 0.014]); wallScorch.castShadow = false;
      const rubble = [], shards = [];
      for (let i = 0; i < Math.round(mix(40, 90, mood.density)); i++) {
        const ang = random() * Math.PI * 0.6 + 0.1, r = 0.5 + random() ** 1.6 * 6.5, x = blast[0] + Math.cos(ang) * r, z = blast[1] + Math.sin(ang) * r;
        if (x > W / 2 - 0.2 || z > D / 2 - 0.2) continue;
        if (random() < 0.5) rubble.push({ at: [x, 0.04, z] as const, size: 0.05 + random() * 0.08, color: random() < 0.4 ? '#2a2420' : brickBase });
        else shards.push({ at: [x, 0.02, z] as const, size: 0.03 + random() * 0.05, color: liquids[Math.floor(random() * liquids.length)] });
      }
      s.scatter(new THREE.BoxGeometry(2, 0.9, 1.1), new THREE.MeshStandardMaterial({ roughness: 1 }), rubble);
      s.scatter(new THREE.TetrahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.15 }), shards);
      for (let i = 0; i < 3; i++) { const pl = s.box([1.6 + random() * 0.6, 0.045, 0.3], [-3.2 + random() * 1.6, 0.05 + i * 0.03, -3.2 + random() * 0.8], darkTimber); pl.rotation.y = random() * 1.2 - 0.6; }
      const haze = new THREE.MeshStandardMaterial({ color: '#4a4540', transparent: true, opacity: 0.16, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 9; i++) { const p = s.ball([1, 1, 1], [0, 0, 0], haze, 10); p.castShadow = p.receiveShadow = false; p.userData = { x: blast[0] + (random() - 0.3) * 2.4, z: blast[1] + random() * 1.2, phase: random(), size: 0.4 + random() * 0.5 }; smoke.push(p); }
    }
    if (state === 'abandoned' || mood.wear > 0.8) {
      const web = new THREE.MeshBasicMaterial({ color: '#f1f0ea', transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
      for (const cx of [-3, 0, 3]) for (const e of [-1, 1]) {
        if (random() < 0.3) continue;
        const shape = new THREE.Shape(); const wdt = 0.6 + random() * 0.4, h = 0.6 + random() * 0.5;
        shape.moveTo(0, 0); shape.lineTo(0, -h); shape.quadraticCurveTo(wdt * 0.25, -h * 0.3, wdt, 0.2); shape.quadraticCurveTo(wdt * 0.4, 0.05, 0, 0);
        const m = s.mesh(new THREE.ShapeGeometry(shape), web, [cx + e * 1.18, 2.35, BACK + 0.05]); m.scale.x = -e; m.castShadow = false;
      }
      const corner = new THREE.Shape(); corner.moveTo(0, 0); corner.lineTo(1.3, 0); corner.quadraticCurveTo(0.4, -0.3, 0, -1.5); corner.lineTo(0, 0);
      const cw = s.mesh(new THREE.ShapeGeometry(corner), web, [LEFT + 0.02, HW - 0.05, BACK + 0.05]); cw.rotation.y = -Math.PI / 4; cw.castShadow = false;
    }

    // Small cast members get a work table; large ones stand on the floor at something near true size.
    const tables = new THREE.Group(); root.add(tables);
    const slots: [number, number][] = [[0.6, 0.9], [-1.8, -1.2], [2.9, -1.2], [2.9, 2.0], [-1.6, 2.3]];
    const basePlace = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      for (const child of [...tables.children]) disposeTree(child);
      basePlace(items);
      items.forEach((item, index) => {
        const [x, z] = slots[index % slots.length];
        const small = item.height < 1.05 && item.radius < 0.75;
        const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
        let lift = 0, scale: number;
        if (small) {
          scale = clamp(Math.min(1.1 / item.height, 0.62 / item.radius), 1, 3) * (item.hero ? 1 : 0.9);
          lift = 0.8;
          const half = Math.max(0.6, item.radius * scale + 0.14);
          const table = new THREE.Group(); table.position.set(x, 0, z); table.rotation.y = item.holder.rotation.y;
          const wood = new THREE.MeshStandardMaterial({ color: dusty('#6a4c30'), roughness: 0.92 });
          const add = (size: [number, number, number], at: [number, number, number]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), wood); m.position.set(...at); m.castShadow = m.receiveShadow = true; table.add(m); };
          add([half * 2, 0.08, half * 1.7], [0, 0.76, 0]);
          for (const ex of [-1, 1]) for (const ez of [-1, 1]) add([0.1, 0.72, 0.1], [ex * (half - 0.1), 0.36, ez * (half * 0.85 - 0.1)]);
          add([half * 2 - 0.2, 0.06, 0.06], [0, 0.22, half * 0.85 - 0.1]); add([half * 2 - 0.2, 0.06, 0.06], [0, 0.22, -half * 0.85 + 0.1]);
          tables.add(table);
        } else {
          scale = clamp(Math.min(2.5 / item.height, 1.25 / item.radius), 0.5, 1.35) * (item.hero ? 1 : 0.9);
        }
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, lift, z);
        item.holder.updateMatrixWorld(true);
      });
    };

    const speed = mix(0.4, 2.2, mood.energy);
    const fireBase = fire.emissiveIntensity;
    const settle = (time: number) => {
      for (const p of smoke) { const t = (p.userData.phase + time * 0.03) % 1; p.position.set(p.userData.x + t * 0.8, 1.2 + t * 2.6, p.userData.z + t * 0.6); p.scale.setScalar(p.userData.size * (0.6 + t)); }
    };
    settle(0);
    world.update = (_dt: number, time: number) => {
      const t = time * speed;
      if (fireLevel) fire.emissiveIntensity = fireBase * (0.85 + 0.15 * Math.sin(t * 6.1) * Math.sin(t * 2.3 + 1));
      flames.forEach((fl, i) => { fl.scale.y = 1 + 0.25 * Math.sin(t * 7 + i * 1.9); });
      swinging.forEach((h, i) => { h.rotation.x = Math.sin(t * 0.8 + i) * 0.04 * (0.3 + mood.energy); });
      settle(t);
    };
    void papers;
    return world;
  },
});
