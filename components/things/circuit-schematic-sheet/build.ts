import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];

const STYLES = {
  schematic: { paper: '#f1ede0', ink: '#22252a', w: 0.42, d: 0.297 },
  blueprint: { paper: '#27539c', ink: '#eef3fb', w: 0.46, d: 0.32 },
  sketch: { paper: '#f0e2a0', ink: '#4a4a52', w: 0.3, d: 0.22 },
  manual: { paper: '#dccfa8', ink: '#2e2618', w: 0.4, d: 0.28 },
  tracing: { paper: '#d6dfe2', ink: '#1f2f5a', w: 0.42, d: 0.297 },
} as const;

export default defineThing({
  questions: {
    stages: score('How many valve stages does the drawing follow?', ['A simple two-stage circuit', 'Three or four linked stages', 'Five tightly packed stages']),
    resistorForm: choice('How are resistors drawn?', {
      zigzag: 'Angular zigzag symbols.', rectangle: 'Open rectangular symbols with wires at either end.',
      filled: 'Solid dark rectangular bodies.', vintage: 'Long narrow rectangles with a small central value mark.',
    }),
    route: choice('Which route has been traced over the diagram?', {
      none: 'Only the printed wiring and local fault marks.', signal: 'A translucent line follows the signal from left to right.',
      supply: 'The upper supply rail and its downward feeds are highlighted.', return: 'The lower return rail and ground connection are traced.',
    }),
    grid: choice('What drafting guides surround the circuit?', {
      plain: 'Plain paper without guides.', squares: 'A faint square engineering grid.',
      dots: 'A field of small drafting dots.', zones: 'A numbered border divided into drawing zones.',
    }),
    revision: choice('How is the latest revision recorded?', {
      none: 'No revision mark.', strip: 'A pasted revision strip along the lower margin.',
      stamp: 'A rectangular checked stamp in the upper margin.', correction: 'A pale correction patch with a red replacement value.',
    }),
    stack: choice('What is underneath the drawing?', {
      single: 'The one loose sheet.', offsets: 'Three staggered sheets with visible corners.',
      pad: 'A thick ruled pad with a dark glued top edge.', board: 'A rigid drafting board with the sheet clipped at the top.',
    }),
    reference: choice('What small reference accompanies the circuit?', {
      none: 'No separate reference.', voltages: 'A voltage checklist beside the sheet.',
      pins: 'A circular valve pinout card.', values: 'A small colour-band reference strip.',
    }),
    drawing: choice('What kind of drawing is it?', {
      schematic: 'A crisp printed schematic: black lines on white paper, valves, resistors and coils.',
      blueprint: 'A blueprint: white lines on deep blue with a title block in the corner.',
      sketch: 'A hand sketch in wobbly pencil on a yellow lined pad.',
      manual: 'A yellowed page from a service manual, with a parts table down the side.',
      tracing: 'Drafting film in fine blue ink, taped down at the corners.',
    }),
    notes: score('How heavily has it been annotated by hand?', ['Untouched, as printed', 'A few pencilled voltages', 'Notes and arrows in every margin', 'Scrawled over until the drawing barely shows']),
    fault: choice('What has the red pencil marked?', {
      found: 'One confident circle round the fault, underlined, with an arrow.',
      hunting: 'Several circles, most of them crossed out again: still hunting.',
      lost: 'No circles, only question marks: no idea yet.',
      solved: 'A circle with a big tick through it: fixed.',
    }),
    stains: choice('What has happened to the paper?', {
      clean: 'Nothing, it has been looked after.',
      coffee: 'Overlapping brown coffee rings.',
      scorch: 'A brown scorch with a black heart where the iron was set down.',
      flux: 'Greasy yellow spots of flux and oil.',
      torn: 'A torn corner, mended with yellowed tape.',
    }),
    folds: score('How creased is it?', ['Flat and fresh from the drawer', 'Folded once', 'Folded into quarters many times', 'Soft with creases, corners curling']),
    weight: choice('What is holding it down?', {
      hot: 'A mug of tea, still steaming.',
      cold: 'A mug of coffee gone cold, a dark ring inside.',
      enamel: 'A chipped white enamel workshop mug.',
      pliers: 'A pair of pliers thrown across the corner.',
      valve: 'A dead valve used as a paperweight.',
    }),
    tools: choice('What drawing tools lie on it?', {
      pencil: 'Just the red pencil.',
      set: 'The red pencil, a steel rule and a worn eraser.',
      loupe: 'The red pencil and a folding magnifier.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const st = STYLES[a.drawing];
    const W = st.w, D = st.d;
    const CW = 1024, CH = Math.round(1024 * D / W);
    const hand = a.drawing === 'sketch';
    const weightAt: [number, number] = [W * 0.33, -D * 0.27];
    let faultPx: [number, number] = [CW / 2, CH / 2];

    // ---- The drawing.
    const canvas = document.createElement('canvas');
    canvas.width = CW; canvas.height = CH;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = st.paper; ctx.fillRect(0, 0, CW, CH);
    ctx.save(); ctx.strokeStyle = a.drawing === 'blueprint' ? 'rgba(245,250,255,.2)' : 'rgba(80,115,145,.18)'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1;
    if (a.grid === 'squares') { for (let x=25;x<CW;x+=32) { ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,CH);ctx.stroke(); } for (let y=25;y<CH;y+=32) { ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(CW,y);ctx.stroke(); } }
    if (a.grid === 'dots') for (let x=25;x<CW;x+=26) for (let y=25;y<CH;y+=26) { ctx.beginPath();ctx.arc(x,y,1.6,0,Math.PI*2);ctx.fill(); }
    if (a.grid === 'zones') { ctx.strokeRect(8,8,CW-16,CH-16);ctx.font='bold 12px monospace'; for(let i=1;i<=8;i++){const x=i*CW/9;ctx.fillText(String(i),x,19);ctx.fillText(String(i),x,CH-9);ctx.beginPath();ctx.moveTo(x,8);ctx.lineTo(x,30);ctx.moveTo(x,CH-8);ctx.lineTo(x,CH-30);ctx.stroke();} }
    ctx.restore();
    if (hand) { ctx.strokeStyle = 'rgba(80,120,170,0.45)'; ctx.lineWidth = 1.5; for (let y = 60; y < CH; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); } ctx.strokeStyle = 'rgba(200,60,60,0.5)'; ctx.beginPath(); ctx.moveTo(90, 0); ctx.lineTo(90, CH); ctx.stroke(); }
    const j = () => (hand ? (random() - 0.5) * 7 : 0);
    ctx.strokeStyle = st.ink; ctx.fillStyle = st.ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const lw = a.drawing === 'tracing' ? 3 : 4.2;
    ctx.lineWidth = lw;
    const line = (...pts: number[]) => { ctx.beginPath(); for (let i = 0; i < pts.length; i += 2) { const x = pts[i] + j(), y = pts[i + 1] + j(); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); };
    const dot = (x: number, y: number) => { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); };
    const text = (t: string, x: number, y: number, size = 17) => { ctx.font = `${hand ? 'italic ' : 'bold '}${size}px monospace`; ctx.fillText(t, x + j(), y + j()); };
    const resistor = (x: number, y1: number, y2: number, label: string) => {
      const mid = (y1 + y2) / 2, pts = [x, y1, x, mid - 30];
      if (a.resistorForm !== 'zigzag') {
        line(x,y1,x,mid-28);line(x,mid+28,x,y2);
        const width=a.resistorForm==='vintage'?12:20;
        if(a.resistorForm==='filled')ctx.fillRect(x-width/2,mid-28,width,56);else ctx.strokeRect(x-width/2,mid-28,width,56);
        if(a.resistorForm==='vintage')line(x-9,mid,x+9,mid);
        text(label,x+16,mid+6,15);return;
      }
      for (let i = 0; i < 6; i++) pts.push(x + (i % 2 ? -10 : 10), mid - 25 + i * 10);
      pts.push(x, mid + 30, x, y2); line(...pts); text(label, x + 16, mid + 6, 15);
    };
    const cap = (x1: number, x2: number, y: number, label: string) => { const m = (x1 + x2) / 2; line(x1, y, m - 6, y); line(m - 6, y - 16, m - 6, y + 16); line(m + 6, y - 16, m + 6, y + 16); line(m + 6, y, x2, y); text(label, m - 12, y - 22, 15); };
    const ground = (x: number, y: number) => { line(x, y, x, y + 12); line(x - 16, y + 12, x + 16, y + 12); line(x - 10, y + 19, x + 10, y + 19); line(x - 4, y + 26, x + 4, y + 26); };
    const left = hand ? 120 : 70, right = a.drawing === 'manual' ? CW * 0.7 : CW - 70, top = 90, bottom = CH - 110, mid = (top + bottom) / 2;
    const stages = 2 + Math.round(a.stages * 3);
    const span = (right - left - 160) / stages;
    line(left + 40, top, right - 60, top); text('HT+', right - 56, top + 6);
    line(left + 40, bottom, right - 60, bottom);
    ground(left + 60, bottom);
    // Aerial and tuned circuit on the way in.
    line(left, mid - 120, left, mid - 60); line(left - 18, mid - 120, left, mid - 96, left + 18, mid - 120); line(left - 18, mid - 120, left + 18, mid - 120);
    ctx.beginPath(); for (let i = 0; i < 4; i++) ctx.arc(left, mid - 48 + i * 24, 12, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    line(left, mid + 36, left, bottom);
    const nodes: [number, number][] = [];
    for (let i = 0; i < stages; i++) {
      const x = left + 110 + span * (i + 0.5), r = Math.min(46,span*.33);
      ctx.beginPath(); ctx.arc(x + j(), mid + j(), r, 0, 7); ctx.stroke();
      line(x - 24, mid - 22, x + 24, mid - 22); line(x, mid - 22, x, top + 110);
      ctx.setLineDash([9, 7]); line(x - 26, mid, x + 26, mid); ctx.setLineDash([]);
      line(x - 22, mid + 22, x + 22, mid + 22); line(x, mid + 22, x, mid + 60);
      line(x - r - 40, mid, x - 26, mid);
      resistor(x, top, top + 110, `R${i * 3 + 1}`); resistor(x, mid + 60, bottom, `R${i * 3 + 2}`);
      dot(x, top); dot(x, bottom); dot(x, top + 110);
      text(`V${i + 1}`, x + r - 6, mid - r + 2, 20);
      if (i < stages - 1) cap(x, x + span - r - 40, top + 110, `C${i + 2}`);
      if (i === 0) line(left + 12, mid - 12, x - r - 40, mid - 12, x - r - 40, mid);
      else line(x - r - 40, top + 110, x - r - 40, mid);
      resistor(x - r - 40, mid, bottom, `R${i * 3 + 3}`); dot(x - r - 40, mid);
      nodes.push([x, mid], [x, top + 55], [x, (mid + 60 + bottom) / 2], [x - r - 40, (mid + bottom) / 2]);
      if (i === stages - 1) {
        // Output transformer and loudspeaker.
        const sx = Math.min(right - 30, x + r + 70);
        line(x, top + 110, sx - 20, top + 110);
        ctx.beginPath(); for (let k = 0; k < 3; k++) ctx.arc(sx - 20, top + 128 + k * 24, 12, -Math.PI / 2, Math.PI / 2, true); ctx.stroke();
        line(sx - 4, top + 112, sx - 4, top + 190); line(sx + 2, top + 112, sx + 2, top + 190);
        ctx.beginPath(); for (let k = 0; k < 3; k++) ctx.arc(sx + 22, top + 128 + k * 24, 12, Math.PI / 2, -Math.PI / 2, true); ctx.stroke();
        line(sx + 22, top + 188, sx + 22, mid + 60); line(sx + 8, mid + 60, sx + 36, mid + 60, sx + 50, mid + 90, sx - 6, mid + 90, sx + 8, mid + 60);
        text('LS', sx + 30, mid + 52, 15);
      }
    }
    if (a.drawing === 'blueprint' || a.drawing === 'schematic' || a.drawing === 'tracing') {
      ctx.lineWidth = lw + 1; ctx.strokeRect(22, 22, CW - 44, CH - 44); ctx.lineWidth = lw;
      ctx.strokeRect(CW - 330, CH - 96, 308, 74); line(CW - 330, CH - 60, CW - 22, CH - 60);
      text('RECEIVER TYPE 5A', CW - 316, CH - 70, 19); text('DRG No 1147  SHT 2', CW - 316, CH - 36, 16);
    } else if (a.drawing === 'manual') {
      text('SERVICE DATA  MODEL 5A', 60, 54, 26);
      const tx = CW * 0.72;
      ctx.strokeRect(tx, 80, CW - tx - 40, CH - 150);
      for (let i = 0; i < 15; i++) { const y = 110 + i * ((CH - 190) / 15); line(tx, y + 8, CW - 40, y + 8); text(`${i < 9 ? 'R' : 'C'}${i + 1}  ${['47k', '1M', '220', '0.1', '470k', '22k', '8mF'][Math.floor(random() * 7)]}`, tx + 12, y, 15); }
    } else text('rx  front end ??', 110, 50, 24);
    // Transparent highlighter follows the wiring instead of covering the diagram.
    if(a.route!=='none') {
      ctx.save();ctx.globalAlpha=.3;ctx.strokeStyle=a.drawing==='blueprint'?'#fff178':a.route==='supply'?'#e88346':a.route==='return'?'#62a0da':'#d6be28';ctx.lineWidth=18;ctx.lineJoin='round';ctx.beginPath();
      const ry=a.route==='supply'?top:a.route==='return'?bottom:top+110;
      ctx.moveTo(left+40,ry);ctx.lineTo(right-60,ry);
      if(a.route==='supply')for(let i=0;i<stages;i++){const x=left+110+span*(i+.5);ctx.moveTo(x,top);ctx.lineTo(x,top+110);}
      if(a.route==='signal'){ctx.moveTo(left,mid-60);ctx.lineTo(left+70,mid-60);ctx.lineTo(left+70,ry);}
      if(a.route==='return'){ctx.moveTo(left+60,bottom);ctx.lineTo(left+60,bottom+28);}
      ctx.stroke();ctx.restore();
    }
    if(a.revision!=='none') {
      ctx.save();ctx.textAlign='left';ctx.font='bold 19px monospace';
      if(a.revision==='strip'){ctx.fillStyle='#f4e1ab';ctx.fillRect(35,CH-61,310,38);ctx.fillStyle='#593d27';ctx.fillText('REV B — R4 / C2 CHECKED',45,CH-36);}
      if(a.revision==='stamp'){ctx.strokeStyle=ctx.fillStyle=a.drawing==='blueprint'?'#f0d9bd':'#9b3a34';ctx.lineWidth=3;ctx.strokeRect(310,31,215,38);ctx.fillText('CHECKED • REV 3',322,57);}
      if(a.revision==='correction'){ctx.fillStyle='#f5efdc';ctx.fillRect(left+62,mid+80,139,43);ctx.fillStyle='#bc3226';ctx.fillText('R2 → 220k',left+72,mid+108);}
      ctx.restore();
    }
    // Fold shading.
    const creaseXs = a.folds > 0.66 ? [0.25, 0.5, 0.75] : a.folds > 0.2 ? [0.5] : [];
    const creaseZs = a.folds > 0.45 ? [0.5] : [];
    ctx.lineWidth = 3;
    for (const u of creaseXs) { ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.moveTo(u * CW, 0); ctx.lineTo(u * CW, CH); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(u * CW + 3, 0); ctx.lineTo(u * CW + 3, CH); ctx.stroke(); }
    for (const v of creaseZs) { ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.moveTo(0, v * CH); ctx.lineTo(CW, v * CH); ctx.stroke(); }
    // Stains.
    if (a.stains === 'coffee') {
      for (let i = 0; i < 2 + Math.floor(random() * 3); i++) { const x = 120 + random() * (CW - 240), y = 100 + random() * (CH - 200); ctx.strokeStyle = `rgba(110,65,25,${0.35 + random() * 0.25})`; ctx.lineWidth = 7 + random() * 5; ctx.beginPath(); ctx.arc(x, y, 62, random() * 3, random() * 3 + 4.6); ctx.stroke(); ctx.fillStyle = 'rgba(120,75,30,0.09)'; ctx.beginPath(); ctx.arc(x, y, 60, 0, 7); ctx.fill(); }
    } else if (a.stains === 'scorch') {
      const x = CW * (0.25 + random() * 0.2), y = CH * (0.6 + random() * 0.2), g = ctx.createRadialGradient(x, y, 4, x, y, 70);
      g.addColorStop(0, 'rgba(15,10,8,0.95)'); g.addColorStop(0.3, 'rgba(70,35,12,0.8)'); g.addColorStop(1, 'rgba(120,70,20,0)');
      ctx.fillStyle = g; ctx.save(); ctx.translate(x, y); ctx.rotate(0.6); ctx.scale(1.8, 0.6); ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); ctx.translate(-x, -y); ctx.restore();
      ctx.save(); ctx.translate(x, y); ctx.rotate(0.6); ctx.scale(1.8, 0.6); const g2 = ctx.createRadialGradient(0, 0, 4, 0, 0, 70); g2.addColorStop(0, 'rgba(15,10,8,0.95)'); g2.addColorStop(0.3, 'rgba(70,35,12,0.8)'); g2.addColorStop(1, 'rgba(120,70,20,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); ctx.fill(); ctx.restore();
    } else if (a.stains === 'flux') {
      for (let i = 0; i < 14; i++) { ctx.fillStyle = `rgba(190,140,30,${0.15 + random() * 0.25})`; ctx.beginPath(); ctx.ellipse(random() * CW, random() * CH, 8 + random() * 30, 6 + random() * 22, random() * 3, 0, 7); ctx.fill(); }
    } else if (a.stains === 'torn') {
      ctx.fillStyle = '#00000000'; ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.moveTo(0, CH); ctx.lineTo(0, CH - 150); for (let i = 1; i <= 8; i++) ctx.lineTo(i * 22, CH - 150 + i * 19 + (random() - 0.5) * 18); ctx.lineTo(176, CH); ctx.fill(); ctx.restore();
      ctx.fillStyle = 'rgba(214,190,110,0.7)'; ctx.save(); ctx.translate(150, CH - 170); ctx.rotate(-0.75); ctx.fillRect(-120, -20, 240, 40); ctx.restore();
    }
    if (mood.wear > 0.5) { ctx.fillStyle = `rgba(120,95,50,${(mood.wear - 0.5) * 0.35})`; ctx.fillRect(0, 0, CW, CH); }
    // Hand annotations: blue biro and pencil first, red last.
    const scribbles = Math.round(a.notes * a.notes * 26 + a.notes * 4);
    const jot = ['250V', '92V', '1.4V', 'OK', '?', 'low!', 'o/c?', 'hum', 'chk', '6.3~', 'new', 'leaky'];
    for (let i = 0; i < scribbles; i++) {
      const x = 60 + random() * (CW - 160), y = 60 + random() * (CH - 100);
      ctx.fillStyle = ctx.strokeStyle = a.drawing === 'blueprint' ? (i % 2 ? '#ffe98a' : '#ffffff') : i % 3 ? '#27408a' : '#3a3a3a';
      ctx.save(); ctx.translate(x, y); ctx.rotate((random() - 0.5) * 0.5); ctx.font = `italic ${18 + Math.floor(random() * 12)}px monospace`; ctx.fillText(jot[Math.floor(random() * jot.length)], 0, 0);
      if (random() < 0.4) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 6); ctx.quadraticCurveTo(30, 26, 60 + random() * 30, 8 + random() * 30); ctx.stroke(); }
      ctx.restore();
    }
    const redInk = a.drawing === 'blueprint' ? '#ff5a48' : '#d0201a';
    ctx.strokeStyle = ctx.fillStyle = redInk; ctx.lineWidth = 9;
    const circle = (x: number, y: number, r: number) => { for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.ellipse(x + (random() - 0.5) * 6, y + (random() - 0.5) * 6, r * (1 + random() * 0.15), r * (0.8 + random() * 0.15), random() * 0.6, 0.3, 6.6); ctx.stroke(); } };
    const pickNode = () => nodes[Math.floor(random() * nodes.length)];
    faultPx = pickNode();
    if (a.fault === 'found' || a.fault === 'solved') {
      circle(faultPx[0], faultPx[1], 58);
      if (a.fault === 'found') { ctx.beginPath(); ctx.moveTo(faultPx[0] + 150, faultPx[1] - 120); ctx.lineTo(faultPx[0] + 62, faultPx[1] - 48); ctx.moveTo(faultPx[0] + 62, faultPx[1] - 48); ctx.lineTo(faultPx[0] + 96, faultPx[1] - 52); ctx.moveTo(faultPx[0] + 62, faultPx[1] - 48); ctx.lineTo(faultPx[0] + 70, faultPx[1] - 82); ctx.stroke(); ctx.font = 'italic bold 34px monospace'; ctx.fillText('HERE!', faultPx[0] + 120, faultPx[1] - 128); ctx.beginPath(); ctx.moveTo(faultPx[0] + 118, faultPx[1] - 118); ctx.lineTo(faultPx[0] + 230, faultPx[1] - 122); ctx.stroke(); }
      else { ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(faultPx[0] - 40, faultPx[1]); ctx.lineTo(faultPx[0] - 8, faultPx[1] + 40); ctx.lineTo(faultPx[0] + 80, faultPx[1] - 80); ctx.stroke(); }
    } else if (a.fault === 'hunting') {
      for (let i = 0; i < 4; i++) { const n = i === 3 ? faultPx : pickNode(); circle(n[0], n[1], 50); if (i < 3) { ctx.beginPath(); ctx.moveTo(n[0] - 44, n[1] - 40); ctx.lineTo(n[0] + 44, n[1] + 40); ctx.moveTo(n[0] + 44, n[1] - 40); ctx.lineTo(n[0] - 44, n[1] + 40); ctx.stroke(); } }
    } else {
      ctx.font = 'italic bold 60px monospace';
      for (let i = 0; i < 4; i++) { const n = pickNode(); ctx.fillText('?', n[0] + 30 + random() * 30, n[1] - 20 + random() * 30); }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;

    // ---- The sheet, creased and curled.
    const geo = new THREE.PlaneGeometry(W, D, 64, 44);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const curl = 0.007 * a.folds + 0.005 * mood.wear;
    const lift = (x: number, z: number) => {
      let y = 0;
      creaseXs.forEach((u, i) => { y += (i % 2 ? 0.5 : 1) * 0.007 * a.folds * Math.max(0, 1 - Math.abs(x / W + 0.5 - u) / 0.09); });
      creaseZs.forEach((v) => { y += 0.008 * a.folds * Math.max(0, 1 - Math.abs(z / D + 0.5 - v) / 0.12); });
      y += curl * Math.pow(Math.abs(x) / (W / 2), 3) * Math.pow(Math.abs(z) / (D / 2), 3) * 3;
      y += Math.sin(x * 37 + z * 21) * 0.0006 * a.folds;
      const near = Math.min(1, Math.hypot(x - weightAt[0], z - weightAt[1]) / 0.1);
      return 0.0012 + y * near * near;
    };
    for (let i = 0; i < pos.count; i++) pos.setY(i, lift(pos.getX(i), pos.getZ(i)));
    geo.computeVertexNormals();
    const sheet = s.mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, side: THREE.DoubleSide, transparent: a.stains === 'torn', alphaTest: a.stains === 'torn' ? 0.5 : 0 }));
    sheet.rotation.y = (random() - 0.5) * 0.12;
    const on = (x: number, z: number, h = 0): P => [x, lift(x, z) + h, z];
    const group = new Sculpture(context);
    group.root.rotation.y = sheet.rotation.y;
    s.root.add(group.root);
    if (a.drawing === 'tracing') for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const t = group.box([0.045, 0.0006, 0.016], on(sx * (W / 2 - 0.006), sz * (D / 2 - 0.006), 0.0008), s.material('#d9c98a', { roughness: 0.9 })); t.rotation.y = sx * sz * 0.78; }

    // ---- The weight.
    const [wx, wz] = weightAt;
    const puffs: THREE.Mesh[] = [];
    if (a.weight === 'pliers') {
      const steel = s.material('#8f9598', { metalness: 0.8, roughness: 0.35 });
      const grip = s.material(mood.cheer > 0.5 ? '#d8a11c' : '#b8302a', { roughness: 0.5 });
      const pl = new Sculpture(context);
      for (const side of [-1, 1]) {
        pl.rod([0, 0.007, 0], [side * 0.004, 0.006, -0.055], 0.004, steel, 0.0018);
        pl.tube([[0, 0.007, 0], [side * 0.012, 0.007, 0.03], [side * 0.02, 0.006, 0.1]], 0.0035, steel);
        pl.tube([[side * 0.013, 0.007, 0.035], [side * 0.02, 0.006, 0.1]], 0.0055, grip);
      }
      pl.cylinder(0.007, 0.007, 0.01, [0, 0.007, 0], steel, 12);
      pl.root.position.set(wx - 0.02, 0.0015, wz + 0.03); pl.root.rotation.y = 0.9 + random() * 0.6;
      group.root.add(pl.root);
    } else if (a.weight === 'valve') {
      const v = new Sculpture(context);
      v.cylinder(0.0155, 0.0155, 0.02, [0, 0.01, 0], s.material('#3a2418', { roughness: 0.35 }), 14);
      v.lathe([[0.012, 0], [0.0125, 0.02], [0.021, 0.04], [0.021, 0.058], [0.013, 0.076], [0.0001, 0.085]], s.material('#cdc8b6', { roughness: 0.6 }), [0, 0.018, 0]);
      for (let i = 0; i < 6; i++) { const t = i / 6 * 6.28; v.cylinder(0.001, 0.001, 0.012, [Math.cos(t) * 0.008, -0.004, Math.sin(t) * 0.008], s.material('#c5c9ca', { metalness: 0.8 }), 5); }
      v.root.rotation.set(0, random() * 3, Math.PI / 2);
      v.root.position.set(wx + 0.03, 0.023, wz);
      group.root.add(v.root);
    } else {
      const enamel = a.weight === 'enamel';
      const colour = enamel ? '#f1f0e8' : mood.cheer > 0.6 ? '#d8a11c' : mood.cheer > 0.3 ? '#3f6f9a' : '#6a4a3a';
      const body = s.material(colour, { roughness: enamel ? 0.25 : 0.4, side: THREE.DoubleSide });
      const R = 0.041, H = 0.09;
      group.lathe([[0, 0.004], [R * 0.92, 0.004], [R * 0.94, 0], [R, 0.004], [R, H], [R - 0.004, H], [R - 0.005, 0.008], [0, 0.008]], body, [wx, 0.0015, wz]);
      const handle = group.ring(0.026, 0.006, [wx + R + 0.008, 0.0015 + H * 0.52, wz], body, Math.PI);
      handle.rotation.z = -Math.PI / 2;
      if (enamel) { group.ring(R - 0.001, 0.003, [wx, 0.0015 + H, wz], s.material('#1f3f8a', { roughness: 0.3 })).rotation.x = Math.PI / 2; group.ball([0.008, 0.01, 0.002], [wx + 0.01, 0.03, wz + R], s.material('#2a2622'), 8); }
      else if (mood.cheer <= 0.6) group.cylinder(R + 0.0006, R + 0.0006, 0.012, [wx, 0.0015 + H * 0.7, wz], s.material('#efe9d8', { roughness: 0.4 }), 28);
      const hot = a.weight === 'hot';
      const level = hot ? H * 0.84 : H * 0.45;
      group.cylinder(R - 0.005, R - 0.005, 0.002, [wx, 0.0015 + level, wz], s.material(hot ? '#a8642a' : '#2a180e', { roughness: 0.15 }), 28);
      if (!hot) group.ring(R - 0.0055, 0.0015, [wx, 0.0015 + H * 0.7, wz], s.material('#4a2c16', { roughness: 0.6 })).rotation.x = Math.PI / 2;
      if (hot) {
        const steam = new THREE.MeshStandardMaterial({ color: '#c2c8cf', transparent: true, opacity: 0.38, depthWrite: false, roughness: 1 });
        for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), steam); group.root.add(m); puffs.push(m); }
      }
      handle.rotation.y = 0;
      const turn = random() * 6.28;
      handle.position.set(wx + Math.cos(turn) * (R + 0.008), 0.0015 + H * 0.52, wz - Math.sin(turn) * (R + 0.008));
      handle.rotation.set(0, turn, -Math.PI / 2, 'YXZ');
    }

    // ---- Pencil and other tools.
    const fx = THREE.MathUtils.clamp((faultPx[0] / CW - 0.5) * W + 0.06, -W / 2 + 0.05, W / 2 - 0.12), fz = THREE.MathUtils.clamp((faultPx[1] / CH - 0.5) * D + 0.05, -D / 2 + 0.03, D / 2 - 0.02);
    const pencil = new Sculpture(context);
    pencil.cylinder(0.0036, 0.0036, 0.13, [0.065, 0, 0], s.material('#c8261e', { roughness: 0.4 }), 6).rotation.z = Math.PI / 2;
    pencil.cylinder(0.0036, 0.0004, 0.014, [-0.007, 0, 0], s.material('#d9b98a'), 6).rotation.z = Math.PI / 2;
    pencil.cylinder(0.0012, 0.0002, 0.005, [-0.0125, 0, 0], s.material('#b01a14'), 6).rotation.z = Math.PI / 2;
    pencil.cylinder(0.0037, 0.0037, 0.008, [0.134, 0, 0], s.material('#c9a53a', { metalness: 0.7, roughness: 0.3 }), 8).rotation.z = Math.PI / 2;
    pencil.root.position.set(...on(fx, fz, 0.0045));
    pencil.root.rotation.y = -0.3 - random() * 0.5;
    group.root.add(pencil.root);
    if (a.tools === 'set') {
      const rule = group.box([0.2, 0.0012, 0.022], on(-W * 0.12, D * 0.36, 0.006), s.material('#c5c9ca', { metalness: 0.85, roughness: 0.3 }));
      rule.rotation.y = 0.08 + random() * 0.15;
      const eraser = group.box([0.034, 0.01, 0.018], on(-W * 0.36, -D * 0.2, 0.006), s.material('#e9e4d8', { roughness: 0.9 }));
      eraser.rotation.y = random() * 2;
      group.box([0.014, 0.0104, 0.0184], on(-W * 0.36, -D * 0.2, 0.006), s.material('#3f6f9a', { roughness: 0.8 })).rotation.y = eraser.rotation.y;
    } else if (a.tools === 'loupe') {
      const lx = -W * 0.3, lz = D * 0.2;
      group.ring(0.027, 0.003, on(lx, lz, 0.02), s.material('#1f2022', { roughness: 0.4 })).rotation.x = Math.PI / 2;
      const glass = group.cylinder(0.027, 0.027, 0.002, on(lx, lz, 0.02), new THREE.MeshStandardMaterial({ color: '#bfe2f2', transparent: true, opacity: 0.35, roughness: 0.03, depthWrite: false }), 24);
      glass.castShadow = false;
      for (const t of [0.6, 2.7, 4.6]) group.rod(on(lx + Math.cos(t) * 0.027, lz + Math.sin(t) * 0.027, 0.02), on(lx + Math.cos(t) * 0.034, lz + Math.sin(t) * 0.034, 0.001), 0.002, s.material('#1f2022'));
    }
    const shavings = [];
    for (let i = 0; i < Math.floor(mood.density * 10); i++) shavings.push({ at: on((random() - 0.5) * W * 0.9, (random() - 0.5) * D * 0.9, 0.001), size: 0.6 + random() });
    if (shavings.length) s.scatter(new THREE.TetrahedronGeometry(0.003, 0), s.material('#d9b98a', { roughness: 1 }), shavings);

    const rate = mix(0.1, 0.4, mood.energy), phase = random() * 6;
    const drift = (time: number) => puffs.forEach((m, i) => {
      const t = (i / puffs.length + time * rate) % 1;
      m.position.set(wx + Math.sin(t * 6 + phase + i) * 0.012 * (0.4 + t), 0.085 + t * 0.11, wz + Math.cos(t * 5 + phase + i * 2) * 0.01 * (0.4 + t));
      m.scale.setScalar((0.007 + t * 0.014) * (1 - t * 0.3));
    });
    drift(0);
    // Raise the complete drawing and its resting tools together onto the paper stack.
    const stackH={single:0,offsets:.003,pad:.012,board:.018}[a.stack];
    if(stackH) {
      for(const child of s.root.children)child.position.y+=stackH;
      const support=s.material(a.stack==='board'?'#a17e50':'#e9e1cd',{roughness:.9});
      if(a.stack==='offsets')for(let i=0;i<3;i++){const page=s.box([W,.001,D],[.006*(i-1),.0005+i*.001,.004*(i-1)],support);page.rotation.y=sheet.rotation.y+(i-1)*.025;}
      else {const base=s.box([W+.018,stackH,D+.018],[0,stackH/2,0],support);base.rotation.y=sheet.rotation.y;}
      if(a.stack==='pad')s.box([W+.018,.006,.014],[0,stackH-.002,-D/2],s.material('#383d43'));
      if(a.stack==='board') {
        const clip=s.material('#939b9f',{metalness:.85,roughness:.3});
        s.box([.075,.007,.025],[0,stackH+.004,-D/2+.004],clip);
        s.ring(.014,.002,[0,stackH+.006,-D/2-.013],clip).rotation.x=-Math.PI/2;
      }
    }
    if(a.reference!=='none') {
      const rc=document.createElement('canvas');rc.width=256;rc.height=160;const r=rc.getContext('2d')!;
      r.fillStyle='#f3e8cb';r.fillRect(0,0,256,160);r.strokeStyle=r.fillStyle='#313b42';r.lineWidth=3;r.font='bold 19px monospace';
      if(a.reference==='pins'){r.fillText('VALVE BASE',25,26);r.beginPath();r.arc(128,94,43,0,Math.PI*2);r.stroke();for(let i=0;i<8;i++){const t=i*Math.PI/4;const x=128+Math.sin(t)*35,y=94+Math.cos(t)*35;r.beginPath();r.arc(x,y,4,0,7);r.fill();}}
      if(a.reference==='voltages'){r.fillText('TEST POINTS',20,26);for(let i=0;i<4;i++){r.strokeRect(20,42+i*27,13,13);r.fillText(['HT  250 V','V1   92 V','V2  108 V','H    6.3 V'][i],45,55+i*27);}}
      if(a.reference==='values'){r.fillText('BAND VALUES',20,26);const colours=['#38281c','#b33522','#dd9632','#d8c746','#468461','#557aa2'];for(let i=0;i<6;i++){r.fillStyle=colours[i];r.fillRect(20+i*36,48,24,70);r.fillStyle='#313b42';r.fillText(String(i+1),24+i*36,145);}}
      const rt=new THREE.CanvasTexture(rc);rt.colorSpace=THREE.SRGBColorSpace;
      const card=s.mesh(new THREE.PlaneGeometry(.13,.081),new THREE.MeshStandardMaterial({map:rt,roughness:.9,side:THREE.DoubleSide}),[-W*.18,.0015,D/2+.055]);card.rotation.set(-Math.PI/2,0,-.07);
    }
    return s.finish({ update: puffs.length ? (_dt, time) => drift(time) : undefined });
  },
});
