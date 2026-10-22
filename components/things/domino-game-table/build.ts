import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type V3 = [number, number, number];
const PIPS: [number, number][][] = [[], [[0, 0]], [[-1, -1], [1, 1]], [[-1, -1], [0, 0], [1, 1]], [[-1, -1], [1, -1], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]];
const PIP_TINT = ['#000', '#1f6fd0', '#2f9a4a', '#d0282c', '#7a3fb0', '#e08a1e', '#16a0a0'];

export default defineThing({
  questions: {
    game: choice('What state is the game in?', {
      fresh: 'Just started: the double six is down and every hand is still full.',
      middle: 'Well under way: a snake of tiles bends across the table and the hands are thinning.',
      locked: 'Locked: the long chain is blocked at both ends and the leftover tiles are turned up to be counted.',
      slammed: 'Slammed: someone smacked the winning tile down and the rest jumped, scattered and fell to the floor.',
      shuffle: 'Between hands: all the tiles are face down in a swirl in the middle, being washed.',
    }),
    table: choice('What kind of table is it?', {
      card: 'A folding card table with a dark vinyl top and thin metal legs.',
      domino: 'A proper wooden domino table with a raised lip, a tile rack on each side and cup holders in the corners.',
      plastic: 'A white plastic patio table.',
      makeshift: 'A square of plywood balanced on stacked milk crates.',
      park: 'A concrete park table on a single pedestal, built to outlast everyone.',
    }),
    seats: choice('What are the four seats?', {
      mismatched: 'Four different ones: whatever was to hand.',
      folding: 'Metal folding chairs from a church hall or social club.',
      plastic: 'White plastic stacking chairs.',
      crates: 'Upturned milk crates and buckets.',
      wooden: 'Old wooden kitchen chairs.',
    }),
    chair: choice('How have the chairs been left?', {
      tucked: 'All four pulled in close, players hunched over the game.',
      pushed: 'One pushed well back from the table, turned half away.',
      tipped: 'One tipped over backwards on the ground.',
      cane: 'One with a flat cap on the seat and a walking stick hooked on the table edge.',
    }),
    drinks: choice('What are they drinking?', {
      coffee: 'Tiny cups of sweet black coffee and a flask.',
      beer: 'Green beer bottles sweating at each corner.',
      rum: 'A bottle of rum in the middle of things and short glasses.',
      tea: 'Tulip glasses of tea on little saucers.',
      soda: 'Cans of soda.',
      none: 'Nothing: this is serious.',
    }),
    tiles: choice('What are the dominoes like?', {
      ivory: 'Ivory white with black pips, yellowed with handling.',
      black: 'Black with white pips.',
      colour: 'White with pips in a different bright colour for each number.',
    }),
    stakes: choice('What is being played for?', {
      nothing: 'Honour only: just the scorepad and a pencil.',
      coins: 'A little heap of coins.',
      bills: 'Folded banknotes under a tile.',
      matches: 'Matchsticks counted out in piles.',
    }),
    radio: noul('Is a small radio playing beside the table?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rust = (tint: string) => new THREE.Color(tint).lerp(new THREE.Color('#7a4a2c'), mood.wear * 0.4);
    const steel = s.material(rust('#8f9496'), { metalness: 0.7, roughness: 0.45 });
    const dark = s.material('#1c1c1d', { roughness: 0.5 });
    const T = 0.82;
    let top = 0.73;

    // Table.
    if (a.table === 'card') {
      s.box([T, 0.025, T], [0, top - 0.0125, 0], s.material('#2a3a34', { roughness: 0.7 }));
      for (const [w, d, x, z] of [[T + 0.02, 0.02, 0, T / 2], [T + 0.02, 0.02, 0, -T / 2], [0.02, T + 0.02, T / 2, 0], [0.02, T + 0.02, -T / 2, 0]] as const) s.box([w, 0.035, d], [x, top - 0.015, z], steel);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        s.rod([sx * (T / 2 - 0.04), top - 0.03, sz * (T / 2 - 0.04)], [sx * (T / 2 - 0.02), 0, sz * (T / 2 - 0.02)], 0.011, steel);
        s.rod([sx * (T / 2 - 0.04), top - 0.25, sz * (T / 2 - 0.04)], [sx * (T / 2 - 0.3), top - 0.04, sz * (T / 2 - 0.04)], 0.005, steel);
      }
    } else if (a.table === 'domino') {
      const wood = s.material('#8a5a30', { roughness: 0.55 }), lip = s.material('#5a3518', { roughness: 0.5 });
      s.box([T, 0.03, T], [0, top - 0.015, 0], wood);
      s.box([T - 0.2, 0.002, T - 0.2], [0, top + 0.001, 0], s.material('#2f6a4a', { roughness: 0.95 }));
      for (const [w, d, x, z] of [[T + 0.04, 0.03, 0, T / 2], [T + 0.04, 0.03, 0, -T / 2], [0.03, T + 0.04, T / 2, 0], [0.03, T + 0.04, -T / 2, 0]] as const) s.box([w, 0.06, d], [x, top, z], lip);
      for (let k = 0; k < 4; k++) {
        const rack = s.box([0.36, 0.012, 0.03], [0, top + 0.006, T / 2 - 0.06], lip);
        rack.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), k * Math.PI / 2); rack.rotation.y = k * Math.PI / 2;
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        s.cylinder(0.04, 0.04, 0.004, [sx * (T / 2 - 0.07), top + 0.002, sz * (T / 2 - 0.07)], dark, 16);
        s.box([0.055, top - 0.03, 0.055], [sx * (T / 2 - 0.05), (top - 0.03) / 2, sz * (T / 2 - 0.05)], lip);
      }
      s.box([T - 0.1, 0.07, T - 0.1], [0, top - 0.065, 0], lip);
    } else if (a.table === 'plastic') {
      const white = s.material('#eeece4', { roughness: 0.45 });
      s.box([T, 0.03, T], [0, top - 0.015, 0], white);
      s.box([T - 0.08, 0.05, T - 0.08], [0, top - 0.05, 0], white);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.rod([sx * (T / 2 - 0.08), top - 0.04, sz * (T / 2 - 0.08)], [sx * (T / 2 - 0.03), 0, sz * (T / 2 - 0.03)], 0.03, white, 0.022);
    } else if (a.table === 'makeshift') {
      top = 0.68;
      s.box([T + 0.06, 0.02, T], [0, top - 0.01, 0], s.material('#c9a56a', { roughness: 0.85 })).rotation.y = (random() - 0.5) * 0.15;
      for (let i = 0; i < 2; i++) {
        const tint = ['#c8262c', '#2f6fc0', '#2f8a4a', '#1c1c1d'][Math.floor(random() * 4)];
        const y = 0.165 + i * 0.33, turn = (random() - 0.5) * 0.4;
        const crate = s.box([0.36, 0.3, 0.36], [0, y, 0], s.material(tint, { roughness: 0.6 }));
        crate.rotation.y = turn;
        for (const h of [-0.07, 0.05]) s.box([0.37, 0.03, 0.37], [0, y + h, 0], s.material(new THREE.Color(tint).multiplyScalar(0.5), { roughness: 0.6 })).rotation.y = turn;
      }
    } else {
      const stone = s.material('#b3b0a6', { roughness: 0.95 });
      s.box([T, 0.07, T], [0, top - 0.035, 0], stone);
      s.cylinder(0.11, 0.15, top - 0.07, [0, (top - 0.07) / 2, 0], stone, 8);
      s.box([0.5, 0.05, 0.5], [0, 0.025, 0], stone);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.box([0.09, 0.002, 0.09], [sx * (T / 2 - 0.07), top + 0.001, sz * (T / 2 - 0.07)], s.material('#8d8a80', { roughness: 1 }));
    }

    if ((a.table === 'plastic' || a.table === 'park') && a.tiles !== 'black') {
      // A cloth so pale tiles do not vanish on a pale top.
      s.box([T - 0.12, 0.004, T - 0.12], [0, top + 0.002, 0], s.material(a.table === 'plastic' ? ['#2f5f8a', '#2f6a4a', '#8a2a2a'][Math.floor(random() * 3)] : '#6f6c64', { roughness: 0.95 })).rotation.y = a.table === 'plastic' ? (random() - 0.5) * 0.12 : 0;
      top += 0.004;
    }
    // Dominoes: instanced boxes, bucketed by which pip face they wear.
    const face = a.tiles === 'black' ? '#1b1b1c' : a.tiles === 'ivory' ? '#efe6c8' : '#f6f4ec';
    const pip = a.tiles === 'black' ? '#f2f0e6' : '#141414';
    const FACES = 8;
    const faceMats = Array.from({ length: FACES }, (_u, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = 48; canvas.height = 96;
      const c = canvas.getContext('2d')!;
      c.fillStyle = face; c.fillRect(0, 0, 48, 96);
      c.fillStyle = pip; c.fillRect(5, 46, 38, 4);
      const halves = index === 0 ? [6, 6] : [Math.floor(random() * 7), Math.floor(random() * 7)];
      halves.forEach((count, half) => {
        c.fillStyle = a.tiles === 'colour' ? PIP_TINT[count] : pip;
        for (const [px, py] of PIPS[count]) { c.beginPath(); c.arc(24 + px * 13, 24 + half * 48 + py * 13, 5.2, 0, 6.3); c.fill(); }
      });
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.35 });
    });
    const plain = new THREE.MeshStandardMaterial({ color: face, roughness: 0.35 });
    const back = new THREE.MeshStandardMaterial({ color: a.tiles === 'colour' ? '#c8262c' : face, roughness: 0.35 });
    const TL = 0.074, TW = 0.037, TH = 0.014;
    const tileGeo = new THREE.BoxGeometry(TW, TH, TL);
    const buckets: THREE.Matrix4[][] = Array.from({ length: FACES }, () => []);
    const one = new THREE.Vector3(1, 1, 1);
    const push = (at: V3, q: THREE.Quaternion, which = 1 + Math.floor(random() * (FACES - 1))) => buckets[which].push(new THREE.Matrix4().compose(new THREE.Vector3(...at), q, one));
    const Y = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
    const flat = (x: number, z: number, turn: number, up = true, y = top + TH / 2, which?: number) => {
      const q = new THREE.Quaternion().setFromAxisAngle(Y, turn);
      if (!up) q.multiply(new THREE.Quaternion().setFromAxisAngle(Z, Math.PI));
      push([x, y, z], q, which);
    };
    const standing = (k: number, along: number, out: number, lean = 0) => {
      const turn = k * Math.PI / 2;
      const q = new THREE.Quaternion().setFromAxisAngle(Y, turn)
        .multiply(new THREE.Quaternion().setFromAxisAngle(X, -Math.PI / 2 + lean))
        .multiply(new THREE.Quaternion().setFromAxisAngle(Y, Math.PI / 2));
      const p = new THREE.Vector3(along, top + TW / 2, out).applyAxisAngle(Y, turn);
      push([p.x, p.y, p.z], q);
    };

    // The chain follows a rectilinear path that doubles back before the table edge.
    const path: [number, number][] = [[0.12, -0.17], [-0.2, -0.17], [-0.2, 0.01], [0.2, 0.01], [0.2, 0.18], [-0.12, 0.18]];
    const lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
    const total = lengths.reduce((sum, l) => sum + l, 0);
    const along = (d: number) => {
      let i = 0;
      while (i < lengths.length - 1 && d > lengths[i]) d -= lengths[i++];
      const t = Math.min(1, Math.max(0, d / lengths[i])), p = path[i], q = path[i + 1];
      return { x: p[0] + (q[0] - p[0]) * t, z: p[1] + (q[1] - p[1]) * t, turn: Math.abs(q[0] - p[0]) > 0.01 ? Math.PI / 2 : 0 };
    };
    const chain = { fresh: 2, middle: 8 + Math.floor(random() * 4), locked: 17 + Math.floor(random() * 3), slammed: 11 + Math.floor(random() * 5), shuffle: 0 }[a.game];
    const mess = a.game === 'slammed' ? 1 : mix(0.05, 0.25, mood.energy);
    const start = total * 0.52 - (chain * (TL + 0.003)) / 2;
    for (let i = 0; i < chain; i++) {
      const p = along(start + (i + 0.5) * (TL + 0.003));
      const double = i === 0 || random() < 0.12;
      const jx = (random() - 0.5) * 0.012 * mess * (a.game === 'slammed' ? 9 : 1), jz = (random() - 0.5) * 0.012 * mess * (a.game === 'slammed' ? 9 : 1);
      flat(p.x + jx, p.z + jz, p.turn + (double && i !== 0 ? Math.PI / 2 : 0) + (random() - 0.5) * mess * (a.game === 'slammed' ? 2.4 : 0.25), true, top + TH / 2, i === 0 && a.game === 'fresh' ? 0 : undefined);
    }
    const hand = { fresh: 7, middle: 4, locked: 2, slammed: 3, shuffle: 0 }[a.game];
    const edge = T / 2 - (a.table === 'domino' ? 0.075 : 0.1);
    for (let k = 0; k < 4; k++) {
      const n = Math.max(0, hand + (a.game === 'fresh' ? (k === 0 ? -1 : 0) : Math.floor(random() * 3) - 1) - (a.game === 'slammed' && k === 0 ? 9 : 0));
      for (let i = 0; i < n; i++) {
        const u = (i - (n - 1) / 2) * (TL + 0.005);
        if (a.game === 'locked' || (a.game === 'slammed' && random() < 0.6)) {
          const p = new THREE.Vector3(u * 0.6 + (random() - 0.5) * 0.02, 0, edge - 0.03 + (random() - 0.5) * 0.03).applyAxisAngle(Y, k * Math.PI / 2);
          flat(p.x, p.z, k * Math.PI / 2 + (random() - 0.5) * (a.game === 'slammed' ? 2 : 0.3));
        } else standing(k, u, edge, a.table === 'domino' ? 0.25 : (random() - 0.5) * 0.06);
      }
    }
    if (a.game === 'shuffle') for (let i = 0; i < 28; i++) {
      const t = random() * 6.283, r = 0.04 + Math.sqrt(random()) * 0.22;
      flat(Math.cos(t) * r, Math.sin(t) * r, t + 0.6 + random(), false);
    }
    if (a.game === 'slammed') {
      flat(0.02, 0.02, 0.3, true, top + TH / 2, 0);
      for (let i = 0; i < 6; i++) {
        const t = random() * 6.283, r = T / 2 + 0.08 + random() * 0.32;
        flat(Math.cos(t) * r, Math.sin(t) * r, random() * 6, random() < 0.5, TH / 2);
      }
    }
    buckets.forEach((list, index) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(tileGeo, [plain, plain, faceMats[index], back, plain, plain], list.length);
      list.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    });

    // Seats.
    type Seat = 'folding' | 'plastic' | 'wooden' | 'crate' | 'bucket' | 'stool';
    const seat = (kind: Seat) => {
      const g = new THREE.Group();
      const add = <M extends THREE.Object3D>(m: M) => { g.add(m); return m; };
      let h = 0.45;
      if (kind === 'folding') {
        const paint = s.material(rust(['#6f7a80', '#7a5a3c', '#3a4a5a', '#8a2a2a'][Math.floor(random() * 4)]), { metalness: 0.5, roughness: 0.5 });
        add(s.box([0.4, 0.02, 0.38], [0, h, 0], paint));
        for (const sx of [-1, 1]) {
          add(s.rod([sx * 0.2, 0, 0.2], [sx * 0.2, 0.86, -0.2], 0.011, steel));
          add(s.rod([sx * 0.2, 0, -0.2], [sx * 0.2, h, 0.17], 0.011, steel));
        }
        add(s.box([0.4, 0.16, 0.015], [0, 0.78, -0.165], paint)).rotation.x = -0.25;
      } else if (kind === 'plastic') {
        const white = s.material(['#eeece4', '#eeece4', '#2f8a4a', '#c8262c'][Math.floor(random() * 4)], { roughness: 0.45 });
        add(s.box([0.44, 0.03, 0.42], [0, h, 0], white));
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(s.rod([sx * 0.19, h, sz * 0.18], [sx * 0.23, 0, sz * 0.23], 0.022, white, 0.016));
        add(s.box([0.44, 0.38, 0.025], [0, h + 0.22, -0.22], white)).rotation.x = -0.14;
        for (const sx of [-1, 1]) add(s.box([0.03, 0.03, 0.4], [sx * 0.22, h + 0.2, -0.01], white));
        for (const sx of [-1, 1]) add(s.rod([sx * 0.22, h, 0.18], [sx * 0.22, h + 0.2, 0.18], 0.014, white));
      } else if (kind === 'wooden') {
        const wood = s.material(['#7a4a26', '#a8743e', '#4a2c18', '#c8b48a'][Math.floor(random() * 4)], { roughness: 0.6 });
        add(s.box([0.4, 0.03, 0.4], [0, h, 0], wood));
        for (const sx of [-1, 1]) {
          add(s.rod([sx * 0.17, 0, 0.17], [sx * 0.17, h, 0.17], 0.018, wood));
          add(s.rod([sx * 0.17, 0, -0.17], [sx * 0.17, 0.9, -0.2], 0.018, wood));
          add(s.rod([sx * 0.17, 0.2, 0.17], [sx * 0.17, 0.2, -0.17], 0.01, wood));
        }
        for (const y of [0.62, 0.74, 0.86]) add(s.box([0.36, 0.05, 0.016], [0, y, -0.19 - (y - 0.45) * 0.065], wood));
      } else if (kind === 'crate') {
        h = 0.3;
        const tint = ['#c8262c', '#2f6fc0', '#2f8a4a', '#e08a1e'][Math.floor(random() * 4)];
        add(s.box([0.36, h, 0.36], [0, h / 2, 0], s.material(tint, { roughness: 0.6 })));
        for (const y of [0.08, 0.2]) add(s.box([0.37, 0.035, 0.37], [0, y, 0], s.material(new THREE.Color(tint).multiplyScalar(0.5), { roughness: 0.6 })));
        if (random() < 0.6) add(s.box([0.34, 0.03, 0.34], [0, h + 0.015, 0], s.material('#b89c74', { roughness: 0.9 })));
      } else if (kind === 'bucket') {
        h = 0.36;
        add(s.lathe([[0.17, 0], [0.175, 0.02], [0.14, h - 0.01], [0.13, h], [0, h]], s.material(['#f1ede2', '#2f6fc0', '#e08a1e'][Math.floor(random() * 3)], { roughness: 0.5 })));
        add(s.ring(0.172, 0.006, [0, 0.04, 0], steel)).rotation.x = Math.PI / 2;
      } else {
        const wood = s.material('#8a5a30', { roughness: 0.6 });
        add(s.cylinder(0.16, 0.16, 0.035, [0, h, 0], wood, 20));
        for (let i = 0; i < 3; i++) add(s.rod([Math.cos(i * 2.094) * 0.09, h, Math.sin(i * 2.094) * 0.09], [Math.cos(i * 2.094) * 0.2, 0, Math.sin(i * 2.094) * 0.2], 0.016, wood));
      }
      return { g, h };
    };
    const kinds: Seat[] = {
      mismatched: (['folding', 'plastic', 'wooden', 'crate', 'bucket', 'stool'] as Seat[]).sort(() => random() - 0.5).slice(0, 4),
      folding: ['folding', 'folding', 'folding', 'folding'] as Seat[],
      plastic: ['plastic', 'plastic', 'plastic', 'plastic'] as Seat[],
      crates: ['crate', 'bucket', 'crate', random() < 0.5 ? 'bucket' : 'crate'] as Seat[],
      wooden: ['wooden', 'wooden', 'wooden', random() < 0.4 ? 'stool' : 'wooden'] as Seat[],
    }[a.seats];
    const odd = Math.floor(random() * 4);
    kinds.forEach((kind, k) => {
      const { g, h } = seat(kind);
      const holder = new THREE.Group();
      holder.add(g);
      let dist = T / 2 + mix(0.1, 0.19, random()), turn = k * Math.PI / 2 + Math.PI + (random() - 0.5) * 0.35;
      let side = (random() - 0.5) * 0.12;
      if (k === odd && a.chair === 'pushed') { dist += 0.3; turn += 0.7 + random() * 0.6; side += 0.12; }
      if (k === odd && a.chair === 'tipped') {
        dist += 0.38;
        g.rotation.x = -Math.PI / 2;
        g.rotation.z = (random() - 0.5) * 0.3;
        g.updateMatrixWorld(true);
        g.position.y = -new THREE.Box3().setFromObject(g).min.y;
      }
      const p = new THREE.Vector3(side, 0, dist).applyAxisAngle(Y, k * Math.PI / 2);
      holder.position.copy(p);
      holder.rotation.y = turn;
      s.root.add(holder);
      if (k === odd && a.chair === 'cane') {
        const tweed = s.material(['#5a5a4a', '#3a3f4a', '#6a4a3a'][Math.floor(random() * 3)], { roughness: 1 });
        g.add(s.ball([0.12, 0.035, 0.13], [0, h + 0.045, 0], tweed, 14));
        g.add(s.box([0.14, 0.012, 0.07], [0, h + 0.03, 0.13], tweed));
        const c = new THREE.Vector3(0.18, 0, T / 2 + 0.03).applyAxisAngle(Y, k * Math.PI / 2);
        const cane = new THREE.Group();
        cane.add(s.rod([0, 0, 0], [0, top + 0.05, 0], 0.011, s.material('#5a3518', { roughness: 0.4 })));
        cane.add(s.ring(0.04, 0.011, [0.04, top + 0.05, 0], s.material('#5a3518', { roughness: 0.4 }), Math.PI));
        cane.position.set(c.x, 0, c.z);
        cane.rotation.y = -k * Math.PI / 2 + Math.PI / 2;
        s.root.add(cane);
      }
    });

    // Drinks at the corners, a few more as the afternoon fills up.
    const corner = (k: number, inset = 0.1): V3 => [(k % 2 ? 1 : -1) * (T / 2 - inset) * (k < 2 ? 1 : -1), top, (k < 2 ? 1 : -1) * (T / 2 - inset)];
    const rounds = a.drinks === 'none' ? 0 : 2 + Math.round(mood.density * 2);
    const china = s.material('#f4f1e8', { roughness: 0.3 });
    for (let k = 0; k < rounds; k++) {
      const [x, y, z] = corner(k, a.table === 'domino' ? 0.07 : 0.07 + random() * 0.02);
      if (a.drinks === 'coffee') {
        s.cylinder(0.024, 0.017, 0.04, [x, y + 0.02, z], china, 14);
        s.cylinder(0.02, 0.02, 0.002, [x, y + 0.039, z], s.material('#2a1408'), 14);
      } else if (a.drinks === 'beer') {
        const glass = new THREE.MeshStandardMaterial({ color: random() < 0.7 ? '#2f7a3a' : '#6a3a14', roughness: 0.15, transparent: true, opacity: 0.9 });
        const tipped = a.game === 'slammed' && k === 1;
        const bottle = s.lathe([[0, 0], [0.03, 0], [0.03, 0.13], [0.013, 0.19], [0.013, 0.23], [0, 0.23]], glass, [x, y, z]);
        s.box([0.045, 0.05, 0.002], [x, y + 0.07, z + 0.0305], s.material('#f1ead2'));
        if (tipped) { bottle.rotation.z = Math.PI / 2; bottle.position.y = y + 0.03; }
      } else if (a.drinks === 'rum') {
        s.cylinder(0.025, 0.02, 0.055, [x, y + 0.028, z], new THREE.MeshStandardMaterial({ color: '#8a4a1e', roughness: 0.1, transparent: true, opacity: 0.85 }), 12);
      } else if (a.drinks === 'tea') {
        s.cylinder(0.04, 0.04, 0.005, [x, y + 0.003, z], china, 16);
        s.lathe([[0, 0.006], [0.02, 0.006], [0.016, 0.03], [0.023, 0.065], [0.025, 0.08]], new THREE.MeshStandardMaterial({ color: '#b5501c', roughness: 0.1, transparent: true, opacity: 0.88, side: THREE.DoubleSide }), [x, y, z]);
      } else {
        const tint = ['#c8262c', '#2f6fc0', '#e08a1e', '#2f8a4a'][Math.floor(random() * 4)];
        s.cylinder(0.03, 0.03, 0.11, [x, y + 0.055, z], s.material(tint, { metalness: 0.6, roughness: 0.3 }), 16);
        s.cylinder(0.027, 0.027, 0.004, [x, y + 0.111, z], steel, 16);
      }
    }
    if (a.drinks === 'coffee') {
      const fx = T / 2 - 0.2, fz = -T / 2 + 0.09;
      s.cylinder(0.04, 0.04, 0.22, [fx, top + 0.11, fz], s.material(['#2f6a4a', '#b3232a', '#2f4a8c'][Math.floor(random() * 3)], { roughness: 0.4 }), 16);
      s.cylinder(0.042, 0.042, 0.04, [fx, top + 0.24, fz], steel, 16);
    }
    if (a.drinks === 'rum') {
      const fx = T / 2 - 0.21, fz = -T / 2 + 0.1;
      s.lathe([[0, 0], [0.04, 0], [0.04, 0.17], [0.016, 0.23], [0.016, 0.29], [0, 0.29]], new THREE.MeshStandardMaterial({ color: '#5a2a10', roughness: 0.15, transparent: true, opacity: 0.92 }), [fx, top, fz]);
      s.box([0.06, 0.07, 0.002], [fx, top + 0.09, fz + 0.0405], s.material('#f1e2a8'));
      s.cylinder(0.018, 0.018, 0.02, [fx, top + 0.3, fz], s.material('#c8262c'), 10);
    }

    // Scorepad and pencil, always; then whatever is at stake.
    const padAt: V3 = [-T / 2 + 0.2, top, -T / 2 + 0.1];
    const padCanvas = document.createElement('canvas');
    padCanvas.width = 96; padCanvas.height = 128;
    const pc = padCanvas.getContext('2d')!;
    pc.fillStyle = '#f6f1d8'; pc.fillRect(0, 0, 96, 128);
    pc.fillStyle = '#3a5a9a'; pc.fillRect(47, 6, 2, 116); pc.fillRect(6, 24, 84, 2);
    pc.strokeStyle = '#222'; pc.lineWidth = 2.4;
    const tally = (x0: number, n: number) => { for (let i = 0; i < n; i++) { const gx = x0 + (i % 5) * 6 + Math.floor(i / 5) % 1 * 0, gy = 34 + Math.floor(i / 5) * 18; pc.beginPath(); if (i % 5 === 4) { pc.moveTo(x0 - 2, gy + 12); pc.lineTo(x0 + 26, gy + 1); } else { pc.moveTo(gx, gy); pc.lineTo(gx + 1, gy + 13); } pc.stroke(); } };
    tally(10, 3 + Math.floor(random() * 22)); tally(56, 2 + Math.floor(random() * 22));
    const padMap = new THREE.CanvasTexture(padCanvas);
    padMap.colorSpace = THREE.SRGBColorSpace;
    const padTurn = 0.3 + (random() - 0.5) * 0.5;
    const pad = s.mesh(new THREE.BoxGeometry(0.1, 0.008, 0.135), [china, china, new THREE.MeshStandardMaterial({ map: padMap, roughness: 0.9 }), china, china, china] as unknown as THREE.Material, [padAt[0], top + 0.004, padAt[2]]);
    pad.rotation.y = padTurn;
    const pencil = s.rod([padAt[0] + 0.07, top + 0.005, padAt[2] - 0.05], [padAt[0] + 0.1, top + 0.005, padAt[2] + 0.07], 0.004, s.material('#e8b422', { roughness: 0.5 }));
    pencil.castShadow = true;
    const stakeAt: V3 = [0.3, top, 0.1];
    if (a.stakes === 'coins') {
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.16, 12), s.material('#c9b46a', { metalness: 0.85, roughness: 0.3 }),
        Array.from({ length: 8 + Math.round(mood.density * 10) }, () => ({ at: [stakeAt[0] + (random() - 0.5) * 0.11, top + 0.002 + random() * 0.008, stakeAt[2] + (random() - 0.5) * 0.08] as V3, size: 0.011 + random() * 0.004 })));
    } else if (a.stakes === 'bills') {
      for (let i = 0; i < 3; i++) s.box([0.13, 0.003, 0.06], [stakeAt[0], top + 0.002 + i * 0.003, stakeAt[2]], s.material(['#7fa886', '#8fb596', '#c9b27a'][i], { roughness: 0.9 })).rotation.y = 0.2 + i * 0.25;
      flat(stakeAt[0], stakeAt[2], 1.1, true, top + 0.016);
      const holdDown = new THREE.Mesh(tileGeo, [plain, plain, faceMats[1], back, plain, plain]);
      holdDown.position.set(stakeAt[0], top + 0.016, stakeAt[2]); holdDown.rotation.y = 1.1; holdDown.castShadow = true;
      s.root.add(holdDown);
    } else if (a.stakes === 'matches') {
      const stick = s.material('#e6d2a0', { roughness: 0.9 });
      for (let pileIndex = 0; pileIndex < 2; pileIndex++) for (let i = 0; i < 9 + Math.floor(random() * 8); i++) {
        const mx = stakeAt[0] - pileIndex * 0.42 + (random() - 0.5) * 0.07, mz = stakeAt[2] + pileIndex * 0.5 + (random() - 0.5) * 0.06, t = random() * 3;
        s.rod([mx - Math.cos(t) * 0.02, top + 0.003, mz - Math.sin(t) * 0.02], [mx + Math.cos(t) * 0.02, top + 0.003 + random() * 0.006, mz + Math.sin(t) * 0.02], 0.0018, stick);
      }
    }

    // Radio on the ground by somebody's foot.
    let dial: THREE.Mesh | null = null;
    if (a.radio) {
      const g = new THREE.Group();
      const shell = s.material(['#b3232a', '#2a2c30', '#c9c4b4', '#2f6a8a'][Math.floor(random() * 4)], { roughness: 0.5 });
      g.add(s.box([0.3, 0.17, 0.09], [0, 0.085, 0], shell));
      g.add(s.cylinder(0.055, 0.055, 0.01, [-0.07, 0.085, 0.046], dark, 20)).rotation.x = Math.PI / 2;
      (g.children[1] as THREE.Mesh).rotation.x = Math.PI / 2;
      g.add(s.box([0.1, 0.035, 0.004], [0.08, 0.12, 0.046], s.material('#f1e6b8', { emissive: '#f1c868', emissiveIntensity: mix(0.2, 0.9, mood.cheer) })));
      dial = s.cylinder(0.018, 0.018, 0.012, [0.08, 0.06, 0.048], steel, 12);
      dial.rotation.x = Math.PI / 2;
      g.add(dial);
      g.add(s.rod([0.13, 0.17, -0.03], [0.24, 0.5, -0.06], 0.004, steel));
      g.add(s.tube([[-0.1, 0.17, 0], [0, 0.22, 0], [0.1, 0.17, 0]], 0.006, dark));
      const p = new THREE.Vector3(0.5, 0, T / 2 + 0.2).applyAxisAngle(Y, (odd + 1) * Math.PI / 2);
      g.position.copy(p);
      g.rotation.y = (odd + 1) * Math.PI / 2 + 0.4;
      s.root.add(g);
    }
    const spin = mood.energy;
    return s.finish({ update: (dt) => { if (dial) dial.rotation.y += dt * spin; } });
  },
});
