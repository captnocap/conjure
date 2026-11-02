import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const COLOURS = {
  pink: 'Candy pink, bubblegum bright, the postcard car.',
  turquoise: 'Turquoise like the shallow sea off the Malecon.',
  cherry: 'Deep cherry red, polished and proud.',
  lime: 'Loud lime green, impossible to miss.',
  canary: 'Canary yellow, sunny and cheerful.',
  lilac: 'Soft lilac purple, dreamy and a little faded.',
  tangerine: 'Tangerine orange, warm as the evening light.',
  royal: 'Royal blue, dignified and deep.',
} as const;
const PAINT: Record<keyof typeof COLOURS, string> = {
  pink: '#f0609a', turquoise: '#22b5b0', cherry: '#b81830', lime: '#8fd032', canary: '#f2c81e', lilac: '#a98ad6', tangerine: '#f07a22', royal: '#2348b0',
};

type P = readonly [number, number, number];

export default defineThing({
  questions: {
    colour: choice('What candy colour has it been repainted?', COLOURS),
    twoTone: noul('Is it two-tone, with a cream roof and a cream flash along the side?'),
    condition: choice('What state is the car in?', {
      taxi: 'A pristine tourist taxi: gleaming paint, full chrome, a TAXI sign on top.',
      daily: 'A patched daily driver: one door in grey primer, a hubcap missing, filler showing.',
      bodged: 'Kept alive with whatever fits: a wing from another car in another colour, wire holding the bumper.',
      stranded: 'Waiting for a part: one front wheel off, the axle propped on a stack of bricks.',
    }),
    bonnet: noul('Is the bonnet propped up, with the owner\'s rag left on the wing?'),
    roof: choice('What kind of roof does it have?', {
      hardtop: 'A steel hardtop with wraparound glass.',
      'top-down': 'A convertible with the top folded down, bench seats open to the sun.',
      'top-up': 'A convertible with its canvas top up and ribbed.',
    }),
    fins: score('How tall are the tail fins?', ['Modest ridges', 'Proper fins', 'Sky-high rocket fins']),
    extra: choice('What has been added to it?', {
      none: 'Nothing; the car is enough.',
      flag: 'A small Cuban flag flying from the aerial.',
      rack: 'A roof rack or back seat loaded with a suitcase and a spare tyre.',
      ribbons: 'White ribbons and a bow across the bonnet, dressed for a wedding or a quinceanera.',
    }),
    lights: noul('Are the headlights switched on?'),
    grille: choice('How is the radiator grille arranged?', {
      uprights: 'Closely spaced upright chrome teeth.',
      bars: 'Three broad horizontal chrome bars.',
      grid: 'A fine rectangular egg-crate grille.',
      spear: 'A single broad central spear with a round centre badge.',
    }),
    wheelTrim: choice('How are the tyres dressed?', {
      broad: 'Broad cream whitewall bands.',
      narrow: 'Narrow whitewall rings.',
      black: 'Plain black sidewalls.',
      twin: 'Two fine cream concentric sidewall lines.',
    }),
    mirrors: choice('Where are the exterior mirrors?', {
      single: 'One small round mirror beside the driver.',
      twin: 'Matching round mirrors on both front doors.',
      fender: 'Two mirrors stand forward on the wings.',
      none: 'The mirror stalks have been removed.',
    }),
    exhaust: choice('What exhaust pipes emerge below the rear bumper?', {
      single: 'One straight dark tailpipe with a chrome tip.',
      twin: 'Twin straight pipes spaced across the rear.',
      turned: 'Two short downward-turned tailpipes.',
      side: 'A pair of short side outlets behind the rear wheels.',
    }),
    rearGuard: choice('What is fitted to the rear bumper?', {
      plain: 'The original plain bumper.',
      overriders: 'Two tall chrome bumper overriders.',
      rail: 'A shallow luggage rail with an empty slatted deck.',
      spare: 'A covered continental spare tyre on a folding carrier.',
    }),
    parkingSurface: choice('What lies beneath the car?', {
      bare: 'The car stands on the scene ground.',
      tiles: 'A small apron of large square paving tiles.',
      gravel: 'A low oval patch of gravel.',
      marked: 'A concrete parking space with faded painted end marks.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pristine = a.condition === 'taxi';
    const paintColour = new THREE.Color(PAINT[a.colour]);
    paintColour.offsetHSL(0, mix(-0.25, 0.08, mood.cheer), 0);
    const paint = s.material(paintColour, { metalness: pristine ? 0.35 : 0.1, roughness: pristine ? 0.25 : mix(0.4, 0.85, mood.wear) });
    const cream = s.material('#efe6cc', { roughness: 0.4 });
    const chrome = s.material(mood.wear > 0.7 ? '#a9a59b' : '#e4e8ea', { metalness: 0.9, roughness: mix(0.15, 0.55, mood.wear) });
    const dark = s.material('#1c1d1f', { roughness: 0.8 });
    const glass = s.material('#42606b', { roughness: 0.15, metalness: 0.3 });
    const rubber = s.material('#191919', { roughness: 0.9 });
    const white = s.material('#eeeae0', { roughness: 0.7 });
    const rust = s.material('#7a4424', { roughness: 1 });
    const primer = s.material('#8d8f8c', { roughness: 0.95 });
    const seat = s.material(a.twoTone ? '#e8dfc8' : '#8c2f2a', { roughness: 0.7 });
    const canvasCloth = s.material(a.twoTone ? '#e6dcc2' : '#2a2a2c', { roughness: 0.95 });

    const side = (points: readonly (readonly [number, number])[], depth: number, x: number, material: THREE.Material, bevel = 0.04, arches: readonly number[] = []) => {
      const shape = new THREE.Shape();
      shape.moveTo(points[0][0], points[0][1]);
      for (const [z, y] of points.slice(1)) shape.lineTo(z, y);
      for (const centre of arches) { shape.lineTo(centre + 0.44, 0.36); shape.absarc(centre, 0.36, 0.44, 0, Math.PI, false); }
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: depth - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelOffset: -bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 14 });
      const mesh = s.mesh(geometry, material, [x + depth / 2 - bevel, 0, 0]);
      mesh.rotation.y = -Math.PI / 2;
      return mesh;
    };

    const W = 0.95;
    // Lower body: one long slab with wheel arches cut into its skirt.
    side([[-2.6, 0.36], [-2.7, 0.56], [-2.68, 0.88], [-1.25, 0.99], [0.78, 1.0], [2.2, 0.96], [2.62, 0.84], [2.68, 0.52], [2.56, 0.36]], W * 2, 0, paint, 0.07, [1.6, -1.55]);
    s.box([W * 2 - 0.2, 0.2, 4.4], [0, 0.34, 0], dark);

    // Tail fins.
    const finHeight = mix(0.07, 0.42, a.fins);
    for (const x of [-1, 1]) {
      side([[-0.5, 0.95], [-2.5, 0.99 + finHeight * 0.92], [-2.78, 0.99 + finHeight], [-2.74, 0.8], [-2.6, 0.7], [-0.5, 0.8]], 0.13, x * (W - 0.065), paint, 0.03);
      s.cylinder(0.055, 0.075, 0.07, [x * (W - 0.065), 0.9 + finHeight * 0.75, -2.77], s.material('#d21a1a', { emissive: '#d21a1a', emissiveIntensity: a.lights ? 0.9 : 0.15 }), 14).rotation.x = Math.PI / 2;
      s.cylinder(0.085, 0.085, 0.03, [x * (W - 0.065), 0.9 + finHeight * 0.75, -2.745], chrome, 14).rotation.x = Math.PI / 2;
    }

    // Cabin.
    const roofPaint = a.roof === 'top-up' ? canvasCloth : a.twoTone ? cream : paint;
    if (a.roof === 'top-down') {
      s.box([1.62, 0.04, 1.95], [0, 0.99, -0.28], dark);
      for (const z of [-0.02, -0.95]) {
        s.box([1.5, 0.42, 0.16], [0, 1.1, z], seat).rotation.x = -0.12;
        s.box([1.5, 0.1, 0.5], [0, 0.99, z + 0.3], seat);
      }
      const screen = new THREE.Group();
      screen.position.set(0, 1.0, 0.82);
      screen.rotation.x = -0.42;
      const pane = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.42, 0.02), glass);
      pane.position.y = 0.21;
      const header = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.04, 0.04), chrome);
      header.position.y = 0.43;
      screen.add(pane, header);
      for (const x of [-0.81, 0.81]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.44, 0.04), chrome); post.position.set(x, 0.22, 0); screen.add(post); }
      screen.traverse((node) => { node.castShadow = true; });
      s.root.add(screen);
      const wheel = s.ring(0.17, 0.016, [0.42, 1.14, 0.5], dark);
      wheel.rotation.x = -0.5;
      s.rod([0.42, 1.14, 0.5], [0.42, 1.02, 0.72], 0.02, dark);
      s.ball([0.82, 0.11, 0.2], [0, 1.06, -1.42], canvasCloth, 14);
    } else {
      side([[-1.32, 0.98], [-0.92, 1.5], [0.32, 1.5], [0.82, 0.99]], 1.6, 0, glass, 0.03);
      side([[-1.42, 0.98], [-0.98, 1.53], [-0.3, 1.58], [0.38, 1.53], [0.45, 1.47], [-0.3, 1.5], [-0.9, 1.46], [-1.0, 0.98]], 1.68, 0, roofPaint, 0.03);
      for (const x of [-0.82, 0.82]) {
        s.rod([x, 1.0, 0.82], [x, 1.5, 0.36], 0.03, a.roof === 'top-up' ? chrome : roofPaint);
        s.box([0.05, 0.5, 0.07], [x, 1.24, -0.28], roofPaint);
      }
      if (a.roof === 'top-up') for (const z of [-0.75, -0.3, 0.15]) s.box([1.7, 0.03, 0.04], [0, 1.57 - Math.abs(z + 0.3) * 0.09, z], dark);
    }

    // Chrome: bumpers, grille, lamps, side spears.
    for (const [z, y] of [[2.72, 0.46], [-2.74, 0.46]] as const) {
      const bumper = s.mesh(new THREE.CapsuleGeometry(0.075, 1.86, 6, 12), chrome, [0, y, z]);
      bumper.rotation.z = Math.PI / 2;
      if (a.condition === 'bodged' && z > 0) bumper.rotation.y = 0.07;
      for (const x of [-0.45, 0.45]) s.cylinder(0.02, 0.07, 0.2, [x, y + 0.02, z + Math.sign(z) * 0.1], chrome, 12).rotation.x = Math.sign(z) * Math.PI / 2;
    }
    s.box([1.34, 0.2, 0.06], [0, 0.66, 2.66], dark);
    if(a.grille==='uprights')for (let i = 0; i < 11; i++) s.box([0.035, 0.2, 0.05], [-0.6 + i * 0.12, 0.66, 2.7], chrome);
    else if(a.grille==='bars')for(const y of[.59,.66,.73])s.box([1.34,.025,.05],[0,y,2.7],chrome);
    else if(a.grille==='grid'){
      for(let i=0;i<15;i++)s.box([.012,.2,.05],[-.63+i*.09,.66,2.7],chrome);
      for(const y of[.585,.635,.685,.735])s.box([1.34,.012,.05],[0,y,2.7],chrome);
    }else{
      s.box([1.34,.055,.06],[0,.66,2.71],chrome);s.cylinder(.067,.067,.035,[0,.66,2.76],chrome,18).rotation.x=Math.PI/2;
    }
    s.box([1.44, 0.035, 0.07], [0, 0.78, 2.69], chrome);
    for (const x of [-0.72, 0.72]) {
      s.cylinder(0.125, 0.125, 0.1, [x, 0.8, 2.6], chrome, 18).rotation.x = Math.PI / 2;
      const lens = s.ball([0.105, 0.105, 0.05], [x, 0.8, 2.65], s.material('#fff3c8', { emissive: '#ffe9a0', emissiveIntensity: a.lights ? 1.6 : 0.08, roughness: 0.2 }), 14);
      lens.castShadow = false;
    }
    const spearMissing = mood.wear > 0.6 && !pristine ? (random() < 0.5 ? -1 : 1) : 0;
    for (const x of [-1, 1]) {
      if (x !== spearMissing) s.box([0.02, 0.035, 3.7], [x * (W + 0.008), 0.8, 0.25], chrome);
      if (a.twoTone) s.box([0.014, 0.17, 2.3], [x * (W + 0.004), 0.69, -1.0], cream);
      s.box([0.012, 0.52, 0.012], [x * (W + 0.003), 0.7, 0.72], dark);
      s.box([0.012, 0.52, 0.012], [x * (W + 0.003), 0.7, -0.32], dark);
      s.box([0.03, 0.025, 0.13], [x * (W + 0.015), 0.88, -0.2], chrome);
    }
    s.box([0.32, 0.15, 0.01], [0, 0.55, -2.79], s.material('#f1ead2'));
    s.label(`P ${100 + Math.floor(random() * 899)} ${100 + Math.floor(random() * 899)}`, 0.3, 0.13, [0, 0.55, -2.797], '#1b1b1b', pristine ? '#f6f1dc' : '#e0cf7e').rotation.y = Math.PI;

    // Wheels.
    const wheelAt = (x: number, z: number, hubcap: boolean, flat?: P) => {
      const group = new THREE.Group();
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.22, 24), rubber);
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(a.wheelTrim==='broad'?.285:.235, a.wheelTrim==='broad'?.285:.235, 0.23, 24), a.wheelTrim==='black'?rubber:white);
      if(a.wheelTrim==='narrow'||a.wheelTrim==='twin'){
        wall.material=rubber;
        for(const side of[-1,1])for(const radius of(a.wheelTrim==='twin'?[.27,.31]:[.29])){
          const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.008,6,24),white);ring.rotation.x=Math.PI/2;ring.position.y=side*.118;group.add(ring);
        }
      }
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 8), hubcap ? chrome : dark);
      hub.scale.set(1, 0.72, 1);
      group.add(tyre, wall, hub);
      group.traverse((node) => { node.castShadow = true; });
      if (flat) { group.position.set(...flat); group.rotation.set(0.12, 0, 1.25); }
      else { group.position.set(x, 0.36, z); group.rotation.z = Math.PI / 2; }
      s.root.add(group);
      if(flat){group.updateMatrixWorld(true);group.position.y-=new THREE.Box3().setFromObject(group,true).min.y;}
    };
    const offSide = random() < 0.5 ? -1 : 1;
    for (const x of [-1, 1]) for (const z of [1.6, -1.55]) {
      if (a.condition === 'stranded' && x === offSide && z > 0) {
        for (let i = 0; i < 4; i++) s.box([0.22, 0.06, 0.11], [x * 0.78 + (random() - 0.5) * 0.03, 0.03 + i * 0.06, z + (i % 2 ? 0.04 : -0.04)], s.material('#a5553a'), ).rotation.y = i % 2 ? Math.PI / 2 : 0;
        s.cylinder(0.12, 0.12, 0.1, [x * 0.84, 0.36, z], dark, 12).rotation.z = Math.PI / 2;
        wheelAt(0, 0, true, [x * 1.22, 0.33, z - 0.55]);
      } else wheelAt(x * 0.82, z, !(a.condition === 'daily' && x === offSide && z < 0) && !(mood.wear > 0.8 && !pristine && z > 0 && x !== offSide));
    }

    if(a.mirrors!=='none')for(const side of(a.mirrors==='single'?[1]:[-1,1])){
      const z=a.mirrors==='fender'?1.75:.63,x=side*(W+.015),y=a.mirrors==='fender'?.97:1.03;
      s.rod([x,y,z],[x+side*.16,y+.2,z-.04],.012,chrome);
      const mirror=s.cylinder(.073,.073,.018,[x+side*.16,y+.22,z-.04],chrome,18);mirror.rotation.x=Math.PI/2;
      s.cylinder(.063,.063,.003,[x+side*.16,y+.22,z-.052],glass,18).rotation.x=Math.PI/2;
    }
    for(const x of(a.exhaust==='single'?[.57]:[-.57,.57])){
      if(a.exhaust==='side')s.tube([[x,.26,-1.5],[x,.26,-1.94],[Math.sign(x)*1.03,.26,-1.94]],.035,chrome);
      else if(a.exhaust==='turned')s.tube([[x,.26,-2.36],[x,.26,-2.74],[x,.17,-2.81]],.035,chrome);
      else s.rod([x,.26,-2.34],[x,.26,-2.9],.035,chrome);
      s.rod([x,.26,-2.35],[x,.34,-2.35],.014,dark);
    }
    if(a.rearGuard==='overriders')for(const x of[-.6,.6])s.box([.11,.36,.13],[x,.57,-2.83],chrome);
    else if(a.rearGuard==='rail'){
      for(let i=0;i<7;i++)s.rod([-.63+i*.21,.47,-2.72],[-.63+i*.21,.47,-3.15],.018,chrome);
      s.rod([-.65,.47,-3.15],[.65,.47,-3.15],.02,chrome);
      for(const x of[-.65,.65]){s.rod([x,.47,-3.15],[x,.65,-3.15],.016,chrome);s.rod([x,.65,-3.15],[x,.65,-2.73],.016,chrome);}
      s.rod([-.65,.65,-3.15],[.65,.65,-3.15],.018,chrome);
    }else if(a.rearGuard==='spare'){
      for(const x of[-.27,.27])s.rod([x,.46,-2.74],[x,.46,-3.03],.025,chrome);
      s.box([.63,.045,.29],[0,.46,-3],chrome);
      s.cylinder(.32,.32,.19,[0,.8,-3.01],paint,28).rotation.x=Math.PI/2;
      s.ring(.32,.012,[0,.8,-3.11],chrome);s.ball([.065,.065,.02],[0,.8,-3.12],chrome,12);
    }

    // Bonnet.
    if (a.bonnet) {
      s.box([1.5, 0.03, 1.35], [0, 0.985, 1.5], dark);
      s.box([0.5, 0.2, 0.72], [0, 1.03, 1.45], s.material(mood.cheer > 0.5 ? '#d4662a' : '#2d5a86', { roughness: 0.6 }));
      s.cylinder(0.19, 0.19, 0.09, [0, 1.17, 1.4], chrome, 18);
      s.box([1.2, 0.16, 0.08], [0, 1.02, 2.15], dark);
      s.box([0.22, 0.14, 0.16], [-0.52, 1.03, 1.1], s.material('#22262a'));
      s.tube([[0.2, 1.1, 1.6], [0.45, 1.12, 1.8], [0.4, 1.05, 2.1]], 0.02, rubber);
      const hood = new THREE.Group();
      hood.position.set(0, 1.0, 0.84);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.035, 1.42), paint);
      panel.position.z = 0.71;
      panel.castShadow = true;
      hood.add(panel);
      hood.rotation.x = -mix(0.8, 1.05, random());
      s.root.add(hood);
      s.rod([-0.7, 1.0, 2.1], [-0.7, 1.0 + Math.sin(-hood.rotation.x) * 1.0, 0.84 + Math.cos(hood.rotation.x) * 1.0], 0.012, chrome);
      const rag = s.material(mood.cheer > 0.4 ? '#c8372f' : '#7d7f6e', { roughness: 1 });
      s.box([0.3, 0.02, 0.24], [0.78, 1.0, 1.95], rag).rotation.y = random() * 0.8;
      s.box([0.02, 0.2, 0.2], [0.965, 0.9, 1.98], rag).rotation.x = 0.1;
    } else {
      s.box([0.03, 0.02, 1.5], [0, 1.0, 1.55], chrome).rotation.x = 0.028;
      s.cylinder(0.006, 0.03, 0.2, [0, 1.0, 2.3], chrome, 10).rotation.x = Math.PI / 2 - 0.2;
    }

    // Condition details.
    const sideX = offSide * (W + 0.006);
    if (pristine) {
      const y = a.roof === 'top-down' ? 1.46 : 1.68, z = a.roof === 'top-down' ? 0.63 : -0.2;
      s.box([0.5, 0.17, 0.14], [0, y, z], s.material('#f6c21a', { emissive: '#f6c21a', emissiveIntensity: mix(0.1, 0.6, mood.daylight) }));
      s.label('TAXI', 0.46, 0.14, [0, y, z + 0.072], '#161616', '#f6c21a');
    }
    if (a.condition === 'daily') s.box([0.012, 0.5, 1.0], [sideX, 0.7, 0.2], primer);
    if (a.condition === 'bodged') {
      const donor = s.material(new THREE.Color(PAINT[a.colour]).offsetHSL(0.42, -0.1, 0.05), { roughness: 0.8 });
      s.box([0.012, 0.44, 0.95], [sideX, 0.74, 2.0 - 0.3], donor);
      s.box([0.5, 0.012, 0.9], [offSide * 0.66, 1.0, 1.75], donor).rotation.x = 0.028;
      s.box([0.012, 0.5, 1.0], [-sideX, 0.7, -0.85], primer);
    }
    const blotches = Math.floor(mood.wear * 12) + 3;
    for (let i = 0; i < (pristine ? Math.floor(mood.wear * 4) : blotches); i++) {
      const x = random() < 0.5 ? -1 : 1, z = mix(-2.4, 2.3, random());
      s.box([0.012, 0.05 + random() * 0.14, 0.08 + random() * 0.25], [x * (W + 0.004), 0.44 + random() * 0.22, z], random() < 0.6 ? rust : primer);
    }

    // Aerial and extras.
    const aerial = new THREE.Group();
    aerial.position.set(-0.78, 1.0, 1.0);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.008, 0.9, 6), chrome);
    mast.position.y = 0.45;
    aerial.add(mast);
    if (a.extra === 'flag') {
      const blue = new THREE.MeshStandardMaterial({ color: '#1f3c94', side: THREE.DoubleSide }), pale = new THREE.MeshStandardMaterial({ color: '#f4f1e8', side: THREE.DoubleSide }), red = new THREE.MeshStandardMaterial({ color: '#cf2027', side: THREE.DoubleSide });
      for (let i = 0; i < 5; i++) { const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.044, 0.36), i % 2 ? pale : blue); stripe.position.set(0, 0.86 - i * 0.044, -0.18); aerial.add(stripe); }
      const triangle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 3), red);
      triangle.rotation.set(0, 0, Math.PI / 2);
      triangle.rotation.x = Math.PI;
      triangle.position.set(0, 0.772, -0.062);
      triangle.scale.set(1, 1, 0.82);
      aerial.add(triangle);
    }
    aerial.traverse((node) => { node.castShadow = true; });
    aerial.rotation.x = -0.18;
    s.root.add(aerial);
    if (a.extra === 'rack') {
      const down = a.roof === 'top-down';
      const y = down ? 1.22 : 1.62, z = down ? -1.0 : -0.3;
      if (!down) {
        for (const x of [-0.7, 0.7]) s.rod([x, y, z - 0.6], [x, y, z + 0.6], 0.015, chrome);
        for (const dz of [-0.55, 0, 0.55]) s.rod([-0.7, y, z + dz], [0.7, y, z + dz], 0.015, chrome);
        for (const x of [-0.7, 0.7]) for (const dz of [-0.55, 0.55]) s.rod([x, y - 0.1, z + dz], [x, y, z + dz], 0.012, chrome);
      }
      const loadY = down ? 1.04 : y + 0.015, caseZ = down ? -0.65 : z + 0.2;
      const suitcase = new THREE.Group(); suitcase.name = 'sedan-suitcase';
      suitcase.add(s.box([0.7, 0.24, 0.46], [-0.3, loadY + 0.12, caseZ], s.material('#7b4a2b')));
      suitcase.add(s.box([0.72, 0.03, 0.05], [-0.3, loadY + 0.12, caseZ], s.material('#3a2415')));
      s.root.add(suitcase);
      const spare = s.ring(0.27, 0.09, [0.38, loadY + (down ? 0.36 : 0.09), down ? -0.65 : z - 0.22], rubber);
      spare.name = 'sedan-spare-on-rack-or-seat';
      if (!down) spare.rotation.x = Math.PI / 2;
      s.box([0.4, 0.2, 0.3], [0.3, loadY + 0.1, down ? 0.28 : z + 0.38], s.material('#3f6f8a')).name = 'sedan-travel-bag';
    }
    if (a.extra === 'ribbons') {
      const ribbon = s.material('#fbf7ef', { roughness: 0.6 });
      const top: P = a.bonnet ? [0, 0.82, 2.72] : [0, 1.0, 2.3];
      for (const x of [-0.82, 0.82]) s.rod(top, [x, a.roof === 'top-down' ? 1.38 : 1.5, a.roof === 'top-down' ? 0.66 : 0.36], 0.018, ribbon);
      for (const x of [-1, 1]) s.ball([0.13, 0.08, 0.04], [top[0] + x * 0.12, top[1] + 0.06, top[2] + 0.03], ribbon, 10).rotation.z = x * 0.4;
      s.ball([0.05, 0.05, 0.05], [top[0], top[1] + 0.06, top[2] + 0.04], s.material('#f1a7c2'), 10);
      for (let i = 0; i < 5; i++) s.ball([0.07, 0.07, 0.07], [(random() - 0.5) * 1.2, 0.93, -2.55 - random() * 0.05], s.material(random() < 0.5 ? '#fbf7ef' : '#f1a7c2'), 10);
    }

    if(a.parkingSurface!=='bare'){
      const vehicle=new THREE.Group();for(const child of[...s.root.children])vehicle.add(child);s.root.add(vehicle);vehicle.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(vehicle,true),centre=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),h=.035;vehicle.position.y+=h;
      const paving=s.material('#a6a296');
      if(a.parkingSurface==='gravel'){
        const patch=s.cylinder(1,1,h,[centre.x,h/2,centre.z],paving,48);patch.scale.set(size.x*.65+.12,1,size.z*.65+.12);
        for(let i=0;i<36;i++){const t=i*Math.PI/18,x=centre.x+Math.cos(t)*(size.x*.64+.1),z=centre.z+Math.sin(t)*(size.z*.64+.1);s.ball([.06,.025,.045],[x,h,z],i%2?paving:dark,6);}
      }else{
        s.box([size.x+.28,h,size.z+.28],[centre.x,h/2,centre.z],paving);
        if(a.parkingSurface==='tiles'){
          const cols=Math.ceil((size.x+.2)/.55),rows=Math.ceil((size.z+.2)/.55),w=(size.x+.2)/cols,d=(size.z+.2)/rows;
          for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)s.box([w-.008,.012,d-.008],[centre.x-(size.x+.2)/2+(i+.5)*w,h+.006,centre.z-(size.z+.2)/2+(j+.5)*d],(i+j)%3?paving:cream);vehicle.position.y+=.012;
        }else for(const side of[-1,1])s.box([size.x+.08,.002,.045],[centre.x,h+.001,centre.z+side*(size.z/2+.08)],white);
      }
    }
    const sway = mix(0.01, 0.09, mood.energy), phase = random() * 6;
    return s.finish({ update: (_dt, time) => { aerial.rotation.z = Math.sin(time * 3.1 + phase) * sway; aerial.rotation.x = -0.18 + Math.sin(time * 2.3 + phase) * sway * 0.6; } });
  },
});
