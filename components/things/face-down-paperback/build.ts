import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const GENRES = {
  romance: 'A romance: hot pink and crimson with a big heart and swooning script.',
  pulp: 'A pulp thriller: lurid yellow, a black silhouette in a hat, shouting red letters.',
  poetry: 'A slim poetry collection: plain cream with a thin border and a small sprig.',
  scifi: 'Science fiction: deep blue space, a ringed planet and a rocket.',
  western: 'A western: orange sky, mesas and a cactus.',
  mystery: 'A murder mystery: dark green with a glowing keyhole.',
  classic: 'A classic in three plain bands, orange-cream-orange, a school or commuter book.',
} as const;
const TITLES: Record<keyof typeof GENRES, string[][]> = {
  romance: [['SUMMER\'S', 'PROMISE'], ['THE DUKE\'S', 'LETTER'], ['ONE WILD', 'SEASON']],
  pulp: [['THE LONG', 'DROP'], ['KISS ME', 'TWICE'], ['NO EXIT', 'ALLEY']],
  poetry: [['collected', 'poems'], ['small', 'hours'], ['field', 'notes']],
  scifi: [['STARFALL'], ['THE LAST', 'ORBIT'], ['IRON', 'MOON']],
  western: [['DUST', 'RIDERS'], ['RED MESA'], ['THE LONG', 'TRAIL']],
  mystery: [['A QUIET', 'POISON'], ['THE NINTH', 'GUEST'], ['DEAD', 'RECKONING']],
  classic: [['GREAT', 'EXPECTATIONS'], ['MIDDLE', 'MARCH'], ['THE WAVES']],
};
const BASE: Record<keyof typeof GENRES, string> = { romance: '#d8346a', pulp: '#f2c61f', poetry: '#efe8d2', scifi: '#14204a', western: '#e8873a', mystery: '#16382c', classic: '#ee7a1c' };

