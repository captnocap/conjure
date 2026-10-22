import * as THREE from 'three';

/** Sand shifts toward orange in warm scenes and toward moonlit grey-blue in cold ones. */
export function sandTone(base: string, warmth: number) {
  return new THREE.Color(base).lerp(new THREE.Color(warmth > 0.5 ? '#e8944a' : '#aab3c6'), Math.abs(warmth - 0.5) * 0.55);
}

const hex = (colour: THREE.Color) => `#${colour.getHexString()}`;

/** Wind ripples: paired dark and light wavering lines, plus a speckle of grit. */
export function rippleTexture(random: () => number, base: THREE.Color, strength = 1, rows = 30) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const g = canvas.getContext('2d')!;
  g.fillStyle = hex(base);
  g.fillRect(0, 0, 512, 512);
  const dark = hex(base.clone().multiplyScalar(0.66));
  const light = hex(base.clone().lerp(new THREE.Color('#fff8e4'), 0.55));
  const gap = 512 / rows;
  for (let row = -1; row <= rows; row++) {
    const phase = random() * 6.28, sway = 2 + random() * gap * 0.35, wave = 2 + Math.floor(random() * 3);
    for (const [offset, colour, alpha] of [[0, dark, 0.55], [gap * 0.38, light, 0.6]] as const) {
      g.strokeStyle = colour;
      g.globalAlpha = alpha * strength;
      g.lineWidth = gap * 0.3;
      g.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const y = row * gap + offset + sway * Math.sin((x / 512) * Math.PI * 2 * wave + phase) + gap * 0.5;
        if (x) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    }
  }
  for (let i = 0; i < 900; i++) {
    g.globalAlpha = 0.25;
    g.fillStyle = random() < 0.5 ? dark : light;
    g.fillRect(random() * 512, random() * 512, 2, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface SandOptions {
  radius: number;
  colour: THREE.Color;
  random: () => number;
  /** Extra height in metres at a point, before the edge feathers to nothing. */
  height?: (x: number, z: number) => number;
  ripple?: number;
  rows?: number;
  dome?: number;
  /** Stretch along x, for long patches. */
  stretch?: number;
}

/** A ragged-edged patch of rippled sand that feathers down to y = 0, and a way to ask its height. */
export function sandGround(options: SandOptions) {
  const { radius, random } = options;
  const stretch = options.stretch ?? 1;
  const p1 = random() * 6.28, p2 = random() * 6.28;
  const dome = options.dome ?? radius * 0.05;
  const rim = (angle: number) => 1 + 0.07 * Math.sin(3 * angle + p1) + 0.04 * Math.sin(7 * angle + p2);
  const y = (x: number, z: number) => {
    const sx = x / stretch;
    const t = Math.min(1, Math.hypot(sx, z) / (radius * rim(Math.atan2(z, sx))));
    const k = Math.min(1, Math.max(0, (t - 0.55) / 0.45));
    const fall = 1 - k * k * (3 - 2 * k);
    return Math.max(0, ((options.height?.(x, z) ?? 0) + dome) * fall);
  };
  const geometry = new THREE.RingGeometry(0, radius, 72, 26);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x0 = position.getX(i), z0 = position.getZ(i);
    const scale = rim(Math.atan2(z0, x0));
    const x = x0 * scale * stretch, z = z0 * scale;
    position.setXYZ(i, x, y(x, z), z);
  }
  geometry.computeVertexNormals();
  const map = rippleTexture(random, options.colour, options.ripple ?? 1, options.rows ?? 30);
  map.center.set(0.5, 0.5);
  map.rotation = (random() - 0.5) * 0.8;
  const material = new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 1.2, roughness: 1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return { mesh, y, material };
}
