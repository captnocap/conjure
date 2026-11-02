import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, score } from '@conjure/kit';

type P = [number, number, number];
const SIGNS = { spot: 'SUYA SPOT', mallam: 'MALLAM SUYA', hot: 'HOT SUYA HERE', kano: 'ORIGINAL KANO SUYA', credit: 'NO CREDIT TODAY', none: '' } as const;

function board(lines: readonly string[], w: number, h: number, ink: string, paper: string, random: () => number, small = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(48, Math.round((512 * h) / w));
  const c = canvas.getContext('2d')!;
  c.fillStyle = paper;
  c.fillRect(0, 0, canvas.width, canvas.height);
  if (small) {
    // Newsprint: a headline bar and columns of grey lines.
    c.fillStyle = '#3a3a3a';
    c.fillRect(24, 20, 300, 34);
    c.fillStyle = '#8a8a86';
    for (let col = 0; col < 4; col++) for (let y = 80; y < canvas.height - 16; y += 12) c.fillRect(24 + col * 122, y, 100 * (0.7 + random() * 0.3), 5);
    c.fillStyle = '#9a9a96';
    c.fillRect(350, 16, 140, 50);
  } else {
    const longest = Math.max(...lines.map((line) => line.length));
    const size = Math.min((canvas.height / lines.length) * 0.72, (512 / longest) * 1.5);
    c.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    lines.forEach((line, index) => {
      c.save();
      c.translate(256, (canvas.height * (index + 0.5)) / lines.length);
      c.rotate((random() - 0.5) * 0.06);
      c.fillStyle = index % 2 ? '#1a1a1a' : ink;
      c.fillText(line, 0, 0, 480);
      c.restore();
    });
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide });
}

