import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const COATS = {
  ginger: { base: '#d98a3a', mark: '#a85a1c', points: '#d98a3a', belly: '#f1dcc0', pattern: 'tabby' },
  grey: { base: '#8f8f8c', mark: '#4c4c4c', points: '#8f8f8c', belly: '#d9d6cc', pattern: 'tabby' },
  black: { base: '#1f1f22', mark: '#1f1f22', points: '#1f1f22', belly: '#1f1f22', pattern: 'solid' },
  tuxedo: { base: '#1f1f22', mark: '#1f1f22', points: '#f3f1ea', belly: '#f3f1ea', pattern: 'solid' },
  calico: { base: '#f1ede2', mark: '#d98a3a', points: '#f1ede2', belly: '#f1ede2', pattern: 'patches' },
  white: { base: '#f1efe8', mark: '#f1efe8', points: '#f1efe8', belly: '#f1efe8', pattern: 'solid' },
  siamese: { base: '#e6d6b8', mark: '#e6d6b8', points: '#3d2a20', belly: '#efe4cc', pattern: 'solid' },
} as const;
const FEED = {
  layer: { text: ['LAYER', 'PELLETS'], grain: ['#b89a5e', '#a88648'], icon: 'hen' },
  corn: { text: ['SEED', 'CORN'], grain: ['#e8b62a', '#d99a1a'], icon: 'corn' },
  grass: { text: ['LAWN', 'SEED'], grain: ['#c9c08a', '#a9a56a'], icon: 'grass' },
  oats: { text: ['HORSE', 'OATS'], grain: ['#e3d3a6', '#cdb983'], icon: 'shoe' },
  birdseed: { text: ['WILD', 'BIRD MIX'], grain: ['#2a2622', '#d9b34a', '#f1e8cf'], icon: 'bird' },
  fertiliser: { text: ['10-10-10', 'PLANT FOOD'], grain: ['#9fb8c9', '#e8e8e2'], icon: 'leaf' },
} as const;

