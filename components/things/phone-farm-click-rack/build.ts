import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
type Rnd = () => number;

function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, matrices: readonly THREE.Matrix4[], colours?: readonly THREE.Color[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, matrices.length));
  mesh.count = matrices.length;
  matrices.forEach((m, i) => {
    mesh.setMatrixAt(i, m);
    if (colours) mesh.setColorAt(i, colours[i]);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const hue = (rnd: Rnd, s = 70, l = 50) => `hsl(${Math.floor(rnd() * 360)},${s}%,${l}%)`;

/** One phone screen's worth of content, 128 × 256, tiling vertically so it can scroll. */
const SCREENS = {
  video: (ctx: CanvasRenderingContext2D, rnd: Rnd) => {
    ctx.fillStyle = '#0e0e12';
    ctx.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 2; i++) {
      const y = i * 128;
      const g = ctx.createLinearGradient(0, y + 8, 128, y + 90);
      g.addColorStop(0, hue(rnd, 75, 55));
      g.addColorStop(1, hue(rnd, 75, 35));
      ctx.fillStyle = g;
      ctx.fillRect(6, y + 8, 116, 82);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.moveTo(56, y + 36);
      ctx.lineTo(78, y + 49);
      ctx.lineTo(56, y + 62);
      ctx.fill();
      ctx.fillStyle = '#e8262a';
      ctx.fillRect(6, y + 86, 30 + rnd() * 80, 4);
      ctx.fillStyle = '#8a8a92';
      ctx.fillRect(6, y + 98, 100, 6);
      ctx.fillRect(6, y + 110, 70, 5);
      ctx.fillStyle = '#5a5a62';
      ctx.fillRect(6, y + 120, 40, 4);
    }
  },
  chat: (ctx: CanvasRenderingContext2D, rnd: Rnd) => {
    ctx.fillStyle = '#eef0f3';
    ctx.fillRect(0, 0, 128, 256);
    const mine = rnd() < 0.5 ? '#2fb45a' : '#1f8ff0';
    let y = 6;
    while (y < 240) {
      const right = rnd() < 0.5, w = 40 + rnd() * 60, h = 12 + Math.floor(rnd() * 3) * 10;
      ctx.fillStyle = right ? mine : '#d9dbe0';
      ctx.beginPath();
      ctx.roundRect(right ? 122 - w : 6, y, w, h, 6);
      ctx.fill();
      ctx.fillStyle = right ? 'rgba(255,255,255,0.7)' : 'rgba(40,40,50,0.6)';
      for (let line = 0; line < h / 10; line++) ctx.fillRect((right ? 122 - w : 6) + 6, y + 4 + line * 10, w - 12 - rnd() * 14, 3);
      y += h + 6;
    }
  },
  captcha: (ctx: CanvasRenderingContext2D, rnd: Rnd) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = '#1a73e8';
    ctx.fillRect(8, 10, 112, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(14, 18, 50, 4);
    ctx.fillRect(14, 28, 80, 7);
    ctx.fillRect(14, 40, 60, 4);
    for (let i = 0; i < 9; i++) {
      const x = 8 + (i % 3) * 38, y = 56 + Math.floor(i / 3) * 38;
      const g = ctx.createLinearGradient(x, y, x + 36, y + 36);
      g.addColorStop(0, hue(rnd, 25, 55));
      g.addColorStop(1, hue(rnd, 25, 30));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, 36, 36);
      if (rnd() < 0.35) {
        ctx.fillStyle = 'rgba(26,115,232,0.55)';
        ctx.fillRect(x, y, 36, 36);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + 18, y + 18, 7, 0, 7);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#1a73e8';
    ctx.fillRect(68, 180, 52, 18);
    ctx.fillStyle = '#eceff3';
    ctx.fillRect(0, 210, 128, 46);
  },
  static: (ctx: CanvasRenderingContext2D, rnd: Rnd) => {
    for (let y = 0; y < 256; y += 4)
      for (let x = 0; x < 128; x += 4) {
        const v = Math.floor(rnd() * 255);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, 4, 4);
      }
  },
  game: (ctx: CanvasRenderingContext2D, rnd: Rnd) => {
    ctx.fillStyle = '#1b1040';
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = '#ffd23a';
    ctx.fillRect(8, 8, 60, 10);
    const gems = ['#ff3b5c', '#3bd5ff', '#8bff3b', '#ffb13b', '#c13bff'];
    for (let r = 0; r < 10; r++) for (let c = 0; c < 6; c++) {
      ctx.fillStyle = gems[Math.floor(rnd() * gems.length)];
      ctx.beginPath();
      ctx.arc(14 + c * 20, 36 + r * 21, 8, 0, 7);
      ctx.fill();
    }
  },
} as const;

