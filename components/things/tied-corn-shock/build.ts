import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { flintEar, gourd, hayBale } from './props';
import { pumpkin, stem } from './pumpkin';

/** A flat strip along a path, `side` giving its broad direction at each point; carries vertex colour. */
function strip(points: THREE.Vector3[], sides: THREE.Vector3[], widths: number[], colour: THREE.Color) {
  const positions: number[] = [], colors: number[] = [], index: number[] = [];
  points.forEach((p, i) => {
    const half = sides[i].clone().multiplyScalar(widths[i] / 2);
    positions.push(p.x - half.x, p.y - half.y, p.z - half.z, p.x + half.x, p.y + half.y, p.z + half.z);
    const shade = 0.85 + 0.15 * (i / points.length);
    colors.push(colour.r * shade, colour.g * shade, colour.b * shade, colour.r * shade, colour.g * shade, colour.b * shade);
    if (i > 0) { const a = (i - 1) * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

function tint(geometry: THREE.BufferGeometry, colour: THREE.Color) {
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([colour.r, colour.g, colour.b], i * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export default defineThing({
  questions: {
    height: score('How tall is the corn shock?', ['Waist high, a porch decoration', 'Head high', 'Taller than a man', 'Towering, a whole field cut and stood up']),
    tie: choice('How is it tied?', {
      tight: 'Cinched tight at the waist with twine: a neat hourglass tepee.',
      loose: 'Loosely tied, the stalks leaning out in a wide shaggy bundle.',
      double: 'Bound in two bands, low and high, a tall slim column.',
      burst: 'The twine has snapped and the stalks are splaying apart, half collapsed.',
    }),
    stalks: choice('What colour are the stalks?', {
      straw: 'Pale straw gold, freshly dried.',
      bleached: 'Sun-bleached to grey-white, brittle and papery.',
      green: 'Still streaked with green, cut early this season.',
      weathered: 'Rain-darkened brown and grey after weeks outdoors.',
    }),
    foot: choice('What leans against its foot?', {
      pumpkins: 'A few orange pumpkins piled at its base.',
      gourds: 'A heap of striped, warty and bottle-necked ornamental gourds.',
      bale: 'A square hay bale, with a pumpkin on top.',
      mums: 'A pot of round, flowering chrysanthemums in rust and gold.',
      nothing: 'Nothing: just the stalks standing alone.',
    }),
    ears: noul('Do ears of multicoloured flint corn hang from its twine?'),
    tucked: choice('What else has been added to it?', {
      none: 'Nothing else.',
      sign: 'A small hand-painted wooden sign wired to the front: HAPPY HARVEST.',
      crow: 'A black crow perched on top of the bundle.',
      lantern: 'A small lit lantern hanging from the twine, glowing in the dusk.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.2, 3, a.height);
    const burst = a.tie === 'burst';
    const baseR = H * (a.tie === 'double' ? 0.15 : a.tie === 'loose' || burst ? 0.26 : 0.21);
    const waistR = H * (a.tie === 'tight' ? 0.035 : a.tie === 'double' ? 0.04 : a.tie === 'loose' ? 0.08 : 0.12);
    const waistY = H * (a.tie === 'double' ? 0.4 : 0.56);
    const flare = H * (a.tie === 'double' ? 0.12 : burst ? 0.32 : a.tie === 'loose' ? 0.24 : 0.18);
    const palette = {
      straw: ['#d9be78', '#cfae62', '#e3cd8e', '#bf9e58'],
      bleached: ['#d7d1bf', '#c9c2ad', '#e2ddcc', '#b7ae98'],
      green: ['#c9b46a', '#9fa457', '#7d9a4a', '#d4bd78'],
      weathered: ['#8a7a5c', '#6f6650', '#9a8a68', '#5e5444'],
    }[a.stalks];
    const dull = new THREE.Color('#7a6e58');

    // Stalks: base on a ring, pinched through the waist, flaring to tasselled tips.
    const stalkGeos: THREE.BufferGeometry[] = [];
    const leafGeos: THREE.BufferGeometry[] = [];
    const count = Math.round(mix(36, 64, a.height) * mix(0.8, 1.2, mood.density));
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + random() * 0.2;
      const rr = baseR * (0.55 + random() * 0.45);
      const twist = (random() - 0.5) * 0.6 + (burst ? 0 : 0.5);
      const top = H * (0.86 + random() * 0.16) * (burst ? 0.85 : 1);
      const lean = burst ? 1 + random() * 0.8 : 1;
      const pts = [
        new THREE.Vector3(Math.cos(ang) * rr, -0.05, Math.sin(ang) * rr),
        new THREE.Vector3(Math.cos(ang + twist * 0.5) * mix(rr, waistR, 0.6) * lean, waistY * 0.55, Math.sin(ang + twist * 0.5) * mix(rr, waistR, 0.6) * lean),
        new THREE.Vector3(Math.cos(ang + twist) * waistR * (0.4 + random() * 0.6) * lean, waistY, Math.sin(ang + twist) * waistR * (0.4 + random() * 0.6) * lean),
        new THREE.Vector3(Math.cos(ang + twist * 1.5) * flare * (0.4 + random() * 0.6) * lean, top * 0.82, Math.sin(ang + twist * 1.5) * flare * (0.4 + random() * 0.6) * lean),
        new THREE.Vector3(Math.cos(ang + twist * 1.7) * flare * (0.7 + random() * 0.8) * lean, top, Math.sin(ang + twist * 1.7) * flare * (0.7 + random() * 0.8) * lean),
      ];
      if (a.tie === 'double') pts.splice(3, 0, new THREE.Vector3(Math.cos(ang + twist * 1.2) * waistR * 1.6, H * 0.68, Math.sin(ang + twist * 1.2) * waistR * 1.6));
      const curve = new THREE.CatmullRomCurve3(pts);
      const colour = new THREE.Color(palette[Math.floor(random() * palette.length)]).lerp(dull, mood.wear * 0.3);
      const geo = new THREE.TubeGeometry(curve, 14, H * 0.008 * (0.7 + random() * 0.6), 5, false);
      stalkGeos.push(tint(geo, colour));
      // Tassel at the tip.
      const tip = curve.getPoint(1);
      for (let t = 0; t < 3; t++) {
        const dir = new THREE.Vector3(random() - 0.5, 0.6 + random(), random() - 0.5).normalize().multiplyScalar(H * 0.06);
        const g = new THREE.CylinderGeometry(0.002, 0.004, dir.length(), 3);
        g.translate(0, dir.length() / 2, 0);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize()));
        g.translate(tip.x, tip.y, tip.z);
        stalkGeos.push(tint(g, colour.clone().offsetHSL(0.01, 0, 0.08)));
      }
      // Two or three long, ragged leaves drooping outward from the stalk.
      const leaves = 1 + Math.floor(random() * 3);
      for (let l = 0; l < leaves; l++) {
        const t0 = 0.3 + random() * 0.6;
        const start = curve.getPoint(t0);
        const out = new THREE.Vector3(start.x, 0, start.z);
        if (out.lengthSq() < 1e-6) out.set(Math.cos(ang), 0, Math.sin(ang));
        out.normalize();
        out.applyAxisAngle(up, (random() - 0.5) * 1.2);
        const len = H * (0.22 + random() * 0.18);
        const droop = mix(0.6, 1.4, random()) * (a.stalks === 'green' ? 0.7 : 1.1);
        const lp: THREE.Vector3[] = [], sides: THREE.Vector3[] = [], widths: number[] = [];
        const side = new THREE.Vector3().crossVectors(up, out).normalize();
        const twistRate = (random() - 0.5) * 3;
        for (let k = 0; k <= 8; k++) {
          const f = k / 8;
          lp.push(start.clone().addScaledVector(out, len * f * 0.75).addScaledVector(up, len * (0.35 * f - droop * f * f)));
          sides.push(side.clone().applyAxisAngle(out, twistRate * f));
          widths.push(H * 0.035 * Math.sin(Math.PI * (0.15 + f * 0.85)) * (1 - f * 0.5));
        }
        const colour = new THREE.Color(palette[Math.floor(random() * palette.length)]).lerp(dull, mood.wear * 0.3);
        if (a.stalks === 'green' && random() < 0.5) colour.lerp(new THREE.Color('#5d8a3a'), 0.6);
        leafGeos.push(strip(lp, sides, widths, colour));
      }
    }
    const vertexMat = s.material('#ffffff', { vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
    s.mesh(mergeGeometries(stalkGeos), vertexMat);
    stalkGeos.forEach((g) => g.dispose());
    // The leaves rustle about the waist, so they sit in their own pivot.
    const rustle = new THREE.Group();
    rustle.position.y = waistY;
    const leafMesh = new THREE.Mesh(mergeGeometries(leafGeos).translate(0, -waistY, 0), vertexMat);
    leafMesh.castShadow = leafMesh.receiveShadow = true;
    rustle.add(leafMesh);
    s.root.add(rustle);
    leafGeos.forEach((g) => g.dispose());

    // Twine bands.
    const twine = s.material('#7a3f1c', { roughness: 0.95 });
    const bands = burst ? [] : a.tie === 'double' ? [waistY, H * 0.68] : [waistY];
    for (const y of bands) {
      const r = a.tie === 'double' && y > waistY ? waistR * 1.6 : waistR;
      for (let w = 0; w < 3; w++) s.ring(r * 1.1 + 0.016, 0.006 + H * 0.004, [0, y + (w - 1) * H * 0.016, 0], twine).rotation.x = Math.PI / 2;
      // Knot and tails at the front.
      s.ball([0.025, 0.02, 0.02], [0, y, r * 1.08 + 0.025], twine, 8);
      s.rod([0, y, r * 1.08 + 0.03], [0.04, y - 0.14, r * 1.08 + 0.05], 0.005, twine);
      s.rod([0, y, r * 1.08 + 0.03], [-0.03, y - 0.12, r * 1.08 + 0.05], 0.005, twine);
    }
    if (burst) {
      // The snapped twine hangs in two loose ends.
      s.tube([[waistR * 2, waistY + 0.02, waistR], [waistR * 2.6, waistY - 0.08, waistR * 2], [waistR * 2.8, waistY - 0.25, waistR * 2.4]], 0.007, twine);
      s.tube([[-waistR * 2, waistY + 0.02, waistR], [-waistR * 2.5, waistY - 0.12, waistR * 1.8]], 0.007, twine);
    }

    // Flint corn ears hung from the twine.
    const bandR = burst ? waistR * 2 : waistR;
    if (a.ears) {
      const n = 3 + Math.floor(random() * 2);
      for (let i = 0; i < n; i++) {
        const ang = Math.PI / 2 + (i - (n - 1) / 2) * 0.42;
        flintEar(s, new THREE.Vector3(Math.cos(ang) * (bandR * 1.1 + 0.05), waistY - 0.02, Math.sin(ang) * (bandR * 1.1 + 0.05)), random, H * 0.1);
      }
    }

    // What is tucked in.
    if (a.tucked === 'sign') {
      const board = s.label('HAPPY HARVEST', H * 0.22, H * 0.08, [0, waistY - H * 0.14, baseR * 0.55 + 0.03], '#f4ead2', '#6b2a1a');
      board.rotation.x = -0.2;
    }
    if (a.tucked === 'crow') {
      const black = s.material('#141416', { roughness: 0.55 });
      const tipY = H * 0.97;
      const crow = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), black); body.scale.set(0.07, 0.065, 0.12); crow.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), black); head.position.set(0, 0.06, 0.1); crow.add(head);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.06, 6), s.material('#2a2a2a')); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.055, 0.16); crow.add(beak);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.11), black); tail.position.set(0, -0.02, -0.14); tail.rotation.x = -0.4; crow.add(tail);
      crow.traverse((o) => { o.castShadow = true; });
      crow.position.set(0, tipY, 0);
      crow.scale.setScalar(mix(1.1, 1.6, a.height));
      crow.rotation.y = random() * 1.2 - 0.6;
      s.root.add(crow);
    }
    if (a.tucked === 'lantern') {
      // A lit lantern on a shepherd's hook staked beside it.
      const glow = s.material('#ffd27a', { emissive: '#ffb347', emissiveIntensity: mix(0.8, 2.2, mood.cheer), transparent: true, opacity: 0.9 });
      const metal = s.material('#2a2a2c', { metalness: 0.6, roughness: 0.4 });
      const px = -baseR * 1.05 - 0.1, pz = baseR * 0.5, ph = Math.min(1.25, H * 0.62);
      s.rod([px, 0, pz], [px, ph, pz], 0.012, metal);
      s.tube([[px, ph, pz], [px + 0.06, ph + 0.1, pz + 0.02], [px + 0.16, ph + 0.06, pz + 0.04], [px + 0.18, ph - 0.02, pz + 0.05]], 0.008, metal);
      const lx = px + 0.18, lz = pz + 0.05, ly = ph - 0.2;
      s.rod([lx, ph - 0.02, lz], [lx, ly + 0.11, lz], 0.004, metal);
      s.cylinder(0.055, 0.055, 0.13, [lx, ly, lz], glow, 12);
      s.cylinder(0.035, 0.065, 0.035, [lx, ly + 0.08, lz], metal, 12);
      s.cylinder(0.065, 0.065, 0.015, [lx, ly - 0.07, lz], metal, 12);
      for (let k = 0; k < 4; k++) { const an = k * Math.PI / 2 + 0.4; s.rod([lx + Math.cos(an) * 0.055, ly - 0.065, lz + Math.sin(an) * 0.055], [lx + Math.cos(an) * 0.055, ly + 0.065, lz + Math.sin(an) * 0.055], 0.004, metal); }
    }

    // What leans against its foot, in front.
    const frontZ = baseR * 0.95;
    if (a.foot === 'pumpkins') {
      const stemMat = s.material('#6e6236');
      const n = 2 + Math.floor(random() * 2);
      for (let i = 0; i < n; i++) {
        const r = (i === 0 ? 0.2 : 0.13 + random() * 0.05);
        const x = (i === 0 ? 0 : (i % 2 ? 1 : -1) * (0.26 + random() * 0.1)) + (random() - 0.5) * 0.05;
        const p = pumpkin(s, { radius: r, height: r * 1.5, ribs: 10, groove: 0.8, color: new THREE.Color('#e2701a').offsetHSL((random() - 0.5) * 0.03, 0, 0), slump: 0.2 }, random);
        p.mesh.position.set(x, 0, frontZ + r * 0.6 + (i ? 0.05 : 0.12));
        stem(s, p.topAt.clone().add(p.mesh.position), 0.06, 0.014, stemMat, random);
      }
    } else if (a.foot === 'gourds') {
      for (let i = 0; i < 9; i++) gourd(s, [(random() - 0.5) * baseR * 1.6, 0, frontZ + random() * 0.25], random);
    } else if (a.foot === 'bale') {
      hayBale(s, [0, 0, frontZ + 0.28], random, { dull: mood.wear * 0.6, turn: (random() - 0.5) * 0.3 });
      const p = pumpkin(s, { radius: 0.15, height: 0.22, ribs: 10, groove: 0.8, color: '#e2701a', slump: 0.1 }, random);
      p.mesh.position.set(0.15, 0.36, frontZ + 0.28);
      stem(s, p.topAt.clone().add(p.mesh.position), 0.05, 0.012, s.material('#6e6236'), random);
    } else if (a.foot === 'mums') {
      const pot = s.material('#a4471e', { roughness: 0.8 });
      const z = frontZ + 0.22;
      s.lathe([[0.001, 0], [0.15, 0], [0.19, 0.24], [0.2, 0.26], [0.001, 0.26]], pot, [0, 0, z]);
      const bloom = new THREE.Color(['#b8461e', '#e0a420', '#9a2a4a', '#e8d8b0'][Math.floor(random() * 4)]);
      const pointsM: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
      for (let i = 0; i < 110; i++) {
        const u = random() * Math.PI * 2, v = Math.acos(random());
        pointsM.push({ at: [Math.cos(u) * Math.sin(v) * 0.26, 0.26 + Math.cos(v) * 0.2, z + Math.sin(u) * Math.sin(v) * 0.26], size: 0.035, color: bloom.clone().offsetHSL(0, 0, (random() - 0.5) * 0.15) });
      }
      s.ball([0.25, 0.17, 0.25], [0, 0.27, z], s.material('#3c5a2a'), 14);
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.7 }), pointsM);
    }

    const amount = mix(0.004, 0.05, mood.energy);
    return s.finish({
      footprint: baseR * 1.1,
      update: (_dt, time) => {
        rustle.rotation.z = Math.sin(time * 1.7) * amount + Math.sin(time * 4.3) * amount * 0.3;
        rustle.rotation.x = Math.sin(time * 1.3 + 1) * amount * 0.7;
      },
    });
  },
});
