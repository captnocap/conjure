import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';

type V3 = [number, number, number];
type Car = 'hatchback' | 'pickup' | 'convertible' | 'taxi';

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Side profile of each body as [z, y] points, front at +z, read from the front bumper over the roof to the rear. */
const PROFILES: Record<Car, { length: number; top: [number, number][]; wheelbase: number; seatZ: number; roof: number }> = {
  hatchback: { length: 3.7, wheelbase: 2.45, seatZ: 0.05, roof: 1.48, top: [[1.85, 0.72], [1.5, 0.88], [0.8, 0.98], [0.2, 1.46], [-1.2, 1.5], [-1.65, 1.15], [-1.85, 0.6]] },
  pickup: { length: 5.0, wheelbase: 3.1, seatZ: 0.75, roof: 1.75, top: [[2.5, 0.85], [2.1, 1.02], [1.3, 1.1], [0.95, 1.7], [-0.25, 1.75], [-0.3, 0.95], [-2.5, 0.95], [-2.5, 0.5]] },
  convertible: { length: 4.3, wheelbase: 2.6, seatZ: -0.1, roof: 0.9, top: [[2.15, 0.7], [1.8, 0.84], [0.6, 0.92], [-0.8, 0.92], [-2.0, 0.86], [-2.15, 0.55]] },
  taxi: { length: 4.6, wheelbase: 2.7, seatZ: 0.1, roof: 1.45, top: [[2.3, 0.72], [1.9, 0.86], [1.1, 0.95], [0.5, 1.42], [-0.9, 1.45], [-1.5, 0.98], [-2.3, 0.9], [-2.3, 0.55]] },
};

