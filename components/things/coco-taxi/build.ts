import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = readonly [number, number, number];
const SHELLS = {
  yellow: 'The classic egg-yolk yellow of the tourist fleet.',
  black: 'Black with a yellow stripe, the cheaper cocos the locals ride.',
  lime: 'Lime green, repainted to stand out on the rank.',
  orange: 'Sunset orange.',
  pink: 'Hot pink, somebody\'s joke that stuck.',
  blue: 'Sea blue with a white roof.',
} as const;
const TINT: Record<keyof typeof SHELLS, string> = { yellow: '#f5b800', black: '#1e1f22', lime: '#8fca1c', orange: '#ee6410', pink: '#ee4f96', blue: '#2a84c8' };
const NAMES = ['LA MULATA', 'EL RAPIDO', 'DALE', 'MI CIELO', 'COCOLOCO', 'LA REINA'];

export default defineThing({
  questions: {
    colour: choice('What colour is the shell?', SHELLS),
    livery: choice('What is painted on its sides?', {
      coco: 'COCO TAXI in fat black letters.',
      checker: 'A black and white chequered band and the word TAXI.',
      name: 'A pet name hand-painted in looping letters by its driver.',
      plain: 'Nothing; bare shiny fibreglass.',
    }),
    state: choice('What is it doing?', {
      waiting: 'Waiting for a fare: headlamp on, the driver\'s helmet hung on the handlebar.',
      parked: 'Parked up for the day: a cloth over the handlebars, a chain through the front wheel.',
      broken: 'Broken down: one rear wheel off, a toolbox and a plastic bottle of petrol on the ground.',
      washing: 'Being washed: a bucket of suds beside it, a sponge on the roof, a puddle spreading underneath.',
    }),
    seat: choice('What was left on the passenger seat?', {
      nothing: 'Nothing.',
      hat: 'A tourist\'s straw hat.',
      mangoes: 'A string bag of mangoes.',
      guitar: 'A guitar propped across the bench.',
      ring: 'A child\'s inflatable swimming ring.',
      camera: 'A camera and an unfolded street map.',
    }),
    decor: choice('How has the driver dressed it up?', {
      none: 'Not at all.',
      flags: 'Two little flags on the roof.',
      lights: 'A string of coloured bulbs around the opening.',
      speaker: 'A loudspeaker horn strapped to the roof.',
      flowers: 'Plastic flowers wound round the handlebars.',
    }),
    eyes: choice('What are its headlamps like?', {
      single: 'One big round scooter headlamp.',
      twin: 'Two bug-eye lamps on stalks, giving it a face.',
    }),
    wheelFace: choice('How are the wheel centres finished?', {
      plain: 'Plain pressed metal hubs.',
      spokes: 'Eight narrow spokes cross each dark hub.',
      caps: 'Smooth domed chrome hubcaps.',
      rings: 'Thin pale trim rings surround the hubs.',
    }),
    seatStitch: choice('How is the passenger bench upholstered?', {
      plain: 'Smooth unbroken vinyl.',
      ribs: 'Closely spaced raised horizontal ribs.',
      divided: 'Two separately padded seating panels.',
      quilt: 'A diamond-stitched quilted back and seat.',
    }),
    entryRail: choice('What helps passengers climb aboard?', {
      bare: 'The open sides have no extra rail.',
      handles: 'Two short upright grab handles flank the bench.',
      loops: 'Large tubular loops frame both entry openings.',
      steps: 'Low anti-slip boarding steps project on each side.',
    }),
    frontBasket: choice('What is fixed above the front leg shield?', {
      none: 'The shield is clear.',
      wire: 'A small open wire basket sits above the headlamp.',
      crate: 'A shallow slatted wooden carrier.',
      bag: 'A strapped canvas pouch with a flap.',
    }),
    roofRack: choice('What sits on the rear of the roof?', {
      none: 'A clean roof without a carrier.',
      rails: 'An empty narrow roof rack.',
      luggage: 'A suitcase is strapped to the roof rack.',
      basket: 'A wicker parcel basket is lashed to the roof rack.',
    }),
    windscreen: choice('What protects the handlebars from wind?', {
      open: 'The front opening is clear.',
      low: 'A low curved transparent wind deflector.',
      tall: 'A taller clear shield held by two metal stays.',
      visor: 'A narrow opaque sun visor sits above the handlebars.',
    }),
    bumper: choice('What protects the lower body?', {
      plain: 'The shell has its original narrow trim only.',
      front: 'A low tubular front bumper follows the leg shield.',
      sides: 'Long side rub rails protect the shell.',
      rear: 'A broad rear tubular guard wraps the tail.',
    }),
    roadBase: choice('What surface is beneath the taxi?', {
      bare: 'The taxi stands on the scene ground.',
      cobbles: 'A patch of small irregular cobblestones.',
      concrete: 'A rectangular concrete parking pad with joints.',
      rank: 'A paved taxi-rank space marked with two pale lines.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const base = new THREE.Color(TINT[a.colour]);
    base.offsetHSL(0, mix(-0.18, 0.05, mood.cheer), 0);
    base.lerp(new THREE.Color('#9a927f'), mood.wear * 0.14);
    const baseCss = `#${base.getHexString()}`;
    const accent = a.colour === 'black' ? '#f6c414' : '#161616';
    const dark = s.material('#1c1c1e', { roughness: 0.8 }), chrome = s.material('#dfe3e4', { metalness: 0.9, roughness: 0.25 }), rubber = s.material('#161616', { roughness: 0.95 });
    const vinyl = s.material(a.colour === 'black' ? '#8c2f2a' : '#26262a', { roughness: 0.6 });
    const shellPaint = s.material(baseCss, { roughness: mix(0.25, 0.7, mood.wear) });

    // Shell: a painted body patch with the front left open, and a plain roof cap.
    const R = 0.86, CY = 0.96, ZS = 1.1, GAP = 2.0, CAP = 0.72, CUT = 2.62;
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = baseCss; ctx.fillRect(0, 0, 1024, 512);
    if (a.colour === 'blue') { ctx.fillStyle = '#f2f0e8'; ctx.fillRect(0, 0, 1024, 70); }
    if (a.colour === 'black') { ctx.fillStyle = '#f6c414'; ctx.fillRect(0, 300, 1024, 34); }
    ctx.fillStyle = accent;
    ctx.fillRect(0, 470, 1024, 42); ctx.fillRect(0, 0, 14, 512); ctx.fillRect(1010, 0, 14, 512); ctx.fillRect(0, 0, 1024, 10);
    const name = pick(NAMES);
    for (const u of [0.19, 0.81]) {
      ctx.save(); ctx.translate(u * 1024, 230); ctx.textAlign = 'center'; ctx.fillStyle = accent;
      if (a.livery === 'coco') { ctx.font = 'bold 74px sans-serif'; ctx.fillText('COCO', 0, 0); ctx.font = 'bold 58px sans-serif'; ctx.fillText('TAXI', 0, 62); }
      else if (a.livery === 'checker') { ctx.font = 'bold 84px sans-serif'; ctx.fillText('TAXI', 0, 10); }
      else if (a.livery === 'name') { ctx.rotate(-0.08); ctx.font = 'italic bold 56px cursive, serif'; ctx.fillStyle = a.colour === 'black' ? '#f6c414' : pick(['#b3202a', '#16306e', '#161616']); ctx.fillText(name, 0, 20, 300); }
      ctx.restore();
    }
    if (a.livery === 'checker') for (let i = 0; i < 64; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#161616' : '#f4f2ea'; ctx.fillRect(i * 16, 330 + j * 16, 16, 16); }
    // Portholes, rear window, tail lamps and plate.
    ctx.fillStyle = '#243238';
    for (const u of [0.36, 0.64]) { ctx.beginPath(); ctx.ellipse(u * 1024, 190, 50, 62, 0, 0, 6.3); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(512, 150, 70, 46, 0, 0, 6.3); ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 7;
    for (const u of [0.36, 0.64]) { ctx.beginPath(); ctx.ellipse(u * 1024, 190, 50, 62, 0, 0, 6.3); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(512, 150, 70, 46, 0, 0, 6.3); ctx.stroke();
    ctx.fillStyle = '#d21f1f'; for (const x of [420, 604]) { ctx.beginPath(); ctx.arc(x, 400, 20, 0, 6.3); ctx.fill(); }
    ctx.fillStyle = '#f4f2ea'; ctx.fillRect(472, 380, 80, 40);
    ctx.fillStyle = '#161616'; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center'; ctx.fillText(`T ${100 + Math.floor(random() * 899)}`, 512, 409);
    for (let i = 0; i < mood.wear * 40; i++) {
      ctx.fillStyle = random() < 0.5 ? `rgba(90,70,50,${0.15 + random() * 0.3})` : `rgba(235,230,215,${0.2 + random() * 0.4})`;
      ctx.beginPath(); ctx.ellipse(random() * 1024, 250 + random() * 250, 6 + random() * 34, 4 + random() * 16, random() * 3, 0, 6.3); ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const skin = new THREE.MeshStandardMaterial({ map: texture, roughness: mix(0.25, 0.7, mood.wear), side: THREE.DoubleSide });
    const shell = s.mesh(new THREE.SphereGeometry(R, 40, 18, Math.PI / 2 + GAP / 2, Math.PI * 2 - GAP, CAP, CUT - CAP), skin, [0, CY, 0]);
    shell.scale.z = ZS;
    const roofPaint = a.colour === 'blue' ? s.material('#f2f0e8', { roughness: 0.4, side: THREE.DoubleSide }) : new THREE.MeshStandardMaterial({ color: base, roughness: mix(0.25, 0.7, mood.wear), side: THREE.DoubleSide });
    const cap = s.mesh(new THREE.SphereGeometry(R, 40, 8, 0, Math.PI * 2, 0, CAP), roofPaint, [0, CY, 0]);
    cap.scale.z = ZS;
    const on = (phi: number, theta: number, out = 1): [number, number, number] => [-Math.cos(phi) * Math.sin(theta) * R * out, CY + Math.cos(theta) * R * out, Math.sin(phi) * Math.sin(theta) * R * out * ZS];
    // A rolled lip around the opening.
    const lip: P[] = [];
    for (let i = 0; i <= 8; i++) lip.push(on(Math.PI / 2 + GAP / 2, mix(CUT, CAP, i / 8)));
    for (let i = 1; i <= 8; i++) lip.push(on(Math.PI / 2 + GAP / 2 - GAP * i / 8, CAP));
    for (let i = 1; i <= 8; i++) lip.push(on(Math.PI / 2 - GAP / 2, mix(CAP, CUT, i / 8)));
    s.tube(lip, 0.03, s.material(accent, { roughness: 0.5 }));

    // Floor, chassis and seats.
    const FY = CY + Math.cos(CUT) * R;
    s.cylinder(0.5, 0.46, 0.06, [0, FY, 0], dark, 24).scale.z = ZS;
    s.box([0.46, 0.06, 0.9], [0, FY, 0.62], dark);
    s.box([1.0, 0.34, 0.42], [0, FY + 0.2, -0.3], dark);
    s.box([1.04, 0.1, 0.46], [0, FY + 0.42, -0.28], vinyl).name = 'coco-passenger-bench';
    s.box([1.04, 0.5, 0.1], [0, FY + 0.7, -0.56], vinyl).rotation.x = -0.12;
    s.box([0.3, 0.44, 0.5], [0, FY + 0.25, 0.28], shellPaint);
    s.box([0.3, 0.08, 0.5], [0, FY + 0.5, 0.26], vinyl);
    const seatY = FY + 0.47;
    const stitch=s.material('#b7a183',{roughness:1});
    if(a.seatStitch==='ribs')for(let i=0;i<8;i++){
      s.box([.98,.015,.018],[0,FY+.49+i*.06,-.499-i*.0072],stitch);
      if(i<6)s.box([.98,.012,.013],[0,seatY+.003,-.46+i*.068],stitch);
    }else if(a.seatStitch==='divided')for(const x of[-.27,.27]){
      s.box([.48,.015,.42],[x,seatY+.0075,-.28],stitch);
      s.box([.48,.45,.015],[x,FY+.7,-.5],stitch).rotation.x=-.12;
    }else if(a.seatStitch==='quilt')for(let i=0;i<5;i++)for(const side of[-1,1]){
      const x=-.46+i*.19;
      s.rod([x,FY+.5,-.501],[x+side*.14,FY+.87,-.545],.003,stitch);
      s.rod([x,seatY+.006,-.47],[x+side*.14,seatY+.006,-.07],.003,stitch);
    }
    if(a.entryRail==='handles')for(const side of[-1,1])s.tube([[side*.49,FY+.36,-.1],[side*.49,FY+.7,-.1],[side*.49,FY+.72,-.3],[side*.49,FY+.47,-.3]],.022,chrome);
    else if(a.entryRail==='loops')for(const side of[-1,1])s.tube([[side*.45,FY,.45],[side*.6,FY+.62,.32],[side*.6,FY+.75,.08],[side*.49,FY+.47,-.1]],.024,chrome);
    else if(a.entryRail==='steps')for(const side of[-1,1]){
      s.box([.32,.035,.48],[side*.6,FY-.04,.26],chrome);
      for(let i=0;i<5;i++)s.box([.27,.008,.025],[side*.6,FY-.018,.07+i*.09],rubber);
      s.rod([side*.4,FY-.02,.1],[side*.69,FY-.065,.1],.025,dark);s.rod([side*.4,FY-.02,.42],[side*.69,FY-.065,.42],.025,dark);
    }

    // Scooter front end.
    const WR = 0.21;
    const wheel = (x: number, y: number, z: number, lying = false) => {
      const tyre = s.mesh(new THREE.TorusGeometry(WR - 0.06, 0.06, 12, 24), rubber, [x, y, z]);
      const hub = s.cylinder(0.11, 0.11, 0.07, [x, y, z], chrome, 14);
      if (lying) { tyre.rotation.x = Math.PI / 2; } else { tyre.rotation.y = Math.PI / 2; hub.rotation.z = Math.PI / 2; }
      const decorate=(side:number)=>{
        const group=new THREE.Group();group.position.set(x,y,z);if(lying)group.rotation.x=-Math.PI/2;else group.rotation.y=side*Math.PI/2;
        const add=(geometry:THREE.BufferGeometry,material:THREE.Material,at:P)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...at);mesh.castShadow=true;group.add(mesh);return mesh;};
        if(a.wheelFace==='caps'){const m=add(new THREE.SphereGeometry(.105,16,8),chrome,[0,0,.04]);m.scale.z=.3;}
        else if(a.wheelFace==='rings')add(new THREE.TorusGeometry(.113,.012,6,24),stitch,[0,0,.04]);
        else if(a.wheelFace==='spokes')for(let i=0;i<8;i++){const t=i*Math.PI/4;const m=add(new THREE.BoxGeometry(.11,.008,.012),chrome,[Math.cos(t)*.055,Math.sin(t)*.055,.04]);m.rotation.z=t;}
        s.root.add(group);
      };decorate(1);if(!lying)decorate(-1);
    };
    const FZ = 1.08;
    wheel(0, WR, FZ);
    for (const x of [-0.09, 0.09]) s.rod([x, WR, FZ], [x * 0.6, 1.0, 0.72], 0.02, chrome);
    s.rod([-0.34, 1.04, 0.7], [0.34, 1.04, 0.7], 0.016, chrome);
    for (const x of [-0.34, 0.34]) s.rod([x * 0.75, 1.04, 0.7], [x, 1.04, 0.69], 0.024, rubber);
    const guard = s.mesh(new THREE.SphereGeometry(0.27, 16, 8, 0, Math.PI * 2, 0, 1.25), new THREE.MeshStandardMaterial({ color: base, roughness: 0.4, side: THREE.DoubleSide }), [0, WR + 0.03, FZ]);
    guard.scale.x = 0.5;
    const shield = s.box([0.5, 0.56, 0.04], [0, 0.66, 0.84], shellPaint);
    shield.rotation.x = -0.32;
    const lampGlow = a.state === 'waiting' ? 1.6 : 0.1;
    const lampMaterial = s.material('#fff3c4', { emissive: '#ffe69a', emissiveIntensity: lampGlow, roughness: 0.2 });
    if (a.eyes === 'single') {
      s.cylinder(0.11, 0.08, 0.1, [0, 0.9, 0.86], chrome, 16).rotation.x = Math.PI / 2;
      s.ball([0.1, 0.1, 0.04], [0, 0.9, 0.915], lampMaterial, 14);
    } else for (const x of [-0.2, 0.2]) {
      s.rod([x * 0.6, 0.8, 0.8], [x, 0.98, 0.86], 0.014, chrome);
      s.ball([0.085, 0.085, 0.085], [x, 1.0, 0.87], chrome, 14);
      s.ball([0.07, 0.07, 0.03], [x, 1.0, 0.945], lampMaterial, 14);
    }
    for (const x of [-1, 1]) { s.rod([x * 0.3, 1.04, 0.7], [x * 0.4, 1.24, 0.68], 0.008, chrome); s.ball([0.06, 0.045, 0.012], [x * 0.4, 1.26, 0.68], chrome, 10); }
    if(a.frontBasket!=='none'){
      const x=0,y=1.17,z=.91;
      for(const side of[-1,1])s.rod([side*.17,.98,.77],[side*.17,y-.09,z],.012,chrome);
      if(a.frontBasket==='bag'){
        s.box([.34,.22,.15],[x,y,z],s.material('#7c7961'));s.box([.36,.07,.018],[x,y+.07,z+.085],dark);
        for(const side of[-1,1])s.tube([[side*.1,y+.1,z],[side*.1,1.04,.7],[side*.1,y-.1,z]],.008,rubber);
      }else{
        const material=a.frontBasket==='wire'?chrome:s.material('#a98c60');s.box([.38,.018,.22],[x,y-.11,z],material);
        for(const side of[-1,1]){
          for(let i=0;i<7;i++)s.rod([-.18+i*.06,y-.1,z+side*.11],[-.18+i*.06,y+.1,z+side*.11],a.frontBasket==='wire'?.006:.016,material);
          s.rod([-.19,y+.1,z+side*.11],[.19,y+.1,z+side*.11],.012,material);
          for(const dx of[-.19,.19])s.rod([dx,y+side*.1,z-.11],[dx,y+side*.1,z+.11],.012,material);
        }
      }
    }
    if(a.windscreen!=='open'){
      const top=a.windscreen==='tall'?1.55:1.35,bottom=1.08,z=.72;
      for(const x of[-.25,.25])s.rod([x,bottom,z],[x,top,z-.08],.009,chrome);
      const screen=s.box([.51,top-bottom,.009],[0,(top+bottom)/2,z-.04],a.windscreen==='visor'?shellPaint:s.material('#aecacc',{transparent:true,opacity:.28,depthWrite:false,roughness:.15}));screen.rotation.x=-Math.atan2(.08,top-bottom);
      if(a.windscreen==='visor'){screen.scale.y=.28;screen.position.y=top-.035;}
    }
    if(a.roofRack!=='none'){
      const y=CY+R+.07,z=-.24;
      for(const x of[-.27,.27])for(const dz of[-.2,.2]){
        const zz=z+dz,sy=CY+Math.sqrt(R*R-x*x-(zz/ZS)**2);s.rod([x,sy,zz],[x,y,zz],.018,chrome);
      }
      for(let i=0;i<5;i++)s.rod([-.31,y,z-.24+i*.12],[.31,y,z-.24+i*.12],.014,chrome);
      for(const x of[-.31,.31])s.rod([x,y,z-.25],[x,y,z+.25],.018,chrome);
      if(a.roofRack==='luggage'){
        s.box([.55,.2,.41],[0,y+.114,z],s.material('#927349'));for(const x of[-.18,.18])s.tube([[x,y-.01,z-.24],[x,y+.22,z-.22],[x,y+.22,z+.22],[x,y-.01,z+.24]],.008,rubber);
      }else if(a.roofRack==='basket'){
        const wicker=s.material('#b69b6a');s.box([.53,.018,.42],[0,y+.025,z],wicker);
        for(let j=0;j<4;j++)for(const side of[-1,1]){s.box([.55,.025,.022],[0,y+.06+j*.045,z+side*.21],wicker);s.box([.022,.025,.42],[side*.265,y+.06+j*.045,z],wicker);}
        for(const x of[-.265,.265])for(const dz of[-.21,.21])s.rod([x,y+.025,z+dz],[x,y+.21,z+dz],.012,wicker);
        for(const side of[-1,1])s.tube([[side*.27,y-.015,z-.24],[side*.27,y+.215,z],[side*.27,y-.015,z+.24]],.008,rubber);
      }
    }
    if(a.bumper==='front'){
      s.tube([[-.45,.48,.65],[-.4,.48,1.2],[0,.48,1.4],[.4,.48,1.2],[.45,.48,.65]],.025,chrome);
      for(const x of[-.24,.24])s.rod([x,FY,.7],[x,.48,1.22],.02,dark);
    }else if(a.bumper==='sides')for(const side of[-1,1]){
      s.tube([[side*.49,.48,.45],[side*.83,.48,.2],[side*.85,.48,-.4],[side*.57,.48,-.65]],.025,chrome);
      for(const z of[-.45,.25])s.rod([side*.62,FY,z],[side*.82,.48,z],.02,dark);
    }else if(a.bumper==='rear'){
      s.tube([[-.72,.45,-.45],[-.63,.45,-.8],[0,.45,-1],[.63,.45,-.8],[.72,.45,-.45]],.03,chrome);
      for(const x of[-.35,.35])s.rod([x,FY,-.35],[x,.45,-.88],.025,dark);
    }

    // Rear wheels with stubby mudguards.
    const offSide = random() < 0.5 ? -1 : 1;
    for (const x of [-1, 1]) {
      const wx = x * 0.74, wz = -0.28;
      const arch = s.mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 16, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: base, roughness: 0.4, side: THREE.DoubleSide }), [wx, WR + 0.02, wz]);
      arch.rotation.z = Math.PI / 2;
      if (a.state === 'broken' && x === offSide) {
        wheel(wx + x * 0.5, 0.06, wz + 0.5, true);
        for (let i = 0; i < 3; i++) s.box([0.2, 0.07, 0.1], [wx, 0.035 + i * 0.072, wz], s.material('#a5553a')).rotation.y = i * 0.5;
        s.cylinder(0.05, 0.05, 0.08, [wx, WR, wz], chrome, 10).rotation.z = Math.PI / 2;
      } else wheel(wx, WR, wz);
    }

    // State.
    if (a.state === 'waiting') {
      const helmet = s.ball([0.14, 0.13, 0.15], [0.36, 0.92, 0.7], s.material(pick(['#d9d9d9', '#b3202a', '#16306e', '#161616']), { roughness: 0.3 }), 14);
      helmet.rotation.z = 0.4;
      s.rod([0.34, 1.04, 0.7], [0.36, 0.98, 0.7], 0.006, dark);
    } else if (a.state === 'parked') {
      s.ball([0.42, 0.1, 0.16], [0, 1.06, 0.7], s.material(mood.cheer > 0.5 ? '#3f8fbf' : '#7d7f72', { roughness: 1 }), 12);
      s.box([0.02, 0.26, 0.3], [-0.36, 0.94, 0.7], s.material(mood.cheer > 0.5 ? '#3f8fbf' : '#7d7f72', { roughness: 1 }));
      s.ring(0.12, 0.012, [0.06, 0.16, FZ + 0.08], chrome).rotation.y = Math.PI / 2;
      s.box([0.05, 0.07, 0.03], [0.07, 0.06, FZ + 0.18], s.material('#c9a548', { metalness: 0.7 }));
      s.box([0.2, 0.07, 0.1], [0, 0.035, FZ + 0.27], s.material('#a5553a'));
    } else if (a.state === 'broken') {
      const tx = offSide * 1.15, tz = -0.75;
      s.box([0.4, 0.16, 0.2], [tx, 0.08, tz], s.material('#b3312a', { metalness: 0.4 })).rotation.y = 0.5;
      s.box([0.38, 0.02, 0.2], [tx - 0.05, 0.22, tz - 0.12], s.material('#b3312a', { metalness: 0.4 })).rotation.set(-0.9, 0.5, 0);
      for (let i = 0; i < 3; i++) s.rod([tx + 0.1 + random() * 0.3, 0.012, tz + 0.3 + random() * 0.3], [tx + 0.3 + random() * 0.3, 0.012, tz + 0.25 + random() * 0.4], 0.012, chrome);
      s.lathe([[0, 0], [0.05, 0], [0.052, 0.2], [0.02, 0.28], [0.02, 0.31], [0, 0.31]], s.material('#d9c05a', { roughness: 0.2 }), [offSide * 0.95, 0, 0.35]);
      s.mesh(new THREE.ConeGeometry(0.06, 0.1, 12, 1, true), s.material('#d2452e', { side: THREE.DoubleSide }), [offSide * 0.95, 0.36, 0.35]).rotation.x = Math.PI;
    } else {
      const bx = offSide * 1.1, bz = 0.55;
      s.cylinder(0.15, 0.12, 0.26, [bx, 0.13, bz], s.material(pick(['#2d6ea8', '#d2452e', '#3f9a5a'])), 16);
      s.ring(0.14, 0.008, [bx, 0.3, bz], chrome, Math.PI).rotation.y = random() * 3;
      for (let i = 0; i < 9; i++) s.ball([0.05, 0.04, 0.05], [bx + (random() - 0.5) * 0.2, 0.27 + random() * 0.05, bz + (random() - 0.5) * 0.2], s.material('#f4f8fa', { roughness: 0.2 }), 8);
      const top = on(Math.PI + offSide * -0.4, 0.3, 1.03);
      s.box([0.16, 0.06, 0.11], top, s.material('#e9d24a', { roughness: 1 })).rotation.set(0.2, random() * 3, offSide * -0.25);
      const puddle = s.cylinder(1, 1, 0.006, [offSide * 0.2, 0.003, 0.1], s.material('#6f8f9a', { roughness: 0.05, metalness: 0.3 }), 28);
      puddle.scale.set(mix(0.8, 1.15, random()), 1, mix(1.0, 1.4, random()));
      puddle.castShadow = false;
    }

    // What was left on the passenger seat.
    const seatPropsBefore = new Set(s.root.children);
    const sx = (random() - 0.5) * 0.4;
    if (a.seat === 'hat') {
      s.cylinder(0.2, 0.21, 0.012, [sx, seatY + 0.008, -0.26], s.material('#dcc48a', { roughness: 1 }), 20);
      s.cylinder(0.09, 0.11, 0.1, [sx, seatY + 0.06, -0.26], s.material('#dcc48a', { roughness: 1 }), 16);
      s.cylinder(0.112, 0.112, 0.03, [sx, seatY + 0.03, -0.26], s.material('#1f3a6a'), 16);
    } else if (a.seat === 'mangoes') {
      for (let i = 0; i < 6; i++) s.ball([0.06, 0.075, 0.055], [sx + (random() - 0.5) * 0.2, seatY + 0.06 + random() * 0.07, -0.26 + (random() - 0.5) * 0.14], s.material(pick(['#e8a02a', '#d9532a', '#9bb83a']), { roughness: 0.5 }), 10).rotation.z = random() * 3;
      s.ball([0.17, 0.12, 0.13], [sx, seatY + 0.09, -0.26], new THREE.MeshStandardMaterial({ color: '#f1ede0', wireframe: true }), 8).castShadow = false;
    } else if (a.seat === 'guitar') {
      const woodTone = s.material('#c98a3e', { roughness: 0.4 });
      const g = new THREE.Group();
      const part = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P, scale: P = [1, 1, 1]) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.scale.set(...scale); mesh.castShadow = true; g.add(mesh); };
      part(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 20), woodTone, [0, 0, 0]);
      part(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 20), woodTone, [0.22, 0, 0]);
      part(new THREE.CylinderGeometry(0.05, 0.05, 0.102, 14), dark, [0.12, 0, 0]);
      part(new THREE.BoxGeometry(0.5, 0.03, 0.05), s.material('#3a2415'), [0.58, 0.04, 0]);
      part(new THREE.BoxGeometry(0.14, 0.03, 0.07), s.material('#3a2415'), [0.88, 0.04, 0]);
      g.position.set(-0.28, seatY + 0.3, -0.42); g.rotation.set(Math.PI / 2 - 0.35, 0, 0.5);
      s.root.add(g);
    } else if (a.seat === 'ring') {
      const ring = s.mesh(new THREE.TorusGeometry(0.2, 0.075, 10, 24), s.material(pick(['#ff5fa2', '#3fc0e0', '#ff9a1f']), { roughness: 0.3 }), [sx, seatY + 0.2, -0.4]);
      ring.rotation.x = -0.4;
      for (let i = 0; i < 6; i++) { const t = i * 1.047; s.ball([0.05, 0.05, 0.05], [sx + Math.cos(t) * 0.2, seatY + 0.2 + Math.sin(t) * 0.185, -0.4 + Math.sin(t) * 0.078 + 0.06], s.material('#f8f6ee'), 8); }
    } else if (a.seat === 'camera') {
      s.box([0.14, 0.09, 0.07], [sx - 0.15, seatY + 0.045, -0.2], dark);
      s.cylinder(0.04, 0.04, 0.07, [sx - 0.15, seatY + 0.045, -0.14], dark, 12).rotation.x = Math.PI / 2;
      s.rod([sx - 0.2, seatY + 0.09, -0.2], [sx - 0.02, seatY + 0.01, -0.3], 0.008, s.material('#8a2f2a'));
      for (let i = 0; i < 3; i++) s.box([0.12, 0.004, 0.24], [sx + 0.12 + i * 0.115, seatY + 0.012 + (i % 2) * 0.012, -0.24], s.material(i % 2 ? '#bfe0d2' : '#e8efda')).rotation.z = (i % 2 ? 1 : -1) * 0.12;
    }

    if (a.seat !== 'nothing') {
      const props = new THREE.Group(); props.name = 'coco-seat-props';
      for (const child of [...s.root.children]) if (!seatPropsBefore.has(child)) props.add(child);
      s.root.add(props); props.updateMatrixWorld(true);
      const upholsteredTop = seatY + (a.seatStitch === 'divided' ? .015 : a.seatStitch === 'plain' ? 0 : .009);
      props.position.y += upholsteredTop - new THREE.Box3().setFromObject(props, true).min.y;
    }

    // Decoration.
    const bulbs: THREE.MeshStandardMaterial[] = [];
    const flutter: THREE.Object3D[] = [];
    if (a.decor === 'flags') {
      for (const x of [-1, 1]) {
        const foot = on(Math.PI / 2 + x * 0.5, 0.42);
        s.rod(foot, [foot[0], foot[1] + 0.5, foot[2]], 0.008, chrome);
        const flag = new THREE.Group();
        flag.position.set(foot[0], foot[1] + 0.4, foot[2]);
        const colours = x < 0 ? ['#1f3c94', '#f4f1e8', '#1f3c94'] : [pick(['#d21f1f', '#2f9a4a', '#f6c414']), '#f4f1e8', pick(['#d21f1f', '#1f3c94'])];
        colours.forEach((colour, index) => { const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.06, 0.3), new THREE.MeshStandardMaterial({ color: colour })); stripe.position.set(0, 0.06 - index * 0.06, -0.16); stripe.castShadow = true; flag.add(stripe); });
        s.root.add(flag); flutter.push(flag);
      }
    } else if (a.decor === 'lights') {
      const hues = ['#ff4a4a', '#ffd23a', '#4ad27a', '#4aa8ff', '#ff7ad2'];
      const materials = hues.map((hue) => s.material(hue, { emissive: hue, emissiveIntensity: mix(0.6, 1.8, mood.cheer) }));
      bulbs.push(...materials);
      lip.forEach((point, index) => { const centre = new THREE.Vector3(...point); const out = centre.clone().sub(new THREE.Vector3(0, CY, 0)).normalize().multiplyScalar(0.05); s.ball([0.04, 0.05, 0.04], [centre.x + out.x, centre.y + out.y, centre.z + out.z + 0.03], materials[index % hues.length], 8); });
    } else if (a.decor === 'speaker') {
      const foot = on(Math.PI / 2, 0.3);
      s.box([0.3, 0.05, 0.3], [foot[0], foot[1] + 0.01, foot[2]], dark);
      const horn = s.mesh(new THREE.CylinderGeometry(0.2, 0.05, 0.36, 20, 1, true), s.material('#c9cdd0', { metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide }), [foot[0], foot[1] + 0.2, foot[2] + 0.12]);
      horn.rotation.x = Math.PI / 2 - 0.15;
      s.cylinder(0.07, 0.07, 0.14, [foot[0], foot[1] + 0.17, foot[2] - 0.12], dark, 14).rotation.x = Math.PI / 2 - 0.15;
    } else if (a.decor === 'flowers') {
      for (let i = 0; i < 12; i++) { const x = -0.33 + i * 0.06; s.ball([0.04, 0.04, 0.04], [x, 1.06 + Math.sin(i * 1.7) * 0.025, 0.71 + Math.cos(i * 1.7) * 0.03], s.material(pick(['#ff4f7a', '#ffd23a', '#ff8a2a', '#f4f1e8', '#c94fd2']), { roughness: 0.6 }), 8); }
      for (let i = 0; i < 5; i++) s.ball([0.03, 0.02, 0.03], [-0.3 + i * 0.15, 1.04, 0.74], s.material('#3f9a4a'), 6);
    }

    if(a.roadBase!=='bare'){
      const vehicle=new THREE.Group();for(const child of[...s.root.children])vehicle.add(child);s.root.add(vehicle);vehicle.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(vehicle,true),size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3()),h=.04;vehicle.position.y+=h;
      const paving=s.material('#9c9a90');s.box([size.x+.26,h,size.z+.26],[centre.x,h/2,centre.z],paving);
      if(a.roadBase==='cobbles'){
        const cols=Math.ceil((size.x+.2)/.18),rows=Math.ceil((size.z+.2)/.2),w=(size.x+.2)/cols,d=(size.z+.2)/rows;
        const stones=new THREE.InstancedMesh(new THREE.BoxGeometry(w-.008,.02,d-.008),paving,cols*rows);
        for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)stones.setMatrixAt(i*rows+j,new THREE.Matrix4().makeTranslation(centre.x-(size.x+.2)/2+(i+.5)*w,h+.01,centre.z-(size.z+.2)/2+(j+.5)*d));
        stones.instanceMatrix.needsUpdate=true;stones.castShadow=stones.receiveShadow=true;s.root.add(stones);vehicle.position.y+=.02;
      }else if(a.roadBase==='concrete')for(const dx of[-.45,.45])s.box([.009,.002,size.z+.24],[centre.x+dx,h+.001,centre.z],dark);
      else for(const side of[-1,1])s.box([.045,.003,size.z+.1],[centre.x+side*(size.x/2+.07),h+.001,centre.z],stitch);
    }
    const energy = mix(0.2, 1, mood.energy), phase = random() * 6, idle = a.state === 'waiting';
    return s.finish({
      update: (_dt, time) => {
        flutter.forEach((flag, index) => { flag.rotation.y = Math.sin(time * 5 * energy + index + phase) * 0.35; });
        bulbs.forEach((bulb, index) => { bulb.emissiveIntensity = 0.5 + (Math.sin(time * 4 * energy + index * 1.3) > 0 ? 1.3 : 0); });
        if (idle) { shell.position.y = cap.position.y = CY + Math.sin(time * 38) * 0.003 * energy; }
      },
    });
  },
});
