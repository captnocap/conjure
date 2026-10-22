import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix } from '@conjure/kit';

const TURNERS = {
  angel: 'A tall robed angel in white with long golden hair and great wings.',
  seraph: 'A seraph in red with three pairs of small flame-coloured wings.',
  putto: 'A chubby child-angel in a short white tunic with little wings, barely tall enough to reach.',
  automaton: 'A jointed brass automaton figure, built to turn the handle for ever.',
  monk: 'A hooded monk in a brown habit, no wings at all: a man doing an angel\'s job.',
} as const;

const OUTFITS = {
  angel: { style: 'doll', hair: 'long', hairColor: '#d9b254', top: '#efe9dc', bottom: '#efe9dc', skin: '#f0d2b8' },
  seraph: { style: 'doll', hair: 'short', hairColor: '#e0652a', top: '#b8322a', bottom: '#b8322a', skin: '#e8b89a' },
  putto: { style: 'doll', hair: 'short', hairColor: '#e2c070', top: '#efe9dc', bottom: '#efe9dc', skin: '#f2cdb4' },
  automaton: { style: 'mannequin', hair: 'none', hairColor: '#b8893a', top: '#c9a04a', bottom: '#b08a3a', skin: '#c9a04a' },
  monk: { style: 'doll', hair: 'hood', hairColor: '#4a3a2a', top: '#4a3a2a', bottom: '#4a3a2a', skin: '#d9b08c' },
} as const;

