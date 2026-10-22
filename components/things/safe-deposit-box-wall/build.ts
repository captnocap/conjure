import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];
interface Cell { x: number; y: number; w: number; h: number; n: number }

export default defineThing({
  questions: {
    holds: choice('What does the opened box hold?', {
      letters: 'Bundles of old letters tied with ribbon.',
      jewels: 'A tangle of jewels and a string of pearls.',
      pistol: 'A revolver lying on an oilcloth.',
      cash: 'Banded bricks of banknotes.',
      nothing: 'Nothing: bare tin, already emptied.',
      photos: 'A few curling photographs.',
      coins: 'A heap of gold coins.',
      key: 'A single key on a paper tag, to some other lock.',
    }),
    forced: choice('Have any boxes been forced?', {
      none: 'No: every other door is shut and locked.',
      one: 'One door has been pried open with a crowbar, which is still there.',
      gutted: 'Many doors hang open and emptied tins lie dumped on the floor.',
    }),
    numbering: choice('How are the doors numbered?', {
      brass: 'Small engraved brass plates.',
      stamped: 'Letter-and-number codes stamped into the steel.',
      enamel: 'White enamel ovals with black numerals.',
      stencil: 'Large painted stencil numerals.',
    }),
    metal: choice('What are the doors made of?', {
      steel: 'Brushed stainless steel, cold and modern.',
      bronze: 'Bronze-toned doors, warm and old-world.',
      green: 'Green-painted steel, municipal and utilitarian.',
      nickel: 'Pale nickel plate, bright as a morgue.',
    }),
    sizes: choice('What sizes are the boxes?', {
      mixed: 'Small boxes above, medium in the middle, large lockers at the bottom.',
      small: 'A dense grid of small identical doors.',
      large: 'A few big doors, each the size of a drawer.',
    }),
    rest: choice('Where does the opened box rest?', {
      shelf: 'On a pull-out viewing shelf in the wall.',
      table: 'On a small private table in front of the wall.',
      floor: 'On the floor, set down in a hurry.',
    }),
    ladder: noul('Is a ladder leaning against the wall to reach the top rows?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const doorHex = { steel: '#b4bcc0', bronze: '#b08d4a', green: '#3f6a56', nickel: '#dcdacf' }[a.metal];
    const doorColour = new THREE.Color(doorHex).lerp(new THREE.Color('#6a5a44'), mood.wear * 0.35);
    const frame = new THREE.MeshStandardMaterial({ color: doorColour.clone().multiplyScalar(0.7), metalness: 0.5, roughness: 0.45 });
    const steel = new THREE.MeshStandardMaterial({ color: doorColour, metalness: 0.5, roughness: mix(0.3, 0.7, mood.wear) });
    const brass = new THREE.MeshStandardMaterial({ color: '#d6a640', metalness: 0.6, roughness: 0.3 });
    const dark = s.material('#17181a');
    const tin = new THREE.MeshStandardMaterial({ color: '#5d6a62', metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide });

    const W = 2.2, H = 2.0, Y0 = 0.16, D = 0.5, front = D / 2;
    const bands = a.sizes === 'mixed'
      ? [{ rows: 4, cols: 10, h: 0.14 }, { rows: 3, cols: 8, h: 0.22 }, { rows: 2, cols: 5, h: 0.39 }]
      : a.sizes === 'small' ? [{ rows: 6, cols: 10, h: 0.16 }, { rows: 6, cols: 10, h: 0.1733 }] : [{ rows: 2, cols: 5, h: 0.4 }, { rows: 3, cols: 5, h: 0.4 }];
    const cells: Cell[] = [];
    const boundaries: number[] = [];
    let n = 100 + Math.floor(random() * 8) * 100, top = Y0 + H;
    for (const band of bands) for (let r = 0; r < band.rows; r++) {
      for (let c = 0; c < band.cols; c++) cells.push({ x: -W / 2 + (c + 0.5) * (W / band.cols), y: top - band.h / 2, w: W / band.cols, h: band.h, n: n++ });
      top -= band.h;
      boundaries.push(top);
      for (let c = 1; c < band.cols; c++) s.box([0.012, band.h, 0.016], [-W / 2 + c * (W / band.cols), top + band.h / 2, front + 0.006], frame);
      s.box([W, 0.014, 0.018], [0, top, front + 0.007], frame);
    }
    // The shelf sits on the row line nearest waist height; the pulled box comes from just above it.
    const shelfY = boundaries.reduce((best, y) => (Math.abs(y - 1.0) < Math.abs(best - 1.0) ? y : best), boundaries[0]);
    const above = cells.filter((cell) => Math.abs(cell.y - cell.h / 2 - shelfY) < 0.01 && Math.abs(cell.x) < 0.5);
    const pulled = above[Math.floor(random() * above.length)];
    const open = new Set<Cell>([pulled]);
    const others = cells.filter((cell) => cell !== pulled);
    const extra = a.forced === 'none' ? 0 : a.forced === 'one' ? 1 : Math.round(mix(5, 14, mood.density));
    for (let i = 0; i < extra; i++) open.add(others[Math.floor(random() * others.length)]);

    // One painted face carries every door, keyhole and number.
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    const px = (x: number) => ((x + W / 2) / W) * 1024, py = (y: number) => (1 - (y - Y0) / H) * 1024;
    ctx.fillStyle = `#${doorColour.clone().multiplyScalar(0.6).getHexString()}`;
    ctx.fillRect(0, 0, 1024, 1024);
    for (const cell of cells) {
      const x = px(cell.x - cell.w / 2) + 3, y = py(cell.y + cell.h / 2) + 3, w = (cell.w / W) * 1024 - 6, h = (cell.h / H) * 1024 - 6;
      if (open.has(cell)) { ctx.fillStyle = '#0b0b0c'; ctx.fillRect(x, y, w, h); continue; }
      const shade = 0.88 + random() * 0.2 - (random() < mood.wear * 0.4 ? 0.2 : 0);
      ctx.fillStyle = `#${doorColour.clone().multiplyScalar(shade).getHexString()}`;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, w, 3); ctx.fillRect(x, y, 3, h);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, y + h - 3, w, 3); ctx.fillRect(x + w - 3, y, 3, h);
      const ky = y + h * 0.68, kr = Math.min(h * 0.12, 9);
      for (const kx of [x + w * 0.3, x + w * 0.7]) {
        ctx.fillStyle = a.metal === 'bronze' ? '#e7cf8a' : '#d9c27a'; ctx.beginPath(); ctx.arc(kx, ky, kr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(kx, ky, kr * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(kx - kr * 0.18, ky, kr * 0.36, kr * 0.9);
      }
      if (random() < mood.wear * 0.25) continue;
      const label = a.numbering === 'stamped' ? `${String.fromCharCode(65 + (cell.n % 7))}${cell.n % 100}` : String(cell.n);
      const ly = y + h * 0.3, size = Math.min(h * (a.numbering === 'stencil' ? 0.46 : 0.3), w * 0.3, 44);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${size}px monospace`;
      if (a.numbering === 'brass') { ctx.fillStyle = '#d9b44a'; ctx.fillRect(x + w * 0.2, ly - size * 0.62, w * 0.6, size * 1.24); ctx.fillStyle = '#2a2212'; }
      else if (a.numbering === 'enamel') { ctx.fillStyle = '#f4f1e6'; ctx.beginPath(); ctx.ellipse(x + w / 2, ly, w * 0.33, size * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#141414'; }
      else if (a.numbering === 'stencil') ctx.fillStyle = a.metal === 'green' || a.metal === 'bronze' ? '#f0e2a0' : '#1d2730';
      else ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(label, x + w / 2, ly + 1);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    s.mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: texture, metalness: 0.35, roughness: mix(0.4, 0.75, mood.wear) }), [0, Y0 + H / 2, front + 0.001]);

    // Carcass.
    s.box([W + 0.16, H + 0.04, D], [0, Y0 + H / 2, 0], frame);
    s.box([W + 0.24, Y0, D + 0.08], [0, Y0 / 2, 0], s.material('#3a3d40', { roughness: 0.5 }));
    s.box([W + 0.24, 0.1, D + 0.08], [0, Y0 + H + 0.07, 0], frame);
    s.box([W + 0.26, 0.025, 0.02], [0, Y0 + H + 0.07, D / 2 + 0.045], brass);
    s.box([W + 0.26, 0.02, 0.02], [0, Y0 - 0.01, D / 2 + 0.045], brass);

    // Swung doors on the forced cells and the pulled one.
    for (const cell of open) {
      const isPulled = cell === pulled;
      if (!isPulled && random() < 0.2) continue;
      const hinge = new THREE.Group();
      hinge.position.set(cell.x - cell.w / 2 + 0.006, cell.y, front + 0.01);
      hinge.rotation.y = -(isPulled ? 1.75 : 1.0 + random() * 1.4);
      if (!isPulled) hinge.rotation.z = (random() - 0.5) * 0.25;
      s.root.add(hinge);
      hinge.add(s.box([cell.w - 0.014, cell.h - 0.014, 0.014], [cell.w / 2 - 0.006, 0, 0], steel));
      for (const f of [0.3, 0.7]) hinge.add(s.cylinder(0.012, 0.012, 0.02, [cell.w * f, -cell.h * 0.18, 0], brass, 8)).rotation.x = Math.PI / 2;
      if (!isPulled && a.forced === 'gutted' && random() < 0.5) {
        // A tin half drawn from its slot.
        s.box([cell.w * 0.72, cell.h * 0.72, 0.5], [cell.x, cell.y, front + random() * 0.18], tin);
      }
    }

    // Where the opened box rests.
    const BL = 0.62, BH = 0.13, BD = 0.26;
    let restY = shelfY + 0.03, restZ = front + 0.24, restX = THREE.MathUtils.clamp(pulled.x + 0.1, -0.5, 0.5);
    if (a.rest === 'shelf') {
      s.box([0.9, 0.03, 0.42], [restX, shelfY + 0.012, front + 0.21], steel);
      for (const side of [-1, 1]) s.rod([restX + side * 0.4, shelfY, front + 0.4], [restX + side * 0.4, shelfY - 0.3, front + 0.01], 0.012, frame);
    } else if (a.rest === 'table') {
      restY = 0.78; restZ = front + 0.75;
      const wood = s.material('#5a3a24');
      s.box([0.9, 0.04, 0.5], [restX, 0.76, restZ], wood);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.045, 0.74, 0.045], [restX + x * 0.4, 0.37, restZ + z * 0.2], wood);
    } else { restY = 0; restZ = front + 0.65; }
    const box = new THREE.Group();
    box.position.set(restX, restY, restZ);
    box.rotation.y = (random() - 0.5) * (a.rest === 'floor' ? 1.2 : 0.3);
    s.root.add(box);
    const put = <T extends THREE.Object3D>(mesh: T) => { box.add(mesh); return mesh; };
    put(s.box([BL, 0.008, BD], [0, 0.004, 0], tin));
    for (const z of [-1, 1]) put(s.box([BL, BH, 0.008], [0, BH / 2, z * BD / 2], tin));
    for (const x of [-1, 1]) put(s.box([0.008, BH, BD], [x * BL / 2, BH / 2, 0], tin));
    const lid = new THREE.Group();
    lid.position.set(0, BH, -BD / 2);
    lid.rotation.x = -1.9;
    box.add(lid);
    lid.add(s.box([BL, 0.008, BD], [0, 0, BD / 2], tin));
    put(s.box([0.12, 0.05, 0.004], [-BL / 2 - 0.003, BH * 0.55, 0], brass)).rotation.y = Math.PI / 2;
    const inside = BH * 0.35;
    const cream = s.material('#eee4c8', { roughness: 1 });
    if (a.holds === 'letters') {
      for (const x of [-0.16, 0.12]) {
        const k = 4 + Math.floor(random() * 4);
        for (let i = 0; i < k; i++) put(s.box([0.22, 0.012, 0.13], [x + (random() - 0.5) * 0.02, inside + i * 0.013, (random() - 0.5) * 0.03], cream)).rotation.y = (random() - 0.5) * 0.15;
        put(s.box([0.02, k * 0.013 + 0.008, 0.14], [x, inside + k * 0.0065, 0], s.material('#a31f2c')));
        put(s.box([0.23, k * 0.013 + 0.008, 0.02], [x, inside + k * 0.0065, 0], s.material('#a31f2c')));
      }
      const lean = put(s.box([0.22, 0.004, 0.13], [0.24, BH + 0.02, 0.1], cream));
      lean.rotation.set(0.9, 0.3, 0);
    } else if (a.holds === 'jewels') {
      const glow = mix(0.3, 1.1, mood.cheer);
      const gems = ['#e0243f', '#19b06a', '#2a5fe8', '#f2f6ff', '#f0b429', '#b03fd8'];
      for (let i = 0; i < 14 + Math.round(mood.density * 14); i++) {
        const hex = gems[Math.floor(random() * gems.length)];
        const gem = put(s.mesh(new THREE.OctahedronGeometry(0.018 + random() * 0.02, 0), new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: glow, roughness: 0.1, metalness: 0.2 }), [(random() - 0.5) * (BL - 0.1), inside + 0.03 + random() * 0.05, (random() - 0.5) * (BD - 0.08)]));
        gem.rotation.set(random() * 3, random() * 3, 0);
      }
      const pearls: P3[] = [[-0.1, inside + 0.05, 0.02], [0.0, BH + 0.02, 0.1], [0.06, BH + 0.015, BD / 2 + 0.01], [0.1, BH - 0.08, BD / 2 + 0.03], [0.16, BH + 0.01, BD / 2 + 0.01], [0.2, inside + 0.05, 0.03]];
      put(s.tube(pearls, 0.012, s.material('#f6f1e6', { roughness: 0.25 })));
      put(s.ring(0.04, 0.008, [-0.2, BH + 0.01, 0.05], brass)).rotation.x = 1.2;
    } else if (a.holds === 'pistol') {
      put(s.box([BL - 0.06, 0.01, BD - 0.04], [0, inside, 0], s.material('#b9a877', { roughness: 1 })));
      const gun = new THREE.Group();
      gun.position.set(0, BH + 0.012, 0.01);
      gun.rotation.set(-0.25, 0.25 + random() * 0.3, 0);
      box.add(gun);
      const blue = new THREE.MeshStandardMaterial({ color: '#23262b', metalness: 0.6, roughness: 0.35 });
      gun.add(s.box([0.2, 0.03, 0.028], [0.1, 0, 0], blue));
      const cyl = s.cylinder(0.034, 0.034, 0.07, [-0.03, -0.005, 0], blue, 10); cyl.rotation.z = Math.PI / 2; gun.add(cyl);
      gun.add(s.box([0.1, 0.05, 0.03], [-0.06, 0, 0], blue));
      const grip = s.box([0.06, 0.03, 0.14], [-0.12, -0.002, 0.06], s.material('#5a3520')); grip.rotation.y = -0.35; gun.add(grip);
      gun.add(s.ring(0.026, 0.006, [-0.03, 0, 0.045], blue)).rotation.x = Math.PI / 2;
      for (let i = 0; i < 5; i++) put(s.cylinder(0.008, 0.008, 0.03, [0.18 + random() * 0.08, BH - 0.01, -0.05 + random() * 0.1], brass, 6)).rotation.set(Math.PI / 2, 0, random() * 3);
    } else if (a.holds === 'cash') {
      const k = 2 + Math.round(mood.density * 3);
      for (const x of [-0.2, 0, 0.2]) for (let i = 0; i < k - (x === 0.2 ? 1 : 0); i++) {
        put(s.box([0.17, 0.035, 0.09], [x, inside + 0.02 + i * 0.037, (i % 2 ? -1 : 1) * 0.05 - 0.02], s.material(i % 2 ? '#86a97c' : '#94b78a')));
        put(s.box([0.035, 0.037, 0.092], [x, inside + 0.02 + i * 0.037, (i % 2 ? -1 : 1) * 0.05 - 0.02], cream));
      }
    } else if (a.holds === 'photos') {
      for (let i = 0; i < 5; i++) {
        const p = new THREE.Group();
        p.position.set(-0.2 + i * 0.1 + (random() - 0.5) * 0.04, BH + 0.005 + i * 0.004, (random() - 0.5) * 0.08);
        p.rotation.set(-0.2 + random() * 0.2, random() * 3, (random() - 0.5) * 0.3);
        box.add(p);
        p.add(s.box([0.13, 0.003, 0.1], [0, 0, 0], cream));
        p.add(s.box([0.11, 0.004, 0.08], [0, 0, 0], s.material(['#5a5148', '#6e675a', '#3f3a36'][i % 3])));
      }
    } else if (a.holds === 'coins') {
      const gold = new THREE.MeshStandardMaterial({ color: '#e9b93c', metalness: 0.65, roughness: 0.28, emissive: '#6a4600', emissiveIntensity: mix(0.2, 0.7, mood.cheer) });
      const pts = Array.from({ length: 60 + Math.round(mood.density * 80) }, () => {
        const x = (random() - 0.5) * (BL - 0.06), z = (random() - 0.5) * (BD - 0.05);
        return { at: [x, inside + 0.01 + random() * 0.09 * (1 - Math.abs(x) / BL), z] as P3, size: 0.8 + random() * 0.4 };
      });
      put(s.scatter(new THREE.CylinderGeometry(0.02, 0.02, 0.005, 10), gold, pts));
      for (let i = 0; i < 5; i++) put(s.cylinder(0.02, 0.02, 0.005, [BL / 2 + 0.05 + random() * 0.1, 0.004, random() * 0.15], gold, 10));
    } else if (a.holds === 'key') {
      put(s.box([BL - 0.06, 0.006, BD - 0.04], [0, inside, 0], s.material('#3b2630', { roughness: 1 })));
      const key = new THREE.Group();
      key.position.set(0, BH * 0.75, 0);
      key.rotation.set(-0.5, 0.4, 0);
      box.add(key);
      key.add(s.ring(0.04, 0.012, [-0.1, 0, 0], brass));
      (key.children[0] as THREE.Mesh).rotation.x = Math.PI / 2;
      key.add(s.rod([-0.06, 0, 0], [0.12, 0, 0], 0.011, brass));
      for (const x of [0.07, 0.1]) key.add(s.box([0.016, 0.008, 0.04], [x, 0, 0.02], brass));
      const tag = s.box([0.09, 0.003, 0.05], [-0.2, 0, 0.05], cream); tag.rotation.y = 0.4; key.add(tag);
      key.add(s.rod([-0.14, 0, 0], [-0.17, 0, 0.04], 0.003, dark));
    } else {
      put(s.box([BL - 0.03, 0.004, BD - 0.03], [0, 0.01, 0], dark));
    }

    // Aftermath on the floor.
    if (a.forced !== 'none') {
      const bar = s.rod([W / 2 - 0.25, 0, front + 0.35], [W / 2 - 0.1, 0.85, front + 0.02], 0.014, s.material('#8a2a22', { metalness: 0.3 }));
      bar.name = 'crowbar';
      s.rod([W / 2 - 0.1, 0.85, front + 0.02], [W / 2 - 0.16, 0.9, front + 0.03], 0.014, s.material('#8a2a22', { metalness: 0.3 }));
    }
    if (a.forced === 'gutted') {
      for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) {
        const dump = new THREE.Group();
        dump.position.set((random() - 0.5) * (W + 0.3), 0, front + 0.5 + random() * 0.9);
        dump.rotation.y = random() * Math.PI;
        const tipped = random() < 0.4;
        if (tipped) { dump.rotation.z = Math.PI / 2; dump.position.y = 0.13; }
        s.root.add(dump);
        dump.add(s.box([0.5, 0.008, 0.2], [0, 0.004, 0], tin));
        for (const z of [-1, 1]) dump.add(s.box([0.5, 0.1, 0.008], [0, 0.05, z * 0.1], tin));
        for (const x of [-1, 1]) dump.add(s.box([0.008, 0.1, 0.2], [x * 0.25, 0.05, 0], tin));
      }
      const pts = Array.from({ length: 30 }, () => ({ at: [(random() - 0.5) * (W + 0.6), 0.004, front + 0.3 + random() * 1.2] as P3, size: 0.6 + random() * 0.9, color: ['#eee4c8', '#d9d2bd', '#c9d6de'][Math.floor(random() * 3)] }));
      s.scatter(new THREE.BoxGeometry(0.16, 0.003, 0.11), new THREE.MeshStandardMaterial({ roughness: 1 }), pts);
    }
    if (a.ladder) {
      const wood = s.material('#8a6238');
      const lx = -W / 2 + 0.4;
      for (const side of [-0.2, 0.2]) s.rod([lx + side, 0, front + 0.75], [lx + side, 2.05, front + 0.03], 0.022, wood);
      for (let i = 1; i < 8; i++) { const t = i / 8.2; s.rod([lx - 0.2, 2.05 * t, front + 0.75 - 0.72 * t], [lx + 0.2, 2.05 * t, front + 0.75 - 0.72 * t], 0.015, wood); }
    }
    return s.finish();
  },
});
