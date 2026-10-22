import * as THREE from 'three';

/** Flat silhouettes about one unit tall, standing on y = 0 and facing +z, for instancing. */

const ellipse = (cx: number, cy: number, rx: number, ry: number, turn: number) => {
  const shape = new THREE.Shape();
  for (let k = 0; k <= 20; k++) {
    const t = (k / 20) * Math.PI * 2;
    const x = Math.cos(t) * rx, y = Math.sin(t) * ry;
    const px = cx + x * Math.cos(turn) - y * Math.sin(turn), py = cy + x * Math.sin(turn) + y * Math.cos(turn);
    if (k === 0) shape.moveTo(px, py); else shape.lineTo(px, py);
  }
  return shape;
};

const extrude = (shapes: THREE.Shape[], depth = 0.06) => {
  const geometry = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 6 });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
};

/** A seraph: a small head wrapped in three pairs of wings. */
export function seraph() {
  const shapes = [ellipse(0, 0.5, 0.11, 0.11, 0)];
  for (const [angle, length] of [[0.6, 0.34], [1.55, 0.4], [2.5, 0.32]] as const)
    for (const side of [-1, 1]) {
      const a = Math.PI / 2 - side * angle;
      shapes.push(ellipse(Math.cos(a) * 0.26, 0.5 + Math.sin(a) * 0.26, length * 0.62, 0.075, a));
    }
  return extrude(shapes);
}

/** A robed, haloed choir angel with folded wings. */
export function chorister() {
  const robe = new THREE.Shape();
  robe.moveTo(-0.2, 0); robe.lineTo(0.2, 0); robe.quadraticCurveTo(0.14, 0.4, 0.09, 0.66); robe.lineTo(-0.09, 0.66); robe.quadraticCurveTo(-0.14, 0.4, -0.2, 0);
  const halo = ellipse(0, 0.8, 0.16, 0.16, 0);
  halo.holes.push(new THREE.Path(ellipse(0, 0.8, 0.12, 0.12, 0).getPoints()));
  return extrude([robe, ellipse(0, 0.8, 0.09, 0.1, 0), halo, ellipse(-0.2, 0.5, 0.26, 0.08, 1.15), ellipse(0.2, 0.5, 0.26, 0.08, -1.15 + Math.PI)]);
}

/** A cherub: a round head between two little wings. */
export function cherub() {
  return extrude([ellipse(0, 0.5, 0.16, 0.16, 0), ellipse(-0.3, 0.52, 0.22, 0.09, -0.35), ellipse(0.3, 0.52, 0.22, 0.09, 0.35)]);
}

/** A dove with spread wings, seen from below. */
export function dove() {
  const body = ellipse(0, 0, 0.09, 0.3, 0);
  const left = new THREE.Shape();
  left.moveTo(-0.05, 0.05); left.quadraticCurveTo(-0.3, 0.32, -0.62, 0.22); left.quadraticCurveTo(-0.4, 0.05, -0.05, -0.1);
  const right = new THREE.Shape();
  right.moveTo(0.05, 0.05); right.quadraticCurveTo(0.3, 0.32, 0.62, 0.22); right.quadraticCurveTo(0.4, 0.05, 0.05, -0.1);
  const tail = new THREE.Shape();
  tail.moveTo(-0.07, -0.22); tail.lineTo(0.07, -0.22); tail.lineTo(0.13, -0.45); tail.lineTo(-0.13, -0.45);
  return extrude([body, ellipse(0, 0.33, 0.07, 0.07, 0), left, right, tail], 0.05);
}

/** A unit ray: a long thin wedge from the origin along +x. */
export function wedge() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.5); shape.lineTo(1, 0); shape.lineTo(0, 0.5);
  return extrude([shape], 0.4);
}

/** A unit flame ray: a sinuous tapering ribbon along +x. */
export function flame() {
  const shape = new THREE.Shape();
  const n = 24, top: [number, number][] = [], bottom: [number, number][] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, centre = Math.sin(t * Math.PI * 3) * 0.35 * t, w = 0.5 * (1 - t) + 0.02;
    top.push([t, centre + w]); bottom.push([t, centre - w]);
  }
  shape.moveTo(bottom[0][0], bottom[0][1]);
  for (const [x, y] of bottom.slice(1)) shape.lineTo(x, y);
  for (const [x, y] of top.reverse()) shape.lineTo(x, y);
  return extrude([shape], 0.4);
}

/** A soft round glow: white in the middle fading to nothing, for an emissive translucent disc. */
export function glowTexture(colour: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.18, colour);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}
