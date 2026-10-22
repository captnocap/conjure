import * as THREE from 'three';
import { choice, clamp01, defineWorld, diorama, mix, noul } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
type P3 = [number, number, number];

const TRADITIONS = {
  american: 'American main street: cream walls over sea-green tile, chrome, a row of bare bulbs over the mirror, red-white-and-blue trim.',
  turkish: 'A Turkish berber: turquoise tiled dado, brass sconces, a copper basin, cologne bottles and a tray of tea glasses.',
  black: 'A Black neighbourhood barbershop: wood panelling, bold event posters, a trophy and a wall TV bracket, a strip light, the community living room.',
  soviet: 'A Soviet-era parikmakherskaya: two-tone pale green paint, white enamel, a single tube lamp and a stern printed price list.',
  tokyo: 'A Showa-era Tokyo barber: honey wood panelling, pastel tile, a lucky cat on the shelf, everything small, spotless and exact.',
  hipster: 'A hipster revival shop: dark green paint over bare brick, reclaimed timber, hanging filament bulbs, brass and a pot plant.',
} as const;
type Tradition = keyof typeof TRADITIONS;
const LOOK: Record<Tradition, { upper: string; lower: string; dado: 'tile' | 'wood' | 'paint' | 'brick'; trim: string; counter: string; top: string; frame: string; sign: string; glass: string; back: string }> = {
  american: { upper: '#ebe3cb', lower: '#7fa79a', dado: 'tile', trim: '#b3262d', counter: '#f0ece0', top: '#d7dbdc', frame: '#d5dadd', sign: 'BARBER SHOP', glass: 'SHAVE & HAIRCUT', back: '#e6e3d6' },
  turkish: { upper: '#efe2c4', lower: '#2f95a3', dado: 'tile', trim: '#b8862f', counter: '#6a4326', top: '#e9e2d2', frame: '#b8862f', sign: 'BERBER SALONU', glass: 'KUAFÖR', back: '#eae0cc' },
  black: { upper: '#dccba4', lower: '#6e4728', dado: 'wood', trim: '#1e1e22', counter: '#2b2b30', top: '#8a8d90', frame: '#1e1e22', sign: 'KINGS BARBER LOUNGE', glass: 'CUTS · FADES', back: '#e4dccb' },
  soviet: { upper: '#e4e6d6', lower: '#8fb09c', dado: 'paint', trim: '#f3f1e8', counter: '#ebe9df', top: '#cfd3cf', frame: '#f3f1e8', sign: 'ПАРИКМАХЕРСКАЯ', glass: 'МУЖСКОЙ ЗАЛ', back: '#dfe3dc' },
  tokyo: { upper: '#efe5cc', lower: '#a47c50', dado: 'wood', trim: '#35588c', counter: '#dccba6', top: '#f2c9c4', frame: '#8a623c', sign: 'BARBER HINODE', glass: 'CUT ¥1800', back: '#e8e4d8' },
  hipster: { upper: '#35544a', lower: '#8a5038', dado: 'brick', trim: '#c9a23a', counter: '#5e4230', top: '#3a2c22', frame: '#2a2622', sign: 'BARBER & SUPPLY CO.', glass: 'EST. 2014', back: '#dfe1d8' },
};

