import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const PX = 100; // wall textures are painted at 100 pixels to the metre
const sheet = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width); canvas.height = Math.round(height);
  return { canvas, ctx: canvas.getContext('2d')! };
};
const textureOf = (canvas: HTMLCanvasElement) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

export default defineWorld({
  questions: {
    place: choice('Whose neighbourhood is this gym in?', {
      philly: 'A cold northern mill town: red brick, a dark green painted dado flaking off, cast-iron radiators.',
      havana: 'The tropics: crumbling pastel plaster over brick, a floor fan, everything bleached and salt-eaten.',
      glazed: 'An old public bathhouse: white glazed tile to shoulder height with a green border, brick above.',
      whitewash: 'A bare loft: every wall limewashed long ago, grey and chalky now.',
    }),
    windows: choice('What are the tall windows like?', {
      arched: 'Arched iron-framed mill windows with a fan of panes at the top.',
      grid: 'Square steel factory grids, some panes boarded over with plywood.',
      shutters: 'Open holes with louvred wooden shutters folded back, no glass at all.',
      painted: 'Panes painted over in cream, with a few scraped clear so blades of light get in.',
    }),
    ring: choice('What is the ring in the corner like?', {
      tricolour: 'Red, white and blue ropes over pale canvas, a red skirt lettered BOXING.',
      hemp: 'Old hemp ropes sagging over grey stained canvas on bare timber trestles.',
      blue: 'White ropes over a sky-blue canvas, the skirt hand-lettered BOXEO with a star.',
      storage: 'Half dismantled: ropes down on two sides, the canvas piled with boxes and stacked chairs.',
    }),
    hour: choice('What hour is it in the gym?', {
      empty: 'Before anyone arrives: chairs stacked against the wall, a mop and bucket, nothing moved since last night.',
      early: 'The first one in: a kit bag and towel on a bench, a skipping rope dropped on the boards, one lamp lit.',
      fightnight: 'Fight night: rows of folding chairs facing the ring, bunting strung along the walls, the ring lamp blazing.',
      closing: 'Closing for good: posters taken down, cartons packed and stacked, a FOR LEASE banner across the wall.',
    }),
    dressing: choice('What stands along the back wall?', {
      lockers: 'A bank of dented steel lockers with a long changing bench.',
      mirror: 'A long shadow-boxing mirror, cracked in one corner, with a rail in front.',
      trophies: 'Shelves of tarnished trophies above an old steamer trunk.',
      papered: 'Nothing but fight posters from the floor up, and a bench to sit and look at them.',
    }),
    floor: choice('What is underfoot?', {
      boards: 'Bare wide floorboards, worn pale where feet have circled.',
      lines: 'Boards with footwork painted on them: a white circle, tape crosses, a ladder of rungs.',
      lino: 'Red and cream checkered lino worn through in ragged holes to the boards beneath.',
    }),
    sign: choice('What is hand-painted high on the wall?', {
      name: 'FRONT STREET GYM',
      barrio: 'GIMNASIO DEL BARRIO',
      made: 'CHAMPIONS ARE MADE HERE',
      sudor: 'SIN SUDOR NO HAY GLORIA',
      round: 'WIN THIS ROUND',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const WIDE = 14, DEEP = 11, WH = 5;
    const { art: s, world } = diorama(context, {
      background: mood.warmth > 0.5 ? '#ddd8c9' : '#d5d9d6', floor: '#8f7655', width: WIDE, depth: DEEP,
      maxHeight: 2.9, radius: 1.35, pitch: 30, yaw: 27,
      slots: [[1.2, 1.9], [4.1, -1.7], [-3.1, 3.1], [4.5, 3.2], [0.4, -2.5, 0, 0.8]],
    });
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const closing = a.hour === 'closing';
    const brickHue = a.place === 'havana' ? '#a8614a' : mood.warmth > 0.5 ? '#96483a' : '#874a42';
    const pastel = pick(mood.warmth > 0.5 ? ['#e3b06f', '#e59a8c', '#d9b77a'] : ['#7fbfb3', '#9db9d8', '#8fc4b8']);
    const dadoCol = a.place === 'philly' ? (mood.cheer > 0.5 ? '#3f6f58' : '#34503f') : a.place === 'havana' ? `#${new THREE.Color(pastel).multiplyScalar(0.72).getHexString()}` : '#3f6f58';

    // ---------- wall painter ----------
    const paintWall = (length: number, extra?: (c: Ctx) => void) => {
      const w = length * PX, h = WH * PX;
      const { canvas, ctx: c } = sheet(w, h);
      c.fillStyle = '#5c5048'; c.fillRect(0, 0, w, h);
      for (let row = 0; row * 8 < h; row++) for (let col = -1; col * 23 < w; col++) {
        const colour = new THREE.Color(brickHue).offsetHSL((random() - 0.5) * 0.02, (random() - 0.5) * 0.08, (random() - 0.5) * 0.11);
        if (random() < 0.05) colour.lerp(new THREE.Color('#3b302c'), 0.6);
        c.fillStyle = `#${colour.getHexString()}`; c.fillRect(col * 23 + (row % 2) * 11.5 + 1, row * 8 + 1, 21, 6.4);
      }
      // the paint or plaster coat, on its own layer so it can flake
      const coat = sheet(w, h); const p = coat.ctx;
      const yOf = (metres: number) => h - metres * PX;
      if (a.place === 'philly') {
        p.fillStyle = 'rgba(214,203,172,0.5)'; p.fillRect(0, 0, w, yOf(1.5));
        p.fillStyle = dadoCol; p.fillRect(0, yOf(1.5), w, 1.5 * PX);
        p.fillStyle = '#d8cfb2'; p.fillRect(0, yOf(1.56), w, 6);
      } else if (a.place === 'havana') {
        p.fillStyle = pastel; p.fillRect(0, 0, w, h);
        p.fillStyle = dadoCol; p.fillRect(0, yOf(1.3), w, 1.3 * PX);
        p.fillStyle = 'rgba(255,255,255,0.5)'; p.fillRect(0, yOf(1.34), w, 4);
      } else if (a.place === 'glazed') {
        p.fillStyle = 'rgba(214,203,172,0.3)'; p.fillRect(0, 0, w, yOf(2.2));
        p.fillStyle = '#e9e7dc'; p.fillRect(0, yOf(2.2), w, 2.2 * PX);
        p.fillStyle = 'rgba(90,100,95,0.5)';
        for (let y = yOf(2.2); y < h; y += 10) p.fillRect(0, y, w, 1);
        for (let row = 0, y = yOf(2.2); y < h; y += 10, row++) for (let x = (row % 2) * 10; x < w; x += 20) p.fillRect(x, y, 1, 10);
        p.fillStyle = '#2f6b55'; p.fillRect(0, yOf(2.2), w, 12); p.fillRect(0, yOf(1.1), w, 6);
      } else {
        p.fillStyle = 'rgba(216,211,198,0.93)'; p.fillRect(0, 0, w, h);
        p.fillStyle = 'rgba(120,118,110,0.35)'; p.fillRect(0, yOf(1.2), w, 1.2 * PX);
      }
      p.globalCompositeOperation = 'destination-out';
      const flakes = Math.round(length * mix(1.5, 9, mood.wear) * (a.place === 'glazed' ? 0.4 : 1));
      for (let i = 0; i < flakes; i++) {
        const x = random() * w, y = random() < 0.55 ? h - random() * random() * h : random() * h, r = (8 + random() * 44) * (0.5 + mood.wear);
        p.beginPath(); for (let k = 0; k < 10; k++) { const t = k / 10 * 6.283, rr = r * (0.5 + random() * 0.7); p.lineTo(x + Math.cos(t) * rr * 1.3, y + Math.sin(t) * rr); } p.fill();
      }
      for (let i = 0; i < flakes * 8; i++) p.fillRect(random() * w, random() * h, 2 + random() * 7, 2 + random() * 5);
      c.drawImage(coat.canvas, 0, 0);
      if (extra) extra(c);
      // damp, soot and a grubby tide line near the floor
      for (let i = 0; i < length * 3 * (0.4 + mood.wear); i++) { c.fillStyle = `rgba(25,20,16,${0.03 + random() * 0.06})`; c.beginPath(); c.ellipse(random() * w, random() * h, 30 + random() * 90, 30 + random() * 110, 0, 0, 7); c.fill(); }
      const g = c.createLinearGradient(0, h - 60, 0, h); g.addColorStop(0, 'rgba(30,24,18,0)'); g.addColorStop(1, `rgba(30,24,18,${0.25 + mood.wear * 0.3})`); c.fillStyle = g; c.fillRect(0, h - 60, w, 60);
      return canvas;
    };

    // ---------- small poster painter ----------
    const miniPoster = (c: Ctx, x: number, y: number, w: number, h: number, turn: number) => {
      const paper = pick(['#f0cf55', '#e6dbbd', '#efe2b0', '#e98a4a', '#e9e2cf', '#7fc0c0']);
      const es = a.sign === 'barrio' || a.sign === 'sudor' ? random() < 0.8 : random() < 0.2;
      c.save(); c.translate(x, y); c.rotate(turn);
      c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 4; c.fillStyle = paper; c.fillRect(-w / 2, -h / 2, w, h); c.shadowColor = 'transparent';
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#b3251c'; c.font = `bold ${Math.round(h * 0.2)}px serif`; c.fillText(es ? 'BOXEO' : 'BOXING', 0, -h * 0.36, w * 0.86);
      c.fillStyle = '#1d1a17'; c.fillRect(-w * 0.42, -h * 0.25, w * 0.84, h * 0.05);
      if (random() > 0.4) { for (const d of [-1, 1]) { c.beginPath(); c.arc(d * w * 0.2, -h * 0.05, w * 0.15, 0, 7); c.fill(); } }
      else { c.fillRect(-w * 0.36, -h * 0.14, w * 0.72, h * 0.07); c.fillRect(-w * 0.3, -h * 0.03, w * 0.6, h * 0.07); }
      c.fillRect(-w * 0.38, h * 0.12, w * 0.76, h * 0.08); c.fillStyle = '#b3251c'; c.fillRect(-w * 0.08, h * 0.22, w * 0.16, h * 0.035);
      c.fillStyle = '#1d1a17'; c.fillRect(-w * 0.38, h * 0.28, w * 0.76, h * 0.08);
      c.fillStyle = '#b3251c'; c.fillRect(-w * 0.42, h * 0.4, w * 0.84, h * 0.06);
      c.fillStyle = `rgba(110,80,40,${0.1 + mood.wear * 0.25})`; c.fillRect(-w / 2, -h / 2, w, h);
      if (random() < mood.wear) { c.fillStyle = `#${new THREE.Color(brickHue).getHexString()}`; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 - w * (0.2 + random() * 0.4), h / 2); c.lineTo(w / 2, h / 2 - h * (0.2 + random() * 0.3)); c.fill(); }
      c.restore();
    };

    // ---------- back wall ----------
    const signText = { name: 'FRONT STREET GYM', barrio: 'GIMNASIO DEL BARRIO', made: 'CHAMPIONS ARE MADE HERE', sudor: 'SIN SUDOR NO HAY GLORIA', round: 'WIN THIS ROUND' }[a.sign];
    const X = (worldX: number) => (worldX + WIDE / 2) * PX, Y = (metres: number) => (WH - metres) * PX;
    const backCanvas = paintWall(WIDE, (c) => {
      // the big hand-painted sign
      const light = a.place === 'havana' || a.place === 'whitewash';
      c.save(); c.globalAlpha = mix(0.96, 0.7, mood.wear);
      c.fillStyle = light ? '#7d231b' : '#e9dfc0';
      if (!light) { c.fillStyle = 'rgba(24,22,20,0.82)'; c.fillRect(X(-6.2), Y(4.72), 12.4 * PX, 0.98 * PX); c.fillStyle = '#e9dfc0'; }
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 74px serif';
      c.fillText(signText, X(0), Y(4.2), 11.6 * PX);
      c.fillRect(X(-6), Y(4.68), 12 * PX, 5); c.fillRect(X(-6), Y(3.79), 12 * PX, 5);
      c.restore();
      for (let i = 0; i < 60 + mood.wear * 500; i++) { c.fillStyle = `#${new THREE.Color(light ? (a.place === 'havana' ? pastel : '#d8d3c6') : brickHue).offsetHSL(0, 0, (random() - 0.5) * 0.08).getHexString()}`; c.fillRect(X(-6.2) + random() * 12.4 * PX, Y(4.72) + random() * 0.98 * PX, 2 + random() * 9, 2 + random() * 5); }
      // posters, or the pale ghosts of posters
      const low = a.dressing === 'papered' ? 0.5 : 2.25;
      const count = Math.round(mix(7, 20, mood.density) * (a.dressing === 'papered' ? 2 : 1));
      for (let i = 0; i < count; i++) {
        const w = (0.42 + random() * 0.26) * PX, h = w * 1.42;
        const wx = -1.3 + random() * 8.0, wy = low + 0.4 + random() * (3.45 - low - 0.6);
        const tilt = (random() - 0.5) * 0.16;
        if (closing) { c.save(); c.translate(X(wx), Y(wy)); c.rotate(tilt); c.fillStyle = 'rgba(240,228,200,0.26)'; c.fillRect(-w / 2, -h / 2, w, h); c.fillStyle = 'rgba(40,30,20,0.5)'; for (const d of [-1, 1]) c.fillRect(d * w * 0.44 - 1.5, -h * 0.47, 3, 3); c.restore(); }
        else miniPoster(c, X(wx), Y(wy), w, h, tilt);
      }
      if (closing) {
        c.save(); c.translate(X(2.6), Y(2.75)); c.rotate(-0.03);
        c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 8; c.fillStyle = '#f2ead2'; c.fillRect(-2.4 * PX, -0.42 * PX, 4.8 * PX, 0.84 * PX); c.shadowColor = 'transparent';
        c.strokeStyle = '#b3251c'; c.lineWidth = 6; c.strokeRect(-2.33 * PX, -0.35 * PX, 4.66 * PX, 0.7 * PX);
        c.fillStyle = '#b3251c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 62px sans-serif';
        c.fillText(a.sign === 'barrio' || a.sign === 'sudor' ? 'SE ALQUILA' : 'FOR LEASE', 0, 4, 4.3 * PX); c.restore();
      }
      if (a.dressing === 'trophies' && !closing) {
        for (let i = 0; i < 5; i++) { const fx = X(-0.8 + i * 1.0), fy = Y(3.0 + (i % 2) * 0.12); c.fillStyle = '#2e2119'; c.fillRect(fx - 30, fy - 24, 60, 48); c.fillStyle = '#c9b48c'; c.fillRect(fx - 24, fy - 18, 48, 36); c.fillStyle = '#5b4630'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(fx - 15 + k * 10, fy - 2, 4, 0, 7); c.fill(); c.fillRect(fx - 19 + k * 10, fy + 3, 8, 12); } }
      }
    });
    const brick = s.material(brickHue, { roughness: 0.95 });
    const stone = s.material('#8f8a7e', { roughness: 0.9 });
    s.box([WIDE + 0.3, WH, 0.3], [-0.15, WH / 2, -DEEP / 2 - 0.15], brick);
    s.mesh(new THREE.PlaneGeometry(WIDE, WH), new THREE.MeshStandardMaterial({ map: textureOf(backCanvas), roughness: 0.93 }), [0, WH / 2, -DEEP / 2 + 0.004]);
    s.box([WIDE + 0.4, 0.12, 0.4], [-0.15, WH + 0.06, -DEEP / 2 - 0.15], stone);
    s.box([WIDE, 0.16, 0.05], [0, 0.08, -DEEP / 2 + 0.03], s.material('#4a3a2c'));

    // ---------- left wall, with real window openings so the key light falls through ----------
    const windows = [2.3, 5.3, 8.3], WW = 1.6, SILL = 1.3, TOP = a.windows === 'arched' ? 3.5 : 4.2, APEX = a.windows === 'arched' ? TOP + WW / 2 : TOP;
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(DEEP, 0); shape.lineTo(DEEP, WH); shape.lineTo(0, WH); shape.lineTo(0, 0);
    for (const centre of windows) {
      const hole = new THREE.Path(); const l = centre - WW / 2, r = centre + WW / 2;
      hole.moveTo(l, SILL); hole.lineTo(r, SILL); hole.lineTo(r, TOP);
      if (a.windows === 'arched') hole.absarc(centre, TOP, WW / 2, 0, Math.PI, false); else hole.lineTo(l, TOP);
      hole.lineTo(l, SILL); shape.holes.push(hole);
    }
    const leftTex = textureOf(paintWall(DEEP)); leftTex.repeat.set(1 / DEEP, 1 / WH);
    const leftWall = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false, curveSegments: 12 }), new THREE.MeshStandardMaterial({ map: leftTex, roughness: 0.93 }), [-WIDE / 2, 0, -DEEP / 2]);
    leftWall.rotation.y = -Math.PI / 2;
    s.box([0.4, 0.12, DEEP + 0.1], [-WIDE / 2 - 0.15, WH + 0.06, 0], stone);
    s.box([0.05, 0.16, DEEP], [-WIDE / 2 + 0.03, 0.08, 0], s.material('#4a3a2c'));
    const ironFrame = s.material(a.windows === 'shutters' ? '#5d4a36' : '#2c3030', { metalness: 0.4, roughness: 0.6 });
    const panes: { at: [number, number, number]; size: number; color?: string }[] = [];
    const wx = -WIDE / 2 - 0.15;
    const openCells: [number, number, number, number][] = [];
    const ROWS = Math.round((TOP - SILL) / 0.58);
    for (const centre of windows) {
      const zc = centre - DEEP / 2;
      s.box([0.5, 0.08, WW + 0.2], [wx + 0.06, SILL - 0.04, zc], stone);
      if (a.windows === 'shutters') {
        for (let j = 0; j < ROWS; j++) for (let k = 0; k < 4; k++) openCells.push([SILL + j * (TOP - SILL) / ROWS, SILL + (j + 1) * (TOP - SILL) / ROWS, zc + (k - 2) * 0.4, zc + (k - 1) * 0.4]);
        for (const side of [-1, 1]) {
          const open = 0.5 + random() * 0.7 + (mood.wear > 0.6 && random() > 0.6 ? 0.4 : 0);
          const leaf = new THREE.Group(); leaf.position.set(wx + 0.16, 0, zc + side * WW / 2); leaf.rotation.y = side * (Math.PI / 2 - open) ; s.root.add(leaf);
          const lt = sheet(64, 256); lt.ctx.fillStyle = mood.cheer > 0.5 ? '#3f7f78' : '#5d6f5a'; lt.ctx.fillRect(0, 0, 64, 256); lt.ctx.fillStyle = 'rgba(0,0,0,0.4)'; for (let y = 10; y < 250; y += 9) lt.ctx.fillRect(7, y, 50, 4); lt.ctx.fillStyle = 'rgba(160,140,110,0.6)'; for (let i = 0; i < 30 * mood.wear; i++) lt.ctx.fillRect(random() * 64, random() * 256, 3 + random() * 8, 2 + random() * 5);
          const panel = s.box([0.05, TOP - SILL, WW / 2], [0, (TOP + SILL) / 2, side * -WW / 4], new THREE.MeshStandardMaterial({ map: textureOf(lt.canvas), roughness: 0.85 }));
          panel.removeFromParent(); leaf.add(panel);
        }
        for (let k = -1; k <= 1; k++) s.rod([wx, SILL, zc + k * 0.4], [wx, TOP, zc + k * 0.4], 0.012, ironFrame);
        continue;
      }
      for (let k = -1; k <= 1; k++) s.box([0.05, TOP - SILL, 0.04], [wx, (TOP + SILL) / 2, zc + k * 0.4], ironFrame);
      const rows = Math.round((TOP - SILL) / 0.58);
      for (let j = 1; j <= rows; j++) s.box([0.05, 0.04, WW], [wx, SILL + j * (TOP - SILL) / rows, zc], ironFrame);
      if (a.windows === 'arched') {
        for (const r of [0.4, 0.78]) { const arc = s.ring(r, 0.02, [wx, TOP, zc], ironFrame, Math.PI); arc.rotation.y = Math.PI / 2; }
        for (let k = 1; k < 4; k++) { const t = k * Math.PI / 4; s.rod([wx, TOP + Math.sin(t) * 0.4, zc + Math.cos(t) * 0.4], [wx, TOP + Math.sin(t) * 0.78, zc + Math.cos(t) * 0.78], 0.016, ironFrame); }
      }
      const glass = s.mesh(new THREE.PlaneGeometry(WW, APEX - SILL), new THREE.MeshBasicMaterial({ color: '#fff3cf', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }), [wx - 0.05, (APEX + SILL) / 2, zc]);
      glass.rotation.y = Math.PI / 2; glass.castShadow = false; glass.receiveShadow = false;
      const blocked = a.windows === 'painted' ? 0.72 : a.windows === 'grid' ? mix(0.08, 0.45, mood.wear) : mix(0, 0.12, mood.wear);
      if (a.windows === 'arched') openCells.push([TOP, APEX - 0.25, zc - 0.5, zc + 0.5]);
      for (let j = 0; j < rows; j++) for (let k = 0; k < 4; k++) if (random() >= blocked) openCells.push([SILL + j * (TOP - SILL) / rows, SILL + (j + 1) * (TOP - SILL) / rows, zc + (k - 2) * 0.4, zc + (k - 1) * 0.4]);
        else panes.push({ at: [wx, SILL + (j + 0.5) * (TOP - SILL) / rows, zc + (k - 1.5) * 0.4], size: 1, color: a.windows === 'painted' ? pick(['#ddd3b4', '#d2c8a8', '#c9c0a4']) : pick(['#a78558', '#8f7048', '#3a3a38']) });
    }
    if (panes.length) s.scatter(new THREE.BoxGeometry(0.03, (TOP - SILL) / Math.round((TOP - SILL) / 0.58) - 0.04, 0.36), new THREE.MeshStandardMaterial({ roughness: 0.9 }), panes);

    // ---------- floor ----------
    const FW = 1120, FH = 880, fx = (worldX: number) => (worldX + WIDE / 2) / WIDE * FW, fz = (worldZ: number) => (worldZ + DEEP / 2) / DEEP * FH;
    const floor = sheet(FW, FH); const f = floor.ctx;
    const boardBase = mood.warmth > 0.5 ? '#98764a' : '#8a765c';
    for (let y = 0; y < FH; y += 11) {
      let x = -random() * 200;
      while (x < FW) { const len = 160 + random() * 260; f.fillStyle = `#${new THREE.Color(boardBase).offsetHSL((random() - 0.5) * 0.015, (random() - 0.5) * 0.06, (random() - 0.5) * 0.09).getHexString()}`; f.fillRect(x, y, len - 1.5, 9.8); x += len; }
    }
    f.fillStyle = 'rgba(40,28,18,0.55)'; for (let y = 0; y < FH; y += 11) f.fillRect(0, y + 9.8, FW, 1.2);
    for (let i = 0; i < 120; i++) { f.fillStyle = 'rgba(60,40,22,0.35)'; f.beginPath(); f.ellipse(random() * FW, random() * FH, 3 + random() * 3, 2, 0, 0, 7); f.fill(); }
    // worn pale where feet circle; dark where nobody goes
    for (const [cx, cz, r] of [[1.2, 1.9, 2.2], [4.1, -1.7, 1.6], [-3.1, 3.1, 1.7], [4.5, 3.2, 1.6]] as const) { const g = f.createRadialGradient(fx(cx), fz(cz), 10, fx(cx), fz(cz), r * 80); g.addColorStop(0, `rgba(235,220,190,${0.2 + mood.wear * 0.25})`); g.addColorStop(1, 'rgba(235,220,190,0)'); f.fillStyle = g; f.fillRect(0, 0, FW, FH); }
    if (a.floor === 'lino') {
      const lino = sheet(FW, FH); const l = lino.ctx;
      for (let i = 0; i < 28; i++) for (let j = 0; j < 22; j++) { l.fillStyle = (i + j) % 2 ? (mood.cheer > 0.5 ? '#9c3b30' : '#6f3a33') : '#d9cfb2'; l.fillRect(i * 40, j * 40, 40, 40); }
      l.fillStyle = 'rgba(40,30,20,0.18)'; l.fillRect(0, 0, FW, FH);
      l.globalCompositeOperation = 'destination-out';
      const holes = Math.round(mix(8, 34, mood.wear));
      for (let i = 0; i < holes; i++) {
        const central = random() < 0.6; const x = central ? fx(-2 + random() * 8) : random() * FW, y = central ? fz(-1 + random() * 5.5) : random() * FH, r = 20 + random() * 80 * (0.5 + mood.wear);
        l.beginPath(); for (let k = 0; k < 12; k++) { const t = k / 12 * 6.283, rr = r * (0.5 + random() * 0.7); l.lineTo(x + Math.cos(t) * rr * 1.4, y + Math.sin(t) * rr); } l.fill();
      }
      f.drawImage(lino.canvas, 0, 0);
    } else if (a.floor === 'lines') {
      f.strokeStyle = `rgba(240,236,220,${mix(0.95, 0.6, mood.wear)})`; f.lineWidth = 7;
      f.beginPath(); f.arc(fx(1.2), fz(1.9), 1.75 * 80, 0, 7); f.stroke();
      for (const [cx, cz] of [[4.1, -1.7], [-3.1, 3.1], [4.5, 3.2], [0.4, -2.5]] as const) { f.beginPath(); f.moveTo(fx(cx) - 22, fz(cz) - 22); f.lineTo(fx(cx) + 22, fz(cz) + 22); f.moveTo(fx(cx) + 22, fz(cz) - 22); f.lineTo(fx(cx) - 22, fz(cz) + 22); f.stroke(); }
      f.lineWidth = 5; const lx0 = fx(-1.6), lz0 = fz(4.55);
      f.strokeRect(lx0, lz0, 5.6 * 80, 46); for (let i = 1; i < 12; i++) { f.beginPath(); f.moveTo(lx0 + i * 5.6 * 80 / 12, lz0); f.lineTo(lx0 + i * 5.6 * 80 / 12, lz0 + 46); f.stroke(); }
      f.fillStyle = '#b3251c'; f.fillRect(fx(6.2), fz(-1), 8, 4.5 * 80);
    }
    for (let i = 0; i < 30 + mood.wear * 90; i++) { f.fillStyle = `rgba(30,22,14,${0.04 + random() * 0.09})`; f.beginPath(); f.ellipse(random() * FW, random() * FH, 14 + random() * 70, 8 + random() * 40, random() * 3, 0, 7); f.fill(); }
    const ground = world.ground as THREE.Mesh;
    const plainFloor = ground.material as THREE.Material;
    ground.material = [plainFloor, plainFloor, new THREE.MeshStandardMaterial({ map: textureOf(floor.canvas), roughness: 0.82 }), plainFloor, plainFloor, plainFloor];

    // ---------- the ring ----------
    const RX = -4.0, RZ = -2.75, R = 2.3, PH = 0.8;
    const ringCol = { tricolour: '#a8231c', hemp: '#4a3a2c', blue: '#1f6b4f', storage: '#3b3d42' }[a.ring];
    const canvasCol = { tricolour: '#e2dcc8', hemp: '#bdb7a4', blue: '#7fb2d6', storage: '#c9c3b0' }[a.ring];
    const ringTop = sheet(512, 512); const rc = ringTop.ctx;
    rc.fillStyle = canvasCol; rc.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 60; i++) { rc.fillStyle = `rgba(70,60,48,${0.03 + random() * 0.05 * (0.4 + mood.wear * 1.6)})`; rc.beginPath(); rc.ellipse(random() * 512, random() * 512, 12 + random() * 60, 8 + random() * 40, random() * 3, 0, 7); rc.fill(); }
    if (a.ring === 'hemp' || mood.wear > 0.6) for (let i = 0; i < 9; i++) { rc.fillStyle = `rgba(110,40,28,${0.2 + random() * 0.25})`; rc.beginPath(); rc.ellipse(random() * 512, random() * 512, 6 + random() * 22, 5 + random() * 14, random() * 3, 0, 7); rc.fill(); }
    if (a.ring === 'blue') { rc.strokeStyle = 'rgba(255,255,255,0.8)'; rc.lineWidth = 8; rc.beginPath(); rc.arc(256, 256, 96, 0, 7); rc.stroke(); rc.fillStyle = 'rgba(255,255,255,0.85)'; rc.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 26 : 62, t = i / 10 * 6.283 - Math.PI / 2; rc.lineTo(256 + Math.cos(t) * r, 256 + Math.sin(t) * r); } rc.fill(); }
    rc.strokeStyle = ringCol; rc.lineWidth = 22; rc.strokeRect(0, 0, 512, 512);
    const timber = s.material('#6f5238', { roughness: 0.85 });
    const darkTimber = s.material('#33271f', { roughness: 0.95 });
    s.box([R * 2, 0.14, R * 2], [RX, PH - 0.07, RZ], s.material(ringCol));
    const top = s.mesh(new THREE.PlaneGeometry(R * 2, R * 2), new THREE.MeshStandardMaterial({ map: textureOf(ringTop.canvas), roughness: 0.95 }), [RX, PH + 0.004, RZ]); top.rotation.x = -Math.PI / 2;
    if (a.ring === 'hemp') {
      s.box([R * 2 - 0.5, PH - 0.14, R * 2 - 0.5], [RX, (PH - 0.14) / 2, RZ], darkTimber);
      for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) s.box([0.12, PH - 0.14, 0.12], [RX + dx * (R - 0.1), (PH - 0.14) / 2, RZ + dz * (R - 0.1)], timber);
      s.rod([RX - R + 0.1, 0.08, RZ + R - 0.1], [RX, PH - 0.2, RZ + R - 0.1], 0.035, timber); s.rod([RX + R - 0.1, 0.08, RZ + R - 0.1], [RX, PH - 0.2, RZ + R - 0.1], 0.035, timber);
      s.rod([RX + R - 0.1, 0.08, RZ - R + 0.1], [RX + R - 0.1, PH - 0.2, RZ], 0.035, timber); s.rod([RX + R - 0.1, 0.08, RZ + R - 0.1], [RX + R - 0.1, PH - 0.2, RZ], 0.035, timber);
    } else {
      s.box([R * 2 - 0.04, PH - 0.14, R * 2 - 0.04], [RX, (PH - 0.14) / 2, RZ], darkTimber);
      const skirt = () => { const k = sheet(1024, 148); const c = k.ctx; c.fillStyle = ringCol; c.fillRect(0, 0, 1024, 148);
        c.fillStyle = '#f0e6c8'; c.textAlign = 'center'; c.textBaseline = 'middle';
        if (a.ring === 'blue') { c.font = 'italic bold 104px serif'; c.fillText('★ BOXEO ★', 512, 80, 900); }
        else if (a.ring === 'tricolour') { c.font = 'bold 112px sans-serif'; c.fillText('BOXING', 512, 82, 820); c.fillRect(0, 0, 1024, 10); }
        else { c.fillStyle = 'rgba(255,255,255,0.12)'; for (let x = 0; x < 1024; x += 64) c.fillRect(x, 0, 3, 148); }
        for (let i = 0; i < 30 * (0.3 + mood.wear); i++) { c.fillStyle = `rgba(20,16,12,${0.08 + random() * 0.12})`; c.beginPath(); c.ellipse(random() * 1024, 80 + random() * 68, 20 + random() * 60, 10 + random() * 30, 0, 0, 7); c.fill(); }
        return new THREE.MeshStandardMaterial({ map: textureOf(k.canvas), roughness: 0.9 }); };
      s.mesh(new THREE.PlaneGeometry(R * 2, PH - 0.14), skirt(), [RX, (PH - 0.14) / 2, RZ + R - 0.012]);
      s.mesh(new THREE.PlaneGeometry(R * 2, PH - 0.14), skirt(), [RX + R - 0.012, (PH - 0.14) / 2, RZ]).rotation.y = Math.PI / 2;
    }
    const post = s.material('#3c4043', { metalness: 0.6, roughness: 0.45 });
    const PI = R - 0.22;
    const padCols = a.ring === 'hemp' ? ['#6a4a34', '#6a4a34', '#6a4a34', '#6a4a34'] : a.ring === 'storage' ? ['#8a8d90', '#8a8d90', '#8a8d90', '#8a8d90'] : ['#b8281f', '#e9e5d8', '#2452a8', '#e9e5d8'];
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([dx, dz], index) => {
      s.cylinder(0.05, 0.06, 1.55, [RX + dx * PI, PH + 0.775, RZ + dz * PI], post, 12);
      s.box([0.2, 1.15, 0.2], [RX + dx * (PI - 0.13), PH + 0.9, RZ + dz * (PI - 0.13)], s.material(padCols[index], { roughness: 0.5 })).rotation.y = Math.PI / 4;
    });
    const ropeCols = { tricolour: ['#b8281f', '#e9e5d8', '#2452a8', '#b8281f'], hemp: ['#a58a5c', '#a58a5c', '#a58a5c', '#a58a5c'], blue: ['#ece8dc', '#ece8dc', '#ece8dc', '#ece8dc'], storage: ['#8f8a7c', '#8f8a7c', '#8f8a7c', '#8f8a7c'] }[a.ring];
    const ropeMats = ropeCols.map((colour) => s.material(colour, { roughness: 0.7 }));
    const sag = (a.ring === 'hemp' ? 0.14 : 0.03) + mood.wear * 0.07;
    const sides: [number, number, number, number][] = [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]];
    sides.forEach(([ax, az, bx, bz], sideIndex) => {
      const down = a.ring === 'storage' && (sideIndex === 1 || sideIndex === 2);
      for (let i = 0; i < 4; i++) {
        const y = PH + 0.42 + i * 0.31, from: [number, number, number] = [RX + ax * PI, y, RZ + az * PI], to: [number, number, number] = [RX + bx * PI, y, RZ + bz * PI];
        if (down) { if (i > 0) continue; s.tube([from, [RX + (ax + bx) / 2 * PI + (random() - 0.5), PH + 0.03, RZ + (az + bz) / 2 * PI + (random() - 0.5)], [RX + bx * PI * 0.6 + ax * PI * 0.3, PH + 0.03, RZ + bz * PI * 0.6 + az * PI * 0.3]], 0.022, ropeMats[i]); continue; }
        s.tube([from, [(from[0] + to[0]) / 2, y - sag * (0.6 + random() * 0.8), (from[2] + to[2]) / 2], to], 0.022, ropeMats[i]);
      }
    });
    // steps up to the apron and a stool in the near corner
    const stepX = RX + 1.3;
    for (let i = 0; i < 3; i++) s.box([0.9, 0.05, 0.26], [stepX, 0.2 + i * 0.2, RZ + R + 0.62 - i * 0.24], timber);
    for (const d of [-1, 1]) s.box([0.05, 0.6, 0.74], [stepX + d * 0.45, 0.3, RZ + R + 0.37], darkTimber);
    if (a.ring !== 'storage') {
      const sx = RX + PI - 0.55, sz = RZ + PI - 0.55;
      s.cylinder(0.17, 0.17, 0.035, [sx, PH + 0.46, sz], timber, 16);
      for (let k = 0; k < 3; k++) { const t = k * 2.094; s.rod([sx + Math.cos(t) * 0.16, PH, sz + Math.sin(t) * 0.16], [sx + Math.cos(t) * 0.09, PH + 0.45, sz + Math.sin(t) * 0.09], 0.014, timber); }
      if (mood.density > 0.3) s.box([0.5, 0.34, 0.04], [RX + PI * 0.3, PH + 1.2, RZ + PI + 0.02], s.material('#ece7d8', { roughness: 1 }));
      if (mood.density > 0.5) s.lathe([[0.001, 0], [0.11, 0], [0.14, 0.28], [0.135, 0.28]], s.material('#8a9196', { metalness: 0.6, roughness: 0.45, side: THREE.DoubleSide }), [sx - 0.45, PH, sz + 0.2]);
    } else {
      const carton = s.material('#a98658', { roughness: 0.95 });
      for (let i = 0; i < 7; i++) { const w = 0.5 + random() * 0.4, h = 0.35 + random() * 0.3; s.box([w, h, 0.5 + random() * 0.3], [RX - 1.2 + random() * 2.4, PH + h / 2 + (i > 4 ? 0.5 : 0), RZ - 1.2 + random() * 2.2], carton).rotation.y = (random() - 0.5) * 0.6; }
      for (let i = 0; i < 6; i++) s.box([0.46, 0.92, 0.035], [RX + 1.0 + i * 0.05, PH + 0.46, RZ + 0.9 + i * 0.045], s.material(i % 2 ? '#7a2d24' : '#6f777b', { metalness: 0.3 })).rotation.x = -0.18;
      const roll = s.cylinder(0.16, 0.16, 2.6, [RX - 0.3, PH + 0.16, RZ + 1.5], s.material('#b9b29e', { roughness: 1 }), 14); roll.rotation.z = Math.PI / 2; roll.rotation.y = 0.2;
    }

    // ---------- slabs of light through the windows, pane by pane ----------
    {
      const kx = 0.95, kz = mix(-0.55, 0.3, mood.daylight), gap = 0.035, wallX = -WIDE / 2 + 0.02;
      const positions: number[] = [];
      for (const [y0, y1, z0, z1] of openCells) {
        const ym = (y0 + y1) / 2, zm = (z0 + z1) / 2;
        const onRing = Math.abs(wallX + (ym - PH) * kx - RX) < R && Math.abs(zm + (ym - PH) * kz - RZ) < R;
        const base = onRing ? PH : 0;
        const land = (y: number, z: number) => [Math.min(wallX + (y - base) * kx, WIDE / 2), base + 0.014, z + (y - base) * kz];
        const q = [land(y0 + gap, z0 + gap), land(y0 + gap, z1 - gap), land(y1 - gap, z1 - gap), land(y1 - gap, z0 + gap)];
        for (const i of [0, 1, 2, 0, 2, 3]) positions.push(...q[i]);
      }
      if (positions.length) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.computeVertexNormals();
        const night = a.hour === 'fightnight' ? 0.45 : 1;
        const slabs = s.mesh(geometry, new THREE.MeshBasicMaterial({ color: mood.warmth > 0.5 ? '#ffe9b0' : '#f4f1dc', transparent: true, opacity: 0.4 * night, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        slabs.castShadow = false; slabs.receiveShadow = false;
      }
    }

    // ---------- lamps ----------
    const dimDay = Math.abs(mood.daylight - 0.5) * 2;
    const lampOn = a.hour === 'fightnight' ? 1 : a.hour === 'early' ? 0.8 : a.hour === 'empty' ? 0.12 : 0.05;
    const bulb = new THREE.MeshStandardMaterial({ color: '#fff1c2', emissive: '#ffd27a', emissiveIntensity: lampOn * mix(1.2, 3, dimDay) });
    const enamel = s.material('#2c5d4c', { side: THREE.DoubleSide, roughness: 0.4 });
    const iron = s.material('#2b2e30', { metalness: 0.6, roughness: 0.5 });
    // a pipe braced across the corner carries the ring lamp
    s.rod([-WIDE / 2, 4.6, RZ], [RX + 0.2, 4.6, RZ], 0.035, iron);
    s.rod([-WIDE / 2, 3.6, RZ], [RX - 0.6, 4.58, RZ], 0.022, iron);
    const pendant = new THREE.Group(); pendant.position.set(RX, 4.6, RZ); s.root.add(pendant);
    const hang = (mesh: THREE.Mesh, parent: THREE.Object3D) => { mesh.removeFromParent(); parent.add(mesh); return mesh; };
    hang(s.rod([0, 0, 0], [0, -1.0, 0], 0.012, iron), pendant);
    hang(s.lathe([[0.04, 0.16], [0.12, 0.12], [0.5, 0], [0.52, -0.02]], enamel, [0, -1.17, 0]), pendant);
    hang(s.ball([0.07, 0.09, 0.07], [0, -1.15, 0], bulb, 12), pendant);
    if (lampOn > 0.5) {
      const cone = hang(s.mesh(new THREE.CylinderGeometry(0.45, 2.1, 2.5, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe6a8', transparent: true, opacity: 0.09, depthWrite: false, side: THREE.DoubleSide }), [0, -2.45, 0]), pendant);
      cone.castShadow = false; cone.receiveShadow = false;
    }
    for (const lx of [-3.2, 3.2]) {
      s.tube([[lx, 4.86, -DEEP / 2], [lx, 5.0, -DEEP / 2 + 0.25], [lx, 4.93, -DEEP / 2 + 0.5]], 0.018, iron);
      s.lathe([[0.02, 0.1], [0.06, 0.08], [0.2, 0], [0.205, -0.01]], enamel, [lx, 4.85, -DEEP / 2 + 0.5]).rotation.x = 0.3;
      s.ball([0.045, 0.055, 0.045], [lx, 4.84, -DEEP / 2 + 0.49], bulb, 8);
    }

    // ---------- the wall-hung heavy bag ----------
    const BX = 5.55, BZ = -DEEP / 2 + 1.25;
    s.box([0.1, 0.14, 1.4], [BX, 3.75, -DEEP / 2 + 0.7], iron);
    s.rod([BX, 2.75, -DEEP / 2 + 0.02], [BX, 3.7, -DEEP / 2 + 1.2], 0.03, iron);
    s.box([0.3, 1.3, 0.03], [BX, 3.25, -DEEP / 2 + 0.02], iron);
    const bag = new THREE.Group(); bag.position.set(BX, 3.68, BZ); s.root.add(bag);
    hang(s.rod([0, 0, 0], [0, -0.55, 0], 0.012, post), bag);
    for (let k = 0; k < 4; k++) { const t = k * Math.PI / 2 + 0.4; hang(s.rod([0, -0.55, 0], [Math.cos(t) * 0.19, -0.85, Math.sin(t) * 0.19], 0.008, post), bag); }
    const bagCol = pick(['#6f2a22', '#3a2c26', '#8a5a34', '#2f2d2c']);
    hang(s.lathe([[0.001, -0.82], [0.17, -0.84], [0.215, -0.9], [0.22, -1.9], [0.19, -2.04], [0.001, -2.07]], s.material(bagCol, { roughness: 0.6 })), bag);
    const tapes = 1 + Math.round(mood.wear * 3);
    for (let k = 0; k < tapes; k++) hang(s.cylinder(0.224, 0.224, 0.07 + random() * 0.08, [0, -1.1 - random() * 0.75, 0], s.material('#a7abad', { metalness: 0.3, roughness: 0.5 }), 20), bag);

    // ---------- along the back wall ----------
    const BWZ = -DEEP / 2;
    const bench = (cx: number, cz: number, length: number, turn = 0) => {
      const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = turn; s.root.add(g);
      hang(s.box([length, 0.06, 0.36], [0, 0.45, 0], timber), g);
      for (const d of [-1, 1]) { hang(s.box([0.06, 0.42, 0.3], [d * (length / 2 - 0.25), 0.21, 0], darkTimber), g); }
      hang(s.box([length - 0.5, 0.05, 0.05], [0, 0.16, 0], darkTimber), g);
      return g;
    };
    if (a.dressing === 'lockers') {
      const lk = sheet(1024, 512); const c = lk.ctx; const doors = 7;
      const base = mood.warmth > 0.5 ? '#8a8263' : '#667379';
      for (let i = 0; i < doors; i++) {
        const x = i * 1024 / doors, w = 1024 / doors; const open = random() < 0.12 + mood.wear * 0.15;
        c.fillStyle = open ? '#17181a' : `#${new THREE.Color(base).offsetHSL(0, 0, (random() - 0.5) * 0.07).getHexString()}`; c.fillRect(x + 3, 4, w - 6, 504);
        if (open) continue;
        c.fillStyle = 'rgba(15,15,15,0.7)'; for (let k = 0; k < 5; k++) { c.fillRect(x + w * 0.22, 40 + k * 16, w * 0.56, 7); c.fillRect(x + w * 0.22, 420 + k * 16, w * 0.56, 7); }
        c.fillStyle = '#d8d2bd'; c.fillRect(x + w * 0.36, 140, w * 0.28, 34); c.fillStyle = '#1e1c1a'; c.font = 'bold 26px monospace'; c.textAlign = 'center'; c.fillText(`${i + 11}`, x + w / 2, 166);
        c.fillStyle = '#22252a'; c.fillRect(x + w * 0.74, 240, 12, 44);
        if (random() < 0.4) { c.fillStyle = pick(['#f0cf55', '#e9e2cf', '#b3251c']); c.fillRect(x + w * 0.3, 200 + random() * 120, w * 0.34, 46); }
        for (let k = 0; k < 10 * mood.wear; k++) { c.fillStyle = 'rgba(110,60,25,0.45)'; c.beginPath(); c.ellipse(x + random() * w, random() * 512, 3 + random() * 12, 3 + random() * 8, 0, 0, 7); c.fill(); }
      }
      s.box([4.4, 1.95, 0.5], [1.3, 0.975, BWZ + 0.27], s.material(base, { metalness: 0.35 }));
      s.mesh(new THREE.PlaneGeometry(4.4, 1.95), new THREE.MeshStandardMaterial({ map: textureOf(lk.canvas), roughness: 0.6, metalness: 0.3 }), [1.3, 0.975, BWZ + 0.525]);
      bench(1.3, BWZ + 1.05, 3.4);
      if (mood.density > 0.4) for (let i = 0; i < 3; i++) s.box([0.4 + random() * 0.3, 0.2 + random() * 0.15, 0.36], [-0.4 + i * 1.6 + random() * 0.4, 2.05 + 0.1, BWZ + 0.27], s.material(pick(['#a98658', '#5a4a3a', '#7a2d24'])));
    } else if (a.dressing === 'mirror') {
      const mr = sheet(512, 256); const c = mr.ctx;
      const g = c.createLinearGradient(0, 0, 512, 256); g.addColorStop(0, '#b9cbd0'); g.addColorStop(0.5, '#dfe8e6'); g.addColorStop(1, '#9fb2b8'); c.fillStyle = g; c.fillRect(0, 0, 512, 256);
      c.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 4; i++) { c.beginPath(); const x = 40 + i * 130; c.moveTo(x, 256); c.lineTo(x + 70, 0); c.lineTo(x + 100, 0); c.lineTo(x + 30, 256); c.fill(); }
      c.strokeStyle = 'rgba(40,50,55,0.8)'; c.lineWidth = 1.5; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(470, 30); let x = 470, y = 30; for (let k = 0; k < 5; k++) { x += Math.cos(i * 0.7) * 26 + (random() - 0.5) * 16; y += Math.sin(i * 0.7) * 26 + (random() - 0.5) * 16; c.lineTo(x, y); } c.stroke(); }
      for (let i = 0; i < 26 * (0.3 + mood.wear); i++) { c.fillStyle = `rgba(70,60,45,${0.15 + random() * 0.25})`; c.beginPath(); c.ellipse(random() < 0.5 ? random() * 512 : pick([4, 508]), random() < 0.5 ? pick([4, 252]) : random() * 256, 4 + random() * 16, 4 + random() * 12, 0, 0, 7); c.fill(); }
      s.box([4.5, 2.0, 0.06], [1.3, 1.45, BWZ + 0.04], darkTimber);
      s.mesh(new THREE.PlaneGeometry(4.34, 1.84), new THREE.MeshStandardMaterial({ map: textureOf(mr.canvas), roughness: 0.15, metalness: 0.3 }), [1.3, 1.45, BWZ + 0.075]);
      s.rod([-0.9, 0.95, BWZ + 0.45], [3.5, 0.95, BWZ + 0.45], 0.03, timber);
      for (const x of [-0.8, 1.3, 3.4]) { s.rod([x, 0, BWZ + 0.45], [x, 0.95, BWZ + 0.45], 0.022, iron); }
    } else if (a.dressing === 'trophies') {
      const gold = s.material('#c9a23f', { metalness: 0.85, roughness: mix(0.25, 0.6, mood.wear) }), silver = s.material('#b7bcc0', { metalness: 0.85, roughness: 0.35 });
      for (const [y, n] of [[1.45, 5], [2.2, 4]] as const) {
        s.box([4.2, 0.05, 0.34], [1.3, y, BWZ + 0.19], timber);
        for (const x of [-0.6, 1.3, 3.2]) s.rod([x, y - 0.02, BWZ + 0.32], [x, y - 0.34, BWZ + 0.02], 0.015, iron);
        for (let i = 0; i < n; i++) {
          if (closing && random() < 0.6) continue;
          const x = -0.5 + (i + random() * 0.5) * 3.8 / n, k = 0.7 + random() * 0.8;
          s.lathe([[0.09 * k, 0], [0.09 * k, 0.05 * k], [0.03 * k, 0.07 * k], [0.02 * k, 0.2 * k], [0.05 * k, 0.24 * k], [0.11 * k, 0.4 * k], [0.12 * k, 0.5 * k], [0.1 * k, 0.5 * k]], random() > 0.3 ? gold : silver, [x, y + 0.025, BWZ + 0.2]);
        }
      }
      s.box([1.3, 0.6, 0.6], [1.3, 0.3, BWZ + 0.4], s.material('#4f3a2a', { roughness: 0.8 }));
      for (const x of [0.85, 1.75]) s.box([0.06, 0.62, 0.62], [x, 0.3, BWZ + 0.4], s.material('#b08d3c', { metalness: 0.7, roughness: 0.4 }));
      s.box([1.34, 0.08, 0.64], [1.3, 0.62, BWZ + 0.4], s.material('#3f2e21', { roughness: 0.8 }));
    } else bench(1.3, BWZ + 0.5, 3.6);
    // a wall clock stopped at twenty to six
    const clock = sheet(128, 128); const k = clock.ctx; k.fillStyle = '#efe9d6'; k.beginPath(); k.arc(64, 64, 62, 0, 7); k.fill(); k.fillStyle = '#1e1c1a';
    for (let i = 0; i < 12; i++) { const t = i / 12 * 6.283; k.fillRect(64 + Math.cos(t) * 50 - 2, 64 + Math.sin(t) * 50 - 2, 5, 5); }
    k.strokeStyle = '#1e1c1a'; k.lineCap = 'round'; k.lineWidth = 6; k.beginPath(); k.moveTo(64, 64); k.lineTo(64 - 12, 64 + 30); k.stroke(); k.lineWidth = 4; k.beginPath(); k.moveTo(64, 64); k.lineTo(64 - 40, 64 + 22); k.stroke();
    s.cylinder(0.3, 0.3, 0.07, [-0.75, 3.35, BWZ + 0.04], iron, 28).rotation.x = Math.PI / 2;
    s.mesh(new THREE.CircleGeometry(0.265, 28), new THREE.MeshStandardMaterial({ map: textureOf(clock.canvas), roughness: 0.5 }), [-0.75, 3.35, BWZ + 0.08]);

    // ---------- under the front window ----------
    const LX = -WIDE / 2 + 0.28, FZW = windows[2] - DEEP / 2;
    let fan: THREE.Object3D | null = null;
    if (a.place === 'havana') {
      const fxp = LX + 0.5, fzp = FZW + 1.9;
      s.cylinder(0.26, 0.3, 0.05, [fxp, 0.025, fzp], iron, 16); s.rod([fxp, 0, fzp], [fxp, 1.25, fzp], 0.025, iron);
      const head = new THREE.Group(); head.position.set(fxp + 0.08, 1.3, fzp); head.rotation.y = Math.PI / 2 - 0.5; s.root.add(head);
      for (const z of [-0.06, 0.06]) hang(s.ring(0.32, 0.012, [0, 0, z], iron), head);
      for (let i = 0; i < 8; i++) { const t = i / 8 * 6.283; hang(s.rod([Math.cos(t) * 0.32, Math.sin(t) * 0.32, -0.06], [Math.cos(t) * 0.32, Math.sin(t) * 0.32, 0.06], 0.006, iron), head); }
      const blades = new THREE.Group(); head.add(blades);
      for (let i = 0; i < 3; i++) { const blade = hang(s.box([0.26, 0.1, 0.012], [0.15, 0, 0], s.material('#9aa3a6', { metalness: 0.6 })), new THREE.Group()); blade.rotation.x = 0.4; blade.parent!.rotation.z = i * 2.094; blades.add(blade.parent!); }
      hang(s.cylinder(0.07, 0.07, 0.16, [0, 0, -0.08], iron, 12), head).rotation.x = Math.PI / 2;
      fan = blades;
    } else {
      const fins = Array.from({ length: 16 }, (_unused, i) => ({ at: [LX - 0.05, 0.5, FZW - 0.6 + i * 0.08] as [number, number, number], size: 1 }));
      s.scatter(new THREE.BoxGeometry(0.2, 0.78, 0.055), s.material('#b9b3a0', { metalness: 0.4, roughness: 0.6 }), fins);
      s.rod([LX - 0.05, 0.08, FZW - 0.75], [LX - 0.05, 0.08, FZW + 1.9], 0.03, iron);
      for (const z of [FZW - 0.6, FZW + 0.6]) s.box([0.12, 0.12, 0.04], [LX - 0.05, 0.06, z], iron);
    }

    // ---------- what the hour has left lying about ----------
    const chair = (cx: number, cz: number, turn: number, folded = false) => {
      const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = turn; s.root.add(g);
      const tube = post, pad = s.material(pick(['#7a2d24', '#5f6a70', '#7a2d24']), { roughness: 0.8 });
      if (folded) { hang(s.box([0.44, 0.95, 0.05], [0, 0.48, 0], pad), g); g.rotation.x = -0.22; return g; }
      for (const d of [-1, 1]) { hang(s.rod([d * 0.2, 0, 0.2], [d * 0.2, 0.86, -0.22], 0.012, tube), g); hang(s.rod([d * 0.2, 0, -0.22], [d * 0.2, 0.46, 0.2], 0.012, tube), g); }
      hang(s.box([0.42, 0.03, 0.4], [0, 0.46, 0], pad), g); hang(s.box([0.42, 0.2, 0.025], [0, 0.76, -0.19], pad), g).rotation.x = -0.2;
      return g;
    };
    if (a.hour === 'empty') {
      for (let i = 0; i < 6; i++) chair(LX + 0.12 + i * 0.045, FZW - 1.55 + (random() - 0.5) * 0.04, Math.PI / 2, true);
      const mx = LX + 0.5, mz = 4.6;
      s.lathe([[0.001, 0], [0.16, 0], [0.2, 0.34], [0.195, 0.34]], s.material('#c7b23c', { roughness: 0.6, side: THREE.DoubleSide }), [mx, 0, mz]);
      s.rod([mx + 0.05, 0.1, mz], [LX - 0.1, 1.55, mz + 0.3], 0.016, timber);
      s.ball([0.14, 0.06, 0.14], [mx + 0.05, 0.08, mz], s.material('#d8d3c4', { roughness: 1 }), 10);
    } else if (a.hour === 'early') {
      bench(LX + 0.35, 4.2, 1.8, Math.PI / 2);
      s.ball([0.2, 0.17, 0.36], [LX + 0.35, 0.65, 4.4], s.material(pick(['#2f4a6b', '#6f2a22', '#3d4a3a']), { roughness: 0.8 }), 14);
      s.tube([[LX + 0.35, 0.74, 4.2], [LX + 0.35, 0.92, 4.4], [LX + 0.35, 0.74, 4.6]], 0.014, darkTimber);
      s.box([0.34, 0.03, 0.5], [LX + 0.36, 0.495, 3.65], s.material('#ece7d8', { roughness: 1 })); s.box([0.02, 0.3, 0.5], [LX + 0.54, 0.36, 3.65], s.material('#ece7d8', { roughness: 1 }));
      s.cylinder(0.045, 0.045, 0.26, [LX + 0.3, 0.61, 3.3], s.material('#b23a2a', { metalness: 0.5, roughness: 0.4 }), 12);
      const pts: [number, number, number][] = []; const cx = -1.4, cz = 4.3;
      for (let i = 0; i <= 12; i++) { const t = i / 12 * Math.PI * 2.6; pts.push([cx + Math.cos(t) * (0.3 + i * 0.03) + (random() - 0.5) * 0.08, 0.012, cz + Math.sin(t) * (0.22 + i * 0.02) + (random() - 0.5) * 0.08]); }
      s.tube(pts, 0.011, s.material('#3a2c22'));
      s.rod(pts[0], [pts[0][0] + 0.16, 0.016, pts[0][2] - 0.05], 0.018, timber); s.rod(pts[12], [pts[12][0] - 0.15, 0.016, pts[12][2] + 0.08], 0.018, timber);
    } else if (a.hour === 'fightnight') {
      for (let row = 0; row < 3; row++) for (let i = 0; i < 2; i++) chair(-6.2 + i * 0.75 + (random() - 0.5) * 0.08, 0.6 + row * 0.95 + (random() - 0.5) * 0.08, Math.PI + (random() - 0.5) * 0.25);
      for (let i = 0; i < 5; i++) chair(6.5, -1.2 + i * 0.85 + (random() - 0.5) * 0.08, -Math.PI / 2 + (random() - 0.5) * 0.25);
      const flagCols = mood.cheer > 0.4 ? ['#b8281f', '#e9e5d8', '#2452a8', '#e2b82e'] : ['#7d2a24', '#b9b3a0', '#34466b'];
      const flags: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 44; i++) { const t = i / 43, x = -6.6 + t * 13.3; flags.push({ at: [x, 5.0 - Math.sin((t * 3 % 1) * Math.PI) * 0.22, BWZ + 0.1], size: 1, color: flagCols[i % flagCols.length] }); }
      for (let i = 0; i < 30; i++) { const t = i / 29; flags.push({ at: [-WIDE / 2 + 0.14, 5.0 - Math.sin((t * 2 % 1) * Math.PI) * 0.22, -5.2 + t * 10.4], size: 1, color: flagCols[i % flagCols.length] }); }
      const tri = new THREE.ConeGeometry(0.15, 0.34, 3); tri.rotateX(Math.PI); tri.scale(1, 1, 0.12); tri.rotateY(Math.PI / 4);
      s.scatter(tri, new THREE.MeshStandardMaterial({ roughness: 0.9 }), flags);
    } else {
      const carton = s.material('#b08a5a', { roughness: 0.95 });
      const stack = (cx: number, cz: number, n: number) => { let y = 0; for (let i = 0; i < n; i++) { const w = 0.5 + random() * 0.25, h = 0.34 + random() * 0.2; const b = s.box([w, h, w * 0.8], [cx + (random() - 0.5) * 0.1, y + h / 2, cz + (random() - 0.5) * 0.1], carton); b.rotation.y = (random() - 0.5) * 0.5; s.box([w * 0.98, 0.012, 0.07], [b.position.x, y + h + 0.004, b.position.z], s.material('#c9b98a')).rotation.y = b.rotation.y; y += h; } };
      stack(LX + 0.45, 4.3, 3); stack(LX + 0.5, 3.4, 2); stack(LX + 1.15, 4.5, 1 + Math.round(mood.density * 2)); stack(6.3, -0.2, 2);
      // a stepladder left against the wall where the posters came down
      const lxp = 3.6; for (const d of [-1, 1]) s.rod([lxp + d * 0.24, 0, BWZ + 1.1], [lxp + d * 0.2, 2.5, BWZ + 0.12], 0.022, timber);
      for (let i = 1; i < 8; i++) s.rod([lxp - 0.23, i * 0.3, BWZ + 1.1 - i * 0.118], [lxp + 0.23, i * 0.3, BWZ + 1.1 - i * 0.118], 0.016, timber);
    }
    // odds and ends that a busy gym collects
    if (mood.density > 0.45) { s.lathe([[0.001, 0], [0.13, 0], [0.16, 0.3], [0.155, 0.3]], s.material('#8a9196', { metalness: 0.6, roughness: 0.45, side: THREE.DoubleSide }), [RX + R + 0.35, 0, RZ + R + 0.3]); }
    if (mood.density > 0.6) for (let i = 0; i < 3; i++) { const r = 0.13 + i * 0.03; s.ball([r, r, r], [6.2 - i * 0.05, r, 3.6 + i * 0.42], s.material(pick(['#6f3f26', '#4f3a30', '#7a2c22']), { roughness: 0.8 }), 14); }
    if (mood.density > 0.75) { const tw = s.material('#ece7d8', { roughness: 1 }); s.box([0.36, 0.5, 0.03], [RX + PI * 0.2, PH + 0.5, RZ + PI + 0.03], tw); s.box([0.6, 0.04, 0.3], [5.2, 0.02, 4.7], tw).rotation.y = 0.5; }

    const sway = mix(0.004, 0.07, mood.energy * mood.energy), spin = mix(0.4, 9, mood.energy);
    world.update = (dt, time) => {
      bag.rotation.z = Math.sin(time * 1.5) * sway; bag.rotation.x = Math.cos(time * 1.1) * sway * 0.5;
      pendant.rotation.z = Math.sin(time * 0.9) * sway * 0.5;
      if (fan) fan.rotation.z += dt * spin;
    };
    return world;
  },
});
