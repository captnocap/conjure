import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type V3 = [number, number, number];
const LEATHER = {
  oxblood: 'Deep oxblood red-brown, the classic.',
  brown: 'Chocolate brown, dull with age.',
  black: 'Black, severe, with brass tacks.',
  green: 'Bottle green.',
  tan: 'Pale tan, cracked like an old sofa.',
  slate: 'Blue-grey, a 1980s replacement.',
} as const;
const HIDE: Record<keyof typeof LEATHER, string> = { oxblood: '#6a2a26', brown: '#5a3d2c', black: '#26221f', green: '#2f4f3c', tan: '#b08a5c', slate: '#55687a' };

export default defineThing({
  questions: {
    leather: choice('What colour is the padding?', LEATHER),
    quilting: choice('How is the padding stitched?', {
      diamonds: 'Deep diamond tufting with a button at every crossing.',
      channels: 'Fat vertical channels like a bench seat.',
      squares: 'A grid of square pillows pinned at the corners.',
      border: 'Smooth and taut, held by a frame of tacks and one tack diamond in the middle.',
    }),
    number: choice('How is the flat numbered?', {
      enamel: 'A white enamel oval with a blue number.',
      brass: 'Polished brass digits screwed to the padding.',
      plastic: 'Black stick-on digits, one slipping.',
      painted: 'Painted by hand on the frame above the door.',
      missing: 'The plate is gone: two screw holes and a pale shape.',
    }),
    home: choice('What does the door tell you about who is inside?', {
      lit: 'Someone is home: warm light under the door and in the peephole.',
      dark: 'Dark and silent, locked twice.',
      ajar: 'Ajar on its chain, a slice of yellow light and a listening ear.',
      sealed: 'Sealed with an official paper strip across the jamb: nobody lives here now.',
    }),
    threshold: choice('What waits at the threshold?', {
      milk: 'Milk bottles left by the door.',
      note: 'A handwritten note stuck to the door.',
      rubbish: 'A knotted bag of rubbish waiting to be taken down.',
      flowers: 'A bunch of flowers in paper laid on the mat.',
      post: 'A week of newspapers and letters piling up.',
      parcel: 'A parcel tied with string.',
      nothing: 'Nothing at all.',
    }),
    shoes: choice('Whose shoes stand outside?', {
      boots: 'A pair of heavy work boots.',
      heels: 'A pair of women’s court shoes.',
      wellies: 'A child’s small bright rubber boots.',
      slippers: 'Felt slippers, for going to the rubbish chute.',
      family: 'A whole row: big, medium and small, a family.',
      none: 'None.',
    }),
    mat: choice('What is the doormat?', {
      coir: 'A bristly brown coir mat.',
      rubber: 'A black ribbed rubber mat.',
      rag: 'A striped rag rug woven from old clothes.',
      cloth: 'A damp grey floor cloth, folded.',
      none: 'No mat.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const DW = 0.86, DH = 2.0, wallW = 1.56, wallH = 2.3, wallT = 0.14, jamb = 0.07;
    const [lowC, highC] = pick([['#7c8a5a', '#e4e0d2'], ['#9fb9c6', '#e8e7df'], ['#c39a45', '#ebe2c6'], ['#6f8f8a', '#deded2'], ['#a9886a', '#e3dccb']] as const);
    const low = s.material(lowC, { roughness: 0.45 }), high = s.material(highC, { roughness: 0.95 });
    const dado = 1.5, open = DW / 2 + jamb;

    // Floor, wall around the opening, frame.
    s.box([wallW, 0.05, 1.0], [0, -0.025, 0.36], s.material('#a9a498', { roughness: 0.9 }));
    for (const side of [-1, 1]) {
      const w = wallW / 2 - open, x = side * (open + w / 2);
      s.box([w, dado, wallT], [x, dado / 2, -wallT / 2], low);
      s.box([w, wallH - dado, wallT], [x, dado + (wallH - dado) / 2, -wallT / 2], high);
      s.box([w, 0.022, 0.004], [x, dado, 0.002], s.material(new THREE.Color(lowC).multiplyScalar(0.55)));
      s.box([w, 0.09, 0.014], [x, 0.045, 0.007], s.material('#4a4640'));
    }
    s.box([open * 2, wallH - DH - jamb, wallT], [0, DH + jamb + (wallH - DH - jamb) / 2, -wallT / 2], high);
    const frameColour = pick(['#5a3a26', '#e6e1d2', '#6a7a5a', '#3f342c']);
    const frame = s.material(frameColour, { roughness: 0.5 });
    for (const side of [-1, 1]) s.box([jamb, DH + jamb, wallT + 0.03], [side * (DW / 2 + jamb / 2), (DH + jamb) / 2, -wallT / 2 + 0.015], frame);
    s.box([DW + jamb * 2, jamb, wallT + 0.03], [0, DH + jamb / 2, -wallT / 2 + 0.015], frame);
    s.box([DW, 0.02, wallT + 0.04], [0, 0.01, -wallT / 2 + 0.02], s.material('#7a5a3a', { roughness: 0.6 }));
    // Whatever is behind the door: darkness, or a lit hallway.
    const warm = new THREE.Color('#ffb040').lerp(new THREE.Color('#ffe2a0'), 1 - mood.warmth);
    const interior = new THREE.MeshStandardMaterial({ color: a.home === 'ajar' ? warm : '#14110f', emissive: a.home === 'ajar' ? warm : '#000000', emissiveIntensity: a.home === 'ajar' ? 0.75 : 0, roughness: 1 });
    s.box([DW, DH, 0.01], [0, DH / 2, -wallT + 0.005], interior);

    // The leaf, hinged on the left.
    const leaf = new THREE.Group();
    leaf.position.set(-DW / 2, 0, -0.04);
    if (a.home === 'ajar') leaf.rotation.y = 0.1 + random() * 0.04;
    s.root.add(leaf);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, at: V3, parent: THREE.Object3D = leaf) => {
      const mesh = new THREE.Mesh(geo, mat); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const hide = new THREE.Color(HIDE[a.leather]);
    const leather = new THREE.MeshStandardMaterial({ color: hide.clone().lerp(new THREE.Color('#8a8172'), mood.wear * 0.2), roughness: mix(0.35, 0.7, mood.wear) });
    add(new THREE.BoxGeometry(DW - 0.008, DH - 0.02, 0.04), s.material(hide.clone().multiplyScalar(0.7)), [DW / 2, DH / 2 + 0.012, 0]);
    const PW = 0.78, PH = 1.9, puff = a.quilting === 'border' ? 0.022 : 0.03;
    const cols = 4, rows = a.quilting === 'diamonds' ? 10 : 8;
    const ax = PW / cols, by = PH / rows;
    const pad = new THREE.PlaneGeometry(PW, PH, 56, 128);
    const pos = pad.attributes.position as THREE.BufferAttribute;
    const edge = (v: number, half: number) => Math.min(1, (half - Math.abs(v)) / 0.035);
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), y = pos.getY(k);
      let z = 1;
      if (a.quilting === 'diamonds') z = Math.abs(Math.sin(Math.PI * (x / ax + y / by) * 0.5)) ** 0.55 * Math.abs(Math.sin(Math.PI * (x / ax - y / by) * 0.5)) ** 0.55;
      else if (a.quilting === 'channels') z = Math.abs(Math.sin(Math.PI * (x / (PW / 6)))) ** 0.45;
      else if (a.quilting === 'squares') z = Math.abs(Math.sin(Math.PI * (x / ax))) ** 0.45 * Math.abs(Math.sin(Math.PI * (y / (PH / 9)))) ** 0.45;
      else z = 0.8 + 0.2 * Math.cos((x / PW) * Math.PI) * Math.cos((y / PH) * Math.PI);
      z *= Math.max(0, edge(x, PW / 2)) ** 0.5 * Math.max(0, edge(y, PH / 2)) ** 0.5;
      pos.setZ(k, 0.004 + z * puff);
    }
    pad.computeVertexNormals();
    add(pad, leather, [DW / 2, DH / 2 + 0.012, 0.02]);
    const padX = DW / 2, padY = DH / 2 + 0.012;

    // Buttons and tacks, instanced.
    const brassy = a.leather === 'black' || random() < 0.5;
    const studs: V3[] = [];
    if (a.quilting === 'diamonds') {
      for (let m = -12; m <= 12; m++) for (let n = -12; n <= 12; n++) { const x = (m + n) * ax, y = (m - n) * by; if (Math.abs(x) < PW / 2 - 0.05 && Math.abs(y) < PH / 2 - 0.05) studs.push([x, y, 0.008]); }
    } else if (a.quilting === 'squares') {
      for (let i = -cols / 2 + 1; i < cols / 2; i++) for (let j = -4; j <= 4; j++) { const y = j * (PH / 9) + PH / 18; if (Math.abs(y) < PH / 2 - 0.05) studs.push([i * ax, y, 0.008]); }
    } else if (a.quilting === 'border') {
      for (let k = 0; k < 16; k++) { const t = k / 16, d = 0.2; const [x, y] = t < 0.25 ? [t * 4 * d, d * 1.6 * (1 - t * 4)] : t < 0.5 ? [d * (1 - (t - 0.25) * 4), -d * 1.6 * (t - 0.25) * 4] : t < 0.75 ? [-d * (t - 0.5) * 4, -d * 1.6 * (1 - (t - 0.5) * 4)] : [-d * (1 - (t - 0.75) * 4), d * 1.6 * (t - 0.75) * 4]; studs.push([x, y - 0.25, puff + 0.002]); }
    }
    const nx = Math.round(PW / 0.045), ny = Math.round(PH / 0.045);
    for (let k = 0; k <= nx; k++) for (const y of [-PH / 2 + 0.012, PH / 2 - 0.012]) studs.push([-PW / 2 + 0.012 + (k / nx) * (PW - 0.024), y, 0.006]);
    for (let k = 1; k < ny; k++) for (const x of [-PW / 2 + 0.012, PW / 2 - 0.012]) studs.push([x, -PH / 2 + 0.012 + (k / ny) * (PH - 0.024), 0.006]);
    const studMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.009, 8, 6), brassy ? new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.85, roughness: 0.3 }) : new THREE.MeshStandardMaterial({ color: hide.clone().multiplyScalar(0.75), roughness: 0.5 }), studs.length);
    const m4 = new THREE.Matrix4();
    studs.forEach((p, i) => { m4.makeScale(1, 1, 0.55).setPosition(padX + p[0], padY + p[1], 0.02 + p[2]); studMesh.setMatrixAt(i, m4); });
    studMesh.castShadow = true;
    leaf.add(studMesh);

    // A tear with wadding showing, when things are worn.
    if (mood.wear > 0.55) {
      const tx = padX + (random() - 0.5) * 0.4, ty = 0.25 + random() * 0.5;
      add(new THREE.SphereGeometry(1, 10, 8), s.material('#d9d2c0', { roughness: 1 }), [tx, ty, 0.04]).scale.set(0.05, 0.03, 0.02);
      if (random() < 0.6) add(new THREE.BoxGeometry(0.16, 0.045, 0.002), s.material('#b9b3a2', { roughness: 0.4 }), [tx + 0.02, ty + 0.06, 0.056]).rotation.z = 0.3;
    }

    // Hardware.
    const brass = s.material('#c9a24a', { metalness: 0.85, roughness: mix(0.2, 0.55, mood.wear) });
    const steel = s.material('#b9bcbc', { metalness: 0.8, roughness: 0.3 });
    const hw = pick([brass, steel]);
    const hx = DW - 0.075;
    add(new THREE.BoxGeometry(0.045, 0.2, 0.012), hw, [hx, 1.02, 0.045]);
    add(new THREE.CylinderGeometry(0.01, 0.01, 0.05, 10).rotateX(Math.PI / 2), hw, [hx, 1.07, 0.07]);
    if (random() < 0.6) add(new THREE.BoxGeometry(0.13, 0.02, 0.018), hw, [hx - 0.055, 1.07, 0.094]);
    else add(new THREE.SphereGeometry(0.03, 14, 10), hw, [hx, 1.07, 0.1]);
    add(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 8).rotateX(Math.PI / 2), s.material('#1b1b1b'), [hx, 0.97, 0.052]);
    const locks = a.home === 'dark' || a.home === 'sealed' ? 2 : 1;
    for (let k = 0; k < locks; k++) { add(new THREE.CylinderGeometry(0.024, 0.024, 0.014, 16).rotateX(Math.PI / 2), hw, [hx, 1.28 + k * 0.2, 0.05]); add(new THREE.BoxGeometry(0.004, 0.014, 0.004), s.material('#1b1b1b'), [hx, 1.28 + k * 0.2, 0.058]); }
    // Peephole.
    const peepY = 1.52;
    add(new THREE.CylinderGeometry(0.02, 0.022, 0.014, 16).rotateX(Math.PI / 2), brass, [padX, peepY, 0.05]);
    const lens = new THREE.MeshStandardMaterial({ color: '#101418', roughness: 0.05, emissive: warm, emissiveIntensity: a.home === 'lit' ? 1.6 : a.home === 'ajar' ? 0.5 : 0 });
    add(new THREE.SphereGeometry(0.012, 10, 8), lens, [padX, peepY, 0.056]).scale.z = 0.5;

    // Number.
    const flat = String(1 + Math.floor(random() * 96));
    const numY = 1.7;
    if (a.number === 'enamel') {
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 160;
      const g = canvas.getContext('2d')!;
      g.fillStyle = '#f6f4ec'; g.beginPath(); g.ellipse(128, 80, 124, 76, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#27458f'; g.lineWidth = 9; g.beginPath(); g.ellipse(128, 80, 108, 62, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#27458f'; g.font = 'bold 96px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(flat, 128, 86);
      for (let k = 0; k < mood.wear * 8; k++) { g.fillStyle = '#3a2a20'; g.beginPath(); g.arc(128 + Math.cos(k * 2.1) * 110, 80 + Math.sin(k * 2.1) * 66, 5 + random() * 8, 0, Math.PI * 2); g.fill(); }
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      add(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.2 }), [padX, numY, 0.058]);
    } else if (a.number === 'brass' || a.number === 'plastic') {
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 160;
      const g = canvas.getContext('2d')!;
      g.font = 'bold 150px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = a.number === 'brass' ? '#d4ad52' : '#141414';
      if (a.number === 'plastic' && flat.length > 1) { g.fillText(flat[0], 80, 84); g.save(); g.translate(176, 92); g.rotate(0.28); g.fillText(flat[1], 0, 0); g.restore(); } else g.fillText(flat, 128, 84);
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      add(new THREE.PlaneGeometry(0.17, 0.106), new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.3, metalness: a.number === 'brass' ? 0.7 : 0 }), [padX, numY, 0.058]);
    } else if (a.number === 'painted') {
      const n = s.label(flat, 0.16, 0.085, [0, DH + jamb + 0.085, 0.003], '#2a2a2a', highC);
      n.rotation.z = (random() - 0.5) * 0.08;
    } else {
      add(new THREE.CircleGeometry(0.06, 20), s.material(hide.clone().lerp(new THREE.Color('#ffffff'), 0.18), { roughness: 0.6 }), [padX, numY, 0.057]).scale.y = 0.62;
      for (const dx of [-0.045, 0.045]) add(new THREE.CircleGeometry(0.004, 8), s.material('#111'), [padX + dx, numY, 0.0575]);
    }

    // Bell and name card on the wall.
    const bx = DW / 2 + jamb + 0.11;
    s.box([0.06, 0.09, 0.02], [bx, 1.32, 0.01], s.material(pick(['#3b2a20', '#e6e1d0', '#1f1f1f']), { roughness: 0.35 }));
    s.cylinder(0.014, 0.014, 0.012, [bx, 1.33, 0.024], s.material(pick(['#d8402f', '#f1eee4', '#111']), { roughness: 0.3 }), 14).rotation.x = Math.PI / 2;
    if (a.home !== 'sealed') s.label(pick(['NOVÁK', 'KOWALSKI', 'PETROVI', 'HORVÁTH', 'IONESCU', 'DVOŘÁK']), 0.11, 0.035, [bx, 1.235, 0.003], '#2742a6', '#efe6c8').rotation.z = (random() - 0.5) * 0.1;

    // Light under a lit door; chain and gap when ajar; paper seal.
    if (a.home === 'lit') s.box([DW - 0.03, 0.012, 0.012], [0, 0.026, -0.012], s.material('#ffd48a', { emissive: warm, emissiveIntensity: 2.2 }));
    if (a.home === 'ajar') s.tube([[DW / 2 + 0.005, 1.2, -0.03], [DW / 2 - 0.03, 1.185, -0.05], [DW / 2 - 0.07, 1.2, -0.085]], 0.004, steel);
    if (a.home === 'sealed') {
      const seal = s.label(pick(['OPIECZĘTOWANO', 'ZAPEČETĚNO', 'SIGILAT', 'SEALED']), 0.34, 0.08, [DW / 2 - 0.02, 1.16, 0.045], '#3a3a3a', '#efe9d6');
      seal.rotation.z = (random() - 0.5) * 0.12;
      s.cylinder(0.03, 0.03, 0.002, [DW / 2 + 0.07, 1.15, 0.047], s.material('#a02a3a', { roughness: 0.5 }), 16).rotation.x = Math.PI / 2;
    }

    // Doormat.
    const matZ = 0.3, matW = 0.7, matD = 0.42;
    let matTop = 0;
    if (a.mat !== 'none') {
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 160;
      const g = canvas.getContext('2d')!;
      if (a.mat === 'coir') { g.fillStyle = '#8a6a3c'; g.fillRect(0, 0, 256, 160); for (let k = 0; k < 2600; k++) { g.fillStyle = random() < 0.5 ? 'rgba(60,40,18,0.5)' : 'rgba(190,150,90,0.5)'; g.fillRect(random() * 256, random() * 160, 2, 3); } g.strokeStyle = '#4a3418'; g.lineWidth = 10; g.strokeRect(5, 5, 246, 150); }
      else if (a.mat === 'rubber') { g.fillStyle = '#222426'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#3a3d40'; for (let k = 0; k < 20; k++) g.fillRect(12, 10 + k * 7.2, 232, 3); }
      else if (a.mat === 'rag') { const cs = ['#b23a3a', '#2f5f9a', '#e3c95a', '#3d8a56', '#e9e3d0', '#444', '#c9703a', '#8a4a8c']; let y = 0; while (y < 160) { const h = 4 + random() * 10; g.fillStyle = pick(cs); g.fillRect(0, y, 256, h); y += h; } g.fillStyle = 'rgba(255,255,255,0.25)'; for (let k = 0; k < 32; k++) g.fillRect(k * 8, 0, 1.5, 160); }
      else { g.fillStyle = '#8f9290'; g.fillRect(0, 0, 256, 160); g.fillStyle = 'rgba(40,50,55,0.35)'; g.beginPath(); g.ellipse(120, 90, 100, 55, 0.2, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(60,60,60,0.5)'; g.strokeRect(3, 3, 250, 154); }
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      const h = a.mat === 'coir' ? 0.022 : a.mat === 'cloth' ? 0.012 : 0.008;
      const w = a.mat === 'cloth' ? 0.5 : matW, d = a.mat === 'cloth' ? 0.34 : matD;
      const body = s.box([w, h, d], [0, h / 2, matZ], new THREE.MeshStandardMaterial({ map: tex, roughness: a.mat === 'cloth' ? 0.5 : 1 }));
      body.rotation.y = (random() - 0.5) * (a.mat === 'cloth' ? 0.5 : 0.12);
      matTop = h;
    }

    // Shoes.
    interface ShoeSpec { len: number; width: number; shaft: number; toe: number; heel: number; colour: string; gloss: number; open?: boolean }
    const shoe = (spec: ShoeSpec, at: V3, turn: number) => {
      const group = new THREE.Group();
      group.position.set(...at); group.rotation.y = turn;
      const mat = s.material(spec.colour, { roughness: spec.gloss });
      const sole = s.material('#231f1c', { roughness: 0.9 });
      const { len, width: w } = spec;
      const piece = (geo: THREE.BufferGeometry, m: THREE.Material, p: V3, scale?: V3, rot?: V3) => { const mesh = add(geo, m, p, group); if (scale) mesh.scale.set(...scale); if (rot) mesh.rotation.set(...rot); return mesh; };
      if (spec.heel > 0) {
        piece(new THREE.BoxGeometry(w, 0.008, len * 0.5), sole, [0, 0.004, len * 0.22]);
        piece(new THREE.BoxGeometry(w * 0.85, 0.008, len * 0.5), sole, [0, spec.heel * 0.55, -len * 0.2], undefined, [-Math.atan2(spec.heel, len * 0.5), 0, 0]);
        piece(new THREE.CylinderGeometry(0.012, 0.006, spec.heel, 8), mat, [0, spec.heel / 2, -len * 0.42]);
        piece(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat, [0, 0.008, len * 0.3], [w / 2, spec.toe, len * 0.2]);
        piece(new THREE.CylinderGeometry(w * 0.42, w * 0.4, 0.035, 12, 1, true, Math.PI * 0.5, Math.PI), mat, [0, spec.heel + 0.02, -len * 0.4]).material.side = THREE.DoubleSide;
      } else {
        piece(new THREE.BoxGeometry(w, 0.018, len), sole, [0, 0.009, 0]);
        piece(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat, [0, 0.018, len * 0.22], [w / 2, spec.toe, len * 0.28]);
        if (!spec.open) piece(new THREE.BoxGeometry(w * 0.92, spec.toe * 1.1, len * 0.5), mat, [0, 0.018 + spec.toe * 0.55, -len * 0.22]);
        if (spec.shaft > 0) {
          const shaft = piece(new THREE.CylinderGeometry(w * 0.5, w * 0.45, spec.shaft, 14, 1, true), mat, [0, 0.018 + spec.toe + spec.shaft / 2, -len * 0.24]);
          shaft.material.side = THREE.DoubleSide; shaft.rotation.z = (random() - 0.5) * 0.12;
        }
      }
      s.root.add(group);
    };
    const SPECS: Record<string, () => ShoeSpec> = {
      boots: () => ({ len: 0.3, width: 0.11, shaft: 0.14, toe: 0.06, heel: 0, colour: pick(['#3a2a1e', '#1f1c1a', '#5a4630']), gloss: 0.8 }),
      heels: () => ({ len: 0.24, width: 0.075, shaft: 0, toe: 0.035, heel: 0.065, colour: pick(['#b3202a', '#1b1b1b', '#d9c3a0', '#2a3f7a']), gloss: 0.25 }),
      wellies: () => ({ len: 0.19, width: 0.075, shaft: 0.13, toe: 0.045, heel: 0, colour: pick(['#f0c419', '#e0352b', '#2f7fd0', '#3da35a']), gloss: 0.2 }),
      slippers: () => ({ len: 0.27, width: 0.1, shaft: 0, toe: 0.04, heel: 0, colour: pick(['#7a2a2a', '#3a4a6a', '#6a5a3a']), gloss: 1, open: true }),
      sneakers: () => ({ len: 0.27, width: 0.1, shaft: 0, toe: 0.05, heel: 0, colour: pick(['#e9e6dc', '#3d6fb0', '#c8332b']), gloss: 0.7 }),
    };
    const shoeZ = 0.12, shoeX0 = DW / 2 + jamb + 0.04;
    const pair = (kind: string, x: number, z: number) => {
      const spec = SPECS[kind]();
      const turn = Math.PI + (random() - 0.5) * 0.3;
      shoe(spec, [x, 0, z], turn);
      shoe(spec, [x + spec.width + 0.015, 0, z + (random() - 0.5) * 0.05], turn + (random() - 0.5) * 0.35);
    };
    if (a.shoes === 'family') { let x = DW / 2 - 0.12; for (const kind of ['boots', 'heels', 'sneakers', 'wellies'].slice(0, 3 + Math.round(mood.density))) { pair(kind, x - wallW * 0, 0.16 + random() * 0.03); x -= 0.27; } }
    else if (a.shoes !== 'none') pair(a.shoes, a.mat === 'none' ? 0.1 : shoeX0 - 0.03, a.mat === 'none' ? 0.16 : shoeZ + 0.04);

    // What waits at the threshold.
    const leftX = -DW / 2 - jamb - 0.14;
    if (a.threshold === 'milk') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#e8f4f0', transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false });
      const n = 2 + Math.floor(random() * 2);
      for (let k = 0; k < n; k++) {
        const x = leftX + k * 0.1 - 0.02, z = 0.09 + (k % 2) * 0.07 + random() * 0.02;
        s.lathe([[0.001, 0], [0.04, 0], [0.042, 0.02], [0.042, 0.14], [0.02, 0.2], [0.02, 0.24], [0.023, 0.245]], glass, [x, 0, z]).castShadow = false;
        const full = k < n - 1 || random() < 0.5;
        if (full) { s.cylinder(0.039, 0.039, 0.135, [x, 0.07, z], s.material('#f6f3e8', { roughness: 0.3 }), 16); s.cylinder(0.019, 0.037, 0.06, [x, 0.168, z], s.material('#f6f3e8', { roughness: 0.3 }), 16); s.cylinder(0.019, 0.019, 0.03, [x, 0.212, z], s.material('#f6f3e8'), 12); }
        s.cylinder(0.024, 0.024, 0.01, [x, 0.247, z], full ? s.material(pick(['#c9cdd0', '#d9b23a', '#3f7fd0']), { metalness: 0.7, roughness: 0.3 }) : s.material('#e8f4f0', { transparent: true, opacity: 0.4 }), 12);
      }
    } else if (a.threshold === 'note') {
      const note = s.label(pick(['byłem · zadzwoń', 'klíče u sousedky', 'vin mâine', 'BACK SOON', 'paczka pod 7']), 0.26, 0.15, [-0.08, 1.2, 0.03], '#1f3a9a', '#f6f1dc');
      note.removeFromParent(); note.position.set(DW / 2 - 0.08, 1.24, 0.062); note.rotation.z = (random() - 0.5) * 0.3; leaf.add(note);
      add(new THREE.BoxGeometry(0.07, 0.025, 0.002), s.material('#d9cf9a', { roughness: 0.6 }), [DW / 2 - 0.08, 1.31, 0.064]).rotation.z = note.rotation.z + 0.1;
    } else if (a.threshold === 'rubbish') {
      const bag = s.material(pick(['#1c1f24', '#2a4f8a', '#3a3f3a']), { roughness: 0.3 });
      const x = leftX + 0.02, z = 0.2;
      const body = s.ball([0.17, 0.19, 0.16], [x, 0.17, z], bag, 12);
      const p2 = body.geometry.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < p2.count; k++) { const f = 1 + (random() - 0.5) * 0.16; p2.setXYZ(k, p2.getX(k) * f, Math.max(-0.9, p2.getY(k)) * f, p2.getZ(k) * f); }
      body.geometry.computeVertexNormals();
      s.cylinder(0.02, 0.05, 0.07, [x, 0.38, z], bag, 8);
      for (const side of [-1, 1]) s.ball([0.05, 0.05, 0.012], [x + side * 0.04, 0.44, z], bag, 8).rotation.z = side * -0.5;
      if (random() < 0.6) s.cylinder(0.02, 0.03, 0.12, [x + 0.19, 0.03, z + 0.08], s.material('#3d7a4a', { roughness: 0.15 }), 10).rotation.z = Math.PI / 2;
    } else if (a.threshold === 'flowers') {
      const group = new THREE.Group(); group.position.set(-0.05, matTop + 0.04, matZ); group.rotation.set(0, 0.5 + random() * 0.8, 0); s.root.add(group);
      add(new THREE.ConeGeometry(0.09, 0.42, 12, 1, true).rotateZ(Math.PI / 2), s.material(pick(['#e9e3d0', '#c9d8c9', '#d9c9b0']), { roughness: 0.9, side: THREE.DoubleSide }), [0, 0.03, 0], group).scale.set(1, 0.6, 1);
      const cols2 = pick([['#e0262b', '#f6eef0'], ['#f0c419', '#f58d74'], ['#f0559a', '#ffffff'], ['#b81f7a', '#f0c419']] as const);
      for (let k = 0; k < 9; k++) add(new THREE.SphereGeometry(0.028, 8, 6), s.material(cols2[k % 2], { roughness: 0.7, emissive: cols2[k % 2], emissiveIntensity: mix(0.02, 0.2, mood.cheer) }), [-0.22 - random() * 0.05, 0.03 + (random() - 0.4) * 0.07, (random() - 0.5) * 0.14], group);
      for (let k = 0; k < 4; k++) add(new THREE.SphereGeometry(1, 6, 4), s.material('#3f7a3c'), [-0.2, 0.03, (random() - 0.5) * 0.16], group).scale.set(0.05, 0.008, 0.02);
    } else if (a.threshold === 'post') {
      const paper = ['#d9d5c6', '#cfcabb', '#e3dfd0', '#f1efe6', '#e9d94a', '#e2574c'];
      const n = 5 + Math.round(mood.density * 6);
      for (let k = 0; k < n; k++) { const news = k < n * 0.6; s.box(news ? [0.3, 0.014, 0.21] : [0.22, 0.003, 0.11], [-0.08 + (random() - 0.5) * 0.12, matTop + 0.008 + k * 0.012, matZ + (random() - 0.5) * 0.08], s.material(news ? pick(paper.slice(0, 3)) : pick(paper), { roughness: 1 })).rotation.y = (random() - 0.5) * 0.9; }
      const stuck = add(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 10), s.material('#d9d5c6', { roughness: 1 }), [hx - 0.07, 1.1, 0.09]);
      stuck.rotation.z = 0.5;
    } else if (a.threshold === 'parcel') {
      const x = leftX + 0.05, z = 0.2, w = 0.3, h = 0.2, d = 0.24;
      const box = s.box([w, h, d], [x, h / 2, z], s.material('#b58a5a', { roughness: 0.95 }));
      box.rotation.y = (random() - 0.5) * 0.5;
      const str = s.material('#e9e3d0');
      const b1 = s.box([w + 0.004, h + 0.004, 0.006], [x, h / 2, z], str); b1.rotation.y = box.rotation.y;
      const b2 = s.box([0.006, h + 0.004, d + 0.004], [x, h / 2, z], str); b2.rotation.y = box.rotation.y;
      const lab = s.label(pick(['m. ' + flat, 'KRUCHE', 'POCZTA']), 0.12, 0.07, [x + 0.06, h + 0.003, z + 0.04], '#222', '#f4f0df');
      lab.rotation.set(-Math.PI / 2, 0, box.rotation.y);
    }

    return s.finish();
  },
});
