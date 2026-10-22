import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    portion: choice('How much of the bread is left?', {
      whole: 'Whole and untouched, left for the dead to take first.',
      wedge: 'One wedge cut out and set beside it, the first slice.',
      half: 'Half gone, shared round the table, crumbs on the plate.',
      last: 'Only a last piece and a scatter of crumbs and sugar.',
    }),
    style: choice('How is the loaf shaped on top?', {
      cross: 'Four dough bones crossed over the crown with a knob in the middle, the classic.',
      six: 'Six bones radiating like wheel spokes, a showy bakery loaf.',
      carita: 'A smooth yolk loaf with a tiny painted face pressed into it, Oaxacan style.',
    }),
    topping: choice('What is it finished with?', {
      sugar: 'A thick crust of white sugar.',
      pink: 'Bright pink sugar.',
      red: 'Blood-red sugar, the village way.',
      sesame: 'Sesame seeds on a shiny egg glaze.',
      glaze: 'Nothing but a dark glossy egg glaze.',
    }),
    size: score('How big is the loaf?', ['A small individual bun', 'Enough for two', 'A big family loaf']),
    plate: choice('What is it served on?', {
      talavera: 'A white plate painted with cobalt blue flowers.',
      barro: 'A red clay plate with cream painted petals.',
      peltre: 'A chipped blue enamel plate speckled white.',
      paper: 'No plate: the pink bakery paper it came home in.',
    }),
    drink: choice('What is beside it to drink?', {
      chocolate: 'A clay mug of frothy hot chocolate.',
      cafe: 'Black cinnamon coffee in a small clay cup.',
      atole: 'A bowl of thick pale atole.',
      milk: 'A glass of milk, for a child.',
      none: 'Nothing to drink.',
    }),
    molinillo: noul('Is a carved wooden chocolate whisk lying beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = mix(0.075, 0.125, a.size), h = r * 0.78;
    const glazed = a.topping === 'glaze' || a.topping === 'sesame';
    const crustColour = new THREE.Color(glazed ? '#a8621f' : '#c98d42').lerp(new THREE.Color('#7a4a1c'), mood.wear * 0.3);
    const crust = new THREE.MeshStandardMaterial({ color: crustColour, roughness: glazed ? 0.28 : 0.8 });
    const boneMat = new THREE.MeshStandardMaterial({ color: crustColour.clone().lerp(new THREE.Color('#e2b672'), 0.25), roughness: glazed ? 0.28 : 0.8 });
    const crumb = new THREE.MeshStandardMaterial({ color: '#f0d695', roughness: 0.95, side: THREE.DoubleSide });
    const speckColour = { sugar: '#fffdf6', pink: '#f25f9c', red: '#c4141e', sesame: '#efe0b4', glaze: '#ffffff' }[a.topping];
    const speckMat = new THREE.MeshStandardMaterial({ color: speckColour, roughness: 0.4, emissive: speckColour, emissiveIntensity: a.topping === 'sesame' ? 0.05 : 0.25 });
    const dummy = new THREE.Object3D();
    const surface = (psi: number, d: number, lift = 1) => new THREE.Vector3(Math.sin(psi) * d * r, h * Math.sqrt(Math.max(0, 1 - d * d)) * lift, Math.cos(psi) * d * r);
    const boneAngles = a.style === 'cross' ? [0, 1, 2, 3].map((k) => Math.PI / 4 + k * Math.PI / 2) : a.style === 'six' ? [0, 1, 2, 3, 4, 5].map((k) => 0.3 + k * Math.PI / 3) : [];
    const TAU = Math.PI * 2;
    const within = (psi: number, from: number, span: number, margin: number) => { const rel = ((psi - from) % TAU + TAU) % TAU; return span >= TAU - 0.001 || (rel > margin && rel < span - margin); };

    const piece = (from: number, span: number, top: boolean) => {
      const g = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
      const dome = add(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 12, from + Math.PI / 2, span, 0, Math.PI / 2), crust));
      dome.scale.set(r, h, r);
      if (span < TAU - 0.001) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        for (let i = 0; i <= 14; i++) shape.lineTo(Math.cos(i / 14 * Math.PI / 2) * r, Math.sin(i / 14 * Math.PI / 2) * h);
        for (const psi of [from, from + span]) add(new THREE.Mesh(new THREE.ShapeGeometry(shape), crumb)).rotation.y = psi - Math.PI / 2;
      }
      const tube = 0.15 * r;
      for (const psi of boneAngles) {
        if (!within(psi, from, span, 0.2)) continue;
        const pts = [0.22, 0.45, 0.68, 0.86, 0.97].map((d) => surface(psi, d, 1.02));
        add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, tube, 8), boneMat));
        for (const d of [0.4, 0.66, 0.9]) { const knuckle = add(new THREE.Mesh(new THREE.SphereGeometry(tube * 1.35, 12, 8), boneMat)); knuckle.position.copy(surface(psi, d, 1.05)); }
      }
      if (top && a.style !== 'carita') add(new THREE.Mesh(new THREE.SphereGeometry(0.2 * r, 16, 10), boneMat)).position.set(0, h * 1.02, 0);
      if (a.style === 'carita' && within(0, from, span, 0.25)) {
        const face = add(new THREE.Mesh(new THREE.SphereGeometry(0.17 * r, 14, 10), new THREE.MeshStandardMaterial({ color: '#fbf6ea', roughness: 0.4 })));
        face.position.copy(surface(0, 0.55, 1.0));
        const band = add(new THREE.Mesh(new THREE.TorusGeometry(0.15 * r, 0.03 * r, 6, 18), new THREE.MeshStandardMaterial({ color: '#d81f6f', emissive: '#d81f6f', emissiveIntensity: 0.2 })));
        band.position.copy(face.position).add(new THREE.Vector3(0, 0.07 * r, -0.05 * r)); band.rotation.x = 1.0;
        const ink = new THREE.MeshStandardMaterial({ color: '#221a18' });
        for (const side of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.022 * r, 6, 5), ink)).position.copy(face.position).add(new THREE.Vector3(side * 0.06 * r, 0.05 * r, 0.15 * r));
        for (const side of [-1, 1]) {
          const pts = [0.3, 0.5, 0.7, 0.9].map((d, i) => surface(side * (0.7 + Math.sin(i * 1.4) * 0.25), d, 1.01));
          add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.02 * r, 5), new THREE.MeshStandardMaterial({ color: '#d81f6f' })));
        }
      }
      if (a.topping !== 'glaze') {
        const count = Math.round((a.topping === 'sesame' ? 380 : 1100) * span / TAU * mix(0.6, 1.3, a.size));
        const specks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), speckMat, count);
        for (let i = 0; i < count; i++) {
          const psi = from + random() * span, d = Math.sqrt(random()) * 0.97;
          dummy.position.copy(surface(psi, d, 1.012));
          const near = boneAngles.some((b) => Math.abs((((psi - b) % TAU + TAU + Math.PI) % TAU) - Math.PI) * d < 0.2) && d > 0.18;
          if (near && within(psi, from, span, 0.2)) dummy.position.y += tube * 0.85 + 0.002;
          if (d < 0.2 && top && a.style !== 'carita') dummy.position.y += 0.19 * r;
          dummy.rotation.set(random() * 3, random() * 3, random() * 3);
          const size = a.topping === 'sesame' ? 0.0022 : mix(0.0012, 0.0024, random());
          dummy.scale.set(size * (a.topping === 'sesame' ? 1.7 : 1), size * 0.7, size);
          dummy.updateMatrix(); specks.setMatrixAt(i, dummy.matrix);
        }
        g.add(specks);
      }
      s.root.add(g);
      return g;
    };

    // Plate or paper.
    const R = r * 1.62;
    let top = 0.005;
    if (a.plate === 'paper') {
      const sheet = s.mesh(new THREE.PlaneGeometry(R * 2.5, R * 2.3, 8, 8), new THREE.MeshStandardMaterial({ color: '#f29ab8', roughness: 0.9, side: THREE.DoubleSide }), [0, 0.003, 0]);
      const pos = sheet.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { const edge = Math.max(Math.abs(pos.getX(i)) / (R * 1.25), Math.abs(pos.getY(i)) / (R * 1.15)); pos.setZ(i, edge > 0.7 ? random() * 0.022 * edge : random() * 0.002); }
      sheet.geometry.computeVertexNormals();
      sheet.rotation.x = -Math.PI / 2; sheet.rotation.z = 0.3 + random() * 0.4;
      top = 0.006;
    } else {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
      const g = canvas.getContext('2d')!;
      const [base, ink, accent] = { talavera: ['#f6f3ea', '#1f46b0', '#f2c230'], barro: ['#a8482c', '#f4e6c4', '#2f6a3a'], peltre: ['#2a57a8', '#f4f6f8', '#f4f6f8'] }[a.plate];
      g.fillStyle = base; g.fillRect(0, 0, 512, 96);
      if (a.plate === 'peltre') { g.fillStyle = ink; for (let i = 0; i < 260; i++) g.fillRect(random() * 512, 50 + random() * 30, 3, 2.5); g.fillStyle = '#16233f'; g.fillRect(0, 44, 512, 5); }
      else {
        g.fillStyle = ink; g.fillRect(0, 46, 512, 3); g.fillRect(0, 76, 512, 3);
        for (let i = 0; i < 16; i++) {
          const x = 16 + i * 32;
          g.fillStyle = ink; for (let p = 0; p < 5; p++) { g.beginPath(); g.ellipse(x + Math.cos(p * 1.257) * 6, 62 + Math.sin(p * 1.257) * 4.5, 5, 3.5, 0, 0, 7); g.fill(); }
          g.fillStyle = accent; g.beginPath(); g.arc(x, 62, 2.6, 0, 7); g.fill();
          g.fillStyle = ink; g.beginPath(); g.arc(x + 16, 62, 1.8, 0, 7); g.fill();
        }
      }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = THREE.RepeatWrapping;
      s.lathe([[0, 0.006], [R * 0.62, 0.006], [R * 0.93, 0.02], [R, 0.022], [R * 0.93, 0.013], [R * 0.5, 0], [0, 0]], new THREE.MeshStandardMaterial({ map, roughness: 0.25 }));
      top = 0.006;
      if (a.plate === 'peltre') for (let i = 0; i < 3; i++) { const ang = random() * 6.28; s.ball([0.006, 0.002, 0.004], [Math.cos(ang) * R * 0.98, 0.021, Math.sin(ang) * R * 0.98], s.material('#1a1a1c'), 6); }
    }

    // The bread.
    const crumbs = { whole: 0, wedge: 14, half: 50, last: 90 }[a.portion];
    if (a.portion === 'whole') piece(0, TAU, true).position.y = top;
    else if (a.portion === 'wedge') {
      piece(0.55, TAU - 1.15, true).position.y = top;
      const slice = piece(-0.6, 1.15, false);
      slice.position.set(-r * 0.75, a.plate === 'paper' ? top : 0.012, r * 1.25);
      slice.rotation.y = -0.5 + random() * 0.3;
    } else if (a.portion === 'half') {
      const half = piece(Math.PI / 2 + 0.25, Math.PI, true);
      half.position.set(0, top, -r * 0.1);
    } else {
      const slice = piece(-0.55, 1.1, false);
      slice.position.set(r * 0.15, top, -r * 0.5);
      slice.rotation.y = 0.5 + random();
    }
    if (crumbs) {
      const bits: { at: V3; size: number; color: string }[] = [];
      for (let i = 0; i < crumbs; i++) {
        const ang = random() * 6.28, d = Math.sqrt(random()) * R * 0.6;
        bits.push({ at: [Math.cos(ang) * d, top + 0.002, Math.sin(ang) * d + (a.portion === 'half' ? r * 0.3 : 0)], size: mix(0.0015, 0.005, random() ** 2), color: random() < 0.5 && a.topping !== 'glaze' ? speckColour : '#e0b872' });
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.9 }), bits);
    }

    // Drink.
    const cx = R + 0.065, cz = r * 0.35;
    const steam: THREE.Mesh[] = [];
    let steamAt: V3 | null = null;
    if (a.drink === 'chocolate' || a.drink === 'cafe') {
      const big = a.drink === 'chocolate';
      const k = big ? 1 : 0.72;
      const clay = s.material(big ? '#9a4a2c' : '#3a2a22', { roughness: big ? 0.6 : 0.3 });
      s.lathe([[0, 0], [0.028 * k, 0], [0.043 * k, 0.03 * k], [0.044 * k, 0.06 * k], [0.036 * k, 0.085 * k], [0.04 * k, 0.1 * k], [0.036 * k, 0.1 * k], [0.032 * k, 0.086 * k], [0, 0.08 * k]], clay, [cx, 0, cz]);
      const handle = s.ring(0.022 * k, 0.006 * k, [cx + 0.046 * k, 0.055 * k, cz], clay, Math.PI);
      handle.rotation.z = -Math.PI / 2;
      if (big) for (let i = 0; i < 9; i++) { const ang = i / 9 * 6.28; s.ball([0.004, 0.006, 0.002], [cx + Math.sin(ang) * 0.0445, 0.048, cz + Math.cos(ang) * 0.0445], s.material('#f1e2c0'), 8); }
      const liquid = big ? '#5a2f1c' : '#1e120c';
      s.cylinder(0.034 * k, 0.034 * k, 0.003, [cx, 0.09 * k, cz], s.material(liquid, { roughness: 0.2 }), 20);
      if (big) { const froth = []; for (let i = 0; i < 26; i++) { const ang = random() * 6.28, d = Math.sqrt(random()) * 0.03; froth.push({ at: [cx + Math.cos(ang) * d, 0.092, cz + Math.sin(ang) * d] as V3, size: mix(0.002, 0.0055, random()) }); } s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#b98a66', { roughness: 0.3 }), froth); }
      steamAt = [cx, 0.1 * k, cz];
    } else if (a.drink === 'atole') {
      s.lathe([[0, 0], [0.03, 0], [0.036, 0.008], [0.06, 0.045], [0.064, 0.06], [0.06, 0.06], [0.055, 0.046], [0, 0.012]], s.material('#b05a34', { roughness: 0.5 }), [cx + 0.015, 0, cz]);
      s.cylinder(0.056, 0.056, 0.003, [cx + 0.015, 0.05, cz], s.material('#ead9b4', { roughness: 0.35 }), 24);
      s.ball([0.012, 0.002, 0.008], [cx + 0.02, 0.052, cz + 0.01], s.material('#b8793a'), 8);
      steamAt = [cx + 0.015, 0.055, cz];
    } else if (a.drink === 'milk') {
      s.cylinder(0.031, 0.026, 0.11, [cx, 0.055, cz], new THREE.MeshPhysicalMaterial({ color: '#e8f2f4', transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false }), 24);
      s.cylinder(0.029, 0.025, 0.08, [cx, 0.043, cz], s.material('#fbfaf4', { roughness: 0.3 }), 24);
      s.ring(0.031, 0.0018, [cx, 0.11, cz], s.material('#dfe9ec', { roughness: 0.1 })).rotation.x = Math.PI / 2;
    }
    if (steamAt && mood.wear < 0.85) {
      const steamMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false });
      for (let i = 0; i < 3; i++) {
        const pts: V3[] = [];
        const ox = (i - 1) * 0.012, sway = random() * 6;
        for (let j = 0; j < 7; j++) pts.push([steamAt[0] + ox + Math.sin(j * 1.2 + sway) * 0.008, steamAt[1] + 0.004 + j * 0.016, steamAt[2] + Math.cos(j * 0.9 + sway) * 0.006]);
        const wisp = s.tube(pts, 0.003, steamMat); wisp.castShadow = false;
        steam.push(wisp);
      }
    }

    if (a.molinillo) {
      const wood = s.material('#7a4a26', { roughness: 0.7 }), z = R + 0.045, len = 0.26;
      const g = new THREE.Group();
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.007, len, 10), wood); stick.rotation.z = Math.PI / 2;
      const head = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.014, 0.004], [0.024, 0.02], [0.02, 0.036], [0.012, 0.045], [0.022, 0.055], [0.012, 0.066], [0, 0.07]].map(([x, y]) => new THREE.Vector2(x, y)), 16), wood);
      head.rotation.z = Math.PI / 2; head.position.x = -len / 2 + 0.03;
      const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 6, 16), s.material('#3a2414')); ringA.rotation.y = Math.PI / 2; ringA.position.x = -len / 2 + 0.06;
      const ringB = ringA.clone(); ringB.position.x = -len / 2 + 0.085;
      for (const m of [stick, head, ringA, ringB]) { m.castShadow = true; g.add(m); }
      g.position.set(0.01, 0.024, z); g.rotation.y = 0.18 + (random() - 0.5) * 0.3;
      s.root.add(g);
    }
    if (mood.density > 0.55) for (let i = 0; i < 2 + Math.floor(mood.density * 3); i++) {
      const bloom = s.mesh(new THREE.IcosahedronGeometry(0.02, 1), s.material('#ee7a0c', { flatShading: true }), [-R - 0.02 - random() * 0.04, 0.014, (random() - 0.5) * R * 1.6]);
      bloom.scale.y = 0.7;
    }

    const speed = mix(0.4, 2.5, mood.energy);
    return s.finish({ update: (_dt, time) => { steam.forEach((wisp, i) => { wisp.rotation.y = Math.sin(time * speed + i * 2) * 0.4; wisp.position.x = Math.sin(time * speed * 0.7 + i) * 0.003; }); } });
  },
});
