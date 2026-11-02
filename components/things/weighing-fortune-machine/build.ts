import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const ENAMEL = {
  red: 'Fire-engine red enamel with cream trim, the classic.',
  blue: 'Deep royal blue with silver trim.',
  yellow: 'Canary yellow with black trim, loud as a taxi.',
  green: 'Bottle green with gold trim, old and dignified.',
  cream: 'Cream with red trim, like a sweet-shop counter.',
} as const;
const ENAMEL_HEX: Record<keyof typeof ENAMEL, [string, string]> = {
  red: ['#c8281f', '#f1e6c6'], blue: ['#234a9c', '#d5dadf'], yellow: ['#ecb920', '#1f1d1b'], green: ['#1f5a40', '#d9b24c'], cream: ['#eadfbe', '#c0302a'],
};
const FORTUNES = {
  journey: 'A LONG JOURNEY AWAITS YOU, with a little train as its sign.',
  love: 'SOMEONE IS THINKING OF YOU, with a heart as its sign.',
  money: 'MONEY COMES TO YOU SOON, with a coin as its sign.',
  patience: 'PATIENCE WILL BE REWARDED, with a star as its sign.',
  beware: 'BEWARE A SMILING STRANGER, with a watching eye as its sign.',
  home: 'YOU WILL RETURN HOME, with a little house as its sign.',
} as const;
const FORTUNE_TEXT: Record<keyof typeof FORTUNES, string[]> = {
  journey: ['A LONG', 'JOURNEY', 'AWAITS YOU'], love: ['SOMEONE IS', 'THINKING', 'OF YOU'], money: ['MONEY', 'COMES TO', 'YOU SOON'],
  patience: ['PATIENCE', 'WILL BE', 'REWARDED'], beware: ['BEWARE', 'A SMILING', 'STRANGER'], home: ['YOU WILL', 'RETURN', 'HOME'],
};

