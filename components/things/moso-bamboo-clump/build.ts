import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    habit: choice('How does the clump stand?', {
      fountain: 'Arching outward in every direction like a green fountain.',
      leaning: 'The whole clump leans out one way, as if over a river, tips trailing low.',
      upright: 'Straight and close, a small grove of poles.',
      windblown: 'Bent hard over in one direction by wind, every tip streaming.',
    }),
    size: score('How big is the clump?', ['Five or six stems', 'A dozen', 'A great old clump of thirty']),
    culm: choice('What colour are the culms?', {
      green: 'Fresh green with pale rings at each joint.',
      powder: 'Young blue-green, dusted white below each joint.',
      golden: 'Old golden yellow, striped faintly green.',
      ink: 'Near black, like brush strokes of ink.',
    }),
    foliage: score('How much leaf does it carry?', ['Nearly bare, a few wisps', 'Light and feathery', 'Heavy drooping plumes']),
    foot: choice('What is at the foot of the clump?', {
      litter: 'A carpet of dry tan leaf litter.',
      shoots: 'Fat brown new shoots pushing up through the litter.',
      stumps: 'The cut stumps of harvested culms, hollow and pale.',
      rocks: 'A couple of mossy stones.',
    }),
    now: choice('What has happened to it lately?', {
      nothing: 'Nothing. It just sways.',
      lantern: 'Someone has hung a paper lantern from a low branch.',
      washing: 'A pole of washing is slung between two culms.',
      snow: 'It is weighed down with snow, tips bowed.',
      felled: 'One culm has been freshly cut and leans caught among the others.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = Math.round(mix(5, 24, a.size) * mix(0.8, 1.15, mood.density));
    const tones = { green: ['#6f9a3c', '#d7dcb0'], powder: ['#6f9f86', '#eef2ea'], golden: ['#cdae3e', '#7d8a35'], ink: ['#2a302c', '#59605a'] }[a.culm];
    const stem = new THREE.Color(tones[0]).lerp(new THREE.Color('#9a905e'), mood.wear * 0.35);
    const ringTone = new THREE.Color(tones[1]);
    const leafTone = new THREE.Color(a.culm === 'ink' ? '#3d4a40' : '#5d9a35').lerp(new THREE.Color('#a8a04a'), mood.wear * 0.45);
    const snow = a.now === 'snow';
    const culmMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, side: THREE.DoubleSide, flatShading: true });

    // One spray: a twig with narrow drooping leaves.
    const spray = new THREE.BufferGeometry();
    {
      const v: number[] = [];
      for (let k = 0; k < 6; k++) {
        const along = 0.15 + k * 0.17, side = k % 2 ? 1 : -1, len = 0.75 - k * 0.04, wd = 0.085;
        const bx = side * 0.02, by = -along * 0.25, bz = along;
        const tx = bx + side * len * 0.75, ty = by - len * 0.45, tz = bz + len * 0.5;
        const mx = (bx + tx) / 2, my = (by + ty) / 2 + 0.04, mz = (bz + tz) / 2;
        v.push(bx, by, bz, mx - wd * side * 0.3, my, mz + wd, tx, ty, tz, bx, by, bz, tx, ty, tz, mx + wd * side * 0.3, my, mz - wd);
      }
      spray.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      spray.computeVertexNormals();
    }

    const lean = { fountain: 0.3, leaning: 0.5, upright: 0.07, windblown: 0.6 }[a.habit] * (snow ? 1.3 : 1);
    const bias = a.habit === 'leaning' || a.habit === 'windblown' ? 1 : 0;
    const groups: { g: THREE.Group; ph: number }[] = [];
    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
    const culms: { base: P3; path: THREE.CatmullRomCurve3; H: number }[] = [];
    const clumpR = mix(0.7, 2.1, a.size);

    for (let c = 0; c < count; c++) {
      const th = random() * 6.28, d = Math.sqrt(random()) * clumpR;
      const base: P3 = [Math.sin(th) * d, 0, Math.cos(th) * d];
      const H = mix(9, 17, random()) * (c === 0 ? 1.1 : 1);
      // Outward direction: away from the centre, or all one way.
      const dirA = bias ? (a.habit === 'windblown' ? 0.2 : 0) + (random() - 0.5) * (a.habit === 'windblown' ? 0.35 : 0.9) + Math.PI / 2 : th + (random() - 0.5) * 0.8;
      const reach = H * lean * mix(0.6, 1.2, random());
      const droop = (a.habit === 'upright' ? 0.03 : 0.16) * (snow ? 2 : 1);
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 7; k++) {
        const t = k / 7, out = reach * Math.pow(t, 2.3);
        pts.push(new THREE.Vector3(base[0] + Math.sin(dirA) * out, H * t * (1 - droop * Math.pow(t, 3)), base[2] + Math.cos(dirA) * out));
      }
      const path = new THREE.CatmullRomCurve3(pts);
      culms.push({ base, path, H });
      const SEG = 33, RAD = 6;
      const r0 = mix(0.085, 0.125, random()) * (H / 13);
      const geometry = new THREE.TubeGeometry(path, SEG, 1, RAD, false);
      const p = geometry.attributes.position;
      const colours: number[] = [];
      const centre = new THREE.Vector3(), v = new THREE.Vector3(), col = new THREE.Color();
      const jointEvery = 3;
      const shade = stem.clone().offsetHSL((random() - 0.5) * 0.04, 0, (random() - 0.5) * 0.1);
      for (let i = 0; i <= SEG; i++) {
        path.getPointAt(i / SEG, centre);
        const joint = i % jointEvery === 0;
        const rr = mix(r0, r0 * 0.15, Math.pow(i / SEG, 1.3)) * (joint ? 1.22 : 1);
        col.copy(shade);
        if (joint) col.lerp(ringTone, 0.85);
        else if (a.culm === 'powder' && i % jointEvery === jointEvery - 1) col.lerp(ringTone, 0.4);
        for (let j = 0; j <= RAD; j++) {
          const k = i * (RAD + 1) + j;
          v.fromBufferAttribute(p, k).sub(centre).multiplyScalar(rr).add(centre);
          p.setXYZ(k, v.x, v.y, v.z);
          colours.push(col.r, col.g, col.b);
        }
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
      geometry.computeVertexNormals();
      const g = new THREE.Group();
      g.position.set(...base);
      geometry.translate(-base[0], 0, -base[2]);
      const mesh = new THREE.Mesh(geometry, culmMat);
      mesh.castShadow = mesh.receiveShadow = true;
      g.add(mesh);

      const sprays = Math.round(mix(7, 44, a.foliage) * mix(0.75, 1.25, random()));
      const leaves = new THREE.InstancedMesh(spray, leafMat, sprays);
      const tint = new THREE.Color();
      for (let k = 0; k < sprays; k++) {
        const t = mix(0.56, 1, Math.pow(random(), 0.7));
        path.getPointAt(t, pos);
        const yaw = random() * 6.28, out = mix(0.15, 1.5, random()) * (1.2 - t * 0.8);
        pos.x += Math.sin(yaw) * out - base[0]; pos.z += Math.cos(yaw) * out - base[2]; pos.y += (random() - 0.6) * 0.5 - out * 0.15;
        e.set(mix(0.1, 0.9, random()) + (snow ? 0.4 : 0), yaw, (random() - 0.5) * 0.6, 'YXZ');
        q.setFromEuler(e);
        sc.setScalar(mix(0.75, 1.25, random()) * mix(0.9, 1.2, a.foliage));
        leaves.setMatrixAt(k, matrix.compose(pos, q, sc));
        tint.copy(leafTone).offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.16);
        if (snow && random() < 0.55) tint.set('#f4f7f8');
        leaves.setColorAt(k, tint);
      }
      leaves.instanceMatrix.needsUpdate = true;
      if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
      leaves.castShadow = true;
      g.add(leaves);
      s.root.add(g);
      groups.push({ g, ph: random() * 6.28 });
    }

    // Foot.
    const litter = s.cylinder(clumpR * 1.5, clumpR * 1.7, 0.12, [0, 0.06, 0], new THREE.MeshStandardMaterial({ color: snow ? '#eef1f2' : new THREE.Color('#b99a62').lerp(new THREE.Color('#7a6a4a'), mood.wear * 0.5), roughness: 1 }), 24);
    void litter;
    const flakes: { at: P3; size: number; color: THREE.Color }[] = [];
    for (let k = 0; k < 60; k++) { const th = random() * 6.28, d = Math.sqrt(random()) * clumpR * 1.6; flakes.push({ at: [Math.sin(th) * d, 0.13, Math.cos(th) * d], size: mix(0.08, 0.2, random()), color: new THREE.Color(snow ? '#ffffff' : '#d8c08a').offsetHSL(0, 0, (random() - 0.5) * 0.2) }); }
    s.scatter(new THREE.BoxGeometry(1, 0.08, 0.35), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), flakes);
    const spot = (minD: number, maxD: number): P3 => { const th = random() * 6.28, d = clumpR * mix(minD, maxD, random()); return [Math.sin(th) * d, 0.1, Math.cos(th) * d]; };
    if (a.foot === 'shoots') {
      const husk = s.material('#5a3d28'), tip = s.material('#a9c05a');
      for (let k = 0; k < 4 + Math.round(mood.density * 5); k++) {
        const p = spot(0.9, 1.5), hgt = mix(0.4, 1.5, random());
        s.mesh(new THREE.ConeGeometry(hgt * 0.16, hgt, 8), husk, [p[0], p[1] + hgt / 2, p[2]]);
        s.mesh(new THREE.ConeGeometry(hgt * 0.06, hgt * 0.25, 6), tip, [p[0], p[1] + hgt * 0.98, p[2]]);
      }
    } else if (a.foot === 'stumps') {
      const cut = new THREE.MeshStandardMaterial({ color: '#d9cf9a', roughness: 0.8, side: THREE.DoubleSide });
      for (let k = 0; k < 4 + Math.round(mood.wear * 6); k++) {
        const p = spot(0.8, 1.5), hgt = mix(0.15, 0.6, random());
        s.mesh(new THREE.CylinderGeometry(0.08, 0.085, hgt, 10, 1, true), cut, [p[0], p[1] + hgt / 2, p[2]]);
        s.cylinder(0.065, 0.065, 0.01, [p[0], p[1] + hgt * 0.7, p[2]], s.material('#3a3324'), 8);
      }
    } else if (a.foot === 'rocks') {
      const stone = new THREE.MeshStandardMaterial({ color: '#8b9184', roughness: 1, flatShading: true });
      const moss = new THREE.MeshStandardMaterial({ color: '#5e8040', roughness: 1, flatShading: true });
      for (let k = 0; k < 3; k++) {
        const p = spot(1.1, 1.6), r = mix(0.35, 0.8, random());
        s.mesh(new THREE.DodecahedronGeometry(r, 0), stone, [p[0], r * 0.5, p[2]]).rotation.set(random(), random(), random());
        s.mesh(new THREE.DodecahedronGeometry(r * 0.75, 0), moss, [p[0], r * 0.85, p[2]]).scale.y = 0.45;
      }
    }

    // Story.
    let lamp: THREE.Object3D | null = null;
    if (a.now === 'lantern') {
      const c = culms[Math.min(culms.length - 1, 1)];
      const p = c.path.getPointAt(0.2);
      const out = p.clone().setY(0).normalize().multiplyScalar(0.7);
      if (out.lengthSq() < 0.01) out.set(0.7, 0, 0);
      s.rod([p.x, p.y, p.z], [p.x + out.x, p.y + 0.15, p.z + out.z], 0.015, s.material('#5a4630'));
      const g = new THREE.Group(); g.position.set(p.x + out.x, p.y + 0.15, p.z + out.z); s.root.add(g); lamp = g;
      const add = (m: THREE.Mesh) => { m.removeFromParent(); g.add(m); };
      const glow = mix(0.8, 2.6, Math.abs(mood.daylight - 0.5) * 2);
      add(s.rod([0, 0, 0], [0, -0.25, 0], 0.006, s.material('#222222')));
      add(s.ball([0.2, 0.24, 0.2], [0, -0.5, 0], new THREE.MeshStandardMaterial({ color: mood.cheer > 0.4 ? '#f0522a' : '#e9e2c9', emissive: mood.cheer > 0.4 ? '#ff7a2a' : '#ffe2a0', emissiveIntensity: glow, roughness: 0.8 }), 14));
      for (const y of [-0.27, -0.73]) add(s.cylinder(0.09, 0.09, 0.03, [0, y, 0], s.material('#1c1c1c'), 10));
    } else if (a.now === 'washing' && culms.length > 1) {
      const p1 = culms[0].path.getPointAt(0.13), p2 = culms[1].path.getPointAt(0.13);
      const dir = p2.clone().sub(p1); dir.y = 0;
      if (dir.length() < 2) dir.set(1, 0, 0.2); dir.setLength(Math.max(2.4, dir.length()));
      const A = p1.clone().addScaledVector(dir, -0.25), B = p1.clone().addScaledVector(dir, 1.1);
      s.rod([A.x, A.y, A.z], [B.x, B.y, B.z], 0.022, s.material('#c2b068'));
      const cols = ['#e8e6dc', '#3c5c8c', '#b9442e', '#e8e6dc', '#4f7a5a', '#d9b93e'];
      const n = 3 + Math.floor(random() * 3);
      for (let k = 0; k < n; k++) {
        const at = A.clone().lerp(B, (k + 0.7) / (n + 0.6));
        const hgt = mix(0.6, 1.1, random());
        const cloth = s.box([0.5, hgt, 0.03], [at.x, at.y - hgt / 2 - 0.02, at.z], s.material(cols[Math.floor(random() * cols.length)], { side: THREE.DoubleSide }));
        cloth.rotation.y = Math.atan2(-dir.z, dir.x);
      }
    } else if (a.now === 'felled') {
      const from = spot(0.9, 1.2);
      const to: P3 = [-from[0] * 1.5 + 1, mix(6, 8, random()), -from[2] * 1.5];
      s.rod([from[0], 0.5, from[2]], to, 0.075, new THREE.MeshStandardMaterial({ color: stem.clone().lerp(new THREE.Color('#d6cf9a'), 0.3), roughness: 0.5 }), 0.045);
      s.mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.35, 10, 1, true), new THREE.MeshStandardMaterial({ color: '#e3dba6', side: THREE.DoubleSide }), [from[0], 0.27, from[2]]);
      s.cylinder(0.075, 0.075, 0.01, [from[0], 0.45, from[2]], s.material('#efe8b8'), 10);
    }

    const amp = mix(0.004, 0.05, mood.energy) * (a.habit === 'windblown' ? 1.6 : 1), speed = mix(0.3, 2.2, mood.energy);
    return s.finish({
      footprint: clumpR * 1.7,
      update: (_dt, time) => {
        for (const { g, ph } of groups) { g.rotation.z = Math.sin(time * speed + ph) * amp; g.rotation.x = Math.sin(time * speed * 0.7 + ph * 1.7) * amp * 0.6; }
        if (lamp) lamp.rotation.z = Math.sin(time * speed) * amp * 4;
      },
    });
  },
});
