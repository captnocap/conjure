import * as THREE from 'three';

/** A small sculpting vocabulary for display forms: a height field cut to an outline, painted from a canvas. */
export type P2 = readonly [number, number];

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const bump = (d: number, r: number) => Math.exp(-(d * d) / (r * r));
export const dome = (x: number, y: number, cx: number, cy: number, rx: number, ry: number, h: number) => {
  const q = 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2;
  return q > 0 ? h * Math.sqrt(q) : 0;
};
/** Smooth maximum: blends two heights so they meet without a crease. */
export const smax = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
};

/** Resample a few control points into a smooth polyline. */
export function spline(points: readonly P2[], closed: boolean, per = 10): P2[] {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, 0)), closed, 'catmullrom', 0.5);
  return curve.getPoints(points.length * per).map((p) => [p.x, p.y] as const);
}

/** Distance from a point to a polyline. */
export function distanceTo(poly: readonly P2[], closed = false) {
  const count = closed ? poly.length : poly.length - 1;
  return (x: number, y: number) => {
    let best = Infinity;
    for (let i = 0; i < count; i++) {
      const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
      const dx = bx - ax, dy = by - ay;
      const t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      const ex = ax + dx * t - x, ey = ay + dy * t - y;
      const d = ex * ex + ey * ey;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  };
}

export function insideOf(poly: readonly P2[]) {
  return (x: number, y: number) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}

export interface Relief {
  /** The sculpted face, with planar UVs across the w × h rectangle. */
  front: THREE.BufferGeometry;
  /** Side walls and back, to make it a solid. */
  shell: THREE.BufferGeometry;
}

/**
 * A height field over a w × h rectangle centred on the origin, facing +z. `front` returns the
 * surface height, or null outside the outline. `back` gives the rear surface.
 */
export function relief(
  w: number,
  h: number,
  n: number,
  front: (x: number, y: number) => number | null,
  back: (x: number, y: number) => number = () => -0.01,
  /** Optional outline as a signed function, positive inside: rim vertices are slid onto its zero line. */
  outline?: (x: number, y: number) => number,
): Relief {
  const nx = n, ny = Math.max(2, Math.round((n * h) / w));
  const stride = nx + 1;
  const zs = new Float32Array(stride * (ny + 1));
  const ok = new Uint8Array(stride * (ny + 1));
  const px = (i: number) => (i / nx - 0.5) * w, py = (j: number) => (j / ny - 0.5) * h;
  for (let j = 0; j <= ny; j++)
    for (let i = 0; i <= nx; i++) {
      const z = front(px(i), py(j));
      if (z !== null && Number.isFinite(z)) {
        zs[j * stride + i] = z;
        ok[j * stride + i] = 1;
      }
    }
  const remap = new Int32Array(stride * (ny + 1)).fill(-1);
  const positions: number[] = [], uvs: number[] = [], rear: number[] = [], index: number[] = [];
  const use = (v: number) => {
    if (remap[v] < 0) {
      const i = v % stride, j = Math.floor(v / stride);
      remap[v] = positions.length / 3;
      positions.push(px(i), py(j), zs[v]);
      uvs.push(i / nx, j / ny);
      rear.push(px(i), py(j), Math.min(back(px(i), py(j)), zs[v] - 0.0005));
    }
    return remap[v];
  };
  const edges = new Map<number, [number, number]>();
  const edge = (a: number, b: number) => {
    const key = a < b ? a * 1048576 + b : b * 1048576 + a;
    if (edges.has(key)) edges.delete(key);
    else edges.set(key, [a, b]);
  };
  const triangle = (a: number, b: number, c: number) => {
    const ia = use(a), ib = use(b), ic = use(c);
    index.push(ia, ib, ic);
    edge(ia, ib);
    edge(ib, ic);
    edge(ic, ia);
  };
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * stride + i, b = a + 1, c = a + stride + 1, d = a + stride;
      const mask = ok[a] + ok[b] * 2 + ok[c] * 4 + ok[d] * 8;
      if (mask === 15) {
        triangle(a, b, c);
        triangle(a, c, d);
      } else if (mask === 7) triangle(a, b, c);
      else if (mask === 13) triangle(a, c, d);
      else if (mask === 11) triangle(a, b, d);
      else if (mask === 14) triangle(b, c, d);
    }
  if (outline) {
    const cell = w / nx, e = cell * 0.25;
    const rim = new Set<number>();
    for (const [a, b] of edges.values()) rim.add(a).add(b);
    for (const v of rim) {
      let x = positions[v * 3], y = positions[v * 3 + 1];
      for (let step = 0; step < 3; step++) {
        const f = outline(x, y);
        const gx = (outline(x + e, y) - outline(x - e, y)) / (2 * e), gy = (outline(x, y + e) - outline(x, y - e)) / (2 * e);
        const g2 = gx * gx + gy * gy;
        if (g2 < 1e-12) break;
        let dx = (-f * gx) / g2, dy = (-f * gy) / g2;
        const length = Math.hypot(dx, dy);
        if (length > cell) { dx *= cell / length; dy *= cell / length; }
        x += dx;
        y += dy;
      }
      const z = front(x, y) ?? positions[v * 3 + 2];
      positions[v * 3] = rear[v * 3] = x;
      positions[v * 3 + 1] = rear[v * 3 + 1] = y;
      positions[v * 3 + 2] = z;
      rear[v * 3 + 2] = Math.min(back(x, y), z - 0.0005);
      uvs[v * 2] = x / w + 0.5;
      uvs[v * 2 + 1] = y / h + 0.5;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();

  const solid: number[] = [];
  const at = (source: number[], v: number) => solid.push(source[v * 3], source[v * 3 + 1], source[v * 3 + 2]);
  for (let t = 0; t < index.length; t += 3) {
    at(rear, index[t]);
    at(rear, index[t + 2]);
    at(rear, index[t + 1]);
  }
  for (const [a, b] of edges.values()) {
    at(positions, a); at(rear, a); at(positions, b);
    at(positions, b); at(rear, a); at(rear, b);
  }
  const shell = new THREE.BufferGeometry();
  shell.setAttribute('position', new THREE.Float32BufferAttribute(solid, 3));
  shell.computeVertexNormals();
  return { front: geometry, shell };
}

/**
 * Paint a canvas in metres with y up, matching a relief's UVs, and return it as a colour texture.
 */
export function paint(w: number, h: number, pixels: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = pixels;
  canvas.height = Math.max(16, Math.round((pixels * h) / w));
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(canvas.width / w, 0, 0, -canvas.height / h, canvas.width / 2, canvas.height / 2);
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export const trace = (ctx: CanvasRenderingContext2D, poly: readonly P2[], close = true) => {
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
};

/** A soft round stain, for blush, shadow and flush. */
export const stain = (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, colour: string, alpha: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  const c = new THREE.Color(colour);
  const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
  gradient.addColorStop(0, `rgba(${rgb},${alpha})`);
  gradient.addColorStop(0.55, `rgba(${rgb},${alpha * 0.6})`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
};

export const hex = (colour: THREE.ColorRepresentation) => `#${new THREE.Color(colour).getHexString()}`;
export const blend = (a: THREE.ColorRepresentation, b: THREE.ColorRepresentation, t: number) => hex(new THREE.Color(a).lerp(new THREE.Color(b), t));
