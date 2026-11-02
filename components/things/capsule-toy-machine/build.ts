import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PRIZES = {
  cats: 'Tiny cat figurines in silly poses; warm oranges, creams and greys.',
  food: 'Miniature rice balls, sushi and ramen bowls; red, white and nori black.',
  mascots: 'Round pastel mascot keychains with blushing cheeks; pink, mint and lilac.',
  trains: 'Little commuter trains and station signs; blue, silver and signal green.',
  gems: 'Plastic rings and fake jewels that glitter; violet, gold and turquoise.',
  mystery: 'Unmarked black and gold capsules behind a big question mark; nobody knows.',
} as const;
type Prize = keyof typeof PRIZES;
const PALETTE: Record<Prize, string[]> = {
  cats: ['#f08a2c', '#f4d9a8', '#8c8f96', '#3d3a38', '#ffb347'],
  food: ['#e0362c', '#f7f3e6', '#2b2f2a', '#f2b632', '#ef7f5b'],
  mascots: ['#ff8fb8', '#8fe0c6', '#c2a3f2', '#ffe27a', '#8fc8ff'],
  trains: ['#2f6fd0', '#c9d0d6', '#2fae62', '#e8483c', '#f2c230'],
  gems: ['#8a45d6', '#f0b93a', '#2cc6c0', '#e84f9a', '#4a6cf0'],
  mystery: ['#1d1d22', '#d9a93a', '#2a2a33', '#b8872a', '#3a3340'],
};
const CARD: Record<Prize, [string, string]> = {
  cats: ['#ffd27a', '#e8742a'], food: ['#fff3d6', '#d8382c'], mascots: ['#ffc2dc', '#7a5fd0'],
  trains: ['#cfe6ff', '#1f58b8'], gems: ['#2b1b52', '#f2c84a'], mystery: ['#15151a', '#e0b040'],
};
const BODIES = {
  white: 'Clean white plastic with red trim, the standard arcade issue.',
  red: 'Glossy fire-engine red.',
  blue: 'Deep toy-shop blue.',
  yellow: 'Sunny yellow, a little sun-bleached.',
  pink: 'Pastel pink, sweet and girlish.',
  mixed: 'Every unit a different colour, bought second-hand over the years.',
} as const;
const BODY: Record<Exclude<keyof typeof BODIES, 'mixed'>, string> = {
  white: '#f1efe8', red: '#d9352c', blue: '#2a56b8', yellow: '#f0c330', pink: '#f6a8c4',
};

