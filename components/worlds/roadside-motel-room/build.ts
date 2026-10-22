import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type G = CanvasRenderingContext2D;
function paint(width: number, height: number, draw: (g: G, w: number, h: number) => void, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  if (repeat) texture.repeat.set(...repeat);
  return texture;
}

const GLOW = { 'neon-pink': '#ff4fa3', 'neon-green': '#3dff9a', sodium: '#ffb14a', dawn: '#a9c4e8', noon: '#fff3cc', headlights: '#eef4ff' } as const;
const SKY = { 'neon-pink': '#8d7f9c', 'neon-green': '#7d8f8b', sodium: '#a08c76', dawn: '#cdd5de', noon: '#e9e4d6', headlights: '#7f8598' } as const;

export default defineWorld({
  questions: {
    era: choice('What era is the room stuck in?', {
      atomic: '1950s atomic: pink and turquoise walls, boomerang carpet, a starburst clock.',
      seventies: '1970s: dark wood panelling, brown and orange carpet, heavy orange drapes.',
      nineties: '1990s: cream walls with a floral border, teal and mauve carpet, floral curtains.',
      present: 'Tired present day: greige paint, grey carpet tiles, blackout curtains, a no-smoking sign.',
    }),
    occupant: choice('Who has been staying here?', {
      nobody: 'Nobody yet: empty hangers, a folded luggage rack, everything squared away.',
      family: 'A family on a road trip: a swim ring, a cooler, small shoes, a drawing taped up.',
      runner: 'Someone on the run: curtains pinned shut, a chair wedged under the door knob, a duffel bag.',
      resident: 'A long-term resident: a hot plate, a full clothes rail, a plant on the sill, a calendar.',
    }),
    glow: choice('What comes through the curtains?', {
      'neon-pink': 'Night: the pink neon of the motel sign, buzzing.',
      'neon-green': 'Night: green VACANCY neon, sickly and steady.',
      sodium: 'Late evening: orange sodium light from the parking lot.',
      dawn: 'Dawn: flat grey-blue light, time to go.',
      noon: 'Midday: hard white daylight slicing in around the edges.',
      headlights: 'Night: a car pulling in, headlights sweeping across the room.',
    }),
    curtains: choice('How are the curtains?', {
      parted: 'Parted in the middle, the window half showing.',
      open: 'Pulled wide open.',
      closed: 'Drawn nearly shut, one bright slit.',
    }),
    leftBehind: choice('What was left behind on the carpet?', {
      nothing: 'Nothing.',
      shoe: 'A single shoe.',
      toy: 'A stuffed rabbit, dropped and not missed until the next state.',
      suitcase: 'A suitcase nobody came back for.',
      bottles: 'A line of empty bottles along the baseboard.',
      letter: 'A sealed letter, never posted.',
    }),
    bathroom: choice('What about the bathroom doorway?', {
      ajar: 'Door ajar, a strip of cold fluorescent light falling across the carpet.',
      open: 'Door wide open on bright tile.',
      dark: 'Door open on darkness.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const night = !(a.glow === 'dawn' || a.glow === 'noon');
    const RW = 8.4, RD = 6.4, HW = 2.85, T = 0.18;
    const xi = -RW / 2 + T, zi = -RD / 2 + T;
    const eraTone = {
      atomic: { back: '#e0a29e', left: '#78c2b9', curtain: '#e9d36a', door: '#3fb3ac', floor: '#6f8a88', accent: '#e8736a' },
      seventies: { back: '#8a5a34', left: '#8a5a34', curtain: '#c8632a', door: '#b8802e', floor: '#6a4426', accent: '#e8a23a' },
      nineties: { back: '#e0d2b2', left: '#e0d2b2', curtain: '#2f8f8a', door: '#d8cfb8', floor: '#2f7f7c', accent: '#b56a9a' },
      present: { back: '#b9b09f', left: '#6f7a80', curtain: '#59646e', door: '#e4e0d6', floor: '#6c7075', accent: '#c4261f' },
    }[a.era];
    const glow = new THREE.Color(GLOW[a.glow]);
    const { art: s, world } = diorama(context, {
      background: SKY[a.glow], floor: eraTone.floor, width: RW, depth: RD, maxHeight: 2.1, radius: 1.1, pitch: 31, yaw: 30,
      slots: [[0.3, 0.35], [-2.3, -1.5], [2.4, -1.6], [-2.6, 1.9], [2.6, 1.9]],
    });
    const root = s.root;
    for (const child of root.children) if ((child as THREE.HemisphereLight).isHemisphereLight) (child as THREE.HemisphereLight).intensity *= night ? 0.78 : 1;
    if (world.keyLight && night) world.keyLight.intensity *= 0.72;
    const sat = (hex: string) => { const c = new THREE.Color(hex), h = { h: 0, s: 0, l: 0 }; c.getHSL(h); return '#' + c.setHSL(h.h, h.s * mix(0.6, 1.05, mood.cheer), h.l).getHexString(); };
    const stains = (g: G, w: number, h: number, n: number) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(50,35,20,${0.08 + random() * 0.16})`; g.beginPath(); g.ellipse(random() * w, random() * h, 10 + random() * 40, 8 + random() * 26, random() * 3, 0, 7); g.fill(); } };

    // ---------- carpet ----------
    const carpetMap = paint(512, 512, (g, w, h) => {
      g.fillStyle = sat(eraTone.floor); g.fillRect(0, 0, w, h);
      if (a.era === 'atomic') {
        for (let i = 0; i < 26; i++) { const x = random() * w, y = random() * h, r = random() * 6; g.save(); g.translate(x, y); g.rotate(r); g.fillStyle = sat(i % 3 ? '#e8928a' : '#2c3a3c'); g.beginPath(); g.moveTo(-30, 0); g.quadraticCurveTo(0, -34, 30, 0); g.quadraticCurveTo(0, -12, -30, 0); g.fill(); g.restore(); }
        g.strokeStyle = '#f2ead0'; g.lineWidth = 2;
        for (let i = 0; i < 16; i++) { const x = random() * w, y = random() * h; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x - Math.cos(k * 0.785) * 12, y - Math.sin(k * 0.785) * 12); g.lineTo(x + Math.cos(k * 0.785) * 12, y + Math.sin(k * 0.785) * 12); g.stroke(); } }
      } else if (a.era === 'seventies') {
        for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) { const cx = xx * 128 + 64, cy = yy * 128 + 64; ['#c8632a', '#e8a23a', '#6a4426', '#e8d8a8'].forEach((c, i) => { g.fillStyle = sat(c); g.beginPath(); g.roundRect(cx - 56 + i * 13, cy - 56 + i * 13, 112 - i * 26, 112 - i * 26, 30 - i * 6); g.fill(); }); }
      } else if (a.era === 'nineties') {
        for (let i = 0; i < 90; i++) { const x = random() * w, y = random() * h; g.strokeStyle = g.fillStyle = sat(['#b56a9a', '#7b4fc9', '#e8d8a8', '#1c4a52'][i % 4]); g.lineWidth = 5; g.beginPath(); if (i % 3 === 0) { g.moveTo(x, y); g.bezierCurveTo(x + 14, y - 22, x + 28, y + 22, x + 42, y); g.stroke(); } else if (i % 3 === 1) { for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.256) * 9, y + Math.sin(p * 1.256) * 9, 6, 0, 7); g.fill(); } } else { g.moveTo(x, y); g.lineTo(x + 16, y + 6); g.lineTo(x + 4, y + 18); g.fill(); } }
      } else {
        for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) { g.fillStyle = `rgba(${(xx + yy) % 2 ? '255,255,255' : '0,0,0'},0.07)`; g.fillRect(xx * 64, yy * 64, 62, 62); }
        for (let i = 0; i < 1500; i++) { g.fillStyle = random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.14)'; g.fillRect(random() * w, random() * h, 2, 2); }
      }
      stains(g, w, h, Math.round(mood.wear * 16));
    }, [4, 3]);
    const carpet = s.mesh(new THREE.PlaneGeometry(RW - T, RD - T), new THREE.MeshStandardMaterial({ map: carpetMap, roughness: 1 }), [T / 2, 0.006, T / 2]);
    carpet.rotation.x = -Math.PI / 2; carpet.castShadow = false;

    // ---------- walls ----------
    const wallMat = (base: string) => new THREE.MeshStandardMaterial({
      roughness: 0.95,
      map: paint(512, 512, (g, w, h) => {
        g.fillStyle = sat(base); g.fillRect(0, 0, w, h);
        if (a.era === 'seventies') { for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(30,15,5,${0.1 + random() * 0.14})`; g.fillRect(i * 64, 0, 64, h); g.fillStyle = 'rgba(20,10,0,0.55)'; g.fillRect(i * 64, 0, 4, h); } for (let i = 0; i < 60; i++) { g.strokeStyle = 'rgba(30,15,5,0.14)'; g.lineWidth = 2; const x = random() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + random() * 20 - 10, 170, x + random() * 20 - 10, 340, x, h); g.stroke(); } }
        else if (a.era === 'atomic') { g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) { const x = xx * 128 + (yy % 2 ? 64 : 0) + 20, y = yy * 128 + 40; g.beginPath(); g.moveTo(x, y - 20); g.lineTo(x + 7, y); g.lineTo(x, y + 20); g.lineTo(x - 7, y); g.closePath(); g.stroke(); } }
        else if (a.era === 'nineties') { for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(190,160,110,${random() * 0.12})`; g.beginPath(); g.arc(random() * w, random() * h, 4 + random() * 10, 0, 7); g.fill(); } g.fillStyle = sat('#2f8f8a'); g.fillRect(0, 296, w, 56); for (let i = 0; i < 8; i++) { g.fillStyle = sat(i % 2 ? '#b56a9a' : '#e8d8a8'); for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(i * 64 + 32 + Math.cos(p * 1.256) * 10, 324 + Math.sin(p * 1.256) * 10, 7, 0, 7); g.fill(); } } }
        else { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(0, 300, w, 6); }
        // Water marks run down from the top where the roof leaks.
        for (let i = 0; i < Math.round(mood.wear * 7); i++) { const x = random() * w, len = 60 + random() * 200; const gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, 'rgba(90,70,40,0.3)'); gr.addColorStop(1, 'rgba(90,70,40,0)'); g.fillStyle = gr; g.fillRect(x, 0, 14 + random() * 30, len); }
      }),
    });
    const backMat = wallMat(eraTone.back), leftMat = wallMat(eraTone.left);
    const seg = (side: 'back' | 'left', a0: number, a1: number, y0: number, y1: number) => {
      const len = a1 - a0, hgt = y1 - y0, mid = (a0 + a1) / 2, cy = (y0 + y1) / 2;
      const geo = side === 'back' ? new THREE.BoxGeometry(len, hgt, T) : new THREE.BoxGeometry(T, hgt, len);
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, ((side === 'back' ? pos.getX(i) : pos.getZ(i)) + mid) / 2.85, (pos.getY(i) + cy) / 2.85);
      return s.mesh(geo, side === 'back' ? backMat : leftMat, side === 'back' ? [mid, cy, -RD / 2 + T / 2] : [-RW / 2 + T / 2, cy, mid]);
    };
    const DX0 = -3.75, DX1 = -2.8, DH = 2.05, WX0 = -1.5, WX1 = 1.9, WY0 = 0.85, WY1 = 2.25, BZ0 = -2.35, BZ1 = -1.45;
    seg('back', -RW / 2, DX0, 0, HW); seg('back', DX0, DX1, DH, HW); seg('back', DX1, WX0, 0, HW); seg('back', WX0, WX1, 0, WY0); seg('back', WX0, WX1, WY1, HW); seg('back', WX1, RW / 2, 0, HW);
    seg('left', zi, BZ0, 0, HW); seg('left', BZ0, BZ1, DH, HW); seg('left', BZ1, RD / 2, 0, HW);
    const trim = s.material(a.era === 'seventies' ? '#4a2f1a' : '#efe9da');
    const dark = s.material('#2a2623');
    const chrome = s.material('#d5d9dc', { metalness: 0.85, roughness: 0.25 });
    const brass = s.material('#c9a24a', { metalness: 0.8, roughness: 0.3 });
    for (const [x0, x1] of [[-RW / 2 + T, DX0], [DX1, RW / 2]]) s.box([x1 - x0, 0.11, 0.03], [(x0 + x1) / 2, 0.055, zi + 0.015], trim);
    for (const [z0, z1] of [[zi, BZ0], [BZ1, RD / 2]]) s.box([0.03, 0.11, z1 - z0], [xi + 0.015, 0.055, (z0 + z1) / 2], trim);

    // ---------- picture window ----------
    const WW = WX1 - WX0, WH = WY1 - WY0, wx = (WX0 + WX1) / 2, wy = (WY0 + WY1) / 2;
    const paneMap = paint(512, 256, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h);
      if (a.glow === 'noon') { sky.addColorStop(0, '#bfe0f5'); sky.addColorStop(1, '#fff6d8'); }
      else if (a.glow === 'dawn') { sky.addColorStop(0, '#7f93b0'); sky.addColorStop(1, '#e8c8b8'); }
      else if (a.glow === 'sodium') { sky.addColorStop(0, '#3a2c3a'); sky.addColorStop(1, '#c8742a'); }
      else { sky.addColorStop(0, '#1c1a30'); sky.addColorStop(1, '#3a2c48'); }
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = night ? '#14121c' : '#6a7a70'; g.fillRect(0, h * 0.78, w, h * 0.22);
      if (a.glow === 'neon-pink' || a.glow === 'neon-green') {
        const c = GLOW[a.glow]; g.shadowColor = c; g.shadowBlur = 26; g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 6;
        g.font = 'bold 76px monospace'; g.textAlign = 'center';
        g.save(); g.translate(w, 0); g.scale(-1, 1); g.fillText(a.glow === 'neon-pink' ? 'MOTEL' : 'VACANCY', w / 2, 130, 440); g.strokeRect(34, 52, w - 68, 104); g.restore();
        g.shadowBlur = 0; g.fillStyle = '#14121c'; g.fillRect(w / 2 - 8, 160, 16, 60);
      } else if (a.glow === 'sodium') { g.shadowColor = '#ffb14a'; g.shadowBlur = 40; g.fillStyle = '#ffe2a8'; g.beginPath(); g.ellipse(360, 50, 26, 10, 0, 0, 7); g.fill(); g.shadowBlur = 0; g.fillStyle = '#1c1612'; g.fillRect(392, 46, 5, 160); g.fillStyle = '#2c2420'; g.fillRect(90, 150, 150, 50); g.fillRect(120, 124, 80, 30); }
      else if (a.glow === 'headlights') { g.shadowColor = '#ffffff'; g.shadowBlur = 50; g.fillStyle = '#ffffff'; for (const x of [180, 330]) { g.beginPath(); g.arc(x, 170, 22, 0, 7); g.fill(); } g.shadowBlur = 0; }
      else { g.fillStyle = a.glow === 'noon' ? '#fffbe8' : '#f2d8c8'; g.beginPath(); g.arc(a.glow === 'noon' ? 400 : 120, a.glow === 'noon' ? 46 : 190, 30, 0, 7); g.fill(); g.fillStyle = '#4a5a4c'; g.fillRect(60, 120, 8, 90); for (let i = 0; i < 7; i++) { g.save(); g.translate(64, 120); g.rotate(-1.4 + i * 0.47); g.fillRect(0, -4, 60, 8); g.restore(); } g.fillStyle = '#8a8478'; g.fillRect(250, 168, 130, 34); }
    });
    const paneMat = new THREE.MeshStandardMaterial({ map: paneMap, emissiveMap: paneMap, emissive: '#ffffff', emissiveIntensity: night ? 1.25 : 0.95, roughness: 0.2 });
    s.mesh(new THREE.PlaneGeometry(WW, WH), paneMat, [wx, wy, -RD / 2 + 0.05]);
    s.box([WW + 0.16, 0.08, 0.06], [wx, WY1 + 0.04, zi + 0.02], trim); s.box([WW + 0.24, 0.05, 0.16], [wx, WY0 - 0.025, zi + 0.06], trim);
    for (const x of [WX0 - 0.04, WX1 + 0.04, wx - WW / 6, wx + WW / 6]) s.box([Math.abs(x - wx) > 1 ? 0.08 : 0.04, WH, 0.05], [x, wy, zi + 0.012], trim);
    // Curtains: pleated panels that take on the colour behind them.
    const curtainTint = new THREE.Color(sat(eraTone.curtain));
    const curtainMap = paint(256, 256, (g, w, h) => {
      g.fillStyle = '#' + curtainTint.getHexString(); g.fillRect(0, 0, w, h);
      if (a.era === 'nineties') for (let i = 0; i < 40; i++) { g.fillStyle = sat(i % 2 ? '#b56a9a' : '#e8d8a8'); const x = random() * w, y = random() * h; for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.256) * 8, y + Math.sin(p * 1.256) * 8, 6, 0, 7); g.fill(); } }
      if (a.era === 'atomic') { g.strokeStyle = sat('#3fb3ac'); g.lineWidth = 4; for (let i = 0; i < 18; i++) { const x = random() * w, y = random() * h; g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.moveTo(x, y - 14); g.lineTo(x, y + 14); g.stroke(); } }
      if (a.era === 'seventies') for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? 'rgba(90,40,10,0.35)' : 'rgba(255,210,120,0.25)'; g.fillRect(0, i * 44, w, 20); }
    }, [2, 1]);
    const curtainMat = new THREE.MeshStandardMaterial({ map: curtainMap, roughness: 1, side: THREE.DoubleSide, emissive: glow, emissiveIntensity: a.era === 'present' ? 0.08 : 0.28 });
    const pinned = a.occupant === 'runner';
    const gap = pinned ? 0.07 : { parted: 1.25, open: 2.5, closed: 0.14 }[a.curtains];
    const curtains: { geo: THREE.BufferGeometry; rest: Float32Array; phase: number }[] = [];
    for (const side of [-1, 1]) {
      const full = WW / 2 + 0.2, w = full - gap / 2;
      const geo = new THREE.PlaneGeometry(w, WH + 0.5, 30, 6);
      const pos = geo.attributes.position;
      const folds = 9 * (full / w);
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * folds * 2.2 + side) * 0.045 + (pos.getY(i) < -WH / 2 ? mood.wear * 0.04 * Math.sin(pos.getX(i) * 9) : 0));
      geo.computeVertexNormals();
      s.mesh(geo, curtainMat, [wx + side * (gap / 2 + w / 2), wy - 0.12, zi + 0.11]);
      curtains.push({ geo, rest: Float32Array.from(pos.array), phase: side });
    }
    s.rod([WX0 - 0.3, WY1 + 0.17, zi + 0.11], [WX1 + 0.3, WY1 + 0.17, zi + 0.11], 0.018, a.era === 'seventies' ? dark : chrome);
    if (a.era === 'seventies' || a.era === 'nineties') s.box([WW + 0.7, 0.26, 0.2], [wx, WY1 + 0.2, zi + 0.1], new THREE.MeshStandardMaterial({ map: curtainMap, roughness: 1 }));
    if (pinned) s.box([0.03, 0.1, 0.03], [wx, wy + 0.2, zi + 0.17], s.material('#d8b46a'));

    // The light that falls through the gap.
    const patch = new THREE.Group();
    const beamW = Math.min(gap, WW) + 0.15;
    const patchMat = new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: night ? 0.34 : 0.3, depthWrite: false });
    const bars = gap > 1 ? 3 : 1;
    for (let i = 0; i < bars; i++) {
      const bw = beamW / bars - (bars > 1 ? 0.08 : 0), x0 = -beamW / 2 + i * (beamW / bars) + (bars > 1 ? 0.04 : 0);
      const shape = new THREE.Shape(); const skew = 0.5, reach = 3.9;
      shape.moveTo(x0, 0.35); shape.lineTo(x0 + bw, 0.35); shape.lineTo((x0 + bw) * 1.25 + skew, reach); shape.lineTo(x0 * 1.25 + skew, reach); shape.closePath();
      const geo = new THREE.ShapeGeometry(shape); geo.rotateX(Math.PI / 2);
      const m = new THREE.Mesh(geo, patchMat); (m.material as THREE.Material).side = THREE.DoubleSide; patch.add(m);
    }
    patch.position.set(wx, 0.012, zi);
    root.add(patch);
    const lamp = new THREE.PointLight(glow, night ? 26 : 12, 9, 2);
    lamp.position.set(wx, 1.7, zi + 0.7);
    root.add(lamp);

    // ---------- through-wall air conditioner under the window ----------
    const beige = s.material('#d6ccb0', { roughness: 0.6 });
    s.box([1.15, 0.5, 0.26], [wx, 0.31, zi + 0.13], beige); s.box([1.05, 0.05, 0.2], [wx, 0.04, zi + 0.12], dark);
    for (let i = 0; i < 7; i++) s.box([1.0, 0.012, 0.01], [wx, 0.14 + i * 0.035, zi + 0.262], dark);
    s.box([0.8, 0.08, 0.012], [wx - 0.12, 0.47, zi + 0.262], dark); s.box([0.2, 0.08, 0.012], [wx + 0.43, 0.47, zi + 0.262], s.material('#5a564e'));

    // ---------- entry door ----------
    const doorTint = s.material(sat(eraTone.door), { roughness: 0.6 });
    const dx = (DX0 + DX1) / 2, dwid = DX1 - DX0;
    s.box([dwid - 0.02, DH - 0.03, 0.06], [dx, DH / 2 + 0.01, -RD / 2 + T - 0.05], doorTint);
    for (const x of [DX0 - 0.04, DX1 + 0.04]) s.box([0.08, DH + 0.08, 0.04], [x, (DH + 0.08) / 2, zi + 0.01], trim);
    s.box([dwid + 0.16, 0.08, 0.04], [dx, DH + 0.04, zi + 0.01], trim);
    s.ball([0.04, 0.04, 0.03], [DX1 - 0.12, 0.98, zi + 0.04], brass, 12); s.cylinder(0.035, 0.035, 0.015, [DX1 - 0.12, 1.16, zi + 0.0], brass, 14).rotation.x = Math.PI / 2;
    s.box([0.24, 0.3, 0.012], [dx, 1.4, zi - 0.015], s.material('#f1ead6')); s.box([0.24, 0.05, 0.014], [dx, 1.525, zi - 0.015], s.material('#b8201c'));
    s.box([dwid - 0.06, 0.02, 0.02], [dx, 0.02, zi - 0.01], new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 1.6 }));
    if (!pinned) { for (let i = 0; i < 7; i++) s.ring(0.014, 0.004, [DX1 - 0.02 + i * 0.006, 1.32 - Math.sin(i / 6 * Math.PI) * 0.07 - i * 0.012, zi + 0.02], chrome).rotation.y = i % 2 ? 0 : Math.PI / 2; }
    else s.rod([DX1 - 0.2, 1.3, zi + 0.02], [DX1 + 0.05, 1.3, zi + 0.03], 0.008, chrome);

    // ---------- bathroom doorway ----------
    const bzc = (BZ0 + BZ1) / 2, bwid = BZ1 - BZ0;
    const lit = a.bathroom !== 'dark';
    const tile = paint(128, 256, (g, w, h) => { g.fillStyle = lit ? '#e8f4ec' : '#2a3030'; g.fillRect(0, 0, w, h); g.strokeStyle = lit ? '#a8c8bc' : '#3a4444'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, h); g.stroke(); } for (let i = 0; i <= 16; i++) { g.beginPath(); g.moveTo(0, i * 16); g.lineTo(w, i * 16); g.stroke(); } if (lit) { g.fillStyle = '#c8d4d0'; g.fillRect(34, 60, 60, 70); g.fillStyle = '#f8fffa'; g.fillRect(40, 66, 48, 58); g.fillStyle = '#d8e4e0'; g.fillRect(30, 150, 68, 16); } });
    const bathMat = new THREE.MeshStandardMaterial({ map: tile, emissiveMap: tile, emissive: '#ffffff', emissiveIntensity: lit ? 1.05 : 0.1, roughness: 0.3 });
    const inside = s.mesh(new THREE.PlaneGeometry(bwid, DH), bathMat, [-RW / 2 + 0.03, DH / 2, bzc]); inside.rotation.y = Math.PI / 2;
    for (const z of [BZ0 - 0.04, BZ1 + 0.04]) s.box([0.04, DH + 0.08, 0.08], [xi + 0.01, (DH + 0.08) / 2, z], trim);
    s.box([0.04, 0.08, bwid + 0.16], [xi + 0.01, DH + 0.04, bzc], trim);
    const swing = a.bathroom === 'ajar' ? 0.3 : 1.2;
    const bdoor = new THREE.Group(); bdoor.position.set(xi - 0.02, 0, BZ0); bdoor.rotation.y = swing; root.add(bdoor);
    const slab = s.box([0.05, DH - 0.03, bwid - 0.02], [0, DH / 2, bwid / 2], s.material(a.era === 'seventies' ? '#7a4e2a' : '#e6e0d0')); bdoor.add(slab);
    const knob = s.ball([0.035, 0.035, 0.035], [0.06, 0.98, bwid - 0.1], chrome, 10); bdoor.add(knob);
    if (lit) {
      const spillW = a.bathroom === 'ajar' ? bwid * 0.3 : bwid * 0.9;
      const shape = new THREE.Shape(); shape.moveTo(0, BZ1 - spillW); shape.lineTo(0, BZ1); shape.lineTo(2.6, BZ1 + 0.9); shape.lineTo(2.6, BZ1 + 0.9 - spillW * 1.5); shape.closePath();
      const geo = new THREE.ShapeGeometry(shape); geo.rotateX(Math.PI / 2);
      const spill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#d8ffe8', transparent: true, opacity: 0.36, depthWrite: false, side: THREE.DoubleSide }));
      spill.position.set(xi, 0.014, 0); root.add(spill);
    }

    // ---------- the framed landscape, bolted down ----------
    const scene = Math.floor(random() * 3);
    const printMap = paint(384, 256, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h);
      const pal = a.era === 'atomic' ? ['#f6c35a', '#e8772a', '#7a3418'] : a.era === 'seventies' ? ['#d8c890', '#b8802e', '#4a3a1c'] : a.era === 'nineties' ? ['#f2b8c8', '#f6d8a0', '#2f8f8a'] : ['#c8ccd0', '#9a9ea4', '#3a3e44'];
      sky.addColorStop(0, pal[0]); sky.addColorStop(1, pal[1]); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(w * (0.3 + scene * 0.2), h * 0.36, 22, 0, 7); g.fill();
      g.fillStyle = pal[2];
      if (scene === 0) { g.fillRect(0, 150, 110, 110); g.fillRect(30, 110, 50, 44); g.fillRect(230, 130, 160, 130); g.fillRect(280, 96, 60, 40); }
      else if (scene === 1) { g.beginPath(); g.moveTo(0, 190); g.lineTo(90, 90); g.lineTo(170, 170); g.lineTo(250, 70); g.lineTo(384, 190); g.fill(); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(0, 190, w, 66); }
      else { g.fillRect(0, 190, w, 70); g.fillRect(300, 80, 10, 120); for (let i = 0; i < 7; i++) { g.save(); g.translate(305, 84); g.rotate(-2.9 + i * 0.5); g.fillRect(0, -5, 66, 10); g.restore(); } }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 214, w, 42);
      g.fillStyle = `rgba(200,170,90,${mood.wear * 0.35})`; g.fillRect(0, 0, w, h);
    });
    const art = new THREE.Group(); art.position.set(xi + 0.03, 1.62, 1.35); art.rotation.y = Math.PI / 2; art.rotation.z = (random() - 0.5) * mood.wear * 0.12; root.add(art);
    const frameMat = a.era === 'present' ? dark : a.era === 'atomic' ? s.material('#e8dcc0') : s.material('#6a4a22', { metalness: 0.3 });
    const fr = s.box([1.5, 1.02, 0.05], [0, 0, 0], frameMat); art.add(fr);
    const pr = s.mesh(new THREE.PlaneGeometry(1.32, 0.84), new THREE.MeshStandardMaterial({ map: printMap, roughness: 0.6 }), [0, 0, 0.027]); art.add(pr);
    for (const bx of [-0.7, 0.7]) for (const by of [-0.46, 0.46]) { const bolt = s.cylinder(0.02, 0.02, 0.012, [bx, by, 0.03], chrome, 8); bolt.rotation.x = Math.PI / 2; art.add(bolt); }
    // Wall lamp beside it.
    const sconceLit = night;
    s.box([0.06, 0.16, 0.12], [xi + 0.03, 1.5, 2.55], brass);
    s.rod([xi + 0.05, 1.52, 2.55], [xi + 0.28, 1.62, 2.55], 0.014, brass);
    s.mesh(new THREE.CylinderGeometry(0.1, 0.17, 0.22, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#f2e2b8', emissive: '#ffcf80', emissiveIntensity: sconceLit ? 1.1 : 0.1, roughness: 0.9, side: THREE.DoubleSide }), [xi + 0.3, 1.72, 2.55]);

    // ---------- era fixtures on the back wall ----------
    if (a.era === 'atomic') {
      const cx = -2.1, cy = 2.1, cz = zi + 0.03;
      for (let i = 0; i < 12; i++) { const ang = i / 12 * Math.PI * 2, r = i % 2 ? 0.34 : 0.24; s.rod([cx + Math.cos(ang) * 0.08, cy + Math.sin(ang) * 0.08, cz], [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, cz], 0.008, brass); s.ball([0.022, 0.022, 0.022], [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, cz], i % 2 ? s.material('#e8736a') : s.material('#3fb3ac'), 8); }
      s.cylinder(0.09, 0.09, 0.03, [cx, cy, cz], s.material('#f6f1e2'), 20).rotation.x = Math.PI / 2;
    } else if (a.era === 'seventies') {
      for (let i = 0; i < 3; i++) s.ring(0.12 + i * 0.1, 0.02, [-2.1, 2.0, zi + 0.03], s.material(['#e8a23a', '#c8632a', '#6a3418'][i]));
    } else if (a.era === 'nineties') {
      s.box([0.5, 0.36, 0.03], [-2.1, 1.95, zi + 0.02], s.material('#e8d8a8')); s.box([0.4, 0.26, 0.032], [-2.1, 1.95, zi + 0.022], s.material('#b56a9a')); s.ball([0.07, 0.09, 0.01], [-2.1, 1.95, zi + 0.04], s.material('#2f8f8a'), 10);
    } else {
      s.cylinder(0.16, 0.16, 0.012, [-2.1, 2.0, zi + 0.01], s.material('#f4f4f0'), 24).rotation.x = Math.PI / 2;
      s.ring(0.12, 0.016, [-2.1, 2.0, zi + 0.02], s.material('#c4261f')); s.box([0.24, 0.03, 0.014], [-2.1, 2.0, zi + 0.022], s.material('#c4261f')).rotation.z = 0.78;
      s.box([0.9, 0.52, 0.04], [3.1, 1.75, zi + 0.06], dark); s.box([0.84, 0.46, 0.042], [3.1, 1.75, zi + 0.062], s.material('#15181c', { roughness: 0.15 }));
    }
    s.cylinder(0.07, 0.07, 0.03, [xi + 0.02, 2.55, 0.2], s.material('#f1ede0'), 14).rotation.z = Math.PI / 2;

    // ---------- clothes rail in the back corner ----------
    const railX0 = 2.75, railX1 = RW / 2 - 0.15, railZ = zi + 0.32, railY = 1.72;
    if (a.era !== 'present') { s.box([railX1 - railX0 + 0.1, 0.03, 0.42], [(railX0 + railX1) / 2, railY + 0.16, zi + 0.21], trim); }
    else s.box([railX1 - railX0 + 0.1, 0.03, 0.42], [(railX0 + railX1) / 2, 2.25, zi + 0.21], trim);
    s.rod([railX0, railY, railZ], [railX1, railY, railZ], 0.014, chrome);
    for (const x of [railX0, railX1]) s.rod([x, railY, railZ], [x, railY + 0.16, railZ], 0.01, chrome);
    const hangers = a.occupant === 'nobody' ? 5 : a.occupant === 'resident' ? 7 : 4;
    const clothes = ['#3b5c8a', '#b8433a', '#e8e4d8', '#4d7a55', '#d8b03a', '#5a4a6a', '#2a2a30'];
    for (let i = 0; i < hangers; i++) {
      const hx = railX0 + 0.12 + i * (railX1 - railX0 - 0.24) / Math.max(hangers - 1, 1), turn = (random() - 0.5) * 0.5;
      const h = new THREE.Group(); h.position.set(hx, railY, railZ); h.rotation.y = Math.PI / 2 + turn; root.add(h);
      const hook = s.ring(0.022, 0.004, [0, -0.022, 0], chrome, Math.PI * 1.3); h.add(hook);
      for (const k of [-1, 1]) { const arm = s.rod([0, -0.045, 0], [k * 0.19, -0.11, 0], 0.005, chrome); h.add(arm); }
      h.add(s.rod([-0.19, -0.11, 0], [0.19, -0.11, 0], 0.005, chrome));
      const dressed = a.occupant === 'resident' || (a.occupant === 'family' && i < 3) || (a.occupant === 'runner' && i === 0);
      if (dressed) { const c = s.material(sat(clothes[Math.floor(random() * clothes.length)]), { roughness: 1 }); const len = 0.45 + random() * 0.35; h.add(s.box([0.4, len, 0.05], [0, -0.1 - len / 2, 0], c)); for (const k of [-1, 1]) { const sl = s.box([0.1, len * 0.6, 0.045], [k * 0.24, -0.14 - len * 0.3, 0], c); sl.rotation.z = k * 0.2; h.add(sl); } }
    }

    // ---------- who has been staying ----------
    const cornerX = 3.45, cornerZ = zi + 0.75;
    if (a.occupant === 'nobody') {
      for (const k of [-1, 1]) { s.rod([cornerX - 0.3, 0, cornerZ + k * 0.22], [cornerX + 0.3, 0.55, cornerZ + k * 0.22], 0.015, chrome); s.rod([cornerX + 0.3, 0, cornerZ + k * 0.22], [cornerX - 0.3, 0.55, cornerZ + k * 0.22], 0.015, chrome); }
      for (let i = 0; i < 3; i++) s.box([0.6, 0.015, 0.05], [cornerX, 0.555, cornerZ - 0.16 + i * 0.16], s.material('#3a3a3a'));
      for (let i = 0; i < 3; i++) s.box([0.4, 0.06, 0.26], [cornerX, railY + 0.2 + i * 0.062, zi + 0.2], s.material('#f4f2ea', { roughness: 1 }));
    } else if (a.occupant === 'family') {
      const ringGeo = new THREE.TorusGeometry(0.34, 0.11, 12, 28);
      const stripes = paint(128, 16, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : sat('#f2551c'); g.fillRect(i * 16, 0, 16, 16); } });
      const floatie = s.mesh(ringGeo, new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.3 }), [cornerX - 0.1, 0.42, cornerZ - 0.3]); floatie.rotation.x = -0.3;
      s.box([0.62, 0.38, 0.38], [cornerX - 0.95, 0.19, zi + 0.45], s.material(sat('#2a6ad8'))); s.box([0.66, 0.08, 0.42], [cornerX - 0.95, 0.42, zi + 0.45], s.material('#f4f4f0'));
      for (let i = 0; i < 4; i++) { const shoe = s.ball([0.07, 0.045, 0.12], [xi + 0.3 + (i % 2) * 0.17, 0.045, -0.9 + Math.floor(i / 2) * 0.34 + random() * 0.05], s.material(sat(i < 2 ? '#e83a6a' : '#2a8ad8')), 10); shoe.rotation.y = (random() - 0.5) * 0.6; }
      const drawing = paint(128, 96, (g) => { g.fillStyle = '#fffdf2'; g.fillRect(0, 0, 128, 96); g.strokeStyle = '#2a6ad8'; g.lineWidth = 4; g.strokeRect(30, 40, 50, 36); g.beginPath(); g.moveTo(26, 40); g.lineTo(55, 16); g.lineTo(84, 40); g.stroke(); g.fillStyle = '#f2c81c'; g.beginPath(); g.arc(104, 22, 12, 0, 7); g.fill(); g.strokeStyle = '#2c8a4a'; g.beginPath(); g.moveTo(0, 82); g.lineTo(128, 82); g.stroke(); g.strokeStyle = '#c4261f'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(94 + i * 9, 62, 4, 0, 7); g.moveTo(94 + i * 9, 66); g.lineTo(94 + i * 9, 80); g.stroke(); } });
      const dr = s.mesh(new THREE.PlaneGeometry(0.42, 0.32), new THREE.MeshStandardMaterial({ map: drawing, roughness: 0.9 }), [2.3, 1.45, zi + 0.012]); dr.rotation.z = 0.06;
    } else if (a.occupant === 'runner') {
      const duffel = s.mesh(new THREE.CapsuleGeometry(0.2, 0.55, 6, 14), s.material('#2c3a2c', { roughness: 0.9 }), [cornerX - 0.2, 0.2, cornerZ]); duffel.rotation.z = Math.PI / 2; duffel.rotation.y = 0.3;
      s.box([0.5, 0.012, 0.03], [cornerX - 0.2, 0.4, cornerZ], dark).rotation.y = 0.3;
      for (let i = 0; i < 3 + Math.round(mood.density * 4); i++) { const cash = s.box([0.16, 0.035, 0.07], [cornerX - 0.6 + random() * 0.5, 0.02 + (i % 2) * 0.035, cornerZ + 0.3 + random() * 0.25], s.material('#7fa870')); cash.rotation.y = random() * 3; }
      // A chair wedged under the entry door knob.
      const chair = new THREE.Group(); chair.position.set(dx + 0.25, 0, zi + 0.42); chair.rotation.x = -0.32; root.add(chair);
      const wood = s.material('#6a4a2e');
      const c = (m: THREE.Mesh) => { chair.add(m); return m; };
      c(s.box([0.44, 0.04, 0.42], [0, 0.46, 0.05], wood)); c(s.box([0.44, 0.5, 0.04], [0, 0.74, -0.16], wood));
      for (const kx of [-1, 1]) for (const kz of [-1, 1]) c(s.box([0.04, kz < 0 ? 1.0 : 0.46, 0.04], [kx * 0.2, kz < 0 ? 0.5 : 0.23, kz < 0 ? -0.16 : 0.24], wood));
      for (let i = 0; i < 3; i++) s.box([0.2, 0.06, 0.16], [0.9 + (random() - 0.5) * 0.1, 0.03 + i * 0.06, zi + 0.5], s.material('#f4f2ea')).rotation.y = random();
    } else {
      s.box([0.5, 0.42, 0.4], [cornerX, 0.21, cornerZ - 0.2], s.material('#b89a6a', { roughness: 1 })); s.box([0.36, 0.06, 0.3], [cornerX, 0.45, cornerZ - 0.2], dark);
      s.ring(0.09, 0.012, [cornerX, 0.485, cornerZ - 0.2], new THREE.MeshStandardMaterial({ color: '#ff5a1c', emissive: '#ff5a1c', emissiveIntensity: 1.5 })).rotation.x = Math.PI / 2;
      s.cylinder(0.13, 0.12, 0.14, [cornerX, 0.57, cornerZ - 0.2], s.material('#8a9096', { metalness: 0.6, roughness: 0.4 }), 16); s.rod([cornerX + 0.12, 0.62, cornerZ - 0.2], [cornerX + 0.34, 0.64, cornerZ - 0.2], 0.012, dark);
      for (let i = 0; i < 2 + Math.round(mood.density * 3); i++) s.box([0.5, 0.32, 0.4], [cornerX - 0.75 + (random() - 0.5) * 0.08, 0.16 + i * 0.32, zi + 0.4], s.material(i % 2 ? '#a8895a' : '#b89a6a', { roughness: 1 })).rotation.y = (random() - 0.5) * 0.2;
      // A plant on the sill and a calendar.
      s.cylinder(0.09, 0.07, 0.13, [WX1 - 0.3, WY0 + 0.07, zi + 0.1], s.material('#b8603a'), 12);
      for (let i = 0; i < 9; i++) { const leaf = s.ball([0.03, 0.14 + random() * 0.1, 0.05], [WX1 - 0.3 + (random() - 0.5) * 0.12, WY0 + 0.26, zi + 0.1 + (random() - 0.5) * 0.08], s.material(sat('#3f8a4a')), 8); leaf.rotation.z = (random() - 0.5) * 1.2; leaf.rotation.x = (random() - 0.5) * 0.6; }
      const cal = paint(96, 128, (g) => { g.fillStyle = '#fbf8ee'; g.fillRect(0, 0, 96, 128); g.fillStyle = '#c4261f'; g.fillRect(0, 0, 96, 30); g.fillStyle = '#333'; for (let r = 0; r < 5; r++) for (let c2 = 0; c2 < 7; c2++) g.fillRect(8 + c2 * 12, 42 + r * 16, 6, 6); g.strokeStyle = '#c4261f'; g.lineWidth = 2; for (let i = 0; i < 12; i++) { const x = 11 + (i % 7) * 12, y = 45 + Math.floor(i / 7) * 16; g.beginPath(); g.moveTo(x - 5, y - 5); g.lineTo(x + 5, y + 5); g.stroke(); } });
      s.mesh(new THREE.PlaneGeometry(0.34, 0.45), new THREE.MeshStandardMaterial({ map: cal, roughness: 0.9 }), [2.3, 1.55, zi + 0.012]);
      const rug = s.cylinder(0.75, 0.75, 0.012, [0.3, 0.012, 2.55], s.material(sat('#a8483a'), { roughness: 1 }), 28); rug.scale.z = 0.6; rug.castShadow = false;
    }

    // ---------- what was left behind ----------
    const lx = -0.7 + random() * 0.5, lz = 2.45 + random() * 0.3;
    if (a.leftBehind === 'shoe') {
      const shoe = new THREE.Group(); shoe.position.set(lx, 0, lz); shoe.rotation.y = random() * 6; root.add(shoe);
      const leather = s.material(mood.cheer > 0.5 ? '#c4261f' : '#3a2a1c', { roughness: 0.4 });
      shoe.add(s.box([0.14, 0.03, 0.4], [0, 0.015, 0], dark), s.ball([0.075, 0.07, 0.13], [0, 0.07, 0.11], leather, 12), s.box([0.13, 0.12, 0.2], [0, 0.09, -0.09], leather), s.box([0.1, 0.06, 0.06], [0, 0.03, -0.17], dark));
      shoe.rotation.z = mood.wear > 0.5 ? 1.4 : 0; if (mood.wear > 0.5) shoe.position.y = 0.07;
    } else if (a.leftBehind === 'toy') {
      const fur = s.material(sat('#d8b8a8'), { roughness: 1 });
      const toy = new THREE.Group(); toy.position.set(lx, 0, lz); toy.rotation.y = random() * 6; root.add(toy);
      toy.add(s.ball([0.16, 0.12, 0.2], [0, 0.12, 0], fur, 12), s.ball([0.12, 0.11, 0.12], [0, 0.14, 0.26], fur, 12));
      for (const k of [-1, 1]) { const ear = s.ball([0.035, 0.03, 0.15], [k * 0.07, 0.13, 0.42], fur, 8); ear.rotation.y = k * 0.4; toy.add(ear); toy.add(s.ball([0.05, 0.045, 0.1], [k * 0.17, 0.05, 0.08], fur, 8), s.ball([0.055, 0.045, 0.11], [k * 0.14, 0.05, -0.2], fur, 8), s.ball([0.014, 0.014, 0.014], [k * 0.05, 0.22, 0.31], dark, 6)); }
    } else if (a.leftBehind === 'suitcase') {
      const shell = s.material(sat('#7a5a3a'), { roughness: 0.6 });
      const caseG = new THREE.Group(); caseG.position.set(lx, 0, lz); caseG.rotation.y = 0.4 + random() * 0.5; root.add(caseG);
      caseG.add(s.box([0.78, 0.54, 0.24], [0, 0.29, 0], shell), s.box([0.8, 0.03, 0.25], [0, 0.3, 0], dark), s.box([0.2, 0.04, 0.05], [0, 0.6, 0], dark));
      for (const k of [-1, 1]) caseG.add(s.box([0.05, 0.07, 0.02], [k * 0.22, 0.34, 0.125], brass));
      const tag = s.box([0.07, 0.11, 0.005], [0.14, 0.5, 0.13], s.material('#f1ecdc')); tag.rotation.z = 0.3; caseG.add(tag);
    } else if (a.leftBehind === 'bottles') {
      const n = 4 + Math.round(mood.density * 6);
      for (let i = 0; i < n; i++) { const b = s.lathe([[0, 0], [0.045, 0], [0.045, 0.17], [0.018, 0.24], [0.018, 0.31], [0, 0.31]], s.material(i % 3 ? '#5a3a14' : '#2f6a3a', { roughness: 0.15 }), [xi + 0.14, 0, -0.9 + i * 0.13]); if (i === n - 1) { b.rotation.x = Math.PI / 2; b.position.set(xi + 0.4, 0.045, -0.9 + i * 0.13); } }
    } else if (a.leftBehind === 'letter') {
      const env = s.box([0.42, 0.012, 0.26], [lx, 0.012, lz], s.material('#f6f3ea')); env.rotation.y = 0.3 + random() * 0.6;
      const stamp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.013, 0.07), s.material('#c4261f')); stamp.position.set(0.15, 0, -0.07); env.add(stamp);
      for (let i = 0; i < 3; i++) { const line = new THREE.Mesh(new THREE.BoxGeometry(0.16 - i * 0.03, 0.013, 0.012), s.material('#1c2a6b')); line.position.set(-0.02, 0, -0.01 + i * 0.045); env.add(line); }
    }
    // Wear: a strip of wallpaper peeling by the corner, a carpet seam lifting.
    if (mood.wear > 0.55) { const peel = s.box([0.3, 0.6, 0.012], [-RW / 2 + T + 0.28, HW - 0.34, zi + 0.05], backMat); peel.rotation.x = 0.35; }

    const baseLamp = lamp.intensity, basePane = paneMat.emissiveIntensity, baseOpacity = patchMat.opacity;
    const neon = a.glow === 'neon-pink' || a.glow === 'neon-green';
    const tmp = new THREE.Vector3();
    void tmp;
    world.update = (_dt, time) => {
      let k = 1;
      if (neon) { k = 1 + Math.sin(time * 37) * 0.04; if (a.glow === 'neon-pink' && Math.sin(time * 2.3) + Math.sin(time * 5.9) > 1.75 - mood.energy * 0.5 - mood.wear * 0.4) k *= 0.45; }
      if (a.glow === 'headlights') { const sweep = Math.sin(time * mix(0.3, 1.1, mood.energy)); patch.position.x = wx + sweep * 1.5; patch.rotation.y = -sweep * 0.25; lamp.position.x = wx + sweep * 1.5; k = 0.6 + 0.4 * Math.cos(sweep * 1.5); }
      lamp.intensity = baseLamp * k; paneMat.emissiveIntensity = basePane * k; patchMat.opacity = baseOpacity * k;
      // The air conditioner stirs the curtain hems.
      for (const c of curtains) {
        const pos = c.geo.attributes.position;
        for (let i = 0; i < pos.count; i++) { const low = Math.max(0, -c.rest[i * 3 + 1] / (WH / 2 + 0.25)); pos.setZ(i, c.rest[i * 3 + 2] + Math.sin(time * 1.6 + c.rest[i * 3] * 3 + c.phase) * 0.03 * low * low * mood.energy); }
        pos.needsUpdate = true;
      }
    };
    return world;
  },
});
