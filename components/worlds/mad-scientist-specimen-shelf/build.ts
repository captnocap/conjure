import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, noul, score } from '@conjure/kit';
import { glass, labelPlane, paint } from './lab';

const ERAS = {
  georgian: { wall: '#b3ab82', wood: '#5a3420', trim: '#e4dcc0', metal: '#c39a3c', lamp: '#ffb04a' },
  victorian: { wall: '#7d6248', wood: '#3d2618', trim: '#2f2a22', metal: '#c39a3c', lamp: '#ffd27a' },
  film: { wall: '#86867a', wood: '#34302b', trim: '#4a4a46', metal: '#6f7478', lamp: '#fff0b8' },
  atomic: { wall: '#93b28a', wood: '#75837e', trim: '#dfe6da', metal: '#b9c0c0', lamp: '#d8ffd0' },
} as const;
const LIQUIDS = {
  sickly: ['#9dff3a', '#c8f03a', '#5cdc6a', '#e0e85a'],
  apothecary: ['#ff9a2a', '#5ad0ff', '#c05cff', '#9dff3a', '#ff4a5a', '#ffe04a'],
  blood: ['#d0202a', '#ff9a1c', '#a01828', '#e8b040'],
  cold: ['#5ad0ff', '#8ab4ff', '#b0f0ff', '#6a8aff'],
} as const;