function texture(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function drawIcon(g: CanvasRenderingContext2D, prize: Prize, x: number, y: number, r: number, ink: string, pale: string) {
  g.save(); g.translate(x, y); g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = r * 0.14; g.lineJoin = 'round';
  if (prize === 'cats') {
    g.beginPath(); g.arc(0, r * 0.1, r * 0.8, 0, Math.PI * 2); g.fill();
    for (const side of [-1, 1]) { g.beginPath(); g.moveTo(side * r * 0.78, -r * 0.15); g.lineTo(side * r * 0.72, -r * 0.95); g.lineTo(side * r * 0.2, -r * 0.6); g.fill(); }
    g.fillStyle = pale; for (const side of [-1, 1]) { g.beginPath(); g.arc(side * r * 0.32, 0, r * 0.12, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.moveTo(-r * 0.1, r * 0.3); g.lineTo(r * 0.1, r * 0.3); g.lineTo(0, r * 0.42); g.fill();
  } else if (prize === 'food') {
    g.beginPath(); g.moveTo(0, -r * 0.85); g.quadraticCurveTo(r * 1.1, r * 0.8, r * 0.7, r * 0.8); g.lineTo(-r * 0.7, r * 0.8); g.quadraticCurveTo(-r * 1.1, r * 0.8, 0, -r * 0.85); g.fillStyle = '#fffdf4'; g.fill(); g.stroke();
    g.fillStyle = '#1f2420'; g.fillRect(-r * 0.36, r * 0.2, r * 0.72, r * 0.62);
  } else if (prize === 'mascots') {
    g.beginPath(); g.ellipse(0, r * 0.1, r * 0.9, r * 0.75, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = pale; for (const side of [-1, 1]) { g.beginPath(); g.arc(side * r * 0.3, 0, r * 0.1, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ff7fa8'; for (const side of [-1, 1]) { g.beginPath(); g.arc(side * r * 0.55, r * 0.28, r * 0.13, 0, Math.PI * 2); g.fill(); }
  } else if (prize === 'trains') {
    g.beginPath(); g.roundRect(-r, -r * 0.6, r * 2, r * 1.2, r * 0.25); g.fill();
    g.fillStyle = pale; for (let i = 0; i < 3; i++) g.fillRect(-r * 0.8 + i * r * 0.58, -r * 0.4, r * 0.44, r * 0.4);
    g.fillStyle = '#2fae62'; g.fillRect(-r, r * 0.15, r * 2, r * 0.14);
    g.fillStyle = '#22242a'; for (const side of [-1, 1]) { g.beginPath(); g.arc(side * r * 0.55, r * 0.68, r * 0.18, 0, Math.PI * 2); g.fill(); }
  } else if (prize === 'gems') {
    g.beginPath(); g.moveTo(-r * 0.9, -r * 0.2); g.lineTo(-r * 0.5, -r * 0.75); g.lineTo(r * 0.5, -r * 0.75); g.lineTo(r * 0.9, -r * 0.2); g.lineTo(0, r * 0.9); g.closePath(); g.fill();
    g.strokeStyle = pale; g.lineWidth = r * 0.07; g.beginPath(); g.moveTo(-r * 0.9, -r * 0.2); g.lineTo(r * 0.9, -r * 0.2); g.moveTo(-r * 0.3, -r * 0.2); g.lineTo(0, r * 0.9); g.lineTo(r * 0.3, -r * 0.2); g.stroke();
  } else {
    g.font = `bold ${r * 2.2}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, r * 0.1);
  }
  g.restore();
}

export default defineThing({
  questions: {
    handle: choice('What handle turns the capsule mechanism?', { bar: 'A broad straight bar.', cross: 'A three-spoke crank.', wheel: 'A small handwheel with three spokes.', lever: 'A short offset lever with a round grip.' }),
    chuteDoor: choice('How is the prize chute closed?', { flap: 'A clear flap hanging nearly closed.', lifted: 'A clear flap held partly open.', split: 'Two narrow clear flaps.', open: 'An uncovered recessed prize pocket.' }),
    cardLayout: choice('How is the prize series shown on its card?', { pair: 'Two large prize illustrations.', grid: 'A grid of six small prize illustrations.', hero: 'One large illustration with a numbered series mark.', ticket: 'One illustration beside a block of ticket-like stripes.' }),
    standFoot: choice('What supports the cabinet?', { casters: 'Small swivel castors.', pads: 'Four round rubber pads.', rails: 'Two low sled rails.', feet: 'Four short tapered metal feet.' }),
    lidStyle: choice('How are the top lids made?', { flat: 'Plain flat plastic lids.', ridged: 'Plastic lids with parallel raised ridges.', bevel: 'Lids with sloping bevelled shoulders.', bolts: 'Flat lids secured with visible round fasteners.' }),
    sidePanel: choice('What detail appears on the cabinet sides?', { plain: 'Plain plastic side panels.', vent: 'Small inset ventilation grilles.', service: 'A rectangular service panel with a key lock.', stripe: 'Two contrasting trim stripes.' }),
    bank: choice('How many machines stand together?', {
      single: 'One machine alone on a low stand, easy to miss.',
      pair: 'Two stacked, one on top of the other: the usual corner pair.',
      four: 'Four in a two-by-two block.',
      wall: 'Six in a wall three wide and two high, a small temptation of choice.',
    }),
    prize: choice('What do the capsules in the main machine hold?', PRIZES),
    fill: score('How full are the bins?', ['A few capsules rolling on the bottom', 'A third left', 'Half full', 'Heaped to the lid']),
    body: choice('What colour are the machine bodies?', BODIES),
    price: choice('What does a turn cost?', {
      hundred: 'One hundred yen, a single coin.',
      two: 'Two hundred yen.',
      three: 'Three hundred yen, the modern going rate.',
      five: 'Five hundred yen, premium prizes.',
    }),
    state: choice('What state is it in right now?', {
      waiting: 'Stocked and waiting, crank at rest.',
      soldout: 'One bin is empty and wears a red SOLD OUT tag.',
      jammed: 'Out of order: a taped paper notice and tape across the coin slot.',
      opened: 'Someone just played: two opened capsule halves and a tiny prize lie on the ground in front.',
    }),
    tray: noul('Is one forgotten capsule still sitting in the prize chute?'),
    topper: noul('Is there a basket for empty capsule shells on top?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [cols, rows] = ({ single: [1, 1], pair: [1, 2], four: [2, 2], wall: [3, 2] } as const)[a.bank];
    const W = 0.42, D = 0.4, BODY_H = 0.3, BIN_H = 0.38, UNIT = BODY_H + BIN_H + 0.03, BASE = a.bank === 'single' ? 0.42 : 0.12;
    const prizes = Object.keys(PRIZES) as Prize[];
    const bodyKeys = Object.keys(BODY) as (keyof typeof BODY)[];
    const dark = s.material('#24262b', { roughness: 0.6 });
    const pale = s.material('#f3f1ea', { roughness: 0.45 });
    const chrome = s.material('#cfd4d6', { metalness: 0.85, roughness: 0.25 });
    const clear = new THREE.MeshPhysicalMaterial({ color: '#eaf6ff', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false });
    const ground=(node:THREE.Object3D,floor=0)=>{node.updateMatrixWorld(true);node.position.y+=floor-new THREE.Box3().setFromObject(node,true).min.y;};
    const price = { hundred: '¥100', two: '¥200', three: '¥300', five: '¥500' }[a.price];
    const fade = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#d8d2c4'), mood.wear * 0.45);

    // Stand: a plinth with castors under the block.
    const total = cols * W;
    s.box([total + 0.02, BASE - 0.05, D], [0, 0.05 + (BASE - 0.05) / 2, 0], s.material('#3a3d44', { roughness: 0.55 }));
    if(a.standFoot==='rails')for(const side of [-1,1])s.box([total+.02,.05,.065],[0,.025,side*(D/2-.055)],dark);
    else for(const side of [-1,1])for(const end of [-1,1]){const x=side*(total/2-.06),z=end*(D/2-.06);if(a.standFoot==='casters'){const wheel=s.cylinder(.025,.025,.025,[x,.025,z],dark,16);wheel.rotation.z=Math.PI/2;s.box([.035,.018,.032],[x,.043,z],chrome);}else s.cylinder(a.standFoot==='pads'?.035:.014,a.standFoot==='pads'?.035:.023,.05,[x,.025,z],a.standFoot==='pads'?dark:chrome,12);}
    if (a.bank === 'single') s.box([total * 0.7, 0.012, 0.01], [0, BASE * 0.6, D / 2 + 0.006], chrome);

    const shells: { at: THREE.Vector3; colour: THREE.Color; turn: THREE.Euler }[] = [];
    const cranks: THREE.Object3D[] = [];
    const emptyIndex = a.state === 'soldout' ? Math.floor(random() * cols * rows) : -1;
    const brokenIndex = a.state === 'jammed' ? Math.floor(random() * cols * rows) : -1;
    const trayIndex = a.tray ? Math.floor(random() * cols) : -1;
    const R = 0.034;
    let unitIndex = 0;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++, unitIndex++) {
      const x = (col - (cols - 1) / 2) * W, y = BASE + row * UNIT;
      const main = col === Math.floor((cols - 1) / 2) && row === rows - 1;
      const prize = main ? a.prize : prizes[Math.floor(random() * prizes.length)];
      const tint = a.body === 'mixed' ? BODY[bodyKeys[Math.floor(random() * bodyKeys.length)]] : BODY[a.body];
      const body = s.material(tint, { roughness: 0.4 });
      const trim = s.material(a.body === 'white' ? '#d9352c' : '#f3f1ea', { roughness: 0.45 });
      const broken = unitIndex === brokenIndex;

      // Lower body: coin mech, crank, chute.
      s.box([W-.006,BODY_H,D-.09],[x,y+BODY_H/2,-.045],body);
      const panel=(width:number,height:number,material:THREE.Material,z:number)=>{const shape=new THREE.Shape();shape.moveTo(-width/2,-height/2);shape.lineTo(width/2,-height/2);shape.lineTo(width/2,height/2);shape.lineTo(-width/2,height/2);shape.closePath();const hole=new THREE.Path();hole.moveTo(-.14,-.128);hole.lineTo(.03,-.128);hole.lineTo(.03,-.041);hole.lineTo(-.14,-.041);hole.closePath();shape.holes.push(hole);return s.mesh(new THREE.ExtrudeGeometry(shape,{depth:.008,bevelEnabled:false}),material,[x,y+BODY_H/2,z]);};
      panel(W-.006,BODY_H,body,D/2-.004);panel(W*.88,BODY_H*.86,trim,D/2+.005);
      for(const side of [-1,1])s.box([.014,.09,.09],[x-.055+side*.086,y+.065,D/2-.035],body);
      s.box([.18,.008,.14],[x-.055,y+.018,D/2-.01],dark);s.box([.17,.086,.008],[x-.055,y+.065,D/2-.08],dark);

      const dial = s.cylinder(0.062, 0.062, 0.03, [x + 0.075, y + 0.2, D / 2 + 0.024], pale, 24);
      dial.rotation.x = Math.PI / 2;
      const crank = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.03, 0.028), body);
      bar.position.z = 0.02; bar.castShadow = true;
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 12), chrome);
      knob.rotation.x = Math.PI / 2; knob.position.z = 0.036;
      if(a.handle==='bar')crank.add(bar,knob);
      else if(a.handle==='cross'||a.handle==='wheel'){
        for(let j=0;j<3;j++){const theta=j*Math.PI*2/3,arm=new THREE.Mesh(new THREE.BoxGeometry(.052,.016,.024),body);arm.position.set(Math.cos(theta)*.025,Math.sin(theta)*.025,.022);arm.rotation.z=theta;crank.add(arm);}crank.add(knob);
        if(a.handle==='wheel'){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.052,.007,7,32),chrome);wheel.position.z=.024;crank.add(wheel);}
      }else{const arm=new THREE.Mesh(new THREE.BoxGeometry(.065,.021,.024),body);arm.position.set(.025,0,.02);crank.add(arm);knob.position.set(.055,0,.038);crank.add(knob);}
      crank.position.set(x + 0.075, y + 0.2, D / 2 + 0.03);
      crank.rotation.z = broken ? 1.2 : (random() - 0.5) * 0.7;
      s.root.add(crank);
      if (!broken) cranks.push(crank);
      s.box([0.07, 0.085, 0.022], [x - 0.115, y + 0.215, D / 2 + 0.016], chrome);
      s.box([0.008, 0.045, 0.004], [x - 0.115, y + 0.225, D / 2 + 0.028], dark);
      s.label(price, 0.1, 0.04, [x - 0.11, y + 0.145, D / 2 + 0.012], '#ffffff', '#c8261e');
      if(a.chuteDoor!=='open'){
        const sections=a.chuteDoor==='split'?2:1;for(let i=0;i<sections;i++){
          const hinge=new THREE.Group(),flap=new THREE.Mesh(new THREE.BoxGeometry(.15/sections-.002,.073,.004),new THREE.MeshStandardMaterial({color:'#f4f8fa',transparent:true,opacity:.35,depthWrite:false}));flap.position.y=-.0365;hinge.add(flap);hinge.position.set(x-.055+(i-(sections-1)/2)*.15/sections,y+.108,D/2+.022);hinge.rotation.x=a.chuteDoor==='lifted'?-.95:-.12;s.root.add(hinge);
        }
      }
      if (broken) {
        const tape = s.material('#e9d27a', { roughness: 0.8 });
        for (const turn of [0.7, -0.7]) s.box([0.13, 0.022, 0.003], [x - 0.115, y + 0.215, D / 2 + 0.03], tape).rotation.z = turn;
      }
      if (row === 0 && col === trayIndex) {
        const colour = new THREE.Color(PALETTE[prize][Math.floor(random() * 5)]);
        shells.push({ at: new THREE.Vector3(x - 0.055 + (random() - 0.5) * 0.05, y + 0.06, D / 2 + 0.035), colour, turn: new THREE.Euler(random() * 3, random() * 3, 0) });
      }

      // Clear bin with corner posts, a display card and a lid.
      const by = y + BODY_H;
      s.box([W - 0.03, BIN_H, D - 0.03], [x, by + BIN_H / 2, 0], clear);
      for (const px of [-1, 1]) for (const pz of [-1, 1]) s.box([0.014, BIN_H, 0.014], [x + px * (W / 2 - 0.012), by + BIN_H / 2, pz * (D / 2 - 0.012)], pale);
      const lidY=by+BIN_H;
      if(a.lidStyle==='bevel'){const shape=new THREE.Shape();shape.moveTo(-W/2,0);shape.lineTo(W/2,0);shape.lineTo(W/2-.02,.03);shape.lineTo(-W/2+.02,.03);shape.closePath();s.mesh(new THREE.ExtrudeGeometry(shape,{depth:D+.004,bevelEnabled:false}),body,[x,lidY,-D/2-.002]);}
      else s.box([W-.004,.03,D+.004],[x,lidY+.015,0],body);
      if(a.lidStyle==='ridged')for(let i=0;i<8;i++)s.box([.012,.006,D-.035],[x-W*.36+i*W*.72/7,lidY+.033,0],trim);
      if(a.lidStyle==='bolts')for(const side of [-1,1])for(const end of [-1,1])s.cylinder(.009,.009,.004,[x+side*(W/2-.035),lidY+.032,end*(D/2-.035)],chrome,10);

      const [paper, ink] = CARD[prize];
      const cardMap = texture(256, 96, (g, w, h) => {
        g.fillStyle = `#${fade(paper).getHexString()}`; g.fillRect(0, 0, w, h);
        g.fillStyle = `#${fade(ink).getHexString()}`; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
        const inkHex = `#${fade(ink).getHexString()}`;
        if(a.cardLayout==='pair'){drawIcon(g,prize,60,48,30,inkHex,paper);drawIcon(g,prize,196,48,30,inkHex,paper);}
        if(a.cardLayout==='grid')for(let j=0;j<6;j++)drawIcon(g,prize,35+j*37,48,16,inkHex,paper);
        if(a.cardLayout==='hero'){drawIcon(g,prize,100,48,34,inkHex,paper);g.font='bold 30px monospace';g.fillStyle=inkHex;g.fillText('06',180,58);}
        if(a.cardLayout==='ticket'){drawIcon(g,prize,65,48,30,inkHex,paper);g.fillStyle=inkHex;for(let j=0;j<6;j++)g.fillRect(128,23+j*9,75-(j%3)*12,4);}

        g.fillStyle=inkHex;for(let i=0;i<(a.cardLayout==='pair'?5:0);i++) { g.beginPath(); g.arc(128 + (i - 2) * 9, 30 + (i % 2) * 36, 5, 0, Math.PI * 2); g.fill(); }
        if(a.cardLayout==='pair')g.fillRect(104,44,48,8);
      });
      const card = s.mesh(new THREE.PlaneGeometry(W * 0.82, 0.1), new THREE.MeshStandardMaterial({ map: cardMap, roughness: 0.7, emissive: '#ffffff', emissiveMap: cardMap, emissiveIntensity: mix(0.05, 0.4, mood.cheer) }), [x, by + BIN_H - 0.055, D / 2 - 0.008]);
      card.castShadow = false;

      // Capsules heaped in the bin.
      const level = unitIndex === emptyIndex ? 0 : mix(0.06, 1, a.fill) * mix(0.7, 1, random());
      const layers = Math.max(1, Math.round(level * 5));
      const perLayer = 5 * 5;
      for (let layer = 0; layer < layers && level > 0; layer++) {
        const keep = layer === layers - 1 ? mix(0.25, 1, (level * 5) % 1 || 1) : 1;
        for (let i = 0; i < perLayer; i++) {
          if (layers === 1 && a.fill < 0.2 ? random() > 0.3 : random() > keep) continue;
          const gx = (i % 5) - 2, gz = Math.floor(i / 5) - 2;
          shells.push({
            at: new THREE.Vector3(x+gx*.0708+(layer%2)*.0177,by+R*1.04+layer*Math.sqrt((R*2.08)**2-.0177**2),gz*.0708),
            colour: new THREE.Color(PALETTE[prize][Math.floor(random() * 5)]),
            turn: new THREE.Euler(random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2),
          });
        }
      }
      if (unitIndex === emptyIndex) s.label('SOLD OUT', W * 0.7, 0.085, [x, by + 0.12, D / 2 - 0.004], '#ffffff', '#c8261e').rotation.z = -0.12;
      if (broken) s.label('OUT OF ORDER', W * 0.72, 0.1, [x, by + 0.13, D / 2 - 0.004], '#30343a', '#f4efdc').rotation.z = 0.09;
      if(a.sidePanel!=='plain')for(const side of [-1,1]){if(cols>1&&!(col===0&&side===-1||col===cols-1&&side===1))continue;const panelX=x+side*(W/2+.001);
        if(a.sidePanel==='stripe')for(const z of [-.09,.09])s.box([.004,BODY_H*.8,.022],[panelX,y+BODY_H/2,z],trim);
        if(a.sidePanel==='service'){s.box([.006,.21,.26],[panelX,y+.15,0],chrome);s.box([.009,.19,.24],[panelX+side*.003,y+.15,0],body);const lock=s.cylinder(.012,.012,.012,[panelX+side*.011,y+.19,.08],chrome,12);lock.rotation.z=Math.PI/2;}
        if(a.sidePanel==='vent'){s.box([.005,.19,.24],[panelX,y+.15,0],dark);for(let j=0;j<8;j++)s.box([.012,.008,.25],[panelX+side*.006,y+.065+j*.024,0],body);}
      }
      // Peeling stickers on the side in a worn or crowded place.
      const stickers = Math.floor(mood.wear * 2 + mood.density * 2 + random());
      for (let i = 0; i < stickers && (col === 0 || col === cols - 1); i++) {
        const side = col === 0 && cols > 1 ? -1 : col === cols - 1 && cols > 1 ? 1 : random() > 0.5 ? 1 : -1;
        const sticker = s.box([0.002, 0.05 + random() * 0.04, 0.06 + random() * 0.05], [x + side * (W / 2 - 0.002), y + 0.06 + random() * 0.18, (random() - 0.5) * 0.22], s.material(PALETTE[prizes[Math.floor(random() * 6)]][Math.floor(random() * 5)]));
        sticker.rotation.x = (random() - 0.5) * 0.5;
      }
    }

    const top = BASE + rows * UNIT;
    if (a.topper) {
      const basket = s.material('#4f8fd0', { roughness: 0.6 });
      const bx = (cols - 1) / 2 * W * (random() > 0.5 ? 1 : -1) * (cols > 1 ? 1 : 0);
      s.box([0.3, 0.012, 0.24], [bx, top + 0.006, 0], basket);
      for (const side of [-1, 1]) { s.box([0.012, 0.12, 0.24], [bx + side * 0.15, top + 0.06, 0], basket); s.box([0.3, 0.12, 0.012], [bx, top + 0.06, side * 0.12], basket); }
      for (let i = 0; i < 7; i++) shells.push({ at: new THREE.Vector3(bx+(i<6?(i%3-1)*.075:0),top+.012+R*1.04+(i<6?0:.06),i<6?(Math.floor(i/3)-.5)*.075:0), colour: new THREE.Color('#f3f1ea'), turn: new THREE.Euler(random() * 6, random() * 6, 0) });
    }
    if (a.state === 'opened') {
      const colour = PALETTE[a.prize][Math.floor(random() * 5)];
      const half = new THREE.SphereGeometry(R * 1.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const fx = (random() - 0.5) * 0.2;
      const lower = s.mesh(half, s.material(colour, { side: THREE.DoubleSide, roughness: 0.35 }), [fx, R * 1.05, D / 2 + 0.2]); lower.rotation.x=Math.PI+.3;ground(lower);
      const upper = s.mesh(half.clone(), s.material('#f4f6f6', { side: THREE.DoubleSide, roughness: 0.3 }), [fx + 0.13, 0.008, D / 2 + 0.27]); upper.rotation.z=.5;ground(upper);
      s.ball([0.022, 0.03, 0.022], [fx - 0.09, 0.03, D / 2 + 0.3], s.material(PALETTE[a.prize][0], { emissive: PALETTE[a.prize][0], emissiveIntensity: 0.25 }), 10);
      s.box([0.07, 0.002, 0.05], [fx + 0.03, 0.002, D / 2 + 0.36], s.material('#f6f2e2')).rotation.y = 0.6;
    }

    // All capsules in two draw calls: a pale sphere and a coloured cap.
    if (shells.length) {
      const sphere = new THREE.InstancedMesh(new THREE.SphereGeometry(R, 12, 8), new THREE.MeshStandardMaterial({ color: '#f1f3f2', roughness: 0.25 }), shells.length);
      const cap = new THREE.InstancedMesh(new THREE.SphereGeometry(R * 1.04, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 0.3, emissive: '#ffffff', emissiveIntensity: 0.04 }), shells.length);
      const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
      shells.forEach((shell, index) => {
        matrix.compose(shell.at, q.setFromEuler(shell.turn), one);
        sphere.setMatrixAt(index, matrix); cap.setMatrixAt(index, matrix); cap.setColorAt(index, shell.colour);
      });
      sphere.castShadow = cap.castShadow = true;
      s.root.add(sphere, cap);
    }

    const speed = mix(0.15, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => cranks.forEach((crank, index) => { crank.rotation.z = Math.sin(time * speed + index * 1.7) * mix(0.08, 0.5, mood.energy); }),
    });
  },
});
