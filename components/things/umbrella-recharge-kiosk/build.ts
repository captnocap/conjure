import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, score } from '@conjure/kit';

type P = [number, number, number];
const SIGNS = {
  recharge: ['RECHARGE', 'CARD HERE'],
  charge: ['CHARGE YOUR', 'PHONE N50'],
  call: ['MAKE CALL', 'HERE'],
  pos: ['POS · TRANSFER', 'AIRTIME · DATA'],
  back: ['BACK IN', '5 MINUTES'],
  credit: ['NO CREDIT', 'ABEG'],
} as const;

function lettering(lines: readonly string[], w: number, h: number, ink: string, paper: string, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(48, Math.round((512 * h) / w));
  const c = canvas.getContext('2d')!;
  c.fillStyle = paper;
  c.fillRect(0, 0, canvas.width, canvas.height);
  const longest = Math.max(...lines.map((line) => line.length));
  const size = Math.min((canvas.height / lines.length) * 0.7, (512 / longest) * 1.5);
  c.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  lines.forEach((line, index) => {
    c.save();
    c.translate(256, (canvas.height * (index + 0.5)) / lines.length);
    c.rotate((random() - 0.5) * 0.05);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillText(line, 3, 4, 480);
    c.fillStyle = ink;
    c.fillText(line, 0, 0, 480);
    c.restore();
  });
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.85, side: THREE.DoubleSide });
}

function parasol(s: Sculpture, radius: number, rise: number, colours: readonly string[], missing: (panel: number) => boolean, fade: number, drop = .16) {
  const group = new THREE.Group();
  const positions: number[] = [], tints: number[] = [];
  const panels = 8;
  const pale = new THREE.Color('#ddd6c4');
  for (let i = 0; i < panels; i++) {
    if (missing(i)) continue;
    const a0 = (i / panels) * Math.PI * 2, a1 = ((i + 1) / panels) * Math.PI * 2;
    const p0 = [Math.cos(a0) * radius, 0, Math.sin(a0) * radius], p1 = [Math.cos(a1) * radius, 0, Math.sin(a1) * radius];
    const colour = new THREE.Color(colours[i % colours.length]).lerp(pale, fade);
    const trim = new THREE.Color(colours[(i + 1) % colours.length]).lerp(pale, fade);
    const push = (tint: THREE.Color, ...points: number[][]) => points.forEach((point) => { positions.push(...point); tints.push(tint.r, tint.g, tint.b); });
    push(colour, [0, rise, 0], p1, p0);
    push(trim, p0, p1, [p1[0], -drop, p1[2]]);
    push(trim, p0, [p1[0], -drop, p1[2]], [p0[0], -drop, p0[2]]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(tints, 3));
  geometry.computeVertexNormals();
  const cloth = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }));
  cloth.castShadow = cloth.receiveShadow = true;
  group.add(cloth);
  const metal = s.material('#b9b6ac', { metalness: 0.5 });
  for (let i = 0; i < panels; i++) {
    const t = (i / panels) * Math.PI * 2;
    group.add(s.rod([0, rise - 0.01, 0], [Math.cos(t) * radius, -0.005, Math.sin(t) * radius], 0.008, metal));
  }
  group.add(s.cylinder(0.03, 0.03, 0.06, [0, rise + 0.02, 0], metal, 8));
  return group;
}

