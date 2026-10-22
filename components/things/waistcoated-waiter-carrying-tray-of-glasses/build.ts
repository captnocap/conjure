import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix } from '@conjure/kit';
import { RAD, anatomy, at, bottleGeometry, garment, glassGeometry, glassMaterial, moustache, pick, pickSkin, reachHand, rig, shirtFront, slick, type P } from './milonga';

export default defineThing({
  questions: {
    load: choice('What is on the tray?', {
      wine: 'Four glasses of red wine and the open bottle.',
      champagne: 'Four flutes of champagne and the bottle in its gold foil: someone is celebrating.',
      coffee: 'Four espressos on saucers and a sugar bowl: the small hours.',
      empties: 'Empties, cleared from a table: glasses with dregs, one knocked over, the dead bottle on its side.',
    }),
    balance: choice('How is the tray riding?', {
      level: 'Dead level, nothing moving, a lifetime of practice.',
      wobble: 'A small wobble, the glasses chiming.',
      tipping: 'Tipping dangerously, one glass sliding to the rim.',
    }),
    free: choice('What is his other hand doing?', {
      cloth: 'Held at the waist with a white cloth folded over the forearm.',
      swing: 'Swinging free with the stride.',
      behind: 'Tucked behind his back, very correct.',
      steady: 'Reaching up to steady the tray.',
    }),
    stride: choice('How is he moving?', {
      glide: 'A long smooth glide between the tables.',
      hurry: 'Hurrying, leaning into the step.',
      careful: 'Short careful steps, weight back.',
    }),
    apron: choice('What apron does he wear?', {
      long: 'A long white apron to the ankles, the Paris garçon.',
      short: 'A short black bistro apron to the knee.',
      none: 'No apron, just the waistcoat and trousers.',
    }),
    tie: choice('What is at his collar?', {
      bow: 'A black bow tie.',
      tie: 'A narrow black tie.',
      none: 'Nothing, the collar open.',
    }),
    moustache: choice('Does he have a moustache?', {
      none: 'Clean-shaven.',
      pencil: 'A thin pencil moustache.',
      walrus: 'A thick walrus moustache, grey at the ends.',
    }),
    who: choice('Who is he?', {
      young: 'A young waiter, dark hair slicked back, quick.',
      veteran: 'A veteran, grey hair combed back, thirty years on this floor.',
      bald: 'Bald and solid, unflappable.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.7, 1.86, random());
    const build = a.who === 'bald' ? 'heavy' : a.who === 'young' ? 'slight' : random() < 0.5 ? 'average' : 'heavy';
    const skin = pickSkin(random);
    const shirt = '#f4f1ea';
    const black = '#1c1b20';

    const person = figure(s, {
      height: H, build, style: 'doll', skin, hair: 'none',
      top: shirt, bottom: black, shoes: '#0e0d0f', sleeves: 'long', pose: 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const pose = rig(person);
    const { torsoL, chestR, hipW, limb, pelvisL } = anatomy(H, build);

    // ---- the stride: the left foot leading, the right heel lifting off behind
    const k = { glide: 1, hurry: 1.2, careful: 0.55 }[a.stride];
    const fwd = 17 * k, back = -13 * k, backKnee = 12 + 16 * k;
    pose.leg('left', { forward: fwd, knee: 6, out: 2, foot: fwd - 6 - 4 });
    pose.leg('right', { forward: back, knee: backKnee, out: 2, foot: back - backKnee + 26 * k });
    pose.lean(a.stride === 'hurry' ? 8 : a.stride === 'careful' ? -3 : 3, 0);
    pose.bow(a.stride === 'careful' ? -4 : 0, 0, 0);
    person.settle();

    // ---- the tray hand: elbow out, forearm up, the palm flat just above his head and off his right shoulder
    const shoulder = at(s, person.joints.shoulders.right);
    const palm = new THREE.Vector3(shoulder.x - 0.2 * H / 1.75, shoulder.y + 0.24 * H / 1.75, shoulder.z + 0.04);
    reachHand(s, person, 'right', palm, { outMin: 25, outMax: 100 });
    const hand = at(s, person.hands.right);

    // ---- the tray and its load, riding on the fingertips
    const tray = new THREE.Group();
    tray.position.copy(hand).add(new THREE.Vector3(-0.02, 0.008, 0));
    const tilt = { level: 0, wobble: 4, tipping: 13 }[a.balance] * RAD;
    tray.rotation.set(tilt * 0.4, random() * Math.PI * 2, -tilt);
    s.root.add(tray);
    const silver = s.material(random() < 0.6 ? '#c9ccd0' : '#b89a4a', { metalness: 0.75, roughness: 0.28 });
    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, position: P, parent: THREE.Object3D = tray, rotation: P = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const R = 0.19;
    put(new THREE.CylinderGeometry(R, R * 0.96, 0.012, 32), silver, [0, 0.006, 0]);
    put(new THREE.TorusGeometry(R, 0.006, 6, 40), silver, [0, 0.014, 0], tray, [Math.PI / 2, 0, 0]);
    // Many of the same glass: one instanced mesh, and one for what is in them.
    const many = (geometry: THREE.BufferGeometry, material: THREE.Material, spots: { at: P; tilt?: P }[]) => {
      const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      spots.forEach((spot, index) => {
        q.setFromEuler(new THREE.Euler(...(spot.tilt ?? [0, 0, 0])));
        m.compose(new THREE.Vector3(...spot.at), q, new THREE.Vector3(1, 1, 1));
        mesh.setMatrixAt(index, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      tray.add(mesh);
      return mesh;
    };
    const ring = (count: number, radius: number, from = 0) => Array.from({ length: count }, (_, i) => {
      const angle = from + (i / count) * Math.PI * 2 + (random() - 0.5) * 0.25;
      return [Math.cos(angle) * radius, 0.012, Math.sin(angle) * radius] as P;
    });
    const glass = glassMaterial('#eef3f0', 0.34);
    const spots = ring(4, 0.115);
    const sliding = a.balance === 'tipping';
    // A tipping tray has sent the downhill glass toward the rim.
    if (sliding) spots[0] = [-0.15, 0.012, 0.02];
    if (a.load === 'wine' || a.load === 'empties') {
      const standing = a.load === 'empties' ? spots.slice(1) : spots;
      many(glassGeometry('wine'), glass, standing.map((p) => ({ at: p })));
      if (a.load === 'wine') many(new THREE.LatheGeometry([[0, 0.078], [0.029, 0.082], [0.033, 0.1], [0, 0.104]].map(([x, y]) => new THREE.Vector2(x, y)), 14), s.material('#5a0f1e', { roughness: 0.3 }), standing.map((p) => ({ at: p })));
      else {
        many(new THREE.LatheGeometry([[0, 0.078], [0.012, 0.079], [0, 0.081]].map(([x, y]) => new THREE.Vector2(x, y)), 10), s.material('#4a0f1a', { roughness: 0.3 }), standing.map((p) => ({ at: p })));
        // One knocked over, and the empty bottle on its side.
        put(glassGeometry('wine'), glass, [spots[0][0], 0.045, spots[0][2]], tray, [0, 0.4, Math.PI / 2]).castShadow = false;
        put(bottleGeometry(0.28), s.material('#1a2a1e', { roughness: 0.25 }), [0.02, 0.05, -0.04], tray, [0, -0.6, Math.PI / 2 - 0.05]);
        put(new THREE.IcosahedronGeometry(0.035, 0), s.material('#f1ece2', { roughness: 0.95 }), [0.06, 0.04, 0.09]);
      }
      if (a.load === 'wine') {
        put(bottleGeometry(0.3), s.material(pick(random, ['#1a2a1e', '#2a1a1a', '#14181a']), { roughness: 0.25 }), [0, 0.012, 0]);
        put(new THREE.CylinderGeometry(0.038, 0.038, 0.07, 14), s.material(pick(random, ['#d9c49a', '#e9e2cc', '#b3202c']), { roughness: 0.8 }), [0, 0.13, 0]);
      }
    } else if (a.load === 'champagne') {
      many(glassGeometry('flute'), glass, spots.map((p) => ({ at: p })));
      many(new THREE.LatheGeometry([[0, 0.1], [0.016, 0.105], [0.019, 0.19], [0, 0.19]].map(([x, y]) => new THREE.Vector2(x, y)), 12), s.material('#e3c66a', { roughness: 0.25, emissive: '#5a4210', emissiveIntensity: 0.3 }), spots.map((p) => ({ at: p })));
      put(bottleGeometry(0.31), s.material('#1f3a24', { roughness: 0.2 }), [0, 0.012, 0]);
      put(new THREE.CylinderGeometry(0.016, 0.03, 0.09, 14), s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 }), [0, 0.012 + 0.27, 0]);
      put(new THREE.CylinderGeometry(0.038, 0.038, 0.06, 14), s.material('#f1ece2', { roughness: 0.8 }), [0, 0.012 + 0.12, 0]);
    } else {
      const china = s.material('#f3efe6', { roughness: 0.4 });
      many(new THREE.CylinderGeometry(0.05, 0.05, 0.006, 18), china, spots.map((p) => ({ at: [p[0], p[1] + 0.003, p[2]] })));
      many(new THREE.LatheGeometry([[0, 0], [0.02, 0.002], [0.028, 0.04], [0.03, 0.046], [0, 0.046]].map(([x, y]) => new THREE.Vector2(x, y)), 14), china, spots.map((p) => ({ at: [p[0], p[1] + 0.006, p[2]] })));
      many(new THREE.CylinderGeometry(0.023, 0.023, 0.004, 12), s.material('#3a2416', { roughness: 0.5 }), spots.map((p) => ({ at: [p[0], p[1] + 0.046, p[2]] })));
      put(new THREE.LatheGeometry([[0, 0], [0.04, 0.003], [0.048, 0.04], [0.042, 0.06], [0, 0.07]].map(([x, y]) => new THREE.Vector2(x, y)), 16), china, [0, 0.012, 0]);
      put(new THREE.SphereGeometry(0.01, 8, 6), china, [0, 0.085, 0]);
    }
    s.root.updateMatrixWorld(true);

    // ---- the free hand
    if (a.free === 'steady') {
      const rim = tray.localToWorld(new THREE.Vector3(R * 0.9, -0.01, 0.05));
      reachHand(s, person, 'left', s.root.worldToLocal(rim), { across: true, outMin: -10, outMax: 80 });
      pose.look(-24, -18, 0);
    } else if (a.free === 'behind') {
      const pelvis = at(s, person.pelvis);
      reachHand(s, person, 'left', pelvis.clone().add(new THREE.Vector3(0.02, 0.06, -0.17)), { across: true, outMin: -10, outMax: 40, forwardMin: -80, forwardMax: 30 });
      pose.look(-4, 6, 0);
    } else if (a.free === 'swing') {
      pose.arm('left', { forward: -26 * k, out: 8, bend: 18 });
      pose.look(a.balance === 'tipping' ? -20 : 0, a.balance === 'tipping' ? -14 : 4, 0);
    } else {
      pose.arm('left', { forward: 28, out: 10, bend: 82, across: 12 });
      // A white cloth folded over the level forearm, hanging both sides.
      const linen = s.material('#f6f3ec', { roughness: 0.95, side: THREE.DoubleSide });
      const elbow = person.joints.elbows.left;
      const { foreL } = anatomy(H, build);
      for (const side of [-1, 1]) {
        const flap = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.13, 0.2), linen);
        flap.position.set(side * limb * 1.05, -foreL * 0.55, -0.08);
        flap.rotation.x = 0.1;
        flap.castShadow = true;
        elbow.add(flap);
      }
      const fold = new THREE.Mesh(new THREE.BoxGeometry(limb * 2.2, 0.13, 0.012), linen);
      fold.position.set(0, -foreL * 0.55, limb * 0.95);
      elbow.add(fold);
      pose.look(a.balance === 'tipping' ? -20 : 0, a.balance === 'tipping' ? -14 : 0, 0);
    }

    // ---- black waistcoat over the white shirt, the tie, the apron
    const waistcoat = s.material(black, { roughness: 0.7, side: THREE.DoubleSide });
    garment(person, H, build, waistcoat, { grow: 1.1, length: 0.86, open: 46, lift: 0.06, flare: 1.04 });
    // Waistcoat buttons down the opening.
    for (let i = 0; i < 4; i++) {
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 5), s.material('#b89a4a', { metalness: 0.7, roughness: 0.35 }));
      button.position.set(chestR * 0.36, torsoL * (0.2 + i * 0.13), chestR * 1.12);
      person.joints.spine.add(button);
    }
    shirtFront(s, person, H, build, { tie: a.tie === 'none' ? 'none' : a.tie, tieColour: '#141418' });
    if (a.apron !== 'none') {
      const long = a.apron === 'long';
      const apronMat = s.material(long ? '#f6f3ec' : '#1a1a1e', { roughness: 0.9, side: THREE.DoubleSide });
      const top = hipW + limb * 1.15;
      const length = long ? H * 0.47 : H * 0.22;
      const bottom = long ? 0.27 * H / 1.75 : 0.21 * H / 1.75;
      // A wrap of cloth across the front and sides, hung from the waist and flaring over the stride. The
      // waist is pinched front to back to hug the hips; the hem opens out round so the knees stay inside.
      const sweep = long ? 3.9 : 2.9;
      const geometry = new THREE.CylinderGeometry(top, bottom, length, 24, 6, true, -sweep / 2, sweep);
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const t = (length / 2 - position.getY(i)) / length;
        position.setZ(i, position.getZ(i) * mix(0.5, 1, Math.sqrt(Math.min(1, Math.max(0, t)))));
      }
      geometry.computeVertexNormals();
      const panel = new THREE.Mesh(geometry, apronMat);
      panel.position.y = pelvisL * 0.6 - length / 2;
      panel.castShadow = panel.receiveShadow = true;
      person.pelvis.add(panel);
      const band = new THREE.Mesh(new THREE.TorusGeometry(top * 1.02, 0.008, 6, 28), s.material(long ? '#e9e4d8' : '#2a2a2e', { roughness: 0.9 }));
      band.rotation.x = Math.PI / 2;
      band.scale.y = 0.52;
      band.position.y = pelvisL * 0.6;
      person.pelvis.add(band);
    }
    if (a.free === 'swing') {
      // The cloth rides tucked in at the hip instead.
      const tuck = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.012), s.material('#f6f3ec', { roughness: 0.95 }));
      tuck.position.set(hipW + limb * 1.2, -0.06, 0.04);
      tuck.rotation.set(0, Math.PI / 2 - 0.3, 0.06);
      person.pelvis.add(tuck);
    }

    // ---- hair and moustache
    if (a.who === 'young') slick(person, H, s.material('#1a1410', { roughness: 0.3 }));
    else if (a.who === 'veteran') slick(person, H, s.material(pick(random, ['#b5b2ab', '#d9d6cf', '#8a8780']), { roughness: 0.35 }));
    else {
      const fringe = new THREE.Mesh(new THREE.TorusGeometry(H * 0.058, H * 0.012, 6, 20, Math.PI * 1.2), s.material('#8a8780', { roughness: 0.6 }));
      fringe.rotation.set(Math.PI / 2, 0, Math.PI * 0.9);
      fringe.position.y = -H * 0.01;
      person.head.add(fringe);
    }
    const tash = a.moustache === 'none' ? null : moustache(person, H, s.material(a.who === 'young' ? '#1a1410' : '#6a645c', { roughness: 0.6 }));
    if (tash && a.moustache === 'walrus') { tash.scale.set(1.35, 2.6, 1.6); tash.position.y -= H * 0.006; }

    // ---- seen from the room: three-quarters, crossing toward the viewer's right with the tray arm nearest
    s.root.rotation.y = 38 * RAD;

    // The tray rides the stride; a wobbling one chimes, a tipping one shivers.
    const energy = mood.energy;
    const rest = tray.rotation.clone();
    const amount = { level: 0.004, wobble: 0.03, tipping: 0.05 }[a.balance] * (0.4 + energy);
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        tray.rotation.x = rest.x + Math.sin(time * (2 + energy * 4)) * amount;
        tray.rotation.z = rest.z + Math.sin(time * (2.6 + energy * 4) + 1) * amount;
      },
    });
  },
});
