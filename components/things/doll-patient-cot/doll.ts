import * as THREE from 'three';

/** A doll's head: a lathe-turned shell with a painted face, glass eyes and damage. Local helper. */
export type Expression = 'sweet' | 'blank' | 'startled' | 'sly';
export type Damage = 'cheek' | 'forehead' | 'gold' | 'shatter' | 'socket-left' | 'socket-right';

export interface HeadOptions {
  /** Chin to crown, metres. */
  h: number;
  skin: string;
  roughness: number;
  expression: Expression;
  /** Which glass eyes are present. */
  leftEye: boolean;
  rightEye: boolean;
  iris: string;
  /** 0 wide open … 1 closed. */
  lid: number;
  crown: 'closed' | 'open' | 'caved';
  /** 0 unpainted blank … 1 fully painted. */
  paint: number;
  /** Only the +x half of the face has been painted. */
  halfPaint?: boolean;
  damage: readonly Damage[];
  /** 0 clean … 1 crazed and filthy. */
  wear: number;
  /** 0 none … 1 scorched black from one side. */
  soot?: number;
  /** 0 none … 1 cheeks and nose rubbed back to the bare material. */
  rub?: number;
  random: () => number;
}

export interface Head {
  group: THREE.Group;
  /** Surface radius at a height above the neck base, metres. */
  radius(y: number): number;
  /** Height of the middle of the skull above the neck base. */
  centre: number;
  /** Height of the top (or of the cut rim when the crown is open). */
  top: number;
}

const TAU = Math.PI * 2;
const W = 1024, H = 512, SPAN = 1.2;

