import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { blend, bump, dome, paint, relief, smooth, stain } from './relief';

const TONE = { porcelain: '#f3d6c6', honey: '#deaa86', olive: '#bd8a62', deep: '#74462f' } as const;

export default defineThing({
  questions: {
    shape: choice('What shape is the chin?', {
      cleft: 'A strong chin with a deep vertical cleft, film-star style.',
      pointed: 'Narrow and pointed, a sharp little V.',
      square: 'A wide square jaw with a flat bottom edge.',
      double: 'A soft double chin, a second roll folded under the first.',
      receding: 'A small receding chin sloping back to the neck.',
    }),
    surface: choice('What is on the skin?', {
      smooth: 'Smooth and bare, just shaved or never needing it.',
      stubble: 'Five o\'clock stubble shading the whole jaw.',
      foam: 'Thick white shaving foam with one clean stripe razored through it.',
      goatee: 'A trimmed goatee around the chin with a soul patch.',
      beard: 'A full bushy beard hanging off the jaw.',
    }),
    mark: choice('What mark does it carry?', {
      none: 'Nothing.',
      nick: 'A razor nick with a dot of tissue stuck on it, red showing through.',
      pimple: 'An angry red pimple with a white head.',
      labret: 'A steel labret stud under the lower lip.',
      scar: 'An old pale scar cutting across the jaw.',
    }),
    age: score('How old is the jaw?', ['Smooth teenager', 'Firm adult', 'Middle-aged and softening', 'Old: jowls, lines, grey hair']),
    attitude: choice('How is the chin held?', {
      level: 'Level and neutral.',
      proud: 'Jutting forward and up, proud or stubborn.',
      shy: 'Tucked down and turned aside, shy.',
      trembling: 'Puckered and trembling, the lower lip pushed out, about to cry.',
    }),
    tone: choice('What is the skin tone?', {
      porcelain: 'Pale porcelain pink.',
      honey: 'Warm honey beige.',
      olive: 'Olive tan.',
      deep: 'Deep brown.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tone = TONE[a.tone];
    const old = smooth(0.5, 1, a.age);
    const yTop = 0.046;
    const [Wj, yBot, e1, e2, bulge, chinR] = {
      cleft: [0.068, -0.064, 2.2, 2.6, 0.022, 0.03],
      pointed: [0.06, -0.076, 1.7, 1.45, 0.02, 0.02],
      square: [0.077, -0.058, 3.2, 4.2, 0.016, 0.042],
      double: [0.076, -0.09, 2.6, 3.2, 0.014, 0.03],
      receding: [0.062, -0.05, 2, 2, 0.003, 0.026],
    }[a.shape];
    const chinY = a.shape === 'double' ? -0.03 : yBot + 0.03;
    const pout = a.attitude === 'trembling' ? 1.5 : 1;
    const proud = a.attitude === 'proud' ? 1.3 : 1;
    const rise = 0.03, yMax = yTop + rise;
    const edge = (x: number) => yTop + rise * smooth(0.034, Wj * 0.98, Math.abs(x));
    const rim = (x: number, y: number) => Math.min(1 - Math.abs(x / Wj) ** e1 - (Math.max(0, yTop - y) / (yTop - yBot)) ** e2, (edge(x) - y) * 30 + 0.02);
    const lipZ = (x: number, y: number) => dome(x, y, 0, yTop - 0.011, 0.036, 0.0135, 0.009 * pout);
    const Z = (x: number, y: number) => {
      let z = -6.5 * x * x - 0.02 * smooth(0.04, 0.08, Math.abs(x)) - 0.02 * (1 - smooth(0, 0.3, 1 - Math.abs(x / Wj) ** e1 - (Math.max(0, yTop - y) / (yTop - yBot)) ** e2));
      z += bulge * proud * bump(Math.hypot(x * (a.shape === 'square' ? 0.6 : 1), y - chinY), chinR);
      z -= 0.006 * bump(y - (yTop - 0.03), 0.009) * bump(x, 0.04);
      if (a.shape === 'cleft') z -= 0.011 * bump(x, 0.0055) * bump(y - chinY + 0.004, 0.018);
      if (a.shape === 'receding') z -= 0.3 * Math.max(0, yTop - 0.02 - y);
      if (a.shape === 'double') z += 0.016 * bump(Math.hypot(x * 0.55, y + 0.066), 0.024) - 0.007 * bump(y + 0.05, 0.0045) * bump(x, 0.05);
      for (const side of [-1, 1]) z += old * 0.009 * bump(Math.hypot(x - side * Wj * 0.62, y - chinY - 0.012), 0.018);
      if (a.attitude === 'trembling') z += 0.0015 * Math.sin(x * 900) * Math.sin(y * 800) * bump(Math.hypot(x, y - chinY), 0.024);
      return z;
    };
    const top = (x: number, y: number) => Z(x, y) + lipZ(x, y);
    const W = 0.17, H = yMax - yBot + 0.012, CY = (yMax + yBot) / 2;
    const form3 = relief(W, H, 120, (x, y) => (rim(x, y + CY) > 0 ? top(x, y + CY) : null), (x, y) => Z(x, y + CY) - 0.017, (x, y) => rim(x, y + CY));
    const normal = (x: number, y: number) => new THREE.Vector3(-(Z(x + 0.001, y) - Z(x - 0.001, y)) / 0.002, -(Z(x, y + 0.001) - Z(x, y - 0.001)) / 0.002, 1).normalize();
    const point = (x: number, y: number, lift = 0) => new THREE.Vector3(x, y, Z(x, y)).addScaledVector(normal(x, y), lift);

    const hairTint = old > 0.55 ? ['#d8d6d0', '#9c9a96'] : [['#2a1c14', '#120c08'], ['#161214', '#060506'], ['#b4521e', '#7a3210'], ['#c9a25a', '#8a6a30']][Math.floor(random() * 4)];
    const whiskers = (x: number, y: number) => {
      if (a.surface === 'goatee') return bump(Math.hypot(x * 0.8, (y - chinY + 0.004) * 0.95), 0.027) > 0.42 || (Math.abs(x) < 0.008 && y > chinY && y < yTop - 0.026);
      return y < yTop - 0.027 - 0.012 * bump(x, 0.02) || Math.abs(x) > 0.04;
    };
    // The stripe a razor has just cleared through the foam.
    const stripeX = (random() < 0.5 ? -1 : 1) * mix(0.022, 0.036, random()), stripeEnd = chinY + mix(-0.004, 0.014, random());
    const inStripe = (x: number, y: number) => Math.abs(x - stripeX) < 0.011 && y > stripeEnd;
    const markSide = stripeX > 0 ? -1 : 1, markAt: [number, number] = [markSide * Wj * mix(0.3, 0.5, random()), chinY + mix(0.002, 0.02, random())];

    const map = paint(W, H, 768, (ctx) => {
      ctx.translate(0, -CY);
      ctx.fillStyle = tone;
      ctx.fillRect(-W, -1, W * 2, 2);
      for (let i = 0; i < 70; i++) stain(ctx, (random() - 0.5) * W, CY + (random() - 0.5) * H, 0.012, 0.012, random() < 0.5 ? blend(tone, '#a8483c', 0.5) : blend(tone, '#fff3e4', 0.5), 0.07);
      stain(ctx, 0, yTop - 0.03, 0.04, 0.009, '#4a2420', 0.3);
      stain(ctx, 0, chinY, chinR, chinR, '#fff0e2', 0.22);
      if (a.shape === 'cleft') stain(ctx, 0, chinY - 0.004, 0.006, 0.02, '#3a1c18', 0.75);
      if (a.shape === 'double') stain(ctx, 0, -0.05, 0.055, 0.005, '#3a1c18', 0.5);
      if (a.attitude === 'trembling') { stain(ctx, 0, chinY, 0.03, 0.022, '#c8443c', 0.3); for (let i = 0; i < 40; i++) stain(ctx, (random() - 0.5) * 0.04, chinY + (random() - 0.5) * 0.03, 0.0025, 0.0025, '#5a2a22', 0.4); }
      // Age: lines running down from the mouth corners, spots, slack shadows under the jowls.
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.strokeStyle = `rgba(70,30,24,${0.15 + old * 0.5})`; ctx.lineWidth = 0.0012 + old * 0.001;
        ctx.beginPath(); ctx.moveTo(side * 0.04, yTop - 0.006); ctx.quadraticCurveTo(side * 0.05, yTop - 0.03, side * 0.043, chinY + 0.004); ctx.stroke();
        stain(ctx, side * Wj * 0.62, chinY - 0.012, 0.02, 0.008, '#3a1c18', old * 0.4);
      }
      for (let i = 0; i < 26 * old; i++) stain(ctx, (random() - 0.5) * W, CY + (random() - 0.5) * H, 0.003, 0.003, '#6a3a20', 0.45);
      if (a.age < 0.2) for (let i = 0; i < 6; i++) stain(ctx, (random() - 0.5) * 0.1, chinY + (random() - 0.3) * 0.05, 0.003, 0.003, '#d0443c', 0.5);
      // Whiskers.
      if (a.surface !== 'smooth') {
        const dense = a.surface === 'stubble' || a.surface === 'foam';
        if (!dense) for (let i = 0; i < 2600; i++) { const x = (random() - 0.5) * W, y = CY + (random() - 0.5) * H; if (whiskers(x, y)) stain(ctx, x, y, 0.006, 0.006, hairTint[1], 0.55); }
        if (dense) for (let i = 0; i < 900; i++) { const x = (random() - 0.5) * W, y = CY + (random() - 0.5) * H; if (whiskers(x, y) && !(a.surface === 'foam' && inStripe(x, y))) stain(ctx, x, y, 0.009, 0.009, blend(hairTint[1], '#3a4450', 0.4), 0.13); }
        ctx.lineWidth = 0.00055;
        for (let i = 0; i < (dense ? 12000 : 5000); i++) {
          const x = (random() - 0.5) * W, y = CY + (random() - 0.5) * H;
          if (!whiskers(x, y) || (a.surface === 'foam' && inStripe(x, y))) continue;
          ctx.strokeStyle = random() < 0.75 ? hairTint[1] : hairTint[0]; ctx.globalAlpha = dense ? 0.3 + random() * 0.35 : 0.9;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 0.001, y - 0.0012 - random() * 0.0012); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      if (a.surface === 'foam') { stain(ctx, stripeX, (yTop + stripeEnd) / 2, 0.012, (yTop - stripeEnd) * 0.6, '#fff6ee', 0.5); stain(ctx, stripeX, (yTop + stripeEnd) / 2, 0.016, (yTop - stripeEnd) * 0.5, '#e87a70', 0.14); }
      // The lower lip.
      ctx.save();
      ctx.beginPath(); ctx.ellipse(0, yTop - 0.011, 0.036, 0.0135, 0, 0, 7); ctx.clip();
      ctx.fillStyle = blend(tone, a.tone === 'deep' ? '#8a4a4a' : '#c9606a', 0.62 - old * 0.2); ctx.fillRect(-0.05, yTop - 0.03, 0.1, 0.04);
      stain(ctx, 0, yTop - 0.013, 0.02, 0.004, '#ffffff', 0.35);
      stain(ctx, 0, yTop + 0.001, 0.04, 0.005, '#3a0c12', 0.75);
      stain(ctx, 0, yTop - 0.024, 0.036, 0.005, '#5a1c22', 0.35);
      ctx.strokeStyle = 'rgba(70,14,20,0.12)'; ctx.lineWidth = 0.0005;
      for (let i = 0; i < 26; i++) { const x = (random() - 0.5) * 0.066; ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x * 1.08, yTop - 0.012 - random() * 0.01); ctx.stroke(); }
      ctx.restore();
      if (a.mark === 'scar') {
        const [x, y] = markAt;
        ctx.strokeStyle = blend(tone, '#fff4ee', 0.75); ctx.lineWidth = 0.0022;
        ctx.beginPath(); ctx.moveTo(x - markSide * 0.014, y + 0.014); ctx.quadraticCurveTo(x, y + 0.002, x + markSide * 0.01, y - 0.018); ctx.stroke();
        ctx.strokeStyle = 'rgba(120,50,50,0.5)'; ctx.lineWidth = 0.0008;
        for (let i = 0; i < 5; i++) { const t = i / 4, px = x - markSide * 0.014 + markSide * 0.024 * t, py = y + 0.014 - 0.032 * t; ctx.beginPath(); ctx.moveTo(px - 0.003, py - 0.0015); ctx.lineTo(px + 0.003, py + 0.0015); ctx.stroke(); }
      }
      if (a.mark === 'pimple') stain(ctx, markAt[0], markAt[1], 0.01, 0.01, '#d0302c', 0.7);
      if (a.mark === 'nick') { ctx.strokeStyle = '#a80a1c'; ctx.lineWidth = 0.0012; ctx.beginPath(); ctx.moveTo(markAt[0], markAt[1]); ctx.lineTo(markAt[0] + 0.001, markAt[1] - 0.012); ctx.stroke(); }
      for (let i = 0; i < 45 * mood.wear; i++) stain(ctx, (random() - 0.5) * W, CY + (random() - 0.5) * H, 0.006, 0.006, '#6f675a', 0.2);
    });

    const form = new THREE.Group();
    const body = new THREE.Group();
    body.position.y = -CY;
    form.add(body);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = body) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const face = add(form3.front, new THREE.MeshStandardMaterial({ map, roughness: 0.62 }));
    face.position.y = CY;
    add(form3.shell, s.material(blend(tone, '#4a2c24', 0.4), { roughness: 0.85 })).position.y = CY;

    const steel = s.material('#dfe3e6', { metalness: 0.95, roughness: 0.18 });
    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, items: { at: THREE.Vector3; dir: THREE.Vector3; scale: [number, number, number]; color?: string }[]) => {
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      items.forEach((item, i) => {
        q.setFromUnitVectors(up, item.dir.clone().normalize());
        matrix.compose(item.at, q, new THREE.Vector3(...item.scale));
        mesh.setMatrixAt(i, matrix);
        if (item.color) mesh.setColorAt(i, new THREE.Color(item.color));
      });
      mesh.castShadow = mesh.receiveShadow = true;
      body.add(mesh);
      return mesh;
    };
    const sample = (): [number, number] => {
      for (;;) { const x = (random() - 0.5) * W, y = CY + (random() - 0.5) * H; if (rim(x, y) > 0.03) return [x, y]; }
    };

    if (a.surface === 'goatee' || a.surface === 'beard') {
      const strands: Parameters<typeof instanced>[2] = [];
      const want = a.surface === 'beard' ? 1500 : 650;
      for (let guard = 0; strands.length < want && guard < 20000; guard++) {
        const [x, y] = sample();
        if (!whiskers(x, y)) continue;
        const low = smooth(yTop - 0.03, yBot, y);
        const long = a.surface === 'beard' ? mix(0.012, 0.042, low) * mix(0.7, 1.2, random()) : mix(0.006, 0.013, low) * mix(0.7, 1.2, random());
        const dir = normal(x, y).multiplyScalar(0.55).add(new THREE.Vector3(x * 4 + (random() - 0.5) * 0.5, -1 + (random() - 0.5) * 0.3, 0.1));
        strands.push({ at: point(x, y, -0.001), dir, scale: [0.0034, long, 0.0034], color: blend(hairTint[0], hairTint[1], random()) });
      }
      const cone = new THREE.ConeGeometry(1, 1, 5, 1);
      cone.translate(0, 0.5, 0);
      instanced(cone, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 }), strands);
    }
    if (a.surface === 'foam') {
      const blobs: Parameters<typeof instanced>[2] = [];
      for (let guard = 0; blobs.length < 330 && guard < 20000; guard++) {
        const [x, y] = sample();
        if (!whiskers(x, y) || inStripe(x, y) || rim(x, y) < 0.06) continue;
        const r = mix(0.006, 0.0115, random());
        blobs.push({ at: point(x, y, r * 0.25), dir: normal(x, y), scale: [r, r * mix(0.6, 0.9, random()), r] });
      }
      // A ridge of scraped foam piled along both sides of the stripe.
      for (let i = 0; i < 26; i++) { const y = mix(stripeEnd, yTop - 0.03, random()), x = stripeX + (random() < 0.5 ? -1 : 1) * 0.0125; if (rim(x, y) > 0.05) blobs.push({ at: point(x, y, 0.004), dir: normal(x, y), scale: [0.005, 0.006, 0.005] }); }
      instanced(new THREE.IcosahedronGeometry(1, 2), s.material('#fbfbf6', { roughness: 0.95 }), blobs);
      // The razor, paused at the bottom of its stroke.
      const razor = new THREE.Group(), n = normal(stripeX, stripeEnd);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.009, 0.006), steel); head.castShadow = true; razor.add(head);
      const guardBar = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.003, 0.009), s.material('#2c8ad0', { roughness: 0.4 })); guardBar.position.y = 0.004; razor.add(guardBar);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0052, 0.064, 12), s.material('#2c8ad0', { roughness: 0.35 }));
      handle.position.set(0, -0.022, 0.028); handle.rotation.x = -0.95; handle.castShadow = true; razor.add(handle);
      const lather = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), s.material('#fbfbf6', { roughness: 0.95 })); lather.position.set(0.004, -0.004, 0.004); lather.scale.set(1.6, 0.7, 0.8); razor.add(lather);
      razor.position.copy(point(stripeX, stripeEnd - 0.004, 0.004));
      razor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      body.add(razor);
    }

    const [mx, my] = markAt;
    if (a.mark === 'nick') {
      const tissue = add(new THREE.CircleGeometry(0.0085, 7), s.material('#fbf9f2', { roughness: 1, side: THREE.DoubleSide }));
      tissue.position.copy(point(mx, my, a.surface === 'foam' ? 0.006 : 0.0012));
      tissue.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal(mx, my));
      const blood = add(new THREE.CircleGeometry(0.0034, 10), s.material('#b80f20', { roughness: 0.6 }));
      blood.position.copy(tissue.position).addScaledVector(normal(mx, my), 0.0006);
      blood.quaternion.copy(tissue.quaternion);
    }
    if (a.mark === 'pimple') {
      const spot = add(new THREE.SphereGeometry(0.0048, 14, 10), s.material('#d83a34', { roughness: 0.35 }));
      spot.position.copy(point(mx, my, 0.0008));
      add(new THREE.SphereGeometry(0.0022, 10, 8), s.material('#fff6c8', { roughness: 0.3 })).position.copy(point(mx, my, 0.0046));
    }
    if (a.mark === 'labret') {
      const y = yTop - 0.031, n = normal(0, y);
      add(new THREE.SphereGeometry(0.0052, 18, 12), steel).position.copy(point(0, y, 0.006));
      add(new THREE.CylinderGeometry(0.0034, 0.0034, 0.004, 12), steel).position.copy(point(0, y, 0.001));
      body.children[body.children.length - 1].quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    }
    let tear: THREE.Mesh | null = null;
    if (a.attitude === 'trembling') {
      tear = add(new THREE.SphereGeometry(0.0046, 12, 10), new THREE.MeshPhysicalMaterial({ color: '#dff2ff', roughness: 0.05, clearcoat: 1, emissive: '#9fc8e8', emissiveIntensity: 0.3 }));
      const tx = (random() < 0.5 ? -1 : 1) * 0.02;
      tear.scale.set(1, 1.5, 0.8);
      tear.position.copy(point(tx, chinY - 0.006, 0.003));
    }

    const tilt = { level: -0.12, proud: 0.2, shy: -0.42, trembling: -0.2 }[a.attitude];
    form.rotation.set(tilt, a.attitude === 'shy' ? (random() < 0.5 ? -1 : 1) * mix(0.3, 0.5, random()) : (random() - 0.5) * 0.15, 0, 'YXZ');
    form.position.set(0, 0.15, a.attitude === 'proud' ? 0.012 : 0);
    s.root.add(form);

    const gold = s.material('#d9ae52', { metalness: 0.9, roughness: 0.25 });
    s.lathe([[0, 0], [0.058, 0], [0.058, 0.006], [0.05, 0.012], [0.014, 0.016], [0.008, 0.03], [0, 0.03]], gold, [0, 0, -0.03]);
    s.rod([0, 0.02, -0.03], [0, 0.135, -0.03], 0.005, gold);
    if (a.surface === 'smooth' && mood.density > 0.35) {
      // A foundation sponge left beside the stand.
      const sponge = s.lathe([[0, 0], [0.012, 0.003], [0.017, 0.014], [0.014, 0.03], [0.006, 0.04], [0, 0.042]], s.material(mood.cheer > 0.5 ? '#f06aa8' : '#e9b48a', { roughness: 1 }), [0.07, 0, 0.045]);
      sponge.rotation.z = 0.2;
      s.ball([0.01, 0.002, 0.008], [0.07, 0.036, 0.052], s.material(tone, { roughness: 1 }), 8);
    }
    if ((a.surface === 'foam' || a.surface === 'stubble') && mood.density > 0.5) {
      // A shaving brush standing on its handle.
      s.lathe([[0, 0], [0.014, 0], [0.015, 0.01], [0.009, 0.022], [0.012, 0.034], [0, 0.034]], s.material('#3a2a20', { roughness: 0.4 }), [-0.075, 0, 0.04]);
      s.lathe([[0, 0.034], [0.011, 0.034], [0.019, 0.06], [0.015, 0.07], [0, 0.074]], s.material(a.surface === 'foam' ? '#f6f4ec' : '#c9b79a', { roughness: 1 }), [-0.075, 0, 0.04]);
    }

    const pace = mix(0.4, 2.5, mood.energy), home = form.rotation.x, tearY = tear ? tear.position.y : 0;
    return s.finish({
      update: (_dt, time) => {
        if (a.attitude === 'trembling') { form.rotation.x = home + Math.sin(time * 31) * 0.008 * (0.5 + mood.energy); if (tear) tear.position.y = tearY - ((time * pace * 0.004) % 0.012); }
        else form.rotation.x = home + Math.sin(time * pace) * 0.012;
      },
    });
  },
});
