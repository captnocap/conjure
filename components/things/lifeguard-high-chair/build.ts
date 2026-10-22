import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const paint = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const PARASOLS = {
  'red-white': ['#d8322c', '#f6f1e4'],
  'blue-white': ['#2b6fb8', '#f6f1e4'],
  yellow: ['#f2c21c', '#f7d75a'],
  'faded-green': ['#7fa58c', '#c9d6bf'],
  orange: ['#f07a1c', '#fbe3b2'],
} as const;

export default defineThing({
  questions: {
    seat: choice('Who, in spirit, is in the seat?', {
      towel: 'Someone just stepped away: a striped towel over the backrest and sunglasses on the seat.',
      chained: 'Nobody. Parasol furled, a chain across the ladder and an OFF DUTY board.',
      megaphone: 'A megaphone left standing on the seat, as if the shouting has only paused.',
      jacket: 'A red LIFEGUARD jacket hung over the back, claiming the chair.',
      bare: 'Completely bare and anonymous, waiting.',
    }),
    parasol: choice('What colour is the parasol?', {
      'red-white': 'Red and white wedges, the classic seaside stripe.',
      'blue-white': 'Blue and white wedges, crisp and nautical.',
      yellow: 'Plain sunshine yellow.',
      'faded-green': 'Sun-bleached municipal green.',
      orange: 'Hot orange and cream, a 1970s holiday camp.',
    }),
    flag: choice('What flag flies from the pole?', {
      green: 'Green: safe, calm water, swim freely.',
      red: 'Red: danger, nobody in the water.',
      yellow: 'Yellow: caution, lifeguard uneasy.',
      'red-yellow': 'Red over yellow: the patrolled-zone flag.',
      none: 'A bare pole with no flag at all.',
    }),
    height: score('How tall is the chair?', ['A raised stool just above head height', 'A proper high chair', 'A towering watchtower of a chair']),
    frame: choice('How is the frame built?', {
      timber: 'Chunky painted timber with cross braces and a slatted seat.',
      tubular: 'Slim tubular steel with a curved hoop back, 1930s modern.',
    }),
    buoy: choice('What hangs on the rescue hook?', {
      ring: 'A red and white ring buoy with a coil of rope.',
      torpedo: 'An orange torpedo rescue float on a strap.',
      empty: 'An empty hook: the buoy has been thrown or taken.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const h = mix(1.45, 2.75, a.height);
    const tubular = a.frame === 'tubular';
    const r = tubular ? 0.036 : 0.055;
    const white = s.material(tubular ? '#e3e7e8' : '#f5f2ea', { metalness: tubular ? 0.35 : 0, roughness: tubular ? 0.4 : 0.7 });
    const rust = s.material('#9a5a34', { roughness: 0.9 });
    const dark = s.material('#2b2f33');
    const brass = s.material('#c9a13c', { metalness: 0.7, roughness: 0.35 });
    const [c1, c2] = PARASOLS[a.parasol];
    const furled = a.seat === 'chained';

    // Four splayed legs; the front pair carries the ladder.
    const fx = 0.64, fz = 0.82, bx = 0.56, bz = -0.5, tx = 0.37, tz = 0.3;
    for (const sx of [-1, 1]) {
      s.rod([sx * fx, 0, fz], [sx * tx, h, tz], r, white);
      s.rod([sx * bx, 0, bz], [sx * tx, h, -tz], r, white);
      // side bracing
      s.rod([sx * mix(fx, tx, 0.18), h * 0.18, mix(fz, tz, 0.18)], [sx * mix(bx, tx, 0.18), h * 0.18, mix(bz, -tz, 0.18)], r * 0.8, white);
      if (!tubular) s.rod([sx * mix(fx, tx, 0.2), h * 0.2, mix(fz, tz, 0.2)], [sx * mix(bx, tx, 0.85), h * 0.85, mix(bz, -tz, 0.85)], r * 0.7, white);
      for (const [x, z] of [[fx, fz], [bx, bz]]) s.cylinder(r * 1.5, r * 1.8, 0.04, [sx * x, 0.02, z], mood.wear > 0.5 ? rust : dark, 10);
    }
    s.rod([-mix(bx, tx, 0.18), h * 0.18, mix(bz, -tz, 0.18)], [mix(bx, tx, 0.18), h * 0.18, mix(bz, -tz, 0.18)], r * 0.8, white);
    if (!tubular) {
      s.rod([-mix(bx, tx, 0.22), h * 0.22, mix(bz, -tz, 0.22)], [mix(bx, tx, 0.8), h * 0.8, mix(bz, -tz, 0.8)], r * 0.7, white);
      s.rod([mix(bx, tx, 0.22), h * 0.22, mix(bz, -tz, 0.22)], [-mix(bx, tx, 0.8), h * 0.8, mix(bz, -tz, 0.8)], r * 0.7, white);
    }
    const rungs = Math.max(4, Math.round(h / 0.3));
    for (let i = 1; i < rungs; i++) {
      const t = i / rungs, x = mix(fx, tx, t);
      s.rod([-x, h * t, mix(fz, tz, t)], [x, h * t, mix(fz, tz, t)], tubular ? 0.02 : 0.032, white);
      if (mood.wear > 0.45 && random() < mood.wear * 0.6) s.box([0.16 + random() * 0.2, 0.05, 0.05], [(random() - 0.5) * x, h * t, mix(fz, tz, t)], rust);
    }

    // Platform, footrest, seat, arms and back.
    s.box([0.9, 0.06, 0.78], [0, h, 0], white);
    s.box([0.8, 0.05, 0.22], [0, h - 0.02, 0.46], white);
    const sy = h + 0.46;
    for (const sx of [-1, 1]) {
      s.rod([sx * 0.34, h, 0.2], [sx * 0.34, sy + 0.26, 0.2], r * 0.8, white);
      s.rod([sx * 0.34, h, -0.3], [sx * 0.34, sy + (tubular ? 0.26 : 0.72), -0.3], r * 0.8, white);
      s.box([0.08, 0.04, 0.6], [sx * 0.34, sy + 0.27, -0.04], white);
    }
    if (tubular) {
      s.box([0.62, 0.05, 0.5], [0, sy, -0.05], white);
      s.tube([[-0.34, sy + 0.26, -0.3], [-0.3, sy + 0.62, -0.34], [0, sy + 0.78, -0.36], [0.3, sy + 0.62, -0.34], [0.34, sy + 0.26, -0.3]], r * 0.8, white);
      s.box([0.5, 0.22, 0.03], [0, sy + 0.42, -0.33], white);
    } else {
      for (let i = 0; i < 5; i++) s.box([0.62, 0.035, 0.085], [0, sy, -0.25 + i * 0.1], white);
      for (let i = 0; i < 3; i++) s.box([0.66, 0.1, 0.03], [0, sy + 0.3 + i * 0.17, -0.31], white);
    }

    // Parasol on a pole behind the seat, tilted a little; furled when chained off.
    const top = sy + 1.85;
    const lean = (random() - 0.5) * 0.12 + mood.wear * 0.14;
    const sun = new THREE.Group();
    sun.position.set(0, sy, -0.38);
    sun.rotation.set(-0.08, 0, lean);
    s.root.add(sun);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.9, 10), tubular ? white : s.material('#b98b54'));
    pole.position.y = 0.95; pole.castShadow = true;
    sun.add(pole);
    const stripes = paint(256, 16, (c) => {
      for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? c2 : c1; c.fillRect(i * 32, 0, 32, 16); }
    });
    const cloth = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.85, side: THREE.DoubleSide });
    cloth.color.lerp(new THREE.Color('#9c968a'), mood.wear * 0.35);
    const canopy = new THREE.Mesh(furled ? new THREE.ConeGeometry(0.09, 1.05, 8, 1, true) : new THREE.ConeGeometry(1.02, 0.36, 8, 1, true), cloth);
    canopy.position.y = furled ? 1.33 : 1.72; canopy.castShadow = true;
    sun.add(canopy);
    if (!furled) {
      const hem = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.1, 8, 1, true), cloth);
      hem.position.y = 1.5; hem.castShadow = true;
      sun.add(hem);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.05, 5), dark);
        rib.position.set(Math.sin(angle) * 0.5, 1.7, Math.cos(angle) * 0.5);
        rib.rotation.set(0, angle, 0, 'YXZ'); rib.rotateX(Math.PI / 2 + 0.34);
        sun.add(rib);
      }
    } else {
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 14), s.material(c1));
      tie.position.y = 1.2; tie.rotation.x = Math.PI / 2;
      sun.add(tie);
    }
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), brass);
    finial.position.y = 1.92;
    sun.add(finial);

    // Signal flag on its own mast, lashed to a back leg.
    const mastTop = top + 0.75;
    s.rod([tx + 0.06, h * 0.5, -tz - 0.08], [tx + 0.1, mastTop, -tz - 0.1], 0.018, white);
    s.ball([0.03, 0.03, 0.03], [tx + 0.1, mastTop + 0.02, -tz - 0.1], brass, 8);
    let flag: THREE.Mesh | null = null;
    if (a.flag !== 'none') {
      const flagMap = paint(64, 48, (c) => {
        const col = { green: '#1f9a4c', red: '#d42620', yellow: '#f4c60f', 'red-yellow': '#d42620' }[a.flag as 'green'];
        c.fillStyle = col; c.fillRect(0, 0, 64, 48);
        if (a.flag === 'red-yellow') { c.fillStyle = '#f4c60f'; c.fillRect(0, 24, 64, 24); }
      });
      const flagMaterial = new THREE.MeshStandardMaterial({ map: flagMap, side: THREE.DoubleSide, roughness: 0.8 });
      flag = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.42, 10, 3), flagMaterial);
      flag.geometry.translate(0.31, 0, 0);
      flag.position.set(tx + 0.12, mastTop - 0.24, -tz - 0.1);
      flag.castShadow = true;
      s.root.add(flag);
    }

    // Rescue hook on the right front leg.
    const hy = h * 0.62, hx = mix(fx, tx, 0.62) + 0.05, hz = mix(fz, tz, 0.62);
    s.rod([hx - 0.05, hy + 0.3, hz], [hx + 0.1, hy + 0.34, hz], 0.012, dark);
    if (a.buoy === 'ring') {
      const ringMap = paint(128, 8, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f7f3ea' : '#d42a20'; c.fillRect(i * 16, 0, 16, 8); } });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.075, 10, 32), new THREE.MeshStandardMaterial({ map: ringMap, roughness: 0.6 }));
      ring.position.set(hx + 0.1, hy + 0.02, hz);
      ring.rotation.y = Math.PI / 2 - 0.25; ring.rotation.z = 0.12;
      ring.castShadow = true;
      s.root.add(ring);
      const coil = s.ring(0.13, 0.02, [hx + 0.17, hy - 0.05, hz], s.material('#d9c9a0'));
      coil.rotation.y = Math.PI / 2 - 0.25;
    } else if (a.buoy === 'torpedo') {
      const orange = s.material('#f06a14', { roughness: 0.4 });
      const can = s.ball([0.1, 0.36, 0.08], [hx + 0.11, hy - 0.08, hz], orange, 14);
      can.rotation.z = 0.1;
      s.rod([hx + 0.1, hy + 0.33, hz], [hx + 0.11, hy + 0.25, hz], 0.01, dark);
      s.ring(0.11, 0.012, [hx + 0.11, hy + 0.24, hz], s.material('#e8e2cf')).rotation.y = Math.PI / 2;
    }

    // Whistle on a cord from the armrest.
    const swing = new THREE.Group();
    swing.position.set(-0.38, sy + 0.27, 0.22);
    s.root.add(swing);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.42, 5), s.material('#c22a26'));
    cord.position.y = -0.21;
    const whistle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12), brass);
    whistle.position.y = -0.44; whistle.rotation.x = Math.PI / 2;
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.045), brass);
    mouth.position.set(0.05, -0.425, 0);
    swing.add(cord, whistle, mouth);

    // What has been left in the seat.
    if (a.seat === 'towel') {
      const towelMap = paint(64, 64, (c) => {
        const hue = Math.floor(random() * 360);
        for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fbf6e8' : `hsl(${hue},70%,52%)`; c.fillRect(0, i * 8, 64, 8); }
      });
      const towel = new THREE.MeshStandardMaterial({ map: towelMap, roughness: 0.95 });
      s.box([0.5, 0.5, 0.05], [0.04, sy + 0.5, -0.275], towel);
      s.box([0.5, 0.05, 0.1], [0.04, sy + 0.76, -0.31], towel);
      s.box([0.5, 0.36, 0.04], [0.04, sy + 0.6, -0.355], towel);
      for (const sx of [-1, 1]) s.cylinder(0.045, 0.045, 0.012, [sx * 0.055 - 0.1, sy + 0.04, 0.1], dark, 14);
      s.box([0.03, 0.012, 0.012], [-0.1, sy + 0.04, 0.1], dark);
    } else if (a.seat === 'megaphone') {
      const horn = s.mesh(new THREE.CylinderGeometry(0.17, 0.04, 0.42, 20, 1, true), s.material('#e23b2a', { side: THREE.DoubleSide }), [0, sy + 0.24, 0]);
      horn.rotation.set(0.25, 0, 0);
      s.ring(0.17, 0.014, [0, sy + 0.44, 0.05], s.material('#f4f0e4')).rotation.x = Math.PI / 2 + 0.25;
      s.box([0.04, 0.12, 0.05], [0, sy + 0.14, 0.1], dark);
    } else if (a.seat === 'jacket') {
      const red = s.material('#cf2a24');
      s.box([0.56, 0.5, 0.06], [0, sy + 0.5, -0.27], red);
      s.box([0.56, 0.06, 0.12], [0, sy + 0.76, -0.31], red);
      for (const sx of [-1, 1]) s.box([0.12, 0.4, 0.06], [sx * 0.33, sy + 0.44, -0.26], red).rotation.z = sx * 0.2;
      s.label('LIFEGUARD', 0.46, 0.1, [0, sy + 0.55, -0.238], '#ffffff', '#cf2a24');
    } else if (a.seat === 'chained') {
      const steel = s.material('#8d9396', { metalness: 0.7, roughness: 0.4 });
      const cy = h * 0.42, cx = mix(fx, tx, 0.42), cz = mix(fz, tz, 0.42) + 0.04;
      s.tube([[-cx, cy + 0.1, cz], [-cx * 0.5, cy - 0.06, cz + 0.02], [0, cy - 0.1, cz + 0.03], [cx * 0.5, cy - 0.06, cz + 0.02], [cx, cy + 0.1, cz]], 0.014, steel);
      s.ball([0.04, 0.05, 0.03], [cx, cy + 0.08, cz + 0.03], brass, 8);
      const board = s.label('OFF DUTY', 0.52, 0.2, [0, cy - 0.22, cz + 0.05], '#f7f1e2', '#b3261e');
      board.rotation.z = (random() - 0.5) * 0.2;
      board.rotation.x = -0.3;
    }

    const energy = mood.energy;
    const base = flag ? Float32Array.from(flag.geometry.attributes.position.array) : null;
    const droop = mix(0.5, 0.05, energy);
    return s.finish({
      update: (_dt, time) => {
        swing.rotation.z = Math.sin(time * mix(0.6, 2.6, energy)) * mix(0.03, 0.3, energy);
        sun.rotation.z = lean + Math.sin(time * 0.7) * 0.015 * energy;
        if (!flag || !base) return;
        const position = flag.geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
          const x = base[i * 3];
          position.setZ(i, Math.sin(x * 9 - time * mix(1.5, 9, energy)) * x * mix(0.04, 0.2, energy));
          position.setY(i, base[i * 3 + 1] - x * x * droop);
        }
        position.needsUpdate = true;
      },
    });
  },
});
