import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

/** A lumpy raked pile: a lathe whose radius wobbles with angle so no two sides match. */
function pileGeometry(random: () => number, slump: number) {
  const profile: [number, number][] = [[1, 0], [0.86, 0.14], [0.62, 0.42], [0.36, 0.72], [0.14, 0.93], [0.001, 1]];
  const geometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x * mix(1, 1.18, slump), y * mix(1, 0.72, slump))), 18);
  const p1 = random() * 6.3, p2 = random() * 6.3, p3 = random() * 6.3;
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const angle = Math.atan2(z, x);
    const wobble = 1 + (0.09 * Math.sin(angle * 3 + p1) + 0.06 * Math.sin(angle * 5 + p2) + 0.04 * Math.sin(angle * 9 + p3 + y * 7)) * (1 - y * 0.6);
    position.setXYZ(i, x * wobble, y, z * wobble);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function crustTexture(random: () => number, base: string, line: string, wet: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  const r = 46;
  for (let row = -1; row < 9; row++)
    for (let col = -1; col < 8; col++) {
      const cx = col * r * 1.732 + (row % 2 ? r * 0.866 : 0), cy = row * r * 1.5;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = Math.PI / 6 + k * Math.PI / 3;
        const px = cx + Math.cos(a) * r + (random() - 0.5) * 7, py = cy + Math.sin(a) * r + (random() - 0.5) * 7;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.globalAlpha = 0.45 + random() * 0.45;
      ctx.stroke();
    }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 26 * wet; i++) {
    ctx.fillStyle = 'rgba(120,150,175,0.28)';
    ctx.beginPath();
    ctx.ellipse(random() * 512, random() * 512, 20 + random() * 60, 12 + random() * 34, random() * 3, 0, 6.3);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    layout: choice('How are the piles arranged?', {
      ranks: 'Strict parade-ground ranks and files, a grid receding across the flat.',
      staggered: 'Offset rows like a quincunx orchard, each pile in the gap of the row behind.',
      line: 'One single long line of piles marching away to the horizon.',
      arc: 'A sweeping curved windrow, as if raked around a pond edge.',
      loose: 'Unevenly spaced and sized, the work of several people who never agreed.',
    }),
    extent: score('How much of the harvest is laid out?', ['Three or four piles, barely started', 'A couple of short rows', 'A full working plot', 'A whole field of them']),
    height: score('How big is each pile?', ['Ankle-high scrapings', 'Knee high', 'Waist-high mounds']),
    left: choice('What tool was left behind?', {
      shovel: 'A long-handled shovel standing upright, stabbed into one pile.',
      rake: 'A wide wooden salt rake lying across the ground between rows.',
      barrow: 'A steel wheelbarrow half loaded with salt, parked mid-row.',
      sacks: 'A stack of filled woven sacks, tied and waiting for a truck.',
      nothing: 'No tools at all, only the piles.',
    }),
    story: choice('What happened to the workday?', {
      noon: 'Abandoned at noon: everything exactly where it was dropped, a hat hung on the handle.',
      carting: 'Half carted away already: empty damp rings where the nearest piles stood.',
      rained: 'Rain came in: the piles have slumped and stand in shallow pools.',
      fresh: 'Raked minutes ago: crisp sharp cones with clean scraped circles around them.',
      forgotten: 'Forgotten for a season: piles crusted hard and grey, one collapsed.',
    }),
    salt: choice('What does the salt look like?', {
      white: 'Blinding clean white.',
      grey: 'Damp grey-white, heavy with brine.',
      pink: 'Faintly pink, tinted by algae and minerals.',
      tan: 'Tan and dusty, with earth blown into it.',
    }),
    ground: choice('What is the ground under them?', {
      crust: 'Dry cracked hexagonal salt crust.',
      scraped: 'Smooth scraped pan, the crust already harvested.',
      flooded: 'A film of water over the crust, patchily reflecting sky.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const slump = a.story === 'rained' ? 0.9 : a.story === 'forgotten' ? 0.55 : a.story === 'fresh' ? 0 : 0.25 + mood.wear * 0.3;
    const base = new THREE.Color({ white: '#f4f3ee', grey: '#cfd2d2', pink: '#f0d9d6', tan: '#e2d3b8' }[a.salt]);
    if (a.story === 'forgotten') base.lerp(new THREE.Color('#a9a69c'), 0.25);
    base.lerp(new THREE.Color('#8c8478'), mood.wear * 0.2);
    base.lerp(new THREE.Color(mood.warmth > 0.5 ? '#ffe2c4' : '#d4e4f6'), Math.abs(mood.warmth - 0.5) * 0.3);

    // How many, and where.
    const amount = Math.min(1, a.extent * 0.8 + mood.density * 0.3);
    const spots: { x: number; z: number }[] = [];
    const gap = mix(1.25, 1.9, a.height);
    if (a.layout === 'line') {
      const n = Math.round(mix(4, 13, amount));
      for (let i = 0; i < n; i++) spots.push({ x: (random() - 0.5) * 0.15, z: (i - (n - 1) / 2) * gap });
    } else if (a.layout === 'arc') {
      const rows = amount > 0.6 ? 2 : 1, n = Math.round(mix(5, 11, amount));
      for (let r = 0; r < rows; r++) {
        const radius = 5 + r * gap * 1.1;
        for (let i = 0; i < n + r; i++) {
          const t = (i / (n + r - 1) - 0.5) * mix(0.9, 2.2, amount);
          spots.push({ x: Math.sin(t) * radius, z: -Math.cos(t) * radius + 5 });
        }
      }
    } else {
      const rows = Math.round(mix(1.6, 4, amount)), cols = Math.round(mix(3, 7, amount));
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const shift = a.layout === 'staggered' && r % 2 ? 0.5 : 0;
          const loose = a.layout === 'loose' ? 0.75 : 0.12;
          if (a.layout === 'loose' && random() < 0.14 && spots.length > 2) continue;
          spots.push({ x: (c + shift - (cols - 1) / 2) * gap + (random() - 0.5) * loose, z: (r - (rows - 1) / 2) * gap * 1.05 + (random() - 0.5) * loose });
        }
    }

    // Half carted away: the piles nearest the viewer are gone, their rings remain.
    const order = spots.map((spot, index) => ({ spot, index })).sort((p, q) => q.spot.z + q.spot.x * 0.3 - (p.spot.z + p.spot.x * 0.3));
    const gone = new Set<number>();
    if (a.story === 'carting') for (const { index } of order.slice(0, Math.max(1, Math.floor(spots.length * mix(0.3, 0.5, random()))))) gone.add(index);
    const collapsed = a.story === 'forgotten' ? order[Math.floor(random() * order.length)].index : -1;

    const radiusBase = mix(0.42, 0.74, a.height), heightBase = mix(0.36, 1.0, a.height);
    const saltPaint = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, flatShading: a.story === 'forgotten' });
    const variants = [0, 1, 2].map(() => pileGeometry(random, slump));
    const dummy = new THREE.Object3D();
    const piles: { x: number; z: number; r: number; h: number }[] = [];
    variants.forEach((geometry, v) => {
      const mine = spots.map((spot, index) => ({ spot, index })).filter(({ index }) => index % 3 === v && !gone.has(index));
      if (!mine.length) { geometry.dispose(); return; }
      const mesh = new THREE.InstancedMesh(geometry, saltPaint, mine.length);
      mine.forEach(({ spot, index }, i) => {
        const vary = a.layout === 'loose' ? mix(0.6, 1.35, random()) : mix(0.88, 1.1, random());
        const r = radiusBase * vary, h = heightBase * vary * (index === collapsed ? 0.35 : mix(0.9, 1.1, random()));
        dummy.position.set(spot.x, 0, spot.z);
        dummy.rotation.set(0, random() * 6.3, 0);
        dummy.scale.set(r * (index === collapsed ? 1.5 : 1), h, r * (index === collapsed ? 1.3 : 1));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, base.clone().offsetHSL(0, 0, (random() - 0.5) * 0.05));
        piles.push({ x: spot.x, z: spot.z, r, h });
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    });

    // The pan: an irregular patch of crust the piles were scraped from.
    const reach = Math.max(...spots.map((spot) => Math.hypot(spot.x, spot.z))) + radiusBase + 1.1;
    const minX = Math.min(...spots.map((p) => p.x)) - radiusBase - 1, maxX = Math.max(...spots.map((p) => p.x)) + radiusBase + 1;
    const minZ = Math.min(...spots.map((p) => p.z)) - radiusBase - 1, maxZ = Math.max(...spots.map((p) => p.z)) + radiusBase + 1;
    const shape = new THREE.Shape();
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, hx = (maxX - minX) / 2, hz = (maxZ - minZ) / 2;
    const q1 = random() * 6.3, q2 = random() * 6.3;
    for (let i = 0; i <= 48; i++) {
      const t = i / 48 * Math.PI * 2;
      // A squarish blob: superellipse with a wobbling edge.
      const c = Math.cos(t), sn = Math.sin(t);
      const k = 1 / Math.pow(Math.pow(Math.abs(c), 3.5) + Math.pow(Math.abs(sn), 3.5), 1 / 3.5) * (1 + 0.035 * Math.sin(t * 5 + q1) + 0.025 * Math.sin(t * 11 + q2));
      const px = cx + c * k * hx, py = -(cz + sn * k * hz);
      if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py);
    }
    const wet = a.ground === 'flooded' ? 1 : a.story === 'rained' ? 0.7 : 0;
    const groundBase = base.clone().lerp(new THREE.Color(a.ground === 'scraped' ? '#c2bcab' : '#cfc9b8'), 0.8).lerp(new THREE.Color('#9fb3c4'), wet * 0.35);
    const texture = crustTexture(random, `#${groundBase.getHexString()}`, a.ground === 'scraped' ? 'rgba(150,145,130,0.18)' : 'rgba(120,112,98,0.75)', wet);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(0.22, 0.22);
    const pan = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false, curveSegments: 4 }), new THREE.MeshStandardMaterial({ map: texture, roughness: mix(0.9, 0.25, wet), metalness: wet * 0.25 }));
    pan.rotation.x = -Math.PI / 2;
    pan.position.y = -0.05;
    pan.receiveShadow = true;
    s.root.add(pan);
    void reach;

    // Scrape rings: darker damp circles where each pile was raked together (or stood).
    const ringPaint = new THREE.MeshStandardMaterial({ color: groundBase.clone().multiplyScalar(wet ? 0.7 : 0.8), roughness: wet ? 0.2 : 0.95, metalness: wet * 0.3 });
    const ringGeometry = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
    const rings = new THREE.InstancedMesh(ringGeometry, ringPaint, spots.length);
    spots.forEach((spot, i) => {
      const r = radiusBase * (gone.has(i) ? 1.15 : mix(1.35, 1.7, slump)) * mix(0.95, 1.1, random());
      dummy.position.set(spot.x, 0.004, spot.z);
      dummy.rotation.set(0, random() * 6.3, 0);
      dummy.scale.set(r, 1, r * mix(0.9, 1.1, random()));
      dummy.updateMatrix();
      rings.setMatrixAt(i, dummy.matrix);
    });
    rings.receiveShadow = true;
    s.root.add(rings);
    // Crumbs of salt left in the emptied rings.
    const crumbs = [...gone].flatMap((i) => Array.from({ length: 7 }, () => {
      const t = random() * 6.3, d = random() * radiusBase;
      return { at: [spots[i].x + Math.cos(t) * d, 0.02, spots[i].z + Math.sin(t) * d] as const, size: 0.03 + random() * 0.07, color: base };
    }));
    if (crumbs.length) s.scatter(new THREE.DodecahedronGeometry(1, 0), saltPaint, crumbs);

    // The tool.
    const wood = s.material('#7d5630', { roughness: 0.8 });
    const steel = s.material(mood.wear > 0.6 ? '#6b4634' : '#4f585e', { metalness: 0.6, roughness: 0.5 });
    const front = piles.slice().sort((p, q) => q.z + q.x * 0.2 - (p.z + p.x * 0.2));
    const host = front[Math.min(front.length - 1, 1 + Math.floor(random() * 2))] ?? { x: 0, z: 0, r: radiusBase, h: heightBase };
    const fallen = a.story === 'forgotten';
    let hatAt: [number, number, number] | null = null;
    if (a.left === 'shovel') {
      const tool = new THREE.Group();
      const sub = new Sculpture(context);
      sub.rod([0, 0.28, 0], [0, 1.32, 0], 0.019, wood);
      sub.ring(0.06, 0.014, [0, 1.38, 0], wood);
      sub.box([0.12, 0.016, 0.03], [0, 1.32, 0], wood);
      const blade = sub.box([0.23, 0.3, 0.014], [0, 0.14, 0], steel);
      blade.geometry.translate(0, 0, 0.012);
      sub.cylinder(0.024, 0.03, 0.14, [0, 0.31, 0], steel, 10);
      tool.add(sub.root);
      if (fallen) {
        tool.rotation.set(0, random() * 6.3, Math.PI / 2 - 0.04);
        tool.position.set(host.x + host.r * 1.5, 0.05, host.z + 0.4);
      } else {
        tool.rotation.set((random() - 0.5) * 0.25, random() * 6.3, 0.12 + random() * 0.14);
        tool.position.set(host.x + host.r * 0.12, host.h * 0.55, host.z + host.r * 0.1);
        hatAt = [tool.position.x - Math.sin(tool.rotation.z) * 1.75, tool.position.y + 1.8, tool.position.z];
      }
      tool.scale.setScalar(1.25);
      s.root.add(tool);
    } else if (a.left === 'rake') {
      const tool = new THREE.Group();
      const sub = new Sculpture(context);
      sub.rod([0, 0, 0], [0, 0, 1.7], 0.018, wood);
      sub.box([0.85, 0.05, 0.035], [0, 0, 0], wood);
      for (let i = 0; i < 9; i++) sub.box([0.016, 0.11, 0.016], [-0.38 + i * 0.095, -0.06, 0], wood);
      for (const side of [-1, 1]) sub.rod([side * 0.3, 0, 0], [0, 0, 0.5], 0.01, wood);
      tool.add(sub.root);
      tool.position.set(host.x + host.r + 0.55, 0.13, host.z + 0.1);
      tool.rotation.set(-0.02, 0.6 + random() * 1.2, fallen ? 1.4 : 0);
      tool.scale.setScalar(1.3);
      s.root.add(tool);
    } else if (a.left === 'barrow') {
      const tool = new THREE.Group();
      const sub = new Sculpture(context);
      const tray = s.material(mood.cheer > 0.55 ? '#2f7d4f' : '#55606a', { metalness: 0.4, roughness: 0.55 });
      const trayMesh = sub.mesh(new THREE.CylinderGeometry(0.5, 0.3, 0.32, 4, 1, true).rotateY(Math.PI / 4), tray, [0, 0.52, 0]);
      trayMesh.scale.set(0.95, 1, 1.45);
      (tray as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      sub.box([0.42, 0.02, 0.62], [0, 0.37, 0], tray);
      sub.ball([0.3, 0.2, 0.42], [0, 0.6, 0.03], saltPaint.clone(), 12).material = new THREE.MeshStandardMaterial({ color: base, roughness: 0.92 });
      const wheel = sub.cylinder(0.19, 0.19, 0.08, [0, 0.19, 0.72], s.material('#26282a'), 16);
      wheel.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) {
        sub.rod([side * 0.06, 0.19, 0.72], [side * 0.3, 0.4, 0.2], 0.016, steel);
        sub.rod([side * 0.3, 0.4, 0.2], [side * 0.36, 0.58, -1.05], 0.016, steel);
        sub.rod([side * 0.3, 0.38, -0.35], [side * 0.3, 0, -0.42], 0.016, steel);
        sub.cylinder(0.024, 0.024, 0.16, [side * 0.36, 0.58, -1.0], s.material('#2b2b2b'), 8).rotation.x = Math.PI / 2 - 0.15;
      }
      tool.add(sub.root);
      tool.position.set(host.x + host.r + 0.75, 0, host.z + 0.2);
      tool.rotation.y = random() * 6.3;
      tool.scale.setScalar(1.2);
      if (fallen) { tool.rotation.z = 1.25; tool.position.y = 0.3; }
      s.root.add(tool);
    } else if (a.left === 'sacks') {
      const cloth = s.material(mood.cheer > 0.6 ? '#d8c690' : '#c9bda0', { roughness: 0.95 });
      const count = 3 + Math.floor(random() * 3 + mood.density * 3);
      for (let i = 0; i < count; i++) {
        const layer = i < 3 ? 0 : i < 5 ? 1 : 2, slot = layer === 0 ? i : layer === 1 ? i - 3 : 0;
        const sack = s.ball([0.19, 0.13, 0.36], [host.x + host.r + 0.6 + (slot - 1 + layer * 0.5) * 0.4, 0.13 + layer * 0.22, host.z + 0.2 + (random() - 0.5) * 0.08], cloth, 12);
        sack.rotation.y = (random() - 0.5) * 0.35 + (layer % 2 ? Math.PI / 2 : 0);
      }
    }
    // Abandoned at noon: a hat on the handle, a bottle and a jacket by the pile.
    if (a.story === 'noon') {
      const straw = s.material('#d9b96a', { roughness: 0.9 });
      const at = hatAt ?? [host.x - host.r * 0.9, 0.02, host.z + host.r * 1.2];
      const hat = new THREE.Group();
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.012, 20), straw);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.1, 16), straw);
      crown.position.y = 0.05;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.103, 0.103, 0.025, 16), s.material(mood.cheer > 0.5 ? '#c8413a' : '#4a3a2c'));
      band.position.y = 0.02;
      hat.add(brim, crown, band);
      hat.traverse((node) => { node.castShadow = true; });
      hat.position.set(...at);
      hat.rotation.z = hatAt ? 0.3 : 0;
      s.root.add(hat);
      const bx = host.x + host.r * 1.25, bz = host.z + host.r * 0.5;
      s.cylinder(0.04, 0.045, 0.24, [bx, 0.12, bz], s.material('#3f8fb5', { transparent: true, opacity: 0.8, roughness: 0.2 }), 10);
      s.cylinder(0.018, 0.02, 0.04, [bx, 0.26, bz], s.material('#e7e7e7'), 8);
      const jacket = s.ball([0.26, 0.05, 0.2], [bx + 0.3, 0.05, bz + 0.25], s.material(mood.cheer > 0.5 ? '#d2603a' : '#44566b', { roughness: 0.95 }), 10);
      jacket.rotation.y = random() * 3;
    }
    // Rain or flood: shallow pools between the piles.
    if (wet > 0) {
      const water = new THREE.MeshStandardMaterial({ color: '#a9c2d6', roughness: 0.08, metalness: 0.55 });
      const pools = Array.from({ length: Math.round(mix(3, 8, random()) * wet) }, () => ({
        x: mix(minX + 0.6, maxX - 0.6, random()), z: mix(minZ + 0.6, maxZ - 0.6, random()), r: mix(0.4, 1.1, random()),
      }));
      const mesh = new THREE.InstancedMesh(ringGeometry.clone(), water, pools.length);
      pools.forEach((pool, i) => {
        dummy.position.set(pool.x, 0.009, pool.z);
        dummy.rotation.set(0, random() * 6.3, 0);
        dummy.scale.set(pool.r * mix(1, 1.8, random()), 1, pool.r);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    return s.finish();
  },
});
