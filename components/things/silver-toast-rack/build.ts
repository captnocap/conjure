import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    capacity: choice('How many slots does the toast rack have?',{four:'Four slots in a compact rack.',five:'Five slots for a small breakfast table.',six:'Six evenly spaced toast slots.',seven:'Seven slots in a long family rack.'}),
    grip: choice('What shape is the carrying handle?',{ring:'A circular finger ring on a short stem.',heart:'A heart-shaped carrying loop.',arch:'A broad arch spanning the middle dividers.',square:'A small rectangular finger loop.'}),
    feet: choice('How is the rack raised off the table?',{ball:'Four polished ball feet.',pad:'Short legs ending in flat round pads.',scroll:'Four small curled scroll feet.',sled:'Two low continuous sled runners.'}),
    toastMarks: choice('What texture marks the toast faces?',{pores:'An uneven porous bread crumb.',grill:'Dark parallel grill lines.',seeds:'Visible sesame and grain seeds.',patches:'Broad irregular patches of darker browning.'}),
    railDetail: choice('How are the rack rails decorated?',{plain:'Smooth plain side rails.',beaded:'A line of small metal beads along each rail.',twist:'Fine spiral wire wrapped around the rails.',lozenges:'Little open diamond ornaments below the rails.'}),
    service: choice('Which small serving item accompanies the rack?',{tongs:'Spring toast tongs laid beside it.',knife:'A butter knife on a small knife rest.',brush:'A small crumb brush with a wooden back.',card:'A folded place card with a table number.'}),
    slices: choice('How many slices stand in the rack?', {
      one: 'A single slice left, the rest of the rack bare.',
      two: 'Two slices, a breakfast for one.',
      four: 'Four slices with gaps where others were taken.',
      full: 'Every slot filled, freshly brought to the table.',
    }),
    burnt: score('How well done is the toast?', [
      'Barely warmed, pale and floppy',
      'Light gold',
      'Properly browned',
      'Dark with charred edges',
      'Burnt black',
    ]),
    bitten: noul('Has one slice been taken out, bitten and put down on the side plate?'),
    bread: choice('What kind of bread is it?', {
      white: 'Square white sliced loaf with a domed top.',
      brown: 'Brown wholemeal, flecked with grain.',
      doorstop: 'Thick uneven doorsteps cut from a farmhouse loaf.',
      triangles: 'Crustless triangles, cut on the diagonal the way hotels do.',
    }),
    metal: choice('What is the rack made of?', {
      silver: 'Bright silver plate, polished for guests.',
      brass: 'Warm yellow brass.',
      iron: 'Black wrought iron, plain and heavy.',
      enamel: 'White-coated kitchen wire.',
    }),
    arches: choice('What shape are its dividers?', {
      round: 'Round hoops.',
      gothic: 'Pointed gothic arches, a little church.',
      square: 'Squared-off modern frames.',
      coil: 'One continuous spiral of wire, a mid-century design.',
    }),
    under: choice('What does the rack stand on?', {
      bare: 'Nothing: straight on the table.',
      tray: 'An oval silver tray.',
      doily: 'A white plate with a lace doily.',
      napkin: 'A folded linen napkin.',
    }),
    beside: choice('What comes with the toast?', {
      none: 'Nothing. Dry toast.',
      curls: 'A small dish of butter curls.',
      portions: 'Foil-wrapped butter pats and tiny pots of jam, hotel style.',
      slab: 'A slab of butter on a dish with a knife through it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const r = new Sculpture(context);
    const { mood, random } = context;
    const wobble = (amount: number) => (random() - 0.5) * 2 * amount;

    const metalTint = { silver: '#e3e5e4', brass: '#c9a04a', iron: '#2b2c2e', enamel: '#f1efe8' }[a.metal];
    const metal = r.material(metalTint, {
      metalness: a.metal === 'enamel' ? 0.05 : a.metal === 'iron' ? 0.5 : 0.92,
      roughness: a.metal === 'iron' ? 0.6 : 0.18 + mood.wear * 0.35,
    });
    const wire = a.metal === 'iron' ? 0.0032 : 0.0024;

    const slots = {four:4,five:5,six:6,seven:7}[a.capacity], pitch = 0.027, half = 0.04, railY = 0.014;
    const length = slots * pitch;
    const x0 = -length / 2;
    const arcTop = a.bread === 'triangles' ? 0.07 : 0.086;

    // Base: two rails, end bars, ball feet.
    for (const z of [-half, half]) r.rod([x0 - 0.008, railY, z], [-x0 + 0.008, railY, z], wire, metal);
    for (const x of [x0 - 0.008, -x0 + 0.008]) {
      r.rod([x, railY, -half], [x, railY, half], wire, metal);
      for (const z of [-half, half]) {
        if(a.feet==='ball')r.ball([.006,.006,.006],[x,.006,z],metal,12);
        if(a.feet==='pad'){r.cylinder(.007,.007,.003,[x,.0015,z],metal,12);r.rod([x,.003,z],[x,railY,z],wire,metal);}
        if(a.feet==='scroll')r.tube([[x,.014,z],[x+.006,.012,z],[x+.009,.005,z],[x+.003,.0025,z],[x-.002,.005,z]],wire,metal);
      }
    }
    r.rod([0, railY, -half], [0, railY, half], wire, metal);
    if(a.feet==='sled')for(const z of [-half,half]){r.rod([x0-.01,.0025,z],[-x0+.01,.0025,z],.0025,metal);for(const x of [x0,-x0])r.rod([x,.0025,z],[x,railY,z],wire,metal);}
    for(const z of [-half,half]){
      if(a.railDetail==='beaded')for(let x=x0;x<=-x0;x+=.009)r.ball([.003,.003,.003],[x,railY,z],metal,8);
      if(a.railDetail==='twist'){const pts:P3[]=[];for(let i=0;i<=slots*25;i++){const t=i/(slots*25),angle=t*slots*8*Math.PI;pts.push([mix(x0,-x0,t),railY+Math.sin(angle)*.0034,z+Math.cos(angle)*.0034]);}r.tube(pts,.0007,metal);}
      if(a.railDetail==='lozenges')for(let i=0;i<slots;i++){const x=x0+(i+.5)*pitch;r.tube([[x-.008,railY,z],[x,railY-.008,z],[x+.008,railY,z],[x,railY+.006,z],[x-.008,railY,z]],.001,metal);}
    }

    const arch = (x: number): P3[] => {
      if (a.arches === 'gothic') return [[x, railY, -half], [x, arcTop * 0.55, -half * 0.98], [x, arcTop * 0.86, -half * 0.5], [x, arcTop, 0], [x, arcTop * 0.86, half * 0.5], [x, arcTop * 0.55, half * 0.98], [x, railY, half]];
      return Array.from({ length: 13 }, (_unused, i) => {
        const angle = (i / 12) * Math.PI;
        return [x, railY + Math.sin(angle) ** 0.75 * (arcTop - railY), -Math.cos(angle) * half] as P3;
      });
    };
    if (a.arches === 'coil') {
      const turns = slots + 1, points: P3[] = [];
      for (let i = 0; i <= turns * 16; i++) {
        const t = i / 16, angle = t * Math.PI * 2;
        points.push([x0 + (t / turns) * length, railY + (arcTop - railY) * (0.5 - 0.5 * Math.cos(angle)), Math.sin(angle) * half]);
      }
      r.tube(points, wire, metal);
    } else {
      for (let i = 0; i <= slots; i++) {
        const x = x0 + i * pitch;
        if (a.arches === 'square') {
          r.rod([x, railY, -half], [x, arcTop, -half], wire, metal);
          r.rod([x, railY, half], [x, arcTop, half], wire, metal);
          r.rod([x, arcTop, -half], [x, arcTop, half], wire, metal);
        } else r.tube(arch(x), wire, metal);
      }
    }
    // A clear grip silhouette, attached to the dividers.
    if(a.grip==='arch')r.tube([[-pitch,arcTop*.94,0],[-pitch,arcTop+.028,0],[0,arcTop+.041,0],[pitch,arcTop+.028,0],[pitch,arcTop*.94,0]],wire,metal);
    else{
      r.rod([0,arcTop,0],[0,arcTop+.014,0],wire,metal);
      if(a.grip==='ring')r.ring(.013,wire,[0,arcTop+.027,0],metal);
      if(a.grip==='square')r.tube([[-.012,arcTop+.014,0],[-.012,arcTop+.041,0],[.012,arcTop+.041,0],[.012,arcTop+.014,0],[-.012,arcTop+.014,0]],wire,metal);
      if(a.grip==='heart')r.tube([[0,arcTop+.014,0],[-.014,arcTop+.031,0],[-.012,arcTop+.043,0],[-.004,arcTop+.045,0],[0,arcTop+.037,0],[.004,arcTop+.045,0],[.012,arcTop+.043,0],[.014,arcTop+.031,0],[0,arcTop+.014,0]],wire,metal);
    }

    // Toast.
    const thick = a.bread === 'doorstop' ? 0.019 : 0.011;
    const w = a.bread === 'doorstop' ? 0.1 : 0.092, h = a.bread === 'triangles' ? 0.07 : a.bread === 'doorstop' ? 0.104 : 0.098;
    const pale = new THREE.Color(a.bread === 'brown' ? '#c9a06a' : '#f3e3b8');
    const gold = new THREE.Color(a.bread === 'brown' ? '#9a642c' : '#cf9440');
    const black = new THREE.Color('#1d140e');
    const toastTone = (done: number) => (done < 0.6 ? pale.clone().lerp(gold, done / 0.6) : gold.clone().lerp(black, (done - 0.6) / 0.4));
    const crustTint = new THREE.Color(a.bread === 'brown' ? '#6e431d' : '#a8692c');
    const outline = (bite: boolean) => {
      const shape = new THREE.Shape();
      if (a.bread === 'triangles') {
        shape.moveTo(-w * 0.62, 0);
        shape.lineTo(w * 0.62, 0);
        if (bite) { shape.lineTo(w * 0.3, h * 0.5); shape.absarc(w * 0.18, h * 0.72, 0.022, -0.9, Math.PI * 0.9, true); }
        shape.lineTo(0, h);
        shape.closePath();
        return shape;
      }
      const lump = a.bread === 'doorstop' ? 0.012 : 0.007;
      shape.moveTo(-w / 2, 0);
      shape.lineTo(w / 2, 0);
      if (bite) {
        shape.lineTo(w / 2, h * 0.42);
        shape.absarc(w / 2 + 0.004, h * 0.68, 0.026, -Math.PI / 2 - 0.15, Math.PI * 0.72, true);
        shape.absarc(w / 2 - 0.03, h + 0.004, 0.02, -0.5, Math.PI * 1.0, true);
        shape.lineTo(0, h);
      } else {
        shape.lineTo(w / 2, h * 0.66);
        shape.bezierCurveTo(w / 2 + lump * 1.6, h * 0.72, w / 2 + lump, h, w * 0.2, h);
        shape.lineTo(0, h - 0.003);
      }
      shape.lineTo(-w * 0.2, h);
      shape.bezierCurveTo(-w / 2 - lump, h, -w / 2 - lump * 1.6, h * 0.72, -w / 2, h * 0.66);
      shape.closePath();
      return shape;
    };
    const slice = (done: number, bite: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const g = canvas.getContext('2d')!;
      const tone = toastTone(done);
      g.fillStyle = `#${tone.getHexString()}`;
      g.fillRect(0, 0, 128, 128);
      // Toasting is uneven: darker in the middle band and at the edges, with grill freckles.
      for (let i = 0; i < 90; i++) {
        const darker = random() < 0.5 + done * 0.4;
        g.fillStyle = darker ? `rgba(60,30,8,${0.05 + done * 0.22})` : 'rgba(255,240,200,0.12)';
        g.beginPath();
        g.ellipse(random() * 128, random() * 128, 3 + random() * 12, 2 + random() * 6, random() * 3, 0, Math.PI * 2);
        g.fill();
      }
      if (a.bread === 'brown') { g.fillStyle = 'rgba(60,35,12,0.6)'; for (let i = 0; i < 60; i++) g.fillRect(random() * 128, random() * 128, 2, 2); }
      if(a.toastMarks==='grill'){g.strokeStyle='rgba(43,22,6,.6)';g.lineWidth=5;for(let y=14;y<128;y+=22){g.beginPath();g.moveTo(0,y);g.lineTo(128,y-20);g.stroke();}}
      if(a.toastMarks==='seeds')for(let i=0;i<55;i++){g.save();g.translate(random()*128,random()*128);g.rotate(random()*Math.PI);g.fillStyle=i%3?'#ead1a0':'#74552c';g.beginPath();g.ellipse(0,0,3.2,1.3,0,0,Math.PI*2);g.fill();g.restore();}
      if(a.toastMarks==='patches')for(let i=0;i<10;i++){g.fillStyle='rgba(65,28,5,.22)';g.beginPath();g.ellipse(random()*128,random()*128,10+random()*17,6+random()*12,random()*3,0,Math.PI*2);g.fill();}
      if(a.toastMarks==='pores'){g.fillStyle='rgba(78,51,21,.22)';for(let i=0;i<110;i++){g.beginPath();g.arc(random()*128,random()*128,.6+random()*1.4,0,Math.PI*2);g.fill();}}
      const edge = g.createRadialGradient(64, 64, 30, 64, 64, 92);
      edge.addColorStop(0, 'rgba(40,20,5,0)');
      edge.addColorStop(1, `rgba(30,15,5,${0.15 + done * 0.6})`);
      g.fillStyle = edge;
      g.fillRect(0, 0, 128, 128);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.repeat.set(1 / (w * 1.3), 1 / (h * 1.05));
      texture.offset.set(0.5, 0);
      const face = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 });
      const rim = new THREE.MeshStandardMaterial({ color: a.bread === 'triangles' ? tone.clone().multiplyScalar(0.9) : crustTint.clone().lerp(black, clamp01(done * 1.2 - 0.35)), roughness: 0.95 });
      const geometry = new THREE.ExtrudeGeometry(outline(bite), { depth: thick, bevelEnabled: false, curveSegments: 10 });
      geometry.translate(0, 0, -thick / 2);
      const mesh = new THREE.Mesh(geometry, [face, rim]);
      mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    };

    const count = Math.min(slots,{ one: 1, two: 2, four: 4, full: slots }[a.slices]);
    const order = Array.from({length:slots},(_,i)=>i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const filled = order.slice(0, count).sort((p, q) => p - q);
    filled.forEach((slot, index) => {
      // Pale at one end of the rack, darkest at the other.
      const spread = count > 1 ? index / (count - 1) - 0.5 : 0;
      const done = clamp01(a.burnt * 1.15 - 0.08 + spread * 0.5 + wobble(0.06));
      const mesh = slice(done, false);
      mesh.rotation.y = Math.PI / 2;
      mesh.rotation.x = 0;
      const holder = new THREE.Group();
      holder.add(mesh);
      holder.position.set(x0 + (slot + 0.5) * pitch + wobble(0.002), railY + wire, wobble(0.004));
      holder.rotation.z = wobble(a.bread === 'doorstop' ? 0.05 : 0.16);
      holder.updateMatrixWorld(true);holder.position.y+=railY+wire-new THREE.Box3().setFromObject(holder,true).min.y;
      r.root.add(holder);
    });

    // What the rack stands on.
    let lift = 0;
    if (a.under === 'tray') {
      const tray = s.lathe([[0, 0.004], [0.1, 0.004], [0.112, 0.011], [0.116, 0.011], [0.104, 0], [0, 0]], s.material('#dfe1e0', { metalness: 0.9, roughness: 0.22 + mood.wear * 0.3, side: THREE.DoubleSide }));
      tray.scale.set(1.22, 1, 0.82);
      tray.rotation.y = 0.5;
      lift = 0.004;
    } else if (a.under === 'doily') {
      s.lathe([[0, 0.005], [0.085, 0.005], [0.118, 0.014], [0.12, 0.012], [0.085, 0], [0, 0]], s.material('#f4f1e8', { roughness: 0.3, side: THREE.DoubleSide }));
      const lace = document.createElement('canvas');
      lace.width = lace.height = 256;
      const g = lace.getContext('2d')!;
      g.fillStyle = '#ffffff';
      g.beginPath();
      for (let i = 0; i <= 96; i++) { const angle = (i / 96) * Math.PI * 2, rad = 118 + Math.abs(Math.sin(angle * 12)) * 9; g.lineTo(128 + Math.cos(angle) * rad, 128 + Math.sin(angle) * rad); }
      g.fill();
      g.globalCompositeOperation = 'destination-out';
      for (let ring = 0; ring < 3; ring++)
        for (let i = 0; i < 24 + ring * 8; i++) { const angle = (i / (24 + ring * 8)) * Math.PI * 2, rad = 60 + ring * 22; g.beginPath(); g.arc(128 + Math.cos(angle) * rad, 128 + Math.sin(angle) * rad, 5, 0, Math.PI * 2); g.fill(); }
      const texture = new THREE.CanvasTexture(lace);
      texture.colorSpace = THREE.SRGBColorSpace;
      const mat = s.mesh(new THREE.PlaneGeometry(0.19, 0.19), new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.5, roughness: 1 }), [0, 0.0056, 0]);
      mat.rotation.x = -Math.PI / 2;
      mat.castShadow = false;
      lift = 0.0058;
    } else if (a.under === 'napkin') {
      const linen = s.material(mood.cheer > 0.55 ? '#f1e8d2' : '#d9d6cc', { roughness: 1 });
      s.box([0.25, 0.004, 0.17], [0, 0.002, 0], linen).rotation.y = 0.5;
      s.box([0.25, 0.004, 0.085], [0.012, 0.006, -0.03], linen).rotation.y = 0.5;
      lift = 0.006;
    }
    r.root.rotation.y = 0.5;
    r.root.position.y = lift;
    s.root.add(r.root);

    // Crumbs shaken out beneath the rack.
    const crumbs = Math.round(mix(12, 70, mood.density) * (0.5 + count / 6));
    s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#ffffff', { roughness: 1 }), Array.from({ length: crumbs }, () => {
      const along = wobble(length * 0.62), across = wobble(0.055);
      const done = clamp01(a.burnt + wobble(0.3));
      return {
        at: [Math.cos(0.5) * along + Math.sin(0.5) * across, lift + 0.0012, -Math.sin(0.5) * along + Math.cos(0.5) * across] as const,
        size: 0.0012 + random() * 0.0022,
        color: toastTone(done).multiplyScalar(0.85),
      };
    }));

    // Side plate, in front.
    const px = 0.04, pz = 0.155;
    const china = s.material('#f5f2ea', { roughness: 0.28, side: THREE.DoubleSide });
    if (a.bitten || a.beside !== 'none') {
      s.lathe([[0, 0.005], [0.052, 0.005], [0.078, 0.012], [0.08, 0.0105], [0.055, 0], [0, 0]], china, [px, 0, pz]);
      s.ring(0.0785, 0.0012, [px, 0.0118, pz], s.material(a.metal === 'brass' ? '#c9a04a' : '#8a9aa8', { metalness: 0.6, roughness: 0.3 })).rotation.x = Math.PI / 2;
    }
    if (a.bitten) {
      const mesh = slice(clamp01(a.burnt * 1.1 + wobble(0.08)), true);
      mesh.rotation.set(-Math.PI / 2, 0, 0.5 + wobble(0.5));
      mesh.position.set(px - 0.012, 0.0055 + thick / 2, pz + 0.045);
      s.root.add(mesh);
      s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#c99a55', { roughness: 1 }), Array.from({ length: 14 }, () => ({
        at: [px + 0.03 + wobble(0.03), 0.0062, pz - 0.01 + wobble(0.03)] as const, size: 0.001 + random() * 0.002,
      })));
    }
    const bx = a.bitten ? -0.11 : px, bz = a.bitten ? 0.12 : pz;
    const butter = s.material('#f5dd7c', { roughness: 0.35 });
    const steel = s.material('#d9dcdc', { metalness: 0.9, roughness: 0.22 });
    if (a.beside !== 'none' && a.bitten) s.lathe([[0, 0.004], [0.034, 0.004], [0.046, 0.012], [0.047, 0.0105], [0.034, 0], [0, 0]], china, [bx, 0, bz]);
    const by = a.bitten ? 0.0045 : 0.0055;
    if (a.beside === 'curls') {
      for (let i = 0; i < 5; i++) {
        const curl = s.ring(0.006 + random() * 0.002, 0.0028, [bx + wobble(0.018), by + 0.008 + (i > 2 ? 0.008 : 0), bz + wobble(0.018)], butter, Math.PI * 1.7);
        curl.rotation.set(wobble(0.4), random() * 3, wobble(0.4));
        curl.scale.z = 3.2;
      }
    } else if (a.beside === 'slab') {
      s.box([0.05, 0.016, 0.03], [bx, by + 0.008, bz], butter).rotation.y = 0.3;
      const knife = new Sculpture(context);
      knife.box([0.085, 0.0012, 0.014], [0.03, 0, 0], steel);
      knife.box([0.065, 0.007, 0.011], [-0.045, 0, 0], s.material('#efe6cf', { roughness: 0.4 }));
      knife.root.position.set(bx + 0.012, by + 0.014, bz + 0.004);
      knife.root.rotation.set(0, -0.6 + wobble(0.3), -0.18);
      s.root.add(knife.root);
    } else if (a.beside === 'portions') {
      const foil = s.material('#d8c26a', { metalness: 0.8, roughness: 0.35 });
      for (let i = 0; i < 3; i++) s.box([0.022, 0.008, 0.022], [bx - 0.02 + i * 0.012 + wobble(0.006), by + 0.004 + i * 0.0035, bz + 0.02 + wobble(0.008)], foil).rotation.set(wobble(0.15), random() * 3, wobble(0.15));
      const jams = ['#b7322c', '#e08a1e', '#4a1f4f'];
      for (let i = 0; i < 2; i++) {
        const jx = bx + 0.012 + i * 0.026 - (a.bitten ? 0.012 : 0), jz = bz - 0.018 + wobble(0.008);
        const tint = jams[Math.floor(random() * jams.length)];
        s.cylinder(0.0105, 0.0095, 0.02, [jx, by + 0.01, jz], s.material(tint, { roughness: 0.2 }), 16);
        s.cylinder(0.0115, 0.0115, 0.005, [jx, by + 0.0225, jz], s.material('#f3efe2', { roughness: 0.4 }), 16);
      }
    }

    // Serving tools lie on the tabletop to the left of the rack.
    const tool=new Sculpture(context),wood=tool.material('#ac7846'),ix=-.17,iz=-.018;
    if(a.service==='tongs'){tool.tube([[-.009,.003,.055],[-.012,.003,-.038],[0,.003,-.05],[.012,.003,-.038],[.009,.003,.055]],.0025,steel);for(const x of [-.009,.009])tool.box([.013,.002,.021],[x,.003,.055],steel);}
    if(a.service==='knife'){tool.box([.018,.008,.028],[0,.004,-.01],china);tool.box([.012,.0015,.074],[0,.010,-.035],steel);tool.box([.01,.006,.06],[0,.008,.031],wood);}
    if(a.service==='brush'){tool.box([.029,.01,.069],[0,.013,0],wood);for(let i=0;i<9;i++)for(let j=0;j<4;j++)tool.rod([-.01+j*.0067,.009,-.028+i*.007],[ -.01+j*.0067,.0008,-.028+i*.007],.0008,tool.material('#c8b68c'));}
    if(a.service==='card'){const front=tool.box([.055,.001,.038],[0,.018,.009],tool.material('#f0e8d5'));front.rotation.x=-1.1;const back=tool.box([.055,.001,.038],[0,.018,-.009],tool.material('#e4dac4'));back.rotation.x=1.1;const label=tool.label('TABLE 3',.043,.012,[0,.021,.009],'#46525a','#f0e8d5');label.rotation.x=-.47;}
    tool.root.position.set(ix,0,iz);tool.root.rotation.y=-.3;tool.root.updateMatrixWorld(true);tool.root.position.y-=new THREE.Box3().setFromObject(tool.root,true).min.y;s.root.add(tool.root);
    return s.finish();
  },
});
