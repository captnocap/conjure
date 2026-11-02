import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, mix, visibleBounds } from '@conjure/kit';

const FELTS = {
  green: 'Classic billiard-green baize.',
  burgundy: 'Deep burgundy felt, a private club.',
  blue: 'Casino blue speed-cloth.',
  bare: 'No felt left: a bare scarred wooden top with a ragged remnant of green.',
} as const;
const FELT_TINT: Record<keyof typeof FELTS, string> = { green: '#2f7d4c', burgundy: '#7a2b35', blue: '#2f5f95', bare: '#8a6a45' };
const FLOOR = -0.76, TABLE = 0.78;

export default defineWorld({
  questions: {
    railCover: choice('What covers the padded rail?', { leather: 'Dark brown leather, slightly glossy.', red: 'Ox-blood red vinyl.', woven: 'Coarse tan woven upholstery.', rubber: 'Matte black rubber.' }),
    bettingLine: choice('What betting line is marked on the cloth?', { single: 'One thin circular betting line.', double: 'Two concentric betting lines.', broken: 'A dashed circular line.', diamond: 'A broad diamond-shaped betting boundary.' }),
    houseMark: choice('What house mark occupies the centre of the table?', { none: 'Plain cloth without a house mark.', suits: 'Four small card suits in a cross.', star: 'A large eight-pointed rosette.', initials: 'The intertwined initials of a private card room.' }),
    piping: choice('How is the inner edge of the rail finished?', { plain: 'No contrasting piping.', cream: 'A cream cord along the inside edge.', brass: 'A narrow polished brass strip.', stitched: 'Regular pale stitches around the inside edge.' }),
    studs: choice('What fastens the outside of the padded rail?', { brass: 'Closely spaced brass upholstery studs.', steel: 'Large silver studs in pairs.', wood: 'Small dark wooden plugs.', hidden: 'Concealed fasteners and a clean edge.' }),
    apron: choice('How is the wooden table apron decorated?', { plain: 'A plain dark wooden apron.', fluted: 'Vertical flutes carved around the apron.', panels: 'Inset rectangular panels around the apron.', scalloped: 'A repeating scalloped lower edge.' }),
    base: choice('What supports the card table?', { pedestal: 'One turned central pedestal with four splayed feet.', legs: 'Four solid square legs with joining rails.', trestle: 'Two trestles joined by a low crossbar.', drum: 'A broad faceted drum base on a circular plinth.' }),
    aftermath: choice('How did the game end?', {
      hurry: 'In a hurry: chairs shoved out at all angles, everyone gone at once.',
      raid: 'Raided: chairs overturned, the lamp still swinging.',
      paused: 'It has not ended: chairs pulled back a little, jackets on them, players stepped out for air.',
      alone: 'One player stayed. A single chair is drawn up close; the rest are pushed away.',
    }),
    felt: choice('What covers the table?', FELTS),
    lamp: choice('What kind of lamp hangs over it?', {
      enamel: 'A green enamel cone shade, white inside, the pool-hall classic.',
      bulb: 'A bare bulb on a twisted cord.',
      stained: 'A leaded stained-glass dome in amber and red.',
      fringed: 'A tobacco-yellowed fabric drum shade with a fringe.',
    }),
    chairs: choice('What do the players sit on?', {
      bentwood: 'Bentwood café chairs with round seats and hooped backs.',
      ladder: 'Heavy square ladder-back kitchen chairs.',
      folding: 'Grey steel folding chairs, a rented or borrowed room.',
    }),
    floor: choice('What is the floor?', {
      boards: 'Dark bare floorboards.',
      lino: 'Scuffed checkerboard linoleum.',
      rug: 'A worn red oriental rug over boards.',
      concrete: 'Stained cellar concrete with a drain.',
    }),
    left: choice('What was left lying on the felt, apart from the main objects?', {
      bare: 'Nothing: swept clean.',
      cards: 'Playing cards scattered where they were dropped.',
      money: 'Loose banknotes and a few chips nobody stopped to collect.',
      drinks: 'Glasses and a bottle along the rail, wet rings on the cloth.',
    }),
    view: choice('Where are we looking from?', {
      seat: 'From an empty seat, low, across the felt.',
      standing: 'Standing over the table, looking down at an angle.',
      ceiling: 'From high up, like a camera in the ceiling.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { root } = s;
    const { mood, random } = context;
    const lampWarm = new THREE.Color().setHSL(mix(0.13, 0.075, mood.warmth), 0.85, mix(0.7, 0.62, mood.warmth));
    const background = new THREE.Color('#465066').lerp(new THREE.Color('#66544a'), mood.warmth).multiplyScalar(mix(0.9, 1.25, mood.cheer));
    const wood = s.material('#5a3a24', { roughness: 0.6 });
    const darkWood = s.material('#3a261a', { roughness: 0.65 });

    // Light: dim cool room, one warm key from the lamp side.
    root.add(new THREE.HemisphereLight(new THREE.Color('#c9d2ee').lerp(lampWarm, 0.3), '#3a3531', 0.7));
    const key = new THREE.DirectionalLight(lampWarm.clone().lerp(new THREE.Color('#ffffff'), 0.35), 2.1);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.02;
    key.shadow.bias = -0.0003;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#8fa4d6', 0.45);
    fill.position.set(5, 3, 6);
    root.add(fill);

    // Floor: lit under the table, falling away into the room's dusk.
    const fc = document.createElement('canvas');
    fc.width = fc.height = 1024;
    const fx = fc.getContext('2d')!;
    const floorBase = { boards: '#6a4a30', lino: '#8a8676', rug: '#6a4a30', concrete: '#77756f' }[a.floor];
    fx.fillStyle = floorBase; fx.fillRect(0, 0, 1024, 1024);
    const SPAN = 9, px = (metres: number) => metres / SPAN * 1024;
    if (a.floor === 'boards' || a.floor === 'rug') {
      for (let x = 0; x < 1024; x += px(0.14)) {
        fx.fillStyle = `rgba(${random() < 0.5 ? '40,24,12' : '150,110,70'},${0.08 + random() * 0.14})`; fx.fillRect(x, 0, px(0.14), 1024);
        fx.fillStyle = 'rgba(20,12,6,0.6)'; fx.fillRect(x, 0, 2, 1024);
        for (let k = 0; k < 4; k++) fx.fillRect(x, random() * 1024, px(0.14), 2);
      }
    }
    if (a.floor === 'lino') {
      const tile = px(0.3);
      for (let i = 0; i < 1024 / tile; i++) for (let j = 0; j < 1024 / tile; j++) { fx.fillStyle = (i + j) % 2 ? '#2f2d2b' : '#b9b29c'; fx.fillRect(i * tile, j * tile, tile - 1, tile - 1); }
    }
    if (a.floor === 'rug') {
      fx.save(); fx.translate(512, 512); fx.rotate((random() - 0.5) * 0.3);
      const w = px(3.1), h = px(2.4);
      fx.fillStyle = '#5e2622'; fx.fillRect(-w / 2, -h / 2, w, h);
      fx.strokeStyle = '#a88d5c'; fx.lineWidth = 6; fx.strokeRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20);
      fx.strokeStyle = '#1f2d4a'; fx.lineWidth = 12; fx.strokeRect(-w / 2 + 26, -h / 2 + 26, w - 52, h - 52);
      fx.fillStyle = '#a88d5c';
      for (let i = -5; i <= 5; i++) for (let j = -3; j <= 3; j++) { fx.save(); fx.translate(i * w / 13, j * h / 9); fx.rotate(Math.PI / 4); fx.fillRect(-6, -6, 12, 12); fx.restore(); }
      fx.fillStyle = '#e6d6ae'; for (let x = -w / 2; x < w / 2; x += 7) { fx.fillRect(x, -h / 2 - 12, 3, 12); fx.fillRect(x, h / 2, 3, 12); }
      fx.restore();
    }
    if (a.floor === 'concrete') {
      for (let i = 0; i < 60; i++) { fx.fillStyle = `rgba(40,36,30,${random() * 0.18})`; fx.beginPath(); fx.arc(random() * 1024, random() * 1024, 10 + random() * 70, 0, 6.28); fx.fill(); }
      fx.fillStyle = '#2a2927'; fx.beginPath(); fx.arc(512 + px(1.15), 512 + px(0.9), px(0.09), 0, 6.28); fx.fill();
      fx.strokeStyle = '#8d8a82'; fx.lineWidth = 2; for (let k = -2; k <= 2; k++) { fx.beginPath(); fx.moveTo(512 + px(1.15) - px(0.07), 512 + px(0.9) + k * 4); fx.lineTo(512 + px(1.15) + px(0.07), 512 + px(0.9) + k * 4); fx.stroke(); }
    }
    for (let i = 0; i < mood.wear * 50; i++) { fx.fillStyle = `rgba(25,20,15,${random() * 0.3})`; fx.beginPath(); fx.arc(512 + (random() - 0.5) * 520, 512 + (random() - 0.5) * 520, 3 + random() * 26, 0, 6.28); fx.fill(); }
    // Light pool and falloff into the room colour.
    const glow = fx.createRadialGradient(512, 512, px(0.5), 512, 512, px(2.6));
    const bg = `${Math.round(background.r * 255)},${Math.round(background.g * 255)},${Math.round(background.b * 255)}`;
    glow.addColorStop(0, 'rgba(255,214,150,0.16)'); glow.addColorStop(0.3, `rgba(${bg},0.45)`); glow.addColorStop(1, `rgba(${bg},0.9)`);
    fx.fillStyle = glow; fx.fillRect(0, 0, 1024, 1024);
    const fade = fx.createRadialGradient(512, 512, px(1.7), 512, 512, px(4.3));
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    fx.globalCompositeOperation = 'destination-out'; fx.fillStyle = fade; fx.fillRect(0, 0, 1024, 1024); fx.globalCompositeOperation = 'source-over';
    const floorMap = new THREE.CanvasTexture(fc); floorMap.colorSpace = THREE.SRGBColorSpace; floorMap.anisotropy = 4;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(SPAN, SPAN), new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.9, transparent: true }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR; floor.receiveShadow = true;
    root.add(floor);

    // The table: felt at y = 0, padded rail, apron, pedestal.
    const tint = FELT_TINT[a.felt];
    const tc = document.createElement('canvas');
    tc.width = tc.height = 1024;
    const tx = tc.getContext('2d')!;
    tx.fillStyle = tint; tx.fillRect(0, 0, 1024, 1024);
    if (a.felt === 'bare') {
      for (let x = 0; x < 1024; x += 86) { tx.fillStyle = `rgba(50,30,14,${0.1 + random() * 0.2})`; tx.fillRect(x, 0, 86, 1024); tx.fillStyle = 'rgba(30,18,8,0.7)'; tx.fillRect(x, 0, 3, 1024); }
      tx.fillStyle = '#2f7d4c';
      tx.beginPath(); const cx = 512 + (random() - 0.5) * 200, cy = 512 + (random() - 0.5) * 200;
      for (let i = 0; i <= 40; i++) { const t = i / 40 * 6.28, r = 190 + random() * 150; tx.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); }
      tx.fill();
    }
    for (let i = 0; i < 5000; i++) { tx.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '0,0,0'},${random() * 0.05})`; tx.fillRect(random() * 1024, random() * 1024, 2, 2); }
    const pool = tx.createRadialGradient(512, 512, 40, 512, 512, 512);
    pool.addColorStop(0, 'rgba(255,236,170,0.34)'); pool.addColorStop(0.55, 'rgba(255,236,170,0.08)'); pool.addColorStop(1, 'rgba(0,0,0,0.3)');
    tx.fillStyle = pool; tx.fillRect(0, 0, 1024, 1024);
    tx.strokeStyle = 'rgba(245,240,215,0.65)'; tx.lineWidth = 5;
    if (a.bettingLine === 'broken') tx.setLineDash([27,19]);
    tx.beginPath();
    if (a.bettingLine === 'diamond') { tx.moveTo(512,120); tx.lineTo(904,512); tx.lineTo(512,904); tx.lineTo(120,512); tx.closePath(); }
    else tx.arc(512,512,372,0,Math.PI*2);
    tx.stroke(); tx.setLineDash([]);
    if (a.bettingLine === 'double') { tx.beginPath(); tx.arc(512,512,350,0,Math.PI*2); tx.stroke(); }
    tx.save(); tx.translate(512,512); tx.fillStyle = 'rgba(236,216,166,.7)';
    if (a.houseMark === 'suits') { tx.font='96px serif'; tx.textAlign='center'; tx.textBaseline='middle'; [['♠',0,-67],['♥',67,0],['♣',0,67],['♦',-67,0]].forEach(([glyph,x,y]) => tx.fillText(String(glyph),Number(x),Number(y))); }
    if (a.houseMark === 'star') { tx.beginPath(); for(let i=0;i<16;i++){const t=i*Math.PI/8,r=i%2?48:115;tx.lineTo(Math.cos(t)*r,Math.sin(t)*r);}tx.closePath();tx.fill();tx.fillStyle=tint;tx.beginPath();tx.arc(0,0,30,0,Math.PI*2);tx.fill(); }
    if (a.houseMark === 'initials') { tx.font='italic 150px serif'; tx.textAlign='center'; tx.textBaseline='middle'; tx.fillText('AC',0,0); }
    tx.restore();
    const ringsAt: [number, number][] = [];
    const stains = Math.round(mood.wear * 9) + (a.left === 'drinks' ? 4 : 0);
    for (let i = 0; i < stains; i++) {
      const angle = random() * 6.28, d = 250 + random() * 190;
      const x = 512 + Math.cos(angle) * d, y = 512 + Math.sin(angle) * d;
      if (random() < 0.6 || a.left === 'drinks') { tx.strokeStyle = 'rgba(20,14,8,0.4)'; tx.lineWidth = 6; tx.beginPath(); tx.arc(x, y, 34, 0, 6.28); tx.stroke(); ringsAt.push([x, y]); }
      else { tx.fillStyle = 'rgba(15,10,6,0.75)'; tx.beginPath(); tx.ellipse(x, y, 5, 16, random() * 3, 0, 6.28); tx.fill(); }
    }
    const feltMap = new THREE.CanvasTexture(tc); feltMap.colorSpace = THREE.SRGBColorSpace; feltMap.anisotropy = 4;
    const felt = new THREE.Mesh(new THREE.CircleGeometry(TABLE - 0.07, 64), new THREE.MeshStandardMaterial({ map: feltMap, roughness: 1, emissive: tint, emissiveIntensity: 0.16 }));
    felt.rotation.x = -Math.PI / 2; felt.receiveShadow = true;
    root.add(felt);
    s.cylinder(TABLE, TABLE - 0.02, 0.07, [0, -0.037, 0], wood, 64);
    const railMaterial = s.material({leather:'#392218',red:'#732a2e',woven:'#b09b71',rubber:'#181b1d'}[a.railCover], { roughness: a.railCover === 'woven' ? .95 : a.railCover === 'rubber' ? .8 : .4 });
    if (a.railCover === 'woven') { const c=document.createElement('canvas');c.width=c.height=64;const p=c.getContext('2d')!;p.fillStyle='#b09b71';p.fillRect(0,0,64,64);p.strokeStyle='#6e6046';p.lineWidth=2;for(let i=0;i<64;i+=8){p.beginPath();p.moveTo(i,0);p.lineTo(i,64);p.moveTo(0,i);p.lineTo(64,i);p.stroke();}const m=new THREE.CanvasTexture(c);m.colorSpace=THREE.SRGBColorSpace;m.wrapS=m.wrapT=THREE.RepeatWrapping;m.repeat.set(35,2);railMaterial.map=m; }
    const rail = s.ring(TABLE - 0.04, 0.042, [0, 0.004, 0], railMaterial);
    rail.rotation.x = Math.PI / 2; rail.scale.set(1, 1, 0.55);
    if(a.piping!=='plain') {
      const trim=s.material(a.piping==='brass'?'#c3a15b':'#e5d5ad',{metalness:a.piping==='brass'?.8:0,roughness:.5});
      if(a.piping==='stitched') for(let i=0;i<96;i++){const t=i/96*Math.PI*2;const m=s.box([.011,.0018,.003],[Math.cos(t)*.715,.020,Math.sin(t)*.715],trim);m.rotation.y=-t;}
      else s.ring(.711,.0028,[0,.020,0],trim).rotation.x=Math.PI/2;
    }
    if(a.studs!=='hidden') { const n=a.studs==='steel'?16:28;const material=s.material(a.studs==='brass'?'#b9944a':a.studs==='steel'?'#c4c8ca':'#36271d',{metalness:a.studs==='wood'?0:.8,roughness:.4});for(let i=0;i<n;i++)for(let j=0;j<(a.studs==='steel'?2:1);j++){const t=i/n*Math.PI*2+j*.025;s.ball([.007,.007,.007],[Math.cos(t)*(TABLE-.002),-.012,Math.sin(t)*(TABLE-.002)],material,6);} }
    s.cylinder(TABLE - 0.14, TABLE - 0.14, 0.09, [0, -0.115, 0], darkWood, 40);
    if(a.apron!=='plain') { const n=a.apron==='fluted'?40:16;for(let i=0;i<n;i++){const t=i/n*Math.PI*2,x=Math.cos(t)*.638,z=Math.sin(t)*.638;if(a.apron==='fluted')s.rod([x,-.155,z],[x,-.075,z],.009,wood);else if(a.apron==='panels'){const m=s.box([.105,.062,.012],[x,-.115,z],wood);m.rotation.y=Math.PI/2-t;}else s.ball([.07,.035,.018],[x,-.154,z],darkWood,10).rotation.y=Math.PI/2-t;} }
    if(a.base==='pedestal') {
    s.lathe([[0.2, 0], [0.24, 0.02], [0.1, 0.06], [0.07, 0.3], [0.1, 0.5], [0.09, 0.6]], darkWood, [0, FLOOR, 0]);
    for (let i = 0; i < 4; i++) {
      const t = i / 4 * 6.28 + 0.6;
      s.rod([Math.cos(t) * 0.1, FLOOR + 0.12, Math.sin(t) * 0.1], [Math.cos(t) * 0.5, FLOOR + 0.03, Math.sin(t) * 0.5], 0.04, darkWood, 0.03);
    }
    } else if(a.base==='legs') { for(const x of [-.4,.4])for(const z of [-.4,.4])s.box([.07,.6,.07],[x,FLOOR+.3,z],darkWood);for(const x of [-.4,.4])s.box([.045,.05,.8],[x,FLOOR+.15,0],wood);for(const z of [-.4,.4])s.box([.8,.05,.045],[0,FLOOR+.15,z],wood); }
    else if(a.base==='trestle') {for(const x of [-.38,.38]){s.box([.095,.6,.12],[x,FLOOR+.3,0],darkWood);s.box([.14,.06,.95],[x,FLOOR+.03,0],darkWood);s.box([.12,.055,.95],[x,-.1875,0],darkWood);}s.box([.76,.09,.07],[0,FLOOR+.2,0],wood);}
    else {s.cylinder(.27,.38,.56,[0,FLOOR+.32,0],darkWood,12);s.cylinder(.46,.46,.04,[0,FLOOR+.02,0],wood,48);}

    // Chairs.
    const steel = s.material('#7f858a', { metalness: 0.6, roughness: 0.45 });
    const chair = (x: number, z: number, yaw: number, fallen: 'no' | 'back' | 'side', jacket: boolean) => {
      const group = new THREE.Group(), body = new THREE.Group();
      group.position.set(x, FLOOR, z); group.rotation.y = yaw;
      group.add(body); root.add(group);
      const put = (mesh: THREE.Object3D) => { body.add(mesh); return mesh; };
      const tone = a.chairs === 'folding' ? steel : random() < 0.5 ? wood : darkWood;
      if (a.chairs === 'bentwood') {
        put(s.cylinder(0.21, 0.2, 0.035, [0, 0.45, 0], tone, 24));
        for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(s.rod([lx * 0.2, 0, lz * 0.2], [lx * 0.14, 0.44, lz * 0.14], 0.016, tone));
        put(s.ring(0.15, 0.012, [0, 0.2, 0], tone)).rotation.x = Math.PI / 2;
        const hoop = put(s.ring(0.19, 0.015, [0, 0.47, -0.19], tone, Math.PI)); hoop.scale.set(1, 2.3, 1); hoop.rotation.x = -0.12;
        const inner = put(s.ring(0.11, 0.011, [0, 0.47, -0.19], tone, Math.PI)); inner.scale.set(1, 3, 1); inner.rotation.x = -0.12;
      } else if (a.chairs === 'ladder') {
        put(s.box([0.42, 0.04, 0.42], [0, 0.45, 0], tone));
        for (const lx of [-1, 1]) { put(s.box([0.04, 0.45, 0.04], [lx * 0.19, 0.225, 0.19], tone)); const post = put(s.box([0.04, 0.95, 0.04], [lx * 0.19, 0.475, -0.19], tone)); post.rotation.x = -0.04; }
        for (const y of [0.6, 0.74, 0.88]) put(s.box([0.36, 0.07, 0.02], [0, y, -0.2 - (y - 0.45) * 0.04], tone));
        for (const lz of [-1, 1]) put(s.box([0.36, 0.025, 0.025], [0, 0.18, lz * 0.19], tone));
      } else {
        put(s.box([0.4, 0.02, 0.38], [0, 0.44, 0], s.material('#9a9c96', { metalness: 0.4, roughness: 0.5 })));
        for (const lx of [-1, 1]) {
          put(s.rod([lx * 0.2, 0, 0.22], [lx * 0.2, 0.86, -0.22], 0.012, steel));
          put(s.rod([lx * 0.2, 0, -0.22], [lx * 0.2, 0.45, 0.16], 0.012, steel));
        }
        put(s.box([0.4, 0.16, 0.015], [0, 0.78, -0.19], s.material('#9a9c96', { metalness: 0.4, roughness: 0.5 }))).rotation.x = -0.45;
        put(s.rod([-0.2, 0.1, 0.17], [0.2, 0.1, 0.17], 0.01, steel));
      }
      if (jacket && fallen === 'no') {
        const cloth = s.material(['#2b2f3a', '#3b3229', '#4a4f45'][Math.floor(random() * 3)], { roughness: 0.95 });
        put(s.box([0.46, 0.4, 0.07], [0, 0.72, -0.2], cloth)).rotation.x = -0.06;
        for (const lx of [-1, 1]) put(s.box([0.1, 0.42, 0.09], [lx * 0.23, 0.58, -0.17], cloth)).rotation.z = lx * 0.12;
      }
      if (fallen === 'back') { body.rotation.x = -Math.PI / 2; body.position.y = 0.22; }
      if (fallen === 'side') { body.rotation.z = Math.PI / 2; body.position.y = 0.22; }
      group.updateMatrixWorld(true);body.position.y += FLOOR-new THREE.Box3().setFromObject(body,true).min.y;
    };
    const count = Math.round(mix(4, 6, mood.density));
    const start = random() * 6.28;
    for (let i = 0; i < count; i++) {
      // Keep the near side of the table clear so nothing blocks the felt.
      let angle = start + i / count * 6.28 + (random() - 0.5) * 0.3;
      const front = Math.sin(angle) > 0.55;
      const facing = Math.atan2(-Math.cos(angle), -Math.sin(angle));
      let distance = 1.08, turn = 0, fallen: 'no' | 'back' | 'side' = 'no', jacket = false;
      if (a.aftermath === 'hurry') { distance = mix(1.0, 1.3, random()); turn = (random() - 0.5) * 2.2; if (i === 0) fallen = 'back'; jacket = random() < 0.2; }
      else if (a.aftermath === 'raid') { distance = mix(1.05, 1.45, random()); turn = (random() - 0.5) * 3; fallen = random() < 0.65 ? (random() < 0.5 ? 'back' : 'side') : 'no'; }
      else if (a.aftermath === 'paused') { distance = mix(1.02, 1.16, random()); turn = (random() - 0.5) * 0.5; jacket = random() < 0.6; }
      else { if (i === 0) { angle = Math.PI * 1.5 + (random() - 0.5) * 0.8; distance = 0.9; jacket = true; } else { distance = mix(1.5, 1.9, random()); turn = (random() - 0.5) * 2; } }
      if (front) distance = Math.max(distance, 1.25);
      const face = i === 0 && a.aftermath === 'alone' ? Math.atan2(-Math.cos(angle), -Math.sin(angle)) : facing;
      chair(Math.cos(angle) * distance, Math.sin(angle) * distance, face + turn, front && fallen === 'no' && a.aftermath !== 'paused' ? 'back' : fallen, jacket);
    }

    // The hanging lamp, on a pivot far above so it can swing.
    const PIVOT = 2.6, SHADE = 0.86;
    const pendulum = new THREE.Group();
    pendulum.position.set(0, PIVOT, -0.05);
    root.add(pendulum);
    const hang = <T extends THREE.Object3D>(mesh: T) => { pendulum.add(mesh); return mesh; };
    const glowMaterial = new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: lampWarm, emissiveIntensity: 2.4, roughness: 0.4, side: THREE.DoubleSide });
    hang(s.cylinder(0.006, 0.006, PIVOT - SHADE - 0.1, [0, -(PIVOT - SHADE - 0.1) / 2, 0], s.material('#1c1a18')));
    const at = SHADE - PIVOT;
    hang(s.cylinder(0.022, 0.028, 0.07, [0, at + 0.1, 0], s.material('#b9944a', { metalness: 0.8, roughness: 0.4 }), 12));
    hang(s.ball([0.045, 0.058, 0.045], [0, at + 0.02, 0], glowMaterial, 16));
    const latheOf = (profile: [number, number][], material: THREE.Material, segments = 40) => {
      const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments), material);
      mesh.castShadow = true; mesh.position.y = at;
      return hang(mesh);
    };
    if (a.lamp === 'enamel') {
      latheOf([[0.03, 0.14], [0.06, 0.12], [0.23, -0.02], [0.24, -0.04]], new THREE.MeshStandardMaterial({ color: '#1f6a45', roughness: 0.3, side: THREE.DoubleSide, emissive: '#1f6a45', emissiveIntensity: 0.25 }));
      latheOf([[0.03, 0.125], [0.056, 0.105], [0.222, -0.03], [0.232, -0.04]], glowMaterial);
    } else if (a.lamp === 'stained') {
      const dome = latheOf([[0.02, 0.15], [0.12, 0.12], [0.2, 0.04], [0.24, -0.05]], new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, emissive: '#b8641c', emissiveIntensity: 0.55, side: THREE.DoubleSide, flatShading: true }), 16);
      const position = dome.geometry.getAttribute('position'), colours = new Float32Array(position.count * 3), c = new THREE.Color();
      const paletteGlass = ['#d98a2a', '#b3262b', '#e6c25a', '#3f7d4f', '#d98a2a'];
      for (let i = 0; i < position.count; i++) {
        const sector = Math.round(Math.atan2(position.getZ(i), position.getX(i)) / (Math.PI / 8) + 8) % 16, band = position.getY(i) > 0.08 ? 0 : position.getY(i) > 0 ? 1 : 2;
        c.set(paletteGlass[(sector + band * 2) % paletteGlass.length]);
        colours.set([c.r, c.g, c.b], i * 3);
      }
      dome.geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      const hem = hang(s.ring(0.24, 0.006, [0, at - 0.05, 0], s.material('#3a2a1a', { metalness: 0.6 }))); hem.rotation.x = Math.PI / 2;
    } else if (a.lamp === 'fringed') {
      latheOf([[0.14, 0.13], [0.21, -0.05]], new THREE.MeshStandardMaterial({ color: '#c9a55c', roughness: 0.9, emissive: '#c98a3a', emissiveIntensity: 0.7, side: THREE.DoubleSide }), 28);
      const fringe = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 0.05, 0.004), s.material('#8a6a35', { roughness: 1 }), 56);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 56; i++) { const t = i / 56 * 6.28; fringe.setMatrixAt(i, m.makeTranslation(Math.cos(t) * 0.21, at - 0.075 - random() * 0.008, Math.sin(t) * 0.21)); }
      fringe.castShadow = true;
      hang(fringe);
    }
    // Light cone and haze: seen, never measured.
    const beam = new THREE.Mesh(new THREE.ConeGeometry(0.78, SHADE, 40, 1, true), new THREE.MeshBasicMaterial({ color: lampWarm, transparent: true, opacity: 0.085, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = at - SHADE / 2 + 0.03;
    hang(beam);
    const haze: THREE.Mesh[] = [];
    const wisps = Math.round(mix(2, 6, mood.density));
    for (let i = 0; i < wisps; i++) {
      const wisp = new THREE.Mesh(new THREE.TorusGeometry(mix(0.2, 0.5, random()), mix(0.015, 0.035, random()), 6, 40, mix(1.2, 3.2, random())),
        new THREE.MeshBasicMaterial({ color: '#d9dde6', transparent: true, opacity: mix(0.07, 0.14, random()), depthWrite: false }));
      wisp.rotation.x = Math.PI / 2 + (random() - 0.5) * 0.3; wisp.rotation.z = random() * 6.28;
      wisp.scale.set(1, mix(0.5, 1, random()), 0.4);
      wisp.position.set((random() - 0.5) * 0.4, mix(0.3, 0.8, random()), (random() - 0.5) * 0.4);
      root.add(wisp); haze.push(wisp);
    }

    // What was left on the felt.
    const S = 2.1;
    const restingCards: {x:number;z:number;w:number;d:number;t:number;top:number}[]=[];
    const settleCard=(x:number,z:number,w:number,d:number,t:number,h:number)=>{
      const candidate={x,z,w:w/2,d:d/2,t,top:0};let bottom=0;
      for(const other of restingCards){
        const axes=[[Math.cos(t),-Math.sin(t)],[Math.sin(t),Math.cos(t)],[Math.cos(other.t),-Math.sin(other.t)],[Math.sin(other.t),Math.cos(other.t)]];
        const reach=(r:typeof candidate,ax:number,az:number)=>r.w*Math.abs(Math.cos(r.t)*ax-Math.sin(r.t)*az)+r.d*Math.abs(Math.sin(r.t)*ax+Math.cos(r.t)*az);
        if(axes.every(([ax,az])=>Math.abs((x-other.x)*ax+(z-other.z)*az)<reach(candidate,ax,az)+reach(other,ax,az)))bottom=Math.max(bottom,other.top);
      }
      candidate.top=bottom+h;restingCards.push(candidate);return bottom+h/2;
    };
    if (a.left === 'cards') {
      const cc = document.createElement('canvas'); cc.width = 64; cc.height = 90;
      const cx = cc.getContext('2d')!;
      cx.fillStyle = '#f2ecdc'; cx.fillRect(0, 0, 64, 90); cx.fillStyle = '#a3262b'; cx.fillRect(6, 6, 52, 78);
      cx.strokeStyle = '#f2ecdc'; cx.lineWidth = 2; for (let i = -90; i < 90; i += 9) { cx.beginPath(); cx.moveTo(i, 0); cx.lineTo(i + 90, 90); cx.moveTo(i, 90); cx.lineTo(i + 90, 0); cx.stroke(); }
      const backMap = new THREE.CanvasTexture(cc); backMap.colorSpace = THREE.SRGBColorSpace;
      const white = new THREE.MeshStandardMaterial({ color: '#f2ecdc', roughness: 0.6 }), back = new THREE.MeshStandardMaterial({ map: backMap, roughness: 0.6 });
      const n = Math.round(mix(10, 28, mood.density));
      for (const [material, share] of [[back, 0.7], [white, 0.3]] as const) {
        const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.063 * S, 0.0012, 0.088 * S), [white, white, material, white, white, white], Math.ceil(n * share));
        const m = new THREE.Matrix4(), q = new THREE.Quaternion();
        for (let i = 0; i < mesh.count; i++) {
          const t = random() * 6.28, d = mix(0.12, 0.62, Math.sqrt(random()));
          const yaw=random()*Math.PI*2,x=Math.cos(t)*d,z=Math.sin(t)*d;
          q.setFromEuler(new THREE.Euler(0,yaw,0));
          mesh.setMatrixAt(i, m.compose(new THREE.Vector3(x,settleCard(x,z,.063*S,.088*S,yaw,.0012),z), q, new THREE.Vector3(1, 1, 1)));
        }
        mesh.castShadow = mesh.receiveShadow = true;
        root.add(mesh);
      }
    } else if (a.left === 'money') {
      const n = Math.round(mix(6, 16, mood.density));
      const notes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.156 * 1.4, 0.0012, 0.066 * 1.4), s.material('#86a07a', { roughness: 0.9 }), n);
      const chips = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0195 * S, 0.0195 * S, 0.0034 * S, 18), new THREE.MeshStandardMaterial({ roughness: 0.7 }), n * 2);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), tones = ['#b32a2a', '#ece6d6', '#27468f', '#1d1d20', '#2f7a48'];
      for (let i = 0; i < n; i++) {
        const t = random() * 6.28, d = mix(0.15, 0.62, Math.sqrt(random()));
        const yaw=random()*Math.PI*2,x=Math.cos(t)*d,z=Math.sin(t)*d;
        q.setFromEuler(new THREE.Euler(0,yaw,0));
        notes.setMatrixAt(i, m.compose(new THREE.Vector3(x,settleCard(x,z,.156*1.4,.066*1.4,yaw,.0012),z), q, new THREE.Vector3(1, 1, 1)));
      }
      const settledChips:{x:number;z:number;top:number}[]=[];
      for(let i=0;i<n*2;i++){
        const t2 = random() * 6.28, d2 = mix(0.15, 0.64, Math.sqrt(random()));
        const x=Math.cos(t2)*d2,z=Math.sin(t2)*d2,r=.0195*S,h=.0034*S;let bottom=0;
        for(const card of restingCards){const dx=x-card.x,dz=z-card.z,lx=dx*Math.cos(card.t)-dz*Math.sin(card.t),lz=dx*Math.sin(card.t)+dz*Math.cos(card.t);if(Math.hypot(Math.max(0,Math.abs(lx)-card.w),Math.max(0,Math.abs(lz)-card.d))<r)bottom=Math.max(bottom,card.top);}
        for(const chip of settledChips)if(Math.hypot(x-chip.x,z-chip.z)<r*2)bottom=Math.max(bottom,chip.top);
        chips.setMatrixAt(i, m.makeTranslation(x,bottom+h/2,z));settledChips.push({x,z,top:bottom+h});
        chips.setColorAt(i, new THREE.Color(tones[Math.floor(random() * tones.length)]));
      }
      notes.castShadow = notes.receiveShadow = chips.castShadow = true;
      root.add(notes, chips);
    } else if (a.left === 'drinks') {
      const glassMaterial = new THREE.MeshPhysicalMaterial({ color: '#dfeaec', transparent: true, opacity: 0.45, roughness: 0.08 });
      const amber = new THREE.MeshStandardMaterial({ color: '#c06a18', emissive: '#c06a18', emissiveIntensity: 0.4, roughness: 0.2 });
      const spots = [3.5, 4.3, 5.2, 5.9, 2.9].slice(0, Math.round(mix(3, 5, mood.density)));
      spots.forEach((angle, index) => {
        const t = angle + (random() - 0.5) * 0.3, d = 0.6, x = Math.cos(t) * d, z = Math.sin(t) * d;
        if (index === 1) {
          s.cylinder(0.045, 0.045, 0.2, [x, 0.1, z], new THREE.MeshPhysicalMaterial({ color: '#7a4a1c', transparent: true, opacity: 0.75, roughness: 0.1 }), 16);
          s.cylinder(0.016, 0.04, 0.11, [x, 0.255, z], new THREE.MeshPhysicalMaterial({ color: '#7a4a1c', transparent: true, opacity: 0.75, roughness: 0.1 }), 12);
          s.label('RYE', 0.07, 0.06, [x, 0.1, z + 0.046], '#2a1a10', '#e6dcc0');
        } else {
          const tipped = a.aftermath === 'raid' && random() < 0.6;
          const g = s.lathe([[0,0],[.034,0],[.04,.09],[.037,.09],[.031,.007],[0,.007]],glassMaterial,[x,0,z]);
          if (tipped) { g.rotation.z = Math.PI / 2; g.rotation.y = random() * 3;g.updateMatrixWorld(true);g.position.y-=new THREE.Box3().setFromObject(g,true).min.y;s.cylinder(0.09, 0.09, 0.002, [x * 0.86, 0.001, z * 0.86], amber, 20).scale.set(1, 1, 0.6); }
          else {const h=.03*mix(.3,1.6,random());s.cylinder(.031+h/.09*.006,.031,h,[x,.007+h/2,z],amber,20);}
        }
      });
    }
    void ringsAt;

    // Camera and placement.
    const camera = new THREE.OrthographicCamera(-1.2, 1.2, 1.2, -1.2, 0.1, 120);
    const yaw = THREE.MathUtils.degToRad(mix(-22, 22, random()));
    const pitch = THREE.MathUtils.degToRad({ seat: 23, standing: 35, ceiling: 50 }[a.view]);
    const toCamera = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const slots: [number, number, number][] = [[0, 0.3, 1], [-0.42, -0.02, 0.85], [0.43, 0.02, 0.85], [-0.2, -0.4, 0.75], [0.24, -0.4, 0.75]];
    const frame = new THREE.Box3(new THREE.Vector3(-0.84, -0.12, -0.84), new THREE.Vector3(0.84, 0.92, 0.84));

    const place = (items: readonly Placeable[]) => {
      const boxes = [frame];
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      items.forEach((item, index) => {
        const [sx, sz, size] = slots[index % slots.length];
        const scale = Math.min(0.46 / Math.max(item.height, 0.02), 0.23 / Math.max(item.radius, 0.02)) * size;
        // Slots are laid out as the camera sees them, so the hero is always nearest.
        const at2 = right.clone().multiplyScalar(sx).addScaledVector(forward, sz);
        item.holder.scale.setScalar(scale);
        item.holder.position.set(at2.x, 0, at2.z);
        item.holder.rotation.y = yaw + (context.random() - 0.5) * 0.5;
        item.holder.updateMatrixWorld(true);
        const box = visibleBounds(item.holder);
        box.min.y = Math.max(box.min.y, 0);
        if (!box.isEmpty()) boxes.push(box);
      });
      const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3());
      const centre = bounds.getCenter(new THREE.Vector3());
      camera.position.copy(centre).addScaledVector(toCamera, 40);
      camera.lookAt(centre);
      camera.updateMatrixWorld(true);
      const seen = new THREE.Box2(), corner = new THREE.Vector3();
      for (const box of boxes)
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
          corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
          seen.expandByPoint(new THREE.Vector2(corner.x, corner.y));
        }
      const middle = seen.getCenter(new THREE.Vector2());
      const extent = Math.max(...seen.getSize(new THREE.Vector2()).toArray()) * 0.5;
      camera.translateX(middle.x);
      camera.translateY(middle.y);
      camera.left = camera.bottom = -extent;
      camera.right = camera.top = extent;
      camera.updateProjectionMatrix();
      key.target.position.set(0, 0, 0);
      key.position.set(mix(-2.2, 2.2, mood.daylight), 7, 2.6);
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -2.4;
      shadow.right = shadow.top = 2.4;
      shadow.near = 0.1; shadow.far = 20;
      shadow.updateProjectionMatrix();
    };

    const swing = a.aftermath === 'raid' ? mix(0.12, 0.3, mood.energy) : mix(0, 0.05, mood.energy);
    pendulum.rotation.z = swing * 0.7;
    return {
      object: root, camera, background, capacity: slots.length, ground: felt, keyLight: key, place,
      update(dt, time) {
        pendulum.rotation.z = Math.sin(time * 1.9) * swing;
        haze.forEach((wisp, index) => { wisp.rotation.z += dt * 0.09 * (index % 2 ? 1 : -1) * mix(0.3, 1.5, mood.energy); });
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
