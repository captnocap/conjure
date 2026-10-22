import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const KINDS = {
  trailer: { length: 5.8, depth: 2.4, height: 2.4, floor: 0.6, wall: '#e9e6dc' },
  cabin: { length: 4.8, depth: 2.8, height: 2.2, floor: 0.38, wall: '#b08a5c' },
  modular: { length: 6.0, depth: 2.6, height: 2.5, floor: 0.45, wall: '#d9cdb0' },
  container: { length: 6.06, depth: 2.44, height: 2.59, floor: 0.14, wall: '' },
} as const;
const TRIM = { red: '#b8281f', blue: '#234a96', green: '#1f6b47', yellow: '#e2b21c', brown: '#6a4a2e', teal: '#1f7f82' } as const;
const SIGNS = { sales: 'SALES', office: 'OFFICE', finance: 'WE FINANCE', credit: 'E-Z CREDIT', bhph: 'BUY HERE PAY HERE', cash: 'CA$H FOR CARS' } as const;

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
    kind: choice('What kind of portable building is it?', {
      trailer: 'A white aluminium site trailer on wheels and blocks, tow hitch still attached.',
      cabin: 'A wood-sided shed with a pitched roof, like a garden cabin pressed into service.',
      modular: 'A beige flat-roofed modular box with lattice skirting, rented by the month.',
      container: 'A converted shipping container with a door and window cut into it.',
    }),
    trim: choice('What is the trim colour?', {
      red: 'Barn red.', blue: 'Royal blue.', green: 'Bank green.', yellow: 'Taxi yellow.', brown: 'Brown.', teal: 'Teal.',
    }),
    sign: choice('What does the roof sign say?', {
      sales: 'SALES', office: 'OFFICE', finance: 'WE FINANCE', credit: 'E-Z CREDIT', bhph: 'BUY HERE PAY HERE', cash: 'CA$H FOR CARS',
    }),
    signStyle: choice('How is the roof sign made?', {
      board: 'Hand-painted plywood on two posts.',
      lightbox: 'A yellow backlit plastic box sign.',
      tiles: 'Individual letter tiles in alternating colours.',
      banner: 'A vinyl banner sagging between two poles.',
    }),
    state: choice('What is going on at the office?', {
      open: 'Open for business: door ajar, lights on, an OPEN sign in the window.',
      lunch: 'Lights on but the door shut, a BACK IN 5 MIN note taped to it.',
      late: 'After hours: dark except for a desk lamp left burning behind the blinds.',
      gone: 'Out of business: dark, a notice on the door, mail and newspapers piled on the step.',
    }),
    outside: choice('What sits outside by the ramp?', {
      chairs: 'Two plastic chairs and a coffee can of cigarette ends.',
      plants: 'Flower tubs somebody waters.',
      tyres: 'A stack of old tyres and a propane bottle.',
      none: 'Nothing.',
    }),
    bulbs: noul('Is a string of bare bulbs strung along the roof edge?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const kind = KINDS[a.kind];
    const { length, depth, height, floor } = kind;
    const trimColour = TRIM[a.trim];
    const wallColour = a.kind === 'container' ? trimColour : kind.wall;
    const lit = a.state === 'open' || a.state === 'lunch';
    const dim = 1 - Math.sin(mood.daylight * Math.PI);
    const glow = mix(0.5, 1.5, dim);
    const front = depth / 2;
    const wood = s.material('#a8845a', { roughness: 0.95 });
    const dark = s.material('#1c1d1f', { roughness: 0.9 });
    const steel = s.material('#9aa0a2', { metalness: 0.6, roughness: 0.45 });
    const trim = s.material(trimColour);

    // ---- walls ----------------------------------------------------------------
    const siding = paint(512, 256, (ctx) => {
      const base = new THREE.Color(wallColour).lerp(new THREE.Color('#8f8676'), mood.wear * 0.3);
      ctx.fillStyle = `#${base.getHexString()}`;
      ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 2;
      if (a.kind === 'trailer') for (let y = 12; y < 256; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
      else if (a.kind === 'modular') for (let x = 0; x < 512; x += 85) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
      else for (let x = 0; x < 512; x += a.kind === 'container' ? 14 : 22) {
        ctx.fillStyle = a.kind === 'container' ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.2)';
        ctx.fillRect(x, 0, a.kind === 'container' ? 6 : 2, 256);
      }
      if (a.kind === 'trailer') { ctx.fillStyle = trimColour; ctx.fillRect(0, 150, 512, 26); }
      // rust runs and grime
      for (let i = 0; i < mood.wear * 26; i++) {
        const x = random() * 512, len = 30 + random() * 120;
        const run = ctx.createLinearGradient(0, 0, 0, len);
        run.addColorStop(0, 'rgba(110,62,28,0.55)'); run.addColorStop(1, 'rgba(110,62,28,0)');
        ctx.fillStyle = run;
        ctx.save(); ctx.translate(x, random() * 60); ctx.fillRect(0, 0, 3 + random() * 6, len); ctx.restore();
      }
      const grime = ctx.createLinearGradient(0, 200, 0, 256);
      grime.addColorStop(0, 'rgba(70,60,45,0)'); grime.addColorStop(1, `rgba(70,60,45,${0.15 + mood.wear * 0.4})`);
      ctx.fillStyle = grime; ctx.fillRect(0, 200, 512, 56);
    });
    const wall = new THREE.MeshStandardMaterial({ map: siding, roughness: 0.8, metalness: a.kind === 'cabin' ? 0 : 0.15 });
    s.box([length, height, depth], [0, floor + height / 2, 0], wall);
    const roofY = floor + height;
    if (a.kind === 'cabin') {
      const gable = new THREE.Shape();
      gable.moveTo(-depth / 2 - 0.25, 0); gable.lineTo(depth / 2 + 0.25, 0); gable.lineTo(0, 0.85);
      const roof = s.mesh(new THREE.ExtrudeGeometry(gable, { depth: length + 0.4, bevelEnabled: false }).translate(0, 0, -(length + 0.4) / 2), s.material('#4b4a47', { roughness: 0.95 }), [0, roofY, 0]);
      roof.rotation.y = Math.PI / 2;
    } else {
      s.box([length + 0.12, 0.1, depth + 0.12], [0, roofY + 0.05, 0], a.kind === 'modular' ? trim : s.material(a.kind === 'container' ? trimColour : '#c9c6bb'));
      if (a.kind === 'modular') s.box([length + 0.16, 0.26, depth + 0.16], [0, roofY - 0.1, 0], trim);
    }

    // ---- what it stands on ----------------------------------------------------
    const block = s.material('#a9a79f', { roughness: 1 });
    if (a.kind === 'trailer') {
      for (const x of [-0.5, 0.45]) for (const z of [-1, 1]) {
        const wheel = s.cylinder(0.34, 0.34, 0.22, [x - 0.4, 0.34, z * (depth / 2 - 0.18)], dark, 18);
        wheel.rotation.x = Math.PI / 2;
      }
      s.box([length, 0.12, depth - 0.3], [0, floor - 0.06, 0], dark);
      s.rod([-length / 2, floor - 0.08, 0.5], [-length / 2 - 1.1, floor - 0.12, 0], 0.04, steel);
      s.rod([-length / 2, floor - 0.08, -0.5], [-length / 2 - 1.1, floor - 0.12, 0], 0.04, steel);
      s.rod([-length / 2 - 0.95, floor - 0.1, 0], [-length / 2 - 0.95, 0, 0], 0.03, steel);
      s.box([0.2, 0.04, 0.2], [-length / 2 - 0.95, 0.02, 0], steel);
      for (const x of [-length / 2 + 0.4, length / 2 - 0.4]) for (const z of [-1, 1]) for (let i = 0; i < 2; i++) s.box([0.4, (floor - 0.12) / 2 - 0.01, 0.2], [x, (floor - 0.12) * (i + 0.5) / 2, z * (depth / 2 - 0.25)], block);
    } else if (a.kind === 'modular') {
      const lattice = paint(128, 32, (ctx) => {
        ctx.fillStyle = '#efe9d8'; ctx.fillRect(0, 0, 128, 32);
        ctx.strokeStyle = '#6d6657'; ctx.lineWidth = 2;
        for (let x = -32; x < 160; x += 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 32, 32); ctx.moveTo(x + 32, 0); ctx.lineTo(x, 32); ctx.stroke(); }
      });
      lattice.wrapS = THREE.RepeatWrapping; lattice.repeat.x = 3;
      s.box([length - 0.04, floor, depth - 0.04], [0, floor / 2, 0], new THREE.MeshStandardMaterial({ map: lattice, roughness: 0.9 }));
    } else if (a.kind === 'cabin') {
      for (const z of [-1, 1]) s.box([length + 0.2, 0.16, 0.16], [0, 0.08, z * (depth / 2 - 0.3)], wood);
      for (const x of [-1.8, 0, 1.8]) for (const z of [-1, 1]) s.box([0.4, floor - 0.16, 0.2], [x, 0.16 + (floor - 0.16) / 2, z * (depth / 2 - 0.3)], block);
    } else {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.2, floor, 0.2], [x * (length / 2 - 0.1), floor / 2, z * (depth / 2 - 0.1)], steel);
      s.box([length - 0.3, floor - 0.02, depth - 0.3], [0, floor / 2, 0], dark);
    }

    // ---- door -----------------------------------------------------------------
    const doorX = -length / 2 + 1.25, doorW = 0.9, doorH = 2.0;
    s.box([doorW + 0.14, doorH + 0.08, 0.05], [doorX, floor + doorH / 2 + 0.03, front + 0.01], trim);
    const inside = new THREE.MeshStandardMaterial({ color: lit ? '#e8c98a' : '#15171a', emissive: lit ? '#ffd58a' : '#000000', emissiveIntensity: lit ? glow * 0.6 : 0, roughness: 0.9 });
    s.box([doorW, doorH, 0.03], [doorX, floor + doorH / 2, front + 0.03], inside);
    const door = new THREE.Group();
    door.position.set(doorX - doorW / 2, floor, front + 0.05);
    const leafMaterial = s.material(a.kind === 'cabin' ? trimColour : '#d8d4c7');
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.045), leafMaterial);
    leaf.position.set(doorW / 2, doorH / 2, 0);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.6, doorH * 0.32, 0.05), new THREE.MeshStandardMaterial({ color: lit ? '#f3d9a0' : '#2a3238', emissive: lit ? '#ffd58a' : '#000', emissiveIntensity: lit ? glow * 0.5 : 0, roughness: 0.2 }));
    pane.position.set(doorW / 2, doorH * 0.7, 0);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), steel);
    knob.position.set(doorW - 0.09, doorH * 0.48, 0.045);
    door.add(leaf, pane, knob);
    door.traverse((node) => { node.castShadow = true; });
    if (a.state === 'open') door.rotation.y = -mix(0.7, 1.5, random());
    s.root.add(door);
    const note = (text: string, ink: string, paper: string, w: number, h: number, y: number) => {
      const sheet = s.label(text, w, h, [0, 0, 0], ink, paper);
      sheet.removeFromParent();
      sheet.position.set(doorW / 2 + (random() - 0.5) * 0.1, y, 0.03);
      sheet.rotation.z = (random() - 0.5) * 0.2;
      door.add(sheet);
    };
    if (a.state === 'lunch') note('BACK IN 5 MIN', '#1b1b1b', '#fff6c9', 0.5, 0.22, doorH * 0.45);
    if (a.state === 'gone') {
      note('NOTICE', '#111111', '#ff7b2e', 0.44, 0.3, doorH * 0.42);
      note('CLOSED', '#ffffff', '#b8281f', 0.5, 0.2, doorH * 0.7);
      const hasp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.03), steel);
      hasp.position.set(doorW - 0.02, doorH * 0.55, 0.04);
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.035), s.material('#c9a227', { metalness: 0.7 }));
      lock.position.set(doorW + 0.02, doorH * 0.5, 0.05);
      door.add(hasp, lock);
    }

    // ---- window with the desk lamp behind the blinds --------------------------------
    const winW = 1.15, winH = 0.95, winX = doorX + 1.8, winY = floor + 1.42;
    const lampOn = a.state !== 'gone';
    const scene = paint(256, 208, (ctx) => {
      const room = ctx.createLinearGradient(0, 0, 0, 208);
      if (lit) { room.addColorStop(0, '#f7e2a8'); room.addColorStop(1, '#c99a55'); }
      else if (a.state === 'late') { room.addColorStop(0, '#16202b'); room.addColorStop(1, '#0d141b'); }
      else { room.addColorStop(0, '#252b30'); room.addColorStop(1, '#171b1f'); }
      ctx.fillStyle = room; ctx.fillRect(0, 0, 256, 208);
      if (a.state === 'gone' && mood.wear > 0.5) {
        ctx.fillStyle = '#9b7a4c'; ctx.fillRect(0, 0, 256, 208);
        ctx.strokeStyle = 'rgba(60,40,20,0.5)'; ctx.lineWidth = 2;
        for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(0, 20 + i * 23 + random() * 8); ctx.bezierCurveTo(80, random() * 208, 170, random() * 208, 256, 20 + i * 23); ctx.stroke(); }
        return;
      }
      // desk and lamp
      ctx.fillStyle = lit ? '#6a4525' : '#1f1711'; ctx.fillRect(0, 160, 256, 48);
      const lx = 92;
      if (lampOn) {
        const pool = ctx.createRadialGradient(lx, 150, 4, lx, 150, 120);
        pool.addColorStop(0, 'rgba(255,226,140,0.95)'); pool.addColorStop(1, 'rgba(255,226,140,0)');
        ctx.fillStyle = pool; ctx.fillRect(0, 40, 256, 168);
      }
      ctx.fillStyle = '#b08a2a'; ctx.fillRect(lx - 4, 112, 8, 50); ctx.fillRect(lx - 24, 158, 48, 8);
      ctx.fillStyle = lampOn ? '#2fa66a' : '#1d4a36';
      ctx.beginPath(); ctx.moveTo(lx - 46, 116); ctx.quadraticCurveTo(lx, 72, lx + 46, 116); ctx.closePath(); ctx.fill();
      if (lampOn) { ctx.fillStyle = '#fff6c4'; ctx.fillRect(lx - 40, 116, 80, 6); }
      ctx.fillStyle = lit ? '#f4efe2' : '#59564d';
      for (let i = 0; i < 4; i++) ctx.fillRect(160 + i * 3, 150 - i * 6, 58, 6);
      // blinds, half drawn
      const slats = a.state === 'gone' ? 13 : a.state === 'late' ? 9 : 4;
      for (let i = 0; i < slats; i++) {
        ctx.fillStyle = lit ? 'rgba(250,246,232,0.92)' : 'rgba(150,154,150,0.75)';
        const skew = a.state === 'gone' && i > 8 ? (random() - 0.5) * 22 : 0;
        ctx.save(); ctx.translate(128, 8 + i * 15); ctx.rotate(skew * 0.01); ctx.fillRect(-128, -4, 256, 8); ctx.restore();
      }
      if (a.state === 'open') {
        ctx.strokeStyle = '#ff2b3a'; ctx.lineWidth = 5; ctx.shadowColor = '#ff2b3a'; ctx.shadowBlur = 12;
        ctx.strokeRect(150, 70, 96, 50);
        ctx.font = 'bold 34px sans-serif'; ctx.fillStyle = '#ff2b3a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('OPEN', 198, 97);
        ctx.shadowBlur = 0;
      }
    });
    s.box([winW + 0.14, winH + 0.14, 0.06], [winX, winY, front + 0.01], trim);
    s.mesh(new THREE.PlaneGeometry(winW, winH), new THREE.MeshStandardMaterial({ map: scene, emissiveMap: scene, emissive: '#ffffff', emissiveIntensity: lit ? glow : lampOn ? glow * 0.9 : 0.05, roughness: 0.25 }), [winX, winY, front + 0.045]);
    s.box([0.03, winH, 0.02], [winX, winY, front + 0.05], trim);

    // ---- window air conditioner --------------------------------------------------
    const acX = length / 2 - 0.62, acY = floor + 1.75;
    s.box([0.66, 0.44, 0.5], [acX, acY, front + 0.2], s.material('#cfcabb', { metalness: 0.2 }));
    for (let i = 0; i < 6; i++) s.box([0.56, 0.014, 0.012], [acX, acY - 0.15 + i * 0.06, front + 0.455], dark);
    s.rod([acX - 0.25, acY - 0.22, front + 0.42], [acX - 0.25, acY - 0.62, front + 0.02], 0.02, wood);
    s.rod([acX + 0.25, acY - 0.22, front + 0.42], [acX + 0.25, acY - 0.62, front + 0.02], 0.02, wood);
    if (a.state !== 'gone') {
      s.rod([acX + 0.2, acY - 0.22, front + 0.4], [acX + 0.2, acY - 0.5, front + 0.4], 0.006, s.material('#bfe3f2', { roughness: 0.1 }));
      s.cylinder(0.2, 0.2, 0.006, [acX + 0.2, 0.004, front + 0.4], s.material('#59626a', { roughness: 0.15 }), 16);
    }

    // ---- ramp and landing ------------------------------------------------------
    const landingZ = front + 0.62, landingW = 1.3, landingD = 1.14;
    const deck = s.material('#b18d60', { roughness: 0.95 });
    s.box([landingW, 0.07, landingD], [doorX, floor - 0.035, landingZ], deck);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.09, floor, 0.09], [doorX + x * (landingW / 2 - 0.06), floor / 2, landingZ + z * (landingD / 2 - 0.06)], wood);
    const rampLength = Math.max(0.9, Math.min(floor * 5.5, length / 2 - doorX - landingW / 2 + 0.5));
    const rampStart = doorX + landingW / 2;
    const angle = Math.atan2(floor, rampLength);
    const ramp = s.box([Math.hypot(rampLength, floor), 0.06, landingD], [rampStart + rampLength / 2, floor / 2 - 0.03, landingZ], deck);
    ramp.rotation.z = -angle;
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      s.box([0.03, 0.02, landingD * 0.96], [rampStart + rampLength * t, floor * (1 - t) + 0.015, landingZ], wood).rotation.z = -angle;
    }
    if (floor > 0.25) {
      const railZ = landingZ + landingD / 2 - 0.05;
      const posts = [[doorX - landingW / 2 + 0.05, floor], [rampStart, floor], [rampStart + rampLength / 2, floor / 2], [rampStart + rampLength - 0.05, 0]] as const;
      for (const [x, y] of posts) s.box([0.07, 0.95, 0.07], [x, y + 0.475, railZ], wood);
      s.rod([posts[0][0], floor + 0.95, railZ], [posts[1][0], floor + 0.95, railZ], 0.035, wood);
      s.rod([posts[1][0], floor + 0.95, railZ], [posts[3][0], 0.95, railZ], 0.035, wood);
      s.rod([posts[0][0], floor + 0.95, railZ], [posts[0][0], floor + 0.95, front + 0.05], 0.035, wood);
      s.box([0.07, 0.95, 0.07], [posts[0][0], floor + 0.475, front + 0.1], wood);
    }
    if (a.state === 'open') s.box([0.7, 0.02, 0.45], [doorX, floor + 0.012, landingZ - 0.1], s.material('#3c5a3a', { roughness: 1 }));
    if (a.state === 'gone') {
      const paper = ['#f3efe3', '#e6dcc0', '#d9c79a', '#f3efe3', '#c9d6e6'];
      const pile = 7 + Math.floor(random() * 6 + mood.density * 5);
      for (let i = 0; i < pile; i++) {
        const letter = s.box([0.24, 0.006, 0.12], [doorX + (random() - 0.5) * 0.7, floor + 0.01 + i * 0.006, front + 0.25 + random() * 0.6], s.material(paper[i % paper.length]));
        letter.rotation.y = random() * 3;
      }
      for (let i = 0; i < 3; i++) {
        const roll = s.cylinder(0.045, 0.045, 0.32, [doorX + (random() - 0.5) * 0.9, floor + 0.05, front + 0.4 + random() * 0.6], s.material(i ? '#e9e4d6' : '#7fb3d9'), 8);
        roll.rotation.set(0, random() * 3, Math.PI / 2);
      }
    }

    // ---- roof sign -------------------------------------------------------------
    const text = SIGNS[a.sign];
    const signW = Math.min(length * 0.72, 1.0 + text.length * 0.2), signH = 0.72;
    const signY = roofY + 0.35 + signH / 2, signZ = front - 0.12;
    const tilt = a.state === 'gone' ? (random() - 0.5) * 0.14 * (0.4 + mood.wear) : 0;
    const signGroup = new THREE.Group();
    signGroup.position.set(0, signY, signZ);
    signGroup.rotation.z = tilt;
    s.root.add(signGroup);
    const hang = (mesh: THREE.Object3D, x = 0, y = 0, z = 0) => { mesh.removeFromParent(); mesh.position.set(x, y, z); mesh.castShadow = true; signGroup.add(mesh); return mesh; };
    for (const x of [-1, 1]) s.box([0.08, 0.5 + signH, 0.08], [x * (signW / 2 - 0.2), roofY + (0.5 + signH) / 2, signZ - 0.07], a.signStyle === 'board' ? wood : steel);
    if (a.signStyle === 'board') {
      hang(s.box([signW, signH, 0.04], [0, 0, 0], s.material('#f1ead6')));
      hang(s.label(text, signW * 0.94, signH * 0.8, [0, 0, 0], trimColour, '#f1ead6'), 0, 0, 0.025);
    } else if (a.signStyle === 'lightbox') {
      hang(s.box([signW + 0.1, signH + 0.1, 0.2], [0, 0, 0], dark));
      const face = hang(s.label(text, signW, signH, [0, 0, 0], '#161616', '#ffd83a'), 0, 0, 0.105) as THREE.Mesh;
      const faceMaterial = face.material as THREE.MeshStandardMaterial;
      if (a.state !== 'gone') { faceMaterial.emissive = new THREE.Color('#ffffff'); faceMaterial.emissiveMap = faceMaterial.map; faceMaterial.emissiveIntensity = glow * 0.85; }
    } else if (a.signStyle === 'tiles') {
      const letters = text.split('');
      const tile = Math.min(0.52, (length * 0.9) / letters.length);
      const missing = a.state === 'gone' ? Math.floor(random() * letters.length) : -1;
      letters.forEach((letter, index) => {
        if (letter === ' ' || index === missing) return;
        const x = (index - (letters.length - 1) / 2) * tile;
        const colourful = index % 2 ? '#f1ead6' : trimColour;
        const face = hang(s.label(letter, tile * 0.92, tile * 1.15, [0, 0, 0], index % 2 ? trimColour : '#f1ead6', colourful), x, (random() - 0.5) * 0.03, 0.02);
        face.rotation.z = (random() - 0.5) * 0.06;
      });
      hang(s.box([Math.min(length * 0.9, letters.length * tile), 0.06, 0.05], [0, 0, 0], steel), 0, -tile * 0.6, 0);
    } else {
      const sag = hang(s.label(text, signW, signH * 0.85, [0, 0, 0], '#ffffff', trimColour), 0, -0.05, 0.02);
      sag.rotation.x = 0.08;
      for (const x of [-1, 1]) hang(s.rod([0, 0, 0], [0, 0.22, -0.02], 0.006, dark), x * signW / 2, signH * 0.42 - 0.16, 0.02);
    }

    // ---- bulbs -----------------------------------------------------------------
    if (a.bulbs) {
      const points: { at: [number, number, number]; size: number }[] = [];
      const count = Math.round(length / 0.32);
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        if (a.state === 'gone' && random() < 0.3) continue;
        points.push({ at: [-length / 2 + t * length, roofY - 0.08 - Math.sin((t * 4 % 1) * Math.PI) * 0.1, front + 0.1], size: 0.055 });
      }
      const on = a.state !== 'gone';
      s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: on ? '#fff0b8' : '#8d8a7c', emissive: on ? '#ffd76a' : '#000000', emissiveIntensity: on ? glow * 1.2 : 0, roughness: 0.3 }), points);
      s.rod([-length / 2, roofY - 0.05, front + 0.1], [length / 2, roofY - 0.05, front + 0.1], 0.008, dark);
    }

    // ---- outside ---------------------------------------------------------------
    const yardX = rampStart + rampLength + 0.5, yardZ = front + 0.75;
    if (a.outside === 'chairs') {
      const plastic = s.material(mood.cheer > 0.5 ? '#f3f1ea' : '#4f7a56');
      for (let i = 0; i < 2; i++) {
        const chair = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.44), plastic); seat.position.y = 0.42;
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.04), plastic); back.position.set(0, 0.68, -0.22); back.rotation.x = -0.15;
        chair.add(seat, back);
        for (const x of [-1, 1]) for (const z of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.04), plastic); leg.position.set(x * 0.2, 0.21, z * 0.19); chair.add(leg); }
        chair.traverse((node) => { node.castShadow = true; });
        chair.position.set(Math.min(length / 2 - 0.3, yardX - 0.2 + i * 0.75), 0, yardZ + 0.9 + (random() - 0.5) * 0.3);
        chair.rotation.y = (random() - 0.5) * 0.9;
        s.root.add(chair);
      }
      s.cylinder(0.08, 0.07, 0.17, [Math.min(length / 2 - 0.7, yardX + 0.15), 0.085, yardZ + 1.35], s.material('#b3382c', { metalness: 0.4 }), 12);
    } else if (a.outside === 'plants') {
      for (let i = 0; i < 3; i++) {
        const x = doorX - 0.9 - i * 0.05 + (i === 2 ? 2.2 + rampLength : 0), z = landingZ + (i === 1 ? 0.75 : 0.1) + (i === 2 ? 0.75 : 0);
        s.cylinder(0.24, 0.18, 0.3, [x, 0.15, z], s.material('#b5633c', { roughness: 1 }), 14);
        const blooms = ['#e3342f', '#ffcf1f', '#ff5fa8', '#f5f2ea'];
        for (let k = 0; k < 7; k++) s.ball([0.1, 0.1, 0.1], [x + (random() - 0.5) * 0.3, 0.36 + random() * 0.14, z + (random() - 0.5) * 0.3], s.material(k < 3 ? '#3e7a3a' : blooms[Math.floor(random() * 4)]), 8);
      }
    } else if (a.outside === 'tyres') {
      const tx = Math.min(length / 2 - 0.4, yardX + 0.3);
      const stack = 3 + Math.floor(random() * 3);
      for (let i = 0; i < stack; i++) {
        const tyre = s.ring(0.24, 0.1, [tx + (random() - 0.5) * 0.06, 0.1 + i * 0.2, yardZ + 0.9 + (random() - 0.5) * 0.06], dark);
        tyre.rotation.x = Math.PI / 2;
      }
      s.cylinder(0.15, 0.15, 0.42, [tx - 0.65, 0.21, yardZ + 1.0], s.material('#e9e6dc', { metalness: 0.3 }), 14);
      s.ball([0.15, 0.1, 0.15], [tx - 0.65, 0.42, yardZ + 1.0], s.material('#e9e6dc', { metalness: 0.3 }), 12);
      s.cylinder(0.05, 0.05, 0.08, [tx - 0.65, 0.53, yardZ + 1.0], steel, 8);
    }

    return s.finish({ footprint: length / 2 });
  },
});
