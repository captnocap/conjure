import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, score } from '@conjure/kit';

type P = [number, number, number];

/** A panelled market parasol with a scalloped valance. Returns a group pivoting at the pole top. */
function parasol(s: Sculpture, radius: number, rise: number, colours: readonly string[], missing: (panel: number) => boolean, fade: number) {
  const group = new THREE.Group();
  const positions: number[] = [], tints: number[] = [];
  const panels = 8, drop = 0.12;
  const pale = new THREE.Color('#ddd6c4');
  for (let i = 0; i < panels; i++) {
    if (missing(i)) continue;
    const a0 = (i / panels) * Math.PI * 2, a1 = ((i + 1) / panels) * Math.PI * 2;
    const p0 = [Math.cos(a0) * radius, 0, Math.sin(a0) * radius], p1 = [Math.cos(a1) * radius, 0, Math.sin(a1) * radius];
    const colour = new THREE.Color(colours[i % colours.length]).lerp(pale, fade);
    const push = (...points: number[][]) => points.forEach((point) => { positions.push(...point); tints.push(colour.r, colour.g, colour.b); });
    push([0, rise, 0], p1, p0);
    push(p0, p1, [p1[0], -drop, p1[2]]);
    push(p0, [p1[0], -drop, p1[2]], [p0[0], -drop, p0[2]]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(tints, 3));
  geometry.computeVertexNormals();
  const cloth = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }));
  cloth.castShadow = cloth.receiveShadow = true;
  group.add(cloth);
  const metal = s.material('#b9b6ac', { metalness: 0.5 });
  for (let i = 0; i < panels; i++) {
    const t = (i / panels) * Math.PI * 2;
    group.add(s.rod([0, rise - 0.01, 0], [Math.cos(t) * radius, -0.005, Math.sin(t) * radius], 0.008, metal));
    group.add(s.rod([0, rise - 0.45, 0], [Math.cos(t) * radius * 0.5, rise * 0.48, Math.sin(t) * radius * 0.5], 0.006, metal));
  }
  group.add(s.cylinder(0.03, 0.03, 0.06, [0, rise + 0.02, 0], metal, 8));
  return group;
}

