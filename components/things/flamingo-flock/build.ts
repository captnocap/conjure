import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score, visibleBounds, disposeTree } from '@conjure/kit';

type Pose = 'upright' | 'feeding' | 'asleep' | 'flying' | 'preening';
type P3 = [number, number, number];

export default defineThing({
  questions: {
    formation: choice('How is the flock arranged?', {
      line: 'A loose line strung out across the shallows, gaps between small groups.',
      file: 'A tight single file, all marching the same way with heads high.',
      huddle: 'A dense huddle, bodies overlapping, a single pink mass on many legs.',
      pairs: 'Scattered pairs and loners spread wide apart.',
      wedge: 'A V-shaped wedge, wading forward together behind a leader.',
    }),
    size: score('How many birds?', ['Three or four', 'Half a dozen', 'A dozen', 'A crowd of twenty']),
    doing: choice('What are most of them doing?', {
      feeding: 'Feeding: necks looped down, heads upside down in the water.',
      alert: 'Standing alert, necks straight up, all looking the same way.',
      asleep: 'Asleep on one leg, heads tucked back into their feathers.',
      mixed: 'A bit of everything: some feed, some preen, some stare.',
    }),
    flight: choice('Is anything taking to the air?', {
      one: 'One bird at the end of the line is running into take-off, wings up.',
      none: 'No: every bird is on its feet.',
      several: 'Several are lifting off one after another, a staircase of wings.',
      overhead: 'One passes low overhead, neck and legs stretched in a straight line.',
    }),
    plumage: choice('What colour are they?', {
      coral: 'Vivid coral pink with crimson wing edges.',
      blush: 'Pale blush, almost white, pink only at the wing.',
      silhouette: 'Dark silhouettes against the light, colour barely guessed.',
      sunset: 'Hot orange-pink, as if lit from below by the last sun.',
    }),
    chicks: noul('Are there grey downy juveniles among the adults?'),
    footing: choice('What are they standing in?', {
      mirror: 'A still sheet of shallow water with ripple rings round each leg.',
      mud: 'Dark brine mud, churned with footprints.',
      bare: 'Nothing of their own: they stand on whatever ground is there.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dark = a.plumage === 'silhouette';
    const feather = new THREE.Color({ coral: '#f47b8f', blush: '#f7d3d3', silhouette: '#3a2a3c', sunset: '#f98a5c' }[a.plumage]);
    if (!dark) feather.offsetHSL(0, (mood.cheer - 0.5) * 0.2, 0).lerp(new THREE.Color(mood.warmth > 0.5 ? '#ff9a6a' : '#e9a6d6'), Math.abs(mood.warmth - 0.5) * 0.3);
    const wingTint = new THREE.Color({ coral: '#e23b5c', blush: '#f2909f', silhouette: '#2a1d2c', sunset: '#e8482f' }[a.plumage]);
    const mat = (colour: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.75, ...extra });
    const body = mat(feather), wing = mat(wingTint, { side: THREE.DoubleSide }), bodyWing = mat(feather.clone().lerp(wingTint, 0.45));
    const leg = mat(dark ? '#2a1d2c' : a.plumage === 'blush' ? '#e7a0a6' : '#d9506c');
    const black = mat('#1b1719', { side: THREE.DoubleSide });
    const beakPale = mat(dark ? '#4a3a4a' : '#f6e3d6');
    const down = mat('#a9a39b'), downLeg = mat('#5b5753');

    const flappers: { left: THREE.Group; right: THREE.Group; phase: number; rate: number; base: number }[] = [];

    const bird = (pose: Pose, x: number, z: number, heading: number, size: number, juvenile: boolean, lift = 0) => {
      const b = new Sculpture(context);
      const paint = juvenile ? down : body, legPaint = juvenile ? downLeg : leg;
      const flying = pose === 'flying';
      const legLength = 0.72, by = flying ? legLength + 0.12 : legLength + 0.1;
      const torso = b.ball([0.13, 0.125, 0.26], [0, by, 0], paint, 16);
      torso.rotation.x = flying ? 0.12 : -0.14;
      // Folded wing and black primaries at the tail.
      if (!flying) {
        for (const side of [-1, 1]) b.ball([0.05, 0.1, 0.22], [side * 0.1, by + 0.02, -0.03], juvenile ? down : bodyWing, 10).rotation.x = -0.14;
        b.ball([0.05, 0.035, 0.1], [0, by - 0.04, -0.27], black, 8);
      }
      b.ball([0.07, 0.05, 0.1], [0, by + 0.03, -0.24], paint, 8);

      // Neck and head.
      let neck: P3[], head: P3, beakDir: P3;
      const tilt = (random() - 0.5) * 0.1;
      if (pose === 'feeding') {
        const reach = mix(0.42, 0.56, random());
        neck = [[0, by + 0.05, 0.2], [0, by + 0.12, 0.38], [tilt, by - 0.22, reach + 0.05], [tilt, 0.24, reach + 0.03], [tilt, 0.1, reach - 0.03]];
        head = [tilt, 0.075, reach - 0.07];
        beakDir = [0, -0.55, -1];
      } else if (pose === 'asleep') {
        neck = [[0, by + 0.05, 0.2], [0.02, by + 0.2, 0.26], [0.06, by + 0.24, 0.1], [0.08, by + 0.17, -0.02]];
        head = [0.09, by + 0.14, -0.08];
        beakDir = [0.1, -0.3, -1];
      } else if (pose === 'preening') {
        neck = [[0, by + 0.05, 0.2], [0, by + 0.34, 0.34], [0.1, by + 0.42, 0.14], [0.17, by + 0.22, 0.02]];
        head = [0.19, by + 0.15, -0.02];
        beakDir = [-0.2, -1, -0.5];
      } else if (flying) {
        neck = [[0, by + 0.03, 0.22], [0, by + 0.05, 0.5], [0, by + 0.03, 0.8], [0, by + 0.05, 0.98]];
        head = [0, by + 0.06, 1.04];
        beakDir = [0, -0.5, 1];
      } else {
        const h = mix(0.56, 0.72, random());
        neck = [[0, by + 0.05, 0.2], [0, by + 0.16, 0.36], [0, by + h * 0.55, 0.3], [tilt, by + h * 0.9, 0.25], [tilt, by + h, 0.31]];
        head = [tilt, by + h + 0.01, 0.37];
        beakDir = [tilt * 4, -0.75, 1];
      }
      const curve = new THREE.CatmullRomCurve3(neck.map((p) => new THREE.Vector3(...p)));
      b.mesh(new THREE.TubeGeometry(curve, 16, juvenile ? 0.03 : 0.026, 6), paint);
      b.ball([0.042, 0.042, 0.055], head, paint, 10).lookAt(head[0] + beakDir[0], head[1] + beakDir[1], head[2] + beakDir[2]);
      const dir = new THREE.Vector3(...beakDir).normalize();
      const mid: P3 = [head[0] + dir.x * 0.085, head[1] + dir.y * 0.085, head[2] + dir.z * 0.085];
      const hook = dir.clone().add(new THREE.Vector3(0, pose === 'feeding' ? 0.7 : -0.8, 0)).normalize();
      b.rod(head, mid, 0.028, juvenile ? downLeg : beakPale, 0.022);
      b.rod(mid, [mid[0] + hook.x * 0.07, mid[1] + hook.y * 0.07, mid[2] + hook.z * 0.07], 0.022, black, 0.008);

      // Legs: stilts with a backward ankle, one tucked up when resting.
      const tucked = pose === 'asleep' || (pose === 'upright' && random() < 0.3);
      const stride = pose === 'upright' || pose === 'feeding' ? (random() - 0.5) * 0.24 : 0;
      for (const side of [-1, 1]) {
        const hip: P3 = [side * 0.045, by - 0.09, -0.03];
        if (flying) {
          if (lift > 0.5) { b.rod(hip, [side * 0.03, by - 0.06, -0.5], 0.017, legPaint); b.rod([side * 0.03, by - 0.06, -0.5], [side * 0.03, by - 0.1, -1.0], 0.015, legPaint); }
          else {
            // Running on the water to get airborne.
            const swing = side * 0.3;
            b.rod(hip, [side * 0.045, by - 0.42, -0.12 + swing], 0.017, legPaint);
            b.rod([side * 0.045, by - 0.42, -0.12 + swing], [side * 0.045, by - 0.74, -0.3 + swing * 1.6], 0.015, legPaint);
          }
        } else if (tucked && side === 1) {
          b.rod(hip, [side * 0.05, by - 0.2, -0.16], 0.017, legPaint);
          b.rod([side * 0.05, by - 0.2, -0.16], [side * 0.05, by - 0.1, 0.02], 0.015, legPaint);
        } else {
          const knee: P3 = [side * 0.045, by * 0.52, -0.05 + side * stride * 0.5];
          const foot: P3 = [side * 0.045, 0, 0.0 + side * stride];
          b.rod(hip, knee, 0.017, legPaint);
          b.rod(knee, foot, 0.015, legPaint);
          b.ball([0.035, 0.008, 0.05], [foot[0], 0.006, foot[2] + 0.02], legPaint, 6);
        }
      }

      // Open wings on anything airborne.
      if (flying) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0.1); shape.lineTo(0.3, 0.14); shape.lineTo(0.72, 0.06); shape.lineTo(0.5, -0.03); shape.lineTo(0.02, -0.08); shape.closePath();
        const tips = new THREE.Shape();
        tips.moveTo(0.02, -0.08); tips.lineTo(0.5, -0.03); tips.lineTo(0.72, 0.06); tips.lineTo(0.8, 0.0); tips.lineTo(0.6, -0.14); tips.lineTo(0.3, -0.2); tips.lineTo(0.04, -0.19); tips.closePath();
        const make = (side: number) => {
          const group = new THREE.Group();
          const inner = new THREE.Mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), wing);
          const outer = new THREE.Mesh(new THREE.ShapeGeometry(tips).rotateX(-Math.PI / 2), black);
          inner.castShadow = outer.castShadow = true;
          group.add(inner, outer);
          group.scale.x = side;
          group.position.set(side * 0.08, by + 0.07, 0.02);
          b.root.add(group);
          return group;
        };
        const left = make(-1), right = make(1);
        const base = lift > 0.5 ? 0.15 : 0.75;
        left.rotation.z = -base; right.rotation.z = base;
        flappers.push({ left, right, phase: random() * 6.3, rate: mix(3, 9, mood.energy), base });
        b.root.rotation.x = lift > 0.5 ? -0.05 : -0.3;
      }

      const scale = size * (juvenile ? 0.68 : 1);
      b.root.scale.setScalar(scale);
      b.root.position.set(x, lift, z);
      b.root.rotation.y = heading;
      s.root.add(b.root);
    };

    // Where the birds stand.
    const total = Math.round(mix(3, 18, Math.min(1, a.size * 0.8 + mood.density * 0.25)));
    const places: { x: number; z: number; heading: number }[] = [];
    const along = random() < 0.5 ? 1 : -1;
    if (a.formation === 'line') {
      let x = 0;
      for (let i = 0; i < total; i++) {
        x += random() < 0.25 ? mix(0.9, 1.5, random()) : mix(0.32, 0.6, random());
        places.push({ x, z: (random() - 0.5) * 0.7, heading: along * Math.PI / 2 + (random() - 0.5) * 1.0 + (random() < 0.2 ? Math.PI : 0) });
      }
    } else if (a.formation === 'file') {
      for (let i = 0; i < total; i++) places.push({ x: i * 0.42, z: Math.sin(i * 0.5) * 0.12, heading: along * Math.PI / 2 + (random() - 0.5) * 0.12 });
    } else if (a.formation === 'huddle') {
      for (let i = 0; i < total; i++) {
        const angle = i * 2.4, radius = 0.24 * Math.sqrt(i);
        places.push({ x: Math.cos(angle) * radius * 1.4, z: Math.sin(angle) * radius * 0.8, heading: random() * 6.3 });
      }
    } else if (a.formation === 'pairs') {
      for (let i = 0; i < total; i += 2) {
        const x = (random() - 0.5) * (1.5 + total * 0.4), z = (random() - 0.5) * (1 + total * 0.16), heading = random() * 6.3;
        places.push({ x, z, heading });
        if (i + 1 < total && random() < 0.8) places.push({ x: x + 0.3 + random() * 0.15, z: z + (random() - 0.5) * 0.3, heading: heading + Math.PI + (random() - 0.5) });
      }
    } else {
      for (let i = 0; i < total; i++) {
        const rank = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
        places.push({ x: side * rank * 0.38, z: -rank * 0.36 + (random() - 0.5) * 0.1, heading: (random() - 0.5) * 0.2 });
      }
    }

    const poseFor = (): Pose => {
      const roll = random();
      if (a.formation === 'file') return 'upright';
      if (a.doing === 'feeding') return roll < 0.72 ? 'feeding' : 'upright';
      if (a.doing === 'alert') return 'upright';
      if (a.doing === 'asleep') return roll < 0.5 ? 'asleep' : roll < 0.7 ? 'preening' : 'upright';
      return roll < 0.38 ? 'feeding' : roll < 0.58 ? 'preening' : roll < 0.72 ? 'asleep' : 'upright';
    };
    const lifting = a.flight === 'one' ? 1 : a.flight === 'several' ? Math.min(3, places.length - 1) : 0;
    // The birds at the far end of the formation are the ones that go.
    const byX = places.map((_place, index) => index).sort((p, q) => places[q].x * along - places[p].x * along);
    const flyers = new Set(byX.slice(0, lifting));
    const gaze = along * Math.PI / 2 + (random() - 0.5);
    places.forEach((place, index) => {
      const size = mix(0.9, 1.12, random());
      if (flyers.has(index)) {
        const order = byX.indexOf(index);
        const lift = a.flight === 'several' ? [0.85, 0.42, 0.1][order] ?? 0.1 : mix(0.08, 0.22, random());
        bird('flying', place.x + along * (0.5 + (lifting - order) * 0.55), place.z, along * Math.PI / 2 + (random() - 0.5) * 0.2, size, false, lift);
        return;
      }
      const juvenile = a.chicks && index % 3 === 1;
      const pose = juvenile && random() < 0.5 ? 'upright' : poseFor();
      bird(pose, place.x, place.z, a.doing === 'alert' && pose === 'upright' ? gaze + (random() - 0.5) * 0.3 : place.heading, size, juvenile);
    });
    if (a.flight === 'overhead') {
      const mid = places[Math.floor(places.length / 2)];
      bird('flying', mid.x - along * 0.3, mid.z - 0.5, along * Math.PI / 2 + 0.15, 1.05, false, 1.25);
    }

    // The water or mud they stand in.
    if (a.footing !== 'bare') {
      const minX = Math.min(...places.map((p) => p.x)) - 0.9, maxX = Math.max(...places.map((p) => p.x)) + 0.9 + (lifting ? 1.2 : 0) * (along > 0 ? 1 : 0);
      const lowX = minX - (lifting && along < 0 ? 1.2 : 0);
      const minZ = Math.min(...places.map((p) => p.z)) - 0.8, maxZ = Math.max(...places.map((p) => p.z)) + 0.8;
      const cx = (lowX + maxX) / 2, cz = (minZ + maxZ) / 2, hx = (maxX - lowX) / 2, hz = Math.max(0.9, (maxZ - minZ) / 2);
      const shape = new THREE.Shape();
      const q1 = random() * 6.3, q2 = random() * 6.3;
      for (let i = 0; i <= 56; i++) {
        const t = i / 56 * Math.PI * 2;
        const k = 1 + 0.07 * Math.sin(t * 3 + q1) + 0.05 * Math.sin(t * 7 + q2);
        const px = cx + Math.cos(t) * hx * k, py = -(cz + Math.sin(t) * hz * k);
        if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py);
      }
      const water = a.footing === 'mirror';
      const tone = water ? new THREE.Color('#b7cfe0').lerp(new THREE.Color(mood.daylight > 0.75 || mood.daylight < 0.25 ? '#e3b9c9' : '#cfe0ea'), 0.5) : new THREE.Color('#6f6a62');
      const pool = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: tone, roughness: water ? 0.12 : 0.85, metalness: water ? 0.45 : 0 }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.y = -0.03;
      pool.receiveShadow = true;
      s.root.add(pool);
      const rings = places.flatMap((place) => [0, 1].filter(() => random() < 0.8).map((k) => ({ x: place.x + (random() - 0.5) * 0.1, z: place.z + (random() - 0.5) * 0.1, r: 0.1 + k * 0.1 + random() * 0.06 })));
      if (rings.length) {
        const geometry = water ? new THREE.RingGeometry(0.88, 1, 20).rotateX(-Math.PI / 2) : new THREE.CircleGeometry(0.35, 8).rotateX(-Math.PI / 2);
        const marks = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color: water ? '#f4f8fa' : '#55514b', roughness: water ? 0.3 : 1 }), rings.length);
        const dummy = new THREE.Object3D();
        rings.forEach((ring, i) => {
          dummy.position.set(ring.x, 0.004, ring.z);
          dummy.scale.set(ring.r, 1, ring.r);
          dummy.updateMatrix();
          marks.setMatrixAt(i, dummy.matrix);
        });
        s.root.add(marks);
      }
    }

    const bounds = visibleBounds(s.root);
    const centre = bounds.getCenter(new THREE.Vector3());
    s.root.position.set(-centre.x, 0, -centre.z);
    return {
      object: s.root,
      update: flappers.length ? (_dt, time) => {
        for (const f of flappers) {
          const angle = f.base + Math.sin(time * f.rate + f.phase) * mix(0.25, 0.6, mood.energy);
          f.left.rotation.z = -angle;
          f.right.rotation.z = angle;
        }
      } : undefined,
      dispose: () => disposeTree(s.root),
    };
  },
});
