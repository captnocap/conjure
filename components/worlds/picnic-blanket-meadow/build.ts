import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, mix, score } from '@conjure/kit';

type Triple = [number, number, number];
interface Instance { p: Triple; s: Triple; r?: Triple; c?: THREE.ColorRepresentation }

function canvasTexture(size: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  paint(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineWorld({
  questions: {
    edging: choice('How is the blanket edge finished?', { short: 'A short neat fringe.', long: 'Long loose tassels.', bound: 'A smooth bound edge.', pompoms: 'Small rounded wool pompoms.' }),
    weights: choice('What holds down the flat blanket corners?', { stones: 'Smooth grey stones.', pegs: 'Wooden pegs through corner loops.', cones: 'Heavy pinecones.', bottles: 'Small capped water bottles.' }),
    barkMarks: choice('What marks the shade tree bark?', { lichen: 'Pale patches of lichen.', moss: 'Green moss at the lower trunk.', knots: 'Dark oval knots.', peeling: 'Pale peeling bark flakes.' }),
    roots: choice('How do the exposed roots spread?', { buttress: 'Thick short buttress roots.', reaching: 'Long roots reaching into the meadow.', shallow: 'Thin shallow surface roots.', mossy: 'Low roots covered with moss.' }),
    approach: choice('What approach runs beside the picnic spot?', { earth: 'A narrow bare earth path.', stones: 'A row of flat stepping stones.', boards: 'Short wooden walkway slats.', gravel: 'A pale gravel strip.' }),
    seat: choice('What small seat stands beyond the blanket?', { bench: 'A wooden bench with a back.', log: 'A fallen log with exposed ends.', stool: 'A three-legged round stool.', mat: 'A rolled-end woven sitting mat.' }),
    blanket: choice('What is the blanket like?', {
      tartan: 'Red tartan wool with green and yellow lines, the classic picnic rug.',
      gingham: 'Blue and white gingham, fresh and wholesome.',
      watch: 'Dark green and navy check, a sober car-boot travelling rug.',
      madras: 'A soft pastel plaid of yellow, pink and teal, sun-bleached and pretty.',
      quilt: 'A hand-sewn patchwork quilt brought out from the house.',
      army: 'A plain grey army blanket with two dark stripes, making do.',
    }),
    weather: choice('What is the weather doing?', {
      clear: 'High clear sun, sharp dapples of light through the leaves.',
      hazy: 'Soft white haze, heat and stillness, everything pale.',
      golden: 'Late golden light, long and warm, the day winding down.',
      turning: 'It is turning: the sky has gone slate, a gust lifts the blanket corner and leaves fly.',
    }),
    tree: choice('What tree gives the shade?', {
      oak: 'A broad old oak with a thick trunk and heavy crown.',
      willow: 'A weeping willow trailing long curtains of leaves.',
      birch: 'A slim silver birch with a light, airy crown.',
      apple: 'An apple tree, in pink blossom or hung with red fruit.',
    }),
    grass: score('How long is the grass?', ['A mown park lawn', 'Ankle deep', 'Knee-high hay meadow gone to seed']),
    flowers: choice('What wildflowers grow at the edges?', {
      daisies: 'White daisies and yellow buttercups.',
      poppies: 'Scarlet poppies.',
      cornflowers: 'Blue cornflowers and purple clover.',
      clocks: 'Dandelions gone to pale seed-heads.',
      none: 'None: just grass.',
    }),
    shoes: choice('Whose shoes are kicked off at the corner?', {
      sandals: 'A pair of leather sandals.',
      plimsolls: 'White canvas plimsolls, laces loose.',
      brogues: 'Brown brogues with socks balled up beside them.',
      wellies: 'A child\'s small bright wellington boots.',
      heels: 'High-heeled shoes, impractical for a field.',
      both: 'Two pairs side by side, his and hers.',
      none: 'Nobody\'s: no shoes at all.',
    }),
    beyond: choice('What lies beyond the grass?', {
      wheat: 'A pale gold field of wheat and a far hedge.',
      pasture: 'Green pasture rising to a line of distant trees.',
      water: 'A glint of river or lake and the far bank.',
      town: 'Park railings and the roofs of a town.',
    }),
    left: choice('What else has been left lying about?', {
      nothing: 'Nothing else.',
      ball: 'A football in the grass.',
      kite: 'A kite lying where it came down, its tail trailing.',
      cards: 'A game of cards scattered on the blanket.',
      net: 'A butterfly net and a jam jar.',
      cushions: 'A couple of cushions with the dent of a head still in one.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const stormy = a.weather === 'turning';
    const sky = new THREE.Color({ clear: '#dde8ea', hazy: '#ebe8d8', golden: '#f0dfc4', turning: '#b4bac4' }[a.weather]);
    const grassBase = new THREE.Color().setHSL(mix(0.2, 0.27, mood.cheer) - (a.weather === 'golden' ? 0.03 : 0), mix(0.32, 0.52, mood.cheer), stormy ? 0.33 : 0.38);
    const W = 12.6, D = 10.2, BW = 8.8, BD = 6.4;
    const { art: s, world } = diorama(context, {
      background: `#${sky.getHexString()}`, floor: `#${grassBase.getHexString()}`, width: W, depth: D, pitch: 24, yaw: 30, maxHeight: 2.5, radius: 1.2,
      slots: [[0.1, 0.5, 0.09], [-2.6, -1.3, 0.09, 0.85], [2.5, -1.4, 0.09, 0.85], [-1.8, 1.9, 0.09, 0.7], [2.3, 1.2, 0.09, 0.7]],
    });
    const key = world.keyLight!;
    key.intensity = { clear: 3.1, hazy: 2.6, golden: 2.9, turning: 1.7 }[a.weather];
    if (a.weather === 'golden') key.color.lerp(new THREE.Color('#ffc978'), 0.6);
    if (stormy) key.color.lerp(new THREE.Color('#c8d2e6'), 0.6);
    for (const node of s.root.children) if ((node as THREE.HemisphereLight).isHemisphereLight) (node as THREE.HemisphereLight).intensity = stormy ? 1.1 : 1.3;
    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, items: Instance[], cast = true) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
      const dummy = new THREE.Object3D();
      items.forEach((item, i) => {
        dummy.position.set(...item.p); dummy.rotation.set(...(item.r ?? [0, 0, 0])); dummy.scale.set(...item.s); dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        if (item.c !== undefined) mesh.setColorAt(i, new THREE.Color(item.c));
      });
      mesh.count = items.length;
      mesh.castShadow = cast; mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const turn = 0.09 + (random() - 0.5) * 0.1;
    const onBlanket = (x: number, z: number, margin = 0) => {
      const lx = x * Math.cos(turn) - z * Math.sin(turn), lz = x * Math.sin(turn) + z * Math.cos(turn);
      return Math.abs(lx) < BW / 2 + margin && Math.abs(lz) < BD / 2 + margin;
    };

    // The blanket: a rumpled sheet with one corner turned back.
    const pattern = canvasTexture(256, (ctx) => {
      const bands = (base: string, list: readonly (readonly [number, number, string])[]) => {
        ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256); ctx.globalAlpha = 0.56;
        for (const [at, wide, colour] of list) { ctx.fillStyle = colour; ctx.fillRect(at * 256, 0, wide * 256, 256); ctx.fillRect(0, at * 256, 256, wide * 256); }
        ctx.globalAlpha = 1;
      };
      if (a.blanket === 'tartan') bands('#b5202b', [[0.08, 0.16, '#16314f'], [0.32, 0.03, '#f1c62b'], [0.48, 0.16, '#17472f'], [0.7, 0.03, '#f4efe2'], [0.86, 0.08, '#15151a']]);
      else if (a.blanket === 'gingham') bands('#f6f3ea', [[0, 0.25, '#3b62a8'], [0.5, 0.25, '#3b62a8']]);
      else if (a.blanket === 'watch') bands('#1f4a36', [[0.06, 0.22, '#15234a'], [0.38, 0.05, '#0d0f12'], [0.56, 0.22, '#15234a'], [0.88, 0.05, '#0d0f12']]);
      else if (a.blanket === 'madras') bands('#f3e3a0', [[0.05, 0.18, '#e88aa0'], [0.3, 0.08, '#4aa6a0'], [0.5, 0.2, '#f0a04a'], [0.8, 0.06, '#f8f4e6'], [0.9, 0.05, '#4aa6a0']]);
      else if (a.blanket === 'quilt') {
        const scraps = ['#d8697f', '#7f9ad0', '#e3b23a', '#8fbf8a', '#f1e6cf', '#b38ac8', '#e89a6a', '#5f8f9a'];
        for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) {
          ctx.fillStyle = scraps[Math.floor(random() * scraps.length)]; ctx.fillRect(x * 64, y * 64, 64, 64);
          if (random() < 0.5) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(x * 64 + 10 + (k % 3) * 22, y * 64 + 10 + Math.floor(k / 3) * 22, 4, 0, 7); ctx.fill(); } }
          else { ctx.fillStyle = 'rgba(0,0,0,0.14)'; for (let k = 0; k < 64; k += 12) ctx.fillRect(x * 64 + k, y * 64, 5, 64); }
          ctx.strokeStyle = '#f6f2e6'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.strokeRect(x * 64 + 3, y * 64 + 3, 58, 58);
        }
      } else {
        ctx.fillStyle = '#7f8a78'; ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '60,62,58' : '190,192,184'},0.2)`; ctx.fillRect(random() * 256, random() * 256, 3, 1); }
      }
      ctx.fillStyle = `rgba(205,200,186,${mood.wear * 0.4})`; ctx.fillRect(0, 0, 256, 256);
    });
    if (a.blanket === 'army') pattern.repeat.set(1, 1); else pattern.repeat.set(a.blanket === 'quilt' ? 3 : 5, a.blanket === 'quilt' ? 2.2 : 3.6);
    const cloth = new THREE.PlaneGeometry(BW, BD, 44, 32);
    cloth.rotateX(-Math.PI / 2);
    {
      const pos = cloth.attributes.position;
      const corner = new THREE.Vector2(-BW / 2, BD / 2), inward = new THREE.Vector2(1, -1).normalize(), fold = stormy ? 1.25 : 0.8 + random() * 0.4;
      const phases = [random() * 6, random() * 6, random() * 6];
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i), z = pos.getZ(i);
        const edge = Math.max(Math.abs(x) / (BW / 2), Math.abs(z) / (BD / 2));
        let y = 0.045 + Math.sin(x * 1.3 + phases[0]) * Math.sin(z * 1.7 + phases[1]) * 0.016 + Math.max(0, edge - 0.82) * Math.sin((x + z) * 4 + phases[2]) * 0.12;
        const reach = (x - corner.x) * inward.x + (z - corner.y) * inward.y;
        if (reach < fold) {
          x += 2 * (fold - reach) * inward.x * 0.96; z += 2 * (fold - reach) * inward.y * 0.96;
          y += 0.035 + Math.sin(Math.min(1, (fold - reach) / fold) * Math.PI) * (stormy ? 0.55 : 0.07);
        }
        pos.setXYZ(i, x, Math.max(0.03, y), z);
      }
      cloth.computeVertexNormals();
    }
    const rug = s.mesh(cloth, new THREE.MeshStandardMaterial({ map: pattern, roughness: 0.96, side: THREE.DoubleSide }));
    rug.rotation.y = turn;
    if (a.blanket === 'army') for (const side of [-1, 1]) for (const offset of [0.5, 0.85]) {
      const stripe = s.box([0.3, 0.012, BD - 0.1], [0, 0, 0], s.material('#59606a', { roughness: 0.95 }));
      stripe.position.set(Math.cos(turn) * side * (BW / 2 - offset), 0.075, -Math.sin(turn) * side * (BW / 2 - offset)); stripe.rotation.y = turn;
    }
    // Fringe along the two short ends.
    const fringeTone = { tartan: '#b5202b', gingham: '#e9e6dc', watch: '#1f4a36', madras: '#f3e3a0', quilt: '#f1e6cf', army: '#8a8f84' }[a.blanket];
    const fringe: Instance[] = [];
    for (const side of [-1, 1]) for (let i = 0; i < 64; i++) {
      const lz = -BD / 2 + 0.05 + (i / 63) * (BD - 0.1), lx = side * (BW / 2 + 0.1);
      if (side === -1 && lz > BD / 2 - 1.6) continue;
      fringe.push({ p: [lx * Math.cos(turn) + lz * Math.sin(turn), 0.03, -lx * Math.sin(turn) + lz * Math.cos(turn)], s: [0.26 + random() * 0.08, 0.02, 0.035], r: [0, turn + (random() - 0.5) * 0.5, side * 0.12] });
    }
    if(a.edging==='short'||a.edging==='long') {if(a.edging==='long')for(const item of fringe){item.s[0]*=1.9;item.s[2]*=.75;}instanced(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:fringeTone,roughness:.95}),fringe);}
    else {
      const pos=cloth.attributes.position, boundary:number[]=[];
      for(let x=0;x<=44;x++)boundary.push(x);
      for(let z=1;z<=32;z++)boundary.push(z*45+44);
      for(let x=43;x>=0;x--)boundary.push(32*45+x);
      for(let z=31;z>0;z--)boundary.push(z*45);
      const edgePaint=s.material(fringeTone,{roughness:.95});
      const points=boundary.map(i=>{const x=pos.getX(i),z=pos.getZ(i);return [x*Math.cos(turn)+z*Math.sin(turn),pos.getY(i)+.014,-x*Math.sin(turn)+z*Math.cos(turn)] as Triple;});
      for(let i=0;i<points.length;i++) if(a.edging==='bound')s.rod(points[i],points[(i+1)%points.length],.022,edgePaint);else if(i%3===0)s.ball([.065,.05,.065],points[i],edgePaint,8);
    }
    // Weights sit on the three flat corners, leaving the folded corner free.
    const cornerToWorld=(x:number,z:number,y:number):Triple=>[x*Math.cos(turn)+z*Math.sin(turn),y,-x*Math.sin(turn)+z*Math.cos(turn)];
    for(const [x,z] of [[BW/2-.28,BD/2-.28],[BW/2-.28,-BD/2+.28],[-BW/2+.28,-BD/2+.28]]) {
      const [wx,,wz]=cornerToWorld(x,z,.06);
      if(a.weights==='stones')s.ball([.22,.11,.16],[wx,.16,wz],s.material('#8a8d83'),10);
      if(a.weights==='pegs'){s.cylinder(.045,.045,.24,[wx,.12,wz],s.material('#a48152'),8);const loop=s.ring(.12,.018,[wx,.07,wz],s.material(fringeTone));loop.rotation.x=Math.PI/2;}
      if(a.weights==='cones'){s.ball([.13,.22,.13],[wx,.27,wz],s.material('#775333'),9);for(let j=0;j<5;j++){const ring=s.ring(.12*(1-j*.1),.025,[wx,.12+j*.065,wz],s.material('#987443'));ring.rotation.x=Math.PI/2;}}
      if(a.weights==='bottles'){s.cylinder(.105,.105,.39,[wx,.25,wz],s.material('#a8c6c9'),14);s.cylinder(.055,.055,.12,[wx,.505,wz],s.material('#d8e6df'),12);s.cylinder(.06,.06,.045,[wx,.585,wz],s.material('#376181'),12);}
    }
    // A narrow approach remains outside the blanket and foreground shoes.
    const pathX=W/2-.5,pathZ=-1.5,pathLength=5;
    if(a.approach==='earth'||a.approach==='gravel')s.box([.68,.018,pathLength],[pathX,.009,pathZ],s.material(a.approach==='earth'?'#9d8662':'#c6c1a5'));
    if(a.approach==='stones')for(let i=0;i<8;i++)s.ball([.3,.055,.23],[pathX+Math.sin(i)*.08,.055,pathZ-pathLength/2+i*.65],s.material('#999f8d'),10);
    if(a.approach==='boards')for(let i=0;i<18;i++)s.box([.7,.045,.22],[pathX,.0225,pathZ-pathLength/2+i*.28],s.material(i%2?'#ad9872':'#998660'));
    if(a.approach==='gravel')for(let i=0;i<70;i++)s.ball([.035,.018,.03],[pathX+(random()-.5)*.6,.03,pathZ+(random()-.5)*pathLength],s.material(i%2?'#a7aa95':'#ded7b8'),5);
    const seatX=3.9,seatZ=-4.25,seatWood=s.material('#93714c');
    if(a.seat==='bench'){for(const x of [-.65,.65])for(const z of [-.24,.24])s.box([.09,.6,.09],[seatX+x,.3,seatZ+z],seatWood);for(let i=0;i<3;i++)s.box([1.65,.08,.18],[seatX,.64,seatZ-.2+i*.2],seatWood);for(const x of [-.65,.65])s.box([.08,.7,.08],[seatX+x,.83,seatZ-.28],seatWood);for(const y of [.9,1.13])s.box([1.65,.16,.07],[seatX,y,seatZ-.28],seatWood);}
    if(a.seat==='log'){const log=s.cylinder(.27,.3,1.8,[seatX,.29,seatZ],s.material('#76634b'),14);log.rotation.z=Math.PI/2;for(const x of [-.906,.906]){const end=s.cylinder(.268,.268,.008,[seatX+x,.29,seatZ],s.material('#c6ae7c'),14);end.rotation.z=Math.PI/2;}}
    if(a.seat==='stool'){s.cylinder(.38,.38,.09,[seatX,.62,seatZ],seatWood,20);for(let i=0;i<3;i++){const t=i*Math.PI*2/3;s.rod([seatX+Math.cos(t)*.31,.03,seatZ+Math.sin(t)*.31],[seatX+Math.cos(t)*.22,.58,seatZ+Math.sin(t)*.22],.04,seatWood);}}
    if(a.seat==='mat'){s.box([1.5,.035,.75],[seatX,.0175,seatZ],s.material('#c2ab79'));for(const x of [-.72,.72]){const end=s.cylinder(.075,.075,.75,[seatX+x,.075,seatZ],s.material('#9c875e'),14);end.rotation.x=Math.PI/2;}for(let i=0;i<20;i++)s.box([.018,.006,.75],[seatX-.67+i*.07,.039,seatZ],s.material('#8b774c'));}

    // Grass: long at the back and left, kept low between the camera and the blanket.
    const wind = stormy ? 0.45 : 0.08 + mood.energy * 0.12;
    const blades: Instance[] = [];
    const bladeCount = Math.round(1500 + a.grass * 1700);
    for (let i = 0; i < bladeCount; i++) {
      const x = (random() - 0.5) * W, z = (random() - 0.5) * D;
      if (onBlanket(x, z, -0.12) || (Math.abs(x-pathX)<.4 && Math.abs(z-pathZ)<pathLength/2+.1) || (Math.abs(x-seatX)<1 && Math.abs(z-seatZ)<.5)) continue;
      const front = z > 1 && x > -4 || x > 4.5, rim = Math.max(Math.abs(x) / (W / 2), Math.abs(z) / (D / 2));
      const h = mix(0.1, 0.95, a.grass) * (0.55 + random() * 0.9) * (front ? 0.45 : 1) * (rim > 0.8 ? 1.3 : 1) + 0.05;
      const straw = random() < 0.12 + mood.wear * 0.25 + a.grass * 0.12;
      blades.push({ p: [x, 0, z], s: [0.03 + random() * 0.03, h, 0.03 + random() * 0.02], r: [(random() - 0.5) * 0.4, random() * 6.28, (random() - 0.5) * 0.4 - wind],
        c: straw ? new THREE.Color().setHSL(0.13, 0.4, 0.62) : grassBase.clone().offsetHSL((random() - 0.5) * 0.04, 0.05, -0.08 + random() * 0.14) });
    }
    const bladeGeometry = new THREE.ConeGeometry(1, 1, 3, 1, true);
    bladeGeometry.translate(0, 0.5, 0);
    instanced(bladeGeometry, new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }), blades);

    // Wildflowers crowding the blanket's edges and the long grass.
    if (a.flowers !== 'none') {
      const palettes = { daisies: [['#fbfaf2', '#e9b820'], ['#f2d21c', '#d8a514']], poppies: [['#d8281c', '#1c1a1a'], ['#e8402c', '#1c1a1a']], cornflowers: [['#3f66d8', '#27377a'], ['#a868c8', '#7a3a8a']], clocks: [['#f1f0e6', '#d9d6c4'], ['#f2d21c', '#d8a514']] }[a.flowers];
      const stems: Instance[] = [], heads: Instance[] = [], hearts: Instance[] = [];
      const want = Math.round(60 + mood.density * 150);
      for (let i = 0, placed = 0; i < want * 8 && placed < want; i++) {
        const x = (random() - 0.5) * W * 0.98, z = (random() - 0.5) * D * 0.98;
        if (onBlanket(x, z, 0.1) || (Math.abs(x-pathX)<.4 && Math.abs(z-pathZ)<pathLength/2+.1) || (Math.abs(x-seatX)<1 && Math.abs(z-seatZ)<.5)) continue;
        if (!onBlanket(x, z, 1.5) && z > -3.5 && x > -5 && random() < 0.75) continue;
        const front = z > 1 && x > -4 || x > 4.6;
        const h = (front ? 0.22 : 0.3 + a.grass * 0.5) * (0.7 + random() * 0.6), [petal, heart] = palettes[random() < 0.72 ? 0 : 1];
        const lean: Triple = [(random() - 0.5) * 0.3, 0, (random() - 0.5) * 0.3 - wind * 0.6];
        const size = a.flowers === 'clocks' ? 0.11 : a.flowers === 'poppies' ? 0.13 : 0.1;
        const tip: Triple = [x - Math.sin(lean[2]) * h, Math.cos(lean[2]) * h, z + Math.sin(lean[0]) * h];
        stems.push({ p: [x, 0, z], s: [0.012, h, 0.012], r: lean });
        heads.push({ p: tip, s: [size, a.flowers === 'clocks' ? size : size * 0.4, size], c: petal, r: [lean[0] + (random() - 0.5) * 0.5, 0, lean[2] + (random() - 0.5) * 0.5] });
        if (a.flowers !== 'clocks') hearts.push({ p: [tip[0], tip[1] + size * 0.25, tip[2]], s: [size * 0.42, size * 0.4, size * 0.42], c: heart });
        placed++;
      }
      const stemGeometry = new THREE.CylinderGeometry(1, 1, 1, 4); stemGeometry.translate(0, 0.5, 0);
      instanced(stemGeometry, new THREE.MeshStandardMaterial({ color: '#5f8a3c', roughness: 0.9 }), stems, false);
      instanced(new THREE.SphereGeometry(1, 8, 5), new THREE.MeshStandardMaterial({ roughness: 0.7 }), heads);
      if (hearts.length) instanced(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ roughness: 0.8 }), hearts, false);
    }

    // The tree at the back left, its crown reaching over the blanket.
    const tx = -5.3, tz = -4.1, slim = a.tree === 'birch' ? 0.5 : a.tree === 'apple' ? 0.7 : a.tree === 'willow' ? 0.85 : 1;
    const treeHeight = a.tree === 'apple' ? 3.3 : 4.1;
    const bark = canvasTexture(128, (ctx) => {
      ctx.fillStyle = a.tree === 'birch' ? '#e6e2d4' : a.tree === 'willow' ? '#7a6a52' : '#6a5540'; ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < (a.tree === 'birch' ? 34 : 90); i++) {
        ctx.fillStyle = a.tree === 'birch' ? '#2c2a26' : `rgba(30,20,10,${0.15 + random() * 0.3})`;
        if (a.tree === 'birch') ctx.fillRect(random() * 128, random() * 128, 8 + random() * 22, 2 + random() * 3);
        else ctx.fillRect(random() * 128, 0, 1 + random() * 4, 128);
      }
    });
    const barkCanvas=bark.image as HTMLCanvasElement,barkCtx=barkCanvas.getContext('2d')!;
    for(let i=0;i<22;i++){const x=random()*128,y=random()*128;barkCtx.fillStyle={lichen:'#b9baa0',moss:'#556d36',knots:'#3f3325',peeling:'#d9ccb2'}[a.barkMarks];barkCtx.beginPath();barkCtx.ellipse(x,y,a.barkMarks==='knots'?3:4+random()*7,a.barkMarks==='peeling'?12:3+random()*5,random(),0,7);barkCtx.fill();if(a.barkMarks==='peeling'){barkCtx.fillStyle='#8b795c';barkCtx.fillRect(x+4,y-6,1,12);}}
    bark.needsUpdate=true;
    bark.repeat.set(3, 2);
    const barkPaint = new THREE.MeshStandardMaterial({ map: bark, roughness: 0.95 });
    s.lathe([[1.25 * slim, -0.1], [0.85 * slim, 0.35], [0.62 * slim, 1.2], [0.52 * slim, treeHeight * 0.6], [0.4 * slim, treeHeight]], barkPaint, [tx, 0, tz]);
    const rootReach={buttress:1.6,reaching:2.8,shallow:2.1,mossy:1.9}[a.roots],rootH={buttress:.7,reaching:.4,shallow:.15,mossy:.25}[a.roots];
    for (let i = 0; i < 6; i++) { const angle = i * 1.05 + random() * 0.5; s.rod([tx + Math.cos(angle) * 0.5 * slim, rootH, tz + Math.sin(angle) * 0.5 * slim], [tx + Math.cos(angle) * rootReach * slim, -.03, tz + Math.sin(angle) * rootReach * slim], (a.roots==='shallow'?.12:.3)*slim,barkPaint,.05);if(a.roots==='mossy')s.ball([.35,.12,.28],[tx+Math.cos(angle)*slim,.13,tz+Math.sin(angle)*slim],s.material('#607842'),8); }
    const leafTone = new THREE.Color({ oak: '#5f9040', willow: '#8aa64a', birch: '#8fb85a', apple: '#68994a' }[a.tree]).offsetHSL(0, (mood.cheer - 0.5) * 0.15, stormy ? -0.02 : 0);
    const crowns: Instance[] = [], strands: Instance[] = [], dots: Instance[] = [];
    const boughs = a.tree === 'birch' ? 16 : 24;
    for (let i = 0; i < boughs; i++) {
      const angle = random() * 6.28, r = Math.sqrt(random()) * (a.tree === 'birch' ? 2.1 : a.tree === 'apple' ? 2.6 : 3.3);
      const size = (a.tree === 'birch' ? 0.7 : 1.0) * (0.75 + random() * 0.6);
      const p: Triple = [tx + 0.9 + Math.cos(angle) * r, treeHeight + 0.4 + (1 - r / 3.4) * 1.2 + random() * 0.4, tz + 0.6 + Math.sin(angle) * r * 0.8];
      crowns.push({ p, s: [size, size * 0.78, size], r: [random() * 3, random() * 3, 0], c: leafTone.clone().offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.3) * 0.1) });
      if (i < 5) s.rod([tx, treeHeight * (0.7 + random() * 0.25), tz], [p[0], p[1] - size * 0.3, p[2]], 0.18 * slim, barkPaint, 0.06);
      if (a.tree === 'willow') for (let k = 0; k < 7; k++) {
        const drop = 1.6 + random() * 1.8;
        strands.push({ p: [p[0] + (random() - 0.5) * size * 1.6, p[1] - drop / 2, p[2] + (random() - 0.5) * size * 1.6], s: [0.07, drop, 0.07], r: [0, random() * 3, -wind * 0.5], c: leafTone.clone().offsetHSL(0, 0, random() * 0.1) });
      }
      if (a.tree === 'apple') for (let k = 0; k < 6; k++) {
        const dir = new THREE.Vector3(random() - 0.5, random() - 0.3, random() - 0.2).normalize();
        dots.push({ p: [p[0] + dir.x * size, p[1] + dir.y * size * 0.78, p[2] + dir.z * size], s: [0.13, 0.13, 0.13], c: mood.warmth > 0.5 ? '#c8242c' : '#f6c1cf' });
      }
    }
    if (a.tree === 'apple') for (let k = 0; k < 9; k++) { const x = tx + 1 + (random() - 0.5) * 6, z = tz + 1 + (random() - 0.5) * 4; if (!onBlanket(x, z, 0.2)) dots.push({ p: [x, 0.1, z], s: [0.13, 0.13, 0.13], c: mood.warmth > 0.5 ? '#c8242c' : '#f6c1cf' }); }
    instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), crowns);
    if (strands.length) instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9 }), strands);
    if (dots.length) instanced(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.5 }), dots);

    // The hazy country beyond, in bands that fade toward the sky.
    const tones = { wheat: ['#e3cf8a', '#8fa26a', '#a9b8a4'], pasture: ['#a6bd7a', '#7f9d68', '#a3b6a8'], water: ['#b5c98a', '#a9cbd6', '#9fb2a8'], town: ['#9fb07a', '#b9a892', '#aab0b4'] }[a.beyond];
    const haze = a.weather === 'hazy' ? 0.14 : stormy ? 0.06 : 0;
    const band = (index: number, height: number) => {
      const tone = new THREE.Color(tones[index]).lerp(sky, [0.05, 0.18, 0.36][index] + haze).multiplyScalar(0.84);
      const paint = new THREE.MeshStandardMaterial({ color: tone, roughness: 1 });
      const out = 0.5 + index * 1.0;
      s.box([W + out + 0.5, height, 1], [-out / 2 - 0.25, height / 2 - 0.25, -D / 2 - out], paint).castShadow = false;
      s.box([1, height, D + out + 0.5], [-W / 2 - out, height / 2 - 0.25, -out / 2 - 0.25], paint).castShadow = false;
      return { tone, paint, out };
    };
    band(0, a.beyond === 'water' ? 0.45 : 0.65);
    const middle = band(1, a.beyond === 'water' ? 0.55 : 1.0);
    const far = band(2, 1.5);
    const lumps: Instance[] = [];
    for (let i = 0; i < 30; i++) {
      const along = (i / 29) * (W + D + 4) - 2, back = along < W + 2;
      const p: Triple = back ? [-W / 2 - 2.4 + along, 1.2 + random() * 0.2, -D / 2 - far.out] : [-W / 2 - far.out, 1.2 + random() * 0.2, -D / 2 - 2.4 + (along - W - 2)];
      lumps.push({ p, s: [0.7 + random() * 0.7, 0.4 + random() * (a.beyond === 'pasture' ? 0.9 : 0.45), 0.5], c: far.tone.clone().offsetHSL(0, 0, -0.04) });
    }
    instanced(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ roughness: 1 }), lumps, false);
    if (a.beyond === 'town') {
      const roof = new THREE.MeshStandardMaterial({ color: new THREE.Color('#b0685a').lerp(sky, 0.5 + haze), roughness: 1 });
      const wallPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color('#e6dcc6').lerp(sky, 0.45 + haze), roughness: 1 });
      for (let i = 0; i < 7; i++) {
        const x = -W / 2 + 1 + i * 1.75 + random() * 0.5, h = 0.6 + random() * 0.9, w = 1.1 + random() * 0.5;
        s.box([w, h, 0.6], [x, 0.75 + h / 2, -D / 2 - middle.out - 0.1], wallPaint).castShadow = false;
        const gable = s.cylinder(0, w * 0.75, 0.55, [x, 0.75 + h + 0.27, -D / 2 - middle.out - 0.1], roof, 4); gable.rotation.y = Math.PI / 4; gable.castShadow = false;
      }
      const spire = s.cylinder(0, 0.3, 1.5, [3.5, 2.75, -D / 2 - middle.out - 0.2], roof, 4); spire.castShadow = false;
      s.box([0.5, 1.4, 0.5], [3.5, 1.4, -D / 2 - middle.out - 0.2], wallPaint).castShadow = false;
      const iron = s.material('#3a4038');
      for (let i = 0; i < 32; i++) s.rod([-W / 2 + 0.2 + i * 0.4, 0, -D / 2 + 0.15], [-W / 2 + 0.2 + i * 0.4, 0.95, -D / 2 + 0.15], 0.025, iron).castShadow = false;
      s.box([W, 0.05, 0.05], [0, 0.8, -D / 2 + 0.15], iron);
    } else if (a.beyond === 'water') {
      const sail = new THREE.MeshStandardMaterial({ color: new THREE.Color('#fbf8f0').lerp(sky, 0.2), roughness: 1, side: THREE.DoubleSide });
      for (let i = 0; i < 2; i++) { const x = -4 + i * 6 + random() * 2; const boat = s.cylinder(0, 0.38, 0.9, [x, 0.85, -D / 2 - middle.out], sail, 3); boat.scale.z = 0.15; boat.castShadow = false; s.box([0.8, 0.12, 0.2], [x, 0.36, -D / 2 - middle.out], s.material('#8a5a3a')).castShadow = false; }
    } else if (a.beyond === 'wheat') {
      const bale = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d9bd6a').lerp(sky, 0.3 + haze), roughness: 1 });
      for (let i = 0; i < 4; i++) { const roll = s.cylinder(0.32, 0.32, 0.5, [-4.5 + i * 2.8 + random(), 0.7, -D / 2 - 0.5], bale, 14); roll.rotation.z = Math.PI / 2; roll.rotation.y = random(); roll.castShadow = false; }
    }
    if (stormy) {
      const cloud = new THREE.MeshStandardMaterial({ color: '#7f8794', roughness: 1 });
      const puffs: Instance[] = [];
      for (let i = 0; i < 22; i++) puffs.push({ p: [-W / 2 - 1 + random() * (W + 1), 6.4 + random() * 0.8, -D / 2 - 2.6 + (random() - 0.5)], s: [1.3 + random() * 1.5, 0.55 + random() * 0.5, 1] });
      instanced(new THREE.SphereGeometry(1, 12, 8), cloud, puffs, false);
    }

    // Shoes kicked off at the near corner.
    const shoe = (kind: 'sandals' | 'plimsolls' | 'brogues' | 'wellies' | 'heels', small = 1) => {
      const g = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
      const upper = s.material({ sandals: '#9a6a3a', plimsolls: '#f4f1e6', brogues: '#6a3f22', wellies: mood.cheer > 0.5 ? '#e3b21c' : '#c8303a', heels: mood.cheer > 0.5 ? '#c8242c' : '#1c1a1e' }[kind], { roughness: kind === 'wellies' || kind === 'heels' ? 0.25 : 0.7 });
      const soleTone = s.material(kind === 'plimsolls' ? '#e9e6dc' : kind === 'sandals' ? '#b98a55' : '#2a2420', { roughness: 0.8 });
      const sole = new THREE.Shape();
      sole.moveTo(-0.15, -0.5); sole.quadraticCurveTo(-0.2, 0, -0.19, 0.3); sole.quadraticCurveTo(-0.12, 0.56, 0.02, 0.55); sole.quadraticCurveTo(0.2, 0.5, 0.2, 0.2); sole.quadraticCurveTo(0.17, -0.2, 0.15, -0.5); sole.quadraticCurveTo(0, -0.58, -0.15, -0.5);
      const base = add(new THREE.Mesh(new THREE.ExtrudeGeometry(sole, { depth: kind === 'heels' ? 0.03 : 0.07, bevelEnabled: false }), soleTone));
      base.rotation.x = Math.PI / 2; base.position.y = kind === 'heels' ? 0.03 : 0.07; base.scale.y = -1;
      if (kind === 'sandals') {
        for (const z of [0.25, -0.05]) { const strap = add(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 5, 12, Math.PI), upper)); strap.position.set(0, 0.07, z); strap.scale.y = 0.8; }
        const back = add(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 5, 12, Math.PI), upper)); back.rotation.x = -Math.PI / 2; back.position.set(0, 0.2, -0.3);
      } else if (kind === 'heels') {
        base.rotation.x = Math.PI / 2 + 0.32; base.position.set(0, 0.2, 0.02);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.012, 0.36, 8), upper)).position.set(0, 0.18, -0.42);
        const toe = add(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8, 0, 6.3, 0, Math.PI / 2), upper)); toe.scale.set(0.19, 0.12, 0.24); toe.position.set(0, 0.04, 0.36);
        const cup = add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.16, 10, 1, true, Math.PI / 2, Math.PI), upper)); cup.position.set(0, 0.42, -0.42); (cup.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      } else {
        const foot = add(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), upper)); foot.scale.set(0.2, 0.17, 0.52); foot.position.set(0, 0.19, 0.02);
        if (kind === 'wellies') {
          add(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.75, 14), upper)).position.set(0, 0.55, -0.26);
          add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 14), s.material('#2a2420'))).position.set(0, 0.93, -0.26);
        } else {
          const mouth = add(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), s.material('#2a2420'))); mouth.scale.set(0.14, 0.05, 0.22); mouth.position.set(0, 0.335, -0.2);
          const cap = add(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), kind === 'plimsolls' ? soleTone : s.material('#4a2a16', { roughness: 0.5 }))); cap.scale.set(0.185, 0.13, 0.17); cap.position.set(0, 0.17, 0.4);
          for (let i = 0; i < 3; i++) add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.035), kind === 'plimsolls' ? s.material('#c9c5b8') : s.material('#2a1a10'))).position.set(0, 0.345 - i * 0.012, 0.06 + i * 0.09);
          if (kind === 'brogues') add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.26), soleTone)).position.set(0, 0.04, -0.38);
        }
      }
      g.scale.setScalar(small);
      s.root.add(g);
      return g;
    };
    const cornerX = BW / 2 - 0.6, cornerZ = BD / 2 + 0.75;
    const pairs: ['sandals' | 'plimsolls' | 'brogues' | 'wellies' | 'heels', number, number][] = a.shoes === 'none' ? [] : a.shoes === 'both' ? [['brogues', 1.05, 0], ['heels', 0.9, -1.9]] : [[a.shoes, a.shoes === 'wellies' ? 0.72 : 1, 0]];
    for (const [kind, size, shift] of pairs) {
      const upright = shoe(kind, size);
      upright.position.set(cornerX + shift, 0, cornerZ + (random() - 0.5) * 0.2); upright.rotation.y = -0.4 + random() * 0.5;
      const tipped = shoe(kind, size);
      const neat = a.shoes === 'both' || mood.energy < 0.25;
      tipped.position.set(cornerX + shift - 0.62 - random() * 0.15, neat ? 0 : (kind === 'wellies' ? 0.19 : 0.2) * size, cornerZ + (neat ? 0.02 : 0.45 + random() * 0.2));
      if (neat) tipped.rotation.y = upright.rotation.y + 0.08; else { tipped.rotation.set(0, 1 + random() * 1.2, Math.PI / 2); tipped.rotation.order = 'YZX'; }
      for(const supported of [upright,tipped]){supported.updateMatrixWorld(true);supported.position.y-=new THREE.Box3().setFromObject(supported,true).min.y;}
      if (kind === 'brogues') for (let i = 0; i < 2; i++) { const sock = s.ball([0.2, 0.15, 0.2], [cornerX + shift + 0.55 + i * 0.3, 0.14, cornerZ + 0.25 - i * 0.35], s.material(i ? '#b3262c' : '#d9d2bc', { roughness: 1 }), 10); sock.rotation.y = random(); }
    }

    // Whatever else was left behind.
    const flutter: { node: THREE.Object3D; base: number; rate: number }[] = [];
    if (a.left === 'ball') {
      const panels = canvasTexture(128, (ctx) => { ctx.fillStyle = '#f6f3ea'; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = mood.cheer > 0.5 ? '#d8343f' : '#27407e'; for (let i = 0; i < 8; i += 2) ctx.fillRect(i * 16, 0, 16, 128); ctx.fillStyle = '#e3b21c'; ctx.fillRect(0, 54, 128, 20); });
      s.mesh(new THREE.SphereGeometry(0.42, 22, 16), new THREE.MeshStandardMaterial({ map: panels, roughness: 0.5 }), [-BW / 2 - 1.2, 0.42, BD / 2 + 0.2]).rotation.set(0.5, random() * 3, 0.7);
    } else if (a.left === 'kite') {
      const diamond = new THREE.Shape(); diamond.moveTo(0, 1.1); diamond.lineTo(0.75, 0.25); diamond.lineTo(0, -1.2); diamond.lineTo(-0.75, 0.25); diamond.closePath();
      const kite = s.mesh(new THREE.ShapeGeometry(diamond), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#e8402c' : '#3f66d8', roughness: 0.7, side: THREE.DoubleSide }), [-BW / 2 - 1.05, 0.22, 1.2]);
      kite.rotation.set(-Math.PI / 2 + 0.14, 0, 0.7);
      const spar = s.material('#e9dfc0');
      s.rod([-BW / 2 - 1.75, 0.28, 0.45], [-BW / 2 - 0.3, 0.24, 1.95], 0.02, spar); s.rod([-BW / 2 - 1.4, 0.3, 1.75], [-BW / 2 - 0.5, 0.24, 0.9], 0.02, spar);
      const tailPath: Triple[] = [[-BW / 2 - 0.3, 0.12, 1.95], [-BW / 2 + 0.1, 0.1, 3.5], [-BW / 2 - 0.8, 0.1, 4.0], [-BW / 2 + 0.2, 0.1, 4.7]];
      s.tube(tailPath, 0.012, spar);
      const curve = new THREE.CatmullRomCurve3(tailPath.map((p) => new THREE.Vector3(...p)));
      for (let i = 1; i < 6; i++) { const p = curve.getPoint(i / 6); const bow = s.box([0.3, 0.02, 0.1], [p.x, p.y + 0.03, p.z], s.material(['#f2d21c', '#fbfaf2', '#3f9a5a'][i % 3])); bow.rotation.y = random() * 3; }
    } else if (a.left === 'cards') {
      const faces = [0, 1, 2, 3].map((suit) => new THREE.MeshStandardMaterial({ roughness: 0.5, map: canvasTexture(64, (ctx) => { ctx.fillStyle = '#fbf9f0'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = suit < 2 ? '#c8242c' : '#1c1a1e'; for (let k = 0; k < 2 + suit; k++) { ctx.beginPath(); ctx.arc(20 + (k % 2) * 24, 16 + Math.floor(k / 2) * 18, 6, 0, 7); ctx.fill(); } }) }));
      const backPaint = s.material('#27407e', { roughness: 0.5 });
      for (let i = 0; i < 14; i++) {
        const fan = i < 5;
        const card = s.box([0.3, 0.008, 0.44], [fan ? 3.1 + i * 0.09 : 2.4 + random() * 1.5, 0.11 + i * 0.004, fan ? 0.2 - i * 0.02 : -0.4 + random() * 1.3], i % 4 === 3 ? backPaint : faces[i % 4]);
        card.rotation.y = fan ? -0.6 + i * 0.3 : random() * 6;
      }
    } else if (a.left === 'net') {
      const cane = s.material('#c9a877');
      s.rod([-BW / 2 + 0.6, 0.12, BD / 2 + 1.4], [-BW / 2 - 1.2, 0.3, BD / 2 - 0.6], 0.035, cane);
      const hoop = s.ring(0.5, 0.025, [-BW / 2 - 1.4, 0.38, BD / 2 - 1.0], s.material('#8a8f84', { metalness: 0.6 })); hoop.rotation.set(-1.2, 0, 0.5);
      const mesh = s.mesh(new THREE.ConeGeometry(0.5, 1.3, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#f1f4ee', roughness: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), [-BW / 2 - 1.5, 0.22, BD / 2 - 1.6]); mesh.rotation.set(1.35, 0, -0.4);
      s.cylinder(0.2, 0.2, 0.42, [-BW / 2 + 1.6, 0.21, BD / 2 + 1.1], new THREE.MeshPhysicalMaterial({ color: '#dff1f2', transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }), 16);
      s.cylinder(0.21, 0.21, 0.05, [-BW / 2 + 1.6, 0.44, BD / 2 + 1.1], s.material('#b3262c', { metalness: 0.5 }), 16);
      s.cylinder(0.2, 0.2, 0.03, [-BW / 2 + 1.6, 0.015, BD / 2 + 1.1], s.material('#c9dfe2'), 16);
    } else if (a.left === 'cushions') {
      for (let i = 0; i < 2; i++) {
        const cushion = s.ball([0.75, 0.2, 0.6], [-3.2 + i * 0.5, 0.26 + i * 0.22, -2.1 + i * 0.5], s.material(i ? '#e3b23a' : '#7f9ad0', { roughness: 1 }), 16);
        cushion.rotation.set(i * 0.25, 0.4 + i * 0.7, 0);
      }
    }

    // Loose petals and leaves on the wind.
    const drifters: { node: THREE.Mesh; x: number; y: number; z: number; phase: number }[] = [];
    const drifting = Math.round((stormy ? 26 : 4) + mood.energy * 14);
    const leafPaint = new THREE.MeshStandardMaterial({ color: stormy ? leafTone : '#fbf6ea', roughness: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < drifting; i++) {
      const node = s.mesh(new THREE.CircleGeometry(stormy ? 0.11 : 0.06, 5), leafPaint);
      node.castShadow = false;
      drifters.push({ node, x: (random() - 0.5) * (W - 1), y: 0.3 + random() * (stormy ? 4 : 2.2), z: (random() - 0.5) * (D - 1), phase: random() * 6 });
    }

    // Dappled shade: an unseen canopy between the sun and the blanket, drawn only into the shadow map.
    const shade = new THREE.Group();
    const gaps = { clear: 0.42, hazy: 0.3, golden: 0.42, turning: 0 }[a.weather];
    if (gaps > 0) {
      const leaves = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 7), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }), 190);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 190; i++) {
        const angle = random() * 6.28, r = Math.sqrt(random()) * 9.5;
        dummy.position.set(Math.cos(angle) * r - 1.5, Math.sin(angle) * r * 0.8, (random() - 0.5) * 2);
        dummy.scale.setScalar(i < 190 * gaps * 2 ? 0.3 + random() * 0.6 : 0.0001);
        dummy.rotation.z = random() * 6;
        dummy.updateMatrix();
        leaves.setMatrixAt(i, dummy.matrix);
      }
      leaves.castShadow = true;
      leaves.frustumCulled = false;
      shade.add(leaves);
    }
    s.root.add(shade);
    const shadeHome = new THREE.Vector3();
    const place = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      place(items);
      const towardSun = key.position.clone().sub(key.target.position).normalize();
      shadeHome.set(0, 0.5, 0.5).addScaledVector(towardSun, 11);
      shade.position.copy(shadeHome);
      shade.lookAt(key.position);
      // Frame the blanket and its surroundings rather than the loose box around the whole set.
      const camera = world.camera as THREE.OrthographicCamera;
      camera.updateMatrixWorld(true);
      const view = new THREE.Box2();
      const corners: Triple[] = [[-W / 2, 0, D / 2], [W / 2, 0, D / 2], [W / 2, 0, -D / 2], [-W / 2 - 2.6, 1.4, D / 2], [W / 2, 1.4, -D / 2 - 2.6], [-W / 2 - 2.6, 1.6, -D / 2 - 2.6], [tx + 0.9, treeHeight + 2.7, tz], [tx - 2.2, treeHeight + 1.2, tz + 2]];
      for (const item of items) { const box = new THREE.Box3().setFromObject(item.holder); corners.push([box.min.x, box.max.y, box.min.z], [box.max.x, box.max.y, box.max.z]); }
      for (const corner of corners) { const p = new THREE.Vector3(...corner).applyMatrix4(camera.matrixWorldInverse); view.expandByPoint(new THREE.Vector2(p.x, p.y)); }
      const middle2 = view.getCenter(new THREE.Vector2()), reach = Math.max(view.getSize(new THREE.Vector2()).x, view.getSize(new THREE.Vector2()).y) * 0.52;
      camera.translateX(middle2.x); camera.translateY(middle2.y);
      camera.left = camera.bottom = -reach; camera.right = camera.top = reach;
      camera.updateProjectionMatrix();
    };
    const sway = mix(0.05, 0.5, mood.energy) * (stormy ? 2 : 1);
    const blow = (time: number) => {
      shade.position.set(shadeHome.x + Math.sin(time * 0.7) * sway, shadeHome.y, shadeHome.z + Math.cos(time * 0.5) * sway * 0.6);
      for (const drifter of drifters) {
        const span = W - 1, x = ((drifter.x + time * (0.4 + sway * 2.5) + span / 2) % span) - span / 2;
        drifter.node.position.set(x, drifter.y + Math.sin(time * 1.3 + drifter.phase) * 0.25, drifter.z + Math.sin(time * 0.6 + drifter.phase) * 0.4);
        drifter.node.rotation.set(time * 1.7 + drifter.phase, drifter.phase, time * 1.1);
      }
      for (const item of flutter) item.node.rotation.z = item.base + Math.sin(time * item.rate) * sway * 0.2;
    };
    blow(0);
    world.update = (_dt: number, time: number) => blow(time);
    return world;
  },
});
