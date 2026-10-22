import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const INSCRIPTIONS = { justice: 'JUSTICE', latin: 'FIAT JUSTITIA', trust: 'IN TRUST', lex: 'LEX', blank: '', graffiti: 'LIARS' } as const;

export default defineThing({
  questions: {
    form: choice('What does the statue show?', {
      figure: 'The full robed figure of Justice, a balance held high in one hand and a sword in the other.',
      balance: 'No figure: only a large balance on a column stand, two pans on chains.',
      hand: 'A single giant forearm rising from the plinth, its fist gripping the balance.',
    }),
    material: choice('What is it made of?', {
      bronze: 'Dark bronze, greening where the weather gets at it.',
      marble: 'White marble, cool and classical.',
      gilt: 'Cheap bright gilt, shiny as a trophy.',
      iron: 'Black cast iron, severe.',
      stone: 'Grey weathered sandstone, soft-edged.',
    }),
    tilt: score('How do the pans hang?', ['One pan slammed right down', 'Leaning that way', 'Perfectly level', 'Leaning the other way', 'The other pan slammed right down']),
    load: choice('What is in the pans?', {
      empty: 'Nothing; they are empty.',
      heart: 'A red heart in one and a white feather in the other.',
      coins: 'A heap of gold coins in one pan.',
      weights: 'A stack of brass weights in one pan.',
      birds: 'Pigeons have settled on the beam and in a pan.',
      skull: 'A skull in one pan.',
    }),
    eyes: choice('If there is a figure, what of her blindfold?', {
      blindfold: 'Bound tight across her eyes.',
      slipped: 'Slipped down around her neck: she can see.',
      none: 'She has none, and stares straight ahead.',
    }),
    sword: choice('If there is a figure, how does she hold the sword?', {
      raised: 'Raised upright, ready.',
      lowered: 'Point down, resting on the ground.',
      broken: 'Snapped off short above the hilt.',
      none: 'She has no sword at all.',
    }),
    plinth: choice('What does it stand on?', {
      column: 'A tall round stone column.',
      steps: 'A broad stepped stone base, civic and solid.',
      trophy: 'A small polished wooden base with a brass plaque: a desk ornament.',
      rough: 'A rough-hewn block of rock.',
    }),
    inscription: choice('What is written on the plinth?', {
      justice: 'JUSTICE, carved.', latin: 'FIAT JUSTITIA, carved.', trust: 'IN TRUST, as on a bank.', lex: 'LEX, carved.', blank: 'Nothing.', graffiti: 'LIARS, sprayed across it in red paint.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const base = { bronze: '#6a4a2b', marble: '#ebe8df', gilt: '#e6bb38', iron: '#2b2c30', stone: '#a59f90' }[a.material];
    const tint = new THREE.Color(base);
    if (a.material === 'bronze') tint.lerp(new THREE.Color('#4f9a82'), mood.wear * 0.75);
    if (a.material === 'gilt') tint.lerp(new THREE.Color('#9a8a5a'), mood.wear * 0.5);
    if (a.material === 'marble' || a.material === 'stone') tint.lerp(new THREE.Color('#7f8266'), mood.wear * 0.3);
    const body = new THREE.MeshStandardMaterial({
      color: tint,
      metalness: { bronze: 0.75, marble: 0, gilt: 0.95, iron: 0.6, stone: 0 }[a.material],
      roughness: { bronze: 0.45, marble: 0.4, gilt: 0.18, iron: 0.6, stone: 0.95 }[a.material] + mood.wear * 0.2,
    });
    const shade = body.clone(); shade.color.multiplyScalar(0.72);
    const stoneCol = a.material === 'marble' ? '#cfcabd' : a.material === 'stone' ? '#8f8a7c' : '#b9b3a4';
    const stone = s.material(stoneCol, { roughness: 0.95 });

    // Plinth.
    let P = 0;
    if (a.plinth === 'column') {
      P = 1.5;
      s.box([0.9, 0.16, 0.9], [0, 0.08, 0], stone);
      s.lathe([[0.4, 0.16], [0.36, 0.26], [0.31, 0.32], [0.3, 1.26], [0.36, 1.32], [0.42, 1.4], [0.42, P], [0, P]], stone);
      for (let i = 0; i < 14; i++) s.box([0.035, 0.9, 0.02], [Math.sin(i * 0.4488) * 0.3, 0.8, Math.cos(i * 0.4488) * 0.3], s.material('#8f897a')).rotation.y = i * 0.4488;
    } else if (a.plinth === 'steps') {
      P = 0.9;
      s.box([2.2, 0.2, 2.2], [0, 0.1, 0], stone); s.box([1.7, 0.2, 1.7], [0, 0.3, 0], stone);
      s.box([1.1, 0.42, 1.1], [0, 0.61, 0], stone); s.box([1.25, 0.08, 1.25], [0, 0.86, 0], stone);
    } else if (a.plinth === 'trophy') {
      P = 0.42;
      const wood = s.material('#4a2616', { roughness: 0.3 });
      s.box([1.15, 0.1, 0.95], [0, 0.05, 0], wood); s.box([1.0, 0.26, 0.8], [0, 0.23, 0], wood); s.box([1.08, 0.06, 0.88], [0, 0.39, 0], wood);
    } else {
      P = 1.0;
      const geometry = new THREE.DodecahedronGeometry(0.75, 1);
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * mix(0.8, 1.05, random()), Math.max(-0.5, Math.min(0.5, pos.getY(i) * 0.9)), pos.getZ(i) * mix(0.8, 1.05, random()));
      geometry.computeVertexNormals();
      s.mesh(geometry, stone, [0, 0.5, 0]);
      s.box([0.75, 0.06, 0.75], [0, 1.0, 0], stone);
    }
    if (a.inscription !== 'blank') {
      const graffiti = a.inscription === 'graffiti';
      const y = { column: 0.8, steps: 0.6, trophy: 0.23, rough: 0.5 }[a.plinth];
      const z = { column: 0.325, steps: 0.555, trophy: 0.405, rough: 0.72 }[a.plinth];
      const w = { column: 0.5, steps: 0.95, trophy: 0.6, rough: 0.8 }[a.plinth];
      const plaque = a.plinth === 'trophy' && !graffiti;
      const label = s.label(INSCRIPTIONS[a.inscription], graffiti ? w * 1.2 : w, graffiti ? 0.3 : 0.17, [0, y, z], graffiti ? '#d81e2c' : plaque ? '#2a1c08' : '#4b473d', plaque ? '#c9a24a' : stoneCol);
      if (graffiti) label.rotation.z = (random() - 0.5) * 0.3;
    }

    // A balance: beam group whose pans stay hanging plumb.
    const angle = (a.tilt - 0.5) * 2 * 0.5;
    const pans: THREE.Group[] = [];
    const balance = (at: [number, number, number], len: number, drop: number, panR: number, yaw: number) => {
      const beam = new THREE.Group();
      const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, p: [number, number, number], r: [number, number, number] = [0, 0, 0]) => {
        const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...p); mesh.rotation.set(...r); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
      };
      const t = len * 0.022;
      add(beam, new THREE.CylinderGeometry(t * 0.6, t * 0.6, len, 8), body, [0, 0, 0], [0, 0, Math.PI / 2]);
      add(beam, new THREE.BoxGeometry(len * 0.2, t * 3.4, t * 1.4), body, [0, 0, 0]);
      for (const side of [-1, 1]) {
        add(beam, new THREE.SphereGeometry(t * 1.5, 10, 8), body, [side * len / 2, 0, 0]);
        const lost = mood.wear > 0.82 && side === (context.seed % 2 ? 1 : -1);
        const pan = new THREE.Group(); pan.position.set(side * len / 2, 0, 0); pan.rotation.z = -angle; beam.add(pan); pans.push(pan);
        for (let i = 0; i < 3; i++) {
          const ang = i * 2.094 + 0.5;
          const from = new THREE.Vector3(0, 0, 0), to = new THREE.Vector3(Math.sin(ang) * panR * 0.9, -drop * (lost ? mix(0.3, 0.8, random()) : 1), Math.cos(ang) * panR * 0.9);
          const d = to.clone().sub(from);
          const chain = add(pan, new THREE.CylinderGeometry(t * 0.22, t * 0.22, d.length(), 5), body, from.add(to).multiplyScalar(0.5).toArray() as [number, number, number]);
          chain.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
        }
        if (lost) continue;
        add(pan, new THREE.LatheGeometry([[0, -0.3], [0.5, -0.26], [0.85, -0.12], [1, 0.03], [1.04, 0.03]].map(([r, y]) => new THREE.Vector2(r * panR, y * panR)), 20), Object.assign(body.clone(), { side: THREE.DoubleSide }), [0, -drop, 0]);
        // Load: the heavier thing sits in the lower pan.
        const low = side === (angle >= 0 ? -1 : 1);
        const py = -drop - panR * 0.2;
        const k = panR;
        if (a.load === 'heart') {
          if (low) { const red = s.material('#c21f2b', { roughness: 0.4 }); for (const sx of [-1, 1]) add(pan, new THREE.SphereGeometry(k * 0.3, 12, 10), red, [sx * k * 0.2, py + k * 0.5, 0]); add(pan, new THREE.ConeGeometry(k * 0.46, k * 0.6, 12), red, [0, py + k * 0.2, 0], [Math.PI, 0, 0]); }
          else { const white = s.material('#f6f4ec'); add(pan, new THREE.BoxGeometry(k * 1.5, k * 0.03, k * 0.4), white, [0, py + k * 0.25, 0], [0.3, 0.5, 0.25]); add(pan, new THREE.CylinderGeometry(k * 0.02, k * 0.02, k * 1.7, 5), white, [0, py + k * 0.26, 0], [0.3, 0.5, Math.PI / 2 + 0.25]); }
        } else if (a.load === 'coins' && low) {
          const gold = s.material('#e9bf3c', { metalness: 0.9, roughness: 0.25, emissive: '#6b4a00', emissiveIntensity: 0.3 });
          for (let i = 0; i < 16; i++) { const r = Math.sqrt(random()) * k * 0.6, th = random() * 6.28; add(pan, new THREE.CylinderGeometry(k * 0.2, k * 0.2, k * 0.06, 12), gold, [Math.sin(th) * r, py + k * (0.15 + (0.6 - r / k) * 0.8 * random()), Math.cos(th) * r], [(random() - 0.5) * 0.8, 0, (random() - 0.5) * 0.8]); }
        } else if (a.load === 'weights' && low) {
          const brass = s.material('#b88a34', { metalness: 0.8, roughness: 0.35 });
          for (let i = 0; i < 3; i++) { const r = k * (0.42 - i * 0.1); add(pan, new THREE.CylinderGeometry(r * 0.8, r, r * 1.1, 14), brass, [(i - 1) * k * 0.42, py + k * 0.1 + r * 0.55, (i % 2) * k * 0.2]); add(pan, new THREE.SphereGeometry(r * 0.3, 8, 6), brass, [(i - 1) * k * 0.42, py + k * 0.1 + r * 1.3, (i % 2) * k * 0.2]); }
        } else if (a.load === 'skull' && low) {
          const bone = s.material('#e8e1cc');
          const skull = add(pan, new THREE.SphereGeometry(k * 0.48, 14, 10), bone, [0, py + k * 0.58, 0]); skull.scale.set(0.9, 1, 1.1);
          add(pan, new THREE.BoxGeometry(k * 0.5, k * 0.3, k * 0.4), bone, [0, py + k * 0.22, k * 0.2]);
          for (const sx of [-1, 1]) add(pan, new THREE.SphereGeometry(k * 0.13, 8, 6), s.material('#17181b'), [sx * k * 0.18, py + k * 0.55, k * 0.44]);
        } else if (a.load === 'birds' && low) bird(pan, [0, py + k * 0.2, 0], k * 0.5);
      }
      if (a.load === 'birds') { bird(beam, [len * 0.2, t * 0.6, 0], panR * 0.5); if (random() > 0.4) bird(beam, [-len * 0.32, t * 0.6, 0], panR * 0.45); }
      beam.position.set(...at); beam.rotation.set(0, yaw, angle);
      s.root.add(beam);
      return beam;
    };
    function bird(parent: THREE.Object3D, at: [number, number, number], k: number) {
      const grey = s.material(['#7d8590', '#9aa0a6', '#5f666e'][Math.floor(random() * 3)]);
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(k * 0.5, 10, 8), grey); b.scale.set(0.75, 0.75, 1.25); b.position.y = k * 0.4; b.castShadow = true;
      const h = new THREE.Mesh(new THREE.SphereGeometry(k * 0.24, 8, 6), grey); h.position.set(0, k * 0.85, k * 0.45); h.castShadow = true;
      const beak = new THREE.Mesh(new THREE.ConeGeometry(k * 0.07, k * 0.22, 6), s.material('#d9a441')); beak.position.set(0, k * 0.83, k * 0.72); beak.rotation.x = Math.PI / 2;
      const tail = new THREE.Mesh(new THREE.BoxGeometry(k * 0.3, k * 0.06, k * 0.6), grey); tail.position.set(0, k * 0.4, -k * 0.75); tail.rotation.x = -0.3;
      g.add(b, h, beak, tail); g.position.set(...at); g.rotation.y = random() * 6.28; parent.add(g);
    }

    let beam: THREE.Group;
    if (a.form === 'figure') {
      const y = P;
      s.lathe([[0.4, 0], [0.37, 0.06], [0.33, 0.3], [0.26, 0.8], [0.21, 1.05], [0.17, 1.17]], body, [0, y, 0]);
      for (let i = 0; i < 9; i++) { const ang = i * 0.698 + random() * 0.3; s.rod([Math.sin(ang) * 0.37, y + 0.02, Math.cos(ang) * 0.37], [Math.sin(ang) * 0.2, y + 1.1, Math.cos(ang) * 0.2], 0.035, shade, 0.012); }
      s.lathe([[0.17, 1.15], [0.2, 1.3], [0.205, 1.47], [0.16, 1.58], [0.07, 1.63], [0.06, 1.7]], body, [0, y, 0]);
      s.ring(0.185, 0.025, [0, y + 1.17, 0], shade).rotation.x = Math.PI / 2;
      s.ball([0.105, 0.125, 0.115], [0, y + 1.8, 0], body, 18);
      s.ball([0.115, 0.1, 0.125], [0, y + 1.84, -0.03], shade, 14);
      s.ball([0.06, 0.06, 0.06], [0, y + 1.86, -0.14], shade, 10);
      s.box([0.02, 0.05, 0.03], [0, y + 1.78, 0.115], body);
      const band = a.material === 'marble' || a.material === 'stone' ? shade : s.material(a.material === 'gilt' ? '#fff5d0' : '#d9d5c8', { roughness: 0.7 });
      if (a.eyes === 'blindfold') {
        s.cylinder(0.112, 0.112, 0.055, [0, y + 1.82, 0.004], band, 18).scale.set(1, 1, 1.08);
        s.rod([0, y + 1.82, -0.12], [0.06, y + 1.66, -0.19], 0.02, band, 0.01); s.rod([0, y + 1.82, -0.12], [-0.05, y + 1.63, -0.17], 0.02, band, 0.01);
      } else if (a.eyes === 'slipped') {
        s.ring(0.09, 0.022, [0, y + 1.66, 0.01], band).rotation.x = Math.PI / 2 + 0.25;
        for (const sx of [-1, 1]) s.ball([0.02, 0.014, 0.01], [sx * 0.042, y + 1.82, 0.105], s.material('#17181b'), 8);
      } else for (const sx of [-1, 1]) s.ball([0.022, 0.016, 0.01], [sx * 0.042, y + 1.82, 0.105], s.material('#17181b'), 8);
      // Balance arm (+x), held high and forward.
      const hand: [number, number, number] = [0.62, y + 2.02, 0.2];
      s.rod([0.17, y + 1.56, 0], [0.42, y + 1.62, 0.1], 0.06, body, 0.05);
      s.rod([0.42, y + 1.62, 0.1], hand, 0.05, body, 0.038);
      s.ball([0.05, 0.05, 0.05], hand, body, 10);
      s.ball([0.075, 0.075, 0.075], [0.18, y + 1.56, 0], body, 10); s.ball([0.075, 0.075, 0.075], [-0.18, y + 1.56, 0], body, 10);
      s.rod(hand, [hand[0], hand[1] - 0.16, hand[2]], 0.012, body);
      beam = balance([hand[0], hand[1] - 0.16, hand[2]], 0.66, 0.5, 0.125, 0);
      // Sword arm (-x).
      if (a.sword === 'raised' || a.sword === 'broken') {
        const h: [number, number, number] = [-0.4, y + 1.3, 0.2];
        s.rod([-0.17, y + 1.56, 0], [-0.36, y + 1.34, 0.04], 0.06, body, 0.05); s.rod([-0.36, y + 1.34, 0.04], h, 0.05, body, 0.04);
        const len = a.sword === 'broken' ? 0.22 : 1.15;
        const blade = s.box([0.065, len, 0.016], [h[0], h[1] + 0.12 + len / 2, h[2]], body);
        if (a.sword === 'broken') blade.rotation.z = 0.0; else s.mesh(new THREE.ConeGeometry(0.033, 0.12, 4), body, [h[0], h[1] + 0.12 + len + 0.06, h[2]]).scale.z = 0.3;
        s.box([0.3, 0.035, 0.04], [h[0], h[1] + 0.1, h[2]], body); s.cylinder(0.018, 0.018, 0.18, [h[0], h[1], h[2]], shade, 8); s.ball([0.035, 0.035, 0.035], [h[0], h[1] - 0.1, h[2]], body, 8);
        if (a.sword === 'broken') { const piece = s.box([0.065, 0.8, 0.016], [-0.55 - random() * 0.2, 0.02, 0.5 + random() * 0.2], body); piece.rotation.set(Math.PI / 2, 0, random() * 2); }
      } else if (a.sword === 'lowered') {
        const h: [number, number, number] = [-0.42, y + 1.12, 0.24];
        s.rod([-0.17, y + 1.56, 0], [-0.38, y + 1.3, 0.1], 0.06, body, 0.05); s.rod([-0.38, y + 1.3, 0.1], h, 0.05, body, 0.04);
        s.box([0.065, 1.0, 0.016], [h[0], y + 0.52, h[2]], body);
        s.box([0.3, 0.035, 0.04], [h[0], y + 1.03, h[2]], body); s.cylinder(0.018, 0.018, 0.18, [h[0], y + 1.12, h[2]], shade, 8); s.ball([0.035, 0.035, 0.035], [h[0], y + 1.22, h[2]], body, 8);
      } else {
        s.rod([-0.17, y + 1.56, 0], [-0.3, y + 1.25, 0.06], 0.06, body, 0.05); s.rod([-0.3, y + 1.25, 0.06], [-0.26, y + 0.98, 0.16], 0.05, body, 0.04);
      }
    } else if (a.form === 'balance') {
      const y = P;
      s.lathe([[0.34, 0], [0.32, 0.05], [0.12, 0.1], [0.05, 0.2], [0.07, 0.6], [0.04, 0.9], [0.06, 1.25], [0.03, 1.45], [0, 1.47]], body, [0, y, 0]);
      s.ball([0.07, 0.09, 0.07], [0, y + 1.55, 0], body, 12);
      beam = balance([0, y + 1.38, 0.0], 1.45, 0.75, 0.26, 0);
    } else {
      const y = P;
      s.lathe([[0.26, 0], [0.22, 0.1], [0.17, 0.5], [0.12, 1.0], [0.11, 1.2], [0, 1.2]], body, [0, y, 0]);
      s.ring(0.19, 0.03, [0, y + 0.42, 0], shade).rotation.x = Math.PI / 2;
      s.ball([0.17, 0.15, 0.15], [0, y + 1.3, 0], body, 14);
      for (let i = 0; i < 4; i++) s.ball([0.045, 0.06, 0.07], [-0.11 + i * 0.075, y + 1.3, 0.12], shade, 8);
      s.ball([0.05, 0.05, 0.09], [0.16, y + 1.34, 0.06], shade, 8);
      s.rod([0, y + 1.3, 0.2], [0, y + 1.12, 0.2], 0.014, body);
      beam = balance([0, y + 1.12, 0.2], 1.3, 0.7, 0.24, 0);
    }

    // Weathering.
    if (mood.wear > 0.5) {
      const guano = s.material('#eeeade', { roughness: 1 });
      const topY = a.form === 'figure' ? P + 1.9 : P + 1.5;
      for (let i = 0; i < Math.round((mood.wear - 0.4) * 10); i++) s.ball([0.04, 0.012, 0.04], [(random() - 0.5) * 0.3, topY - random() * 0.45, (random() - 0.5) * 0.2 + 0.05], guano, 6);
      for (let i = 0; i < 4; i++) s.box([0.03, 0.15 + random() * 0.3, 0.005], [(random() - 0.5) * 0.5, P - 0.2 - random() * 0.3, { column: 0.43, steps: 0.56, trophy: 0.41, rough: 0.6 }[a.plinth]], guano);
    }

    if (a.plinth === 'trophy') s.root.scale.setScalar(0.2);
    const swing = mix(0, 0.05, mood.energy), speed = mix(0.6, 2.2, mood.energy);
    return s.finish({ footprint: a.plinth === 'trophy' ? 0.12 : 0.6, update: (_dt, time) => { beam.rotation.z = angle + Math.sin(time * speed) * swing; for (const pan of pans) pan.rotation.z = -beam.rotation.z; } });
  },
});