export default defineThing({
  questions: {
    format: choice('What size of paperback is it?',{pocket:'A small pocket paperback.',standard:'An ordinary mass-market paperback.',trade:'A taller trade paperback.',large:'A broad large-format paperback.'}),
    finish: choice('How is the printed cover finished?',{matte:'Soft matte paper with little reflection.',gloss:'A glossy coated cover catches the light.',textured:'Fine cross-grain texture covers the printed jacket.',faded:'Sun-faded ink softens the whole cover.'}),
    paper: choice('What colour are the page edges?',{cream:'Warm cream paper.',white:'Bright white pages.',yellow:'Yellowed old book paper.',tinted:'Muted green tinted page edges.'}),
    provenance: choice('What evidence of ownership is on the cover?',{new:'A small new-edition seal.',library:'A library label and lending-date panel.',used:'A small secondhand-shop price sticker.',gift:'A pale gift inscription label inside a drawn frame.'}),
    spine: choice('What condition is the bent spine in?',{smooth:'A smooth barely creased spine.',creased:'Many narrow pale reading creases.',taped:'A broad strip of cloudy repair tape.',sewn:'Several visible repair stitches bridge the spine.'}),
    readingAid: choice('What reading accessory lies nearby?',{ruler:'A narrow transparent reading ruler.',magnifier:'A small handled magnifying glass.',case:'A folded cloth spectacle case.',note:'A small handwritten reading note.'}),
    genre: choice('What kind of book is it, judging by the cover?', GENRES),
    progress: score('How far through is the reader?', ['Barely started', 'A third in', 'Halfway', 'Nearly finished']),
    eyewear: choice('What is resting on the book?', {
      none: 'Nothing.',
      wayfarer: 'Chunky black sunglasses.',
      aviator: 'Gold wire aviators with teardrop lenses.',
      round: 'Small round tinted glasses, bookish and a bit hippy.',
      cateye: 'Red cat-eye sunglasses, glamorous.',
      hearts: 'Pink heart-shaped sunglasses, playful or teenage.',
      reading: 'Clear half-moon reading glasses, an older reader.',
    }),
    marker: choice('What marks an earlier page, poking out of the book?', {
      flower: 'A pressed flower, flat and faded.',
      ribbon: 'A length of red ribbon.',
      ticket: 'A train or cinema ticket.',
      feather: 'A found feather.',
      photo: 'The corner of a photograph.',
      grass: 'A blade of grass, picked up where the reader lay.',
      none: 'Nothing: the pages are just dog-eared.',
    }),
    beside: choice('What has been left beside it?', {
      nothing: 'Nothing.',
      pencil: 'A stub of pencil for underlining.',
      apple: 'An apple with a few bites out of it.',
      cherries: 'A handful of cherries and their stones.',
      shells: 'A few shells and a pebble, beach finds.',
    }),
    stacked: noul('Is it lying on top of another, closed book?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [w,d]={pocket:[.092,.148],standard:[.108,.178],trade:[.125,.205],large:[.145,.22]}[a.format];
    const cover = 0.0018, thickness = a.genre === 'poetry' ? 0.014 : mix(0.024, 0.036, random());
    const base = BASE[a.genre];
    const title = TITLES[a.genre][Math.floor(random() * 3)];
    const author = ['M. HALE', 'R. QUILL', 'J. ASHBY', 'D. MARLOWE', 'E. VANCE'][Math.floor(random() * 5)];

    // The whole jacket: back cover, spine, front cover, left to right.
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 384;
    const ctx = canvas.getContext('2d')!;
    const BW = 236, SX = 236, SW = 40, FX = 276, H = 384;
    const ink = { romance: '#fff4e6', pulp: '#c8161d', poetry: '#3a3327', scifi: '#f6e27a', western: '#3a1c0c', mystery: '#e9c46a', classic: '#1d1a17' }[a.genre];
    ctx.fillStyle = base; ctx.fillRect(0, 0, 512, H);
    ctx.save(); ctx.translate(FX, 0);
    const lines = (font: string, y: number, step: number) => { ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.font = font; title.forEach((line, i) => ctx.fillText(line, BW / 2, y + i * step, BW - 24)); };
    if (a.genre === 'romance') {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f48aa8'); g.addColorStop(1, '#a8123e'); ctx.fillStyle = g; ctx.fillRect(0, 0, BW, H);
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(BW / 2, 250, 70, 0, 7); ctx.fill();
      ctx.fillStyle = '#c0143c'; ctx.beginPath(); ctx.moveTo(BW / 2, 330); ctx.bezierCurveTo(10, 250, 50, 150, BW / 2, 215); ctx.bezierCurveTo(BW - 50, 150, BW - 10, 250, BW / 2, 330); ctx.fill();
      lines('italic bold 40px Georgia, serif', 70, 44);
    } else if (a.genre === 'pulp') {
      ctx.fillStyle = '#15120f'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(BW, 190); ctx.lineTo(BW, H); ctx.fill();
      ctx.beginPath(); ctx.arc(150, 215, 26, 0, 7); ctx.fill(); ctx.fillRect(108, 196, 84, 9); ctx.fillRect(128, 172, 44, 28);
      ctx.beginPath(); ctx.moveTo(150, 235); ctx.lineTo(215, H); ctx.lineTo(85, H); ctx.fill();
      ctx.fillStyle = '#c8161d'; ctx.beginPath(); ctx.arc(40, 330, 16, 0, 7); ctx.fill();
      lines('bold 46px Impact, "Arial Black", sans-serif', 66, 48);
    } else if (a.genre === 'poetry') {
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.strokeRect(16, 16, BW - 32, H - 32); ctx.lineWidth = 1; ctx.strokeRect(22, 22, BW - 44, H - 44);
      ctx.strokeStyle = '#5d7a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(BW / 2, 300); ctx.quadraticCurveTo(BW / 2 + 12, 250, BW / 2 - 6, 210); ctx.stroke();
      ctx.fillStyle = '#6f8f45'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(BW / 2 + (i % 2 ? 16 : -14), 285 - i * 16, 13, 5, i % 2 ? -0.6 : 0.6, 0, 7); ctx.fill(); }
      lines('italic 30px Georgia, serif', 110, 34);
    } else if (a.genre === 'scifi') {
      for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + random() * 0.7})`; ctx.fillRect(random() * BW, random() * H, 1.6, 1.6); }
      ctx.fillStyle = '#e2603a'; ctx.beginPath(); ctx.arc(90, 250, 58, 0, 7); ctx.fill();
      ctx.strokeStyle = '#f3d9a0'; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(90, 250, 96, 22, -0.35, 0, 7); ctx.stroke();
      ctx.fillStyle = '#dfe6ee'; ctx.beginPath(); ctx.moveTo(190, 120); ctx.lineTo(206, 180); ctx.lineTo(174, 180); ctx.fill(); ctx.fillStyle = '#f6a01c'; ctx.beginPath(); ctx.moveTo(180, 182); ctx.lineTo(190, 215); ctx.lineTo(200, 182); ctx.fill();
      lines('bold 40px "Arial Black", Arial, sans-serif', 62, 42);
    } else if (a.genre === 'western') {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f7c35a'); g.addColorStop(0.7, '#e2602a'); ctx.fillStyle = g; ctx.fillRect(0, 0, BW, H);
      ctx.fillStyle = '#fbe7a0'; ctx.beginPath(); ctx.arc(160, 215, 44, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a2f18'; ctx.fillRect(0, 285, BW, 100); ctx.fillRect(20, 225, 70, 70); ctx.fillRect(170, 250, 66, 50);
      ctx.fillStyle = '#23361f'; ctx.fillRect(112, 240, 14, 90); ctx.fillRect(94, 262, 12, 34); ctx.fillRect(94, 290, 30, 10); ctx.fillRect(132, 252, 12, 30); ctx.fillRect(116, 276, 28, 10);
      lines('bold 44px Georgia, serif', 70, 46);
    } else if (a.genre === 'mystery') {
      const g = ctx.createRadialGradient(BW / 2, 240, 10, BW / 2, 240, 170); g.addColorStop(0, '#2f6b4f'); g.addColorStop(1, '#0d2219'); ctx.fillStyle = g; ctx.fillRect(0, 0, BW, H);
      ctx.fillStyle = '#f4d77a'; ctx.beginPath(); ctx.arc(BW / 2, 225, 30, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(BW / 2 - 16, 235); ctx.lineTo(BW / 2 + 16, 235); ctx.lineTo(BW / 2 + 28, 330); ctx.lineTo(BW / 2 - 28, 330); ctx.fill();
      ctx.fillStyle = '#b3161d'; ctx.beginPath(); ctx.ellipse(60, 350, 26, 8, 0, 0, 7); ctx.fill();
      lines('bold 36px Georgia, serif', 70, 40);
    } else {
      ctx.fillStyle = '#f3ecd8'; ctx.fillRect(0, 128, BW, 128);
      ctx.fillStyle = '#1d1a17'; ctx.beginPath(); ctx.ellipse(BW / 2, 318, 26, 34, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#f3ecd8'; ctx.beginPath(); ctx.ellipse(BW / 2, 322, 14, 22, 0, 0, 7); ctx.fill();
      lines('bold 26px Georgia, serif', title.length > 1 ? 180 : 198, 30);
    }
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.font = 'bold 15px Georgia, serif'; ctx.fillText(author, BW / 2, a.genre === 'classic' ? 236 : H - 18, BW - 20);
    ctx.restore();
    // Back cover: blurb lines and a barcode.
    ctx.fillStyle = a.genre === 'classic' ? '#f3ecd8' : 'rgba(255,255,255,0.14)'; ctx.fillRect(20, a.genre === 'classic' ? 128 : 30, BW - 40, a.genre === 'classic' ? 128 : 250);
    ctx.fillStyle = a.genre === 'poetry' || a.genre === 'classic' ? '#4a4338' : 'rgba(255,255,255,0.8)';
    for (let i = 0; i < (a.genre === 'classic' ? 12 : 22); i++) ctx.fillRect(32, (a.genre === 'classic' ? 142 : 46) + i * 10, (BW - 64) * (i % 6 === 5 ? 0.5 : 0.85 + random() * 0.15), 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(140, 312, 76, 50); ctx.fillStyle = '#111';
    for (let i = 0; i < 22; i++) ctx.fillRect(146 + i * 3, 318, 1 + (i * 7) % 2, 38);
    // Ownership marks remain on the visible back cover.
    ctx.save();ctx.translate(26,294);ctx.rotate(-.06);ctx.fillStyle='#eee4c6';
    if(a.provenance==='new'){ctx.beginPath();ctx.arc(28,24,24,0,Math.PI*2);ctx.fill();ctx.fillStyle='#765c35';ctx.font='bold 12px serif';ctx.textAlign='center';ctx.fillText('NEW',28,22);ctx.fillText('EDITION',28,35);}
    else{ctx.fillRect(0,0,88,58);ctx.strokeStyle='#8e7a50';ctx.lineWidth=1.5;ctx.strokeRect(3,3,82,52);ctx.fillStyle='#554d43';ctx.font='12px sans-serif';ctx.textAlign='left';
      if(a.provenance==='library'){ctx.fillText('LENDING COPY',7,16);ctx.font='10px monospace';ctx.fillText('12 OCT',8,32);ctx.fillText('RETURN 26 OCT',8,46);}
      if(a.provenance==='used'){ctx.fillText('OLD BOOKS',8,19);ctx.font='bold 22px serif';ctx.fillText('50¢',20,43);}
      if(a.provenance==='gift'){ctx.font='italic 12px serif';ctx.fillText('For your travels',8,21);ctx.fillText('with love, A.',8,39);}
    }ctx.restore();
    // Spine: darker strip, title running along it, and the white cracks of a book bent back.
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(SX, 0, SW, H);
    ctx.save(); ctx.translate(SX + SW / 2 + 5, H / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.font = 'bold 16px Georgia, serif'; ctx.fillText(title.join(' '), 0, 0, H - 80); ctx.restore();
    const cracks = a.spine==='smooth'?1:a.spine==='creased'?12+Math.round(a.progress*6):4;
    for (let i = 0; i < cracks; i++) { ctx.strokeStyle = `rgba(255,252,240,${0.5 + random() * 0.4})`; ctx.lineWidth = 0.8 + random() * 1.6; ctx.beginPath(); const x = SX + 5 + random() * (SW - 10); ctx.moveTo(x, 0); for (let y = 0; y <= H; y += 48) ctx.lineTo(x + (random() - 0.5) * 3, y); ctx.stroke(); }
    // Wear: scuffed corners, a sun-faded patch, a ring from a glass.
    for (let i = 0; i < mood.wear * 40; i++) { ctx.fillStyle = 'rgba(255,250,235,0.5)'; const edge = random() < 0.5; ctx.fillRect(edge ? random() * 512 : (random() < 0.5 ? 0 : 506), edge ? (random() < 0.5 ? 0 : H - 6) : random() * H, 3 + random() * 14, 3 + random() * 6); }
    if (mood.wear > 0.55) { ctx.strokeStyle = 'rgba(90,60,30,0.45)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(FX + 150, 300, 44, 0, 7); ctx.stroke(); }
    if(a.spine==='taped'){ctx.fillStyle='rgba(239,229,196,.38)';ctx.fillRect(SX-5,0,SW+10,H);ctx.strokeStyle='rgba(255,250,225,.6)';ctx.lineWidth=2;ctx.strokeRect(SX-5,0,SW+10,H);}
    if(a.finish==='textured'){ctx.strokeStyle='rgba(245,235,209,.17)';ctx.lineWidth=1;for(let y=0;y<H;y+=4){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();}ctx.strokeStyle='rgba(39,33,26,.09)';for(let x=0;x<512;x+=5){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}}
    if(a.finish==='faded'){ctx.fillStyle='rgba(238,222,182,.28)';ctx.fillRect(0,0,512,H);}
    const jacket = (offset: number, span: number) => {
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.offset.x = offset; map.repeat.x = span;
      return new THREE.MeshStandardMaterial({map,roughness:a.finish==='gloss'?.15:a.finish==='textured'?.95:.75});
    };
    const pageTint={cream:'#efe6cc',white:'#f5f3ea',yellow:'#d8bf84',tinted:'#b5c49d'}[a.paper];
    const paper=s.material(pageTint,{roughness:.95});const paperEdge=s.material(new THREE.Color(pageTint).multiplyScalar(.89).getStyle(),{roughness:.95});

    const book = new THREE.Group();
    const ridge = thickness + 0.03, spineWidth = Math.max(0.012, thickness * 0.55);
    const leftPages = Math.max(0.002, thickness * a.progress), rightPages = Math.max(0.002, thickness * (1 - a.progress));
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D) => { node.traverse((n) => { n.castShadow = n.receiveShadow = true; }); parent.add(node); return node; };
    const halves: { group: THREE.Group; pages: number; side: number }[] = [];
    for (const [side, pages, offset] of [[-1, leftPages, 0], [1, rightPages, FX / 512]] as const) {
      // Each half hangs from the spine and tilts until its page block rests on the ground.
      const group = new THREE.Group();
      const angle = Math.asin(Math.min(0.9, (ridge - (cover + pages)) / w));
      add(new THREE.Mesh(new THREE.BoxGeometry(w, cover, d), paperEdge), group).position.set(side * w / 2, -cover / 2, 0);
      const art = add(new THREE.Mesh(new THREE.PlaneGeometry(w, d), jacket(offset, BW / 512)), group);
      art.rotation.x = -Math.PI / 2; art.position.set(side * w / 2, 0.0003, 0);
      const block = add(new THREE.Mesh(new THREE.BoxGeometry(w - 0.006, pages, d - 0.004), [paperEdge, paperEdge, paper, paper, paperEdge, paperEdge]), group);
      block.position.set(side * (w / 2 - 0.001), -cover - pages / 2, 0);
      // A curled corner on a well-thumbed book.
      if (mood.wear > 0.4 && side === 1) { const curl = add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.0012, 0.02), paperEdge), group); curl.position.set(w - 0.009, 0.003, d / 2 - 0.009); curl.rotation.set(-0.3, 0, 0.35); }
      group.position.set(side * spineWidth / 2, ridge, 0);
      group.rotation.z = -side * angle;
      book.add(group);
      halves.push({ group, pages, side });
    }
    add(new THREE.Mesh(new THREE.BoxGeometry(spineWidth + 0.002, cover, d), paperEdge), book).position.y = ridge - cover / 2;
    const spine = add(new THREE.Mesh(new THREE.PlaneGeometry(spineWidth + 0.002, d), jacket(SX / 512, SW / 512)), book);
    spine.rotation.x = -Math.PI / 2;
    spine.position.y = ridge + 0.0004;
    add(new THREE.Mesh(new THREE.BoxGeometry(spineWidth, 0.004, d - 0.004), paper), book).position.y = ridge - cover - 0.002;

    if(a.spine==='sewn'){
      const repairs=new Sculpture(context),thread=repairs.material('#d6bd8c');
      for(let i=0;i<6;i++){const z=-d*.38+i*d*.15;repairs.tube([[-spineWidth*.45,ridge+.001,z],[-spineWidth*.2,ridge+.0025,z+.002],[spineWidth*.45,ridge+.001,z+.005]],.0007,thread);}
      book.add(repairs.root);
    }
    // The bookmark sticks out of the read side.
    const marked = halves[0].pages > halves[1].pages ? halves[0] : halves[1];
    const tab = new THREE.Group();
    tab.position.set(marked.side * w * 0.5, -cover - marked.pages * 0.5, d / 2 - 0.02);
    if (a.marker === 'flower') {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.0008, 0.07), s.material('#7a8a4a')), tab).position.z = 0.035;
      const petal = s.material(mood.cheer > 0.5 ? '#c79ad8' : '#d8c27a', { roughness: 0.9 });
      for (let i = 0; i < 6; i++) { const p = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.0008, 10), petal), tab); p.scale.z = 1.6; p.position.set(Math.cos(i * 1.047) * 0.012, 0, 0.072 + Math.sin(i * 1.047) * 0.012); p.rotation.y = -i * 1.047 + Math.PI / 2; }
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.0012, 10), s.material('#8a6a1c')), tab).position.set(0, 0.0003, 0.072);
      const leaf = add(new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.0008, 8), s.material('#7a8a4a')), tab); leaf.scale.z = 2.2; leaf.position.set(0.009, 0, 0.04); leaf.rotation.y = 0.7;
    } else if (a.marker === 'ribbon') {
      const silk = s.material('#c22a34', { roughness: 0.4 });
      add(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.0008, 0.06), silk), tab).position.z = 0.04;
      const end = add(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.0008, 0.035), silk), tab); end.position.set(0.006, -0.004, 0.083); end.rotation.set(0.25, 0.4, 0);
    } else if (a.marker === 'ticket') {
      const stub = s.label(['ADMIT ONE', 'SINGLE', 'ROW G 14'][Math.floor(random() * 3)], 0.052, 0.026, [0, 0, 0], '#7a2a1c', '#f0d9a8');
      stub.rotation.set(-Math.PI / 2, 0, Math.PI / 2 + 0.1); stub.position.set(0, 0, 0.04); tab.add(stub);
    } else if (a.marker === 'feather') {
      const quill = add(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), s.material('#8a8f98', { roughness: 0.8 })), tab); quill.scale.set(0.011, 0.0008, 0.05); quill.position.z = 0.05; quill.rotation.y = 0.15;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.001, 0.1), s.material('#f1ecdc')), tab).position.z = 0.045;
    } else if (a.marker === 'photo') {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.0008, 0.07), s.material('#f6f3ea', { roughness: 0.4 })), tab).position.z = 0.02;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.0009, 0.05), s.material('#6f8fa6', { roughness: 0.3 })), tab).position.set(0, 0.0002, 0.026);
    } else if (a.marker === 'grass') {
      const blade = add(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.0008, 0.09), s.material('#6fa23c')), tab); blade.position.z = 0.05; blade.rotation.y = -0.2;
    }
    marked.group.add(tab);

    // Glasses, straddling the spine.
    if (a.eyewear !== 'none') {
      const specs = new THREE.Group();
      const style = a.eyewear;
      const frame = { wayfarer: s.material('#141416', { roughness: 0.3 }), aviator: s.material('#d5a941', { metalness: 0.9, roughness: 0.25 }), round: s.material('#3a3028', { metalness: 0.6, roughness: 0.4 }), cateye: s.material('#c41f2f', { roughness: 0.3 }), hearts: s.material('#f06aa6', { roughness: 0.3 }), reading: s.material('#8a6a3a', { metalness: 0.7, roughness: 0.35 }) }[style];
      const lens = style === 'reading'
        ? new THREE.MeshStandardMaterial({ color: '#dff0f4', transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.05, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ color: { wayfarer: '#1a2420', aviator: '#3a4a2a', round: '#7a4a1c', cateye: '#201a24', hearts: '#8a2a5a', reading: '#ffffff' }[style], metalness: 0.5, roughness: 0.12, side: THREE.DoubleSide });
      const outline = new THREE.Shape();
      const r = style === 'round' ? 0.019 : 0.023;
      if (style === 'hearts') { outline.moveTo(0, -r); outline.bezierCurveTo(-r * 1.9, -r * 0.1, -r * 0.9, r * 1.4, 0, r * 0.55); outline.bezierCurveTo(r * 0.9, r * 1.4, r * 1.9, -r * 0.1, 0, -r); }
      else if (style === 'wayfarer') { outline.moveTo(-r * 1.1, r * 0.75); outline.lineTo(r * 1.1, r * 0.8); outline.quadraticCurveTo(r * 1.15, -r * 0.5, r * 0.6, -r * 0.8); outline.lineTo(-r * 0.6, -r * 0.8); outline.quadraticCurveTo(-r * 1.15, -r * 0.5, -r * 1.1, r * 0.75); }
      else if (style === 'cateye') { outline.moveTo(-r * 1.0, r * 0.3); outline.quadraticCurveTo(0, r * 0.9, r * 1.5, r * 1.05); outline.quadraticCurveTo(r * 1.1, -r * 0.8, 0, -r * 0.8); outline.quadraticCurveTo(-r * 1.0, -r * 0.7, -r * 1.0, r * 0.3); }
      else if (style === 'aviator') { outline.moveTo(-r, r * 0.7); outline.lineTo(r * 1.05, r * 0.75); outline.quadraticCurveTo(r * 1.2, -r * 0.6, r * 0.2, -r * 1.05); outline.quadraticCurveTo(-r * 1.0, -r * 0.9, -r, r * 0.7); }
      else if (style === 'reading') { outline.moveTo(-r, r * 0.25); outline.lineTo(r, r * 0.25); outline.absarc(0, r * 0.25, r, 0, Math.PI, true); }
      else outline.absarc(0, 0, r, 0, Math.PI * 2, false);
      const thick = style === 'wayfarer' || style === 'cateye' || style === 'hearts' ? 0.0042 : 0.0016;
      const rimPoints = outline.getPoints(28).map((p) => new THREE.Vector3(p.x, p.y, 0));
      for (const side of [-1, 1]) {
        const eye = new THREE.Group();
        add(new THREE.Mesh(new THREE.ShapeGeometry(outline, 20), lens), eye);
        add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPoints, true), 48, thick / 2 + 0.0006, 6, true), frame), eye);
        eye.scale.x = side;
        eye.position.set(side * (r + 0.011), 0, 0);
        specs.add(eye);
        // Arm, running back with a hook for the ear.
        add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(side * (r * 2.1 + 0.011), r * 0.45, 0), new THREE.Vector3(side * (r * 2.1 + 0.014), r * 0.4, -0.06), new THREE.Vector3(side * (r * 2.1 + 0.012), r * 0.3, -0.105), new THREE.Vector3(side * (r * 2.1 + 0.01), -r * 0.35, -0.128)]), 16, thick / 2 + 0.0004, 6), frame), specs);
      }
      add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.012, r * 0.3, 0), new THREE.Vector3(0, r * 0.5, 0.001), new THREE.Vector3(0.012, r * 0.3, 0)]), 8, thick / 2 + 0.0004, 6), frame), specs);
      if (style === 'aviator') add(new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, r * 2 + 0.03, 6), frame), specs).rotation.z = Math.PI / 2, specs.children[specs.children.length - 1].position.y = r * 0.78;
      const slope = Math.asin(Math.min(0.9, (ridge - cover - thickness / 2) / w));
      specs.position.set((random() - 0.5) * 0.012, ridge - Math.max(0, r + 0.011 - spineWidth / 2) * Math.tan(slope) + r * 0.82 + 0.002, 0.045 + random() * 0.02);
      specs.rotation.set(-0.18, (random() - 0.5) * 0.5, (halves[0].pages - halves[1].pages) * 3);
      book.add(specs);
    }

    book.rotation.y = 0.25 + (random() - 0.5) * 0.5;
    if (a.stacked) {
      const under = new THREE.Group();
      const other = ['#27496d', '#7a2f2f', '#2f5d50', '#b08a3a'][Math.floor(random() * 4)];
      add(new THREE.Mesh(new THREE.BoxGeometry(0.128, 0.032, 0.198), s.material(other, { roughness: 0.6 })), under).position.y = 0.016;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.027, 0.2), paper), under).position.set(0.004, 0.016, 0);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.0005, 0.02), s.material('#e8d9a0', { metalness: 0.5, roughness: 0.4 })), under).position.set(0, 0.0325, -0.05);
      under.rotation.y = book.rotation.y - 0.5 + random() * 0.3;
      s.root.add(under);
      book.position.y = 0.032;
      book.scale.setScalar(0.96);
    }
    s.root.add(book);

    const spot: [number, number] = [w + 0.055, 0.05];
    if (a.beside === 'pencil') {
      const pencil = new THREE.Group();
      const body = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.085, 6), s.material('#e8b81c', { roughness: 0.4 })), pencil); body.rotation.z = Math.PI / 2;
      const tip = add(new THREE.Mesh(new THREE.ConeGeometry(0.0038, 0.014, 6), s.material('#e3c9a0')), pencil); tip.rotation.z = -Math.PI / 2; tip.position.x = 0.0495;
      const lead = add(new THREE.Mesh(new THREE.ConeGeometry(0.0013, 0.005, 6), s.material('#2a2a2c')), pencil); lead.rotation.z = -Math.PI / 2; lead.position.x = 0.0545;
      const rubber = add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.01, 8), s.material('#e58a94')), pencil); rubber.rotation.z = Math.PI / 2; rubber.position.x = -0.047;
      pencil.position.set(spot[0], 0.0035, spot[1]); pencil.rotation.y = 0.9 + random();
      s.root.add(pencil);
    } else if (a.beside === 'apple') {
      const apple = new THREE.Group();
      const skin = s.material(mood.cheer > 0.5 ? '#c8242c' : '#8fae3a', { roughness: 0.3 });
      const fruit = add(new THREE.Mesh(new THREE.SphereGeometry(0.034, 20, 14), skin), apple); fruit.scale.y = 0.9; fruit.position.y = 0.03;
      const flesh = s.material('#f4ecc8', { roughness: 0.7 });
      for (let i = 0; i < 2; i++) {
        const bite = add(new THREE.Mesh(new THREE.CylinderGeometry(0.015 - i * 0.003, 0.015 - i * 0.003, 0.004, 14), flesh), apple);
        const out = new THREE.Vector3(0.62, 0.15 + i * 0.5, 0.75).normalize();
        bite.position.copy(out).multiplyScalar(0.0318 - i * 0.0008).add(new THREE.Vector3(0, 0.03, 0));
        bite.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), out);
      }
      const stalk = add(new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.0014, 0.014, 5), s.material('#4a3018')), apple); stalk.position.y = 0.063; stalk.rotation.z = 0.3;
      apple.position.set(spot[0], 0, spot[1]); apple.rotation.y = -0.4 + random() * 0.6;
      s.root.add(apple);
    } else if (a.beside === 'cherries') {
      const red = s.material('#9c1226', { roughness: 0.15 }), stem = s.material('#6a7a2a'), stone = s.material('#c9a877');
      for (let i = 0; i < 5; i++) {
        const x = spot[0] + (random() - 0.5) * 0.07, z = spot[1] + (random() - 0.5) * 0.09;
        s.ball([0.011, 0.0105, 0.011], [x, 0.0105, z], red, 12);
        s.rod([x, 0.02, z], [x + (random() - 0.5) * 0.03, 0.045 + random() * 0.01, z + (random() - 0.5) * 0.03], 0.0008, stem);
      }
      for (let i = 0; i < 4; i++) s.ball([0.005, 0.004, 0.0045], [spot[0] + (random() - 0.5) * 0.08, 0.004, spot[1] + 0.06 + random() * 0.03], stone, 8);
    } else if (a.beside === 'shells') {
      const shell = s.material('#ecd9c2', { roughness: 0.5 });
      for (let i = 0; i < 3; i++) {
        const fan = s.mesh(new THREE.SphereGeometry(0.017 + random() * 0.006, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), i === 1 ? s.material('#e2a48c', { roughness: 0.5 }) : shell, [spot[0] + (i - 1) * 0.036 + random() * 0.01, 0, spot[1] + (random() - 0.5) * 0.08]);
        fan.scale.set(1, 0.45, 1.2); fan.rotation.y = random() * 3;
      }
      s.ball([0.02, 0.011, 0.015], [spot[0] - 0.01, 0.011, spot[1] + 0.075], s.material('#7f8689', { roughness: 0.6 }), 12);
    }
    const aid=new Sculpture(context),cream=aid.material('#eee4cc'),wood=aid.material('#9c754b');
    if(a.readingAid==='ruler'){
      aid.box([.027,.0015,.145],[0,.00075,0],aid.material('#b7cfcb',{transparent:true,opacity:.6,roughness:.2}));
      for(let i=0;i<15;i++)aid.rod([-.011,.0016,-.068+i*.0095],[i%5===0?.002:-.005,.0016,-.068+i*.0095],.00025,aid.material('#485955'));
    }
    if(a.readingAid==='magnifier'){
      const metal=aid.material('#b8a05e',{metalness:.7,roughness:.3});aid.ring(.023,.003,[0,.003,0],metal).rotation.x=Math.PI/2;
      aid.cylinder(.022,.022,.0015,[0,.003,0],aid.material('#d7e8e3',{transparent:true,opacity:.25,roughness:.05}),24);aid.rod([0,.003,.024],[0,.003,.085],.004,wood);
    }
    if(a.readingAid==='case'){
      aid.box([.055,.006,.13],[0,.003,0],aid.material('#7d918d'));const flap=aid.box([.046,.002,.125],[.003,.007,0],aid.material('#a0afa5'));flap.rotation.z=.05;
      for(let i=0;i<16;i++)aid.rod([-.025,.006,-.06+i*.008],[-.02,.006,-.06+i*.008],.00035,cream);
    }
    if(a.readingAid==='note'){
      aid.box([.074,.001,.058],[0,.0005,0],cream);const note=aid.label('CHAPTER 7',.063,.012,[0,.0011,-.014],'#46536a','#eee4cc');note.rotation.x=-Math.PI/2;
      for(let i=0;i<3;i++)aid.rod([-.026,.0013,.004+i*.009],[.02-i*.006,.0013,.004+i*.009],.0004,aid.material('#66738b'));
    }
    aid.root.position.set(-w-.055,0,.015);aid.root.rotation.y=-.2;s.root.add(aid.root);
    return s.finish();
  },
});
