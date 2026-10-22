import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { PAINT, lerpHex } from './maya';

const FINISH = {
  terracotta: { clay: '#b8683f', one: '#d9a070', two: '#8a4428' },
  blue: { clay: '#3f9fa8', one: '#efe6d2', two: '#b4392a' },
  polychrome: { clay: '#e3d3ae', one: '#b4392a', two: '#3b9ea8' },
  soot: { clay: '#5b554e', one: '#8c8478', two: '#3a3531' },
} as const;

export default defineThing({
  questions: {
    deity: choice('Whose face is it?', {
      sun: 'The jaguar sun god: square squinting eyes, a twisted cord looped over the nose, one T-shaped tooth.',
      rain: 'The rain god: round goggle eyes, a curled upper lip, fangs and a long upturned snout.',
      old: 'The old fire god: a wrinkled, sunken, toothless face that has seen everything.',
      death: 'A death god: a bare skull with black sockets and a full grin of teeth.',
      maize: 'The young maize god: a smooth serene face with a tall tapering forehead.',
    }),
    form: choice('What shape is the vessel?', {
      tube: 'A tall narrow cylinder stand with a separate bowl on top, the classic temple censer.',
      urn: 'A squat round-bellied urn with a vented conical lid.',
      hourglass: 'An hourglass brazier studded all over with clay spikes.',
    }),
    flanges: choice('What flanks the face?', {
      stepped: 'Flat stepped wings with rows of clay buttons, like a temple facade.',
      scrolls: 'Rounded scrolling lobes, clouds or smoke.',
      feathers: 'Fans of long clay feathers sticking out sideways.',
      none: 'Nothing: the face alone on a plain vessel.',
    }),
    crown: choice('What is on its head, if anything?', {
      bird: 'A perched bird with a hooked beak and spread wings.',
      plumes: 'A fan of upright plumes.',
      mask: 'A second, smaller mask stacked above the first.',
      band: 'Only a simple knotted headband.',
    }),
    finish: choice('How is the clay finished?', {
      terracotta: 'Bare orange terracotta.',
      blue: 'Painted Maya blue with cream details.',
      polychrome: 'Cream slip picked out in red and blue.',
      soot: 'Fire-blackened grey from years of use.',
    }),
    size: score('How big is it?', ['A hand-high household censer', 'Knee high', 'A waist-high temple piece']),
    burning: choice('What is it doing right now?', {
      thread: 'A single thin thread of smoke rises straight up and wavers.',
      billow: 'Thick white resin smoke pours out: the rite is at its height.',
      embers: 'The coals glow red but the smoke has almost stopped.',
      cold: 'It is cold: pale unburnt lumps of copal sit in the bowl, waiting for fire.',
    }),
    beside: choice('What has been left at its foot?', {
      nothing: 'Nothing.',
      resin: 'Lumps of amber copal resin on a green leaf.',
      maize: 'Ears of maize and a few cacao pods.',
      flowers: 'A scatter of marigold heads.',
      shards: 'Broken pieces of an older censer.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const tones = FINISH[a.finish];
    const clay = s.material(lerpHex(tones.clay, '#4a433d', Math.max(0, wear - 0.3) * 0.55), { roughness: 0.85 });
    const one = s.material(tones.one, { roughness: 0.85 });
    const two = s.material(tones.two, { roughness: 0.85 });
    const white = s.material('#efe6d2', { roughness: 0.7 });
    const dark = s.material('#241e1b', { roughness: 0.9 });
    const g = new THREE.Group();
    s.root.add(g);
    const put = <M extends THREE.Object3D>(node: M, parent: THREE.Object3D = g) => { parent.add(node); return node; };
    const solid = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number] = [0, 0, 0], parent: THREE.Object3D = g) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const lathe = (profile: number[][], material: THREE.Material, y = 0) => solid(new THREE.LatheGeometry(profile.map(([x, yy]) => new THREE.Vector2(x, yy)), 32), material, [0, y, 0]);
    const blob = (size: [number, number, number], at: [number, number, number], material: THREE.Material, parent: THREE.Object3D = g) => { const mesh = solid(new THREE.SphereGeometry(1, 16, 12), material, at, parent); mesh.scale.set(...size); return mesh; };
    const torus = (radius: number, tube: number, at: [number, number, number], material: THREE.Material, arc = Math.PI * 2, parent: THREE.Object3D = g) => solid(new THREE.TorusGeometry(radius, tube, 6, 24, arc), material, at, parent);

    // The vessel. `rimY` is where smoke leaves it, `faceY` and `faceZ` where the mask sits.
    let rimY: number, faceY: number, faceZ: number, bodyR: number, bowlR: number, flangeBottom: number, flangeTop: number;
    if (a.form === 'tube') {
      bodyR = 0.12;
      lathe([[0.15, 0], [0.15, 0.03], [0.125, 0.05], [0.12, 0.56], [0.14, 0.6], [0.14, 0.63], [0.1, 0.63], [0.1, 0.05], [0, 0.05]], clay);
      lathe([[0.07, 0], [0.19, 0.08], [0.2, 0.1], [0.18, 0.1], [0.07, 0.03], [0, 0.03]], one, 0.63);
      rimY = 0.72; faceY = 0.31; faceZ = 0.115; bowlR = 0.15; flangeBottom = 0.04; flangeTop = 0.6;
    } else if (a.form === 'urn') {
      bodyR = 0.2;
      lathe([[0.1, 0], [0.12, 0.02], [0.2, 0.12], [0.215, 0.22], [0.19, 0.32], [0.15, 0.37], [0.16, 0.39], [0.13, 0.39], [0.13, 0.03], [0, 0.03]], clay);
      const lid = lathe([[0.165, 0], [0.15, 0.04], [0.07, 0.16], [0.045, 0.18], [0.06, 0.21], [0.03, 0.23], [0, 0.23]], one, 0.39);
      if (wear > 0.7) { lid.rotation.z = 0.25; lid.position.x = 0.04; }
      for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2; solid(new THREE.SphereGeometry(0.018, 8, 6), dark, [Math.cos(t) * 0.105, 0.39 + 0.1, Math.sin(t) * 0.105]); }
      rimY = 0.6; faceY = 0.21; faceZ = 0.2; bowlR = 0.06; flangeBottom = 0.06; flangeTop = 0.38;
    } else {
      bodyR = 0.1;
      lathe([[0.17, 0], [0.165, 0.02], [0.085, 0.25], [0.085, 0.3], [0.2, 0.55], [0.19, 0.56], [0.07, 0.31], [0.07, 0.24], [0, 0.24]], clay);
      const spikes = new THREE.InstancedMesh(new THREE.ConeGeometry(0.014, 0.05, 5), one, 60);
      const dummy = new THREE.Object3D();
      let count = 0;
      for (let row = 0; row < 5; row++) for (let i = 0; i < 12; i++) {
        const y = row < 2 ? 0.06 + row * 0.09 : 0.36 + (row - 2) * 0.07, r = row < 2 ? 0.165 - (y / 0.25) * 0.08 : 0.085 + ((y - 0.3) / 0.25) * 0.115;
        const t = (i + (row % 2) * 0.5) / 12 * Math.PI * 2;
        if (row >= 2 && Math.abs(Math.sin(t)) < 0.6 && Math.cos(t) > 0) { const tt = t + Math.PI; dummy.position.set(Math.sin(tt) * r, y, Math.cos(tt) * r); dummy.rotation.set(0, tt, 0); }
        else { dummy.position.set(Math.sin(t) * r, y, Math.cos(t) * r); dummy.rotation.set(0, t, 0); }
        dummy.rotateX(Math.PI / 2 + (row < 2 ? 0.3 : -0.4)); dummy.translateY(0.02); dummy.updateMatrix();
        spikes.setMatrixAt(count++, dummy.matrix);
      }
      spikes.castShadow = true; put(spikes);
      rimY = 0.55; faceY = 0.4; faceZ = 0.118; bowlR = 0.15; flangeBottom = 0.3; flangeTop = 0.56;
    }

    // The mask.
    const mask = (deity: typeof a.deity, parent: THREE.Object3D) => {
      const m = put(new THREE.Group(), parent);
      const skin = deity === 'death' ? white : clay;
      blob([0.112, deity === 'maize' ? 0.12 : 0.128, 0.07], [0, 0, 0], skin, m);
      for (const side of [-1, 1]) {
        const flare = solid(new THREE.CylinderGeometry(0.036, 0.036, 0.022, 14), one, [side * 0.128, -0.01, 0.012], m); flare.rotation.x = Math.PI / 2;
        solid(new THREE.SphereGeometry(0.014, 8, 6), two, [side * 0.128, -0.01, 0.03], m);
        solid(new THREE.BoxGeometry(0.03, 0.06, 0.012), one, [side * 0.128, -0.075, 0.012], m);
      }
      if (deity === 'sun') {
        for (const side of [-1, 1]) {
          solid(new THREE.BoxGeometry(0.05, 0.042, 0.02), white, [side * 0.048, 0.03, 0.058], m);
          solid(new THREE.BoxGeometry(0.018, 0.018, 0.012), dark, [side * 0.034, 0.022, 0.07], m);
          torus(0.034, 0.008, [side * 0.048, 0.02, 0.064], two, Math.PI, m).rotation.z = Math.PI;
        }
        const cord = torus(0.022, 0.008, [0, 0.062, 0.07], two, Math.PI * 1.5, m); cord.rotation.z = -Math.PI * 0.25;
        solid(new THREE.BoxGeometry(0.036, 0.05, 0.04), skin, [0, -0.012, 0.075], m);
        solid(new THREE.BoxGeometry(0.085, 0.03, 0.012), dark, [0, -0.066, 0.058], m);
        solid(new THREE.BoxGeometry(0.036, 0.012, 0.012), white, [0, -0.057, 0.066], m);
        solid(new THREE.BoxGeometry(0.013, 0.03, 0.012), white, [0, -0.07, 0.066], m);
      } else if (deity === 'rain') {
        for (const side of [-1, 1]) {
          torus(0.03, 0.01, [side * 0.05, 0.032, 0.06], one, Math.PI * 2, m);
          solid(new THREE.SphereGeometry(0.014, 8, 6), dark, [side * 0.05, 0.032, 0.062], m);
          solid(new THREE.ConeGeometry(0.011, 0.045, 5), white, [side * 0.035, -0.082, 0.062], m).rotation.x = Math.PI;
        }
        solid(new THREE.ConeGeometry(0.011, 0.04, 5), white, [0, -0.08, 0.064], m).rotation.x = Math.PI;
        const lip = torus(0.05, 0.012, [0, -0.062, 0.058], one, Math.PI, m); lip.scale.y = 0.55;
        for (const side of [-1, 1]) torus(0.014, 0.008, [side * 0.062, -0.056, 0.06], one, Math.PI * 1.6, m).rotation.z = side > 0 ? -1 : 2.6;
        const snout = new THREE.CatmullRomCurve3([[0, 0.02, 0.06], [0, -0.012, 0.11], [0, 0.0, 0.15], [0, 0.04, 0.16], [0, 0.055, 0.14]].map((p) => new THREE.Vector3(...p)));
        solid(new THREE.TubeGeometry(snout, 16, 0.016, 8), skin, [0, 0, 0], m);
      } else if (deity === 'old') {
        for (const side of [-1, 1]) {
          solid(new THREE.BoxGeometry(0.042, 0.007, 0.012), dark, [side * 0.048, 0.022, 0.062], m).rotation.z = side * -0.2;
          blob([0.03, 0.014, 0.014], [side * 0.048, 0.042, 0.058], skin, m);
          for (let i = 0; i < 2; i++) { const fold = torus(0.03 + i * 0.012, 0.005, [side * 0.062, -0.035, 0.05], two, 1.6, m); fold.rotation.z = side > 0 ? -1.2 : 2.7; }
        }
        for (let i = 0; i < 3; i++) { const line = torus(0.085, 0.005, [0, 0.01 + i * 0.016, 0.0], two, 1.1, m); line.rotation.set(Math.PI / 2 - 0.9, 0, 0); line.rotation.z = 0; line.position.set(0, 0.062 + i * 0.016, 0.0); line.rotation.y = 0; line.rotation.set(-0.35, 0, Math.PI / 2 - 0.55); line.scale.set(0.8, 0.8, 0.9); line.position.z = -0.02 + 0.0; }
        blob([0.022, 0.028, 0.024], [0, -0.008, 0.074], skin, m);
        blob([0.04, 0.016, 0.012], [0, -0.066, 0.058], dark, m);
        solid(new THREE.BoxGeometry(0.012, 0.016, 0.01), white, [0.012, -0.06, 0.066], m);
        blob([0.03, 0.024, 0.024], [0, -0.108, 0.05], skin, m);
      } else if (deity === 'death') {
        for (const side of [-1, 1]) blob([0.03, 0.033, 0.016], [side * 0.045, 0.03, 0.058], dark, m);
        solid(new THREE.ConeGeometry(0.016, 0.034, 3), dark, [0, -0.018, 0.068], m);
        solid(new THREE.BoxGeometry(0.105, 0.04, 0.012), dark, [0, -0.07, 0.055], m);
        for (let i = -3; i <= 3; i++) solid(new THREE.BoxGeometry(0.011, 0.034, 0.012), white, [i * 0.0145, -0.07, 0.06], m);
        solid(new THREE.BoxGeometry(0.1, 0.028, 0.05), skin, [0, -0.108, 0.03], m);
      } else {
        blob([0.085, 0.11, 0.06], [0, 0.11, -0.01], skin, m);
        for (const side of [-1, 1]) {
          blob([0.028, 0.013, 0.012], [side * 0.045, 0.022, 0.062], white, m).rotation.z = side * 0.25;
          solid(new THREE.SphereGeometry(0.009, 8, 6), dark, [side * 0.045, 0.022, 0.071], m);
        }
        solid(new THREE.ConeGeometry(0.017, 0.06, 5), skin, [0, -0.012, 0.074], m).rotation.x = -0.35;
        blob([0.026, 0.009, 0.01], [0, -0.062, 0.064], two, m);
        solid(new THREE.SphereGeometry(0.012, 8, 6), one, [0, 0.085, 0.052], m);
      }
      return m;
    };
    const face = mask(a.deity, g);
    const faceScale = a.form === 'urn' ? 1.15 : a.form === 'tube' ? 1.2 : 0.82;
    face.position.set(0, faceY, faceZ); face.scale.setScalar(faceScale);

    // Crown, between the brow and the rim.
    const crownY = faceY + (a.deity === 'maize' ? 0.2 : 0.14) * faceScale;
    const crownZ = a.form === 'urn' ? faceZ - 0.06 : faceZ;
    if (a.crown === 'bird') {
      blob([0.045, 0.05, 0.05], [0, crownY + 0.05, crownZ + 0.015], one);
      blob([0.03, 0.03, 0.032], [0, crownY + 0.1, crownZ + 0.045], one);
      solid(new THREE.ConeGeometry(0.014, 0.05, 6), two, [0, crownY + 0.092, crownZ + 0.085]).rotation.x = 2.1;
      for (const side of [-1, 1]) {
        solid(new THREE.SphereGeometry(0.007, 6, 5), dark, [side * 0.02, crownY + 0.108, crownZ + 0.065]);
        for (let i = 0; i < 3; i++) { const wing = blob([0.06, 0.016, 0.008], [side * (0.07 + i * 0.012), crownY + 0.04 + i * 0.026, crownZ], i % 2 ? two : one); wing.rotation.z = side * (0.3 + i * 0.3); }
      }
    } else if (a.crown === 'plumes') {
      for (let i = 0; i < 7; i++) { const t = (i - 3) * 0.3; const feather = blob([0.02, 0.085, 0.008], [Math.sin(t) * 0.1, crownY + Math.cos(t) * 0.09, crownZ + 0.005], i % 2 ? two : one); feather.rotation.z = -t; }
      torus(0.05, 0.012, [0, crownY - 0.005, crownZ + 0.01], one, Math.PI);
    } else if (a.crown === 'mask') {
      const upper = mask(a.deity === 'death' ? 'sun' : 'death', g);
      upper.position.set(0, crownY + 0.055, crownZ - 0.005); upper.scale.setScalar(0.5);
    } else {
      torus(0.085, 0.012, [0, crownY - 0.03, crownZ - 0.045], two, Math.PI).rotation.x = -0.5;
      blob([0.022, 0.022, 0.016], [0, crownY + 0.012, crownZ + 0.01], one);
    }

    // Flanges, one per side; a badly worn censer has lost one.
    const lost = wear > 0.68 ? (random() < 0.5 ? -1 : 1) : 0;
    const span = flangeTop - flangeBottom, reach = a.form === 'urn' ? 0.12 : 0.17;
    for (const side of [-1, 1]) {
      if (a.flanges === 'none' || side === lost) continue;
      const x0 = bodyR * 0.75;
      if (a.flanges === 'stepped' || a.flanges === 'scrolls') {
        const shape = new THREE.Shape();
        const X = (x: number) => side * (x0 + x);
        shape.moveTo(X(0), flangeBottom);
        if (a.flanges === 'stepped') {
          const pts = [[reach * 0.7, 0], [reach * 0.7, 0.2], [reach, 0.2], [reach, 0.55], [reach * 0.75, 0.55], [reach * 0.75, 0.8], [reach * 0.45, 0.8], [reach * 0.45, 1], [0, 1]];
          for (const [x, v] of pts) shape.lineTo(X(x), flangeBottom + v * span);
        } else {
          for (let i = 0; i < 3; i++) { const y = flangeBottom + (i + 0.5) / 3 * span; shape.absarc(X(reach * 0.55), y, span / 6 * 1.05, side > 0 ? -Math.PI / 2 : -Math.PI / 2, side > 0 ? Math.PI / 2 : Math.PI * 1.5, side < 0); }
          shape.lineTo(X(0), flangeTop);
        }
        const wing = solid(new THREE.ExtrudeGeometry(shape, { depth: 0.022, bevelEnabled: false, curveSegments: 10 }), one, [0, 0, -0.011]);
        void wing;
        const rows = a.form === 'tube' ? 5 : 3;
        for (let i = 0; i < rows; i++) {
          const y = flangeBottom + (i + 0.5) / rows * span;
          if (a.flanges === 'stepped') solid(new THREE.SphereGeometry(0.015, 8, 6), two, [side * (x0 + reach * 0.42), y, 0.014]);
          else torus(span / 6 * 0.5, 0.008, [side * (x0 + reach * 0.55), flangeBottom + (Math.min(i, 2) + 0.5) / 3 * span, 0.014], two, Math.PI * 1.5).rotation.z = side > 0 ? 0.5 : 2.6;
        }
      } else {
        const n = a.form === 'tube' ? 6 : 4;
        for (let i = 0; i < n; i++) {
          const y = flangeBottom + (i + 0.5) / n * span, tilt = (i / (n - 1) - 0.35) * 0.9;
          const feather = blob([reach * 0.62, 0.026, 0.008], [side * (x0 + reach * 0.5), y + Math.sin(tilt) * reach * 0.3, 0], i % 2 ? two : one);
          feather.rotation.z = side * tilt;
        }
      }
    }

    // What is in the bowl, and what rises from it.
    const lit = a.burning !== 'cold';
    const coal = s.material('#2b2522', { roughness: 1 });
    const ember = new THREE.MeshStandardMaterial({ color: '#ff8a3a', emissive: '#ff4a10', emissiveIntensity: a.burning === 'embers' ? 2.2 : 1.2, roughness: 1 });
    const resin = s.material('#e9d9a6', { roughness: 0.5 });
    if (a.form !== 'urn') for (let i = 0; i < 9; i++) {
      const t = random() * 7, r = random() * bowlR * 0.6;
      solid(new THREE.DodecahedronGeometry(0.018 + random() * 0.014, 0), lit ? (i % 3 ? ember : coal) : (i % 3 ? resin : coal), [Math.cos(t) * r, rimY - 0.03 + random() * 0.012, Math.sin(t) * r]).rotation.set(random() * 3, random() * 3, 0);
    }
    const puffs = a.burning === 'thread' ? 46 : a.burning === 'billow' ? 60 : a.burning === 'embers' ? 10 : 0;
    const rise = a.burning === 'billow' ? 0.9 : a.burning === 'thread' ? 0.85 : 0.25;
    const smoke = puffs ? new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#f4f1ea', transparent: true, opacity: a.burning === 'billow' ? 0.2 : 0.3, depthWrite: false }), puffs) : null;
    const phase = random() * 10;
    const dummy = new THREE.Object3D();
    const drift = (time: number) => {
      if (!smoke) return;
      for (let i = 0; i < puffs; i++) {
        const u = ((i / puffs) + time * 0.06) % 1;
        const wobble = u * u * (a.burning === 'billow' ? 0.16 : 0.09);
        dummy.position.set(Math.sin(u * 9 + time * 0.8 + phase) * wobble + (a.burning === 'billow' ? Math.sin(i * 12.9) * 0.05 * u : 0), rimY + u * rise, Math.cos(u * 7 + time * 0.6 + phase) * wobble * 0.7);
        dummy.scale.setScalar(a.burning === 'billow' ? 0.03 + u * 0.1 : 0.008 + u * 0.012);
        dummy.updateMatrix();
        smoke.setMatrixAt(i, dummy.matrix);
      }
      smoke.instanceMatrix.needsUpdate = true;
    };
    if (smoke) { smoke.frustumCulled = false; put(smoke); drift(0); }

    const K = mix(0.55, 1.6, a.size);
    g.scale.setScalar(K);
    const ground = (offset: number) => [-(0.3 + offset) * K, 0, 0.12 * K] as const;
    if (lost) {
      for (let i = 0; i < 4; i++) { const size = (0.04 + random() * 0.05) * K; const shard = s.box([size * 1.4, 0.02 * K, size], [lost * (0.26 + random() * 0.18) * K, 0.012 * K, (random() - 0.3) * 0.25 * K], one); shard.rotation.set((random() - 0.5) * 0.3, random() * 3, (random() - 0.5) * 0.3); }
    }
    if (a.beside === 'resin') {
      const [x, , z] = ground(0);
      const leaf = s.ball([0.13 * K, 0.004 * K, 0.075 * K], [x, 0.004 * K, z], s.material('#4f8a3c', { roughness: 0.7 }), 14); leaf.rotation.y = 0.5;
      const amber = s.material('#d9962e', { roughness: 0.35, emissive: '#7a3d00', emissiveIntensity: 0.25 });
      for (let i = 0; i < 6; i++) s.mesh(new THREE.DodecahedronGeometry((0.018 + random() * 0.016) * K, 0), i % 3 ? amber : resin, [x + (random() - 0.5) * 0.12 * K, 0.022 * K, z + (random() - 0.5) * 0.07 * K]).rotation.set(random() * 3, random() * 3, 0);
    } else if (a.beside === 'maize') {
      const [x, , z] = ground(0);
      const kernel = s.material('#e3b53a', { roughness: 0.7 }), husk = s.material('#8aa04a', { roughness: 0.8 });
      for (let i = 0; i < 3; i++) {
        const cob = s.cylinder(0.02 * K, 0.03 * K, 0.17 * K, [x + i * 0.02 * K, 0.03 * K + (i === 2 ? 0.045 * K : 0), z + (i - 1) * 0.07 * K * (i === 2 ? 0 : 1)], kernel, 10); cob.rotation.set(Math.PI / 2, 0, 0.4 + i * 0.5);
        const wrap = s.ball([0.03 * K, 0.008 * K, 0.1 * K], [x + i * 0.02 * K - 0.05 * K, 0.012 * K, z + (i - 1) * 0.07 * K], husk, 8); wrap.rotation.y = 0.4 + i * 0.5 + 1.2;
      }
      const pod = s.material('#8a3b22', { roughness: 0.7 });
      for (let i = 0; i < 2; i++) s.ball([0.03 * K, 0.03 * K, 0.065 * K], [(0.26 + i * 0.09) * K, 0.03 * K, (0.16 - i * 0.07) * K], pod, 10).rotation.y = random() * 3;
    } else if (a.beside === 'flowers') {
      const heads: { at: [number, number, number]; size: number; color: string }[] = [];
      const n = 10 + Math.round(mood.density * 26);
      for (let i = 0; i < n; i++) { const t = random() * 7, r = (0.24 + random() * 0.2) * K; heads.push({ at: [Math.cos(t) * r, 0.015 * K, Math.sin(t) * r * 0.8 + 0.05 * K], size: (0.016 + random() * 0.012) * K, color: random() < 0.75 ? '#f29a1f' : '#f7d038' }); }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.8 }), heads);
    } else if (a.beside === 'shards') {
      const [x, , z] = ground(0.02);
      const old = s.material(lerpHex(tones.clay, '#8a7f72', 0.5), { roughness: 0.95 });
      for (let i = 0; i < 6; i++) { const size = (0.04 + random() * 0.06) * K; const shard = s.mesh(new THREE.CylinderGeometry(0.1 * K, 0.1 * K, size, 10, 1, true, random() * 6, 0.6 + random() * 0.9), old, [x + (random() - 0.5) * 0.2 * K, 0.02 * K, z + (random() - 0.5) * 0.2 * K]); (shard.material as THREE.Material).side = THREE.DoubleSide; shard.rotation.set(Math.PI / 2 + (random() - 0.5), random() * 3, random()); shard.scale.setScalar(0.7); }
      const half = mask(a.deity === 'death' ? 'old' : 'death', s.root); half.position.set(x - 0.02 * K, 0.035 * K, z + 0.02 * K); half.rotation.set(-1.3, 0.5, 0.2); half.scale.setScalar(0.6 * K);
    }
    void PAINT;

    const speed = mix(0.25, 2.2, mood.energy);
    return s.finish({
      footprint: 0.3 * K,
      update: smoke ? (_dt, time) => drift(time * speed) : undefined,
    });
  },
});
