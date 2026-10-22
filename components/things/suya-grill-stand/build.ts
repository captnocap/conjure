import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];
const SIGNS = { spot: 'SUYA SPOT', mallam: 'MALLAM SUYA', hot: 'HOT SUYA HERE', kano: 'ORIGINAL KANO SUYA', credit: 'NO CREDIT TODAY', none: '' } as const;

function board(lines: readonly string[], w: number, h: number, ink: string, paper: string, random: () => number, small = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(48, Math.round((512 * h) / w));
  const c = canvas.getContext('2d')!;
  c.fillStyle = paper;
  c.fillRect(0, 0, canvas.width, canvas.height);
  if (small) {
    // Newsprint: a headline bar and columns of grey lines.
    c.fillStyle = '#3a3a3a';
    c.fillRect(24, 20, 300, 34);
    c.fillStyle = '#8a8a86';
    for (let col = 0; col < 4; col++) for (let y = 80; y < canvas.height - 16; y += 12) c.fillRect(24 + col * 122, y, 100 * (0.7 + random() * 0.3), 5);
    c.fillStyle = '#9a9a96';
    c.fillRect(350, 16, 140, 50);
  } else {
    const longest = Math.max(...lines.map((line) => line.length));
    const size = Math.min((canvas.height / lines.length) * 0.72, (512 / longest) * 1.5);
    c.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    lines.forEach((line, index) => {
      c.save();
      c.translate(256, (canvas.height * (index + 0.5)) / lines.length);
      c.rotate((random() - 0.5) * 0.06);
      c.fillStyle = index % 2 ? '#1a1a1a' : ink;
      c.fillText(line, 0, 0, 480);
      c.restore();
    });
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide });
}

