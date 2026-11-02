import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { drawColumn, drawGlyph } from './glyphs';

type Point = [number, number, number];

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    crossarm: choice('How are the upper crossarms constructed?', { channel: 'Galvanized channels with downward flanges.', timber: 'Weathered rectangular timber beams with bolted plates.', angle: 'Twin steel angles with open space between them.', lattice: 'A shallow triangulated steel truss.' }),
    insulator: choice('What profile do the line insulators have?', { stacked: 'Three broad porcelain sheds.', spool: 'A deep-waisted porcelain spool.', bell: 'A single broad bell with a narrow top.', polymer: 'Six thin polymer weather sheds.' }),
    conduit: choice('How do protected service cables descend?', { none: 'No extra down-lead conduit.', single: 'One galvanized conduit with saddle clips.', twin: 'Two slim parallel conduit runs.', ribbed: 'A black corrugated conduit in steel clamps.' }),
    junction: choice('What enclosure is strapped below the cable rack?', { none: 'No enclosure.', square: 'A compact square junction box with a latched lid.', tall: 'A tall telecom cabinet with ventilation slots.', pair: 'Two narrow splice cases strapped side by side.' }),
    lashings: choice('How are the lower cable bundles secured?', { straps: 'Short flat galvanized straps.', ties: 'Black ties with short projecting tails.', coils: 'A close spiral wire lashing.', comb: 'A four-slot cable comb on a bracket.' }),
    anchor: choice('How is the pole braced at ground level?', { none: 'No guy wire.', single: 'One steel guy with a yellow protective sleeve.', twin: 'Two diverging guys with yellow sleeves.', strut: 'A rigid diagonal steel brace on an anchor shoe.' }),
    guard: choice('What protective marking wraps the lower pole?', { diagonal: 'Diagonal yellow and black hazard bands.', horizontal: 'Horizontal yellow and black rings.', reflectors: 'A black sleeve with three yellow reflective panels.', ribbed: 'A ribbed black impact sleeve with a yellow top band.' }),
    transformers: choice('How many transformers hang on the pole?', {
      none: 'None: only wires pass through.',
      one: 'One grey drum on a bracket.',
      two: 'Two, back to back.',
      three: 'Three crowded together on a platform, humming.',
    }),
    cables: score('How tangled are the cables?', ['A few tidy lines', 'The usual bundle', 'Thick with sagging loops', 'A black bird\'s nest of wire in every direction']),
    posted: choice('What is posted on the pole at eye level?', {
      cat: 'A missing-cat flyer with a drawing and tear-off phone tabs.',
      ads: 'Layers of half-torn stickers and loan adverts.',
      election: 'A sun-bleached election poster of a smiling candidate.',
      warning: 'A yellow school-route warning sign.',
      festival: 'A red and white notice for the neighbourhood festival.',
      bare: 'Nothing but tape scars and the green address plate.',
    }),
    birds: choice('What sits on the wires?', {
      none: 'Nothing.',
      crow: 'A single large crow.',
      sparrows: 'A row of small sparrows.',
      pigeons: 'A few fat pigeons.',
    }),
    mirror: noul('Does it carry an orange convex traffic mirror?'),
    lamp: choice('What kind of street lamp is on it?', {
      none: 'None.',
      tube: 'An old fluorescent tube under a tin hood.',
      led: 'A small flat white LED head.',
      sodium: 'A bulbous amber sodium lamp.',
    }),
    foot: choice('What is at its foot?', {
      nothing: 'Bare asphalt and a yellow-and-black guard wrap.',
      cone: 'A traffic cone someone left.',
      rubbish: 'Rubbish bags under a blue crow net, waiting for collection.',
      weeds: 'Weeds and a dandelion pushing through the kerb.',
      flowers: 'A bottle of flowers and a canned coffee, left in memory of someone.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const HEIGHT = mix(8.2, 9.4, random());
    const concrete = s.material('#aaa8a0', { roughness: 0.95 });
    const steel = s.material('#7f8689', { metalness: 0.6, roughness: 0.5 });
    const drum = s.material('#9ea5a6', { metalness: 0.3, roughness: 0.55 });
    const porcelain = s.material('#ece9e0', { roughness: 0.3 });
    const cable = new THREE.MeshStandardMaterial({ color: '#1d1e21', roughness: 0.7 });
    const radiusAt = (y: number) => mix(0.17, 0.105, y / HEIGHT);

    // The pole itself, rust-streaked when worn, with step bolts up two sides.
    const skin = paint(128, 512, (g, w, h) => {
      g.fillStyle = '#aaa8a0'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${random() > 0.5 ? '255,255,255' : '60,58,52'},${0.03 + random() * 0.05})`; g.fillRect(0, random() * h, w, 2 + random() * 6); }
      for (let i = 0; i < 4 + mood.wear * 14; i++) { g.fillStyle = `rgba(120,70,35,${0.1 + random() * 0.2})`; g.fillRect(random() * w, random() * h * 0.7, 2 + random() * 5, 40 + random() * 140); }
    });
    s.mesh(new THREE.CylinderGeometry(0.105, 0.17, HEIGHT, 20), new THREE.MeshStandardMaterial({ map: skin, roughness: 0.95 }), [0, HEIGHT / 2, 0]);
    s.cylinder(0.11, 0.11, 0.03, [0, HEIGHT + 0.015, 0], steel, 12);
    const bolts: Point[] = [];
    for (let y = 1.9; y < HEIGHT - 2.2; y += 0.45) bolts.push([0, y, 0]);
    const boltMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.011, 0.011, 0.2, 6), steel, bolts.length);
    bolts.forEach(([, y], index) => {
      const side = index % 2 ? 1 : -1;
      boltMesh.setMatrixAt(index, new THREE.Matrix4().compose(new THREE.Vector3(side * (radiusAt(y) + 0.08), y, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), new THREE.Vector3(1, 1, 1)));
    });
    boltMesh.castShadow = true;
    s.root.add(boltMesh);

    // A wire sags between two ends; anything may ask where it is at a given x.
    const SPAN = 3.1;
    type Wire = { y: number; z: number; sag: number; path: THREE.CatmullRomCurve3 };
    const wires: Wire[] = [];
    const run = (y: number, z: number, sag: number, thickness: number, material: THREE.Material = cable, lift = 0) => {
      const points: Point[] = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8, x = mix(-SPAN, SPAN, t);
        const half = Math.abs(t - 0.5) * 2; // 0 at the pole, 1 at the ends
        points.push([x, y - sag * Math.sin(half * Math.PI / 2) * 1.5 + lift * half, z + (half > 0 ? (random() - 0.5) * 0.02 : 0)]);
      }
      const path = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
      s.mesh(new THREE.TubeGeometry(path, 40, thickness, 5), material);
      wires.push({ y, z, sag, path });
    };
    const wirePoint = (wire: Wire, x: number): Point => {
      let lo=0, hi=1;
      for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(wire.path.getPoint(mid).x<x)lo=mid;else hi=mid;}
      const p=wire.path.getPoint((lo+hi)/2);return [p.x,p.y,p.z];
    };

    // High-voltage arms with insulators and three thin lines each.
    const sagBase = mix(0.12, 0.3, mood.wear);
    const arms = [HEIGHT - 0.35, HEIGHT - 1.05];
    const birdWires: Wire[] = [];
    arms.forEach((y, level) => {
      if(a.crossarm==='timber') {
        s.box([.13,.12,1.9],[0,y,0],s.material('#736455',{roughness:.95}));
        for(const z of [-.6,.6]) {s.box([.145,.1,.1],[0,y,z],steel);s.cylinder(.017,.017,.14,[0,y,z],steel,6);}
      } else if(a.crossarm==='channel') {
        s.box([.15,.025,1.9],[0,y+.0325,0],steel);
        for(const x of [-.0625,.0625])s.box([.025,.09,1.9],[x,y,0],steel);
      } else if(a.crossarm==='angle') {
        for(const x of [-.07,.07]){s.box([.025,.12,1.9],[x,y-.015,0],steel);s.box([.065,.025,1.9],[x*.75,y+.0325,0],steel);}
      } else {
        for(const dy of [-.16,.035])s.box([.085,.025,1.9],[0,y+dy,0],steel);
        for(let j=0;j<8;j++)s.rod([0,y+(j%2?-.16:.035),-.95+j*.2375],[0,y+(j%2?.035:-.16),-.95+(j+1)*.2375],.014,steel);
      }
      s.rod([0, y - 0.45, 0.12], [0, y, 0.7], 0.014, steel);
      s.rod([0, y - 0.45, -0.12], [0, y, -0.7], 0.014, steel);
      for (const z of [-0.82, level ? 0.3 : -0.25, 0.82]) {
        const profile: [number,number][] = a.insulator==='spool'?[[.02,0],[.065,.015],[.065,.035],[.027,.055],[.027,.12],[.065,.14],[.065,.16],[.015,.175]]:a.insulator==='bell'?[[.02,0],[.075,.025],[.068,.06],[.04,.08],[.026,.15],[.015,.175]]:a.insulator==='polymer'?Array.from({length:25},(_,k):[number,number]=>[k===24?.015:(k%4===1?.055:.022),k*.175/24]):[[.02,0],[.05,.02],[.03,.05],[.055,.08],[.03,.11],[.05,.14],[.015,.175]];
        s.lathe(profile,a.insulator==='polymer'?s.material('#786e63',{roughness:.65}):porcelain,[0,y+.045,z]);
        const before = wires.length;
        run(y + 0.22, z, sagBase * mix(0.8, 1.2, random()), 0.015);
        birdWires.push(wires[before]);
      }
    });

    // Transformers on a bracket below the arms.
    const count = { none: 0, one: 1, two: 2, three: 3 }[a.transformers];
    const shelf = HEIGHT - 2.35;
    if (count) {
      s.box([count === 3 ? 1.4 : 0.14, 0.08, 1.7], [count === 3 ? 0.35 : 0, shelf, 0], steel);
      if (count === 3) for (const z of [-0.8, 0.8]) s.rod([0, shelf - 0.7, z * 0.2], [0.9, shelf, z], 0.02, steel);
      const spots: Point[] = count === 1 ? [[0, shelf, 0.52]] : count === 2 ? [[0, shelf, 0.52], [0, shelf, -0.52]] : [[0, shelf, 0.56], [0, shelf, -0.56], [0.72, shelf, 0]];
      for (const [x, y, z] of spots) {
        const r = mix(0.24, 0.3, random()), h = mix(0.7, 0.9, random());
        s.cylinder(r, r, h, [x, y + 0.04 + h / 2, z], drum, 20);
        s.cylinder(r * 1.04, r * 1.04, 0.05, [x, y + 0.04 + h, z], steel, 20);
        s.ball([r * 0.98, 0.08, r * 0.98], [x, y + 0.07 + h, z], drum, 16);
        for (let fin = 0; fin < 7; fin++) { const angle = -0.9 + fin * 0.3 + (z < 0 ? Math.PI : x > 0.3 ? Math.PI / 2 : 0); s.box([0.012, h * 0.7, 0.1], [x + Math.sin(angle) * (r + 0.04), y + 0.04 + h / 2, z + Math.cos(angle) * (r + 0.04)], steel).rotation.y = angle + Math.PI / 2; }
        for (const side of [-1, 1]) {
          s.lathe([[0.018, 0], [0.04, 0.03], [0.022, 0.06], [0.04, 0.09], [0.012, 0.14]], porcelain, [x + side * r * 0.45, y + h + 0.12, z]);
          s.tube([[x + side * r * 0.45, y + h + 0.26, z], [x + side * 0.1, y + h + 0.6, z * 0.9], [0, arms[1] + 0.2, z > 0 ? 0.82 : z < 0 ? -0.82 : 0.3]], 0.008, cable);
        }
        s.label(String(10 + Math.floor(random() * 4) * 10), 0.18, 0.1, [x + (x > 0.3 ? r + 0.004 : 0), y + 0.04 + h * 0.6, z + (x > 0.3 ? 0 : Math.sign(z) * (r + 0.004))], '#30343a', '#ece9e0').rotation.y = x > 0.3 ? Math.PI / 2 : z < 0 ? Math.PI : 0;
      }
    }

    // Low-voltage rack and telecom bundles; the mess grows with the answer and with density.
    const mess = Math.min(1, a.cables * 0.85 + mood.density * 0.15);
    const low = shelf - 0.75;
    for (let i = 0; i < 3; i++) { s.cylinder(0.035, 0.035, 0.05, [0, low - i * 0.2, radiusAt(low) + 0.07], porcelain, 10).rotation.x = Math.PI / 2; run(low - i * 0.2, radiusAt(low) + 0.07, sagBase * 1.4, 0.014); }
    const bundles = 1 + Math.round(mess * 5);
    for (let i = 0; i < bundles; i++) {
      const y = low - 0.95 - i * mix(0.28, 0.2, mess) + (random() - 0.5) * 0.1, z = (i % 2 ? -1 : 1) * (radiusAt(y) + 0.05 + random() * 0.08);
      s.ring(radiusAt(y) + 0.01, 0.012, [0, y, 0], steel).rotation.x = Math.PI / 2;
      run(y, z, sagBase * mix(1.5, 3.4, mess) * mix(0.7, 1.3, random()), mix(0.016, 0.034, random()), cable, (random() - 0.5) * mess * 1.2);
      // The fastening follows the actual curved conductor.
      const current=wires[wires.length-1];
      for(const x of [-.32,.32]) {
        const p=wirePoint(current,x);
        if(a.lashings==='straps')s.box([.055,.065,.016],p,steel);
        else if(a.lashings==='ties'){const r=s.ring(.037,.006,p,cable);r.rotation.y=Math.PI/2;s.rod([p[0],p[1]-.02,p[2]],[p[0],p[1]-.11,p[2]+.02],.004,cable);}
        else if(a.lashings==='coils')for(let j=-3;j<=3;j++){const q=wirePoint(current,x+j*.017);s.ring(.037,.004,q,steel).rotation.y=Math.PI/2;}
        else {s.box([.05,.02,.16],[p[0],p[1]-.04,p[2]],steel);for(let j=0;j<4;j++)s.box([.05,.07,.012],[p[0],p[1]-.01,p[2]-.07+j*.047],steel);}
      }
      // Splice closures and coiled slack hang off the fat ones.
      if (random() < 0.3 + mess * 0.5) {
        const side = random() > 0.5 ? 1 : -1, x = side * mix(0.5, 1.5, random()), wire = wires[wires.length - 1];
        const wp=wirePoint(wire,x);
        for(const dx of [-.17,.17]){const q=wirePoint(wire,x+dx);s.rod(q,[x+dx,wp[1]-.09,wp[2]],.012,steel);}
        s.cylinder(0.07, 0.07, 0.5, [x, wp[1] - 0.09, wp[2]], s.material('#26272b', { roughness: 0.5 }), 12).rotation.z = Math.PI / 2;
      }
      if (random() < mess * 0.7) {
        const side = random() > 0.5 ? 1 : -1, x = side * mix(0.4, 1.2, random()), wire = wires[wires.length - 1];
        const wp=wirePoint(wire,x),lr=mix(.16,.28,random());
        const loop = s.ring(lr, 0.014, [x, wp[1] - lr*1.3, wp[2]], cable);
        loop.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.5; loop.scale.y = 1.3;
      }
    }
    // Service drops leave diagonally toward houses that are not there.
    const drops = Math.round(mess * 9);
    for (let i = 0; i < drops; i++) {
      const from = low - 0.6 - random() * 1.6, side = i % 2 ? 1 : -1, reach = mix(1.8, 3, random()), lean = (random() - 0.5) * 4;
      const end: Point = [lean, from - mix(0.4, 1.8, random()), side * reach];
      const middle: Point = [lean * 0.5, (from + end[1]) / 2 - mix(0.2, 0.7, mess), side * reach * 0.5];
      s.tube([[0, from, side * radiusAt(from)], middle, end], mix(0.009, 0.016, random()), cable);
    }
    if (mess > 0.75) for (let i = 0; i < 3; i++) s.tube([[0.1, low - 1.2 - i * 0.3, 0.15], [0.3, low - 2 - random(), 0.25], [0.12, low - 2.7 - random() * 0.6, 0.18]], 0.012, cable);

    // Birds.
    const bobbers: THREE.Group[] = [];
    const bird = (size: number, bodyTone: string, at: Point) => {
      const b = new Sculpture(context);
      const feather = s.material(bodyTone, { roughness: 0.8 });
      b.ball([size * 0.5, size * 0.45, size * 0.9], [0, size * 0.5, 0], feather, 10);
      b.ball([size * 0.33, size * 0.33, size * 0.36], [0, size * 0.92, size * 0.55], feather, 10);
      b.cylinder(0.001, size * 0.1, size * 0.34, [0, size * 0.9, size * 0.98], s.material(bodyTone === '#1c1c20' ? '#2a2a2e' : '#d8a23a'), 6).rotation.x = Math.PI / 2;
      b.box([size * 0.4, size * 0.06, size * 0.8], [0, size * 0.42, -size * 1.05], feather).rotation.x = 0.3;
      const feet=s.material('#4a4033',{roughness:.8});
      for(const dx of [-1,1]){
        b.rod([dx*size*.2,0,0],[dx*size*.2,size*.23,0],size*.035,feet);
        for(const dz of [-1,1])b.rod([dx*size*.2,0,0],[dx*size*.2+size*.08,-size*.025,dz*size*.18],size*.025,feet);
      }
      b.root.position.set(...at);
      b.root.rotation.y = (random() > 0.5 ? 0 : Math.PI) + (random() - 0.5) * 0.6;
      s.root.add(b.root);
      bobbers.push(b.root);
    };
    const perch = () => birdWires[Math.floor(random() * birdWires.length)];
    if (a.birds === 'crow') { const wire = perch(), x = (random() > 0.5 ? 1 : -1) * mix(0.8, 2.4, random()); bird(0.3, '#1c1c20', wirePoint(wire, x)); }
    if (a.birds === 'sparrows') { const wire = perch(), start = mix(-2.6, 0.3, random()), n = 5 + Math.floor(random() * 6); for (let i = 0; i < n; i++) { const x = start + i * mix(0.2, 0.36, random()); if (Math.abs(x) > 0.25) bird(0.1, random() > 0.5 ? '#8a6a48' : '#a8845a', wirePoint(wire, x)); } }
    if (a.birds === 'pigeons') for (let i = 0; i < 3 + Math.floor(random() * 3); i++) { const wire = perch(), x = (random() - 0.5) * 5; if (Math.abs(x) > 0.3) bird(0.19, ['#8d939c', '#b9bcc2', '#6f7480'][Math.floor(random() * 3)], wirePoint(wire, x)); }

    // Street lamp, brighter the further the hour is from noon.
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    if (a.lamp !== 'none') {
      const y = 5.1;
      s.tube([[0, y - 0.5, radiusAt(y)], [0, y, 0.5], [0, y + 0.12, 1.15]], 0.025, steel);
      const hue = a.lamp === 'sodium' ? '#ffb040' : a.lamp === 'tube' ? '#e9ffe6' : '#f2f8ff';
      const glow = new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: mix(0.25, 2.2, dusk) });
      if (a.lamp === 'tube') { s.box([0.2, 0.04, 0.75], [0, y + 0.1, 1.3], s.material('#d8dcd8', { metalness: 0.4 })); s.cylinder(0.025, 0.025, 0.66, [0, y + 0.055, 1.3], glow, 8).rotation.x = Math.PI / 2; }
      if (a.lamp === 'led') { s.box([0.24, 0.05, 0.42], [0, y + 0.1, 1.3], s.material('#e6e8e8', { metalness: 0.4 })); s.box([0.18, 0.012, 0.32], [0, y + 0.07, 1.3], glow); }
      if (a.lamp === 'sodium') { s.ball([0.16, 0.08, 0.3], [0, y + 0.12, 1.32], s.material('#8a8f92', { metalness: 0.5 }), 14); s.ball([0.12, 0.09, 0.22], [0, y + 0.07, 1.34], glow, 12); }
    }

    // Convex mirror on its own arm.
    if (a.mirror) {
      const y = 2.9, tilt = -0.22, turn = (random() - 0.5) * 0.8;
      const orange = s.material('#ee7a1c', { roughness: 0.5 });
      s.rod([0, y, 0], [-0.55, y + 0.1, 0.3], 0.022, orange);
      const m = new Sculpture(context);
      m.cylinder(0.4, 0.4, 0.05, [0, 0, 0], orange, 28).rotation.x = Math.PI / 2;
      m.ball([0.36, 0.36, 0.07], [0, 0, 0.02], new THREE.MeshStandardMaterial({ color: '#c9dde8', metalness: 0.6, roughness: 0.12, emissive: '#6f8fa8', emissiveIntensity: 0.35 }), 24);
      m.ball([0.1, 0.05, 0.015], [-0.1, 0.14, 0.085], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.5 }), 10);
      m.box([0.84, 0.03, 0.2], [0, 0.41, 0.08], orange);
      m.root.position.set(-0.6, y + 0.1, 0.36); m.root.rotation.set(tilt, turn, 0);
      s.root.add(m.root);
    }

    // Down-leads and enclosures sit on saddles that meet the tapered pole.
    if(a.conduit!=='none')for(let i=0;i<(a.conduit==='twin'?2:1);i++) {
      const x=a.conduit==='twin'?(i-.5)*.08:.06;
      const start:Point=[x,.12,-radiusAt(.12)-.035],end:Point=[x,low-.4,-radiusAt(low-.4)-.035];
      s.rod(start,end,a.conduit==='ribbed'?.035:.025,a.conduit==='ribbed'?cable:steel);
      for(let y=.3;y<low-.4;y+=a.conduit==='ribbed'?.06:.85){const z=-radiusAt(y)-.035;if(a.conduit==='ribbed')s.ring(.037,.005,[x,y,z],cable).rotation.x=Math.PI/2;else s.box([.1,.035,.08],[x,y,z+.02],steel);}
    }
    if(a.junction!=='none') {
      const n=a.junction==='pair'?2:1,h=a.junction==='tall'?.78:.44,w=a.junction==='pair'?.19:.38,y=3.35;
      for(const dy of [-h*.35,h*.35])s.ring(radiusAt(y+dy)+.015,.012,[0,y+dy,0],steel).rotation.x=Math.PI/2;
      for(let i=0;i<n;i++){
        const x=(i-(n-1)/2)*.22,z=-radiusAt(y)-.11;
        s.box([w,h,.22],[x,y,z],drum);s.box([w*.91,h*.93,.018],[x,y,z-.119],steel);
        s.box([.03,.09,.035],[x+w*.3,y,z-.14],cable);
        if(a.junction==='tall')for(let j=0;j<6;j++)s.box([w*.65,.016,.014],[x,y-.15+j*.045,z-.135],cable);
        s.tube([[x,y+h/2,z],[x,y+h/2+.17,z],[0,low-.65,-radiusAt(low-.65)]],.014,cable);
      }
    }

    // Paper wrapped around the pole at eye level.
    const wrap = (map: THREE.Texture, y: number, height: number, arc: number, facing = 0, emissive = 0) => {
      const r = radiusAt(y) + 0.004;
      const sheet = s.mesh(new THREE.CylinderGeometry(r - 0.003, r, height, 12, 1, true, facing - arc / 2, arc), new THREE.MeshStandardMaterial({ map, roughness: 0.9, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: emissive }), [0, y, 0]);
      sheet.castShadow = false;
      return sheet;
    };
    const fadeTo = (hex: string) => `#${new THREE.Color(hex).lerp(new THREE.Color('#d9d4c4'), mood.wear * 0.5).getHexString()}`;
    // The address plate is always there.
    wrap(paint(48, 160, (g, w, h) => { g.fillStyle = fadeTo('#2f7a52'); g.fillRect(0, 0, w, h); g.strokeStyle = '#f2f2ea'; g.lineWidth = 2; g.strokeRect(3, 3, w - 6, h - 6); drawColumn(g, random() > 0.5 ? '山本' : '中山', w / 2, 14, 30, '#f2f2ea', 0.12); g.fillStyle = '#f2f2ea'; g.font = 'bold 26px monospace'; g.textAlign = 'center'; g.fillText(String(1 + Math.floor(random() * 8)), w / 2, 112); g.fillText('-' + (1 + Math.floor(random() * 20)), w / 2, 142); }), 2.25, 0.5, 0.75, 0.9);
    if (a.posted === 'cat') {
      wrap(paint(160, 224, (g, w, h) => {
        g.fillStyle = fadeTo('#fbfaf2'); g.fillRect(0, 0, w, h);
        g.fillStyle = '#c8261e'; g.fillRect(8, 8, w - 16, 30); g.fillStyle = '#fff'; g.font = 'bold 22px monospace'; g.textAlign = 'center'; g.fillText('MISSING', w / 2, 31);
        g.fillStyle = random() > 0.5 ? '#e88a2c' : '#3a3836';
        g.beginPath(); g.arc(w / 2, 104, 40, 0, Math.PI * 2); g.fill();
        for (const side of [-1, 1]) { g.beginPath(); g.moveTo(w / 2 + side * 38, 92); g.lineTo(w / 2 + side * 36, 48); g.lineTo(w / 2 + side * 10, 70); g.fill(); }
        g.fillStyle = '#f2e23a'; for (const side of [-1, 1]) { g.beginPath(); g.ellipse(w / 2 + side * 16, 100, 8, 6, 0, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#111'; for (const side of [-1, 1]) g.fillRect(w / 2 + side * 16 - 1.5, 94, 3, 12);
        g.fillStyle = '#f2a0a8'; g.beginPath(); g.moveTo(w / 2 - 5, 114); g.lineTo(w / 2 + 5, 114); g.lineTo(w / 2, 121); g.fill();
        g.fillStyle = '#333'; for (let i = 0; i < 3; i++) g.fillRect(16, 156 + i * 9, w - 32 - random() * 40, 3);
        const torn = Math.floor(random() * 4 + mood.wear * 3);
        for (let i = 0; i < 8; i++) { g.fillStyle = '#bbb'; g.fillRect(i * 20, 186, 1.5, 38); if (i < torn || random() < 0.2) { g.fillStyle = '#aaa8a0'; g.fillRect(i * 20 + 2, 188 + random() * 8, 17, 40); } else { g.fillStyle = '#333'; g.fillRect(i * 20 + 9, 192, 2.5, 26); } }
      }), 1.55, 0.6, 1.6, 0);
    } else if (a.posted === 'ads') {
      wrap(paint(256, 256, (g, w, h) => {
        g.fillStyle = '#aaa8a0'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 16 + mood.density * 14; i++) {
          g.save(); g.translate(random() * w, random() * h); g.rotate((random() - 0.5) * 0.5);
          const sw = 30 + random() * 60, sh = 20 + random() * 70;
          g.fillStyle = fadeTo(['#f2e23a', '#e8483c', '#fbfaf2', '#2f6fd0', '#ff8fb8', '#2fae62', '#1d1d22'][Math.floor(random() * 7)]); g.fillRect(-sw / 2, -sh / 2, sw, sh);
          g.fillStyle = random() > 0.5 ? '#111' : '#fff'; for (let k = 0; k < 3; k++) g.fillRect(-sw / 2 + 4, -sh / 2 + 5 + k * 9, sw * (0.4 + random() * 0.5), 4);
          if (random() < mood.wear) { g.fillStyle = '#aaa8a0'; g.beginPath(); g.moveTo(sw / 2, -sh / 2); g.lineTo(sw / 2 - sw * random(), -sh / 2); g.lineTo(sw / 2, sh * (random() - 0.3)); g.fill(); }
          g.restore();
        }
      }), 1.6, 1.1, Math.PI * 1.6, 0);
    } else if (a.posted === 'election') {
      wrap(paint(160, 224, (g, w, h) => {
        g.fillStyle = fadeTo('#2a66c8'); g.fillRect(0, 0, w, h);
        g.fillStyle = fadeTo('#f0c8a0'); g.beginPath(); g.ellipse(w / 2, 84, 32, 40, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = fadeTo('#26262a'); g.beginPath(); g.ellipse(w / 2, 56, 34, 22, 0, Math.PI, Math.PI * 2); g.fill();
        g.beginPath(); g.moveTo(20, h - 44); g.quadraticCurveTo(w / 2, 104, w - 20, h - 44); g.lineTo(w - 20, h - 44); g.fill(); g.fillRect(20, h - 46, w - 40, 10);
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(w / 2 - 12, 124); g.lineTo(w / 2 + 12, 124); g.lineTo(w / 2, 150); g.fill();
        g.strokeStyle = '#7a3a2a'; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, 92, 14, 0.2, Math.PI - 0.2); g.stroke();
        g.fillStyle = fadeTo('#e8483c'); g.fillRect(0, h - 40, w, 40); drawGlyph(g, '山', 30, h - 38, 34, '#fff', 0.14); drawGlyph(g, '本', 70, h - 38, 34, '#fff', 0.14); drawGlyph(g, '大', 110, h - 38, 34, '#fff', 0.14);
      }), 1.7, 0.72, 1.7, 0);
    } else if (a.posted === 'warning') {
      wrap(paint(128, 256, (g, w, h) => {
        g.fillStyle = fadeTo('#f2d21e'); g.fillRect(0, 0, w, h);
        g.fillStyle = fadeTo('#2f8a4a'); g.fillRect(0, 0, w, 18); g.fillRect(0, h - 18, w, 18);
        g.fillStyle = '#1d1d22';
        for (const [cx, size] of [[44, 1], [86, 0.75]] as const) { g.beginPath(); g.arc(cx, 70 + (1 - size) * 30, 13 * size, 0, Math.PI * 2); g.fill(); g.fillRect(cx - 11 * size, 86 + (1 - size) * 26, 22 * size, 44 * size); g.fillRect(cx - 11 * size, 128, 8 * size, 34 * size); g.fillRect(cx + 3 * size, 128, 8 * size, 34 * size); }
        g.fillStyle = '#c8261e'; g.font = 'bold 56px monospace'; g.textAlign = 'center'; g.fillText('!', w / 2, 222);
      }), 1.75, 0.85, 1.5, 0.15);
    } else if (a.posted === 'festival') {
      wrap(paint(160, 240, (g, w, h) => {
        g.fillStyle = fadeTo('#fbf6e6'); g.fillRect(0, 0, w, h);
        g.fillStyle = fadeTo('#c8261e'); for (let i = 0; i < 5; i++) g.fillRect(i * 36, 0, 18, 22); g.fillRect(0, h - 14, w, 14);
        drawGlyph(g, '大', 36, 34, 88, fadeTo('#c8261e'), 0.15);
        g.beginPath(); g.ellipse(w / 2, 168, 26, 32, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#1d1d22'; g.fillRect(w / 2 - 16, 132, 32, 7); g.fillRect(w / 2 - 16, 197, 32, 7);
        drawGlyph(g, '天', w / 2 - 15, 153, 30, '#fbf6e6', 0.14);
      }), 1.65, 0.8, 1.7, 0);
    } else {
      wrap(paint(128, 128, (g, w, h) => { g.fillStyle = '#aaa8a0'; g.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) { g.save(); g.translate(random() * w, random() * h); g.rotate(random() * 3); g.fillStyle = `rgba(225,215,180,${0.3 + random() * 0.4})`; g.fillRect(-14, -3, 28, 6); g.restore(); } for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(240,238,228,0.6)'; g.fillRect(random() * w, random() * h, 8 + random() * 16, 5 + random() * 12); } }), 1.6, 0.7, Math.PI * 1.5, 0);
    }

    // Yellow and black guard wrap, then whatever is at the foot.
    wrap(paint(128,128,(g,w,h)=>{
      g.fillStyle=a.guard==='reflectors'||a.guard==='ribbed'?'#242526':fadeTo('#f2c81e');g.fillRect(0,0,w,h);g.fillStyle='#1d1d22';
      if(a.guard==='diagonal')for(let i=-4;i<8;i++){g.beginPath();g.moveTo(i*32,h);g.lineTo(i*32+16,h);g.lineTo(i*32+16+h,0);g.lineTo(i*32+h,0);g.fill();}
      if(a.guard==='horizontal')for(let y=0;y<h;y+=32)g.fillRect(0,y,w,16);
      if(a.guard==='reflectors'){g.fillStyle='#f4df53';for(let i=0;i<3;i++)g.fillRect(i*w/3+6,15,w/3-12,h-30);}
      if(a.guard==='ribbed'){g.fillStyle='#f2c81e';g.fillRect(0,0,w,15);}
    }),.62,1,Math.PI*2);
    if(a.guard==='ribbed')for(let y=.17;y<1.06;y+=.085)s.ring(radiusAt(y)+.009,.012,[0,y,0],cable).rotation.x=Math.PI/2;
    if (a.foot === 'cone') {
      const cx = 0.5 + random() * 0.3, cz = 0.35 + random() * 0.3, lean = random() > 0.7;
      const c = new Sculpture(context);
      c.box([0.36, 0.03, 0.36], [0, 0.015, 0], s.material('#1d1d22'));
      c.cylinder(0.025, 0.14, 0.62, [0, 0.34, 0], s.material('#e8541e', { roughness: 0.5 }), 16);
      c.cylinder(0.071, 0.095, 0.11, [0, 0.36, 0], s.material('#f4f4f0'), 16);
      c.root.position.set(cx, lean ? 0.16 : 0, cz); if (lean) c.root.rotation.set(0, random() * 3, Math.PI / 2 - 0.22);
      c.root.updateMatrixWorld(true);c.root.position.y-=new THREE.Box3().setFromObject(c.root,true).min.y;
      s.root.add(c.root);
    } else if (a.foot === 'rubbish') {
      const bags = 4 + Math.floor(random() * 3 + mood.density * 4);
      for (let i = 0; i < bags; i++) {
        const r = mix(0.2, 0.3, random()), bx = 0.45 + random() * 0.8, bz = (random() - 0.3) * 0.9;
        s.ball([r, r * 0.8, r], [bx, r * 0.72 + (i > 3 ? 0.25 : 0), bz], s.material(random() > 0.25 ? '#e9ecec' : '#cfe0ea', { roughness: 0.35 }), 12);
        s.cylinder(0.02, 0.05, 0.1, [bx, r * 1.5 + (i > 3 ? 0.25 : 0), bz], s.material('#dfe3e3'), 6);
      }
      const net = paint(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#2a6fd0'; g.lineWidth = 3; for (let i = 0; i <= 12; i++) { g.beginPath(); g.moveTo(i * w / 12, 0); g.lineTo(i * w / 12, h); g.moveTo(0, i * h / 12); g.lineTo(w, i * h / 12); g.stroke(); } });
      const cover = s.mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: net, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }), [0.85, 0, 0.15]);
      cover.scale.set(0.85, 0.72, 0.8); cover.castShadow = false;
    } else if (a.foot === 'weeds') {
      for (let i = 0; i < 18 + mood.wear * 16; i++) { const angle = random() * Math.PI * 2, reach = 0.2 + random() * 0.35, h = mix(0.1, 0.42, random()); const blade = s.cylinder(0.002, 0.014, h, [Math.sin(angle) * reach, h / 2, Math.cos(angle) * reach], s.material(['#5c8a3c', '#7a9a48', '#49703a'][Math.floor(random() * 3)]), 5); blade.rotation.set((random() - 0.5) * 0.7, 0, (random() - 0.5) * 0.7); }
      for (let i = 0; i < 2 + Math.floor(random() * 3); i++) { const angle = random() * Math.PI * 2, reach = 0.3 + random() * 0.2, h = 0.14 + random() * 0.1; s.rod([Math.sin(angle) * reach, 0, Math.cos(angle) * reach], [Math.sin(angle) * reach, h, Math.cos(angle) * reach], 0.004, s.material('#7a9a48')); s.ball([0.03, 0.015, 0.03], [Math.sin(angle) * reach, h, Math.cos(angle) * reach], s.material('#f2d21e', { emissive: '#8a7a08', emissiveIntensity: 0.3 }), 8); }
    } else if (a.foot === 'flowers') {
      const fx = 0.06, fz = 0.3;
      s.lathe([[0,0],[.04,0],[.04,.12],[.022,.17],[.022,.2],[.017,.2],[.017,.17],[.034,.118],[.034,.008],[0,.008]],new THREE.MeshStandardMaterial({color:'#cfe6e0',transparent:true,opacity:.45,depthWrite:false,side:THREE.DoubleSide}),[fx,0,fz]);
      s.cylinder(0.034, 0.039, 0.09, [fx, 0.05, fz], s.material('#9fc8c8', { roughness: 0.1 }), 12);
      for (let i = 0; i < 5; i++) { const lean = (random() - 0.5) * 0.14, lz = (random() - 0.5) * 0.1, top = 0.36 + random() * 0.14; s.rod([fx, 0.04, fz], [fx + lean, top, fz + lz], 0.004, s.material('#4d7a3c')); s.ball([0.035, 0.03, 0.035], [fx + lean, top, fz + lz], s.material(['#f4f1e6', '#f2c62e', '#e889a8', '#f4f1e6'][i % 4], { roughness: 0.7 }), 8); }
      s.cylinder(0.026, 0.026, 0.105, [fx + 0.14, 0.0525, fz + 0.02], s.material('#6a4020', { metalness: 0.5, roughness: 0.35 }), 12);
      s.cylinder(0.024, 0.024, 0.004, [fx + 0.14, 0.107, fz + 0.02], s.material('#d0d4d6', { metalness: 0.8 }), 12);
      s.cylinder(0.03, 0.02, 0.012, [fx - 0.13, 0.006, fz + 0.04], s.material('#f4f1e6'), 10);
    }

    // Protective sleeves are collinear with the actual anchor and top attachment.
    if(a.anchor!=='none')for(const side of a.anchor==='twin'?[-1,1]:[1]) {
      const top=new THREE.Vector3(0,HEIGHT-2.9,0),bottom=new THREE.Vector3(side*.7,.035,-2.2);
      const material=a.anchor==='strut'?steel:cable;
      s.rod(top.toArray() as Point,bottom.toArray() as Point,a.anchor==='strut'?.055:.012,material);
      if(a.anchor!=='strut'){const sleeve=bottom.clone().lerp(top,1.9/(top.y-bottom.y));s.rod(bottom.toArray() as Point,sleeve.toArray() as Point,.035,s.material('#f2c81e',{roughness:.5}));}
      s.box([.24,.05,.3],[bottom.x,.025,bottom.z],steel);
      for(const dx of [-.07,.07])s.cylinder(.018,.018,.025,[bottom.x+dx,.06,bottom.z],steel,6);
    }

    const speed = mix(0.4, 3, mood.energy);
    return s.finish({
      footprint: 1.3,
      update: (_dt, time) => bobbers.forEach((group, index) => { group.rotation.x = Math.max(0, Math.sin(time * speed + index * 2.1) - 0.75) * 1.4; }),
    });
  },
});
