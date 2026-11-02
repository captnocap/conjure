import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const STRAW = { natural: '#d9b76a', bleached: '#efe3bd', honey: '#b98538', black: '#3a332c' } as const;
const RIBBON = { black: '#26262b', red: '#c8303a', navy: '#27407e', white: '#f4f0e4', lilac: '#a98fd0', twine: '#8a6a3a' } as const;

function strawTexture(base: string, random: () => number, wear: number, weave: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const tone = new THREE.Color(base);
  ctx.fillStyle = `#${tone.getHexString()}`;
  ctx.fillRect(0, 0, 512, 256);
  const rows = weave==='fine'?42:weave==='coarse'?15:26;
  for (let row = 0; row < rows; row++) {
    const y = (row / rows) * 256, h = 256 / rows;
    const shade = tone.clone().offsetHSL(0, 0, (random() - 0.5) * 0.09);
    ctx.fillStyle = `#${shade.getHexString()}`;
    ctx.fillRect(0, y, 512, h - 1.5);
    ctx.fillStyle = `#${tone.clone().offsetHSL(0, 0.03, -0.2).getHexString()}`;
    ctx.fillRect(0, y + h - 1.5, 512, 1.5);
    // Slanted plait marks, alternating direction from row to row.
    ctx.strokeStyle = `#${tone.clone().offsetHSL(0, 0, -0.13).getHexString()}`;
    ctx.lineWidth = 1.2;
    for (let x = (row % 2) * 4; x < 512; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, y + 1);
      ctx.lineTo(x + (weave==='herringbone'?(row%2?-7:7):weave==='basket'?0:row%2?-5:5), y + h - 2);
      ctx.stroke();
    }
  }
  if(weave==='basket'){ctx.globalAlpha=.23;ctx.fillStyle='#fff0ca';for(let y=0;y<256;y+=18)for(let x=0;x<512;x+=18)if((x/18+y/18)%2===0)ctx.fillRect(x,y,15,15);ctx.globalAlpha=1;}
  for (let i = 0; i < wear * 60; i++) {
    ctx.fillStyle = `rgba(70,55,35,${0.12 + random() * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(random() * 512, random() * 256, 4 + random() * 22, 3 + random() * 10, random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  return texture;
}

/** A flat strip following a path, for ribbon tails. */
function strip(points: THREE.Vector3[], width: number, side: THREE.Vector3) {
  const curve = new THREE.CatmullRomCurve3(points);
  const steps = 24, positions: number[] = [], index: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = curve.getPoint(i / steps);
    const w = side.clone().multiplyScalar(width / 2);
    positions.push(p.x - w.x, p.y - w.y, p.z - w.z, p.x + w.x, p.y + w.y, p.z + w.z);
    if (i < steps) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    weave: choice('How is the straw woven?',{fine:'Very fine close plaited rows.',coarse:'Broad coarse straw plaits.',herringbone:'Alternating angled herringbone plaits.',basket:'Square over-and-under basket weave.'}),
    edging: choice('How is the brim edge finished?',{rolled:'A narrow rolled straw edge.',bound:'A ribbon-bound edge matching the hatband.',braided:'A thick braided straw border.',fringe:'Short loose straw ends fringe the brim.'}),
    sweatband: choice('What lines the inside edge of the crown?',{leather:'A dark brown leather sweatband.',cotton:'A soft ivory cotton sweatband.',blue:'A blue fabric lining band.',printed:'A pale lining band with a small maker label.'}),
    cord: choice('What kind of chin fastening lies across the brim?',{twine:'A fine natural twine chin loop.',leather:'A dark leather cord with a sliding bead.',ribbon:'A narrow ribbon chin tie.',beads:'A thin cord with two wooden beads.'}),
    fastening: choice('What small fastening decorates the hatband?',{buckle:'A rectangular metal ribbon buckle.',button:'A small round shell button.',rosette:'A folded fabric rosette.',pin:'A slender hatpin with a pearl head.'}),
    crownSet: choice('How has the crown been shaped?',{round:'The crown keeps its original rounded shape.',crease:'A shallow lengthwise crease dents the crown top.',pinch:'Two small pinches narrow the front of the crown.',dimple:'A soft circular dimple marks the crown top.'}),
    brim: choice('What shape is the hat?', {
      sunhat: 'A wide, gently wavy brim and a rounded crown: the classic garden sun hat.',
      cartwheel: 'An enormous flat cartwheel brim, glamorous, a Riviera or wedding hat.',
      floppy: 'A soft drooping brim that hides the face, beachy and bohemian.',
      boater: 'A stiff flat-topped boater with a narrow level brim: regattas, barbershop quartets, punting.',
      gardener: 'A tall conical crown and a down-sloping brim, a field worker or gardener\'s hat.',
    }),
    straw: choice('What colour is the straw?', {
      natural: 'Golden natural straw.',
      bleached: 'Pale bleached cream, delicate and dressy.',
      honey: 'Dark honey-brown, sun-baked and rustic.',
      black: 'Dyed black straw, chic or funereal.',
    }),
    ribbon: choice('What is tied round the crown?', {
      black: 'A plain black grosgrain band.',
      red: 'A bright red ribbon.',
      navy: 'A navy ribbon, nautical and proper.',
      white: 'A white satin ribbon, bridal or innocent.',
      lilac: 'A soft lilac ribbon, romantic.',
      twine: 'Just a twist of rough brown twine.',
    }),
    tails: choice('How is the ribbon finished?', {
      band: 'A neat flat band with nothing hanging.',
      bow: 'A big bow at the back.',
      streamers: 'Two long tails trailing off the brim.',
    }),
    state: choice('How has the hat been left?', {
      placed: 'Set down carefully, crown up, by someone who is coming back.',
      upturned: 'Turned over, crown down, used as a basket.',
      snagged: 'Blown off and caught at a tilt in a clump of long grass.',
      tumbling: 'Up on its edge mid-roll, carried away by a gust.',
    }),
    tucked: choice('What is tucked into the band?', {
      nothing: 'Nothing.',
      daisies: 'A few white daisies.',
      poppy: 'One red poppy.',
      rose: 'A pink rose with leaves.',
      feather: 'A long striped feather.',
      wheat: 'Three ears of wheat.',
    }),
    cargo: choice('If the hat is upturned, what is in it?', {
      empty: 'Nothing: it is just lying upside down.',
      berries: 'A heap of picked red and dark berries.',
      flowers: 'A loose handful of picked wildflowers.',
      eggs: 'A few hen\'s eggs, carefully carried.',
    }),
    size: score('How broad is the brim?', ['Modest', 'Generous', 'Extravagant']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const hat = new THREE.Group();
    const strawMap = strawTexture(STRAW[a.straw], random, mood.wear,a.weave);
    const straw = new THREE.MeshStandardMaterial({ map: strawMap, roughness: 0.85, side: THREE.DoubleSide });
    const ribbon = new THREE.MeshStandardMaterial({ color: RIBBON[a.ribbon], roughness: a.ribbon === 'twine' ? 0.95 : 0.45, side: THREE.DoubleSide });

    const shape = {
      sunhat: { crown: 0.092, top: 0.075, height: 0.1, brim: 0.2, droop: 0.02, wave: 0.012, round: 0.6 },
      cartwheel: { crown: 0.09, top: 0.08, height: 0.075, brim: 0.3, droop: 0.008, wave: 0.01, round: 0.3 },
      floppy: { crown: 0.092, top: 0.07, height: 0.105, brim: 0.21, droop: 0.075, wave: 0.03, round: 0.8 },
      boater: { crown: 0.095, top: 0.093, height: 0.085, brim: 0.145, droop: 0, wave: 0, round: 0.05 },
      gardener: { crown: 0.09, top: 0.035, height: 0.15, brim: 0.21, droop: 0.06, wave: 0.006, round: 0.2 },
    }[a.brim];
    const brimRadius = shape.brim * mix(0.88, 1.22, a.size);
    const { crown, top, height } = shape;

    // One lathe from brim edge to crown tip, then bent so the brim waves and droops.
    const profile: THREE.Vector2[] = [];
    for (let i = 0; i <= 10; i++) profile.push(new THREE.Vector2(mix(brimRadius, crown, i / 10), 0));
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      profile.push(new THREE.Vector2(mix(crown, top, t ** (1 + shape.round * 2)), height * t));
    }
    for (let i = 1; i <= 5; i++) {
      const t = i / 5;
      profile.push(new THREE.Vector2(top * Math.cos(t * Math.PI / 2) * (1 - 0.0001), height + Math.sin(t * Math.PI / 2) * top * shape.round * 0.35));
    }
    const shell = new THREE.LatheGeometry(profile, 64);
    const pos = shell.attributes.position;
    const phase = random() * 6, lobes = 3 + Math.floor(random() * 3), dent = random() * 6;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z), angle = Math.atan2(z, x);
      if (r > crown + 0.0005 && pos.getY(i) < 0.001) {
        const out = (r - crown) / (brimRadius - crown);
        const wobble = Math.sin(angle * lobes + phase) * shape.wave + Math.sin(angle * 2 + dent) * shape.wave * 0.6 * (0.5 + mood.wear);
        pos.setY(i, -shape.droop * out * out + wobble * out + (a.brim === 'gardener' ? -out * 0.03 : 0));
      }
    }
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);if(y<height*.55)continue;const lift=(y-height*.55)/(height*.6);
      if(a.crownSet==='crease')pos.setY(i,y-.018*Math.exp(-((x/.022)**2))*lift);
      if(a.crownSet==='dimple')pos.setY(i,y-.024*Math.exp(-(x*x+z*z)/(.035*.035))*lift);
      if(a.crownSet==='pinch'&&z>0)pos.setX(i,x*(1-.23*lift*Math.max(0,z/crown)));
    }
    shell.computeVertexNormals();
    const shellMesh = new THREE.Mesh(shell, straw);
    shellMesh.castShadow = shellMesh.receiveShadow = true;
    hat.add(shellMesh);
    // The edge follows exactly the same bent brim as the straw shell.
    const edgeY=(angle:number)=>-shape.droop+Math.sin(angle*lobes+phase)*shape.wave+Math.sin(angle*2+dent)*shape.wave*.6*(.5+mood.wear)-(a.brim==='gardener'?.03:0);
    const edgeArt=new Sculpture(context),edgeSkin=a.edging==='bound'?ribbon:straw;
    const edgePoints:[number,number,number][]=Array.from({length:97},(_,i)=>{const t=i*Math.PI*2/96;return[Math.cos(t)*brimRadius,edgeY(t),Math.sin(t)*brimRadius];});
    edgeArt.tube(edgePoints,a.edging==='bound'?.0055:a.edging==='braided'?.005:.003,edgeSkin);
    if(a.edging==='braided')for(const side of [-1,1]){const pts:[number,number,number][]=Array.from({length:193},(_,i)=>{const t=i*Math.PI*2/192,r=brimRadius+Math.cos(t*48)*.003*side;return[Math.cos(t)*r,edgeY(t)+Math.sin(t*48)*.003*side,Math.sin(t)*r];});edgeArt.tube(pts,.0015,straw);}
    if(a.edging==='fringe')for(let i=0;i<96;i++){const t=i*Math.PI*2/96;edgeArt.rod([Math.cos(t)*brimRadius,edgeY(t),Math.sin(t)*brimRadius],[Math.cos(t)*(brimRadius+.012),edgeY(t)-.002,Math.sin(t)*(brimRadius+.012)],.0007,straw);}
    const lining=edgeArt.material({leather:'#624332',cotton:'#e6ddc3',blue:'#7894a8',printed:'#ddd0ae'}[a.sweatband],{roughness:.8,side:THREE.DoubleSide});
    edgeArt.mesh(new THREE.CylinderGeometry(crown-.002,crown-.002,.018,48,1,true),lining,[0,.011,0]);
    if(a.sweatband==='printed')edgeArt.label('SUMMER',.042,.012,[0,.011,-crown+.003],'#594d3d','#ddd0ae');
    const cordMaterial=edgeArt.material(a.cord==='leather'?'#594335':a.cord==='ribbon'?RIBBON[a.ribbon]:'#b7a06d',{roughness:.8});
    const cordPoints:[number,number,number][]=[[-crown,.003,0],[-crown*.9,.006,crown*.5],[0,.007,crown*.88],[crown*.9,.006,crown*.5],[crown,.003,0]];
    edgeArt.tube(cordPoints,a.cord==='ribbon'?.003:.0012,cordMaterial);
    if(a.cord==='leather'||a.cord==='beads')for(let i=0;i<(a.cord==='beads'?2:1);i++)edgeArt.ball([.004,.004,.005],[(i-.5)*.012,.008,crown*.88],edgeArt.material('#a17c46'),10);
    hat.add(edgeArt.root);

    // Ribbon band hugging the crown base.
    const bandHeight = a.ribbon === 'twine' ? 0.008 : a.brim === 'boater' ? 0.038 : 0.028;
    const bandTop = mix(crown, top, (bandHeight / height) ** (1 + shape.round * 2));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(bandTop + 0.003, crown + 0.003, bandHeight, 48, 1, true), ribbon);
    band.position.y = bandHeight / 2 + 0.002;
    band.castShadow = true;
    hat.add(band);
    if (a.brim === 'boater' && a.ribbon !== 'twine') {
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(crown + 0.0045, crown + 0.0045, bandHeight * 0.3, 48, 1, true), new THREE.MeshStandardMaterial({ color: a.ribbon === 'white' ? '#c8303a' : '#f4f0e4', roughness: 0.5, side: THREE.DoubleSide }));
      stripe.position.y = bandHeight / 2 + 0.002;
      hat.add(stripe);
    }
    const clasp=new Sculpture(context),metal=clasp.material('#bea472',{metalness:.55,roughness:.35});
    if(a.fastening==='buckle')clasp.tube([[-.018,-.011,0],[-.018,.011,0],[.018,.011,0],[.018,-.011,0],[-.018,-.011,0]],.002,metal);
    if(a.fastening==='button'){clasp.cylinder(.012,.012,.003,[0,0,0],clasp.material('#e3d6b4'),16).rotation.x=Math.PI/2;for(const x of [-.003,.003])clasp.ball([.0012,.0012,.0007],[x,0,.002],metal,6);}
    if(a.fastening==='rosette')for(let i=0;i<8;i++){const t=i*Math.PI/4;const petal=clasp.ball([.008,.015,.003],[Math.sin(t)*.011,Math.cos(t)*.011,0],ribbon,10);petal.rotation.z=-t;}
    if(a.fastening==='pin'){clasp.rod([-.028,-.01,0],[.025,.012,0],.001,metal);clasp.ball([.005,.005,.004],[.025,.012,0],clasp.material('#eee6d3'),12);}
    clasp.root.position.set(0,bandHeight*.6,crown+.006);hat.add(clasp.root);
    const tails: THREE.Mesh[] = [];
    const back = new THREE.Vector3(0, bandHeight / 2, -(crown + 0.006));
    if (a.tails !== 'band') {
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), ribbon);
      knot.position.copy(back);
      knot.scale.set(1, 1.1, 0.7);
      hat.add(knot);
      const width = a.ribbon === 'twine' ? 0.005 : 0.024;
      if (a.tails === 'bow') {
        for (const side of [-1, 1]) {
          const loop = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.012, 6, 20), ribbon);
          loop.scale.set(1.25, 0.72, 0.5);
          loop.position.set(side * 0.04, back.y + 0.008, back.z - 0.004);
          loop.rotation.z = side * 0.35;
          loop.castShadow = true;
          hat.add(loop);
        }
      }
      const reach = a.tails === 'streamers' && a.state !== 'snagged' ? brimRadius - crown + 0.09 + random() * 0.08 : Math.min(0.07, brimRadius - crown - 0.01);
      for (const side of [-1, 1]) {
        const swing = side * (0.25 + random() * 0.4);
        const points = [0, 0.33, 0.66, 1].map((t) => {
          const out = t * reach, r = crown + 0.006 + out;
          const overEdge = Math.max(0, r - brimRadius);
          const y = t === 0 ? back.y : 0.005 - shape.droop * Math.min(1, out / (brimRadius - crown)) ** 2 - overEdge * 0.9 + Math.sin(t * 5 + side) * 0.006;
          return new THREE.Vector3(Math.sin(swing * t) * r + side * 0.008, y, -Math.cos(swing * t) * r);
        });
        const tail = new THREE.Mesh(strip(points, width, new THREE.Vector3(1, 0, 0)), ribbon);
        tail.castShadow = true;
        hat.add(tail);
        tails.push(tail);
      }
    }

    // Something tucked into the band, on the wearer's left front.
    const tuckAngle = 0.9 + random() * 0.5;
    const tuck = new THREE.Group();
    tuck.position.set(Math.sin(tuckAngle) * (crown + 0.008), bandHeight * 0.6, Math.cos(tuckAngle) * (crown + 0.008));
    tuck.rotation.y = tuckAngle;
    hat.add(tuck);
    const leaf = new THREE.MeshStandardMaterial({ color: '#5d8a3c', roughness: 0.8, side: THREE.DoubleSide });
    const add = (mesh: THREE.Mesh, parent: THREE.Object3D = tuck) => { mesh.castShadow = true; parent.add(mesh); return mesh; };
    const daisy = (at: THREE.Vector3, size: number, petalColour: string, heart: string, parent: THREE.Object3D = tuck) => {
      const flower = new THREE.Group();
      flower.position.copy(at);
      const petal = new THREE.MeshStandardMaterial({ color: petalColour, roughness: 0.7 });
      for (let i = 0; i < 9; i++) {
        const p = add(new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), petal), flower);
        p.scale.set(size * 0.5, size * 0.1, size * 0.2);
        p.position.set(Math.cos(i * 0.698) * size * 0.55, 0, Math.sin(i * 0.698) * size * 0.55);
        p.rotation.y = -i * 0.698;
      }
      const c = add(new THREE.Mesh(new THREE.SphereGeometry(size * 0.28, 10, 8), new THREE.MeshStandardMaterial({ color: heart, roughness: 0.9 })), flower);
      c.scale.y = 0.6;
      flower.rotation.set(Math.PI / 2 - 0.3 + (random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.6);
      parent.add(flower);
      return flower;
    };
    if (a.tucked === 'daisies') {
      for (let i = 0; i < 3; i++) daisy(new THREE.Vector3((i - 1) * 0.034, 0.012 + (i % 2) * 0.016, 0.012), 0.024, '#fbfaf2', '#e9b820');
    } else if (a.tucked === 'poppy') {
      const red = new THREE.MeshStandardMaterial({ color: '#d42a1e', roughness: 0.6, side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) {
        const p = add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8, 0, Math.PI), red));
        p.scale.set(1, 0.9, 0.35);
        p.position.set(Math.cos(i * 1.571) * 0.014, 0.03 + Math.sin(i * 1.571) * 0.014, 0.02);
        p.rotation.z = i * 1.571;
      }
      add(new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), new THREE.MeshStandardMaterial({ color: '#1c1a1a' }))).position.set(0, 0.03, 0.032);
    } else if (a.tucked === 'rose') {
      const pink = new THREE.MeshStandardMaterial({ color: '#e58aa0', roughness: 0.6 });
      for (let i = 0; i < 5; i++) {
        const p = add(new THREE.Mesh(new THREE.TorusGeometry(0.008 + i * 0.0045, 0.006, 6, 16), pink));
        p.position.set(0, 0.028, 0.014 + (5 - i) * 0.003);
      }
      for (const side of [-1, 1]) {
        const l = add(new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), leaf));
        l.scale.set(0.026, 0.012, 0.004);
        l.position.set(side * 0.04, 0.02, 0.01);
        l.rotation.z = side * 0.4;
      }
    } else if (a.tucked === 'feather') {
      const canvas = document.createElement('canvas');
      canvas.width = 32; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? '#3b2a1c' : '#c79a5b'; ctx.fillRect(0, i * 8, 32, 8); }
      ctx.fillStyle = '#f1e6cf'; ctx.fillRect(15, 0, 2, 128);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const f = add(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshStandardMaterial({ map, roughness: 0.7 })));
      f.scale.set(0.022, 0.13, 0.003);
      f.position.set(0.01, 0.1, 0.006);
      f.rotation.z = -0.35;
    } else if (a.tucked === 'wheat') {
      const gold = new THREE.MeshStandardMaterial({ color: '#d7a83a', roughness: 0.8 });
      for (let i = 0; i < 3; i++) {
        const stalk = new THREE.Group();
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.1, 5), gold), stalk).position.y = 0.05;
        for (let k = 0; k < 7; k++) {
          const grain = add(new THREE.Mesh(new THREE.SphereGeometry(1, 6, 5), gold), stalk);
          grain.scale.set(0.005, 0.009, 0.005);
          grain.position.set((k % 2 ? 1 : -1) * 0.004, 0.1 + k * 0.007, 0);
        }
        stalk.rotation.z = (i - 1) * 0.3 - 0.2;
        stalk.position.z = 0.004;
        tuck.add(stalk);
      }
    }

    // How it lies.
    const grassPoints: { at: [number, number, number]; lean: number; turn: number; h: number }[] = [];
    if (a.state === 'placed') {
      hat.position.y = shape.droop * 1.1 + shape.wave + (a.brim === 'gardener' ? 0.03 : 0);
      hat.rotation.y = (random() - 0.5) * 1.2;
    } else if (a.state === 'upturned') {
      hat.rotation.x = Math.PI + (random() - 0.5) * 0.12;
      hat.rotation.z = 0.1 + random() * 0.08;
      hat.position.y = height + top * shape.round * 0.35;
      const bowl = new THREE.Group();
      bowl.position.y = 0.012;
      if (a.cargo === 'berries') {
        const berries = Array.from({ length: 90 + Math.floor(mood.density * 60) }, () => {
          const angle = random() * 6.28, r = Math.sqrt(random()) * crown * 0.93;
          return { at: [Math.cos(angle) * r, height * 0.78 + (1 - (r / crown) ** 2) * 0.05 + random() * 0.008, Math.sin(angle) * r] as [number, number, number], size: 0.009 + random() * 0.004, color: random() < 0.6 ? '#b3202e' : random() < 0.5 ? '#3a1f4a' : '#7a1230' };
        });
        const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.35 }), berries.length);
        const m = new THREE.Matrix4();
        berries.forEach((b, i) => { m.makeScale(b.size, b.size, b.size).setPosition(...b.at); mesh.setMatrixAt(i, m); mesh.setColorAt(i, new THREE.Color(b.color)); });
        mesh.castShadow = true;
        bowl.add(mesh);
      } else if (a.cargo === 'flowers') {
        const colours = ['#fbfaf2', '#e9c53a', '#d24a8a', '#7e8fe0', '#f08a3c'];
        for (let i = 0; i < 9; i++) {
          const angle = random() * 6.28, r = random() * crown * 1.2;
          const f = daisy(new THREE.Vector3(Math.cos(angle) * r, height * 0.95 + random() * 0.04, Math.sin(angle) * r), 0.03 + random() * 0.014, colours[i % colours.length], '#5a3a14', bowl);
          f.rotation.set((random() - 0.5) * 0.9, 0, (random() - 0.5) * 0.9);
          const stem = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.1, 5), leaf), bowl);
          stem.position.set(Math.cos(angle) * r * 0.6, height * 0.85, Math.sin(angle) * r * 0.6);
          stem.rotation.set((random() - 0.5) * 2, 0, (random() - 0.5) * 2);
        }
      } else if (a.cargo === 'eggs') {
        const shellPaint = new THREE.MeshStandardMaterial({ color: '#d9b08a', roughness: 0.55 });
        const white = new THREE.MeshStandardMaterial({ color: '#f3ece0', roughness: 0.55 });
        for (let i = 0; i < 5; i++) {
          const egg = add(new THREE.Mesh(new THREE.SphereGeometry(0.024, 14, 10), i % 3 ? shellPaint : white), bowl);
          egg.scale.set(1, 1.3, 1);
          egg.position.set(Math.cos(i * 1.26) * (i ? 0.042 : 0), height * 0.85 + (i ? 0 : 0.03), Math.sin(i * 1.26) * (i ? 0.042 : 0));
          egg.rotation.set(1.2 + random(), random() * 3, 0);
        }
      }
      // The cargo is built upright, then turned with the hat.
      bowl.rotation.x = Math.PI;
      bowl.position.y = height;
      hat.add(bowl);
    } else if (a.state === 'snagged') {
      const tilt = 0.42 + random() * 0.2;
      hat.rotation.set(tilt, random() * 0.6 - 0.3, 0.2);
      hat.position.set(0, brimRadius * Math.sin(tilt) + 0.01, 0.02);
      for (let i = 0; i < 46; i++) {
        const angle = random() * 6.28, r = random() * brimRadius * 0.9;
        const front = i % 4 === 0;
        grassPoints.push({ at: [Math.cos(angle) * r * (front ? 1.25 : 1), 0, front ? brimRadius * (0.75 + random() * 0.4) : -brimRadius * 0.55 + Math.sin(angle) * r * 0.5], lean: (random() - 0.5) * 0.5, turn: random() * 6.28, h: front ? 0.05 + random() * 0.07 : 0.2 + random() * 0.2 });
      }
    } else {
      hat.rotation.set(Math.PI / 2 - 0.22, 0, 0);
      hat.rotation.z = 0.5 + random() * 0.6;
      hat.position.y = brimRadius * 0.98;
      for (let i = 0; i < 14; i++)
        grassPoints.push({ at: [(random() - 0.5) * brimRadius * 2.2, 0, (random() - 0.5) * 0.2], lean: 0.5 + random() * 0.4, turn: Math.PI / 2, h: 0.06 + random() * 0.08 });
    }
    if(a.state!=='snagged'){
      hat.updateMatrixWorld(true);const support=a.state==='placed'||a.state==='upturned'?shellMesh:hat;hat.position.y-=new THREE.Box3().setFromObject(support,true).min.y;hat.updateMatrixWorld(true);
      if(a.state==='placed')for(const tail of tails){const vertices=tail.geometry.getAttribute('position');const point=new THREE.Vector3();for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i);tail.localToWorld(point);if(point.y<.0005){point.y=.0005;tail.worldToLocal(point);vertices.setXYZ(i,point.x,point.y,point.z);}}vertices.needsUpdate=true;tail.geometry.computeVertexNormals();}
    }
    s.root.add(hat);

    if (grassPoints.length) {
      const blade = new THREE.ConeGeometry(0.006, 1, 4);
      blade.translate(0, 0.5, 0);
      const mesh = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ roughness: 0.85 }), grassPoints.length);
      const dummy = new THREE.Object3D();
      grassPoints.forEach((g, i) => {
        dummy.position.set(...g.at);
        dummy.rotation.set(0, g.turn, g.lean);
        dummy.scale.set(1, g.h, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, new THREE.Color().setHSL(mix(0.2, 0.3, random()), mix(0.3, 0.55, mood.cheer), mix(0.3, 0.45, random())));
      });
      mesh.castShadow = true;
      s.root.add(mesh);
    }

    const flutter = mix(0.02, 0.35, mood.energy) * (a.state === 'tumbling' || a.state === 'snagged' ? 1.6 : 1);
    return s.finish({
      footprint: brimRadius,
      update: (_dt, time) => { tails.forEach((tail, i) => { tail.rotation.y = Math.sin(time * (2 + i * 0.7) + i) * flutter; }); },
    });
  },
});