export default defineThing({
  questions: {
    tableWidth: score('How broad is the trading table?', ['A compact plywood table', 'Room for a ledger beside the phones', 'A broad counter for several customers']),
    canopySpan: score('How much ground does the parasol shade?', ['A small circle just over the table', 'A wide ordinary canopy', 'A generous canopy over the stool as well']),
    canopyProfile: choice('What shape does the parasol have?', {
      classic: 'A low pointed canopy with a short hanging valance.', high: 'A steep pointed crown.',
      shallow: 'An almost flat canopy with no hanging trim.', deep: 'A low crown with a deep hanging valance.',
    }),
    skirtStyle: choice('How is the front of the table enclosed?', {
      full: 'A full branded skirt.', half: 'A short strip below the table edge.',
      slats: 'Painted vertical timber slats.', open: 'Open framing with just the sign suspended in front.',
    }),
    phoneSupport: choice('How are charging phones supported?', {
      flat: 'Flat on the plywood top.', pads: 'On separate little felt pads.',
      stepped: 'On two low steps, with the rear row higher.', trays: 'In two shallow wooden trays.',
    }),
    cashStore: choice('What secures the day’s cash?', {
      tin: 'The familiar small metal cash tin.', lockbox: 'A larger metal box with a front latch.',
      drawer: 'A shallow wooden cash drawer fixed beneath the counter.', case: 'A small handled hard case.',
    }),
    sideShelf: choice('What extra display space stands at the side?', {
      none: 'No extra shelf.', tray: 'A shallow display tray on an attached shelf.',
      folding: 'A folding shelf held by two diagonal stays.', rack: 'A narrow three-tier rack on its own legs.',
    }),
    light: choice('What lights the counter after dusk?', {
      none: 'No separate light.', strip: 'A short LED strip clipped to the card display.',
      lamp: 'A small shaded lamp fixed to a corner of the counter.', lantern: 'A compact lantern hanging from the canopy pole.',
    }),
    brand: choice('What are the brand colours of the parasol and table skirt?', {
      yellow: 'Loud network yellow with black trim.',
      green: 'Green and white, the national-colours network.',
      red: 'Red and white.',
      blue: 'Sky blue and white, a bank-agent stand.',
      orange: 'Orange and black, the newcomer.',
      mixed: 'Two rival networks stitched together, yellow and red: the vendor sells everybody.',
    }),
    sign: choice('What does the hand-lettered sign say?', {
      recharge: 'RECHARGE CARD HERE.',
      charge: 'CHARGE YOUR PHONE N50.',
      call: 'MAKE CALL HERE.',
      pos: 'POS · TRANSFER · AIRTIME · DATA.',
      back: 'BACK IN 5 MINUTES, on a scrap of card.',
      credit: 'NO CREDIT ABEG.',
    }),
    phones: score('How many phones are charging on the strip?', ['One lonely handset', 'A handful', 'A dozen in a tangle', 'Twenty or more, stacked and labelled with tape']),
    stool: choice("What about the vendor's stool?", {
      vendor: 'The vendor sits on it, bent over a phone.',
      empty: 'Empty, pushed back as if just left.',
      held: 'Empty but for a folded cloth and a handbag keeping the place.',
      tipped: 'Knocked over on its side.',
    }),
    power: choice('Where does the power come from?', {
      lead: 'A long extension lead snaking away across the ground to somewhere with light.',
      battery: 'A car battery and a small inverter under the table.',
      solar: 'A small solar panel propped against the table leg, angled at the sun.',
      dead: 'Nowhere right now: the strip is dark and the plug lies loose. NEPA has taken light.',
    }),
    cards: score('How well stocked are the recharge cards?', ['A few last cards', 'One strip', 'Several strips pegged on a string', 'Curtains of card strips in every network colour']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const palette = { yellow: ['#f6c61a', '#1c1c1e'], green: ['#1f9a4a', '#f2f0e6'], red: ['#d42a24', '#f2f0e6'], blue: ['#3a9ad8', '#f2f0e6'], orange: ['#f07a1a', '#1c1c1e'], mixed: ['#f6c61a', '#d42a24'] }[a.brand];
    const ply = s.material('#c9a878'), wood = s.material('#8a6a44'), dark = s.material('#1e1e22'), white = s.material('#f0efe8');
    const live = a.power !== 'dead';

    // Table: plywood top on a rough frame, with a branded skirt and the sign.
    const tw = mix(1.15,1.55,a.tableWidth), td = 0.6, th = 0.76;
    s.box([tw, 0.025, td], [0, th, 0], ply);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.045, th, 0.045], [x * (tw / 2 - 0.05), th / 2, z * (td / 2 - 0.05)], wood);
    s.box([tw - 0.1, 0.03, 0.03], [0, 0.2, -td / 2 + 0.05], wood);
    const skirt = s.material(palette[0], { roughness: 0.8, side: THREE.DoubleSide });
    if(a.skirtStyle==='full'||a.skirtStyle==='half'){
      const h=a.skirtStyle==='full'?.5:.18;s.box([tw,h,.008],[0,th-.01-h/2,td/2+.004],skirt);
    }else if(a.skirtStyle==='slats')for(let i=0;i<10;i++)s.box([tw/12,.5,.025],[-tw/2+tw*(i+.5)/10,th-.26,td/2],skirt);
    s.box([tw, 0.07, 0.01], [0, th - 0.045, td / 2 + 0.006], s.material(palette[1]));
    if(a.skirtStyle==='full')for (const x of [-1, 1]) s.box([0.008, 0.5, td], [x * (tw / 2 + 0.004), th - 0.26, 0], skirt);
    const scrap = a.sign === 'back';
    const signW = scrap ? 0.5 : 0.95, signH = scrap ? 0.3 : 0.36;
    const signMat = lettering(SIGNS[a.sign], signW, signH, scrap ? '#1c1c1e' : pick(['#b3261e', '#1b3f8f', '#14141a']), scrap ? '#d8c8a0' : '#f4f0de', random);
    const sign = s.mesh(new THREE.PlaneGeometry(signW, signH), signMat, [scrap ? 0.15 : 0, th - 0.3, td / 2 + 0.014]);
    for(const x of[-signW*.36,signW*.36])s.rod([x,th,td/2+.018],[x,th-.3+signH/2,td/2+.018],.004,dark);
    sign.rotation.z = scrap ? -0.08 : (random() - 0.5) * 0.04;

    // Power strip and phones.
    const stripX = -0.1, stripZ = -0.17;
    s.box([0.5, 0.035, 0.07], [stripX, th + 0.03, stripZ], white);
    s.box([0.03, 0.012, 0.03], [stripX - 0.22, th + 0.052, stripZ], s.material('#d42a24', { emissive: '#ff3a2a', emissiveIntensity: live ? 1.6 : 0 }));
    const count = Math.round(mix(1, 22, a.phones * a.phones * 0.6 + a.phones * 0.4));
    const screens: THREE.MeshStandardMaterial[] = [];
    const cable = s.material('#e8e6de'), blackCable = s.material('#222226');
    const bodies = ['#1c1c20', '#2a2a30', '#b8bcc0', '#c8322a', '#1f4fb0', '#e8c020', '#f0efe8'];
    const cells=Array.from({length:12},(_,i)=>({smart:random()>.45,turn:(random()-.5)*.18,top:th+.0125}));
    for(let row=0;row<2;row++){
      const z=stripZ+.14+row*.17,lift=a.phoneSupport==='stepped'?(row===0?.07:.025):a.phoneSupport==='trays'?.018:0;
      if(lift){s.box([.78,lift,.16],[-.075,th+.0125+lift/2,z],ply);if(a.phoneSupport==='trays')for(const dz of[-.08,.08])s.box([.78,.018,.008],[-.075,th+.0125+lift+.009,z+dz],wood);}
      for(let col=0;col<6;col++){const cell=cells[row*6+col];cell.top+=lift;if(a.phoneSupport==='pads'){s.box([.105,.006,.15],[stripX-.3+col*.13,cell.top+.003,z],s.material('#927b68'));cell.top+=.006;}}
    }
    for (let i = 0; i < count; i++) {
      const col = i % 6, layer = Math.floor(i / 12);
      const row = Math.floor(i / 6) % 2;
      const x = stripX - .3 + col*.13, z = stripZ+.14+row*.17;
      const cell=cells[i%12],y=cell.top;
      const smart = cell.smart;
      const group = new THREE.Group();
      const size: P = smart ? [0.07, 0.01, 0.145] : [0.05, 0.016, 0.115];
      group.add(s.box(size, [0, 0, 0], s.material(pick(bodies), { roughness: 0.4 })));
      const lit = live && random() < 0.75;
      const screen = new THREE.MeshStandardMaterial({ color: lit ? '#bfe8c8' : '#15171a', emissive: lit ? pick(['#6affa0', '#a8d8ff', '#ffffff', '#ffe08a']) : '#000000', emissiveIntensity: lit ? 0.9 : 0, roughness: 0.2 });
      if (lit) screens.push(screen);
      group.add(s.box(smart ? [0.06, 0.003, 0.125] : [0.04, 0.003, 0.045], [0, size[1] / 2 + 0.001, smart ? 0 : -0.028], screen));
      if (!smart) for (let k = 0; k < 3; k++) group.add(s.box([0.036, 0.003, 0.008], [0, size[1] / 2 + 0.001, 0.01 + k * 0.016], s.material('#8a8e92')));
      if (a.phones > 0.7 && random() > 0.4) group.add(s.box([0.04, 0.003, 0.018], [0, size[1] / 2 + 0.003, smart ? 0.045 : 0.05], s.material('#e8dcb0')));
      group.position.set(x, y + size[1] / 2, z);
      group.rotation.y = cell.turn;
      s.root.add(group);
      group.updateMatrixWorld(true);cell.top=new THREE.Box3().setFromObject(group,true).max.y;
      const plug=group.localToWorld(new THREE.Vector3(0,0,-size[2]/2)).toArray() as P;
      const socket = stripX - 0.18 + (i % 5) * 0.09;
      s.tube([plug, [(x + socket) / 2 + (random() - 0.5) * 0.1, th + 0.035 + random() * 0.03, (z + stripZ) / 2], [socket, th + 0.06, stripZ]], 0.004, random() > 0.4 ? blackCable : cable);
      if (i < 5) s.box([0.035, 0.035, 0.035], [socket, th + 0.062, stripZ], random() > 0.5 ? white : dark);
    }
    // The ledger, a calculator, a cash tin with a padlock.
    s.box([0.2, 0.02, 0.15], [0.4, th + 0.024, 0.14], s.material('#27405a')).rotation.y = 0.2;
    s.box([0.19, 0.004, 0.14], [0.4, th + 0.036, 0.14], white).rotation.y = 0.2;
    s.box([0.07, 0.012, 0.11], [0.42, th + 0.02, -0.12], dark).rotation.y = -0.3;
    const cash=s.material('#5a6a5a',{metalness:.4}),brass=s.material('#c9a84a',{metalness:.8});
    if(a.cashStore==='drawer'){
      s.box([.29,.09,.23],[tw/2-.18,th-.065,-.12],wood);s.box([.06,.02,.025],[tw/2-.18,th-.065,.008],brass);
    }else{
      const w=a.cashStore==='tin'?.2:.26,h=a.cashStore==='lockbox'?.16:.11,z=-.2;
      s.box([w,h,.15],[.42,th+.0125+h/2,z],cash);s.ring(.015,.004,[.42,th+.0125+h*.45,z+.079],brass);
      if(a.cashStore==='case')s.tube([[.36,th+.0125+h,z],[.36,th+.07+h,z],[.48,th+.07+h,z],[.48,th+.0125+h,z]],.009,dark);
    }
    if(a.sideShelf!=='none'){
      const x=tw/2+.23,z=0,w=.44;
      if(a.sideShelf==='rack'){
        for(const dx of[-.19,.19])for(const dz of[-.21,.21])s.box([.025,1.05,.025],[x+dx,.525,z+dz],wood);
        for(const y of[.2,.58,.96]){s.box([w,.025,.47],[x,y,z],ply);for(let i=0;i<4;i++)s.box([.07,.04,.11],[x-.14+i*.095,y+.0325,z],s.material(palette[i%2]));}
      }else{
        s.box([w,.025,.45],[x,th,0],ply);for(const z of[-.18,.18])s.rod([tw/2-.03,th-.34,z],[x+.2,th-.014,z],.014,wood);
        if(a.sideShelf==='tray'){for(const dx of[-.21,.21])s.box([.014,.06,.45],[x+dx,th+.0425,0],wood);for(const dz of[-.22,.22])s.box([w,.06,.014],[x,th+.0425,dz],wood);}
        for(let i=0;i<4;i++)s.box([.065,.018,.13],[x-.15+i*.1,th+.0215,0],s.material(palette[i%2]));
      }
    }

    // Parasol, its pole lashed to the table.
    const rise=a.canopyProfile==='high'?.62:a.canopyProfile==='shallow'?.17:.38;
    const top = parasol(s,mix(1.1,1.55,a.canopySpan),rise,palette,()=>false,mix(0,.22,mood.wear),a.canopyProfile==='deep'?.32:a.canopyProfile==='shallow'?0:.16);
    const lean = new THREE.Group();
    lean.position.set(0.25, 0, -td / 2 - 0.06);
    lean.rotation.set((random() - 0.5) * 0.08, 0, (random() - 0.5) * 0.1);
    lean.add(s.rod([0, 0, 0], [0, 2+rise, 0], 0.022, s.material('#c9c6ba', { metalness: 0.5 })));
    top.position.y = 2.0;
    top.rotation.y = random();
    lean.add(top);
    s.root.add(lean);
    s.ring(0.2, 0.08, [0.25, 0.08, -td / 2 - 0.06], s.material('#232326', { roughness: 0.95 })).rotation.x = Math.PI / 2;
    s.cylinder(0.2, 0.2, 0.12, [0.25, 0.07, -td / 2 - 0.06], s.material('#a9a79c'), 14);
    // Card strips pegged on a string beneath the canopy.
    const strips = Math.round(mix(0, 9, a.cards));
    const cardColours = ['#f6c61a', '#1f9a4a', '#d42a24', '#3a9ad8', '#f07a1a', '#f2f0e6'];
    const stringY = 1.72;
    s.rod([-0.62, stringY, 0.1], [0.72, stringY, 0.1], 0.004, blackCable);
    s.rod([-0.62, stringY, 0.1], [-0.56, 0.78, 0.26], 0.012, wood);
    s.rod([0.72, stringY, 0.1], [0.56, 0.78, 0.26], 0.012, wood);
    const cardPoints: { at: P; size: number; color: string }[] = [];
    for (let i = 0; i < Math.max(1, strips); i++) {
      const x = strips <= 1 ? 0 : mix(-0.5, 0.6, i / (strips - 1));
      const long = strips === 0 ? 2 : 3 + Math.floor(random() * 5);
      const colour = pick(cardColours);
      for (let k = 0; k < long; k++) cardPoints.push({ at: [x, stringY - 0.05 - k * 0.075, 0.1 + (random() - 0.5) * 0.01], size: 1, color: colour });
    }
    s.scatter(new THREE.BoxGeometry(0.1, 0.068, 0.004), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), cardPoints);

    if(a.light!=='none'){
      const metal=s.material('#777f7d',{metalness:.45}),bulb=s.material('#e4d7a1',{emissive:'#e4d7a1',emissiveIntensity:live?1-mood.daylight:0});
      if(a.light==='strip'){s.box([.5,.025,.04],[0,stringY+.02,.1],metal);s.box([.47,.015,.03],[0,stringY+.003,.1],bulb);}
      else if(a.light==='lamp'){
        const x=-tw/2+.07,z=-.2;s.cylinder(.06,.06,.025,[x,th+.025,z],metal,16);s.tube([[x,th+.03,z],[x,th+.45,z],[x+.12,th+.52,z]],.009,metal);s.cylinder(.035,.075,.09,[x+.12,th+.475,z],metal,16);s.ball([.045,.025,.045],[x+.12,th+.417,z],bulb,12);
      }else{
        const lantern=new THREE.Group();lantern.add(s.cylinder(.07,.07,.15,[0,0,0],bulb,14));for(const y of[-.085,.085])lantern.add(s.cylinder(.08,.08,.02,[0,y,0],metal,14));
        lantern.add(s.ring(.065,.007,[0,.14,0],metal,Math.PI));lantern.position.set(.16,1.55,0);lean.add(lantern);lean.add(s.rod([0,1.8,0],[.16,1.76,0],.01,metal));lean.add(s.rod([.16,1.76,0],[.16,1.75,0],.007,metal));
      }
    }
    // Power source.
    if (a.power === 'lead' || a.power === 'dead') {
      const end: P = a.power === 'lead' ? [-1.45, 0.012, -0.5 - random() * 0.4] : [-0.9, 0.012, 0.5];
      s.tube([[stripX - 0.25, th + 0.03, stripZ], [-0.62, th - 0.1, -0.2], [-0.75, 0.05, -0.1], [-1.1, 0.012, 0.25 - random() * 0.3], [(end[0] - 1.1) / 2 - 0.1, 0.012, 0.05], end], 0.008, s.material('#e87a1c'));
      if (a.power === 'dead') s.box([0.06, 0.035, 0.05], end, white);
      else s.cylinder(0.14, 0.14, 0.07, [end[0] - 0.1, 0.035, end[2]], s.material('#e87a1c'), 14);
    }
    if (a.power === 'battery') {
      s.box([0.28, 0.2, 0.18], [-0.25, 0.1, -0.05], dark);
      s.box([0.28, 0.025, 0.18], [-0.25, 0.21, -0.05], s.material('#3a5aa8'));
      for (const x of [-0.1, 0.1]) s.cylinder(0.014, 0.014, 0.03, [-0.25 + x, 0.235, -0.05], s.material(x < 0 ? '#d42a24' : '#1c1c1e'), 8);
      s.box([0.22, 0.09, 0.14], [0.12, 0.045, -0.05], s.material('#8a8e92', { metalness: 0.5 }));
      s.box([0.02, 0.02, 0.005], [0.18, 0.06, 0.022], s.material('#3aff7a', { emissive: '#3aff7a', emissiveIntensity: 1.5 }));
      s.tube([[-0.15, 0.24, -0.05], [-0.02, 0.2, 0.0], [0.05, 0.08, -0.05]], 0.006, s.material('#d42a24'));
      s.tube([[0.2, 0.08, -0.05], [0.3, 0.4, -0.2], [stripX + 0.25, th + 0.03, stripZ]], 0.006, blackCable);
    }
    if (a.power === 'solar') {
      const panel = new THREE.Group();
      panel.add(s.box([0.62, 0.02, 0.42], [0, 0, 0], s.material('#b8bcc0', { metalness: 0.6 })));
      panel.add(s.box([0.58, 0.022, 0.38], [0, 0.002, 0], s.material('#1a2a5a', { roughness: 0.15, metalness: 0.3 })));
      for (let i = 1; i < 4; i++) panel.add(s.box([0.004, 0.024, 0.38], [-0.29 + i * 0.145, 0.003, 0], s.material('#8a94b0')));
      panel.position.set(-0.98, 0.24, 0.25);
      panel.rotation.set(0, 0.5, 0.9);
      s.root.add(panel);
      panel.updateMatrixWorld(true);panel.position.y-=new THREE.Box3().setFromObject(panel,true).min.y;panel.updateMatrixWorld(true);
      const brace=panel.localToWorld(new THREE.Vector3(-.2,-.01,0));s.rod([brace.x,brace.y,brace.z],[brace.x-.2,0,brace.z-.12],.012,wood);
      s.tube([[-0.9, 0.12, 0.2], [-0.7, 0.02, 0.0], [-0.62, 0.4, -0.2], [stripX - 0.25, th + 0.03, stripZ]], 0.006, blackCable);
    }

    // The stool.
    const sx = 0.05 + (random() - 0.5) * 0.2, sz = -1.0;
    const vendor=a.stool==='vendor'?figure(s,{height:1.6,pose:'sitting',style:'doll',hair:'cap',top:pick([palette[0],'#e8e2d0','#7a3a8a','#2f6fb0']),bottom:'#30383f',skin:pick(['#5a3a28','#6b4630','#4a2f20']),shoes:'#282b2b',face:'dots'}):null;
    let seatTop=.46;
    if(vendor){s.root.add(vendor.root);vendor.root.updateMatrixWorld(true);const hip=new THREE.Vector3();vendor.pelvis.getWorldPosition(hip);vendor.root.position.x+=sx-hip.x;vendor.root.position.z+=sz-hip.z;vendor.root.updateMatrixWorld(true);vendor.pelvis.getWorldPosition(hip);seatTop=hip.y-1.6*.045;}
    const stoolMat = s.material(pick(['#2a62c8', '#c8322a', '#2c8a56', '#f0f0e8', '#7a4a2a']));
    const stool = new THREE.Group();
    stool.add(s.cylinder(.17,.21,seatTop-.02,[0,(seatTop-.02)/2,0],stoolMat,12),s.cylinder(.18,.18,.02,[0,seatTop-.01,0],stoolMat,12));
    stool.position.set(sx, 0, sz);
    s.root.add(stool);
    if (a.stool === 'tipped') { stool.rotation.z = Math.PI / 2 - 0.12; stool.rotation.y = random() * 2; stool.position.set(sx + .3,.2,sz-.1);stool.updateMatrixWorld(true);stool.position.y-=new THREE.Box3().setFromObject(stool,true).min.y; }
    if (a.stool === 'empty') stool.position.z -= 0.25;
    if (a.stool === 'held') {
      s.box([0.26, 0.05, 0.22], [sx, 0.485, sz], s.material(pick(['#d86a9a', '#e0a020', '#3a8a8a'])));
      s.box([0.2, 0.15, 0.09], [sx + 0.02, 0.585, sz], s.material('#4a2a1a'));
      s.ring(0.07, 0.008, [sx + 0.02, 0.67, sz], s.material('#4a2a1a'), Math.PI);
    }
    if(vendor){
      const hip=new THREE.Vector3();vendor.pelvis.getWorldPosition(hip);
      const phoneAt=new THREE.Vector3(sx,hip.y+.25,sz+.34);
      const phone=new THREE.Group();phone.add(s.box([.075,.014,.13],[0,0,0],dark));
      const glow=s.material('#cfe8ff',{emissive:'#a8d8ff',emissiveIntensity:live?.5:0});phone.add(s.box([.062,.004,.11],[0,.009,0],glow));phone.position.copy(phoneAt);phone.rotation.x=-.5;s.root.add(phone);phone.updateMatrixWorld(true);
      const left=phone.localToWorld(new THREE.Vector3(.038,0,.02)),right=phone.localToWorld(new THREE.Vector3(-.038,0,.02));
      const gaps=[vendor.reach('left',left,{space:s.root}),vendor.reach('right',right,{space:s.root})];if(Math.max(...gaps)>1e-5)throw new Error('Kiosk vendor phone out of reach');vendor.lookAt(phoneAt,s.root);screens.push(glow);
      s.root.userData.poseAudit={gaps,seatTop,figureMinY:new THREE.Box3().setFromObject(vendor.root,true).min.y};
    }
    // Wear and crowding: scratched-off cards on the ground.
    const litter = Math.round((mood.wear * 0.5 + mood.density * 0.5) * 12);
    for (let i = 0; i < litter; i++) s.box([0.09, 0.003, 0.055], [(random() - 0.5) * 2.2, 0.002, 0.45 + random() * 0.7], s.material(pick(cardColours))).rotation.y = random() * 3;

    const sway = mix(0.004, 0.025, mood.energy), tilt = lean.rotation.z;
    const base = screens.map((screen) => screen.emissiveIntensity);
    return s.finish({
      update: (_dt, time) => {
        lean.rotation.z = tilt + Math.sin(time * 1.1) * sway;
        screens.forEach((screen, index) => { screen.emissiveIntensity = base[index] * (0.75 + 0.25 * Math.sin(time * (1.5 + mood.energy * 4) + index * 2.1)); });
      },
    });
  },
});
