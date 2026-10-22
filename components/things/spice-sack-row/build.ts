import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const SPICES = {
  saffron: 'Saffron threads, a deep red-orange heap worth more than the sack that holds it.',
  turmeric: 'Turmeric, a blazing yellow powder.',
  pepper: 'Black peppercorns, dark and beaded.',
  rose: 'Dried rosebuds, dusty pink and crumpled.',
  chilli: 'Ground red chilli, brick red and hot.',
  cardamom: 'Pale green cardamom pods.',
  indigo: 'Indigo powder, a startling blue among the food.',
  cumin: 'Cumin seed, dull brown and ordinary.',
} as const;
type Spice = keyof typeof SPICES;
const LOOK: Record<Spice, { colour: string; bead: number }> = {
  saffron: { colour: '#d9481c', bead: 0 },
  turmeric: { colour: '#f0b01c', bead: 0 },
  pepper: { colour: '#2c2622', bead: 0.017 },
  rose: { colour: '#d77f95', bead: 0.026 },
  chilli: { colour: '#b3261c', bead: 0 },
  cardamom: { colour: '#9fb86a', bead: 0.02 },
  indigo: { colour: '#2c3f9c', bead: 0 },
  cumin: { colour: '#a17a45', bead: 0.012 },
};

function cloth(base: string, stripe: string | null, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  if (stripe) {
    ctx.fillStyle = stripe;
    for (let x = 0; x < 256; x += 64) { ctx.fillRect(x + 10, 0, 14, 256); ctx.fillRect(x + 30, 0, 4, 256); }
  }
  for (let i = 0; i < 64; i++) {
    ctx.fillStyle = `rgba(40,25,10,${0.06 + random() * 0.12})`;
    ctx.fillRect(0, i * 4, 256, 1.4);
    ctx.fillStyle = `rgba(255,240,210,${0.04 + random() * 0.1})`;
    ctx.fillRect(i * 4, 0, 1.2, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 1);
  return texture;
}

export default defineThing({
  questions: {
    hero: choice('Which spice sits in the middle sack, the one the eye goes to?', SPICES),
    range: choice('What is the rest of the row like?', {
      rainbow: 'Every sack a different colour, a showy rainbow of a stall.',
      fiery: 'Reds, oranges and yellows: chilli, saffron, turmeric, all heat.',
      earthy: 'Browns, blacks and dull greens: pepper, cumin, cardamom, a cook\'s working stock.',
      single: 'Sack after sack of the very same spice, a wholesaler\'s lot.',
    }),
    count: score('How many sacks are there?', ['Just three', 'Five', 'A long row of seven']),
    layout: choice('How are the sacks set out?', {
      row: 'A straight shoulder-to-shoulder row.',
      arc: 'A shallow curve around where the seller would sit.',
      tiered: 'Two ranks, the back one raised on a plank so every cone shows.',
    }),
    state: choice('What is happening at the stall right now?', {
      heaped: 'Just set out: every cone raked to a sharp, perfect peak.',
      trading: 'Mid-morning trade: cones scooped down and lopsided, some sacks half empty.',
      spilled: 'An accident: the end sack has tipped over and fanned its spice across the ground.',
      packing: 'Packing up to move on: most necks are tied shut with cord and only one or two still stand open.',
    }),
    cloth: choice('What are the sacks made of?', {
      burlap: 'Coarse tan jute burlap.',
      striped: 'Homespun with faded blue-black caravan stripes.',
      bleached: 'Pale washed cotton, almost white.',
      dyed: 'Madder-dyed red-brown cloth, rich and proud.',
    }),
    scoop: choice('What is used to measure it out?', {
      brass: 'A bright brass scoop stuck upright in the heap.',
      wood: 'A carved wooden scoop lying on the cone.',
      cup: 'A dented tin cup.',
      none: 'Nothing: it is sold by the handful.',
    }),
    under: choice('What do the sacks stand on?', {
      ground: 'The bare ground.',
      mat: 'A woven reed mat.',
      carpet: 'A red patterned carpet.',
    }),
    bowls: noul('Are there small sample bowls set out in front?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const grey = new THREE.Color('#8d857a');
    const tone = (hex: string) => new THREE.Color(hex).lerp(grey, mix(0.38, 0, mood.cheer) + mood.wear * 0.08);

    const n = Math.max(3, Math.min(8, 3 + Math.round(a.count * 4) + (mood.density > 0.8 ? 1 : 0)));
    const pools: Record<typeof a.range, Spice[]> = {
      rainbow: ['turmeric', 'pepper', 'rose', 'cardamom', 'saffron', 'indigo', 'chilli', 'cumin'],
      fiery: ['turmeric', 'chilli', 'saffron', 'rose', 'turmeric', 'chilli', 'saffron'],
      earthy: ['pepper', 'cumin', 'cardamom', 'pepper', 'cumin', 'cardamom', 'pepper'],
      single: [a.hero],
    };
    const pool = pools[a.range].filter((spice) => a.range === 'single' || spice !== a.hero);
    const shift = Math.floor(random() * pool.length);
    const middle = Math.floor(n / 2);

    const clothColours = { burlap: ['#b3915c', null], striped: ['#c4b08a', '#2f3a55'], bleached: ['#e6dfcc', null], dyed: ['#8f4030', null] } as const;
    const [base, stripe] = clothColours[a.cloth];
    const clothMat = new THREE.MeshStandardMaterial({ map: cloth(`#${tone(base).getHexString()}`, stripe, random), roughness: 0.95, side: THREE.DoubleSide });
    const cord = s.material('#5d4630');
    const spiceMats = new Map<Spice, THREE.MeshStandardMaterial>();
    const spiceMat = (spice: Spice) => {
      if (!spiceMats.has(spice)) spiceMats.set(spice, new THREE.MeshStandardMaterial({ color: tone(LOOK[spice].colour), roughness: 0.9, emissive: tone(LOOK[spice].colour), emissiveIntensity: 0.12 }));
      return spiceMats.get(spice)!;
    };
    const beadGeo = new THREE.IcosahedronGeometry(0.02, 0);
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const lathe = (points: [number, number][], seg = 20) => new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg);

    /** A heap: a lathe cone, beaded with instanced grains when the spice is whole. */
    const heap = (parent: THREE.Object3D, spice: Spice, r: number, y: number, h: number, lean: number) => {
      const cone = put(parent, lathe([[r, y - 0.03], [r * 0.82, y + h * 0.22], [r * 0.48, y + h * 0.62], [r * 0.16, y + h * 0.93], [0, y + h]]), spiceMat(spice));
      cone.position.x = lean * r * 0.2;
      const bead = LOOK[spice].bead;
      if (bead) {
        const count = 70;
        const grains = new THREE.InstancedMesh(beadGeo, spiceMat(spice), count);
        const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
        for (let i = 0; i < count; i++) {
          const t = random() ** 1.3, angle = random() * Math.PI * 2, rr = r * (1 - t) * 0.95;
          const size = bead * mix(0.7, 1.3, random()) / 0.02;
          e.set(random() * 3, random() * 3, random() * 3);
          matrix.compose(new THREE.Vector3(Math.cos(angle) * rr + lean * r * 0.2, y + h * t * 0.97, Math.sin(angle) * rr), q.setFromEuler(e), new THREE.Vector3(size, size * 0.8, size));
          grains.setMatrixAt(i, matrix);
        }
        grains.castShadow = true;
        parent.add(grains);
      }
      return cone;
    };

    const sack = (spice: Spice, r: number, h: number, level: number, open: boolean, lean: number) => {
      const g = new THREE.Group();
      if (open) {
        put(g, lathe([[0, 0], [r * 0.72, 0], [r * 1.0, h * 0.07], [r * 1.1, h * 0.32], [r * 1.05, h * 0.65], [r * 0.97, h * 0.92], [r * 0.93, h]]), clothMat);
        // The rolled-down neck: a fat soft collar.
        const collar = put(g, new THREE.TorusGeometry(r * 0.97, r * 0.17, 8, 24), clothMat, 0, h, 0);
        collar.rotation.x = Math.PI / 2;
        collar.scale.z = 0.75;
        heap(g, spice, r * 0.9, h, r * mix(0.12, 1.3, level), lean);
      } else {
        const top = h * 1.55;
        put(g, lathe([[0, 0], [r * 0.72, 0], [r * 1.0, h * 0.1], [r * 1.1, h * 0.45], [r * 1.0, h * 0.95], [r * 0.6, top * 0.86], [r * 0.2, top * 0.93], [r * 0.17, top * 0.97], [r * 0.34, top * 1.06], [r * 0.3, top * 1.1]]), clothMat);
        const tie = put(g, new THREE.TorusGeometry(r * 0.2, r * 0.05, 6, 14), cord, 0, top * 0.95, 0);
        tie.rotation.x = Math.PI / 2;
        // A smear of what is inside, so the row still reads as spice.
        put(g, new THREE.SphereGeometry(r * 0.16, 8, 6), spiceMat(spice), r * 0.9, h * 0.5, r * 0.5).scale.set(0.5, 1.2, 1);
      }
      g.scale.set(mix(0.93, 1.07, random()), mix(0.93, 1.05, random()), mix(0.93, 1.07, random()));
      g.rotation.y = random() * Math.PI * 2;
      s.root.add(g);
      return g;
    };

    const openWhenPacking = new Set([middle, random() < 0.5 ? middle + 1 : -1]);
    const tipped = a.state === 'spilled' ? (random() < 0.5 ? 0 : n - 1) : -1;
    const pitch = 0.5;
    const spots: [number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const spice = i === middle ? a.hero : pool[(i + shift + (i > middle ? -1 : 0) + pool.length) % pool.length];
      const big = i === middle ? 1.12 : 1;
      const r = 0.2 * big * mix(0.92, 1.08, random()), h = 0.36 * big * mix(0.85, 1.12, random());
      let x = (i - (n - 1) / 2) * pitch, z = 0, y = 0;
      if (a.layout === 'arc') { const angle = (i - (n - 1) / 2) * 0.33; x = Math.sin(angle) * 1.45; z = -(1 - Math.cos(angle)) * 1.45 * 1.3; }
      if (a.layout === 'tiered') { const back = i % 2 === 1; x = (i - (n - 1) / 2) * pitch * 0.62; z = back ? -0.36 : 0.12; y = back ? 0.3 : 0; }
      x += (random() - 0.5) * 0.04; z += (random() - 0.5) * 0.06;
      const level = { heaped: mix(0.85, 1, random()), trading: mix(0.1, 0.75, random()), spilled: mix(0.6, 0.95, random()), packing: mix(0.3, 0.7, random()) }[a.state];
      const lean = a.state === 'trading' ? (random() - 0.5) * 2 : (random() - 0.5) * 0.3;
      const open = a.state !== 'packing' || openWhenPacking.has(i);
      if (i === tipped) {
        const side = i === 0 ? -1 : 1;
        const g = sack(spice, r, h, 0.15, true, 0);
        g.rotation.set(0, 0, 0);
        g.rotation.z = -side * 1.42;
        g.rotation.y = -side * 0.5;
        g.position.set(x + side * 0.05, y + r * 1.05, z + 0.1);
        // The fan of spilled spice running away from the mouth.
        const fan = put(s.root, new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), spiceMat(spice), x + side * 0.52, y, z + 0.33);
        fan.scale.set(0.34, 0.07, 0.24);
        fan.rotation.y = side * 0.5;
        const drift = put(s.root, new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), spiceMat(spice), x + side * 0.8, y, z + 0.52);
        drift.scale.set(0.2, 0.025, 0.16);
        spots.push([x + side * 0.3, y, z]);
        continue;
      }
      const g = sack(spice, r, h, level, open, lean);
      g.position.set(x, y, z);
      spots.push([x, y, z]);

      if (i === middle && a.scoop !== 'none' && open) {
        const top = y + h + r * mix(0.12, 1.3, level) * 0.55;
        const tool = new THREE.Group();
        if (a.scoop === 'brass') {
          const brass = s.material('#d9a93c', { metalness: 0.85, roughness: 0.3, emissive: '#6b4a10', emissiveIntensity: 0.25 });
          const bowl = put(tool, new THREE.CylinderGeometry(0.05, 0.036, 0.13, 14, 1, true, 0, Math.PI * 1.35), brass, 0, 0.1, 0);
          bowl.material.side = THREE.DoubleSide;
          put(tool, new THREE.CylinderGeometry(0.036, 0.036, 0.006, 14), brass, 0, 0.165, 0);
          put(tool, new THREE.CylinderGeometry(0.011, 0.014, 0.16, 8), brass, 0, 0.25, 0);
          put(tool, new THREE.SphereGeometry(0.02, 10, 8), brass, 0, 0.34, 0);
          tool.rotation.set(0.35, random() * 6, 0.3);
        } else if (a.scoop === 'wood') {
          const wood = s.material('#7a5230');
          put(tool, new THREE.SphereGeometry(0.055, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), wood, 0, 0.05, 0).scale.set(1, 0.7, 1.5);
          put(tool, new THREE.CylinderGeometry(0.012, 0.016, 0.2, 8), wood, 0, 0.04, -0.17).rotation.x = Math.PI / 2 - 0.15;
          tool.rotation.set(-0.5, random() * 6, 0);
        } else {
          const tin = s.material('#b9bcb8', { metalness: 0.7, roughness: 0.45 });
          const cup = put(tool, new THREE.CylinderGeometry(0.05, 0.042, 0.09, 14, 1, true), tin, 0, 0.06, 0);
          cup.material.side = THREE.DoubleSide;
          put(tool, new THREE.TorusGeometry(0.03, 0.006, 6, 12, Math.PI), tin, 0.05, 0.06, 0).rotation.z = -Math.PI / 2;
          tool.rotation.set(0.5, random() * 6, 0.25);
        }
        tool.position.set(x + r * 0.12, top - 0.03, z + r * 0.3);
        s.root.add(tool);
      }
    }

    const xs = spots.map((spot) => spot[0]), zs = spots.map((spot) => spot[2]);
    const minX = Math.min(...xs) - 0.42, maxX = Math.max(...xs) + 0.42, minZ = Math.min(...zs) - 0.34, maxZ = Math.max(...zs) + 0.34;
    const front = maxZ + (a.bowls ? 0.3 : 0.08) + (tipped >= 0 ? 0.3 : 0);
    if (a.layout === 'tiered') {
      const wood = s.material('#7b5a3a');
      s.box([maxX - minX - 0.2, 0.05, 0.5], [(minX + maxX) / 2, 0.275, -0.36], wood);
      for (const x of [minX + 0.25, (minX + maxX) / 2, maxX - 0.25]) s.box([0.2, 0.25, 0.42], [x, 0.125, -0.36], s.material('#b9764f'));
    }
    if (a.under !== 'ground') {
      const w = maxX - minX + (tipped >= 0 ? 0.5 : 0), d = front - minZ;
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      if (a.under === 'mat') {
        ctx.fillStyle = `#${tone('#c9b377').getHexString()}`; ctx.fillRect(0, 0, 512, 256);
        for (let x = 0; x < 512; x += 6) { ctx.fillStyle = `rgba(90,70,30,${0.15 + random() * 0.25})`; ctx.fillRect(x, 0, 2, 256); }
        ctx.fillStyle = 'rgba(70,40,20,0.55)';
        for (const y of [18, 128, 232]) ctx.fillRect(0, y, 512, 6);
      } else {
        ctx.fillStyle = `#${tone('#8e2a22').getHexString()}`; ctx.fillRect(0, 0, 512, 256);
        ctx.strokeStyle = '#e8d3a0'; ctx.lineWidth = 6; ctx.strokeRect(14, 14, 484, 228);
        ctx.strokeStyle = '#23304f'; ctx.lineWidth = 8; ctx.strokeRect(30, 30, 452, 196);
        for (let i = 0; i < 6; i++) {
          const cx = 80 + i * 70;
          ctx.fillStyle = i % 2 ? '#e8d3a0' : '#23304f';
          ctx.beginPath(); ctx.moveTo(cx, 78); ctx.lineTo(cx + 30, 128); ctx.lineTo(cx, 178); ctx.lineTo(cx - 30, 128); ctx.fill();
          ctx.fillStyle = '#c9772e';
          ctx.beginPath(); ctx.arc(cx, 128, 9, 0, 7); ctx.fill();
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const rug = s.box([w, 0.02, d], [(minX + maxX) / 2 + (tipped === 0 ? -0.25 : tipped > 0 ? 0.25 : 0), 0.01, (minZ + front) / 2], new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 }));
      rug.rotation.y = (random() - 0.5) * 0.05;
    }
    if (a.bowls) {
      const clay = s.material('#a9603f'), brassy = s.material('#c99b3a', { metalness: 0.7, roughness: 0.4 });
      const count = Math.max(2, Math.round(mix(2, n, mood.density)));
      for (let i = 0; i < count; i++) {
        const x = mix(minX + 0.4, maxX - 0.4, count === 1 ? 0.5 : i / (count - 1)) + (random() - 0.5) * 0.12, z = maxZ + 0.1 + random() * 0.08;
        const spice = i % 2 ? a.hero : pool[(i + shift) % pool.length];
        const g = new THREE.Group();
        const bowl = put(g, lathe([[0, 0], [0.04, 0], [0.085, 0.045], [0.09, 0.055], [0.08, 0.05]], 14), random() < 0.3 ? brassy : clay);
        (bowl.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
        put(g, lathe([[0.078, 0.045], [0.04, 0.075], [0, 0.09]], 12), spiceMat(spice));
        g.position.set(x, 0.02, z);
        s.root.add(g);
      }
    }
    return s.finish();
  },
});
