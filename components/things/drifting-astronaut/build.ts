import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    suit: choice('What era of suit is it?', {
      silver: 'A 1960s silver pressure suit: slim, shiny, a small round helmet and a chest box with hoses.',
      eva: 'A bulky white spacewalk suit with a huge backpack and a gold visor.',
      salvage: 'A patched salvage suit of mismatched panels, tape and faded orange, kept alive by hand.',
      orange: 'A bright orange launch suit, slim and high-visibility, never meant to be out here.',
    }),
    pose: choice('How is the figure held?', {
      peace: 'At peace: limbs loose and slightly spread, like floating on a lake.',
      reaching: 'Reaching: one arm stretched hard toward something leaving.',
      curled: 'Curled up, knees drawn in and arms around them.',
      waving: 'Waving: one arm raised high, a hello or a goodbye.',
    }),
    visor: choice('What is reflected in the visor?', {
      earth: 'A small blue-and-white planet, home, far away.',
      stars: 'Nothing but a few cold stars.',
      galaxy: 'A pale spiral galaxy.',
      ship: 'A ship with lit windows, getting smaller.',
      face: 'No reflection: a dim face can be seen inside, eyes closed.',
      blank: 'A blank gold mirror that gives nothing back.',
    }),
    tether: choice('What about the tether?', {
      cut: 'Cut: a short length ending in frayed strands.',
      loose: 'Long and intact, coiling away, its clip attached to nothing.',
      wrapped: 'Tangled once around the body and a leg.',
      none: 'No tether at all, only an empty ring at the hip.',
    }),
    stripe: choice('What markings does the suit carry?', {
      red: 'Red commander stripes on the arms and legs.',
      blue: 'Blue stripes and a blue pack panel.',
      hazard: 'Yellow and black hazard bands.',
      plain: 'No markings at all.',
    }),
    beside: choice('What drifts beside them?', {
      nothing: 'Nothing.',
      wrench: 'A dropped wrench, slowly spinning.',
      photo: 'A small photograph, just out of reach.',
      flag: 'A little flag on a short pole.',
    }),
    lamps: noul('Are the helmet lamps still lit?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const body = new THREE.Group();
    const fig = new THREE.Group();
    fig.position.y = -0.3;
    body.add(fig);
    s.root.add(body);

    const bulk = { silver: 0.8, eva: 1.08, salvage: 1, orange: 0.84 }[a.suit];
    const cloth = { silver: '#c3c8ce', eva: '#ecebe4', salvage: '#b3aa90', orange: '#e2702a' }[a.suit];
    const fabric = s.material(cloth, a.suit === 'silver' ? { metalness: 0.75, roughness: 0.34 } : { roughness: 0.8 });
    const trim = s.material({ silver: '#5c6470', eva: '#b9bcc0', salvage: '#6d6a52', orange: '#2c3038' }[a.suit], { roughness: 0.6 });
    const dark = s.material('#23272d', { roughness: 0.55 });
    const metal = s.material('#aeb4ba', { metalness: 0.85, roughness: 0.3 });
    const stripeColour = { red: '#c8322b', blue: '#2f5fae', hazard: '#e6b21c', plain: cloth }[a.stripe];
    const stripe = s.material(stripeColour, { roughness: 0.7 });
    const patches = ['#c8642d', '#6f7d4f', '#8d8f94', '#d9d2bd', '#3f556e'].map((c) => s.material(c, { roughness: 0.9 }));

    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.scale.set(...scale);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Torso, hips and neck ring.
    add(fig, new THREE.CapsuleGeometry(0.2, 0.26, 8, 20), fabric, [0, 0.38, 0], [1.42 * bulk, 1, 1.02 * bulk]);
    add(fig, new THREE.SphereGeometry(0.22, 20, 14), fabric, [0, 0.03, 0], [1.2 * bulk, 0.8, 0.95 * bulk]);
    add(fig, new THREE.TorusGeometry(0.2 * bulk, 0.03, 8, 28), trim, [0, 0.14, 0], [1.25, 0.95, 1]).rotation.x = Math.PI / 2;
    add(fig, new THREE.TorusGeometry(0.15, 0.028, 8, 28), metal, [0, 0.68, 0.01]).rotation.x = Math.PI / 2;

    // Helmet.
    const head = new THREE.Group();
    head.position.set(0, 0.7, 0.01);
    fig.add(head);
    const helmetR = a.suit === 'silver' || a.suit === 'orange' ? 0.175 : 0.2;
    add(head, new THREE.SphereGeometry(helmetR, 28, 20), a.suit === 'silver' ? s.material('#e9ecef', { roughness: 0.35 }) : fabric, [0, helmetR * 0.85, 0]);
    const glass = document.createElement('canvas');
    glass.width = glass.height = 256;
    const g = glass.getContext('2d')!;
    const gold = a.suit === 'eva' || a.visor === 'blank';
    const sky = g.createLinearGradient(0, 0, 0, 256);
    if (a.visor === 'blank') { sky.addColorStop(0, '#f6d77a'); sky.addColorStop(0.5, '#c9912c'); sky.addColorStop(1, '#6b4612'); }
    else if (gold) { sky.addColorStop(0, '#5a431b'); sky.addColorStop(1, '#1b1408'); }
    else { sky.addColorStop(0, '#1d2a44'); sky.addColorStop(1, '#070b14'); }
    g.fillStyle = sky;
    g.fillRect(0, 0, 256, 256);
    const dot = (x: number, y: number, r: number, colour: string) => { g.fillStyle = colour; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    if (a.visor !== 'blank' && a.visor !== 'face') for (let i = 0; i < (a.visor === 'stars' ? 46 : 14); i++) dot(random() * 256, random() * 256, 0.8 + random() * 2.2, i % 4 ? '#eef3ff' : '#ffe2a8');
    if (a.visor === 'earth') {
      const ex = 150, ey = 118, er = 46;
      dot(ex, ey, er + 5, 'rgba(120,180,255,0.35)');
      dot(ex, ey, er, '#2f7fd6');
      g.save(); g.beginPath(); g.arc(ex, ey, er, 0, Math.PI * 2); g.clip();
      for (let i = 0; i < 5; i++) dot(ex - 30 + random() * 60, ey - 30 + random() * 60, 9 + random() * 13, '#4f9c5a');
      g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.lineCap = 'round';
      for (let i = 0; i < 6; i++) { g.beginPath(); const y = ey - 36 + i * 14 + random() * 6; g.moveTo(ex - 50, y); g.quadraticCurveTo(ex, y + (random() - 0.5) * 30, ex + 50, y + (random() - 0.5) * 16); g.stroke(); }
      dot(ex + 30, ey + 28, er * 1.1, 'rgba(4,8,20,0.55)');
      g.restore();
    }
    if (a.visor === 'galaxy') {
      g.save(); g.translate(138, 122); g.rotate(-0.5); g.scale(1, 0.5);
      for (let i = 0; i < 520; i++) { const r = 4 + random() ** 0.8 * 66, t = (i % 2) * Math.PI + r * 0.075 + (random() - 0.5) * 0.7; dot(Math.cos(t) * r, Math.sin(t) * r, 1 + random() * 1.8, i % 3 ? '#cfe0ff' : '#ffe9c4'); }
      dot(0, 0, 11, '#fff6de');
      g.restore();
    }
    if (a.visor === 'ship') {
      g.save(); g.translate(150, 112); g.rotate(-0.25);
      g.fillStyle = '#d7dce2'; g.fillRect(-42, -9, 70, 18); g.fillRect(-12, -24, 10, 48);
      g.fillStyle = '#8f98a3'; g.beginPath(); g.moveTo(28, -9); g.lineTo(48, 0); g.lineTo(28, 9); g.fill();
      g.fillStyle = '#4a86c5'; g.fillRect(-30, -38, 46, 12); g.fillRect(-30, 26, 46, 12);
      for (let i = 0; i < 6; i++) { g.fillStyle = '#ffd77a'; g.fillRect(-36 + i * 10, -3, 5, 5); }
      g.fillStyle = '#ffb060'; g.fillRect(-52, -5, 10, 10);
      g.restore();
    }
    if (a.visor === 'face') {
      g.fillStyle = '#0b0d12'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#b69478'; g.beginPath(); g.ellipse(128, 132, 56, 72, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e9e6dc'; g.beginPath(); g.ellipse(128, 86, 62, 44, 0, Math.PI, 0); g.fill();
      g.strokeStyle = '#3b2a22'; g.lineWidth = 5; g.lineCap = 'round';
      for (const x of [104, 152]) { g.beginPath(); g.arc(x, 128, 11, 0.15, Math.PI - 0.15); g.stroke(); }
      g.beginPath(); g.moveTo(114, 172); g.lineTo(142, 172); g.stroke();
      g.fillStyle = 'rgba(8,12,22,0.45)'; g.fillRect(0, 0, 256, 256);
    }
    // A hard glint so the visor reads as glass.
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.arc(128, 128, 104, Math.PI * 1.08, Math.PI * 1.32); g.stroke();
    const reflection = new THREE.CanvasTexture(glass);
    reflection.colorSpace = THREE.SRGBColorSpace;
    const visorR = helmetR * 0.93;
    add(head, new THREE.SphereGeometry(visorR, 32, 20, Math.PI / 2 - 1.05, 2.1, Math.PI / 2 - 0.72, 1.36),
      new THREE.MeshStandardMaterial({ map: reflection, emissiveMap: reflection, emissive: '#ffffff', emissiveIntensity: 0.75, roughness: 0.18, metalness: 0.25 }),
      [0, helmetR * 0.85, helmetR * 0.16]);
    add(head, new THREE.TorusGeometry(visorR * 0.86, 0.016, 6, 28), trim, [0, helmetR * 0.85, helmetR * 0.16 + visorR * 0.52], [1.14, 0.88, 1]);
    const lampGlow = new THREE.MeshStandardMaterial({ color: '#fff3c9', emissive: '#ffe9a6', emissiveIntensity: a.lamps ? mix(1.2, 3, mood.cheer) : 0, roughness: 0.4 });
    for (const side of [-1, 1]) {
      add(head, new THREE.BoxGeometry(0.06, 0.07, 0.09), trim, [side * helmetR * 1.02, helmetR * 1.05, 0.03]);
      add(head, new THREE.CylinderGeometry(0.026, 0.026, 0.02, 12), a.lamps ? lampGlow : dark, [side * helmetR * 1.02, helmetR * 1.05, 0.085]).rotation.x = Math.PI / 2;
    }
    if (a.suit === 'silver') add(head, new THREE.CylinderGeometry(0.006, 0.006, 0.2, 6), metal, [-0.12, helmetR * 1.8, -0.04]);

    // Life support.
    if (a.suit === 'eva' || a.suit === 'salvage') {
      add(fig, new THREE.BoxGeometry(0.52, 0.72, 0.24), a.suit === 'eva' ? fabric : trim, [0, 0.47, -0.3]);
      add(fig, new THREE.BoxGeometry(0.4, 0.1, 0.2), a.stripe === 'blue' ? stripe : trim, [0, 0.78, -0.3]);
      for (const side of [-1, 1]) add(fig, new THREE.CylinderGeometry(0.05, 0.05, 0.5, 12), a.suit === 'salvage' ? patches[side > 0 ? 0 : 4] : metal, [side * 0.3, 0.4, -0.3]);
    } else {
      add(fig, new THREE.BoxGeometry(0.3, 0.34, 0.12), trim, [0, 0.42, -0.24]);
    }
    add(fig, new THREE.BoxGeometry(0.3, 0.2, 0.11), a.suit === 'silver' ? metal : trim, [0, 0.36, 0.22 * bulk + 0.02]);
    ['#c8322b', '#e6b21c', '#3f8f5a', '#2f5fae'].forEach((c, i) => add(fig, new THREE.CylinderGeometry(0.017, 0.017, 0.03, 10), s.material(c), [-0.09 + i * 0.06, 0.4, 0.22 * bulk + 0.085]).rotation.x = Math.PI / 2);
    add(fig, new THREE.BoxGeometry(0.2, 0.05, 0.02), dark, [0, 0.31, 0.22 * bulk + 0.08]);
    if (a.suit === 'silver' || a.suit === 'orange') for (const side of [-1, 1]) {
      const hose = new THREE.CatmullRomCurve3([[side * 0.1, 0.3, 0.3], [side * 0.22, 0.2, 0.3], [side * 0.3, 0.3, 0.12], [side * 0.22, 0.42, -0.2]].map((p) => new THREE.Vector3(...p)));
      add(fig, new THREE.TubeGeometry(hose, 20, 0.022, 6), side > 0 ? s.material('#3b6ea8') : s.material('#b03a30'));
    }
    if (a.stripe !== 'plain') add(fig, new THREE.BoxGeometry(0.11, 0.07, 0.01), stripe, [0.14, 0.52, 0.2 * bulk + 0.005]);

    // Limbs: a shoulder or hip joint, then an elbow or knee.
    const limb = (at: V3, turn: V3, bend: V3, upper: number, lower: number, radius: number, isArm: boolean) => {
      const joint = new THREE.Group();
      joint.position.set(...at);
      joint.rotation.set(...turn);
      fig.add(joint);
      add(joint, new THREE.SphereGeometry(radius * 1.22, 14, 10), fabric);
      add(joint, new THREE.CapsuleGeometry(radius, upper, 6, 14), fabric, [0, -upper / 2, 0]);
      if (a.stripe !== 'plain') {
        add(joint, new THREE.CylinderGeometry(radius * 1.05, radius * 1.05, 0.05, 16), stripe, [0, -upper * 0.5, 0]);
        if (a.stripe === 'hazard') add(joint, new THREE.CylinderGeometry(radius * 1.06, radius * 1.06, 0.022, 16), dark, [0, -upper * 0.5, 0]);
      }
      const hinge = new THREE.Group();
      hinge.position.y = -upper;
      hinge.rotation.set(...bend);
      joint.add(hinge);
      add(hinge, new THREE.SphereGeometry(radius * 1.1, 14, 10), trim);
      add(hinge, new THREE.CapsuleGeometry(radius * 0.94, lower, 6, 14), fabric, [0, -lower / 2, 0]);
      add(hinge, new THREE.TorusGeometry(radius * 0.98, 0.018, 6, 18), metal, [0, -lower, 0]).rotation.x = Math.PI / 2;
      if (isArm) {
        add(hinge, new THREE.SphereGeometry(radius * 1.05, 14, 10), trim, [0, -lower - radius * 0.95, 0], [1, 1.25, 0.8]);
        add(hinge, new THREE.CapsuleGeometry(radius * 0.3, radius * 0.5, 4, 8), trim, [0, -lower - radius * 0.7, radius * 0.95]).rotation.x = 0.7;
      } else {
        add(hinge, new THREE.BoxGeometry(radius * 2.1, 0.14, 0.3), trim, [0, -lower - 0.1, 0.06]);
        add(hinge, new THREE.BoxGeometry(radius * 2.2, 0.035, 0.32), dark, [0, -lower - 0.18, 0.06]);
      }
      if (a.suit === 'salvage' || mood.wear > 0.55) {
        const count = a.suit === 'salvage' ? 2 : 1;
        for (let i = 0; i < count; i++) add(joint, new THREE.CylinderGeometry(radius * 1.04, radius * 1.04, 0.06 + random() * 0.08, 14, 1, true, random() * 6, 1.6 + random() * 2), patches[Math.floor(random() * patches.length)], [0, -upper * (0.2 + random() * 0.6), 0]);
      }
      return hinge;
    };
    const j = () => (random() - 0.5) * 0.24;
    const ar = 0.078 * bulk, lr = 0.098 * bulk, sx = 0.31 * bulk + 0.03, hx = 0.14 * bulk;
    // [shoulder turn, elbow bend] for right then left; [hip turn, knee bend] likewise.
    const poses: Record<typeof a.pose, { arms: [V3, V3][]; legs: [V3, V3][]; nod: number }> = {
      peace: { arms: [[[-0.35 + j(), 0, 1.0 + j()], [-0.5 + j(), 0, 0]], [[-0.3 + j(), 0, -0.95 + j()], [-0.45 + j(), 0, 0]]], legs: [[[-0.2 + j(), 0, 0.28], [0.45 + j(), 0, 0]], [[0.1 + j(), 0, -0.3], [0.6 + j(), 0, 0]]], nod: -0.1 },
      reaching: { arms: [[[-2.35 + j(), 0, 0.35], [-0.12, 0, 0]], [[0.5 + j(), 0, -0.6], [-0.5, 0, 0]]], legs: [[[0.45 + j(), 0, 0.12], [0.3, 0, 0]], [[0.15 + j(), 0, -0.2], [0.75 + j(), 0, 0]]], nod: -0.3 },
      curled: { arms: [[[-1.05 + j(), 0, 0.15], [-1.5, 0, -0.5]], [[-1.05 + j(), 0, -0.15], [-1.5, 0, 0.5]]], legs: [[[-1.75 + j() * 0.5, 0, 0.1], [2.05, 0, 0]], [[-1.7 + j() * 0.5, 0, -0.1], [2.0, 0, 0]]], nod: 0.5 },
      waving: { arms: [[[0, 0, 2.5 + j()], [0, 0, 0.75 + j()]], [[-0.2 + j(), 0, -0.5], [-0.6, 0, 0]]], legs: [[[-0.1 + j(), 0, 0.2], [0.35, 0, 0]], [[0.2 + j(), 0, -0.22], [0.55 + j(), 0, 0]]], nod: -0.05 },
    };
    const pose = poses[a.pose];
    head.rotation.x = pose.nod;
    head.rotation.y = j();
    pose.arms.forEach(([turn, bend], i) => limb([(i ? -1 : 1) * sx, 0.56, 0], turn, bend, 0.27, 0.25, ar, true));
    const knees = pose.legs.map(([turn, bend], i) => limb([(i ? -1 : 1) * hx, -0.06, 0], turn, bend, 0.38, 0.36, lr, false));

    // Wear: scuffs and, on the salvage suit, tape and panels.
    const scuff = s.material('#5d5a55', { roughness: 1 });
    for (let i = 0; i < Math.round(mood.wear * 9) + (a.suit === 'salvage' ? 5 : 0); i++) {
      const side = random() < 0.5 ? -1 : 1;
      add(fig, new THREE.BoxGeometry(0.06 + random() * 0.1, 0.05 + random() * 0.09, 0.012), a.suit === 'salvage' ? patches[i % patches.length] : scuff, [side * random() * 0.2 * bulk, 0.2 + random() * 0.38, 0.2 * bulk + 0.004]).rotation.z = j() * 3;
    }

    // Tether: anchored at the left hip ring.
    const hip: V3 = [-0.26 * bulk, 0.1, 0.02];
    add(fig, new THREE.TorusGeometry(0.035, 0.009, 6, 16), metal, hip).rotation.y = Math.PI / 2;
    const cable = s.material({ silver: '#d8d2c0', eva: '#e9c94f', salvage: '#c8642d', orange: '#d8d2c0' }[a.suit], { roughness: 0.7 });
    const run = (points: V3[], radius = 0.02) => add(fig, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), points.length * 10, radius, 6), cable);
    const fray = (end: V3, away: V3) => { for (let i = 0; i < 6; i++) { const tip: V3 = [end[0] + away[0] * 0.09 + j() * 0.4, end[1] + away[1] * 0.09 + j() * 0.4, end[2] + away[2] * 0.09 + j() * 0.4]; const strand = s.rod(end, tip, 0.006, cable); fig.add(strand); } };
    if (a.tether === 'cut') {
      const pts: V3[] = [hip, [-0.42, 0.0, -0.1], [-0.6, 0.12 + j(), -0.28], [-0.72, -0.08, -0.5 + j()], [-0.95, 0.02 + j(), -0.58]];
      run(pts);
      fray(pts[4], [-1, 0.3, -0.3]);
    } else if (a.tether === 'loose') {
      const pts: V3[] = [hip];
      const turns = 2.2 + random() * 0.8;
      for (let i = 1; i <= 22; i++) { const t = i / 22, ang = t * turns * Math.PI * 2 + 2.6, r = 0.2 + t * 0.34; pts.push([-0.4 - t * 0.55 + Math.cos(ang) * r * 0.5, -0.05 - t * 0.5 + Math.sin(ang) * r, -0.15 - t * 0.35 + Math.cos(ang + 1.3) * r * 0.6]); }
      run(pts);
      const end = pts[pts.length - 1];
      const clip = add(fig, new THREE.TorusGeometry(0.05, 0.012, 6, 18), metal, end, [0.7, 1.15, 1]);
      clip.rotation.set(random() * 3, random() * 3, 0);
      add(fig, new THREE.BoxGeometry(0.03, 0.06, 0.03), dark, [end[0], end[1] + 0.06, end[2]]);
    } else if (a.tether === 'wrapped') {
      const pts: V3[] = [hip];
      for (let i = 0; i <= 12; i++) { const t = i / 12, ang = t * Math.PI * 2.5 + 2.4; pts.push([Math.cos(ang) * 0.33 * bulk, 0.12 + t * 0.3, Math.sin(ang) * 0.28 * bulk - (a.suit === 'eva' || a.suit === 'salvage' ? 0.06 : 0)]); }
      pts.push([0.42, 0.5, 0.22], [0.62, 0.7 + j(), 0.3], [0.75, 0.6, 0.48]);
      run(pts);
      fray(pts[pts.length - 1], [1, 0.2, 0.5]);
      // A second loop caught round one shin.
      const shin = new THREE.Mesh(new THREE.TorusGeometry(lr * 1.12, 0.013, 6, 20), cable);
      shin.position.y = -0.16; shin.rotation.set(Math.PI / 2 + 0.3, 0.2, 0); shin.castShadow = true;
      knees[1].add(shin);
    }

    // Whatever got away.
    let stray: THREE.Object3D | null = null;
    if (a.beside !== 'nothing') {
      const item = new THREE.Group();
      if (a.beside === 'wrench') {
        add(item, new THREE.BoxGeometry(0.035, 0.24, 0.014), metal);
        for (const end of [-1, 1]) { const jaw = add(item, new THREE.TorusGeometry(0.036, 0.014, 6, 14, Math.PI * 1.45), metal, [0, end * 0.145, 0]); jaw.rotation.z = end > 0 ? Math.PI * 0.78 : -Math.PI * 0.22; }
      } else if (a.beside === 'photo') {
        const snap = document.createElement('canvas'); snap.width = 128; snap.height = 150;
        const c = snap.getContext('2d')!;
        c.fillStyle = '#f3efe2'; c.fillRect(0, 0, 128, 150);
        c.fillStyle = '#7fa9c9'; c.fillRect(10, 10, 108, 104);
        c.fillStyle = '#5f8a57'; c.fillRect(10, 82, 108, 32);
        for (const [x, h, col] of [[46, 44, '#3b3340'], [70, 52, '#7a4a3a'], [92, 30, '#c9a25a']] as const) { c.fillStyle = col; c.fillRect(x - 9, 100 - h, 18, h); c.beginPath(); c.arc(x, 92 - h, 9, 0, Math.PI * 2); c.fill(); }
        const tex = new THREE.CanvasTexture(snap); tex.colorSpace = THREE.SRGBColorSpace;
        add(item, new THREE.BoxGeometry(0.2, 0.235, 0.006), [fabric, fabric, fabric, fabric, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), s.material('#e6e1d2')] as unknown as THREE.Material);
      } else {
        add(item, new THREE.CylinderGeometry(0.008, 0.008, 0.5, 8), metal);
        const flag = add(item, new THREE.PlaneGeometry(0.26, 0.17, 10, 1), new THREE.MeshStandardMaterial({ color: stripeColour === cloth ? '#c8322b' : stripeColour, side: THREE.DoubleSide, roughness: 0.8 }), [0.13, 0.16, 0]);
        const p = flag.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.018);
        flag.geometry.computeVertexNormals();
        add(item, new THREE.PlaneGeometry(0.26, 0.05), new THREE.MeshStandardMaterial({ color: '#f2efe6', side: THREE.DoubleSide }), [0.13, 0.16, 0.021]);
      }
      const reach = a.pose === 'reaching' ? new THREE.Vector3(0.42, 1.05, 0.7) : new THREE.Vector3(0.5, 0.45 + random() * 0.25, 0.5);
      item.position.copy(reach);
      item.rotation.set(random() * 2, random() * 2, random() * 2);
      body.add(item);
      stray = item;
    }

    // Set adrift: tipped over and turning.
    const lean = a.pose === 'curled' ? 0.9 : a.pose === 'waving' ? 0.18 : 0.42;
    body.rotation.set(-0.25 + j(), 0.35 + j() * 2, (random() < 0.5 ? -1 : 1) * (lean + random() * 0.3));
    const axis = new THREE.Vector3(j() * 2, 1, j() * 2).normalize();
    const rate = mix(0.04, 0.5, mood.energy);
    return s.finish({
      update: (dt) => {
        body.rotateOnWorldAxis(axis, dt * rate);
        if (stray) stray.rotation.z += dt * rate * 3;
      },
    });
  },
});
