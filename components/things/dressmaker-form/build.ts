import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Torso silhouette, radius against height above the hip plate (metres, before the front-to-back squash). */
const PROFILE: readonly (readonly [number, number])[] = [
  [0.0, 0.165], [0.04, 0.188], [0.13, 0.2], [0.24, 0.172], [0.36, 0.132], [0.46, 0.158], [0.56, 0.186], [0.64, 0.192],
  [0.69, 0.18], [0.73, 0.12], [0.76, 0.068], [0.8, 0.056], [0.84, 0.054],
];
function radiusAt(y: number) {
  if (y <= PROFILE[0][0]) return PROFILE[0][1];
  for (let i = 1; i < PROFILE.length; i++) {
    const [y1, r1] = PROFILE[i], [y0, r0] = PROFILE[i - 1];
    if (y <= y1) { const t = (y - y0) / (y1 - y0), e = t * t * (3 - 2 * t); return r0 + (r1 - r0) * e; }
  }
  return PROFILE[PROFILE.length - 1][1];
}
const SQUASH = 0.7;

const GARMENTS = {
  bare: 'Nothing on it: the bare form, waiting.',
  pattern: 'Brown tissue pattern pieces pinned straight onto the form.',
  bodice: 'A fitted sleeveless bodice, pinned at the open seam.',
  dress: 'A dress with a full skirt hanging to an uneven, unhemmed edge.',
  jacket: 'A tailored jacket with lapels, perhaps still missing a sleeve.',
  toile: 'A pale muslin mock-up scrawled with marker lines and corrections.',
} as const;
const FABRICS = {
  ivory: 'Ivory satin, bridal.',
  black: 'Black crepe, for mourning or evening.',
  scarlet: 'Scarlet velvet, a dress meant to be noticed.',
  floral: 'Cheerful printed cotton, small flowers on blue.',
  serge: 'Navy serge, practical and school-uniform plain.',
  emerald: 'Emerald silk, a dance dress.',
  tweed: 'Mustard-brown tweed, heavy and sensible.',
} as const;
const FABRIC_HEX: Record<keyof typeof FABRICS, string> = { ivory: '#efe7d2', black: '#222026', scarlet: '#9a1b2c', floral: '#5f86b5', serge: '#2a3857', emerald: '#1f7a5c', tweed: '#9a7a3a' };

