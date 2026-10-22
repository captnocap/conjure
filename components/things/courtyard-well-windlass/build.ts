import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

export default defineThing({
  questions: {
    ring: choice('What is the well mouth built of?', {
      fieldstone: 'Rough rounded fieldstones, fitted without mortar.',
      dressed: 'Squared pale limestone blocks in neat courses.',
      brick: 'Small sun-baked mud bricks, the same earth as the walls around.',
      marble: 'A single carved marble drum, grooved by centuries of rope, taken from some older ruin.',
    }),
    frame: choice('What raises the water?', {
      forked: 'Two forked tree trunks cradling a log windlass with a crank handle.',
      gallows: 'A squared timber gallows with a wooden pulley wheel and a hauling rope.',
      roofed: 'A windlass under its own little pitched roof, cared for and shaded.',
      broken: 'Nothing any more: the posts are stumps and the windlass log lies fallen against the ring.',
    }),
    bucket: choice('Where is the leather bucket right now?', {
      hanging: 'Hanging mid-draw over the mouth, swaying and dripping.',
      rim: 'Set down full on the rim, rope slack.',
      down: 'Down the shaft out of sight, the rope taut into the dark.',
      ground: 'Dropped on its side on the ground in a spreading puddle.',
    }),
    water: score('How much water is there?', [
      'None: the well is dry and sand has drifted into the trough',
      'A dark gleam far down, the trough empty',
      'Enough: the trough half full',
      'Plenty: the trough brimming and puddles all round',
    ]),
    trough: choice('What do the animals drink from?', {
      stone: 'A long stone trough, its lip worn into smooth dips.',
      log: 'A hollowed-out tree trunk.',
      jars: 'No trough, just a row of big clay water jars.',
      none: 'Nothing: the water is carried away.',
    }),
    left: choice('What has been left at the well?', {
      nothing: 'Nothing.',
      skins: 'Bulging goatskin waterbags and a jar, filled for the next desert stage.',
      doves: 'A pair of pale doves perched on it.',
      bundle: 'A traveller\'s staff and tied bundle leaned against the stones.',
      rags: 'Strips of bright cloth knotted to the timber as prayers for safe passage.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 0.78, wallH = 0.72, thick = 0.26;
    const wet = a.water;
    const stoneHex = { fieldstone: '#a39a8a', dressed: '#d5cbb3', brick: '#b98257', marble: '#e4e0d6' }[a.ring];
    const stone = s.material(stoneHex, { roughness: 0.95 });
    const timber = s.material(mix(0.5, 0.2, mood.wear) > 0.3 ? '#7a5a3c' : '#8c8478', { roughness: 0.9 });
    const dark = s.material('#2a221b');
    const ropeMat = s.material('#c2a56e');
    const leather = s.material('#5b3a24', { roughness: 0.7 });
    const waterMat = new THREE.MeshStandardMaterial({ color: '#3f7482', roughness: 0.08, metalness: 0.35, emissive: '#1d4a58', emissiveIntensity: 0.35 });
    const sand = s.material('#d9bd8a');

    // Apron: trodden ground, darker when wet.
    const apron = s.cylinder(1.75, 1.8, 0.04, [0, 0.02, 0.35], s.material(new THREE.Color('#bfa77f').lerp(new THREE.Color('#7d6a52'), wet * 0.6)), 15);
    apron.scale.z = 1.18;

    // The ring.
    if (a.ring === 'marble') {
      s.lathe([[R - thick, wallH], [R - thick + 0.05, wallH + 0.02], [R - 0.02, wallH + 0.02], [R + 0.03, wallH - 0.03], [R, wallH - 0.1], [R - 0.04, wallH - 0.14], [R - 0.04, 0.2], [R + 0.02, 0.14], [R + 0.05, 0]], s.material(stoneHex, { roughness: 0.6, side: THREE.DoubleSide }));
      for (let i = 0; i < 9; i++) {
        const angle = 0.4 + random() * 2.3;
        s.box([0.03, 0.03, 0.12], [Math.cos(angle) * (R - 0.1), wallH + 0.012, Math.sin(angle) * (R - 0.1)], dark).rotation.y = -angle + Math.PI / 2;
      }
    } else {
      const spec = { fieldstone: { per: 11, courses: 3 }, dressed: { per: 10, courses: 3 }, brick: { per: 18, courses: 6 } }[a.ring];
      const geometry = a.ring === 'fieldstone' ? new THREE.DodecahedronGeometry(0.62, 1) : new THREE.BoxGeometry(1, 1, 1);
      const blocks = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }), spec.per * spec.courses);
      const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), tint = new THREE.Color();
      const h = wallH / spec.courses, arc = (Math.PI * 2 * (R - thick / 2)) / spec.per;
      let k = 0;
      for (let c = 0; c < spec.courses; c++) for (let i = 0; i < spec.per; i++) {
        if (c === spec.courses - 1 && random() < mood.wear * 0.3) continue;
        const angle = ((i + (c % 2) * 0.5) / spec.per) * Math.PI * 2, rr = R - thick / 2 + (random() - 0.5) * 0.03;
        q.setFromEuler(new THREE.Euler((random() - 0.5) * 0.08, -angle + Math.PI / 2 + (random() - 0.5) * 0.1, (random() - 0.5) * 0.08));
        matrix.compose(new THREE.Vector3(Math.cos(angle) * rr, h * (c + 0.5), Math.sin(angle) * rr), q, new THREE.Vector3(arc * mix(0.93, 1.02, random()), h * mix(0.9, 1.02, random()), thick * mix(0.9, 1.08, random())));
        blocks.setMatrixAt(k, matrix);
        blocks.setColorAt(k, tint.set(stoneHex).multiplyScalar(mix(0.8, 1.08, random())).lerp(new THREE.Color('#8b8275'), mood.wear * 0.2));
        k++;
      }
      blocks.count = k;
      blocks.castShadow = blocks.receiveShadow = true;
      s.root.add(blocks);
    }
    const shaft = s.cylinder(R - thick + 0.02, R - thick + 0.02, wallH, [0, wallH / 2, 0], s.material('#3a322a', { side: THREE.BackSide }), 20);
    shaft.castShadow = false;
    s.cylinder(R - thick, R - thick, 0.02, [0, mix(0.08, wallH - 0.14, wet > 0.9 ? 1 : 0), 0], wet > 0.25 ? waterMat : dark, 20);

    // The windlass.
    const span = R + 0.28, axle = 1.62;
    const ropeAt: [number, number, number] = [0, axle, 0];
    const post = (x: number, top: number) => s.rod([x * 1.05, -0.1, 0.02], [x, top, (random() - 0.5) * 0.06 * (1 + mood.wear * 2)], 0.085, timber, 0.065);
    if (a.frame === 'broken') {
      for (const x of [-span, span]) s.rod([x, 0, 0], [x + (random() - 0.5) * 0.1, 0.35 + random() * 0.4, 0], 0.085, timber, 0.07);
      s.rod([-R - 0.5, 0.08, 0.7], [R * 0.6, wallH + 0.12, 0.25], 0.1, timber);
      s.rod([-R - 0.38, 0.1, 0.68], [-R - 0.4, 0.4, 0.62], 0.022, timber);
    } else if (a.frame === 'gallows') {
      for (const x of [-span, span]) { s.box([0.15, 2.15, 0.15], [x, 1.07, 0], timber); s.rod([x, 1.5, 0], [x * 0.55, 2.08, 0], 0.04, timber); }
      s.box([span * 2 + 0.5, 0.15, 0.17], [0, 2.2, 0], timber);
      const wheel = s.cylinder(0.17, 0.17, 0.06, [0, 1.88, 0], timber, 16);
      wheel.rotation.x = Math.PI / 2;
      s.ring(0.17, 0.02, [0, 1.88, 0], dark);
      s.rod([0, 2.13, 0], [0, 1.88, 0], 0.02, dark);
      s.rod([-0.17, 1.88, 0], [-span + 0.1, 0.9, 0.05], 0.016, ropeMat);
      s.rod([-span, 0.9, 0.1], [-span, 0.9, -0.1], 0.02, dark);
      ropeAt[0] = 0.17; ropeAt[1] = 1.88;
    } else {
      for (const x of [-span, span]) {
        post(x, axle - 0.08);
        for (const z of [-1, 1]) s.rod([x, axle - 0.12, 0], [x, axle + 0.2, z * 0.16], 0.05, timber, 0.035);
      }
      const drum = s.cylinder(0.095, 0.105, span * 2 + 0.5, [0, axle, 0], timber, 12);
      drum.rotation.z = Math.PI / 2;
      for (let i = 0; i < 7; i++) { const coil = s.ring(0.115, 0.018, [-0.13 + i * 0.037, axle, 0], ropeMat); coil.rotation.y = Math.PI / 2; }
      // Crank.
      const cx = span + 0.27, turn = random() * Math.PI * 2;
      const hy = axle + Math.sin(turn) * 0.3, hz = Math.cos(turn) * 0.3;
      s.rod([cx, axle, 0], [cx, hy, hz], 0.028, timber);
      s.rod([cx - 0.02, hy, hz], [cx + 0.26, hy, hz], 0.026, timber);
      ropeAt[2] = 0.11;
      if (a.frame === 'roofed') {
        const thatch = s.material('#b79a5c', { roughness: 1 });
        for (const x of [-span, span]) { s.rod([x, axle, -0.02], [x, 2.25, -0.02], 0.05, timber); }
        s.rod([-span - 0.3, 2.5, 0], [span + 0.3, 2.5, 0], 0.045, timber);
        for (const side of [-1, 1]) {
          const slab = s.box([span * 2 + 0.75, 0.07, 0.82], [0, 2.3, side * 0.33], thatch);
          slab.rotation.x = side * 0.62;
          for (let i = 0; i < 5; i++) s.box([0.05, 0.02, 0.84], [-span + i * span / 2, 2.345, side * 0.33], timber).rotation.x = side * 0.62;
        }
      }
    }

    // The bucket.
    const makeBucket = () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.105, 0], [0.12, 0.03], [0.15, 0.27], [0.135, 0.265], [0.11, 0.05]].map(([x, y]) => new THREE.Vector2(x, y)), 14), leather);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.014, 6, 16), dark);
      rim.rotation.x = Math.PI / 2; rim.position.y = 0.27;
      const bail = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.012, 6, 14, Math.PI), ropeMat);
      bail.position.y = 0.27;
      const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.13, 0.02, 14), wet > 0.25 ? waterMat : dark);
      fill.position.y = 0.23;
      for (const mesh of [body, rim, bail, fill]) { mesh.castShadow = true; g.add(mesh); }
      return g;
    };
    let swing: THREE.Group | null = null;
    const hasWinch = a.frame !== 'broken';
    const where = hasWinch ? a.bucket : 'ground';
    if (where === 'hanging') {
      swing = new THREE.Group();
      swing.position.set(...ropeAt);
      const drop = ropeAt[1] - 1.0;
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, drop - 0.4, 6), ropeMat);
      line.position.y = -(drop - 0.4) / 2;
      const bucket = makeBucket();
      bucket.position.y = -drop;
      swing.add(line, bucket);
      for (let i = 0; i < Math.round(wet * 4); i++) {
        const drip = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), waterMat);
        drip.position.set((random() - 0.5) * 0.2, -drop - 0.06 - random() * 0.22, (random() - 0.5) * 0.2);
        drip.scale.y = 1.8;
        swing.add(drip);
      }
      s.root.add(swing);
    } else if (where === 'down') {
      s.rod(ropeAt, [ropeAt[0], 0.1, ropeAt[2]], 0.014, ropeMat);
    } else if (where === 'rim') {
      const bucket = makeBucket();
      const angle = 0.9 + random() * 0.6;
      const bx = Math.cos(angle) * (R - thick / 2), bz = Math.sin(angle) * (R - thick / 2);
      bucket.position.set(bx, wallH + 0.01, bz);
      s.root.add(bucket);
      s.tube([ropeAt, [ropeAt[0] + 0.02, 1.0, ropeAt[2] + 0.02], [bx * 0.5, 0.86, bz * 0.5], [bx * 0.9, 1.02, bz * 0.9], [bx, 1.14, bz]], 0.014, ropeMat);
    } else {
      const bucket = makeBucket();
      bucket.rotation.z = Math.PI / 2 - 0.12;
      bucket.rotation.y = 0.5 + random();
      bucket.position.set(R + 0.55, 0.19, 0.75);
      s.root.add(bucket);
      if (wet > 0.25) s.cylinder(0.42, 0.42, 0.012, [R + 0.75, 0.047, 0.95], waterMat, 14).scale.z = 0.7;
      if (hasWinch) s.tube([ropeAt, [ropeAt[0] + 0.03, 0.95, 0.2], [R * 0.6, wallH + 0.04, R - 0.1], [R + 0.2, 0.08, 0.85], [R + 0.5, 0.06, 0.8]], 0.014, ropeMat);
      else s.ring(0.2, 0.02, [R + 0.2, 0.06, 1.05], ropeMat).rotation.x = Math.PI / 2;
    }

    // The trough.
    const tz = R + 0.62, tl = 1.7;
    const level = wet < 0.45 ? 0 : mix(0.4, 0.95, (wet - 0.45) / 0.55);
    if (a.trough === 'stone') {
      const th = 0.36, tw = 0.52;
      s.box([tl, 0.12, tw], [0, 0.06, tz], stone);
      for (const z of [-1, 1]) s.box([tl, th, 0.09], [0, th / 2, tz + z * (tw / 2 - 0.045)], stone);
      for (const x of [-1, 1]) s.box([0.1, th, tw], [x * (tl / 2 - 0.05), th / 2, tz], stone);
      // Worn dips in the front lip, where muzzles have rubbed for generations.
      for (let i = 0; i < 3; i++) s.ball([0.16, 0.035, 0.07], [-0.5 + i * 0.5 + (random() - 0.5) * 0.1, th, tz + tw / 2 - 0.045], dark, 10);
      if (level) s.box([tl - 0.2, 0.02, tw - 0.18], [0, 0.12 + (th - 0.14) * level, tz], waterMat);
      else if (wet < 0.15) s.ball([tl / 2 - 0.15, 0.12, tw / 2 - 0.1], [0.1, 0.16, tz], sand, 12);
      else s.box([tl - 0.2, 0.02, tw - 0.18], [0, 0.13, tz], dark);
    } else if (a.trough === 'log') {
      const log = s.cylinder(0.24, 0.27, tl, [0, 0.2, tz], timber, 12);
      log.rotation.z = Math.PI / 2;
      s.box([tl - 0.1, 0.06, 0.4], [0, 0.42, tz], dark);
      s.box([tl - 0.22, 0.03, 0.3], [0, 0.445, tz], level ? waterMat : wet < 0.15 ? sand : s.material('#4a3a2c'));
      for (const x of [-0.6, 0.6]) s.box([0.16, 0.14, 0.6], [x, 0.05, tz], timber);
    } else if (a.trough === 'jars') {
      const clay = s.material('#b0704a');
      const count = 3 + Math.round(mood.density * 2);
      for (let i = 0; i < count; i++) {
        const x = (i - (count - 1) / 2) * 0.46, k = mix(0.8, 1.1, random());
        s.lathe([[0, 0], [0.09 * k, 0], [0.19 * k, 0.2 * k], [0.2 * k, 0.34 * k], [0.12 * k, 0.5 * k], [0.1 * k, 0.56 * k], [0.13 * k, 0.6 * k]], clay, [x, 0.04, tz + (random() - 0.5) * 0.12]);
        s.cylinder(0.1 * k, 0.1 * k, 0.01, [x, 0.04 + 0.56 * k, tz], level ? waterMat : dark, 12);
      }
    }
    if (wet > 0.85) for (let i = 0; i < 4; i++) {
      const angle = random() * Math.PI * 2, d = 1.1 + random() * 0.5;
      s.cylinder(0.3, 0.3, 0.01, [Math.cos(angle) * d, 0.046, 0.35 + Math.sin(angle) * d * 1.1], waterMat, 12).scale.set(mix(0.5, 1.1, random()), 1, mix(0.4, 0.9, random()));
    }
    if (wet < 0.15) for (let i = 0; i < 4; i++) {
      const angle = Math.PI + (i - 1.5) * 0.5 + random() * 0.2;
      s.ball([0.55, 0.2 + random() * 0.18, 0.4], [Math.cos(angle) * (R + 0.15), 0.03, Math.sin(angle) * (R + 0.15) * -1 * (i % 2 ? 1 : -1)], sand, 12);
    }

    // Things left behind.
    const perch: [number, number, number] = a.frame === 'gallows' ? [0, 2.275, 0] : a.frame === 'roofed' ? [0, 2.545, 0] : a.frame === 'forked' ? [0, axle + 0.1, 0] : [0, wallH, R - 0.13];
    if (a.left === 'skins') {
      const hide = s.material('#8a5f3c', { roughness: 0.8 });
      for (let i = 0; i < 3; i++) {
        const x = -R - 0.45 - i * 0.05, z = -0.2 + i * 0.42;
        s.ball([0.2, 0.15, 0.3], [x, 0.18, z], hide, 12).rotation.y = random();
        s.cylinder(0.03, 0.05, 0.12, [x + 0.02, 0.3, z + 0.24], hide, 8).rotation.x = 0.9;
      }
      s.lathe([[0, 0], [0.08, 0], [0.16, 0.18], [0.14, 0.34], [0.06, 0.44], [0.08, 0.5]], s.material('#b0704a'), [-R - 0.2, 0.04, 0.95]);
    } else if (a.left === 'doves') {
      const white = s.material('#ece8df'), beak = s.material('#d98a4a');
      for (const side of [-1, 1]) {
        const x = perch[0] + side * (0.16 + random() * 0.2), y = perch[1], z = perch[2], face = side * (0.6 + random());
        const bird = new THREE.Group();
        bird.position.set(x, y, z); bird.rotation.y = face;
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), white); body.scale.set(0.85, 0.9, 1.5); body.position.y = 0.075; body.rotation.x = -0.35;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), white); head.position.set(0, 0.16, 0.08);
        const bill = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 5), beak); bill.position.set(0, 0.155, 0.125); bill.rotation.x = Math.PI / 2;
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.11), white); tail.position.set(0, 0.05, -0.13); tail.rotation.x = 0.3;
        for (const part of [body, head, bill, tail]) { part.castShadow = true; bird.add(part); }
        s.root.add(bird);
      }
    } else if (a.left === 'bundle') {
      s.rod([-R - 0.5, 0, 0.5], [-R + 0.08, 1.5, 0.28], 0.022, s.material('#6b4a2c'));
      s.ball([0.24, 0.18, 0.2], [-R - 0.42, 0.2, 0.8], s.material('#9c3b2e'), 12);
      s.ball([0.07, 0.06, 0.07], [-R - 0.42, 0.39, 0.8], s.material('#9c3b2e'), 8);
      s.box([0.3, 0.05, 0.22], [-R - 0.42, 0.045, 0.8], s.material('#c9b98c'));
    } else if (a.left === 'rags') {
      const colours = ['#c8322a', '#e8b21e', '#2a7fb8', '#3a9a5a', '#e8e2d2', '#d9589a'];
      const anchorX = a.frame === 'broken' ? -span : span, anchorY = a.frame === 'broken' ? 0.45 : 1.25;
      for (let i = 0; i < 9; i++) {
        const y = anchorY - (a.frame === 'broken' ? 0 : i * 0.07), len = 0.2 + random() * 0.22, angle = random() * Math.PI * 2;
        const rag = s.box([0.05, len, 0.012], [anchorX + Math.cos(angle) * 0.1, y - len / 2 + 0.02, Math.sin(angle) * 0.1], s.material(colours[i % colours.length], { side: THREE.DoubleSide }));
        rag.rotation.set((random() - 0.5) * 0.5, angle, (random() - 0.5) * 0.5);
      }
    }

    const sway = mix(0.01, 0.14, mood.energy), phase = random() * 6;
    if (swing) swing.rotation.z = Math.sin(phase) * sway;
    return s.finish({ footprint: 1.9, update: (_dt, time) => { if (swing) { swing.rotation.z = Math.sin(time * 1.9 + phase) * sway; swing.rotation.x = Math.cos(time * 1.3 + phase) * sway * 0.4; } } });
  },
});
