import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const BUNCHES = {
  weather: 'Big cream-white latex weather balloons, all alike.',
  party: 'A party mix of red, yellow, blue and green.',
  red: 'All red, every one.',
  pastel: 'Soft pastels: pink, mint, lemon, lilac.',
  black: 'Black and gold, a strange funeral.',
  silver: 'Silver foil and white, flashing in the sun.',
} as const;
const BUNCH_COLOURS: Record<keyof typeof BUNCHES, string[]> = {
  weather: ['#f1ead6', '#ece3c8', '#f6f1e2'],
  party: ['#e03a2e', '#f4c81e', '#2f72c8', '#3aa655', '#f08a1e'],
  red: ['#d8261e', '#c81e28', '#e03a2e'],
  pastel: ['#f6b6c8', '#b9e3d0', '#fbe7a1', '#cdb9ee'],
  black: ['#1c1c20', '#26262c', '#d2a640'],
  silver: ['#d9dde0', '#f4f5f5', '#bfc6cc'],
};
const WEBBING: Record<string, [string, string]> = { green: ['#2f8a4a', '#f2f0e4'], orange: ['#e87a1e', '#f4d23a'], blue: ['#2f5fb0', '#f2f0e4'], brown: ['#7a5a3a', '#d9c9a0'] };

export default defineThing({
  questions: {
    balloons: score('How many balloons are lifting it?', ['A hopeful handful of five', 'A dozen', 'Two dozen', 'A great towering bunch of forty']),
    colours: choice('What do the balloons look like?', BUNCHES),
    flight: choice('What is it doing right now?', {
      lifting: 'Rising free: lines taut, a cut tether trailing to the ground.',
      straining: 'Straining at a rope still tied to a stake, a moment before the off.',
      sinking: 'Sinking: a third of the balloons have burst and hang as limp rags on their lines.',
      snagged: 'Snagged in power lines, the chair dangling beside a utility pole.',
    }),
    occupant: choice('What trace is there of whoever flies it?', {
      seated: 'They are in it: a figure in shorts and a cap, legs dangling.',
      shoes: 'Nobody, but a pair of shoes stands on the ground beneath.',
      jacket: 'Nobody, but a jacket hangs on the back and a cap sits on the seat.',
      untouched: 'Nobody yet: the seat is bare and waiting.',
    }),
    cargo: choice('What is strapped to the chair?', {
      classic: 'A cooler of sandwiches and beer on one side and a pellet gun across the arms for shooting out balloons.',
      jugs: 'Plastic water jugs tied all round the frame as ballast.',
      radio: 'A CB radio with a long whip antenna and a camera on a strap.',
      parachute: 'A parachute pack on the back and a crash helmet.',
      nothing: 'Nothing at all: just the chair.',
    }),
    webbing: choice('What is the chair webbing like?', {
      green: 'Green and white plaid straps.',
      orange: 'Orange and yellow straps, loud and sunny.',
      blue: 'Blue and white straps.',
      brown: 'Brown and tan straps, a grandfather\'s chair.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const alu = s.material('#c9ced2', { metalness: 0.85, roughness: 0.3 });
    const plastic = s.material('#eeeade', { roughness: 0.6 });
    const cord = s.material('#e9e6dc', { roughness: 0.9 });
    const rope = s.material('#a8895a', { roughness: 0.95 });
    const dark = s.material('#26282c', { roughness: 0.7 });

    // Woven webbing, painted once.
    const [strapA, strapB] = WEBBING[a.webbing];
    const weave = document.createElement('canvas');
    weave.width = weave.height = 256;
    const w = weave.getContext('2d')!;
    w.fillStyle = '#1c1c1c'; w.fillRect(0, 0, 256, 256);
    const straps = 5, pitch = 256 / straps;
    for (let i = 0; i < straps; i++) for (let j = 0; j < straps; j++) {
      const over = (i + j) % 2 === 0;
      w.fillStyle = over ? strapA : strapB;
      if (over) w.fillRect(i * pitch + 3, j * pitch - 2, pitch - 6, pitch + 4); else w.fillRect(i * pitch - 2, j * pitch + 3, pitch + 4, pitch - 6);
      w.fillStyle = 'rgba(255,255,255,0.25)';
      if (over) w.fillRect(i * pitch + pitch / 2 - 3, j * pitch - 2, 6, pitch + 4); else w.fillRect(i * pitch - 2, j * pitch + pitch / 2 - 3, pitch + 4, 6);
    }
    for (let i = 0; i < mood.wear * 30; i++) { w.fillStyle = `rgba(40,30,20,${0.15 + random() * 0.25})`; w.fillRect(random() * 256, random() * 256, 4 + random() * 30, 2 + random() * 5); }
    const weaveMap = new THREE.CanvasTexture(weave);
    weaveMap.colorSpace = THREE.SRGBColorSpace;
    const web = new THREE.MeshStandardMaterial({ map: weaveMap, roughness: 0.85, side: THREE.DoubleSide });

    // The chair, built on the ground in its own group so it can be hoisted and tilted.
    const chair = new THREE.Group();
    s.root.add(chair);
    const on = <T extends THREE.Object3D>(node: T) => { chair.add(node); return node; };
    const X = 0.28, seatY = 0.42, armY = 0.63;
    for (const side of [-1, 1]) {
      const x = side * X;
      on(s.tube([[x, 0.012, 0.3], [x, 0.3, 0.27], [x, armY, 0.22], [x, armY + 0.01, 0], [x, armY, -0.2], [x, 0.3, -0.27], [x, 0.012, -0.32]], 0.012, alu));
      on(s.rod([x, seatY, 0.25], [x, seatY, -0.22], 0.011, alu));
      on(s.rod([x * 0.96, seatY - 0.02, -0.2], [x * 0.96, 1.0, -0.4], 0.011, alu));
      on(s.box([0.05, 0.018, 0.4], [x, armY + 0.022, 0.01], plastic));
    }
    for (const [y, z] of [[0.012, 0.3], [0.012, -0.32], [seatY, 0.25], [seatY, -0.22], [1.0, -0.4]]) on(s.rod([-X, y, z], [X, y, z], 0.011, alu));
    on(s.mesh(new THREE.PlaneGeometry(X * 2 - 0.03, 0.47), web, [0, seatY + 0.004, 0.015])).rotation.x = -Math.PI / 2;
    const back = on(s.mesh(new THREE.PlaneGeometry(X * 2 - 0.05, 0.52), web, [0, 0.72, -0.305]));
    back.rotation.x = -0.335;

    const tones = ['#e9c4a0', '#c58c62', '#8a5a3c'];
    const fabric = (hex: string) => s.material(hex, { roughness: 0.85 });
    if (a.occupant === 'seated') {
      const flesh = s.material(tones[Math.floor(random() * 3)], { roughness: 0.7 });
      const shirt = fabric(['#d8c84a', '#e8e4d8', '#5a8ac8', '#c8452f'][Math.floor(random() * 4)]), shorts = fabric('#6a7a5a');
      on(s.rod([0, seatY + 0.1, -0.12], [0, seatY + 0.55, -0.27], 0.15, shirt, 0.13));
      on(s.ball([0.1, 0.115, 0.105], [0, seatY + 0.72, -0.27], flesh, 14));
      on(s.ball([0.105, 0.05, 0.11], [0, seatY + 0.8, -0.265], fabric('#c8281e'), 12));
      on(s.box([0.14, 0.012, 0.09], [0, seatY + 0.775, -0.17], fabric('#c8281e')));
      on(s.box([0.17, 0.035, 0.02], [0, seatY + 0.735, -0.175], dark));
      for (const side of [-1, 1]) {
        on(s.rod([side * 0.1, seatY + 0.09, -0.1], [side * 0.11, seatY + 0.09, 0.26], 0.07, shorts, 0.06));
        on(s.rod([side * 0.11, seatY + 0.08, 0.27], [side * 0.11 + (random() - 0.5) * 0.06, 0.1, 0.3 + random() * 0.08], 0.05, flesh, 0.04));
        on(s.box([0.08, 0.05, 0.2], [side * 0.11, 0.07, 0.36], fabric('#f2f0ea')));
        on(s.rod([side * 0.19, seatY + 0.48, -0.24], [side * 0.27, armY + 0.06, -0.08], 0.045, shirt, 0.04));
        on(s.rod([side * 0.27, armY + 0.06, -0.08], [side * 0.27, armY + 0.05, 0.15], 0.038, flesh, 0.034));
      }
    } else if (a.occupant === 'jacket') {
      const cloth = new THREE.MeshStandardMaterial({ color: ['#3a5a8a', '#8a3a2e', '#5a5a3a'][Math.floor(random() * 3)], roughness: 0.9, side: THREE.DoubleSide });
      const drape = on(s.box([0.5, 0.42, 0.06], [0, 0.86, -0.375], cloth)); drape.rotation.x = -0.335;
      for (const side of [-1, 1]) on(s.rod([side * 0.25, 0.95, -0.4], [side * 0.3, 0.5, -0.36], 0.05, cloth, 0.04));
      on(s.ball([0.1, 0.05, 0.1], [0.05, seatY + 0.05, 0.02], fabric('#c8281e'), 12));
      on(s.box([0.13, 0.012, 0.09], [0.05, seatY + 0.02, 0.12], fabric('#c8281e')));
    }

    // Cargo.
    if (a.cargo === 'classic') {
      on(s.box([0.3, 0.26, 0.42], [X + 0.18, 0.36, 0], fabric('#c8362e')));
      on(s.box([0.32, 0.06, 0.44], [X + 0.18, 0.52, 0], plastic));
      on(s.ring(0.12, 0.012, [X + 0.18, 0.55, 0], plastic, Math.PI)).rotation.y = Math.PI / 2;
      for (const z of [-0.12, 0.12]) on(s.rod([X + 0.03, 0.5, z], [X, armY, z], 0.008, rope));
      const gun = new THREE.Group();
      gun.position.set(0, armY + 0.05, 0.12); gun.rotation.y = 0.12;
      for (const mesh of [s.rod([-0.42, 0, 0], [0.5, 0, 0], 0.012, dark), s.rod([-0.35, -0.022, 0], [0.1, -0.022, 0], 0.014, dark), s.box([0.34, 0.07, 0.035], [-0.52, -0.02, 0], s.material('#6b4426', { roughness: 0.6 })), s.box([0.05, 0.06, 0.02], [-0.3, -0.05, 0], dark)]) gun.add(mesh);
      on(gun);
    } else if (a.cargo === 'jugs') {
      const jug = new THREE.MeshStandardMaterial({ color: '#e4ecef', roughness: 0.35 }), capPaint = fabric('#2f72c8');
      const count = 6 + Math.round(mood.density * 4);
      for (let i = 0; i < count; i++) {
        const side = i % 2 ? 1 : -1, z = mix(-0.3, 0.26, Math.floor(i / 2) / Math.max(1, Math.ceil(count / 2) - 1)), drop = 0.3 + random() * 0.14;
        const x = side * (X + 0.11 + random() * 0.03);
        on(s.rod([side * X, armY, z], [x, armY - drop + 0.26, z], 0.004, cord));
        on(s.cylinder(0.075, 0.08, 0.2, [x, armY - drop + 0.1, z], jug, 12)).rotation.y = random();
        on(s.cylinder(0.025, 0.06, 0.05, [x, armY - drop + 0.225, z], jug, 10));
        on(s.cylinder(0.022, 0.022, 0.02, [x, armY - drop + 0.26, z], capPaint, 10));
      }
    } else if (a.cargo === 'radio') {
      on(s.box([0.2, 0.08, 0.24], [-X - 0.02, armY + 0.075, 0.02], dark));
      on(s.box([0.16, 0.045, 0.006], [-X - 0.02, armY + 0.075, 0.143], s.material('#b8bcc0', { metalness: 0.6 })));
      on(s.rod([-X - 0.08, armY + 0.11, -0.08], [-X - 0.16, armY + 1.5, -0.2], 0.005, alu, 0.002));
      on(s.tube([[-X + 0.04, armY + 0.08, 0.14], [-X + 0.08, armY - 0.1, 0.2], [-X + 0.12, armY - 0.02, 0.22], [-X + 0.14, armY + 0.04, 0.2]], 0.005, dark));
      on(s.box([0.05, 0.08, 0.035], [-X + 0.15, armY + 0.06, 0.2], dark));
      on(s.rod([X, armY, 0.15], [X + 0.06, armY - 0.22, 0.2], 0.004, dark));
      on(s.box([0.13, 0.085, 0.06], [X + 0.07, armY - 0.27, 0.2], dark));
      on(s.cylinder(0.032, 0.036, 0.06, [X + 0.07, armY - 0.27, 0.25], s.material('#3a3c40', { metalness: 0.5 }), 14)).rotation.x = Math.PI / 2;
    } else if (a.cargo === 'parachute') {
      const pack = on(s.box([0.4, 0.5, 0.16], [0, 0.72, -0.44], fabric('#4a5a3a'))); pack.rotation.x = -0.335;
      for (const side of [-1, 1]) on(s.rod([side * 0.14, 0.97, -0.44], [side * 0.14, 0.5, -0.3], 0.014, fabric('#c9b98a')));
      on(s.box([0.05, 0.05, 0.03], [0.12, 0.8, -0.54], fabric('#c8281e')));
      on(s.ball([0.125, 0.115, 0.14], [X + 0.06, armY - 0.2, 0.12], s.material('#e8e4d8', { roughness: 0.3 }), 16));
      on(s.rod([X, armY, 0.12], [X + 0.05, armY - 0.1, 0.12], 0.005, dark));
    }
    if (a.occupant === 'shoes') for (const side of [-1, 1]) { const shoe = s.box([0.09, 0.06, 0.24], [side * 0.1 + (random() - 0.5) * 0.05, 0.03, 0.42 + random() * 0.08], fabric('#f2f0ea')); shoe.rotation.y = (random() - 0.5) * 0.6; s.box([0.08, 0.04, 0.1], [shoe.position.x, 0.075, shoe.position.z - 0.06], fabric('#f2f0ea')).rotation.y = shoe.rotation.y; }

    // Where it is in the air.
    const snagged = a.flight === 'snagged';
    const hoist = { lifting: 0.75, straining: 0.4, sinking: 0, snagged: 2.9 }[a.flight];
    chair.position.set(snagged ? 0.5 : 0, hoist, 0);
    chair.rotation.set(a.flight === 'straining' ? -0.12 : (random() - 0.5) * 0.08, (random() - 0.5) * 0.3, a.flight === 'sinking' ? 0 : snagged ? 0.3 : (random() - 0.5) * 0.14);
    chair.updateMatrixWorld(true);
    const anchors = [[-X, 1.0, -0.4], [X, 1.0, -0.4], [-X, armY, 0.22], [X, armY, 0.22]].map(([x, y, z]) => new THREE.Vector3(x, y, z).applyMatrix4(chair.matrixWorld));

    // The bunch: relaxed so no two balloons overlap, packed above the chair.
    const total = Math.max(4, Math.round(mix(5, 38, a.balloons)));
    const palette = BUNCH_COLOURS[a.colours];
    const lean = a.flight === 'sinking' ? (random() < 0.5 ? -1 : 1) * 0.9 : snagged ? 0.9 : (random() - 0.5) * 0.5;
    const spread = 0.62 * Math.cbrt(total);
    const bunch = Array.from({ length: total }, () => ({ p: new THREE.Vector3((random() - 0.5) * spread * 2, random() * spread * 2.4, (random() - 0.5) * spread * 2), r: mix(0.4, 0.62, random()) * (a.colours === 'weather' ? 1.12 : 1) }));
    for (let step = 0; step < 40; step++) {
      for (let i = 0; i < total; i++) {
        const one = bunch[i];
        one.p.x *= 0.96; one.p.z *= 0.96; one.p.y = Math.max(one.r, one.p.y * 0.98);
        for (let j = i + 1; j < total; j++) {
          const other = bunch[j], gap = one.p.distanceTo(other.p), need = (one.r + other.r) * 0.96;
          if (gap < need) { const push = other.p.clone().sub(one.p).normalize().multiplyScalar((need - gap) / 2 + 0.001); if (push.lengthSq() === 0) push.set(0.01, 0.01, 0); one.p.sub(push); other.p.add(push); }
        }
      }
    }
    const top = anchors[0].y;
    const base = top + (a.flight === 'sinking' ? 1.3 : 1.9);
    const rig = new THREE.Group();
    rig.position.set(chair.position.x, top, 0);
    s.root.add(rig);
    const hang = (node: THREE.Object3D) => { rig.attach(node); return node; };
    const live: { at: [number, number, number]; size: number; color: string }[] = [];
    const latex = new THREE.MeshStandardMaterial({ roughness: a.colours === 'silver' ? 0.15 : 0.3, metalness: a.colours === 'silver' ? 0.7 : 0 });
    const rag = new THREE.ConeGeometry(0.07, 0.34, 5);
    bunch.forEach((one, index) => {
      const colour = palette[Math.floor(random() * palette.length)];
      const anchor = anchors[index % 4];
      const lift = one.p.y;
      const centre = new THREE.Vector3(chair.position.x + one.p.x + lean * (lift + 1.5) * 0.3, base + lift, one.p.z);
      const burst = a.flight === 'sinking' && index % 3 === 0;
      if (burst) {
        // A dead balloon: its line droops and a rag of rubber hangs at the end.
        const end = new THREE.Vector3(anchor.x + (random() - 0.5) * 1.6, Math.max(0.2, anchor.y - 0.2 - random() * 0.7), anchor.z + (random() - 0.5) * 1.6);
        hang(s.rod(anchor.toArray() as [number, number, number], end.toArray() as [number, number, number], 0.005, cord));
        hang(s.mesh(rag, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6 }), [end.x, end.y - 0.15, end.z])).rotation.z = Math.PI + (random() - 0.5) * 0.5;
        return;
      }
      live.push({ at: centre.toArray() as [number, number, number], size: one.r, color: colour });
      const neck = centre.clone().add(anchor.clone().sub(centre).normalize().multiplyScalar(one.r * 0.98));
      hang(s.rod(anchor.toArray() as [number, number, number], neck.toArray() as [number, number, number], 0.005, cord));
    });
    const skins = s.scatter(new THREE.SphereGeometry(1, 20, 14), latex, live);
    hang(skins);

    if (a.flight === 'lifting') {
      const foot = new THREE.Vector3(-X, 0.02, -0.3).applyMatrix4(chair.matrixWorld);
      s.tube([foot.toArray() as [number, number, number], [foot.x - 0.1, hoist * 0.5, foot.z - 0.05], [foot.x - 0.22, 0.03, foot.z + 0.05], [foot.x - 0.4, 0.015, foot.z + 0.2], [foot.x - 0.3, 0.015, foot.z + 0.38]], 0.012, rope);
    } else if (a.flight === 'straining') {
      const foot = new THREE.Vector3(0, 0.02, -0.32).applyMatrix4(chair.matrixWorld);
      s.rod(foot.toArray() as [number, number, number], [0.1, 0.12, -1.5], 0.012, rope);
      s.rod([0.1, 0.3, -1.42], [0.1, -0.05, -1.58], 0.03, s.material('#7a5a3a'));
    } else if (snagged) {
      const timber = s.material('#5d4a38', { roughness: 0.95 });
      const px = -1.2, tall = 6.4;
      s.cylinder(0.11, 0.15, tall, [px, tall / 2, 0], timber, 12);
      s.box([0.1, 0.12, 2.2], [px, tall - 0.5, 0], timber);
      s.cylinder(0.2, 0.2, 0.55, [px + 0.25, tall - 1.5, 0], s.material('#8a9096', { metalness: 0.5 }), 14);
      for (const z of [-0.95, 0, 0.95]) {
        s.cylinder(0.04, 0.06, 0.14, [px, tall - 0.37, z], s.material('#6a8a8a', { roughness: 0.3 }), 10);
        s.tube([[-4.2, tall - 0.42, z], [px, tall - 0.3, z], [1.2, tall - 0.62, z], [4.2, tall - 0.4, z]], 0.014, dark);
      }
      const spark = new THREE.MeshBasicMaterial({ color: '#fff3a0' });
      for (let i = 0; i < 5; i++) { const flash = s.mesh(new THREE.OctahedronGeometry(0.05 + random() * 0.06), spark, [0.6 + random() * 0.5, tall - 0.6 + (random() - 0.5) * 0.3, (random() - 0.5) * 0.6]); flash.scale.y = 2.2; flash.rotation.z = random() * 3; flash.castShadow = false; }
    }

    const sway = mix(0.01, 0.05, mood.energy), tilt = rig.rotation.z;
    return s.finish({ footprint: 1.6, update: (_dt, time) => { rig.rotation.z = tilt + Math.sin(time * mix(0.6, 1.8, mood.energy)) * sway; rig.rotation.x = Math.sin(time * 0.43 + 1) * sway * 0.7; } });
  },
});
