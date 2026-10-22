import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const SIGNS = {
  none: 'No sign.',
  wait: 'PLEASE WAIT HERE',
  line: 'LINE STARTS HERE',
  vip: 'VIP ONLY',
  closed: 'CLOSED',
  soldout: 'SOLD OUT',
  next: 'NEXT TELLER',
} as const;
type P3 = [number, number, number];

export default defineThing({
  questions: {
    rope: choice('What colour are the ropes?', {
      red: 'Classic crimson velvet.',
      blue: 'Royal blue velvet, civic and calm.',
      black: 'Black velvet, nightclub door.',
      green: 'Bottle-green velvet, old bank.',
      purple: 'Imperial purple, a touch theatrical.',
      gold: 'Twisted gold cord rather than velvet.',
      belt: 'Not rope at all: flat retractable nylon belts, airport style.',
    }),
    layout: choice('How is the queue laid out?', {
      line: 'A single straight line of posts.',
      maze: 'A switchback maze of lanes that doubles back on itself.',
      gate: 'Two short parallel rows making a guarded corridor to a door.',
      corner: 'An L-shaped cordon fencing off a corner.',
      ring: 'A closed ring round something nobody may touch.',
    }),
    post: choice('What are the posts like?', {
      brass: 'Polished brass with ball tops and domed bases.',
      chrome: 'Mirror chrome with flat tops.',
      black: 'Matte black with urn tops.',
      antique: 'Dull bronze with crown-shaped finials, a century old.',
    }),
    unhooked: noul('Has one rope been unhooked and left trailing on the floor?'),
    knocked: noul('Has a post been knocked over?'),
    sign: choice('If there is a sign on a stand, what does it say?', SIGNS),
    carpet: choice('What is underfoot?', {
      none: 'Bare floor.',
      runner: 'A long carpet runner in the rope colour.',
      redcarpet: 'A red carpet with gold edging.',
      tape: 'Scuffed stand-here footprints and tape marks.',
    }),
    left: choice('What has been left behind in the queue?', {
      nothing: 'Nothing.',
      stubs: 'A litter of torn ticket stubs and slips.',
      umbrella: 'A forgotten umbrella hooked on a post.',
      shoe: 'A single shoe, lost in a hurry.',
      bag: 'A small paper shopping bag set down and forgotten.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const ropeHex = { red: '#a8182c', blue: '#1f3fa0', black: '#1d1b20', green: '#1f5a3c', purple: '#5b2a86', gold: '#c9a23a', belt: '#22262b' }[a.rope];
    const ropeMat = s.material(ropeHex, { roughness: a.rope === 'gold' ? 0.5 : 0.95 });
    const postHex = { brass: '#d9aa42', chrome: '#dfe4e7', black: '#2a2b2e', antique: '#8a6a3a' }[a.post];
    const metal = new THREE.MeshStandardMaterial({ color: new THREE.Color(postHex).lerp(new THREE.Color('#6d6a55'), mood.wear * 0.4), metalness: a.post === 'black' ? 0.2 : 0.6, roughness: mix(a.post === 'black' ? 0.6 : 0.22, 0.75, mood.wear) });
    const hook = new THREE.MeshStandardMaterial({ color: '#e3e6e8', metalness: 0.6, roughness: 0.3 });
    const H = 0.98;

    // Where the posts stand and which pairs are roped.
    const posts: { x: number; z: number; fall: number | null }[] = [];
    const links: [number, number][] = [];
    const add = (x: number, z: number) => posts.push({ x, z, fall: null }) - 1;
    const gap = 1.1;
    const long = 3 + Math.round(mood.density * 1.5);
    if (a.layout === 'line') {
      for (let i = 0; i < long + 1; i++) { add((i - long / 2) * gap, 0); if (i) links.push([i - 1, i]); }
    } else if (a.layout === 'maze') {
      const cols = Math.max(3, long - 1), rows = 3 + (mood.density > 0.7 ? 1 : 0);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) add((c - (cols - 1) / 2) * gap, (r - (rows - 1) / 2) * 1.05);
      const id = (r: number, c: number) => r * cols + c;
      for (let r = 0; r < rows; r++) {
        const outer = r === 0 || r === rows - 1;
        // Inner rows stop one bay short at alternate ends so the lane can turn.
        for (let c = 1; c < cols; c++) {
          if (!outer && (r % 2 ? c === cols - 1 : c === 1)) continue;
          links.push([id(r, c - 1), id(r, c)]);
        }
      }
      for (let r = 1; r < rows; r++) { links.push([id(r - 1, cols - 1), id(r, cols - 1)]); if (r > 1) links.push([id(r - 1, 0), id(r, 0)]); }
    } else if (a.layout === 'gate') {
      for (const z of [-0.75, 0.75]) for (let i = 0; i < 3; i++) { const n = add((i - 1) * gap, z); if (i) links.push([n - 1, n]); }
    } else if (a.layout === 'corner') {
      const n = Math.max(2, long - 1);
      for (let i = 0; i <= n; i++) { add(-n * gap * 0.5 + i * gap, -0.9); if (i) links.push([i - 1, i]); }
      for (let i = 1; i <= 2; i++) { const k = add(n * gap * 0.5, -0.9 + i * gap); links.push([k - 1, k]); }
    } else {
      const n = 5 + Math.round(mood.density * 3), radius = (n * gap) / (Math.PI * 2);
      for (let i = 0; i < n; i++) { add(Math.cos((i / n) * Math.PI * 2) * radius, Math.sin((i / n) * Math.PI * 2) * radius); links.push([i, (i + 1) % n]); }
    }
    for (const post of posts) { post.x += (random() - 0.5) * 0.06 * (1 + mood.wear * 2); post.z += (random() - 0.5) * 0.06 * (1 + mood.wear * 2); }
    const fallen = a.knocked ? Math.floor(random() * posts.length) : -1;
    if (fallen >= 0) posts[fallen].fall = random() * Math.PI * 2;
    const topOf = (index: number): P3 => {
      const p = posts[index];
      return p.fall === null ? [p.x, H - 0.06, p.z] : [p.x + Math.cos(p.fall) * (H - 0.06), 0.09, p.z - Math.sin(p.fall) * (H - 0.06)];
    };

    // Posts.
    const profile: [number, number][] = [[0, 0], [0.17, 0], [0.175, 0.015], [0.15, 0.04], [0.06, 0.075], [0.036, 0.1], [0.032, 0.82], [0.045, 0.84], [0.045, 0.9], [0.03, 0.915]];
    const cap: [number, number][] = {
      brass: [[0.03, 0.915], [0.055, 0.94], [0.06, 0.97], [0.04, 1.01], [0, 1.02]],
      chrome: [[0.03, 0.915], [0.05, 0.92], [0.05, 0.98], [0, 0.98]],
      black: [[0.03, 0.915], [0.02, 0.93], [0.06, 0.96], [0.05, 1.0], [0.02, 1.02], [0.03, 1.04], [0, 1.05]],
      antique: [[0.03, 0.915], [0.06, 0.93], [0.045, 0.96], [0.07, 1.0], [0.05, 1.01], [0, 1.0]],
    }[a.post] as [number, number][];
    const postGeo = new THREE.LatheGeometry([...profile, ...cap].map(([x, y]) => new THREE.Vector2(x, y)), 20);
    posts.forEach((p) => {
      const mesh = s.mesh(postGeo, metal, [p.x, 0, p.z]);
      if (p.fall !== null) {
        mesh.rotation.order = 'YXZ';
        mesh.rotation.y = p.fall;
        mesh.rotation.z = -Math.PI / 2 + 0.17;
        mesh.position.y = 0.17;
      }
    });

    // Ropes.
    const skip = a.unhooked ? Math.floor(random() * links.length) : -1;
    const sag = mix(0.2, 0.34, mood.wear) ;
    links.forEach(([i, j], index) => {
      const A = topOf(i), B = topOf(j);
      const pts: P3[] = [];
      if (index === skip) {
        // Hangs from A and snakes across the floor.
        const dx = B[0] - A[0], dz = B[2] - A[2], len = Math.hypot(dx, dz) || 1;
        const ux = dx / len, uz = dz / len, side = random() < 0.5 ? 1 : -1;
        pts.push(A, [A[0] + ux * 0.06, A[1] - 0.4, A[2] + uz * 0.06], [A[0] + ux * 0.14, 0.03, A[2] + uz * 0.14]);
        for (let k = 1; k <= 4; k++) pts.push([A[0] + ux * (0.14 + k * 0.22) - uz * side * Math.sin(k * 1.3) * 0.16, 0.025, A[2] + uz * (0.14 + k * 0.22) + ux * side * Math.sin(k * 1.3) * 0.16]);
        const end = pts[pts.length - 1];
        s.cylinder(0.02, 0.02, 0.07, [end[0], 0.03, end[2]], hook, 8).rotation.z = Math.PI / 2;
      } else {
        const droop = a.rope === 'belt' ? 0.015 : sag * (0.85 + random() * 0.3);
        for (let k = 0; k <= 8; k++) {
          const t = k / 8;
          pts.push([mix(A[0], B[0], t), Math.max(0.03, mix(A[1], B[1], t) - droop * 4 * t * (1 - t)), mix(A[2], B[2], t)]);
        }
        if (posts[j].fall === null) s.cylinder(0.022, 0.022, 0.06, [mix(B[0], A[0], 0.05), B[1] - 0.012, mix(B[2], A[2], 0.05)], hook, 8);
      }
      if (posts[i].fall === null) s.cylinder(0.022, 0.022, 0.06, [mix(A[0], B[0], 0.05), A[1] - 0.012, mix(A[2], B[2], 0.05)], hook, 8);
      if (a.rope === 'belt') {
        const path = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
        const belt = s.mesh(new THREE.TubeGeometry(path, 24, 0.036, 4, false), ropeMat);
        belt.scale.y = 1;
        belt.geometry.scale(1, 1, 1);
      } else s.tube(pts, a.rope === 'gold' ? 0.02 : 0.03, ropeMat);
    });
    if (a.rope === 'belt') posts.forEach((p) => { if (p.fall === null) s.box([0.09, 0.07, 0.09], [p.x, H - 0.07, p.z], s.material('#1d1f22')); });

    // Extent of the layout for dressing.
    const xs = posts.map((p) => p.x), zs = posts.map((p) => p.z);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;

    if (a.carpet === 'runner' || a.carpet === 'redcarpet') {
      const hex = a.carpet === 'redcarpet' ? '#9c1420' : new THREE.Color(ropeHex).lerp(new THREE.Color('#4a4038'), 0.35).getStyle();
      const w = maxX - minX + 0.9;
      const lanes = a.layout === 'line' ? [cz + 0.7] : a.layout === 'maze' ? Array.from(new Set(zs.map((z) => Math.round(z * 10) / 10))).sort((p, q) => p - q).slice(0, -1).map((z) => z + 0.52) : [cz];
      for (const z of lanes) {
        s.box([w, 0.012, 0.8], [cx, 0.006, z], s.material(hex, { roughness: 1 }));
        if (a.carpet === 'redcarpet') for (const e of [-0.37, 0.37]) s.box([w, 0.014, 0.03], [cx, 0.007, z + e], s.material('#d0a640'));
      }
    } else if (a.carpet === 'tape') {
      const tape = s.material('#e3c02f', { roughness: 0.9 });
      const z = a.layout === 'line' ? cz + 0.7 : cz;
      for (let i = 0; i < 4; i++) {
        const x = minX + 0.4 + i * ((maxX - minX - 0.4) / 3.5);
        s.box([0.5, 0.004, 0.05], [x, 0.002, z + 0.3], tape);
        for (const f of [-0.09, 0.09]) s.cylinder(0.05, 0.05, 0.004, [x + f, 0.002, z], s.material('#3b3b3b'), 12).scale.z = 1.9;
      }
    }

    if (a.sign !== 'none') {
      const sx = a.layout === 'ring' ? 0 : minX - 0.55, sz = a.layout === 'ring' ? maxZ + 0.6 : a.layout === 'line' ? 0.7 : cz + (a.layout === 'maze' ? -0.52 : 0);
      s.cylinder(0.16, 0.17, 0.03, [sx, 0.015, sz], metal, 20);
      s.cylinder(0.018, 0.018, 1.15, [sx, 0.6, sz], metal, 10);
      const board = new THREE.Group();
      board.position.set(sx, 1.36, sz);
      board.rotation.y = a.layout === 'ring' ? 0 : -0.5 + (random() - 0.5) * 0.3;
      board.rotation.z = (random() - 0.5) * 0.08 * (1 + mood.wear * 3);
      s.root.add(board);
      board.add(s.box([0.5, 0.4, 0.025], [0, 0, 0], metal));
      const words = SIGNS[a.sign].split(' ');
      const half = Math.ceil(words.length / 2);
      const linesOfText = words.length > 1 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [words[0]];
      const dim = a.sign === 'closed' || a.sign === 'soldout';
      linesOfText.forEach((text, k) => {
        const y = linesOfText.length === 1 ? 0 : 0.085 - k * 0.17;
        board.add(s.label(text, 0.44, linesOfText.length === 1 ? 0.32 : 0.16, [0, y, 0.014], dim ? '#f4ecd6' : '#22241f', dim ? '#7a1a1a' : '#f1ead6'));
      });
    }

    const lx = cx + (random() - 0.5) * (maxX - minX) * 0.6, lz = (a.layout === 'line' ? 0.6 : cz) + (random() - 0.5) * 0.3;
    if (a.left === 'stubs') {
      const pts = Array.from({ length: 16 + Math.floor(random() * 20) }, () => ({ at: [minX + random() * (maxX - minX), 0.004, minZ - 0.2 + random() * (maxZ - minZ + 1)] as P3, size: 0.7 + random() * 0.8, color: ['#efe6c8', '#e7b8a0', '#bcd3e0'][Math.floor(random() * 3)] }));
      s.scatter(new THREE.BoxGeometry(0.07, 0.003, 0.035), new THREE.MeshStandardMaterial({ roughness: 1 }), pts);
    } else if (a.left === 'umbrella') {
      const host = posts.find((p) => p.fall === null) ?? posts[0];
      s.rod([host.x + 0.07, H - 0.1, host.z + 0.05], [host.x + 0.3, 0.02, host.z + 0.2], 0.03, s.material('#20242c'), 0.008);
      s.ring(0.04, 0.008, [host.x + 0.06, H - 0.06, host.z + 0.05], s.material('#6b4326'), Math.PI);
    } else if (a.left === 'shoe') {
      s.ball([0.12, 0.045, 0.045], [lx, 0.04, lz], s.material('#1c1a1a', { roughness: 0.3 }), 12).rotation.y = random() * 3;
      s.box([0.05, 0.07, 0.07], [lx - 0.08, 0.05, lz], s.material('#1c1a1a', { roughness: 0.3 }));
    } else if (a.left === 'bag') {
      s.box([0.26, 0.3, 0.12], [lx, 0.15, lz], s.material('#d9c9a4', { roughness: 1 })).rotation.y = random();
      s.ring(0.06, 0.006, [lx, 0.31, lz], s.material('#7a6a4a'), Math.PI);
    }

    return s.finish();
  },
});
