import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = readonly [number, number, number];
const FINISH = {
  mahogany: 'Dark red mahogany, polished by generations of hands.',
  honey: 'Honey-coloured varnish gone a little sticky in the heat.',
  white: 'White gloss paint, chipped at every edge.',
  turquoise: 'Turquoise house paint left over from the shutters.',
  bleached: 'Bare wood bleached silver-grey by the sun.',
} as const;
const TONE: Record<keyof typeof FINISH, string> = { mahogany: '#5a2318', honey: '#b9782e', white: '#efece2', turquoise: '#2fa9a4', bleached: '#a39c8e' };

export default defineThing({
  questions: {
    finish: choice('What is the wood finished with?', FINISH),
    back: choice('What is the back like?', {
      arched: 'A tall cane panel under an arched, carved crest rail.',
      medallion: 'An oval cane medallion held in an open frame, a little grand.',
      slats: 'Plain vertical slats, a country chair with only the seat caned.',
    }),
    motion: choice('Is anyone or anything moving it?', {
      rocking: 'Empty but still rocking hard: somebody got up a moment ago.',
      breeze: 'Barely nodding in the breeze.',
      settled: 'Completely still, settled for the night.',
    }),
    rests: choice('What rests on it?', {
      nothing: 'Nothing.',
      fan: 'An open paper fan left on the seat.',
      newspaper: 'A folded newspaper and a pair of reading glasses.',
      cat: 'A cat curled asleep in the seat.',
      shawl: 'A crocheted shawl thrown over the back.',
      knitting: 'A ball of wool and two needles stuck through it.',
    }),
    beside: choice('What is beside it?', {
      nothing: 'Nothing; the chair alone.',
      doorway: 'A slice of pastel wall with a louvred door standing half open.',
      twin: 'Its twin: the pair set at an angle to talk across.',
      table: 'A little side table with a coffee cup and a radio.',
      plant: 'A palm growing in an old oil tin.',
    }),
    floor: choice('What does it stand on?', {
      none: 'Whatever is already there.',
      tiles: 'A patch of patterned cement tiles in faded geometric colours.',
      boards: 'A few worn porch boards.',
    }),
    seatWidth: score('How broad is the chair?', ['Narrow chair for a small porch', 'An ordinary adult rocker', 'A broad comfortable armchair']),
    backLean: score('How far does the back recline?', ['Nearly upright for conversation', 'A relaxed porch angle', 'Deeply reclined for a nap']),
    arms: choice('What shape are the armrests?', {
      scroll: 'Slender curved rails end in small wooden scrolls.',
      flat: 'Broad flat timber pads support the forearms.',
      turned: 'Rounded armrails have turned collars on their front posts.',
      open: 'Low simple rails with no curled ends.',
    }),
    weave: choice('What pattern is woven into the cane?', {
      holes: 'A traditional open diagonal weave with small round holes.',
      basket: 'Broad crossing strips form square basket-weave openings.',
      herringbone: 'Close diagonal strips make a fine herringbone chevron.',
      bands: 'Alternating light and dark cane forms bold striped bands.',
    }),
    cushion: choice('What pad lies over the cane seat?', {
      none: 'The cane is bare.',
      thin: 'A thin square faded cushion.',
      thick: 'A plump buttoned cushion fills the seat.',
      tied: 'A narrow cushion is tied to both rear posts.',
    }),
    footrest: choice('What is provided for resting the feet?', {
      none: 'No footrest.',
      stool: 'A small separate slatted footstool stands in front.',
      upholstered: 'A low padded footrest stands on four turned legs.',
      folding: 'A light canvas footrest opens on crossed legs.',
    }),
    stretcher: choice('How are the lower legs braced?', {
      plain: 'A plain front cross-stretcher.',
      turned: 'Three turned wooden collars decorate the front stretcher.',
      crossed: 'Two diagonal braces cross beneath the seat.',
      shelf: 'A small slatted magazine shelf spans the lower braces.',
    }),
    crestDetail: choice('What ornament finishes the back frame?', {
      plain: 'Plain polished wood.',
      rosette: 'A carved circular rosette is fixed to the top rail.',
      finials: 'Small turned finials crown the two back posts.',
      inlay: 'A short pale inlay follows the upper rail.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const painted = a.finish === 'white' || a.finish === 'turquoise';

    // Woven cane, painted once and shared.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = mood.wear > 0.6 ? '#b99a62' : '#d8b874'; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(120,84,36,0.55)'; ctx.lineWidth = 2;
    for (let i = -16; i < 32; i++) { ctx.beginPath(); ctx.moveTo(i * 16, 0); ctx.lineTo(i * 16 + 256, 256); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * 16, 256); ctx.lineTo(i * 16 + 256, 0); ctx.stroke(); }
    ctx.fillStyle = '#3a2a18';
    for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) { ctx.beginPath(); ctx.arc(x * 16 + 8, y * 16 + 8, 4.2, 0, 6.3); ctx.fill(); }
    if (a.weave !== 'holes') {
      ctx.fillStyle = '#c8a56c'; ctx.fillRect(0, 0, 256, 256);
      if (a.weave === 'basket') {
        for(let x=0;x<16;x++)for(let y=0;y<16;y++){
          ctx.fillStyle=(x+y)%2?'#a6814c':'#dfc38c';ctx.fillRect(x*16,y*16,15,15);
          ctx.fillStyle='#544027';ctx.fillRect(x*16+5,y*16+5,6,6);
        }
      } else if (a.weave === 'herringbone') {
        ctx.lineWidth=5;ctx.strokeStyle='#88683d';
        for(let y=-32;y<288;y+=12)for(let x=0;x<256;x+=32){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+16,y+12);ctx.lineTo(x+32,y);ctx.stroke();}
      } else for(let x=0;x<256;x+=24){ctx.fillStyle=x%48?'#7e603a':'#e0c491';ctx.fillRect(x,0,12,256);ctx.fillStyle='rgba(85,63,34,.45)';for(let y=0;y<256;y+=20)ctx.fillRect(0,y,256,3);}
    }
    const weave = new THREE.CanvasTexture(canvas);
    weave.colorSpace = THREE.SRGBColorSpace; weave.wrapS = weave.wrapT = THREE.RepeatWrapping; weave.repeat.set(1.6, 1.6);
    const cane = new THREE.MeshStandardMaterial({ map: weave, roughness: 0.8, side: THREE.DoubleSide });

    const RR = 1.15, SEAT = 0.42;
    const makeChair = () => {
      const c = new Sculpture(context);
      const rockers: THREE.Mesh[] = [];
      const backAngle=-mix(0.08,0.4,a.backLean);
      const tone = new THREE.Color(TONE[a.finish]);
      const wood = c.material(tone, { roughness: painted ? 0.45 : a.finish === 'bleached' ? 0.95 : 0.35 });
      const bare = c.material('#9a7a52', { roughness: 0.9 });
      // Rockers.
      for (const x of [-0.26, 0.26]) {
        const points: P[] = [];
        for (let i = 0; i <= 10; i++) { const phi = mix(-0.5, 0.42, i / 10); points.push([x, RR * (1 - Math.cos(phi)) + 0.02, RR * Math.sin(phi)]); }
        const rocker = c.tube(points, 0.022, wood);
        rocker.name='chair-rocker';
        rockers.push(rocker);
        rocker.scale.y = 1;
        // Legs: front post up to the arm, back post up to the seat.
        const at = (z: number) => RR - Math.sqrt(RR * RR - z * z) + 0.02;
        c.rod([x, at(0.24), 0.24], [x, 0.66, 0.25], 0.022, wood, 0.018);
        c.rod([x, at(-0.2), -0.2], [x, SEAT, -0.22], 0.022, wood);
        c.ball([0.03, 0.03, 0.03], [x, 0.3, 0.245], wood, 10);
        c.rod([x, 0.2, 0.24], [x, 0.18, -0.2], 0.012, wood);
        // Arm with a scrolled end.
        const rearZ=-.22+Math.sin(backAngle)*.26,rearY=SEAT+Math.cos(backAngle)*.26;
        if(a.arms==='flat')c.box([0.095,0.035,.31-rearZ],[x,0.6775,(.31+rearZ)/2],wood);
        else if(a.arms==='open')c.rod([x,rearY,rearZ],[x,0.66,0.29],0.02,wood);
        else {
          c.tube([[x * 0.96, rearY, rearZ], [x * 1.08, 0.7, 0], [x * 1.1, 0.67, 0.26], [x * 1.1, 0.63, 0.31]], 0.022, wood);
          c.ball([0.034, 0.034, 0.034], [x * 1.1, 0.63, 0.31], wood, 10);
          if(a.arms==='turned')for(const y of[0.49,0.54,0.59])c.cylinder(0.033,0.033,0.035,[x,y,0.25],wood,10);
        }
      }
      c.rod([-0.26, 0.24, 0.24], [0.26, 0.24, 0.24], 0.014, wood);
      c.ball([0.026, 0.026, 0.026], [0, 0.24, 0.24], wood, 10);
      if(a.stretcher==='turned')for(const x of[-0.16,0,0.16]){const collar=c.cylinder(0.034,0.034,0.05,[x,0.24,0.24],wood,10);collar.rotation.z=Math.PI/2;}
      else if(a.stretcher==='crossed'){c.rod([-0.25,0.2,-0.2],[0.25,0.35,0.23],0.014,wood);c.rod([0.25,0.2,-0.2],[-0.25,0.35,0.23],0.014,wood);}
      else if(a.stretcher==='shelf')for(let i=0;i<5;i++){const shelf=c.box([0.5,0.012,0.065],[0,0.196+i*0.003, -0.14+i*0.075],wood);shelf.rotation.x=-0.045;}
      // Seat frame and cane.
      for (const z of [-0.22, 0.25]) c.box([0.56, 0.04, 0.05], [0, SEAT, z], wood);
      for (const x of [-0.26, 0.26]) c.box([0.05, 0.04, 0.5], [x, SEAT, 0.015], wood);
      const seat = c.mesh(new THREE.PlaneGeometry(0.48, 0.44), cane, [0, SEAT + 0.012, 0.015]);
      seat.rotation.x = -Math.PI / 2;
      if (mood.wear > 0.55) {
        const hx = (random() - 0.5) * 0.2, hz = (random() - 0.5) * 0.15;
        c.cylinder(0.07 + mood.wear * 0.05, 0.07, 0.004, [hx, SEAT + 0.014, hz], c.material('#1c140c'), 9).scale.z = 0.7;
        for (let i = 0; i < 6; i++) c.rod([hx + Math.cos(i) * 0.07, SEAT + 0.015, hz + Math.sin(i) * 0.05], [hx + Math.cos(i) * 0.12, SEAT - 0.03 - random() * 0.05, hz + Math.sin(i) * 0.09], 0.003, bare);
      }
      if (painted) for (let i = 0; i < 4 + mood.wear * 10; i++) c.box([0.052, 0.012 + random() * 0.03, 0.03 + random() * 0.06], [random() < 0.5 ? -0.26 : 0.26, SEAT + (random() - 0.5) * 0.02, (random() - 0.5) * 0.4], bare);
      // Back, leaning.
      const back = new Sculpture(context);
      back.root.position.set(0, SEAT, -0.22);
      back.root.rotation.x = backAngle;
      for (const x of [-0.25, 0.25]) back.rod([x, 0, 0], [x * 0.96, 0.72, 0], 0.022, wood, 0.017);
      back.box([0.5, 0.04, 0.03], [0, 0.12, 0], wood);
      if (a.back === 'arched') {
        back.tube([[-0.25, 0.7, 0], [-0.13, 0.78, 0], [0, 0.81, 0], [0.13, 0.78, 0], [0.25, 0.7, 0]], 0.026, wood);
        back.ball([0.05, 0.035, 0.03], [0, 0.83, 0], wood, 10);
        back.mesh(new THREE.PlaneGeometry(0.46, 0.6), cane, [0, 0.44, 0]);
        for (const x of [-0.25, 0.25]) back.ball([0.03, 0.04, 0.03], [x * 0.96, 0.74, 0], wood, 10);
      } else if (a.back === 'medallion') {
        back.tube([[-0.25, 0.7, 0], [0, 0.74, 0], [0.25, 0.7, 0]], 0.024, wood);
        const oval = back.mesh(new THREE.CircleGeometry(1, 28), cane, [0, 0.42, 0]);
        oval.scale.set(0.16, 0.24, 1);
        const hoop = back.mesh(new THREE.TorusGeometry(1, 0.09, 8, 36), wood, [0, 0.42, 0]);
        hoop.scale.set(0.17, 0.25, 0.2);
        back.rod([0, 0.67, 0], [0, 0.72, 0], 0.016, wood); back.rod([0, 0.12, 0], [0, 0.17, 0], 0.016, wood);
        for (const x of [-1, 1]) { back.rod([x * 0.17, 0.42, 0], [x * 0.245, 0.42, 0], 0.014, wood); back.ball([0.03, 0.04, 0.03], [x * 0.24, 0.74, 0], wood, 10); }
      } else {
        back.box([0.52, 0.07, 0.03], [0, 0.71, 0], wood);
        const missing = mood.wear > 0.7 ? Math.floor(random() * 5) : -1;
        for (let i = 0; i < 5; i++) if (i !== missing) back.box([0.045, 0.56, 0.016], [-0.18 + i * 0.09, 0.41, 0], wood);
      }
      const crestY=a.back==='arched'?.81:a.back==='medallion'?.74:.745;
      if(a.crestDetail==='rosette'){
        const medallion=back.cylinder(0.055,0.055,0.018,[0,crestY,0.027],wood,12);medallion.rotation.x=Math.PI/2;
        for(let i=0;i<6;i++){const t=i*Math.PI/3;back.ball([0.012,0.012,0.006],[Math.cos(t)*.033,crestY+Math.sin(t)*.033,0.04],bare,6);}
      }else if(a.crestDetail==='finials')for(const side of[-1,1]){back.cylinder(0.018,0.021,0.07,[side*.24,.78,0],wood,8);back.ball([0.031,.04,.031],[side*.24,.83,0],wood,10);}
      else if(a.crestDetail==='inlay')back.tube([[-.18,crestY-.025,.027],[0,crestY+.003,.028],[.18,crestY-.025,.027]],.006,c.material('#d6c29a'));
      c.root.add(back.root);

      // What rests on it.
      const cushionHeight=a.cushion==='none'?0:a.cushion==='thick'?.065:.025;
      if(cushionHeight){
        const cloth=c.material(a.cushion==='thick'?'#89916b':a.cushion==='thin'?'#b89178':'#809497');
        c.box([.46,cushionHeight,.42],[0,SEAT+.02+cushionHeight/2,.015],cloth);
        if(a.cushion==='thick')for(const x of[-.12,.12])for(const z of[-.1,.1])c.cylinder(.009,.009,.002,[x,SEAT+.02+cushionHeight+.001,z],wood,8);
        if(a.cushion==='tied')for(const side of[-1,1])c.tube([[side*.21,SEAT+.025,-.19],[side*.28,SEAT+.025,-.24],[side*.25,SEAT-.04,-.25]],.005,cloth);
      }
      const top = SEAT + 0.02 + cushionHeight;
      if (a.rests === 'fan') {
        const fan = c.mesh(new THREE.CircleGeometry(0.2, 16, 0.25, Math.PI - 0.5), new THREE.MeshStandardMaterial({ color: pick(['#c8372f', '#e9d9a8', '#2f5a8a', '#1f1f1f']), side: THREE.DoubleSide, roughness: 0.8 }), [(random() - 0.5) * 0.1, top + 0.001, 0.05]);
        fan.rotation.set(-Math.PI / 2, 0, random() * 3);
        const ribs = c.mesh(new THREE.CircleGeometry(0.09, 16, 0.25, Math.PI - 0.5), new THREE.MeshStandardMaterial({ color: '#d9c08a', side: THREE.DoubleSide }), [fan.position.x, top + 0.002, 0.05]);
        ribs.rotation.copy(fan.rotation);
      } else if (a.rests === 'newspaper') {
        const paper = c.box([0.3, 0.02, 0.22], [0.02, top + 0.012, 0.03], c.material('#e6e0cf'));
        paper.rotation.y = (random() - 0.5) * 0.7;
        const head = c.label('DIARIO', 0.26, 0.05, [0.02, top + 0.024, -0.03], '#8a1f1a', '#e6e0cf');
        head.rotation.set(-Math.PI / 2, 0, paper.rotation.y);
        for (const x of [-0.035, 0.035]) c.mesh(new THREE.TorusGeometry(0.026, 0.004, 6, 14), c.material('#2a2a2a'), [0.05 + x, top + 0.03, 0.09]).rotation.x = -Math.PI / 2;
      } else if (a.rests === 'cat') {
        const fur = c.material(pick(['#d98a3a', '#2a2622', '#e9e4d8', '#8c8377', '#b89a6a']), { roughness: 1 });
        c.ball([0.17, 0.085, 0.14], [0, top + 0.08, 0.02], fur, 14);
        c.ball([0.065, 0.058, 0.062], [0.12, top + 0.08, 0.1], fur, 12);
        for (const k of [-1, 1]) c.mesh(new THREE.ConeGeometry(0.022, 0.04, 4), fur, [0.12 + k * 0.035, top + 0.14, 0.1]);
        c.tube([[-0.15, top + 0.04, 0], [-0.13, top + 0.04, 0.14], [0, top + 0.035, 0.17], [0.08, top + 0.035, 0.15]], 0.018, fur);
      } else if (a.rests === 'shawl') {
        const yarn = c.material(pick(['#c8372f', '#e9e4d8', '#7a4fa8', '#e0a81c', '#2f8f8a']), { roughness: 1 });
        const drape = new Sculpture(context);
        drape.root.position.set(0, SEAT, -0.22); drape.root.rotation.x = backAngle;
        const peak = a.back === 'arched' ? 0.82 : 0.75;
        drape.box([0.42, 0.42, 0.012], [0.03, peak - 0.2, 0.03], yarn).rotation.z = 0.06;
        drape.box([0.42, 0.3, 0.012], [0.03, peak - 0.14, -0.035], yarn).rotation.z = 0.06;
        drape.box([0.43, 0.03, 0.08], [0.03, peak + 0.01, 0], yarn).rotation.z = 0.06;
        for (let i = 0; i < 9; i++) drape.rod([-0.17 + i * 0.05, peak - 0.41, 0.03], [-0.17 + i * 0.05, peak - 0.47, 0.035], 0.005, yarn);
        c.root.add(drape.root);
      } else if (a.rests === 'knitting') {
        const yarn = c.material(pick(['#c8372f', '#3f7fbf', '#e0a81c', '#d96a9a']), { roughness: 1 });
        c.ball([0.07, 0.07, 0.07], [-0.05, top + 0.07, 0.02], yarn, 12);
        for (const k of [-1, 1]) c.rod([-0.05 - k * 0.1, top + 0.02, 0.1], [-0.05 + k * 0.12, top + 0.15, -0.06], 0.004, c.material('#c9cdd0', { metalness: 0.8 }));
        c.box([0.18, 0.012, 0.14], [0.1, top + 0.01, 0.08], yarn).rotation.y = 0.3;
        c.tube([[-0.02, top + 0.02, 0.06], [0.03, top + 0.012, 0.1], [0.08, top + 0.014, 0.06]], 0.004, yarn);
      }
      c.root.scale.x=mix(.85,1.25,a.seatWidth);
      return {root:c.root,rockers};
    };

    // Ground patch.
    let lift = 0;
    const wideFloor=['twin','table','plant'].includes(a.beside);
    if (a.floor === 'tiles') {
      lift = 0.03;
      const tile = document.createElement('canvas');
      tile.width = tile.height = 512;
      const t = tile.getContext('2d')!;
      const palette = pick([['#e6dcc0', '#b5533a', '#2f4a5a'], ['#e9e2cf', '#3f7a6a', '#d9a83a'], ['#d9cdb4', '#7a8fa8', '#8a3a2a']]);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const x = i * 128, y = j * 128;
        t.fillStyle = palette[0]; t.fillRect(x, y, 128, 128);
        t.fillStyle = palette[1]; t.beginPath(); t.moveTo(x + 64, y + 6); t.lineTo(x + 122, y + 64); t.lineTo(x + 64, y + 122); t.lineTo(x + 6, y + 64); t.fill();
        t.fillStyle = palette[2]; t.beginPath(); t.arc(x + 64, y + 64, 26, 0, 6.3); t.fill();
        for (const [cx, cy] of [[0, 0], [128, 0], [0, 128], [128, 128]]) { t.beginPath(); t.arc(x + cx, y + cy, 22, 0, 6.3); t.fill(); }
        t.strokeStyle = 'rgba(60,50,40,0.5)'; t.lineWidth = 2; t.strokeRect(x, y, 128, 128);
        if (random() < mood.wear * 0.5) { t.fillStyle = 'rgba(150,145,135,0.75)'; t.fillRect(x + 2, y + 2, 124, 124); }
      }
      const map = new THREE.CanvasTexture(tile); map.colorSpace = THREE.SRGBColorSpace;
      s.box([wideFloor?2.2:1.6, 0.03, 1.6], [0, 0.015, 0], [s.material('#b9b0a0'), s.material('#b9b0a0'), new THREE.MeshStandardMaterial({ map, roughness: 0.7 }), s.material('#b9b0a0'), s.material('#b9b0a0'), s.material('#b9b0a0')] as unknown as THREE.Material).name='chair-floor';
    } else if (a.floor === 'boards') {
      lift = 0.035;
      const count=wideFloor?13:9;
      for (let i = 0; i < count; i++) s.box([0.17, 0.035, 1.5 + random() * 0.12], [(i-(count-1)/2) * 0.18, 0.0175, (random() - 0.5) * 0.06], s.material(new THREE.Color('#9a8468').offsetHSL(0, 0, (random() - 0.5) * 0.08), { roughness: 1 }));
    }

    const chairs: { root: THREE.Group; rockers: THREE.Mesh[]; x: number; z: number; phase: number; gain: number }[] = [];
    const place = (x: number, z: number, yaw: number, gain: number) => {
      const holder = new THREE.Group();
      holder.name='chair-support-frame';
      holder.position.set(x, lift, z); holder.rotation.y = yaw;
      const {root,rockers} = makeChair();
      holder.add(root); s.root.add(holder);
      chairs.push({ root, rockers, x, z, phase: random() * 6, gain });
    };
    if (a.beside === 'twin') { place(-0.42, 0, 0.45, 1); place(0.42, 0.05, -0.5, 0.35); }
    else place(0, 0, (random() - 0.5) * 0.3, 1);
    if(a.footrest!=='none'){
      const beforeRest=new Set(s.root.children),rest=new THREE.Group();
      const z=1.08,wood=s.material(TONE[a.finish]),cloth=s.material('#a9a789');
      if(a.footrest==='folding'){
        for(const x of[-.18,.18]){s.rod([x,lift,-.14+z],[x,lift+.24,.14+z],.014,wood);s.rod([x,lift,.14+z],[x,lift+.24,-.14+z],.014,wood);}
        s.box([.39,.015,.31],[0,lift+.2475,z],cloth);
      }else{
        for(const x of[-.18,.18])for(const dz of[-.13,.13])s.cylinder(.018,.025,.2,[x,lift+.1,z+dz],wood,10);
        if(a.footrest==='upholstered')s.box([.44,.075,.36],[0,lift+.2375,z],cloth);
        else for(let i=0;i<4;i++)s.box([.43,.025,.075],[0,lift+.2125,z-.12+i*.08],wood);
      }
      for(const child of [...s.root.children])if(!beforeRest.has(child))rest.add(child);
      s.root.add(rest);rest.updateMatrixWorld(true);rest.position.y-=new THREE.Box3().setFromObject(rest,true).min.y;
    }

    const besideStart=s.root.children.length;
    if (a.beside === 'doorway') {
      const wallColour = pick(['#e9c36a', '#8fc7c2', '#e6a08c', '#b7cf9a', '#d9b6d2']);
      const wall = s.material(wallColour, { roughness: 0.95 });
      const WZ = -0.7, DX = -0.75;
      s.box([0.45, 2.7, 0.22], [DX - 0.72, 1.35, WZ], wall);
      s.box([1.0, 2.7, 0.22], [DX + 1.0, 1.35, WZ], wall);
      s.box([1.0, 0.45, 0.22], [DX, 2.475, WZ], wall);
      s.box([2.45, 0.3, 0.26], [DX + 0.25, 0.15, WZ], s.material('#8f8779'));
      s.box([1.2, 0.12, 0.4], [DX, 0.06, WZ + 0.26], s.material('#b3ab9a'));
      const frame = s.material('#f1ebdc');
      for (const x of [-0.53, 0.53]) s.box([0.07, 2.28, 0.26], [DX + x, 1.14, WZ], frame);
      s.box([1.13, 0.07, 0.26], [DX, 2.28, WZ], frame);
      const doorPaint = s.material(pick(['#2f6f7a', '#3f6a3f', '#7a3a2a', '#28497a']), { roughness: 0.6 });
      const leaf = (hinge: number, angle: number) => {
        const d = new Sculpture(context);
        d.root.position.set(DX + hinge * 0.5, 0.1, WZ - 0.05); d.root.rotation.y = angle;
        d.box([0.5, 2.15, 0.04], [-hinge * 0.25, 1.075, 0], doorPaint);
        for (let i = 0; i < 12; i++) d.box([0.36, 0.035, 0.05], [-hinge * 0.25, 0.9 + i * 0.09, 0], frame).rotation.x = 0.5;
        s.root.add(d.root);
      };
      leaf(-1, -1.15 - random() * 0.3); leaf(1, 0.05 + random() * 0.2);
      s.box([0.98, 2.15, 0.02], [DX, 1.17, WZ - 0.1], s.material('#2a2622'));
      if (mood.wear > 0.4) for (let i = 0; i < mood.wear * 8; i++) s.box([0.15 + random() * 0.3, 0.1 + random() * 0.3, 0.012], [DX + 0.7 + random() * 0.65, 0.5 + random() * 1.9, WZ + 0.111], s.material('#b9ad98', { roughness: 1 }));
    } else if (a.beside === 'table') {
      const tx = 0.72, tz = -0.1, wood = s.material('#6a4a2e');
      s.cylinder(0.24, 0.24, 0.03, [tx, 0.55 + lift, tz], wood, 20);
      s.cylinder(0.025, 0.03, 0.54, [tx, 0.27 + lift, tz], wood, 10);
      for (let i = 0; i < 3; i++) s.rod([tx, 0.12 + lift, tz], [tx + Math.sin(i * 2.094) * 0.2, lift, tz + Math.cos(i * 2.094) * 0.2], 0.016, wood);
      s.cylinder(0.05, 0.05, 0.008, [tx - 0.08, 0.57 + lift, tz + 0.1], s.material('#f3efe6'), 14);
      s.cylinder(0.03, 0.022, 0.045, [tx - 0.08, 0.595 + lift, tz + 0.1], s.material('#f3efe6'), 12);
      s.cylinder(0.026, 0.026, 0.004, [tx - 0.08, 0.612 + lift, tz + 0.1], s.material('#2a160c'), 12);
      s.box([0.2, 0.13, 0.07], [tx + 0.05, 0.63 + lift, tz - 0.07], s.material(pick(['#8a2f2a', '#2b2b2b', '#c9c2ae']))).rotation.y = -0.4;
      s.rod([tx + 0.12, 0.69 + lift, tz - 0.1], [tx + 0.2, 1.0 + lift, tz - 0.14], 0.004, s.material('#c9cdd0', { metalness: 0.8 }));
    } else if (a.beside === 'plant') {
      const px = 0.75, pz = -0.2;
      s.box([0.26, 0.34, 0.26], [px, 0.17 + lift, pz], s.material(pick(['#c9a548', '#3f6fae', '#b3352b']), { metalness: 0.4, roughness: 0.5 })).rotation.y = 0.4;
      s.cylinder(0.11, 0.11, 0.02, [px, 0.34 + lift, pz], s.material('#3a2a1c'), 12);
      const leaf = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3f8a3f').offsetHSL(0, 0, (mood.cheer - 0.5) * 0.1), side: THREE.DoubleSide, roughness: 0.8 });
      const fronds = Math.round(mix(4, 9, mood.density));
      for (let i = 0; i < fronds; i++) {
        const t = i / fronds * 6.283 + random(), reach = 0.35 + random() * 0.3, h = 0.8 + random() * 0.6;
        s.tube([[px, 0.34 + lift, pz], [px + Math.cos(t) * reach * 0.3, h * 0.75 + lift, pz + Math.sin(t) * reach * 0.3], [px + Math.cos(t) * reach, h + lift, pz + Math.sin(t) * reach]], 0.008, s.material('#5a7a3a'));
        for (let k = 0; k < 6; k++) { const f = 0.5 + k * 0.1; const blade = s.mesh(new THREE.PlaneGeometry(0.05, 0.28), leaf, [px + Math.cos(t) * reach * f * f, lift + 0.34 + (h - 0.34) * Math.sqrt(f) + 0.02, pz + Math.sin(t) * reach * f * f]); blade.rotation.set(random() * 0.6 - 0.3, -t, (k % 2 ? 1 : -1) * 0.9); }
      }
    }

    if(a.beside==='table'||a.beside==='plant'){
      const beside=new THREE.Group();for(const child of s.root.children.slice(besideStart))beside.add(child);s.root.add(beside);beside.name='supported-chair-side-piece';beside.updateMatrixWorld(true);beside.position.y+=lift-new THREE.Box3().setFromObject(beside,true).min.y;
    }
    const amplitude = { rocking: mix(0.1, 0.24, mood.energy), breeze: mix(0.012, 0.04, mood.energy), settled: 0 }[a.motion];
    const pose = (time: number) => chairs.forEach((chair) => {
      const theta = Math.sin(time * 2.4 + chair.phase) * amplitude * chair.gain - 0.03;
      chair.root.rotation.x = theta;
      let lowest=Infinity;
      for(const rocker of chair.rockers){const p=rocker.geometry.getAttribute('position');for(let i=0;i<p.count;i++)lowest=Math.min(lowest,Math.cos(theta)*p.getY(i)-Math.sin(theta)*p.getZ(i));}
      chair.root.position.set(0, -lowest, RR * (theta - Math.sin(theta)));
    });
    pose(0);
    return s.finish({ update: amplitude ? (_dt, time) => pose(time) : undefined });
  },
});
