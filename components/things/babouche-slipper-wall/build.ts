import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const SCHEMES = {
  rainbow: 'Sorted into a rainbow that runs across the wall column by column.',
  yellow: 'Almost all the classic Fez yellow, the colour a babouche is supposed to be.',
  jewel: 'A random scatter of saturated jewel colours, no two neighbours alike.',
  earth: 'Natural leathers: tan, chestnut, oxblood and cream.',
  bridal: 'White, cream and gold, for weddings.',
  redblack: 'Only red and black, severe and smart.',
} as const;
const JEWEL = ['#d42a3a', '#1f6fd0', '#16a070', '#e8b81e', '#c22a8c', '#f07a1a', '#6a35b8', '#19a6c4', '#f2efe4'];
const EARTH = ['#b88752', '#7a4526', '#6e1f1c', '#e3d2ad', '#96623a', '#4a2c1c'];
const BRIDAL = ['#f4f1e8', '#ecdcae', '#d9b34a', '#fbf8f0'];

/** One slipper: toe toward +y, sole flat against z = 0, upper bulging toward +z. */
function slipper(round: boolean,soleBuild:string,binding:string,heel:string) {
  const half: [number, number][] = [[0, -0.13], [0.03, -0.124], [0.043, -0.09], [0.046, -0.03], [0.05, 0.03], [0.045, 0.08], round ? [0.036, 0.118] : [0.024, 0.115], round ? [0.016, 0.136] : [0, 0.142]];
  const outline = new THREE.Shape();
  outline.moveTo(...half[0]);
  for (const [x, y] of half.slice(1)) outline.lineTo(x, y);
  for (const [x, y] of half.slice(0, -1).reverse()) outline.lineTo(-x, y);
  const thickness=soleBuild==='stout'?.022:soleBuild==='layered'?.018:.01;const sole = new THREE.ExtrudeGeometry(outline, { depth: thickness, bevelEnabled: false }).toNonIndexed();
  const upper = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  upper.rotateX(Math.PI / 2);
  upper.scale(0.052, 0.088, 0.042);
  upper.translate(0, 0.052, thickness);
  const at = upper.getAttribute('position');
  for (let i = 0; i < at.count; i++) {
    const t = Math.min(1, Math.max(0, (at.getY(i) + 0.036) / 0.176));
    at.setX(i, at.getX(i) * (1 - (round ? 0.45 : 0.82) * t * t));
    at.setZ(i, thickness + (at.getZ(i) - thickness) * (1 - 0.45 * t));
  }
  upper.computeVertexNormals();
  const flat = upper.toNonIndexed();
  const shade = (geometry: THREE.BufferGeometry, value: number) => {
    const count = geometry.getAttribute('position').count;
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3).fill(value), 3));
  };
  shade(sole, 0.5); shade(flat, 1);
  const parts:THREE.BufferGeometry[]=[sole,flat];
  const extra=(geometry:THREE.BufferGeometry,tint:number)=>{const part=geometry.index?geometry.toNonIndexed():geometry;if(part!==geometry)geometry.dispose();shade(part,tint);parts.push(part);};
  if(soleBuild==='layered'){const layer=new THREE.ExtrudeGeometry(outline,{depth:.004,bevelEnabled:false});layer.translate(0,0,.006);extra(layer,.85);}
  const edgePoints=outline.getPoints(28);if(soleBuild==='stitched')for(let i=0;i<edgePoints.length;i+=2){const p=edgePoints[i],stitch=new THREE.SphereGeometry(.0025,5,3);stitch.scale(1,1.5,.6);stitch.translate(p.x*.94,p.y*.96,thickness+.001);extra(stitch,1.45);}
  if(binding!=='plain'){const points=[];for(let i=0;i<=18;i++){const t=-Math.PI/2+i*Math.PI/18;points.push(new THREE.Vector3(Math.sin(t)*.05,-.025+Math.cos(t)*.025,thickness+Math.cos(t)*.03));}if(binding==='stitch')for(const p of points){const stitch=new THREE.SphereGeometry(.0028,6,3);stitch.translate(p.x,p.y,p.z);extra(stitch,1.5);}else{const curve=new THREE.CatmullRomCurve3(points);extra(new THREE.TubeGeometry(curve,36,binding==='braid'?.0045:.003,6,false),1.35);if(binding==='braid')for(let i=0;i<12;i++){const p=curve.getPoint(i/11),bead=new THREE.SphereGeometry(.0048,6,3);bead.translate(p.x,p.y,p.z);extra(bead,.65);}}}
  if(heel==='folded'){const flap=new THREE.BoxGeometry(.063,.052,.009);flap.translate(0,-.092,thickness+.005);extra(flap,.85);}if(heel==='cuff'){const cuff=new THREE.CylinderGeometry(.038,.038,.035,16,1,true,0,Math.PI);cuff.rotateX(Math.PI/2);cuff.translate(0,-.097,thickness+.017);extra(cuff,1);}if(heel==='tabs')for(const sign of[-1,1]){const tab=new THREE.BoxGeometry(.014,.035,.025);tab.translate(sign*.027,-.105,thickness+.013);extra(tab,1);}
  const merged=mergeGeometries(parts)!;for(const part of parts)part.dispose();upper.dispose();return merged;
}

