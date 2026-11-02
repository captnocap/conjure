import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

export default defineThing({
  questions: {
    colour: choice('What colour is the fountain painted?', {
      green: 'The classic deep carriage green.',
      red: 'Lacquer red, like the ones near Chinatown.',
      yellow: 'Bright egg-yolk yellow, cheerful and odd.',
      pink: 'Candy pink, a district being playful.',
      blue: 'Strong cobalt blue.',
      bronze: 'Bare dark bronze, unpainted and solemn.',
    }),
    model: choice('Which model is it?', {
      caryatids: 'The grand model: four draped women with raised arms holding up the dome.',
      columns: 'The plainer model: four slim columns instead of figures.',
    }),
    water: choice('What is the water doing?', {
      thread: 'A thin steady thread falling from under the dome.',
      generous: 'Running hard and splashing, the basin brimming.',
      dry: 'Shut off: a dry basin with a few leaves in it.',
      frozen: 'Frozen into a single icicle over a basin of white ice.',
    }),
    rim: choice('What is on the rim of the basin?', {
      nothing: 'Nothing.',
      cup: 'A tin cup on a short chain, as there used to be.',
      pigeon: 'A pigeon leaning in to drink.',
      sparrows: 'Two sparrows.',
      bottle: 'A plastic bottle left half filled.',
      glove: 'A child\'s lost mitten, set there for its owner to find.',
    }),
    gilt: noul('Are the ornaments picked out in gold?'),
    puddle: noul('Has water pooled on the ground around the base?'),
    pad: choice('What does it stand on?', {
      stone: 'An octagonal stone kerb.',
      grate: 'A round iron tree-grate pattern set in the pavement.',
      cobbles: 'A ring of small cobbles.',
    }),
    pedestalBands: choice('What encircles the pedestal panels?', { plain: 'Plain panel edges.', collars: 'Two narrow metal collars.', beads: 'A row of small beads below the basin.', wreaths: 'Small cast wreaths on alternate faces.' }),
    domeRibs: choice('What follows the curve of the dome?', { scales: 'The original scales alone.', four: 'Four raised ribs.', eight: 'Eight fine ribs.', petals: 'Four broad looped petal outlines.' }),
    basinLip: choice('How is the basin lip ornamented?', { plain: 'A plain rounded lip.', beaded: 'A continuous ring of small beads.', scalloped: 'Eight small scallop ornaments.', banded: 'Two fine bright bands.' }),
    outlet: choice('What hardware sits at the water outlet?', { plain: 'A short plain nozzle.', rose: 'A small perforated rose.', collar: 'A flared bell-shaped collar.', cross: 'A nozzle held in a four-armed cross.' }),
    drainGrille: choice('What lies at the foot on the street side?', { none: 'No separate drain.', bars: 'A rectangular barred drain.', round: 'A small round radial drain.', slots: 'A narrow line of drainage slots.' }),
    maintenancePlate: choice('What marks the lower pedestal?', { none: 'No maintenance plate.', enamel: 'A little pale enamel service plate.', brass: 'A brass maker’s plaque.', latch: 'A hinged inspection door and latch.' }),
    nearbyVessel: choice('What waits beside the fountain?', { none: 'No vessel.', pail: 'A galvanized pail.', can: 'A green watering can.', bowl: 'A low stoneware drinking bowl.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const hue = new THREE.Color({ green: '#1d4c38', red: '#a52428', yellow: '#e0b22a', pink: '#d8789a', blue: '#2a5ba0', bronze: '#4a3a28' }[a.colour]);
    hue.lerp(new THREE.Color('#6c5a44'), mood.wear * 0.25);
    const iron = s.material(hue, { metalness: a.colour === 'bronze' ? 0.7 : 0.3, roughness: 0.45 });
    const gold = a.gilt ? s.material('#c9a23a', { metalness: 0.7, roughness: 0.35 }) : iron;
    const lathe = (profile: [number, number][], material: THREE.Material, segments: number, turn = 0) => {
      const mesh = s.mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments), material);
      mesh.rotation.y = turn;
      return mesh;
    };

    // What it stands on.
    if (a.pad === 'stone') lathe([[0, 0.07], [0.82, 0.07], [0.86, 0.0]], s.material('#b7b1a2', { roughness: 0.95 }), 8, Math.PI / 8);
    else if (a.pad === 'grate') {
      const dark = s.material('#3a3d3c', { metalness: 0.5 });
      for (const r of [0.5, 0.68, 0.86]) s.ring(r, 0.025, [0, 0.025, 0], dark).rotation.x = Math.PI / 2;
      for (let i = 0; i < 12; i++) { const t = i * Math.PI / 6; s.rod([Math.sin(t) * 0.5, 0.025, Math.cos(t) * 0.5], [Math.sin(t) * 0.86, 0.025, Math.cos(t) * 0.86], 0.02, dark); }
    } else {
      const tones = ['#8d8a82', '#a09a8e', '#77756f', '#958c7c'];
      const stones = [];
      for (let ring = 0; ring < 2; ring++)
        for (let i = 0; i < 16 + ring * 6; i++) {
          const t = (i + random() * 0.3) * Math.PI * 2 / (16 + ring * 6), r = 0.6 + ring * 0.2;
          const size=.085+random()*.015;stones.push({at:[Math.sin(t)*r,size*.45,Math.cos(t)*r] as [number,number,number],size,color:tones[Math.floor(random()*4)]});
        }
      s.scatter(new THREE.SphereGeometry(1, 8, 6).scale(1, 0.45, 1), s.material('#ffffff', { roughness: 0.95 }), stones);
    }

    // Octagonal pedestal with panels, then the round basin.
    lathe([[0.5, 0], [0.5, 0.16], [0.42, 0.24], [0.4, 0.3], [0.37, 0.36], [0.37, 0.84], [0.42, 0.9], [0.5, 0.96], [0.5, 1.04], [0.3, 1.06]], iron, 8, Math.PI / 8);
    for (let i = 0; i < 8; i++) {
      const t = i * Math.PI / 4;
      const plate = s.box([0.2, 0.36, 0.02], [Math.sin(t) * 0.35, 0.6, Math.cos(t) * 0.35], i % 2 ? gold : iron);
      plate.rotation.y = t;
      if (i % 2 === 0) s.ball([0.05, 0.07, 0.03], [Math.sin(t) * 0.365, 0.6, Math.cos(t) * 0.365], gold, 10).rotation.y = t;
    }
    lathe([[0.3, 1.04], [0.44, 1.08], [0.5, 1.16], [0.5, 1.2], [0.46, 1.2], [0.4, 1.13], [0.15, 1.1], [0, 1.1]], iron, 32);

    // Figures or columns.
    const top = 2.02;
    for (let i = 0; i < 4; i++) {
      const t = i * Math.PI / 2 + Math.PI / 4, x = Math.sin(t) * 0.27, z = Math.cos(t) * 0.27;
      if (a.model === 'caryatids') {
        const figure = new THREE.Group();
        figure.add(s.lathe([[0.1, 0], [0.085, 0.12], [0.07, 0.34], [0.055, 0.5], [0.068, 0.6], [0.075, 0.68], [0.04, 0.74], [0.03, 0.78]], iron));
        figure.add(s.ball([0.05, 0.06, 0.05], [0, 0.82, 0], iron, 12));
        figure.add(s.ball([0.056, 0.035, 0.056], [0, 0.865, -0.01], gold, 10));
        const bent = i % 2 === 0;
        for (const side of [-1, 1]) {
          figure.add(s.rod([side * 0.07, 0.7, 0], [side * 0.13, bent ? 0.8 : 0.84, 0.02], 0.022, iron));
          figure.add(s.rod([side * 0.13, bent ? 0.8 : 0.84, 0.02], [side * 0.09, 0.93, 0.03], 0.02, iron));
        }
        figure.position.set(x, 1.1, z);
        figure.rotation.y = t;
        s.root.add(figure);
      } else {
        s.lathe([[0.055, 0], [0.06, 0.05], [0.035, 0.1], [0.03, 0.8], [0.05, 0.86], [0.06, 0.92]], iron, [x, 1.1, z]);
        s.ring(0.04, 0.012, [x, 1.5, z], gold).rotation.x = Math.PI / 2;
      }
    }

    // Dome with scales, dolphins reduced to a crown of buds, and a spike.
    lathe([[0, top - 0.02], [0.46, top - 0.02], [0.5, top + 0.02], [0.5, top + 0.07], [0.44, top + 0.11]], iron, 32);
    const scaleCanvas = document.createElement('canvas');
    scaleCanvas.width = 256; scaleCanvas.height = 128;
    const g = scaleCanvas.getContext('2d')!;
    g.fillStyle = `#${hue.getHexString()}`; g.fillRect(0, 0, 256, 128);
    for (let r = 6; r >= 0; r--)
      for (let c = -1; c <= 12; c++) {
        g.beginPath(); g.arc((c + (r % 2) * 0.5 + 0.5) * 256 / 12, r * 128 / 6, 11.5, 0, Math.PI);
        g.fillStyle = `rgba(255,255,255,${0.06 + ((r + c + 12) % 3) * 0.04})`; g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2.5; g.stroke();
      }
    const scales = new THREE.CanvasTexture(scaleCanvas);
    scales.colorSpace = THREE.SRGBColorSpace;
    lathe([[0.44, top + 0.11], [0.4, top + 0.22], [0.3, top + 0.36], [0.18, top + 0.46], [0.1, top + 0.5]], new THREE.MeshStandardMaterial({ map: scales, metalness: 0.3, roughness: 0.5 }), 32);
    for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; s.ball([0.035, 0.045, 0.035], [Math.sin(t) * 0.47, top + 0.12, Math.cos(t) * 0.47], gold, 8); }
    s.lathe([[0.1, 0], [0.06, 0.05], [0.11, 0.12], [0.12, 0.17], [0.05, 0.24], [0.025, 0.36], [0, 0.42]], gold, [0, top + 0.5, 0]);

    // Water.
    const wet = new THREE.MeshStandardMaterial({ color: '#bfe3ee', transparent: true, opacity: 0.72, roughness: 0.08, depthWrite: false });
    let stream: THREE.Mesh | null = null;
    if (a.water === 'thread' || a.water === 'generous') {
      const r = a.water === 'thread' ? 0.011 : 0.028;
      stream = s.cylinder(r, r * 1.25, top - 1.16, [0, (top + 1.14) / 2, 0], wet, 10);
      stream.castShadow = false;
      const pool = s.cylinder(0.44, 0.4, 0.02, [0, a.water === 'generous' ? 1.185 : 1.15, 0], wet, 32);
      pool.castShadow = false;
      s.ring(a.water === 'generous' ? 0.12 : 0.05, 0.008, [0, a.water === 'generous' ? 1.2 : 1.165, 0], s.material('#f2fbfd', { roughness: 0.2 })).rotation.x = Math.PI / 2;
      if (a.water === 'generous') for (let i = 0; i < 6; i++) { const t = random() * 7; s.ball([0.012, 0.018, 0.012], [Math.sin(t) * 0.09, 1.22 + random() * 0.08, Math.cos(t) * 0.09], s.material('#eefafd', { roughness: 0.1 }), 6); }
    } else if (a.water === 'frozen') {
      const ice = s.material('#e6f3f7', { roughness: 0.25 });
      s.cylinder(0.035, 0.004, 0.55, [0, top - 0.3, 0], ice, 8);
      for (let i = 0; i < 5; i++) { const t = i * 1.3 + random(); s.cylinder(0.014, 0.002, 0.1 + random() * 0.12, [Math.sin(t) * 0.48, top - 0.08, Math.cos(t) * 0.48], ice, 6); }
      s.cylinder(0.44, 0.4, 0.03, [0, 1.17, 0], ice, 32);
    } else {
      const tones = ['#a8762a', '#7d5524', '#c29a3a'];
      for (let i = 0; i < 5 + Math.round(mood.wear * 6); i++) {
        const t = random() * 7, r = random() * 0.34;
        s.cylinder(0.035, 0.035, 0.006, [Math.sin(t) * r, 1.125 + random() * 0.01, Math.cos(t) * r], s.material(tones[i % 3]), 5).rotation.y = random() * 3;
      }
    }
    if (a.puddle) {
      const sheet = new THREE.MeshStandardMaterial({ color: '#7f97a3', roughness: 0.05, metalness: 0.4 });
      for (let i = 0; i < 3; i++) {
        const t = random() * 7, r = 0.5 + random() * 0.35;
        const blob = s.cylinder(1, 1, 0.012, [Math.sin(t) * r, a.pad === 'stone' ? 0.076 : 0.008, Math.cos(t) * r], sheet, 20);
        blob.scale.set(0.3 + random() * 0.3, 1, 0.22 + random() * 0.2);
        blob.rotation.y = random() * 3;
        blob.castShadow = false;
      }
    }

    // On the rim.
    const rimAt = (t: number, r = 0.48): [number, number, number] => [Math.sin(t) * r, 1.2, Math.cos(t) * r];
    const spot = 0.3 + random() * 0.5;
    const bird = (t: number, size: number, body: string, head: string, drinking: boolean) => {
      const group = new THREE.Group();
      group.add(s.ball([0.06, 0.055, 0.1], [0, 0.085, 0], s.material(body, { roughness: 0.85 }), 12));
      group.add(s.ball([0.035, 0.038, 0.035], [0, drinking ? 0.09 : 0.15, 0.09], s.material(head, { roughness: 0.8 }), 10));
      group.add(s.box([0.01, 0.01, 0.03], [0, drinking ? 0.075 : 0.145, 0.13], s.material('#d6a03c')));
      group.add(s.box([0.06, 0.01, 0.09], [0, 0.085, -0.12], s.material(head)));
      for (const side of [-1, 1]) group.add(s.rod([side * 0.02, 0.05, 0], [side * 0.02, 0, 0.01], 0.005, s.material('#c66a5a')));
      group.scale.setScalar(size);
      group.position.set(...rimAt(t));
      group.rotation.y = t + Math.PI + (random() - 0.5) * 0.6;
      if (drinking) group.rotation.x = 0.25;
      s.root.add(group);
    };
    if (a.rim === 'cup') {
      const tin = s.material('#aeb4b6', { metalness: 0.8, roughness: 0.3 });
      const [x, , z] = rimAt(spot);
      s.cylinder(0.045, 0.035, 0.08, [x, 1.24, z], tin, 14);
      s.ring(0.022, 0.006, [x * 1.12, 1.24, z * 1.12], tin).rotation.y = spot;
      s.tube([[x * 1.1, 1.22, z * 1.1], [x * 1.18, 1.02, z * 1.18], [x * 0.95, 0.98, z * 0.95], [x * 0.84, 1.03, z * 0.84]], 0.006, tin);
    } else if (a.rim === 'pigeon') bird(spot, 1.25, '#8d95a0', '#4f6a66', a.water !== 'dry' && a.water !== 'frozen');
    else if (a.rim === 'sparrows') { bird(spot, 0.6, '#8a6a48', '#5c4026', false); bird(spot + 0.9 + random(), 0.6, '#96744e', '#5c4026', true); }
    else if (a.rim === 'bottle') {
      const [x, , z] = rimAt(spot, 0.47);
      const pet = new THREE.MeshStandardMaterial({ color: '#cfeaf3', transparent: true, opacity: 0.6, roughness: 0.1 });
      s.cylinder(0.032, 0.032, 0.17, [x, 1.285, z], pet, 12);
      s.cylinder(0.031, 0.031, 0.08, [x, 1.245, z], s.material('#8fc4d8', { roughness: 0.1 }), 12);
      s.cylinder(0.012, 0.026, 0.04, [x, 1.39, z], pet, 10);
      s.cylinder(0.014, 0.014, 0.015, [x, 1.415, z], s.material('#2a6fc0'), 10);
    } else if (a.rim === 'glove') {
      const wool = s.material(mood.cheer > 0.5 ? '#d8342c' : '#5a6f9a', { roughness: 1 });
      const [x, , z] = rimAt(spot, 0.48);
      s.ball([0.045, 0.02, 0.06], [x, 1.215, z], wool, 10).rotation.y = spot;
      s.ball([0.018, 0.016, 0.03], [x + Math.cos(spot) * 0.045, 1.215, z - Math.sin(spot) * 0.045], wool, 8);
      s.cylinder(0.04, 0.04, 0.02, [x * 1.1, 1.205, z * 1.1], s.material('#f1ece0', { roughness: 1 }), 10);
    }

    if(a.pedestalBands==='collars')for(const y of[.38,.83])s.ring(.375,.012,[0,y,0],gold).rotation.x=Math.PI/2;
    else if(a.pedestalBands==='beads')for(let i=0;i<24;i++){const t=i*Math.PI/12;s.ball([.021,.021,.021],[Math.sin(t)*.43,.91,Math.cos(t)*.43],gold,6);}
    else if(a.pedestalBands==='wreaths')for(let i=0;i<4;i++){const t=i*Math.PI/2;const ring=s.ring(.065,.012,[Math.sin(t)*.375,.6,Math.cos(t)*.375],gold);ring.rotation.y=t;}
    if(a.domeRibs!=='scales')for(let i=0;i<(a.domeRibs==='eight'?8:4);i++){
      const t=i*Math.PI*2/(a.domeRibs==='eight'?8:4),at=(r:number,y:number,angle=t):[number,number,number]=>[Math.sin(angle)*r,top+y,Math.cos(angle)*r];
      if(a.domeRibs==='petals')s.tube([at(.44,.11),at(.34,.31,t-.2),at(.1,.5),at(.34,.31,t+.2),at(.44,.11)],.012,gold);
      else s.tube([at(.44,.11),at(.4,.22),at(.3,.36),at(.18,.46),at(.1,.5)],a.domeRibs==='four'?.018:.01,gold);
    }
    if(a.basinLip==='beaded')for(let i=0;i<32;i++){const t=i*Math.PI/16;s.ball([.014,.014,.014],[Math.sin(t)*.495,1.2,Math.cos(t)*.495],gold,6);}
    else if(a.basinLip==='banded')for(const y of[1.17,1.2])s.ring(.501,.007,[0,y,0],gold).rotation.x=Math.PI/2;
    else if(a.basinLip==='scalloped')for(let i=0;i<8;i++){const t=i*Math.PI/4;const arc=s.ring(.04,.008,[Math.sin(t)*.5,1.16,Math.cos(t)*.5],gold,Math.PI);arc.rotation.y=t;arc.rotation.z=Math.PI;}
    if(a.outlet==='plain')s.cylinder(.025,.025,.045,[0,top-.04,0],gold,12);
    else if(a.outlet==='rose'){s.cylinder(.055,.055,.025,[0,top-.0325,0],gold,16);for(let i=0;i<6;i++){const t=i*Math.PI/3;s.cylinder(.006,.006,.005,[Math.sin(t)*.035,top-.0475,Math.cos(t)*.035],s.material('#27352e'),6);}}
    else if(a.outlet==='collar')s.cylinder(.025,.07,.07,[0,top-.055,0],gold,16);
    else{for(let i=0;i<4;i++){const t=i*Math.PI/2;s.rod([0,top-.065,0],[Math.sin(t)*.15,top-.02,Math.cos(t)*.15],.012,gold);}s.cylinder(.03,.03,.04,[0,top-.07,0],gold,12);}
    const drain=s.material('#454d48',{metalness:.5});
    if(a.drainGrille==='bars'){s.box([.4,.012,.25],[0,.006,1.03],drain);for(let i=0;i<9;i++)s.box([.018,.003,.21],[-.16+i*.04,.0135,1.03],s.material('#252b29'));}
    else if(a.drainGrille==='round'){s.cylinder(.19,.19,.012,[0,.006,1.03],drain,24);for(let i=0;i<10;i++){const t=i*Math.PI/5;s.rod([Math.sin(t)*.04,.014,1.03+Math.cos(t)*.04],[Math.sin(t)*.17,.014,1.03+Math.cos(t)*.17],.006,s.material('#242b27'));}}
    else if(a.drainGrille==='slots')for(let i=0;i<10;i++)s.box([.032,.012,.16],[-.27+i*.06,.006,1.03],drain);
    if(a.maintenancePlate==='enamel')s.label('EAU  17',.18,.09,[0,.21,.451],'#2c4d3d','#e1dfd1');
    else if(a.maintenancePlate==='brass'){s.box([.21,.1,.013],[0,.21,.451],s.material('#b59a53',{metalness:.6}));s.label('WALLACE',.17,.065,[0,.21,.459],'#4b4631','#b59a53');}
    else if(a.maintenancePlate==='latch'){s.box([.23,.18,.015],[0,.23,.447],iron);for(const x of[-.1,.1])s.box([.02,.13,.018],[x,.23,.46],gold);s.box([.035,.05,.022],[.07,.23,.47],gold);}
    if(a.nearbyVessel!=='none'){
      const x=-1.04,z=.2,metal=s.material(a.nearbyVessel==='can'?'#426b51':'#a9b3b4',{metalness:.5,roughness:.45});
      if(a.nearbyVessel==='bowl')s.lathe([[0,0],[.13,0],[.2,.05],[.21,.09],[.18,.09],[.12,.025],[0,.025]],s.material('#b4a284'),[x,0,z]);
      else{s.lathe([[0,0],[.11,0],[.14,.28]],metal,[x,0,z]);s.ring(.14,.008,[x,.28,z],metal).rotation.x=Math.PI/2;
        if(a.nearbyVessel==='pail')s.ring(.14,.006,[x,.28,z],metal,Math.PI);
        else{s.tube([[x+.1,.04,z],[x+.24,.12,z],[x+.37,.3,z]],.022,metal);s.ball([.045,.025,.045],[x+.37,.3,z],metal,10);s.tube([[x-.1,.06,z],[x-.22,.09,z],[x-.22,.24,z],[x-.1,.26,z]],.014,metal);s.cylinder(.13,.13,.015,[x,.28,z],metal,16);}
      }
    }

    const energy = mix(0.3, 1.6, mood.energy), phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        if (stream) { const wobble = 1 + Math.sin(time * 11 * energy + phase) * 0.18; stream.scale.set(wobble, 1, 2 - wobble); }
      },
    });
  },
});