export default defineThing({
  questions: {
    loaded: score('How loaded is the grill?', ['Two last sticks', 'A handful spaced out', 'A full row', 'Shingled edge to edge, more stacked on the rim']),
    coals: choice('What state are the coals in?', {
      fierce: 'Fierce: white-orange, licking flames, sparks jumping.',
      steady: 'A steady deep-orange bed, the working heat.',
      dying: 'Dying: grey ash with a few red eyes.',
      cold: 'Cold black charcoal, not yet lit or long since out.',
    }),
    meat: choice('What is on the sticks?', {
      beef: 'Thin flat sheets of beef threaded like ribbons, rust-red with pepper.',
      chunks: 'Fat cubes of ram and beef with onion between.',
      gizzard: 'Beads of gizzard and kidney, small and dark.',
      chicken: 'Whole spatchcocked chicken pieces, golden.',
    }),
    drum: choice('What does the cut drum look like?', {
      blue: 'A blue oil drum, paint blistering near the coals.',
      red: 'A red drum with a faded stencil.',
      rust: 'Bare rusted steel.',
      black: 'Black with years of soot and fat.',
    }),
    sign: choice('What does the hand-lettered sign say?', {
      spot: 'SUYA SPOT.',
      mallam: 'MALLAM SUYA, named for the man himself.',
      hot: 'HOT SUYA HERE.',
      kano: 'ORIGINAL KANO SUYA, a claim of northern pedigree.',
      credit: 'NO CREDIT TODAY, come tomorrow.',
      none: 'No sign: the smoke is the sign.',
    }),
    queue: choice('What marks the queue?', {
      none: 'Nothing: nobody has come yet.',
      path: 'A trampled dark path of footprints up to the grill.',
      bench: 'A plank bench and a plastic stool where people wait.',
      waiting: 'Two customers standing, watching their order.',
    }),
    keeper: choice('Who is tending it right now?', {
      fanning: 'The mallam, fanning the coals with a raffia fan.',
      wrapping: 'The mallam at the side table, wrapping an order in newspaper.',
      away: 'Nobody: the fan lies on the table and the meat is on its own.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const iron = s.material('#3a3836', { roughness: 0.8, metalness: 0.4 });
    const wood = s.material('#8a6a44');
    const heat = { fierce: 1, steady: 0.65, dying: 0.25, cold: 0 }[a.coals];

    // The half drum on angle-iron legs.
    const R = 0.3, L = 0.95, top = 0.86;
    const drumMat = s.material({ blue: '#2a5aa8', red: '#b8342a', rust: '#8a4e2c', black: '#26221f' }[a.drum], { side: THREE.DoubleSide, roughness: 0.75, metalness: 0.3 });
    const shell = s.mesh(new THREE.CylinderGeometry(R, R, L, 24, 1, true, Math.PI, Math.PI), drumMat, [0, top, 0]);
    shell.rotation.z = Math.PI / 2;
    for (const x of [-1, 1]) {
      const cap = s.mesh(new THREE.CircleGeometry(R, 24, Math.PI, Math.PI), drumMat, [x * L / 2, top, 0]);
      cap.rotation.y = Math.PI / 2;
      const rib = s.ring(R + 0.006, 0.012, [x * L * 0.17, top, 0], drumMat, Math.PI);
      rib.rotation.set(0, Math.PI / 2, 0);
      rib.rotateZ(Math.PI);
    }
    // Scorch above the coal line.
    const soot = s.mesh(new THREE.CylinderGeometry(R + 0.004, R + 0.004, L * 0.9, 24, 1, true, Math.PI, Math.PI * 0.2), s.material('#1c1917', { side: THREE.DoubleSide }), [0, top, 0]);
    soot.rotation.z = Math.PI / 2;
    const soot2 = soot.clone();
    soot2.rotation.set(0, Math.PI, Math.PI / 2);
    s.root.add(soot2);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.rod([x * 0.4, top - 0.12, z * 0.27], [x * 0.46, 0, z * 0.33], 0.018, iron);
    }
    for (const z of [-1, 1]) s.rod([-0.44, 0.25, z * 0.31], [0.44, 0.25, z * 0.31], 0.012, iron);
    for (const x of [-1, 1]) s.rod([x * 0.44, 0.25, -0.31], [x * 0.44, 0.25, 0.31], 0.012, iron);
    // Coal bed.
    const bedY = top - 0.11;
    s.box([L - 0.04, 0.03, 0.5], [0, bedY - 0.03, 0], s.material('#1a1715'));
    const glow = new THREE.MeshStandardMaterial({ color: heat > 0.8 ? '#ffd9a0' : '#ff7a2a', emissive: heat > 0.8 ? '#ffb040' : '#ff4a12', emissiveIntensity: mix(0.6, 2.2, heat), roughness: 0.9 });
    const ash = s.material(a.coals === 'cold' ? '#1c1a19' : '#8f8a84', { roughness: 1 });
    const lumps = (material: THREE.Material, count: number) => {
      if (!count) return;
      const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), material, count);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        dummy.position.set((random() - 0.5) * (L - 0.1), bedY + random() * 0.03, (random() - 0.5) * 0.46);
        dummy.rotation.set(random() * 3, random() * 3, random() * 3);
        dummy.scale.setScalar(0.022 + random() * 0.02);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.castShadow = false;
      s.root.add(mesh);
    };
    lumps(glow, Math.round(heat * 90));
    lumps(ash, Math.round((1 - heat) * 90) + 20);
    const flames: THREE.Mesh[] = [];
    if (a.coals === 'fierce') for (let i = 0; i < 7; i++) {
      const flame = s.mesh(new THREE.ConeGeometry(0.03 + random() * 0.02, 0.1 + random() * 0.1, 6), new THREE.MeshStandardMaterial({ color: '#ffd070', emissive: '#ff9020', emissiveIntensity: 2, transparent: true, opacity: 0.85, depthWrite: false }), [(random() - 0.5) * (L - 0.15), top + 0.03, (random() - 0.5) * 0.4]);
      flame.castShadow = false;
      flames.push(flame);
    }
    // Grate.
    const wire = s.material('#55504a', { metalness: 0.6, roughness: 0.5 });
    for (let i = 0; i < 9; i++) s.rod([-L / 2 + 0.01, top + 0.005, -0.28 + i * 0.07], [L / 2 - 0.01, top + 0.005, -0.28 + i * 0.07], 0.004, wire);
    for (let i = 0; i < 5; i++) s.rod([-L / 2 + 0.06 + i * 0.208, top + 0.008, -0.3], [-L / 2 + 0.06 + i * 0.208, top + 0.008, 0.3], 0.005, wire);

    // Skewers.
    const raw = s.material('#9a3a2a'), done = s.material('#6a3418'), charred = s.material('#3a2014'), stickMat = s.material('#d8c08a');
    const golden = s.material('#c88a34'), onionMat = s.material('#e8dce8');
    const skewer = (at: P, turn: number, tilt = 0) => {
      const group = new THREE.Group();
      const cooked = heat === 0 ? raw : random() < 0.25 + mood.wear * 0.2 ? charred : random() < 0.5 ? done : s.material('#84402a');
      group.add(s.rod([0, 0, -0.36], [0, 0, 0.36], 0.004, stickMat));
      if (a.meat === 'beef') {
        for (let i = 0; i < 3; i++) {
          const sheet = s.box([0.07 + random() * 0.03, 0.012, 0.15], [0, 0.004, -0.16 + i * 0.15], cooked);
          sheet.rotation.set(0, (random() - 0.5) * 0.3, (random() - 0.5) * 0.25);
          group.add(sheet);
        }
      } else if (a.meat === 'chunks') {
        for (let i = 0; i < 7; i++) group.add(s.box([0.04, 0.035, 0.04], [0, 0.005, -0.21 + i * 0.07], i % 3 === 1 ? onionMat : cooked));
      } else if (a.meat === 'gizzard') {
        for (let i = 0; i < 10; i++) group.add(s.ball([0.022, 0.018, 0.022], [0, 0.004, -0.2 + i * 0.045], i % 4 === 2 ? charred : cooked, 6));
      } else {
        group.add(s.ball([0.08, 0.03, 0.12], [0, 0.012, -0.05], heat === 0 ? s.material('#e0b89a') : golden, 10));
        group.add(s.ball([0.035, 0.025, 0.07], [0.03, 0.012, 0.13], heat === 0 ? s.material('#e0b89a') : golden, 8));
      }
      group.position.set(...at);
      group.rotation.set(tilt, turn, 0);
      s.root.add(group);
    };
    const sticks = Math.round(mix(2, a.meat === 'chicken' ? 6 : 13, Math.min(1, a.loaded / 0.8)));
    for (let i = 0; i < sticks; i++) skewer([mix(-L / 2 + 0.07, L / 2 - 0.07, sticks === 1 ? 0.5 : (i + random() * 0.4) / sticks), top + 0.022, (random() - 0.5) * 0.04], (random() - 0.5) * 0.2);
    if (a.loaded > 0.8) for (let i = 0; i < 5; i++) skewer([-0.3 + i * 0.07, top + 0.05 + i * 0.004, 0.02], 1.2 + random() * 0.3, 0);

    // Side table with the wrapping station.
    const tx = 1.0, th = 0.72;
    s.box([0.72, 0.035, 0.62], [tx, th, 0], wood);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([tx + x * 0.31, th, z * 0.26], [tx + x * 0.33, 0, z * 0.28], 0.022, wood);
    const paper = board([], 0.4, 0.3, '', '#e9e4d2', random, true);
    for (let i = 0; i < 3; i++) {
      const sheet = s.mesh(new THREE.PlaneGeometry(0.4, 0.3), paper, [tx - 0.12 + i * 0.012, th + 0.022 + i * 0.004, 0.13]);
      sheet.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.4);
    }
    // Wrapped orders: twists of newspaper.
    const wraps = 1 + Math.floor(random() * 3) + (a.queue === 'none' ? 0 : 1);
    for (let i = 0; i < wraps; i++) {
      const wrap = s.mesh(new THREE.ConeGeometry(0.055, 0.2, 7), s.material('#e3decb'), [tx + 0.2 + (random() - 0.5) * 0.1, th + 0.06, -0.18 + i * 0.1]);
      wrap.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.3, 0, random() * 3);
    }
    // Onion rings, tomato, cabbage, a bowl of yaji pepper, a knife.
    for (let i = 0; i < 7; i++) s.ring(0.022 + random() * 0.014, 0.005, [tx - 0.2 + random() * 0.14, th + 0.025 + i * 0.002, -0.2 + random() * 0.12], s.material(i % 2 ? '#e9e0ea' : '#a86a9a')).rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) s.cylinder(0.03, 0.03, 0.01, [tx - 0.02 + random() * 0.1, th + 0.026 + i * 0.006, -0.22 + random() * 0.06], s.material('#c8322a'), 10);
    s.ball([0.07, 0.035, 0.06], [tx + 0.02, th + 0.04, -0.06], s.material('#b8d08a'), 8);
    s.lathe([[0, 0], [0.05, 0], [0.085, 0.05], [0.08, 0.05], [0.045, 0.01], [0, 0.01]], s.material('#d8d4c8', { side: THREE.DoubleSide }), [tx + 0.24, th + 0.018, 0.2]);
    s.ball([0.07, 0.03, 0.07], [tx + 0.24, th + 0.055, 0.2], s.material('#c2541c'), 10);
    s.box([0.2, 0.004, 0.03], [tx - 0.05, th + 0.022, -0.1], s.material('#c8cdd0', { metalness: 0.8, roughness: 0.3 })).rotation.y = 0.5;
    s.cylinder(0.035, 0.035, 0.16, [tx + 0.28, th + 0.1, -0.02], s.material('#d8a81c', { roughness: 0.2 }), 10);

    // Lamp on a stick: lit when the sun is low.
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    s.rod([tx + 0.33, th, -0.28], [tx + 0.33, 1.75, -0.28], 0.012, wood);
    s.rod([tx + 0.33, 1.75, -0.28], [tx + 0.12, 1.78, -0.2], 0.008, wood);
    s.ball([0.045, 0.06, 0.045], [tx + 0.12, 1.7, -0.2], s.material('#fff4d0', { emissive: '#ffd880', emissiveIntensity: mix(0.1, 2.2, dusk) }), 10);

    // Sign.
    if (a.sign !== 'none') {
      const words = SIGNS[a.sign].split(' ');
      const lines = words.length > 2 ? [words.slice(0, words.length - 1).join(' '), words[words.length - 1]] : words;
      const w = 0.8, h = 0.42;
      const panel = s.mesh(new THREE.PlaneGeometry(w, h), board(lines, w, h, pick(['#b3261e', '#1b3f8f', '#1d6b3a']), pick(['#f0e6c0', '#f4f0e0', '#f2d24a']), random), [0, 0.3, 0.37]);
      panel.rotation.x = -0.2;
      s.box([w + 0.03, h + 0.03, 0.012], [0, 0.3, 0.362], wood).rotation.x = -0.2;
    }

    // Queue marks.
    if (a.queue === 'path') {
      const dust = s.material('#5a5247');
      const patch = s.cylinder(0.5, 0.5, 0.003, [0, 0.002, 1.1], dust, 16);
      patch.scale.set(0.8, 1, 1.6);
      for (let i = 0; i < 12; i++) {
        const print = s.cylinder(0.05, 0.05, 0.004, [(i % 2 ? 0.1 : -0.1) + (random() - 0.5) * 0.25, 0.004, 0.55 + i * 0.13], s.material('#3e382f'), 8);
        print.scale.set(0.8, 1, 2.1);
        print.rotation.y = (random() - 0.5) * 0.6;
      }
    }
    if (a.queue === 'bench') {
      const bz = 1.2;
      s.box([1.3, 0.04, 0.24], [-0.1, 0.4, bz], wood).rotation.y = 0.06;
      for (const x of [-0.6, 0.4]) { s.box([0.05, 0.4, 0.22], [x, 0.2, bz], wood); }
      const stool = s.material(pick(['#2a62c8', '#c8322a', '#2c8a56', '#f0f0e8']));
      s.cylinder(0.15, 0.19, 0.42, [0.95, 0.21, bz - 0.1], stool, 12);
      s.cylinder(0.16, 0.16, 0.02, [0.95, 0.43, bz - 0.1], stool, 12);
      s.cylinder(0.035, 0.035, 0.2, [0.2, 0.52, bz], s.material('#3a1c10', { roughness: 0.2 }), 8);
    }
    const figure = (at: P, facing: number, pose: 'stand' | 'fan' | 'wrap') => {
      const group = new THREE.Group();
      const shirt = s.material(pose === 'stand' ? pick(['#c8402e', '#2f6fb0', '#2c8a56', '#e0a020', '#7a3a8a', '#d86a9a']) : pick(['#e8e2d0', '#b8c8d8', '#d8d0b0']));
      const trousers = s.material(pose === 'stand' ? pick(['#30383f', '#4a4030', '#27405a']) : shirt.color.getHexString() ? '#d8d0b8' : '#fff');
      const flesh = s.material(pick(['#5a3a28', '#6b4630', '#4a2f20']));
      for (const x of [-0.08, 0.08]) group.add(s.rod([x, 0, 0], [x * 0.9, 0.82, 0], 0.06, trousers));
      group.add(s.rod([0, 0.8, 0], [0, 1.4, 0.02], 0.16, shirt, 0.14));
      group.add(s.ball([0.1, 0.115, 0.1], [0, 1.6, 0.03], flesh, 12));
      if (pose !== 'stand') group.add(s.cylinder(0.09, 0.1, 0.08, [0, 1.71, 0.02], s.material(pick(['#f0f0e8', '#3a6a4a', '#8a2a2a'])), 12));
      let arm: THREE.Group | null = null;
      if (pose === 'stand') {
        group.add(s.rod([-0.17, 1.36, 0], [-0.2, 0.9, 0.06], 0.04, flesh));
        group.add(s.rod([0.17, 1.36, 0], [0.12, 1.02, 0.2], 0.04, flesh));
      } else {
        group.add(s.rod([-0.17, 1.36, 0], [-0.16, 1.0, 0.25], 0.04, flesh));
        arm = new THREE.Group();
        arm.position.set(0.17, 1.36, 0);
        arm.add(s.rod([0, 0, 0], [0.03, -0.3, 0.3], 0.04, flesh));
        if (pose === 'fan') {
          const fan = s.cylinder(0.13, 0.13, 0.008, [0.03, -0.34, 0.5], s.material('#d8bc6a'), 10);
          fan.rotation.x = 0.5;
          arm.add(fan, s.rod([0.03, -0.3, 0.3], [0.03, -0.33, 0.4], 0.01, s.material('#d8bc6a')));
        }
        group.add(arm);
      }
      group.position.set(...at);
      group.rotation.y = facing;
      s.root.add(group);
      return arm;
    };
    if (a.queue === 'waiting') {
      figure([-0.3 + random() * 0.2, 0, 1.0 + random() * 0.15], Math.PI + 0.2, 'stand');
      figure([0.45 + random() * 0.2, 0, 1.45 + random() * 0.2], Math.PI - 0.3, 'stand');
    }
    let fanArm: THREE.Group | null = null;
    if (a.keeper === 'fanning') fanArm = figure([-0.1, 0, -0.62], 0, 'fan');
    else if (a.keeper === 'wrapping') figure([tx - 0.05, 0, -0.62], 0, 'wrap');
    else {
      const fan = s.cylinder(0.13, 0.13, 0.008, [tx - 0.24, th + 0.03, 0.2], s.material('#d8bc6a'), 10);
      fan.rotation.z = 0.05;
      s.rod([tx - 0.24, th + 0.03, 0.2], [tx - 0.36, th + 0.03, 0.36], 0.01, s.material('#d8bc6a'));
    }
    // Spare charcoal sack and wear.
    s.ball([0.2, 0.26, 0.17], [-0.9, 0.24, -0.15], s.material('#b9a37a'), 10);
    for (let i = 0; i < 6; i++) s.ball([0.03, 0.025, 0.03], [-0.9 + (random() - 0.5) * 0.2, 0.5 + random() * 0.02, -0.15 + (random() - 0.5) * 0.16], s.material('#1c1a19'), 6);
    const mess = Math.round((mood.wear * 0.6 + mood.density * 0.4) * 8);
    for (let i = 0; i < mess; i++) {
      const scrap = s.box([0.12, 0.004, 0.09], [(random() - 0.5) * 2.4, 0.003, 0.4 + random() * 0.8], s.material(random() > 0.4 ? '#ddd8c6' : '#d8c08a'));
      scrap.rotation.y = random() * 3;
    }

    // Smoke.
    const puffs: { mesh: THREE.Mesh; phase: number; x: number; z: number; size: number }[] = [];
    const smokeCount = heat === 0 ? 0 : Math.round(mix(3, 9, heat) * mix(0.6, 1.2, a.loaded));
    const drift = (random() - 0.5) * 0.6;
    for (let i = 0; i < smokeCount; i++) {
      const size = 0.1 + random() * 0.08;
      const mesh = s.ball([size, size, size], [0, top, 0], new THREE.MeshStandardMaterial({ color: a.coals === 'dying' ? '#b9b6b0' : '#d6d2ca', transparent: true, opacity: 0.3, roughness: 1, depthWrite: false }), 8);
      mesh.castShadow = false;
      puffs.push({ mesh, phase: i / smokeCount, x: (random() - 0.5) * (L - 0.2), z: (random() - 0.5) * 0.3, size });
    }
    const place = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.phase + time * mix(0.08, 0.3, mood.energy)) % 1;
        puff.mesh.position.set(puff.x + t * t * (0.5 + drift) + Math.sin(t * 9 + puff.phase * 20) * 0.04, top + 0.12 + t * 1.5, puff.z + t * drift * 0.6);
        puff.mesh.scale.setScalar(puff.size * (0.6 + t * 2.2));
        (puff.mesh.material as THREE.MeshStandardMaterial).opacity = 0.34 * (1 - t) + 0.03;
      }
    };
    place(0);
    return s.finish({
      footprint: 1.25,
      update: (_dt, time) => {
        place(time);
        glow.emissiveIntensity = mix(0.6, 2.2, heat) * (1 + Math.sin(time * 5.3) * 0.12 * (0.4 + mood.energy));
        flames.forEach((flame, index) => flame.scale.set(1, 0.7 + Math.abs(Math.sin(time * 9 + index * 1.7)) * 0.7, 1));
        if (fanArm) fanArm.rotation.x = Math.sin(time * mix(4, 11, mood.energy)) * 0.22;
      },
    });
  },
});