export function dollHead(o: HeadOptions): Head {
  const { h, random } = o;
  const yc = 0.66 * h, ry = 0.52 * h, rx = 0.42 * h;
  const radius = (y: number) => {
    const s = (y - yc) / ry;
    const skull = Math.abs(s) < 1 ? rx * Math.sqrt(1 - s * s) * (1 - 0.1 * s) : 0;
    const neck = y < 0.24 * h ? 0.19 * h + 0.06 * h * Math.max(0, 1 - y / (0.06 * h)) : 0;
    return Math.max(skull, neck);
  };
  const cut = o.crown === 'closed' ? 1 : o.crown === 'open' ? 0.74 : 0.5;
  const topY = yc + ry * cut;
  const profile: THREE.Vector2[] = [];
  const steps = 34;
  for (let i = 0; i <= steps; i++) {
    // Ease toward the pole so the crown stays round.
    const t = i / steps;
    const y = o.crown === 'closed' ? (yc + ry) * Math.sin(t * Math.PI / 2) ** 0.9 : topY * t;
    profile.push(new THREE.Vector2(Math.max(radius(Math.min(y, yc + ry - 1e-6)), o.crown === 'closed' && i === steps ? 0 : 0.0005), y));
  }
  const geometry = new THREE.LatheGeometry(profile, 40);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
  const n = profile.length;
  if (o.crown === 'caved') {
    // A broken rim: each column of the top rings drops by a different amount.
    const drops = Array.from({ length: 40 }, () => random());
    for (let i = 0; i <= 40; i++) {
      const d = drops[i % 40], d2 = drops[(i + 1) % 40];
      const drop = (d * 0.7 + d2 * 0.3) * 0.2 * h * (Math.cos((i / 40) * TAU * 2 + 1) * 0.5 + 0.8);
      for (let j = n - 3; j < n; j++) {
        const index = i * n + j;
        const weight = (j - (n - 4)) / 3;
        const y = position.getY(index) - drop * weight + (j === n - 1 ? 0.16 * h * (Math.sin((i / 40) * TAU) * 0.5 + 0.2) : 0);
        const r = radius(Math.max(0, Math.min(y, yc + ry - 1e-6)));
        const a = (i / 40) * TAU;
        position.setXYZ(index, r * Math.sin(a), y, r * Math.cos(a));
      }
    }
  }
  for (let i = 0; i < uv.count; i++) uv.setY(i, position.getY(i) / (SPAN * h));
  geometry.computeVertexNormals();

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const X = (a: number) => (0.5 + a / TAU) * W;
  const Y = (y: number) => (1 - y / SPAN) * H; // y in units of h
  const U = 400; // pixels per head height
  const base = new THREE.Color(o.skin);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, W, H);
  const eyeY = 0.63, eyeA = 0.43, eyeR = (o.expression === 'startled' ? 0.1 : 0.085);
  const paintSide = (draw: () => void) => {
    ctx.save();
    if (o.halfPaint) {
      ctx.beginPath();
      ctx.rect(X(0.02), 0, W, H);
      ctx.clip();
    }
    ctx.globalAlpha = Math.min(1, o.paint);
    draw();
    ctx.restore();
  };
  if (o.paint > 0.02) {
    paintSide(() => {
      // Blush.
      for (const side of [-1, 1]) {
        const gx = X(side * 0.68), gy = Y(0.42);
        const g = ctx.createRadialGradient(gx, gy, 2, gx, gy, 0.17 * U);
        g.addColorStop(0, `rgba(226,96,96,${0.62 * (1 - (o.rub ?? 0))})`);
        g.addColorStop(1, 'rgba(226,96,96,0)');
        ctx.fillStyle = g;
        ctx.fillRect(gx - 90, gy - 90, 180, 180);
      }
      // Brows.
      ctx.strokeStyle = '#6a4630';
      ctx.lineWidth = 0.02 * U;
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const lift = o.expression === 'startled' ? 0.07 : o.expression === 'sly' && side > 0 ? 0.06 : 0;
        const tilt = o.expression === 'sly' ? (side > 0 ? -0.03 : 0.035) : o.expression === 'sweet' ? -0.012 : 0;
        const y0 = eyeY + 0.2 + lift;
        ctx.beginPath();
        ctx.moveTo(X(side * (eyeA - 0.2)), Y(y0 - tilt));
        ctx.quadraticCurveTo(X(side * eyeA), Y(y0 + (o.expression === 'blank' ? 0.005 : 0.045)), X(side * (eyeA + 0.24)), Y(y0 - 0.01 + tilt));
        ctx.stroke();
      }
      // Lashes and socket line.
      ctx.strokeStyle = '#2c1c14';
      ctx.lineWidth = 0.008 * U;
      for (const side of [-1, 1]) {
        const cx = X(side * eyeA), cy = Y(eyeY);
        for (let k = -4; k <= 4; k++) {
          const a = -Math.PI / 2 + k * 0.3;
          const r0 = eyeR * U * 1.0, r1 = eyeR * U * 1.42;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r0 * 1.12, cy + Math.sin(a) * r0);
          ctx.lineTo(cx + Math.cos(a) * r1 * 1.12, cy + Math.sin(a) * r1);
          ctx.stroke();
        }
      }
      // Nostrils.
      ctx.fillStyle = '#c0605a';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(X(side * 0.065), Y(0.445), 0.012 * U, 0, TAU);
        ctx.fill();
      }
      // Mouth.
      const my = Y(0.31), mx = X(0);
      ctx.fillStyle = '#b3282f';
      ctx.strokeStyle = '#7d1a22';
      ctx.lineWidth = 0.008 * U;
      if (o.expression === 'startled') {
        ctx.beginPath();
        ctx.ellipse(mx, my, 0.05 * U, 0.062 * U, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#3a0d12';
        ctx.beginPath();
        ctx.ellipse(mx, my, 0.026 * U, 0.036 * U, 0, 0, TAU);
        ctx.fill();
      } else {
        const w = (o.expression === 'sweet' ? 0.105 : 0.12) * U;
        const curl = o.expression === 'sweet' ? 0.035 * U : o.expression === 'sly' ? 0.02 * U : 0;
        const skew = o.expression === 'sly' ? 0.05 * U : 0;
        ctx.beginPath();
        ctx.moveTo(mx - w, my - curl + skew * 0.4);
        ctx.quadraticCurveTo(mx - w * 0.45, my - 0.05 * U, mx, my - 0.022 * U);
        ctx.quadraticCurveTo(mx + w * 0.45, my - 0.05 * U, mx + w, my - curl - skew);
        ctx.quadraticCurveTo(mx, my + 0.075 * U + curl * 0.6, mx - w, my - curl + skew * 0.4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(mx - w, my - curl + skew * 0.4);
        ctx.quadraticCurveTo(mx, my + 0.012 * U + curl * 0.5, mx + w, my - curl - skew);
        ctx.stroke();
      }
    });
  }
  // Rubbed-away paint on the high points.
  if ((o.rub ?? 0) > 0.05) {
    ctx.fillStyle = `#${base.clone().lerp(new THREE.Color('#fff4e6'), 0.5).getHexString()}`;
    for (let i = 0; i < 26 * (o.rub ?? 0); i++) {
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.ellipse(X((random() - 0.5) * 1.5), Y(0.25 + random() * 0.7), (0.02 + random() * 0.05) * U, (0.015 + random() * 0.04) * U, random() * 3, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // Crazing and grime.
  const wear = o.wear;
  if (wear > 0.08) {
    ctx.strokeStyle = `rgba(70,52,40,${0.12 + wear * 0.4})`;
    ctx.lineWidth = 1;
    const cells = Math.round(40 + wear * 220);
    for (let i = 0; i < cells; i++) {
      let px = random() * W, py = random() * H;
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (let k = 0; k < 4; k++) {
        px += (random() - 0.5) * 46;
        py += (random() - 0.5) * 46;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    for (let i = 0; i < wear * 46; i++) {
      const gx = random() * W, gy = random() * H, gr = 20 + random() * 70;
      const g = ctx.createRadialGradient(gx, gy, 1, gx, gy, gr);
      g.addColorStop(0, `rgba(74,58,40,${0.1 + wear * 0.26})`);
      g.addColorStop(1, 'rgba(74,58,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
  }
  if ((o.soot ?? 0) > 0.02) {
    const g = ctx.createLinearGradient(X(-2.5), 0, X(0.35), 0);
    g.addColorStop(0, `rgba(18,14,12,${0.97 * o.soot!})`);
    g.addColorStop(0.6, `rgba(40,26,18,${0.7 * o.soot!})`);
    g.addColorStop(1, 'rgba(60,40,24,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(18,14,12,${0.9 * o.soot!})`;
    ctx.fillRect(X(2.2), 0, W, H);
    for (let i = 0; i < 30; i++) {
      ctx.globalAlpha = 0.5 * o.soot!;
      ctx.beginPath();
      ctx.ellipse(X(-1.6 + random() * 1.5), Y(random() * 1.2), 8 + random() * 30, 14 + random() * 50, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // Cracks.
  const crack = (a: number, y: number, heading: number, length: number, width: number, colour: string, depth = 0) => {
    let px = X(a), py = Y(y);
    const points: [number, number][] = [[px, py]];
    const segs = Math.round(length / 0.045);
    for (let k = 0; k < segs; k++) {
      heading += (random() - 0.5) * 1.1;
      px += Math.cos(heading) * 0.045 * U;
      py += Math.sin(heading) * 0.045 * U;
      points.push([px, py]);
      if (depth < 2 && random() < 0.22) crack((px / W - 0.5) * TAU, (1 - py / H) * SPAN, heading + (random() < 0.5 ? 1 : -1) * (0.6 + random() * 0.6), length * 0.4, width * 0.6, colour, depth + 1);
    }
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'round';
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    points.forEach(([qx, qy], k) => (k ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy)));
    ctx.stroke();
    if (colour !== '#1d1512') {
      ctx.strokeStyle = '#fff0a8';
      ctx.lineWidth = Math.max(1, width * 0.25);
      ctx.stroke();
    }
  };
  const hole = (a: number, y: number, size: number) => {
    const cx = X(a), cy = Y(y), count = 9;
    const pts: [number, number][] = [];
    for (let k = 0; k < count; k++) {
      const ang = (k / count) * TAU, r = size * U * (0.6 + random() * 0.6);
      pts.push([cx + Math.cos(ang) * r * 1.1, cy + Math.sin(ang) * r]);
    }
    ctx.beginPath();
    pts.forEach(([qx, qy], k) => (k ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy)));
    ctx.closePath();
    ctx.fillStyle = '#17110f';
    ctx.fill();
    ctx.strokeStyle = '#fff8ee';
    ctx.lineWidth = 3;
    ctx.stroke();
    for (const [qx, qy] of pts) if (random() < 0.6) crack((qx / W - 0.5) * TAU, (1 - qy / H) * SPAN, Math.atan2(qy - cy, qx - cx), 0.16, 2.6, '#1d1512', 1);
  };
  const dark = '#1d1512';
  for (const d of o.damage) {
    if (d === 'cheek') crack(0.62 + random() * 0.1, 0.78, Math.PI / 2 + 0.25, 0.6, 8, dark);
    if (d === 'forehead') {
      const a0 = (random() - 0.5) * 0.4;
      for (let k = 0; k < 6; k++) crack(a0, 0.98, (k / 6) * TAU + random(), 0.3, 6.5, dark, 1);
    }
    if (d === 'gold') {
      crack(-0.75, 1.02, 0.75, 0.95, 15, '#c9951c', 1);
      crack(0.2, 0.52, 1.9, 0.3, 11, '#c9951c', 2);
    }
    if (d === 'shatter') {
      hole(-0.55 - random() * 0.1, 0.4 + random() * 0.08, 0.16);
      crack(-0.3, 0.6, -Math.PI / 2 - 0.3, 0.5, 7, dark);
    }
    if (d === 'socket-left') hole(-eyeA, eyeY, 0.125);
    if (d === 'socket-right') hole(eyeA, eyeY, 0.125);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const group = new THREE.Group();
  const shellMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: o.roughness, side: o.crown === 'closed' ? THREE.FrontSide : THREE.DoubleSide });
  const shell = new THREE.Mesh(geometry, shellMaterial);
  shell.rotation.y = Math.PI;
  shell.castShadow = shell.receiveShadow = true;
  group.add(shell);
  const add = (mesh: THREE.Mesh) => {
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  const skin = new THREE.MeshStandardMaterial({ color: base.clone().lerp(new THREE.Color('#4a3a28'), wear * 0.18 + (o.soot ?? 0) * 0.3), roughness: o.roughness });
  const inside = new THREE.MeshStandardMaterial({ color: '#1b1512', roughness: 1 });
  if (o.crown !== 'closed') {
    // The hollow seen through the open crown.
    const lining = add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), inside));
    lining.scale.set(rx * 0.93, ry * (o.crown === 'open' ? 0.66 : 0.3), rx * 0.93);
    lining.position.y = yc;
    lining.castShadow = false;
    if (o.crown === 'open') {
      const rim = add(new THREE.Mesh(new THREE.TorusGeometry(radius(topY) * 0.99, 0.012 * h, 6, 32), skin));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = topY;
    }
  }
  // Nose and ears.
  const noseY = 0.49 * h;
  const nose = add(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), skin));
  nose.scale.set(0.05 * h, 0.05 * h, 0.055 * h);
  nose.position.set(0, noseY, radius(noseY) * 0.99);
  for (const side of [-1, 1]) {
    const ear = add(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), skin));
    ear.scale.set(0.035 * h, 0.085 * h, 0.06 * h);
    ear.position.set(side * radius(0.58 * h) * 0.98, 0.58 * h, -0.02 * h);
  }
  // Glass eyes.
  const white = new THREE.MeshStandardMaterial({ color: '#f5f1e8', roughness: 0.12 });
  const iris = new THREE.MeshStandardMaterial({ color: o.iris, roughness: 0.15 });
  const pupil = new THREE.MeshStandardMaterial({ color: '#0b0a0a', roughness: 0.1 });
  const er = eyeR * h;
  for (const side of [-1, 1]) {
    const present = side < 0 ? o.leftEye : o.rightEye;
    const y = eyeY * h, r = radius(y) - er * 0.62;
    const a = side * eyeA;
    const eye = new THREE.Group();
    eye.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
    eye.rotation.y = a * 0.55;
    group.add(eye);
    if (!present) {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(er * 1.02, 14, 10), inside);
      socket.scale.z = 0.55;
      socket.position.z = er * 0.42;
      eye.add(socket);
      continue;
    }
    const ball = new THREE.Mesh(new THREE.SphereGeometry(er, 18, 12), white);
    ball.castShadow = true;
    eye.add(ball);
    const gaze = o.expression === 'sly' ? 0.45 : 0;
    const look = new THREE.Group();
    look.rotation.y = gaze;
    eye.add(look);
    const disc = new THREE.Mesh(new THREE.SphereGeometry(er * 0.62, 16, 10), iris);
    disc.scale.z = 0.3;
    disc.position.z = er * 0.84;
    look.add(disc);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(er * 0.3, 12, 8), pupil);
    dot.scale.z = 0.3;
    dot.position.z = er * 0.96;
    look.add(dot);
    const lid = o.expression === 'sly' ? Math.max(o.lid, 0.45) : o.lid;
    if (lid > 0.05) {
      const cover = new THREE.Mesh(new THREE.SphereGeometry(er * 1.06, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), skin);
      cover.rotation.x = -Math.PI / 2 + lid * Math.PI;
      eye.add(cover);
    }
  }
  return { group, radius, centre: yc, top: topY };
}

