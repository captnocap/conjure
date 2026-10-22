import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    pose: choice('What is the eagle doing?', {
      glide: 'Gliding level on flat wings, primaries spread like fingers.',
      bank: 'Banking in a slow turn, one wing tip pointed at the sea.',
      strike: 'Dropping with wings raised and talons thrown forward.',
      perched: 'Perched upright on the mark, wings folded, watching.',
      mantling: 'Perched with wings half open, drying them or guarding a kill.',
    }),
    plumage: choice('How is it feathered?', {
      adult: 'An adult: brown, with a pale straw head, yellow bill and white wedge tail.',
      juvenile: 'A young bird, dark chocolate all over with a dark bill.',
      silhouette: 'A pure black silhouette, as seen against a bright sky.',
      pale: 'A very old bird bleached almost blond, ghostly.',
    }),
    mark: choice('What stands on the skerry beneath it?', {
      cairn: 'A stone sea-mark cairn, whitewashed, with a wooden pointer arm.',
      iron: 'A rusty iron perch: a pole with a finger pointing to the safe channel.',
      snag: 'A dead, salt-silvered pine snag.',
      bare: 'Nothing but the bare rock and its weed.',
      light: 'A small lantern beacon on a white post, blinking.',
    }),
    height: score('If it is flying, how high above the rock?', ['Skimming just overhead', 'A house-height up', 'High and small']),
    story: choice('What else is in the air?', {
      nothing: 'Nothing: it has the sky to itself.',
      fish: 'A fish in its talons (or under its foot), still silver.',
      mobbed: 'Gulls mobbing it, wheeling and diving at its back.',
      feather: 'A single moulted feather drifting down.',
    }),
    sea: noul('Is the skerry ringed with dark water and a line of foam?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const flying = a.pose === 'glide' || a.pose === 'bank' || a.pose === 'strike';

    // The skerry.
    const phase = random() * 6;
    const rockGeometry = new THREE.IcosahedronGeometry(1, 3);
    const rp = rockGeometry.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i);
      const bump = 1 + Math.sin(x * 5 + phase) * Math.cos(z * 4 + phase * 2) * 0.16 + Math.sin(x * 11 + z * 9 + phase) * 0.05;
      rp.setXYZ(i, x * bump, Math.max(y, -0.15) * bump, z * bump);
    }
    rockGeometry.computeVertexNormals();
    const rw = mix(1.25, 1.7, random()), rh = mix(0.5, 0.75, random());
    const rock = s.mesh(rockGeometry, new THREE.MeshStandardMaterial({ color: mix(0, 1, mood.warmth) > 0.5 ? '#8a8378' : '#7b8084', roughness: 1, flatShading: true }), [0, 0, 0]);
    rock.scale.set(rw, rh, rw * 0.8);
    const topY = rh * 0.98;
    // Weed at the tide line, lichen and droppings above it.
    const weed: { at: [number, number, number]; size: number; color: string }[] = [];
    for (let i = 0; i < 46; i++) {
      const angle = random() * Math.PI * 2;
      weed.push({ at: [Math.cos(angle) * rw * 0.97, 0.05 + random() * 0.1, Math.sin(angle) * rw * 0.78], size: 0.1 + random() * 0.12, color: ['#5a5a22', '#6f6a2a', '#3f4a22', '#7a5a1e'][Math.floor(random() * 4)] });
    }
    for (let i = 0; i < 14; i++) {
      const angle = random() * Math.PI * 2, r = random() * 0.6;
      weed.push({ at: [Math.cos(angle) * rw * r, rh * Math.sqrt(1 - r * r) * 0.98, Math.sin(angle) * rw * 0.8 * r], size: 0.05 + random() * 0.06, color: random() < 0.5 ? '#e9e9e2' : '#c9a52e' });
    }
    const blob = new THREE.IcosahedronGeometry(1, 1);
    blob.scale(1, 0.45, 1);
    s.scatter(blob, new THREE.MeshStandardMaterial({ roughness: 1 }), weed);
    if (mood.warmth < 0.2) s.ball([rw * 0.5, 0.1, rw * 0.4], [0.1, topY - 0.03, -0.1], s.material('#f3f5f7'), 12);

    let perchY = topY, perchX = 0, perchZ = 0;
    let lamp: THREE.MeshStandardMaterial | null = null;
    const iron = s.material('#5a3a26', { roughness: 0.9, metalness: 0.3 });
    if (a.mark === 'cairn') {
      const stones: { at: [number, number, number]; size: number; color: string }[] = [];
      const h = 1.5;
      for (let layer = 0; layer < 7; layer++) {
        const r = mix(0.48, 0.2, layer / 6), n = Math.max(4, Math.round(r * 16));
        for (let i = 0; i < n; i++) {
          const angle = (i / n) * Math.PI * 2 + layer * 0.5;
          stones.push({ at: [Math.cos(angle) * r, topY + 0.05 + layer * (h / 7), Math.sin(angle) * r], size: 0.15 + random() * 0.04, color: layer > 3 && wear < 0.7 ? '#e9e8e0' : ['#77797a', '#8e8e89', '#6a6c6c'][i % 3] });
        }
      }
      const stone = new THREE.IcosahedronGeometry(1, 0);
      stone.scale(1, 0.7, 1);
      s.scatter(stone, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), stones);
      s.cylinder(0.14, 0.42, h, [0, topY + h / 2, 0], s.material('#6f7172', { roughness: 1 }), 8);
      s.rod([0, topY + h - 0.3, 0], [0, topY + h + 0.55, 0], 0.05, s.material('#4a4038'));
      s.box([0.9, 0.12, 0.04], [0.42, topY + h + 0.3, 0], s.material('#4a4038')).rotation.z = 0.12;
      perchY = topY + h + 0.57;
    } else if (a.mark === 'iron') {
      s.rod([0, topY - 0.2, 0], [0.05 * wear, topY + 2.1, 0], 0.045, iron);
      s.rod([0, topY + 1.7, 0], [0.85, topY + 1.95, 0.1], 0.035, iron);
      s.box([0.3, 0.16, 0.03], [0.9, topY + 1.97, 0.1], iron).rotation.z = 0.28;
      for (const sx of [-1, 1]) s.rod([sx * 0.5, topY - 0.25, 0.3], [0, topY + 1.1, 0], 0.02, iron);
      perchY = topY + 2.12;
    } else if (a.mark === 'snag') {
      const wood = s.material('#a9a59c', { roughness: 1 });
      s.rod([0, topY - 0.2, 0], [0.18, topY + 2.2, -0.05], 0.13, wood, 0.06);
      s.rod([0.08, topY + 1.2, 0], [0.9, topY + 1.75, 0.2], 0.05, wood, 0.02);
      s.rod([0.05, topY + 0.8, 0], [-0.7, topY + 1.5, -0.25], 0.05, wood, 0.02);
      s.rod([0.14, topY + 1.7, 0], [-0.3, topY + 2.25, 0.3], 0.035, wood, 0.015);
      perchY = topY + 2.22; perchX = 0.18; perchZ = -0.05;
    } else if (a.mark === 'light') {
      s.cylinder(0.09, 0.12, 1.7, [0, topY + 0.8, 0], s.material('#eeeee8'), 10);
      s.cylinder(0.2, 0.2, 0.06, [0, topY + 1.66, 0], s.material('#2d3338'), 12);
      lamp = s.material('#fff1b8', { emissive: '#ffd45a', emissiveIntensity: 2.5 });
      s.cylinder(0.11, 0.11, 0.24, [0, topY + 1.8, 0], lamp, 10);
      s.mesh(new THREE.ConeGeometry(0.19, 0.16, 10), s.material('#2d3338'), [0, topY + 2, 0]);
      perchY = topY + 2.08;
    }

    // Plumage.
    const plume = {
      adult: { body: '#5a452f', flight: '#2f261d', head: '#cdbb8f', tail: '#f2f0e8', bill: '#e9b82a' },
      juvenile: { body: '#3b2c20', flight: '#211a14', head: '#3f3023', tail: '#4a3a2c', bill: '#33302c' },
      silhouette: { body: '#0d0d0f', flight: '#0d0d0f', head: '#0d0d0f', tail: '#0d0d0f', bill: '#0d0d0f' },
      pale: { body: '#a8946e', flight: '#5d4c38', head: '#efe6cd', tail: '#fbfaf5', bill: '#f1cf58' },
    }[a.plumage];
    const flat = a.plumage === 'silhouette';
    const feather = (colour: string) => new THREE.MeshStandardMaterial({ color: colour, roughness: flat ? 1 : 0.85, side: THREE.DoubleSide, flatShading: true });
    const bodyMat = feather(plume.body), flightMat = feather(plume.flight), headMat = feather(plume.head), tailMat = feather(plume.tail);
    const billMat = feather(plume.bill);

    const bird = new THREE.Group();
    const part = (mesh: THREE.Mesh, parent: THREE.Object3D = bird) => { mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    const ball = (size: [number, number, number], at: [number, number, number], material: THREE.Material, parent: THREE.Object3D = bird) => {
      const mesh = part(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), material), parent);
      mesh.scale.set(...size);
      mesh.position.set(...at);
      return mesh;
    };
    ball([0.2, 0.19, 0.46], [0, 0, 0], bodyMat);
    ball([0.15, 0.15, 0.2], [0, 0.07, 0.38], headMat);
    const head = new THREE.Group();
    head.position.set(0, 0.11, 0.5);
    bird.add(head);
    ball([0.115, 0.11, 0.13], [0, 0, 0], headMat, head);
    const bill = part(new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.2, 6), billMat), head);
    bill.rotation.x = Math.PI / 2 + 0.25;
    bill.position.set(0, -0.02, 0.17);
    const hook = part(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 5), billMat), head);
    hook.rotation.x = Math.PI;
    hook.position.set(0, -0.08, 0.24);
    if (!flat) for (const sx of [-1, 1]) ball([0.02, 0.02, 0.02], [sx * 0.085, 0.03, 0.08], new THREE.MeshStandardMaterial({ color: '#f2d24a', emissive: '#a07a10', emissiveIntensity: 0.6 }), head);
    // Wedge tail.
    const tailShape = new THREE.Shape([[-0.09, 0], [0.09, 0], [0.26, -0.36], [0.12, -0.46], [0, -0.5], [-0.12, -0.46], [-0.26, -0.36]].map(([x, y]) => new THREE.Vector2(x, y)));
    const tailGeometry = new THREE.ExtrudeGeometry(tailShape, { depth: 0.02, bevelEnabled: false });
    tailGeometry.rotateX(-Math.PI / 2);
    const tail = part(new THREE.Mesh(tailGeometry, tailMat));
    tail.position.set(0, 0.0, -0.36);
    tail.scale.z = -1;
    tailGeometry.scale(1, 1, -1);
    tail.scale.z = 1;

    // Wings: an arm panel and a hand of fingered primaries, hinged so they can flex or fold.
    const wingPivots: { shoulder: THREE.Group; wrist: THREE.Group; side: number }[] = [];
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.14, 0.08, 0.1);
      const arm = new THREE.Shape([[0, 0.2], [0.3, 0.27], [0.62, 0.25], [0.62, -0.33], [0.45, -0.37], [0.3, -0.35], [0.15, -0.37], [0, -0.3]].map(([x, y]) => new THREE.Vector2(x * side, y)));
      const armGeometry = new THREE.ExtrudeGeometry(arm, { depth: 0.025, bevelEnabled: false });
      armGeometry.rotateX(Math.PI / 2);
      part(new THREE.Mesh(armGeometry, flightMat), shoulder);
      const covert = new THREE.Shape([[0, 0.2], [0.3, 0.27], [0.62, 0.25], [0.62, -0.05], [0, -0.08]].map(([x, y]) => new THREE.Vector2(x * side, y)));
      const covertGeometry = new THREE.ExtrudeGeometry(covert, { depth: 0.045, bevelEnabled: false });
      covertGeometry.rotateX(Math.PI / 2);
      part(new THREE.Mesh(covertGeometry, bodyMat), shoulder).position.y = 0.012;
      const wrist = new THREE.Group();
      wrist.position.set(side * 0.62, 0, 0);
      shoulder.add(wrist);
      const points: [number, number][] = [[0, 0.25], [0.2, 0.25]];
      const fingers = 6;
      for (let i = 0; i < fingers; i++) {
        const angle = mix(1.0, -0.75, i / (fingers - 1));
        const missing = random() < wear * 0.3;
        const reach = (missing ? 0.3 : mix(0.62, 0.5, Math.abs(i - 1.5) / 4)) * mix(0.94, 1.06, random());
        const cx = 0.14, cy = -0.03;
        points.push([cx + Math.cos(angle + 0.09) * reach * 0.93, cy + Math.sin(angle + 0.09) * reach * 0.93]);
        points.push([cx + Math.cos(angle - 0.07) * reach, cy + Math.sin(angle - 0.07) * reach]);
        if (i < fingers - 1) points.push([cx + Math.cos(angle - 0.17) * 0.3, cy + Math.sin(angle - 0.17) * 0.3]);
      }
      points.push([0.12, -0.36], [0, -0.33]);
      const hand = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x * side, y)));
      const handGeometry = new THREE.ExtrudeGeometry(hand, { depth: 0.02, bevelEnabled: false });
      handGeometry.rotateX(Math.PI / 2);
      part(new THREE.Mesh(handGeometry, flightMat), wrist);
      bird.add(shoulder);
      wingPivots.push({ shoulder, wrist, side });
    }
    // Legs and feet.
    const legs = new THREE.Group();
    legs.position.set(0, -0.12, -0.02);
    bird.add(legs);
    const legMat = feather(flat ? '#0d0d0f' : '#e2b22c');
    for (const sx of [-1, 1]) {
      ball([0.07, 0.14, 0.08], [sx * 0.09, -0.06, 0], bodyMat, legs);
      const shin = part(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), legMat), legs);
      shin.position.set(sx * 0.09, -0.24, 0);
      for (let t = 0; t < 3; t++) {
        const toe = part(new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.12, 4), legMat), legs);
        toe.position.set(sx * 0.09 + (t - 1) * 0.04, -0.33, 0.05);
        toe.rotation.x = Math.PI / 2 + 0.3;
        toe.rotation.z = -(t - 1) * 0.5;
      }
    }
    const fish = () => {
      const group = new THREE.Group();
      const silver = new THREE.MeshStandardMaterial({ color: '#c2cbd0', roughness: 0.3, metalness: 0.5 });
      const bodyFish = part(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), silver), group);
      bodyFish.scale.set(0.055, 0.08, 0.26);
      const fin = part(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 3), silver), group);
      fin.scale.z = 0.2;
      fin.rotation.x = Math.PI / 2;
      fin.position.z = -0.3;
      return group;
    };

    // Pose.
    const heightAbove = mix(0.7, 3.4, a.height);
    let bob = 0;
    if (flying) {
      const dihedral = a.pose === 'strike' ? 0.75 : a.pose === 'bank' ? 0.1 : 0.06;
      for (const { shoulder, wrist, side } of wingPivots) {
        shoulder.rotation.z = side * dihedral;
        wrist.rotation.z = side * (a.pose === 'strike' ? -0.25 : 0.1);
        if (a.pose === 'strike') shoulder.rotation.y = -side * 0.25;
      }
      if (a.pose === 'bank') bird.rotation.z = mix(0.5, 0.8, random()) * (random() < 0.5 ? -1 : 1);
      if (a.pose === 'strike') {
        bird.rotation.x = -0.55;
        legs.rotation.x = -1.3;
        legs.position.set(0, -0.1, 0.12);
        tail.rotation.x = 0.5;
        head.rotation.x = 0.5;
      } else {
        legs.rotation.x = 1.35;
        legs.scale.setScalar(0.8);
        legs.position.set(0, -0.06, -0.2);
        head.rotation.x = 0.3;
      }
      const lift = a.pose === 'strike' ? Math.min(heightAbove, 1.1) : heightAbove;
      bird.position.set(perchX + (a.mark === 'bare' ? 0 : 0.25), perchY + lift + 0.4, perchZ + 0.2);
      bird.rotation.y = (random() - 0.5) * 0.9;
      bob = 1;
      if (a.story === 'fish') {
        const caught = fish();
        caught.position.set(0, -0.36, 0.06);
        legs.add(caught);
      }
    } else {
      // Upright on the perch.
      bird.rotation.x = -1.05;
      head.rotation.x = 1.0;
      head.position.set(0, 0.2, 0.47);
      legs.rotation.x = 1.05;
      legs.position.set(0, -0.1, -0.22);
      tail.rotation.x = -0.25;
      for (const { shoulder, wrist, side } of wingPivots) {
        if (a.pose === 'perched') {
          shoulder.visible = false;
          const folded = ball([0.075, 0.16, 0.45], [side * 0.17, 0.05, -0.14], flightMat);
          folded.rotation.y = -side * 0.12;
          ball([0.09, 0.13, 0.22], [side * 0.16, 0.08, 0.12], bodyMat);
        } else {
          shoulder.rotation.set(0, side * 0.5, side * 0.35);
          wrist.rotation.set(0, side * 0.7, -side * 0.5);
        }
      }
      bird.position.set(perchX, perchY + 0.66, perchZ);
      bird.rotation.y = (random() - 0.5) * 1.2;
      head.rotation.y = (random() - 0.5) * 1.4;
      if (a.story === 'fish') {
        const caught = fish();
        caught.rotation.y = 1.2;
        caught.position.set(perchX + 0.05, perchY + 0.06, perchZ + 0.12);
        if (a.mark === 'bare') s.root.add(caught);
        else { caught.position.set(0.5, topY + 0.03, 0.4); s.root.add(caught); }
      }
    }
    bird.scale.setScalar(1.55);
    s.root.add(bird);

    const gulls: THREE.Group[] = [];
    if (a.story === 'mobbed') {
      const white = new THREE.MeshStandardMaterial({ color: '#f4f4ef', roughness: 0.8, side: THREE.DoubleSide });
      const count = 2 + Math.round(mood.density * 3);
      for (let i = 0; i < count; i++) {
        const gull = new THREE.Group();
        const g = part(new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), white), gull);
        g.scale.set(0.06, 0.06, 0.17);
        for (const sx of [-1, 1]) {
          const wing = part(new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 3), white), gull);
          wing.scale.z = 0.12;
          wing.rotation.z = -sx * (Math.PI / 2 - 0.5);
          wing.position.set(sx * 0.2, 0.08, 0);
        }
        gull.userData.angle = (i / count) * Math.PI * 2 + random();
        gull.userData.radius = 0.9 + random() * 0.6;
        gull.userData.lift = 0.3 + random() * 0.6;
        s.root.add(gull);
        gulls.push(gull);
      }
    }
    let lost: THREE.Mesh | null = null;
    if (a.story === 'feather') {
      lost = s.mesh(new THREE.ConeGeometry(0.035, 0.3, 4), feather(flat ? '#0d0d0f' : plume.tail));
      lost.scale.z = 0.15;
    }
    if (a.sea) {
      const water = s.cylinder(1, 1, 0.05, [0, 0.0, 0], s.material('#27434f', { roughness: 0.25, metalness: 0.2 }), 36);
      water.scale.set(rw * 1.75, 1, rw * 1.5);
      const foamRing = s.ring(1, 0.07, [0, 0.05, 0], s.material('#eef4f5'));
      foamRing.rotation.x = Math.PI / 2;
      foamRing.scale.set(rw * 1.04, rw * 0.84, 0.5);
    }

    const base = bird.position.clone();
    const drift = (time: number) => {
      gulls.forEach((gull) => {
        const angle = gull.userData.angle + time * mix(0.5, 2.2, mood.energy);
        gull.position.set(bird.position.x + Math.cos(angle) * gull.userData.radius, bird.position.y + gull.userData.lift + Math.sin(angle * 2) * 0.2, bird.position.z + Math.sin(angle) * gull.userData.radius);
        gull.rotation.y = -angle;
      });
      if (lost) {
        const t = (time * 0.12 + 0.35) % 1;
        lost.position.set(base.x - 0.5 + Math.sin(t * 12) * 0.25, mix(base.y - 0.3, topY + 0.3, t), base.z - 0.4);
        lost.rotation.z = Math.sin(t * 12) * 0.8 + 1.2;
      }
    };
    drift(0);
    return s.finish({
      footprint: rw * 1.1,
      update: (_dt, time) => {
        if (bob) {
          bird.position.y = base.y + Math.sin(time * 0.9) * 0.06 * mix(0.3, 1.5, mood.energy);
          for (const { wrist, side } of wingPivots) wrist.rotation.z = side * ((a.pose === 'strike' ? -0.25 : 0.1) + Math.sin(time * 1.3) * 0.06 * mix(0.3, 1.5, mood.energy));
        } else head.rotation.y = Math.sin(time * 0.5) * 0.8;
        if (lamp) lamp.emissiveIntensity = Math.sin(time * 2.2) > 0.2 ? 3 : 0.2;
        drift(time);
      },
    });
  },
});