export default defineThing({
  questions: {
    dog: choice('What kind of dog is driving?', {
      shaggy: 'A shaggy sandy mutt with floppy ears and fur in its eyes.',
      pug: 'A pug: round fawn head, black flat face, bulging eyes.',
      pointy: 'A pointy-eared shepherd type with a long muzzle.',
      giant: 'A giant mastiff whose head fills the whole window.',
      spotted: 'A white dalmatian covered in black spots.',
    }),
    car: choice('What is it driving?', {
      hatchback: 'A small three-door hatchback.',
      pickup: 'A pickup truck with an open bed.',
      convertible: 'A convertible with the top down, the dog in full view.',
      taxi: 'A yellow taxi with a checker band and a roof light.',
    }),
    head: choice('What is the dog doing?', {
      window: 'Head out of the open driver window, ears back, tongue out in the wind.',
      ahead: 'Both paws on the wheel, eyes on the road through the windscreen.',
      barking: 'Nose up, barking at the sky.',
    }),
    accessory: choice('Is it wearing anything?', {
      none: 'Nothing but its collar.',
      sunglasses: 'Black sunglasses.',
      bandana: 'A red bandana knotted at the neck.',
      both: 'Sunglasses and a bandana.',
      'party-hat': 'A paper party hat on an elastic.',
    }),
    passenger: noul('Is a human sitting in the passenger seat?'),
    running: noul('Is the engine running, headlights on and exhaust puffing?'),
    colour: choice('What colour is the car, if it is not a taxi?', {
      red: 'Cherry red.',
      beige: 'Dusty beige.',
      teal: 'Faded teal.',
      white: 'Plain white.',
      black: 'Gloss black.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const profile = PROFILES[a.car];
    const L = profile.length, W = 1.68;
    const paintColour = a.car === 'taxi' ? '#f2c21b' : { red: '#c0282c', beige: '#d6c39a', teal: '#3f8f8a', white: '#f1f1ec', black: '#1c1d20' }[a.colour];
    const body = s.material(paintColour, { metalness: 0.25, roughness: mix(0.3, 0.7, mood.wear) });
    const dark = s.material('#1e2022', { roughness: 0.7 });
    const chrome = s.material('#d9dee2', { metalness: 0.9, roughness: 0.2 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#9fc0d0', transparent: true, opacity: 0.26, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });

    // ---- the body: a side profile with wheel arches, extruded across the width
    const shape = new THREE.Shape();
    const GROUND = 0.34;
    const arch = 0.44;
    const wheels = [profile.wheelbase / 2, -profile.wheelbase / 2];
    shape.moveTo(L / 2, GROUND);
    for (const [z, y] of profile.top) shape.lineTo(z, y);
    shape.lineTo(-L / 2, GROUND);
    // Back along the underside, arching over each wheel.
    shape.lineTo(wheels[1] - arch, GROUND);
    shape.absarc(wheels[1], GROUND, arch, Math.PI, 0, true);
    shape.lineTo(wheels[0] - arch, GROUND);
    shape.absarc(wheels[0], GROUND, arch, Math.PI, 0, true);
    shape.lineTo(L / 2, GROUND);
    const bodyWidth = a.car === 'pickup' ? W : W - 0.08;
    const bodyGeometry = new THREE.ExtrudeGeometry(shape, { depth: bodyWidth, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
    bodyGeometry.rotateY(-Math.PI / 2).translate(bodyWidth / 2, 0, 0);
    const shell = s.mesh(bodyGeometry, body);
    void shell;
    if (a.car === 'pickup') {
      // The bed: hollow it out with a dark floor and walls standing above the profile's deck.
      s.box([W - 0.16, 0.02, 2.1], [0, 0.96, -1.4], dark);
      for (const x of [-1, 1]) s.box([0.06, 0.42, 2.15], [x * (W / 2 - 0.05), 1.17, -1.4], body);
      s.box([W - 0.1, 0.42, 0.06], [0, 1.17, -2.47], body);
      s.box([W - 0.1, 0.42, 0.06], [0, 1.17, -0.35], body);
    }
    // Wheels with hubcaps.
    for (const z of wheels) for (const x of [-1, 1]) {
      const tyre = s.cylinder(0.34, 0.34, 0.22, [x * (W / 2 - 0.1), GROUND, z], dark, 20);
      tyre.rotation.z = Math.PI / 2;
      const cap = s.cylinder(0.19, 0.19, 0.23, [x * (W / 2 - 0.1), GROUND, z], chrome, 16);
      cap.rotation.z = Math.PI / 2;
    }
    // Bumpers, grille, lights and plates.
    const bumper = s.material(a.car === 'taxi' || a.colour === 'black' ? '#3a3c40' : '#2a2c2f', { roughness: 0.6, metalness: 0.2 });
    s.box([W - 0.2, 0.16, 0.12], [0, 0.5, L / 2 + 0.02], bumper);
    s.box([W - 0.2, 0.16, 0.12], [0, 0.5, -L / 2 - 0.02], bumper);
    s.box([0.6, 0.18, 0.04], [0, 0.72 + (a.car === 'pickup' ? 0.1 : 0), L / 2 + 0.03], dark);
    for (let i = 0; i < 4; i++) s.box([0.56, 0.015, 0.02], [0, 0.65 + i * 0.045 + (a.car === 'pickup' ? 0.1 : 0), L / 2 + 0.055], chrome);
    s.label(['DOG 1', 'WOOF', 'GOODBOY', 'K9 4EVA', 'BORK'][Math.floor(random() * 5)], 0.4, 0.12, [0, 0.42, L / 2 + 0.085], '#1a1a1a', '#f1f1ec');
    const headlightOn = a.running;
    const lampTint = new THREE.Color().setHSL(mix(0.58, 0.12, mood.warmth), 0.5, 0.9);
    for (const x of [-1, 1]) {
      const lamp = s.cylinder(0.14, 0.14, 0.05, [x * (W / 2 - 0.28), 0.76 + (a.car === 'pickup' ? 0.1 : 0), L / 2 + 0.03], new THREE.MeshStandardMaterial({ color: '#f6f6f0', emissive: lampTint, emissiveIntensity: headlightOn ? 2.2 : 0.05, roughness: 0.3 }), 18);
      lamp.rotation.x = Math.PI / 2;
      s.box([0.22, 0.12, 0.05], [x * (W / 2 - 0.3), 0.72 + (a.car === 'pickup' ? 0.1 : 0), -L / 2 - 0.03], new THREE.MeshStandardMaterial({ color: '#c01818', emissive: '#ff2a2a', emissiveIntensity: headlightOn ? 1.2 : 0.1, roughness: 0.4 }));
      if (headlightOn) {
        const beam = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.0, 18, 1, true), new THREE.MeshBasicMaterial({ color: lampTint, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }));
        beam.position.set(x * (W / 2 - 0.28), 0.45, L / 2 + 1.6);
        beam.rotation.x = -Math.PI / 2 - 0.08;
        s.root.add(beam);
      }
      // Door mirrors.
      s.box([0.1, 0.09, 0.14], [x * (W / 2 + 0.08), profile.roof - 0.5, profile.seatZ + 0.75], body);
    }
    if (headlightOn) {
      const pool = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ color: lampTint, transparent: true, opacity: 0.25, depthWrite: false }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(0, 0.004, L / 2 + 2.2);
      pool.scale.set(1.1, 1.6, 1);
      s.root.add(pool);
    }

    // ---- glass and the open driver window (driver sits on the +x side)
    const DRIVER = 1;
    const glazing = (points: [number, number][], x: number, open: boolean) => {
      const g = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
      const geometry = new THREE.ShapeGeometry(g).rotateY(-Math.PI / 2);
      const pane = new THREE.Mesh(geometry, open ? dark : glass);
      pane.position.x = x;
      if (open) pane.scale.y = 0.001;
      s.root.add(pane);
      return pane;
    };
    if (a.car !== 'convertible') {
      const roofY = profile.roof - 0.04, sillY = roofY - 0.45;
      const frontZ = profile.seatZ + 0.95, pillarZ = profile.seatZ + 0.1, backZ = profile.seatZ - 0.8;
      for (const x of [-1, 1]) {
        const open = x === DRIVER && a.head !== 'ahead';
        const side = x * (bodyWidth / 2 + 0.01);
        // Front door window, open on the driver's side when the dog leans out.
        if (!open) glazing([[frontZ - 0.35, sillY], [frontZ, sillY], [frontZ - 0.3, roofY], [pillarZ + 0.05, roofY], [pillarZ + 0.05, sillY]], side, false);
        if (a.car !== 'pickup') glazing([[pillarZ - 0.05, sillY], [pillarZ - 0.05, roofY], [backZ + 0.1, roofY], [backZ - 0.25, sillY]], side, false);
        // Door seam.
        s.box([0.01, 0.6, 0.02], [side - x * 0.02, sillY - 0.3, pillarZ], dark);
      }
      // Windscreen and rear glass.
      const front = s.mesh(new THREE.PlaneGeometry(bodyWidth - 0.2, 0.62), glass, [0, (profile.top[2][1] + profile.top[3][1]) / 2 + 0.02, (profile.top[2][0] + profile.top[3][0]) / 2 + 0.04]);
      front.rotation.x = -Math.atan2(profile.top[2][0] - profile.top[3][0], profile.top[3][1] - profile.top[2][1]);
      const rearIndex = a.car === 'pickup' ? 4 : profile.top.length - 3;
      const rear = s.mesh(new THREE.PlaneGeometry(bodyWidth - 0.3, 0.45), glass, [0, (profile.top[rearIndex][1] + profile.top[rearIndex + 1][1]) / 2 + 0.02, (profile.top[rearIndex][0] + profile.top[rearIndex + 1][0]) / 2 - 0.04]);
      rear.rotation.x = Math.atan2(profile.top[rearIndex][0] - profile.top[rearIndex + 1][0], profile.top[rearIndex][1] - profile.top[rearIndex + 1][1]);
    } else {
      // A windscreen frame on a low body, and the open cockpit behind it.
      const screen = s.mesh(new THREE.PlaneGeometry(bodyWidth - 0.2, 0.42), glass, [0, 1.1, profile.seatZ + 0.95]);
      screen.rotation.x = -0.4;
      s.box([bodyWidth - 0.16, 0.04, 0.04], [0, 1.3, profile.seatZ + 0.87], chrome);
      s.box([bodyWidth - 0.3, 0.3, 1.7], [0, 0.78, profile.seatZ + 0.05], dark);
    }
    if (a.car === 'taxi') {
      const checker = paint(128, 32, (ctx) => {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 128, 32);
        ctx.fillStyle = '#f1f1ec';
        for (let x = 0; x < 128; x += 32) { ctx.fillRect(x, 0, 16, 16); ctx.fillRect(x + 16, 16, 16, 16); }
      });
      checker.wrapS = checker.wrapT = THREE.RepeatWrapping;
      checker.repeat.set(10, 1);
      const band = new THREE.MeshStandardMaterial({ map: checker, roughness: 0.6 });
      for (const x of [-1, 1]) {
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.5, 0.14), band);
        strip.position.set(x * (bodyWidth / 2 + 0.045), 0.8, 0);
        strip.rotation.y = x * Math.PI / 2;
        s.root.add(strip);
      }
      s.box([0.5, 0.18, 0.2], [0, profile.roof + 0.1, profile.seatZ - 0.1], new THREE.MeshStandardMaterial({ color: '#fff3b0', emissive: '#ffe066', emissiveIntensity: headlightOn ? 1.2 : 0.15 }));
      s.label('TAXI', 0.46, 0.14, [0, profile.roof + 0.1, profile.seatZ + 0.001], '#1a1a1a', '#fff3b0');
    }
    if (a.car === 'hatchback') s.box([0.9, 0.03, 1.0], [0, profile.roof + 0.03, -0.5], dark);

    // ---- the dog
    const coat = { shaggy: '#c9a66b', pug: '#d9b98a', pointy: '#9a7a4a', giant: '#8a7a6a', spotted: '#f3f1ea' }[a.dog];
    const fur = s.material(coat, { roughness: 0.95 });
    const furDark = s.material(a.dog === 'pointy' ? '#3a2e24' : a.dog === 'pug' ? '#2a2420' : a.dog === 'spotted' ? '#1a1a1a' : '#8a6a44', { roughness: 0.95 });
    const nose = s.material('#1a1416', { roughness: 0.3 });
    const pink = s.material('#e8788a', { roughness: 0.6 });
    const scale = a.dog === 'giant' ? 1.45 : a.dog === 'pug' ? 0.9 : 1.1;
    const seatY = 0.55 + (a.car === 'pickup' ? 0.15 : 0);
    const seatZ = profile.seatZ;
    const dogX = DRIVER * 0.42;
    // Torso, sitting up behind the wheel.
    const torso = s.mesh(new THREE.CapsuleGeometry(0.2 * scale, 0.36 * scale, 4, 12), fur, [dogX, seatY + 0.36 * scale, seatZ]);
    torso.rotation.x = 0.25;
    // Steering wheel and the paws on it.
    const wheelAt: V3 = [dogX, seatY + 0.5 * scale, seatZ + 0.5];
    const wheel = s.ring(0.17, 0.022, wheelAt, dark);
    wheel.rotation.x = 1.2;
    s.rod([dogX, seatY + 0.3, seatZ + 0.75], wheelAt, 0.03, dark);
    for (const side of [-1, 1]) {
      const paw: V3 = [dogX + side * 0.14, wheelAt[1] + 0.07, wheelAt[2] - 0.02];
      s.rod([dogX + side * 0.12 * scale, seatY + 0.45 * scale, seatZ + 0.08], paw, 0.045 * scale, fur);
      s.ball([0.06 * scale, 0.05 * scale, 0.07 * scale], paw, fur, 10);
    }
    // The head: a group so the pose can turn it out of the window or up to the sky.
    const head = new THREE.Group();
    const R = 0.26 * scale;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(R, 20, 14), fur);
    skull.castShadow = true;
    head.add(skull);
    const add = (mesh: THREE.Mesh, at: V3, rot: V3 = [0, 0, 0]) => { mesh.position.set(...at); mesh.rotation.set(...rot); mesh.castShadow = true; head.add(mesh); return mesh; };
    const snoutLength = a.dog === 'pug' ? 0.04 : a.dog === 'pointy' ? 0.2 : a.dog === 'giant' ? 0.2 : 0.14;
    add(new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.5, snoutLength, 4, 10).rotateX(Math.PI / 2), a.dog === 'pug' ? furDark : fur), [0, -R * 0.2, R * 0.75 + snoutLength / 2]);
    add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.2, 10, 8), nose), [0, -R * 0.1, R * 0.8 + snoutLength + R * 0.4]);
    if (a.dog === 'giant') for (const side of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.32, 10, 8), fur), [side * R * 0.42, -R * 0.55, R * 0.85]);
    // Eyes.
    for (const side of [-1, 1]) {
      const eyeR = a.dog === 'pug' ? R * 0.2 : R * 0.13;
      add(new THREE.Mesh(new THREE.SphereGeometry(eyeR, 10, 8), s.material('#f6f3ea', { roughness: 0.3 })), [side * R * 0.42, R * 0.18, R * 0.82]);
      add(new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.55, 8, 6), nose), [side * R * 0.44, R * 0.18, R * 0.82 + eyeR * 0.7]);
    }
    // Ears by breed.
    const ears: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      let ear: THREE.Mesh;
      if (a.dog === 'pointy') ear = add(new THREE.Mesh(new THREE.ConeGeometry(R * 0.32, R * 0.8, 8), furDark), [side * R * 0.55, R * 0.95, -R * 0.1], [-0.2, 0, -side * 0.3]);
      else if (a.dog === 'pug') ear = add(new THREE.Mesh(new THREE.BoxGeometry(R * 0.35, R * 0.4, R * 0.1), furDark), [side * R * 0.7, R * 0.6, -R * 0.1], [0.3, 0, side * 0.5]);
      else {
        ear = add(new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.22, R * 0.6, 4, 8), a.dog === 'spotted' ? furDark : furDark), [side * R * 0.85, R * 0.15, -R * 0.1], [0.1, 0, side * 0.35]);
        ear.scale.z = 0.5;
      }
      ears.push(ear);
    }
    // Tongue, fur and spots.
    const tongueOut = a.head === 'window' || mood.cheer > 0.55;
    if (tongueOut) {
      const tongue = add(new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.16, R * 0.45, 3, 8), pink), [R * 0.08, -R * 0.55, R * 0.7 + snoutLength * 0.6], [0.9, 0, 0]);
      tongue.scale.x = 1.4;
    }
    if (a.dog === 'shaggy') {
      const tufts = new THREE.InstancedMesh(new THREE.SphereGeometry(R * 0.28, 8, 6), fur, 26);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 26; i++) {
        const t = random() * Math.PI * 2, p = random() * Math.PI * 0.8;
        m.makeScale(mix(0.7, 1.3, random()), mix(0.6, 1, random()), mix(0.7, 1.3, random())).setPosition(Math.sin(p) * Math.cos(t) * R * 0.95, Math.cos(p) * R * 0.95 + R * 0.1, Math.sin(p) * Math.sin(t) * R * 0.9);
        tufts.setMatrixAt(i, m);
      }
      tufts.castShadow = true;
      head.add(tufts);
    }
    if (a.dog === 'spotted') {
      const spots = new THREE.InstancedMesh(new THREE.SphereGeometry(R * 0.14, 8, 6), furDark, 22);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 22; i++) {
        const t = random() * Math.PI * 2, p = random() * Math.PI * 0.9;
        m.makeScale(1, mix(0.5, 1, random()), 1).setPosition(Math.sin(p) * Math.cos(t) * R, Math.cos(p) * R, Math.sin(p) * Math.sin(t) * R);
        spots.setMatrixAt(i, m);
      }
      head.add(spots);
    }
    // Accessories.
    if (a.accessory === 'sunglasses' || a.accessory === 'both') {
      const lens = s.material('#0d0d10', { roughness: 0.15, metalness: 0.4 });
      for (const side of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(R * 0.5, R * 0.34, R * 0.08), lens), [side * R * 0.42, R * 0.18, R * 0.95]);
      add(new THREE.Mesh(new THREE.BoxGeometry(R * 0.2, R * 0.06, R * 0.06), lens), [0, R * 0.2, R * 0.95]);
      for (const side of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(R * 0.05, R * 0.05, R * 0.9), lens), [side * R * 0.7, R * 0.2, R * 0.5]);
    }
    if (a.accessory === 'party-hat') {
      const hat = add(new THREE.Mesh(new THREE.ConeGeometry(R * 0.5, R * 1.2, 12), s.material(['#e63946', '#2a9d8f', '#f4a261'][Math.floor(random() * 3)], { roughness: 0.5 })), [0, R * 1.35, 0], [0, 0, 0.15]);
      void hat;
      add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.12, 8, 6), s.material('#f4d35e')), [-R * 0.09, R * 1.95, 0]);
    }
    // Neck joins the torso to wherever the head goes.
    const neckFrom = new THREE.Vector3(dogX, seatY + 0.66 * scale, seatZ + 0.05);
    const sill = profile.roof - 0.52;
    let headAt: THREE.Vector3;
    const closed = a.car !== 'convertible';
    if (a.head === 'window' && closed) {
      headAt = new THREE.Vector3(DRIVER * (bodyWidth / 2 + R * 1.0), Math.max(sill + R * 0.95, seatY + 0.85 * scale), seatZ + 0.4);
      head.rotation.set(0.1, DRIVER * Math.PI / 2 - 0.45, 0);
    } else if (a.head === 'window') {
      headAt = new THREE.Vector3(DRIVER * (bodyWidth / 2 - 0.05), seatY + 0.95 * scale, seatZ + 0.35);
      head.rotation.set(0.1, DRIVER * 0.9, -DRIVER * 0.2);
    } else if (a.head === 'barking' && closed) {
      // Leaning out of the window to bark at the sky.
      headAt = new THREE.Vector3(DRIVER * (bodyWidth / 2 + R * 0.8), Math.max(sill + R * 1.1, seatY + 0.9 * scale), seatZ + 0.4);
      head.rotation.set(-0.75, DRIVER * Math.PI / 2 - 0.3, 0);
    } else if (a.head === 'barking') {
      headAt = new THREE.Vector3(dogX, seatY + 1.0 * scale, seatZ + 0.2);
      head.rotation.set(-0.9, 0, 0);
    } else {
      headAt = new THREE.Vector3(dogX, seatY + 0.95 * scale, seatZ + 0.3);
      head.rotation.set(0.05, jitter(0.3), 0);
    }
    head.position.copy(headAt);
    s.root.add(head);
    if ((a.head === 'window' || a.head === 'barking') && closed) {
      // A foreleg hooked over the open door, paw hanging outside.
      const shoulder: V3 = [dogX + DRIVER * 0.12 * scale, seatY + 0.5 * scale, seatZ + 0.15];
      const elbow: V3 = [DRIVER * (bodyWidth / 2 + 0.03), sill + 0.06, seatZ + 0.2];
      s.rod(shoulder, elbow, 0.05 * scale, fur);
      s.rod(elbow, [DRIVER * (bodyWidth / 2 + 0.08), sill - 0.22 * scale, seatZ + 0.22], 0.045 * scale, fur);
      s.ball([0.065 * scale, 0.055 * scale, 0.07 * scale], [DRIVER * (bodyWidth / 2 + 0.09), sill - 0.26 * scale, seatZ + 0.22], fur, 10);
    }
    s.rod(neckFrom.toArray() as V3, headAt.toArray() as V3, 0.09 * scale, fur, 0.11 * scale);
    // Collar and bandana at the base of the neck.
    const collarAt = neckFrom.clone().lerp(headAt, 0.35);
    if (a.accessory === 'bandana' || a.accessory === 'both') {
      const cloth = paint(64, 64, (ctx) => {
        ctx.fillStyle = '#c9262c';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#f6f1e6';
        for (let y = 6; y < 64; y += 14) for (let x = 6; x < 64; x += 14) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); }
      });
      const tri = new THREE.Shape([new THREE.Vector2(-0.16 * scale, 0), new THREE.Vector2(0.16 * scale, 0), new THREE.Vector2(0, -0.24 * scale)]);
      const bandana = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.9, side: THREE.DoubleSide }));
      bandana.position.set(collarAt.x, collarAt.y, collarAt.z + 0.12 * scale);
      bandana.rotation.x = 0.4;
      bandana.castShadow = true;
      s.root.add(bandana);
      s.ring(0.11 * scale, 0.02 * scale, collarAt.toArray() as V3, s.material('#c9262c')).rotation.x = Math.PI / 2 + 0.3;
    } else s.ring(0.11 * scale, 0.018 * scale, collarAt.toArray() as V3, s.material(['#2a62c9', '#c9262c', '#2a2a2a'][Math.floor(random() * 3)], { roughness: 0.5 })).rotation.x = Math.PI / 2 + 0.3;
    // A tail wagging over the seat back.
    const tail = new THREE.Group();
    tail.position.set(dogX, seatY + 0.12 * scale, seatZ - 0.22 * scale);
    const tailMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.03 * scale, a.dog === 'pug' ? 0.1 : 0.3 * scale, 4, 8), fur);
    tailMesh.position.y = 0.15 * scale;
    tailMesh.castShadow = true;
    tail.add(tailMesh);
    tail.rotation.x = a.dog === 'pug' ? -1.2 : -0.6;
    s.root.add(tail);

    // ---- the passenger
    let person: ReturnType<typeof figure> | null = null;
    if (a.passenger) {
      person = figure(s, {
        height: 1.65, style: 'doll', pose: 'sitting', gaze: 'left',
        hair: (['short', 'long', 'cap', 'bun'] as const)[Math.floor(random() * 4)],
        top: ['#5b7a8a', '#c0392b', '#f1e6c8', '#2a2a2e'][Math.floor(random() * 4)], bottom: '#3d4652',
        skin: ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0'][Math.floor(random() * 4)],
        sleeves: random() < 0.5 ? 'short' : 'long',
      });
      person.root.position.set(-DRIVER * 0.42, seatY - person.hipHeight + 0.02, seatZ + 0.05);
      s.root.add(person.root);
    }
    // Seats.
    for (const x of [-1, 1]) {
      s.box([0.5, 0.12, 0.5], [x * 0.42, seatY - 0.06, seatZ], dark);
      s.box([0.5, 0.6, 0.12], [x * 0.42, seatY + 0.24, seatZ - 0.3], dark);
    }

    // ---- running: exhaust puffs
    const puffs: THREE.Mesh[] = [];
    if (a.running) {
      s.cylinder(0.035, 0.035, 0.2, [-0.5, 0.28, -L / 2 - 0.05], chrome, 10).rotation.x = Math.PI / 2;
      const smoke = new THREE.MeshStandardMaterial({ color: '#cfd2d4', transparent: true, opacity: 0.22, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 4; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.08 + i * 0.05, 10, 8), smoke);
        puff.position.set(-0.5 - i * 0.08, 0.3 + i * 0.12, -L / 2 - 0.25 - i * 0.3);
        s.root.add(puff);
        puffs.push(puff);
      }
    }
    if (mood.wear > 0.45) for (let i = 0; i < Math.round(mood.wear * 10); i++) {
      const rust = s.box([0.08, 0.05, 0.01], [(random() < 0.5 ? -1 : 1) * (bodyWidth / 2 + 0.04), 0.4 + random() * 0.4, jitter(L * 0.8)], s.material('#7a4a2a', { roughness: 1 }));
      rust.rotation.y = random() * 0.4;
    }

    const energy = mood.energy;
    return s.finish({
      footprint: L / 2,
      update(dt, time) {
        tail.rotation.z = Math.sin(time * mix(3, 11, energy)) * mix(0.3, 0.8, mood.cheer);
        if (a.head === 'window') for (const [i, ear] of ears.entries()) ear.rotation.x = 0.1 + Math.sin(time * 9 + i) * 0.12 * (0.3 + energy);
        for (const [i, puff] of puffs.entries()) {
          puff.position.y = 0.3 + i * 0.12 + Math.sin(time * 1.5 + i) * 0.03;
          puff.scale.setScalar(1 + Math.sin(time * 2 + i * 1.3) * 0.12);
        }
        person?.update(dt, time);
      },
    });
  },
});
