import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, paint, paintHex, score } from '@conjure/kit';

type P3 = [number, number, number];
const UP = new THREE.Vector3(0, 1, 0);

/** Rounded end caps for a tube's radius along its length. */
const capped = (v: number) => Math.sqrt(Math.max(0, 1 - Math.pow(2 * v - 1, 8)));

export default defineThing({
  questions: {
    pose: choice('What is the cat doing?', {
      arched: 'Back arched high in a hissing hump, legs stiff, fur on end and tail bottle-brushed straight up: the Halloween silhouette.',
      sitting: 'Sitting bolt upright facing you, tail wrapped round its paws, watchful and unblinking.',
      asleep: 'Curled asleep in a tight black ring, nose tucked into its tail.',
      stalking: 'Low and stalking, shoulders bunched, tail stretched out behind with a flicking tip.',
    }),
    eyes: paint('What colour are its eyes?', ['amber', 'green', 'yellow', 'sky', 'lime', 'orange']),
    perch: choice('What is it standing or lying on?', {
      floor: 'Straight on the floor or the ground.',
      stool: 'A three-legged wooden milking stool.',
      pumpkin: 'On top of a fat orange pumpkin.',
      books: 'A stack of old leather-bound books.',
    }),
    wearing: choice('Is it wearing anything?', {
      none: 'Nothing: just the cat.',
      bell: 'A red collar with a little brass bell.',
      hat: 'A tiny pointed witch hat perched between its ears.',
      bow: 'An orange ribbon bow tied at its neck.',
    }),
    coat: choice('What is its coat like?', {
      jet: 'Jet black from nose to tail, not a single white hair.',
      tuxedo: 'Black with a white bib and white socks.',
      smoke: 'Smoky charcoal black, a little silvered.',
    }),
    size: score('How big is the cat?', ['A small kitten', 'A slim young cat', 'A grown house cat', 'A huge battle-scarred tom']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const k = mix(0.6, 1.3, a.size);
    const furHex = { jet: '#121114', tuxedo: '#141317', smoke: '#34343a' }[a.coat];
    const fur = s.material(furHex, { roughness: 0.55, side: THREE.DoubleSide });
    const white = s.material('#efece4', { roughness: 0.7 });
    const pawMat = a.coat === 'tuxedo' ? white : fur;
    const eyeHex = paintHex(a.eyes);
    const glow = mix(0.15, 2.4, 0.5 * mood.energy + 0.5 * mood.daylight);
    const eyeMat = s.material(eyeHex, { emissive: eyeHex, emissiveIntensity: glow, roughness: 0.2 });
    const dark = s.material('#050505', { roughness: 0.4 });
    const pink = s.material('#a5465a', { roughness: 0.6 });

    const cat = new THREE.Group();
    const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; cat.add(mesh); return mesh; };
    const surfaceMesh = (shape: (u: number, v: number, t: THREE.Vector3) => void, mat: THREE.Material, segments: [number, number]) => {
      const mesh = s.surface(shape, mat, { segments, wrap: true });
      s.root.remove(mesh);
      return add(mesh);
    };
    const tube = (pts: P3[], radius: (v: number) => number, side: THREE.Vector3, mat: THREE.Material, squash = 1, segments: [number, number] = [14, 28]) => {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), P = new THREE.Vector3();
      surfaceMesh((u, v, target) => {
        curve.getPoint(v, P); curve.getTangent(v, T);
        N.crossVectors(T, side).normalize();
        B.crossVectors(N, T).normalize();
        const r = radius(v), t = u * Math.PI * 2;
        target.copy(P).addScaledVector(N, Math.cos(t) * r * squash).addScaledVector(B, Math.sin(t) * r);
      }, mat, segments);
      return curve;
    };
    const ball = (r: P3, at: P3, mat: THREE.Material) => {
      const m = add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat));
      m.scale.set(...r); m.position.set(...at);
      return m;
    };
    // Fur standing on end: little cones along a curve, pointing outward.
    const spikes: { at: THREE.Vector3; dir: THREE.Vector3; len: number }[] = [];
    const bristle = (curve: THREE.CatmullRomCurve3, radius: (v: number) => number, side: THREE.Vector3, count: number, from: number, to: number, spread: number, len: number) => {
      const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), P = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        const v = mix(from, to, random());
        curve.getPoint(v, P); curve.getTangent(v, T);
        N.crossVectors(T, side).normalize(); B.crossVectors(N, T).normalize();
        const t = Math.PI / 2 + (random() - 0.5) * spread;
        const dir = N.clone().multiplyScalar(Math.cos(t)).addScaledVector(B, Math.sin(t)).normalize();
        spikes.push({ at: P.clone().addScaledVector(dir, radius(v) * 0.7), dir: dir.addScaledVector(T, 0.25 * (random() - 0.3)).normalize(), len: len * mix(0.6, 1.2, random()) });
      }
    };

    // The head is built facing +z and turned as the pose needs.
    const hiss = a.pose === 'arched';
    const asleep = a.pose === 'asleep';
    const head = (at: P3, yaw: number, pitch: number) => {
      const hr = 0.062;
      const g = new THREE.Group();
      const part = (geo: THREE.BufferGeometry, mat: THREE.Material, pos: P3, scale: P3 = [1, 1, 1]) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(...pos); m.scale.set(...scale); m.castShadow = true; g.add(m);
        return m;
      };
      part(new THREE.SphereGeometry(hr, 18, 14), fur, [0, 0, 0], [1.08, 0.92, 0.95]);
      part(new THREE.SphereGeometry(hr * 0.5, 14, 10), a.coat === 'tuxedo' ? white : fur, [0, -hr * 0.35, hr * 0.72], [1.15, 0.72, 0.8]);
      part(new THREE.SphereGeometry(hr * 0.12, 8, 6), pink, [0, -hr * 0.18, hr * 1.1], [1.2, 0.8, 0.8]);
      for (const side of [-1, 1]) {
        const ear = part(new THREE.ConeGeometry(hr * 0.42, hr * 0.85, 4), fur, [side * hr * 0.55, hr * 0.78, -hr * 0.05], [1, 1, 0.55]);
        ear.rotation.set(hiss ? -0.5 : 0, Math.PI / 4, side * (hiss ? -1.05 : -0.32));
        const inner = part(new THREE.ConeGeometry(hr * 0.25, hr * 0.55, 4), pink, [side * hr * 0.55, hr * 0.74, hr * 0.03], [1, 1, 0.3]);
        inner.rotation.copy(ear.rotation);
        if (hiss) inner.visible = false;
        if (asleep) {
          part(new THREE.BoxGeometry(hr * 0.42, hr * 0.06, hr * 0.06), dark, [side * hr * 0.4, hr * 0.05, hr * 0.86]).rotation.z = side * 0.2;
        } else {
          const eye = part(new THREE.SphereGeometry(hr * 0.24, 14, 10), eyeMat, [side * hr * 0.4, hr * 0.08, hr * 0.78], [1.15, hiss ? 0.62 : 0.85, 0.5]);
          eye.rotation.z = side * (hiss ? 0.35 : 0.12);
          part(new THREE.BoxGeometry(hr * 0.06, hr * (hiss ? 0.22 : 0.34), hr * 0.05), dark, [side * hr * 0.42, hr * 0.08, hr * 0.9]);
        }
        for (let w = 0; w < 3; w++) {
          const whisker = part(new THREE.CylinderGeometry(0.0012, 0.0012, hr * 1.5, 4), s.material('#d8d4c8'), [side * hr * 0.95, -hr * (0.28 + w * 0.08), hr * 0.85]);
          whisker.rotation.z = side * (Math.PI / 2 + (w - 1) * 0.15);
        }
      }
      if (hiss) {
        part(new THREE.SphereGeometry(hr * 0.26, 12, 8), s.material('#5a1420'), [0, -hr * 0.5, hr * 0.9], [1.2, 0.8, 0.5]);
        for (const side of [-1, 1]) part(new THREE.ConeGeometry(hr * 0.05, hr * 0.2, 6), white, [side * hr * 0.13, -hr * 0.42, hr * 1.02]).rotation.x = Math.PI;
      }
      if (a.wearing === 'hat') {
        const felt = s.material('#2a1838', { roughness: 0.8 });
        part(new THREE.CylinderGeometry(hr * 0.95, hr * 0.95, hr * 0.06, 20), felt, [0, hr * 0.92, 0]);
        part(new THREE.CylinderGeometry(hr * 0.5, hr * 0.5, hr * 0.12, 16), s.material('#d8661a'), [0, hr * 0.99, 0]);
        part(new THREE.ConeGeometry(hr * 0.48, hr * 1.4, 16), felt, [0, hr * 1.6, -hr * 0.05]).rotation.x = -0.2;
      }
      g.position.set(...at);
      g.rotation.set(pitch, yaw, 0, 'YXZ');
      cat.add(g);
      return g;
    };

    let neck: { at: P3; axis: P3 } = { at: [0, 0, 0], axis: [0, 1, 0] };
    let chest: P3 = [0, 0, 0];
    const leg = (pts: P3[], r: number) => {
      tube(pts, (v) => mix(r, r * 0.75, v) * Math.sqrt(Math.max(0, 1 - Math.pow(v, 10))) * (v < 0.02 ? 0.5 : 1), new THREE.Vector3(0, 0, 1), fur, 1, [10, 14]);
      const foot = pts[pts.length - 1];
      ball([r * 1.15, r * 0.75, r * 1.3], [foot[0], r * 0.7, foot[2] + r * 0.3], pawMat);
    };

    if (a.pose === 'arched') {
      const side = new THREE.Vector3(0, 0, 1);
      const body = (v: number) => (0.07 + 0.012 * Math.sin(v * Math.PI)) * capped(v);
      const spine = tube([[-0.19, 0.2, 0], [-0.15, 0.33, 0], [-0.05, 0.415, 0], [0.06, 0.4, 0], [0.15, 0.31, 0], [0.18, 0.22, 0]], body, side, fur, 1, [14, 36]);
      bristle(spine, body, side, 46, 0.1, 0.95, 2.2, 0.03);
      for (const z of [-0.032, 0.032]) {
        leg([[-0.17, 0.22, z], [-0.15, 0.11, z * 1.1], [-0.12, 0.015, z * 1.2]], 0.023);
        leg([[0.16, 0.22, z], [0.14, 0.11, z * 1.1], [0.115, 0.015, z * 1.2]], 0.021);
      }
      tube([[0.15, 0.28, 0], [0.2, 0.29, 0.01], [0.235, 0.29, 0.02]], (v) => 0.045 * capped(v * 0.5 + 0.5), side, fur, 1, [10, 8]);
      head([0.25, 0.3, 0.03], 0.55, 0.05);
      const tail = (v: number) => mix(0.034, 0.02, v) * capped(v * 0.5 + 0.5);
      const tc = tube([[-0.18, 0.24, 0], [-0.235, 0.3, 0], [-0.255, 0.44, 0], [-0.25, 0.58, 0], [-0.22, 0.65, 0]], tail, side, fur, 1, [12, 24]);
      bristle(tc, tail, side, 60, 0.05, 0.98, Math.PI * 2, 0.035);
      neck = { at: [0.21, 0.29, 0.01], axis: [1, 0.1, 0.1] };
      chest = [0.19, 0.24, 0.02];
    } else if (a.pose === 'sitting') {
      const side = new THREE.Vector3(1, 0, 0);
      ball([0.105, 0.1, 0.12], [0, 0.095, -0.03], fur);
      for (const x of [-1, 1]) ball([0.05, 0.075, 0.1], [x * 0.075, 0.07, -0.01], fur);
      const body = (v: number) => mix(0.085, 0.052, v) * capped(v * 0.5 + 0.5);
      tube([[0, 0.08, -0.02], [0, 0.17, 0.01], [0, 0.25, 0.04], [0, 0.29, 0.05]], body, side, fur);
      for (const x of [-0.032, 0.032]) leg([[x, 0.2, 0.05], [x, 0.1, 0.075], [x, 0.012, 0.085]], 0.018);
      head([0, 0.335, 0.055], 0, 0.05);
      tube([[-0.06, 0.03, -0.12], [0.07, 0.025, -0.1], [0.13, 0.022, 0.02], [0.08, 0.022, 0.12], [-0.03, 0.025, 0.13]], (v) => mix(0.024, 0.016, v) * capped(v * 0.5 + 0.5), new THREE.Vector3(0, 1, 0), fur);
      neck = { at: [0, 0.29, 0.05], axis: [0, 1, 0.2] };
      chest = [0, 0.22, 0.075];
    } else if (a.pose === 'asleep') {
      const side = new THREE.Vector3(0, 1, 0);
      const body = (v: number) => mix(0.06, 0.078, Math.sin(v * Math.PI)) * capped(v);
      tube([[0.07, 0.075, 0.09], [0.13, 0.075, -0.01], [0.07, 0.075, -0.11], [-0.05, 0.075, -0.12], [-0.13, 0.075, -0.03], [-0.1, 0.07, 0.07]], body, side, fur, 0.78, [14, 36]);
      head([0.035, 0.075, 0.13], -0.3, 0.35);
      tube([[-0.11, 0.04, 0.06], [-0.07, 0.03, 0.17], [0.04, 0.028, 0.21], [0.13, 0.028, 0.15], [0.17, 0.03, 0.05]], (v) => mix(0.026, 0.017, v) * capped(v * 0.5 + 0.5), side, fur);
      ball([0.022, 0.016, 0.03], [0.09, 0.016, 0.16], pawMat);
      neck = { at: [0.05, 0.075, 0.1], axis: [-0.3, 0, 1] };
      chest = [0.1, 0.06, 0.1];
    } else {
      const side = new THREE.Vector3(0, 0, 1);
      const body = (v: number) => (0.06 + 0.008 * Math.sin(v * Math.PI * 2 + 1)) * capped(v);
      tube([[-0.21, 0.15, 0], [-0.08, 0.155, 0], [0.04, 0.16, 0], [0.13, 0.185, 0], [0.19, 0.16, 0]], body, side, fur);
      for (const z of [-0.035, 0.035]) {
        leg([[-0.16, 0.15, z], [-0.225, 0.075, z * 1.2], [-0.15, 0.012, z * 1.3]], 0.022);
        leg([[0.13, 0.17, z], [0.08, 0.08, z * 1.2], [0.16 + z, 0.012, z * 1.4]], 0.019);
      }
      head([0.235, 0.155, 0.02], 0.7, 0.25);
      const tail = (v: number) => mix(0.022, 0.014, v) * capped(v * 0.5 + 0.5);
      tube([[-0.2, 0.16, 0], [-0.31, 0.13, 0], [-0.41, 0.125, 0.01], [-0.47, 0.16, 0.02], [-0.47, 0.21, 0.02]], tail, side, fur);
      neck = { at: [0.2, 0.16, 0.01], axis: [1, -0.2, 0.2] };
      chest = [0.17, 0.12, 0];
    }

    if (spikes.length) {
      const cone = new THREE.ConeGeometry(0.008, 1, 5).translate(0, 0.5, 0);
      const inst = new THREE.InstancedMesh(cone, fur, spikes.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      spikes.forEach((sp, i) => {
        q.setFromUnitVectors(UP, sp.dir);
        m.compose(sp.at, q, new THREE.Vector3(1.4, sp.len, 1.4));
        inst.setMatrixAt(i, m);
      });
      inst.castShadow = true;
      cat.add(inst);
    }
    if (a.coat === 'tuxedo') ball(a.pose === 'asleep' ? [0.04, 0.03, 0.03] : [0.035, 0.05, 0.03], chest, white);

    // Collar, bell or bow at the neck.
    if (a.wearing === 'bell' || a.wearing === 'bow') {
      const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 8, 24), s.material(a.wearing === 'bell' ? '#b01e2a' : '#d8661a')));
      ring.position.set(...neck.at);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...neck.axis).normalize());
      const front: P3 = [neck.at[0], neck.at[1] - 0.04, neck.at[2] + 0.03];
      if (a.wearing === 'bell') ball([0.014, 0.014, 0.014], front, s.material('#d4a537', { metalness: 0.8, roughness: 0.3 }));
      else for (const side of [-1, 1]) {
        const loop = add(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.04, 8), s.material('#d8661a')));
        loop.position.set(front[0] + side * 0.02, front[1], front[2]);
        loop.rotation.z = side * Math.PI / 2;
      }
    }

    cat.scale.setScalar(k);

    // What it stands on.
    let top = 0;
    const wood = s.material('#6b4a2e', { roughness: 0.8 });
    if (a.perch === 'stool') {
      top = 0.42;
      s.cylinder(0.24, 0.24, 0.045, [0, top - 0.0225, 0], wood, 24);
      for (let i = 0; i < 3; i++) {
        const t = i * Math.PI * 2 / 3 + 0.3;
        s.rod([Math.sin(t) * 0.14, top - 0.04, Math.cos(t) * 0.14], [Math.sin(t) * 0.22, 0, Math.cos(t) * 0.22], 0.02, wood, 0.017);
      }
    } else if (a.perch === 'pumpkin') {
      const orange = s.material('#d8661a', { roughness: 0.55 });
      const lobes = 10, R = 0.3, H = 0.34;
      for (let i = 0; i < lobes; i++) {
        const t = i / lobes * Math.PI * 2;
        s.ball([0.12, H / 2, 0.15], [Math.sin(t) * R * 0.62, H / 2, Math.cos(t) * R * 0.62], orange, 16).rotation.y = t;
      }
      s.cylinder(R * 0.62, R * 0.62, 0.02, [0, H - 0.02, 0], orange, 20);
      s.rod([-0.05, H - 0.02, -0.17], [-0.03, H + 0.05, -0.2], 0.02, s.material('#4a5a2a'), 0.014);
      top = H - 0.01;
    } else if (a.perch === 'books') {
      const covers = ['#5a1f22', '#2a3a2a', '#3a2a4a', '#6a4a22'];
      const n = 3 + Math.floor(random() * 2);
      for (let i = 0; i < n; i++) {
        const h = mix(0.045, 0.07, random());
        const w = mix(0.42, 0.5, random()), d = mix(0.28, 0.33, random());
        const book = s.box([w, h, d], [(random() - 0.5) * 0.04, top + h / 2, (random() - 0.5) * 0.03], s.material(covers[i % covers.length], { roughness: 0.7 }));
        book.rotation.y = (random() - 0.5) * 0.25;
        s.box([w - 0.02, h * 0.8, 0.005], [book.position.x, top + h / 2, book.position.z + d / 2 + 0.001], s.material('#e6dcc2')).rotation.y = book.rotation.y;
        top += h;
      }
    }
    cat.position.y = top;
    s.root.add(cat);

    const tailBase = cat.children.length;
    void tailBase;
    const breathe = mix(0.3, 2.2, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        cat.scale.set(k, k * (1 + Math.sin(time * breathe) * 0.012), k);
      },
    });
  },
});
