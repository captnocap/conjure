import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const SIZES = {
  pouch: 'A small square waist pouch, barely bigger than the wrench.',
  crewlock: 'The standard briefcase-sized white tool bag.',
  duffel: 'A long padded equipment duffel, an expensive thing to lose.',
} as const;
const FLAPS = {
  shut: 'Buckled neatly shut, smug and intact as it leaves.',
  open: 'Flap wide open, the contents free to wander off.',
  torn: 'A side seam ripped, silver insulation bulging out.',
} as const;
const SPILLS = {
  nothing: 'Nothing: it keeps everything to itself.',
  sockets: 'A glittering cloud of sockets, bolts and washers.',
  grease: 'A grease gun and wobbling blobs of grease.',
  lunch: "Somebody's lunch: a sandwich and a silver drink pouch.",
  photos: 'A few family photographs turning slowly.',
  glove: 'A single spare glove, fingers curled.',
} as const;
const LANYARDS = {
  streaming: 'Streaming out behind in long lazy curves.',
  coiled: 'Springy retractable coils, bouncing.',
  tangled: 'Looped and knotted round the bag itself.',
  cut: 'Snapped short: the wrench has parted company and floats on its own.',
} as const;
const LABELS = {
  tools: 'EVA TOOLS, plain and official.',
  lose: 'DO NOT LOSE in red, now ironic.',
  sorry: 'A strip of tape with SORRY written by hand.',
  property: 'PROPERTY OF STATION and an inventory number.',
  two: 'BAG 2 OF 2.',
  blank: 'No label at all.',
} as const;
const TRIMS = {
  blue: 'Blue straps and tags.',
  orange: 'High-visibility orange straps.',
  red: 'Red straps, remove-before-flight style.',
  grey: 'Plain grey webbing.',
} as const;

