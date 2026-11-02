import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = readonly [number, number, number];

const BOARDS = {
  staples: 'The monthly staples in neat chalk: rice, beans, sugar, oil, coffee, each with its ounces per person.',
  arrived: 'One excited headline, the chicken has arrived, with the day and the number per household.',
  nothing: 'The usual list with most lines struck through and NO HAY written across it.',
  eggs: 'Only eggs this week: five per person, underlined twice.',
  children: 'Milk for children under seven and compote for babies, the names of the months ticked off.',
  wiped: 'Wiped to a grey smear; nothing has been written up yet.',
} as const;
const LINES: Record<keyof typeof BOARDS, { head: string; rows: string[]; struck?: boolean; big?: string }> = {
  staples: { head: 'PRODUCTOS NORMADOS', rows: ['ARROZ ..... 7 lb', 'FRIJOLES .. 10 oz', 'AZUCAR .... 4 lb', 'ACEITE .... 1/2 lb', 'CAFE ...... 4 oz', 'SAL ....... 1 paq'] },
  arrived: { head: 'HOY', rows: ['1 lb x persona', 'nucleos 1 al 240', 'traer libreta'], big: 'LLEGO EL POLLO' },
  nothing: { head: 'PRODUCTOS NORMADOS', rows: ['ARROZ ..... 7 lb', 'FRIJOLES .. 10 oz', 'AZUCAR .... 4 lb', 'ACEITE .... 1/2 lb', 'CAFE ...... 4 oz'], struck: true, big: 'NO HAY' },
  eggs: { head: 'ESTA SEMANA', rows: ['5 x persona', 'hasta que alcance'], big: 'HUEVOS' },
  children: { head: 'NINOS  0 - 7', rows: ['LECHE .... 1 L diario', 'COMPOTA .. 14 u', 'YOGURT ... 7 a 13', 'E  F  M  A  M  J'] },
  wiped: { head: '', rows: [] },
};

