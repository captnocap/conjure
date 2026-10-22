import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { PAINT, fret, lerpHex, paintCanvas, prism, stone, stoneTone, textured, tuft, weather } from './maya';

type Ctx = CanvasRenderingContext2D;

function carvedSkull(ctx: Ctx, cx: number, cy: number, size: number, bone: string, ink: string, profile: boolean) {
  ctx.fillStyle = bone; ctx.strokeStyle = ink; ctx.lineWidth = Math.max(2, size * 0.06);
  if (profile) {
    ctx.beginPath(); ctx.arc(cx - size * 0.08, cy - size * 0.08, size * 0.34, Math.PI * 0.7, Math.PI * 2.05);
    ctx.lineTo(cx + size * 0.4, cy + size * 0.12); ctx.lineTo(cx + size * 0.36, cy + size * 0.4); ctx.lineTo(cx - size * 0.05, cy + size * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(cx + size * 0.12, cy - size * 0.04, size * 0.1, 0, 7); ctx.fill();
    for (let i = 0; i < 4; i++) ctx.fillRect(cx + size * (0.06 + i * 0.085), cy + size * 0.22, size * 0.03, size * 0.18);
    ctx.fillRect(cx - size * 0.5, cy - size * 0.02, size * 0.2, size * 0.06);
    ctx.fillRect(cx + size * 0.4, cy - size * 0.02, size * 0.1, size * 0.06);
  } else {
    ctx.beginPath(); ctx.arc(cx, cy - size * 0.08, size * 0.36, Math.PI * 0.88, Math.PI * 2.12);
    ctx.lineTo(cx + size * 0.22, cy + size * 0.4); ctx.lineTo(cx - size * 0.22, cy + size * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + side * size * 0.15, cy - size * 0.06, size * 0.1, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(cx, cy + size * 0.04); ctx.lineTo(cx - size * 0.05, cy + size * 0.16); ctx.lineTo(cx + size * 0.05, cy + size * 0.16); ctx.fill();
    for (let i = -2; i <= 2; i++) ctx.fillRect(cx + i * size * 0.08 - size * 0.012, cy + size * 0.23, size * 0.025, size * 0.17);
  }
}

export default defineThing({
  questions: {
    platform: choice('What shape is the stone platform?', {
      long: 'A long low bench of a platform, a wall of faces at knee height.',
      square: 'A compact square dais, almost an altar.',
      stepped: 'Two stacked tiers, the upper one set back, heavy and formal.',
    }),
    carving: choice('How are the skulls carved on its sides?', {
      rows: 'Orderly rows of skulls staring straight out.',
      profile: 'Skulls in profile, each one threaded on a carved stake.',
      crossbones: 'Skulls alternating with crossed long bones.',
    }),
    paint: choice('If its paint survives, what colour is the ground behind the skulls?', {
      red: 'Blood red with bone-white skulls.',
      blue: 'Maya blue with white skulls.',
      ochre: 'Yellow ochre.',
      black: 'Soot black, the skulls stark against it.',
    }),
    rack: choice('What is on the timber rack?', {
      bare: 'Nothing: bare posts and crossbeams, waiting.',
      sparse: 'A few old skulls strung here and there, gaps between them.',
      full: 'Every beam packed temple to temple with skulls.',
      collapsed: 'The rack has fallen in: leaning posts, dropped beams, skulls rolled across the platform.',
    }),
    scale: score('How big is the rack?', ['Two posts and a single beam', 'A modest frame of three tiers', 'A towering wall of five tiers']),
    scene: choice('What is happening around it?', {
      quiet: 'Nothing. It stands alone in the sun.',
      braziers: 'Clay braziers burn at its corners, flames and smoke.',
      vultures: 'Black vultures hunch on the top beam, waiting.',
      trophy: 'A rubber ball and a player\'s stone yoke have been laid on the front edge: the loser\'s gear.',
      flowers: 'Heaps of marigolds are banked along its base, mourning or festival.',
    }),
    stair: noul('Does a small stair climb the front of the platform?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const fresh = Math.max(0, Math.min(1, 1.15 - wear * 1.5));
    const base = stoneTone(wear);
    const ground = lerpHex(lerpHex(base, '#6f675b', 0.35), PAINT[a.paint], fresh * 0.9);
    const bone = lerpHex(base, '#f3ead6', 0.45 + fresh * 0.5);
    const ink = '#2a2320';
    const plain = s.material(base, { roughness: 0.9 });

    const [L, D] = a.platform === 'long' ? [4.4, 1.7] : a.platform === 'square' ? [2.9, 2.6] : [4.6, 2.9];
    const tierH = a.platform === 'stepped' ? 0.6 : a.platform === 'square' ? 1.05 : 0.9;

    const relief = (width: number, height: number) => textured(paintCanvas(Math.min(1024, Math.round(width * 150)), Math.round(height * 150), (ctx, w, h) => {
      stone(ctx, w, h, random, { base: ground, wear: 0 });
      const border = h * 0.13;
      ctx.fillStyle = lerpHex(base, PAINT.cream, fresh * 0.6); ctx.fillRect(0, 0, w, border); ctx.fillRect(0, h - border, w, border);
      fret(ctx, 4, border * 0.1, w, border * 0.8, ink);
      const rows = Math.max(1, Math.round((height * 0.74) / 0.3)), size = (h - border * 2) / rows, cols = Math.floor(w / size);
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols; col++) {
          const cx = (w - cols * size) / 2 + (col + 0.5) * size, cy = border + (row + 0.5) * size;
          if (a.carving === 'crossbones' && (row + col) % 2) {
            ctx.strokeStyle = ink; ctx.lineWidth = size * 0.2; ctx.lineCap = 'round';
            for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx - size * 0.3, cy - d * size * 0.28); ctx.lineTo(cx + size * 0.3, cy + d * size * 0.28); ctx.stroke(); }
            ctx.strokeStyle = bone; ctx.lineWidth = size * 0.11;
            for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx - size * 0.3, cy - d * size * 0.28); ctx.lineTo(cx + size * 0.3, cy + d * size * 0.28); ctx.stroke(); }
            ctx.lineCap = 'butt';
          } else carvedSkull(ctx, cx, cy, size * 0.92, bone, ink, a.carving === 'profile');
        }
      weather(ctx, w, h, random, wear);
    }), { bumpScale: 2.2 });

    // Each tier: a plinth course, the carved band on all four sides, and a projecting cornice.
    const tier = (width: number, depth: number, y: number, height: number) => {
      const long = relief(width, height * 0.72), short = relief(depth, height * 0.72);
      s.box([width + 0.16, height * 0.14, depth + 0.16], [0, y + height * 0.07, 0], plain);
      s.mesh(new THREE.BoxGeometry(width, height * 0.72, depth), [short, short, plain, plain, long, long] as unknown as THREE.Material, [0, y + height * 0.5, 0]);
      s.box([width + 0.22, height * 0.14, depth + 0.22], [0, y + height * 0.93, 0], plain);
    };
    tier(L, D, 0, tierH);
    let top = tierH, topL = L, topD = D;
    if (a.platform === 'stepped') { topL = L - 1.1; topD = D - 1.0; tier(topL, topD, tierH, tierH); top = tierH * 2; }

    if (a.stair) {
      const n = Math.round(top / 0.2), rise = top / n, run = 0.27, z0 = D / 2 + 0.08;
      const profile: [number, number][] = [[z0 - 0.1, 0], [z0 + n * run, 0]];
      for (let i = 0; i < n; i++) profile.push([z0 + (n - i) * run, (i + 1) * rise], [z0 + (n - i - 1) * run, (i + 1) * rise]);
      profile.push([z0 - 0.1, top]);
      const tile = textured(paintCanvas(256, 256, (ctx, w, h) => stone(ctx, w, h, random, { base, wear, course: 64 })), { side: THREE.DoubleSide });
      s.mesh(prism(profile, 1.0, 0.5), tile);
      for (const side of [-1, 1]) s.mesh(prism([[z0 - 0.1, 0], [z0 + n * run + 0.25, 0], [z0 + n * run + 0.25, 0.3], [z0 + 0.2, top + 0.22], [z0 - 0.1, top + 0.22]], 0.26, 0.5), tile, [side * 0.62, 0, 0]);
    }

    // The rack.
    const timber = s.material(lerpHex('#6a4a2e', '#8b877c', wear * 0.8), { roughness: 0.95 });
    const tiers = 1 + Math.round(a.scale * 4);
    const posts = Math.max(2, Math.round((topL - 0.6) / mix(2.2, 1.3, a.scale)) + 1);
    const span = topL - 0.7;
    const gap = 0.44, first = top + 0.5;
    const postH = first - top + (tiers - 1) * gap + 0.3;
    const collapsed = a.rack === 'collapsed';
    const rackZ = a.stair ? -topD * 0.12 : 0;
    const skulls: { p: THREE.Vector3; r: THREE.Euler; s: number }[] = [];
    for (let i = 0; i < posts; i++) {
      const x = -span / 2 + (i / (posts - 1)) * span;
      const lean = collapsed ? (random() - 0.5) * 0.9 : (random() - 0.5) * wear * 0.12;
      const height = collapsed && random() < 0.35 ? postH * (0.3 + random() * 0.3) : postH;
      const post = s.cylinder(0.075, 0.095, height, [x, top + height / 2, rackZ], timber, 8);
      post.geometry.translate(0, height / 2, 0); post.position.y = top;
      post.rotation.set((random() - 0.5) * (collapsed ? 0.5 : 0.04), 0, lean);
    }
    for (let t = 0; t < tiers; t++) {
      const y = first + t * gap;
      const fell = collapsed && random() < 0.7;
      const from = new THREE.Vector3(-span / 2 - 0.25, y, rackZ + 0.09), to = new THREE.Vector3(span / 2 + 0.25, y, rackZ + 0.09);
      if (fell) {
        const low = random() < 0.5 ? from : to;
        low.y = top + 0.06; low.z += (random() - 0.3) * topD * 0.5;
        (low === from ? to : from).y = top + 0.06 + random() * y * 0.6;
      } else { from.y += (random() - 0.5) * wear * 0.1; to.y += (random() - 0.5) * wear * 0.1; }
      s.rod(from.toArray() as [number, number, number], to.toArray() as [number, number, number], 0.04, timber);
      if (a.rack === 'bare') continue;
      const count = Math.floor(span / 0.3);
      for (let k = 0; k < count; k++) {
        const keep = a.rack === 'full' ? 1 - wear * 0.25 : a.rack === 'sparse' ? 0.28 : 0.45;
        if (random() > keep) continue;
        if (fell) {
          // Rolled free: somewhere on the platform top or the ground in front.
          const onTop = random() < 0.6;
          skulls.push({ p: new THREE.Vector3((random() - 0.5) * (onTop ? topL - 0.4 : L + 1), (onTop ? top : 0) + 0.12, onTop ? (random() - 0.5) * (topD - 0.4) : D / 2 + 0.3 + random() * 0.9), r: new THREE.Euler(random() * 6, random() * 6, random() * 6), s: 0.95 + random() * 0.15 });
        } else {
          const u = (k + 0.5) / count;
          const p = from.clone().lerp(to, 0.06 + u * 0.88);
          skulls.push({ p, r: new THREE.Euler((random() - 0.5) * 0.3 + 0.05, (random() - 0.5) * 0.35, (random() - 0.5) * 0.25), s: 0.92 + random() * 0.18 });
        }
      }
    }
    if (skulls.length) {
      const cranium = new THREE.SphereGeometry(0.1, 12, 9); cranium.scale(0.9, 0.95, 1.08); cranium.translate(0, 0.02, -0.015);
      const jaw = new THREE.BoxGeometry(0.105, 0.085, 0.08); jaw.translate(0, -0.075, 0.045);
      const cheek = new THREE.BoxGeometry(0.15, 0.03, 0.06); cheek.translate(0, -0.03, 0.05);
      const boneGeometry = mergeGeometries([cranium, jaw, cheek])!;
      const eye = (x: number) => { const g = new THREE.SphereGeometry(0.03, 8, 6); g.translate(x, 0.008, 0.083); return g; };
      const nose = new THREE.ConeGeometry(0.016, 0.04, 4); nose.translate(0, -0.035, 0.097);
      const teeth = new THREE.BoxGeometry(0.085, 0.012, 0.01); teeth.translate(0, -0.085, 0.086);
      const holeGeometry = mergeGeometries([eye(-0.04), eye(0.04), nose, teeth])!;
      const boneMesh = new THREE.InstancedMesh(boneGeometry, s.material(lerpHex('#efe6cf', '#a9a48f', wear * 0.8), { roughness: 0.75 }), skulls.length);
      const holeMesh = new THREE.InstancedMesh(holeGeometry, new THREE.MeshStandardMaterial({ color: '#17120f', roughness: 1 }), skulls.length);
      const dummy = new THREE.Object3D();
      skulls.forEach((skull, index) => {
        dummy.position.copy(skull.p); dummy.rotation.copy(skull.r); dummy.scale.setScalar(skull.s * 1.35); dummy.updateMatrix();
        boneMesh.setMatrixAt(index, dummy.matrix); holeMesh.setMatrixAt(index, dummy.matrix);
      });
      boneMesh.castShadow = boneMesh.receiveShadow = true;
      s.root.add(boneMesh, holeMesh);
      [cranium, jaw, cheek, nose, teeth].forEach((g) => g.dispose());
    }

    const flames: THREE.Mesh[] = [];
    const rackTop = top + postH;
    if (a.scene === 'braziers') {
      const clay = s.material('#a85a3a', { roughness: 0.85 });
      const fire = new THREE.MeshStandardMaterial({ color: '#ffb23a', emissive: '#ff6a12', emissiveIntensity: 2, roughness: 1 });
      const smoke = new THREE.MeshBasicMaterial({ color: '#efece4', transparent: true, opacity: 0.28, depthWrite: false });
      for (const sx of [-1, 1]) for (const sz of a.platform === 'long' ? [1] : [-1, 1]) {
        const x = sx * (L / 2 + 0.55), z = sz * (D / 2 - 0.2);
        s.lathe([[0.16, 0], [0.1, 0.1], [0.07, 0.45], [0.13, 0.6], [0.26, 0.82], [0.24, 0.84], [0.1, 0.66], [0, 0.66]], clay, [x, 0, z]);
        const flame = s.mesh(new THREE.ConeGeometry(0.16, 0.5, 7), fire, [x, 1.05, z]);
        flames.push(flame);
        s.tube([[x, 1.2, z], [x + 0.15, 1.9, z + 0.1], [x - 0.12, 2.6, z - 0.05], [x + 0.2, 3.4, z + 0.1]], 0.07, smoke).castShadow = false;
      }
    } else if (a.scene === 'vultures') {
      const black = s.material('#1f1c1b', { roughness: 0.8 }), skin = s.material('#b0605a', { roughness: 0.7 });
      const n = 2 + Math.round(mood.density * 3);
      for (let i = 0; i < n; i++) {
        const x = -span / 2 + (i + 0.3 + random() * 0.4) / n * span, y = collapsed ? top : rackTop - 0.3 + 0.04, z = rackZ + (collapsed ? (random() - 0.5) * topD * 0.6 : 0.09);
        const turn = (random() - 0.5) * 1.2;
        const bird = new THREE.Group();
        const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), black); body.scale.set(0.15, 0.24, 0.17); body.position.y = 0.26; body.rotation.x = 0.35;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skin); head.position.set(0, 0.45, 0.16);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 6), s.material('#d8cfb6')); beak.position.set(0, 0.42, 0.23); beak.rotation.x = 2.2;
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.26), black); tail.position.set(0, 0.1, -0.2); tail.rotation.x = -0.8;
        for (const part of [body, head, beak, tail]) { part.castShadow = true; bird.add(part); }
        for (const side of [-1, 1]) { const wing = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), black); wing.scale.set(0.06, 0.25, 0.15); wing.position.set(side * 0.14, 0.27, -0.03); wing.rotation.set(0.4, 0, side * 0.15); wing.castShadow = true; bird.add(wing); }
        bird.position.set(x, y, z); bird.rotation.y = turn; bird.scale.setScalar(1.25);
        s.root.add(bird);
      }
    } else if (a.scene === 'trophy') {
      const z = topD / 2 - 0.35, x = topL * 0.22;
      s.ball([0.14, 0.14, 0.14], [x - 0.5, top + 0.14, z], s.material('#1b1918', { roughness: 0.35 }), 16);
      const yoke = s.ring(0.2, 0.06, [x, top + 0.07, z], s.material('#4f8a66', { roughness: 0.4 }), Math.PI);
      yoke.rotation.set(-Math.PI / 2, 0, 0.5); yoke.scale.set(1, 1.5, 1.2);
      s.box([0.9, 0.012, 0.55], [x - 0.2, top + 0.008, z], s.material(PAINT.red, { roughness: 0.95 })).rotation.y = 0.12;
    } else if (a.scene === 'flowers') {
      const heap: { at: [number, number, number]; size: number; color: string }[] = [];
      const n = 120 + Math.round(mood.density * 260);
      for (let i = 0; i < n; i++) {
        const along = (random() - 0.5) * (L + 0.5), out = random() * random() * 0.6;
        const front = random() < 0.7;
        heap.push({ at: front ? [along, 0.05 + (0.6 - out) * random() * 0.5, D / 2 + 0.12 + out] : [(random() < 0.5 ? -1 : 1) * (L / 2 + 0.12 + out), 0.05 + (0.6 - out) * random() * 0.5, (random() - 0.5) * D], size: 0.045 + random() * 0.035, color: ['#f29a1f', '#f7c62c', '#e8701a', '#f29a1f', '#c9372c'][Math.floor(random() * 5)] });
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.8 }), heap);
    }

    if (wear > 0.5) {
      const n = Math.round((wear - 0.5) * 2 * (5 + mood.density * 9));
      for (let i = 0; i < n; i++) {
        const onTop = random() < 0.35;
        s.root.add(tuft(random, onTop ? [(random() - 0.5) * topL, top, (random() - 0.5) * topD] : [(random() - 0.5) * (L + 0.6), 0, (random() < 0.5 ? -1 : 1) * (D / 2 + 0.15 + random() * 0.3)], 0.3 + random() * 0.4, lerpHex('#3f7a3c', '#8aa648', random() * 0.6)));
      }
    }

    const speed = mix(2, 9, mood.energy);
    return s.finish({
      update: flames.length ? (_dt, time) => flames.forEach((flame, index) => { flame.scale.set(1 + Math.sin(time * speed + index) * 0.12, 1 + Math.sin(time * speed * 1.3 + index * 2) * 0.22, 1); }) : undefined,
    });
  },
});
