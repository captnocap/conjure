import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = readonly [number, number, number];

export default defineThing({
  questions: {
    distilling: choice('What is being distilled?', {
      gold: 'Molten yellow gold: a glowing amber liquor, a crucible of nuggets and a few coins.',
      cure: 'A cure: a gentle luminous green tonic, with bunches of herbs and a mortar.',
      poison: 'A poison: violent purple with acid-green fumes, and a skull kept beside it.',
      memory: 'A memory: silver-white light that drifts up out of the glass in slow floating motes.',
      blood: 'Something thick, dark and red, with a bowl and a knife on the bench.',
    }),
    outcome: choice('How is the experiment going right now?', {
      working: 'Mid-run: flame lit, alembic bubbling steadily, drops falling into the receiver.',
      success: 'It worked: the receiver is full and bright, and one finished vial stands apart, shining.',
      exploded: 'It exploded: the alembic is shards, the bench is scorched in a black star, the copper helm is on the floor.',
      boiledover: 'It boiled over: liquor floods the bench top and drips off the front edge into a puddle.',
      abandoned: 'Abandoned cold: no flame, dregs dried in the glass, cobwebs strung between the vessels.',
    }),
    burner: choice('What heats the alembic?', {
      brazier: 'An iron brazier bowl of glowing charcoal.',
      lamp: 'A squat brass spirit lamp with one tall flame.',
      candles: 'A huddle of mismatched candles, improvised.',
      eldritch: 'No fuel at all: a floating crystal wrapped in cold blue fire.',
    }),
    glassware: score('How much apparatus crowds the bench?', ['Just the alembic and a receiver', 'A working set with a retort and rack', 'A forest of glass covering every inch']),
    notes: choice('What has become of the notes?', {
      none: 'No notes: it is all in the alchemist\'s head.',
      stack: 'A neat squared stack under a paperweight.',
      scattered: 'Stained loose pages scattered across the bench and the floor.',
      pinned: 'Pages and a large diagram pinned up on a board behind the bench.',
    }),
    bench: choice('What kind of bench is it?', {
      trestle: 'A rough oak trestle table with a lower shelf of crocks.',
      stone: 'A thick stone slab on brick piers with firewood stacked beneath.',
      cabinet: 'An iron-bound apothecary cabinet full of little drawers.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 1.6, D = 0.62, top = 0.86;
    const hex = { gold: '#f5b62e', cure: '#57d39a', poison: '#8b3fd6', memory: '#dcebff', blood: '#8f1220' }[a.distilling];
    const dead = a.outcome === 'abandoned';
    const liquidHex = dead ? '#6a6658' : hex;
    const liquid = s.material(liquidHex, { roughness: 0.25, emissive: liquidHex, emissiveIntensity: dead ? 0 : mix(0.25, 0.7, mood.cheer) * (a.outcome === 'success' ? 1.6 : 1) * (a.distilling === 'blood' ? 0.4 : 1) });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#bfe0d6', transparent: true, opacity: 0.42, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const rim = s.material('#dcebe6', { roughness: 0.2 });
    const copper = s.material('#b9683a', { metalness: 0.7, roughness: 0.38 });
    const iron = s.material('#2e2c2b', { roughness: 0.7, metalness: 0.4 });
    const wood = s.material('#6a4a30');
    const darkWood = s.material('#45301f');
    const paperMat = (() => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#e9dcb8'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 3;
      for (let y = 26; y < 150; y += 17) { ctx.beginPath(); ctx.moveTo(22, y); for (let x = 22; x < 234 - random() * 60; x += 9) ctx.lineTo(x, y + (random() - 0.5) * 7); ctx.stroke(); }
      ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(128, 200, 34, 0, 7); ctx.moveTo(128, 162); ctx.lineTo(160, 220); ctx.lineTo(96, 220); ctx.closePath(); ctx.stroke();
      ctx.globalAlpha = 0.5; ctx.fillStyle = hex; ctx.beginPath(); ctx.arc(60 + random() * 140, 60 + random() * 120, 30 + random() * 30, 0, 7); ctx.fill();
      ctx.fillStyle = '#5a3a1a'; ctx.globalAlpha = 0.25 + mood.wear * 0.3; ctx.beginPath(); ctx.arc(190, 90, 36, 0, 7); ctx.fill();
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide });
    })();
    const page = (at: P3, tilt: P3, size = 0.2) => { const m = s.mesh(new THREE.PlaneGeometry(size * 0.75, size), paperMat, at); m.rotation.set(...tilt); return m; };

    // The bench itself.
    const topMat = (() => {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const stone = a.bench === 'stone';
      ctx.fillStyle = stone ? '#8f8c84' : '#7a5636'; ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = stone ? '#77746c' : '#553a22'; ctx.lineWidth = 2;
      for (let i = 0; i < 40; i++) { const y = random() * 256; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y + (random() - 0.5) * 14); ctx.stroke(); }
      if (!stone) { ctx.lineWidth = 4; for (const y of [64, 128, 192]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); } }
      for (let i = 0; i < 4 + mood.wear * 14; i++) {
        const x = random() * 512, y = random() * 256, r = 8 + random() * 26;
        if (random() < 0.5) { ctx.strokeStyle = '#1d1712'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); }
        else { ctx.globalAlpha = 0.55; ctx.fillStyle = random() < 0.5 ? hex : '#1d1712'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.4, r * 0.8, random() * 3, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.85 });
    })();
    s.box([W, 0.07, D], [0, top - 0.035, 0], topMat);
    if (a.bench === 'trestle') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([x * (W / 2 - 0.1), 0, z * (D / 2 - 0.05)], [x * (W / 2 - 0.16), top - 0.07, z * (D / 2 - 0.1)], 0.045, wood, 0.05);
      for (const x of [-1, 1]) s.box([0.06, 0.07, D - 0.16], [x * (W / 2 - 0.14), 0.3, 0], darkWood);
      s.box([W - 0.3, 0.035, D - 0.2], [0, 0.32, 0], wood);
      for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) {
        const x = -0.6 + i * 0.17 + random() * 0.04, h = 0.14 + random() * 0.14, r = 0.05 + random() * 0.035;
        s.lathe([[0, 0], [r * 0.8, 0], [r, h * 0.5], [r * 0.9, h * 0.85], [r * 0.55, h], [r * 0.6, h + 0.02], [0, h + 0.02]], s.material(['#8a7a5c', '#5d6b5a', '#7b4b36', '#4a4f5a', '#a39472'][i % 5]), [x, 0.3375, (random() - 0.5) * 0.2]);
      }
    } else if (a.bench === 'stone') {
      const brick = s.material('#8d5a44');
      for (const x of [-1, 1]) {
        s.box([0.3, top - 0.07, D * 0.9], [x * (W / 2 - 0.19), (top - 0.07) / 2, 0], brick);
        for (let j = 1; j < 7; j++) s.box([0.305, 0.012, D * 0.9 + 0.005], [x * (W / 2 - 0.19), j * (top - 0.07) / 7, 0], s.material('#b8ab98'));
      }
      for (let i = 0; i < 9; i++) { const row = i < 5 ? 0 : 1; const log = s.cylinder(0.055, 0.055, D * 0.75, [-0.28 + (i - row * 5) * 0.125 + row * 0.06, 0.055 + row * 0.1, 0], s.material(i % 2 ? '#7b5b3e' : '#6a4c33'), 10); log.rotation.x = Math.PI / 2; }
    } else {
      s.box([W * 0.94, top - 0.07, D * 0.9], [0, (top - 0.07) / 2, 0], darkWood);
      for (let c = 0; c < 5; c++) for (let r = 0; r < 3; r++) {
        const out = random() < 0.12 + mood.wear * 0.15 ? 0.07 : 0;
        s.box([0.25, 0.2, 0.03 + out], [-0.56 + c * 0.28, 0.16 + r * 0.24, D * 0.45 + 0.01 + out / 2], wood);
        s.ball([0.02, 0.02, 0.02], [-0.56 + c * 0.28, 0.16 + r * 0.24, D * 0.45 + 0.035 + out], copper, 8);
      }
      for (const x of [-1, 1]) s.box([0.04, top - 0.06, D * 0.9 + 0.02], [x * W * 0.44, (top - 0.07) / 2, 0], iron);
    }

    // Glass vocabulary.
    const arc = (r: number, from: number, to: number, n = 9) => Array.from({ length: n + 1 }, (_u, i) => { const t = mix(from, to, i / n); return [Math.max(Math.cos(t) * r, 0), Math.sin(t) * r] as const; });
    const flask = (at: P3, r: number, neck: number, fill: number, material: THREE.Material = liquid) => {
      const g = new THREE.Group(); g.position.set(at[0], at[1] + r, at[2]);
      const nr = r * 0.3;
      g.add(s.lathe([...arc(r, -Math.PI / 2, 1.2), [nr, r * 0.98], [nr, r + neck], [nr * 1.25, r + neck + 0.01]], glass));
      const lip = s.ring(nr * 1.2, 0.006, [0, r + neck + 0.008, 0], rim); lip.rotation.x = Math.PI / 2; g.add(lip);
      if (fill > 0.02) g.add(s.lathe([...arc(r * 0.93, -Math.PI / 2, -Math.PI / 2 + Math.PI * fill), [0, Math.sin(-Math.PI / 2 + Math.PI * fill) * r * 0.93]], material));
      s.root.add(g);
      return g;
    };
    const exploded = a.outcome === 'exploded';
    const ax = -0.42, az = -0.02;

    // Burner.
    const flames: THREE.Mesh[] = [];
    const lit = !dead && !exploded;
    const flameHex = a.burner === 'eldritch' ? '#58b8ff' : new THREE.Color().setHSL(mix(0.13, 0.05, mood.warmth), 1, 0.58).getStyle();
    const flame = (at: P3, h: number) => {
      if (!lit) return;
      const outer = s.mesh(new THREE.ConeGeometry(h * 0.3, h, 10), s.material(flameHex, { emissive: flameHex, emissiveIntensity: 1.6, roughness: 1 }), [at[0], at[1] + h / 2, at[2]]);
      s.mesh(new THREE.ConeGeometry(h * 0.14, h * 0.55, 8), s.material('#fff4c8', { emissive: '#fff0b0', emissiveIntensity: 2 }), [at[0], at[1] + h * 0.3, at[2]]);
      flames.push(outer);
    };
    if (a.burner === 'brazier') {
      s.lathe([[0, 0.03], [0.05, 0.03], [0.1, 0.09], [0.11, 0.1], [0.095, 0.1], [0.05, 0.05], [0, 0.05]], iron, [ax, top, az]);
      for (let i = 0; i < 3; i++) s.rod([ax + Math.cos(i * 2.1) * 0.06, top, az + Math.sin(i * 2.1) * 0.06], [ax + Math.cos(i * 2.1) * 0.05, top + 0.04, az + Math.sin(i * 2.1) * 0.05], 0.008, iron);
      for (let i = 0; i < 9; i++) s.ball([0.022, 0.018, 0.022], [ax + (random() - 0.5) * 0.12, top + 0.085 + random() * 0.015, az + (random() - 0.5) * 0.12], s.material(lit ? '#ff5a1e' : '#2a2422', { emissive: lit ? '#ff4a10' : '#000', emissiveIntensity: 1.2 }), 6);
      flame([ax, top + 0.09, az], 0.07);
    } else if (a.burner === 'lamp') {
      s.lathe([[0, 0], [0.06, 0], [0.07, 0.03], [0.045, 0.065], [0.015, 0.075], [0.015, 0.09], [0, 0.09]], s.material('#c9a04a', { metalness: 0.7, roughness: 0.35 }), [ax, top, az]);
      flame([ax, top + 0.09, az], 0.1);
    } else if (a.burner === 'candles') {
      for (let i = 0; i < 4; i++) { const h = 0.04 + random() * 0.08, x = ax + Math.cos(i * 1.6) * 0.045, z = az + Math.sin(i * 1.6) * 0.045; s.cylinder(0.016, 0.02, h, [x, top + h / 2, z], s.material('#e8dcb8'), 10); flame([x, top + h, z], 0.045); }
      s.cylinder(0.09, 0.1, 0.008, [ax, top + 0.004, az], s.material('#d8cca8'), 14);
    } else {
      const gem = s.mesh(new THREE.OctahedronGeometry(0.035), s.material('#bfe6ff', { emissive: lit ? '#58b8ff' : '#000', emissiveIntensity: 1.5, roughness: 0.1 }), [ax, top + 0.07, az]);
      gem.scale.y = 1.6; flame([ax, top + 0.1, az], 0.08);
      s.ring(0.07, 0.006, [ax, top + 0.004, az], s.material('#58b8ff', { emissive: lit ? '#58b8ff' : '#000', emissiveIntensity: 1 })).rotation.x = Math.PI / 2;
    }
    // Tripod and alembic.
    const cy = top + 0.24;
    s.ring(0.11, 0.01, [ax, cy, az], iron).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) { const t = i * 2.094 + 0.5; s.rod([ax + Math.cos(t) * 0.15, top, az + Math.sin(t) * 0.13], [ax + Math.cos(t) * 0.11, cy, az + Math.sin(t) * 0.11], 0.011, iron); }
    const coilX = 0.02, coilTop = top + 0.66, recX = 0.31;
    const bubbles: THREE.Mesh[] = [];
    if (!exploded) {
      flask([ax, cy - 0.045, az], 0.17, 0.03, dead ? 0.12 : a.outcome === 'success' ? 0.25 : 0.5);
      s.lathe([[0.045, 0], [0.085, 0.02], [0.095, 0.07], [0.07, 0.13], [0.03, 0.165], [0.012, 0.18], [0, 0.185]], copper, [ax, cy + 0.3, az]).scale.setScalar(1.3);
      s.tube([[ax + 0.08, cy + 0.44, az], [ax + 0.22, cy + 0.47, az], [coilX - 0.11, coilTop + 0.05, az], [coilX - 0.075, coilTop, az]], 0.022, copper);
      if (lit) for (let i = 0; i < 7; i++) bubbles.push(s.ball([0.012, 0.012, 0.012], [ax + (random() - 0.5) * 0.16, cy - 0.02 + random() * 0.14, az + (random() - 0.5) * 0.16], rim, 6));
    } else {
      const helm = s.lathe([[0.045, 0], [0.085, 0.02], [0.095, 0.07], [0.07, 0.13], [0.03, 0.165], [0, 0.185]], copper, [-0.35 + random() * 0.5, 0.12, D / 2 + 0.3]); helm.scale.setScalar(1.3);
      helm.rotation.set(1.4, 0, random() * 3);
      s.cylinder(0.42, 0.42, 0.004, [ax, top + 0.002, az], s.material('#141110', { roughness: 1 }), 9).scale.z = 0.62;
      for (let i = 0; i < 9; i++) { const t = i / 9 * 6.283 + random() * 0.3, len = 0.3 + random() * 0.3; const ray = s.box([len, 0.004, 0.035], [ax + Math.cos(t) * len * 0.6, top + 0.003, THREE.MathUtils.clamp(az + Math.sin(t) * len * 0.6, -D / 2 + 0.03, D / 2 - 0.03)], s.material('#191513', { roughness: 1 })); ray.rotation.y = -t; if (Math.abs(ray.position.x) > W / 2 - len / 2) ray.visible = false; }
      const shards = Array.from({ length: 46 }, () => { const t = random() * 6.283, d = 0.06 + random() ** 2 * 0.5; const x = ax + Math.cos(t) * d, z = az + Math.sin(t) * d * 0.9; const on = Math.abs(x) < W / 2 && Math.abs(z) < D / 2; return { at: [x, on ? top + 0.012 : 0.012, z] as P3, size: 0.014 + random() * 0.03 }; });
      s.scatter(new THREE.TetrahedronGeometry(1), s.material('#cfe8e0', { roughness: 0.1 }), shards);
      for (let i = 0; i < 6; i++) s.cylinder(0.03 + random() * 0.05, 0.03 + random() * 0.05, 0.006, [ax + (random() - 0.5) * 0.6, top + 0.004, az + (random() - 0.5) * 0.4], liquid, 9);
      for (let i = 0; i < 4; i++) s.ball([0.07 + random() * 0.06, 0.07 + random() * 0.06, 0.07 + random() * 0.06], [ax + (random() - 0.5) * 0.3, top + 0.35 + i * 0.16, az + (random() - 0.5) * 0.1], s.material('#3a3636', { transparent: true, opacity: 0.55, depthWrite: false }), 10);
    }
    // Coil condenser in its stand, and the receiver.
    const coil: P3[] = [];
    for (let i = 0; i <= 44; i++) { const t = i / 44; coil.push([coilX + Math.cos(t * 5 * 6.283 + Math.PI) * 0.075, coilTop - t * 0.32, az + Math.sin(t * 5 * 6.283 + Math.PI) * 0.075]); }
    coil.push([coilX + 0.14, top + 0.33, az], [recX - 0.01, top + 0.31, az]);
    s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil.map((p) => new THREE.Vector3(...p))), 180, 0.017, 6), copper);
    s.rod([coilX, top, az - 0.12], [coilX, coilTop + 0.08, az - 0.12], 0.014, iron);
    s.box([0.2, 0.02, 0.14], [coilX, top + 0.01, az - 0.08], iron);
    for (const y of [coilTop - 0.02, coilTop - 0.29]) s.rod([coilX, y, az - 0.12], [coilX, y, az - 0.06], 0.008, iron);
    flask([recX, top, az + 0.02], 0.11, 0.07, dead ? 0.06 : a.outcome === 'success' ? 0.8 : exploded ? 0.1 : 0.35);

    // Extra apparatus by how crowded the bench is.
    const crowd = a.glassware * 0.8 + mood.density * 0.2;
    if (crowd > 0.3) {
      // A retort on a ring stand.
      const rx = 0.58, rz = -0.12;
      s.box([0.16, 0.02, 0.12], [rx, top + 0.01, rz], iron); s.rod([rx - 0.05, top, rz - 0.03], [rx - 0.05, top + 0.42, rz - 0.03], 0.009, iron);
      s.ring(0.06, 0.006, [rx + 0.02, top + 0.2, rz + 0.02], iron).rotation.x = Math.PI / 2;
      const body = flask([rx + 0.02, top + 0.19, rz + 0.02], 0.075, 0, 0.4, s.material('#c9d27a', { emissive: '#c9d27a', emissiveIntensity: dead ? 0 : 0.2 }));
      body.rotation.z = 0.5;
      s.tube([[rx - 0.01, top + 0.33, rz + 0.02], [rx - 0.1, top + 0.36, rz + 0.04], [rx - 0.2, top + 0.2, rz + 0.1], [rx - 0.22, top + 0.08, rz + 0.12]], 0.014, glass);
      s.tube([[rx - 0.01, top + 0.33, rz + 0.02], [rx - 0.1, top + 0.36, rz + 0.04], [rx - 0.2, top + 0.2, rz + 0.1], [rx - 0.22, top + 0.08, rz + 0.12]], 0.004, rim);
      // Test-tube rack.
      const tx = -0.68, tz = 0.17;
      s.box([0.24, 0.015, 0.06], [tx, top + 0.1, tz], wood); s.box([0.24, 0.015, 0.06], [tx, top + 0.008, tz], wood);
      for (const x of [-0.11, 0.11]) s.box([0.015, 0.1, 0.06], [tx + x, top + 0.05, tz], wood);
      for (let i = 0; i < 5; i++) { const c = ['#e86a3a', '#57d39a', '#e8d24a', '#6aa8e8', hex][i]; s.cylinder(0.013, 0.013, 0.05 + random() * 0.05, [tx - 0.08 + i * 0.04, top + 0.05, tz], s.material(c, { emissive: c, emissiveIntensity: dead ? 0 : 0.3 }), 8); s.cylinder(0.015, 0.015, 0.14, [tx - 0.08 + i * 0.04, top + 0.085, tz], glass, 8); }
    }
    const extra = Math.round(Math.max(0, crowd - 0.45) * 14);
    for (let i = 0; i < extra; i++) {
      const x = -0.72 + (i / Math.max(extra - 1, 1)) * 1.44 + (random() - 0.5) * 0.08, z = -D / 2 + 0.07 + random() * 0.07;
      if (Math.abs(x - coilX) < 0.14 || Math.abs(x - ax) < 0.2) continue;
      const c = ['#e86a3a', '#6aa8e8', '#e8d24a', '#d86ab0', '#7ad0c8'][Math.floor(random() * 5)];
      const r = 0.035 + random() * 0.04;
      flask([x, top, z], r, 0.04 + random() * 0.16, 0.2 + random() * 0.6, s.material(c, { emissive: c, emissiveIntensity: dead ? 0 : 0.25, roughness: 0.3 }));
    }

    // What is being made leaves its own evidence on the right-hand end.
    const px = 0.56, pz = 0.17;
    if (a.distilling === 'gold') {
      const gold = s.material('#f0c040', { metalness: 0.85, roughness: 0.25, emissive: '#7a5200', emissiveIntensity: 0.4 });
      s.lathe([[0, 0], [0.04, 0], [0.06, 0.08], [0.05, 0.08], [0.035, 0.015], [0, 0.015]], s.material('#4a4440'), [px, top, pz]);
      for (let i = 0; i < 6; i++) s.mesh(new THREE.DodecahedronGeometry(0.014 + random() * 0.012), gold, [px + (random() - 0.5) * 0.06, top + 0.06 + random() * 0.03, pz + (random() - 0.5) * 0.06]);
      for (let i = 0; i < 5; i++) s.cylinder(0.022, 0.022, 0.006, [px + 0.12 + (random() - 0.5) * 0.02, top + 0.004 + i * 0.0065, pz + 0.02], gold, 12);
    } else if (a.distilling === 'cure') {
      s.lathe([[0, 0], [0.04, 0], [0.065, 0.07], [0.055, 0.07], [0.03, 0.02], [0, 0.02]], s.material('#b8b2a4'), [px, top, pz]);
      s.rod([px, top + 0.03, pz], [px + 0.07, top + 0.13, pz + 0.02], 0.012, s.material('#b8b2a4'), 0.016);
      for (let i = 0; i < 7; i++) { const leaf = s.ball([0.012, 0.004, 0.045], [px + 0.14 + (random() - 0.5) * 0.06, top + 0.01 + i * 0.004, pz - 0.02 + (random() - 0.5) * 0.04], s.material(i % 2 ? '#5a8a3e' : '#7aa64a'), 6); leaf.rotation.y = random() * 3; }
    } else if (a.distilling === 'poison') {
      const bone = s.material('#e4dcc4');
      s.ball([0.055, 0.05, 0.062], [px, top + 0.07, pz], bone, 14); s.box([0.06, 0.035, 0.05], [px, top + 0.022, pz + 0.022], bone);
      for (const x of [-1, 1]) s.ball([0.015, 0.017, 0.01], [px + x * 0.022, top + 0.065, pz + 0.056], s.material('#15110f'), 8);
      s.box([0.008, 0.016, 0.008], [px, top + 0.04, pz + 0.058], s.material('#15110f'));
      for (let i = 0; i < 5; i++) s.ball([0.03 + i * 0.012, 0.03 + i * 0.012, 0.03 + i * 0.012], [recX + (random() - 0.5) * 0.06, top + 0.28 + i * 0.07, az + (random() - 0.5) * 0.05], s.material('#9be04a', { emissive: '#9be04a', emissiveIntensity: 0.5, transparent: true, opacity: 0.4, depthWrite: false }), 10).visible = !dead;
    } else if (a.distilling === 'memory') {
      s.box([0.11, 0.14, 0.012], [px, top + 0.075, pz], s.material('#8a6a2a', { metalness: 0.5 })).rotation.x = -0.35;
      s.box([0.085, 0.11, 0.014], [px, top + 0.076, pz + 0.002], s.material('#d8cfc0')).rotation.x = -0.35;
      s.ball([0.02, 0.026, 0.006], [px, top + 0.09, pz + 0.004], s.material('#6a5a50'), 8);
    } else {
      s.lathe([[0, 0], [0.04, 0], [0.085, 0.045], [0.075, 0.045], [0.035, 0.012], [0, 0.012]], s.material('#6a5a4a'), [px, top, pz]);
      s.cylinder(0.068, 0.068, 0.004, [px, top + 0.036, pz], liquid, 14);
      s.box([0.02, 0.004, 0.13], [px + 0.14, top + 0.004, pz - 0.02], s.material('#c8ccd0', { metalness: 0.8, roughness: 0.25 })).rotation.y = 0.5;
      s.box([0.024, 0.014, 0.07], [px + 0.115, top + 0.008, pz - 0.105], darkWood).rotation.y = 0.5;
    }
    const motes: THREE.Mesh[] = [];
    if (a.distilling === 'memory' && !dead) for (let i = 0; i < 8; i++) motes.push(s.ball([0.016, 0.016, 0.016], [recX + (random() - 0.5) * 0.25, top + 0.3 + random() * 0.5, az + (random() - 0.5) * 0.2], s.material('#eef5ff', { emissive: '#dcebff', emissiveIntensity: 1.6, transparent: true, opacity: 0.85, depthWrite: false }), 8));

    if (a.outcome === 'success') {
      const vx = 0.1, vz = 0.22;
      s.cylinder(0.05, 0.06, 0.03, [vx, top + 0.015, vz], s.material('#5a1a2a'), 16);
      s.cylinder(0.03, 0.036, 0.09, [vx, top + 0.075, vz], s.material(hex, { emissive: hex, emissiveIntensity: 1.6, roughness: 0.2 }), 12);
      s.cylinder(0.012, 0.012, 0.03, [vx, top + 0.135, vz], rim, 10); s.cylinder(0.014, 0.012, 0.02, [vx, top + 0.158, vz], s.material('#a07a4a'), 8);
      for (let i = 0; i < 6; i++) { const t = i / 6 * 6.283; s.mesh(new THREE.OctahedronGeometry(0.018), s.material('#fff6d0', { emissive: '#fff0a0', emissiveIntensity: 2 }), [vx + Math.cos(t) * 0.07, top + 0.1 + Math.sin(t * 2) * 0.05 + 0.04, vz + Math.sin(t) * 0.05]); }
    }
    if (a.outcome === 'boiledover') {
      s.cylinder(0.3, 0.3, 0.006, [ax + 0.12, top + 0.004, 0.08], liquid, 16).scale.z = 0.65;
      s.cylinder(0.16, 0.16, 0.007, [ax - 0.1, top + 0.004, 0.16], liquid, 12);
      for (let i = 0; i < 7; i++) { const x = ax - 0.2 + i * 0.09 + random() * 0.03; s.rod([x, top - 0.07 - 0.05 - random() * 0.25, D / 2 + 0.004], [x, top + 0.004, D / 2 + 0.004], 0.006, liquid, 0.012); }
      s.box([0.6, 0.012, 0.012], [ax + 0.08, top - 0.002, D / 2], liquid);
      s.cylinder(0.24, 0.24, 0.006, [ax + 0.08, 0.004, D / 2 + 0.16], liquid, 14).scale.z = 0.6;
      s.ball([0.1, 0.05, 0.1], [ax, cy + 0.03, az + 0.09], liquid, 10);
    }
    if (dead) {
      const web = s.material('#e6e6e0', { roughness: 1 });
      const anchors: P3[] = [[ax, cy + 0.42, az], [coilX, coilTop + 0.08, az - 0.12], [recX, top + 0.29, az], [0.53, top + 0.42, -0.15], [ax - 0.25, top, az + 0.1]];
      for (let i = 0; i < anchors.length - 1; i++) for (let k = 0; k < 3; k++) { const from = anchors[i], to = anchors[(i + 1 + (k % 2)) % anchors.length]; s.tube([[from[0], from[1] - k * 0.07, from[2]], [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 - 0.08 - k * 0.04, (from[2] + to[2]) / 2], [to[0], to[1] - k * 0.05, to[2]]], 0.0025, web); }
    }

    // Notes.
    if (a.notes === 'stack') {
      for (let i = 0; i < 7; i++) page([-0.14, top + 0.004 + i * 0.004, 0.2], [-Math.PI / 2, 0, 0.1 + (random() - 0.5) * 0.08], 0.2);
      s.ball([0.03, 0.022, 0.03], [-0.14, top + 0.05, 0.2], s.material('#4a5a6a', { roughness: 0.2 }), 10);
    } else if (a.notes === 'scattered') {
      for (let i = 0; i < 9; i++) page([-0.7 + random() * 1.3, top + 0.004 + i * 0.002, 0.1 + random() * 0.17], [-Math.PI / 2, 0, random() * 6], 0.17 + random() * 0.05);
      for (let i = 0; i < 6; i++) page([-0.7 + random() * 1.4, 0.004 + i * 0.002, D / 2 + 0.08 + random() * 0.3], [-Math.PI / 2, 0, random() * 6], 0.2);
      page([0.35 + random() * 0.3, top - 0.09, D / 2 + 0.006], [0, 0, 0.1], 0.2);
    } else if (a.notes === 'pinned') {
      const bz = -D / 2 + 0.02, bh = 0.7;
      s.box([W * 0.9, bh, 0.025], [0, top + 0.5 + bh / 2 - 0.25, bz], darkWood);
      for (const x of [-1, 1]) s.box([0.05, top + 0.2, 0.04], [x * W * 0.4, (top + 0.2) / 2 + 0.05, bz - 0.03], wood);
      page([0.3, top + 0.62, bz + 0.016], [0, 0, 0.03], 0.5);
      for (let i = 0; i < 7; i++) page([-0.62 + i * 0.16 + (i > 3 ? 0.32 : 0), top + 0.42 + random() * 0.4, bz + 0.016 + i * 0.001], [0, 0, (random() - 0.5) * 0.4], 0.19);
    }

    const speed = mix(0.25, 1.6, mood.energy);
    return s.finish({
      update: (dt, time) => {
        for (const [i, f] of flames.entries()) { f.scale.y = 1 + Math.sin(time * 9 * speed + i * 2) * 0.18; f.scale.x = 1 + Math.sin(time * 13 * speed + i) * 0.1; }
        for (const b of bubbles) { b.position.y += dt * 0.07 * speed; if (b.position.y > cy + 0.13) b.position.y = cy - 0.03; }
        for (const [i, m] of motes.entries()) { m.position.y += dt * 0.05 * speed; m.position.x += Math.sin(time + i) * dt * 0.02; if (m.position.y > top + 0.85) m.position.y = top + 0.28; }
      },
    });
  },
});
