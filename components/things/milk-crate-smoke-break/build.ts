import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];

function canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    seat: choice('What is the seat?', {
      single: 'One upturned milk crate, nothing else.',
      pair: 'Two crates: one to sit on, one as a side table.',
      cushion: 'A crate with a flattened cardboard box on top as a cushion, sat on for years.',
      stack: 'Two crates stacked into a taller perch, for a bad back.',
    }),
    cigarette: choice('What is the state of the smoking?', {
      lit: 'A cigarette balanced on the rim of the tin, still burning: they were called back in.',
      cold: 'Only cold butts.',
      quit: 'The tin holds rainwater and a weed that has taken root: somebody quit.',
    }),
    butts: score('How full is the ashtray and the ground around it?', ['Clean', 'A few butts', 'A crowded tin', 'Overflowing, a drift of butts on the ground']),
    apron: choice('What has been taken off and left?', {
      white: 'A white bib apron folded neatly in thirds.',
      black: 'A black bistro apron wadded in a heap.',
      striped: "A butcher's blue-striped apron, folded.",
      jacket: "A chef's white jacket with its double row of buttons, laid over the crate.",
      none: 'Nothing: the apron stayed on.',
    }),
    left: choice('What else was left on the crate?', {
      phone: 'A phone lit up with missed calls.',
      paperback: 'A paperback splayed face down to keep the page.',
      scratch: 'A scratched lottery card and a coin.',
      lighter: 'Just a lighter and a crushed soft pack.',
      nothing: 'Nothing at all.',
    }),
    drink: choice('What are they drinking?', {
      none: 'Nothing.',
      coffee: 'A takeaway coffee cup.',
      energy: 'A tall energy drink can.',
      beer: 'A bottle of beer: the shift is over.',
      deli: 'Iced water in a plastic deli container, the cook’s cup.',
    }),
    backdrop: choice('What stands behind it?', {
      none: 'Nothing: just the crate and its things.',
      door: 'A steel back door in a brick wall, propped ajar with a brick, kitchen light leaking out.',
      pallet: 'A leaning wooden pallet, a grease drum and spare crates.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const j = (amount: number) => (random() - 0.5) * amount;
    const dark = s.material('#1d1e20', { roughness: 0.7 });
    const C = 0.33, CH = 0.28;
    const crateTints = ['#2f5fb0', '#c43a2c', '#2f8a4a', '#1f2224', '#e0a01e', '#6a3f8a'];
    const lattice = canvasTexture(128, 128, (ctx) => {
      ctx.clearRect(0, 0, 128, 128);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 9;
      for (let i = -4; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32 + 128, 128); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * 32 + 128, 0); ctx.lineTo(i * 32, 128); ctx.stroke(); }
    });
    const grid = canvasTexture(128, 128, (ctx) => {
      ctx.clearRect(0, 0, 128, 128);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(i * 21.3, 0); ctx.lineTo(i * 21.3, 128); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * 21.3); ctx.lineTo(128, i * 21.3); ctx.stroke(); }
    });
    const crate = (x: number, y: number, z: number, turn: number, tint: string) => {
      const g = new THREE.Group();
      g.position.set(x, y, z); g.rotation.y = turn;
      const solid = s.material(tint, { roughness: 0.55 });
      const web = new THREE.MeshStandardMaterial({ color: solid.color, map: lattice, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55 });
      const top = new THREE.MeshStandardMaterial({ color: solid.color, map: grid, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55 });
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: V3, rot: V3 = [0, 0, 0]) => { const m = new THREE.Mesh(geometry, material); m.position.set(...at); m.rotation.set(...rot); m.castShadow = m.receiveShadow = true; g.add(m); };
      const side = new THREE.PlaneGeometry(C - 0.02, CH - 0.07);
      for (let i = 0; i < 4; i++) add(side, web, [Math.sin(i * Math.PI / 2) * (C / 2 - 0.006), CH / 2, Math.cos(i * Math.PI / 2) * (C / 2 - 0.006)], [0, i * Math.PI / 2, 0]);
      add(new THREE.PlaneGeometry(C - 0.02, C - 0.02), top, [0, CH - 0.008, 0], [-Math.PI / 2, 0, 0]);
      const bar = 0.026;
      for (const yy of [bar / 2, CH - bar / 2, CH * 0.62]) for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(C, yy > 0.1 && yy < CH - 0.03 ? 0.018 : bar * (yy < 0.05 ? 1.6 : 1), 0.02), solid, [Math.sin(i * Math.PI / 2) * (C / 2 - 0.01), yy, Math.cos(i * Math.PI / 2) * (C / 2 - 0.01)], [0, i * Math.PI / 2, 0]);
      for (const cx of [-1, 1]) for (const cz of [-1, 1]) add(new THREE.BoxGeometry(0.03, CH, 0.03), solid, [cx * (C / 2 - 0.015), CH / 2, cz * (C / 2 - 0.015)]);
      s.root.add(g);
      return g;
    };
    const pick = () => crateTints[Math.floor(random() * crateTints.length)];
    const mainTint = pick();
    let seatY = CH;
    crate(0, 0, 0, j(0.5), mainTint);
    if (a.seat === 'stack') { crate(j(0.03), CH, j(0.03), j(0.4), pick()); seatY = CH * 2; }
    let tableX = 0, tableY = 0, tableZ = 0, hasTable = false;
    if (a.seat === 'pair') { tableX = 0.46; tableZ = 0.06 + j(0.1); tableY = CH; hasTable = true; crate(tableX, 0, tableZ, j(0.6), pick()); }
    if (a.seat === 'cushion') {
      const card = s.box([0.4, 0.022, 0.36], [j(0.02), seatY + 0.011, j(0.02)], s.material('#b08d5c', { roughness: 0.95 }));
      card.rotation.y = j(0.3);
      s.box([0.25, 0.004, 0.04], [0, seatY + 0.024, 0.05], s.material('#8f7146', { roughness: 1 })).rotation.y = card.rotation.y;
      seatY += 0.024;
    }

    // Apron or jacket on the seat.
    let clothTop = seatY;
    if (a.apron === 'white' || a.apron === 'striped') {
      const striped = a.apron === 'striped';
      const cloth = striped ? new THREE.MeshStandardMaterial({ roughness: 1, map: canvasTexture(64, 64, (ctx) => { ctx.fillStyle = '#f1efe6'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#2b4f9a'; for (let i = 0; i < 8; i++) ctx.fillRect(i * 8, 0, 3, 64); }) }) : s.material('#efeee8', { roughness: 1 });
      const turn = j(0.35);
      for (let i = 0; i < 3; i++) s.box([0.25 - i * 0.008, 0.016, 0.19 - i * 0.006], [-0.02 + j(0.008), seatY + 0.008 + i * 0.016, -0.03 + j(0.008)], cloth).rotation.y = turn;
      clothTop = seatY + 0.048;
      s.tube([[-0.12, clothTop, 0.02], [-0.19, seatY - 0.02, 0.06], [-0.2, seatY - 0.16, 0.1]], 0.005, cloth);
      if (mood.wear > 0.4) for (let i = 0; i < 3; i++) s.cylinder(0.015 + random() * 0.02, 0.015 + random() * 0.02, 0.002, [-0.02 + j(0.16), clothTop + 0.001, -0.03 + j(0.1)], s.material(['#8a5a2a', '#a8322a', '#6a6a3a'][i], { roughness: 1 }), 8).castShadow = false;
    } else if (a.apron === 'black') {
      const cloth = s.material('#25272b', { roughness: 1 });
      for (let i = 0; i < 6; i++) s.ball([0.07 + random() * 0.05, 0.025 + random() * 0.02, 0.06 + random() * 0.04], [-0.03 + j(0.14), seatY + 0.02 + random() * 0.025, -0.03 + j(0.12)], cloth, 8).rotation.y = random() * 3;
      clothTop = seatY + 0.06;
      s.tube([[0.05, seatY + 0.03, 0.08], [0.1, seatY, 0.17], [0.13, seatY - 0.2, 0.18], [0.1, seatY - 0.27, 0.22]], 0.005, cloth);
    } else if (a.apron === 'jacket') {
      const cloth = s.material('#f3f2ec', { roughness: 1 });
      s.box([0.36, 0.02, 0.34], [0, seatY + 0.01, 0], cloth).rotation.y = j(0.2);
      s.box([0.36, 0.26, 0.02], [0, seatY - 0.11, 0.175], cloth).rotation.x = 0.06;
      for (const side of [-1, 1]) { const sleeve = s.box([0.1, 0.34, 0.03], [side * 0.2, seatY - 0.14, 0.05], cloth); sleeve.rotation.z = side * 0.2; }
      for (let i = 0; i < 4; i++) for (const side of [-1, 1]) s.ball([0.012, 0.012, 0.008], [side * 0.045, seatY - 0.02 - i * 0.055, 0.19 + i * 0.003], cloth, 8);
      s.box([0.1, 0.012, 0.004], [0.1, seatY - 0.06, 0.19], s.material('#2b4f9a'));
      clothTop = seatY + 0.02;
    }

    // What was left on the crate.
    const surfaceAt = hasTable ? [tableX, tableY, tableZ] as V3 : [0.04, clothTop, 0.04] as V3;
    const [lx, ly, lz] = surfaceAt;
    if (a.left === 'phone') {
      const screen = canvasTexture(96, 192, (ctx) => {
        ctx.fillStyle = '#101826'; ctx.fillRect(0, 0, 96, 192);
        ctx.fillStyle = '#e9f1ff'; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center';
        ctx.fillText(`${1 + Math.floor(random() * 11)}:${10 + Math.floor(random() * 49)}`, 48, 40);
        for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 0 ? '#e0473a' : '#3d4a63'; ctx.fillRect(8, 62 + i * 40, 80, 30); ctx.fillStyle = '#ffffff'; ctx.fillRect(16, 72 + i * 40, 40 + random() * 20, 5); }
      });
      const turn = j(0.9);
      s.box([0.075, 0.009, 0.155], [lx, ly + 0.0045, lz], dark).rotation.y = turn;
      const face = s.mesh(new THREE.PlaneGeometry(0.068, 0.146), new THREE.MeshStandardMaterial({ map: screen, emissive: '#ffffff', emissiveMap: screen, emissiveIntensity: 0.9, roughness: 0.2 }), [lx, ly + 0.0096, lz]);
      face.rotation.set(-Math.PI / 2, 0, turn);
      face.castShadow = false;
    } else if (a.left === 'paperback') {
      const cover = s.material(['#c8452f', '#2f6f8a', '#e0a01e', '#5a3f7a', '#2f8a4a'][Math.floor(random() * 5)], { roughness: 0.8 });
      const book = new THREE.Group();
      for (const side of [-1, 1]) {
        const pages = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.014, 0.17), s.material('#f1ead6', { roughness: 1 }));
        const lid = new THREE.Mesh(new THREE.BoxGeometry(0.108, 0.003, 0.174), cover);
        pages.position.set(side * 0.05, 0.016, 0); lid.position.set(side * 0.05, 0.025, 0);
        pages.rotation.z = lid.rotation.z = -side * 0.28;
        pages.castShadow = lid.castShadow = true;
        book.add(pages, lid);
      }
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.002, 0.03), s.material('#f6f0dc'));
      band.position.set(0, 0.04, 0.03);
      book.add(band);
      book.position.set(lx, ly, lz); book.rotation.y = j(0.8);
      s.root.add(book);
    } else if (a.left === 'scratch') {
      const card = canvasTexture(128, 80, (ctx) => {
        ctx.fillStyle = '#f2c81e'; ctx.fillRect(0, 0, 128, 80);
        ctx.fillStyle = '#c4201a'; ctx.fillRect(0, 0, 128, 20);
        for (let i = 0; i < 6; i++) { ctx.fillStyle = random() < 0.6 ? '#9aa0a6' : '#f7f4e6'; ctx.fillRect(8 + (i % 3) * 40, 26 + Math.floor(i / 3) * 26, 32, 20); }
      });
      const m = s.mesh(new THREE.BoxGeometry(0.15, 0.002, 0.09), [dark, dark, new THREE.MeshStandardMaterial({ map: card, roughness: 0.7 }), dark, dark, dark] as unknown as THREE.Material, [lx, ly + 0.002, lz]);
      m.rotation.y = j(0.8);
      s.cylinder(0.012, 0.012, 0.002, [lx + 0.09, ly + 0.002, lz + 0.05], s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 }), 14);
    } else if (a.left === 'lighter') {
      s.box([0.025, 0.014, 0.075], [lx + 0.06, ly + 0.007, lz], s.material(mood.cheer > 0.5 ? '#e8872b' : '#2f5fb0', { roughness: 0.3 })).rotation.y = j(1.5);
      s.box([0.025, 0.014, 0.018], [lx + 0.06, ly + 0.021, lz], s.material('#c9cdcd', { metalness: 0.8 }));
      const pack = s.box([0.058, 0.022, 0.088], [lx - 0.04, ly + 0.011, lz + 0.03], s.material('#f1efe8', { roughness: 0.9 }));
      pack.rotation.set(0.05, j(1.2), 0.08);
      s.box([0.06, 0.004, 0.03], [lx - 0.04, ly + 0.024, lz + 0.03], s.material('#c4201a')).rotation.y = pack.rotation.y;
    }

    // The drink.
    const dx = hasTable ? tableX + 0.09 : 0.3 + j(0.04), dz = hasTable ? tableZ - 0.08 : 0.2 + j(0.06), dy = hasTable ? tableY : 0;
    if (a.drink === 'coffee') {
      s.cylinder(0.042, 0.03, 0.115, [dx, dy + 0.0575, dz], s.material('#f1efe6', { roughness: 0.9 }), 16);
      s.cylinder(0.039, 0.036, 0.05, [dx, dy + 0.06, dz], s.material('#8a5a34', { roughness: 0.95 }), 16);
      s.cylinder(0.044, 0.044, 0.012, [dx, dy + 0.12, dz], s.material('#22262a'), 16);
    } else if (a.drink === 'energy') {
      s.cylinder(0.028, 0.028, 0.165, [dx, dy + 0.0825, dz], s.material(mood.cheer > 0.5 ? '#39c06a' : '#1f2a6a', { metalness: 0.6, roughness: 0.3 }), 16);
      s.cylinder(0.024, 0.028, 0.008, [dx, dy + 0.169, dz], s.material('#c9cdcd', { metalness: 0.9, roughness: 0.2 }), 16);
    } else if (a.drink === 'beer') {
      s.lathe([[0, 0], [0.031, 0], [0.031, 0.13], [0.013, 0.19], [0.013, 0.24], [0, 0.24]], s.material('#6a3f1a', { roughness: 0.15 }), [dx, dy, dz]);
      s.cylinder(0.0315, 0.0315, 0.06, [dx, dy + 0.08, dz], s.material('#f1e9c8'), 16);
      s.cylinder(0.015, 0.015, 0.006, [dx + 0.07, dy + 0.003, dz + 0.04], s.material('#c9a23a', { metalness: 0.8 }), 12);
    } else if (a.drink === 'deli') {
      s.cylinder(0.05, 0.04, 0.1, [dx, dy + 0.05, dz], new THREE.MeshStandardMaterial({ color: '#cfeaf2', roughness: 0.1 }), 16);
      for (let i = 0; i < 4; i++) s.box([0.022, 0.022, 0.022], [dx + j(0.04), dy + 0.1, dz + j(0.04)], s.material('#ffffff', { roughness: 0.1 })).rotation.set(random(), random(), random());
      s.rod([dx, dy + 0.02, dz], [dx + 0.03, dy + 0.17, dz + 0.01], 0.004, s.material('#e0473a'));
    }

    // Coffee-tin ashtray.
    const tx = hasTable ? tableX - 0.06 : -0.3 + j(0.04), tz = hasTable ? tableZ + 0.06 : 0.16 + j(0.05), ty = hasTable ? tableY : 0;
    const tinLabel = canvasTexture(256, 96, (ctx) => {
      ctx.fillStyle = mood.cheer > 0.5 ? '#c8251c' : '#1f3f8a'; ctx.fillRect(0, 0, 256, 96);
      ctx.fillStyle = '#f2c81e'; ctx.fillRect(0, 8, 256, 8); ctx.fillRect(0, 80, 256, 8);
      ctx.fillStyle = '#fff6dc'; ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center';
      ctx.fillText('COFFEE', 64, 60); ctx.fillText('COFFEE', 192, 60);
    });
    const tinR = 0.052, tinH = 0.135;
    s.cylinder(tinR, tinR, tinH, [tx, ty + tinH / 2, tz], new THREE.MeshStandardMaterial({ map: tinLabel, metalness: 0.35, roughness: 0.5 }), 24);
    for (const y of [0.004, tinH - 0.004]) s.cylinder(tinR + 0.003, tinR + 0.003, 0.008, [tx, ty + y, tz], s.material('#b9bdbd', { metalness: 0.85, roughness: 0.3 }), 24);
    const quit = a.cigarette === 'quit';
    s.cylinder(tinR - 0.004, tinR - 0.004, 0.004, [tx, ty + tinH - (quit ? 0.012 : 0.025), tz], quit ? new THREE.MeshStandardMaterial({ color: '#5f6a5a', roughness: 0.05 }) : s.material('#3a3632', { roughness: 1 }), 20).castShadow = false;
    const paperMat = s.material('#f4f1e8', { roughness: 0.9 }), filterMat = s.material('#d08a3c', { roughness: 0.9 });
    const butt = (x: number, y: number, z: number, rot: V3, len = 0.03) => {
      const g = new THREE.Group();
      g.position.set(x, y, z); g.rotation.set(...rot);
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.016, 6).translate(0, 0.008, 0), filterMat);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, len, 6).translate(0, 0.016 + len / 2, 0), paperMat);
      f.castShadow = p.castShadow = true;
      g.add(f, p);
      s.root.add(g);
      return g;
    };
    if (quit) {
      const leaf = s.material('#4f9a3a', { roughness: 0.8, side: THREE.DoubleSide });
      const n = 3 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) {
        const h = mix(0.06, 0.18, random()), lean = j(0.08);
        s.tube([[tx + j(0.03), ty + tinH - 0.02, tz + j(0.03)], [tx + lean, ty + tinH + h * 0.6, tz + j(0.04)], [tx + lean * 2, ty + tinH + h, tz + j(0.06)]], 0.003, leaf);
        for (let k = 0; k < 3; k++) s.ball([0.022, 0.004, 0.012], [tx + lean * (1 + k * 0.4) + j(0.03), ty + tinH + h * (0.5 + k * 0.25), tz + j(0.05)], leaf, 8).rotation.set(j(1), random() * 6, j(1));
      }
      if (mood.cheer > 0.45) s.ball([0.012, 0.012, 0.012], [tx, ty + tinH + 0.2, tz], s.material('#f2d532', { emissive: '#f2d532', emissiveIntensity: 0.2 }), 8);
    } else {
      const inTin = Math.round(a.butts * 16);
      for (let i = 0; i < inTin; i++) { const t = random() * 6.3, r = random() * (tinR - 0.012); butt(tx + Math.cos(t) * r, ty + tinH - 0.03, tz + Math.sin(t) * r, [j(0.9), random() * 6, j(0.9)], 0.01 + random() * 0.02); }
    }
    const ground = Math.round(Math.max(0, a.butts - 0.3) * 40 + mood.wear * 6);
    for (let i = 0; i < ground; i++) { const t = random() * 6.3, r = 0.1 + random() * 0.45; butt(tx * 0.5 + Math.cos(t) * r, 0.005, 0.25 + Math.sin(t) * r * 0.6, [Math.PI / 2, 0, random() * 6], 0.008 + random() * 0.015); }
    const wisps: { mesh: THREE.Mesh; phase: number }[] = [];
    let ember: THREE.MeshStandardMaterial | null = null;
    if (a.cigarette === 'lit') {
      const lit = butt(tx + tinR - 0.012, ty + tinH + 0.002, tz, [0, 0, -Math.PI / 2 + 0.12], 0.045);
      ember = new THREE.MeshStandardMaterial({ color: '#ff6a1a', emissive: '#ff4a0a', emissiveIntensity: 2.5 });
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), ember);
      tip.position.y = 0.063;
      lit.add(tip);
      const smoke = new THREE.MeshStandardMaterial({ color: '#e6e6e2', transparent: true, opacity: 0.2, depthWrite: false, roughness: 1 });
      const geo = new THREE.SphereGeometry(1, 8, 6);
      for (let i = 0; i < 14; i++) { const mesh = new THREE.Mesh(geo, smoke); s.root.add(mesh); wisps.push({ mesh, phase: i / 14 }); }
    }
    const ex = tx + tinR + 0.05, ey = ty + tinH + 0.008;

    // Backdrop.
    if (a.backdrop === 'door') {
      const brick = canvasTexture(256, 256, (ctx) => {
        ctx.fillStyle = '#8a8478'; ctx.fillRect(0, 0, 256, 256);
        for (let row = 0; row < 16; row++) for (let col = -1; col < 8; col++) {
          const shade = 0.8 + random() * 0.35;
          ctx.fillStyle = `rgb(${Math.round(150 * shade)},${Math.round(78 * shade)},${Math.round(58 * shade)})`;
          ctx.fillRect(col * 32 + (row % 2) * 16 + 1, row * 16 + 1, 30, 14);
        }
        ctx.fillStyle = `rgba(30,25,20,${mood.wear * 0.35})`; ctx.fillRect(0, 150, 256, 106);
      });
      const wallMat = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.95 });
      const WZ = -0.42, WW = 2.0, WH = 2.3, DWD = 0.92, DH = 2.02, DX = 0.42;
      const doorL = DX - DWD / 2, doorR = DX + DWD / 2;
      s.box([doorL + WW / 2, WH, 0.16], [(doorL - WW / 2) / 2, WH / 2, WZ], wallMat);
      s.box([WW / 2 - doorR, WH, 0.16], [(doorR + WW / 2) / 2, WH / 2, WZ], wallMat);
      s.box([DWD, WH - DH, 0.16], [DX, (WH + DH) / 2, WZ], wallMat);
      s.box([WW, 0.06, 0.2], [0, WH + 0.03, WZ], s.material('#9a968c', { roughness: 0.9 }));
      const glow = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: new THREE.Color().setHSL(mix(0.13, 0.07, mood.warmth), 0.9, 0.6), emissiveIntensity: 1.4 });
      s.box([DWD, DH, 0.02], [DX, DH / 2, WZ - 0.06], glow).castShadow = false;
      const doorMat = s.material(mood.cheer > 0.55 ? '#3f6f8a' : '#6f7672', { metalness: 0.4, roughness: 0.6 });
      const door = new THREE.Group();
      const swing = 0.3 + random() * 0.25;
      door.position.set(doorL, 0, WZ + 0.08);
      door.rotation.y = -swing;
      const dm = (size: V3, at: V3, mat: THREE.Material) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); m.position.set(...at); m.castShadow = m.receiveShadow = true; door.add(m); return m; };
      dm([DWD, DH, 0.05], [DWD / 2, DH / 2, 0], doorMat);
      dm([DWD - 0.1, 0.3, 0.006], [DWD / 2, 0.18, 0.028], s.material('#9aa0a0', { metalness: 0.7, roughness: 0.5 }));
      dm([0.04, 0.2, 0.05], [DWD - 0.09, 1.05, 0.05], s.material('#c9cdcd', { metalness: 0.9, roughness: 0.25 }));
      s.root.add(door);
      const sign = s.label('STAFF ONLY', 0.5, 0.11, [0, 0, 0], '#f4f1e8', '#b0281e');
      s.root.remove(sign);
      sign.position.set(DWD / 2, 1.6, 0.03);
      door.add(sign);
      // The brick that props it.
      s.box([0.21, 0.065, 0.1], [doorL + Math.cos(swing) * DWD * 0.75 - 0.05, 0.0325, WZ + 0.08 + Math.sin(swing) * DWD * 0.75 - 0.09], s.material('#a3543c', { roughness: 0.95 })).rotation.y = 0.5;
      // Bulkhead lamp and a downpipe.
      const lampOn = mood.daylight > 0.7 || mood.daylight < 0.25;
      s.box([0.2, 0.12, 0.09], [DX, DH + 0.16, WZ + 0.12], dark);
      s.box([0.16, 0.08, 0.04], [DX, DH + 0.16, WZ + 0.18], new THREE.MeshStandardMaterial({ color: '#fff3c9', emissive: '#ffd27a', emissiveIntensity: lampOn ? 2 : 0.15 })).castShadow = false;
      s.cylinder(0.04, 0.04, WH, [-WW / 2 + 0.18, WH / 2, WZ + 0.13], s.material('#3c4144', { roughness: 0.7 }), 10);
      const spill = new THREE.Shape();
      spill.moveTo(doorL + 0.05, -(WZ + 0.1)); spill.lineTo(doorR, -(WZ + 0.1)); spill.lineTo(doorR + 0.5, -(WZ + 1.3)); spill.lineTo(doorR - 0.1, -(WZ + 1.3));
      const pool = s.mesh(new THREE.ShapeGeometry(spill), new THREE.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }), [0, 0.003, 0]);
      pool.rotation.x = Math.PI / 2;
      pool.castShadow = pool.receiveShadow = false;
    } else if (a.backdrop === 'pallet') {
      const wood = s.material('#b5905c', { roughness: 0.95 });
      const pallet = new THREE.Group();
      const pm = (size: V3, at: V3) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), wood); m.position.set(...at); m.castShadow = m.receiveShadow = true; pallet.add(m); };
      for (let i = 0; i < 7; i++) pm([1.0, 0.09, 0.018], [0, 0.06 + i * 0.165 + j(0.01), 0.06]);
      for (let i = 0; i < 3; i++) pm([1.0, 0.09, 0.018], [0, 0.08 + i * 0.48, -0.06]);
      for (const x of [-0.45, 0, 0.45]) pm([0.09, 1.1, 0.1], [x, 0.55, 0]);
      pallet.position.set(-0.25, 0, -0.5);
      pallet.rotation.set(-0.28, 0.1, 0);
      s.root.add(pallet);
      const drum = s.material('#2f5f8a', { metalness: 0.3, roughness: 0.6 });
      s.cylinder(0.29, 0.29, 0.88, [0.62, 0.44, -0.5], drum, 24);
      for (const y of [0.01, 0.3, 0.58, 0.87]) s.ring(0.292, 0.012, [0.62, y, -0.5], drum).rotation.x = Math.PI / 2;
      s.cylinder(0.2, 0.25, 0.004, [0.62, 0.883, -0.5], s.material('#2a1c10', { roughness: 0.3 }), 16).castShadow = false;
      s.label('USED OIL', 0.3, 0.09, [0.62, 0.5, -0.205], '#f2c81e', '#1d1e20');
      crate(1.05, 0, -0.25, j(0.4), pick());
      if (mood.density > 0.4) crate(1.05 + j(0.03), CH, -0.25 + j(0.03), j(0.4), pick());
    }

    // Ground: a stain or two where the tin has always stood.
    for (let i = 0; i < 1 + Math.round(mood.wear * 4); i++) s.cylinder(0.07 + random() * 0.12, 0.07 + random() * 0.12, 0.002, [j(0.9), 0.001, 0.2 + j(0.5)], s.material(['#5a554c', '#3f3a34', '#6a6258'][i % 3], { roughness: 1, transparent: true, opacity: 0.55, depthWrite: false }), 12).castShadow = false;

    const setSmoke = (time: number) => {
      for (const wisp of wisps) {
        const t = (wisp.phase + time * mix(0.08, 0.2, mood.energy)) % 1;
        const size = mix(0.006, 0.05, t);
        wisp.mesh.scale.set(size, size * 1.6, size);
        wisp.mesh.position.set(ex + Math.sin(t * 9 + time * 0.6) * 0.035 * t * 3, ey + t * 0.75, tz + Math.cos(t * 7) * 0.02 * t * 3);
      }
    };
    setSmoke(0);
    return s.finish({
      update: (_dt, time) => {
        setSmoke(time);
        if (ember) ember.emissiveIntensity = 2.2 + Math.sin(time * 3) * 0.8;
      },
    });
  },
});
