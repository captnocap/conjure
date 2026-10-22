import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    plant: choice('What plant is it?', {
      geranium: 'A geranium: round scalloped leaves and heads of small bright flowers on long stalks.',
      rubber: 'A rubber plant: a woody stem with big glossy dark oval leaves.',
      snake: 'Mother-in-law’s tongue: stiff upright sword leaves banded green, impossible to kill.',
      aloe: 'An aloe: a rosette of fat grey-green spikes with pups at its foot.',
    }),
    health: choice('How is it doing, and what does that tell?', {
      thriving: 'Thriving: full, glossy and turned regularly. Someone loves it.',
      leggy: 'Leggy and pale, stretched sideways toward a window it barely reaches.',
      watered: 'Just watered: dark wet soil, a full saucer and drips on the floor.',
      'left-behind': 'Left behind: dry, brown and drooping, dropped leaves all around.',
      cuttings: 'Newly potted cuttings: a few small shoots in a lot of bare soil, a fresh start.',
    }),
    pot: choice('What is it planted in?', {
      terracotta: 'A plain terracotta pot with a white crust of lime.',
      enamel: 'An old enamel cooking pot with two handles and a chipped rim.',
      bucket: 'A plastic mayonnaise bucket in a loud colour, with its wire handle.',
      glazed: 'A bulbous glazed ceramic pot with a striped pattern from the seventies.',
      tin: 'A big catering tin with ribs and the remains of a label.',
    }),
    stand: choice('What does the pot stand on?', {
      wire: 'A thin three-legged wire plant stand with curled feet.',
      stool: 'A square painted kitchen stool.',
      cabinet: 'A small bedside cabinet with one drawer, put out on the landing.',
      floor: 'Straight on the floor in a corner.',
    }),
    mat: choice('What lies under the pot?', {
      doily: 'A round white crocheted doily, starched lace.',
      granny: 'A crocheted granny square in rings of leftover wool colours.',
      plastic: 'A pastel plastic lace mat, wipe-clean.',
      newspaper: 'A folded sheet of newspaper, water-stained.',
      none: 'Nothing but a saucer.',
    }),
    bloom: choice('If it flowers, what colour?', {
      red: 'Pillar-box red.', pink: 'Bright candy pink.', salmon: 'Soft salmon.', white: 'White with a blush.', magenta: 'Deep magenta.',
    }),
    care: choice('What sign of its keeper is nearby?', {
      bottle: 'A plastic bottle of water left standing beside it.',
      note: 'A small handwritten note on a stick pushed into the soil.',
      stake: 'A cane and a strip of rag tying the plant upright.',
      eggshells: 'Crushed eggshells scattered over the soil as fertiliser.',
      none: 'No sign at all.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const health = {
      thriving: { vigor: 1, dry: 0, droop: 0, lean: 0, stretch: 1 },
      leggy: { vigor: 0.45, dry: 0.14, droop: 0.15, lean: 0.55, stretch: 1.9 },
      watered: { vigor: 0.8, dry: 0, droop: 0, lean: 0.08, stretch: 1 },
      'left-behind': { vigor: 0.42, dry: 0.85, droop: 0.8, lean: 0.1, stretch: 1 },
      cuttings: { vigor: 0.25, dry: 0, droop: 0, lean: 0, stretch: 0.4 },
    }[a.health];
    const wet = a.health === 'watered';

    // Stand.
    let T = 0, standR = 0.2;
    if (a.stand === 'wire') {
      T = 0.52; standR = 0.15;
      const wire = s.material(pick(['#2b2b2b', '#e9e6dc', '#7a5a2a']), { metalness: 0.6, roughness: 0.5 });
      s.ring(0.14, 0.006, [0, T - 0.006, 0], wire).rotation.x = Math.PI / 2;
      s.ring(0.085, 0.004, [0, T - 0.006, 0], wire).rotation.x = Math.PI / 2;
      s.ring(0.1, 0.004, [0, 0.22, 0], wire).rotation.x = Math.PI / 2;
      for (let k = 0; k < 3; k++) {
        const ang = (k / 3) * Math.PI * 2 + 0.4, c = Math.cos(ang), n = Math.sin(ang);
        s.tube([[c * 0.14, T - 0.006, n * 0.14], [c * 0.11, 0.3, n * 0.11], [c * 0.1, 0.2, n * 0.1], [c * 0.16, 0.05, n * 0.16], [c * 0.2, 0.012, n * 0.2], [c * 0.22, 0.03, n * 0.22], [c * 0.205, 0.045, n * 0.205]], 0.006, wire);
        s.rod([c * 0.14, T - 0.006, n * 0.14], [0, T - 0.006, 0], 0.004, wire);
      }
    } else if (a.stand === 'stool') {
      T = 0.44; standR = 0.17;
      const paint = s.material(pick(['#e9e5d6', '#7fa3b8', '#8da36c', '#b9703c', '#c8b560']), { roughness: 0.55 });
      s.box([0.32, 0.03, 0.32], [0, T - 0.015, 0], paint);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([x * 0.12, T - 0.03, z * 0.12], [x * 0.15, 0, z * 0.15], 0.016, paint, 0.02);
      for (const x of [-1, 1]) s.rod([x * 0.14, 0.14, -0.14], [x * 0.14, 0.14, 0.14], 0.01, paint);
      for (const z of [-1, 1]) s.rod([-0.135, 0.22, z * 0.135], [0.135, 0.22, z * 0.135], 0.01, paint);
    } else if (a.stand === 'cabinet') {
      T = 0.5; standR = 0.2;
      const veneer = s.material(pick(['#8a5a34', '#b08a5a', '#5c4030', '#d9d2bd']), { roughness: 0.45 });
      s.box([0.38, 0.4, 0.32], [0, 0.29, 0], veneer);
      s.box([0.4, 0.02, 0.34], [0, T - 0.01, 0], veneer);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([x * 0.16, 0.09, z * 0.13], [x * 0.17, 0, z * 0.14], 0.014, s.material('#2e2a26'), 0.009);
      const dark = s.material('#3b2a1e');
      s.box([0.34, 0.004, 0.004], [0, 0.375, 0.161], dark);
      s.ball([0.012, 0.012, 0.012], [0, 0.43, 0.168], s.material('#c9a23c', { metalness: 0.7, roughness: 0.3 }), 10);
      s.ball([0.01, 0.01, 0.01], [0.13, 0.25, 0.168], s.material('#c9a23c', { metalness: 0.7, roughness: 0.3 }), 10);
      s.box([0.004, 0.24, 0.004], [-0.165, 0.23, 0.161], dark);
    } else {
      T = 0; standR = 0.24;
    }

    // Mat.
    const matR = Math.min(standR + 0.035, 0.21);
    if (a.mat !== 'none') {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const g = canvas.getContext('2d')!;
      if (a.mat === 'doily' || a.mat === 'plastic') {
        g.fillStyle = a.mat === 'doily' ? '#f4f1e6' : pick(['#f3c9d6', '#c9e6d2', '#f1e7a8', '#cfdff3']);
        g.beginPath();
        for (let k = 0; k <= 96; k++) { const t = (k / 96) * Math.PI * 2, rr = 112 + Math.abs(Math.sin(t * 8)) * 14; g.lineTo(128 + Math.cos(t) * rr, 128 + Math.sin(t) * rr); }
        g.fill();
        g.globalCompositeOperation = 'destination-out';
        for (const [rad, count, size] of [[108, 32, 5], [92, 16, 9], [74, 24, 5], [60, 12, 7]] as const)
          for (let k = 0; k < count; k++) { const t = (k / count) * Math.PI * 2 + rad; g.beginPath(); g.ellipse(128 + Math.cos(t) * rad, 128 + Math.sin(t) * rad, size, size * 0.7, t, 0, Math.PI * 2); g.fill(); }
        g.globalCompositeOperation = 'source-over';
        g.strokeStyle = 'rgba(120,110,90,0.35)'; g.lineWidth = 2;
        for (const rad of [50, 68, 84, 100]) { g.beginPath(); g.arc(128, 128, rad, 0, Math.PI * 2); g.stroke(); }
      } else if (a.mat === 'granny') {
        const wools = ['#c8332b', '#e9b23a', '#2f6fb0', '#3d8a56', '#f1ece0', '#8a4a8c', '#e07a3a', '#222'];
        for (let k = 0; k < 7; k++) { g.fillStyle = k === 6 ? '#f1ece0' : pick(wools); const inset = 6 + k * 18; g.fillRect(inset, inset, 256 - inset * 2, 256 - inset * 2); }
        g.globalCompositeOperation = 'destination-out';
        for (let k = 0; k < 7; k++) { const inset = 15 + k * 18, side = 256 - inset * 2, holes = Math.max(2, Math.round(side / 22)); for (let h = 0; h <= holes; h++) for (const [x, y] of [[inset + (h / holes) * side, inset], [inset + (h / holes) * side, 256 - inset], [inset, inset + (h / holes) * side], [256 - inset, inset + (h / holes) * side]]) { g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); } }
        g.globalCompositeOperation = 'source-over';
      } else {
        g.fillStyle = '#d9d4c2'; g.fillRect(8, 8, 240, 240);
        g.fillStyle = '#3a3a3a'; g.fillRect(20, 20, 150, 22);
        for (let col = 0; col < 3; col++) for (let row = 0; row < 22; row++) { g.fillStyle = `rgba(60,60,60,${0.35 + random() * 0.3})`; g.fillRect(20 + col * 74, 54 + row * 8.5, 40 + random() * 26, 3); }
        g.fillStyle = 'rgba(130,100,50,0.3)'; g.beginPath(); g.arc(128, 128, 84, 0, Math.PI * 2); g.fill();
      }
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      const size = a.mat === 'newspaper' ? matR * 2.1 : a.mat === 'granny' ? matR * 1.8 : matR * 2.15;
      const mat = s.mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 1, side: THREE.DoubleSide }), [0, T + 0.004, 0]);
      mat.rotation.set(-Math.PI / 2, 0, random() * 1.5);
      mat.castShadow = false;
    }

    // Pot and saucer.
    const big = a.plant === 'rubber' ? 1.15 : 1;
    let potR = 0.1 * big, potH = 0.16 * big;
    const y0 = T + 0.02;
    const grime = mood.wear;
    if (a.pot === 'terracotta') {
      const clay = s.material('#b9623c', { roughness: 0.95, side: THREE.DoubleSide });
      potR = 0.105 * big;
      s.lathe([[0.001, 0], [potR * 0.68, 0], [potR * 0.95, potH * 0.8], [potR * 1.05, potH * 0.8], [potR * 1.07, potH], [potR * 0.97, potH], [potR * 0.9, potH * 0.8]], clay, [0, y0, 0]);
      if (grime > 0.25) s.cylinder(potR * 0.8 + 0.002, potR * 0.73 + 0.002, potH * 0.22, [0, y0 + potH * 0.28, 0], s.material('#d9cdbf', { roughness: 1, transparent: true, opacity: 0.55 }), 24);
      s.lathe([[0.001, 0], [potR * 0.85, 0], [potR * 1.0, 0.02], [potR * 0.96, 0.02], [potR * 0.84, 0.006]], clay, [0, T + 0.004, 0]);
    } else if (a.pot === 'enamel') {
      const colour = pick(['#f1efe6', '#d8483a', '#3e6fa8', '#e9d9a0', '#4d8a6a']);
      const enamel = s.material(colour, { roughness: 0.25, side: THREE.DoubleSide });
      const rim = s.material('#1f2a44', { roughness: 0.3 });
      potH = 0.13 * big; potR = 0.115 * big;
      s.lathe([[0.001, 0], [potR * 0.92, 0], [potR, 0.012], [potR, potH], [potR - 0.004, potH], [potR - 0.004, 0.01]], enamel, [0, y0, 0]);
      s.ring(potR, 0.005, [0, y0 + potH, 0], rim).rotation.x = Math.PI / 2;
      for (const side of [-1, 1]) { const h = s.ring(0.028, 0.005, [side * (potR + 0.012), y0 + potH * 0.8, 0], rim, Math.PI); h.rotation.set(Math.PI / 2, 0, side > 0 ? -Math.PI / 2 : Math.PI / 2); }
      const chip = s.material('#22201e', { roughness: 0.9 });
      for (let k = 0; k < 2 + grime * 7; k++) { const t = random() * 6.3, y = random() < 0.5 ? potH - 0.004 - random() * 0.01 : 0.012 + random() * 0.02; s.ball([0.008 + random() * 0.01, 0.005 + random() * 0.006, 0.003], [Math.cos(t) * potR, y0 + y, Math.sin(t) * potR], chip, 6).rotation.y = -t + Math.PI / 2; }
      s.lathe([[0.001, 0], [potR * 0.9, 0], [potR * 1.08, 0.016], [potR * 1.04, 0.016], [potR * 0.88, 0.005]], s.material('#eeeade', { roughness: 0.3, side: THREE.DoubleSide }), [0, T + 0.004, 0]);
    } else if (a.pot === 'bucket') {
      const plastic = s.material(pick(['#e8c21f', '#d8402f', '#2f7ac0', '#f1efe8', '#3d9a6a']), { roughness: 0.45, side: THREE.DoubleSide });
      potH = 0.17 * big; potR = 0.105 * big;
      s.lathe([[0.001, 0], [potR * 0.8, 0], [potR, potH], [potR + 0.006, potH], [potR + 0.006, potH - 0.012], [potR - 0.003, potH - 0.012], [potR * 0.78, 0.004]], plastic, [0, y0, 0]);
      const bail = s.ring(potR + 0.008, 0.0025, [0, y0 + potH - 0.014, 0], s.material('#b9bcbc', { metalness: 0.8, roughness: 0.3 }), Math.PI);
      bail.rotation.set(Math.PI + 0.9 + random() * 0.5, 0, 0);
      s.label(pick(['MAJONEZ', 'SMALEC', '5 kg', 'DŻEM']), potR * 1.1, potH * 0.4, [0, y0 + potH * 0.5, potR * 0.93], '#b3261e', '#f4f0df').rotation.x = -0.12;
      s.cylinder(potR * 0.95, potR * 0.9, 0.008, [0, T + 0.008, 0], s.material('#e9e6dc'), 24);
    } else if (a.pot === 'glazed') {
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
      const g = canvas.getContext('2d')!;
      const [c1, c2, c3] = pick([['#c96a2e', '#5a3a22', '#e9d9a8'], ['#3f6f8a', '#e8e2cf', '#1f3a4a'], ['#7a8a3a', '#e3c95a', '#4a3a22'], ['#b23a5a', '#f1e6d8', '#5a2a3a']] as const);
      g.fillStyle = c1; g.fillRect(0, 0, 256, 128);
      g.fillStyle = c2; g.fillRect(0, 34, 256, 44);
      g.fillStyle = c3; for (let k = 0; k < 12; k++) { g.beginPath(); g.moveTo(k * 21.33, 78); g.lineTo(k * 21.33 + 10.6, 34); g.lineTo(k * 21.33 + 21.33, 78); g.fill(); }
      g.fillRect(0, 96, 256, 6);
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      potH = 0.16 * big; potR = 0.1 * big;
      s.lathe([[0.001, 0], [potR * 0.7, 0], [potR * 1.1, potH * 0.35], [potR * 1.15, potH * 0.55], [potR * 0.95, potH * 0.92], [potR, potH], [potR * 0.92, potH], [potR * 0.88, potH * 0.9]], new THREE.MeshStandardMaterial({ map: tex, roughness: 0.2, side: THREE.DoubleSide }), [0, y0, 0]);
      s.lathe([[0.001, 0], [potR * 0.8, 0], [potR * 1.0, 0.016], [potR * 0.96, 0.016], [potR * 0.8, 0.005]], s.material(c1, { roughness: 0.25, side: THREE.DoubleSide }), [0, T + 0.004, 0]);
    } else {
      const tin = s.material('#b3b6b4', { metalness: 0.7, roughness: mix(0.35, 0.75, grime), side: THREE.DoubleSide });
      potH = 0.18 * big; potR = 0.095 * big;
      s.lathe([[0.001, 0], [potR, 0], [potR, potH], [potR - 0.003, potH], [potR - 0.003, 0.004]], tin, [0, y0, 0]);
      for (let k = 1; k < 8; k++) s.ring(potR + 0.0005, 0.002, [0, y0 + (k / 8) * potH, 0], tin).rotation.x = Math.PI / 2;
      s.mesh(new THREE.CylinderGeometry(potR + 0.003, potR + 0.003, potH * 0.55, 24, 1, true, random() * 6, 2 + random() * 2), s.material(pick(['#c8332b', '#3d8a56', '#e9b23a']), { roughness: 0.9, side: THREE.DoubleSide }), [0, y0 + potH * 0.5, 0]);
      if (grime > 0.4) s.ring(potR + 0.001, 0.004, [0, y0 + 0.006, 0], s.material('#8a4a22', { roughness: 1 })).rotation.x = Math.PI / 2;
    }
    const soilY = y0 + potH - 0.02;
    const soilColour = wet ? '#2a1d14' : a.health === 'left-behind' ? '#8a7a66' : '#4a3626';
    s.cylinder(potR * 0.9, potR * 0.9, 0.01, [0, soilY, 0], s.material(soilColour, { roughness: wet ? 0.35 : 1 }), 24);

    // The plant, built as instanced leaves on a group that can sway.
    const plant = new THREE.Group();
    plant.position.set(0, soilY + 0.005, 0);
    const grow = { geranium: 1.5, rubber: 1.75, snake: 1.3, aloe: 1.2 }[a.plant] * (a.health === 'cuttings' ? 0.85 : 1);
    plant.scale.setScalar(grow);
    s.root.add(plant);
    const dummy = new THREE.Object3D();
    const leaves: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const sticks: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const florets: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const stick = (from: V3, to: V3, radius: number, colour: THREE.Color) => {
      const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to), d = B.clone().sub(A);
      dummy.position.copy(A).addScaledVector(d, 0.5);
      dummy.quaternion.setFromUnitVectors(up, d.clone().normalize());
      dummy.scale.set(radius, d.length(), radius);
      dummy.updateMatrix();
      sticks.push({ m: dummy.matrix.clone(), c: colour });
    };
    const leaf = (at: V3, rot: V3, scale: V3, colour: THREE.Color, list = leaves) => {
      dummy.position.set(...at); dummy.rotation.set(rot[0], rot[1], rot[2], 'YXZ'); dummy.scale.set(...scale); dummy.updateMatrix();
      list.push({ m: dummy.matrix.clone(), c: colour });
    };
    const brown = new THREE.Color('#8a6432'), yellow = new THREE.Color('#c9b84a');
    const tone = (base: string, jitter = 0.08) => {
      const c = new THREE.Color(base);
      c.offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * jitter);
      const d = health.dry * (0.6 + random() * 0.5);
      c.lerp(d > 0.5 ? brown : yellow, Math.min(1, d));
      return c;
    };
    const bloomColour = { red: '#e0262b', pink: '#f0559a', salmon: '#f58d74', white: '#f6eef0', magenta: '#b81f7a' }[a.bloom];
    let leafGeo: THREE.BufferGeometry;
    let leafGloss = 0.7;
    let plantTop = 0.3;
    const stemColour = new THREE.Color('#6f8a3c').lerp(brown, health.dry * 0.7);
    const fallen: { at: V3; rot: V3; scale: V3 }[] = [];
    const leanX = health.lean;

    if (a.plant === 'geranium') {
      const shape = new THREE.Shape();
      for (let k = 0; k <= 40; k++) { const t = (k / 40) * Math.PI * 2, rr = 1 + Math.abs(Math.sin(t * 4.5)) * 0.14 - (Math.abs(t - Math.PI) > Math.PI - 0.25 ? 0.5 : 0); const x = Math.cos(t) * rr, y = Math.sin(t) * rr; if (k === 0) shape.moveTo(x, y); else shape.lineTo(x, y); }
      leafGeo = new THREE.ShapeGeometry(shape, 1);
      leafGeo.rotateX(-Math.PI / 2);
      const pos = leafGeo.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < pos.count; k++) pos.setY(k, (pos.getX(k) ** 2 + pos.getZ(k) ** 2) * 0.22);
      leafGeo.computeVertexNormals();
      const stems = Math.max(3, Math.round(8 * health.vigor + random() * 2));
      const reach = 0.2 * health.stretch;
      plantTop = reach + 0.12;
      for (let i = 0; i < stems; i++) {
        const ang = (i / stems) * Math.PI * 2 + random() * 0.6;
        const out = potR * (0.5 + random() * 0.9) * (a.health === 'cuttings' ? 0.5 : 1);
        const h = reach * (0.65 + random() * 0.5) * (1 - health.droop * 0.35);
        const bx = Math.cos(ang) * potR * 0.3, bz = Math.sin(ang) * potR * 0.3;
        const tx = Math.cos(ang) * out + leanX * h * 0.9, tz = Math.sin(ang) * out;
        const midP: V3 = [mix(bx, tx, 0.35) + leanX * h * 0.1, h * 0.55, mix(bz, tz, 0.35)];
        const tipP: V3 = [tx, h, tz];
        stick([bx, 0, bz], midP, 0.006, stemColour);
        stick(midP, tipP, 0.005, stemColour);
        const count = Math.max(2, Math.round((a.health === 'leggy' ? 3 : 6) * (0.6 + health.vigor * 0.5) * (a.health === 'left-behind' ? 0.6 : 1)));
        for (let k = 0; k < count; k++) {
          const t = a.health === 'leggy' ? 0.75 + random() * 0.25 : 0.3 + random() * 0.7;
          const sx = t < 0.5 ? mix(bx, midP[0], t * 2) : mix(midP[0], tx, t * 2 - 1), sy = t < 0.5 ? mix(0, midP[1], t * 2) : mix(midP[1], h, t * 2 - 1), sz = t < 0.5 ? mix(bz, midP[2], t * 2) : mix(midP[2], tz, t * 2 - 1);
          const la = ang + (random() - 0.5) * 2.6, lr = 0.04 + random() * 0.05;
          const lx = sx + Math.cos(la) * lr, lz = sz + Math.sin(la) * lr, ly = sy + 0.03 + random() * 0.04 - health.droop * 0.07;
          const size = (0.03 + random() * 0.018) * (a.health === 'cuttings' ? 0.75 : 1) * (a.health === 'leggy' ? 0.85 : 1);
          stick([sx, sy, sz], [lx, ly, lz], 0.0025, stemColour);
          leaf([lx, ly, lz], [(random() - 0.5) * 0.5 + health.droop * 0.9, -la + Math.PI, (random() - 0.5) * 0.4], [size, size, size], tone('#4f8f3a'));
        }
        const blooms = a.health === 'thriving' ? 0.75 : a.health === 'watered' ? 0.45 : a.health === 'leggy' ? 0.3 : a.health === 'left-behind' ? 0.25 : 0;
        if (random() < blooms || (i === 0 && blooms > 0)) {
          const top: V3 = [tx + leanX * 0.04 + (random() - 0.5) * 0.03, h + 0.07 + random() * 0.06, tz + (random() - 0.5) * 0.03];
          stick(tipP, top, 0.003, stemColour);
          const dead = a.health === 'left-behind';
          const n = dead ? 6 : 14 + Math.floor(random() * 8);
          for (let f = 0; f < n; f++) {
            const fa = random() * Math.PI * 2, fe = random() * 1.2, rr = dead ? 0.018 : 0.03;
            const c = new THREE.Color(dead ? '#7a5a3a' : bloomColour); c.offsetHSL(0, 0, (random() - 0.5) * 0.1);
            if (!dead) c.lerp(new THREE.Color('#9a958c'), (1 - mood.cheer) * 0.25);
            leaf([top[0] + Math.cos(fa) * Math.sin(fe) * rr, top[1] + Math.cos(fe) * rr * 0.8, top[2] + Math.sin(fa) * Math.sin(fe) * rr], [0, 0, 0], [0.011, 0.009, 0.011], c, florets);
          }
          plantTop = Math.max(plantTop, top[1] + 0.03);
        }
      }
      if (health.dry > 0.5) for (let k = 0; k < 9 + mood.density * 8; k++) fallen.push({ at: [0, 0, 0], rot: [0, random() * 6, 0], scale: [0.03, 0.03, 0.03] });
    } else if (a.plant === 'rubber') {
      const g0 = new THREE.SphereGeometry(1, 12, 6);
      g0.scale(0.42, 0.05, 1); g0.translate(0, 0, 1.08);
      leafGeo = g0; leafGloss = 0.22;
      const trunks = a.health === 'thriving' ? 2 + Math.floor(random() * 2) : a.health === 'cuttings' ? 1 : 1 + Math.floor(random() * 2);
      const bark = new THREE.Color('#5a4a34');
      for (let i = 0; i < trunks; i++) {
        const ang = random() * 6.3, off = i === 0 ? 0 : potR * 0.45;
        const height = (0.34 + random() * 0.22) * health.stretch * (a.health === 'cuttings' ? 0.8 : 1);
        const base: V3 = [Math.cos(ang) * off, 0, Math.sin(ang) * off];
        const bend = (random() - 0.5) * 0.08;
        const at = (t: number): V3 => [base[0] + leanX * height * t * t * 0.8 + bend * Math.sin(t * 3), height * t * (1 - leanX * 0.2 * t), base[2] + bend * Math.cos(t * 2.4) * t];
        for (let k = 0; k < 5; k++) stick(at(k / 5), at((k + 1) / 5), 0.011 - k * 0.0012, bark);
        const count = Math.max(3, Math.round(13 * health.vigor * (0.8 + random() * 0.4)));
        for (let k = 0; k < count; k++) {
          const t = a.health === 'leggy' ? 0.62 + (k / count) * 0.38 : a.health === 'left-behind' ? 0.5 + (k / count) * 0.5 : 0.18 + (k / count) * 0.82;
          const p = at(t), yaw = k * 2.399 + ang;
          const size = (0.05 + random() * 0.025) * (1 - t * 0.25) * (a.health === 'cuttings' ? 0.8 : 1);
          leaf(p, [-0.75 + t * 0.35 + health.droop * 1.5 + (random() - 0.5) * 0.25, yaw, (random() - 0.5) * 0.3], [size, size, size], tone('#234f2e', 0.05));
        }
        const tip = at(1);
        stick(tip, [tip[0] + leanX * 0.03, tip[1] + 0.05, tip[2]], 0.005, new THREE.Color(health.dry > 0.5 ? '#6a4a2a' : '#b8404a'));
        plantTop = Math.max(plantTop, tip[1] + 0.1);
      }
      if (health.dry > 0.5) for (let k = 0; k < 5 + mood.density * 5; k++) fallen.push({ at: [0, 0, 0], rot: [0, random() * 6, 0], scale: [0.06, 0.06, 0.06] });
    } else if (a.plant === 'snake') {
      const g0 = new THREE.CylinderGeometry(0.12, 1, 1, 6, 4);
      g0.translate(0, 0.5, 0); g0.scale(1, 1, 0.16);
      const pos = g0.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < pos.count; k++) { const y = pos.getY(k); pos.setX(k, pos.getX(k) * (0.55 + Math.sin(Math.min(1, y * 1.6) * Math.PI * 0.5) * 0.45)); }
      g0.computeVertexNormals();
      leafGeo = g0; leafGloss = 0.45;
      const count = Math.max(3, Math.round(4 + 12 * health.vigor));
      for (let k = 0; k < count; k++) {
        const ang = k * 2.399, rr = potR * 0.6 * Math.sqrt((k + 0.5) / count);
        const h = (0.22 + random() * 0.32) * Math.min(1.35, health.stretch) * (a.health === 'cuttings' ? 0.6 : 1);
        const tilt = 0.06 + (rr / potR) * 0.3 + random() * 0.12 + health.droop * (0.5 + random() * 0.9);
        leaf([Math.cos(ang) * rr, 0, Math.sin(ang) * rr], [tilt, -ang + Math.PI / 2 + (random() - 0.5) * 0.8, leanX * -0.5], [0.022 + random() * 0.012, h, 0.03], tone(random() < 0.3 ? '#8aa04a' : '#3f7048', 0.1));
        plantTop = Math.max(plantTop, h * Math.cos(tilt));
      }
    } else {
      const g0 = new THREE.CylinderGeometry(0.05, 1, 1, 7, 3);
      g0.translate(0, 0.5, 0); g0.scale(1, 1, 0.42);
      leafGeo = g0; leafGloss = 0.5;
      const count = Math.max(5, Math.round(6 + 14 * health.vigor));
      for (let k = 0; k < count; k++) {
        const t = k / count, ang = k * 2.399;
        const len = (0.1 + (1 - t) * 0.14) * (a.health === 'cuttings' ? 0.55 : 1) * Math.min(1.3, health.stretch);
        const tilt = 0.25 + (1 - t) * 0.85 + health.droop * 0.5 + random() * 0.1;
        leaf([Math.cos(ang) * 0.012, t * 0.03, Math.sin(ang) * 0.012], [tilt, -ang + Math.PI / 2, 0], [0.018 + (1 - t) * 0.008, len, 0.02], tone('#6f9f78', 0.08));
        plantTop = Math.max(plantTop, len * Math.cos(tilt) + 0.03);
      }
      for (let pup = 0; pup < Math.round(health.vigor * 3); pup++) {
        const pa = random() * 6.3, pr = potR * 0.65;
        for (let k = 0; k < 5; k++) leaf([Math.cos(pa) * pr, 0, Math.sin(pa) * pr], [0.3 + random() * 0.6, k * 1.3, 0], [0.008, 0.05 + random() * 0.02, 0.01], tone('#7fae84'));
      }
    }

    // Dropped leaves on the mat and floor.
    for (const f of fallen) {
      const onFloor = a.stand === 'floor' || random() < 0.55;
      const ang = random() * 6.3, rr = onFloor ? standR + 0.05 + random() * 0.18 : potR + 0.02 + random() * Math.max(0.01, standR - potR - 0.02);
      const y = onFloor ? 0.004 - (soilY + 0.005) : T + 0.008 - (soilY + 0.005);
      leaf([Math.cos(ang) * rr / grow, y / grow, Math.sin(ang) * rr / grow], [0, f.rot[1], 0], f.scale, brown.clone().offsetHSL(0, 0, (random() - 0.5) * 0.12));
    }

    const instance = (geo: THREE.BufferGeometry, list: { m: THREE.Matrix4; c: THREE.Color }[], material: THREE.Material) => {
      if (!list.length) { geo.dispose(); material.dispose(); return null; }
      const mesh = new THREE.InstancedMesh(geo, material, list.length);
      list.forEach((item, i) => { mesh.setMatrixAt(i, item.m); mesh.setColorAt(i, item.c); });
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      plant.add(mesh);
      return mesh;
    };
    instance(leafGeo, leaves, new THREE.MeshStandardMaterial({ roughness: leafGloss, side: THREE.DoubleSide }));
    instance(new THREE.CylinderGeometry(1, 1, 1, 6), sticks, new THREE.MeshStandardMaterial({ roughness: 0.8 }));
    instance(new THREE.SphereGeometry(1, 8, 6), florets, new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: bloomColour, emissiveIntensity: mix(0.05, 0.3, mood.cheer) }));

    // The keeper's trace.
    if (a.care === 'bottle') {
      const ang = 0.6 + random() * 0.8, rr = a.stand === 'floor' ? potR + 0.1 : standR + 0.1;
      const bx = Math.cos(ang) * rr, bz = Math.sin(ang) * rr;
      const pet = new THREE.MeshPhysicalMaterial({ color: pick(['#bfe3f0', '#c9e8c9', '#ffffff']), transparent: true, opacity: 0.3, roughness: 0.08, depthWrite: false });
      s.lathe([[0.001, 0], [0.04, 0], [0.042, 0.02], [0.042, 0.19], [0.016, 0.25], [0.016, 0.275]], pet, [bx, 0, bz]).castShadow = false;
      s.cylinder(0.039, 0.039, 0.05 + random() * 0.11, [bx, 0.06, bz], s.material('#8fc0d6', { roughness: 0.1 }), 16);
      s.cylinder(0.018, 0.018, 0.018, [bx, 0.282, bz], s.material(pick(['#2f6fb0', '#d8402f', '#3d9a6a']), { roughness: 0.5 }), 12);
    } else if (a.care === 'note') {
      const nx = potR * 0.55, ny = soilY;
      s.rod([nx, ny - 0.02, 0.01], [nx + 0.01, ny + 0.17, 0.01], 0.003, s.material('#c9b27a'));
      const note = s.label(pick(['PODLEJ MNIE', 'NIE RUSZAĆ', 'ZALIVAT ÚT+PÁ', 'water me']), 0.1, 0.06, [nx + 0.012, ny + 0.16, 0.016], '#2742a6', '#f4f0df');
      note.rotation.z = (random() - 0.5) * 0.3;
    } else if (a.care === 'stake') {
      const h = Math.max(0.3, plantTop * grow + 0.06);
      s.rod([0.02, soilY - 0.03, -0.02], [0.03 + leanX * 0.03, soilY + h, -0.02], 0.005, s.material('#c9b27a', { roughness: 0.8 }));
      for (const t of [0.45, 0.75]) { const r = s.ring(0.013, 0.0035, [0.025, soilY + h * t, -0.018], s.material(pick(['#d8402f', '#e9e3d0', '#3e6fa8']), { roughness: 1 })); r.rotation.x = Math.PI / 2 + 0.3; }
    } else if (a.care === 'eggshells') {
      const shell = s.material('#efe6d2', { roughness: 0.7, side: THREE.DoubleSide });
      for (let k = 0; k < 9; k++) { const t = random() * 6.3, rr = potR * (0.35 + random() * 0.5); const m = s.mesh(new THREE.SphereGeometry(0.012 + random() * 0.01, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.45), shell, [Math.cos(t) * rr, soilY + 0.012, Math.sin(t) * rr]); m.rotation.set(random() * 3, random() * 3, random() * 3); }
    }

    // Just watered: a full saucer, a spill and drops falling from the stand.
    const drops: { mesh: THREE.Mesh; from: number; phase: number }[] = [];
    if (wet) {
      const water = new THREE.MeshStandardMaterial({ color: '#56676e', roughness: 0.06, metalness: 0.3, transparent: true, opacity: 0.55, depthWrite: false });
      s.cylinder(potR * 0.97, potR * 0.9, 0.004, [0, T + 0.017, 0], water, 24).castShadow = false;
      const ang = random() * 6.3, px = Math.cos(ang) * (standR + 0.02), pz = Math.abs(Math.sin(ang)) * (standR + 0.02);
      const pool = s.cylinder(0.09, 0.09, 0.002, [px, 0.002, pz], water, 20); pool.scale.z = 0.65; pool.castShadow = false;
      if (T > 0.1) for (let k = 0; k < 2; k++) { const mesh = s.ball([0.006, 0.008, 0.006], [px * 0.85 + (random() - 0.5) * 0.03, T, pz * 0.85], water, 8); mesh.castShadow = false; drops.push({ mesh, from: T - 0.02, phase: random() }); }
    }

    const sway = mix(0.004, 0.03, mood.energy);
    const rate = mix(0.3, 1, mood.energy);
    return s.finish({
      footprint: Math.max(standR, potR) + 0.06,
      update: (_dt, time) => {
        plant.rotation.z = Math.sin(time * 1.1) * sway;
        plant.rotation.x = Math.sin(time * 0.8 + 1) * sway * 0.6;
        for (const d of drops) { const p = (time * rate + d.phase) % 1, fall = Math.min(1, p * 2.4); d.mesh.position.y = mix(d.from, 0.006, fall * fall); d.mesh.visible = p < 0.42; }
      },
    });
  },
});
