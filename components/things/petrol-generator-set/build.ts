import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];

export default defineThing({
  questions: {
    foundation: choice('What keeps the set clear of the ground?', {
      feet: 'Its own rubber feet on the ground.', skids: 'Two stout timber skids.',
      slabs: 'A pair of low concrete sleepers.', tray: 'A shallow steel drip tray beneath the feet.',
    }),
    sideGuard: choice('What guards the exposed engine sides?', {
      open: 'Open sides with the engine visible.', rails: 'Two horizontal protective rails.',
      lattice: 'An open diamond lattice on each side.', sheet: 'Louvered metal side panels.',
    }),
    meter: choice('What extra instrument is fixed above the sockets?', {
      none: 'Only the original pilot light.', round: 'One round analog voltmeter.',
      paired: 'Two small analog meters side by side.', digital: 'One rectangular digital display.',
    }),
    serviceTools: choice('What maintenance equipment lies nearby?', {
      none: 'No tools left out.', spanner: 'Two spanners and a folded rag on a board.',
      spark: 'A socket wrench and spare spark plugs in a little tray.', oil: 'An oil bottle and small pouring cup.',
    }),
    cableRoute: choice('How does the extension lead cross the ground?', {
      direct: 'A broad direct curve.', loop: 'A loose service loop before the appliance.',
      edge: 'A squared route along the edge of the working area.', zigzag: 'A gently zigzagging lead.',
    }),
    exhaustShield: choice('What protects the hot silencer?', {
      bare: 'The bare cylindrical silencer.', hoops: 'Three protective hoops and two rails.',
      sleeve: 'A raised sheet-metal heat shield.', cage: 'A narrow open wire cage.',
    }),
    canopy: choice('What shades the generator?', {
      open: 'Nothing overhead.', sheet: 'A sloping sheet on four steel posts.',
      cloth: 'A low stretched cloth on timber posts.', pitched: 'A small pitched corrugated shelter.',
    }),
    starter: choice('What starting equipment is fitted?', {
      recoil: 'Only the original pull starter.', battery: 'A small battery and electric starter cable.',
      jump: 'An electric starter with a loose pair of jumper leads coiled beside the battery.',
    }),
    size: choice('How big is the generator?', {
      tiny: 'The smallest there is, a two-stroke lunchbox with a carry handle: "I better pass my neighbour".',
      medium: 'A mid-size set in a tubular steel frame.',
      large: 'A heavy frame set on two wheels with barrow handles.',
    }),
    state: choice('What is it doing right now?', {
      silent: 'Silent and cold, waiting for the lights to go.',
      running: 'Running steadily, humming and shivering.',
      struggling: 'Overloaded and struggling, shaking hard and coughing dark smoke.',
      empty: 'Run dry: fuel cap off, funnel standing in the tank, a keg beside it.',
    }),
    colour: choice('What colour is the fuel tank?', {
      red: 'Red.',
      blue: 'Blue.',
      yellow: 'Yellow.',
      green: 'Green.',
      black: 'Black, repainted by hand.',
    }),
    stain: score('How big is the oil stain under it?', ['Clean ground', 'A few drips', 'A dark patch', 'A wide black pool that has been there for years']),
    powers: choice('What is it powering at the other end of the lead?', {
      bulb: 'One bare bulb on a stick.',
      tv: 'A small television on a stool showing a football match.',
      fan: 'A standing fan turning its head.',
      speaker: 'A battered loudspeaker box.',
      strip: 'A power strip crowded with phone chargers.',
      nothing: 'Nothing: the lead lies coiled with its plug out.',
    }),
    post: choice('What is it chained to?', {
      wood: 'A leaning wooden post with old flyers nailed to it.',
      concrete: 'The stump of a concrete electricity pole, the irony intended.',
      iron: 'An iron stake hammered into the ground.',
      block: 'Nothing fixed: the chain runs through two concrete blocks.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const g = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const k = { tiny: 0.9, medium: 1.15, large: 1.5 }[a.size];
    const tank = g.material({ red: '#c8281e', blue: '#1f52b4', yellow: '#eab818', green: '#23803f', black: '#1e1e20' }[a.colour], { roughness: 0.4, metalness: 0.2 });
    const dark = g.material('#232326', { roughness: 0.7 });
    const steel = g.material('#a9aeb0', { metalness: 0.7, roughness: 0.35 });
    const frameMat = g.material(a.size === 'tiny' ? '#232326' : '#30343a', { metalness: 0.4, roughness: 0.5 });
    const running = a.state === 'running' || a.state === 'struggling';

    // Engine, alternator, fins, muffler.
    g.box([0.3, 0.24, 0.3], [0.08, 0.18, 0], dark);
    const alt = g.cylinder(0.115, 0.115, 0.22, [-0.19, 0.19, 0], steel, 16);
    alt.rotation.z = Math.PI / 2;
    for (let i = 0; i < 5; i++) { const ring = g.cylinder(0.12, 0.12, 0.012, [-0.27 + i * 0.04, 0.19, 0], dark, 16); ring.rotation.z = Math.PI / 2; }
    for (let i = 0; i < 6; i++) g.box([0.2, 0.012, 0.2], [0.1, 0.3 + i * 0.012, -0.02], steel);
    const muffler = g.cylinder(0.055, 0.055, 0.3, [0.27, 0.2, -0.02], g.material(mood.wear > 0.5 ? '#7a4a2c' : '#8f9496', { metalness: 0.5, roughness: 0.6 }), 12);
    muffler.rotation.x = Math.PI / 2;
    const pipe = g.rod([0.27, 0.2, -0.17], [0.34, 0.16, -0.24], 0.016, dark);
    pipe.castShadow = true;
    // Recoil starter with its pull handle.
    const recoil = g.cylinder(0.105, 0.105, 0.04, [0.08, 0.19, 0.17], dark, 16);
    recoil.rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const slot = g.box([0.06, 0.012, 0.006], [0.08 + Math.cos(i * 1.047) * 0.055, 0.19 + Math.sin(i * 1.047) * 0.055, 0.192], steel);
      slot.rotation.z = i * 1.047;
    }
    g.box([0.07, 0.022, 0.022], [0.17, 0.27, 0.2], g.material('#e9e6dc'));
    // Control panel: sockets, breaker, a pilot light.
    g.box([0.2, 0.16, 0.03], [-0.19, 0.2, 0.2], g.material('#c9c6ba'));
    for (const x of [-0.24, -0.15]) g.box([0.045, 0.045, 0.01], [x, 0.17, 0.218], dark);
    g.box([0.03, 0.02, 0.012], [-0.24, 0.245, 0.218], g.material('#c8281e'));
    g.ball([0.012, 0.012, 0.008], [-0.15, 0.245, 0.218], g.material('#3aff7a', { emissive: '#3aff7a', emissiveIntensity: running ? 2 : 0 }), 8);
    // Extra controls sit on a small bracket attached to the existing panel.
    if(a.meter!=='none'){
      g.box([.22,.1,.025],[-.19,.315,.208],frameMat);
      if(a.meter==='digital'){
        g.box([.16,.06,.012],[-.19,.315,.228],dark);
        for(let i=0;i<3;i++)for(const dy of[-.017,0,.017])g.box([.025,.004,.005],[-.235+i*.045,.315+dy,.237],g.material(running?'#7cde8c':'#57625a'));
      }else{
        const xs=a.meter==='paired'?[-.245,-.135]:[-.19];
        for(const x of xs){const face=g.cylinder(.036,.036,.014,[x,.315,.229],steel,20);face.rotation.x=Math.PI/2;
          const dial=g.cylinder(.029,.029,.016,[x,.315,.232],g.material('#e8e1cf'),20);dial.rotation.x=Math.PI/2;
          g.rod([x,.315,.242],[x+.017,.33,.242],.002,dark);}
      }
    }
    if(a.sideGuard!=='open')for(const side of[-1,1]){
      const z=side*.245;for(const x of[-.33,.33]){g.rod([x,.06,z],[x,.38,z],.012,frameMat);g.rod([Math.sign(x)*.26,.06,side*.2],[x,.06,z],.012,frameMat);}
      if(a.sideGuard==='rails')for(const y of[.13,.32])g.rod([-.33,y,z],[.33,y,z],.012,frameMat);
      else if(a.sideGuard==='lattice')for(let i=0;i<5;i++)for(const sign of[-1,1])g.rod([-.32+i*.125,.08,z],[Math.max(-.32,Math.min(.32,-.32+i*.125+sign*.1)),.36,z],.006,frameMat);
      else{g.box([.6,.25,.014],[0,.21,z],tank);for(let i=0;i<6;i++){const louver=g.box([.075,.018,.028],[-.25+i*.1,.235,z+side*.014],frameMat);louver.rotation.x=side*.35;}}
    }
    if(a.exhaustShield!=='bare'){
      if(a.exhaustShield==='sleeve'){
        g.box([.15,.012,.34],[.27,.275,-.02],steel);for(const z of[-.14,.1])for(const x of[.21,.33])g.rod([x,.19,z],[x,.275,z],.006,steel);
      }else{
        for(const z of[-.17,-.02,.13])g.ring(.074,.005,[.27,.2,z],steel);
        for(let i=0;i<(a.exhaustShield==='cage'?8:2);i++){const t=i*Math.PI*2/(a.exhaustShield==='cage'?8:2);g.rod([.27+Math.cos(t)*.074,.2+Math.sin(t)*.074,-.17],[.27+Math.cos(t)*.074,.2+Math.sin(t)*.074,.13],.005,steel);}
        for(const z of[-.14,.1])g.rod([.22,.15,z],[.25,.08,z],.007,frameMat);
      }
    }
    if(a.starter!=='recoil'){
      g.box([.22,.018,.18],[-.13,.068,-.15],frameMat);
      g.box([.17,.12,.13],[-.13,.137,-.15],dark);
      for(const x of[-.18,-.08])g.cylinder(.012,.012,.025,[x,.209,-.15],steel,8);
      g.tube([[-.18,.22,-.15],[-.22,.23,-.05],[-.1,.16,.02]],.006,g.material('#ba3027'));
      g.tube([[-.08,.22,-.15],[.02,.2,-.12],[.08,.12,-.1]],.006,dark);
      if(a.starter==='jump')for(let i=0;i<2;i++){const coil=g.ring(.06,.006,[-.12,.215+i*.013,-.15],i?dark:g.material('#ba3027'));coil.rotation.x=Math.PI/2;}
    }
    // Tank with cap and gauge.
    g.box([0.54, 0.1, 0.38], [0, 0.44, 0], tank);
    g.ball([0.27, 0.07, 0.19], [0, 0.49, 0], tank, 16);
    g.cylinder(0.02, 0.02, 0.01, [-0.14, 0.555, 0], g.material('#e9e6dc'), 10);
    if (a.state !== 'empty') g.cylinder(0.04, 0.04, 0.03, [0.1, 0.565, 0], dark, 12);
    else g.cylinder(0.03, 0.03, 0.012, [0.1, 0.555, 0], dark, 12);
    g.box([0.2, 0.05, 0.004], [0, 0.44, 0.192], g.material('#f0efe8'));
    // Frame or handle, feet, wheels.
    if (a.size === 'tiny') {
      for (const x of [-1, 1]) g.rod([x * 0.2, 0.5, 0], [x * 0.2, 0.64, 0], 0.012, frameMat);
      g.rod([-0.2, 0.64, 0], [0.2, 0.64, 0], 0.014, frameMat);
      g.box([0.56, 0.04, 0.4], [0, 0.04, 0], dark);
    } else {
      for (const z of [-1, 1]) {
        const loop: P[] = [[-0.33, 0.03, z * 0.24], [0.33, 0.03, z * 0.24], [0.36, 0.3, z * 0.24], [0.33, 0.6, z * 0.24], [-0.33, 0.6, z * 0.24], [-0.36, 0.3, z * 0.24]];
        g.tube(loop, 0.016, frameMat, true);
      }
      for (const x of [-0.33, 0.33]) for (const y of [0.03, 0.6]) g.rod([x, y, -0.24], [x, y, 0.24], 0.014, frameMat);
      g.box([0.6, 0.02, 0.1], [0, 0.05, 0], frameMat);
    }
    for (const x of [-1, 1]) for (const z of [-1, 1]) g.cylinder(0.025, 0.03, 0.03, [x * 0.26, 0.015, z * 0.2], dark, 8);
    if (a.size === 'large') {
      for (const z of [-1, 1]) {
        const wheel = g.cylinder(0.1, 0.1, 0.05, [0.3, 0.1, z * 0.29], dark, 16);
        wheel.rotation.x = Math.PI / 2;
        g.rod([-0.33, 0.6, z * 0.24], [-0.62, 0.52, z * 0.24], 0.014, frameMat);
        g.rod([-0.62, 0.52, z * 0.24], [-0.72, 0.52, z * 0.24], 0.02, dark);
      }
      g.box([0.16, 0.12, 0.1], [-0.2, 0.09, -0.16], dark);
    }
    // Wear: rust, a rag stuffed in, tape on the tank.
    if (mood.wear > 0.4) for (let i = 0; i < Math.round(mood.wear * 6); i++) g.ball([0.03 + random() * 0.03, 0.02, 0.004], [(random() - 0.5) * 0.5, 0.4 + random() * 0.08, 0.192], g.material('#7a4a2c'), 6);
    if (mood.wear > 0.65) g.box([0.56, 0.03, 0.39], [0.16, 0.44, 0], g.material('#8a8f92')).scale.x = 0.1;
    const foundationY=a.foundation==='feet'?0:a.foundation==='tray'?.018:.09;
    if(a.foundation==='skids'||a.foundation==='slabs')for(const z of[-.2,.2])s.box([.78*k,foundationY,.14*k],[0,foundationY/2,z*k],s.material(a.foundation==='skids'?'#836345':'#96958b'));
    else if(a.foundation==='tray'){
      const tray=s.material('#697479',{metalness:.45});s.box([.9*k,.018,.7*k],[0,.009,0],tray);
      for(const x of[-.45,.45])s.box([.012,.055,.7*k],[x*k,.0275,0],tray);
      for(const z of[-.35,.35])s.box([.9*k,.055,.012],[0,.0275,z*k],tray);
    }
    g.root.position.y=foundationY;
    g.root.scale.setScalar(k);
    g.root.rotation.y = (random() - 0.5) * 0.5;
    s.root.add(g.root);g.root.updateMatrixWorld(true);
    if(a.canopy!=='open'){
      const mat=s.material(a.canopy==='cloth'?'#b9a37c':'#9ba4a3',{metalness:a.canopy==='cloth'?0:.35});
      const wood=s.material(a.canopy==='cloth'?'#785f42':'#495556');const rx=.53*k,rz=.43*k,h=1.08*k+foundationY;
      for(const x of[-rx,rx])for(const z of[-rz,rz])s.rod([x,0,z],[x,h+(a.canopy==='pitched'?0:z*.16),z],.018,wood);
      if(a.canopy==='pitched'){
        for(const sign of[-1,1]){const panel=s.box([rx*2+.1,.025,Math.hypot(rz,.2*k)+.05],[0,h+.1*k,sign*rz/2],mat);panel.rotation.x=sign*Math.atan2(.2*k,rz);
          for(let i=0;i<9;i++)s.rod([-rx+i*rx/4,h+.2*k,0],[-rx+i*rx/4,h,sign*rz],.008,mat);}
        for(const x of[-rx,rx]){s.rod([x,h,-rz],[x,h+.2*k,0],.015,wood);s.rod([x,h+.2*k,0],[x,h,rz],.015,wood);}
      }else{const roof=s.box([rx*2+.1,.025,rz*2+.1],[0,h,0],mat);roof.rotation.x=-Math.atan(.16);}
      for(const z of[-rz,rz])s.rod([-rx,h+(a.canopy==='pitched'?0:z*.16),z],[rx,h+(a.canopy==='pitched'?0:z*.16),z],.015,wood);
    }

    // Oil stain.
    if (a.stain > 0.08) {
      const oil = s.material('#1f1b18', { roughness: 0.25 });
      const r = mix(0.06, 0.62, a.stain) * k;
      const pool = s.cylinder(r, r, 0.004, [0.04, 0.002, 0.03], oil, 20);
      pool.scale.set(1.25, 1, 0.9);
      pool.rotation.y = random() * 3;
      for (let i = 0; i < 2 + Math.round(a.stain * 7); i++) {
        const t = random() * 6.28, d = r * (0.9 + random() * 0.7);
        const drip = s.cylinder(0.02 + random() * 0.05 * a.stain, 0.03, 0.003, [Math.cos(t) * d, 0.002, Math.sin(t) * d * 0.8], oil, 8);
        drip.castShadow = false;
      }
    }

    // The post and the chain.
    const px = -0.42 - 0.3 * k, pz = -0.26;
    const postR = { wood: 0.07, concrete: 0.11, iron: 0.03, block: 0.14 }[a.post];
    if (a.post === 'wood') {
      const post = s.cylinder(0.06, 0.075, 1.5, [px, 0.75, pz], s.material('#7a5a3a'), 10);
      post.rotation.z = 0.07;
      for (let i = 0; i < 3; i++) {
        const flyer = s.box([0.14, 0.18, 0.004], [px - 0.03 + i * 0.01, 0.75 + i * 0.22, pz + 0.075], s.material(pick(['#f0e6a0', '#e8c8d0', '#d0e0f0', '#f4f1e4'])));
        flyer.rotation.z = (random() - 0.5) * 0.4;
      }
    } else if (a.post === 'concrete') {
      s.cylinder(0.1, 0.12, 1.25, [px, 0.625, pz], s.material('#a9a79c'), 6);
      for (let i = 0; i < 3; i++) s.rod([px + (i - 1) * 0.04, 1.25, pz], [px + (i - 1) * 0.07, 1.42 + random() * 0.1, pz + (random() - 0.5) * 0.08], 0.008, s.material('#7a4a2c'));
      s.box([0.16, 0.09, 0.006], [px, 0.95, pz + 0.105], s.material('#f2d24a'));
    } else if (a.post === 'iron') {
      s.rod([px, 0, pz], [px + 0.04, 0.62, pz], 0.022, s.material('#5a4a40', { metalness: 0.5 }));
      s.ring(0.045, 0.012, [px + 0.04, 0.63, pz], s.material('#5a4a40', { metalness: 0.5 }));
    } else {
      for (let i = 0; i < 2; i++) {
        const block = s.box([0.4, 0.2, 0.2], [px + 0.05, 0.1 + i * 0.2, pz + i * 0.04], s.material('#a39f94'));
        block.rotation.y = i * 0.3;
        for (const x of [-0.09, 0.09]) s.box([0.12, 0.202, 0.1], [px + 0.05 + x, 0.1 + i * 0.2, pz + i * 0.04], s.material('#55524b')).rotation.y = i * 0.3;
      }
    }
    const loopY = a.post === 'block' ? 0.12 : a.post === 'iron' ? 0.1 : 0.28;
    const anchor=g.root.localToWorld(new THREE.Vector3(a.size==='tiny'?-.26:-.345,a.size==='tiny'?.03:.22,-.2)).toArray() as P;
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(...anchor), new THREE.Vector3((anchor[0] + px) / 2, 0.02, (anchor[2] + pz) / 2 + 0.1),
      new THREE.Vector3(px + postR + 0.03, loopY * 0.6, pz + 0.05), new THREE.Vector3(px, loopY, pz + postR + 0.02), new THREE.Vector3(px - postR - 0.02, loopY, pz),
      new THREE.Vector3(px, loopY, pz - postR - 0.02), new THREE.Vector3(px + postR + 0.04, loopY * 0.7, pz - 0.03), new THREE.Vector3((anchor[0] + px) / 2 + 0.05, 0.02, (anchor[2] + pz) / 2 - 0.08),
      new THREE.Vector3(anchor[0] + 0.02, 0.07 * k, anchor[2] + 0.03),
    ]);
    const linkLength = 0.045;
    const links = Math.ceil(path.getLength() / linkLength);
    const chain = new THREE.InstancedMesh(new THREE.TorusGeometry(0.02, 0.0055, 5, 10), s.material(mood.wear > 0.5 ? '#6a5a50' : '#8a8f92', { metalness: 0.7, roughness: 0.45 }), links);
    const dummy = new THREE.Object3D();
    const xAxis = new THREE.Vector3(1, 0, 0);
    for (let i = 0; i < links; i++) {
      const u = i / links;
      dummy.position.copy(path.getPointAt(u));
      dummy.quaternion.setFromUnitVectors(xAxis, path.getTangentAt(u).normalize());
      dummy.rotateX(i % 2 ? Math.PI / 2 : 0);
      dummy.scale.set(1.5, 1, 1);
      dummy.updateMatrix();
      chain.setMatrixAt(i, dummy.matrix);
    }
    chain.castShadow = true;
    s.root.add(chain);
    s.box([0.06, 0.055, 0.025], [anchor[0] - 0.02, anchor[1] - 0.06 * k, anchor[2] - 0.02], s.material('#c9a84a', { metalness: 0.8, roughness: 0.3 }));

    // Funnel and fuel.
    const funnelMat = s.material(pick(['#d8342c', '#2a62c8', '#e8e2d0', '#2ca05a']), { side: THREE.DoubleSide });
    const funnel = new THREE.Group();
    funnel.add(s.mesh(new THREE.CylinderGeometry(0.09, 0.015, 0.1, 14, 1, true), funnelMat, [0, 0.1, 0]), s.cylinder(0.014, 0.01, 0.08, [0, 0.02, 0], funnelMat, 8));
    const kegAt: P = [0.25 * k + 0.4, 0, 0.5];
    if (a.state === 'empty') {
      funnel.position.set(...g.root.localToWorld(new THREE.Vector3(0.1, 0.56, 0)).toArray());
    } else {
      funnel.position.set(kegAt[0] - 0.25, 0.09, kegAt[2] + 0.12);
      funnel.rotation.set(Math.PI / 2 + 0.2, 0, random() * 3);
      funnel.updateMatrixWorld(true);funnel.position.y-=new THREE.Box3().setFromObject(funnel,true).min.y;
    }
    s.root.add(funnel);
    const keg = s.box([0.24, 0.34, 0.16], [kegAt[0], 0.17, kegAt[2]], s.material(pick(['#e8c020', '#e8c020', '#2a5fc0', '#f0efe8']), { roughness: 0.5 }));
    keg.rotation.y = random() * 3;
    s.cylinder(0.028, 0.028, 0.04, [kegAt[0], 0.36, kegAt[2]], s.material('#1e1e20'), 8).visible = a.state !== 'empty';
    if (a.state === 'empty') { s.cylinder(0.03, 0.03, 0.02, [kegAt[0] + 0.2, 0.01, kegAt[2] + 0.1], s.material('#1e1e20'), 8); s.box([0.3, 0.004, 0.2], [kegAt[0] - 0.2, 0.002, kegAt[2] + 0.2], s.material('#8a7a5a')).rotation.y = 0.4; }

    // Extension lead and what it feeds.
    const orange = s.material('#e87a1c');
    const socket = g.root.localToWorld(new THREE.Vector3(-0.24, 0.17, 0.23)).toArray() as P;
    const ex = 0.8 + 0.25 * k, ez = 0.0;
    if(a.serviceTools!=='none'){
      const x=kegAt[0],z=kegAt[2]+.48,wood=s.material('#8c7150');
      s.box([.5,.025,.26],[x,.0125,z],wood);
      if(a.serviceTools==='spanner'){
        for(const dz of[-.06,.06]){s.rod([x-.15,.037,z+dz],[x+.13,.037,z+dz],.012,steel);for(const dx of[-.17,.15]){const jaw=s.ring(.033,.009,[x+dx,.037,z+dz],steel,Math.PI*1.45);jaw.rotation.x=Math.PI/2;}}
        s.box([.1,.025,.09],[x+.14,.042,z+.08],s.material('#ac9d7c'));
      }else if(a.serviceTools==='spark'){
        s.rod([x-.16,.04,z-.07],[x+.09,.04,z-.07],.011,steel);s.rod([x+.09,.04,z-.07],[x+.09,.04,z+.06],.011,steel);
        for(const dx of[-.1,0,.1]){s.cylinder(.014,.014,.06,[x+dx,.055,z+.06],steel,8);s.cylinder(.012,.012,.04,[x+dx,.105,z+.06],s.material('#e5dfcf'),8);}
      }else{
        s.box([.11,.19,.08],[x-.1,.12,z],s.material('#b6a039'));s.cylinder(.018,.018,.04,[x-.1,.235,z],dark,8);
        s.lathe([[0,0],[.055,0],[.065,.09],[.055,.09],[.045,.012],[0,.012]],steel,[x+.1,.025,z]);
      }
    }
    const spinner: THREE.Object3D[] = [];
    const glows: THREE.MeshStandardMaterial[] = [];
    const on = running;
    const emit = (colour: string, strength: number) => { const m = new THREE.MeshStandardMaterial({ color: on ? colour : '#55585a', emissive: on ? colour : '#000000', emissiveIntensity: on ? strength : 0, roughness: 0.4 }); if (on) glows.push(m); return m; };
    if (a.powers === 'nothing') {
      s.ring(0.14, 0.012, [ex - 0.3, 0.015, 0.3], orange).rotation.x = Math.PI / 2;
      s.ring(0.12, 0.012, [ex - 0.29, 0.035, 0.31], orange).rotation.x = Math.PI / 2;
      s.box([0.05, 0.03, 0.04], [ex - 0.12, 0.02, 0.36], s.material('#f0efe8'));
    } else {
      const lead:P[]=[socket,[socket[0],.03,socket[2]+.25]];
      if(a.cableRoute==='direct')lead.push([.35,.012,.75],[ex-.3,.012,.45]);
      else if(a.cableRoute==='loop')for(let i=0;i<=12;i++){const t=i*Math.PI*2/12;lead.push([.36+Math.sin(t)*.2,.012,.76+Math.cos(t)*.2]);}
      else if(a.cableRoute==='edge')lead.push([socket[0],.012,1.05],[ex+.25,.012,1.05],[ex+.25,.012,.4]);
      else for(let i=0;i<6;i++)lead.push([.05+i*.15,.012,.65+(i%2)*.16]);
      lead.push([ex-.05,.012,ez+.22]);s.tube(lead,.009,orange);
      s.box([0.06, 0.035, 0.05], [ex - 0.05, 0.02, ez + 0.2], s.material('#f0efe8'));
    }
    if (a.powers === 'bulb') {
      s.rod([ex, 0, ez], [ex + 0.03, 1.25, ez], 0.014, s.material('#7a5a3a'));
      s.tube([[ex - 0.05, 0.03, ez + 0.2], [ex + 0.03, 0.5, ez + 0.03], [ex + 0.05, 1.22, ez + 0.02], [ex + 0.03, 1.16, ez + 0.1]], 0.005, s.material('#1e1e20'));
      s.ball([0.045, 0.06, 0.045], [ex + 0.03, 1.09, ez + 0.1], emit('#ffe6a0', 2.4), 10);
    }
    if (a.powers === 'tv') {
      const stool = s.material(pick(['#2a62c8', '#c8322a', '#f0f0e8']));
      s.cylinder(0.17, 0.21, 0.44, [ex, 0.22, ez], stool, 12);
      s.box([0.42, 0.32, 0.3], [ex, 0.60, ez], s.material('#2a2a2e'));
      s.box([0.34, 0.25, 0.01], [ex, 0.62, ez + 0.152], emit('#3aa04a', 1.3));
      s.box([0.004, 0.25, 0.012], [ex, 0.62, ez + 0.153], emit('#f0fff0', 1.3));
      s.ring(0.045, 0.003, [ex, 0.62, ez + 0.158], emit('#f0fff0', 1.3));
      for (const x of [-1, 1]) s.rod([ex, 0.77, ez - 0.05], [ex + x * 0.2, 1.05, ez - 0.08], 0.004, s.material('#a9aeb0'));
    }
    if (a.powers === 'fan') {
      s.cylinder(0.17, 0.2, 0.03, [ex, 0.015, ez], s.material('#e9e6dc'), 14);
      s.rod([ex, 0, ez], [ex, 0.95, ez], 0.016, s.material('#e9e6dc'));
      const head = new THREE.Group();
      head.position.set(ex, 0.98, ez);
      const cage = s.ring(0.2, 0.008, [0, 0, 0.08], s.material('#a9aeb0'));
      const cage2 = s.ring(0.11, 0.005, [0, 0, 0.1], s.material('#a9aeb0'));
      const motor = s.cylinder(0.05, 0.06, 0.12, [0, 0, 0], s.material('#e9e6dc'), 10);
      motor.rotation.x = Math.PI / 2;
      const blades = new THREE.Group();
      for (let i = 0; i < 3; i++) { const blade = s.box([0.17, 0.07, 0.006], [Math.cos(i * 2.094) * 0.09, Math.sin(i * 2.094) * 0.09, 0], s.material('#6fa8d8')); blade.rotation.z = i * 2.094; blades.add(blade); }
      blades.position.z = 0.07;
      head.add(cage, cage2, motor, blades);
      head.rotation.y = -0.6;
      s.root.add(head);
      if (on) spinner.push(blades);
    }
    if (a.powers === 'speaker') {
      s.box([0.42, 0.72, 0.36], [ex, 0.36, ez], s.material('#2a2622'));
      for (const [y, r] of [[0.24, 0.15], [0.56, 0.08]] as const) {
        const cone = s.cylinder(r, r, 0.02, [ex, y, ez + 0.185], s.material('#55524b'), 16);
        cone.rotation.x = Math.PI / 2;
        s.ball([r * 0.4, r * 0.4, 0.02], [ex, y, ez + 0.195], s.material('#1a1a1c'), 10);
      }
      s.ball([0.012, 0.012, 0.008], [ex + 0.16, 0.68, ez + 0.185], emit('#ff3a2a', 2), 6);
    }
    if (a.powers === 'strip') {
      s.box([0.4, 0.03, 0.07], [ex, 0.015, ez], s.material('#f0efe8'));
      for (let i = 0; i < 5; i++) {
        s.box([0.035, 0.035, 0.035], [ex - 0.15 + i * 0.075, 0.045, ez], s.material(i % 2 ? '#f0efe8' : '#1e1e20'));
        const px2 = ex - 0.25 + i * 0.13 + (random() - 0.5) * 0.05, pz2 = ez + 0.22 + random() * 0.15;
        const phone = s.box([0.07, 0.01, 0.14], [px2, 0.006, pz2], s.material('#1c1c20'));
        phone.rotation.y = (random() - 0.5) * 1.2;
        s.box([0.05, 0.004, 0.1], [px2, 0.012, pz2], emit(pick(['#6affa0', '#a8d8ff', '#ffe08a']), 1)).rotation.y = phone.rotation.y;
        s.tube([[ex - 0.15 + i * 0.075, 0.05, ez], [(ex + px2) / 2, 0.02, ez + 0.12], [px2, 0.012, pz2 - 0.06]], 0.004, s.material('#e8e6de'));
      }
    }

    // Exhaust.
    const puffs: { mesh: THREE.Mesh; phase: number; size: number }[] = [];
    const outlet = g.root.localToWorld(new THREE.Vector3(0.34, 0.16, -0.24));
    const heavy = a.state === 'struggling';
    if (running) for (let i = 0; i < (heavy ? 8 : 4); i++) {
      const size = (heavy ? 0.09 : 0.05) + random() * 0.04;
      const mesh = s.ball([size, size, size], [outlet.x, outlet.y, outlet.z], new THREE.MeshStandardMaterial({ color: heavy ? '#3a3835' : '#9a968e', transparent: true, opacity: heavy ? 0.45 : 0.3, roughness: 1, depthWrite: false }), 8);
      mesh.castShadow = false;
      puffs.push({ mesh, phase: i / (heavy ? 8 : 4), size });
    }
    const dir = new THREE.Vector3(0.5, 0, -0.85).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.root.rotation.y);
    const place = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.phase + time * mix(0.25, 0.8, mood.energy)) % 1;
        puff.mesh.position.set(outlet.x + dir.x * t * 0.5, outlet.y + t * t * (heavy ? 1.0 : 0.6), outlet.z + dir.z * t * 0.5);
        puff.mesh.scale.setScalar(puff.size * (0.5 + t * 2));
        (puff.mesh.material as THREE.MeshStandardMaterial).opacity = (heavy ? 0.5 : 0.32) * (1 - t) + 0.02;
      }
    };
    place(0);
    const shake = !running ? 0 : (heavy ? 0.007 : 0.003) * mix(0.6, 1.6, mood.energy);
    const base = glows.map((m) => m.emissiveIntensity);
    return s.finish({
      update: (dt, time) => {
        g.root.position.set(Math.sin(time * 61) * shake, foundationY + Math.abs(Math.sin(time * 47)) * shake, Math.cos(time * 53) * shake);
        if (heavy) g.root.rotation.z = Math.sin(time * 23) * 0.01;
        place(time);
        for (const item of spinner) item.rotation.z += dt * 14;
        glows.forEach((m, i) => { m.emissiveIntensity = base[i] * (heavy ? 0.55 + 0.45 * Math.abs(Math.sin(time * 7 + Math.sin(time * 2.3) * 3)) : 0.95 + 0.05 * Math.sin(time * 30)); });
      },
    });
  },
});
