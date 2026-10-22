import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { blob, noise3, pick, taperTube } from './fx';

const D = Math.PI / 180;

export default defineThing({
  questions: {
    iris: choice('What kind of eye is it?', {
      'human-blue': 'A giant human eye, pale blue with a round pupil.',
      'goat-slot': 'A goat eye: amber with a flat horizontal slot of a pupil.',
      'reptile-gold': 'A reptile eye: metallic gold with a thin vertical slit.',
      bloodshot: 'A sick bloodshot eye, pink with red veins and a pinprick pupil.',
      milky: 'A blind milky cataract eye, clouded blue-white.',
      'demon-red': 'A glowing red demon eye with a black star-burst pupil.',
    }),
    lids: choice('What are the eyelids doing?', {
      wide: 'Wide open, startled, white showing all round.',
      sleepy: 'Half lowered and drowsy.',
      winking: 'Shut tight in a wink.',
      squint: 'Narrowed to a suspicious squint from above and below.',
    }),
    skin: choice('What is the skin around the eye?', {
      'ogre-green': 'Warty ogre-green foam latex.',
      fibreglass: 'Bare unpainted fibreglass shell with pencil marks and rivets.',
      'hairy-brow': 'Brown hide with a shaggy fur eyebrow.',
      'pink-flesh': 'Fresh pink flesh-toned rubber.',
      'stone-scale': 'Blue-grey scales like a stone lizard.',
    }),
    gaze: choice('Where is it looking?', {
      'at-you': 'Straight out at whoever is looking at it.',
      up: 'Rolled upward.',
      left: 'Hard over to its left.',
      right: 'Hard over to its right.',
      down: 'Down at its own controller.',
    }),
    exposed: score('How much of the mechanism shows?', ['All hidden behind finished skin', 'Lower skin cut away to show servos', 'Mostly bare frame with just the brow and lids']),
    control: choice('What is controlling it?', {
      'twin-stick': 'A grey twin-stick radio transmitter with a tall aerial.',
      joystick: 'A chunky single arcade joystick box with a red button.',
      hotwired: 'No controller: bare wires twisted onto a lantern battery.',
      taped: 'A transmitter with a strip of tape across it saying hands off.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 0.075, EY = 0.33;
    const exposed = a.exposed;
    const skinColour = { 'ogre-green': '#7d9a4a', fibreglass: '#d9cfa2', 'hairy-brow': '#8a5a3c', 'pink-flesh': '#dc938a', 'stone-scale': '#6f8794' }[a.skin];
    const skinBase = new THREE.Color(skinColour);
    const skin = s.material('#ffffff', { vertexColors: true, roughness: a.skin === 'fibreglass' ? 0.5 : 0.75, side: THREE.DoubleSide });
    const skinFlat = s.material(skinColour, { roughness: 0.75, side: THREE.DoubleSide });
    const steel = s.material('#aab0b4', { metalness: 0.85, roughness: 0.3 });
    const alu = s.material('#c9ced1', { metalness: 0.7, roughness: 0.45 });
    const black = s.material('#1f2226', { roughness: 0.55 });
    const servoBlue = s.material('#2a4f9c', { roughness: 0.45 });
    const white = s.material('#f1efe9', { roughness: 0.5 });
    const wood = s.material('#c79d66', { roughness: 0.75 });

    // Base board and frame.
    s.box([0.5, 0.02, 0.32], [0, 0.01, 0], wood);
    for (const side of [-1, 1]) {
      s.rod([side * 0.13, 0.02, -0.075], [side * 0.13, EY + 0.1, -0.075], 0.007, steel);
      s.cylinder(0.02, 0.022, 0.008, [side * 0.13, 0.024, -0.075], steel, 12);
    }
    s.box([0.3, 0.2, 0.005], [0, EY - 0.01, -0.07], alu);
    for (const x of [-0.13, 0.13]) for (const y of [-0.09, 0.07]) s.cylinder(0.006, 0.006, 0.008, [x, EY + y, -0.066], steel, 6).rotation.x = Math.PI / 2;
    s.rod([0, EY, -0.07], [0, EY, 0], 0.008, steel);
    const gimbal = s.ring(R + 0.012, 0.005, [0, EY, -0.012], alu);
    gimbal.castShadow = true;

    // The eyeball, painted in polar coordinates round its pole.
    const kind = a.iris;
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const image = ctx.createImageData(512, 256);
    const irisR = kind === 'reptile-gold' ? 0.82 : kind === 'goat-slot' ? 0.78 : 0.66;
    const C = (hex: string) => new THREE.Color(hex);
    const irisA = C({ 'human-blue': '#3f8fd0', 'goat-slot': '#d9a23a', 'reptile-gold': '#e3b520', bloodshot: '#a9b5a0', milky: '#bfd3dd', 'demon-red': '#e0261a' }[kind]);
    const irisB = C({ 'human-blue': '#bfe3f2', 'goat-slot': '#7a4a16', 'reptile-gold': '#7b6a10', bloodshot: '#5c6a58', milky: '#e6eef0', 'demon-red': '#ffb020' }[kind]);
    const sclera = C({ 'human-blue': '#f4f1ea', 'goat-slot': '#efe6cf', 'reptile-gold': '#d8c98a', bloodshot: '#f2c9c2', milky: '#e9eeee', 'demon-red': '#3a0d10' }[kind]);
    const vein = C(kind === 'demon-red' ? '#ff5a20' : '#c0282c');
    const veins = kind === 'bloodshot' ? 1 : kind === 'demon-red' ? 0.5 : mix(0.08, 0.5, mood.wear);
    const tmp = new THREE.Color();
    for (let py = 0; py < 256; py++)
      for (let px = 0; px < 512; px++) {
        const phi = (py / 256) * Math.PI, theta = (px / 512) * Math.PI * 2;
        const x = phi * Math.cos(theta), y = phi * Math.sin(theta);
        let pupil: boolean;
        if (kind === 'goat-slot') pupil = Math.abs(x) < 0.46 && Math.abs(y) < 0.15 && (Math.abs(x) - 0.31) ** 2 * (Math.abs(x) > 0.31 ? 1 : 0) + y * y < 0.0225;
        else if (kind === 'reptile-gold') pupil = (x / 0.085) ** 2 + (y / 0.66) ** 2 < 1;
        else if (kind === 'bloodshot') pupil = phi < 0.14;
        else if (kind === 'milky') pupil = false;
        else if (kind === 'demon-red') pupil = phi < 0.2 + 0.16 * Math.abs(Math.cos(theta * 4)) ** 6;
        else pupil = phi < 0.27;
        if (pupil) tmp.set('#08080a');
        else if (phi < irisR) {
          const streak = 0.5 + 0.5 * noise3(Math.cos(theta) * 14, Math.sin(theta) * 14, phi * 3);
          tmp.copy(irisA).lerp(irisB, streak * 0.7 * (1 - phi / irisR * 0.5));
          if (phi > irisR * 0.86) tmp.multiplyScalar(0.5);
          if (kind === 'milky') tmp.lerp(C('#f2f6f6'), 0.5 + 0.3 * noise3(x * 6, y * 6, 1));
        } else {
          tmp.copy(sclera);
          const v = noise3(Math.cos(theta) * 9 + noise3(x * 5, y * 5, 2) * 2, Math.sin(theta) * 9, 4);
          const line = Math.abs(v) < 0.07 * veins + 0.004 ? 1 : 0;
          tmp.lerp(vein, line * Math.min(1, veins * 1.6 + 0.2) * Math.min(1, (phi - irisR) * 2.2));
          tmp.lerp(vein, 0.22 * veins * Math.min(1, phi - irisR));
        }
        image.data.set([tmp.r * 255, tmp.g * 255, tmp.b * 255, 255], (py * 512 + px) * 4);
      }
    ctx.putImageData(image, 0, 0);
    const eyeTexture = new THREE.CanvasTexture(canvas);
    eyeTexture.colorSpace = THREE.NoColorSpace;
    eyeTexture.colorSpace = THREE.SRGBColorSpace;
    const eyeGeometry = new THREE.SphereGeometry(R, 40, 28);
    eyeGeometry.rotateX(Math.PI / 2);
    const eye = new THREE.Group();
    eye.position.set(0, EY, 0);
    const ball = new THREE.Mesh(eyeGeometry, new THREE.MeshStandardMaterial({ map: eyeTexture, roughness: 0.12, emissive: kind === 'demon-red' ? '#ff2a10' : '#000000', emissiveMap: kind === 'demon-red' ? eyeTexture : null, emissiveIntensity: 0.7 }));
    ball.castShadow = ball.receiveShadow = true;
    eye.add(ball);
    // Ball links on the back of the eye for the pushrods.
    const links: THREE.Mesh[] = [];
    for (const [x, y] of [[-0.05, -0.04], [0.05, -0.04], [0, 0.06]]) {
      const link = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), steel);
      link.position.set(x, y, -Math.sqrt(R * R - x * x - y * y) * 0.98);
      eye.add(link); links.push(link);
    }
    s.root.add(eye);
    const gaze = { 'at-you': [0, 0], up: [-0.42, 0.05], left: [0.03, -0.55], right: [0.03, 0.55], down: [0.45, 0.15] }[a.gaze];
    eye.rotation.set(gaze[0], gaze[1], 0);

    // Lids: hemispherical shells hinged on the eye's horizontal axis.
    const lidGeometry = new THREE.SphereGeometry(R * 1.055, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const rimGeometry = new THREE.TorusGeometry(R * 1.06, 0.0055, 6, 40);
    rimGeometry.rotateX(Math.PI / 2);
    const lidMaterial = a.skin === 'fibreglass' ? s.material('#cfc7a4', { roughness: 0.5, side: THREE.DoubleSide }) : skinFlat;
    const lid = () => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(lidGeometry, lidMaterial), new THREE.Mesh(rimGeometry, lidMaterial));
      g.traverse((o) => { o.castShadow = o.receiveShadow = true; });
      g.position.set(0, EY, 0);
      s.root.add(g);
      return g;
    };
    const upper = lid(), lower = lid();
    const [openA, openB] = { wide: [66, 68], sleepy: [14, 58], winking: [-52, 40], squint: [26, 24] }[a.lids];
    const setLids = (close: number) => {
      upper.rotation.x = -mix(openA, -52, close) * D;
      lower.rotation.x = Math.PI + mix(openB, 40, close) * D;
    };
    setLids(0);

    // Skin slab: a shallow dome with a socket, a brow, and a ragged trimmed edge.
    const cut = mix(1, 0.2, exposed), narrow = mix(1, 0.8, exposed);
    const edgeSeed = random() * 50;
    const skinMesh = s.mesh(blob(64, (d) => {
      const ragged = 1 + 0.07 * noise3(d.x * 3 + edgeSeed, d.y * 3, 0.5) + 0.02 * noise3(d.x * 11, d.y * 11, edgeSeed);
      const p = new THREE.Vector3(d.x * 0.215 * narrow * ragged, d.y * (d.y < 0 ? 0.165 * cut : 0.175) * ragged, 0);
      const rho = Math.hypot(p.x, p.y) / 0.1;
      const dome = d.z > 0 ? d.z * 0.07 : d.z * 0.012;
      const socket = d.z > 0 ? 0.062 * Math.exp(-rho * rho * 1.15) : 0;
      const brow = d.z > 0 ? 0.045 * Math.exp(-(((p.y - 0.095) / 0.035) ** 2)) * Math.exp(-((p.x / 0.17) ** 2)) : 0;
      const bag = d.z > 0 ? 0.012 * Math.exp(-(((p.y + 0.09) / 0.02) ** 2)) * Math.exp(-((p.x / 0.09) ** 2)) : 0;
      const bumps = a.skin === 'ogre-green' ? 0.006 * Math.max(0, noise3(p.x * 55, p.y * 55, 3)) : a.skin === 'stone-scale' ? 0.004 * Math.abs(Math.sin(p.x * 150 + Math.floor(p.y * 60) * 1.5) * Math.sin(p.y * 190)) : 0;
      p.z = dome - socket + brow + bag + (d.z > 0 ? bumps : 0) - 0.02;
      return p;
    }, (p) => {
      const c = skinBase.clone();
      const n = noise3(p.x * 30, p.y * 30, 7);
      c.offsetHSL(n * 0.015, 0, n * 0.05);
      const rho = Math.hypot(p.x, p.y) / 0.1;
      if (a.skin !== 'fibreglass') c.multiplyScalar(mix(0.68, 1, Math.min(1, Math.max(0, rho - 0.55))));
      if (a.skin === 'ogre-green') c.lerp(new THREE.Color('#b4a24a'), Math.max(0, noise3(p.x * 55, p.y * 55, 3)) * 0.7);
      if (a.skin === 'stone-scale') c.offsetHSL(0, 0, 0.1 * Math.sin(p.x * 150 + Math.floor(p.y * 60) * 1.5) * Math.sin(p.y * 190));
      if (a.skin === 'pink-flesh') c.lerp(new THREE.Color('#b85a66'), Math.max(0, 1.1 - rho) * 0.5);
      if (a.skin === 'fibreglass') c.lerp(new THREE.Color('#a89f6a'), Math.abs(noise3(p.x * 18, p.y * 4, 9)) * 0.5);
      return c;
    }), skin, [0, EY, 0]);
    void skinMesh;
    if (a.skin === 'hairy-brow') {
      const hair = new THREE.ConeGeometry(0.5, 1, 4); hair.translate(0, 0.5, 0);
      const tufts = new THREE.InstancedMesh(hair, s.material('#3a2618', { roughness: 0.9 }), 150);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 150; i++) {
        const x = (random() - 0.5) * 0.3, arch = 0.105 - x * x * 1.1 + (random() - 0.5) * 0.03;
        e.set(0.9 + random() * 0.6, 0, -x * 6 + (random() - 0.5) * 0.7);
        m.compose(new THREE.Vector3(x, EY + arch, 0.058 - Math.abs(x) * 0.12), q.setFromEuler(e), new THREE.Vector3(0.008, 0.03 + random() * 0.035, 0.008));
        tufts.setMatrixAt(i, m);
      }
      tufts.castShadow = true;
      s.root.add(tufts);
    }
    if (a.skin === 'fibreglass') {
      for (let i = 0; i < 10; i++) { const t = (i / 10) * Math.PI * 2; s.cylinder(0.004, 0.004, 0.004, [Math.cos(t) * 0.16 * narrow, EY + Math.sin(t) * (Math.sin(t) < 0 ? 0.12 * cut : 0.13), 0.022], steel, 6).rotation.x = Math.PI / 2; }
    }

    // Servos, horns and pushrods behind and below.
    const horns: THREE.Object3D[] = [];
    const servo = (x: number, y: number, z: number, turn: number, target: THREE.Vector3) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.038, 0.02), random() < 0.5 ? servoBlue : black));
      const ears = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.003, 0.02), black); ears.position.y = 0.008; g.add(ears);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.008, 10), white); hub.rotation.x = Math.PI / 2; hub.position.set(0.01, 0.006, 0.013); g.add(hub);
      const horn = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.034, 0.002), white); horn.geometry.translate(0, 0.012, 0); horn.position.set(0.01, 0.006, 0.018); horn.rotation.z = turn; g.add(horn);
      horns.push(horn);
      g.position.set(x, y, z);
      g.traverse((o) => { o.castShadow = o.receiveShadow = true; });
      s.root.add(g);
      s.rod([x + 0.01 - Math.sin(turn) * 0.026, y + 0.006 + Math.cos(turn) * 0.026, z + 0.02], target.toArray() as [number, number, number], 0.0018, steel);
      return g;
    };
    const servoSpots: [number, number, number][] = [[-0.095, EY - 0.135, -0.03], [0.085, EY - 0.135, -0.03], [0.155, EY + 0.04, -0.05]];
    servo(...servoSpots[0], 0.5, new THREE.Vector3(-0.05, EY - 0.05, -0.04));
    servo(...servoSpots[1], -0.5, new THREE.Vector3(0.05, EY - 0.05, -0.04));
    servo(...servoSpots[2], 1.2, new THREE.Vector3(0.08, EY + 0.03, -0.01));
    if (exposed > 0.5) servo(-0.165, EY + 0.03, -0.05, -1.1, new THREE.Vector3(-0.08, EY + 0.03, -0.01));
    // Receiver on the base and the servo leads running to it.
    const rx: [number, number, number] = [-0.16, 0.035, -0.1];
    s.box([0.06, 0.03, 0.04], rx, black);
    s.rod([rx[0] - 0.02, 0.05, rx[2]], [rx[0] - 0.05, 0.2 + random() * 0.05, rx[2] - 0.03], 0.0012, steel);
    const leadColours = ['#d93a2a', '#f2c230', '#2e2e33', '#f08a1e', '#3f8f4a', '#7a4dbb'];
    servoSpots.forEach(([x, y, z], i) => {
      const sag = 0.05 + random() * 0.07;
      s.mesh(taperTube([[x, y - 0.02, z], [x * 0.7 - 0.03, y - 0.06 - sag, z - 0.03 + random() * 0.05], [rx[0] + 0.05 + i * 0.01, 0.08 + sag * 0.5, rx[2] + 0.03], [rx[0] + 0.02, 0.045, rx[2] + 0.01]], () => 0.0032, 26, 5), s.material(leadColours[i * 2 % 6], { roughness: 0.5 }));
      s.mesh(taperTube([[x + 0.006, y - 0.02, z], [x * 0.7 - 0.02, y - 0.07 - sag, z - 0.02 + random() * 0.05], [rx[0] + 0.06 + i * 0.01, 0.07 + sag * 0.5, rx[2] + 0.035], [rx[0] + 0.025, 0.045, rx[2] + 0.014]], () => 0.0032, 26, 5), s.material(leadColours[(i * 2 + 1) % 6], { roughness: 0.5 }));
    });

    // The controller on the front of the base.
    const cx = 0.13, cz = 0.1;
    const led = new THREE.MeshStandardMaterial({ color: '#ff2a1a', emissive: '#ff2a1a', emissiveIntensity: 1.4 });
    if (a.control === 'hotwired') {
      s.box([0.07, 0.085, 0.07], [cx, 0.063, cz], s.material('#1c6b3a', { roughness: 0.5 }));
      s.label('6V', 0.05, 0.035, [cx, 0.06, cz + 0.0355], '#f4e04a', '#1c6b3a');
      for (const side of [-1, 1]) {
        s.cylinder(0.004, 0.004, 0.016, [cx + side * 0.02, 0.113, cz], steel, 8);
        s.mesh(taperTube([[cx + side * 0.02, 0.118, cz], [cx + side * 0.05 - 0.1, 0.16 + random() * 0.04, cz - 0.04], [-0.02, 0.1, -0.02], [-0.06 + side * 0.02, EY - 0.14, -0.05]], () => 0.0028, 28, 5), s.material(side < 0 ? '#d93a2a' : '#2e2e33'));
      }
    } else {
      const body = s.box([0.13, 0.04, 0.1], [cx, 0.04, cz], s.material(a.control === 'joystick' ? '#2b2b30' : '#8f969b', { roughness: 0.5, metalness: 0.2 }));
      body.rotation.y = -0.25 + (random() - 0.5) * 0.3;
      const top = new THREE.Group(); top.position.set(cx, 0.06, cz); top.rotation.y = body.rotation.y; s.root.add(top);
      const add = (mesh: THREE.Mesh, x: number, y: number, z: number) => { mesh.position.set(x, y, z); mesh.castShadow = true; top.add(mesh); return mesh; };
      if (a.control === 'joystick') {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 8), steel), -0.025, 0.025, 0).rotation.z = 0.25;
        add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), s.material('#e3202c', { roughness: 0.3 })), -0.032, 0.052, 0);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.008, 14), led), 0.035, 0.004, 0.012);
      } else {
        for (const x of [-0.035, 0.035]) {
          add(new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8, 0, 6.3, 0, 1.6), black), x, 0, 0.01);
          const stick = add(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.03, 8), steel), x, 0.022, 0.01);
          stick.rotation.set((random() - 0.5) * 0.6, 0, (random() - 0.5) * 0.6);
        }
        add(new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), led), 0, 0.003, -0.03);
        const aerial = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0025, 0.3, 6), steel), 0.045, 0.15, -0.04);
        aerial.rotation.z = -0.12;
        add(new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), steel), 0.045 + 0.018, 0.3, -0.04);
        if (a.control === 'taped') {
          const tape = s.label('HANDS OFF', 0.12, 0.028, [cx, 0.0615, cz + 0.022], '#b3141f', '#efe2b0');
          tape.rotation.set(-Math.PI / 2, 0, body.rotation.y + 0.12);
        }
      }
    }
    // Bench clutter.
    if (mood.density > 0.4) {
      const n = Math.round(mix(0, 9, mood.density));
      for (let i = 0; i < n; i++) s.cylinder(0.004, 0.004, 0.003, [-0.2 + random() * 0.24, 0.0215, 0.05 + random() * 0.09], steel, 6);
      s.rod([-0.2, 0.026, 0.12], [-0.08, 0.026, 0.135], 0.004, s.material(pick(['#e3202c', '#f2c230', '#2a4f9c'], random)));
    }

    const energy = mood.energy;
    const period = mix(7, 1.6, energy);
    return s.finish({
      update: (_dt, time) => {
        const wander = mix(0.03, 0.3, energy);
        eye.rotation.x = gaze[0] + Math.sin(time * mix(0.3, 2.1, energy)) * wander * 0.6;
        eye.rotation.y = gaze[1] + Math.sin(time * mix(0.21, 1.7, energy) + 1.3) * wander;
        const phase = (time % period) / period;
        const blink = a.lids === 'winking' ? 0 : phase > 0.93 ? Math.sin(((phase - 0.93) / 0.07) * Math.PI) : 0;
        setLids(blink);
        horns.forEach((horn, i) => { horn.rotation.z = (i % 2 ? -0.5 : 0.5) + (i % 2 ? eye.rotation.x : eye.rotation.y) * 1.5; });
      },
    });
  },
});
