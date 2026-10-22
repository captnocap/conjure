import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const FLOATS = {
  'red-white': 'Red and white blocks, the classic competition rope.',
  'blue-white': 'Blue and white blocks, cool and municipal.',
  'blue-yellow': 'Blue and yellow blocks, a swimming-club livery.',
  rainbow: 'Green, yellow and red sections like an Olympic final.',
  faded: 'Sun-bleached pinks and chalky whites, decades old.',
} as const;
const PALETTE: Record<keyof typeof FLOATS, string[]> = {
  'red-white': ['#d62a22', '#f4f1e8'],
  'blue-white': ['#1f5fc4', '#f4f1e8'],
  'blue-yellow': ['#1f55b8', '#f6c915'],
  rainbow: ['#1f9a4c', '#f6c915', '#d62a22', '#f6c915'],
  faded: ['#d99a92', '#e9e4d6'],
};
const BOARDS: Record<string, string[]> = {
  primary: ['#e23a2c', '#1f66c9', '#f6c915', '#22a35a'],
  blue: ['#1f66c9', '#2a7fe0', '#184f9e'],
  pastel: ['#f3a9b8', '#a8dcd0', '#f6e3a1', '#b9c8f0'],
  yellow: ['#f6c915', '#f2b705', '#f8d84a'],
};

