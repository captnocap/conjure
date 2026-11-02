import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const DOORS = { cedar: '#8a5a32', blue: '#2f6fb0', green: '#2f7a55', oxblood: '#7a2620', turquoise: '#3fa8a0', black: '#2e2a28' };

function zellige(pattern: 'star' | 'checker' | 'mosaic' | 'chevron' | 'stucco', random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  if (pattern === 'star') {
    g.fillStyle = '#f1ead6'; g.fillRect(0, 0, 128, 128);
    for (const [x, y, ink] of [[32, 32, '#1f5fa8'], [96, 96, '#1f5fa8'], [96, 32, '#1f8a6b'], [32, 96, '#d9a12a']] as const) {
      g.fillStyle = ink; g.save(); g.translate(x, y);
      for (let k = 0; k < 2; k++) { g.rotate(Math.PI / 4); g.fillRect(-20, -20, 40, 40); }
      g.fillStyle = '#f1ead6'; g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fill();
      g.restore();
    }
    g.fillStyle = '#23211f';
    for (const [x, y] of [[0, 0], [64, 0], [0, 64], [64, 64], [128, 0], [0, 128], [128, 64], [64, 128], [128, 128]]) { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-7, -7, 14, 14); g.restore(); }
  } else if (pattern === 'checker') {
    g.fillStyle = '#f1ead6'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#1f8a6b';
    for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) { g.beginPath(); g.moveTo(x * 64, y * 64 - 32); g.lineTo(x * 64 + 32, y * 64); g.lineTo(x * 64, y * 64 + 32); g.lineTo(x * 64 - 32, y * 64); g.fill(); }
    g.fillStyle = '#d9a12a';
    for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) { g.beginPath(); g.arc(x * 64 + 32, y * 64 + 32, 7, 0, 7); g.fill(); }
  } else if (pattern === 'mosaic') {
    const inks = ['#1f5fa8', '#1f8a6b', '#d9a12a', '#f1ead6', '#23211f', '#b8402a'];
    g.fillStyle = '#e9e2cc'; g.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) { g.fillStyle = inks[Math.floor(random() * inks.length)]; g.fillRect(x * 16 + 1, y * 16 + 1, 14, 14); }
  } else if (pattern === 'chevron') {
    g.fillStyle = '#f1ead6'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#23211f'; g.lineWidth = 9;
    for (let y = -32; y < 160; y += 32) { g.beginPath(); for (let x = 0; x <= 128; x += 32) g.lineTo(x, y + (x / 32 % 2 ? 24 : 0)); g.stroke(); }
    g.strokeStyle = '#1f5fa8'; g.lineWidth = 4;
    for (let y = -16; y < 160; y += 32) { g.beginPath(); for (let x = 0; x <= 128; x += 32) g.lineTo(x, y + (x / 32 % 2 ? 24 : 0)); g.stroke(); }
  } else {
    g.fillStyle = '#ece4d2'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#b9ad94'; g.lineWidth = 3;
    for (let x = 0; x <= 128; x += 64) for (let y = 0; y <= 128; y += 64) for (const r of [14, 26]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); }
    g.beginPath(); g.arc(64, 64, 20, 0, 7); g.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1 / 0.42, 1 / 0.42);
  return texture;
}

