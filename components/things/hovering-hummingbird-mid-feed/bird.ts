import * as THREE from 'three';
import { Bag, TAU, V, blob, field, paint, tube, xf } from './bits';

/** A hummingbird in true metres, facing +z, its body centred on the origin. Copied per component. */

export interface Plumage {
  back: string;
  crown: string;
  belly: string;
  flank: string;
  throat: string;
  /** A coloured patch in the middle of the throat (a hen's spot) or the whole gorget (a male's). */
  gorget: string | null;
  gorgetFull: boolean;
  /** The crown takes the gorget colour too (Anna's male). */
  hood: boolean;
  wing: string;
  tail: string;
  tailBand: string | null;
  tailTip: string;
  bill: string;
  billTip: string;
  /** Pale stripe or spot behind the eye. */
  eyeSpot: string | null;
}

export interface BirdOptions {
  plumage: Plumage;
  /** Folded at rest, a blurred stroke, or caught sharp at the top or the bottom of a beat. */
  wings: 'folded' | 'blur' | 'up' | 'down';
  /** Body pitch, radians: negative lifts the head. */
  pitch: number;
  /** Fullness of the body: 1 sleek, 1.2 puffed against cold. */
  puff: number;
  /** Tail fan spread, 0 closed to 1 wide open; and lift, radians, positive raises it. */
  tailSpread: number;
  tailLift: number;
  billLength: number;
  /** Head turn (y) and nod (x, positive looks down), radians. */
  headTurn: number;
  headNod: number;
  /** Iridescent flash of the gorget, 0 dark to 1 blazing. */
  flash: number;
  /** Shading of the whole bird, from the mood. */
  warmth: number;
  random: () => number;
  feet?: boolean;
  closedEyes?: boolean;
}

