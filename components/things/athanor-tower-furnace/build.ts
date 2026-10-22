import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

function brickTexture(random: () => number, base: string, mortar: string, soot: number, cols: number, rows: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = mortar;
  ctx.fillRect(0, 0, 512, 512);
  const w = 512 / cols, h = 512 / rows;
  const tint = new THREE.Color();
  for (let r = 0; r < rows; r++)
    for (let c = -1; c < cols; c++) {
      tint.set(base).offsetHSL((random() - 0.5) * 0.03, (random() - 0.5) * 0.12, (random() - 0.5) * 0.16);
      ctx.fillStyle = tint.getStyle();
      const x = (c + (r % 2 ? 0.5 : 0)) * w;
      ctx.fillRect(x + 2, r * h + 2, w - 4, h - 4);
      if (x + w > 512) ctx.fillRect(x - 512 + 2, r * h + 2, w - 4, h - 4);
    }
  for (let i = 0; i < soot * 60; i++) {
    ctx.fillStyle = `rgba(22,17,14,${0.08 + random() * 0.14})`;
    const sw = 8 + random() * 34;
    ctx.fillRect(random() * 512, random() * 300, sw, 80 + random() * 260);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    form: choice('What shape is the furnace?', {
      round: 'A round brick tower, slightly tapered, like a fat chimney stump.',
      square: 'A square brick stack with sharp corners, plain and mason-built.',
      twin: 'A tall central charcoal tower with a lower side chamber that carries a sand bath: the classic self-feeding athanor.',
      beehive: 'A low swelling beehive of daubed clay, more oven than tower.',
    }),
    cap: choice('What crowns it?', {
      dome: 'A smooth brick dome with a small knob vent.',
      flue: 'A cone that narrows into a crooked iron flue pipe.',
      bath: 'A flat top with an iron sand bath and a glass flask sitting in it.',
      breached: 'The cap has been broken open, a jagged ring of brick.',
    }),
    fire: choice('What is the fire doing?', {
      cold: 'Dead and cold, grey ash only.',
      banked: 'Banked to a dull red, sleeping through the night.',
      steady: 'A steady orange heat, exactly as intended.',
      overfired: 'Roaring white-yellow, far too hot, flames licking out of every gap.',
    }),
    door: choice('How is the iron fire door?', {
      shut: 'Shut and latched, light leaking only round its edges.',
      ajar: 'Standing ajar, a slice of firelight.',
      open: 'Swung wide open on the firebox.',
      gone: 'Missing altogether, a bare black mouth.',
    }),
    masonry: choice('What is it built from?', {
      red: 'Common red brick.',
      fireclay: 'Pale yellow firebrick.',
      stone: 'Grey rubble stone with thick mortar.',
      daub: 'Brick smeared over with cracked ochre clay.',
    }),
    story: choice('How far into the work is it?', {
      fresh: 'Newly built, clean joints, never yet fired hard.',
      weeks: 'Weeks into a long firing: sooted, banded, tended daily.',
      patched: 'Cracked by heat and held together with iron straps and clay patches.',
      abandoned: 'Given up on: ash spilling from the pit, tools left where they fell.',
    }),
    fuel: noul('Is there a heap of charcoal and a scuttle beside it?'),
    bellows: noul('Are there hand bellows leaning against it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const base = { red: '#9a4a34', fireclay: '#c9a868', stone: '#8d8a80', daub: '#b08a52' }[a.masonry];
    const sootAmount = Math.min(1, mood.wear * 0.7 + { fresh: 0, weeks: 0.45, patched: 0.6, abandoned: 0.7 }[a.story]);
    const big = a.masonry === 'stone';
    const brickOf = (cols: number, rows: number, soot = sootAmount) => {
      const map = brickTexture(random, base, a.masonry === 'daub' ? '#a37f4c' : '#cfc6b2', soot, big ? Math.ceil(cols / 2) : cols, big ? Math.ceil(rows / 2) : rows);
      return new THREE.MeshStandardMaterial({ map, roughness: 0.92 });
    };
    const iron = s.material('#2b2a2c', { metalness: 0.55, roughness: 0.6 });
    const rust = s.material('#5a3a2a', { metalness: 0.3, roughness: 0.85 });
    const level = { cold: 0, banked: 0.3, steady: 0.65, overfired: 1 }[a.fire];
    const fireColour = new THREE.Color().setHSL(mix(0.01, 0.105, level), 1, mix(0.36, 0.56, level));
    const glow = new THREE.MeshStandardMaterial({ color: level ? fireColour : new THREE.Color('#4a4642'), emissive: fireColour, emissiveIntensity: level ? mix(0.7, 1.25, level) : 0, roughness: 0.8 });
    const black = s.material('#141110', { roughness: 1 });

    // Footing and ash-pit plinth.
    const wide = a.form === 'twin' ? 1.5 : a.form === 'beehive' ? 1.25 : 1.02;
    const shift = a.form === 'twin' ? 0.24 : 0;
    s.box([wide, 0.1, 1.0], [shift, 0.05, 0], s.material('#77726a'));
    s.box([wide - 0.1, 0.22, 0.9], [shift, 0.21, 0], brickOf(10, 3));

    let front = 0.36; // z of the tower face at door height
    let top = 1.3; // y where the cap begins
    let capRadius = 0.36;
    const y0 = 0.32;
    if (a.form === 'round') {
      const h = 1.0;
      s.cylinder(0.33, 0.4, h, [0, y0 + h / 2, 0], brickOf(14, 14), 28);
      top = y0 + h; capRadius = 0.33; front = 0.385;
      for (const y of [0.55, 1.12]) s.ring(0.4 - (y - y0) * 0.07 + 0.006, 0.014, [0, y, 0], iron).rotation.x = Math.PI / 2;
    } else if (a.form === 'square') {
      const h = 1.0;
      s.box([0.74, h, 0.74], [0, y0 + h / 2, 0], brickOf(5, 14));
      top = y0 + h; capRadius = 0.37; front = 0.37;
      for (const y of [0.56, 1.14]) s.box([0.77, 0.035, 0.77], [0, y, 0], iron);
      s.box([0.84, 0.07, 0.84], [0, top + 0.035, 0], brickOf(6, 1)); top += 0.07;
    } else if (a.form === 'twin') {
      s.box([0.76, 0.6, 0.76], [0, y0 + 0.3, 0], brickOf(5, 8));
      s.cylinder(0.25, 0.3, 0.75, [0, y0 + 0.6 + 0.375, 0], brickOf(11, 10), 24);
      s.ring(0.29, 0.013, [0, y0 + 0.75, 0], iron).rotation.x = Math.PI / 2;
      top = y0 + 1.35; capRadius = 0.25; front = 0.38;
      // Side chamber with its own little sand bath.
      s.box([0.58, 0.5, 0.66], [0.66, y0 + 0.25, 0], brickOf(4, 7));
      s.cylinder(0.22, 0.17, 0.09, [0.66, y0 + 0.545, 0], iron, 20);
      s.cylinder(0.2, 0.2, 0.012, [0.66, y0 + 0.592, 0], s.material('#cdbb93', { roughness: 1 }), 20);
      const glass = new THREE.MeshPhysicalMaterial({ color: '#cfe6d8', transparent: true, opacity: 0.45, roughness: 0.08 });
      s.lathe([[0, 0], [0.08, 0.01], [0.11, 0.08], [0.085, 0.16], [0.03, 0.2], [0.026, 0.34], [0.034, 0.35]], glass, [0.66, y0 + 0.59, 0]);
      s.ball([0.08, 0.05, 0.08], [0.66, y0 + 0.64, 0], s.material(mood.cheer > 0.5 ? '#c9a227' : '#6b2f3a', { roughness: 0.3 }));
      s.box([0.12, 0.1, 0.02], [0.66, y0 + 0.18, 0.335], black);
      s.box([0.1, 0.08, 0.02], [0.66, y0 + 0.18, 0.338], glow);
    } else {
      const map = brickOf(12, 9);
      s.lathe([[0.56, 0], [0.6, 0.2], [0.57, 0.48], [0.46, 0.72], [0.3, 0.88], [0.24, 0.92]], map, [0, y0, 0]);
      top = y0 + 0.92; capRadius = 0.24; front = 0.585;
      s.ring(0.6, 0.014, [0, y0 + 0.2, 0], iron).rotation.x = Math.PI / 2;
    }

    // Firebox mouth, door and sight hole on the front face.
    const doorY = y0 + 0.2, dw = 0.3, dh = 0.3;
    s.box([dw + 0.08, dh + 0.08, 0.05], [0, doorY, front - 0.005], iron); // frame
    s.box([dw, dh, 0.04], [0, doorY, front + 0.004], black);
    s.box([dw - 0.04, dh * mix(0.25, 0.8, level), 0.03], [0, doorY - dh / 2 + dh * mix(0.25, 0.8, level) / 2 + 0.01, front + 0.012], glow);
    if (a.door !== 'gone') {
      const hinge = new THREE.Group();
      hinge.position.set(-dw / 2 - 0.02, doorY, front + 0.03);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(dw + 0.04, dh + 0.04, 0.025), a.story === 'fresh' ? iron : rust);
      leaf.position.set((dw + 0.04) / 2, 0, 0.012);
      leaf.castShadow = true;
      hinge.add(leaf);
      for (const y of [-0.09, 0.09]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(dw * 0.8, 0.03, 0.012), iron);
        strap.position.set(dw * 0.42, y, 0.03); hinge.add(strap);
      }
      const latch = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 6, 16), iron);
      latch.position.set(dw - 0.02, 0, 0.04); hinge.add(latch);
      hinge.rotation.y = -{ shut: 0, ajar: 0.55 + random() * 0.25, open: 1.9 + random() * 0.3 }[a.door];
      s.root.add(hinge);
      if (a.door === 'shut' && level) // light leaking round the edges
        s.box([dw + 0.055, dh + 0.055, 0.008], [0, doorY, front + 0.024], glow);
    }
    // Ash door below, sight hole above.
    s.box([0.22, 0.09, 0.03], [0, 0.2, 0.455], iron);
    const sightY = Math.min(top - 0.14, doorY + 0.42);
    const sightZ = a.form === 'beehive' ? 0.5 : a.form === 'round' ? 0.36 : a.form === 'twin' ? 0.29 : front;
    const sight = s.cylinder(0.055, 0.055, 0.05, [0, sightY, sightZ], iron, 16); sight.rotation.x = Math.PI / 2;
    const eye = s.cylinder(0.035, 0.035, 0.056, [0, sightY, sightZ], glow, 16); eye.rotation.x = Math.PI / 2;

    // Cap.
    const capMap = brickOf(12, 5);
    const jag: THREE.Object3D[] = [];
    if (a.cap === 'dome') {
      s.lathe([[capRadius + 0.03, 0], [capRadius + 0.03, 0.05], [capRadius * 0.9, 0.17], [capRadius * 0.62, 0.28], [capRadius * 0.25, 0.34], [0.05, 0.36], [0.05, 0.41], [0.07, 0.43], [0.0, 0.46]], capMap, [0, top, 0]);
    } else if (a.cap === 'flue') {
      s.lathe([[capRadius + 0.03, 0], [capRadius + 0.03, 0.05], [capRadius * 0.6, 0.24], [0.085, 0.36]], capMap, [0, top, 0]);
      const lean = (random() - 0.5) * 0.16;
      s.tube([[0, top + 0.34, 0], [0, top + 0.6, 0], [lean, top + 0.78, -0.03], [lean * 2.4, top + 1.05, -0.05]], 0.07, a.story === 'fresh' ? iron : rust);
      s.ring(0.078, 0.012, [0, top + 0.5, 0], iron).rotation.x = Math.PI / 2;
    } else if (a.cap === 'bath') {
      s.cylinder(capRadius + 0.04, capRadius + 0.03, 0.06, [0, top + 0.03, 0], capMap, 24);
      s.cylinder(capRadius * 0.86, capRadius * 0.7, 0.1, [0, top + 0.11, 0], iron, 24);
      s.cylinder(capRadius * 0.8, capRadius * 0.8, 0.012, [0, top + 0.158, 0], s.material('#cdbb93', { roughness: 1 }), 24);
      const glass = new THREE.MeshPhysicalMaterial({ color: '#d5ead9', transparent: true, opacity: 0.45, roughness: 0.08 });
      s.lathe([[0, 0], [0.1, 0.01], [0.14, 0.1], [0.11, 0.2], [0.035, 0.26], [0.03, 0.46], [0.04, 0.47]], glass, [0, top + 0.15, 0]);
      s.ball([0.105, 0.065, 0.105], [0, top + 0.22, 0], s.material(['#3f7d4e', '#b3261e', '#c9a227', '#2d3f7a'][Math.floor(random() * 4)], { roughness: 0.3, emissive: '#402010', emissiveIntensity: level * 0.4 }));
    } else {
      // Breached: a jagged ring of surviving bricks and a view of the dark inside.
      s.cylinder(capRadius * 0.82, capRadius * 0.82, 0.02, [0, top + 0.012, 0], level ? glow : black, 20);
      const n = 11;
      for (let i = 0; i < n; i++) {
        if (random() < 0.22) continue;
        const angle = (i / n) * Math.PI * 2;
        const h = 0.06 + random() * 0.24;
        const brick = s.box([0.13, h, 0.09], [Math.sin(angle) * capRadius * 0.92, top + h / 2, Math.cos(angle) * capRadius * 0.92], capMap);
        brick.rotation.y = angle; brick.rotation.z = (random() - 0.5) * 0.25;
        jag.push(brick);
      }
      for (let i = 0; i < 5; i++) {
        const angle = random() * Math.PI * 2, d = 0.55 + random() * 0.25;
        const fallen = s.box([0.14, 0.07, 0.09], [Math.sin(angle) * d + shift * 0.5, 0.035, Math.abs(Math.cos(angle)) * 0.3 + 0.52], capMap);
        fallen.rotation.y = random() * 3;
      }
    }

    // Story dressing.
    if (a.story === 'patched' || (a.story === 'weeks' && a.form !== 'beehive')) {
      const r = a.form === 'beehive' ? 0.5 : a.form === 'twin' ? 0.4 : 0.39;
      if (a.form === 'round' || a.form === 'beehive') s.ring(a.form === 'round' ? 0.365 : 0.52, 0.016, [0, y0 + 0.62, 0], rust).rotation.x = Math.PI / 2;
      else s.box([r * 2, 0.04, r * 2], [0, y0 + (a.form === 'twin' ? 0.52 : 0.72), 0], rust);
    }
    if (a.story === 'patched') {
      const clay = s.material('#b99a6b', { roughness: 1 });
      for (let i = 0; i < 4; i++) {
        const angle = (random() - 0.5) * 2.2 + (i % 2 ? 0.9 : -0.9);
        const r = (a.form === 'beehive' ? 0.56 : a.form === 'square' || a.form === 'twin' ? 0.4 : 0.36);
        const patch = s.ball([0.1 + random() * 0.06, 0.12 + random() * 0.1, 0.03], [Math.sin(angle) * r, y0 + 0.25 + random() * 0.5, Math.cos(angle) * r], clay, 10);
        patch.rotation.y = angle;
      }
      // A dark crack running up the front.
      const cx = 0.2 + random() * 0.05;
      s.tube([[cx, y0 + 0.45, front + 0.004], [cx + 0.03, y0 + 0.6, front - 0.01], [cx - 0.02, y0 + 0.75, front - 0.025], [cx + 0.02, Math.min(top, y0 + 0.92), front - 0.04]], 0.007, black);
    }
    if (a.story === 'abandoned' || a.fire === 'cold') {
      const ash = s.material('#b9b4aa', { roughness: 1 });
      s.ball([0.26, 0.05, 0.16], [0.03, 0.02, 0.56], ash, 12);
      if (a.story === 'abandoned') {
        s.ball([0.16, 0.035, 0.12], [-0.25, 0.015, 0.62], ash, 12);
        s.rod([0.3, 0.012, 0.62], [0.75, 0.012, 0.74], 0.012, iron); // dropped poker
        s.rod([0.75, 0.012, 0.74], [0.8, 0.012, 0.69], 0.012, iron);
      }
    }
    if (a.story === 'weeks') {
      // The tender's stool and a tally of days chalked on a slate.
      for (const [x, z] of [[-0.08, -0.08], [0.08, -0.08], [0, 0.09]] as const) s.rod([-0.72 + x * 1.5, 0, 0.42 + z * 1.5], [-0.72 + x, 0.3, 0.42 + z], 0.016, s.material('#6a4a2c'));
      s.cylinder(0.15, 0.15, 0.035, [-0.72, 0.31, 0.42], s.material('#7a5632'), 16);
    }
    if (a.fuel) {
      const coal = s.material('#1b1a1c', { roughness: 0.75 });
      const cx = a.form === 'twin' ? -0.62 : 0.72, cz = 0.28;
      const lumps = [];
      const count = Math.round(mix(10, 34, mood.density));
      for (let i = 0; i < count; i++) {
        const r = Math.sqrt(random()) * 0.24, ang = random() * Math.PI * 2;
        lumps.push({ at: [cx + Math.cos(ang) * r, 0.03 + (0.24 - r) * 0.45 * random(), cz + Math.sin(ang) * r] as const, size: 0.035 + random() * 0.035 });
      }
      s.scatter(new THREE.DodecahedronGeometry(1, 0), coal, lumps);
      s.lathe([[0.0, 0], [0.11, 0], [0.15, 0.24], [0.16, 0.25]], rust, [cx + 0.12, 0, cz + 0.36]).material.side = THREE.DoubleSide;
      s.ring(0.13, 0.008, [cx + 0.12, 0.27, cz + 0.36], iron, Math.PI);
    }
    if (a.bellows) {
      const g = new THREE.Group();
      const wood = s.material('#7b5330'), leather = s.material('#4a3324', { roughness: 0.95 });
      const shape = new THREE.Shape();
      shape.moveTo(0, -0.02); shape.bezierCurveTo(0.16, -0.05, 0.2, 0.3, 0, 0.42); shape.bezierCurveTo(-0.2, 0.3, -0.16, -0.05, 0, -0.02);
      for (const z of [-0.06, 0.06]) {
        const board = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.015, bevelEnabled: false }), wood);
        board.position.z = z; board.castShadow = true; g.add(board);
      }
      const bag = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false }), leather);
      bag.scale.set(0.86, 0.9, 1); bag.position.set(0, 0.015, -0.05); g.add(bag);
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.16, 8), iron); nozzle.position.set(0, -0.09, 0.01); g.add(nozzle);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 8), wood); handle.position.set(0, 0.49, 0.05); g.add(handle);
      const bx = a.form === 'twin' ? 0.3 : -0.52;
      g.scale.setScalar(0.8); g.position.set(bx, 0.16, 0.58); g.rotation.set(-0.45, 0.9, 0.15);
      s.root.add(g);
    }

    // Flames out of the gaps and smoke from the top.
    const flames: THREE.Mesh[] = [];
    const flameMaterial = new THREE.MeshStandardMaterial({ color: '#ff8a1f', emissive: '#ff5a0a', emissiveIntensity: 0.9, transparent: true, opacity: 0.85, depthWrite: false });
    if (a.fire === 'overfired' || (a.fire === 'steady' && (a.door === 'open' || a.door === 'gone'))) {
      const n = a.fire === 'overfired' ? 5 : 2;
      for (let i = 0; i < n; i++) {
        const flame = s.mesh(new THREE.ConeGeometry(0.035 + random() * 0.03, 0.16 + random() * 0.14, 7), flameMaterial, [(i - (n - 1) / 2) * 0.055, doorY + 0.08 + random() * 0.05, front + 0.05]);
        flame.rotation.x = 0.35; flame.castShadow = false; flames.push(flame);
      }
      if (a.fire === 'overfired' && a.cap === 'breached')
        for (let i = 0; i < 4; i++) { const f = s.mesh(new THREE.ConeGeometry(0.06, 0.3 + random() * 0.2, 7), flameMaterial, [(random() - 0.5) * 0.25, top + 0.18, (random() - 0.5) * 0.25]); f.castShadow = false; flames.push(f); }
    }
    const puffs: THREE.Mesh[] = [];
    if (level > 0 && a.cap !== 'bath') {
      const smoke = new THREE.MeshStandardMaterial({ color: level > 0.9 ? '#3d3836' : '#8f8a84', transparent: true, opacity: 0.16 + level * 0.1, depthWrite: false, roughness: 1 });
      const startY = top + (a.cap === 'flue' ? 1.08 : a.cap === 'dome' ? 0.48 : 0.15);
      for (let i = 0; i < 3 + Math.round(level * 4); i++) {
        const puff = s.ball([1, 1, 1], [0, startY, 0], smoke, 10);
        puff.castShadow = puff.receiveShadow = false;
        puff.userData = { phase: i / (3 + Math.round(level * 4)), startY, drift: (random() - 0.5) * 0.3 };
        puffs.push(puff);
      }
    }
    const place = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.userData.phase + time * 0.12) % 1;
        puff.position.set(puff.userData.drift * t, puff.userData.startY + t * 0.55, -t * 0.12);
        puff.scale.setScalar(0.05 + t * 0.14);
      }
    };
    place(0);
    void jag;
    const speed = mix(0.4, 2.2, mood.energy);
    const baseGlow = glow.emissiveIntensity;
    return s.finish({
      update: (_dt, time) => {
        place(time * speed);
        if (level) glow.emissiveIntensity = baseGlow * (0.86 + 0.14 * Math.sin(time * speed * 5.3) * Math.sin(time * speed * 2.1 + 1));
        flames.forEach((flame, i) => { flame.scale.y = 0.8 + 0.35 * Math.sin(time * speed * 7 + i * 1.7); });
      },
    });
  },
});