export default defineThing({
  questions: {
    floats: choice('What colours are the lane-rope floats?', FLOATS),
    paidOut: score('How much of the rope has come off the reel?', [
      'All of it wound tight on the drum',
      'A short tail hanging to the ground',
      'Half of it snaking away across the paving',
      'Nearly all of it paid out, the drum almost bare',
    ]),
    boards: choice('How are the kickboards and pull buoys kept?', {
      stacked: 'A neat squared-off stack of kickboards with pull buoys lined up beside it.',
      scattered: 'Strewn across the ground where a class dropped them.',
      crate: 'Stood on end in a plastic crate, buoys heaped on top.',
      none: 'There are none: only the reel.',
    }),
    boardColour: choice('If there are kickboards, what colour are they?', {
      primary: 'A mix of bright red, blue, yellow and green.',
      blue: 'All swimming-pool blue.',
      pastel: 'Soft learner-pool pastels.',
      yellow: 'All club yellow.',
    }),
    frame: choice('What is the reel frame made of?', {
      stainless: 'Bright stainless tube on rubber castors.',
      blue: 'Steel painted swimming-bath blue.',
      white: 'White enamelled tube, chipped at the corners.',
    }),
    left: choice('What has been left on or around it?', {
      clipboard: 'A coach has left a clipboard, a stopwatch and a whistle.',
      puddle: 'It was hauled out a minute ago: water runs off into a spreading puddle.',
      towel: 'A damp striped towel hangs over the handle.',
      flags: 'A string of backstroke flags is bundled over the top and trails off.',
      nothing: 'Nothing. It is parked and squared away.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const colours = PALETTE[a.floats].map((c) => new THREE.Color(c).lerp(new THREE.Color('#d8d2c4'), mood.wear * 0.22));
    const steel = a.frame === 'stainless'
      ? s.material('#cfd5d8', { metalness: 0.85, roughness: 0.28 })
      : s.material(a.frame === 'blue' ? '#2f6fb0' : '#eeece4', { metalness: 0.2, roughness: 0.5 });
    const plate = s.material('#c3cacd', { metalness: 0.8, roughness: 0.35 });
    const rubber = s.material('#25282b', { roughness: 0.8 });
    const H = 0.86, R = 0.62, half = 0.62;

    // Reel: two spoked flanges on a drum, axis along x.
    const reel = new THREE.Group();
    reel.position.set(0, H, 0);
    s.root.add(reel);
    const add = (mesh: THREE.Mesh, to: THREE.Object3D = reel) => { mesh.castShadow = mesh.receiveShadow = true; to.add(mesh); return mesh; };
    for (const sx of [-1, 1]) {
      const rim = add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.022, 8, 40), steel));
      rim.rotation.y = Math.PI / 2; rim.position.x = sx * half;
      const inner = add(new THREE.Mesh(new THREE.TorusGeometry(R * 0.55, 0.014, 6, 32), steel));
      inner.rotation.y = Math.PI / 2; inner.position.x = sx * half;
      for (let i = 0; i < 8; i++) {
        const spoke = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, R, 6), steel));
        const angle = (i / 8) * Math.PI * 2;
        spoke.position.set(sx * half, Math.cos(angle) * R / 2, Math.sin(angle) * R / 2);
        spoke.rotation.x = angle;
      }
      const hub = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.07, 14), plate));
      hub.rotation.z = Math.PI / 2; hub.position.x = sx * (half + 0.02);
    }
    const drum = add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, half * 2, 20), plate));
    drum.rotation.z = Math.PI / 2;
    // Crank handle.
    const crank = new THREE.Group();
    crank.position.x = half + 0.07; crank.rotation.x = random() * Math.PI * 2;
    reel.add(crank);
    const arm = add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.04), steel), crank); arm.position.y = 0.14;
    const grip = add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.13, 10), rubber), crank);
    grip.rotation.z = Math.PI / 2; grip.position.set(0.07, 0.28, 0);

    // Frame: A-legs each side, base rails, castors, push handle.
    const fz = 0.5, baseY = 0.14;
    for (const sx of [-1, 1]) {
      const x = sx * (half + 0.1);
      s.rod([x, H, 0], [x, baseY, fz], 0.022, steel);
      s.rod([x, H, 0], [x, baseY, -fz], 0.022, steel);
      s.rod([x, baseY, -fz - 0.06], [x, baseY, fz + 0.06], 0.022, steel);
      s.rod([x, H * 0.55, fz * 0.42], [x, H * 0.55, -fz * 0.42], 0.016, steel);
      s.box([0.05, 0.1, 0.1], [x, H, 0], plate);
      for (const sz of [-1, 1]) {
        s.box([0.05, 0.07, 0.03], [x, 0.1, sz * fz], plate);
        s.cylinder(0.055, 0.055, 0.04, [x, 0.055, sz * fz], rubber, 14).rotation.z = Math.PI / 2;
      }
      s.rod([x, baseY, -fz], [x, 1.1, -fz - 0.22], 0.02, steel);
    }
    for (const sz of [-1, 1]) s.rod([-(half + 0.1), baseY, sz * fz], [half + 0.1, baseY, sz * fz], 0.02, steel);
    s.rod([-(half + 0.1), 1.1, -fz - 0.22], [half + 0.1, 1.1, -fz - 0.22], 0.02, steel);
    s.rod([-0.25, 1.1, -fz - 0.22], [0.25, 1.1, -fz - 0.22], 0.027, rubber);

    // Floats, as one instanced mesh: wound turns on the drum plus the tail on the ground.
    const pitch = 0.108, fr = 0.056;
    const rows = Math.floor((half * 2 - 0.06) / (fr * 2 + 0.004));
    const wound = 1 - a.paidOut;
    const layers = Math.round(wound * 4);
    const spots: { p: THREE.Vector3; d: THREE.Vector3; c: THREE.Color }[] = [];
    let index = Math.floor(random() * 8);
    const block = 5;
    const tint = () => colours[Math.floor(index++ / block) % colours.length];
    let outer = 0.17;
    for (let layer = Math.max(0, layers - 2); layer < layers; layer++) {
      const r = 0.17 + fr + layer * fr * 1.75;
      outer = r + fr;
      const around = Math.floor((Math.PI * 2 * r) / pitch);
      const partial = layer === layers - 1 ? mix(0.55, 1, (wound * 4 + 0.5) % 1) : 1;
      for (let row = 0; row < Math.ceil(rows * partial); row++) {
        const x = -half + 0.03 + fr + row * (fr * 2 + 0.004);
        const phase = random() * 6;
        for (let k = 0; k < around; k++) {
          const t = phase + (k / around) * Math.PI * 2;
          spots.push({ p: new THREE.Vector3(x, H + Math.sin(t) * r, Math.cos(t) * r), d: new THREE.Vector3(0, Math.cos(t), -Math.sin(t)), c: tint() });
        }
      }
    }
    if (layers > 2) {
      const core = add(new THREE.Mesh(new THREE.CylinderGeometry(0.17 + (layers - 2) * fr * 1.75, 0.17 + (layers - 2) * fr * 1.75, half * 2 - 0.08, 20), new THREE.MeshStandardMaterial({ color: colours[0].clone().multiplyScalar(0.7), roughness: 0.7 })));
      core.rotation.z = Math.PI / 2;
    }

    const cable = s.material('#8d9396', { metalness: 0.6, roughness: 0.4 });
    let tailEnd: THREE.Vector3 | null = null;
    if (a.paidOut > 0.08) {
      const length = mix(0.5, 4.2, a.paidOut);
      const x0 = (random() - 0.5) * 0.6;
      const points = [new THREE.Vector3(x0, H + outer * 0.2, outer * 0.98), new THREE.Vector3(x0, H * 0.45, outer + 0.1), new THREE.Vector3(x0 + 0.03, fr, outer + 0.42)];
      let heading = (random() - 0.5) * 0.6, laid = 0;
      const swing = random() < 0.5 ? 1 : -1, wobble = 0.5 + random() * 0.5;
      const at = points[2].clone();
      while (laid < length) {
        heading += swing * Math.sin(laid * wobble + 0.4) * 0.75 + (random() - 0.5) * 0.3;
        heading = Math.max(-1.9, Math.min(1.9, heading));
        at.add(new THREE.Vector3(Math.sin(heading) * 0.45, 0, Math.cos(heading) * 0.45));
        // Keep the tail in front of the reel and inside a few metres.
        at.x = Math.max(-1.5, Math.min(1.5, at.x)); at.z = Math.max(outer + 0.3, Math.min(2.3, at.z));
        points.push(at.clone());
        laid += 0.45;
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const total = curve.getLength();
      const count = Math.floor(total / pitch);
      for (let i = 0; i <= count; i++) {
        const u = i / count;
        spots.push({ p: curve.getPointAt(u), d: curve.getTangentAt(u), c: i > count - 9 ? colours[0] : tint() });
      }
      tailEnd = curve.getPointAt(1);
      const dir = curve.getTangentAt(1);
      // Tensioner spring and hook on the free end.
      const tip = tailEnd.clone().addScaledVector(dir, 0.22);
      s.rod([tailEnd.x, 0.04, tailEnd.z], [tip.x, 0.04, tip.z], 0.022, cable);
      s.ring(0.04, 0.009, [tip.x + dir.x * 0.04, 0.02, tip.z + dir.z * 0.04], cable).rotation.x = Math.PI / 2;
    } else if (layers > 0) {
      // Hook tucked over the top of the wound rope.
      s.ring(0.04, 0.009, [0.2, H + outer + 0.01, 0.05], cable).rotation.x = Math.PI / 2;
    }
    if (spots.length) {
      const geometry = new THREE.CylinderGeometry(fr, fr, pitch * 0.86, 10);
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ roughness: 0.42 + mood.wear * 0.4 }), spots.length);
      const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
      spots.forEach((spot, i) => {
        q.setFromUnitVectors(up, spot.d.clone().normalize());
        mesh.setMatrixAt(i, matrix.compose(spot.p, q, one));
        mesh.setColorAt(i, spot.c);
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    // Kickboards and pull buoys.
    const boardTints = BOARDS[a.boardColour];
    const boardShape = new THREE.Shape();
    boardShape.moveTo(-0.14, -0.2); boardShape.lineTo(0.14, -0.2); boardShape.lineTo(0.14, 0.08);
    boardShape.absarc(0, 0.08, 0.14, 0, Math.PI, false); boardShape.lineTo(-0.14, -0.2);
    const boardGeometry = new THREE.ExtrudeGeometry(boardShape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 10 });
    boardGeometry.translate(0, 0, -0.015);
    const foam = boardTints.map((c) => s.material(c, { roughness: 0.85 }));
    const board = (x: number, y: number, z: number, flat: boolean, yaw: number, tilt = 0) => {
      const mesh = s.mesh(boardGeometry, foam[Math.floor(random() * foam.length)], [x, y, z]);
      mesh.rotation.set(flat ? -Math.PI / 2 + tilt : tilt, yaw, 0, 'YXZ');
      return mesh;
    };
    const buoyWhite = s.material('#f1eee4', { roughness: 0.85 });
    const buoy = (x: number, y: number, z: number, yaw: number, lying: boolean) => {
      const group = new THREE.Group();
      group.position.set(x, y, z); group.rotation.set(lying ? Math.PI / 2 : 0, yaw, 0, 'YXZ');
      const lower = add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.24, 14), foam[Math.floor(random() * foam.length)]), group);
      lower.rotation.z = Math.PI / 2; lower.position.y = 0.075;
      const upper = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.24, 14), buoyWhite), group);
      upper.rotation.z = Math.PI / 2; upper.position.y = 0.18;
      s.root.add(group);
    };
    const bx = -(half + 0.75), bz = 0.25;
    const count = 5 + Math.round(mood.density * 9);
    let stackTop = 0;
    if (a.boards === 'stacked') {
      for (let i = 0; i < count; i++) board(bx + (random() - 0.5) * 0.012, 0.024 + i * 0.047, bz + (random() - 0.5) * 0.012, true, (random() - 0.5) * 0.06);
      stackTop = 0.024 + count * 0.047;
      for (let i = 0; i < 3 + Math.round(mood.density * 2); i++) buoy(bx - 0.1 + i * 0.01, 0, bz + 0.5 + i * 0.17, Math.PI / 2 + (random() - 0.5) * 0.1, false);
    } else if (a.boards === 'scattered') {
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, reach = 0.25 + random() * 1.0;
        const leaning = i < 2;
        if (leaning) board(-(half + 0.2), 0.2, -0.2 + i * 0.4, false, Math.PI / 2, 0).rotation.z = 0.28;
        else board(bx - 0.25 + Math.cos(angle) * reach * 0.8, 0.02 + (i % 3) * 0.012, 0.55 + Math.sin(angle) * reach, true, random() * 6, (random() - 0.5) * 0.1);
      }
      for (let i = 0; i < 4; i++) buoy(bx - 0.6 + random() * 1.5, 0.075, -0.5 + random() * 2.2, random() * 6, true);
    } else if (a.boards === 'crate') {
      const crate = s.material(mood.cheer > 0.5 ? '#2d7fd0' : '#6f7c86', { roughness: 0.7 });
      const cw = 0.62, cd = 0.42, ch = 0.3;
      s.box([cw, 0.02, cd], [bx, 0.01, bz], crate);
      for (const sz of [-1, 1]) for (let j = 0; j < 3; j++) s.box([cw, 0.06, 0.02], [bx, 0.06 + j * 0.1, bz + sz * cd / 2], crate);
      for (const sx of [-1, 1]) for (let j = 0; j < 3; j++) s.box([0.02, 0.06, cd], [bx + sx * cw / 2, 0.06 + j * 0.1, bz], crate);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.box([0.03, ch, 0.03], [bx + sx * cw / 2, ch / 2, bz + sz * cd / 2], crate);
      const n = Math.min(count, 11);
      for (let i = 0; i < n; i++) board(bx - cw / 2 + 0.06 + i * ((cw - 0.1) / n), 0.23, bz - 0.04, false, Math.PI / 2 + (random() - 0.5) * 0.1, 0).rotation.z = (random() - 0.5) * 0.2;
      for (let i = 0; i < 2; i++) buoy(bx - 0.12 + i * 0.26, 0.07, bz + 0.38, random() * 6, true);
      stackTop = 0;
    }

    // What was left behind.
    if (a.left === 'clipboard') {
      const onStack = a.boards === 'stacked';
      const cx = onStack ? bx : half + 0.55, cy = onStack ? stackTop : 0, cz = onStack ? bz : 0.3;
      const clip = s.box([0.23, 0.012, 0.32], [cx, cy + 0.008, cz], s.material('#7a5231'));
      clip.rotation.y = 0.3;
      const paper = s.label('LANE 4  50m  1:02.3', 0.2, 0.26, [cx, cy + 0.016, cz + 0.01], '#39424a', '#f6f3ea');
      paper.rotation.set(-Math.PI / 2, 0, 0.3, 'YXZ'); paper.rotation.y = 0.3;
      s.box([0.1, 0.02, 0.03], [cx - 0.04, cy + 0.024, cz - 0.14], plate).rotation.y = 0.3;
      s.cylinder(0.035, 0.035, 0.016, [cx + 0.17, cy + 0.01, cz + 0.08], plate, 16);
      s.cylinder(0.008, 0.008, 0.03, [cx + 0.17, cy + 0.01, cz + 0.04], plate, 8).rotation.x = Math.PI / 2;
      s.cylinder(0.02, 0.02, 0.03, [cx + 0.16, cy + 0.02, cz - 0.07], s.material('#e23a2c'), 12).rotation.z = Math.PI / 2;
      s.ring(0.07, 0.004, [cx + 0.2, cy + 0.006, cz - 0.02], s.material('#e23a2c')).rotation.x = Math.PI / 2;
    } else if (a.left === 'puddle') {
      const wet = new THREE.MeshStandardMaterial({ color: '#5d7f8c', transparent: true, opacity: 0.5, roughness: 0.05, metalness: 0.3, depthWrite: false });
      for (let i = 0; i < 5; i++) {
        const pool = s.cylinder(1, 1, 0.004, [(random() - 0.5) * 1.1, 0.003, (random() - 0.5) * 0.9 + 0.2], wet, 20);
        pool.scale.set(0.3 + random() * 0.55, 1, 0.25 + random() * 0.4); pool.castShadow = false;
      }
      const drop = s.material('#9cc6d6', { roughness: 0.1 });
      for (let i = 0; i < 6; i++) s.rod([(random() - 0.5) * 1.1, H - outer, (random() - 0.5) * 0.3], [(random() - 0.5) * 1.1, H - outer - 0.1 - random() * 0.12, (random() - 0.5) * 0.3], 0.006, drop, 0.002);
    } else if (a.left === 'towel') {
      const stripes = document.createElement('canvas'); stripes.width = 64; stripes.height = 64;
      const c = stripes.getContext('2d')!;
      const pair = mood.cheer > 0.5 ? ['#f2a51c', '#f7f1e1'] : ['#3c6c8c', '#e6e2d6'];
      for (let i = 0; i < 8; i++) { c.fillStyle = pair[i % 2]; c.fillRect(i * 8, 0, 8, 64); }
      const map = new THREE.CanvasTexture(stripes); map.colorSpace = THREE.SRGBColorSpace;
      const cloth = new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide });
      const tx = 0.25 + (random() - 0.5) * 0.3;
      s.box([0.46, 0.6, 0.025], [tx, 0.82, -fz - 0.265], cloth).rotation.x = 0.1;
      s.box([0.46, 0.34, 0.025], [tx, 0.95, -fz - 0.19], cloth).rotation.x = -0.1;
      s.cylinder(0.035, 0.035, 0.46, [tx, 1.11, -fz - 0.22], cloth, 10).rotation.z = Math.PI / 2;
    } else if (a.left === 'flags') {
      const line = [new THREE.Vector3(-half - 0.2, 0.05, -1.0), new THREE.Vector3(-0.3, H + R * 0.9, -0.35), new THREE.Vector3(0.1, H + Math.max(outer, R) + 0.03, 0), new THREE.Vector3(0.45, H + R * 0.8, 0.42), new THREE.Vector3(half + 0.5, 0.04, 0.7), new THREE.Vector3(half + 1.3, 0.03, 0.5 + random() * 0.6)];
      const curve = new THREE.CatmullRomCurve3(line);
      s.mesh(new THREE.TubeGeometry(curve, 40, 0.008, 5), s.material('#efe9d8'));
      const tri = new THREE.Shape(); tri.moveTo(-0.11, 0); tri.lineTo(0.11, 0); tri.lineTo(0, -0.3); tri.lineTo(-0.11, 0);
      const pennant = new THREE.ShapeGeometry(tri);
      const flagTints = ['#d62a22', '#f4f1e8', '#1f5fc4', '#f6c915'].map((c) => new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.8 }));
      for (let i = 1; i < 22; i++) {
        const u = i / 22, p = curve.getPointAt(u), t = curve.getTangentAt(u);
        const flag = s.mesh(pennant, flagTints[i % 4], [p.x, p.y, p.z]);
        flag.rotation.y = Math.atan2(-t.z, t.x);
        if (p.y < 0.35) { flag.rotation.x = -Math.PI / 2 + 0.05; flag.position.y = 0.01 + (i % 3) * 0.004; }
      }
    }

    // The crank handle idles back and forth as if someone has just let go of it.
    const base = crank.rotation.x, swingBy = mix(0, 0.5, mood.energy);
    return s.finish({ update: (_dt, time) => { crank.rotation.x = base + Math.sin(time * 1.6) * swingBy; } });
  },
});