export default defineThing({
  questions: {
    grillLength: score('How long is the cut-drum grill?', ['A compact short drum', 'A regular roadside grill', 'A longer grill with room for several orders']),
    grate: choice('What lies across the open drum?', {
      wires: 'Fine parallel wires with cross supports.', grid: 'A close square grid of rods.',
      bars: 'A few heavy broad bars.', diagonal: 'Crossed diagonal rods inside a rectangular frame.',
    }),
    windbreak: choice('What shelters the coal bed from the wind?', {
      none: 'No windbreak.', rear: 'One low sheet behind the coals.',
      sides: 'A low rear sheet and two short side cheeks.', tall: 'A taller rear shield on two stays.',
    }),
    prepSurface: choice('What covers the wrapping table?', {
      wood: 'Bare timber.', zinc: 'A folded dull zinc sheet.', stone: 'A flat dark stone slab.', tile: 'Small pale square tiles.',
    }),
    seasonings: choice('How are extra seasonings kept?', {
      bowl: 'Just the usual bowl of yaji.', pots: 'Two lidded metal seasoning pots.',
      jars: 'Three small spice jars.', stack: 'A short stack of enamel saucers.',
    }),
    orderRack: choice('Where do finished parcels wait?', {
      table: 'On the wrapping table.', shelf: 'On a narrow raised shelf behind the table.',
      basket: 'In a shallow woven basket on a side stool.', tray: 'On a metal serving tray beside the table.',
    }),
    fuelStore: choice('How is spare charcoal stored?', {
      sack: 'In the familiar soft sack.', bucket: 'In an open black bucket.',
      crate: 'In a timber crate.', bin: 'In a squat metal storage bin with its lid set aside.',
    }),
    loaded: score('How loaded is the grill?', ['Two last sticks', 'A handful spaced out', 'A full row', 'Shingled edge to edge, more stacked on the rim']),
    coals: choice('What state are the coals in?', {
      fierce: 'Fierce: white-orange, licking flames, sparks jumping.',
      steady: 'A steady deep-orange bed, the working heat.',
      dying: 'Dying: grey ash with a few red eyes.',
      cold: 'Cold black charcoal, not yet lit or long since out.',
    }),
    meat: choice('What is on the sticks?', {
      beef: 'Thin flat sheets of beef threaded like ribbons, rust-red with pepper.',
      chunks: 'Fat cubes of ram and beef with onion between.',
      gizzard: 'Beads of gizzard and kidney, small and dark.',
      chicken: 'Whole spatchcocked chicken pieces, golden.',
    }),
    drum: choice('What does the cut drum look like?', {
      blue: 'A blue oil drum, paint blistering near the coals.',
      red: 'A red drum with a faded stencil.',
      rust: 'Bare rusted steel.',
      black: 'Black with years of soot and fat.',
    }),
    sign: choice('What does the hand-lettered sign say?', {
      spot: 'SUYA SPOT.',
      mallam: 'MALLAM SUYA, named for the man himself.',
      hot: 'HOT SUYA HERE.',
      kano: 'ORIGINAL KANO SUYA, a claim of northern pedigree.',
      credit: 'NO CREDIT TODAY, come tomorrow.',
      none: 'No sign: the smoke is the sign.',
    }),
    queue: choice('What marks the queue?', {
      none: 'Nothing: nobody has come yet.',
      path: 'A trampled dark path of footprints up to the grill.',
      bench: 'A plank bench and a plastic stool where people wait.',
      waiting: 'Two customers standing, watching their order.',
    }),
    keeper: choice('Who is tending it right now?', {
      fanning: 'The mallam, fanning the coals with a raffia fan.',
      wrapping: 'The mallam at the side table, wrapping an order in newspaper.',
      away: 'Nobody: the fan lies on the table and the meat is on its own.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const iron = s.material('#3a3836', { roughness: 0.8, metalness: 0.4 });
    const wood = s.material('#8a6a44');
    const heat = { fierce: 1, steady: 0.65, dying: 0.25, cold: 0 }[a.coals];

    // The half drum on angle-iron legs.
    const R = .3,L=mix(.85,1.2,a.grillLength),top=.86;
    const drumMat = s.material({ blue: '#2a5aa8', red: '#b8342a', rust: '#8a4e2c', black: '#26221f' }[a.drum], { side: THREE.DoubleSide, roughness: 0.75, metalness: 0.3 });
    const shell = s.mesh(new THREE.CylinderGeometry(R, R, L, 24, 1, true, Math.PI, Math.PI), drumMat, [0, top, 0]);
    shell.rotation.z = Math.PI / 2;
    for (const x of [-1, 1]) {
      const cap = s.mesh(new THREE.CircleGeometry(R, 24, Math.PI, Math.PI), drumMat, [x * L / 2, top, 0]);
      cap.rotation.y = Math.PI / 2;
      const rib = s.ring(R + 0.006, 0.012, [x * L * 0.17, top, 0], drumMat, Math.PI);
      rib.rotation.set(0, Math.PI / 2, 0);
      rib.rotateZ(Math.PI);
    }
    // Scorch above the coal line.
    const soot = s.mesh(new THREE.CylinderGeometry(R + 0.004, R + 0.004, L * 0.9, 24, 1, true, Math.PI, Math.PI * 0.2), s.material('#1c1917', { side: THREE.DoubleSide }), [0, top, 0]);
    soot.rotation.z = Math.PI / 2;
    const soot2 = soot.clone();
    soot2.rotation.set(0, Math.PI, Math.PI / 2);
    s.root.add(soot2);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.rod([x * L*.42, top - .12, z * 0.27], [x * L*.48, 0, z * 0.33], 0.018, iron);
    }
    for (const z of [-1, 1]) s.rod([-L*.46,.25,z*.31],[L*.46,.25,z*.31], 0.012, iron);
    for (const x of [-1, 1]) s.rod([x*L*.46,.25,-.31],[x*L*.46,.25,.31], 0.012, iron);
    if(a.windbreak!=='none'){
      const h=a.windbreak==='tall'?.4:.2;s.box([L+.06,h,.014],[0,top+h/2,-.315],iron);
      for(const x of[-L*.43,L*.43])s.rod([x,top-.18,-.27],[x,top+h*.9,-.322],.008,iron);
      if(a.windbreak==='sides')for(const x of[-1,1])s.box([.014,h,.6],[x*(L/2+.022),top+h/2,0],iron);
    }
    // Coal bed.
    const bedY = top - 0.11;
    for(const x of[-L*.35,L*.35])for(const z of[-.2,.2])s.rod([x,top-Math.sqrt(R*R-z*z),z],[x,bedY-.045,z],.009,iron);
    s.box([L - 0.04, 0.03, 0.5], [0, bedY - 0.03, 0], s.material('#1a1715'));
    const glow = new THREE.MeshStandardMaterial({ color: heat > 0.8 ? '#ffd9a0' : '#ff7a2a', emissive: heat > 0.8 ? '#ffb040' : '#ff4a12', emissiveIntensity: mix(0.6, 2.2, heat), roughness: 0.9 });
    const ash = s.material(a.coals === 'cold' ? '#1c1a19' : '#8f8a84', { roughness: 1 });
    const lumps = (material: THREE.Material, count: number) => {
      if (!count) return;
      const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), material, count);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        dummy.position.set((random() - 0.5) * (L - 0.1), bedY + random() * 0.03, (random() - 0.5) * 0.46);
        dummy.rotation.set(random() * 3, random() * 3, random() * 3);
        dummy.scale.setScalar(0.022 + random() * 0.02);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.castShadow = false;
      s.root.add(mesh);
    };
    lumps(glow, Math.round(heat * 90));
    lumps(ash, Math.round((1 - heat) * 90) + 20);
    const flames: THREE.Mesh[] = [];
    if (a.coals === 'fierce') for (let i = 0; i < 7; i++) {
      const flame = s.mesh(new THREE.ConeGeometry(0.03 + random() * 0.02, 0.1 + random() * 0.1, 6), new THREE.MeshStandardMaterial({ color: '#ffd070', emissive: '#ff9020', emissiveIntensity: 2, transparent: true, opacity: 0.85, depthWrite: false }), [(random() - 0.5) * (L - 0.15), top + 0.03, (random() - 0.5) * 0.4]);
      flame.castShadow = false;
      flames.push(flame);
    }
    // Grate.
    const wire = s.material('#55504a', { metalness: 0.6, roughness: 0.5 });
    for(const z of[-.29,.29])s.rod([-L/2,top+.005,z],[L/2,top+.005,z],.006,wire);
    for(const x of[-L/2,L/2])s.rod([x,top+.005,-.29],[x,top+.005,.29],.006,wire);
    if(a.grate==='diagonal'){
      for(let i=-7;i<=7;i++)for(const sign of[-1,1]){
        const c=i*.12,points:P[]=[];for(const x of[-L/2,L/2]){const z=sign*x+c;if(Math.abs(z)<=.29)points.push([x,top+.005,z]);}
        for(const z of[-.29,.29]){const x=(z-c)/sign;if(Math.abs(x)<L/2)points.push([x,top+.005,z]);}
        if(points.length===2)s.rod(points[0],points[1],.004,wire);
      }
    }else{
      const count=a.grate==='bars'?5:a.grate==='grid'?13:9;
      for(let i=0;i<count;i++)s.rod([-L/2,top+.005,mix(-.28,.28,i/(count-1))],[L/2,top+.005,mix(-.28,.28,i/(count-1))],a.grate==='bars'?.009:.004,wire);
      const cross=a.grate==='grid'?11:5;for(let i=0;i<cross;i++){const x=mix(-L/2+.05,L/2-.05,i/(cross-1));s.rod([x,top+.008,-.3],[x,top+.008,.3],.005,wire);}
    }

    // Skewers.
    const raw = s.material('#9a3a2a'), done = s.material('#6a3418'), charred = s.material('#3a2014'), stickMat = s.material('#d8c08a');
    const golden = s.material('#c88a34'), onionMat = s.material('#e8dce8');
    const skewer = (at: P, turn: number, tilt = 0) => {
      const group = new THREE.Group();
      const cooked = heat === 0 ? raw : random() < 0.25 + mood.wear * 0.2 ? charred : random() < 0.5 ? done : s.material('#84402a');
      group.add(s.rod([0, 0, -0.36], [0, 0, 0.36], 0.004, stickMat));
      if (a.meat === 'beef') {
        for (let i = 0; i < 3; i++) {
          const sheet = s.box([0.07 + random() * 0.03, 0.012, 0.15], [0, 0.004, -0.16 + i * 0.15], cooked);
          sheet.rotation.set(0, (random() - 0.5) * 0.3, (random() - 0.5) * 0.25);
          group.add(sheet);
        }
      } else if (a.meat === 'chunks') {
        for (let i = 0; i < 7; i++) group.add(s.box([0.04, 0.035, 0.04], [0, 0.005, -0.21 + i * 0.07], i % 3 === 1 ? onionMat : cooked));
      } else if (a.meat === 'gizzard') {
        for (let i = 0; i < 10; i++) group.add(s.ball([0.022, 0.018, 0.022], [0, 0.004, -0.2 + i * 0.045], i % 4 === 2 ? charred : cooked, 6));
      } else {
        group.add(s.ball([0.08, 0.03, 0.12], [0, 0.012, -0.05], heat === 0 ? s.material('#e0b89a') : golden, 10));
        group.add(s.ball([0.035, 0.025, 0.07], [0.03, 0.012, 0.13], heat === 0 ? s.material('#e0b89a') : golden, 8));
      }
      group.position.set(...at);
      group.rotation.set(tilt, turn, 0);
      s.root.add(group);group.updateMatrixWorld(true);group.position.y+=at[1]-new THREE.Box3().setFromObject(group,true).min.y;
    };
    const sticks = Math.round(mix(2, a.meat === 'chicken' ? 6 : 13, Math.min(1, a.loaded / 0.8)));
    for (let i = 0; i < sticks; i++) skewer([mix(-L / 2 + 0.07, L / 2 - 0.07, sticks === 1 ? 0.5 : (i + random() * 0.4) / sticks), top + .014, (random() - 0.5) * 0.04], (random() - 0.5) * 0.2);
    if (a.loaded > 0.8) for (let i = 0; i < 5; i++) skewer([-0.3 + i * 0.07, top + 0.05 + i * 0.004, 0.02], 1.2 + random() * 0.3, 0);

    // Side table with the wrapping station.
    const tx=L/2+.54,th=.72;
    s.box([0.72, 0.035, 0.62], [tx, th, 0], wood);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([tx + x * 0.31, th, z * 0.26], [tx + x * 0.33, 0, z * 0.28], 0.022, wood);
    const surfaceY=th+.0175;
    if(a.prepSurface==='zinc')s.box([.72,.004,.62],[tx,surfaceY+.002,0],s.material('#a6aaa6',{metalness:.55}));
    else if(a.prepSurface==='stone')s.box([.72,.012,.62],[tx,surfaceY+.006,0],s.material('#575d57'));
    else if(a.prepSurface==='tile')for(let ix=0;ix<6;ix++)for(let iz=0;iz<5;iz++)s.box([.115,.008,.119],[tx-.3+ix*.12,surfaceY+.004,-.248+iz*.124],s.material((ix+iz)%2?'#e3d8bd':'#c6c3b0'));
    const surfaceLift=a.prepSurface==='stone'?.012:a.prepSurface==='tile'?.008:a.prepSurface==='zinc'?.004:0;
    const tableContentsStart=new Set(s.root.children);
    const paper = board([], 0.4, 0.3, '', '#e9e4d2', random, true);
    for (let i = 0; i < 3; i++) {
      const sheet = s.mesh(new THREE.PlaneGeometry(0.4, 0.3), paper, [tx - 0.12 + i * 0.012, th + 0.022 + i * 0.004, 0.13]);
      sheet.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.4);
    }
    // Wrapped orders: twists of newspaper.
    const wraps = 1 + Math.floor(random() * 3) + (a.queue === 'none' ? 0 : 1);
    for (let i = 0; i < wraps; i++) {
      const wrap = s.mesh(new THREE.ConeGeometry(0.055, 0.2, 7), s.material('#e3decb'), [tx + 0.2 + (random() - 0.5) * 0.1, th + 0.06, -0.18 + i * 0.1]);
      wrap.rotation.set(Math.PI/2+(random()-.5)*.3,0,random()*3);wrap.updateMatrixWorld(true);wrap.position.y+=surfaceY-new THREE.Box3().setFromObject(wrap,true).min.y;
    }
    // Onion rings, tomato, cabbage, a bowl of yaji pepper, a knife.
    for (let i = 0; i < 7; i++) s.ring(0.022 + random() * 0.014, 0.005, [tx - 0.2 + random() * 0.14, th + 0.025 + i * 0.002, -0.2 + random() * 0.12], s.material(i % 2 ? '#e9e0ea' : '#a86a9a')).rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) s.cylinder(0.03, 0.03, 0.01, [tx - 0.02 + random() * 0.1, th + 0.026 + i * 0.006, -0.22 + random() * 0.06], s.material('#c8322a'), 10);
    s.ball([0.07, 0.035, 0.06], [tx + 0.02, th + 0.04, -0.06], s.material('#b8d08a'), 8);
    s.lathe([[0, 0], [0.05, 0], [0.085, 0.05], [0.08, 0.05], [0.045, 0.01], [0, 0.01]], s.material('#d8d4c8', { side: THREE.DoubleSide }), [tx + 0.24, th + 0.018, 0.2]);
    s.ball([0.07, 0.03, 0.07], [tx + 0.24, th + 0.055, 0.2], s.material('#c2541c'), 10);
    s.box([0.2, 0.004, 0.03], [tx - 0.05, th + 0.022, -0.1], s.material('#c8cdd0', { metalness: 0.8, roughness: 0.3 })).rotation.y = 0.5;
    s.cylinder(0.035, 0.035, 0.16, [tx + 0.28, th + 0.1, -0.02], s.material('#d8a81c', { roughness: 0.2 }), 10);

    for(const node of s.root.children)if(!tableContentsStart.has(node))node.position.y+=surfaceLift;
    if(a.seasonings!=='bowl'){
      const x=tx-.24,z=-.2,y=surfaceY+surfaceLift;
      if(a.seasonings==='pots')for(const dx of[-.065,.065]){s.cylinder(.048,.043,.1,[x+dx,y+.05,z],iron,16);s.cylinder(.05,.05,.008,[x+dx,y+.104,z],iron,16);s.ball([.012,.012,.012],[x+dx,y+.117,z],wood,8);}
      else if(a.seasonings==='jars')for(let i=0;i<3;i++){s.cylinder(.03,.03,.1,[x-.08+i*.08,y+.05,z],s.material(['#a96731','#a4954c','#af532f'][i]),16);s.cylinder(.034,.034,.015,[x-.08+i*.08,y+.1075,z],iron,16);}
      else for(let i=0;i<4;i++)s.lathe([[0,0],[.05,0],[.075,.018],[.065,.024],[0,.008]],s.material('#dbd4be'),[x,y+i*.016,z]);
    }
    if(a.orderRack!=='table'){
      const x=tx+.57,z=.1,h=a.orderRack==='shelf'?th+.25:.46;
      if(a.orderRack==='shelf'){
        s.box([.6,.025,.2],[tx,h,-.37],wood);for(const dx of[-.27,.27])s.rod([tx+dx,0,-.37],[tx+dx,h,-.37],.018,wood);
        for(let i=0;i<3;i++)s.box([.13,.045,.13],[tx-.18+i*.18,h+.035,-.37],s.material('#e3decb'));
      }else{
        s.box([.35,.03,.32],[x,h,z],wood);for(const dx of[-.13,.13])for(const dz of[-.12,.12])s.rod([x+dx,0,z+dz],[x+dx,h-.015,z+dz],.016,wood);
        const mat=a.orderRack==='basket'?s.material('#a68c58'):s.material('#a4aba5',{metalness:.5});
        s.box([.34,.012,.3],[x,h+.021,z],mat);for(const dx of[-.165,.165])s.box([.012,.055,.3],[x+dx,h+.0545,z],mat);for(const dz of[-.145,.145])s.box([.34,.055,.012],[x,h+.0545,z+dz],mat);
        if(a.orderRack==='basket')for(let i=0;i<8;i++)for(const dz of[-.153,.153])s.box([.008,.06,.007],[x-.14+i*.04,h+.057,z+dz],wood);
        for(let i=0;i<3;i++)s.box([.08,.045,.17],[x-.1+i*.1,h+.0495,z],s.material('#e3decb'));
      }
    }
    // Lamp on a stick: lit when the sun is low.
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    s.rod([tx + 0.33, th, -0.28], [tx + 0.33, 1.75, -0.28], 0.012, wood);
    s.rod([tx + 0.33, 1.75, -0.28], [tx + 0.12, 1.78, -0.2], 0.008, wood);
    s.ball([0.045, 0.06, 0.045], [tx + 0.12, 1.7, -0.2], s.material('#fff4d0', { emissive: '#ffd880', emissiveIntensity: mix(0.1, 2.2, dusk) }), 10);

    // Sign.
    if (a.sign !== 'none') {
      const words = SIGNS[a.sign].split(' ');
      const lines = words.length > 2 ? [words.slice(0, words.length - 1).join(' '), words[words.length - 1]] : words;
      const w = 0.8, h = 0.42;
      const panel = s.mesh(new THREE.PlaneGeometry(w, h), board(lines, w, h, pick(['#b3261e', '#1b3f8f', '#1d6b3a']), pick(['#f0e6c0', '#f4f0e0', '#f2d24a']), random), [0, 0.3, 0.37]);
      panel.rotation.x=-.2;for(const x of[-.3,.3])s.rod([x,.25,.31],[x,.48,.40],.012,iron);
      s.box([w + 0.03, h + 0.03, 0.012], [0, 0.3, 0.362], wood).rotation.x = -0.2;
    }

    // Queue marks.
    if (a.queue === 'path') {
      const dust = s.material('#5a5247');
      const patch = s.cylinder(0.5, 0.5, 0.003, [0, 0.002, 1.1], dust, 16);
      patch.scale.set(0.8, 1, 1.6);
      for (let i = 0; i < 12; i++) {
        const print = s.cylinder(0.05, 0.05, 0.004, [(i % 2 ? 0.1 : -0.1) + (random() - 0.5) * 0.25, 0.004, 0.55 + i * 0.13], s.material('#3e382f'), 8);
        print.scale.set(0.8, 1, 2.1);
        print.rotation.y = (random() - 0.5) * 0.6;
      }
    }
    if (a.queue === 'bench') {
      const bz = 1.2;
      s.box([1.3, 0.04, 0.24], [-0.1, 0.4, bz], wood).rotation.y = 0.06;
      for (const x of [-0.6, 0.4]) { s.box([0.05, 0.4, 0.22], [x, 0.2, bz], wood); }
      const stool = s.material(pick(['#2a62c8', '#c8322a', '#2c8a56', '#f0f0e8']));
      s.cylinder(0.15, 0.19, 0.42, [0.95, 0.21, bz - 0.1], stool, 12);
      s.cylinder(0.16, 0.16, 0.02, [0.95, 0.43, bz - 0.1], stool, 12);
      s.cylinder(0.035, 0.035, 0.2, [0.2, 0.52, bz], s.material('#3a1c10', { roughness: 0.2 }), 8);
    }
    const poseAudit:{gaps:number[],floor:number}[]=[];
    const person=(at:P,facing:number,working:boolean)=>{
      const f=figure(s,{height:working?1.68:1.6,pose:'standing',style:'doll',hair:working?'cap':'short',top:working?'#d8d0b8':pick(['#c8402e','#2f6fb0','#2c8a56','#e0a020']),bottom:'#30383f',skin:pick(['#5a3a28','#6b4630','#4a2f20']),shoes:'#292928',face:'dots'});
      s.root.add(f.root);f.root.position.set(...at);f.root.rotation.y=facing;f.root.updateMatrixWorld(true);f.root.position.y-=new THREE.Box3().setFromObject(f.root,true).min.y;return f;
    };
    if(a.queue==='waiting'){person([-.3+random()*.2,0,1+random()*.15],Math.PI+.2,false);person([.45+random()*.2,0,1.45+random()*.2],Math.PI-.3,false);}
    if(a.keeper!=='away'){
      const f=person([a.keeper==='wrapping'?tx-.05:-.1,0,-.57],0,true),hip=new THREE.Vector3();f.pelvis.getWorldPosition(hip);
      const left=new THREE.Vector3(f.root.position.x+.15,hip.y+.04,-.18),right=new THREE.Vector3(f.root.position.x-.13,hip.y+.04,-.2);
      if(a.keeper==='wrapping'){
        // The order is held over the table, between the two hands.
        const cy=hip.y+.04;s.box([.29,.035,.18],[f.root.position.x,cy,-.18],s.material('#e3decb'));left.set(f.root.position.x+.15,cy,-.18);right.set(f.root.position.x-.15,cy,-.18);
      }else{
        const fanMat=s.material('#d8bc6a');s.rod(left.toArray() as P,[left.x,left.y-.055,left.z+.16],.012,fanMat);
        const fan=s.cylinder(.13,.13,.012,[left.x,left.y-.07,left.z+.24],fanMat,10);fan.rotation.x=.18;
        s.rod(right.toArray() as P,[right.x,top+.035,.12],.007,wood);
      }
      const gaps=[f.reach('left',left,{space:s.root}),f.reach('right',right,{space:s.root})];if(Math.max(...gaps)>1e-5)throw new Error('Suya keeper tool out of reach');f.lookAt(new THREE.Vector3(a.keeper==='wrapping'?tx:0,top,0),s.root);poseAudit.push({gaps,floor:new THREE.Box3().setFromObject(f.root,true).min.y});
    }else{
      const fan=s.cylinder(.13,.13,.008,[tx-.24,surfaceY+surfaceLift+.004,.16],s.material('#d8bc6a'),10);s.rod([tx-.24,surfaceY+surfaceLift+.01,.16],[tx-.36,surfaceY+surfaceLift+.01,.3],.008,wood);
    }
    s.root.userData.poseAudit=poseAudit;
    // Spare charcoal sack and wear.
    const fx=-L/2-.42,fz=-.15,coal=s.material('#1c1a19');let fuelTop=.5;
    if(a.fuelStore==='sack'){const sack=s.ball([.2,.26,.17],[fx,.26,fz],s.material('#b9a37a'),10);sack.updateMatrixWorld(true);sack.position.y-=new THREE.Box3().setFromObject(sack,true).min.y;fuelTop=.5;}
    else if(a.fuelStore==='bucket'){s.lathe([[0,0],[.16,0],[.22,.38],[.2,.38],[.14,.025],[0,.025]],iron,[fx,0,fz]);s.ring(.22,.012,[fx,.38,fz],iron,Math.PI);fuelTop=.36;}
    else if(a.fuelStore==='crate'){
      s.box([.45,.03,.36],[fx,.015,fz],wood);for(let j=0;j<3;j++){for(const z of[-.175,.175])s.box([.45,.085,.025],[fx,.08+j*.1,fz+z],wood);for(const x of[-.215,.215])s.box([.025,.085,.36],[fx+x,.08+j*.1,fz],wood);}fuelTop=.3;
    }else{s.lathe([[0,0],[.21,0],[.21,.43],[.195,.43],[.195,.02],[0,.02]],iron,[fx,0,fz]);s.cylinder(.22,.22,.015,[fx-.42,.0075,fz],iron,20);fuelTop=.4;}
    if(a.fuelStore!=='sack')s.cylinder(.14,.14,.018,[fx,fuelTop-.02,fz],coal,14);
    for(let i=0;i<8;i++)s.ball([.03,.025,.03],[fx+(random()-.5)*.2,fuelTop+(random()-.5)*.02,fz+(random()-.5)*.16],coal,6);
    const mess = Math.round((mood.wear * 0.6 + mood.density * 0.4) * 8);
    for (let i = 0; i < mess; i++) {
      const scrap = s.box([0.12, 0.004, 0.09], [(random() - 0.5) * 2.4, 0.003, 0.4 + random() * 0.8], s.material(random() > 0.4 ? '#ddd8c6' : '#d8c08a'));
      scrap.rotation.y = random() * 3;
    }

    // Smoke.
    const puffs: { mesh: THREE.Mesh; phase: number; x: number; z: number; size: number }[] = [];
    const smokeCount = heat === 0 ? 0 : Math.round(mix(3, 9, heat) * mix(0.6, 1.2, a.loaded));
    const drift = (random() - 0.5) * 0.6;
    for (let i = 0; i < smokeCount; i++) {
      const size = 0.1 + random() * 0.08;
      const mesh = s.ball([size, size, size], [0, top, 0], new THREE.MeshStandardMaterial({ color: a.coals === 'dying' ? '#b9b6b0' : '#d6d2ca', transparent: true, opacity: 0.3, roughness: 1, depthWrite: false }), 8);
      mesh.castShadow = false;
      puffs.push({ mesh, phase: i / smokeCount, x: (random() - 0.5) * (L - 0.2), z: (random() - 0.5) * 0.3, size });
    }
    const place = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.phase + time * mix(0.08, 0.3, mood.energy)) % 1;
        puff.mesh.position.set(puff.x + t * t * (0.5 + drift) + Math.sin(t * 9 + puff.phase * 20) * 0.04, top + 0.12 + t * 1.5, puff.z + t * drift * 0.6);
        puff.mesh.scale.setScalar(puff.size * (0.6 + t * 2.2));
        (puff.mesh.material as THREE.MeshStandardMaterial).opacity = 0.34 * (1 - t) + 0.03;
      }
    };
    place(0);
    return s.finish({
      update: (_dt, time) => {
        place(time);
        glow.emissiveIntensity = mix(0.6, 2.2, heat) * (1 + Math.sin(time * 5.3) * 0.12 * (0.4 + mood.energy));
        flames.forEach((flame, index) => flame.scale.set(1, 0.7 + Math.abs(Math.sin(time * 9 + index * 1.7)) * 0.7, 1));
      },
    });
  },
});
