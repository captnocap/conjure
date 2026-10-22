import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, noul } from '@conjure/kit';

const PALETTES = {
  rose: { accent: '#e2708f', deep: '#a8233f', wall: '#f3e1d8', metal: '#d4aa52', glass: '#d9e9e2' },
  noir: { accent: '#c8102e', deep: '#2b2730', wall: '#6a6570', metal: '#d8dde0', glass: '#c9d3d8' },
  mint: { accent: '#58b79c', deep: '#1f6f5e', wall: '#eef0de', metal: '#d4aa52', glass: '#d3ebe2' },
  lilac: { accent: '#a56be0', deep: '#14808c', wall: '#e7ddf3', metal: '#d8dde0', glass: '#d9dcf0' },
} as const;
const WORDS = { beauty: 'Beauty', glamour: 'Glamour', piercing: 'Ear Piercing', rouge: 'Rouge', makeover: 'Free Makeovers', sale: 'Everything Must Go' } as const;
const SHADES = ['#c40f22', '#ff6a4d', '#b97f6c', '#641a44', '#e23c97', '#f2a0b4', '#8a1c2c', '#d9507a', '#ff9a3c', '#7a35c2', '#2aa8a0', '#1b171c'];

function canvasOf(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
const shade = (a: string, b: string, t: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;

export default defineWorld({
  questions: {
    place: choice('What kind of beauty counter is it?', {
      hall: 'A grand department-store beauty hall: panelled wall, marble-fronted case, everything polished.',
      kiosk: 'A teenage mall piercing and make-up kiosk: pegboard hung with earring cards, loud and cheap.',
      drugstore: 'A drugstore make-up counter: white laminate, price stickers, a fluorescent tube overhead.',
    }),
    palette: choice('What are its colours?', {
      rose: 'Powder pink, cream and brass, like a 1960s compact.',
      noir: 'Black lacquer, chrome and lipstick red, expensive and severe.',
      mint: 'Mint green, cream and brass, a soda-fountain pastel.',
      lilac: 'Lilac and teal with chrome, 1990s mall bright.',
    }),
    state: choice('What is happening at the counter?', {
      open: 'Open and immaculate, every tester lined up, waiting for a customer.',
      makeover: 'Mid-makeover: tissues, cotton pads, open pots and a hand mirror strewn over the glass.',
      closing: 'A closing-down sale: red discount cards, a banner, half the stock already gone.',
      afterhours: 'After hours: the store lights down, only the mirror bulbs and the sign still glowing.',
      abandoned: 'Abandoned: bulbs dead, a dust sheet over a mirror, bottles fallen over.',
    }),
    sign: choice('What hangs on the wall behind?', {
      awning: 'A striped awning with a scalloped edge and the name along it.',
      neon: 'A neon script sign, the word written in one glowing line.',
      lightbox: 'A plain backlit box sign with block letters.',
    }),
    words: choice('What does the sign say?', WORDS),
    mirrors: choice('What mirrors flank the middle of the counter?', {
      round: 'Two tilted round mirrors ringed with light bulbs.',
      hollywood: 'Two square Hollywood make-up mirrors with bulbs down both sides.',
      gilt: 'Two oval mirrors in ornate gilt frames, no bulbs.',
    }),
    testers: choice('What is laid out to try?', {
      lipsticks: 'Tiered stands of lipstick testers in every red.',
      perfume: 'Perfume bottles and atomisers of every shape.',
      piercing: 'Cards of studs and hoops, a tray of rings, a piercing gun.',
      nails: 'A rainbow row of nail polish bottles.',
      powders: 'Open compacts, powder pots and a cup of brushes.',
    }),
    poster: choice('What do the posters behind show?', {
      lips: 'Huge painted lips.',
      eye: 'One enormous made-up eye.',
      bottle: 'A perfume bottle in a burst of rays.',
    }),
    stool: noul('Is a velvet stool pulled up at the front of the counter?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const pal = PALETTES[a.palette];
    const dark = a.state === 'afterhours', dead = a.state === 'abandoned';
    const grime = dead ? Math.max(mood.wear, 0.75) : mood.wear;
    const WD = 14, DP = 7.6, FLOOR = -1.9;
    const { art: s, world } = diorama(context, {
      background: dark ? '#8f8ba6' : shade('#ebe8e1', pal.accent, 0.08), floor: pal.glass, width: WD, depth: DP,
      maxHeight: 3.3, radius: 1.5, pitch: 28, yaw: 24,
      slots: [[0, 1.05], [-4.7, 1.5], [4.7, 1.5], [-5.2, -2.1], [5.2, -2.1]],
    });
    const RISE = [0, 0.5, 0.5, 1.0, 1.0];
    const place = world.place;
    world.place = (items) => { place(items); items.forEach((item, i) => { item.holder.position.y += RISE[i % RISE.length]; }); };
    if (dark) for (const child of s.root.children) { const light = child as THREE.Light; if (light.isLight) light.intensity *= light.type === 'HemisphereLight' ? 0.62 : 0.5; }

    const metal = s.material(pal.metal, { metalness: 0.85, roughness: 0.28 });
    const wallPaint = s.material(pal.wall, { roughness: 0.9 });
    const accent = s.material(pal.accent, { roughness: 0.6 });
    const deep = s.material(pal.deep, { roughness: 0.7 });
    const white = s.material('#f6f3ec', { roughness: 0.6 });
    const stock = a.state === 'closing' ? 0.45 : dead ? 0.6 : 1;
    const amount = (n: number) => Math.max(2, Math.round(n * mix(0.55, 1.25, mood.density) * stock));
    const glowOf = (base: number) => (dead ? 0 : base * (dark ? 1.6 : 1));
    const flicker: THREE.MeshStandardMaterial[] = [];

    // The counter glass: stock seen dimly through it, fingerprints and dust on top.
    const topMap = canvasOf(1024, 556, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, shade(pal.glass, pal.deep, 0.12)); g.addColorStop(1, shade(pal.glass, pal.deep, 0.3));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = shade(pal.glass, '#34403e', 0.5); ctx.fillRect(40, 60, w - 80, h - 120);
      for (let row = 0; row < 5; row++) for (let i = 0; i < 26; i++) {
        if (random() > stock * mix(0.6, 1, mood.density)) continue;
        const x = 70 + i * 34.5 + random() * 4, y = 96 + row * 86;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = row % 2 ? SHADES[Math.floor(random() * SHADES.length)] : shade(pal.metal, '#ffffff', random() * 0.4);
        if (row % 2) { ctx.beginPath(); ctx.arc(x + 10, y + 12, 11, 0, 7); ctx.fill(); } else ctx.fillRect(x, y, 14, 42);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = shade(pal.metal, '#3a3020', 0.2); ctx.lineWidth = 6;
      for (const x of [w / 3, (w * 2) / 3]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 26;
      for (let i = 0; i < 4; i++) { const x = 120 + i * 270 + random() * 60; ctx.beginPath(); ctx.moveTo(x, -20); ctx.lineTo(x - 190, h + 20); ctx.stroke(); }
      for (let i = 0; i < 90 * grime; i++) { ctx.fillStyle = `rgba(120,112,98,${0.08 + random() * 0.14})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 20 + random() * 60, 12 + random() * 30, random() * 3, 0, 7); ctx.fill(); }
      if (a.state === 'makeover') for (let i = 0; i < 9; i++) { ctx.fillStyle = `${SHADES[Math.floor(random() * 6)]}55`; ctx.beginPath(); ctx.ellipse(300 + random() * 420, 380 + random() * 140, 14 + random() * 30, 8 + random() * 14, random() * 3, 0, 7); ctx.fill(); }
    });
    const slab = world.ground as THREE.Mesh;
    const edge = slab.material as THREE.Material;
    slab.material = [edge, edge, new THREE.MeshStandardMaterial({ map: topMap, roughness: 0.25 + grime * 0.4 }), edge, edge, edge];
    for (const z of [-DP / 2, DP / 2]) s.box([WD + 0.2, 0.3, 0.14], [0, -0.1, z], metal);
    for (const x of [-WD / 2, WD / 2]) s.box([0.14, 0.3, DP + 0.2], [x, -0.1, 0], metal);

    // The display case under it, lit from inside.
    const front = { hall: '#e9e4dc', kiosk: pal.deep, drugstore: '#f4f4f0' }[a.place];
    s.box([WD - 0.2, -FLOOR - 0.24, DP - 0.2], [0, (FLOOR - 0.24) / 2, 0], s.material(front, { roughness: a.place === 'hall' ? 0.35 : 0.7 }));
    const caseMap = (wide: number) => canvasOf(Math.round(160 * wide), 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, dead ? '#5c5a56' : '#fff6dc'); g.addColorStop(1, dead ? '#3f3d3a' : shade(pal.accent, '#fff0d8', 0.55));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (let shelf = 0; shelf < 2; shelf++) {
        const y = 118 + shelf * 122;
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(0, y, w, 5);
        for (let x = 14; x < w - 20; x += 15 + random() * 16) {
          if (random() > stock * mix(0.55, 1, mood.density)) continue;
          const kind = Math.floor(random() * 3), tall = 26 + random() * 50;
          ctx.fillStyle = kind === 0 ? SHADES[Math.floor(random() * SHADES.length)] : kind === 1 ? shade(pal.metal, '#6a5020', 0.2) : shade(pal.deep, '#ffffff', random() * 0.5);
          if (kind === 1) { ctx.fillRect(x, y - tall, 9, tall); ctx.fillStyle = SHADES[Math.floor(random() * 8)]; ctx.fillRect(x + 1.5, y - tall - 9, 6, 9); }
          else if (kind === 0) { ctx.beginPath(); ctx.ellipse(x + 8, y - 12, 10, 12, 0, 0, 7); ctx.fill(); ctx.fillRect(x + 5, y - 32, 6, 12); }
          else ctx.fillRect(x, y - tall * 0.6, 14, tall * 0.6);
        }
      }
      if (a.state === 'closing') for (let x = 60; x < w - 90; x += 330) { ctx.fillStyle = '#e0202c'; ctx.fillRect(x, 20, 96, 44); ctx.fillStyle = '#fff'; ctx.font = 'bold 30px sans-serif'; ctx.fillText('-70%', x + 10, 53); }
      ctx.fillStyle = `rgba(110,104,92,${grime * 0.45})`; ctx.fillRect(0, 0, w, h);
    });
    const caseGlow = (map: THREE.Texture) => { const m = new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: glowOf(mix(0.35, 0.6, mood.cheer)), roughness: 0.2 }); flicker.push(m); return m; };
    const CH = -FLOOR - 0.75;
    s.mesh(new THREE.PlaneGeometry(WD - 0.9, CH), caseGlow(caseMap(WD - 0.9)), [0, -0.3 - CH / 2, DP / 2 - 0.08]);
    s.mesh(new THREE.PlaneGeometry(DP - 0.9, CH), caseGlow(caseMap(DP - 0.9)), [WD / 2 - 0.08, -0.3 - CH / 2, 0]).rotation.y = Math.PI / 2;
    for (const x of [-WD / 2 + 0.3, -WD / 6, WD / 6, WD / 2 - 0.3]) s.box([0.16, CH + 0.1, 0.1], [x, -0.3 - CH / 2, DP / 2 - 0.04], metal);
    s.box([WD - 0.1, 0.3, DP - 0.1], [0, FLOOR + 0.15, 0], a.place === 'hall' ? metal : deep);

    // Shop floor and the wall behind the counter.
    const floorTone = { hall: '#d9cfc0', kiosk: '#c9c6cf', drugstore: '#cfd3cc' }[a.place];
    s.box([WD + 1.6, 0.24, DP + 5.2], [0, FLOOR - 0.12, 0.75], s.material(dark ? shade(floorTone, '#3a3850', 0.35) : floorTone, { roughness: 0.8 }));
    if (a.place !== 'kiosk') for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) s.box([1.9, 0.02, 1.0], [-6.72 + i * 1.92, FLOOR + 0.012, DP / 2 + 0.62 + j * 1.02], s.material(a.place === 'hall' ? '#b9a98f' : '#aab3ae', { roughness: 0.7 }));
    const WZ = -DP / 2 - 1.7, WTOP = 4.9;
    s.box([WD + 1.6, WTOP - FLOOR, 0.3], [0, (WTOP + FLOOR) / 2, WZ - 0.15], wallPaint);
    s.box([WD + 1.6, 0.5, 0.4], [0, FLOOR + 0.25, WZ + 0.05], deep);
    if (a.place === 'hall') {
      for (const x of [-7.0, -3.4, 3.4, 7.0]) s.box([0.5, WTOP - 0.2, 0.2], [x, WTOP / 2 - 0.1, WZ + 0.1], white);
      s.box([WD + 1.6, 0.28, 0.3], [0, WTOP - 0.14, WZ + 0.12], metal);
      s.box([WD + 1.6, 0.16, 0.24], [0, 0.5, WZ + 0.1], metal);
    } else if (a.place === 'kiosk') {
      // Pegboard with earring cards on hooks.
      const peg = canvasOf(512, 256, (ctx, w, h) => { ctx.fillStyle = shade(pal.wall, pal.accent, 0.25); ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'rgba(40,30,50,0.35)'; for (let x = 8; x < w; x += 16) for (let y = 8; y < h; y += 16) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); } });
      peg.wrapS = peg.wrapT = THREE.RepeatWrapping;
      s.mesh(new THREE.PlaneGeometry(5.6, 3.4), new THREE.MeshStandardMaterial({ map: peg, roughness: 0.9 }), [0, 1.9, WZ + 0.02]);
      const cards: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) if (random() < stock * mix(0.6, 1, mood.density)) cards.push({ at: [-2.4 + i * 0.6, 0.6 + j * 0.62, WZ + 0.07], size: 1, color: ['#ffffff', '#1c1a20', shade(pal.accent, '#ffffff', 0.6), '#fff2b8'][Math.floor(random() * 4)] });
      s.scatter(new THREE.BoxGeometry(0.42, 0.5, 0.03), new THREE.MeshStandardMaterial({ roughness: 0.8 }), cards);
      s.scatter(new THREE.SphereGeometry(0.055, 8, 6), s.material(pal.metal, { metalness: 0.9, roughness: 0.2 }), cards.flatMap((card) => [-0.09, 0.09].map((dx) => ({ at: [card.at[0] + dx, card.at[1] - 0.05, WZ + 0.1] as [number, number, number], size: 1 }))));
    } else {
      const tube = s.material('#fbfdff', { emissive: '#eef6ff', emissiveIntensity: glowOf(1.1), roughness: 0.4 });
      flicker.push(tube);
      s.box([0.5, 0.12, 1.3], [-3.5, WTOP - 0.1, WZ + 0.8], white); s.box([0.5, 0.12, 1.3], [3.5, WTOP - 0.1, WZ + 0.8], white);
      s.rod([-3.4, WTOP - 0.25, WZ + 1.3], [3.4, WTOP - 0.25, WZ + 1.3], 0.09, tube);
      for (let i = 0; i < 5; i++) s.box([2.6, 0.06, 0.5], [0, 0.7 + i * 0.6, WZ + 0.3], white);
      const boxes: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 5; i++) for (let x = -1.15; x < 1.2; x += 0.3) if (random() < stock * mix(0.6, 1, mood.density)) boxes.push({ at: [x, 0.93 + i * 0.6, WZ + 0.32], size: 1, color: [pal.accent, '#ffffff', pal.deep, '#ffd23e', '#3ec7ff'][Math.floor(random() * 5)] });
      s.scatter(new THREE.BoxGeometry(0.24, 0.4, 0.2), new THREE.MeshStandardMaterial({ roughness: 0.6 }), boxes);
    }

    // Posters either side.
    const posterMap = (flip: boolean) => canvasOf(360, 500, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, shade(pal.accent, '#ffffff', flip ? 0.55 : 0.2)); g.addColorStop(1, shade(pal.deep, pal.accent, flip ? 0.6 : 0.2));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.translate(w / 2, h * 0.44);
      if (flip) ctx.scale(-1, 1);
      if (a.poster === 'lips') {
        ctx.fillStyle = '#c40f22';
        ctx.beginPath(); ctx.moveTo(-140, 0); ctx.bezierCurveTo(-80, -70, -30, -78, 0, -44); ctx.bezierCurveTo(30, -78, 80, -70, 140, 0); ctx.bezierCurveTo(70, 100, -70, 100, -140, 0); ctx.fill();
        ctx.strokeStyle = '#5a0a14'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-136, 0); ctx.bezierCurveTo(-50, 22, 50, 22, 136, 0); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-36, 44, 36, 10, -0.1, 0, 7); ctx.fill();
      } else if (a.poster === 'eye') {
        ctx.fillStyle = '#fbf8f2'; ctx.beginPath(); ctx.moveTo(-140, 10); ctx.quadraticCurveTo(0, -100, 140, 10); ctx.quadraticCurveTo(0, 90, -140, 10); ctx.fill();
        ctx.fillStyle = pal.deep === '#2b2730' ? '#3a7ac0' : pal.deep; ctx.beginPath(); ctx.arc(0, 0, 50, 0, 7); ctx.fill();
        ctx.fillStyle = '#0c0a0e'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-16, -16, 9, 0, 7); ctx.fill();
        ctx.strokeStyle = '#0c0a0e'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-140, 10); ctx.quadraticCurveTo(0, -100, 140, 10); ctx.lineTo(176, -22); ctx.stroke();
        ctx.lineWidth = 6; for (let i = 0; i < 9; i++) { const t = i / 8, x = -110 + t * 220, y = -42 - Math.sin(t * Math.PI) * 30 + 26 * Math.abs(t - 0.5); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (t - 0.4) * 46, y - 40); ctx.stroke(); }
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 5; for (let i = 0; i < 18; i++) { const t = (i / 18) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(t) * 90, Math.sin(t) * 90 + 10); ctx.lineTo(Math.cos(t) * 230, Math.sin(t) * 230 + 10); ctx.stroke(); }
        ctx.fillStyle = shade(pal.metal, '#fff3c0', 0.4); ctx.beginPath(); ctx.moveTo(-62, -30); ctx.lineTo(62, -30); ctx.lineTo(78, 110); ctx.lineTo(-78, 110); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-46, -14, 18, 110);
        ctx.fillStyle = '#1c181c'; ctx.fillRect(-22, -62, 44, 34); ctx.beginPath(); ctx.arc(0, -84, 30, 0, 7); ctx.fill();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#ffffff'; ctx.font = 'italic bold 46px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText(flip ? 'Nº 7' : { lips: 'Kiss Proof', eye: 'Look Again', bottle: 'Parfum' }[a.poster], w / 2, h - 46);
      ctx.fillStyle = `rgba(222,214,196,${grime * 0.55})`; ctx.fillRect(0, 0, w, h);
      if (a.state === 'closing') { ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-0.3); ctx.fillStyle = '#e0202c'; ctx.fillRect(-190, -34, 380, 68); ctx.fillStyle = '#fff'; ctx.font = 'bold 44px sans-serif'; ctx.fillText('FINAL DAYS', 0, 16); ctx.restore(); }
    });
    for (const side of [-1, 1]) {
      const px = side * 5.25;
      s.box([2.56, 3.5, 0.1], [px, 2.25, WZ + 0.06], metal);
      const poster = s.mesh(new THREE.PlaneGeometry(2.36, 3.3), new THREE.MeshStandardMaterial({ map: posterMap(side > 0), roughness: 0.6 }), [px, 2.25, WZ + 0.13]);
      if (grime > 0.8) poster.rotation.z = (random() - 0.5) * 0.12;
    }

    // The sign.
    const text = WORDS[a.words];
    const SY = 4.25;
    if (a.sign === 'awning') {
      const stripes = canvasOf(1024, 128, (ctx, w, h) => {
        for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? '#fbf7ee' : pal.accent; ctx.fillRect(i * 64, 0, 64, h); }
        ctx.fillStyle = `rgba(150,140,120,${grime * 0.5})`; ctx.fillRect(0, 0, w, h);
      });
      const canopy = s.mesh(new THREE.PlaneGeometry(10.4, 2.0), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.85, side: THREE.DoubleSide }), [0, SY + 0.35, WZ + 0.9]);
      canopy.rotation.x = -1.05;
      const valance = canvasOf(1024, 96, (ctx, w, h) => {
        ctx.fillStyle = pal.deep; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fbf7ee'; ctx.font = 'italic bold 62px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2 + 2, w - 60);
      });
      s.mesh(new THREE.PlaneGeometry(10.4, 0.8), new THREE.MeshStandardMaterial({ map: valance, roughness: 0.85 }), [0, SY - 0.5, WZ + 1.78]);
      const scallops: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 16; i++) scallops.push({ at: [-4.875 + i * 0.65, SY - 0.9, WZ + 1.78], size: 1, color: i % 2 ? '#fbf7ee' : pal.accent });
      const half = new THREE.CylinderGeometry(0.325, 0.325, 0.04, 16, 1, false, Math.PI / 2, Math.PI);
      half.rotateX(Math.PI / 2);
      s.scatter(half, new THREE.MeshStandardMaterial({ roughness: 0.85 }), scallops);
      for (const x of [-5.1, 5.1]) s.rod([x, SY - 0.3, WZ + 0.1], [x, SY - 0.55, WZ + 1.76], 0.05, metal);
    } else {
      const neon = a.sign === 'neon';
      const glow = canvasOf(1024, 200, (ctx, w, h) => {
        ctx.fillStyle = neon ? '#221c2a' : '#fbf8f0'; ctx.fillRect(0, 0, w, h);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = neon ? 'italic 120px Georgia, serif' : 'bold 112px sans-serif';
        const tint = neon ? shade(pal.accent, '#ffffff', 0.35) : pal.deep;
        if (neon) { ctx.shadowColor = pal.accent; ctx.shadowBlur = 26; ctx.strokeStyle = tint; ctx.lineWidth = 7; ctx.strokeText(text, w / 2, h / 2 - 8, w - 90); ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.strokeText(text, w / 2, h / 2 - 8, w - 90); ctx.strokeStyle = tint; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(150, h - 30); ctx.quadraticCurveTo(w / 2, h - 6, w - 150, h - 34); ctx.stroke(); }
        else { ctx.fillStyle = tint; ctx.fillText(neon ? text : text.toUpperCase(), w / 2, h / 2 + 4, w - 80); }
      });
      const face = new THREE.MeshStandardMaterial({ map: glow, emissive: '#ffffff', emissiveMap: glow, emissiveIntensity: glowOf(neon ? 1.25 : 0.55), roughness: 0.5 });
      flicker.push(face);
      s.box([9.6, 1.9, 0.3], [0, SY, WZ + 0.2], neon ? s.material('#221c2a') : metal);
      s.mesh(new THREE.PlaneGeometry(9.3, 1.7), face, [0, SY, WZ + 0.36]);
    }
    if (a.state === 'closing') {
      const banner = s.label('CLOSING DOWN  ·  ALL STOCK MUST GO', 9.5, 0.62, [0, 3.0, WZ + 0.2], '#ffffff', '#e0202c');
      banner.rotation.z = (random() - 0.5) * 0.05;
    }

    // Mirrors either side of the hero.
    const bulbOn = [0, 1].map(() => s.material('#fff6d8', { emissive: new THREE.Color().setHSL(mix(0.14, 0.09, mood.warmth), 0.9, 0.62), emissiveIntensity: glowOf(1.5), roughness: 0.3 }));
    const bulbDead = s.material('#8d8a84', { roughness: 0.5 });
    const mirrorMap = (cracked: boolean) => canvasOf(256, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, dark ? '#c9c4dc' : '#f4f9fb'); g.addColorStop(0.5, dark ? '#8884a0' : '#bfd0d8'); g.addColorStop(1, dark ? '#a8a4c0' : '#e3edf0');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(40, 230); ctx.lineTo(190, 10); ctx.stroke(); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(90, 250); ctx.lineTo(230, 44); ctx.stroke();
      for (let i = 0; i < 60 * grime; i++) { ctx.fillStyle = `rgba(110,104,90,${0.1 + random() * 0.2})`; ctx.beginPath(); ctx.arc(random() * w, random() * h, 4 + random() * 22, 0, 7); ctx.fill(); }
      if (cracked) { ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 2; const cx = 80 + random() * 100, cy = 80 + random() * 100; for (let i = 0; i < 9; i++) { let x = cx, y = cy; const t = random() * 7; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += Math.cos(t + (random() - 0.5)) * 34; y += Math.sin(t + (random() - 0.5)) * 34; ctx.lineTo(x, y); } ctx.stroke(); } }
    });
    const gilt = s.material('#c9a23e', { metalness: 0.8, roughness: 0.35 });
    const sheetOn = dead ? (random() < 0.5 ? -1 : 1) : 0;
    for (const side of [-1, 1]) {
      const group = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number] = [0, 0, 0]) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh; };
      const frame = a.mirrors === 'gilt' ? gilt : a.mirrors === 'hollywood' ? white : metal;
      add(new THREE.CylinderGeometry(0.55, 0.65, 0.12, 24), frame, [0, 0.06, 0]);
      add(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 10), frame, [0, 0.6, 0]);
      const head = new THREE.Group();
      head.position.set(0, 2.05, 0);
      head.rotation.x = -0.2;
      group.add(head);
      const part = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number] = [0, 0, 0]) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = true; head.add(mesh); return mesh; };
      const glass = new THREE.MeshStandardMaterial({ map: mirrorMap(grime > 0.7 && (side > 0 || grime > 0.9)), roughness: 0.15, metalness: 0.2, emissive: '#ffffff', emissiveIntensity: dark ? 0.12 : 0 });
      if (sheetOn === side) {
        // A dust sheet thrown over this one.
        const sheet = new THREE.Mesh(new THREE.LatheGeometry([[0.02, 1.3], [0.7, 1.15], [1.2, 0.5], [1.3, -0.4], [1.42, -1.9], [1.55, -2.0]].map(([x, y]) => new THREE.Vector2(x, y)), 14), s.material('#e6e1d4', { roughness: 1, flatShading: true }));
        sheet.scale.z = 0.5; sheet.castShadow = true; head.add(sheet);
      } else if (a.mirrors === 'hollywood') {
        part(new THREE.BoxGeometry(2.3, 2.3, 0.16), frame);
        part(new THREE.PlaneGeometry(1.6, 2.0), glass, [0, 0, 0.085]);
        for (const bx of [-0.95, 0.95]) for (let i = 0; i < 5; i++) part(new THREE.SphereGeometry(0.13, 12, 8), random() < grime * 0.6 || dead ? bulbDead : bulbOn[(i + (bx > 0 ? 1 : 0)) % 2], [bx, -0.84 + i * 0.42, 0.12]);
      } else {
        const oval = a.mirrors === 'gilt';
        const ringMesh = part(new THREE.TorusGeometry(1.08, oval ? 0.14 : 0.1, 10, 40), frame);
        const disc = part(new THREE.CircleGeometry(1.06, 40), glass, [0, 0, 0.02]);
        const back = part(new THREE.CylinderGeometry(1.08, 1.08, 0.08, 40), frame, [0, 0, -0.03]);
        back.rotation.x = Math.PI / 2;
        if (oval) {
          for (const mesh of [ringMesh, disc, back]) mesh.scale.x = 0.78;
          part(new THREE.SphereGeometry(0.2, 12, 8), gilt, [0, 1.2, 0]).scale.set(1.6, 1, 0.5);
          for (const bx of [-0.3, 0.3]) part(new THREE.SphereGeometry(0.12, 10, 8), gilt, [bx, 1.12, 0]);
          part(new THREE.SphereGeometry(0.14, 10, 8), gilt, [0, -1.16, 0]);
        } else for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; part(new THREE.SphereGeometry(0.13, 12, 8), random() < grime * 0.6 || dead ? bulbDead : bulbOn[i % 2], [Math.cos(t) * 1.08, Math.sin(t) * 1.08, 0.1]); }
      }
      group.position.set(side * 2.9, 0, -2.2);
      group.scale.setScalar(1.25);
      group.rotation.y = -side * 0.3;
      s.root.add(group);
    }

    // Acrylic risers for the supporting cast.
    const acrylic = new THREE.MeshPhysicalMaterial({ color: shade('#ffffff', pal.accent, 0.3), transparent: true, opacity: 0.32, roughness: 0.08, depthWrite: false });
    const plate = s.material(shade('#ffffff', pal.accent, 0.45), { roughness: 0.25 });
    ([[-4.7, 1.5, 0.5], [4.7, 1.5, 0.5], [-5.2, -2.1, 1.0], [5.2, -2.1, 1.0]] as const).forEach(([x, z, h]) => {
      s.box([2.9, h - 0.07, 2.9], [x, (h - 0.07) / 2, z], acrylic).castShadow = false;
      s.box([3.0, 0.07, 3.0], [x, h - 0.035, z], plate);
      for (const dx of [-1.42, 1.42]) for (const dz of [-1.42, 1.42]) s.box([0.07, h - 0.07, 0.07], [x + dx, (h - 0.07) / 2, z + dz], plate);
    });

    // Testers along the front edge of the glass.
    const gold = s.material('#d9ae52', { metalness: 0.9, roughness: 0.25 });
    const black = s.material('#1d1a20', { roughness: 0.35 });
    const tint = () => SHADES[Math.floor(random() * SHADES.length)];
    const spots: [number, number][] = [[-2.3, 3.0], [2.3, 3.0], [0, 3.15]];
    const priceTag = (x: number, z: number) => { if (a.place !== 'drugstore' && a.state !== 'closing') return; const tag = s.label(a.state === 'closing' ? '50% OFF' : ['$2.99', '2 FOR 5', '$4.49'][Math.floor(random() * 3)], 0.8, 0.34, [x, 0.19, z], a.state === 'closing' ? '#ffffff' : '#1c1a20', a.state === 'closing' ? '#e0202c' : '#ffe14a'); tag.rotation.x = -0.5; };
    spots.slice(0, mood.density > 0.3 ? 3 : 2).forEach(([x, z], index) => {
      priceTag(x + 0.2, z + 0.5);
      if (a.testers === 'lipsticks') {
        for (let step = 0; step < 3; step++) s.box([1.9, 0.16 * (3 - step), 0.3], [x, 0.08 * (3 - step), z - 0.3 + step * 0.3], index === 2 ? black : white);
        const tubes: { at: [number, number, number]; size: number }[] = [], bullets: { at: [number, number, number]; size: number; color: string }[] = [];
        for (let step = 0; step < 3; step++) for (let i = 0; i < 7; i++) if (random() < stock * mix(0.65, 1, mood.density)) { const px = x - 0.78 + i * 0.26, py = 0.16 * (3 - step), pz = z - 0.3 + step * 0.3; tubes.push({ at: [px, py + 0.14, pz], size: 1 }); bullets.push({ at: [px, py + 0.36, pz], size: 1, color: tint() }); }
        if (tubes.length) { s.scatter(new THREE.CylinderGeometry(0.085, 0.085, 0.28, 10), gold, tubes); s.scatter(new THREE.CylinderGeometry(0.045, 0.065, 0.18, 10), new THREE.MeshStandardMaterial({ roughness: 0.4 }), bullets); }
      } else if (a.testers === 'perfume') {
        s.cylinder(0.95, 0.95, 0.06, [x, 0.03, z], metal, 28);
        for (let i = 0; i < amount(5); i++) {
          const t = (i / 5) * Math.PI * 2 + random(), r = i ? 0.55 : 0, bx = x + Math.cos(t) * r, bz = z + Math.sin(t) * r * 0.6, tall = mix(0.35, 0.75, random());
          const liquid = new THREE.MeshPhysicalMaterial({ color: ['#f6d27a', '#f2a0b4', '#bfe6d8', '#d9b8f0', '#ffcf9a'][Math.floor(random() * 5)], roughness: 0.08, transparent: true, opacity: 0.82 });
          const fallen = dead && random() < 0.5;
          const body = random() < 0.5 ? s.box([0.3, tall, 0.2], [bx, 0.06 + tall / 2, bz], liquid) : s.ball([0.2, tall / 2, 0.16], [bx, 0.06 + tall / 2, bz], liquid, 14);
          const cap = s.cylinder(0.07, 0.09, 0.16, [bx, 0.14 + tall, bz], random() < 0.5 ? gold : black, 10);
          if (fallen) { body.rotation.z = Math.PI / 2; body.position.y = 0.2; cap.position.set(bx + tall / 2 + 0.08, 0.2, bz); cap.rotation.z = Math.PI / 2; }
        }
        if (index === 0) { s.ball([0.16, 0.13, 0.16], [x + 0.85, 0.2, z + 0.3], deep, 12); s.rod([x + 0.7, 0.2, z + 0.3], [x + 0.35, 0.45, z + 0.2], 0.025, deep); }
      } else if (a.testers === 'piercing') {
        if (index === 2) {
          s.box([1.5, 0.08, 0.9], [x, 0.04, z], deep);
          const rings: { at: [number, number, number]; size: number }[] = [];
          for (let i = 0; i < amount(22); i++) rings.push({ at: [x + (random() - 0.5) * 1.2, 0.1, z + (random() - 0.5) * 0.7], size: mix(0.6, 1.3, random()) });
          const hoop = new THREE.TorusGeometry(0.07, 0.016, 6, 14); hoop.rotateX(Math.PI / 2);
          s.scatter(hoop, metal, rings);
        } else if (index === 0) {
          // The piercing gun, lying ready.
          s.box([0.75, 0.24, 0.16], [x, 0.2, z], white); s.box([0.2, 0.5, 0.15], [x - 0.2, 0.03 + 0.2, z], white).rotation.z = 0.3;
          s.cylinder(0.05, 0.05, 0.26, [x + 0.46, 0.22, z], metal, 8).rotation.z = Math.PI / 2;
          s.box([0.1, 0.1, 0.18], [x + 0.05, 0.36, z], accent);
        } else {
          s.cylinder(0.3, 0.36, 0.08, [x, 0.04, z], metal, 16); s.rod([x, 0.08, z], [x, 1.0, z], 0.035, metal);
          const cards: { at: [number, number, number]; size: number; color: string }[] = [];
          for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if (random() < stock) cards.push({ at: [x + Math.cos(i * 1.57 + 0.5) * 0.3, 0.42 + j * 0.42, z + Math.sin(i * 1.57 + 0.5) * 0.3], size: 1, color: ['#ffffff', '#1c1a20', '#fff2b8'][Math.floor(random() * 3)] });
          s.scatter(new THREE.BoxGeometry(0.3, 0.36, 0.3), new THREE.MeshStandardMaterial({ roughness: 0.8 }), cards);
        }
      } else if (a.testers === 'nails') {
        s.box([2.0, 0.1, 0.5], [x, 0.05, z], white);
        const bodies: { at: [number, number, number]; size: number; color: string }[] = [], caps: { at: [number, number, number]; size: number }[] = [];
        for (let i = 0; i < 8; i++) if (random() < stock * mix(0.65, 1, mood.density)) { const px = x - 0.84 + i * 0.24; bodies.push({ at: [px, 0.24, z], size: 1, color: `#${new THREE.Color().setHSL(((i + index * 3) / 12 + random() * 0.03) % 1, 0.75, 0.52).getHexString()}` }); caps.push({ at: [px, 0.46, z], size: 1 }); }
        if (bodies.length) { s.scatter(new THREE.SphereGeometry(0.11, 10, 8).scale(1, 1.3, 1), new THREE.MeshStandardMaterial({ roughness: 0.15 }), bodies); s.scatter(new THREE.CylinderGeometry(0.045, 0.055, 0.26, 8), black, caps); }
      } else {
        for (let i = 0; i < amount(3); i++) {
          const px = x - 0.6 + i * 0.6, pz = z + (random() - 0.5) * 0.3;
          s.cylinder(0.26, 0.26, 0.07, [px, 0.035, pz], index === 1 ? gold : black, 20);
          s.cylinder(0.21, 0.21, 0.02, [px, 0.075, pz], s.material([shade(tint(), '#f3d6c6', 0.6), '#e8b79a', '#f0a8b0'][Math.floor(random() * 3)], { roughness: 1 }), 20);
          const lid = s.cylinder(0.26, 0.26, 0.04, [px, 0.26, pz - 0.26], index === 1 ? gold : black, 20);
          lid.rotation.x = Math.PI / 2 - 0.35;
        }
        if (index === 0) { s.cylinder(0.2, 0.16, 0.5, [x + 1.0, 0.25, z - 0.1], accent, 14); for (let i = 0; i < 4; i++) { s.rod([x + 1.0, 0.4, z - 0.1], [x + 0.9 + i * 0.07, 0.95 + random() * 0.2, z - 0.2 + i * 0.06], 0.022, black); s.ball([0.06, 0.1, 0.06], [x + 0.9 + i * 0.07, 1.05 + random() * 0.1, z - 0.2 + i * 0.06], s.material('#caa27a', { roughness: 1 }), 8); } }
      }
    });
    if (a.state === 'makeover') {
      const tissue = s.material('#fbf9f3', { roughness: 1, flatShading: true });
      for (let i = 0; i < amount(7); i++) { const wad = s.ball([0.2, 0.13, 0.17], [mix(-3.2, 3.2, random()), 0.1, mix(2.5, 3.5, random())], tissue, 6); wad.rotation.set(random() * 3, random() * 3, random() * 3); }
      for (let i = 0; i < 5; i++) s.cylinder(0.14, 0.14, 0.03, [mix(-1.5, 1.5, random()), 0.02 + i * 0.001, mix(2.6, 3.4, random())], s.material(i % 2 ? '#ffffff' : shade('#ffffff', tint(), 0.5), { roughness: 1 }), 12);
      // A hand mirror put down mid-check.
      s.cylinder(0.42, 0.42, 0.05, [-0.9, 0.03, 3.25], metal, 24); s.cylinder(0.36, 0.36, 0.01, [-0.9, 0.06, 3.25], s.material('#e3edf0', { roughness: 0.1 }), 24);
      s.rod([-0.55, 0.03, 3.4], [0.0, 0.03, 3.6], 0.06, metal);
    }
    if (dead) for (let i = 0; i < 3; i++) { const sheet = s.box([0.5, 0.01, 0.7], [mix(-3, 3, random()), 0.01, mix(2.4, 3.4, random())], s.material('#e9e3d0', { roughness: 1 })); sheet.rotation.y = random() * 3; }
    if (dark) { const card = s.label('CLOSED', 1.1, 0.5, [0.9, 0.26, 3.35], '#ffffff', pal.deep); card.rotation.x = -0.35; }

    if (a.stool) {
      const sx = -3.4, sz = DP / 2 + 1.7, seat = FLOOR + 1.35;
      s.cylinder(0.75, 0.85, 0.12, [sx, FLOOR + 0.06, sz], metal, 24);
      s.cylinder(0.1, 0.1, seat - FLOOR - 0.3, [sx, (seat + FLOOR - 0.3) / 2, sz], metal, 12);
      s.ring(0.72, 0.035, [sx, FLOOR + 0.5, sz], metal).rotation.x = Math.PI / 2;
      const velvet = s.material(pal.deep === '#2b2730' ? '#8a1428' : pal.deep, { roughness: 1 });
      s.cylinder(1.05, 1.0, 0.42, [sx, seat - 0.05, sz], velvet, 28);
      s.ball([1.03, 0.2, 1.03], [sx, seat + 0.15, sz], velvet, 24);
      s.ring(1.04, 0.05, [sx, seat - 0.24, sz], metal).rotation.x = Math.PI / 2;
      for (let i = 0; i < 6; i++) s.ball([0.07, 0.04, 0.07], [sx + Math.cos(i * 1.047) * 0.55, seat + 0.3, sz + Math.sin(i * 1.047) * 0.55], metal, 8);
      s.ball([0.07, 0.04, 0.07], [sx, seat + 0.34, sz], metal, 8);
    }

    const pace = mix(0.6, 5, mood.energy), base = bulbOn.map((m) => m.emissiveIntensity), steady = flicker.map((m) => m.emissiveIntensity);
    world.update = (_dt, time) => {
      bulbOn.forEach((m, i) => { m.emissiveIntensity = base[i] * (0.72 + 0.28 * Math.sin(time * pace + i * Math.PI)); });
      if (grime > 0.45) flicker.forEach((m, i) => { m.emissiveIntensity = steady[i] * (Math.sin(time * 23 + i * 5) + Math.sin(time * 7.3 + i) > 1.55 ? 0.35 : 1); });
    };
    return world;
  },
});