export default defineThing({
  questions: {
    basinSize: score('How large is the wash basin?', ['A small carrying basin', 'A regular broad wash basin', 'An oversized basin for a busy stop']),
    stand: choice('What supports the basin?', {
      stool: 'A low wooden stool.', crate: 'A stout slatted crate.', ring: 'A metal ring on four splayed legs.', plinth: 'A low concrete block with a wooden pad.',
    }),
    shadeSpan: score('How broad is the parasol?', ['A compact canopy over the basin', 'Shade over the basin and seat', 'A wide canopy over the whole pitch']),
    shadeHeight: score('How high is the parasol raised?', ['Low above the tiny seat', 'At an ordinary standing height', 'Raised high on an extended pole']),
    extraStock: choice('How is additional stock stored?', {
      none: 'Only the usual restock bags.', crates: 'Two low drink crates beside the bags.',
      cooler: 'A rectangular cooler with a thick closed lid.', rack: 'A low two-level rack of bottles.',
    }),
    servingTray: choice('What serving equipment waits beside the basin?', {
      none: 'No extra serving equipment.', cups: 'Three little cups on a small tray.',
      tongs: 'A pair of ice tongs and a folded cloth on a tray.', sieve: 'A draining sieve in a wire cradle.',
    }),
    groundTreatment: choice('What lies under the selling pitch?', {
      bare: 'The ordinary ground.', mat: 'A broad woven mat.', planks: 'A low joined-plank platform.', tiles: 'A small paved rectangle of pale tiles.',
    }),
    sold: choice('What is being sold from the basin?', {
      sachets: 'Only pure-water sachets, a slithering heap of clear pillows.',
      mixed: 'Sachets with a few soft-drink bottles standing among them.',
      bottles: 'Bottled water and fizzy drinks standing upright, caps in every colour.',
      zobo: 'Home-made zobo and kunu in reused bottles: deep hibiscus red and milky white.',
    }),
    left: score('How much is left?', ['Two or three at the bottom', 'A thin layer', 'Half a basin', 'Heaped over the rim, restock bags waiting beside']),
    ice: choice('What state is the ice in?', {
      fresh: 'Fresh blocks, white and sharp, just chipped off the big bar.',
      slush: 'Half melted: slivers floating in cold water.',
      melted: 'All gone: the drinks sit in lukewarm water.',
      dry: 'There never was any; a dry basin.',
    }),
    basin: choice('What is the basin like?', {
      enamel: 'White enamel with a blue rim, chipped black where it has been dropped.',
      flowers: 'Cream enamel painted with red flowers.',
      plastic: 'A bright plastic wash basin.',
      aluminium: 'A dented aluminium basin, dull silver.',
    }),
    takings: choice("What do the day's takings look like?", {
      none: 'Nothing yet.',
      coins: 'A small pile of coins on the corner of the stool.',
      notes: 'Soft folded notes pinned under a stone beside a few coins.',
      tin: 'A milk tin so full of coins the lid sits beside it.',
    }),
    minder: choice('Who is minding the stall?', {
      child: 'A child in school uniform on a tiny stool, holding a sachet out to the road.',
      asleep: 'A child asleep on the tiny stool, head on folded arms on their knees.',
      homework: 'Nobody for the moment: an open exercise book and a pencil left on the small stool.',
      nobody: 'Nobody at all, only a pair of slippers.',
    }),
    shade: choice('What is the parasol like?', {
      red: 'Red and white panels, sun-bleached to pink.',
      blue: 'Faded blue with one patched panel.',
      yellow: 'A yellow give-away from a phone company, still fairly bright.',
      green: 'Green and white, a brewery hand-me-down.',
      torn: 'Torn: panels missing, ribs showing, a nylon bag tied over one gap.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const wood = s.material('#8a6a44'), dark = s.material('#2a2a2c');

    // Supports meet the common basin base at .38 metres.
    if(a.stand==='stool'){
      s.box([.58,.04,.52],[0,.36,0],wood);for(const x of[-1,1])for(const z of[-1,1])s.rod([x*.23,.34,z*.2],[x*.28,0,z*.24],.022,wood);
      for(const z of[-1,1])s.rod([-.25,.14,z*.22],[.25,.14,z*.22],.014,wood);
    }else if(a.stand==='crate'){
      s.box([.6,.035,.54],[0,.3625,0],wood);for(const x of[-.27,.27])for(const z of[-.24,.24])s.box([.04,.345,.04],[x,.1725,z],wood);
      for(let j=0;j<3;j++){for(const z of[-.25,.25])s.box([.6,.085,.025],[0,.065+j*.11,z],wood);for(const x of[-.28,.28])s.box([.025,.085,.54],[x,.065+j*.11,0],wood);}
    }else if(a.stand==='ring'){
      const metal=s.material('#77807a',{metalness:.45});s.ring(.25,.018,[0,.362,0],metal).rotation.x=Math.PI/2;
      for(let i=0;i<4;i++){const t=Math.PI/4+i*Math.PI/2;s.rod([Math.cos(t)*.25,.362,Math.sin(t)*.25],[Math.cos(t)*.31,0,Math.sin(t)*.31],.016,metal);}
    }else{s.box([.55,.35,.48],[0,.175,0],s.material('#a7a494'));s.box([.6,.03,.53],[0,.365,0],wood);}
    const basinStart=new Set(s.root.children);
    // Basin.
    const basinColour = { enamel: '#f1f0e8', flowers: '#efe6cc', plastic: pick(['#d8342c', '#2a62c8', '#2ca05a', '#e87a20']), aluminium: '#aeb2b2' }[a.basin];
    const basinMat = s.material(basinColour, { side: THREE.DoubleSide, roughness: a.basin === 'aluminium' ? 0.4 : 0.35, metalness: a.basin === 'aluminium' ? 0.7 : 0.05 });
    const base = 0.38;
    s.lathe([[0, 0], [0.25, 0], [0.42, 0.2], [0.455, 0.2], [0.455, 0.215], [0.41, 0.215], [0.245, 0.025], [0, 0.025]], basinMat, [0, base, 0]);
    if (a.basin === 'enamel' || a.basin === 'flowers') s.ring(0.455, 0.012, [0, base + 0.21, 0], s.material(a.basin === 'enamel' ? '#1f3f9a' : '#b3261e')).rotation.x = Math.PI / 2;
    if (a.basin === 'flowers') for (let i = 0; i < 9; i++) {
      const t = (i / 9) * Math.PI * 2 + random() * 0.3, r = 0.345;
      const bloom = s.ball([0.045, 0.045, 0.012], [Math.cos(t) * r, base + 0.11, Math.sin(t) * r], s.material(i % 3 ? '#c8322a' : '#2c8a56'), 8);
      bloom.lookAt(0, base + 0.5, 0);
    }
    const chips = Math.round(mood.wear * 7);
    if (a.basin !== 'plastic') for (let i = 0; i < chips; i++) {
      const t = random() * Math.PI * 2, h = random();
      const chip = s.ball([0.02 + random() * 0.025, 0.02 + random() * 0.02, 0.008], [Math.cos(t) * mix(0.27, 0.44, h), base + mix(0.03, 0.19, h), Math.sin(t) * mix(0.27, 0.44, h)], dark, 6);
      chip.lookAt(0, base + 0.6, 0);
    }

    // Water or ice.
    const fill = mix(0.08, 1, a.left);
    const level = a.ice === 'dry' ? 0 : a.ice === 'fresh' ? 0.03 : mix(0.06, 0.14, random());
    if (level > 0) {
      const r=.245+Math.max(0,level-.003)*.165/.19;
      s.cylinder(r, r, 0.006, [0, base + 0.025 + level, 0], s.material(a.ice === 'melted' ? '#9fb4b0' : '#bcd9e6', { roughness: 0.08, metalness: 0.1 }), 24);
    }
    const cubes = a.ice === 'fresh' ? 9 + Math.floor(random() * 5) : a.ice === 'slush' ? 4 : 0;
    const iceMat = s.material('#eaf6fb', { roughness: 0.15, emissive: '#bfe6f5', emissiveIntensity: 0.2 });

    // The inner floor rises from r=.245 to r=.41. Sample transformed geometry
    // against that profile so edge stock cannot pass through the basin wall.
    const bowlFloor=(x:number,z:number)=>base+.025+Math.max(0,(Math.hypot(x,z)-.245)/.165)*.19;
    const raiseToBowl=(node:THREE.Object3D)=>{
      node.updateMatrixWorld(true);let lift=-Infinity;node.traverse(n=>{const m=n as THREE.Mesh;if(!m.isMesh)return;const p=m.geometry.getAttribute('position');for(let j=0;j<p.count;j++){const v=new THREE.Vector3().fromBufferAttribute(p,j).applyMatrix4(m.matrixWorld);lift=Math.max(lift,bowlFloor(v.x,v.z)-v.y);}});node.position.y+=lift;node.updateMatrixWorld(true);
    };
    const sachetCount=a.sold==='sachets'?Math.round(4+fill*70):a.sold==='mixed'?Math.round(3+fill*38):0;
    const bottleKinds=a.sold==='zobo'?[['#7a1030','#e8e2d0'],['#efe9d8','#c8322a'],['#8a1a3a','#2ca05a']]:[['#3a1c10','#c8322a'],['#e8801c','#2a62c8'],['#3aa04a','#3aa04a'],['#d8ecf4','#2a62c8']];
    const bottleCount=a.sold==='sachets'?0:a.sold==='mixed'?Math.round(1+fill*5):Math.round(2+fill*17);
    const bottleSpots:P[]=[];
    if(a.sold==='mixed')for(let i=0;i<bottleCount;i++){const t=i*Math.PI*2/6;bottleSpots.push([Math.cos(t)*.3,0,Math.sin(t)*.3]);}
    else{const grid:P[]=[];for(let row=-3;row<=3;row++)for(let col=-3;col<=3;col++){const x=col*.087+(row%2)*.0435,z=row*.076;if(Math.hypot(x,z)<.23)grid.push([x,0,z]);}grid.sort((a,b)=>Math.hypot(a[0],a[2])-Math.hypot(b[0],b[2]));bottleSpots.push(...grid.slice(0,bottleCount));}
    const pillows:P[]=[];for(let row=-3;row<=3;row++)for(let col=-3;col<=3;col++){const x=col*.145,z=row*.105;if(Math.hypot(x,z)>.285)continue;if(bottleSpots.some(b=>Math.hypot(b[0]-x,b[2]-z)<.115))continue;pillows.push([x,0,z]);}
    pillows.sort((a,b)=>Math.hypot(a[0],a[2])-Math.hypot(b[0],b[2]));
    const pillowTops=new Map<number,number>(),pillowMat=s.material('#e3eff4',{roughness:.18});
    for(let i=0;i<sachetCount;i++){
      const slot=i%pillows.length,[x,,z]=pillows[slot],pillow=s.ball([.07,.022,.05],[x,base,z],pillowMat,8);
      if(pillowTops.has(slot))pillow.position.y=pillowTops.get(slot)!+.022;else raiseToBowl(pillow);
      pillow.updateMatrixWorld(true);pillowTops.set(slot,new THREE.Box3().setFromObject(pillow,true).max.y);
    }
    for(const at of bottleSpots){
      const [liquid,cap]=pick(bottleKinds),tall=a.sold==='zobo'?.2:mix(.2,.27,random()),g=new THREE.Group();
      g.add(s.cylinder(.034,.036,tall*.68,[0,tall*.34,0],s.material(liquid,{roughness:.2}),10),s.cylinder(.014,.034,tall*.24,[0,tall*.8,0],s.material(liquid,{roughness:.2}),10),s.cylinder(.017,.017,tall*.08,[0,tall*.96,0],s.material(cap),8));g.position.set(at[0],base,at[2]);s.root.add(g);raiseToBowl(g);
    }
    for(let i=0;i<cubes;i++){
      const t=i*Math.PI*2/Math.max(1,cubes)+.2,r=.36,size=a.ice==='fresh'?.045:.03;
      const cube=s.box([size,size*.7,size],[Math.cos(t)*r,base,Math.sin(t)*r],iceMat);cube.rotation.y=t;raiseToBowl(cube);
    }
    const basinGroup=new THREE.Group();basinGroup.position.y=base;for(const part of s.root.children.filter(n=>!basinStart.has(n))){part.position.y-=base;basinGroup.add(part);}basinGroup.scale.setScalar(mix(.85,1.15,a.basinSize));s.root.add(basinGroup);
    // Restock bags when business is heaped (or the mood is crowded).
    const bags = (a.left > 0.72 ? 1 : 0) + (a.left > 0.9 ? 1 : 0) + (mood.density > 0.75 ? 1 : 0);
    for (let i = 0; i < bags; i++) {
      const bag = s.ball([0.3, 0.12, 0.22], [0.1 + i * 0.5 + (random() - 0.5) * 0.1, 0.11, -0.62 + (random() - 0.5) * 0.12], s.material('#e3eef2', { roughness: 0.25, emissive: '#cfe6f0', emissiveIntensity: 0.12 }), 12);
      bag.rotation.y = random() * 3;
      s.ball([0.05, 0.05, 0.05], [bag.position.x + 0.24, bag.position.y + 0.08, bag.position.z], s.material('#e3eef2'), 6);
    }

    const cashStart=new Set(s.root.children);
    // Takings.
    const coin = (at: P) => { const c = s.cylinder(0.014, 0.014, 0.004, at, s.material(random() > 0.5 ? '#c9a84a' : '#b8bcc0', { metalness: 0.8, roughness: 0.3 }), 8); c.rotation.set((random() - 0.5) * 0.4, 0, (random() - 0.5) * 0.4); };
    if (a.takings === 'coins' || a.takings === 'notes') for (let i = 0; i < (a.takings === 'coins' ? 9 : 4); i++) coin([0.2 + (random() - 0.5) * 0.06, 0.383 + (i % 4) * 0.004, 0.17 + (random() - 0.5) * 0.05]);
    if (a.takings === 'notes') {
      for (let i = 0; i < 3; i++) s.box([0.13, 0.004, 0.065], [-0.18 + i * 0.012, 0.384 + i * 0.004, 0.17], s.material(pick(['#7a9a6a', '#b08a6a', '#9a7a9a']))).rotation.y = (random() - 0.5) * 0.5;
      s.ball([0.045, 0.03, 0.04], [-0.17, 0.41, 0.17], s.material('#7d7b74'), 8);
    }
    if (a.takings === 'tin') {
      const tx = 0.52, tz = 0.3;
      s.cylinder(0.05, 0.05, 0.1, [tx, 0.05, tz], s.material('#c8322a', { metalness: 0.4, roughness: 0.4 }), 14);
      s.cylinder(0.051, 0.051, 0.03, [tx, 0.05, tz], s.material('#f1f0e8'), 14);
      s.cylinder(0.052, 0.052, 0.006, [tx + 0.12, 0.004, tz + 0.05], s.material('#b8bcc0', { metalness: 0.7 }), 14);
      for (let i = 0; i < 12; i++) coin([tx + (random() - 0.5) * (i < 7 ? 0.06 : 0.25), i < 7 ? 0.104 + i * 0.002 : 0.004, tz + (random() - 0.5) * (i < 7 ? 0.06 : 0.25)]);
    }

    if(a.takings==='coins'||a.takings==='notes'){
      for(const node of s.root.children)if(!cashStart.has(node))node.position.x-=.65;
      s.box([.75,.035,.34],[-.55,.3625,.18],wood);for(const z of[.05,.31])s.rod([-.8,0,z],[-.8,.345,z],.018,wood);
    }
    if(a.extraStock!=='none'){
      const x=1.48,z=-.65;
      if(a.extraStock==='cooler'){s.box([.58,.35,.42],[x,.175,z],s.material('#4c8c9a'));s.box([.62,.06,.46],[x,.38,z],s.material('#e3dfcc'));}
      else if(a.extraStock==='crates')for(let j=0;j<2;j++){const y=j*.23;s.box([.5,.025,.38],[x,y+.0125,z],wood);for(const dx of[-.24,.24])s.box([.025,.23,.38],[x+dx,y+.115,z],wood);for(const dz of[-.18,.18])s.box([.5,.23,.025],[x,y+.115,z+dz],wood);}
      else{for(const dx of[-.23,.23])for(const dz of[-.16,.16])s.box([.025,.7,.025],[x+dx,.35,z+dz],wood);for(const y of[.12,.48]){s.box([.5,.025,.37],[x,y,z],wood);for(let i=0;i<5;i++){s.cylinder(.035,.035,.17,[x-.18+i*.09,y+.0975,z],s.material(i%2?'#661d35':'#d2decb'),10);s.cylinder(.018,.018,.02,[x-.18+i*.09,y+.1925,z],dark,8);}}}
    }
    if(a.servingTray!=='none'){
      const x=-.65,z=.6,y=.44,metal=s.material('#abb2ac',{metalness:.45});s.box([.44,.025,.3],[x,y,z],wood);for(const dx of[-.18,.18])for(const dz of[-.11,.11])s.rod([x+dx,0,z+dz],[x+dx,y-.0125,z+dz],.014,wood);
      if(a.servingTray==='cups')for(let i=0;i<3;i++)s.lathe([[0,0],[.04,0],[.055,.08],[.046,.08],[.031,.012],[0,.012]],metal,[x-.14+i*.14,y+.0125,z]);
      else if(a.servingTray==='tongs'){s.box([.16,.018,.2],[x-.1,y+.0215,z],s.material('#a49b80'));for(const dz of[-.035,.035])s.rod([x+.15,y+.025,z],[x-.02,y+.025,z+dz],.006,metal);}
      else{for(const dx of[-.13,.13])s.rod([x+dx,y+.0125,z],[x+dx,y+.16,z],.007,metal);s.ring(.13,.008,[x,y+.16,z],metal).rotation.x=Math.PI/2;for(let i=-2;i<=2;i++){const d=i*.04,h=Math.sqrt(.12*.12-d*d);s.rod([x-h,y+.145,z+d],[x+h,y+.145,z+d],.003,metal);}}
    }
    // Parasol in a concrete-filled tyre.
    const px = -0.55, pz = -0.42;
    s.ring(0.2, 0.085, [px, 0.085, pz], s.material('#232326', { roughness: 0.95 })).rotation.x = Math.PI / 2;
    s.cylinder(0.2, 0.2, 0.13, [px, 0.075, pz], s.material('#a9a79c'), 16);
    const shadeColours = { red: ['#d2362c', '#f0ece0'], blue: ['#3a6ab8', '#3a6ab8', '#3a6ab8', '#c8b08a'], yellow: ['#f0c41c'], green: ['#2c8a56', '#f0ece0'], torn: [pick(['#d2362c', '#3a6ab8', '#2c8a56']), '#e6e0cc'] }[a.shade];
    const gone = a.shade === 'torn' ? [Math.floor(random() * 8), Math.floor(random() * 8), Math.floor(random() * 8)] : mood.wear > 0.8 ? [Math.floor(random() * 8)] : [];
    const fade = a.shade === 'yellow' ? mood.wear * 0.4 : mix(0.08, 0.5, mood.wear) - mood.cheer * 0.08;
    const canopyY=mix(1.55,2.05,a.shadeHeight);
    const top = parasol(s,mix(.9,1.3,a.shadeSpan),.34, shadeColours, (panel) => gone.includes(panel), Math.max(0, fade));
    const lean = new THREE.Group();
    lean.position.set(px, 0.1, pz);
    lean.rotation.set((random() - 0.3) * 0.16, 0, -0.08 - random() * 0.1);
    lean.add(s.rod([0, 0, 0], [0,canopyY+.34,0], 0.02, s.material('#c9c6ba', { metalness: 0.5 })));
    top.position.y=canopyY;
    top.rotation.y = random() * 0.8;
    lean.add(top);
    if (a.shade === 'torn') {
      const t = ((gone[0] + 0.5) / 8) * Math.PI * 2;
      const nylon = s.ball([0.3, 0.02, 0.24], [Math.cos(t) * 0.6, 0.15, Math.sin(t) * 0.6], s.material('#1f1f24', { roughness: 0.3 }), 8);
      nylon.lookAt(Math.cos(t) * 3, 0.15 - 1, Math.sin(t) * 3);
      nylon.rotation.set(0, -t, -0.31);
      top.add(nylon);
    }
    s.root.add(lean);

    // The minder's seat follows the grounded kit figure's pelvis.
    const mx=.72,mz=-.1,child=a.minder==='child'||a.minder==='asleep';
    let f:ReturnType<typeof figure>|null=null,seat=.235;
    if(child){f=figure(s,{height:1.02,pose:'sitting',style:'doll',hair:'short',top:'#e8e8d4',bottom:'#315a80',skin:pick(['#5a3a28','#6b4630','#4a2f20']),shoes:'#2b3e49',face:'dots'});if(a.minder==='asleep'){f.joints.spine.rotation.x=.85;f.joints.neck.rotation.x=.5;f.settle();}s.root.add(f.root);f.root.rotation.y=-Math.PI/2;f.root.updateMatrixWorld(true);const hip=new THREE.Vector3();f.pelvis.getWorldPosition(hip);f.root.position.x+=mx-hip.x;f.root.position.z+=mz-hip.z;f.root.updateMatrixWorld(true);f.pelvis.getWorldPosition(hip);seat=hip.y-1.02*.045;}
    if(a.minder!=='nobody'){s.box([.26,.03,.22],[mx,seat-.015,mz],wood);for(const x of[-1,1])for(const z of[-1,1])s.rod([mx+x*.1,seat-.03,mz+z*.08],[mx+x*.12,0,mz+z*.1],.014,wood);}
    if (a.minder === 'homework') {
      const book = s.box([0.24, 0.008, 0.17], [mx, 0.24, mz], s.material('#f4f1e4'));
      book.rotation.y = 0.3;
      s.box([0.004, 0.01, 0.17], [mx, 0.242, mz], s.material('#3a6ab8')).rotation.y = 0.3;
      for (let i = 0; i < 5; i++) s.box([0.08, 0.002, 0.004], [mx - 0.06, 0.246, mz - 0.05 + i * 0.022], s.material('#4a5a9a')).rotation.y = 0.3;
      s.rod([mx + 0.06, 0.25, mz + 0.06], [mx + 0.13, 0.25, mz - 0.03], 0.005, s.material('#e8c020'));
    }
    if(f){
      const hip=new THREE.Vector3();f.pelvis.getWorldPosition(hip);
      const left=f.root.localToWorld(new THREE.Vector3(.08,hip.y+.17,.19)),right=f.root.localToWorld(new THREE.Vector3(-.08,hip.y+.12,.16));
      if(a.minder==='child')s.ball([.06,.02,.045],left.toArray() as P,s.material('#eaf2f5'),8);
      const gaps=[f.reach('left',left,{space:s.root}),f.reach('right',right,{space:s.root})];if(Math.max(...gaps)>1e-5)throw new Error('Water-stall child reach');
      f.lookAt(a.minder==='child'?new THREE.Vector3(mx-1,hip.y+.25,mz):left,s.root);
      s.root.userData.poseAudit={gaps,seat,figureMinY:new THREE.Box3().setFromObject(f.root,true).min.y};
    }
    if (a.minder === 'nobody') for (const z of [0, 0.1]) s.box([0.2, 0.02, 0.075], [mx + z * 0.4, 0.012, mz + z], s.material('#2a62c8')).rotation.y = 0.3 + z * 4;
    // A wet ring on the ground where the cold basin sweats and customers spill.
    if (a.ice !== 'dry') s.cylinder(0.5, 0.5, 0.003, [0.05, 0.002, 0.1], s.material('#6f6a5e', { roughness: 0.3 }), 20).scale.z = 0.8;
    // Spent sachets on the ground: more when the place is worn or busy.
    const litter = Math.round((mood.wear * 0.6 + mood.density * 0.4) * 9);
    for (let i = 0; i < litter; i++) {
      const flat = s.box([0.1, 0.004, 0.07], [(random() - 0.5) * 1.9, 0.003, 0.3 + random() * 0.7], s.material('#dfe9ec', { roughness: 0.3 }));
      flat.rotation.y = random() * 3;
    }

    if(a.groundTreatment!=='bare'){
      s.root.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(s.root,true),w=b.max.x-b.min.x+.1,d=b.max.z-b.min.z+.1,c=b.getCenter(new THREE.Vector3()),h=a.groundTreatment==='mat'?.008:a.groundTreatment==='planks'?.045:.025;
      const assembly=new THREE.Group();assembly.add(...s.root.children);assembly.position.y=h;s.root.add(assembly);
      const mat=s.material(a.groundTreatment==='mat'?'#a89061':a.groundTreatment==='planks'?'#8b7254':'#b4ad98');
      if(a.groundTreatment==='planks')for(let i=0;i<12;i++)s.box([w,h,d/12-.003],[c.x,h/2,b.min.z-.05+d*(i+.5)/12],mat);
      else if(a.groundTreatment==='tiles')for(let ix=0;ix<8;ix++)for(let iz=0;iz<6;iz++)s.box([w/8-.003,h,d/6-.003],[b.min.x-.05+w*(ix+.5)/8,h/2,b.min.z-.05+d*(iz+.5)/6],mat);
      else{s.box([w,h,d],[c.x,h/2,c.z],mat);for(let i=0;i<18;i++)s.rod([b.min.x-.05,h+.001,b.min.z-.05+d*(i+.5)/18],[b.max.x+.05,h+.001,b.min.z-.05+d*(i+.5)/18],.002,wood);}
    }
    const sway = mix(0.004, 0.03, mood.energy), tilt = lean.rotation.z;
    return s.finish({ update: (_dt, time) => { lean.rotation.z = tilt + Math.sin(time * 1.3) * sway; } });
  },
});
