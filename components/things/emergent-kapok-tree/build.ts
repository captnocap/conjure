import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V = THREE.Vector3;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** A tapered tube along a smooth curve: the building block of every trunk and branch. */
function limb(points: V[], r0: number, r1: number, sides = 7): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const n = Math.max(4, points.length * 3);
  const frames = curve.computeFrenetFrames(n, false);
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const p = curve.getPointAt(i / n), r = r0 + (r1 - r0) * (i / n);
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j < sides; j++) {
      const a = (j / sides) * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r;
      pos.push(p.x + N.x * c + B.x * s, p.y + N.y * c + B.y * s, p.z + N.z * c + B.z * s);
    }
  }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j, b = i * sides + ((j + 1) % sides), c = a + sides, d = b + sides;
      idx.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A lumpy faceted ball: one clump of foliage. */
function clump(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + 0.2 * Math.sin(x * 4.7 + y * 2.1) * Math.cos(z * 5.3 - y * 3.2) + 0.1 * Math.sin(y * 9 + x * 7 + z * 3);
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}

interface Blob { at: V; size: V; color: THREE.Color; turn?: number }
function instances(geometry: THREE.BufferGeometry, material: THREE.Material, blobs: Blob[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, blobs.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = v(0, 1, 0);
  blobs.forEach((b, i) => {
    q.setFromAxisAngle(up, b.turn ?? 0);
    m.compose(b.at, q, b.size);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, b.color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export default defineThing({
  questions: {
    crown: choice('What shape is its crown?', {
      umbrella: 'A broad, nearly flat umbrella on upswept limbs: the classic emergent.',
      tiered: 'Stacked horizontal shelves of foliage, pagoda-like, one whorl above another.',
      dome: 'A full rounded cauliflower dome, heavy and generous.',
      windswept: 'Lopsided, all its limbs and leaves streaming to one side.',
      staghead: 'An old stag-headed crown: bare antler limbs poking up through thinning leaves.',
    }),
    trunk: choice('What is the trunk like?', {
      column: 'A straight pale column, clean for most of its height.',
      leaning: 'A long slow lean, as if it has been listening to something for centuries.',
      forked: 'It forks low into two great stems that share one crown.',
      bottle: 'A swollen bottle trunk studded with conical thorns.',
    }),
    buttress: score('How big are its buttress roots?', ['A modest flare at the foot', 'Fins as tall as a person', 'Walls as tall as a house, you could shelter between them']),
    height: score('How tall does it stand?', ['Forty metres, big among its neighbours', 'Sixty metres', 'Eighty metres, absurd, a tower']),
    season: choice('What is the crown doing this season?', {
      leafy: 'In full deep-green leaf.',
      flush: 'Flushing new leaves in bronze-red and pink.',
      flowering: 'Covered in pale cream blossom that bats and bees visit.',
      fruiting: 'Pods split open, tufts of white kapok floss hanging and drifting down.',
      bare: 'Leafless in the dry spell, every branch drawn against the sky.',
    }),
    story: choice('What has happened to it, or who uses it?', {
      untouched: 'Nothing visible: it simply stands.',
      lightning: 'Struck by lightning: a black scar spirals down the trunk and one limb is a broken stub.',
      honey: 'A honey tree: dark combs of giant bees hang under the limbs and a ladder of pegs climbs the trunk.',
      shrine: 'A spirit tree: bright cloth is tied round the trunk and strings of flags run to the ground.',
      climbers: 'Being studied: a bright rope hangs from the crown with a tiny climber partway up.',
      fallen: 'It has dropped a limb: a huge branch lies on the ground below a pale wound.',
    }),
    skirt: score('How much lower forest stands around its feet?', ['None: it stands alone, bare to the ground', 'A few understorey crowns', 'A full skirt of canopy it towers out of']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();

    const H = mix(40, 80, a.height) * rnd(0.94, 1.06);
    const crownDepth = { umbrella: 0.2, tiered: 0.34, dome: 0.3, windswept: 0.22, staghead: 0.26 }[a.crown] * H;
    const top = a.crown === 'tiered' ? H * 0.93 : H - crownDepth * 0.85;
    const R = { umbrella: 0.36, tiered: 0.27, dome: 0.27, windswept: 0.33, staghead: 0.29 }[a.crown] * H * rnd(0.92, 1.08);
    const r0 = H * 0.036 * (a.trunk === 'bottle' ? 1.25 : 1);
    const lean = a.trunk === 'leaning' ? H * 0.2 : H * rnd(-0.02, 0.02);
    const leanDir = rnd(-0.5, 0.5);
    const bias = a.crown === 'windswept' ? 0.75 : 0.12;
    const biasAngle = rnd(-0.4, 0.4);

    const barkTone = new THREE.Color('#b9b3a4').lerp(new THREE.Color('#8f8b76'), mood.wear * 0.6).lerp(new THREE.Color('#c9b79c'), mood.warmth * 0.35);
    const bark = s.material(barkTone, { roughness: 0.9 });
    const darkBark = s.material(barkTone.clone().multiplyScalar(0.62), { roughness: 0.95 });
    const wood: THREE.BufferGeometry[] = [];

    // The spine of the trunk: where the crown hangs from.
    const spine = (t: number) => v(lean * t * t * Math.cos(leanDir), top * t, lean * t * t * Math.sin(leanDir));
    const stems: { pts: V[]; r: number }[] = [];
    if (a.trunk === 'forked') {
      const split = 0.3, ang = rnd(0, Math.PI);
      for (const side of [-1, 1]) {
        const off = side * H * 0.07;
        stems.push({
          pts: [spine(split), spine(0.5).add(v(Math.cos(ang) * off, 0, Math.sin(ang) * off)), spine(0.78).add(v(Math.cos(ang) * off * 1.3, 0, Math.sin(ang) * off * 1.3)), spine(1.04).add(v(Math.cos(ang) * off * 1.2, 0, Math.sin(ang) * off * 1.2))],
          r: r0 * 0.6,
        });
      }
      wood.push(limb([spine(-0.03), spine(0.12), spine(split)], r0 * 1.15, r0 * 0.95, 12));
      for (const stem of stems) wood.push(limb(stem.pts, stem.r, stem.r * 0.55, 10));
    } else if (a.trunk === 'bottle') {
      const profile = [1.0, 1.25, 1.5, 1.45, 1.1, 0.8, 0.66, 0.55];
      profile.slice(0, -1).forEach((k, i) => wood.push(limb([spine(i / 7 - 0.02), spine((i + 0.5) / 7), spine((i + 1) / 7 + 0.01)], r0 * k, r0 * profile[i + 1], 12)));
      stems.push({ pts: [spine(0.9), spine(1.04)], r: r0 * 0.55 });
    } else {
      wood.push(limb([spine(-0.03), spine(0.25), spine(0.5), spine(0.75), spine(1.04)], r0 * 1.1, r0 * 0.5, 12));
      stems.push({ pts: [spine(0.9), spine(1.04)], r: r0 * 0.5 });
    }
    const crownBase = spine(1);

    // Buttresses: thin curved fins round the foot.
    const finCount = 5 + Math.floor(random() * 3);
    const finHeight = mix(0.08, 0.28, a.buttress) * H;
    const finReach = mix(0.07, 0.2, a.buttress) * H;
    let footprint = r0 * 1.6;
    for (let i = 0; i < finCount; i++) {
      const reach = finReach * rnd(0.7, 1.25), tall = finHeight * rnd(0.75, 1.15);
      const shape = new THREE.Shape();
      shape.moveTo(0, -1.5);
      shape.lineTo(reach, -1.5);
      shape.lineTo(reach, 0.15);
      shape.bezierCurveTo(reach * 0.45, tall * 0.08, r0 * 1.2, tall * 0.35, r0 * 0.5, tall);
      shape.lineTo(0, tall);
      shape.closePath();
      const thick = r0 * 0.42;
      const fin = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 10 });
      fin.translate(0, 0, -thick / 2);
      fin.rotateY((i / finCount) * Math.PI * 2 + rnd(-0.25, 0.25));
      const plain = fin.toNonIndexed();
      plain.deleteAttribute('uv');
      plain.computeVertexNormals();
      const mesh = s.mesh(plain, bark);
      mesh.name = 'buttress';
      footprint = Math.max(footprint, reach);
    }

    if (a.trunk === 'bottle') {
      const thorns = [];
      for (let i = 0; i < 70; i++) {
        const t = rnd(0.05, 0.6), ang = rnd(0, Math.PI * 2), p = spine(t);
        const k = t < 0.3 ? mix(1.05, 1.5, t / 0.3) : mix(1.5, 0.85, (t - 0.3) / 0.3);
        thorns.push({ at: [p.x + Math.cos(ang) * r0 * k, p.y, p.z + Math.sin(ang) * r0 * k] as const, size: r0 * rnd(0.12, 0.22) });
      }
      s.scatter(new THREE.OctahedronGeometry(1, 0), darkBark, thorns);
    }

    // Leaf colours.
    const hue = mix(0.36, 0.25, mood.warmth);
    const leafBase = new THREE.Color().setHSL(hue, mix(0.45, 0.65, mood.cheer), mix(0.13, 0.22, mood.cheer));
    if (a.season === 'flush') leafBase.setHSL(mix(0.02, 0.06, random()), 0.5, 0.42);
    leafBase.lerp(new THREE.Color('#6d6a3c'), mood.wear * 0.4);
    const leafShade = () => leafBase.clone().offsetHSL(rnd(-0.025, 0.025), rnd(-0.06, 0.06), rnd(-0.05, 0.06));

    // Limbs and the clumps they carry.
    const blobs: Blob[] = [];
    const tips: V[] = [];
    const undersides: V[] = [];
    const leafless = a.season === 'bare';
    const thin = a.crown === 'staghead' ? 0.5 : 1;
    const cover = (leafless ? 0 : 1) * thin * mix(1, 0.7, mood.wear) * mix(0.8, 1.1, mood.density);
    const struck = a.story === 'lightning' ? Math.floor(random() * 5) : -1;
    const dropped = a.story === 'fallen' ? Math.floor(random() * 5) : -1;
    const addLimb = (origin: V, angle: number, reach: number, rise: number, r: number, flat: number, index: number) => {
      const dir = v(Math.cos(angle), 0, Math.sin(angle));
      const stretch = 1 + bias * Math.cos(angle - biasAngle) * (a.crown === 'windswept' ? 1.2 : 1);
      reach *= Math.max(0.25, stretch);
      const sag = a.crown === 'umbrella' ? 0.1 : 0;
      const pts = [
        origin.clone(),
        origin.clone().addScaledVector(dir, reach * 0.22).add(v(0, rise * 0.55, 0)),
        origin.clone().addScaledVector(dir, reach * 0.55).add(v(rnd(-1, 1) * reach * 0.06, rise * 0.9, rnd(-1, 1) * reach * 0.06)),
        origin.clone().addScaledVector(dir, reach * 0.95).add(v(0, rise * (1 - sag), 0)),
      ];
      const broken = index === struck || index === dropped;
      if (broken) {
        wood.push(limb(pts.slice(0, 2), r, r * 0.8, 7));
        undersides.push(pts[1]);
        return;
      }
      wood.push(limb(pts, r, r * 0.22, 7));
      tips.push(pts[3]);
      undersides.push(pts[2].clone());
      // Secondary twigs.
      for (let k = 0; k < 3; k++) {
        const from = pts[2].clone().lerp(pts[3], k * 0.3);
        const side = angle + rnd(0.5, 1.2) * (k % 2 ? 1 : -1);
        const to = from.clone().add(v(Math.cos(side) * reach * 0.3, rnd(0.02, 0.12) * reach + (a.crown === 'staghead' ? reach * 0.2 : 0), Math.sin(side) * reach * 0.3));
        wood.push(limb([from, from.clone().lerp(to, 0.5).add(v(0, reach * 0.04, 0)), to], r * 0.35, r * 0.08, 5));
        tips.push(to);
      }
      const count = cover > 0 ? Math.round(9 * cover + random()) : 0;
      for (let k = 0; k < count; k++) {
        const t = rnd(0.35, 1.08);
        const base = pts[1].clone().lerp(pts[3], t).add(v(rnd(-1, 1) * reach * 0.26, rnd(0.02, 0.1) * reach, rnd(-1, 1) * reach * 0.26));
        const size = reach * rnd(0.16, 0.27);
        blobs.push({ at: base, size: v(size, size * flat * rnd(0.8, 1.2), size), color: leafShade(), turn: rnd(0, 6.28) });
      }
    };

    let limbIndex = 0;
    if (a.crown === 'tiered') {
      const tiers = 3 + (H > 60 ? 1 : 0);
      for (let t = 0; t < tiers; t++) {
        const f = t / (tiers - 1);
        const origin = spine(mix(0.6, 1.0, f)).clone();
        const n = 5 + Math.floor(random() * 2);
        for (let i = 0; i < n; i++) addLimb(origin, (i / n) * Math.PI * 2 + t * 0.6 + rnd(-0.2, 0.2), R * mix(1, 0.45, f) * rnd(0.85, 1.1), crownDepth * 0.08, r0 * mix(0.3, 0.16, f), 0.3, limbIndex++);
      }
      // Tiered crowns continue the leader between whorls.
      wood.push(limb([spine(0.7), spine(0.9), spine(1.03)], r0 * 0.6, r0 * 0.12, 8));
    } else {
      const origins = a.trunk === 'forked' ? stems.map((stem) => stem.pts[stem.pts.length - 1]) : [crownBase];
      const n = (a.crown === 'dome' ? 8 : 7) + Math.floor(random() * 2);
      for (let i = 0; i < n; i++) {
        const origin = origins[i % origins.length];
        const steep = a.crown === 'dome' ? rnd(0.5, 1.15) : a.crown === 'staghead' ? rnd(0.6, 1.1) : rnd(0.75, 1);
        const reach = R * (a.crown === 'dome' ? mix(1.05, 0.5, (steep - 0.5) / 0.65) : rnd(0.8, 1.1));
        addLimb(origin, (i / n) * Math.PI * 2 + rnd(-0.25, 0.25), reach, crownDepth * steep, r0 * rnd(0.26, 0.36), a.crown === 'dome' ? 0.7 : a.crown === 'staghead' ? 0.5 : 0.42, limbIndex++);
      }
      // A centre cap closes the umbrella.
      for (let k = 0; k < Math.round(7 * cover); k++) {
        const size = R * rnd(0.18, 0.27);
        blobs.push({ at: crownBase.clone().add(v(rnd(-1, 1) * R * 0.3, crownDepth * (a.crown === 'dome' ? 1.1 : 0.95) + rnd(-0.1, 0.1) * crownDepth, rnd(-1, 1) * R * 0.25)), size: v(size, size * (a.crown === 'dome' ? 0.75 : 0.42), size), color: leafShade(), turn: rnd(0, 6.28) });
      }
      if (a.crown === 'staghead')
        for (let k = 0; k < 5; k++) {
          const ang = rnd(0, 6.28), out = R * rnd(0.2, 0.7);
          const from = crownBase.clone().add(v(Math.cos(ang) * out * 0.5, crownDepth * 0.6, Math.sin(ang) * out * 0.5));
          const to = crownBase.clone().add(v(Math.cos(ang) * out, crownDepth * rnd(1.3, 1.7), Math.sin(ang) * out));
          wood.push(limb([from, from.clone().lerp(to, 0.5).add(v(rnd(-1, 1), 0, rnd(-1, 1)).multiplyScalar(R * 0.06)), to], r0 * 0.16, r0 * 0.03, 5));
          const fork = to.clone().lerp(from, 0.35);
          wood.push(limb([fork, fork.clone().add(v(rnd(-1, 1) * R * 0.12, R * 0.14, rnd(-1, 1) * R * 0.12))], r0 * 0.08, r0 * 0.02, 5));
        }
    }

    const merged = mergeGeometries(wood);
    for (const g of wood) g.dispose();
    s.mesh(merged, bark);

    const leafMaterial = new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true });
    const clumpGeometry = clump();
    const foliage = new THREE.Group();
    s.root.add(foliage);
    if (blobs.length) foliage.add(instances(clumpGeometry, leafMaterial, blobs));

    // Seasonal dressing sits on the clumps or, when bare, on the twig tips.
    const small = new THREE.IcosahedronGeometry(1, 0);
    const dots: Blob[] = [];
    const anchor = () => {
      if (blobs.length && !leafless) {
        const b = blobs[Math.floor(random() * blobs.length)];
        const ang = rnd(0, 6.28), up = rnd(0.2, 1);
        const ring = Math.sqrt(1 - up * up);
        return b.at.clone().add(v(Math.cos(ang) * ring * b.size.x, up * b.size.y, Math.sin(ang) * ring * b.size.z));
      }
      return tips[Math.floor(random() * tips.length)].clone().add(v(rnd(-1, 1), rnd(-0.5, 1), rnd(-1, 1)).multiplyScalar(R * 0.05));
    };
    if (tips.length) {
      if (a.season === 'flowering')
        for (let i = 0; i < 140; i++) {
          const size = H * rnd(0.008, 0.014);
          dots.push({ at: anchor(), size: v(size, size * 0.7, size), color: new THREE.Color().setHSL(rnd(0.08, 0.13), 0.7, rnd(0.84, 0.93)) });
        }
      if (a.season === 'fruiting' || a.season === 'bare') {
        for (let i = 0; i < (a.season === 'bare' ? 50 : 70); i++) {
          const size = H * rnd(0.005, 0.008);
          const at = anchor();
          at.y -= H * 0.012;
          dots.push({ at, size: v(size, size * 2.6, size), color: new THREE.Color('#5c4630').offsetHSL(0, 0, rnd(-0.05, 0.08)) });
        }
      }
      if (a.season === 'fruiting') {
        for (let i = 0; i < 90; i++) {
          const size = H * rnd(0.008, 0.015);
          const at = anchor();
          // Some floss has let go and is on its way down.
          if (i % 4 === 0) { at.y = rnd(0.25, 0.85) * top; at.x += rnd(-1, 1) * R * 0.5; at.z += rnd(-1, 1) * R * 0.5; }
          dots.push({ at, size: v(size, size, size), color: new THREE.Color('#f6f3ea') });
        }
      }
    }
    const drift = dots.length ? instances(small, new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true, emissive: '#fff4dc', emissiveIntensity: a.season === 'flowering' || a.season === 'fruiting' ? 0.18 : 0 }), dots) : null;
    if (drift) foliage.add(drift);

    // Epiphytes and lianas thicken with density.
    const fernCount = Math.round(mix(0, 9, mood.density));
    const ferns: Blob[] = [];
    for (let i = 0; i < fernCount && undersides.length; i++) {
      const p = undersides[Math.floor(random() * undersides.length)];
      const size = H * rnd(0.018, 0.03);
      ferns.push({ at: p.clone().add(v(0, size * 0.5, 0)), size: v(size, size * 0.6, size), color: new THREE.Color().setHSL(hue - 0.05, 0.6, 0.45), turn: rnd(0, 6) });
    }
    if (ferns.length) s.root.add(instances(new THREE.ConeGeometry(1, 1.4, 7, 1, true).rotateX(Math.PI), new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide, flatShading: true }), ferns));
    const lianaCount = Math.round(mix(0, 6, mood.density) * (a.skirt > 0.2 || mood.density > 0.6 ? 1 : 0.5));
    const lianas: THREE.BufferGeometry[] = [];
    for (let i = 0; i < lianaCount && undersides.length; i++) {
      const p = undersides[Math.floor(random() * undersides.length)];
      const drop = rnd(0.25, 0.6) * top;
      lianas.push(limb([p.clone(), p.clone().add(v(rnd(-1, 1) * H * 0.02, -drop * 0.5, rnd(-1, 1) * H * 0.02)), p.clone().add(v(rnd(-1, 1) * H * 0.03, -drop, rnd(-1, 1) * H * 0.03))], H * 0.0035, H * 0.002, 5));
    }
    if (lianas.length) { s.mesh(mergeGeometries(lianas), darkBark); for (const g of lianas) g.dispose(); }

    // What has happened here.
    if (a.story === 'lightning') {
      const scar: V[] = [];
      for (let i = 0; i <= 8; i++) {
        const t = mix(0.04, 0.98, i / 8), p = spine(t), ang = t * 3.2 + 1;
        const r = mix(r0 * 1.1, r0 * 0.5, t) * 1.02;
        scar.push(p.add(v(Math.cos(ang) * r, 0, Math.sin(ang) * r)));
      }
      s.mesh(limb(scar, r0 * 0.34, r0 * 0.14, 6), s.material('#1d1a18', { roughness: 1 }));
    }
    if (a.story === 'fallen') {
      const ang = rnd(0, 6.28), d = v(Math.cos(ang), 0, Math.sin(ang)), side = v(-d.z, 0, d.x);
      const start = v(0, 0, 0).addScaledVector(side, finReach + r0 * 2).addScaledVector(d, -R * 0.5);
      const pts = [start.clone().add(v(0, r0 * 0.5, 0)), start.clone().addScaledVector(d, R * 0.4).add(v(0, r0 * 0.9, 0)), start.clone().addScaledVector(d, R * 0.8).add(v(0, r0 * 0.5, 0)), start.clone().addScaledVector(d, R * 1.05).add(v(0, r0 * 0.25, 0))];
      const parts = [limb(pts, r0 * 0.36, r0 * 0.1, 8)];
      for (let k = 0; k < 4; k++) {
        const from = pts[1].clone().lerp(pts[3], k / 4);
        parts.push(limb([from, from.clone().addScaledVector(side, (k % 2 ? 1 : -1) * R * rnd(0.12, 0.25)).add(v(0, R * rnd(0.06, 0.2), 0)).addScaledVector(d, R * 0.1)], r0 * 0.14, r0 * 0.03, 5));
      }
      s.mesh(mergeGeometries(parts), bark);
      for (const g of parts) g.dispose();
      const wilt: Blob[] = [];
      for (let k = 0; k < 4; k++) {
        const size = R * rnd(0.1, 0.16);
        wilt.push({ at: pts[2].clone().lerp(pts[3], rnd(0, 1)).add(v(rnd(-1, 1) * R * 0.1, size * 0.4, rnd(-1, 1) * R * 0.1)), size: v(size, size * 0.5, size), color: new THREE.Color('#8a6f3a').offsetHSL(0, 0, rnd(-0.05, 0.05)), turn: rnd(0, 6) });
      }
      foliage.add(instances(clumpGeometry, leafMaterial, wilt));
      // The pale wound where it tore away.
      const wound = undersides[Math.min(dropped, undersides.length - 1)] ?? crownBase;
      s.ball([r0 * 0.45, r0 * 0.45, r0 * 0.45], [wound.x, wound.y, wound.z], s.material('#ead9b0', { roughness: 0.7 }), 10);
      footprint = Math.max(footprint, R * 0.7);
    }
    if (a.story === 'honey') {
      const comb = s.material('#3a2a17', { roughness: 0.7 });
      const wax = s.material('#d79a2b', { roughness: 0.5, emissive: '#b86a10', emissiveIntensity: 0.25 });
      undersides.forEach((p, i) => {
        if (i % 2 && undersides.length > 3) return;
        const w = H * rnd(0.022, 0.034);
        const half = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        const m = s.mesh(half, comb, [p.x, p.y - r0 * 0.25, p.z]);
        m.scale.set(w, w * 1.3, w * 0.28);
        m.rotation.y = rnd(0, 3.14);
        const cap = s.mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 4), wax, [p.x, p.y - r0 * 0.2, p.z]);
        cap.scale.set(w * 1.04, w * 0.6, w * 0.3);
        cap.rotation.y = m.rotation.y;
      });
      const pegs = [];
      for (let i = 0; i < 46; i++) {
        const t = mix(0.03, 0.97, i / 45), p = spine(t), r = mix(r0 * 1.1, r0 * 0.5, t) * (a.trunk === 'bottle' ? 1.4 : 1);
        pegs.push(p.add(v(0, 0, r)));
      }
      const pegGeo: THREE.BufferGeometry[] = [];
      for (const p of pegs) pegGeo.push(new THREE.BoxGeometry(H * 0.012, H * 0.0035, H * 0.016).translate(p.x, p.y, p.z + H * 0.006));
      pegGeo.push(limb(pegs.map((p) => p.clone().add(v(H * 0.006, 0, H * 0.014))), H * 0.0022, H * 0.0022, 5));
      s.mesh(mergeGeometries(pegGeo.map((g) => { const n = g.toNonIndexed(); n.deleteAttribute('uv'); n.computeVertexNormals(); return n; })), s.material('#d8c08a'));
    }
    if (a.story === 'shrine') {
      const cloths = ['#e3b21c', '#c9302c', '#f1ece0', '#e3b21c'];
      const wrapAt = finHeight * 0.9 + H * 0.03;
      cloths.slice(0, 3).forEach((c, i) => {
        const y = wrapAt + i * H * 0.022, p = spine(y / top);
        const r = mix(r0 * 1.1, r0 * 0.5, y / top) * (a.trunk === 'bottle' ? 1.35 : 1.08);
        s.cylinder(r, r * 1.02, H * 0.02, [p.x, y, p.z], s.material(c, { roughness: 0.8, emissive: c, emissiveIntensity: 0.12 }), 16);
      });
      const flagGeo = new THREE.PlaneGeometry(1, 1);
      const flags: Blob[] = [];
      const lines: THREE.BufferGeometry[] = [];
      for (let k = 0; k < 4; k++) {
        const ang = (k / 4) * 6.28 + rnd(-0.3, 0.3), out = Math.max(finReach * 1.3, H * 0.12);
        const from = v(0, wrapAt + H * 0.05, 0), to = v(Math.cos(ang) * out, 0.3, Math.sin(ang) * out);
        const mid = from.clone().lerp(to, 0.5).add(v(0, -H * 0.02, 0));
        lines.push(limb([from, mid, to], H * 0.0012, H * 0.0012, 4));
        const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
        for (let i = 1; i < 12; i++) {
          const p = curve.getPoint(i / 12), size = H * 0.014;
          flags.push({ at: p.add(v(0, -size * 0.5, 0)), size: v(size, size, size), color: new THREE.Color(['#e3b21c', '#c9302c', '#f1ece0', '#2c7fb8', '#3c9a4a'][i % 5]), turn: -ang });
        }
        footprint = Math.max(footprint, out);
      }
      s.mesh(mergeGeometries(lines), darkBark);
      s.root.add(instances(flagGeo, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), flags));
    }
    if (a.story === 'climbers') {
      const anchorPoint = (tips[Math.floor(random() * Math.min(4, tips.length))] ?? crownBase).clone().lerp(crownBase, 0.45);
      anchorPoint.y = crownBase.y + crownDepth * 0.5;
      const rope = s.material('#f0562d', { emissive: '#f0562d', emissiveIntensity: 0.35, roughness: 0.6 });
      s.rod([anchorPoint.x, anchorPoint.y, anchorPoint.z], [anchorPoint.x, 0, anchorPoint.z], H * 0.003, rope);
      const y = top * rnd(0.4, 0.7), k = H * 0.012;
      const suit = s.material('#2f6fb5'), skin = s.material('#f1dc54');
      s.box([k * 0.5, k * 0.75, k * 0.35], [anchorPoint.x + k * 0.3, y, anchorPoint.z], suit);
      s.ball([k * 0.24, k * 0.24, k * 0.24], [anchorPoint.x + k * 0.3, y + k * 0.6, anchorPoint.z], skin, 10);
      s.rod([anchorPoint.x + k * 0.3, y - k * 0.3, anchorPoint.z], [anchorPoint.x + k * 0.7, y - k * 0.9, anchorPoint.z + k * 0.2], k * 0.1, suit);
      s.rod([anchorPoint.x + k * 0.3, y - k * 0.3, anchorPoint.z], [anchorPoint.x + k * 0.1, y - k, anchorPoint.z - k * 0.2], k * 0.1, suit);
      s.rod([anchorPoint.x + k * 0.3, y + k * 0.3, anchorPoint.z], [anchorPoint.x, y + k * 0.9, anchorPoint.z], k * 0.08, suit);
      s.box([k * 0.5, k * 0.6, k * 0.3], [anchorPoint.x + k * 0.65, y + k * 0.05, anchorPoint.z], s.material('#e9a23b'));
    }

    // The lower forest it towers out of.
    const skirtCount = Math.round(a.skirt * mix(10, 18, mood.density));
    if (skirtCount > 0) {
      const under: Blob[] = [];
      const stemsGeo: THREE.BufferGeometry[] = [];
      for (let i = 0; i < skirtCount; i++) {
        const ang = (i / skirtCount) * 6.28 + rnd(-0.2, 0.2), out = H * rnd(0.2, 0.36);
        const h = H * rnd(0.16, 0.3), size = H * rnd(0.06, 0.095);
        const x = Math.cos(ang) * out, z = Math.sin(ang) * out;
        stemsGeo.push(limb([v(x, 0, z), v(x + rnd(-1, 1), h * 0.6, z + rnd(-1, 1)), v(x, h, z)], H * 0.007, H * 0.004, 5));
        under.push({ at: v(x, h, z), size: v(size, size * rnd(0.55, 0.8), size), color: leafBase.clone().offsetHSL(rnd(-0.03, 0.03), -0.05, rnd(-0.1, -0.03)), turn: rnd(0, 6) });
        footprint = Math.max(footprint, out * 0.7);
      }
      s.mesh(mergeGeometries(stemsGeo), darkBark);
      for (const g of stemsGeo) g.dispose();
      s.root.add(instances(clumpGeometry, leafMaterial, under));
    }

    const sway = mix(0.1, 1, mood.energy) * H * 0.004;
    const thing = s.finish({
      footprint,
      update: (_dt, time) => {
        foliage.position.x = Math.sin(time * 0.7) * sway;
        foliage.position.z = Math.cos(time * 0.53) * sway * 0.6;
      },
    });
    return thing;
  },
});