export default defineThing({
  questions: {
    form: choice('What shape is the machine?', {
      classic: 'A waisted cabinet with a big round head, like a keyhole.',
      cabinet: 'A tall square-shouldered cabinet with a lit marquee across the top.',
      lollipop: 'A drum head on a slim column, spindly and elegant.',
    }),
    colour: choice('What colour is it?', ENAMEL),
    disc: choice('What is painted on the spinning disc?', {
      spiral: 'A red and white spiral that seems to bore inward.',
      wedges: 'Rainbow wedges like a lottery wheel.',
      rings: 'Black and white hypnotic rings.',
      numbers: 'A ring of weights in kilos round a starburst.',
    }),
    lights: choice('What are the bulbs doing?', {
      running: 'Chasing each other round the dial in a running circle.',
      steady: 'All glowing steadily.',
      dying: 'Half of them blown, the rest stuttering.',
      off: 'All dark; the machine is unplugged or broken.',
    }),
    fortune: choice('What does the fortune say?', FORTUNES),
    card: choice('Where is the printed card?', {
      none: 'No card: nobody has fed it a coin today.',
      slot: 'One card sticking out of the slot, never collected.',
      floor: 'Several cards dropped and scattered at its foot.',
      hand: 'A fresh card lying face up on the step plate.',
    }),
    tread: choice('What grips the weighing platform?', { bars: 'The original straight tread bars.', dots: 'Rows of raised circular studs.', chevrons: 'A repeated chevron tread.', border: 'A smooth mat inside a bright rim.' }),
    handrail: choice('What helps the customer balance?', { none: 'No balance rail.', left: 'One curved rail on the left.', pair: 'A curved rail on either side.', crossbar: 'Two uprights joined by a low crossbar.' }),
    bezelFinish: choice('How is the dial bezel finished?', { plain: 'Plain chrome.', beads: 'A ring of little chrome beads.', scallops: 'Six rounded scallop ornaments.', double: 'Two fine concentric rings.' }),
    bulbSpacing: choice('How many lamps surround the dial?', { twelve: 'Twelve widely spaced bulbs.', eighteen: 'Eighteen evenly spaced bulbs.', twentyfour: 'Twenty-four close bulbs.', thirty: 'Thirty small closely packed bulbs.' }),
    coinReturn: choice('What is below the coin slot?', { plain: 'The original round release button.', lever: 'A short chromed release lever.', tray: 'A little projecting change tray.', hood: 'A rounded protective hood over the return.' }),
    rearVent: choice('What ventilates the back of the cabinet?', { plain: 'A plain painted back.', slots: 'Six narrow horizontal slots.', grille: 'A square crossed-wire grille.', plate: 'A bolted access plate with a small vent.' }),
    cable: choice('How is the power cable arranged?', { none: 'No loose cable visible.', coil: 'A coiled cable at the rear foot.', straight: 'A cable running along the ground behind it.', reel: 'A small cable reel beside the base.' }),
    baseTrim: choice('What protects the front of the step?', { plain: 'Plain enamel.', chrome: 'A bright chrome edge.', corners: 'Two large metal corner guards.', chequer: 'A black and cream chequered edge.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => mix(lo, hi, random());
    const [bodyHex, trimHex] = ENAMEL_HEX[a.colour];
    const body = s.material(bodyHex, { roughness: 0.38, metalness: 0.15 });
    const trim = s.material(trimHex, { roughness: 0.4, metalness: a.colour === 'blue' || a.colour === 'green' ? 0.6 : 0.1 });
    const chrome = s.material('#d9dddd', { metalness: 0.9, roughness: 0.22 });
    const brass = s.material('#c09a3e', { metalness: 0.8, roughness: 0.3 });
    const black = s.material('#1b1a19', { roughness: 0.8 });
    const glass = new THREE.MeshStandardMaterial({ color: '#eaf6f4', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false });
    const textures: THREE.Texture[] = [];
    const paint = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, emissive = 0) => {
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, ...(emissive ? { emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: emissive } : {}) });
    };
    const lit = a.lights !== 'off';
    const power = lit ? mix(0.5, 1, mood.cheer) : 0;

    // ---- dimensions per form -----------------------------------------------
    const headR = a.form === 'lollipop' ? 0.34 : 0.31;
    const headY = a.form === 'cabinet' ? 1.36 : a.form === 'lollipop' ? 1.6 : 1.48;
    const front = a.form === 'cabinet' ? 0.19 : 0.16; // z of the head's front face
    const colZ = -0.12;

    // ---- step plate --------------------------------------------------------
    s.box([0.52, 0.09, 0.66], [0, 0.045, 0.08], body);
    s.box([0.46, 0.012, 0.44], [0, 0.096, 0.17], black);
    if(a.tread==='bars')for(let i=0;i<9;i++)s.box([.42,.008,.014],[0,.105,-.02+i*.047],chrome);
    else if(a.tread==='dots')for(let x=0;x<6;x++)for(let z=0;z<6;z++)s.cylinder(.009,.009,.007,[-.175+x*.07,.1055,-.005+z*.07],chrome,8);
    else if(a.tread==='chevrons')for(let i=0;i<7;i++)for(const side of[-1,1])s.rod([0,.106,.005+i*.055],[side*.2,.106,-.025+i*.055],.004,chrome);
    else{for(const x of[-.22,.22])s.box([.01,.008,.44],[x,.105,.17],chrome);for(const z of[-.045,.385])s.box([.45,.008,.01],[0,.105,z],chrome);}
    s.box([0.54, 0.02, 0.68], [0, 0.01, 0.08], black);

    // ---- body --------------------------------------------------------------
    if (a.form === 'classic') {
      s.box([0.36, 1.12, 0.3], [0, 0.65, colZ], body);
      s.box([0.4, 0.06, 0.34], [0, 0.12, colZ], trim);
      const head = s.cylinder(headR + 0.07, headR + 0.07, 0.32, [0, headY, colZ + 0.12 - 0.12], body, 40); head.rotation.x = Math.PI / 2;
      s.box([0.5, 0.28, 0.3], [0, headY - headR - 0.02, colZ], body);
      for (const x of [-1, 1]) s.box([0.012, 1.0, 0.012], [x * 0.15, 0.68, colZ + 0.153], trim);
      s.ball([0.06, 0.08, 0.06], [0, headY + headR + 0.11, colZ], trim, 14);
    } else if (a.form === 'cabinet') {
      s.box([0.56, 1.78, 0.38], [0, 0.98, -0.02], body);
      s.box([0.6, 0.06, 0.42], [0, 0.13, -0.02], trim);
      s.box([0.62, 0.22, 0.42], [0, 1.94, -0.02], trim);
      const marquee = paint(256, 80, (ctx) => {
        ctx.fillStyle = bodyHex; ctx.fillRect(0, 0, 256, 80);
        ctx.fillStyle = a.colour === 'yellow' ? '#1f1d1b' : a.colour === 'cream' ? '#c0302a' : '#fff7d6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 30px sans-serif'; ctx.fillText('WEIGHT &', 128, 24); ctx.fillText('FORTUNE', 128, 58);
      }, power * 0.5);
      s.mesh(new THREE.PlaneGeometry(0.56, 0.18), marquee, [0, 1.94, 0.193]);
      for (const x of [-1, 1]) s.box([0.02, 1.7, 0.02], [x * 0.27, 0.98, 0.175], trim);
    } else {
      s.cylinder(0.075, 0.1, 1.2, [0, 0.69, colZ], body, 18);
      s.cylinder(0.16, 0.2, 0.1, [0, 0.14, colZ], trim, 18);
      s.cylinder(0.11, 0.085, 0.07, [0, 1.25, colZ], trim, 18);
      const head = s.cylinder(headR + 0.06, headR + 0.06, 0.3, [0, headY, colZ + 0.13], body, 40); head.rotation.x = Math.PI / 2;
      // A coin box strapped to the column.
      s.box([0.24, 0.34, 0.2], [0, 0.98, colZ + 0.08], body);
      s.ball([0.05, 0.07, 0.05], [0, headY + headR + 0.1, colZ + 0.13], trim, 14);
    }
    const zf = a.form === 'classic' ? colZ + 0.16 : a.form === 'cabinet' ? 0.17 : colZ + 0.28;

    // ---- the dial: bezel, disc, pointer, glass ----------------------------
    const bezel = s.ring(headR, 0.022, [0, headY, zf + 0.005], chrome);
    void bezel;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(headR - 0.015, 48), paint(256, 256, (ctx) => {
      ctx.translate(128, 128);
      if (a.disc === 'spiral') {
        ctx.fillStyle = '#f6f0de'; ctx.fillRect(-128, -128, 256, 256);
        ctx.strokeStyle = '#cf2a20'; ctx.lineWidth = 17; ctx.beginPath();
        for (let t = 0; t < Math.PI * 9; t += 0.05) { const r = t * 4.6; ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r); }
        ctx.stroke();
      } else if (a.disc === 'wedges') {
        const hues = ['#e23b2e', '#f39b1f', '#f4d21f', '#3fae4f', '#2f86d6', '#7a48c0', '#e2559d', '#f6f0de'];
        for (let i = 0; i < 16; i++) { ctx.fillStyle = hues[i % hues.length]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 128, (i / 16) * Math.PI * 2, ((i + 1) / 16) * Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#1b1a19'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
      } else if (a.disc === 'rings') {
        for (let i = 9; i >= 0; i--) { ctx.fillStyle = i % 2 ? '#17161a' : '#f6f0de'; ctx.beginPath(); ctx.arc(i * 1.5, 0, 14 + i * 13, 0, Math.PI * 2); ctx.fill(); }
      } else {
        ctx.fillStyle = '#f6f0de'; ctx.fillRect(-128, -128, 256, 256);
        for (let i = 0; i < 24; i++) { ctx.fillStyle = i % 2 ? '#cf2a20' : '#f4d21f'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 74, (i / 24) * Math.PI * 2, ((i + 1) / 24) * Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#17161a'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i = 0; i < 12; i++) { ctx.save(); ctx.rotate((i / 12) * Math.PI * 2); ctx.fillText(String(i * 10), 0, -100); ctx.fillRect(-1.5, -86, 3, 10); ctx.restore(); }
      }
    }, power * 0.35));
    disc.position.set(0, headY, zf + 0.004);
    s.root.add(disc);
    s.mesh(new THREE.CircleGeometry(headR - 0.01, 40), glass, [0, headY, zf + 0.03]).castShadow = false;
    // A fixed red pointer at twelve o'clock and the hub.
    const pointer = new THREE.Shape(); pointer.moveTo(-0.025, 0.02); pointer.lineTo(0.025, 0.02); pointer.lineTo(0, -0.07); pointer.closePath();
    s.mesh(new THREE.ShapeGeometry(pointer), s.material('#d0241c', { emissive: '#d0241c', emissiveIntensity: 0.3 }), [0, headY + headR - 0.04, zf + 0.012]);
    s.cylinder(0.03, 0.03, 0.02, [0, headY, zf + 0.014], chrome, 14).rotation.x = Math.PI / 2;

    // ---- bulbs: three phase groups that chase ------------------------------
    const bulbColours = ['#ffd23a', '#ff4a36', '#3fd0ff', '#6cf06a'];
    const phases = [0, 1, 2].map((i) => new THREE.MeshStandardMaterial({ color: lit ? bulbColours[i % bulbColours.length] : '#8d8a80', emissive: bulbColours[i % bulbColours.length], emissiveIntensity: lit ? 1.4 : 0, roughness: 0.3 }));
    const blown = new THREE.MeshStandardMaterial({ color: '#6f6a5e', roughness: 0.5 });
    const groups: [number, number, number][][] = [[], [], [], []];
    const addBulb = (i: number, at: [number, number, number]) => {
      const out = a.lights === 'dying' ? random() < 0.5 : random() < mood.wear * 0.25;
      groups[out ? 3 : i % 3].push(at);
    };
    const ringN = {twelve:12,eighteen:18,twentyfour:24,thirty:30}[a.bulbSpacing], ringR = headR + (a.form === 'cabinet' ? 0.04 : 0.045);
    for (let i = 0; i < ringN; i++) { const t = (i / ringN) * Math.PI * 2; addBulb(i, [Math.sin(t) * ringR, headY + Math.cos(t) * ringR, zf + 0.012]); }
    if (a.form === 'cabinet') for (let i = 0; i < 9; i++) for (const x of [-1, 1]) addBulb(i + (x > 0 ? 1 : 0), [x * 0.27, 0.22 + i * 0.085, 0.19]);
    if (a.form === 'classic') for (let i = 0; i < 6; i++) for (const x of [-1, 1]) addBulb(i + (x > 0 ? 1 : 0), [x * 0.15, 0.24 + i * 0.1, colZ + 0.162]);
    const bulbGeo = new THREE.SphereGeometry(0.02, 10, 7);
    groups.forEach((list, i) => { if (list.length) s.scatter(bulbGeo, i === 3 ? blown : phases[i], list.map((at) => ({ at, size: 1 }))); });

    // ---- fortune sign window, coin slot, card slot -------------------------
    const signY = a.form === 'lollipop' ? 1.03 : a.form === 'cabinet' ? 0.82 : 0.9;
    const signZ = a.form === 'lollipop' ? colZ + 0.182 : zf - (a.form === 'cabinet' ? -0.022 : 0.006);
    const signW = a.form === 'lollipop' ? 0.19 : 0.24;
    const sign = paint(128, 128, (ctx) => {
      ctx.fillStyle = lit ? '#fff3c4' : '#b9b199'; ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = bodyHex; ctx.lineWidth = 8; ctx.strokeRect(4, 4, 120, 120);
      const ink = a.colour === 'cream' ? '#c0302a' : bodyHex;
      ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = 9; ctx.lineJoin = 'round';
      ctx.translate(64, 66);
      if (a.fortune === 'love') { ctx.beginPath(); ctx.moveTo(0, 36); ctx.bezierCurveTo(-58, -6, -30, -50, 0, -18); ctx.bezierCurveTo(30, -50, 58, -6, 0, 36); ctx.fill(); }
      else if (a.fortune === 'money') { ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff3c4'; ctx.font = 'bold 50px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('1', 0, 3); }
      else if (a.fortune === 'patience') { ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 18 : 44, t = (i / 10) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r); } ctx.closePath(); ctx.fill(); }
      else if (a.fortune === 'beware') { ctx.beginPath(); ctx.moveTo(-46, 0); ctx.quadraticCurveTo(0, -44, 46, 0); ctx.quadraticCurveTo(0, 44, -46, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); }
      else if (a.fortune === 'home') { ctx.beginPath(); ctx.moveTo(-44, -4); ctx.lineTo(0, -42); ctx.lineTo(44, -4); ctx.closePath(); ctx.fill(); ctx.fillRect(-32, -4, 64, 42); ctx.fillStyle = '#fff3c4'; ctx.fillRect(-9, 12, 18, 26); }
      else { ctx.fillRect(-44, -22, 78, 40); ctx.fillRect(18, -36, 22, 20); ctx.fillRect(-36, -40, 10, 20); for (const x of [-28, 0, 26]) { ctx.beginPath(); ctx.arc(x, 26, 11, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#fff3c4'; for (const x of [-34, -12, 10]) ctx.fillRect(x, -12, 14, 14); }
    }, power * 0.6);
    s.box([signW + 0.03, signW + 0.03, 0.02], [0, signY, signZ - 0.008], chrome);
    s.mesh(new THREE.PlaneGeometry(signW, signW), sign, [0, signY, signZ + 0.003]);

    const slotY = signY - signW / 2 - 0.13;
    s.box([0.2, 0.13, 0.025], [0, slotY, signZ], brass);
    s.box([0.008, 0.045, 0.006], [0.06, slotY + 0.02, signZ + 0.014], black); // coin slot
    s.cylinder(0.018, 0.018, 0.012, [0.06, slotY - 0.035, signZ + 0.016], chrome, 10).rotation.x = Math.PI / 2;
    s.box([0.095, 0.01, 0.006], [-0.04, slotY - 0.02, signZ + 0.014], black); // card slot
    s.box([0.13, 0.012, 0.06], [-0.04, slotY - 0.075, signZ + 0.03], chrome); // tray

    const cardMaterial = paint(128, 200, (ctx) => {
      ctx.fillStyle = '#f5ecd2'; ctx.fillRect(0, 0, 128, 200);
      ctx.strokeStyle = '#b3261c'; ctx.lineWidth = 5; ctx.strokeRect(5, 5, 118, 190);
      ctx.fillStyle = '#b3261c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 46px sans-serif'; ctx.fillText(`${Math.round(rnd(38, 86))}`, 64, 42);
      ctx.font = 'bold 16px sans-serif'; ctx.fillText('KILOGRAMS', 64, 76);
      ctx.fillStyle = '#1b1a19'; ctx.font = 'bold 19px sans-serif';
      FORTUNE_TEXT[a.fortune].forEach((line, i) => ctx.fillText(line, 64, 112 + i * 28, 110));
    });
    cardMaterial.side = THREE.DoubleSide;
    const card = (at: [number, number, number], rot: [number, number, number]) => {
      const mesh = s.mesh(new THREE.PlaneGeometry(0.085, 0.133), cardMaterial, at);
      mesh.rotation.set(...rot);
      return mesh;
    };
    if (a.card === 'slot') card([-0.04, slotY - 0.045, signZ + 0.04], [-1.05, 0, 0.04]);
    else if (a.card === 'hand') card([rnd(-0.1, 0.1), 0.118, 0.2 + rnd(-0.05, 0.08)], [-Math.PI / 2, 0, rnd(-0.6, 0.6)]);
    else if (a.card === 'floor') {
      const n = 3 + Math.floor(mood.density * 5);
      for (let i = 0; i < n; i++) card([rnd(-0.55, 0.55), 0.004 + i * 0.001, 0.5 + rnd(0, 0.35)], [-Math.PI / 2, 0, rnd(0, 6.28)]);
      card([-0.04, slotY - 0.045, signZ + 0.04], [-1.05, 0, -0.1]);
    }
    if (a.card !== 'none' && a.card !== 'slot' && mood.wear > 0.6) card([0.2, 0.004, 0.52], [-Math.PI / 2, 0, 1]);

    // Painted instruction plate above the sign.
    const plate = paint(256, 64, (ctx) => {
      ctx.fillStyle = trimHex; ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = trimHex === '#1f1d1b' ? '#ecb920' : bodyHex === '#eadfbe' ? '#f5ecd2' : bodyHex;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 34px sans-serif';
      ctx.fillText('YOUR WEIGHT', 128, 34, 240);
    });
    if (a.form !== 'lollipop') s.mesh(new THREE.PlaneGeometry(0.28, 0.07), plate, [0, headY - headR - (a.form === 'cabinet' ? 0.12 : 0.1), zf + 0.004]);

    // Wear: rust weeping from the base and a dent of grime.
    if (mood.wear > 0.45) {
      const rust = new THREE.MeshStandardMaterial({ color: '#6b3d22', transparent: true, opacity: mix(0, 0.75, mood.wear), roughness: 1, depthWrite: false });
      for (let i = 0; i < 5; i++) s.box([rnd(0.03, 0.09), rnd(0.08, 0.3), 0.002], [rnd(-0.15, 0.15), rnd(0.2, 0.5), zf + 0.002], rust).castShadow = false;
    }

    if(a.handrail!=='none'){
      const sides=a.handrail==='left'?[-1]:[-1,1];for(const side of sides){const x=side*.25;if(a.handrail==='crossbar')s.rod([x,.09,.02],[x,.78,.02],.018,chrome);else s.tube([[x,.09,.24],[x,.72,.24],[x,.88,.13],[x,.72,-.1],[x,.09,-.1]],.017,chrome);}
      if(a.handrail==='crossbar')s.rod([-.25,.78,.02],[.25,.78,.02],.018,chrome);
    }
    if(a.bezelFinish==='beads')for(let i=0;i<36;i++){const t=i*Math.PI/18;s.ball([.012,.012,.009],[Math.sin(t)*headR,headY+Math.cos(t)*headR,zf+.025],chrome,6);}
    else if(a.bezelFinish==='double')for(const r of[headR-.022,headR+.025])s.ring(r,.006,[0,headY,zf+.02],chrome);
    else if(a.bezelFinish==='scallops')for(let i=0;i<6;i++){const t=i*Math.PI/3;const arc=s.ring(.045,.008,[Math.sin(t)*(headR-.012),headY+Math.cos(t)*(headR-.012),zf+.026],trim,Math.PI);arc.rotation.z=-t;}
    if(a.coinReturn==='lever')s.rod([.06,slotY-.035,signZ+.03],[.12,slotY-.075,signZ+.045],.008,chrome);
    else if(a.coinReturn==='tray'){s.box([.085,.008,.065],[.06,slotY-.065,signZ+.04],chrome);for(const x of[.018,.102])s.box([.006,.035,.065],[x,slotY-.05,signZ+.04],chrome);}
    else if(a.coinReturn==='hood')s.tube([[.025,slotY-.05,signZ+.03],[.025,slotY+.005,signZ+.045],[.095,slotY+.005,signZ+.045],[.095,slotY-.05,signZ+.03]],.01,chrome);
    const back=a.form==='cabinet'?-.215:colZ-(a.form==='classic'?.155:.085),ventY=.6,vw=a.form==='lollipop'?.12:.25;
    if(a.rearVent==='slots')for(let i=0;i<6;i++)s.box([vw,.014,.006],[0,ventY-.09+i*.036,back-.005],black);
    else if(a.rearVent==='grille'){s.box([vw,.23,.008],[0,ventY,back-.004],black);for(let i=0;i<7;i++)s.rod([-vw/2+i*vw/6,ventY-.11,back-.012],[-vw/2+i*vw/6,ventY+.11,back-.012],.003,chrome);for(let i=0;i<5;i++)s.rod([-vw/2,ventY-.1+i*.05,back-.012],[vw/2,ventY-.1+i*.05,back-.012],.003,chrome);}
    else if(a.rearVent==='plate'){s.box([vw,.25,.01],[0,ventY,back-.005],trim);for(const x of[-1,1])for(const y of[-1,1])s.ball([.006,.006,.005],[x*vw*.4,ventY+y*.105,back-.014],chrome,6);for(let i=0;i<3;i++)s.box([vw*.6,.012,.004],[0,ventY-.03+i*.03,back-.013],black);}
    if(a.cable!=='none'){
      s.tube([[0,.18,back],[0,.06,-.42],[-.15,.009,-.5]],.008,black);
      if(a.cable==='coil')for(let i=0;i<4;i++)s.ring(.1+i*.009,.006,[-.25,.008,-.51],black).rotation.x=Math.PI/2;
      else if(a.cable==='straight')s.tube([[-.15,.009,-.5],[-.35,.009,-.58],[-.5,.009,-.8],[-.7,.009,-.78]],.008,black);
      else{s.box([.2,.02,.16],[-.36,.01,-.55],black);for(const x of[-.44,-.28]){s.rod([x,.02,-.55],[x,.18,-.55],.012,chrome);s.cylinder(.11,.11,.012,[x,.18,-.55],trim,16).rotation.z=Math.PI/2;}s.cylinder(.075,.075,.15,[-.36,.18,-.55],black,16).rotation.z=Math.PI/2;s.tube([[-.15,.009,-.5],[-.2,.035,-.55],[-.28,.18,-.55]],.008,black);}
    }
    if(a.baseTrim==='chrome')s.box([.52,.045,.012],[0,.045,.416],chrome);
    else if(a.baseTrim==='corners')for(const x of[-1,1]){s.box([.08,.07,.012],[x*.22,.045,.416],chrome);s.box([.012,.07,.08],[x*.266,.045,.38],chrome);}
    else if(a.baseTrim==='chequer')for(let i=0;i<12;i++)s.box([.043,.045,.012],[-.238+i*.043,.045,.416],i%2?black:trim);

    const spin = lit ? mix(0.6, 5, mood.energy) : 0;
    const chase = mix(2, 9, mood.energy);
    disc.rotation.z = random() * 6.28;
    const thing = s.finish({
      update: (dt, time) => {
        disc.rotation.z -= dt * spin;
        if (!lit) return;
        phases.forEach((material, i) => {
          if (a.lights === 'running') material.emissiveIntensity = Math.floor(time * chase) % 3 === i ? 1.9 : 0.25;
          else if (a.lights === 'dying') material.emissiveIntensity = Math.sin(time * (17 + i * 7)) * Math.sin(time * (5 + i)) > 0.3 ? 0.2 : 1.3;
        });
      },
    });
    thing.update!(0, 0);
    return { ...thing, dispose: () => { thing.dispose(); for (const t of textures) t.dispose(); for (const m of [...phases, blown, glass]) m.dispose(); } };
  },
});