function glimpse(kind: 'dark' | 'courtyard' | 'stairs' | 'lamp' | 'cat') {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 512;
  const g = canvas.getContext('2d')!;
  if (kind === 'courtyard') {
    g.fillStyle = '#bfe3f2'; g.fillRect(0, 0, 256, 150);
    g.fillStyle = '#f3ead2'; g.fillRect(0, 110, 256, 250);
    g.fillStyle = '#1f6fa8'; g.fillRect(0, 300, 256, 60);
    for (let x = 0; x < 16; x++) for (let y = 0; y < 10; y++) { g.fillStyle = (x + y) % 2 ? '#e9e2cc' : '#2f8a6b'; g.fillRect(x * 16, 360 + y * 16, 16, 16); }
    g.fillStyle = '#6a4a2c'; g.fillRect(120, 230, 14, 140);
    g.fillStyle = '#2f8a3a'; g.beginPath(); g.arc(128, 190, 84, 0, 7); g.fill();
    g.fillStyle = '#f59a1a';
    for (let k = 0; k < 16; k++) { g.beginPath(); g.arc(128 + Math.cos(k * 2.4) * (20 + k * 3.6), 190 + Math.sin(k * 2.4) * (20 + k * 3.4), 9, 0, 7); g.fill(); }
    g.fillStyle = '#dfe9ea'; g.fillRect(70, 410, 116, 26); g.fillStyle = '#58b8d8'; g.fillRect(78, 404, 100, 10);
  } else if (kind === 'stairs') {
    g.fillStyle = '#3a2a22'; g.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 9; i++) {
      g.fillStyle = `hsl(28,45%,${30 + i * 5}%)`; g.fillRect(20 + i * 10, 460 - i * 46, 236, 46);
      g.fillStyle = '#1f5fa8'; g.fillRect(20 + i * 10, 460 - i * 46, 236, 8);
    }
    g.fillStyle = '#ffe9a8'; g.fillRect(150, 0, 106, 60);
  } else if (kind === 'lamp') {
    g.fillStyle = '#1c1410'; g.fillRect(0, 0, 256, 512);
    const glow = g.createRadialGradient(128, 200, 6, 128, 200, 230);
    glow.addColorStop(0, '#fff2b0'); glow.addColorStop(0.25, '#f2a23a'); glow.addColorStop(1, 'rgba(60,20,8,0)');
    g.fillStyle = glow; g.fillRect(0, 0, 256, 512);
    g.fillStyle = '#2a1a10'; g.fillRect(124, 0, 8, 160);
  } else {
    const shade = g.createLinearGradient(0, 0, 0, 512);
    shade.addColorStop(0, '#0e0c0c'); shade.addColorStop(1, '#2a221e');
    g.fillStyle = shade; g.fillRect(0, 0, 256, 512);
    if (kind === 'cat') {
      g.fillStyle = '#050505'; g.beginPath(); g.ellipse(128, 440, 62, 70, 0, 0, 7); g.fill();
      g.beginPath(); g.arc(128, 350, 46, 0, 7); g.fill();
      g.beginPath(); g.moveTo(88, 330); g.lineTo(92, 280); g.lineTo(122, 312); g.moveTo(168, 330); g.lineTo(164, 280); g.lineTo(134, 312); g.fill();
      g.fillStyle = '#b8f24a';
      for (const x of [108, 148]) { g.beginPath(); g.ellipse(x, 348, 12, 9, 0, 0, 7); g.fill(); }
      g.fillStyle = '#050505';
      for (const x of [108, 148]) g.fillRect(x - 2, 339, 4, 18);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    colour: choice('What colour is the door?', {
      cedar: 'Bare oiled cedar, honey brown.',
      blue: 'Painted blue, chalky and bright.',
      green: 'Deep mosque green.',
      oxblood: 'Dark oxblood red.',
      turquoise: 'Sun-bleached turquoise.',
      black: 'Nearly black with age and oil.',
    }),
    tiles: choice('What is the tile surround like?', {
      star: 'Blue, green and gold eight-point stars on white.',
      checker: 'A green and white diamond check.',
      mosaic: 'A dense many-coloured mosaic of small squares.',
      chevron: 'Black and blue zigzags on white.',
      stucco: 'No tile, only cream carved plaster.',
    }),
    state: choice('Is the door open?', {
      locked: 'Shut, barred with iron and padlocked.',
      shut: 'Shut, but not locked.',
      ajar: 'Ajar by a hand\'s width.',
      half: 'One leaf standing half open.',
      wide: 'One leaf swung wide.',
    }),
    glimpse: choice('If the door is open, what shows through the gap?', {
      dark: 'Only cool darkness.',
      courtyard: 'A sunlit courtyard with an orange tree and a fountain.',
      stairs: 'A narrow staircase climbing toward light.',
      lamp: 'A single lamp burning in a dark hall.',
      cat: 'A cat sitting in the dark, eyes shining.',
    }),
    studs: choice('How is the door studded?', {
      grid: 'Even rows of round iron studs.',
      diamonds: 'Studs set in lozenge patterns.',
      bosses: 'A few big domed bosses.',
      none: 'No studs, only the carving.',
    }),
    wall: choice('What wall is it set in?', {
      ochre: 'Marrakech pink-ochre plaster.',
      white: 'Whitewash.',
      dado: 'Whitewash with a blue-painted lower band.',
    }),
    carving: choice('How is the cedar panel carved?', {stars:'Raised rectangular panels with nested geometric stars.',arches:'Tall arched panels with an inner border.',diamonds:'A chain of deeply outlined lozenge panels.',plain:'Plain narrow vertical cedar boards.'}),
    hinges: choice('What hinge straps cross each leaf?', {spear:'Narrow iron straps ending in spear points.',broad:'Broad rectangular straps with three rivets.',scroll:'Slender straps ending in curled scrolls.',short:'Short plain hinge plates beside the jamb.'}),
    knocker: choice('What is the main door knocker?', {hand:'A hand-shaped brass knocker.',ring:'A large iron ring on a square plate.',bar:'A horizontal turned brass pull between two mounts.',plate:'A small hammered plate with a hanging teardrop pull.'}),
    threshold: choice('How is the threshold finished?', {stone:'A single worn stone sill.',tile:'Small glazed tiles set into the top of the sill.',wood:'A dark timber sill with two iron straps.',marble:'A pale marble sill with a narrow dark nosing.'}),
    eave: choice('What shelters the doorway?', {tiles:'A shallow roof of green curved tiles.',timber:'A cedar board canopy on brackets.',cornice:'A stepped plaster cornice with no canopy.',bare:'The decorated wall ends without an eave.'}),
    plaque: choice('What is fixed beside the doorway?', {number:'A small numbered enamel address plaque.',rosette:'A carved circular stone rosette.',key:'A small hook holding one long iron key.',none:'The jamb has no plaque or ornament.'}),
    guard: choice('What protects the bottom of each door leaf?', {bare:'Bare cedar to the bottom.',plate:'A broad dark metal kick plate.',corners:'Small metal corner plates.',rail:'A raised timber rail along the bottom.'}),
    step: choice('What is on the doorstep?', {
      nothing: 'Nothing.',
      slippers: 'A pair of yellow babouches left outside.',
      pots: 'Geraniums in painted tins.',
      broom: 'A palm broom leaning by the jamb.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const hw = 0.66, hs = 1.5, r = 0.8, d = Math.sqrt(r * r - hw * hw), c = hs + d, top = c + r, t0 = Math.atan2(d, hw);
    const archPath = (path: THREE.Path, inset = 0) => {
      path.moveTo(-hw + inset, 0); path.lineTo(hw - inset, 0); path.lineTo(hw - inset, hs);
      path.absarc(0, c, r - inset, -t0, Math.PI + t0, false);
      path.lineTo(-hw + inset, 0);
      return path;
    };
    const slab = (halfWidth: number, height: number, depth: number, material: THREE.Material | THREE.Material[], z: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(-halfWidth, 0); shape.lineTo(halfWidth, 0); shape.lineTo(halfWidth, height); shape.lineTo(-halfWidth, height); shape.closePath();
      shape.holes.push(archPath(new THREE.Path()));
      const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 }), material);
      mesh.position.z = z;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const wallColour = a.wall === 'ochre' ? (mood.warmth > 0.5 ? '#d08a5c' : '#c9976e') : '#ece6d8';
    const plaster = s.material(wallColour, { roughness: 0.95 });
    const wallHalf = 1.5, wallTop = top + 0.95;
    slab(wallHalf, wallTop, 0.42, plaster, -0.42);
    if (a.wall === 'dado') for (const x of [-1, 1]) s.box([wallHalf - hw - 0.4, 1.1, 0.012], [x * (wallHalf + hw + 0.4) / 2, 0.55, 0.006], s.material('#3f7fc0', { roughness: 0.9 }));
    const tile = new THREE.MeshStandardMaterial({ map: zellige(a.tiles, random), roughness: a.tiles === 'stucco' ? 0.9 : 0.35 });
    const trim = s.material(a.tiles === 'stucco' ? '#d9cfb8' : '#23463f', { roughness: 0.5 });
    slab(hw + 0.4, top + 0.42, 0.03, [tile, trim], 0);
    s.box([hw * 2 + 0.92, 0.06, 0.07], [0, top + 0.45, 0.02], trim);
    for (const x of [-1, 1]) s.box([0.06, top + 0.42, 0.07], [x * (hw + 0.43), (top + 0.42) / 2, 0.02], trim);

    // A real projecting canopy or a shallow wall cornice, with supports at its underside.
    const eaveY=top+.62,glaze=s.material('#2f8a5c',{roughness:.35}),beam=s.material('#5c3a22',{roughness:.9});
    if(a.eave==='tiles'||a.eave==='timber'){
      const eave=s.box([hw*2+1.3,.05,.6],[0,eaveY+.1,.24],a.eave==='tiles'?glaze:beam);eave.rotation.x=.35;
      if(a.eave==='tiles')for(let i=0;i<15;i++){const x=(i-7)*((hw*2+1.24)/15);const ridge=s.cylinder(.04,.045,.62,[x,eaveY+.13,.25],glaze,8);ridge.rotation.x=Math.PI/2+.35;}
      else for(let i=0;i<9;i++){const seam=s.box([.009,.008,.6],[(i-4)*.28,eaveY+.128,.24],s.material('#332215'));seam.rotation.x=.35;}
      for(const x of[-1,-.33,.33,1]){s.rod([x*(hw+.5),eaveY-.22,0],[x*(hw+.5),eaveY+.005,.48],.035,beam);s.box([.065,.06,.5],[x*(hw+.5),eaveY+.06,.25],beam).rotation.x=.35;}
    }else if(a.eave==='cornice')for(let i=0;i<3;i++)s.box([hw*2+1.12+i*.08,.075,.12+i*.08],[0,eaveY+i*.075,.04+i*.04],plaster);
    const sill=s.material(a.threshold==='marble'?'#d9d6cb':a.threshold==='wood'?'#54402c':'#b9b0a0',{roughness:a.threshold==='marble'?.3:.85});s.box([hw*2+.3,.1,.5],[0,.05,.12],sill);
    if(a.threshold==='tile'){for(let i=0;i<9;i++)s.box([.16,.008,.42],[(i-4)*.174,.104,.12],s.material(i%2?'#e7dfcc':'#276c63',{roughness:.35}));}
    if(a.threshold==='wood')for(const x of[-.5,.5])s.box([.045,.008,.5],[x,.104,.12],s.material('#302d29',{metalness:.7}));
    if(a.threshold==='marble')s.box([hw*2+.3,.025,.028],[0,.086,.365],s.material('#4d5656'));

    // What lies behind.
    const open = { locked: 0, shut: 0, ajar: 0.32, half: 0.95, wide: 1.5 }[a.state];
    const hall = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 0.5, top + 0.2, 0.5), new THREE.MeshStandardMaterial({ color: '#17120f', side: THREE.BackSide, roughness: 1 }));
    hall.position.set(0, (top + 0.2) / 2, -0.66);
    s.root.add(hall);
    const view = glimpse(a.glimpse);
    s.mesh(new THREE.PlaneGeometry(hw * 2 + 0.4, top), new THREE.MeshStandardMaterial({ map: view, emissiveMap: view, emissive: '#ffffff', emissiveIntensity: a.glimpse === 'dark' ? 0.2 : 0.85, roughness: 1 }), [0, top / 2 + 0.1, -0.89]);

    // Leaves.
    const paint = new THREE.Color(DOORS[a.colour]).lerp(new THREE.Color('#9a8c7a'), mood.wear * 0.35);
    const face = document.createElement('canvas');
    face.width = 256; face.height = 1024;
    const g = face.getContext('2d')!;
    const tone = (amount: number) => `#${paint.clone().multiplyScalar(amount).getHexString()}`;
    g.fillStyle = tone(1); g.fillRect(0, 0, 256, 1024);
    for (let x = 0; x < 4; x++) { g.fillStyle = tone(0.9 + random() * 0.2); g.fillRect(x * 64, 0, 62, 1024); g.fillStyle = tone(0.55); g.fillRect(x * 64 + 62, 0, 2, 1024); }
    g.lineWidth = 5;
    for (let i=0;i<(a.carving==='plain'?0:4);i++) {
      const y = 1024 - 60 - (i + 1) * 215;
      g.strokeStyle = tone(0.6); g.strokeRect(28, y, 200, 190);
      g.strokeStyle = tone(1.3); g.strokeRect(38, y + 10, 180, 170);
      g.save(); g.translate(128, y + 95); g.strokeStyle = tone(0.62);
      if(a.carving==='stars'){for(let k=0;k<2;k++){g.rotate(Math.PI/4);g.strokeRect(-48,-48,96,96);}g.beginPath();g.arc(0,0,22,0,7);g.stroke();}
      else if(a.carving==='diamonds'){for(const radius of[47,61]){g.beginPath();g.moveTo(0,-radius);g.lineTo(radius*.7,0);g.lineTo(0,radius);g.lineTo(-radius*.7,0);g.closePath();g.stroke();}}
      else {for(const inset of[0,12]){g.beginPath();g.moveTo(-58+inset,65);g.lineTo(-58+inset,-5);g.arc(0,-5,58-inset,Math.PI,0);g.lineTo(58-inset,65);g.closePath();g.stroke();}}
      g.restore();
    }
    g.fillStyle = `rgba(60,45,30,${0.15 + mood.wear * 0.35})`; g.fillRect(0, 900, 256, 124);
    const faceTexture = new THREE.CanvasTexture(face);
    faceTexture.colorSpace = THREE.SRGBColorSpace;
    faceTexture.repeat.set(1 / hw, 1 / top);
    const leafFace = new THREE.MeshStandardMaterial({ map: faceTexture, roughness: 0.75 });
    const leafEdge = new THREE.MeshStandardMaterial({ color: paint.clone().multiplyScalar(0.7), roughness: 0.8 });
    const iron = s.material('#2b2a2c', { metalness: 0.7, roughness: 0.5 });
    const brass = s.material('#d0a23e', { metalness: 0.85, roughness: 0.3 });
    const inside = (x: number, y: number, margin: number) => y < hs ? x < hw - margin : Math.hypot(x, y - c) < r - margin;

    const half = new THREE.Shape();
    half.moveTo(0, 0); half.lineTo(hw - 0.012, 0); half.lineTo(hw - 0.012, hs);
    half.absarc(0, c, r - 0.012, -t0, Math.PI / 2, false);
    half.closePath();
    const studs: [number, number, number][] = [];
    if (a.studs === 'grid') { for (let y = 0.22; y < top; y += 0.27) for (const x of [0.1, 0.3, 0.5, 0.68]) if (inside(x, y, 0.06)) studs.push([x, y, 1]); }
    else if (a.studs === 'diamonds') { for (const cy of [0.55, 1.25, 1.95]) for (let k = 0; k < 12; k++) { const t = k / 12 * 4, side = Math.floor(t), f = t - side; const px = [0, 1, 0, -1][side] * (1 - f) + [1, 0, -1, 0][side] * f, py = [1, 0, -1, 0][side] * (1 - f) + [0, -1, 0, 1][side] * f; studs.push([0.33 + px * 0.22, cy + py * 0.28, 1]); } }
    else if (a.studs === 'bosses') { for (let y = 0.35; y < top; y += 0.5) for (const x of [0.17, 0.5]) if (inside(x, y, 0.1)) studs.push([x, y, 2.2]); }
    const studShape = new THREE.SphereGeometry(0.024, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2);

    for (const side of [-1, 1]) {
      const leaf = new THREE.Group();
      const geometry = new THREE.ExtrudeGeometry(half, { depth: 0.07, bevelEnabled: false, curveSegments: 16 });
      geometry.translate(-hw, 0, 0);
      const panel = new THREE.Mesh(geometry, [leafFace, leafEdge]);
      panel.castShadow = panel.receiveShadow = true;
      leaf.add(panel);
      const part = (mesh: THREE.Mesh) => { mesh.removeFromParent(); leaf.add(mesh); return mesh; };
      for(const y of[.38,1.3,2.12]){const short=a.hinges==='short',width=short?.16:.5;part(s.box([width,a.hinges==='broad'?.13:.065,.016],[-width/2-.01,y,.078],iron));part(s.cylinder(.018,.018,.15,[-.012,y,.04],iron,8));
        if(a.hinges==='spear')part(s.mesh(new THREE.ConeGeometry(.06,.12,4).rotateZ(Math.PI/2).scale(1,1,.12),iron,[-.56,y,.078]));
        if(a.hinges==='scroll'){const points=[];for(let i=0;i<=24;i++){const t=i/24*Math.PI*2.5,rr=.065*(1-i/32);points.push([-.49+Math.sin(t)*rr,y+Math.cos(t)*rr,.082] as [number,number,number]);}part(s.tube(points,.009,iron));}
        if(a.hinges==='broad')for(const x of[-.08,-.25,-.43])part(s.ball([.018,.018,.012],[x,y,.092],brass,7));}
      if(a.guard==='plate')part(s.box([hw-.035,.24,.012],[-hw/2,.15,.078],iron));
      if(a.guard==='corners')for(const x of[-hw+.07,-.07])part(s.box([.12,.14,.012],[x,.09,.078],iron));
      if(a.guard==='rail')part(s.box([hw-.025,.09,.035],[-hw/2,.09,.088],leafEdge));
      if (studs.length) {
        const mesh = new THREE.InstancedMesh(studShape, a.colour === 'black' ? brass : iron, studs.length);
        const matrix = new THREE.Matrix4();
        studs.forEach(([x, y, size], index) => mesh.setMatrixAt(index, matrix.makeScale(size, size, size).setPosition(x - hw, y, 0.07)));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.castShadow = true;
        leaf.add(mesh);
      }
      if (side>0&&a.knocker==='hand') {
        // Hand-of-Fatima knocker near the meeting edge.
        const kx = -hw + 0.15, ky = 1.42, kz = 0.085;
        part(s.cylinder(0.035, 0.035, 0.016, [kx, ky + 0.1, kz], brass, 12)).rotation.x = Math.PI / 2;
        part(s.ball([0.05, 0.06, 0.02], [kx, ky + 0.02, kz + 0.012], brass, 12));
        for (let f = 0; f < 4; f++) part(s.rod([kx - 0.036 + f * 0.024, ky - 0.02, kz + 0.014], [kx - 0.04 + f * 0.027, ky - 0.125 + Math.abs(f - 1.5) * 0.018, kz + 0.016], 0.011, brass, 0.009));
        part(s.rod([kx + 0.04, ky + 0.03, kz + 0.014], [kx + 0.075, ky - 0.03, kz + 0.016], 0.012, brass, 0.009));
        part(s.ball([0.03, 0.03, 0.03], [kx, ky - 0.15, kz + 0.02], brass, 10));
        part(s.cylinder(0.05, 0.05, 0.012, [kx, ky - 0.15, kz - 0.008], iron, 12)).rotation.x = Math.PI / 2;
      }else if(side>0){const x=-hw+.15,y=1.4,z=.087;if(a.knocker==='ring'){part(s.box([.13,.16,.018],[x,y+.06,z],iron));part(s.ring(.08,.013,[x,y-.015,z+.035],iron));part(s.rod([x,y+.095,z],[x,y+.065,z+.04],.012,iron));}else if(a.knocker==='bar'){for(const xx of[x-.09,x+.09])part(s.rod([xx,y,z],[xx,y,z+.07],.014,brass));part(s.rod([x-.09,y,z+.07],[x+.09,y,z+.07],.022,brass));}else {part(s.ball([.07,.1,.013],[x,y,z],brass,14));part(s.ring(.045,.011,[x,y-.07,z+.025],iron)).scale.y=1.4;}}else part(s.ring(.06,.012,[-hw+.15,1.3,.09],iron));
      leaf.position.set(side * hw, 0.1, -0.2);
      leaf.scale.x = side;
      if (side < 0) leaf.rotation.y = open;
      s.root.add(leaf);
    }
    if (a.state === 'locked') {
      s.box([hw * 2 - 0.1, 0.09, 0.03], [0, 1.12, -0.1], iron);
      for (const x of [-1, 1]) s.box([0.08, 0.16, 0.05], [x * (hw - 0.14), 1.12, -0.1], iron);
      s.box([0.11, 0.1, 0.04], [0.05, 0.97, -0.085], brass);
      s.ring(0.035, 0.009, [0.05, 1.04, -0.085], iron);
    }

    if(a.plaque==='number'){s.box([.27,.17,.025],[1.29,2.15,.022],iron);s.label('27',.23,.13,[1.29,2.15,.037],'#f0e6ce','#285265');}
    else if(a.plaque==='rosette'){s.cylinder(.12,.12,.025,[1.28,2.15,.024],plaster,20).rotation.x=Math.PI/2;for(let i=0;i<8;i++){const angle=i*Math.PI/4;s.ball([.025,.046,.016],[1.28+Math.sin(angle)*.065,2.15+Math.cos(angle)*.065,.048],trim,8).rotation.z=-angle;}}
    else if(a.plaque==='key'){s.rod([1.29,2.29,.01],[1.29,2.29,.075],.009,iron);s.ring(.04,.008,[1.29,2.25,.071],iron);s.rod([1.29,2.21,.071],[1.29,2.04,.071],.009,iron);s.box([.06,.025,.018],[1.31,2.05,.071],iron);}
    if (a.step === 'slippers') {
      const yellow = s.material('#e8b81e', { roughness: 0.7 });
      for (const k of [0, 1]) {
        const x = 0.25 + k * 0.13, turn = 0.2 + (random() - 0.5) * 0.5;
        s.ball([0.045, 0.012, 0.125], [x, 0.11, 0.26], yellow, 10).rotation.y = turn;
        s.ball([0.045, 0.03, 0.07], [x + Math.sin(turn) * 0.05, 0.125, 0.26 + Math.cos(turn) * 0.05], yellow, 10).rotation.y = turn;
      }
    } else if (a.step === 'pots') {
      const leafGreen = s.material('#3f8a3a'), bloom = s.material(mood.cheer > 0.4 ? '#e0304a' : '#c98a9a', { emissive: '#e0304a', emissiveIntensity: 0.15 });
      for (const x of [-1, 1]) {
        const px = x * (hw + 0.5), tin = ['#2f6fb0', '#d9a12a', '#b8402a'][Math.floor(random() * 3)];
        s.cylinder(0.15, 0.12, 0.28, [px, 0.14, 0.3], s.material(tin, { metalness: 0.3 }), 14);
        s.ball([0.22, 0.17, 0.22], [px, 0.4, 0.3], leafGreen, 10);
        for (let k = 0; k < 7; k++) s.ball([0.05, 0.045, 0.05], [px + (random() - 0.5) * 0.3, 0.44 + random() * 0.14, 0.3 + (random() - 0.5) * 0.3], bloom, 8);
      }
    } else if (a.step === 'broom') {
      const px=hw+.3,broomStart=s.root.children.length;
      s.rod([px + 0.12, 0.02, 0.3], [px, 1.25, 0.06], 0.016, s.material('#a8824a'));
      s.mesh(new THREE.ConeGeometry(0.13, 0.4, 10, 1, true), s.material('#c9b26a', { side: THREE.DoubleSide, roughness: 1 }), [px + 0.105, 0.2, 0.27]).rotation.set(-0.19, 0, -0.1);
      const broom=new THREE.Group();for(const part of s.root.children.slice(broomStart))broom.add(part);s.root.add(broom);broom.updateMatrixWorld(true);broom.position.y-=new THREE.Box3().setFromObject(broom,true).min.y;
    }
    return s.finish({ footprint: 1.5 });
  },
});
