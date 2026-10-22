import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const BLANKETS = {
  red: ['#b3261e', '#f0e2c0', '#1f2f55'],
  blue: ['#24509c', '#f0e2c0', '#e0a13a'],
  saffron: ['#e2a310', '#7a2a1a', '#f0e2c0'],
  green: ['#2f7a4a', '#f0e2c0', '#b3261e'],
  sacking: ['#a89068', '#8a7450', '#bfa87e'],
} as const;

export default defineThing({
  questions: {
    load: choice('What is the cart carrying?', {
      gas: 'Butane gas bottles, blue and red, standing in rows.',
      oranges: 'A loose mountain of oranges.',
      hides: 'A stack of stiff leather hides on their way from the tannery.',
      rubble: 'Building rubble, broken brick and cement sacks, with a shovel stuck in.',
      mint: 'Heaped green bundles of fresh mint.',
      empty: 'Nothing but a coil of rope and a folded sack: the day\'s work is done.',
    }),
    amount: score('How heavily is it loaded?', ['A token load', 'A fair load', 'Piled dangerously high and roped down']),
    stance: choice('What is the donkey doing?', {
      patient: 'Standing square and patient, head level.',
      dozing: 'Dozing on its feet, head hung low, ears flopped.',
      stubborn: 'Refusing: legs braced forward, leaning back, ears flat.',
      walking: 'Mid-stride, plodding on.',
      braying: 'Head thrown up, braying.',
    }),
    coat: choice('What colour is the donkey?', {
      grey: 'Dusty grey with a pale muzzle.',
      brown: 'Dark brown.',
      white: 'Off-white, almost cream.',
      black: 'Near black with a pale nose.',
    }),
    blanket: choice('What colour is the blanket on its back?', {
      red: 'Red with cream and navy stripes.',
      blue: 'Blue with cream and gold stripes.',
      saffron: 'Saffron yellow with dark stripes.',
      green: 'Green with cream and red stripes.',
      sacking: 'No colour, just a folded feed sack.',
    }),
    wheels: choice('What wheels does the cart run on?', {
      spoked: 'Big wooden spoked wheels with iron rims.',
      tyres: 'A salvaged car axle with fat rubber tyres.',
    }),
    hat: noul('Has the driver left his straw hat on the seat?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wood = s.material('#8a6238', { roughness: 0.9 });
    const darkWood = s.material('#5c3d22', { roughness: 0.9 });
    const iron = s.material('#3a3836', { metalness: 0.6, roughness: 0.6 });
    const bedY = 0.76, bedZ = -1.0;

    // Cart.
    s.box([1.1, 0.07, 1.6], [0, bedY, bedZ], wood);
    for (let i = 0; i < 6; i++) s.box([0.005, 0.072, 1.6], [-0.46 + i * 0.184, bedY, bedZ], darkWood);
    for (const x of [-1, 1]) {
      s.box([0.04, 0.24, 1.6], [x * 0.55, bedY + 0.14, bedZ], wood);
      for (const z of [-0.7, 0, 0.7]) s.box([0.06, 0.34, 0.06], [x * 0.57, bedY + 0.12, bedZ + z], darkWood);
      s.rod([x * 0.36, bedY - 0.04, bedZ + 0.8], [x * 0.38, 0.9, 1.4], 0.032, darkWood, 0.025);
      s.rod([x * 0.36, bedY - 0.06, bedZ - 0.8], [x * 0.36, bedY - 0.06, bedZ + 0.8], 0.04, darkWood);
    }
    s.box([1.1, 0.24, 0.04], [0, bedY + 0.14, bedZ - 0.8], wood);
    s.box([1.1, 0.3, 0.04], [0, bedY + 0.17, bedZ + 0.8], wood);
    s.box([1.0, 0.04, 0.26], [0, bedY + 0.33, bedZ + 0.68], darkWood);
    s.rod([0, bedY - 0.06, bedZ - 0.7], [0, 0, bedZ - 0.78], 0.025, darkWood);
    const axleY = a.wheels === 'spoked' ? 0.46 : 0.36;
    s.rod([-0.68, axleY, bedZ], [0.68, axleY, bedZ], 0.03, iron);
    for (const x of [-0.3, 0.3]) s.box([0.06, bedY - axleY, 0.1], [x, (bedY + axleY) / 2, bedZ], darkWood);
    for (const x of [-1, 1]) {
      const wheel = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { mesh.removeFromParent(); wheel.add(mesh); return mesh; };
      if (a.wheels === 'spoked') {
        add(s.ring(0.43, 0.03, [0, 0, 0], iron));
        add(s.ring(0.4, 0.035, [0, 0, 0], wood));
        for (let k = 0; k < 8; k++) add(s.rod([0, 0, 0], [Math.cos(k * Math.PI / 4) * 0.4, Math.sin(k * Math.PI / 4) * 0.4, 0], 0.022, wood));
        add(s.cylinder(0.07, 0.07, 0.14, [0, 0, 0], darkWood, 12)).rotation.x = Math.PI / 2;
      } else {
        add(s.mesh(new THREE.TorusGeometry(0.26, 0.1, 10, 24), s.material('#1e1e20', { roughness: 0.95 })));
        add(s.cylinder(0.18, 0.18, 0.08, [0, 0, 0], s.material('#b9bcbc', { metalness: 0.6 }), 16)).rotation.x = Math.PI / 2;
        add(s.cylinder(0.06, 0.06, 0.1, [0, 0, 0], iron, 10)).rotation.x = Math.PI / 2;
      }
      wheel.position.set(x * 0.68, axleY, bedZ);
      wheel.rotation.set(0, Math.PI / 2, random() * 6, 'YXZ');
      s.root.add(wheel);
    }

    // Load.
    const floor = bedY + 0.036, front = bedZ + 0.5, back = bedZ - 0.74;
    const amount = a.amount;
    let loadTop = floor;
    if (a.load === 'gas') {
      const paints = ['#2a5fb8', '#c8362a', '#e07a1e'].map((colour) => s.material(colour, { metalness: 0.3, roughness: 0.45 }));
      const rows = 1 + Math.round(amount * 3);
      const bottle = (x: number, y: number, z: number, lying: boolean) => {
        const group = new THREE.Group();
        const paint = paints[random() < 0.6 ? 0 : 1 + Math.floor(random() * 2)];
        const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: number) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.y = at; mesh.castShadow = true; group.add(mesh); };
        add(new THREE.CylinderGeometry(0.15, 0.15, 0.36, 14), paint, 0.2);
        add(new THREE.SphereGeometry(0.15, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), paint, 0.38);
        add(new THREE.CylinderGeometry(0.09, 0.09, 0.09, 12, 1, true), paint, 0.555);
        add(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8), iron, 0.54);
        add(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 14), iron, 0.015);
        group.position.set(x, y, z);
        if (lying) { group.rotation.set(0, (random() - 0.5) * 0.3, Math.PI / 2, 'YXZ'); group.position.x += 0.3; group.position.y += 0.15; }
        else group.rotation.z = (random() - 0.5) * 0.06;
        s.root.add(group);
      };
      for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) bottle((c - 1) * 0.33, floor, back + 0.17 + r * 0.32, false);
      loadTop = floor + 0.6;
      if (amount > 0.7) { for (let k = 0; k < 3; k++) bottle(0, floor + 0.6, back + 0.25 + k * 0.36, true); loadTop += 0.3; }
    } else if (a.load === 'oranges' || a.load === 'mint' || a.load === 'rubble') {
      const peak = mix(0.1, 0.62, amount);
      const points: { at: [number, number, number]; size: number; color: string }[] = [];
      const inks = { oranges: ['#f08a12', '#f6a21e', '#e87508'], mint: ['#3f9a3a', '#5cb84a', '#2f7d34'], rubble: ['#9a948a', '#b06a48', '#c9c2b4', '#7d776e'] }[a.load];
      const unit = { oranges: 0.045, mint: 0.085, rubble: 0.07 }[a.load];
      const count = Math.round(mix(120, 520, amount) * (a.load === 'oranges' ? 1 : 0.55));
      for (let i = 0; i < count; i++) {
        const u = random() * 2 - 1, v = random() * 2 - 1;
        const height = peak * Math.max(0, 1 - 0.75 * (u * u + v * v) / 2) * (0.25 + 0.75 * Math.sqrt(random()));
        points.push({ at: [u * 0.47, floor + unit * 0.6 + height, mix(back + 0.08, front - 0.05, (v + 1) / 2)], size: unit * (0.8 + random() * 0.5), color: inks[Math.floor(random() * inks.length)] });
      }
      const grain = a.load === 'oranges' ? new THREE.SphereGeometry(1, 8, 6) : a.load === 'mint' ? new THREE.SphereGeometry(1, 6, 4).scale(1.3, 0.55, 0.9) : new THREE.DodecahedronGeometry(1, 0);
      s.scatter(grain, s.material('#ffffff', { roughness: a.load === 'oranges' ? 0.5 : 0.95 }), points);
      loadTop = floor + peak + unit;
      if (a.load === 'rubble') {
        const sack = s.material('#b9b3a4', { roughness: 1 });
        for (let k = 0; k < 2; k++) s.ball([0.3, 0.1, 0.2], [(k - 0.5) * 0.4, floor + 0.12 + peak * 0.5, front - 0.3 - k * 0.1], sack, 12).rotation.y = random();
        s.rod([0.2, floor + peak * 0.5, back + 0.3], [0.38, floor + peak + 0.75, back + 0.05], 0.018, wood);
        s.box([0.2, 0.26, 0.015], [0.18, floor + peak * 0.5 - 0.05, back + 0.32], iron).rotation.x = 0.3;
      }
    } else if (a.load === 'hides') {
      const inks = ['#c9a06a', '#e8dcc0', '#e0b21e', '#9a5a34', '#b8742e'];
      const layers = Math.round(mix(4, 20, amount));
      for (let i = 0; i < layers; i++) {
        const hide = s.box([0.85 + random() * 0.25, 0.022, 1.05 + random() * 0.3], [(random() - 0.5) * 0.1, floor + 0.014 + i * 0.027, (front + back) / 2 + (random() - 0.5) * 0.12], s.material(inks[Math.floor(random() * inks.length)], { roughness: 0.9 }));
        hide.rotation.set((random() - 0.5) * 0.05, (random() - 0.5) * 0.3, (random() - 0.5) * 0.05);
      }
      loadTop = floor + layers * 0.027 + 0.02;
      for (const x of [-1, 1]) s.box([0.02, 0.4, 0.7 + random() * 0.3], [x * 0.59, bedY + 0.1, (front + back) / 2 + (random() - 0.5) * 0.3], s.material(inks[Math.floor(random() * inks.length)], { roughness: 0.9 })).rotation.z = x * 0.06;
    } else {
      const rope = s.material('#cdb98a', { roughness: 1 });
      for (let k = 0; k < 4; k++) s.ring(0.17 - k * 0.012, 0.018, [0.15, floor + 0.02 + k * 0.03, back + 0.4], rope).rotation.x = Math.PI / 2;
      s.box([0.5, 0.05, 0.4], [-0.2, floor + 0.025, front - 0.45], s.material('#a89068', { roughness: 1 })).rotation.y = 0.3;
      loadTop = floor + 0.1;
    }
    if (amount > 0.6 && a.load !== 'empty') {
      const rope = s.material('#cdb98a', { roughness: 1 });
      for (const z of [back + 0.35, front - 0.3]) s.tube([[-0.58, bedY + 0.2, z], [-0.4, loadTop + 0.02, z], [0, loadTop + 0.06, z], [0.4, loadTop + 0.02, z], [0.58, bedY + 0.2, z]], 0.012, rope);
    }
    if (a.hat) {
      const straw = s.material('#e3cc8a', { roughness: 0.9, side: THREE.DoubleSide });
      const hx = -0.22 + random() * 0.4, hz = bedZ + 0.68, hy = bedY + 0.35;
      s.lathe([[0.24, 0.012], [0.12, 0], [0.11, 0.09], [0.07, 0.12], [0, 0.125]], straw, [hx, hy, hz]).rotation.z = 0.08;
      s.cylinder(0.117, 0.122, 0.03, [hx, hy + 0.02, hz], s.material('#2c2a2a'), 16).rotation.z = 0.08;
    }

    // Donkey, facing +z between the shafts.
    const d = new Sculpture(context);
    const coat = { grey: '#8d8780', brown: '#6b4a36', white: '#d9d2c4', black: '#3a3330' }[a.coat];
    const hair = d.material(coat, { roughness: 0.95 });
    const pale = d.material(a.coat === 'white' ? '#f0ebe0' : '#e2d9c8', { roughness: 0.95 });
    const dark = d.material(a.coat === 'white' ? '#8a8078' : '#2a2422', { roughness: 0.9 });
    const leather = d.material('#3d2a1c', { roughness: 0.7 });
    const body = d.mesh(new THREE.CapsuleGeometry(0.24, 0.62, 6, 14), hair, [0, 0.9, 0.65]);
    body.rotation.x = Math.PI / 2;
    body.scale.set(0.95, 1, 1.05);
    d.ball([0.2, 0.16, 0.44], [0, 0.78, 0.66], pale, 14);
    const step = a.stance === 'walking' ? [0.16, -0.13, -0.13, 0.16] : a.stance === 'stubborn' ? [0.22, 0.24, 0.16, 0.14] : a.stance === 'braying' ? [0.06, 0.04, -0.05, -0.03] : [0, 0.03, 0, -0.03];
    [[-0.14, 1.02], [0.14, 1.02], [-0.14, 0.3], [0.14, 0.3]].forEach(([x, z], index) => {
      const fz = z + step[index];
      d.rod([x, 0.82, z], [x * 1.05, 0.4, mix(z, fz, 0.4) + (index > 1 ? -0.04 : 0.02)], 0.075, hair, 0.05);
      d.rod([x * 1.05, 0.42, mix(z, fz, 0.4) + (index > 1 ? -0.04 : 0.02)], [x * 1.05, 0.06, fz], 0.048, hair, 0.04);
      d.cylinder(0.04, 0.048, 0.07, [x * 1.05, 0.035, fz], dark, 10);
    });
    const neckEnd = new THREE.Vector3(...({ patient: [0, 1.36, 1.4], dozing: [0, 0.98, 1.5], stubborn: [0, 1.3, 1.42], walking: [0, 1.28, 1.46], braying: [0, 1.52, 1.3] } as const)[a.stance]);
    const nose = new THREE.Vector3(...({ patient: [0, -0.4, 0.92], dozing: [0, -0.82, 0.57], stubborn: [0, -0.1, 0.99], walking: [0, -0.35, 0.94], braying: [0, 0.55, 0.83] } as const)[a.stance]).normalize();
    d.rod([0, 0.98, 1.05], neckEnd.toArray(), 0.16, hair, 0.105);
    d.rod([0, 1.12, 0.98], [neckEnd.x, neckEnd.y + 0.07, neckEnd.z - 0.07], 0.03, dark);
    const head = new THREE.Group();
    head.position.copy(neckEnd).addScaledVector(nose, 0.13);
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nose);
    head.scale.setScalar(1.2);
    const inHead = (mesh: THREE.Mesh) => { mesh.removeFromParent(); head.add(mesh); return mesh; };
    inHead(d.ball([0.1, 0.115, 0.2], [0, 0, 0], hair, 14));
    inHead(d.ball([0.078, 0.085, 0.1], [0, -0.015, 0.16], pale, 12));
    for (const x of [-1, 1]) {
      inHead(d.ball([0.018, 0.022, 0.022], [x * 0.085, 0.035, -0.02], dark, 8));
      inHead(d.ball([0.012, 0.012, 0.012], [x * 0.035, -0.02, 0.255], dark, 6));
    }
    inHead(d.ring(0.088, 0.008, [0, -0.01, 0.1], leather));
    if (a.stance === 'braying') inHead(d.ball([0.05, 0.03, 0.06], [0, -0.1, 0.17], d.material('#7a3a34'), 8));
    const ears: THREE.Group[] = [];
    for (const x of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(x * 0.065, 0.09, -0.13);
      const blade = d.ball([0.038, 0.15, 0.022], [0, 0.14, 0], hair, 10);
      blade.removeFromParent();
      const inner = d.ball([0.02, 0.1, 0.012], [0, 0.13, 0.014], pale, 8);
      inner.removeFromParent();
      ear.add(blade, inner);
      const [tiltX, tiltZ] = { patient: [0.25, 0.25], dozing: [0.3, 1.25], stubborn: [-1.25, 0.15], walking: [0.1, 0.4], braying: [-0.7, 0.3] }[a.stance];
      ear.rotation.set(tiltX, 0, -x * tiltZ);
      head.add(ear);
      ears.push(ear);
    }
    d.root.add(head);
    const tail = new THREE.Group();
    tail.position.set(0, 1.0, 0.13);
    const tailRod = d.rod([0, 0, 0], [0, -0.42, -0.1], 0.02, hair, 0.014);
    const tuft = d.ball([0.035, 0.09, 0.035], [0, -0.48, -0.11], dark, 8);
    tailRod.removeFromParent(); tuft.removeFromParent();
    tail.add(tailRod, tuft);
    d.root.add(tail);

    // Blanket and harness.
    const [base, stripe, edge] = BLANKETS[a.blanket];
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const g = canvas.getContext('2d')!;
    g.fillStyle = base; g.fillRect(0, 0, 128, 128);
    for (const x of [8, 108]) { g.fillStyle = stripe; g.fillRect(x, 0, 12, 128); g.fillStyle = edge; g.fillRect(x + 4, 0, 4, 128); }
    g.fillStyle = stripe; g.fillRect(56, 0, 16, 128); g.fillStyle = edge; g.fillRect(40, 0, 5, 128); g.fillRect(83, 0, 5, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const blanket = d.mesh(new THREE.CylinderGeometry(0.262, 0.262, 0.4, 18, 1, true, Math.PI * 0.55, Math.PI * 0.9), new THREE.MeshStandardMaterial({ map: texture, roughness: 1, side: THREE.DoubleSide }), [0, 0.9, 0.6]);
    blanket.rotation.x = Math.PI / 2;
    blanket.scale.x = 0.96;
    d.ring(0.2, 0.032, [0, 1.02, 1.07], d.material('#b98a4a', { roughness: 0.8 })).rotation.x = -0.45;
    d.ring(0.255, 0.014, [0, 0.9, 0.5], leather).scale.x = 0.95;
    d.ring(0.25, 0.014, [0, 0.88, 0.24], leather).rotation.x = 0.5;
    for (const x of [-1, 1]) {
      d.rod([x * 0.2, 1.0, 1.02], [x * 0.33, 0.85, 0.5], 0.01, leather);
      d.rod([x * 0.24, 0.92, 0.5], [x * 0.36, 0.84, 0.52], 0.012, leather);
    }
    if (a.stance === 'stubborn') body.rotation.x = Math.PI / 2 + 0.07;
    d.root.scale.setScalar(1.14);
    d.root.position.z = -0.06;
    s.root.add(d.root);
    // Shown in profile, turned a little toward the viewer, so cart and animal both read.
    const rig = new THREE.Group();
    rig.add(...s.root.children.slice());
    rig.rotation.y = Math.PI / 2 - 0.3;
    s.root.add(rig);

    const lively = mix(0.15, 1, mood.energy);
    const earRest = ears.map((ear) => ear.rotation.x);
    return s.finish({
      update: (_dt, time) => {
        tail.rotation.z = Math.sin(time * 2.2) * 0.35 * lively;
        ears.forEach((ear, index) => { ear.rotation.x = earRest[index] + Math.max(0, Math.sin(time * 1.7 + index * 2.4) - 0.8) * 2 * lively; });
      },
    });
  },
});
