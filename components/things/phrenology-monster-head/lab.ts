import * as THREE from 'three';

/** Paint a canvas and hand it back as a colour texture. */
export function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export type Hand = 'script' | 'caps' | 'type' | 'scrawl';
export interface LabelOptions {
  /** width / height of the paper */
  ratio: number;
  hand?: Hand;
  ink?: string;
  paper?: string;
  /** 0 clean … 1 foxed and stained */
  wear?: number;
  border?: boolean;
  random: () => number;
}

const FONT: Record<Hand, string> = {
  script: 'italic 600 SIZEpx Georgia, "Times New Roman", serif',
  caps: '700 SIZEpx Georgia, "Times New Roman", serif',
  type: '700 SIZEpx "Courier New", monospace',
  scrawl: 'italic 800 SIZEpx Georgia, "Times New Roman", serif',
};

/** A hand-written paper label: a few lines of ink, a ruled border, foxing that grows with wear. */
export function labelTexture(lines: readonly string[], o: LabelOptions) {
  const w = 512, h = Math.max(48, Math.round(512 / o.ratio));
  return paint(w, h, (ctx) => {
    const hand = o.hand ?? 'script', wear = o.wear ?? 0;
    ctx.fillStyle = o.paper ?? '#efe4c4';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4 + wear * 22; i++) {
      const x = o.random() * w, y = o.random() * h, r = (0.05 + o.random() * 0.22) * h;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(120,84,36,${0.1 + wear * 0.3})`);
      g.addColorStop(1, 'rgba(120,84,36,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const ink = o.ink ?? '#2a2018';
    if (o.border !== false) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(3, h * 0.03);
      ctx.strokeRect(h * 0.07, h * 0.07, w - h * 0.14, h - h * 0.14);
    }
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const rows = lines.length, pad = h * 0.16, rowH = (h - pad * 2) / rows;
    lines.forEach((line, index) => {
      const size = Math.min(rowH * 0.82, (w * 0.86) / Math.max(line.length, 1) * (hand === 'type' ? 1.55 : 1.9));
      ctx.font = FONT[hand].replace('SIZE', String(Math.round(size)));
      ctx.save();
      ctx.translate(w / 2, pad + rowH * (index + 0.5));
      if (hand === 'scrawl') ctx.rotate((o.random() - 0.5) * 0.12);
      if (hand === 'script') ctx.rotate(-0.015);
      ctx.fillText(line, 0, 0, w * 0.88);
      ctx.restore();
    });
  });
}

/** Flat paper carrying a label. */
export function labelPlane(lines: readonly string[], width: number, height: number, o: Omit<LabelOptions, 'ratio'>) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ map: labelTexture(lines, { ...o, ratio: width / height }), roughness: 0.9, side: THREE.DoubleSide }),
  );
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** Paper wrapped round the front of a jar of the given radius. */
export function labelWrap(lines: readonly string[], radius: number, width: number, height: number, o: Omit<LabelOptions, 'ratio'>) {
  const arc = width / radius;
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 20, 1, true, -arc / 2, arc),
    new THREE.MeshStandardMaterial({ map: labelTexture(lines, { ...o, ratio: width / height }), roughness: 0.9, side: THREE.DoubleSide }),
  );
  mesh.castShadow = true;
  return mesh;
}

/** Clear glass that is not measured as solid. */
export function glass(tint: THREE.ColorRepresentation = '#dff0e4', opacity = 0.2) {
  return new THREE.MeshPhysicalMaterial({ color: tint, transparent: true, opacity, roughness: 0.06, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
}

/** Tinted, softly glowing liquid. */
export function liquid(color: THREE.ColorRepresentation, glow: number, opacity = 0.42) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: glow, transparent: true, opacity, roughness: 0.2, depthWrite: false });
}

export const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
