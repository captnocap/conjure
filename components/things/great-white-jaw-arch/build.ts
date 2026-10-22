import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type P3, canvasTexture, card, taper } from './lib';

const SPECIES = {
  'great-white': 'Great white: a broad heavy jaw with big flat serrated triangles, the poster shark.',
  mako: 'Mako: a narrower, more pointed jaw bristling with long thin curved needles that stick out past the lip.',
  tiger: 'Tiger shark: a wide blunt jaw with short slanted cockscomb teeth, each notched like a can opener.',
  megalodon: 'Megalodon: a plaster reconstruction three times the size, set with hand-sized dark fossil teeth; a person could stand inside.',
} as const;

interface Kind { width: number; depth: number; tooth: number; slim: number; count: number; scale: number }
const KINDS: Record<keyof typeof SPECIES, Kind> = {
  'great-white': { width: 0.3, depth: 0.2, tooth: 0.27, slim: 1, count: 11, scale: 1 },
  mako: { width: 0.21, depth: 0.25, tooth: 0.36, slim: 0.45, count: 12, scale: 1 },
  tiger: { width: 0.34, depth: 0.17, tooth: 0.17, slim: 1.25, count: 13, scale: 1 },
  megalodon: { width: 0.3, depth: 0.2, tooth: 0.22, slim: 1.05, count: 11, scale: 3.3 },
};

function toothGeometry(species: keyof typeof SPECIES) {
  const shape = new THREE.Shape();
  if (species === 'mako') {
    shape.moveTo(-0.5, 0); shape.lineTo(0.5, 0); shape.quadraticCurveTo(0.2, 0.45, 0.28, 1); shape.quadraticCurveTo(-0.1, 0.5, -0.5, 0);
  } else if (species === 'tiger') {
    shape.moveTo(-0.5, 0); shape.lineTo(0.5, 0); shape.lineTo(0.5, 0.28); shape.lineTo(0.2, 0.36); shape.lineTo(0.12, 0.5); shape.quadraticCurveTo(-0.1, 0.85, -0.42, 1); shape.quadraticCurveTo(-0.38, 0.5, -0.5, 0);
  } else {
    // A serrated broad triangle.
    shape.moveTo(-0.5, 0);
    shape.lineTo(0.5, 0);
    for (let i = 1; i <= 7; i++) shape.lineTo(0.5 - i * 0.066 + (i % 2 ? 0.02 : -0.012), i / 7.2);
    shape.lineTo(0, 1);
    for (let i = 7; i >= 1; i--) shape.lineTo(-0.5 + i * 0.066 - (i % 2 ? 0.02 : -0.012), i / 7.2);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.06, bevelSegments: 1 });
  geometry.translate(0, 0, -0.08);
  return geometry;
}

