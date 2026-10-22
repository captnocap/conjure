import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type Item = { at: [number, number, number]; rot?: [number, number, number]; scale?: [number, number, number]; color?: THREE.ColorRepresentation };

const HOURS = {
  morning: 'Monday, five to nine: flat grey daylight, every tube on, screens waking.',
  afternoon: 'Mid-afternoon: low sun glaring through the blinds, the floor at full hum.',
  aftersix: 'After six: orange dusk in the windows, the tubes off except over one aisle.',
  night: 'Deep night: blue-black windows with city lights, one troffer and a few screens glowing.',
  weekend: 'A weekend: bright, silent and switched off, dust in the sunlight.',
} as const;

export default defineWorld({
  questions: {
    hour: choice('What time is it on the floor?', HOURS),
    story: choice('What is happening to this office?', {
      ordinary: 'Nothing: an ordinary working floor.',
      layoffs: 'Layoffs: half the pods stripped, packed boxes in the aisle, chairs pushed out and left.',
      party: 'An office party: streamers along the partitions, balloons, a banner.',
      abandoned: 'The company is gone: ceiling tiles fallen, paper drifted across the carpet, every screen dead.',
      moving: 'Moving-in day: cartons stacked everywhere, desks still bare.',
    }),
    fabric: choice('What colour are the partitions?', {
      grey: 'Grey tweed.',
      oatmeal: 'Oatmeal beige.',
      blue: 'Dusty blue.',
      mauve: 'Mauve.',
      teal: 'Teal green.',
    }),
    carpet: choice('What is the carpet?', {
      grey: 'Grey carpet tiles in a faint checker.',
      blue: 'Blue-grey loop pile tiles.',
      brown: 'Brown and tan tiles from the 1970s.',
      green: 'Institutional green.',
    }),
    blinds: choice('How are the blinds on the far wall?', {
      closed: 'All shut tight.',
      open: 'Slats tilted open, striping the light.',
      half: 'Pulled up to different heights, crooked.',
      broken: 'Bent and broken, slats hanging.',
    }),
    ceiling: choice('How much of the dropped ceiling is shown?', {
      grid: 'A hanging grid of T-bars and troffers over the far pods.',
      bare: 'No grid, only rows of troffers hanging on wires.',
      failing: 'A failing grid: tiles missing or hanging by a corner, one tube flickering.',
    }),
    wall: choice('What is on the side wall?', {
      exit: 'A fire door under a glowing EXIT sign.',
      whiteboard: 'A whiteboard with a sales chart.',
      clock: 'A big wall clock over a company slogan.',
      notices: 'A cork noticeboard and a fire extinguisher.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const dim = { morning: 1, afternoon: 1.05, aftersix: 0.66, night: 0.5, weekend: 0.98 }[a.hour];
    const background = { morning: '#dfe3e2', afternoon: '#e9e2cf', aftersix: '#cdb9a6', night: '#98a0b2', weekend: '#e6e6da' }[a.hour];
    const carpetHex = { grey: ['#8f9498', '#84898d'], blue: ['#6f7f92', '#667689'], brown: ['#8a6f55', '#a08462'], green: ['#6f8272', '#65786a'] }[a.carpet];
    const W = 14, D = 11.4;
    const { art: s, world } = diorama(context, {
      background, floor: carpetHex[0], width: W, depth: D, maxHeight: 2.5, radius: 1.3, pitch: 36, yaw: 26,
      slots: [[0, 1.5], [-3.9, 1.2], [3.9, 1.2], [-3.76, -1.8, 0, 0.72], [3.76, -1.8, 0, 0.72], [0, -1.8, 0, 0.72]],
    });
    const root = s.root;
    for (const child of root.children) {
      const light = child as THREE.Light;
      if (light.isLight) light.intensity *= dim;
    }
    if (world.keyLight && (a.hour === 'aftersix' || a.hour === 'afternoon')) world.keyLight.color.lerp(new THREE.Color('#ffb070'), a.hour === 'aftersix' ? 0.6 : 0.25);
    if (world.keyLight && a.hour === 'night') world.keyLight.color.lerp(new THREE.Color('#8fa8ff'), 0.5);

    const inst = (geometry: THREE.BufferGeometry, material: THREE.Material, items: Item[], shadow = true) => {
      if (!items.length) { geometry.dispose(); material.dispose(); return null; }
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      items.forEach((item, i) => {
        e.set(...(item.rot ?? [0, 0, 0]));
        m.compose(new THREE.Vector3(...item.at), q.setFromEuler(e), new THREE.Vector3(...(item.scale ?? [1, 1, 1])));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, new THREE.Color(item.color ?? '#ffffff'));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = shadow;
      root.add(mesh);
      return mesh;
    };
    const unit = () => new THREE.BoxGeometry(1, 1, 1);
    const flat = (options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...options });
    const paint = (cw: number, ch: number, draw: (ctx: CanvasRenderingContext2D) => void, glow = 0) => {
      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, ...(glow ? { emissive: new THREE.Color('#ffffff'), emissiveMap: texture, emissiveIntensity: glow } : {}) });
    };

    // --- Carpet tiles.
    const tiles: Item[] = [], stains: Item[] = [];
    for (let x = 0; x < W * 2; x++) for (let z = 0; z < D * 2 - 1; z++) if ((x + z) % 2 === 0) tiles.push({ at: [-W / 2 + 0.25 + x * 0.5, 0.004, -D / 2 + 0.3 + z * 0.5], scale: [0.5, 0.008, 0.5], color: new THREE.Color(carpetHex[1]).offsetHSL(0, 0, (random() - 0.5) * 0.03) });
    inst(unit(), flat({ roughness: 1 }), tiles, false)!.receiveShadow = true;
    for (let i = 0; i < Math.round(mix(0, 14, mood.wear)); i++) stains.push({ at: [mix(-6, 6, random()), 0.009, mix(-0.6, 5, random())], scale: [mix(0.2, 0.7, random()), 0.002, mix(0.2, 0.6, random())], rot: [0, random() * 3, 0], color: '#5f574a' });
    const stainMesh = inst(new THREE.CylinderGeometry(0.5, 0.5, 1, 14), flat({ transparent: true, opacity: 0.3, depthWrite: false }), stains, false);
    if (stainMesh) stainMesh.receiveShadow = false;

    // --- Far wall of windows and blinds, and the side wall.
    const wallH = 2.8, backZ = -D / 2 + 0.1;
    const wallPaint = s.material(a.hour === 'night' ? '#b9bcc4' : '#dcd8ca');
    s.box([W, wallH, 0.2], [0, wallH / 2, backZ - 0.1], wallPaint);
    s.box([0.2, wallH, D], [-W / 2 - 0.1, wallH / 2, 0], wallPaint);
    s.box([W, 0.12, 0.03], [0, 0.06, backZ + 0.015], s.material('#4a4d51'));
    s.box([0.03, 0.12, D], [-W / 2 + 0.015, 0.06, 0], s.material('#4a4d51'));
    const skyTop = { morning: '#c9d2d8', afternoon: '#ffe9a8', aftersix: '#f08a4a', night: '#141c38', weekend: '#bfe0f5' }[a.hour];
    const skyLow = { morning: '#e3e6e4', afternoon: '#fff6d8', aftersix: '#ffd27a', night: '#2b3560', weekend: '#f2f7f2' }[a.hour];
    const panes = 5, paneW = 2.3, paneH = 1.45;
    for (let i = 0; i < panes; i++) {
      const raised = a.blinds === 'half' ? mix(0.15, 0.75, random()) : 0;
      const skew = a.blinds === 'half' || a.blinds === 'broken' ? (random() - 0.5) * 14 : 0;
      const pane = paint(256, 160, (ctx) => {
        const sky = ctx.createLinearGradient(0, 0, 0, 160);
        sky.addColorStop(0, skyTop); sky.addColorStop(1, skyLow);
        ctx.fillStyle = sky; ctx.fillRect(0, 0, 256, 160);
        // Other towers.
        for (let b = 0; b < 5; b++) {
          const bx = random() * 230, bw = 26 + random() * 40, bh = 40 + random() * 90;
          ctx.fillStyle = a.hour === 'night' ? '#0c1226' : a.hour === 'aftersix' ? '#7a4a4a' : '#aab3ba';
          ctx.fillRect(bx, 160 - bh, bw, bh);
          if (a.hour === 'night' || a.hour === 'aftersix') {
            ctx.fillStyle = '#ffe28a';
            for (let n = 0; n < 14; n++) if (random() < 0.45) ctx.fillRect(bx + 4 + (n % 4) * (bw / 4.4), 164 - bh + Math.floor(n / 4) * 14, 4, 6);
          }
        }
        // Blinds.
        const slat = a.hour === 'night' ? '#8d93a0' : '#e9e6da';
        const gap = a.blinds === 'closed' ? 0.5 : a.blinds === 'open' ? 5 : 2.5;
        const bottom = 160 * (1 - raised);
        for (let y = 0; y < bottom; y += 9) {
          let tilt = 0;
          if (a.blinds === 'broken' && random() < 0.22) { if (random() < 0.4) continue; tilt = (random() - 0.5) * 26; }
          ctx.fillStyle = slat;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y + tilt + skew * (y / 160)); ctx.lineTo(256, y + tilt + skew * (y / 160) + 9 - gap); ctx.lineTo(0, y + 9 - gap); ctx.fill();
        }
        ctx.fillStyle = '#d2cfc4'; ctx.fillRect(0, 0, 256, 7);
        ctx.strokeStyle = '#8a8d8a'; ctx.lineWidth = 1.5;
        for (const x of [60, 196]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, bottom); ctx.stroke(); }
      }, { morning: 0.3, afternoon: 0.55, aftersix: 0.6, night: 0.45, weekend: 0.45 }[a.hour]);
      const x = (i - (panes - 1) / 2) * (paneW + 0.35);
      s.box([paneW + 0.12, paneH + 0.12, 0.05], [x, 1.62, backZ + 0.025], s.material('#6a6d70'));
      const glass = s.mesh(new THREE.PlaneGeometry(paneW, paneH), pane, [x, 1.62, backZ + 0.052]);
      glass.castShadow = false;
      s.box([paneW + 0.2, 0.05, 0.14], [x, 0.87, backZ + 0.07], wallPaint);
    }
    // Side wall feature.
    const sideX = -W / 2 + 0.012;
    const onSide = (mesh: THREE.Object3D) => { mesh.rotation.y = Math.PI / 2; return mesh; };
    if (a.wall === 'exit') {
      s.box([0.06, 2.1, 1.0], [sideX + 0.02, 1.05, 2.2], s.material('#7a5a3c'));
      s.box([0.08, 2.2, 0.08], [sideX + 0.02, 1.1, 1.66], s.material('#4a4d51'));
      s.box([0.08, 2.2, 0.08], [sideX + 0.02, 1.1, 2.74], s.material('#4a4d51'));
      s.box([0.05, 0.05, 0.8], [sideX + 0.07, 1.05, 2.2], s.material('#c5c9ca', { metalness: 0.5, roughness: 0.3 }));
      const sign = onSide(s.label('EXIT', 0.6, 0.24, [sideX + 0.06, 2.42, 2.2], '#eaffea', '#1f8a3a')) as THREE.Mesh;
      const material = sign.material as THREE.MeshStandardMaterial;
      material.emissive = new THREE.Color('#ffffff'); material.emissiveMap = material.map; material.emissiveIntensity = 0.9;
      s.box([0.1, 0.3, 0.66], [sideX + 0.02, 2.42, 2.2], s.material('#2a2c2f'));
    } else if (a.wall === 'whiteboard') {
      const up = mood.cheer > 0.5;
      const board = paint(384, 192, (ctx) => {
        ctx.fillStyle = '#f7f8f5'; ctx.fillRect(0, 0, 384, 192);
        ctx.strokeStyle = '#30343a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(40, 20); ctx.lineTo(40, 160); ctx.lineTo(360, 160); ctx.stroke();
        ctx.strokeStyle = up ? '#2f8a4a' : '#c0271d'; ctx.lineWidth = 6; ctx.beginPath();
        for (let i = 0; i <= 8; i++) { const y = up ? 140 - i * 13 + (random() - 0.5) * 26 : 40 + i * 13 + (random() - 0.5) * 26; if (i) ctx.lineTo(40 + i * 38, y); else ctx.moveTo(40, y); }
        ctx.stroke();
        ctx.fillStyle = '#2f4fa8'; ctx.font = 'bold 22px sans-serif'; ctx.fillText(up ? 'Q3 TARGET!' : 'Q3 ???', 200, up ? 150 : 44);
      });
      onSide(s.mesh(new THREE.BoxGeometry(2.6, 1.3, 0.03), board, [sideX + 0.03, 1.6, 1.6]));
      s.box([0.08, 0.03, 2.6], [sideX + 0.06, 0.94, 1.6], s.material('#aeb3b4'));
    } else if (a.wall === 'clock') {
      const [h, m] = { morning: [8, 55], afternoon: [3, 20], aftersix: [6, 40], night: [11, 50], weekend: [10, 10] }[a.hour];
      const dial = paint(256, 256, (ctx) => {
        ctx.fillStyle = '#f6f4ea'; ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1b1d20'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(128, 128, 120, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(128 + Math.sin(t) * 96, 128 - Math.cos(t) * 96); ctx.lineTo(128 + Math.sin(t) * 110, 128 - Math.cos(t) * 110); ctx.stroke(); }
        const hand = (turn: number, length: number, width: number) => { ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128 + Math.sin(turn) * length, 128 - Math.cos(turn) * length); ctx.stroke(); };
        hand((h + m / 60) / 12 * Math.PI * 2, 58, 12); hand(m / 60 * Math.PI * 2, 92, 8);
      });
      const face = s.mesh(new THREE.CircleGeometry(0.42, 40), dial, [sideX + 0.02, 2.05, 1.8]);
      onSide(face);
      onSide(s.label(mood.cheer > 0.5 ? 'TOGETHER WE ACHIEVE' : 'TIME IS MONEY', 3.0, 0.3, [sideX + 0.02, 1.25, 1.8], '#f4f1e4', '#2f4470'));
    } else {
      s.box([0.04, 1.2, 2.2], [sideX + 0.02, 1.6, 1.6], s.material('#b8875a'));
      const sheets: Item[] = [];
      for (let i = 0; i < Math.round(mix(5, 18, mood.density)); i++) sheets.push({ at: [sideX + 0.045 + i * 0.0006, mix(1.15, 2.05, random()), mix(0.65, 2.55, random())], rot: [(random() - 0.5) * 0.25, 0, 0], scale: [0.004, mix(0.2, 0.3, random()), mix(0.16, 0.22, random())], color: ['#f4f1e6', '#f4e9a8', '#e6edf6', '#f6c9c0'][Math.floor(random() * 4)] });
      inst(unit(), flat(), sheets, false);
      s.cylinder(0.08, 0.08, 0.45, [sideX + 0.12, 0.95, 3.6], s.material('#c0271d', { roughness: 0.35 }), 14);
      s.cylinder(0.03, 0.05, 0.08, [sideX + 0.12, 1.21, 3.6], s.material('#2a2c2f'), 10);
    }

    // --- The pods. Three rows of seven cells; three cells of the aisle-side row are open bays for the cast.
    const fabricHex = { grey: '#8e9296', oatmeal: '#c2b79c', blue: '#6f86a3', mauve: '#a08a9c', teal: '#5f8a86' }[a.fabric];
    const fabric = new THREE.Color(fabricHex).lerp(new THREE.Color('#8d8674'), mood.wear * 0.25);
    const CELL = 1.88, COLS = 7, X0 = -CELL * COLS / 2, PH = 1.4, DEPTH = 1.7;
    const panels: Item[] = [], caps: Item[] = [], kicks: Item[] = [], desks: Item[] = [], bins: Item[] = [], cases: Item[] = [], glows: Item[] = [], blanks: Item[] = [];
    const seats: Item[] = [], stems: Item[] = [], feet: Item[] = [], papers: Item[] = [], cartons: Item[] = [], keyboards: Item[] = [];
    const wallRun = (cx: number, cz: number, length: number, alongX: boolean) => {
      const turn: [number, number, number] = [0, alongX ? 0 : Math.PI / 2, 0];
      panels.push({ at: [cx, 0.1 + (PH - 0.1) / 2, cz], rot: turn, scale: [length, PH - 0.1, 0.06], color: fabric.clone().offsetHSL(0, 0, (random() - 0.5) * 0.025) });
      caps.push({ at: [cx, PH + 0.012, cz], rot: turn, scale: [length + 0.02, 0.028, 0.075] });
      kicks.push({ at: [cx, 0.05, cz], rot: turn, scale: [length, 0.1, 0.07] });
    };
    const stripRate = { ordinary: 0.06, layoffs: 0.55, party: 0.05, abandoned: 0.5, moving: 1 }[a.story];
    const litRate = a.story === 'abandoned' || a.story === 'moving' ? 0 : { morning: 0.75, afternoon: 0.85, aftersix: 0.22, night: 0.12, weekend: 0 }[a.hour];
    const chairHues = ['#3d4a66', '#5a5e63', '#6b3a40', '#2f5a57', '#3a3c40'];
    const paperTones = ['#f4f1e6', '#efe9d2', '#d8c48a', '#e6edf6'];
    const chair = (x: number, z: number, turn: number, colour: string) => {
      seats.push({ at: [x, 0.47, z], rot: [0, turn, 0], scale: [0.46, 0.08, 0.46], color: colour });
      seats.push({ at: [x - Math.sin(turn) * 0.22, 0.8, z - Math.cos(turn) * 0.22], rot: [0, turn, 0], scale: [0.42, 0.44, 0.07], color: colour });
      stems.push({ at: [x, 0.24, z], scale: [1, 1, 1] });
      feet.push({ at: [x, 0.04, z], rot: [0, random() * 3, 0] });
    };
    const bays = new Set([1, 3, 5]);
    const rows = [
      { spine: 3.9, open: 1, aisle: false },   // nearest the camera, opening toward it
      { spine: -2.65, open: 1, aisle: true },  // faces the aisle; holds the bays
      { spine: -2.65, open: -1, aisle: false } // back to back with it, facing the windows
    ];
    rows.forEach((row, rowIndex) => {
      for (let c = 0; c < COLS; c++) {
        const cx = X0 + CELL / 2 + c * CELL;
        if (rowIndex < 2) wallRun(cx, row.spine, CELL, true);
        const farZ = row.spine + row.open * DEPTH;
        if (c === 0) wallRun(X0, (row.spine + farZ) / 2, DEPTH, false);
        wallRun(X0 + (c + 1) * CELL, (row.spine + farZ) / 2, DEPTH, false);
        if (row.aisle && bays.has(c)) continue;
        const side = random() < 0.5 ? -1 : 1;
        const stripped = random() < stripRate;
        const deskZ = row.spine + row.open * 0.34;
        desks.push({ at: [cx, 0.74, deskZ], scale: [CELL - 0.1, 0.04, 0.6] });
        desks.push({ at: [cx + side * (CELL / 2 - 0.35), 0.74, row.spine + row.open * 1.08], scale: [0.6, 0.04, 0.9] });
        desks.push({ at: [cx - side * (CELL / 2 - 0.07), 0.37, deskZ], scale: [0.03, 0.72, 0.56] });
        if (random() < 0.7) bins.push({ at: [cx - side * 0.42, 1.2, row.spine + row.open * 0.2], scale: [0.95, 0.32, 0.34] });
        const px = cx + side * (CELL / 2 - 0.4), pz = row.spine + row.open * 0.38;
        const facing = row.open > 0 ? -side * Math.PI / 4 : Math.PI + side * Math.PI / 4;
        if (!stripped || a.story === 'layoffs') {
          cases.push({ at: [px, 0.76 + 0.2, pz], rot: [0, facing, 0], scale: [0.38, 0.34, 0.36] });
          cases.push({ at: [px, 0.78, pz], rot: [0, facing, 0], scale: [0.42, 0.06, 0.38] });
          const lit = !stripped && random() < litRate;
          (lit ? glows : blanks).push({ at: [px + Math.sin(facing) * 0.185, 0.97, pz + Math.cos(facing) * 0.185], rot: [0, facing, 0], scale: [0.3, 0.24, 0.01], color: lit ? ['#bfe6ff', '#a8ffb8', '#f2f6ff', '#9fb8ff'][Math.floor(random() * 4)] : '#27322d' });
          keyboards.push({ at: [px + Math.sin(facing) * 0.42, 0.775, pz + Math.cos(facing) * 0.42], rot: [0, facing, 0], scale: [0.42, 0.025, 0.15] });
        }
        if (!stripped) {
          const chairOut = a.story === 'ordinary' || a.story === 'party' ? 0.15 : 0.3;
          chair(cx - side * 0.2 + (random() - 0.5) * 0.3, row.spine + row.open * mix(0.95, 1.3 + chairOut, random()), facing + Math.PI + (random() - 0.5) * 1.6, chairHues[Math.floor(random() * chairHues.length)]);
          const piles = Math.round(mix(0, 4, mood.density) * random() + (mood.density > 0.5 ? 1 : 0));
          for (let p = 0; p < piles; p++) {
            const tall = mix(0.01, 0.16, random() * mood.density);
            papers.push({ at: [cx + (random() - 0.5) * 1.2 - side * 0.15, 0.76 + tall / 2, deskZ + (random() - 0.5) * 0.25], rot: [0, (random() - 0.5) * 0.8, 0], scale: [0.22, tall, 0.3], color: paperTones[Math.floor(random() * 4)] });
          }
        } else if (a.story !== 'abandoned') {
          const stack = a.story === 'moving' ? 1 + Math.floor(random() * 3) : 1;
          for (let b = 0; b < stack; b++) cartons.push({ at: [cx - side * 0.3 + (random() - 0.5) * 0.2, 0.76 + 0.14 + b * 0.28, deskZ + (random() - 0.5) * 0.1], rot: [0, (random() - 0.5) * 0.5, 0], scale: [0.42, 0.28, 0.34], color: new THREE.Color('#b58f5e').offsetHSL(0, 0, (random() - 0.5) * 0.06) });
        }
      }
    });
    inst(unit(), flat({ roughness: 1 }), panels);
    inst(unit(), flat({ color: '#4a4d51', roughness: 0.5 }), caps);
    inst(unit(), flat({ color: '#3d4043', roughness: 0.6 }), kicks, false);
    inst(unit(), flat({ color: mood.warmth > 0.6 ? '#d9cdb0' : '#cfcfc8', roughness: 0.5 }), desks);
    inst(unit(), flat({ color: '#a4a7a6', roughness: 0.5 }), bins);
    const beige = new THREE.Color('#d8d0b8').lerp(new THREE.Color('#c9b77c'), mood.wear * 0.4);
    inst(unit(), flat({ color: beige, roughness: 0.55 }), cases);
    inst(unit(), flat({ color: beige, roughness: 0.55 }), keyboards, false);
    const screenGlow = flat({ emissive: '#ffffff', emissiveIntensity: a.hour === 'night' || a.hour === 'aftersix' ? 1.3 : 0.7, roughness: 0.3 });
    const glowMesh = inst(unit(), screenGlow, glows, false);
    if (glowMesh) { glowMesh.material = screenGlow; screenGlow.emissive = new THREE.Color('#9fc4ff'); }
    inst(unit(), flat({ roughness: 0.2 }), blanks, false);

    // --- The aisle: strays, boxes, drifted paper. Kept clear of where the cast stands.
    const clear = (x: number, z: number) => [[0, 1.5], [-3.9, 1.2], [3.9, 1.2]].every(([sx, sz]) => Math.hypot(x - sx, z - sz) > 1.75) && !(z < -0.7 && [-3.76, 0, 3.76].some((bx) => Math.abs(x - bx) < 1.1));
    const aisleSpot = (): [number, number] | null => {
      for (let tries = 0; tries < 12; tries++) { const x = mix(-6.3, 6.3, random()), z = mix(-0.6, 3.3, random()); if (clear(x, z)) return [x, z]; }
      return null;
    };
    const strew = (count: number, drop: (x: number, z: number) => void) => { for (let i = 0; i < count; i++) { const at = aisleSpot(); if (at) drop(at[0], at[1]); } };
    if (a.story === 'layoffs') {
      strew(Math.round(mix(4, 9, mood.density)), (x, z) => chair(x, z, random() * 6, chairHues[Math.floor(random() * 5)]));
      strew(Math.round(mix(4, 10, mood.density)), (x, z) => {
        cartons.push({ at: [x, 0.14, z], rot: [0, random() * 3, 0], scale: [0.42, 0.28, 0.34], color: '#b58f5e' });
        if (random() < 0.5) papers.push({ at: [x, 0.3, z], rot: [0, random() * 3, 0], scale: [0.3, 0.05, 0.22], color: ['#3d5f8a', '#4f9447', '#8a3d3d'][Math.floor(random() * 3)] });
      });
    } else if (a.story === 'moving') {
      strew(Math.round(mix(8, 16, mood.density)), (x, z) => {
        const tall = 1 + Math.floor(random() * 4);
        for (let b = 0; b < tall; b++) cartons.push({ at: [x + (random() - 0.5) * 0.06, 0.16 + b * 0.32, z + (random() - 0.5) * 0.06], rot: [0, (random() - 0.5) * 0.4, 0], scale: [0.5, 0.32, 0.4], color: new THREE.Color('#b58f5e').offsetHSL(0, 0, (random() - 0.5) * 0.06) });
      });
      strew(4, (x, z) => chair(x, z, random() * 6, '#e9ecec'));
    } else if (a.story === 'abandoned') {
      strew(Math.round(mix(60, 150, mood.density)), (x, z) => papers.push({ at: [x, 0.012, z], rot: [0, random() * 3, 0], scale: [0.21, 0.004, 0.3], color: paperTones[Math.floor(random() * 3)] }));
      strew(5, (x, z) => chair(x, z, random() * 6, chairHues[Math.floor(random() * 5)]));
      strew(9, (x, z) => papers.push({ at: [x, 0.02, z], rot: [(random() - 0.5) * 0.1, random() * 3, 0], scale: [0.6, 0.02, 0.6], color: '#e4e1d6' }));
    } else if (a.story === 'ordinary') {
      strew(Math.round(mix(0, 3, mood.density)), (x, z) => cartons.push({ at: [x, 0.14, z], rot: [0, random() * 3, 0], scale: [0.42, 0.28, 0.34], color: '#b58f5e' }));
    }
    inst(unit(), flat({ roughness: 0.95 }), seats);
    inst(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), flat({ color: '#2a2c2f', roughness: 0.5 }), stems, false);
    inst(new THREE.CylinderGeometry(0.28, 0.3, 0.05, 5), flat({ color: '#2a2c2f', roughness: 0.5 }), feet);
    inst(unit(), flat({ roughness: 0.95 }), papers);
    inst(unit(), flat({ roughness: 1 }), cartons);

    // --- Party dressing along the partition tops.
    const balloons: Item[] = [];
    if (a.story === 'party') {
      const party = ['#e23d4f', '#f2b01e', '#3f8fe0', '#44b56b', '#b06fc4'];
      for (const z of [3.9, -2.65]) for (let c = 0; c < COLS; c++) {
        const x0 = X0 + c * CELL, colour = party[(c + (z > 0 ? 0 : 2)) % 5];
        s.tube([[x0, PH + 0.03, z], [x0 + CELL * 0.25, PH - 0.12, z + 0.04], [x0 + CELL / 2, PH - 0.2, z + 0.05], [x0 + CELL * 0.75, PH - 0.12, z + 0.04], [x0 + CELL, PH + 0.03, z]], 0.018, s.material(colour, { emissive: colour, emissiveIntensity: 0.2 }));
      }
      for (let i = 0; i < Math.round(mix(10, 26, mood.density)); i++) {
        const z = random() < 0.5 ? 3.9 : -2.65, x = X0 + Math.floor(random() * (COLS + 1)) * CELL;
        balloons.push({ at: [x + (random() - 0.5) * 0.3, PH + mix(0.35, 0.75, random()), z + (random() - 0.5) * 0.3], scale: [1, 1.18, 1], color: party[Math.floor(random() * 5)] });
      }
      const banner = s.label(mood.cheer > 0.45 ? 'HAPPY BIRTHDAY' : 'GOOD LUCK - WE WILL MISS YOU', 3.2, 0.32, [1.88, PH - 0.3, -2.65 + 0.04], '#ffffff', mood.cheer > 0.45 ? '#e23d4f' : '#5a5f8a');
      banner.castShadow = false;
    }
    const balloonMesh = inst(new THREE.SphereGeometry(0.15, 16, 10), flat({ roughness: 0.25, emissive: '#ffffff', emissiveIntensity: 0.08 }), balloons);

    // --- Dropped ceiling over the far pods, and the one troffer still lit over the aisle.
    const CY = 2.85;
    const tubeColour = new THREE.Color().setHSL(mix(0.58, 0.13, mood.warmth), 0.45, 0.9);
    const lampsOn = a.story === 'abandoned' ? 0 : { morning: 1, afternoon: 0.9, aftersix: 0.12, night: 0.04, weekend: 0 }[a.hour];
    const bars: Item[] = [], lit: Item[] = [], dead: Item[] = [], tilesUp: Item[] = [], wires: Item[] = [];
    const zLines = [-4.5, -3.3, -2.1, -0.9];
    if (a.ceiling !== 'bare') {
      for (const z of zLines) bars.push({ at: [0, CY, z], scale: [W - 0.4, 0.03, 0.035] });
      for (let x = -6.6; x <= 6.61; x += 1.2) bars.push({ at: [x, CY, -2.7], scale: [0.035, 0.03, 3.6] });
    }
    let flicker: THREE.InstancedMesh | null = null;
    for (let i = 0; i < 11; i++) for (let j = 0; j < 3; j++) {
      const x = -6 + i * 1.2, z = -3.9 + j * 1.2;
      const troffer = (i + j * 2) % 3 === 0;
      if (troffer) {
        (random() < lampsOn ? lit : dead).push({ at: [x, CY - 0.01, z], scale: [1.16, 0.05, 0.58] });
        if (a.ceiling === 'bare') for (const dx of [-0.5, 0.5]) wires.push({ at: [x + dx, CY + 0.3, z], scale: [0.008, 0.6, 0.008] });
      } else if (a.ceiling === 'failing' && random() < 0.3) {
        const hanging = random() < 0.45;
        tilesUp.push({ at: [x, CY - (hanging ? 0.3 : 0.005), z], rot: hanging ? [(random() - 0.5) * 1.6, 0, (random() - 0.5) * 1.6] : [0, 0, 0], scale: [1.16, 0.02, 1.16], color: new THREE.Color('#e9e6da').lerp(new THREE.Color('#b9a57a'), random() * mood.wear) });
      }
    }
    inst(unit(), flat({ color: '#c9ccca', metalness: 0.3, roughness: 0.4 }), bars, false);
    inst(unit(), flat({ color: '#6a6d70' }), wires, false);
    const litMaterial = new THREE.MeshStandardMaterial({ color: tubeColour, emissive: tubeColour, emissiveIntensity: 1.5 });
    inst(unit(), litMaterial, lit, false);
    inst(unit(), flat({ color: '#b4b8b6', transparent: true, opacity: 0.75 }), dead, false);
    inst(unit(), flat({ roughness: 1 }), tilesUp);
    // The hero's light.
    const heroY = 3.25;
    const heroMaterial = new THREE.MeshStandardMaterial({ color: tubeColour, emissive: tubeColour, emissiveIntensity: 2 });
    s.box([1.3, 0.07, 0.66], [0, heroY + 0.02, 1.5], s.material('#c9ccca', { metalness: 0.3 }));
    const heroLamp = s.box([1.2, 0.05, 0.58], [0, heroY - 0.03, 1.5], heroMaterial);
    heroLamp.castShadow = false;
    const duskish = a.hour === 'aftersix' || a.hour === 'night';
    const poolMaterial = new THREE.MeshBasicMaterial({ color: tubeColour, transparent: true, opacity: duskish ? 0.34 : 0.12, depthWrite: false });
    const pool = s.mesh(new THREE.CircleGeometry(2.3, 40), poolMaterial, [0, 0.012, 1.5]);
    pool.rotation.x = -Math.PI / 2; pool.scale.set(1.25, 0.8, 1); pool.castShadow = pool.receiveShadow = false;
    const heroLight = new THREE.PointLight(tubeColour, duskish ? 70 : 18, 10, 1.8);
    heroLight.position.set(0, heroY - 0.2, 1.5);
    root.add(heroLight);
    if (a.ceiling === 'failing') {
      // A sick tube near the aisle edge.
      flicker = inst(unit(), new THREE.MeshStandardMaterial({ color: tubeColour, emissive: tubeColour, emissiveIntensity: 1.2 }), [{ at: [-4.8, CY - 0.01, -1.5], scale: [1.16, 0.05, 0.58] }], false);
    }

    const pace = mix(0.4, 1.6, mood.energy);
    world.update = (_dt, time) => {
      heroMaterial.emissiveIntensity = 2 + Math.sin(time * 50) * 0.05;
      if (flicker) (flicker.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(time * 9 * pace) * Math.sin(time * 23 * pace + 1) > 0.15 ? 1.6 : 0.08;
      screenGlow.emissiveIntensity = (duskish ? 1.3 : 0.7) * (1 + Math.sin(time * 31) * 0.04);
      if (balloonMesh) balloonMesh.position.y = Math.sin(time * 1.2 * pace) * 0.03;
    };
    return world;
  },
});
