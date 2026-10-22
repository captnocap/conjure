import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { RAD, anatomy, at, bentwoodChair, clothTable, glassGeometry, glassMaterial, heel, paint, pick, pickSkin, reachFoot, reachHand, rig, skirt, type P } from './milonga';

const FANS = {
  red: 'Red lacquer ribs and a red silk leaf with black lace edging.',
  black: 'Black lace, Spanish style.',
  ivory: 'Ivory paper painted with small flowers.',
  blue: 'Blue silk with a painted bird.',
  gold: 'Gold paper that catches the chandelier.',
} as const;
const FAN_COLOUR: Record<keyof typeof FANS, { leaf: string; edge: string; motif: string; ribs: string }> = {
  red: { leaf: '#b3202c', edge: '#141012', motif: '#f1d9a8', ribs: '#5a0f14' },
  black: { leaf: '#1c1a1e', edge: '#3a3438', motif: '#8a8088', ribs: '#141012' },
  ivory: { leaf: '#efe6d0', edge: '#c9a46a', motif: '#c8506a', ribs: '#d9c7a0' },
  blue: { leaf: '#2a4a7a', edge: '#c9b48a', motif: '#f1ece2', ribs: '#e3dccb' },
  gold: { leaf: '#c9a23a', edge: '#7a5a1a', motif: '#f6e7b0', ribs: '#5a3a1a' },
};
const DRESSES = {
  green: 'Bottle green, a little out of fashion.',
  red: 'Red, chosen to be seen.',
  navy: 'Navy with a white collar, demure.',
  black: 'Black, simple and elegant.',
  peach: 'Pale peach chiffon, hopeful.',
  mustard: 'Mustard yellow wool.',
} as const;
const DRESS_COLOUR: Record<keyof typeof DRESSES, string> = { green: '#1f5a3e', red: '#a81e2a', navy: '#1f2a4a', black: '#1c1b1f', peach: '#e9b49a', mustard: '#c9962a' };

