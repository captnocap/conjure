import * as THREE from 'three';
import { Sculpture, choice, defineWorld, diorama, mix } from '@conjure/kit';

type P3 = [number, number, number];

const W = 19, D = 15, BACK = -5.5, LEFT = -7.5;
const BAY = 1.2, STOREY = 1.0, PLINTH = 0.4, PARAPET = 0.25, STOREYS = 5;
const BLOCK_H = PLINTH + STOREYS * STOREY + PARAPET;

const FACADES = {
  panel: { base: '#a8a9a4', seam: '#55565a', balcony: ['#8f9aa0', '#9aa39a', '#a59c8f'] },
  pebble: { base: '#b8ad97', seam: '#6a6052', balcony: ['#7a5a44', '#6f5240', '#86654c'] },
  tile: { base: '#a7bec8', seam: '#5d7480', balcony: ['#e2e0d6', '#d4d9d6', '#cfd6dc'] },
  pink: { base: '#c6a399', seam: '#7c5f58', balcony: ['#9c6b5e', '#a9786a', '#8b6258'] },
  brick: { base: '#cdcabf', seam: '#8e8a80', balcony: ['#6f8a7a', '#7b9485', '#62806f'] },
} as const;

export default defineWorld({
  questions: {
    ground: choice('What is underfoot in the yard?', {
      fresh: 'Fresh snow, nearly unmarked, one line of footprints.',
      trampled: 'Old grey snow trodden into dirty diagonal paths between the entrances.',
      thaw: 'Thaw: brown mud, standing meltwater and rags of snow in the shade.',
      ice: 'Bare frozen asphalt with frost and patches of black ice.',
    }),
    facade: choice('What are the blocks faced with?', {
      panel: 'Raw grey concrete panels with tarred seams.',
      pebble: 'Beige pebble-dash panels with brown balconies.',
      tile: 'Pale blue mosaic tile, cold and clean.',
      pink: 'Faded pink paint peeling to the plaster.',
      brick: 'White silicate brick with green balconies.',
    }),
    enclosure: choice('What closes the yard in?', {
      corner: 'Two identical blocks meeting at a corner.',
      fence: 'One long block, and a concrete slab fence with a diamond pattern along the side.',
      towers: 'Two blocks at a corner with a taller nine-storey slab looming behind.',
    }),
    airing: choice('What is hung out?', {
      nothing: 'Nothing, every balcony shut.',
      lines: 'Washing frozen stiff as boards on lines strung between T-posts.',
      rugs: 'Rugs thrown over balcony rails to air.',
      bedding: 'Red quilts and white pillows airing on a few balconies.',
    }),
    pipes: choice('Where do the heating pipes run?', {
      arch: 'Along the edge of the yard at knee height, rising in a square arch over the path.',
      trestle: 'High on trestles along the back, in front of the block.',
      none: 'Underground, out of sight.',
    }),
    trees: choice('What trees stand in the yard?', {
      poplars: 'Tall bare poplars, as high as the roofs.',
      pollards: 'Poplars topped to thick stumps with whips of new growth.',
      birches: 'Thin white birches.',
      none: 'No trees at all.',
    }),
    life: choice('What have the children or the neighbours left in the far corner?', {
      swings: 'An empty swing set, the seats hanging still.',
      snowman: 'A lopsided snowman with a bucket for a hat.',
      slide: 'A wooden ice slide, its chute polished by trouser seats.',
      rink: 'A boarded hockey box with a goal, the ice swept.',
      bins: 'Dented rubbish bins and a thrown-out New Year tree with tinsel still on it.',
    }),
    roofGuard: choice('What guards the flat roof edges?', {
      none: 'Only the low parapets.',
      rail: 'A single thin steel safety rail follows the roof edge.',
      pickets: 'A two-rail guard with upright pickets.',
      panels: 'Short solid parapet extensions alternate with open rails.',
    }),
    stepHandrail: choice('What handrails have been fitted at the entrances?', {
      none: 'The low entrance steps have no rail.',
      pipe: 'One simple pipe rail beside each stoop.',
      paired: 'Matching handrails stand on both sides.',
      lattice: 'Paired rails contain a diagonal reinforcing bar.',
    }),
    roofDrain: choice('How are the downpipes finished near the ground?', {
      straight: 'Plain straight pipes end beside the wall.',
      shoes: 'Bent drain shoes direct the runoff away from the foundations.',
      hoppers: 'Box-shaped hoppers collect runoff below the roof.',
      barrels: 'Small rain barrels stand under the pipe outlets.',
    }),
    yardBench: choice('What seating stands along the quiet side of the yard?', {
      none: 'No shared bench.',
      plank: 'One long backless plank bench on concrete feet.',
      backed: 'A green slatted bench with a high back.',
      table: 'Two benches flank a small outdoor chess table.',
    }),
    noticeBoard: choice('What sort of shared noticeboard is beside the path?', {
      none: 'No noticeboard.',
      glass: 'A glazed notice cabinet stands on two square posts.',
      roofed: 'An open timber board has a tiny pitched roof.',
      kiosk: 'A three-sided notice pillar carries overlapping paper sheets.',
    }),
    yardEntrance: choice('How is the road entrance marked?', {
      open: 'The road is open across the front of the yard.',
      bollards: 'Two striped bollards mark a broad entry gap.',
      boom: 'A raised counterweighted boom stands at one end of the road.',
      posts: 'Low pipe posts protect the two corners of the footpath.',
    }),
    roadDetail: choice('What is marked across the narrow access road?', {
      plain: 'Plain dark road surface.',
      crossing: 'A small zebra crossing links the footpath to the yard.',
      parking: 'Short faded bay markers line the road edge.',
      hump: 'A low striped speed hump crosses the vehicle entrance.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const dusk = Math.max(0, (mood.daylight - 0.55) / 0.45), dawn = Math.max(0, (0.3 - mood.daylight) / 0.3);
    const dim = Math.max(dusk, dawn);
    const sky = new THREE.Color('#d6d9da').lerp(new THREE.Color('#b9a6ad'), dusk * 0.8).lerp(new THREE.Color('#a9b6c6'), dawn * 0.8).lerp(new THREE.Color('#e3dccd'), mood.warmth * 0.25);
    const snowy = a.ground === 'fresh' || a.ground === 'trampled';
    const { art: s, world } = diorama(context, {
      background: '#' + sky.getHexString(), floor: '#ffffff', width: W, depth: D, maxHeight: 3.5, radius: 2.0, pitch: 30, yaw: 30,
      slots: [[1.6, 2.6], [-2.4, -0.6], [5.8, -0.6], [-2.8, 4.7], [6.0, 4.6], [1.6, -2.9]],
    });
    if (world.keyLight) world.keyLight.intensity = mix(1.5, 2.7, mood.cheer) * mix(1, 0.75, dim);
    const warm = new THREE.Color('#ffd27a').lerp(new THREE.Color('#ffae5c'), mood.warmth * 0.6);
    const snowMat = new THREE.MeshStandardMaterial({ color: '#f1f4f7', roughness: 0.95 });
    const concrete = s.material('#9b9a94', { roughness: 0.95 });
    const texture = (width: number, height: number, paint: (g: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      paint(canvas.getContext('2d')!);
      const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      return t;
    };

    // ---- Ground: painted with paths, prints and puddles.
    const entrancesBack: number[] = [], bays = Math.round(W / BAY);
    for (let i = 2; i < bays; i += 5) entrancesBack.push(-W / 2 + (i + 0.5) * BAY);
    const groundTexture = texture(1024, 768, (g) => {
      const X = (x: number) => (x + W / 2) / W * 1024, Z = (z: number) => (z + D / 2) / D * 768;
      const base = { fresh: '#eef1f4', trampled: '#d9dcdd', thaw: '#7b6f60', ice: '#8a8d8e' }[a.ground];
      g.fillStyle = base; g.fillRect(0, 0, 1024, 768);
      const blot = (colour: string, n: number, r0: number, r1: number) => { for (let i = 0; i < n; i++) { g.fillStyle = colour; g.beginPath(); g.ellipse(random() * 1024, random() * 768, r0 + random() * r1, (r0 + random() * r1) * 0.6, random() * 3, 0, 7); g.fill(); } };
      if (a.ground === 'fresh') blot('rgba(190,205,222,0.25)', 40, 20, 60);
      if (a.ground === 'trampled') { blot('rgba(150,146,138,0.22)', 70, 14, 50); blot('rgba(255,255,255,0.4)', 40, 20, 50); }
      if (a.ground === 'thaw') { blot('rgba(60,50,40,0.35)', 60, 14, 50); blot('rgba(232,236,238,0.8)', 26, 14, 46); blot('rgba(72,86,100,0.85)', 14, 12, 36); }
      if (a.ground === 'ice') { blot('rgba(225,232,236,0.4)', 70, 12, 50); blot('rgba(40,48,56,0.55)', 16, 14, 40); }
      // Paths from every entrance, fanning out to the road and across to the far corner.
      const pathColour = { fresh: 'rgba(170,182,196,0.5)', trampled: 'rgba(120,108,92,0.75)', thaw: 'rgba(54,44,34,0.8)', ice: 'rgba(58,62,66,0.6)' }[a.ground];
      const path = (x0: number, z0: number, x1: number, z1: number, width: number) => {
        g.strokeStyle = pathColour; g.lineWidth = width; g.lineCap = 'round';
        g.beginPath(); g.moveTo(X(x0), Z(z0)); g.quadraticCurveTo(X((x0 + x1) / 2 + (random() - 0.5) * 2), Z((z0 + z1) / 2 + (random() - 0.5) * 2), X(x1), Z(z1)); g.stroke();
      };
      const lastDoor = entrancesBack[entrancesBack.length - 1];
      if (a.ground === 'fresh') path(entrancesBack[1], BACK + 0.4, 7.5, 6.2, 5);
      else {
        for (const x of entrancesBack) { path(x, BACK + 0.3, x + 0.5, BACK + 1.7, 16); }
        path(-6.6, BACK + 1.6, 8.8, BACK + 1.7, 20);
        path(entrancesBack[0], BACK + 1.6, -0.3, 6.3, 15); path(entrancesBack[1], BACK + 1.6, -0.5, 1.0, 13);
        path(lastDoor, BACK + 1.6, 4.0, 6.3, 15); path(-6.9, 1.0, 8.5, 1.3, 13); path(-6.9, 6.0, 9, 6.1, 20);
      }
      // Footprints as paired dark dabs.
      g.fillStyle = a.ground === 'thaw' ? 'rgba(40,32,24,0.5)' : 'rgba(96,104,116,0.5)';
      for (let i = 0; i < (a.ground === 'fresh' ? 60 : 500); i++) { const x = random() * 1024, y = random() * 768; g.fillRect(x, y, 3, 5); g.fillRect(x + 5, y + 7, 3, 5); }
      // The road along the front, with a kerb.
      g.fillStyle = a.ground === 'fresh' ? '#d9dde0' : '#5d5e60'; g.fillRect(0, Z(6.6), 1024, 768 - Z(6.6));
      g.fillStyle = snowy ? '#f1f4f7' : '#b4b2ab'; g.fillRect(0, Z(6.46), 1024, 6);
      if (a.ground !== 'fresh') { g.strokeStyle = 'rgba(30,30,32,0.5)'; g.lineWidth = 5; for (const dz of [6.9, 7.2]) { g.beginPath(); g.moveTo(0, Z(dz)); g.lineTo(1024, Z(dz + 0.05)); g.stroke(); } }
    });
    const floor = world.ground as THREE.Mesh;
    (floor.material as THREE.MeshStandardMaterial).map = groundTexture;
    (floor.material as THREE.MeshStandardMaterial).color.set('#ffffff');
    (floor.material as THREE.MeshStandardMaterial).roughness = a.ground === 'ice' || a.ground === 'thaw' ? 0.7 : 1;

    // ---- A block of flats: painted facade with lit windows, real balconies, canopies and roof clutter.
    const palette = FACADES[a.facade];
    const litChance = mix(0.12, 0.3, mood.density) + dim * 0.42 + (1 - Math.abs(mood.daylight - 0.5) * 2) * 0 + mood.cheer * 0.08;
    const curtains = ['#f2c869', '#f0b45a', '#e9d9a0', '#f4dfb0', '#d9e3a8', '#f2a987'];
    const block = (length: number, storeys: number, far: boolean) => {
      const b = new Sculpture(context);
      const n = Math.round(length / BAY), bay = length / n, h = PLINTH + storeys * STOREY + PARAPET;
      const pxm = 56, cw = Math.round(length * pxm), ch = Math.round(h * pxm);
      const canvasLit = document.createElement('canvas'); canvasLit.width = cw; canvasLit.height = ch;
      const lit = canvasLit.getContext('2d')!;
      lit.fillStyle = '#000000'; lit.fillRect(0, 0, cw, ch);
      const role = (i: number) => (i % 5 === 2 ? 'stair' : i % 5 === 0 || i % 5 === 4 ? 'balcony' : 'window');
      const map = texture(cw, ch, (g) => {
        const base = new THREE.Color(palette.base).lerp(sky, far ? 0.45 : 0);
        g.fillStyle = '#' + base.getHexString(); g.fillRect(0, 0, cw, ch);
        const Y = (y: number) => ch - y * pxm;
        if (a.facade === 'brick') { g.strokeStyle = 'rgba(110,105,96,0.35)'; g.lineWidth = 1; for (let y = 0; y < ch; y += 5) { g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke(); } }
        if (a.facade === 'tile' || a.facade === 'pebble') for (let i = 0; i < cw * ch / 60; i++) { g.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '40,40,40'},0.1)`; g.fillRect(random() * cw, random() * ch, 3, 3); }
        if (a.facade === 'pink') for (let i = 0; i < 30 + mood.wear * 80; i++) { g.fillStyle = `rgba(190,186,176,${0.4 + random() * 0.4})`; g.beginPath(); g.ellipse(random() * cw, random() * ch, 5 + random() * 26, 4 + random() * 14, random() * 3, 0, 7); g.fill(); }
        // Panel seams.
        if (a.facade !== 'brick') { g.strokeStyle = palette.seam; g.lineWidth = 2; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * bay * pxm, 0); g.lineTo(i * bay * pxm, ch); g.stroke(); } for (let k = 0; k <= storeys; k++) { g.beginPath(); g.moveTo(0, Y(PLINTH + k * STOREY)); g.lineTo(cw, Y(PLINTH + k * STOREY)); g.stroke(); } }
        // Damp and soot.
        for (let i = 0; i < 14 + mood.wear * 70; i++) { const x = random() * cw, y = random() * ch * 0.7, len = 30 + random() * 130; const grad = g.createLinearGradient(0, y, 0, y + len); grad.addColorStop(0, `rgba(52,46,40,${0.1 + mood.wear * 0.22})`); grad.addColorStop(1, 'rgba(52,46,40,0)'); g.fillStyle = grad; g.fillRect(x, y, 4 + random() * 16, len); }
        g.fillStyle = '#5f5e5a'; g.fillRect(0, Y(PLINTH), cw, PLINTH * pxm);
        const pane = (x: number, y: number, w: number, hh: number, chance: number, stair = false) => {
          const px = x * pxm, py = Y(y + hh), pw = w * pxm, ph = hh * pxm;
          g.fillStyle = '#e6e3d8'; g.fillRect(px - 2, py - 2, pw + 4, ph + 4);
          const on = random() < chance;
          const tv = on && !stair && random() < 0.12;
          const colour = on ? (stair ? '#c9b46a' : tv ? '#8fb6e6' : curtains[Math.floor(random() * curtains.length)]) : ['#39444e', '#434e57', '#333c45'][Math.floor(random() * 3)];
          g.fillStyle = colour; g.fillRect(px, py, pw, ph);
          if (on) { lit.fillStyle = stair ? '#6b5a2c' : colour; lit.fillRect(px, py, pw, ph); }
          else if (random() < 0.5) { g.fillStyle = 'rgba(214,214,204,0.5)'; g.fillRect(px, py, pw * 0.3, ph); g.fillRect(px + pw * 0.7, py, pw * 0.3, ph); }
          g.fillStyle = '#e6e3d8'; if (!stair) { g.fillRect(px + pw * 0.62, py, 2, ph); g.fillRect(px, py + ph * 0.3, pw * 0.62, 2); }
          for (const target of on ? [g, lit] : [g]) { target.fillStyle = on && target === lit ? '#000000' : '#e6e3d8'; if (!stair) target.fillRect(px + pw * 0.62, py, 2, ph); }
        };
        for (let i = 0; i < n; i++) for (let k = 0; k < storeys; k++) {
          const x = i * bay, y = PLINTH + k * STOREY, r = role(i);
          if (r === 'stair') { if (k === 0) { g.fillStyle = '#2b2a28'; g.fillRect((x + bay * 0.26) * pxm, Y(y + 0.82), bay * 0.48 * pxm, 0.82 * pxm); } else pane(x + bay * 0.34, y - 0.22, bay * 0.32, 0.5, 0.15 + dim * 0.7, true); if (k === storeys - 1) pane(x + bay * 0.34, y + 0.5, bay * 0.32, 0.36, 0.15 + dim * 0.7, true); }
          else if (r === 'balcony' && k > 0) { const on = litChance; pane(x + bay * 0.14, y + 0.14, bay * 0.72, 0.7, on); }
          else pane(x + bay * 0.2, y + 0.28, bay * 0.6, 0.52, litChance);
        }
      });
      const emissive = new THREE.CanvasTexture(canvasLit); emissive.colorSpace = THREE.SRGBColorSpace;
      const depth = 2.2;
      const wallMat = b.material(new THREE.Color(palette.base).lerp(sky, far ? 0.45 : 0), { roughness: 0.95 });
      b.box([length, h, depth], [0, h / 2, -depth / 2 - 0.01], wallMat);
      b.mesh(new THREE.PlaneGeometry(length, h), new THREE.MeshStandardMaterial({ map, emissiveMap: emissive, emissive: warm, emissiveIntensity: mix(0.55, 1.25, dim), roughness: 0.95 }), [0, h / 2, 0]);
      b.box([length + 0.3, 0.1, depth + 0.3], [0, h + 0.05, -depth / 2], b.material('#4b4a47', { roughness: 1 }));
      if (snowy || a.ground === 'ice') b.box([length + 0.2, 0.12, depth + 0.2], [0, h + 0.15, -depth / 2], snowMat);
      if (a.roofGuard !== 'none') {
        const metal = b.material('#575d59', { metalness: 0.4 });
        for (const z of [-0.08, -depth + 0.08]) {
          b.rod([-length / 2 + 0.12, h + 0.57, z], [length / 2 - 0.12, h + 0.57, z], 0.018, metal);
          if (a.roofGuard !== 'rail') b.rod([-length / 2 + 0.12, h + 0.33, z], [length / 2 - 0.12, h + 0.33, z], 0.014, metal);
          const count = Math.ceil(length / 1.6);
          for (let i = 0; i <= count; i++) {
            const x = -length / 2 + 0.12 + i / count * (length - 0.24);
            b.rod([x, h + 0.05, z], [x, h + 0.57, z], 0.018, metal);
            if (a.roofGuard === 'panels' && i < count && i % 2 === 0) b.box([(length - 0.24) / count - 0.05, 0.38, 0.05], [x + (length - 0.24) / count / 2, h + 0.38, z], concrete);
          }
        }
      }
      if (far) return { b, h };
      // Balconies, canopies, stoops, doors, drainpipes.
      const balconies: { at: P3; size: number; color: string }[] = [], glazing: { at: P3; size: number; color: string }[] = [], hung: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < n; i++) {
        const x = -length / 2 + (i + 0.5) * bay, r = role(i);
        if (r === 'balcony') for (let k = 1; k < storeys; k++) {
          const y = PLINTH + k * STOREY;
          const tone = new THREE.Color(palette.balcony[Math.floor(random() * palette.balcony.length)]).lerp(new THREE.Color(['#7fa6c4', '#6f9a6a', '#c9b06a', '#b9735e'][Math.floor(random() * 4)]), random() < mix(0.1, 0.5, mood.cheer) ? 0.7 : 0);
          balconies.push({ at: [x, y + 0.26, 0.22], size: 1, color: '#' + tone.getHexString() });
          if (random() < 0.22 + mood.density * 0.2) glazing.push({ at: [x, y + 0.72, 0.21], size: 1, color: random() < litChance ? '#e9c877' : '#56636e' });
          else if (a.airing === 'rugs' && random() < 0.4) hung.push({ at: [x + (random() - 0.5) * 0.3, y + 0.3, 0.45], size: 1, color: ['#8f1d1f', '#6e1826', '#2f5b3a', '#d9731f', '#27395a'][Math.floor(random() * 5)] });
          else if (a.airing === 'bedding' && random() < 0.4) hung.push({ at: [x + (random() - 0.5) * 0.3, y + 0.36, 0.45], size: 1, color: random() < 0.6 ? '#b3261f' : '#f0eee6' });
        }
        if (r === 'stair') {
          b.box([bay * 1.25, 0.1, 0.95], [x, PLINTH + 0.95, 0.47], concrete);
          b.box([bay * 1.1, 0.16, 0.8], [x, 0.08, 0.4], concrete);
          b.box([0.1, PLINTH + 0.9, 0.8], [x - bay * 0.58, (PLINTH + 0.9) / 2, 0.4], concrete);
          b.box([bay * 0.46, 0.84, 0.05], [x, 0.16 + 0.42, 0.03], b.material(['#84402e', '#2e5a41', '#5f7f9a', '#3a3b3e'][Math.floor(random() * 4)], { metalness: 0.3 }));
          b.ball([0.06, 0.06, 0.06], [x + 0.2, PLINTH + 0.85, 0.5], new THREE.MeshStandardMaterial({ color: '#fff3cf', emissive: warm, emissiveIntensity: mix(0.3, 1.8, dim) }), 8);
          if (snowy) b.box([bay * 1.2, 0.07, 0.9], [x, PLINTH + 1.03, 0.47], snowMat);
          b.box([bay * 0.9, 0.3, 0.3], [x + bay * 1.15, 0.22, 0.5], b.material('#6f5a40', { roughness: 1 }));
          if (a.stepHandrail !== 'none') for (const side of a.stepHandrail === 'pipe' ? [1] : [-1, 1]) {
            const rx = x + side * bay * 0.49, rail = b.material('#4e655b', { metalness: 0.4 });
            for (const z of [0.2, 0.72]) b.rod([rx, 0.16, z], [rx, 0.9, z], 0.022, rail);
            b.rod([rx, 0.9, 0.2], [rx, 0.9, 0.72], 0.022, rail);
            if (a.stepHandrail === 'lattice') b.rod([rx, 0.25, 0.2], [rx, 0.82, 0.72], 0.012, rail);
          }
        }
        if (i % 5 === 0 && i > 0) {
          const px = x - bay / 2, pipe = b.material('#6f7577', { metalness: 0.5 });
          b.rod([px, a.roofDrain === 'barrels' ? 0.7 : 0.1, 0.06], [px, h, 0.06], 0.04, pipe);
          if (a.roofDrain === 'shoes') b.tube([[px, 0.25, 0.06], [px, 0.12, 0.12], [px, 0.09, 0.4]], 0.045, pipe);
          else if (a.roofDrain === 'hoppers') {
            b.box([0.22, 0.2, 0.15], [px, h - 0.13, 0.075], pipe);
            b.box([0.18, 0.012, 0.12], [px, h - 0.024, 0.075], b.material('#303736'));
          } else if (a.roofDrain === 'barrels') {
            b.cylinder(0.23, 0.21, 0.62, [px, 0.31, 0.27], b.material('#4f6f66'), 12);
            b.tube([[px, 0.75, 0.06], [px, 0.71, 0.27], [px, 0.62, 0.27]], 0.04, pipe);
            b.cylinder(0.21, 0.21, 0.015, [px, 0.61, 0.27], b.material('#53636a'), 12);
          }
        }
      }
      b.scatter(new THREE.BoxGeometry(bay * 0.92, 0.5, 0.42), new THREE.MeshStandardMaterial({ roughness: 0.9 }), balconies);
      if (glazing.length) b.scatter(new THREE.BoxGeometry(bay * 0.9, 0.44, 0.38), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.2, emissive: '#3a2c10', emissiveIntensity: dim }), glazing);
      if (hung.length) b.scatter(new THREE.BoxGeometry(0.5, 0.5, 0.05), new THREE.MeshStandardMaterial({ roughness: 1 }), hung);
      if (snowy) b.scatter(new THREE.BoxGeometry(bay * 0.94, 0.05, 0.44), snowMat, balconies.filter(() => random() < 0.8).map((p) => ({ at: [p.at[0], p.at[1] + 0.27, p.at[2]] as P3, size: 1 })));
      // Roof: aerials, vents and a lift-less stair hatch.
      for (let i = 0; i < length / 3; i++) {
        const x = -length / 2 + 1 + random() * (length - 2), z = -depth / 2 + (random() - 0.5) * 1.2;
        if (random() < 0.55) { const hh = 0.6 + random() * 0.7; b.rod([x, h, z], [x, h + hh, z], 0.012, b.material('#3b3d3f')); b.rod([x - 0.22, h + hh * 0.8, z], [x + 0.22, h + hh * 0.8, z], 0.008, b.material('#3b3d3f')); b.rod([x - 0.15, h + hh * 0.95, z], [x + 0.15, h + hh * 0.95, z], 0.008, b.material('#3b3d3f')); }
        else b.box([0.4, 0.35, 0.4], [x, h + 0.2, z], concrete);
      }
      return { b, h };
    };

    const back = block(W, STOREYS, false);
    back.b.root.position.set(0, 0, BACK);
    s.root.add(back.b.root);
    if (a.enclosure !== 'fence') {
      const left = block(D - 2, STOREYS, false);
      left.b.root.rotation.y = Math.PI / 2; left.b.root.position.set(LEFT, 0, 1);
      s.root.add(left.b.root);
    } else {
      // The diamond-relief concrete fence every factory and depot had.
      const panelTexture = texture(128, 128, (g) => {
        g.fillStyle = '#a3a199'; g.fillRect(0, 0, 128, 128);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x = c * 32, y = 8 + r * 28; g.fillStyle = '#b9b7ae'; g.beginPath(); g.moveTo(x + 16, y); g.lineTo(x + 32, y + 14); g.lineTo(x + 16, y + 28); g.lineTo(x, y + 14); g.fill(); g.fillStyle = '#85837c'; g.beginPath(); g.moveTo(x + 16, y + 28); g.lineTo(x + 32, y + 14); g.lineTo(x + 16, y + 14); g.fill(); }
        g.fillStyle = '#8e8c85'; g.fillRect(0, 120, 128, 8); g.fillRect(0, 0, 3, 128);
      });
      panelTexture.wrapS = THREE.RepeatWrapping; panelTexture.repeat.set(7, 1);
      const fence = s.box([0.14, 1.9, D - 2.2], [LEFT - 0.6, 0.95, 1.1], s.material('#a3a199', { roughness: 1 }));
      const face = s.mesh(new THREE.PlaneGeometry(D - 2.2, 1.9), new THREE.MeshStandardMaterial({ map: panelTexture, roughness: 1 }), [LEFT - 0.52, 0.95, 1.1]); face.rotation.y = Math.PI / 2;
      fence.castShadow = true;
      for (let i = 0; i < 8; i++) s.box([0.22, 2.0, 0.22], [LEFT - 0.6, 1.0, -5.3 + i * 1.8], concrete);
      if (snowy) s.box([0.2, 0.06, D - 2.2], [LEFT - 0.6, 1.93, 1.1], snowMat);
      // A chimney stack beyond it.
      s.cylinder(0.3, 0.45, 9, [LEFT - 1.4, 4.5, -3], s.material(new THREE.Color('#8a5a48').lerp(sky, 0.4), { roughness: 1 }), 12);
    }
    if (a.enclosure === 'towers') {
      const tower = block(9, 9, true);
      tower.b.root.position.set(4.5, 0, BACK - 2.4);
      s.root.add(tower.b.root);
    }
    if (a.yardBench !== 'none') {
      const bx = -6.05, bz = 4.65, wood = s.material('#5d7960'), metal = s.material('#737871');
      const bench = (z: number) => {
        for (const x of [-0.65, 0.65]) s.box([0.16, 0.43, 0.4], [bx + x, 0.215, z], concrete);
        for (let i = 0; i < 3; i++) s.box([1.65, 0.04, 0.12], [bx, 0.45, z - 0.13 + i * 0.13], wood);
        if (a.yardBench === 'backed') {
          for (const x of [-0.65, 0.65]) s.rod([bx + x, 0.4, z - 0.2], [bx + x, 0.97, z - 0.23], 0.023, metal);
          for (let i = 0; i < 3; i++) s.box([1.65, 0.11, 0.035], [bx, 0.62 + i * 0.14, z - 0.22], wood);
        }
      };
      bench(bz);
      if (a.yardBench === 'table') {
        bench(bz + 1.15);s.box([0.18, 0.72, 0.4], [bx, 0.36, bz + 0.58], concrete);
        s.box([1.45, 0.05, 0.66], [bx, 0.745, bz + 0.58], wood);
        for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) s.box([0.055, 0.001, 0.055], [bx - 0.1925 + col * 0.055, 0.7705, bz + 0.3875 + row * 0.055], s.material((row + col) % 2 ? '#353b32' : '#c2b78c'));
      }
    }
    if (a.noticeBoard !== 'none') {
      const x = -6.7, z = 0.4, wood = s.material('#8b7857'), frame = s.material('#4c6761');
      if (a.noticeBoard === 'kiosk') {
        s.cylinder(0.25, 0.28, 0.13, [x, 0.065, z], concrete, 3);
        s.cylinder(0.07, 0.07, 1.8, [x, 0.9, z], frame, 8);
        const column = s.cylinder(0.4, 0.4, 0.95, [x, 1.18, z], wood, 3);column.rotation.y=Math.PI/6;
        for(let i=0;i<3;i++){const t=i*Math.PI*2/3,px=x+Math.sin(t)*0.205,pz=z+Math.cos(t)*0.205;const paper=s.box([0.31,0.6,0.008],[px,1.2,pz],s.material('#ddd6b8'));paper.rotation.y=t;}
      } else {
        for(const dx of[-0.48,0.48])s.box([0.07,1.95,0.07],[x+dx,0.975,z],frame);
        s.box([1.08,0.8,0.07],[x,1.45,z],wood);
        for(let i=0;i<4;i++)s.box([0.2,0.3+(i%2)*0.12,0.006],[x-0.36+i*0.24,1.44,z+0.039],s.material(i%2?'#d8d5bd':'#e5decb'));
        if(a.noticeBoard==='glass')s.box([1.0,0.73,0.01],[x,1.45,z+0.05],new THREE.MeshStandardMaterial({color:'#b2c2bd',transparent:true,opacity:0.18,depthWrite:false}));
        else for(const side of[-1,1]){const roof=s.box([0.66,0.035,0.38],[x+side*0.3,1.99,z],wood);roof.rotation.z=-side*0.18;}
      }
    }
    const entryPaint=s.material('#d5c88e'),entryMetal=s.material('#5a665c',{metalness:0.4});
    if(a.yardEntrance==='bollards')for(const x of[-8.9,8.9]){s.cylinder(0.12,0.15,0.8,[x,0.4,6.95],entryMetal,8);s.cylinder(0.123,0.123,0.17,[x,0.59,6.95],entryPaint,8);}
    else if(a.yardEntrance==='posts')for(const x of[-1,3.9])for(const z of[6.43,7.27])s.cylinder(0.07,0.07,0.55,[x,0.275,z],entryMetal,8);
    else if(a.yardEntrance==='boom'){
      const x=-8.6,z=6.95;s.box([0.3,0.9,0.35],[x,0.45,z],entryMetal);s.rod([x,0.84,z],[x+1.0,3.3,z],0.055,entryPaint);s.box([0.32,0.35,0.2],[x-0.13,0.57,z],entryMetal);
    }
    if(a.roadDetail==='crossing')for(let i=0;i<6;i++)s.box([0.2,0.008,0.72],[0.72+i*0.32,0.004,7.02],entryPaint);
    else if(a.roadDetail==='parking')for(let i=0;i<8;i++)s.box([0.065,0.008,0.7],[-7.7+i*2.15,0.004,7.03],entryPaint);
    else if(a.roadDetail==='hump')for(let i=0;i<8;i++){const hump=s.cylinder(0.09,0.09,0.105,[-7.8,0,6.64+i*0.105],i%2?entryPaint:entryMetal,10);hump.rotation.x=Math.PI/2;}

    // ---- Trees: every branch is one instance of a tapered cylinder.
    const segments: { from: THREE.Vector3; to: THREE.Vector3; r: number; color: string }[] = [];
    const bark = '#4a4038', twig = '#3a322c';
    const limb = (from: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number, color: string, spread: number) => {
      const to = from.clone().addScaledVector(dir, len);
      segments.push({ from, to, r, color });
      if (depth <= 0) return;
      const kids = 2;
      for (let i = 0; i < kids; i++) {
        const d = dir.clone().add(new THREE.Vector3(random() - 0.5, random() * 0.2, random() - 0.5).multiplyScalar(spread)).normalize();
        limb(from.clone().lerp(to, 0.45 + random() * 0.5), d, len * 0.62, r * 0.55, depth - 1, twig, spread);
      }
    };
    const tree = (x: number, z: number) => {
      const base = new THREE.Vector3(x, 0, z);
      if (a.trees === 'poplars') {
        const h = 5.2 + random() * 1.6, n = 6;
        let p = base;
        for (let i = 0; i < n; i++) {
          const q = new THREE.Vector3(x + (random() - 0.5) * 0.12, h * (i + 1) / n, z + (random() - 0.5) * 0.12);
          segments.push({ from: p, to: q, r: mix(0.17, 0.035, i / n), color: bark });
          if (i > 0) for (let j = 0; j < 3; j++) { const t = random() * 6.283; limb(p.clone().lerp(q, random()), new THREE.Vector3(Math.cos(t) * 0.42, 1, Math.sin(t) * 0.42).normalize(), h * 0.3 * (1 - i / n * 0.55), 0.045 * (1 - i / n * 0.5), 1, twig, 0.45); }
          p = q;
        }
      } else if (a.trees === 'pollards') {
        const h = 2.3 + random() * 0.6;
        segments.push({ from: base, to: new THREE.Vector3(x + (random() - 0.5) * 0.2, h, z), r: 0.24, color: bark });
        s.ball([0.3, 0.26, 0.3], [x, h, z], s.material('#4a4038', { roughness: 1 }), 8);
        for (let j = 0; j < 11; j++) { const t = random() * 6.283, o = 0.15 + random() * 0.35; limb(new THREE.Vector3(x, h, z), new THREE.Vector3(Math.cos(t) * o, 1, Math.sin(t) * o).normalize(), 1.0 + random() * 0.9, 0.022, 0, twig, 0); }
      } else {
        const h = 4.2 + random() * 1.2, n = 5;
        let p = base; const lean = (random() - 0.5) * 0.5;
        for (let i = 0; i < n; i++) {
          const q = new THREE.Vector3(x + lean * (i + 1) / n * (i + 1) / n, h * (i + 1) / n, z);
          segments.push({ from: p, to: q, r: mix(0.1, 0.025, i / n), color: i % 2 ? '#e9e7e0' : '#d9d7d0' });
          if (i > 0) for (let j = 0; j < 3; j++) { const t = random() * 6.283; const start = p.clone().lerp(q, random()); const mid = start.clone().add(new THREE.Vector3(Math.cos(t) * 0.5, 0.45, Math.sin(t) * 0.5)); segments.push({ from: start, to: mid, r: 0.02, color: twig }); segments.push({ from: mid, to: mid.clone().add(new THREE.Vector3(Math.cos(t) * 0.35, -0.6 - random() * 0.5, Math.sin(t) * 0.35)), r: 0.012, color: twig }); }
          p = q;
        }
      }
    };
    if (a.trees !== 'none') {
      const spots: [number, number][] = [[-6.2, -4.3], [-3.6, -4.5], [4.6, -4.5], [8.5, -3.4], [-6.6, -1.0], [-6.3, 5.8], [8.6, 5.6], [-0.4, -4.6], [-6.7, 2.8], [8.7, 0.9]];
      const count = Math.round(mix(4, spots.length, mood.density));
      for (let i = 0; i < count; i++) tree(spots[i][0] + (random() - 0.5) * 0.6, spots[i][1] + (random() - 0.5) * 0.4);
    }
    if (segments.length) {
      const geometry = new THREE.CylinderGeometry(0.62, 1, 1, 6); geometry.translate(0, 0.5, 0);
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ roughness: 1 }), segments.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), colour = new THREE.Color();
      segments.forEach((seg, i) => {
        const d = seg.to.clone().sub(seg.from), len = d.length();
        q.setFromUnitVectors(up, d.normalize());
        m.compose(seg.from, q, new THREE.Vector3(seg.r, len, seg.r));
        mesh.setMatrixAt(i, m); mesh.setColorAt(i, colour.set(seg.color));
      });
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = true;
      s.root.add(mesh);
    }

    // ---- Heating pipes in tin-wrapped lagging, with a leak.
    const puffs: THREE.Mesh[] = [];
    const leak = (at: P3) => {
      const material = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 6; i++) { const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), material); puff.position.set(...at); puff.userData = { phase: i / 6, home: at, drift: (random() - 0.5) * 0.8 }; s.root.add(puff); puffs.push(puff); }
    };
    const lag = s.material(new THREE.Color('#b4b7b5').lerp(new THREE.Color('#8f8a7c'), mood.wear * 0.5), { metalness: 0.45, roughness: 0.5 });
    const wool = s.material('#c99a4a', { roughness: 1 });
    const run = (points: P3[], offset: P3) => {
      for (let i = 0; i < points.length - 1; i++) {
        const p = points[i], q = points[i + 1];
        s.rod([p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]], [q[0] + offset[0], q[1] + offset[1], q[2] + offset[2]], 0.17, lag);
        s.ball([0.17, 0.17, 0.17], [q[0] + offset[0], q[1] + offset[1], q[2] + offset[2]], lag, 10);
        const len = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
        for (let t = 0.8; t < len - 0.3; t += 1.3 + random() * 0.5) { const f = t / len, g = Math.min(1, f + 0.16 / len); s.rod([mix(p[0], q[0], f) + offset[0], mix(p[1], q[1], f) + offset[1], mix(p[2], q[2], f) + offset[2]], [mix(p[0], q[0], g) + offset[0], mix(p[1], q[1], g) + offset[1], mix(p[2], q[2], g) + offset[2]], 0.178, random() < mood.wear * 0.6 ? wool : s.material('#6f7577', { metalness: 0.5 })); }
      }
      if (snowy) for (let i = 0; i < points.length - 1; i++) { const p = points[i], q = points[i + 1]; if (Math.abs(q[1] - p[1]) < 0.1) { const cap = s.rod([p[0] + offset[0], p[1] + offset[1] + 0.13, p[2] + offset[2]], [q[0] + offset[0], q[1] + offset[1] + 0.13, q[2] + offset[2]], 0.1, snowMat); cap.castShadow = false; } }
    };
    if (a.pipes === 'arch') {
      const x = 8.8, y = 0.62, top = 3.0;
      const line: P3[] = [[x, y, -5.1], [x, y, 0.4], [x, top, 0.4], [x, top, 2.8], [x, y, 2.8], [x, y, 6.2]];
      run(line, [0, 0, 0]); run(line, [-0.46, 0, 0]);
      for (const z of [-4.4, -2.8, -1.2, 3.8, 5.4]) s.box([1.0, y - 0.15, 0.3], [x - 0.23, (y - 0.15) / 2, z], concrete);
      for (const z of [0.4, 2.8]) for (const dx of [0.3, -0.76]) s.rod([x + dx, 0, z], [x + dx, top, z], 0.035, s.material('#4d4f50', { metalness: 0.5 }));
      leak([x - 0.23, top + 0.2, 0.5]);
    } else if (a.pipes === 'trestle') {
      const z = BACK + 1.5, y = 3.25;
      const line: P3[] = [[-7.0, y, z], [9.2, y, z]];
      run(line, [0, 0, 0]); run(line, [0, 0, 0.46]);
      for (let x = -6.4; x < 9.2; x += 3.1) { for (const dz of [-0.3, 0.76]) s.rod([x, 0, z + dz], [x, y - 0.15, z + dz], 0.045, s.material('#4d4f50', { metalness: 0.5 })); s.box([0.12, 0.1, 1.3], [x, y - 0.2, z + 0.23], s.material('#4d4f50', { metalness: 0.5 })); s.rod([x, 0.2, z - 0.3], [x, y - 0.3, z + 0.76], 0.02, s.material('#4d4f50')); }
      leak([3 + random() * 3, y + 0.2, z + 0.2]);
    }

    // ---- Street lamps: precast posts with a drooping arm.
    for (const [x, z, turn] of [[-4.9, -4.2, 0.6], [7.6, 5.7, -2.4]] as const) {
      s.cylinder(0.07, 0.11, 4.4, [x, 2.2, z], concrete, 8);
      const ax = x + Math.cos(turn) * 0.9, az = z + Math.sin(turn) * 0.9;
      s.rod([x, 4.35, z], [ax, 4.55, az], 0.035, concrete);
      s.ball([0.2, 0.09, 0.14], [ax, 4.5, az], new THREE.MeshStandardMaterial({ color: '#fff0c8', emissive: warm, emissiveIntensity: mix(0.1, 2.2, dim), roughness: 0.4 }), 10);
    }

    // ---- Washing lines.
    const sheets: THREE.Mesh[] = [];
    if (a.airing === 'lines') {
      const x0 = -7.0, x1 = -5.0, zs = [2.2, 3.1];
      const pole = s.material('#5c7f9c', { metalness: 0.3 });
      for (const x of [x0, x1]) { s.rod([x, 0, 2.65], [x, 2.0, 2.65], 0.04, pole); s.rod([x, 2.0, 2.0], [x, 2.0, 3.3], 0.03, pole); }
      for (const z of zs) {
        s.rod([x0, 1.98, z], [x1, 1.98, z], 0.008, s.material('#d9d6cc'));
        let x = x0 + 0.25;
        while (x < x1 - 0.6) {
          const w = 0.4 + random() * 0.7, h = 0.6 + random() * 0.8;
          const cloth = s.box([w, h, 0.03], [x + w / 2, 1.97 - h / 2, z], s.material(['#f1efe8', '#e9e6da', '#cfdbe6', '#e6cfcf', '#d9e3c9', '#8fa9c4'][Math.floor(random() * 6)], { roughness: 1 }));
          cloth.rotation.x = (random() - 0.5) * 0.25; sheets.push(cloth);
          x += w + 0.08 + random() * 0.2;
        }
      }
    }

    // ---- The far corner.
    const cx = -5.4, cz = -3.0;
    if (a.life === 'swings') {
      const paint = s.material(new THREE.Color('#3f6f9a').lerp(new THREE.Color('#7b6a5c'), mood.wear * 0.5), { metalness: 0.3 });
      for (const dx of [-1.3, 1.3]) for (const dz of [-0.6, 0.6]) s.rod([cx + dx, 0, cz + dz], [cx + dx, 2.3, cz], 0.04, paint);
      s.rod([cx - 1.3, 2.3, cz], [cx + 1.3, 2.3, cz], 0.04, paint);
      for (const dx of [-0.55, 0.55]) { for (const o of [-0.2, 0.2]) s.rod([cx + dx + o, 2.3, cz], [cx + dx + o, 0.55, cz + 0.05], 0.01, s.material('#3b3d3f', { metalness: 0.6 })); s.box([0.5, 0.04, 0.2], [cx + dx, 0.54, cz + 0.05], s.material(snowy ? '#f1f4f7' : '#8a6a43')); }
    } else if (a.life === 'snowman') {
      const snow = new THREE.MeshStandardMaterial({ color: a.ground === 'thaw' ? '#d5d5cc' : '#f4f6f8', roughness: 1 });
      const lean = (random() - 0.5) * 0.3;
      s.ball([0.62, 0.55, 0.62], [cx, 0.5, cz], snow, 16); s.ball([0.45, 0.42, 0.45], [cx + lean * 0.3, 1.3, cz], snow, 14); s.ball([0.32, 0.3, 0.32], [cx + lean * 0.6, 1.92, cz], snow, 12);
      const hat = s.cylinder(0.2, 0.26, 0.3, [cx + lean * 0.7, 2.28, cz], s.material('#4f7fae', { metalness: 0.4 }), 12); hat.rotation.z = -lean;
      const nose = s.mesh(new THREE.ConeGeometry(0.06, 0.34, 8), s.material('#e8782a'), [cx + lean * 0.6 + 0.2, 1.92, cz + 0.3]); nose.rotation.x = Math.PI / 2; nose.rotation.z = -0.6;
      for (const side of [-1, 1]) s.rod([cx + side * 0.35, 1.4, cz], [cx + side * 1.0, 1.75 + random() * 0.3, cz + 0.2], 0.02, s.material('#4a4038'));
      for (const y of [1.15, 1.35, 1.55]) s.ball([0.045, 0.045, 0.045], [cx + lean * 0.3 + 0.25, y, cz + 0.36], s.material('#26262a'), 6);
      s.box([0.34, 0.04, 0.8], [cx + 1.6, 0.16, cz + 0.6], s.material('#b98845')).rotation.y = 0.5;
      for (const o of [-0.14, 0.14]) s.box([0.03, 0.14, 0.8], [cx + 1.6 + o, 0.07, cz + 0.6 + o * 0.5], s.material('#51585c', { metalness: 0.5 })).rotation.y = 0.5;
    } else if (a.life === 'slide') {
      const wood = s.material(new THREE.Color('#9a7a4c').lerp(new THREE.Color('#84807a'), mood.wear * 0.5), { roughness: 1 });
      s.box([1.3, 0.08, 1.3], [cx - 1.0, 1.7, cz], wood);
      for (const dx of [-0.6, 0.6]) for (const dz of [-0.6, 0.6]) s.box([0.1, 2.5, 0.1], [cx - 1.0 + dx, 1.25, cz + dz], wood);
      for (const dz of [-0.62, 0.62]) s.box([1.3, 0.08, 0.06], [cx - 1.0, 2.4, cz + dz], wood);
      const chute = s.box([3.0, 0.07, 1.1], [cx + 0.92, 0.9, cz], new THREE.MeshStandardMaterial({ color: '#cfe3ee', roughness: 0.12, metalness: 0.3 })); chute.rotation.z = -0.56;
      for (const dz of [-0.57, 0.57]) { const rail = s.box([3.0, 0.3, 0.06], [cx + 0.92, 1.02, cz + dz], wood); rail.rotation.z = -0.56; }
      for (let i = 0; i < 6; i++) s.box([0.5, 0.05, 0.12], [cx - 1.0, 0.25 + i * 0.26, cz + 0.72 + (5 - i) * 0.1], wood);
      const runout = s.box([1.6, 0.03, 1.0], [cx + 3.0, 0.015, cz], new THREE.MeshStandardMaterial({ color: '#cfe3ee', roughness: 0.12, metalness: 0.3 }));
      runout.castShadow = false;
    } else if (a.life === 'rink') {
      const board = s.material(new THREE.Color('#e4e1d6').lerp(new THREE.Color('#84807a'), mood.wear * 0.5), { roughness: 1 });
      const w = 3.9, d = 2.9, x = cx + 0.05, z = cz + 0.2;
      s.box([w - 0.1, 0.03, d - 0.1], [x, 0.015, z], new THREE.MeshStandardMaterial({ color: a.ground === 'thaw' ? '#7f8e98' : '#d2e6f0', roughness: 0.1, metalness: 0.35 })).castShadow = false;
      for (const dz of [-d / 2, d / 2]) { s.box([w, 0.7, 0.07], [x, 0.35, z + dz], board); s.box([w, 0.1, 0.075], [x, 0.1, z + dz], s.material('#b3261f')); }
      for (const dx of [-w / 2, w / 2]) { s.box([0.07, 0.7, d], [x + dx, 0.35, z], board); s.box([0.075, 0.1, d], [x + dx, 0.1, z], s.material('#b3261f')); }
      const red = s.material('#b3261f', { metalness: 0.3 });
      for (const dz of [-0.5, 0.5]) { s.rod([x - w / 2 + 0.6, 0, z + dz], [x - w / 2 + 0.6, 0.7, z + dz], 0.025, red); s.rod([x - w / 2 + 0.6, 0.7, z + dz], [x - w / 2 + 0.25, 0.02, z + dz], 0.02, red); }
      s.rod([x - w / 2 + 0.6, 0.7, z - 0.5], [x - w / 2 + 0.6, 0.7, z + 0.5], 0.025, red);
      s.rod([x + 0.5, 0.04, z + 0.3], [x + 1.6, 0.04, z - 0.2], 0.02, s.material('#b98845')); s.cylinder(0.05, 0.05, 0.03, [x + 0.3, 0.045, z + 0.5], s.material('#17171a'), 10);
    } else {
      const tin = s.material(new THREE.Color('#4a6a54').lerp(new THREE.Color('#6b5a48'), mood.wear * 0.6), { metalness: 0.4, roughness: 0.6 });
      for (let i = 0; i < 3; i++) {
        const bx = cx - 1.2 + i * 1.15;
        const bin = s.box([0.95, 1.05, 0.85], [bx, 0.525, cz - 0.6], tin); bin.rotation.y = (random() - 0.5) * 0.2;
        const bags: { at: P3; size: number; color: string }[] = [];
        for (let j = 0; j < 4 + mood.density * 6; j++) bags.push({ at: [bx + (random() - 0.5) * 0.7, 1.05 + random() * 0.25, cz - 0.6 + (random() - 0.5) * 0.5], size: 0.14 + random() * 0.12, color: ['#2a2b2e', '#d9d6cc', '#8a6a43', '#4f6b8c'][Math.floor(random() * 4)] });
        s.scatter(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ roughness: 0.8 }), bags);
      }
      // The thrown-out fir, on its side, tinsel and all.
      const fir = new Sculpture(context);
      fir.rod([0, 0, 0], [0, 2.2, 0], 0.04, fir.material('#4a3a2a'));
      for (let i = 0; i < 6; i++) { const cone = fir.mesh(new THREE.ConeGeometry(0.55 - i * 0.07, 0.6, 8), fir.material(new THREE.Color('#2f5a3a').lerp(new THREE.Color('#7a6a40'), mood.wear * 0.5), { roughness: 1 }), [0, 0.5 + i * 0.3, 0]); cone.castShadow = true; }
      const tinsel: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 26; i++) { const t = i * 0.9, y = 0.4 + i * 0.065; tinsel.push({ at: [Math.cos(t) * (0.5 - y * 0.2), y, Math.sin(t) * (0.5 - y * 0.2)], size: 0.035, color: i % 3 ? '#d9d9e0' : '#d6261c' }); }
      fir.scatter(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ metalness: 0.7, roughness: 0.3 }), tinsel);
      fir.root.rotation.z = Math.PI / 2 - 0.12; fir.root.rotation.y = 0.5; fir.root.position.set(cx + 2.3, 0.45, cz + 0.2);
      s.root.add(fir.root);
    }

    // ---- Drifts along the walls and shovelled heaps, or slush.
    if (a.ground !== 'ice') {
      const heaps: { at: P3; size: number }[] = [];
      const n = Math.round(mix(14, 30, mood.density)) * (a.ground === 'thaw' ? 0.5 : 1);
      for (let i = 0; i < n; i++) { const along = random() < 0.6; heaps.push({ at: along ? [-7.2 + random() * 16.4, 0, BACK + 0.25 + random() * 0.3] : [(a.enclosure === 'fence' ? LEFT - 0.2 : LEFT + 0.3) + random() * 0.3, 0, -5 + random() * 11.5], size: 0.5 + random() * 0.6 }); }
      for (let i = 0; i < 8; i++) heaps.push({ at: [-7.5 + random() * 16.5, 0, 6.4], size: 0.35 + random() * 0.35 });
      const mound = new THREE.SphereGeometry(1, 9, 6); mound.scale(1.2, 0.42, 0.8);
      s.scatter(mound, a.ground === 'thaw' ? new THREE.MeshStandardMaterial({ color: '#cfcfc6', roughness: 1 }) : snowMat, heaps);
    }

    const energy = mix(0.15, 1, mood.energy);
    world.update = (_dt, time) => {
      for (const puff of puffs) {
        const { phase, home, drift } = puff.userData as { phase: number; home: P3; drift: number };
        const f = (time * 0.18 * energy + phase) % 1;
        puff.position.set(home[0] + drift * f, home[1] + f * 2.2, home[2] + f * 0.6);
        puff.scale.setScalar(0.18 + f * 0.75);
      }
      sheets.forEach((sheet, i) => { sheet.rotation.x = Math.sin(time * 0.9 + i) * 0.05 * energy; });
    };
    world.update(0, 0);
    return world;
  },
});
