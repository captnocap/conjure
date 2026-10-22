import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const MEAL: Record<string, string[]> = {
  algae: ['#3f9a3a', '#6fb53c', '#2f7d45'],
  yeast: ['#d9a441', '#c98a2b', '#e6c06a'],
  carmine: ['#c8243f', '#e0455a', '#a51b3a'],
  mixed: ['#3f9a3a', '#d9a441', '#c8243f', '#7a5a3a', '#4d7fb5'],
  ink: ['#20232b', '#3a3f4d', '#151820'],
};

export default defineThing({
  questions: {
    form: choice('Which kind of paramecium is it?', {
      slipper: 'The textbook slipper: blunt front, wider behind, a pointed tail with a tuft of longer hairs.',
      stubby: 'A short fat green one, stuffed with symbiotic algae like a pea with a mouth.',
      slender: 'A long slim cigar, fast and nervous.',
    }),
    doing: choice('What is it doing right now?', {
      cruising: 'Just commuting, spiralling forward and minding nothing.',
      feeding: 'Parked and feeding, sweeping a stream of bacteria into its groove.',
      dividing: 'Pinched at the waist, halfway through splitting into two.',
      conjugating: 'Two of them pressed side by side, swapping nuclei.',
      alarmed: 'Startled: it has fired a halo of long defensive needles in every direction.',
      dying: 'Rounded up and leaking, blebs swelling off its skin, hairs gone still.',
    }),
    render: choice('How is it presented?', {
      living: 'Alive and translucent, pale green-grey with soft colours inside.',
      stained: 'Fixed and stained on a slide: pink body, deep violet nucleus.',
      glass: 'A glass teaching model on a brass stand with a little engraved label.',
      darkfield: 'Dark-field: glowing pale blue edges and bright organelles, like a tiny galaxy.',
    }),
    meal: choice('What fills its food vacuoles?', {
      algae: 'Green algae, bright pea-coloured beads.',
      yeast: 'Golden yeast, amber beads.',
      carmine: 'Carmine dye from a classroom experiment, vivid red beads.',
      mixed: 'A bit of everything, a multicoloured gut.',
      ink: 'Black india ink, sooty dots.',
    }),
    fullness: score('How well fed is it?', ['Starving, nearly empty', 'A few vacuoles', 'Comfortably fed', 'Packed with food from end to end']),
    cilia: score('How long is the fringe of cilia?', ['A barely visible fuzz', 'A neat short fringe', 'Long shaggy hairs']),
    pose: choice('How does it hold itself?', {
      level: 'Lying level, in profile.',
      climbing: 'Nose up, climbing.',
      diving: 'Nose down, corkscrewing into the depths.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const shape = { slipper: { R: 0.33, skew: 0.8, len: 1 }, stubby: { R: 0.44, skew: 0.92, len: 0.74 }, slender: { R: 0.23, skew: 0.85, len: 1.18 } }[a.form];
    const dying = a.doing === 'dying';
    const R = shape.R * (dying ? 1.25 : 1), len = shape.len * (dying ? 0.72 : 1);
    const glass = a.render === 'glass', dark = a.render === 'darkfield', stained = a.render === 'stained';
    const radius = (t: number, pinch: number) =>
      Math.max(0.003, R * Math.pow(Math.sin(Math.PI * Math.pow(t, shape.skew)), dying ? 0.5 : 0.62) * (1 - pinch * Math.exp(-(((t - 0.5) / 0.08) ** 2))));
    const bend = (x: number) => 0.09 * (x / len) ** 2 * (dying ? 0.2 : 1);

    const bodyTint = new THREE.Color({ living: a.form === 'stubby' ? '#8fc46c' : '#9fbf96', stained: '#e58aa8', glass: '#bfe0e6', darkfield: '#2f6fb0' }[a.render]);
    bodyTint.offsetHSL((mood.warmth - 0.5) * 0.06, (mood.cheer - 0.5) * 0.2, -mood.wear * 0.08);
    // Pellicle: faint lengthwise striations painted on a canvas.
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = 'rgba(60,80,70,0.55)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 32; i++) { ctx.beginPath(); ctx.moveTo(i * 8 + 2, 0); ctx.lineTo(i * 8 + 6, 64); ctx.stroke(); }
    const stripes = new THREE.CanvasTexture(canvas);
    stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping; stripes.colorSpace = THREE.SRGBColorSpace;
    const skin = new THREE.MeshPhysicalMaterial({
      color: bodyTint, map: stripes, transparent: true, opacity: glass ? 0.4 : dark ? 0.55 : mix(0.55, 0.7, mood.wear), roughness: glass ? 0.05 : 0.35,
      clearcoat: glass ? 1 : 0.3, emissive: dark ? '#3d7fc4' : '#000000', emissiveIntensity: dark ? 0.55 : 0, side: THREE.FrontSide,
    });
    const rimMat = new THREE.MeshBasicMaterial({ color: bodyTint.clone().multiplyScalar(dark ? 1.6 : 0.42), side: THREE.BackSide, transparent: true, opacity: 0.55, depthWrite: false });
    const solid = (colour: string, glow = 0.12) => {
      const c = new THREE.Color(colour);
      if (dark) c.lerp(new THREE.Color('#dff2ff'), 0.35);
      return new THREE.MeshStandardMaterial({ color: c, roughness: glass ? 0.12 : 0.45, emissive: c, emissiveIntensity: dark ? 0.6 : glow, metalness: 0 });
    };
    const nucleusMat = solid(stained ? '#5a2a86' : glass ? '#7a4fb0' : '#7c7f9a', 0.1);
    const clearMat = solid(glass ? '#f4fbff' : '#dceff2', 0.25);
    const grooveMat = solid(stained ? '#b24f7c' : dark ? '#9fd0ff' : '#5f7a63', 0.05);
    const hair = solid(dark ? '#cfe8ff' : stained ? '#c9779a' : glass ? '#e8f4f6' : '#6f8a72', 0.1);
    const mealColours = MEAL[a.meal];
    const mealMats = mealColours.map((c) => solid(c, 0.22));

    const rockers: THREE.Object3D[] = [];
    const pulses: THREE.Object3D[] = [];
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx = 1, sy = sx, sz = sx) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y + bend(x), z);
      mesh.scale.set(sx, sy, sz);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const unit = new THREE.SphereGeometry(1, 14, 10);

    const cell = (pinch: number) => {
      const group = new THREE.Group();
      const profile: THREE.Vector2[] = [];
      for (let i = 0; i <= 44; i++) profile.push(new THREE.Vector2(radius(i / 44, pinch), (i / 44 - 0.5) * 2 * len));
      const body = new THREE.LatheGeometry(profile, 30);
      body.rotateZ(-Math.PI / 2);
      body.scale(1, 1, 0.84);
      const p = body.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + bend(p.getX(i)));
      body.computeVertexNormals();
      const hull = new THREE.Mesh(body, skin);
      hull.castShadow = true;
      hull.renderOrder = 2;
      const rim = new THREE.Mesh(body, rimMat);
      rim.scale.setScalar(1.035);
      rim.renderOrder = 1;
      group.add(hull, rim);
      const rAt = (x: number) => radius(x / (2 * len) + 0.5, pinch);

      // Nuclei: one big bean and a small bead, doubled when the cell is splitting.
      for (const nx of pinch > 0 ? [-0.42 * len, 0.42 * len] : [-0.06 * len]) {
        put(group, unit, nucleusMat, nx, -0.02, 0.02, 0.2 * len * (pinch > 0 ? 0.7 : 1), R * 0.36, R * 0.32).rotation.z = 0.25;
        put(group, unit, nucleusMat, nx + 0.1 * len, R * 0.3, 0.05, R * 0.11);
      }
      // Contractile vacuoles: a clear bead with radiating canals, a little star at each end.
      for (const vx of [-0.58 * len, 0.56 * len]) {
        const star = new THREE.Group();
        star.position.set(vx, bend(vx) + rAt(vx) * 0.25, rAt(vx) * 0.5);
        const bead = new THREE.Mesh(unit, clearMat);
        bead.scale.setScalar(R * 0.2);
        star.add(bead);
        for (let k = 0; k < 7; k++) {
          const canal = new THREE.Mesh(new THREE.ConeGeometry(R * 0.035, R * 0.42, 5), clearMat);
          const angle = (k / 7) * Math.PI * 2;
          canal.position.set(Math.cos(angle) * R * 0.33, Math.sin(angle) * R * 0.33, 0);
          canal.rotation.z = angle - Math.PI / 2;
          star.add(canal);
        }
        group.add(star);
        pulses.push(star);
      }
      // Food vacuoles.
      const meals = Math.round(mix(1, 20, a.fullness) * mix(0.8, 1.2, random()));
      for (let i = 0; i < meals; i++) {
        const x = (random() * 2 - 1) * len * 0.78, reach = rAt(x) * 0.62, angle = random() * Math.PI * 2, d = Math.sqrt(random()) * reach;
        put(group, unit, mealMats[Math.floor(random() * mealMats.length)], x, Math.cos(angle) * d, Math.sin(angle) * d * 0.84, R * mix(0.09, 0.2, random()));
      }
      if (a.form === 'stubby') {
        const algae: { at: [number, number, number]; size: number }[] = [];
        for (let i = 0; i < 90; i++) {
          const x = (random() * 2 - 1) * len * 0.85, reach = rAt(x) * 0.8, angle = random() * Math.PI * 2, d = Math.sqrt(random()) * reach;
          algae.push({ at: [x, Math.cos(angle) * d + bend(x), Math.sin(angle) * d * 0.84], size: R * 0.075 });
        }
        const dots = new THREE.InstancedMesh(unit, solid(stained ? '#8b3f9a' : '#3d9440', 0.25), algae.length);
        const m = new THREE.Matrix4();
        algae.forEach((dot, i) => dots.setMatrixAt(i, m.makeScale(dot.size, dot.size, dot.size).setPosition(...dot.at)));
        group.add(dots);
      }
      // Oral groove: a dark furrow winding from the front flank to the gullet at mid-body.
      const groove: THREE.Vector3[] = [];
      for (let i = 0; i <= 10; i++) {
        const u = i / 10, x = mix(0.8, -0.12, u) * len, angle = mix(0.1, 1.25, u), r = rAt(x) * mix(1.0, 0.72, u * u);
        groove.push(new THREE.Vector3(x, Math.sin(angle - 0.9) * r + bend(x), Math.cos(angle - 0.9) * r * 0.84));
      }
      const furrow = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(groove), 30, R * 0.14, 8), grooveMat);
      furrow.scale.set(1, 1, 1);
      group.add(furrow);
      put(group, unit, mealMats[0], groove[10].x - 0.06 * len, groove[10].y - bend(groove[10].x) - R * 0.1, groove[10].z * 0.6, R * 0.16);

      // Cilia: two interleaved coats that rock against each other.
      const count = dying ? 160 : 900;
      const hairLength = R * mix(0.1, 0.36, a.cilia) * (dying ? 0.5 : 1);
      const cone = new THREE.ConeGeometry(R * 0.016, 1, 3);
      cone.translate(0, 0.5, 0);
      const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), m = new THREE.Matrix4(), normal = new THREE.Vector3();
      for (let coat = 0; coat < 2; coat++) {
        const fur = new THREE.InstancedMesh(cone, hair, count / 2);
        for (let i = 0; i < count / 2; i++) {
          const t = mix(0.015, 0.985, random()), x = (t - 0.5) * 2 * len, r = radius(t, pinch), angle = random() * Math.PI * 2;
          const slope = (radius(Math.min(1, t + 0.01), pinch) - radius(Math.max(0, t - 0.01), pinch)) / (0.04 * len);
          normal.set(-slope - 0.45, Math.cos(angle), Math.sin(angle)).normalize();
          const tail = a.form === 'slipper' && t < 0.06 ? 2.6 : 1;
          q.setFromUnitVectors(up, normal);
          m.compose(new THREE.Vector3(x, Math.cos(angle) * r + bend(x), Math.sin(angle) * r * 0.84), q, new THREE.Vector3(1, hairLength * tail * mix(0.7, 1.2, random()), 1));
          fur.setMatrixAt(i, m);
        }
        fur.castShadow = true;
        group.add(fur);
        rockers.push(fur);
      }
      if (a.doing === 'alarmed') {
        const needle = new THREE.ConeGeometry(R * 0.016, 1, 4);
        needle.translate(0, 0.5, 0);
        const spikes = new THREE.InstancedMesh(needle, solid(dark ? '#ffffff' : '#e9f1e4', 0.4), 150);
        for (let i = 0; i < 150; i++) {
          const t = mix(0.03, 0.97, random()), x = (t - 0.5) * 2 * len, r = radius(t, pinch), angle = random() * Math.PI * 2;
          normal.set((t - 0.5) * 0.9, Math.cos(angle), Math.sin(angle)).normalize();
          q.setFromUnitVectors(up, normal);
          m.compose(new THREE.Vector3(x, Math.cos(angle) * r + bend(x), Math.sin(angle) * r * 0.84), q, new THREE.Vector3(1, R * mix(0.9, 1.7, random()), 1));
          spikes.setMatrixAt(i, m);
        }
        group.add(spikes);
      }
      if (dying) {
        const bleb = new THREE.MeshPhysicalMaterial({ color: bodyTint, transparent: true, opacity: 0.5, roughness: 0.2, emissive: dark ? '#3d7fc4' : '#000000', emissiveIntensity: 0.4 });
        for (let i = 0; i < 9; i++) {
          const t = mix(0.15, 0.85, random()), x = (t - 0.5) * 2 * len, r = radius(t, 0), angle = random() * Math.PI * 2;
          put(group, unit, bleb, x, Math.cos(angle) * r, Math.sin(angle) * r * 0.84, R * mix(0.18, 0.42, random()));
        }
        for (let i = 0; i < 14; i++) put(group, unit, mealMats[i % mealMats.length], mix(-1.5, 1.5, random()) * len, -R * mix(0.2, 1, random()), mix(-0.6, 0.6, random()), R * mix(0.05, 0.12, random()));
      }
      return group;
    };

    const swimmer = new THREE.Group();
    if (a.doing === 'conjugating') {
      const one = cell(0), two = cell(0);
      one.position.z = R * 0.74; one.rotation.x = 0.25;
      two.position.z = -R * 0.74; two.rotation.x = Math.PI - 0.25; two.position.x = 0.12 * len;
      swimmer.add(one, two);
    } else swimmer.add(cell(a.doing === 'dividing' ? 0.72 : 0));

    if (a.doing === 'feeding') {
      // A funnel of bacteria being swept toward the groove.
      const rod = new THREE.CapsuleGeometry(0.5, 1.6, 3, 6);
      const count = Math.round(mix(30, 90, mood.density));
      const swarm = new THREE.InstancedMesh(rod, solid(dark ? '#ffe9a8' : '#8d7a4a', 0.2), count);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < count; i++) {
        const far = Math.pow(random(), 0.7), spread = 0.1 + far * 0.75;
        e.set(random() * 3, random() * 3, random() * 3);
        const size = R * mix(0.03, 0.055, random());
        m.compose(new THREE.Vector3(0.45 * len + far * 0.9 * len + (random() - 0.5) * spread, R * 0.2 + (random() - 0.5) * spread * 1.4, R * 0.6 + far * 0.9 + (random() - 0.5) * spread), q.setFromEuler(e), new THREE.Vector3(size, size, size));
        swarm.setMatrixAt(i, m);
      }
      swarm.castShadow = true;
      swimmer.add(swarm);
    }

    swimmer.rotation.z = { level: 0.06, climbing: 0.6, diving: -0.5 }[a.pose] + (random() - 0.5) * 0.12;
    swimmer.rotation.x = a.pose === 'diving' ? 0.35 : 0.12;
    swimmer.rotation.y = (random() - 0.5) * 0.3;
    const lift = glass ? 0.95 : 0;
    swimmer.position.y = lift;
    s.root.add(swimmer);

    if (glass) {
      const brass = s.material('#b08a3c', { metalness: 0.85, roughness: 0.3 });
      const base = lift - R - len * Math.abs(Math.sin(swimmer.rotation.z)) - 0.45;
      s.cylinder(0.022, 0.03, lift - base, [0, (lift + base) / 2, 0], brass, 10);
      s.cylinder(0.4, 0.46, 0.1, [0, base - 0.05, 0], s.material('#3b2a1e', { roughness: 0.45 }), 32);
      s.cylinder(0.1, 0.16, 0.06, [0, base + 0.03, 0], brass, 20);
      const plate = s.label('PARAMECIUM', 0.5, 0.08, [0, base - 0.05, 0.445], '#2a2114', '#d8c48a');
      plate.rotation.x = -0.1;
    }

    const size = { slipper: 0.15, stubby: 0.12, slender: 0.17 }[a.form];
    s.root.scale.setScalar(size);
    const speed = glass || dying ? 0 : mix(0.4, 3.2, mood.energy);
    const still = glass ? 0 : mix(0.2, 1, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        rockers.forEach((fur, index) => { fur.rotation.x = Math.sin(time * speed * 6 + index * Math.PI) * 0.09; });
        pulses.forEach((star, index) => { star.scale.setScalar(1 + 0.3 * still * Math.sin(time * 1.6 * (speed + 0.3) + index * 2.1)); });
        swimmer.position.y = lift + Math.sin(time * 0.9) * 0.03 * still;
        if (!glass && a.doing === 'cruising') swimmer.rotation.x = 0.12 + time * speed * 0.25;
      },
    });
  },
});
