import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

const STENCILS = {
  ward: 'WARD 7',
  ae: 'A & E',
  outpatients: 'OUTPATIENTS',
  porters: 'PORTERS',
  stjude: 'ST JUDE\'S',
  property: 'DO NOT REMOVE',
  xray: 'X-RAY',
} as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    kind: choice('What kind of wheelchair is it?', {
      selfpropel: 'A standard folding chair with big spoked rear wheels and push rims.',
      transport: 'An attendant-pushed transit chair on four small wheels, light and a little flimsy.',
      porter: 'A heavy hospital porter\'s chair with a padded seat, a drip pole and an oxygen cylinder at the back.',
    }),
    story: choice('What state has it been left in?', {
      ready: 'Parked square with footplates down and brakes on, waiting for the next person.',
      justleft: 'Just vacated: footplates flipped up, turned askew, a slipper left on the floor.',
      folded: 'Folded shut into a narrow package, seat sling peaked up, leaning out of the way.',
      retired: 'Out of service: a flat tyre, a missing footplate and a tag tied to the handle.',
    }),
    seat: choice('What is on the seat?', {
      nothing: 'Nothing; the sling is bare and slightly sagged.',
      blanket: 'A cellular hospital blanket, folded square, or thrown back if someone just got up.',
      holdall: 'A small overnight bag packed for going home.',
      notes: 'A clipboard of notes and a brown X-ray envelope.',
      cushion: 'A pressure cushion still dented with the shape of a sitter.',
      gown: 'A folded patterned hospital gown and a pair of foam slippers.',
    }),
    sling: choice('What colour is the upholstery?', {
      black: 'Black vinyl gone grey at the edges.',
      navy: 'Navy nylon.',
      green: 'Hospital green.',
      burgundy: 'Burgundy leatherette.',
      tartan: 'A red tartan nylon from a mobility shop.',
    }),
    stencil: choice('What is stencilled across the backrest?', {
      ward: 'WARD 7',
      ae: 'A & E',
      outpatients: 'OUTPATIENTS',
      porters: 'PORTERS',
      stjude: 'The hospital name, ST JUDE\'S.',
      property: 'DO NOT REMOVE',
      xray: 'X-RAY',
    }),
    frame: choice('What is the frame finished in?', {
      chrome: 'Chromed steel tube.',
      blue: 'Hammered blue paint.',
      grey: 'Dull grey aluminium.',
      red: 'Cheerful red enamel.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const folded = a.story === 'folded', porter = a.kind === 'porter', big = a.kind === 'selfpropel';
    const canFold = folded && !porter;
    const w = canFold ? 0.085 : porter ? 0.25 : 0.225;
    const tube = { chrome: s.material('#d6dbdd', { metalness: 0.9, roughness: 0.22 }), blue: s.material('#2f5f9c', { metalness: 0.3, roughness: 0.45 }), grey: s.material('#9aa0a2', { metalness: 0.5, roughness: 0.5 }), red: s.material('#c2372c', { metalness: 0.2, roughness: 0.4 }) }[a.frame];
    const rubber = s.material('#2a2c2e', { roughness: 0.8 });
    const tyre = s.material('#6f7477', { roughness: 0.85 });
    const steel = s.material('#b8bec0', { metalness: 0.7, roughness: 0.3 });
    const slingHex = { black: '#2a2c30', navy: '#283a66', green: '#3f8a72', burgundy: '#6e2836', tartan: '#a52a2a' }[a.sling];
    const fabricMap = a.sling === 'tartan' ? paint(64, 64, (ctx) => {
      ctx.fillStyle = '#a52a2a'; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = 'rgba(20,40,30,0.55)'; ctx.fillRect(0, 20, 64, 14); ctx.fillRect(20, 0, 14, 64);
      ctx.fillStyle = 'rgba(240,220,120,0.8)'; ctx.fillRect(0, 50, 64, 2); ctx.fillRect(50, 0, 2, 64);
    }) : null;
    if (fabricMap) { fabricMap.wrapS = fabricMap.wrapT = THREE.RepeatWrapping; fabricMap.repeat.set(3, 3); }
    const fabric = new THREE.MeshStandardMaterial({ color: fabricMap ? '#ffffff' : new THREE.Color(slingHex).lerp(new THREE.Color('#8b8275'), mood.wear * 0.25), map: fabricMap, roughness: 0.7, side: THREE.DoubleSide });
    const R = 0.012;
    const rearR = big ? 0.3 : 0.1, rearZ = big ? -0.17 : -0.24;
    const seatY = 0.5;

    const chair = new THREE.Group();
    s.root.add(chair);
    const put = <T extends THREE.Object3D>(node: T) => { chair.add(node); return node; };
    const rod = (from: P3, to: P3, r = R, m: THREE.Material = tube) => put(s.rod(from, to, r, m));
    const path = (pts: P3[], r = R, m: THREE.Material = tube) => put(s.tube(pts, r, m));

    const flat = a.story === 'retired' ? (random() < 0.5 ? -1 : 1) : 0;
    const missingPlate = a.story === 'retired' ? (random() < 0.5 ? -1 : 1) : 0;

    for (const side of [-1, 1]) {
      const x = side * w;
      // Rear upright bending back into a push handle.
      if (!porter) {
        path([[x, big ? 0.3 : 0.11, rearZ + (big ? -0.03 : 0.0)], [x, 0.5, -0.215], [x, 0.9, -0.265], [x, 0.94, -0.3], [x, 0.94, -0.39]]);
        put(s.cylinder(0.018, 0.018, 0.11, [x, 0.94, -0.38], rubber, 10)).rotation.x = Math.PI / 2;
      } else {
        path([[x, 0.11, rearZ], [x, 0.5, -0.215], [x, 1.0, -0.27]]);
      }
      // Seat rail, front upright, lower rail.
      rod([x, seatY, -0.22], [x, seatY, 0.21]);
      path([[x, seatY, 0.21], [x, 0.46, 0.245], [x, 0.2, 0.26]]);
      rod([x, big ? 0.3 : 0.22, rearZ + 0.02], [x, 0.24, 0.255]);
      // Armrest loop with pad and a side guard.
      path([[x, seatY, 0.16], [x, 0.7, 0.15], [x, 0.72, 0.12], [x, 0.72, -0.22]]);
      put(s.mesh(new RoundedBoxGeometry(0.05, 0.03, 0.26, 2, 0.012), rubber, [x, 0.74, -0.04]));
      put(s.box([0.006, 0.17, 0.3], [x + side * 0.012, 0.6, -0.04], porter ? fabric : s.material('#d7dbdc', { roughness: 0.4 })));
      // Rear wheel.
      const wx = x + side * (big ? 0.055 : 0.035);
      const wheel = new THREE.Group();
      wheel.position.set(wx, rearR, rearZ);
      chair.add(wheel);
      const squash = flat === side ? 0.82 : 1;
      const ring = (radius: number, thick: number, m: THREE.Material, dx = 0) => {
        const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, thick, 8, 40), m);
        mesh.rotation.y = Math.PI / 2;
        mesh.position.x = dx;
        mesh.castShadow = mesh.receiveShadow = true;
        wheel.add(mesh);
        return mesh;
      };
      if (big) {
        ring(rearR - 0.017, 0.017, tyre);
        ring(rearR - 0.038, 0.008, steel);
        ring(rearR - 0.06, 0.007, steel, side * 0.035);
        const spokes = 12, turn = random() * 6;
        for (let i = 0; i < spokes; i++) {
          const angle = (i / spokes) * Math.PI * 2 + turn;
          const spoke = s.rod([0, 0, 0], [0, Math.cos(angle) * (rearR - 0.04), Math.sin(angle) * (rearR - 0.04)], 0.0025, steel);
          wheel.add(spoke);
        }
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 + turn;
          wheel.add(s.rod([0, Math.cos(angle) * (rearR - 0.04), Math.sin(angle) * (rearR - 0.04)], [side * 0.035, Math.cos(angle) * (rearR - 0.06), Math.sin(angle) * (rearR - 0.06)], 0.004, steel));
        }
      } else {
        const solid = new THREE.Mesh(new THREE.CylinderGeometry(rearR, rearR, 0.035, 24), tyre);
        solid.rotation.z = Math.PI / 2;
        solid.castShadow = true;
        wheel.add(solid);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(rearR * 0.62, rearR * 0.62, 0.04, 20), s.material('#dcdfe0', { roughness: 0.4 }));
        cap.rotation.z = Math.PI / 2;
        wheel.add(cap);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.07, 12), steel);
      hub.rotation.z = Math.PI / 2;
      wheel.add(hub);
      wheel.scale.y = squash;
      wheel.position.y = rearR * squash;
      rod([x, rearR, rearZ], [wx, rearR, rearZ], 0.01, steel);
      // Brake lever.
      rod([x, seatY - 0.06, 0.06], [x + side * 0.03, seatY + 0.07, 0.11], 0.007, steel);
      put(s.ball([0.014, 0.014, 0.014], [x + side * 0.03, seatY + 0.08, 0.113], s.material('#c2372c'), 8));
      // Front caster.
      const swivel = (a.story === 'justleft' ? random() * 2 - 1 : (random() - 0.5) * 0.3);
      const cr = porter ? 0.09 : 0.065, cz = 0.275 + Math.cos(swivel) * -0.03, cxo = Math.sin(swivel) * 0.03;
      put(s.cylinder(0.012, 0.012, 0.06, [x, 0.19, 0.265], steel, 8));
      rod([x, 0.16, 0.265], [x + cxo, cr, cz + 0.0], 0.008, steel);
      const caster = put(s.cylinder(cr, cr, 0.028, [x + cxo, cr, cz], tyre, 18));
      caster.rotation.set(0, swivel, Math.PI / 2, 'YXZ');
      // Swing-away footrest.
      if (missingPlate !== side) {
        const up = a.story === 'justleft' || folded;
        const fx = side * Math.min(w, 0.13) * (canFold ? 0.9 : 1);
        path([[x, 0.47, 0.245], [x, 0.4, 0.33], [fx + side * 0.07, 0.13, 0.5]], 0.01);
        const plate = put(s.mesh(new RoundedBoxGeometry(0.15, 0.014, 0.13, 2, 0.006), rubber, [fx, 0.115, 0.52]));
        if (up) { plate.rotation.z = side * 1.45; plate.position.set(fx + side * 0.07, 0.19, 0.52); }
        if (!up) put(s.box([0.13, 0.03, 0.01], [fx, 0.13, 0.455], rubber));
      } else {
        path([[x, 0.47, 0.245], [x, 0.43, 0.29]], 0.01);
      }
    }

    // Cross brace under the seat, or the porter chair's fixed stretchers.
    if (!porter) {
      rod([-w, 0.25, 0.02], [w, seatY - 0.02, 0.02], 0.011);
      rod([w, 0.25, -0.02], [-w, seatY - 0.02, -0.02], 0.011);
      put(s.cylinder(0.014, 0.014, 0.06, [0, 0.365, 0], steel, 8)).rotation.x = Math.PI / 2;
    } else {
      rod([-w, 0.24, 0.24], [w, 0.24, 0.24]);
      rod([-w, 0.2, -0.2], [w, 0.2, -0.2]);
      rod([-w, 1.0, -0.27], [w, 1.0, -0.27], 0.014);
      put(s.cylinder(0.02, 0.02, 0.36, [0, 1.0, -0.27], rubber, 10)).rotation.z = Math.PI / 2;
    }

    // Seat and back.
    const sag = mix(0.02, 0.055, mood.wear);
    if (porter) {
      put(s.mesh(new RoundedBoxGeometry(w * 2 - 0.02, 0.07, 0.44, 3, 0.025), fabric, [0, seatY + 0.035, 0]));
      const pad = put(s.mesh(new RoundedBoxGeometry(w * 2 - 0.02, 0.46, 0.05, 3, 0.02), fabric, [0, 0.8, -0.225]));
      pad.rotation.x = -0.1;
    } else {
      const seatGeo = new THREE.PlaneGeometry(w * 2, 0.42, 12, 1);
      const pos = seatGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const t = pos.getX(i) / w;
        pos.setZ(i, canFold ? (1 - Math.abs(t)) * 0.2 : -(1 - t * t) * sag);
      }
      seatGeo.computeVertexNormals();
      const seat = put(s.mesh(seatGeo, fabric, [0, seatY + 0.012, 0]));
      seat.rotation.x = -Math.PI / 2;
      const backGeo = new THREE.PlaneGeometry(w * 2, 0.36, 12, 1);
      const bp = backGeo.attributes.position;
      for (let i = 0; i < bp.count; i++) {
        const t = bp.getX(i) / w;
        bp.setZ(i, canFold ? (1 - Math.abs(t)) * 0.18 : -(1 - t * t) * sag * 0.7);
      }
      backGeo.computeVertexNormals();
      const back = put(s.mesh(backGeo, fabric, [0, 0.72, -0.24]));
      back.rotation.x = -0.12;
    }
    // Stencil on both faces of the backrest, reading correctly from either side.
    if (!canFold) {
      const text = STENCILS[a.stencil];
      const fade = 1 - mood.wear * 0.55;
      const stencilMap = paint(256, 96, (ctx) => {
        ctx.clearRect(0, 0, 256, 96);
        const lines = text.length > 8 && text.includes(' ') ? [text.slice(0, text.lastIndexOf(' ')), text.slice(text.lastIndexOf(' ') + 1)] : [text];
        if (a.sling === 'tartan') { ctx.fillStyle = `rgba(30,24,22,${0.85})`; ctx.fillRect(6, 6, 244, 84); }
        ctx.fillStyle = `rgba(245,242,225,${fade})`;
        const longest = Math.max(...lines.map((line) => line.length));
        ctx.font = `bold ${Math.min(lines.length > 1 ? 40 : 64, 380 / longest)}px monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        lines.forEach((line, index) => ctx.fillText(line, 128, lines.length > 1 ? 28 + index * 42 : 50, 240));
        // Stencil bridges and scuffs.
        ctx.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 6 + mood.wear * 40; i++) ctx.fillRect(random() * 256, random() * 96, 2 + random() * 5, 2 + random() * 3);
        for (let x = 20; x < 256; x += 31) ctx.fillRect(x, 0, 2.5, 96);
      });
      const ink = new THREE.MeshStandardMaterial({ map: stencilMap, transparent: true, roughness: 0.8, depthWrite: false });
      const offset = porter ? 0.032 : 0.012;
      const frontMark = put(s.mesh(new THREE.PlaneGeometry(w * 1.8, 0.2), ink, [0, porter ? 0.82 : 0.73, (porter ? -0.225 : -0.24) + offset]));
      frontMark.rotation.x = porter ? -0.1 : -0.12;
      frontMark.castShadow = false;
      const rearMark = put(s.mesh(new THREE.PlaneGeometry(w * 1.8, 0.2), ink, [0, porter ? 0.82 : 0.73, (porter ? -0.225 : -0.24) - offset - 0.004]));
      rearMark.rotation.set(0.12, Math.PI, 0);
      rearMark.castShadow = false;
    }

    // Porter's extras: drip pole and oxygen cylinder.
    if (porter) {
      rod([w, 0.5, -0.24], [w, 1.75, -0.24], 0.009, steel);
      for (const dir of [-1, 1]) path([[w, 1.74, -0.24], [w + dir * 0.06, 1.77, -0.24], [w + dir * 0.1, 1.72, -0.24], [w + dir * 0.08, 1.69, -0.24]], 0.005, steel);
      const o2 = s.material('#f2f2ee', { roughness: 0.35 });
      put(s.cylinder(0.055, 0.055, 0.5, [-0.08, 0.5, -0.33], a.frame === 'red' ? o2 : s.material('#2f7f55', { roughness: 0.35 }), 16));
      put(s.ball([0.055, 0.04, 0.055], [-0.08, 0.75, -0.33], o2, 14));
      put(s.cylinder(0.018, 0.018, 0.07, [-0.08, 0.81, -0.33], steel, 10));
      put(s.cylinder(0.03, 0.03, 0.02, [-0.08, 0.83, -0.3], s.material('#1d1f21'), 12)).rotation.x = Math.PI / 2;
      put(s.ring(0.062, 0.006, [-0.08, 0.45, -0.33], steel)).rotation.x = Math.PI / 2;
      put(s.ring(0.062, 0.006, [-0.08, 0.3, -0.33], steel)).rotation.x = Math.PI / 2;
      put(s.box([0.14, 0.012, 0.14], [-0.08, 0.245, -0.33], steel));
    }

    // ---- What is on the seat ---------------------------------------------------------------
    const top = porter ? seatY + 0.07 : seatY - sag + 0.015;
    const soft = (hex: THREE.ColorRepresentation) => s.material(hex, { roughness: 0.97 });
    const seatW = Math.min(w * 2 - 0.06, 0.4);
    if (!canFold) {
      if (a.seat === 'blanket') {
        const wool = soft(new THREE.Color('#8fb0cf').lerp(new THREE.Color('#e3c79a'), mood.warmth * 0.7));
        if (a.story === 'justleft') {
          put(s.mesh(new RoundedBoxGeometry(seatW * 0.8, 0.06, 0.3, 3, 0.025), wool, [0.05, top + 0.03, -0.03])).rotation.set(0.05, 0.3, 0.06);
          put(s.mesh(new RoundedBoxGeometry(0.1, 0.07, 0.34, 3, 0.03), wool, [w + 0.0, 0.78, 0.0])).rotation.y = 0.08;
          put(s.mesh(new RoundedBoxGeometry(0.06, 0.62, 0.3, 3, 0.025), wool, [w + 0.085, 0.46, 0.03])).rotation.set(0, 0.1, 0.07);
          put(s.mesh(new RoundedBoxGeometry(0.3, 0.05, 0.3, 3, 0.02), wool, [w + 0.2, 0.03, 0.08])).rotation.y = 0.4 + random();
        } else {
          for (let i = 0; i < 3; i++) put(s.mesh(new RoundedBoxGeometry(seatW * 0.86, 0.035, 0.3, 3, 0.015), wool, [(random() - 0.5) * 0.01, top + 0.018 + i * 0.036, (random() - 0.5) * 0.015])).rotation.y = (random() - 0.5) * 0.06;
          put(s.box([seatW * 0.86 + 0.002, 0.11, 0.012], [0, top + 0.055, 0.1], soft('#f0eee6')));
        }
      } else if (a.seat === 'holdall') {
        const canvasCloth = s.material(['#385a7a', '#6a3d2a', '#3f4a3a', '#7a2f4a'][Math.floor(random() * 4)], { roughness: 0.8 });
        const bag = put(s.mesh(new RoundedBoxGeometry(seatW * 0.95, 0.22, 0.24, 4, 0.08), canvasCloth, [0, top + 0.11, -0.02]));
        bag.rotation.y = (random() - 0.5) * 0.3;
        for (const dz of [-0.05, 0.05]) put(s.mesh(new THREE.TorusGeometry(0.09, 0.009, 6, 18, Math.PI), s.material('#22262a'), [0, top + 0.2, -0.02 + dz])).rotation.x = dz * 6;
        put(s.box([seatW * 0.7, 0.006, 0.012], [0, top + 0.222, -0.02], s.material('#d2c36a', { metalness: 0.6 })));
        put(s.box([0.07, 0.045, 0.004], [seatW * 0.3, top + 0.1, 0.105], s.material('#f6f3e6')));
      } else if (a.seat === 'notes') {
        const board = put(s.box([0.24, 0.012, 0.33], [-0.03, top + 0.02, 0], s.material('#7a5a3a', { roughness: 0.6 })));
        board.rotation.set(0.04, 0.25 + (random() - 0.5) * 0.4, 0);
        const sheet = put(s.mesh(new THREE.PlaneGeometry(0.21, 0.29), new THREE.MeshStandardMaterial({ roughness: 0.9, map: paint(128, 176, (ctx) => {
          ctx.fillStyle = '#fbfaf2'; ctx.fillRect(0, 0, 128, 176);
          ctx.fillStyle = '#2a62a8'; ctx.fillRect(8, 10, 70, 8);
          ctx.fillStyle = '#555';
          for (let line = 0; line < 16; line++) ctx.fillRect(8, 30 + line * 9, 50 + random() * 62, 3);
          ctx.strokeStyle = '#c2372c'; ctx.lineWidth = 2; ctx.beginPath();
          for (let x = 8; x < 120; x += 8) ctx.lineTo(x, 150 + (random() - 0.5) * 22);
          ctx.stroke();
        }) }), [-0.03, top + 0.03, 0]));
        sheet.rotation.set(-Math.PI / 2 + 0.04, 0, board.rotation.y);
        put(s.box([0.1, 0.02, 0.03], [-0.03 - Math.sin(board.rotation.y) * 0.14, top + 0.036, -Math.cos(board.rotation.y) * 0.14], steel)).rotation.y = board.rotation.y;
        const envelope = put(s.box([0.36, 0.008, 0.43], [0.02, top + 0.2, -0.2], s.material('#b98d55', { roughness: 0.85 })));
        envelope.rotation.set(Math.PI / 2 - 0.2, 0, 0.06);
      } else if (a.seat === 'cushion') {
        put(s.mesh(new RoundedBoxGeometry(seatW, 0.075, 0.38, 4, 0.03), s.material('#31343a', { roughness: 0.6 }), [0, top + 0.038, 0]));
        for (const dx of [-0.085, 0.085]) {
          const dent = put(s.ball([0.075, 0.012, 0.13], [dx, top + 0.073, 0.02], s.material('#1c1e22', { roughness: 0.75 }), 14));
          dent.castShadow = false;
        }
        put(s.box([0.06, 0.03, 0.003], [seatW * 0.3, top + 0.04, 0.192], s.material('#e9e4d0')));
      } else if (a.seat === 'gown') {
        const gownMap = paint(64, 64, (ctx) => {
          ctx.fillStyle = '#e9eff2'; ctx.fillRect(0, 0, 64, 64);
          ctx.fillStyle = mood.cheer > 0.5 ? '#5fa6c9' : '#7f97a8';
          for (let i = 0; i < 16; i++) ctx.fillRect((i % 4) * 16 + ((i >> 2) % 2) * 8 + 3, (i >> 2) * 16 + 4, 5, 5);
        });
        const gown = new THREE.MeshStandardMaterial({ map: gownMap, roughness: 0.95 });
        for (let i = 0; i < 2; i++) put(s.mesh(new RoundedBoxGeometry(seatW * 0.8, 0.03, 0.26, 2, 0.012), gown, [0, top + 0.016 + i * 0.031, -0.03])).rotation.y = (random() - 0.5) * 0.1;
        put(s.tube([[-0.06, top + 0.08, -0.03], [0.04, top + 0.085, 0.0], [0.1, top + 0.08, 0.08], [0.16, top + 0.02, 0.15]], 0.005, soft('#f3f3ee')));
        const foam = soft(mood.cheer > 0.5 ? '#f0c44a' : '#b9c4c8');
        for (const side of [-1, 1]) {
          const slipper = put(s.mesh(new RoundedBoxGeometry(0.085, 0.03, 0.22, 3, 0.014), foam, [side * 0.055, top + 0.095, 0.0]));
          slipper.rotation.y = side * 0.1 + 0.3;
          put(s.mesh(new RoundedBoxGeometry(0.09, 0.04, 0.09, 3, 0.018), foam, [side * 0.055 + 0.02, top + 0.115, 0.06])).rotation.y = slipper.rotation.y;
        }
      }
    }

    // ---- Story dressing --------------------------------------------------------------------
    if (a.story === 'justleft') {
      chair.rotation.y = (random() < 0.5 ? -1 : 1) * (0.25 + random() * 0.35);
      const foam = s.material(mood.cheer > 0.5 ? '#f0c44a' : '#c9d2d4', { roughness: 0.97 });
      const sx = (random() - 0.5) * 0.3, sz = 0.72 + random() * 0.12, turn = random() * 6;
      s.mesh(new RoundedBoxGeometry(0.085, 0.03, 0.22, 3, 0.014), foam, [sx, 0.016, sz]).rotation.y = turn;
      s.mesh(new RoundedBoxGeometry(0.09, 0.045, 0.09, 3, 0.02), foam, [sx + Math.sin(turn) * 0.06, 0.036, sz + Math.cos(turn) * 0.06]).rotation.y = turn;
      // A cut wristband on the floor.
      s.ring(0.03, 0.004, [sx + 0.2, 0.006, sz - 0.12], s.material('#f6f5ef'), Math.PI * 1.6).rotation.x = Math.PI / 2;
    } else if (a.story === 'retired') {
      chair.rotation.z = flat * -0.045;
      const [hx, hz] = [-flat * w, -0.36];
      s.tube([[hx, 0.94, hz], [hx + 0.01, 0.86, hz + 0.01], [hx + 0.03, 0.8, hz + 0.02]], 0.003, s.material('#b9a37a'));
      const tag = s.label('OUT OF SERVICE', 0.19, 0.1, [hx + 0.04, 0.74, hz + 0.03], '#b3201a', '#f4e9b8');
      tag.rotation.set(0.1, (random() - 0.5) * 0.8, 0.15);
      // Cobweb-grey dust on the seat rails comes from mood.wear via the materials.
    } else if (folded) {
      chair.rotation.y = (random() - 0.5) * 0.5;
      chair.rotation.z = canFold ? (random() - 0.5) * 0.06 : 0;
    } else {
      chair.rotation.y = (random() - 0.5) * 0.12;
    }

    return s.finish();
  },
});
