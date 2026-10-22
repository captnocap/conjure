import * as THREE from 'three';

/** A painted eyeball shared by the face-part components in this owner's folder (copied, not imported across). */
export type Pupil = 'pinpoint' | 'normal' | 'blown' | 'slit' | 'keyhole';

export interface EyeSpec {
  /** Radius in metres. */
  r: number;
  iris: string;
  pupil: Pupil;
  sclera?: string;
  /** 0 clear … 1 angry red web. */
  veins?: number;
  veinColour?: string;
  /** 0 clear … 1 milk-blue cataract. */
  cloud?: number;
  /** Surface roughness of the white: 0.08 wet, 0.9 dried. */
  rough?: number;
  /** 0 none … 1 mottled with dark decay. */
  blotch?: number;
  /** Half-angle of the iris cap, radians. */
  irisAngle?: number;
  random: () => number;
}

const css = (colour: THREE.Color) => `#${colour.getHexString()}`;

export function pupilRadius(pupil: Pupil, angle: number) {
  if (pupil === 'pinpoint') return 0.15;
  if (pupil === 'blown') return 0.8;
  if (pupil === 'slit') {
    const a = 0.1, b = 0.84;
    return (a * b) / Math.hypot(b * Math.cos(angle), a * Math.sin(angle));
  }
  if (pupil === 'keyhole') {
    // A round pupil with a notch running down to the rim: a coloboma.
    const off = Math.abs(Math.atan2(Math.sin(angle - Math.PI / 2), Math.cos(angle - Math.PI / 2)));
    return off < 0.34 ? 0.92 - off * 0.6 : 0.36;
  }
  return 0.4;
}

