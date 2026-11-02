import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const LIVERIES = {
  primary: { engine: '#cf3327', wagons: ['#2a62b8', '#e7b522'], trim: '#f1e9d2', wheel: '#24262b' },
  forest: { engine: '#2f7a48', wagons: ['#dcbc88', '#dcbc88'], trim: '#f1e9d2', wheel: '#b3312a' },
  royal: { engine: '#23489a', wagons: ['#8a1f2b', '#23489a'], trim: '#d8ac3c', wheel: '#1d1f24' },
  night: { engine: '#25272c', wagons: ['#7a2424', '#3d434d'], trim: '#c9a23a', wheel: '#7a2424' },
  candy: { engine: '#ef8fb0', wagons: ['#9bd8c0', '#f5dc86'], trim: '#ffffff', wheel: '#fbf7ee' },
  bare: { engine: '#dcbc88', wagons: ['#dcbc88', '#dcbc88'], trim: '#b98f55', wheel: '#c9362c' },
} as const;

type V3 = readonly [number, number, number];

export default defineThing({
  questions: {
    shape: choice('What shape is the track laid in?', {
      circle: 'A plain small circle, the starter set.',
      oval: 'An oval with two straights.',
      eight: 'A figure of eight that climbs over itself on a little bridge.',
      broken: 'An unfinished ring: a gap where the last pieces were never fitted, and they lie beside it.',
    }),
    state: choice('What is the train doing?', {
      running: 'Running round and round, coupled up and steady.',
      stopped: 'Stopped on the track, waiting.',
      derailed: 'Derailed on the bend: the engine on its side on the floor, a wagon jack-knifed, cargo spilled.',
      uncoupled: 'The engine has pulled away and runs on alone, its wagons left standing behind it.',
    }),
    engine: choice('What kind of engine is it?', {
      steam: 'A stubby steam engine with a boiler, cab and funnel.',
      oldtimer: 'A wild-west old-timer with a tall flared stack, cowcatcher and headlamp.',
      diesel: 'A boxy diesel with a stripe down its side.',
      bullet: 'A smooth rounded bullet train.',
    }),
    colours: choice('What colours is the train painted?', {
      primary: 'Red engine with blue and yellow wagons.',
      forest: 'Green engine pulling plain wooden wagons with red wheels.',
      royal: 'Royal blue and maroon with gold trim.',
      night: 'Black engine with dark red and grey wagons.',
      candy: 'Pink, mint and lemon.',
      bare: 'All unpainted wood with red wheels.',
    }),
    cargo: choice('What are the wagons carrying?', {
      logs: 'Stacked logs.',
      coal: 'Heaps of black coal.',
      animals: 'Little wooden farm animals.',
      passengers: 'They are passenger coaches with rows of windows.',
      blocks: 'Coloured building blocks.',
      marbles: 'Glass marbles, borrowed.',
      empty: 'Nothing: open wagons running empty.',
    }),
    scenery: choice('What stands along the line?', {
      bare: 'Nothing, only track on floor.',
      tunnel: 'A painted hill with a tunnel through it.',
      station: 'A little station house with a platform and a signal.',
      forest: 'A cluster of lollipop trees.',
    }),
    wheels: choice('What kind of toy wheels run under the train?', {
      solid: 'Simple solid painted wooden wheels.',
      spokes: 'Open spoked wheels with narrow rims.',
      white: 'Painted wheels with bright white outer rims.',
      tyres: 'Dark rubber-like tyres around coloured hubs.',
    }),
    coupling: choice('How are the toy vehicles coupled?', {
      magnets: 'Round metal magnets meet between the cars.',
      loops: 'Small metal loops hang from short coupling stems.',
      pegs: 'Painted peg-and-socket couplings join the cars.',
      chain: 'Short visible chains hang between coupling mounts.',
    }),
    trackbed: choice('How is the little railway track constructed?', {
      wood: 'Plain grooved wooden track pieces.',
      sleepers: 'Broad wooden sleepers sit beneath the grooved track.',
      rails: 'Two bright metal rails run along the grooves.',
      studs: 'Small coloured connecting studs mark the track edges.',
    }),
    coachRoof: choice('If there are passenger coaches, how are their roofs shaped?', {
      flat: 'Plain flat dark coach roofs.',
      barrel: 'Smooth curved barrel roofs.',
      ribs: 'Raised transverse ribs cross the roofs.',
      clerestory: 'A narrow raised clerestory runs along each roof.',
    }),
    marker: choice('Which line-side play marker has been set out?', {
      crossing: 'A small white railway crossing cross.',
      flag: 'A flag on a low stand marks the start of the game.',
      mile: 'A chunky numbered milestone stands beside the line.',
      gate: 'A striped hinged crossing gate stands on a foot.',
    }),
    playwork: choice('What was left beside the little railway?', {
      tickets: 'A small book of pretend tickets.',
      tools: 'A toy spanner and screwdriver for railway repairs.',
      parcels: 'Two tiny tied parcels await a goods train.',
      timetable: 'A folded timetable with coloured route lines.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jit = (range: number) => (random() - 0.5) * 2 * range;
    const livery = LIVERIES[a.colours];
    const paint = (hex: string) => s.material(hex, { roughness: 0.5 });
    const wood = s.material('#e3c690', { roughness: 0.75 });
    const dark = s.material('#26282d', { roughness: 0.6 });
    const steel = s.material('#c9cbc8', { metalness: 0.5, roughness: 0.3 });
    const wheelPaint = paint(livery.wheel), trim = paint(livery.trim);

    const put = <T extends THREE.Object3D>(parent: THREE.Object3D, node: T, at: V3 = [0, 0, 0]) => {
      node.position.set(...at);
      node.castShadow = node.receiveShadow = true;
      parent.add(node);
      return node;
    };
    const box = (parent: THREE.Object3D, size: V3, at: V3, material: THREE.Material | THREE.Material[]) => put(parent, new THREE.Mesh(new THREE.BoxGeometry(...size), material), at);
    const cyl = (parent: THREE.Object3D, top: number, bottom: number, height: number, at: V3, material: THREE.Material, axis: 'x' | 'y' | 'z' = 'y', segments = 18) => {
      const mesh = put(parent, new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, segments), material), at);
      if (axis === 'x') mesh.rotation.z = Math.PI / 2;
      if (axis === 'z') mesh.rotation.x = Math.PI / 2;
      return mesh;
    };
    const ball = (parent: THREE.Object3D, radius: number, at: V3, material: THREE.Material) => put(parent, new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material), at);

    // ---- The line ------------------------------------------------------------------------
    const closed = a.shape !== 'broken';
    const R = 0.2, K = 1.32;
    const route: THREE.Vector3[] = [];
    let spots: [number, number][] = [[0, 0], [0.085, -0.06], [-0.08, -0.055], [0.02, 0.09], [-0.075, 0.07], [0.09, 0.05]];
    if (a.shape === 'circle') {
      for (let i = 0; i < 48; i++) route.push(new THREE.Vector3(Math.sin((i / 48) * Math.PI * 2) * R, 0, Math.cos((i / 48) * Math.PI * 2) * R));
    } else if (a.shape === 'broken') {
      for (let i = 0; i <= 40; i++) { const angle = mix(-0.35, 4.55, i / 40); route.push(new THREE.Vector3(Math.sin(angle) * R, 0, Math.cos(angle) * R)); }
    } else if (a.shape === 'oval') {
      const half = 0.13, r = 0.15;
      for (let i = 0; i < 6; i++) route.push(new THREE.Vector3(mix(0, half, i / 6), 0, r));
      for (let i = 0; i < 16; i++) { const angle = (i / 16) * Math.PI; route.push(new THREE.Vector3(half + Math.sin(angle) * r, 0, Math.cos(angle) * r)); }
      for (let i = 0; i < 12; i++) route.push(new THREE.Vector3(mix(half, -half, i / 12), 0, -r));
      for (let i = 0; i < 16; i++) { const angle = Math.PI + (i / 16) * Math.PI; route.push(new THREE.Vector3(-half + Math.sin(angle) * r, 0, Math.cos(angle) * r)); }
      for (let i = 0; i < 6; i++) route.push(new THREE.Vector3(mix(-half, 0, i / 6), 0, r));
      spots = [[0, 0], [0.14, -0.02], [-0.14, 0.02], [0.075, 0.055], [-0.075, -0.055], [-0.03, 0.07]];
    } else {
      const reach = 0.39, depth = 0.42, bridge = 0.106;
      for (let i = 0; i < 72; i++) {
        const t = (i / 72) * Math.PI * 2;
        route.push(new THREE.Vector3(reach * Math.sin(t), bridge * Math.max(0, Math.cos(t)) ** 2.4, depth * Math.sin(t) * Math.cos(t)));
      }
      spots = [[-0.23, 0], [0.23, 0], [0.28, 0.055], [0.2, -0.06], [-0.28, -0.05], [-0.19, 0.06]];
    }
    const curve = new THREE.CatmullRomCurve3(route, closed, 'centripetal');
    curve.arcLengthDivisions = 400;
    const length = curve.getLength();

    const profile = ([[-0.02, 0], [0.02, 0], [0.02, 0.012], [0.0135, 0.012], [0.0135, 0.0085], [0.0065, 0.0085], [0.0065, 0.012], [-0.0065, 0.012], [-0.0065, 0.0085], [-0.0135, 0.0085], [-0.0135, 0.012], [-0.02, 0.012]] as const).map(([x, y]) => [x * K, y * K] as [number, number]);
    const sweep = (points: THREE.Vector3[], loop: boolean) => {
      const count = points.length, ring = profile.length;
      const positions: number[] = [], index: number[] = [];
      for (let i = 0; i < count; i++) {
        const before = points[loop ? (i - 1 + count) % count : Math.max(i - 1, 0)], after = points[loop ? (i + 1) % count : Math.min(i + 1, count - 1)];
        const tangent = after.clone().sub(before).setY(0).normalize();
        for (const [x, y] of profile) positions.push(points[i].x + tangent.z * x, points[i].y + y, points[i].z - tangent.x * x);
      }
      for (let i = 0; i < (loop ? count : count - 1); i++) {
        const j = (i + 1) % count;
        for (let q = 0; q < ring; q++) {
          const r = (q + 1) % ring;
          index.push(i * ring + q, j * ring + r, i * ring + r, i * ring + q, j * ring + q, j * ring + r);
        }
      }
      if (!loop) {
        const faces = THREE.ShapeUtils.triangulateShape(profile.map(([x, y]) => new THREE.Vector2(x, y)), []);
        for (const [p, q, r] of faces) index.push(p, q, r, (count - 1) * ring + p, (count - 1) * ring + r, (count - 1) * ring + q);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(index);
      const flat = geometry.toNonIndexed();
      geometry.dispose();
      flat.computeVertexNormals();
      return flat;
    };
    const trackMaterial = new THREE.MeshStandardMaterial({ color: wood.color, roughness: 0.8, side: THREE.DoubleSide });
    const samples = Math.round(length / 0.006);
    const spaced = curve.getSpacedPoints(samples);
    if (closed) spaced.pop();
    put(s.root, new THREE.Mesh(sweep(spaced, closed), trackMaterial));

    const wrap = (u: number) => (closed ? ((u % 1) + 1) % 1 : Math.min(0.975, Math.max(0.025, u)));
    const yawAt = (tangent: THREE.Vector3) => Math.atan2(tangent.x, tangent.z);
    // Joints between track pieces, and trestles under any raised stretch.
    const pieces = Math.round(length / 0.11);
    for (let i = 0; i < pieces; i++) {
      const u = closed ? i / pieces : (i + 0.5) / pieces;
      const p = curve.getPointAt(u), t = curve.getTangentAt(u);
      const joint = box(s.root, [0.0402 * K, 0.0125 * K, 0.0014], [p.x, p.y + 0.0063 * K, p.z], dark);
      joint.rotation.y = yawAt(t);
    }
    if(a.trackbed==='sleepers'||a.trackbed==='studs')for(let i=0;i<Math.round(length/.035);i++){
      const p=curve.getPointAt(i/Math.round(length/.035)),t=curve.getTangentAt(i/Math.round(length/.035));
      if(a.trackbed==='sleepers'){const tie=box(s.root,[.071,.003,.009],[p.x,p.y+.0015,p.z],s.material('#a6814d'));tie.rotation.y=yawAt(t);}
      else for(const side of [-1,1])cyl(s.root,.0035,.0035,.003,[p.x+t.z*side*.026,p.y+.017,p.z-t.x*side*.026],trim,'y',8);
    }
    if(a.trackbed==='rails')for(const side of [-1,1]){
      const points=Array.from({length:151},(_,i)=>{const p=curve.getPointAt(i/150),t=curve.getTangentAt(i/150);return new THREE.Vector3(p.x+t.z*side*.0132,p.y+.0138,p.z-t.x*side*.0132);});
      const rail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,closed),180,.0014,6,closed),steel);rail.castShadow=true;s.root.add(rail);
    }
    if (a.shape === 'eight') {
      const pier = paint('#c9362c');
      for (let i = 0; i < 40; i++) {
        const p = curve.getPointAt(i / 40), t = curve.getTangentAt(i / 40);
        if (p.y < 0.014 || Math.hypot(p.x, p.z) < 0.1) continue;
        const post = box(s.root, [0.046, p.y, 0.014], [p.x, p.y / 2, p.z], pier);
        post.rotation.y = yawAt(t);
      }
    } else if (a.shape === 'broken') {
      for (let i = 0; i < 2; i++) {
        const arc: THREE.Vector3[] = [];
        for (let k = 0; k <= 12; k++) arc.push(new THREE.Vector3(Math.sin((k / 12) * 0.62 - 0.31) * R, 0, Math.cos((k / 12) * 0.62 - 0.31) * R - R));
        const spare = put(s.root, new THREE.Mesh(sweep(arc, false), trackMaterial), [-0.19 - i * 0.07 + jit(0.02), i ? 0 : 0.0005, 0.21 + i * 0.06 + jit(0.02)]);
        spare.rotation.y = i ? 1.1 + jit(0.5) : -0.5 + jit(0.4);
      }
    }

    // ---- Rolling stock: origin at the groove floor, nose toward +z ------------------------
    const wheels = (car: THREE.Object3D, places: readonly (readonly [number, number])[]) => {
      for (const [z, radius] of places) for (const x of [-1, 1]) {
        if(a.wheels==='spokes'){
          const rim=put(car,new THREE.Mesh(new THREE.TorusGeometry(radius*.85,radius*.15,6,20),wheelPaint),[x*.0172,radius,z]);rim.rotation.y=Math.PI/2;
          for(let i=0;i<4;i++){const angle=i/4*Math.PI,spoke=box(car,[.003,radius*1.6,.002],[x*.0172,radius,z],wheelPaint);spoke.rotation.x=angle;}
        }else cyl(car, radius, radius, 0.005, [x * 0.0172, radius, z], a.wheels==='tyres'?dark:wheelPaint, 'x');
        if(a.wheels==='white'){const rim=put(car,new THREE.Mesh(new THREE.TorusGeometry(radius*.87,radius*.12,6,20),s.material('#f1ead7')),[x*.0202,radius,z]);rim.rotation.y=Math.PI/2;}
        cyl(car, radius * 0.4, radius * 0.4, 0.0056, [x * 0.0172, radius, z], trim, 'x', 8);
      }
    };
    const magnets = (car: THREE.Object3D, half: number) => { for (const end of [-1, 1]) {
      if(a.coupling==='magnets')cyl(car,0.0048,0.0048,0.005,[0,0.015,end*half],steel,'z',12);
      else if(a.coupling==='pegs'){box(car,[.007,.004,.007],[0,.014,end*half],trim);cyl(car,.002,.002,.006,[0,.017,end*half],wheelPaint,'y',10);}
      else {
        box(car,[.003,.003,.005],[0,.015,end*half],steel);
        const count=a.coupling==='chain'?3:1;
        for(let i=0;i<count;i++){const ring=put(car,new THREE.Mesh(new THREE.TorusGeometry(a.coupling==='chain'?.002:.004,.0008,5,12),steel),[0,.014-i*.001,end*(half+.003+i*.0018)]);ring.rotation.x=Math.PI/2;ring.rotation.z=i%2*Math.PI/2;}
      }
    }};
    const body = paint(livery.engine);
    const engine = new THREE.Group();
    const moving = a.state === 'running' || a.state === 'uncoupled';
    if (a.engine === 'steam' || a.engine === 'oldtimer') {
      const old = a.engine === 'oldtimer';
      box(engine, [0.03, 0.01, 0.078], [0, 0.016, 0], dark);
      cyl(engine, 0.0136, 0.0136, 0.046, [0, 0.0345, 0.013], body, 'z', 20);
      cyl(engine, 0.0142, 0.0142, 0.004, [0, 0.0345, 0.037], dark, 'z', 20);
      for (const z of [0.0, 0.024]) cyl(engine, 0.0141, 0.0141, 0.003, [0, 0.0345, z], trim, 'z', 20);
      box(engine, [0.031, 0.03, 0.024], [0, 0.036, -0.026], body);
      box(engine, [0.0315, 0.01, 0.012], [0, 0.042, -0.026], dark);
      box(engine, [0.036, 0.004, 0.031], [0, 0.053, -0.026], old ? paint('#7a2424') : dark);
      cyl(engine, old ? 0.0095 : 0.006, 0.0042, old ? 0.024 : 0.014, [0, old ? 0.059 : 0.054, 0.027], dark);
      ball(engine, 0.0058, [0, 0.048, 0.008], trim);
      if (old) {
        const catcher = cyl(engine, 0.002, 0.017, 0.018, [0, 0.012, 0.046], paint('#7a2424'), 'z', 4);
        catcher.rotation.z = Math.PI / 4;
        box(engine, [0.008, 0.008, 0.006], [0, 0.052, 0.036], new THREE.MeshStandardMaterial({ color: '#ffe9a6', emissive: '#ffd45a', emissiveIntensity: mix(0.2, 1.4, mood.energy) }));
        wheels(engine, [[-0.024, 0.012], [0.006, 0.0085], [0.028, 0.0085]]);
      } else wheels(engine, [[-0.026, 0.009], [0, 0.009], [0.026, 0.009]]);
      if (moving) {
        const steam = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false, roughness: 1 });
        for (let i = 0; i < 3; i++) {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(0.006 + i * 0.003, 12, 8), steam);
          puff.position.set(jit(0.004), 0.076 + i * 0.016, 0.022 - i * 0.02);
          engine.add(puff);
        }
      }
    } else if (a.engine === 'diesel') {
      box(engine, [0.03, 0.01, 0.08], [0, 0.016, 0], dark);
      box(engine, [0.03, 0.028, 0.066], [0, 0.035, -0.004], body);
      box(engine, [0.03, 0.017, 0.012], [0, 0.0295, 0.034], body);
      box(engine, [0.0308, 0.006, 0.0668], [0, 0.031, -0.004], trim);
      box(engine, [0.026, 0.004, 0.06], [0, 0.051, -0.004], dark);
      box(engine, [0.024, 0.009, 0.001], [0, 0.042, 0.0295], dark);
      for (const z of [-0.02, 0, 0.018]) box(engine, [0.0312, 0.008, 0.011], [0, 0.042, z], dark);
      wheels(engine, [[-0.024, 0.009], [0.024, 0.009]]);
    } else {
      const shell = put(engine, new THREE.Mesh(new THREE.CapsuleGeometry(0.0152, 0.052, 8, 18), body), [0, 0.027, 0]);
      shell.rotation.x = Math.PI / 2;
      box(engine, [0.029, 0.009, 0.074], [0, 0.0145, 0], trim);
      box(engine, [0.031, 0.004, 0.06], [0, 0.027, -0.004], trim);
      const screen = ball(engine, 0.009, [0, 0.034, 0.027], dark);
      screen.scale.set(1.1, 0.6, 1.2);
      for (const z of [-0.022, -0.008, 0.006]) box(engine, [0.0308, 0.005, 0.009], [0, 0.033, z], dark);
      wheels(engine, [[-0.024, 0.0075], [0.024, 0.0075]]);
    }
    magnets(engine, 0.041);

    const glassy = (hex: string) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.12, metalness: 0.1 });
    const cargoColours = ['#cf3327', '#2a62b8', '#e7b522', '#2f8f4e', '#7b3fa6', '#ee7f1c'];
    const wagon = (index: number) => {
      const car = new THREE.Group();
      const coat = paint(livery.wagons[index]);
      const loose: THREE.Object3D[] = [];
      box(car, [0.03, 0.008, 0.062], [0, 0.017, 0], coat);
      wheels(car, [[-0.019, 0.008], [0.019, 0.008]]);
      magnets(car, 0.033);
      const item = (node: THREE.Object3D, at: V3) => { node.position.set(...at); node.traverse((child) => { child.castShadow = child.receiveShadow = true; }); loose.push(node); };
      if (a.cargo === 'passengers') {
        const windows = document.createElement('canvas');
        windows.width = 128;
        windows.height = 64;
        const g = windows.getContext('2d')!;
        g.fillStyle = `#${coat.color.getHexString(THREE.SRGBColorSpace)}`;
        g.fillRect(0, 0, 128, 64);
        g.fillStyle = livery.trim;
        g.fillRect(0, 40, 128, 5);
        for (let i = 0; i < 4; i++) { g.fillStyle = mood.daylight > 0.75 || mood.daylight < 0.2 ? '#ffe9a6' : '#2c3640'; g.fillRect(9 + i * 30, 10, 20, 22); }
        const map = new THREE.CanvasTexture(windows);
        map.colorSpace = THREE.SRGBColorSpace;
        const side = new THREE.MeshStandardMaterial({ map, roughness: 0.55 });
        box(car, [0.03, 0.026, 0.062], [0, 0.034, 0], [side, side, coat, coat, coat, coat]);
        if(a.coachRoof==='barrel'){
          const shape=new THREE.Shape();shape.moveTo(-.017,0);shape.absarc(0,0,.017,Math.PI,0,true);shape.closePath();
          put(car,new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.066,bevelEnabled:false,curveSegments:18}),dark),[0,.047,-.033]);
        }else{
          box(car, [0.033, 0.004, 0.066], [0, 0.049, 0], dark);
          if(a.coachRoof==='ribs')for(let i=0;i<6;i++)box(car,[.033,.0018,.002],[0,.052,-.027+i*.011],trim);
          if(a.coachRoof==='clerestory'){box(car,[.016,.009,.05],[0,.055,0],trim);box(car,[.018,.002,.053],[0,.0605,0],dark);}
        }
      } else if (a.cargo === 'coal' || a.cargo === 'marbles' || a.cargo === 'empty') {
        for (const x of [-1, 1]) box(car, [0.003, 0.016, 0.062], [x * 0.0135, 0.029, 0], coat);
        for (const z of [-1, 1]) box(car, [0.03, 0.016, 0.003], [0, 0.029, z * 0.0295], coat);
        if (a.cargo === 'coal') for (let i = 0; i < 7; i++) item(new THREE.Mesh(new THREE.DodecahedronGeometry(0.0065 + random() * 0.003), dark), [jit(0.006), 0.028 + (i % 3) * 0.005, -0.02 + i * 0.0066]);
        if (a.cargo === 'marbles') for (let i = 0; i < 4; i++) item(new THREE.Mesh(new THREE.SphereGeometry(0.0078, 16, 12), glassy(cargoColours[(i + index * 2) % 6])), [jit(0.004), 0.031, -0.02 + i * 0.0135]);
      } else {
        for (const x of [-1, 1]) for (const z of [-1, 1]) cyl(car, 0.0016, 0.0016, 0.02, [x * 0.0135, 0.031, z * 0.026], dark, 'y', 6);
        if (a.cargo === 'logs') {
          const bark = s.material('#8a5a33'), heart = s.material('#e0c08a');
          for (const [x, y] of [[-0.0068, 0.0275], [0.0068, 0.0275], [0, 0.039]]) {
            const log = new THREE.Group();
            cyl(log, 0.0064, 0.0064, 0.054, [0, 0, 0], bark, 'z', 10);
            cyl(log, 0.0046, 0.0046, 0.0546, [0, 0, 0], heart, 'z', 10);
            item(log, [x, y, 0]);
          }
        } else if (a.cargo === 'blocks') {
          for (let i = 0; i < 3; i++) {
            const cube = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.017, 0.017), paint(cargoColours[(i + index) % 6]));
            cube.rotation.y = jit(0.4);
            item(cube, [jit(0.003), 0.0295, -0.019 + i * 0.019]);
          }
        } else {
          for (let i = 0; i < 2; i++) {
            const hide = paint(['#f4efe4', '#8a5a33', '#f0a9b4', '#2b2b2b'][Math.floor(random() * 4)]);
            const animal = new THREE.Group();
            ball(animal, 1, [0, 0.006, 0], hide).scale.set(0.0075, 0.007, 0.012);
            ball(animal, 0.0052, [0, 0.012, 0.011], hide);
            for (const x of [-1, 1]) for (const z of [-1, 1]) cyl(animal, 0.0018, 0.0018, 0.008, [x * 0.004, -0.002, z * 0.006], hide, 'y', 6);
            item(animal, [0, 0.027, -0.014 + i * 0.03]);
          }
        }
      }
      return { car, loose };
    };
    const wagons = [wagon(0), wagon(1)];

    // ---- Where everything is right now -----------------------------------------------------
    const cars = [engine, wagons[0].car, wagons[1].car];
    for (const car of cars) { car.rotation.order = 'YXZ'; car.scale.setScalar(K); s.root.add(car); }
    const seat = (car: THREE.Object3D, u: number) => {
      const p = curve.getPointAt(wrap(u)), t = curve.getTangentAt(wrap(u));
      car.position.set(p.x, p.y + 0.0085 * K, p.z);
      car.rotation.set(-Math.asin(Math.min(1, Math.max(-1, t.y))), yawAt(t), 0);
    };
    const pitch = (0.083 * K) / length;
    const start = a.shape === 'eight' ? 0.62 + jit(0.05) : a.shape === 'broken' ? 0.5 : 0.04 + jit(0.06);
    cars.forEach((car, index) => seat(car, start - index * pitch));
    let spilled = -1;
    if (a.state === 'uncoupled') {
      const ahead = closed ? 0.32 : 0.3;
      seat(engine, start + ahead);
      wagons.forEach(({ car }, index) => seat(car, start - index * pitch));
    } else if (a.state === 'derailed') {
      const at = a.shape === 'eight' ? 0.75 : a.shape === 'broken' ? 0.955 : a.shape === 'oval' ? 0.27 : 0.2;
      cars.forEach((car, index) => seat(car, at - index * pitch));
      const p = curve.getPointAt(wrap(at)), t = curve.getTangentAt(wrap(at));
      const centre = a.shape === 'eight' ? new THREE.Vector3(Math.sign(p.x) * 0.23, 0, 0) : new THREE.Vector3();
      const out = new THREE.Vector3(t.z, 0, -t.x);
      if (out.dot(p.clone().sub(centre)) < 0) out.negate();
      const side = out.dot(new THREE.Vector3(t.z, 0, -t.x)) > 0 ? 1 : -1;
      engine.position.set(p.x + out.x * 0.085 + t.x * 0.04, 0.019 * K, p.z + out.z * 0.085 + t.z * 0.04);
      engine.rotation.set(0, yawAt(t) + side * (0.5 + random() * 0.4), -side * (Math.PI / 2 - 0.04));
      const jack = wagons[0].car;
      jack.position.addScaledVector(out, 0.03).setY(jack.position.y + 0.006);
      jack.rotation.y += side * (0.5 + random() * 0.3);
      jack.rotation.z = -side * 0.42;
      spilled = 0;
      wagons[0].loose.forEach((node, index) => {
        const reach = 0.075 + random() * 0.07, swing = jit(1.1);
        const direction = out.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), swing);
        node.position.set(jack.position.x + direction.x * reach, 0.0078 * K, jack.position.z + direction.z * reach + index * 0.004);
        node.scale.setScalar(K);
        node.rotation.set(0, random() * Math.PI * 2, a.cargo === 'animals' && random() < 0.5 ? Math.PI / 2 : 0);
        s.root.add(node);
      });
    }
    wagons.forEach(({ car, loose }, index) => { if (index !== spilled) for (const node of loose) car.add(node); });

    // ---- Scenery ----------------------------------------------------------------------------
    const tree = (x: number, z: number) => {
      const autumn = mood.warmth > 0.7 && random() < 0.6;
      const leaf = paint(autumn ? ['#d9822b', '#c9482b', '#e2b12e'][Math.floor(random() * 3)] : ['#3d9c46', '#2f7a48', '#6fae3f'][Math.floor(random() * 3)]);
      const tall = 0.028 + random() * 0.018;
      cyl(s.root, 0.012, 0.014, 0.004, [x, 0.002, z], wood, 'y', 12);
      cyl(s.root, 0.0045, 0.0055, tall, [x, tall / 2, z], s.material('#8a5a33'), 'y', 8);
      if (random() < 0.5) cyl(s.root, 0.001, 0.022, 0.05, [x, tall + 0.022, z], leaf, 'y', 12);
      else ball(s.root, 0.022, [x, tall + 0.016, z], leaf);
    };
    let nextSpot = 0;
    if (a.scenery === 'station') {
      const [x, z] = spots[nextSpot++];
      const station = put(s.root, new THREE.Group(), [x, 0, z]);
      station.rotation.y = jit(0.3);
      box(station, [0.1, 0.008, 0.05], [0, 0.004, 0], s.material('#b9b3a4'));
      box(station, [0.056, 0.036, 0.032], [-0.014, 0.026, -0.004], paint('#f1e3c2'));
      const gable = new THREE.Shape([new THREE.Vector2(-0.034, 0), new THREE.Vector2(0.034, 0), new THREE.Vector2(0, 0.022)]);
      const roof = put(station, new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: 0.04, bevelEnabled: false }), paint('#b3312a')), [-0.014, 0.044, -0.024]);
      roof.rotation.y = 0;
      box(station, [0.011, 0.02, 0.001], [-0.014, 0.018, 0.0125], dark);
      for (const dx of [-0.02, 0.02]) box(station, [0.009, 0.009, 0.001], [-0.014 + dx, 0.03, 0.0125], paint('#7fb4d6'));
      cyl(station, 0.0016, 0.0016, 0.06, [0.038, 0.038, 0.012], dark, 'y', 6);
      const lamp = a.state === 'stopped' || a.state === 'derailed' ? '#d92b20' : '#3fbf5a';
      cyl(station, 0.008, 0.008, 0.003, [0.038, 0.064, 0.0135], new THREE.MeshStandardMaterial({ color: lamp, emissive: lamp, emissiveIntensity: 0.7 }), 'z', 14);
    } else if (a.scenery === 'tunnel') {
      const at = a.shape === 'eight' ? 0.25 : a.shape === 'broken' ? 0.42 : 0.5;
      const p = curve.getPointAt(at), t = curve.getTangentAt(at);
      const hill = new THREE.Shape();
      hill.moveTo(-0.075, 0);
      hill.bezierCurveTo(-0.07, 0.07, -0.04, 0.105, 0, 0.105);
      hill.bezierCurveTo(0.04, 0.105, 0.07, 0.07, 0.075, 0);
      hill.closePath();
      const bore = new THREE.Path();
      bore.moveTo(-0.027, 0.0005);
      bore.lineTo(-0.027, 0.05);
      bore.absarc(0, 0.05, 0.027, Math.PI, 0, true);
      bore.lineTo(0.027, 0.0005);
      bore.closePath();
      hill.holes.push(bore);
      const mound = put(s.root, new THREE.Mesh(new THREE.ExtrudeGeometry(hill, { depth: 0.11, bevelEnabled: false, curveSegments: 14 }).translate(0, 0, -0.055), paint(mood.cheer > 0.4 ? '#5fa04a' : '#7d8a80')), [p.x, 0, p.z]);
      mound.rotation.y = yawAt(t);
      mound.scale.setScalar(K);
      const portal = put(s.root, new THREE.Group(), [p.x, 0, p.z]);
      portal.rotation.y = yawAt(t);
      portal.scale.setScalar(K);
      for (const end of [-1, 1]) put(portal, new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 6, 16, Math.PI), s.material('#b9b3a4')), [0, 0.05, end * 0.056]);
    }
    const trees = (a.scenery === 'forest' ? 3 : 0) + Math.round(mood.density * 3 + random() * 0.6);
    for (let i = 0; i < trees && nextSpot < spots.length; i++) { const [x, z] = spots[nextSpot++]; tree(x + jit(0.012), z + jit(0.012)); }

    const marker=put(s.root,new THREE.Group(),[a.shape==='eight'?.48:.34,0,.02]);
    cyl(marker,.014,.017,.004,[0,.002,0],wood,'y',12);
    if(a.marker==='mile'){
      box(marker,[.022,.038,.016],[0,.023,0],trim);
      const sign=s.label('1',.014,.022,[0,0,0],'#2a2a29',livery.trim);sign.position.set(0,.025,.0085);marker.add(sign);
    }else{
      cyl(marker,.0025,.0025,.065,[0,.036,0],dark,'y',8);
      if(a.marker==='crossing')for(const side of [-1,1]){const cross=box(marker,[.036,.006,.003],[0,.063,.002],trim);cross.rotation.z=side*.65;}
      if(a.marker==='flag')box(marker,[.029,.017,.002],[.014,.059,0],body);
      if(a.marker==='gate'){
        const hinge=put(marker,new THREE.Group(),[0,.043,0]);hinge.rotation.z=a.state==='running'?.15:1.1;
        box(hinge,[.068,.005,.004],[.028,0,0],trim);for(let i=0;i<5;i++)box(hinge,[.006,.0054,.0044],[.003+i*.012,0,0],body);
      }
    }
    const play=put(s.root,new THREE.Group(),[0,0,-.31]);
    if(a.playwork==='tickets'){
      box(play,[.064,.005,.036],[0,.0025,0],trim);
      for(let i=0;i<3;i++){const ticket=s.label('TICKET',.017,.027,[0,0,0],'#334252','#f1e6bf');ticket.rotation.x=-Math.PI/2;ticket.position.set((i-1)*.02,.0057,0);play.add(ticket);}
    }else if(a.playwork==='tools'){
      box(play,[.048,.004,.008],[0,.002,0],steel);const jaw=put(play,new THREE.Mesh(new THREE.TorusGeometry(.008,.002,6,16,Math.PI*1.45),steel),[-.029,.002,0]);jaw.rotation.x=-Math.PI/2;
      cyl(play,.003,.003,.034,[.018,.003,.022],steel,'z',10);cyl(play,.005,.005,.022,[.018,.005,.046],body,'z',12);
    }else if(a.playwork==='parcels')for(let i=0;i<2;i++){
      box(play,[.028,.022,.027],[(i-.5)*.036,.011,0],wood);box(play,[.003,.0224,.0274],[(i-.5)*.036,.011,0],trim);box(play,[.0284,.0224,.003],[(i-.5)*.036,.011,0],trim);
    }else{
      box(play,[.074,.001,.045],[0,.0005,0],trim);
      for(let i=0;i<4;i++)box(play,[.06,.0005,.002],[0,.0013,-.014+i*.009],paint(cargoColours[i]));
    }

    const speed = mix(0.08, 0.5, mood.energy) / length;
    const lead = a.state === 'uncoupled' ? start + (closed ? 0.32 : 0.3) : start;
    return s.finish({
      update: moving
        ? (_dt, time) => {
            const head = closed ? lead + time * speed : 0.56 + 0.34 * Math.sin(time * speed * 3 + 0.4);
            if (a.state === 'uncoupled') seat(engine, closed ? head : Math.max(head, start + 0.08));
            else cars.forEach((car, index) => seat(car, head - index * pitch));
          }
        : undefined,
    });
  },
});