export default defineThing({
  questions: {
    garment: choice('What is on the form?', GARMENTS),
    progress: score('If there is a garment, how far did the work get?', ['A few pieces pinned on', 'Half made, one side open', 'All but the finishing', 'Finished, and never collected']),
    fabric: choice('If there is a garment, what is it made of?', FABRICS),
    cover: choice('What is the form itself covered in?', {
      linen: 'Unbleached ecru linen, the standard workroom form.',
      black: 'Black jersey, a couture house form.',
      wine: 'Wine-red velvet, a shop-window display form.',
      grey: 'Institutional grey canvas with stencilled size numbers.',
    }),
    stand: choice('What does it stand on?', {
      iron: 'A scrolled cast-iron tripod on small casters.',
      wood: 'A turned wooden pole on three splayed wooden feet.',
      cage: 'An iron tripod with a wire hoop cage hanging below the hips like a skeleton skirt.',
    }),
    height: score('How tall is it set?', ['Low, a child\'s height', 'An average woman', 'Cranked up tall']),
    extra: choice('What else has been left on it?', {
      tape: 'A yellow tape measure draped round the neck.',
      scissors: 'Dressmaking shears hanging from a ribbon.',
      hat: 'A hat set on the neck cap where a head should be.',
      note: 'A paper note pinned to the chest.',
      pincushion: 'A tomato pincushion strapped to the shoulder.',
      nothing: 'Nothing else.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const hipY = mix(0.62, 0.98, a.height);
    const p = a.progress;

    // ---- stand
    const ironTint = new THREE.Color('#25262a').lerp(new THREE.Color('#6b3f26'), mood.wear * 0.6);
    const iron = new THREE.MeshStandardMaterial({ color: ironTint, metalness: 0.55, roughness: mix(0.4, 0.85, mood.wear) });
    const wood = s.material('#7a4f2c', { roughness: 0.55 });
    const brass = new THREE.MeshStandardMaterial({ color: '#b9954a', metalness: 0.8, roughness: 0.35 });
    const spin = random() * Math.PI * 2;
    if (a.stand === 'wood') {
      s.lathe([[0.0, 0.2], [0.05, 0.2], [0.06, 0.26], [0.035, 0.32], [0.045, 0.36], [0.028, 0.42], [0.028, hipY - 0.2], [0.042, hipY - 0.16], [0.03, hipY - 0.1], [0.03, hipY]], wood);
      for (let i = 0; i < 3; i++) {
        const angle = spin + i * Math.PI * 2 / 3, cx = Math.sin(angle), cz = Math.cos(angle);
        s.rod([cx * 0.03, 0.27, cz * 0.03], [cx * 0.36, 0.035, cz * 0.36], 0.026, wood, 0.02);
        s.ball([0.035, 0.035, 0.035], [cx * 0.36, 0.035, cz * 0.36], wood, 10);
      }
    } else {
      s.cylinder(0.016, 0.016, hipY - 0.2, [0, 0.2 + (hipY - 0.2) / 2, 0], iron, 12);
      s.cylinder(0.026, 0.03, hipY * 0.45, [0, 0.2 + hipY * 0.225, 0], iron, 12);
      s.lathe([[0.03, 0.16], [0.06, 0.19], [0.05, 0.24], [0.03, 0.27]], iron);
      s.cylinder(0.04, 0.04, 0.03, [0, 0.2 + hipY * 0.45, 0], brass, 12);
      s.rod([0.03, 0.2 + hipY * 0.45, 0], [0.09, 0.2 + hipY * 0.45, 0], 0.008, brass);
      s.ball([0.02, 0.02, 0.02], [0.09, 0.2 + hipY * 0.45, 0], brass, 8);
      for (let i = 0; i < 3; i++) {
        const angle = spin + i * Math.PI * 2 / 3, cx = Math.sin(angle), cz = Math.cos(angle);
        const at = (r: number, y: number): P3 => [cx * r, y, cz * r];
        s.tube([at(0.04, 0.22), at(0.13, 0.27), at(0.22, 0.2), at(0.3, 0.09), at(0.36, 0.075), at(0.4, 0.1)], 0.016, iron);
        s.tube([at(0.12, 0.2), at(0.16, 0.13), at(0.22, 0.12), at(0.21, 0.17)], 0.009, iron);
        s.cylinder(0.008, 0.008, 0.05, at(0.35, 0.05), iron, 6);
        const wheel = s.cylinder(0.026, 0.026, 0.018, at(0.35, 0.026), s.material('#161616'), 12);
        wheel.rotation.z = Math.PI / 2; wheel.rotation.y = angle;
      }
    }

    // ---- torso
    const torso = new THREE.Group();
    torso.position.y = hipY; torso.scale.z = SQUASH; torso.rotation.y = (random() - 0.5) * 0.5;
    s.root.add(torso);
    const coverHex = { linen: '#d9cfb4', black: '#26252a', wine: '#6f1c2b', grey: '#8f9390' }[a.cover];
    const coverTexture = paint(256, 256, (ctx) => {
      ctx.fillStyle = coverHex; ctx.fillRect(0, 0, 256, 256);
      ctx.globalAlpha = 0.07; ctx.fillStyle = '#000';
      for (let y = 0; y < 256; y += 3) ctx.fillRect(0, y, 256, 1);
      for (let x = 0; x < 256; x += 3) ctx.fillRect(x, 0, 1, 256);
      ctx.globalAlpha = 1;
      for (let i = 0; i < Math.round(mood.wear * 9); i++) {
        const x = random() * 256, y = random() * 256, r = 14 + random() * 30;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(84,58,28,0.5)'); g.addColorStop(0.7, 'rgba(84,58,28,0.28)'); g.addColorStop(1, 'rgba(84,58,28,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      if (a.cover === 'grey') { ctx.fillStyle = '#23262a'; ctx.font = 'bold 30px monospace'; ctx.fillText(String(36 + Math.floor(random() * 6) * 2), 20, 100); }
    });
    const cover = new THREE.MeshStandardMaterial({ map: coverTexture, roughness: 0.92 });
    const gap = new THREE.MeshStandardMaterial({ color: '#17140f', roughness: 0.9, side: THREE.DoubleSide });
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const shell = (offset: number, y0: number, y1: number, phiStart: number, phiLength: number, steps = 22, flare: (t: number) => number = () => 0) => {
      const points: THREE.Vector2[] = [];
      for (let i = 0; i <= steps; i++) { const t = i / steps, y = mix(y0, y1, t); points.push(new THREE.Vector2(radiusAt(y) + offset + flare(t), y)); }
      return new THREE.LatheGeometry(points, 40, phiStart, phiLength);
    };
    const surface = (phi: number, y: number, offset: number): P3 => { const r = radiusAt(y) + offset; return [Math.sin(phi) * r, y, Math.cos(phi) * r]; };

    put(torso, shell(0, 0, 0.84, 0, Math.PI * 2, 40), cover);
    put(torso, new THREE.CircleGeometry(0.165, 32), cover, [0, 0, 0]).rotation.x = Math.PI / 2;
    // the adjusting gaps, dials and the neck cap
    for (const phi of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) put(torso, shell(0.0015, 0.005, 0.74, phi - 0.022, 0.044), gap);
    const waistGap = put(torso, new THREE.TorusGeometry(radiusAt(0.36) + 0.001, 0.004, 6, 40), gap, [0, 0.36, 0]); waistGap.rotation.x = Math.PI / 2;
    for (const [phi, y] of [[0.35, 0.5], [-0.35, 0.5], [0.4, 0.22], [-0.4, 0.22]] as const) {
      const dial = put(torso, new THREE.CylinderGeometry(0.016, 0.016, 0.012, 12), iron, surface(phi, y, 0.004));
      dial.lookAt(new THREE.Vector3(...surface(phi, y, 1)).add(torso.position)); dial.rotateX(Math.PI / 2);
    }
    const capMaterial = a.stand === 'wood' ? wood : iron;
    put(torso, new THREE.LatheGeometry([[0.0, 0.84], [0.06, 0.84], [0.062, 0.855], [0.03, 0.865], [0.012, 0.875], [0.02, 0.9], [0.0, 0.915]].map(([r, y]) => new THREE.Vector2(r, y)), 20), capMaterial).scale.z = 1 / SQUASH * 0.85;
    put(torso, new THREE.CylinderGeometry(0.17, 0.165, 0.02, 32), capMaterial, [0, -0.008, 0]);
    // shoulder plates where the arms would be
    for (const side of [-1, 1]) { const plate = put(torso, new THREE.SphereGeometry(0.058, 14, 10), cover, [side * 0.176, 0.655, 0]); plate.scale.set(0.5, 1, 1.15); }

    if (a.stand === 'cage') {
      const wire = new THREE.MeshStandardMaterial({ color: ironTint, metalness: 0.6, roughness: 0.5 });
      const drop = hipY - 0.32, hoops = 4;
      for (let i = 1; i <= hoops; i++) { const hoop = put(torso, new THREE.TorusGeometry(0.17 + i * 0.045, 0.005, 6, 40), wire, [0, -drop * i / hoops, 0]); hoop.rotation.x = Math.PI / 2; }
      for (let i = 0; i < 10; i++) {
        const phi = i * Math.PI / 5, top = new THREE.Vector3(Math.sin(phi) * 0.165, 0, Math.cos(phi) * 0.165), bottom = new THREE.Vector3(Math.sin(phi) * (0.17 + hoops * 0.045), -drop, Math.cos(phi) * (0.17 + hoops * 0.045));
        const strut = put(torso, new THREE.CylinderGeometry(0.004, 0.004, top.distanceTo(bottom), 5), wire, top.clone().add(bottom).multiplyScalar(0.5).toArray() as P3);
        strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bottom).normalize());
      }
    }

    // ---- the garment
    const fabricHex = FABRIC_HEX[a.fabric];
    const fabricTexture = a.fabric === 'floral' ? paint(256, 256, (ctx) => {
      ctx.fillStyle = fabricHex; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 40; i++) { const x = random() * 256, y = random() * 256; ctx.fillStyle = ['#f4e9d0', '#e8a0a8', '#f1cf5a'][i % 3]; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.257) * 8, y + Math.sin(k * 1.257) * 8, 6, 0, 7); ctx.fill(); } ctx.fillStyle = '#b9483a'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
    }) : a.fabric === 'tweed' ? paint(128, 128, (ctx) => {
      ctx.fillStyle = fabricHex; ctx.fillRect(0, 0, 128, 128); ctx.strokeStyle = '#5c4320'; ctx.lineWidth = 3;
      for (let i = -128; i < 256; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 128, 128); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i + 128, 0); ctx.lineTo(i, 128); ctx.stroke(); }
    }) : null;
    if (fabricTexture) { fabricTexture.wrapS = fabricTexture.wrapT = THREE.RepeatWrapping; fabricTexture.repeat.set(4, 2); }
    const sheen = a.fabric === 'ivory' || a.fabric === 'emerald';
    const fabric = new THREE.MeshStandardMaterial({ color: fabricTexture ? '#ffffff' : fabricHex, map: fabricTexture, roughness: sheen ? 0.38 : 0.9, side: THREE.DoubleSide });
    const lining = new THREE.MeshStandardMaterial({ color: new THREE.Color(fabricHex).multiplyScalar(0.6), roughness: 0.8, side: THREE.DoubleSide });
    const coverage = Math.PI * 2 * clamp01(mix(0.42, 1.2, p));
    const open = coverage < Math.PI * 2 - 0.01;
    const openAt = -0.75; // the open seam faces front-left, where it can be seen
    const start = open ? openAt + (Math.PI * 2 - coverage) / 2 : 0;
    const pinSpots: P3[] = [];
    const pinsAlong = (y0: number, y1: number, offset: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const y = mix(y0, y1, random());
        const phi = open && random() < 0.65 ? (random() < 0.5 ? start + 0.05 : start + coverage - 0.05) : start + random() * coverage;
        pinSpots.push(surface(phi, y, offset + 0.006));
      }
    };
    const pinCount = Math.round(mix(26, 3, p) * mix(0.7, 1.3, mood.density));

    if (a.garment === 'pattern') {
      const tissue = new THREE.MeshStandardMaterial({ color: '#c9a877', roughness: 0.95, side: THREE.DoubleSide });
      const pieces = 2 + Math.round(p * 4);
      for (let i = 0; i < pieces; i++) {
        const phi = openAt + 0.5 + i * (Math.PI * 2 / 6.5), y0 = 0.05 + random() * 0.3, y1 = Math.min(0.7, y0 + 0.25 + random() * 0.2), width = 0.6 + random() * 0.35;
        put(torso, shell(0.006 + i * 0.001, y0, y1, phi, width, 10), tissue);
        for (let k = 0; k < 4; k++) pinSpots.push(surface(phi + (k % 2 ? 0.06 : width - 0.06), k < 2 ? y0 + 0.03 : y1 - 0.03, 0.014));
        // a printed grain line on each piece
        put(torso, shell(0.0085 + i * 0.001, y0 + 0.04, y1 - 0.04, phi + width / 2 - 0.012, 0.024, 6), gap);
      }
    } else if (a.garment === 'bodice' || a.garment === 'dress' || a.garment === 'toile') {
      const cloth = a.garment === 'toile' ? new THREE.MeshStandardMaterial({ color: '#e9e2cf', roughness: 0.95, side: THREE.DoubleSide }) : fabric;
      const top = 0.705, bottom = a.garment === 'dress' ? 0.34 : 0.2 + random() * 0.08;
      put(torso, shell(0.008, bottom, top, start, coverage), cloth);
      pinsAlong(bottom + 0.02, top - 0.03, 0.008, pinCount);
      if (a.garment === 'toile') {
        const marker = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#2b4fa0' : '#b0252d', roughness: 0.9, side: THREE.DoubleSide });
        put(torso, shell(0.0095, bottom + 0.01, top - 0.01, start + coverage * 0.5 - 0.012, 0.024, 10), marker);
        for (const y of [0.36, 0.56]) put(torso, shell(0.0095, y - 0.005, y + 0.005, start + 0.05, coverage - 0.1, 1), marker);
        for (let i = 0; i < 3; i++) { const phi = start + coverage * (0.2 + random() * 0.6); put(torso, shell(0.0095, 0.42 + random() * 0.05, 0.56, phi, 0.02, 4), marker); }
      } else if (p > 0.55) {
        // a finished neckline and a row of covered buttons
        put(torso, shell(0.011, top - 0.03, top + 0.004, start, coverage, 2), lining);
        for (let i = 0; i < 6; i++) put(torso, new THREE.SphereGeometry(0.009, 8, 6), lining, surface(0, mix(bottom + 0.03, top - 0.06, i / 5), 0.012));
      }
      if (a.garment === 'dress') {
        const length = Math.min(hipY - 0.12, mix(0.75, 1.05, random())) + 0.34;
        const hem = mix(0.34, 0.46, random());
        const points: THREE.Vector2[] = [];
        for (let i = 0; i <= 16; i++) { const t = i / 16, y = 0.345 - length * t; points.push(new THREE.Vector2(Math.max(radiusAt(Math.max(y, 0)) + 0.012, mix(0.14, hem, Math.sin(t * Math.PI / 2) ** 0.85)), y)); }
        const geometry = new THREE.LatheGeometry(points, 64, start, coverage);
        const position = geometry.getAttribute('position');
        const ragged = (1 - p) * 0.11, k1 = random() * 6, k2 = random() * 6;
        for (let i = 0; i < position.count; i++) {
          const x = position.getX(i), y = position.getY(i), z = position.getZ(i), t = clamp01((0.345 - y) / length), phi = Math.atan2(x, z);
          const fold = 1 + 0.085 * t * Math.sin(phi * 11 + k1);
          position.setXYZ(i, x * fold, y + t * t * ragged * (Math.sin(phi * 3 + k2) + 0.5 * Math.sin(phi * 7 + k1)), z * fold * (1 + t * 0.25));
        }
        geometry.computeVertexNormals();
        put(torso, geometry, cloth);
        const sash = put(torso, new THREE.TorusGeometry(radiusAt(0.35) + 0.014, 0.014, 6, 40), lining, [0, 0.35, 0]); sash.rotation.x = Math.PI / 2; sash.scale.z = 1.6;
      }
    } else if (a.garment === 'jacket') {
      const front = 0.16;
      put(torso, shell(0.012, 0.06, 0.72, front, Math.PI * 2 - front * 2, 22, (t) => (1 - t) * 0.012), fabric);
      if (p > 0.25) for (const side of [-1, 1]) { const lapel = put(torso, shell(0.016, 0.42, 0.715, side > 0 ? front : -front - 0.36, 0.36, 8), lining); lapel.castShadow = false; }
      put(torso, shell(0.018, 0.69, 0.75, 0.5, Math.PI * 2 - 1, 3, (t) => t * 0.03), lining);
      if (p > 0.6) for (let i = 0; i < 3; i++) put(torso, new THREE.SphereGeometry(0.013, 8, 6), brass, surface(front + 0.07, 0.14 + i * 0.1, 0.02));
      for (const [side, y] of [[-1, 0.2], [1, 0.2]] as const) put(torso, shell(0.0165, y, y + 0.012, side > 0 ? 0.6 : -1.1, 0.5, 1), lining);
      const sleeves = p < 0.3 ? 0 : p < 0.72 ? 1 : 2;
      const firstSide = random() < 0.5 ? -1 : 1;
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? firstSide : -firstSide;
        const sx = side * 0.205;
        if (i < sleeves) {
          const sleeve = s.rod([sx, hipY + 0.66, 0], [sx + side * 0.05, hipY + 0.1, 0.04], 0.048, fabric, 0.062);
          sleeve.castShadow = true;
          s.ball([0.064, 0.05, 0.064], [sx, hipY + 0.655, 0], fabric, 12);
        } else {
          // an empty armhole edged in chalk-white basting
          const hole = put(torso, new THREE.TorusGeometry(0.058, 0.006, 6, 20), new THREE.MeshStandardMaterial({ color: '#f1efe6' }), [side * 0.188, 0.63, 0]); hole.rotation.y = Math.PI / 2;
        }
      }
      pinsAlong(0.1, 0.68, 0.014, Math.round(pinCount * 0.6));
      if (sleeves < 2 && mood.density > 0.3) {
        // the other sleeve lies folded over the foot of the stand
        const spare = s.rod([-0.2, 0.05, 0.36], [0.22, 0.05, 0.42], 0.055, fabric, 0.045); spare.scale.z = 0.4;
      }
    }

    if (pinSpots.length) {
      const heads = ['#e23b3b', '#f2c230', '#3a78d8', '#f4f1e8', '#34a36a'];
      const pins = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.3 }), pinSpots.length);
      const matrix = new THREE.Matrix4();
      pinSpots.forEach((at, index) => { matrix.makeScale(1, 1, 1 / SQUASH).setPosition(...at); pins.setMatrixAt(index, matrix); pins.setColorAt(index, new THREE.Color(heads[Math.floor(random() * heads.length)])); });
      pins.castShadow = true; torso.add(pins);
    }

    // ---- what was left on it
    const yellow = new THREE.MeshStandardMaterial({ color: '#f1c81f', roughness: 0.6 });
    if (a.extra === 'tape') {
      const l = 0.3 + random() * 0.25, r = 0.3 + random() * 0.25;
      const tape = put(torso, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        [-0.07, 0.72 - l, 0.2], [-0.085, 0.6, 0.2], [-0.1, 0.71, 0.1], [-0.08, 0.775, -0.04], [0, 0.785, -0.085], [0.08, 0.775, -0.04], [0.1, 0.71, 0.1], [0.085, 0.6, 0.2], [0.075, 0.72 - r, 0.215],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z / SQUASH * 0.9))), 60, 0.011, 6), yellow);
      tape.castShadow = true;
      for (const [x, y] of [[-0.07, 0.72 - l], [0.075, 0.72 - r]] as const) put(torso, new THREE.BoxGeometry(0.026, 0.02, 0.008), brass, [x, y, 0.2 / SQUASH * 0.9 + 0.003]);
    } else if (a.extra === 'scissors') {
      const ribbon = new THREE.MeshStandardMaterial({ color: '#b3283a', roughness: 0.8 });
      const steel = new THREE.MeshStandardMaterial({ color: '#cfd4d6', metalness: 0.9, roughness: 0.25 });
      const zf = 0.21 / SQUASH * 0.9;
      put(torso, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.0, 0.43, zf + 0.02], [-0.09, 0.62, zf - 0.02], [-0.085, 0.775, -0.05], [0.085, 0.775, -0.05], [0.09, 0.62, zf - 0.02], [0.0, 0.43, zf + 0.02]].map(([x, y, z]) => new THREE.Vector3(x, y, z))), 40, 0.006, 5), ribbon);
      const shears = new THREE.Group(); shears.position.set(0, 0.42, zf + 0.03); shears.rotation.z = (random() - 0.5) * 0.4; torso.add(shears);
      for (const side of [-1, 1]) {
        const ring = put(shears, new THREE.TorusGeometry(0.024, 0.007, 6, 16), iron, [side * 0.026, -0.02, 0]); ring.scale.y = 1.3;
        const blade = put(shears, new THREE.BoxGeometry(0.02, 0.2, 0.004), steel, [side * 0.006, -0.15, 0]); blade.rotation.z = side * 0.07;
      }
      put(shears, new THREE.CylinderGeometry(0.008, 0.008, 0.012, 8), brass, [0, -0.06, 0]).rotation.x = Math.PI / 2;
    } else if (a.extra === 'hat') {
      const felt = s.material(mood.cheer > 0.55 ? '#c2473a' : '#2c2a30', { roughness: 0.9 });
      const hat = new THREE.Group(); hat.position.set(0, hipY + 0.9, 0); hat.rotation.set(0.12, random() * 6, (random() - 0.5) * 0.3); s.root.add(hat);
      put(hat, new THREE.LatheGeometry([[0.26, -0.01], [0.2, 0.0], [0.1, 0.01], [0.095, 0.08], [0.08, 0.12], [0.0, 0.13]].map(([r, y]) => new THREE.Vector2(r, y)), 28), felt);
      put(hat, new THREE.CylinderGeometry(0.099, 0.103, 0.03, 24), s.material('#d9c9a0'), [0, 0.027, 0]);
      const feather = put(hat, new THREE.SphereGeometry(1, 8, 6), s.material('#3f7f6a'), [0.1, 0.1, 0.02]); feather.scale.set(0.015, 0.11, 0.035); feather.rotation.z = -0.5;
    } else if (a.extra === 'note') {
      const words = ['DO NOT TOUCH', 'FOR ANNA', 'FRIDAY 3 PM', 'TAKE IN 2 CM', 'PAID', 'NOT MINE'];
      const text = words[Math.floor(random() * words.length)];
      const texture = paint(256, 160, (ctx) => { ctx.fillStyle = '#f4efdc'; ctx.fillRect(0, 0, 256, 160); ctx.fillStyle = '#28324a'; ctx.font = 'italic bold 34px serif'; ctx.textAlign = 'center'; const parts = text.split(' '); const half = Math.ceil(parts.length / 2); ctx.fillText(parts.slice(0, half).join(' '), 128, 70, 236); ctx.fillText(parts.slice(half).join(' '), 128, 115, 236); });
      const note = put(torso, new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide }), surface(0.12, 0.55, 0.024));
      note.scale.z = 1; note.rotation.set(-0.15, 0.12, (random() - 0.5) * 0.3);
      put(torso, new THREE.SphereGeometry(0.01, 8, 6), new THREE.MeshStandardMaterial({ color: '#e23b3b' }), surface(0.12, 0.595, 0.03));
    } else if (a.extra === 'pincushion') {
      const tomato = put(torso, new THREE.SphereGeometry(0.05, 14, 10), s.material('#cf3527'), [0.12, 0.745, 0]); tomato.scale.set(1, 0.72, 1 / SQUASH);
      put(torso, new THREE.CylinderGeometry(0.012, 0.016, 0.012, 6), s.material('#3f8a4a'), [0.12, 0.782, 0]);
      for (let i = 0; i < 9; i++) { const angle = random() * 6.3, lean = 0.4 + random() * 0.6; const dir = new THREE.Vector3(Math.sin(angle) * lean, 1, Math.cos(angle) * lean).normalize(); const pin = put(torso, new THREE.SphereGeometry(0.008, 6, 5), new THREE.MeshStandardMaterial({ color: ['#f4f1e8', '#f2c230', '#3a78d8'][i % 3] }), [0.12 + dir.x * 0.065, 0.745 + dir.y * 0.055, dir.z * 0.07]); pin.castShadow = false; }
    }

    // offcuts and a spool on the floor, when the room is busy
    if (a.garment !== 'bare' && mood.density > 0.45) {
      const scrap = new THREE.MeshStandardMaterial({ color: a.garment === 'pattern' ? '#c9a877' : a.garment === 'toile' ? '#e9e2cf' : fabricHex, roughness: 0.9, side: THREE.DoubleSide });
      for (let i = 0; i < Math.round(mood.density * 7); i++) {
        const angle = random() * 6.3, r = 0.2 + random() * 0.3;
        const piece = s.box([0.06 + random() * 0.12, 0.004, 0.04 + random() * 0.07], [Math.sin(angle) * r, 0.003 + i * 0.001, Math.cos(angle) * r], scrap); piece.rotation.y = random() * 3;
      }
      const sp = random() * 6.3;
      s.cylinder(0.02, 0.02, 0.045, [Math.sin(sp) * 0.34, 0.0225, Math.cos(sp) * 0.34], scrap, 12);
      for (const y of [0.002, 0.045]) s.cylinder(0.027, 0.027, 0.004, [Math.sin(sp) * 0.34, y, Math.cos(sp) * 0.34], wood, 12);
    }

    return s.finish({ footprint: 0.42 });
  },
});
