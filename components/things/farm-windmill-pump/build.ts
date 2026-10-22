import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const NAMES = {
  chinook: 'CHINOOK, red letters on a white vane.',
  duke: 'IRON DUKE, black on galvanised steel.',
  zephyr: 'ZEPHYR, white script on a red vane.',
  star: 'PRAIRIE STAR, blue letters with a painted star.',
  blank: 'Nothing readable: the paint has gone to rust.',
} as const;
const VANE: Record<keyof typeof NAMES, [string, string, string]> = {
  chinook: ['CHINOOK', '#b3261d', '#efeadb'], duke: ['IRON DUKE', '#1e2124', '#b9bfc0'], zephyr: ['ZEPHYR', '#f3eedf', '#a82c22'], star: ['★ PRAIRIE STAR', '#27508a', '#efeadb'], blank: ['', '#7b4a2e', '#9a7a62'],
};
type P = readonly [number, number, number];

export default defineThing({
  questions: {
    wheel: choice('How complete is the wheel of blades?', {
      full: 'Every blade in place, a full silver daisy.',
      gaps: 'A few blades missing, like lost teeth.',
      half: 'Half the wheel gone, the rest bent and rattling.',
      bare: 'Only the hub and bare spokes left.',
    }),
    motion: choice('What is the wheel doing?', {
      turning: 'Turning steadily in the wind, the pump rod working.',
      furled: 'Furled: the tail folded round so the wheel sits edge-on and still.',
      seized: 'Seized solid with rust, pointing wherever it stopped.',
    }),
    tank: choice('What is in the stock tank?', {
      full: 'Brim full of clear water reflecting the sky.',
      green: 'Overflowing, green with algae, the ground muddy around it.',
      dry: 'Bone dry, cracked mud in the bottom.',
      iced: 'Frozen over, a pale slab of ice with a hole chopped in it.',
    }),
    vane: choice('What is painted on the tail vane?', NAMES),
    tower: choice('What is the tower made of?', {
      steel: 'Galvanised angle-iron lattice with cross braces.',
      timber: 'Four heavy wooden legs with plank bracing, home built.',
    }),
    height: score('How tall is the tower?', ['A squat yard pump', 'Ordinary', 'Very tall, to catch wind over the trees']),
    company: choice('What is at the tank?', {
      nothing: 'Nothing.',
      crows: 'Crows perched along the rim.',
      skull: 'A sun-bleached cattle skull in the dust.',
      tumbleweed: 'Tumbleweeds caught against the tower legs.',
      bucket: 'A tin bucket and a coiled rope.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = Math.min(1, mood.wear + (a.motion === 'seized' ? 0.3 : 0) + (a.wheel === 'bare' ? 0.2 : 0));
    const rust = new THREE.Color('#7b4a2e');
    const galv = s.material(new THREE.Color('#aab1b3').lerp(rust, wear * 0.55), { metalness: 0.35, roughness: 0.5 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9cfd0').lerp(rust, wear * 0.5), metalness: 0.3, roughness: 0.5, side: THREE.DoubleSide });
    const timber = s.material('#7a6650');
    const dark = s.material('#2a2b2d');
    const frame = a.tower === 'timber' ? timber : galv;

    // Tower.
    const H = mix(5.5, 12, a.height) + random() * 0.8;
    const base = mix(1.1, 1.7, a.height), topW = 0.24;
    const widthAt = (y: number) => mix(base, topW, y / H);
    const legR = a.tower === 'timber' ? 0.085 : 0.04;
    const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]] as const;
    for (const [x, z] of corners) s.rod([x * base, 0, z * base], [x * topW, H, z * topW], legR, frame);
    const levels = Math.max(3, Math.round(H / 2));
    for (let i = 0; i < levels; i++) {
      const y0 = (i / levels) * H * 0.94 + 0.25, y1 = ((i + 1) / levels) * H * 0.94 + 0.25;
      const w0 = widthAt(y0), w1 = widthAt(y1);
      corners.forEach(([x, z], index) => {
        const [nx, nz] = corners[(index + 1) % 4];
        s.rod([x * w1, y1, z * w1], [nx * w1, y1, nz * w1], legR * 0.6, frame);
        if (a.tower === 'timber' && i % 2) return;
        if (random() > wear * 0.25) s.rod([x * w0, y0, z * w0], [nx * w1, y1, nz * w1], legR * 0.45, frame);
        if (a.tower === 'steel' && random() > wear * 0.25) s.rod([nx * w0, y0, nz * w0], [x * w1, y1, z * w1], legR * 0.45, frame);
      });
    }
    const py = H * 0.84, pw = widthAt(py) + 0.4;
    s.box([pw * 2, 0.06, pw * 2], [0, py, 0], timber);
    for (let i = 1; i < H / 0.4 - 1; i++) { const y = i * 0.4; const w = widthAt(y); s.rod([w, y, w], [w - 0.34, y, w + 0.02], 0.018, frame); }
    for (const [x, z] of corners) s.box([0.36, 0.3, 0.36], [x * base, 0.05, z * base], s.material('#a9a498'));

    // Pump rod, standpipe and spout.
    const rod = s.rod([0, 1.2, 0], [0, H + 0.2, 0], 0.022, dark);
    s.cylinder(0.09, 0.11, 1.3, [0, 0.65, 0], galv, 12);
    s.cylinder(0.16, 0.16, 0.08, [0, 1.3, 0], galv, 12);

    // Head: gearbox, wheel and tail, free to swing.
    const head = new THREE.Group();
    head.position.set(0, H + 0.35, 0);
    head.rotation.y = mix(-0.95, 0.15, random());
    s.root.add(head);
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = true;
      return mesh;
    };
    head.add(part(new THREE.BoxGeometry(0.3, 0.42, 0.55), galv, [0, 0, 0.05]));
    head.add(part(new THREE.CylinderGeometry(0.12, 0.14, 0.4, 10), galv, [0, -0.3, 0]));
    const wheel = new THREE.Group();
    wheel.position.set(0, 0.05, 0.52);
    head.add(wheel);
    const RO = 1.8, RI = 0.55;
    const hub = part(new THREE.CylinderGeometry(0.13, 0.13, 0.24, 12), galv);
    hub.rotation.x = Math.PI / 2;
    wheel.add(hub);
    const count = 18;
    const bladeShape = new THREE.Shape([new THREE.Vector2(-0.08, RI), new THREE.Vector2(0.08, RI), new THREE.Vector2(0.24, RO), new THREE.Vector2(-0.24, RO)]);
    const bladeGeo = new THREE.ShapeGeometry(bladeShape);
    const keep = (index: number) => a.wheel === 'full' ? true : a.wheel === 'gaps' ? random() > 0.22 : a.wheel === 'half' ? (index < count * 0.55 ? random() > 0.25 : random() > 0.9) : false;
    let kept = 0;
    for (let i = 0; i < count; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = (i / count) * Math.PI * 2;
      if (i % 3 === 0) arm.add(part(new THREE.CylinderGeometry(0.018, 0.018, RO * 0.97, 5), galv, [0, RO * 0.485, -0.05]));
      if (keep(i)) {
        kept++;
        const blade = part(bladeGeo, bladeMat);
        blade.rotation.y = 0.55 + (a.wheel === 'full' ? 0 : (random() - 0.5) * wear * 1.2);
        if (a.wheel === 'half' && random() > 0.6) blade.rotation.x = (random() - 0.5) * 0.7;
        arm.add(blade);
      }
      wheel.add(arm);
    }
    for (const [r, tube] of [[RI + 0.05, 0.016], [RO * 0.78, 0.016]] as const) {
      if (a.wheel === 'bare' && r > 1 && random() > 0.4) continue;
      wheel.add(part(new THREE.TorusGeometry(r, tube, 5, 40, a.wheel === 'half' && r > 1 ? Math.PI * 1.25 : Math.PI * 2), galv));
    }
    void kept;
    // Tail.
    const [text, ink, paper] = VANE[a.vane];
    const tail = new THREE.Group();
    const furled = a.motion === 'furled';
    tail.rotation.y = Math.PI / 2 - (furled ? 1.3 : a.motion === 'seized' ? (random() - 0.5) * 0.9 : 0);
    tail.position.z = -0.15;
    head.add(tail);
    const boom = part(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), galv, [0.75, 0, 0]);
    boom.rotation.z = Math.PI / 2;
    tail.add(boom);
    const stay = part(new THREE.CylinderGeometry(0.012, 0.012, 1.6, 5), galv, [0.72, 0.28, 0]);
    stay.rotation.z = Math.PI / 2 - 0.36;
    tail.add(stay);
    const vaneColour = new THREE.Color(paper).lerp(rust, wear * 0.45);
    const vaneShape = new THREE.Shape([new THREE.Vector2(1.15, -0.12), new THREE.Vector2(3.0, -0.62), new THREE.Vector2(2.82, 0), new THREE.Vector2(3.0, 0.62), new THREE.Vector2(1.15, 0.12)]);
    tail.add(part(new THREE.ShapeGeometry(vaneShape), new THREE.MeshStandardMaterial({ color: vaneColour, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.2 })));
    if (text) for (const side of [-1, 1]) {
      const label = s.label(text, 1.2, 0.4, [2.2, 0, side * 0.012], ink, `#${vaneColour.getHexString()}`);
      (label.material as THREE.MeshStandardMaterial).side = THREE.FrontSide;
      if (side < 0) label.rotation.y = Math.PI;
      tail.add(label);
    }

    // Stock tank.
    const tr = 1.55 + random() * 0.35, th = 0.68;
    const tx = base + tr + 0.25, tz = 0.9;
    const tank = new THREE.MeshStandardMaterial({ color: galv.color, metalness: 0.35, roughness: 0.5, side: THREE.DoubleSide });
    s.mesh(new THREE.CylinderGeometry(tr, tr, th, 36, 1, true), tank, [tx, th / 2, tz]);
    for (const y of [0.04, th * 0.5, th]) s.ring(tr + 0.01, 0.03, [tx, y, tz], galv).rotation.x = Math.PI / 2;
    const sky = new THREE.Color().setHSL(mix(0.58, 0.08, Math.abs(mood.daylight - 0.5) * 2 * mood.warmth), 0.45, 0.66);
    if (a.tank === 'full' || a.tank === 'green') {
      const water = s.material(a.tank === 'green' ? '#55733a' : sky, { roughness: a.tank === 'green' ? 0.6 : 0.12, metalness: 0.2 });
      s.cylinder(tr - 0.02, tr - 0.02, 0.04, [tx, th - (a.tank === 'green' ? 0.02 : 0.1), tz], water, 36);
      if (a.tank === 'green') {
        const mud = s.cylinder(tr + 1.1, tr + 1.3, 0.03, [tx + 0.2, 0.015, tz + 0.2], s.material('#5b4a38', { roughness: 0.4 }), 24);
        mud.scale.z = 0.8;
        for (let i = 0; i < 9; i++) { const t = random() * 6.28, r = random() * tr * 0.85; s.cylinder(0.2 + random() * 0.25, 0.2, 0.01, [tx + Math.sin(t) * r, th + 0.006, tz + Math.cos(t) * r], s.material('#86a04a'), 8); }
      }
    } else if (a.tank === 'iced') {
      s.cylinder(tr - 0.02, tr - 0.02, 0.08, [tx, th - 0.1, tz], s.material('#dfeaf0', { roughness: 0.3 }), 36);
      s.cylinder(0.3, 0.3, 0.085, [tx - tr * 0.4, th - 0.098, tz + tr * 0.3], s.material('#3d5a6e', { roughness: 0.1 }), 9);
      for (let i = 0; i < 6; i++) { const t = random() * 6.28; s.rod([tx, th - 0.055, tz], [tx + Math.sin(t) * tr * 0.95, th - 0.055, tz + Math.cos(t) * tr * 0.95], 0.012, s.material('#a9c0cc')); }
      for (let i = 0; i < 4; i++) s.mesh(new THREE.ConeGeometry(0.035, 0.3 + random() * 0.25, 5), s.material('#e8f2f6'), [tx - tr + 0.1 + i * 0.06 - 0.3, 0.92 - 0.2, tz * 0.55 + (random() - 0.5) * 0.05]).rotation.x = Math.PI;
      s.cylinder(tr + 0.9, tr + 1.1, 0.03, [tx, 0.015, tz], s.material('#e9eef0'), 24);
    } else {
      s.cylinder(tr - 0.02, tr - 0.02, 0.03, [tx, 0.06, tz], s.material('#9b8667'), 36);
      for (let i = 0; i < 9; i++) { const t = random() * 6.28, t2 = t + 1.5 + random() * 2; s.rod([tx + Math.sin(t) * tr * 0.9, 0.08, tz + Math.cos(t) * tr * 0.9], [tx + Math.sin(t2) * tr * 0.5, 0.08, tz + Math.cos(t2) * tr * 0.5], 0.014, s.material('#5e4f3c')); }
    }
    // Delivery pipe from the pump to the tank rim.
    s.tube([[0, 1.05, 0], [0.5, 1.05, 0.3], [tx - tr - 0.25, 0.98, tz * 0.6], [tx - tr + 0.12, 0.92, tz * 0.62]], 0.035, galv);
    const flowing = a.motion === 'turning' && a.tank !== 'dry' && a.tank !== 'iced' && a.wheel !== 'bare';
    if (flowing) s.rod([tx - tr + 0.14, 0.9, tz * 0.62], [tx - tr + 0.22, th - 0.1, tz * 0.63], 0.022, s.material('#cfe4ee', { roughness: 0.1 }));

    // Company.
    if (a.company === 'crows') {
      const crow = s.material('#1c1c21');
      const n = 3 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) {
        const t = random() * 6.28;
        const at: P = i === 0 ? [0.3, py + 0.2, 0.3] : [tx + Math.sin(t) * tr, th + 0.13, tz + Math.cos(t) * tr];
        s.ball([0.09, 0.11, 0.17], at, crow, 8).rotation.y = t;
        s.ball([0.06, 0.06, 0.07], [at[0] + Math.sin(t) * 0.13, at[1] + 0.1, at[2] + Math.cos(t) * 0.13], crow, 8);
        s.mesh(new THREE.ConeGeometry(0.02, 0.09, 4), s.material('#3a3a3a'), [at[0] + Math.sin(t) * 0.21, at[1] + 0.09, at[2] + Math.cos(t) * 0.21]).rotation.set(Math.PI / 2, 0, -t);
      }
    } else if (a.company === 'skull') {
      const bone = s.material('#ebe5d3');
      const sx = -0.3, sz = base + 1.1;
      s.ball([0.2, 0.15, 0.3], [sx, 0.14, sz], bone, 12);
      s.ball([0.12, 0.1, 0.2], [sx, 0.1, sz + 0.34], bone, 10);
      for (const x of [-1, 1]) {
        s.tube([[sx + x * 0.16, 0.2, sz - 0.1], [sx + x * 0.45, 0.25, sz - 0.12], [sx + x * 0.62, 0.45, sz - 0.02]], 0.035, bone);
        s.ball([0.045, 0.045, 0.03], [sx + x * 0.1, 0.2, sz + 0.12], dark, 6);
      }
      for (let i = 0; i < 4; i++) s.rod([sx + 0.8 + i * 0.16, 0.03, sz - 0.3], [sx + 0.9 + i * 0.16, 0.05, sz + 0.3], 0.02, bone).rotation.y += random();
    } else if (a.company === 'tumbleweed') {
      const weed = s.material('#a68c57');
      for (let k = 0; k < 3; k++) {
        const r = 0.4 + random() * 0.35, cx = (k - 1) * 1.1 - 0.4, cz = base + 0.2 + random() * 0.6;
        for (let i = 0; i < 7; i++) s.ring(r, 0.015, [cx, r, cz], weed).rotation.set(random() * 3.1, random() * 3.1, random() * 3.1);
      }
    } else if (a.company === 'bucket') {
      const bx = tx - tr - 0.5, bz = tz + 1.3;
      s.mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 12, 1, true), tank, [bx, 0.15, bz]);
      s.ring(0.17, 0.012, [bx, 0.3, bz], dark, Math.PI);
      for (let i = 0; i < 4; i++) s.ring(0.22 - i * 0.012, 0.022, [bx + 0.6, 0.03 + i * 0.04, bz + 0.1], s.material('#c2a56b')).rotation.x = Math.PI / 2;
    }
    if (wear > 0.5 || a.tank === 'dry') {
      const blades = Array.from({ length: 80 }, () => { const size = 0.3 + random() * 0.5; return { at: [(random() - 0.5) * (base * 2 + 1.5), 0.5 * size, (random() - 0.5) * (base * 2 + 1.5)] as const, size, color: random() > 0.4 ? '#b9a865' : '#8f8a50' }; });
      s.scatter(new THREE.ConeGeometry(0.06, 1.0, 4), new THREE.MeshStandardMaterial({ roughness: 1 }), blades);
    }

    wheel.rotation.z = random() * 6;
    const spin = a.motion === 'turning' && a.wheel !== 'bare' ? mix(0.25, 4.5, mood.energy) * (a.wheel === 'half' ? 0.4 : 1) : 0;
    const yaw = head.rotation.y;
    const rodY = rod.position.y;
    return s.finish({
      update: (dt, time) => {
        wheel.rotation.z -= dt * spin;
        if (a.motion !== 'seized') head.rotation.y = yaw + Math.sin(time * 0.4) * mix(0.02, 0.18, mood.energy);
        rod.position.y = rodY + (spin ? Math.sin(wheel.rotation.z * 0.5) * 0.08 : 0);
      },
    });
  },
});