export function irisTexture(spec: Pick<EyeSpec, 'iris' | 'pupil' | 'cloud' | 'random'>) {
  const W = 256, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const base = new THREE.Color(spec.iris);
  const light = base.clone().lerp(new THREE.Color('#fff2c8'), 0.4);
  const dark = base.clone().multiplyScalar(0.5);
  // Rows run from the pupil (top) out to the limbus (bottom); columns run round the iris.
  const fall = ctx.createLinearGradient(0, 0, 0, H);
  fall.addColorStop(0, css(light));
  fall.addColorStop(0.5, css(base));
  fall.addColorStop(0.84, css(dark));
  fall.addColorStop(0.9, '#17130f');
  fall.addColorStop(1, '#17130f');
  ctx.fillStyle = fall;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    const x = spec.random() * W;
    const from = spec.random() * H * 0.5;
    const to = from + H * (0.15 + spec.random() * 0.45);
    ctx.strokeStyle = spec.random() < 0.55 ? `rgba(255,246,214,${0.08 + spec.random() * 0.26})` : `rgba(10,8,6,${0.08 + spec.random() * 0.24})`;
    ctx.lineWidth = 0.6 + spec.random() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, from);
    ctx.lineTo(x + (spec.random() - 0.5) * 5, Math.min(to, H * 0.86));
    ctx.stroke();
  }
  const cloud = spec.cloud ?? 0;
  ctx.fillStyle = cloud > 0.5 ? '#3a4650' : '#060606';
  for (let x = 0; x < W; x++) ctx.fillRect(x, 0, 1.2, pupilRadius(spec.pupil, (x / W) * Math.PI * 2) * H);
  if (cloud > 0) {
    ctx.fillStyle = `rgba(206,222,232,${Math.min(0.92, cloud * 0.85)})`;
    ctx.fillRect(0, 0, W, H * 0.9);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

export function scleraTexture(spec: Pick<EyeSpec, 'sclera' | 'veins' | 'veinColour' | 'blotch' | 'random'>) {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const white = new THREE.Color(spec.sclera ?? '#f3efe6');
  const veins = spec.veins ?? 0.15;
  // The top of the canvas is the front of the eye, the bottom is the back where vessels gather.
  const fall = ctx.createLinearGradient(0, 0, 0, H);
  fall.addColorStop(0, css(white));
  fall.addColorStop(0.45, css(white.clone().lerp(new THREE.Color('#e9b9ae'), 0.1 + veins * 0.3)));
  fall.addColorStop(1, css(white.clone().lerp(new THREE.Color('#c96f66'), 0.3 + veins * 0.4)));
  ctx.fillStyle = fall;
  ctx.fillRect(0, 0, W, H);
  const blotch = spec.blotch ?? 0;
  for (let i = 0; i < blotch * 46; i++) {
    const x = spec.random() * W, y = H * (0.12 + spec.random() * 0.88), size = 8 + spec.random() * 44;
    const spot = ctx.createRadialGradient(x, y, 0, x, y, size);
    const tone = spec.random() < 0.5 ? '52,64,38' : '74,48,60';
    spot.addColorStop(0, `rgba(${tone},${0.35 + spec.random() * 0.4})`);
    spot.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = spot;
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
  }
  ctx.strokeStyle = spec.veinColour ?? '#b3221f';
  ctx.lineCap = 'round';
  const crawl = (x: number, y: number, width: number, reach: number) => {
    let heading = -Math.PI / 2 + (spec.random() - 0.5) * 0.8;
    for (let step = 0; step < 34 && y > reach && width > 0.25; step++) {
      const nx = x + Math.cos(heading) * 7, ny = y + Math.sin(heading) * 7;
      ctx.globalAlpha = Math.min(1, 0.35 + veins * 0.6);
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      x = nx;
      y = ny;
      heading += (spec.random() - 0.5) * 0.9;
      heading = heading * 0.85 + (-Math.PI / 2) * 0.15;
      width *= 0.95;
      if (spec.random() < 0.13) crawl(x, y, width * 0.6, reach + 10);
    }
  };
  const count = Math.round(4 + veins * 64);
  for (let i = 0; i < count; i++) crawl(spec.random() * W, H * (0.6 + spec.random() * 0.4), 1 + veins * 2.6 * spec.random() + 0.6, H * (0.44 - veins * 0.26 + spec.random() * 0.12));
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/**
 * An eyeball centred on the origin and looking along +z. Turn `ball` to aim the gaze; the
 * catch-light stays put on `group` so the eye still looks wet whichever way it rolls.
 */
export function makeEye(spec: EyeSpec) {
  const { r } = spec;
  const angle = spec.irisAngle ?? 0.54;
  const group = new THREE.Group();
  const ball = new THREE.Group();
  group.add(ball);
  const rough = spec.rough ?? 0.14;

  const white = new THREE.Mesh(
    new THREE.SphereGeometry(r, 48, 28),
    new THREE.MeshStandardMaterial({ map: scleraTexture(spec), roughness: rough }),
  );
  white.rotation.x = Math.PI / 2;
  const iris = new THREE.Mesh(
    new THREE.SphereGeometry(r * 1.006, 56, 10, 0, Math.PI * 2, 0, angle),
    new THREE.MeshStandardMaterial({ map: irisTexture(spec), roughness: Math.min(0.9, rough + 0.12) }),
  );
  iris.rotation.x = Math.PI / 2;
  // The cornea is a steeper dome sitting over the iris.
  const rim = r * Math.sin(angle);
  const dome = r * 0.72;
  const domeAngle = Math.asin(Math.min(0.999, rim / dome));
  const cornea = new THREE.Mesh(
    new THREE.SphereGeometry(dome, 40, 8, 0, Math.PI * 2, 0, domeAngle),
    new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, roughness: Math.min(0.6, rough * 0.4), depthWrite: false, clearcoat: 1 }),
  );
  cornea.rotation.x = Math.PI / 2;
  cornea.position.z = r * Math.cos(angle) - dome * Math.cos(domeAngle);
  white.castShadow = white.receiveShadow = true;
  ball.add(white, iris, cornea);

  const glint = new THREE.Mesh(
    new THREE.SphereGeometry(1, 14, 8),
    new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1, roughness: 0.2 }),
  );
  const towards = new THREE.Vector3(-0.36, 0.56, 0.75).normalize();
  glint.position.copy(towards).multiplyScalar(r * 1.012);
  glint.scale.set(r * 0.15, r * 0.1, r * 0.012);
  glint.lookAt(towards.clone().multiplyScalar(r * 3));
  glint.visible = rough < 0.5;
  group.add(glint);
  return { group, ball, glint };
}
