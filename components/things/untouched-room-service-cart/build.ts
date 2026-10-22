import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

/** A hanging cloth rippled into folds. */
function pleated(width: number, height: number, folds: number, depth: number) {
  const geometry = new THREE.PlaneGeometry(width, height, Math.max(8, Math.round(folds * 6)), 2);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getX(i) / width + 0.5, drop = 0.5 - p.getY(i) / height;
    p.setZ(i, Math.sin(t * folds * Math.PI * 2) * depth * (0.5 + drop * 0.5));
  }
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    cloche: choice('What is under the cloche?', {
      on: 'The silver cloche is still on, the meal never looked at.',
      lifted: 'The cloche set aside: a steak and vegetables gone cold and grey on the plate.',
      empty: 'The cloche set aside and the plate scraped empty, cutlery crossed on it.',
      picked: 'The cloche lifted, one bite taken, the fork left in the food.',
    }),
    wine: choice('What has happened to the wine?', {
      unopened: 'Unopened, leaning in the ice bucket, foil intact.',
      poured: 'Opened, one glass poured and left, the cork beside it.',
      finished: 'Finished: the bottle upended in the bucket, two glasses, one tipped over.',
    }),
    bottle: choice('What kind of bottle?', {
      red: 'Dark green glass, a red with a cream label.',
      white: 'Pale green glass, a white wine.',
      champagne: 'A champagne bottle with gold foil.',
    }),
    rose: choice('How is the rose?', {
      fresh: 'Fresh, upright and red in its bud vase.',
      wilted: 'Wilted, head hanging over the rim, petals dropped on the cloth.',
      none: 'No rose, only the empty vase.',
    }),
    bill: noul('Is a folded bill with a pen waiting on the cloth?'),
    extra: choice('What else rides on the cart?', {
      coffee: 'A silver coffee pot and a cup on a saucer.',
      newspaper: 'A folded newspaper.',
      fruit: 'A bowl of fruit.',
      cake: 'A slice of cake under a glass dome.',
      nothing: 'Nothing else.',
    }),
    style: choice('What kind of cart is it?', {
      chrome: 'A chrome-framed cart draped in white linen.',
      wood: 'A dark wooden trolley with a cream cloth.',
      gilt: 'A gilt-trimmed grand-hotel cart with a crisp white cloth and a candle.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const chrome = s.material('#d6dadd', { metalness: 0.9, roughness: 0.22 });
    const gold = s.material('#d1a94a', { metalness: 0.85, roughness: 0.3 });
    const frameMat = a.style === 'chrome' ? chrome : a.style === 'gilt' ? gold : s.material('#4a3222', { roughness: 0.5 });
    const linenTone = a.style === 'wood' ? '#efe6d2' : '#f5f3ee';
    const linen = new THREE.MeshStandardMaterial({ color: new THREE.Color(linenTone).lerp(new THREE.Color('#8b8275'), mood.wear * 0.12), roughness: 1, side: THREE.DoubleSide });
    const W = 0.92, D = 0.6, TOP = 0.78;

    // ---- the cart ------------------------------------------------------------------------
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      const lx = x * (W / 2 - 0.06), lz = z * (D / 2 - 0.06);
      s.cylinder(0.012, 0.012, TOP - 0.1, [lx, TOP / 2 - 0.02, lz], frameMat, 10);
      const caster = s.cylinder(0.035, 0.035, 0.022, [lx, 0.035, lz], s.material('#222', { roughness: 0.6 }), 14);
      caster.rotation.z = Math.PI / 2;
      s.cylinder(0.01, 0.01, 0.05, [lx, 0.06, lz], frameMat, 8);
    }
    s.box([W - 0.1, 0.02, D - 0.1], [0, 0.22, 0], a.style === 'wood' ? frameMat : s.material('#e9e6df'));
    s.box([W, 0.03, D], [0, TOP - 0.015, 0], frameMat);
    // Linen: a top and four pleated skirts.
    s.box([W + 0.04, 0.012, D + 0.04], [0, TOP + 0.006, 0], linen);
    const skirtH = 0.3;
    const skirt = (width: number, at: P3, turn: number) => {
      const mesh = s.mesh(pleated(width, skirtH, Math.round(width * 9), 0.018), linen, at);
      mesh.rotation.y = turn;
    };
    skirt(W + 0.04, [0, TOP - skirtH / 2 + 0.01, D / 2 + 0.02], 0);
    skirt(W + 0.04, [0, TOP - skirtH / 2 + 0.01, -D / 2 - 0.02], Math.PI);
    skirt(D + 0.04, [-W / 2 - 0.02, TOP - skirtH / 2 + 0.01, 0], -Math.PI / 2);
    skirt(D + 0.04, [W / 2 + 0.02, TOP - skirtH / 2 + 0.01, 0], Math.PI / 2);
    // Push handle along one end.
    s.tube([[W / 2 + 0.02, TOP - 0.25, -0.2], [W / 2 + 0.1, TOP + 0.05, -0.2], [W / 2 + 0.1, TOP + 0.05, 0.2], [W / 2 + 0.02, TOP - 0.25, 0.2]], 0.011, frameMat);
    const Y = TOP + 0.012;

    // ---- the plate and the cloche --------------------------------------------------------
    const plateMat = s.material('#f7f5ef', { roughness: 0.3 });
    const px = -0.08, pz = 0.08;
    s.cylinder(0.15, 0.13, 0.012, [px, Y + 0.006, pz], plateMat, 28);
    s.cylinder(0.12, 0.12, 0.004, [px, Y + 0.013, pz], s.material('#ece9e1', { roughness: 0.35 }), 28);
    const dome = (at: P3, tilt = 0) => {
      const cl = s.mesh(new THREE.SphereGeometry(0.135, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), a.style === 'gilt' ? gold : chrome, at);
      cl.scale.y = 0.75; cl.rotation.z = tilt;
      s.ball([0.014, 0.014, 0.014], [at[0] - Math.sin(tilt) * 0.1, at[1] + Math.cos(tilt) * 0.1 + 0.003, at[2]], a.style === 'gilt' ? gold : chrome, 10);
      s.ring(0.137, 0.004, [at[0], at[1] + 0.002, at[2]], a.style === 'gilt' ? gold : chrome).rotation.x = Math.PI / 2;
    };
    if (a.cloche === 'on') dome([px, Y + 0.015, pz]);
    else {
      dome([0.3, Y + 0.004, -0.18]);
      const cold = s.material('#6f5546', { roughness: 0.75 });
      if (a.cloche === 'lifted' || a.cloche === 'picked') {
        const steak = s.ball([0.07, 0.014, 0.05], [px - 0.02, Y + 0.028, pz + 0.01], cold, 14);
        steak.rotation.y = 0.4;
        s.cylinder(0.065, 0.065, 0.002, [px - 0.02, Y + 0.017, pz + 0.01], s.material('#4a3028', { roughness: 0.5 }), 20);
        for (let i = 0; i < 6; i++) s.box([0.012, 0.012, 0.05], [px + 0.06 + (random() - 0.5) * 0.04, Y + 0.022, pz - 0.04 + i * 0.012], s.material('#d9b45a', { roughness: 0.8 })).rotation.y = (random() - 0.5) * 0.4;
        for (let i = 0; i < 4; i++) s.ball([0.013, 0.01, 0.013], [px + 0.02 + random() * 0.05, Y + 0.022, pz + 0.05 + random() * 0.03], s.material('#5f7a3a', { roughness: 0.9 }), 8);
        if (a.cloche === 'picked') {
          s.rod([px - 0.02, Y + 0.035, pz + 0.01], [px - 0.11, Y + 0.075, pz + 0.09], 0.004, chrome);
          s.box([0.012, 0.004, 0.02], [px - 0.02, Y + 0.036, pz + 0.01], chrome);
        }
      } else {
        for (let i = 0; i < 5; i++) { const smear = s.cylinder(0.02 + random() * 0.02, 0.02 + random() * 0.02, 0.0015, [px + (random() - 0.5) * 0.14, Y + 0.016, pz + (random() - 0.5) * 0.14], s.material('#5a3f33', { roughness: 0.4 }), 10); smear.scale.z = 0.5; }
        const knife = s.box([0.17, 0.004, 0.014], [px, Y + 0.02, pz], chrome); knife.rotation.y = 0.5;
        const fork = s.box([0.16, 0.004, 0.012], [px, Y + 0.024, pz], chrome); fork.rotation.y = -0.6;
        s.ball([0.045, 0.03, 0.04], [px + 0.18, Y + 0.03, pz + 0.12], linen, 10);
      }
    }

    // ---- wine --------------------------------------------------------------------------
    const bx = 0.3, bz = 0.12;
    const bucket = s.lathe([[0.0, 0], [0.085, 0], [0.1, 0.12], [0.11, 0.2], [0.125, 0.21], [0.11, 0.22], [0.095, 0.2], [0.085, 0.12], [0.075, 0.02]], a.style === 'gilt' ? gold : chrome, [bx, Y, bz]);
    void bucket;
    const ice = new THREE.MeshStandardMaterial({ color: '#dff2f8', transparent: true, opacity: 0.6, roughness: 0.1, depthWrite: false });
    for (let i = 0; i < 9; i++) { const cube = s.box([0.028, 0.028, 0.028], [bx + (random() - 0.5) * 0.14, Y + 0.2 + random() * 0.02, bz + (random() - 0.5) * 0.14], ice); cube.rotation.set(random(), random(), random()); }
    const glassTone = { red: '#1f3d22', white: '#8fb57a', champagne: '#2a3a22' }[a.bottle];
    const bottleMat = s.material(glassTone, { roughness: 0.15, metalness: 0.1 });
    const foil = s.material(a.bottle === 'champagne' ? '#d9b44a' : a.bottle === 'red' ? '#7a1f2a' : '#d8d8d2', { metalness: 0.6, roughness: 0.35 });
    const bottle = (at: P3, rx: number, rz: number, flip = false) => {
      const b = new THREE.Group(); b.position.set(...at); b.rotation.set(rx, 0, rz); s.root.add(b);
      const put = (m: THREE.Mesh) => { b.add(m); return m; };
      const body = put(s.lathe([[0, 0], [0.036, 0], [0.038, 0.02], [0.038, 0.19], [0.03, 0.23], [0.014, 0.26], [0.013, 0.31], [0.015, 0.315], [0, 0.315]], bottleMat));
      void body;
      put(s.cylinder(0.0155, 0.0155, 0.06, [0, 0.285, 0], foil, 12));
      put(s.cylinder(0.0385, 0.0385, 0.07, [0, 0.12, 0], s.material('#f1ead8', { roughness: 0.9 }), 14));
      put(s.box([0.03, 0.03, 0.01], [0, 0.12, 0.036], s.material(a.bottle === 'red' ? '#8a1f2a' : '#2a4fa8')));
      if (flip) b.rotation.x = Math.PI + 0.3;
      return b;
    };
    const glass = (at: P3, fill: number, tipped = false) => {
      const g = new THREE.Group(); g.position.set(...at); s.root.add(g);
      const put = (m: THREE.Mesh) => { g.add(m); return m; };
      const clear = new THREE.MeshStandardMaterial({ color: '#f2f7f8', transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false });
      put(s.lathe([[0.03, 0], [0.03, 0.004], [0.005, 0.006], [0.004, 0.075], [0.03, 0.09], [0.036, 0.14], [0.028, 0.18], [0.0265, 0.18], [0.033, 0.14], [0.028, 0.095], [0.0055, 0.08], [0.0055, 0.01], [0, 0.004]], clear));
      put(s.cylinder(0.03, 0.03, 0.004, [0, 0.003, 0], clear, 16));
      if (fill > 0) put(s.cylinder(0.031 * fill + 0.02, 0.02, 0.05 * fill, [0, 0.085 + 0.025 * fill, 0], s.material(a.bottle === 'red' ? '#6a1020' : '#e9d98a', { roughness: 0.1, transparent: true, opacity: 0.9, depthWrite: false }), 16));
      if (tipped) { g.rotation.z = Math.PI / 2 - 0.1; g.position.y = at[1] + 0.03; }
      return g;
    };
    if (a.wine === 'unopened') bottle([bx + 0.02, Y + 0.04, bz], 0, -0.3);
    else if (a.wine === 'poured') {
      bottle([bx - 0.2, Y, bz + 0.18], 0, 0);
      s.cylinder(0.011, 0.011, 0.04, [bx - 0.12, Y + 0.02, bz + 0.22], s.material('#c9a877', { roughness: 0.9 }), 10).rotation.z = Math.PI / 2;
      glass([bx - 0.05, Y, bz + 0.24], 0.5);
    } else {
      bottle([bx, Y + 0.3, bz], 0, 0, true);
      glass([bx - 0.08, Y, bz + 0.22], 0.1);
      glass([bx - 0.2, Y, bz + 0.2], 0, true);
      const stain = s.cylinder(0.05, 0.05, 0.001, [bx - 0.26, Y + 0.013, bz + 0.22], s.material(a.bottle === 'red' ? '#6a1020' : '#d9c67a', { roughness: 0.3 }), 16);
      stain.scale.z = 0.6;
    }

    // ---- the rose -----------------------------------------------------------------------
    const vx = -0.32, vz = -0.16;
    s.lathe([[0.03, 0], [0.03, 0.01], [0.022, 0.09], [0.014, 0.14], [0.016, 0.15], [0, 0.15]], new THREE.MeshStandardMaterial({ color: '#f0f6f7', transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false }), [vx, Y, vz]);
    s.cylinder(0.02, 0.02, 0.07, [vx, Y + 0.045, vz], new THREE.MeshStandardMaterial({ color: '#dfeff2', transparent: true, opacity: 0.5, roughness: 0.1, depthWrite: false }), 12);
    if (a.rose !== 'none') {
      const wilted = a.rose === 'wilted';
      const stem = s.material('#3f6b2e', { roughness: 0.8 });
      const bud = s.material(wilted ? '#5a1a1e' : new THREE.Color('#c81e32').lerp(new THREE.Color('#ff3a5c'), mood.cheer * 0.4), { roughness: 0.6 });
      const top: P3 = wilted ? [vx + 0.09, Y + 0.27, vz + 0.02] : [vx, Y + 0.4, vz];
      s.tube([[vx, Y + 0.05, vz], [vx, Y + 0.25, vz], wilted ? [vx + 0.03, Y + 0.33, vz] : [vx, Y + 0.34, vz], top], 0.004, stem);
      const head = s.ball([0.022, 0.032, 0.022], [top[0] + (wilted ? 0.02 : 0), top[1] + (wilted ? -0.02 : 0.02), top[2]], bud, 12);
      if (wilted) head.rotation.z = -1.6;
      for (let i = 0; i < 4; i++) { const petal = s.ball([0.016, 0.022, 0.006], [head.position.x + Math.cos(i * 1.57) * 0.014, head.position.y, head.position.z + Math.sin(i * 1.57) * 0.014], bud, 8); petal.rotation.y = i * 1.57; }
      for (const t of [0.4, 0.62]) { const leaf = s.ball([0.03, 0.004, 0.014], [vx + 0.03, Y + 0.05 + t * 0.25, vz], stem, 8); leaf.rotation.z = -0.4; }
      if (wilted) for (let i = 0; i < 5; i++) { const fallen = s.cylinder(0.014, 0.014, 0.002, [vx + 0.03 + random() * 0.16, Y + 0.013, vz - 0.05 + random() * 0.14], bud, 8); fallen.scale.z = 0.6; }
    }

    // ---- cutlery roll, bill, salt and pepper, extras ---------------------------------------
    const roll = s.cylinder(0.022, 0.022, 0.2, [0.05, Y + 0.022, 0.24], linen, 14);
    roll.rotation.z = Math.PI / 2; roll.rotation.y = 0.1;
    s.box([0.02, 0.006, 0.03], [-0.06, Y + 0.022, 0.235], chrome);
    s.ring(0.023, 0.004, [0.05, Y + 0.022, 0.24], a.style === 'gilt' ? gold : s.material('#8a1f2a')).rotation.y = Math.PI / 2;
    for (const dx of [0, 0.045]) s.cylinder(0.012, 0.014, 0.05, [0.12 + dx, Y + 0.025, -0.2], dx ? s.material('#2a2a2e') : s.material('#f4f2ee'), 10);
    if (a.bill) {
      const bill = new THREE.Group(); bill.position.set(-0.3, Y, 0.2); bill.rotation.y = -0.3; s.root.add(bill);
      const leaf = s.material('#f4f1e8', { roughness: 0.95 });
      const l1 = s.box([0.12, 0.002, 0.09], [-0.03, 0.045, 0], leaf); l1.rotation.z = 1.2; bill.add(l1);
      const l2 = s.box([0.12, 0.002, 0.09], [0.03, 0.045, 0], leaf); l2.rotation.z = -1.2; bill.add(l2);
      const pen = s.cylinder(0.004, 0.004, 0.13, [0.05, 0.004, 0.07], s.material('#17171a', { roughness: 0.35 }), 8); pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.6; bill.add(pen);
    }
    if (a.extra === 'coffee') {
      s.lathe([[0, 0], [0.05, 0], [0.055, 0.1], [0.045, 0.15], [0.03, 0.17], [0.032, 0.175], [0, 0.175]], a.style === 'gilt' ? gold : chrome, [-0.3, Y, -0.1]);
      s.tube([[-0.25, Y + 0.14, -0.1], [-0.22, Y + 0.12, -0.1], [-0.23, Y + 0.05, -0.1], [-0.26, Y + 0.03, -0.1]], 0.006, chrome);
      s.cylinder(0.055, 0.055, 0.006, [-0.18, Y + 0.003, -0.3], plateMat, 20);
      s.lathe([[0, 0], [0.03, 0], [0.036, 0.06], [0.034, 0.065], [0.028, 0.065], [0.028, 0.01], [0, 0.01]], plateMat, [-0.18, Y + 0.006, -0.3]);
    } else if (a.extra === 'newspaper') {
      const news = s.box([0.28, 0.02, 0.18], [-0.25, Y + 0.01, -0.22], s.material('#e6e2d6', { roughness: 0.95 }));
      news.rotation.y = 0.3;
      s.box([0.2, 0.002, 0.03], [-0.25, Y + 0.0215, -0.22], s.material('#1c1c20')).rotation.y = 0.3;
    } else if (a.extra === 'fruit') {
      s.lathe([[0, 0], [0.06, 0], [0.11, 0.06], [0.115, 0.065], [0.105, 0.06], [0.06, 0.012], [0, 0.012]], plateMat, [-0.3, Y, -0.1]);
      const fruits = ['#e8a23a', '#d9c23a', '#c8322e', '#6aa84f'];
      for (let i = 0; i < 4; i++) s.ball([0.035, 0.035, 0.035], [-0.3 + Math.cos(i * 1.6) * 0.04, Y + 0.05 + (i === 3 ? 0.04 : 0), -0.1 + Math.sin(i * 1.6) * 0.04], s.material(fruits[i], { roughness: 0.5 }), 12);
    } else if (a.extra === 'cake') {
      s.cylinder(0.08, 0.08, 0.006, [-0.3, Y + 0.003, -0.1], plateMat, 20);
      const slice = s.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12, 1, false, 0, Math.PI / 3), s.material('#f0d8a8', { roughness: 0.9 }), [-0.3, Y + 0.031, -0.1]);
      slice.rotation.y = 0.5;
      s.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 12, 1, false, 0, Math.PI / 3), s.material('#5a2d26', { roughness: 0.6 }), [-0.3, Y + 0.06, -0.1]).rotation.y = 0.5;
      s.mesh(new THREE.SphereGeometry(0.085, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#f2f7f8', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false }), [-0.3, Y + 0.006, -0.1]);
    }
    if (a.style === 'gilt') {
      s.cylinder(0.025, 0.03, 0.02, [0.0, Y + 0.01, -0.22], gold, 12);
      s.cylinder(0.009, 0.009, 0.12, [0.0, Y + 0.08, -0.22], s.material('#f5efe0'), 10);
      s.ball([0.01, 0.018, 0.01], [0.0, Y + 0.15, -0.22], new THREE.MeshStandardMaterial({ color: '#ffe9a0', emissive: '#ff9a10', emissiveIntensity: 2.4, transparent: true, opacity: 0.95, depthWrite: false }), 8);
    }

    const sway = mix(0.2, 1, mood.energy);
    const skirts = s.root.children.filter((c) => (c as THREE.Mesh).isMesh && (c as THREE.Mesh).geometry.attributes.position?.count > 40 && (c as THREE.Mesh).material === linen) as THREE.Mesh[];
    const rest = skirts.map((m) => Float32Array.from(m.geometry.attributes.position.array));
    return s.finish({
      update: (_dt, time) => {
        skirts.forEach((mesh, index) => {
          const p = mesh.geometry.attributes.position;
          const base = rest[index];
          for (let i = 0; i < p.count; i++) p.setZ(i, base[i * 3 + 2] * (1 + Math.sin(time * 1.3 + i * 0.4) * 0.12 * sway));
          p.needsUpdate = true;
        });
      },
    });
  },
});
