import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PALETTES = {
  classic: ['#e2a310', '#c6341c', '#8a6a3a', '#2b3fa0', '#d96a12', '#6b7a2c', '#f0d9a0', '#7a2a1a'],
  earth: ['#8a6a3a', '#a5793f', '#5b3b22', '#c9a56a', '#70502c', '#b98a4d'],
  hot: ['#c6341c', '#e0531a', '#e2a310', '#a81f1f', '#f07a1a', '#7a1d14'],
  dyes: ['#2b3fa0', '#c2247e', '#f0b70c', '#1f9a6b', '#7b2fb0', '#e8491e', '#19a6c4'],
  saffron: ['#e2a310', '#eeb422', '#d98a0c', '#f2c84a'],
};

function front(kind: 'tile' | 'cloth' | 'wood' | 'crates', random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const g = canvas.getContext('2d')!;
  if (kind === 'tile') {
    const inks = ['#1f5fa8', '#f1ead6', '#1f8a6b', '#d9a12a'];
    for (let x = 0; x < 8; x++) for (let y = 0; y < 4; y++) {
      g.fillStyle = (x + y) % 2 ? '#f1ead6' : '#1f5fa8';
      g.fillRect(x * 64, y * 64, 64, 64);
      g.fillStyle = inks[(x * 3 + y) % 4 === ((x + y) % 2 ? 1 : 0) ? 2 : (x * 3 + y) % 4];
      g.save(); g.translate(x * 64 + 32, y * 64 + 32);
      for (let k = 0; k < 2; k++) { g.rotate(Math.PI / 4); g.fillRect(-19, -19, 38, 38); }
      g.fillStyle = '#f1ead6'; g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fill();
      g.restore();
      g.strokeStyle = '#3a3a34'; g.lineWidth = 2; g.strokeRect(x * 64, y * 64, 64, 64);
    }
  } else if (kind === 'cloth') {
    const inks = ['#b7332a', '#f0e6cc', '#d98e1f', '#f0e6cc', '#2c5a8c', '#f0e6cc'];
    for (let x = 0; x < 24; x++) { g.fillStyle = inks[x % inks.length]; g.fillRect(x * 22, 0, 22, 256); }
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = 0; x < 9; x++) g.fillRect(x * 60 + random() * 20, 0, 9, 256);
  } else if (kind === 'wood') {
    for (let x = 0; x < 8; x++) {
      g.fillStyle = `hsl(${24 + random() * 8},${38 + random() * 10}%,${26 + random() * 9}%)`;
      g.fillRect(x * 64, 0, 62, 256);
      g.fillStyle = '#2a1a10'; g.fillRect(x * 64 + 62, 0, 2, 256);
      g.strokeStyle = '#d7a868'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(x * 64 + 31, 60); g.lineTo(x * 64 + 54, 128); g.lineTo(x * 64 + 31, 196); g.lineTo(x * 64 + 8, 128); g.closePath(); g.stroke();
    }
  } else {
    g.fillStyle = '#2a2018'; g.fillRect(0, 0, 512, 256);
    for (let y = 0; y < 6; y++) {
      g.fillStyle = `hsl(${32 + random() * 8},${36 + random() * 10}%,${52 + random() * 12}%)`;
      g.fillRect(0, y * 43 + 4, 512, 34);
    }
    g.fillStyle = '#6c5332';
    for (const x of [0, 164, 248, 340, 496]) g.fillRect(x, 0, 16, 256);
    g.fillStyle = '#7a1f1a'; g.font = 'bold 34px monospace'; g.fillText('MAROC', 40, 124); g.fillText('N° 7', 372, 210);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    palette: choice('What colours are the spice cones?', {
      classic: 'The postcard mix: turmeric yellow, paprika red, cumin brown, indigo blue and more.',
      earth: 'Quiet browns and ochres, the working spices of a kitchen.',
      hot: 'All fire: reds, oranges and chilli crimson.',
      dyes: 'Impossible pigment colours, magenta, cobalt, viridian, more dye than food.',
      saffron: 'Nothing but shades of gold and saffron.',
    }),
    height: score('How tall are the cones?', ['Low modest mounds', 'Neat pointed cones', 'Tall showpiece spires as long as a forearm']),
    state: choice('What has happened to the cones?', {
      pristine: 'Untouched, every point perfect, just smoothed this morning.',
      scooped: 'One has just been cut into, its top gone and the scoop still standing in it.',
      collapsed: 'One has slumped and avalanched over the counter and down onto the ground.',
      sold: 'One bowl is sold out and stands empty with a dusting of colour in it.',
      picked: 'A long day: most cones have flattened, worked-down tops.',
    }),
    vessel: choice('What do the cones stand in?', {
      brass: 'Shallow polished brass bowls.',
      basket: 'Round woven palm baskets.',
      sack: 'Fat burlap sacks with rolled-down rims.',
      tin: 'Plain dented tin tubs.',
    }),
    counter: choice('What is the counter front like?', {
      tile: 'Blue and white zellige tiles with star motifs.',
      cloth: 'A striped cloth hung over trestles.',
      wood: 'Dark carved cedar boards.',
      crates: 'Rough slatted crates with stencilled marks.',
    }),
    shade: choice('What is over the stall?', {
      none: 'Nothing, the cones stand in the open.',
      awning: 'A striped cloth awning on four poles.',
      reed: 'A reed mat roof letting thin lines of sun through.',
    }),
    twists: noul('Is there a tin of filled paper twists ready to hand over?'),
    balance: noul('Is there a brass balance scale on the counter?'),
    riser: choice('How are the back-row spice vessels supported?', {flat:'Both rows sit on one flat counter.',step:'The back row stands on one low wooden riser.',high:'A taller rear riser lifts the back bowls.',peaks:'Individual riser blocks grow higher toward the ends.'}),
    mound: choice('How are the intact spice mounds shaped?', {cone:'Smooth sharply pointed cones.',fluted:'Vertical flutes run from base to tip.',steps:'Several narrow terraces climb each mound.',round:'Rounded domes replace the pointed cones.'}),
    labels: choice('How are the measured portions marked?', {cards:'Small cream weight cards on thin stakes.',slate:'Dark chalk slates lean on the front rim.',metal:'Small engraved metal number tags.',none:'No labels, only the colours of the spices.'}),
    scooper: choice('What kind of scoop is being used?', {narrow:'A narrow half-round metal scoop.',wide:'A broad deep metal scoop.',flat:'A flat-sided rectangular scoop.',wooden:'A carved wooden scoop with a short handle.'}),
    edging: choice('How is the counter edge protected?', {rail:'A narrow brass rail on short supports.',scallop:'A carved scalloped wooden apron.',corners:'Metal guards cover the counter corners.',plain:'A plain thick wooden edge.'}),
    stock: choice('What supplies stand beside the stall?', {sacks:'Two tied reserve spice sacks.',tins:'Lidded metal storage canisters.',weights:'A shallow case of weighing weights.',packets:'A stack of folded paper bags and a spool of string.'}),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const n = 3 + Math.round(mood.density * 3);
    const pitch = 0.36, deep = 0.86, topY = 0.82;
    const left = a.balance ? 0.42 : 0, right = a.twists ? 0.3 : 0;
    const run = n * pitch + 0.16;
    const x0 = -run / 2 - left, x1 = run / 2 + right, cx = (x0 + x1) / 2, width = x1 - x0;

    // Counter.
    const wood = s.material('#6d4526', { roughness: 0.8 });
    s.box([width, topY - 0.05, deep], [cx, (topY - 0.05) / 2, 0], s.material({ tile: '#d8d2c0', cloth: '#b7a384', wood: '#5a3820', crates: '#8d7146' }[a.counter]));
    s.mesh(new THREE.PlaneGeometry(width, topY - 0.05), new THREE.MeshStandardMaterial({ map: front(a.counter, random), roughness: 0.75 }), [cx, (topY - 0.05) / 2, deep / 2 + 0.003]);
    s.box([width + 0.08, 0.05, deep + 0.08], [cx, topY - 0.025, 0], wood);
    const rise=(i:number)=>a.riser==='flat'?0:a.riser==='high'?.27:a.riser==='peaks'?.12+Math.abs(i-(n-1)/2)*.055:.14;
    for(let i=0;i<n;i++){const h=rise(i);if(h>0)s.box([pitch,h,.36],[(i-(n-1)/2)*pitch,topY+h/2,-.22],wood);}
    const edging=s.material('#c4a15d',{metalness:.65,roughness:.35});
    if(a.edging==='rail'){for(let i=0;i<5;i++)s.rod([cx-width*.45+i*width*.225,topY,deep*.53],[cx-width*.45+i*width*.225,topY+.09,deep*.53],.008,edging);s.rod([cx-width*.48,topY+.09,deep*.53],[cx+width*.48,topY+.09,deep*.53],.009,edging);}
    if(a.edging==='scallop')for(let i=0;i<Math.ceil(width/.12);i++)s.ball([.07,.07,.018],[x0+.05+i*.12,topY-.075,deep/2+.025],wood,12);
    if(a.edging==='corners')for(const x of[x0-.03,x1+.03])for(const z of[-deep/2-.02,deep/2+.02])s.box([.065,.11,.065],[x,topY-.045,z],edging);
    if(a.edging==='plain')s.box([width+.09,.045,.03],[cx,topY-.02,deep/2+.055],wood);

    const palette = PALETTES[a.palette].slice().sort(() => random() - 0.5);
    const rimR = { brass: 0.15, basket: 0.155, sack: 0.15, tin: 0.145 }[a.vessel];
    const rimH = { brass: 0.075, basket: 0.11, sack: 0.2, tin: 0.12 }[a.vessel];
    const vesselPaint = {
      brass: s.material('#c99a3c', { metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }),
      basket: s.material('#c7a05c', { roughness: 0.9, side: THREE.DoubleSide }),
      sack: s.material('#b29667', { roughness: 1, side: THREE.DoubleSide }),
      tin: s.material('#b3b8b8', { metalness: 0.7, roughness: 0.45, side: THREE.DoubleSide }),
    }[a.vessel];
    const vessel = (x: number, y: number, z: number) => {
      const bottom=a.vessel==='brass'?.05:a.vessel==='basket'?.11:a.vessel==='sack'?.1:.12;s.cylinder(bottom,bottom,.006,[x,y+.003,z],vesselPaint,24);
      if (a.vessel === 'brass') s.lathe([[0.05, 0], [0.075, 0.012], [0.13, 0.05], [rimR, rimH], [rimR + 0.012, rimH]], vesselPaint, [x, y, z]);
      else if (a.vessel === 'basket') {
        s.lathe([[0.11, 0], [0.12, 0.004], [rimR, rimH]], vesselPaint, [x, y, z]);
        for (const h of [0.03, 0.07, rimH]) s.ring(0.115 + h * 0.36, 0.008, [x, y + h, z], vesselPaint).rotation.x = Math.PI / 2;
      } else if (a.vessel === 'sack') {
        s.lathe([[0.1, 0], [0.15, 0.03], [0.165, 0.1], [rimR, rimH]], vesselPaint, [x, y, z]);
        s.ring(rimR, 0.022, [x, y + rimH - 0.01, z], vesselPaint).rotation.x = Math.PI / 2;
      } else s.lathe([[0.12, 0], [0.125, 0.004], [rimR, rimH], [rimR + 0.008, rimH]], vesselPaint, [x, y, z]);
    };
    const steel = s.material('#c8ccce', { metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide });
    const scoop = (x: number, y: number, z: number, tilt: number, turn: number) => {
      const group = new THREE.Group();
      const radius=a.scooper==='wide'?.049:a.scooper==='wooden'?.04:.034;const pan = new THREE.Mesh(a.scooper==='flat'?new THREE.BoxGeometry(.07,.012,.1):new THREE.CylinderGeometry(radius,radius*.76,.1,12,1,true,0,Math.PI),a.scooper==='wooden'?wood:steel);
      pan.rotation.z = a.scooper==='flat'?0:Math.PI/2;
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.11, 8), wood);
      handle.rotation.z = Math.PI / 2; handle.position.x = 0.1;
      pan.castShadow = handle.castShadow = true;
      group.add(pan, handle);if(a.scooper==='flat'){for(const zz of[-.044,.044]){const side=new THREE.Mesh(new THREE.BoxGeometry(.07,.035,.008),steel);side.position.set(0,.02,zz);group.add(side);}}
      group.position.set(x, y, z);
      group.rotation.set(0, turn, tilt);
      s.root.add(group);if(Math.abs(tilt)<.01){group.updateMatrixWorld(true);group.position.y+=topY-new THREE.Box3().setFromObject(group,true).min.y;}
    };

    const tall = mix(0.16, 0.56, a.height);
    const flawed = Math.floor(random() * n);
    for (let row = 0; row < 2; row++) for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * pitch + (random() - 0.5) * 0.02;
      const z = row ? -0.22 : 0.2, y = topY + (row ? rise(i) : 0);
      const colour = palette[(i + row * 3) % palette.length];
      const powder = s.material(colour, { roughness: 1, emissive: colour, emissiveIntensity: mix(0.1, 0.3, mood.cheer) });
      vessel(x, y, z);
      const base = y + rimH - 0.015, r = rimR * 0.93;
      const h = tall * (row ? 1.18 : 1) * mix(0.9, 1.08, random());
      const special = row === 0 && i === flawed ? a.state : 'pristine';
      const worked = a.state === 'picked' && random() < 0.7;
      if (special === 'sold') {
        s.cylinder(r * 0.8, r * 0.6, 0.006, [x, y + 0.03, z], powder, 16);
      } else if (special === 'collapsed') {
        s.ball([r * 1.2, 0.07, r * 1.2], [x + 0.03, base + 0.01, z + 0.04], powder);
        for (let k = 0; k < 4; k++) s.ball([0.07 + random() * 0.06, 0.012, 0.06 + random() * 0.05], [x + (random() - 0.5) * 0.2, topY + 0.004, z + 0.14 + random() * 0.1], powder, 10);
        s.box([0.1 + random() * 0.06, 0.5, 0.008], [x + 0.02, topY - 0.27, deep / 2 + 0.045], powder);
        s.ball([0.2, 0.05, 0.16], [x + 0.03, 0.01, deep / 2 + 0.16], powder, 14);
        s.ball([0.09, 0.025, 0.08], [x + 0.2, 0.005, deep / 2 + 0.3], powder, 10);
      } else if (special === 'scooped' || worked) {
        const cut = special === 'scooped' ? 0.58 : mix(0.45, 0.8, random());
        s.lathe([[r, 0], [r * (1 - cut * 0.92), h * cut], [r * (1 - cut) * 0.6, h * cut - 0.012], [0, h * cut - 0.02]], powder, [x, base, z]);
        if (special === 'scooped') {
          scoop(x - 0.02, base + h * cut + 0.04, z, -1.1, 0.5);
          s.ball([0.05, 0.01, 0.04], [x + 0.1, topY + 0.004, z + 0.17], powder, 10);
        }
      } else {
        const profile:[number,number][]=a.mound==='round'?[[r,0],[r*.96,h*.22],[r*.8,h*.56],[r*.48,h*.85],[0,h]]:a.mound==='steps'?Array.from({length:6},(_,k)=>[[r*(1-k/6),h*k/6],[r*(1-k/6),h*(k+.65)/6]] as [number,number][]).flat().concat([[0,h]]):[[r,0],[r*.5,h*.52],[r*.12,h*.9],[r*.05,h*.97],[0,h]];
        const mound=s.lathe(profile,powder,[x,base,z]);if(a.mound==='fluted'){const pos=mound.geometry.getAttribute('position');for(let j=0;j<pos.count;j++){const t=Math.atan2(pos.getZ(j),pos.getX(j)),k=1+.08*Math.cos(t*10);pos.setX(j,pos.getX(j)*k);pos.setZ(j,pos.getZ(j)*k);}pos.needsUpdate=true;mound.geometry.computeVertexNormals();}
      }
    }
    if(a.labels!=='none')for(let i=0;i<n;i++){const x=(i-(n-1)/2)*pitch,z=deep/2+.03;if(a.labels==='cards'){s.rod([x,topY,z],[x,topY+.18,z],.004,wood);s.label(`${100+i*50} g`,.15,.07,[x,topY+.17,z+.004],'#34352c','#e5dfc9');}else if(a.labels==='slate'){const sign=s.label(`${100+i*50} g`,.14,.085,[x,topY+.044,z+.015],'#eee8d2','#3d4845');sign.rotation.x=-.2;s.box([.15,.03,.055],[x,topY+.015,z-.01],wood);}else{s.box([.12,.055,.008],[x,topY-.035,z+.014],edging);s.label(String(i+1),.07,.04,[x,topY-.034,z+.02],'#463c29','#c4a15d');}}
    if (a.state !== 'scooped') scoop((random() - 0.5) * run * 0.6, topY + 0.03, 0.4, 0, random() * 2 - 1);

    if (a.twists) {
      const tx = run / 2 + 0.13;
      s.cylinder(0.085, 0.07, 0.12, [tx, topY + 0.06, 0.12], s.material('#9aa3a3', { metalness: 0.6 }), 14);
      const paper = s.material(mood.cheer > 0.5 ? '#f3c6c9' : '#e9e2cf', { side: THREE.DoubleSide });
      const count = 4 + Math.floor(random() * 4);
      for (let k = 0; k < count; k++) {
        const angle = k / count * Math.PI * 2, lean = 0.25 + random() * 0.15;
        const cone = s.mesh(new THREE.ConeGeometry(0.036, 0.17, 10, 1, true), paper, [tx + Math.cos(angle) * 0.045, topY + 0.15, 0.12 + Math.sin(angle) * 0.045]);
        cone.rotation.set(Math.PI + Math.sin(angle) * lean, 0, -Math.cos(angle) * lean);
        const colour = palette[k % palette.length];
        s.ball([0.03, 0.022, 0.03], [tx + Math.cos(angle) * 0.065, topY + 0.235, 0.12 + Math.sin(angle) * 0.065], s.material(colour, { emissive: colour, emissiveIntensity: 0.15 }), 8);
      }
    }
    if (a.balance) {
      const brass = s.material('#c99a3c', { metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide });
      const bx = -run / 2 - 0.2, by = topY, bz = 0.1, tip = (random() - 0.5) * 0.3;
      s.cylinder(0.07, 0.085, 0.025, [bx, by + 0.012, bz], brass, 16);
      s.rod([bx, by, bz], [bx, by + 0.42, bz], 0.012, brass);
      s.ball([0.022, 0.022, 0.022], [bx, by + 0.44, bz], brass, 10);
      const dx = Math.cos(tip) * 0.19, dy = Math.sin(tip) * 0.19;
      s.rod([bx - dx, by + 0.4 - dy, bz], [bx + dx, by + 0.4 + dy, bz], 0.008, brass);
      for (const side of [-1, 1]) {
        const px = bx + side * dx, py = by + 0.4 + side * dy, pan = py - 0.22;
        for (const k of [0, 1, 2]) s.rod([px, py, bz], [px + Math.cos(k * 2.1) * 0.07, pan + 0.012, bz + Math.sin(k * 2.1) * 0.07], 0.003, brass);
        s.lathe([[0, 0], [0.05, 0.004], [0.078, 0.02]], brass, [px, pan, bz]);
        if (side < 0) s.ball([0.05, 0.03, 0.05], [px, pan + 0.012, bz], s.material(palette[0], { emissive: palette[0], emissiveIntensity: 0.15 }), 10);
        else for (const k of [0, 1]) s.cylinder(0.016 - k * 0.004, 0.02 - k * 0.004, 0.03, [px - 0.02 + k * 0.04, pan + 0.025, bz], brass, 10);
      }
    }

    if (a.shade !== 'none') {
      const pole = s.material(a.shade === 'reed' ? '#c9b27a' : '#6d4526');
      const hw = width / 2 + 0.12;
      for (const sx of [-1, 1]) {
        s.rod([cx + sx * hw, 0, deep / 2 + 0.25], [cx + sx * hw, 2.0, deep / 2 + 0.25], 0.022, pole);
        s.rod([cx + sx * hw, 0, -deep / 2 - 0.05], [cx + sx * hw, 2.3, -deep / 2 - 0.05], 0.022, pole);
        s.rod([cx + sx * hw, 2.3, -deep / 2 - 0.05], [cx + sx * hw, 1.98, deep / 2 + 0.4], 0.018, pole);
      }
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const g = canvas.getContext('2d')!;
      if (a.shade === 'awning') {
        const inks = mood.warmth > 0.5 ? ['#c4472d', '#f1e6c8'] : ['#2f6c8f', '#f1e6c8'];
        for (let i = 0; i < 12; i++) { g.fillStyle = inks[i % 2]; g.fillRect(i * 22, 0, 22, 256); }
      } else {
        g.fillStyle = '#c8ae72'; g.fillRect(0, 0, 256, 256);
        g.strokeStyle = '#8a7240'; g.lineWidth = 2;
        for (let i = 0; i < 43; i++) { g.beginPath(); g.moveTo(0, i * 6); g.lineTo(256, i * 6 + random() * 2); g.stroke(); }
        g.strokeStyle = '#5c4a28'; g.lineWidth = 3;
        for (const x of [40, 128, 216]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const span = deep + 0.5, drop = 0.32;
      const cloth = s.mesh(new THREE.BoxGeometry(hw * 2 + 0.1, 0.012, Math.hypot(span, drop)), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide }), [cx, 2.16, 0.17]);
      cloth.rotation.x = Math.atan2(drop, span);
      if (a.shade === 'awning') s.mesh(new THREE.PlaneGeometry(hw * 2 + 0.1, 0.16), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide }), [cx, 1.92, deep / 2 + 0.42]);
    }
    const sx=x1+.26,sz=.27,canvas=s.material('#b49a70');
    if(a.stock==='sacks')for(let i=0;i<2;i++){const x=sx+i*.22,z=sz-i*.32;s.lathe([[0,0],[.105,0],[.14,.07],[.13,.22],[.06,.3],[.03,.32],[0,.33]],canvas,[x,0,z]);s.ring(.055,.012,[x,.29,z],wood).rotateX(Math.PI/2);}
    if(a.stock==='tins')for(let i=0;i<2;i++){const x=sx,z=sz-i*.3,h=.24+i*.09;s.cylinder(.105,.105,h,[x,h/2,z],steel,24);s.cylinder(.112,.112,.025,[x,h+.0125,z],edging,24);s.box([.09,.07,.009],[x,h*.6,z+.107],wood);}
    if(a.stock==='weights'){s.box([.34,.045,.24],[sx,.0225,sz],wood);for(let i=0;i<4;i++){const x=sx-.11+(i%2)*.12,z=sz-.06+Math.floor(i/2)*.12,r=.025+i*.006;s.cylinder(r,r*1.1,.055,[x,.0725,z],edging,12);s.ring(r*.5,.005,[x,.11,z],edging);}}
    if(a.stock==='packets'){for(let i=0;i<12;i++)s.box([.26,.006,.2],[sx,.003+i*.006,sz],s.material('#d8c8a6'));s.cylinder(.055,.055,.12,[sx,.06,sz-.24],wood,16);for(let i=0;i<10;i++)s.ring(.057,.004,[sx,.012+i*.01,sz-.24],canvas).rotateX(Math.PI/2);}
    return s.finish();
  },
});
