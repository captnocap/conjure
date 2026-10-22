import * as THREE from 'three';
import { choice, clamp01, defineThing, disposeTree, mix, noul, score, visibleBounds } from '@conjure/kit';
import { displace, instances, mat, mesh, noise, paint, range, settle, type Spot, type V3 } from './lib';

const LURE = {
  blue: ['#9fe4ff', '#39b8ff'],
  green: ['#c9ffb0', '#4dff7a'],
  amber: ['#ffe2a0', '#ffa424'],
  violet: ['#e6c4ff', '#a24dff'],
  red: ['#ffb0a0', '#ff3a2a'],
  white: ['#ffffff', '#dff4ff'],
} as const;
const SKIN = {
  velvet: ['#2a2422', '#4a3c36'],
  chocolate: ['#4a2f20', '#7b5236'],
  bruise: ['#3a2a4a', '#6d4a78'],
  ghost: ['#d9d2c8', '#f1ebe2'],
  rust: ['#6e2a1c', '#a8502c'],
  olive: ['#3a3d24', '#6c6a3a'],
} as const;
// width, height, length, tail stretch, belly sag
const BODY = {
  globe: [0.86, 0.9, 1, 0.25, 0.1],
  humpback: [0.7, 1.12, 0.86, 0.15, 0.2],
  slender: [0.5, 0.56, 1.3, 0.7, 0],
  flabby: [0.95, 0.78, 1.05, 0.2, 0.55],
  hatchet: [0.34, 1.0, 0.95, 0.35, 0.3],
} as const;

