import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, figure, mix, score } from '@conjure/kit';


// The posed people remain rigid within this component. Merge by material after
// solving their contacts, retaining the kit's geometry while reducing draw calls.
function compactFigure(root:THREE.Group){
 root.updateMatrixWorld(true);const before=new THREE.Box3().setFromObject(root,true),inverse=root.matrixWorld.clone().invert();
 const groups=new Map<THREE.Material,THREE.BufferGeometry[]>(),originals=new Set<THREE.BufferGeometry>();
 root.traverse(node=>{const mesh=node as THREE.Mesh;if(!mesh.isMesh)return;if(Array.isArray(mesh.material))throw new Error('Unexpected figure material array');
  const clone=mesh.geometry.clone();let g=clone.index?clone.toNonIndexed():clone;if(g!==clone)clone.dispose();
  for(const name of Object.keys(g.attributes))if(name!=='position'&&name!=='normal')g.deleteAttribute(name);
  g.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));const list=groups.get(mesh.material)??[];list.push(g);groups.set(mesh.material,list);originals.add(mesh.geometry);
 });
 root.clear();for(const[material,parts]of groups){const geometry=mergeGeometries(parts);if(!geometry)throw new Error('Figure mesh merge failed');const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);for(const part of parts)part.dispose();}
 for(const geometry of originals)geometry.dispose();root.updateMatrixWorld(true);const after=new THREE.Box3().setFromObject(root,true);
 if(before.min.distanceTo(after.min)>1e-5||before.max.distanceTo(after.max)>1e-5)throw new Error('Figure merge moved its support bounds');
}

const SLOGANS = {
  lazy: 'NO FOOD FOR LAZY MAN: blunt, hard-working, a little funny.',
  time: "GOD'S TIME IS THE BEST: patient faith.",
  permanent: 'NO CONDITION IS PERMANENT: endurance, hope that things turn.',
  say: 'LET THEM SAY: defiant, shrugging off gossip.',
  eye: 'SHINE YOUR EYE: streetwise, a warning to stay sharp.',
  better: 'E GO BETTER: weary optimism.',
  mama: 'REMEMBER YOUR MOTHER: tender, homesick.',
  horn: 'HORN BEFORE OVERTAKE: pure traffic comedy.',
} as const;
const SLOGAN_TEXT: Record<keyof typeof SLOGANS, string> = {
  lazy: 'NO FOOD FOR LAZY MAN', time: "GOD'S TIME IS THE BEST", permanent: 'NO CONDITION IS PERMANENT', say: 'LET THEM SAY',
  eye: 'SHINE YOUR EYE', better: 'E GO BETTER', mama: 'REMEMBER YOUR MOTHER', horn: 'HORN BEFORE OVERTAKE',
};
const ROUTES = { oshodi: 'OSHODI', cms: 'CMS', yaba: 'YABA', mile2: 'MILE 2', ikeja: 'IKEJA', ojuelegba: 'OJUELEGBA' } as const;

/** Hand-painted lettering on a canvas: uneven baselines, wrapped to fit. */
function lettering(text: string, w: number, h: number, ink: string, paper: string, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(48, Math.round((512 * h) / w));
  const c = canvas.getContext('2d')!;
  c.fillStyle = paper;
  c.fillRect(0, 0, canvas.width, canvas.height);
  const words = text.split(' ');
  const rows = canvas.height / canvas.width > 0.3 && words.length > 2 ? 2 : 1;
  const lines: string[] = [];
  if (rows === 1) lines.push(text);
  else {
    let best = 1, gap = Infinity;
    for (let i = 1; i < words.length; i++) {
      const d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
      if (d < gap) { gap = d; best = i; }
    }
    lines.push(words.slice(0, best).join(' '), words.slice(best).join(' '));
  }
  const longest = Math.max(...lines.map((line) => line.length));
  const size = Math.min((canvas.height / lines.length) * 0.74, (canvas.width / longest) * 1.55);
  c.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  lines.forEach((line, index) => {
    c.save();
    c.translate(256, (canvas.height * (index + 0.5)) / lines.length);
    c.rotate((random() - 0.5) * 0.05);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillText(line, 3, 4, 480);
    c.fillStyle = ink;
    c.fillText(line, 0, 0, 480);
    c.restore();
  });
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.85, side: THREE.DoubleSide });
}

