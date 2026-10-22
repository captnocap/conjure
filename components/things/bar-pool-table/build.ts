import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const BALLS = ['#f2c21b', '#1f4fb8', '#d22b2b', '#6a2c91', '#f07a1a', '#1f8a4c', '#7a1f25', '#111111', '#f6dc7a', '#7f9be0', '#ee8a8a', '#b08ad0', '#f7b77c', '#7fd0a0', '#c98088'];
type P3 = [number, number, number];

export default defineThing({
  questions: {
    felt: choice('What colour is the felt?', {
      green: 'Classic billiard green, worn pale along the rails.',
      red: 'Casino red felt, a little too loud for the room.',
      blue: 'Tournament blue gone patchy with beer stains.',
      tan: 'Camel-brown felt faded by decades of smoke.',
      purple: 'Purple felt somebody thought was classy in 1994.',
    }),
    game: choice('What state is the game in?', {
      rack: 'A fresh tight rack inside the triangle, cue ball waiting at the other end.',
      midgame: 'Mid-game: balls scattered across the felt, somebody walked away to the bar.',
      eight: 'Only the eight ball left, hanging over a corner pocket, with the cue ball lined up.',
      snapped: 'A cue snapped in two after a bad loss, pieces on the felt and floor, balls scattered.',
      scratch: 'The break just happened: balls flung wide and the cue ball sitting in a pocket mouth.',
      locked: 'No balls out at all: they are locked inside until someone pays.',
    }),
    quarters: choice('Are there quarters on the rail calling next?', {
      none: 'No coins: nobody is waiting.',
      one: 'One small stack: one challenger.',
      line: 'A long line of stacks: a busy night and a queue.',
      dollar: 'A folded dollar bill pinned under the chalk instead.',
    }),
    cabinet: choice('What is the table body like?', {
      oak: 'Honey oak laminate with chrome corner caps.',
      black: 'Black vinyl with chrome trim, a 1980s arcade table.',
      mahogany: 'Dark red mahogany stain with brass corners.',
      walnut: 'Chipped brown woodgrain with duct tape on one corner.',
    }),
    cues: choice('Where are the cues?', {
      leaning: 'Two cues leaning against the long side.',
      ontable: 'One cue left lying across the felt.',
      both: 'One on the felt and one leaning on the side.',
      none: 'No cues in sight.',
    }),
    left: choice('What has been left on the rail?', {
      nothing: 'Only the chalk.',
      pitcher: 'A cheap pitcher of beer and two plastic cups.',
      bottles: 'A couple of longneck bottles.',
      ashtray: 'A glass ashtray with a cigarette still burning.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const L = 2.1, W = 1.18, top = 0.8, bed = 0.745, r = 0.035;
    const feltHex = { green: '#2f7d4f', red: '#b5322f', blue: '#2c62a8', tan: '#b08a55', purple: '#6b3c8f' }[a.felt];
    const bodyHex = { oak: '#b78442', black: '#1f1f22', mahogany: '#6a2420', walnut: '#5f4127' }[a.cabinet];
    const body = s.material(bodyHex, { roughness: 0.5 });
    const railWood = s.material(a.cabinet === 'black' ? '#2b2b2f' : new THREE.Color(bodyHex).multiplyScalar(0.7), { roughness: 0.4 });
    const metal = s.material(a.cabinet === 'mahogany' ? '#c9a24a' : '#d5d9dc', { metalness: 0.85, roughness: 0.25 });
    const dark = s.material('#0f0f10', { roughness: 0.9 });
    const stains = mix(0.1, 1, mood.wear) + (a.felt === 'blue' ? 0.5 : 0);

    // Felt, painted with wear tracks, chalk smears and stains.
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 288;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = feltHex; ctx.fillRect(0, 0, 512, 288);
    for (let i = 0; i < 26 * stains; i++) {
      const x = random() * 512, y = random() * 288, rad = 8 + random() * 34;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const kind = random();
      g.addColorStop(0, kind < 0.45 ? 'rgba(20,25,20,0.32)' : kind < 0.8 ? 'rgba(255,255,255,0.2)' : 'rgba(110,80,30,0.4)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(128, 20); ctx.lineTo(128, 268); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (const x of [128, 384]) { ctx.beginPath(); ctx.arc(x, 144, 4, 0, 7); ctx.fill(); }
    if (mood.wear > 0.6) { ctx.strokeStyle = 'rgba(15,15,15,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); const tx = 200 + random() * 200, ty = 60 + random() * 160; ctx.moveTo(tx, ty); ctx.lineTo(tx + 40, ty + 14); ctx.lineTo(tx + 58, ty + 4); ctx.stroke(); }
    const feltTexture = new THREE.CanvasTexture(canvas); feltTexture.colorSpace = THREE.SRGBColorSpace;
    const felt = new THREE.MeshStandardMaterial({ map: feltTexture, roughness: 1 });
    const cushion = s.material(new THREE.Color(feltHex).multiplyScalar(0.82), { roughness: 1 });

    // Cabinet: tapered body on four stubby legs, bed, rails, cushions, pockets.
    const taper = new THREE.Shape();
    taper.moveTo(-W / 2 + 0.1, 0); taper.lineTo(W / 2 - 0.1, 0); taper.lineTo(W / 2, 0.42); taper.lineTo(-W / 2, 0.42); taper.closePath();
    const hull = s.mesh(new THREE.ExtrudeGeometry(taper, { depth: L, bevelEnabled: false }), body, [-L / 2, 0.3, 0]);
    hull.rotation.y = Math.PI / 2;
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.box([0.16, 0.3, 0.16], [x * (L / 2 - 0.16), 0.15, z * (W / 2 - 0.2)], body);
      s.cylinder(0.045, 0.055, 0.03, [x * (L / 2 - 0.16), 0.015, z * (W / 2 - 0.2)], metal, 12);
    }
    const bedMesh = s.mesh(new THREE.PlaneGeometry(L - 0.2, W - 0.2), felt, [0, bed, 0]); bedMesh.rotation.x = -Math.PI / 2;
    s.box([L, 0.03, W], [0, bed - 0.02, 0], dark);
    for (const z of [-1, 1]) {
      s.box([L, 0.08, 0.13], [0, top - 0.04, z * (W / 2 - 0.065)], railWood);
      for (const x of [-1, 1]) s.box([L / 2 - 0.2, 0.04, 0.05], [x * (L / 4 - 0.01), bed + 0.022, z * (W / 2 - 0.15)], cushion);
    }
    for (const x of [-1, 1]) {
      s.box([0.13, 0.08, W], [x * (L / 2 - 0.065), top - 0.04, 0], railWood);
      s.box([0.05, 0.04, W - 0.44], [x * (L / 2 - 0.15), bed + 0.022, 0], cushion);
    }
    const pockets: P3[] = [];
    for (const x of [-1, 0, 1]) for (const z of [-1, 1]) {
      const p: P3 = [x * (L / 2 - 0.12), bed + 0.031, z * (W / 2 - (x === 0 ? 0.09 : 0.12))];
      pockets.push(p);
      s.cylinder(0.068, 0.068, 0.062, p, dark, 20);
      if (x !== 0) s.box([0.2, 0.086, 0.2], [x * (L / 2 - 0.06), top - 0.042, z * (W / 2 - 0.06)], metal).rotation.y = Math.PI / 4;
    }
    for (const z of [-1, 1]) for (let i = 0; i < 6; i++) s.cylinder(0.008, 0.008, 0.002, [(-0.72 + i * 0.29) + (i > 2 ? 0 : -0.005), top + 0.001, z * (W / 2 - 0.05)], s.material('#f1ead6'), 8);
    // Coin slider on the front, ball return window at the left end, the triangle's hook.
    s.box([0.22, 0.16, 0.05], [0.55, 0.56, W / 2 - 0.035], metal).rotation.x = -0.23;
    s.box([0.16, 0.03, 0.12], [0.55, 0.6, W / 2 + 0.03], metal);
    for (let i = 0; i < 4; i++) s.box([0.022, 0.006, 0.05], [0.5 + i * 0.033, 0.617, W / 2 + 0.05], dark);
    s.box([0.03, 0.22, 0.5], [-L / 2 - 0.005, 0.5, 0], dark);
    s.box([0.04, 0.03, 0.56], [-L / 2 - 0.01, 0.38, 0], metal);
    if (a.cabinet === 'walnut') s.box([0.24, 0.1, 0.012], [L / 2 - 0.2, 0.62, W / 2 - 0.045], s.material('#9a9da0', { roughness: 0.7 })).rotation.x = -0.23;

    // Balls.
    const placed: { at: P3; size: number; color: string }[] = [];
    const y = bed + r;
    const put = (x: number, z: number, color: string) => placed.push({ at: [x, y, z], size: 1, color });
    const free = (x0: number, x1: number) => {
      for (let tries = 0; tries < 40; tries++) {
        const x = mix(x0, x1, random()), z = (random() - 0.5) * (W - 0.5);
        if (placed.every((b) => Math.hypot(b.at[0] - x, b.at[2] - z) > r * 2.3)) return [x, z] as const;
      }
      return [0, 0] as const;
    };
    const order = BALLS.map((_c, i) => i).sort(() => random() - 0.5);
    let trianglePos: 'felt' | 'hook' = 'hook';
    if (a.game === 'rack') {
      trianglePos = 'felt';
      let n = 0;
      for (let row = 0; row < 5; row++) for (let k = 0; k <= row; k++) {
        const index = row === 2 && k === 1 ? 7 : order.filter((v) => v !== 7)[n++ % 14];
        put(0.42 + row * r * 1.74, (k - row / 2) * r * 2.02, BALLS[index]);
      }
      put(-0.55 + (random() - 0.5) * 0.1, (random() - 0.5) * 0.2, '#f5f1e4');
    } else if (a.game === 'midgame' || a.game === 'snapped' || a.game === 'scratch') {
      const count = a.game === 'scratch' ? 15 : 5 + Math.floor(random() * 6);
      for (let i = 0; i < count; i++) { const [x, z] = free(a.game === 'scratch' ? -0.3 : -0.85, 0.85); put(x, z, BALLS[order[i]]); }
      if (a.game === 'scratch') { const p = pockets[Math.floor(random() * 6)]; placed.push({ at: [p[0] * 0.985, bed + r * 0.8, p[2] * 0.97], size: 1, color: '#f5f1e4' }); }
      else { const [x, z] = free(-0.85, 0.2); put(x, z, '#f5f1e4'); }
    } else if (a.game === 'eight') {
      const sx = random() < 0.5 ? -1 : 1, sz = random() < 0.5 ? -1 : 1;
      put(sx * (L / 2 - 0.2), sz * (W / 2 - 0.2), '#111111');
      put(sx * (L / 2 - 0.2) - sx * 0.55, sz * (W / 2 - 0.2) - sz * 0.3, '#f5f1e4');
    }
    if (placed.length) s.scatter(new THREE.SphereGeometry(r, 16, 10), new THREE.MeshStandardMaterial({ roughness: 0.18 }), placed);
    if (a.game === 'locked') for (let i = 0; i < 7; i++) s.ball([r, r, r], [-L / 2 - 0.03, 0.44, -0.2 + i * 0.066], s.material(BALLS[order[i]], { roughness: 0.2 }), 12);

    // Triangle rack.
    const wood = s.material('#c79a55', { roughness: 0.5 });
    const tri = new THREE.Group();
    const side = 0.33, h = side * Math.sqrt(3) / 2;
    const corners: P3[] = [[-h * 0.42, 0, 0], [h * 0.58, 0, -side / 2], [h * 0.58, 0, side / 2]];
    corners.forEach((c, i) => {
      const n = corners[(i + 1) % 3];
      const bar = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(n[0] - c[0], n[2] - c[2]) + 0.02, 0.035, 0.014), wood);
      bar.position.set((c[0] + n[0]) / 2, 0, (c[2] + n[2]) / 2); bar.rotation.y = -Math.atan2(n[2] - c[2], n[0] - c[0]); bar.castShadow = true;
      tri.add(bar);
    });
    if (trianglePos === 'felt') tri.position.set(0.42 + r * 1.74 * 2 - h * 0.08, bed + 0.018, 0);
    else { tri.rotation.z = Math.PI / 2; tri.rotation.x = 0.2; tri.position.set(L / 2 + 0.012, 0.52, 0.1); }
    s.root.add(tri);

    // Cues.
    const cue = (from: P3, to: P3, broken = false) => {
      const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to), mid = A.clone().lerp(B, 0.42);
      s.rod(from, mid.toArray() as P3, 0.015, s.material('#3a2015'), 0.012);
      if (!broken) { s.rod(mid.toArray() as P3, to, 0.012, s.material('#e2c88d'), 0.006); s.rod(A.clone().lerp(B, 0.985).toArray() as P3, to, 0.0065, s.material('#3f6fc0')); }
    };
    if (a.game === 'snapped') {
      const x = (random() - 0.5) * 0.8;
      s.rod([x, bed + 0.014, -0.25], [x + 0.55, bed + 0.014, 0.1], 0.012, s.material('#e2c88d'), 0.006).rotation.y += 0;
      s.rod([x - 0.02, bed + 0.014, -0.262], [x + 0.03, bed + 0.03, -0.23], 0.004, s.material('#f0deb0'), 0.012);
      const fx = (random() - 0.5) * 1.2;
      s.rod([fx, 0.016, W / 2 + 0.25], [fx + 0.6, 0.016, W / 2 + 0.42], 0.015, s.material('#3a2015'), 0.012);
      s.rod([fx + 0.6, 0.016, W / 2 + 0.42], [fx + 0.67, 0.035, W / 2 + 0.43], 0.012, s.material('#f0deb0'), 0.003);
    }
    if (a.cues === 'leaning' || a.cues === 'both') {
      const n = a.cues === 'leaning' ? 2 : 1;
      for (let i = 0; i < n; i++) { const x = -0.75 + i * 0.16 + random() * 0.1; cue([x - 0.05, 0, W / 2 + 0.4], [x + 0.03 * i, 1.38, W / 2 + 0.02]); }
    }
    if (a.cues === 'ontable' || a.cues === 'both') {
      const x = (random() - 0.5) * 0.4, tilt = (random() - 0.5) * 0.5;
      cue([x + 0.72, top + 0.016, -0.2 + tilt * 0.4], [x - 0.72, bed + 0.03, 0.15 - tilt * 0.4]);
    }

    // Chalk, quarters, and what the last players left.
    const chalkX = -0.25 + random() * 0.3, zRail = W / 2 - 0.06;
    s.box([0.034, 0.034, 0.034], [chalkX, top + 0.017, zRail], s.material('#3f6fc0')).rotation.y = random();
    const coin = s.material('#c9ccd0', { metalness: 0.8, roughness: 0.3 });
    const stack = (x: number, n: number) => s.cylinder(0.017, 0.017, 0.004 * n, [x, top + 0.002 * n, zRail + (random() - 0.5) * 0.02], coin, 12);
    if (a.quarters === 'one') stack(0.2, 4 + Math.floor(random() * 3));
    if (a.quarters === 'line') for (let i = 0; i < 5 + Math.floor(random() * 3); i++) stack(0.02 + i * 0.055, 2 + Math.floor(random() * 5));
    if (a.quarters === 'dollar') { s.box([0.13, 0.004, 0.06], [chalkX + 0.02, top + 0.002, zRail], s.material('#8fae84')).rotation.y = 0.3; }
    const lx = -L / 2 + 0.07, glass = new THREE.MeshStandardMaterial({ color: '#f0f6f4', transparent: true, opacity: 0.35, roughness: 0.05 });
    const beer = s.material('#d9982a', { roughness: 0.25 });
    if (a.left === 'pitcher') {
      s.cylinder(0.065, 0.055, 0.2, [lx, top + 0.1, 0.25], glass, 16);
      s.cylinder(0.058, 0.05, 0.12 * mix(0.3, 1, random()), [lx, top + 0.065, 0.25], beer, 16);
      s.ring(0.05, 0.008, [lx, top + 0.11, 0.33], s.material('#e8eeee'), Math.PI).rotation.set(0, Math.PI / 2, -Math.PI / 2);
      for (const z of [0.05, -0.06]) s.cylinder(0.035, 0.026, 0.1, [lx + (random() - 0.5) * 0.03, top + 0.05, z], s.material('#d93a34'), 12);
    } else if (a.left === 'bottles') {
      for (let i = 0; i < 2 + Math.floor(random() * 2); i++) {
        const z = 0.3 - i * 0.14, c = s.material(random() < 0.5 ? '#5a3a14' : '#2f6b3a', { roughness: 0.2 });
        s.cylinder(0.028, 0.028, 0.13, [lx, top + 0.065, z], c, 12); s.cylinder(0.011, 0.026, 0.09, [lx, top + 0.175, z], c, 12);
      }
    } else if (a.left === 'ashtray') {
      s.cylinder(0.055, 0.045, 0.025, [lx, top + 0.0125, 0.2], s.material('#b8742a', { roughness: 0.15 }), 14);
      s.rod([lx - 0.03, top + 0.03, 0.2], [lx + 0.05, top + 0.034, 0.23], 0.004, s.material('#f2efe6'));
      s.ball([0.006, 0.006, 0.006], [lx - 0.03, top + 0.03, 0.2], new THREE.MeshStandardMaterial({ color: '#ff6a2a', emissive: '#ff5a1a', emissiveIntensity: 1.2 }), 8);
    }
    return s.finish();
  },
});
