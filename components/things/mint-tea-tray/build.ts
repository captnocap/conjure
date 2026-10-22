import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const TINTS = { gold: '#f2e6c4', cobalt: '#2f55c8', ruby: '#c8283a', emerald: '#1f9a62', plain: '#eef1ee' };
const MIXED = ['#2f55c8', '#c8283a', '#1f9a62', '#e09a1e', '#8a3cc0', '#19a6c4'];

export default defineThing({
  questions: {
    glasses: choice('How many tea glasses are on the tray?', {
      one: 'A single glass, tea alone.',
      two: 'Two glasses, a conversation.',
      four: 'Four glasses, a family or a deal.',
      six: 'Six glasses, a full welcome.',
    }),
    state: choice('What state is the tea in?', {
      poured: 'Freshly poured: full glasses with a froth on top and steam rising.',
      half: 'Half drunk, the glasses at different levels, still warm.',
      abandoned: 'Abandoned and cold: a glass on its side, a spill, the teapot lid left off.',
      waiting: 'Not yet served: clean glasses upside down, the pot steaming alone.',
    }),
    paint: choice('How are the glasses decorated?', {
      gold: 'Clear glass with gold filigree bands.',
      cobalt: 'Cobalt blue glass banded in gold.',
      ruby: 'Ruby red glass banded in gold.',
      emerald: 'Emerald green glass banded in gold.',
      mixed: 'A mismatched set, every glass a different colour.',
      plain: 'Plain cheap cafe tumblers with no decoration.',
    }),
    pot: choice('What is the teapot like?', {
      silver: 'A bulbous polished silver pot with a domed lid, the classic.',
      tall: 'A tall slender silver pot with a high pointed lid.',
      brass: 'A squat yellow brass pot, well used.',
      enamel: 'A chipped blue enamel kettle from a cafe kitchen.',
    }),
    mint: choice('Where is the mint?', {
      sprig: 'One fresh sprig lying on the tray.',
      glasses: 'Leaves stuffed into every glass.',
      bunch: 'A whole bunch heaped beside the pot.',
      none: 'No mint in sight.',
    }),
    sugar: choice('Is there sugar?', {
      none: 'No sugar on the tray.',
      cone: 'A tall white sugar cone half wrapped in blue paper.',
      lumps: 'A small dish of broken sugar lumps.',
    }),
    stand: choice('What does the tray rest on?', {
      folding: 'Folding legs of turned wood crossed beneath it.',
      tripod: 'Three splayed brass legs.',
      tiled: 'A low eight-sided table faced in zellige tile.',
    }),
    left: choice('What did the last person leave behind on the tray?', {
      nothing: 'Nothing.',
      coins: 'A few coins, the tea paid for.',
      spectacles: 'A folded newspaper with reading glasses on top.',
      ashtray: 'An ashtray with a cigarette still burning.',
    }),
    pouf: noul('Is a leather pouf pulled up beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const T = 0.43, R = 0.37;
    const brass = s.material('#c99a3c', { metalness: 0.8, roughness: 0.32, side: THREE.DoubleSide });
    const gold = s.material('#e0b84a', { metalness: 0.85, roughness: 0.25 });

    // Stand.
    if (a.stand === 'folding') {
      const wood = s.material('#5e3a22', { roughness: 0.7 });
      for (const z of [-0.2, 0.2]) {
        s.rod([-0.26, 0, z], [0.26, T - 0.01, z], 0.018, wood);
        s.rod([0.26, 0, z], [-0.26, T - 0.01, z], 0.018, wood);
        s.ball([0.03, 0.03, 0.03], [0, T / 2, z], wood, 10);
      }
      for (const x of [-0.26, 0.26]) { s.rod([x, T - 0.02, -0.22], [x, T - 0.02, 0.22], 0.016, wood); s.rod([x, 0.02, -0.22], [x, 0.02, 0.22], 0.014, wood); }
      s.rod([0, T / 2, -0.2], [0, T / 2, 0.2], 0.012, wood);
    } else if (a.stand === 'tripod') {
      for (let k = 0; k < 3; k++) {
        const angle = k * Math.PI * 2 / 3 + 0.5;
        s.tube([[Math.cos(angle) * 0.2, T - 0.01, Math.sin(angle) * 0.2], [Math.cos(angle) * 0.1, T * 0.5, Math.sin(angle) * 0.1], [Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3]], 0.014, brass);
      }
      s.ring(0.21, 0.012, [0, T - 0.015, 0], brass).rotation.x = Math.PI / 2;
      s.ring(0.11, 0.008, [0, T * 0.5, 0], brass).rotation.x = Math.PI / 2;
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 128;
      const g = canvas.getContext('2d')!;
      const inks = ['#1f5fa8', '#f1ead6', '#1f8a6b', '#d9a12a'];
      for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) {
        g.fillStyle = inks[(x + y * 2) % 2]; g.fillRect(x * 32, y * 32, 32, 32);
        g.fillStyle = inks[2 + (x + y) % 2];
        g.save(); g.translate(x * 32 + 16, y * 32 + 16); g.rotate(Math.PI / 4); g.fillRect(-8, -8, 16, 16); g.restore();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, T - 0.06, 8), [new THREE.MeshStandardMaterial({ map: texture, roughness: 0.4 }), s.material('#5e3a22'), s.material('#5e3a22')]);
      drum.position.y = (T - 0.06) / 2 + 0.04;
      drum.castShadow = true;
      s.root.add(drum);
      s.cylinder(0.31, 0.31, 0.04, [0, 0.02, 0], s.material('#5e3a22'), 8);
      s.cylinder(0.32, 0.32, 0.025, [0, T - 0.012, 0], s.material('#5e3a22'), 8);
    }

    // Tray with an engraved face.
    s.lathe([[0, 0], [R - 0.04, 0], [R - 0.012, 0.012], [R, 0.04], [R + 0.012, 0.04]], brass, [0, T, 0]);
    const face = document.createElement('canvas');
    face.width = face.height = 256;
    const g = face.getContext('2d')!;
    g.fillStyle = '#d2a444'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#7a5a1c'; g.lineWidth = 2.5;
    for (const r of [122, 112, 78, 70, 30]) { g.beginPath(); g.arc(128, 128, r, 0, 7); g.stroke(); }
    for (let k = 0; k < 16; k++) {
      const angle = k * Math.PI / 8;
      g.beginPath(); g.moveTo(128 + Math.cos(angle) * 30, 128 + Math.sin(angle) * 30); g.lineTo(128 + Math.cos(angle + 0.2) * 70, 128 + Math.sin(angle + 0.2) * 70); g.lineTo(128 + Math.cos(angle + 0.39) * 30, 128 + Math.sin(angle + 0.39) * 30); g.stroke();
      g.beginPath(); g.arc(128 + Math.cos(angle) * 95, 128 + Math.sin(angle) * 95, 13, 0, 7); g.stroke();
    }
    const faceTexture = new THREE.CanvasTexture(face);
    faceTexture.colorSpace = THREE.SRGBColorSpace;
    const top = T + 0.004;
    s.mesh(new THREE.CircleGeometry(R - 0.035, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: faceTexture, metalness: 0.7, roughness: 0.35 }), [0, top, 0]);

    const puffs: { mesh: THREE.Mesh; x: number; y: number; phase: number; rise: number }[] = [];
    const vapour = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false });
    const steam = (x: number, y: number, z: number, strength: number) => {
      for (let k = 0; k < 4; k++) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.018 + k * 0.012, 8, 6), vapour);
        mesh.position.set(x + (random() - 0.5) * 0.03, y + 0.03 + k * 0.055 * strength, z + (random() - 0.5) * 0.03);
        s.root.add(mesh);
        puffs.push({ mesh, x: mesh.position.x, y: mesh.position.y, phase: random() * 6, rise: 0.02 * strength });
      }
    };

    // Teapot.
    const potPaint = {
      silver: s.material('#d9dcdf', { metalness: 0.92, roughness: 0.2 }),
      tall: s.material('#d9dcdf', { metalness: 0.92, roughness: 0.2 }),
      brass: s.material('#c9973a', { metalness: 0.75, roughness: 0.4 }),
      enamel: s.material('#2a55a8', { metalness: 0.1, roughness: 0.3 }),
    }[a.pot];
    const pot = new THREE.Group();
    const potMesh = (mesh: THREE.Mesh) => { mesh.removeFromParent(); pot.add(mesh); return mesh; };
    const tallness = a.pot === 'tall' ? 1.35 : a.pot === 'brass' ? 0.85 : 1;
    const girth = a.pot === 'tall' ? 0.82 : a.pot === 'brass' ? 1.12 : 1;
    const body: [number, number][] = [[0.045, 0], [0.052, 0.008], [0.04, 0.022], [0.085, 0.06], [0.096, 0.1], [0.082, 0.14], [0.056, 0.165], [0.052, 0.176]];
    const lid: [number, number][] = [[0.054, 0], [0.05, 0.012], [0.036, 0.04], [0.018, 0.062], [0.008, 0.075], [0.016, 0.086], [0.006, 0.1], [0, 0.102]];
    potMesh(s.lathe(body.map(([x, y]) => [x * girth, y * tallness] as const), potPaint));
    const lidMesh = potMesh(s.lathe(lid.map(([x, y]) => [x * girth, y * (a.pot === 'tall' ? 1.5 : 1)] as const), potPaint, [0, 0.176 * tallness, 0]));
    const hip = 0.085 * girth;
    potMesh(s.tube([[hip * 0.9, 0.07 * tallness, 0], [hip + 0.06, 0.075 * tallness, 0], [hip + 0.085, 0.14 * tallness, 0], [hip + 0.13, 0.2 * tallness, 0]], 0.011, potPaint));
    potMesh(s.tube([[-hip * 0.6, 0.165 * tallness, 0], [-hip - 0.06, 0.17 * tallness, 0], [-hip - 0.075, 0.1 * tallness, 0], [-hip * 0.95, 0.06 * tallness, 0]], 0.009, potPaint));
    if (a.pot !== 'enamel') for (const y of [0.1, 0.14]) potMesh(s.ring(0.093 * girth * (y > 0.12 ? 0.87 : 1), 0.004, [0, y * tallness, 0], gold)).rotation.x = Math.PI / 2;
    pot.scale.setScalar(1.25);
    pot.position.set(-0.1, top, -0.1);
    pot.rotation.y = -0.5 + random() * 0.6;
    s.root.add(pot);
    if (a.state === 'abandoned') {
      lidMesh.removeFromParent();
      lidMesh.scale.setScalar(1.25);
      lidMesh.position.set(-0.27, top + 0.03, 0.08);
      lidMesh.rotation.set(1.9, 0, 0.4);
      s.root.add(lidMesh);
    } else {
      const tip = new THREE.Vector3(hip + 0.13, 0.2 * tallness, 0).multiplyScalar(1.25).applyAxisAngle(new THREE.Vector3(0, 1, 0), pot.rotation.y);
      steam(-0.1 + tip.x, top + tip.y, -0.1 + tip.z, a.state === 'half' ? 0.6 : 1.2);
    }

    // Glasses.
    const count = { one: 1, two: 2, four: 4, six: 6 }[a.glasses];
    const tea = s.material('#b9791a', { roughness: 0.25, emissive: '#b9791a', emissiveIntensity: 0.3 });
    const froth = s.material('#ecd9a8', { roughness: 1 });
    const leaf = s.material('#3f9a3a', { roughness: 0.8 });
    const leaves: { at: [number, number, number]; size: number; color: string }[] = [];
    const tipped = a.state === 'abandoned' ? Math.floor(random() * count) : -1;
    for (let i = 0; i < count; i++) {
      const angle = count === 1 ? 0.9 : mix(-0.5, 2.3, i / (count - 1)) + (random() - 0.5) * 0.12;
      const d = 0.22 + (random() - 0.5) * 0.03;
      const x = Math.sin(angle) * d + 0.03, z = Math.cos(angle) * d;
      const tint = a.paint === 'mixed' ? MIXED[Math.floor(random() * MIXED.length)] : TINTS[a.paint];
      const glass = new THREE.MeshStandardMaterial({ color: tint, transparent: true, opacity: a.paint === 'gold' || a.paint === 'plain' ? 0.3 : 0.62, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false });
      const group = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, y: number) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = y; mesh.castShadow = true;
        group.add(mesh);
        return mesh;
      };
      const h = 0.1, rt = 0.034, rb = 0.026;
      add(new THREE.CylinderGeometry(rt, rb, h, 14, 1, true), glass, h / 2);
      add(new THREE.CylinderGeometry(rb, rb, 0.008, 14), a.paint === 'plain' ? s.material('#c9d0cc') : gold, 0.004);
      if (a.paint !== 'plain') {
        add(new THREE.CylinderGeometry(rt + 0.001, rt - 0.001, 0.012, 14, 1, true), gold, h - 0.008);
        add(new THREE.CylinderGeometry(rb + 0.0055, rb + 0.004, 0.02, 14, 1, true), gold, h * 0.45);
      }
      const level = a.state === 'poured' ? 0.85 : a.state === 'half' ? 0.2 + random() * 0.55 : a.state === 'abandoned' && i !== tipped ? 0.15 + random() * 0.5 : 0;
      if (level > 0) {
        const lr = mix(rb, rt, level) - 0.003;
        add(new THREE.CylinderGeometry(lr, rb - 0.003, h * level, 12), tea, h * level / 2 + 0.006);
        if (a.state === 'poured') add(new THREE.CylinderGeometry(lr, lr, 0.008, 12), froth, h * level + 0.008);
      }
      group.position.set(x, top, z);
      if (a.state === 'waiting') { group.rotation.x = Math.PI; group.position.y = top + h; }
      if (i === tipped) {
        group.rotation.set(0, random() * 6, Math.PI / 2, 'YXZ');
        group.position.y = top + rt;
        s.cylinder(0.055, 0.055, 0.003, [x * 0.8, top + 0.002, z * 0.8], tea, 18).scale.set(1.3, 1, 0.8);
      }
      s.root.add(group);
      if (a.mint === 'glasses' && a.state !== 'waiting' && i !== tipped)
        for (let k = 0; k < 5; k++) leaves.push({ at: [x + (random() - 0.5) * 0.04, top + h + random() * 0.035, z + (random() - 0.5) * 0.04], size: 0.9 + random() * 0.5, color: random() < 0.5 ? '#3f9a3a' : '#5cb84a' });
      if (a.state === 'poured') steam(x, top + h, z, 0.8);
    }
    if (a.mint === 'sprig' || a.mint === 'bunch') {
      const stems = a.mint === 'bunch' ? 7 : 1;
      for (let k = 0; k < stems; k++) {
        const x0 = 0.02 + (random() - 0.5) * 0.06, z0 = -0.26 + k * 0.012, turn = -0.3 + (random() - 0.5) * 0.5, y = top + 0.012 + k * 0.008;
        const x1 = x0 + Math.cos(turn) * 0.24, z1 = z0 + Math.sin(turn) * 0.24;
        s.rod([x0, y, z0], [x1, y, z1], 0.004, leaf);
        for (let j = 0; j < 9; j++) {
          const t = 0.2 + j / 9 * 0.85, side = j % 2 ? 1 : -1;
          leaves.push({ at: [mix(x0, x1, t) - Math.sin(turn) * side * 0.02, y + 0.006 + random() * 0.012, mix(z0, z1, t) + Math.cos(turn) * side * 0.02], size: 1.5 - t * 0.6, color: random() < 0.5 ? '#3f9a3a' : '#5cb84a' });
        }
      }
    }
    if (leaves.length) s.scatter(new THREE.SphereGeometry(0.016, 6, 4).scale(1, 0.3, 0.65), s.material('#ffffff', { roughness: 0.8 }), leaves);

    if (a.sugar === 'cone') {
      const sx = -0.22, sz = 0.12;
      s.lathe([[0.055, 0], [0.016, 0.2], [0.008, 0.215], [0, 0.22]], s.material('#fbfaf5', { roughness: 0.9 }), [sx, top, sz]);
      s.lathe([[0.059, 0], [0.036, 0.11]], s.material('#2b4fa0', { roughness: 0.8, side: THREE.DoubleSide }), [sx, top, sz]);
    } else if (a.sugar === 'lumps') {
      s.lathe([[0, 0], [0.05, 0.004], [0.075, 0.03]], brass, [-0.22, top, 0.12]);
      const white = s.material('#fbfaf5', { roughness: 0.9 });
      for (let k = 0; k < 7; k++) s.box([0.022, 0.018, 0.026], [-0.22 + (random() - 0.5) * 0.07, top + 0.018 + random() * 0.02, 0.12 + (random() - 0.5) * 0.07], white).rotation.set(random(), random() * 3, random());
    }

    const lx = 0.14, lz = -0.2;
    if (a.left === 'coins') {
      const silver = s.material('#c9cccf', { metalness: 0.9, roughness: 0.3 });
      for (let k = 0; k < 5; k++) s.cylinder(0.014, 0.014, 0.003, [lx + (random() - 0.5) * 0.1, top + 0.003 + (k % 2) * 0.003, lz + (random() - 0.5) * 0.08], k % 2 ? gold : silver, 12);
    } else if (a.left === 'spectacles') {
      const paper = s.label('LE MATIN', 0.2, 0.14, [lx, top + 0.016, lz], '#2a2a2a', '#e6e1d2');
      paper.rotation.set(-Math.PI / 2, 0, 0.4);
      s.box([0.2, 0.012, 0.14], [lx, top + 0.008, lz], s.material('#e6e1d2')).rotation.y = 0.4;
      const wire = s.material('#2b2b2e', { metalness: 0.7 });
      for (const side of [-1, 1]) {
        s.ring(0.022, 0.003, [lx + side * 0.027, top + 0.022, lz + 0.01], wire).rotation.x = Math.PI / 2;
        s.rod([lx + side * 0.05, top + 0.022, lz + 0.01], [lx + side * 0.03, top + 0.022, lz - 0.07], 0.002, wire);
      }
    } else if (a.left === 'ashtray') {
      s.lathe([[0, 0], [0.04, 0.003], [0.052, 0.02], [0.046, 0.02]], s.material('#7d8a8c', { metalness: 0.5, side: THREE.DoubleSide }), [lx, top, lz]);
      s.rod([lx - 0.01, top + 0.02, lz], [lx + 0.06, top + 0.028, lz + 0.02], 0.004, s.material('#f5f2ea'));
      s.ball([0.005, 0.005, 0.005], [lx - 0.012, top + 0.02, lz - 0.001], s.material('#ff6a1e', { emissive: '#ff5a10', emissiveIntensity: 1.5 }), 6);
      steam(lx - 0.012, top + 0.02, lz, 0.9);
    }

    if (a.pouf) {
      const hide = s.material(mood.warmth > 0.5 ? '#b8622e' : '#8a5a3a', { roughness: 0.7 });
      const px = R + 0.38, pz = 0.1 + random() * 0.2;
      s.lathe([[0, 0], [0.2, 0], [0.27, 0.05], [0.29, 0.15], [0.27, 0.25], [0.2, 0.3], [0.06, 0.31], [0, 0.3]], hide, [px, 0, pz]);
      const stitch = s.material('#ecd9a8');
      for (let k = 0; k < 8; k++) s.rod([px, 0.312, pz], [px + Math.cos(k * Math.PI / 4) * 0.21, 0.3, pz + Math.sin(k * Math.PI / 4) * 0.21], 0.004, stitch);
      s.ring(0.292, 0.006, [px, 0.15, pz], stitch).rotation.x = Math.PI / 2;
    }

    const drift = mix(0.4, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const puff of puffs) {
          const t = (time * 0.35 * drift + puff.phase) % 1;
          puff.mesh.position.y = puff.y + t * puff.rise * 3;
          puff.mesh.position.x = puff.x + Math.sin(time * 1.3 + puff.phase) * 0.008;
        }
      },
    });
  },
});
