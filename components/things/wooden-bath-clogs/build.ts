import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

function painted(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Outline of a right sole, toe toward +y, in units of its own length. */
function soleShape(mirror: boolean, bare = false) {
  const pts: [number, number][] = [[0, -0.5], [0.13, -0.47], [0.165, -0.3], [0.14, -0.08], [0.17, 0.12], [0.2, 0.3], [0.15, 0.45], [0.04, 0.5], [-0.09, 0.46], [-0.17, 0.3], [-0.16, 0.08], [-0.13, -0.1], [-0.15, -0.3], [-0.12, -0.46]];
  const k = bare ? 0.82 : 1;
  const shape = new THREE.Shape();
  const curve = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2((mirror ? -x : x) * k, y)));
  shape.setFromPoints(curve.getPoints(40));
  return shape;
}

export default defineThing({
  questions: {
    arrangement: choice('How have the clogs been left?', {
      jumble: 'Kicked off in a heap, toes every way, some upside down or on top of each other.',
      row: 'Lined up in tidy pairs, toes to the door.',
      rack: 'Stowed in a low wooden pigeonhole rack, with the overflow on the floor in front.',
      lone: 'Just one pair, side by side, nobody else here.',
      scattered: 'Spread thinly across the floor, each pair where its owner stepped out of it.',
    }),
    crowd: score('How many people have left their clogs?', ['Two or three', 'A dozen', 'A packed bathhouse']),
    make: choice('What kind of clogs are they?', {
      slab: 'Flat thick slabs of pale wood with a broad leather band over the toes.',
      stilted: 'Soles raised on two cross blocks like little benches, to keep feet off a scalding floor.',
      thong: 'Carved soles with a thong between the toes.',
      cork: 'Chunky cork soles with a soft cloth strap, a lady\'s pair.',
    }),
    straps: choice('What are the straps like?', {
      leather: 'All the same plain brown leather: bathhouse loaners.',
      mixed: 'Everyone\'s own: red, green, ochre, black, no two pairs alike.',
      red: 'Dyed bright red.',
      studded: 'Dark leather with small bronze studs.',
    }),
    child: noul('Is there a small child\'s pair among them?'),
    story: choice('What is the telling detail?', {
      none: 'Nothing; every clog has its mate.',
      odd: 'One clog has no partner anywhere.',
      broken: 'One has a snapped strap and lies on its side.',
      footprints: 'Wet bare footprints cross the floor from the doorway to a gap where a pair has just been taken.',
      apart: 'One pair is set carefully apart from the rest, perfectly square, with a folded cloth on top.',
    }),
    floor: choice('What do they stand on?', {
      marble: 'Pale marble paving in front of a stone door sill.',
      mat: 'A woven reed mat.',
      tiles: 'Small wet terracotta tiles with puddles.',
      duckboard: 'A slatted wooden duckboard.',
      mosaic: 'Black and white mosaic with a CAVE or SALVE style greeting at the door.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;

    const lone = a.arrangement === 'lone';
    const pairs = lone ? 1 : Math.max(2, Math.round(mix(2, 11, a.crowd) * mix(0.8, 1.25, mood.density)));
    const L = 0.26;
    const thick = { slab: 0.04, stilted: 0.026, thong: 0.03, cork: 0.055 }[a.make];
    const lift = a.make === 'stilted' ? 0.045 : 0;

    // Shared geometry for left and right soles.
    const soles = [false, true].map((mirror) => {
      const g = new THREE.ExtrudeGeometry(soleShape(mirror), { depth: thick / L, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, steps: 1 });
      g.rotateX(-Math.PI / 2);
      return g;
    });
    const band = new THREE.TorusGeometry(0.17, 0.016, 6, 14, Math.PI);
    band.scale(1, 0.62, 5.5);
    const post = new THREE.CylinderGeometry(0.012, 0.012, 0.11, 6);
    const tooth = new THREE.BoxGeometry(0.34, 1, 0.13);
    const stud = new THREE.SphereGeometry(0.014, 6, 4);
    const woodTones = a.make === 'cork' ? ['#b9925f', '#a9824f', '#c7a274'] : ['#c79a62', '#a67843', '#8a6238', '#d6b382'];
    const strapTones = { leather: ['#6b4329'], mixed: ['#a3312a', '#3f6b4a', '#c9973a', '#2b2a2a', '#6b4329', '#31557f', '#e8dcc0'], red: ['#b02a25'], studded: ['#2f2622'] }[a.straps];
    const bronze = s.material('#c79a3f', { metalness: 0.8, roughness: 0.35 });
    const materials = new Map<string, THREE.MeshStandardMaterial>();
    const paint = (hex: string, rough: number) => {
      const key = hex + rough;
      if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color('#5a4a3a'), wear * 0.45), roughness: rough }));
      return materials.get(key)!;
    };

    const makeClog = (left: boolean, size: number, wood: string, strap: string, snapped = false) => {
      const g = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3) => { const m = new THREE.Mesh(geometry, material); m.position.set(...at); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
      add(soles[left ? 1 : 0], paint(wood, 0.75), [0, lift / L, 0]);
      const top = (lift + thick) / L + 0.012;
      const strapMat = paint(strap, a.make === 'cork' ? 1 : 0.6);
      const side = left ? -1 : 1;
      if (a.make === 'thong') {
        add(post, strapMat, [side * 0.04, top + 0.05, -0.3]);
        for (const dir of [-1, 1]) { const arm = add(post, strapMat, [side * 0.04 + dir * 0.08, top + 0.07, -0.19]); arm.scale.y = 2.3; arm.rotation.set(1.15, 0, -dir * 0.75, 'ZXY'); }
      } else if (snapped) {
        for (const dir of [-1, 1]) { const flap = add(new THREE.BoxGeometry(0.09, 0.012, 0.16), strapMat, [dir * 0.2 + side * 0.01, top + 0.02, -0.2]); flap.rotation.z = dir * -0.5; }
      } else {
        add(band, strapMat, [side * 0.015, top - 0.012, -0.2]);
        if (a.straps === 'studded') for (let i = 0; i < 5; i++) { const an = Math.PI * (0.18 + i * 0.16); add(stud, bronze, [side * 0.015 + Math.cos(an) * 0.185, top - 0.012 + Math.sin(an) * 0.185 * 0.62, -0.2]); }
      }
      if (a.make === 'stilted') for (const z of [-0.24, 0.26]) { const t = add(tooth, paint(wood, 0.8), [side * 0.01, lift / L / 2, z]); t.scale.y = lift / L; }
      g.scale.setScalar(L * size);
      return g;
    };

    // Floor patch and door sill.
    let W = 1.1, D = 0.95;
    const extra = (a.child ? 1 : 0) + (a.story === 'apart' ? 1 : 0);
    const perRow = Math.min(pairs, 5);
    if (a.arrangement === 'row' || lone) { W = Math.max(perRow + (lone ? extra : 0), 1.6) * 0.27 + 0.14; D = (Math.ceil((pairs + (lone ? 0 : extra) + (a.story === 'apart' ? 1 : 0)) / perRow)) * 0.34 + 0.14; }
    if (a.arrangement === 'rack') { W = 1.3; D = 0.86; }
    if (a.arrangement === 'jumble') W = D = 0.62 + pairs * 0.04;
    if (a.arrangement === 'scattered') { W = 0.8 + pairs * 0.075; D = 0.7 + pairs * 0.05; }
    const T = 0.04;
    const stone = s.material('#dcd6c8', { roughness: mix(0.35, 0.85, wear) });
    if (a.floor === 'marble') {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) s.box([W / 2 - 0.006, T, D / 2 - 0.006], [(i - 0.5) * W / 2, T / 2, (j - 0.5) * D / 2], s.material(['#e4dfd3', '#d6d0c2', '#dedacd', '#cfc9bb'][(i * 2 + j + Math.floor(random() * 4)) % 4], { roughness: mix(0.3, 0.8, wear) }));
    } else if (a.floor === 'mat') {
      s.box([W + 0.1, T * 0.6, D + 0.1], [0, T * 0.3, 0], stone);
      const reed = new THREE.MeshStandardMaterial({ roughness: 1, map: painted(256, (ctx, n) => { ctx.fillStyle = '#b89a55'; ctx.fillRect(0, 0, n, n); for (let y = 0; y < n; y += 8) for (let x = 0; x < n; x += 16) { ctx.fillStyle = `hsl(${40 + random() * 8},${40 + random() * 12}%,${44 + random() * 16}%)`; ctx.fillRect(x + ((y / 8) % 2 ? 8 : 0), y, 15, 7); } ctx.strokeStyle = '#7a3a2a'; ctx.lineWidth = 8; ctx.strokeRect(14, 14, n - 28, n - 28); }) });
      s.box([W - 0.06, T * 0.4, D - 0.1], [0, T * 0.8, 0.02], reed);
    } else if (a.floor === 'tiles' || a.floor === 'mosaic') {
      const map = painted(512, (ctx, n) => {
        if (a.floor === 'tiles') { ctx.fillStyle = '#6a4a3a'; ctx.fillRect(0, 0, n, n); const c = n / 10; for (let x = 0; x < 10; x++) for (let y = 0; y < 10; y++) { ctx.fillStyle = `hsl(${12 + random() * 10},${46 + random() * 10}%,${40 + random() * 12}%)`; ctx.fillRect(x * c + 2, y * c + 2, c - 4, c - 4); } }
        else {
          const cells = 40, c = n / cells;
          ctx.fillStyle = '#efe9da'; ctx.fillRect(0, 0, n, n);
          ctx.fillStyle = '#1d1b1a'; ctx.fillRect(c * 2, c * 2, n - c * 4, c); ctx.fillRect(c * 2, n - c * 3, n - c * 4, c); ctx.fillRect(c * 2, c * 2, c, n - c * 4); ctx.fillRect(n - c * 3, c * 2, c, n - c * 4);
          ctx.font = `bold ${n * 0.17}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(['SALVE', 'BENE LAVA', 'CAVE', 'HAVE'][Math.floor(random() * 4)], n / 2, n * 0.2, n * 0.8);
          ctx.strokeStyle = '#efe9da'; ctx.lineWidth = 1; for (let i = 0; i <= cells; i++) { ctx.beginPath(); ctx.moveTo(i * c, 0); ctx.lineTo(i * c, n); ctx.moveTo(0, i * c); ctx.lineTo(n, i * c); ctx.stroke(); }
          for (let i = 0; i < wear * 90; i++) { ctx.fillStyle = '#9a917f'; ctx.fillRect(Math.floor(random() * cells) * c, Math.floor(random() * cells) * c, c * (1 + Math.floor(random() * 2)), c); }
        }
      });
      const face = new THREE.MeshStandardMaterial({ map, roughness: a.floor === 'tiles' ? 0.35 : 0.7 });
      const slab = new THREE.Mesh(new THREE.BoxGeometry(W, T, D), [stone, stone, face, stone, stone, stone]);
      slab.position.y = T / 2; slab.castShadow = slab.receiveShadow = true; s.root.add(slab);
    } else {
      s.box([W + 0.06, T * 0.3, D + 0.06], [0, T * 0.15, 0], stone);
      const slats = Math.round(D / 0.085);
      for (let i = 0; i < slats; i++) s.box([W, T * 0.45, D / slats - 0.016], [0, T * 0.78, -D / 2 + (i + 0.5) * D / slats], paint(['#9c7a4c', '#8a6a40', '#a8875a'][i % 3], 0.85));
      for (const x of [-1, 1]) s.box([0.06, T * 0.3, D], [x * W * 0.36, T * 0.42, 0], paint('#7a5c38', 0.9));
    }
    const sillZ = -D / 2 - 0.09;
    s.box([W + 0.1, T + 0.05, 0.18], [0, (T + 0.05) / 2, sillZ], stone);
    if (a.floor === 'tiles') for (let i = 0; i < 4; i++) { const puddle = s.cylinder(0.06 + random() * 0.08, 0.1, 0.003, [(random() - 0.5) * W * 0.8, T + 0.002, (random() - 0.5) * D * 0.8], new THREE.MeshStandardMaterial({ color: '#7fa9ad', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.6 }), 16); puddle.scale.z = 0.6 + random() * 0.6; puddle.castShadow = false; }

    // Decide every pair, then stand the clogs.
    interface Spot { x: number; z: number; y: number; yaw: number; size: number; wood: string; strap: string; gap: number; loose: boolean }
    const spots: Spot[] = [];
    const pick = <V,>(list: readonly V[]) => list[Math.floor(random() * list.length)];
    const newPair = (x: number, z: number, yaw: number, loose: boolean, y = T): Spot => ({ x, z, y, yaw, size: 0.9 + random() * 0.22, wood: pick(woodTones), strap: pick(strapTones), gap: 0.055, loose });
    let rackTop = 0;
    if (a.arrangement === 'row' || lone) {
      for (let i = 0; i < pairs; i++) {
        const row = Math.floor(i / perRow), col = i % perRow;
        spots.push(newPair(-W / 2 + 0.2 + col * 0.27 + (random() - 0.5) * 0.02, -D / 2 + 0.22 + row * 0.34 + (random() - 0.5) * 0.02, (random() - 0.5) * 0.12, false));
      }
    } else if (a.arrangement === 'rack') {
      const bays = 4, shelves = 2, bw = 0.3, bh = 0.17, depth = 0.34;
      const rw = bays * bw + 0.03, rz = -D / 2 + depth / 2 + 0.03;
      const rackWood = paint('#7a5a38', 0.85);
      for (let k = 0; k <= shelves; k++) s.box([rw, 0.022, depth], [0, T + 0.011 + k * bh, rz], rackWood);
      for (let k = 0; k <= bays; k++) s.box([0.022, shelves * bh + 0.022, depth], [-rw / 2 + 0.011 + k * (rw - 0.022) / bays, T + (shelves * bh + 0.022) / 2, rz], rackWood);
      s.box([rw, shelves * bh + 0.022, 0.012], [0, T + (shelves * bh + 0.022) / 2, rz - depth / 2], rackWood);
      rackTop = T + shelves * bh + 0.022;
      let placed = 0;
      for (let k = 0; k < shelves && placed < pairs; k++) for (let b = 0; b < bays && placed < pairs; b++) {
        if (random() < 0.18 && pairs < 8) continue;
        spots.push(newPair(-rw / 2 + (b + 0.5) * rw / bays, rz + 0.03, (random() - 0.5) * 0.15, false, T + 0.022 + k * bh));
        placed++;
      }
      for (; placed < pairs; placed++) spots.push(newPair((random() - 0.5) * (W - 0.3), rz + depth / 2 + 0.2 + random() * (D - depth - 0.4), (random() - 0.5) * 1.6, true));
    } else {
      const tight = a.arrangement === 'jumble';
      for (let i = 0; i < pairs; i++) {
        const r = Math.sqrt(random()) * (tight ? 0.7 : 1), an = random() * Math.PI * 2;
        spots.push(newPair(Math.cos(an) * r * (W / 2 - 0.17), Math.sin(an) * r * (D / 2 - 0.17), tight ? random() * Math.PI * 2 : (random() - 0.5) * 1.2, tight));
      }
    }
    if (a.child) {
      const kid = newPair(0, 0, 0, a.arrangement === 'jumble');
      kid.size = 0.55; kid.gap = 0.035; kid.strap = a.straps === 'mixed' ? '#c9973a' : kid.strap;
      if (lone) { kid.x = spots[0].x + 0.25; kid.z = spots[0].z + 0.03; }
      else if (a.arrangement === 'row') { const n = spots.length; kid.x = -W / 2 + 0.2 + (n % perRow) * 0.27; kid.z = -D / 2 + 0.24 + Math.floor(n / perRow) * 0.34; }
      else { kid.x = (random() - 0.5) * W * 0.5; kid.z = D / 2 - 0.2; kid.yaw = (random() - 0.5) * 0.8; }
      spots.push(kid);
    }
    let apartAt: Spot | null = null;
    if (a.story === 'apart' && !lone) {
      apartAt = newPair(W / 2 - 0.17, D / 2 - 0.2, 0, false);
      if (a.arrangement === 'row') { const n = spots.length + (spots.length % perRow === 0 ? 0 : 0); apartAt.x = W / 2 - 0.2; apartAt.z = -D / 2 + 0.22 + Math.floor(n / perRow) * 0.34; if (n % perRow === 0 || n % perRow < perRow - 1) { /* room on this row */ } else apartAt.z += 0.34; }
      apartAt.size = 1; spots.push(apartAt);
    }
    const victim = a.story === 'odd' || a.story === 'broken' || a.story === 'footprints' ? Math.floor(random() * Math.max(1, spots.length - (a.child ? 1 : 0))) : -1;

    const lying: { x: number; z: number; top: number }[] = [];
    spots.forEach((spot, index) => {
      if (a.story === 'footprints' && index === victim && !lone && spots.length > 2) return; // taken
      for (const left of [true, false]) {
        if (a.story === 'odd' && index === victim && left) continue;
        const snapped = a.story === 'broken' && index === victim && !left;
        const clog = makeClog(left, spot.size, spot.wood, spot.strap, snapped);
        const off = (left ? -1 : 1) * spot.gap * spot.size;
        let x = spot.x + Math.cos(spot.yaw) * off, z = spot.z - Math.sin(spot.yaw) * off, yaw = spot.yaw, y = spot.y;
        let roll = 0, pitch = 0;
        if (spot.loose) {
          x += (random() - 0.5) * 0.16; z += (random() - 0.5) * 0.16; yaw += (random() - 0.5) * 1.6;
          const under = lying.filter((other) => Math.hypot(other.x - x, other.z - z) < 0.13 * spot.size);
          if (under.length) { y = Math.min(Math.max(...under.map((other) => other.top)) - 0.012, T + 0.1 + random() * 0.03); pitch = (random() - 0.5) * 0.5; roll = (random() - 0.5) * 0.5; }
          else if (random() < 0.16) { roll = Math.PI; y += (lift + thick + 0.05) * spot.size; }
        }
        if (snapped) { roll = Math.PI / 2 * 0.92; y += 0.045 * spot.size; }
        clog.position.set(x, y, z);
        clog.rotation.set(pitch, yaw, roll, 'YXZ');
        s.root.add(clog);
        lying.push({ x, z, top: y + (lift + thick + 0.02) * spot.size });
      }
    });

    if (apartAt) {
      const cloth = s.material(mood.cheer > 0.5 ? '#e9dfc6' : '#b9b3a4', { roughness: 1 });
      const top = T + lift + thick + 0.05;
      for (let i = 0; i < 3; i++) s.box([0.2 - i * 0.008, 0.014, 0.15 - i * 0.008], [apartAt.x, top + 0.04 + i * 0.015, apartAt.z + 0.03], cloth).rotation.y = (random() - 0.5) * 0.06;
    }
    if (a.story === 'footprints') {
      const wet = new THREE.MeshStandardMaterial({ color: a.floor === 'tiles' ? '#3d2a22' : '#6f6a60', roughness: 0.15, transparent: true, opacity: 0.55, depthWrite: false });
      const target = spots[Math.max(0, victim)];
      const from = new THREE.Vector2((random() - 0.5) * 0.2, -D / 2 + 0.06), to = new THREE.Vector2(target.x, target.z);
      const steps = Math.max(3, Math.round(from.distanceTo(to) / 0.2));
      const dir = to.clone().sub(from).normalize();
      const yaw = Math.atan2(-dir.x, -dir.y) + Math.PI;
      for (let i = 0; i < steps; i++) {
        const left = i % 2 === 0, p = from.clone().lerp(to, i / steps);
        const print = new THREE.Mesh(new THREE.ShapeGeometry(soleShape(left, true)), wet);
        print.rotation.set(-Math.PI / 2, 0, yaw + (left ? 0.12 : -0.12), 'YXZ');
        print.rotation.set(-Math.PI / 2, yaw + (left ? 0.12 : -0.12), 0, 'YXZ');
        print.scale.setScalar(0.23 * (1 - i * 0.02));
        print.position.set(p.x + (left ? -1 : 1) * dir.y * 0.06, (a.floor === 'duckboard' ? T * 1.01 : T) + 0.002, p.y - (left ? -1 : 1) * dir.x * 0.06);
        s.root.add(print);
      }
    }
    if (rackTop && mood.density > 0.5) {
      const cloth = s.material('#d9cfb6', { roughness: 1 });
      for (let i = 0; i < 2; i++) s.box([0.26, 0.03 + i * 0.01, 0.2], [-0.35 + i * 0.5 + (random() - 0.5) * 0.1, rackTop + 0.02, -D / 2 + 0.2], cloth).rotation.y = (random() - 0.5) * 0.3;
    }
    return s.finish();
  },
});
