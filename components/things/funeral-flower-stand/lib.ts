import * as THREE from 'three';

export type P3 = readonly [number, number, number];
export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** A locally painted canvas as a texture: no images, no fonts, no network. */
export function paint(pxW: number, pxH: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(16, Math.round(pxW));
  canvas.height = Math.max(16, Math.round(pxH));
  draw(canvas.getContext('2d')!, canvas.width, canvas.height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

/** A flat plane carrying a painted canvas. */
export function panel(width: number, height: number, draw: Draw, options: { px?: number; glow?: number; roughness?: number; cutout?: boolean } = {}) {
  const px = options.px ?? 384;
  const aspect = width / height;
  const map = paint(aspect >= 1 ? px : px * aspect, aspect >= 1 ? px / aspect : px, draw);
  const material = new THREE.MeshStandardMaterial({ map, roughness: options.roughness ?? 0.85, side: THREE.DoubleSide });
  if (options.cutout) { material.alphaTest = 0.5; material.transparent = false; }
  if (options.glow) {
    material.emissive = new THREE.Color('#ffffff');
    material.emissiveMap = map;
    material.emissiveIntensity = options.glow;
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.receiveShadow = true;
  return mesh;
}

export function write(ctx: CanvasRenderingContext2D, words: string, x: number, y: number, size: number, colour: string, options: { font?: string; max?: number; tilt?: number; align?: CanvasTextAlign; face?: string } = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (options.tilt) ctx.rotate(options.tilt);
  ctx.font = `${options.font ?? 'bold'} ${size}px ${options.face ?? 'Arial, Helvetica, sans-serif'}`;
  ctx.textAlign = options.align ?? 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colour;
  ctx.fillText(words, 0, 0, options.max);
  ctx.restore();
}

/** Blotchy stains and vertical streaks; amount 0..1. */
export function grime(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, random: () => number, colour = '70,56,38') {
  const count = Math.round(amount * 70);
  for (let i = 0; i < count; i++) {
    const x = random() * w, y = random() * h, r = (0.02 + random() * 0.08) * Math.max(w, h);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${colour},${0.08 + random() * 0.25 * amount})`);
    g.addColorStop(1, `rgba(${colour},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < count / 3; i++) {
    ctx.fillStyle = `rgba(${colour},${0.06 + random() * 0.14})`;
    ctx.fillRect(random() * w, random() * h * 0.5, 1 + random() * 3, (0.1 + random() * 0.5) * h);
  }
}

/** Running-bond brickwork, one square tile that repeats. */
export function brickTexture(random: () => number, brick = '#9a4b38', mortar = '#cfc6b4', wear = 0) {
  const map = paint(256, 256, (ctx, w, h) => {
    ctx.fillStyle = mortar;
    ctx.fillRect(0, 0, w, h);
    const rows = 8, cols = 3, bh = h / rows, bw = w / cols;
    const base = new THREE.Color(brick);
    for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) {
      const tone = base.clone().offsetHSL((random() - 0.5) * 0.03, (random() - 0.5) * 0.1, (random() - 0.5) * (0.12 + wear * 0.12));
      ctx.fillStyle = `#${tone.getHexString()}`;
      const x = c * bw + (r % 2 ? bw / 2 : 0);
      ctx.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4);
      if (x + bw > w) ctx.fillRect(x - w + 2, r * bh + 2, bw - 4, bh - 4);
    }
    grime(ctx, w, h, wear * 0.6, random);
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

/** Horizontal lap siding / planks as a repeating tile. */
export function boardTexture(random: () => number, colour: string, wear = 0, courses = 6, vertical = false) {
  const map = paint(256, 256, (ctx, w, h) => {
    const base = new THREE.Color(colour);
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, w, h);
    const step = h / courses;
    for (let i = 0; i < courses; i++) {
      const tone = base.clone().offsetHSL(0, 0, (random() - 0.5) * (0.03 + wear * 0.1));
      ctx.fillStyle = `#${tone.getHexString()}`;
      if (vertical) ctx.fillRect(i * step, 0, step, h); else ctx.fillRect(0, i * step, w, step);
      ctx.fillStyle = 'rgba(40,36,30,0.42)';
      if (vertical) ctx.fillRect(i * step, 0, 3, h); else ctx.fillRect(0, i * step + step - 4, w, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      if (vertical) ctx.fillRect(i * step + 3, 0, 2, h); else ctx.fillRect(0, i * step, w, 2);
    }
    // peeling paint shows grey wood
    for (let i = 0; i < wear * 60; i++) {
      ctx.fillStyle = `rgba(${110 + random() * 30},${100 + random() * 25},${85 + random() * 20},${0.35 + random() * 0.4})`;
      const pw = 6 + random() * 40, ph = 3 + random() * 10;
      if (vertical) ctx.fillRect(random() * w, random() * h, ph, pw); else ctx.fillRect(random() * w, random() * h, pw, ph);
    }
    grime(ctx, w, h, wear * 0.5, random);
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

/** A box whose faces repeat a tiling texture every `tile` metres. */
export function tiledBox(size: P3, tile: number, material: THREE.Material) {
  const geometry = new THREE.BoxGeometry(...size);
  const [width, height, depth] = size;
  const uv = geometry.attributes.uv;
  const dims = [[depth, height], [depth, height], [width, depth], [width, depth], [width, height], [width, height]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
    const i = f * 4 + v;
    uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile);
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export const pick = <T>(random: () => number, list: readonly T[]): T => list[Math.floor(random() * list.length) % list.length];
export const tone = (colour: THREE.ColorRepresentation, lightness: number, saturation = 0) => `#${new THREE.Color(colour).offsetHSL(0, saturation, lightness).getHexString()}`;
