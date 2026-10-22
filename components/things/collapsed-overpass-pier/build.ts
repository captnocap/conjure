import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = [number, number, number];

export default defineThing({
  questions: {
    failure: choice('How did the overpass fail here?', {
      hanging: 'The deck snapped and one slab still hangs from the pier by its reinforcing bars, clear of the ground.',
      ramp: 'A long slab dropped at one end and now leans from the pier top to the ground like a ramp.',
      sheared: 'The column itself sheared: a stump stands, and its upper half and cap lie toppled beside it.',
      island: 'Both spans fell away and left the pier standing with a short piece of road balanced on top.',
    }),
    lives: choice('What lives on it now?', {
      birds: 'Birds: a row of them along the top edge, nests, and a flock wheeling round.',
      shelter: 'A person: a tarp shelter on the crown, reached by a rope ladder, with a lamp hung out.',
      vines: 'Vines, in long curtains from every edge.',
      nothing: 'Nothing but the tree and the wind.',
    }),
    tree: choice('What tree grows from the crown?', {
      birch: 'A slender white birch.',
      pine: 'A dark wind-bent pine.',
      broadleaf: 'A round full broadleaf, improbably healthy.',
      dead: 'A bare silver snag: it grew, and then the drought came.',
    }),
    pier: choice('What kind of pier was it?', {
      hammerhead: 'A single square shaft flaring into a wide hammerhead cap.',
      round: 'One fat round column under a crossbeam.',
      twin: 'Two round columns joined by a crossbeam.',
      wall: 'A broad flat blade of concrete, like a wall end-on.',
    }),
    paint: choice('What is painted on the concrete?', {
      none: 'Nothing: bare stained concrete.',
      tag: 'Old bright graffiti tags from before.',
      mural: 'A big simple mural of a sun and flowers, done afterwards.',
      tally: 'A survivor\'s tally of days in white strokes.',
      arrow: 'A tall arrow pointing up and the word WATER.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = Math.max(0.35, mood.wear);
    const HP = 7, CAPH = 1.2, CAPX = 5.4, CAPZ = 1.8, TOP = HP + CAPH;

    const paintConcrete = (graffiti: boolean) => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 512;
      const x = c.getContext('2d')!;
      x.fillStyle = '#a9a69c'; x.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 9; i++) { x.fillStyle = `rgba(70,66,60,${0.1 + random() * 0.08})`; x.fillRect(0, i * 58 + 4, 256, 3); }
      for (let i = 0; i < 10 + wear * 22; i++) { const sx = random() * 256, w = 4 + random() * 16, len = 80 + random() * 380; const g = x.createLinearGradient(0, 0, 0, len); g.addColorStop(0, `rgba(52,48,40,${0.18 + wear * 0.3})`); g.addColorStop(1, 'rgba(52,48,40,0)'); x.fillStyle = g; x.fillRect(sx, 0, w, len); }
      const moss = x.createLinearGradient(0, 512, 0, 512 - 90 - wear * 130); moss.addColorStop(0, 'rgba(84,110,58,0.85)'); moss.addColorStop(1, 'rgba(84,110,58,0)'); x.fillStyle = moss; x.fillRect(0, 0, 256, 512);
      if (graffiti && a.paint !== 'none') {
        x.save(); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineCap = 'round'; x.lineJoin = 'round';
        if (a.paint === 'tag') {
          const tags: [string, string, number, number, number][] = [['ZEK', '#e83a8a', 128, 400, 74], ['OK!', '#2fc0d8', 96, 318, 52], ['77', '#f2c81f', 180, 258, 44]];
          for (const [text, colour, tx, ty, size] of tags) { x.save(); x.translate(tx, ty); x.rotate(-0.12 + random() * 0.2); x.font = `bold ${size}px sans-serif`; x.lineWidth = 10; x.strokeStyle = '#171717'; x.strokeText(text, 0, 0); x.fillStyle = colour; x.fillText(text, 0, 0); x.restore(); }
        } else if (a.paint === 'mural') {
          x.fillStyle = '#f4c81e'; x.strokeStyle = '#f4c81e'; x.lineWidth = 9; x.beginPath(); x.arc(128, 250, 44, 0, 7); x.fill();
          for (let i = 0; i < 12; i++) { const t = i * 0.5236; x.beginPath(); x.moveTo(128 + Math.cos(t) * 58, 250 + Math.sin(t) * 58); x.lineTo(128 + Math.cos(t) * 82, 250 + Math.sin(t) * 82); x.stroke(); }
          ['#e8483a', '#f4f1e6', '#7c6fe0', '#e96aa8'].forEach((colour, i) => { const fx = 44 + i * 56, fy = 400 + (i % 2) * 22; x.strokeStyle = '#3f7a34'; x.lineWidth = 6; x.beginPath(); x.moveTo(fx, 500); x.lineTo(fx, fy); x.stroke(); x.fillStyle = colour; for (let k = 0; k < 6; k++) { x.beginPath(); x.arc(fx + Math.cos(k * 1.047) * 13, fy + Math.sin(k * 1.047) * 13, 9, 0, 7); x.fill(); } x.fillStyle = '#f4c81e'; x.beginPath(); x.arc(fx, fy, 7, 0, 7); x.fill(); });
        } else if (a.paint === 'tally') {
          x.strokeStyle = '#f1eee2'; x.lineWidth = 5;
          for (let i = 0; i < 46; i++) { const col = i % 5, grp = Math.floor(i / 5), gx = 30 + (grp % 4) * 54, gy = 300 + Math.floor(grp / 4) * 62; x.beginPath(); if (col === 4) { x.moveTo(gx - 6, gy + 40); x.lineTo(gx + 42, gy + 4); } else { x.moveTo(gx + col * 10, gy); x.lineTo(gx + col * 10 + 2, gy + 44); } x.stroke(); }
          x.fillStyle = '#f1eee2'; x.font = 'bold 34px sans-serif'; x.fillText('DAY 400', 128, 262);
        } else {
          x.strokeStyle = '#f1eee2'; x.fillStyle = '#f1eee2'; x.lineWidth = 20; x.beginPath(); x.moveTo(128, 420); x.lineTo(128, 210); x.moveTo(84, 262); x.lineTo(128, 204); x.lineTo(172, 262); x.stroke();
          x.font = 'bold 50px sans-serif'; x.fillText('WATER', 128, 462);
        }
        x.restore();
      }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
    };
    const shaftMat = paintConcrete(true), capMat = paintConcrete(false);
    const raw = s.material('#8f8b80', { roughness: 1, flatShading: true });
    const rebar = s.material('#8a4a2a', { roughness: 0.9, metalness: 0.3 });
    const asphalt = s.material('#3f4144', { roughness: 1 });
    const put = <T extends THREE.Object3D>(m: T, g: THREE.Object3D) => { g.add(m); return m; };

    const fingers = (g: THREE.Object3D, at: P, dir: P, n: number, spread: [number, number], len = 1) => {
      for (let i = 0; i < n; i++) {
        const o: P = [at[0] + (random() - 0.5) * spread[0], at[1], at[2] + (random() - 0.5) * spread[1]];
        const l = (0.5 + random() * 0.9) * len;
        const mid: P = [o[0] + dir[0] * l * 0.6 + (random() - 0.5) * 0.25, o[1] + dir[1] * l * 0.6 + (random() - 0.5) * 0.2, o[2] + dir[2] * l * 0.6 + (random() - 0.5) * 0.25];
        const tip: P = [mid[0] + dir[0] * l * 0.4 + (random() - 0.5) * 0.6, mid[1] + dir[1] * l * 0.4 - random() * 0.3, mid[2] + dir[2] * l * 0.4 + (random() - 0.5) * 0.6];
        put(s.rod(o, mid, 0.03, rebar), g); put(s.rod(mid, tip, 0.03, rebar), g);
      }
    };
    const chunkGeo = new THREE.DodecahedronGeometry(1, 0);
    const jag = (g: THREE.Object3D, at: P, n: number, spread: P, size: number) => { for (let i = 0; i < n; i++) { const m = put(s.mesh(chunkGeo, raw, [at[0] + (random() - 0.5) * spread[0], at[1] + (random() - 0.5) * spread[1], at[2] + (random() - 0.5) * spread[2]]), g); m.scale.set(size * (0.6 + random()), size * (0.5 + random() * 0.7), size * (0.6 + random())); m.rotation.set(random() * 6, random() * 6, 0); } };

    // Shaft between two heights, and the cap, each buildable into any group.
    const columns: [number, number][] = a.pier === 'twin' ? [[-1.7, 0.62], [1.7, 0.62]] : [[0, 0.95]];
    const shaft = (g: THREE.Object3D, y0: number, y1: number) => {
      const h = y1 - y0;
      const slice = shaftMat.clone(); slice.map = shaftMat.map!.clone(); slice.map.repeat.set(a.pier === 'wall' || a.pier === 'hammerhead' ? 1 : 2, h / HP); slice.map.offset.set(0, y0 / HP); slice.map.wrapS = THREE.RepeatWrapping; slice.map.needsUpdate = true;
      if (a.pier === 'hammerhead') put(s.box([1.7, h, 1.3], [0, (y0 + y1) / 2, 0], slice), g);
      else if (a.pier === 'wall') put(s.box([4.2, h, 1.0], [0, (y0 + y1) / 2, 0], slice), g);
      else for (const [x, r] of columns) put(s.cylinder(r, r, h, [x, (y0 + y1) / 2, 0], slice, 24), g).rotation.y = -Math.PI / 2;
    };
    const cap = (g: THREE.Object3D, y: number) => {
      if (a.pier === 'hammerhead') {
        const geo = new THREE.ExtrudeGeometry(new THREE.Shape([[-0.85, 0], [0.85, 0], [CAPX / 2, CAPH * 0.55], [CAPX / 2, CAPH], [-CAPX / 2, CAPH], [-CAPX / 2, CAPH * 0.55]].map(([u, v]) => new THREE.Vector2(u, v))), { depth: CAPZ, bevelEnabled: false });
        geo.translate(0, 0, -CAPZ / 2);
        put(s.mesh(geo, capMat, [0, y, 0]), g);
      } else if (a.pier === 'wall') put(s.box([4.5, CAPH, 1.2], [0, y + CAPH / 2, 0], capMat), g);
      else put(s.box([CAPX, CAPH, CAPZ], [0, y + CAPH / 2, 0], capMat), g);
    };
    const capHalf = a.pier === 'wall' ? 2.25 : CAPX / 2;

    // A length of deck: concrete, asphalt, lane paint, parapets, a scrap of guardrail.
    const makeSlab = (L: number) => {
      const g = new THREE.Group();
      put(s.box([5.2, 0.5, L], [0, -0.25, L / 2], capMat), g);
      put(s.box([4.5, 0.05, L - 0.06], [0, 0.025, L / 2], asphalt), g);
      const line = s.material('#e3dfcf', { roughness: 0.9 });
      for (let z = 0.5; z < L - 1; z += 2.4) put(s.box([0.14, 0.012, 1.3], [0, 0.056, z + 0.65], line), g);
      for (const sx of [-1, 1]) { put(s.box([0.12, 0.012, L - 0.2], [sx * 2.0, 0.056, L / 2], line), g); put(s.box([0.32, 0.75, L], [sx * 2.44, 0.375, L / 2], capMat), g); }
      const steel = s.material('#8d9494', { metalness: 0.5, roughness: 0.6 });
      for (let z = 0.6; z < L; z += 1.8) put(s.box([0.08, 0.5, 0.08], [2.2, 0.3, z], steel), g);
      put(s.box([0.05, 0.28, L * 0.8], [2.14, 0.45, L * 0.45], steel), g).rotation.y = 0.02;
      for (const z of [0, L]) { fingers(g, [0, -0.2, z], [0, 0, z === 0 ? -1 : 1], 9, [4.6, 0], 0.8); jag(g, [0, -0.2, z], 9, [5, 0.3, 0.3], 0.26); }
      // Weeds along the kerbs and in the cracks.
      for (let i = 0; i < 4 + wear * 6; i++) put(s.box([0.05 + random() * 0.1, 0.014, 0.6 + random() * 1.6], [(random() - 0.5) * 4, 0.057, random() * L], s.material('#22201e')), g).rotation.y = (random() - 0.5) * 1.6;
      return g;
    };

    // Assemble by failure.
    const ledges: [THREE.Vector3, THREE.Vector3][] = [];
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    let crown: P = [-1.2, TOP, 0];
    let lamp: THREE.MeshStandardMaterial | null = null;
    const rubbleAt: P[] = [[0, 0, 1.6], [0.8, 0, -1.5]];
    const slabs: { g: THREE.Group; L: number }[] = [];
    if (a.failure === 'sheared') {
      const BREAK = 3.1 + random() * 0.6;
      shaft(s.root, 0, BREAK);
      for (const [x, r] of columns) { const half: [number, number] = a.pier === 'hammerhead' ? [1.3, 0.9] : a.pier === 'wall' ? [3.6, 0.7] : [r * 1.3, r * 1.3]; fingers(s.root, [x, BREAK, 0], [0, 1, 0], a.pier === 'wall' ? 16 : 10, half, 1.2); jag(s.root, [x, BREAK, 0], 8, [half[0], 0.25, half[1]], 0.3); }
      const fallen = new THREE.Group();
      shaft(fallen, BREAK, HP); cap(fallen, HP);
      for (const [x] of columns) fingers(fallen, [x, BREAK, 0], [0, -1, 0], 8, [1.2, 0.8], 0.8);
      fallen.position.set(0.7, 1.55 - BREAK * 0.02, 1.9); fallen.rotation.order = 'YXZ'; fallen.rotation.set(1.72, 0.22, 0.05);
      fallen.children.forEach((child) => { child.position.y -= BREAK; });
      s.root.add(fallen);
      const g = makeSlab(5.5); g.position.set(-1.4, 0.75, -7.2); g.rotation.set(0.07, 0.3, -0.06); s.root.add(g); slabs.push({ g, L: 5.5 });
      crown = [columns[0][0], BREAK, 0];
      ledges.push([V(-capHalf * 0.5, BREAK, 0.4), V(capHalf * 0.5, BREAK, 0.4)]);
      rubbleAt.push([0.7, 0, 1.2], [1.5, 0, 3], [-1.4, 0, -4.6]);
    } else {
      shaft(s.root, 0, HP); cap(s.root, HP);
      ledges.push([V(-capHalf, TOP, CAPZ / 2 - 0.1), V(capHalf, TOP, CAPZ / 2 - 0.1)], [V(-capHalf, TOP, -CAPZ / 2 + 0.1), V(capHalf, TOP, -CAPZ / 2 + 0.1)]);
      if (a.failure === 'island') {
        const g = makeSlab(6.4); g.position.set(0, TOP + 0.5, -3.2); g.rotation.z = 0.02; s.root.add(g); slabs.push({ g, L: 6.4 });
        crown = [-1.3, TOP + 0.55, 0.4];
        // A lamp column still planted in the parapet, bowing.
        const pole = s.rod([-2.44, TOP + 1.2, -1.5], [-2.2, TOP + 5.6, -1.3], 0.07, s.material('#8d9494', { metalness: 0.5 }), 0.045);
        void pole; s.rod([-2.2, TOP + 5.6, -1.3], [-1.2, TOP + 5.75, -1.25], 0.04, s.material('#8d9494', { metalness: 0.5 })); s.box([0.5, 0.1, 0.22], [-1.0, TOP + 5.72, -1.25], s.material('#6f7474'));
      } else {
        const hang = a.failure === 'hanging';
        const L = hang ? 6 : 10.2;
        const g = makeSlab(L);
        const hingeY = TOP - (hang ? 0.15 : 0.05);
        g.position.set(hang ? 0.15 : -0.1, hingeY, CAPZ / 2 + (hang ? 0.35 : 0.05));
        g.rotation.x = hang ? 1.02 + random() * 0.12 : Math.asin((hingeY - 0.2) / L);
        g.rotation.z = hang ? 0.07 : -0.02;
        s.root.add(g); slabs.push({ g, L });
        if (hang) for (let i = 0; i < 7; i++) { const x = -2.2 + i * 0.72 + (random() - 0.5) * 0.3; s.rod([x, TOP - 0.2, CAPZ / 2 - 0.1], [x + 0.15 + (random() - 0.5) * 0.2, TOP - 0.55, CAPZ / 2 + 0.75], 0.035, rebar); }
        else rubbleAt.push([0, 0, 9.4], [1.5, 0, 9.8], [-1.6, 0, 9.2]);
        // The stub of the other span, still on the cap.
        const stub = makeSlab(1.6); stub.position.set(0, TOP + 0.5, -CAPZ / 2 - 0.5); s.root.add(stub); slabs.push({ g: stub, L: 1.6 });
        crown = [-1.3, TOP + 0.55, -0.6];
      }
    }
    s.root.updateMatrixWorld(true);
    for (const { g, L } of slabs) for (const sx of [-1, 1]) ledges.push([g.localToWorld(V(sx * 2.44, 0.75, 0.2)), g.localToWorld(V(sx * 2.44, 0.75, L - 0.2))]);
    const onLedge = () => { const [p, q2] = ledges[Math.floor(random() * ledges.length)]; return p.clone().lerp(q2, random()); };

    // Rubble and weeds at the foot.
    const rubbleN = Math.round(14 + mood.density * 14 + wear * 10);
    for (let i = 0; i < rubbleN; i++) { const c = rubbleAt[i % rubbleAt.length]; const size = 0.15 + random() * random() * 0.7; const m = s.mesh(chunkGeo, raw, [c[0] + (random() - 0.5) * 5, size * 0.35, c[2] + (random() - 0.5) * 3]); m.scale.set(size * (0.7 + random()), size * (0.4 + random() * 0.5), size * (0.7 + random())); m.rotation.y = random() * 6; }

    // Foliage.
    const leaves: { at: P; size: number; color: string }[] = [];
    const greens = mood.warmth > 0.75 ? ['#7f9a3a', '#b8962e', '#c97a2a', '#5f8f3e'] : ['#3f6a30', '#4d7a34', '#5f8f3e', '#79a04a'];
    const clump = (c: THREE.Vector3 | P, r: number, n: number, size: number, palette = greens) => { const v = Array.isArray(c) ? c : (c.toArray() as P); for (let i = 0; i < n; i++) { const u = random() * 6.28, w = Math.acos(2 * random() - 1), d = r * Math.cbrt(random()); leaves.push({ at: [v[0] + Math.sin(w) * Math.cos(u) * d, Math.max(0.05, v[1] + Math.cos(w) * d * 0.8), v[2] + Math.sin(w) * Math.sin(u) * d], size: size * (0.6 + random() * 0.8), color: palette[Math.floor(random() * palette.length)] }); } };
    for (let i = 0; i < rubbleN; i++) { const c = rubbleAt[i % rubbleAt.length]; clump([c[0] + (random() - 0.5) * 6, 0.2, c[2] + (random() - 0.5) * 4], 0.4, 5, 0.16); }
    for (const [p, q2] of ledges) for (let i = 0; i < 3 + wear * 4; i++) clump(p.clone().lerp(q2, random()), 0.3, 5, 0.14);

    // The tree in the crown, roots feeling down the concrete.
    const [tx, ty, tz] = crown;
    const barkHex = { birch: '#dcd8ca', pine: '#5a4334', broadleaf: '#5d4a38', dead: '#b9b5a8' }[a.tree];
    const bark = s.material(barkHex, { roughness: 1 });
    const th = { birch: 4.6, pine: 4.2, broadleaf: 3.8, dead: 3.6 }[a.tree] * mix(0.85, 1.15, random());
    const lean = a.tree === 'pine' ? 0.9 : (random() - 0.5) * 0.5;
    const trunkR = a.tree === 'broadleaf' ? 0.2 : a.tree === 'birch' ? 0.1 : 0.15;
    const at = (t: number): P => [tx + lean * t * t, ty + th * t, tz + 0.2 * Math.sin(t * 3)];
    for (let i = 0; i < 5; i++) s.rod(at(i / 5), at((i + 1) / 5), trunkR * (1 - i * 0.16), bark, trunkR * (1 - (i + 1) * 0.16));
    if (a.tree === 'birch') for (let i = 0; i < 7; i++) { const p = at(0.08 + i * 0.09); s.box([0.14, 0.03, 0.05], [p[0], p[1], p[2] + trunkR * 0.8], s.material('#2a2a28')); }
    for (let i = 0; i < 4; i++) { const t = i * 1.7 + random(); const out: P = [tx + Math.cos(t) * 0.7, ty - 0.02, tz + Math.sin(t) * 0.7]; s.rod([tx, ty + 0.25, tz], out, trunkR * 0.5, bark, trunkR * 0.3); s.rod(out, [out[0] + Math.cos(t) * 0.3, ty - 1 - random() * 1.6, out[2] + Math.sin(t) * 0.25], trunkR * 0.3, bark, 0.02); }
    if (a.tree === 'pine') {
      const dark = ['#2f4f34', '#3a5f3a', '#27452e'];
      for (let i = 0; i < 6; i++) { const t = 0.4 + i * 0.11, p = at(t), r = (1.5 - i * 0.2) * 0.9; for (let k = 0; k < 3; k++) { const ang = i * 1.3 + k * 2.1; const tip: P = [p[0] + Math.cos(ang) * r + 0.4, p[1] + 0.1, p[2] + Math.sin(ang) * r]; s.rod(p, tip, 0.04, bark, 0.015); clump([mix(p[0], tip[0], 0.7), tip[1] + 0.1, mix(p[2], tip[2], 0.7)], r * 0.42, 12, 0.2, dark); } }
    } else {
      const n = a.tree === 'broadleaf' ? 8 : 6;
      for (let i = 0; i < n; i++) {
        const t = 0.45 + (i / n) * 0.5, p = at(t), ang = i * 2.4 + random(), len = th * (a.tree === 'broadleaf' ? 0.38 : 0.26) * (1.1 - t * 0.5);
        const tip: P = [p[0] + Math.cos(ang) * len, p[1] + len * (a.tree === 'birch' ? 0.3 : 0.65), p[2] + Math.sin(ang) * len];
        s.rod(p, tip, trunkR * 0.4, bark, trunkR * 0.12);
        if (a.tree === 'dead') { for (let k = 0; k < 2; k++) s.rod(tip, [tip[0] + (random() - 0.5) * 0.9, tip[1] + 0.2 + random() * 0.6, tip[2] + (random() - 0.5) * 0.9], trunkR * 0.12, bark, 0.01); }
        else if (a.tree === 'birch') { clump(tip, 0.5, 16, 0.14, mood.warmth > 0.6 ? ['#d8b83a', '#c9c24a', '#9aa84a'] : ['#7fa84a', '#8fb856', '#6a9a44']); clump([tip[0], tip[1] - 0.5, tip[2]], 0.35, 8, 0.12, ['#8fb856', '#a8c060']); }
        else clump(tip, 0.75, 26, 0.24);
      }
      if (a.tree !== 'dead') clump(at(1), a.tree === 'broadleaf' ? 0.9 : 0.5, a.tree === 'broadleaf' ? 34 : 14, a.tree === 'broadleaf' ? 0.24 : 0.14, a.tree === 'birch' ? ['#7fa84a', '#8fb856', '#d8b83a'] : greens);
    }

    // What lives here.
    const flock = new THREE.Group();
    if (a.lives === 'vines') {
      const stem = s.material('#4a4530', { roughness: 1 });
      for (let i = 0; i < 26 + Math.round(wear * 14); i++) {
        const p = onLedge(); const drop = Math.min(p.y - 0.1, 1 + random() * 4.5);
        if (drop < 0.4) continue;
        s.rod(p.toArray() as P, [p.x + (random() - 0.5) * 0.3, p.y - drop, p.z], 0.02, stem, 0.008);
        const n = Math.ceil(drop / 0.35);
        for (let k = 0; k <= n; k++) clump([p.x, p.y - (drop * k) / n, p.z], 0.22, 4, 0.14);
      }
    } else if (a.lives === 'birds') {
      const dark = s.material('#24242a', { roughness: 0.7 }), paleB = s.material('#d9d6cc', { roughness: 0.7 });
      const bodyGeo = new THREE.SphereGeometry(1, 8, 6);
      const perched: { at: P; size: number; color: string }[] = [], heads: { at: P; size: number; color: string }[] = [];
      for (let i = 0; i < 12 + Math.round(mood.density * 12); i++) { const p = onLedge(); const colour = random() < 0.3 ? '#d9d6cc' : '#24242a'; perched.push({ at: [p.x, p.y + 0.13, p.z], size: 0.13, color: colour }); heads.push({ at: [p.x + 0.08, p.y + 0.26, p.z + 0.06], size: 0.07, color: colour }); }
      s.scatter(bodyGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), perched); s.scatter(bodyGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), heads);
      const twig = s.material('#6a5238', { roughness: 1 });
      for (let i = 0; i < 2; i++) { const p = onLedge(); s.cylinder(0.45, 0.3, 0.28, [p.x, p.y + 0.14, p.z], twig, 9); for (let k = 0; k < 10; k++) { const t = random() * 6.28; s.rod([p.x + Math.cos(t) * 0.2, p.y + 0.2, p.z + Math.sin(t) * 0.2], [p.x + Math.cos(t + 0.9) * 0.62, p.y + 0.12 + random() * 0.25, p.z + Math.sin(t + 0.9) * 0.62], 0.014, twig); } }
      const wingGeo = new THREE.BufferGeometry(); wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, 0, 0, -0.12, 0.5, 0.12, -0.05, 0, 0, 0.12, -0.5, 0.12, -0.05, 0, 0, -0.12], 3)); wingGeo.computeVertexNormals();
      for (let i = 0; i < 7 + Math.round(mood.energy * 8); i++) { const r = 3 + random() * 3.5, t = random() * 6.28; const b = new THREE.Mesh(wingGeo, random() < 0.3 ? paleB : dark); (b.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide; b.position.set(Math.cos(t) * r, (random() - 0.5) * 2.5, Math.sin(t) * r); b.rotation.y = -t; b.rotation.z = (random() - 0.5) * 0.6; b.scale.setScalar(0.8 + random() * 0.6); b.castShadow = true; flock.add(b); }
      flock.position.set(crown[0] + 1, crown[1] + 2.5, crown[2]);
      s.root.add(flock);
    } else if (a.lives === 'shelter') {
      const [cx, cy, cz] = [crown[0] + 2.6, crown[1], crown[2] + 0.1];
      const wood = s.material('#9a7b52', { roughness: 1 });
      s.box([2.2, 0.12, 1.5], [cx, cy + 0.06, cz], wood);
      for (let i = 0; i < 6; i++) s.box([0.3, 0.02, 1.5], [cx - 0.9 + i * 0.36, cy + 0.13, cz], s.material('#8a6c46', { roughness: 1 }));
      const tarp = new THREE.MeshStandardMaterial({ color: new THREE.Color(mood.cheer > 0.5 ? '#d9742a' : '#2f6fb0').lerp(new THREE.Color('#a9a89a'), wear * 0.3), roughness: 0.8, side: THREE.DoubleSide });
      for (const sz of [-1, 1]) { const sheet = s.box([2.1, 0.02, 1.25], [cx, cy + 0.68, cz + sz * 0.42], tarp); sheet.rotation.x = sz * 1.0; }
      s.rod([cx - 1.1, cy + 1.2, cz], [cx + 1.1, cy + 1.2, cz], 0.03, wood);
      for (const dx of [-1.05, 1.05]) s.rod([cx + dx, cy + 0.1, cz], [cx + dx, cy + 1.2, cz], 0.03, wood);
      s.box([0.5, 0.25, 0.5], [cx + 0.2, cy + 0.26, cz], s.material('#5f6b4a', { roughness: 1 }));
      lamp = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffae3a', emissiveIntensity: mix(1.4, 3, mood.warmth) });
      s.rod([cx + 1.1, cy + 1.2, cz], [cx + 1.5, cy + 1.3, cz + 0.5], 0.02, wood);
      s.cylinder(0.08, 0.1, 0.2, [cx + 1.5, cy + 1.05, cz + 0.5], lamp, 10); s.cylinder(0.11, 0.11, 0.05, [cx + 1.5, cy + 0.93, cz + 0.5], s.material('#30332f'), 10); s.rod([cx + 1.5, cy + 1.3, cz + 0.5], [cx + 1.5, cy + 1.15, cz + 0.5], 0.006, s.material('#30332f'));
      // Rope ladder down the end of the cap.
      const lx = a.failure === 'sheared' ? cx + 0.6 : capHalf + 0.12, lz = cz + (a.failure === 'sheared' ? 1.1 : 0.2), ltop = cy + 0.1;
      const rope = s.material('#d9c27a', { roughness: 1 });
      for (const dz of [-0.2, 0.2]) s.rod([lx, ltop, lz + dz], [lx + 0.1, 0.3, lz + dz], 0.02, rope);
      for (let y = ltop - 0.3; y > 0.4; y -= 0.42) s.rod([lx + 0.1 * (1 - y / ltop), y, lz - 0.24], [lx + 0.1 * (1 - y / ltop), y, lz + 0.24], 0.022, wood);
      s.rod([cx, cy + 0.1, cz], [lx, ltop, lz], 0.02, rope);
      // Washing on a line to the tree.
      const lineFrom: P = [cx - 1.05, cy + 1.15, cz], lineTo = at(0.4);
      s.rod(lineFrom, lineTo, 0.006, rope);
      ['#d9d2c0', '#b84a3a', '#3f5f8a'].forEach((colour, i) => { const t = 0.25 + i * 0.22; s.box([0.34, 0.4, 0.015], [mix(lineFrom[0], lineTo[0], t), mix(lineFrom[1], lineTo[1], t) - 0.21, mix(lineFrom[2], lineTo[2], t)], s.material(colour, { roughness: 1 })); });
    }

    const leafMesh = leaves.length ? s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }), leaves) : null;
    // The road ran left to right: turn the whole ruin so the fallen span lies beside the pier, not in front of it.
    s.root.rotation.y = 1.1;
    const speed = mix(0.1, 0.6, mood.energy), sway = mix(0.001, 0.006, mood.energy);
    return s.finish({
      footprint: 4.5,
      update: (dt, time) => {
        flock.rotation.y += dt * speed;
        if (leafMesh) leafMesh.rotation.z = Math.sin(time * 0.8) * sway;
        if (lamp) lamp.emissiveIntensity = mix(1.4, 3, mood.warmth) * (0.9 + 0.1 * Math.sin(time * 8));
      },
    });
  },
});
