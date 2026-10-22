import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const POWDERS = {
  sulphur: 'Bright sulphur yellow.',
  cinnabar: 'Cinnabar red, vermilion.',
  antimony: 'Dull metallic antimony grey.',
  verdigris: 'Chalky verdigris green.',
  lapis: 'Costly ground lapis blue.',
  bone: 'Calcined bone white.',
  charcoal: 'Soft charcoal black.',
} as const;
type Powder = keyof typeof POWDERS;
const TINT: Record<Powder, string> = { sulphur: '#e8c62a', cinnabar: '#c8321e', antimony: '#7e8288', verdigris: '#5fae96', lapis: '#2f4fb0', bone: '#ece6d4', charcoal: '#222024' };

export default defineThing({
  questions: {
    mortar: choice('What kind of mortar is it?', {
      bell: 'A great bell-shaped bronze mortar with moulded bands and two knob handles.',
      tall: 'A tall narrow brass apothecary mortar on a foot.',
      stone: 'A squat grey stone mortar, heavy as a font.',
      iron: 'A black iron pot of a mortar with a huge club pestle.',
    }),
    powder: choice('What is being ground in it?', POWDERS),
    work: choice('What is happening at the bench?', {
      grinding: 'Mid-grind: the pestle in the mortar, dust hanging, powder everywhere.',
      weighing: 'An order being weighed out: the scales loaded, weights lined up, twists half filled.',
      tidy: 'Swept and squared away for the night, everything in its place.',
      ransacked: 'Ransacked: the mortar on its side, powders spilt across the top, drawers pulled out.',
      dusty: 'Unused for years, under an even grey dust.',
    }),
    bench: choice('What is the bench itself?', {
      trestle: 'A thick plank on two rough trestles.',
      block: 'A heavy joiner\'s bench with square legs, two drawers and a low shelf.',
      stone: 'A stone slab on two brick piers.',
      barrels: 'A board laid across two barrels, a makeshift.',
    }),
    scales: choice('What scales are on it?', {
      stand: 'A brass balance hanging from a turned stand.',
      hand: 'A small hand balance lying flat with its pans and strings.',
      none: 'No scales at all: measures are by eye and by handful.',
    }),
    rack: noul('Is there a rack of small labelled drawers along the back of the bench?'),
    sieves: noul('Are there round wooden sieves on the bench?'),
    ledger: noul('Is there an open recipe book or ledger among the work?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dusty = a.work === 'dusty', wrecked = a.work === 'ransacked';
    const dustOf = (colour: string, amount = dusty ? 0.55 : 0) => new THREE.Color(colour).lerp(new THREE.Color('#a8a296'), amount);
    const W = 1.56, D = 0.62, H = 0.84;
    const main = TINT[a.powder];
    const palette: Powder[] = ['sulphur', 'cinnabar', 'antimony', a.powder, (Object.keys(TINT) as Powder[])[Math.floor(random() * 7)]];
    const powderMat = (key: string) => new THREE.MeshStandardMaterial({ color: dustOf(key, dusty ? 0.35 : 0), roughness: 1 });

    // Bench top with its scars painted on.
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const topBase = a.bench === 'stone' ? '#8f8b80' : a.bench === 'barrels' ? '#9a7a4c' : '#7a5632';
    ctx.fillStyle = topBase; ctx.fillRect(0, 0, 1024, 512);
    if (a.bench !== 'stone') for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '40,24,10' : '200,160,100'},0.12)`; ctx.fillRect(0, i * 128, 1024, 126); ctx.fillStyle = 'rgba(30,18,8,0.6)'; ctx.fillRect(0, i * 128 + 126, 1024, 2); }
    for (let i = 0; i < 80; i++) { ctx.strokeStyle = `rgba(40,25,12,${0.05 + random() * 0.1})`; ctx.lineWidth = 1 + random() * 2; ctx.beginPath(); const y = random() * 512; ctx.moveTo(0, y); ctx.bezierCurveTo(300, y + random() * 20 - 10, 700, y + random() * 20 - 10, 1024, y + random() * 16 - 8); ctx.stroke(); }
    for (let i = 0; i < 20 + mood.wear * 90; i++) { ctx.strokeStyle = `rgba(${random() < 0.6 ? '30,18,8' : '220,190,140'},${0.25 + random() * 0.4})`; ctx.lineWidth = 1 + random() * 3; const x = random() * 1024, y = random() * 512, g = random() * 6.28, l = 20 + random() * 110; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(g) * l, y + Math.sin(g) * l); ctx.stroke(); }
    for (let i = 0; i < 4 + mood.wear * 8; i++) { ctx.strokeStyle = 'rgba(25,15,8,0.35)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(random() * 1024, random() * 512, 30 + random() * 40, 0, 7); ctx.stroke(); }
    const smudges = dusty ? 0 : Math.round(mix(6, 26, mood.density)) * (wrecked ? 2 : 1);
    for (let i = 0; i < smudges; i++) { const key = palette[Math.floor(random() * palette.length)]; const x = random() * 1024, y = 200 + random() * 300, r = 20 + random() * (wrecked ? 110 : 55); const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, TINT[key] + 'cc'); g.addColorStop(1, TINT[key] + '00'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
    if (dusty) { ctx.fillStyle = 'rgba(168,162,150,0.6)'; ctx.fillRect(0, 0, 1024, 512); }
    const topMap = new THREE.CanvasTexture(canvas); topMap.colorSpace = THREE.SRGBColorSpace;
    const topMat = new THREE.MeshStandardMaterial({ map: topMap, roughness: 0.9 });
    const wood = s.material(dustOf('#6a4a2c').getStyle()), darkWood = s.material(dustOf('#4a3320').getStyle());
    const side = new THREE.MeshStandardMaterial({ color: new THREE.Color(topBase).multiplyScalar(0.8), roughness: 0.9 });
    const thick = a.bench === 'block' ? 0.09 : a.bench === 'stone' ? 0.08 : 0.055;
    const top = new THREE.Mesh(new THREE.BoxGeometry(W, thick, D), [side, side, topMat, side, side, side]);
    top.position.y = H - thick / 2; top.castShadow = top.receiveShadow = true; s.root.add(top);
    const under = H - thick;
    if (a.bench === 'trestle') {
      for (const x of [-0.55, 0.55]) {
        s.box([0.08, 0.07, D * 0.9], [x, under - 0.035, 0], darkWood);
        for (const z of [-1, 1]) s.rod([x, under - 0.07, z * 0.1], [x + (random() - 0.5) * 0.02, 0, z * 0.3], 0.03, wood);
        s.box([0.04, 0.05, 0.42], [x, under * 0.35, 0], darkWood);
      }
      s.box([1.1, 0.05, 0.04], [0, under * 0.35, 0], darkWood);
    } else if (a.bench === 'block') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.09, under, 0.09], [x * (W / 2 - 0.09), under / 2, z * (D / 2 - 0.08)], darkWood);
      s.box([W - 0.2, 0.16, 0.03], [0, under - 0.08, D / 2 - 0.08], wood);
      for (const x of [-0.33, 0.33]) { const pull = wrecked ? 0.1 + random() * 0.14 : 0; s.box([0.56, 0.12, 0.03 + pull], [x, under - 0.08, D / 2 - 0.062 + pull / 2], darkWood); s.ball([0.02, 0.02, 0.02], [x, under - 0.08, D / 2 - 0.04 + pull], s.material('#b08a3a', { metalness: 0.7 }), 8); }
      s.box([W - 0.2, 0.03, D - 0.16], [0, 0.2, 0], wood);
      const sack = s.material(dustOf('#b09a70').getStyle(), { roughness: 1 });
      s.ball([0.17, 0.15, 0.15], [-0.4, 0.34, 0], sack, 12); s.cylinder(0.04, 0.06, 0.06, [-0.4, 0.49, 0], sack, 8);
      s.lathe([[0, 0], [0.1, 0], [0.13, 0.14], [0.09, 0.24], [0.1, 0.27]], s.material(dustOf('#8a6a4a').getStyle()), [0.35, 0.215, 0]);
    } else if (a.bench === 'stone') {
      const bc = document.createElement('canvas'); bc.width = bc.height = 256; const b = bc.getContext('2d')!; b.fillStyle = '#c8bda6'; b.fillRect(0, 0, 256, 256);
      const c = new THREE.Color();
      for (let r = 0; r < 11; r++) for (let i = -1; i < 4; i++) { c.set('#96503a').offsetHSL(0, (random() - 0.5) * 0.1, (random() - 0.5) * 0.14); b.fillStyle = c.getStyle(); b.fillRect((i + (r % 2) / 2) * 64 + 2, r * 23.3 + 2, 60, 19.5); }
      const map = new THREE.CanvasTexture(bc); map.colorSpace = THREE.SRGBColorSpace;
      const brick = new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
      for (const x of [-0.52, 0.52]) s.box([0.3, under, D - 0.08], [x, under / 2, 0], brick);
    } else {
      for (const x of [-0.48, 0.48]) {
        s.lathe([[0, 0], [0.2, 0], [0.24, under * 0.25], [0.255, under * 0.5], [0.24, under * 0.75], [0.2, under], [0, under]], wood, [x, 0, 0]);
        for (const y of [0.08, 0.3, 0.7, 0.92]) s.ring(0.205 + Math.sin(y * Math.PI) * 0.05, 0.008, [x, under * y, 0], s.material('#2b2a2c', { metalness: 0.5 })).rotation.x = Math.PI / 2;
      }
    }

    // Drawer rack along the back.
    let backZ = -D / 2 + 0.04;
    if (a.rack) {
      const rw = 1.2, rh = 0.34, rd = 0.15, rz = -D / 2 + rd / 2 + 0.01;
      s.box([rw, rh, rd], [0.1, H + rh / 2, rz], darkWood);
      const cols = 6, rows = 2, knobs = [];
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        if (wrecked && random() < 0.2) { s.box([rw / cols - 0.03, rh / rows - 0.03, 0.01], [0.1 - rw / 2 + (c + 0.5) * rw / cols, H + (r + 0.5) * rh / rows, rz + rd / 2 - 0.02], s.material('#1a1410')); continue; }
        const pull = wrecked && random() < 0.4 ? 0.04 + random() * 0.07 : 0;
        const x = 0.1 - rw / 2 + (c + 0.5) * rw / cols, y = H + (r + 0.5) * rh / rows, z = rz + rd / 2 + 0.006 + pull;
        s.box([rw / cols - 0.022, rh / rows - 0.022, 0.012 + pull], [x, y, z - pull / 2], wood);
        s.box([0.075, 0.035, 0.002], [x, y + 0.035, z + 0.0075], s.material(dustOf('#e6dcc0').getStyle())).castShadow = false;
        knobs.push({ at: [x, y - 0.03, z + 0.014] as const, size: 0.012 });
      }
      s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#b08a3a', { metalness: 0.7, roughness: 0.4 }), knobs);
      backZ = rz + rd / 2 + 0.04;
    }
    const frontZ = D / 2 - 0.06;
    const midZ = (backZ + frontZ) / 2;

    // Mortar and pestle.
    const mortarMatOpts = { bell: ['#a8823c', 0.8, 0.38], tall: ['#c2a048', 0.85, 0.3], stone: ['#8c8a84', 0, 0.9], iron: ['#2a2a2e', 0.5, 0.6] } as const;
    const [mc, mm, mr] = mortarMatOpts[a.mortar];
    const metal = new THREE.MeshStandardMaterial({ color: dustOf(mc), metalness: mm * (dusty ? 0.5 : 1), roughness: mix(mr, 0.8, mood.wear * 0.5), side: THREE.DoubleSide });
    const profiles = {
      bell: [[0, 0.02], [0.1, 0.02], [0.11, 0], [0.135, 0], [0.13, 0.03], [0.1, 0.06], [0.105, 0.09], [0.14, 0.2], [0.185, 0.27], [0.2, 0.275], [0.185, 0.285], [0.16, 0.27], [0.11, 0.17], [0.07, 0.1], [0, 0.09]],
      tall: [[0, 0.01], [0.09, 0.01], [0.1, 0], [0.105, 0.02], [0.06, 0.05], [0.055, 0.08], [0.09, 0.12], [0.1, 0.3], [0.125, 0.34], [0.11, 0.345], [0.085, 0.3], [0.07, 0.14], [0, 0.12]],
      stone: [[0, 0], [0.17, 0], [0.2, 0.04], [0.215, 0.2], [0.205, 0.215], [0.165, 0.21], [0.13, 0.1], [0, 0.07]],
      iron: [[0, 0], [0.11, 0], [0.17, 0.06], [0.19, 0.17], [0.175, 0.26], [0.19, 0.28], [0.175, 0.285], [0.155, 0.26], [0.16, 0.16], [0.13, 0.08], [0, 0.06]],
    } as const;
    const profile = profiles[a.mortar];
    const rim = Math.max(...profile.map(([, y]) => y)), mouth = { bell: 0.165, tall: 0.09, stone: 0.165, iron: 0.16 }[a.mortar], floorY = profile[profile.length - 1][1];
    const mortar = new THREE.Group();
    const mx = -0.36, mz = midZ + 0.02;
    mortar.position.set(mx, H, mz); s.root.add(mortar);
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 36), metal); body.castShadow = body.receiveShadow = true; mortar.add(body);
    if (a.mortar === 'bell') { for (const y of [0.13, 0.22]) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.108 + (y - 0.09) * 0.42, 0.008, 6, 40), metal); band.rotation.x = Math.PI / 2; band.position.y = y; mortar.add(band); } for (const d of [-1, 1]) { const knob = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), metal); knob.position.set(d * 0.16, 0.17, 0); knob.castShadow = true; mortar.add(knob); } }
    if (a.mortar === 'iron') for (const d of [-1, 1]) { const lug = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 14), metal); lug.position.set(d * 0.2, 0.2, 0); lug.castShadow = true; mortar.add(lug); }
    const charge = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), powderMat(main)); charge.scale.set(mouth * 0.62, 0.035, mouth * 0.62); charge.position.y = floorY + 0.03; if (!dusty) mortar.add(charge);
    const pestleLen = a.mortar === 'iron' ? 0.5 : a.mortar === 'tall' ? 0.46 : 0.4;
    const pestle = new THREE.Group();
    const pestleMat = a.mortar === 'stone' ? s.material(dustOf('#6a4a2c').getStyle()) : metal;
    const shaft = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.036, 0.01], [0.042, 0.045], [0.022, 0.1], [0.018, pestleLen - 0.06], [0.03, pestleLen - 0.03], [0.026, pestleLen], [0, pestleLen + 0.005]].map(([x, y]) => new THREE.Vector2(x * (a.mortar === 'iron' ? 1.35 : 1), y)), 14), pestleMat);
    shaft.castShadow = true; pestle.add(shaft);
    const lean = 0.34;
    if (wrecked) {
      mortar.rotation.z = -Math.PI / 2 - 0.14; mortar.rotation.y = (random() - 0.5) * 0.8; mortar.position.set(mx + 0.02, H + { bell: 0.15, tall: 0.108, stone: 0.19, iron: 0.14 }[a.mortar], mz);
      pestle.position.set(mx + 0.5, H + 0.04, frontZ - 0.05); pestle.rotation.set(Math.PI / 2, 0, 0.9); s.root.add(pestle);
      const spill = s.ball([0.26, 0.022, 0.15], [mx + rim + 0.2, H + 0.008, mz + 0.02], powderMat(main), 16); spill.castShadow = false;
    } else if (a.work === 'tidy' || dusty) {
      pestle.position.set(mx + 0.28, H + 0.045, mz + 0.05); pestle.rotation.set(Math.PI / 2 - 0.03, 0, 0.15); s.root.add(pestle);
    } else {
      pestle.position.set(0, floorY + 0.02, 0); pestle.rotation.z = -lean; mortar.add(pestle);
    }

    // Dust hanging over the grind.
    const puffs: THREE.Mesh[] = [];
    if (a.work === 'grinding') {
      const haze = new THREE.MeshStandardMaterial({ color: main, transparent: true, opacity: 0.2, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 6; i++) { const p = s.ball([1, 1, 1], [mx, H + rim, mz], haze, 8); p.castShadow = p.receiveShadow = false; p.userData = { phase: i / 6, g: random() * 6.28 }; puffs.push(p); }
    }

    // Scales.
    const brass = s.material(dustOf('#b8963e').getStyle(), { metalness: dusty ? 0.3 : 0.8, roughness: 0.38, side: THREE.DoubleSide });
    const sx = 0.34, sz = midZ + 0.05;
    const loaded = a.work === 'weighing';
    if (a.scales === 'stand') {
      const rig = new THREE.Group(); rig.position.set(sx, H, sz); s.root.add(rig);
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = true; rig.add(mesh); return mesh; };
      add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.09, 0], [0.085, 0.02], [0.03, 0.035], [0.014, 0.06], [0.018, 0.2], [0.011, 0.24], [0.011, 0.44], [0.022, 0.46], [0, 0.48]].map(([x, y]) => new THREE.Vector2(x, y)), 16), brass));
      const beam = new THREE.Group(); beam.position.y = 0.42; rig.add(beam);
      const tilt = loaded ? 0.06 : (random() - 0.5) * 0.5;
      beam.rotation.z = tilt;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.46, 8), brass); bar.rotation.z = Math.PI / 2; bar.castShadow = true; beam.add(bar);
      for (const d of [-1, 1]) {
        const hang = new THREE.Group(); hang.position.set(d * 0.22, 0, 0); hang.rotation.z = -tilt; beam.add(hang);
        for (let i = 0; i < 3; i++) { const g = i * 2.094; const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.245, 4), brass); cord.position.set(Math.cos(g) * 0.04, -0.12, Math.sin(g) * 0.04); cord.rotation.set(Math.sin(g) * 0.33, 0, -Math.cos(g) * 0.33); hang.add(cord); }
        const pan = new THREE.Mesh(new THREE.LatheGeometry([[0, -0.262], [0.05, -0.258], [0.082, -0.238]].map(([x, y]) => new THREE.Vector2(x, y)), 18), brass); pan.castShadow = true; hang.add(pan);
        if (loaded || random() < 0.3) {
          if (d < 0) { const heap = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.04, 12), powderMat(main)); heap.position.y = -0.238; hang.add(heap); }
          else for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.012 + i * 0.004, 0.014 + i * 0.004, 0.022 + i * 0.006, 10), brass); w.position.set((i - 1) * 0.035, -0.245, 0); hang.add(w); }
        }
      }
      if (wrecked) { rig.rotation.x = Math.PI / 2 - 0.05; rig.rotation.z = 0.4; rig.position.set(sx - 0.05, H + 0.09, sz - 0.12); }
    } else if (a.scales === 'hand') {
      const g0 = random() * 0.8 - 0.4;
      const bar = s.rod([sx - 0.17 * Math.cos(g0), H + 0.008, sz - 0.17 * Math.sin(g0)], [sx + 0.17 * Math.cos(g0), H + 0.008, sz + 0.17 * Math.sin(g0)], 0.005, brass); void bar;
      for (const d of [-1, 1]) { const px = sx + d * 0.17 * Math.cos(g0) + 0.03, pz = sz + d * 0.17 * Math.sin(g0) + 0.11; s.lathe([[0, 0], [0.045, 0.003], [0.07, 0.018]], brass, [px, H, pz]); for (let i = 0; i < 3; i++) s.rod([sx + d * 0.17 * Math.cos(g0), H + 0.006, sz + d * 0.17 * Math.sin(g0)], [px + Math.cos(i * 2.1) * 0.065, H + 0.018, pz + Math.sin(i * 2.1) * 0.065], 0.0015, brass); if (loaded && d < 0) s.mesh(new THREE.ConeGeometry(0.04, 0.03, 10), powderMat(main), [px, H + 0.02, pz]); }
    }
    if (loaded) for (let i = 0; i < 5; i++) s.cylinder(0.01 + i * 0.003, 0.012 + i * 0.003, 0.018 + i * 0.006, [0.6 + (a.rack ? 0 : 0.02) - i * 0.045, H + 0.009 + i * 0.003, frontZ - 0.03], brass, 10);

    // Sieves.
    if (a.sieves) {
      const hoop = s.material(dustOf('#b89a62').getStyle(), { side: THREE.DoubleSide });
      const meshCanvas = document.createElement('canvas'); meshCanvas.width = meshCanvas.height = 64; const mctx = meshCanvas.getContext('2d')!;
      mctx.fillStyle = 'rgba(210,200,170,0.35)'; mctx.fillRect(0, 0, 64, 64); mctx.strokeStyle = '#4a4030'; mctx.lineWidth = 1.5; for (let i = 0; i <= 64; i += 8) { mctx.beginPath(); mctx.moveTo(i, 0); mctx.lineTo(i, 64); mctx.moveTo(0, i); mctx.lineTo(64, i); mctx.stroke(); }
      const meshMap = new THREE.CanvasTexture(meshCanvas); meshMap.colorSpace = THREE.SRGBColorSpace; meshMap.wrapS = meshMap.wrapT = THREE.RepeatWrapping; meshMap.repeat.set(3, 3);
      const gauze = new THREE.MeshStandardMaterial({ map: meshMap, transparent: true, side: THREE.DoubleSide, roughness: 1 });
      const sieve = (x: number, y: number, z: number, r: number, rot: [number, number, number]) => {
        const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(...rot); s.root.add(g);
        const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.06, 28, 1, true), hoop); wall.castShadow = true; g.add(wall);
        const net = new THREE.Mesh(new THREE.CircleGeometry(r, 28), gauze); net.rotation.x = -Math.PI / 2; net.position.y = -0.02; g.add(net);
        return g;
      };
      const zx = 0.66, zz = a.rack ? backZ + 0.07 : midZ - 0.08;
      if (wrecked) { sieve(zx - 0.05, H + 0.03, zz + 0.1, 0.14, [0, 0, 0]); sieve(0.02, 0.12, D / 2 + 0.18, 0.12, [1.25, 0.3, 0]); }
      else {
        sieve(zx, H + 0.03, zz + 0.04, 0.14, [0, 0, 0]); sieve(zx + 0.005, H + 0.09, zz + 0.045, 0.125, [0, 1, 0]);
        if (a.work === 'grinding') { const residue = s.ball([0.09, 0.012, 0.09], [zx, H + 0.078, zz + 0.045], powderMat(main), 10); residue.castShadow = false; }
        if (mood.density > 0.5) sieve(zx - 0.25, H + 0.115, backZ - 0.012, 0.115, [Math.PI / 2 - 0.25, 0, 0]);
      }
    }

    // Paper twists and little heaps.
    const paper = s.material(dustOf('#e9dfc6').getStyle(), { roughness: 0.95 });
    const count = dusty ? 2 : Math.round(mix(3, 9, mood.density));
    for (let i = 0; i < count; i++) {
      const key = palette[i % palette.length];
      const neat = a.work === 'tidy';
      const x = neat ? -0.05 + i * 0.085 : -0.1 + random() * 0.75, z = neat ? frontZ - 0.06 : frontZ - 0.02 - random() * 0.2;
      if (x > W / 2 - 0.08) continue;
      const turn = neat ? 0.3 : random() * 6.28;
      const twist = new THREE.Group(); twist.position.set(x, H + 0.022, z); twist.rotation.y = turn; s.root.add(twist);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.1, 9, 1, true), paper); cone.rotation.z = Math.PI / 2; cone.castShadow = true; twist.add(cone);
      const open = !neat && random() < 0.6;
      if (open) { const mouthDisc = new THREE.Mesh(new THREE.CircleGeometry(0.022, 9), powderMat(TINT[key])); mouthDisc.position.x = -0.049; mouthDisc.rotation.y = -Math.PI / 2; twist.add(mouthDisc); const spill = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), powderMat(TINT[key])); spill.scale.set(0.035, 0.008, 0.028); spill.position.set(-0.075, -0.018, 0); twist.add(spill); }
      else { const tail = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.03, 6), paper); tail.rotation.z = -Math.PI / 2; tail.position.x = -0.062; twist.add(tail); const dab = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), powderMat(TINT[key])); dab.position.set(0, 0.02, 0); twist.add(dab); }
    }
    if (!dusty) for (let i = 0; i < Math.round(mix(1, 4, mood.density)); i++) {
      const key = palette[(i + 1) % palette.length], x = -0.7 + random() * 0.18 + (i % 2) * 0.9 * random(), z = frontZ - 0.05 - random() * 0.12;
      if (Math.abs(x - mx) < 0.24) continue;
      s.box([0.13, 0.002, 0.13], [x, H + 0.001, z], paper).rotation.y = random();
      s.mesh(new THREE.ConeGeometry(0.045, 0.04, 12), powderMat(TINT[key]), [x, H + 0.022, z]);
    }

    // Ledger.
    if (a.ledger) {
      const lx = a.scales === 'none' ? 0.3 : 0.02, lz = frontZ - 0.1, turn = (random() - 0.5) * 0.5;
      const book = new THREE.Group(); book.position.set(lx, H, lz); book.rotation.y = turn; s.root.add(book);
      const lc = document.createElement('canvas'); lc.width = 256; lc.height = 160; const l = lc.getContext('2d')!;
      l.fillStyle = '#e6dbbb'; l.fillRect(0, 0, 256, 160); l.fillStyle = '#3a2a1c'; l.fillRect(126, 0, 3, 160);
      for (let row = 0; row < 9; row++) for (const x0 of [14, 140]) { l.fillRect(x0, 18 + row * 15, 60 + random() * 40, 2); if (random() < 0.3) { l.fillStyle = TINT[palette[Math.floor(random() * 5)]]; l.fillRect(x0 + 84, 13 + row * 15, 10, 10); l.fillStyle = '#3a2a1c'; } }
      const pageMap = new THREE.CanvasTexture(lc); pageMap.colorSpace = THREE.SRGBColorSpace;
      const cover = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.23), s.material(dustOf('#4a2a20').getStyle())); cover.position.y = 0.006; cover.castShadow = true;
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.21), s.material(dustOf('#d9cba6').getStyle())); block.position.y = 0.022;
      const pages = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.21), new THREE.MeshStandardMaterial({ map: pageMap, color: dustOf('#ffffff'), roughness: 0.9 })); pages.rotation.x = -Math.PI / 2; pages.position.y = 0.0325;
      book.add(cover, block, pages);
      if (!wrecked) { const quill = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.22, 4), s.material('#efe9dc')); quill.scale.z = 0.25; quill.rotation.set(0.1, 0.4, Math.PI / 2 - 0.2); quill.position.set(0.2, 0.05, 0.02); book.add(quill); }
    }

    const speed = mix(0.6, 3, mood.energy);
    const pose = (time: number) => {
      if (a.work === 'grinding') { pestle.rotation.set(Math.sin(time) * lean, 0, -Math.cos(time) * lean); }
      for (const p of puffs) { const t = (p.userData.phase + time * 0.08) % 1; p.position.set(mx + Math.cos(p.userData.g) * t * 0.2, H + rim + t * 0.3, mz + Math.sin(p.userData.g) * t * 0.15); p.scale.setScalar(0.05 + t * 0.12); }
    };
    pose(0.8);
    return s.finish({ update: (_dt, time) => pose(0.8 + time * speed) });
  },
});
