import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { drawGlyph } from './glyphs';

const CLOTHS = {
  indigo: 'Deep indigo, the traditional working colour.',
  white: 'Bleached white cotton, clean and plain like a sushi counter.',
  persimmon: 'Rusty persimmon red-brown, warm and old-fashioned.',
  black: 'Black, urbane and a little intimidating.',
  mustard: 'Mustard yellow, cheerful and cheap.',
  moss: 'Moss green, a tea house or a soba shop.',
} as const;
const CLOTH: Record<keyof typeof CLOTHS, [string, string]> = {
  indigo: ['#24386e', '#f1ecdc'], white: ['#efe9da', '#1c2a55'], persimmon: ['#a8492a', '#f3e6cc'],
  black: ['#1f1d20', '#e9e2d0'], mustard: ['#d8a52e', '#3a2412'], moss: ['#5c7040', '#f0ead2'],
};

function canvasTexture(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    divisions: choice('How many hanging panels divide the noren?', { two: 'Two broad panels.', three: 'Three ordinary panels.', four: 'Four narrower panels.', five: 'Five slim panels.' }),
    weave: choice('What kind of cloth is the noren made from?', { cotton: 'Plain fine cotton.', linen: 'Slubby linen with visible cross threads.', canvas: 'Heavy coarse canvas.', silk: 'Smooth subtly shining silk.' }),
    hem: choice('How is the bottom edge finished?', { straight: 'A plain straight hem.', fringe: 'A short fringe of separated threads.', scallop: 'A row of shallow rounded scallops.', band: 'A narrow contrasting hem band.' }),
    lattice: choice('What pattern divides the sliding-door panels?', { vertical: 'Close vertical bars with two cross rails.', square: 'A regular square lattice.', fine: 'A fine close rectangular grid.', diagonal: 'A diagonal diamond lattice.' }),
    stepSurface: choice('What is the entrance step made of?', { stone: 'A plain grey stone slab.', grooves: 'Stone cut with shallow parallel grooves.', tile: 'Small glazed blue and cream tiles.', wood: 'Two broad wooden boards.' }),
    curtainMount: choice('How does the cloth attach to its rod?', { sleeve: 'The rod passes through a sewn sleeve.', loops: 'Separate cloth loops pass over the rod.', ties: 'Short tied fabric straps.', clips: 'Small metal rings and clips.' }),
    cloth: choice('What colour is the noren curtain?', CLOTHS),
    crest: choice('What is dyed on the curtain?', {
      ring: 'A bold circular family crest with a dot in the middle.',
      sake: 'The single large character for sake.',
      ramen: 'Ramen, one angular katakana character on each panel.',
      mountain: 'A mountain character inside a circle, a shop mark.',
      waves: 'Rows of overlapping wave scallops along the hem.',
      stripe: 'One broad horizontal band and nothing else.',
      blank: 'Nothing at all: plain cloth.',
    }),
    length: score('How long is the curtain?', ['A short strip across the lintel', 'Down to the shoulder', 'Down to the waist', 'Almost to the knees']),
    curtain: choice('What is the curtain doing?', {
      still: 'Hanging straight and still.',
      parted: 'Pushed apart in the middle, as if someone just ducked through.',
      windy: 'Lifted and flapping outward in a gust.',
      rolled: 'Rolled up around its rod: the shop is closing or closed.',
    }),
    door: choice('How is the sliding door?', {
      'shut-dark': 'Shut and dark behind the paper.',
      'shut-lit': 'Shut, but the paper panels glow from the room inside.',
      ajar: 'Slid a hand\'s breadth to a body\'s width open, light spilling out.',
      open: 'Slid fully open onto a lit counter.',
    }),
    front: choice('What is the shopfront made of?', {
      cedar: 'Dark charred cedar boards.',
      plaster: 'Pale plaster between timber posts.',
      tin: 'Patched corrugated tin, a post-war shack that never left.',
      tile: 'Glazed tile below, plaster above: a Showa-era diner.',
    }),
    outside: choice('What waits outside by the step?', {
      nothing: 'Nothing.',
      shoes: 'A pair of shoes left neatly on the step.',
      crate: 'A delivery crate of bottles not yet taken in.',
      umbrella: 'A wet umbrella leaning by the frame.',
      salt: 'Two small cones of purifying salt on dishes either side of the door.',
      plants: 'A crowd of potted plants on the pavement.',
    }),
    menu: choice('How is the menu shown?', {
      none: 'It is not: you have to know.',
      board: 'A folding A-frame chalkboard on the pavement.',
      slats: 'A row of hanging wooden slats, one dish on each.',
      lightbox: 'A small glowing box sign standing on the ground.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const OPEN_W = 1.74, OPEN_H = 2.05, WALL_W = 2.9, WALL_H = 2.75;
    const lit = a.door !== 'shut-dark';
    const wood = s.material('#4a3324', { roughness: 0.8 });
    const paleWood = s.material('#b08a5c', { roughness: 0.8 });
    const ground=(node:THREE.Object3D,height=0)=>{node.updateWorldMatrix(true,true);node.position.y+=height-new THREE.Box3().setFromObject(node,true).min.y;};
    const stone = s.material('#9a968c', { roughness: 0.95 });
    const warm = new THREE.Color('#ffd9a0').lerp(new THREE.Color('#ffb060'), mood.warmth * 0.6);
    const glow = mix(0.6, 1.2, mood.cheer);

    // Wall in three pieces around the opening.
    const wallTint = { cedar: '#2e2622', plaster: '#d9d0bb', tin: '#7f8e8c', tile: '#d6cfbd' }[a.front];
    const wallMap = canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = wallTint; g.fillRect(0, 0, w, h);
      if (a.front === 'cedar') for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(${i % 2 ? 255 : 0},${i % 2 ? 240 : 0},${i % 2 ? 220 : 0},${0.03 + random() * 0.06})`; g.fillRect(i * w / 12, 0, w / 12 - 2, h); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(i * w / 12 - 1, 0, 2, h); }
      if (a.front === 'tin') { for (let i = 0; i < 32; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.16)'; g.fillRect(i * 8, 0, 8, h); } for (let i = 0; i < 5; i++) { g.fillStyle = ['rgba(150,80,40,0.55)', 'rgba(90,110,120,0.6)'][i % 2]; g.fillRect(random() * w, random() * h, 30 + random() * 50, 30 + random() * 60); } }
      if (a.front === 'tile') { g.fillStyle = '#5f8a86'; g.fillRect(0, h * 0.62, w, h * 0.38); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; for (let i = 0; i <= 12; i++) { g.beginPath(); g.moveTo(i * w / 12, h * 0.62); g.lineTo(i * w / 12, h); g.stroke(); } for (let j = 0; j < 5; j++) { g.beginPath(); g.moveTo(0, h * 0.62 + j * h * 0.095); g.lineTo(w, h * 0.62 + j * h * 0.095); g.stroke(); } }
      for (let i = 0; i < mood.wear * 16; i++) { g.fillStyle = `rgba(30,28,22,${0.05 + random() * 0.12})`; g.fillRect(random() * w, random() * h, 6 + random() * 14, 40 + random() * 120); }
    });
    const wall = new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.9 });
    const sideW = (WALL_W - OPEN_W) / 2;
    for (const side of [-1, 1]) s.box([sideW, WALL_H, 0.12], [side * (OPEN_W / 2 + sideW / 2), WALL_H / 2, -0.06], wall);
    s.box([OPEN_W, WALL_H - OPEN_H, 0.12], [0, OPEN_H + (WALL_H - OPEN_H) / 2, -0.06], wall);
    // Frame: posts, lintel, threshold.
    for (const side of [-1, 1]) s.box([0.11, OPEN_H + 0.1, 0.16], [side * (OPEN_W / 2 + 0.055), (OPEN_H + 0.1) / 2, -0.03], wood);
    s.box([OPEN_W + 0.36, 0.12, 0.18], [0, OPEN_H + 0.06, -0.02], wood);
    s.box([OPEN_W, 0.05, 0.16], [0, 0.025, -0.03], wood);
    if (a.front === 'plaster') for (const side of [-1, 1]) s.box([0.09, WALL_H, 0.14], [side * (WALL_W / 2 - 0.045), WALL_H / 2, -0.05], wood);

    // Tiled eave over the door.
    const eaveY = OPEN_H + 0.42;
    const eave = s.box([WALL_W + 0.2, 0.06, 0.72], [0, eaveY, 0.26], s.material('#39424b', { roughness: 0.55 }));
    eave.rotation.x = 0.3;
    const tiles = 15;
    for (let i = 0; i < tiles; i++) {
      const tile = s.cylinder(0.04, 0.04, 0.72, [(i - (tiles - 1) / 2) * (WALL_W + 0.1) / tiles, eaveY + 0.04, 0.26], s.material('#2c343c', { roughness: 0.5 }), 8);
      tile.rotation.x = Math.PI / 2 + 0.3;
    }
    for (const side of [-1, 1]) s.rod([side * (WALL_W / 2 - 0.2), eaveY - 0.36, 0.02], [side * (WALL_W / 2 - 0.2), eaveY - 0.12, 0.5], 0.03, wood);

    // Interior seen through the opening, and the two lattice panels.
    const inside = canvasTexture(256, 256, (g, w, h) => {
      const fall = g.createLinearGradient(0, 0, 0, h);
      fall.addColorStop(0, lit ? '#ffe9b8' : '#1c1f26'); fall.addColorStop(1, lit ? '#b9703a' : '#101216');
      g.fillStyle = fall; g.fillRect(0, 0, w, h);
      g.fillStyle = lit ? '#3a2416' : '#0a0b0e';
      g.fillRect(0, h * 0.58, w, h * 0.09);
      for (let i = 0; i < 4; i++) { g.fillRect(24 + i * 60, h * 0.72, 34, 8); g.fillRect(38 + i * 60, h * 0.72, 6, h * 0.28); }
      for (let i = 0; i < 14; i++) { const tall = 18 + random() * 22; g.fillRect(10 + i * 17, h * 0.3 - tall, 8, tall); }
      g.fillRect(0, h * 0.3, w, 5);
    });
    s.mesh(new THREE.PlaneGeometry(OPEN_W, OPEN_H), new THREE.MeshStandardMaterial({ map: inside, emissive: warm, emissiveMap: inside, emissiveIntensity: lit ? glow : 0, roughness: 1 }), [0, OPEN_H / 2, -0.115]);
    const panel = (emit: boolean) => canvasTexture(128, 256, (g, w, h) => {
      g.fillStyle = emit ? '#000' : '#3d2a1e'; g.fillRect(0, 0, w, h);
      g.fillStyle = emit ? (lit ? '#ffffff' : '#000') : lit ? '#f4dcae' : '#7d848c';
      g.fillRect(10, 10, w - 20, h * 0.68);
      g.fillStyle = emit ? '#000' : '#3d2a1e';
      if(a.lattice==='diagonal'){g.save();g.beginPath();g.rect(10,10,w-20,h*.68);g.clip();g.strokeStyle=emit?'#000':'#3d2a1e';g.lineWidth=3;for(let k=-h;k<w+h;k+=24)for(const sign of [-1,1]){g.beginPath();g.moveTo(k,10);g.lineTo(k+sign*h,h*.72);g.stroke();}g.restore();}else{const pitch=a.lattice==='fine'?8:a.lattice==='square'?22:12;for(let x=10;x<w-10;x+=pitch)g.fillRect(x,10,a.lattice==='fine'?2:4,h*.68);if(a.lattice==='vertical')for(const y of [.24,.48])g.fillRect(10,h*y,w-20,5);else for(let y=10;y<h*.72;y+=a.lattice==='fine'?14:22)g.fillRect(10,y,w-20,a.lattice==='fine'?2:4);}
      if (!emit) { g.fillStyle = '#4a3324'; g.fillRect(10, h * 0.72 + 6, w - 20, h * 0.28 - 16); g.fillStyle = 'rgba(0,0,0,0.3)'; for (let x = 10; x < w - 10; x += 22) g.fillRect(x, h * 0.72 + 6, 2, h * 0.28 - 16); }
    });
    const panelW = OPEN_W / 2 + 0.03;
    const slide = { 'shut-dark': 0, 'shut-lit': 0, ajar: mix(0.25, 0.6, random()), open: panelW - 0.08 }[a.door];
    [-1, 1].forEach((side) => {
      const map = panel(false), emissiveMap = panel(true);
      const leaf = s.box([panelW, OPEN_H - 0.05, 0.035], [side * (panelW / 2 - 0.015) + (side < 0 ? slide : 0), 0.05 + (OPEN_H - 0.05) / 2, side < 0 ? -0.075 : -0.035], new THREE.MeshStandardMaterial({ map, emissive: warm, emissiveMap, emissiveIntensity: lit ? glow * 0.8 : 0, roughness: 0.8 }));
      leaf.castShadow = true;
    });

    // The noren: a rod on two hooks and cloth panels that pivot from it.
    const [cloth, ink] = CLOTH[a.cloth];
    const clothTone = `#${new THREE.Color(cloth).lerp(new THREE.Color('#b9ad9a'), mood.wear * 0.45).getHexString()}`;
    const panels={two:2,three:3,four:4,five:5}[a.divisions];
    const length = mix(0.36, 1.3, a.length);
    const clothW = OPEN_W - 0.06, rodY = OPEN_H - 0.02, rodZ = 0.16;
    const curtainMap = canvasTexture(512, Math.max(96, Math.round(512 * length / clothW)), (g, w, h) => {
      g.fillStyle = clothTone; g.fillRect(0, 0, w, h);
      if(a.weave==='linen'||a.weave==='canvas'){const pitch=a.weave==='canvas'?6:3;g.strokeStyle=a.weave==='canvas'?'rgba(0,0,0,.12)':'rgba(255,255,255,.13)';g.lineWidth=1;for(let x=0;x<w;x+=pitch){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}for(let y=0;y<h;y+=pitch){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}}
      for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(255,255,255,${random() * 0.04})`; g.fillRect(0, random() * h, w, 1); }
      const span = Math.min(h * 0.74, w * 0.42), cx = w / 2, cy = h * 0.52;
      g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round';
      if (a.crest === 'ring') { g.lineWidth = span * 0.13; g.beginPath(); g.arc(cx, cy, span * 0.42, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(cx, cy, span * 0.13, 0, Math.PI * 2); g.fill(); }
      if (a.crest === 'sake') drawGlyph(g, '酒', cx - span / 2, cy - span / 2, span, ink, 0.12);
      if (a.crest === 'mountain') { g.lineWidth = span * 0.08; g.beginPath(); g.arc(cx, cy, span * 0.47, 0, Math.PI * 2); g.stroke(); drawGlyph(g, '山', cx - span * 0.3, cy - span * 0.3, span * 0.6, ink, 0.14); }
      if (a.crest === 'ramen') [...'ラーメン'].forEach((char, index) => drawGlyph(g, char, (index + 0.5) * w / 4 - span * 0.26, cy - span * 0.26, span * 0.52, ink, 0.15));
      if (a.crest === 'stripe') g.fillRect(0, h * 0.42, w, h * 0.2);
      if (a.crest === 'waves') { g.lineWidth = 5; for (let row = 0; row < Math.min(3, Math.floor(h / 60)); row++) for (let i = -1; i < 12; i++) for (const ring of [1, 0.62, 0.28]) { g.beginPath(); g.arc(i * 48 + (row % 2) * 24, h - row * 26, 24 * ring, Math.PI, Math.PI * 2); g.stroke(); } }
      if(a.hem==='band'){g.fillStyle=ink;g.fillRect(0,h-12,w,7);}
      if(a.hem==='fringe'){g.globalCompositeOperation='destination-out';for(let x=0;x<w;x+=5)g.fillRect(x,h-12,2,12);g.globalCompositeOperation='source-over';}
      for (let i = 0; i < mood.wear * 10; i++) { g.fillStyle = `rgba(60,50,40,${0.06 + random() * 0.1})`; g.beginPath(); g.ellipse(random() * w, h * 0.6 + random() * h * 0.4, 30, 18, 0, 0, Math.PI * 2); g.fill(); }
    });
    const clothMaterial = new THREE.MeshStandardMaterial({ map:curtainMap,roughness:a.weave==='silk'?.4:.95,alphaTest:.5,side: THREE.DoubleSide });
    const bamboo = s.material('#b9a35a', { roughness: 0.6 });
    const rod = s.cylinder(0.022, 0.022, OPEN_W + 0.3, [0, rodY, rodZ], bamboo, 10);
    rod.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) s.rod([side * (OPEN_W / 2 + 0.06), rodY + 0.02, -0.02], [side * (OPEN_W / 2 + 0.06), rodY - 0.02, rodZ + 0.02], 0.012, s.material('#26272a', { metalness: 0.5 }));
    const flaps: { mesh: THREE.Mesh; rest: number; phase: number }[] = [];
    if (a.curtain === 'rolled') {
      const roll = s.cylinder(0.075, 0.07, clothW * 0.9, [0, rodY, rodZ], new THREE.MeshStandardMaterial({ color: clothTone, roughness: 0.95 }), 14);
      roll.rotation.z = Math.PI / 2;
      for (const x of [-0.5, 0.1, 0.55]) s.ring(0.078, 0.008, [x * clothW * 0.7, rodY, rodZ], s.material('#e9e2d0')).rotation.y = Math.PI / 2;
    } else {
      const w = clothW / panels;
      for (let i = 0; i < panels; i++) {
        const geometry = new THREE.PlaneGeometry(w-.012,length,24,12);
        geometry.translate(0, -length / 2, 0);
        const position = geometry.attributes.position, uv = geometry.attributes.uv;
        const phase = random() * 6;
        for (let v = 0; v < position.count; v++) {
          const depth = -position.getY(v) / length;
          if(a.hem==='scallop')position.setY(v,position.getY(v)+.035*(1+Math.cos(position.getX(v)/w*Math.PI*6))*depth**8);
          position.setZ(v, Math.sin(position.getX(v) * 9 + phase) * 0.035 * depth + (random() - 0.5) * 0.006);
          uv.setX(v, (i + uv.getX(v)) / panels);
          uv.setY(v, 1 - depth);
        }
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, clothMaterial);
        mesh.castShadow = mesh.receiveShadow = true;
        const centre = (i - (panels - 1) / 2);
        mesh.position.set(centre * w, rodY - 0.02, rodZ);
        let rest = 0.03;
        if (a.curtain === 'parted' && Math.abs(centre) < 1) { mesh.rotation.z = (centre <= 0 ? -1 : 1) * mix(0.3, 0.5, random()) * (panels === 3 && centre === 0 ? (random() > 0.5 ? 1 : -1) : 1); rest = 0.25; }
        if (a.curtain === 'windy') { rest = mix(0.45, 1.05, random()); mesh.rotation.z = (random() - 0.5) * 0.3; }
        mesh.rotation.x = -rest;
        s.root.add(mesh);
        flaps.push({ mesh, rest, phase });
        const tieMat=s.material(clothTone,{roughness:.85});if(a.curtainMount==='sleeve')s.box([w*.9,.05,.05],[centre*w,rodY,rodZ],tieMat);
        else for(const side of [-1,1]){const x=centre*w+side*w*.28;if(a.curtainMount==='loops'){const loop=s.ring(.027,.007,[x,rodY,rodZ],tieMat);loop.rotation.y=Math.PI/2;}else if(a.curtainMount==='clips'){const loop=s.ring(.028,.003,[x,rodY+.006,rodZ],s.material('#929999',{metalness:.7}));loop.rotation.y=Math.PI/2;s.box([.018,.028,.009],[x,rodY-.026,rodZ+.006],s.material('#929999',{metalness:.7}));}else{s.tube([[x-.014,rodY-.02,rodZ],[x-.014,rodY+.03,rodZ],[x+.014,rodY+.03,rodZ],[x+.014,rodY-.02,rodZ]],.005,tieMat);s.tube([[x,rodY+.03,rodZ],[x+.025,rodY+.055,rodZ],[x+.04,rodY+.015,rodZ]],.004,tieMat);}}
      }
    }

    // Step and whatever was left by it.
    const stepMat=a.stepSurface==='wood'?s.material('#97744c',{roughness:.85}):stone;s.box([OPEN_W+.3,.14,.55],[0,.07,.3],stepMat);
    if(a.stepSurface==='grooves')for(let k=0;k<8;k++)s.box([OPEN_W+.27,.001,.008],[0,.1405,.065+k*.067],s.material('#65645f'));
    if(a.stepSurface==='tile')for(let i=0;i<12;i++)for(let j=0;j<3;j++)s.box([.164,.009,.172],[-(OPEN_W+.3)/2+.085+i*.17,.1445,.03+.09+j*.18],s.material((i+j)%2?'#c7d0c6':'#406a83',{roughness:.3}));
    if(a.stepSurface==='wood')s.box([OPEN_W+.3,.001,.006],[0,.1405,.3],s.material('#62462f'));
    const stepTop=a.stepSurface==='tile'?.149:.141;
    if (a.outside === 'shoes') {
      const leather = s.material(random() > 0.5 ? '#2a211c' : '#7a4a2c', { roughness: 0.5 });
      const sx = (random() - 0.5) * 0.8;
      for (const side of [-1, 1]) { s.ball([0.05, 0.035, 0.13], [sx + side * 0.07, stepTop + 0.035, 0.36], leather, 12); s.ball([0.045, 0.02, 0.05], [sx + side * 0.07, stepTop + 0.06, 0.31], s.material('#15110f'), 10); }
    } else if (a.outside === 'crate') {
      const plastic = s.material(random() > 0.5 ? '#e0b62c' : '#c8362c', { roughness: 0.6 });
      const cx = OPEN_W / 2 + 0.25, cz = 0.42;
      s.box([0.46, 0.04, 0.34], [cx, 0.02, cz], plastic);
      for (const side of [-1, 1]) { s.box([0.46, 0.3, 0.025], [cx, 0.15, cz + side * 0.16], plastic); s.box([0.025, 0.3, 0.34], [cx + side * 0.22, 0.15, cz], plastic); }
      const bottle = s.material('#5a3a1c', { roughness: 0.3 });
      for (let i = 0; i < 12; i++) if (random() > 0.25) { const bx = cx - 0.16 + (i % 4) * 0.107, bz = cz - 0.1 + Math.floor(i / 4) * 0.1; s.cylinder(0.035, 0.035, 0.22, [bx, 0.15, bz], bottle, 10); s.cylinder(0.013, 0.03, 0.09, [bx, 0.3, bz], bottle, 8); }
    } else if (a.outside === 'umbrella') {
      const ux = -OPEN_W / 2 - 0.22;
      const shade = s.material(['#2b3a67', '#1f1f22', '#a8322c'][Math.floor(random() * 3)], { roughness: 0.6 });
      s.rod([ux - 0.12, 0, 0.4], [ux, 0.86, 0.06], 0.012, s.material('#d9d9d9', { metalness: 0.6 }));
      s.rod([ux - 0.11, 0.08, 0.37], [ux - 0.015, 0.74, 0.11], 0.012, shade, 0.045);
      s.ring(0.035, 0.012, [ux + 0.005, 0.89, 0.04], s.material('#3a2a1c'), Math.PI).rotation.y = 1.2;
      s.cylinder(0.16, 0.2, 0.004, [ux - 0.12, 0.002, 0.42], s.material('#56636e', { roughness: 0.1, metalness: 0.4 }), 18);
    } else if (a.outside === 'salt') {
      for (const side of [-1, 1]) { s.cylinder(0.075, 0.06, 0.015, [side * (OPEN_W / 2 - 0.02), stepTop + 0.008, 0.46], s.material('#2f4f7a', { roughness: 0.3 }), 16); s.cylinder(0.006, 0.055, 0.1, [side * (OPEN_W / 2 - 0.02), stepTop + 0.065, 0.46], s.material('#fbfaf5', { roughness: 0.9 }), 16); }
    }
    const pots = a.outside === 'plants' ? 5 + Math.floor(random() * 3) : Math.floor(mood.density * 2.6);
    for (let i = 0; i < pots; i++) {
      const side = i % 2 ? 1 : -1, px = side * (OPEN_W / 2 + 0.22 + random() * 0.3), pz = 0.2 + random() * 0.5, size = mix(0.09, 0.17, random());
      s.lathe([[0,0],[size*.7,0],[size,size*1.5],[size*.87,size*1.5],[size*.6,size*.15],[0,size*.15]],s.material(['#b5613f','#4f6a8c','#d8d2c2'][Math.floor(random()*3)]),[px,0,pz]);s.cylinder(size*.82,size*.82,.01,[px,size*1.35,pz],s.material('#574733'),14);
      const leaf = s.material(['#4d7a3c', '#6f9a48', '#3f6a4c'][Math.floor(random() * 3)]);
      for(let j=0;j<4;j++){const foliage=s.ball([size * (0.6 + random() * 0.6), size * (0.8 + random()), size * (0.6 + random() * 0.6)], [px + (random() - 0.5) * size, size * 1.6 + random() * size * 1.6, pz + (random() - 0.5) * size],leaf,8);s.rod([px,size*1.35,pz],foliage.position.toArray() as [number,number,number],size*.055,leaf);}
    }

    // Menu.
    const scribble = (g: CanvasRenderingContext2D, w: number, h: number, colour: string, rows: number) => {
      g.strokeStyle = colour; g.lineWidth = 3; g.lineCap = 'round';
      for (let row = 0; row < rows; row++) { const y = h * (0.2 + row * 0.7 / rows); g.beginPath(); let x = w * 0.12; g.moveTo(x, y); while (x < w * (0.5 + random() * 0.3)) { x += 6 + random() * 8; g.lineTo(x, y + (random() - 0.5) * 9); } g.stroke(); g.beginPath(); g.moveTo(w * 0.76, y); g.lineTo(w * 0.9, y); g.stroke(); }
    };
    if (a.menu === 'board') {
      const bx = OPEN_W / 2 + 0.2 + (a.outside === 'crate' ? -OPEN_W - 0.4 : 0), bz = 0.75;
      const chalk = canvasTexture(128, 192, (g, w, h) => { g.fillStyle = '#26302b'; g.fillRect(0, 0, w, h); drawGlyph(g, '生', w * 0.36, 6, 34, '#f0d86a', 0.12); scribble(g, w, h, '#eeeae0', 5); });
      for (const side of [-1, 1]) {
        const board = s.box([0.5, 0.82, 0.025], [bx, 0.4, bz + side * 0.12], side > 0 ? new THREE.MeshStandardMaterial({ map: chalk, roughness: 0.9 }) : paleWood);
        board.rotation.x=side*.28;ground(board);
        s.box([0.54, 0.04, 0.03], [bx, 0.79, bz + side * 0.015], paleWood);
      }
    } else if (a.menu === 'slats') {
      const count = 5 + Math.floor(random() * 3), sx = -OPEN_W / 2 - 0.3;
      s.box([0.5, 0.03, 0.03], [sx, 1.62, 0.02], wood);
      for (let i = 0; i < count; i++) {
        const tag = canvasTexture(32, 128, (g, w, h) => { g.fillStyle = '#d9bf8f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1c1512'; g.lineWidth = 3; g.lineCap = 'round'; for (let k = 0; k < 4; k++) { const y = 14 + k * 26; g.beginPath(); g.moveTo(8 + random() * 6, y); g.lineTo(24 - random() * 4, y + random() * 8); g.moveTo(16, y - 6); g.lineTo(14 + random() * 5, y + 14); g.stroke(); } });
        s.box([0.06, 0.4, 0.012], [sx - 0.21 + i * 0.42 / (count - 1), 1.4 + (random() - 0.5) * 0.015, 0.025], new THREE.MeshStandardMaterial({ map: tag, roughness: 0.85 })).rotation.z = (random() - 0.5) * 0.06 * (1 + mood.wear * 3);
      }
    } else if (a.menu === 'lightbox') {
      const bx = -OPEN_W / 2 - 0.25, bz = 0.6;
      const face = canvasTexture(96, 192, (g, w, h) => { g.fillStyle = '#fff4d8'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8322a'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14); drawGlyph(g, '酒', 14, 30, 68, '#1a1512', 0.12); drawGlyph(g, '生', 22, 108, 54, '#c8322a', 0.13); });
      s.box([0.34, 0.74, 0.2], [bx, 0.47, bz], new THREE.MeshStandardMaterial({ map: face, emissive: '#ffffff', emissiveMap: face, emissiveIntensity: lit ? mix(0.5, 0.95, mood.cheer) : 0, roughness: 0.6 }));
      s.box([0.38, 0.1, 0.24], [bx, 0.05, bz], s.material('#2a2c30'));
      s.box([0.38, 0.03, 0.24], [bx, 0.855, bz], s.material('#2a2c30'));
    }

    const sway = mix(0.01, 0.12, mood.energy) * (a.curtain === 'windy' ? 2.5 : 1), speed = mix(0.6, 2.4, mood.energy);
    return s.finish({
      update: (_dt, time) => { for (const flap of flaps) flap.mesh.rotation.x = -flap.rest - Math.sin(time * speed + flap.phase) * sway; },
    });
  },
});