export default defineThing({
  questions: {
    frontGuard: choice('What protects the front bumper?', {
      plain: 'The ordinary black bumper.', rail: 'One broad tubular guard rail.',
      cage: 'A grille guard with several vertical bars.', twin: 'Two short guards around the lamps.',
    }),
    stepType: choice('What projects below the open passenger door?', {
      plain: 'A simple metal boarding step.', wide: 'A broad timber-covered step.',
      double: 'A lower second step beneath the main one.', folding: 'A ribbed folding step held by diagonal stays.',
    }),
    wheelTrim: choice('What covers the wheel hubs?', {
      bare: 'Plain dull metal hubs.', caps: 'Small polished hubcaps.',
      painted: 'Yellow-painted centres with dark bolts.', rings: 'Bright trim rings around the hubs.',
    }),
    windowTrim: choice('What has been fitted around the side windows?', {
      bare: 'The ordinary frames.', sliders: 'Slim sliding-glass divider frames.',
      visors: 'Short rain visors above the windows.', bars: 'Two thin protective bars across each rear window.',
    }),
    rackStyle: choice('What kind of roof-rack enclosure carries the load?', {
      low: 'The original low perimeter rails.', high: 'A higher rectangular cage.',
      mesh: 'Low rails with close wire mesh sides.', hoops: 'Three rounded hoops spanning the rack.',
    }),
    rearAccess: choice('How is the roof rack reached?', {
      none: 'No fixed climbing aid.', ladder: 'A narrow ladder fixed to the rear corner.',
      rungs: 'Separate grab handles and foot rungs.', rope: 'A short rope ladder tied to the rear rack.',
    }),
    cabinExtra: choice('What extra fitting is visible inside?', {
      none: 'Only the benches and driver’s wheel.', curtain: 'A short curtain behind the front seats.',
      rail: 'An overhead passenger handrail.', fan: 'A small fixed dashboard fan.',
    }),
    slogan: choice('What slogan is painted across the windscreen banner and the back?', SLOGANS),
    route: choice('Which destination is lettered on the side?', {
      oshodi: 'OSHODI, the great chaotic interchange.',
      cms: 'CMS, down to the island and the offices.',
      yaba: 'YABA, students and markets.',
      mile2: 'MILE 2, the long haul west.',
      ikeja: 'IKEJA, the mainland capital.',
      ojuelegba: 'OJUELEGBA, the crossroads of the song.',
    }),
    roof: score('How overloaded is the roof?', ['Bare roof rack', 'A couple of sacks', 'A roped pile of sacks and crates', 'A teetering tower with a mattress on top']),
    conductor: choice('Where is the conductor?', {
      hanging: 'Hanging out of the open door by one arm, the other flung wide, calling the route.',
      calling: 'Standing on the road beside the door, arm raised with folded notes between his fingers.',
      sitting: 'Sitting in the doorway with his feet on the step, counting the takings.',
      absent: 'Nowhere: the doorway is empty.',
    }),
    passengers: score('How full is it inside?', ['Empty benches', 'A few early riders', 'Every seat taken', 'Packed four to a bench, shoulders out of the windows']),
    tyre: choice('What is the state of its tyres?', {
      sound: 'All four holding air.',
      front: 'The front kerb-side tyre is flat and the nose sags onto it.',
      rear: 'The rear kerb-side tyre is flat and the tail sags.',
      jacked: 'Up on a jack with a wheel off and lying in the road.',
    }),
    doing: choice('What is it doing right now?', {
      loading: 'Standing at the stop taking on passengers.',
      leaving: 'Pulling away in a belch of exhaust and dust.',
      broken: 'Broken down: engine hatch up at the back, steam rising, a leafy branch laid in the road as a warning.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const yellow = s.material(mood.cheer > 0.5 ? '#f6c416' : '#e2b01c', { roughness: 0.55 });
    const black = s.material('#1b1b1d', { roughness: 0.6 });
    const rubber = s.material('#202124', { roughness: 0.9 });
    const steel = s.material('#9aa0a2', { metalness: 0.6, roughness: 0.4 });
    const seat = s.material('#6a4a3a');
    const rust = s.material('#7a4a2c', { roughness: 0.95 });
    const glass = new THREE.MeshStandardMaterial({ color: '#27384a', transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false });
    const skin = ['#5a3a28', '#6b4630', '#4a2f20', '#7a5238'];
    const cloth = ['#c8402e', '#2f6fb0', '#e8e2d0', '#2c8a56', '#e0a020', '#7a3a8a', '#d86a9a', '#30383f'];
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    // Side panels: one outline, pierced by windows; the kerb side also has the door opening.
    const side = (door: boolean) => {
      const shape = new THREE.Shape();
      ([[-2.2, 0.42], [2.02, 0.42], [2.2, 0.62], [2.2, 1.05], [1.78, 1.93], [-2.2, 1.93]] as const).forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
      const hole = (points: readonly (readonly [number, number])[]) => {
        const path = new THREE.Path();
        points.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
        shape.holes.push(path);
      };
      const win = (x0: number, x1: number) => hole([[x0, 1.17], [x1, 1.17], [x1, 1.76], [x0, 1.76]]);
      hole([[1.08, 1.17], [1.98, 1.17], [1.72, 1.76], [1.08, 1.76]]);
      if (door) hole([[-0.08, 0.5], [0.98, 0.5], [0.98, 1.82], [-0.08, 1.82]]);
      else win(0.02, 0.96);
      win(-1.08, -0.1);
      win(-2.08, -1.2);
      return new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
    };
    s.mesh(side(true), yellow, [0, 0, 0.81]);
    s.mesh(side(false), yellow, [0, 0, -0.85]);
    s.box([4.0, 0.07, 1.74], [-0.2, 1.955, 0], yellow);
    s.box([4.3, 0.08, 1.64], [-0.05, 0.44, 0], black);
    s.box([0.05, 0.46, 1.7], [2.19, 0.83, 0], yellow);
    s.box([0.05, 1.52, 1.7], [-2.19, 1.17, 0], yellow);
    const screen = s.box([0.03, 0.98, 1.62], [1.99, 1.49, 0], glass);
    screen.rotation.z = 0.445;
    for (const z of [-0.83, 0.83]) s.rod([2.2, 1.05, z], [1.78, 1.93, z], 0.03, yellow);
    // Glazing behind the remaining windows.
    for (const z of [-0.83, 0.83]) s.box([4.1, 0.6, 0.01], [-0.05, 1.46, z], glass);
    s.box([0.01, 0.5, 1.3], [-2.225, 1.5, 0], glass);
    // Black stripes, broken by the door opening on the kerb side.
    for (const y of [0.93, 1.06]) {
      s.box([4.4, 0.065, 0.012], [0, y, -0.856], black);
      s.box([2.1, 0.065, 0.012], [-1.14, y, 0.856], black);
      s.box([1.2, 0.065, 0.012], [1.6, y, 0.856], black);
      s.box([0.012, 0.065, 1.7], [-2.22, y, 0], black);
    }
    // Nose: grille, round lamps, bumpers, mirrors, wipers.
    s.box([0.02, 0.16, 1.1], [2.225, 0.86, 0], black);
    for (const z of [-0.62, 0.62]) {
      const lamp = s.cylinder(0.1, 0.1, 0.04, [2.225, 0.86, z], s.material('#f3ecc8', { emissive: '#ffe9a0', emissiveIntensity: mix(0.05, 0.9, Math.abs(mood.daylight - 0.5) * 2) }), 16);
      lamp.rotation.z = Math.PI / 2;
    }
    const bumper = s.box([0.1, 0.13, 1.78], [2.24, 0.53, 0], black);
    bumper.rotation.x = mood.wear > 0.6 ? 0.07 : 0;
    s.box([0.1, 0.13, 1.78], [-2.24, 0.5, 0], black);
    for (const z of [-1, 1]) {
      s.rod([1.95, 1.3, z * 0.85], [2.05, 1.38, z * 1.02], 0.012, black);
      s.box([0.03, 0.2, 0.12], [2.05, 1.42, z * 1.02], black);
    }
    for (const z of [-0.3, 0.35]) s.rod([2.19, 1.1, z], [2.0, 1.5, z + 0.3], 0.008, black);
    for (const z of [-0.7, 0.7]) s.box([0.02, 0.12, 0.2], [-2.225, 0.78, z], s.material('#b3261e', { emissive: '#b3261e', emissiveIntensity: 0.25 }));

    if(a.frontGuard!=='plain'){
      const x=2.36;for(const z of[-.65,.65])s.rod([2.24,.53,z],[x,.68,z],.023,steel);
      if(a.frontGuard==='twin')for(const z of[-.62,.62]){const loop=s.ring(.18,.018,[x,.86,z],steel);loop.rotation.y=Math.PI/2;}
      else{for(const y of[.65,.98])s.rod([x,y,-.75],[x,y,.75],.022,steel);for(const z of(a.frontGuard==='cage'?[-.7,-.35,0,.35,.7]:[-.7,.7]))s.rod([x,.65,z],[x,.98,z],.018,steel);}
    }
    if(a.windowTrim!=='bare')for(const z of[-.86,.86])for(const x of[-1.64,-.59]){
      if(a.windowTrim==='sliders'){s.box([.025,.6,.018],[x,1.46,z],steel);for(const y of[1.17,1.76])s.box([.96,.018,.018],[x,y,z],steel);}
      else if(a.windowTrim==='visors'){const visor=s.box([1.02,.025,.14],[x,1.79,z+Math.sign(z)*.05],steel);visor.rotation.x=Math.sign(z)*.22;}
      else for(const y of[1.33,1.58])s.rod([x-.47,y,z],[x+.47,y,z],.009,steel);
    }
    // Slogan: a visor banner over the windscreen and a board on the tail.
    const words = SLOGAN_TEXT[a.slogan];
    const inks = ['#b3261e', '#1b3f8f', '#14141a', '#1d6b3a'];
    const ink = pick(inks);
    const banner = s.mesh(new THREE.PlaneGeometry(1.6, 0.26), lettering(words, 1.6, 0.26, '#fff6d0', ink, random), [1.84, 1.83, 0]);
    banner.rotation.set(0, Math.PI / 2, 0);
    banner.rotateX(-0.445);
    banner.position.x += 0.035;
    const tail = s.mesh(new THREE.PlaneGeometry(1.5, 0.52), lettering(words, 1.5, 0.52, ink, '#f6e9b8', random), [-2.23, 0.72 + 0.48, 0]);
    tail.rotation.y = -Math.PI / 2;
    tail.position.y = 0.66;
    // Route lettered on the rear quarter of the far-from-door body, below the stripes.
    const route = s.mesh(new THREE.PlaneGeometry(1.5, 0.3), lettering(ROUTES[a.route], 1.5, 0.3, '#14141a', '#f2c21a', random), [1.5, 0.7, 0.862]);
    route.scale.x = 0.62;

    // The sliding door, run back along the body.
    const doorGroup = new THREE.Group();
    const add = (group: THREE.Group, mesh: THREE.Mesh) => { group.add(mesh); return mesh; };
    add(doorGroup, s.box([1.08, 1.34, 0.04], [0, 0, 0], yellow));
    add(doorGroup, s.box([0.86, 0.5, 0.045], [0, 0.3, 0], black));
    for (const y of [-0.23, -0.1]) add(doorGroup, s.box([1.08, 0.065, 0.05], [0, y, 0], black));
    add(doorGroup, s.box([0.12, 0.03, 0.03], [0.4, 0, 0.03], steel));
    doorGroup.position.set(-0.68 - random() * 0.15, 1.16, 0.9);
    s.root.add(doorGroup);
    const stepDepth=a.stepType==='wide'?.46:.34;
    s.box([1.1,.05,stepDepth],[.45,.4,.96],a.stepType==='wide'?s.material('#927451'):black);
    if(a.stepType==='double'){s.box([1,.045,.26],[.45,.22,1.18],steel);for(const x of[.04,.86])s.rod([x,.375,1.01],[x,.2425,1.18],.016,black);}
    if(a.stepType==='folding'){for(const x of[.02,.88])s.rod([x,.56,.83],[x,.375,1.09],.014,steel);for(let i=0;i<7;i++)s.box([.025,.009,.32],[.03+i*.14,.43,.96],steel);}


    // Benches and riders.
    const rows = [1.25, 0.3, -0.45, -1.15, -1.85];
    for (const x of rows) {
      s.box([0.42, 0.1, x > 1 ? 1.5 : 1.15], [x, .8756459516662562, x > 1 || x < -0.2 ? 0 : -0.22], seat);
      s.box([0.08, 0.5, x > 1 ? 1.5 : 1.15], [x - 0.2, 1.1, x > 1 || x < -0.2 ? 0 : -0.22], seat);
    }
    // Driver and wheel.
    const wheel = s.ring(0.17, 0.018, [1.62,1.32,-.42], black);
    wheel.rotation.set(0, Math.PI / 2, 0.5);
    const rider=(x:number,z:number,lean=0)=>{
      const f=figure(s,{height:1.6,pose:'sitting',style:'doll',hair:pick(['short','bun','cap']),top:pick(cloth),bottom:'#35404a',skin:pick(skin),shoes:'#262a2b',face:'dots'});s.root.add(f.root);f.root.rotation.y=Math.PI/2;f.root.position.y=.48;f.root.updateMatrixWorld(true);const hip=new THREE.Vector3();f.pelvis.getWorldPosition(hip);f.root.position.x+=x-hip.x;f.root.position.z+=z-hip.z;f.joints.neck.rotation.z=lean;f.root.updateMatrixWorld(true);
      if(x>1&&z<0){const left=new THREE.Vector3(1.62,1.4,-.29),right=new THREE.Vector3(1.62,1.4,-.55);const gaps=[f.reach('left',left,{space:s.root}),f.reach('right',right,{space:s.root})];if(Math.max(...gaps)>1e-5)throw new Error('Danfo steering reach');}
      compactFigure(f.root);
    };
    if (a.doing !== 'broken' || a.passengers > 0.5) rider(1.25, -0.42);
    const seats: [number, number][] = [];
    for (const x of rows) for (const z of x > 1 ? [0.1, 0.5] : x < -0.2 ? [-0.6, -0.2, 0.2, 0.6] : [-0.6, -0.2]) seats.push([x, z]);
    const riders = Math.round(a.passengers * a.passengers * seats.length * (a.doing === 'broken' ? 0.3 : 1));
    seats.sort(() => random() - 0.5).slice(0, riders).forEach(([x, z]) => rider(x, z + (random() - 0.5) * 0.08, a.passengers > 0.8 && Math.abs(z) > 0.5 ? Math.sign(z) * 0.12 : 0));

    if(a.cabinExtra==='curtain'){
      s.rod([.84,1.84,-.76],[.84,1.84,.76],.012,steel);for(const z of[-.61,.61])for(let i=0;i<5;i++)s.box([.025,.48,.055],[.84,1.6,z+(i-2)*.06],s.material(i%2?'#9a7257':'#b39170'));
    }else if(a.cabinExtra==='rail'){
      s.rod([-1.9,1.79,0],[1.4,1.79,0],.018,steel);for(const x of[-1.7,-.4,1.2])s.rod([x,1.79,0],[x,1.92,0],.014,steel);
    }else if(a.cabinExtra==='fan'){
      s.rod([1.95,.98,.4],[1.85,1.23,.4],.015,black);const cage=s.ring(.13,.008,[1.85,1.31,.4],steel);cage.rotation.y=Math.PI/2;for(let i=0;i<3;i++){const t=i*Math.PI*2/3;s.rod([1.85,1.31,.4],[1.85,1.31+Math.cos(t)*.1,.4+Math.sin(t)*.1],.018,black);}
    }
    // Wear: rust blooms, a cardboard window, primer patches.
    const blooms = Math.round(mood.wear * 9);
    for (let i = 0; i < blooms; i++) {
      const near = random() > 0.4;
      const x = mix(-2.05, 1.9, random());
      if (near && x > -0.2 && x < 1.05) continue;
      const patch = s.cylinder(0.05 + random() * 0.1, 0.05 + random() * 0.1, 0.012, [x, mix(0.48, 0.85, random()), near ? 0.856 : -0.856], random() > 0.3 ? rust : s.material('#8c8f8a'), 9);
      patch.rotation.x = Math.PI / 2;
      patch.scale.x = 1 + random() * 1.5;
    }
    if (mood.wear > 0.45) s.box([0.84, 0.56, 0.02], [-1.64, 1.465, -0.84], s.material('#a8845a'));

    // Roof rack and its load.
    for (const z of [-0.78, 0.78]) {
      s.rod([-2.05, 2.1, z], [1.45, 2.1, z], 0.015, steel);
      for (let x = -2.05; x <= 1.46; x += 0.7) s.rod([x, 1.99, z], [x, 2.1, z], 0.012, steel);
    }
    for (const x of [-2.05, 1.45]) s.rod([x, 2.1, -0.78], [x, 2.1, 0.78], 0.015, steel);
    if(a.rackStyle!=='low'){
      const h=a.rackStyle==='high'?.45:.24;
      if(a.rackStyle==='hoops')for(const x of[-1.8,-.3,1.2]){const hoop=s.ring(.78,.014,[x,2.1,0],steel,Math.PI);hoop.rotation.y=Math.PI/2;}
      else{
        for(const z of[-.78,.78]){s.rod([-2.05,2.1+h,z],[1.45,2.1+h,z],.014,steel);for(let x=-2.05;x<1.46;x+=a.rackStyle==='mesh'?.18:.7)s.rod([x,2.1,z],[x,2.1+h,z],.008,steel);}
        for(const x of[-2.05,1.45])s.rod([x,2.1+h,-.78],[x,2.1+h,.78],.014,steel);
        if(a.rackStyle==='mesh')for(const z of[-.78,.78])for(const y of[2.18,2.26])s.rod([-2.05,y,z],[1.45,y,z],.006,steel);
      }
    }
    if(a.rearAccess!=='none'){
      const x=-2.28,z=-.48,mat=a.rearAccess==='rope'?s.material('#b8a577'):steel;
      for(const dz of[-.15,.15]){
        if(a.rearAccess!=='rungs')s.rod([x,.6,z+dz],[x,2.1,z+dz],.012,mat);
        for(const y of[.65,1.35,2.05])s.rod([-2.19,y,z+dz],[x,y,z+dz],.012,steel);
      }
      for(let y=.65;y<2.1;y+=.25)s.rod([x,y,z-.15],[x,y,z+.15],.014,mat);
    }
    const sack = [s.material('#d9cfb4'), s.material('#b99b6c'), s.material('#e9e6dc'), s.material('#8a9a5c')];
    const crate = [s.material('#2f6fb0'), s.material('#c8402e'), s.material('#b98a4a'), s.material('#e3b520')];
    const load = Math.round(a.roof * 15);
    let top = 2.0;
    const tops: [number, number][] = [];
    for (let i = 0; i < load; i++) {
      const layer = Math.floor(i / 6);
      const x = mix(-1.75, 1.1, ((i % 6) + random() * 0.6) / 6) + layer * 0.18;
      const z = (random() - 0.5) * (1.0 - layer * 0.3);
      const y = 2.0 + layer * 0.36;
      if (random() > 0.45) {
        const bag = s.ball([0.3 + random() * 0.1, 0.19, 0.24 + random() * 0.08], [x, y + 0.18, z], pick(sack), 12);
        bag.rotation.y = random() * 3;
      } else if (random() > 0.3) {
        const box = s.box([0.42 + random() * 0.15, 0.3 + random() * 0.1, 0.38], [x, y + 0.17, z], pick(crate));
        box.rotation.y = (random() - 0.5) * 0.5;
      } else {
        s.box([0.2, 0.36, 0.3], [x, y + 0.19, z], s.material(random() > 0.5 ? '#e8c020' : '#2a5fc0'));
        s.cylinder(0.035, 0.035, 0.05, [x + 0.05, y + 0.39, z], black, 8);
      }
      top = Math.max(top, y + 0.38);
      tops.push([x, y + 0.36]);
    }
    if (a.roof > 0.82) {
      const mattress = s.box([2.1, 0.2, 1.1], [-0.4, top + 0.1, 0], s.material(pick(['#d86a9a', '#6fa8d8', '#e8dcc0'])));
      mattress.rotation.set((random() - 0.5) * 0.12, (random() - 0.5) * 0.2, 0.05);
      top += 0.24;
      tops.push([-1.3, top], [-0.2, top], [0.8, top]);
    }
    if (load > 1) {
      const rope = s.material('#c9a35a');
      for (const x of [-1.3, -0.2, 0.8]) {
        const h = Math.max(2.12, ...tops.filter(([at]) => Math.abs(at - x) < 0.45).map(([, y]) => y));
        if (h > 2.15) s.tube([[x, 2.1, -0.78], [x + 0.03, h - 0.04, -0.45], [x, h + 0.01, 0], [x - 0.03, h - 0.04, 0.45], [x, 2.1, 0.78]], 0.012, rope);
      }
    }

    // Everything so far is the body, which can sag or shake as one piece.
    const body = new THREE.Group();
    body.add(...s.root.children);
    s.root.add(body);

    // Kit figures retain contact with the body-mounted step as it tilts.
    if(a.conductor!=='absent'){
      const seated=a.conductor==='sitting',calling=a.conductor==='calling',H=calling?1.65:1.35;
      const f=figure(s,{height:H,pose:calling?'waving':seated?'sitting':'standing',style:'doll',hair:'cap',top:pick(cloth),bottom:pick(['#30383f','#4a4030','#27405a']),skin:pick(skin),shoes:'#262a2c',face:'dots'});
      const notes=s.box([.08,.05,.014],[0,0,0],s.material('#5a9a5a'));f.hands.left.add(notes);
      if(calling){s.root.add(f.root);f.root.position.set(1.4,0,1.65);f.root.rotation.y=.5;}
      else{
        body.add(f.root);f.root.position.set(seated?.45:.28,.425,seated?.7:.95);f.root.updateMatrixWorld(true);
        if(seated){const hip=new THREE.Vector3();f.pelvis.getWorldPosition(hip);f.root.position.x+=.45-hip.x;f.root.position.z+=.7-hip.z;f.root.updateMatrixWorld(true);f.pelvis.getWorldPosition(hip);const seatY=hip.y-H*.045;body.add(s.box([.38,seatY-.48,.3],[.45,(seatY+.48)/2,.7],seat));const left=new THREE.Vector3(.51,hip.y+.12,.99),right=new THREE.Vector3(.39,hip.y+.12,.99);const gaps=[f.reach('left',left,{space:s.root}),f.reach('right',right,{space:s.root})];if(Math.max(...gaps)>1e-5)throw new Error('Danfo counting reach');}
        else{const gap=f.reach('right',new THREE.Vector3(-.08,1.5,.85),{space:s.root});if(gap>1e-5)throw new Error('Danfo door-frame reach');f.joints.shoulders.left.rotation.x=-1.3;f.joints.elbows.left.rotation.x=-.5;}
      }
      compactFigure(f.root);
    }

    // Wheels.
    const flat = a.tyre === 'front' ? 0 : a.tyre === 'rear' ? 1 : -1;
    [[1.38, 0.8], [-1.32, 0.8], [1.38, -0.8], [-1.32, -0.8]].forEach(([x, z], index) => {
      if (a.tyre === 'jacked' && index === 1) return;
      const squash = index === flat ? 0.72 : 1;
      const group = new THREE.Group();
      const tyre = s.cylinder(0.31, 0.31, 0.2, [0, 0, 0], rubber, 20);
      const hub = s.cylinder(0.17, 0.17, 0.21, [0, 0, 0], mood.wear > 0.5 && index % 2 ? rust : steel, 12);
      tyre.rotation.x = hub.rotation.x = Math.PI / 2;
      group.add(tyre,hub);
      const sign=Math.sign(z);if(a.wheelTrim==='caps'){const cap=s.cylinder(.12,.12,.025,[0,0,sign*.115],steel,16);cap.rotation.x=Math.PI/2;group.add(cap);}
      else if(a.wheelTrim==='painted'){const disk=s.cylinder(.16,.16,.018,[0,0,sign*.112],yellow,14);disk.rotation.x=Math.PI/2;group.add(disk);for(let i=0;i<5;i++){const t=i*Math.PI*2/5;group.add(s.ball([.012,.012,.008],[Math.cos(t)*.09,Math.sin(t)*.09,sign*.125],black,6));}}
      else if(a.wheelTrim==='rings')group.add(s.ring(.18,.016,[0,0,sign*.112],steel));

      group.scale.y = squash;
      group.position.set(x, 0.31 * squash, z);
      s.root.add(group);
    });
    body.position.y = 0;
    if (flat === 0) { body.rotation.z = -0.03; body.rotation.x = 0.045; body.position.y = -0.05; }
    if (flat === 1) { body.rotation.z = 0.03; body.rotation.x = 0.045; body.position.y = -0.05; }
    if (a.tyre === 'jacked') {
      body.rotation.z = -0.035; body.rotation.x = -0.03; body.position.y = 0.04;
      s.box([0.2, 0.05, 0.14], [-1.32, 0.025, 0.62], steel);
      s.rod([-1.32, 0.05, 0.62], [-1.32, 0.4, 0.62], 0.025, s.material('#b3261e'));
      s.rod([-1.32, 0.2, 0.62], [-1.1, 0.3, 0.95], 0.012, steel);
      const off = new THREE.Group();
      const tyre = s.cylinder(0.31, 0.31, 0.2, [0, 0, 0], rubber, 20), hub = s.cylinder(0.17, 0.17, 0.21, [0, 0, 0], steel, 12);
      off.add(tyre, hub);
      off.position.set(-1.7 - random() * 0.3, 0.1, 1.5 + random() * 0.25);
      s.root.add(off);
      for (let i = 0; i < 4; i++) s.cylinder(0.02, 0.02, 0.025, [-1.15 + random() * 0.3, 0.012, 1.25 + random() * 0.25], steel, 6);
      const iron = s.rod([-1.1, 0.015, 1.3], [-0.75, 0.015, 1.55], 0.012, steel);
      iron.castShadow = true;
    }

    // What it is doing.
    const puffs: THREE.Mesh[] = [];
    const smoke = (at: [number, number, number], size: number, colour: string) => {
      const puff = s.ball([size, size * 0.8, size], at, new THREE.MeshStandardMaterial({ color: colour, transparent: true, opacity: 0.38, roughness: 1, depthWrite: false }), 10);
      puff.castShadow = false;
      puffs.push(puff);
    };
    if (a.doing === 'leaving') {
      for (let i = 0; i < 6; i++) smoke([-2.4 - i * 0.24 - random() * 0.1, 0.3 + i * 0.1 + random() * 0.08, -0.55 + (random() - 0.5) * 0.3], 0.14 + i * 0.05, i < 3 ? '#3c3a38' : '#8f8778');
      for (let i = 0; i < 4; i++) smoke([-1.5 - random() * 0.9, 0.12, (random() > 0.5 ? 1 : -1) * (0.85 + random() * 0.3)], 0.2 + random() * 0.14, '#c9b48a');
      s.rod([-2.2, 0.3, -0.55], [-2.36, 0.28, -0.55], 0.03, steel);
    } else if (a.doing === 'broken') {
      const hatch = s.box([0.04, 0.5, 1.4], [-2.42, 0.98, 0], yellow);
      hatch.rotation.z = -1.0;
      body.add(hatch);
      s.box([0.3, 0.3, 1.1], [-2.02, 0.62, 0], black);
      for (let i = 0; i < 5; i++) smoke([-2.3 - random() * 0.2, 0.9 + i * 0.3, (random() - 0.5) * 0.6], 0.16 + i * 0.05, '#e4e2dc');
      // A leafy branch on the tarmac behind: the roadside warning triangle.
      const leaf = s.material('#3f7a35');
      s.rod([-3.0, 0.03, -0.3], [-3.5, 0.08, 0.3], 0.015, s.material('#5a4630'));
      for (let i = 0; i < 9; i++) {
        const frond = s.ball([0.16, 0.035, 0.07], [-3.05 - i * 0.05 + (random() - 0.5) * 0.15, 0.06 + random() * 0.06, -0.25 + i * 0.065 + (random() - 0.5) * 0.25], leaf, 8);
        frond.rotation.y = random() * 3;
      }
    }

    const energy = mood.energy;
    const shake = a.doing === 'broken' ? 0 : mix(0.002, 0.012, energy) * (a.doing === 'leaving' ? 1.6 : 1);
    const baseY = body.position.y;
    return s.finish({
      update: (_dt, time) => {
        body.position.y = baseY + Math.sin(time * 38) * shake;
        puffs.forEach((puff, index) => {
          const beat = (time * mix(0.3, 0.9, energy) + index * 0.37) % 1;
          puff.scale.setScalar(puff.userData.size ?? (puff.userData.size = puff.scale.x));
          puff.scale.multiplyScalar(0.8 + beat * 0.6);
        });
      },
    });
  },
});
