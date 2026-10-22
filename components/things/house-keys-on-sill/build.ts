import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;

export default defineThing({
  questions: {
    place: choice('Where have they been left?', {
      sill: 'On a white gloss windowsill under the bottom rail of a sash window.',
      shelf: 'On a little wooden hall shelf with coat hooks under it.',
      mantel: 'On the corner of a marble mantelpiece.',
    }),
    fob: choice('What is the fob on the key ring?', {
      leather: 'A leather tab worn pale and soft at the edges.',
      brass: 'A brass disc stamped with the house number.',
      heart: 'A red felt heart a child made at school.',
      souvenir: 'An enamel seaside souvenir with a lighthouse on it.',
      photo: 'A scratched plastic photo keyring with a tiny family picture.',
      tag: "An estate agent's paper tag on string with the address on it.",
    }),
    keys: score('How many keys are on the ring?', ['A single front-door key', 'Front, back and a window key', "A jailer's bunch: every lock the house ever had"]),
    noteFor: choice('What is written on the outside of the note?', {
      owners: 'To the new owners',
      mum: 'Mum',
      whoever: 'For whoever lives here next',
      agent: 'Both sets. Meter is under the stairs.',
      sorry: 'Sorry',
      thanks: 'Thank you, house',
    }),
    note: choice('How has the note been left?', {
      tent: 'Folded in half and stood up like a place card.',
      flat: 'Folded small and tucked under the keys.',
      envelope: 'In a sealed envelope propped upright.',
      page: 'A torn-out notepad page lying open, covered in handwriting.',
    }),
    also: choice('What else is on it?', {
      nothing: 'Nothing else at all.',
      plant: 'A small geranium in a pot, left as a present.',
      ring: 'A clean ring in the dust where a plant pot stood for years.',
      flies: 'Two dead flies and a drawing pin.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const canvas = (w: number, h: number, draw: (c: Ctx, w: number, h: number) => void) => {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!, w, h);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
    };
    const part = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
    const SW = 0.39, SD = 0.17, wallH = 0.1;
    let top = wallH + 0.03, backZ = -SD / 2;
    const dustAlpha = 0.1 + mood.wear * 0.4;
    const surface = (base: string, veins: boolean) => canvas(512, 200, (c, w, h) => {
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      if (veins) { for (let i = 0; i < 16; i++) { c.strokeStyle = `rgba(90,90,100,${0.12 + random() * 0.2})`; c.lineWidth = 1 + random() * 2; c.beginPath(); let x = random() * w, y = 0; c.moveTo(x, y); while (y < h) { x += (random() - 0.5) * 60; y += 20 + random() * 30; c.lineTo(x, y); } c.stroke(); } }
      else if (a.place === 'shelf') { for (let i = 0; i < 50; i++) { c.strokeStyle = `rgba(50,25,8,${0.08 + random() * 0.12})`; c.lineWidth = 1 + random() * 2; const y = random() * h; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + (random() - 0.5) * 16, w * 0.6, y + (random() - 0.5) * 16, w, y + (random() - 0.5) * 8); c.stroke(); } }
      else { for (let i = 0; i < 5 + mood.wear * 14; i++) { c.fillStyle = 'rgba(150,130,95,0.5)'; c.beginPath(); c.ellipse(random() * w, random() * h, 2 + random() * 9, 1 + random() * 4, random() * 3, 0, 7); c.fill(); } }
      for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(120,112,98,${dustAlpha * random()})`; c.fillRect(random() * w, random() * h, 1.6, 1.6); }
      c.fillStyle = `rgba(140,130,112,${dustAlpha * 0.35})`; c.fillRect(0, 0, w, h);
      if (a.also === 'ring') { const cx = w * 0.14, cy = h * 0.42; c.strokeStyle = `rgba(95,85,70,${0.45 + mood.wear * 0.3})`; c.lineWidth = 5; c.beginPath(); c.arc(cx, cy, 44, 0, 7); c.stroke(); c.fillStyle = base; c.globalAlpha = 0.85; c.beginPath(); c.arc(cx, cy, 41, 0, 7); c.fill(); c.globalAlpha = 1; }
    });
    const wallMat = (tint: string) => new THREE.MeshStandardMaterial({ map: canvas(256, 256, (c, w, h) => { c.fillStyle = tint; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(x, 0, 14, h); } c.fillStyle = `rgba(120,95,50,${mood.wear * 0.2})`; c.fillRect(0, 0, w, h); }), roughness: 0.95 });
    const paperWall = wallMat(mood.warmth > 0.5 ? '#d9c79c' : '#bfcbc2');

    if (a.place === 'sill') {
      const gloss = new THREE.MeshStandardMaterial({ map: surface('#f1eee4', false), roughness: 0.35 }), paint = s.material('#efece2', { roughness: 0.4 });
      s.box([SW, wallH, 0.06], [0, wallH / 2, -0.02], paperWall);
      s.box([SW + 0.02, 0.022, 0.016], [0, wallH - 0.011, 0.018], paint);
      const board = new THREE.Mesh(new THREE.BoxGeometry(SW + 0.03, 0.03, SD), [paint, paint, gloss, paint, paint, paint]); board.position.set(0, wallH + 0.015, 0.0); board.castShadow = board.receiveShadow = true; s.root.add(board);
      s.cylinder(0.015, 0.015, SW + 0.03, [0, wallH + 0.015, SD / 2], paint, 14).rotation.z = Math.PI / 2;
      s.box([SW + 0.03, 0.06, 0.04], [0, top + 0.03, backZ + 0.02], paint);
      for (const x of [-SW / 2 - 0.0, SW / 2 + 0.0]) s.box([0.03, 0.26, 0.04], [x, top + 0.13, backZ + 0.02], paint);
      s.box([0.022, 0.2, 0.03], [0.02, top + 0.16, backZ + 0.02], paint);
      const sky = new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.5, mix(0.72, 0.84, mood.cheer));
      const glass = s.mesh(new THREE.PlaneGeometry(SW, 0.2), new THREE.MeshStandardMaterial({ color: sky, emissive: sky, emissiveIntensity: 0.25, transparent: true, opacity: 0.5, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }), [0, top + 0.16, backZ + 0.02]);
      glass.castShadow = false;
      s.box([0.03, 0.012, 0.02], [0.02, top + 0.066, backZ + 0.045], s.material('#c9a23f', { metalness: 0.8, roughness: 0.3 }));
    } else if (a.place === 'shelf') {
      const wood = new THREE.MeshStandardMaterial({ map: surface('#a8713c', false), roughness: 0.5 }), plain = s.material('#8a5a2e', { roughness: 0.5 }), brass = s.material('#c9a23f', { metalness: 0.85, roughness: 0.3 });
      top = 0.2; backZ = -SD / 2 + 0.02;
      s.box([SW, 0.42, 0.03], [0, 0.21, -SD / 2], paperWall);
      const board = new THREE.Mesh(new THREE.BoxGeometry(SW - 0.04, 0.02, SD - 0.02), [plain, plain, wood, plain, plain, plain]); board.position.set(0, top - 0.01, 0.005); board.castShadow = board.receiveShadow = true; s.root.add(board);
      s.box([SW - 0.08, 0.05, 0.014], [0, top - 0.06, -SD / 2 + 0.022], plain);
      for (const x of [-0.15, 0.15]) { const br = new THREE.Shape(); br.moveTo(0, 0); br.lineTo(0.1, 0); br.quadraticCurveTo(0.02, -0.02, 0, -0.1); const m = s.mesh(new THREE.ExtrudeGeometry(br, { depth: 0.014, bevelEnabled: false }), plain, [x + 0.007, top - 0.02, -SD / 2 + 0.015]); m.rotation.y = -Math.PI / 2; }
      for (const x of [-0.09, 0, 0.09]) { s.tube([[x, top - 0.06, -SD / 2 + 0.03], [x, top - 0.085, -SD / 2 + 0.06], [x, top - 0.06, -SD / 2 + 0.075]], 0.004, brass); s.ball([0.007, 0.007, 0.007], [x, top - 0.058, -SD / 2 + 0.076], brass, 8); }
    } else {
      const marble = new THREE.MeshStandardMaterial({ map: surface('#e9e7e2', true), roughness: 0.25 }), stone = s.material('#dedbd4', { roughness: 0.3 });
      top = 0.17; backZ = -SD / 2 + 0.02;
      s.box([SW, 0.4, 0.03], [0, 0.2, -SD / 2], wallMat(mood.warmth > 0.5 ? '#cdb893' : '#b9c2c4'));
      const slab = new THREE.Mesh(new THREE.BoxGeometry(SW + 0.02, 0.03, SD), [stone, stone, marble, stone, stone, stone]); slab.position.set(0, top - 0.015, 0.01); slab.castShadow = slab.receiveShadow = true; s.root.add(slab);
      s.box([SW, 0.025, SD - 0.03], [-0.01, top - 0.042, 0.0], stone); s.box([SW - 0.02, 0.03, SD - 0.06], [-0.02, top - 0.07, -0.01], stone);
      s.box([SW - 0.06, top - 0.085, SD - 0.09], [-0.03, (top - 0.085) / 2, -0.02], stone);
      s.box([0.07, top - 0.09, 0.02], [SW / 2 - 0.1, (top - 0.09) / 2, SD / 2 - 0.085], s.material('#cfccc4', { roughness: 0.3 }));
    }

    // A patch of window light crossing the surface.
    const light = new THREE.Shape(); const skew = mix(-0.09, 0.09, mood.daylight);
    light.moveTo(-0.11 + skew, -SD * 0.42); light.lineTo(0.07 + skew, -SD * 0.42); light.lineTo(0.07 - skew, SD * 0.42); light.lineTo(-0.11 - skew, SD * 0.42);
    const patch = s.mesh(new THREE.ShapeGeometry(light), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(mix(0.15, 0.08, mood.warmth), 0.9, 0.8), transparent: true, opacity: mix(0.12, 0.3, mood.cheer), depthWrite: false }), [0.05, top + 0.0015, 0.005]);
    patch.rotation.x = Math.PI / 2; patch.castShadow = false;

    // --- keys
    const K = 1.6;
    const brass = s.material('#c9a23f', { metalness: 0.85, roughness: 0.32 }), steel = s.material('#b9bdc0', { metalness: 0.9, roughness: 0.3 }), oldIron = s.material('#5a534c', { metalness: 0.7, roughness: 0.6 });
    const yale = () => {
      const sh = new THREE.Shape();
      sh.absarc(0, 0, 0.0115, 0.38, Math.PI * 2 - 0.38, false);
      sh.lineTo(0.042, -0.0042); sh.lineTo(0.046, 0);
      const teeth = 7; for (let i = 0; i <= teeth; i++) { const x = 0.044 - (i / teeth) * 0.026; sh.lineTo(x, 0.0018 + random() * 0.003); sh.lineTo(x - 0.0018, 0.0042); }
      sh.lineTo(0.0107, 0.0042);
      const hole = new THREE.Path(); hole.absarc(-0.004, 0, 0.003, 0, Math.PI * 2, true); sh.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.002, bevelEnabled: false, curveSegments: 10 }); g.translate(0.004, 0, -0.001); g.rotateX(-Math.PI / 2); return g;
    };
    const mortice = (parent: THREE.Object3D, mat: THREE.Material) => {
      const bow = part(parent, new THREE.TorusGeometry(0.0085, 0.002, 6, 18), mat, 0.0085, 0, 0); bow.rotation.x = Math.PI / 2;
      part(parent, new THREE.CylinderGeometry(0.0024, 0.0024, 0.052, 8), mat, 0.043, 0, 0).rotation.z = Math.PI / 2;
      part(parent, new THREE.CylinderGeometry(0.0034, 0.0034, 0.004, 8), mat, 0.02, 0, 0).rotation.z = Math.PI / 2;
      part(parent, new THREE.BoxGeometry(0.011, 0.0028, 0.011), mat, 0.0625, 0, 0.0065); part(parent, new THREE.BoxGeometry(0.003, 0.003, 0.005), s.material('#2a2622'), 0.0625, 0, 0.0095);
    };
    const bunch = new THREE.Group(); bunch.scale.setScalar(K); bunch.position.set(0.07 + (random() - 0.5) * 0.02, top + 0.001, 0.02 + (random() - 0.5) * 0.015); bunch.rotation.y = (random() - 0.5) * 0.4; s.root.add(bunch);
    const ringR = 0.014;
    const ring = part(bunch, new THREE.TorusGeometry(ringR, 0.0011, 6, 28), steel, 0, 0.004, 0); ring.rotation.set(Math.PI / 2 + 0.12, 0, 0);
    const count = 1 + Math.round(Math.min(1, a.keys * 0.85 + mood.density * 0.15) * 6);
    const spread = Math.min(2.6, 0.5 + count * 0.36), start = -1.0 - spread / 2;
    for (let i = 0; i < count; i++) {
      const phi = start + (count === 1 ? spread / 2 : (i / (count - 1)) * spread) + (random() - 0.5) * 0.15;
      const g = new THREE.Group(); g.position.set(Math.cos(phi) * ringR, 0.0012 + i * 0.0021, Math.sin(phi) * ringR); g.rotation.set((random() - 0.5) * 0.06, -phi + (random() - 0.5) * 0.25, 0); bunch.add(g);
      const kind = i === 0 ? 'yale' : i === 1 ? 'mortice' : random() < 0.55 ? 'yale' : random() < 0.6 ? 'mortice' : 'small';
      if (kind === 'yale') {
        const k = part(g, yale(), i % 3 === 2 ? steel : brass);
        if (i === 0 && mood.cheer > 0.45) { const cap = part(g, new THREE.CylinderGeometry(0.0125, 0.0125, 0.0036, 20), s.material(['#c9302b', '#2f6fb0', '#3aa655', '#e0b22a'][Math.floor(random() * 4)], { roughness: 0.5 }), 0.004, 0.001, 0); cap.scale.x = 1; k.position.y = 0; }
      } else if (kind === 'mortice') mortice(g, i % 2 ? oldIron : brass);
      else { const k = part(g, yale(), steel); k.scale.set(0.62, 1, 0.62); }
    }
    // fob, on the other side of the ring
    const fphi = start + spread + 1.3 + random() * 0.5;
    const fob = new THREE.Group(); fob.position.set(Math.cos(fphi) * ringR, 0.001, Math.sin(fphi) * ringR); fob.rotation.y = -fphi + (random() - 0.5) * 0.3; bunch.add(fob);
    const link = part(fob, new THREE.TorusGeometry(0.004, 0.0009, 5, 12), steel, 0.004, 0.002, 0); link.rotation.x = Math.PI / 2;
    const flatTop = (w: number, d: number, draw: (c: Ctx, w: number, h: number) => void, x: number, y: number) => { const m = part(fob, new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: canvas(160, Math.round(160 * d / w), draw), roughness: 0.6 }), x, y, 0); m.rotation.x = -Math.PI / 2; m.castShadow = false; return m; };
    if (a.fob === 'leather') {
      const sh = new THREE.Shape(); sh.moveTo(0.008, -0.006); sh.lineTo(0.018, -0.014); sh.lineTo(0.058, -0.014); sh.quadraticCurveTo(0.066, 0, 0.058, 0.014); sh.lineTo(0.018, 0.014); sh.lineTo(0.008, 0.006);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
      part(fob, g, s.material('#7a4a26', { roughness: 0.8 }), 0, 0, 0);
      flatTop(0.044, 0.024, (c, w, h) => { c.fillStyle = '#7a4a26'; c.fillRect(0, 0, w, h); const gr = c.createRadialGradient(w * 0.55, h / 2, 4, w * 0.55, h / 2, w * 0.5); gr.addColorStop(0, `rgba(215,175,125,${0.45 + mood.wear * 0.4})`); gr.addColorStop(1, 'rgba(215,175,125,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.strokeStyle = '#e2cfa0'; c.setLineDash([6, 5]); c.lineWidth = 2; c.strokeRect(6, 6, w - 12, h - 12); }, 0.039, 0.0043);
    } else if (a.fob === 'brass') {
      part(fob, new THREE.CylinderGeometry(0.02, 0.02, 0.0025, 28), brass, 0.03, 0.0013, 0);
      const m = part(fob, new THREE.CircleGeometry(0.018, 28), new THREE.MeshStandardMaterial({ map: canvas(128, 128, (c, w, h) => { c.fillStyle = '#c9a23f'; c.fillRect(0, 0, w, h); c.strokeStyle = '#7a5a1a'; c.lineWidth = 4; c.beginPath(); c.arc(w / 2, h / 2, w * 0.42, 0, 7); c.stroke(); c.fillStyle = '#5a4212'; c.font = `bold ${h * 0.5}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(3 + Math.floor(random() * 60)), w / 2, h * 0.54); }), metalness: 0.6, roughness: 0.4 }), 0.03, 0.0028, 0); m.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); m.castShadow = false;
    } else if (a.fob === 'heart') {
      const sh = new THREE.Shape(); sh.moveTo(0, -0.016); sh.bezierCurveTo(-0.03, 0.002, -0.014, 0.024, 0, 0.01); sh.bezierCurveTo(0.014, 0.024, 0.03, 0.002, 0, -0.016);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 2);
      part(fob, g, s.material('#c9302b', { roughness: 1 }), 0.03, 0.002, 0);
      for (let i = 0; i < 9; i++) { const ang = i / 9 * 6.283; part(fob, new THREE.BoxGeometry(0.004, 0.001, 0.0012), s.material('#f1eee4'), 0.03 + Math.cos(ang) * 0.011, 0.0105, Math.sin(ang) * 0.011).rotation.y = -ang + 1.57; }
    } else if (a.fob === 'souvenir' || a.fob === 'photo') {
      part(fob, new THREE.BoxGeometry(0.046, 0.004, 0.032), a.fob === 'photo' ? new THREE.MeshStandardMaterial({ color: '#e6eef0', roughness: 0.15 }) : s.material('#1f3f7a', { roughness: 0.25 }), 0.033, 0.002, 0);
      flatTop(0.04, 0.026, a.fob === 'souvenir' ? (c, w, h) => { c.fillStyle = '#8fc4de'; c.fillRect(0, 0, w, h); c.fillStyle = '#2f6fa8'; c.fillRect(0, h * 0.62, w, h * 0.38); c.fillStyle = '#f6f3ea'; c.fillRect(w * 0.44, h * 0.18, w * 0.1, h * 0.5); c.fillStyle = '#c9302b'; c.fillRect(w * 0.44, h * 0.3, w * 0.1, h * 0.1); c.fillRect(w * 0.44, h * 0.48, w * 0.1, h * 0.1); c.fillStyle = '#f2d21f'; c.beginPath(); c.arc(w * 0.8, h * 0.25, h * 0.12, 0, 7); c.fill(); }
        : (c, w, h) => { c.fillStyle = '#c9b48a'; c.fillRect(0, 0, w, h); c.fillStyle = '#5a4630'; for (const [x, r] of [[0.25, 0.16], [0.45, 0.2], [0.64, 0.19], [0.8, 0.12]] as const) { c.beginPath(); c.arc(w * x, h * (0.62 - r), h * r * 0.7, 0, 7); c.fill(); c.beginPath(); c.ellipse(w * x, h, h * r, h * (0.2 + r), 0, 0, 7); c.fill(); } c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1; for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(random() * w, random() * h); c.lineTo(random() * w, random() * h); c.stroke(); } }, 0.033, 0.0042).rotation.z = Math.PI;
    } else {
      const sh = new THREE.Shape(); sh.moveTo(0.012, -0.004); sh.lineTo(0.02, -0.013); sh.lineTo(0.07, -0.013); sh.lineTo(0.07, 0.013); sh.lineTo(0.02, 0.013); sh.lineTo(0.012, 0.004);
      const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
      part(fob, g, new THREE.MeshStandardMaterial({ color: '#d9c08a', roughness: 0.9, side: THREE.DoubleSide }), 0, 0.0012, 0);
      flatTop(0.046, 0.022, (c, w, h) => { c.fillStyle = '#d9c08a'; c.fillRect(0, 0, w, h); c.fillStyle = '#27306a'; c.font = `italic bold ${h * 0.42}px "Comic Sans MS", cursive, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`No. ${3 + Math.floor(random() * 60)}`, w / 2, h * 0.36); c.font = `italic ${h * 0.26}px "Comic Sans MS", cursive, sans-serif`; c.fillText('Elm Road', w / 2, h * 0.76); }, 0.046, 0.0016).rotation.z = Math.PI;
      part(fob, new THREE.TorusGeometry(0.006, 0.0006, 4, 14), s.material('#e6dcc0'), 0.006, 0.0015, 0).rotation.x = Math.PI / 2;
    }

    // --- the note
    const words = { owners: 'To the new owners', mum: 'Mum', whoever: 'For whoever lives here next', agent: 'Both sets. Meter under stairs', sorry: 'Sorry', thanks: 'Thank you, house' }[a.noteFor];
    const paperCol = mood.wear > 0.6 ? '#efe6cc' : '#fbf8ee';
    const written = (lined: boolean, extra: boolean) => (c: Ctx, w: number, h: number) => {
      c.fillStyle = paperCol; c.fillRect(0, 0, w, h);
      if (lined) { c.strokeStyle = 'rgba(110,150,200,0.55)'; c.lineWidth = 1.5; for (let y = h * 0.16; y < h; y += h * 0.085) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } c.strokeStyle = 'rgba(210,90,90,0.6)'; c.beginPath(); c.moveTo(w * 0.1, 0); c.lineTo(w * 0.1, h); c.stroke(); }
      c.fillStyle = '#1f2a6a'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const parts = words.length > 14 ? [words.slice(0, words.lastIndexOf(' ', Math.ceil(words.length * 0.62))), words.slice(words.lastIndexOf(' ', Math.ceil(words.length * 0.62)) + 1)] : [words];
      const size = Math.min(h * (extra ? 0.12 : 0.3), (w * 1.7) / Math.max(...parts.map((p) => p.length)));
      c.font = `italic bold ${size}px "Comic Sans MS", "Segoe Print", cursive, sans-serif`;
      c.save(); c.translate(w / 2, extra ? h * 0.12 : h / 2 - (parts.length - 1) * size * 0.6); c.rotate(-0.03);
      parts.forEach((p, i) => c.fillText(p, 0, i * size * 1.2, w * 0.92));
      if (!extra && parts.length === 1) { c.strokeStyle = '#1f2a6a'; c.lineWidth = Math.max(2, size * 0.07); c.beginPath(); c.moveTo(-c.measureText(words).width * 0.5, size * 0.7); c.lineTo(c.measureText(words).width * 0.5, size * 0.62); c.stroke(); }
      c.restore();
      if (extra) { c.strokeStyle = '#1f2a6a'; c.lineWidth = 2; for (let y = h * 0.33; y < h * 0.86; y += h * 0.085) { c.beginPath(); let x = w * 0.14; c.moveTo(x, y); const end = w * (0.55 + random() * 0.38); while (x < end) { x += 5 + random() * 7; c.lineTo(x, y - 6 + random() * 8); } c.stroke(); } }
    };
    const paper = (w: number, h: number, lined: boolean, extra: boolean) => new THREE.MeshStandardMaterial({ map: canvas(360, Math.round(360 * h / w), written(lined, extra)), roughness: 0.9, side: THREE.DoubleSide });
    const blank = new THREE.MeshStandardMaterial({ color: paperCol, roughness: 0.9, side: THREE.DoubleSide });
    const nx = -0.085 + (random() - 0.5) * 0.02, nz = 0.035, turn = 0.15 + (random() - 0.5) * 0.4;
    const note = new THREE.Group(); note.position.set(nx, top + 0.001, nz); note.rotation.y = turn; s.root.add(note);
    if (a.note === 'tent') {
      const w = 0.15, h = 0.085, ang = 0.42;
      const f = part(note, new THREE.PlaneGeometry(w, h), paper(w, h, false, false), 0, h / 2 * Math.cos(ang), h / 2 * Math.sin(ang)); f.rotation.x = -ang;
      const b = part(note, new THREE.PlaneGeometry(w, h), blank, 0, h / 2 * Math.cos(ang), -h / 2 * Math.sin(ang)); b.rotation.x = ang;
    } else if (a.note === 'flat') {
      const w = 0.13, h = 0.075;
      note.position.set(0.045, top + 0.0006, 0.03); note.rotation.y = -0.25 + (random() - 0.5) * 0.3;
      const f = part(note, new THREE.PlaneGeometry(w, h), paper(w, h, false, false), 0, 0.0016, 0); f.rotation.x = -Math.PI / 2; f.castShadow = false;
      const u = part(note, new THREE.PlaneGeometry(w, h), blank, 0.004, 0.0004, -0.004); u.rotation.set(-Math.PI / 2, 0, 0.05); u.castShadow = false;
    } else if (a.note === 'envelope') {
      const w = 0.16, h = 0.11, ang = 0.3;
      note.position.set(nx, top + 0.001, backZ + 0.045 + h * Math.sin(ang)); note.rotation.y = (random() - 0.5) * 0.15;
      const f = part(note, new THREE.BoxGeometry(w, h, 0.003), [blank, blank, blank, blank, paper(w, h, false, false), blank] as unknown as THREE.Material, 0, h / 2 * Math.cos(ang), -h / 2 * Math.sin(ang)); f.rotation.x = -ang;
    } else {
      const w = 0.13, h = 0.17;
      note.position.set(nx - 0.01, top + 0.001, 0.0); note.rotation.y = 0.2 + (random() - 0.5) * 0.3;
      const f = part(note, new THREE.PlaneGeometry(w, h, 6, 1), paper(w, h, true, true), 0, 0.002, 0); f.rotation.x = -Math.PI / 2; f.castShadow = false;
      const pos = f.geometry.attributes.position; for (let i = 0; i < pos.count; i++) pos.setZ(i, 0.004 * Math.sin(pos.getX(i) * 40) + 0.003);
      f.geometry.computeVertexNormals();
      part(note, new THREE.CylinderGeometry(0.004, 0.004, 0.14, 8), s.material('#2f4f8a', { roughness: 0.4 }), 0.085, 0.004, 0.02).rotation.set(Math.PI / 2, 0, 0.3);
    }

    // --- what else
    if (a.also === 'plant') {
      const px = -SW / 2 + 0.05, pz = backZ + 0.055;
      s.lathe([[0.022, 0], [0.03, 0.045], [0.034, 0.05], [0.034, 0.058], [0.028, 0.058]], s.material('#b8623a', { roughness: 0.9 }), [px, top, pz]);
      s.cylinder(0.028, 0.028, 0.004, [px, top + 0.05, pz], s.material('#3a2a1c'), 14);
      const leaves: { at: [number, number, number]; size: number; color: string }[] = [], blooms: typeof leaves = [];
      for (let i = 0; i < 12; i++) { const ang = random() * 6.3, r = 0.01 + random() * 0.03, h = 0.07 + random() * 0.05; leaves.push({ at: [px + Math.cos(ang) * r, top + h, pz + Math.sin(ang) * r], size: 0.014 + random() * 0.008, color: random() < 0.5 ? '#4f7a3a' : '#5f8a45' }); }
      for (let i = 0; i < 4; i++) { const ang = random() * 6.3, r = random() * 0.02; s.rod([px, top + 0.06, pz], [px + Math.cos(ang) * r, top + 0.15, pz + Math.sin(ang) * r], 0.0015, s.material('#5f8a45')); for (let k = 0; k < 5; k++) blooms.push({ at: [px + Math.cos(ang) * r + (random() - 0.5) * 0.02, top + 0.15 + (random() - 0.5) * 0.012, pz + Math.sin(ang) * r + (random() - 0.5) * 0.02], size: 0.008, color: mood.cheer > 0.4 ? '#d8352c' : '#c97a8a' }); }
      s.scatter(new THREE.SphereGeometry(1, 8, 5).scale(1, 0.35, 1), s.material('#ffffff', { roughness: 0.9 }), leaves);
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.8 }), blooms);
    } else if (a.also === 'flies') {
      const dark = s.material('#1c1a18'), wing = new THREE.MeshStandardMaterial({ color: '#d9dde0', transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
      for (let i = 0; i < 2; i++) { const fx = -SW / 2 + 0.05 + random() * 0.06, fz = backZ + 0.06 + random() * 0.05; s.ball([0.005, 0.0035, 0.0035], [fx, top + 0.004, fz], dark, 8); for (const side of [-1, 1]) { const w = s.mesh(new THREE.CircleGeometry(0.005, 8), wing, [fx - 0.002, top + 0.006, fz + side * 0.004]); w.rotation.set(-Math.PI / 2 + side * 0.5, 0, 0); w.castShadow = false; } }
      s.cylinder(0.006, 0.006, 0.0012, [SW / 2 - 0.05, top + 0.001, 0.05], brass, 12); s.cylinder(0.0007, 0.0002, 0.01, [SW / 2 - 0.05, top + 0.006, 0.05], steel, 5);
    }
    return s.finish();
  },
});