function canvasTexture(width: number, height: number, draw: (ctx: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}
const shadeHex = (hex: string, by: number) => `#${new THREE.Color(hex).offsetHSL(0, 0, by).getHexString()}`;

export default defineWorld({
  questions: {
    tradition: choice('Which barbering tradition is this shop?', TRADITIONS),
    state: choice('What is going on in the shop right now?', {
      busy: 'Busy: coats on every hook, hair all over the floor, radio on, people waiting their turn.',
      between: 'Between customers: swept, a broom leaning by the counter, a hot drink going cold on the shelf.',
      closed: 'Closed for the night: lamps off, the blind half down, everything put away for tomorrow.',
      gone: 'Closed for good: posters taken down leaving pale rectangles, boxes packed, the window papered over, a goodbye soaped on the mirror.',
    }),
    outside: choice('What is outside the window?', {
      main: 'A sunny main street of brick shopfronts and striped awnings.',
      rain: 'A grey wet afternoon, rain streaking the glass, blurred umbrellas.',
      night: 'Night: dark facades, lit upstairs windows, one red neon across the road.',
      snow: 'Snow on the roofs and falling past the glass, the street muffled.',
      chains: 'The block has changed: a bright glassy chain salon and a construction hoarding face the shop.',
    }),
    floor: choice('What is the checkerboard lino like?', {
      bw: 'Classic black and white squares.',
      red: 'Oxblood red and cream squares.',
      green: 'Sage green and cream squares.',
      diamond: 'Brown and tan squares laid on the diagonal.',
      blue: 'Powder blue and white, small squares.',
    }),
    posters: choice('What covers the poster wall?', {
      charts: 'Numbered haircut charts: grids of painted heads.',
      bills: 'Boxing, concert and dance bills in block lettering.',
      regulars: 'Framed photographs of regulars, sons and teams the shop sponsored.',
      official: 'Licences, a price list, a calendar and a hand-lettered rules notice.',
    }),
    waiting: choice('What is in the waiting corner under the window?', {
      bench: 'A long vinyl bench with a pile of magazines.',
      chairs: 'A row of mismatched chairs.',
      kids: 'A children’s corner: a toy box, a little stool and comics.',
      tea: 'A low table with a tray of glasses and a kettle, and two stools.',
      radiator: 'Nothing but a radiator and an umbrella stand.',
    }),
    mirror: choice('What is tucked into or marked on the mirror?', {
      clean: 'Nothing: polished glass.',
      photos: 'Snapshots and postcards tucked all along the frame.',
      licence: 'A framed licence and the first dollar the shop ever earned, taped up.',
      crack: 'A crack running from one corner, never fixed.',
    }),
    pole: noul('Is there a striped barber pole mounted on the wall inside?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const L = LOOK[a.tradition];
    const W = 9, D = 7, WALL = 3.3;
    const open = a.state === 'busy' || a.state === 'between';
    const gone = a.state === 'gone';
    const night = a.outside === 'night';
    const lamps = open ? 1 : 0.06;
    const dusk = night || a.state === 'closed';
    const background = new THREE.Color(dusk ? '#c3c6cc' : L.back).lerp(new THREE.Color('#e8d9bd'), mood.warmth * 0.25);
    const { art: s, world } = diorama(context, {
      background: `#${background.getHexString()}`, floor: null, width: W, depth: D, maxHeight: 1.95, radius: 0.88, pitch: 30, yaw: 33,
      slots: [[0.3, -1.25], [-2.5, 1.6], [2.8, 0.7], [-2.3, -1.5], [0.5, 2.3], [3.1, -1.4]],
    });
    const { root } = s;
    if (world.keyLight && dusk) { world.keyLight.intensity = 1.5; world.keyLight.color.lerp(new THREE.Color('#9db4e0'), 0.5); }
    root.traverse((node) => { const hemi = node as THREE.HemisphereLight; if (hemi.isHemisphereLight && dusk) hemi.intensity = 1.1; });

    const wear = mood.wear, clutter = mood.density;
    const HERO: [number, number] = [0.3, -1.25];

    // --- Floor: one slab with the lino painted on, including the ring the barber has worn round the chair.
    const pair: Record<typeof a.floor, [string, string]> = { bw: ['#23232a', '#eeeadb'], red: ['#7d2a28', '#eadfc2'], green: ['#7f9a80', '#ece4cb'], diamond: ['#6a4a30', '#cfb588'], blue: ['#8fb4d0', '#f1efe6'] };
    const lino = canvasTexture(1152, 896, (ctx, w, h) => {
      const [dark, light] = pair[a.floor];
      const tile = a.floor === 'blue' ? 40 : a.floor === 'diamond' ? 64 : 58;
      ctx.fillStyle = light; ctx.fillRect(0, 0, w, h);
      ctx.save();
      if (a.floor === 'diamond') { ctx.translate(w / 2, h / 2); ctx.rotate(Math.PI / 4); ctx.translate(-w, -w); }
      const span = a.floor === 'diamond' ? Math.ceil(w * 2 / tile) : Math.ceil(w / tile) + 1;
      for (let i = 0; i < span; i++) for (let j = 0; j < span; j++) {
        const jitter = (random() - 0.5) * 0.05;
        ctx.fillStyle = (i + j) % 2 ? shadeHex(light, jitter) : shadeHex(dark, jitter);
        ctx.fillRect(i * tile, j * tile, tile - 1, tile - 1);
        if (wear > 0.55 && random() < (wear - 0.55) * 0.12) { ctx.fillStyle = '#6f685c'; ctx.fillRect(i * tile, j * tile, tile - 1, tile - 1); }
      }
      ctx.restore();
      const px = (x: number) => (x + W / 2) / W * w, pz = (z: number) => (z + D / 2) / D * h;
      // Worn ring round the chair, and the path from the door side.
      ctx.strokeStyle = `rgba(214, 205, 186, ${mix(0.08, 0.4, wear)})`; ctx.lineWidth = 40; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(px(HERO[0]), pz(HERO[1]), 138, 130, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(214, 205, 186, ${mix(0.04, 0.26, wear)})`; ctx.lineWidth = 60; ctx.beginPath(); ctx.moveTo(px(HERO[0] + 1), pz(HERO[1] + 0.9)); ctx.quadraticCurveTo(px(1.5), pz(2.4), px(4.4), pz(3.0)); ctx.stroke();
      for (let i = 0; i < Math.round(wear * 90); i++) { ctx.fillStyle = `rgba(60,52,40,${random() * 0.16})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, mix(4, 26, random()), mix(2, 8, random()), random() * 3, 0, 7); ctx.fill(); }
      const shade = ctx.createLinearGradient(0, 0, 0, h * 0.2); shade.addColorStop(0, 'rgba(30,25,20,0.3)'); shade.addColorStop(1, 'rgba(30,25,20,0)');
      ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h * 0.2);
    });
    const edge = new THREE.MeshStandardMaterial({ color: '#a79d8a', roughness: 0.9 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.24, D), [edge, edge, new THREE.MeshStandardMaterial({ map: lino, roughness: mix(0.35, 0.8, wear) }), edge, edge, edge]);
    floor.position.y = -0.12; floor.receiveShadow = true;
    root.add(floor);
    world.ground = floor;

    // --- Walls.
    const upper = s.material(L.upper, { roughness: 0.9 });
    const trim = s.material(L.trim, { roughness: 0.5 });
    const steel = s.material('#d5dadd', { metalness: 0.8, roughness: 0.25 });
    const brass = s.material('#c39a3e', { metalness: 0.75, roughness: 0.3 });
    const darkMat = s.material('#1f1f23', { roughness: 0.6 });
    const white = s.material('#f3f1ea', { roughness: 0.35 });
    const dadoMap = (repeatX: number) => {
      const map = canvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = L.lower; ctx.fillRect(0, 0, w, h);
        if (L.dado === 'tile') { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = shadeHex(L.lower, (random() - 0.5) * 0.07); ctx.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); } if (a.tradition === 'turkish') { ctx.fillStyle = '#f1e8cf'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.save(); ctx.translate(i * 64 + 32, j * 64 + 32); ctx.rotate(Math.PI / 4); ctx.fillRect(-9, -9, 18, 18); ctx.restore(); } } }
        else if (L.dado === 'wood') { for (let i = 0; i < 8; i++) { ctx.fillStyle = shadeHex(L.lower, (random() - 0.5) * 0.08); ctx.fillRect(i * 32 + 1, 0, 30, h); } }
        else if (L.dado === 'brick') { ctx.fillStyle = '#c9bca8'; ctx.fillRect(0, 0, w, h); for (let j = 0; j < 8; j++) for (let i = -1; i < 4; i++) { ctx.fillStyle = shadeHex(L.lower, (random() - 0.5) * 0.12); ctx.fillRect(i * 64 + (j % 2) * 32 + 2, j * 32 + 2, 60, 28); } }
        else { ctx.fillStyle = shadeHex(L.lower, -0.18); ctx.fillRect(0, 0, w, 10); }
        ctx.fillStyle = `rgba(70,60,45,${wear * 0.25})`; ctx.fillRect(0, h * 0.7, w, h * 0.3);
      });
      map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(repeatX, L.dado === 'brick' ? 3 : 2);
      return new THREE.MeshStandardMaterial({ map, roughness: L.dado === 'tile' ? 0.3 : 0.8 });
    };
    const dadoH = L.dado === 'brick' ? WALL : L.dado === 'paint' ? 1.5 : 1.15;
    s.box([W + 0.2, WALL, 0.2], [-0.1, WALL / 2, -D / 2 - 0.1], upper);
    s.box([W, dadoH, 0.03], [0, dadoH / 2, -D / 2 + 0.015], dadoMap(L.dado === 'brick' ? 7 : 9));
    if (L.dado !== 'brick') s.box([W, 0.06, 0.05], [0, dadoH + 0.03, -D / 2 + 0.025], L.dado === 'paint' ? s.material(shadeHex(L.lower, -0.2)) : trim);
    // Left wall with the window opening.
    const WX = -W / 2, Z0 = -0.7, Z1 = 2.9, SILL = 0.95, HEAD = 2.65;
    s.box([0.2, SILL, D], [WX - 0.1, SILL / 2, 0], upper);
    s.box([0.2, WALL - HEAD, D], [WX - 0.1, (WALL + HEAD) / 2, 0], upper);
    s.box([0.2, HEAD - SILL, Z0 + D / 2], [WX - 0.1, (SILL + HEAD) / 2, (Z0 - D / 2) / 2], upper);
    s.box([0.2, HEAD - SILL, D / 2 - Z1], [WX - 0.1, (SILL + HEAD) / 2, (Z1 + D / 2) / 2], upper);
    const leftDado = Math.min(dadoH, SILL);
    s.box([0.03, leftDado, D], [WX + 0.015, leftDado / 2, 0], dadoMap(7));
    if (L.dado === 'brick') { s.box([0.03, HEAD - SILL, Z0 + D / 2], [WX + 0.015, (SILL + HEAD) / 2, (Z0 - D / 2) / 2], dadoMap(3)); }
    s.box([0.34, 0.06, Z1 - Z0 + 0.2], [WX + 0.02, SILL, (Z0 + Z1) / 2], s.material(L.dado === 'wood' || a.tradition === 'hipster' ? '#6a4a30' : '#eeeade', { roughness: 0.5 }));
    const sash = s.material(a.tradition === 'hipster' || a.tradition === 'black' ? '#1f1f23' : a.tradition === 'tokyo' ? '#8a623c' : '#f1eee4', { roughness: 0.5 });
    for (const z of [Z0, (Z0 + Z1) / 2, Z1]) s.box([0.1, HEAD - SILL, 0.07], [WX - 0.08, (SILL + HEAD) / 2, z], sash);
    for (const y of [SILL + 0.04, HEAD - 0.5, HEAD]) s.box([0.1, 0.07, Z1 - Z0], [WX - 0.08, y, (Z0 + Z1) / 2], sash);
    const pane = s.mesh(new THREE.PlaneGeometry(Z1 - Z0, HEAD - SILL), new THREE.MeshStandardMaterial({ color: '#dff0f4', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false }), [WX - 0.08, (SILL + HEAD) / 2, (Z0 + Z1) / 2]);
    pane.rotation.y = Math.PI / 2; pane.castShadow = false;

    // The street, painted on a board outside.
    const street = canvasTexture(640, 384, (ctx, w, h) => {
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      const skies: Record<typeof a.outside, [string, string]> = { main: ['#8fc4ea', '#e6f0e6'], rain: ['#8d99a3', '#b9c1c4'], night: ['#1c2440', '#3a3f62'], snow: ['#c9d2da', '#eef0ef'], chains: ['#a9c9e4', '#e9eeea'] };
      sky.addColorStop(0, skies[a.outside][0]); sky.addColorStop(1, skies[a.outside][1]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      const fronts = a.outside === 'chains' ? ['#dfe6ea', '#dfe6ea', '#c9a05a', '#8d4a3a'] : ['#9a4f3c', '#c9b38a', '#7d6a5a', '#b56a4a', '#8a8f7a'];
      let x = -20;
      fronts.forEach((tint, index) => {
        const bw = mix(120, 190, random()), top = mix(112, 176, random());
        const body = night ? shadeHex(tint, -0.3) : a.outside === 'rain' ? shadeHex(tint, -0.08) : tint;
        ctx.fillStyle = body; ctx.fillRect(x, top, bw, h - top);
        if (a.outside === 'snow') { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 4, top - 8, bw + 8, 14); }
        const chain = a.outside === 'chains' && index < 2;
        for (let wy = top + 18; wy < h * 0.47; wy += 50) for (let wx = x + 16; wx < x + bw - 30; wx += 44) {
          ctx.fillStyle = chain ? '#bfe2f2' : night ? (random() < 0.45 ? '#ffd98a' : '#141a2c') : '#7f98a6';
          ctx.fillRect(wx, wy, chain ? 40 : 26, chain ? 48 : 36);
        }
        // Shopfront, awning and sign.
        ctx.fillStyle = chain ? '#f4fbff' : night ? '#20263a' : '#6c8794'; ctx.fillRect(x + 10, h * 0.6, bw - 20, h * 0.26);
        if (chain) { ctx.fillStyle = '#e8206a'; ctx.fillRect(x, h * 0.47, bw, 34); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(index === 0 ? 'QUIK' : 'CUTS', x + bw / 2, h * 0.47 + 26); }
        else if (a.outside === 'chains' && index === 2) { ctx.fillStyle = '#d9b25a'; ctx.fillRect(x, h * 0.45, bw, h); ctx.fillStyle = '#3a2f20'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('LUXURY FLATS', x + bw / 2, h * 0.62); ctx.fillText('COMING SOON', x + bw / 2, h * 0.7); }
        else { const stripe = ['#b3262d', '#2f6d4a', '#27407e', '#c98a1b'][index % 4]; for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? '#f3efe2' : (night ? shadeHex(stripe, -0.2) : stripe); ctx.beginPath(); ctx.moveTo(x + 6 + k * (bw - 12) / 8, h * 0.5); ctx.lineTo(x + 6 + (k + 1) * (bw - 12) / 8, h * 0.5); ctx.lineTo(x + (k + 1) * bw / 8, h * 0.6); ctx.lineTo(x + k * bw / 8, h * 0.6); ctx.fill(); } }
        if (night && index === 1) { ctx.strokeStyle = '#ff3b4a'; ctx.lineWidth = 6; ctx.shadowColor = '#ff3b4a'; ctx.shadowBlur = 18; ctx.strokeRect(x + 30, h * 0.62, bw - 60, 40); ctx.shadowBlur = 0; ctx.fillStyle = '#ff8a94'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('OPEN', x + bw / 2, h * 0.62 + 30); }
        x += bw + 4;
      });
      ctx.fillStyle = night ? '#1a1d28' : a.outside === 'snow' ? '#e9ecec' : a.outside === 'rain' ? '#5d666c' : '#8a8a84'; ctx.fillRect(0, h * 0.86, w, h * 0.14);
      if (a.outside === 'rain') { ctx.strokeStyle = 'rgba(230,240,245,0.5)'; ctx.lineWidth = 2; for (let i = 0; i < 150; i++) { const rx = random() * w, ry = random() * h; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 5, ry + mix(14, 40, random())); ctx.stroke(); } for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#2a2f3a', '#b3262d', '#2a2f3a'][i]; ctx.beginPath(); ctx.arc(120 + i * 190, h * 0.74, 36, Math.PI, 0); ctx.fill(); ctx.fillRect(118 + i * 190, h * 0.74, 4, 50); } }
      if (a.outside === 'snow') { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 220; i++) { ctx.beginPath(); ctx.arc(random() * w, random() * h, mix(1.5, 4.5, random()), 0, 7); ctx.fill(); } }
      if (night) { const glow = ctx.createRadialGradient(w * 0.78, h * 0.3, 4, w * 0.78, h * 0.3, 110); glow.addColorStop(0, 'rgba(255,225,150,0.95)'); glow.addColorStop(1, 'rgba(255,225,150,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#10131c'; ctx.fillRect(w * 0.78 - 3, h * 0.3, 6, h); }
    });
    const beyond = s.mesh(new THREE.PlaneGeometry(Z1 - Z0 + 1.1, HEAD - SILL + 0.7), new THREE.MeshStandardMaterial({ map: street, emissive: '#ffffff', emissiveMap: street, emissiveIntensity: night ? 0.8 : 0.9, roughness: 1 }), [WX - 0.36, (SILL + HEAD) / 2 + 0.05, (Z0 + Z1) / 2]);
    beyond.rotation.y = Math.PI / 2; beyond.castShadow = false;

    // Window dressing: mirrored gilt lettering, the blind, and whatever state the shop is in.
    const lettering = canvasTexture(768, 256, (ctx, w, h) => {
      ctx.translate(w, 0); ctx.scale(-1, 1);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${L.glass.length > 12 ? 78 : 104}px serif`;
      ctx.lineWidth = 10; ctx.strokeStyle = '#1c1a16'; ctx.strokeText(L.glass, w / 2, h / 2, w - 40);
      ctx.fillStyle = a.tradition === 'black' ? '#f3f1e8' : '#d9b045'; ctx.fillText(L.glass, w / 2, h / 2, w - 40);
      if (wear > 0.5) { ctx.globalCompositeOperation = 'destination-out'; for (let i = 0; i < wear * 220; i++) ctx.fillRect(random() * w, random() * h, mix(3, 14, random()), mix(2, 6, random())); }
    });
    if (!gone) {
      const letters = s.mesh(new THREE.PlaneGeometry(2.7, 0.9), new THREE.MeshStandardMaterial({ map: lettering, transparent: true, alphaTest: 0.4, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide }), [WX - 0.06, 2.0, (Z0 + Z1) / 2]);
      letters.rotation.y = Math.PI / 2; letters.castShadow = false;
    }
    const blindDrop = a.state === 'closed' ? mix(0.75, 1.1, random()) : gone ? 0.25 : mix(0.12, 0.3, random());
    const blindMat = s.material(a.tradition === 'soviet' ? '#e9e3cf' : a.tradition === 'tokyo' ? '#e6dcc0' : '#cfc7a8', { roughness: 0.9, side: THREE.DoubleSide });
    s.cylinder(0.04, 0.04, Z1 - Z0 - 0.1, [WX + 0.0, HEAD - 0.05, (Z0 + Z1) / 2], blindMat, 10).rotation.x = Math.PI / 2;
    s.box([0.012, blindDrop, Z1 - Z0 - 0.14], [WX - 0.01, HEAD - 0.05 - blindDrop / 2, (Z0 + Z1) / 2], blindMat);
    s.rod([WX + 0.0, HEAD - 0.05 - blindDrop, (Z0 + Z1) / 2], [WX + 0.0, HEAD - 0.25 - blindDrop, (Z0 + Z1) / 2], 0.006, darkMat);
    s.ring(0.03, 0.007, [WX + 0.0, HEAD - 0.28 - blindDrop, (Z0 + Z1) / 2], darkMat);
    if (gone) {
      // Papered over from inside, with the agent's board.
      const news = canvasTexture(256, 256, (ctx, w, h) => { ctx.fillStyle = '#e4dcc4'; ctx.fillRect(0, 0, w, h); for (let c = 0; c < 4; c++) { ctx.fillStyle = '#3a3a3a'; ctx.fillRect(c * 64 + 6, 8, 52, 14); for (let y = 30; y < h; y += 7) { ctx.fillStyle = `rgba(60,60,60,${mix(0.25, 0.6, random())})`; ctx.fillRect(c * 64 + 6, y, mix(30, 52, random()), 3); } } });
      for (let i = 0; i < 4; i++) {
        const sheet = s.mesh(new THREE.PlaneGeometry(0.98, mix(1.1, 1.5, random())), new THREE.MeshStandardMaterial({ map: news, roughness: 0.95, side: THREE.DoubleSide }), [WX - 0.05 + i * 0.002, mix(1.55, 1.75, random()), Z0 + 0.5 + i * 0.86]);
        sheet.rotation.set(0, Math.PI / 2, 0); sheet.rotation.x = (random() - 0.5) * 0.12; sheet.castShadow = false;
      }
      const lease = s.label('FOR LEASE', 1.3, 0.42, [WX + 0.02, 1.75, 1.2], '#ffffff', '#c22a2a');
      lease.rotation.y = Math.PI / 2; lease.rotation.x = -0.06;
    } else if (a.state === 'closed') {
      const card = s.label('OPEN', 0.5, 0.26, [WX + 0.02, 1.38, 0.3], '#b3262d', '#f3efe2');
      card.rotation.y = Math.PI / 2; card.rotation.x = 0.08;
      s.rod([WX + 0.02, 1.5, 0.3], [WX + 0.02, 1.72, 0.3], 0.004, darkMat);
    }
    // Daylight falling in across the floor.
    if (!night && a.state !== 'gone' && blindDrop < 0.7) {
      const shaft = new THREE.Shape([new THREE.Vector2(0, Z0 + 0.1), new THREE.Vector2(0, Z1 - 0.1), new THREE.Vector2(mix(1.6, 3.2, Math.abs(mood.daylight - 0.5) * 2), Z1 - 0.9), new THREE.Vector2(mix(1.6, 3.2, Math.abs(mood.daylight - 0.5) * 2), Z0 - 0.7)]);
      const patch = s.mesh(new THREE.ShapeGeometry(shaft), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff3cf').lerp(new THREE.Color('#ffc98a'), mood.warmth * 0.6), transparent: true, opacity: a.outside === 'main' || a.outside === 'chains' ? 0.3 : 0.14, depthWrite: false }), [WX + 0.04, 0.012, 0]);
      patch.rotation.x = Math.PI / 2; patch.castShadow = patch.receiveShadow = false;
    }

    // --- The station: counter, shelf and the long mirror.
    const MX = 0.3, MW = 3.7, BACK = -D / 2;
    const counter = s.material(L.counter, { roughness: 0.5 });
    s.box([MW, 0.84, 0.5], [MX, 0.42, BACK + 0.27], counter);
    s.box([MW + 0.1, 0.05, 0.6], [MX, 0.865, BACK + 0.3], s.material(L.top, { roughness: 0.25, metalness: a.tradition === 'american' || a.tradition === 'black' ? 0.5 : 0 }));
    for (let i = 0; i < 4; i++) {
      const x = MX - MW / 2 + (i + 0.5) * MW / 4;
      s.box([MW / 4 - 0.08, 0.3, 0.02], [x, 0.62, BACK + 0.525], s.material(shadeHex(L.counter, -0.05), { roughness: 0.5 }));
      s.box([MW / 4 - 0.08, 0.36, 0.02], [x, 0.25, BACK + 0.525], s.material(shadeHex(L.counter, -0.05), { roughness: 0.5 }));
      s.box([0.2, 0.025, 0.03], [x, 0.66, BACK + 0.545], a.tradition === 'turkish' || a.tradition === 'hipster' ? brass : steel);
    }
    if (wear > 0.6) s.box([MW / 4 - 0.08, 0.3, 0.02], [MX + MW / 8, 0.62, BACK + 0.6], counter).rotation.x = 0.1;
    const frameMat = s.material(L.frame, { metalness: a.tradition === 'american' || a.tradition === 'turkish' ? 0.7 : 0.1, roughness: 0.35 });
    const MY = 1.95, MH = 1.5;
    s.box([MW, MH, 0.05], [MX, MY, BACK + 0.04], frameMat);
    if (a.tradition === 'turkish' || a.tradition === 'tokyo') { const arch = s.cylinder(0.7, 0.7, 0.05, [MX, MY + MH / 2, BACK + 0.04], frameMat, 32); arch.rotation.x = Math.PI / 2; arch.scale.set(1, 1, 0.34); }
    const soap = gone ? ['THANK YOU', `${1950 + Math.floor(random() * 25)} – ${2015 + Math.floor(random() * 10)}`] : null;
    const glassMap = canvasTexture(1024, 400, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, dusk ? '#8d9aa8' : '#c5d6dc'); g.addColorStop(0.5, dusk ? '#a4afba' : '#e4eef0'); g.addColorStop(1, dusk ? '#7f8b99' : '#b3c6ce');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // A blurred reflection of the room: the far window, the floor, a shelf line.
      ctx.fillStyle = night ? 'rgba(40,50,90,0.5)' : 'rgba(255,250,225,0.75)'; ctx.fillRect(w * 0.08, h * 0.12, w * 0.26, h * 0.5);
      ctx.strokeStyle = 'rgba(90,100,105,0.5)'; ctx.lineWidth = 5; ctx.strokeRect(w * 0.08, h * 0.12, w * 0.26, h * 0.5); ctx.beginPath(); ctx.moveTo(w * 0.21, h * 0.12); ctx.lineTo(w * 0.21, h * 0.62); ctx.stroke();
      ctx.fillStyle = 'rgba(60,55,50,0.22)'; ctx.fillRect(0, h * 0.78, w, h * 0.22);
      for (let i = 0; i < 18; i++) { ctx.fillStyle = i % 2 ? `${pair[a.floor][0]}55` : `${pair[a.floor][1]}55`; ctx.fillRect(i * w / 18, h * 0.86, w / 18, h * 0.14); }
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; for (const x0 of [0.5, 0.58, 0.9]) { ctx.beginPath(); ctx.moveTo(w * x0, 0); ctx.lineTo(w * (x0 + 0.04), 0); ctx.lineTo(w * (x0 - 0.1), h); ctx.lineTo(w * (x0 - 0.14), h); ctx.fill(); }
      // Desilvering at the edges.
      for (let i = 0; i < wear * 260; i++) { const side = random() < 0.5; const along = random(), deep = random() * random() * 0.12; ctx.fillStyle = `rgba(50,45,38,${mix(0.15, 0.6, random())})`; ctx.beginPath(); ctx.arc(side ? along * w : (random() < 0.5 ? deep * w : w - deep * w), side ? (random() < 0.5 ? deep * h * 2 : h - deep * h * 2) : along * h, mix(1.5, 7, random()), 0, 7); ctx.fill(); }
      if (soap) { ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.textAlign = 'center'; ctx.font = 'italic bold 110px cursive'; ctx.save(); ctx.translate(w * 0.56, h * 0.42); ctx.rotate(-0.05); ctx.fillText(soap[0], 0, 0, w * 0.7); ctx.font = 'italic bold 64px cursive'; ctx.fillText(soap[1], 0, 90); ctx.restore(); }
      if (a.mirror === 'crack') { ctx.strokeStyle = 'rgba(30,35,40,0.85)'; ctx.lineWidth = 3; for (let k = 0; k < 4; k++) { let cx = w, cy = h * 0.02; ctx.beginPath(); ctx.moveTo(cx, cy); for (let i = 0; i < 9; i++) { cx -= mix(20, 60, random()); cy += mix(4, 34, random()) * (k + 1) * 0.5; ctx.lineTo(cx, cy); } ctx.stroke(); } ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(w, 6); ctx.lineTo(w * 0.72, h * 0.5); ctx.stroke(); }
      if (a.mirror === 'photos') for (let i = 0; i < 14 + Math.round(clutter * 8); i++) { const top = random() < 0.35, pw = mix(46, 70, random()), ph = pw * mix(0.7, 1.3, random()); ctx.save(); ctx.translate(top ? random() * w : (random() < 0.5 ? pw * 0.5 : w - pw * 0.5), top ? ph * 0.5 : random() * h); ctx.rotate((random() - 0.5) * 0.5); ctx.fillStyle = '#f4f0e4'; ctx.fillRect(-pw / 2, -ph / 2, pw, ph); ctx.fillStyle = ['#7a94a8', '#b98a5a', '#5a6a4a', '#a85a4a', '#40444a'][i % 5]; ctx.fillRect(-pw / 2 + 4, -ph / 2 + 4, pw - 8, ph - 14); ctx.fillStyle = '#e8c9a8'; ctx.beginPath(); ctx.arc(0, -4, pw * 0.16, 0, 7); ctx.fill(); ctx.restore(); }
      if (a.mirror === 'licence') { ctx.fillStyle = '#2a2622'; ctx.fillRect(w * 0.03, h * 0.08, 150, 190); ctx.fillStyle = '#f1ead2'; ctx.fillRect(w * 0.03 + 10, h * 0.08 + 10, 130, 170); ctx.fillStyle = '#4a4a50'; for (let y = 0; y < 9; y++) ctx.fillRect(w * 0.03 + 24, h * 0.08 + 34 + y * 15, y === 0 ? 100 : mix(50, 100, random()), y === 0 ? 8 : 3); ctx.fillStyle = '#b3262d'; ctx.beginPath(); ctx.arc(w * 0.03 + 108, h * 0.08 + 152, 13, 0, 7); ctx.fill(); ctx.save(); ctx.translate(w * 0.03 + 78, h * 0.08 + 232); ctx.rotate(-0.07); ctx.fillStyle = '#9cb89a'; ctx.fillRect(-62, -27, 124, 54); ctx.strokeStyle = '#3f6b4a'; ctx.lineWidth = 3; ctx.strokeRect(-56, -21, 112, 42); ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(240,235,210,0.9)'; ctx.fillRect(-70, -34, 26, 12); ctx.fillRect(44, 22, 26, 12); ctx.restore(); }
    });
    s.mesh(new THREE.PlaneGeometry(MW - 0.16, MH - 0.16), new THREE.MeshStandardMaterial({ map: glassMap, roughness: 0.12, metalness: 0.25, emissive: '#ffffff', emissiveMap: glassMap, emissiveIntensity: 0.22 }), [MX, MY, BACK + 0.068]).castShadow = false;

    // Lamps over the mirror, one kind per tradition.
    const glow = new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: new THREE.Color('#ffd98a').lerp(new THREE.Color('#fff6e0'), a.tradition === 'soviet' || a.tradition === 'black' ? 0.9 : 0.2), emissiveIntensity: mix(0.05, 1.5, lamps), roughness: 0.4 });
    const bulbs: THREE.Mesh[] = [];
    const LY = MY + MH / 2 + 0.16;
    if (a.tradition === 'american') { s.box([MW, 0.08, 0.08], [MX, LY, BACK + 0.08], steel); for (let i = 0; i < 8; i++) bulbs.push(s.ball([0.07, 0.07, 0.07], [MX - MW / 2 + 0.25 + i * (MW - 0.5) / 7, LY, BACK + 0.17], glow, 12)); }
    else if (a.tradition === 'soviet' || a.tradition === 'black') { s.box([2.6, 0.07, 0.12], [MX, LY + 0.04, BACK + 0.1], a.tradition === 'black' ? darkMat : white); const tube = s.cylinder(0.035, 0.035, 2.4, [MX, LY - 0.02, BACK + 0.13], glow, 10); tube.rotation.z = Math.PI / 2; bulbs.push(tube); }
    else if (a.tradition === 'turkish') for (const side of [-1, 1]) { const x = MX + side * (MW / 2 + 0.22); s.tube([[x, MY, BACK + 0.02], [x, MY + 0.05, BACK + 0.2], [x, MY + 0.22, BACK + 0.24]], 0.018, brass); bulbs.push(s.ball([0.11, 0.13, 0.11], [x, MY + 0.32, BACK + 0.24], glow, 14)); s.cylinder(0.05, 0.08, 0.05, [x, MY + 0.21, BACK + 0.24], brass, 12); }
    else if (a.tradition === 'tokyo') { for (const x of [MX - 1.1, MX + 1.1]) { s.rod([x, LY + 0.3, BACK + 0.02], [x, LY + 0.3, BACK + 0.34], 0.012, darkMat); s.rod([x, LY + 0.3, BACK + 0.34], [x, LY + 0.14, BACK + 0.34], 0.006, darkMat); bulbs.push(s.ball([0.17, 0.13, 0.17], [x, LY + 0.02, BACK + 0.34], glow, 16)); } }
    else { s.rod([MX - MW / 2, WALL - 0.12, BACK + 0.5], [MX + MW / 2, WALL - 0.12, BACK + 0.5], 0.02, brass); for (const x of [MX - MW / 2, MX + MW / 2]) s.rod([x, WALL - 0.12, BACK], [x, WALL - 0.12, BACK + 0.5], 0.02, brass); for (let i = 0; i < 4; i++) { const x = MX - 1.35 + i * 0.9, drop = mix(0.25, 0.6, random()); s.rod([x, WALL - 0.12, BACK + 0.5], [x, WALL - 0.12 - drop, BACK + 0.5], 0.005, darkMat); s.cylinder(0.025, 0.03, 0.06, [x, WALL - 0.15 - drop, BACK + 0.5], brass, 10); bulbs.push(s.ball([0.06, 0.085, 0.06], [x, WALL - 0.26 - drop, BACK + 0.5], glow, 12)); } }
    // The shop sign above it all.
    const sign = s.label(L.sign, 3.3, 0.36, [MX, a.tradition === 'hipster' ? MY + MH / 2 + 0.28 : WALL - 0.26, BACK + 0.012], a.tradition === 'hipster' ? '#d9b045' : a.tradition === 'black' ? '#f3f1e8' : L.trim === '#f3f1e8' ? '#8a2a2a' : L.trim, a.tradition === 'hipster' ? '#1f2a25' : a.tradition === 'black' ? '#1e1e22' : '#f3ecd6');
    sign.castShadow = false;
    if (gone) sign.rotation.z = -0.07;

    // On the shelf: bottles, the blue jar, towels and one thing only this shop would have.
    const TOP = 0.89, shelfZ = BACK + 0.22;
    const bottleTints = a.tradition === 'turkish' ? ['#d9b23a', '#3f8f5a', '#c94a3a', '#e9d27a'] : a.tradition === 'hipster' ? ['#6a4a2a', '#2f3a34', '#8a5a2a', '#c9a23a'] : ['#2f8fdc', '#c9302c', '#e8d9a8', '#3fa66a', '#f1efe6', '#7a4a9a'];
    const bottleGeo = new THREE.LatheGeometry([[0, 0], [0.26, 0], [0.26, 0.6], [0.1, 0.78], [0.1, 0.94], [0.13, 0.94], [0.13, 1], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 10);
    const bottleCount = gone ? 2 : Math.round(mix(6, 20, clutter));
    const bottles = Array.from({ length: bottleCount }, (_unused, index) => {
      const lane = index % 2;
      return { at: [MX - MW / 2 + 0.2 + random() * 1.5 + (index % 3 === 0 ? 2.0 : 0), TOP, shelfZ - 0.1 + lane * 0.14 + (random() - 0.5) * 0.04] as P3, size: mix(0.16, 0.3, random()), color: bottleTints[Math.floor(random() * bottleTints.length)] };
    });
    if (bottles.length) s.scatter(bottleGeo, new THREE.MeshStandardMaterial({ roughness: 0.2 }), bottles);
    if (!gone) {
      // Disinfectant jar with combs.
      const jx = MX + 0.45;
      s.cylinder(0.07, 0.075, 0.03, [jx, TOP + 0.015, shelfZ], steel, 16);
      s.cylinder(0.062, 0.062, 0.2, [jx, TOP + 0.13, shelfZ], new THREE.MeshStandardMaterial({ color: '#1b7fe8', emissive: '#1b7fe8', emissiveIntensity: 0.5, transparent: true, opacity: 0.8, roughness: 0.1 }), 16);
      s.cylinder(0.064, 0.064, 0.07, [jx, TOP + 0.265, shelfZ], new THREE.MeshStandardMaterial({ color: '#e6f3f8', transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }), 16).castShadow = false;
      for (let i = 0; i < 3; i++) s.box([0.03, 0.2, 0.004], [jx - 0.025 + i * 0.025, TOP + 0.22, shelfZ + (i - 1) * 0.02], darkMat).rotation.z = (i - 1) * 0.12;
      // Towel stack.
      const towel = s.material('#f2efe6', { roughness: 1 });
      const stack = 2 + Math.round(clutter * 4);
      for (let i = 0; i < stack; i++) s.box([0.34, 0.045, 0.24], [MX + 1.45 + (random() - 0.5) * 0.02, TOP + 0.024 + i * 0.047, shelfZ + 0.02], towel).rotation.y = (random() - 0.5) * 0.08;
      // Clippers hanging by their cord, and a cape on a hook at the end of the counter.
      s.box([0.05, 0.17, 0.045], [MX - MW / 2 - 0.12, 1.25, BACK + 0.08], a.tradition === 'black' ? brass : darkMat);
      s.tube([[MX - MW / 2 - 0.12, 1.34, BACK + 0.08], [MX - MW / 2 - 0.16, 1.5, BACK + 0.06], [MX - MW / 2 - 0.12, 1.62, BACK + 0.04]], 0.006, darkMat);
      if (a.state !== 'busy') {
        const cape = s.material(a.tradition === 'american' ? '#b3262d' : a.tradition === 'black' ? '#1e1e22' : a.tradition === 'soviet' ? '#e9e6da' : L.trim, { roughness: 0.8, side: THREE.DoubleSide });
        const hang = s.mesh(new THREE.ConeGeometry(0.2, 0.9, 9, 4, true), cape, [MX + MW / 2 + 0.2, 1.3, BACK + 0.13]);
        hang.scale.z = 0.4;
        s.ball([0.03, 0.03, 0.03], [MX + MW / 2 + 0.2, 1.77, BACK + 0.06], steel, 8);
      }
      // The signature object.
      const sx = MX + 0.95, sz = shelfZ + 0.02;
      if (a.tradition === 'american') { s.box([0.3, 0.2, 0.14], [sx, TOP + 0.1, sz], s.material('#7a3a2a', { roughness: 0.5 })); s.box([0.14, 0.12, 0.004], [sx - 0.06, TOP + 0.1, sz + 0.072], s.material('#d9cfae')); s.cylinder(0.03, 0.03, 0.01, [sx + 0.09, TOP + 0.1, sz + 0.072], steel, 12).rotation.x = Math.PI / 2; s.rod([sx + 0.12, TOP + 0.2, sz], [sx + 0.2, TOP + 0.5, sz], 0.004, steel); }
      else if (a.tradition === 'turkish') { s.cylinder(0.17, 0.17, 0.012, [sx, TOP + 0.006, sz], brass, 20); for (let i = 0; i < 3; i++) { const ang = i * 2.1; s.lathe([[0, 0], [0.022, 0], [0.016, 0.03], [0.026, 0.07], [0.024, 0.075]], new THREE.MeshStandardMaterial({ color: '#b5502a', emissive: '#7a2a10', emissiveIntensity: 0.3, roughness: 0.15 }), [sx + Math.cos(ang) * 0.08, TOP + 0.012, sz + Math.sin(ang) * 0.07]); } s.ball([0.03, 0.03, 0.012], [sx + 0.55, 1.5, BACK + 0.09], s.material('#1f5fc0', { roughness: 0.2 }), 12); s.ball([0.014, 0.014, 0.014], [sx + 0.55, 1.5, BACK + 0.1], white, 8); }
      else if (a.tradition === 'black') { s.cylinder(0.06, 0.08, 0.06, [sx, TOP + 0.03, sz], darkMat, 12); s.lathe([[0, 0.06], [0.02, 0.06], [0.015, 0.16], [0.06, 0.22], [0.075, 0.34], [0.065, 0.34], [0, 0.24]], brass, [sx, TOP, sz]); for (const side of [-1, 1]) s.ring(0.035, 0.007, [sx + side * 0.08, TOP + 0.28, sz], brass); s.box([0.5, 0.3, 0.05], [MX + MW / 2 + 0.75, 2.55, BACK + 0.2], darkMat); s.box([0.44, 0.24, 0.01], [MX + MW / 2 + 0.75, 2.55, BACK + 0.23], new THREE.MeshStandardMaterial({ color: '#27407e', emissive: '#3f7fd0', emissiveIntensity: mix(0.02, 0.9, lamps), roughness: 0.3 })); s.rod([MX + MW / 2 + 0.75, 2.55, BACK], [MX + MW / 2 + 0.75, 2.55, BACK + 0.2], 0.02, darkMat); }
      else if (a.tradition === 'soviet') { s.lathe([[0, 0], [0.07, 0], [0.09, 0.03], [0.1, 0.16], [0.06, 0.24], [0.03, 0.26], [0.035, 0.3], [0, 0.31]], steel, [sx, TOP, sz]); s.tube([[sx + 0.09, TOP + 0.08, sz], [sx + 0.15, TOP + 0.1, sz], [sx + 0.16, TOP + 0.05, sz]], 0.008, steel); s.box([0.36, 0.5, 0.012], [MX + MW / 2 + 0.38, 2.0, BACK + 0.01], white); for (let i = 0; i < 7; i++) s.box([0.28, 0.012, 0.004], [MX + MW / 2 + 0.38, 2.18 - i * 0.055, BACK + 0.018], darkMat); }
      else if (a.tradition === 'tokyo') { s.ball([0.07, 0.085, 0.065], [sx, TOP + 0.085, sz], white, 14); s.ball([0.055, 0.05, 0.05], [sx, TOP + 0.19, sz], white, 14); for (const side of [-1, 1]) s.mesh(new THREE.ConeGeometry(0.018, 0.035, 4), white, [sx + side * 0.03, TOP + 0.245, sz]); s.rod([sx + 0.05, TOP + 0.13, sz + 0.02], [sx + 0.075, TOP + 0.24, sz + 0.03], 0.016, white); s.ring(0.045, 0.008, [sx, TOP + 0.15, sz], s.material('#c22a2a')).rotation.x = Math.PI / 2; s.ball([0.012, 0.012, 0.012], [sx, TOP + 0.14, sz + 0.05], brass, 8); }
      else { s.cylinder(0.09, 0.07, 0.15, [sx, TOP + 0.075, sz], s.material('#b86a48', { roughness: 0.9 }), 14); const leaf = s.material('#3f7a4a', { roughness: 0.7, side: THREE.DoubleSide }); for (let i = 0; i < 9; i++) { const ang = i * 0.7 + random(), reach = mix(0.12, 0.26, random()); const blade = s.mesh(new THREE.ConeGeometry(0.035, reach * 2, 4), leaf, [sx + Math.cos(ang) * reach * 0.4, TOP + 0.15 + reach * 0.8, sz + Math.sin(ang) * reach * 0.25]); blade.rotation.set(Math.sin(ang) * 0.5, 0, -Math.cos(ang) * 0.5); blade.scale.z = 0.25; } }
      if (a.state === 'between') {
        // A drink going cold and the broom leaning by.
        s.cylinder(0.04, 0.032, 0.09, [MX - 0.3, TOP + 0.045, shelfZ + 0.1], white, 12);
        s.ring(0.026, 0.007, [MX - 0.255, TOP + 0.05, shelfZ + 0.1], white);
        s.cylinder(0.034, 0.034, 0.004, [MX - 0.3, TOP + 0.088, shelfZ + 0.1], s.material('#5a3520', { roughness: 0.3 }), 12);
        const bx = MX + MW / 2 + 0.55;
        s.rod([bx, 0.1, BACK + 0.75], [bx - 0.08, 1.5, BACK + 0.12], 0.016, s.material('#a8763f'));
        s.box([0.42, 0.1, 0.08], [bx, 0.05, BACK + 0.76], s.material('#2b2520', { roughness: 0.95 }));
      } else if (a.state === 'busy') {
        // Radio on the shelf.
        s.box([0.3, 0.17, 0.1], [MX - 0.5, TOP + 0.085, shelfZ + 0.04], s.material(a.tradition === 'hipster' ? '#6a4a30' : '#c9bfa6', { roughness: 0.5 }));
        s.cylinder(0.05, 0.05, 0.012, [MX - 0.58, TOP + 0.09, shelfZ + 0.095], darkMat, 14).rotation.x = Math.PI / 2;
        s.rod([MX - 0.38, TOP + 0.17, shelfZ + 0.02], [MX - 0.26, TOP + 0.5, shelfZ + 0.02], 0.004, steel);
      }
    } else {
      // Emptied: a taped box on the counter and a dust sheet over one end.
      const card = s.material('#b99a6a', { roughness: 0.9 });
      s.box([0.5, 0.34, 0.36], [MX + 1.2, TOP + 0.17, shelfZ + 0.04], card).rotation.y = 0.12;
      s.box([0.52, 0.006, 0.07], [MX + 1.2, TOP + 0.342, shelfZ + 0.04], s.material('#d9c9a0')).rotation.y = 0.12;
      const sheet = s.box([1.2, 0.02, 0.7], [MX - 1.3, TOP + 0.02, BACK + 0.32], s.material('#e9e6da', { roughness: 1 }));
      sheet.castShadow = true;
      s.box([1.2, 0.6, 0.02], [MX - 1.3, TOP - 0.28, BACK + 0.67], s.material('#e9e6da', { roughness: 1 })).rotation.x = 0.06;
    }

    // --- The sink, to the right of the mirror.
    const SX = 3.55, basin = s.material(a.tradition === 'turkish' ? '#b5693a' : a.tradition === 'tokyo' ? '#f0c4c0' : a.tradition === 'hipster' ? '#e9e6dc' : '#f4f3ee', { roughness: 0.2, metalness: a.tradition === 'turkish' ? 0.7 : 0 });
    s.lathe([[0, 0], [0.16, 0], [0.13, 0.04], [0.09, 0.5], [0.12, 0.7], [0, 0.7]], basin, [SX, 0, BACK + 0.36]);
    const bowl = s.lathe([[0.1, 0.7], [0.3, 0.76], [0.36, 0.9], [0.34, 0.92], [0.28, 0.82], [0.05, 0.78]], basin, [SX, 0, BACK + 0.36]);
    (bowl.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    s.box([0.74, 0.06, 0.1], [SX, 0.93, BACK + 0.05], basin);
    const tap = a.tradition === 'turkish' || a.tradition === 'hipster' ? brass : steel;
    s.tube([[SX, 0.95, BACK + 0.08], [SX, 1.14, BACK + 0.1], [SX, 1.16, BACK + 0.26], [SX, 1.08, BACK + 0.3]], 0.016, tap);
    for (const side of [-1, 1]) { s.cylinder(0.02, 0.024, 0.07, [SX + side * 0.14, 0.99, BACK + 0.09], tap, 10); s.box([0.08, 0.015, 0.02], [SX + side * 0.14, 1.03, BACK + 0.09], tap); }
    const splash = dadoMap(2);
    s.box([0.9, 0.7, 0.02], [SX, 1.32, BACK + 0.012], L.dado === 'tile' ? splash : white);
    s.ring(0.09, 0.008, [SX + 0.62, 1.2, BACK + 0.05], tap);
    if (!gone) { s.box([0.03, 0.45, 0.2], [SX + 0.62, 0.92, BACK + 0.06], s.material('#f2efe6', { roughness: 1 })); s.box([0.12, 0.05, 0.08], [SX - 0.22, 0.975, BACK + 0.2], s.material(a.tradition === 'turkish' ? '#e9e2c4' : '#f0d9a0', { roughness: 0.6 })); }
    // Wall clock above the sink, set from the light.
    const CY = 2.5;
    s.cylinder(0.22, 0.22, 0.05, [SX, CY, BACK + 0.03], a.tradition === 'soviet' ? white : a.tradition === 'hipster' || a.tradition === 'turkish' ? brass : darkMat, 28).rotation.x = Math.PI / 2;
    s.cylinder(0.19, 0.19, 0.052, [SX, CY, BACK + 0.032], s.material('#f6f2e6', { roughness: 0.5 }), 28).rotation.x = Math.PI / 2;
    const hours = gone ? 4.33 : 7 + mood.daylight * 12 + (night ? 3 : 0);
    const hand = (turns: number, length: number, width: number) => { const ang = -turns * Math.PI * 2; const h = s.box([width, length, 0.008], [SX - Math.sin(ang) * length / 2, CY + Math.cos(ang) * length / 2, BACK + 0.064], darkMat); h.rotation.z = ang; h.castShadow = false; return h; };
    hand(hours / 12, 0.1, 0.018);
    const minute = hand(hours % 1, 0.16, 0.012);
    for (let i = 0; i < 12; i++) s.box([0.012, 0.03, 0.004], [SX + Math.sin(i * Math.PI / 6) * 0.165, CY + Math.cos(i * Math.PI / 6) * 0.165, BACK + 0.06], darkMat).rotation.z = -i * Math.PI / 6;

    // --- The poster wall, left of the mirror.
    const posterTexture = (kind: string, index: number) => canvasTexture(192, 256, (ctx, w, h) => {
      const papers = ['#efe4c4', '#e9dcc0', '#f2ead6', '#e4d6b0'];
      const inks = a.tradition === 'black' ? ['#1d1b26', '#d4368a', '#e8a21c', '#2463c9'] : a.tradition === 'soviet' ? ['#8a2a2a', '#2a3a4a', '#4a5a4a'] : ['#2a2f52', '#b8322c', '#4a2c14', '#2f5a48'];
      const ink = inks[index % inks.length];
      ctx.fillStyle = papers[index % papers.length]; ctx.fillRect(0, 0, w, h);
      if (kind === 'charts') {
        ctx.fillStyle = ink; ctx.fillRect(10, 10, w - 20, 26);
        const skins = ['#f1cfae', '#d9a877', '#a8713f', '#7a4a28'];
        const hairs = ['#2a2018', '#6a4326', '#c9a45a', '#8a8a86', '#9a3a1c'];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
          const cx = 36 + c * 60, cy = 74 + r * 50, style = Math.floor(random() * 5), hair = hairs[Math.floor(random() * hairs.length)];
          ctx.fillStyle = a.tradition === 'black' ? skins[2 + (c + r) % 2] : a.tradition === 'tokyo' ? skins[1] : skins[(c + r + index) % 3];
          ctx.beginPath(); ctx.ellipse(cx, cy, 12, 15, 0, 0, 7); ctx.fill(); ctx.fillRect(cx - 5, cy + 12, 10, 8);
          ctx.fillStyle = hair; ctx.beginPath();
          if (style === 0) ctx.rect(cx - 13, cy - 22, 26, 12); else if (style === 1) ctx.ellipse(cx, cy - 12, 17, 13, 0, Math.PI, 0); else if (style === 2) ctx.rect(cx - 12, cy - 32, 24, 22); else if (style === 3) { ctx.moveTo(cx - 4, cy - 34); ctx.lineTo(cx + 4, cy - 34); ctx.lineTo(cx + 5, cy - 10); ctx.lineTo(cx - 5, cy - 10); } else ctx.ellipse(cx + 2, cy - 15, 15, 9, -0.3, 0, 7);
          ctx.fill();
          ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(cx - 20, cy - 14, 5, 0, 7); ctx.fill();
        }
      } else if (kind === 'bills') {
        ctx.fillStyle = ink; ctx.fillRect(0, 0, w, 54); ctx.fillRect(0, h - 40, w, 40);
        ctx.fillStyle = inks[(index + 1) % inks.length]; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center';
        const words = [['FIGHT', 'NIGHT'], ['LIVE!', 'SAT.'], ['DANCE', '8 PM'], ['BIG', 'SHOW'], ['VS.', 'TITLE']][index % 5];
        ctx.fillText(words[0], w / 2, 106, w - 20); ctx.font = 'bold 58px sans-serif'; ctx.fillText(words[1], w / 2, 170, w - 20);
        ctx.fillStyle = ink; for (let y = 186; y < h - 50; y += 10) ctx.fillRect(24, y, w - 48, 4);
        ctx.fillStyle = '#f3ecd6'; ctx.font = 'bold 26px sans-serif'; ctx.fillText('★ ★ ★', w / 2, 38);
      } else if (kind === 'regulars') {
        ctx.fillStyle = '#2a2622'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#e9e6dc'; ctx.fillRect(14, 14, w - 28, h - 28);
        ctx.fillStyle = ['#8a8f96', '#a89a7a', '#7a8a9a'][index % 3]; ctx.fillRect(24, 24, w - 48, h - 66);
        const people = index % 2 ? 5 : 1;
        for (let i = 0; i < people; i++) { const cx = people === 1 ? w / 2 : 44 + i * 26, cy = people === 1 ? 110 : 120 + (i % 2) * 22, r = people === 1 ? 34 : 12; ctx.fillStyle = ['#d9c2a6', '#a88a68', '#e6d6c0'][i % 3]; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.fillStyle = '#3a3a40'; ctx.beginPath(); ctx.ellipse(cx, cy + r * 2.4, r * 1.5, r * 1.6, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.5, r, r * 0.7, 0, Math.PI, 0); ctx.fill(); }
        ctx.fillStyle = '#4a4a50'; ctx.fillRect(50, h - 34, w - 100, 4);
      } else {
        ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.strokeRect(10, 10, w - 20, h - 20);
        ctx.fillStyle = ink; ctx.font = 'bold 24px serif'; ctx.textAlign = 'center';
        ctx.fillText(a.tradition === 'soviet' ? 'ПРЕЙСКУРАНТ' : ['PRICES', 'LICENCE', 'RULES', 'NOTICE'][index % 4], w / 2, 46, w - 40);
        if (index % 4 === 1) { ctx.beginPath(); ctx.arc(w / 2, 190, 26, 0, 7); ctx.fillStyle = '#b3262d'; ctx.fill(); }
        ctx.fillStyle = '#3a3a40'; for (let y = 70; y < (index % 4 === 1 ? 150 : h - 30); y += 18) { ctx.fillRect(26, y, mix(60, 100, random()), 5); if (index % 4 !== 1) ctx.fillRect(w - 58, y, 32, 5); }
        if (index % 4 === 2) { ctx.fillStyle = '#b3262d'; ctx.font = 'bold 15px sans-serif'; ctx.fillText('NO CREDIT', w / 2, h - 22); }
      }
      // Sun-bleaching and age.
      const fade = clamp01(0.25 + wear * 0.6);
      ctx.fillStyle = `rgba(226, 228, 214, ${fade * 0.5})`; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = `rgba(150, 120, 70, ${wear * 0.18})`; ctx.fillRect(0, 0, w, h);
    });
    const PX0 = -W / 2 + 0.3, PX1 = MX - MW / 2 - 0.45, cols = 3, rows = 2;
    const pw = (PX1 - PX0) / cols;
    let hung = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = PX0 + (c + 0.5) * pw + (random() - 0.5) * 0.06, y = 1.72 + r * 0.9 + (random() - 0.5) * 0.08 + (L.dado === 'paint' ? 0.12 : 0);
      const wide = pw * mix(0.72, 0.84, random()), tall = wide * mix(1.2, 1.36, random());
      const missing = gone ? random() < 0.72 : random() < mix(0.3, 0, clutter) * 0.5;
      if (missing) {
        // The cleaner patch a poster leaves behind.
        if (gone || wear > 0.4) s.box([wide, Math.min(tall, 0.82), 0.004], [x, y, BACK + 0.003], s.material(shadeHex(L.dado === 'brick' ? '#9a6048' : L.upper, 0.06), { roughness: 0.9 })).castShadow = false;
        continue;
      }
      const kind = random() < 0.75 ? a.posters : (['charts', 'bills', 'regulars', 'official'] as const)[Math.floor(random() * 4)];
      const framed = kind === 'regulars' || random() < 0.5;
      const h2 = Math.min(tall, 0.82);
      if (framed) s.box([wide + 0.06, h2 + 0.06, 0.03], [x, y, BACK + 0.016], kind === 'regulars' ? darkMat : s.material(a.tradition === 'turkish' ? '#b8862f' : '#3a2a20', { roughness: 0.5 }));
      const sheet = s.mesh(new THREE.PlaneGeometry(wide, h2), new THREE.MeshStandardMaterial({ map: posterTexture(kind, hung + r * 3 + c), roughness: 0.85 }), [x, y, BACK + (framed ? 0.033 : 0.006)]);
      sheet.rotation.z = (random() - 0.5) * (gone ? 0.3 : 0.05 + wear * 0.06);
      sheet.castShadow = false;
      hung++;
    }

    // --- Barber pole, spinning while the shop is open.
    let stripes: THREE.Mesh | null = null;
    if (a.pole) {
      const px = WX + 0.2, pz = -2.1, py = 1.95;
      const wrap = canvasTexture(64, 256, (ctx, w, h) => { ctx.fillStyle = '#f6f3ea'; ctx.fillRect(0, 0, w, h); for (let i = -2; i < 8; i++) { ctx.fillStyle = i % 2 ? '#c22a2a' : (a.tradition === 'american' || a.tradition === 'hipster' ? '#27407e' : '#c22a2a'); ctx.beginPath(); ctx.moveTo(0, i * 48); ctx.lineTo(w, i * 48 + 64); ctx.lineTo(w, i * 48 + 84); ctx.lineTo(0, i * 48 + 20); ctx.fill(); } });
      wrap.wrapS = wrap.wrapT = THREE.RepeatWrapping;
      stripes = s.cylinder(0.09, 0.09, 0.62, [px, py, pz], new THREE.MeshStandardMaterial({ map: wrap, emissive: '#ffffff', emissiveMap: wrap, emissiveIntensity: mix(0.02, 0.5, lamps), roughness: 0.3 }), 20);
      for (const side of [-1, 1]) { s.cylinder(0.1, 0.1, 0.07, [px, py + side * 0.34, pz], steel, 20); s.ball([0.09, 0.07, 0.09], [px, py + side * 0.4, pz], steel, 14); }
      s.box([0.2, 0.05, 0.08], [px - 0.1, py + 0.34, pz], steel); s.box([0.2, 0.05, 0.08], [px - 0.1, py - 0.34, pz], steel);
    }

    // --- Coat hooks on the left wall, between the corner and the window.
    const hookZ = [-3.0, -2.7, -1.5, -1.2];
    s.box([0.03, 0.1, 2.2], [WX + 0.015, 1.85, -2.1], s.material('#6a4a30', { roughness: 0.6 }));
    const coatTints = ['#3b4656', '#6a5132', '#2a2a2e', '#7a2f2a', '#5a6a4a'];
    hookZ.forEach((z, index) => {
      s.rod([WX + 0.03, 1.86, z], [WX + 0.12, 1.9, z], 0.012, steel);
      const wearing = a.state === 'busy' ? random() < 0.85 : a.state === 'between' ? index === 0 && random() < 0.6 : false;
      if (!wearing) return;
      const coat = s.material(coatTints[Math.floor(random() * coatTints.length)], { roughness: 0.95 });
      s.ball([0.1, mix(0.42, 0.56, random()), 0.2], [WX + 0.15, 1.42, z], coat, 12);
      if (random() < 0.5) { s.cylinder(0.12, 0.12, 0.012, [WX + 0.16, 1.98, z], darkMat, 16).rotation.z = 0.5; s.cylinder(0.07, 0.075, 0.08, [WX + 0.185, 2.02, z], darkMat, 14).rotation.z = 0.5; }
    });

    // --- The waiting corner under the window.
    const BX = WX + 0.42, BZ = (Z0 + Z1) / 2;
    const vinyl = s.material(a.tradition === 'american' ? '#b3262d' : a.tradition === 'turkish' ? '#2f6d7a' : a.tradition === 'black' ? '#1e1e22' : a.tradition === 'soviet' ? '#7a5a3a' : a.tradition === 'tokyo' ? '#b8523a' : '#5a3a26', { roughness: 0.45 });
    const mags = () => { const count = Math.round(mix(1, 7, clutter)); for (let i = 0; i < count; i++) { const m = s.box([0.22, 0.012, 0.3], [BX + (random() - 0.5) * 0.1, 0.5 + i * 0.013, BZ + 0.8 + (random() - 0.5) * 0.3], s.material(['#c9302c', '#e8d9a8', '#2f6fb0', '#f1efe6', '#3f8f5a'][i % 5], { roughness: 0.4 })); m.rotation.y = random() * 3; } };
    const chair = (z: number, tint: THREE.Material, turn = 0) => {
      const g = new THREE.Group(); g.position.set(BX + 0.02, 0, z); g.rotation.y = Math.PI / 2 + turn; root.add(g);
      const part = (size: P3, at: P3, material: THREE.Material) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
      part([0.46, 0.06, 0.44], [0, 0.46, 0], tint); part([0.46, 0.42, 0.05], [0, 0.78, -0.21], tint);
      for (const lx of [-0.2, 0.2]) for (const lz of [-0.19, 0.19]) part([0.035, lz < 0 ? 0.98 : 0.45, 0.035], [lx, lz < 0 ? 0.49 : 0.225, lz], steel);
    };
    if (gone) {
      const card = s.material('#b99a6a', { roughness: 0.9 });
      const tape = s.material('#d9c9a0', { roughness: 0.6 });
      const boxes: [number, number, number, number][] = [[0.6, 0.45, 0.2, 0], [0.55, 0.4, 1.0, 0], [0.5, 0.36, 0.55, 0.45], [0.62, 0.5, 2.0, 0]];
      for (const [size, tall, z, y] of boxes) { const turn = (random() - 0.5) * 0.4; s.box([size, tall, size * 0.8], [BX + 0.1, y + tall / 2, BZ - 1.2 + z], card).rotation.y = turn; s.box([size * 1.01, 0.006, 0.07], [BX + 0.1, y + tall + 0.003, BZ - 1.2 + z], tape).rotation.y = turn; }
      s.cylinder(0.05, 0.05, 1.0, [BX + 0.5, 0.05, BZ + 1.3], s.material('#e9e2cc'), 10).rotation.z = Math.PI / 2 - 0.1;
      chair(BZ + 1.75, vinyl, 0.5);
    } else if (a.waiting === 'bench') {
      s.box([0.5, 0.1, 2.9], [BX, 0.44, BZ], vinyl); s.box([0.08, 0.36, 2.9], [BX - 0.2, 0.7, BZ], vinyl);
      for (const z of [-1.3, 0, 1.3]) for (const x of [-0.18, 0.2]) s.box([0.04, 0.4, 0.04], [BX + x, 0.2, BZ + z], steel);
      mags();
      if (a.state === 'busy') { s.box([0.3, 0.02, 0.4], [BX + 0.05, 0.5, BZ - 0.7], s.material('#e9e6dc', { roughness: 0.9 })).rotation.set(0, 0.3, 0.05); s.cylinder(0.14, 0.15, 0.1, [BX, 0.55, BZ - 0.1], s.material('#4a3a2a', { roughness: 0.9 }), 14); s.cylinder(0.2, 0.2, 0.012, [BX, 0.5, BZ - 0.1], s.material('#4a3a2a', { roughness: 0.9 }), 16); }
    } else if (a.waiting === 'chairs') {
      const tints = [vinyl, s.material('#8a6a48', { roughness: 0.6 }), s.material('#7f9a80', { roughness: 0.5 }), s.material('#c9a23a', { roughness: 0.5 })];
      for (let i = 0; i < 4; i++) chair(BZ - 1.2 + i * 0.8, tints[(i + Math.floor(random() * 4)) % 4], (random() - 0.5) * 0.25);
      if (a.state === 'busy') s.ball([0.2, 0.12, 0.22], [BX, 0.56, BZ - 1.2], s.material('#3b4656', { roughness: 0.95 }), 10);
    } else if (a.waiting === 'kids') {
      s.box([0.5, 0.36, 0.7], [BX, 0.18, BZ - 0.9], s.material('#e8a21c', { roughness: 0.5 }));
      const blocks = Array.from({ length: 12 + Math.round(clutter * 14) }, () => ({ at: [BX + (random() - 0.5) * 0.4, 0.4 + random() * 0.08, BZ - 0.9 + (random() - 0.5) * 0.6] as P3, size: mix(0.05, 0.09, random()), color: ['#c9302c', '#2f6fb0', '#f2c81e', '#3f8f5a'][Math.floor(random() * 4)] }));
      s.scatter(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.5 }), blocks);
      s.cylinder(0.17, 0.17, 0.05, [BX + 0.1, 0.3, BZ + 0.2], s.material('#c9302c', { roughness: 0.4 }), 16);
      for (let i = 0; i < 3; i++) s.rod([BX + 0.1 + Math.cos(i * 2.1) * 0.11, 0.28, BZ + 0.2 + Math.sin(i * 2.1) * 0.11], [BX + 0.1 + Math.cos(i * 2.1) * 0.15, 0, BZ + 0.2 + Math.sin(i * 2.1) * 0.15], 0.018, s.material('#a8763f'));
      for (let i = 0; i < 5; i++) s.box([0.2, 0.008, 0.28], [BX + 0.1 + (random() - 0.5) * 0.3, 0.005 + i * 0.009, BZ + 1.1 + (random() - 0.5) * 0.4], s.material(['#f2c81e', '#c9302c', '#2f6fb0'][i % 3], { roughness: 0.5 })).rotation.y = random() * 3;
      // A small rocking horse.
      const horse = s.material('#f1ede2', { roughness: 0.5 });
      s.box([0.2, 0.2, 0.5], [BX + 0.15, 0.42, BZ + 1.9], horse); s.box([0.12, 0.3, 0.14], [BX + 0.15, 0.62, BZ + 2.18], horse).rotation.x = 0.4; s.box([0.1, 0.12, 0.26], [BX + 0.15, 0.76, BZ + 2.32], horse);
      for (const x of [-0.12, 0.12]) { const rocker = s.ring(0.5, 0.02, [BX + 0.15 + x, 0.5, BZ + 1.9], s.material('#c9302c'), Math.PI * 0.5); rocker.rotation.set(0, Math.PI / 2, Math.PI * 1.25); }
      for (const z of [-0.18, 0.18]) for (const x of [-0.08, 0.08]) s.rod([BX + 0.15 + x, 0.34, BZ + 1.9 + z], [BX + 0.15 + x * 1.5, 0.06, BZ + 1.9 + z * 1.4], 0.02, horse);
    } else if (a.waiting === 'tea') {
      s.cylinder(0.36, 0.36, 0.04, [BX + 0.1, 0.48, BZ], s.material('#6a4326', { roughness: 0.5 }), 20);
      s.cylinder(0.04, 0.16, 0.46, [BX + 0.1, 0.23, BZ], s.material('#6a4326', { roughness: 0.5 }), 12);
      s.cylinder(0.24, 0.24, 0.015, [BX + 0.1, 0.51, BZ], brass, 20);
      for (let i = 0; i < 4; i++) s.lathe([[0, 0], [0.024, 0], [0.017, 0.03], [0.027, 0.07]], new THREE.MeshStandardMaterial({ color: '#b5502a', emissive: '#7a2a10', emissiveIntensity: 0.3, roughness: 0.15 }), [BX + 0.1 + Math.cos(i * 1.6) * 0.14, 0.52, BZ + Math.sin(i * 1.6) * 0.14]);
      s.lathe([[0, 0], [0.06, 0], [0.085, 0.07], [0.06, 0.15], [0.03, 0.17], [0, 0.19]], a.tradition === 'soviet' ? steel : brass, [BX + 0.1, 0.52, BZ]);
      for (const z of [-0.85, 0.85]) { s.cylinder(0.19, 0.19, 0.07, [BX + 0.05, 0.43, BZ + z], vinyl, 16); for (let i = 0; i < 3; i++) s.rod([BX + 0.05 + Math.cos(i * 2.1) * 0.13, 0.4, BZ + z + Math.sin(i * 2.1) * 0.13], [BX + 0.05 + Math.cos(i * 2.1) * 0.17, 0, BZ + z + Math.sin(i * 2.1) * 0.17], 0.015, steel); }
    } else {
      const iron = s.material('#e4e1d6', { roughness: 0.5 });
      for (let i = 0; i < 12; i++) s.box([0.12, 0.6, 0.06], [BX - 0.24, 0.42, BZ - 0.55 + i * 0.1], iron);
      s.rod([BX - 0.24, 0.1, BZ - 0.62], [BX - 0.24, 0.1, BZ + 0.62], 0.02, iron);
      s.cylinder(0.14, 0.11, 0.5, [BX - 0.12, 0.25, BZ + 1.5], brass, 14);
      s.rod([BX - 0.12, 0.1, BZ + 1.5], [BX - 0.02, 0.95, BZ + 1.56], 0.012, darkMat);
      s.tube([[BX - 0.02, 0.95, BZ + 1.56], [BX, 1.0, BZ + 1.58], [BX + 0.04, 0.97, BZ + 1.6]], 0.012, s.material('#6a4326'));
    }

    // --- Hair on the floor round the chair, by how busy it is and how recently swept.
    const hairCount = a.state === 'busy' ? Math.round(mix(120, 420, clutter)) : a.state === 'between' ? Math.round(mix(10, 60, clutter)) : gone ? 0 : Math.round(wear * 30);
    if (hairCount) {
      const tufts = Array.from({ length: hairCount }, () => {
        const ang = random() * Math.PI * 2, r = mix(0.5, 1.7, Math.sqrt(random()));
        return { at: [HERO[0] + Math.cos(ang) * r, 0.012, HERO[1] + Math.sin(ang) * r * 0.9 + 0.2] as P3, size: mix(0.02, 0.055, random()), color: new THREE.Color().setHSL(mix(0.05, 0.1, random()), mix(0.1, 0.6, random()), mix(0.05, random() < 0.2 ? 0.7 : 0.3, random())) };
      });
      s.scatter(new THREE.TetrahedronGeometry(1), new THREE.MeshStandardMaterial({ roughness: 0.8 }), tufts);
    }
    if (gone) {
      // Four bolt holes and a clean disc where a chair stood for sixty years.
      const ghost = s.cylinder(0.42, 0.42, 0.004, [2.8, 0.004, 0.7], new THREE.MeshStandardMaterial({ color: shadeHex(pair[a.floor][1], 0.04), roughness: 0.5, transparent: true, opacity: 0.55, depthWrite: false }), 28);
      ghost.castShadow = false;
    }

    const speed = open ? mix(0.4, 2.2, mood.energy) : 0;
    const flicker = open && wear > 0.6;
    world.update = (dt, time) => {
      if (stripes) { stripes.rotation.y += dt * speed; }
      minute.rotation.z -= dt * 0.002;
      if (flicker && bulbs.length) glow.emissiveIntensity = 1.5 * (Math.sin(time * 31) > 0.92 ? 0.35 : 1);
    };
    return world;
  },
});
