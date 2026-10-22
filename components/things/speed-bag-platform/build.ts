import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const BAGS = {
  red: ['#b5302a', '#b5302a'],
  black: ['#25211f', '#25211f'],
  tan: ['#b07a45', '#b07a45'],
  wasp: ['#e2b21f', '#1f1c1a'],
  white: ['#e9e3d2', '#e9e3d2'],
  green: ['#2f6b4a', '#e9e3d2'],
} as const;

export default defineThing({
  questions: {
    bag: choice('What colour is the speed bag?', {
      red: 'Fire-engine red leather.',
      black: 'Plain black, gym issue.',
      tan: 'Old tan hide polished dark by knuckles.',
      wasp: 'Yellow and black panels like a wasp.',
      white: 'White leather gone grey with handling.',
      green: 'Green and cream panels, an old club\'s colours.',
    }),
    height: choice('Who is the platform set for?', {
      child: 'Wound right down for a child, with a box to stand on.',
      lightweight: 'Shoulder height for a small quick fighter.',
      heavyweight: 'Cranked to the top of the post for a very tall heavyweight.',
    }),
    state: choice('What is the bag doing?', {
      blur: 'A blur of motion, rattling off the drum mid-combination.',
      still: 'Hanging perfectly still.',
      rebound: 'Caught at the top of one rebound, pressed up against the drum.',
      flat: 'Gone soft and flat, hanging like an empty pocket.',
      gone: 'Missing: only the bare swivel is left, the bag lies on the floor.',
    }),
    chalk: choice('What is chalked on the slate beside it?', {
      tally: 'Rows of tally marks, rounds counted off in fives.',
      record: 'A record time, underlined twice.',
      name: 'A name and "NEXT".',
      wiped: 'Nothing: a slate wiped to a grey smear.',
      none: 'There is no slate at all.',
    }),
    drum: choice('What is the drum made of?', {
      varnished: 'Honey-varnished plywood with a dark scuffed ring where the bag strikes.',
      painted: 'Thick gym-green paint, chipped at the rim.',
      raw: 'Raw pale boards bolted together by hand.',
      black: 'Black lacquer with a steel rim, professional.',
    }),
    below: choice('What is on the floor underneath?', {
      nothing: 'Nothing.',
      chalkbucket: 'A bucket of chalk with white handprints around it.',
      wraps: 'A heap of unrolled hand wraps.',
      stool: 'A three-legged stool someone was sitting on to watch.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const steel = s.material('#42484d', { metalness: 0.6, roughness: 0.45 });
    steel.color.lerp(new THREE.Color('#7a4a30'), mood.wear * 0.45);
    const bright = s.material('#b9bdbf', { metalness: 0.85, roughness: 0.25 });
    const dark = s.material('#1b1917');
    const wood = s.material({ varnished: '#c08a48', painted: '#3f6e55', raw: '#d6c198', black: '#1f1e1d' }[a.drum], { roughness: a.drum === 'black' || a.drum === 'varnished' ? 0.35 : 0.8 });
    const [main, panel] = BAGS[a.bag];

    const drumY = { child: 1.28, lightweight: 1.68, heavyweight: 2.05 }[a.height];
    const postZ = -0.42, postTop = 2.3, drumR = 0.25;

    // Base plate, twin rails, the holes the pin goes through.
    s.box([0.8, 0.03, 0.95], [0, 0.015, -0.05], steel);
    for (const x of [-0.36, 0.36]) for (const z of [-0.47, 0.37]) s.cylinder(0.016, 0.016, 0.02, [x, 0.04, z], bright, 8);
    for (const x of [-0.09, 0.09]) s.box([0.05, postTop, 0.05], [x, postTop / 2, postZ], steel);
    s.box([0.23, 0.05, 0.05], [0, postTop - 0.025, postZ], steel);
    for (const x of [-1, 1]) s.rod([x * 0.3, 0.03, postZ], [x * 0.09, 0.55, postZ], 0.018, steel);
    s.scatter(new THREE.CylinderGeometry(1, 1, 0.5, 8).rotateX(Math.PI / 2), dark, Array.from({ length: 22 }, (_unused, i) => ({ at: [i % 2 ? 0.09 : -0.09, 0.75 + Math.floor(i / 2) * 0.15, postZ + 0.022] as const, size: 0.011 })));

    // Carriage with a crank, arms out to the drum.
    s.box([0.3, 0.2, 0.09], [0, drumY + 0.12, postZ], steel);
    const wheel = s.ring(0.085, 0.01, [0.2, drumY + 0.12, postZ], bright);
    wheel.rotation.y = Math.PI / 2;
    s.rod([0.15, drumY + 0.12, postZ], [0.2, drumY + 0.12, postZ], 0.012, bright);
    s.rod([0.2, drumY + 0.12, postZ - 0.085], [0.2, drumY + 0.12, postZ + 0.085], 0.006, bright);
    s.rod([0.2, drumY + 0.2, postZ], [0.26, drumY + 0.2, postZ], 0.01, dark);
    for (const x of [-0.11, 0.11]) {
      s.box([0.035, 0.035, 0.5], [x, drumY + 0.045, postZ + 0.27], steel);
      s.rod([x, drumY + 0.2, postZ + 0.03], [x * 1.4, drumY + 0.045, 0.08], 0.012, steel);
    }

    // The drum: a thick disc with a rim, boards or a strike ring painted on.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = `#${wood.color.getHexString()}`;
    ctx.fillRect(0, 0, 256, 256);
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 46; i++) { ctx.fillStyle = random() < 0.5 ? '#000' : '#fff'; ctx.fillRect(0, random() * 256, 256, 1 + random() * 2); }
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#1a1512'; ctx.lineWidth = 3;
    if (a.drum === 'raw') for (const x of [52, 104, 156, 208]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
    const topTexture = new THREE.CanvasTexture(canvas.cloneNode(true) as HTMLCanvasElement);
    (topTexture.image as HTMLCanvasElement).getContext('2d')!.drawImage(canvas, 0, 0);
    topTexture.colorSpace = THREE.SRGBColorSpace;
    ctx.globalAlpha = mix(0.25, 0.6, mood.wear); ctx.lineWidth = 26; ctx.strokeStyle = a.drum === 'black' ? '#8a8378' : '#2a1d14';
    ctx.beginPath(); ctx.arc(128, 128, 62, 0, 7); ctx.stroke();
    if (a.drum === 'painted') { ctx.globalAlpha = 0.9; ctx.fillStyle = '#d9c9a0'; for (let i = 0; i < 12; i++) { const t = random() * 6.28; ctx.beginPath(); ctx.arc(128 + Math.cos(t) * 120, 128 + Math.sin(t) * 120, 4 + random() * 9, 0, 7); ctx.fill(); } }
    const grain = new THREE.CanvasTexture(canvas);
    grain.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.MeshStandardMaterial({ map: grain, roughness: wood.roughness });
    const drum = s.mesh(new THREE.CylinderGeometry(drumR, drumR, 0.05, 40), [wood, new THREE.MeshStandardMaterial({ map: topTexture, roughness: wood.roughness }), face] as unknown as THREE.Material, [0, drumY, 0]);
    void drum;
    const rim = s.ring(drumR, 0.022, [0, drumY, 0], a.drum === 'black' ? bright : wood);
    rim.rotation.x = Math.PI / 2;
    for (const x of [-0.11, 0.11]) for (const z of [-0.12, 0.12]) s.cylinder(0.014, 0.014, 0.012, [x, drumY + 0.068, z], bright, 8);

    // Swivel under the centre.
    s.cylinder(0.045, 0.045, 0.012, [0, drumY - 0.031, 0], bright, 16);
    s.cylinder(0.014, 0.014, 0.13, [0, drumY - 0.095, 0], bright, 8);
    const hang = new THREE.Group();
    hang.position.set(0, drumY - 0.165, 0);
    s.root.add(hang);
    const link = s.ring(0.016, 0.005, [0, 0, 0], bright);
    hang.add(link);

    const bagLength = a.height === 'child' ? 0.34 : 0.4;
    const makeBag = (ghost: number) => {
      const group = new THREE.Group();
      const flat = a.state === 'flat';
      const profile: [number, number][] = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const r = Math.max(0.125 * (bagLength / 0.4) * Math.sin(Math.PI * t ** 0.62) ** 0.8, t > 0.6 ? 0.02 : 0.0005);
        profile.push([r, -bagLength + t * bagLength]);
      }
      const options = ghost ? { transparent: true, opacity: ghost, depthWrite: false } : {};
      const skin = s.material(main, { roughness: 0.42, ...options });
      const body = s.mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 8), s.material(main, { roughness: 0.42, flatShading: false, ...options }));
      body.geometry.dispose();
      body.geometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 24);
      group.add(body);
      if (!ghost) {
        // Four panels: alternate gores in the second colour, and dark welted seams.
        for (let i = 0; i < 4; i++) {
          if (panel !== main && i % 2 === 0) {
            const gore = s.mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x + 0.002, y)), 8, (i * Math.PI) / 2, Math.PI / 2), s.material(panel, { roughness: 0.42, side: THREE.DoubleSide }));
            group.add(gore);
          }
          const seam = s.mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x + 0.003, y)), 1, (i * Math.PI) / 2 - 0.04, 0.08), s.material('#1a1614', { side: THREE.DoubleSide }));
          group.add(seam);
        }
        const loop = s.cylinder(0.012, 0.02, 0.03, [0, 0.005, 0], dark, 8);
        group.add(loop);
      }
      void skin;
      if (flat) { group.scale.set(1.05, 1, 0.22); group.rotation.y = 0.5; }
      return group;
    };

    const bag = makeBag(0);
    let floorBag = false;
    if (a.state === 'gone') {
      floorBag = true;
      bag.position.set(0.3 + random() * 0.15, 0.1, 0.28 + random() * 0.15);
      bag.rotation.set(Math.PI / 2 - 0.15, 0, random() * 6);
      bag.position.y = 0.122 * (bagLength / 0.4);
      s.root.add(bag);
      bag.translateY(bagLength * 0.55);
    } else hang.add(bag);
    const ghosts: THREE.Group[] = [];
    if (a.state === 'blur') {
      for (const tilt of [-1.2, -0.7, 0.75, 1.2]) {
        const ghost = makeBag(0.34);
        ghost.rotation.x = tilt;
        hang.add(ghost);
        ghosts.push(ghost);
      }
      bag.rotation.x = 0.25;
    }
    if (a.state === 'rebound') bag.rotation.x = -1.05;
    if (a.state === 'still') bag.rotation.x = 0;

    // Slate hung off the side of the post.
    if (a.chalk !== 'none') {
      const board = document.createElement('canvas');
      board.width = 256; board.height = 320;
      const c = board.getContext('2d')!;
      c.fillStyle = '#2c302f'; c.fillRect(0, 0, 256, 320);
      c.globalAlpha = 0.16; c.fillStyle = '#fff';
      for (let i = 0; i < 9; i++) c.fillRect(random() * 200, random() * 300, 60 + random() * 120, 14 + random() * 30);
      c.globalAlpha = 0.92; c.strokeStyle = c.fillStyle = '#f1efe6'; c.lineWidth = 7; c.lineCap = 'round';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      if (a.chalk === 'tally') {
        const groups = 3 + Math.floor(random() * 6 + mood.energy * 3);
        for (let g = 0; g < groups; g++) {
          const x = 28 + (g % 3) * 76, y = 40 + Math.floor(g / 3) * 74;
          const last = g === groups - 1 ? 1 + Math.floor(random() * 4) : 5;
          for (let i = 0; i < Math.min(4, last); i++) { c.beginPath(); c.moveTo(x + i * 13, y); c.lineTo(x + i * 13 + (random() - 0.5) * 5, y + 48); c.stroke(); }
          if (last === 5) { c.beginPath(); c.moveTo(x - 8, y + 40); c.lineTo(x + 48, y + 8); c.stroke(); }
        }
      }
      if (a.chalk === 'record') {
        c.font = 'bold 44px sans-serif'; c.fillText('RECORD', 128, 70, 220);
        c.font = 'bold 92px sans-serif'; c.fillText(`${2 + Math.floor(random() * 7)}:${10 + Math.floor(random() * 49)}`, 128, 170, 230);
        for (const y of [232, 250]) { c.beginPath(); c.moveTo(34, y); c.lineTo(222, y + (random() - 0.5) * 8); c.stroke(); }
      }
      if (a.chalk === 'name') {
        c.font = 'bold 62px sans-serif'; c.fillText('NEXT', 128, 76, 220);
        c.beginPath(); c.moveTo(40, 120); c.lineTo(216, 116); c.stroke();
        c.font = 'bold 70px sans-serif'; c.fillText(['TITO', 'JOE', 'ALMA', 'RAY', 'LUIS', 'DOT'][Math.floor(random() * 6)], 128, 200, 220);
      }
      const texture = new THREE.CanvasTexture(board);
      texture.colorSpace = THREE.SRGBColorSpace;
      const slateY = a.height === 'child' ? 1.85 : 1.15;
      const slate = new THREE.Group();
      const frame = s.box([0.36, 0.44, 0.02], [0, 0, 0], s.material('#8a5c35'));
      const faceMesh = s.mesh(new THREE.PlaneGeometry(0.31, 0.39), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }), [0, 0, 0.012]);
      slate.add(frame, faceMesh);
      slate.position.set(-0.32, slateY, postZ + 0.04);
      slate.rotation.z = (random() - 0.5) * 0.12;
      s.root.add(slate);
      s.rod([-0.14, slateY + 0.2, postZ + 0.03], [-0.3, slateY + 0.2, postZ + 0.03], 0.008, steel);
      // A stub of chalk on a string.
      s.rod([-0.47, slateY + 0.2, postZ + 0.06], [-0.52, slateY - 0.16, postZ + 0.06], 0.003, s.material('#d9d2bd'));
      s.cylinder(0.011, 0.011, 0.05, [-0.52, slateY - 0.18, postZ + 0.06], s.material('#f4f2ea'), 8);
    }

    // The box a child stands on.
    if (a.height === 'child') {
      const crate = s.material('#a9814f', { roughness: 0.85 });
      s.box([0.5, 0.2, 0.36], [0.02, 0.13, 0.42], crate);
      for (const y of [0.09, 0.17]) s.box([0.51, 0.012, 0.37], [0.02, y, 0.42], s.material('#70522f'));
      s.box([0.14, 0.004, 0.09], [-0.08, 0.232, 0.42], dark).rotation.y = 0.3;
      s.box([0.14, 0.004, 0.09], [0.13, 0.232, 0.44], dark).rotation.y = -0.2;
    }
    const side = a.height === 'child' ? 0.52 : 0;
    if (a.below === 'chalkbucket') {
      const zinc = s.material('#9aa0a2', { metalness: 0.6, roughness: 0.4 });
      s.lathe([[0.09, 0], [0.1, 0.01], [0.13, 0.22], [0.125, 0.22], [0.095, 0.03], [0.0005, 0.03]], zinc, [0.3 + side * 0.4, 0.03, 0.3]);
      s.cylinder(0.122, 0.11, 0.03, [0.3 + side * 0.4, 0.2, 0.3], s.material('#f3f1ea', { roughness: 1 }), 18);
      const white = s.material('#efede4', { roughness: 1 });
      for (let i = 0; i < 6; i++) s.cylinder(0.04 + random() * 0.03, 0.04, 0.004, [(random() - 0.5) * 0.6, 0.032, 0.05 + random() * 0.3], white, 10);
    }
    if (a.below === 'wraps') {
      const cloth = s.material(mood.cheer > 0.5 ? '#d9b23a' : '#c9c2ad', { roughness: 1 });
      const pts: [number, number, number][] = [];
      for (let i = 0; i < 26; i++) { const t = i * 0.55; pts.push([-0.1 + side * 0.3 + Math.cos(t) * (0.08 + i * 0.007) + (random() - 0.5) * 0.05, 0.045 + (i % 3) * 0.012, 0.22 + Math.sin(t) * (0.06 + i * 0.006) - side * 0.2]); }
      s.tube(pts, 0.014, cloth).scale.y = 0.6;
    }
    if (a.below === 'stool') {
      const seat = s.material('#7a5632', { roughness: 0.6 });
      const sx = -0.52 - side * 0.2, sz = 0.3;
      s.cylinder(0.15, 0.15, 0.035, [sx, 0.45, sz], seat, 20);
      for (let i = 0; i < 3; i++) { const t = (i / 3) * 6.283 + 0.4; s.rod([sx + Math.cos(t) * 0.17, 0, sz + Math.sin(t) * 0.17], [sx + Math.cos(t) * 0.08, 0.44, sz + Math.sin(t) * 0.08], 0.016, seat); }
    }

    const speed = mix(14, 34, mood.energy);
    return s.finish({
      footprint: 0.6,
      update: floorBag || a.state === 'flat' ? undefined : (_dt, time) => {
        if (a.state === 'blur') {
          bag.rotation.x = Math.sin(time * speed) * 1.2;
          ghosts.forEach((ghost, i) => { ghost.rotation.x = Math.sin(time * speed - (i + 1) * 0.45) * 1.2; });
        } else if (a.state === 'still') bag.rotation.x = Math.sin(time * 1.3) * 0.04 * mood.energy;
      },
    });
  },
});
