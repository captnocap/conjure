import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, diorama, mix, noul } from '@conjure/kit';

const SIGNS = {
  hospital: "DOLLS' HOSPITAL",
  infirmary: 'TOY INFIRMARY',
  wait: 'REPAIRS WHILE YOU WAIT',
  bear: 'DR. BEAR  SURGERY 9-5',
  none: 'NO DOLL TURNED AWAY',
} as const;
const DRAWERS = ['EYES', 'LASHES', 'WIGS', 'ARMS', 'LEGS', 'HANDS', 'TEETH', 'SQUEAKS', 'ELASTIC', 'NOSES', 'EARS', 'HEADS', 'GLUE', 'PAINT', 'SAWDUST', 'GROWLERS', 'BUTTONS', 'RIBBON', 'SHOES', 'VOICES', 'SPRINGS', 'FEET', 'TONGUES', 'ODDS', 'PINS', 'WAX', 'LOST', 'FOUND', 'HAIR', 'JOINTS'];

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineWorld({
  questions: {
    state: choice('What state is the doll hospital in?', {
      clinic: 'A warm tidy afternoon clinic: everything in its place, cabinets full, work under way.',
      rush: 'The Christmas rush: paper chains, tagged parcels stacked on the floor, every shelf crammed.',
      'after-hours': 'After hours: the room dim and blue, only the bench lamp burning over one last job.',
      shuttered: 'Shuttered for years: a dust sheet over one cabinet, a CLOSED card, cobwebs, half the patients never collected.',
    }),
    walls: choice('What are the walls like?', {
      sage: 'Sage green tongue-and-groove boarding.',
      cream: 'Cream distempered plaster, slightly mottled.',
      rose: 'Faded rose and cream striped wallpaper.',
      panel: 'Dark varnished wood panelling.',
    }),
    sign: choice('What does the painted sign over the drawers say?', SIGNS),
    patients: choice('Who is waiting in the glass cabinets?', {
      dolls: 'Rows of dolls in coloured dresses, seated shoulder to shoulder.',
      bears: 'Teddy bears of every brown, some with an ear missing.',
      mixed: 'Dolls and bears together, whoever was brought in.',
      heads: 'Only heads: bald doll heads on pegs, staring out.',
    }),
    drawers: noul('Are some of the part drawers pulled open?'),
    lamp: choice('What is the bench lamp?', {
      pendant: 'A single green enamel pendant shade hanging low over the middle of the counter.',
      pair: 'A pair of smaller green enamel pendants.',
      arm: 'A green enamel shade on a jointed brass arm clamped to the counter.',
    }),
    floor: choice('What is the floor?', {
      boards: 'Bare scrubbed floorboards.',
      lino: 'Black and cream chequered linoleum.',
      rug: 'Dark boards with a worn red rug.',
    }),
    counter: choice('What is the counter top like?', {
      pine: 'Scrubbed pale pine, scarred with knife cuts.',
      baize: 'Green baize pinned over the wood.',
      enamel: 'White enamel, clinical, like an operating table.',
      newspaper: 'Covered in spread newspaper, spotted with paint.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const shut = a.state === 'shuttered', night = a.state === 'after-hours', rush = a.state === 'rush';
    const neglect = clamp01(mood.wear * 0.75 + (shut ? 0.45 : 0));
    const dim = night ? 0.55 : shut ? 0.72 : mix(1, 0.86, clamp01((mood.daylight - 0.7) / 0.3));
    const background = night ? '#8d95a6' : shut ? '#b5aa94' : new THREE.Color('#ebe5d4').lerp(new THREE.Color('#f0dcc0'), mood.warmth * 0.6).getStyle();
    const slots: [number, number][] = [[0, 0.35], [6.3, 2.9], [-6.3, 2.8], [-3.7, 0.35], [3.7, 0.35]];
    const topY = 1.7;
    const slotY = [topY, 1.8, 1.0, topY, topY];
    const floorColour = { boards: '#b99a6e', lino: '#d8d2c0', rug: '#6a4a30' }[a.floor];
    const { art: s, world } = diorama(context, { background, floor: floorColour, width: 16, depth: 9.4, yaw: 9, pitch: 13, maxHeight: 3.3, radius: 1.35, slots });
    const root = s.root;
    root.traverse((node) => {
      const light = node as THREE.Light;
      if (!light.isLight) return;
      light.intensity *= dim;
      if (night) light.color.lerp(new THREE.Color('#9fb4e0'), 0.5);
    });

    const wood = s.material('#7a5232', { roughness: 0.6 });
    const darkWood = s.material('#4f3320', { roughness: 0.55 });
    const brass = s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 });
    const cream = s.material('#f0e6cc');

    // ---- Floor ----
    const floorTexture = canvasTexture(512, 256, (ctx) => {
      ctx.fillStyle = floorColour;
      ctx.fillRect(0, 0, 512, 256);
      if (a.floor === 'lino') {
        ctx.fillStyle = '#2c2a28';
        for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) ctx.fillRect(i * 32, j * 32, 32, 32);
      } else {
        ctx.strokeStyle = 'rgba(40,24,12,0.45)';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 16; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, 256); ctx.stroke(); }
        for (let i = 0; i < 40; i++) { const x = Math.floor(random() * 16) * 32, y = random() * 256; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 32, y); ctx.stroke(); }
      }
      for (let i = 0; i < neglect * 40; i++) {
        const gx = random() * 512, gy = random() * 256, gr = 20 + random() * 60;
        const g = ctx.createRadialGradient(gx, gy, 1, gx, gy, gr);
        g.addColorStop(0, `rgba(120,110,95,${0.2 + neglect * 0.3})`);
        g.addColorStop(1, 'rgba(120,110,95,0)');
        ctx.fillStyle = g;
        ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
      }
    });
    const floorTop = s.mesh(new THREE.PlaneGeometry(16, 9.4), new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.85 }), [0, 0.006, 0]);
    floorTop.rotation.x = -Math.PI / 2;
    floorTop.castShadow = false;
    if (a.floor === 'rug') {
      s.box([9, 0.05, 3.2], [0.4, 0.03, 3], s.material('#8a2c2c', { roughness: 1 }));
      s.box([8.4, 0.055, 2.6], [0.4, 0.03, 3], s.material('#a8553a', { roughness: 1 }));
    }

    // ---- Walls ----
    const wallBase = { sage: '#a9b99a', cream: '#ebe0c4', rose: '#e6cfc4', panel: '#6e4a2e' }[a.walls];
    const wallTexture = canvasTexture(512, 256, (ctx) => {
      ctx.fillStyle = wallBase;
      ctx.fillRect(0, 0, 512, 256);
      if (a.walls === 'sage') { ctx.strokeStyle = 'rgba(50,70,50,0.35)'; ctx.lineWidth = 1.5; for (let i = 0; i < 48; i++) { ctx.beginPath(); ctx.moveTo(i * 11, 0); ctx.lineTo(i * 11, 256); ctx.stroke(); } }
      if (a.walls === 'rose') { ctx.fillStyle = 'rgba(190,120,120,0.45)'; for (let i = 0; i < 26; i++) ctx.fillRect(i * 20, 0, 8, 256); }
      if (a.walls === 'panel') { ctx.strokeStyle = 'rgba(30,16,8,0.6)'; ctx.lineWidth = 3; for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) ctx.strokeRect(i * 64 + 6, j * 128 + 6, 52, 116); }
      for (let i = 0; i < 14 + neglect * 40; i++) {
        const gx = random() * 512, gy = random() * 256, gr = 30 + random() * 70;
        const g = ctx.createRadialGradient(gx, gy, 1, gx, gy, gr);
        g.addColorStop(0, `rgba(90,76,56,${0.05 + neglect * 0.2})`);
        g.addColorStop(1, 'rgba(90,76,56,0)');
        ctx.fillStyle = g;
        ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
      }
    });
    const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.9 });
    const H = 9.6;
    s.box([16.3, H, 0.25], [0, H / 2, -4.72], wallMaterial);
    s.box([0.25, H, 9.4], [-8.02, H / 2, 0], wallMaterial);
    s.box([16.3, 0.5, 0.3], [0, 0.25, -4.56], darkWood);
    s.box([0.3, 0.5, 9.4], [-7.86, 0.25, 0], darkWood);
    // The shop-window frame: a beam overhead and a post at the open side.
    s.box([16.3, 0.3, 0.35], [0, H - 0.15, 0.35], darkWood);
    s.box([0.3, H, 0.35], [8, H / 2, 0.35], darkWood);

    // ---- Glass cabinets of waiting patients ----
    const tones = ['#f3dccd', '#f1d2c0', '#d9a67e', '#8a5a3c', '#eac4a6'];
    const dresses = ['#b8404a', '#3f6f9f', '#e2c25a', '#6f9f6a', '#e8e0d0', '#8a5a9f', '#d88a9a'];
    const furs = ['#a8743a', '#7a4f26', '#c99a5a', '#5e3d22', '#d8c090'];
    const hairs = ['#e3c779', '#96421f', '#4d2f1c', '#1c1816'];
    type Dot = { at: [number, number, number]; size: number; color?: THREE.ColorRepresentation };
    const bodies: Dot[] = [], heads: Dot[] = [], caps: Dot[] = [], eyes: Dot[] = [], tags: Dot[] = [], pegs: Dot[] = [];
    const grime = new THREE.Color('#8f8676');
    const tint = (hex: string) => new THREE.Color(hex).lerp(grime, neglect * 0.45);
    const present = mix(0.5, 1, mood.density) * (shut ? 0.5 : rush ? 1.2 : 1);
    const cabinet = (cx: number, covered: boolean) => {
      const w = 4.5, h = 7.3, d = 1.15, z = -3.95, front = z + d / 2;
      if (covered) {
        const sheet = s.material('#e4decf', { roughness: 1 });
        s.box([w + 0.3, h + 0.15, d + 0.25], [cx, (h + 0.15) / 2, z + 0.05], sheet);
        for (let i = 0; i < 7; i++) {
          const x = cx - w / 2 + 0.3 + i * (w - 0.6) / 6 + (random() - 0.5) * 0.2;
          s.rod([x, h + 0.1, front + 0.17], [x + (random() - 0.5) * 0.5, 0.05 + random() * 0.3, front + 0.2 + random() * 0.2], 0.09, sheet, 0.14);
        }
        return;
      }
      s.box([w, h, 0.08], [cx, h / 2, z - d / 2 + 0.04], darkWood);
      for (const side of [-1, 1]) s.box([0.12, h, d], [cx + side * (w / 2 - 0.06), h / 2, z], wood);
      s.box([w + 0.3, 0.28, d + 0.2], [cx, h + 0.14, z + 0.05], wood);
      s.box([w, 0.5, d], [cx, 0.25, z], wood);
      const shelfYs = [0.5, 2.15, 3.8, 5.45];
      for (const y of shelfYs) {
        if (y > 0.5) s.box([w - 0.2, 0.08, d - 0.1], [cx, y, z], wood);
        const n = 6;
        for (let i = 0; i < n; i++) {
          if (random() > present) continue;
          const x = cx - w / 2 + 0.45 + i * (w - 0.9) / (n - 1) + (random() - 0.5) * 0.12;
          const pz = z + 0.12 + (random() - 0.5) * 0.2, by = y + 0.04;
          const kind = a.patients === 'mixed' ? (random() < 0.5 ? 'dolls' : 'bears') : a.patients;
          const scale = mix(0.82, 1.1, random());
          if (kind === 'heads') {
            pegs.push({ at: [x, by + 0.25, pz], size: 0.5 });
            heads.push({ at: [x, by + 0.72, pz], size: 0.27 * scale, color: tint(tones[Math.floor(random() * tones.length)]) });
            for (const side of [-1, 1]) if (random() > neglect * 0.5) eyes.push({ at: [x + side * 0.1 * scale, by + 0.76, pz + 0.235 * scale], size: 0.045 });
          } else if (kind === 'bears') {
            const fur = tint(furs[Math.floor(random() * furs.length)]);
            bodies.push({ at: [x, by, pz], size: 0.68 * scale, color: fur });
            heads.push({ at: [x, by + 0.84 * scale, pz + 0.02], size: 0.25 * scale, color: fur });
            for (const side of [-1, 1]) {
              if (random() > neglect * 0.35) caps.push({ at: [x + side * 0.2 * scale, by + 1.05 * scale, pz], size: 0.1 * scale, color: fur });
              eyes.push({ at: [x + side * 0.09 * scale, by + 0.9 * scale, pz + 0.22 * scale], size: 0.035 });
            }
            caps.push({ at: [x, by + 0.8 * scale, pz + 0.22 * scale], size: 0.1 * scale, color: tint('#e0c8a0') });
          } else {
            bodies.push({ at: [x, by, pz], size: 0.7 * scale, color: tint(dresses[Math.floor(random() * dresses.length)]) });
            heads.push({ at: [x, by + 0.86 * scale, pz + 0.02], size: 0.23 * scale, color: tint(tones[Math.floor(random() * tones.length)]) });
            if (random() > neglect * 0.4) caps.push({ at: [x, by + 0.93 * scale, pz - 0.05], size: 0.245 * scale, color: tint(hairs[Math.floor(random() * hairs.length)]) });
            for (const side of [-1, 1]) if (random() > neglect * 0.25) eyes.push({ at: [x + side * 0.085 * scale, by + 0.89 * scale, pz + 0.215 * scale], size: 0.04 });
          }
          if (random() < 0.35 + neglect * 0.4) tags.push({ at: [x + 0.16, by + 0.3, pz + 0.3], size: 1 });
        }
      }
      // Glazing: a faint pane and the bars that hold it.
      const pane = s.mesh(new THREE.PlaneGeometry(w - 0.2, h - 0.6), new THREE.MeshStandardMaterial({ color: '#dfeef0', transparent: true, opacity: 0.12 + neglect * 0.12, depthWrite: false, roughness: 0.1 }), [cx, h / 2 + 0.2, front]);
      pane.castShadow = false;
      s.box([0.1, h - 0.5, 0.08], [cx, h / 2 + 0.22, front + 0.02], wood);
      for (const y of [0.5, 3.75, h - 0.05]) s.box([w - 0.2, 0.1, 0.08], [cx, y, front + 0.02], wood);
      for (const side of [-1, 1]) s.ball([0.07, 0.07, 0.07], [cx + side * 0.16, 3.4, front + 0.09], brass, 10);
    };
    cabinet(-5.45, false);
    cabinet(5.45, shut);
    const pear = new THREE.LatheGeometry([[0, 0], [0.42, 0], [0.46, 0.12], [0.34, 0.5], [0.2, 0.85], [0.14, 1], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
    const flat = (roughness = 0.8) => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness });
    if (bodies.length) s.scatter(pear, flat(0.9), bodies);
    if (heads.length) s.scatter(new THREE.SphereGeometry(1, 12, 8), flat(0.45), heads);
    if (caps.length) s.scatter(new THREE.SphereGeometry(1, 10, 7), flat(0.95), caps);
    if (eyes.length) s.scatter(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ color: '#141216', roughness: 0.2 }), eyes).castShadow = false;
    if (tags.length) s.scatter(new THREE.BoxGeometry(0.16, 0.26, 0.01), cream, tags).castShadow = false;
    if (pegs.length) s.scatter(new THREE.CylinderGeometry(0.1, 0.12, 1, 8), wood, pegs);

    // ---- Drawer bank, labelled by part ----
    const cols = 6, rowsN = 5, bw = 5.9, bh = 4.8, bz = -4.05, bd = 1.0;
    const labels = DRAWERS.slice().sort(() => random() - 0.5);
    const drawerTexture = canvasTexture(1024, 832, (ctx) => {
      ctx.fillStyle = '#6a4528';
      ctx.fillRect(0, 0, 1024, 832);
      const cw = 1024 / cols, ch = 832 / rowsN;
      for (let r = 0; r < rowsN; r++) for (let c = 0; c < cols; c++) {
        const x = c * cw, y = r * ch;
        ctx.fillStyle = (r + c) % 2 ? '#8a5c36' : '#83552f';
        ctx.fillRect(x + 6, y + 6, cw - 12, ch - 12);
        ctx.strokeStyle = 'rgba(30,16,8,0.7)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 6, y + 6, cw - 12, ch - 12);
        ctx.fillStyle = '#b8963a';
        ctx.fillRect(x + 22, y + 26, cw - 44, 52);
        ctx.fillStyle = `#${new THREE.Color('#f2e8cc').lerp(new THREE.Color('#b09a6a'), neglect * 0.6).getHexString()}`;
        ctx.fillRect(x + 28, y + 31, cw - 56, 42);
        ctx.fillStyle = '#2c2018';
        ctx.font = 'bold 26px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labels[(r * cols + c) % labels.length], x + cw / 2, y + 53, cw - 62);
      }
    });
    s.box([bw, bh, bd], [0, bh / 2, bz], wood);
    const face = s.mesh(new THREE.PlaneGeometry(bw - 0.1, bh - 0.1), new THREE.MeshStandardMaterial({ map: drawerTexture, roughness: 0.7 }), [0, bh / 2, bz + bd / 2 + 0.01]);
    face.castShadow = false;
    const knobs: Dot[] = [];
    const openDrawers = new Set<number>();
    if (a.drawers) while (openDrawers.size < 4 + Math.floor(random() * 3)) openDrawers.add(Math.floor(random() * cols * 2));
    const dw = (bw - 0.1) / cols, dh = (bh - 0.1) / rowsN;
    const bits: Dot[] = [];
    for (let r = 0; r < rowsN; r++) for (let c = 0; c < cols; c++) {
      const x = -bw / 2 + 0.05 + (c + 0.5) * dw, y = bh - 0.05 - (r + 0.5) * dh;
      const pulled = openDrawers.has(r * cols + c) ? 0.25 + random() * 0.45 : 0;
      if (pulled) {
        s.box([dw - 0.08, dh - 0.1, pulled], [x, y, bz + bd / 2 + pulled / 2], darkWood);
        s.box([dw - 0.06, dh - 0.08, 0.05], [x, y, bz + bd / 2 + pulled + 0.025], wood);
        for (let k = 0; k < 6; k++) bits.push({ at: [x + (random() - 0.5) * (dw - 0.25), y + dh / 2 - 0.02 + random() * 0.08, bz + bd / 2 + 0.08 + random() * (pulled - 0.1)], size: 0.07 + random() * 0.05, color: tones[Math.floor(random() * tones.length)] });
      }
      knobs.push({ at: [x, y - dh * 0.2, bz + bd / 2 + pulled + 0.06], size: 0.06 });
    }
    s.scatter(new THREE.SphereGeometry(1, 8, 6), brass, knobs).castShadow = false;
    if (bits.length) s.scatter(new THREE.SphereGeometry(1, 8, 6), flat(0.5), bits);
    // Top of the drawers: jars and a few heads waiting for wigs.
    s.box([bw + 0.2, 0.12, bd + 0.15], [0, bh + 0.06, bz + 0.03], darkWood);
    const jar = new THREE.MeshStandardMaterial({ color: '#cfe0dc', transparent: true, opacity: 0.45, roughness: 0.1 });
    const shelfHeads: Dot[] = [], shelfEyes: Dot[] = [];
    for (let i = 0; i < 8; i++) {
      const x = -bw / 2 + 0.45 + i * (bw - 0.9) / 7;
      if (random() > mix(0.55, 1, mood.density)) continue;
      if (i % 3 === 1) {
        s.cylinder(0.22, 0.22, 0.6, [x, bh + 0.42, bz], jar, 14);
        s.cylinder(0.18, 0.18, 0.3 + random() * 0.2, [x, bh + 0.3, bz], s.material(['#f1d2c0', '#2f6fd0', '#e8e0d0', '#b8404a'][Math.floor(random() * 4)]), 12);
        s.cylinder(0.2, 0.2, 0.07, [x, bh + 0.75, bz], brass, 14);
      } else {
        s.cylinder(0.06, 0.08, 0.3, [x, bh + 0.27, bz], wood, 8);
        shelfHeads.push({ at: [x, bh + 0.62, bz], size: 0.25, color: tint(tones[Math.floor(random() * tones.length)]) });
        for (const side of [-1, 1]) shelfEyes.push({ at: [x + side * 0.09, bh + 0.66, bz + 0.22], size: 0.042 });
      }
    }
    if (shelfHeads.length) {
      s.scatter(new THREE.SphereGeometry(1, 12, 8), flat(0.45), shelfHeads);
      s.scatter(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ color: '#141216', roughness: 0.2 }), shelfEyes).castShadow = false;
    }
    // Sign.
    const signPaper = shut ? '#3d4a3c' : '#24402f';
    s.box([6.3, 1.15, 0.1], [0, 6.95, -4.55], darkWood);
    const sign = s.label(SIGNS[a.sign], 6, 0.9, [0, 6.95, -4.49], new THREE.Color('#e6c460').lerp(grime, neglect * 0.5).getStyle(), signPaper);
    sign.rotation.z = shut ? -0.035 : 0;
    sign.castShadow = false;

    // ---- Counter ----
    const cw = 10.6, cd = 2.7, cz = 0.25;
    const topColour = { pine: '#d8b888', baize: '#3f6b4a', enamel: '#eef0ec', newspaper: '#d8d2c0' }[a.counter];
    s.box([cw - 0.3, topY - 0.16, cd - 0.3], [0, (topY - 0.16) / 2, cz], wood);
    const topTexture = canvasTexture(512, 128, (ctx) => {
      ctx.fillStyle = topColour;
      ctx.fillRect(0, 0, 512, 128);
      if (a.counter === 'pine') { ctx.strokeStyle = 'rgba(90,60,30,0.4)'; for (let i = 0; i < 60; i++) { ctx.lineWidth = 0.6 + random(); ctx.beginPath(); const x = random() * 512, y = random() * 128; ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 60, y + (random() - 0.5) * 30); ctx.stroke(); } }
      if (a.counter === 'newspaper') {
        for (let i = 0; i < 7; i++) {
          ctx.save();
          ctx.translate(40 + i * 72, 64 + (random() - 0.5) * 30);
          ctx.rotate((random() - 0.5) * 0.5);
          ctx.fillStyle = '#e6e0cc';
          ctx.fillRect(-50, -60, 100, 120);
          ctx.fillStyle = '#6a665c';
          for (let k = 0; k < 20; k++) ctx.fillRect(-44 + (k % 2) * 46, -52 + Math.floor(k / 2) * 11, 40, 2.5);
          ctx.restore();
        }
        for (let i = 0; i < 24; i++) { ctx.fillStyle = ['#b8404a', '#3f6f9f', '#f1d2c0'][i % 3]; ctx.beginPath(); ctx.arc(random() * 512, random() * 128, 2 + random() * 5, 0, 7); ctx.fill(); }
      }
      for (let i = 0; i < neglect * 24; i++) {
        const gx = random() * 512, gy = random() * 128, gr = 14 + random() * 40;
        const g = ctx.createRadialGradient(gx, gy, 1, gx, gy, gr);
        g.addColorStop(0, `rgba(110,100,84,${0.2 + neglect * 0.25})`);
        g.addColorStop(1, 'rgba(110,100,84,0)');
        ctx.fillStyle = g;
        ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
      }
    });
    const top = s.box([cw, 0.16, cd], [0, topY - 0.08, cz], [wood, wood, new THREE.MeshStandardMaterial({ map: topTexture, roughness: a.counter === 'enamel' ? 0.25 : 0.85 }), wood, wood, wood] as unknown as THREE.Material);
    top.receiveShadow = true;
    for (let i = 0; i < 5; i++) {
      const x = -cw / 2 + 0.25 + (i + 0.5) * (cw - 0.5) / 5;
      s.box([(cw - 0.5) / 5 - 0.25, topY - 0.6, 0.05], [x, (topY - 0.2) / 2, cz + cd / 2 - 0.13], darkWood);
      s.ball([0.06, 0.06, 0.06], [x, topY - 0.45, cz + cd / 2 - 0.08], brass, 8);
    }
    // Bench dressing along the back edge, clear of the standing slots.
    const backZ = cz - cd / 2 + 0.4;
    const jarAt = (x: number, colour: string) => {
      s.cylinder(0.2, 0.17, 0.42, [x, topY + 0.21, backZ], s.material(colour, { roughness: 0.4 }), 14);
      for (let i = 0; i < 4; i++) {
        const tip: [number, number, number] = [x + (random() - 0.5) * 0.4, topY + 0.95 + random() * 0.3, backZ + (random() - 0.5) * 0.3];
        s.rod([x + (random() - 0.5) * 0.1, topY + 0.35, backZ], tip, 0.022, wood);
        s.ball([0.04, 0.09, 0.04], tip, s.material(['#b8404a', '#f1d2c0', '#2c2018', '#3f6f9f'][i % 4]), 6);
      }
    };
    jarAt(-1.85, '#e8e0d0');
    jarAt(1.95, '#7d9aa6');
    for (const [x, colour, h] of [[-5.0, '#6a3a14', 0.6], [-4.75, '#2f5d62', 0.45], [5.0, '#6a3a14', 0.55], [1.6, '#e8e0d0', 0.3]] as const) {
      s.cylinder(0.11, 0.13, h, [x, topY + h / 2, backZ + 0.1], s.material(colour, { roughness: 0.25 }), 10);
      s.cylinder(0.05, 0.05, 0.12, [x, topY + h + 0.06, backZ + 0.1], darkWood, 8);
    }
    const spool = s.cylinder(0.14, 0.14, 0.3, [-2.25, topY + 0.15, backZ + 0.35], s.material('#b8404a'), 12);
    spool.castShadow = true;
    s.cylinder(0.19, 0.19, 0.04, [-2.25, topY + 0.02, backZ + 0.35], wood, 12);
    s.cylinder(0.19, 0.19, 0.04, [-2.25, topY + 0.3, backZ + 0.35], wood, 12);
    if (night) {
      s.cylinder(0.17, 0.14, 0.3, [2.3, topY + 0.15, backZ + 0.5], s.material('#eef0ec', { roughness: 0.3 }), 14);
      s.ring(0.1, 0.025, [2.5, topY + 0.15, backZ + 0.5], s.material('#eef0ec', { roughness: 0.3 }));
    }
    if (shut) {
      const card = s.label('CLOSED', 1.6, 0.6, [1.9, topY + 0.42, cz + cd / 2 - 0.2], '#8a2420', '#e8dcc0');
      card.rotation.x = -0.25;
      card.rotation.z = 0.06;
    }

    // ---- Stool and crate: the side stands ----
    const [sx, sz] = slots[1];
    s.cylinder(1.25, 1.25, 0.16, [sx, slotY[1] - 0.08, sz], wood, 24);
    for (let i = 0; i < 3; i++) {
      const ang = i * 2.094 + 0.5;
      s.rod([sx + Math.sin(ang) * 1.05, 0, sz + Math.cos(ang) * 1.05], [sx + Math.sin(ang) * 0.6, slotY[1] - 0.14, sz + Math.cos(ang) * 0.6], 0.09, darkWood, 0.07);
    }
    s.ring(0.72, 0.035, [sx, 0.7, sz], brass).rotation.x = Math.PI / 2;
    const [kx, kz] = slots[2];
    s.box([2.9, slotY[2] - 0.08, 2.5], [kx, (slotY[2] - 0.08) / 2, kz], s.material('#b89468', { roughness: 0.85 }));
    s.box([3.0, 0.08, 2.6], [kx, slotY[2] - 0.04, kz], s.material('#c9a678', { roughness: 0.85 }));
    for (const y of [0.3, 0.62]) s.box([2.93, 0.03, 2.53], [kx, y, kz], darkWood);
    const crateLabel = s.label('FRAGILE', 1.5, 0.34, [kx, 0.46, kz + 1.262], '#8a2420', '#c9a678');
    crateLabel.castShadow = false;

    // ---- Lamps ----
    const green = s.material('#1f6b45', { roughness: 0.25, metalness: 0.2 });
    const glowStrength = night ? 1.6 : shut ? 0.5 : mix(0.7, 1.2, 1 - mood.daylight * 0.5);
    const glowMaterial = new THREE.MeshStandardMaterial({ color: '#fff3cf', emissive: '#ffd27a', emissiveIntensity: glowStrength, roughness: 0.5 });
    const swingers: THREE.Group[] = [];
    const shade = (parent: THREE.Object3D, size: number) => {
      const cone = new THREE.Mesh(new THREE.LatheGeometry([[0.08, 0.62], [0.16, 0.56], [0.22, 0.36], [0.95, 0.04], [1, 0]].map(([x, y]) => new THREE.Vector2(x * size, y * size)), 28), green);
      (cone.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      cone.castShadow = true;
      parent.add(cone);
      const under = new THREE.Mesh(new THREE.CircleGeometry(size * 0.93, 24), new THREE.MeshStandardMaterial({ color: '#f4f1e6', emissive: '#ffe2a8', emissiveIntensity: glowStrength * 0.5, side: THREE.DoubleSide }));
      under.rotation.x = Math.PI / 2;
      under.position.y = size * 0.06;
      parent.add(under);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(size * 0.2, 12, 8), glowMaterial);
      bulb.position.y = size * 0.02;
      parent.add(bulb);
      if (glowStrength > 0.6) {
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.9, size * 2.6, 4.2, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe2a0', transparent: true, opacity: night ? 0.16 : 0.06, depthWrite: false, side: THREE.DoubleSide }));
        beam.position.y = -2.1;
        parent.add(beam);
      }
    };
    const lampXs = a.lamp === 'pair' ? [-2.6, 2.6] : [0];
    const lampY = 6.5;
    if (a.lamp === 'arm') {
      const base: [number, number, number] = [-1.5, topY, backZ - 0.1];
      s.cylinder(0.2, 0.26, 0.14, [base[0], topY + 0.07, base[2]], brass, 14);
      const elbow: [number, number, number] = [-2.2, 4.4, base[2]];
      const tip: [number, number, number] = [-0.25, 6.2, 0.1];
      s.rod([base[0], topY + 0.1, base[2]], elbow, 0.05, brass);
      s.rod(elbow, tip, 0.05, brass);
      s.ball([0.1, 0.1, 0.1], elbow, brass, 10);
      const holder = new THREE.Group();
      holder.position.set(tip[0] + 0.15, tip[1] - 0.45, tip[2] + 0.1);
      holder.rotation.z = -0.3;
      root.add(holder);
      shade(holder, 0.85);
    } else {
      for (const x of lampXs) {
        const swing = new THREE.Group();
        swing.position.set(x, H - 0.3, 0.35);
        root.add(swing);
        const drop = H - 0.3 - lampY;
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, drop - 0.5, 6), new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 0.8 }));
        cord.position.y = -(drop - 0.5) / 2;
        swing.add(cord);
        const holder = new THREE.Group();
        holder.position.y = -drop;
        swing.add(holder);
        shade(holder, a.lamp === 'pair' ? 0.75 : 1.05);
        swingers.push(swing);
      }
    }
    const lampLight = new THREE.PointLight('#ffcf8a', (night ? 70 : shut ? 22 : 30) * mix(0.8, 1.2, mood.warmth), 13, 1.5);
    lampLight.position.set(0, lampY - 0.5, 0.6);
    root.add(lampLight);

    // ---- State dressing ----
    if (rush) {
      const chain = ['#c0392b', '#2e8b57', '#e2b23a', '#3f6f9f'];
      const links: Dot[] = [];
      for (let sw = 0; sw < 4; sw++) {
        const x0 = -7.6 + sw * 3.85, x1 = x0 + 3.85;
        for (let i = 0; i <= 14; i++) {
          const t = i / 14;
          links.push({ at: [mix(x0, x1, t), 9.05 - Math.sin(t * Math.PI) * 0.75, -4.45], size: 0.13, color: chain[(i + sw) % 4] });
        }
      }
      s.scatter(new THREE.TorusGeometry(1, 0.32, 5, 10), flat(0.7), links).castShadow = false;
      const papers = ['#a8743a', '#c0392b', '#2e6b4f', '#d8c8a0'];
      for (let i = 0; i < 7; i++) {
        const w = 0.7 + random() * 0.7, h = 0.45 + random() * 0.6, d = 0.6 + random() * 0.5;
        const x = i < 4 ? -2.6 + i * 1.5 + (random() - 0.5) * 0.4 : -1.8 + (i - 4) * 1.7, y = i < 4 ? h / 2 : 1.0 + h / 2;
        const z = 3.2 + (random() - 0.5) * 0.5;
        const parcel = s.box([w, h, d], [x, i < 4 ? y : y - 0.2, z], s.material(papers[i % 4], { roughness: 0.9 }));
        parcel.rotation.y = (random() - 0.5) * 0.5;
        if (i < 4) {
          s.box([w + 0.02, 0.04, d + 0.02], [x, y, z], cream).rotation.y = parcel.rotation.y;
          const tag = s.box([0.3, 0.02, 0.2], [x + 0.1, h + 0.012, z + 0.1], cream);
          tag.rotation.y = random();
        } else parcel.position.y = h / 2 + 0.6, parcel.scale.setScalar(0.8), parcel.position.x = -2.6 + (i - 4) * 1.5 + 0.2;
      }
    }
    if (neglect > 0.45) {
      const web = new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 1 });
      const corners: [number, number, number][] = [[-7.85, H - 0.1, -4.55], [7.7, H - 0.3, 0.35]];
      for (const [cx2, cy2, cz2] of corners) {
        const dir = cx2 < 0 ? 1 : -1;
        for (let i = 0; i < 6; i++) {
          const t = i / 5;
          s.rod([cx2, cy2 - 0.1, cz2 + 0.05], [cx2 + dir * (2.2 - t * 2.1), cy2 - 0.1 - t * 2.2, cz2 + 0.06], 0.012, web).castShadow = false;
        }
        for (let ring = 1; ring <= 3; ring++) s.rod([cx2 + dir * ring * 0.65, cy2 - 0.12, cz2 + 0.06], [cx2 + dir * 0.05, cy2 - 0.1 - ring * 0.68, cz2 + 0.06], 0.01, web).castShadow = false;
      }
    }

    // Things stand on the counter, the stool and the crate, not on the floor.
    const basePlace = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      basePlace(items);
      items.forEach((item, index) => {
        item.holder.position.y = slotY[index % slotY.length];
        item.holder.updateMatrixWorld(true);
      });
    };
    const energy = mood.energy;
    world.update = (_dt, time) => {
      swingers.forEach((swing, i) => { swing.rotation.z = Math.sin(time * 1.1 + i * 1.7) * 0.05 * energy; });
      if (night || shut) glowMaterial.emissiveIntensity = glowStrength * (1 + Math.sin(time * 13) * Math.sin(time * 3.1) * 0.12 * energy);
    };
    return world;
  },
});
