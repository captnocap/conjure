import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

const FINISH = {
  gilded: { ground: '#d9a938', ink: '#8c6118', alt: '#b98522', metal: 0.6 },
  inlaid: { ground: '#d9a938', ink: '#27509f', alt: '#2f9c8c', metal: 0.5 },
  black: { ground: '#1e1a17', ink: '#e2b84a', alt: '#c8982f', metal: 0.15 },
  painted: { ground: '#efe6cf', ink: '#b23c28', alt: '#2c5aa6', metal: 0 },
} as const;

export default defineThing({
  questions: {
    story: choice('What is the shrine doing when we find it?', {
      guarding: 'Standing square on its sledge on the floor, the jackal keeping watch, nothing disturbed.',
      shrouded: 'The jackal is wrapped to the neck in a linen shirt, as the priests left it, only the head free.',
      procession: 'Raised on trestles by its poles, garlanded, halted in the middle of a funeral procession.',
      rifled: 'The lid and its jackal have been shoved askew and jewellery pulled out and dropped on the floor.',
      abandoned: 'Left behind: sand drifted against the base, one pole snapped, gilding gone dull.',
    }),
    shawl: choice('What does the jackal wear round its neck?', {
      linen: 'A plain white linen shawl knotted at the throat, ends hanging down the chest.',
      scarf: 'A long red scarf with a gold ribbon.',
      garland: 'A collar of leaves, blue petals and berries.',
      none: 'Nothing: bare black neck with a painted gold collar line.',
    }),
    head: choice('How does the jackal hold its head?', {
      level: 'Level and forward, staring straight down the passage.',
      high: 'Lifted high on a long neck, ears straining.',
      turned: 'Turned sideways to look directly at whoever has just come in.',
    }),
    coat: choice('What is the jackal made of?', {
      black: 'Black varnished wood with gilded ears, eyes of gold and silver claws.',
      gold: 'Gilded from nose to tail.',
      flaked: 'Old painted wood, the black flaking away to pale gesso in patches.',
      stone: 'Dark green-grey polished stone.',
    }),
    finish: choice('How is the shrine chest finished?', {
      gilded: 'Gold leaf all over with the decoration in low relief.',
      inlaid: 'Gold with the signs inlaid in blue and turquoise.',
      black: 'Black varnish with fine gold line work.',
      painted: 'Whitewashed wood painted in red and blue.',
    }),
    panels: choice('What decorates the sides of the chest?', {
      amulets: 'Two rows of alternating djed pillars and knot amulets.',
      niches: 'Tall recessed niches like a palace wall.',
      text: 'Columns of hieroglyphic text between ruled lines.',
      wings: 'A winged sun disc spreading across each side.',
    }),
    poles: noul('Are the long carrying poles in place?'),
    torch: noul('Is a small reed torch on a clay brick set on the floor in front of it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const F = FINISH[a.finish];
    const dullness = mood.wear * 0.5 + (a.story === 'abandoned' ? 0.25 : 0);
    const dull = (c: string) => '#' + new THREE.Color(c).lerp(new THREE.Color('#8d8371'), dullness * 0.6).getHexString();
    const rig = new THREE.Group(), cap = new THREE.Group(), dog = new THREE.Group(), head = new THREE.Group();
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0]) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    const ball = (parent: THREE.Object3D, material: THREE.Material, at: P3, size: P3) => { const m = put(parent, new THREE.SphereGeometry(1, 18, 12), material, at); m.scale.set(...size); return m; };
    const limb = (parent: THREE.Object3D, material: THREE.Material, from: P3, to: P3, r0: number, r1 = r0) => {
      const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to), d = B.clone().sub(A);
      const m = put(parent, new THREE.CylinderGeometry(r1, r0, d.length(), 12), material, A.clone().add(B).multiplyScalar(0.5).toArray() as P3);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
    };
    const taper = (w: number, h: number, d: number, top: number) => {
      const g = new THREE.BoxGeometry(w, h, d), p = g.getAttribute('position');
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * top); p.setZ(i, p.getZ(i) * top); }
      g.computeVertexNormals(); return g;
    };

    // ---- painted side panels ----
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
    const c = canvas.getContext('2d')!;
    c.fillStyle = dull(F.ground); c.fillRect(0, 0, 512, 256);
    c.strokeStyle = c.fillStyle = dull(F.ink); c.lineWidth = 6; c.strokeRect(10, 10, 492, 236); c.lineWidth = 3; c.strokeRect(22, 22, 468, 212);
    const djed = (x: number, y: number, h: number) => { c.fillRect(x - 5, y - h / 2, 10, h); for (let k = 0; k < 4; k++) c.fillRect(x - 15, y - h / 2 + k * 9, 30, 5); c.fillRect(x - 13, y + h / 2 - 5, 26, 5); };
    const knot = (x: number, y: number, h: number) => { c.fillStyle = dull(F.alt); c.beginPath(); c.ellipse(x, y - h * 0.3, 8, h * 0.2, 0, 0, 7); c.fill(); c.fillRect(x - 4, y - h * 0.1, 8, h * 0.6); c.beginPath(); c.moveTo(x - 4, y - h * 0.08); c.quadraticCurveTo(x - 20, y, x - 14, y + h * 0.42); c.lineTo(x - 8, y + h * 0.42); c.quadraticCurveTo(x - 12, y + h * 0.05, x - 4, y + h * 0.02); c.fill(); c.beginPath(); c.moveTo(x + 4, y - h * 0.08); c.quadraticCurveTo(x + 20, y, x + 14, y + h * 0.42); c.lineTo(x + 8, y + h * 0.42); c.quadraticCurveTo(x + 12, y + h * 0.05, x + 4, y + h * 0.02); c.fill(); c.fillStyle = dull(F.ink); };
    if (a.panels === 'amulets') for (let row = 0; row < 2; row++) for (let i = 0; i < 11; i++) { const x = 52 + i * 41, y = 78 + row * 100; if ((i + row) % 2) djed(x, y, 76); else knot(x, y, 76); }
    if (a.panels === 'niches') for (let i = 0; i < 12; i++) { const x = 40 + i * 37; c.fillStyle = dull(i % 2 ? F.ink : F.alt); c.fillRect(x, 40, 22, 180); c.fillStyle = dull(F.ground); c.fillRect(x + 6, 60, 10, 150); c.fillStyle = dull(F.ink); c.fillRect(x - 3, 34, 28, 8); }
    if (a.panels === 'text') for (let i = 0; i < 13; i++) { const x = 44 + i * 35; c.fillRect(x + 16, 30, 2.5, 196); for (let y = 46; y < 220; y += 25) { const k = random(); c.fillStyle = dull(k < 0.3 ? F.alt : F.ink); if (k < 0.25) { c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); } else if (k < 0.5) c.fillRect(x - 9, y - 3, 18, 7); else if (k < 0.75) { c.beginPath(); c.ellipse(x, y, 10, 5, -0.4, 0, 7); c.fill(); c.fillRect(x + 3, y - 10, 4, 9); } else { c.fillRect(x - 2, y - 10, 5, 20); c.fillRect(x - 8, y - 10, 16, 4); } } c.fillStyle = dull(F.ink); }
    if (a.panels === 'wings') {
      for (const side of [-1, 1]) for (let f = 0; f < 14; f++) { c.save(); c.translate(256 + side * 20, 128); c.rotate(side * mix(-0.42, 0.34, f / 13)); c.fillStyle = dull(f % 2 ? F.ink : F.alt); c.beginPath(); c.ellipse(side * 110, 0, 108, 9, 0, 0, 7); c.fill(); c.restore(); }
      c.fillStyle = dull('#c0392b'); c.beginPath(); c.arc(256, 124, 30, 0, 7); c.fill(); c.strokeStyle = dull(F.ink); c.lineWidth = 5; c.stroke();
    }
    for (let i = 0; i < dullness * 40; i++) { c.fillStyle = random() < 0.5 ? 'rgba(210,198,170,0.75)' : 'rgba(80,58,36,0.6)'; c.beginPath(); c.ellipse(random() * 512, random() * 256, 5 + random() * 24, 4 + random() * 12, random() * 3, 0, 7); c.fill(); }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    const panel = new THREE.MeshStandardMaterial({ map, metalness: F.metal * (1 - dullness), roughness: 0.4 + dullness * 0.4 });
    const shell = s.material(dull(F.ground), { metalness: F.metal * (1 - dullness), roughness: 0.4 + dullness * 0.4 });
    const accent = s.material(dull(F.ink), { metalness: a.finish === 'black' ? 0.6 : 0.2, roughness: 0.45 });
    const gold = s.material(dull('#e0b040'), { metalness: 0.65, roughness: 0.32 });
    const timber = s.material('#7a5632', { roughness: 0.8 });

    // ---- chest on its sledge ----
    const W = 0.56, L = 1.08, CH = 0.6, BASE = 0.1;
    put(rig, taper(W, CH, L, 0.86), [panel, panel, shell, shell, panel, panel] as unknown as THREE.Material, [0, BASE + CH / 2, 0]);
    put(rig, new THREE.BoxGeometry(W * 0.88, 0.03, L * 0.875), accent, [0, BASE + CH + 0.012, 0]);
    const cornice = put(rig, taper(W * 0.86, 0.085, L * 0.865, 1.16), shell, [0, BASE + CH + 0.068, 0]);
    cornice.castShadow = true;
    for (const side of [-1, 1]) {
      put(rig, new THREE.BoxGeometry(0.055, 0.06, L + 0.34), shell, [side * (W / 2 - 0.05), 0.03, 0]);
      limb(rig, shell, [side * (W / 2 - 0.05), 0.03, L / 2 + 0.16], [side * (W / 2 - 0.05), 0.13, L / 2 + 0.27], 0.028, 0.02);
      put(rig, new THREE.BoxGeometry(W, 0.04, 0.06), shell, [0, 0.08, side * L * 0.36]);
    }
    const snapped = a.story === 'abandoned';
    if (a.poles || a.story === 'procession') for (const side of [-1, 1]) {
      const broke = snapped && side > 0;
      const len = broke ? 1.5 : 2.7, zc = broke ? -0.6 : 0;
      const pole = put(rig, new THREE.CylinderGeometry(0.024, 0.024, len, 12), timber, [side * (W / 2 + 0.035), 0.085, zc]); pole.rotation.x = Math.PI / 2;
      for (const end of broke ? [-1] : [-1, 1]) { const tip = put(rig, new THREE.CylinderGeometry(0.027, 0.027, 0.09, 12), gold, [side * (W / 2 + 0.035), 0.085, zc + end * (len / 2 - 0.04)]); tip.rotation.x = Math.PI / 2; }
      if (broke) { const stub = put(rig, new THREE.CylinderGeometry(0.024, 0.024, 1.0, 12), timber, [side * (W / 2 + 0.3), 0.024, 0.95]); stub.rotation.set(Math.PI / 2, 0, 0.5); }
      for (const z of [-0.36, 0.36]) put(rig, new THREE.TorusGeometry(0.034, 0.008, 6, 14), gold, [side * (W / 2 + 0.035), 0.085, z * L]);
    }

    // ---- lid and jackal ----
    const TOP = BASE + CH + 0.11;
    cap.position.y = TOP;
    put(cap, new THREE.BoxGeometry(W * 0.92, 0.045, L * 1.04), shell, [0, 0.022, 0]);
    put(cap, new THREE.BoxGeometry(W * 0.93, 0.012, L * 1.045), accent, [0, 0.008, 0]);
    dog.position.y = 0.045;
    const coatColour = { black: '#191716', gold: '#dcae3c', flaked: '#2a2522', stone: '#4b5a52' }[a.coat];
    let coat: THREE.MeshStandardMaterial = s.material(coatColour, { roughness: a.coat === 'flaked' ? 0.85 : 0.3, metalness: a.coat === 'gold' ? 0.6 : 0.05 });
    if (a.coat === 'flaked') {
      const fc = document.createElement('canvas'); fc.width = fc.height = 128; const f = fc.getContext('2d')!;
      f.fillStyle = '#231f1d'; f.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 12; i++) { f.fillStyle = random() < 0.6 ? '#b9ad94' : '#6f563c'; f.beginPath(); f.ellipse(random() * 128, random() * 128, 2 + random() * 7, 2 + random() * 4, random() * 3, 0, 7); f.fill(); }
      const fm = new THREE.CanvasTexture(fc); fm.colorSpace = THREE.SRGBColorSpace;
      coat = new THREE.MeshStandardMaterial({ map: fm, roughness: 0.9 });
    }
    const trimMetal = a.coat === 'gold' ? s.material('#2a2622', { roughness: 0.4 }) : gold;
    ball(dog, coat, [0, 0.19, 0.2], [0.105, 0.145, 0.21]);
    ball(dog, coat, [0, 0.155, -0.08], [0.086, 0.105, 0.3]);
    ball(dog, coat, [0, 0.155, -0.34], [0.105, 0.125, 0.17]);
    for (const side of [-1, 1]) {
      ball(dog, coat, [side * 0.08, 0.135, -0.3], [0.075, 0.135, 0.17]);
      const foot = put(dog, new THREE.CapsuleGeometry(0.032, 0.24, 4, 10), coat, [side * 0.135, 0.034, -0.2]); foot.rotation.x = Math.PI / 2;
      ball(dog, coat, [side * 0.088, 0.1, 0.25], [0.055, 0.085, 0.08]);
      const fore = put(dog, new THREE.CapsuleGeometry(0.035, 0.4, 4, 10), coat, [side * 0.078, 0.038, 0.47]); fore.rotation.x = Math.PI / 2;
      ball(dog, coat, [side * 0.078, 0.034, 0.7], [0.04, 0.032, 0.05]);
      for (let k = -1; k <= 1; k++) ball(dog, a.coat === 'black' ? s.material('#c9cdd0', { metalness: 0.7, roughness: 0.3 }) : coat, [side * 0.078 + k * 0.022, 0.022, 0.745], [0.009, 0.009, 0.014]);
    }
    const tall = a.head === 'high' ? 0.07 : 0;
    limb(dog, coat, [0, 0.25, 0.3], [0, 0.5 + tall, 0.4], 0.085, 0.05);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.15, -0.46), new THREE.Vector3(0, 0.1, -0.575), new THREE.Vector3(0, -0.12, -0.6), new THREE.Vector3(0, -0.42, -0.585)]), 20, 0.036, 10), coat);
    tail.castShadow = true; dog.add(tail);
    ball(dog, coat, [0, -0.44, -0.585], [0.036, 0.05, 0.036]);

    head.position.set(0, 0.535 + tall, 0.41);
    ball(head, coat, [0, 0, 0], [0.06, 0.064, 0.082]);
    const snout = put(head, new THREE.ConeGeometry(0.044, 0.22, 12), coat, [0, -0.014, 0.15]); snout.rotation.x = Math.PI / 2; snout.scale.z = 0.82;
    ball(head, s.material('#0d0c0c', { roughness: 0.3 }), [0, -0.012, 0.258], [0.015, 0.013, 0.013]);
    for (const side of [-1, 1]) {
      const ear = put(head, new THREE.ConeGeometry(0.038, 0.215, 8), coat, [side * 0.04, 0.15, -0.03]); ear.scale.z = 0.5; ear.rotation.set(-0.08, 0, -side * 0.14);
      const inner = put(head, new THREE.ConeGeometry(0.022, 0.16, 6), trimMetal, [side * 0.041, 0.138, -0.016]); inner.scale.z = 0.4; inner.rotation.copy(ear.rotation);
      ball(head, trimMetal, [side * 0.047, 0.018, 0.045], [0.008, 0.012, 0.02]);
      const brow = put(head, new THREE.BoxGeometry(0.006, 0.006, 0.06), trimMetal, [side * 0.05, 0.036, 0.03]); brow.rotation.y = side * 0.25;
    }
    if (a.head === 'high') head.rotation.x = -0.22;
    if (a.head === 'turned') head.rotation.y = -(0.75 + random() * 0.25);
    dog.add(head);

    const cloth = s.material('#ebe4d0', { roughness: 0.95 });
    if (a.story === 'shrouded') { ball(dog, cloth, [0, 0.17, -0.02], [0.135, 0.165, 0.5]); ball(dog, cloth, [0, 0.08, 0.5], [0.13, 0.085, 0.27]); put(dog, new THREE.TorusGeometry(0.075, 0.018, 6, 18), cloth, [0, 0.36, 0.345]).rotation.x = 1.2; }
    else if (a.shawl !== 'none') {
      const fabric = a.shawl === 'scarf' ? s.material('#b3312a', { roughness: 0.9 }) : a.shawl === 'garland' ? s.material('#5f7a3a', { roughness: 0.9 }) : cloth;
      const band = put(dog, new THREE.TorusGeometry(0.082, a.shawl === 'garland' ? 0.02 : 0.03, 8, 22), fabric, [0, 0.32, 0.325]); band.rotation.x = 1.18; band.scale.z = 1.3;
      if (a.shawl === 'garland') for (let i = 0; i < 20; i++) { const an = i / 20 * Math.PI * 2; const bead = ball(dog, s.material(['#4d79c0', '#e9e2cc', '#b83a2c'][i % 3]), [Math.cos(an) * 0.086, 0.32 + Math.sin(an) * 0.086 * 0.4 + 0.012, 0.325 + Math.sin(an) * 0.08], [0.017, 0.012, 0.017]); bead.rotation.y = an; }
      else {
        ball(dog, fabric, [0, 0.27, 0.41], [0.04, 0.034, 0.03]);
        for (const side of [-1, 1]) { const end = put(dog, new THREE.BoxGeometry(0.055, a.shawl === 'scarf' ? 0.3 : 0.2, 0.012), fabric, [side * 0.04, a.shawl === 'scarf' ? 0.13 : 0.17, 0.425 + (a.shawl === 'scarf' ? 0.012 : 0)]); end.rotation.set(-0.12, 0, side * 0.2); }
        if (a.shawl === 'scarf') { const ribbon = put(dog, new THREE.TorusGeometry(0.07, 0.008, 6, 20), gold, [0, 0.36, 0.345]); ribbon.rotation.x = 1.2; }
      }
    } else { const line = put(dog, new THREE.TorusGeometry(0.066, 0.008, 6, 20), trimMetal, [0, 0.36, 0.345]); line.rotation.x = 1.2; }
    cap.add(dog); rig.add(cap);

    if (a.story === 'rifled') { cap.position.x = 0.13 + random() * 0.06; cap.position.z = -0.06; cap.rotation.y = 0.16 + random() * 0.1; cap.rotation.z = -0.045; cap.position.y += 0.012; put(rig, new THREE.BoxGeometry(W * 0.7, 0.01, L * 0.8), s.material('#120e0b'), [0, TOP - 0.004, 0]); }
    let lift = 0;
    if (a.story === 'procession') {
      lift = 0.5;
      for (const z of [-1, 1]) {
        put(rig, new THREE.BoxGeometry(W + 0.5, 0.05, 0.07), timber, [0, -0.025, z * 0.95]);
        for (const side of [-1, 1]) for (const lean of [-1, 1]) limb(rig, timber, [side * (W / 2 + 0.16), -0.03, z * 0.95], [side * (W / 2 + 0.16) + lean * 0.02, -lift, z * 0.95 + lean * 0.14], 0.02);
      }
      const wreath = s.material('#657c3c', { roughness: 0.9 });
      for (const side of [-1, 1]) { const swag = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(side * W * 0.43, BASE + CH, -L * 0.4), new THREE.Vector3(side * W * 0.48, BASE + CH - 0.17, 0), new THREE.Vector3(side * W * 0.43, BASE + CH, L * 0.4)]), 16, 0.02, 6), wreath); swag.castShadow = true; rig.add(swag); for (let i = 0; i < 7; i++) { const t = (i + 0.5) / 7, z = mix(-L * 0.4, L * 0.4, t); ball(rig, s.material(i % 2 ? '#4d79c0' : '#e9e2cc'), [side * (W * 0.455 + 0.02), BASE + CH - 0.17 * Math.sin(t * Math.PI) * 0.95 - 0.01, z], [0.02, 0.02, 0.02]); } }
    }
    rig.position.y = lift;
    rig.rotation.y = 1.0 + (random() - 0.5) * 0.25;
    s.root.add(rig);

    // ---- things on the floor around it (world frame, toward the viewer) ----
    const fwd = new THREE.Vector3(Math.sin(rig.rotation.y), 0, Math.cos(rig.rotation.y));
    const flames: THREE.MeshStandardMaterial[] = [];
    if (a.torch) {
      const at = fwd.clone().multiplyScalar(L / 2 + 0.55);
      s.box([0.2, 0.05, 0.11], [at.x, 0.025, at.z], s.material('#9a7d5c', { roughness: 0.95 })).rotation.y = rig.rotation.y + 0.3;
      s.cylinder(0.014, 0.01, 0.2, [at.x, 0.15, at.z], s.material('#b89a56'), 8);
      const flame = new THREE.MeshStandardMaterial({ color: '#ffb23c', emissive: '#ff8a1c', emissiveIntensity: mix(0.6, 2.2, mood.warmth), roughness: 1 });
      flames.push(flame);
      const fl = s.mesh(new THREE.ConeGeometry(0.022, 0.085, 8), flame, [at.x, 0.29, at.z]); fl.castShadow = false;
      s.ball([0.02, 0.022, 0.02], [at.x, 0.255, at.z], flame, 10).castShadow = false;
    }
    if (a.story === 'rifled') {
      const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
      const loot = Array.from({ length: 22 + Math.floor(mood.density * 30) }, () => { const p = side.clone().multiplyScalar(-(W / 2 + 0.12 + random() * 0.45)).add(fwd.clone().multiplyScalar((random() - 0.5) * 1.1)); return { at: [p.x, 0.012, p.z] as P3, size: 0.012 + random() * 0.016, color: ['#e0b040', '#e0b040', '#2f6fc0', '#2f9c8c', '#b83a2c'][Math.floor(random() * 5)] }; });
      s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ metalness: 0.5, roughness: 0.35 }), loot);
      for (let i = 0; i < 3; i++) { const p = side.clone().multiplyScalar(-(W / 2 + 0.2 + random() * 0.3)).add(fwd.clone().multiplyScalar((random() - 0.5) * 0.9)); const ring = s.ring(0.04 + random() * 0.03, 0.007, [p.x, 0.008, p.z], gold); ring.rotation.x = Math.PI / 2; }
      const p = side.clone().multiplyScalar(-(W / 2 + 0.22)).add(fwd.clone().multiplyScalar(0.25));
      s.ball([0.12, 0.035, 0.09], [p.x, 0.03, p.z], cloth).rotation.y = random() * 3;
    }
    if (a.story === 'abandoned') {
      const sand = s.material('#d2bd92', { roughness: 1 });
      for (let i = 0; i < 4; i++) { const an = rig.rotation.y + Math.PI * (0.6 + i * 0.28) + random() * 0.2; s.ball([0.3 + random() * 0.15, 0.05 + random() * 0.05, 0.16 + random() * 0.1], [Math.sin(an) * 0.42, 0, Math.cos(an) * 0.42], sand).rotation.y = an; }
    }
    const speed = mix(4, 16, mood.energy);
    return s.finish({ update: flames.length ? (_dt, time) => { for (const flame of flames) flame.emissiveIntensity = mix(0.6, 2.2, mood.warmth) * (0.8 + 0.2 * Math.sin(time * speed) * Math.sin(time * speed * 0.37)); } : undefined });
  },
});
