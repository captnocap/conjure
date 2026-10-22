import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    pose: choice('What is the rotifer doing?', {
      feeding: 'Fully extended and upright, both wheels spinning flat out.',
      reaching: 'Stretched long and leaning far out to one side, wheels searching.',
      wary: 'Half pulled in, the wheels small and cautious.',
      retracted: 'Snapped shut into a wrinkled ball on its foot, waiting for the danger to pass.',
      housed: 'Living in a chimney it built of stacked brown pellets, only the wheels poking out.',
    }),
    anchor: choice('What is its foot glued to?', {
      root: 'A pale dangling duckweed root.',
      detritus: 'A crumb of brown rotting leaf.',
      sand: 'A single angular grain of sand.',
      leaf: 'The edge of a green water-plant leaf.',
      glass: 'The bare glass of a microscope slide.',
    }),
    stream: choice('What is being swept into the wheels?', {
      nothing: 'Nothing visible; clean water.',
      algae: 'A spiral of green algal cells.',
      glitter: 'Golden motes, like dust in a sunbeam.',
      bacteria: 'A grey swarm of bacteria.',
    }),
    belly: choice('What colour is its stomach?', {
      green: 'Grass green.',
      amber: 'Amber gold.',
      red: 'Brick red.',
      empty: 'Pale and empty.',
    }),
    wheels: score('How large are the wheel organs?', ['Two modest discs', 'Broad crowns', 'Enormous flaring wheels wider than the body']),
    stretch: score('How long and thin is its body?', ['Squat and stout', 'A graceful trumpet', 'Drawn out long like a stalk']),
    egg: noul('Is it carrying a big pale egg at its side?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const retracted = a.pose === 'retracted', wary = a.pose === 'wary', housed = a.pose === 'housed';
    const tall = retracted ? 0.75 : mix(1.7, 2.9, a.stretch) * (a.pose === 'reaching' ? 1.15 : wary ? 0.75 : 1);
    const girth = mix(0.44, 0.28, a.stretch) * (retracted ? 1.25 : wary ? 1.15 : 1);
    const wheel = retracted ? 0 : mix(0.26, 0.56, a.wheels) * (wary ? 0.55 : 1);
    const tint = new THREE.Color('#c2cf9e');
    tint.offsetHSL((mood.warmth - 0.5) * 0.06, (mood.cheer - 0.5) * 0.15, -mood.wear * 0.07);
    const skin = new THREE.MeshPhysicalMaterial({ color: tint, transparent: true, opacity: retracted ? 0.93 : 0.5, roughness: 0.3, clearcoat: 0.5 });
    const rimMat = new THREE.MeshBasicMaterial({ color: tint.clone().multiplyScalar(0.4), side: THREE.BackSide, transparent: true, opacity: 0.6, depthWrite: false });
    const fold = new THREE.MeshStandardMaterial({ color: tint.clone().multiplyScalar(0.6), roughness: 0.6 });
    const solid = (colour: string, glow = 0.25) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.45, emissive: colour, emissiveIntensity: glow });
    const unit = new THREE.SphereGeometry(1, 18, 12);
    const animal = new THREE.Group();
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale: [number, number, number] = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.scale.set(...scale);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Body profile from foot to crown.
    const footEnd = retracted ? 0.2 : tall * 0.3;
    const profile: [number, number][] = retracted
      ? [[0.02, 0], [0.09, 0.04], [0.1, footEnd], [girth * 0.7, footEnd + 0.12], [girth, footEnd + 0.4], [girth * 0.8, footEnd + 0.7], [0.12, footEnd + 0.84], [0.01, footEnd + 0.86]]
      : [[0.02, 0], [0.08, 0.03], [0.07, footEnd * 0.5], [0.11, footEnd], [girth * 0.75, tall * 0.45], [girth, tall * 0.62], [girth * 0.82, tall * 0.8], [girth * 0.6, tall * 0.9], [girth * 0.78, tall * 0.97], [girth * 0.7, tall], [0.02, tall + 0.02]];
    const curve = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(r, y)));
    const lathe = new THREE.LatheGeometry(curve.getPoints(40), 28);
    const body = add(animal, lathe, skin, [0, 0, 0]);
    body.renderOrder = 2;
    add(animal, lathe, rimMat, [0, 0, 0], [1.06, 1.005, 1.06]).castShadow = false;
    // Telescoping joints on the foot, wrinkles when contracted.
    const joints = retracted ? 7 : 4;
    for (let i = 0; i < joints; i++) {
      const y = retracted ? footEnd + 0.12 + i * 0.1 : footEnd * (0.25 + i * 0.25);
      const r = retracted ? girth * Math.sin(((i + 1) / (joints + 1)) * Math.PI) * 0.98 + 0.06 : mix(0.075, 0.115, i / 3);
      add(animal, new THREE.TorusGeometry(r, 0.014, 5, 24), fold, [0, y, 0]).rotation.x = Math.PI / 2;
    }
    for (const side of [-1, 1]) add(animal, new THREE.ConeGeometry(0.035, 0.16, 6), fold, [side * 0.06, 0.02, 0.03]).rotation.set(1.2, 0, side * 0.6 + Math.PI);

    const spinners: THREE.Object3D[] = [];
    const jaws: THREE.Object3D[] = [];
    if (!retracted) {
      // Organs: red eyespots, the grinding mastax, stomach, gut and ovary.
      const bellyColour = { green: '#5f9a2c', amber: '#d09a30', red: '#a8482c', empty: '#d9d6b8' }[a.belly];
      add(animal, unit, solid(bellyColour, 0.3), [0, tall * 0.58, 0], [girth * 0.56, tall * 0.11, girth * 0.5]);
      add(animal, unit, solid(bellyColour, 0.2), [0.03, tall * 0.44, 0], [girth * 0.25, tall * 0.07, girth * 0.25]);
      add(animal, unit, solid('#efe8cf', 0.2), [-girth * 0.35, tall * 0.52, girth * 0.3], [girth * 0.22, tall * 0.07, girth * 0.2]);
      for (const side of [-1, 1]) {
        jaws.push(add(animal, unit, solid('#5a4632', 0.05), [side * girth * 0.16, tall * 0.77, girth * 0.1], [girth * 0.17, girth * 0.24, girth * 0.16]));
        add(animal, unit, solid('#d8302a', 0.5), [side * girth * 0.22, tall * 0.9, girth * 0.42], [0.03, 0.03, 0.03]);
      }
      // The two wheel organs: a lobe each, rimmed with cilia that the update spins.
      const lash = new THREE.ConeGeometry(0.014, 1, 4);
      lash.translate(0, 0.5, 0);
      const lashMat = new THREE.MeshStandardMaterial({ color: tint.clone().multiplyScalar(0.5), roughness: 0.5 });
      for (const side of [-1, 1]) {
        const lobe = new THREE.Group();
        lobe.position.set(side * wheel * 0.72, tall + wheel * 0.18, 0);
        lobe.rotation.z = -side * 0.42;
        lobe.rotation.x = 0.25;
        const stalk = add(animal, new THREE.CylinderGeometry(wheel * 0.5, girth * 0.45, wheel * 0.5 + 0.1, 14), skin, [side * wheel * 0.42, tall + 0.02, 0]);
        stalk.rotation.z = -side * 0.5;
        add(lobe, new THREE.CylinderGeometry(wheel, wheel * 0.72, wheel * 0.22, 26), skin, [0, 0, 0]).renderOrder = 2;
        add(lobe, new THREE.TorusGeometry(wheel, wheel * 0.07, 6, 30), fold, [0, wheel * 0.11, 0]).rotation.x = Math.PI / 2;
        add(lobe, unit, fold, [0, wheel * 0.1, 0], [wheel * 0.3, wheel * 0.08, wheel * 0.3]);
        const count = 44;
        const crown = new THREE.InstancedMesh(lash, lashMat, count);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2, wave = 0.5 + 0.5 * Math.sin(angle * 4);
          e.set(0, -angle, -mix(0.5, 1.25, wave), 'YXZ');
          m.compose(new THREE.Vector3(Math.cos(angle) * wheel, wheel * 0.12, Math.sin(angle) * wheel), q.setFromEuler(e), new THREE.Vector3(1, wheel * mix(0.45, 0.75, wave), 1));
          crown.setMatrixAt(i, m);
        }
        crown.castShadow = true;
        crown.userData.turn = side;
        lobe.add(crown);
        spinners.push(crown);
        animal.add(lobe);
      }
      if (a.stream !== 'nothing') {
        // Two counter-rotating whirlpools funnelling down into the mouth.
        const colour = { algae: '#4f9a2c', glitter: '#e8b83a', bacteria: '#8a8a82' }[a.stream];
        const count = Math.round(mix(50, 170, mood.density));
        const motes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), solid(colour, a.stream === 'glitter' ? 0.8 : 0.25), count);
        const m = new THREE.Matrix4();
        for (let i = 0; i < count; i++) {
          const side = i % 2 ? 1 : -1, u = random(), turn = u * 9 + random() * 0.5, r = wheel * mix(0.25, 1.5, u), size = mix(0.018, 0.04, random());
          m.makeScale(size, size, size).setPosition(side * (wheel * 0.72 + Math.cos(turn) * r * side), tall + wheel * 0.3 + u * wheel * 1.6 + (random() - 0.5) * 0.08, Math.sin(turn) * r);
          motes.setMatrixAt(i, m);
        }
        animal.add(motes);
      }
    }
    if (a.egg) add(animal, unit, solid('#f1ead2', 0.2), [girth * 0.9, (retracted ? footEnd + 0.3 : tall * 0.4), girth * 0.3], [0.14, 0.19, 0.14]);
    if (housed) {
      // The chimney: rings of pellets laid like bricks up to the neck.
      const pellets: { at: [number, number, number]; size: number; color: string }[] = [];
      const top = tall * 0.78, rows = Math.round(top / 0.11);
      for (let row = 0; row < rows; row++) {
        const r = mix(0.2, girth + 0.12, Math.min(1, row / (rows * 0.6))), per = Math.max(6, Math.round((Math.PI * 2 * r) / 0.115));
        for (let i = 0; i < per; i++) {
          if (row > rows - 3 && random() < 0.3) continue;
          const angle = ((i + (row % 2) * 0.5) / per) * Math.PI * 2;
          pellets.push({ at: [Math.cos(angle) * r, 0.05 + row * 0.11, Math.sin(angle) * r], size: mix(0.055, 0.068, random()), color: ['#7a5a38', '#8f6c40', '#5f4630', '#a07c4c'][Math.floor(random() * 4)] });
        }
      }
      const tube = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.9 }), pellets.length);
      const m = new THREE.Matrix4();
      pellets.forEach((p, i) => { tube.setMatrixAt(i, m.makeScale(p.size, p.size, p.size).setPosition(...p.at)); tube.setColorAt(i, new THREE.Color(p.color)); });
      tube.castShadow = true;
      animal.add(tube);
    }
    const lean = a.pose === 'reaching' ? 0.75 : retracted ? 0.1 : (random() - 0.5) * 0.3;
    animal.rotation.z = -lean;
    animal.rotation.y = (random() - 0.5) * 0.6;
    s.root.add(animal);

    // What the foot holds on to.
    if (a.anchor === 'root') {
      const root = s.material('#cfd8a8', { roughness: 0.6 });
      s.tube([[-1.5, -0.2, 0.1], [-0.6, -0.1, 0], [0.3, -0.12, -0.05], [1.5, -0.3, 0.1]], 0.13, root);
      for (let i = 0; i < 14; i++) { const x = mix(-1.3, 1.3, random()); s.rod([x, -0.15, 0], [x + (random() - 0.5) * 0.3, -0.15 + (random() - 0.5) * 0.6, (random() - 0.5) * 0.6], 0.012, root, 0.004); }
    } else if (a.anchor === 'detritus') {
      const rot = s.material('#6a4c30', { flatShading: true, roughness: 1 });
      for (let i = 0; i < 9; i++) { const lump = s.mesh(new THREE.DodecahedronGeometry(mix(0.18, 0.4, random()), 0), rot, [(random() - 0.5) * 1.1, -0.2 - random() * 0.1, (random() - 0.5) * 0.8]); lump.scale.y = 0.5; lump.rotation.y = random() * 3; }
      s.mesh(new THREE.DodecahedronGeometry(0.45, 0), rot, [0, -0.22, 0]).scale.y = 0.5;
    } else if (a.anchor === 'sand') {
      const grain = s.mesh(new THREE.IcosahedronGeometry(0.7, 0), new THREE.MeshPhysicalMaterial({ color: '#d2b07a', roughness: 0.35, flatShading: true, clearcoat: 0.6 }), [0, -0.36, 0]);
      grain.scale.set(1.3, 0.55, 1);
      grain.rotation.y = random() * 3;
    } else if (a.anchor === 'leaf') {
      const leaf = s.mesh(new THREE.SphereGeometry(1, 20, 10), s.material('#4f8a3a', { roughness: 0.5 }), [0, -0.08, 0]);
      leaf.scale.set(1.5, 0.07, 0.8);
      s.tube([[-1.5, -0.03, 0], [0, 0, 0], [1.5, -0.03, 0]], 0.03, s.material('#3a6a2c'));
    } else {
      s.box([2.4, 0.06, 1.2], [0, -0.03, 0], new THREE.MeshPhysicalMaterial({ color: '#d8e8ea', roughness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1 }));
    }

    s.root.scale.setScalar(0.13);
    const speed = retracted ? 0 : mix(0.6, 5, mood.energy) * (wary ? 0.5 : 1);
    return s.finish({
      update: (dt, time) => {
        for (const crown of spinners) crown.rotation.y += dt * speed * crown.userData.turn;
        jaws.forEach((jaw, i) => { jaw.position.x = (i ? 1 : -1) * girth * (0.16 + 0.05 * Math.sin(time * speed * 3)); });
        animal.rotation.z = -lean + Math.sin(time * 0.7) * 0.05 * Math.min(1, speed);
      },
    });
  },
});
