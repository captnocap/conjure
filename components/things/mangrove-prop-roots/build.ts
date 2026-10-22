import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { choice, defineThing, disposeTree, mix, score, visibleBounds } from '@conjure/kit';

type P3 = readonly [number, number, number];

/** A round tube that narrows along a curve. */
function taper(points: readonly THREE.Vector3[], from: number, to: number, segments = 16, sides = 6) {
  const curve = new THREE.CatmullRomCurve3(points as THREE.Vector3[]);
  const position: number[] = [], index: number[] = [];
  const n = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const p = curve.getPoint(u), t = curve.getTangent(u).normalize();
    n.addScaledVector(t, -n.dot(t));
    if (n.lengthSq() < 1e-6) n.set(0, 0, 1).addScaledVector(t, -t.z);
    n.normalize();
    const b = new THREE.Vector3().crossVectors(t, n);
    const r = mix(from, to, u);
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      const v = p.clone().addScaledVector(n, Math.cos(angle) * r).addScaledVector(b, Math.sin(angle) * r);
      position.push(v.x, v.y, v.z);
    }
  }
  const ring = sides + 1;
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * ring + j;
      index.push(a, a + 1, a + ring, a + 1, a + ring + 1, a + ring);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return { geometry, curve };
}

export default defineThing({
  questions: {
    spread: score('How far do the stilt roots spread?', ['A tight upright cage', 'A generous skirt', 'Sprawling arches wading far out']),
    tide: score('Where is the tide on the roots?', ['Out: roots standing bare on wet mud', 'Half tide, lapping the lower arches', 'High: only the tops of the arches show']),
    crown: score('How full is the crown?', ['Storm-stripped, a few tufts on bare limbs', 'Open and airy', 'A dense glossy dome']),
    crust: choice('What is growing or caught on the roots?', {
      clean: 'Nothing: smooth red-brown bark.',
      oysters: 'Clusters of grey-white oysters crowding the tide line.',
      weed: 'A dark band of algae and barnacles marking high water.',
      rubbish: 'Flotsam: a plastic bag, a bottle and a loop of rope snagged in the cage.',
    }),
    form: choice('How does the tree stand?', {
      upright: 'Upright and balanced over its roots.',
      leaning: 'Leaning far out over the channel, reaching for light.',
      twin: 'Two trunks rising from one shared tangle of roots.',
      stunted: 'A low wind-pruned dwarf, more root than tree.',
    }),
    season: choice('What hangs in the crown?', {
      seedlings: 'Dozens of long green pencil seedlings ready to drop and plant themselves.',
      flowers: 'Small pale yellow flowers among the leaves.',
      yellowing: 'Bright yellow sacrificial leaves, some already floating below.',
      plain: 'Only leaves.',
    }),
    tenant: choice('Who is using it?', {
      nobody: 'Nobody visible.',
      kingfisher: 'A small blue and orange kingfisher perched on a root arch.',
      crabs: 'Little red tree crabs clinging to the roots.',
      marker: 'A fisherman: a red rag tied on as a channel marker, a hand line left dangling.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const tree = new THREE.Group();
    const top = new THREE.Group();
    root.add(tree);
    tree.add(top);
    const put = <T extends THREE.Object3D>(parent: THREE.Object3D, node: T, at: P3 = [0, 0, 0]) => {
      node.position.set(...at);
      node.traverse((child) => { child.castShadow = child.receiveShadow = true; });
      parent.add(node);
      return node;
    };
    const stunted = a.form === 'stunted';
    const S = mix(1.1, 3.1, a.spread) * (stunted ? 0.8 : 1);
    const J = stunted ? 1.3 : 2.1;
    const tall = stunted ? 3.0 : mix(5.6, 6.6, random());
    const barkColour = new THREE.Color('#6d4a3a').lerp(new THREE.Color('#8a5a3c'), mood.warmth * 0.4).lerp(new THREE.Color('#8e8a82'), mood.wear * 0.4);
    const bark = new THREE.MeshStandardMaterial({ color: barkColour, roughness: 0.8, flatShading: true });
    const wood: THREE.BufferGeometry[] = [], crownWood: THREE.BufferGeometry[] = [];
    const rootCurves: THREE.CatmullRomCurve3[] = [];

    // Trunks.
    const trunks = a.form === 'twin' ? [[-0.45, 0.2], [0.6, -0.15]] : a.form === 'leaning' ? [[2.3, 0.3]] : [[(random() - 0.5) * 0.5, (random() - 0.5) * 0.5]];
    const tips: THREE.Vector3[] = [];
    trunks.forEach(([dx, dz], index) => {
      const height = tall * (index ? 0.86 : 1);
      const base = new THREE.Vector3(index ? 0.25 : 0, 0.5, index ? -0.1 : 0);
      const stem = [base, new THREE.Vector3(dx * 0.1 + (random() - 0.5) * 0.2, J, dz * 0.1), new THREE.Vector3(dx * 0.45 + (random() - 0.5) * 0.3, J + (height - J) * 0.4, dz * 0.45 + (random() - 0.5) * 0.3), new THREE.Vector3(dx * 0.8, J + (height - J) * 0.7, dz * 0.8)];
      const lower = taper(stem.slice(0, 2), 0.09, 0.2, 6, 7);
      wood.push(lower.geometry);
      const upper = taper(stem.slice(1), 0.2, 0.1, 12, 7);
      crownWood.push(upper.geometry);
      // Limbs fan out from the upper trunk to carry the crown.
      const limbs = Math.round(mix(3, 6, a.crown)) - (index ? 1 : 0);
      for (let i = 0; i < limbs; i++) {
        const u = mix(0.45, 1, (i + 0.5) / limbs), from = upper.curve.getPoint(u);
        const angle = (i / limbs) * Math.PI * 2 + random() * 0.9 + index * 1.3;
        const reach = (stunted ? 0.9 : mix(1.2, 2.3, random())) * (i === limbs - 1 ? 0.35 : 1);
        const tip = new THREE.Vector3(from.x + Math.sin(angle) * reach, from.y + (stunted ? 0.5 : mix(0.8, 1.7, random())), from.z + Math.cos(angle) * reach);
        const elbow = from.clone().lerp(tip, 0.5).add(new THREE.Vector3(0, -0.15, 0));
        crownWood.push(taper([from, elbow, tip], 0.085, 0.035, 8, 5).geometry);
        tips.push(tip);
        if (random() < 0.5) {
          const twig = tip.clone().add(new THREE.Vector3((random() - 0.5) * 1.4, 0.3 + random() * 0.4, (random() - 0.5) * 1.4));
          crownWood.push(taper([elbow, elbow.clone().lerp(twig, 0.5).add(new THREE.Vector3(0, 0.1, 0)), twig], 0.04, 0.02, 6, 5).geometry);
          tips.push(twig);
        }
      }
    });

    // Prop roots: arches leaving the trunk at different heights and wading outward.
    const count = Math.round(mix(11, 18, mood.density) * (a.form === 'twin' ? 1.25 : 1));
    const lean = a.form === 'leaning' ? 0.5 : 0;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.5;
      const k = (i * 0.618) % 1;
      const h = mix(0.75, J + 0.25, k);
      const dir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
      // A leaning tree throws more root out on the far side to brace itself.
      const reach = S * mix(0.45, 1, k ** 0.7) * mix(0.8, 1.15, random()) * (1 - lean * dir.x * 0.6);
      const hub = new THREE.Vector3(a.form === 'twin' && i % 2 ? 0.2 : 0, h, 0);
      const points = [hub, hub.clone().addScaledVector(dir, reach * 0.32).setY(h + 0.2 * reach), hub.clone().addScaledVector(dir, reach * 0.72).setY(h * 0.7), hub.clone().addScaledVector(dir, reach * 0.96).setY(h * 0.2), hub.clone().addScaledVector(dir, reach).setY(-0.5)];
      const arch = taper(points, mix(0.12, 0.085, random()), 0.05, 18, 6);
      wood.push(arch.geometry);
      rootCurves.push(arch.curve);
      if (random() < 0.55) {
        // A secondary strut drops from the arch on its own bearing.
        const from = arch.curve.getPoint(mix(0.3, 0.5, random()));
        const side = new THREE.Vector3(dir.z, 0, -dir.x).multiplyScalar(random() < 0.5 ? -1 : 1);
        const foot = from.clone().addScaledVector(dir, reach * 0.3).addScaledVector(side, reach * mix(0.2, 0.45, random())).setY(-0.5);
        const strut = taper([from, from.clone().lerp(foot, 0.4).add(new THREE.Vector3(0, from.y * 0.25, 0)), foot.clone().setY(from.y * 0.15), foot], 0.06, 0.035, 12, 5);
        wood.push(strut.geometry);
        rootCurves.push(strut.curve);
      }
    }
    put(tree, new THREE.Mesh(mergeGeometries(wood), bark));
    put(top, new THREE.Mesh(mergeGeometries(crownWood), bark));
    for (const geometry of [...wood, ...crownWood]) geometry.dispose();

    // Crown: dark lumps for depth, then a skin of glossy leaves.
    const lush = a.crown;
    const lumpPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color('#234d2c').lerp(new THREE.Color('#4a4f30'), mood.wear * 0.4), roughness: 0.7, flatShading: true });
    const leafMatrices: THREE.Matrix4[] = [], leafColours: THREE.Color[] = [];
    const hangers: THREE.Vector3[] = [];
    const greens = ['#1f5f30', '#2f7a3c', '#256432', '#3a8a42'];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    const drift: THREE.Vector3[] = [];
    tips.forEach((tip, index) => {
      if (lush < 0.25 && index % 2) return;
      const r = mix(0.55, 1.5, lush) * mix(0.8, 1.15, random()) * (stunted ? 0.75 : 1);
      const lump = put(top, new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.86, 1), lumpPaint), [tip.x, tip.y + r * 0.2, tip.z]);
      lump.scale.y = 0.55;
      lump.rotation.y = random() * 3;
      const leaves = Math.round(r * r * mix(85, 125, mood.density) * mix(1, 0.6, mood.wear));
      for (let i = 0; i < leaves; i++) {
        const theta = random() * Math.PI * 2, phi = Math.acos(mix(-0.35, 1, random()));
        const normal = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
        const at = new THREE.Vector3(tip.x + normal.x * r, tip.y + r * 0.2 + normal.y * r * 0.57, tip.z + normal.z * r);
        q.setFromUnitVectors(up, normal.clone().add(new THREE.Vector3((random() - 0.5) * 0.9, 0.5, (random() - 0.5) * 0.9)).normalize());
        q.multiply(new THREE.Quaternion().setFromAxisAngle(up, random() * 6));
        const size = mix(0.8, 1.3, random());
        leafMatrices.push(m.compose(at, q, new THREE.Vector3(0.075 * size, 0.012, 0.165 * size)).clone());
        const yellow = a.season === 'yellowing' ? random() < 0.16 : random() < 0.02 + mood.wear * 0.05;
        leafColours.push(yellow ? new THREE.Color('#e8c62a') : new THREE.Color(greens[Math.floor(random() * greens.length)]).lerp(new THREE.Color('#7a7a48'), mood.wear * 0.3));
        if (normal.y < 0.05 && random() < 0.5) hangers.push(at.clone());
      }
      drift.push(new THREE.Vector3(tip.x, 0, tip.z));
    });
    if (leafMatrices.length) {
      const leaves = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 3), new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.05 }), leafMatrices.length);
      leafMatrices.forEach((matrix, i) => { leaves.setMatrixAt(i, matrix); leaves.setColorAt(i, leafColours[i]); });
      put(top, leaves);
    }
    if (a.season === 'seedlings' && hangers.length) {
      const pods = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.03, 1, 5).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ color: '#6f9a3c', roughness: 0.4 }), hangers.length);
      hangers.forEach((at, i) => pods.setMatrixAt(i, m.compose(at, q.setFromEuler(new THREE.Euler((random() - 0.5) * 0.2, 0, (random() - 0.5) * 0.2)), new THREE.Vector3(1, mix(0.3, 0.6, random()), 1))));
      put(top, pods);
      const caps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 5, 4), new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.6 }), hangers.length);
      hangers.forEach((at, i) => caps.setMatrixAt(i, m.makeTranslation(at.x, at.y, at.z)));
      put(top, caps);
    } else if (a.season === 'flowers' && leafMatrices.length) {
      const n = Math.min(90, Math.floor(leafMatrices.length / 5));
      const blooms = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.06, 0), new THREE.MeshStandardMaterial({ color: '#f6eaa0', emissive: '#f0d860', emissiveIntensity: mix(0.2, 0.6, mood.cheer), roughness: 0.5 }), n);
      const v = new THREE.Vector3();
      for (let i = 0; i < n; i++) { v.setFromMatrixPosition(leafMatrices[Math.floor(random() * leafMatrices.length)]); blooms.setMatrixAt(i, m.makeTranslation(v.x, v.y + 0.04, v.z)); }
      put(top, blooms);
    }
    // Aerial roots let down from the limbs, not yet touching.
    for (let i = 0; i < Math.round(mix(2, 6, mood.density)); i++) {
      const tip = tips[Math.floor(random() * tips.length)];
      if (!tip) break;
      const x = tip.x * mix(0.5, 0.9, random()), z = tip.z * mix(0.5, 0.9, random());
      const length = mix(1.0, 2.6, random());
      put(top, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.012, length, 5), bark), [x, tip.y - 0.3 - length / 2, z]).rotation.z = (random() - 0.5) * 0.08;
    }

    // Tide: the tree is lowered into the water sheet as the tide rises.
    const sink = stunted ? a.tide * 0.9 : a.tide * 1.55;
    tree.position.y = -sink;
    const tea = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6a5334').lerp(new THREE.Color('#7f8f86'), 0.3), roughness: 0.06, metalness: 0.35 });
    const R = S + 0.55;
    put(root, new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.012, 48), tea), [0, -0.004, 0]);
    const low = a.tide < 0.28;
    const mudPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6c5a48').lerp(new THREE.Color('#80603f'), mood.warmth * 0.5), roughness: 0.35, metalness: 0.1 });
    if (low) {
      put(root, new THREE.Mesh(new THREE.LatheGeometry([[R * 0.93, 0], [R * 0.86, 0.035], [R * 0.6, 0.07], [0, 0.09]].map(([x, y]) => new THREE.Vector2(x, y)), 44), mudPaint));
      // Pencil seedlings that have already planted themselves, and crab holes.
      const sprouts = Math.round(mix(3, 12, mood.density));
      for (let i = 0; i < sprouts; i++) {
        const angle = random() * 6.28, d = R * mix(0.25, 0.75, random());
        const x = Math.sin(angle) * d, z = Math.cos(angle) * d;
        put(root, new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, 0.38, 5), new THREE.MeshStandardMaterial({ color: '#6f8a3c', roughness: 0.5 })), [x, 0.26, z]);
        for (const e of [-1, 1]) { const leaf = put(root, new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: '#3f9448', roughness: 0.3 })), [x + e * 0.07, 0.47, z]); leaf.scale.set(0.09, 0.012, 0.04); leaf.rotation.z = e * 0.5; }
      }
    }
    const ripple = new THREE.MeshStandardMaterial({ color: '#9a9878', roughness: 0.2 });
    // Where each root meets the surface.
    const waterline = (curve: THREE.CatmullRomCurve3) => {
      for (let u = 1; u > 0; u -= 0.02) { const p = curve.getPoint(u); if (p.y - sink > 0) return p; }
      return null;
    };
    const crustAt: THREE.Vector3[] = [];
    for (const curve of rootCurves) {
      const p = waterline(curve);
      if (p && !low) put(root, new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.01, 4, 16), ripple), [p.x, 0.006, p.z]).rotation.x = Math.PI / 2;
      // The band between low water and the high-tide mark, in tree space.
      for (let u = 0.99; u > 0.3; u -= 0.03) { const s = curve.getPoint(u); if (s.y > 0.05 && s.y < 1.5) crustAt.push(s); }
    }
    if (a.crust === 'oysters') {
      const shells = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#cfcabb', roughness: 0.9, flatShading: true }), crustAt.length * 2);
      crustAt.forEach((s, i) => {
        for (let k = 0; k < 2; k++) {
          const dense = s.y < 0.9 ? 1 : 0.5;
          shells.setMatrixAt(i * 2 + k, m.compose(new THREE.Vector3(s.x + (random() - 0.5) * 0.12, s.y + (random() - 0.5) * 0.1, s.z + (random() - 0.5) * 0.12), q.setFromEuler(new THREE.Euler(random() * 3, random() * 3, 0)), new THREE.Vector3(1, 0.5, 0.8).multiplyScalar(mix(0.05, 0.1, random()) * dense)));
          shells.setColorAt(i * 2 + k, new THREE.Color().setHSL(0.1, 0.1, mix(0.55, 0.85, random())));
        }
      });
      put(tree, shells);
    } else if (a.crust === 'weed') {
      const band = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ color: '#2f3a28', roughness: 0.6 }), crustAt.length);
      crustAt.forEach((s, i) => band.setMatrixAt(i, m.compose(s, q.identity(), new THREE.Vector3(0.075, 0.1, 0.075))));
      put(tree, band);
      const specks = new THREE.InstancedMesh(new THREE.ConeGeometry(0.02, 0.02, 5), new THREE.MeshStandardMaterial({ color: '#d8d4c6', roughness: 0.9 }), crustAt.length);
      crustAt.forEach((s, i) => specks.setMatrixAt(i, m.makeTranslation(s.x + (random() - 0.5) * 0.12, s.y + 0.06, s.z + (random() - 0.5) * 0.12)));
      put(tree, specks);
    } else if (a.crust === 'rubbish' && rootCurves.length > 2) {
      const pick = () => waterline(rootCurves[Math.floor(random() * rootCurves.length)]) ?? new THREE.Vector3(S * 0.5, sink, 0);
      const bagAt = pick();
      const bag = put(root, new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshStandardMaterial({ color: '#bfe0f0', roughness: 0.3, flatShading: true })), [bagAt.x * 0.9, 0.2, bagAt.z * 0.9]);
      bag.scale.set(1, 1.3, 0.5);
      const bottleAt = pick();
      put(root, new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.2, 3, 8), new THREE.MeshStandardMaterial({ color: '#58c6a0', roughness: 0.2 })), [bottleAt.x * 0.8, 0.04, bottleAt.z * 0.8]).rotation.set(Math.PI / 2, 0, random() * 3);
      const ropeAt = pick();
      put(root, new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 5, 16), new THREE.MeshStandardMaterial({ color: '#f08a2a', roughness: 0.8 })), [ropeAt.x * 0.85, 0.28, ropeAt.z * 0.85]).rotation.set(1.1, random() * 3, 0);
      const flopAt = pick();
      const flop = put(root, new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.16, 3, 8), new THREE.MeshStandardMaterial({ color: '#ef4f8a', roughness: 0.6 })), [flopAt.x * 1.08, 0.02, flopAt.z * 1.08]);
      flop.scale.z = 0.25;
      flop.rotation.set(Math.PI / 2, 0, random() * 3);
    }
    if (a.season === 'yellowing') {
      const floating = Math.round(mix(8, 22, mood.density));
      for (let i = 0; i < floating; i++) {
        const angle = random() * 6.28, d = R * mix(0.2, 0.92, random());
        const leaf = put(root, new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: random() < 0.7 ? '#e8c62a' : '#c9882a', roughness: 0.4 })), [Math.sin(angle) * d, low && d < R * 0.6 ? 0.085 : low && d < R * 0.86 ? 0.05 : 0.008, Math.cos(angle) * d]);
        leaf.scale.set(0.1, 0.006, 0.2);
        leaf.rotation.y = random() * 6;
      }
    }

    // Tenants sit on the highest arches, which stay dry.
    const perchOn = (minimum: number) => {
      for (let attempt = 0; attempt < 40; attempt++) {
        const curve = rootCurves[Math.floor(random() * rootCurves.length)];
        const p = curve.getPoint(mix(0.12, 0.55, random()));
        if (p.y - sink > minimum) return p;
      }
      return new THREE.Vector3(0.3, J, 0.3);
    };
    if (a.tenant === 'kingfisher') {
      const p = perchOn(0.5);
      const bird = new THREE.Group();
      const blue = new THREE.MeshStandardMaterial({ color: '#1f7fd6', emissive: '#0f4fa0', emissiveIntensity: mix(0.2, 0.6, mood.cheer), roughness: 0.4 });
      const orange = new THREE.MeshStandardMaterial({ color: '#f08a2a', roughness: 0.5 });
      put(bird, new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), orange), [0, 0.13, 0]).scale.set(0.085, 0.11, 0.09);
      put(bird, new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), blue), [0, 0.14, -0.035]).scale.set(0.09, 0.11, 0.08);
      put(bird, new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), blue), [0, 0.27, 0.01]);
      put(bird, new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.2, 6), new THREE.MeshStandardMaterial({ color: '#d8322a', roughness: 0.4 })), [0, 0.26, 0.15]).rotation.x = Math.PI / 2 + 0.1;
      put(bird, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.12), blue), [0, 0.08, -0.12]).rotation.x = 0.5;
      bird.scale.setScalar(1.5);
      bird.rotation.y = Math.atan2(p.x, p.z) + 0.6;
      put(tree, bird, [p.x, p.y + 0.05, p.z]);
    } else if (a.tenant === 'crabs') {
      const red = new THREE.MeshStandardMaterial({ color: '#c8342a', emissive: '#7a1410', emissiveIntensity: mix(0.1, 0.4, mood.cheer), roughness: 0.4 });
      for (let i = 0; i < Math.round(mix(4, 10, mood.density)); i++) {
        const p = perchOn(0.15);
        const crab = new THREE.Group();
        put(crab, new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), red)).scale.set(0.085, 0.04, 0.065);
        for (const e of [-1, 1]) {
          put(crab, new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), red), [e * 0.075, 0.01, 0.06]);
          for (let k = 0; k < 3; k++) put(crab, new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.11, 4), red), [e * 0.11, -0.01, (k - 1) * 0.04]).rotation.z = e * 1.0;
        }
        crab.rotation.set((random() - 0.5) * 1.2, random() * 6, (random() - 0.5) * 1.2);
        put(tree, crab, [p.x, p.y + 0.07, p.z]);
      }
    } else if (a.tenant === 'marker') {
      const p = perchOn(0.9);
      const rag = new THREE.MeshStandardMaterial({ color: '#e0352a', emissive: '#8a1410', emissiveIntensity: mix(0.1, 0.5, mood.cheer), side: THREE.DoubleSide, roughness: 0.9 });
      put(tree, new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 5, 12), rag), [p.x, p.y, p.z]).rotation.set(1.2, Math.atan2(p.x, p.z), 0);
      const cloth = new THREE.PlaneGeometry(0.16, 0.6, 2, 5);
      const pos = cloth.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getY(i) * 9) * 0.04);
      cloth.computeVertexNormals();
      put(tree, new THREE.Mesh(cloth, rag), [p.x, p.y - 0.36, p.z]).rotation.y = random() * 3;
      const q2 = perchOn(0.6);
      const drop = q2.y - sink;
      put(root, new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, drop, 4), new THREE.MeshStandardMaterial({ color: '#e8e4d8' })), [q2.x * 1.08, drop / 2, q2.z * 1.08]);
      put(root, new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: '#f2f0e6', roughness: 0.4 })), [q2.x * 1.08, 0.02, q2.z * 1.08]);
      put(root, new THREE.Mesh(new THREE.SphereGeometry(0.051, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), rag), [q2.x * 1.08, 0.022, q2.z * 1.08]);
      put(root, new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 4, 16), ripple), [q2.x * 1.08, 0.006, q2.z * 1.08]).rotation.x = Math.PI / 2;
    }

    root.updateMatrixWorld(true);
    const centre = visibleBounds(root).getCenter(new THREE.Vector3());
    const holder = new THREE.Group();
    holder.add(root);
    root.position.set(-centre.x, 0, -centre.z);
    const energy = mix(0.1, 1.2, mood.energy);
    top.position.y = J;
    for (const child of top.children) child.position.y -= J;
    return {
      object: holder,
      footprint: S * 0.75,
      update: (_dt, time) => {
        top.rotation.z = Math.sin(time * 0.7) * 0.012 * energy;
        top.rotation.x = Math.sin(time * 0.53 + 1) * 0.01 * energy;
      },
      dispose: () => disposeTree(holder),
    };
  },
});
