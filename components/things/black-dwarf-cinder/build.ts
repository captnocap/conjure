import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    surface: choice('What is the surface of the dead star like?', {
      obsidian: 'Smooth black volcanic glass with a single hard highlight.',
      crystal: 'Big flat facets like a cut black diamond, each catching the light differently.',
      clinker: 'Lumpy cracked clinker, a furnace cinder or a lump of coal.',
      banded: 'Polished and banded in charcoal and slate layers, like a river stone.',
    }),
    seam: choice('Does any residual warmth still show?', {
      none: 'None at all. It is entirely cold.',
      thread: 'One hair-thin seam of dull red running across it.',
      web: 'A faint web of cracks with a last orange glow in them.',
      coal: 'A single warm patch on one side, like the last live coal in a grate.',
    }),
    clings: choice('What clings to it or keeps it company?', {
      nothing: 'Nothing. A bare ball in the dark.',
      shards: 'Chips and splinters of itself drifting just off the surface.',
      dust: 'A thin flat ring of grey dust.',
      lander: 'A tiny abandoned lander on top with its dish still pointed outward.',
      moonlet: 'One small ice moon still circling out of habit.',
    }),
    frost: score('How much frost sheen lies on it?', ['Bare and black', 'A dusting on the upper side', 'Heavy rime with crystal spikes']),
    bitten: noul('Has a piece been sheared off, showing a pale crystal interior on the flat cut?'),
    shape: choice('How round is it?', {
      perfect: 'A perfect sphere.',
      squat: 'Slightly flattened, heavy-looking.',
      lumpy: 'Uneven and knuckled, more a nugget than a ball.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 1.1;
    const o = [random() * 50, random() * 50, random() * 50];
    const hash = (x: number, y: number, z: number) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); };
    const noise = (x: number, y: number, z: number) => {
      const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
      const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
      let total = 0;
      for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++)
        total += hash(ix + dx, iy + dy, iz + dz) * (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
      return total;
    };
    const fbm = (p: THREE.Vector3, f: number) => noise(p.x * f + o[0], p.y * f + o[1], p.z * f + o[2]) * 0.6 + noise(p.x * f * 2.3 + o[1], p.y * f * 2.3 + o[2], p.z * f * 2.3 + o[0]) * 0.4;

    const detail = { obsidian: 5, crystal: 1, clinker: 4, banded: 5 }[a.surface];
    const faceted = a.surface === 'crystal' || a.surface === 'clinker';
    const geometry: THREE.BufferGeometry = new THREE.IcosahedronGeometry(R, detail);
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const lump = (a.shape === 'lumpy' ? 0.2 : 0.03) + (a.surface === 'clinker' ? 0.1 : 0);
    const cutDir = new THREE.Vector3(0.55 + random() * 0.2, 0.5, 0.65).normalize();
    const cutAt = R * mix(0.62, 0.74, random());
    const p = new THREE.Vector3();
    const reach = (dir: THREE.Vector3) => {
      // Radius of the finished surface along a direction, for standing things on it.
      const q = dir.clone().normalize();
      let r = R * (1 + (fbm(q, 1.3) - 0.5) * 2 * lump + (a.surface === 'clinker' ? (fbm(q, 5) - 0.5) * 0.09 : 0));
      const v = q.clone().multiplyScalar(r);
      if (a.shape === 'squat') v.y *= 0.84;
      if (a.bitten) { const d = v.dot(cutDir); if (d > cutAt) v.addScaledVector(cutDir, cutAt - d); }
      return v;
    };
    for (let i = 0; i < position.count; i++) {
      p.fromBufferAttribute(position, i);
      if (a.surface === 'crystal') p.addScaledVector(p.clone().normalize(), (hash(Math.round(p.x * 40), Math.round(p.y * 40), Math.round(p.z * 40) + o[0]) - 0.5) * 0.12);
      const v = reach(p);
      if (a.surface === 'crystal') v.multiplyScalar(p.length() / R);
      position.setXYZ(i, v.x, v.y, v.z);
    }
    // Colour per face: charcoal variety, bands, and the pale interior on the cut.
    const colours = new Float32Array(position.count * 3);
    const c = new THREE.Color(), centroid = new THREE.Vector3(), q = new THREE.Vector3();
    const base = { obsidian: '#16171c', crystal: '#1d2028', clinker: '#2a2623', banded: '#24262b' }[a.surface];
    for (let f = 0; f < position.count; f += 3) {
      centroid.set(0, 0, 0);
      for (let k = 0; k < 3; k++) centroid.add(q.fromBufferAttribute(position, f + k));
      centroid.divideScalar(3);
      for (let k = 0; k < 3; k++) {
        q.fromBufferAttribute(position, f + k);
        const at = faceted ? centroid : q;
        c.set(base);
        if (a.surface === 'crystal') c.offsetHSL(0.6 * 0 + (hash(f, 1, o[0]) - 0.5) * 0.05, 0.05, (hash(f, 2, o[1]) - 0.35) * 0.16);
        if (a.surface === 'clinker') c.offsetHSL(0, 0, (fbm(at, 4) - 0.5) * 0.14);
        if (a.surface === 'banded') { const band = Math.sin((at.y + fbm(at, 1.2) * 0.5) * 16) * 0.5 + 0.5; c.lerp(new THREE.Color('#5b6068'), band * band * 0.6); }
        if (a.surface === 'obsidian') c.offsetHSL(0, 0, (fbm(at, 2.5) - 0.5) * 0.03);
        if (a.bitten && at.dot(cutDir) > cutAt - 0.012) { c.set('#aeb9c6'); c.offsetHSL(0, 0, (hash(Math.round(at.x * 9), Math.round(at.y * 9), Math.round(at.z * 9)) - 0.5) * 0.18); }
        colours.set([c.r, c.g, c.b], (f + k) * 3);
      }
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    geometry.computeVertexNormals();
    if (!faceted) {
      // Icosahedra are unindexed, so smooth stones get their normals from the sphere itself.
      const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) {
        q.fromBufferAttribute(position, i);
        if (a.bitten && q.dot(cutDir) > cutAt - 0.012) q.copy(cutDir); else q.normalize();
        normal.setXYZ(i, q.x, q.y, q.z);
      }
    }
    const body = new THREE.MeshPhysicalMaterial({
      vertexColors: true, flatShading: faceted,
      roughness: { obsidian: 0.08, crystal: 0.16, clinker: 0.95, banded: 0.28 }[a.surface] + mood.wear * 0.08,
      metalness: a.surface === 'crystal' ? 0.35 : 0.05,
      clearcoat: a.surface === 'clinker' ? 0 : 0.8, clearcoatRoughness: 0.15,
    });
    const globe = s.mesh(geometry, body);

    // A cold rim: a see-through pale shell so the black ball has an edge against any backdrop.
    const rim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 40, 24), new THREE.MeshBasicMaterial({ color: '#b9cfe0', transparent: true, opacity: 0.1 + a.frost * 0.14, depthWrite: false, side: THREE.BackSide }));
    if (a.shape === 'squat') rim.scale.y = 0.84;
    s.root.add(rim);

    // Frost: rime plates and spikes, thickest on top.
    const frostCount = Math.round(a.frost * a.frost * 900 + a.frost * 120);
    if (frostCount > 0) {
      const ice = new THREE.MeshStandardMaterial({ color: '#e9f3fa', roughness: 0.35, emissive: '#9db8cc', emissiveIntensity: 0.25, flatShading: true });
      const frost = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), ice, frostCount);
      const m = new THREE.Matrix4(), quat = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), scale = new THREE.Vector3();
      const poles = Array.from({ length: 4 }, () => new THREE.Vector3(random() - 0.5, random() * 0.9 + 0.25, random() - 0.5).normalize());
      for (let i = 0; i < frostCount; i++) {
        const pole = poles[i % poles.length];
        const dir = pole.clone().add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.3 + a.frost * 1.1 * random())).normalize();
        const at = reach(dir);
        const spike = a.frost > 0.6 && random() < 0.22;
        const w = 0.012 + random() * 0.022;
        scale.set(w, spike ? 0.05 + random() * 0.13 : w * 0.35, w);
        quat.setFromUnitVectors(up, dir);
        m.compose(at, quat, scale);
        frost.setMatrixAt(i, m);
      }
      frost.castShadow = true;
      s.root.add(frost);
    }

    // Residual warmth.
    const glow = new THREE.MeshStandardMaterial({ color: '#3a0f06', emissive: '#d8380f', emissiveIntensity: mix(0.6, 1.2, mood.warmth), roughness: 1 });
    const crack = (start: THREE.Vector3, heading: THREE.Vector3, length: number, width: number) => {
      const points: THREE.Vector3[] = [];
      let dir = start.clone().normalize(), go = heading.clone();
      for (let i = 0; i < 14; i++) {
        points.push(reach(dir).multiplyScalar(1.004));
        go.add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.9)).normalize();
        dir = dir.addScaledVector(go, length / 14).normalize();
      }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, width, 5), glow);
      s.root.add(tube);
      return dir;
    };
    const front = new THREE.Vector3(0.35 - random() * 0.5, 0.25 + random() * 0.3, 0.85).normalize();
    if (a.seam === 'thread') { const end = crack(front.clone().add(new THREE.Vector3(-0.9, 0.5, 0)), new THREE.Vector3(1, -0.4, 0.2), 2.4, 0.008); crack(end, new THREE.Vector3(0.6, -0.8, -0.2), 0.9, 0.005); }
    if (a.seam === 'web') for (let i = 0; i < 8; i++) crack(front.clone().add(new THREE.Vector3((random() - 0.5) * 0.5, (random() - 0.5) * 0.5, 0)), new THREE.Vector3(Math.cos(i * 0.8), Math.sin(i * 0.8), 0), 0.9 + random() * 0.9, 0.006);
    if (a.seam === 'coal') {
      const at = reach(front);
      const patch = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 12), glow);
      patch.position.copy(at).multiplyScalar(0.875);
      patch.scale.set(1, 1, 1);
      s.root.add(patch);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 12), new THREE.MeshBasicMaterial({ color: '#e0522a', transparent: true, opacity: 0.16, depthWrite: false }));
      halo.position.copy(at).multiplyScalar(0.9);
      s.root.add(halo);
      for (let i = 0; i < 7; i++) crack(front, new THREE.Vector3(Math.cos(i * 0.9), Math.sin(i * 0.9), 0), 0.4 + random() * 0.5, 0.006);
    }

    // Company.
    const dark = new THREE.MeshStandardMaterial({ color: base, roughness: 0.3, flatShading: true });
    let drift: THREE.Object3D | null = null;
    if (a.clings === 'shards' || a.bitten) {
      const group = new THREE.Group();
      const n = a.clings === 'shards' ? 16 + Math.round(mood.density * 14) : 5;
      for (let i = 0; i < n; i++) {
        const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.04 + random() ** 2 * 0.13, 0), dark);
        const dir = a.bitten ? cutDir.clone().add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.8)).normalize() : new THREE.Vector3(random() - 0.5, (random() - 0.5) * 0.7, random() - 0.5).normalize();
        shard.position.copy(dir).multiplyScalar(R * (1.08 + random() * 0.45));
        shard.rotation.set(random() * 6, random() * 6, random() * 6);
        shard.scale.set(1, 0.4 + random(), 0.5 + random() * 0.5);
        shard.castShadow = true;
        group.add(shard);
      }
      s.root.add(group);
      drift = group;
    }
    if (a.clings === 'dust') {
      const bits = Array.from({ length: 320 }, () => {
        const t = random() * Math.PI * 2, r = R * (1.45 + random() * 0.55);
        return { at: [Math.cos(t) * r, (random() - 0.5) * 0.02, Math.sin(t) * r] as [number, number, number], size: 0.008 + random() ** 3 * 0.035, color: random() < 0.6 ? '#8f8b88' : '#55535a' };
      });
      const ring = new Sculpture(context);
      ring.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), bits);
      ring.root.rotation.set(0.22, 0, 0.1);
      s.root.add(ring.root);
      drift = ring.root;
    }
    let moon: THREE.Object3D | null = null;
    if (a.clings === 'moonlet') {
      moon = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 2), new THREE.MeshStandardMaterial({ color: '#cfdbe4', roughness: 0.55, flatShading: true }));
      ball.position.set(R * 1.55, 0, 0);
      ball.castShadow = true;
      const track = new THREE.Mesh(new THREE.TorusGeometry(R * 1.55, 0.005, 4, 96), new THREE.MeshBasicMaterial({ color: '#7d8791', transparent: true, opacity: 0.45, depthWrite: false }));
      track.rotation.x = Math.PI / 2;
      moon.add(ball);
      const tilt = new THREE.Group();
      tilt.rotation.set(0.25, 0, -0.12);
      tilt.add(moon, track);
      moon.rotation.y = random() * 6;
      s.root.add(tilt);
    }
    if (a.clings === 'lander') {
      const metal = s.material('#b7a888', { metalness: 0.5, roughness: 0.5 });
      const lander = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.07, 8), metal);
      hull.position.y = 0.1; hull.castShadow = true;
      lander.add(hull);
      for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 5), metal);
        const t = i * Math.PI / 2 + 0.4;
        leg.position.set(Math.cos(t) * 0.09, 0.055, Math.sin(t) * 0.09);
        leg.rotation.set(Math.sin(t) * 0.6, 0, -Math.cos(t) * 0.6);
        lander.add(leg);
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.008, 8), metal);
        pad.position.set(Math.cos(t) * 0.135, 0.004, Math.sin(t) * 0.135);
        lander.add(pad);
      }
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 6, 0, Math.PI * 2, 0, 1.0), s.material('#e3ddcf', { side: THREE.DoubleSide, metalness: 0.3 }));
      dish.position.set(0.02, 0.25, 0); dish.rotation.set(Math.PI - 0.5, 0, 0.3);
      lander.add(dish);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.24, 5), metal);
      mast.position.set(-0.04, 0.24, 0.02);
      lander.add(mast);
      const dir = new THREE.Vector3(-0.15 + random() * 0.3, 1, 0.3 + random() * 0.2).normalize();
      lander.position.copy(reach(dir));
      lander.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      lander.rotateZ(mood.wear * 0.25);
      lander.scale.setScalar(1.5);
      s.root.add(lander);
    }

    globe.rotation.y = 0;
    const speed = mix(0.01, 0.08, mood.energy);
    return s.finish({
      footprint: R,
      update(dt, time) {
        if (drift) drift.rotation.y += dt * speed;
        if (moon) moon.rotation.y += dt * speed * 4;
        glow.emissiveIntensity = mix(0.6, 1.2, mood.warmth) * (1 + Math.sin(time * 0.9) * 0.18);
      },
    });
  },
});
