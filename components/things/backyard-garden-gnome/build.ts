import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
const CONCRETE = '#b6b2a5';

export default defineThing({
  questions: {
    figure: choice('What is the ornament?', {
      'fishing-gnome': 'A bearded gnome in a pointed hat holding a fishing rod.',
      toadstool: 'A fat spotted toadstool with a tiny door in its stalk.',
      hedgehog: 'A concrete hedgehog with a pointed nose.',
      heron: 'A tall thin heron standing on rod legs.',
      faceless: 'A gnome worn so smooth it has no face left, only the shape.',
    }),
    paint: choice('How is it painted?', {
      enamel: 'Glossy factory enamel in the proper colours.',
      repainted: 'Repainted by a child in the wrong colours, thick and bright.',
      traces: 'Bare concrete with only traces of paint in the creases.',
      gold: 'Sprayed gold all over.',
    }),
    accent: choice('What is its one bright colour (hat, cap or beak)?', {
      red: 'Pillar-box red.',
      blue: 'Royal blue.',
      green: 'Leaf green.',
      yellow: 'Egg-yolk yellow.',
    }),
    size: score('How big is it, as remembered?', ['Shin high, as it really was', 'Up to a small child\'s chest', 'Taller than you were', 'Looming, a giant']),
    stance: choice('How does it stand?', {
      upright: 'Square and upright.',
      leaning: 'Leaning where the ground has settled.',
      sunk: 'Half sunk into the soil, tilted.',
      toppled: 'Knocked over on its side.',
    }),
    base: choice('What does it stand on?', {
      grass: 'Rough grass the mower goes around.',
      plinth: 'A round concrete plinth.',
      stump: 'A sawn tree stump.',
      rockery: 'A heap of rockery stones.',
    }),
    company: choice('What keeps it company?', {
      nothing: 'Nothing.',
      snail: 'A snail and its silver trail.',
      bird: 'A robin perched on top of it.',
      windmill: 'A plastic windmill on a stick, spinning.',
      twin: 'A much smaller copy of itself.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const concrete = new THREE.Color(CONCRETE);
    const wrong = ['#e24f9a', '#7a3fd0', '#2fb0c0', '#f08a2a', '#9ad02f', '#e2412f', '#f4d02c'];
    const accentHex = { red: '#cf2a22', blue: '#2552b5', green: '#3a8f3f', yellow: '#eeb81e' }[a.accent];
    const partnerHex = { red: '#2f5fb5', blue: '#c63a2e', green: '#b8762a', yellow: '#3a8f5a' }[a.accent];
    const bare = a.figure === 'faceless';
    const paint = (hex: string, keep = false) => {
      let colour = new THREE.Color(hex);
      if (bare) colour = concrete.clone().lerp(new THREE.Color('#8f9a7a'), 0.15 + random() * 0.1);
      else if (a.paint === 'repainted' && !keep) colour = new THREE.Color(wrong[Math.floor(random() * wrong.length)]);
      else if (a.paint === 'traces') colour = concrete.clone().lerp(colour, 0.22);
      else if (a.paint === 'gold') colour = new THREE.Color('#c9a23a').offsetHSL(0, 0, (random() - 0.5) * 0.06);
      colour.lerp(concrete, bare ? 0 : wear * 0.45);
      return new THREE.MeshStandardMaterial({ color: colour, roughness: bare || a.paint === 'traces' ? 0.95 : mix(a.paint === 'repainted' ? 0.55 : 0.28, 0.9, wear), metalness: a.paint === 'gold' && !bare ? 0.55 : 0 });
    };
    const stone = new THREE.MeshStandardMaterial({ color: concrete, roughness: 1 });

    const figure = (): { group: THREE.Group; height: number } => {
      const group = new THREE.Group();
      const add = <T extends THREE.Object3D>(mesh: T) => { group.add(mesh); return mesh; };
      const ball = (size: P3, at: P3, mat: THREE.Material, seg = 18) => add(s.ball(size, at, mat, seg));
      const lathe = (profile: [number, number][], mat: THREE.Material) => add(s.lathe(profile, mat));
      const rod = (from: P3, to: P3, r: number, mat: THREE.Material, r2 = r) => add(s.rod(from, to, r, mat, r2));
      if (a.figure === 'fishing-gnome' || a.figure === 'faceless') {
        const skin = paint('#e8b79a'), coat = paint(partnerHex), hat = paint(accentHex), white = paint('#f4f1e8', true), boot = paint('#4a3324'), ink = paint('#1d1d1f', true);
        for (const sx of [-1, 1]) ball([0.1, 0.065, 0.15], [sx * 0.11, 0.065, 0.09], boot);
        lathe([[0, 0.04], [0.23, 0.05], [0.275, 0.16], [0.27, 0.3], [0.22, 0.45], [0.14, 0.54], [0, 0.57]], coat);
        if (!bare) { add(s.ring(0.268, 0.022, [0, 0.27, 0], ink)).rotation.x = Math.PI / 2; add(s.box([0.07, 0.06, 0.02], [0, 0.27, 0.275], paint('#e8c23a'))); }
        ball([0.15, 0.15, 0.145], [0, 0.63, 0.01], skin);
        ball([0.155, 0.2, 0.09], [0, 0.5, 0.115], white);
        lathe([[0.19, 0.69], [0.16, 0.72], [0.14, 0.8], [0.085, 0.93], [0.035, 1.02], [0, 1.05]], hat).rotation.z = bare ? 0 : 0.06;
        for (const sx of [-1, 1]) {
          add(s.tube([[sx * 0.21, 0.47, 0], [sx * 0.29, 0.4, 0.06], [sx * 0.24, 0.36, 0.17]], 0.052, coat));
          ball([0.05, 0.05, 0.05], [sx * 0.23, 0.36, 0.2], skin, 10);
        }
        if (!bare) {
          ball([0.048, 0.045, 0.05], [0, 0.63, 0.155], paint('#e59a8a'), 10);
          for (const sx of [-1, 1]) { ball([0.018, 0.022, 0.012], [sx * 0.055, 0.675, 0.135], ink, 8); ball([0.035, 0.03, 0.02], [sx * 0.085, 0.615, 0.12], paint('#e89a90'), 8); }
          const wood = paint('#7a5a34', true);
          rod([0.23, 0.33, 0.14], [0.4, 0.98, 0.62], 0.014, wood, 0.007);
          rod([0.4, 0.98, 0.62], [0.4, 0.2, 0.64], 0.004, white);
          const fish = ball([0.03, 0.045, 0.075], [0.4, 0.15, 0.64], paint('#e8862a'), 10); fish.rotation.x = 1.2;
        }
        return { group, height: 1.05 };
      }
      if (a.figure === 'toadstool') {
        const cap = paint(accentHex), white = paint('#f4f0e2', true), cream = paint('#e9dfc4', true);
        lathe([[0, 0], [0.2, 0.01], [0.17, 0.1], [0.125, 0.3], [0.12, 0.46], [0, 0.47]], cream);
        lathe([[0, 0.44], [0.44, 0.42], [0.47, 0.46], [0.44, 0.56], [0.33, 0.7], [0.17, 0.79], [0, 0.82]], cap);
        add(s.ring(0.14, 0.03, [0, 0.36, 0], cream)).rotation.x = Math.PI / 2;
        for (let i = 0; i < 11; i++) {
          const ang = i * 2.4 + random() * 0.5, rad = 0.1 + (i % 4) * 0.095, y = 0.82 - Math.pow(rad / 0.45, 2) * 0.33;
          ball([0.045 + random() * 0.03, 0.02, 0.045 + random() * 0.03], [Math.cos(ang) * rad, y, Math.sin(ang) * rad], white, 10);
        }
        const door = add(s.box([0.11, 0.17, 0.02], [0, 0.1, 0.155], paint(partnerHex))); door.rotation.x = -0.18;
        ball([0.012, 0.012, 0.012], [0.03, 0.1, 0.175], paint('#e8c23a'), 6);
        add(s.box([0.06, 0.06, 0.02], [0.1, 0.27, 0.085], paint('#f2d66a'))).rotation.set(-0.1, 0.8, 0);
        // A second, smaller one growing from its foot.
        const small = new THREE.Group();
        small.add(s.lathe([[0, 0], [0.07, 0.01], [0.05, 0.2], [0, 0.21]], cream), s.lathe([[0, 0.19], [0.16, 0.18], [0.15, 0.25], [0.08, 0.33], [0, 0.35]], cap));
        small.position.set(-0.3, 0, 0.16); small.rotation.z = 0.22; add(small);
        return { group, height: 0.92 };
      }
      if (a.figure === 'hedgehog') {
        const spikes = paint('#6b4a2f'), face = paint('#d9b98a'), ink = paint('#1d1d1f', true);
        ball([0.3, 0.24, 0.38], [0, 0.24, -0.05], spikes, 22);
        const snout = add(s.mesh(new THREE.ConeGeometry(0.17, 0.36, 18), face, [0, 0.17, 0.36])); snout.rotation.x = Math.PI / 2 - 0.12; snout.scale.set(1, 1, 0.85);
        ball([0.19, 0.17, 0.14], [0, 0.2, 0.2], face, 14);
        ball([0.034, 0.03, 0.034], [0, 0.15, 0.545], ink, 10);
        for (const sx of [-1, 1]) {
          ball([0.022, 0.026, 0.016], [sx * 0.085, 0.25, 0.33], ink, 8);
          ball([0.05, 0.055, 0.025], [sx * 0.15, 0.33, 0.2], face, 8).rotation.y = sx * 0.5;
          ball([0.06, 0.035, 0.075], [sx * 0.17, 0.03, 0.22], face, 8); ball([0.06, 0.035, 0.075], [sx * 0.2, 0.03, -0.2], face, 8);
        }
        const cone = new THREE.ConeGeometry(0.03, 0.12, 5); cone.translate(0, 0.05, 0);
        const quills = new THREE.InstancedMesh(cone, accentHex && a.paint === 'enamel' ? paint('#8a6238') : spikes, 90);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
        for (let i = 0; i < 90; i++) {
          const u = random() * Math.PI * 2, v = Math.acos(mix(0.12, 1, random()));
          const n = new THREE.Vector3(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u));
          if (n.z > 0.55 && n.y < 0.6) n.z = -n.z;
          const p = new THREE.Vector3(n.x * 0.29, 0.24 + n.y * 0.23, -0.05 + n.z * 0.37);
          const lean = n.clone().add(new THREE.Vector3(0, 0.1, -0.5)).normalize();
          m.compose(p, q.setFromUnitVectors(up, lean), new THREE.Vector3(1, 0.8 + random() * 0.6, 1)); quills.setMatrixAt(i, m);
        }
        quills.castShadow = true; add(quills);
        return { group, height: 0.6 };
      }
      const grey = paint('#9aa6b0'), white = paint('#f1f0ea', true), beak = paint(accentHex), ink = paint('#22252a', true);
      lathe([[0, 0], [0.2, 0.005], [0.19, 0.035], [0, 0.04]], stone);
      for (const sx of [-1, 1]) { rod([sx * 0.045, 0.03, 0], [sx * 0.04, 0.34, 0.03], 0.014, beak); rod([sx * 0.04, 0.34, 0.03], [sx * 0.04, 0.6, -0.02], 0.016, beak); for (const toe of [-0.5, 0, 0.5]) rod([sx * 0.045, 0.045, 0], [sx * 0.045 + toe * 0.08, 0.045, 0.1], 0.008, beak); }
      const body = ball([0.13, 0.13, 0.26], [0, 0.7, -0.06], grey, 18); body.rotation.x = -0.35;
      for (const sx of [-1, 1]) { const wing = ball([0.03, 0.1, 0.24], [sx * 0.115, 0.71, -0.1], paint('#6f7d8a'), 12); wing.rotation.x = -0.4; }
      ball([0.05, 0.03, 0.14], [0, 0.6, -0.33], paint('#6f7d8a'), 10).rotation.x = -0.6;
      add(s.tube([[0, 0.76, 0.12], [0, 0.9, 0.22], [0, 1.03, 0.14], [0, 1.14, 0.06], [0, 1.25, 0.1]], 0.036, white));
      ball([0.052, 0.05, 0.075], [0, 1.27, 0.12], white, 12);
      const bill = add(s.mesh(new THREE.ConeGeometry(0.026, 0.24, 8), beak, [0, 1.255, 0.3])); bill.rotation.x = Math.PI / 2 + 0.08;
      rod([0, 1.3, 0.1], [0, 1.26, -0.08], 0.012, ink, 0.003);
      for (const sx of [-1, 1]) ball([0.01, 0.012, 0.012], [sx * 0.045, 1.28, 0.15], ink, 6);
      return { group, height: 1.33 };
    };

    const weather = (group: THREE.Group, scale: number) => {
      // Chips knock back to concrete; moss settles in the low folds.
      const meshes: THREE.Mesh[] = [];
      group.traverse((node) => { const mesh = node as THREE.Mesh; if (mesh.isMesh && !(mesh as unknown as THREE.InstancedMesh).isInstancedMesh && mesh.parent === group) meshes.push(mesh); });
      const point = new THREE.Vector3();
      const dab = (count: number, colour: THREE.ColorRepresentation, low: boolean, size: number) => {
        const mat = new THREE.MeshStandardMaterial({ color: colour, roughness: 1 });
        for (let i = 0, tries = 0; i < count && tries < count * 6; tries++) {
          const mesh = meshes[Math.floor(random() * meshes.length)];
          const pos = mesh.geometry.attributes.position; if (!pos || pos.count < 30) continue;
          mesh.updateMatrix();
          point.fromBufferAttribute(pos, Math.floor(random() * pos.count)).applyMatrix4(mesh.matrix);
          if (low && point.y > 0.45) continue;
          const chip = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), mat);
          chip.position.copy(point); chip.scale.set(size * (0.6 + random()), size * (0.5 + random() * 0.7), size * (0.6 + random())); chip.castShadow = true;
          group.add(chip); i++;
        }
      };
      void scale;
      dab(Math.round(wear * wear * (bare ? 12 : 34)), CONCRETE, false, 0.03);
      dab(Math.round(wear * mix(4, 22, mood.density) * (bare ? 1.6 : 1)), '#6f8a3f', true, 0.035);
    };

    const H = mix(0.38, 1.25, a.size);
    const main = figure();
    weather(main.group, 1);
    const k = H / main.height * (a.figure === 'heron' ? 1.25 : a.figure === 'hedgehog' ? 0.75 : 1);
    main.group.scale.setScalar(k);
    const stand = new THREE.Group();
    stand.add(main.group);
    s.root.add(stand);
    const reach = (a.figure === 'hedgehog' ? 0.45 : a.figure === 'toadstool' ? 0.48 : 0.3) * k;

    // Base.
    let baseTop = 0;
    if (a.base === 'plinth') { baseTop = 0.12; s.cylinder(reach + 0.08, reach + 0.12, 0.12, [0, 0.06, 0], stone, 28); s.cylinder(reach + 0.14, reach + 0.14, 0.03, [0, 0.015, 0], stone, 28); }
    else if (a.base === 'stump') {
      baseTop = 0.3; const bark = s.material('#6a4a30', { roughness: 1 });
      const stump = s.mesh(new THREE.CylinderGeometry(reach + 0.06, reach + 0.14, 0.3, 14), bark, [0, 0.15, 0]); stump.rotation.y = random();
      const rings = document.createElement('canvas'); rings.width = rings.height = 128; const g = rings.getContext('2d')!;
      g.fillStyle = '#d9b98a'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#a8804f'; g.lineWidth = 2; for (let r = 6; r < 64; r += 7 + random() * 4) { g.beginPath(); g.ellipse(64 + random() * 3, 64, r, r * 0.95, 0, 0, 7); g.stroke(); }
      const top = new THREE.CanvasTexture(rings); top.colorSpace = THREE.SRGBColorSpace;
      const cap = s.mesh(new THREE.CircleGeometry(reach + 0.055, 14), new THREE.MeshStandardMaterial({ map: top, roughness: 1 }), [0, 0.302, 0]); cap.rotation.x = -Math.PI / 2;
      for (let i = 0; i < 4; i++) { const ang = i * 1.6 + random(); s.ball([0.1, 0.07, 0.2], [Math.cos(ang) * (reach + 0.12), 0.03, Math.sin(ang) * (reach + 0.12)], bark, 8).rotation.y = -ang + Math.PI / 2; }
    } else if (a.base === 'rockery') {
      baseTop = 0.2;
      for (let i = 0; i < 11; i++) {
        const ang = i / 11 * Math.PI * 2 + random() * 0.4, rad = (reach + 0.1) * (0.55 + random() * 0.5);
        const rock = s.mesh(new THREE.DodecahedronGeometry(0.16 + random() * 0.1, 0), s.material(['#9a958a', '#8a8478', '#aaa59a'][i % 3], { roughness: 1, flatShading: true }), [Math.cos(ang) * rad, 0.07 + random() * 0.05, Math.sin(ang) * rad]);
        rock.rotation.set(random() * 3, random() * 3, random() * 3); rock.scale.y = 0.7;
      }
      s.cylinder(reach * 0.9, reach + 0.05, 0.2, [0, 0.1, 0], s.material('#6b5a40', { roughness: 1 }), 12);
    }
    const tufts: { at: P3; size: number; color: string }[] = [];
    const tuftCount = Math.round(mix(a.base === 'grass' ? 50 : 12, a.base === 'grass' ? 130 : 40, mood.density));
    for (let i = 0; i < tuftCount; i++) { const ang = random() * Math.PI * 2, rad = (reach + (a.base === 'grass' ? 0 : 0.14)) * (0.8 + random() * 0.6) + 0.04; tufts.push({ at: [Math.cos(ang) * rad, 0, Math.sin(ang) * rad], size: (0.5 + random() * 1.1) * mix(0.7, 1.4, wear) * Math.min(1, Math.max(0.45, H * 1.1)), color: ['#6f9a3c', '#89ad45', '#5b8a3a', '#a8a84a'][i % 4] }); }
    const blade = new THREE.ConeGeometry(0.016, 0.2, 4); blade.translate(0, 0.1, 0);
    s.scatter(blade, new THREE.MeshStandardMaterial({ roughness: 1 }), tufts);

    // Stance.
    stand.position.y = baseTop;
    stand.rotation.y = (random() - 0.5) * 0.5;
    if (a.stance === 'leaning') { stand.rotation.z = (random() > 0.5 ? 1 : -1) * mix(0.1, 0.2, random()); stand.rotation.x = (random() - 0.5) * 0.15; stand.position.y -= 0.02 * k; }
    else if (a.stance === 'sunk') { stand.rotation.z = (random() > 0.5 ? 1 : -1) * 0.22; stand.rotation.x = -0.12; stand.position.y = -0.2 * H; s.ball([reach + 0.12, 0.05, reach + 0.12], [0, 0.0, 0], s.material('#5f4a33', { roughness: 1 }), 14); }
    else if (a.stance === 'toppled') {
      const side = random() > 0.5 ? 1 : -1;
      stand.rotation.z = side * 1.5; stand.rotation.x = (random() - 0.5) * 0.4;
      stand.position.set(-side * (baseTop ? reach + 0.2 : reach * 0.3), 0, baseTop ? 0.1 : 0);
      stand.updateMatrixWorld(true);
      stand.position.y -= new THREE.Box3().setFromObject(stand).min.y;
    }
    stand.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(stand);

    // Company.
    const vanes: THREE.Object3D[] = [];
    if (a.company === 'snail') {
      const g = new THREE.Group(); g.position.set(reach + 0.2, 0, 0.25 + random() * 0.2); g.rotation.y = random() * 3; s.root.add(g);
      g.add(s.ball([0.035, 0.022, 0.1], [0, 0.022, 0], s.material('#b9a47a'), 10), s.ball([0.05, 0.06, 0.06], [0, 0.07, -0.02], s.material('#8a5a34'), 12));
      for (const sx of [-1, 1]) g.add(s.rod([sx * 0.012, 0.03, 0.09], [sx * 0.025, 0.075, 0.115], 0.004, s.material('#b9a47a')));
      const trail: P3[] = []; for (let i = 0; i < 7; i++) trail.push([0.02 * Math.sin(i * 1.3) * i, 0.004, -0.08 - i * 0.09]);
      const slime = s.tube(trail, 0.014, s.material('#e6eef0', { roughness: 0.05, metalness: 0.4 })); slime.scale.y = 0.2; g.add(slime);
    } else if (a.company === 'bird') {
      const g = new THREE.Group(); g.position.set((box.min.x + box.max.x) / 2, box.max.y - 0.01, (box.min.z + box.max.z) / 2 + (a.figure === 'heron' && a.stance !== 'toppled' ? 0.1 * k : 0)); g.rotation.y = random() * 6; s.root.add(g);
      const brown = s.material('#7a5a3a');
      g.add(s.ball([0.045, 0.045, 0.06], [0, 0.05, 0], brown, 10), s.ball([0.036, 0.036, 0.036], [0, 0.085, 0.045], brown, 10), s.ball([0.036, 0.034, 0.03], [0, 0.058, 0.04], s.material('#d8552f'), 10));
      const beak = s.mesh(new THREE.ConeGeometry(0.01, 0.03, 6), s.material('#3a3024'), [0, 0.085, 0.09]); beak.rotation.x = Math.PI / 2; g.add(beak);
      g.add(s.box([0.03, 0.006, 0.07], [0, 0.05, -0.08], brown));
    } else if (a.company === 'windmill') {
      const x = -(reach + 0.25), h = Math.max(0.45, H * 0.7);
      s.rod([x, 0, 0.2], [x, h, 0.2], 0.008, s.material('#e9e6da'));
      const hub = new THREE.Group(); hub.position.set(x, h, 0.225); s.root.add(hub);
      const tints = ['#e2412f', '#f4c62c', '#2f86d6', '#3aa66a', '#e56d9c', '#f08a2a'];
      for (let i = 0; i < 6; i++) {
        const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(0.15, 0.03); shape.lineTo(0.11, 0.1); shape.lineTo(0, 0);
        const vane = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: tints[i], side: THREE.DoubleSide, roughness: 0.35, emissive: tints[i], emissiveIntensity: 0.12 }));
        vane.rotation.z = i / 6 * Math.PI * 2; vane.rotation.y = 0.25; vane.rotation.order = 'ZYX'; vane.castShadow = true; hub.add(vane);
      }
      hub.add(s.ball([0.018, 0.018, 0.018], [0, 0, 0.01], s.material('#f4f4ee'), 8));
      vanes.push(hub);
    } else if (a.company === 'twin') {
      const twin = figure();
      weather(twin.group, 0.4);
      twin.group.scale.setScalar(k * 0.4);
      twin.group.position.set(reach + 0.22 * k + 0.1, 0, 0.2 + random() * 0.15); twin.group.rotation.y = -0.5 + random() * 0.4;
      s.root.add(twin.group);
    }

    const spin = mix(0.6, 9, mood.energy);
    return s.finish({ footprint: Math.max(reach + 0.2, 0.3), update: (dt) => { for (const v of vanes) v.rotation.z -= dt * spin; } });
  },
});
