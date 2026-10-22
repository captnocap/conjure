import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P2 = readonly [number, number];
const PAINT = { white: '#e9e7de', yellow: '#e8b417', red: '#b0211b', black: '#1f2125', blue: '#1f478f', green: '#1f6a45' } as const;
const NAMES = { repo: ['REPO', 'RECOVERY'], towing: ['24 HR', 'TOWING'], a1: ['A-1 AUTO', 'WRECKER'], bigal: ["BIG AL'S", 'USED CARS'], plain: ['', ''] } as const;
const CARS: Record<string, { length: number; base: number; top: readonly P2[]; cabin: readonly [P2, P2, P2, P2]; wheel: number }> = {
  // x is measured from the rear axle; front axle sits at `base`
  sedan: { length: 4.5, base: 2.7, wheel: 0.31, top: [[-0.95, 0.62], [-0.9, 0.9], [0, 0.95], [2.3, 0.95], [3.3, 0.82], [3.55, 0.62]], cabin: [[-0.25, 0.93], [0.4, 1.4], [1.5, 1.4], [2.35, 0.93]] },
  minivan: { length: 4.7, base: 2.85, wheel: 0.33, top: [[-0.95, 0.66], [-0.95, 1.05], [0, 1.08], [2.5, 1.08], [3.55, 0.9], [3.75, 0.66]], cabin: [[-0.9, 1.06], [-0.7, 1.72], [1.9, 1.72], [3.0, 1.02]] },
  coupe: { length: 4.4, base: 2.55, wheel: 0.33, top: [[-0.95, 0.6], [-0.95, 0.84], [0, 0.88], [1.9, 0.88], [3.3, 0.74], [3.45, 0.56]], cabin: [[-0.3, 0.87], [0.55, 1.24], [1.2, 1.24], [1.95, 0.87]] },
  pickup: { length: 5.2, base: 3.15, wheel: 0.38, top: [[-1.05, 0.72], [-1.05, 1.02], [1.2, 1.02], [2.5, 1.04], [4.05, 0.98], [4.15, 0.72]], cabin: [[1.22, 1.03], [1.32, 1.7], [2.28, 1.7], [2.72, 1.03]] },
};

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
    truck: choice('What kind of tow truck is it?', {
      selfloader: 'A low modern self-loader repo truck: quick, quiet, a wheel-lift that grabs and goes.',
      wrecker: 'An old-school boom wrecker with a tall crane arm, winch cable and hook.',
      rollback: 'A flatbed rollback carrying the car up on its deck.',
    }),
    paint: choice('What colour is the truck?', {
      white: 'Plain fleet white.', yellow: 'Safety yellow.', red: 'Red.', black: 'Black, the repo man\'s choice.', blue: 'Blue.', green: 'Dark green.',
    }),
    lettering: choice('What is lettered on the door?', {
      repo: 'REPO RECOVERY, blunt about it.',
      towing: '24 HR TOWING.',
      a1: 'A-1 AUTO WRECKER.',
      bigal: "BIG AL'S USED CARS: the dealer's own truck.",
      plain: 'Nothing: deliberately unmarked.',
    }),
    job: choice('What is it doing right now?', {
      tradein: 'Arriving at the lot with a clean trade-in on the hook.',
      repo: 'Repossessing somebody\'s car, belongings still inside.',
      wreck: 'Dragging in a wreck that will never run again.',
      empty: 'Running empty, lift folded, looking for a plate number.',
    }),
    cargo: choice('If a car is on the hook, what is it?', {
      sedan: 'An ordinary family sedan.',
      minivan: 'A minivan.',
      coupe: 'A low sporty coupe somebody could not really afford.',
      pickup: 'A work pickup.',
    }),
    left: choice('If a car is on the hook, what is still with it?', {
      clean: 'Nothing.',
      luggage: 'Boxes, a suitcase and a lamp piled on the roof and in the bed: a life in transit.',
      balloons: 'Dealer balloons still tied to the mirror.',
      tickets: 'An orange notice on the window and tickets under the wiper.',
    }),
    flashing: noul('Is the amber light bar flashing?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rig = new THREE.Group();
    // Parked at a slight three-quarter angle so the door lettering and the car on the hook both show.
    rig.rotation.y = -Math.PI / 2 - 0.42;
    s.root.add(rig);
    const scuff = mood.wear;
    const paintColour = new THREE.Color(PAINT[a.paint]).lerp(new THREE.Color('#8f8573'), scuff * 0.25);
    const body = new THREE.MeshStandardMaterial({ color: paintColour, roughness: mix(0.3, 0.8, scuff), metalness: 0.25 });
    const accentHex = a.paint === 'white' ? '#b0211b' : a.paint === 'yellow' ? '#1f2125' : '#e9e7de';
    const accent = s.material(accentHex);
    const glass = new THREE.MeshStandardMaterial({ color: '#22313b', roughness: 0.12, metalness: 0.4 });
    const chrome = s.material('#cfd4d6', { metalness: 0.85, roughness: 0.25 });
    const black = s.material('#17181a', { roughness: 0.85 });
    const rubber = s.material('#1b1b1d', { roughness: 0.95 });
    const frame = s.material('#2b2d30', { metalness: 0.4, roughness: 0.6 });

    const into = (group: THREE.Object3D) => {
      const add = <T extends THREE.Object3D>(node: T) => { node.traverse((n) => { n.castShadow = n.receiveShadow = true; }); group.add(node); return node; };
      const box = (size: [number, number, number], at: [number, number, number], material: THREE.Material) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
        mesh.position.set(...at);
        return add(mesh);
      };
      const rod = (from: [number, number, number], to: [number, number, number], radius: number, material: THREE.Material) => {
        const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to);
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, Math.max(0.001, p.distanceTo(q)), 8), material);
        mesh.position.copy(p).add(q).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.sub(p).normalize());
        return add(mesh);
      };
      const wheel = (x: number, z: number, radius: number, thick: number, hub: THREE.Material | null) => {
        const tyre = add(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thick, 18), rubber));
        tyre.rotation.x = Math.PI / 2;
        tyre.position.set(x, radius, z);
        if (hub) {
          const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, thick + 0.03, 12), hub));
          cap.rotation.x = Math.PI / 2;
          cap.position.set(x, radius, z);
        }
      };
      const profile = (points: readonly P2[], width: number, bevel: number, material: THREE.Material, arches: readonly [number, number, number][] = []) => {
        const outline = new THREE.Shape();
        const bottom = points[0][1];
        outline.moveTo(points[0][0], bottom);
        for (const [x, y] of points.slice(1)) outline.lineTo(x, y);
        for (const [cx, cy, r] of [...arches].sort((m, n) => n[0] - m[0])) {
          const phi = Math.asin(Math.max(-0.99, Math.min(0.99, (cy - bottom) / r)));
          outline.absarc(cx, cy, r, -phi, Math.PI + phi, false);
        }
        const geometry = new THREE.ExtrudeGeometry(outline, { depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 1, curveSegments: 8 });
        geometry.translate(0, 0, -(width - bevel * 2) / 2);
        return add(new THREE.Mesh(geometry, material));
      };
      return { add, box, rod, wheel, profile };
    };
    const t = into(rig);

    // ---- truck chassis and cab -----------------------------------------------------
    const width = 2.2, wheelR = 0.44;
    const rollback = a.truck === 'rollback';
    const tail = rollback ? -4.6 : -3.0;
    t.box([3.4 - tail, 0.22, 1.0], [(3.2 + tail) / 2, 0.72, 0], frame);
    t.profile([[0.3, 0.5], [0.3, 1.38], [1.8, 1.42], [3.0, 1.32], [3.2, 1.0], [3.2, 0.5]], width - 0.1, 0.05, body, [[2.05, wheelR, wheelR + 0.1]]);
    t.profile([[0.36, 1.36], [0.46, 2.28], [1.4, 2.28], [1.9, 1.4]], width - 0.34, 0.04, glass);
    t.box([1.06, 0.07, width - 0.26], [0.92, 2.31, 0], body);
    for (const side of [-1, 1]) {
      const zc = side * (width / 2 - 0.19);
      t.rod([1.88, 1.4, zc], [1.4, 2.3, zc], 0.05, body);
      t.rod([0.38, 1.38, zc], [0.47, 2.3, zc], 0.07, body);
      t.wheel(2.05, side * (width / 2 - 0.17), wheelR, 0.28, chrome);
      t.wheel(-1.35, side * (width / 2 - 0.2), wheelR, 0.5, null);
      if (rollback) t.wheel(-2.35, side * (width / 2 - 0.2), wheelR, 0.5, null);
      // mirrors, step, door seam
      t.rod([1.75, 1.75, side * (width / 2 - 0.1)], [1.8, 1.75, side * (width / 2 + 0.28)], 0.018, black);
      t.box([0.05, 0.36, 0.2], [1.8, 1.75, side * (width / 2 + 0.3)], black);
      t.box([0.9, 0.05, 0.22], [1.0, 0.5, side * (width / 2 - 0.04)], chrome);
      for (const x of [0.5, 1.68]) t.box([0.012, 0.8, 0.01], [x, 0.98, side * (width / 2 - 0.045)], black);
      t.box([1.2, 0.09, 0.012], [1.1, 1.18, side * (width / 2 - 0.044)], accent);
      t.box([0.05, 0.14, 0.16], [3.22, 0.98, side * 0.78], new THREE.MeshStandardMaterial({ color: '#f4f1e2', emissive: '#fff2c4', emissiveIntensity: mood.daylight < 0.15 || mood.daylight > 0.85 ? 1.3 : 0.1 }));
    }
    t.box([0.06, 0.34, 1.2], [3.2, 0.98, 0], black);
    for (let i = 0; i < 4; i++) t.box([0.07, 0.02, 1.16], [3.21, 0.86 + i * 0.08, 0], chrome);
    t.box([0.2, 0.2, width + 0.02], [3.26, 0.56, 0], chrome);
    // push bar
    for (const z of [-0.5, 0.5]) t.box([0.07, 0.75, 0.07], [3.4, 0.9, z], black);
    t.box([0.07, 0.07, 1.1], [3.4, 1.25, 0], black);
    t.box([0.07, 0.07, 1.1], [3.4, 0.9, 0], black);

    // door lettering, scuffed by wear
    const words = NAMES[a.lettering];
    if (words[0]) {
      const ink = a.paint === 'white' || a.paint === 'yellow' ? '#1b1b1b' : '#f5f2e6';
      for (const side of [-1, 1]) {
        const map = paint(256, 128, (ctx) => {
          ctx.clearRect(0, 0, 256, 128);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ink;
          ctx.font = 'bold 54px sans-serif'; ctx.fillText(words[0], 128, 38, 244);
          ctx.font = 'bold 40px sans-serif'; ctx.fillText(words[1], 128, 92, 244);
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineCap = 'round';
          for (let i = 0; i < scuff * 60; i++) {
            ctx.lineWidth = 2 + random() * 7;
            const x = random() * 256, y = random() * 128;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 20 + random() * 70, y + (random() - 0.5) * 16); ctx.stroke();
          }
        });
        const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.3, roughness: 0.7 }));
        decal.position.set(1.1, 0.86, side * (width / 2 - 0.038));
        decal.rotation.y = side === 1 ? 0 : Math.PI;
        rig.add(decal);
      }
    }

    // amber light bar
    const amber = new THREE.MeshStandardMaterial({ color: '#ffb020', emissive: '#ff9a00', emissiveIntensity: a.flashing ? 1.6 : 0.12, roughness: 0.3 });
    const amberB = amber.clone();
    t.box([0.3, 0.06, 1.5], [0.95, 2.38, 0], black);
    t.box([0.26, 0.13, 0.66], [0.95, 2.47, -0.38], amber);
    t.box([0.26, 0.13, 0.66], [0.95, 2.47, 0.38], amberB);
    t.box([0.28, 0.14, 0.08], [0.95, 2.47, 0], chrome);

    // ---- recovery gear -----------------------------------------------------------
    const hookX = rollback ? 0 : -4.15;
    if (rollback) {
      t.box([4.9, 0.14, width + 0.2], [-2.15, 1.2, 0], body);
      for (const side of [-1, 1]) t.box([4.9, 0.16, 0.06], [-2.15, 1.34, side * (width / 2 + 0.07)], accent);
      t.box([0.1, 1.0, width], [0.22, 1.75, 0], frame);
      for (let i = 0; i < 4; i++) t.box([0.04, 0.7, 0.04], [0.16, 1.75, -0.75 + i * 0.5], chrome);
      t.box([0.5, 0.3, 0.6], [0.0, 1.42, 0], frame);
      t.box([0.3, 0.2, width + 0.3], [-4.55, 1.0, 0], frame);
    } else {
      t.box([3.3, 0.36, width], [-1.35, 0.98, 0], body);
      for (const side of [-1, 1]) {
        t.box([2.6, 0.5, 0.5], [-1.0, 1.4, side * (width / 2 - 0.25)], body);
        for (const x of [-1.9, -1.0, -0.1]) t.box([0.7, 0.36, 0.012], [x, 1.4, side * (width / 2 + 0.002)], accent);
        t.box([0.5, 0.5, 0.06], [-2.75, 0.55, side * (width / 2 - 0.3)], black);
        t.box([0.06, 0.16, 0.26], [-3.02, 1.02, side * (width / 2 - 0.25)], new THREE.MeshStandardMaterial({ color: '#a8141a', emissive: '#ff2a2a', emissiveIntensity: 0.4 }));
      }
      const tall = a.truck === 'wrecker';
      const tip: [number, number, number] = tall ? [-3.5, 3.1, 0] : [-3.1, 1.75, 0];
      t.box([0.5, tall ? 1.0 : 0.5, 0.7], [-0.25, tall ? 1.75 : 1.5, 0], frame);
      const boom = t.rod([-0.3, tall ? 2.15 : 1.6, 0], tip, tall ? 0.11 : 0.13, tall ? accent : frame);
      boom.scale.x = 1.2;
      if (tall) {
        t.rod([-1.7, 1.3, 0.5], [-2.2, 2.55, 0.1], 0.05, frame);
        t.rod([-1.7, 1.3, -0.5], [-2.2, 2.55, -0.1], 0.05, frame);
        const drum = t.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 12), chrome));
        drum.rotation.x = Math.PI / 2; drum.position.set(-0.3, 1.55, 0);
        t.rod(tip, [tip[0], a.job === 'empty' ? 2.3 : 1.25, 0], 0.012, black);
        t.add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12, Math.PI * 1.5), chrome)).position.set(tip[0], a.job === 'empty' ? 2.2 : 1.15, 0);
      }
      // wheel-lift: stinger, crossbar and wheel cradles
      const lift = new THREE.Group();
      lift.position.set(-2.9, 0.62, 0);
      rig.add(lift);
      const l = into(lift);
      l.box([1.35, 0.14, 0.2], [-0.62, 0, 0], frame);
      l.box([0.16, 0.12, 2.0], [-1.25, 0, 0], frame);
      for (const side of [-1, 1]) {
        l.box([0.75, 0.1, 0.1], [-1.25, 0, side * 1.0], accent);
        for (const x of [-0.9, -1.6]) l.box([0.08, 0.1, 0.42], [x, 0, side * 0.8], accent);
      }
      if (a.job === 'empty') { lift.rotation.z = -1.25; lift.position.y = 0.75; }
      // chains
      for (const side of [-1, 1]) t.rod([-3.0, 1.1, side * 0.6], [-3.05, 0.5 + random() * 0.15, side * 0.62], 0.02, chrome);
    }

    // ---- the car on the hook --------------------------------------------------------
    const bobbers: THREE.Object3D[] = [];
    if (a.job !== 'empty') {
      const spec = CARS[a.cargo];
      const wreck = a.job === 'wreck';
      const hues = ['#7b1f1a', '#c9c7bd', '#8c9296', '#1f6d70', '#a88f57', '#24427f', '#3a3c40', '#5d3f2a'];
      const carColour = new THREE.Color(hues[Math.floor(random() * hues.length)]).lerp(new THREE.Color('#7d7466'), wreck ? 0.5 : scuff * 0.3);
      const carPaint = new THREE.MeshStandardMaterial({ color: carColour, roughness: wreck ? 0.95 : mix(0.25, 0.7, scuff), metalness: wreck ? 0 : 0.3 });
      const car = new THREE.Group();
      const c = into(car);
      const arch = spec.wheel + 0.07, bottom = wreck ? 0.3 : 0.26;
      const points: P2[] = [[spec.top[0][0], bottom], ...spec.top, [spec.top[spec.top.length - 1][0], bottom]];
      const carWidth = a.cargo === 'pickup' || a.cargo === 'minivan' ? 1.86 : 1.74;
      c.profile(points, carWidth, 0.06, carPaint, [[spec.base, spec.wheel, arch], [0, spec.wheel, arch]]);
      const cabin = c.profile(spec.cabin.map(([x, y], i) => [x, i === 0 || i === 3 ? y - 0.04 : y] as P2), carWidth * 0.84, 0.04, glass);
      const [rb, rt, ft, fb] = spec.cabin;
      const roof = c.box([ft[0] - rt[0] + 0.1, 0.05, carWidth * 0.84 + 0.02], [(ft[0] + rt[0]) / 2, ft[1] + 0.03, 0], carPaint);
      for (const side of [-1, 1]) {
        const zc = side * (carWidth * 0.42 - 0.01);
        c.rod([fb[0], fb[1], zc], [ft[0], ft[1] + 0.03, zc], 0.04, carPaint);
        c.rod([rb[0], rb[1], zc], [rt[0], rt[1] + 0.03, zc], 0.06, carPaint);
        const squashed = wreck && random() < 0.5;
        if (!(wreck && random() < 0.35)) c.wheel(0, side * (carWidth / 2 - 0.13), spec.wheel * (squashed ? 0.85 : 1), 0.22, wreck ? null : chrome);
        c.wheel(spec.base, side * (carWidth / 2 - 0.13), spec.wheel, 0.22, wreck ? null : chrome);
        c.box([0.05, 0.12, carWidth * 0.2], [spec.top[0][0] - 0.03, spec.top[1][1] - 0.14, side * carWidth * 0.34], new THREE.MeshStandardMaterial({ color: '#a8141a', emissive: '#ff2a2a', emissiveIntensity: 0.15 }));
        c.box([0.05, 0.12, carWidth * 0.2], [spec.top[spec.top.length - 1][0] + 0.03, spec.top[spec.top.length - 1][1] + 0.04, side * carWidth * 0.34], s.material('#f1eee0'));
      }
      c.box([0.12, 0.14, carWidth + 0.03], [spec.top[0][0] - 0.02, bottom + 0.1, 0], wreck ? black : chrome);
      c.box([0.12, 0.14, carWidth + 0.03], [spec.top[spec.top.length - 1][0] + 0.02, bottom + 0.1, 0], wreck ? black : chrome);
      if (a.cargo === 'pickup') c.box([2.0, 0.04, carWidth - 0.24], [0.1, 1.025, 0], black);
      if (wreck) {
        cabin.scale.y = 0.86; roof.position.y -= 0.2; roof.rotation.z = 0.05;
        const hood = c.box([spec.top[spec.top.length - 1][0] - fb[0] - 0.2, 0.04, carWidth * 0.8], [fb[0] + 0.55, fb[1] + 0.3, 0], s.material('#6f6a60', { roughness: 1 }));
        hood.rotation.z = 0.45 + random() * 0.3;
        for (let i = 0; i < 6; i++) c.box([0.3 + random() * 0.5, 0.2 + random() * 0.2, 0.014], [random() * spec.base, 0.6 + random() * 0.2, (random() < 0.5 ? -1 : 1) * (carWidth / 2 + 0.002)], s.material(i % 2 ? '#7a4a2a' : '#8d8f8c', { roughness: 1 }));
      }
      const roofY = ft[1] + 0.06, roofX = (ft[0] + rt[0]) / 2;
      if (a.left === 'luggage') {
        const stuff = ['#9a7b52', '#b79b6d', '#4a5f7a', '#7b2f2a', '#c9c4b4'];
        const loadX = a.cargo === 'pickup' ? 0.1 : roofX, loadY = a.cargo === 'pickup' ? 1.05 : roofY;
        for (let i = 0; i < 6; i++) {
          const sx = 0.35 + random() * 0.4, sy = 0.2 + random() * 0.25, sz = 0.3 + random() * 0.35;
          const item = c.box([sx, sy, sz], [loadX + (random() - 0.5) * 0.9, loadY + sy / 2 + (i > 3 ? 0.3 : 0), (random() - 0.5) * 0.8], s.material(stuff[i % stuff.length], { roughness: 0.95 }));
          item.rotation.y = (random() - 0.5) * 0.6;
        }
        c.rod([loadX + 0.3, loadY + 0.3, 0.2], [loadX + 0.3, loadY + 1.0, 0.2], 0.02, chrome);
        const shade = c.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 0.24, 10, 1, true), s.material('#efe3c2', { side: THREE.DoubleSide })));
        shade.position.set(loadX + 0.3, loadY + 1.05, 0.2);
        for (const z of [-0.5, 0.5]) c.rod([loadX - 0.5, loadY + 0.5, z], [loadX + 0.5, loadY + 0.5, z], 0.012, s.material('#e06a1c'));
      } else if (a.left === 'balloons') {
        const colours = ['#e3342f', '#ffcf1f', '#1f6fd8', '#2f9e44', '#ff5fa8'];
        for (let i = 0; i < 4; i++) {
          const pivot = new THREE.Group();
          pivot.position.set(fb[0] - 0.05, fb[1] + 0.1, carWidth / 2 + 0.06);
          pivot.rotation.set((random() - 0.5) * 0.6, 0, (random() - 0.5) * 0.6 + 0.3);
          const reach = 0.7 + random() * 0.6;
          const string = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, reach, 4), s.material('#f1eee4'));
          string.position.y = reach / 2;
          const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshStandardMaterial({ color: colours[i % 5], roughness: 0.25, emissive: colours[i % 5], emissiveIntensity: 0.1 }));
          balloon.position.y = reach + 0.16; balloon.scale.y = 1.25;
          pivot.add(string, balloon);
          c.add(pivot);
          bobbers.push(pivot);
        }
      } else if (a.left === 'tickets') {
        c.box([0.012, 0.3, 0.4], [fb[0] - 0.55, fb[1] + 0.26, carWidth * 0.42 + 0.03], s.material('#ff7b2e', { emissive: '#ff5a00', emissiveIntensity: 0.2 })).rotation.y = Math.PI / 2;
        const slopeX = fb[0] - ft[0], slopeY = ft[1] - fb[1];
        for (let i = 0; i < 3; i++) {
          const ticket = c.box([0.22, 0.008, 0.1], [fb[0] - slopeX * 0.12, fb[1] + slopeY * 0.14 + 0.03, -0.3 + i * 0.14], s.material(i === 1 ? '#ffd9d0' : '#f4f1e6'));
          ticket.rotation.z = Math.atan2(slopeY, -slopeX) + Math.PI;
          ticket.rotation.y = (random() - 0.5) * 0.5;
        }
      }
      if (rollback) {
        car.position.set(-3.75, 1.27, 0);
        for (const side of [-1, 1]) for (const x of [-3.9, -0.6]) t.rod([x, 1.3, side * 0.95], [x + (x < -2 ? 0.4 : -0.4), 1.27 + spec.wheel, side * (carWidth / 2 - 0.1)], 0.012, s.material('#e8b417'));
      } else {
        // front wheels sit in the cradles; the car pivots on its rear axle
        const raise = 0.62 - spec.wheel + 0.22;
        const tilt = Math.asin(raise / spec.base);
        car.rotation.z = tilt;
        car.position.set(hookX - Math.cos(tilt) * spec.base, 0, 0);
      }
      rig.add(car);
    }

    const flash = a.flashing ? mix(3, 11, mood.energy) : 0;
    const sway = mix(0.03, 0.18, mood.energy);
    const rest = bobbers.map((node) => node.rotation.z);
    const phases = bobbers.map(() => random() * 6.28);
    return s.finish({
      update: flash || bobbers.length ? (_dt, time) => {
        if (flash) {
          const on = Math.sin(time * flash) > 0;
          amber.emissiveIntensity = on ? 2.2 : 0.15;
          amberB.emissiveIntensity = on ? 0.15 : 2.2;
        }
        bobbers.forEach((node, i) => { node.rotation.z = rest[i] + Math.sin(time * 2 + phases[i]) * sway; });
      } : undefined,
    });
  },
});
