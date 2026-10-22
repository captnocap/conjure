import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type G = CanvasRenderingContext2D;
function canvasOf(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return canvas;
}
function textureOf(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const MESSAGES = { name: 'VERA', know: 'I KNOW', mirror: 'MIRROR\nMIRROR', enough: 'YOU ARE\nENOUGH', arrow: '', number: '555\n0199', run: 'RUN' } as const;
const TILES = {
  white: { tile: '#f1f2ee', grout: '#b9bcb6', w: 64, h: 32, offset: true },
  pink: { tile: '#e8a9b4', grout: '#c47f8c', w: 48, h: 48, offset: false },
  green: { tile: '#a9c9b4', grout: '#6f8f7a', w: 48, h: 48, offset: false },
  checker: { tile: '#f2f2ee', grout: '#1d1d20', w: 48, h: 48, offset: false },
} as const;

export default defineThing({
  questions: {
    message: choice('What is written on the glass?', {
      name: 'A woman\'s name, VERA, written large.',
      know: 'I KNOW.',
      mirror: 'MIRROR MIRROR.',
      enough: 'YOU ARE ENOUGH.',
      arrow: 'A big arrow pointing down at the shelf.',
      number: 'A phone number.',
      run: 'RUN.',
    }),
    medium: choice('What is it written in?', {
      lipstick: 'Thick red lipstick, dripping a little.',
      steam: 'Finger-wiped through steam on the fogged glass.',
      marker: 'Black marker, hurried.',
    }),
    tiles: choice('What tiled room does the mirror reflect?', {
      white: 'White subway tiles, a plain modern bathroom.',
      pink: 'Pink 1950s tiles with a black border.',
      green: 'Pale green institutional tiles.',
      checker: 'Black and white checker tiles.',
    }),
    frame: choice('What frame does the mirror have?', {
      frameless: 'Frameless bevelled glass on chrome clips.',
      gilt: 'An ornate gilt frame.',
      black: 'A plain black frame.',
      bulbs: 'A dressing-room frame ringed with lit bulbs.',
    }),
    mount: choice('What is below the mirror?', {
      wall: 'A glass shelf on the tiled wall and a towel on a rail.',
      vanity: 'A vanity counter with a basin and a tap.',
    }),
    lipstick: noul('Does the lipstick lie on the shelf below, cap off?'),
    cracked: noul('Is the glass cracked from one corner?'),
    note: noul('Is a yellow sticky note stuck to the glass?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const chrome = s.material('#d6dadd', { metalness: 0.9, roughness: 0.22 });
    const style = TILES[a.tiles];
    const tiles = (g: G, w: number, h: number, dim = 1) => {
      g.fillStyle = style.grout; g.fillRect(0, 0, w, h);
      for (let row = 0; row * style.h < h; row++) for (let col = -1; col * style.w < w + style.w; col++) {
        const x = col * style.w + (style.offset && row % 2 ? style.w / 2 : 0), y = row * style.h;
        g.fillStyle = a.tiles === 'checker' && (row + col) % 2 ? '#1d1d20' : style.tile;
        g.fillRect(x + 2, y + 2, style.w - 4, style.h - 4);
      }
      if (a.tiles === 'pink') { g.fillStyle = '#1d1d20'; g.fillRect(0, h * 0.62, w, 10); }
      g.fillStyle = `rgba(0,0,0,${0.08 * dim})`; g.fillRect(0, 0, w, h);
      for (let i = 0; i < Math.round(mood.wear * 8); i++) { g.fillStyle = 'rgba(120,80,30,0.25)'; g.fillRect(random() * w, random() * h, 10 + random() * 30, 40 + random() * 120); }
    };

    // ---- the tiled wall or vanity -------------------------------------------------------
    const WW = 1.4, WH = 2.15, WT = 0.1;
    const wallCanvas = canvasOf(512, 768); tiles(wallCanvas.getContext('2d')!, 512, 768);
    const wallMap = textureOf(wallCanvas); wallMap.wrapS = wallMap.wrapT = THREE.RepeatWrapping; wallMap.repeat.set(1.4, 1.4);
    s.box([WW, WH, WT], [0, WH / 2, -WT / 2], new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.35 }));
    const MW = a.mount === 'vanity' ? 1.0 : 0.8, MH = 0.9, MY = a.mount === 'vanity' ? 1.5 : 1.45;
    const shelfY = MY - MH / 2 - 0.1;
    let lipAt: [number, number, number] = [0.2, shelfY + 0.004, 0.1];
    if (a.mount === 'wall') {
      s.box([0.7, 0.008, 0.13], [0, shelfY, 0.065], new THREE.MeshStandardMaterial({ color: '#dff2f0', transparent: true, opacity: 0.5, roughness: 0.05, depthWrite: false }));
      for (const x of [-0.28, 0.28]) s.box([0.03, 0.02, 0.1], [x, shelfY - 0.014, 0.05], chrome);
      s.box([0.7, 0.008, 0.13], [0, shelfY - 0.002, 0.065], new THREE.MeshStandardMaterial({ color: '#cfe6e4', roughness: 0.1, metalness: 0.2 }));
      s.rod([0.5, 1.15, 0.05], [0.5, 1.15, 0.13], 0.008, chrome); s.rod([0.5, 1.15, 0.13], [0.68, 1.15, 0.13], 0.01, chrome);
      s.box([0.16, 0.42, 0.04], [0.6, 0.93, 0.13], s.material(random() < 0.5 ? '#f3f1ea' : '#9fb8c8', { roughness: 1 }));
      s.cylinder(0.035, 0.03, 0.08, [-0.2, shelfY + 0.044, 0.07], new THREE.MeshStandardMaterial({ color: '#eaf4f5', transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false }), 14);
      lipAt = [0.14, shelfY + 0.004, 0.07];
    } else {
      const counterY = 0.86;
      const marble = s.material('#eceae2', { roughness: 0.25 });
      s.box([1.2, 0.8, 0.5], [0, 0.4, 0.26], s.material('#f4f2ec', { roughness: 0.6 }));
      s.box([1.1, 0.012, 0.02], [0, 0.45, 0.515], chrome);
      s.box([1.24, 0.04, 0.56], [0, counterY - 0.02, 0.28], marble);
      s.box([1.24, 0.1, 0.02], [0, counterY + 0.05, 0.01], marble);
      const basin = s.lathe([[0.2, 0.0], [0.18, -0.02], [0.12, -0.09], [0.04, -0.11], [0, -0.11]], new THREE.MeshStandardMaterial({ color: '#f8f8f4', roughness: 0.2, side: THREE.DoubleSide }), [0, counterY, 0.3]);
      void basin;
      s.rod([0, counterY, 0.08], [0, counterY + 0.16, 0.08], 0.014, chrome);
      s.tube([[0, counterY + 0.16, 0.08], [0, counterY + 0.2, 0.14], [0, counterY + 0.17, 0.2]], 0.012, chrome);
      for (const x of [-0.08, 0.08]) s.cylinder(0.018, 0.018, 0.03, [x, counterY + 0.015, 0.1], chrome, 12);
      s.box([0.08, 0.025, 0.055], [0.42, counterY + 0.012, 0.34], s.material('#efe6b8', { roughness: 0.6 }));
      s.cylinder(0.035, 0.03, 0.09, [-0.42, counterY + 0.045, 0.3], new THREE.MeshStandardMaterial({ color: '#eaf4f5', transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false }), 14);
      lipAt = [0.3, counterY + 0.004, 0.2];
    }
    if (a.lipstick) {
      const gold = s.material('#c9a24a', { metalness: 0.85, roughness: 0.3 });
      const body = s.cylinder(0.009, 0.009, 0.06, [lipAt[0], lipAt[1] + 0.009, lipAt[2]], gold, 12); body.rotation.z = Math.PI / 2; body.rotation.y = 0.4;
      const stick = s.cylinder(0.007, 0.007, 0.03, [lipAt[0] - Math.cos(0.4) * 0.044, lipAt[1] + 0.009, lipAt[2] + Math.sin(0.4) * 0.044], s.material('#c8102e', { roughness: 0.4 }), 10); stick.rotation.z = Math.PI / 2; stick.rotation.y = 0.4;
      const cap = s.cylinder(0.0095, 0.0095, 0.035, [lipAt[0] + 0.05, lipAt[1] + 0.0095, lipAt[2] + 0.03], gold, 12); cap.rotation.z = Math.PI / 2; cap.rotation.y = -0.5;
    }

    // ---- the glass and what is written on it ------------------------------------------
    const CW = 512, CH = Math.round(512 * MH / MW);
    const glass = canvasOf(CW, CH);
    const g = glass.getContext('2d')!;
    tiles(g, CW, CH, 1.6);
    // The reflected room: a towel on a rail, a bare bulb, a door edge, all darker than the wall.
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, CW, CH);
    g.fillStyle = '#e9e7e0'; g.fillRect(CW * 0.06, CH * 0.5, CW * 0.14, CH * 0.3);
    g.fillStyle = '#9ca0a3'; g.fillRect(CW * 0.04, CH * 0.49, CW * 0.2, 6);
    g.fillStyle = '#5a5d60'; g.fillRect(CW * 0.84, 0, 8, CH);
    g.fillStyle = '#3b3e42'; g.fillRect(CW * 0.86, 0, CW * 0.14, CH);
    const bulb = g.createRadialGradient(CW * 0.5, CH * 0.08, 4, CW * 0.5, CH * 0.08, 70);
    bulb.addColorStop(0, 'rgba(255,240,200,0.95)'); bulb.addColorStop(0.2, 'rgba(255,230,170,0.5)'); bulb.addColorStop(1, 'rgba(255,220,150,0)');
    g.fillStyle = bulb; g.fillRect(CW * 0.5 - 70, CH * 0.08 - 70, 140, 140);
    const lines = MESSAGES[a.message].split('\n').filter(Boolean);
    const layoutText = (ctx: G, draw: (line: string, x: number, y: number) => void) => {
      const size = Math.min(150, (CH * 0.7) / Math.max(lines.length, 1) * 0.9);
      ctx.font = `${a.medium === 'lipstick' ? 'bold italic' : 'bold'} ${size}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const widest = Math.max(...lines.map((line) => ctx.measureText(line).width), 1);
      const fit = Math.min(1, (CW * 0.84) / widest);
      ctx.font = `${a.medium === 'lipstick' ? 'bold italic' : 'bold'} ${size * fit}px sans-serif`;
      lines.forEach((line, i) => draw(line, CW / 2 + (random() - 0.5) * 20, CH * 0.5 + (i - (lines.length - 1) / 2) * size * fit * 1.05));
    };
    const arrow = (ctx: G) => {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(CW * 0.32, CH * 0.22); ctx.lineTo(CW * 0.62, CH * 0.78);
      ctx.moveTo(CW * 0.42, CH * 0.76); ctx.lineTo(CW * 0.62, CH * 0.78); ctx.lineTo(CW * 0.66, CH * 0.58); ctx.stroke();
    };
    const drips = (ctx: G, colour: string, count: number) => {
      ctx.strokeStyle = colour; ctx.lineCap = 'round';
      for (let i = 0; i < count; i++) {
        const x = CW * (0.2 + random() * 0.6), y = CH * (0.35 + random() * 0.3), len = 20 + random() * 70;
        ctx.lineWidth = 3 + random() * 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 6, y + len); ctx.stroke();
      }
    };
    if (a.medium === 'steam') {
      // Darken the reflection so the wiped letters show as clear dark glass in the pale fog.
      g.fillStyle = 'rgba(20,30,40,0.42)'; g.fillRect(0, 0, CW, CH);
      const fog = canvasOf(CW, CH);
      const f = fog.getContext('2d')!;
      f.fillStyle = 'rgba(226,231,233,0.93)'; f.fillRect(0, 0, CW, CH);
      for (let i = 0; i < 400; i++) { f.fillStyle = 'rgba(255,255,255,0.06)'; f.beginPath(); f.arc(random() * CW, random() * CH, 2 + random() * 6, 0, 7); f.fill(); }
      f.globalCompositeOperation = 'destination-out';
      f.strokeStyle = '#000'; f.fillStyle = '#000'; f.lineWidth = 28; f.lineJoin = 'round';
      if (a.message === 'arrow') { f.lineWidth = 34; arrow(f); }
      else layoutText(f, (line, x, y) => { f.strokeText(line, x, y); f.fillText(line, x, y); });
      // Drips run down from the wiped letters.
      f.lineWidth = 5;
      for (let i = 0; i < 14; i++) { const x = CW * (0.15 + random() * 0.7); f.beginPath(); f.moveTo(x, CH * (0.4 + random() * 0.3)); f.lineTo(x, CH * (0.75 + random() * 0.25)); f.stroke(); }
      g.drawImage(fog, 0, 0);
    } else {
      const ink = a.medium === 'lipstick' ? '#c8102e' : '#1b1b1f';
      g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = a.medium === 'lipstick' ? 16 : 6; g.lineJoin = 'round';
      if (a.message === 'arrow') { g.lineWidth = a.medium === 'lipstick' ? 30 : 16; arrow(g); }
      else layoutText(g, (line, x, y) => {
        for (let pass = 0; pass < (a.medium === 'lipstick' ? 3 : 1); pass++) { g.fillText(line, x + (random() - 0.5) * 6, y + (random() - 0.5) * 6); }
        if (a.medium === 'lipstick') g.strokeText(line, x, y);
      });
      if (a.medium === 'lipstick') drips(g, 'rgba(200,16,46,0.9)', 6);
    }
    if (a.cracked) {
      const cx = CW * (random() < 0.5 ? 0.12 : 0.88), cy = CH * 0.14;
      for (let i = 0; i < 9; i++) {
        const angle = (random() * 0.5 + 0.25) * Math.PI + (cx > CW / 2 ? Math.PI * 0.5 : 0), len = 120 + random() * 300;
        g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy);
        let x = cx, y = cy;
        for (let k = 0; k < 5; k++) { x += Math.cos(angle) * len / 5 + (random() - 0.5) * 24; y += Math.sin(angle) * len / 5 + (random() - 0.5) * 24; g.lineTo(x, y); }
        g.stroke(); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1; g.stroke();
      }
      for (let i = 0; i < 3; i++) { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, 20 + i * 18, 0, Math.PI * 2); g.stroke(); }
    }
    const mirrorMat = new THREE.MeshStandardMaterial({ map: textureOf(glass), roughness: 0.12, metalness: 0.3, emissiveMap: textureOf(glass), emissive: '#ffffff', emissiveIntensity: 0.18 });
    const Z = 0.012;
    s.mesh(new THREE.PlaneGeometry(MW, MH), mirrorMat, [0, MY, Z + 0.001]);
    s.box([MW, MH, 0.012], [0, MY, Z / 2 - 0.005], s.material('#2a2d30'));

    // ---- the frame -----------------------------------------------------------------------
    const frameOf = (material: THREE.Material, thick: number, depth: number) => {
      s.box([MW + thick * 2, thick, depth], [0, MY + MH / 2 + thick / 2, depth / 2], material);
      s.box([MW + thick * 2, thick, depth], [0, MY - MH / 2 - thick / 2, depth / 2], material);
      for (const x of [-1, 1]) s.box([thick, MH, depth], [x * (MW / 2 + thick / 2), MY, depth / 2], material);
    };
    if (a.frame === 'frameless') {
      for (const [x, y] of [[-MW / 2 + 0.08, MY + MH / 2], [MW / 2 - 0.08, MY + MH / 2], [-MW / 2 + 0.08, MY - MH / 2], [MW / 2 - 0.08, MY - MH / 2]]) s.box([0.05, 0.02, 0.025], [x, y, 0.012], chrome);
    } else if (a.frame === 'gilt') {
      const gold = s.material('#d1a94a', { metalness: 0.85, roughness: 0.3 });
      frameOf(gold, 0.07, 0.05);
      for (const x of [-1, 1]) for (const y of [-1, 1]) s.ball([0.05, 0.05, 0.03], [x * (MW / 2 + 0.035), MY + y * (MH / 2 + 0.035), 0.05], gold, 10);
      for (const x of [-1, 1]) { const curl = s.ring(0.035, 0.012, [x * (MW / 2 + 0.035), MY, 0.05], gold); curl.scale.y = 1.3; }
      s.ball([0.06, 0.04, 0.03], [0, MY + MH / 2 + 0.035, 0.05], gold, 10);
    } else if (a.frame === 'black') {
      frameOf(s.material('#1c1c1f', { roughness: 0.5 }), 0.04, 0.03);
    } else {
      frameOf(s.material('#2a2528', { roughness: 0.6 }), 0.09, 0.04);
      const lit = new THREE.MeshStandardMaterial({ color: '#fff3cc', emissive: new THREE.Color('#ffd27a').lerp(new THREE.Color('#ff9a40'), mood.warmth), emissiveIntensity: mix(0.9, 2.0, mood.cheer), roughness: 0.3 });
      const bulbs: [number, number][] = [];
      for (let i = 0; i < 6; i++) { const x = -MW / 2 + 0.05 + i * (MW - 0.1) / 5; bulbs.push([x, MY + MH / 2 + 0.045], [x, MY - MH / 2 - 0.045]); }
      for (let i = 1; i < 5; i++) { const y = MY - MH / 2 + i * MH / 5; bulbs.push([-MW / 2 - 0.045, y], [MW / 2 + 0.045, y]); }
      for (const [x, y] of bulbs) s.ball([0.028, 0.028, 0.028], [x, y, 0.055], lit, 10);
    }
    if (a.note) {
      const note = s.box([0.075, 0.075, 0.002], [-MW / 2 + 0.1, MY - MH / 2 + 0.11, Z + 0.003], s.material('#f6e36a', { roughness: 0.9 }));
      note.rotation.z = (random() - 0.5) * 0.25;
      for (let i = 0; i < 3; i++) s.box([0.045 - i * 0.01, 0.004, 0.002], [-MW / 2 + 0.1, MY - MH / 2 + 0.125 - i * 0.016, Z + 0.0045], s.material('#2a2a30')).rotation.z = note.rotation.z;
    }

    return s.finish();
  },
});