export default defineThing({
  questions: {
    scheme: choice('What is the colour scheme of the slippers?', SCHEMES),
    style: choice('What kind of babouche are they?', {
      pointed: 'Plain and sharply pointed, the city slipper.',
      round: 'Round-toed and sturdy, the Berber country slipper.',
      pompom: 'Pointed, with a bright wool pom-pom on every toe.',
      embroidered: 'Pointed, with a gold stitched medallion on each vamp.',
    }),
    tidy: score('How tidy is the display?', ['Picked over: gaps, crooked shoes, some dropped at the foot of the wall', 'Used but orderly', 'Immaculate ranks, every pair straight']),
    odd: choice('Is there one thing out of place?', {
      none: 'No, every pair is present.',
      missing: 'One pair is gone, leaving two bare pegs and a clean patch.',
      single: 'One shoe hangs alone in the wrong colour, its partner lost.',
      tried: 'One pair has been taken down, tried on and left on the ground in front.',
    }),
    backing: choice('What are they hung on?', {
      plaster: 'A section of ochre plastered wall with a green tiled cap.',
      board: 'A dark wooden board propped on legs.',
      reed: 'A pale reed mat stretched on a pole frame.',
    }),
    sign: choice('What does the little hanging sign say, if there is one?', {
      none: 'No sign at all.', fixed: 'PRIX FIXE', price: '100 DH', leather: 'CUIR VERITABLE', hand: 'FAIT MAIN',
    }),
    stool: noul('Is the seller\'s low stool standing in front, empty?'),
    soleBuild: choice('How are the slipper soles built?', {thin:'One thin flexible leather sole.',layered:'Two clearly separated leather sole layers.',stout:'A thick dark sole with a broad edge.',stitched:'A thin sole with visible pale perimeter stitches.'}),
    binding: choice('What finishes the vamp opening?', {plain:'A plain folded leather edge.',piped:'A raised contrasting piped edge.',stitch:'A row of small pale stitches.',braid:'A thicker braided-looking cord around the opening.'}),
    heel: choice('What is at the back of the slippers?', {open:'An open back with a low flat heel.',folded:'A folded-down heel flap.',cuff:'A short raised heel cuff.',tabs:'Two short raised heel tabs.'}),
    sizeRange: choice('How are the shoe sizes distributed?', {adult:'All ordinary adult sizes.',small:'A wall of smaller slippers.',mixed:'Small and large pairs alternate.',graded:'Sizes increase from one end of each row to the other.'}),
    mounting: choice('How are the hanging pairs supported?', {pegs:'Short wooden pegs under the toes.',hooks:'Small curved metal hooks.',twine:'Loops of cord tied back to the display.',clips:'Small metal clips catch the upper edges.'}),
    labels: choice('What small labels accompany the rows?', {sizes:'Small size-number cards beneath the pairs.',leather:'A few narrow material tags.',prices:'One price slate at the end of each row.',none:'No individual labels.'}),
    cabinet: choice('What is beneath the hanging display?', {bench:'A low narrow fitting bench.',cubbies:'Open wooden cubbies hold spare pairs.',drawer:'A low drawer chest with one real open tray.',clear:'The floor below the display is clear.'}),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const cols = 5 + Math.round(mood.density * 4), rows = 4 + Math.round(mood.density * 2);
    const pitchX=.31,pitchY=a.sizeRange==='mixed'||a.sizeRange==='graded'?.43:.39,baseY=a.cabinet==='clear'?.48:.83;
    const width = cols * pitchX + 0.22, height = baseY + rows * pitchY + 0.12;

    if (a.backing === 'plaster') {
      s.box([width + 0.2, height, 0.24], [0, height / 2, -0.12], s.material(mood.warmth > 0.4 ? '#d9a868' : '#d8d0bd', { roughness: 0.95 }));
      s.box([width + 0.3, 0.07, 0.34], [0, height + 0.035, -0.12], s.material('#2f7d5c', { roughness: 0.4 }));
      s.box([width + 0.22, 0.3, 0.26], [0, 0.15, -0.12], s.material('#b9844e', { roughness: 0.95 }));
    } else if (a.backing === 'board') {
      const wood = s.material('#5a3a24', { roughness: 0.85 });
      s.box([width, height - 0.2, 0.04], [0, height / 2 + 0.1, -0.02], wood);
      for (const x of [-1, 1]) {
        s.box([0.07, height, 0.06], [x * (width / 2 - 0.04), height / 2, -0.07], wood);
        s.rod([x * (width / 2 - 0.04), height * 0.8, -0.1], [x * (width / 2 - 0.04), .025, -0.75], 0.025, wood);
      }
    } else {
      const pole = s.material('#b89a5e');
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const g = canvas.getContext('2d')!;
      g.fillStyle = '#d6c08a'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#9c8450'; g.lineWidth = 1.5;
      for (let i = 0; i < 52; i++) { g.beginPath(); g.moveTo(i * 5, 0); g.lineTo(i * 5 + random() * 2, 256); g.stroke(); }
      g.strokeStyle = '#6a5630'; g.lineWidth = 3;
      for (const y of [30, 128, 226]) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      s.mesh(new THREE.BoxGeometry(width - 0.06, height - 0.3, 0.02), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }), [0, height / 2 + 0.12, -0.012]);
      for (const x of [-1, 1]) {
        s.rod([x * width / 2, 0, -0.03], [x * width / 2, height + 0.1, -0.03], 0.028, pole);
        s.rod([x * width / 2, height * 0.85, -0.05], [x * width / 2, .022, -0.8], 0.022, pole);
      }
      s.rod([-width / 2 - 0.1, height, -0.03], [width / 2 + 0.1, height, -0.03], 0.025, pole);
    }
    const rail = s.material('#4a3222');
    for (let r = 0; r < rows; r++) s.box([width - 0.1, 0.018, 0.02], [0, baseY + r * pitchY - 0.19, 0.01], rail);

    const round = a.style === 'round';
    const tint = (col: number, row: number) => {
      const c = new THREE.Color();
      if (a.scheme === 'rainbow') c.setHSL((col / cols) * 0.85, 0.9, 0.46 + (row % 2) * 0.06);
      else if (a.scheme === 'yellow') c.set(random() < 0.08 ? '#f2efe4' : '#e8b81e').offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.1);
      else if (a.scheme === 'jewel') c.set(JEWEL[Math.floor(random() * JEWEL.length)]);
      else if (a.scheme === 'earth') c.set(EARTH[Math.floor(random() * EARTH.length)]);
      else if (a.scheme === 'bridal') c.set(BRIDAL[Math.floor(random() * BRIDAL.length)]);
      else c.set(random() < 0.5 ? '#c4202c' : '#1d1b1e');
      return c.lerp(new THREE.Color('#8b7a66'), mood.wear * 0.25);
    };

    type Shoe = { matrix: THREE.Matrix4; colour: THREE.Color; hung:boolean };
    const shoes: Shoe[] = [];
    const mess = 1 - a.tidy;
    const hung = (x: number, y: number, tilt: number, colour: THREE.Color, size = 1.3) => {
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, y, 0.022), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, 0, tilt)), new THREE.Vector3(size, size, size));
      shoes.push({ matrix, colour, hung:true });
    };
    const dropped = (x: number, z: number, colour: THREE.Color, upturned = false) => {
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, upturned ? 0.065 : 0.002, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(upturned ? Math.PI / 2 : -Math.PI / 2, random() * 6.28, upturned ? 0.5 : 0, 'YXZ')), new THREE.Vector3(1.3, 1.3, 1.3));
      shoes.push({matrix,colour,hung:false});
    };
    const oddCol = Math.floor(random() * cols), oddRow = 1 + Math.floor(random() * (rows - 2));
    const pegs = s.material('#2b2420', { metalness: 0.5 });
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * pitchX, y = baseY + r * pitchY;
      const colour = tint(c,r),shoeSize=a.sizeRange==='small'?.95:a.sizeRange==='mixed'?(c%2?1.48:1):a.sizeRange==='graded'?mix(.95,1.48,c/(cols-1)):1.3;
      const special = c === oddCol && r === oddRow ? a.odd : 'none';
      if (special === 'missing' || special === 'tried') {
        s.box([0.27, 0.36, 0.004], [x, y, 0.003], s.material('#efe6d0', { roughness: 1 }));
        for (const side of [-1, 1]) s.rod([x + side * 0.055, y + 0.1, 0], [x + side * 0.055, y + 0.1, 0.05], 0.006, pegs);
        if (special === 'tried') {
          dropped(x - 0.08, 0.62, colour);
          dropped(x + 0.14, 0.78, colour, true);
        }
        continue;
      }
      if (special === 'single') {
        s.box([0.27, 0.36, 0.004], [x, y, 0.003], s.material('#efe6d0', { roughness: 1 }));
        const clash = new THREE.Color(a.scheme === 'redblack' || a.scheme === 'earth' ? '#22c4d6' : a.scheme === 'bridal' ? '#c4202c' : '#17161a');
        hung(x - 0.03, y - 0.02, 0.5, clash, 1.5);
        continue;
      }
      const tilt = -0.2 + (random() - 0.5) * mess * 0.9;
      for (const side of [-1, 1]) {
        if (random() < mess * mess * 0.3) {
          if (random() < 0.45) dropped((random() - 0.5) * width * 0.9, 0.15 + random() * 0.4, colour, random() < 0.3);
          continue;
        }
        hung(x + side * 0.066, y + (random() - 0.5) * mess * 0.06, tilt + (random() - 0.5) * mess * 0.5, colour,shoeSize);
      }
    }

    const geometry = slipper(round,a.soleBuild,a.binding,a.heel);
    // Ground each dropped instance from its transformed vertices, including overturned uppers.
    for(const shoe of shoes)if(!shoe.hung){const position=geometry.getAttribute('position'),v=new THREE.Vector3();let min=Infinity;for(let i=0;i<position.count;i++)min=Math.min(min,v.fromBufferAttribute(position,i).applyMatrix4(shoe.matrix).y);shoe.matrix.elements[13]-=min;}
    const leather = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.5, 0.85, mood.wear) });
    const wall = new THREE.InstancedMesh(geometry, leather, shoes.length);
    const deco: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
    shoes.forEach((shoe, index) => {
      if(shoe.hung){const anchor=new THREE.Vector3(0,.105,.02).applyMatrix4(shoe.matrix),top=new THREE.Vector3(0,.15,.018).applyMatrix4(shoe.matrix);if(a.mounting==='pegs')s.rod([anchor.x,anchor.y,0],[anchor.x,anchor.y,Math.max(.045,anchor.z+.01)],.0045,rail);else if(a.mounting==='hooks')s.tube([[top.x,top.y,0],[top.x,top.y,.065],[anchor.x,anchor.y,.065],[anchor.x,anchor.y,anchor.z]],.003,pegs);else if(a.mounting==='twine')s.tube([[top.x,top.y,0],[anchor.x-.018,anchor.y,.055],[anchor.x+.018,anchor.y,.055],[top.x,top.y,0]],.002,s.material('#baaa82'));else{s.box([.018,.035,.016],[top.x,top.y-.015,.032],pegs);s.rod([top.x,top.y,0],[top.x,top.y,.04],.003,pegs);}}

      wall.setMatrixAt(index, shoe.matrix);
      wall.setColorAt(index, shoe.colour);
      if (a.style === 'pompom' || a.style === 'embroidered') {
        const p = new THREE.Vector3(0, a.style === 'pompom' ? 0.085 : 0.05, a.style === 'pompom' ? 0.05 : 0.049).applyMatrix4(shoe.matrix);
        const hsl = { h: 0, s: 0, l: 0 };
        shoe.colour.getHSL(hsl);
        deco.push({ at: [p.x, p.y, p.z], size: 1, color: a.style === 'pompom' ? new THREE.Color().setHSL((hsl.h + 0.45) % 1, 0.8, hsl.l > 0.6 ? 0.45 : 0.62) : new THREE.Color('#e9c244') });
      }
    });
    wall.instanceMatrix.needsUpdate = true;
    if (wall.instanceColor) wall.instanceColor.needsUpdate = true;
    wall.castShadow = wall.receiveShadow = true;
    s.root.add(wall);
    if (deco.length) {
      const shape = a.style === 'pompom' ? new THREE.SphereGeometry(0.024, 8, 6) : new THREE.SphereGeometry(0.022, 4, 2).scale(1, 1.3, 0.35);
      s.scatter(shape, s.material('#ffffff', { roughness: 1, metalness: a.style === 'embroidered' ? 0.5 : 0 }), deco);
    }

    if (a.sign !== 'none') {
      const text = { fixed: 'PRIX FIXE', price: '100 DH', leather: 'CUIR VERITABLE', hand: 'FAIT MAIN' }[a.sign];
      const board = s.label(text, 0.62, 0.17, [width / 2 - 0.4, height + (a.backing === 'plaster' ? -0.13 : 0.02), 0.06], '#f5ecd2', '#7a2a1e');
      board.rotation.z = (random() - 0.5) * 0.12;
    }
    if(a.labels!=='none')for(let row=0;row<rows;row++){const yy=baseY+row*pitchY-.21;if(a.labels==='prices'){s.box([.17,.08,.02],[width/2-.12,yy,.03],rail);s.label('100 DH',.15,.055,[width/2-.12,yy,.042],'#ece0c8','#46372a');}else for(let col=0;col<cols;col+=a.labels==='leather'?3:1){const xx=(col-(cols-1)/2)*pitchX;const card=s.label(a.labels==='sizes'?String(36+col%7):'CUIR',a.labels==='sizes'?.07:.11,.045,[xx,yy,.032],'#473b2c','#e6d8b8');s.box([a.labels==='sizes'?.075:.115,.05,.009],[xx,yy,.026],rail);}}
    if(a.cabinet!=='clear'){const wood=s.material('#795333'),y=.44,depth=.32,z=.24;s.box([width-.12,.045,depth],[0,y,z],wood);for(const x of[-width/2+.12,width/2-.12])s.box([.07,y,depth],[x,y/2,z],wood);s.box([width-.12,.04,depth],[0,.02,z],wood);if(a.cabinet==='cubbies'){for(let i=1;i<cols;i++)s.box([.025,y,depth],[-width/2+.08+i*(width-.16)/cols,y/2,z],wood);for(let i=0;i<cols;i++)if(i%2===0){for(const side of[-1,1]){const pair=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:EARTH[i%EARTH.length],vertexColors:true,roughness:.7}));pair.rotateX(-Math.PI/2);pair.scale.setScalar(.9);pair.position.set(-width/2+.18+i*(width-.2)/cols+side*.054,0,z);pair.castShadow=pair.receiveShadow=true;pair.updateMatrixWorld(true);pair.position.y+=.04-new THREE.Box3().setFromObject(pair,true).min.y;s.root.add(pair);}}}if(a.cabinet==='drawer'){s.box([width-.12,y-.05,.025],[0,y*.5,z-depth/2],wood);for(const x of[-width*.3,width*.3]){const dz=x<0?z+.16:z+.015;s.box([width*.36,.035,.3],[x,.12,dz],wood);for(const side of[-1,1])s.box([.025,.16,.3],[x+side*width*.175,.21,dz],wood);s.box([width*.36,.16,.025],[x,.21,dz+.145],wood);s.ring(.024,.005,[x,.21,dz+.17],pegs);}}}
    if (a.stool) {
      const stoolStart=s.root.children.length;
      const wood = s.material('#8a5a32');
      const sx = -width / 2 + 0.25 + random() * 0.3, sz = 0.75;
      s.cylinder(0.17, 0.17, 0.035, [sx, 0.3, sz], wood, 16);
      s.cylinder(0.16, 0.16, 0.02, [sx, 0.325, sz], s.material('#b43a2a'), 16);
      for (let k = 0; k < 3; k++) s.rod([sx + Math.cos(k * 2.1) * 0.08, 0.29, sz + Math.sin(k * 2.1) * 0.08], [sx + Math.cos(k * 2.1) * 0.16, 0, sz + Math.sin(k * 2.1) * 0.16], 0.018, wood);
      const stoolParts=s.root.children.slice(stoolStart),group=new THREE.Group();s.root.add(group);for(const part of stoolParts)group.attach(part);group.updateMatrixWorld(true);group.position.y-=new THREE.Box3().setFromObject(group,true).min.y;
    }
    return s.finish();
  },
});
