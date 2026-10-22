import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = [number, number, number];

export default defineThing({
  questions: {
    box: choice('What kind of offering box is it?', {
      grand: 'A big hall box of dark keyaki wood with brass corner fittings and a deep slatted top.',
      rustic: 'A small plain plank box, silvered by weather, at a wayside shrine.',
      vermilion: 'Lacquered vermilion with black edges and a gold crest.',
      stone: 'Carved from a single block of stone with a coin slot cut in the top.',
    }),
    front: choice('What is on the front of the box?', {
      characters: 'Two large brushed characters meaning "offering".',
      crest: 'A round family or shrine crest.',
      plain: 'Nothing; bare boards.',
    }),
    rope: choice('What is the bell rope like?', {
      redwhite: 'A thick twisted rope of red and white cloth.',
      five: 'A bundle of five coloured cloth streamers: green, yellow, red, white, purple.',
      straw: 'A plain hemp rope with a wooden grip and a tassel.',
      faded: 'An old rope bleached pale and fraying where hands have worn it.',
    }),
    bell: choice('What bell hangs above?', {
      suzu: 'One big round brass rattle bell with a slit mouth.',
      cluster: 'A cluster of three smaller rattle bells.',
      gong: 'A flat round temple gong struck by a knot in the rope.',
      tarnished: 'A single bell gone dull green, its voice half gone.',
    }),
    frame: choice('What do the bell and rope hang from?', {
      beam: 'A plain cedar beam between two posts.',
      vermilion: 'A vermilion beam with white bracket ends.',
      eave: 'The front of a shrine porch: a small curved roof with a straw rope and paper streamers across it.',
    }),
    lid: choice('What has been left on the lid?', {
      coins: 'A few stray coins that missed the slats.',
      heap: 'A New Year heap of coins and a banknote or two.',
      gifts: 'A mandarin, a cup of sake and a small bunch of flowers.',
      leaves: 'Only fallen leaves and dust; nobody has come for a long time.',
      note: 'One folded letter tucked between the slats.',
    }),
    moment: choice('What is happening at this moment?', {
      still: 'Nothing. The rope hangs dead straight.',
      rung: 'Someone has just rung it: the rope is swinging and the bell still shivering.',
      wind: 'The wind is moving the rope and streamers gently.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const stone = s.material(new THREE.Color('#a2a198').lerp(new THREE.Color('#7b836c'), mood.wear * 0.4), { roughness: 0.95 });
    const cedar = s.material(new THREE.Color('#8a6444').lerp(new THREE.Color('#8f8a80'), mood.wear * 0.5), { roughness: 0.85 });
    const vermilion = s.material(new THREE.Color('#d8431f').lerp(new THREE.Color('#c98f7d'), mood.wear * 0.5), { roughness: 0.55 });
    const black = s.material('#1c1b1d', { roughness: 0.5 });
    const brass = s.material(a.bell === 'tarnished' ? '#6f8a72' : '#d9ae3d', { metalness: 0.85, roughness: a.bell === 'tarnished' ? 0.7 : 0.28 });
    const gold = s.material('#d9ae3d', { metalness: 0.85, roughness: 0.3 });
    const silver = s.material('#c3c6c9', { metalness: 0.85, roughness: 0.35 });

    // Paved pad and one worn step up to the box.
    s.box([3.0, 0.14, 2.0], [0, 0.07, -0.1], stone);
    s.box([2.2, 0.1, 0.5], [0, 0.19, 0.55], stone);
    const floor = 0.14;

    // The box.
    const big = a.box === 'rustic' ? 0.72 : 1;
    const W = 1.4 * big, H = 0.66 * big, D = 0.78 * big;
    const boxTone = { grand: '#5a3b26', rustic: '#9a9082', vermilion: '#d8431f', stone: '#a8a79e' }[a.box];
    const body = a.box === 'stone' ? stone : s.material(new THREE.Color(boxTone).lerp(new THREE.Color('#8f8a80'), mood.wear * 0.35), { roughness: a.box === 'vermilion' ? 0.4 : 0.8 });
    const trim = a.box === 'vermilion' ? black : a.box === 'grand' ? gold : body;
    const z0 = 0.05;
    const top = floor + 0.08 + H;
    for (const x of [-1, 1]) s.box([0.14 * big, 0.08, D + 0.06], [x * (W / 2 - 0.14), floor + 0.04, z0], a.box === 'stone' ? stone : body);
    // Four walls and a floor, so the slatted top looks into darkness.
    s.box([W, H, 0.06], [0, floor + 0.08 + H / 2, z0 + D / 2 - 0.03], body);
    s.box([W, H, 0.06], [0, floor + 0.08 + H / 2, z0 - D / 2 + 0.03], body);
    for (const x of [-1, 1]) s.box([0.06, H, D], [x * (W / 2 - 0.03), floor + 0.08 + H / 2, z0], body);
    s.box([W - 0.08, 0.04, D - 0.08], [0, top - 0.2, z0], s.material('#15110e', { roughness: 1 })).castShadow = false;
    if (a.box === 'stone') {
      s.box([W, 0.1, D], [0, top - 0.05, z0], stone);
      s.box([W * 0.5, 0.012, 0.06], [0, top + 0.002, z0], s.material('#15110e')).castShadow = false;
      s.box([W + 0.1, 0.07, D + 0.1], [0, top - 0.02, z0], stone).position.y = top - 0.14;
    } else {
      // Rim and the row of slats: triangular bars the coins slide between.
      s.box([W + 0.06, 0.07, 0.08], [0, top, z0 + D / 2 - 0.02], trim === body ? body : trim);
      s.box([W + 0.06, 0.07, 0.08], [0, top, z0 - D / 2 + 0.02], trim === body ? body : trim);
      for (const x of [-1, 1]) s.box([0.08, 0.07, D], [x * (W / 2 - 0.01), top, z0], trim === body ? body : trim);
      const bars = Math.round(9 * big);
      const bar = new THREE.CylinderGeometry(0.036, 0.036, W - 0.06, 3);
      bar.rotateZ(Math.PI / 2);
      for (let i = 0; i < bars; i++) s.mesh(bar, body, [0, top - 0.012, z0 - D / 2 + 0.1 + i * (D - 0.2) / (bars - 1)]);
      for (const x of [-W / 6, W / 6]) s.box([0.05, 0.05, D - 0.06], [x, top - 0.035, z0], body);
      if (a.box === 'grand' || a.box === 'vermilion') {
        for (const x of [-1, 1]) for (const y of [0.1, H - 0.02]) s.box([0.2 * big, 0.14, 0.012], [x * (W / 2 - 0.1), floor + 0.08 + y - 0.04, z0 + D / 2 + 0.004], trim);
        for (let i = 0; i < 6; i++) s.box([0.035, H - 0.16, 0.02], [-W / 2 + 0.28 + i * (W - 0.56) / 5, floor + 0.08 + H / 2, z0 + D / 2 + 0.006], body);
      } else {
        for (let i = 1; i < 3; i++) s.box([W, 0.012, 0.01], [0, floor + 0.08 + i * H / 3, z0 + D / 2 + 0.002], s.material('#5d564c')).castShadow = false;
      }
    }
    if (a.front !== 'plain') {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const ground = a.box === 'grand' ? '#e9dfc6' : a.box === 'rustic' ? '#cfc6b2' : a.box === 'vermilion' ? '#1c1b1d' : '#b9b8ae';
      const ink = a.box === 'vermilion' ? '#e7bd4b' : a.box === 'stone' ? '#4a4944' : '#1d1a18';
      ctx.fillStyle = ground; ctx.fillRect(0, 0, 256, 128);
      ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineCap = 'round';
      if (a.front === 'crest') {
        ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(128, 64, 46, 0, 7); ctx.stroke();
        for (let i = 0; i < 3; i++) { const g = i * 2.094 - 1.57; ctx.beginPath(); ctx.arc(128 + Math.cos(g) * 20, 64 + Math.sin(g) * 20, 15, 0, 7); ctx.fill(); }
      } else {
        // Two invented block characters, drawn right to left.
        for (const cx of [182, 74]) {
          ctx.lineWidth = 10;
          const rows = 3 + Math.floor(random() * 2);
          for (let i = 0; i < rows; i++) { const y = 22 + i * 84 / (rows - 1); ctx.beginPath(); ctx.moveTo(cx - 36 + random() * 10, y); ctx.lineTo(cx + 36 - random() * 10, y); ctx.stroke(); }
          ctx.beginPath(); ctx.moveTo(cx, 16); ctx.lineTo(cx, 110); ctx.stroke();
          ctx.lineWidth = 8;
          ctx.beginPath(); ctx.moveTo(cx - 6, 70); ctx.quadraticCurveTo(cx - 20, 100, cx - 40, 110); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx + 6, 70); ctx.quadraticCurveTo(cx + 20, 100, cx + 40, 110); ctx.stroke();
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const w = a.front === 'crest' ? H * 1.3 : W * 0.6, h = w / 2;
      s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 }), [0, floor + 0.08 + H / 2, z0 + D / 2 + 0.03]);
    }

    // On the lid.
    const onLid = (): P => [(random() - 0.5) * (W - 0.25), top + 0.04, z0 + (random() - 0.5) * (D - 0.2)];
    const coin = (at: P, material: THREE.Material, tilt = true) => {
      const disc = s.cylinder(0.024, 0.024, 0.005, at, material, 12);
      if (tilt) disc.rotation.set((random() - 0.5) * 0.9, 0, (random() - 0.5) * 0.5);
      return disc;
    };
    if (a.lid === 'coins' || a.lid === 'heap') {
      const n = a.lid === 'heap' ? Math.round(mix(40, 90, mood.density)) : 3 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) coin(onLid(), random() < 0.45 ? gold : random() < 0.6 ? silver : s.material('#b06c3c', { metalness: 0.8, roughness: 0.4 }));
      for (let i = 0; i < (a.lid === 'heap' ? 9 : 2); i++) coin([(random() - 0.5) * 1.6, floor + 0.005 + (random() < 0.5 ? 0.1 : 0), 0.5 + random() * 0.45], gold, false);
      if (a.lid === 'heap') for (let i = 0; i < 2; i++) { const p = onLid(); s.box([0.16, 0.004, 0.076], [p[0], top + 0.05, p[2]], s.material('#c9c2a0', { roughness: 0.9 })).rotation.y = random() * 3; }
    } else if (a.lid === 'gifts') {
      s.ball([0.045, 0.04, 0.045], [-W / 2 + 0.18, top + 0.075, z0 + D / 2 - 0.06], s.material('#f08a1d', { roughness: 0.6 }), 12);
      s.cylinder(0.03, 0.022, 0.045, [-W / 2 + 0.32, top + 0.058, z0 + D / 2 - 0.05], s.material('#f3f1ea', { roughness: 0.3 }), 12);
      for (let i = 0; i < 5; i++) {
        const x = W / 2 - 0.3 + i * 0.03;
        s.rod([x, top + 0.045, z0 + D / 2 - 0.2], [x + (i - 2) * 0.02, top + 0.05, z0 + D / 2 - 0.02], 0.005, s.material('#4f7a3a'));
        s.ball([0.022, 0.022, 0.022], [x + (i - 2) * 0.022, top + 0.06, z0 + D / 2 - 0.01], s.material(i % 2 ? '#f3d54a' : '#f4f0ea'), 8);
      }
    } else if (a.lid === 'leaves') {
      const leaves: { at: P; size: number; color: THREE.Color }[] = [];
      for (let i = 0; i < 40; i++) {
        const lid = random() < 0.45;
        leaves.push({ at: lid ? onLid() : [(random() - 0.5) * 2.8, floor + 0.012, -0.9 + random() * 1.7], size: 0.6 + random() * 0.8, color: new THREE.Color().setHSL(0.03 + random() * 0.09, 0.6, 0.3 + random() * 0.18) });
      }
      const leaf = new THREE.CircleGeometry(0.055, 5);
      leaf.rotateX(-Math.PI / 2);
      s.scatter(leaf, new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }), leaves);
    } else {
      const letter = s.box([0.2, 0.11, 0.008], [0.12, top + 0.035, z0 + 0.06], s.material('#f6f3e8', { roughness: 0.9 }));
      letter.rotation.set(-0.5, 0.3, 0);
    }

    // Frame behind the box.
    const beamY = 2.75, postX = 1.15, backZ = -0.62;
    const frameWood = a.frame === 'vermilion' ? vermilion : cedar;
    for (const x of [-postX, postX]) {
      s.cylinder(0.085, 0.095, beamY, [x, floor + beamY / 2, backZ], frameWood, 14);
      s.cylinder(0.14, 0.15, 0.12, [x, floor + 0.06, backZ], a.frame === 'vermilion' ? black : stone, 14);
    }
    s.box([postX * 2 + 0.7, 0.18, 0.16], [0, floor + beamY, backZ], frameWood);
    s.box([postX * 2 + 0.2, 0.1, 0.1], [0, floor + beamY - 0.42, backZ], frameWood);
    if (a.frame === 'vermilion') for (const x of [-1, 1]) s.box([0.04, 0.2, 0.18], [x * (postX + 0.35), floor + beamY, backZ], s.material('#f3efe4'));
    const shide: THREE.Mesh[] = [];
    if (a.frame === 'eave') {
      const roofing = s.material(new THREE.Color('#3e3027').lerp(new THREE.Color('#5f6a4a'), mood.wear * 0.5), { roughness: 0.95 });
      const depth = 1.7, width = 3.3, rise = 0.5;
      const profile = new THREE.Shape();
      profile.moveTo(-depth / 2, 0.1); profile.quadraticCurveTo(-depth / 5, rise * 0.45, 0, rise); profile.quadraticCurveTo(depth / 5, rise * 0.45, depth / 2, 0.1);
      profile.lineTo(depth / 2, 0.2); profile.quadraticCurveTo(depth / 5, rise * 0.45 + 0.12, 0, rise + 0.14); profile.quadraticCurveTo(-depth / 5, rise * 0.45 + 0.12, -depth / 2, 0.2);
      profile.closePath();
      const geometry = new THREE.ExtrudeGeometry(profile, { depth: width, bevelEnabled: false, curveSegments: 8 });
      geometry.translate(0, 0, -width / 2);
      geometry.rotateY(Math.PI / 2);
      s.mesh(geometry, roofing, [0, floor + beamY + 0.05, backZ]);
      s.box([width + 0.1, 0.1, 0.14], [0, floor + beamY + rise + 0.2, backZ], cedar);
      for (let i = 0; i < 12; i++) s.box([0.06, 0.07, depth * 0.95], [-width / 2 + 0.15 + i * (width - 0.3) / 11, floor + beamY + 0.1, backZ], cedar);
      // Straw rope and streamers under the eave.
      const straw = s.material('#d9b862', { roughness: 0.95 });
      const y = floor + beamY - 0.2, z = backZ + 0.14;
      for (const strand of [0, Math.PI]) {
        const points: P[] = [];
        for (let i = 0; i <= 60; i++) { const t = i / 60, x = mix(-postX, postX, t); points.push([x, y - Math.sin(t * Math.PI) * 0.12 + Math.sin(t * 40 + strand) * 0.022, z + Math.cos(t * 40 + strand) * 0.022]); }
        s.tube(points, mix(0.03, 0.03, 0), straw);
      }
      const paper = new THREE.MeshStandardMaterial({ color: '#fbfaf5', roughness: 0.8, side: THREE.DoubleSide, emissive: '#fbfaf5', emissiveIntensity: 0.12 });
      for (let i = 0; i < 4; i++) {
        const x = mix(-postX, postX, (i + 0.5) / 4) + (i < 2 ? -0.12 : 0.12);
        const group = new THREE.Group();
        for (let k = 0; k < 4; k++) { const quad = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.12), paper); quad.position.set((k % 2 ? 0.035 : -0.035), -0.06 - k * 0.105, 0); quad.castShadow = true; group.add(quad); }
        group.position.set(x, y - Math.sin((x + postX) / (postX * 2) * Math.PI) * 0.12 - 0.03, z + 0.03);
        s.root.add(group);
        shide.push(group as unknown as THREE.Mesh);
      }
    }

    // Bell and rope hang from one pivot so they can swing together.
    const pivot = new THREE.Group();
    const hangZ = backZ + 0.3;
    pivot.position.set(0, floor + beamY - 0.09, hangZ);
    s.root.add(pivot);
    s.rod([0, floor + beamY, backZ], [0, floor + beamY - 0.07, hangZ], 0.03, frameWood);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P) => { const m = new THREE.Mesh(geometry, material); m.position.set(...at); m.castShadow = true; pivot.add(m); return m; };
    const bells = new THREE.Group();
    pivot.add(bells);
    const suzu = (r: number, at: P) => {
      const g = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), brass);
      const ridge = new THREE.Mesh(new THREE.TorusGeometry(r * 1.01, r * 0.06, 6, 24), brass);
      ridge.rotation.x = Math.PI / 2;
      const slit = new THREE.Mesh(new THREE.BoxGeometry(r * 1.5, r * 0.5, r * 0.13), black);
      slit.position.y = -r * 0.78;
      const eye = new THREE.Mesh(new THREE.TorusGeometry(r * 0.2, r * 0.07, 6, 12), brass);
      eye.position.y = r * 1.1;
      g.add(ball, ridge, slit, eye);
      g.position.set(...at);
      g.traverse((node) => { node.castShadow = true; });
      bells.add(g);
    };
    let ropeTop = -0.38;
    if (a.bell === 'cluster') { suzu(0.1, [-0.13, -0.2, 0]); suzu(0.1, [0.13, -0.2, 0]); suzu(0.11, [0, -0.33, 0.06]); ropeTop = -0.42; }
    else if (a.bell === 'gong') {
      const disc = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 12), brass);
      disc.scale.z = 0.32; disc.position.y = -0.3; disc.castShadow = true;
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.035, 0.2), black);
      mouth.position.y = -0.47;
      const boss = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), brass);
      boss.scale.z = 0.5; boss.position.set(0, -0.28, 0.08);
      bells.add(disc, mouth, boss);
      ropeTop = -0.1;
    } else suzu(0.19, [0, -0.2, 0]);

    const ropeLength = floor + beamY - 0.09 + ropeTop - (top + 0.3);
    const ropeZ = a.bell === 'gong' ? 0.16 : 0;
    const fade = a.rope === 'faded' ? 0.75 : mood.wear * 0.4;
    const tone = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#cfc7b6'), fade);
    if (a.rope === 'five') {
      const hues = ['#2f8a4f', '#f0c832', '#d3322a', '#f5f2ea', '#6b3fa0'];
      hues.forEach((hue, i) => {
        const strip = add(new THREE.BoxGeometry(0.07, ropeLength + i * 0.04, 0.012), new THREE.MeshStandardMaterial({ color: tone(hue), roughness: 0.85 }), [(i - 2) * 0.06, ropeTop - (ropeLength + i * 0.04) / 2, ropeZ + (i % 2) * 0.012]);
        strip.rotation.y = (random() - 0.5) * 0.5;
      });
      add(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12), cedar, [0, ropeTop - 0.02, ropeZ]);
    } else {
      // Striped twist painted on a cylinder.
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      const [c1, c2] = a.rope === 'redwhite' ? ['#d3322a', '#f5f2ea'] : a.rope === 'faded' ? ['#d6b8a8', '#e3ddcf'] : ['#c9ab62', '#a98d4c'];
      ctx.fillStyle = `#${tone(c1).getHexString()}`; ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = `#${tone(c2).getHexString()}`; ctx.lineWidth = 16;
      for (let i = -2; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-8, i * 32 + 40); ctx.lineTo(72, i * 32 - 8); ctx.stroke(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2, ropeLength * 4);
      const twist = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
      const fat = a.rope === 'faded' ? 0.045 : 0.065;
      add(new THREE.CylinderGeometry(fat, fat, ropeLength, 12), twist, [0, ropeTop - ropeLength / 2, ropeZ]);
      add(new THREE.SphereGeometry(fat * 1.5, 12, 8), twist, [0, ropeTop - ropeLength, ropeZ]);
      const tassel = add(new THREE.ConeGeometry(fat * 1.9, 0.3, 10), a.rope === 'straw' ? cedar : new THREE.MeshStandardMaterial({ color: tone(c1), roughness: 0.9 }), [0, ropeTop - ropeLength - 0.2, ropeZ]);
      tassel.rotation.x = 0;
      if (a.rope === 'straw') add(new THREE.CylinderGeometry(0.075, 0.075, 0.3, 12), cedar, [0, ropeTop - ropeLength * 0.72, ropeZ]);
      if (a.rope === 'faded') for (let i = 0; i < 6; i++) { const y = ropeTop - ropeLength * (0.5 + random() * 0.4); const hair = add(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 4), twist, [(random() - 0.5) * 0.1, y, ropeZ + 0.03]); hair.rotation.z = (random() - 0.5) * 2; }
    }

    const swing = a.moment === 'rung' ? 0.3 : a.moment === 'wind' ? 0.1 : 0;
    const speed = mix(1.4, 3.2, mood.energy);
    // Hold the pose a still frame would catch.
    pivot.rotation.z = swing * 0.8;
    pivot.rotation.x = swing * 0.25;
    bells.rotation.z = -swing * 0.6;
    return s.finish({
      update: swing || shide.length ? (_dt, time) => {
        pivot.rotation.z = Math.cos(time * speed) * swing * 0.8;
        pivot.rotation.x = Math.sin(time * speed * 0.6) * swing * 0.25;
        bells.rotation.z = -Math.cos(time * speed * 2.3) * swing * 0.6;
        for (const [i, paper] of shide.entries()) paper.rotation.y = Math.sin(time * 1.4 + i) * mix(0.05, 0.5, mood.energy);
      } : undefined,
    });
  },
});
