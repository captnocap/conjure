import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { type Block, HALF_GAUGE, RAIL_TOP, blocks, canvasTexture, snowOf, track, weeds } from './rail';

export default defineThing({
  questions: {
    type: choice('What is the stop built from?', {
      timber: 'Heavy timber baulks: two raked posts and a cross beam, painted red and white.',
      steel: 'A friction stop bent up out of old rail, bolted to the track, with a red steel beam.',
      concrete: 'A massive concrete block with black-and-yellow chevrons and rubber pads.',
      mound: 'Just an earth and cinder mound with a sleeper chained across the rails in front of it.',
    }),
    lamp: choice('What about its red lamp?', {
      lit: 'Lit, a steady red point above the beam.',
      dark: 'Fitted but dark.',
      smashed: 'Smashed and hanging by its bracket.',
      none: 'It never had one.',
    }),
    impact: choice('What has hit it?', {
      untouched: 'Nothing: the paint is whole and the beam is square.',
      nudged: 'Something nudged it hard: the beam is knocked askew and the frame shoved back.',
      smashed: 'It was run straight through: the beam lies broken beyond the rail ends and the frame is flattened.',
      wheelset: 'A lone wheelset that rolled the length of the siding rests against it.',
    }),
    growth: choice('What has grown here or been left here?', {
      bare: 'Nothing, the ballast is kept clean.',
      weeds: 'Tall grass and thistles through the last sleepers.',
      sapling: 'A young birch has rooted between the rails.',
      sleepers: 'A stack of spare sleepers and a coil of old cable.',
      memorial: 'A wreath on the beam and jar candles at its foot.',
      armchair: 'Somebody has set an armchair here facing the track, with bottles beside it.',
    }),
    sign: choice('What sign stands over it?', {
      none: 'No sign.',
      stop: 'A board reading STOP.',
      end: 'A board reading END OF LINE.',
      halt: 'A red disc reading HALT.',
      zero: 'A kilometre post reading 0.0.',
      stripes: 'A red-and-white striped warning board.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const snow = snowOf(s);
    const length = 5.6;
    const SX = 1.2; // face of the stop along the track
    track(s, { length, ragged: true });

    const red = s.material(new THREE.Color('#c22c22').lerp(new THREE.Color('#8a5a48'), mood.wear * 0.5), { roughness: 0.7 });
    const white = s.material('#e9e6da');
    const iron = s.material('#2b2c2e', { roughness: 0.7, metalness: 0.35 });
    const wood = s.material(new THREE.Color('#5b4634').lerp(new THREE.Color('#8b8478'), mood.wear * 0.4), { roughness: 0.95 });
    const beamY = RAIL_TOP + 1.02;

    // The stop is its own assembly so a collision can shove or flatten the whole thing.
    const stop = new Sculpture(context);
    s.root.add(stop.root);
    const smashed = a.impact === 'smashed', nudged = a.impact === 'nudged';
    const beam = new THREE.Group();
    const addBeam = (mesh: THREE.Object3D) => { beam.add(mesh); return mesh; };
    const stripeTexture = (horizontal: boolean) => canvasTexture(256, 64, (ctx, w, h) => {
      ctx.fillStyle = '#c22c22'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ece9de';
      if (horizontal) { ctx.fillRect(0, 0, w * 0.18, h); ctx.fillRect(w * 0.82, 0, w * 0.18, h); ctx.fillRect(w * 0.41, 0, w * 0.18, h); }
      for (let i = 0; i < mood.wear * 40; i++) { ctx.fillStyle = `rgba(80,60,48,${random() * 0.5})`; ctx.fillRect(random() * w, random() * h, 4 + random() * 22, 3 + random() * 8); }
    });

    if (a.type === 'timber' || a.type === 'steel') {
      const timber = a.type === 'timber';
      const frameMaterial = timber ? wood : red;
      for (const side of [-1, 1]) {
        const z = side * HALF_GAUGE;
        if (timber) {
          stop.box([0.3, 1.75, 0.3], [SX + 0.2, 0.9, z], frameMaterial);
          stop.rod([SX + 0.25, beamY + 0.1, z], [SX + 1.9, 0.15, z], 0.13, frameMaterial);
          stop.rod([SX + 0.2, 0.6, z], [SX + 1.2, 0.6, z], 0.09, frameMaterial);
        } else {
          stop.tube([[SX - 1.5, RAIL_TOP + 0.05, z], [SX - 0.5, RAIL_TOP + 0.5, z], [SX + 0.1, beamY, z], [SX + 0.45, beamY - 0.2, z], [SX + 1.3, RAIL_TOP + 0.05, z]], 0.07, frameMaterial);
          stop.rod([SX + 0.12, beamY - 0.1, z], [SX + 0.12, RAIL_TOP, z], 0.06, frameMaterial);
          stop.box([0.5, 0.12, 0.22], [SX - 1.45, RAIL_TOP + 0.02, z], iron);
        }
      }
      stop.rod([SX + (timber ? 0.9 : 0.6), timber ? 0.75 : RAIL_TOP + 0.6, -HALF_GAUGE], [SX + (timber ? 0.9 : 0.6), timber ? 0.75 : RAIL_TOP + 0.6, HALF_GAUGE], 0.05, timber ? wood : red);
      const beamMesh = new THREE.Mesh(new THREE.BoxGeometry(timber ? 0.36 : 0.24, timber ? 0.42 : 0.36, 2.8), [
        new THREE.MeshStandardMaterial({ map: stripeTexture(true), roughness: 0.8 }), new THREE.MeshStandardMaterial({ map: stripeTexture(true), roughness: 0.8 }),
        red, red, white, white,
      ]);
      beamMesh.castShadow = true;
      addBeam(beamMesh);
      for (const side of [-1, 1]) {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.42, 12), iron);
        stem.rotation.z = Math.PI / 2;
        stem.position.set(-0.36, 0, side * 0.87);
        const face = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.07, 20), iron);
        face.rotation.z = Math.PI / 2;
        face.position.set(-0.6, 0, side * 0.87);
        stem.castShadow = face.castShadow = true;
        addBeam(stem); addBeam(face);
      }
      beam.position.set(SX, beamY, 0);
      stop.root.add(beam);
    } else if (a.type === 'concrete') {
      const side = new THREE.Shape([[0, 0], [1.7, 0], [1.7, 0.9], [0.9, 1.75], [0, 1.75]].map(([x, y]) => new THREE.Vector2(x, y)));
      const block = new THREE.ExtrudeGeometry(side, { depth: 3, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 });
      block.translate(SX, 0.1, -1.5);
      stop.mesh(block, s.material(new THREE.Color('#aaa9a2').lerp(new THREE.Color('#77766e'), mood.wear * 0.5), { roughness: 0.95 }));
      const chevrons = canvasTexture(512, 256, (ctx, w, h) => {
        ctx.fillStyle = '#e7b81c'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#19191b';
        for (let i = -4; i < 12; i++) { ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64 + 32, 0); ctx.lineTo(i * 64 + 32 + h, h); ctx.lineTo(i * 64 + h, h); ctx.fill(); }
        for (let i = 0; i < mood.wear * 60; i++) { ctx.fillStyle = `rgba(150,148,140,${random() * 0.8})`; ctx.fillRect(random() * w, random() * h, 6 + random() * 40, 4 + random() * 16); }
      });
      const plate = stop.mesh(new THREE.PlaneGeometry(2.9, 1.0), new THREE.MeshStandardMaterial({ map: chevrons, roughness: 0.8 }), [SX - 0.06, 1.25, 0]);
      plate.rotation.y = -Math.PI / 2;
      for (const z of [-0.87, 0.87]) stop.box([0.16, 0.5, 0.5], [SX - 0.12, beamY, z], s.material('#1c1c1e', { roughness: 0.9 }));
      beam.position.set(SX, beamY, 0);
    } else {
      const earth = s.material(new THREE.Color('#4d463f').lerp(new THREE.Color('#eef1f3'), snow * 0.5), { roughness: 1 });
      const mound = new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const points = mound.attributes.position;
      for (let i = 0; i < points.count; i++) points.setXYZ(i, points.getX(i) * (1 + (random() - 0.5) * 0.2), points.getY(i) * (1 + (random() - 0.5) * 0.3), points.getZ(i));
      mound.computeVertexNormals();
      const hill = stop.mesh(mound, earth, [SX + 1.5, 0.05, 0]);
      hill.scale.set(1.6, 0.72, 2.2);
      blocks(stop.root, new THREE.MeshStandardMaterial({ color: '#77706a', roughness: 1, flatShading: true }), Array.from({ length: 40 }, () => { const t = random() * Math.PI * 2, r = Math.sqrt(random()); return { size: [0.16, 0.12, 0.16] as const, at: [SX + 1.5 + Math.cos(t) * r * 1.55, 0.08 + (1 - r * r) * 0.68, Math.sin(t) * r * 2.1] as const, rot: [random() * 3, random() * 3, 0] as const }; }), new THREE.DodecahedronGeometry(0.6, 0));
      const baulk = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 2.7), wood);
      baulk.castShadow = true;
      addBeam(baulk);
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 1.4), red);
      board.position.set(0.3, 0.75, 0);
      addBeam(board);
      for (const z of [-0.5, 0.5]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), wood); post.position.set(0.36, 0.4, z); addBeam(post); }
      for (const z of [-HALF_GAUGE, HALF_GAUGE]) for (let i = 0; i < 4; i++) { const link = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 12), iron); link.position.set(-0.05 + i * 0.03, 0.12 - i * 0.02, z); link.rotation.set(i % 2 ? 0 : Math.PI / 2, 0, i * 0.5); addBeam(link); }
      beam.position.set(SX, RAIL_TOP + 0.12, 0);
      stop.root.add(beam);
    }

    // Lamp on a short bracket above the beam.
    let lampMaterial: THREE.MeshStandardMaterial | null = null;
    if (a.lamp !== 'none') {
      const lit = a.lamp === 'lit';
      lampMaterial = new THREE.MeshStandardMaterial({ color: lit ? '#ff3b2b' : '#6a1f1a', emissive: '#ff2a1a', emissiveIntensity: lit ? 2 : 0, roughness: 0.3 });
      const lamp = new THREE.Group();
      const add = (mesh: THREE.Mesh, x: number, y: number) => { mesh.position.set(x, y, 0); mesh.castShadow = true; lamp.add(mesh); };
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), iron), 0, 0.25);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.24), iron), 0, 0.62);
      add(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.12, 4), iron), 0, 0.83);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 10), lampMaterial);
      lens.scale.x = 0.5;
      add(lens, -0.13, 0.62);
      const top = a.type === 'concrete' ? 1.85 - beamY : a.type === 'mound' ? 1.0 : 0.18;
      lamp.position.set(a.type === 'concrete' ? 0.4 : a.type === 'mound' ? 0.3 : 0, top, a.type === 'mound' ? 0 : 0.0);
      if (a.lamp === 'smashed') { lamp.rotation.set(0.5, 0, 2.2); lamp.position.y += 0.1; lamp.position.z += 0.35; }
      if (a.type === 'concrete') { lamp.position.add(beam.position); stop.root.add(lamp); } else beam.add(lamp);
    }

    // Collision.
    if (nudged) {
      stop.root.position.x += 0.22;
      stop.root.rotation.z = -0.07;
      beam.rotation.set(0.1, 0.16, -0.12);
      const chips: Block[] = Array.from({ length: 16 }, () => ({ size: [mix(0.1, 0.4, random()), 0.03, mix(0.03, 0.08, random())] as const, at: [SX - 0.4 + (random() - 0.5) * 1.6, 0.34, (random() - 0.5) * 2.4] as const, rot: [0, random() * 3, 0] as const }));
      blocks(s.root, a.type === 'concrete' ? s.material('#aaa9a2') : red, chips);
    } else if (smashed) {
      if (a.type === 'concrete') {
        stop.root.rotation.z = -0.3;
        stop.root.position.set(1.0, 0.25, 0);
      } else if (a.type === 'mound') {
        beam.position.set(SX + 1.1, 0.85, 0.3);
        beam.rotation.set(0.5, 0.5, -0.7);
      } else {
        stop.root.rotation.z = -1.05;
        stop.root.position.set(SX + 0.55, -1.0, 0.1);
        stop.root.rotation.y = 0.12;
      }
      stop.root.position.y += 0.12 - new THREE.Box3().setFromObject(stop.root).min.y;
      const debris: Block[] = Array.from({ length: 26 }, () => ({ size: [mix(0.15, 0.7, random()), mix(0.04, 0.14, random()), mix(0.05, 0.2, random())] as const, at: [SX + (random() - 0.3) * 3.4, 0.3, (random() - 0.5) * 3] as const, rot: [random() * 0.4, random() * 3, random() * 0.4] as const }));
      blocks(s.root, a.type === 'concrete' ? s.material('#aaa9a2') : a.type === 'steel' ? red : wood, debris);
      // The rails themselves curl up past where the stop stood.
      for (const z of [-HALF_GAUGE, HALF_GAUGE]) s.tube([[length / 2 - 0.3, RAIL_TOP - 0.06, z], [length / 2 + 0.3, RAIL_TOP + 0.05, z * 1.05], [length / 2 + 0.8, RAIL_TOP + 0.45, z * 1.2]], 0.05, s.material('#6a4a34', { metalness: 0.2 }));
    } else if (a.impact === 'wheelset') {
      const rusty = s.material('#6b4630', { roughness: 0.9, metalness: 0.2 });
      const x = a.type === 'concrete' ? SX - 0.66 : SX - 1.3;
      for (const z of [-HALF_GAUGE, HALF_GAUGE]) {
        s.cylinder(0.46, 0.46, 0.13, [x, RAIL_TOP + 0.46, z], rusty, 24).rotation.x = Math.PI / 2;
        s.cylinder(0.5, 0.5, 0.03, [x, RAIL_TOP + 0.46, z - Math.sign(z) * 0.07], rusty, 24).rotation.x = Math.PI / 2;
      }
      s.rod([x, RAIL_TOP + 0.46, -1.0], [x, RAIL_TOP + 0.46, 1.0], 0.08, rusty);
    }

    // Sign.
    if (a.sign !== 'none') {
      const post = s.material('#d8d5c9');
      const px = SX + (a.type === 'mound' ? 3.2 : 2.3), pz = -1.75;
      const tall = 2.7;
      s.rod([px, 0, pz], [px, tall, pz], 0.045, post);
      let board: THREE.Mesh;
      if (a.sign === 'halt') {
        const disc = canvasTexture(256, 256, (ctx) => {
          ctx.fillStyle = '#c22c22'; ctx.beginPath(); ctx.arc(128, 128, 126, 0, 7); ctx.fill();
          ctx.strokeStyle = '#f0ede2'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(128, 128, 108, 0, 7); ctx.stroke();
          ctx.fillStyle = '#f0ede2'; ctx.font = 'bold 76px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('HALT', 128, 132);
        });
        board = s.mesh(new THREE.CircleGeometry(0.5, 28), new THREE.MeshStandardMaterial({ map: disc, roughness: 0.7, side: THREE.DoubleSide }), [px - 0.06, tall - 0.4, pz]);
      } else if (a.sign === 'stripes') {
        const stripes = canvasTexture(256, 128, (ctx, w, h) => { ctx.fillStyle = '#ece9de'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#c22c22'; for (let i = -3; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * 60, 0); ctx.lineTo(i * 60 + 30, 0); ctx.lineTo(i * 60 + 30 + h, h); ctx.lineTo(i * 60 + h, h); ctx.fill(); } });
        board = s.mesh(new THREE.PlaneGeometry(1.3, 0.65), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.7, side: THREE.DoubleSide }), [px - 0.06, tall - 0.4, pz]);
      } else {
        const text = { stop: 'STOP', end: 'END OF LINE', zero: '0.0' }[a.sign];
        board = a.sign === 'zero' ? s.label(text, 0.7, 0.5, [px - 0.06, tall - 0.3, pz], '#19191b', '#f0ede2') : s.label(text, a.sign === 'end' ? 1.7 : 1.1, 0.5, [px - 0.06, tall - 0.3, pz], '#f0ede2', '#c22c22');
      }
      board.rotation.y = -Math.PI / 2 + 0.5;
      board.rotation.z = (random() - 0.5) * mood.wear * 0.3;
    }

    // Growth and leavings. A little grass comes with age whatever was asked.
    const tufts: { at: readonly [number, number, number]; size: number }[] = [];
    const weedy = a.growth === 'weeds';
    const count = weedy ? 60 : Math.round(mood.wear * 16) + (a.growth === 'bare' ? 0 : 5);
    for (let i = 0; i < count; i++) tufts.push({ at: [mix(weedy ? -2.6 : 0, 3.6, random()), 0.2, (random() - 0.5) * 3.6], size: mix(0.3, weedy ? 1.5 : 0.7, random()) });
    if (tufts.length) weeds(s, tufts);
    if (weedy) {
      const thistle = s.material('#8a5a9a');
      for (let i = 0; i < 7; i++) { const x = mix(-1.5, 2.6, random()), z = (random() - 0.5) * 3.2, h = mix(0.8, 1.5, random()); s.rod([x, 0.2, z], [x + 0.05, h, z], 0.015, s.material('#62713f')); s.ball([0.07, 0.08, 0.07], [x + 0.05, h, z], thistle, 8); }
    } else if (a.growth === 'sapling') {
      const bark = new THREE.MeshStandardMaterial({ map: canvasTexture(32, 256, (ctx, w, h) => { ctx.fillStyle = '#e8e6de'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#2a2a2a'; for (let i = 0; i < 26; i++) ctx.fillRect(random() * w, random() * h, 6 + random() * 14, 2 + random() * 4); }), roughness: 0.8 });
      const bx = -0.6, bz = 0.15;
      s.tube([[bx, 0.2, bz], [bx + 0.08, 1.4, bz - 0.05], [bx - 0.05, 2.8, bz + 0.1], [bx + 0.1, 4.2, bz]], 0.06, bark);
      const twig = s.material('#4a3a33');
      const leaves: Block[] = [];
      for (let i = 0; i < 16; i++) {
        const y = mix(1.5, 4.1, random()), angle = random() * Math.PI * 2, reach = mix(0.5, 1.3, random()) * (1.2 - y / 5);
        const tip: [number, number, number] = [bx + Math.cos(angle) * reach, y + reach * 0.7, bz + Math.sin(angle) * reach];
        s.rod([bx, y, bz], tip, 0.018, twig, 0.006);
        const n = mood.warmth > 0.35 ? 7 : 1;
        for (let k = 0; k < n; k++) leaves.push({ size: [0.14, 0.02, 0.1], at: [tip[0] + (random() - 0.5) * 0.5, tip[1] - random() * 0.5, tip[2] + (random() - 0.5) * 0.5], rot: [random() * 3, random() * 3, 0], color: new THREE.Color(mood.warmth > 0.7 ? '#d6a62a' : '#8fae3f').offsetHSL((random() - 0.5) * 0.05, 0, 0) });
      }
      blocks(s.root, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), leaves);
    } else if (a.growth === 'sleepers') {
      const stack: Block[] = [];
      for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 3 - (layer === 2 ? 1 : 0); i++)
        stack.push(layer % 2 ? { size: [0.25, 0.15, 2.5], at: [-0.4 + i * 0.9 + (random() - 0.5) * 0.1, 0.1 + layer * 0.16, 3.0], color: '#4b3b2d' } : { size: [2.5, 0.15, 0.25], at: [0.5, 0.1 + layer * 0.16, 2.2 + i * 0.75 + (random() - 0.5) * 0.1], rot: [0, (random() - 0.5) * 0.1, 0], color: '#54432f' });
      blocks(s.root, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }), stack);
      for (let i = 0; i < 4; i++) s.ring(0.4 - i * 0.02, 0.04, [-1.9, 0.08 + i * 0.07, 2.6], iron).rotation.x = Math.PI / 2;
    } else if (a.growth === 'memorial') {
      const wx = a.type === 'concrete' ? SX - 0.1 : SX - (a.type === 'mound' ? 0.2 : 0.22);
      const wy = a.type === 'mound' ? RAIL_TOP + 0.75 : beamY + 0.05;
      const wreath = s.ring(0.34, 0.09, [wx, wy, 0], s.material('#35603a'));
      wreath.rotation.y = Math.PI / 2;
      for (let i = 0; i < 9; i++) { const t = (i / 9) * Math.PI * 2; s.ball([0.07, 0.07, 0.07], [wx - 0.07, wy + Math.cos(t) * 0.34, Math.sin(t) * 0.34], s.material(i % 3 ? '#c8322c' : '#f0ead6'), 8); }
      s.box([0.02, 0.5, 0.1], [wx - 0.08, wy - 0.5, 0.05], s.material('#7a2c8a')).rotation.x = 0.2;
      for (let i = 0; i < 5; i++) {
        const x = SX - 0.9 + (random() - 0.5) * 0.5, z = (random() - 0.5) * 1.6;
        s.cylinder(0.05, 0.05, 0.14, [x, 0.4, z], new THREE.MeshStandardMaterial({ color: '#d0452c', emissive: '#ff7a2a', emissiveIntensity: mix(0.5, 1.6, random()), roughness: 0.4 }), 10);
      }
      s.box([0.02, 0.3, 0.22], [SX - 0.75, 0.46, 0.75], s.material('#ece6d4')).rotation.z = 0.35;
    } else if (a.growth === 'armchair') {
      const cloth = s.material(new THREE.Color('#9a7b3c').lerp(new THREE.Color('#6b6558'), mood.wear * 0.5), { roughness: 1 });
      const chair = new Sculpture(context);
      chair.box([0.8, 0.3, 0.8], [0, 0.3, 0], cloth);
      chair.box([0.8, 0.75, 0.2], [0, 0.65, -0.38], cloth).rotation.x = -0.12;
      for (const x of [-0.45, 0.45]) chair.box([0.18, 0.55, 0.85], [x, 0.42, 0], cloth);
      chair.box([0.6, 0.12, 0.6], [0, 0.5, 0.05], s.material('#b59955'));
      chair.root.position.set(-0.6, 0.02, 2.75);
      chair.root.rotation.y = Math.PI * 0.85;
      s.root.add(chair.root);
      const glass = s.material('#3f6a45', { roughness: 0.25 });
      for (let i = 0; i < 4; i++) { const x = -1.6 + random() * 0.6, z = 2.3 + random() * 0.8; s.cylinder(0.04, 0.04, 0.2, [x, 0.1, z], glass, 8); s.cylinder(0.015, 0.03, 0.1, [x, 0.25, z], glass, 8); }
      s.box([0.4, 0.3, 0.3], [0.2, 0.15, 3.1], wood);
    }

    if (snow > 0.35 && !smashed) {
      const cap = new THREE.MeshStandardMaterial({ color: '#f3f6f8', roughness: 0.95 });
      if (a.type === 'timber' || a.type === 'steel') { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05 + snow * 0.06, 2.7), cap); m.position.y = 0.2; beam.add(m); }
      if (a.type === 'concrete') stop.box([0.95, 0.06 + snow * 0.06, 3], [SX + 0.45, 1.9, 0], cap);
      s.ball([1.6, 0.25 + snow * 0.2, 1.6], [SX + 2.6, 0, 0.4], cap, 12);
    }

    const pulse = mix(0.8, 5, mood.energy);
    const lit = a.lamp === 'lit';
    return s.finish({ update: (_dt, time) => { if (lampMaterial && lit) lampMaterial.emissiveIntensity = 1.7 + Math.sin(time * pulse) * 0.4; } });
  },
});