export default defineThing({
  questions: {
    posture: choice('How is she sitting?', {
      hopeful: 'Forward on the edge of the chair, back straight, chin up, fan fluttering: ready to be asked.',
      watching: 'Upright and still, head turned to the floor, watching every couple.',
      resigned: 'Leaning back, shoulders down, the fan slow: she has stopped expecting a nod.',
    }),
    fan: choice('What is her fan like?', FANS),
    open: choice('How open is the fan?', {
      open: 'Spread wide, a full half-moon.',
      half: 'Half open at her chin, hiding a smile.',
      closed: 'Folded shut, tapping her chin.',
    }),
    dress: choice('What colour is her dress?', DRESSES),
    hair: choice('How is her hair?', {
      long: 'Long and loose down her back.',
      bun: 'Up in a bun with a flower.',
      short: 'Short and set in waves.',
    }),
    shawl: choice('What hangs on her chair back?', {
      none: 'Nothing.',
      fringed: 'A fringed embroidered shawl, red and gold.',
      lace: 'A black lace shawl.',
      wool: 'A cream wool wrap.',
    }),
    drink: choice('What is in her glass?', {
      soda: 'A tall soda with a straw, mostly ice now.',
      wine: 'A glass of white wine, barely touched.',
      lemonade: 'Lemonade with a slice on the rim.',
    }),
    second: noul('Is there an empty chair beside her?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.56, 1.72, random());
    const skin = pickSkin(random);
    const { limb, footL, headR } = anatomy(H, 'slight');
    const dress = DRESS_COLOUR[a.dress];
    const dressMat = s.material(dress, { roughness: a.dress === 'peach' ? 0.85 : 0.6, side: THREE.DoubleSide });
    const skinMat = s.material(skin, { roughness: 0.45 });
    const hairColour = pick(random, ['#1f1612', '#2a1e18', '#5a3a22', '#8a5a2a', '#3b2a22', '#b5b2ab']);

    // ---- seated, ankles crossed in front of her
    const person = figure(s, {
      height: H, build: 'slight', style: 'doll', skin, hair: a.hair === 'short' ? 'short' : a.hair, hairColor: hairColour,
      top: dress, bottom: dress, shoes: pick(random, ['#1a181c', '#7a1f2a', '#c9a23a', '#2a2326']), sleeves: 'short', pose: 'sitting', gaze: 'left',
    });
    s.root.add(person.root);
    const pose = rig(person);
    for (const side of ['left', 'right'] as const) for (const child of person.joints.knees[side].children) if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = skinMat;
    const hopeful = a.posture === 'hopeful', resigned = a.posture === 'resigned';
    person.settle();
    const hip = at(s, person.pelvis);
    const wood = s.material(pick(random, ['#4a3222', '#5a3a26', '#3a2a1e']), { roughness: 0.55 });
    const cane = s.material('#c9b47a', { roughness: 0.9 });
    const seatH = person.hipHeight - limb * 1.1 - 0.01;
    // Hopeful sits forward on the edge of the seat; resigned slides back against the hoop.
    const chairZ = hip.z - (hopeful ? 0.1 : resigned ? 0.01 : 0.05);
    const chair = bentwoodChair(s, hip.x, chairZ, 0, wood, seatH, cane);
    const sole = footL + limb * 0.95 + 0.03;
    const reach = resigned ? 0.52 : hopeful ? 0.34 : 0.42;
    reachFoot(s, person, 'right', new THREE.Vector3(hip.x + 0.035, sole, hip.z + reach), 'flat');
    reachFoot(s, person, 'left', new THREE.Vector3(hip.x - 0.03, sole + 0.05, hip.z + reach + 0.04), 'flat');
    for (const side of ['left', 'right'] as const) {
      person.joints.ankles[side].rotation.x += 14 * RAD;
      heel(person, side, H, s.material('#1a181c', { roughness: 0.35 }), 0.06);
    }

    // ---- turned toward the floor on her left
    pose.bow(hopeful ? 6 : resigned ? -10 : 0, resigned ? 3 : 0, hopeful ? 22 : 16);
    pose.lean(resigned ? -4 : 0, 0);
    if (hopeful) pose.look(-6, 36, -4);
    else if (resigned) pose.look(16, 26, 10);
    else pose.look(2, 44, 0);

    // ---- the table at her right hand, the forearm laid along its edge
    const tx = hip.x - 0.58, tz = hip.z + 0.14;
    const tableH = clothTable(s, tx, tz, { radius: 0.32, height: 0.74 });
    reachHand(s, person, 'right', new THREE.Vector3(tx + 0.12, tableH + 0.035, tz + 0.08), { outMin: 0, outMax: 70, forwardMax: 80 });

    // ---- the fan at her chin, in the left hand
    s.root.updateMatrixWorld(true);
    const chin = s.root.worldToLocal(person.head.localToWorld(new THREE.Vector3(headR * 0.25, -headR * 1.15, headR * 1.05)));
    reachHand(s, person, 'left', chin, { across: true, outMin: -10, outMax: 50 });
    const hand = at(s, person.hands.left);
    const colours = FAN_COLOUR[a.fan];
    const spread = { open: 160, half: 105, closed: 0 }[a.open] * RAD;
    const fan = new THREE.Group();
    fan.position.copy(hand);
    // Face it the way she faces, a little toward the room, and cant it so it sweeps across the lower face.
    const headYaw = person.joints.neck.rotation.y + person.joints.spine.rotation.y;
    fan.rotation.set(-0.15, headYaw * 0.6, a.open === 'closed' ? -0.5 : -0.35, 'YXZ');
    s.root.add(fan);
    const R = 0.23;
    if (spread > 0) {
      const leaf = paint(256, 256, (c) => {
        c.fillStyle = colours.leaf;
        c.fillRect(0, 0, 256, 256);
        c.strokeStyle = colours.ribs;
        c.globalAlpha = 0.5;
        c.lineWidth = 2;
        for (let i = 0; i <= 24; i++) {
          const angle = (i / 24) * Math.PI * 2;
          c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.cos(angle) * 128, 128 + Math.sin(angle) * 128); c.stroke();
        }
        c.globalAlpha = 1;
        c.fillStyle = colours.motif;
        for (let i = 0; i < 18; i++) {
          const angle = (i / 18) * Math.PI * 2, r = 80 + (i % 3) * 10;
          c.beginPath(); c.arc(128 + Math.cos(angle) * r, 128 + Math.sin(angle) * r, 5 + (i % 2) * 3, 0, Math.PI * 2); c.fill();
        }
        c.strokeStyle = colours.edge;
        c.lineWidth = 10;
        c.beginPath(); c.arc(128, 128, 122, 0, Math.PI * 2); c.stroke();
      });
      const blade = new THREE.Mesh(new THREE.RingGeometry(0.06, R, 28, 1, Math.PI / 2 - spread / 2, spread), new THREE.MeshStandardMaterial({ map: leaf, roughness: 0.7, side: THREE.DoubleSide }));
      blade.castShadow = true;
      fan.add(blade);
      const ribMat = s.material(colours.ribs, { roughness: 0.5 });
      for (const edge of [-1, 1]) {
        const angle = Math.PI / 2 + edge * spread / 2;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.012, R, 0.006), ribMat);
        guard.position.set(Math.cos(angle) * R / 2, Math.sin(angle) * R / 2, 0.004);
        guard.rotation.z = angle - Math.PI / 2;
        fan.add(guard);
      }
    } else {
      const folded = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.011, R, 6), s.material(colours.leaf, { roughness: 0.5 }));
      folded.position.y = R / 2;
      folded.scale.z = 0.6;
      folded.castShadow = true;
      fan.add(folded);
      const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 8), s.material(colours.edge, { roughness: 0.9 }));
      tassel.position.y = -0.04;
      tassel.rotation.x = Math.PI;
      fan.add(tassel);
    }
    fan.add(new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), s.material('#c9a44a', { metalness: 0.8, roughness: 0.3 })));

    // ---- dress, hair, the shawl on the chair back
    skirt(person, H, 'slight', dressMat, { length: H * 0.07, flare: 1.1 });
    if (a.hair === 'bun') {
      const flower = s.mesh(new THREE.SphereGeometry(0.026, 10, 8), s.material(a.dress === 'red' ? '#f1ece2' : '#c8202c', { roughness: 0.8 }));
      flower.position.set(-0.04, 0.06, -0.04);
      flower.scale.set(1, 0.8, 1);
      person.head.add(flower);
    }
    if (a.shawl !== 'none') {
      const shawlColour = { fringed: '#a81e2a', lace: '#1a1618', wool: '#e9e0cc' }[a.shawl];
      let shawlMat: THREE.Material;
      if (a.shawl === 'fringed') {
        const embroidery = paint(128, 128, (c) => {
          c.fillStyle = shawlColour;
          c.fillRect(0, 0, 128, 128);
          for (let i = 0; i < 9; i++) {
            c.fillStyle = i % 2 ? '#d9b04a' : '#f1d9a8';
            c.beginPath(); c.arc(14 + (i % 3) * 50, 18 + Math.floor(i / 3) * 44, 9, 0, Math.PI * 2); c.fill();
          }
        });
        shawlMat = new THREE.MeshStandardMaterial({ map: embroidery, roughness: 0.9, side: THREE.DoubleSide });
      } else shawlMat = s.material(shawlColour, { roughness: 0.95, side: THREE.DoubleSide, transparent: a.shawl === 'lace', opacity: a.shawl === 'lace' ? 0.85 : 1 });
      const backY = seatH + 0.42;
      const drape = new THREE.Group();
      drape.position.set(0, backY, -0.18);
      chair.add(drape);
      const over = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.44, 12, 1, true, 0, Math.PI), shawlMat);
      over.rotation.z = Math.PI / 2;
      drape.add(over);
      for (const [z, length, tiltX] of [[-0.03, 0.34, -0.12], [0.03, 0.22, 0.08]] as const) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.44, length, 0.008), shawlMat);
        panel.position.set(0, -length / 2, z);
        panel.rotation.x = tiltX;
        panel.castShadow = true;
        drape.add(panel);
      }
      if (a.shawl === 'fringed') {
        const tassels = new THREE.InstancedMesh(new THREE.BoxGeometry(0.006, 0.06, 0.004), s.material('#d9b04a', { roughness: 0.9 }), 18);
        const m = new THREE.Matrix4();
        for (let i = 0; i < 18; i++) { m.makeTranslation(-0.21 + i * (0.42 / 17), -0.34 - 0.03 + 0.04, -0.07); tassels.setMatrixAt(i, m); }
        tassels.instanceMatrix.needsUpdate = true;
        drape.add(tassels);
      }
    }

    // ---- what is on the table by her elbow: handbag and glass
    const glass = glassMaterial('#eef3f0', 0.3);
    const gx = tx + 0.03, gz = tz - 0.1;
    if (a.drink === 'wine') {
      s.mesh(glassGeometry('wine'), glass, [gx, tableH, gz]).castShadow = false;
      s.lathe([[0, 0.078], [0.026, 0.08], [0.03, 0.095], [0, 0.098]], s.material('#e3d48a', { roughness: 0.3 }), [gx, tableH, gz]);
    } else {
      s.mesh(glassGeometry('tall'), glass, [gx, tableH, gz]).castShadow = false;
      const fill = a.drink === 'soda' ? '#7a2a1a' : '#efe08a';
      s.lathe([[0, 0.006], [0.027, 0.006], [0.03, a.drink === 'soda' ? 0.06 : 0.12], [0, a.drink === 'soda' ? 0.06 : 0.12]], s.material(fill, { roughness: 0.25, transparent: true, opacity: 0.85 }), [gx, tableH, gz]);
      if (a.drink === 'soda') s.scatter(new THREE.BoxGeometry(1, 1, 1), s.material('#e9f1f2', { roughness: 0.1 }), [0, 1, 2].map((i) => ({ at: [gx + (i - 1) * 0.012, tableH + 0.07 + i * 0.012, gz] as P, size: 0.016 })));
      const straw = s.rod([gx + 0.008, tableH + 0.02, gz], [gx + 0.03, tableH + 0.23, gz + 0.02], 0.0035, s.material(pick(random, ['#e94a4a', '#f1ece2', '#4a9ae9']), { roughness: 0.5 }));
      straw.castShadow = false;
      if (a.drink === 'lemonade') s.cylinder(0.022, 0.022, 0.004, [gx + 0.03, tableH + 0.165, gz], s.material('#f2d23a', { roughness: 0.6 }), 12).rotation.z = Math.PI / 2;
    }
    const bagMat = s.material(pick(random, ['#1c1b1f', '#7a1f2a', '#5a3a22', '#c9a23a']), { roughness: 0.45, metalness: 0.1 });
    const bx = tx - 0.12, bz = tz + 0.02;
    const bag = s.mesh(new THREE.BoxGeometry(0.17, 0.11, 0.05), bagMat, [bx, tableH + 0.055, bz]);
    bag.rotation.y = 0.4;
    const clasp = s.ring(0.03, 0.005, [bx, tableH + 0.112, bz], s.material('#c9a44a', { metalness: 0.8, roughness: 0.3 }), Math.PI);
    clasp.rotation.y = 0.4;

    // ---- an empty chair at her left, between her and the floor
    if (a.second) bentwoodChair(s, hip.x + 0.6, hip.z - 0.02, -0.25, wood, 0.45, cane);

    // Her body angled away toward the table, her head turned back across it to the room: the fan meets the viewer face-on.
    s.root.rotation.y = -30 * RAD;

    // ---- the fan flutters with the evening; hopeful flutters fastest
    const energy = mood.energy;
    const rest = fan.rotation.z;
    const speed = (hopeful ? 9 : resigned ? 2 : 4) * (0.5 + energy);
    const swing = a.open === 'closed' ? 0.04 : hopeful ? 0.14 : 0.08;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        fan.rotation.z = rest + Math.sin(time * speed) * swing;
      },
    });
  },
});