export default defineThing({
  questions: {
    phones: score('How many phones are on the rack?', ['A dozen on one shelf', 'A couple of dozen', 'Fifty or so', 'A hundred', 'A wall of a hundred and fifty']),
    showing: choice('What are the screens showing?', {
      video: 'Scrolling video feeds, a bright thumbnail and a red progress bar on each.',
      chat: 'Chat threads of green and grey bubbles, the same conversation a hundred times.',
      captcha: 'A captcha grid: nine muddy photos and a blue verify button.',
      static: 'Grey static, the feeds gone to snow.',
      game: 'A match-three game grid of coloured gems, idling for coins.',
    }),
    rig: choice('Is anything tapping the phones?', {
      none: 'Nothing: the screens scroll on their own.',
      rail: 'A stepper-motor rail along one shelf with a rubber-tipped stylus finger.',
      every: 'A stylus rail on every phone shelf.',
      plungers: 'Clamp-on solenoid plungers hovering over a handful of screens.',
    }),
    fault: choice('Has any phone failed?', {
      none: 'All of them glowing, not one out of line.',
      dark: 'One screen is dead black with a red notification light.',
      cracked: 'One screen is spider-cracked and still glowing.',
      missing: 'One slot is empty, the cable left lying on the shelf.',
    }),
    operator: choice('Who is at the rack?', {
      nobody: 'Nobody: a bare stool pushed up beside it.',
      seated: 'An operator on the stool, hunched over, tapping a phone by hand.',
      standing: 'An operator standing with arms crossed, watching the wall of screens.',
      asleep: 'An operator slumped asleep on the stool.',
      nothing: 'No stool and no one. The rack runs itself.',
    }),
    shelving: choice('What kind of shelving is it?', {
      chrome: 'Chrome wire shelving on castors.',
      grey: 'Grey steel warehouse shelving.',
      black: 'Black powder-coated rack, almost tidy.',
      pine: 'Cheap pine bookshelves, a bedroom operation.',
    }),
    cables: choice('What has become of the charging cables?', {
      nest: 'A white nest heaped on the floor beneath the rack.',
      ziptied: 'Zip-tied in bundles down the uprights into power strips.',
      hubs: 'A row of USB hubs on the bottom shelf, every port lit blue.',
    }),
    notice: choice('What is taped to the rack?', {
      none: 'Nothing.',
      quota: 'A printout: QUOTA 40K / DAY.',
      accounts: 'A sheet of account names and passwords.',
      touch: 'A handwritten DO NOT TOUCH.',
      shift: 'A shift rota with most names crossed out.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = [12, 24, 48, 96, 144][Math.min(4, Math.round(a.phones * 4))];
    const PER_ROW = 12, TIERS = 3, PITCH = 0.38;
    const phoneShelves = Math.ceil(count / (PER_ROW * TIERS));
    const levels = Math.min(6, phoneShelves + 2);
    const WIDTH = 1.2, DEPTH = 0.42;
    const shelfY = (i: number) => 0.12 + i * PITCH;
    const H = shelfY(levels - 1) + 0.2;
    const frame = {
      chrome: s.material('#d6dadd', { metalness: 0.95, roughness: 0.2 }),
      grey: s.material('#8f9398', { metalness: 0.5, roughness: 0.5 }),
      black: s.material('#2a2c30', { metalness: 0.4, roughness: 0.55 }),
      pine: s.material('#c9a56b', { roughness: 0.8 }),
    }[a.shelving];
    const postSize = a.shelving === 'pine' ? 0.04 : 0.03;
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      if (a.shelving === 'chrome') s.cylinder(0.014, 0.014, H, [x * (WIDTH / 2 - 0.02), H / 2, z * (DEPTH / 2 - 0.02)], frame, 12);
      else s.box([postSize, H, postSize], [x * (WIDTH / 2 - 0.02), H / 2, z * (DEPTH / 2 - 0.02)], frame);
      if (a.shelving === 'chrome') s.ball([0.035, 0.035, 0.035], [x * (WIDTH / 2 - 0.02), 0.035, z * (DEPTH / 2 - 0.02)], s.material('#303236'), 10);
    }
    const wireRods: THREE.Matrix4[] = [];
    for (let i = 0; i < levels; i++) {
      const y = shelfY(i);
      if (a.shelving === 'chrome') {
        s.box([WIDTH, 0.025, 0.02], [0, y - 0.012, DEPTH / 2 - 0.01], frame);
        s.box([WIDTH, 0.025, 0.02], [0, y - 0.012, -DEPTH / 2 + 0.01], frame);
        for (let k = 0; k < 24; k++) wireRods.push(new THREE.Matrix4().makeScale(0.006, 0.006, DEPTH).setPosition(-WIDTH / 2 + 0.03 + k * ((WIDTH - 0.06) / 23), y - 0.003, 0));
      } else s.box([WIDTH, a.shelving === 'pine' ? 0.025 : 0.035, DEPTH], [0, y - 0.015, 0], frame);
    }
    if (wireRods.length) s.root.add(instanced(new THREE.BoxGeometry(1, 1, 1), frame, wireRods));

    // Phone positions: filled from the top phone shelf down, front tier first, on stepped risers.
    const topPhoneShelf = levels - 2;
    const riser = s.material(a.shelving === 'black' ? '#3a3c40' : '#e6e6e2', { roughness: 0.6 });
    const phones: { x: number; y: number; z: number; tilt: number }[] = [];
    let left = count;
    const dropCableAt: P3[] = [];
    for (let shelf = topPhoneShelf; shelf >= 1 && left > 0; shelf--) {
      const base = shelfY(shelf);
      for (let tier = 0; tier < TIERS && left > 0; tier++) {
        const z = 0.12 - tier * 0.1, lift = tier * 0.05;
        if (tier > 0) s.box([WIDTH - 0.08, lift, 0.1], [0, base + lift / 2, z - 0.01], riser);
        const inRow = Math.min(PER_ROW, left);
        for (let k = 0; k < inRow; k++) {
          const x = (k - (PER_ROW - 1) / 2) * 0.095 + (random() - 0.5) * 0.006;
          phones.push({ x, y: base + lift, z, tilt: -0.16 + (random() - 0.5) * 0.04 });
          dropCableAt.push([x, base + lift, z + 0.03]);
        }
        left -= inRow;
      }
    }

    // One screen per content kind, four variants each, so a hundred phones do not look like one.
    const seedBase = Math.floor(random() * 1e6);
    const textures = Array.from({ length: 4 }, (_u, v) => {
      let state = (seedBase + v * 7919) >>> 0;
      const rnd = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
      return paint(128, 256, (ctx) => SCREENS[a.showing](ctx, rnd));
    });
    const glow = mix(0.55, 1.25, mood.cheer) * (a.showing === 'static' ? 0.8 : 1);
    const screenMaterials = textures.map((map) => new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: glow, roughness: 0.3 }));
    const bodyGeometry = new THREE.BoxGeometry(0.072, 0.15, 0.008);
    const screenGeometry = new THREE.PlaneGeometry(0.064, 0.136).translate(0, 0, 0.0042);
    const body = s.material('#1a1a1e', { roughness: 0.35, metalness: 0.3 });
    const bodies: THREE.Matrix4[] = [];
    const screens: THREE.Matrix4[][] = [[], [], [], []];
    const faulty = a.fault === 'none' ? -1 : Math.floor(random() * phones.length);
    const q = new THREE.Quaternion(), e = new THREE.Euler();
    phones.forEach((phone, i) => {
      e.set(phone.tilt, 0, 0);
      q.setFromEuler(e);
      // The phone leans back on its lip; its bottom edge stays on the riser.
      const m = new THREE.Matrix4().compose(new THREE.Vector3(phone.x, phone.y + 0.075 * Math.cos(phone.tilt), phone.z + 0.075 * Math.sin(phone.tilt)), q, new THREE.Vector3(1, 1, 1));
      if (i === faulty && a.fault === 'missing') return;
      bodies.push(m);
      if (i === faulty) {
        const kind = a.fault;
        const map = kind === 'dark'
          ? paint(128, 256, (ctx) => { ctx.fillStyle = '#050507'; ctx.fillRect(0, 0, 128, 256); ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.arc(14, 14, 5, 0, 7); ctx.fill(); })
          : paint(128, 256, (ctx) => {
            SCREENS[a.showing](ctx, random);
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 1.5;
            const cx = 40 + random() * 48, cy = 60 + random() * 120;
            for (let r = 0; r < 9; r++) {
              const angle = (r / 9) * Math.PI * 2 + random() * 0.4;
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              let x = cx, y = cy;
              for (let step = 0; step < 6; step++) {
                x += Math.cos(angle + (random() - 0.5) * 0.8) * (10 + random() * 20);
                y += Math.sin(angle + (random() - 0.5) * 0.8) * (10 + random() * 20);
                ctx.lineTo(x, y);
              }
              ctx.stroke();
            }
            for (let ring = 1; ring < 4; ring++) {
              ctx.beginPath();
              ctx.arc(cx, cy, ring * 11, 0, 7);
              ctx.stroke();
            }
          });
        const material = new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: kind === 'dark' ? 1.5 : glow, roughness: 0.3 });
        const screen = s.mesh(screenGeometry, material);
        screen.applyMatrix4(m);
        return;
      }
      screens[Math.floor(random() * 4)].push(m);
    });
    s.root.add(instanced(bodyGeometry, body, bodies));
    screens.forEach((list, v) => { if (list.length) s.root.add(instanced(screenGeometry, screenMaterials[v], list)); });

    // Charging: a white lead out of every phone, then whatever the cables question says.
    const white = s.material('#f1f1ec', { roughness: 0.5 });
    const leads: THREE.Matrix4[] = [];
    const down = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.1, 0, 0));
    for (const [x, y, z] of dropCableAt) leads.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y + 0.012, z + 0.022), down, new THREE.Vector3(1, 1, 1)));
    s.root.add(instanced(new THREE.CylinderGeometry(0.0025, 0.0025, 0.07, 6), white, leads));
    const strip = s.material('#f4f4f0', { roughness: 0.5 });
    const red = s.material('#e0262a', { emissive: '#ff2020', emissiveIntensity: 0.6 });
    for (let shelf = Math.max(1, topPhoneShelf - phoneShelves + 1); shelf <= topPhoneShelf; shelf++) {
      s.box([WIDTH - 0.3, 0.035, 0.05], [0, shelfY(shelf) + 0.018, -0.17], strip);
      s.box([0.03, 0.01, 0.02], [WIDTH / 2 - 0.2, shelfY(shelf) + 0.04, -0.17], red);
    }
    if (a.cables === 'nest') {
      const heap = Math.round(mix(10, 18, mood.density));
      for (let i = 0; i < heap; i++) {
        const points: P3[] = [];
        const cx = (random() - 0.5) * 1.0, cz = 0.1 + random() * 0.3;
        for (let k = 0; k < 6; k++) points.push([cx + (random() - 0.5) * 0.5, 0.01 + random() * 0.05, cz + (random() - 0.5) * 0.3]);
        points[0] = [cx, shelfY(1) - 0.03, 0.2];
        s.tube(points, 0.0028, white);
      }
      for (let i = 0; i < 3; i++) s.box([0.055, 0.03, 0.055], [(random() - 0.5) * 0.9, 0.015, 0.25 + random() * 0.15], white);
    } else if (a.cables === 'ziptied') {
      for (const x of [-1, 1]) {
        s.tube([[x * (WIDTH / 2 - 0.06), shelfY(topPhoneShelf) + 0.05, 0.19], [x * (WIDTH / 2 - 0.05), shelfY(1) + 0.15, 0.2], [x * (WIDTH / 2 - 0.05), 0.1, 0.19]], 0.012, white);
        for (let k = 0; k < 5; k++) s.ring(0.016, 0.003, [x * (WIDTH / 2 - 0.05), 0.2 + k * 0.3, 0.195], s.material('#111113')).rotation.x = Math.PI / 2;
      }
    } else {
      const hub = s.material('#2b2d32', { roughness: 0.5 });
      const led = new THREE.MeshStandardMaterial({ color: '#4fa8ff', emissive: '#2a90ff', emissiveIntensity: 1.8 });
      const dots: THREE.Matrix4[] = [];
      for (let i = 0; i < 5; i++) {
        const x = -0.45 + i * 0.22;
        s.box([0.16, 0.03, 0.07], [x, shelfY(0) + 0.015, 0.05], hub);
        for (let k = 0; k < 7; k++) dots.push(new THREE.Matrix4().makeScale(0.008, 0.006, 0.004).setPosition(x - 0.06 + k * 0.02, shelfY(0) + 0.02, 0.087));
      }
      s.root.add(instanced(new THREE.BoxGeometry(1, 1, 1), led, dots));
    }

    // The tapping rig: a rail on the shelf front, a carriage and a stylus against a screen.
    const movers: { carriage: THREE.Object3D; stylus: THREE.Object3D; range: number; phase: number }[] = [];
    const rigShelves = a.rig === 'rail' ? [topPhoneShelf] : a.rig === 'every' ? Array.from({ length: phoneShelves }, (_u, i) => topPhoneShelf - i) : [];
    const alu = s.material('#c8ccd0', { metalness: 0.8, roughness: 0.35 });
    const motor = s.material('#2a2a2e', { roughness: 0.5 });
    for (const shelf of rigShelves) {
      const y = shelfY(shelf) + 0.09, z = 0.24;
      s.box([WIDTH - 0.1, 0.02, 0.02], [0, y, z], alu);
      for (const x of [-1, 1]) {
        s.box([0.04, 0.12, 0.04], [x * (WIDTH / 2 - 0.09), y - 0.045, z], motor);
      }
      const carriage = new THREE.Group();
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.045), motor);
      block.castShadow = true;
      carriage.add(block);
      const stylus = new THREE.Group();
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 8), alu);
      arm.rotation.x = Math.PI / 2;
      arm.position.z = -0.03;
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), s.material('#111114'));
      tip.position.z = -0.07;
      stylus.add(arm, tip);
      stylus.position.set(0, -0.01, -0.02);
      carriage.add(stylus);
      carriage.position.set((random() - 0.5) * 0.8, y, z);
      s.root.add(carriage);
      movers.push({ carriage, stylus, range: 0.35, phase: random() * 6 });
    }
    if (a.rig === 'plungers') {
      const picks = phones.filter(() => random() < 0.12).slice(0, 8);
      for (const phone of picks) {
        s.box([0.02, 0.02, 0.1], [phone.x, phone.y + 0.17, phone.z + 0.02], alu);
        const plunger = s.cylinder(0.009, 0.009, 0.05, [phone.x, phone.y + 0.14, phone.z + 0.06], motor, 10);
        const pin = s.cylinder(0.003, 0.003, 0.04, [phone.x, phone.y + 0.1, phone.z + 0.06], alu, 6);
        pin.rotation.x = 0.16;
        movers.push({ carriage: plunger, stylus: pin, range: 0, phase: random() * 6 });
      }
    }

    // Top shelf clutter: boxed spares, a router, a bin of dead phones.
    const topY = shelfY(levels - 1);
    const card = s.material('#d8c7a6', { roughness: 0.9 });
    for (let i = 0; i < Math.round(mix(2, 6, mood.density)); i++) s.box([0.09, 0.05, 0.17], [-0.45 + i * 0.1, topY + 0.025 + (i % 2) * 0.05, 0.05], card);
    s.box([0.22, 0.04, 0.16], [0.3, topY + 0.02, 0.02], s.material('#f2f2ee'));
    for (const x of [0.22, 0.3, 0.38]) s.rod([x, topY + 0.04, -0.03], [x, topY + 0.16, -0.05], 0.004, body);
    if (a.notice !== 'none') {
      const text = { quota: 'QUOTA 40K / DAY', accounts: 'acc_0291 : hunter2', touch: 'DO NOT TOUCH', shift: 'SHIFT ROTA' }[a.notice];
      const sheet = s.label(text, 0.3, 0.2, [WIDTH / 2 - 0.2, H - 0.12, DEPTH / 2 + 0.004], a.notice === 'touch' ? '#b8201c' : '#2a2a30', '#f6f3ea');
      sheet.rotation.z = (random() - 0.5) * 0.12;
    }

    // The stool, and whoever is on it.
    let person: ReturnType<typeof figure> | null = null;
    if (a.operator !== 'nothing') {
      const sx = WIDTH / 2 + 0.45, sz = 0.2;
      const seatH = 0.46;
      const stoolMaterial = s.material('#3d3f44', { metalness: 0.3 });
      if (a.operator !== 'standing') {
        const pose = a.operator === 'asleep' ? 'slumped' : 'sitting';
        if (a.operator !== 'nobody') {
          const skin = ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0'][Math.floor(random() * 4)];
          person = figure(s, { height: 1.7, style: 'doll', pose, hair: a.operator === 'asleep' ? 'hood' : 'cap', gaze: 'down', skin, top: a.operator === 'asleep' ? '#3a3f4a' : '#5a6b7a', bottom: '#2f3238', shoes: '#1c1c1e', sleeves: 'long' });
          const holder = new THREE.Group();
          holder.add(person.root);
          holder.position.set(sx, 0, sz);
          holder.rotation.y = -Math.PI / 2 + 0.3;
          s.root.add(holder);
          holder.updateMatrixWorld(true);
          const hips = person.pelvis.getWorldPosition(new THREE.Vector3());
          const seat = Math.max(0.3, person.hipHeight - 0.04);
          s.cylinder(0.17, 0.17, 0.035, [hips.x, seat, hips.z], stoolMaterial, 18);
          s.cylinder(0.025, 0.03, seat - 0.03, [hips.x, (seat - 0.03) / 2, hips.z], stoolMaterial, 10);
          s.cylinder(0.2, 0.22, 0.02, [hips.x, 0.01, hips.z], stoolMaterial, 18);
          if (a.operator === 'seated') {
            const held = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.008), body);
            held.position.set(0, -0.02, 0.04);
            held.rotation.x = -1.2;
            person.hands.left.add(held);
          }
        } else {
          s.cylinder(0.17, 0.17, 0.035, [sx, seatH, sz], stoolMaterial, 18);
          s.cylinder(0.025, 0.03, seatH - 0.03, [sx, (seatH - 0.03) / 2, sz], stoolMaterial, 10);
          s.cylinder(0.2, 0.22, 0.02, [sx, 0.01, sz], stoolMaterial, 18);
        }
      } else {
        const skin = ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0'][Math.floor(random() * 4)];
        person = figure(s, { height: 1.75, style: 'doll', pose: 'arms-crossed', hair: 'short', gaze: 'ahead', skin, top: '#5a6b7a', bottom: '#2f3238', shoes: '#1c1c1e', sleeves: 'short' });
        const holder = new THREE.Group();
        holder.add(person.root);
        holder.position.set(sx, 0, sz + 0.1);
        holder.rotation.y = -Math.PI / 2 + 0.2;
        s.root.add(holder);
      }
    }

    const pace = mix(0.1, 1.6, mood.energy);
    return s.finish({
      update(dt, time) {
        for (const material of screenMaterials) material.map!.offset.y = (material.map!.offset.y - dt * 0.12 * pace) % 1;
        for (const mover of movers) {
          if (mover.range > 0) mover.carriage.position.x = Math.sin(time * 0.25 * pace + mover.phase) * mover.range;
          const tap = Math.max(0, Math.sin(time * 3 * pace + mover.phase));
          if (mover.range > 0) mover.stylus.position.z = -0.02 - tap * 0.01;
          else mover.stylus.position.y = mover.carriage.position.y - 0.04 - tap * 0.012;
        }
        person?.update(dt, time);
      },
    });
  },
});