/** A ragged fin fan in the XY plane, pointing along +x from the origin. */
function fin(random: () => number, spread: number, length: number, rays: number, ragged: number) {
  const points: number[] = [], index: number[] = [];
  points.push(0, 0, 0);
  for (let i = 0; i <= rays * 2; i++) {
    const t = i / (rays * 2) - 0.5, tip = i % 2 === 0 ? 1 : 1 - ragged * range(random, 0.3, 1);
    const r = length * tip * (1 - Math.abs(t) * 0.5);
    points.push(Math.cos(t * spread) * r, Math.sin(t * spread) * r, 0);
    if (i > 0) index.push(0, i, i + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    body: choice('What shape is her body?', {
      globe: 'A round football of a fish, all head and belly.',
      humpback: 'Tall and hunched, a deep-bodied black devil.',
      slender: 'Long and lean with a whip of a tail, more eel than ball.',
      flabby: 'A sagging, loose-skinned sack with a distended belly.',
      hatchet: 'Thin as a blade from the front, tall from the side.',
    }),
    size: score('How big is she?', ['Small enough to sit in a palm', 'The size of a grapefruit', 'As big as a dog', 'A metre-long monster']),
    gape: score('How wide are the jaws open?', ['Clamped shut, teeth meshed like a cage', 'Slightly parted', 'Yawning', 'Unhinged, wide enough to swallow something her own size']),
    doing: choice('What is she doing?', {
      hunting: 'Hanging motionless with the lure dangled just in front of her mouth.',
      drifting: 'Drifting slack, lure trailing limp over her back.',
      lunging: 'Mid-strike at a small silver fish that came to the light.',
      fed: 'Just fed: belly swollen, a tail still hanging from the corner of her mouth.',
      rising: 'Tilted upward, swimming up out of the dark toward something.',
    }),
    lure: choice('What colour does the lure glow?', {
      blue: 'Cold blue-white, the classic bioluminescence.',
      green: 'Sickly luminous green.',
      amber: 'Warm amber like a porch light.',
      violet: 'Ultraviolet purple.',
      red: 'A dim ember red.',
      white: 'Pure white, bright as a welding spark.',
      dark: 'Gone dark: the lure is dead and unlit.',
    }),
    stalk: choice('What is the lure like?', {
      bulb: 'A short rod with a single round bulb.',
      whip: 'A fishing-rod stalk longer than her body.',
      tassel: 'A bulb trailing fine glowing filaments.',
      twin: 'A forked stalk carrying two lights.',
    }),
    skin: choice('What is her skin like?', {
      velvet: 'Light-swallowing black-brown velvet.',
      chocolate: 'Warm chocolate brown.',
      bruise: 'Bruise purple.',
      ghost: 'Pallid, almost translucent ghost white.',
      rust: 'Rust red, which is invisible at depth.',
      olive: 'Murky olive green.',
    }),
    hide: choice('What covers the skin?', {
      smooth: 'Smooth and slick.',
      warty: 'Lumpy with warts and nodules.',
      spiny: 'Studded with short thorns.',
    }),
    male: noul('Is a tiny parasitic male fused to her flank?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group(), fish = new THREE.Group();
    root.add(fish);
    const n = noise(random);
    const [sx, sy, sz, tailStretch, sagBase] = BODY[a.body];
    const U = mix(0.06, 0.55, a.size) / sz;
    const gape = clamp01(a.gape * 0.85 + (a.doing === 'lunging' ? 0.35 : a.doing === 'hunting' ? 0.12 : a.doing === 'drifting' ? -0.1 : 0));
    const sag = sagBase + (a.doing === 'fed' ? 0.5 : 0);
    const zm = 0.1, ym = -0.08, gu = mix(0.07, 0.8, gape), gl = mix(0.09, 1.0, gape);
    const inMouth = (p: THREE.Vector3) => p.z > zm && p.y < ym + gu * (p.z - zm) && p.y > ym - gl * (p.z - zm) && Math.abs(p.x) < 0.93;
    /** Unit sphere point → fish surface in metres. */
    const shape = (p: THREE.Vector3, out = new THREE.Vector3()) => {
      let { x, y, z } = p;
      if (z > 0 && y < ym) { const k = clamp01((ym - y) * 2.5) * clamp01(z * 2); z += 0.26 * k; y -= gape * 0.22 * k; }
      if (z > 0 && y >= ym) y += gape * 0.1 * clamp01(z * 2) * clamp01((y - ym) * 3);
      if (z < 0) { const t = -z; const s = 1 - 0.35 * Math.pow(t, 1.5); x *= s * (1 - 0.3 * t); y *= s; z = z * (1 + tailStretch * t); }
      if (y < 0) y *= 1 + sag * Math.exp(-Math.pow(z + 0.15, 2) * 3.5);
      return out.set(x * sx * U, y * sy * U, z * sz * U);
    };
    const [skinDark, skinLight] = SKIN[a.skin].map((c) => new THREE.Color(c));
    const scar = new THREE.Color('#b9a79a');
    const gum = new THREE.Color(a.skin === 'ghost' ? '#7a3040' : '#1a0c0e');

    // Body: a sphere with the mouth carved out as a wedge.
    const geometry = new THREE.SphereGeometry(1, 64, 44);
    const position = geometry.attributes.position, colours = new Float32Array(position.count * 3);
    const p = new THREE.Vector3(), q = new THREE.Vector3(), c = new THREE.Color();
    for (let i = 0; i < position.count; i++) {
      p.fromBufferAttribute(position, i);
      const inside = inMouth(p);
      if (inside) {
        // Pulled back into a throat.
        const depth = clamp01((p.z - zm) * 1.6);
        q.set(p.x * 0.8, ym + (p.y - ym) * 0.55, zm - 0.4 * depth);
        shape(q, q);
        c.copy(gum);
      } else {
        shape(p, q);
        const bump = n(p.x, p.y, p.z, 2.4) * 0.03 * U + (a.hide !== 'smooth' ? n(p.x, p.y, p.z, 7) * 0.022 * U : 0);
        q.addScaledVector(p, bump);
        const mottle = n(p.x, p.y, p.z, 3.1) * 0.5 + 0.5;
        c.copy(skinDark).lerp(skinLight, clamp01(mottle * 0.9 + (p.y < -0.3 ? 0.25 : 0)));
        c.lerp(scar, clamp01((n(p.x * 3, p.y, p.z, 5) - 0.55) * 4) * mood.wear * 0.7);
      }
      position.setXYZ(i, q.x, q.y, q.z);
      colours[i * 3] = c.r; colours[i * 3 + 1] = c.g; colours[i * 3 + 2] = c.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    geometry.computeVertexNormals();
    const hide = mat('#ffffff', { vertexColors: true, roughness: a.hide === 'smooth' ? 0.42 : 0.75 });
    mesh(fish, geometry, hide);
    const dark = mat(skinDark.clone().multiplyScalar(0.8), { roughness: 0.7, side: THREE.DoubleSide });
    const light = mat(skinLight, { roughness: 0.7 });

    // Teeth: long needles along both lips, found by walking the wedge edge.
    const teeth: Spot[] = [];
    const count = 15;
    for (const upper of [true, false]) for (let i = 0; i < count; i++) {
      const theta = ((i + 0.5) / count - 0.5) * 2.25 + range(random, -0.03, 0.03);
      let lo = -1.3, hi = 1.3;
      const f = (e: number) => { const y = Math.sin(e), z = Math.cos(theta) * Math.cos(e); return upper ? y - (ym + gu * (z - zm)) : y - (ym - gl * (z - zm)); };
      for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
      const e = (lo + hi) / 2;
      p.set(Math.sin(theta) * Math.cos(e), Math.sin(e), Math.cos(theta) * Math.cos(e));
      if (p.z < zm + 0.03) continue;
      p.y += upper ? 0.015 : -0.015;
      shape(p, q);
      const front = 1 - Math.abs(theta) / 1.2;
      const length = U * sy * mix(0.16, 0.5, front * front) * range(random, 0.55, 1.15) * (i % 2 ? 1 : 0.6) * (upper ? 0.85 : 1.1);
      const lean = range(random, -0.14, 0.14);
      teeth.push({ at: [q.x * 0.97, q.y, q.z * 0.985], scale: [U * 0.03, length, U * 0.03], rot: upper ? [Math.PI + 0.22 + lean, 0, Math.sin(theta) * 0.25] : [-0.3 + lean, 0, -Math.sin(theta) * 0.25] });
    }
    const cone = new THREE.ConeGeometry(1, 1, 6);
    cone.translate(0, 0.5, 0);
    instances(fish, cone, mat('#f4f2df', { roughness: 0.25, emissive: '#6a6a55', emissiveIntensity: 0.35 }), teeth);

    // Eyes: small, milky, set high.
    for (const side of [-1, 1]) {
      shape(p.set(side * 0.62, 0.42, 0.66).normalize(), q);
      mesh(fish, new THREE.SphereGeometry(U * 0.075, 12, 10), mat('#cfd8d2', { roughness: 0.15 }), [q.x, q.y, q.z]);
      mesh(fish, new THREE.SphereGeometry(U * 0.04, 10, 8), mat('#0b0b0c', { roughness: 0.1 }), [q.x + side * U * 0.035, q.y + U * 0.01, q.z + U * 0.045]);
    }

    // Fins.
    const tail = shape(new THREE.Vector3(0, 0, -1));
    const tailFin = mesh(fish, fin(random, 1.5, U * mix(0.55, 0.8, random()), 7, mix(0.15, 0.6, mood.wear)), dark, [0, tail.y, tail.z + U * 0.06], 1, [0, Math.PI / 2, 0]);
    const pectorals: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      shape(p.set(side * 0.93, -0.22, -0.25).normalize(), q);
      pectorals.push(mesh(fish, fin(random, 1.3, U * 0.42, 5, 0.25), dark, [q.x, q.y, q.z], 1, [0.3, side > 0 ? Math.PI / 2 - 0.7 : Math.PI / 2 + 0.7, 0]));
    }
    shape(p.set(0, 0.6, -0.8).normalize(), q);
    mesh(fish, fin(random, 1.2, U * 0.4, 5, 0.3), dark, [0, q.y - U * 0.04, q.z], 1, [0, Math.PI / 2, -0.75]);
    shape(p.set(0, -0.6, -0.8).normalize(), q);
    mesh(fish, fin(random, 1.1, U * 0.32, 4, 0.3), dark, [0, q.y + U * 0.04, q.z], 1, [0, Math.PI / 2, 0.75]);

    // Warts or thorns.
    if (a.hide !== 'smooth') {
      const bumps: Spot[] = [];
      const total = a.hide === 'warty' ? 70 : 90;
      for (let i = 0; i < total; i++) {
        p.set(range(random, -1, 1), range(random, -1, 1), range(random, -1, 0.75)).normalize();
        if (inMouth(p) || (p.z > 0.3 && Math.abs(p.y - ym) < 0.3)) continue;
        shape(p, q);
        if (a.hide === 'warty') { const s = U * range(random, 0.025, 0.07); bumps.push({ at: [q.x, q.y, q.z], scale: [s, s * 0.7, s], color: random() < 0.3 ? skinLight : skinDark }); }
        else { const up = new THREE.Vector3(0, 1, 0), quat = new THREE.Quaternion().setFromUnitVectors(up, p), e = new THREE.Euler().setFromQuaternion(quat); bumps.push({ at: [q.x * 0.97, q.y * 0.97, q.z * 0.97], scale: [U * 0.022, U * range(random, 0.08, 0.16), U * 0.022], rot: [e.x, e.y, e.z], color: skinLight }); }
      }
      instances(fish, a.hide === 'warty' ? new THREE.SphereGeometry(1, 8, 6) : cone.clone(), mat('#ffffff', { roughness: 0.7 }), bumps);
    }

    // The lure: stalk from the forehead, light at the tip.
    const lit = a.lure !== 'dark';
    const [core, halo] = lit ? LURE[a.lure as keyof typeof LURE] : ['#5a5650', '#5a5650'];
    const origin = shape(new THREE.Vector3(0, 0.84, 0.54));
    const reach = U * (a.stalk === 'whip' ? 2.3 : 1.15);
    const front = shape(new THREE.Vector3(0, 0, 1)).z;
    const tip: V3 = a.doing === 'drifting' ? [range(random, -0.2, 0.2) * U, origin.y + reach * 0.45, origin.z - reach * 0.75]
      : a.doing === 'lunging' ? [0, origin.y + reach * 0.7, origin.z - reach * 0.2]
      : a.doing === 'rising' ? [0, origin.y + reach * 0.75, origin.z + reach * 0.55]
      : [range(random, -0.08, 0.08) * U, mix(origin.y, ym * U, 0.25) + (a.stalk === 'whip' ? U * 0.4 : U * 0.25), Math.max(front + U * 0.3, origin.z + reach * 0.75)];
    const bend: V3 = [tip[0] * 0.5, Math.max(origin.y, tip[1]) + reach * 0.45, (origin.z + tip[2]) / 2];
    const lureGroup = new THREE.Group();
    fish.add(lureGroup);
    const stalkMat = mat(skinDark, { roughness: 0.6 });
    const curve = (to: V3, via: V3) => new THREE.CatmullRomCurve3([origin.clone(), new THREE.Vector3().lerpVectors(origin, new THREE.Vector3(...via), 0.5).add(new THREE.Vector3(0, reach * 0.12, 0)), new THREE.Vector3(...via), new THREE.Vector3(...to)]);
    const glowMat = mat(core, { emissive: halo, emissiveIntensity: lit ? mix(1.6, 3.2, mood.cheer * 0.5 + mood.energy * 0.5) : 0, roughness: 0.4 });
    const haloMat = new THREE.MeshBasicMaterial({ color: halo, transparent: true, opacity: 0.16, depthWrite: false });
    const bulbR = U * (a.stalk === 'twin' ? 0.085 : 0.115);
    const tips: V3[] = a.stalk === 'twin' ? [[tip[0] - U * 0.2, tip[1], tip[2]], [tip[0] + U * 0.2, tip[1] - U * 0.1, tip[2] + U * 0.05]] : [tip];
    for (const end of tips) {
      mesh(lureGroup, new THREE.TubeGeometry(curve(end, bend), 28, U * 0.022, 6), stalkMat);
      mesh(lureGroup, new THREE.SphereGeometry(bulbR, 16, 12), glowMat, end);
      if (lit) for (const k of [2.2, 3.6]) { const h = new THREE.Mesh(new THREE.SphereGeometry(bulbR * k, 16, 12), haloMat); h.position.set(...end); lureGroup.add(h); }
      if (a.stalk === 'tassel') for (let i = 0; i < 7; i++) {
        const dx = range(random, -1, 1) * U * 0.25, dz = range(random, -1, 1) * U * 0.25, drop = U * range(random, 0.3, 0.7);
        mesh(lureGroup, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(...end), new THREE.Vector3(end[0] + dx * 0.7, end[1] - drop * 0.4, end[2] + dz * 0.7), new THREE.Vector3(end[0] + dx, end[1] - drop, end[2] + dz)]), 8, U * 0.009, 4), glowMat);
      }
    }

    // Story props.
    const silver = mat('#cfd9de', { roughness: 0.3, metalness: 0.5 });
    const smallFish = (at: V3, length: number, yaw: number, parent: THREE.Object3D = fish) => {
      const g = new THREE.Group();
      mesh(g, new THREE.SphereGeometry(1, 12, 8), silver, [0, 0, 0], [length * 0.14, length * 0.2, length * 0.5]);
      mesh(g, fin(random, 1.2, length * 0.3, 3, 0.1), silver, [0, 0, -length * 0.45], 1, [0, Math.PI / 2, 0]).material = mat('#aab6bc', { side: THREE.DoubleSide, roughness: 0.4 });
      g.position.set(...at); g.rotation.y = yaw; parent.add(g);
      return g;
    };
    if (a.doing === 'lunging') smallFish([U * 0.1, ym * U - U * 0.05, front + U * 0.45], U * 0.55, 2.2);
    if (a.doing === 'fed') { shape(p.set(0.62, ym - 0.02, 0.75).normalize(), q); smallFish([q.x + U * 0.05, q.y - U * 0.1, q.z + U * 0.05], U * 0.5, 0.4).rotation.x = 1.1; }
    if (a.male) {
      shape(p.set(0.75, -0.55, -0.3).normalize(), q);
      const g = new THREE.Group();
      mesh(g, new THREE.SphereGeometry(1, 12, 8), light, [0, 0, 0], [U * 0.07, U * 0.08, U * 0.17]);
      mesh(g, fin(random, 1.2, U * 0.12, 3, 0.2), dark, [0, 0, -U * 0.16], 1, [0, Math.PI / 2, 0]);
      g.position.copy(q).multiplyScalar(1.04); g.lookAt(0, 0, 0); fish.add(g);
    }

    fish.rotation.x = a.doing === 'rising' ? -0.5 : a.doing === 'lunging' ? -0.12 : a.doing === 'drifting' ? 0.12 : 0;
    fish.rotation.z = a.doing === 'drifting' ? range(random, -0.2, 0.2) : 0;
    settle(root, visibleBounds);
    const bodyHeight = visibleBounds(root).getSize(new THREE.Vector3()).y;
    const hover = Math.min(bodyHeight * 0.3, U * sy * 0.7);
    root.position.y += hover;
    const energy = mix(0.25, 1.6, mood.energy) * (a.doing === 'drifting' ? 0.5 : a.doing === 'lunging' ? 2 : 1);
    const base = { y: fish.position.y, tail: tailFin.rotation.y };
    return {
      object: root,
      update(_dt, time) {
        fish.position.y = base.y + Math.sin(time * 0.9 * energy) * hover * 0.12;
        tailFin.rotation.y = base.tail + Math.sin(time * 2.4 * energy) * 0.35;
        pectorals.forEach((f, i) => { f.rotation.x = 0.3 + Math.sin(time * 3 * energy + i) * 0.25; });
        lureGroup.rotation.z = Math.sin(time * 1.3 * energy) * 0.05;
        if (lit) glowMat.emissiveIntensity = mix(1.6, 3.2, mood.cheer * 0.5 + mood.energy * 0.5) * (0.85 + 0.15 * Math.sin(time * 4 * energy));
      },
      dispose: () => disposeTree(root),
    };
  },
});
