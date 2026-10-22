import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const IRIS = {
  blue: ['#3f7fc4', '#1d3f6e'],
  brown: ['#7a4a22', '#38200e'],
  green: ['#5e9a4c', '#2a4a22'],
  amber: ['#d79a2a', '#7a4a10'],
  violet: ['#8a5fd0', '#3a2470'],
  'red-led': ['#ff3020', '#7a0a04'],
} as const;

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    gaze: choice('Where are the eyes pointed?', {
      straight: 'Straight at you, level and unblinking.',
      crossed: 'Crossed, both turned in toward the nose.',
      away: 'Both swung off to one side, looking past you.',
      up: 'Rolled upward, showing white underneath.',
      walleyed: 'Each pointing outward in a different direction, miscalibrated.',
      blink: 'Caught mid-blink, lids most of the way down.',
    }),
    iris: choice('What colour are the irises?', {
      blue: 'Pale blue.', brown: 'Warm brown.', green: 'Green.', amber: 'Amber yellow, animal-like.', violet: 'Unnatural violet.', 'red-led': 'Glowing red, lit from inside.',
    }),
    realism: choice('How real are the eyeballs?', {
      cartoon: 'Plain white domes with big flat black pupils, a puppet or mascot.',
      doll: 'Glossy doll eyes with large clean coloured irises.',
      real: 'Hyper-real: veined sclera, striated iris, wet shine, hard to look at.',
    }),
    surround: choice('How much face surrounds the eyes?', {
      none: 'None, bare eyeballs in the mechanism.',
      brow: 'A metal brow plate with two hinged eyebrow bars above them.',
      skin: 'A partial rubber skin: a strip of flesh-coloured eyelid and brow stretched around both eyes.',
      mask: 'A white half-mask shell covering the frame from brow to cheekbones.',
    }),
    action: choice('What is the rig doing?', {
      sweep: 'Sweeping slowly side to side with the odd blink.',
      twitch: 'Twitching and darting in small nervous jumps.',
      stopped: 'Powered down, stopped where it was left.',
    }),
    frame: choice('What is the frame made of?', {
      aluminium: 'Machined silver aluminium plate, studio grade.',
      acrylic: 'Laser-cut smoky blue acrylic, a hobby kit.',
      printed: 'Orange 3D-printed plastic, a layered prototype.',
      brass: 'Brass and blackened steel, an old automaton.',
    }),
    build: choice('What state is the build in?', {
      complete: 'Complete and wired up.',
      'one-eye': 'One eyeball has been taken out and lies on the base beside its empty gimbal.',
      unplugged: 'Servo leads pulled out of the board and left dangling.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 0.031, gap = 0.047, eyeY = 0.1, eyeZ = 0.03;
    const live = a.action !== 'stopped' && a.build !== 'unplugged';
    const frameCol = { aluminium: '#c4c9cc', acrylic: '#3d7fb0', printed: '#ee7b22', brass: '#b8923c' }[a.frame];
    const frame = new THREE.MeshStandardMaterial({
      color: new THREE.Color(frameCol).lerp(new THREE.Color('#77695a'), mood.wear * 0.3),
      metalness: a.frame === 'aluminium' || a.frame === 'brass' ? 0.8 : 0.05,
      roughness: a.frame === 'printed' ? 0.8 : 0.32 + mood.wear * 0.3,
      transparent: a.frame === 'acrylic', opacity: a.frame === 'acrylic' ? 0.72 : 1,
    });
    const steel = new THREE.MeshStandardMaterial({ color: a.frame === 'brass' ? '#3a3a3c' : '#9aa0a4', metalness: 0.85, roughness: 0.3 });
    const servoBlue = new THREE.MeshStandardMaterial({ color: a.frame === 'brass' ? '#2b2b2e' : '#2864c8', roughness: 0.5 });
    const white = new THREE.MeshStandardMaterial({ color: '#f1f1ec', roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: '#17181b', roughness: 0.6 });
    const part = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const rod = (parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material) => {
      const d = to.clone().sub(from);
      const mesh = part(parent, new THREE.CylinderGeometry(radius, radius, d.length(), 6), material);
      mesh.position.copy(from).addScaledVector(d, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return mesh;
    };
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

    // Base plate, feet, uprights and a cross bar.
    part(s.root, new THREE.BoxGeometry(0.27, 0.008, 0.2), frame, 0, 0.012, 0.025);
    for (const x of [-1, 1]) for (const z of [-1, 1]) part(s.root, new THREE.CylinderGeometry(0.008, 0.009, 0.008, 10), dark, x * 0.12, 0.004, 0.025 + z * 0.085);
    for (const side of [-1, 1]) {
      part(s.root, new THREE.BoxGeometry(0.006, 0.15, 0.03), frame, side * 0.118, 0.09, 0.005);
      for (let i = 0; i < 4; i++) { const hole = part(s.root, new THREE.CylinderGeometry(0.005, 0.005, 0.0065, 10), dark, side * 0.118, 0.04 + i * 0.03, 0.005); hole.rotation.z = Math.PI / 2; }
    }
    part(s.root, new THREE.BoxGeometry(0.242, 0.016, 0.006), frame, 0, 0.158, -0.006);
    part(s.root, new THREE.BoxGeometry(0.242, 0.006, 0.02), frame, 0, eyeY - R - 0.012, eyeZ - 0.006);

    // Eyes.
    const [c1, c2] = IRIS[a.iris];
    const irisAngle = a.realism === 'cartoon' ? 0.62 : a.realism === 'doll' ? 0.68 : 0.52;
    const sclera = paint(512, 256, (c) => {
      c.fillStyle = a.realism === 'real' ? '#efe6dc' : '#f7f6f1'; c.fillRect(0, 0, 512, 256);
      if (a.realism === 'real') {
        for (let i = 0; i < 46; i++) {
          c.strokeStyle = `rgba(${170 + random() * 50},${30 + random() * 40},${30 + random() * 30},${0.35 + random() * 0.4})`;
          c.lineWidth = 0.6 + random() * 1.6; c.beginPath();
          let x = random() * 512, y = random() < 0.5 ? 20 + random() * 60 : 236 - random() * 60;
          c.moveTo(x, y);
          for (let k = 0; k < 6; k++) { x += (random() - 0.5) * 50; y += (128 - y) * 0.16 + (random() - 0.5) * 16; c.lineTo(x, y); }
          c.stroke();
        }
        const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(190,90,80,0.35)'); g.addColorStop(0.3, 'rgba(190,90,80,0)'); g.addColorStop(0.7, 'rgba(190,90,80,0)'); g.addColorStop(1, 'rgba(190,90,80,0.35)');
        c.fillStyle = g; c.fillRect(0, 0, 512, 256);
      }
    });
    const irisMap = paint(256, 128, (c) => {
      if (a.realism === 'cartoon') { c.fillStyle = '#0c0c0e'; c.fillRect(0, 0, 256, 128); c.fillStyle = c1; c.fillRect(0, 104, 256, 24); return; }
      const g = c.createLinearGradient(0, 0, 0, 128); g.addColorStop(0.36, c1); g.addColorStop(0.9, c2);
      c.fillStyle = g; c.fillRect(0, 0, 256, 128);
      if (a.realism === 'real') for (let i = 0; i < 150; i++) { c.strokeStyle = random() < 0.5 ? 'rgba(255,240,200,0.3)' : 'rgba(0,0,0,0.3)'; c.lineWidth = 1; const x = random() * 256; c.beginPath(); c.moveTo(x, 44); c.lineTo(x + (random() - 0.5) * 8, 118); c.stroke(); }
      c.fillStyle = '#050506'; c.fillRect(0, 0, 256, a.realism === 'doll' ? 52 : 44 + mood.energy * 14);
      c.fillStyle = 'rgba(0,0,0,0.75)'; c.fillRect(0, 116, 256, 12);
    });
    const ballMat = new THREE.MeshPhysicalMaterial({ map: sclera, roughness: a.realism === 'cartoon' ? 0.45 : 0.12, clearcoat: a.realism === 'cartoon' ? 0 : 1 });
    const irisMat = new THREE.MeshPhysicalMaterial({
      map: irisMap, roughness: 0.1, clearcoat: 1,
      emissive: a.iris === 'red-led' ? '#ff2010' : '#000000', emissiveMap: a.iris === 'red-led' ? irisMap : null,
      emissiveIntensity: a.iris === 'red-led' && live ? mix(0.8, 2.6, mood.energy) : a.iris === 'red-led' ? 0.25 : 0,
    });
    const skinTone = new THREE.Color().setHSL(0.06, 0.42, mix(0.42, 0.7, random()));
    const lidCol = a.surround === 'skin' ? skinTone : new THREE.Color(a.surround === 'mask' ? '#ecebe6' : a.frame === 'printed' ? '#3a3c40' : '#8f8b84');
    const lidMat = new THREE.MeshStandardMaterial({ color: lidCol, roughness: 0.7, side: THREE.DoubleSide });

    const missing = a.build === 'one-eye' ? (random() < 0.5 ? 0 : 1) : -1;
    const makeBall = () => {
      const g = new THREE.Group();
      part(g, new THREE.SphereGeometry(R, 32, 20), ballMat);
      const cap = new THREE.SphereGeometry(R * 1.012, 32, 8, 0, Math.PI * 2, 0, irisAngle); cap.rotateX(Math.PI / 2);
      part(g, cap, irisMat);
      part(g, new THREE.CylinderGeometry(0.004, 0.004, 0.012, 8), steel, 0, 0, -R - 0.004).rotation.x = Math.PI / 2;
      return g;
    };
    const eyes: { ball: THREE.Group | null; upper: THREE.Mesh; lower: THREE.Mesh; base: [number, number]; horn: THREE.Object3D }[] = [];
    const baseGaze = (side: number): [number, number] => ({
      straight: [0, 0], crossed: [-side * 0.5, 0.05], away: [0.6, 0.08], up: [side * 0.05, -0.55], walleyed: [side * 0.55, side * 0.18], blink: [0, 0.1],
    } as Record<string, [number, number]>)[a.gaze];
    const lidOpen = a.gaze === 'blink' ? 0.12 : a.gaze === 'up' ? 1 : mix(0.82, 1, mood.energy);
    [-1, 1].forEach((side, index) => {
      const x = side * gap;
      const mount = new THREE.Group();
      mount.position.set(x, eyeY, eyeZ);
      s.root.add(mount);
      // Gimbal: a post and a horizontal ring behind the equator.
      part(s.root, new THREE.CylinderGeometry(0.003, 0.003, R * 0.5 + 0.012, 8), steel, x, eyeY - R - 0.004, eyeZ - 0.006);
      const ring = part(mount, new THREE.TorusGeometry(R + 0.004, 0.0022, 6, 28, Math.PI), frame, 0, 0, 0); ring.rotation.set(Math.PI / 2, 0, Math.PI); 
      for (const px of [-1, 1]) part(mount, new THREE.CylinderGeometry(0.003, 0.003, 0.006, 8), steel, px * (R + 0.004), 0, 0).rotation.z = Math.PI / 2;
      let ball: THREE.Group | null = null;
      if (index !== missing) { ball = makeBall(); mount.add(ball); }
      const up = new THREE.SphereGeometry(R * 1.09, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      const lo = new THREE.SphereGeometry(R * 1.07, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      const upper = part(mount, up, lidMat), lower = part(mount, lo, lidMat);
      // Servo for this eye, sitting on the base behind it, with a horn and pushrod.
      const sx = side * 0.07, sz = -0.022;
      part(s.root, new THREE.BoxGeometry(0.023, 0.027, 0.013), servoBlue, sx, 0.03, sz);
      part(s.root, new THREE.BoxGeometry(0.033, 0.002, 0.013), servoBlue, sx, 0.037, sz);
      part(s.root, new THREE.CylinderGeometry(0.005, 0.005, 0.005, 10), white, sx - side * 0.005, 0.046, sz);
      const horn = new THREE.Group(); horn.position.set(sx - side * 0.005, 0.05, sz);
      part(horn, new THREE.BoxGeometry(0.004, 0.0015, 0.022), white, 0, 0, 0.008);
      s.root.add(horn);
      rod(s.root, V(sx - side * 0.005, 0.051, sz + 0.018), V(x, eyeY - 0.004, eyeZ - R - 0.008), 0.0009, steel);
      // Lid servo on the cross bar.
      const lx = side * 0.09;
      part(s.root, new THREE.BoxGeometry(0.013, 0.023, 0.027), servoBlue, lx, 0.14, -0.024);
      part(s.root, new THREE.BoxGeometry(0.0015, 0.004, 0.02), white, lx - side * 0.008, 0.144, -0.012);
      rod(s.root, V(lx - side * 0.008, 0.146, -0.004), V(x + side * 0.012, eyeY + R * 0.9, eyeZ - 0.004), 0.0009, steel);
      eyes.push({ ball, upper, lower, base: baseGaze(side), horn });
    });
    const setLids = (open: number) => {
      for (const eye of eyes) { eye.upper.rotation.x = mix(0.32, -0.85, open); eye.lower.rotation.x = mix(-0.2, 0.8, open); }
    };
    const setGaze = (yaw: number, pitch: number) => {
      for (const eye of eyes) {
        if (eye.ball) eye.ball.rotation.set(eye.base[1] + pitch, eye.base[0] + yaw, 0, 'YXZ');
        eye.horn.rotation.y = (eye.base[0] + yaw) * 0.9;
      }
    };
    setLids(lidOpen); setGaze(0, 0);
    if (missing >= 0) {
      const loose = makeBall();
      loose.position.set((missing ? 1 : -1) * 0.095, 0.016 + R, 0.08);
      loose.rotation.set(-0.9 + random() * 0.5, random() * 6, random());
      s.root.add(loose);
    }

    // Surround.
    if (a.surround === 'brow') {
      part(s.root, new THREE.BoxGeometry(0.19, 0.012, 0.004), frame, 0, eyeY + R + 0.018, eyeZ + 0.012);
      const tilt = mix(-0.35, 0.3, mood.cheer);
      for (const side of [-1, 1]) {
        const brow = part(s.root, new THREE.BoxGeometry(0.056, 0.008, 0.008), dark, side * gap, eyeY + R + 0.008, eyeZ + 0.02);
        brow.rotation.z = side * tilt;
      }
    } else if (a.surround === 'skin' || a.surround === 'mask') {
      const shape = new THREE.Shape();
      const w = 0.1, h = a.surround === 'mask' ? 0.052 : 0.041;
      const n = 28;
      for (let i = 0; i <= n; i++) {
        const t = i / n * Math.PI * 2, jag = a.surround === 'skin' ? 1 + (random() - 0.5) * 0.14 : 1;
        const px = Math.cos(t) * w * jag, py = Math.sin(t) * h * jag * (Math.sin(t) < 0 && a.surround === 'mask' ? 1.25 : 1);
        if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py);
      }
      for (const side of [-1, 1]) { const hole = new THREE.Path(); hole.absellipse(side * gap, 0, R * 0.97, R * 0.86, 0, Math.PI * 2, true); shape.holes.push(hole); }
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.003, bevelEnabled: false, curveSegments: 20 });
      // Wrap it gently around the eyes.
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) - Math.pow(Math.abs(pos.getX(i)) / w, 2) * 0.02 - Math.pow(pos.getY(i) / h, 2) * 0.006);
      geo.computeVertexNormals();
      const skin = part(s.root, geo, new THREE.MeshStandardMaterial({ color: lidCol, roughness: a.surround === 'mask' ? 0.35 : 0.75, side: THREE.DoubleSide }), 0, eyeY, eyeZ + R * 0.72);
      skin.rotation.z = a.surround === 'skin' ? (random() - 0.5) * 0.06 : 0;
      if (a.surround === 'skin') for (const side of [-1, 1]) {
        const brow = part(s.root, new THREE.CapsuleGeometry(0.003, 0.03, 4, 8), new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 0.95 }), side * gap, eyeY + R + 0.004, eyeZ + R * 0.72 + 0.001);
        brow.rotation.z = Math.PI / 2 + side * mix(0.3, -0.2, mood.cheer);
      }
    }

    // Control board at the back with headers, a chip, an LED and servo leads.
    const board = new THREE.Group();
    board.position.set(0, 0.03, 0.092); board.rotation.x = 0.3;
    s.root.add(board);
    part(board, new THREE.BoxGeometry(0.09, 0.002, 0.045), new THREE.MeshStandardMaterial({ color: a.frame === 'brass' ? '#5a3a1c' : '#1f7a48', roughness: 0.5 }));
    part(board, new THREE.BoxGeometry(0.02, 0.004, 0.02), dark, -0.012, 0.003, 0);
    part(board, new THREE.BoxGeometry(0.012, 0.009, 0.014), steel, -0.037, 0.005, 0.008);
    part(board, new THREE.BoxGeometry(0.036, 0.008, 0.008), dark, 0.022, 0.005, 0.014);
    for (let i = 0; i < 5; i++) part(board, new THREE.CylinderGeometry(0.003, 0.003, 0.007, 8), new THREE.MeshStandardMaterial({ color: ['#2a4fa8', '#c9a544', '#2a4fa8', '#d8402c', '#c9a544'][i], roughness: 0.4 }), 0.004 + i * 0.009, 0.004, -0.012);
    const led = part(board, new THREE.SphereGeometry(0.003, 8, 6), new THREE.MeshStandardMaterial({ color: live ? '#55ff7a' : '#3a4a3e', emissive: live ? '#22ff55' : '#000000', emissiveIntensity: 2 }), -0.036, 0.004, -0.014);
    for (const z of [-1, 1]) for (const x of [-1, 1]) part(s.root, new THREE.CylinderGeometry(0.002, 0.002, 0.03, 6), steel, x * 0.04, 0.024, 0.092 + z * 0.014);
    const wireCols = ['#7a4a22', '#d8402c', '#f2a030'];
    const servoPorts = [V(-0.07, 0.022, -0.012), V(0.07, 0.022, -0.012), V(-0.09, 0.13, -0.012), V(0.09, 0.13, -0.012)];
    servoPorts.forEach((from, i) => {
      wireCols.forEach((col, k) => {
        const off = (k - 1) * 0.0022;
        const plugged = a.build !== 'unplugged';
        const end = plugged ? V(0.004 + i * 0.009 + off, 0.036, 0.08) : V(from.x * (1.05 + random() * 0.35), 0.018, 0.05 + random() * 0.05);
        const midY = plugged ? (from.y > 0.1 ? 0.07 : 0.03) + random() * 0.01 : from.y * 0.5 + 0.02;
        const curve = new THREE.CatmullRomCurve3([from.clone().add(V(off, 0, 0)), V(from.x * 1.25 + off, midY, from.z * 0.6 + end.z * 0.4), V(from.x * 0.75 + end.x * 0.25 + off, 0.045, end.z * 0.95), end]);
        part(s.root, new THREE.TubeGeometry(curve, 14, 0.0009, 4), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }));
      });
    });

    const speed = mix(0.4, 1.6, mood.energy);
    const hash = (n: number) => { const v = Math.sin(n * 127.1 + context.seed % 1000) * 43758.5453; return v - Math.floor(v); };
    return s.finish({
      update: (_dt, time) => {
        if (!live) return;
        const t = time * speed;
        let yaw = 0, pitch = 0;
        if (a.action === 'sweep') { yaw = Math.sin(t * 0.9) * 0.45; pitch = Math.sin(t * 0.37) * 0.08; }
        else { const k = Math.floor(t * 4); yaw = (hash(k) - 0.5) * 0.7; pitch = (hash(k + 31) - 0.5) * 0.3; }
        setGaze(yaw, pitch);
        const phase = (t * 0.45) % 1;
        const blink = phase > 0.93 ? Math.sin((phase - 0.93) / 0.07 * Math.PI) : 0;
        setLids(lidOpen * (1 - blink * 0.95));
        (led.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4 + Math.sin(time * 9) * 0.8;
      },
    });
  },
});