export default defineThing({
  questions: {
    turner: choice('Who turns the sphere?', TURNERS),
    wings: choice('If the turner has wings, what are they like?', {
      gilt: 'Gold leaf, stiff and gleaming like an altarpiece.',
      white: 'White feathers with gilt tips.',
      flame: 'Red and orange, glowing at the edges like embers.',
      iron: 'Black iron plates riveted together.',
    }),
    sphere: choice('What is the crystal sphere like?', {
      clear: 'Clear colourless crystal with a faint blue cast.',
      amber: 'Warm amber glass, honey-coloured.',
      violet: 'Smoky violet crystal.',
      frosted: 'Frosted milky glass that hides what is inside.',
    }),
    cargo: choice('What does the sphere carry round with it?', {
      planet: 'A small painted red planet fixed to its surface.',
      sun: 'A gilt sun disc with rays, glowing.',
      moon: 'A silver crescent moon.',
      stars: 'A scatter of tiny gilt stars all over the surface.',
      nothing: 'Nothing: empty crystal, turning for its own sake.',
    }),
    mount: choice('What holds the sphere?', {
      pillar: 'A pale stone column with a brass cradle on its capital.',
      brass: 'A tall brass tripod and yoke, all metal and rivets.',
      rock: 'A rough grey boulder with the cradle set into its top.',
    }),
    ground: choice('What is on the ground around the machine?', {
      bare: 'Nothing: bare floor.',
      carpet: 'A round carpet painted with gilt stars on deep blue.',
      tools: 'A spare crank handle, an oil can and a rag left lying about.',
      dais: 'A round stepped dais of three stone steps.',
    }),
    state: choice('What is happening at the crank?', {
      turning: 'Turning steadily, the sphere creeping round.',
      straining: 'The sphere has jammed: the turner leans hard into the handle, braced and straining.',
      resting: 'A break: the turner stands back with hands on hips, looking up at the sphere.',
      asleep: 'The turner has fallen asleep slumped on a bench by the pillar, and the sky has stopped.',
      shattered: 'The sphere has shattered: a jagged bowl remains in the cradle and shards lie on the ground.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, child: T) => { group.add(child); return child; };
    const gold = s.material('#d4aa4e', { metalness: 0.78, roughness: mix(0.28, 0.55, mood.wear) });
    const brass = s.material('#b8893a', { metalness: 0.7, roughness: 0.45 });
    const dark = s.material('#2b2622', { roughness: 0.7 });
    const R = 0.55, centreY = 1.62, tilt = 0.41;

    // ---- The mount: a column, a tripod or a boulder, topped by the brass cradle.
    const capTop = 1.0;
    if (a.mount === 'pillar') {
      const stone = s.material('#d8d0c0', { roughness: 0.85 });
      s.box([0.64, 0.1, 0.64], [0, 0.05, 0], stone);
      s.cylinder(0.11, 0.13, 0.78, [0, 0.49, 0], stone, 20);
      s.box([0.36, 0.08, 0.36], [0, 0.92, 0], stone);
      s.box([0.3, 0.04, 0.3], [0, 0.98, 0], brass);
    } else if (a.mount === 'brass') {
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * Math.PI * 2 + 0.5;
        s.rod([Math.cos(ang) * 0.34, 0, Math.sin(ang) * 0.34], [Math.cos(ang) * 0.06, capTop, Math.sin(ang) * 0.06], 0.022, brass);
        s.cylinder(0.05, 0.06, 0.03, [Math.cos(ang) * 0.34, 0.015, Math.sin(ang) * 0.34], brass, 10);
      }
      s.ring(0.22, 0.012, [0, 0.45, 0], brass).rotation.x = Math.PI / 2;
      s.cylinder(0.12, 0.08, 0.06, [0, capTop - 0.03, 0], brass, 16);
    } else {
      const rock = s.material('#7f7d78', { roughness: 0.95 });
      const boulder = s.ball([0.42, 0.52, 0.4], [0, 0.48, 0], rock, 10);
      boulder.rotation.y = random() * 2;
      s.ball([0.3, 0.2, 0.34], [0.2, 0.12, 0.15], rock, 8);
      s.cylinder(0.14, 0.14, 0.04, [0, capTop - 0.02, 0], brass, 16);
    }
    // The cradle: two crossed brass arcs cupping the sphere from below.
    for (const turn of [0, Math.PI / 2]) {
      const arc = Math.PI * 0.5;
      const cradle = s.ring(R + 0.035, 0.022, [0, centreY, 0], brass, arc);
      cradle.rotation.set(0, turn, -Math.PI / 2 - arc / 2);
      cradle.rotation.order = 'YZX';
    }

    // ---- The sphere on its tilted axle, turning.
    const axle = new THREE.Group();
    axle.position.y = centreY;
    axle.rotation.z = tilt;
    s.root.add(axle);
    into(axle, s.cylinder(0.018, 0.018, R * 2 + 0.3, [0, 0, 0], gold, 10));
    for (const end of [-1, 1]) into(axle, s.ball([0.035, 0.035, 0.035], [0, end * (R + 0.15), 0], gold, 10));
    into(axle, s.cylinder(0.06, 0.08, 0.05, [0, R + 0.2, 0], gold, 10));
    const sphere = new THREE.Group();
    axle.add(sphere);
    const glassColour = { clear: '#cfe4f5', amber: '#e8a040', violet: '#8a6fd0', frosted: '#f1f3f6' }[a.sphere];
    const glass = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(glassColour).lerp(new THREE.Color('#ffd9a0'), mood.warmth * 0.15),
      transparent: true, opacity: { clear: 0.26, amber: 0.42, violet: 0.38, frosted: 0.6 }[a.sphere],
      roughness: a.sphere === 'frosted' ? 0.6 : 0.05, metalness: 0, depthWrite: false, clearcoat: 0.6,
    });
    if (a.state === 'shattered') {
      // The lower bowl stays in the cradle with a jagged lip; the rest is on the floor.
      into(sphere, s.mesh(new THREE.SphereGeometry(R, 40, 20, 0, Math.PI * 2, Math.PI * 0.58, Math.PI * 0.42), new THREE.MeshPhysicalMaterial({ ...glass, side: THREE.DoubleSide })));
      const lipR = R * Math.sin(Math.PI * 0.58), lipY = R * Math.cos(Math.PI * 0.58);
      const shards = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.22, 3), new THREE.MeshPhysicalMaterial({ ...glass, opacity: 0.55, depthWrite: true }), 18);
      const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), euler = new THREE.Euler();
      for (let i = 0; i < 18; i++) {
        const ang = (i / 18) * Math.PI * 2 + random() * 0.2, h = 0.5 + random() * 1.2;
        euler.set((random() - 0.5) * 0.5, ang, (random() - 0.5) * 0.4);
        matrix.compose(new THREE.Vector3(Math.cos(ang) * lipR, lipY + 0.1 * h, Math.sin(ang) * lipR), quaternion.setFromEuler(euler), new THREE.Vector3(1, h, 1));
        shards.setMatrixAt(i, matrix);
      }
      shards.castShadow = true;
      sphere.add(shards);
      const fallen = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.02, 3), new THREE.MeshPhysicalMaterial({ ...glass, opacity: 0.7, depthWrite: true }), 22);
      for (let i = 0; i < 22; i++) {
        const ang = random() * Math.PI * 2, d = 0.45 + random() * 0.6;
        euler.set(0, random() * 6, 0);
        matrix.compose(new THREE.Vector3(Math.cos(ang) * d, 0.01, Math.sin(ang) * d), quaternion.setFromEuler(euler), new THREE.Vector3(0.6 + random(), 1, 0.6 + random()));
        fallen.setMatrixAt(i, matrix);
      }
      fallen.castShadow = true;
      s.root.add(fallen);
    } else {
      into(sphere, s.mesh(new THREE.SphereGeometry(R, 48, 32), glass));
    }
    // Gilt meridian and equator, so the turning shows.
    into(sphere, s.ring(R + 0.012, 0.011, [0, 0, 0], gold));
    into(sphere, s.ring(R + 0.012, 0.011, [0, 0, 0], gold)).rotation.x = Math.PI / 2;
    const shine = (colour: string, strength: number) => s.material(colour, { metalness: 0.6, roughness: 0.35, emissive: colour, emissiveIntensity: strength });
    const onSurface = (lat: number, lon: number, lift: number) => [Math.cos(lat) * Math.cos(lon) * (R + lift), Math.sin(lat) * (R + lift), Math.cos(lat) * Math.sin(lon) * (R + lift)] as const;
    if (a.state !== 'shattered') {
      if (a.cargo === 'planet') {
        const planet = into(sphere, s.ball([0.075, 0.075, 0.075], onSurface(0.35, 0.4, 0.04), s.material('#b7432b', { roughness: 0.5 }), 16));
        void planet;
      } else if (a.cargo === 'sun') {
        const at = onSurface(0.3, 0.5, 0.03);
        const sun = into(sphere, s.cylinder(0.12, 0.12, 0.03, at, shine('#f2c14e', mix(0.3, 0.9, mood.cheer)), 24));
        sun.lookAt(0, 0, 0);
        sun.rotateX(Math.PI / 2);
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2;
          const ray = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.09, 5), gold);
          ray.position.set(Math.cos(ang) * 0.17, 0, Math.sin(ang) * 0.17);
          ray.rotation.z = -Math.PI / 2;
          ray.rotation.y = -ang;
          ray.castShadow = true;
          sun.add(ray);
        }
      } else if (a.cargo === 'moon') {
        const at = onSurface(0.3, 0.5, 0.03);
        const silver = s.material('#e3e6ea', { metalness: 0.7, roughness: 0.3 });
        const moon = into(sphere, s.cylinder(0.1, 0.1, 0.024, at, silver, 24));
        moon.lookAt(0, 0, 0);
        moon.rotateX(Math.PI / 2);
        const bite = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 24), s.material(glassColour, { roughness: 0.3 }));
        bite.position.set(0.05, 0, -0.01);
        moon.add(bite);
      } else if (a.cargo === 'stars') {
        const points: { at: readonly [number, number, number]; size: number }[] = [];
        for (let i = 0; i < 70; i++) points.push({ at: onSurface(Math.asin(random() * 2 - 1), random() * Math.PI * 2, 0.012), size: 0.016 + random() * 0.014 });
        sphere.add(s.scatter(new THREE.OctahedronGeometry(1), shine('#f2d27a', mix(0.2, 0.8, mood.cheer)), points));
      }
    }
    // The gear at the foot of the axle, which the crank drives.
    const gear = (parent: THREE.Object3D, radius: number, thick: number, at: readonly [number, number, number], teeth: number) => {
      into(parent, s.cylinder(radius, radius, thick, at, brass, 32));
      const size = (radius * 2 * Math.PI) / teeth * 0.5;
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(size, thick, size * 1.1), gold, teeth);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < teeth; i++) {
        const ang = (i / teeth) * Math.PI * 2;
        matrix.makeRotationY(ang).setPosition(at[0] + Math.sin(ang) * (radius + size * 0.45), at[1], at[2] + Math.cos(ang) * (radius + size * 0.45));
        mesh.setMatrixAt(i, matrix);
      }
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
    };
    gear(axle, 0.1, 0.03, [0, -(R + 0.1), 0], 20);

    // ---- The turner.
    const H = a.turner === 'putto' ? 1.05 : a.turner === 'seraph' ? 1.78 : 1.7;
    const outfit = OUTFITS[a.turner];
    const pose = a.state === 'resting' ? 'hands-on-hips' : a.state === 'asleep' ? 'slumped' : 'carrying';
    const person = figure(s, {
      height: H, build: a.turner === 'putto' ? 'heavy' : 'average', pose, sleeves: 'long',
      gaze: a.state === 'resting' ? 'up' : a.state === 'straining' ? 'down' : a.state === 'asleep' ? 'down' : 'ahead',
      ...outfit,
    });
    if (a.state === 'turning' || a.state === 'straining' || a.state === 'shattered') {
      const { joints } = person;
      const lean = a.state === 'straining' ? 0.2 : 0.08;
      joints.body.rotation.x = lean;
      if (a.state === 'straining') {
        // One leg braced back, the other bent forward.
        joints.hips.left.rotation.x = -0.55;
        joints.knees.left.rotation.x = 0.7;
        joints.hips.right.rotation.x = 0.5;
        joints.ankles.right.rotation.x = -0.5;
        joints.ankles.left.rotation.x = -0.15;
        joints.spine.rotation.x = 0.1;
      }
    }
    // A long robe falls from the hips for everyone but the automaton, kept clear of the floor.
    if (a.turner !== 'automaton') {
      const hem = Math.max(0.12 * H, Math.min({ angel: 0.5, seraph: 0.5, putto: 0.3, monk: 0.52 }[a.turner] * H, person.hipHeight - 0.06 * H));
      const flare = a.turner === 'putto' ? 0.15 : 0.13;
      const robe = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.085, H * flare, hem, 20, 1, true), s.material(outfit.top, { roughness: 0.75, side: THREE.DoubleSide }));
      robe.position.y = -hem / 2 + H * 0.03;
      robe.castShadow = robe.receiveShadow = true;
      person.joints.pelvis.add(robe);
      const girdle = new THREE.Mesh(new THREE.TorusGeometry(H * 0.085, H * 0.009, 6, 20), a.turner === 'monk' ? s.material('#d8cba8') : gold);
      girdle.rotation.x = Math.PI / 2;
      girdle.position.y = H * 0.03;
      person.joints.pelvis.add(girdle);
    }
    person.settle();
    s.root.add(person.root);
    // Stands at the crank side, facing the machine.
    const X = 0.5 + 0.28 * H;
    person.root.position.set(X, 0, 0);
    person.root.rotation.y = -Math.PI / 2;
    person.root.updateMatrixWorld(true);

    // Wings, hung from the torso.
    const wingShape = (span: number) => {
      const w = new THREE.Shape();
      const u = span;
      w.moveTo(0, 0);
      w.quadraticCurveTo(u * 0.2, u * 0.55, u * 0.7, u * 0.62);
      w.quadraticCurveTo(u * 0.95, u * 0.6, u * 1.0, u * 0.45);
      const feathers = 6;
      for (let i = 0; i < feathers; i++) {
        const t0 = i / feathers, t1 = (i + 1) / feathers;
        const x0 = u * (1.0 - t0 * 0.95), y0 = u * (0.45 - t0 * 0.78);
        const x1 = u * (1.0 - t1 * 0.95), y1 = u * (0.45 - t1 * 0.78);
        w.quadraticCurveTo((x0 + x1) / 2 - u * 0.02, (y0 + y1) / 2 - u * 0.1, x1, y1);
      }
      w.quadraticCurveTo(0, -u * 0.15, 0, 0);
      return w;
    };
    const wingPaint = {
      gilt: [gold, s.material('#b08a3a', { metalness: 0.7, roughness: 0.4 })],
      white: [s.material('#f2efe6', { roughness: 0.8 }), gold],
      flame: [s.material('#d8482a', { emissive: '#ff6a20', emissiveIntensity: mix(0.3, 0.9, mood.cheer), roughness: 0.6 }), s.material('#f0a030', { emissive: '#ff9a30', emissiveIntensity: 0.6 })],
      iron: [s.material('#2e2e32', { metalness: 0.6, roughness: 0.5 }), brass],
    }[a.wings];
    const addWings = (span: number, height: number) => {
      const torsoL = H * 0.28, limb = H * 0.036;
      for (const side of [-1, 1]) {
        const wing = new THREE.Group();
        wing.position.set(side * H * 0.03, torsoL * height, -limb * 1.9);
        wing.rotation.set(0, side * 0.6, side * 0.2);
        wing.scale.x = side;
        person.joints.spine.add(wing);
        const outer = into(wing, s.mesh(new THREE.ExtrudeGeometry(wingShape(span), { depth: 0.012, bevelEnabled: false }), wingPaint[0]));
        outer.material.side = THREE.DoubleSide;
        const inner = into(wing, s.mesh(new THREE.ExtrudeGeometry(wingShape(span * 0.62), { depth: 0.014, bevelEnabled: false }), wingPaint[1], [0, span * 0.02, -0.002]));
        inner.material.side = THREE.DoubleSide;
      }
    };
    if (a.turner === 'angel' || a.turner === 'automaton') addWings(H * 0.5, 0.85);
    if (a.turner === 'putto') addWings(H * 0.36, 0.8);
    if (a.turner === 'seraph') for (const [span, height] of [[0.3, 0.95], [0.26, 0.65], [0.22, 0.35]]) addWings(H * span, height);
    if (a.turner === 'seraph') (person.head as THREE.Object3D).add(s.ring(H * 0.075, 0.006, [0, H * 0.09, -H * 0.01], shine('#f2c14e', 0.6)));
    if (a.turner === 'angel') { const halo = s.ring(H * 0.07, 0.006, [0, H * 0.095, -H * 0.02], shine('#f2c14e', 0.5)); halo.rotation.x = Math.PI / 2 - 0.3; person.head.add(halo); }

    // ---- The crank, placed where the hands are, and the shaft back to the gear.
    person.root.updateMatrixWorld(true);
    const left = person.hands.left.getWorldPosition(new THREE.Vector3());
    const right = person.hands.right.getWorldPosition(new THREE.Vector3());
    const grip = left.clone().add(right).multiplyScalar(0.5);
    const holding = pose === 'carrying';
    const hub = new THREE.Vector3(0.62, holding ? grip.y - 0.08 : 0.98, holding ? grip.z : 0);
    if (holding) hub.x = Math.min(0.62, grip.x - 0.14);
    const crankR = holding ? Math.hypot(grip.x - hub.x, grip.y - hub.y) : 0.16;
    const crankAngle = holding ? Math.atan2(grip.y - hub.y, grip.x - hub.x) : -Math.PI / 2;
    // The support post and the shaft, with the drive gear meeting the axle gear.
    s.cylinder(0.025, 0.035, hub.y, [hub.x, hub.y / 2, hub.z - 0.22], brass, 12);
    s.cylinder(0.05, 0.05, 0.05, [hub.x, hub.y, hub.z - 0.22], brass, 12).rotation.x = Math.PI / 2;
    s.rod([hub.x, hub.y, hub.z - 0.34], [hub.x, hub.y, hub.z + 0.01], 0.016, gold);
    const drive = new THREE.Group();
    drive.position.set(hub.x, hub.y, hub.z - 0.3);
    drive.rotation.x = Math.PI / 2;
    s.root.add(drive);
    gear(drive, 0.2, 0.03, [0, 0, 0], 28);
    const crank = new THREE.Group();
    crank.position.copy(hub);
    crank.rotation.z = crankAngle;
    s.root.add(crank);
    into(crank, s.cylinder(0.05, 0.05, 0.03, [0, 0, 0], brass, 16)).rotation.x = Math.PI / 2;
    into(crank, s.box([crankR + 0.03, 0.035, 0.025], [crankR / 2, 0, 0.02], brass));
    const barLength = holding ? Math.abs(left.z - right.z) + 0.16 : 0.22;
    into(crank, s.cylinder(0.018, 0.018, barLength, [crankR, 0, 0.03 + barLength / 2], s.material('#5a3c26', { roughness: 0.6 }), 10)).rotation.x = Math.PI / 2;
    into(crank, s.ball([0.026, 0.026, 0.026], [crankR, 0, 0.03 + barLength], brass, 8));

    // ---- A bench for the sleeper, and the ground dressing.
    if (a.state === 'asleep') {
      const hips = person.pelvis.getWorldPosition(new THREE.Vector3());
      const seat = Math.max(0.15, person.hipHeight - 0.04 * H);
      s.box([0.5 * H, seat, 0.36 * H], [hips.x, seat / 2, hips.z - 0.03 * H], s.material('#bfb6a4', { roughness: 0.9 }));
    }
    if (a.ground === 'carpet') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#1f3f8f'; ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#d9b254'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(256, 256, 236, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#d9b254';
      for (let i = 0; i < 60; i++) {
        const ang = random() * Math.PI * 2, r = 40 + random() * 180, size = 6 + random() * 8;
        const x = 256 + Math.cos(ang) * r, y = 256 + Math.sin(ang) * r;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) { const rr = k % 2 ? size * 0.35 : size; const t = (k / 8) * Math.PI * 2; ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); }
        ctx.closePath(); ctx.fill();
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const rug = s.mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshStandardMaterial({ map, roughness: 0.9 }), [0.3, 0.004, 0]);
      rug.rotation.x = -Math.PI / 2;
    } else if (a.ground === 'tools') {
      const spare = s.rod([-0.5, 0.02, 0.5], [-0.3, 0.02, 0.62], 0.016, brass);
      void spare;
      s.rod([-0.3, 0.02, 0.62], [-0.22, 0.02, 0.5], 0.014, s.material('#5a3c26'));
      s.cylinder(0.035, 0.04, 0.09, [0.2, 0.045, 0.6], s.material('#8a8f94', { metalness: 0.6, roughness: 0.4 }), 12);
      s.rod([0.2, 0.09, 0.6], [0.3, 0.14, 0.64], 0.006, s.material('#8a8f94', { metalness: 0.6, roughness: 0.4 }));
      s.box([0.16, 0.012, 0.12], [-0.1, 0.006, 0.7], s.material('#b89a7a', { roughness: 0.95 })).rotation.y = 0.5;
    } else if (a.ground === 'dais') {
      const stone = s.material('#cfc6b4', { roughness: 0.9 });
      for (let i = 0; i < 3; i++) s.cylinder(1.5 - i * 0.3, 1.5 - i * 0.3, 0.06, [0.3, -0.03 - i * 0.06 + 0.18, 0], stone, 40);
      // Lift everything else onto the dais.
      for (const child of s.root.children) { const g = (child as THREE.Mesh).geometry; if (!(g instanceof THREE.CylinderGeometry && g.parameters.radiusTop >= 0.9)) child.position.y += 0.18; }
    }

    // ---- Motion: the heave on the crank, the body rocking with it, the sphere creeping round.
    const moving = a.state === 'turning' || a.state === 'shattered';
    const pace = mix(0.3, 3.2, mood.energy);
    const heave = (a.state === 'straining' ? 0.05 : 0.28) * mix(0.3, 1, mood.energy);
    const spin = moving ? mix(0.04, 0.5, mood.energy) : 0;
    const lean0 = person.joints.body.rotation.x;
    return s.finish({
      update: (dt, time) => {
        person.update(dt, time);
        if (holding) {
          const push = Math.sin(time * pace);
          crank.rotation.z = crankAngle + push * heave;
          drive.rotation.z = -push * heave * 0.5;
          person.joints.body.rotation.x = lean0 + push * (a.state === 'straining' ? 0.03 : 0.06) * mood.energy;
        }
        sphere.rotation.y += dt * spin;
      },
    });
  },
});
