import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

function paint(width: number, height: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const ERAS = {
  sixties: {
    grounds: ['#f3b9c8', '#b9d8ee', '#bfe3cc', '#f4e6a6', '#e8c9ec'],
    inks: ['#7a2d4c', '#27456e', '#8a6a1c'],
    names: ['Bouffant', 'Lady Lac', 'Set & Hold', 'Beehive', 'Lustre'],
    caps: ['#f6f1e4', '#d9b23a', '#f3b9c8'],
  },
  seventies: {
    grounds: ['#7a4a22', '#c8741c', '#d9a520', '#6b7a2a', '#efe2c0'],
    inks: ['#f6e7c0', '#2c1a0e', '#c8361c'],
    names: ['SUPER HOLD', 'FIRM', 'HARMONY', 'NATURAL', 'STAY PUT'],
    caps: ['#5a3418', '#d9a520', '#efe2c0'],
  },
  eighties: {
    grounds: ['#14131a', '#ff2e93', '#12c8d8', '#f7e21a', '#7b2cf0'],
    inks: ['#f7e21a', '#ff2e93', '#12f0e0', '#ffffff'],
    names: ['MEGA HOLD', 'ROCK HARD', 'XTREME 9', 'ICE SPIKE', 'VOLT', 'BIG HAIR'],
    caps: ['#ff2e93', '#14131a', '#12c8d8', '#f7e21a'],
  },
  nineties: {
    grounds: ['#f2f1ec', '#f2f1ec', '#e9ecf0', '#f5f0dd'],
    inks: ['#1b49b8', '#c4122f', '#1c7a3c', '#222222'],
    names: ['HAIRSPRAY', 'VALUE', 'EXTRA FIRM', 'BASICS', 'NO FRILLS'],
    caps: ['#f2f1ec', '#1b49b8', '#c4122f'],
  },
  now: {
    grounds: ['#18181b', '#f4f3ef', '#2b2f33', '#cfc7b8', '#101014'],
    inks: ['#f4f3ef', '#ff5a36', '#b7f542', '#18181b'],
    names: ['cement', 'hold no.5', 'texture', 'dry fix', 'matte'],
    caps: ['#18181b', '#f4f3ef', '#8a8f94'],
  },
  stripped: {
    grounds: ['#b9bfc4', '#a9afb5', '#c6cacd', '#17151a'],
    inks: ['#17151a', '#c4122f', '#1d4dff'],
    names: ['MINE', 'HANDS OFF', 'KAOS', 'VIV', 'NOT YOURS', 'GLUE', 'RATS'],
    caps: ['#17151a', '#c4122f', '#d8d0a8'],
  },
} as const;

export default defineThing({
  questions: {
    era: choice('What era are the painted labels from?', {
      sixties: 'Sixties beauty-parlour pastels: pink, baby blue and mint with curly script and gold bands.',
      seventies: 'Seventies browns, oranges and golds with rainbow arcs and chunky capitals.',
      eighties: 'Eighties neon on black: hot pink, cyan and yellow zigzags, brand names shouted down the side.',
      nineties: 'Nineties supermarket own-brand: plain white cans, one colour band, a barcode.',
      now: 'Present-day salon minimal: matte black and bone white, tiny lowercase type and one bright dot.',
      stripped: 'Labels peeled off or sprayed over: bare metal, marker-pen names, tape and band stickers.',
    }),
    product: choice('Which product dominates the huddle?', {
      spray: 'Aerosol hairspray: more and bigger cans than anything else.',
      gel: 'A big open tub of bright gel with finger gouges in it, lid off.',
      egg: 'Egg-white glue: a bowl of whites with a fork, cracked shells and an egg box.',
      soap: 'A worn bar of soap in a dish and a glass of sugar water with a spoon, the oldest trick.',
      backcomb: 'No product at all, just teasing: combs, a clogged brush and nests of pulled hair.',
    }),
    empties: score('How many of the cans are empty?', ['All full, caps on', 'A couple finished', 'Half of them crushed', 'Nearly all crushed and kicked aside']),
    spraying: noul('Is one can mid-spray, with a soft plume hanging in the air?'),
    scene: choice('How are they arranged?', {
      lineup: 'Lined up in a neat row, ready to be used in order.',
      huddle: 'A tight huddle, shoulder to shoulder.',
      spilled: 'Spilled across the floor as if a bag was dropped or the pile was kicked.',
      shoebox: 'Kept in a communal shoebox with HAIR written on it in marker.',
    }),
    hair: choice('What colour is the hair caught in the comb?', {
      black: 'Dyed blue-black.',
      bleach: 'Fried bleach yellow.',
      green: 'Acid green.',
      pink: 'Hot pink.',
      red: 'Pillar-box red.',
      brown: 'Ordinary mousy brown.',
    }),
    kohl: choice('What state are the kohl pencils in?', {
      fresh: 'New, long and sharpened to a point.',
      stubs: 'Worn down to stubs, with sharpener shavings.',
      snapped: 'Snapped in half and smeared across the floor.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const era = ERAS[a.era];
    const metal = s.material('#c9ced2', { metalness: 0.85, roughness: 0.3 });
    const nozzleWhite = s.material('#f1efe8', { roughness: 0.5 });
    const hairColour = { black: '#17182a', bleach: '#e8d67a', green: '#6fd41f', pink: '#ff3d9a', red: '#d0181f', brown: '#6a4a33' }[a.hair];
    const hairMaterial = new THREE.MeshStandardMaterial({ color: hairColour, roughness: 0.75 });
    const add = <T extends THREE.Object3D>(parent: THREE.Object3D, child: T) => { parent.add(child); return child; };
    const part = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      return add(parent, mesh);
    };

    // --- Label art, wrapped once round the can with the brand facing forward.
    const labelArt = (index: number) => paint(512, 256, (g, w, h) => {
      const ground = era.grounds[index % era.grounds.length];
      const ink = pick(era.inks.filter((c) => c.toLowerCase() !== ground.toLowerCase()));
      const second = pick(era.inks);
      const name = era.names[(index + Math.floor(random() * 2)) % era.names.length];
      g.fillStyle = ground; g.fillRect(0, 0, w, h);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const cx = w / 2;
      if (a.era === 'sixties') {
        g.fillStyle = '#d9b23a'; g.fillRect(0, 14, w, 8); g.fillRect(0, h - 22, w, 8); g.fillRect(0, 28, w, 2);
        g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(cx, h * 0.52, 92, 74, 0, 0, 7); g.fill();
        g.strokeStyle = '#d9b23a'; g.lineWidth = 4; g.stroke();
        g.fillStyle = ink; g.font = 'italic bold 40px serif'; g.fillText(name, cx, h * 0.46, 165);
        g.font = 'italic 20px serif'; g.fillText('hair lacquer', cx, h * 0.66, 150);
        for (let k = 0; k < 9; k++) { g.fillStyle = '#fffaf0'; g.beginPath(); g.arc((k * 61 + 30) % w, h * 0.5 + Math.sin(k * 2.1) * 70, 4, 0, 7); g.fill(); }
      } else if (a.era === 'seventies') {
        const bands = ['#c8361c', '#d9741c', '#e3b21f', '#efe2c0'];
        bands.forEach((c, k) => { g.strokeStyle = c; g.lineWidth = 16; g.beginPath(); g.arc(cx, h * 1.02, 150 - k * 17, Math.PI, 0); g.stroke(); });
        bands.forEach((c, k) => { g.fillStyle = c; g.fillRect(0, 10 + k * 9, w, 7); });
        g.fillStyle = ink; g.font = 'bold 40px sans-serif'; g.fillText(name, cx, h * 0.36, 180);
        g.font = 'bold 18px sans-serif'; g.fillText('HAIR SPRAY', cx, h * 0.52, 150);
      } else if (a.era === 'eighties') {
        g.strokeStyle = second; g.lineWidth = 9; g.beginPath();
        for (let x = 0; x <= w; x += 32) g.lineTo(x, (x / 32) % 2 ? 30 : 58);
        g.stroke();
        for (let k = 0; k < 7; k++) { g.fillStyle = pick(era.inks); g.beginPath(); const x = random() * w, y = 80 + random() * 160; g.moveTo(x, y); g.lineTo(x + 26, y + 10); g.lineTo(x + 6, y + 30); g.fill(); }
        g.save(); g.translate(cx, h * 0.56); g.rotate(-Math.PI / 2);
        g.fillStyle = ink; g.font = 'italic bold 58px sans-serif'; g.fillText(name, 0, 0, 170);
        g.strokeStyle = second; g.lineWidth = 2; g.strokeText(name, 4, 4, 170);
        g.restore();
      } else if (a.era === 'nineties') {
        g.fillStyle = ink; g.fillRect(0, h * 0.2, w, h * 0.3);
        g.fillStyle = '#ffffff'; g.font = 'bold 38px sans-serif'; g.fillText(name, cx, h * 0.35, 180);
        g.fillStyle = '#333333'; g.font = '18px sans-serif'; g.fillText('300ml  firm hold', cx, h * 0.62, 170);
        for (let k = 0; k < 22; k++) g.fillRect(cx - 44 + k * 4, h * 0.72, k % 3 ? 1.5 : 3, 38);
      } else if (a.era === 'now') {
        g.fillStyle = ink === ground ? '#8a8f94' : ink; g.font = '30px sans-serif'; g.fillText(name, cx, h * 0.4, 170);
        g.fillRect(cx - 60, h * 0.52, 120, 2);
        g.font = '14px sans-serif'; g.fillText('250 ml / 8.4 fl oz', cx, h * 0.62, 160);
        g.fillStyle = pick(['#ff5a36', '#b7f542', '#5a7bff', '#ffd23a']); g.beginPath(); g.arc(cx, h * 0.8, 15, 0, 7); g.fill();
      } else {
        for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${k % 2 ? 255 : 60},${k % 2 ? 255 : 60},${k % 2 ? 255 : 70},0.12)`; g.fillRect(0, random() * h, w, 1 + random() * 3); }
        for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(238,232,214,0.85)'; g.fillRect(random() * w, random() * h, 30 + random() * 70, 14 + random() * 40); }
        g.fillStyle = '#d8d0a8'; g.fillRect(cx - 100, h * 0.58, 200, 46);
        g.fillStyle = '#17151a'; g.font = 'bold 34px monospace'; g.fillText(name, cx, h * 0.58 + 24, 185);
        g.save(); g.translate(cx, h * 0.3); g.rotate(jitter(0.25));
        g.fillStyle = ink === ground ? '#c4122f' : ink; g.font = 'bold 50px sans-serif'; g.fillText(pick(['OI!', 'XXX', 'NO', '(A)', '1977', 'DIY']), 0, 0, 170); g.restore();
      }
      // Rust, scuffs and dents come with wear.
      for (let k = 0; k < mood.wear * 60; k++) { g.fillStyle = pick(['rgba(120,70,30,0.5)', 'rgba(40,36,32,0.35)', 'rgba(230,230,225,0.5)']); g.beginPath(); g.ellipse(random() * w, random() * h, 2 + random() * 9, 1 + random() * 4, random() * 3, 0, 7); g.fill(); }
      if (mood.wear > 0.5) { g.fillStyle = 'rgba(120,70,30,0.45)'; g.fillRect(0, h - 16 * mood.wear, w, 16); }
    });

    // --- One aerosol can.
    interface Can { x: number; z: number; h: number; r: number; state: 'stand' | 'lying' | 'crushed'; cap: boolean; yaw: number; index: number; spray?: boolean }
    let nozzleAt: THREE.Vector3 | null = null;
    const can = (c: Can) => {
      const group = new THREE.Group();
      const bodyHeight = c.h * 0.8;
      const body = new THREE.CylinderGeometry(c.r, c.r, bodyHeight, 28, 14, true, c.state === 'stand' ? Math.PI : -Math.PI / 2, Math.PI * 2);
      if (c.state === 'crushed') {
        const position = body.attributes.position;
        const pinch = jitter(0.18), depth = 0.55 + random() * 0.3, bend = jitter(0.012);
        for (let i = 0; i < position.count; i++) {
          const t = position.getY(i) / bodyHeight;
          const squeeze = depth * Math.exp(-((t - pinch) ** 2) / 0.035);
          position.setX(i, position.getX(i) * (1 - squeeze));
          position.setZ(i, position.getZ(i) * (1 + squeeze * 0.28) + bend * squeeze);
        }
        body.computeVertexNormals();
      }
      const y0 = c.h * 0.03;
      part(group, body, new THREE.MeshStandardMaterial({ map: labelArt(c.index), roughness: a.era === 'now' ? 0.75 : 0.35 + mood.wear * 0.3, metalness: a.era === 'stripped' ? 0.6 : 0.25 }), [0, y0 + bodyHeight / 2, 0]);
      part(group, new THREE.CylinderGeometry(c.r * 1.02, c.r * 1.02, c.h * 0.03, 24), metal, [0, c.h * 0.015, 0]);
      const top = y0 + bodyHeight;
      part(group, new THREE.LatheGeometry([[c.r * 1.02, 0], [c.r * 1.02, c.h * 0.012], [c.r * 0.86, c.h * 0.05], [c.r * 0.5, c.h * 0.085], [c.r * 0.46, c.h * 0.1], [0, c.h * 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 24), metal, [0, top, 0]);
      const capMaterial = s.material(era.caps[c.index % era.caps.length], { roughness: 0.45 });
      if (c.cap) part(group, new THREE.CylinderGeometry(c.r * 0.97, c.r * 1.0, c.h * 0.17, 24), capMaterial, [0, top + c.h * 0.085, 0]);
      else {
        const press = c.spray ? c.h * 0.012 : 0;
        part(group, new THREE.CylinderGeometry(c.r * 0.34, c.r * 0.34, c.h * 0.07, 14), nozzleWhite, [0, top + c.h * 0.13 - press, 0]);
        part(group, new THREE.BoxGeometry(c.r * 0.5, c.h * 0.018, c.r * 0.16), new THREE.MeshStandardMaterial({ color: '#33343a' }), [c.r * 0.22, top + c.h * 0.14 - press, 0]);
      }
      group.position.set(c.x, 0, c.z);
      if (c.state === 'stand') group.rotation.y = c.yaw;
      else { group.rotation.set(0, c.yaw, Math.PI / 2); group.position.y = c.r * 1.02; group.position.x += Math.cos(c.yaw) * c.h * 0.5; group.position.z -= Math.sin(c.yaw) * c.h * 0.5; }
      s.root.add(group);
      if (c.spray) {
        group.updateMatrixWorld(true);
        nozzleAt = new THREE.Vector3(c.r * 0.5, top + c.h * 0.14, 0).applyMatrix4(group.matrixWorld);
        // A strip of tape holding the button down, since nobody is here to press it.
        part(group, new THREE.BoxGeometry(c.r * 0.5, c.h * 0.1, c.r * 2.1), s.material('#d8d0a8', { roughness: 0.8 }), [-c.r * 0.1, top + c.h * 0.12, 0]);
      }
      return group;
    };

    // --- Work out the cans.
    const total = Math.round((a.product === 'spray' ? 5 : 3) + mood.density * (a.product === 'spray' ? 5 : 3) + random() * 1.4);
    const emptyCount = Math.min(total - (a.spraying ? 1 : 0), Math.round(a.empties * total * 0.9 + (mood.wear > 0.7 ? 1 : 0)));
    const standing = total - emptyCount;
    const sizes = Array.from({ length: total }, (_, k) => {
      const big = a.product === 'spray' && k % 3 === 0;
      return { h: big ? mix(0.24, 0.29, random()) : mix(0.15, 0.23, random()), r: big ? 0.033 : mix(0.022, 0.029, random()) };
    });
    const spots: [number, number][] = [];
    const boxed = a.scene === 'shoebox';
    const BOX_W = 0.34, BOX_D = 0.17, BOX_Z = -0.1;
    if (a.scene === 'lineup') {
      const gap = 0.068;
      for (let k = 0; k < standing; k++) spots.push([(k - (standing - 1) / 2) * gap, -0.08 + jitter(0.004)]);
    } else if (boxed) {
      const perRow = Math.max(1, Math.ceil(standing / 2));
      for (let k = 0; k < standing; k++) spots.push([(k % perRow - (perRow - 1) / 2) * Math.min(0.07, (BOX_W - 0.07) / Math.max(1, perRow - 1)) + jitter(0.004), BOX_Z + (k < perRow ? -0.035 : 0.035)]);
    } else {
      for (let k = 0; k < standing; k++) {
        const angle = k * 2.4, radius = 0.047 * Math.sqrt(k + 0.2) * (a.scene === 'spilled' ? 1.5 : 1);
        spots.push([Math.cos(angle) * radius * 1.25, -0.09 + Math.sin(angle) * radius * 0.8]);
      }
    }
    spots.sort((p, q) => p[1] - q[1]);
    const order = sizes.slice(0, standing).sort((p, q) => q.h - p.h);
    let sprayIndex = -1;
    if (a.spraying && standing > 0) {
      // The spraying can is the outermost, so its plume blows clear of the others.
      let best = -Infinity;
      spots.forEach(([x, z], k) => { const value = Math.abs(x) + z * 0.5; if (value > best) { best = value; sprayIndex = k; } });
    }
    spots.forEach(([x, z], k) => {
      const tipped = a.scene === 'spilled' && k !== sprayIndex && random() < 0.55;
      const side = x >= 0 ? 1 : -1;
      can({
        x: tipped ? x * 1.35 : x, z: tipped ? z + 0.02 : z, ...order[k], index: k,
        state: tipped ? 'lying' : 'stand',
        cap: k !== sprayIndex && random() > 0.35 + a.empties * 0.4,
        yaw: tipped ? random() * Math.PI * 2 : k === sprayIndex ? (side > 0 ? 0 : Math.PI) + jitter(0.2) : jitter(0.7),
        spray: k === sprayIndex,
      });
    });
    const zones: [number, number][] = [[-0.2, -0.02], [0.21, -0.03], [-0.21, 0.13], [0.22, 0.12], [0.02, 0.25], [-0.25, -0.15], [0.26, -0.15], [-0.12, 0.27], [0.15, 0.28]];
    for (let k = 0; k < emptyCount; k++) {
      const [zx, zz] = zones[k % zones.length];
      const spread = 1 + Math.floor(k / zones.length) * 0.4 + (a.scene === 'spilled' ? 0.12 : 0);
      const size = sizes[standing + k];
      const yaw = Math.atan2(zx, zz) + jitter(0.3);
      const x = zx * spread + jitter(0.015), z = zz * spread + jitter(0.015);
      size.h = Math.min(size.h, 0.2);
      can({ x: x - Math.cos(yaw) * size.h * 0.5, z: z + Math.sin(yaw) * size.h * 0.5, ...size, index: standing + k, state: 'crushed', cap: false, yaw });
    }

    // --- The shoebox.
    if (boxed) {
      const card = s.material(pick(['#b58a5a', '#3a3a40', '#c9442e', '#e8e2d0']), { roughness: 0.9 });
      const wallH = 0.11, t = 0.004;
      s.box([BOX_W, t, BOX_D], [0, t / 2, BOX_Z], card);
      s.box([BOX_W, wallH, t], [0, wallH / 2, BOX_Z - BOX_D / 2], card);
      s.box([BOX_W, wallH, t], [0, wallH / 2, BOX_Z + BOX_D / 2], card);
      for (const side of [-1, 1]) s.box([t, wallH, BOX_D], [side * BOX_W / 2, wallH / 2, BOX_Z], card);
      const tag = s.label(pick(['HAIR', 'HAIR STUFF', 'HAIR - SHARE', 'SPRAY']), 0.16, 0.05, [jitter(0.04), wallH * 0.52, BOX_Z + BOX_D / 2 + t / 2 + 0.0008], '#17151a', '#efe9d6');
      tag.rotation.z = jitter(0.08);
      const lid = s.box([BOX_W + 0.012, 0.03, BOX_D + 0.012], [0.05, 0.015, BOX_Z - BOX_D - 0.03], card);
      lid.rotation.y = 0.2 + jitter(0.15);
    }

    // --- The dominant product, front and centre.
    const heroX = jitter(0.015), heroZ = boxed ? 0.1 : 0.07;
    const gelColour = pick(['#19a8ff', '#2fe07a', '#ff4fa8', '#ffd21f']);
    const gelTub = (x: number, z: number, r: number, h: number, colour: string, open: boolean) => {
      const plastic = new THREE.MeshStandardMaterial({ color: '#eef4f6', roughness: 0.15, transparent: true, opacity: 0.45 });
      const gel = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.12, emissive: colour, emissiveIntensity: 0.25 + mood.cheer * 0.2 });
      const fill = h * mix(0.5, 0.9, random());
      s.cylinder(r * 0.93, r * 0.9, fill, [x, 0.003 + fill / 2, z], gel, 28);
      s.lathe([[0, 0], [r * 0.95, 0], [r, 0.004], [r, h], [r * 1.03, h], [r * 1.03, h * 0.9]], plastic, [x, 0, z]);
      if (open) {
        // Finger gouges and a lifted peak.
        for (let k = 0; k < 3; k++) { const angle = random() * 6.3; const lump = s.ball([r * 0.3, h * 0.12, r * 0.22], [x + Math.cos(angle) * r * 0.45, 0.003 + fill, z + Math.sin(angle) * r * 0.45], gel, 12); lump.rotation.y = angle; }
        s.ball([r * 0.42, h * 0.05, r * 0.28], [x, 0.004 + fill, z], new THREE.MeshStandardMaterial({ color: new THREE.Color(colour).multiplyScalar(0.55), roughness: 0.2 }), 12);
        const lidX = x + r * 1.9, lidZ = z + r * 0.6;
        s.cylinder(r * 1.08, r * 1.08, h * 0.16, [lidX, h * 0.08, lidZ], s.material('#17151a', { roughness: 0.4 }), 28);
        const tag = s.label(pick(['GEL', 'WET LOOK', 'MAX GEL', 'SPIKE']), r * 1.5, r * 0.6, [lidX, h * 0.16 + 0.0006, lidZ], colour, '#17151a');
        tag.rotation.x = -Math.PI / 2; tag.rotation.z = jitter(0.5);
      } else s.cylinder(r * 1.08, r * 1.08, h * 0.16, [x, h + h * 0.06, z], s.material('#17151a', { roughness: 0.4 }), 28);
    };
    const teasingComb = (x: number, z: number, turn: number, colour: string, hairy: number) => {
      const group = new THREE.Group();
      const plastic = s.material(colour, { roughness: 0.35 });
      part(group, new THREE.BoxGeometry(0.1, 0.004, 0.007), plastic, [0, 0.002, 0]);
      const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0012, 0.003, 0.024), plastic, 30);
      const matrix = new THREE.Matrix4();
      for (let k = 0; k < 30; k++) { matrix.makeTranslation(-0.048 + k * 0.0033, 0.0018, 0.015); teeth.setMatrixAt(k, matrix); }
      teeth.castShadow = true;
      group.add(teeth);
      const tail = part(group, new THREE.CylinderGeometry(0.0008, 0.003, 0.11, 8), plastic, [0.105, 0.002, 0]);
      tail.rotation.z = -Math.PI / 2;
      for (let k = 0; k < hairy; k++) {
        const x0 = -0.045 + random() * 0.09;
        const points: THREE.Vector3[] = [];
        let px = x0, pz = 0.012, py = 0.004;
        for (let j = 0; j < 6; j++) { points.push(new THREE.Vector3(px, py, pz)); px += jitter(0.016); pz += 0.006 + random() * 0.012; py = 0.003 + random() * 0.012; }
        part(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, 0.0007, 4), hairMaterial);
      }
      group.position.set(x, 0, z);
      group.rotation.y = turn;
      s.root.add(group);
    };
    const hairNest = (x: number, z: number, size: number) => {
      for (let k = 0; k < 9; k++) {
        const ring = s.ring(size * mix(0.5, 1, random()), 0.0011, [x + jitter(size * 0.3), size * mix(0.25, 0.8, random()), z + jitter(size * 0.3)], hairMaterial);
        ring.rotation.set(random() * 3, random() * 3, random() * 3);
        ring.scale.set(1, mix(0.5, 1, random()), 1);
      }
    };

    if (a.product === 'gel') {
      gelTub(heroX - 0.02, heroZ, 0.062, 0.075, gelColour, true);
      if (mood.density > 0.4) gelTub(heroX - 0.16, heroZ + 0.05, 0.034, 0.04, pick(['#19a8ff', '#2fe07a', '#ff4fa8']), false);
    } else if (a.product === 'egg') {
      const china = s.material(pick(['#f3efe2', '#bcd7e6', '#f1d9a8']), { roughness: 0.25 });
      china.side = THREE.DoubleSide;
      s.lathe([[0, 0], [0.035, 0], [0.04, 0.006], [0.075, 0.05], [0.078, 0.055], [0.072, 0.052], [0.036, 0.012], [0, 0.01]], china, [heroX, 0, heroZ]);
      s.cylinder(0.062, 0.045, 0.02, [heroX, 0.032, heroZ], new THREE.MeshStandardMaterial({ color: '#f4eeb8', roughness: 0.08, emissive: '#e9df8a', emissiveIntensity: 0.2 }), 24);
      for (let k = 0; k < 5; k++) s.ball([0.008 + random() * 0.006, 0.004, 0.008 + random() * 0.006], [heroX + jitter(0.04), 0.043, heroZ + jitter(0.04)], new THREE.MeshStandardMaterial({ color: '#fffdf0', roughness: 0.2 }), 10);
      s.rod([heroX + 0.02, 0.035, heroZ], [heroX + 0.13, 0.085, heroZ + 0.04], 0.003, metal);
      const shell = new THREE.MeshStandardMaterial({ color: pick(['#d9a878', '#efe6d4', '#c98f60']), roughness: 0.7, side: THREE.DoubleSide });
      const yolk = new THREE.MeshStandardMaterial({ color: '#f0a81c', roughness: 0.2, emissive: '#d98a10', emissiveIntensity: 0.25 });
      const halves = 3 + Math.round(mood.density * 4);
      for (let k = 0; k < halves; k++) {
        const x = heroX - 0.1 + jitter(0.035) + (k % 2) * 0.03, z = heroZ + 0.05 + jitter(0.04) + k * 0.008;
        const half = part(s.root, new THREE.SphereGeometry(0.022, 16, 8, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), shell, [x, 0.022, z]);
        half.scale.set(1, 1.15, 1);
        half.rotation.set(jitter(0.5), 0, jitter(0.5));
        if (k === 0) s.ball([0.013, 0.01, 0.013], [x, 0.013, z], yolk, 12);
      }
      // Egg box behind and to the side.
      const boxX = heroX + 0.15, boxZ = heroZ + 0.04;
      const pulp = s.material('#b9b2a2', { roughness: 0.95 });
      const tray = s.box([0.1, 0.03, 0.15], [boxX, 0.015, boxZ], pulp);
      tray.rotation.y = 0.3;
      for (let k = 0; k < 6; k++) {
        const lx = (k % 2 - 0.5) * 0.046, lz = (Math.floor(k / 2) - 1) * 0.046;
        const ex = boxX + lx * Math.cos(0.3) + lz * Math.sin(0.3), ez = boxZ - lx * Math.sin(0.3) + lz * Math.cos(0.3);
        if (random() < 0.5) s.ball([0.02, 0.026, 0.02], [ex, 0.04, ez], shell, 14);
        else s.cylinder(0.019, 0.015, 0.006, [ex, 0.031, ez], s.material('#8f8878'), 12);
      }
    } else if (a.product === 'soap') {
      const dish = s.material(pick(['#e9e4d2', '#9fc0b4', '#d9a9a0']), { roughness: 0.3 });
      s.lathe([[0, 0], [0.05, 0], [0.068, 0.012], [0.07, 0.016], [0.05, 0.006], [0, 0.005]], dish, [heroX, 0, heroZ]).scale.set(1.25, 1, 0.85);
      const soapColour = pick(['#f1e9c8', '#e9b7c2', '#9fd6b0', '#e8a23a']);
      const bar = s.ball([0.045, 0.014, 0.028], [heroX, 0.02, heroZ], new THREE.MeshStandardMaterial({ color: soapColour, roughness: 0.25 }), 20);
      bar.rotation.y = jitter(0.5);
      for (let k = 0; k < 7; k++) s.ball([0.006 + random() * 0.006, 0.006, 0.006 + random() * 0.006], [heroX + jitter(0.05), 0.016 + random() * 0.012, heroZ + jitter(0.03)], new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, transparent: true, opacity: 0.7 }), 10);
      const gx = heroX + 0.14, gz = heroZ + 0.01;
      s.cylinder(0.028, 0.024, 0.06, [gx, 0.034, gz], new THREE.MeshStandardMaterial({ color: '#e9dcae', roughness: 0.1, emissive: '#d9c98a', emissiveIntensity: 0.15 }), 20);
      s.lathe([[0, 0], [0.027, 0], [0.032, 0.004], [0.036, 0.1], [0.034, 0.1]], new THREE.MeshStandardMaterial({ color: '#e6f3f5', roughness: 0.06, transparent: true, opacity: 0.4, side: THREE.DoubleSide }), [gx, 0, gz]);
      s.rod([gx - 0.01, 0.01, gz], [gx + 0.03, 0.14, gz + 0.012], 0.0025, metal);
      const bag = s.box([0.06, 0.05, 0.03], [heroX - 0.14, 0.025, heroZ + 0.03], s.material('#f4f1e6', { roughness: 0.9 }));
      bag.rotation.y = 0.4;
      const tag = s.label('SUGAR', 0.05, 0.022, [heroX - 0.134, 0.028, heroZ + 0.046], '#1b49b8', '#f4f1e6');
      tag.rotation.y = 0.4;
    } else if (a.product === 'backcomb') {
      teasingComb(heroX - 0.04, heroZ - 0.005, 0.25 + jitter(0.2), pick(['#ff2e93', '#12c8d8', '#f7e21a']), 14);
      hairNest(heroX + 0.03, heroZ + 0.07, 0.035);
      hairNest(heroX - 0.12, heroZ + 0.1, 0.022);
      // A paddle brush clogged with hair.
      const brush = new THREE.Group();
      const wood = s.material(pick(['#17151a', '#7a4a22', '#c4122f']), { roughness: 0.5 });
      const pad = part(brush, new THREE.SphereGeometry(1, 20, 10), wood, [0, 0.009, 0]);
      pad.scale.set(0.035, 0.009, 0.05);
      const handle = part(brush, new THREE.CylinderGeometry(0.007, 0.009, 0.1, 10), wood, [0, 0.009, 0.095]);
      handle.rotation.x = Math.PI / 2;
      const bristles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0007, 0.0007, 0.016, 4), s.material('#d9d6cc'), 54);
      const matrix = new THREE.Matrix4();
      for (let k = 0; k < 54; k++) { matrix.makeTranslation((k % 6 - 2.5) * 0.009, 0.024, (Math.floor(k / 6) - 4) * 0.009); bristles.setMatrixAt(k, matrix); }
      brush.add(bristles);
      for (let k = 0; k < 7; k++) { const ring = part(brush, new THREE.TorusGeometry(0.012 + random() * 0.016, 0.0009, 4, 20), hairMaterial, [jitter(0.012), 0.026 + random() * 0.006, jitter(0.025)]); ring.rotation.set(Math.PI / 2 + jitter(0.5), 0, random() * 3); }
      brush.position.set(heroX + 0.15, 0, heroZ + 0.0);
      brush.rotation.y = -0.5 + jitter(0.3);
      s.root.add(brush);
    } else {
      // Hairspray dominates: a small gel tub still tags along.
      gelTub(heroX + 0.01, heroZ + 0.02, 0.034, 0.042, gelColour, random() < 0.6);
    }

    // --- Teasing comb, front left (always present; the backcomb scene gets a second).
    teasingComb(-0.13 + jitter(0.015), (boxed ? 0.2 : 0.16) + jitter(0.015), 0.5 + jitter(0.35), a.product === 'backcomb' ? '#17151a' : pick(['#17151a', '#ff2e93', '#12c8d8', '#efe9d6']), 5 + Math.round(mood.wear * 6));

    // --- Kohl pencils, front right.
    const pencilCount = 2 + Math.round(mood.density * 3 + random());
    const lead = s.material('#0e0d10', { roughness: 0.8 });
    const wood = s.material('#d2a878', { roughness: 0.8 });
    const smears: { at: P3; size: number }[] = [];
    for (let k = 0; k < pencilCount; k++) {
      const length = a.kohl === 'fresh' ? mix(0.12, 0.15, random()) : a.kohl === 'stubs' ? mix(0.035, 0.07, random()) : mix(0.05, 0.08, random());
      const turn = -0.5 + jitter(0.5), r = 0.004;
      const x = 0.11 + k * 0.014 + jitter(0.01), z = (boxed ? 0.2 : 0.15) + k * 0.016 + jitter(0.008);
      const dx = Math.cos(turn), dz = -Math.sin(turn);
      const barrel = s.material(pick(['#101014', '#101014', '#3b1c5a', '#0f4a50', '#7a1420']), { roughness: 0.4 });
      const end = (t: number): P3 => [x + dx * t, r, z + dz * t];
      s.rod(end(-length / 2), end(length / 2), r, barrel);
      if (a.kohl !== 'snapped' || k % 2 === 0) {
        s.rod(end(length / 2), end(length / 2 + 0.01), r, wood, 0.0018);
        s.rod(end(length / 2 + 0.01), end(length / 2 + 0.015), 0.0018, lead, 0.0004);
      }
      s.rod(end(-length / 2 - 0.0005), end(-length / 2 + 0.006), r * 1.04, s.material('#d9b23a', { metalness: 0.7, roughness: 0.3 }));
      if (a.kohl === 'snapped') for (let j = 0; j < 5; j++) smears.push({ at: [x + dx * (length / 2 + 0.01 + j * 0.008) + jitter(0.003), 0.0004, z + dz * (length / 2 + 0.01 + j * 0.008) + jitter(0.003)], size: 0.004 + random() * 0.004 });
    }
    if (a.kohl === 'stubs') {
      s.box([0.022, 0.012, 0.014], [0.17, 0.006, boxed ? 0.26 : 0.22], s.material('#c4122f', { metalness: 0.5, roughness: 0.3 })).rotation.y = 0.5;
      for (let k = 0; k < 6; k++) { const curl = s.ring(0.005 + random() * 0.003, 0.0006, [0.16 + jitter(0.02), 0.004, (boxed ? 0.28 : 0.24) + jitter(0.018)], wood, Math.PI * (1 + random())); curl.rotation.set(random() * 3, random() * 3, 0); }
    }
    if (smears.length) {
      const flat = new THREE.CylinderGeometry(1, 1, 0.08, 10);
      const smear = s.scatter(flat, lead, smears);
      smear.castShadow = false;
    }

    // --- The plume.
    const puffs: { mesh: THREE.Mesh; base: THREE.Vector3; size: number; phase: number }[] = [];
    const origin = nozzleAt as THREE.Vector3 | null;
    if (origin) {
      const side = origin.x >= 0 ? 1 : -1;
      const direction = new THREE.Vector3(side * 0.82, 0.36, 0.3).normalize();
      const mist = pick(['#7f9bb8', '#8a9cb0', '#9a8fbc']);
      for (let k = 0; k < 8; k++) {
        const distance = 0.02 + k * 0.03, size = 0.008 + k * 0.0105;
        const base = origin.clone().addScaledVector(direction, distance).add(new THREE.Vector3(jitter(0.004 * k), jitter(0.004 * k) + k * k * 0.0006, jitter(0.004 * k)));
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: mist, roughness: 1, transparent: true, opacity: 0.3 - k * 0.02, depthWrite: false, emissive: '#ffffff', emissiveIntensity: 0.15 }));
        mesh.position.copy(base);
        mesh.scale.setScalar(size);
        s.root.add(mesh);
        puffs.push({ mesh, base, size, phase: random() * 6.3 });
      }
      const drops: { at: P3; size: number }[] = [];
      for (let k = 0; k < 70; k++) {
        const distance = 0.02 + random() * 0.24, spread = distance * 0.3;
        const p = origin.clone().addScaledVector(direction, distance).add(new THREE.Vector3(jitter(spread), jitter(spread), jitter(spread)));
        drops.push({ at: [p.x, Math.max(0.002, p.y), p.z], size: 0.0009 + random() * 0.0012 });
      }
      const droplets = s.scatter(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: '#f4f8fb', transparent: true, opacity: 0.75, depthWrite: false, emissive: '#ffffff', emissiveIntensity: 0.4 }), drops);
      droplets.castShadow = droplets.receiveShadow = false;
    }

    const energy = mood.energy;
    return s.finish({
      update: puffs.length ? (_dt, time) => {
        for (const puff of puffs) {
          const breathe = Math.sin(time * (2 + energy * 7) + puff.phase);
          puff.mesh.scale.setScalar(puff.size * (1 + breathe * (0.08 + energy * 0.2)));
          puff.mesh.position.y = puff.base.y + breathe * puff.size * 0.15 * (0.3 + energy);
        }
      } : undefined,
    });
  },
});
