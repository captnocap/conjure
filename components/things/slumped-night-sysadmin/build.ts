import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

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
    doing: choice('What are they doing?', {
      typing: 'Typing, hunched over the laptop, face lit by the screen.',
      staring: 'Staring at the screen, hands resting either side, waiting for a progress bar.',
      asleep: 'Asleep, the laptop closed on their lap and the head dropped to one side.',
      phone: 'On the phone, one hand to the ear, the laptop ignored.',
    }),
    top: choice('What are they wearing?', {
      hoodie: 'A grey hoodie with the hood up.',
      shirt: 'A crumpled work shirt with the sleeves rolled.',
      polo: 'A black company polo.',
      hivis: 'A yellow hi-vis vest over a dark jumper.',
    }),
    legs: choice('How are they sitting?', {
      out: 'Legs stretched straight out across the floor.',
      knees: 'Knees drawn up, the laptop balanced on them.',
    }),
    tools: noul('Does a toolbox and a blue console cable spill out beside them?'),
    headwear: choice('What is on their head?', {
      nothing: 'Nothing, or just the hood.',
      hardhat: 'A white hard hat pushed back.',
      torch: 'A head torch on a band, still switched on.',
      headset: 'A headset with the mic swung up.',
    }),
    secondCup: noul('Is there a second coffee cup, as if someone else was here?'),
    backrest: choice('What are they leaning against?', {
      cabinet: 'A black server cabinet door of perforated steel.',
      flightcase: 'A battered black flight case with silver corners.',
      pillar: 'A bare concrete pillar.',
      wall: 'A painted breeze-block wall.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = 1.7;
    const skin = ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0', '#9a6b4b'][Math.floor(random() * 5)];
    const outfit = {
      hoodie: { top: '#6a6d72', bottom: '#2e3138', sleeves: 'long' as const, hair: 'hood' as const },
      shirt: { top: '#9fb7c9', bottom: '#3a3f4a', sleeves: 'short' as const, hair: 'short' as const },
      polo: { top: '#1f2024', bottom: '#2a3444', sleeves: 'short' as const, hair: 'short' as const },
      hivis: { top: '#f2d21c', bottom: '#2e3138', sleeves: 'long' as const, hair: 'short' as const },
    }[a.top];
    const person = figure(s, { height: H, style: 'doll', pose: 'sitting', gaze: 'down', skin, shoes: '#1c1c1e', ...outfit, hair: a.headwear === 'hardhat' || a.headwear === 'torch' ? 'short' : outfit.hair });
    const { joints } = person;
    // Sitting on the floor: hips flat, legs forward, back against something.
    joints.body.rotation.x = 0;
    joints.spine.rotation.x = a.doing === 'typing' ? 0.3 : a.doing === 'asleep' ? 0.18 : 0.1;
    for (const side of ['left', 'right'] as const) {
      const spread = side === 'left' ? 1 : -1;
      if (a.legs === 'out') {
        joints.hips[side].rotation.x = -Math.PI / 2 + 0.06;
        joints.hips[side].rotation.z = spread * 0.12;
        joints.knees[side].rotation.x = 0.12;
        joints.ankles[side].rotation.x = 0.7;
      } else {
        joints.hips[side].rotation.x = -2.05;
        joints.hips[side].rotation.z = spread * 0.08;
        joints.knees[side].rotation.x = 2.3;
        joints.ankles[side].rotation.x = 0.3;
      }
    }
    const arms = (l: [number, number, number], r: [number, number, number]) => {
      joints.shoulders.left.rotation.set(l[0], 0, l[1]);
      joints.elbows.left.rotation.set(l[2], 0, 0);
      joints.shoulders.right.rotation.set(r[0], 0, -r[1]);
      joints.elbows.right.rotation.set(r[2], 0, 0);
    };
    if (a.doing === 'typing') { arms([-0.75, 0.15, -1.35], [-0.75, 0.15, -1.35]); joints.neck.rotation.x = 0.5; }
    else if (a.doing === 'staring') { arms([-0.25, 0.3, -0.5], [-0.25, 0.3, -0.5]); joints.neck.rotation.x = 0.3; }
    else if (a.doing === 'asleep') { arms([-0.2, 0.35, -0.3], [-0.2, 0.35, -0.3]); joints.neck.rotation.set(0.35, 0, 0.55); }
    else { arms([-0.3, 0.25, -0.5], [-0.9, 0.1, -2.6]); joints.elbows.right.rotation.y = -0.6; joints.neck.rotation.set(0.1, -0.3, 0.1); }
    person.settle();
    s.root.add(person.root);
    person.root.updateMatrixWorld(true);
    const hips = person.pelvis.getWorldPosition(new THREE.Vector3());
    const kneeL = joints.knees.left.getWorldPosition(new THREE.Vector3());
    const kneeR = joints.knees.right.getWorldPosition(new THREE.Vector3());
    const hipL = joints.hips.left.getWorldPosition(new THREE.Vector3());
    const hipR = joints.hips.right.getWorldPosition(new THREE.Vector3());

    // The backrest sits just behind the shoulders.
    const backZ = hips.z - 0.12 * H;
    const dark = s.material('#1c1d21', { roughness: 0.5, metalness: 0.3 });
    if (a.backrest === 'cabinet') {
      const perf = paint(128, 256, (ctx) => {
        ctx.fillStyle = '#202226'; ctx.fillRect(0, 0, 128, 256);
        ctx.fillStyle = '#0a0b0d';
        for (let y = 4; y < 256; y += 8) for (let x = 4; x < 128; x += 8) { ctx.beginPath(); ctx.arc(x + (Math.floor(y / 8) % 2) * 4, y, 2.2, 0, 7); ctx.fill(); }
      });
      perf.wrapS = perf.wrapT = THREE.RepeatWrapping;
      perf.repeat.set(2, 4);
      s.box([0.9, 1.5, 0.08], [hips.x, 0.75, backZ - 0.06], dark);
      s.mesh(new THREE.PlaneGeometry(0.78, 1.36), new THREE.MeshStandardMaterial({ map: perf, roughness: 0.6, metalness: 0.3 }), [hips.x, 0.76, backZ - 0.019]);
      for (const y of [0.3, 0.75, 1.2]) s.box([0.03, 0.012, 0.012], [hips.x + 0.42, y, backZ - 0.012], s.material('#8a8e94', { metalness: 0.8 }));
      const led = new THREE.MeshStandardMaterial({ color: '#4cff88', emissive: '#2aff70', emissiveIntensity: 1.6 });
      for (let i = 0; i < 6; i++) s.box([0.01, 0.006, 0.004], [hips.x - 0.38, 0.2 + i * 0.22, backZ - 0.018], i === 2 && mood.cheer < 0.5 ? new THREE.MeshStandardMaterial({ color: '#ff5030', emissive: '#ff3010', emissiveIntensity: 1.6 }) : led);
    } else if (a.backrest === 'flightcase') {
      const caseMat = s.material('#141416', { roughness: 0.7 });
      s.box([0.9, 0.9, 0.5], [hips.x, 0.45, backZ - 0.25], caseMat);
      const corner = s.material('#b8bcc0', { metalness: 0.9, roughness: 0.3 });
      for (const x of [-1, 1]) for (const y of [0.04, 0.86]) for (const z of [-0.48, -0.02]) s.box([0.06, 0.06, 0.06], [hips.x + x * 0.42, y, backZ + z], corner);
      s.box([0.16, 0.04, 0.02], [hips.x, 0.9, backZ - 0.25], corner);
      s.label('FRAGILE', 0.24, 0.08, [hips.x + 0.15, 0.6, backZ + 0.011], '#e8e8e4', '#b02020');
    } else if (a.backrest === 'pillar') {
      s.box([0.5, 1.6, 0.5], [hips.x, 0.8, backZ - 0.25], s.material('#a8a5a0', { roughness: 0.95 }));
    } else {
      const blocks = paint(256, 128, (ctx) => {
        ctx.fillStyle = mood.cheer > 0.5 ? '#d9d4c2' : '#b6b9b4'; ctx.fillRect(0, 0, 256, 128);
        ctx.strokeStyle = 'rgba(60,60,60,0.55)'; ctx.lineWidth = 2;
        for (let r = 0; r < 4; r++) { ctx.beginPath(); ctx.moveTo(0, r * 32 + 16); ctx.lineTo(256, r * 32 + 16); ctx.stroke(); for (let c = 0; c < 4; c++) { const x = c * 64 + (r % 2) * 32; ctx.beginPath(); ctx.moveTo(x, r * 32 - 16); ctx.lineTo(x, r * 32 + 16); ctx.stroke(); } }
      });
      blocks.wrapS = blocks.wrapT = THREE.RepeatWrapping;
      blocks.repeat.set(1.2, 2.2);
      s.mesh(new THREE.BoxGeometry(1.2, 1.5, 0.1), new THREE.MeshStandardMaterial({ map: blocks, roughness: 0.95 }), [hips.x, 0.75, backZ - 0.07]);
    }

    // The laptop on the thighs: open on the knees or closed on the lap.
    const thighL = kneeL.clone().sub(hipL), thighR = kneeR.clone().sub(hipR);
    const along = a.legs === 'knees' ? 0.72 : 0.55;
    const lap = hipL.clone().add(hipR).multiplyScalar(0.5).add(thighL.clone().add(thighR).multiplyScalar(0.5 * along));
    lap.y += 0.045 * H;
    const slope = Math.atan2(thighL.y, thighL.z);
    const laptop = new THREE.Group();
    laptop.position.copy(lap);
    laptop.rotation.x = -slope;
    const alu = s.material('#b9bdc2', { metalness: 0.7, roughness: 0.35 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.014, 0.23), alu);
    base.castShadow = base.receiveShadow = true;
    const keys = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.11), s.material('#2a2b30', { roughness: 0.6 }));
    keys.rotation.x = -Math.PI / 2;
    keys.position.set(0, 0.0075, 0.02);
    const lid = new THREE.Group();
    lid.position.set(0, 0.007, -0.115);
    const lidBody = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.008, 0.23), alu);
    lidBody.position.z = 0.115;
    lidBody.castShadow = true;
    const open = a.doing !== 'asleep';
    const screenArt = paint(128, 96, (ctx) => {
      ctx.fillStyle = '#0c0f14'; ctx.fillRect(0, 0, 128, 96);
      ctx.fillStyle = '#5cff7a';
      for (let i = 0; i < 10; i++) ctx.fillRect(4, 6 + i * 9, 20 + random() * 90, 3);
      if (a.doing === 'staring') { ctx.fillStyle = '#2a2f3a'; ctx.fillRect(14, 70, 100, 8); ctx.fillStyle = '#3aa0ff'; ctx.fillRect(14, 70, 62, 8); }
      if (mood.cheer < 0.4) { ctx.fillStyle = '#ff4040'; ctx.fillRect(4, 60, 60, 3); ctx.fillRect(4, 69, 40, 3); }
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), new THREE.MeshStandardMaterial({ map: screenArt, emissive: '#ffffff', emissiveMap: screenArt, emissiveIntensity: open ? mix(0.6, 1.3, 1 - mood.daylight) : 0, roughness: 0.3 }));
    screen.position.set(0, -0.005, 0.115);
    screen.rotation.x = -Math.PI / 2;
    lid.add(lidBody, screen);
    lid.rotation.x = open ? -1.85 : 0;
    laptop.add(base, keys, lid);
    s.root.add(laptop);

    // Lanyard and badge.
    const lanyard = s.material('#2a52c8', { roughness: 0.8 });
    const neck = joints.neck.getWorldPosition(new THREE.Vector3());
    const band = s.ring(0.075, 0.004, [neck.x, neck.y - 0.01, neck.z + 0.01], lanyard);
    band.rotation.x = Math.PI / 2 - 0.5;
    for (const side of [-1, 1]) s.rod([neck.x + side * 0.06, neck.y - 0.03, neck.z + 0.05], [neck.x, neck.y - 0.2, neck.z + 0.12], 0.003, lanyard);
    s.label('ADMIN', 0.06, 0.085, [neck.x, neck.y - 0.24, neck.z + 0.13], '#2a2a30', '#f2f2ee').rotation.x = -0.25;

    // Cups, toolbox and the console cable.
    const cupMat = s.material('#f1ede4', { roughness: 0.6 });
    const cupAt = (x: number, z: number, knocked = false) => {
      const cup = s.cylinder(0.04, 0.032, 0.11, [x, knocked ? 0.04 : 0.055, z], cupMat, 16);
      s.cylinder(0.042, 0.042, 0.012, [x, knocked ? 0.04 : 0.112, z], s.material('#3a3d44'), 16);
      s.box([0.082, 0.03, 0.001], [x, 0.06, z + 0.04], s.material('#c9a14a'));
      if (knocked) { cup.rotation.z = Math.PI / 2 - 0.1; cup.position.y = 0.036; }
      return cup;
    };
    const cupSide = random() < 0.5 ? -1 : 1;
    cupAt(hips.x + cupSide * 0.42, hips.z + 0.05);
    if (a.secondCup) cupAt(hips.x - cupSide * 0.46, hips.z + 0.18, random() < 0.4);
    if (a.tools) {
      const tx = hips.x - cupSide * 0.55, tz = hips.z - 0.05;
      const red = s.material('#b8261f', { roughness: 0.5 });
      s.box([0.4, 0.18, 0.2], [tx, 0.09, tz], red);
      s.box([0.4, 0.02, 0.2], [tx, 0.19, tz], s.material('#8a1a16'));
      s.box([0.16, 0.025, 0.03], [tx, 0.215, tz], s.material('#1c1c1e'));
      const blue = s.material('#2f8fe8', { roughness: 0.5 });
      const coil: P3[] = [];
      for (let i = 0; i < 24; i++) coil.push([tx + 0.2 + Math.cos(i * 0.9) * 0.07 + i * 0.012, 0.012 + (i % 3) * 0.004, tz + 0.18 + Math.sin(i * 0.9) * 0.07]);
      coil.push([lap.x + 0.17, lap.y, lap.z]);
      s.tube(coil, 0.004, blue);
      s.box([0.025, 0.012, 0.03], [tx + 0.17, 0.012, tz + 0.1], s.material('#c9cdd0', { metalness: 0.8 }));
      for (let i = 0; i < 3; i++) s.box([0.1, 0.015, 0.02], [tx + (random() - 0.5) * 0.3, 0.008, tz + 0.24 + random() * 0.1], s.material(['#e8c21c', '#1c1c1e', '#8a8e94'][i])).rotation.y = random() * 3;
    }

    // Headwear hangs from the head group so it follows the gaze.
    const headR = H * 0.064;
    if (a.headwear === 'hardhat') {
      const hat = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.15, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), s.material('#f2f2ec', { roughness: 0.4 }));
      hat.position.set(0, headR * 0.25, -headR * 0.15);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.35, headR * 1.35, headR * 0.1, 20), s.material('#f2f2ec', { roughness: 0.4 }));
      brim.position.set(0, headR * 0.3, -headR * 0.15);
      hat.castShadow = brim.castShadow = true;
      hat.rotation.x = -0.35; brim.rotation.x = -0.35;
      person.head.add(hat, brim);
    } else if (a.headwear === 'torch') {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.02, headR * 0.09, 6, 24), s.material('#2a2a2e'));
      strap.rotation.x = Math.PI / 2;
      strap.position.y = headR * 0.35;
      const lampBody = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, headR * 0.35, headR * 0.3), s.material('#2a2a2e'));
      lampBody.position.set(0, headR * 0.35, headR * 1.05);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(headR * 0.14, 12), new THREE.MeshStandardMaterial({ color: '#fff6c8', emissive: '#fff0b0', emissiveIntensity: 3 }));
      lens.position.set(0, headR * 0.35, headR * 1.21);
      person.head.add(strap, lampBody, lens);
    } else if (a.headwear === 'headset') {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.08, headR * 0.1, 6, 24, Math.PI), s.material('#1c1c1e'));
      arc.position.y = headR * 0.15;
      for (const side of [-1, 1]) {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.42, headR * 0.42, headR * 0.25, 16), s.material('#1c1c1e'));
        cup.rotation.z = Math.PI / 2;
        cup.position.set(side * headR * 1.05, 0, 0);
        arc.add(cup);
      }
      const mic = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.04, headR * 0.04, headR * 1.1, 6), s.material('#1c1c1e'));
      mic.position.set(headR * 1.1, headR * 0.6, headR * 0.4);
      mic.rotation.z = 0.6;
      person.head.add(arc, mic);
    }
    if (a.doing === 'phone') {
      const phone = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.008), s.material('#1a1a1e', { roughness: 0.35 }));
      phone.position.set(0, -0.02, 0.03);
      phone.rotation.x = -0.4;
      person.hands.right.add(phone);
    }
    s.ring(0.012, 0.004, [hips.x + 0.2, 0.004, hips.z + 0.5], s.material('#2a2a2e')).rotation.x = Math.PI / 2;
    s.box([0.035, 0.004, 0.02], [hips.x - 0.25, 0.002, hips.z + 0.42], s.material('#f1ede4'));

    const pace = mix(0.3, 1.6, mood.energy);
    const typingSide = joints.elbows;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (a.doing === 'typing') {
          typingSide.left.rotation.x = -1.35 + Math.sin(time * 9 * pace) * 0.04;
          typingSide.right.rotation.x = -1.35 + Math.sin(time * 9 * pace + 1.7) * 0.04;
        }
      },
    });
  },
});
