import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';

type P = [number, number, number];

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const NAMES = {
  mephistopheles: 'MEPHISTOPHELES, with a smaller line: ask me anything.',
  barb: 'BARB.',
  trainee: 'TRAINEE, in a plate too big for the word.',
  yourname: 'YOUR NAME HERE, never replaced.',
  dolores: 'DOLORES, in gold script.',
  intake: 'INTAKE OFFICER, no name.',
} as const;
const NAME_TEXT: Record<keyof typeof NAMES, string> = { mephistopheles: 'MEPHISTOPHELES', barb: 'BARB', trainee: 'TRAINEE', yourname: 'YOUR NAME HERE', dolores: 'Dolores', intake: 'INTAKE OFFICER' };

export default defineThing({
  questions: {
    stance: choice('What is the receptionist doing?', {
      bored: 'Filing their nails, head down, ignoring you.',
      sigh: 'Mid-sigh: head tipped back, both forearms flat on the desk.',
      pointing: 'Pointing you away, arm straight out, toward the ticket machine.',
      phone: 'On the phone, head tilted into the handset, hand up for silence.',
      stamping: 'Stamping a stack of forms one after another, DENIED, DENIED.',
    }),
    colouring: choice('What do they look like?', {
      red: 'Red skin, black horns, the classic.',
      grey: 'Grey-blue skin and black horns, a quieter sort of demon.',
      human: 'An ordinary person in every way except the small horns.',
      pale: 'Chalk-white skin and dark horns, as if they have never seen daylight.',
      gold: 'Human skin and small gold horns, management material.',
    }),
    name: choice('What does the nameplate say?', NAMES),
    item: choice('What sits on the desk?', {
      cactus: 'A small cactus in a terracotta pot.',
      sign: 'A standing TAKE A NUMBER sign.',
      both: 'The cactus and the sign.',
      neither: 'Neither: only the bell, the clipboard and the monitor.',
    }),
    rope: noul('Does a red velvet rope stand beside the desk?'),
    hair: choice('What is their hair like?', {
      short: 'Short hair.',
      long: 'Long hair.',
      bun: 'A tight bun.',
      none: 'No hair, the horns stand alone.',
      cap: 'A company cap.',
    }),
    laminate: choice('What is the desk finish?', {
      oak: 'Fake oak woodgrain laminate.',
      grey: 'Grey laminate with a black edge, a government office.',
      teal: 'Teal laminate from a 1980s refit.',
      black: 'Glossy black, trying to be a hotel.',
    }),
    front: choice('What does the sign on the front of the desk say?', {
      reception: 'RECEPTION.',
      intake: 'INTAKE.',
      complaints: 'COMPLAINTS.',
      refunds: 'NO REFUNDS.',
      final: 'ALL DECISIONS FINAL.',
      eternity: 'ETERNITY DESK.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const RAD = Math.PI / 180;
    const H = 1.6 + random() * 0.2;
    const k = H / 1.7;

    // ---- Desk ----
    const DW = 1.7, DH = 0.74, DD = 0.72;
    const deskZ = 0; // the front face of the desk
    const topMap = a.laminate === 'oak' ? paint(256, 256, (c, w, h) => {
      c.fillStyle = '#b8864f'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { c.strokeStyle = `rgba(${random() < 0.5 ? '90,55,25' : '220,180,120'},0.35)`; c.lineWidth = 1 + random() * 2.5; c.beginPath(); const y = random() * h; c.moveTo(0, y); c.bezierCurveTo(w / 3, y + 6, (2 * w) / 3, y - 6, w, y + 3); c.stroke(); }
    }) : null;
    if (topMap) { topMap.wrapS = topMap.wrapT = THREE.RepeatWrapping; topMap.repeat.set(3, 1); }
    const lamTint = { oak: '#b8864f', grey: '#b9b8b2', teal: '#3f8f8a', black: '#1c1c20' }[a.laminate];
    const laminate = topMap ? new THREE.MeshStandardMaterial({ map: topMap, roughness: 0.45 }) : s.material(lamTint, { roughness: a.laminate === 'black' ? 0.15 : 0.5 });
    const edge = s.material(a.laminate === 'black' ? '#3a3a40' : '#2a2a2e', { roughness: 0.6 });
    const panel = s.material(a.laminate === 'oak' ? '#a3763f' : a.laminate === 'grey' ? '#a9a8a2' : a.laminate === 'teal' ? '#2f6f6a' : '#141418', { roughness: 0.6 });
    s.box([DW, 0.04, DD], [0, DH - 0.02, deskZ - DD / 2], laminate);
    s.box([DW + 0.02, 0.012, DD + 0.02], [0, DH - 0.046, deskZ - DD / 2], edge);
    s.box([DW, DH - 0.14, 0.03], [0, (DH - 0.14) / 2 + 0.1, deskZ - 0.015], panel); // modesty panel
    for (const x of [-1, 1]) s.box([0.03, DH - 0.04, DD - 0.02], [x * (DW / 2 - 0.015), (DH - 0.04) / 2, deskZ - DD / 2], panel);
    s.box([DW - 0.06, 0.3, 0.4], [0, DH - 0.2, deskZ - DD + 0.2], panel); // drawers at the back
    const front = { reception: 'RECEPTION', intake: 'INTAKE', complaints: 'COMPLAINTS', refunds: 'NO REFUNDS', final: 'ALL DECISIONS FINAL', eternity: 'ETERNITY DESK' }[a.front];
    s.label(front, 0.9, 0.16, [0, DH - 0.3, deskZ + 0.002], a.laminate === 'black' ? '#e9dfc6' : '#f3eee0', a.laminate === 'black' ? '#2a2a30' : '#8c1c22');

    // ---- The figure, on an office chair behind the desk ----
    const skinOf = { red: '#c4322b', grey: '#8a9199', human: ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0'][Math.floor(random() * 4)], pale: '#e4e9ee', gold: ['#d9b08c', '#b5805a', '#7a4f33'][Math.floor(random() * 3)] }[a.colouring];
    const hornTint = { red: '#2a1a1a', grey: '#141416', human: '#d9c9a0', pale: '#3a3f55', gold: '#d9b23a' }[a.colouring];
    const blouse = ['#6b3fa0', '#2d5f9a', '#9a2d3e', '#f0e6d2', '#3a3a3e'][Math.floor(random() * 5)];
    const mirror = random() < 0.5;
    const person = figure(s, {
      height: H, style: 'doll', skin: skinOf, hair: a.hair, pose: 'sitting', gaze: 'down', mirror,
      top: blouse, bottom: '#2b2b33', shoes: '#1d1d1f', sleeves: random() < 0.5 ? 'long' : 'short',
      hairColor: a.colouring === 'red' ? '#1a0e0e' : ['#3b2a22', '#1d1a18', '#8a6a3a', '#c9c2b8'][Math.floor(random() * 4)],
    });
    const { joints } = person;
    const hand = mirror ? 'left' : 'right', other = mirror ? 'right' : 'left';
    const sign = (side: 'left' | 'right') => (side === 'left' ? 1 : -1);
    const set = (side: 'left' | 'right', armF: number, armOut: number, elbow: number, forearmIn: number) => {
      joints.shoulders[side].rotation.x = -armF * RAD;
      joints.shoulders[side].rotation.z = sign(side) * armOut * RAD;
      joints.elbows[side].rotation.x = -elbow * RAD;
      joints.elbows[side].rotation.y = sign(side) * forearmIn * RAD;
    };
    if (a.stance === 'bored') {
      set(hand, 55, 8, 105, 55); set(other, 45, 6, 110, 60);
      joints.neck.rotation.x = 0.5; joints.spine.rotation.x = 0.15;
    } else if (a.stance === 'sigh') {
      set(hand, 70, 6, 15, 10); set(other, 70, 6, 15, 10);
      joints.neck.rotation.x = -0.7; joints.spine.rotation.x = -0.12;
    } else if (a.stance === 'pointing') {
      set(hand, 80, 55, 5, 0); set(other, 40, 4, 90, 50);
      joints.neck.rotation.x = 0.05; joints.neck.rotation.y = -sign(hand) * 0.6;
    } else if (a.stance === 'phone') {
      set(hand, 25, 6, 150, 35); set(other, 90, 10, 60, 0);
      joints.neck.rotation.z = sign(hand) * 0.35; joints.neck.rotation.x = 0.1;
    } else {
      set(hand, 65, 4, 70, 30); set(other, 50, 6, 40, 20);
      joints.neck.rotation.x = 0.4; joints.spine.rotation.x = 0.1;
    }
    person.settle();
    s.root.add(person.root);
    const hips0 = person.pelvis.getWorldPosition(new THREE.Vector3());
    // Slide the figure so the hips sit behind the desk, with a bit of jitter along it.
    const seatX = (random() - 0.5) * 0.3, seatZ = deskZ - DD - 0.1;
    person.root.position.set(seatX - hips0.x, 0, seatZ - hips0.z);
    person.root.updateMatrixWorld(true);
    const hips = person.pelvis.getWorldPosition(new THREE.Vector3());
    const headR = H * 0.064;

    // Horns and tail.
    const horn = s.material(hornTint, { roughness: 0.35, metalness: a.colouring === 'gold' ? 0.8 : 0.1 });
    for (const x of [-1, 1]) {
      const cone = s.mesh(new THREE.ConeGeometry(headR * 0.3, headR * 1.05, 10), horn, [x * headR * 0.6, headR * 1.15, headR * 0.05]);
      cone.rotation.z = -x * 0.5; cone.rotation.x = -0.15;
      person.head.add(cone);
    }
    const tailSide = mirror ? -1 : 1;
    const tail = s.tube([[0, -0.02 * k, -0.05 * k], [tailSide * 0.12 * k, -0.1 * k, -0.22 * k], [tailSide * 0.3 * k, 0.05 * k, -0.28 * k], [tailSide * 0.36 * k, 0.3 * k, -0.2 * k]], 0.018 * k, s.material(skinOf, { roughness: 0.5 }));
    person.pelvis.add(tail);
    const spade = s.mesh(new THREE.ConeGeometry(0.05 * k, 0.09 * k, 3), s.material(hornTint, { roughness: 0.4 }), [tailSide * 0.36 * k, 0.34 * k, -0.19 * k]);
    spade.rotation.z = -tailSide * 0.3;
    person.pelvis.add(spade);

    // The office chair under the hips.
    const seatY = Math.max(0.25, person.hipHeight - 0.085 * k);
    const chairMat = s.material('#2a2a2e', { roughness: 0.7 });
    const chrome = s.material('#b9bdc0', { metalness: 0.85, roughness: 0.3 });
    s.cylinder(0.24, 0.22, 0.06, [hips.x, seatY - 0.03, hips.z + 0.04], chairMat, 24);
    const back = s.box([0.42, 0.4, 0.05], [hips.x, seatY + 0.26, hips.z - 0.2], chairMat); back.rotation.x = -0.12;
    s.cylinder(0.03, 0.03, seatY - 0.14, [hips.x, (seatY - 0.06) / 2 + 0.04, hips.z + 0.04], chrome, 12);
    for (let i = 0; i < 5; i++) { const t = (i / 5) * Math.PI * 2; s.rod([hips.x, 0.06, hips.z + 0.04], [hips.x + Math.cos(t) * 0.28, 0.03, hips.z + 0.04 + Math.sin(t) * 0.28], 0.014, chairMat); s.ball([0.025, 0.025, 0.025], [hips.x + Math.cos(t) * 0.28, 0.025, hips.z + 0.04 + Math.sin(t) * 0.28], chairMat, 8); }

    // Props in the hands.
    const palm = person.hands[hand];
    let stamp: THREE.Object3D | null = null;
    if (a.stance === 'bored') {
      const file = s.box([0.015 * k, 0.12 * k, 0.003 * k], [0, -0.02 * k, 0.01 * k], s.material('#c9b7a0'));
      file.rotation.x = 1.2;
      palm.add(file);
    } else if (a.stance === 'phone') {
      const handset = new THREE.Group();
      handset.add(s.box([0.04 * k, 0.2 * k, 0.03 * k], [0, 0, 0], s.material('#1d1d22', { roughness: 0.4 })));
      handset.add(s.box([0.045 * k, 0.05 * k, 0.045 * k], [0, 0.1 * k, 0.005 * k], s.material('#1d1d22')));
      handset.add(s.box([0.045 * k, 0.05 * k, 0.045 * k], [0, -0.1 * k, 0.005 * k], s.material('#1d1d22')));
      handset.position.set(0, -0.01 * k, 0.02 * k);
      handset.rotation.x = -0.3;
      palm.add(handset);
      // A cord to the phone on the desk.
      const cord = s.material('#1d1d22');
      s.box([0.2, 0.06, 0.16], [0.45, DH + 0.03, deskZ - DD + 0.3], s.material('#1d1d22', { roughness: 0.4 }));
      for (let i = 0; i < 9; i++) s.ring(0.012, 0.004, [0.46 + i * 0.03, DH + 0.1 + Math.sin(i) * 0.03, deskZ - DD + 0.32 + i * 0.03], cord);
    } else if (a.stance === 'stamping') {
      stamp = new THREE.Group();
      stamp.add(s.cylinder(0.012 * k, 0.014 * k, 0.07 * k, [0, -0.02 * k, 0.02 * k], s.material('#5a3a2a')));
      stamp.add(s.box([0.07 * k, 0.025 * k, 0.045 * k], [0, -0.065 * k, 0.025 * k], s.material('#1d1d22')));
      palm.add(stamp);
      const papers = s.material('#f3efe4', { roughness: 0.95 });
      const px = hips.x + tailSide * 0.0 + 0.1, pz = deskZ - 0.3;
      for (let i = 0; i < 14; i++) s.box([0.22, 0.003, 0.3], [px + (random() - 0.5) * 0.02, DH + 0.002 + i * 0.003, pz + (random() - 0.5) * 0.02], papers).rotation.y = (random() - 0.5) * 0.15;
      s.label('DENIED', 0.14, 0.06, [px, DH + 0.046, pz], '#c0202a', '#f3efe4').rotation.set(-Math.PI / 2, 0, -0.3);
      for (let i = 0; i < 5; i++) s.box([0.22, 0.003, 0.3], [px - 0.32, DH + 0.002 + i * 0.003, pz - 0.05], papers);
    }

    // ---- Desk top: nameplate, bell, clipboard, monitor, extras ----
    const brass = s.material('#c9a24a', { metalness: 0.85, roughness: 0.3 });
    const dark = s.material('#1d1d22', { roughness: 0.5 });
    const plateX = 0.35, plateZ = deskZ - 0.12;
    const plateW = a.name === 'trainee' ? 0.3 : a.name === 'mephistopheles' || a.name === 'intake' || a.name === 'yourname' ? 0.36 : 0.26;
    const wedge = s.box([plateW, 0.07, 0.03], [plateX, DH + 0.035, plateZ], a.name === 'dolores' ? brass : dark);
    wedge.rotation.x = -0.25;
    const plate = s.label(NAME_TEXT[a.name], plateW - 0.02, 0.055, [plateX, DH + 0.039, plateZ + 0.017], a.name === 'dolores' ? '#5a3a10' : '#f1e6c8', a.name === 'dolores' ? '#e4c26a' : '#1d1d22');
    plate.rotation.x = -0.25;
    // The bell.
    const bellX = plateX + 0.35, bellZ = plateZ - 0.05;
    s.lathe([[0, 0], [0.05, 0], [0.05, 0.008], [0.045, 0.02], [0.035, 0.04], [0.02, 0.055], [0, 0.06]], chrome, [bellX, DH, bellZ]);
    s.cylinder(0.006, 0.006, 0.02, [bellX, DH + 0.065, bellZ], dark, 8);
    // The clipboard with the sign-in sheet.
    const clipX = -0.3, clipZ = deskZ - 0.16;
    const board = s.box([0.24, 0.01, 0.32], [clipX, DH + 0.005, clipZ], s.material('#6b4a2a'));
    board.rotation.y = 0.2;
    const sheetMap = paint(256, 340, (c, w, h) => {
      c.fillStyle = '#f7f3e6'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#1f1f24'; c.textAlign = 'center'; c.font = 'bold 28px sans-serif'; c.fillText('SIGN IN', w / 2, 40);
      c.strokeStyle = '#8a8a90'; c.lineWidth = 2;
      const filled = Math.round(mix(1, 9, mood.density));
      for (let i = 0; i < 10; i++) {
        const y = 80 + i * 25;
        c.beginPath(); c.moveTo(20, y); c.lineTo(w - 20, y); c.stroke();
        if (i < filled) { c.fillStyle = '#2a3a8c'; c.font = 'italic 17px serif'; c.textAlign = 'left'; c.fillText(['J. Doe', 'Faust', 'anon.', 'ME', 'the usual', 'still here', 'why', 'Dante A.', 'ask Barb'][i % 9], 26, y - 5); c.textAlign = 'center'; }
      }
    });
    const sheet = s.mesh(new THREE.PlaneGeometry(0.2, 0.27), new THREE.MeshStandardMaterial({ map: sheetMap, roughness: 0.9 }), [clipX, DH + 0.011, clipZ + 0.01]);
    sheet.rotation.set(-Math.PI / 2, 0, 0.2);
    s.box([0.1, 0.02, 0.03], [clipX - 0.03, DH + 0.02, clipZ - 0.14], chrome).rotation.y = 0.2;
    s.rod([clipX + 0.12, DH + 0.012, clipZ + 0.1], [clipX + 0.16, DH + 0.012, clipZ - 0.02], 0.004, s.material('#1b4fa0')); // a pen on a chain
    // The monitor, angled so a sliver of screen shows.
    const monX = -0.58, monZ = deskZ - DD + 0.28;
    const mon = new THREE.Group();
    mon.position.set(monX, DH, monZ); mon.rotation.y = 0.75;
    mon.add(s.box([0.2, 0.02, 0.16], [0, 0.01, 0], dark));
    mon.add(s.box([0.05, 0.14, 0.04], [0, 0.08, -0.03], dark));
    mon.add(s.box([0.44, 0.3, 0.03], [0, 0.3, 0], dark));
    const screenMap = paint(256, 176, (c, w, h) => {
      c.fillStyle = '#0d2a1a'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#48e07a'; c.font = '13px monospace'; c.textAlign = 'left';
      for (let i = 0; i < 10; i++) c.fillText(`${String(1000 + i * 7919).padStart(8, '0')}  ${['WAITING', 'WAITING', 'WAITING', 'DENIED', 'WAITING'][i % 5]}`, 10, 22 + i * 16);
    });
    mon.add(s.mesh(new THREE.PlaneGeometry(0.4, 0.26), new THREE.MeshStandardMaterial({ map: screenMap, emissive: '#ffffff', emissiveMap: screenMap, emissiveIntensity: 0.9 }), [0, 0.3, 0.016]));
    s.root.add(mon);
    // Pen cup.
    s.cylinder(0.035, 0.03, 0.09, [0.72, DH + 0.045, deskZ - DD + 0.3], s.material('#8a3d3d'), 14);
    for (let i = 0; i < 4; i++) s.rod([0.72 + (random() - 0.5) * 0.03, DH + 0.06, deskZ - DD + 0.3 + (random() - 0.5) * 0.03], [0.72 + (random() - 0.5) * 0.08, DH + 0.18, deskZ - DD + 0.3 + (random() - 0.5) * 0.08], 0.004, s.material(['#1b4fa0', '#c0202a', '#1d1d22', '#e3b024'][i]));

    if (a.item === 'cactus' || a.item === 'both') {
      const cx = 0.7, cz = deskZ - 0.2;
      s.lathe([[0, 0], [0.045, 0], [0.055, 0.08], [0.06, 0.085], [0.06, 0.095], [0.05, 0.095], [0.05, 0.09], [0, 0.09]], s.material('#b8603a', { roughness: 0.9 }), [cx, DH, cz]);
      const green = s.material(mood.cheer > 0.4 ? '#4f8a3a' : '#7d8a5a', { roughness: 0.8 });
      s.mesh(new THREE.CapsuleGeometry(0.035, 0.1, 4, 10), green, [cx, DH + 0.15, cz]);
      const arm = s.mesh(new THREE.CapsuleGeometry(0.02, 0.05, 4, 8), green, [cx + 0.05, DH + 0.17, cz]); arm.rotation.z = 0.4;
      s.scatter(new THREE.ConeGeometry(0.003, 0.014, 4), s.material('#efe6c0'), Array.from({ length: 24 }, (_u, i) => { const t = (i / 24) * Math.PI * 6; return { at: [cx + Math.cos(t) * 0.035, DH + 0.1 + (i / 24) * 0.11, cz + Math.sin(t) * 0.035] as P, size: 1 }; }));
    }
    if (a.item === 'sign' || a.item === 'both') {
      const sx = -0.62, sz = deskZ - 0.14;
      s.box([0.26, 0.012, 0.1], [sx, DH + 0.006, sz], dark);
      const card = s.label('TAKE A NUMBER', 0.24, 0.12, [sx, DH + 0.08, sz], '#f3eee0', '#8c1c22');
      card.rotation.x = -0.2; card.rotation.y = 0.15;
      s.rod([sx, DH + 0.01, sz], [sx, DH + 0.14, sz - 0.02], 0.006, chrome);
    }
    if (a.rope) {
      const velvet = s.material('#8c1c22', { roughness: 0.9 });
      const rx = DW / 2 + 0.25;
      for (const z of [0.1, -0.9]) {
        s.lathe([[0, 0], [0.16, 0], [0.16, 0.02], [0.05, 0.05], [0.025, 0.08], [0.025, 0.92], [0.05, 0.95], [0.05, 0.98], [0, 1.0]], brass, [rx, 0, z]);
        s.ball([0.045, 0.045, 0.045], [rx, 1.0, z], brass, 14);
      }
      s.tube([[rx, 0.93, 0.1], [rx + 0.02, 0.78, -0.15], [rx + 0.03, 0.72, -0.4], [rx + 0.02, 0.78, -0.65], [rx, 0.93, -0.9]], 0.028, velvet);
    }

    const rate = mix(0.5, 2.4, mood.energy);
    const restF = joints.shoulders[hand].rotation.x;
    const restN = joints.neck.rotation.x;
    return s.finish({
      footprint: 1.0,
      update: (dt, time) => {
        person.update(dt, time);
        const t = time * rate;
        if (a.stance === 'stamping') joints.shoulders[hand].rotation.x = restF + Math.max(0, Math.sin(t * 2.5)) * 0.35;
        if (a.stance === 'bored') joints.elbows[hand].rotation.x = -105 * RAD + Math.sin(t * 6) * 0.08;
        if (a.stance === 'sigh') joints.neck.rotation.x = restN + Math.sin(t * 0.8) * 0.08;
        void stamp;
      },
    });
  },
});