export default defineThing({
  questions: {
    board: choice('What does the chalkboard list?', BOARDS),
    stock: score('How much stock is on the shelves?', ['Bare boards and one tin', 'A few lonely things spaced out to look like more', 'A thin month\'s delivery', 'Freshly delivered, as full as it ever gets']),
    state: choice('What is going on at the counter?', {
      serving: 'Open and serving: a scoop in the open sack, a paper cone of rice on the scale.',
      closed: 'Closed for the day: a CERRADO card hung up, a cloth thrown over the sacks.',
      delivery: 'The delivery has just come: sacks stacked high and a hand truck still standing there.',
      gone: 'Sold out before the queue ended: SE ACABO on a card, the sacks slumped and empty.',
    }),
    libreta: choice('What has been left on the counter?', {
      nothing: 'Nothing; the counter is wiped clean.',
      one: 'A single ration book lying open with a pencil across it.',
      queue: 'A row of ration books laid out in order, each one holding its owner\'s place in the queue.',
      money: 'A tin cash box and a few coins counted out.',
    }),
    scale: choice('What kind of balance is it?', {
      hanging: 'A dial scale hanging from a bracket with a brass pan on three chains.',
      beam: 'An old two-pan beam balance with a row of iron weights.',
      dial: 'A red enamel counter scale with a fan-shaped dial and a steel platter.',
    }),
    sacks: choice('What is in the open sack?', {
      rice: 'White rice.',
      beans: 'Black beans.',
      sugar: 'Coarse brown sugar.',
      peas: 'Yellow split peas.',
    }),
    paint: choice('How is the counter finished?', {
      bare: 'Bare wood, dark and polished by decades of elbows.',
      green: 'Pale hospital green, chipped back to the wood at the edges.',
      blue: 'Sky blue with a cream top edge, faded.',
      cream: 'Cream with a band of state red along the bottom.',
    }),
    counterTop: choice('What surface covers the counter?', {
      wood: 'Thick worn timber with a few narrow plank joints.',
      zinc: 'A dull zinc sheet folds over the front edge.',
      tiles: 'Small pale ceramic tiles with dark grout.',
      inlay: 'A broad timber top with a contrasting inset border.',
    }),
    packaging: choice('What dispenses wrapping beside the counter?', {
      none: 'No wrapping dispenser is fitted.',
      paper: 'A brown paper roll turns on a bracket at the counter end.',
      string: 'A large twine ball sits in an open metal holder.',
      bags: 'Folded paper bags hang from a narrow side rack.',
    }),
    shelfFront: choice('How are the shelf fronts arranged?', {
      plain: 'Plain exposed timber shelf edges.',
      lip: 'A raised timber lip runs along each shelf.',
      labels: 'Small cream label holders divide the shelf fronts.',
      rail: 'A thin retaining rail stands in front of the stock.',
    }),
    queueGuide: choice('What marks the waiting area?', {
      open: 'Open pavement in front of the counter.',
      rope: 'Two low posts carry a sagging queue rope.',
      rail: 'A short tubular rail guides the queue.',
      footprints: 'Three pairs of painted waiting marks run along the front.',
    }),
    wallFan: choice('What ventilation fan is mounted high on the wall?', {
      none: 'There is no electric fan.',
      round: 'A round three-bladed wall fan with a wire cage.',
      square: 'A square-framed extraction fan.',
      twin: 'Two small side-by-side circular fans.',
    }),
    highVent: choice('What opening is above the chalkboard?', {
      closed: 'The wall above the board is plain.',
      louvers: 'Three deep horizontal ventilation louvers.',
      lattice: 'A small lattice grille set into the wall.',
      transom: 'A narrow frosted-glass transom with a centre mullion.',
    }),
    floor: choice('What floor surrounds the counter and sacks?', {
      bare: 'The shop fittings stand on the scene ground.',
      terrazzo: 'A shallow cream terrazzo floor with dark flecks.',
      tiles: 'A floor of broad square ceramic tiles.',
      boards: 'Close parallel timber floorboards.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const wood = s.material('#7b5231'), worn = s.material('#a67c52'), darkWood = s.material('#3f2a1a'), dark = s.material('#1f1f1f');
    const brass = s.material('#c9a548', { metalness: 0.8, roughness: 0.35 }), steel = s.material('#aab0b0', { metalness: 0.7, roughness: 0.35 }), iron = s.material('#35383a', { metalness: 0.5, roughness: 0.6 });
    const burlap = s.material('#c7ae82', { roughness: 1 }), paper = s.material('#d9c39a', { roughness: 0.95 });
    const body = { bare: wood, green: s.material('#a9c7ae'), blue: s.material('#8fbcd6'), cream: s.material('#eadfc2') }[a.paint];
    const wall = s.material(mix(0.3, 0.7, mood.warmth) > 0.5 ? '#e6d3a8' : '#cfdcd6');

    // Counter: plank front, thick top, kick board.
    const CW = 2.3, CH = 0.95, CZ = 0.55;
    s.box([CW, CH - 0.06, 0.55], [0, (CH - 0.06) / 2, CZ], body);
    const topMaterial=a.counterTop==='zinc'?steel:a.counterTop==='tiles'?s.material('#e6e1d1'):a.paint==='blue'?s.material('#eadfc2'):worn;
    s.box([CW + 0.1, 0.06, 0.66], [0, CH - 0.03, CZ + 0.02], topMaterial);
    if(a.counterTop==='wood')for(const z of[CZ-.12,CZ+.09])s.box([CW+.09,.001,.004],[0,CH+.0005,z],darkWood);
    else if(a.counterTop==='zinc')s.box([CW+.1,.055,.012],[0,CH-.025,CZ+.355],steel);
    else if(a.counterTop==='tiles'){
      for(let i=1;i<12;i++)s.box([.004,.001,.65],[-1.2+i*.2,CH+.0005,CZ+.02],darkWood);
      for(const z of[CZ-.09,CZ+.13])s.box([2.39,.001,.004],[0,CH+.0005,z],darkWood);
    }else{
      for(const side of[-1,1]){s.box([CW-.04,.001,.014],[0,CH+.0005,CZ+.02+side*.27],darkWood);s.box([.014,.001,.54],[side*(CW/2-.02),CH+.0005,CZ+.02],darkWood);}
    }
    s.box([CW + 0.02, 0.12, 0.57], [0, 0.06, CZ], a.paint === 'cream' ? s.material('#b3352b') : darkWood);
    for (let i = 1; i < 12; i++) s.box([0.012, CH - 0.2, 0.01], [-CW / 2 + i * CW / 12, CH / 2 + 0.03, CZ + 0.278], darkWood);
    if (a.paint !== 'bare') for (let i = 0; i < 3 + Math.floor(mood.wear * 12); i++) s.box([0.05 + random() * 0.18, 0.03 + random() * 0.12, 0.008], [(random() - 0.5) * (CW - 0.2), random() < 0.5 ? CH - 0.1 - random() * 0.1 : 0.16 + random() * 0.15, CZ + 0.277], worn);

    // Back wall panel with shelves on the left and the chalkboard on the right.
    const BZ = -0.72, BH = 2.35;
    s.box([3.0, BH, 0.08], [0, BH / 2, BZ - 0.04], wall);
    s.box([3.06, 0.1, 0.14], [0, BH + 0.05, BZ - 0.02], darkWood);
    const SX = -0.5, SW = 1.9;
    for (const x of [SX - SW / 2, SX + SW / 2]) s.box([0.05, 2.0, 0.3], [x, 1.0, BZ + 0.15], wood);
    const levels = [0.5, 0.95, 1.4, 1.85];
    const stock = Math.min(1, a.stock * mix(0.7, 1.15, mood.density)) * (a.state === 'gone' ? 0.35 : 1);
    const tinColours = ['#b3352b', '#e3b62c', '#2f6f8f', '#e9e2cf', '#48834f', '#d9722b'];
    levels.forEach((y, level) => {
      const tilt=(random()-.5)*mood.wear*.03;
      s.box([SW, 0.035, 0.3], [SX, y, BZ + 0.15], wood).rotation.z = tilt;
      const shelfTop=(x:number)=>y+.0175/Math.cos(tilt)+(x-SX)*Math.tan(tilt);
      if(a.shelfFront==='lip')s.box([SW,.06,.018],[SX,y+.028,BZ+.305],wood).rotation.z=tilt;
      else if(a.shelfFront==='labels')for(let i=0;i<7;i++)s.box([.13,.055,.014],[SX-SW/2+.15+i*.26,shelfTop(SX-SW/2+.15+i*.26)-.027,BZ+.31],paper).rotation.z=tilt;
      else if(a.shelfFront==='rail'){
        s.rod([SX-SW/2,shelfTop(SX-SW/2)+.09,BZ+.31],[SX+SW/2,shelfTop(SX+SW/2)+.09,BZ+.31],.009,iron);
        for(const x of[SX-SW/2,SX,SX+SW/2])s.rod([x,shelfTop(x),BZ+.29],[x,shelfTop(x)+.09,BZ+.31],.008,iron);
      }
      const count = level === 1 && stock < 0.1 ? 1 : Math.round(stock * mix(4, 12, random()));
      let x = SX - SW / 2 + 0.12 + random() * 0.3;
      for (let i = 0; i < count && x < SX + SW / 2 - 0.12; i++) {
        const kind = Math.floor(random() * 5), z = BZ + 0.15 + (random() - 0.5) * 0.08, top = shelfTop(x);
        if (kind === 0) {
          const colour = pick(tinColours), stack = 1 + Math.floor(random() * 2.2);
          for (let k = 0; k < stack; k++) { s.cylinder(0.045, 0.045, 0.11, [x, top + 0.055 + k * 0.112, z], steel, 14); s.cylinder(0.0465, 0.0465, 0.075, [x, top + 0.055 + k * 0.112, z], s.material(colour), 14); }
          x += 0.11;
        } else if (kind === 1) {
          s.lathe([[0, 0], [0.04, 0], [0.04, 0.17], [0.015, 0.24], [0.015, 0.29], [0, 0.29]], s.material(pick(['#d9b22e', '#7a3d12', '#3d5a2a', '#e6e2d2']), { roughness: 0.25 }), [x, top, z]);
          x += 0.1;
        } else if (kind === 2) {
          const n = 1 + Math.floor(random() * 3);
          for (let k = 0; k < n; k++) s.box([0.16, 0.05, 0.1], [x + 0.03, top + 0.025 + k * 0.052, z], s.material(pick(['#e9e2cf', '#c9d8e6', '#e6c9c9'])));
          x += 0.2;
        } else if (kind === 3) {
          s.box([0.24, 0.035, 0.22], [x + 0.07, top + 0.018, z], s.material('#b9ad98'));
          for (let e = 0; e < 6; e++) s.ball([0.022, 0.028, 0.022], [x - 0.01 + (e % 3) * 0.08, top + 0.05, z - 0.04 + Math.floor(e / 3) * 0.08], s.material(random() < 0.5 ? '#f1e6d2' : '#d9b48a'), 8);
          x += 0.3;
        } else {
          s.box([0.1, 0.2, 0.07], [x, top + 0.1, z], s.material(pick(tinColours)));
          s.box([0.102, 0.06, 0.072], [x, top + 0.12, z], s.material('#f3eedf'));
          x += 0.13;
        }
        x += random() * mix(0.35, 0.04, stock);
      }
    });

    // Chalkboard, painted by hand.
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 448;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#26332c'; ctx.fillRect(0, 0, 512, 448);
    for (let i = 0; i < 26 + mood.wear * 60; i++) {
      ctx.fillStyle = `rgba(230,235,225,${0.02 + random() * 0.05})`;
      ctx.save(); ctx.translate(random() * 512, random() * 448); ctx.rotate(random() * 3); ctx.fillRect(-90, -14, 180 * random() + 40, 28 * random() + 6); ctx.restore();
    }
    const board = LINES[a.board];
    const chalk = (text: string, x: number, y: number, size: number, colour = '#f1f1ea', align: CanvasTextAlign = 'left') => {
      ctx.save(); ctx.translate(x, y); ctx.rotate((random() - 0.5) * 0.05);
      ctx.font = `${size}px "Comic Sans MS", "Segoe Print", cursive, sans-serif`; ctx.textAlign = align; ctx.fillStyle = colour; ctx.globalAlpha = mix(0.95, 0.7, mood.wear);
      ctx.fillText(text, 0, 0, 470); ctx.restore();
    };
    if (board.head) { chalk(board.head, 256, 58, 38, '#f5e79a', 'center'); ctx.fillStyle = '#f5e79a'; ctx.fillRect(60, 72, 392, 3); }
    const bigFirst = board.big && !board.struck;
    if (bigFirst) chalk(board.big!, 256, 170, 74, mood.cheer > 0.5 ? '#ffd0d8' : '#f1f1ea', 'center');
    board.rows.forEach((row, index) => {
      const y = (bigFirst ? 240 : 125) + index * (bigFirst ? 52 : 54);
      chalk(row, bigFirst ? 256 : 40, y, bigFirst ? 34 : 36, '#f1f1ea', bigFirst ? 'center' : 'left');
      if (board.struck && (index !== 2 || random() < 0.5)) { ctx.strokeStyle = '#f1f1ea'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(30, y - 12 + random() * 6); ctx.lineTo(470, y - 14 + random() * 8); ctx.stroke(); }
    });
    if (board.struck) { ctx.save(); ctx.translate(256, 290); ctx.rotate(-0.22); ctx.font = 'bold 120px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff9d8a'; ctx.fillText(board.big!, 0, 0); ctx.restore(); }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const BX = 0.98, BY = 1.62;
    if(a.highVent!=='closed'){
      s.box([.79,.19,.018],[BX,2.18,BZ+.014],dark);
      if(a.highVent==='louvers')for(let i=0;i<3;i++)s.box([.76,.065,.045],[BX,2.115+i*.065,BZ+.055],wood).rotation.x=.35;
      else if(a.highVent==='lattice'){
        for(let i=0;i<9;i++)s.box([.014,.18,.02],[BX-.35+i*.0875,2.18,BZ+.03],wood);
        for(const dy of[-.06,0,.06])s.box([.77,.014,.02],[BX,2.18+dy,BZ+.035],wood);
      }else{
        s.box([.76,.16,.012],[BX,2.18,BZ+.028],s.material('#b7c8c4',{roughness:.65}));s.box([.026,.18,.022],[BX,2.18,BZ+.04],wood);
      }
    }
    const rotors:THREE.Group[]=[];
    if(a.wallFan!=='none')for(const x of(a.wallFan==='twin'?[-1.16,-.82]:[-1.02])){
      const r=a.wallFan==='twin'?.13:.19,y=2.19,z=BZ+.39;
      s.rod([x,y-.12,BZ],[x,y,z],.025,iron);
      const rotor=new THREE.Group();rotor.position.set(x,y,z);s.root.add(rotor);rotors.push(rotor);
      for(let i=0;i<3;i++){const blade=new THREE.Mesh(new THREE.BoxGeometry(r*.95,r*.28,.012),steel);const t=i*Math.PI*2/3;blade.position.set(Math.cos(t)*r*.42,Math.sin(t)*r*.42,0);blade.rotation.z=t+.35;blade.castShadow=true;rotor.add(blade);}
      s.cylinder(r*.16,r*.16,.055,[x,y,z],iron,12).rotation.x=Math.PI/2;
      if(a.wallFan==='square')for(const side of[-1,1]){s.box([r*2.2,.025,.06],[x,y+side*r*1.05,z],iron);s.box([.025,r*2.2,.06],[x+side*r*1.05,y,z],iron);}
      else s.ring(r,.012,[x,y,z+.025],iron);
      for(let i=0;i<4;i++){const t=i*Math.PI/4;s.rod([x-Math.cos(t)*r,y-Math.sin(t)*r,z+.04],[x+Math.cos(t)*r,y+Math.sin(t)*r,z+.04],.004,iron);}
    }
    s.box([0.94, 0.84, 0.035], [BX, BY, BZ + 0.02], wood).rotation.z = (random() - 0.5) * 0.05;
    const slate = s.mesh(new THREE.PlaneGeometry(0.86, 0.75), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 }), [BX, BY, BZ + 0.04]);
    slate.castShadow = false;
    s.box([0.3, 0.02, 0.05], [BX, BY - 0.42, BZ + 0.06], wood);
    s.box([0.07, 0.018, 0.02], [BX - 0.06, BY - 0.4, BZ + 0.065], s.material('#f4f4ee'));
    s.box([0.09, 0.03, 0.04], [BX + 0.07, BY - 0.395, BZ + 0.065], s.material('#8a8f88'));
    // Under the board: a crate of empties and a hook with an apron.
    s.box([0.5, 0.3, 0.34], [BX, 0.15, BZ + 0.2], s.material('#8d6a3f'));
    for (let i = 0; i < 6; i++) if (random() < 0.4 + stock * 0.6) s.lathe([[0, 0], [0.032, 0], [0.032, 0.13], [0.012, 0.19], [0.012, 0.23]], s.material(pick(['#5a3415', '#3d6b3a', '#c9d6d6']), { roughness: 0.25 }), [BX - 0.16 + (i % 3) * 0.16, 0.2, BZ + 0.12 + Math.floor(i / 3) * 0.16]);
    s.rod([BX - 0.3, 1.05, BZ], [BX - 0.3, 1.05, BZ + 0.06], 0.008, iron);
    s.box([0.3, 0.5, 0.03], [BX - 0.3, 0.8, BZ + 0.05], s.material(a.state === 'closed' ? '#e9e6dc' : '#d9d2bf')).rotation.z = 0.04;

    // The balance.
    const swing = new THREE.Group();
    const add = (group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, at: P, rot?: P) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at); if (rot) mesh.rotation.set(...rot);
      mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
    };
    const SXc = -0.72, top = CH;
    let pan: P = [SXc, top + 0.3, CZ];
    const heap = s.material({ rice: '#f3efe2', beans: '#1d1a1c', sugar: '#b98a4e', peas: '#dcb93c' }[a.sacks], { roughness: 1 });
    if (a.scale === 'hanging') {
      s.box([0.14, 0.03, 0.14], [SXc - 0.3, top + 0.015, CZ - 0.12], iron);
      s.rod([SXc - 0.3, top, CZ - 0.12], [SXc - 0.3, top + 1.0, CZ - 0.12], 0.016, iron);
      s.rod([SXc - 0.3, top + 0.98, CZ - 0.12], [SXc, top + 1.0, CZ + 0.05], 0.013, iron);
      s.rod([SXc - 0.3, top + 0.7, CZ - 0.12], [SXc - 0.1, top + 0.99, CZ - 0.01], 0.008, iron);
      swing.position.set(SXc, top + 1.0, CZ + 0.05);
      add(swing, new THREE.CylinderGeometry(0.004, 0.004, 0.1, 6), iron, [0, -0.05, 0]);
      add(swing, new THREE.CylinderGeometry(0.11, 0.11, 0.05, 24), brass, [0, -0.21, 0], [Math.PI / 2, 0, 0]);
      add(swing, new THREE.CylinderGeometry(0.095, 0.095, 0.052, 24), s.material('#f4f0e2'), [0, -0.21, 0.002], [Math.PI / 2, 0, 0]);
      add(swing, new THREE.BoxGeometry(0.008, 0.085, 0.004), dark, [0.02, -0.19, 0.03], [0, 0, -0.5 - random()]);
      for (let i = 0; i < 3; i++) {
        const u = new THREE.Vector3(0, -0.32, 0), v = new THREE.Vector3(Math.sin(i * 2.094) * 0.15, -0.66, Math.cos(i * 2.094) * 0.15), d = v.clone().sub(u);
        add(swing, new THREE.CylinderGeometry(0.003, 0.003, d.length(), 5), brass, u.clone().add(v).multiplyScalar(0.5).toArray() as [number, number, number]).quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      }
      add(swing, new THREE.LatheGeometry([[0, 0], [0.1, 0.01], [0.16, 0.05], [0.165, 0.06]].map(([x, y]) => new THREE.Vector2(x, y)), 24), new THREE.MeshStandardMaterial({ color: '#c9a548', metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }), [0, -0.72, 0]);
      add(swing, new THREE.CylinderGeometry(0.006, 0.006, 0.07, 6), iron, [0, -0.29, 0]);
      if (a.state === 'serving') { add(swing, new THREE.ConeGeometry(0.075, 0.2, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#d9c39a', side: THREE.DoubleSide, roughness: 0.9 }), [0, -0.62, 0], [Math.PI, 0, 0]); add(swing, new THREE.SphereGeometry(0.07, 10, 6, 0, 6.3, 0, 1.4), heap, [0, -0.56, 0]); }
      swing.rotation.z = (random() - 0.5) * 0.12;
      s.root.add(swing);
    } else if (a.scale === 'beam') {
      s.box([0.5, 0.05, 0.2], [SXc, top + 0.025, CZ], darkWood);
      s.cylinder(0.015, 0.025, 0.36, [SXc, top + 0.23, CZ], brass, 12);
      const tilt = (random() - 0.5) * 0.4;
      s.rod([SXc - Math.cos(tilt) * 0.3, top + 0.4 - Math.sin(tilt) * 0.3, CZ], [SXc + Math.cos(tilt) * 0.3, top + 0.4 + Math.sin(tilt) * 0.3, CZ], 0.01, brass);
      for (const k of [-1, 1]) {
        const px = SXc + k * Math.cos(tilt) * 0.3, py = top + 0.4 + k * Math.sin(tilt) * 0.3;
        for (let i = 0; i < 3; i++) s.rod([px, py, CZ], [px + Math.sin(i * 2.094) * 0.1, py - 0.26, CZ + Math.cos(i * 2.094) * 0.1], 0.003, brass);
        s.lathe([[0, 0], [0.08, 0.008], [0.115, 0.035]], new THREE.MeshStandardMaterial({ color: '#c9a548', metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }), [px, py - 0.29, CZ]);
        if (k === 1) pan = [px, py - 0.27, CZ];
        else s.cylinder(0.035, 0.04, 0.06, [px, py - 0.25, CZ], iron, 12);
      }
      for (let i = 0; i < 5; i++) s.cylinder(0.018 + i * 0.006, 0.02 + i * 0.007, 0.03 + i * 0.012, [SXc - 0.42 - i * 0.075 + 0.6, top + 0.015 + i * 0.006, CZ + 0.2], iron, 12);
      if (a.state === 'serving') s.ball([0.08, 0.05, 0.08], [pan[0], pan[1] + 0.02, pan[2]], heap, 10);
    } else {
      const red = s.material('#b3312a', { roughness: 0.4 });
      s.box([0.34, 0.12, 0.3], [SXc, top + 0.06, CZ], red);
      s.box([0.1, 0.3, 0.08], [SXc, top + 0.25, CZ - 0.1], red);
      const fan = s.mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.07, 24, 1, false, -0.7, 1.4), red, [SXc, top + 0.3, CZ - 0.1]);
      fan.rotation.x = Math.PI / 2;
      const face = s.mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.072, 24, 1, false, -0.62, 1.24), s.material('#f4f0e2'), [SXc, top + 0.3, CZ - 0.098]);
      face.rotation.x = Math.PI / 2;
      s.box([0.006, 0.2, 0.004], [SXc, top + 0.42, CZ - 0.06], dark).rotation.z = (random() - 0.5) * 0.9;
      s.cylinder(0.02, 0.02, 0.05, [SXc, top + 0.14, CZ + 0.04], steel, 10);
      s.lathe([[0, 0], [0.15, 0.005], [0.17, 0.03]], new THREE.MeshStandardMaterial({ color: '#b8bebe', metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }), [SXc, top + 0.165, CZ + 0.04]);
      pan = [SXc, top + 0.18, CZ + 0.04];
      if (a.state === 'serving') s.ball([0.09, 0.05, 0.09], [pan[0], pan[1] + 0.01, pan[2]], heap, 10);
    }

    // On the counter.
    s.box([0.22, 0.05 + random() * 0.05, 0.16], [0.95, top + 0.04, CZ - 0.12], paper).rotation.y = (random() - 0.5) * 0.3;
    const bookColours = ['#d9cba6', '#c9b79a', '#b9c7b4', '#d9b9a8', '#c2c6cf'];
    const book = (x: number, z: number, yaw: number, open: boolean) => {
      if (open) {
        for (const k of [-1, 1]) s.box([0.1, 0.006, 0.14], [x + k * 0.052, top + 0.006, z], s.material('#f1ead4')).rotation.set(0, yaw, k * 0.08);
        for (let i = 0; i < 5; i++) s.box([0.07, 0.001, 0.004], [x - 0.052, top + 0.011, z - 0.045 + i * 0.022], s.material('#5b6b8a')).rotation.y = yaw;
        s.rod([x - 0.02, top + 0.016, z + 0.05], [x + 0.11, top + 0.016, z - 0.03], 0.004, s.material('#e2b322'));
      } else {
        const cover = s.box([0.1, 0.012, 0.14], [x, top + 0.006, z], s.material(pick(bookColours)));
        cover.rotation.y = yaw;
        s.box([0.06, 0.002, 0.02], [x, top + 0.013, z - 0.03], dark).rotation.y = yaw;
      }
    };
    if (a.libreta === 'one') book(0.2 + random() * 0.3, CZ + 0.12, (random() - 0.5) * 0.6, true);
    else if (a.libreta === 'queue') { const n = Math.round(mix(4, 11, mood.density)); for (let i = 0; i < n; i++) book(-0.25 + i * 0.125, CZ + 0.22 + (random() - 0.5) * 0.03, (random() - 0.5) * 0.25, false); }
    else if (a.libreta === 'money') {
      s.box([0.24, 0.08, 0.16], [0.35, top + 0.04, CZ + 0.05], s.material('#4d6a5a', { metalness: 0.5, roughness: 0.5 })).rotation.y = 0.2;
      s.box([0.24, 0.01, 0.16], [0.35, top + 0.15, CZ - 0.02], s.material('#4d6a5a', { metalness: 0.5, roughness: 0.5 })).rotation.set(-1.1, 0.2, 0);
      for (let i = 0; i < 7; i++) s.cylinder(0.012, 0.012, 0.003, [0.55 + random() * 0.18, top + 0.002, CZ + 0.12 + random() * 0.12], brass, 10);
    }
    const card = (text: string) => {
      const sign = s.label(text, 0.62, 0.22, [0.25, CH - 0.34, CZ + 0.29], '#a3241c', '#f1ead4');
      sign.rotation.z = (random() - 0.5) * 0.14;
      for (const k of [-1, 1]) s.rod([0.25 + k * 0.26, CH - 0.24, CZ + 0.288], [0.25, CH - 0.06, CZ + 0.288], 0.003, dark);
    };
    if (a.state === 'closed') card('CERRADO');
    if (a.state === 'gone') card('SE ACABO');

    // Sacks on the floor at the end of the counter.
    const sackAt = (x: number, z: number, full: number, open: boolean) => {
      const h = mix(0.22, 0.62, full), r = 0.24;
      s.lathe([[0, 0], [r * 0.85, 0.01], [r, h * 0.3], [r * 0.95, h * 0.8], [r * 0.82, h], [r * 0.9, h + 0.04], [r * 0.8, h + 0.05]], new THREE.MeshStandardMaterial({ color: (burlap as THREE.MeshStandardMaterial).color, roughness: 1, side: THREE.DoubleSide }), [x, 0, z]).scale.set(1, 1, mix(0.8, 1, random()));
      if (open) s.cylinder(r * 0.8, r * 0.8, 0.02, [x, h - 0.03, z], heap, 18);
      else s.ball([r * 0.84, 0.07, r * 0.8], [x, h, z], burlap, 12);
      return h;
    };
    const fullness = a.state === 'gone' ? 0.08 : mix(0.35, 1, stock);
    const ox = 1.5, oz = 0.72;
    const h0 = sackAt(ox, oz, fullness, a.state !== 'closed');
    sackAt(ox + 0.42, oz - 0.38, a.state === 'gone' ? 0.05 : mix(0.3, 1, random()), false);
    if (stock > 0.4 || a.state === 'delivery') sackAt(ox - 0.05, oz - 0.55, mix(0.5, 1, random()), false);
    if (a.state === 'serving') {
      s.rod([ox + 0.05, h0 - 0.02, oz], [ox + 0.2, h0 + 0.2, oz + 0.1], 0.012, wood);
      s.cylinder(0.05, 0.04, 0.1, [ox + 0.04, h0 - 0.01, oz - 0.01], steel, 12).rotation.z = 0.9;
    }
    if (a.state === 'closed') {
      const cloth = s.ball([0.5, 0.06, 0.5], [ox + 0.1, Math.max(h0, 0.3) + 0.06, oz - 0.2], s.material(mood.cheer > 0.5 ? '#d9a23a' : '#8f9a8e', { roughness: 1 }), 14);
      cloth.rotation.z = 0.08;
    }
    if (a.state === 'delivery') {
      const lying = (x: number, y: number, z: number, yaw: number) => { const sack = s.ball([0.38, 0.11, 0.24], [x, y, z], burlap, 14); sack.rotation.y = yaw; s.box([0.2, 0.004, 0.14], [x, y + 0.108, z], s.material('#6f7fa6')).rotation.y = yaw; };
      const n = Math.round(mix(4, 8, mood.density));
      for (let i = 0; i < n; i++) lying(-1.75 + (i % 2) * 0.08, 0.11 + i * 0.19, 0.7 + (random() - 0.5) * 0.08, (random() - 0.5) * 0.4 + (i % 2 ? Math.PI / 2 : 0) * 0.15);
      const tx = -1.75, tz = 1.5;
      for (const k of [-1, 1]) { s.rod([tx + k * 0.2, 0.13, tz], [tx + k * 0.2, 1.2, tz + 0.5], 0.015, s.material('#3f6fae')); const w = s.cylinder(0.13, 0.13, 0.05, [tx + k * 0.26, 0.13, tz + 0.04], dark, 16); w.rotation.z = Math.PI / 2; }
      s.box([0.46, 0.015, 0.25], [tx, 0.0075, tz - 0.12], s.material('#3f6fae'));
      for (const side of [-1, 1]) s.rod([tx + side * .2, .015, tz], [tx + side * .2, .13, tz], .015, s.material('#3f6fae'));
      for (const t of [0.35, 0.7, 1]) s.rod([tx - 0.2, 0.13 + t * 1.07, tz + t * 0.5], [tx + 0.2, 0.13 + t * 1.07, tz + t * 0.5], 0.012, s.material('#3f6fae'));
      lying(tx, 0.125, tz - 0.14, Math.PI / 2);
    }

    if(a.packaging!=='none'){
      const x=-CW/2-.15,y=.79,z=CZ;
      for(const dz of[-.19,.19])s.rod([-CW/2,y-.12,z+dz],[x,y,z+dz],.018,iron);
      if(a.packaging==='paper'){
        s.cylinder(.09,.09,.32,[x,y,z],paper,18).rotation.x=Math.PI/2;s.rod([x,y,z-.21],[x,y,z+.21],.015,iron);
        s.box([.012,.23,.3],[x-.085,y-.12,z],paper);
      }else if(a.packaging==='string'){
        s.box([.22,.018,.28],[x,y-.1,z],iron);s.ball([.085,.09,.085],[x,y-.001,z],burlap,14);
        for(const dz of[-.12,.12])s.rod([x-.1,y-.09,z+dz],[x-.1,y+.08,z+dz],.008,iron);
        s.tube([[x-.04,y+.08,z],[x-.11,y+.03,z+.13],[x-.11,y-.23,z+.13]],.003,burlap);
      }else{
        s.rod([x,y+.12,z-.2],[x,y+.12,z+.2],.012,iron);
        for(let i=0;i<5;i++)s.box([.025,.26,.13],[x-.035+i*.014,y-.025,z-.12+i*.06],paper);
      }
    }
    if(a.queueGuide==='rope'||a.queueGuide==='rail'){
      const z=1.34,y=.76;
      for(const x of[-.9,.9]){s.cylinder(.11,.14,.035,[x,.0175,z],iron,16);s.rod([x,.035,z],[x,y,z],.018,iron);}
      if(a.queueGuide==='rope')s.tube([[-.9,y,z],[0,y-.16,z],[.9,y,z]],.014,burlap);
      else s.rod([-.9,y,z],[.9,y,z],.025,steel);
    }else if(a.queueGuide==='footprints')for(let i=0;i<3;i++)for(const side of[-1,1])s.box([.07,.002,.19],[-.7+i*.7+side*.09,.001,1.35],paper);
    if(a.floor!=='bare'){
      const shop=new THREE.Group();for(const child of[...s.root.children])shop.add(child);s.root.add(shop);shop.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(shop,true),c=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),h=.035;shop.position.y+=h;
      const tile=s.material('#c2bcab');s.box([size.x+.18,h,size.z+.18],[c.x,h/2,c.z],tile);
      if(a.floor==='terrazzo'){
        const g=new THREE.BoxGeometry(.024,.001,.012),m=new THREE.InstancedMesh(g,dark,90);
        for(let i=0;i<90;i++)m.setMatrixAt(i,new THREE.Matrix4().makeRotationY(random()*Math.PI).setPosition(c.x+(random()-.5)*(size.x+.16),h+.0005,c.z+(random()-.5)*(size.z+.16)));s.root.add(m);
      }else{
        const cols=Math.ceil((size.x+.16)/(a.floor==='boards'?.16:.42)),rows=a.floor==='boards'?1:Math.ceil((size.z+.16)/.42),w=(size.x+.16)/cols,d=(size.z+.16)/rows,m=new THREE.InstancedMesh(new THREE.BoxGeometry(w-.006,.012,d-.006),a.floor==='boards'?worn:tile,cols*rows);
        for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)m.setMatrixAt(i*rows+j,new THREE.Matrix4().makeTranslation(c.x-(size.x+.16)/2+(i+.5)*w,h+.006,c.z-(size.z+.16)/2+(j+.5)*d));m.castShadow=true;m.receiveShadow=true;s.root.add(m);shop.position.y+=.012;
      }
    }
    const sway = mix(0.01, 0.12, mood.energy), phase = random() * 6, rest = swing.rotation.z;
    return s.finish({ update: a.scale === 'hanging'||rotors.length ? (_dt, time) => {if(a.scale==='hanging'){swing.rotation.z = rest + Math.sin(time * 2.2 + phase) * sway; swing.rotation.x = Math.cos(time * 1.7 + phase) * sway * 0.5;}for(const rotor of rotors)rotor.rotation.z=time*mix(1,8,mood.energy); } : undefined });
  },
});
