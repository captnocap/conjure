import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { TRADES, extent, type Part, type Tool } from './tools';

const PAINT: Record<string, string> = {
  steel: '#b4b9bd', wood: '#b98a52', darkwood: '#6b4a2c', red: '#c0281f', yellow: '#e9b616', green: '#3f7d46', blue: '#2a5fa3',
  black: '#1e1f21', rubber: '#7a2a22', brass: '#c9a14a', hose: '#4f9a52', copper: '#c0703a', white: '#ecebe4', twine: '#c9ad73',
};
const BOARD = { brown: ['#a9784a', '#5a3b20'], white: ['#e6e3d8', '#8f8c80'], green: ['#9fb89c', '#4f6a50'], charcoal: ['#4a4d50', '#1d1e20'], yellow: ['#e2c04a', '#7a6418'] } as const;

export default defineThing({
  questions: {
    trade: choice('What trade do the tools belong to?', {
      carpentry: 'Carpentry: handsaw, claw hammer, level, square, chisels.',
      garden: 'Garden: spade, rake, hoe, shears, a coiled hose and trowels.',
      plumbing: 'Plumbing: pipe wrenches, a plunger, coils of copper tube, a blowtorch.',
      mechanic: 'Mechanic: spanners in strict size order, ratchet, wheel brace, oil can.',
      mixed: 'A bit of everything, the family toolboard built up over decades.',
    }),
    missing: score('How many tools are gone from their places?', ['Every tool home', 'One or two out', 'Half the board is empty outlines', 'Almost everything is gone']),
    outlines: choice('How is each tool\'s place marked?', {
      marker: 'A thick black marker line drawn around each tool.',
      red: 'Solid red painted silhouettes, like a factory shadow board.',
      white: 'Pale ghost silhouettes where the board never faded behind the tools.',
      none: 'Not marked at all, only bare hooks show where something hung.',
    }),
    setting: choice('Where is the board?', {
      garage: 'A home garage: mounted above a workbench with a vise and jars of screws.',
      store: 'A shop display with a header sign and yellow price tags under every tool.',
      frame: 'A bare panel on a timber frame, standing on its own.',
      school: 'A school workshop, each place numbered and a rules notice at the top.',
    }),
    board: choice('What is the board like?', {
      brown: 'Classic brown tempered hardboard.',
      white: 'White-painted, clean and bright.',
      green: 'Institutional pale green.',
      charcoal: 'Dark charcoal so the tools stand out.',
      yellow: 'Workshop yellow.',
    }),
    size: choice('How big is the panel?', {
      panel: 'A single modest panel, a dozen tools.',
      wide: 'A wide wall-length run.',
      tall: 'A tall narrow panel between two posts.',
    }),
    left: choice('What else is on the board?', {
      nothing: 'Nothing but tools.',
      note: 'A note taped in an empty outline: someone borrowed it and promises to bring it back.',
      calendar: 'A tear-off calendar and a pencil on a string.',
      apron: 'A work apron hanging from the corner hook.',
      keys: 'A row of cup hooks with keys, a dog lead and a torch.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [W, H] = { panel: [1.3, 1.05], wide: [2.3, 1.2], tall: [0.95, 1.55] }[a.size];
    const y0 = a.setting === 'garage' ? 1.0 : a.setting === 'store' ? 0.42 : a.size === 'tall' ? 0.35 : 0.62;
    const [face, holeColour] = BOARD[a.board];
    const rust = new THREE.Color('#7b4a2a');
    const mats = new Map<string, THREE.Material>();
    const mat = (key: string) => {
      if (!mats.has(key)) {
        const c = new THREE.Color(PAINT[key]);
        if (key === 'steel') c.lerp(rust, mood.wear * 0.45);
        mats.set(key, s.material(c, key === 'steel' || key === 'brass' || key === 'copper' ? { metalness: 0.7, roughness: 0.35 + mood.wear * 0.3 } : { roughness: 0.6 }));
      }
      return mats.get(key)!;
    };

    // Choose and pack the tools: tallest first, in rows.
    const pool: Tool[] = a.trade === 'mixed'
      ? [...TRADES.carpentry, ...TRADES.garden, ...TRADES.plumbing, ...TRADES.mechanic].map((tool) => ({ tool, k: random() })).sort((p, q) => p.k - q.k).map((p) => p.tool)
      : [...TRADES[a.trade]];
    const margin = 0.07, gap = a.size === 'wide' ? 0.07 : 0.05;
    const topMargin = a.setting === 'store' || a.setting === 'school' ? 0.2 : 0.08;
    const usable = H - topMargin - 0.06;
    const fits = pool.filter((tool) => extent(tool).height <= usable);
    const sorted = a.trade === 'mechanic' ? fits : fits.map((tool) => ({ tool, k: extent(tool).height + random() * 0.12 })).sort((p, q) => q.k - p.k).map((p) => p.tool);
    const placed: { tool: Tool; x: number; y: number; n: number }[] = [];
    let rowTop = topMargin, rest = [...sorted], n = 1;
    while (rest.length && rowTop < H - 0.2) {
      let x = margin, rowH = 0;
      const next: Tool[] = [];
      for (const tool of rest) {
        const e = extent(tool), w = e.x1 - e.x0;
        if (x + w <= W - margin && rowTop + e.height <= H - 0.05 && (rowH === 0 || e.height <= rowH + 0.001)) {
          placed.push({ tool, x: x - e.x0 - W / 2, y: H - rowTop, n: n++ });
          x += w + gap;
          rowH = Math.max(rowH, e.height);
        } else next.push(tool);
      }
      if (rowH === 0) break;
      // Centre the row.
      const slack = (W - margin - (x - gap)) / 2;
      for (const item of placed) if (Math.abs(item.y - (H - rowTop)) < 1e-6) item.x += slack;
      rowTop += rowH + 0.07;
      rest = next;
    }
    const goneChance = [0, 0.12, 0.5, 0.88][Math.min(3, Math.floor(a.missing * 3.999))];
    const gone = placed.map(() => random() < goneChance);
    if (a.missing >= 0.25 && !gone.some(Boolean) && placed.length) gone[Math.floor(random() * placed.length)] = true;
    if (a.missing < 0.75 && gone.every(Boolean) && placed.length) gone[0] = false;

    // Board texture: holes, stains and the painted places.
    const scale = 512; // pixels per metre
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = face; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 30 * mood.wear; i++) {
      ctx.fillStyle = `rgba(40,25,10,${0.05 + random() * 0.08})`;
      ctx.beginPath(); ctx.ellipse(random() * canvas.width, random() * canvas.height, 20 + random() * 90, 15 + random() * 60, random() * 3, 0, 7); ctx.fill();
    }
    const trace = (part: Part, ox: number, oy: number) => {
      const px = (x: number) => (ox + x + W / 2) * scale, py = (y: number) => (H - (oy + y)) * scale;
      ctx.beginPath();
      if (part.k === 'poly') { part.pts.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y)))); ctx.closePath(); }
      else ctx.arc(px(part.c[0]), py(part.c[1]), part.r * scale, 0, Math.PI * 2);
    };
    if (a.outlines !== 'none') {
      ctx.lineJoin = 'round';
      for (const item of placed) for (const part of item.tool.parts) {
        trace(part, item.x, item.y);
        if (a.outlines === 'marker') { ctx.strokeStyle = a.board === 'charcoal' ? '#f2efe4' : '#141414'; ctx.lineWidth = 9; ctx.stroke(); }
        else {
          const colour = a.outlines === 'red' ? '#b3231c' : a.board === 'white' ? '#c9c5b6' : '#f3ead2';
          ctx.fillStyle = ctx.strokeStyle = colour; ctx.globalAlpha = a.outlines === 'white' ? 0.75 : 1; ctx.lineWidth = 12; ctx.stroke(); ctx.fill(); ctx.globalAlpha = 1;
        }
      }
      if (a.outlines === 'marker') for (const item of placed) for (const part of item.tool.parts) { trace(part, item.x, item.y); ctx.fillStyle = face; ctx.fill(); }
    }
    ctx.fillStyle = holeColour;
    const step = 0.0254 * 2 * scale;
    for (let x = step / 2; x < canvas.width; x += step) for (let y = step / 2; y < canvas.height; y += step) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill(); }
    if (a.setting === 'school') {
      ctx.fillStyle = a.board === 'charcoal' ? '#f2efe4' : '#141414'; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center';
      for (const item of placed) ctx.fillText(String(item.n), (item.x + W / 2) * scale, (H - item.y) * scale - 12);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const bz = 0;
    s.box([W, H, 0.012], [0, y0 + H / 2, bz - 0.006], [s.material('#6b4a2c'), s.material('#6b4a2c'), s.material('#6b4a2c'), s.material('#6b4a2c'), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 }), s.material('#6b4a2c')] as unknown as THREE.Material);
    const timber = s.material('#a5855a');
    const frameColour = a.setting === 'store' ? s.material('#c4352b', { roughness: 0.5 }) : timber;
    s.box([W + 0.08, 0.05, 0.05], [0, y0 + H + 0.025, bz - 0.01], frameColour);
    s.box([W + 0.08, 0.05, 0.05], [0, y0 - 0.025, bz - 0.01], frameColour);
    for (const x of [-1, 1]) s.box([0.05, y0 + H + 0.05, 0.06], [x * (W / 2 + 0.025), (y0 + H + 0.05) / 2, bz - 0.012], frameColour);

    // Hooks and tools.
    const hook = s.material('#d0d4d6', { metalness: 0.8, roughness: 0.3 });
    const hooks: { at: readonly [number, number, number]; size: number }[] = [];
    placed.forEach((item, index) => {
      const e = extent(item.tool);
      const span = e.x1 - e.x0;
      const hx = span > 0.2 ? [item.x + e.x0 + span * 0.25, item.x + e.x1 - span * 0.25] : [item.x - 0.012, item.x + 0.012];
      for (const x of hx) hooks.push({ at: [x, y0 + item.y - 0.012, bz + 0.03], size: 1 });
      if (a.setting === 'store') {
        s.box([0.05, 0.032, 0.002], [item.x + (e.x0 + e.x1) / 2, y0 + item.y - e.height - 0.028, bz + 0.004], s.material(mood.cheer > 0.4 ? '#f2d21f' : '#e8e2cc', { roughness: 0.8 }));
      }
      if (gone[index]) return;
      const group = new THREE.Group();
      group.position.set(item.x, y0 + item.y, bz + 0.012);
      // Hung a little crooked as things get worn and busy.
      group.rotation.z = (random() - 0.5) * mix(0.02, 0.22, Math.max(mood.wear, mood.energy * 0.6)) * (span > 0.2 ? 0.3 : 1);
      for (const part of item.tool.parts) {
        const shape = new THREE.Shape();
        if (part.k === 'poly') part.pts.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
        else {
          shape.absarc(part.c[0], part.c[1], part.r, 0, Math.PI * 2, false);
          if (part.hole) { const hole = new THREE.Path(); hole.absarc(part.c[0], part.c[1], part.hole, 0, Math.PI * 2, true); shape.holes.push(hole); }
        }
        const depth = part.d ?? 0.01;
        const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 14 }), mat(part.m));
        mesh.position.z = Math.max(0, 0.014 - depth / 2);
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
      }
      s.root.add(group);
    });
    s.scatter(new THREE.CylinderGeometry(0.004, 0.004, 0.06, 6).rotateX(Math.PI / 2), hook, hooks);

    // Setting.
    if (a.setting === 'garage') {
      const benchD = 0.6, top = 0.92;
      s.box([W + 0.2, 0.06, benchD], [0, top - 0.03, benchD / 2 - 0.04], s.material('#9a7448'));
      for (const x of [-1, 1]) for (const z of [0.02, benchD - 0.12]) s.box([0.08, top - 0.06, 0.08], [x * (W / 2 + 0.02), (top - 0.06) / 2, z], s.material('#6b4f33'));
      s.box([W + 0.1, 0.03, benchD - 0.12], [0, 0.22, benchD / 2 - 0.04], s.material('#6b4f33'));
      // Vise.
      const vx = W / 2 - 0.12, iron = s.material('#35506b', { metalness: 0.5, roughness: 0.5 });
      s.box([0.12, 0.1, 0.16], [vx, top + 0.05, benchD - 0.16], iron);
      s.box([0.14, 0.07, 0.03], [vx, top + 0.12, benchD - 0.1], iron);
      s.box([0.14, 0.07, 0.03], [vx, top + 0.12, benchD - 0.03], iron);
      s.rod([vx - 0.09, top + 0.04, benchD + 0.01], [vx + 0.09, top + 0.04, benchD + 0.01], 0.007, hook);
      // Jars of screws.
      const jars = 2 + Math.round(mood.density * 4);
      for (let i = 0; i < jars; i++) {
        const jx = -W / 2 + 0.1 + i * 0.12;
        s.cylinder(0.04, 0.04, 0.07, [jx, top + 0.035, 0.08], s.material(['#8f8f8a', '#a8823a', '#5d5148'][i % 3], { metalness: 0.5 }), 12);
        s.cylinder(0.045, 0.045, 0.1, [jx, top + 0.05, 0.08], new THREE.MeshPhysicalMaterial({ color: '#dff0ee', transparent: true, opacity: 0.25, depthWrite: false, roughness: 0.1 }), 12);
        s.cylinder(0.046, 0.046, 0.015, [jx, top + 0.107, 0.08], s.material(['#b3261e', '#d9b526', '#2d5d8f'][i % 3]), 12);
      }
      if (mood.density > 0.5) s.box([0.3, 0.2, 0.2], [0.15, 0.335, 0.3], s.material('#b3261e', { metalness: 0.3 }));
    } else if (a.setting === 'store') {
      s.box([W + 0.1, y0 - 0.05, 0.4], [0, (y0 - 0.05) / 2, 0.14], s.material('#d9d4c3'));
      s.box([W + 0.12, 0.03, 0.44], [0, y0 - 0.035, 0.15], frameColour);
      s.label({ carpentry: 'HAND TOOLS', garden: 'LAWN & GARDEN', plumbing: 'PLUMBING', mechanic: 'AUTOMOTIVE', mixed: 'TOOLS' }[a.trade], W * 0.75, 0.13, [0, y0 + H - 0.09, bz + 0.004], '#fff7da', '#c4352b');
      for (const x of [-1, 1]) s.box([0.3, 0.04, 0.3], [x * (W / 2 - 0.1), 0.02, 0.1], s.material('#3a3c3e'));
    } else {
      for (const x of [-1, 1]) {
        s.box([0.06, 0.05, 0.6], [x * (W / 2 + 0.025), 0.025, 0], timber);
        s.rod([x * (W / 2 + 0.025), 0.05, -0.28], [x * (W / 2 + 0.025), y0 + H * 0.5, -0.03], 0.02, timber);
      }
      if (a.setting === 'school') {
        s.label('RETURN ALL TOOLS', W * 0.7, 0.11, [0, y0 + H - 0.08, bz + 0.004], '#1b1b1b', '#f1ecd9');
        s.box([W + 0.08, 0.02, 0.12], [0, y0 - 0.05, 0.05], timber);
      }
    }

    // What else hangs there.
    const corner: [number, number] = [W / 2 - 0.12, y0 + H - topMargin - 0.02];
    if (a.left === 'note') {
      const target = placed.find((_item, index) => gone[index]) ?? placed[placed.length - 1];
      if (target) {
        const e = extent(target.tool);
        const note = s.label(mood.cheer > 0.5 ? 'BORROWED! -D' : 'WHERE IS IT?', 0.17, 0.09, [target.x + (e.x0 + e.x1) / 2, y0 + target.y - Math.min(e.height * 0.5, 0.2), bz + 0.006], '#2a2f6b', '#f4e87a');
        note.rotation.z = (random() - 0.5) * 0.3;
      }
    } else if (a.left === 'calendar') {
      const cx = a.setting === 'garage' ? W / 2 + 0.2 : corner[0];
      void cx;
      s.box([0.2, 0.26, 0.012], [corner[0], y0 + 0.2, bz + 0.012], s.material('#f1eee2'));
      s.box([0.2, 0.08, 0.014], [corner[0], y0 + 0.29, bz + 0.013], s.material('#b3261e'));
      s.label(String(1 + Math.floor(random() * 28)), 0.14, 0.13, [corner[0], y0 + 0.17, bz + 0.02], '#1b1b1b', '#f1eee2');
      s.rod([corner[0] + 0.1, y0 + 0.33, bz + 0.02], [corner[0] + 0.15, y0 + 0.1, bz + 0.02], 0.002, mat('twine'));
      s.rod([corner[0] + 0.15, y0 + 0.1, bz + 0.02], [corner[0] + 0.155, y0 + 0.0, bz + 0.02], 0.005, mat('yellow'));
    } else if (a.left === 'apron') {
      const ax = -W / 2 - 0.02, ay = y0 + H - 0.05;
      const cloth = s.material(mood.cheer > 0.5 ? '#2f5f8a' : '#6d6a55', { roughness: 1, side: THREE.DoubleSide });
      const apron = new THREE.Shape();
      apron.moveTo(-0.1, 0); apron.lineTo(0.1, 0); apron.lineTo(0.13, -0.25); apron.lineTo(0.22, -0.3); apron.lineTo(0.2, -0.8); apron.lineTo(-0.2, -0.78); apron.lineTo(-0.22, -0.3); apron.lineTo(-0.13, -0.25); apron.closePath();
      const mesh = s.mesh(new THREE.ExtrudeGeometry(apron, { depth: 0.015, bevelEnabled: false }), cloth, [ax + 0.12, ay - 0.1, bz + 0.04]);
      mesh.rotation.z = 0.06;
      s.box([0.2, 0.14, 0.006], [ax + 0.13, ay - 0.55, bz + 0.058], s.material(mood.cheer > 0.5 ? '#274f75' : '#5c5947', { roughness: 1 }));
      s.rod([ax + 0.05, ay - 0.1, bz + 0.045], [ax + 0.12, ay + 0.02, bz + 0.04], 0.006, cloth);
      s.rod([ax + 0.19, ay - 0.1, bz + 0.045], [ax + 0.12, ay + 0.02, bz + 0.04], 0.006, cloth);
    } else if (a.left === 'keys') {
      const ky = y0 + 0.14;
      s.box([0.5, 0.04, 0.015], [0, ky, bz + 0.008], timber);
      for (let i = 0; i < 5; i++) {
        const kx = -0.2 + i * 0.1;
        s.rod([kx, ky, bz + 0.01], [kx, ky - 0.01, bz + 0.04], 0.003, mat('brass'));
        if (i === 1) { s.ring(0.03, 0.004, [kx, ky - 0.04, bz + 0.04], mat('red')); s.rod([kx, ky - 0.07, bz + 0.04], [kx + 0.02, ky - 0.5, bz + 0.04], 0.007, mat('red')); }
        else if (i === 3) s.cylinder(0.02, 0.028, 0.16, [kx, ky - 0.1, bz + 0.04], mat('yellow'), 10);
        else { s.ring(0.018, 0.003, [kx, ky - 0.03, bz + 0.04], hook); s.box([0.014, 0.05, 0.003], [kx + 0.004, ky - 0.07, bz + 0.04], mat(i % 2 ? 'brass' : 'steel')).rotation.z = 0.2; s.box([0.012, 0.045, 0.003], [kx - 0.008, ky - 0.065, bz + 0.043], mat('brass')).rotation.z = -0.3; }
      }
    }
    return s.finish();
  },
});