export default defineThing({
  questions: {
    species: choice('Whose jaw is it?', SPECIES),
    gape: score('How wide is it held open?', ['A narrow grin, teeth nearly meshing', 'Half open', 'Wide', 'Cranked as far as the hinge will go, a full hoop']),
    teeth: choice('How complete are the teeth?', {
      full: 'Every row intact, an unbroken white saw.',
      gaps: 'Mostly there, with dark gaps where teeth have dropped out.',
      shedding: 'More gaps than teeth, and loose ones scattered on the shelf beneath.',
      front: 'Only the big front teeth left; the sides are bare gum line.',
    }),
    mounting: choice('How is it displayed?', {
      plaque: 'Fixed to a dark varnished wooden shield, the bar-wall trophy.',
      wire: 'Cradled on a slender brass wire stand over a round wooden base.',
      stick: 'Sitting on a board with the upper jaw propped open by a rough stick.',
      frame: 'Bolted to a black steel floor frame, museum hardware meant to be walked around.',
    }),
    lodged: choice('Is anything caught in it?', {
      nothing: 'Nothing: a clean empty mouth.',
      hook: 'A big steel fishing hook through the corner with a length of wire leader trailing.',
      plate: 'A bent car licence plate resting in the lower jaw, the joke everyone makes.',
      net: 'A tangle of ghost net and an orange float snagged on the teeth.',
      bone: 'A single large pale bone lying across the lower teeth.',
    }),
    label: choice('What does the label say about it?', {
      souvenir: 'A cardboard price tag: seaside gift-shop stock.',
      museum: 'A typed museum card with the Latin name.',
      catch: 'A hand-lettered board with a date and a weight: somebody caught this.',
      warning: 'A small sign: PLEASE DO NOT TOUCH THE TEETH.',
      none: 'No label.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const kind = KINDS[a.species];
    const K = kind.scale;
    const W = kind.width * K, D = kind.depth * K;
    const G = W * mix(0.55, 2.3, a.gape);
    const stick = a.mounting === 'stick';
    const up = stick ? 0.97 : 0.52;
    const fossil = a.species === 'megalodon';

    const jaw = new THREE.Group();
    s.root.add(jaw);
    const add = <T extends THREE.Object3D>(node: T) => { jaw.add(node); return node; };

    const point = (theta: number, upper: boolean): THREE.Vector3 => {
      const c = Math.pow(Math.max(0, Math.cos(theta)), 0.75);
      return new THREE.Vector3(W * Math.sin(theta) * (upper ? 1 : 0.94), (upper ? G * up : -G * (1 - up)) * c, D * c * (upper ? 1 : 0.86));
    };

    // Cartilage: two flattened arcs meeting at swollen hinges.
    const tan = new THREE.Color(fossil ? '#cfc9bb' : '#dccba2').lerp(new THREE.Color('#9c8a63'), mood.wear * 0.4);
    const cartilageMap = canvasTexture(128, 256, (ctx, w, h) => {
      ctx.fillStyle = `#${tan.getHexString()}`;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 220; i++) {
        ctx.fillStyle = `rgba(${fossil ? '90,90,90' : '120,85,40'},${0.04 + random() * 0.1})`;
        ctx.fillRect(random() * w, random() * h, 2 + random() * 10, 2 + random() * 24);
      }
    });
    const cartilage = new THREE.MeshStandardMaterial({ map: cartilageMap, roughness: 0.75 });
    const thickness = W * 0.105;
    for (const upper of [true, false]) {
      const pts: P3[] = [];
      for (let i = 0; i <= 16; i++) pts.push(point(-Math.PI / 2 + (i / 16) * Math.PI, upper).toArray() as unknown as P3);
      const arc = add(s.mesh(taper(pts, (t) => thickness * (upper ? 1 : 0.9) * (0.72 + 0.4 * Math.sin(t * Math.PI)), { segments: 56, sides: 12, flat: 0.62 }), cartilage));
      arc.castShadow = true;
    }
    for (const side of [-1, 1]) {
      const hinge = add(s.ball([thickness * 1.15, thickness * 1.5, thickness * 1.3], [side * W * 0.98, 0, -thickness * 0.3], cartilage, 14));
      hinge.rotation.z = side * 0.2;
      add(s.ball([thickness * 0.8, thickness * 1.0, thickness * 1.6], [side * W * 0.96, thickness * 0.2, -thickness * 1.5], cartilage, 12));
    }

    // Teeth: rows receding into the mouth, one instanced mesh.
    const enamel = new THREE.Color(fossil ? '#4a4b4c' : '#f6f1e2').lerp(new THREE.Color(fossil ? '#6a5f52' : '#cdb77c'), mood.wear * 0.45);
    const toothMaterial = new THREE.MeshStandardMaterial({ color: enamel, roughness: fossil ? 0.5 : 0.25 });
    const geometry = toothGeometry(a.species);
    const rows = fossil ? 3 : 4;
    const matrices: THREE.Matrix4[] = [];
    const loose: number[] = [];
    const span = 1.36; // radians each side of centre that carries teeth
    const keepChance = { full: 1, gaps: 0.8, shedding: 0.42, front: 1 }[a.teeth];
    const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), inward = new THREE.Vector3();
    for (const upper of [true, false])
      for (let i = -kind.count; i <= kind.count; i++) {
        const theta = (i / kind.count) * span;
        const dropped = a.teeth === 'front' ? Math.abs(i) > kind.count * 0.38 : random() > keepChance;
        const here = point(theta, upper);
        X.copy(point(theta + 0.02, upper)).sub(point(theta - 0.02, upper)).normalize();
        inward.set(-Math.sin(theta), 0, -Math.cos(theta));
        const fall = 0.5 + 0.5 * Math.pow(Math.cos(theta), 0.7);
        const height = W * kind.tooth * fall * (upper ? 1 : 0.82) * mix(0.9, 1.08, random());
        const width = ((W * span) / kind.count) * 0.98 * kind.slim * (0.75 + 0.25 * fall);
        for (let row = 0; row < rows; row++) {
          if (dropped && (row === 0 || random() > 0.5)) { if (row === 0) loose.push(height); continue; }
          Y.set(0, upper ? -1 : 1, 0).multiplyScalar(1 - row * 0.27).addScaledVector(inward, 0.12 + row * 0.42).normalize();
          Y.addScaledVector(X, -Y.dot(X)).normalize();
          Z.crossVectors(X, Y);
          const shrink = 1 - row * 0.13;
          const mirror = a.species !== 'great-white' && a.species !== 'megalodon' && i < 0 ? -1 : 1;
          const base = here.clone().addScaledVector(inward, thickness * (0.1 + row * 0.5)).add(new THREE.Vector3(0, (upper ? -1 : 1) * thickness * (0.42 - row * 0.1), 0));
          const m = new THREE.Matrix4().makeBasis(X.clone().multiplyScalar(width * shrink * mirror), Y.clone().multiplyScalar(height * shrink), Z.clone().multiplyScalar(width * shrink * mirror));
          m.setPosition(base);
          matrices.push(m);
        }
      }
    const teeth = new THREE.InstancedMesh(geometry, toothMaterial, Math.max(1, matrices.length));
    matrices.forEach((m, i) => teeth.setMatrixAt(i, m));
    teeth.count = matrices.length;
    teeth.castShadow = true;
    add(teeth);
    if (fossil) {
      // Pale plaster gum line the fossil teeth are set into.
      for (const upper of [true, false]) {
        const pts: P3[] = [];
        for (let i = 0; i <= 12; i++) { const p = point(-span + (i / 12) * span * 2, upper); p.y += (upper ? -1 : 1) * thickness * 0.45; pts.push(p.toArray() as unknown as P3); }
        add(s.mesh(taper(pts, () => thickness * 0.42, { segments: 40, sides: 8 }), s.material('#8d8478', { roughness: 0.95 })));
      }
    }

    // Tilt back a little so the viewer looks into it, and lift it to its mount.
    const steel = s.material('#2a2c2e', { metalness: 0.6, roughness: 0.45 });
    const brass = s.material('#b9944a', { metalness: 0.8, roughness: 0.3 });
    const wood = s.material('#4b2e1c', { roughness: 0.5 });
    const tilt = stick ? 0 : a.mounting === 'plaque' ? -0.1 : -0.22;
    jaw.rotation.x = tilt;
    const low = G * (1 - up) + thickness * 1.2;
    const baseTop = 0.03 * K;
    let jawY = baseTop + low + (stick ? 0 : 0.1 * K);
    const baseW = W * 1.25, baseD = Math.max(D * 1.15, 0.16 * K);
    let labelAt: P3 = [0, baseTop / 2, baseD * 0.5 + D * 0.5 + 0.002];

    if (a.mounting === 'plaque') {
      jawY = baseTop + low + 0.07 * K;
      const outline = new THREE.Shape();
      const hw = W * 1.3, top = G * up + W * 0.45, bottom = -(G * (1 - up) + W * 0.5);
      outline.moveTo(-hw, top * 0.75); outline.quadraticCurveTo(-hw * 0.5, top * 0.8, 0, top * 1.05); outline.quadraticCurveTo(hw * 0.5, top * 0.8, hw, top * 0.75);
      outline.quadraticCurveTo(hw * 1.05, bottom * 0.3, hw * 0.55, bottom * 0.9); outline.quadraticCurveTo(0, bottom * 1.25, -hw * 0.55, bottom * 0.9); outline.quadraticCurveTo(-hw * 1.05, bottom * 0.3, -hw, top * 0.75);
      const board = add(s.mesh(new THREE.ExtrudeGeometry(outline, { depth: 0.025 * K, bevelEnabled: true, bevelSize: 0.012 * K, bevelThickness: 0.01 * K, bevelSegments: 2 }), wood, [0, 0, -thickness * 2.6 - 0.03 * K]));
      board.castShadow = true;
      jawY = baseTop - bottom * 1.1 + 0.02 * K;
      s.box([baseW * 1.7, baseTop, baseD * 1.5], [0, baseTop / 2, 0], wood);
      s.box([0.03 * K, jawY * 0.8, 0.03 * K], [0, jawY * 0.4, -thickness * 3 - 0.05 * K], wood).rotation.x = 0.08;
      for (const side of [-1, 1]) add(s.cylinder(0.008 * K, 0.008 * K, 0.012 * K, [side * W * 0.98, 0, -thickness * 2.4], brass, 8)).rotation.x = Math.PI / 2;
      labelAt = [0, baseTop / 2, baseD * 0.75 + 0.002];
    } else if (a.mounting === 'wire' || a.mounting === 'frame') {
      const heavy = a.mounting === 'frame';
      const metal = heavy ? steel : brass;
      const r = (heavy ? 0.012 : 0.0045) * K;
      jawY = baseTop + low + (heavy ? 0.22 : 0.14) * K;
      if (heavy) {
        s.box([baseW * 2, baseTop * 0.5, baseD * 2], [0, baseTop * 0.25, 0], steel);
        for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.012 * K, 0.012 * K, 0.012 * K, [x * baseW * 0.9, baseTop * 0.55, z * baseD * 0.88], s.material('#8c8f90', { metalness: 0.8 }), 6);
      } else s.cylinder(baseW * 0.9, baseW * 0.95, baseTop, [0, baseTop / 2, 0], wood, 36);
      for (const side of [-1, 1]) {
        // An upright to each hinge with a little cradle hook.
        s.tube([[side * W * 0.5, baseTop, -D * 0.2], [side * W * 0.9, baseTop + (jawY - baseTop) * 0.5, -D * 0.25], [side * W * 1.0, jawY - thickness * 1.5, -thickness], [side * W * 1.12, jawY - thickness * 0.4, 0], [side * W * 1.02, jawY + thickness * 0.5, thickness * 0.6]], r, metal);
      }
      // A back strut up to the crown of the upper jaw.
      const crown = point(0, true).applyEuler(new THREE.Euler(tilt, 0, 0));
      s.tube([[0, baseTop, -D * 0.55], [0, jawY * 0.6, -D * 0.75], [0, jawY + crown.y * 0.7, crown.z - D * 0.9], [0, jawY + crown.y + thickness * 0.2, crown.z - thickness * 1.2]], r, metal);
      labelAt = heavy ? [0, baseTop * 0.5 + 0.001, baseD * 0.7] : [0, baseTop / 2, baseW * 0.95 + 0.004];
    } else {
      s.box([baseW * 2.1, baseTop, (D + baseD) * 1.25], [0, baseTop / 2, D * 0.35], s.material('#8a6a45', { roughness: 0.85 }));
      jawY = baseTop + G * (1 - up) + thickness * 0.75;
      // The prop: a rough stick between the front teeth, a little off centre.
      const theta = 0.42 * (random() > 0.5 ? 1 : -1);
      const foot = point(theta, false).multiplyScalar(0.8), head = point(theta * 0.8, true);
      head.x *= 0.8; head.z *= 0.86;
      add(s.rod([foot.x, foot.y + thickness * 0.5, foot.z], [head.x, head.y - thickness * 0.5, head.z], 0.014 * K, s.material('#7b5b3a', { roughness: 1 }), 0.011 * K));
      add(s.rod([head.x, head.y - G * 0.4, head.z], [head.x + 0.04 * K, head.y - G * 0.33, head.z + 0.02 * K], 0.005 * K, s.material('#7b5b3a', { roughness: 1 }), 0.002 * K));
      labelAt = [0, baseTop / 2, D * 0.35 + (D + baseD) * 0.625 + 0.002];
    }
    jaw.position.y = jawY;

    // Loose teeth lying where they fell.
    if (loose.length && a.teeth !== 'front') {
      const fallen = new THREE.InstancedMesh(geometry, toothMaterial, Math.min(loose.length, 26));
      const e = new THREE.Euler(), q = new THREE.Quaternion();
      for (let i = 0; i < fallen.count; i++) {
        const size = loose[i];
        q.setFromEuler(e.set(Math.PI / 2 + (random() - 0.5) * 0.2, 0, random() * 6.3));
        fallen.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3((random() - 0.5) * baseW * 1.6, baseTop + 0.004 * K, D * 0.3 + (random() - 0.2) * baseD * 0.9), q, new THREE.Vector3(size * 0.7 * kind.slim, size, size * 0.7)));
      }
      fallen.castShadow = true;
      s.root.add(fallen);
    }

    // Something caught in the mouth.
    const mouth = new THREE.Vector3(0, jawY, 0);
    if (a.lodged === 'hook') {
      const side = random() > 0.5 ? 1 : -1;
      const at = point(side * 1.0, false).applyEuler(new THREE.Euler(tilt, 0, 0)).add(mouth);
      const size = Math.max(0.05, W * 0.2);
      const hook = s.ring(size * 0.5, size * 0.07, [at.x, at.y - size * 0.1, at.z + size * 0.25], steel, Math.PI * 1.25);
      hook.rotation.set(0, Math.PI / 2, 2.2);
      s.rod([at.x, at.y + size * 0.25, at.z + size * 0.7], [at.x, at.y - size * 1.2, at.z + size * 0.85], size * 0.07, steel);
      const leader: P3[] = [[at.x, at.y - size * 1.2, at.z + size * 0.85]];
      for (let i = 1; i <= 5; i++) leader.push([at.x - side * i * W * 0.22 * (0.6 + random() * 0.5), Math.max(baseTop + 0.01, at.y - size * 1.2 - (i / 5) * (at.y - size * 1.2 - baseTop) * 1.05), at.z + size + i * 0.02 * K + random() * 0.05 * K]);
      s.tube(leader, Math.max(0.0025, 0.002 * K), s.material('#7d8082', { metalness: 0.7, roughness: 0.4 }));
    } else if (a.lodged === 'plate') {
      const plateMap = canvasTexture(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#e9e4d0'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#1d3f7a'; ctx.lineWidth = 6; ctx.strokeRect(6, 6, w - 12, h - 12);
        ctx.fillStyle = '#1d3f7a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 62px monospace'; ctx.fillText(`${100 + Math.floor(random() * 899)} ${100 + Math.floor(random() * 899)}`, w / 2, h * 0.56);
        ctx.font = 'bold 17px sans-serif'; ctx.fillText("SPORTSMAN'S COAST", w / 2, 22);
        for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(110,60,25,${0.15 + random() * 0.3})`; ctx.beginPath(); ctx.arc(random() * w, random() * h, 2 + random() * 9, 0, 7); ctx.fill(); }
      });
      const plateMaterial = new THREE.MeshStandardMaterial({ map: plateMap, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
      const bent = new THREE.PlaneGeometry(0.3, 0.15, 8, 1);
      const p = bent.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, -Math.abs(p.getX(i)) * 0.45 + Math.sin(p.getX(i) * 30) * 0.004);
      bent.computeVertexNormals();
      const front = point(0, false).applyEuler(new THREE.Euler(tilt, 0, 0)).add(mouth);
      const plate = s.mesh(bent, plateMaterial, [W * 0.08, front.y + 0.1 + thickness, front.z * 0.55]);
      plate.rotation.set(-0.5, 0.25, 0.22);
    } else if (a.lodged === 'net') {
      const rope = s.material('#3f6f66', { roughness: 1 });
      const top = point(0.5, true).applyEuler(new THREE.Euler(tilt, 0, 0)).add(mouth);
      const bottom = point(-0.4, false).applyEuler(new THREE.Euler(tilt, 0, 0)).add(mouth);
      for (let i = 0; i < 7; i++) {
        const f = i / 6;
        s.tube([[top.x - f * W * 0.9, top.y - thickness, top.z - f * 0.03], [top.x - f * W * 0.7 + (random() - 0.5) * W * 0.3, (top.y + bottom.y) / 2 + (random() - 0.5) * G * 0.2, top.z * 0.8 + random() * D * 0.3], [bottom.x + f * W * 0.6, bottom.y + thickness, bottom.z], [bottom.x + f * W * 0.8, Math.max(baseTop + 0.01, bottom.y - G * 0.3 - f * 0.05), bottom.z + 0.05 * K + random() * 0.05 * K]], 0.0035 * Math.sqrt(K), rope);
      }
      for (let i = 0; i < 5; i++) s.tube([[top.x - W * 0.9, top.y - G * (0.15 + i * 0.16), top.z * 0.75], [top.x - W * 0.45, top.y - G * (0.2 + i * 0.16) - random() * 0.03, top.z * 0.95], [top.x, top.y - G * (0.14 + i * 0.16), top.z * 0.85]], 0.003 * Math.sqrt(K), rope);
      s.ball([0.045 * Math.sqrt(K), 0.045 * Math.sqrt(K), 0.045 * Math.sqrt(K)], [bottom.x + W * 0.85, Math.max(baseTop + 0.045 * Math.sqrt(K), bottom.y - G * 0.3), bottom.z + 0.09 * K], s.material('#e8662a', { roughness: 0.6 }), 14);
    } else if (a.lodged === 'bone') {
      const bone = s.material('#eae2cc', { roughness: 0.7 });
      const front = point(0, false).applyEuler(new THREE.Euler(tilt, 0, 0)).add(mouth);
      const y = front.y + thickness * 1.3 + W * kind.tooth * 0.5, z = front.z * 0.62, len = W * 0.95;
      s.rod([-len, y, z], [len, y + W * 0.12, z + 0.02], W * 0.06, bone, W * 0.05);
      for (const side of [-1, 1]) for (const dz of [-1, 1]) s.ball([W * 0.085, W * 0.075, W * 0.085], [side * len, y + (side > 0 ? W * 0.12 : 0), z + dz * W * 0.05], bone, 10);
    }

    // The label.
    if (a.label !== 'none') {
      const year = 1958 + Math.floor(random() * 30);
      const latin = { 'great-white': 'Carcharodon carcharias', mako: 'Isurus oxyrinchus', tiger: 'Galeocerdo cuvier', megalodon: 'Otodus megalodon  (cast)' }[a.species];
      const lines = {
        souvenir: [`$${fossil ? 950 : 20 + Math.floor(random() * 70)}.00`, 'genuine shark jaw'],
        museum: [latin, 'jaws, dried preparation'],
        catch: [`${fossil ? 'FOUND' : 'CAUGHT'} ${year}`, fossil ? 'in the river bed' : `${300 + Math.floor(random() * 2200)} lb  off the pier`],
        warning: ['PLEASE DO NOT', 'TOUCH THE TEETH'],
      }[a.label];
      const width = Math.min(W * 1.5, 0.3 * Math.sqrt(K)), height = width * 0.36;
      const tag = card(lines, width, height, a.label === 'warning' ? '#8c1c13' : '#231f1a', a.label === 'souvenir' ? '#f3e37a' : a.label === 'catch' ? '#d9c8a0' : '#f0e9d6', a.label === 'museum' ? 'monospace' : 'serif');
      tag.position.set(a.mounting === 'stick' ? -baseW * 0.55 : 0, labelAt[1] + height * 0.42, labelAt[2] + height * 0.3);
      tag.rotation.x = -0.6;
      if (a.label === 'souvenir') tag.rotation.z = 0.12;
      s.root.add(tag);
      s.box([width * 0.5, 0.006 * K, height * 0.4], [tag.position.x, labelAt[1] + 0.003 * K, tag.position.z + height * 0.05], wood);
    }

    return s.finish();
  },
});