/** Painted or woven cloth for dresses and blankets. */
export function cloth(colour: string, pattern: 'plain' | 'gingham' | 'stripe' | 'dots' | 'floral', accent: string, wear: number, random: () => number, soot = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = accent;
  if (pattern === 'gingham') {
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(i * 32, 0, 16, 256);
      ctx.fillRect(0, i * 32, 256, 16);
    }
  } else if (pattern === 'stripe') {
    for (let i = 0; i < 8; i++) ctx.fillRect(i * 32, 0, 10, 256);
  } else if (pattern === 'dots') {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      ctx.beginPath();
      ctx.arc(i * 32 + (j % 2) * 16 + 8, j * 32 + 8, 6, 0, TAU);
      ctx.fill();
    }
  } else if (pattern === 'floral') {
    for (let i = 0; i < 26; i++) {
      const x = random() * 256, y = random() * 256;
      for (let p = 0; p < 5; p++) {
        ctx.beginPath();
        ctx.arc(x + Math.cos(p * 1.257) * 7, y + Math.sin(p * 1.257) * 7, 5, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#f2d26a';
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = accent;
    }
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < wear * 30; i++) {
    const gx = random() * 256, gy = random() * 256, gr = 14 + random() * 50;
    const g = ctx.createRadialGradient(gx, gy, 1, gx, gy, gr);
    g.addColorStop(0, `rgba(92,78,58,${0.08 + wear * 0.18})`);
    g.addColorStop(1, 'rgba(92,78,58,0)');
    ctx.fillStyle = g;
    ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
  }
  if (soot > 0) {
    const g = ctx.createLinearGradient(0, 256, 0, 60);
    g.addColorStop(0, `rgba(14,11,10,${soot})`);
    g.addColorStop(1, 'rgba(14,11,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
