import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** An object that lies flat against the plate: built in the xy plane with its back at z = 0. */
interface Stuck { group: THREE.Group; radius: number }

export default defineThing({
  questions: {
    count: score('How much is stuck to it?', ['A few things', 'A dozen', 'Crowded', 'Covered edge to edge']),
    what: choice('What kind of things are stuck?', {
      tools: 'Only tools: wrenches, hammers, screwdrivers, pliers.',
      chair: 'Tools and a steel folding chair, pinned flat.',
      extinguisher: 'Tools and a red fire extinguisher stuck sideways.',
      belongings: 'Someone\'s belongings: keys, a lunchbox, a mug, a clipboard, scissors.',
      everything: 'Everything: tools, the chair, the extinguisher, the lunchbox, the lot.',
    }),
    plate: choice('What is the plate like?', {
      steel: 'Bare grey steel with mill scale.',
      blue: 'Painted magnet blue, chipped.',
      yellow: 'Painted safety yellow.',
      rust: 'Rust-streaked old iron.',
      green: 'Painted machine green.',
    }),
    stand: choice('What is the plate part of?', {
      pole: 'The pole face of a huge steel block behind it.',
      wall: 'A plate on steel brackets, like a wall.',
      door: 'A steel door with hinges and a handle.',
    }),
    sign: choice('What sign is on it?', {
      none: 'No sign.',
      danger: 'A yellow DANGER STRONG MAGNETIC FIELD sign.',
      ferrous: 'A white sign: NO FERROUS OBJECTS BEYOND THIS LINE.',
      tally: 'A chalked tally: TOOLS LOST 47.',
    }),
    shoe: noul('Is there a dropped shoe on the floor at the foot of it?'),
    stripe: noul('Is there a yellow and black stripe along the bottom edge?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { random } = context;
    const PW = 1.8, PH = 2.2, PT = 0.14;
    const steel = s.material('#8a9096', { metalness: 0.7, roughness: 0.35 });
    const dark = s.material('#2a2c30', { roughness: 0.6 });
    const red = s.material('#c8302c', { roughness: 0.5 });
    const wood = s.material('#a9743f', { roughness: 0.7 });
    const plateColour = { steel: '#767c82', blue: '#2f5aa8', yellow: '#e8b820', rust: '#7a4a30', green: '#3f7a5a' }[a.plate];
    const plate = s.material(plateColour, { metalness: a.plate === 'steel' ? 0.75 : 0.25, roughness: a.plate === 'rust' ? 0.95 : 0.5 });

    // The plate and what it is part of.
    const plateY = 0.1 + PH / 2;
    s.box([PW, PH, PT], [0, plateY, 0], plate);
    s.box([PW + 0.1, 0.1, 0.5], [0, 0.05, -0.1], dark);
    if (a.stand === 'pole') {
      s.box([PW - 0.2, PH - 0.3, 1.2], [0, plateY, -0.65], steel);
      for (let i = 0; i < 6; i++) s.cylinder(0.04, 0.04, 0.03, [-PW / 2 + 0.2 + i * (PW - 0.4) / 5, 0.1 + PH - 0.15, PT / 2 + 0.015], dark, 10).rotation.x = Math.PI / 2;
    } else if (a.stand === 'wall') {
      for (const x of [-0.7, 0.7]) {
        s.box([0.1, PH, 0.1], [x, plateY, -PT / 2 - 0.05], dark);
        const strut = s.box([0.08, 1.6, 0.08], [x, 0.7, -0.6], dark);
        strut.rotation.x = -0.65;
      }
    } else {
      s.box([PW + 0.24, PH + 0.12, 0.06], [0, plateY + 0.06, -PT / 2 - 0.02], dark);
      for (const y of [0.5, 1.4, 2.2]) s.cylinder(0.035, 0.035, 0.18, [-PW / 2 - 0.05, y, 0], steel, 10);
      s.box([0.05, 0.3, 0.05], [PW / 2 - 0.18, 1.1, PT / 2 + 0.05], steel);
      s.box([0.05, 0.05, 0.1], [PW / 2 - 0.18, 1.0, PT / 2 + 0.03], steel);
      s.box([0.05, 0.05, 0.1], [PW / 2 - 0.18, 1.2, PT / 2 + 0.03], steel);
    }
    if (a.stripe) {
      const stripes = paint(512, 48, (ctx) => {
        ctx.fillStyle = '#f2c21b';
        ctx.fillRect(0, 0, 512, 48);
        ctx.fillStyle = '#1d1d1f';
        for (let x = -48; x < 560; x += 96) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 48, 0); ctx.lineTo(x + 96, 48); ctx.lineTo(x + 48, 48); ctx.closePath(); ctx.fill();
        }
      });
      s.mesh(new THREE.PlaneGeometry(PW, 0.14), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6 }), [0, 0.18, PT / 2 + 0.002]);
    }

    // Builders for stuck things.
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], rot: [number, number, number] = [0, 0, 0]) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(...at);
      m.rotation.set(...rot);
      m.castShadow = m.receiveShadow = true;
      return m;
    };
    const wrench = (): Stuck => {
      const g = new THREE.Group();
      const L = 0.22 + random() * 0.12;
      g.add(mesh(new THREE.BoxGeometry(0.03, L, 0.012), steel, [0, 0, 0.006]));
      for (const end of [-1, 1]) {
        g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 14), steel, [0, end * (L / 2 + 0.01), 0.006], [Math.PI / 2, 0, 0]));
        g.add(mesh(new THREE.BoxGeometry(0.022, 0.03, 0.014), dark, [0, end * (L / 2 + 0.03), 0.006], [0, 0, end * 0.4]));
      }
      return { group: g, radius: L / 2 + 0.04 };
    };
    const hammer = (): Stuck => {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.014, 0.017, 0.3, 10), wood, [0, -0.05, 0.015]));
      g.add(mesh(new THREE.BoxGeometry(0.11, 0.04, 0.04), steel, [0, 0.12, 0.02]));
      return { group: g, radius: 0.17 };
    };
    const screwdriver = (): Stuck => {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.1, 10), s.material(random() < 0.5 ? '#c8302c' : '#e8b820', { roughness: 0.5 }), [0, -0.05, 0.014]));
      g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 6), steel, [0, 0.07, 0.014]));
      return { group: g, radius: 0.13 };
    };
    const pliers = (): Stuck => {
      const g = new THREE.Group();
      for (const side of [-1, 1]) {
        const arm = mesh(new THREE.BoxGeometry(0.014, 0.2, 0.01), steel, [side * 0.015, -0.03, 0.005], [0, 0, side * 0.18]);
        g.add(arm);
        g.add(mesh(new THREE.BoxGeometry(0.018, 0.09, 0.014), red, [side * 0.03, -0.1, 0.007], [0, 0, side * 0.18]));
      }
      g.add(mesh(new THREE.BoxGeometry(0.03, 0.05, 0.012), dark, [0, 0.08, 0.006]));
      return { group: g, radius: 0.14 };
    };
    const keys = (): Stuck => {
      const g = new THREE.Group();
      g.add(mesh(new THREE.TorusGeometry(0.022, 0.003, 6, 16), steel, [0, 0, 0.004]));
      for (let i = 0; i < 3; i++) g.add(mesh(new THREE.BoxGeometry(0.012, 0.05, 0.003), i ? steel : s.material('#c9a44a', { metalness: 0.7, roughness: 0.3 }), [Math.sin(i * 0.8) * 0.03, -0.03 - Math.cos(i * 0.8) * 0.02, 0.003], [0, 0, i * 0.8 - 0.8]));
      return { group: g, radius: 0.06 };
    };
    const clipboard = (): Stuck => {
      const g = new THREE.Group();
      g.add(mesh(new THREE.BoxGeometry(0.23, 0.32, 0.012), s.material('#7a5a3a', { roughness: 0.7 }), [0, 0, 0.006]));
      g.add(mesh(new THREE.BoxGeometry(0.21, 0.29, 0.004), s.material('#f2f0e8', { roughness: 0.9 }), [0, -0.01, 0.014]));
      g.add(mesh(new THREE.BoxGeometry(0.1, 0.035, 0.025), steel, [0, 0.145, 0.016]));
      return { group: g, radius: 0.2 };
    };
    const mug = (): Stuck => {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.095, 16), steel, [0, 0, 0.04], [Math.PI / 2, 0, 0]));
      g.add(mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 16), steel, [0.045, 0, 0.04], [Math.PI / 2, 0, 0]));
      return { group: g, radius: 0.07 };
    };
    const scissors = (): Stuck => {
      const g = new THREE.Group();
      for (const side of [-1, 1]) {
        g.add(mesh(new THREE.BoxGeometry(0.012, 0.16, 0.004), steel, [side * 0.01, 0.05, 0.002], [0, 0, side * 0.12]));
        g.add(mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 16), s.material('#e8732a'), [side * 0.028, -0.06, 0.003]));
      }
      return { group: g, radius: 0.13 };
    };
    const lunchbox = (): Stuck => {
      const g = new THREE.Group();
      g.add(mesh(new THREE.BoxGeometry(0.26, 0.18, 0.1), s.material('#2a62b8', { roughness: 0.5 }), [0, 0, 0.05]));
      g.add(mesh(new THREE.BoxGeometry(0.26, 0.012, 0.102), dark, [0, 0.05, 0.05]));
      g.add(mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 16, Math.PI), dark, [0, 0.09, 0.05]));
      return { group: g, radius: 0.17 };
    };
    const chair = (): Stuck => {
      const g = new THREE.Group();
      const tube = s.material('#6d7378', { metalness: 0.7, roughness: 0.35 });
      const seat = s.material('#4a4e55', { roughness: 0.6 });
      // Folded flat: two leg frames, a seat and a back, all pressed against the plate.
      for (const side of [-1, 1]) {
        g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 8), tube, [side * 0.2, 0, 0.03]));
        g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 8), tube, [side * 0.17, -0.05, 0.06], [0, 0, side * 0.08]));
      }
      g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8), tube, [0, 0.4, 0.03], [0, 0, Math.PI / 2]));
      g.add(mesh(new THREE.BoxGeometry(0.4, 0.14, 0.02), seat, [0, 0.3, 0.04]));
      g.add(mesh(new THREE.BoxGeometry(0.4, 0.36, 0.02), seat, [0, -0.12, 0.07]));
      return { group: g, radius: 0.45 };
    };
    const extinguisher = (): Stuck => {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.5, 18), red, [0, -0.04, 0.08]));
      g.add(mesh(new THREE.SphereGeometry(0.075, 18, 10), red, [0, 0.21, 0.08]));
      g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 10), steel, [0, 0.3, 0.08]));
      g.add(mesh(new THREE.BoxGeometry(0.03, 0.03, 0.12), dark, [0.03, 0.35, 0.08], [0, 0, -0.4]));
      g.add(mesh(new THREE.BoxGeometry(0.1, 0.12, 0.004), s.material('#f2f0e8'), [0, 0.0, 0.157]));
      g.add(mesh(new THREE.TorusGeometry(0.06, 0.01, 6, 20, Math.PI * 1.3), dark, [0.05, -0.15, 0.15], [0, 0, 0.6]));
      return { group: g, radius: 0.38 };
    };
    const tools = [wrench, wrench, hammer, screwdriver, pliers, wrench, screwdriver];
    const things = [keys, clipboard, mug, scissors, lunchbox, keys];
    let pool: (() => Stuck)[];
    const big: (() => Stuck)[] = [];
    if (a.what === 'tools') pool = tools;
    else if (a.what === 'belongings') pool = [...things, screwdriver];
    else pool = [...tools, ...things];
    if (a.what === 'chair' || a.what === 'everything') big.push(chair);
    if (a.what === 'extinguisher' || a.what === 'everything') big.push(extinguisher);

    // Scatter them, rejecting overlaps, big things first.
    const total = Math.round(mix(5, 28, a.count));
    const placed: { x: number; y: number; r: number }[] = [];
    const face = PT / 2;
    const tryPlace = (make: () => Stuck, size = 1, tries = 30) => {
      const stuck = make();
      stuck.radius *= size;
      stuck.group.scale.setScalar(size);
      for (let i = 0; i < tries; i++) {
        const x = (random() - 0.5) * (PW - stuck.radius * 2 - 0.1);
        const y = 0.1 + stuck.radius + 0.1 + random() * (PH - stuck.radius * 2 - 0.25);
        if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < (p.r + stuck.radius) * 0.72)) continue;
        placed.push({ x, y, r: stuck.radius });
        stuck.group.position.set(x, y, face);
        stuck.group.rotation.z = random() * Math.PI * 2;
        stuck.group.rotation.x = (random() - 0.5) * 0.12;
        s.root.add(stuck.group);
        return true;
      }
      return false;
    };
    for (const make of big) tryPlace(make);
    for (let i = 0; i < total; i++) tryPlace(pool[Math.floor(random() * pool.length)], 1.35);

    // Sign, shoe.
    if (a.sign !== 'none') {
      const text = { danger: 'DANGER  STRONG MAGNETIC FIELD', ferrous: 'NO FERROUS OBJECTS BEYOND THIS LINE', tally: 'TOOLS LOST: 47' }[a.sign as 'danger' | 'ferrous' | 'tally'];
      const ink = a.sign === 'danger' ? '#1d1d1f' : a.sign === 'ferrous' ? '#b3261e' : '#f0ede4';
      const paper = a.sign === 'danger' ? '#f2c21b' : a.sign === 'ferrous' ? '#f4f2ec' : plateColour;
      const sign = s.label(text, 0.9, 0.2, [0.3, 0.1 + PH - 0.22, face + 0.004], ink, paper);
      sign.rotation.z = a.sign === 'tally' ? -0.08 : (random() - 0.5) * 0.08;
      if (a.sign === 'danger') {
        const tri = paint(128, 128, (ctx) => {
          ctx.fillStyle = '#f2c21b'; ctx.fillRect(0, 0, 128, 128);
          ctx.fillStyle = '#1d1d1f'; ctx.beginPath(); ctx.moveTo(64, 8); ctx.lineTo(122, 116); ctx.lineTo(6, 116); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#f2c21b'; ctx.beginPath(); ctx.moveTo(64, 28); ctx.lineTo(108, 106); ctx.lineTo(20, 106); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#1d1d1f'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(64, 78, 18, Math.PI, 0); ctx.stroke();
          ctx.fillStyle = '#1d1d1f'; ctx.fillRect(40, 78, 12, 18); ctx.fillRect(76, 78, 12, 18);
        });
        s.mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshStandardMaterial({ map: tri, roughness: 0.6 }), [-0.45, 0.1 + PH - 0.22, face + 0.004]);
      }
    }
    if (a.shoe) {
      const shoe = s.material(['#2a2a2c', '#8d6b4f', '#e8e4dc'][Math.floor(random() * 3)], { roughness: 0.7 });
      const sx = (random() - 0.5) * 1.2, sz = face + 0.25 + random() * 0.2;
      const sole = s.box([0.1, 0.03, 0.27], [sx, 0.015, sz], dark);
      sole.rotation.y = random() * Math.PI;
      const upper = s.ball([0.045, 0.045, 0.12], [sx, 0.055, sz], shoe, 12);
      upper.rotation.y = sole.rotation.y;
      upper.position.x += Math.sin(sole.rotation.y) * 0.03;
      upper.position.z += Math.cos(sole.rotation.y) * 0.03;
    }

    return s.finish({ footprint: 1.0 });
  },
});
