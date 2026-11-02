import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type V3 = [number, number, number];
interface Brick { at: V3; size: V3; rot?: V3; color?: THREE.ColorRepresentation }

function bricks(s: Sculpture, material: THREE.Material, items: Brick[], parent: THREE.Object3D = s.root) {
  if (!items.length) return null;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, items.length);
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
  books: ['#6b2f2a', '#2f3f5a', '#3d5a40', '#7a5a34', '#4a3328', '#8a7a5a', '#5a2a3c', '#a08a60'],
  paperbacks: ['#e0b81e', '#d8402c', '#2a7fc0', '#f1ece0', '#2fa06a', '#e87a2a', '#1a1a1a', '#c23a7a'],
  prints: ['#e9dfc4', '#d8ccae', '#efe8d6', '#c9bb98'],
  postcards: ['#5aa0d8', '#e8c46a', '#d85a4a', '#f2ecdc', '#7ab87a', '#e89ab0'],
  records: ['#1c1c1e', '#c8382c', '#e8c84a', '#3a6aa8', '#e9e2d0', '#6a3a7a'],
} as const;

export default defineThing({
  questions: {
    state: choice('Is the box open for business?', {
      open: 'Lid propped fully up, everything on show, prints clipped along the front.',
      opening: 'Lid half raised: the seller is just setting up or packing away.',
      locked: 'Shut flat and padlocked with iron bars, as it sits every night.',
      tagged: 'Shut for a long time: padlocked, rain-streaked and sprayed with graffiti.',
    }),
    display: choice('What does this seller mostly deal in?', {
      books: 'Old cloth and leather-bound books in sober browns, reds and greens.',
      paperbacks: 'Bright cheap paperbacks and comics.',
      prints: 'Engravings, old maps and botanical plates in cream paper.',
      postcards: 'Postcards and little tourist souvenirs.',
      records: 'Vinyl records and old magazines.',
    }),
    left: choice('What has been left on the parapet beside the box?', {
      nothing: 'Nothing.',
      book: 'A book left open, face down, to keep someone\'s place.',
      cat: 'A cat asleep on the warm stone.',
      stool: 'The seller\'s folding stool with a thermos on it, the seller nowhere to be seen.',
      umbrella: 'A wet umbrella hooked over the edge.',
    }),
    sign: choice('What does the little hand-lettered sign say, if there is one?', {
      none: 'There is no sign.',
      livres: 'LIVRES ANCIENS',
      euro: 'TOUT A 1 EURO',
      retour: 'DE RETOUR A 15H',
      vendre: 'A VENDRE',
    }),
    neighbour: noul('Is there a second box beside it, shut?'),
    paintwork: choice('What green is the box?', {
      wagon: 'Regulation dark wagon green.',
      sage: 'Sun-bleached to a pale sage.',
      bottle: 'A glossy fresh bottle green.',
    }),
    hinge: choice('What hinges carry the lids?', { straps: 'Three narrow exposed hinge straps.', piano: 'A continuous piano hinge.', broad: 'Two broad iron hinge plates.', brass: 'Four short bright brass hinges.' }),
    boxCorners: choice('What reinforces the box corners?', { plain: 'Plain welded corners.', strips: 'Narrow iron angle strips.', rivets: 'Rows of rivets on reinforcing plates.', brass: 'Bright brass corner guards.' }),
    lidRibs: choice('How is the outer lid stiffened?', { flat: 'A flat sheet.', two: 'Two lengthwise raised ribs.', four: 'Four narrow transverse ribs.', diagonal: 'Crossed diagonal strengthening strips.' }),
    footBrackets: choice('How is each box secured to the parapet?', { plain: 'The original short support bars.', clamps: 'Two iron straps clamping the coping.', scroll: 'Curved iron brackets on the quay face.', triangle: 'Two triangular braces below the overhang.' }),
    sortingShelf: choice('What sorting ledge is attached to the front?', { none: 'No extra ledge.', narrow: 'A shallow green shelf.', slatted: 'A narrow slatted wooden shelf.', divided: 'A metal shelf with three sorting spaces.' }),
    parcelKit: choice('What packing kit waits at the parapet end?', { none: 'No packing kit.', paper: 'A roll of brown paper in a cradle.', twine: 'A ball of twine with scissors.', satchel: 'A leather satchel with two buckled straps.' }),
    boxNumber: choice('How is the box numbered?', { none: 'No number plate.', enamel: 'A white enamel number plaque.', stencil: 'A pale rectangular stencilled plate.', brass: 'A little brass oval number plate.' }),
    quayPaving: choice('What lies at the foot of the parapet?', { bare: 'Bare quay.', flags: 'Two rows of long stone flags.', setts: 'A band of small granite setts.', drain: 'Stone paving crossed by a narrow iron drain.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const W = 2.0, D = 0.78, BH = 0.3;
    const total = a.neighbour ? W * 2 + 0.5 : W + 0.7;
    const offset = a.neighbour ? -(W + 0.14) / 2 : 0;
    const green = new THREE.Color({ wagon: '#1f4a36', sage: '#6f8a72', bottle: '#17573a' }[a.paintwork]);
    green.lerp(new THREE.Color('#75705c'), mood.wear * 0.25);
    const paintwork = s.material(green, { roughness: a.paintwork === 'bottle' ? 0.35 : 0.65 });
    const steel = s.material('#55595a', { metalness: 0.7, roughness: 0.45 });

    // Quay parapet of pale ashlar with a coping.
    const stone = s.material('#c9c1ad', { roughness: 0.95 });
    const P = 1.04;
    s.box([total, 0.92, 0.46], [0, 0.46, 0], stone);
    s.box([total + 0.08, 0.12, 0.58], [0, 0.98, 0], s.material('#d6cfbc', { roughness: 0.9 }));
    const joints: Brick[] = [];
    for (let row = 0; row < 3; row++) {
      joints.push({ at: [0, 0.3 * (row + 1) - 0.02, 0.231], size: [total, 0.012, 0.004], color: '#8f8876' });
      for (let x = -total / 2 + (row % 2 ? 0.35 : 0.7); x < total / 2; x += 0.7) joints.push({ at: [x, 0.3 * row + 0.14, 0.231], size: [0.012, 0.3, 0.004], color: '#8f8876' });
    }
    bricks(s, s.material('#ffffff', { roughness: 1 }), joints);
    // Old stone darkens along the foot and under the coping.
    s.box([total + 0.01, 0.1 + mood.wear * 0.2, 0.47], [0, 0.05 + mood.wear * 0.1, 0], s.material('#9d9682', { roughness: 1 }));

    const makeBox = (cx: number, state: 'open' | 'opening' | 'locked' | 'tagged', main: boolean) => {
      const box = new THREE.Group();
      box.position.set(cx, P, 0);
      s.root.add(box);
      const add = (mesh: THREE.Object3D) => { box.add(mesh); return mesh; };
      add(s.box([W, 0.03, D], [0, 0.015, 0], paintwork));
      add(s.box([W, BH, 0.025], [0, BH / 2, D / 2 - 0.0125], paintwork));
      add(s.box([W, BH, 0.025], [0, BH / 2, -D / 2 + 0.0125], paintwork));
      for (const side of [-1, 1]) add(s.box([0.025, BH, D], [side * (W / 2 - 0.0125), BH / 2, 0], paintwork));
      for (const side of [-1, 1]) add(s.box([0.05, 0.05, 0.5], [side * 0.7, -0.03, 0], steel));

      const angle = state === 'open' ? mix(1.55, 1.85, random()) : state === 'opening' ? mix(0.85, 1.15, random()) : 0;
      const lid = new THREE.Group();
      lid.position.set(0, BH, -D / 2);
      lid.rotation.x = -angle;
      box.add(lid);
      lid.add(s.box([W + 0.04, 0.045, D + 0.04], [0, 0.0225, D / 2], paintwork));
      for (const side of [-1, 1]) lid.add(s.box([0.03, 0.07, D + 0.04], [side * (W / 2 + 0.005), 0, D / 2], paintwork));
      lid.add(s.box([W + 0.04, 0.07, 0.03], [0, 0, D + 0.01], paintwork));

      const hingeMat=a.hinge==='brass'?s.material('#b99749',{metalness:.6}):steel;
      const hn=a.hinge==='piano'?1:a.hinge==='broad'?2:a.hinge==='brass'?4:3;
      for(let i=0;i<hn;i++){const x=hn===1?0:-.78+i*1.56/(hn-1),w=a.hinge==='piano'?1.95:a.hinge==='broad'?.16:.08;add(s.box([w,.035,.09],[x,BH,-D/2],hingeMat));}
      if(a.boxCorners!=='plain')for(const side of[-1,1])for(const face of[-1,1]){const mat=a.boxCorners==='brass'?s.material('#b7954d',{metalness:.6}):steel;add(s.box([.065,BH,.008],[side*(W/2-.0325),BH/2,face*(D/2+.004)],mat));if(a.boxCorners==='rivets')for(let j=0;j<4;j++)add(s.ball([.007,.007,.005],[side*(W/2-.0325),.04+j*.07,face*(D/2+.01)],steel,6));}
      if(a.lidRibs==='two')for(const z of[.19,.58])lid.add(s.box([W,.02,.025],[0,.055,z],steel));
      else if(a.lidRibs==='four')for(const x of[-.75,-.25,.25,.75])lid.add(s.box([.025,.02,D],[x,.055,D/2],steel));
      else if(a.lidRibs==='diagonal')lid.add(s.rod([-.9,.055,.05],[.9,.055,D-.05],.012,steel));
      if(a.lidRibs==='diagonal')lid.add(s.rod([-.9,.055,D-.05],[.9,.055,.05],.012,steel));
      if(a.footBrackets!=='plain')for(const x of[-.7,.7]){
        if(a.footBrackets==='clamps'){add(s.box([.055,.25,.02],[x,-.125,.3],steel));add(s.box([.055,.025,.65],[x,-.0125,0],steel));}
        else if(a.footBrackets==='triangle')add(s.rod([x,-.27,.24],[x,-.01,.4],.015,steel));
        else add(s.tube([[x,-.01,.4],[x,-.07,.42],[x,-.16,.38],[x,-.22,.24]],.018,steel));
      }
      if(a.sortingShelf!=='none'){
        const mat=a.sortingShelf==='slatted'?s.material('#a58a5a'):paintwork;
        if(a.sortingShelf==='slatted')for(let i=0;i<4;i++)add(s.box([W-.18,.025,.045],[0,-.11,D/2+.025+i*.05],mat));else add(s.box([W-.18,.025,.2],[0,-.11,D/2+.1],mat));
        for(const x of[-.7,.7])add(s.rod([x,-.26,.24],[x,-.12,D/2+.17],.012,steel));
        if(a.sortingShelf==='divided')for(const x of[-.3,.3])add(s.box([.012,.08,.2],[x,-.0575,D/2+.1],steel));
      }
      if(a.boxNumber!=='none'){
        const mat=a.boxNumber==='brass'?s.material('#ba9b51',{metalness:.6}):s.material(a.boxNumber==='enamel'?'#e5e6d8':'#adb999');
        if(a.boxNumber==='brass')add(s.ball([.08,.05,.007],[.76,.16,D/2+.01],mat,16));else add(s.box([.13,.085,.01],[.76,.16,D/2+.01],mat));add(s.label(main?'27':'28',.1,.06,[.76,.16,D/2+.017],'#253a2e',a.boxNumber==='brass'?'#ba9b51':a.boxNumber==='enamel'?'#e5e6d8':'#adb999'));
      }
      const isOpen = state === 'open' || state === 'opening';
      if (isOpen) {
        // Stays holding the lid.
        for (const side of [-1, 1]) {
          const reach = D * 0.55;
          s.root.add(s.rod([cx + side * (W / 2 - 0.03), P + BH, D / 2 - 0.12], [cx + side * (W / 2 - 0.03), P + BH + Math.sin(angle) * reach, -D / 2 + Math.cos(angle) * reach], 0.01, steel));
        }
        const palette = PALETTES[a.display];
        // Inside the lid: pinned stock.
        const canvas = document.createElement('canvas');
        canvas.width = 1024; canvas.height = 400;
        const g = canvas.getContext('2d')!;
        g.fillStyle = `#${green.clone().multiplyScalar(0.8).getHexString()}`; g.fillRect(0, 0, 1024, 400);
        const cols = a.display === 'postcards' ? 12 : a.display === 'records' ? 5 : 7, rows = a.display === 'postcards' ? 3 : a.display === 'records' ? 1 : 2;
        for (let c = 0; c < cols; c++)
          for (let r = 0; r < rows; r++) {
            if (random() < 0.12) continue;
            const cw = 1000 / cols, ch = 380 / rows, x = 12 + c * cw + 6, y = 10 + r * ch + 6, w = cw - 12, h = ch - 12;
            g.save(); g.translate(x + w / 2, y + h / 2); g.rotate((random() - 0.5) * 0.08);
            g.fillStyle = pick(palette); g.fillRect(-w / 2, -h / 2, w, h);
            if (a.display === 'records') { g.fillStyle = '#111'; g.beginPath(); g.arc(0, 0, Math.min(w, h) * 0.36, 0, 7); g.fill(); g.fillStyle = pick(palette); g.beginPath(); g.arc(0, 0, Math.min(w, h) * 0.12, 0, 7); g.fill(); }
            else if (a.display === 'prints' || a.display === 'books') {
              g.strokeStyle = '#3a2f24'; g.lineWidth = 2; g.strokeRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16);
              g.beginPath(); for (let k = 0; k < 7; k++) g.lineTo((random() - 0.5) * w * 0.7, (random() - 0.5) * h * 0.7); g.stroke();
            } else {
              g.fillStyle = pick(palette); g.fillRect(-w / 2 + 5, -h / 2 + 5, w - 10, h * 0.45);
              g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(-w / 2 + 8, h * 0.15, w - 16, 5);
            }
            g.restore();
          }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const inner = s.mesh(new THREE.PlaneGeometry(W - 0.06, D - 0.06), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }), [0, -0.004, D / 2]);
        inner.rotation.x = Math.PI / 2;
        lid.add(inner);

        // Stock in the box.
        const stock: Brick[] = [];
        const fill = state === 'opening' ? 0.6 : 1;
        if (a.display === 'books' || a.display === 'paperbacks') {
          for (let row = 0; row < 3; row++) {
            let x = -W / 2 + 0.05;
            while (x < (W / 2 - 0.08) * (row === 2 ? fill * 2 - 1 : 1)) {
              const thick = a.display === 'books' ? 0.03 + random() * 0.04 : 0.015 + random() * 0.02, tall = (a.display === 'books' ? 0.22 : 0.18) + random() * 0.08 + row * 0.03;
              if (random() < 0.94) stock.push({ at: [x + thick / 2, 0.03 + tall / 2, 0.24 - row * 0.24], size: [thick, tall, 0.16], rot: [0, 0, (random() - 0.5) * 0.12], color: pick(palette) });
              else x += 0.06;
              x += thick + 0.003;
            }
          }
        } else if (a.display === 'prints') {
          for (let i = 0; i < 5; i++) {
            const x = -W / 2 + 0.22 + i * 0.39, sheets = 3 + Math.floor(random() * 6 * fill);
            for (let k = 0; k < sheets; k++) stock.push({ at: [x + (random() - 0.5) * 0.03, 0.04 + k * 0.022, (random() - 0.5) * 0.06], size: [0.32, 0.02, 0.5], rot: [0, (random() - 0.5) * 0.2, 0], color: pick(palette) });
          }
          for (let i = 0; i < 6; i++) stock.push({ at: [-W / 2 + 0.2 + i * 0.32, 0.22, -0.3], size: [0.26, 0.36, 0.012], rot: [-0.25, 0, (random() - 0.5) * 0.08], color: pick(palette) });
        } else if (a.display === 'postcards') {
          for (let row = 0; row < 4; row++)
            for (let i = 0; i < 16; i++) if (random() < 0.9 * fill) stock.push({ at: [-W / 2 + 0.1 + i * 0.12, 0.1 + row * 0.035, 0.28 - row * 0.17], size: [0.1, 0.15, 0.012], rot: [-0.5, 0, (random() - 0.5) * 0.1], color: pick(palette) });
          for (let i = 0; i < 6; i++) { const tower = s.cylinder(0.002, 0.035, 0.16 + random() * 0.08, [-0.8 + i * 0.13 + random() * 0.03, 0.42, -0.3], s.material(pick(['#b08a3a', '#8a8f94', '#2a2a2a']), { metalness: 0.7, roughness: 0.4 }), 4); box.add(tower); }
          box.add(s.box([0.9, 0.3, 0.2], [-0.5, 0.16, -0.27], paintwork));
        } else {
          let x = -W / 2 + 0.2;
          while (x < W / 2 - 0.2) {
            const run = 6 + Math.floor(random() * 10 * fill);
            for (let k = 0; k < run; k++) stock.push({ at: [x, 0.19, 0.27 - k * 0.022], size: [0.31, 0.31, 0.01], rot: [-0.18, (random() - 0.5) * 0.06, 0], color: pick(palette) });
            x += 0.36;
          }
          for (let k = 0; k < 9; k++) stock.push({ at: [0.55 + (random() - 0.5) * 0.02, 0.04 + k * 0.012, -0.22], size: [0.22, 0.012, 0.29], rot: [0, (random() - 0.5) * 0.2, 0], color: pick(palette) });
        }
        bricks(s, s.material('#ffffff', { roughness: 0.8 }), stock, box);

        // Prints and magazines clipped along a wire across the front.
        if (state === 'open') {
          s.root.add(s.rod([cx - W / 2, P + BH - 0.02, D / 2 + 0.03], [cx + W / 2, P + BH - 0.02, D / 2 + 0.03], 0.004, steel));
          const hung: Brick[] = [];
          let x = -W / 2 + 0.14;
          while (x < W / 2 - 0.1) {
            const w = a.display === 'postcards' ? 0.11 : 0.2 + random() * 0.06, h = a.display === 'postcards' ? 0.16 : a.display === 'records' ? w : 0.26 + random() * 0.1;
            if (random() < 0.85) hung.push({ at: [x, BH - 0.04 - h / 2, D / 2 + 0.035], size: [w, h, 0.006], rot: [0.04 + random() * 0.08, 0, (random() - 0.5) * 0.08], color: pick(palette) });
            x += w + 0.03 + random() * 0.04;
          }
          bricks(s, s.material('#ffffff', { roughness: 0.6 }), hung, box);
        }
      } else {
        // Iron bars, hasp and padlock.
        for (const side of [-1, 1]) {
          box.add(s.box([0.05, 0.012, D + 0.1], [side * 0.55, BH + 0.052, 0], steel));
          box.add(s.box([0.05, BH * 0.7, 0.012], [side * 0.55, BH * 0.68, D / 2 + 0.03], steel));
        }
        box.add(s.box([0.09, 0.08, 0.035], [0.55, BH * 0.3, D / 2 + 0.04], s.material('#c2a03c', { metalness: 0.7, roughness: 0.35 })));
        const shackle = s.ring(0.03, 0.008, [0.55, BH * 0.3 + 0.045, D / 2 + 0.04], steel, Math.PI);
        box.add(shackle);
        if (state === 'tagged') {
          const canvas = document.createElement('canvas');
          canvas.width = 1024; canvas.height = 400;
          const g = canvas.getContext('2d')!;
          g.fillStyle = `#${green.getHexString()}`; g.fillRect(0, 0, 1024, 400);
          g.lineCap = 'round'; g.lineJoin = 'round';
          for (let i = 0; i < 4; i++) {
            g.strokeStyle = pick(['#f2f2f2', '#e83a8a', '#f0d21e', '#3ad0e0', '#111']); g.lineWidth = 10 + random() * 16;
            g.beginPath(); let x = 80 + random() * 600, y = 100 + random() * 200; g.moveTo(x, y);
            for (let k = 0; k < 9; k++) { x += 20 + random() * 60; y = 80 + random() * 240; g.quadraticCurveTo(x - 30, 200 + (random() - 0.5) * 300, x, y); }
            g.stroke();
          }
          g.fillStyle = 'rgba(30,40,30,0.35)';
          for (let i = 0; i < 30; i++) g.fillRect(random() * 1024, 0, 3 + random() * 8, 400);
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          const top = s.mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }), [0, 0.047, D / 2]);
          top.rotation.x = -Math.PI / 2;
          lid.add(top);
          const front = s.mesh(new THREE.PlaneGeometry(W, BH), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }), [0, BH / 2, D / 2 + 0.002]);
          box.add(front);
        }
      }
      if (main && a.sign !== 'none') {
        const text = { livres: 'LIVRES ANCIENS', euro: 'TOUT A 1 EURO', retour: 'DE RETOUR A 15H', vendre: 'A VENDRE' }[a.sign];
        const card = s.label(text, 0.62, 0.17, [-0.45, isOpen ? -0.14 : BH * 0.5, D / 2 + (isOpen ? 0.06 : 0.02)], '#2a2018', a.sign === 'vendre' ? '#f0d86a' : '#f3ecd8');
        card.rotation.z = (random() - 0.5) * 0.12;
        box.add(card);
      }
    };

    makeBox(offset, a.state, true);
    if (a.neighbour) makeBox(offset + W + 0.14, mood.wear > 0.6 ? 'tagged' : 'locked', false);

    // Left on the parapet or beside it.
    const lx = total / 2 - 0.22;
    if (a.left === 'book') {
      const cover = s.material(pick(PALETTES.books)), pages = s.material('#efe8d4');
      for (const side of [-1, 1]) {
        s.box([0.13, 0.012, 0.2], [lx + side * 0.055, P + 0.035, 0.05], cover).rotation.z = side * -0.5;
        s.box([0.12, 0.014, 0.19], [lx + side * 0.05, P + 0.022, 0.05], pages).rotation.z = side * -0.5;
      }
    } else if (a.left === 'cat') {
      const fur = s.material(pick(['#2a2a2c', '#c9853a', '#8a8a88', '#e9e2d4']), { roughness: 1 });
      s.ball([0.17, 0.085, 0.12], [lx - 0.02, P + 0.085, 0], fur, 14);
      s.ball([0.065, 0.06, 0.065], [lx - 0.15, P + 0.075, 0.07], fur, 12);
      for (const dz of [-0.035, 0.035]) s.cylinder(0, 0.022, 0.04, [lx - 0.16, P + 0.14, 0.07 + dz], fur, 4);
      s.tube([[lx + 0.12, P + 0.04, -0.04], [lx + 0.16, P + 0.03, 0.08], [lx + 0.05, P + 0.03, 0.15], [lx - 0.06, P + 0.03, 0.14]], 0.018, fur);
    } else if (a.left === 'stool') {
      const stoolStart=s.root.children.length;
      const wood = s.material('#8a6a42'), sx = total / 2 - 0.3, sz = 0.85;
      for (const side of [-1, 1]) { s.rod([sx - 0.17, 0, sz + side * 0.15], [sx + 0.17, 0.44, sz + side * 0.15], 0.014, wood); s.rod([sx + 0.17, 0, sz + side * 0.15], [sx - 0.17, 0.44, sz + side * 0.15], 0.014, wood); }
      s.box([0.38, 0.02, 0.34], [sx, 0.45, sz], s.material('#3f5f7a', { roughness: 1 }));
      s.cylinder(0.04, 0.04, 0.24, [sx - 0.05, 0.58, sz], s.material('#b2332a', { metalness: 0.3, roughness: 0.4 }), 12);
      s.cylinder(0.042, 0.042, 0.05, [sx - 0.05, 0.72, sz], s.material('#d8d8d4', { metalness: 0.6 }), 12);
      const stool=new THREE.Group();stool.name='grounded-bookseller-stool';stool.add(...s.root.children.slice(stoolStart));s.root.add(stool);stool.updateWorldMatrix(true,true);stool.position.y-=new THREE.Box3().setFromObject(stool,true).min.y;
    } else if (a.left === 'umbrella') {
      const cloth = s.material(pick(['#18181c', '#8a1f2a', '#1f3f6a']), { roughness: 0.7 });
      s.rod([lx, 0.12, 0.34], [lx, 0.98, 0.31], 0.035, cloth, 0.014);
      s.rod([lx, 0.98, 0.31], [lx, 1.08, 0.31], 0.008, s.material('#3a2a1a'));
      s.ring(0.04, 0.01, [lx, 1.08, 0.27], s.material('#6a4424'), Math.PI).rotation.y = Math.PI / 2;
      s.cylinder(0.12, 0.14, 0.004, [lx + 0.03, 0.003, 0.4], new THREE.MeshStandardMaterial({ color: '#7f97a3', roughness: 0.05, metalness: 0.4 }), 14).castShadow = false;
    }

    const end=total/2+.01;
    if(a.parcelKit==='paper'){s.box([.24,.025,.19],[end,.0125,.65],steel);s.cylinder(.065,.065,.22,[end,.09,.65],s.material('#c5a57a'),18).rotation.z=Math.PI/2;for(const dx of[-.12,.12])s.box([.015,.17,.18],[end+dx,.085,.65],steel);}
    else if(a.parcelKit==='twine'){s.box([.24,.025,.19],[end,.0125,.65],s.material('#8c704d'));s.ball([.065,.06,.065],[end-.035,.085,.65],s.material('#cdb88d'),16);for(const dx of[-.015,.015])s.ring(.014,.003,[end+.07+dx,.029,.65],steel).rotation.x=Math.PI/2;s.rod([end+.07,.029,.65],[end+.07,.029,.73],.003,steel);}
    else if(a.parcelKit==='satchel'){const leather=s.material('#815b39');s.box([.27,.23,.1],[end,.115,.65],leather);for(const dx of[-.08,.08]){s.box([.025,.21,.01],[end+dx,.12,.705],s.material('#c1a16a'));s.box([.034,.03,.014],[end+dx,.1,.71],steel);}s.tube([[end-.06,.22,.65],[end-.04,.29,.65],[end+.04,.29,.65],[end+.06,.22,.65]],.008,leather);}
    if(a.quayPaving!=='bare'){
      const nx=a.quayPaving==='setts'?Math.ceil(total/.16):Math.ceil(total/.55),nz=a.quayPaving==='setts'?7:3;
      s.box([total+.5,.034,1.4],[0,-.023,.45],s.material('#88877e'));
      const matrix=new THREE.Matrix4(),paving=new THREE.InstancedMesh(new THREE.BoxGeometry((total+.5)/nx-.005,.006,1.4/nz-.005),s.material(a.quayPaving==='setts'?'#a2a39b':'#c9c2b0'),nx*nz);
      for(let x=0;x<nx;x++)for(let z=0;z<nz;z++)paving.setMatrixAt(x*nz+z,matrix.makeTranslation(-(total+.5)/2+(x+.5)*(total+.5)/nx,-.003,-.25+(z+.5)*1.4/nz));
      paving.castShadow=paving.receiveShadow=true;s.root.add(paving);
      if(a.quayPaving==='drain'){
        s.box([total+.4,.006,.12],[0,.003,.95],steel);
        const count=Math.floor(total/.1),grates=new THREE.InstancedMesh(new THREE.BoxGeometry(.024,.002,.1),s.material('#292f2d'),count);
        for(let i=0;i<count;i++)grates.setMatrixAt(i,matrix.makeTranslation(-total/2+i*.1,.007,.95));
        grates.castShadow=grates.receiveShadow=true;s.root.add(grates);
      }
    }

    return s.finish();
  },
});
