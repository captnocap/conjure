import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix } from '@conjure/kit';
import { dressParts, paint, pick, pickSkin, reach, rig } from './rig';

export default defineThing({
  questions: {
    hat: choice('What is on her head?', {
      wide: 'A wide-brimmed black hat, the veil hanging from the brim.',
      pillbox: 'A small black pillbox hat with a net veil pinned to its edge.',
      fascinator: 'A black fascinator, a feather and a wisp of net to one side.',
      none: 'No hat: the veil is pinned into her hair.',
    }),
    veil: choice('How long is the veil?', {
      short: 'A short net veil to the chin, the face still readable.',
      long: 'A veil falling past the shoulders.',
      full: 'A full mourning veil to the waist, the face a shadow behind it.',
    }),
    gloves: choice('What are her hands in?', {
      black: 'Black gloves.',
      white: 'White cotton church gloves.',
      lace: 'Black lace gloves.',
      bare: 'Bare hands and a wedding ring.',
    }),
    holding: choice('What is in the free hand?', {
      nothing: 'Nothing: the free arm is folded across her waist, held at the elbow by nobody.',
      lily: 'A single white lily on a long stem.',
      rosary: 'A rosary, the beads wound round the fingers and hanging.',
      programme: 'A folded funeral programme.',
      purse: 'A small black clutch purse.',
    }),
    bearing: choice('How is she holding up?', {
      composed: 'Upright and composed, chin nearly level, the handkerchief pressed still to the cheek.',
      folded: 'Folded forward from the waist, shoulders dropped, head bowed into the handkerchief.',
      swaying: 'Leaning, the knees about to go, the free arm half out for support that is not there.',
    }),
    dress: choice('What is the dress?', {
      plain: 'A plain black dress to the knee.',
      long: 'A long black dress to the ankle.',
      lace: 'Black with a white lace collar.',
      pearls: 'Black with a string of pearls.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.56, 1.72, random());
    const build = pick(random, ['slight', 'average', 'average'] as const);
    const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const limb = H * 0.036 * wide, torsoL = H * 0.28, headR = H * 0.064, hipW = H * 0.075 * wide, shinL = H * 0.23, footL = H * 0.03;
    const black = '#141416';
    const hairColour = pick(random, ['#1a1512', '#3b2a22', '#6b6456', '#b8b0a4']);
    const skinHex = pickSkin(random);
    const person = figure(s, {
      height: H, build, style: 'doll', skin: skinHex, hair: a.hat === 'wide' ? 'hat' : a.hat === 'none' ? 'long' : 'bun', hairColor: a.hat === 'wide' ? black : hairColour,
      top: black, bottom: black, shoes: black, sleeves: 'long', pose: 'standing', gaze: 'down',
    });
    s.root.add(person.root);
    const r = rig(person);
    const { joints } = person;

    // Bearing: upright, folded into the handkerchief, or about to go.
    const folded = a.bearing === 'folded', swaying = a.bearing === 'swaying';
    r.leg('left', { forward: 0, out: 2, knee: 0 });
    r.leg('right', { forward: swaying ? -4 : 0, out: swaying ? 9 : 2, knee: swaying ? 6 : 0 });
    if (folded) { r.lean(4, 0); r.bow(18, 0, 4); r.look(26, 8, 4); }
    else if (swaying) { r.lean(-2, 7); r.bow(7, -9, -6); r.look(20, 10, -8); }
    else { r.lean(0, 0); r.bow(3, 0, 0); r.look(14, 6, 3); }
    // The free arm: folded across the waist, half out for support, or holding something low.
    if (swaying) r.arm('left', { forward: 24, out: 42, bend: 32, across: 0 });
    else if (a.holding === 'nothing') r.arm('left', { forward: 34, out: -2, bend: 100, across: 62 });
    else if (a.holding === 'lily') r.arm('left', { forward: 28, out: 6, bend: 78, across: 22 });
    else r.arm('left', { forward: 18, out: 4, bend: 68, across: 30 });
    person.settle();

    // The right hand presses the handkerchief to the right cheek, under the veil.
    person.root.updateMatrixWorld(true);
    const cheek = person.head.localToWorld(new THREE.Vector3(-headR * 0.78, -headR * 0.25, headR * 0.92));
    reach(person, 'right', cheek, { forward: 52, out: 14, bend: 128, across: 28 });
    person.settle();

    // Gloves: the hand meshes take the glove material; bare hands get a ring.
    const hand = (side: 'left' | 'right') => (joints.elbows[side].children[1] as THREE.Object3D).children[0] as THREE.Mesh;
    if (a.gloves !== 'bare') {
      const glove = a.gloves === 'white' ? s.material('#f1ede4', { roughness: 0.9 }) : a.gloves === 'lace'
        ? new THREE.MeshStandardMaterial({ map: paint(64, 64, (c) => { c.fillStyle = '#1a1a1e'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#4a4046'; for (let i = 0; i < 90; i++) { c.beginPath(); c.arc(random() * 64, random() * 64, 2, 0, 6.3); c.fill(); } }), roughness: 0.9 })
        : s.material('#1a1a1e', { roughness: 0.9 });
      hand('left').material = glove;
      hand('right').material = glove;
    } else {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(limb * 0.5, 0.004, 6, 14), s.material('#d9b23a', { metalness: 0.9, roughness: 0.25 }));
      ring.position.y = -H * 0.02;
      ring.rotation.x = Math.PI / 2;
      hand('left').add(ring);
    }

    // The dress: a hem hung from the hips over the legs, a collar or pearls at the neck.
    const dressMaterial = new THREE.MeshStandardMaterial({ color: black, roughness: 0.85, side: THREE.DoubleSide });
    const hemLength = a.dress === 'long' ? person.hipHeight - footL * 1.6 : person.hipHeight - (shinL + footL) + 0.06;
    const hem = new THREE.Mesh(new THREE.CylinderGeometry(hipW * 1.12, a.dress === 'long' ? hipW * 1.9 : hipW * 1.7, hemLength, 22, 1, true), dressMaterial);
    hem.position.y = -hemLength / 2 + 0.03;
    hem.scale.z = 0.8;
    hem.castShadow = true;
    person.pelvis.add(hem);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(hipW * 1.0, 0.012, 6, 20), s.material('#1d1c22', { roughness: 0.6 }));
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.04;
    belt.scale.z = 0.8;
    person.pelvis.add(belt);
    if (a.dress === 'lace') {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.55, 0.016, 6, 24), s.material('#f3efe6', { roughness: 0.95 }));
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, torsoL - limb * 0.55, 0);
      collar.scale.set(1.1, 1, 0.75);
      joints.spine.add(collar);
    }
    if (a.dress === 'pearls') {
      const beads: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i <= 18; i++) {
        const t = (i / 18 - 0.5) * Math.PI;
        beads.push({ at: [Math.sin(t) * limb * 1.7, torsoL - limb * 0.9 - Math.cos(t) * limb * 1.2, Math.cos(t) * limb * 1.25 + 0.01], size: 0.009 });
      }
      const pearls = s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#f3efe6', { roughness: 0.3, metalness: 0.1 }), beads);
      joints.spine.add(pearls);
    }

    // Hats beyond the kit's: a pillbox, a fascinator, or a wider brim with a ribbon on the kit's hat.
    const felt = s.material(black, { roughness: 0.85 });
    let veilAnchor: [number, number, number] = [0, headR * 0.72, headR * 1.65];
    let veilRadius = headR * 1.7;
    if (a.hat === 'wide') {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 2.0, headR * 2.0, headR * 0.06, 28), felt);
      brim.position.y = headR * 0.78;
      brim.rotation.x = 0.12;
      brim.castShadow = true;
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.08, headR * 1.08, headR * 0.3, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.45, side: THREE.DoubleSide }));
      ribbon.position.y = headR * 0.95;
      person.head.add(brim, ribbon);
      veilAnchor = [0, headR * 0.62, headR * 1.95];
      veilRadius = headR * 1.95;
    } else if (a.hat === 'pillbox') {
      const box = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.86, headR * 0.82, headR * 0.36, 20), felt);
      box.position.set(0, headR * 1.0, headR * 0.1);
      box.rotation.x = -0.18;
      box.castShadow = true;
      person.head.add(box);
      veilAnchor = [0, headR * 0.95, headR * 0.95];
      veilRadius = headR * 1.2;
    } else if (a.hat === 'fascinator') {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.55, headR * 0.55, headR * 0.08, 16), felt);
      disc.position.set(-headR * 0.6, headR * 0.95, headR * 0.2);
      disc.rotation.set(0.2, 0, 0.5);
      const plume = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.3, 10, 8), felt);
      plume.scale.set(0.5, 2.6, 0.35);
      plume.position.set(-headR * 0.75, headR * 1.5, headR * 0.1);
      plume.rotation.set(0.1, 0, 0.55);
      plume.castShadow = true;
      person.head.add(disc, plume);
      veilAnchor = [-headR * 0.2, headR * 0.9, headR * 0.9];
      veilRadius = headR * 1.2;
    } else {
      veilAnchor = [0, headR * 0.9, headR * 0.8];
      veilRadius = headR * 1.18;
    }

    // The veil: a translucent net hung from the hat front, counter-rotated so it hangs straight down.
    const veilLength = { short: headR * 2.6, long: headR * 5.6, full: headR * 9.2 }[a.veil];
    const net = paint(256, 512, (c) => {
      c.fillStyle = '#000000';
      c.fillRect(0, 0, 256, 512);
      c.fillStyle = a.veil === 'full' ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.4)';
      c.fillRect(0, 0, 256, 512);
      c.strokeStyle = 'rgba(255,255,255,0.95)';
      c.lineWidth = 1.5;
      for (let i = -512; i < 512; i += 9) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 512, 512); c.stroke(); c.beginPath(); c.moveTo(i + 512, 0); c.lineTo(i, 512); c.stroke(); }
      // Chenille dots and a scalloped lower edge.
      c.fillStyle = 'rgba(255,255,255,1)';
      for (let i = 0; i < 70; i++) { c.beginPath(); c.arc(random() * 256, random() * 480, 3, 0, 6.3); c.fill(); }
      c.globalCompositeOperation = 'destination-out';
      for (let x = 0; x <= 256; x += 32) { c.beginPath(); c.arc(x + 16, 512, 18, 0, 6.3); c.fill(); }
      c.fillRect(0, 500, 256, 12);
    });
    const veilMaterial = new THREE.MeshStandardMaterial({ color: '#2a2a30', alphaMap: net, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, roughness: 1 });
    // The pivot sits at the head's centre and turns back part of the head's tilt, so the net hangs
    // nearly straight; the mesh is then placed so its top front edge stays on the hat.
    const pivot = new THREE.Group();
    person.head.add(pivot);
    const arc: [number, number] = [-Math.PI * 0.44, Math.PI * 0.88];
    const bottomRadius = veilRadius * (a.veil === 'short' ? 1.02 : 0.9);
    const veil = new THREE.Mesh(new THREE.CylinderGeometry(veilRadius, bottomRadius, veilLength, 24, 1, true, ...arc), veilMaterial);
    veil.scale.z = 0.9;
    // An opaque ribbon along the hem gives the net an edge the eye can follow.
    const edge = new THREE.Mesh(new THREE.CylinderGeometry(bottomRadius * 1.005, bottomRadius * 1.005, 0.012, 24, 1, true, ...arc), new THREE.MeshStandardMaterial({ color: '#1a1a1e', roughness: 0.6, side: THREE.DoubleSide }));
    edge.position.y = -veilLength / 2 + 0.012;
    veil.add(edge);
    pivot.add(veil);
    const anchor = new THREE.Vector3(...veilAnchor);
    const xAxis = new THREE.Vector3(1, 0, 0);
    const hangStraight = (sway = 0) => {
      const tilt = joints.neck.rotation.x + joints.spine.rotation.x + joints.body.rotation.x;
      const phi = tilt * 0.65 + sway;
      pivot.rotation.x = -phi;
      const top = anchor.clone().applyAxisAngle(xAxis, phi);
      veil.position.set(top.x, top.y - veilLength / 2 + 0.005, top.z - veilRadius * 0.9);
    };
    hangStraight();

    // The handkerchief: a crumpled wad in the fist at the cheek, and a corner falling below the
    // jaw, white against the black dress where the eye finds it.
    const linen = new THREE.MeshStandardMaterial({ color: '#faf8f2', roughness: 0.95, side: THREE.DoubleSide });
    const wadGeometry = new THREE.IcosahedronGeometry(0.042, 1);
    const wp = wadGeometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < wp.count; i++) {
      const x = wp.getX(i), y = wp.getY(i), z = wp.getZ(i);
      const k = 0.8 + 0.4 * (0.5 + 0.5 * Math.sin(x * 211 + y * 157 + z * 113));
      wp.setXYZ(i, x * k, y * k * 0.8, z * k);
    }
    wadGeometry.computeVertexNormals();
    const wad = new THREE.Mesh(wadGeometry, linen);
    wad.position.set(0, -0.015, 0.03);
    wad.castShadow = true;
    person.hands.right.add(wad);
    const flapGeometry = new THREE.PlaneGeometry(0.19, 0.19, 5, 5);
    flapGeometry.rotateZ(Math.PI / 4);
    flapGeometry.translate(0, -0.125, 0);
    const fp = flapGeometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < fp.count; i++) fp.setZ(i, Math.sin(fp.getY(i) * 16) * 0.012 + fp.getX(i) * fp.getX(i) * 1.6);
    flapGeometry.computeVertexNormals();
    const flap = new THREE.Mesh(flapGeometry, linen);
    flap.position.set(0, -0.01, 0.045);
    flap.castShadow = true;
    person.hands.right.add(flap);
    // Hang the corner straight down in the world, turned a little toward the viewer, whatever the wrist does.
    person.root.updateMatrixWorld(true);
    const wrist = person.hands.right.getWorldQuaternion(new THREE.Quaternion()).invert();
    flap.quaternion.copy(wrist.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, -0.3 + random() * 0.3, 0.08))));

    // Sheer black stockings below a knee-length hem.
    const sheer = s.material(new THREE.Color(skinHex).lerp(new THREE.Color('#141416'), 0.6), { roughness: 0.45 });
    const parts = dressParts(person);
    parts.shin('left').material = sheer;
    parts.shin('right').material = sheer;

    // What the free hand holds.
    const left = person.hands.left;
    if (a.holding === 'lily') {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.5, 6), s.material('#4a6a3a', { roughness: 0.9 }));
      stem.position.set(0, 0.12, 0.02);
      stem.rotation.set(0.25, 0, 0.1);
      const flower = new THREE.Mesh(new THREE.LatheGeometry([[0.004, 0], [0.012, 0.03], [0.03, 0.08], [0.06, 0.12], [0.07, 0.13]].map(([x, y]) => new THREE.Vector2(x, y)), 12), new THREE.MeshStandardMaterial({ color: '#f6f3ec', roughness: 0.8, side: THREE.DoubleSide }));
      flower.position.set(-0.06, 0.34, 0.08);
      flower.rotation.set(-0.3, 0, 0.5);
      const stamen = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 5), s.material('#e2b43a', { roughness: 0.8 }));
      stamen.position.set(-0.08, 0.4, 0.1);
      stamen.rotation.set(-0.3, 0, 0.5);
      stem.castShadow = flower.castShadow = true;
      left.add(stem, flower, stamen);
    } else if (a.holding === 'rosary') {
      const beads: { at: [number, number, number]; size: number; color?: string }[] = [];
      for (let i = 0; i < 26; i++) {
        const t = i / 25;
        beads.push({ at: [Math.sin(t * Math.PI) * 0.03 - 0.01, -0.02 - t * 0.2, 0.02 + Math.sin(t * Math.PI * 2) * 0.01], size: 0.0055, color: i % 6 === 5 ? '#d9b23a' : '#1a1a2a' });
      }
      left.add(s.scatter(new THREE.SphereGeometry(1, 6, 5), s.material('#ffffff', { roughness: 0.3 }), beads));
      const cross = new THREE.Group();
      cross.position.set(-0.01, -0.25, 0.02);
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.04, 0.003), s.material('#d9b23a', { metalness: 0.8, roughness: 0.3 }));
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.006, 0.003), v.material);
      h.position.y = 0.008;
      cross.add(v, h);
      left.add(cross);
    } else if (a.holding === 'programme') {
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.15, 0.004), new THREE.MeshStandardMaterial({ map: paint(128, 176, (c) => { c.fillStyle = '#f1ece0'; c.fillRect(0, 0, 128, 176); c.fillStyle = '#2a2a30'; c.fillRect(14, 24, 100, 6); c.fillRect(30, 40, 68, 4); c.fillStyle = '#8a8a90'; for (let i = 0; i < 7; i++) c.fillRect(22, 70 + i * 12, 84 - random() * 30, 3); }), roughness: 0.9 }));
      card.position.set(0, -0.03, 0.035);
      card.rotation.set(-0.6, 0.2, 0.1);
      card.castShadow = true;
      left.add(card);
    } else if (a.holding === 'purse') {
      const purse = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.11, 0.04), s.material('#1a1a1e', { roughness: 0.4 }));
      purse.position.set(0, -0.06, 0.03);
      purse.rotation.set(-0.2, 0.1, 0.05);
      const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), s.material('#d9b23a', { metalness: 0.9, roughness: 0.25 }));
      clasp.position.set(0, -0.005, 0.055);
      purse.castShadow = true;
      left.add(purse, clasp);
    }

    // Shoulders shake now and then; the veil sways with the breath.
    const energy = mood.energy;
    const phase = random() * Math.PI * 2;
    const restSpine = joints.spine.rotation.x, restNeck = joints.neck.rotation.x;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        const sob = Math.pow(Math.max(0, Math.sin(time * mix(1.6, 3.4, energy) + phase)), 6);
        joints.spine.rotation.x = restSpine + sob * (folded ? 0.035 : 0.015) * (0.4 + energy);
        joints.neck.rotation.x = restNeck + sob * 0.03;
        hangStraight(Math.sin(time * 1.1 + phase) * 0.02 * (0.3 + energy));
      },
    });
  },
});
