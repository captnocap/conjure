import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    state: choice('What is the machine doing?', {
      running: 'Running: handle lowered to hip height, the pad spinning, mid-swing across the floor.',
      parked: 'Parked: handle locked upright, pad still, waiting for the shift to start or end.',
      tipped: 'Tipped back on its wheels with the pad facing out, a fresh pad lying beside it.',
    }),
    cord: choice('Where is the extension cord?', {
      wrapped: 'Wrapped in neat loops round the hooks on the handle.',
      trailing: 'Trailing away across the floor in long lazy curves.',
      coiled: 'Dropped in a loose coil on the floor beside it.',
      unplugged: 'Pulled out and lying dead, the plug a short way off.',
    }),
    hung: choice('What is hanging on the handle?', {
      nothing: 'Nothing.',
      radio: 'A battered portable radio on its strap, aerial up.',
      jacket: 'A work jacket slung over the grips.',
      headphones: 'A pair of big headphones.',
      spray: 'A spray bottle hooked by its trigger and a rag.',
      keys: 'A heavy ring of keys on a lanyard.',
    }),
    pad: choice('What pad is fitted?', {
      red: 'A red buffing pad.',
      white: 'A white polishing pad, gone grey at the edge.',
      black: 'A black stripping pad for taking old wax off.',
      green: 'A green scrubbing pad.',
      tan: 'A tan natural-fibre burnishing pad.',
    }),
    body: choice('What does the machine look like?', {
      grey: 'Battleship grey industrial with a chrome handle.',
      blue: 'Contract-cleaner blue.',
      red: 'Red, like a hire machine.',
      steel: 'An old polished-metal model with a domed motor cover.',
      yellow: 'Yellow and black.',
    }),
    trail: choice('What has it left on the floor?', {
      gloss: 'A glossy scalloped arc of fresh polish.',
      foam: 'A milky swirl of stripper and suds.',
      swirls: 'Faint dull swirl marks on a dry floor.',
      none: 'Nothing visible.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const bodyColour = { grey: '#7c858a', blue: '#2a5cb8', red: '#c8281e', steel: '#c2c8ca', yellow: '#f0c01c' }[a.body];
    const shell = s.material(bodyColour, { metalness: a.body === 'steel' ? 0.85 : 0.25, roughness: a.body === 'steel' ? 0.25 : 0.45 });
    const chrome = s.material('#d4dadc', { metalness: 0.9, roughness: 0.2 });
    const rubber = s.material('#222428', { roughness: 0.85 });
    const cordMat = s.material('#f07a16', { roughness: 0.55 });
    const padColour = { red: '#c8322a', white: '#eeeae0', black: '#26262a', green: '#3f8a4a', tan: '#c8a878' }[a.pad];
    const padMat = s.material(padColour, { roughness: 1 });

    const machine = new THREE.Group();
    s.root.add(machine);
    const put = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = machine) => { node.traverse((n) => { n.castShadow = n.receiveShadow = true; }); parent.add(node); return node; };
    const cyl = (rt: number, rb: number, h: number, at: P3, material: THREE.Material, parent: THREE.Object3D = machine, seg = 28) => { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material); mesh.position.set(...at); return put(mesh, parent); };
    const box = (size: P3, at: P3, material: THREE.Material, parent: THREE.Object3D = machine) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...at); return put(mesh, parent); };
    const tube = (points: readonly P3[], radius: number, material: THREE.Material, parent: THREE.Object3D = machine, closed = false) => put(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed), Math.max(32, points.length * 10), radius, 7, closed), material), parent);

    // Head: skirt, bumper, motor.
    const R = 0.225;
    const skirt = new THREE.Mesh(new THREE.LatheGeometry([[R - 0.012, 0.035], [R, 0.04], [R, 0.085], [R - 0.03, 0.125], [0.13, 0.15], [0.001, 0.15]].map(([x, y]) => new THREE.Vector2(x, y)), 40), shell);
    put(skirt);
    put(new THREE.Mesh(new THREE.TorusGeometry(R, 0.016, 8, 40), rubber)).rotation.x = Math.PI / 2;
    machine.children[machine.children.length - 1].position.y = 0.055;
    if (a.body === 'yellow') for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; const stripe = box([0.05, 0.004, 0.07], [Math.cos(t) * 0.17, 0.123, Math.sin(t) * 0.17], rubber); stripe.rotation.y = -t; stripe.rotation.z = -0.38; }
    cyl(0.1, 0.11, 0.2, [0, 0.25, 0], a.body === 'steel' ? chrome : s.material('#3a3e44', { metalness: 0.4, roughness: 0.5 }));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), a.body === 'steel' ? chrome : shell); dome.position.y = 0.35; dome.scale.y = 0.5; put(dome);
    for (let i = 0; i < 10; i++) { const t = i * Math.PI / 5; box([0.012, 0.11, 0.008], [Math.cos(t) * 0.108, 0.25, Math.sin(t) * 0.108], rubber).rotation.y = -t + Math.PI / 2; }
    // Pad and driver.
    const pad = new THREE.Group(); pad.position.y = 0.014; machine.add(pad);
    cyl(R - 0.008, R - 0.008, 0.026, [0, 0, 0], padMat, pad, 36);
    cyl(0.045, 0.045, 0.03, [0, 0, 0], rubber, pad, 16);
    const worn = s.material(new THREE.Color(padColour).lerp(new THREE.Color('#5a5a56'), 0.45), { roughness: 1 });
    for (let i = 0; i < 5; i++) { const t = i * Math.PI * 2 / 5; box([0.012, 0.03, 0.15], [Math.cos(t) * 0.125, -0.001, Math.sin(t) * 0.125], worn, pad).rotation.y = -t + Math.PI / 2; }
    put(new THREE.Mesh(new THREE.TorusGeometry(R - 0.02, 0.008, 6, 36), worn), pad).rotation.x = Math.PI / 2;
    // Wheels and yoke.
    for (const side of [-1, 1]) {
      cyl(0.062, 0.062, 0.035, [side * 0.15, 0.062, -0.275], rubber, machine, 20).rotation.z = Math.PI / 2;
      cyl(0.03, 0.03, 0.038, [side * 0.15, 0.062, -0.275], chrome, machine, 12).rotation.z = Math.PI / 2;
      box([0.02, 0.05, 0.14], [side * 0.12, 0.1, -0.21], shell).rotation.x = 0.4;
    }
    cyl(0.012, 0.012, 0.3, [0, 0.062, -0.275], chrome, machine, 8).rotation.z = Math.PI / 2;
    box([0.1, 0.07, 0.1], [0, 0.16, -0.2], shell);

    // Handle.
    const lean = { running: 0.62, parked: 0.1, tipped: 0.1 }[a.state] + (random() - 0.5) * 0.06;
    const L = 1.0;
    const handle = new THREE.Group(); handle.position.set(0, 0.17, -0.2); handle.rotation.x = -lean; machine.add(handle);
    cyl(0.019, 0.019, L, [0, L / 2, 0], chrome, handle, 12);
    box([0.2, 0.09, 0.09], [0, L, 0], shell, handle);
    for (const side of [-1, 1]) {
      cyl(0.016, 0.016, 0.2, [side * 0.2, L + 0.01, 0], chrome, handle, 10).rotation.z = Math.PI / 2;
      cyl(0.021, 0.021, 0.12, [side * 0.25, L + 0.01, 0], rubber, handle, 10).rotation.z = Math.PI / 2;
      box([0.11, 0.008, 0.02], [side * 0.22, L - 0.025, 0.012], s.material(a.body === 'red' ? '#26262a' : '#c8281e'), handle);
    }
    cyl(0.012, 0.012, 0.012, [0.05, L + 0.01, 0.048], new THREE.MeshStandardMaterial({ color: a.state === 'running' ? '#5cf07a' : '#3a1c1c', emissive: a.state === 'running' ? '#3ce060' : '#000000', emissiveIntensity: 1.4 }), handle, 10).rotation.x = Math.PI / 2;
    for (const y of [0.42, 0.82]) { box([0.012, 0.012, 0.07], [0, y, -0.045], chrome, handle); box([0.012, y < 0.5 ? -0.04 : 0.04, 0.012].map(Math.abs) as P3, [0, y + (y < 0.5 ? -0.02 : 0.02), -0.078], chrome, handle); }
    // Power lead from the switch box down to the motor.
    tube([[0, L - 0.04, -0.03], [0.03, 0.6, -0.035], [0.03, 0.25, -0.03], [0.02, 0.06, 0.06]], 0.008, rubber, handle);

    // Hung on the handle, hanging plumb whatever the handle angle.
    const hung = new THREE.Group(); hung.position.set(0, L, 0); hung.rotation.x = lean; handle.add(hung);
    if (a.hung === 'radio') {
      const x = 0.22;
      tube([[x - 0.04, 0.03, 0], [x - 0.07, -0.1, 0.02], [x - 0.09, -0.2, 0.03]], 0.005, rubber, hung); tube([[x + 0.04, 0.03, 0], [x + 0.07, -0.1, 0.02], [x + 0.09, -0.2, 0.03]], 0.005, rubber, hung);
      box([0.24, 0.13, 0.07], [x, -0.26, 0.03], s.material(pick(['#3a3e44', '#b8b8b0', '#8a2a22'])), hung);
      for (const side of [-1, 1]) cyl(0.042, 0.042, 0.01, [x + side * 0.065, -0.265, 0.068], rubber, hung, 16).rotation.x = Math.PI / 2;
      box([0.07, 0.025, 0.006], [x, -0.215, 0.068], s.material('#e8d89a'), hung);
      cyl(0.003, 0.003, 0.28, [x + 0.1, -0.08, 0.03], chrome, hung, 6).rotation.z = -0.35;
    } else if (a.hung === 'jacket') {
      const cloth = s.material(pick(['#e8e21c', '#f07a16', '#3a5a8a', '#4a5048', '#7a3a2a']), { roughness: 0.95 });
      const hiVis = cloth.color.g > 0.4 && cloth.color.b < 0.2;
      box([0.4, 0.045, 0.11], [0, 0.03, 0], cloth, hung);
      box([0.4, 0.26, 0.03], [0, -0.1, 0.062], cloth, hung).rotation.x = 0.13;
      box([0.37, 0.3, 0.03], [0, -0.37, 0.07], cloth, hung).rotation.x = -0.07;
      box([0.4, 0.22, 0.03], [0, -0.08, -0.06], cloth, hung).rotation.x = -0.1;
      for (const side of [-1, 1]) { const sleeve = cyl(0.05, 0.036, 0.5, [side * 0.245, -0.22, 0.03], cloth, hung, 10); sleeve.rotation.z = side * 0.2; sleeve.rotation.x = side * 0.12; }
      const collar = cyl(0.07, 0.085, 0.05, [0, 0.075, 0.01], cloth, hung, 12); collar.scale.z = 0.6;
      if (hiVis) for (const y of [-0.3, -0.4]) box([0.375, 0.03, 0.034], [0, y, 0.074], s.material('#d8dcde', { metalness: 0.6, roughness: 0.3 }), hung);
    } else if (a.hung === 'headphones') {
      const x = -0.2;
      put(new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 24, Math.PI), rubber), hung).position.set(x, -0.06, 0);
      for (const side of [-1, 1]) cyl(0.045, 0.045, 0.04, [x + side * 0.085, -0.09, 0], s.material(pick(['#c8281e', '#26262a', '#e8e8e4'])), hung, 16).rotation.z = Math.PI / 2;
    } else if (a.hung === 'spray') {
      const x = 0.21;
      cyl(0.038, 0.042, 0.17, [x, -0.2, 0.03], new THREE.MeshStandardMaterial({ color: pick(['#5ac8f0', '#f078b0', '#a8e04a']), roughness: 0.15, transparent: true, opacity: 0.85 }), hung, 14);
      cyl(0.018, 0.03, 0.05, [x, -0.09, 0.03], s.material('#f4f4f0'), hung, 10);
      box([0.03, 0.045, 0.1], [x, -0.045, 0.045], s.material('#f4f4f0'), hung); box([0.012, 0.06, 0.02], [x, -0.07, 0.085], s.material('#c8281e'), hung);
      const rag = s.material('#e8e4d8', { roughness: 1 });
      box([0.16, 0.035, 0.07], [-0.2, 0.035, 0], rag, hung); box([0.15, 0.2, 0.012], [-0.2, -0.07, 0.035], rag, hung).rotation.z = 0.08; box([0.14, 0.12, 0.012], [-0.2, -0.03, -0.035], rag, hung);
    } else if (a.hung === 'keys') {
      const x = 0.2; const lanyard = s.material(pick(['#2a5cb8', '#c8281e', '#2f8a4a']));
      tube([[x - 0.02, 0.03, 0], [x - 0.012, -0.14, 0.02], [x, -0.28, 0.025], [x + 0.012, -0.14, 0.02], [x + 0.02, 0.03, 0]], 0.006, lanyard, hung);
      put(new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.004, 6, 18), chrome), hung).position.set(x, -0.31, 0.025);
      for (let i = 0; i < 5; i++) { const key = box([0.014, 0.075, 0.003], [x + (i - 2) * 0.012, -0.37, 0.025 + (i - 2) * 0.004], i % 2 ? chrome : s.material('#c8a23a', { metalness: 0.8, roughness: 0.3 }), hung); key.rotation.z = (i - 2) * 0.22; }
    }

    // Cord.
    const tipped = a.state === 'tipped';
    const plug = (at: P3, turn: number) => { const body = s.box([0.045, 0.03, 0.06], at, cordMat); body.rotation.y = turn; for (const side of [-1, 1]) { const prong = s.box([0.004, 0.012, 0.03], [at[0] + Math.sin(turn) * 0.045 + Math.cos(turn) * side * 0.01, at[1], at[2] + Math.cos(turn) * 0.045 - Math.sin(turn) * side * 0.01], chrome); prong.rotation.y = turn; } };
    if (a.cord === 'wrapped') {
      for (let i = 0; i < 6; i++) {
        const rx = 0.045 + i * 0.007, z = -0.065 - (i % 3) * 0.012;
        const points: P3[] = Array.from({ length: 14 }, (_u, k) => { const t = k / 14 * Math.PI * 2; return [Math.sin(t) * rx, 0.62 + Math.cos(t) * (0.225 + i * 0.006), z + Math.sin(t * 2 + i) * 0.006]; });
        tube(points, 0.0085, cordMat, handle, true);
      }
    } else {
      const sx = 0.26 + random() * 0.15, dir = random() < 0.5 ? -1 : 1;
      const start: P3 = tipped ? [0.05, 0.02, -0.6] : [0.0, 0.17 + Math.cos(lean) * 0.5, -0.2 - Math.sin(lean) * 0.5 - 0.03];
      const points: P3[] = [start, [dir * 0.06, 0.1, start[2] - 0.12], [dir * 0.16, 0.012, start[2] - 0.2]];
      if (a.cord === 'coiled') {
        const cx = dir * 0.52, cz = -0.25;
        points.push([dir * 0.3, 0.012, cz - 0.3]);
        for (let k = 0; k < 44; k++) { const t = k / 44 * Math.PI * 2 * 3.6, r = 0.2 - k * 0.0012 + Math.sin(k * 1.7) * 0.012; points.push([cx + Math.cos(t - 1.6) * r * dir, 0.012 + k * 0.0009, cz + Math.sin(t - 1.6) * r]); }
        tube(points, 0.0085, cordMat, s.root);
        const end = points[points.length - 1]; plug([end[0], 0.06, end[2] + 0.03], 0.3);
      } else {
        const reach = a.cord === 'unplugged' ? 0.9 : 1.35, waves = 2 + Math.floor(random() * 2);
        for (let k = 1; k <= 12; k++) { const u = k / 12; points.push([dir * (sx * 0.6 + u * reach * 0.75) + Math.sin(u * 3) * 0.05, 0.012, start[2] - 0.2 + Math.sin(u * Math.PI * waves) * 0.3 * (1 - u * 0.3) + u * 0.5]); }
        tube(points, 0.0085, cordMat, s.root);
        const end = points[points.length - 1];
        if (a.cord === 'unplugged') plug([end[0] + dir * 0.03, 0.016, end[2]], dir * Math.PI / 2);
      }
    }

    // Pose.
    if (tipped) {
      const pivot = new THREE.Group(); pivot.position.set(0, 0.062, -0.275); s.root.add(pivot); pivot.add(machine);
      machine.position.set(0, -0.062, 0.275); pivot.rotation.x = -1.5;
      // A fresh pad on the floor.
      s.cylinder(0.215, 0.215, 0.026, [0.45, 0.013, 0.2], s.material(pick(['#c8322a', '#eeeae0', '#26262a', '#3f8a4a'].filter((c) => c !== padColour)), { roughness: 1 }), 32);
      s.cylinder(0.042, 0.042, 0.028, [0.45, 0.013, 0.2], s.material('#8a8a86'), 14);
    } else machine.rotation.y = a.state === 'running' ? (random() - 0.5) * 0.5 : 0;

    // What it leaves on the floor.
    if (a.trail !== 'none') {
      const foam = a.trail === 'foam', dull = a.trail === 'swirls';
      const mat = () => new THREE.MeshStandardMaterial({ color: foam ? '#f2f0e6' : dull ? '#8a8880' : '#f6fbff', roughness: foam ? 0.5 : dull ? 0.95 : 0.03, metalness: foam || dull ? 0 : 0.55, transparent: true, opacity: foam ? 0.5 : dull ? 0.16 : 0.34 });
      const disc = new THREE.CircleGeometry(0.235, 28).rotateX(-Math.PI / 2);
      let n = 0;
      for (const [radius, count] of [[0.95, 9], [1.3, 8]] as const) for (let i = 0; i < count; i++) {
        if (radius > 1 && i > count * mix(0.4, 1, mood.density)) continue;
        const t = (i / (count - 1) - 0.5) * 1.5 + (radius > 1 ? 0.12 : 0);
        const mesh = s.mesh(disc, mat(), [Math.sin(t) * radius * 0.8, 0.003 + n++ * 0.0004, -0.95 + Math.cos(t) * radius]);
        mesh.castShadow = false;
      }
      if (foam) s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#fbfbf6', { roughness: 0.3 }), Array.from({ length: 34 }, () => { const t = (random() - 0.5) * 1.5, r = 0.75 + random() * 0.8; return { at: [Math.sin(t) * r * 0.8, 0.012, -0.95 + Math.cos(t) * r] as const, size: 0.008 + random() * 0.02 }; })).castShadow = false;
    }

    const speed = a.state === 'running' ? mix(4, 22, mood.energy) : 0;
    pad.rotation.y = random() * 6;
    return s.finish({ update: (dt, time) => { pad.rotation.y += dt * speed; if (speed) machine.rotation.z = Math.sin(time * 9) * 0.004 * (1 + mood.energy); } });
  },
});