export default defineThing({
  questions: {
    size: choice('What kind of bag is it?', SIZES),
    flap: choice('How is the bag closed?', FLAPS),
    spill: choice('What is escaping from it or drifting alongside?', SPILLS),
    lanyard: choice('How do the trailing lanyards behave?', LANYARDS),
    label: choice('What does the label on the bag say?', LABELS),
    trim: choice('What colour are its straps and tags?', TRIMS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const add = <T extends THREE.Object3D>(parent: THREE.Object3D, child: T) => { parent.add(child); return child; };
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const all = add(s.root, new THREE.Group());
    const bag = add(all, new THREE.Group());

    const [w, h, d] = { pouch: [0.3, 0.3, 0.16], crewlock: [0.52, 0.36, 0.26], duffel: [0.86, 0.32, 0.32] }[a.size];
    // Quilted beta cloth: a painted diamond stitch so it reads as padded fabric, not a white box.
    const quilt = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#f1efe7'; c.fillRect(0, 0, 256, 256);
      c.strokeStyle = '#b4b0a2'; c.lineWidth = 3; c.setLineDash([9, 6]);
      for (let i = -256; i <= 512; i += 64) {
        c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 256, 256); c.stroke();
        c.beginPath(); c.moveTo(i, 256); c.lineTo(i + 256, 0); c.stroke();
      }
      for (let i = 0; i < mood.wear * 120; i++) { c.fillStyle = `rgba(90,80,62,${0.08 + random() * 0.18})`; c.beginPath(); c.arc(random() * 256, random() * 256, 3 + random() * 12, 0, 7); c.fill(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2, 2);
      return texture;
    })();
    const fabric = new THREE.MeshStandardMaterial({ map: quilt, roughness: 0.95 });
    const strap = s.material({ blue: '#2f5fb5', orange: '#f07a1c', red: '#c8362c', grey: '#7d8288' }[a.trim], { roughness: 0.85 });
    const velcro = s.material('#b9bbb6', { roughness: 1 });
    const metal = s.material('#c9ccd0', { metalness: 0.9, roughness: 0.25 });
    const dark = s.material('#2a2d32', { roughness: 0.6 });
    const foil = s.material('#cfd3d6', { metalness: 0.9, roughness: 0.35, flatShading: true });

    // The bag: a soft box with webbing round it, grab handles, corner rings and a flap.
    add(bag, s.mesh(new RoundedBoxGeometry(w, h, d, 5, Math.min(h, d) * 0.28), fabric));
    for (const x of [-w * 0.28, w * 0.28]) add(bag, s.mesh(new RoundedBoxGeometry(0.05, h + 0.012, d + 0.012, 3, 0.02), strap, [x, 0, 0]));
    for (const x of [-w * 0.28, w * 0.28]) add(bag, s.box([0.07, 0.05, 0.014], [x, -h * 0.05, d / 2 + 0.008], dark));
    // A bellows pocket on the front carries the label.
    add(bag, s.mesh(new RoundedBoxGeometry(w * 0.62, h * 0.5, 0.07, 3, 0.025), fabric, [0, -h * 0.16, d / 2 + 0.015]));
    add(bag, s.box([w * 0.64, 0.022, 0.075], [0, h * 0.09, d / 2 + 0.017], strap));
    add(bag, s.box([w * 0.2, 0.05, 0.01], [0, h * 0.06, d / 2 + 0.056], velcro));
    for (const side of [-1, 1]) {
      const handle = add(bag, s.ring(Math.min(0.08, w * 0.16), 0.012, [side * w * 0.5, h * 0.12, 0], strap, Math.PI));
      handle.rotation.set(0, 0, -side * Math.PI / 2);
      const ring = add(bag, s.ring(0.028, 0.006, [side * (w / 2 + 0.02), -h * 0.28, d * 0.25], metal));
      ring.rotation.y = Math.PI / 2;
    }
    const flap = add(bag, new THREE.Group());
    flap.position.set(0, h / 2 - 0.01, -d / 2 + 0.02);
    add(flap, s.mesh(new RoundedBoxGeometry(w * 1.02, 0.03, d * 1.04, 3, 0.012), fabric, [0, 0.015, d * 0.5]));
    add(flap, s.mesh(new RoundedBoxGeometry(w * 1.02, h * 0.34, 0.025, 3, 0.01), fabric, [0, -h * 0.14, d * 1.02]));
    add(flap, s.box([w * 1.03, 0.018, 0.03], [0, -h * 0.3, d * 1.02], strap));
    // A webbing grab loop arches over the lid.
    add(flap, s.tube([[-w * 0.24, 0.03, d * 0.5], [-w * 0.2, 0.1, d * 0.5], [0, 0.14, d * 0.5], [w * 0.2, 0.1, d * 0.5], [w * 0.24, 0.03, d * 0.5]], 0.014, strap));
    for (const x of [-w * 0.24, w * 0.24]) add(flap, s.box([0.06, 0.012, 0.06], [x, 0.034, d * 0.5], dark));
    if (a.flap === 'open') {
      flap.rotation.x = -1.9 - random() * 0.5;
      add(bag, s.box([w * 0.86, 0.02, d * 0.8], [0, h / 2 - 0.02, 0], dark));
      // Tool handles sticking up out of the open mouth.
      for (let i = 0; i < 3; i++) add(bag, s.rod([jitter(w * 0.6), h * 0.3, jitter(d * 0.4)], [jitter(w * 0.7), h * 0.5 + 0.06 + random() * 0.1, jitter(d * 0.5)], 0.016, [metal, strap, dark][i]));
    }
    if (a.flap === 'torn') {
      for (let i = 0; i < 7; i++) add(bag, s.mesh(new THREE.IcosahedronGeometry(0.03 + random() * 0.035, 0), foil, [w / 2 - 0.02 + random() * 0.08, jitter(h * 0.6), jitter(d * 0.7)])).rotation.set(random() * 3, random() * 3, 0);
      add(bag, s.box([0.012, h * 0.8, 0.012], [w / 2 + 0.002, 0, d * 0.4], dark)).rotation.x = 0.3;
      add(bag, s.box([0.012, h * 0.7, 0.012], [w / 2 + 0.002, 0, -d * 0.38], dark)).rotation.x = -0.25;
    }
    if (a.label !== 'blank') {
      const text = { tools: 'EVA TOOLS', lose: 'DO NOT LOSE', sorry: 'SORRY', property: 'PROPERTY OF STATION  0417', two: 'BAG 2 OF 2' }[a.label];
      const tape = a.label === 'sorry';
      const label = add(bag, s.label(text, Math.min(w * 0.56, 0.44), Math.min(w * 0.56, 0.44) * 0.3, [0, -h * 0.2, d / 2 + 0.052], a.label === 'lose' ? '#c8262c' : '#1d2024', tape ? '#e9dfa8' : '#fbfaf5'));
      if (tape) label.rotation.z = jitter(0.3);
      label.castShadow = false;
    }
    bag.rotation.set(0.3 + jitter(0.3), 0.55 + jitter(0.4), jitter(0.7));

    // The two things on lanyards: a ratchet wrench and a big locking tether hook.
    const wrench = new THREE.Group();
    add(wrench, s.box([0.03, 0.26, 0.012], [0, 0, 0], metal));
    const jaw = add(wrench, s.ring(0.036, 0.013, [0, 0.16, 0], metal, Math.PI * 1.5));
    jaw.rotation.z = Math.PI * 0.75;
    add(wrench, s.ring(0.025, 0.01, [0, -0.15, 0], metal));
    add(wrench, s.box([0.036, 0.09, 0.018], [0, -0.05, 0], strap));
    const hook = new THREE.Group();
    const loop = add(hook, s.ring(0.05, 0.012, [0, 0.03, 0], metal));
    loop.scale.set(1, 1.7, 1);
    add(hook, s.box([0.03, 0.09, 0.03], [0.05, 0.03, 0], s.material('#c8362c')));
    add(hook, s.cylinder(0.018, 0.018, 0.05, [0, -0.08, 0], metal, 10));
    add(hook, s.ring(0.02, 0.007, [0, -0.12, 0], metal));

    wrench.scale.setScalar(1.35);
    hook.scale.setScalar(1.5);
    bag.updateMatrixWorld(true);
    const trail = (fromLocal: THREE.Vector3, to: THREE.Vector3, tint: THREE.Material, thing: THREE.Group, seed: number) => {
      const from = bag.localToWorld(fromLocal.clone());
      const span = to.clone().sub(from);
      const sideways = new THREE.Vector3(0, 1, 0).cross(span).normalize();
      const upward = span.clone().cross(sideways).normalize();
      const cut = a.lanyard === 'cut';
      const points: [number, number, number][] = [];
      for (let i = 0; i <= 100; i++) {
        const t = (i / 100) * (cut ? 0.3 : 1);
        const p = from.clone().addScaledVector(span, t);
        const mid = Math.sin(Math.PI * t);
        if (a.lanyard === 'streaming' || cut) p.addScaledVector(upward, Math.sin(t * 5 + seed) * 0.09 * (cut ? t * 3 : mid)).addScaledVector(sideways, Math.cos(t * 4 + seed * 2) * 0.07 * (cut ? t * 3 : mid));
        if (a.lanyard === 'coiled') { const r = Math.min(1, Math.min(t, 1 - t) * 8) * 0.035; p.addScaledVector(sideways, Math.cos(t * 75) * r).addScaledVector(upward, Math.sin(t * 75) * r); }
        if (a.lanyard === 'tangled') {
          // Wind round the bag before wandering out to the tool.
          const wind = Math.max(0, 1 - t * 1.6);
          const centre = bag.position.clone().lerp(p, 1 - wind);
          p.copy(centre).add(new THREE.Vector3(Math.cos(t * 16 + seed), Math.sin(t * 11 + seed) * 0.7, Math.sin(t * 16 + seed)).multiplyScalar(wind * Math.max(w, d) * 0.72));
          p.addScaledVector(upward, Math.sin(t * 9 + seed) * 0.06 * mid);
        }
        points.push(p.toArray() as [number, number, number]);
      }
      add(all, s.tube(points, 0.007, tint));
      const end = new THREE.Vector3(...points[points.length - 1]);
      if (cut) {
        for (let i = 0; i < 4; i++) add(all, s.rod(end.toArray() as [number, number, number], [end.x + jitter(0.07), end.y + jitter(0.07), end.z + jitter(0.07)], 0.003, tint));
        // The lost end goes with the tool, still tied to it.
        add(all, s.tube([to.toArray() as [number, number, number], [to.x - 0.1, to.y + 0.08, to.z + 0.05], [to.x - 0.16, to.y - 0.02, to.z + 0.12]], 0.007, tint));
      }
      thing.position.copy(to);
      thing.rotation.set(random() * 3, random() * 3, random() * 3);
      all.add(thing);
    };
    const reach = (a.lanyard === 'cut' ? 1.25 : 1) * (0.34 + w * 0.6);
    trail(new THREE.Vector3(-w / 2 - 0.02, -h * 0.28, d * 0.25), new THREE.Vector3(-reach - jitter(0.15), 0.22 + jitter(0.2), 0.25 + jitter(0.3)), strap, wrench, random() * 6);
    const hookTint = s.material('#e8e3d2', { roughness: 0.85 });
    trail(new THREE.Vector3(w / 2 + 0.02, -h * 0.28, d * 0.25), new THREE.Vector3(-reach * 0.75 - jitter(0.15), -0.3 + jitter(0.15), -0.3 + jitter(0.3)), hookTint, hook, random() * 6);

    // What has got out.
    const count = Math.round(mix(0.5, 1.6, mood.density) * { nothing: 0, sockets: 16, grease: 7, lunch: 1, photos: 4, glove: 1 }[a.spill]);
    const spot = (): [number, number, number] => {
      const angle = random() * Math.PI * 2, radius = Math.max(w, 0.4) * (0.6 + random() * 0.5);
      return [Math.cos(angle) * radius * 0.9 + 0.15, 0.1 + jitter(0.6), Math.sin(angle) * radius * 0.8];
    };
    const loose: THREE.Object3D[] = [];
    const drop = (object: THREE.Object3D, at: [number, number, number] = spot()) => {
      object.position.set(...at);
      object.rotation.set(random() * 6, random() * 6, random() * 6);
      all.add(object);
      loose.push(object);
      return object;
    };
    if (a.spill === 'sockets') for (let i = 0; i < count; i++) {
      const kind = i % 3;
      if (kind === 0) drop(s.cylinder(0.018, 0.022, 0.045, [0, 0, 0], metal, 6));
      else if (kind === 1) drop(s.ring(0.016, 0.006, [0, 0, 0], metal));
      else { const bolt = new THREE.Group(); add(bolt, s.cylinder(0.008, 0.008, 0.05, [0, 0, 0], metal, 8)); add(bolt, s.cylinder(0.016, 0.016, 0.012, [0, 0.03, 0], metal, 6)); drop(bolt); }
    }
    if (a.spill === 'grease') {
      const gun = new THREE.Group();
      add(gun, s.cylinder(0.035, 0.035, 0.26, [0, 0, 0], s.material('#d9a21c', { roughness: 0.5 }), 16));
      add(gun, s.rod([0, 0.13, 0], [0.04, 0.25, 0], 0.008, metal));
      add(gun, s.box([0.02, 0.14, 0.035], [0.05, 0.0, 0], dark)).rotation.z = 0.3;
      drop(gun, [w * 0.3 + 0.25, h * 0.5 + 0.22, 0.2]);
      const blob = s.material('#3b2f1e', { roughness: 0.25 });
      for (let i = 0; i < count; i++) { const r = 0.012 + random() * 0.03; drop(s.ball([r, r * (0.7 + random() * 0.6), r], [0, 0, 0], blob, 10)); }
    }
    if (a.spill === 'lunch') {
      const sandwich = new THREE.Group();
      add(sandwich, s.box([0.12, 0.018, 0.12], [0, 0.02, 0], s.material('#d9b57c')));
      add(sandwich, s.box([0.125, 0.012, 0.125], [0, 0.004, 0], s.material('#7fb24a')));
      add(sandwich, s.box([0.118, 0.01, 0.118], [0, -0.007, 0], s.material('#c8473a')));
      add(sandwich, s.box([0.12, 0.018, 0.12], [0, -0.022, 0], s.material('#d9b57c')));
      drop(sandwich, [w * 0.2 + 0.2, h * 0.5 + 0.25, 0.15]);
      const pouch = new THREE.Group();
      add(pouch, s.mesh(new RoundedBoxGeometry(0.1, 0.15, 0.025, 2, 0.01), foil));
      add(pouch, s.rod([0.02, 0.07, 0], [0.04, 0.16, 0.01], 0.005, s.material('#f2f0e9')));
      drop(pouch, [-0.05, h * 0.5 + 0.38, -0.12]);
      for (let i = 0; i < 5; i++) drop(s.ball([0.008, 0.008, 0.008], [0, 0, 0], s.material('#d9b57c'), 6), [w * 0.2 + 0.2 + jitter(0.25), h * 0.5 + 0.25 + jitter(0.25), 0.15 + jitter(0.25)]);
    }
    if (a.spill === 'photos') for (let i = 0; i < Math.max(2, count); i++) {
      const photo = new THREE.Group();
      add(photo, s.box([0.11, 0.14, 0.003], [0, 0, 0], s.material('#f8f5ea', { side: THREE.DoubleSide })));
      add(photo, s.box([0.09, 0.09, 0.004], [0, 0.015, 0], s.material(['#6f9fd0', '#c98a5a', '#7fae6a', '#b98ab8'][i % 4])));
      add(photo, s.ball([0.02, 0.02, 0.003], [jitter(0.03), 0.01, 0.002], s.material('#e3b392'), 8));
      drop(photo);
    }
    if (a.spill === 'glove') {
      const glove = new THREE.Group();
      const palm = s.material('#8d9096', { roughness: 0.85 });
      add(glove, s.mesh(new RoundedBoxGeometry(0.11, 0.12, 0.05, 3, 0.02), palm));
      add(glove, s.cylinder(0.055, 0.062, 0.08, [0, -0.1, 0], fabric, 14));
      add(glove, s.cylinder(0.064, 0.064, 0.02, [0, -0.14, 0], metal, 14));
      for (let f = 0; f < 4; f++) add(glove, s.rod([-0.04 + f * 0.027, 0.06, 0], [-0.045 + f * 0.03, 0.13, 0.03], 0.014, palm));
      add(glove, s.rod([0.055, 0, 0], [0.1, 0.05, 0.02], 0.016, palm));
      drop(glove, [w * 0.25 + 0.25, h * 0.5 + 0.2, 0.18]);
    }

    all.rotation.y = jitter(0.6);
    const pace = mix(0.08, 0.9, mood.energy);
    const spins = loose.map(() => [jitter(1), jitter(1)]);
    return s.finish({
      update: (dt) => {
        all.rotation.y += dt * pace * 0.35;
        loose.forEach((object, index) => { object.rotation.x += dt * pace * spins[index][0]; object.rotation.z += dt * pace * spins[index][1]; });
      },
    });
  },
});