export default defineWorld({
  questions: {
    era: choice('What era is the laboratory?', {
      georgian: 'A Georgian anatomy cabinet: pale panelled plaster, mahogany, a candle lantern and a glass-disc friction machine.',
      victorian: 'A Victorian galvanist\'s den: brick, dark wood, a green-shaded gas lamp and an induction coil.',
      film: 'A 1930s film laboratory: castle stone, knife switches and a tall crackling Jacob\'s ladder.',
      atomic: 'A 1950s atomic lab: pale green tile, steel bench, a fluorescent tube and a Van de Graaff sphere.',
    }),
    order: score('How orderly is the collection?', ['Museum rows, every jar squared to its label', 'A working bench with things left out', 'Chaos: toppled jars, spilled fluid and papers everywhere']),
    bubbles: choice('What is bubbling?', {
      nothing: 'Nothing: the burners are cold.',
      flask: 'A round flask over a spirit burner.',
      retort: 'A retort dripping slowly into a beaker.',
      tank: 'A tall tank with something large suspended in it.',
      everything: 'Everything at once: flask, retort and tank.',
    }),
    liquids: choice('What colours glow in the jars?', {
      sickly: 'Sickly greens and yellows.',
      apothecary: 'A whole apothecary rainbow.',
      blood: 'Blood reds and ambers.',
      cold: 'Cold blues.',
    }),
    storm: noul('Is the storm directly overhead, with lightning at the window?'),
    wall: choice('What hangs on the side wall?', {
      chart: 'A yellowed anatomical chart of a head, annotated.',
      blackboard: 'A blackboard crowded with chalk formulae and a sketch.',
      portrait: 'An oval portrait of a disapproving ancestor.',
      switches: 'A slate panel of knife switches and dials.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const era = ERAS[a.era];
    const W = 14, D = 8, wallH = 6.5, back = -D / 2;
    const { art: s, world } = diorama(context, { background: '#bdb98a', floor: era.wood, width: W, depth: D, maxHeight: 3.4, radius: 1.5, pitch: 25, yaw: 23, slots: [[0, 0.9], [-3.5, 1.3], [3.5, 1.3], [-5.7, -0.4], [5.6, -0.6]] });
    // Sickly green-gold air.
    s.root.traverse((node) => { const light = node as THREE.HemisphereLight; if (light.isHemisphereLight) { light.color.set('#eef0c0'); light.groundColor.set('#6f6c44'); light.intensity = a.storm ? 0.85 : 1.05; } });
    const flat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.7, ...options });
    const wood = s.material(era.wood, { roughness: 0.55 }), dark = s.material(new THREE.Color(era.wood).multiplyScalar(0.65)), metal = s.material(era.metal, { metalness: 0.8, roughness: 0.35 }), trim = s.material(era.trim);
    const glow = (colour: THREE.ColorRepresentation, intensity = 1) => new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: intensity, roughness: 0.4 });

    // Walls, painted per era.
    const wallMap = (cols: number) => paint(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = era.wall; ctx.fillRect(0, 0, w, h);
      const line = (alpha: number) => `rgba(40,34,22,${alpha})`;
      if (a.era === 'victorian' || a.era === 'film') {
        const bh = a.era === 'film' ? 64 : 32, bw = a.era === 'film' ? 128 : 72;
        for (let y = 0, row = 0; y < h; y += bh, row++) for (let x = row % 2 ? -bw / 2 : 0; x < w; x += bw) {
          ctx.fillStyle = `rgba(${a.era === 'film' ? '255,255,240' : '190,90,50'},${random() * 0.16})`; ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
          ctx.strokeStyle = line(0.35); ctx.lineWidth = 3; ctx.strokeRect(x, y, bw, bh);
        }
      } else if (a.era === 'atomic') {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3;
        for (let x = 0; x < w; x += 1024 / cols / 2) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y < h; y += 37) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      } else {
        ctx.strokeStyle = line(0.28); ctx.lineWidth = 4;
        for (let i = 0; i < cols; i++) { const pw = w / cols; ctx.strokeRect(i * pw + 14, 20, pw - 28, h * 0.55); ctx.strokeRect(i * pw + 14, h * 0.62, pw - 28, h * 0.34); }
      }
      for (let i = 0; i < 12 + mood.wear * 60; i++) { const x = random() * w, y = random() * h, r = 30 + random() * 110; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(50,60,20,${0.08 + mood.wear * 0.16})`); g.addColorStop(1, 'rgba(50,60,20,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
      const shade = ctx.createLinearGradient(0, 0, 0, h); shade.addColorStop(0, 'rgba(20,24,10,0.3)'); shade.addColorStop(0.5, 'rgba(20,24,10,0)'); ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
    });
    s.box([W, wallH, 0.3], [0, wallH / 2, back - 0.15], new THREE.MeshStandardMaterial({ map: wallMap(7), roughness: 0.9 }));
    s.box([0.3, wallH, D], [-W / 2 - 0.15, wallH / 2, 0], new THREE.MeshStandardMaterial({ map: wallMap(4), roughness: 0.9 }));
    // The bench the whole scene stands on.
    s.box([W, 1.3, 0.3], [0, -0.89, D / 2 - 0.15], dark); s.box([0.3, 1.3, D], [W / 2 - 0.15, -0.89, 0], dark);
    for (let i = 0; i < 4; i++) { const x = -5.1 + i * 3.4; s.box([3, 0.86, 0.06], [x, -0.82, D / 2 + 0.02], wood); s.ball([0.09, 0.09, 0.07], [x, -0.82, D / 2 + 0.1], metal, 10); }
    s.box([W + 0.2, 0.12, D + 0.2], [0, -0.3, 0], wood);

    // Arched window with rain on it.
    const winX = -0.4, winW = 3.4, sill = 1.9, spring = 4.1, top = spring + winW / 2;
    const arch = new THREE.Shape();
    arch.moveTo(-winW / 2, sill); arch.lineTo(winW / 2, sill); arch.lineTo(winW / 2, spring); arch.absarc(0, spring, winW / 2, 0, Math.PI, false); arch.lineTo(-winW / 2, sill);
    const paneGeometry = new THREE.ShapeGeometry(arch, 24);
    const uvs = paneGeometry.attributes.uv, pos = paneGeometry.attributes.position;
    for (let i = 0; i < uvs.count; i++) uvs.setXY(i, (pos.getX(i) + winW / 2) / winW, (pos.getY(i) - sill) / (top - sill));
    const sky = paint(512, 640, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      if (a.storm) { g.addColorStop(0, '#55667a'); g.addColorStop(0.6, '#8fa39a'); g.addColorStop(1, '#c2c89a'); }
      else { g.addColorStop(0, mood.daylight > 0.7 ? '#7a6f9a' : '#8fa6a4'); g.addColorStop(0.7, '#c9cf9c'); g.addColorStop(1, '#e6dc9a'); }
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) { const x = random() * w, y = random() * h * 0.6, r = 60 + random() * 120; const c = ctx.createRadialGradient(x, y, 0, x, y, r); c.addColorStop(0, a.storm ? 'rgba(40,48,60,0.5)' : 'rgba(255,255,230,0.25)'); c.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = c; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
      if (a.storm) {
        ctx.strokeStyle = '#ffffff'; ctx.shadowColor = '#f4ffb0'; ctx.shadowBlur = 26; ctx.lineWidth = 7; ctx.lineJoin = 'miter';
        let x = w * (0.35 + random() * 0.3), y = 0; ctx.beginPath(); ctx.moveTo(x, y);
        while (y < h * 0.8) { x += (random() - 0.5) * 110; y += 40 + random() * 50; ctx.lineTo(x, y); }
        ctx.stroke(); ctx.shadowBlur = 0;
      } else { ctx.fillStyle = 'rgba(255,252,220,0.9)'; ctx.beginPath(); ctx.arc(w * 0.68, h * 0.3, 44, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = 'rgba(245,250,255,0.55)'; ctx.lineWidth = 2;
      for (let i = 0; i < (a.storm ? 150 : 50); i++) { const x = random() * w, y = random() * h, len = 20 + random() * 60; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * 0.18, y + len); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(30,30,20,0.5)'; ctx.lineWidth = 2;
      for (let i = 0; i < mood.wear * 5; i++) { let x = random() * w, y = random() * h; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (random() - 0.5) * 90; y += (random() - 0.5) * 90; ctx.lineTo(x, y); } ctx.stroke(); }
    });
    const paneMaterial = new THREE.MeshBasicMaterial({ map: sky });
    s.mesh(paneGeometry, paneMaterial, [winX, 0, back + 0.02]).castShadow = false;
    const frame = s.material(a.era === 'atomic' ? '#8f9a94' : a.era === 'georgian' ? '#e4dcc0' : '#2f2a26');
    const hoop = s.mesh(new THREE.TorusGeometry(winW / 2 + 0.08, 0.14, 6, 24, Math.PI), frame, [winX, spring, back + 0.08]);
    hoop.scale.z = 0.6;
    for (const sx of [-1, 1]) s.box([0.26, spring - sill, 0.18], [winX + sx * (winW / 2 + 0.08), (spring + sill) / 2, back + 0.08], frame);
    s.box([winW + 0.8, 0.22, 0.5], [winX, sill - 0.1, back + 0.22], frame);
    for (const x of [-winW / 6, winW / 6]) s.box([0.07, top - sill - 0.25, 0.06], [winX + x, (top + sill) / 2 - 0.1, back + 0.06], frame);
    for (const y of [sill + 0.9, sill + 1.8, spring]) s.box([winW, 0.07, 0.06], [winX, y, back + 0.06], frame);

    // Shelves of jars. Every jar is drawn from four instanced meshes.
    const palette = LIQUIDS[a.liquids];
    const mess = a.order, cheer = mix(0.75, 1.1, mood.cheer);
    const glassM: THREE.Matrix4[] = [], liquidM: THREE.Matrix4[] = [], liquidC: THREE.Color[] = [], lidM: THREE.Matrix4[] = [], labelM: THREE.Matrix4[] = [], blobM: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    const local = (base: THREE.Matrix4, at: [number, number, number], scale: [number, number, number]) => base.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion(), new THREE.Vector3(...scale)));
    const jar = (x: number, y: number, z: number, r: number, h: number, fallen = false) => {
      e.set(0, random() * (0.1 + mess * 1.2), fallen ? Math.PI / 2 : (random() - 0.5) * mess * 0.12);
      const base = new THREE.Matrix4().compose(new THREE.Vector3(x, fallen ? y + r : y, z), q.setFromEuler(e), one);
      const fill = fallen ? 0.35 : mix(0.45, 0.9, random());
      glassM.push(local(base, [0, h / 2, 0], [r, h, r]));
      liquidM.push(local(base, [0, h * fill / 2 + 0.02, 0], [r * 0.9, h * fill, r * 0.9]));
      liquidC.push(new THREE.Color(palette[Math.floor(random() * palette.length)]).multiplyScalar(cheer));
      lidM.push(local(base, [0, h + 0.05, 0], [r * 0.82, 0.12, r * 0.82]));
      if (random() < 0.75) labelM.push(local(base, [0, h * 0.34, r * 1.02], [r * 1.15, h * 0.26, 1]));
      if (random() < 0.7) blobM.push(local(base, [(random() - 0.5) * r * 0.5, h * fill * mix(0.35, 0.65, random()), 0], [r * mix(0.3, 0.6, random()), h * mix(0.12, 0.3, random()), r * mix(0.3, 0.55, random())]));
    };
    const books: { at: [number, number, number]; size: [number, number, number]; colour: string }[] = [];
    const shelf = (x0: number, x1: number, y: number) => {
      s.box([x1 - x0, 0.1, 0.9], [(x0 + x1) / 2, y, back + 0.47], wood);
      for (const x of [x0 + 0.3, x1 - 0.3]) { s.box([0.08, 0.5, 0.08], [x, y - 0.3, back + 0.1], metal); s.rod([x, y - 0.5, back + 0.1], [x, y - 0.06, back + 0.8], 0.03, metal); }
      let x = x0 + 0.35;
      while (x < x1 - 0.3) {
        const r = mix(0.2, 0.36, random()), h = mix(0.55, 1.15, random());
        if (random() > mix(0.55, 1, mood.density) + 0.08) { x += r * 2; continue; }
        if (random() < 0.16) {
          const n = 2 + Math.floor(random() * 3);
          for (let i = 0; i < n; i++) { const bw = 0.12 + random() * 0.1; books.push({ at: [x + bw / 2, y + 0.05 + 0.4, back + 0.45], size: [bw, 0.7 + random() * 0.2, 0.6], colour: ['#6a1c22', '#23402c', '#3a2c50', '#7a5a22', '#2a2a2e'][Math.floor(random() * 5)] }); x += bw + 0.02; }
          x += 0.1; continue;
        }
        jar(x + r + (random() - 0.5) * mess * 0.1, y + 0.05, back + 0.45 + (random() - 0.5) * mess * 0.25, r, h, mess > 0.6 && random() < 0.14);
        x += r * 2 + 0.08 + random() * mix(0.02, 0.3, mess);
      }
    };
    shelf(-6.7, winX - winW / 2 - 0.5, 2.9); shelf(-6.7, winX - winW / 2 - 0.5, 4.6);
    shelf(winX + winW / 2 + 0.5, 6.8, 2.9); shelf(winX + winW / 2 + 0.5, 6.8, 4.6);
    // A few jars along the back of the bench, and whatever fell over.
    for (let i = 0; i < 3 + mood.density * 4; i++) jar(mix(-6.3, 6.3, random()), 0, back + 0.55 + random() * 0.5, mix(0.22, 0.34, random()), mix(0.5, 0.95, random()), mess > 0.5 && random() < 0.3);
    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, matrices: THREE.Matrix4[], colours?: THREE.Color[], shadow = true) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, matrices.length));
      mesh.count = matrices.length;
      matrices.forEach((matrix, i) => { mesh.setMatrixAt(i, matrix); if (colours) mesh.setColorAt(i, colours[i]); });
      mesh.castShadow = shadow; mesh.receiveShadow = shadow;
      s.root.add(mesh);
      return mesh;
    };
    const unit = new THREE.CylinderGeometry(1, 1, 1, 14);
    instanced(unit, new THREE.MeshBasicMaterial({ color: '#ffffff' }), liquidM, liquidC, false);
    instanced(new THREE.SphereGeometry(1, 8, 6), flat('#2c2a1c', { roughness: 0.9 }), blobM, undefined, false).renderOrder = 1;
    instanced(unit, flat('#6b5236'), lidM);
    instanced(new THREE.PlaneGeometry(1, 1), flat('#efe4c4', { roughness: 0.9 }), labelM, undefined, false);
    instanced(new THREE.CylinderGeometry(1, 1, 1, 14, 1, true), glass('#e9fff0', 0.13), glassM, undefined, false);
    for (const book of books) s.box(book.size, book.at, s.material(book.colour)).rotation.z = (random() - 0.5) * mess * 0.3;

    // Apparatus along the back of the bench.
    const bubbleHomes: { x: number; y: number; z: number; r: number; h: number }[] = [];
    const hot = a.bubbles;
    const brew = new THREE.Color(palette[0]).multiplyScalar(cheer);
    const liquidGlow = new THREE.MeshBasicMaterial({ color: brew });
    const clear = glass('#e9fff0', 0.24);
    if (hot === 'flask' || hot === 'everything' || hot === 'nothing') {
      const x = 2.3, z = back + 1.25;
      s.cylinder(0.16, 0.26, 0.3, [x, 0.15, z], metal); s.ring(0.34, 0.025, [x, 0.62, z], metal).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) s.rod([x + Math.sin(i * 2.1) * 0.34, 0, z + Math.cos(i * 2.1) * 0.34], [x + Math.sin(i * 2.1) * 0.34, 0.62, z + Math.cos(i * 2.1) * 0.34], 0.02, metal);
      s.ball([0.42, 0.42, 0.42], [x, 1.0, z], clear, 18).castShadow = false; s.cylinder(0.12, 0.14, 0.6, [x, 1.6, z], clear).castShadow = false;
      const brewMesh = s.mesh(new THREE.SphereGeometry(0.38, 16, 10, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58), liquidGlow, [x, 1.0, z]); brewMesh.castShadow = false;
      if (hot !== 'nothing') { s.mesh(new THREE.ConeGeometry(0.07, 0.24, 8), new THREE.MeshBasicMaterial({ color: '#6ab8ff' }), [x, 0.44, z]).castShadow = false; bubbleHomes.push({ x, y: 0.75, z, r: 0.2, h: 0.5 }); }
    }
    if (hot === 'retort' || hot === 'everything') {
      const x = -2.5, z = back + 1.3;
      s.rod([x - 0.5, 0, z], [x - 0.5, 1.7, z], 0.035, metal); s.box([0.5, 0.06, 0.4], [x - 0.5, 0.03, z], metal);
      s.ball([0.36, 0.36, 0.36], [x, 1.2, z], clear, 16).castShadow = false;
      s.mesh(new THREE.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), liquidGlow, [x, 1.2, z]).castShadow = false;
      s.rod([x + 0.2, 1.42, z], [x + 1.15, 0.72, z], 0.07, clear, 0.03).castShadow = false;
      s.cylinder(0.2, 0.17, 0.4, [x + 1.2, 0.2, z], clear).castShadow = false;
      s.cylinder(0.17, 0.15, 0.18, [x + 1.2, 0.1, z], liquidGlow).castShadow = false;
      s.cylinder(0.12, 0.2, 0.26, [x, 0.5, z], metal); s.mesh(new THREE.ConeGeometry(0.06, 0.2, 8), new THREE.MeshBasicMaterial({ color: '#6ab8ff' }), [x, 0.73, z]).castShadow = false;
      bubbleHomes.push({ x, y: 1.0, z, r: 0.18, h: 0.3 });
    }
    if (hot === 'tank' || hot === 'everything') {
      const x = -5.6, z = back + 1.2, h = 3.0, r = 0.72;
      s.cylinder(r + 0.08, r + 0.14, 0.24, [x, 0.12, z], metal); s.cylinder(r + 0.1, r + 0.06, 0.2, [x, h + 0.1, z], metal);
      s.cylinder(r, r, h - 0.1, [x, h / 2 + 0.1, z], clear).castShadow = false;
      const tankFluid = s.cylinder(r * 0.94, r * 0.94, h - 0.5, [x, h / 2 - 0.05, z], new THREE.MeshBasicMaterial({ color: brew, transparent: true, opacity: 0.55, depthWrite: false })); tankFluid.castShadow = false;
      const shape = flat('#2a301c', { roughness: 0.9 });
      s.ball([0.26, 0.3, 0.24], [x, 2.25, z], shape, 12); s.ball([0.3, 0.5, 0.22], [x, 1.55, z], shape, 12);
      for (const sx of [-1, 1]) { s.rod([x + sx * 0.25, 1.9, z], [x + sx * 0.42, 1.1, z + 0.1], 0.07, shape); s.rod([x + sx * 0.14, 1.1, z], [x + sx * 0.2, 0.45, z], 0.08, shape); }
      for (const pipe of [-1, 1]) s.tube([[x + pipe * 0.3, h + 0.2, z], [x + pipe * 0.5, h + 0.9, z - 0.3], [x + pipe * 0.4, h + 1.3, back + 0.2]], 0.05, metal);
      bubbleHomes.push({ x, y: 0.4, z, r: r * 0.7, h: h - 0.8 });
    }
    // A bell jar with a brain in it.
    {
      const x = 4.1, z = back + 1.15;
      s.cylinder(0.62, 0.66, 0.12, [x, 0.06, z], wood);
      s.lathe([[0.55, 0.12], [0.55, 1.0], [0.5, 1.25], [0.36, 1.45], [0.14, 1.56], [0, 1.58]], clear).position.set(x, 0, z);
      s.ball([0.09, 0.09, 0.09], [x, 1.66, z], flat('#cfe6dc', { roughness: 0.1 }), 10);
      const brain = flat('#c99a94', { roughness: 0.6 });
      for (const sx of [-1, 1]) s.ball([0.17, 0.2, 0.26], [x + sx * 0.14, 0.42, z], brain, 12);
      s.ball([0.12, 0.1, 0.14], [x, 0.25, z - 0.1], brain, 10);
    }
    // Brass microscope, skull and candle fill the gaps when the room is dense.
    if (mood.density > 0.3) {
      const x = 0.9, z = back + 0.9;
      s.box([0.5, 0.08, 0.4], [x, 0.04, z], metal); s.rod([x - 0.15, 0.08, z], [x - 0.15, 0.9, z], 0.04, metal);
      s.rod([x - 0.15, 0.85, z], [x + 0.08, 0.35, z], 0.07, metal); s.box([0.34, 0.03, 0.3], [x, 0.36, z], metal);
    }
    if (mood.density > 0.55) {
      const x = -1.4, z = back + 0.7, bone = flat('#e6dab8');
      s.ball([0.24, 0.24, 0.28], [x, 0.3, z], bone, 14); s.box([0.26, 0.16, 0.2], [x, 0.1, z + 0.14], bone);
      for (const sx of [-1, 1]) s.ball([0.06, 0.07, 0.03], [x + sx * 0.1, 0.3, z + 0.26], flat('#2a1c12'), 8);
    }
    // Papers and spills when order has broken down.
    const sheets: THREE.Matrix4[] = [];
    for (let i = 0; i < mess * 18; i++) { e.set(0, random() * 3, 0); sheets.push(new THREE.Matrix4().compose(new THREE.Vector3(mix(-6.4, 6.4, random()), 0.012 + i * 0.002, mix(-1.8, 3.6, random())), q.setFromEuler(e), new THREE.Vector3(0.55, 0.01, 0.75))); }
    instanced(new THREE.BoxGeometry(1, 1, 1), flat('#e9dfc0', { roughness: 0.9 }), sheets);
    if (mess > 0.55) for (let i = 0; i < 3; i++) { const puddle = s.cylinder(0.4 + random() * 0.4, 0.45 + random() * 0.4, 0.015, [mix(-6, 6, random()), 0.01, back + 1.2 + random() * 1.2], new THREE.MeshBasicMaterial({ color: new THREE.Color(palette[i % palette.length]).multiplyScalar(cheer) }), 18); puddle.scale.z = 0.6; puddle.castShadow = false; }

    // The coil.
    const sparkMaterial = new THREE.MeshBasicMaterial({ color: a.era === 'atomic' ? '#b8ffb0' : '#cfe6ff' });
    const arcs: THREE.Mesh[] = [];
    const arcBetween = (from: THREE.Vector3, to: THREE.Vector3, jitter: number) => {
      const points = Array.from({ length: 8 }, (_u, i) => from.clone().lerp(to, i / 7).add(i > 0 && i < 7 ? new THREE.Vector3((random() - 0.5) * jitter, (random() - 0.5) * jitter, (random() - 0.5) * jitter) : new THREE.Vector3()));
      const arc = s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0), 20, 0.03, 4), sparkMaterial);
      arc.castShadow = false; arcs.push(arc);
      return arc;
    };
    let ladder: { arc: THREE.Mesh; base: number; top: number } | null = null, wheel: THREE.Object3D | null = null;
    const cx = 5.9, cz = back + 1.5;
    if (a.era === 'film') {
      s.box([1.1, 0.5, 0.8], [cx, 0.25, cz], s.material('#2a2c30')); s.box([0.4, 0.2, 0.05], [cx, 0.3, cz + 0.41], glow('#ffb04a', 0.8));
      for (const sx of [-1, 1]) s.rod([cx + sx * 0.12, 0.5, cz], [cx + sx * 0.62, 3.4, cz], 0.035, metal);
      const arc = arcBetween(new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0), 0.16);
      arc.position.set(cx, 1.6, cz); ladder = { arc, base: 0.6, top: 3.3 };
      arcs.pop();
    } else if (a.era === 'victorian') {
      s.box([1.8, 0.14, 0.9], [cx - 0.3, 0.07, cz], wood);
      const drum = s.cylinder(0.3, 0.3, 1.3, [cx - 0.3, 0.46, cz], s.material('#1c1c20', { roughness: 0.4 })); drum.rotation.z = Math.PI / 2;
      for (const sx of [-1, 1]) { const cap = s.cylinder(0.36, 0.36, 0.08, [cx - 0.3 + sx * 0.68, 0.46, cz], metal); cap.rotation.z = Math.PI / 2; s.rod([cx - 0.3 + sx * 0.68, 0.8, cz], [cx - 0.3 + sx * 0.3, 1.5, cz], 0.025, metal); s.ball([0.08, 0.08, 0.08], [cx - 0.3 + sx * 0.3, 1.5, cz], metal, 10); }
      for (let i = 0; i < 4; i++) arcBetween(new THREE.Vector3(cx - 0.6, 1.5, cz), new THREE.Vector3(cx, 1.5, cz), 0.14);
    } else if (a.era === 'atomic') {
      s.cylinder(0.5, 0.56, 0.3, [cx, 0.15, cz], s.material('#5f6a66')); s.cylinder(0.14, 0.14, 1.9, [cx, 1.25, cz], flat('#d9d3b8', { roughness: 0.4 }));
      s.ball([0.62, 0.62, 0.62], [cx, 2.5, cz], s.material('#c9cfd0', { metalness: 0.9, roughness: 0.2 }), 24);
      s.rod([cx - 1.25, 0, cz + 0.3], [cx - 1.25, 1.9, cz + 0.3], 0.03, metal); s.ball([0.16, 0.16, 0.16], [cx - 1.25, 2.0, cz + 0.3], metal, 12);
      for (let i = 0; i < 4; i++) arcBetween(new THREE.Vector3(cx - 0.58, 2.4, cz + 0.1), new THREE.Vector3(cx - 1.12, 2.05, cz + 0.3), 0.18);
    } else {
      s.box([1.5, 0.12, 0.9], [cx - 0.2, 0.06, cz], wood);
      for (const sz of [-1, 1]) s.box([0.12, 1.9, 0.1], [cx - 0.2, 0.95, cz + sz * 0.3], wood);
      const disc = new THREE.Group(); disc.position.set(cx - 0.2, 1.4, cz);
      const pane = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.04, 32), glass('#d6efe6', 0.3)); pane.rotation.x = Math.PI / 2; disc.add(pane);
      const rimGeo = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.025, 6, 32), flat('#bfe0d2', { roughness: 0.15 })); disc.add(rimGeo);
      for (let i = 0; i < 12; i++) { const ang = (i / 12) * Math.PI * 2; const foil = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.05), flat('#d9dde0', { metalness: 0.9, roughness: 0.3 })); foil.position.set(Math.cos(ang) * 0.6, Math.sin(ang) * 0.6, 0); foil.rotation.z = ang + Math.PI / 2; disc.add(foil); }
      s.root.add(disc); wheel = disc;
      for (const sx of [-1, 1]) { s.rod([cx - 0.2 + sx * 1.0, 0.1, cz + 0.5], [cx - 0.2 + sx * 0.5, 1.7, cz + 0.5], 0.025, metal); s.ball([0.09, 0.09, 0.09], [cx - 0.2 + sx * 0.5, 1.7, cz + 0.5], metal, 10); }
      for (let i = 0; i < 3; i++) arcBetween(new THREE.Vector3(cx - 0.62, 1.7, cz + 0.5), new THREE.Vector3(cx + 0.22, 1.7, cz + 0.5), 0.16);
    }

    // The side wall piece.
    const wx = -W / 2 + 0.02;
    const hang = (mesh: THREE.Object3D, y: number, z: number) => { mesh.position.set(wx, y, z); mesh.rotation.y = Math.PI / 2; s.root.add(mesh); };
    if (a.wall === 'chart') {
      const chart = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), new THREE.MeshStandardMaterial({ roughness: 0.9, map: paint(512, 672, (ctx, w, h) => {
        ctx.fillStyle = '#e6d8ac'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 5; ctx.strokeRect(14, 14, w - 28, h - 28);
        ctx.beginPath(); ctx.ellipse(w * 0.45, h * 0.4, 130, 165, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w * 0.36, h * 0.63); ctx.lineTo(w * 0.34, h * 0.86); ctx.moveTo(w * 0.58, h * 0.62); ctx.lineTo(w * 0.62, h * 0.86); ctx.stroke();
        ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.ellipse(w * 0.36, h * 0.4, 22, 14, 0, 0, Math.PI * 2); ctx.ellipse(w * 0.56, h * 0.4, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(w * 0.2, h * 0.27); ctx.lineTo(w * 0.72, h * 0.27); ctx.moveTo(w * 0.45, h * 0.16); ctx.lineTo(w * 0.45, h * 0.6); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = '#8a1a1a'; ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) { const y = h * (0.2 + i * 0.09); ctx.beginPath(); ctx.moveTo(w * 0.6, y); ctx.lineTo(w * 0.8, y - 14); ctx.lineTo(w * 0.93, y - 14); ctx.stroke(); }
        ctx.font = 'italic 700 34px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#3a2a1a'; ctx.fillText('Fig. 1  CAPUT', w / 2, h * 0.95);
      }) }));
      chart.castShadow = true; hang(chart, 3.7, 0.3);
      s.box([0.08, 0.1, 2.8], [wx + 0.03, 5.45, 0.3], wood); s.box([0.08, 0.1, 2.8], [wx + 0.03, 1.95, 0.3], wood);
    } else if (a.wall === 'blackboard') {
      const board = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.8), new THREE.MeshStandardMaterial({ roughness: 0.95, map: paint(768, 512, (ctx, w, h) => {
        ctx.fillStyle = '#26352c'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(255,255,255,${0.02 + random() * 0.04})`; ctx.fillRect(random() * w, random() * h, 80 + random() * 200, 14 + random() * 30); }
        ctx.strokeStyle = ctx.fillStyle = '#eef0e2'; ctx.lineWidth = 4; ctx.font = 'italic 44px Georgia, serif';
        ['E = Z · n', 'vita ≈ ∫ fulgur dt', '13 V  →  twitch', 'again!!'].forEach((line, i) => ctx.fillText(line, 30 + (i % 2) * 20, 70 + i * 74));
        ctx.beginPath(); ctx.ellipse(w * 0.76, h * 0.42, 80, 105, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w * 0.62, h * 0.3); ctx.lineTo(w * 0.9, h * 0.3); ctx.moveTo(w * 0.62, h * 0.62); ctx.lineTo(w * 0.56, h * 0.62); ctx.moveTo(w * 0.9, h * 0.62); ctx.lineTo(w * 0.96, h * 0.62); ctx.stroke();
        ctx.strokeStyle = '#ffe36a'; ctx.beginPath(); ctx.moveTo(w * 0.78, h * 0.02); ctx.lineTo(w * 0.72, h * 0.14); ctx.lineTo(w * 0.8, h * 0.14); ctx.lineTo(w * 0.74, h * 0.26); ctx.stroke();
      }) }));
      board.castShadow = true; hang(board, 3.7, 0.2);
      for (const y of [2.25, 5.15]) s.box([0.1, 0.12, 4.4], [wx + 0.04, y, 0.2], wood);
      s.box([0.22, 0.05, 4.2], [wx + 0.12, 2.22, 0.2], wood);
    } else if (a.wall === 'portrait') {
      const oval = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ roughness: 0.8, map: paint(384, 512, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h * 0.4, 20, w / 2, h / 2, h * 0.6); g.addColorStop(0, '#6a5a3a'); g.addColorStop(1, '#1e1a14'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#17130f'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.98, 150, 150, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d2bf98'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.42, 62, 82, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e9e4d6'; ctx.beginPath(); ctx.moveTo(w / 2 - 40, h * 0.6); ctx.lineTo(w / 2 + 40, h * 0.6); ctx.lineTo(w / 2, h * 0.76); ctx.fill();
        ctx.fillStyle = '#17130f'; ctx.fillRect(w / 2 - 40, h * 0.37, 28, 7); ctx.fillRect(w / 2 + 12, h * 0.37, 28, 7); ctx.fillRect(w / 2 - 22, h * 0.52, 44, 5);
        ctx.fillStyle = '#b9b3a6'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.3, 70, 40, 0, Math.PI, 0); ctx.fill();
      }) }));
      oval.scale.set(1.15, 1.5, 1); oval.castShadow = true; hang(oval, 3.9, 0.2);
      const gilt = s.mesh(new THREE.TorusGeometry(1, 0.12, 8, 40), s.material('#c9a23a', { metalness: 0.8, roughness: 0.35 }), [wx + 0.03, 3.9, 0.2]); gilt.rotation.y = Math.PI / 2; gilt.scale.set(1.15, 1.5, 1);
    } else {
      s.box([0.12, 3.0, 3.6], [wx + 0.06, 3.7, 0.2], s.material('#3c4046', { roughness: 0.5 }));
      for (let i = 0; i < 3; i++) {
        const z = -0.9 + i * 1.1, on = random() < mix(0.3, 0.8, mood.energy);
        s.box([0.1, 0.9, 0.3], [wx + 0.16, 3.2, z], flat('#e9e4d6', { roughness: 0.3 }));
        s.rod([wx + 0.2, 2.85, z], on ? [wx + 0.22, 3.55, z] : [wx + 0.75, 3.35, z], 0.04, metal); s.ball([0.09, 0.09, 0.09], on ? [wx + 0.24, 3.6, z] : [wx + 0.8, 3.38, z], s.material('#17171b'), 10);
        const dial = s.cylinder(0.36, 0.36, 0.06, [wx + 0.14, 4.55, z], flat('#efe9d6', { roughness: 0.4 }), 20); dial.rotation.z = Math.PI / 2;
        const needle = s.box([0.02, 0.3, 0.03], [wx + 0.19, 4.6, z], flat('#a01818')); needle.rotation.x = (random() - 0.5) * 1.6;
        s.ball([0.07, 0.07, 0.07], [wx + 0.16, 2.5, z], glow(on ? '#ff3a2a' : '#5a1c18', on ? 1.2 : 0.2), 10);
      }
    }
    // A brass plate over the window names the place.
    const sign = labelPlane([{ georgian: 'CABINET OF ANATOMY', victorian: 'GALVANIC STUDIES', film: 'LABORATORY 2', atomic: 'DANGER · SPECIMENS' }[a.era]], 3.6, 0.42, { hand: 'caps', random, wear: mood.wear * 0.6, paper: a.era === 'atomic' ? '#ffd84a' : '#c9a44a', ink: '#2b2110' });
    sign.position.set(winX, top + 0.55, back + 0.03); s.root.add(sign);

    // Rafter and hanging lamp over the hero.
    const lampZ = 0.9, lampY = 4.75;
    s.rod([0, wallH - 0.42, back], [0, wallH - 0.42, lampZ + 0.15], 0.045, flat('#1c1c1e', { metalness: 0.6 }));
    s.rod([0, wallH - 1.5, back], [0, wallH - 0.45, back + 1.6], 0.035, flat('#1c1c1e', { metalness: 0.6 }));
    const lamp = new THREE.Group(); lamp.position.set(0, wallH - 0.45, lampZ); s.root.add(lamp);
    const part = (mesh: THREE.Mesh, y: number, shadow = true) => { mesh.position.y = y; mesh.castShadow = shadow; lamp.add(mesh); return mesh; };
    const drop = wallH - 0.45 - lampY;
    const bulb = new THREE.MeshBasicMaterial({ color: era.lamp });
    part(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, drop, 5), flat('#1c1c1e')), -drop / 2);
    if (a.era === 'atomic') {
      part(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.34), flat('#dfe6da')), -drop);
      part(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 10), bulb), -drop - 0.12, false).rotation.z = Math.PI / 2;
    } else if (a.era === 'georgian') {
      part(new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.3, 4), metal), -drop + 0.1).rotation.y = Math.PI / 4;
      part(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.5, 0.44), glass('#fff2c0', 0.28)), -drop - 0.3, false);
      part(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), metal), -drop - 0.56);
      part(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8), flat('#efe6c8')), -drop - 0.44);
      part(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 8), bulb), -drop - 0.25, false);
    } else {
      const shade = part(new THREE.Mesh(new THREE.ConeGeometry(a.era === 'film' ? 0.85 : 0.6, a.era === 'film' ? 0.32 : 0.5, 24, 1, true), a.era === 'film' ? flat('#2a2c30', { side: THREE.DoubleSide, metalness: 0.5 }) : new THREE.MeshStandardMaterial({ color: '#2f7a4a', emissive: '#1f5a34', emissiveIntensity: 0.5, roughness: 0.3, side: THREE.DoubleSide })), -drop);
      void shade;
      part(new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), bulb), -drop - 0.12, false);
    }
    const pool = part(new THREE.Mesh(new THREE.ConeGeometry(2.3, lampY - 0.4, 28, 1, true), new THREE.MeshBasicMaterial({ color: era.lamp, transparent: true, opacity: 0.085, depthWrite: false, side: THREE.DoubleSide })), -drop - 0.2 - (lampY - 0.4) / 2, false);
    void pool;
    const lampLight = new THREE.PointLight(era.lamp, 34, 16, 1.6);
    lampLight.position.set(0, lampY - 0.3, lampZ);
    s.root.add(lampLight);

    // Bubbles.
    const beads = bubbleHomes.flatMap((home) => Array.from({ length: 12 }, () => ({ home, angle: random() * Math.PI * 2, radius: Math.sqrt(random()) * home.r, phase: random(), size: 0.03 + random() * 0.04, speed: 0.5 + random() })));
    const beadMesh = beads.length ? new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, depthWrite: false }), beads.length) : null;
    if (beadMesh) s.root.add(beadMesh);
    const m = new THREE.Matrix4();
    const placeBeads = (time: number) => {
      if (!beadMesh) return;
      beads.forEach((bead, i) => { const t = (bead.phase + time * bead.speed * mix(0.15, 0.7, mood.energy)) % 1; m.makeScale(bead.size, bead.size, bead.size).setPosition(bead.home.x + Math.sin(bead.angle) * bead.radius, bead.home.y + t * bead.home.h, bead.home.z + Math.cos(bead.angle) * bead.radius); beadMesh.setMatrixAt(i, m); });
      beadMesh.instanceMatrix.needsUpdate = true;
    };
    placeBeads(0);

    const energy = mix(0.25, 1, mood.energy);
    const key = world.keyLight!, keyBase = a.storm ? 2.1 : 2.6;
    key.intensity = keyBase;
    world.update = (dt, time) => {
      placeBeads(time);
      arcs.forEach((arc, i) => { arc.visible = Math.sin(time * 29 + i * 2.4) * Math.sin(time * 6.1 + i) > 0.25 - energy * 0.4; });
      if (ladder) { const t = (time * mix(0.25, 0.9, mood.energy)) % 1; const y = mix(ladder.base, ladder.top, t); ladder.arc.position.y = y; ladder.arc.scale.set(0.3 + ((y - 0.5) / 2.9) * 1.0, 1 + Math.sin(time * 40) * 0.6, 1); }
      if (wheel) wheel.rotation.z -= dt * mix(0.4, 5, mood.energy);
      lamp.rotation.z = Math.sin(time * 0.7) * 0.025 * energy * (a.storm ? 2 : 1);
      lampLight.intensity = 34 * (1 + Math.sin(time * 13) * 0.04 * energy);
      if (a.storm) {
        const flash = Math.pow(Math.max(0, Math.sin(time * 0.8)), 60) + Math.pow(Math.max(0, Math.sin(time * 0.8 + 0.2)), 90) * 0.7;
        paneMaterial.color.setScalar(0.9 + flash * 1.4); key.intensity = keyBase + flash * 3;
      }
    };
    return world;
  },
});
