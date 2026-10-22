import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Family = 'reds' | 'blues' | 'greens' | 'yellows' | 'neutrals' | 'pastels' | 'mistints';
const RANGE: Record<Family, [number, number, number, number, number, number]> = {
  // hue from, hue to, saturation from/to, lightness from/to
  reds: [0.95, 1.04, 0.55, 0.85, 0.3, 0.6],
  blues: [0.53, 0.67, 0.4, 0.8, 0.28, 0.62],
  greens: [0.24, 0.44, 0.3, 0.65, 0.25, 0.58],
  yellows: [0.08, 0.16, 0.6, 0.95, 0.45, 0.68],
  neutrals: [0.07, 0.13, 0.04, 0.2, 0.45, 0.85],
  pastels: [0, 1, 0.45, 0.7, 0.76, 0.86],
  mistints: [0, 1, 0.3, 0.8, 0.25, 0.6],
};
const TINTS = ['#101010', '#b3151b', '#e8c100', '#1a4fa8', '#1d7a3c', '#7a3a12', '#c4601a', '#f2f2ee', '#8a1a5c', '#d49a00', '#3a2a20', '#0d7f8a'];

export default defineThing({
  questions: {
    family: choice('What colour family is being mixed today?', {
      reds: 'Reds, barn red to coral: a front door, a statement wall.',
      blues: 'Blues from navy to sky.',
      greens: 'Greens: sage, forest, bottle.',
      yellows: 'Yellows and ochres, sunny and loud.',
      neutrals: 'Whites, greys and beiges, forty kinds of off-white.',
      pastels: 'Soft nursery pastels in every hue.',
      mistints: 'Mistints: the unloved wrong colours on the discount shelf.',
    }),
    shaker: choice('What is the paint shaker doing?', {
      running: 'Running: a can is clamped in and the whole machine is shuddering.',
      waiting: 'Open, with a freshly tinted can sitting in it waiting to be clamped.',
      idle: 'Empty and switched off.',
    }),
    chips: score('What state is the rack of colour chips in?', ['Every pocket full and squared', 'A few picked out', 'Gappy and crooked', 'Rifled: pockets empty and cards on the floor']),
    drips: score('How much paint has run down the cans?', ['Spotless lids, one neat dab each', 'A drip here and there', 'Runs down most cans', 'Thick drips, rings and puddles everywhere']),
    cans: choice('How are the cans stacked?', {
      few: 'Just two or three finished cans waiting for collection.',
      pyramid: 'A neat display pyramid.',
      towers: 'Tall wobbly towers of gallons.',
      scattered: 'Cans and quart tins dotted all over the floor around the counter.',
    }),
    era: choice('What era is the equipment?', {
      fifties: 'Cream enamel and chrome from the 1950s, round-shouldered.',
      seventies: 'Wood-grain laminate and harvest orange.',
      modern: 'Grey powder-coat with a safety-orange stripe.',
      battered: 'Unbranded workshop gear in paint-spattered grey-green.',
    }),
    counter: choice('What has been left on the counter?', {
      tidy: 'Nothing; wiped down.',
      stirring: 'An open can with a wooden stir stick standing in it.',
      spill: 'A can on its side with a pool of paint creeping to the edge.',
      swatches: 'Brushed-out sample boards propped up to dry, and a brush.',
      fandeck: 'A fan deck splayed open like a hand of cards.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [h0, h1, s0, s1, l0, l1] = RANGE[a.family];
    const colour = (t = random(), u = random()) => new THREE.Color().setHSL((mix(h0, h1, t) + 1) % 1, mix(s0, s1, random()) * mix(0.75, 1.05, mood.cheer), mix(l0, l1, u));
    const hero = colour(0.5, 0.45);
    const ERA = {
      fifties: ['#e3dbc0', '#c9cdd0', '#7a2f2a'], seventies: ['#8a6038', '#d9772a', '#3a2a1c'],
      modern: ['#7d868c', '#e8641c', '#22262a'], battered: ['#6f7d70', '#8f9488', '#2d302c'],
    }[a.era];
    const cabinet = s.material(ERA[0], { roughness: 0.55, metalness: a.era === 'seventies' ? 0 : 0.25 });
    const accent = s.material(ERA[1], { roughness: 0.45, metalness: a.era === 'fifties' ? 0.8 : 0.2 });
    const dark = s.material(ERA[2], { roughness: 0.7 });
    const steel = s.material('#c2c7ca', { metalness: 0.8, roughness: 0.3 });
    const top = s.material(a.era === 'seventies' ? '#d8c9a0' : '#3b3d40', { roughness: 0.4 });
    const paintMat = (c: THREE.Color) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.25, emissive: c, emissiveIntensity: 0.12 });
    const heroMat = paintMat(hero);

    // A can with a dabbed lid, optional drips. Returns its group.
    const can = (x: number, y: number, z: number, c: THREE.Color, size = 1, open = false) => {
      const g = new THREE.Group();
      const r = 0.085 * size, h = 0.19 * size;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), steel);
      body.position.y = h / 2;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.001, r + 0.001, h * 0.55, 20, 1, true), s.material(a.era === 'battered' ? '#d8d4c4' : '#f1eee2', { roughness: 0.8 }));
      band.position.y = h * 0.47;
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.002, r + 0.002, h * 0.14, 20, 1, true), paintMat(c));
      stripe.position.y = h * 0.47;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006 * size, 6, 20), steel);
      rim.rotation.x = Math.PI / 2; rim.position.y = h;
      g.add(body, band, stripe, rim);
      if (open) {
        const surface = new THREE.Mesh(new THREE.CircleGeometry(r * 0.92, 20), paintMat(c));
        surface.rotation.x = -Math.PI / 2; surface.position.y = h * 0.93;
        g.add(surface);
      } else {
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.86, r * 0.86, 0.008, 20), steel);
        lid.position.y = h + 0.001;
        const dab = new THREE.Mesh(new THREE.CylinderGeometry(r * mix(0.3, 0.55, random()), r * 0.4, 0.004, 12), paintMat(c));
        dab.position.set((random() - 0.5) * r * 0.5, h + 0.007, (random() - 0.5) * r * 0.5);
        g.add(lid, dab);
      }
      const runs = Math.floor(a.drips * mix(1, 6, random()) + (a.drips > 0.3 ? 1 : 0));
      for (let i = 0; i < runs; i++) {
        const angle = mix(-1.6, 1.6, random()), len = h * mix(0.2, 0.95, random()) * mix(0.4, 1, a.drips);
        const run = new THREE.Mesh(new THREE.CylinderGeometry(0.008 * size, 0.006 * size, len, 6), paintMat(c));
        run.position.set(Math.sin(angle) * (r + 0.003), h - len / 2, Math.cos(angle) * (r + 0.003));
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.011 * size, 8, 6), run.material);
        bead.position.set(run.position.x, h - len, run.position.z);
        g.add(run, bead);
      }
      g.traverse((node) => { node.castShadow = true; });
      g.position.set(x, y, z);
      g.rotation.y = random() * 6;
      s.root.add(g);
      return g;
    };

    // --- Chip rack, on the left ---
    const rx = -0.82, rackW = 0.62, rackBase = 0.72;
    s.box([rackW, rackBase, 0.4], [rx, rackBase / 2, -0.05], cabinet);
    s.box([rackW + 0.02, 0.03, 0.42], [rx, rackBase + 0.015, -0.05], top);
    s.box([rackW * 0.42, rackBase * 0.7, 0.01], [rx - rackW * 0.23, rackBase * 0.5, 0.152], accent);
    s.box([rackW * 0.42, rackBase * 0.7, 0.01], [rx + rackW * 0.23, rackBase * 0.5, 0.152], accent);
    const panel = new THREE.Group();
    panel.position.set(rx, rackBase + 0.03, -0.2);
    panel.rotation.x = -0.16;
    s.root.add(panel);
    const panelH = 1.02;
    const back = new THREE.Mesh(new THREE.BoxGeometry(rackW, panelH, 0.03), dark);
    back.position.y = panelH / 2; back.castShadow = back.receiveShadow = true;
    panel.add(back);
    const head = new THREE.Mesh(new THREE.BoxGeometry(rackW + 0.03, 0.12, 0.05), accent);
    head.position.y = panelH + 0.05; head.castShadow = true;
    panel.add(head);
    const cols = 9, rows = 9;
    const chipGeo = new THREE.BoxGeometry(0.052, 0.085, 0.006);
    const chipMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 });
    const chips: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const dummy = new THREE.Object3D();
    const famStart = Math.floor(random() * (cols - 2));
    for (let r = 0; r < rows; r++) {
      // little ledge under each row
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(rackW - 0.04, 0.008, 0.02), cabinet);
      ledge.position.set(0, panelH - 0.1 - r * 0.102 - 0.045, 0.024);
      panel.add(ledge);
      for (let c = 0; c < cols; c++) {
        // The family being mixed is the part of the rack people have been at.
        const inFamily = c >= famStart && c < famStart + 3;
        const gone = random() < a.chips * (inFamily ? 0.85 : 0.35);
        if (gone) continue;
        const crooked = random() < a.chips * 0.6;
        dummy.position.set((c - (cols - 1) / 2) * 0.064, panelH - 0.1 - r * 0.102 + (crooked ? random() * 0.03 : 0), 0.022);
        dummy.rotation.set(0, 0, crooked ? (random() - 0.5) * 0.7 : 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        const chipColour = inFamily
          ? new THREE.Color().setHSL((mix(h0, h1, (c - famStart) / 2) + 1) % 1, mix(s0, s1, 0.6), mix(0.82, 0.28, r / (rows - 1)))
          : new THREE.Color().setHSL(c / cols, mix(0.25, 0.7, mood.cheer) * (1 - r / rows * 0.3), mix(0.85, 0.3, r / (rows - 1)));
        chips.push({ m: dummy.matrix.clone(), c: chipColour });
      }
    }
    if (chips.length) {
      const mesh = new THREE.InstancedMesh(chipGeo, chipMat, chips.length);
      chips.forEach((chip, i) => { mesh.setMatrixAt(i, chip.m); mesh.setColorAt(i, chip.c); });
      mesh.castShadow = true;
      panel.add(mesh);
    }
    // Chips dropped on the floor.
    const dropped = Math.floor(Math.max(0, a.chips - 0.45) * 26);
    for (let i = 0; i < dropped; i++) {
      const chip = s.box([0.052, 0.004, 0.085], [rx + mix(-0.4, 0.5, random()), 0.003, mix(0.2, 0.75, random())], new THREE.MeshStandardMaterial({ color: colour(), roughness: 0.6 }));
      chip.rotation.y = random() * 6;
    }

    // --- Tint carousel on its counter, centre ---
    const cx = -0.08, counterH = 0.86, cw = 0.72;
    s.box([cw, counterH - 0.04, 0.56], [cx, (counterH - 0.04) / 2, 0], cabinet);
    s.box([cw + 0.04, 0.04, 0.6], [cx, counterH - 0.02, 0.01], top);
    s.box([cw, 0.08, 0.01], [cx, counterH - 0.14, 0.282], accent);
    s.box([cw * 0.9, 0.1, 0.02], [cx, 0.05, 0.275], dark);
    const turret = new THREE.Group();
    turret.position.set(cx - 0.08, counterH, -0.04);
    s.root.add(turret);
    const tmesh = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      turret.add(mesh);
      return mesh;
    };
    s.cylinder(0.05, 0.07, 0.34, [cx - 0.08, counterH + 0.17, -0.04], dark, 16);
    tmesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 32), accent, 0, 0.35, 0);
    tmesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 16), cabinet, 0, 0.56, 0);
    tmesh(new THREE.SphereGeometry(0.07, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), accent, 0, 0.76, 0);
    const canisters = 12;
    for (let i = 0; i < canisters; i++) {
      const angle = i / canisters * Math.PI * 2, r = 0.19;
      const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      const tint = new THREE.Color(TINTS[i]);
      tmesh(new THREE.CylinderGeometry(0.04, 0.04, 0.26, 12), steel, x, 0.5, z);
      tmesh(new THREE.CylinderGeometry(0.042, 0.042, 0.07, 12), paintMat(tint), x, 0.46, z);
      const lift = random() * 0.06;
      tmesh(new THREE.CylinderGeometry(0.005, 0.005, 0.14 + lift, 6), steel, x, 0.69 + lift / 2, z);
      tmesh(new THREE.SphereGeometry(0.018, 8, 6), dark, x, 0.76 + lift, z);
      tmesh(new THREE.CylinderGeometry(0.008, 0.005, 0.05, 6), steel, x * 1.18, 0.345, z * 1.18);
      if (a.drips > 0.5 && random() < a.drips) tmesh(new THREE.CylinderGeometry(0.006, 0.004, 0.05, 6), paintMat(tint), x * 1.18, 0.3, z * 1.18);
    }
    turret.rotation.y = random() * 6;
    // Can under the nozzle being tinted.
    s.cylinder(0.11, 0.11, 0.02, [cx - 0.08, counterH + 0.01, 0.2], steel, 20);
    can(cx - 0.08, counterH + 0.02, 0.2, hero, 1, true);

    // Counter story.
    const sx = cx + 0.24, sz = 0.12;
    if (a.counter === 'stirring') {
      can(sx, counterH, sz, hero, 0.85, true);
      const stick = s.box([0.03, 0.34, 0.006], [sx + 0.02, counterH + 0.2, sz], s.material('#d3b98a'));
      stick.rotation.z = -0.3;
      s.box([0.031, 0.1, 0.007], [sx + 0.045, counterH + 0.12, sz], heroMat).rotation.z = -0.3;
    } else if (a.counter === 'spill') {
      const g = can(sx, counterH + 0.075, sz - 0.05, hero, 0.85, true);
      g.rotation.set(0, 0.6, Math.PI / 2);
      const pool = new THREE.Shape();
      for (let i = 0; i < 14; i++) {
        const angle = i / 14 * Math.PI * 2, r = mix(0.09, 0.17, random());
        const px = Math.cos(angle) * r * 0.8, py = Math.sin(angle) * r;
        if (i === 0) pool.moveTo(px, py); else pool.lineTo(px, py);
      }
      const poolMesh = s.mesh(new THREE.ShapeGeometry(pool), heroMat, [sx - 0.02, counterH + 0.003, sz + 0.1]);
      poolMesh.rotation.x = -Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const dx = sx - 0.1 + i * 0.07, len = mix(0.1, 0.45, random());
        s.cylinder(0.011, 0.007, len, [dx, counterH - len / 2, 0.315], heroMat, 6);
        s.ball([0.014, 0.014, 0.014], [dx, counterH - len, 0.315], heroMat, 8);
      }
      const puddle = s.cylinder(0.12, 0.12, 0.004, [sx - 0.03, 0.002, 0.42], heroMat, 16);
      puddle.scale.z = 0.6;
    } else if (a.counter === 'swatches') {
      for (let i = 0; i < 3; i++) {
        const board = s.box([0.14, 0.2, 0.006], [sx - 0.05 + i * 0.1, counterH + 0.1, sz - 0.2 + i * 0.02], s.material('#efece2'));
        board.rotation.x = -0.25;
        const swatch = s.box([0.11, 0.13, 0.002], [sx - 0.05 + i * 0.1, counterH + 0.105, sz - 0.196 + i * 0.02], paintMat(colour(0.2 + i * 0.3, 0.3 + i * 0.2)));
        swatch.rotation.x = -0.25;
      }
      s.box([0.03, 0.012, 0.16], [sx, counterH + 0.006, sz + 0.1], s.material('#b3792e')).rotation.y = 0.5;
      s.box([0.05, 0.014, 0.05], [sx + 0.04, counterH + 0.007, sz + 0.035], heroMat).rotation.y = 0.5;
    } else if (a.counter === 'fandeck') {
      const blades = 11;
      for (let i = 0; i < blades; i++) {
        const blade = new THREE.Group();
        blade.position.set(sx - 0.02, counterH + 0.004 + i * 0.003, sz + 0.14);
        blade.rotation.y = mix(-1.25, 1.25, i / (blades - 1));
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.0025, 0.26), new THREE.MeshStandardMaterial({ color: '#f4f1e6', roughness: 0.7 }));
        strip.position.z = -0.13;
        strip.castShadow = true;
        blade.add(strip);
        for (let k = 0; k < 5; k++) {
          const chip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.003, 0.04), new THREE.MeshStandardMaterial({ color: colour(i / (blades - 1), k / 4), roughness: 0.6 }));
          chip.position.set(0, 0.0005, -0.045 - k * 0.045);
          blade.add(chip);
        }
        s.root.add(blade);
      }
      s.cylinder(0.008, 0.008, 0.045, [sx - 0.02, counterH + 0.02, sz + 0.14], steel, 8);
    }

    // --- Shaker, on the right ---
    const kx = 0.78, kw = 0.5, kh = 1.12;
    const shaker = new THREE.Group();
    shaker.position.set(kx, 0, -0.02);
    s.root.add(shaker);
    const kmesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    kmesh(shaker, new THREE.BoxGeometry(kw, 0.38, 0.5), cabinet, 0, 0.19, 0); // motor base
    for (let i = 0; i < 6; i++) kmesh(shaker, new THREE.BoxGeometry(kw * 0.6, 0.012, 0.01), dark, 0, 0.08 + i * 0.03, 0.252);
    for (const x of [-1, 1]) kmesh(shaker, new THREE.BoxGeometry(0.05, kh - 0.38, 0.5), cabinet, x * (kw / 2 - 0.025), 0.38 + (kh - 0.38) / 2, 0);
    kmesh(shaker, new THREE.BoxGeometry(kw, kh - 0.38, 0.03), dark, 0, 0.38 + (kh - 0.38) / 2, -0.235);
    kmesh(shaker, new THREE.BoxGeometry(kw, 0.16, 0.5), cabinet, 0, kh - 0.08, 0);
    kmesh(shaker, new THREE.BoxGeometry(kw, 0.05, 0.02), accent, 0, kh - 0.08, 0.252);
    // Controls: timer dial, start and stop.
    kmesh(shaker, new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), dark, -0.14, 0.3, 0.255).rotation.x = Math.PI / 2;
    const running = a.shaker === 'running';
    kmesh(shaker, new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), new THREE.MeshStandardMaterial({ color: '#2fae4e', emissive: '#2fae4e', emissiveIntensity: running ? 1.6 : 0.05 }), 0.02, 0.3, 0.255).rotation.x = Math.PI / 2;
    kmesh(shaker, new THREE.CylinderGeometry(0.025, 0.025, 0.03, 12), new THREE.MeshStandardMaterial({ color: '#c8241c', emissive: '#c8241c', emissiveIntensity: 0.15 }), 0.13, 0.3, 0.26).rotation.x = Math.PI / 2;
    // The cradle: springs, bottom plate, screw clamp and top plate.
    const cradle = new THREE.Group();
    cradle.position.y = 0.38;
    shaker.add(cradle);
    for (const x of [-1, 1]) for (const z of [-1, 1]) for (let i = 0; i < 4; i++) {
      kmesh(cradle, new THREE.TorusGeometry(0.022, 0.005, 5, 12), steel, x * 0.13, 0.012 + i * 0.016, z * 0.13).rotation.x = Math.PI / 2;
    }
    kmesh(cradle, new THREE.BoxGeometry(0.34, 0.02, 0.34), steel, 0, 0.08, 0);
    const hasCan = a.shaker !== 'idle';
    const clampY = a.shaker === 'running' ? 0.09 + 0.2 : 0.5;
    kmesh(cradle, new THREE.BoxGeometry(0.3, 0.02, 0.3), steel, 0, clampY, 0);
    kmesh(cradle, new THREE.CylinderGeometry(0.012, 0.012, 0.66 - clampY, 8), steel, 0, clampY + (0.66 - clampY) / 2, 0);
    for (const x of [-1, 1]) kmesh(cradle, new THREE.CylinderGeometry(0.008, 0.008, 0.5, 6), steel, x * 0.15, 0.33, -0.12);
    if (hasCan) {
      const g = can(0, 0, 0, hero, 1, false);
      s.root.remove(g);
      g.position.set(0, 0.09, 0.02);
      cradle.add(g);
    }
    if (running) {
      // motion blur ghosts
      const ghost = new THREE.MeshStandardMaterial({ color: '#c2c7ca', transparent: true, opacity: 0.18, depthWrite: false });
      for (const dx of [-0.02, 0.02]) kmesh(cradle, new THREE.CylinderGeometry(0.09, 0.09, 0.19, 16), ghost, dx, 0.185, 0.02).castShadow = false;
    }
    if (a.era === 'fifties') kmesh(shaker, new THREE.CylinderGeometry(0.25, 0.25, 0.5, 20, 1, false, 0, Math.PI), cabinet, 0, kh, 0).rotation.set(Math.PI / 2, Math.PI / 2, 0);

    // --- Stacked cans ---
    const stackColour = () => (a.family === 'mistints' ? colour() : random() < 0.8 ? colour() : hero.clone());
    const d = 0.18, h = 0.195;
    if (a.cans === 'few') {
      const n = 2 + Math.floor(random() * 2);
      for (let i = 0; i < n; i++) can(0.28 + i * 0.2, 0, 0.5 + (random() - 0.5) * 0.08, i === 0 ? hero : stackColour());
    } else if (a.cans === 'pyramid') {
      const base = 3 + Math.round(mood.density);
      for (let level = 0; level < base; level++) for (let i = 0; i < base - level; i++) {
        can(0.12 + (i + level / 2) * d, level * h, 0.52, stackColour());
      }
    } else if (a.cans === 'towers') {
      const towers = 2 + Math.round(mood.density * 2);
      for (let t = 0; t < towers; t++) {
        const n = 3 + Math.floor(random() * 4);
        let lean = 0;
        for (let i = 0; i < n; i++) {
          lean += (random() - 0.5) * mix(0.01, 0.05, mood.wear);
          can(0.05 + t * 0.24 + lean, i * h, 0.5 + (t % 2) * 0.1 + lean * 0.5, stackColour());
        }
      }
    } else {
      const n = 6 + Math.round(mood.density * 8);
      for (let i = 0; i < n; i++) {
        const quart = random() < 0.4;
        can(mix(-1.05, 1.0, random()), 0, mix(0.42, 0.95, random()), stackColour(), quart ? 0.6 : 1);
      }
    }
    // Floor rings and splats when drips are heavy.
    const splats = Math.floor(Math.max(0, a.drips - 0.55) * 24);
    for (let i = 0; i < splats; i++) {
      const splat = s.cylinder(1, 1, 0.003, [mix(-0.9, 0.9, random()), 0.0015, mix(0.35, 0.9, random())], paintMat(random() < 0.5 ? hero : colour()), 10);
      const size = mix(0.015, 0.07, random());
      splat.scale.set(size, 1, size * mix(0.6, 1, random()));
    }

    const shake = running ? mix(0.004, 0.014, mood.energy) : 0;
    const turn = mix(0, 0.35, Math.max(0, mood.energy - 0.3));
    let phase = 0;
    return s.finish({
      footprint: 1.25,
      update: (dt, time) => {
        turret.rotation.y += dt * turn;
        if (!shake) return;
        phase += dt * mix(40, 75, mood.energy);
        cradle.position.set(Math.sin(phase) * shake, 0.38 + Math.sin(phase * 1.7) * shake, Math.cos(phase * 1.3) * shake * 0.6);
        shaker.rotation.z = Math.sin(time * 31) * shake * 0.25;
      },
    });
  },
});