function fur(coat: (typeof COATS)[keyof typeof COATS], random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = coat.base; ctx.fillRect(0, 0, 128, 128);
  if (coat.pattern === 'tabby') {
    ctx.strokeStyle = coat.mark; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const x = i * 18.3 + 6;
      ctx.beginPath(); ctx.moveTo(x, 8); ctx.quadraticCurveTo(x + 8, 40, x + (random() - 0.5) * 8, 78); ctx.stroke();
    }
  } else if (coat.pattern === 'patches') {
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 2 ? '#26221f' : coat.mark;
      ctx.beginPath(); ctx.ellipse(random() * 128, random() * 80, 12 + random() * 20, 9 + random() * 14, random() * 3, 0, 7); ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function print(feed: (typeof FEED)[keyof typeof FEED], style: string, accent: string, random: () => number, wear: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 400; canvas.height = 256; // long edge of the sack runs across the canvas
  const ctx = canvas.getContext('2d')!;
  const paper = { burlap: '#b99a63', paper: '#d9c49a', woven: '#f0efe8', floral: '#f1e4d4' }[style]!;
  ctx.fillStyle = paper; ctx.fillRect(0, 0, 400, 256);
  if (style === 'burlap') {
    ctx.strokeStyle = 'rgba(70,50,20,0.22)'; ctx.lineWidth = 1;
    for (let i = 0; i < 400; i += 5) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke(); }
    for (let i = 0; i < 256; i += 5) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(400, i); ctx.stroke(); }
  }
  if (style === 'floral') {
    for (let i = 0; i < 46; i++) {
      const x = random() * 400, y = random() * 256, r = 7 + random() * 6;
      ctx.fillStyle = [accent, '#d9728a', '#6f9fc4', '#e8b84a'][i % 4];
      for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p * 1.257) * r, y + Math.sin(p * 1.257) * r, r * 0.62, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#f6e9a0'; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, 7); ctx.fill();
      ctx.fillStyle = '#5f8a4f'; ctx.fillRect(x + r, y + r, 9, 3);
    }
  }
  // Everything else is drawn in the sack's upright frame: 256 wide, 400 tall.
  ctx.translate(200, 128); ctx.rotate(Math.PI / 2); ctx.translate(-128, -200);
  const ink = style === 'burlap' ? '#2a1c12' : style === 'floral' ? '#3a2a20' : accent;
  if (style === 'paper' || style === 'woven') {
    ctx.fillStyle = accent; ctx.fillRect(0, 0, 256, style === 'woven' ? 70 : 40); ctx.fillRect(0, 340, 256, 60);
    if (style === 'woven') { ctx.fillStyle = '#f2c81e'; ctx.fillRect(0, 70, 256, 12); ctx.fillRect(0, 328, 256, 12); }
  }
  if (style !== 'floral') {
    // Trade-mark picture.
    ctx.save(); ctx.translate(128, 150); ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = 9; ctx.lineCap = 'round';
    if (style === 'paper' || style === 'woven') { ctx.beginPath(); ctx.arc(0, 0, 64, 0, 7); ctx.stroke(); }
    if (feed.icon === 'hen') {
      ctx.beginPath(); ctx.ellipse(-4, 12, 36, 27, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(28, -18, 16, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(42, -20); ctx.lineTo(58, -14); ctx.lineTo(42, -8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-34, 2); ctx.lineTo(-56, -26); ctx.lineTo(-30, -14); ctx.fill();
      ctx.fillRect(-12, 36, 5, 20); ctx.fillRect(6, 36, 5, 20);
      ctx.fillStyle = '#c8322a'; ctx.beginPath(); ctx.arc(24, -36, 7, 0, 7); ctx.arc(34, -35, 6, 0, 7); ctx.fill();
    } else if (feed.icon === 'corn') {
      ctx.fillStyle = '#e8b62a'; ctx.beginPath(); ctx.ellipse(0, -2, 22, 48, 0.25, 0, 7); ctx.fill();
      ctx.fillStyle = '#4f8a3f'; ctx.beginPath(); ctx.moveTo(-26, 50); ctx.quadraticCurveTo(-44, 0, -16, -24); ctx.quadraticCurveTo(-18, 20, 0, 50); ctx.fill();
      ctx.beginPath(); ctx.moveTo(26, 50); ctx.quadraticCurveTo(52, 6, 30, -20); ctx.quadraticCurveTo(26, 22, 4, 50); ctx.fill();
    } else if (feed.icon === 'grass') {
      ctx.strokeStyle = '#4f8a3f'; ctx.lineWidth = 8;
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 9, 48); ctx.quadraticCurveTo(i * 12, 0, i * 20, -44 + Math.abs(i) * 8); ctx.stroke(); }
    } else if (feed.icon === 'shoe') {
      ctx.lineWidth = 17; ctx.beginPath(); ctx.arc(0, -4, 36, Math.PI * 0.85, Math.PI * 2.15); ctx.stroke();
    } else if (feed.icon === 'bird') {
      ctx.beginPath(); ctx.ellipse(-4, 6, 34, 20, -0.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(26, -14, 14, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(38, -16); ctx.lineTo(54, -12); ctx.lineTo(38, -6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-30, 14); ctx.lineTo(-62, 30); ctx.lineTo(-30, 26); ctx.fill();
    } else {
      ctx.fillStyle = '#4f8a3f'; ctx.beginPath(); ctx.moveTo(0, 50); ctx.quadraticCurveTo(-52, 0, 0, -50); ctx.quadraticCurveTo(52, 0, 0, 50); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = style === 'woven' || style === 'paper' ? '#fdf8e8' : ink;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 46px serif';
    if (style === 'burlap') { ctx.fillText(feed.text[0], 128, 46, 230); }
    else ctx.fillText(feed.text[0], 128, style === 'woven' ? 38 : 22, 230);
    ctx.fillStyle = style === 'burlap' ? ink : style === 'paper' ? ink : ink;
    ctx.font = 'bold 40px serif';
    ctx.fillText(feed.text[1], 128, 262, 236);
    ctx.fillStyle = style === 'burlap' ? ink : '#fdf8e8';
    ctx.font = 'bold 34px monospace';
    ctx.fillText(style === 'burlap' ? '100 LBS NET' : '50 LB', 128, 370, 230);
  }
  if (wear > 0.4) { ctx.fillStyle = `rgba(90,70,40,${(wear - 0.4) * 0.45})`; ctx.fillRect(-200, -200, 800, 800); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, paper };
}

export default defineThing({
  questions: {
    pose: choice('What is the cat doing?', {
      curled: 'Curled in a tight circle, nose under tail, fast asleep.',
      loaf: 'Tucked into a loaf, paws hidden, eyes shut, dozing but aware.',
      sprawled: 'Sprawled flat on its side, legs out, completely gone.',
      watching: 'Sitting upright with eyes wide open, watching the door.',
      absent: 'Not here: only a warm round dent in the top sack, a few hairs and a food bowl.',
    }),
    coat: choice('What coat does the cat have?', {
      ginger: 'A ginger tabby, marmalade stripes.',
      grey: 'A grey tabby with dark stripes.',
      black: 'Solid black.',
      tuxedo: 'A tuxedo: black with white bib and socks.',
      calico: 'A calico, white with orange and black patches.',
      white: 'All white.',
      siamese: 'A siamese, cream with dark face, ears and tail.',
    }),
    contents: choice('What is in the sacks?', {
      layer: 'Chicken layer pellets.',
      corn: 'Seed corn, bright yellow.',
      grass: 'Lawn and pasture seed.',
      oats: 'Horse oats.',
      birdseed: 'Wild bird mix with black sunflower seeds.',
      fertiliser: 'Granular fertiliser, the cat should not be on it.',
    }),
    print: choice('What are the sacks made of?', {
      burlap: 'Coarse burlap with black stencilled lettering.',
      paper: 'Multiwall kraft paper with a printed colour band and a trade-mark picture.',
      woven: 'White woven plastic with loud printed bands.',
      floral: 'Old cotton feedsacks in flower prints, the kind that became dresses.',
    }),
    stack: score('How high is the stack?', ['A couple of sacks on the floor', 'Knee high', 'Waist high', 'A tall pallet-load']),
    torn: noul('Is one sack torn and spilling its contents?'),
    extra: choice('What else is there?', {
      nothing: 'Nothing else.',
      bowl: 'A food bowl and a water dish on the floor beside the stack.',
      sign: 'A hand-lettered card: DO NOT DISTURB THE CAT.',
      mouse: 'A mouse peeking out from behind the bottom sack.',
      scoop: 'A galvanised feed scoop left on the sacks.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const feed = FEED[a.contents];
    const accent = ['#b3261e', '#1f5f3a', '#1f4a8a', '#c4601a', '#7a2f6b'][Math.floor(random() * 5)];
    const { texture, paper } = print(feed, a.print, accent, random, mood.wear);
    const top = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
    const side = s.material(paper, { roughness: 0.95 });
    const sackMats = [side, side, top, top, side, side];
    const SL = 0.78, ST = 0.25, SW = 0.48;
    const pillow = (seedy: number) => {
      const g = new THREE.BoxGeometry(SL, ST, SW, 12, 4, 8);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) / (SL / 2), t = p.getZ(i) / (SW / 2);
        const f = (1 - 0.72 * Math.abs(u) ** 4) * (1 - 0.66 * Math.abs(t) ** 4);
        const lump = 1 + Math.sin(u * 3.1 + seedy) * Math.cos(t * 2.7 + seedy * 2) * 0.1;
        p.setY(i, p.getY(i) * f * lump);
      }
      g.computeVertexNormals();
      return g;
    };
    const pillows = [pillow(1), pillow(2.3), pillow(4.1)];
    const layerH = ST * 0.74;
    const addSack = (x: number, y: number, z: number, yaw: number) => {
      const mesh = s.mesh(pillows[Math.floor(random() * 3)], sackMats as unknown as THREE.Material, [x, y + ST * 0.42, z]);
      mesh.rotation.y = yaw;
      return mesh;
    };

    const layers = 1 + Math.round(a.stack * 4 + mood.density * 0.8);
    const jitter = () => (random() - 0.5) * mix(0.02, 0.09, mood.wear);
    for (let layer = 0; layer < layers; layer++) {
      const y = layer * layerH;
      if (layer % 2 === 0) for (const x of [-1, 1]) addSack(x * SW * 0.51 + jitter(), y, jitter(), Math.PI / 2 + jitter());
      else for (const z of [-1, 1]) addSack(jitter(), y, z * SW * 0.51 + jitter(), jitter());
    }
    const topY = layers * layerH;
    const perch = addSack(jitter(), topY, 0.04 + jitter(), Math.PI / 2 + (random() - 0.5) * 0.4);
    const catY = topY + ST * 0.84;
    // A sack stood on end against the stack, showing its printed face.
    if (layers >= 2 || mood.density > 0.4) {
      const lean = new THREE.Group();
      const mesh = new THREE.Mesh(pillows[0], sackMats as unknown as THREE.Material);
      mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
      mesh.position.y = SL / 2 - 0.03;
      mesh.castShadow = mesh.receiveShadow = true;
      lean.add(mesh);
      lean.position.set(SW * 1.05 + 0.24, 0, 0.22);
      lean.rotation.set(-0.16, -0.35, 0);
      const flat = layers < 3;
      if (flat) lean.rotation.set(-0.3, -0.2, 0);
      lean.position.set(flat ? 0.1 : -0.12, 0, SW * 0.5 + (flat ? 0.34 : 0.36));
      s.root.add(lean);
    }

    // Loose grain.
    const grains: { at: readonly [number, number, number]; size: number; color: string }[] = [];
    const grainColour = () => feed.grain[Math.floor(random() * feed.grain.length)];
    if (a.torn) {
      const tx = -SW * 0.51 - SL * 0.0, tz = SL / 2 - 0.02, ty = Math.min(layers - 1, 1) * layerH + ST * 0.3;
      const px = tx - 0.02, pz = tz + 0.14;
      const pile = s.material(feed.grain[0], { roughness: 0.9 });
      s.mesh(new THREE.ConeGeometry(0.2, 0.11, 18), pile, [px, 0.055, pz]).scale.set(1.15, 1, 0.9);
      if (ty > 0.1) s.cylinder(0.02, 0.03, ty, [px, ty / 2 + 0.02, tz + 0.03], pile, 8);
      const rip = new THREE.Shape();
      rip.moveTo(-0.07, 0.04); rip.lineTo(0.02, 0.05); rip.lineTo(0.08, 0.02); rip.lineTo(0.03, -0.01); rip.lineTo(0.05, -0.05); rip.lineTo(-0.03, -0.035); rip.lineTo(-0.08, -0.01);
      s.mesh(new THREE.ShapeGeometry(rip), s.material('#2a2018', { side: THREE.DoubleSide }), [px, ty + 0.02, tz + 0.012]);
      s.box([0.07, 0.05, 0.004], [px + 0.06, ty - 0.02, tz + 0.03], side).rotation.set(0.6, 0, -0.5);
      for (let i = 0; i < 90; i++) {
        const angle = random() * Math.PI * 2, distance = 0.12 + Math.pow(random(), 1.5) * 0.4;
        grains.push({ at: [px + Math.cos(angle) * distance * 1.15, 0.006, pz + Math.sin(angle) * distance * 0.9 + 0.05], size: mix(0.7, 1.3, random()), color: grainColour() });
      }
      for (let i = 0; i < 26; i++) {
        const angle = random() * Math.PI * 2, distance = random() * 0.19, h = (1 - distance / 0.2) * 0.11;
        grains.push({ at: [px + Math.cos(angle) * distance * 1.15, h + 0.004, pz + Math.sin(angle) * distance * 0.9], size: 1.1, color: grainColour() });
      }
    }
    for (let i = 0; i < mood.wear * 30; i++) grains.push({ at: [mix(-0.8, 0.8, random()), 0.006, mix(0.45, 0.9, random())], size: 1, color: grainColour() });
    if (grains.length) s.scatter(new THREE.SphereGeometry(0.011, 6, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), grains);

    // The cat.
    const coat = COATS[a.coat];
    const furMap = fur(coat, random);
    const body = new THREE.MeshStandardMaterial({ map: furMap, roughness: 0.95 });
    const points = new THREE.MeshStandardMaterial({ color: coat.points, roughness: 0.95 });
    const headMat = a.coat === 'siamese' ? points : a.coat === 'calico' ? new THREE.MeshStandardMaterial({ color: '#f1ede2', roughness: 0.95 }) : new THREE.MeshStandardMaterial({ color: coat.base, roughness: 0.95 });
    const earMat = a.coat === 'siamese' ? points : a.coat === 'calico' ? new THREE.MeshStandardMaterial({ color: '#d98a3a', roughness: 0.95 }) : headMat;
    const tailMat = a.coat === 'siamese' ? points : a.coat === 'tuxedo' ? headMat : a.coat === 'calico' ? new THREE.MeshStandardMaterial({ color: '#26221f', roughness: 0.95 }) : body;
    const belly = new THREE.MeshStandardMaterial({ color: coat.belly, roughness: 0.95 });
    const dark = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.6 });
    const pink = new THREE.MeshStandardMaterial({ color: '#d98a8a', roughness: 0.7 });
    const cat = new THREE.Group();
    const part = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale: [number, number, number] = [1, 1, 1], turn: [number, number, number] = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at); mesh.scale.set(...scale); mesh.rotation.set(...turn);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const ball = new THREE.SphereGeometry(1, 20, 14);
    const makeHead = (eyes: 'shut' | 'open') => {
      const head = new THREE.Group();
      part(head, ball, headMat, [0, 0, 0], [0.068, 0.06, 0.062]);
      part(head, ball, a.coat === 'black' || a.coat === 'siamese' ? headMat : belly, [0, -0.02, 0.045], [0.034, 0.024, 0.024]);
      part(head, ball, pink, [0, -0.008, 0.066], [0.008, 0.006, 0.005]);
      for (const side of [-1, 1]) {
        const ear = part(head, new THREE.ConeGeometry(0.036, 0.075, 4), earMat, [side * 0.042, 0.066, -0.005], [1, 1, 0.5], [0, side * 0.4, -side * 0.3]);
        ears.push(ear);
        part(head, new THREE.ConeGeometry(0.02, 0.045, 4), pink, [side * 0.041, 0.062, 0.006], [1, 1, 0.3], [0, side * 0.4, -side * 0.3]);
        if (eyes === 'open') {
          part(head, ball, new THREE.MeshStandardMaterial({ color: a.coat === 'siamese' ? '#5aa0e0' : a.coat === 'black' ? '#e8c02a' : '#9ac43a', emissive: a.coat === 'siamese' ? '#2a5a9a' : '#6a7a10', emissiveIntensity: 0.6, roughness: 0.2 }), [side * 0.028, 0.012, 0.052], [0.014, 0.014, 0.008]);
          part(head, ball, dark, [side * 0.028, 0.012, 0.058], [0.004, 0.011, 0.004]);
        } else {
          part(head, new THREE.TorusGeometry(0.012, 0.003, 4, 10, Math.PI), a.coat === 'black' || a.coat === 'tuxedo' || a.coat === 'siamese' ? new THREE.MeshStandardMaterial({ color: '#77736a' }) : dark, [side * 0.028, 0.014, 0.054], [1, 0.7, 1], [0, 0, Math.PI]);
        }
        for (let w = 0; w < 2; w++) part(head, new THREE.CylinderGeometry(0.0012, 0.0012, 0.07, 4), new THREE.MeshStandardMaterial({ color: '#f4f2ea' }), [side * 0.06, -0.018 - w * 0.008, 0.05], [1, 1, 1], [0, 0, Math.PI / 2 + side * (0.15 + w * 0.25)]);
      }
      return head;
    };
    const ears: THREE.Mesh[] = [];
    const tail = new THREE.Group();
    const makeTail = (pts: [number, number, number][], radius = 0.019) => {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 8, false), tailMat);
      mesh.castShadow = true;
      tail.add(mesh);
      const tip = pts[pts.length - 1];
      part(tail, ball, a.coat === 'tuxedo' ? belly : tailMat, tip, [radius, radius, radius]);
    };
    let flickAxis: 'y' | 'z' = 'y';
    if (a.pose === 'curled') {
      part(cat, ball, body, [0, 0.07, 0], [0.2, 0.085, 0.165]);
      part(cat, ball, body, [-0.1, 0.075, -0.03], [0.12, 0.095, 0.13]); // haunch
      const head = makeHead('shut');
      head.position.set(0.13, 0.105, 0.1); head.rotation.set(0.1, 0.7, 0.25); head.scale.setScalar(1.15);
      cat.add(head);
      part(cat, ball, a.coat === 'tuxedo' ? belly : points, [0.03, 0.035, 0.15], [0.04, 0.022, 0.028]);
      tail.position.set(-0.19, 0.04, 0.02);
      makeTail([[0, 0, 0], [-0.02, 0, 0.1], [0.06, 0, 0.17], [0.17, 0, 0.19], [0.25, 0.005, 0.17]]);
    } else if (a.pose === 'loaf') {
      part(cat, ball, body, [0, 0.095, -0.02], [0.115, 0.1, 0.19]);
      part(cat, ball, belly, [0, 0.07, 0.12], [0.085, 0.06, 0.06]);
      const head = makeHead('shut');
      head.position.set(0, 0.185, 0.14); head.rotation.x = 0.15;
      cat.add(head);
      for (const side of [-1, 1]) part(cat, ball, a.coat === 'tuxedo' ? belly : points, [side * 0.045, 0.03, 0.165], [0.03, 0.022, 0.035]);
      tail.position.set(0.02, 0.035, -0.19);
      makeTail([[0, 0, 0], [0.1, 0, -0.02], [0.15, 0, 0.08], [0.15, 0, 0.2]]);
    } else if (a.pose === 'sprawled') {
      part(cat, ball, body, [0, 0.055, 0], [0.24, 0.058, 0.125]);
      part(cat, ball, belly, [0.02, 0.05, 0.06], [0.16, 0.045, 0.07]);
      const head = makeHead('shut');
      head.position.set(0.27, 0.05, 0.03); head.rotation.set(-0.9, 0.9, 0.3); head.scale.setScalar(1.1);
      cat.add(head);
      for (const [x, reach, splay] of [[0.15, 0.13, -0.75], [0.09, 0.15, -0.35], [-0.12, 0.15, 0.5], [-0.18, 0.13, 0.95]] as const) {
        const leg = new THREE.Group();
        leg.position.set(x, 0.03, 0.07);
        leg.rotation.y = -splay;
        part(leg, new THREE.CapsuleGeometry(0.019, reach, 4, 8), a.coat === 'siamese' ? points : body, [0, 0, reach / 2], [1, 1, 1], [Math.PI / 2, 0, 0]);
        part(leg, ball, a.coat === 'tuxedo' ? belly : points, [0, 0, reach + 0.01], [0.024, 0.02, 0.03]);
        cat.add(leg);
      }
      tail.position.set(-0.23, 0.04, -0.01);
      makeTail([[0, 0, 0], [-0.12, 0, -0.04], [-0.2, 0, 0.04], [-0.24, 0.01, 0.14]]);
    } else if (a.pose === 'watching') {
      part(cat, ball, body, [0, 0.14, -0.03], [0.1, 0.15, 0.12]);
      part(cat, ball, body, [0, 0.08, -0.06], [0.125, 0.085, 0.13]);
      part(cat, ball, belly, [0, 0.16, 0.055], [0.06, 0.1, 0.045]);
      for (const side of [-1, 1]) {
        part(cat, new THREE.CapsuleGeometry(0.022, 0.15, 4, 8), a.coat === 'siamese' ? points : body, [side * 0.04, 0.1, 0.085]);
        part(cat, ball, a.coat === 'tuxedo' ? belly : points, [side * 0.04, 0.018, 0.1], [0.027, 0.018, 0.036]);
      }
      const head = makeHead('open');
      head.position.set(0, 0.325, 0.03);
      head.rotation.y = (random() - 0.5) * 0.9;
      cat.add(head);
      tail.position.set(0.02, 0.03, -0.17);
      makeTail([[0, 0, 0], [0.13, 0, 0.0], [0.19, 0, 0.12], [0.16, 0, 0.24], [0.1, 0.02, 0.28]]);
      flickAxis = 'y';
    }
    const hasCat = a.pose !== 'absent';
    if (hasCat) {
      cat.add(tail);
      cat.scale.setScalar(1.45);
      cat.position.set(perch.position.x + (random() - 0.5) * 0.06, catY, perch.position.z + (random() - 0.5) * 0.1);
      cat.rotation.y = a.pose === 'watching' ? (random() - 0.5) * 0.7 : a.pose === 'loaf' ? (random() - 0.5) * 1.2 : (random() - 0.5) * 0.6 + (random() < 0.5 ? 0 : Math.PI * 0);
      s.root.add(cat);
    } else {
      // The dent, with a few shed hairs, still warm.
      const dent = s.mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshStandardMaterial({ color: '#000000', transparent: true, opacity: 0.42, roughness: 1 }), [perch.position.x, catY - 0.002, perch.position.z]);
      dent.rotation.x = -Math.PI / 2; dent.scale.set(0.24, 0.19, 1); dent.castShadow = false;
      const rim = s.ring(0.2, 0.03, [perch.position.x, catY - 0.012, perch.position.z], side);
      rim.rotation.x = Math.PI / 2; rim.scale.set(1.2, 0.95, 0.7);
      for (let i = 0; i < 14; i++) {
        const hair = s.box([0.045, 0.003, 0.004], [perch.position.x + (random() - 0.5) * 0.3, catY + 0.012, perch.position.z + (random() - 0.5) * 0.24], points);
        hair.rotation.y = random() * 6;
      }
    }

    // Extras.
    const dish = (x: number, z: number, fill: string | null, colour: string) => {
      s.lathe([[0, 0], [0.085, 0], [0.1, 0.045], [0.09, 0.045], [0.075, 0.012], [0, 0.012]], s.material(colour, { roughness: 0.35 }), [x, 0, z]);
      if (fill) s.cylinder(0.082, 0.078, 0.02, [x, 0.03, z], new THREE.MeshStandardMaterial({ color: fill, roughness: fill === '#6b4a2c' ? 0.9 : 0.1 }), 16);
    };
    if (a.extra === 'bowl' || !hasCat) {
      dish(SW + 0.22, 0.42, '#6b4a2c', mood.cheer > 0.5 ? '#c8322a' : '#8f9aa0');
      if (a.extra === 'bowl') dish(SW + 0.44, 0.3, '#9fc4d9', '#e8e2d0');
    }
    if (a.extra === 'sign') {
      const text = hasCat ? 'DO NOT DISTURB' : 'CAT: BACK SOON';
      const cardMesh = s.label(text, 0.42, 0.13, [-SW * 0.5, Math.max(0.2, topY * 0.55), SL / 2 + 0.012], '#2a2f6b', '#f4efd9');
      cardMesh.rotation.z = (random() - 0.5) * 0.14;
      if (layers % 2 === 0) cardMesh.position.z = SW + 0.012;
    } else if (a.extra === 'mouse') {
      const m = new THREE.Group();
      const grey = new THREE.MeshStandardMaterial({ color: '#8a8078', roughness: 0.95 });
      part(m, ball, grey, [0, 0.03, 0], [0.03, 0.028, 0.05]);
      part(m, ball, grey, [0, 0.035, 0.045], [0.02, 0.018, 0.026]);
      for (const side of [-1, 1]) part(m, ball, pink, [side * 0.018, 0.055, 0.035], [0.014, 0.014, 0.004]);
      part(m, ball, dark, [0.009, 0.04, 0.062], [0.004, 0.004, 0.004]); part(m, ball, dark, [-0.009, 0.04, 0.062], [0.004, 0.004, 0.004]);
      const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.02, -0.045), new THREE.Vector3(0.03, 0.01, -0.1), new THREE.Vector3(-0.01, 0.008, -0.15)]);
      m.add(new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 10, 0.003, 5), pink));
      m.scale.setScalar(1.5);
      m.position.set(-SW - 0.1, 0, SL / 2 - 0.06);
      m.rotation.y = 0.5;
      s.root.add(m);
    } else if (a.extra === 'scoop') {
      const tin = s.material('#aab2b6', { metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide });
      const scoop = new THREE.Group();
      part(scoop, new THREE.CylinderGeometry(0.06, 0.06, 0.2, 14, 1, true, 0, Math.PI), tin, [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, Math.PI / 2]);
      part(scoop, new THREE.CircleGeometry(0.06, 14, Math.PI, Math.PI), tin, [0, 0, -0.1]);
      part(scoop, new THREE.CylinderGeometry(0.014, 0.016, 0.11, 8), s.material('#8a6540'), [0, 0, -0.155], [1, 1, 1], [Math.PI / 2, 0, 0]);
      scoop.position.set(-SW * 0.75, (layers % 2 ? topY : topY) + 0.065, -0.05);
      scoop.rotation.y = 0.9;
      // It rests on the sack layer below the perch when there is one sticking out.
      scoop.position.y = topY + 0.06;
      s.root.add(scoop);
    }

    const energy = mood.energy;
    const baseTail = tail.rotation.y;
    void flickAxis;
    return s.finish({
      footprint: 0.8,
      update: (_dt, time) => {
        if (!hasCat) return;
        // A slow sway with the occasional sharp flick.
        const flick = Math.max(0, Math.sin(time * mix(0.6, 2.6, energy))) ** 6;
        tail.rotation.y = baseTail + Math.sin(time * mix(0.5, 3, energy)) * mix(0.02, 0.14, energy) + flick * mix(0.05, 0.4, energy);
        const twitch = Math.max(0, Math.sin(time * 1.7 + 1)) ** 20 * 0.35 * energy;
        ears.forEach((ear, index) => { ear.rotation.x = index === 0 ? twitch : 0; });
        cat.scale.y = 1.45 * (1 + Math.sin(time * 1.4) * 0.012); // breathing
      },
    });
  },
});
