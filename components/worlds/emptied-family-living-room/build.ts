import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
type Ghost = { x: number; y: number; w: number; h: number; round?: boolean; nail?: boolean };

export default defineWorld({
  questions: {
    house: choice('What kind of family house is it?', {
      victorian: 'A Victorian terrace: tall sash bay, picture rail, a cast-iron arched fireplace with tiled cheeks.',
      thirties: 'A 1930s semi: bay with coloured leaded top-lights, a stepped tiled fireplace in mottled beige.',
      seventies: 'A 1970s house: a wide picture bay, a stone-clad chimney breast with a teak shelf and a gas fire.',
    }),
    walls: choice('What is on the walls?', {
      floral: 'Faded trellis-and-rose wallpaper, decades old.',
      anaglypta: 'Embossed paper painted magnolia, yellowed by years of living.',
      geometric: 'Bold orange and brown circles nobody ever replaced.',
      stripe: 'Sage and cream stripes.',
      paint: 'A strong colour somebody chose and loved.',
    }),
    floor: choice('What did lifting the carpet leave?', {
      boards: 'Bare boards with carpet gripper rods still nailed round the edge.',
      border: 'Boards stained dark round the edge and pale in the middle, where a carpet square lay for fifty years.',
      underlay: 'Boards with patches of crumbled underlay and old newspaper stuck to them.',
      parquet: 'Parquet blocks, dull along the routes people walked.',
    }),
    hung: choice('What hung on the walls and left its shape?', {
      gallery: 'A whole family gallery: dozens of frames climbing the alcove.',
      mirror: 'A big mirror over the mantel and a pair of oval portraits.',
      clock: 'A round clock, a calendar and a few small frames.',
      sparse: 'Very little: one picture, and the shapes of the furniture.',
    }),
    hearth: choice('How has the fireplace been left?', {
      swept: 'Swept out and empty.',
      ashes: 'Cold ash and one half-burnt log from the last fire.',
      boarded: 'Boarded over years ago, with a little vent.',
      companion: 'Empty, but the coal scuttle and poker are still standing by it.',
    }),
    mantel: choice('What is still on the mantelpiece?', {
      nothing: 'Nothing but a line of dust.',
      clock: 'A stopped clock nobody wanted.',
      cards: 'A row of cards, one fallen over.',
      photo: 'One framed photograph, left face down.',
    }),
    left: choice('What else was left in the room?', {
      broom: 'A broom, a dustpan and a little heap of sweepings.',
      bags: 'Two black bin bags by the wall.',
      ladder: 'A stepladder and a box of light bulbs.',
      heights: "Children's heights pencilled up the wall with names and dates.",
      nothing: 'Nothing at all.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const W = 14, D = 11, H = 4.6, X0 = -7, Z0 = -5.5;
    const hero: [number, number] = [-1.2, -0.2];
    const at = (p: number, f: number, size: number): [number, number, number, number] => [hero[0] + p * 0.87 + f * 0.5, hero[1] - p * 0.5 + f * 0.87, 0, size];
    const { art: s, world } = diorama(context, {
      background: mood.warmth > 0.5 ? '#ebe5d8' : '#e4e6e2', floor: null, width: W, depth: D, maxHeight: 3.0, radius: 1.5, pitch: 30, yaw: 30,
      slots: [[hero[0], hero[1]], at(3.5, 1.7, 0.85), at(-3.5, -1.0, 0.8), at(1.3, 4.3, 0.7), at(6.3, 3.0, 0.75), at(-1.5, -4.2, 0.9)],
    });
    const root = s.root;
    const tex = (w: number, h: number, draw: (c: Ctx, w: number, h: number) => void) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!, w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    const flat = (hex: THREE.ColorRepresentation, rough = 0.9, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, ...extra });
    const age = 0.25 + mood.wear * 0.75;
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, parent: THREE.Object3D = root, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; };
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material | THREE.Material[], shadow = true) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, root, shadow);

    // ---------- floor
    const woodBase = a.floor === 'parquet' ? '#b0834f' : '#c29a66';
    const floorTex = tex(1024, 804, (c, w, h) => {
      const px = w / W;
      if (a.floor === 'parquet') {
        c.fillStyle = woodBase; c.fillRect(0, 0, w, h); const bl = 46, bw = 11.5;
        for (let j = -2; j < h / bw + 4; j++) for (let i = -2; i < w / bl + 2; i++) { const t = 150 + Math.floor(random() * 50); c.fillStyle = `rgb(${t + 28},${t - 14},${t - 72})`; c.save(); c.translate(i * bl + (j % 2) * bl / 2, j * bw * 1.42); c.rotate(i % 2 ? 0.785 : -0.785); c.fillRect(0, 0, bl, bw - 1); c.restore(); }
        c.fillStyle = `rgba(235,225,205,${0.1 + age * 0.14})`; c.beginPath(); c.ellipse(w * 0.55, h * 0.5, w * 0.42, h * 0.13, -0.45, 0, 7); c.fill();
      } else {
        const bh = px * 0.46;
        for (let y = 0; y < h; y += bh) { let x = -random() * 220; while (x < w) { const len = 220 + random() * 380, t = random(); c.fillStyle = `rgb(${190 + t * 26},${146 + t * 24},${94 + t * 22})`; c.fillRect(x, y, len - 1.5, bh - 1.5); c.fillStyle = 'rgba(60,38,16,0.55)'; c.fillRect(x + 6, y + 5, 2.5, 2.5); c.fillRect(x + 6, y + bh - 9, 2.5, 2.5); x += len; } }
        c.fillStyle = 'rgba(55,32,14,0.55)'; for (let y = 0; y < h; y += bh) c.fillRect(0, y - 1.5, w, 1.5);
        for (let i = 0; i < 26; i++) { c.fillStyle = 'rgba(70,40,18,0.5)'; c.beginPath(); c.ellipse(random() * w, random() * h, 3 + random() * 4, 2 + random() * 2, 0, 0, 7); c.fill(); }
        if (a.floor === 'border') {
          c.fillStyle = 'rgba(48,27,14,0.74)'; c.beginPath(); c.rect(0, 0, w, h); c.rect(w * 0.14, h * 0.17, w * 0.72, h * 0.66); c.fill('evenodd');
          c.fillStyle = `rgba(255,240,210,${0.1 + age * 0.1})`; c.fillRect(w * 0.14, h * 0.17, w * 0.72, h * 0.66);
          c.strokeStyle = 'rgba(40,22,10,0.55)'; c.lineWidth = 4; c.strokeRect(w * 0.14, h * 0.17, w * 0.72, h * 0.66);
        }
        if (a.floor === 'underlay') {
          for (let i = 0; i < 9 + mood.density * 9; i++) {
            const x = random() * w, y = random() * h, r = 40 + random() * 90;
            c.fillStyle = random() < 0.5 ? 'rgba(120,112,100,0.8)' : 'rgba(150,120,90,0.75)'; c.beginPath(); for (let k = 0; k < 12; k++) { const ang = k / 12 * 6.283, rr = r * (0.55 + random() * 0.5); c.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr * 0.7); } c.fill();
          }
          for (let i = 0; i < 4; i++) { const x = random() * w * 0.8, y = random() * h * 0.8; c.save(); c.translate(x, y); c.rotate(random() * 3); c.fillStyle = '#d9d2bc'; c.fillRect(0, 0, 110, 150); c.fillStyle = 'rgba(40,40,40,0.5)'; c.fillRect(8, 8, 94, 12); for (let l = 0; l < 14; l++) c.fillRect(8 + (l % 2) * 48, 30 + Math.floor(l / 2) * 16, 42, 2); c.restore(); }
        }
        // gripper rods and the tide line where the carpet met the skirting
        if (a.floor !== 'border') { c.strokeStyle = 'rgba(230,205,160,0.9)'; c.lineWidth = 5; c.strokeRect(px * 0.32, px * 0.32, w - px * 0.64, h * 2); c.fillStyle = 'rgba(60,60,64,0.85)'; for (let x = px * 0.32; x < w - px * 0.3; x += 9) c.fillRect(x, px * 0.32 - 1.5, 2, 3); for (let y = px * 0.32; y < h; y += 9) { c.fillRect(px * 0.32 - 1.5, y, 3, 2); } }
        c.strokeStyle = `rgba(60,48,34,${0.25 + age * 0.3})`; c.lineWidth = 7; c.strokeRect(px * 0.12, px * 0.12, w * 2, h * 2);
      }
      // furniture feet and scuffs
      c.fillStyle = 'rgba(40,26,14,0.4)'; for (const [x, y] of [[0.1, 0.2], [0.33, 0.2], [0.1, 0.3], [0.33, 0.3], [0.7, 0.62], [0.78, 0.62], [0.7, 0.72], [0.78, 0.72]]) c.fillRect(w * x, h * y, 9, 9);
      for (let i = 0; i < age * 46; i++) { c.strokeStyle = `rgba(245,238,225,${0.1 + random() * 0.15})`; c.lineWidth = 1 + random() * 2; const x = random() * w, y = random() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (random() - 0.5) * 100, y + (random() - 0.5) * 30); c.stroke(); }
      c.fillStyle = `rgba(150,140,125,${mood.wear * 0.16})`; c.fillRect(0, 0, w, h);
    });
    const edge = flat('#8f7a5e');
    const ground = new THREE.Mesh(new THREE.BoxGeometry(W, 0.24, D), [edge, edge, new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.62 }), edge, edge, edge]);
    ground.position.y = -0.12; ground.receiveShadow = true; root.add(ground); world.ground = ground;

    // ---------- wallpaper
    const paint = new THREE.Color().setHSL(mood.warmth > 0.5 ? 0.04 : 0.47, 0.42, 0.52);
    const fresh = { floral: '#ebe2c8', anaglypta: '#f1e8cc', geometric: '#ead9ae', stripe: '#ece6d0', paint: `#${paint.getHexString()}` }[a.walls];
    const paper = (c: Ctx, w: number, h: number, ghosts: Ghost[], px: number, extra?: (c: Ctx) => void) => {
      c.fillStyle = fresh; c.fillRect(0, 0, w, h);
      if (a.walls === 'floral') {
        c.strokeStyle = 'rgba(120,145,100,0.6)'; c.lineWidth = 2.5; for (let i = -h; i < w + h; i += 62) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke(); }
        for (let y = 31; y < h; y += 62) for (let x = (Math.round(y / 62) % 2) * 31; x < w + 10; x += 62) { c.fillStyle = '#b8656a'; for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.26) * 6, y + Math.sin(p * 1.26) * 6, 6, 0, 7); c.fill(); } c.fillStyle = '#e2c66a'; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); }
      } else if (a.walls === 'anaglypta') {
        for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 8; x < w; x += 16) { c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(x, y, 4.5, 0, 7); c.fill(); c.fillStyle = 'rgba(150,130,90,0.3)'; c.beginPath(); c.arc(x + 2, y + 2.5, 4, 0.2, 2.2); c.fill(); }
      } else if (a.walls === 'geometric') {
        for (let y = 0; y < h + 70; y += 70) for (let x = (Math.round(y / 70) % 2) * 35; x < w + 70; x += 70) for (const [r, col] of [[31, '#c9772a'], [22, '#6a3d1f'], [14, '#e3a94a'], [6, '#ead9ae']] as const) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
      } else if (a.walls === 'stripe') {
        for (let x = 0; x < w; x += 44) { c.fillStyle = '#a9b596'; c.fillRect(x, 0, 19, h); c.fillStyle = '#c9a85a'; c.fillRect(x + 27, 0, 2.5, h); }
      } else { for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(255,255,255,${0.02 + random() * 0.03})`; c.fillRect(random() * w, 0, 30 + random() * 50, h); } }
      // years of light and smoke everywhere except where things hung
      c.fillStyle = a.walls === 'paint' ? `rgba(60,45,30,${0.14 + age * 0.16})` : `rgba(150,122,76,${0.27 + age * 0.3})`;
      c.beginPath(); c.rect(0, 0, w, h);
      for (const g of ghosts) { const gx = g.x * px, gy = h - (g.y + g.h) * px; if (g.round) { c.moveTo(gx + g.w * px, gy + g.h * px / 2); c.ellipse(gx + g.w * px / 2, gy + g.h * px / 2, g.w * px / 2, g.h * px / 2, 0, 0, Math.PI * 2); } else c.rect(gx, gy, g.w * px, g.h * px); }
      c.fill('evenodd');
      for (const g of ghosts) {
        const gx = g.x * px, gy = h - (g.y + g.h) * px;
        c.strokeStyle = `rgba(70,55,35,${0.2 + age * 0.22})`; c.lineWidth = 2;
        if (g.round) { c.beginPath(); c.ellipse(gx + g.w * px / 2, gy + g.h * px / 2, g.w * px / 2 + 1, g.h * px / 2 + 1, 0, 0.2, Math.PI - 0.2); c.stroke(); }
        else { c.strokeRect(gx, gy, g.w * px, g.h * px); c.lineWidth = 3.5; c.beginPath(); c.moveTo(gx, gy + g.h * px + 1); c.lineTo(gx + g.w * px, gy + g.h * px + 1); c.stroke(); }
        if (g.nail) { c.fillStyle = '#3a2c1a'; c.fillRect(gx + g.w * px / 2 - 2, gy + Math.min(14, g.h * px * 0.15), 4, 7); }
      }
      for (let i = 0; i < age * 14; i++) { c.fillStyle = `rgba(70,55,40,${0.05 + random() * 0.07})`; c.beginPath(); c.ellipse(random() * w, h - random() * 1.2 * px, 8 + random() * 30, 3 + random() * 9, 0, 0, 7); c.fill(); }
      if (mood.wear > 0.55) { const x = w * (0.2 + random() * 0.5); c.fillStyle = '#d9c2ae'; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 60, 0); c.lineTo(x + 48, 90 + random() * 80); c.lineTo(x + 20, 60 + random() * 60); c.fill(); c.fillStyle = `rgba(110,90,50,${mood.wear * 0.25})`; c.beginPath(); c.ellipse(x + 200, 20, 120, 60, 0, 0, 7); c.fill(); }
      extra?.(c);
    };
    const railed = a.house !== 'seventies';
    const cx = 2.6, bw = 4.0, bz = Z0 + 0.5; // chimney breast centre, width and front face
    const backGhosts: Ghost[] = [], breastGhosts: Ghost[] = [], leftGhosts: Ghost[] = [];
    // back wall x runs 0..14 from the left corner; left wall x runs 0 at z = 0.4 back to 5.9 at the corner
    const alcove = cx - bw / 2 - X0; // 7.6 wide
    backGhosts.push({ x: 0.9, y: 0.4, w: 3.7, h: 1.75 });
    leftGhosts.push({ x: 3.5, y: 0.4, w: 1.9, h: 3.0 });
    if (a.hung === 'gallery') {
      const n = 9 + Math.round(mood.density * 7);
      for (let i = 0; i < n; i++) { const w = 0.45 + random() * 0.8, h = 0.45 + random() * 0.75; backGhosts.push({ x: 0.5 + (i % 6) * 1.1 + random() * 0.25, y: 2.3 + Math.floor(i / 6) * 0.72 + random() * 0.15 - (i % 2) * 0.1, w: Math.min(w, 0.95), h: Math.min(h, 0.62), nail: true }); }
      breastGhosts.push({ x: 0.9, y: 2.95, w: 2.2, h: 1.1, nail: true });
      leftGhosts.push({ x: 0.7, y: 2.0, w: 1.0, h: 1.3, nail: true }, { x: 2.0, y: 2.3, w: 0.8, h: 0.7, nail: true }, { x: 2.0, y: 1.5, w: 0.8, h: 0.6, nail: true });
    } else if (a.hung === 'mirror') {
      breastGhosts.push({ x: 0.75, y: 2.9, w: 2.5, h: 1.45, nail: true });
      backGhosts.push({ x: 1.5, y: 2.5, w: 0.85, h: 1.15, round: true, nail: true }, { x: 3.0, y: 2.5, w: 0.85, h: 1.15, round: true, nail: true }, { x: 5.3, y: 2.0, w: 1.3, h: 1.7, nail: true });
      leftGhosts.push({ x: 0.9, y: 2.0, w: 1.6, h: 1.2, nail: true });
    } else if (a.hung === 'clock') {
      breastGhosts.push({ x: 1.55, y: 3.0, w: 0.9, h: 0.9, round: true, nail: true });
      backGhosts.push({ x: 5.4, y: 2.2, w: 0.75, h: 1.05, nail: true }, { x: 1.2, y: 2.6, w: 0.7, h: 0.55, nail: true }, { x: 2.2, y: 2.6, w: 0.7, h: 0.55, nail: true }, { x: 3.2, y: 2.6, w: 0.7, h: 0.55, nail: true });
      leftGhosts.push({ x: 1.2, y: 2.5, w: 0.35, h: 0.7, nail: true });
    } else {
      breastGhosts.push({ x: 1.2, y: 3.0, w: 1.6, h: 1.0, nail: true });
      leftGhosts.push({ x: 0.5, y: 0.4, w: 2.4, h: 1.3 });
    }
    const heights = (c: Ctx) => {
      if (a.left !== 'heights') return;
      const px = 100, x0 = (alcove - 1.25) * px; c.strokeStyle = '#3a3a44'; c.fillStyle = '#3a3a44'; c.lineWidth = 3;
      const names = ['Tom', 'Anna', 'Ruth', 'Tom', 'Anna', 'Tom', 'Ruth', 'Anna', 'Tom', 'Ruth', 'Anna'];
      c.font = 'italic bold 20px "Comic Sans MS", cursive, sans-serif'; c.textBaseline = 'middle';
      names.forEach((n, i) => { const y = H * px - (1.25 + i * 0.19 + random() * 0.06) * px; c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + 34 + random() * 14, y - 2); c.stroke(); c.fillText(`${n} ${4 + i}`, x0 + 56, y - 1); });
      c.beginPath(); c.moveTo(x0 + 4, H * px - 1.2 * px); c.lineTo(x0 + 4, H * px - 3.4 * px); c.stroke();
    };
    const wallEdge = flat('#d5cfc0');
    const backTex = tex(1400, 460, (c, w, h) => paper(c, w, h, backGhosts, 100, heights));
    const back = box(W + 0.25, H, 0.25, -0.125, H / 2, Z0 - 0.125, [wallEdge, wallEdge, wallEdge, wallEdge, new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.95 }), wallEdge]);
    back.castShadow = false;
    const bayA = 0.4, bayB = 5.0, bayOut = 1.5;
    const leftLen = bayA - Z0;
    const leftTex = tex(590, 460, (c, w, h) => paper(c, w, h, leftGhosts, 100));
    box(0.25, H, leftLen, X0 - 0.125, H / 2, (Z0 + bayA) / 2, [new THREE.MeshStandardMaterial({ map: leftTex, roughness: 0.95 }), wallEdge, wallEdge, wallEdge, wallEdge, wallEdge], false);
    const plainPaper = new THREE.MeshStandardMaterial({ map: tex(128, 128, (c, w, h) => paper(c, w, h, [], 100)), roughness: 0.95 });
    box(0.25, 1.0, D / 2 - bayB, X0 - 0.125, 0.5, (bayB + D / 2) / 2, [plainPaper, wallEdge, wallEdge, wallEdge, wallEdge, wallEdge], false);

    const trim = flat(a.house === 'thirties' ? '#e6dcc0' : '#f1eee6', 0.45);
    const skirtH = a.house === 'victorian' ? 0.42 : 0.3;
    box(cx - bw / 2 - X0, skirtH, 0.07, (X0 + cx - bw / 2) / 2, skirtH / 2, Z0 + 0.035, trim, false);
    box(leftLen, skirtH, 0.07, 0, 0, 0, trim, false).position.set(X0 + 0.035, skirtH / 2, (Z0 + bayA) / 2); root.children[root.children.length - 1].rotation.y = Math.PI / 2;
    if (railed) {
      box(cx - bw / 2 - X0, 0.09, 0.07, (X0 + cx - bw / 2) / 2, 3.72, Z0 + 0.035, trim, false);
      box(W / 2 - cx - bw / 2, 0.09, 0.07, (W / 2 + cx + bw / 2) / 2, 3.72, Z0 + 0.035, trim, false);
      box(bw + 0.14, 0.09, 0.07, cx, 3.72, bz + 0.035, trim, false);
      const rail = box(leftLen, 0.09, 0.07, 0, 0, 0, trim, false); rail.position.set(X0 + 0.035, 3.72, (Z0 + bayA) / 2); rail.rotation.y = Math.PI / 2;
    }

    // ---------- door in the right alcove, ajar on a dim hall
    const dx0 = cx + bw / 2 + 0.35, dw = 1.75, dh = 3.5;
    box(dw, dh, 0.02, dx0 + dw / 2, dh / 2, Z0 + 0.012, flat('#4a4038'), false);
    box(0.5, dh * 0.8, 0.02, dx0 + dw * 0.4, dh * 0.45, Z0 + 0.024, new THREE.MeshBasicMaterial({ color: new THREE.Color('#c9b48a').multiplyScalar(mix(0.6, 1, mood.cheer)) }), false);
    for (const x of [dx0 - 0.09, dx0 + dw + 0.09]) box(0.18, dh + 0.18, 0.1, x, (dh + 0.18) / 2, Z0 + 0.05, trim, false);
    box(dw + 0.36, 0.18, 0.1, dx0 + dw / 2, dh + 0.09, Z0 + 0.05, trim, false);
    const doorTex = tex(128, 256, (c, w, h) => { c.fillStyle = a.house === 'seventies' ? '#b98a56' : '#efeadc'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(60,45,30,0.45)'; c.lineWidth = 3; if (a.house !== 'seventies') for (const [x, y, pw, ph] of [[14, 14, 42, 96], [72, 14, 42, 96], [14, 126, 42, 116], [72, 126, 42, 116]]) c.strokeRect(x, y, pw, ph); c.fillStyle = '#b9944a'; c.beginPath(); c.arc(16, 132, 6, 0, 7); c.fill(); });
    const leaf = new THREE.Group(); leaf.position.set(dx0 + dw, 0, Z0 + 0.06); leaf.rotation.y = -1.15 - random() * 0.25; root.add(leaf);
    add(new THREE.BoxGeometry(dw, dh, 0.09), new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.5 }), -dw / 2, dh / 2, 0, leaf);
    box(W / 2 - cx - bw / 2, skirtH, 0.07, 0, 0, 0, trim, false).position.set((dx0 + dw + 0.18 + W / 2) / 2, skirtH / 2, Z0 + 0.035); root.children[root.children.length - 1].scale.x = (W / 2 - dx0 - dw - 0.18) / (W / 2 - cx - bw / 2);

    // ---------- chimney breast and fireplace
    const stone = a.house === 'seventies';
    const breastTex = stone
      ? tex(400, 460, (c, w, h) => { c.fillStyle = '#8f8a80'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 38) { let x = -random() * 60; while (x < w) { const sw = 50 + random() * 80, t = random(); c.fillStyle = `rgb(${186 + t * 40},${172 + t * 36},${146 + t * 34})`; c.beginPath(); c.roundRect(x + 3, y + 3, sw - 6, 32, 6); c.fill(); x += sw; } } c.fillStyle = `rgba(110,100,80,${mood.wear * 0.2})`; c.fillRect(0, 0, w, h); })
      : tex(400, 460, (c, w, h) => paper(c, w, h, breastGhosts, 100));
    const sidePaper = stone ? flat('#a9a294') : plainPaper;
    box(bw, H, 0.5, cx, H / 2, Z0 + 0.25, [sidePaper, sidePaper, wallEdge, wallEdge, new THREE.MeshStandardMaterial({ map: breastTex, roughness: 0.95 }), wallEdge]);
    const fz = bz; // front face of the breast
    const dark = flat('#0e0d0d', 0.9), iron = flat('#1c1c1e', 0.55, { metalness: 0.4 });
    let mantelY = 2.74, mantelZ = fz + 0.3, openW = 1.0, openH = 1.25;
    const boarded = a.hearth === 'boarded';
    if (a.house === 'victorian') {
      const surround = flat(mood.warmth > 0.5 ? '#ece7da' : '#d9d6d0', 0.4);
      for (const side of [-1, 1]) { box(0.5, 2.3, 0.28, cx + side * 1.4, 1.15, fz + 0.14, surround); box(0.56, 0.3, 0.36, cx + side * 1.4, 2.42, fz + 0.18, surround); }
      box(3.3, 0.55, 0.28, cx, 2.3, fz + 0.14, surround); box(3.8, 0.14, 0.62, cx, 2.67, fz + 0.31, surround);
      box(2.3, 2.05, 0.1, cx, 1.025, fz + 0.06, iron);
      const arch = new THREE.Shape(); arch.moveTo(-0.52, 0); arch.lineTo(-0.52, 0.85); arch.absarc(0, 0.85, 0.52, Math.PI, 0, true); arch.lineTo(0.52, 0);
      add(new THREE.ShapeGeometry(arch), boarded ? flat('#8a6a44') : dark, cx, 0.08, fz + 0.115, root, false);
      const tiles = tex(64, 256, (c, w, h) => { const hue = mood.warmth > 0.5 ? ['#7a2f2a', '#c9a23f'] : ['#2f5f5a', '#d9d2b0']; for (let i = 0; i < 5; i++) { c.fillStyle = hue[0]; c.fillRect(2, i * 51 + 2, 60, 48); c.fillStyle = hue[1]; c.beginPath(); c.arc(32, i * 51 + 26, 14, 0, 7); c.fill(); c.fillStyle = hue[0]; c.beginPath(); c.arc(32, i * 51 + 26, 6, 0, 7); c.fill(); } });
      for (const side of [-1, 1]) add(new THREE.PlaneGeometry(0.38, 1.7), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.25 }), cx + side * 0.84, 0.95, fz + 0.115, root, false);
      box(3.7, 0.08, 1.25, cx, 0.04, fz + 0.62, new THREE.MeshStandardMaterial({ map: tex(256, 96, (c, w, h) => { for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { c.fillStyle = (x + y) / 32 % 2 ? '#6a2a22' : '#2a2422'; c.fillRect(x + 1, y + 1, 30, 30); } }), roughness: 0.4 }));
    } else if (a.house === 'thirties') {
      const tile = new THREE.MeshStandardMaterial({ map: tex(256, 256, (c, w, h) => { for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { const t = random(); c.fillStyle = `rgb(${196 + t * 30},${170 + t * 30},${128 + t * 30})`; c.fillRect(x + 1, y + 1, 30, 30); c.fillStyle = `rgba(120,80,40,${0.1 + random() * 0.25})`; c.beginPath(); c.ellipse(x + 16, y + 16, 6 + random() * 8, 4 + random() * 6, random() * 3, 0, 7); c.fill(); } }), roughness: 0.25 });
      box(3.8, 1.15, 0.24, cx, 0.575, fz + 0.12, tile); box(3.1, 1.75, 0.3, cx, 0.875, fz + 0.15, tile); box(2.3, 2.3, 0.36, cx, 1.15, fz + 0.18, tile);
      box(2.5, 0.08, 0.46, cx, 2.34, fz + 0.2, flat('#6a4326', 0.4));
      openW = 0.95; openH = 1.05; mantelY = 2.38; mantelZ = fz + 0.2;
      add(new THREE.PlaneGeometry(openW, openH), boarded ? flat('#8a6a44') : dark, cx, openH / 2 + 0.14, fz + 0.365, root, false);
      box(1.25, 0.06, 0.03, cx, openH + 0.2, fz + 0.37, flat('#5a4a36', 0.3));
      box(3.3, 0.14, 1.1, cx, 0.07, fz + 0.55, tile);
    } else {
      mantelY = 2.3; mantelZ = fz + 0.26; openW = 1.5; openH = 1.5;
      box(3.9, 0.12, 0.52, cx, 2.24, fz + 0.26, flat('#a86a34', 0.4));
      add(new THREE.PlaneGeometry(openW, openH), boarded ? flat('#b99a6a') : dark, cx, openH / 2 + 0.1, fz + 0.012, root, false);
      box(3.6, 0.1, 1.2, cx, 0.05, fz + 0.6, flat('#3a3d42', 0.5));
      if (!boarded) {
        box(1.3, 1.25, 0.4, cx, 0.72, fz + 0.22, flat('#6a4a2c', 0.5));
        box(1.36, 0.08, 0.46, cx, 1.38, fz + 0.24, flat('#8a5f36', 0.35));
        add(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({ map: tex(96, 64, (c, w, h) => { c.fillStyle = '#d9d2bc'; c.fillRect(0, 0, w, h); c.fillStyle = '#8a8474'; for (let x = 4; x < w; x += 23) for (let y = 4; y < h; y += 8) c.fillRect(x, y, 19, 4); }), roughness: 0.7 }), cx, 0.82, fz + 0.425, root, false);
        box(1.1, 0.06, 0.03, cx, 0.42, fz + 0.43, flat('#c9ccce', 0.25, { metalness: 0.8 })); box(1.1, 0.06, 0.03, cx, 1.2, fz + 0.43, flat('#c9ccce', 0.25, { metalness: 0.8 }));
      } else { add(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 10), flat('#b9844a', 0.3, { metalness: 0.8 }), cx + 0.5, 0.25, fz + 0.2); }
    }
    if (boarded) { add(new THREE.PlaneGeometry(0.32, 0.16), new THREE.MeshStandardMaterial({ map: tex(64, 32, (c, w, h) => { c.fillStyle = '#e9e4d6'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a342c'; for (let y = 5; y < h; y += 7) c.fillRect(5, y, w - 10, 3); }), roughness: 0.6 }), cx, 0.5, a.house === 'thirties' ? fz + 0.372 : a.house === 'victorian' ? fz + 0.122 : fz + 0.02, root, false); }
    else if (a.house !== 'seventies') {
      const gz = a.house === 'thirties' ? fz + 0.42 : fz + 0.26;
      for (let i = 0; i < 4; i++) box(openW * 0.86, 0.035, 0.035, cx, 0.22 + i * 0.1, gz, iron);
      for (const side of [-1, 1]) box(0.05, 0.5, 0.05, cx + side * openW * 0.43, 0.3, gz, iron);
      if (a.hearth === 'ashes') { const ash = add(new THREE.SphereGeometry(1, 14, 8), flat('#9a968e', 1), cx, 0.16, gz - 0.02); ash.scale.set(openW * 0.4, 0.14, 0.16); const log = add(new THREE.CylinderGeometry(0.09, 0.1, 0.62, 10), flat('#2a211a', 1), cx + 0.05, 0.32, gz - 0.04); log.rotation.set(0.2, 0.3, Math.PI / 2 - 0.2); const spill = add(new THREE.SphereGeometry(1, 12, 6), flat('#a8a49c', 1), cx - 0.1, 0.1, gz + 0.3); spill.scale.set(0.5, 0.03, 0.22); }
    }
    if (a.hearth === 'companion') {
      const brass = flat('#c9a23f', 0.3, { metalness: 0.85 }), hx = cx + 1.25, hz = fz + 0.85;
      add(new THREE.LatheGeometry([[0.14, 0], [0.24, 0.3], [0.3, 0.42]].map(([x, y]) => new THREE.Vector2(x, y)), 18), new THREE.MeshStandardMaterial({ color: '#c9a23f', roughness: 0.3, metalness: 0.85, side: THREE.DoubleSide }), hx, 0.1, hz);
      add(new THREE.TorusGeometry(0.26, 0.018, 6, 16, Math.PI), brass, hx, 0.5, hz);
      const coal = add(new THREE.SphereGeometry(1, 10, 6), flat('#15130f', 0.7), hx, 0.44, hz); coal.scale.set(0.24, 0.08, 0.24);
      const sx = cx - 1.3; add(new THREE.CylinderGeometry(0.16, 0.2, 0.06, 14), brass, sx, 0.13, hz); add(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 8), brass, sx, 0.68, hz); add(new THREE.SphereGeometry(0.06, 10, 8), brass, sx, 1.26, hz);
      for (const o of [-0.1, 0.1]) { const tool = add(new THREE.CylinderGeometry(0.014, 0.014, 0.9, 6), iron, sx + o, 0.62, hz + 0.06); tool.rotation.z = o * 0.5; }
    }
    // mantelpiece
    const my = mantelY;
    if (a.mantel === 'clock') {
      const wood = flat('#5a341c', 0.4);
      box(0.62, 0.42, 0.24, cx, my + 0.21, mantelZ, wood); const cap = add(new THREE.CylinderGeometry(0.31, 0.31, 0.24, 20, 1, false, 0, Math.PI), wood, cx, my + 0.42, mantelZ); cap.rotation.set(Math.PI / 2, Math.PI / 2, 0);
      add(new THREE.CircleGeometry(0.24, 24), new THREE.MeshStandardMaterial({ map: tex(96, 96, (c, w, h) => { c.fillStyle = '#efe8d2'; c.beginPath(); c.arc(48, 48, 48, 0, 7); c.fill(); c.strokeStyle = '#2a2420'; c.lineWidth = 3; for (let i = 0; i < 12; i++) { const an = i * 0.5236; c.beginPath(); c.moveTo(48 + Math.cos(an) * 36, 48 + Math.sin(an) * 36); c.lineTo(48 + Math.cos(an) * 43, 48 + Math.sin(an) * 43); c.stroke(); } c.lineWidth = 4; c.beginPath(); c.moveTo(48, 48); c.lineTo(48 + 22, 48 - 10); c.moveTo(48, 48); c.lineTo(48 - 6, 48 - 34); c.stroke(); }), roughness: 0.4 }), cx, my + 0.36, mantelZ + 0.125, root, false);
    } else if (a.mantel === 'cards') {
      const n = 4 + Math.round(mood.density * 3);
      for (let i = 0; i < n; i++) { const x = cx - 1.3 + i * (2.6 / (n - 1)) + (random() - 0.5) * 0.1, fallen = i === 1; const g = new THREE.Group(); g.position.set(x, my, mantelZ + (fallen ? 0.1 : 0)); g.rotation.y = (random() - 0.5) * 0.6; root.add(g); const col = ['#f4f1e8', '#e9dcc0', '#c9d9e0', '#f1e0e2', '#e2ead0'][i % 5];
        if (fallen) { add(new THREE.BoxGeometry(0.3, 0.012, 0.4), flat(col), 0, 0.01, 0, g); }
        else for (const side of [-1, 1]) { const leafc = add(new THREE.BoxGeometry(0.28, 0.4, 0.01), flat(col), 0, 0.195, side * 0.06, g); leafc.rotation.x = side * 0.3; }
      }
    } else if (a.mantel === 'photo') {
      const f = box(0.42, 0.035, 0.52, cx - 0.5, my + 0.02, mantelZ, flat('#3a2a1c', 0.4)); f.rotation.y = 0.3;
      const strut = box(0.06, 0.012, 0.36, cx - 0.5, my + 0.045, mantelZ, flat('#1c1612')); strut.rotation.y = 0.3;
    }
    add(new THREE.PlaneGeometry(3.4, 0.4), new THREE.MeshBasicMaterial({ color: '#8a8478', transparent: true, opacity: 0.12 + mood.wear * 0.2, depthWrite: false }), cx, my + 0.004, mantelZ, root, false).rotation.x = -Math.PI / 2;

    // ---------- the curtainless bay
    const sun = new THREE.Vector3(-7, 2.45 + (0.5 - Math.abs(mood.daylight - 0.5)) * 2.2, Math.min(3.9, 3.0 + (0.5 - mood.daylight) * 2.2)).normalize();
    const sky = new THREE.Color().setHSL(mix(0.57, 0.1, mood.warmth * mood.warmth), 0.7, mix(0.6, 0.72, mood.cheer));
    const glass = new THREE.MeshStandardMaterial({ color: sky, emissive: sky, emissiveIntensity: 0.6, transparent: true, opacity: 0.78, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
    const lead = a.house === 'thirties' ? new THREE.MeshStandardMaterial({ map: tex(128, 64, (c, w, h) => { c.fillStyle = '#f1e9c8'; c.fillRect(0, 0, w, h); const cols = ['#c9302b', '#3a8a55', '#e0a82a', '#2f6fb0']; for (let i = 0; i < 4; i++) { c.fillStyle = cols[i]; c.beginPath(); c.moveTo(16 + i * 32, 6); c.lineTo(30 + i * 32, 32); c.lineTo(16 + i * 32, 58); c.lineTo(2 + i * 32, 32); c.fill(); } c.strokeStyle = '#2a2a2c'; c.lineWidth = 3; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, h); c.stroke(); } c.strokeRect(0, 0, w, h); }), emissive: '#ffffff', emissiveIntensity: 0.35, emissiveMap: null, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }) : glass;
    const panes: THREE.Vector3[][] = [];
    const bayPts: [number, number][] = [[X0, bayB], [X0 - bayOut, bayB - 0.95], [X0 - bayOut, bayA + 0.95], [X0, bayA]];
    const sillY = a.house === 'seventies' ? 0.75 : 1.0, headY = 3.95;
    for (let i = 0; i < 3; i++) {
      const [x0, z0] = bayPts[i], [x1, z1] = bayPts[i + 1], len = Math.hypot(x1 - x0, z1 - z0);
      const g = new THREE.Group(); g.position.set(x0, 0, z0); g.rotation.y = Math.atan2(-(z1 - z0), x1 - x0); root.add(g);
      const part = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, g, false);
      const cut = i === 0; // the near face is cut away to sill height so the bay can be seen into
      part(len + 0.1, sillY, 0.25, len / 2, sillY / 2, -0.125, plainPaper); if (!cut) part(len + 0.1, H - headY, 0.25, len / 2, (H + headY) / 2, -0.125, plainPaper);
      part(len, skirtH, 0.06, len / 2, skirtH / 2, 0.03, trim); part(len + 0.1, 0.07, 0.42, len / 2, sillY + 0.035, 0.1, trim);
      const cols = a.house === 'seventies' ? (i === 1 ? 2 : 1) : i === 1 ? 3 : 1, fw = 0.13;
      const split = a.house === 'victorian' ? 0.5 : a.house === 'thirties' ? 0.74 : 0.8;
      const y0 = sillY + 0.07, yMid = mix(y0, headY, split);
      if (!cut) { part(len, fw, 0.16, len / 2, y0 + fw / 2, -0.1, trim); part(len, fw, 0.16, len / 2, headY - fw / 2, -0.1, trim); part(len, fw * 0.8, 0.14, len / 2, yMid, -0.1, trim);
      for (let k = 0; k <= cols; k++) part(fw, headY - y0, 0.16, mix(fw / 2, len - fw / 2, k / cols), (y0 + headY) / 2, -0.1, trim); }
      g.updateMatrix();
      for (let k = 0; k < cols; k++) for (const [lo, hi, top] of [[y0 + fw, yMid - fw * 0.4, false], [yMid + fw * 0.4, headY - fw, true]] as const) {
        const xa = mix(fw / 2, len - fw / 2, k / cols) + fw / 2, xb = mix(fw / 2, len - fw / 2, (k + 1) / cols) - fw / 2;
        if (!cut) add(new THREE.PlaneGeometry(xb - xa, hi - lo), top ? lead : glass, (xa + xb) / 2, (lo + hi) / 2, -0.1, g, false).renderOrder = 2;
        panes.push([[xa, lo], [xb, lo], [xb, hi], [xa, hi]].map(([px, py]) => new THREE.Vector3(px, py, -0.1).applyMatrix4(g.matrix)));
      }
    }
    // bay floor and a bare curtain pole
    const bayFloor = new THREE.Shape(); bayPts.forEach(([x, z], i) => (i ? bayFloor.lineTo(x, -z) : bayFloor.moveTo(x, -z)));
    const bf = add(new THREE.ShapeGeometry(bayFloor), flat(woodBase, 0.62), 0, 0.002, 0, root, false); bf.rotation.x = -Math.PI / 2;
    const pole = add(new THREE.CylinderGeometry(0.045, 0.045, bayB - bayA + 0.5, 10), flat(a.house === 'seventies' ? '#d9d9d6' : '#6a4326', 0.4), X0 + 0.22, 4.15, (bayA + bayB) / 2 - 0.2, root, false); pole.rotation.x = Math.PI / 2;
    for (const z of [bayA - 0.45, bayB + 0.05]) add(new THREE.SphereGeometry(0.09, 10, 8), flat('#6a4326', 0.4), X0 + 0.22, 4.15, z, root, false);
    const ringsN = 3 + Math.floor(random() * 5); for (let i = 0; i < ringsN; i++) { const r = add(new THREE.TorusGeometry(0.075, 0.012, 6, 14), flat('#c9a23f', 0.3, { metalness: 0.8 }), X0 + 0.22, 4.13, bayA + 0.1 + random() * 0.9 + (i % 2) * (bayB - bayA - 1.1), root, false); r.rotation.z = (random() - 0.5) * 0.4; }
    box(0.2, 0.05, 0.05, X0 + 0.1, 4.15, bayA - 0.2, trim, false);
    box(0.06, 0.5, 0.06, X0 - 0.7, 4.3, bayA + 0.6, trim, false);

    // ---------- the sun through the panes, laid on the floor
    const glow = new THREE.Color().setHSL(mix(0.14, 0.07, mood.warmth), 0.85, 0.5).multiplyScalar(mix(0.28, 0.6, mood.cheer * 0.6 + 0.4 * (1 - Math.abs(mood.daylight - 0.5))));
    const beamMat = new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const verts: number[] = [];
    for (const quad of panes) {
      const q = quad.map((p) => { const t = (p.y - 0.014) / sun.y; return new THREE.Vector3(p.x - sun.x * t, 0.014, p.z - sun.z * t); });
      if (q.some((p) => p.x > W / 2 - 0.1 || p.z < Z0 + 0.1)) continue;
      for (const i of [0, 1, 2, 0, 2, 3]) verts.push(q[i].x, q[i].y, q[i].z);
    }
    const beamGeo = new THREE.BufferGeometry(); beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const beam = new THREE.Mesh(beamGeo, beamMat); beam.renderOrder = 1; root.add(beam);

    // dust turning in the beam
    const moteCount = 50 + Math.round(mood.wear * 80), motes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 5, 4), new THREE.MeshBasicMaterial({ color: '#fff3cf', transparent: true, opacity: 0.85, depthWrite: false }), moteCount);
    const moteAt = Array.from({ length: moteCount }, () => { const t = random(), z = mix(bayA + 0.9, bayB - 0.9, random()), y = mix(1.2, 3.6, random()); return { x: X0 - bayOut - sun.x * t * (y / sun.y), y: y * (1 - t), z: z - sun.z * t * (y / sun.y), phase: random() * 6.3, rate: 0.3 + random() * 0.7 }; });
    const m4 = new THREE.Matrix4();
    const placeMotes = (time: number) => { moteAt.forEach((p, i) => { m4.makeTranslation(p.x + Math.sin(time * p.rate * 0.4 + p.phase) * 0.12, Math.max(0.05, p.y + Math.sin(time * p.rate * 0.3 + p.phase * 2) * 0.15), p.z + Math.cos(time * p.rate * 0.35 + p.phase) * 0.12); motes.setMatrixAt(i, m4); }); motes.instanceMatrix.needsUpdate = true; };
    placeMotes(0); root.add(motes);

    // ---------- what was left
    const lx = cx - bw / 2 - 1.1, lz = Z0 + 0.5;
    if (a.left === 'broom') {
      const handle = add(new THREE.CylinderGeometry(0.035, 0.035, 3.1, 8), flat('#c9a56a', 0.6), lx + 0.55, 1.5, lz - 0.1); handle.rotation.set(-0.16, 0, -0.14);
      box(0.9, 0.16, 0.2, lx + 0.34, 0.2, lz + 0.14, flat('#8a3a2a', 0.6)); box(0.86, 0.22, 0.16, lx + 0.34, 0.08, lz + 0.16, flat('#d9b96a', 1));
      const pan = box(0.6, 0.04, 0.5, lx - 0.7, 0.03, lz + 0.6, flat('#3f6a8a', 0.5)); pan.rotation.y = 0.5; box(0.08, 0.05, 0.4, lx - 0.95, 0.06, lz + 0.2, flat('#3f6a8a', 0.5)).rotation.y = 0.5;
      const heap = add(new THREE.SphereGeometry(1, 12, 6), flat('#8f887a', 1), lx - 0.2, 0.03, lz + 1.0); heap.scale.set(0.45, 0.09, 0.32);
      s.scatter(new THREE.IcosahedronGeometry(1, 0), flat('#ffffff', 1), Array.from({ length: 16 }, () => ({ at: [lx - 0.2 + (random() - 0.5) * 0.9, 0.04, lz + 1.0 + (random() - 0.5) * 0.6] as [number, number, number], size: 0.02 + random() * 0.04, color: ['#7a7468', '#b9a888', '#d9d2c0', '#5a4a3a'][Math.floor(random() * 4)] })));
    } else if (a.left === 'bags') {
      const bag = flat('#1c1c20', 0.35);
      for (let i = 0; i < 2 + Math.round(mood.density); i++) { const x = lx - i * 0.95 + 0.3, r = 0.5 + random() * 0.14; const b = add(new THREE.SphereGeometry(1, 12, 9), bag, x, r * 0.8, lz + 0.35 + (i % 2) * 0.5); b.scale.set(r, r * 0.85, r * 0.9); const knot = add(new THREE.ConeGeometry(0.16, 0.34, 8), bag, x + 0.05, r * 1.62, lz + 0.35 + (i % 2) * 0.5); knot.rotation.z = Math.PI + 0.3; }
    } else if (a.left === 'ladder') {
      const alu = flat('#c3c7ca', 0.35, { metalness: 0.7 }), g = new THREE.Group(); g.position.set(lx - 0.2, 0, lz + 0.8); g.rotation.y = 0.5; root.add(g);
      for (const side of [-1, 1]) { const f = add(new THREE.BoxGeometry(0.06, 2.7, 0.1), alu, side * 0.42, 1.3, 0.38, g); f.rotation.x = 0.28; const b = add(new THREE.BoxGeometry(0.05, 2.7, 0.05), alu, side * 0.42, 1.3, -0.38, g); b.rotation.x = -0.28; }
      for (let i = 0; i < 5; i++) { const y = 0.4 + i * 0.48; add(new THREE.BoxGeometry(0.84, 0.05, 0.22), alu, 0, y, 0.74 - (y / 2.6) * 0.74, g); }
      add(new THREE.BoxGeometry(0.9, 0.06, 0.4), flat('#c9302b', 0.5), 0, 2.6, 0, g);
      add(new THREE.BoxGeometry(0.3, 0.2, 0.2), flat('#e8c53a', 0.7), 0.1, 2.73, 0, g);
    }
    // a few things nobody swept up
    const bits = Array.from({ length: Math.round(mood.density * 14 + mood.wear * 8) }, () => ({ at: [X0 + 0.5 + random() * (W - 1), 0.02, Z0 + 0.6 + random() * (D - 1)] as [number, number, number], size: 0.03 + random() * 0.05, color: ['#d9d2c0', '#8f887a', '#b9a888', '#efe8d2'][Math.floor(random() * 4)] }));
    if (bits.length) s.scatter(new THREE.BoxGeometry(1, 0.2, 1.4), flat('#ffffff', 1), bits);

    // ---------- light: the key comes low through the bay, with a soft bounce from the viewer's side
    const key = world.keyLight!;
    key.color.setHSL(mix(0.13, 0.07, mood.warmth), mix(0.3, 0.75, mood.warmth), mix(0.82, 0.74, Math.abs(mood.daylight - 0.5) * 2));
    key.intensity = 3.0;
    key.shadow.mapSize.set(2048, 2048);
    const bounce = new THREE.DirectionalLight('#fff1dc', 0.95); bounce.position.set(7, 6, 10); root.add(bounce);
    const basePlace = world.place.bind(world);
    world.place = (items) => {
      basePlace(items);
      const centre = key.target.position, span = key.position.distanceTo(centre);
      key.position.copy(centre).addScaledVector(sun, span);
    };
    const drift = mix(0.15, 1.6, mood.energy);
    world.update = (_dt, time) => placeMotes(time * drift);
    return world;
  },
});
