import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, score } from '@conjure/kit';
import { cloth, dressParts, paint, pick, pickSkin, rig } from './rig';

const BRIGHTS = ['#e8c62a', '#e85a2a', '#2a8ad8', '#d8309a', '#3ab85a', '#f0a030', '#8a3ad8'];

export default defineThing({
  questions: {
    shirt: choice('What is the shirt?', {
      floral: 'A loud floral print, hibiscus on blue or red.',
      dots: 'Polka dots, white on a bright colour.',
      stripes: 'Bold vertical stripes.',
      club: 'A club T-shirt with the club name across the chest.',
      plain: 'A plain bright tee: yellow, pink, orange or lime.',
      white: 'A plain white tee.',
    }),
    bottom: choice('What below the shirt?', {
      shorts: 'Khaki or denim shorts and sneakers.',
      skirt: 'A short flared skirt.',
      jeans: 'Blue jeans and sneakers.',
      slacks: 'Pressed slacks and dress shoes, dancing in Sunday clothes.',
    }),
    knee: score('How high is the lifted knee?', ['A small hop, foot just off the ground', 'Knee at hip height', 'Knee nearly at the chest, foot tucked under']),
    raised: choice('What is waved overhead?', {
      handkerchief: 'A white handkerchief.',
      parasol: 'A small decorated parasol, twirled.',
      towel: 'A long club towel, lettered, swung in circles.',
      fan: 'A folding fan flicked open.',
    }),
    other: choice('What is in the other hand?', {
      nothing: 'Nothing: the arm is out straight for balance.',
      gocup: 'A plastic go-cup, drink sloshing.',
      phone: 'A phone held up, filming the band.',
      beads: 'A fistful of beads swinging.',
    }),
    head: choice('What is on the head and face?', {
      shades: 'Sunglasses, hair cropped.',
      cap: 'A baseball cap turned backwards.',
      braids: 'Long braids flying out with the turn.',
      bare: 'Nothing, short hair.',
      straw: 'A straw hat with a ribbon.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.58, 1.84, random());
    const build = pick(random, ['slight', 'average', 'average', 'heavy'] as const);
    const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const torsoL = H * 0.28, headR = H * 0.064, hipW = H * 0.075 * wide;
    const base = a.shirt === 'white' ? '#f3efe6' : pick(random, BRIGHTS);
    const bottomHex = { shorts: pick(random, ['#c9b07a', '#4a5a8a']), skirt: pick(random, BRIGHTS.filter((c) => c !== base)), jeans: '#3a5a8a', slacks: pick(random, ['#1d1c22', '#5a4a3a', '#f1ede4']) }[a.bottom];
    const shoesHex = a.bottom === 'slacks' ? '#141416' : pick(random, ['#f3efe6', '#f3efe6', '#e8c62a', '#d8309a']);
    const person = figure(s, {
      height: H, build, style: 'doll', skin: pickSkin(random), hair: a.head === 'bare' ? 'short' : a.head === 'braids' ? 'long' : 'none', hairColor: '#1a1512',
      top: base, bottom: bottomHex, shoes: shoesHex, sleeves: 'short', pose: 'standing', gaze: 'left',
    });
    s.root.add(person.root);
    const r = rig(person);
    const { joints } = person;

    // The shirt print on the torso and upper arms.
    if (a.shirt === 'floral' || a.shirt === 'dots' || a.shirt === 'stripes') {
      const ink = pick(random, ['#f6f2ea', '#e8c62a', '#1d1c22', '#e85a2a'].filter((c) => c !== base));
      const map = paint(256, 256, (c) => {
        c.fillStyle = base;
        c.fillRect(0, 0, 256, 256);
        c.fillStyle = ink;
        if (a.shirt === 'floral') for (let i = 0; i < 26; i++) {
          const x = random() * 256, y = random() * 256, rad = 10 + random() * 12;
          for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.257) * rad * 0.7, y + Math.sin(p * 1.257) * rad * 0.7, rad * 0.5, 0, 6.3); c.fill(); }
          c.fillStyle = '#f6f2ea'; c.beginPath(); c.arc(x, y, rad * 0.25, 0, 6.3); c.fill(); c.fillStyle = ink;
        } else if (a.shirt === 'dots') { for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) { c.beginPath(); c.arc(x + 16 + ((y / 32) % 2) * 8, y + 16, 7, 0, 6.3); c.fill(); } }
        else for (let x = 0; x < 256; x += 40) c.fillRect(x, 0, 18, 256);
      });
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(a.shirt === 'stripes' ? 2 : 1.5, 1);
      const printed = new THREE.MeshStandardMaterial({ map, roughness: 0.85 });
      const parts = dressParts(person);
      parts.torso.material = printed;
      parts.upper('left').material = printed;
      parts.upper('right').material = printed;
    }
    if (a.shirt === 'club') {
      // The club name wraps round the chest on a band that rides the torso's own scale and breath.
      const name = pick(random, ['SIDEWALK STEPPERS', 'MONEY WASTERS', 'LADY BUCKJUMPERS', 'BIG NINE', 'PIGEON TOWN', 'SUDAN STEPPERS', 'OLD SCHOOL']);
      const ink = base === '#f3efe6' || base === '#e8c62a' || base === '#f0a030' ? '#1d1c22' : '#f6f2ea';
      const torso = dressParts(person).torso;
      const capsule = (torso.geometry as THREE.CapsuleGeometry).parameters.radius;
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(capsule * 1.04, capsule * 1.04, torsoL * 0.42, 24, 1, true, -1.05, 2.1),
        new THREE.MeshStandardMaterial({ roughness: 0.85, alphaTest: 0.5, map: paint(512, 256, (c) => {
          c.clearRect(0, 0, 512, 256);
          c.fillStyle = ink;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          const words = name.split(' ');
          const size = Math.min(104, 3000 / Math.max(...words.map((w) => w.length)) / 3.2);
          c.font = `900 ${size}px sans-serif`;
          words.forEach((word, i) => c.fillText(word, 256, 128 + (i - (words.length - 1) / 2) * size * 1.05, 470));
        }) }),
      );
      band.position.y = torsoL * 0.08;
      torso.add(band);
    }

    // The pose: right knee up, planted left foot, torso twisted toward the band, right hand straight up.
    const lift = a.knee;
    r.leg('right', { forward: mix(40, 112, lift), out: 10, knee: mix(55, 125, lift), foot: -25 });
    r.leg('left', { forward: 2, out: 7, knee: 5, foot: 'flat' });
    r.lean(-4, 6);
    r.bow(-6, 5, 26);
    r.look(-8, 34, -4);
    r.arm('right', { forward: 172, out: 10, bend: 12, across: 0 });
    if (a.other === 'nothing') r.arm('left', { forward: 22, out: 82, bend: 22, across: 0 });
    else if (a.other === 'phone') r.arm('left', { forward: 95, out: 30, bend: 70, across: 20 });
    else r.arm('left', { forward: 48, out: 46, bend: 70, across: 5 });
    person.settle();

    // A skirt flares from the hips over the shorts-coloured legs.
    if (a.bottom === 'skirt') {
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(hipW * 1.15, hipW * 2.1, H * 0.2, 22, 1, true), new THREE.MeshStandardMaterial({ color: bottomHex, roughness: 0.85, side: THREE.DoubleSide }));
      skirt.position.y = -H * 0.1 + 0.02;
      skirt.rotation.z = 0.12;
      skirt.castShadow = true;
      person.pelvis.add(skirt);
    }
    if (a.bottom === 'shorts') {
      // Bare shins below the shorts.
      const parts = dressParts(person);
      const skin = (joints.elbows.left.children[1] as THREE.Object3D).children[0] as THREE.Mesh;
      parts.shin('left').material = skin.material;
      parts.shin('right').material = skin.material;
    }

    // Head: shades, a backwards cap, braids or a straw hat.
    if (a.head === 'shades') {
      const dark = s.material('#111114', { roughness: 0.2 });
      for (const side of [-1, 1]) {
        const lens = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, headR * 0.3, headR * 0.1), dark);
        lens.position.set(side * headR * 0.36, headR * 0.14, headR * 0.96);
        person.head.add(lens);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.1, headR * 0.05, headR * 0.05), dark);
      bridge.position.set(0, headR * 0.2, headR * 0.98);
      person.head.add(bridge);
    } else if (a.head === 'cap') {
      const capHex = pick(random, ['#1d1c22', '#c42a2a', '#2a6ad8', '#e8c62a']);
      const capMat = s.material(capHex, { roughness: 0.9 });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.08, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), capMat);
      dome.position.y = headR * 0.15;
      const peak = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.2, headR * 0.1, headR * 0.9), capMat);
      peak.position.set(0, headR * 0.3, -headR * 1.15);
      peak.rotation.x = -0.3;
      dome.castShadow = peak.castShadow = true;
      person.head.add(dome, peak);
    } else if (a.head === 'braids') {
      const braidMat = s.material('#1a1512', { roughness: 1 });
      const braids = new THREE.InstancedMesh(new THREE.CapsuleGeometry(headR * 0.11, headR * 2.6, 3, 6), braidMat, 10);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 10; i++) {
        const angle = Math.PI * 0.6 + (i / 9) * Math.PI * 0.8;
        e.set(0.45 + random() * 0.3, 0, -Math.sin(angle) * 0.55);
        q.setFromEuler(e);
        m.compose(new THREE.Vector3(Math.sin(angle) * headR * 0.85, -headR * 0.5, Math.cos(angle) * headR * 0.85), q, new THREE.Vector3(1, 1, 1));
        braids.setMatrixAt(i, m);
      }
      braids.instanceMatrix.needsUpdate = true;
      braids.castShadow = true;
      person.head.add(braids);
    } else if (a.head === 'straw') {
      const straw = s.material('#d8c27a', { roughness: 1 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.8, headR * 1.8, headR * 0.08, 24), straw);
      brim.position.y = headR * 0.75;
      brim.rotation.x = -0.12;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.95, headR * 1.05, headR * 0.9, 20), straw);
      crown.position.y = headR * 1.2;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.07, headR * 1.07, headR * 0.22, 20, 1, true), new THREE.MeshStandardMaterial({ color: pick(random, ['#c42a2a', '#1d1c22', '#2a6ad8']), side: THREE.DoubleSide, roughness: 0.8 }));
      band.position.y = headR * 0.9;
      brim.castShadow = crown.castShadow = true;
      person.head.add(brim, crown, band);
    }

    // What is overhead: in hand space -y runs on past the fingers.
    const right = person.hands.right;
    const white = new THREE.MeshStandardMaterial({ color: '#f6f3ec', roughness: 0.95, side: THREE.DoubleSide });
    const flutter: THREE.Object3D[] = [];
    if (a.raised === 'handkerchief') {
      const hanky = new THREE.Mesh(cloth(0.32, 0.12, random), white);
      hanky.position.set(0.06, -0.1, 0.02);
      hanky.rotation.set(0.3, 0.5, 0.9);
      hanky.castShadow = true;
      right.add(hanky);
      flutter.push(hanky);
    } else if (a.raised === 'towel') {
      const name = pick(random, ['TREME', 'ZULU', 'WHO DAT', 'BIG NINE', 'SECOND LINE']);
      const towel = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.55, 2, 8), new THREE.MeshStandardMaterial({ map: paint(128, 320, (c) => { c.fillStyle = '#f6f3ec'; c.fillRect(0, 0, 128, 320); c.fillStyle = pick(random, ['#1d1c22', '#c42a2a', '#2a6ad8']); c.save(); c.translate(64, 160); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 48px sans-serif'; c.fillText(name, 0, 0, 300); c.restore(); }), roughness: 0.95, side: THREE.DoubleSide }));
      // The towel shows its back to the street in this hold, so the lettering is flipped to read true.
      const towelMap = (towel.material as THREE.MeshStandardMaterial).map!;
      towelMap.repeat.y = -1;
      towelMap.offset.y = 1;
      const pos = towel.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getY(i) * 9) * 0.03);
      towel.geometry.computeVertexNormals();
      towel.position.set(0.12, -0.18, 0.02);
      towel.rotation.set(0.2, 0.3, 1.2);
      towel.castShadow = true;
      right.add(towel);
      flutter.push(towel);
    } else if (a.raised === 'parasol') {
      const panels = pick(random, [['#5a2a8a', '#e2b43a'], ['#c42a2a', '#f3efe6'], ['#2a6ad8', '#f3efe6', '#e8c62a'], ['#1a1a1e', '#f3efe6']]);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.5, 8), s.material('#2a2320', { roughness: 0.5 }));
      shaft.position.y = -0.14;
      const canopy = new THREE.Group();
      canopy.position.y = -0.4;
      const map = paint(512, 64, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = panels[i % panels.length]; c.fillRect(i * 64, 0, 66, 64); } });
      const R = 0.3;
      const dome = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.16], [R * 0.4, 0.13], [R * 0.75, 0.06], [R, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 24), new THREE.MeshStandardMaterial({ map, roughness: 0.6, side: THREE.DoubleSide }));
      dome.rotation.x = Math.PI;
      const fringe = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.97, 0.05, 24, 1, true), new THREE.MeshStandardMaterial({ color: panels[1], roughness: 0.8, side: THREE.DoubleSide }));
      fringe.position.y = 0.02;
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), s.material('#d9b23a', { metalness: 0.8, roughness: 0.3 }));
      finial.position.y = -0.18;
      dome.castShadow = shaft.castShadow = true;
      canopy.add(dome, fringe, finial);
      right.add(shaft, canopy);
      flutter.push(canopy);
    } else {
      const fan = new THREE.Mesh(new THREE.CircleGeometry(0.19, 20, Math.PI * 0.15, Math.PI * 0.7), new THREE.MeshStandardMaterial({ map: paint(256, 256, (c) => { const hue = pick(random, ['#c42a2a', '#e2b43a', '#2a6ad8', '#f0a0c0']); c.fillStyle = hue; c.fillRect(0, 0, 256, 256); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2; for (let i = 0; i < 14; i++) { c.beginPath(); c.moveTo(128, 256); c.lineTo(i * 20, 0); c.stroke(); } }), roughness: 0.8, side: THREE.DoubleSide }));
      fan.position.set(0, -0.05, 0.01);
      fan.rotation.set(0, 0, 0.4);
      fan.castShadow = true;
      right.add(fan);
      flutter.push(fan);
    }
    // The other hand.
    const left = person.hands.left;
    if (a.other === 'gocup') {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.15, 14, 1, true), new THREE.MeshStandardMaterial({ color: pick(random, ['#f3efe6', '#c42a2a', '#2a6ad8']), roughness: 0.6, side: THREE.DoubleSide }));
      cup.position.set(0, -0.01, 0.045);
      const drink = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 14), new THREE.MeshStandardMaterial({ color: pick(random, ['#d8302a', '#5aa0e8', '#e8a030']), roughness: 0.3 }));
      drink.position.set(0, 0.04, 0.045);
      cup.castShadow = true;
      left.add(cup, drink);
    } else if (a.other === 'phone') {
      const phone = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.01), s.material('#1a1a1e', { roughness: 0.3 }));
      phone.position.set(0, 0.0, 0.03);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.135), new THREE.MeshStandardMaterial({ color: '#8ac8ff', emissive: '#4a90e0', emissiveIntensity: 0.8 }));
      screen.position.set(0, 0, 0.036);
      left.add(phone, screen);
    } else if (a.other === 'beads') {
      const points: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let strand = 0; strand < 3; strand++) {
        const hue = pick(random, ['#5a2a8a', '#e2b43a', '#2a9a4a', '#f3efe6', '#d8309a']);
        for (let i = 0; i < 14; i++) points.push({ at: [(strand - 1) * 0.02 + Math.sin(i * 0.9) * 0.012, -0.02 - i * 0.018, 0.03 + Math.cos(i * 0.9 + strand) * 0.012], size: 0.008, color: hue });
      }
      left.add(s.scatter(new THREE.SphereGeometry(1, 6, 5), s.material('#ffffff', { roughness: 0.3, metalness: 0.3 }), points));
    }

    // The wave: the raised arm sweeps, the lifted knee bobs, the cloth flicks.
    const energy = mood.energy;
    const phase = random() * Math.PI * 2;
    const restShoulder = joints.shoulders.right.rotation.z, restHip = joints.hips.right.rotation.x, restBody = joints.body.rotation.y;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        const beat = time * mix(1.2, 4.2, energy) + phase;
        joints.shoulders.right.rotation.z = restShoulder + Math.sin(beat) * mix(0.04, 0.3, energy);
        joints.hips.right.rotation.x = restHip + Math.sin(beat * 0.5) * 0.05 * energy;
        joints.body.rotation.y = restBody + Math.sin(beat * 0.5 + 1) * 0.06 * energy;
        for (const item of flutter) item.rotation.y += dt * mix(0.5, 5, energy) * (a.raised === 'parasol' ? 1 : 0.15);
      },
    });
  },
});