export interface Bird {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  /** The bill tip in the head's frame, for hanging something from it. */
  billTip: THREE.Vector3;
  wings: THREE.Object3D[];
  materials: THREE.Material[];
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A radial blur fan for a beating wing: denser at the ends of the stroke, where the wing turns. */
function blurTexture(colour: THREE.Color) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = (x / (size - 1)) * 2 - 1, v = (1 - y / (size - 1)) * 2 - 1;
      const r = Math.hypot(u, v), a = Math.atan2(v, u);
      // The fan spans -1.2..1.2 rad; its ends are where the wing pauses.
      const end = Math.pow(Math.min(1, Math.abs(a) / 1.2), 6);
      const radial = smooth(0.18, 0.5, r) * (1 - smooth(0.9, 1, r));
      // Feather tips trace a slightly denser rim; the inner fan is a faint haze.
      const rim = smooth(0.78, 0.95, r) * (1 - smooth(0.95, 1, r)) * 0.25;
      const alpha = Math.min(1, radial * (0.16 + end * 0.6) + rim);
      const i = (y * size + x) * 4;
      image.data[i] = colour.r * 255; image.data[i + 1] = colour.g * 255; image.data[i + 2] = colour.b * 255;
      image.data[i + 3] = alpha * 255;
    }
  ctx.putImageData(image, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export function hummingbird(o: BirdOptions): Bird {
  const p = o.plumage;
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.rotation.x = o.pitch;
  root.add(body);
  const noise = field(o.random);
  const C = (tone: string) => new THREE.Color(tone).offsetHSL((o.warmth - 0.5) * 0.02, 0, 0);

  const feathers = new Bag(); // iridescent plumage, vertex coloured
  const dark = new Bag(); // bill, eyes, feet
  const sheen = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.38 });
  const gloss = new THREE.MeshStandardMaterial({ roughness: 0.22, metalness: 0.1 });
  const materials: THREE.Material[] = [sheen, gloss];

  // Body: a plump teardrop, green above, pale below, coloured flanks between.
  const rx = 0.0085 * o.puff, ry = 0.0082 * o.puff, rz = 0.0172 * (0.9 + o.puff * 0.1);
  const torso = blob(V(rx, ry, rz), noise, o.puff > 1.05 ? 0.06 : 0.02, 3, 24, 16);
  // Taper the rear into the tail.
  const pos = torso.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    if (z < 0) {
      const k = 1 - 0.38 * Math.pow(-z / rz, 1.6);
      pos.setX(i, pos.getX(i) * k);
      pos.setY(i, pos.getY(i) * k + 0.0015 * (-z / rz));
    }
  }
  torso.computeVertexNormals();
  const back = C(p.back), belly = C(p.belly), flank = C(p.flank), crown = C(p.crown);
  paint(torso, (q, n) => {
    const up = smooth(-0.45, 0.35, n.y);
    const side = smooth(-0.2, 0.5, n.y) * (1 - smooth(0.25, 0.7, n.y));
    const c = belly.clone().lerp(flank, Math.min(1, side * 1.2 + (1 - up) * 0.25)).lerp(back, up);
    // The fore-back shades toward the crown colour.
    if (q.z > 0) c.lerp(crown, smooth(0, rz, q.z) * up * 0.5);
    return c;
  });
  feathers.add(torso);

  // Wings.
  const wingTone = C(p.wing);
  const wings: THREE.Object3D[] = [];
  if (o.wings === 'folded') {
    for (const side of [-1, 1]) {
      // Folded along the flanks, the long primaries meeting over the tail.
      const pts = [V(side * rx * 0.86, ry * 0.3, rz * 0.42), V(side * rx * 1.0, ry * 0.32, -rz * 0.2), V(side * rx * 0.55, ry * 0.5, -rz * 1.0), V(side * 0.0006, ry * 0.62, -rz * 1.62)];
      feathers.add(tube(pts, (t) => 0.0036 * (1 - t * 0.8) + 0.0003, { sides: 8, flat: 0.14, smooth: 16, up: V(side * 1.1, 1, 0).normalize(), colour: (t) => wingTone.clone().lerp(new THREE.Color('#3a3439'), t * 0.3) }));
    }
  } else if (o.wings === 'up' || o.wings === 'down') {
    // A wing caught sharp by a flash: long scimitar blades from the shoulder.
    for (const side of [-1, 1]) {
      const shoulder = V(side * rx * 0.8, ry * 0.45, rz * 0.35);
      const reach = o.wings === 'up' ? V(side * 0.026, 0.032, -0.006) : V(side * 0.03, -0.012, 0.026);
      const mid = shoulder.clone().lerp(shoulder.clone().add(reach), 0.45).add(o.wings === 'up' ? V(side * 0.004, 0, 0.004) : V(0, 0.006, 0));
      const blade = tube([shoulder, mid, shoulder.clone().add(reach)], (t) => 0.0068 * Math.pow(1 - t, 0.6) + 0.0009, { sides: 10, flat: 0.09, smooth: 18, up: o.wings === 'up' ? V(0, 0, 1) : V(0, 1, 0.2).normalize(), colour: (t) => wingTone.clone().lerp(new THREE.Color('#141217'), 0.15 + t * 0.4) });
      feathers.add(blade);
    }
  } else {
    // Blurred discs: a fan each side, swept almost level by the shoulders.
    const fanTone = new THREE.Color(p.wing).lerp(new THREE.Color('#d6d2d6'), 0.5);
    const map = blurTexture(fanTone);
    for (const side of [-1, 1]) {
      const fan = new THREE.Mesh(
        new THREE.CircleGeometry(0.044, 36, -1.2, 2.4),
        new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.8, opacity: 0.95 }),
      );
      materials.push(fan.material);
      fan.geometry.rotateX(-Math.PI / 2);
      const holder = new THREE.Group();
      holder.add(fan);
      holder.position.set(side * rx * 0.7, ry * 0.45, rz * 0.3);
      holder.scale.x = side;
      // The stroke plane stays near level while the body stands up, so undo most of the body pitch.
      holder.rotation.set(-o.pitch * 0.85, 0, side * 0.12);
      body.add(holder);
      wings.push(holder);
      // A ghost of the wing itself at the front of the stroke.
      const ghost = new THREE.Mesh(
        tube([V(0, 0, 0), V(0.016, 0.001, 0.016), V(0.03, 0.002, 0.03)], (t) => 0.004 * (1 - t) + 0.0008, { sides: 6, flat: 0.1, up: V(0, 1, 0) }),
        new THREE.MeshStandardMaterial({ color: fanTone, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
      );
      materials.push(ghost.material);
      holder.add(ghost);
    }
  }

  // Tail: a fan of stiff feathers, banded and tipped.
  const tailTone = C(p.tail), tipTone = C(p.tailTip), bandTone = p.tailBand ? C(p.tailBand) : null;
  const tailBase = V(0, ry * 0.25, -rz * 0.88);
  const tail = new THREE.Group();
  tail.position.copy(tailBase);
  tail.rotation.x = o.tailLift;
  body.add(tail);
  const tailBag = new Bag();
  const count = 5;
  for (let i = 0; i < count; i++) {
    const f = i / (count - 1) - 0.5;
    const angle = f * (0.25 + o.tailSpread * 1.6);
    const length = 0.0165 - Math.abs(f) * 0.002 + (o.random() - 0.5) * 0.001;
    const outer = Math.abs(f) > 0.3;
    const dir = V(Math.sin(angle), 0.02 * Math.abs(f), -Math.cos(angle));
    tailBag.add(
      tube([V(0, i * 0.00008, 0), dir.clone().multiplyScalar(length * 0.5), dir.clone().multiplyScalar(length)], (t) => (t < 0.85 ? 0.0021 : 0.0021 * Math.sqrt(Math.max(0.05, (1 - t) / 0.15))), {
        sides: 6, flat: 0.12, up: V(0, 1, 0),
        colour: (t) => (outer && t > 0.82 ? tipTone : bandTone && t > 0.6 ? bandTone : tailTone.clone().lerp(new THREE.Color('#1c1b1d'), t * 0.35)),
      }),
    );
  }
  tailBag.into(tail, sheen.clone());
  materials.push(...tail.children.map((m) => (m as THREE.Mesh).material as THREE.Material));

  // Under-tail coverts: a soft pale wedge.
  feathers.add(paint(blob(V(rx * 0.45, ry * 0.3, rz * 0.35), null), () => p.belly), null, xf(V(0, -ry * 0.25, -rz * 0.75)));

  // Feet tucked up under the belly when flying.
  if (o.feet) for (const side of [-1, 1]) feathers.add(new THREE.SphereGeometry(0.0011, 8, 6), '#2a2422', xf(V(side * 0.0022, -ry * 0.9, rz * 0.05), V(1, 0.7, 1.4)));

  feathers.into(body, sheen);

  // Head on a neck pivot, so it can turn and nod.
  const head = new THREE.Group();
  head.position.set(0, ry * 0.55, rz * 0.68);
  head.rotation.order = 'YXZ';
  head.rotation.set(o.headNod, o.headTurn, 0);
  body.add(head);
  const headBag = new Bag();
  const hc = V(0, 0.0034, 0.0052);
  const throat = C(p.throat), gorget = p.gorget ? C(p.gorget) : null;
  // A gorget looks near black until it catches the light.
  const shown = gorget && p.gorgetFull ? gorget.clone().lerp(new THREE.Color('#1c1519'), (1 - o.flash) * 0.6) : gorget;
  const skull = blob(V(0.0066, 0.0063, 0.0071), null, 0, 2, 20, 14);
  paint(skull, (q) => {
    const d = q.clone().normalize();
    // Cap on top, back colour down the nape and cheeks, pale throat beneath.
    const c = back.clone().lerp(crown, smooth(0.1, 0.55, d.y));
    const under = smooth(0.05, -0.35, d.y) * smooth(-0.5, 0.1, d.z);
    c.lerp(throat, under);
    // A dusky cheek behind the eye.
    if (Math.abs(d.x) > 0.55 && d.y > -0.3 && d.y < 0.35) c.lerp(new THREE.Color('#3b3833'), 0.35 * smooth(0.55, 0.9, Math.abs(d.x)));
    if (gorget) {
      const patch = p.gorgetFull ? under * smooth(-0.1, 0.25, d.z) : smooth(-0.25, -0.55, d.y) * smooth(0.25, 0.55, d.z) * smooth(0.45, 0.15, Math.abs(d.x));
      c.lerp(shown!, Math.min(1, patch * 1.4));
      if (p.hood && d.y > 0.05 && d.z > -0.3) c.lerp(shown!, smooth(0.05, 0.4, d.y));
    } else if (under > 0.5) {
      // A hen's throat is freckled with a few dusky flecks.
      if (Math.sin(q.x * 3100) * Math.sin(q.z * 2700) > 0.6) c.lerp(new THREE.Color('#6a6455'), 0.6);
    }
    return c;
  });
  headBag.add(skull, null, xf(hc));
  const headMesh = headBag.into(head, new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.42 }));
  if (headMesh) materials.push(headMesh.material as THREE.Material);
  if (gorget && shown && p.gorgetFull) {
    // The gorget stands proud of the throat as a scaled bib, and blazes when it catches the light.
    const bibBag = new Bag();
    bibBag.add(paint(blob(V(0.0056, 0.0042, 0.0046), null, 0, 2, 16, 10), () => shown), null, xf(hc.clone().add(V(0, -0.0031, 0.0024)), 1, new THREE.Euler(-0.35, 0, 0)));
    const bib = bibBag.into(head, new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.5, emissive: gorget, emissiveIntensity: o.flash * 0.55 }));
    if (bib) materials.push(bib.material as THREE.Material);
  }

  // Eyes, eye spots and the bill.
  for (const side of [-1, 1]) {
    if (o.closedEyes) dark.add(tube([hc.clone().add(V(side * 0.0063, 0.0013, 0.0014)), hc.clone().add(V(side * 0.006, 0.0011, 0.0038))], 0.00035, { sides: 4 }), '#151214');
    else dark.add(new THREE.SphereGeometry(0.00125, 10, 8), '#0d0b0c', xf(hc.clone().add(V(side * 0.0058, 0.0013, 0.0028))));
    if (p.eyeSpot) dark.add(new THREE.SphereGeometry(0.0008, 8, 6), p.eyeSpot, xf(hc.clone().add(V(side * 0.0063, 0.0016, -0.0001)), V(0.5, 0.7, 1.3)));
  }
  const billBase = hc.clone().add(V(0, -0.0006, 0.0062));
  const billTip = billBase.clone().add(V(0, -0.0022, o.billLength));
  const billMid = billBase.clone().lerp(billTip, 0.5).add(V(0, 0.0004, 0));
  const billTone = new THREE.Color(p.bill), billEnd = new THREE.Color(p.billTip);
  dark.add(tube([billBase, billMid, billTip], (t) => 0.0012 * (1 - t) + 0.00016, { sides: 8, smooth: 10, colour: (t) => billTone.clone().lerp(billEnd, smooth(0.45, 0.75, t)) }));
  // A narrow gape line where the mandibles meet.
  dark.into(head, gloss);
  head.userData.billTip = billTip;

  return { root, body, head, billTip, wings, materials };
}

/** Lichen flake geometry: a small ragged lobed disc, flat in xz. */
export function lichenFlake(random: () => number) {
  const shape = new THREE.Shape();
  const lobes = 5 + Math.floor(random() * 3);
  for (let i = 0; i <= lobes * 3; i++) {
    const a = (i / (lobes * 3)) * TAU;
    const r = 0.82 + 0.16 * Math.cos(a * lobes) + (random() - 0.5) * 0.12;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  return g;
}

