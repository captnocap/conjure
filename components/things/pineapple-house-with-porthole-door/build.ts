import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const RIPENESS = {
  green: 'Underripe: green-gold skin with sharp lime leaves.',
  golden: 'The classic sunny golden yellow with bright green leaves.',
  orange: 'Deep ripe orange, sweet and warm, leaves darkening.',
  brown: 'Overripe brown-gold, going soft, leaves dull and drooping.',
} as const;
const SKIN: Record<keyof typeof RIPENESS, { body: string; line: string; eye: string; leaf: string }> = {
  green: { body: '#c9c441', line: '#8f8d2a', eye: '#5c5d1e', leaf: '#59b33b' },
  golden: { body: '#f2bd2e', line: '#c48a1c', eye: '#7d5212', leaf: '#3f9a3a' },
  orange: { body: '#ec8f2a', line: '#b85f14', eye: '#6e3a0e', leaf: '#2f7a37' },
  brown: { body: '#b8792e', line: '#7f4d1a', eye: '#4a2b0c', leaf: '#6d7a3a' },
};

/** Paints a wrapping diamond-scale pineapple skin: diagonal ridges with a dark eye in every cell. */
function pineappleSkin(skin: (typeof SKIN)[keyof typeof SKIN], cols: number, rows: number, wear: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = skin.body;
  ctx.fillRect(0, 0, 1024, 1024);
  const w = 1024 / cols, h = 1024 / rows;
  ctx.strokeStyle = skin.line;
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  for (let k = -rows - 1; k <= cols + 1; k++) {
    ctx.beginPath();
    ctx.moveTo(k * w, 0);
    ctx.lineTo(k * w + rows * w, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(k * w, 0);
    ctx.lineTo(k * w - rows * w, 1024);
    ctx.stroke();
  }
  for (let p = 0; p <= cols * 2; p++)
    for (let q = 0; q <= rows * 2; q++) {
      if ((p + q) % 2 === 0) continue;
      const x = p * w / 2, y = q * h / 2;
      ctx.fillStyle = skin.eye;
      ctx.beginPath();
      ctx.ellipse(x, y + h * 0.04, w * 0.09, h * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.ellipse(x - w * 0.05, y - h * 0.12, w * 0.07, h * 0.045, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  // Wear: soft bruises.
  if (wear > 0.3) {
    ctx.fillStyle = `rgba(70,40,10,${(wear - 0.3) * 0.8})`;
    for (let i = 0; i < Math.round(wear * 14); i++) {
      const x = ((i * 397) % 1024), y = ((i * 613) % 1024);
      ctx.beginPath();
      ctx.ellipse(x, y, 60 + (i % 3) * 30, 40 + (i % 2) * 25, i, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    ripeness: choice('How ripe is the pineapple?', RIPENESS),
    size: score('How big a house is it?', ['A one-room bungalow', 'A snug family home', 'A grand two-storey pineapple']),
    door: choice('What is the round door doing?', {
      closed: 'Shut tight, knob gleaming.',
      ajar: 'Half open, a glimpse of a dark hall.',
      open: 'Swung wide, as if someone just ran out.',
    }),
    lit: noul('Is the porch light on and the windows glowing from inside?'),
    portholes: choice('How are the porthole windows arranged?', {
      pair: 'One porthole per storey, neat and modest.',
      ship: 'Portholes all the way round, like a ship.',
      big: 'One big round window above the door.',
    }),
    beside: choice('What stands beside the door?', {
      nothing: 'Nothing but sand.',
      mailbox: 'A little tin mailbox on a post.',
      sign: 'A wooden signpost with a painted board.',
      sponges: 'A clay pot of bright tube sponges, like flowers.',
    }),
    sign: choice('If there is a sign, what does it say?', { home: 'HOME', welcome: 'WELCOME', snail: 'BEWARE OF SNAIL', closed: 'GONE JELLYFISHING' }),
    chimney: choice('What is the stub chimney doing?', {
      cold: 'Nothing, a cold pipe.',
      bubbles: 'Puffing a string of bubbles.',
      vane: 'Spinning a little fish weathervane.',
    }),
    doorstep: choice('What is on the doorstep?', {
      mat: 'A welcome mat and nothing else.',
      paper: 'A rolled newspaper dropped on the mat.',
      shells: 'A small pile of shells left as a gift.',
      bare: 'Bare sand, no mat at all.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const skin = SKIN[a.ripeness];
    const H = mix(3.6, 7.6, a.size);
    const R = H * 0.3;
    const shape = (t: number) => 0.68 + 0.32 * Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 0.8;
    const radiusAt = (y: number) => R * shape(y / H);

    // Body: a lathe sampled evenly in height so the painted scales stay square.
    const profile: [number, number][] = [[0, 0]];
    for (let i = 0; i <= 24; i++) profile.push([radiusAt(i / 24 * H), i / 24 * H]);
    profile.push([R * 0.3, H + R * 0.08], [0, H + R * 0.12]);
    const bodyPaint = new THREE.MeshStandardMaterial({ map: pineappleSkin(skin, 14, 8, mood.wear), roughness: 0.7 + mood.wear * 0.2, color: new THREE.Color('#ffffff').lerp(new THREE.Color('#8b8275'), mood.wear * 0.25) });
    s.lathe(profile, bodyPaint);

    const darkWood = s.material('#4a3222', { roughness: 0.7 });
    const doorPaint = s.material(mood.cheer > 0.4 ? '#2f7fd6' : '#2c5a8a', { roughness: 0.5 });
    const brass = s.material('#d9b14a', { metalness: 0.7, roughness: 0.3 });
    const glass = a.lit
      ? new THREE.MeshStandardMaterial({ color: '#ffe3a0', emissive: '#ffb347', emissiveIntensity: mix(1.1, 2, mood.daylight), roughness: 0.4 })
      : new THREE.MeshStandardMaterial({ color: '#9fd6ee', roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.75 });

    // Round door on the front, on a hinge at its left, tilted back to hug the bulge, with a stoop below.
    const doorR = R * 0.5;
    const doorY = doorR + 0.03 * R;
    const doorZ = radiusAt(doorY) - 0.01 * R;
    const doorTilt = -Math.atan2(radiusAt(doorY + doorR) - radiusAt(doorY - doorR), doorR * 2);
    const doorway = new THREE.Group();
    doorway.position.set(0, doorY, doorZ);
    doorway.rotation.x = doorTilt;
    s.root.add(doorway);
    const frame = new THREE.Mesh(new THREE.TorusGeometry(doorR, R * 0.07, 8, 40), darkWood);
    frame.position.z = 0.02 * R;
    frame.castShadow = true;
    const hall = new THREE.Mesh(new THREE.CylinderGeometry(doorR * 0.96, doorR * 0.96, 0.02 * R, 32), s.material('#1f1a2c'));
    hall.rotation.x = Math.PI / 2;
    hall.position.z = 0.03 * R;
    doorway.add(frame, hall);
    const hinge = new THREE.Group();
    hinge.position.set(-doorR, 0, 0.02 * R);
    const panel = new THREE.Mesh(new THREE.CylinderGeometry(doorR * 0.94, doorR * 0.94, 0.1 * R, 32), doorPaint);
    panel.rotation.x = Math.PI / 2;
    panel.position.set(doorR, 0, 0.03 * R);
    panel.castShadow = panel.receiveShadow = true;
    hinge.add(panel);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(R * 0.05, 12, 8), brass);
    knob.position.set(doorR * 1.65, -doorR * 0.05, 0.1 * R);
    knob.castShadow = true;
    hinge.add(knob);
    const peep = new THREE.Mesh(new THREE.CylinderGeometry(doorR * 0.24, doorR * 0.24, 0.12 * R, 20), glass);
    peep.rotation.x = Math.PI / 2;
    peep.position.set(doorR, doorR * 0.45, 0.03 * R);
    hinge.add(peep);
    hinge.rotation.y = { closed: 0, ajar: -0.7, open: -1.7 }[a.door];
    doorway.add(hinge);
    s.box([doorR * 2.4, 0.07 * R, R * 0.36], [0, 0.035 * R, radiusAt(0) + R * 0.08], s.material('#c9b58f', { roughness: 0.95 }));

    // Porthole windows: a brass ring and a glass disc, facing outward from the body.
    const portholes: [number, number, number][] = // [angle around y, height, radius]
      a.portholes === 'big' ? [[0, H * 0.62, R * 0.32]]
        : a.portholes === 'pair' ? [[0, H * 0.62, R * 0.24], [1.1, H * 0.3, R * 0.2]]
          : [[0, H * 0.62, R * 0.22], [1.2, H * 0.34, R * 0.2], [-1.2, H * 0.34, R * 0.2], [2.3, H * 0.62, R * 0.2], [-2.3, H * 0.62, R * 0.2], [Math.PI, H * 0.34, R * 0.2]];
    for (const [angle, y, pr] of portholes) {
      const r = radiusAt(y);
      const group = new THREE.Group();
      group.position.set(Math.sin(angle) * r, y, Math.cos(angle) * r);
      group.rotation.y = angle;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(pr, pr * 0.16, 8, 32), brass);
      rim.castShadow = true;
      const pane = new THREE.Mesh(new THREE.CylinderGeometry(pr * 0.95, pr * 0.95, 0.06, 24), glass);
      pane.rotation.x = Math.PI / 2;
      pane.position.z = -0.02;
      group.add(rim, pane);
      if (a.portholes === 'big') {
        for (const d of [0, Math.PI / 2]) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(pr * 1.9, pr * 0.07, 0.03), brass);
          bar.rotation.z = d;
          bar.position.z = 0.03;
          group.add(bar);
        }
      }
      s.root.add(group);
    }

    // Porch lamp over the door.
    const lampY = doorY + doorR + R * 0.16;
    const lampZ = radiusAt(lampY);
    s.rod([0, lampY, lampZ - 0.05 * R], [0, lampY + R * 0.06, lampZ + R * 0.16], R * 0.02, darkWood);
    s.ball([R * 0.09, R * 0.11, R * 0.09], [0, lampY, lampZ + R * 0.16], a.lit ? new THREE.MeshStandardMaterial({ color: '#fff1c0', emissive: '#ffcf6a', emissiveIntensity: 2.2 }) : glass, 12);

    // Leafy crown: three rings of flattened cones fanning out from the top.
    const leafPaint = s.material(skin.leaf, { roughness: 0.6, side: THREE.DoubleSide });
    const crown = new THREE.Group();
    crown.position.y = H + R * 0.05;
    const droop = a.ripeness === 'brown' ? 0.35 : 0;
    const rings: [number, number, number][] = [[7, 0.22, 0.62], [9, 0.62, 0.5], [11, 1.05 + droop, 0.4]];
    for (const [count, tilt, length] of rings) {
      const L = H * length;
      const geometry = new THREE.ConeGeometry(R * 0.16, L, 6);
      geometry.translate(0, L / 2, 0);
      const spin = random() * Math.PI * 2;
      for (let i = 0; i < count; i++) {
        const leaf = new THREE.Mesh(geometry, leafPaint);
        const angle = spin + i / count * Math.PI * 2 + (random() - 0.5) * 0.3;
        leaf.rotation.set(0, angle, 0);
        leaf.rotateX(tilt + (random() - 0.5) * 0.15);
        leaf.scale.set(1.2, 1, 0.45);
        leaf.castShadow = true;
        crown.add(leaf);
      }
    }
    s.root.add(crown);

    // Stub chimney on the shoulder, round the back.
    const chimneyAngle = 1.25;
    const cy = H * 0.8;
    const cr = radiusAt(cy) * 0.82;
    const chimneyAt: [number, number, number] = [Math.sin(chimneyAngle) * cr, cy, Math.cos(chimneyAngle) * cr];
    const pipe = s.material('#6d6f73', { metalness: 0.4, roughness: 0.5 });
    const chimneyTop = cy + R * 0.47;
    s.cylinder(R * 0.11, R * 0.11, R * 0.7, [chimneyAt[0], cy + R * 0.12, chimneyAt[2]], pipe, 12);
    s.cylinder(R * 0.15, R * 0.15, R * 0.06, [chimneyAt[0], chimneyTop, chimneyAt[2]], pipe, 12);
    const puffs: THREE.Mesh[] = [];
    if (a.chimney === 'bubbles') {
      const bubble = new THREE.MeshStandardMaterial({ color: '#dff4ff', transparent: true, opacity: 0.4, roughness: 0.1, depthWrite: false });
      for (let i = 0; i < 6; i++) {
        const puff = s.ball([1, 1, 1], [chimneyAt[0], chimneyTop + i * R * 0.22, chimneyAt[2]], bubble, 10);
        puff.scale.setScalar(R * (0.05 + i * 0.016));
        puff.castShadow = false;
        puffs.push(puff);
      }
    }
    let vane: THREE.Group | null = null;
    if (a.chimney === 'vane') {
      vane = new THREE.Group();
      vane.position.set(chimneyAt[0], chimneyTop + R * 0.25, chimneyAt[2]);
      const fish = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), brass);
      fish.scale.set(R * 0.18, R * 0.08, R * 0.04);
      fish.position.x = R * 0.1;
      const tail = new THREE.Mesh(new THREE.ConeGeometry(R * 0.07, R * 0.14, 3), brass);
      tail.rotation.z = Math.PI / 2;
      tail.position.x = -R * 0.1;
      fish.castShadow = tail.castShadow = true;
      vane.add(fish, tail);
      s.root.add(vane);
      s.rod([chimneyAt[0], chimneyTop, chimneyAt[2]], [chimneyAt[0], chimneyTop + R * 0.25, chimneyAt[2]], R * 0.015, pipe);
    }

    // Doorstep.
    const stepZ = radiusAt(0) + R * 0.3;
    if (a.doorstep !== 'bare') s.box([doorR * 1.5, 0.03, R * 0.4], [0, 0.015, stepZ], s.material(a.ripeness === 'brown' ? '#5c4a3a' : '#8a4a3b', { roughness: 0.95 }));
    if (a.doorstep === 'paper') {
      const paper = s.cylinder(R * 0.05, R * 0.05, R * 0.3, [doorR * 0.3, R * 0.05 + 0.03, stepZ + 0.05], s.material('#e9e3d2'), 10);
      paper.rotation.z = Math.PI / 2;
      paper.rotation.y = 0.4;
    }
    if (a.doorstep === 'shells') {
      const shell = s.material('#f3e2cf', { roughness: 0.5 });
      for (let i = 0; i < 5; i++) s.ball([R * 0.08, R * 0.04, R * 0.07], [(random() - 0.5) * doorR * 0.9, R * 0.04 + 0.03, stepZ + (random() - 0.5) * R * 0.2], shell, 10);
    }

    // Something beside the door.
    const sideX = doorR + R * 0.55;
    const sideZ = radiusAt(0) + R * 0.1;
    if (a.beside === 'mailbox') {
      s.cylinder(R * 0.03, R * 0.035, R * 0.5, [sideX, R * 0.25, sideZ], darkWood, 8);
      const box = s.box([R * 0.16, R * 0.16, R * 0.28], [sideX, R * 0.58, sideZ], s.material('#c8c9cc', { metalness: 0.5, roughness: 0.4 }));
      box.rotation.y = -0.3;
      s.rod([sideX + R * 0.09, R * 0.6, sideZ], [sideX + R * 0.09, R * 0.78, sideZ], R * 0.012, s.material('#d23c2d'));
    }
    if (a.beside === 'sign') {
      s.cylinder(R * 0.03, R * 0.035, R * 0.7, [sideX, R * 0.35, sideZ], darkWood, 8);
      const text = { home: 'HOME', welcome: 'WELCOME', snail: 'BEWARE OF SNAIL', closed: 'GONE JELLYFISHING' }[a.sign];
      s.box([R * 0.5, R * 0.2, R * 0.03], [sideX, R * 0.72, sideZ], s.material('#9a7044'));
      s.label(text, R * 0.46, R * 0.16, [sideX, R * 0.72, sideZ + R * 0.017], '#2c2418', '#e3d2a4');
    }
    if (a.beside === 'sponges') {
      s.cylinder(R * 0.14, R * 0.1, R * 0.2, [sideX, R * 0.1, sideZ], s.material('#b3623a', { roughness: 0.9 }), 14);
      const tints = ['#ff6b8a', '#ffa43b', '#b35cff', '#3fd3c8'];
      for (let i = 0; i < 4; i++) {
        const tube = s.cylinder(R * 0.035, R * 0.03, R * (0.35 + random() * 0.2), [sideX + (random() - 0.5) * R * 0.14, R * 0.38, sideZ + (random() - 0.5) * R * 0.14], s.material(tints[i], { emissive: tints[i], emissiveIntensity: mix(0.05, 0.3, mood.cheer) }), 8);
        tube.rotation.z = (random() - 0.5) * 0.4;
      }
    }

    const speed = mix(0.2, 1.6, mood.energy);
    return s.finish({
      footprint: R * 1.05,
      update: (dt, time) => {
        crown.rotation.z = Math.sin(time * 0.7 * speed) * 0.015 * speed;
        crown.rotation.x = Math.cos(time * 0.5 * speed) * 0.012 * speed;
        if (vane) vane.rotation.y += dt * speed * 1.5;
        for (const [i, puff] of puffs.entries()) {
          puff.position.y += dt * speed * R * 0.2;
          if (puff.position.y > chimneyTop + R * 1.4) puff.position.y = chimneyTop;
          puff.position.x = chimneyAt[0] + Math.sin(time * 1.3 + i) * R * 0.03;
        }
      },
    });
  },
});
