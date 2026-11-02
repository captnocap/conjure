import * as THREE from 'three';
import { Sculpture, choice, defineWorld, diorama, mix, score } from '@conjure/kit';

type P = [number, number, number];

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat); }
  return texture;
}

const LAMPS = { black: '#232326', cream: '#e6dcc0', red: '#b8302a', green: '#2f6b4a' } as const;

export default defineWorld({
  questions: {
    benchTop: choice('What surface surrounds the work mat?', {
      timber: 'Long strips of varnished timber.', laminate: 'Pale speckled workshop laminate.',
      steel: 'A brushed steel worktop with folded front edging.', hardboard: 'A dark fibreboard sacrificial top with a timber front strip.',
    }),
    backlog: score('How many radios are waiting on the shelf?', ['The shelf is empty', 'Two waiting sets', 'A full queue of four sets']),
    lampReach: choice('Where is the adjustable lamp aimed?', {
      middle: 'Reached forward over the central work.', near: 'Stretched low toward the front edge.',
      upright: 'Pulled high and close to its clamp.', side: 'Swung toward the right-hand work area.',
    }),
    trace: choice('If the instrument is an oscilloscope, which trace is on its screen?', {
      sine: 'A smooth sine wave.', square: 'A squared pulse train with flat tops.',
      saw: 'A rising sawtooth and abrupt return.', dual: 'Two separated sinusoidal traces.',
    }),
    leads: choice('How are spare test leads kept?', {
      none: 'No dedicated lead storage.', hooks: 'Three coils hanging from separate wall hooks.',
      comb: 'Straight leads draped through a row of comb fingers.', reel: 'A small hand-wound cable reel mounted on the wall.',
    }),
    reference: choice('What reference is open at the right edge?', {
      none: 'Only the closed service manuals.', book: 'An open service book on a sloped stand.',
      card: 'A clipped component-reference card on a small pedestal.', log: 'An open repair ledger with a pencil across it.',
    }),
    instrument: choice('What small wall instrument watches the work?', {
      none: 'No extra wall instrument.', clock: 'A round workshop clock.',
      meter: 'A square mains-voltage meter.', thermometer: 'A tall glass thermometer on a marked backing.',
    }),
    place: choice('Where is the bench?', {
      backshop: 'The back room of a radio repair shop: cream plaster, a painted sign, claim tickets pinned in rows.',
      garage: 'A home garage: grey blockwork, a small window, the car just out of frame.',
      shed: 'A radio ham\'s garden shed: plank walls papered with call-sign cards from far countries.',
      bedroom: 'The corner of a teenager\'s bedroom: striped wallpaper, a pennant and a poster.',
    }),
    hour: choice('What is the hour and state of the place?', {
      midnight: 'Late at night: the lamp throws a warm pool on the work and everything else falls away.',
      daytime: 'An ordinary working day, lamp off, flat daylight on everything.',
      abandoned: 'Long abandoned: the lamp drooped, tools gone from the board, a dead screen hissing to nobody.',
    }),
    mat: choice('What is the work surface under the opened-up device?', {
      cutting: 'A green self-healing cutting mat with a printed grid.',
      plywood: 'Bare plywood, scarred by years of soldering.',
      rubber: 'A blue-grey rubber anti-static mat.',
      newspaper: 'Yesterday\'s newspaper spread out to catch the mess.',
      oilcloth: 'A red-checked kitchen oilcloth.',
    }),
    glow: choice('What is glowing behind the work?', {
      tv: 'An old television showing a black-and-white test card.',
      scope: 'An oscilloscope with a green sine wave on its round screen.',
      receiver: 'A communications receiver with an amber-lit dial and a signal meter.',
      bars: 'A portable television showing colour bars.',
    }),
    pegboard: choice('How are the tools on the pegboard?', {
      outlined: 'Each on its own hook over a painted outline, nearly all in place.',
      crammed: 'Crammed: every hook taken, tools hung two deep.',
      gaps: 'Mostly empty outlines: borrowed, lost, never put back.',
    }),
    drawers: choice('What are the parts drawers like?', {
      steel: 'A grey-green steel cabinet of small drawers with paper label cards.',
      plastic: 'A wall of little plastic drawers showing bright contents.',
      wood: 'Mismatched wooden drawers and cigar boxes with brass knobs.',
    }),
    lamp: choice('What is the swing-arm lamp like?', {
      black: 'A black sprung-arm draughtsman\'s lamp.',
      cream: 'A cream enamel lamp with a wide shade.',
      red: 'A cheerful red clamp lamp.',
      green: 'A dark green industrial lamp.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const W = 13, D = 9.5;
    const night = a.hour === 'midnight', dead = a.hour === 'abandoned';
    const { art: s, world } = diorama(context, {
      background: night ? '#cbc7c6' : dead ? '#d7d8d2' : '#e5e2d6',
      floor: dead ? '#8a7558' : '#9a7a52', width: W, depth: D, maxHeight: 2.6, radius: 1.3, pitch: 30, yaw: 26,
      slots: [[0, 1.0, .05], [-3.5, 0.3, .05], [3.6, 0.7, .05], [-2.5, 3.2, .05], [2.7, 3.3, .05]],
    });
    const hemi = s.root.children.find((child) => (child as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight | undefined;
    if (hemi) hemi.intensity = night ? 0.95 : dead ? 1.2 : 1.45;
    if (world.keyLight) world.keyLight.intensity = night ? 1.3 : dead ? 2.0 : 2.8;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const steel = s.material('#a9aeb0', { metalness: 0.7, roughness: 0.35 });
    const dark = s.material('#222224', { roughness: 0.6 });
    const woodMat = s.material('#7a5632', { roughness: 0.7 });
    const zBack = -D / 2, xLeft = -W / 2;

    const topTex=paint(768,512,(ctx)=>{
      ctx.fillStyle={timber:'#ae8552',laminate:'#d6d1bc',steel:'#a8b3b5',hardboard:'#76614a'}[a.benchTop];ctx.fillRect(0,0,768,512);
      if(a.benchTop==='timber') {for(let x=0;x<768;x+=96){ctx.fillStyle='rgba(60,34,16,.28)';ctx.fillRect(x,0,2,512);}for(let i=0;i<170;i++){ctx.strokeStyle=`rgba(65,36,17,${.06+random()*.16})`;const x=random()*768;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+12,180,x-8,310,x+5,512);ctx.stroke();}}
      else if(a.benchTop==='steel'){for(let i=0;i<300;i++){ctx.strokeStyle=`rgba(235,245,246,${random()*.18})`;const y=random()*512;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(768,y);ctx.stroke();}}
      else {for(let i=0;i<4000;i++){ctx.fillStyle=a.benchTop==='laminate'?(i%2?'#b3b0a0':'#eee8d5'):(i%2?'#91806a':'#615242');ctx.fillRect(random()*768,random()*512,1+random()*2,1+random()*2);}}
    });
    const topMat=new THREE.MeshStandardMaterial({map:topTex,roughness:a.benchTop==='steel'?.35:.8,metalness:a.benchTop==='steel'?.7:0});
    s.box([W,.018,D],[0,.009,0],topMat);
    s.box([W,.12,.09],[0,-.035,D/2-.035],a.benchTop==='steel'?steel:woodMat);

    // ---- Walls.
    const wallTex = paint(256, 256, (ctx) => {
      if (a.place === 'backshop') { ctx.fillStyle = '#ddd2b6'; ctx.fillRect(0, 0, 256, 256); for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(150,130,90,${random() * 0.08})`; ctx.fillRect(random() * 256, random() * 256, 30 + random() * 60, 20 + random() * 40); } }
      else if (a.place === 'garage') { ctx.fillStyle = '#b3b4ae'; ctx.fillRect(0, 0, 256, 256); ctx.strokeStyle = '#8d8e88'; ctx.lineWidth = 4; for (let r = 0; r < 4; r++) { ctx.beginPath(); ctx.moveTo(0, r * 64); ctx.lineTo(256, r * 64); ctx.stroke(); for (let c = 0; c < 3; c++) { const x = c * 128 + (r % 2) * 64; ctx.beginPath(); ctx.moveTo(x, r * 64); ctx.lineTo(x, r * 64 + 64); ctx.stroke(); } } }
      else if (a.place === 'shed') { ctx.fillStyle = '#b08d5e'; ctx.fillRect(0, 0, 256, 256); for (let c = 0; c < 4; c++) { ctx.fillStyle = `rgba(70,45,20,${0.05 + random() * 0.12})`; ctx.fillRect(c * 64, 0, 64, 256); ctx.fillStyle = '#6b4c2a'; ctx.fillRect(c * 64, 0, 3, 256); if (random() < 0.6) { ctx.fillStyle = '#5a3d20'; ctx.beginPath(); ctx.ellipse(c * 64 + 32, random() * 256, 6, 10, 0, 0, 7); ctx.fill(); } } }
      else { ctx.fillStyle = '#cfd8c6'; ctx.fillRect(0, 0, 256, 256); for (let c = 0; c < 8; c++) { ctx.fillStyle = c % 2 ? '#b6c6b0' : '#c4d0bc'; ctx.fillRect(c * 32 + 8, 0, 14, 256); } ctx.fillStyle = '#d99a7a'; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { ctx.beginPath(); ctx.arc(c * 64 + 31, r * 64 + 32, 4, 0, 7); ctx.fill(); } }
      ctx.fillStyle = `rgba(60,50,40,${mood.wear * 0.22})`; ctx.fillRect(0, 0, 256, 256);
    }, [5, 2.5]);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95, color: night ? '#b5afb8' : '#ffffff' });
    const H = 6.2;
    s.box([W + 0.3, H, 0.3], [-0.15, H / 2, zBack - 0.15], wallMat);
    s.box([0.3, H, D], [xLeft - 0.15, H / 2, 0], wallMat);
    s.box([W, 0.5, 0.12], [0, 0.25, zBack + 0.06], woodMat);
    s.box([0.12, 0.5, D], [xLeft + 0.06, 0.25, 0], woodMat);

    // ---- The mat, with its history burnt into it.
    const MW = 8.8, MD = 5.8, MZ = 1.1;
    const matTex = paint(1024, 672, (ctx) => {
      const base = { cutting: '#3f7d5c', plywood: '#c29a62', rubber: '#6f8494', newspaper: '#e2ddcc', oilcloth: '#f0e9da' }[a.mat];
      ctx.fillStyle = base; ctx.fillRect(0, 0, 1024, 672);
      if (a.mat === 'cutting') {
        ctx.strokeStyle = 'rgba(210,235,215,0.55)';
        for (let x = 32; x < 1024; x += 32) { ctx.lineWidth = x % 160 === 0 ? 3 : 1; ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x, 648); ctx.stroke(); }
        for (let y = 24; y < 672; y += 32) { ctx.lineWidth = (y - 24) % 160 === 0 ? 3 : 1; ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(1000, y); ctx.stroke(); }
        ctx.lineWidth = 4; ctx.strokeRect(24, 24, 976, 624); ctx.beginPath(); ctx.moveTo(24, 648); ctx.lineTo(648, 24); ctx.stroke();
      } else if (a.mat === 'plywood') {
        for (let i = 0; i < 90; i++) { ctx.strokeStyle = `rgba(110,70,30,${0.08 + random() * 0.16})`; ctx.lineWidth = 1 + random() * 3; const y = random() * 672; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(300, y + (random() - 0.5) * 50, 700, y + (random() - 0.5) * 50, 1024, y + (random() - 0.5) * 30); ctx.stroke(); }
      } else if (a.mat === 'rubber') {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 5; ctx.strokeRect(18, 18, 988, 636);
        ctx.fillStyle = 'rgba(20,30,40,0.35)'; ctx.beginPath(); ctx.arc(960, 48, 14, 0, 7); ctx.fill();
      } else if (a.mat === 'newspaper') {
        ctx.fillStyle = '#35332e'; ctx.fillRect(40, 30, 620, 46); ctx.fillRect(40, 96, 300, 20);
        for (let c = 0; c < 6; c++) for (let r = 0; r < 44; r++) { if (c > 3 && r < 14) continue; ctx.fillStyle = `rgba(60,58,52,${0.35 + random() * 0.3})`; ctx.fillRect(40 + c * 162, 140 + r * 12, 100 + random() * 46, 5); }
        ctx.fillStyle = '#8a877c'; ctx.fillRect(690, 30, 300, 260);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(512, 0); ctx.lineTo(512, 672); ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(200,50,45,0.55)';
        for (let x = 0; x < 1024; x += 64) ctx.fillRect(x, 0, 32, 672);
        for (let y = 0; y < 672; y += 64) ctx.fillRect(0, y, 1024, 32);
      }
      // Scorches, flux rings and solder splashes.
      const burns = Math.round(3 + mood.wear * 16);
      for (let i = 0; i < burns; i++) {
        const x = 60 + random() * 900, y = 60 + random() * 550, r = 10 + random() * 26, g = ctx.createRadialGradient(x, y, 1, x, y, r);
        g.addColorStop(0, 'rgba(20,12,8,0.9)'); g.addColorStop(0.45, 'rgba(70,40,18,0.6)'); g.addColorStop(1, 'rgba(90,55,25,0)');
        ctx.fillStyle = g; ctx.save(); ctx.translate(x, y); ctx.rotate(random() * 3); ctx.scale(1 + random() * 2.2, 1); ctx.translate(-x, -y); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
      }
      for (let i = 0; i < 2 + mood.wear * 4; i++) { ctx.strokeStyle = `rgba(90,55,25,${0.25 + random() * 0.2})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(80 + random() * 860, 80 + random() * 500, 38, random() * 3, random() * 3 + 4.8); ctx.stroke(); }
      for (let i = 0; i < 40 + mood.density * 60; i++) { ctx.fillStyle = 'rgba(225,230,232,0.9)'; ctx.beginPath(); ctx.arc(random() * 1024, random() * 672, 1.5 + random() * 3, 0, 7); ctx.fill(); }
      if (dead) { ctx.fillStyle = 'rgba(150,145,130,0.4)'; ctx.fillRect(0, 0, 1024, 672); }
    });
    const mat = s.box([MW, 0.05, MD], [0, 0.025, MZ], new THREE.MeshStandardMaterial({ map: matTex, roughness: a.mat === 'oilcloth' ? 0.4 : 0.9 }));
    mat.rotation.y = (random() - 0.5) * 0.05;

    // ---- Pegboard and tools.
    const PX = 2.3, PW = 7.4, PH = 3.5, PY = 3.9, pz = zBack + 0.08;
    const cols = 9, hookRows = [PY + PH / 2 - 0.3, PY - 0.35];
    const fillChance = { outlined: 0.82, crammed: 1, gaps: 0.25 }[a.pegboard] * (dead ? 0.45 : 1);
    const hooks: { x: number; y: number; kind: number; there: boolean }[] = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) hooks.push({ x: PX - PW / 2 + 0.5 + c * ((PW - 1) / (cols - 1)), y: hookRows[r], kind: Math.floor(random() * 8), there: random() < fillChance });
    const boardTex = paint(1024, 484, (ctx) => {
      ctx.fillStyle = a.place === 'bedroom' ? '#e6e0cf' : a.place === 'garage' ? '#c9c2a8' : '#b58d5a'; ctx.fillRect(0, 0, 1024, 484);
      ctx.fillStyle = 'rgba(40,25,10,0.55)';
      for (let x = 12; x < 1024; x += 24) for (let y = 12; y < 484; y += 24) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill(); }
      if (a.pegboard !== 'crammed') {
        ctx.strokeStyle = a.place === 'bedroom' ? 'rgba(200,60,50,0.75)' : 'rgba(250,245,225,0.85)'; ctx.lineWidth = 5; ctx.fillStyle = 'rgba(250,245,225,0.16)';
        for (const hook of hooks) {
          const x = (hook.x - (PX - PW / 2)) / PW * 1024, y = (PY + PH / 2 - hook.y) / PH * 484, wide = [22, 34, 40, 22, 50, 36, 18, 56][hook.kind], tall = [165, 160, 170, 160, 110, 80, 170, 130][hook.kind];
          ctx.beginPath(); ctx.roundRect(x - wide, y - 6, wide * 2, tall, 16); ctx.fill(); ctx.stroke();
        }
      }
      ctx.fillStyle = `rgba(50,40,25,${mood.wear * 0.25})`; ctx.fillRect(0, 0, 1024, 484);
    });
    s.box([PW + 0.2, PH + 0.2, 0.06], [PX, PY, zBack + 0.03], woodMat);
    s.mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.9, color: night ? '#c9c4c8' : '#ffffff' }), [PX, PY, pz]);
    const handleColours = ['#c8261e', '#dba820', '#2a5fb0', '#2f7d4f', '#d9682a', '#3a3a3e'];
    const tool = (kind: number) => {
      const t = new Sculpture(context);
      const colour = s.material(pick(handleColours), { roughness: 0.45 });
      t.rod([0, 0.06, 0], [0, 0, 0.1], 0.02, steel);
      if (kind === 0) { t.cylinder(0.11, 0.09, 0.5, [0, -0.3, 0.06], colour, 10); t.rod([0, -0.55, 0.06], [0, -1.3, 0.06], 0.03, steel, 0.022); }
      else if (kind === 1) { for (const side of [-1, 1]) { t.rod([0, -0.5, 0.06], [side * 0.2, -1.3, 0.06], 0.04, colour); t.rod([0, -0.5, 0.06], [side * 0.035, -0.08, 0.06], 0.045, steel, 0.02); } t.cylinder(0.06, 0.06, 0.07, [0, -0.5, 0.06], steel, 10).rotation.x = Math.PI / 2; }
      else if (kind === 2) { t.rod([0, -0.2, 0.06], [0, -1.4, 0.06], 0.045, s.material('#b58a55', { roughness: 0.6 }), 0.055); t.box([0.56, 0.2, 0.2], [0.04, -0.14, 0.08], steel); }
      else if (kind === 3) { t.box([0.1, 0.9, 0.03], [0, -0.7, 0.05], steel); t.ring(0.11, 0.035, [0, -0.15, 0.05], steel, Math.PI * 1.5).rotation.z = 2.3; t.ring(0.1, 0.035, [0, -1.22, 0.05], steel); }
      else if (kind === 4) { for (let i = 0; i < 3; i++) t.ring(0.33, 0.045, [0, -0.4, 0.05 + i * 0.05], colour); }
      else if (kind === 5) { t.ring(0.22, 0.1, [0, -0.3, 0.07], pick([dark, colour, s.material('#d8d2b8')])); }
      else if (kind === 6) { t.box([0.16, 1.4, 0.025], [0, -0.75, 0.04], steel); for (let i = 0; i < 6; i++) t.box([0.08, 0.012, 0.03], [-0.03, -0.2 - i * 0.2, 0.042], dark); }
      else { t.ring(0.42, 0.03, [0, -0.5, 0.08], dark, Math.PI).rotation.z = 0; for (const side of [-1, 1]) { t.cylinder(0.17, 0.17, 0.14, [side * 0.42, -0.62, 0.08], dark, 14).rotation.z = Math.PI / 2; t.cylinder(0.13, 0.13, 0.16, [side * 0.4, -0.62, 0.08], s.material('#6a4326'), 14).rotation.z = Math.PI / 2; } }
      return t.root;
    };
    for (const hook of hooks) {
      if (!hook.there) continue;
      const g = tool(hook.kind);
      g.position.set(hook.x, hook.y, pz);
      g.rotation.z = (random() - 0.5) * (dead ? 0.5 : 0.12);
      s.root.add(g);
      if (a.pegboard === 'crammed' && random() < 0.4) { const extra = tool(Math.floor(random() * 4)); extra.position.set(hook.x + 0.22, hook.y - 0.1, pz + 0.12); extra.rotation.z = (random() - 0.5) * 0.3; s.root.add(extra); }
    }

    // ---- Parts drawers in the back-left corner.
    const CX = -4.75, CZ = zBack + 0.85, CWd = 3.1, CHt = 3.0, CDp = 1.3;
    const dCols = a.drawers === 'wood' ? 4 : 6, dRows = a.drawers === 'wood' ? 5 : 7;
    const caseMat = s.material({ steel: '#76847a', plastic: '#3f4a5c', wood: '#6b4a2c' }[a.drawers], { roughness: 0.6, metalness: a.drawers === 'steel' ? 0.4 : 0 });
    s.box([CWd, CHt, CDp], [CX, CHt / 2, CZ], caseMat);
    const dw = (CWd - 0.16) / dCols, dh = (CHt - 0.16) / dRows;
    const fronts: { at: P; size: number; color: string }[] = [], cards: { at: P; size: number }[] = [], pulls: { at: P; size: number }[] = [];
    const contents = ['#e94e4e', '#3fb0e0', '#f0c020', '#58c070', '#d98a3a', '#c9c9c0', '#b070d0', '#d8bb8e'];
    for (let r = 0; r < dRows; r++) for (let c = 0; c < dCols; c++) {
      const open = random() < (dead ? 0.3 : 0.08 + mood.energy * 0.12) ? 0.15 + random() * 0.45 : 0;
      const x = CX - CWd / 2 + 0.08 + (c + 0.5) * dw, y = 0.08 + (r + 0.5) * dh, z = CZ + CDp / 2 - 0.3 + open;
      if (dead && random() < 0.12) continue;
      const colour = a.drawers === 'steel' ? '#8b998e' : a.drawers === 'plastic' ? pick(contents) : pick(['#8a6238', '#7a5230', '#9a7446', '#5e3f24', '#a8322a']);
      fronts.push({ at: [x, y, z], size: 1, color: colour });
      if (a.drawers !== 'plastic') cards.push({ at: [x, y + dh * 0.12, z + 0.326], size: 1 });
      pulls.push({ at: [x, y - dh * 0.2, z + 0.34], size: 1 });
    }
    s.scatter(new THREE.BoxGeometry(dw * 0.9, dh * 0.86, 0.64), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: a.drawers === 'plastic' ? 0.25 : 0.6 }), fronts);
    if (cards.length) s.scatter(new THREE.BoxGeometry(dw * 0.5, dh * 0.26, 0.01), s.material('#efe8d2', { roughness: 0.9 }), cards);
    s.scatter(a.drawers === 'wood' ? new THREE.SphereGeometry(0.05, 8, 6) : new THREE.BoxGeometry(dw * 0.4, 0.04, 0.05), a.drawers === 'wood' ? s.material('#c9a54a', { metalness: 0.8, roughness: 0.3 }) : steel, pulls);
    // On top: a carcass or two waiting for parts.
    const setColours = mood.cheer > 0.5 ? ['#c9553a', '#e6dcc0', '#4f8f8a', '#7a4a28'] : ['#7a4a28', '#5a2418', '#6f705f', '#3a3a3e'];
    const setFace = paint(256, 160, (ctx) => {
      ctx.fillStyle = '#b89a55'; ctx.fillRect(14, 20, 130, 120);
      ctx.fillStyle = 'rgba(60,40,15,0.6)'; for (let i = 0; i < 9; i++) ctx.fillRect(14, 26 + i * 13, 130, 5);
      ctx.fillStyle = '#efe2b0'; ctx.beginPath(); ctx.arc(200, 66, 38, 0, 7); ctx.fill();
      ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(200, 66, 28, 0, 7); ctx.stroke(); ctx.strokeStyle = '#c4201a'; ctx.beginPath(); ctx.moveTo(200, 66); ctx.lineTo(222, 44); ctx.stroke();
      ctx.fillStyle = '#2a2018'; for (const x of [176, 224]) { ctx.beginPath(); ctx.arc(x, 132, 12, 0, 7); ctx.fill(); }
    });
    const faceMat = new THREE.MeshStandardMaterial({ map: setFace, roughness: 0.6, transparent: true });
    const oldSet = (at: P, w: number, h: number, d: number, turn: number, tagged: boolean) => {
      const g = new Sculpture(context);
      g.box([w, h, d], [0, h / 2, 0], s.material(pick(setColours), { roughness: 0.45 }));
      g.mesh(new THREE.PlaneGeometry(w * 0.92, h * 0.86), faceMat, [0, h / 2, d / 2 + 0.006]);
      if (tagged) { const tag = g.box([0.22, 0.34, 0.01], [w * 0.3, h * 0.55, d / 2 + 0.03], s.material(pick(['#efe2bd', '#f0b8b0', '#f3e28a']), { roughness: 0.9 })); tag.rotation.z = (random() - 0.5) * 0.5; }
      g.root.position.set(...at); g.root.rotation.y = turn; s.root.add(g.root);
    };
    oldSet([CX - 0.5, CHt, CZ], 1.5, 1.05, 1.0, 0.1 + (random() - 0.5) * 0.2, a.place === 'backshop');
    if (mood.density > 0.35) for (let i = 0; i < 3; i++) s.box([0.7 + random() * 0.3, 0.16, 0.9], [CX + 0.9, CHt + 0.08 + i * 0.16, CZ], s.material(pick(['#a98c5e', '#8a3a32', '#3f6f9a', '#d8cfae']))).rotation.y = (random() - 0.5) * 0.4;

    // ---- Shelf of sets waiting their turn, along the left wall.
    const SY = 3.9;
    s.box([1.3, 0.1, 6.2], [xLeft + 0.65, SY, 1.3], woodMat);
    for (const z of [-1.2, 1.3, 3.8]) { s.box([1.1, 0.06, 0.08], [xLeft + 0.55, SY - 0.1, z], steel); s.rod([xLeft + 0.05, SY - 0.9, z], [xLeft + 1.05, SY - 0.1, z], 0.03, steel); }
    const waiting = Math.round(a.backlog*4);
    for (let i = 0; i < waiting; i++) oldSet([xLeft + 0.7, SY + 0.05, -1.0 + i * (5.2 / Math.max(1, waiting - 1 || 1)) * (waiting > 1 ? 1 : 0)], 1.05 + random() * 0.4, 0.8 + random() * 0.5, 0.95, Math.PI / 2 + (random() - 0.5) * 0.3, a.place === 'backshop' || random() < 0.4);

    // These live against the near left wall, below the shelf and outside the cast slots.
    const rack=new Sculpture(context);rack.root.position.set(xLeft+.08,1.2,2.9);rack.root.rotation.y=Math.PI/2;s.root.add(rack.root);
    if(a.leads==='hooks')for(let i=0;i<3;i++) {
      const x=(i-1)*.5,colour=s.material(['#ab5142','#424d57','#ad9450'][i],{roughness:.7});
      rack.rod([x,1.1,0],[x,1.1,.15],.025,steel);
      for(let n=0;n<3;n++)rack.ring(.25+n*.017,.018,[x,.83,.16+n*.025],colour);
      rack.rod([x-.15,.65,.17],[x-.17,.15,.18],.02,colour);
      rack.cylinder(.04,.025,.18,[x-.17,.08,.18],dark,10);
    } else if(a.leads==='comb') {
      rack.box([1.7,.14,.12],[0,1.1,.06],woodMat);
      for(let i=0;i<7;i++){const x=(i-3)*.23;rack.rod([x,1.1,.12],[x,1.1,.37],.027,steel);if(i<6)rack.tube([[x+.1,.15,.2],[x+.1,1.14,.2],[x+.1,1.17,.3],[x+.1,.35,.38]],.018,s.material(i%2?'#aa5646':'#414e5a'));}
    } else if(a.leads==='reel') {
      rack.box([.45,.45,.09],[0,.7,.045],woodMat);rack.rod([0,.7,.08],[0,.7,.48],.045,steel);
      for(const z of [.15,.46])rack.cylinder(.47,.47,.04,[0,.7,z],steel,24).rotation.x=Math.PI/2;
      rack.cylinder(.36,.36,.26,[0,.7,.305],dark,24).rotation.x=Math.PI/2;
      rack.tube([[.28,.45,.3],[.36,.18,.3],[.15,.08,.35]],.024,dark);
      rack.rod([0,.7,.5],[.32,.7,.5],.024,steel);rack.cylinder(.05,.05,.15,[.32,.7,.57],woodMat,10).rotation.x=Math.PI/2;
    }
    if(a.instrument!=='none') {
      const inst=new Sculpture(context);inst.root.position.set(xLeft+.07,2.6,.5);inst.root.rotation.y=Math.PI/2;s.root.add(inst.root);
      if(a.instrument==='clock') {inst.cylinder(.4,.4,.1,[0,0,.05],dark,32).rotation.x=Math.PI/2;const tex=paint(256,256,ctx=>{ctx.fillStyle='#e7ddbc';ctx.fillRect(0,0,256,256);ctx.strokeStyle='#364049';ctx.lineWidth=5;for(let i=0;i<12;i++){const t=i*Math.PI/6;ctx.beginPath();ctx.moveTo(128+Math.sin(t)*92,128-Math.cos(t)*92);ctx.lineTo(128+Math.sin(t)*104,128-Math.cos(t)*104);ctx.stroke();}ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(128,128);ctx.lineTo(night?102:170,night?81:100);ctx.moveTo(128,128);ctx.lineTo(128,42);ctx.stroke();});inst.mesh(new THREE.CircleGeometry(.36,32),new THREE.MeshStandardMaterial({map:tex,roughness:.8}),[0,0,.105]);}
      else if(a.instrument==='meter') {inst.box([.76,.58,.16],[0,0,.08],dark);const tex=paint(256,192,ctx=>{ctx.fillStyle='#e4d9b7';ctx.fillRect(0,0,256,192);ctx.strokeStyle='#343e44';ctx.lineWidth=4;ctx.beginPath();ctx.arc(128,180,124,Math.PI*1.16,Math.PI*1.84);ctx.stroke();ctx.beginPath();ctx.moveTo(128,180);ctx.lineTo(164,57);ctx.stroke();ctx.fillStyle='#343e44';ctx.font='bold 30px monospace';ctx.fillText('MAINS V',55,35);});inst.mesh(new THREE.PlaneGeometry(.65,.46),new THREE.MeshStandardMaterial({map:tex,roughness:.8}),[0,0,.165]);}
      else {inst.box([.28,1.05,.07],[0,0,.035],s.material('#d6c7a6'));inst.rod([0,-.38,.08],[0,.39,.08],.015,s.material('#d9e1db'));inst.rod([0,-.38,.1],[0,mix(-.15,.25,mood.warmth),.1],.009,s.material('#b14138'));inst.ball([.035,.035,.022],[0,-.4,.09],s.material('#b14138'),10);for(let i=0;i<9;i++)inst.box([.07,.01,.007],[.07,-.32+i*.08,.075],dark);}
    }

    // ---- What the wall says about the place.
    if (a.place === 'backshop') {
      s.label('RADIO REPAIRS', 5.2, 0.62, [PX, PY + PH / 2 + 0.5, zBack + 0.03], '#f1e8c9', mood.cheer > 0.5 ? '#a8322a' : '#2f4a3a');
      const slips = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if (random() < (dead ? 0.35 : 0.85)) slips.push({ at: [-3.2 + c * 0.42 + (random() - 0.5) * 0.06, 5.6 - r * 0.62, zBack + 0.03] as P, size: 1, color: pick(['#efe2bd', '#f0b8b0', '#f3e28a', '#cfe2c0']) });
      s.scatter(new THREE.BoxGeometry(0.32, 0.5, 0.012), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), slips);
    } else if (a.place === 'garage') {
      s.box([1.9, 1.7, 0.1], [-2.55, 4.7, zBack + 0.03], s.material('#e6e2d4'));
      const sky = night ? '#1f2a4a' : dead ? '#aab6b8' : '#bcd6ea';
      s.mesh(new THREE.PlaneGeometry(1.64, 1.44), new THREE.MeshStandardMaterial({ color: sky, emissive: sky, emissiveIntensity: night ? 0.35 : 0.6, roughness: 0.2 }), [-2.55, 4.7, zBack + 0.09]);
      s.box([0.06, 1.44, 0.04], [-2.55, 4.7, zBack + 0.1], s.material('#e6e2d4')); s.box([1.64, 0.06, 0.04], [-2.55, 4.7, zBack + 0.1], s.material('#e6e2d4'));
      if (night) s.mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#fff2c0', emissiveIntensity: 1.4 }), [-2.2, 5.05, zBack + 0.095]);
      s.label(pick(['KGB 417', 'RX 5 OHM', 'ZL 1947']), 1.3, 0.34, [-2.55, 3.45, zBack + 0.03], '#1c1c1c', '#e8c832');
    } else if (a.place === 'shed') {
      const qsl = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (random() < (dead ? 0.4 : 0.9)) qsl.push({ at: [-3.35 + c * 0.5 + (random() - 0.5) * 0.05, 5.75 - r * 0.42 + (random() - 0.5) * 0.04, zBack + 0.03] as P, size: 1, color: pick(['#e9d9a8', '#c94a3a', '#3f7fb0', '#e8b83a', '#5a9a6a', '#efefe6', '#d98a4a']) });
      s.scatter(new THREE.BoxGeometry(0.44, 0.3, 0.012), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), qsl);
      s.label(pick(['CQ CQ DX', 'G3 ZZQ', '73 OM']), 2.4, 0.5, [PX, PY + PH / 2 + 0.45, zBack + 0.03], '#f4ecd0', '#2a3f5a');
    } else {
      const poster = paint(192, 256, (ctx) => { ctx.fillStyle = mood.cheer > 0.5 ? '#e8b83a' : '#2a3f5a'; ctx.fillRect(0, 0, 192, 256); ctx.strokeStyle = mood.cheer > 0.5 ? '#c94a3a' : '#e8e2c8'; ctx.lineWidth = 7; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.arc(96, 150, i * 22, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); } ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(90, 150, 12, 90); ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center'; ctx.fillText('ON AIR', 96, 34); });
      const p = s.mesh(new THREE.PlaneGeometry(1.5, 2.0), new THREE.MeshStandardMaterial({ map: poster, roughness: 0.85 }), [-2.6, 4.75, zBack + 0.02]);
      p.rotation.z = (random() - 0.5) * 0.08;
      const pennant = new THREE.Shape(); pennant.moveTo(0, 0.3); pennant.lineTo(1.7, 0); pennant.lineTo(0, -0.3);
      s.mesh(new THREE.ShapeGeometry(pennant), s.material(mood.cheer > 0.5 ? '#c8261e' : '#3f6f9a', { side: THREE.DoubleSide }), [PX - 1, PY + PH / 2 + 0.5, zBack + 0.03]);
    }

    // ---- The glowing thing behind the work.
    const G = new Sculpture(context);
    const glowColour = { tv: '#dfe8ff', bars: '#fff0e0', scope: '#7dffa0', receiver: '#ffc070' }[a.glow];
    let screenMat: THREE.MeshStandardMaterial;
    const level = dead ? 0.45 : night ? 1.25 : 0.95;
    const emissive = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: level, roughness: 0.25 });
    if (a.glow === 'tv' || a.glow === 'bars') {
      const portable = a.glow === 'bars';
      const bw = portable ? 2.3 : 2.9, bh = portable ? 1.9 : 2.3, bd = 1.7;
      G.box([bw, bh, bd], [0, bh / 2 + 0.08, 0], portable ? s.material(mood.cheer > 0.5 ? '#d9682a' : '#e6e0d0', { roughness: 0.35 }) : s.material('#6b4226', { roughness: 0.4 }));
      for (const x of [-1, 1]) for (const z of [-1, 1]) G.cylinder(0.07, 0.05, 0.08, [x * (bw / 2 - 0.2), 0.04, z * (bd / 2 - 0.2)], dark, 8);
      const sw = bw * 0.66, sh = bh * 0.72;
      const tex = paint(320, 256, (ctx) => {
        ctx.fillStyle = '#141416'; ctx.fillRect(0, 0, 320, 256);
        ctx.beginPath(); ctx.roundRect(8, 8, 304, 240, 34); ctx.clip();
        if (dead) { const img = ctx.createImageData(320, 256); for (let i = 0; i < img.data.length; i += 4) { const v = 60 + random() * 180; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } ctx.putImageData(img, 0, 0); ctx.fillStyle = '#141416'; ctx.fillRect(0, 0, 320, 8); ctx.fillRect(0, 248, 320, 8); ctx.fillRect(0, 0, 8, 256); ctx.fillRect(312, 0, 8, 256); }
        else if (portable) {
          ['#e8e8e8', '#e8e020', '#20d8d8', '#28c838', '#d830c8', '#e02828', '#2838d8'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(8 + i * 43.5, 8, 44, 170); });
          ['#2838d8', '#141414', '#d830c8', '#141414', '#20d8d8', '#141414', '#e8e8e8'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(8 + i * 43.5, 178, 44, 22); });
          ['#101850', '#f4f4f4', '#401878', '#141414', '#2a2a2a', '#141414'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(8 + i * 50.7, 200, 51, 48); });
        } else {
          ctx.fillStyle = '#8c8c8c'; ctx.fillRect(0, 0, 320, 256);
          ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 2; for (let x = 20; x < 320; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); } for (let y = 16; y < 256; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(320, y); ctx.stroke(); }
          ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.arc(160, 128, 98, 0, 7); ctx.fill();
          for (let i = 0; i < 6; i++) { ctx.fillStyle = ['#111', '#3a3a3a', '#6a6a6a', '#9a9a9a', '#c8c8c8', '#f4f4f4'][i]; ctx.fillRect(100 + i * 20, 150, 20, 30); }
          ctx.fillStyle = '#111'; for (let i = 0; i < 14; i++) ctx.fillRect(96 + i * 9.4, 76, 2 + i * 0.35, 40);
          ctx.fillRect(110, 122, 100, 20); ctx.fillStyle = '#f0f0f0'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'; ctx.fillText('TEST CARD', 160, 137);
          ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(160, 62, 8, 0, 7); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(160, 128, 98, 0, 7); ctx.stroke();
          for (const [x, y] of [[40, 36], [280, 36], [40, 220], [280, 220]]) { ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.arc(x, y, 24, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill(); }
        }
      });
      screenMat = emissive(tex);
      G.box([sw + 0.16, sh + 0.16, 0.06], [-bw * 0.12, bh / 2 + 0.1, bd / 2 + 0.01], dark);
      G.mesh(new THREE.PlaneGeometry(sw, sh), screenMat, [-bw * 0.12, bh / 2 + 0.1, bd / 2 + 0.045]);
      for (let i = 0; i < 3; i++) G.cylinder(0.11, 0.13, 0.1, [bw * 0.38, bh * 0.75 - i * 0.42, bd / 2 + 0.05], i ? dark : s.material('#c9a54a', { metalness: 0.7, roughness: 0.3 }), 14).rotation.x = Math.PI / 2;
      G.box([bw * 0.16, 0.3, 0.03], [bw * 0.38, 0.4, bd / 2 + 0.01], s.material('#b89a55'));
      for (const side of [-1, 1]) G.rod([side * 0.12, bh + 0.1, 0], [side * 1.1, bh + 1.5 + random() * 0.3, -0.2], 0.022, steel);
      G.cylinder(0.16, 0.2, 0.1, [0, bh + 0.13, 0], dark, 12);
    } else if (a.glow === 'scope') {
      const bw = 2.0, bh = 2.6, bd = 2.2;
      G.box([bw, bh, bd], [0, bh / 2 + 0.08, 0], s.material('#7f8f98', { roughness: 0.5, metalness: 0.3 }));
      G.box([bw + 0.04, bh + 0.04, 0.08], [0, bh / 2 + 0.08, bd / 2], s.material('#cfd3cf', { roughness: 0.5 }));
      const tex = paint(256, 256, (ctx) => {
        ctx.fillStyle = '#0c1f16'; ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = 'rgba(120,220,150,0.35)'; ctx.lineWidth = 1.5; for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, 256); ctx.moveTo(0, i * 32); ctx.lineTo(256, i * 32); ctx.stroke(); }
        ctx.strokeStyle = '#9dffb8'; ctx.lineWidth = 6; ctx.shadowColor = '#6dff98'; ctx.shadowBlur = 14; ctx.beginPath();
        const cycles = 1.5 + random() * 2.5, amp = dead ? 0 : 50 + random() * 40;
        for (let x = 20; x <= 236; x += 2) { const p=(x-20)/216*cycles,t=p*Math.PI*2;const wave=a.trace==='square'?Math.sign(Math.sin(t)):a.trace==='saw'?(p%1)*2-1:Math.sin(t);const y = (a.trace==='dual'?91:128) - wave * amp * (a.trace==='dual'?.45:1) * (1 + (mood.energy > 0.6 ? Math.sin(x * 0.4) * 0.25 : 0)); if (x === 20) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
        if(a.trace==='dual'){ctx.strokeStyle='#d5eb9c';ctx.beginPath();for(let x=20;x<=236;x+=2){const y=177-Math.sin((x-20)/216*Math.PI*2*cycles+.7)*amp*.35;if(x===20)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
      });
      screenMat = emissive(tex);
      G.ring(0.68, 0.07, [0, bh * 0.68, bd / 2 + 0.05], dark);
      G.mesh(new THREE.CircleGeometry(0.66, 32), screenMat, [0, bh * 0.68, bd / 2 + 0.055]);
      const knobs = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) knobs.push({ at: [-0.63 + c * 0.42, 0.75 - r * 0.38, bd / 2 + 0.09] as P, size: 1 });
      const kn = G.scatter(new THREE.CylinderGeometry(0.11, 0.13, 0.12, 12).rotateX(Math.PI / 2), dark, knobs); kn.castShadow = true;
      G.tube([[-0.5, bh + 0.08, 0], [-0.3, bh + 0.4, 0], [0.3, bh + 0.4, 0], [0.5, bh + 0.08, 0]], 0.04, dark);
      G.tube([[0.75, 0.3, bd / 2 + 0.06], [1.1, 0.06, bd / 2 + 0.5], [1.6, 0.05, bd / 2 + 0.3], [2.1, 0.05, bd / 2 + 0.9]], 0.03, dark);
    } else {
      const bw = 3.5, bh = 1.75, bd = 1.9;
      G.box([bw, bh, bd], [0, bh / 2 + 0.08, 0], s.material('#2a2c2e', { roughness: 0.75 }));
      G.box([bw + 0.05, bh + 0.05, 0.07], [0, bh / 2 + 0.08, bd / 2], s.material('#3b3e40', { roughness: 0.5, metalness: 0.3 }));
      const tex = paint(512, 128, (ctx) => {
        ctx.fillStyle = '#ffd88a'; ctx.fillRect(0, 0, 512, 128);
        ctx.strokeStyle = '#3a2412'; ctx.fillStyle = '#3a2412'; ctx.lineWidth = 2.5; ctx.font = 'bold 15px monospace';
        for (let r = 0; r < 3; r++) { const y = 34 + r * 36; ctx.beginPath(); ctx.moveTo(16, y); ctx.lineTo(496, y); ctx.stroke(); for (let i = 0; i <= 40; i++) { ctx.beginPath(); ctx.moveTo(16 + i * 12, y); ctx.lineTo(16 + i * 12, y - (i % 5 ? 7 : 15)); ctx.stroke(); if (i % 10 === 0) ctx.fillText(String((r + 1) * 3 + i / 10), 20 + i * 12, y + 15); } }
        ctx.strokeStyle = '#c4201a'; ctx.lineWidth = 5; const px = 40 + random() * 430; ctx.beginPath(); ctx.moveTo(px, 4); ctx.lineTo(px, 124); ctx.stroke();
      });
      screenMat = emissive(tex);
      G.mesh(new THREE.PlaneGeometry(2.0, 0.55), screenMat, [-0.45, bh * 0.72, bd / 2 + 0.045]);
      const meter = paint(128, 96, (ctx) => { ctx.fillStyle = '#ffe9b0'; ctx.fillRect(0, 0, 128, 96); ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(64, 96, 66, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); ctx.strokeStyle = '#c4201a'; ctx.beginPath(); ctx.moveTo(64, 96); const t = Math.PI * (1.25 + (dead ? 0.02 : random() * 0.45)); ctx.lineTo(64 + Math.cos(t) * 70, 96 + Math.sin(t) * 70); ctx.stroke(); ctx.fillStyle = '#3a2412'; ctx.font = 'bold 14px monospace'; ctx.fillText('S', 10, 20); });
      G.mesh(new THREE.PlaneGeometry(0.62, 0.46), emissive(meter), [1.15, bh * 0.72, bd / 2 + 0.045]);
      G.cylinder(0.3, 0.33, 0.14, [-0.45, bh * 0.3, bd / 2 + 0.08], dark, 20).rotation.x = Math.PI / 2;
      G.cylinder(0.22, 0.22, 0.03, [-0.45, bh * 0.3, bd / 2 + 0.16], steel, 20).rotation.x = Math.PI / 2;
      for (const x of [-1.4, -1.05, 0.25, 0.6, 0.95, 1.3]) G.cylinder(0.1, 0.12, 0.1, [x, bh * 0.28, bd / 2 + 0.07], dark, 12).rotation.x = Math.PI / 2;
      // Headphones hooked over the corner.
      G.ring(0.42, 0.035, [bw / 2 - 0.3, bh + 0.1, 0.2], dark, Math.PI);
      for (const side of [-1, 1]) G.cylinder(0.2, 0.2, 0.16, [bw / 2 - 0.3 + side * 0.42, bh + 0.05, 0.2], s.material('#6a4326'), 14).rotation.z = Math.PI / 2;
      G.box([1.2, 1.1, 1.1], [-0.6, bh + 0.63, -0.2], s.material('#3b3e40', { roughness: 0.6 }));
      G.mesh(new THREE.CircleGeometry(0.42, 24), s.material('#8a7a52', { roughness: 1 }), [-0.6, bh + 0.63, 0.36]);
    }
    G.root.position.set(-1.0, 0, zBack + 1.35);
    G.root.rotation.y = 0.14 + (random() - 0.5) * 0.1;
    s.root.add(G.root);
    const glowLight = new THREE.PointLight(glowColour, (dead ? 2 : night ? 9 : 4), 8, 1.2);
    glowLight.position.set(-1.0, 1.7, zBack + 3.2);
    s.root.add(glowLight);

    // ---- Swing-arm lamp, clamped at the back-right corner.
    const lampOn = night;
    const shadeMat = s.material(LAMPS[a.lamp], { roughness: 0.35, metalness: 0.2, side: THREE.DoubleSide });
    const A = new THREE.Vector3(5.5, 0.35, zBack + 0.75), B = new THREE.Vector3(5.0, 3.5, zBack + 1.3);
    const ends={middle:[2.2,4.75,-.9],near:[3.2,3.7,.8],upright:[5.0,5.2,-2.7],side:[4.5,3.9,-.2]} as const;
    const C = dead ? new THREE.Vector3(3.3, 2.5, zBack + 2.4) : new THREE.Vector3(...ends[a.lampReach]);
    s.box([0.5, 0.35, 0.6], [A.x, 0.18, A.z], dark);
    s.cylinder(0.09, 0.09, 0.3, [A.x, 0.45, A.z], steel, 10);
    for (const off of [-0.09, 0.09]) {
      s.rod([A.x, A.y, A.z + off], [B.x, B.y, B.z + off], 0.035, shadeMat);
      s.rod([B.x, B.y, B.z + off], [C.x, C.y, C.z + off], 0.035, shadeMat);
    }
    s.rod(A.clone().lerp(B, 0.1).add(new THREE.Vector3(0.18, 0, 0)).toArray() as P, A.clone().lerp(B, 0.55).toArray() as P, 0.022, steel);
    s.rod(B.clone().lerp(C, 0.08).add(new THREE.Vector3(0, 0.2, 0)).toArray() as P, B.clone().lerp(C, 0.5).toArray() as P, 0.022, steel);
    s.ball([0.12, 0.12, 0.12], B.toArray() as P, steel, 10); s.ball([0.11, 0.11, 0.11], C.toArray() as P, steel, 10);
    const target = dead ? new THREE.Vector3(C.x - 0.2, 0, C.z + 0.4) : new THREE.Vector3(a.lampReach==='side'?3.6:0,.6,a.lampReach==='near'?3.2:1);
    const aim = target.clone().sub(C).normalize();
    const shade = new Sculpture(context);
    const wide = a.lamp === 'cream' ? 0.82 : 0.66;
    shade.lathe([[0.1, 0], [0.16, 0.22], [wide * 0.75, 0.62], [wide, 0.95]], shadeMat);
    shade.cylinder(0.12, 0.1, 0.24, [0, -0.08, 0], shadeMat, 12);
    const bulb = new THREE.MeshStandardMaterial({ color: lampOn ? '#fff4d0' : '#d8d4c4', emissive: new THREE.Color().setHSL(mix(0.14, 0.08, mood.warmth), 1, 0.6), emissiveIntensity: lampOn ? 3 : 0, roughness: 0.3 });
    shade.ball([0.2, 0.26, 0.2], [0, 0.5, 0], bulb, 14);
    const inner = shade.mesh(new THREE.CircleGeometry(wide * 0.96, 24), new THREE.MeshStandardMaterial({ color: '#fff0c8', emissive: '#ffd080', emissiveIntensity: lampOn ? 1.5 : 0, transparent: true, opacity: lampOn ? 0.55 : 0, depthWrite: false, side: THREE.DoubleSide }), [0, 0.9, 0]);
    inner.rotation.x = Math.PI / 2; inner.castShadow = false;
    shade.root.position.copy(C).addScaledVector(aim, 0.12);
    shade.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), aim);
    s.root.add(shade.root);
    const spot = new THREE.SpotLight(new THREE.Color().setHSL(mix(0.13, 0.07, mood.warmth), 0.9, 0.72), lampOn ? 5.5 : 0, 0, 0.66, 0.8, 0);
    spot.position.copy(C).addScaledVector(aim, 0.5);
    spot.target.position.copy(target);
    s.root.add(spot, spot.target);

    // ---- Bench clutter outside the standing spots.
    const strip = new Sculpture(context);
    strip.box([2.6, 0.2, 0.36], [0, 0.1, 0], s.material('#e6e2d4', { roughness: 0.5 }));
    for (let i = 0; i < 4; i++) { strip.box([0.3, 0.02, 0.24], [-0.85 + i * 0.5, 0.205, 0], dark); }
    strip.box([0.16, 0.06, 0.2], [1.1, 0.22, 0], new THREE.MeshStandardMaterial({ color: '#ff5030', emissive: '#ff2a10', emissiveIntensity: dead ? 0 : 1.6 }));
    strip.root.position.set(2.6, 0.5, zBack + 0.32); s.root.add(strip.root);
    s.tube([[3.9, 0.6, zBack + 0.32], [4.6, 0.3, zBack + 0.5], [5.2, 0.04, zBack + 1.5], [6.2, 0.04, zBack + 1.2]], 0.035, dark);
    // Service manuals, a jar of screws and reels of hook-up wire along the right edge and back.
    const bookColours = ['#8a3a32', '#3f6f9a', '#d8cfae', '#4a6a4a', '#b9903a', '#5a5a62'];
    let top = 0;
    for (let i = 0; i < 2 + Math.round(mood.density * 4); i++) { const h = 0.1 + random() * 0.14; const b = s.box([1.05 + random() * 0.25, h, 1.4 + random() * 0.2], [5.65, top + h / 2, -1.9 + (random() - 0.5) * 0.1], s.material(pick(bookColours), { roughness: 0.8 })); b.rotation.y = (random() - 0.5) * 0.35; top += h; }
    if(a.reference!=='none') {
      const ref=new Sculpture(context),rx=5.65,rz=.65,ink=s.material('#41444a'),paper=s.material('#e7dec4');
      if(a.reference==='card') {ref.box([.65,.07,.5],[0,.035,0],woodMat);ref.rod([0,.07,0],[0,1.0,0],.035,steel);ref.box([.95,.65,.04],[0,1.0,0],paper);for(let i=0;i<5;i++)ref.box([.7,.018,.012],[0,.8+i*.09,.027],ink);ref.box([.18,.12,.04],[0,1.32,.04],steel);}
      else {
        const angle=a.reference==='book'?.42:0,by=a.reference==='book'?.62:.06;
        if(a.reference==='book'){ref.box([1.3,.08,.85],[0,.04,0],woodMat);for(const x of [-.47,.47])for(const z of [-.32,.32])ref.rod([x,.08,z],[x,by-Math.sin(angle)*z-.035*Math.cos(angle),z],.035,steel);}
        const pages=new Sculpture(context);pages.box([1.35,.07,.9],[0,0,0],woodMat);pages.box([1.29,.06,.85],[0,.05,0],paper);pages.box([.018,.012,.85],[0,.086,0],ink);
        for(const side of [-1,1])for(let i=0;i<9;i++)pages.box([.48,.003,.01],[side*.34,.082,-.33+i*.077],ink);
        if(a.reference==='book')pages.box([1.42,.08,.07],[0,.1,.45],woodMat);
        else pages.rod([-.5,.11,.1],[.55,.11,.24],.018,s.material('#b99b42'));
        pages.root.position.set(0,by,0);pages.root.rotation.x=angle;ref.root.add(pages.root);
      }
      ref.root.position.set(rx,.018,rz);s.root.add(ref.root);
    }
    const jarAt: P = [1.5, 0, zBack + 1.2];
    s.cylinder(0.26, 0.26, 0.55, [jarAt[0], 0.28, jarAt[2]], new THREE.MeshStandardMaterial({ color: '#cfe6e0', transparent: true, opacity: 0.4, roughness: 0.05 }), 16);
    s.cylinder(0.24, 0.24, 0.3, [jarAt[0], 0.17, jarAt[2]], s.material('#7d8284', { metalness: 0.7, roughness: 0.5 }), 14);
    s.cylinder(0.28, 0.28, 0.08, [jarAt[0], 0.59, jarAt[2]], s.material(mood.cheer > 0.5 ? '#c8261e' : '#b9903a', { metalness: 0.5 }), 16);
    const reelColours = ['#c8261e', '#dba820', '#2a5fb0', '#2f7d4f', '#1c1c1e'];
    for (let i = 0; i < 1 + Math.round(mood.density * 3); i++) {
      const rx = xLeft + 0.75 + (i % 2) * 0.1, rz = 1.2 + i * 0.75, colour = s.material(reelColours[Math.floor(random() * 5)], { roughness: 0.5 });
      s.cylinder(0.34, 0.34, 0.05, [rx, 0.025, rz], dark, 18); s.cylinder(0.27, 0.27, 0.3, [rx, 0.2, rz], colour, 18); s.cylinder(0.34, 0.34, 0.05, [rx, 0.375, rz], dark, 18);
    }
    // Offcuts and dropped screws across the surface.
    const bits = [];
    for (let i = 0; i < 12 + mood.density * 40; i++) bits.push({ at: [(random() - 0.5) * (W - 1.5), 0.065, -2.2 + random() * 6.4] as P, size: 0.5 + random(), color: pick(['#c8261e', '#dba820', '#2a5fb0', '#d4d8da', '#d4d8da', '#b86a35']) });
    s.scatter(new THREE.CapsuleGeometry(0.02, 0.13, 2, 5).rotateZ(Math.PI / 2).rotateY(0.6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4, metalness: 0.3 }), bits);
    if (dead) {
      // Cobwebs in the corner and a dust sheet thrown over the cabinet top.
      const web = new THREE.LineBasicMaterial({ color: '#f1f1ea', transparent: true, opacity: 0.6 });
      const pts: THREE.Vector3[] = [];
      const corner = new THREE.Vector3(xLeft + 0.05, H - 0.05, zBack + 0.05);
      for (let i = 0; i < 7; i++) { const t = i / 6; const end = new THREE.Vector3(xLeft + 0.05 + (1 - t) * 2.2, H - 0.05 - t * 2.2 * (i % 2 ? 0.6 : 1), zBack + 0.05 + t * 1.8); pts.push(corner, end); for (let k = 1; k < 4; k++) { const next = new THREE.Vector3(xLeft + 0.05 + (1 - (i + 1) / 6) * 2.2, H - 0.05 - (i + 1) / 6 * 2.2, zBack + 0.05 + (i + 1) / 6 * 1.8); if (i < 6) pts.push(corner.clone().lerp(end, k / 4), corner.clone().lerp(next, k / 4)); } }
      s.root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), web));
    }

    const flicker = mood.energy, phase = random() * 10;
    world.update = (_dt, time) => {
      const noise = Math.sin(time * 13 + phase) * 0.04 + Math.sin(time * 47 + phase) * 0.03;
      screenMat.emissiveIntensity = level * (1 + noise * (0.4 + flicker) * (dead ? 4 : 1));
      glowLight.intensity = (dead ? 2 : night ? 9 : 4) * (1 + noise * (0.4 + flicker));
      if (lampOn && mood.wear > 0.7) { const dip = Math.sin(time * 31 + phase) > 0.93 ? 0.5 : 1; spot.intensity = 5.5 * dip; bulb.emissiveIntensity = 3 * dip; }
    };
    return world;
  },
});
