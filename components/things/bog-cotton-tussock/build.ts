import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Xf = { p: [number, number, number]; r: [number, number, number]; s?: [number, number, number]; c: THREE.Color };

function instances(root: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, list: Xf[]) {
  if (!list.length) { geometry.dispose(); material.dispose(); return; }
  const mesh = new THREE.InstancedMesh(geometry, material, list.length);
  const d = new THREE.Object3D();
  d.rotation.order = 'YZX';
  list.forEach((it, i) => {
    d.position.set(...it.p);
    d.rotation.set(...it.r);
    d.scale.set(...(it.s ?? [1, 1, 1]));
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
    mesh.setColorAt(i, it.c);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
}

export default defineThing({
  questions: {
    shape: choice('What shape is the tussock?', {
      single: 'One tall shaggy head on a pedestal of its own dead leaves, like a mop.',
      cluster: 'Three hummocks of different sizes crowded together.',
      ridge: 'A line of small tussocks like stepping stones across the wet.',
      mat: 'A low wide mat barely above the water, with stalks scattered across it.',
    }),
    head: choice('What kind of cotton heads does it carry?', {
      hare: 'Hare’s-tail: one round white puff on each stalk, like a rabbit’s scut.',
      common: 'Common cotton-grass: several drooping white tassels nodding from each stalk.',
      giant: 'A few oversized, luxuriant plumes, almost like thistledown or swan feathers.',
    }),
    season: choice('What stage are the heads at?', {
      full: 'Early summer: every head full, clean and white.',
      bud: 'Spring: tight silvery-brown buds only just showing white.',
      seeding: 'Blowing away: the cotton is pulling loose and drifting off downwind.',
      soaked: 'Rain-beaten: the tufts hang grey and draggled like wet wool.',
      winter: 'Winter: no cotton left, only rust-coloured leaves and a few bare stalks.',
    }),
    ground: choice('What does it stand in?', {
      pool: 'A still black bog pool with a clean edge.',
      sphagnum: 'A quaking carpet of red and green sphagnum moss cushions.',
      rain: 'A shallow puddle pocked with spreading rain rings.',
      cracked: 'Peat dried and cracked into plates by a drought.',
      ice: 'A sheet of grey ice with frost on the leaves.',
    }),
    leaf: choice('What colour are the sedge leaves?', {
      green: 'Fresh grey-green.',
      tipped: 'Green at the base, burning to wine red at the tips.',
      straw: 'Bleached straw gold.',
    }),
    company: choice('What is there beside it?', {
      nothing: 'Nothing: it stands alone.',
      asphodel: 'Spikes of yellow bog asphodel.',
      sundew: 'Tiny red sundew rosettes waiting for insects.',
      boot: 'A single wellington boot stuck upright in the mud, its owner gone on without it.',
      stake: 'A leaning stake with a red rag tied to it, marking soft ground.',
      nest: 'A ground nest tucked into its side with speckled eggs.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => lo + (hi - lo) * random();
    const C = (hex: string) => new THREE.Color(hex);
    const winter = a.season === 'winter', frost = a.ground === 'ice';
    const wind = mix(0.08, 0.6, mood.energy);

    const ridgeCount = 4 + Math.floor(random() * 2);
    const hummocks: { x: number; z: number; r: number; h: number }[] =
      a.shape === 'single' ? [{ x: 0, z: 0, r: 0.3, h: 0.52 }]
      : a.shape === 'cluster' ? [{ x: -0.18, z: -0.1, r: 0.36, h: 0.36 }, { x: 0.38, z: 0.12, r: 0.26, h: 0.26 }, { x: -0.1, z: 0.42, r: 0.2, h: 0.18 }]
      : a.shape === 'ridge' ? Array.from({ length: ridgeCount }, (_u, i) => ({ x: (i - (ridgeCount - 1) / 2) * 0.48 + rr(-0.05, 0.05), z: rr(-0.12, 0.12), r: rr(0.17, 0.25), h: rr(0.16, 0.3) }))
      : [{ x: 0, z: 0, r: 0.72, h: 0.12 }];
    const extent = Math.max(...hummocks.map((h) => Math.hypot(h.x, h.z) + h.r));
    const R = extent + mix(0.22, 0.36, random());

    // Leaves.
    const leafBase = C({ green: '#6f8a4e', tipped: '#7a7a3e', straw: '#c2a862' }[a.leaf]);
    const leafAlt = C({ green: '#8a9a58', tipped: '#8e3f3a', straw: '#a88a4a' }[a.leaf]);
    if (winter) { leafBase.lerp(C('#a2562c'), 0.75); leafAlt.lerp(C('#c08a4a'), 0.7); }
    leafBase.lerp(C('#c9a25a'), Math.max(0, mood.warmth - 0.5) * 0.3);
    if (frost) { leafBase.lerp(C('#dfe8ea'), 0.4); leafAlt.lerp(C('#dfe8ea'), 0.45); }
    const blades: Xf[] = [];
    const mound = new THREE.MeshStandardMaterial({ color: C('#4a3f2a').lerp(leafBase, 0.25), roughness: 1 });
    for (const h of hummocks) {
      const body = s.lathe(a.shape === 'single'
        ? [[0, 0], [h.r * 0.75, 0], [h.r * 0.62, h.h * 0.4], [h.r * 0.8, h.h * 0.8], [h.r * 0.55, h.h], [0, h.h * 1.05]]
        : [[0, 0], [h.r, 0], [h.r * 0.95, h.h * 0.45], [h.r * 0.6, h.h * 0.9], [0, h.h]], mound, [h.x, 0, h.z]);
      body.scale.z = rr(0.85, 1);
      const n = Math.round(mix(150, 260, mood.density) * (h.r / 0.3) * (a.shape === 'mat' ? 0.9 : 1));
      for (let i = 0; i < n; i++) {
        const th = random() * 6.28, k = Math.sqrt(random());
        const tilt = k * (a.shape === 'mat' ? 0.9 : 1.35) + rr(-0.15, 0.15);
        const len = rr(0.3, 0.58) * (a.shape === 'single' ? 1.15 : 1) * (0.7 + h.r);
        const at = h.r * k * 0.8;
        const y = h.h * (1 - 0.55 * k * k);
        const tint = leafBase.clone().lerp(leafAlt, random() ** 1.5).offsetHSL(0, 0, rr(-0.05, 0.05));
        blades.push({ p: [h.x + Math.cos(th) * at, y - 0.04, h.z + Math.sin(th) * at], r: [0, -th, -tilt - wind * 0.25 * Math.cos(th)], s: [1, len, 1], c: tint });
      }
    }
    const blade = new THREE.ConeGeometry(0.017, 1, 4);
    blade.translate(0, 0.5, 0);
    instances(s.root, blade, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), blades);

    // Stalks and cotton heads live in one group that leans and sways with the wind.
    const crown = new THREE.Group();
    s.root.add(crown);
    const stalks: Xf[] = [], puffs: Xf[] = [], loose: Xf[] = [];
    const white = C(a.season === 'soaked' ? '#b9bab2' : '#f6f4ea').lerp(C('#fff1d2'), Math.max(0, mood.warmth - 0.6) * 0.5);
    const per = { hare: 1, common: 1, giant: 0.35 }[a.head] * (winter ? 0.25 : 1);
    for (const h of hummocks) {
      const n = Math.max(winter ? 1 : 3, Math.round(mix(7, 26, mood.density) * (h.r / 0.3) ** 1.3 * per));
      for (let i = 0; i < n; i++) {
        const th = random() * 6.28, k = Math.sqrt(random()) * 0.8;
        const x = h.x + Math.cos(th) * h.r * k, z = h.z + Math.sin(th) * h.r * k;
        const y0 = h.h * (1 - 0.5 * k * k) - 0.03;
        const len = rr(0.32, 0.62) * (a.head === 'giant' ? 1.25 : 1) * (a.season === 'bud' ? 0.7 : 1);
        const lz = -(rr(0.02, 0.2) + Math.cos(th) * k * 0.25), lx = rr(-0.12, 0.12) + Math.sin(th) * k * 0.25;
        stalks.push({ p: [x, y0, z], r: [lx, 0, lz], s: [1, len, 1], c: leafBase.clone().lerp(C('#8a7a4a'), 0.5) });
        // Tip of the stalk under rotation order YZX with y = 0: rotate about x, then z.
        const tip = new THREE.Vector3(0, len, 0).applyEuler(new THREE.Euler(lx, 0, lz, 'YZX')).add(new THREE.Vector3(x, y0, z));
        if (winter && random() < 0.7) continue;
        const tint = () => white.clone().offsetHSL(0, 0, rr(-0.05, 0.01));
        const big = a.head === 'giant' ? 1.9 : 1;
        if (a.season === 'bud') { puffs.push({ p: [tip.x, tip.y, tip.z], r: [0, 0, lz], s: [0.017 * big, 0.04 * big, 0.017 * big], c: C('#8f866f').lerp(white, random() * 0.5) }); continue; }
        const stream = a.season === 'seeding' ? 2.2 : 1, droop = a.season === 'soaked';
        if (a.head === 'common') {
          const tassels = 3 + Math.floor(random() * 3);
          for (let t = 0; t < tassels; t++) {
            const ang = droop ? rr(-0.2, 0.2) : a.season === 'seeding' ? rr(1.0, 1.5) : rr(0.1, 1.2) * (random() < 0.85 ? 1 : -1);
            const l = rr(0.04, 0.06) * (a.season === 'seeding' ? 1.5 : 1);
            puffs.push({ p: [tip.x + Math.sin(ang) * l * 0.9, tip.y - Math.cos(ang) * l * 0.9, tip.z + rr(-0.03, 0.03)], r: [0, 0, ang], s: [droop ? 0.014 : 0.024, l, droop ? 0.014 : 0.024], c: tint() });
          }
        } else {
          const r0 = (droop ? 0.03 : 0.042) * big * rr(0.85, 1.15);
          puffs.push({ p: [tip.x + r0 * 0.3 * stream, tip.y + (droop ? -r0 * 0.6 : r0 * 0.2), tip.z], r: [0, rr(0, 3), droop ? 0 : -0.5], s: [r0 * (droop ? 0.7 : 1.05) * stream, r0 * (droop ? 1.5 : 1.15), r0 * (droop ? 0.7 : 1)], c: tint() });
          if (!droop) for (let t = 0; t < 2; t++) puffs.push({ p: [tip.x + rr(0, 0.03) * stream * big, tip.y + rr(-0.01, 0.03) * big, tip.z + rr(-0.02, 0.02) * big], r: [rr(0, 3), rr(0, 3), 0], s: [r0 * 0.7 * stream, r0 * 0.75, r0 * 0.7], c: tint() });
        }
        if (a.season === 'seeding' && random() < 0.7) {
          const d = rr(0.15, R * 0.9);
          loose.push({ p: [tip.x + d, tip.y + rr(-0.15, 0.25), tip.z + rr(-0.3, 0.3)], r: [rr(0, 3), rr(0, 3), rr(0, 3)], s: [rr(0.02, 0.04), rr(0.008, 0.016), rr(0.012, 0.02)], c: tint() });
        }
      }
    }
    const stalk = new THREE.CylinderGeometry(0.0045, 0.007, 1, 5);
    stalk.translate(0, 0.5, 0);
    instances(crown, stalk, new THREE.MeshStandardMaterial({ roughness: 0.9 }), stalks);
    const cotton = () => new THREE.MeshStandardMaterial({ roughness: 1, emissive: '#ffffff', emissiveIntensity: a.season === 'soaked' ? 0.02 : 0.12, flatShading: false });
    instances(crown, new THREE.IcosahedronGeometry(1, 1), cotton(), puffs);
    const drift = new THREE.Group();
    s.root.add(drift);
    instances(drift, new THREE.IcosahedronGeometry(1, 0), cotton(), loose);

    // Ground.
    const disc = (radius: number, material: THREE.Material, y = 0.012) => {
      const m = s.cylinder(radius, radius * 1.02, 0.03, [0, y, 0], material, 40);
      m.scale.z = 0.86;
      m.castShadow = false;
      return m;
    };
    const rim = () => { const t = s.ring(R, 0.045, [0, 0.02, 0], s.material('#3c3423', { roughness: 1 })); t.rotation.x = Math.PI / 2; t.scale.y = 0.86; };
    const ringMaterial = new THREE.MeshStandardMaterial({ color: '#8f9aa0', roughness: 0.2 });
    if (a.ground === 'pool' || a.ground === 'rain') {
      disc(R, new THREE.MeshStandardMaterial({ color: a.ground === 'pool' ? '#11171b' : '#2a3338', roughness: 0.06, metalness: 0.5 }));
      rim();
      const rings = a.ground === 'rain' ? Math.round(mix(8, 22, mood.energy)) : 2;
      for (let i = 0; i < rings; i++) {
        const th = random() * 6.28, d = a.ground === 'rain' ? Math.sqrt(random()) * R * 0.85 : 0;
        const ring = s.ring(a.ground === 'rain' ? rr(0.03, 0.12) : extent + 0.1 + i * 0.12, 0.004, [Math.cos(th) * d, 0.03, Math.sin(th) * d * 0.86], ringMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.castShadow = false;
        if (a.ground === 'pool') ring.scale.y = 0.86;
      }
    } else if (a.ground === 'sphagnum') {
      disc(R, s.material('#3a3a22', { roughness: 0.6 }));
      const palette = ['#7d3a33', '#667230', '#8f5038', '#7f8a3e', '#9a7a3c', '#55622c', '#6c2f38', '#667230'];
      const moss: Xf[] = [];
      for (let i = 0; i < Math.round(mix(160, 260, mood.density)); i++) {
        const th = random() * 6.28, d = Math.sqrt(random()) * R * 0.97, size = rr(0.035, 0.085);
        moss.push({ p: [Math.cos(th) * d, 0.02, Math.sin(th) * d * 0.86], r: [0, rr(0, 3), 0], s: [size, size * 0.45, size], c: C(palette[Math.floor(random() * palette.length)]).offsetHSL(0, 0, rr(-0.04, 0.04)) });
      }
      instances(s.root, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.75 }), moss);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const g = canvas.getContext('2d')!;
      g.fillStyle = frost ? '#aeb9bd' : '#5a4636';
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = frost ? 'rgba(240,248,250,0.9)' : 'rgba(20,14,10,0.9)';
      for (let i = 0; i < (frost ? 14 : 34); i++) {
        g.lineWidth = frost ? rr(0.6, 1.6) : rr(1.5, 4);
        g.beginPath();
        let x = rr(0, 256), y = rr(0, 256);
        g.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += rr(-45, 45); y += rr(-45, 45); g.lineTo(x, y); }
        g.stroke();
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const top = new THREE.MeshStandardMaterial({ map: tex, roughness: frost ? 0.15 : 1, metalness: frost ? 0.2 : 0 });
      const m = s.cylinder(R, R * 1.02, 0.03, [0, 0.012, 0], [s.material(frost ? '#9aa6aa' : '#3d2e24'), top, top] as unknown as THREE.Material, 40);
      m.scale.z = 0.86;
      m.castShadow = false;
    }

    // Company.
    const cx = extent * 0.75 + 0.18, cz = R * 0.45;
    if (a.company === 'asphodel' || a.company === 'sundew') {
      const list: Xf[] = [], stems: Xf[] = [];
      const yellow = a.company === 'asphodel';
      for (let i = 0; i < Math.round(mix(5, 14, mood.density)); i++) {
        const th = rr(-0.3, 2.6), d = rr(extent + 0.05, R * 0.92);
        const x = Math.cos(th) * d, z = Math.sin(th) * d * 0.86;
        if (yellow) {
          const hgt = rr(0.14, 0.28);
          stems.push({ p: [x, 0.02, z], r: [rr(-0.1, 0.1), 0, rr(-0.1, 0.1)], s: [1, hgt, 1], c: C('#7a8a3a') });
          for (let k = 0; k < 5; k++) list.push({ p: [x + rr(-0.012, 0.012), 0.02 + hgt * (0.55 + k * 0.11), z + rr(-0.012, 0.012)], r: [0, rr(0, 3), 0], s: [0.022, 0.016, 0.022], c: C(k > 3 ? '#e8a52c' : '#f1cf3a') });
        } else {
          for (let k = 0; k < 6; k++) { const an = (k / 6) * 6.28; list.push({ p: [x + Math.cos(an) * 0.04, 0.035, z + Math.sin(an) * 0.04], r: [0, 0, 0], s: [0.024, 0.01, 0.024], c: C('#c8342c').offsetHSL(0, 0, rr(-0.05, 0.05)) }); }
          list.push({ p: [x, 0.035, z], r: [0, 0, 0], s: [0.016, 0.012, 0.016], c: C('#8fa03c') });
        }
      }
      instances(s.root, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: yellow ? '#5a4500' : '#3a0500', emissiveIntensity: 0.4 }), list);
      const st = new THREE.CylinderGeometry(0.004, 0.005, 1, 4);
      st.translate(0, 0.5, 0);
      instances(s.root, st, new THREE.MeshStandardMaterial({ roughness: 0.9 }), stems);
    } else if (a.company === 'boot') {
      const rubber = s.material(mood.cheer > 0.6 ? '#c7a51f' : mood.cheer > 0.3 ? '#2f4a36' : '#1d1f22', { roughness: 0.35 });
      const g = new THREE.Group();
      g.position.set(cx, 0, cz);
      g.rotation.set(rr(-0.2, 0.05), rr(-1, 1), rr(0.1, 0.35));
      s.root.add(g);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.3, 12, 1, true), rubber);
      (leg.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      leg.position.y = 0.2;
      const foot = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), rubber);
      foot.scale.set(0.065, 0.05, 0.13);
      foot.position.set(0, 0.05, 0.06);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 6, 16), rubber);
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.35;
      for (const m of [leg, foot, band]) { m.castShadow = true; g.add(m); }
      s.ball([0.16, 0.03, 0.14], [cx, 0.02, cz], s.material('#2a211b', { roughness: 0.5 }), 12);
    } else if (a.company === 'stake') {
      const g = new THREE.Group();
      g.position.set(cx, 0, cz);
      g.rotation.set(rr(-0.1, 0.1), 0, rr(-0.28, -0.12));
      s.root.add(g);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.95, 6), s.material('#9a8a6a', { roughness: 0.95 }));
      post.position.y = 0.45;
      post.castShadow = true;
      g.add(post);
      const rag = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.09, 4, 1), s.material(C('#c5281f').lerp(C('#8a5a50'), mood.wear * 0.6), { side: THREE.DoubleSide, roughness: 1 }));
      const p = rag.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { p.setX(i, p.getX(i) + 0.1); p.setY(i, p.getY(i) - (p.getX(i) ** 2) * mix(2.5, 0.3, mood.energy)); p.setZ(i, Math.sin(p.getX(i) * 30) * 0.012); }
      rag.geometry.computeVertexNormals();
      rag.position.set(0.015, 0.84, 0);
      rag.castShadow = true;
      rag.userData.flag = true;
      g.add(rag);
    } else if (a.company === 'nest') {
      const h0 = hummocks[0];
      const nx = h0.x + h0.r * 0.95, nz = h0.z + h0.r * 0.55;
      const nest = s.ring(0.075, 0.03, [nx, 0.06, nz], s.material('#8a744a', { roughness: 1 }));
      nest.rotation.x = Math.PI / 2;
      s.cylinder(0.075, 0.06, 0.03, [nx, 0.04, nz], s.material('#5e4d30', { roughness: 1 }), 12);
      for (let i = 0; i < 4; i++) s.ball([0.022, 0.028, 0.022], [nx + Math.cos(i * 1.57) * 0.03, 0.075, nz + Math.sin(i * 1.57) * 0.03], s.material(mood.cheer > 0.5 ? '#9fc7c2' : '#b8ae94', { roughness: 0.4 }), 8).rotation.z = rr(-0.6, 0.6);
    }

    const lean = -wind * 0.45;
    crown.rotation.z = lean;
    const pivot = hummocks[0].h * 0.4;
    crown.position.set(Math.sin(lean) * pivot, pivot * (1 - Math.cos(lean)), 0);
    const flags: THREE.Object3D[] = [];
    s.root.traverse((n) => { if (n.userData.flag) flags.push(n); });
    const sway = mix(0.01, 0.12, mood.energy), speed = mix(0.8, 4.5, mood.energy);
    return s.finish({
      footprint: R * 0.8,
      update(_dt, time) {
        crown.rotation.z = lean + Math.sin(time * speed) * sway + Math.sin(time * speed * 2.7) * sway * 0.3;
        drift.position.x = ((time * mood.energy * 0.25) % 0.4);
        for (const f of flags) f.rotation.y = Math.sin(time * speed * 1.7) * 0.25;
      },
    });
  },
});
