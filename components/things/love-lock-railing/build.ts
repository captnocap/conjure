import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type V3 = [number, number, number];
interface Piece { at: V3; size: V3; rot?: V3; color?: THREE.ColorRepresentation }

function pieces(geometry: THREE.BufferGeometry, material: THREE.Material, items: Piece[], parent: THREE.Object3D) {
  if (!items.length) { geometry.dispose(); return null; }
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), euler = new THREE.Euler();
  items.forEach((item, index) => {
    euler.set(...(item.rot ?? [0, 0, 0]));
    matrix.compose(new THREE.Vector3(...item.at), turn.setFromEuler(euler), new THREE.Vector3(...item.size));
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, new THREE.Color(item.color ?? '#ffffff'));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const PALETTES = {
  brass: ['#c9a23a', '#b8902e', '#d8b85a', '#a8842a', '#c9a23a', '#9aa0a4'],
  candy: ['#d8342c', '#2a7fc0', '#e8c21e', '#2fa06a', '#e86aa0', '#f08a1e', '#7a4ac0', '#c9a23a'],
  steel: ['#b4b9bd', '#8f969b', '#c9cdd0', '#6f767b', '#a8adb0'],
  rust: ['#8a4a22', '#a85a2a', '#6a3a1e', '#b0733a', '#7a5a3a', '#94782e'],
  hearts: ['#c8182c', '#e8527a', '#f2a0b8', '#a8142a', '#d8342c', '#c9a23a'],
} as const;

export default defineThing({
  questions: {
    crowd: score('How crowded with locks is it?', ['A dozen early promises', 'A few scattered rows', 'Most of the mesh covered', 'Crusted solid, locks locked onto locks']),
    palette: choice('What do the locks look like as a mass?', {
      brass: 'Mostly plain brass, a dull gold shimmer.',
      candy: 'Every bright colour, like spilled sweets.',
      steel: 'Grey steel and chrome, cold and hard.',
      rust: 'Old and rusted brown, the promises of years ago.',
      hearts: 'Reds and pinks, bought from the souvenir seller on the bridge.',
    }),
    standout: choice('Which lock stands out from the rest?', {
      none: 'None; they are all anonymous.',
      heart: 'An enormous red heart-shaped lock.',
      open: 'One lock hanging open by its shackle, undone.',
      lone: 'A tiny gold lock fixed high up on the lamp post, apart from all the others.',
      ulock: 'A heavy bicycle U-lock, absurdly practical.',
      ribboned: 'A big brass lock trailing long white ribbons, from a wedding.',
    }),
    panels: choice('What state are the railing panels in?', {
      intact: 'Both panels sound and upright.',
      sagging: 'One panel bowing outward under the weight.',
      boarded: 'One panel removed by the city and replaced with a scrawled-on plywood board.',
      glass: 'One panel replaced with a clean glass sheet that nothing can be locked to.',
    }),
    ground: choice('What lies on the planks below?', {
      nothing: 'Nothing.',
      key: 'A single small key, dropped instead of thrown in the river.',
      cutters: 'A pair of bolt cutters and a few cut locks.',
      rose: 'A rose in cellophane.',
      marker: 'A marker pen with its cap off.',
    }),
    ribbons: noul('Are there ribbons tied among the locks?'),
    lamp: noul('Does the middle post carry a bridge lamp?'),
    lockFormat: choice('What shape are the ordinary lock bodies?', { square: 'Squat rectangular padlocks.', tall: 'Long narrow padlocks.', round: 'Rounded oval lock bodies.', disc: 'Flat round disc locks.' }),
    wirePitch: choice('How is the wire infill spaced?', { fine: 'A fine rectangular grid.', square: 'A broader square grid.', wide: 'Wide rectangles with close horizontal wires.', upright: 'Narrow upright rectangles.' }),
    postCaps: choice('How are the outer posts capped?', { ball: 'Round iron balls.', acorn: 'Pointed acorn finials.', pyramid: 'Square pyramidal caps.', flat: 'Flat square plates.' }),
    handrail: choice('What caps the top rail?', { timber: 'A round dark wooden handrail.', brass: 'A polished round brass rail.', iron: 'A heavier black iron pipe.', square: 'A broad squared wooden handrail.' }),
    footplates: choice('How are the posts fixed to the kerb?', { plain: 'Plain buried post feet.', bolts: 'Square plates with four bolts.', braces: 'Small triangular side braces.', collars: 'Raised iron collars around the feet.' }),
    deckEnd: choice('How is the outer edge of the deck finished?', { plain: 'Exposed plank ends.', iron: 'A dark iron binding strip.', pale: 'A broad pale painted safety edge.', rivets: 'An iron edge with regularly spaced rivets.' }),
    lowerGuard: choice('What runs along the lower part of the railing?', { none: 'No extra guard.', double: 'Two slim horizontal guard rails.', waves: 'A repeated low curved iron guard.', solid: 'A low solid iron kick plate.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const PW = 1.3, H = 1.1, LOW = 0.14;
    const iron = s.material('#2c3a38', { metalness: 0.5, roughness: 0.5 });
    const plain = s.material('#ffffff', { metalness: 0.65, roughness: mix(0.3, 0.7, mood.wear) });

    // Bridge deck planks and the kerb the railing is bolted to.
    const planks: Piece[] = [];
    for (let i = 0; i < 9; i++) planks.push({ at: [0, 0.02, -0.25 + i * 0.145], size: [PW * 2 + 0.5, 0.04, 0.135], color: pick(['#8a745a', '#7a6850', '#96806a', '#84705a']) });
    pieces(new THREE.BoxGeometry(1, 1, 1), s.material('#ffffff', { roughness: 0.9 }), planks, s.root);
    s.box([PW * 2 + 0.5, 0.1, 0.12], [0, 0.07, 0], iron);

    // Posts and rails.
    for (const x of [-PW, 0, PW]) {
      s.box([0.07, H + 0.05, 0.07], [x, (H + 0.05) / 2 + 0.04, 0], iron);
      if(x!==0||!a.lamp){
        if(a.postCaps==='ball')s.ball([.05,.05,.05],[x,H+.13,0],iron,10);
        else if(a.postCaps==='acorn'){s.ball([.055,.04,.055],[x,H+.12,0],iron,10);s.cylinder(0,.05,.12,[x,H+.19,0],iron,12);}
        else if(a.postCaps==='pyramid')s.cylinder(0,.085,.09,[x,H+.135,0],iron,4).rotation.y=Math.PI/4;
        else s.box([.14,.025,.14],[x,H+.105,0],iron);
      }
    }
    if(a.handrail==='square')s.box([PW*2+.2,.075,.12],[0,H+.04,0],s.material('#5a4630'));
    else s.rod([-PW-.1,H+.04,0],[PW+.1,H+.04,0],a.handrail==='iron'?.05:.035,s.material(a.handrail==='brass'?'#bca25b':a.handrail==='iron'?'#252c29':'#5a4630',{metalness:a.handrail==='timber'?0:.65,roughness:.4}));

    let glassLamp: THREE.MeshStandardMaterial | null = null;
    if (a.lamp) {
      s.lathe([[0.06, 0], [0.035, 0.2], [0.03, 1.2], [0.05, 1.28], [0.02, 1.34]], iron, [0, H + 0.08, 0]);
      const dark = Math.abs(mood.daylight - 0.5) * 2;
      glassLamp = new THREE.MeshStandardMaterial({ color: '#f6ecd0', emissive: '#ffd890', emissiveIntensity: mix(0.25, 1.9, dark) * mix(0.8, 1.2, mood.warmth), roughness: 0.3 });
      s.ball([0.16, 0.19, 0.16], [0, H + 1.6, 0], glassLamp, 16).castShadow = false;
      s.lathe([[0.1, 0], [0.14, 0.03], [0.05, 0.1], [0.02, 0.2], [0, 0.22]], iron, [0, H + 1.76, 0]);
      s.ring(0.1, 0.012, [0, H + 1.43, 0], iron).rotation.x = Math.PI / 2;
    }

    const special = a.panels === 'intact' ? -1 : random() < 0.5 ? 0 : 1;
    const palette = PALETTES[a.palette];
    const total = Math.round(14 + a.crowd ** 1.6 * 820);
    const sway: THREE.Object3D[] = [];
    let heaviest: { x: number; y: number; z: number; group: THREE.Group } | null = null;

    for (let p = 0; p < 2; p++) {
      const group = new THREE.Group();
      group.position.set((p - 0.5) * PW, LOW, 0);
      s.root.add(group);
      const replaced = p === special && (a.panels === 'boarded' || a.panels === 'glass');
      if (p === special && a.panels === 'sagging') group.rotation.x = 0.16 + a.crowd * 0.16;
      const inside = PW - 0.07, top = H - LOW - 0.02;
      if (replaced && a.panels === 'boarded') {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 200;
        const g = canvas.getContext('2d')!;
        g.fillStyle = '#c9a878'; g.fillRect(0, 0, 256, 200);
        g.strokeStyle = 'rgba(120,90,50,0.35)';
        for (let i = 0; i < 30; i++) { g.lineWidth = 1 + random() * 2; g.beginPath(); const y = random() * 200; g.moveTo(0, y); g.bezierCurveTo(80, y + (random() - 0.5) * 30, 170, y + (random() - 0.5) * 30, 256, y + (random() - 0.5) * 16); g.stroke(); }
        g.lineCap = 'round';
        for (let i = 0; i < 7; i++) {
          const x = 30 + random() * 196, y = 30 + random() * 140, r = 9 + random() * 14;
          g.strokeStyle = pick(['#c8182c', '#1a1a1a', '#2a4fc0', '#e8527a']); g.lineWidth = 3;
          g.beginPath(); g.moveTo(x, y + r); g.bezierCurveTo(x - r * 1.8, y - r * 0.3, x - r * 0.6, y - r * 1.4, x, y - r * 0.4); g.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.8, y - r * 0.3, x, y + r); g.stroke();
          g.beginPath(); g.moveTo(x + r * 1.5, y + r); g.lineTo(x + r * 3.2, y + r * (0.6 + random() * 0.6)); g.stroke();
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const board = s.box([inside, top, 0.02], [0, top / 2, 0], new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 }));
        group.add(board);
      } else if (replaced) {
        const sheet = s.box([inside, top, 0.015], [0, top / 2, 0], new THREE.MeshStandardMaterial({ color: '#cfe6e8', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }));
        sheet.castShadow = false;
        group.add(sheet);
        for (const y of [0.02, top - 0.02]) group.add(s.box([inside, 0.03, 0.03], [0, y, 0], s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 })));
      } else {
        const wires: Piece[] = [];
        for (let x = -inside / 2; x <= inside / 2 + 0.001; x += inside / ({fine:16,square:10,wide:7,upright:18}[a.wirePitch])) wires.push({ at: [x, top / 2, 0], size: [0.007, top, 0.007], color: '#3a4846' });
        for (let y = 0; y <= top + 0.001; y += top / ({fine:12,square:8,wide:14,upright:5}[a.wirePitch])) wires.push({ at: [0, y, 0], size: [inside, 0.007, 0.007], color: '#3a4846' });
        pieces(new THREE.BoxGeometry(1, 1, 1), s.material('#ffffff', { metalness: 0.5, roughness: 0.5 }), wires, group);
      }

      // Locks: bodies and shackles as two instanced meshes per panel.
      const count = replaced ? Math.round(total * 0.012) : Math.round(total / 2 * mix(0.8, 1.2, random()));
      const bodies: Piece[] = [], shackles: Piece[] = [];
      for (let i = 0; i < count; i++) {
        const size = mix(0.05, 0.085, random() * random()) * (random() < 0.04 ? 1.5 : 1);
        const x = replaced ? (random() < 0.5 ? -1 : 1) * (inside / 2 - 0.01) : (random() - 0.5) * (inside - 0.06);
        const band = a.crowd < 0.35 ? mix(0.45, 0.85, random()) : mix(0.1, 1, Math.sqrt(random()));
        const y = band * (top - 0.06);
        const face = random() < 0.62 ? 1 : -1;
        const z = face * (0.018 + random() * random() * a.crowd * 0.09);
        const rot: V3 = [face * (0.1 + random() * 0.35), (random() - 0.5) * 0.9, (random() - 0.5) * 0.7];
        const colour = new THREE.Color(pick(palette)).lerp(new THREE.Color('#7a4a2a'), mood.wear * random() * 0.7);
        bodies.push({ at: [x, y, z], size: [size*(a.lockFormat==='tall'?.72:1),size*(a.lockFormat==='tall'?1.2:.85),size*(a.lockFormat==='disc'?.22:.38)], rot, color: colour });
        shackles.push({ at: [x - Math.sin(rot[2]) * size * 0.5, y + Math.cos(rot[2]) * size * 0.5, z * 0.7], size: [size, size * 1.15, size], rot, color: '#b9bcc0' });
        if (!heaviest || (Math.abs(x) < 0.3 && y > 0.4 && y < 0.7 && face > 0)) heaviest = { x, y, z: Math.abs(z), group };
      }
      pieces(a.lockFormat==='round'||a.lockFormat==='disc'?new THREE.SphereGeometry(.5,a.lockFormat==='disc'?12:10,8):new THREE.BoxGeometry(1,1,1),plain,bodies,group);
      pieces(new THREE.TorusGeometry(0.3, 0.07, 5, 10, Math.PI), plain, shackles, group);

      if (a.ribbons && !replaced) {
        for (let i = 0; i < 3 + Math.round(mood.density * 4); i++) {
          const tone = s.material(pick(['#e8eef2', '#d8342c', '#e86aa0', '#f0d21e', '#3a8fd0']), { roughness: 0.8, side: THREE.DoubleSide });
          const x = (random() - 0.5) * (inside - 0.1), y = top * (0.5 + random() * 0.5), length = 0.18 + random() * 0.3;
          const ribbon = new THREE.Group();
          ribbon.position.set(x, y, 0.04);
          ribbon.add(s.ball([0.025, 0.02, 0.02], [0, 0, 0], tone, 8));
          for (const side of [-1, 1]) {
            const tail = s.box([0.022, length * (0.7 + random() * 0.4), 0.003], [side * 0.03, -length * 0.42, 0.01], tone);
            tail.rotation.z = side * (0.12 + random() * 0.25);
            ribbon.add(tail);
          }
          group.add(ribbon);
          sway.push(ribbon);
        }
      }
    }

    // The one that stands out.
    const front = (heaviest?.z ?? 0.03) + 0.05;
    const host = heaviest?.group ?? s.root;
    const hx = heaviest?.x ?? 0, hy = heaviest?.y ?? 0.5;
    if (a.standout === 'heart') {
      const shape = new THREE.Shape();
      shape.moveTo(0, -0.5); shape.bezierCurveTo(-1.0, 0.1, -0.5, 0.75, 0, 0.3); shape.bezierCurveTo(0.5, 0.75, 1.0, 0.1, 0, -0.5);
      const heart = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 }), s.material('#d0142c', { metalness: 0.4, roughness: 0.25 }), [hx, hy, front]);
      heart.scale.setScalar(0.2);
      heart.rotation.z = (random() - 0.5) * 0.3;
      host.add(heart);
      host.add(s.ring(0.045, 0.012, [hx, hy + 0.1, front + 0.01], s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 }), Math.PI));
    } else if (a.standout === 'open') {
      const lock = new THREE.Group();
      lock.position.set(hx, hy + 0.1, front);
      lock.add(s.box([0.11, 0.095, 0.04], [0.03, -0.14, 0], s.material('#c9a23a', { metalness: 0.7, roughness: 0.3 })));
      const shackle = s.ring(0.04, 0.011, [0, -0.04, 0], s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 }), Math.PI);
      lock.add(shackle);
      lock.add(s.rod([-0.04, -0.04, 0], [-0.04, -0.1, 0], 0.011, s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 })));
      lock.rotation.z = 0.45;
      host.add(lock);
      sway.push(lock);
    } else if (a.standout === 'lone') {
      const y = a.lamp ? H + 0.95 : H + 0.02;
      s.box([0.05, 0.045, 0.02], [0.0, y, 0.06], s.material('#e8c85a', { metalness: 0.8, roughness: 0.2, emissive: '#6a4a10', emissiveIntensity: 0.4 }));
      s.ring(0.02, 0.006, [0, y + 0.025, 0.05], s.material('#e8c85a', { metalness: 0.8, roughness: 0.2 }), Math.PI);
    } else if (a.standout === 'ulock') {
      const black = s.material('#18181a', { roughness: 0.5 });
      const u = s.tube([[-0.07, 0, 0], [-0.07, 0.22, 0], [-0.04, 0.3, 0], [0.04, 0.3, 0], [0.07, 0.22, 0], [0.07, 0, 0]], 0.014, black);
      const bar = s.cylinder(0.026, 0.026, 0.2, [0, 0, 0], s.material(pick(['#e8a01e', '#d8342c', '#18181a'])), 12);
      bar.rotation.z = Math.PI / 2;
      const lock = new THREE.Group();
      lock.add(u, bar);
      lock.position.set(hx, hy - 0.2, front + 0.01);
      lock.rotation.z = (random() - 0.5) * 0.5;
      host.add(lock);
    } else if (a.standout === 'ribboned') {
      const lock = new THREE.Group();
      lock.position.set(hx, hy, front);
      lock.add(s.box([0.14, 0.12, 0.045], [0, 0, 0], s.material('#d8b85a', { metalness: 0.7, roughness: 0.25 })));
      lock.add(s.ring(0.045, 0.012, [0, 0.07, 0], s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 }), Math.PI));
      const white = s.material('#f6f3ea', { roughness: 0.8, side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) { const tail = s.box([0.03, 0.4 + random() * 0.25, 0.003], [(i - 1.5) * 0.035, -0.28, 0.03], white); tail.rotation.z = (i - 1.5) * 0.12; lock.add(tail); }
      host.add(lock);
      sway.push(lock);
    }

    // On the planks.
    const gx = (random() - 0.5) * 1.2, gz = 0.45 + random() * 0.25;
    if (a.ground === 'key') {
      const brass = s.material('#d8b85a', { metalness: 0.8, roughness: 0.25 });
      s.ring(0.022, 0.006, [gx, 0.046, gz], brass).rotation.x = Math.PI / 2;
      s.box([0.06, 0.006, 0.01], [gx + 0.05, 0.046, gz], brass);
      s.box([0.012, 0.006, 0.02], [gx + 0.07, 0.046, gz + 0.012], brass);
    } else if (a.ground === 'cutters') {
      const red = s.material('#c8281e', { roughness: 0.5 });
      for (const side of [-1, 1]) {
        s.rod([gx - 0.3, 0.06, gz + side * 0.09], [gx + 0.12, 0.06, gz + side * 0.015], 0.016, red);
        s.rod([gx + 0.12, 0.06, gz + side * 0.015], [gx + 0.26, 0.06, gz - side * 0.03], 0.014, s.material('#3a3d40', { metalness: 0.8, roughness: 0.4 }));
      }
      const cut: Piece[] = [];
      for (let i = 0; i < 9; i++) cut.push({ at: [gx + 0.3 + random() * 0.4, 0.055, gz - 0.2 + random() * 0.35], size: [0.07, 0.03, 0.06], rot: [0, random() * 3, 0], color: pick(palette) });
      pieces(new THREE.BoxGeometry(1, 1, 1), plain, cut, s.root);
    } else if (a.ground === 'rose') {
      s.rod([gx - 0.2, 0.055, gz], [gx + 0.15, 0.055, gz + 0.08], 0.006, s.material('#2f6a34'));
      s.ball([0.035, 0.03, 0.035], [gx + 0.18, 0.065, gz + 0.087], s.material('#b8142a', { roughness: 0.6 }), 10);
      const wrap = s.cylinder(0.06, 0.012, 0.3, [gx + 0.04, 0.06, gz + 0.055], new THREE.MeshStandardMaterial({ color: '#eef4f4', transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }), 10);
      wrap.rotation.set(0, -0.22, -Math.PI / 2, 'YXZ');
      wrap.castShadow = false;
    } else if (a.ground === 'marker') {
      const pen = s.cylinder(0.011, 0.011, 0.13, [gx, 0.052, gz], s.material('#18181a'), 10);
      pen.rotation.set(0, random() * 3, Math.PI / 2, 'YXZ');
      s.cylinder(0.012, 0.012, 0.035, [gx + 0.12, 0.052, gz + 0.06], s.material('#18181a'), 10).rotation.x = Math.PI / 2;
    }

    if(a.footplates!=='plain')for(const x of[-PW,0,PW]){
      if(a.footplates==='bolts'){s.box([.18,.025,.18],[x,.1325,0],iron);for(const dx of[-.06,.06])for(const dz of[-.06,.06])s.cylinder(.012,.012,.018,[x+dx,.154,dz],plain,6);}
      else if(a.footplates==='braces')for(const side of[-1,1])s.rod([x+side*.15,.125,0],[x,.35,0],.018,iron);
      else s.box([.13,.12,.13],[x,.18,0],iron);
    }
    if(a.deckEnd!=='plain'){
      s.box([PW*2+.5,.045,a.deckEnd==='pale'?.08:.025],[0,.0225,.9825],s.material(a.deckEnd==='pale'?'#ded7bf':'#3d4541'));
      if(a.deckEnd==='rivets')for(let i=0;i<20;i++)s.ball([.009,.009,.005],[-1.45+i*.152,.023,.998],plain,6);
    }
    if(a.lowerGuard==='double')for(const y of[.24,.34])s.rod([-PW,y,-.07],[PW,y,-.07],.013,iron);
    else if(a.lowerGuard==='solid')s.box([PW*2,.23,.014],[0,.255,-.07],iron);
    else if(a.lowerGuard==='waves')for(let i=0;i<8;i++){const x=-PW+i*PW/4;s.tube([[x,.17,-.07],[x+PW/8,.33,-.07],[x+PW/4,.17,-.07]],.013,iron);}

    const wind = mix(0.2, 1.8, mood.energy), phases = sway.map(() => random() * 6);
    return s.finish({
      update: (_dt, time) => {
        sway.forEach((node, index) => { node.rotation.x = Math.sin(time * wind * 1.7 + phases[index]) * 0.08 * wind; });
      },
    });
  },
});
