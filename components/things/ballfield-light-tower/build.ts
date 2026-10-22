import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { Batch, aged, paint } from './lib';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    pole: choice('What holds the lights up?', {
      wood: 'A dark creosoted timber utility pole with step bolts and wooden crossarms.',
      steel: 'A tapered galvanised steel tube bolted to a concrete pier.',
      lattice: 'An open four-legged lattice tower of angle iron, like a small pylon.',
    }),
    bank: choice('How big is the bank of floodlights?', {
      single: 'One crossarm with four lamps, a modest neighbourhood field.',
      double: 'Two crossarms stacked, eight lamps.',
      rack: 'A big rectangular rack of twelve lamps, a proper stadium bank.',
    }),
    lamp: choice('What kind of lamps are they?', {
      sodium: 'Old round bowl reflectors with an amber sodium glow.',
      halide: 'Round metal-halide floods, a hard blue-white.',
      mercury: 'Ancient mercury-vapour bowls with a ghostly green-white cast.',
      led: 'New flat square LED panels, stark and even.',
    }),
    state: choice('What are the lights doing right now?', {
      blazing: 'Every lamp burning at full strength, mid-game.',
      warming: 'Just switched on at dusk: lamps still dull and rosy, climbing toward full.',
      patchy: 'Several lamps dead, dark holes in the bank.',
      flicker: 'One lamp stuttering on and off while the rest hold steady.',
      last: 'A single lamp left burning over an empty field.',
      dark: 'All off: black glass against the sky, the season over.',
    }),
    insects: score('How thick is the halo of moths and bugs around the lamps?', ['None at all', 'A few moths', 'A busy cloud', 'A swirling blizzard of insects']),
    base: choice('What stands at the foot of the pole?', {
      transformer: 'A squat finned transformer cabinet on a concrete pad, humming, with a hazard label.',
      breaker: 'A grey breaker box strapped to the pole with one big throw lever.',
      meter: 'A red coin box: quarters for half an hour of light.',
      bare: 'Nothing but the footing and uncut weeds.',
    }),
    extra: choice('What else has ended up on the pole?', {
      none: 'Nothing.',
      nest: 'A big untidy stick nest built on top of the lamp bank.',
      speakers: 'A pair of grey public-address horns for the announcer.',
      shoes: 'A pair of sneakers thrown up and hanging by their laces.',
      sign: 'A hand-painted NO PEPPER sign nailed at head height.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const b = new Batch();
    const H = 8.0 + random() * 1.0;
    const metal = aged(a.pole === 'wood' ? '#7d8386' : '#a9b0b1', mood.wear * 0.75, '#7a4e33');
    const wood = aged('#4a3526', mood.wear * 0.4, '#77726a');
    const concrete = aged('#b5b2a6', mood.wear * 0.3, '#77786a');

    // ----- pole -----
    if (a.pole === 'wood') {
      b.cyl(0.11, 0.17, H, [0, H / 2, 0], wood, 10);
      for (let y = 2.4, side = 1; y < H - 1.2; y += 0.42, side = -side) b.rod([0, y, 0], [side * 0.3, y + 0.02, 0], 0.012, metal, 5);
      b.cyl(0.175, 0.175, 0.04, [0, 1.9, 0], metal, 10);
    } else if (a.pole === 'steel') {
      b.cyl(0.4, 0.42, 0.5, [0, 0.25, 0], concrete, 14);
      b.cyl(0.26, 0.26, 0.04, [0, 0.52, 0], metal, 12);
      for (let i = 0; i < 6; i++) b.cyl(0.022, 0.022, 0.08, [Math.cos(i * 1.047) * 0.21, 0.56, Math.sin(i * 1.047) * 0.21], '#55595a', 6);
      b.cyl(0.075, 0.15, H - 0.5, [0, 0.5 + (H - 0.5) / 2, 0], metal, 12);
      b.box([0.14, 0.3, 0.02], [0, 1.2, 0.15], '#6b7072');
    } else {
      const half = (y: number) => mix(0.62, 0.17, y / H);
      const corners = (y: number): V3[] => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [x * half(y), y, z * half(y)] as V3);
      const levels = 8;
      for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        b.rod([x * half(0), 0, z * half(0)], [x * half(H), H, z * half(H)], 0.035, metal, 4);
        b.box([0.3, 0.2, 0.3], [x * half(0), 0.1, z * half(0)], concrete);
      }
      for (let i = 0; i < levels; i++) {
        const lo = corners((i / levels) * H), hi = corners(((i + 1) / levels) * H);
        for (let c = 0; c < 4; c++) {
          const n = (c + 1) % 4;
          b.rod(hi[c], hi[n], 0.018, metal, 4);
          b.rod(i % 2 ? lo[c] : lo[n], i % 2 ? hi[n] : hi[c], 0.016, metal, 4);
        }
      }
      // Service ladder up one face.
      for (const dx of [-0.12, 0.12]) b.rod([dx, 0.4, half(0.4) + 0.03], [dx, H - 0.3, half(H) + 0.03], 0.012, metal, 4);
      for (let y = 0.7; y < H - 0.4; y += 0.36) b.rod([-0.12, y, half(y) + 0.03], [0.12, y, half(y) + 0.03], 0.01, metal, 4);
    }

    // ----- lamp bank -----
    const rows = a.bank === 'single' ? 1 : a.bank === 'double' ? 2 : 3;
    const perRow = 4, pitchX = a.lamp === 'led' ? 0.66 : 0.7, rowGap = a.bank === 'rack' ? 0.68 : 0.95;
    const armW = perRow * pitchX + 0.3;
    const armZ = a.pole === 'lattice' ? 0.24 : 0.16;
    const topY = H - 0.25;
    const armMat = a.pole === 'wood' ? wood : metal;
    const lampSpots: { at: THREE.Vector3; aim: THREE.Vector3 }[] = [];
    for (let r = 0; r < rows; r++) {
      const y = topY - r * rowGap;
      b.box([armW, a.pole === 'wood' ? 0.13 : 0.08, a.pole === 'wood' ? 0.11 : 0.08], [0, y, armZ], armMat);
      if (a.bank !== 'rack') for (const side of [-1, 1]) b.rod([side * armW * 0.42, y, armZ], [0, y - 0.6, armZ - 0.08], 0.025, armMat, 4);
      for (let i = 0; i < perRow; i++) {
        const x = (i - (perRow - 1) / 2) * pitchX;
        const droop = random() < mood.wear * 0.35 ? 0.3 + random() * 0.5 : 0;
        const down = mix(0.5, 0.75, random()) + droop + r * 0.06, yaw = x * 0.16 + (random() - 0.5) * (0.08 + mood.wear * 0.3);
        const aim = new THREE.Vector3(Math.sin(yaw) * Math.cos(down), -Math.sin(down), Math.cos(yaw) * Math.cos(down));
        lampSpots.push({ at: new THREE.Vector3(x, y + 0.3, armZ + 0.14), aim });
        b.rod([x, y, armZ], [x, y + 0.3, armZ + 0.14], 0.022, metal, 5);
      }
    }
    if (a.bank === 'rack') for (const side of [-1, 1]) b.box([0.07, (rows - 1) * rowGap + 0.3, 0.07], [side * (armW / 2 - 0.04), topY - ((rows - 1) * rowGap) / 2, armZ], armMat);
    // Catwalk rail behind a big rack, conduit down the pole.
    if (a.bank === 'rack') { b.box([armW * 0.8, 0.04, 0.4], [0, topY - (rows - 1) * rowGap - 0.5, -0.25], metal); b.box([armW * 0.8, 0.03, 0.03], [0, topY - (rows - 1) * rowGap + 0.4, -0.45], metal); for (const side of [-1, 1]) b.box([0.03, 0.9, 0.03], [side * armW * 0.4, topY - (rows - 1) * rowGap - 0.05, -0.45], metal); }
    const run = a.pole === 'lattice' ? 0.3 : 0.14;
    b.rod([run * 0.6, 1.2, -run], [run * 0.35, topY - 0.3, -run * 0.6], 0.018, '#55595a', 5);

    // Which lamps burn.
    const total = lampSpots.length;
    const flickerIndex = a.state === 'flicker' ? Math.floor(random() * total) : -1;
    const lastIndex = Math.floor(random() * total);
    const alive = lampSpots.map((_spot, index) => {
      if (a.state === 'dark') return false;
      if (a.state === 'last') return index === lastIndex;
      if (index === flickerIndex) return false;
      const deadChance = a.state === 'patchy' ? 0.42 + mood.wear * 0.2 : mood.wear * mood.wear * 0.22;
      return random() > deadChance;
    });
    if (a.state === 'patchy' && alive.every(Boolean)) alive[lastIndex] = false;
    if (a.state === 'patchy' && !alive.some(Boolean)) alive[lastIndex] = true;

    const hue = { sodium: 0.085, halide: 0.57, mercury: 0.42, led: 0.6 }[a.lamp] + (mood.warmth - 0.5) * -0.03;
    const saturation = { sodium: 0.95, halide: 0.55, mercury: 0.5, led: 0.25 }[a.lamp];
    const glowColour = new THREE.Color().setHSL(hue, saturation, a.state === 'warming' ? 0.6 : 0.78);
    if (a.state === 'warming') glowColour.lerp(new THREE.Color('#ff8f7a'), 0.6);
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    const strength = (a.state === 'warming' ? 0.55 : 1) * mix(1.3, 2.6, dusk);
    const housing = aged(a.lamp === 'led' ? '#3c4144' : '#8f9698', mood.wear * 0.5, '#6e4a34');
    const up = new THREE.Vector3(0, 1, 0);
    const led = a.lamp === 'led';
    for (const { at, aim } of lampSpots) {
      const q = new THREE.Quaternion().setFromUnitVectors(up, aim);
      const e = new THREE.Euler().setFromQuaternion(q);
      const rotation: V3 = [e.x, e.y, e.z];
      const centre = at.clone().addScaledVector(aim, 0.02).toArray() as V3;
      if (led) {
        b.add(new THREE.BoxGeometry(0.56, 0.12, 0.42), housing, centre, rotation);
        for (let f = -2; f <= 2; f++) b.add(new THREE.BoxGeometry(0.5, 0.06, 0.02), housing, at.clone().addScaledVector(aim, -0.06).add(new THREE.Vector3(0, 0, f * 0.08).applyQuaternion(q)).toArray() as V3, rotation);
      } else {
        b.add(new THREE.CylinderGeometry(0.29, 0.11, 0.3, 14, 1, true), housing, centre, rotation);
        b.add(new THREE.CylinderGeometry(0.11, 0.07, 0.12, 10), '#4d5254', at.clone().addScaledVector(aim, -0.17).toArray() as V3, rotation);
        b.add(new THREE.TorusGeometry(0.29, 0.02, 5, 16), '#5a5f61', at.clone().addScaledVector(aim, 0.17).toArray() as V3, [e.x + Math.PI / 2, e.y, e.z]);
      }
    }
    const lensGeometry = () => led ? new THREE.BoxGeometry(0.5, 0.02, 0.36) : new THREE.CylinderGeometry(0.27, 0.27, 0.02, 16);
    const lensMesh = (indices: number[], material: THREE.Material) => {
      if (!indices.length) { material.dispose(); return null; }
      const mesh = new THREE.InstancedMesh(lensGeometry(), material, indices.length);
      const matrix = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1);
      indices.forEach((index, i) => {
        const { at, aim } = lampSpots[index];
        matrix.compose(at.clone().addScaledVector(aim, led ? 0.085 : 0.155), new THREE.Quaternion().setFromUnitVectors(up, aim), one);
        mesh.setMatrixAt(i, matrix);
      });
      mesh.castShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const all = lampSpots.map((_spot, index) => index);
    const litMaterial = new THREE.MeshStandardMaterial({ color: glowColour, emissive: glowColour, emissiveIntensity: strength, roughness: 0.3 });
    const deadMaterial = new THREE.MeshStandardMaterial({ color: '#23282c', roughness: 0.15, metalness: 0.4 });
    lensMesh(all.filter((index) => alive[index]), litMaterial);
    lensMesh(all.filter((index) => !alive[index] && index !== flickerIndex), deadMaterial);
    const flickerMaterial = new THREE.MeshStandardMaterial({ color: glowColour, emissive: glowColour, emissiveIntensity: strength, roughness: 0.3 });
    const flickerMesh = flickerIndex >= 0 ? lensMesh([flickerIndex], flickerMaterial) : (flickerMaterial.dispose(), null);

    // Soft glow around the burning lamps; see-through, so it is not measured as solid.
    const litSpots = all.filter((index) => alive[index] || index === flickerIndex).map((index) => lampSpots[index]);
    const bankCentre = new THREE.Vector3(0, topY - ((rows - 1) * rowGap) / 2 + 0.2, armZ + 0.4);
    if (litSpots.length) {
      const haloCentre = litSpots.reduce((sum, spot) => sum.add(spot.at), new THREE.Vector3()).multiplyScalar(1 / litSpots.length);
      const reach = mix(0.7, 1.5, litSpots.length / 12) * (a.state === 'warming' ? 0.8 : 1);
      for (const [size, opacity] of [[reach, 0.24], [reach * 1.8, 0.11]]) {
        const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshBasicMaterial({ color: glowColour, transparent: true, opacity: opacity * mix(0.6, 1.2, dusk), depthWrite: false }));
        halo.scale.set(size * (litSpots.length > 1 ? 1.5 : 1), size, size);
        halo.position.copy(haloCentre).add(new THREE.Vector3(0, -0.1, 0.35));
        s.root.add(halo);
      }
    }

    // ----- foot of the pole -----
    const footR = a.pole === 'lattice' ? 0.75 : 0.3;
    let hummer: THREE.Mesh | null = null;
    if (a.base === 'transformer') {
      const box = new Batch();
      const green = aged('#55695a', mood.wear * 0.5, '#7a5a40');
      const x = footR + 0.75;
      b.box([1.25, 0.12, 1.1], [x, 0.06, 0.1], concrete);
      box.box([0.95, 0.95, 0.75], [0, 0.48, 0], green);
      box.box([1.0, 0.06, 0.8], [0, 0.98, 0], aged('#46584b', mood.wear * 0.5, '#7a5a40'), [0, 0, 0.04]);
      for (let i = 0; i < 7; i++) box.box([0.02, 0.7, 0.14], [-0.36 + i * 0.12, 0.5, -0.44], green);
      box.box([0.44, 0.8, 0.02], [-0.23, 0.48, 0.38], aged('#5d7262', mood.wear * 0.5, '#7a5a40'));
      box.box([0.44, 0.8, 0.02], [0.23, 0.48, 0.38], aged('#5d7262', mood.wear * 0.5, '#7a5a40'));
      box.box([0.05, 0.09, 0.04], [0, 0.5, 0.41], '#c9a53a');
      hummer = box.into(s.root, { roughness: 0.6, metalness: 0.2 });
      hummer!.position.set(x, 0.12, 0.1);
      const label = s.mesh(new THREE.PlaneGeometry(0.3, 0.22), new THREE.MeshStandardMaterial({ roughness: 0.7, map: paint(150, 110, (ctx, w, h) => {
        ctx.fillStyle = '#f2c81c'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#16140f'; ctx.fillRect(0, 0, w, 34);
        ctx.fillStyle = '#f2c81c'; ctx.font = 'bold 24px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('DANGER', w / 2, 26);
        ctx.fillStyle = '#16140f'; ctx.font = 'bold 20px Arial, sans-serif'; ctx.fillText('HIGH', w / 2, 64); ctx.fillText('VOLTAGE', w / 2, 92);
      }) }), [0.23, 0.6, 0.392]);
      hummer!.add(label);
      b.rod([x - 0.4, 0.3, -0.2], [run * 0.6, 1.2, -run], 0.03, '#55595a', 5);
    } else if (a.base === 'breaker' || a.base === 'meter') {
      const red = a.base === 'meter';
      const z = footR * (a.pole === 'lattice' ? 0.85 : 0.6) + 0.1;
      const tint = aged(red ? '#b3311f' : '#8d9496', mood.wear * 0.45, '#70513a');
      if (a.pole === 'lattice') b.box([0.08, 1.7, 0.08], [0, 0.85, z - 0.1], metal);
      b.box([0.42, 0.6, 0.2], [0, 1.4, z], tint);
      b.box([0.44, 0.03, 0.24], [0, 1.71, z + 0.01], tint, [0.15, 0, 0]);
      const leverUp = a.state !== 'dark';
      if (!red) {
        b.rod([0.24, 1.4, z], [0.36, 1.4 + (leverUp ? 0.24 : -0.24), z + 0.04], 0.016, '#2c2f31', 5);
        b.ball([0.035, 0.035, 0.035], [0.36, 1.4 + (leverUp ? 0.24 : -0.24), z + 0.04], '#c0392b', 8);
        b.box([0.05, 0.07, 0.03], [0, 1.15, z + 0.1], '#c9a53a');
      } else {
        b.box([0.1, 0.02, 0.03], [0.08, 1.33, z + 0.105], '#1d1d1d');
        b.cyl(0.035, 0.035, 0.03, [-0.1, 1.33, z + 0.11], '#cfd3d3', 10, [Math.PI / 2, 0, 0]);
      }
      const text = red ? ['LIGHTS', '25¢ = 30 MIN'] : ['FIELD', 'LIGHTS'];
      s.mesh(new THREE.PlaneGeometry(0.36, 0.22), new THREE.MeshStandardMaterial({ roughness: 0.7, map: paint(180, 110, (ctx, w, h) => {
        ctx.fillStyle = red ? '#f6efd8' : '#e9e7dc'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1a1a1a'; ctx.textAlign = 'center'; ctx.font = 'bold 40px Arial, sans-serif'; ctx.fillText(text[0], w / 2, 46, w - 12);
        ctx.font = `bold ${red ? 26 : 40}px Arial, sans-serif`; ctx.fillText(text[1], w / 2, 92, w - 12);
      }) }), [0, 1.54, z + 0.102]);
    }
    // Weeds and litter round the foot.
    const tufts = Math.floor(mix(5, 46, mood.density) * mix(0.6, 1.5, mood.wear));
    const blade = new THREE.ConeGeometry(0.045, 0.4, 4);
    blade.translate(0, 0.2, 0);
    s.scatter(blade, new THREE.MeshStandardMaterial({ roughness: 0.9 }), Array.from({ length: tufts }, () => {
      const angle = random() * 6.3, r = footR + 0.1 + random() * 0.7;
      return { at: [Math.cos(angle) * r, 0, Math.sin(angle) * r] as V3, size: 0.4 + random() * (0.5 + mood.wear * 0.7), color: new THREE.Color().setHSL(mix(0.19, 0.3, random()), mix(0.25, 0.5, mood.cheer), mix(0.22, 0.36, random())) };
    }));

    // ----- what has ended up on the pole -----
    if (a.extra === 'nest') {
      const twig = aged('#6a5236', 0.2);
      const ny = topY + 0.5, nz = armZ - 0.05;
      for (let i = 0; i < 46; i++) {
        const angle = random() * 6.3, r = 0.2 + random() * 0.28, lift = random() * 0.25;
        b.rod([Math.cos(angle) * r * 0.5, ny + lift * 0.4 - 0.1, nz + Math.sin(angle) * r * 0.5], [Math.cos(angle + 0.9) * (r + 0.15), ny + lift, nz + Math.sin(angle + 0.9) * (r + 0.15)], 0.014, twig, 4);
      }
      b.ball([0.16, 0.13, 0.22], [0.05, ny + 0.34, nz], '#3a3530', 10);
      b.ball([0.08, 0.08, 0.09], [0.05, ny + 0.5, nz + 0.14], '#e9e6dc', 8);
      b.add(new THREE.ConeGeometry(0.03, 0.1, 5), '#d9a12a', [0.05, ny + 0.48, nz + 0.25], [Math.PI / 2, 0, 0]);
    } else if (a.extra === 'speakers') {
      const y = topY - rows * rowGap - 0.5;
      for (const side of [-1, 1]) {
        const rot: V3 = [Math.PI / 2 + 0.25, 0, -side * 0.6];
        const dir = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(...rot));
        const mouth = new THREE.Vector3(side * 0.3, y, 0.25);
        b.add(new THREE.CylinderGeometry(0.38, 0.06, 0.6, 16, 1, true), '#a9aeac', mouth.toArray() as V3, rot);
        b.add(new THREE.CylinderGeometry(0.07, 0.09, 0.2, 10), '#6d7271', mouth.clone().addScaledVector(dir, -0.33).toArray() as V3, rot);
        b.rod([0, y, 0], mouth.clone().addScaledVector(dir, -0.3).toArray() as V3, 0.02, metal, 5);
      }
    } else if (a.extra === 'shoes') {
      const x0 = armW * 0.36, y0 = topY - (rows - 1) * rowGap;
      const colour = mood.cheer > 0.5 ? '#d8402f' : '#e8e4da';
      for (const [dx, drop] of [[-0.09, 0.95], [0.1, 1.2]]) {
        b.rod([x0, y0, armZ], [x0 + dx, y0 - drop, armZ + 0.05], 0.006, '#f1efe6', 4);
        b.ball([0.07, 0.06, 0.16], [x0 + dx, y0 - drop - 0.07, armZ + 0.05], colour, 10, [0.9, dx * 6, 0]);
        b.box([0.12, 0.03, 0.3], [x0 + dx, y0 - drop - 0.13, armZ + 0.02], '#f4f1e8', [0.9, dx * 6, 0]);
      }
    } else if (a.extra === 'sign') {
      const z = (a.pole === 'lattice' ? 0.6 : 0.17) + 0.02;
      const sign = s.label('NO PEPPER', 0.9, 0.34, [0, 2.3, z], '#a3261c', '#f1ead6');
      sign.rotation.z = (random() - 0.5) * (0.06 + mood.wear * 0.2);
    }

    b.into(s.root, { roughness: mix(0.55, 0.9, mood.wear), metalness: 0.15, side: THREE.DoubleSide });
    s.root.rotation.z = (random() - 0.5) * mood.wear * 0.06;

    // ----- moths -----
    const lure = litSpots.length ? mix(0.35, 1, Math.min(1, litSpots.length / 4)) : 0.06;
    const mothCount = Math.round(a.insects * a.insects * 170 * lure + (a.insects > 0.12 && litSpots.length ? 6 : 0));
    let moths: THREE.InstancedMesh | null = null;
    const orbits: { centre: THREE.Vector3; radius: number; speed: number; phase: number; tilt: number; bob: number; size: number }[] = [];
    if (mothCount) {
      const wing = new THREE.OctahedronGeometry(1, 0);
      wing.scale(1, 0.35, 0.7);
      moths = new THREE.InstancedMesh(wing, new THREE.MeshStandardMaterial({ roughness: 0.9 }), mothCount);
      for (let i = 0; i < mothCount; i++) {
        const home = litSpots.length ? litSpots[Math.floor(random() * litSpots.length)] : null;
        const centre = home ? home.at.clone().addScaledVector(home.aim, 0.5 + random() * 0.6) : bankCentre.clone();
        moths.setColorAt(i, new THREE.Color().setHSL(0.08 + random() * 0.05, 0.3 + random() * 0.3, random() < 0.3 ? 0.8 : 0.22 + random() * 0.25));
        orbits.push({ centre, radius: 0.25 + random() * random() * 1.5, speed: (random() < 0.5 ? -1 : 1) * (1.2 + random() * 3), phase: random() * 6.3, tilt: (random() - 0.5) * 2.4, bob: random() * 6.3, size: 0.05 + random() * 0.06 });
      }
      s.root.add(moths);
    }
    const dummy = new THREE.Object3D();
    const fly = (time: number) => {
      if (!moths) return;
      orbits.forEach((orbit, i) => {
        const angle = orbit.phase + time * orbit.speed;
        const r = orbit.radius * (0.8 + 0.25 * Math.sin(time * 1.7 + orbit.bob));
        dummy.position.set(Math.cos(angle) * r, Math.sin(angle) * r * Math.sin(orbit.tilt) + Math.sin(time * 2.3 + orbit.bob) * 0.12, Math.sin(angle) * r * Math.cos(orbit.tilt)).add(orbit.centre);
        dummy.rotation.set(angle * 3, angle, orbit.bob + time * 9);
        dummy.scale.setScalar(orbit.size);
        dummy.updateMatrix();
        moths!.setMatrixAt(i, dummy.matrix);
      });
      moths.instanceMatrix.needsUpdate = true;
    };
    fly(random() * 20);

    const tempo = mix(0.25, 1.6, mood.energy);
    const humX = hummer?.position.x ?? 0;
    return s.finish({
      footprint: a.pole === 'lattice' ? 1.3 : a.base === 'transformer' ? 1.5 : 0.9,
      update: (_dt, time) => {
        fly(time * tempo);
        if (flickerMesh) flickerMaterial.emissiveIntensity = Math.sin(time * 23) + Math.sin(time * 7.3) > 0.5 ? strength : 0.03;
        if (hummer) hummer.position.x = humX + Math.sin(time * 190) * 0.0025 * mix(0.3, 1, mood.energy);
      },
    });
  },
});
