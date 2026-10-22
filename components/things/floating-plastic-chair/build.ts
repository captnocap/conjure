import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { flood } from './flood';

const COLOURS = {
  white: 'Chalky white gone slightly yellow, the default of every tea stall.',
  red: 'Bright tomato red, a wedding-hire chair.',
  blue: 'Deep royal blue, schoolyard and clinic.',
  green: 'Bottle green, a garden and courtyard chair.',
  pink: 'Bubblegum pink, cheerful and a little absurd.',
  brown: 'Chocolate brown pretending to be wood.',
} as const;
const TINT: Record<keyof typeof COLOURS, string> = { white: '#ece6d6', red: '#c8372c', blue: '#2a4f9e', green: '#2f6d4a', pink: '#e2779a', brown: '#6b4530' };

type V3 = readonly [number, number, number];

export default defineThing({
  questions: {
    colour: choice('What colour is the plastic chair?', COLOURS),
    pose: choice('How is the chair lying in the water?', {
      side: 'Tipped on its side, half under, drifting slowly.',
      capsized: 'Upside down, four legs sticking up out of the water like a dead beetle.',
      upright: 'Standing upright on the drowned street, seat just clear of the water, as if someone might still sit in it.',
      back: 'Flat on its back, legs pointing at the sky, seat facing up like a small boat.',
    }),
    back: choice('What is the chair back like?', {
      slats: 'Tall vertical slots, the classic monobloc.',
      fan: 'A fan of radiating slots, slightly fancy.',
      solid: 'A solid back with one hand-hole at the top.',
      lattice: 'A cane-pattern lattice of small diamond holes.',
    }),
    arms: choice('Does it have armrests?', {
      arms: 'Yes, curved armrests running into the front legs.',
      armless: 'No, a plain armless stacking chair.',
      child: 'It is a tiny child-size chair with stubby arms.',
    }),
    damage: choice('What state is the chair itself in?', {
      whole: 'Whole and unbroken, it will be rinsed and used again.',
      'snapped-leg': 'One leg snapped off, the stump jagged and the broken piece floating nearby.',
      'split-back': 'The back split down the middle from the top.',
      mended: 'Already mended long before the flood, bound with wire and black tape.',
    }),
    alongside: choice('What floats alongside it?', {
      sandals: 'A scatter of rubber flip-flops in bright colours, none of them a pair.',
      football: 'A scuffed black-and-white football turning slowly.',
      pot: 'An aluminium cooking pot riding like a little boat, its lid nearby.',
      bottles: 'Plastic bottles and a jerry can herded together by the current.',
      schoolbag: 'A soaked school backpack and a few exercise books.',
      marigolds: 'Loose marigold heads and a broken garland from someone\'s shrine.',
      nothing: 'Nothing but leaves and scum.',
    }),
    rider: choice('Has anything climbed onto the chair?', {
      nothing: 'Nothing, it drifts empty.',
      crow: 'A black crow perched on the highest point, watching.',
      frog: 'A fat green frog sitting on it.',
      kitten: 'A soaked ginger kitten clinging on.',
      cloth: 'A checked cotton towel left draped over it.',
    }),
    motion: choice('What is the water doing to it?', {
      still: 'Dead still, rings spreading from it in mirror-calm water.',
      drifting: 'Drifting on a slow current, leaving a small wake.',
      snagged: 'Snagged on a submerged branch that pokes up beside it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const plastic = s.material(TINT[a.colour], { roughness: 0.42 });
    const dark = s.material('#1d1c1b', { roughness: 0.7 });
    const child = a.arms === 'child';
    const k = child ? 0.62 : 1;

    // ---- the chair, built upright at the origin, then tipped into the water ----
    const chair = new THREE.Group();
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = chair) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const limb = (from: V3, to: V3, r0: number, r1: number, material: THREE.Material, parent: THREE.Object3D = chair, sides = 4) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p);
      const mesh = part(new THREE.CylinderGeometry(r1, r0, d.length(), sides), material, parent);
      mesh.position.copy(p.add(q).multiplyScalar(0.5));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      mesh.rotateY(Math.PI / 4);
      return mesh;
    };
    const seatY = 0.43, w = 0.23, d = 0.21;
    const feet: V3[] = [[-0.265, 0, 0.26], [0.265, 0, 0.26], [-0.25, 0, -0.27], [0.25, 0, -0.27]];
    const tops: V3[] = [[-w + 0.02, seatY, d - 0.02], [w - 0.02, seatY, d - 0.02], [-w + 0.02, seatY, -d + 0.02], [w - 0.02, seatY, -d + 0.02]];
    const broken = a.damage === 'snapped-leg' ? Math.floor(random() * 2) : -1;
    let stump: THREE.Mesh | null = null;
    feet.forEach((foot, index) => {
      if (index === broken) {
        const mid: V3 = [mix(tops[index][0], foot[0], 0.4), mix(seatY, 0, 0.4), mix(tops[index][2], foot[2], 0.4)];
        limb(mid, tops[index], 0.03, 0.042, plastic);
        stump = limb([0, 0, 0], [0.02, 0.26, 0], 0.022, 0.03, plastic, s.root);
      } else limb(foot, tops[index], 0.022, 0.042, plastic);
    });
    // Seat: a rounded slab with a rolled front edge and an apron under it.
    const seatShape = new THREE.Shape();
    const round = (shape: THREE.Shape, x0: number, y0: number, x1: number, y1: number, r: number) => {
      shape.moveTo(x0 + r, y0); shape.lineTo(x1 - r, y0); shape.quadraticCurveTo(x1, y0, x1, y0 + r); shape.lineTo(x1, y1 - r);
      shape.quadraticCurveTo(x1, y1, x1 - r, y1); shape.lineTo(x0 + r, y1); shape.quadraticCurveTo(x0, y1, x0, y1 - r); shape.lineTo(x0, y0 + r); shape.quadraticCurveTo(x0, y0, x0 + r, y0);
    };
    round(seatShape, -w, -d, w, d, 0.06);
    const seat = part(new THREE.ExtrudeGeometry(seatShape, { depth: 0.028, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 }), plastic);
    seat.rotation.x = -Math.PI / 2;
    seat.position.y = seatY;
    const roll = part(new THREE.CylinderGeometry(0.022, 0.022, w * 2 - 0.08, 10), plastic);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, seatY + 0.008, d);
    for (const side of [-1, 1]) part(new THREE.BoxGeometry(0.014, 0.05, d * 2 - 0.08), plastic).position.set(side * (w - 0.02), seatY - 0.03, 0);
    part(new THREE.BoxGeometry(w * 2 - 0.08, 0.05, 0.014), plastic).position.set(0, seatY - 0.03, -d + 0.02);

    // Back panel: one outline with the holes that give each style its look.
    const bw = 0.225, bh = 0.44;
    const outline = new THREE.Shape();
    outline.moveTo(-bw, 0);
    outline.lineTo(bw, 0);
    outline.lineTo(bw + 0.012, bh - 0.09);
    outline.quadraticCurveTo(bw, bh, bw - 0.1, bh + 0.012);
    if (a.damage === 'split-back') {
      outline.lineTo(0.03, bh + 0.02); outline.lineTo(0.012, bh * 0.72); outline.lineTo(0.026, bh * 0.55); outline.lineTo(0, bh * 0.3);
      outline.lineTo(-0.012, bh * 0.56); outline.lineTo(-0.03, bh * 0.75); outline.lineTo(-0.022, bh + 0.02);
    }
    outline.lineTo(-bw + 0.1, bh + 0.012);
    outline.quadraticCurveTo(-bw, bh, -bw - 0.012, bh - 0.09);
    outline.closePath();
    const slot = (x0: number, y0: number, x1: number, y1: number, half: number) => {
      const hole = new THREE.Path();
      const dx = x1 - x0, dy = y1 - y0, length = Math.hypot(dx, dy), nx = (-dy / length) * half, ny = (dx / length) * half;
      hole.moveTo(x0 + nx, y0 + ny); hole.lineTo(x1 + nx, y1 + ny); hole.lineTo(x1 - nx, y1 - ny); hole.lineTo(x0 - nx, y0 - ny); hole.closePath();
      outline.holes.push(hole);
    };
    if (a.back === 'slats') for (const x of a.damage === 'split-back' ? [-0.15, -0.09, 0.09, 0.15] : [-0.15, -0.075, 0, 0.075, 0.15]) slot(x, 0.07, x * 1.05, bh - 0.08 - Math.abs(x) * 0.25, 0.016);
    else if (a.back === 'fan') for (const t of a.damage === 'split-back' ? [-0.75, -0.42, 0.42, 0.75] : [-0.75, -0.38, 0, 0.38, 0.75]) slot(Math.sin(t) * 0.07, 0.03 + Math.cos(t) * 0.07, Math.sin(t) * 0.3, 0.03 + Math.cos(t) * 0.36, 0.017);
    else if (a.back === 'solid') slot(-0.07, bh - 0.07, 0.07, bh - 0.07, 0.018);
    else for (let row = 0; row < 5; row++) for (let col = -3; col <= 3; col++) {
      const x = col * 0.056 + (row % 2 ? 0.028 : 0), y = 0.08 + row * 0.064;
      if (Math.abs(x) > 0.17 || (a.damage === 'split-back' && Math.abs(x) < 0.05 && row > 1)) continue;
      const hole = new THREE.Path();
      hole.moveTo(x, y - 0.022); hole.lineTo(x + 0.018, y); hole.lineTo(x, y + 0.022); hole.lineTo(x - 0.018, y); hole.closePath();
      outline.holes.push(hole);
    }
    const back = part(new THREE.ExtrudeGeometry(outline, { depth: 0.022, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 1 }), plastic);
    back.position.set(0, seatY - 0.01, -d + 0.005);
    back.rotation.x = -0.22;

    if (a.arms !== 'armless') {
      for (const side of [-1, 1]) {
        const x = side * (w + 0.03);
        const path = new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * (bw + 0.005), seatY + 0.27, -d - 0.05), new THREE.Vector3(x, seatY + 0.235, -0.08),
          new THREE.Vector3(x + side * 0.005, seatY + 0.22, d - 0.05), new THREE.Vector3(x, seatY + 0.17, d + 0.02), new THREE.Vector3(side * (w - 0.01), seatY, d - 0.02),
        ]);
        const arm = part(new THREE.TubeGeometry(path, 24, 0.02, 6), plastic);
        arm.scale.set(1.5, 1, 1);
        arm.position.x = -x * 0.5;
      }
    }
    if (a.damage === 'mended') {
      const wire = s.material('#8d8b84', { metalness: 0.7, roughness: 0.4 });
      for (let i = 0; i < 3; i++) part(new THREE.TorusGeometry(0.043 - i * 0.004, 0.006, 6, 14), dark).position.set(tops[1][0] + 0.012 * (i + 1), seatY - 0.08 - i * 0.035, tops[1][2] + 0.012 * (i + 1));
      chair.children.slice(-3).forEach((ring) => { ring.rotation.x = Math.PI / 2; });
      const bind = part(new THREE.TorusGeometry(0.03, 0.004, 5, 12), wire);
      bind.position.set(-bw, seatY + 0.2, -d - 0.03);
      bind.rotation.y = Math.PI / 2;
      const patch = part(new THREE.BoxGeometry(0.12, 0.05, 0.036), dark);
      patch.position.set(-0.08, seatY + 0.3, -d - 0.06);
      patch.rotation.set(-0.22, 0, 0.3);
    }
    chair.scale.setScalar(k);

    // ---- into the water ----
    const level = { side: 0.26, capsized: 0.42, upright: 0.32, back: 0.26 }[a.pose] * (child ? 0.75 : 1);
    const f = flood(s, 0.98 * (child ? 0.8 : 1), 0.84 * (child ? 0.8 : 1), level);
    const rig = new THREE.Group();
    rig.add(chair);
    s.root.add(rig);
    const wobble = (random() - 0.5) * 0.24;
    if (a.pose === 'side') chair.rotation.set(0.12 + wobble, 0.5 + wobble, Math.PI / 2 - 0.12);
    else if (a.pose === 'capsized') chair.rotation.set(Math.PI + 0.1 + wobble * 0.5, 0.4 + wobble, 0.07);
    else if (a.pose === 'upright') chair.rotation.set(0.04 + wobble * 0.3, -0.35 + wobble, 0.05);
    else chair.rotation.set(-Math.PI / 2 + 0.16, 0.35 + wobble, wobble * 0.4);
    const sunk = { side: 0.2, capsized: 0.36, upright: 10, back: 0.19 }[a.pose] * k;
    if (a.pose === 'upright') chair.position.y = 0.012; else f.float(rig, sunk);
    f.ripple(0, 0, 0.42 * k, a.motion === 'still' ? 3 : 1);
    if (a.motion === 'drifting') f.wake(0, 0, 0.8 * k, 0.26 * k);
    if (a.motion === 'snagged') {
      const wood = s.material('#4a3a2a', { roughness: 0.95 });
      const bx = -0.42 * k, bz = -0.18;
      s.rod([bx - 0.25, level - 0.12, bz - 0.1], [bx + 0.12, level + 0.34, bz + 0.12], 0.028, wood, 0.018);
      s.rod([bx - 0.04, level + 0.14, bz + 0.01], [bx - 0.32, level + 0.36, bz + 0.2], 0.016, wood, 0.008);
      s.rod([bx + 0.06, level + 0.26, bz + 0.09], [bx + 0.3, level + 0.42, bz - 0.05], 0.012, wood, 0.006);
      const rag = s.box([0.012, 0.16, 0.09], [bx + 0.3, level + 0.34, bz - 0.05], s.material(mood.cheer > 0.5 ? '#d9a13a' : '#7c8a92', { side: THREE.DoubleSide }));
      rag.rotation.set(0.2, 0.7, 0.25);
      f.ripple(bx - 0.14, bz - 0.04, 0.07, 2);
    }
    if (stump) {
      const piece = stump as THREE.Mesh;
      piece.rotation.set(0, random() * 3, Math.PI / 2 - 0.08);
      piece.position.set(0.5, level + 0.004, 0.36);
      f.ripple(0.5, 0.36, 0.14, 1);
    }

    // ---- what floats alongside ----
    const bobbers: { object: THREE.Object3D; base: number; phase: number }[] = [{ object: rig, base: rig.position.y, phase: 0 }];
    const adrift = (object: THREE.Object3D, x: number, z: number, sunkBy: number, ring: number) => {
      object.position.set(x, 0, z);
      s.root.add(object);
      f.float(object, sunkBy);
      if (ring > 0) f.ripple(x, z, ring, 1);
      bobbers.push({ object, base: object.position.y, phase: random() * 6 });
      object.traverse((node) => { node.castShadow = true; });
    };
    const spots: [number, number][] = [[0.72, 0.5], [-0.75, 0.42], [0.55, -0.55], [-0.6, -0.5], [0.1, 0.78], [0.95, 0.02], [-0.98, -0.05]].map(([x, z]) => [x * (child ? 0.6 : 0.74) + (random() - 0.5) * 0.08, z * (child ? 0.6 : 0.74) + (random() - 0.5) * 0.08]);
    const many = Math.round(mix(2, 6, mood.density));
    if (a.alongside === 'sandals') {
      const hues = ['#e2482f', '#2b7fd0', '#f0c22e', '#3aa565', '#e86aa0', '#f2efe6'];
      for (let i = 0; i < many + 1; i++) {
        const sandal = new THREE.Group();
        const sole = new THREE.Shape();
        sole.absellipse(0, 0, 0.048, 0.125, 0, Math.PI * 2);
        const rubber = s.material(hues[Math.floor(random() * hues.length)], { roughness: 0.8 });
        const base = part(new THREE.ExtrudeGeometry(sole, { depth: 0.016, bevelEnabled: false }), rubber, sandal);
        base.rotation.x = -Math.PI / 2;
        const strap = part(new THREE.TorusGeometry(0.042, 0.007, 5, 14, Math.PI), dark, sandal);
        strap.position.set(0, 0.016, -0.03);
        strap.rotation.y = 0;
        part(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 5), dark, sandal).position.set(0, 0.03, -0.075);
        sandal.rotation.y = random() * 6.28;
        if (random() < 0.3) sandal.rotation.z = Math.PI;
        const [x, z] = spots[i % spots.length];
        adrift(sandal, x, z, 0.008, 0);
      }
    } else if (a.alongside === 'football') {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = mood.wear > 0.6 ? '#cfc6b0' : '#f0ede4';
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = '#1e1d1c';
      for (let row = 0; row < 4; row++) for (let col = 0; col < 6; col++) {
        const cx = col * 43 + (row % 2 ? 21 : 0) + 10, cy = row * 34 + 14;
        ctx.beginPath();
        for (let v = 0; v < 5; v++) ctx.lineTo(cx + Math.cos(v * 1.2566 + row) * 11, cy + Math.sin(v * 1.2566 + row) * 11);
        ctx.fill();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6 }));
      ball.rotation.set(random() * 3, random() * 3, random() * 3);
      adrift(ball, spots[0][0], spots[0][1], 0.05, 0.14);
    } else if (a.alongside === 'pot') {
      const metal = s.material('#b9bcbb', { metalness: 0.75, roughness: 0.38, side: THREE.DoubleSide });
      const pot = new THREE.Group();
      part(new THREE.LatheGeometry([[0, 0], [0.13, 0], [0.17, 0.03], [0.175, 0.15], [0.15, 0.19], [0.165, 0.2]].map(([x, y]) => new THREE.Vector2(x, y)), 24), metal, pot);
      part(new THREE.CircleGeometry(0.15, 20), s.material('#2c2520'), pot).rotation.x = -Math.PI / 2;
      pot.children[1].position.y = 0.06;
      pot.rotation.set(0.14, random() * 6, 0.1);
      adrift(pot, spots[0][0], spots[0][1], 0.09, 0.22);
      const lid = new THREE.Group();
      part(new THREE.LatheGeometry([[0, 0.03], [0.1, 0.02], [0.17, 0], [0.175, -0.008]].map(([x, y]) => new THREE.Vector2(x, y)), 24), metal, lid);
      part(new THREE.SphereGeometry(0.02, 8, 6), dark, lid).position.y = 0.045;
      lid.rotation.set(0.25, 0, -0.2);
      adrift(lid, spots[2][0], spots[2][1], 0.012, 0.2);
      const ladle = new THREE.Group();
      part(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 6), s.material('#7a5a38'), ladle).rotation.z = Math.PI / 2;
      ladle.rotation.y = random() * 3;
      adrift(ladle, spots[1][0], spots[1][1], 0.006, 0);
    } else if (a.alongside === 'bottles') {
      const clear = new THREE.MeshStandardMaterial({ color: '#cfe4e6', transparent: true, opacity: 0.62, roughness: 0.15 });
      const caps = ['#2d6fd0', '#e04a30', '#3a9f58', '#f2f0ea'];
      for (let i = 0; i < many + 2; i++) {
        const bottle = new THREE.Group();
        part(new THREE.LatheGeometry([[0, 0], [0.036, 0.004], [0.038, 0.15], [0.014, 0.21], [0.014, 0.235]].map(([x, y]) => new THREE.Vector2(x, y)), 12), clear, bottle);
        part(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 8), s.material(caps[i % caps.length]), bottle).position.y = 0.24;
        part(new THREE.CylinderGeometry(0.0385, 0.0385, 0.05, 12, 1, true), s.material(caps[(i + 1) % caps.length], { side: THREE.DoubleSide }), bottle).position.y = 0.1;
        bottle.rotation.set(Math.PI / 2 - 0.1, 0, random() * 6.28, 'ZYX');
        const [x, z] = spots[(i + 1) % spots.length];
        adrift(bottle, x, z, 0.03, 0);
      }
      const can = new THREE.Group();
      const hdpe = s.material(mood.cheer > 0.5 ? '#e8c53a' : '#3d6fa5', { roughness: 0.6 });
      part(new THREE.BoxGeometry(0.22, 0.3, 0.13), hdpe, can);
      part(new THREE.CylinderGeometry(0.022, 0.022, 0.04, 8), dark, can).position.set(-0.06, 0.17, 0);
      part(new THREE.TorusGeometry(0.045, 0.012, 5, 12, Math.PI), hdpe, can).position.set(0.04, 0.15, 0);
      can.rotation.set(Math.PI / 2 - 0.2, random() * 3, 0.15);
      adrift(can, spots[0][0], spots[0][1], 0.07, 0.2);
    } else if (a.alongside === 'schoolbag') {
      const bag = new THREE.Group();
      const cloth = s.material(mood.cheer > 0.5 ? '#d8432f' : '#31508a', { roughness: 0.9 });
      const body = part(new THREE.SphereGeometry(1, 14, 10), cloth, bag);
      body.scale.set(0.16, 0.09, 0.2);
      const pocket = part(new THREE.SphereGeometry(1, 12, 8), s.material('#e7c53d', { roughness: 0.9 }), bag);
      pocket.scale.set(0.11, 0.05, 0.1);
      pocket.position.set(0, 0.06, 0.07);
      for (const side of [-1, 1]) {
        const strap = part(new THREE.TorusGeometry(0.12, 0.012, 5, 14, Math.PI * 1.1), dark, bag);
        strap.position.set(side * 0.09, -0.01, -0.17);
        strap.rotation.set(Math.PI / 2, 0, side * 0.5 + Math.PI);
      }
      bag.rotation.y = random() * 6;
      adrift(bag, spots[0][0], spots[0][1], 0.06, 0.24);
      for (let i = 0; i < 3; i++) {
        const book = new THREE.Group();
        part(new THREE.BoxGeometry(0.15, 0.008, 0.2), s.material(['#f1ead2', '#9fc3d8', '#e9b9a6'][i]), book);
        part(new THREE.BoxGeometry(0.1, 0.009, 0.05), s.material('#f7f4e8'), book).position.z = -0.03;
        book.rotation.y = random() * 6;
        adrift(book, spots[i + 1][0], spots[i + 1][1], 0.004, 0);
      }
    } else if (a.alongside === 'marigolds') {
      const heads: { at: [number, number, number]; size: number; color: string }[] = [];
      const strand = Array.from({ length: 14 }, (_unused, i) => [spots[0][0] - 0.25 + i * 0.045, level + 0.012, spots[0][1] + Math.sin(i * 0.7) * 0.1] as [number, number, number]);
      for (const at of strand) heads.push({ at, size: 0.026, color: random() < 0.6 ? '#f29a1c' : '#f6c21f' });
      for (let i = 0; i < many * 4 + 6; i++) {
        const [x, z] = spots[i % spots.length];
        heads.push({ at: [x + (random() - 0.5) * 0.25, level + 0.01, z + (random() - 0.5) * 0.25], size: mix(0.018, 0.03, random()), color: random() < 0.5 ? '#ef8d18' : '#f7c92a' });
      }
      const flowers = s.scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, flatShading: true }), heads);
      flowers.scale.y = 1;
    }

    // ---- a passenger ----
    if (a.rider !== 'nothing') {
      rig.updateMatrixWorld(true);
      const caster = new THREE.Raycaster();
      let best: THREE.Vector3 | null = null;
      for (const [x, z] of [[0, 0], [0.08, 0.05], [-0.1, 0.06], [0.05, -0.12], [-0.06, -0.08], [0.15, 0], [-0.16, 0], [0, 0.16]]) {
        caster.set(new THREE.Vector3(x * k, 3, z * k), new THREE.Vector3(0, -1, 0));
        const hit = caster.intersectObject(chair, true)[0];
        if (hit && hit.point.y > level + 0.03 && (!best || hit.point.y > best.y)) best = hit.point.clone();
      }
      const perch = best ?? new THREE.Vector3(0, level + 0.02, 0);
      const rider = new THREE.Group();
      if (a.rider === 'crow') {
        const feather = s.material('#17181b', { roughness: 0.55 });
        const body = part(new THREE.SphereGeometry(1, 14, 10), feather, rider);
        body.scale.set(0.055, 0.06, 0.1); body.position.set(0, 0.1, 0); body.rotation.x = -0.45;
        part(new THREE.SphereGeometry(0.042, 12, 8), s.material('#3a3d44', { roughness: 0.6 }), rider).position.set(0, 0.185, 0.07);
        const beak = part(new THREE.ConeGeometry(0.014, 0.065, 6), dark, rider);
        beak.position.set(0, 0.18, 0.13); beak.rotation.x = Math.PI / 2 + 0.15;
        const tail = part(new THREE.BoxGeometry(0.05, 0.012, 0.13), feather, rider);
        tail.position.set(0, 0.06, -0.12); tail.rotation.x = 0.5;
        for (const side of [-1, 1]) part(new THREE.CylinderGeometry(0.004, 0.004, 0.06, 4), dark, rider).position.set(side * 0.02, 0.03, 0.01);
      } else if (a.rider === 'frog') {
        const skin = s.material('#5d8f3a', { roughness: 0.4 });
        const body = part(new THREE.SphereGeometry(1, 14, 10), skin, rider);
        body.scale.set(0.06, 0.045, 0.07); body.position.y = 0.04; body.rotation.x = -0.3;
        for (const side of [-1, 1]) {
          part(new THREE.SphereGeometry(0.016, 8, 6), s.material('#d9c34a'), rider).position.set(side * 0.028, 0.085, 0.04);
          const leg = part(new THREE.SphereGeometry(1, 8, 6), skin, rider);
          leg.scale.set(0.022, 0.02, 0.05); leg.position.set(side * 0.06, 0.02, -0.02); leg.rotation.y = side * 0.6;
        }
      } else if (a.rider === 'kitten') {
        const fur = s.material('#c9812f', { roughness: 0.95 });
        const body = part(new THREE.SphereGeometry(1, 14, 10), fur, rider);
        body.scale.set(0.06, 0.06, 0.1); body.position.y = 0.06;
        part(new THREE.SphereGeometry(0.052, 12, 10), fur, rider).position.set(0, 0.13, 0.085);
        for (const side of [-1, 1]) {
          const ear = part(new THREE.ConeGeometry(0.02, 0.04, 4), fur, rider);
          ear.position.set(side * 0.032, 0.185, 0.08);
          part(new THREE.SphereGeometry(0.008, 6, 4), dark, rider).position.set(side * 0.02, 0.14, 0.132);
        }
        const tail = part(new THREE.TorusGeometry(0.06, 0.012, 5, 12, Math.PI * 1.2), fur, rider);
        tail.position.set(0.03, 0.035, -0.07); tail.rotation.x = Math.PI / 2;
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#efe7d2'; ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = mood.cheer > 0.5 ? 'rgba(200,40,40,0.75)' : 'rgba(40,70,140,0.75)';
        for (let i = 0; i < 64; i += 16) { ctx.fillRect(i, 0, 7, 64); ctx.fillRect(0, i, 64, 7); }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const cloth = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95, side: THREE.DoubleSide });
        const drape = part(new THREE.CylinderGeometry(0.06, 0.075, 0.34, 10, 1, true, 0, Math.PI), cloth, rider);
        drape.rotation.set(0, Math.PI / 2, Math.PI / 2);
        drape.position.y = -0.02;
        const hang = part(new THREE.PlaneGeometry(0.34, 0.16), cloth, rider);
        hang.position.set(0, -0.09, 0.07);
      }
      rider.scale.setScalar(child ? 0.85 : 1.25);
      rider.position.copy(perch);
      rider.position.y -= rig.position.y;
      rider.rotation.y = random() * 6.28;
      rig.add(rider);
    }

    const energy = mix(0.15, 1, mood.energy);
    return s.finish({
      footprint: 0.95 * (child ? 0.8 : 1),
      update: (dt, time) => {
        f.update(dt, time);
        for (const { object, base, phase } of bobbers) {
          object.position.y = base + Math.sin(time * 1.4 + phase) * 0.012 * energy;
          if (object !== rig || a.pose !== 'upright') object.rotation.z += Math.cos(time * 1.1 + phase) * 0.0006 * energy;
        }
      },
    });
  },
});
