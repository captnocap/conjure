import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { cloth, dollHead } from './doll';

export default defineThing({
  questions: {
    patient: choice('Who is the patient?', {
      porcelain: 'A porcelain doll with glass eyes and a painted mouth.',
      teddy: 'A worn brown teddy bear with a stitched nose and bead eyes.',
      rag: 'A rag doll with yarn hair, button eyes and a stitched smile.',
      soldier: 'A tin soldier in a red coat and tall black hat, lying to attention.',
    }),
    injury: choice('What is wrong with it?', {
      head: 'A bandaged head, white gauze wound round the brow.',
      sling: 'An arm in a white sling across its chest.',
      patch: 'A black patch over one eye.',
      stuffing: 'A burst seam: tufts of white stuffing coming out over the blanket.',
      traction: 'A splinted leg raised in traction on a string and weight.',
    }),
    tag: choice('What does the admission tag say?', {
      name: 'A child\'s name in careful capitals: FOR ANNA.',
      friday: 'COLLECT FRIDAY',
      unclaimed: 'UNCLAIMED 1962',
      wake: 'DO NOT WAKE',
      urgent: 'URGENT - BIRTHDAY',
      paid: 'PAID IN FULL',
    }),
    blanket: choice('What is it tucked under?', {
      wool: 'Grey hospital wool with a single red stripe.',
      patchwork: 'A bright checked patchwork blanket.',
      quilt: 'A pink spotted satin quilt.',
      hanky: 'A clean white handkerchief with a blue border.',
    }),
    bedside: choice('What is on the bedside?', {
      none: 'Nothing; the cot stands alone.',
      medicine: 'A cotton-reel table with a brown medicine bottle and spoon.',
      flowers: 'A cotton-reel table with a thimble of tiny flowers.',
      card: 'A cotton-reel table with a folded get-well card.',
      lamp: 'A cotton-reel table with a small glowing night lamp.',
    }),
    visitor: noul('Is a visitor toy sitting beside the cot?'),
    eyes: choice('Is the patient awake?', {
      awake: 'Wide awake, staring at the ceiling.',
      drowsy: 'Drowsy, eyes half shut.',
      asleep: 'Fast asleep, eyes closed.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const ball = (parent: THREE.Object3D, material: THREE.Material, size: [number, number, number], at: [number, number, number], segments = 14) => {
      const mesh = put(parent, new THREE.SphereGeometry(1, segments, Math.max(8, segments / 2)), material, ...at);
      mesh.scale.set(...size);
      return mesh;
    };
    const limb = (parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, r0: number, r1: number, material: THREE.Material) => {
      const d = to.clone().sub(from);
      const mesh = put(parent, new THREE.CylinderGeometry(r1, r0, d.length(), 12), material);
      mesh.position.copy(from).addScaledVector(d, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return mesh;
    };
    const flat = (hex: string, rough = 0.85) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color('#8f8676'), wear * 0.3), roughness: rough });

    // ---- Cot ----
    const L = 0.48, Wd = 0.25, bedY = 0.15;
    const enamel = new THREE.Color(mood.cheer > 0.6 ? '#f2efe6' : '#dfe4e0').lerp(new THREE.Color('#8a4a26'), wear * 0.55);
    const iron = new THREE.MeshStandardMaterial({ color: enamel, roughness: 0.35 + wear * 0.5, metalness: 0.3 });
    const brass = new THREE.MeshStandardMaterial({ color: '#c9a23a', metalness: 0.85, roughness: 0.3 });
    const tube = 0.0065;
    for (const [end, top] of [[-1, 0.33], [1, 0.25]] as const) {
      const x = end * L / 2;
      for (const side of [-1, 1]) {
        s.rod([x, 0.012, side * Wd / 2], [x, top - 0.03, side * Wd / 2], tube, iron);
        s.ball([0.011, 0.011, 0.011], [x, 0.011, side * Wd / 2], flat('#2a2a2c', 0.5), 10);
        s.ball([0.011, 0.011, 0.011], [x, top - 0.025, side * Wd / 2], brass, 10);
      }
      s.tube([[x, top - 0.035, -Wd / 2], [x, top + 0.012, -Wd / 4], [x, top + 0.022, 0], [x, top + 0.012, Wd / 4], [x, top - 0.035, Wd / 2]], tube * 0.9, iron);
      s.rod([x, bedY + 0.02, -Wd / 2], [x, bedY + 0.02, Wd / 2], tube * 0.8, iron);
      for (let i = 1; i <= 4; i++) {
        const z = -Wd / 2 + (i / 5) * Wd;
        s.rod([x, bedY + 0.02, z], [x, top + 0.02 - Math.abs(i - 2.5) * 0.012, z], tube * 0.55, iron);
      }
    }
    for (const side of [-1, 1]) s.rod([-L / 2, bedY - 0.025, side * Wd / 2], [L / 2, bedY - 0.025, side * Wd / 2], tube * 0.9, iron);
    const ticking = cloth('#e9e2d0', 'stripe', '#5a7aa8', wear, random);
    ticking.repeat.set(1, 3);
    s.box([L - 0.014, 0.036, Wd - 0.014], [0, bedY, 0], new THREE.MeshStandardMaterial({ map: ticking, roughness: 0.95 }));
    const linen = flat('#f4f1e8', 0.9);
    const pillow = s.ball([0.062, 0.022, 0.095], [-L / 2 + 0.078, bedY + 0.034, 0], linen, 16);
    pillow.rotation.z = -0.08;

    // Blanket over a body-shaped rise.
    const blankets = {
      wool: cloth('#8f9498', 'plain', '#8f9498', wear, random),
      patchwork: cloth('#e2b23a', 'gingham', '#c0392b', wear, random),
      quilt: cloth('#e8a8b8', 'dots', '#f6e4ea', wear, random),
      hanky: cloth('#f6f4ee', 'plain', '#f6f4ee', wear * 0.5, random),
    };
    const blanketTexture = blankets[a.blanket];
    blanketTexture.repeat.set(2, 2);
    const blanket = new THREE.MeshStandardMaterial({ map: blanketTexture, roughness: 0.95 });
    const bx = 0.055, bl = 0.31;
    s.box([bl, 0.012, Wd + 0.012], [bx, bedY + 0.024, 0], blanket);
    for (const side of [-1, 1]) {
      const flap = s.box([bl, 0.06 + random() * 0.015, 0.006], [bx, bedY - 0.006, side * (Wd / 2 + 0.006)], blanket);
      flap.rotation.x = side * -0.08;
    }
    const rise = s.ball([0.15, 0.04, 0.075], [bx - 0.015, bedY + 0.028, 0], blanket, 20);
    rise.scale.y = a.patient === 'teddy' ? 0.052 : 0.04;
    s.ball([0.03, 0.036, 0.05], [bx + 0.115, bedY + 0.03, 0], blanket, 12);
    s.box([0.042, 0.016, Wd + 0.016], [bx - bl / 2 + 0.012, bedY + 0.027, 0], linen);
    if (a.blanket === 'wool') s.box([0.022, 0.0135, Wd + 0.014], [bx + 0.06, bedY + 0.0245, 0], flat('#b8242c'));
    if (a.blanket === 'hanky') for (const dx of [-0.11, bl / 2 - 0.006]) s.box([0.006, 0.0135, Wd + 0.014], [bx + dx, bedY + 0.0245, 0], flat('#4a6ab8'));

    // ---- Patient ----
    const bodyColours = { porcelain: '#f3dccd', teddy: '#a8743a', rag: '#f0d2b4', soldier: '#f0c0a0' };
    const skinColour = new THREE.Color(bodyColours[a.patient]).lerp(new THREE.Color('#6a5a48'), wear * 0.25);
    const skin = new THREE.MeshStandardMaterial({ color: skinColour, roughness: a.patient === 'soldier' ? 0.25 : a.patient === 'porcelain' ? 0.4 : 0.95, metalness: a.patient === 'soldier' ? 0.4 : 0 });
    const sleeve = a.patient === 'soldier' ? new THREE.MeshStandardMaterial({ color: '#c0262c', roughness: 0.3, metalness: 0.4 }) : a.patient === 'porcelain' ? flat('#f1ece0') : skin;
    const black = new THREE.MeshStandardMaterial({ color: '#121113', roughness: 0.3 });
    const white = flat('#f6f4ee', 0.9);
    const lid = { awake: 0, drowsy: 0.5, asleep: 1 }[a.eyes];
    const head = new THREE.Group();
    let headRadius = 0.04, headCentre = 0.05, eyeY = 0.055, eyeX = 0.017;
    if (a.patient === 'porcelain') {
      const made = dollHead({
        h: 0.085, skin: skinColour.getStyle(), roughness: 0.4, expression: a.eyes === 'awake' ? 'startled' : 'sweet',
        leftEye: true, rightEye: true, iris: '#2f6fd0', lid, crown: 'closed', paint: 1,
        damage: a.injury === 'head' || wear > 0.5 ? ['forehead'] : a.injury === 'patch' ? ['cheek'] : [], wear: wear * 0.8, random,
      });
      head.add(made.group);
      headRadius = 0.0365; headCentre = made.centre; eyeY = 0.63 * 0.085; eyeX = 0.015;
      const hair = flat(['#e3c779', '#96421f', '#4d2f1c'][Math.floor(random() * 3)], 0.95);
      const curls: { at: [number, number, number]; size: number }[] = [];
      for (let k = 0; k < 110; k++) {
        const angle = random() * Math.PI * 2, elevation = mix(-0.4, 1.5, random());
        const face = Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)));
        if (face < 1 && elevation < 0.75) continue;
        const rr = 0.038 * Math.cos(Math.min(elevation, 1.5));
        curls.push({ at: [Math.sin(angle) * rr, headCentre + Math.sin(elevation) * 0.047, Math.cos(angle) * rr], size: 0.008 + random() * 0.004 });
      }
      head.add(s.scatter(new THREE.SphereGeometry(1, 8, 6), hair, curls));
    } else if (a.patient === 'teddy') {
      headRadius = 0.047; headCentre = 0.05; eyeY = 0.062; eyeX = 0.019;
      ball(head, skin, [0.047, 0.044, 0.044], [0, 0.05, 0], 20);
      ball(head, flat('#d8b888', 0.95), [0.022, 0.018, 0.02], [0, 0.04, 0.038], 14);
      ball(head, black, [0.008, 0.006, 0.005], [0, 0.046, 0.057], 8);
      for (const side of [-1, 1]) {
        ball(head, skin, [0.019, 0.019, 0.01], [side * 0.036, 0.088, 0], 12);
        ball(head, flat('#d8b888', 0.95), [0.011, 0.011, 0.005], [side * 0.036, 0.088, 0.007], 10);
      }
    } else if (a.patient === 'rag') {
      headRadius = 0.045; headCentre = 0.05; eyeY = 0.058; eyeX = 0.018;
      ball(head, skin, [0.045, 0.046, 0.032], [0, 0.05, 0], 20);
      const yarn = flat(['#c8421c', '#e0a82a', '#5a3a1c'][Math.floor(random() * 3)], 1);
      for (let k = 0; k < 22; k++) {
        const angle = (k / 21 - 0.5) * 4.2;
        limb(head, new THREE.Vector3(Math.sin(angle) * 0.03, 0.05 + Math.cos(angle) * 0.036, 0.008), new THREE.Vector3(Math.sin(angle) * (0.06 + random() * 0.02), 0.05 + Math.cos(angle) * 0.06 - Math.abs(Math.sin(angle)) * 0.03, -0.006 + random() * 0.012), 0.005, 0.004, yarn);
      }
      for (const side of [-1, 1]) ball(head, flat('#e87a8a', 0.9), [0.009, 0.009, 0.003], [side * 0.026, 0.04, 0.026], 10);
      const smile = put(head, new THREE.TorusGeometry(0.014, 0.0018, 5, 14, Math.PI * 0.8), flat('#a8242c'), 0, 0.042, 0.03);
      smile.rotation.z = Math.PI + Math.PI * 0.1;
    } else {
      headRadius = 0.03; headCentre = 0.04; eyeY = 0.044; eyeX = 0.012;
      put(head, new THREE.CylinderGeometry(0.03, 0.03, 0.055, 18), skin, 0, 0.038, 0);
      put(head, new THREE.CylinderGeometry(0.033, 0.031, 0.06, 18), black, 0, 0.094, 0);
      put(head, new THREE.CylinderGeometry(0.036, 0.036, 0.006, 18), black, 0.0, 0.066, 0.006);
      ball(head, new THREE.MeshStandardMaterial({ color: '#c0262c', roughness: 0.4 }), [0.01, 0.016, 0.01], [0, 0.134, 0], 10);
      put(head, new THREE.BoxGeometry(0.03, 0.006, 0.004), brass, 0, 0.086, 0.032);
      for (const side of [-1, 1]) ball(head, black, [0.011, 0.0035, 0.004], [side * 0.008, 0.025, 0.03], 8).rotation.z = side * -0.25;
      ball(head, new THREE.MeshStandardMaterial({ color: '#e87a8a', roughness: 0.4 }), [0.006, 0.006, 0.006], [0, 0.034, 0.031], 8);
    }
    if (a.patient !== 'porcelain') {
      // Bead or painted eyes; closed eyes are a stitched line.
      for (const side of [-1, 1]) {
        const front = a.patient === 'rag' ? 0.03 : a.patient === 'teddy' ? 0.038 : 0.029;
        if (lid > 0.9) {
          const line = put(head, new THREE.BoxGeometry(0.012, 0.0022, 0.003), black, side * eyeX, eyeY, front);
          line.rotation.z = side * 0.15;
        } else {
          const size = a.patient === 'rag' ? 0.008 : a.patient === 'soldier' ? 0.004 : 0.0058;
          const bead = ball(head, black, [size, size * (lid > 0.3 ? 0.5 : 1), size * 0.6], [side * eyeX, eyeY, front], 10);
          bead.castShadow = false;
        }
      }
    }
    // Head injuries, in the head's own frame.
    if (a.injury === 'head') {
      const wrap = put(head, new THREE.TorusGeometry(headRadius * 0.93, 0.008, 8, 24), white, 0, headCentre + headRadius * 0.6, 0);
      wrap.rotation.x = Math.PI / 2 + 0.2;
      wrap.scale.z = 1.25;
      ball(head, white, [0.008, 0.008, 0.008], [headRadius * 0.9, headCentre + headRadius * 0.3, headRadius * 0.5], 8);
      if (mood.cheer < 0.45) ball(head, flat('#a8342c'), [0.007, 0.006, 0.003], [-headRadius * 0.4, headCentre + headRadius * 0.62, headRadius * 0.93], 8);
    }
    if (a.injury === 'patch') {
      const front = a.patient === 'porcelain' ? headRadius * 0.93 : a.patient === 'teddy' ? 0.04 : a.patient === 'rag' ? 0.031 : 0.03;
      const patch = ball(head, black, [0.0125, 0.0125, 0.004], [eyeX, eyeY, front + 0.002], 12);
      patch.rotation.y = 0.3;
      const strap = put(head, new THREE.TorusGeometry(headRadius * 1.01, 0.0018, 5, 28), black, 0, headCentre + 0.004, 0);
      strap.rotation.set(Math.PI / 2, 0.45, 0);
    }
    head.position.set(-L / 2 + 0.118, bedY + 0.05, 0);
    head.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.5 + (random() - 0.5) * 0.2)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.22))
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2))
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)));
    s.root.add(head);

    // Arms over the blanket.
    const top = bedY + 0.045;
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Vector3(-0.085, top - 0.004, side * 0.055);
      const slung = a.injury === 'sling' && side > 0;
      const hand = slung ? new THREE.Vector3(-0.03, top + 0.03, -0.012) : new THREE.Vector3(0.0 + random() * 0.02, top + 0.004, side * (0.072 + random() * 0.012));
      const elbow = slung ? new THREE.Vector3(-0.02, top + 0.018, 0.06) : shoulder.clone().lerp(hand, 0.5).add(new THREE.Vector3(0, 0.006, side * 0.008));
      const thick = a.patient === 'teddy' ? 0.017 : 0.0115;
      limb(s.root, shoulder, elbow, thick, thick * 0.92, sleeve);
      limb(s.root, elbow, hand, thick * 0.92, thick * 0.85, sleeve);
      ball(s.root, sleeve, [thick * 0.95, thick * 0.95, thick * 0.95], [elbow.x, elbow.y, elbow.z], 10);
      ball(s.root, a.patient === 'teddy' ? flat('#d8b888', 0.95) : skin, [thick * 1.05, thick * 0.9, thick * 1.15], [hand.x, hand.y, hand.z], 10);
      if (slung) {
        const slingCloth = put(s.root, new THREE.CylinderGeometry(0.05, 0.05, 0.004, 3), white, -0.03, top + 0.012, 0.025);
        slingCloth.rotation.set(0.25, 0.5, 0);
        limb(s.root, new THREE.Vector3(-0.02, top + 0.014, 0.065), new THREE.Vector3(-0.1, top + 0.02, -0.04), 0.004, 0.004, white);
      }
    }
    if (a.injury === 'stuffing') {
      const fluff = new THREE.MeshStandardMaterial({ color: '#fbf9f4', roughness: 1, flatShading: true });
      const tufts = Array.from({ length: 16 }, (_unused, i) => {
        const fallen = i > 11;
        return {
          at: (fallen ? [(random() - 0.5) * 0.14 - 0.02, 0.012, Wd / 2 + 0.03 + random() * 0.09] : [-0.03 + (random() - 0.5) * 0.09, top + 0.012 + random() * 0.03, 0.02 + (random() - 0.2) * 0.09]) as [number, number, number],
          size: fallen ? 0.012 + random() * 0.01 : 0.013 + random() * 0.014,
        };
      });
      s.scatter(new THREE.IcosahedronGeometry(1, 1), fluff, tufts);
      s.box([0.05, 0.003, 0.004], [-0.03, top + 0.006, 0.03], flat('#3a2a22')).rotation.y = 0.5;
    }
    if (a.injury === 'traction') {
      const foot = new THREE.Vector3(L / 2 - 0.1, bedY + 0.2, 0.02);
      const knee = new THREE.Vector3(0.06, bedY + 0.05, 0.02);
      limb(s.root, knee, foot, 0.019, 0.016, white);
      ball(s.root, white, [0.018, 0.018, 0.026], [foot.x + 0.006, foot.y + 0.01, foot.z], 10);
      const pole = new THREE.Vector3(L / 2, 0.52, 0.02);
      s.rod([L / 2, 0.24, 0.02], [pole.x, pole.y, pole.z], tube * 0.8, iron);
      s.rod([pole.x, pole.y, pole.z], [pole.x - 0.12, pole.y, pole.z], tube * 0.8, iron);
      const cord = flat('#3a3028');
      s.rod([foot.x, foot.y + 0.02, foot.z], [pole.x - 0.11, pole.y - 0.006, pole.z], 0.0014, cord);
      s.rod([pole.x - 0.11, pole.y - 0.006, pole.z], [pole.x + 0.02, pole.y - 0.004, pole.z], 0.0014, cord);
      s.rod([pole.x + 0.02, pole.y - 0.004, pole.z], [pole.x + 0.02, 0.2, pole.z], 0.0014, cord);
      s.cylinder(0.014, 0.018, 0.04, [pole.x + 0.02, 0.18, pole.z], flat('#5d6066', 0.5), 12);
    }

    // Admission tag on the near side rail.
    const text = { name: 'FOR ANNA', friday: 'COLLECT FRIDAY', unclaimed: 'UNCLAIMED 1962', wake: 'DO NOT WAKE', urgent: 'URGENT - BIRTHDAY', paid: 'PAID IN FULL' }[a.tag];
    const paper = new THREE.Color('#f2e6c4').lerp(new THREE.Color('#b0925a'), wear * 0.6).getStyle();
    const tagX = L / 2 - 0.105;
    const tag = s.label(text, 0.15, 0.05, [tagX, bedY - 0.075, Wd / 2 + 0.014], a.tag === 'urgent' ? '#a8242c' : '#3b2c20', paper);
    tag.rotation.z = (random() - 0.5) * 0.3;
    tag.rotation.x = -0.1;
    s.rod([tagX - 0.05, bedY - 0.052, Wd / 2 + 0.013], [tagX - 0.062, bedY - 0.025, Wd / 2], 0.0012, flat('#a8342c'));

    // Bedside cotton reel.
    if (a.bedside !== 'none') {
      const rx = -L / 2 + 0.03, rz = Wd / 2 + 0.085;
      const reel = flat('#c49a62', 0.7);
      s.cylinder(0.042, 0.042, 0.012, [rx, 0.006, rz], reel, 20);
      s.cylinder(0.026, 0.026, 0.085, [rx, 0.054, rz], flat(['#b8242c', '#2f6fd0', '#35a06a'][Math.floor(random() * 3)], 0.9), 18);
      s.cylinder(0.042, 0.042, 0.012, [rx, 0.102, rz], reel, 20);
      const ty = 0.108;
      if (a.bedside === 'medicine') {
        s.lathe([[0, 0], [0.013, 0], [0.013, 0.03], [0.005, 0.038], [0.005, 0.046], [0.007, 0.046], [0.007, 0.05], [0, 0.05]], new THREE.MeshStandardMaterial({ color: '#6a3a14', roughness: 0.15 }), [rx - 0.012, ty, rz - 0.006]);
        s.rod([rx + 0.006, ty + 0.003, rz + 0.016], [rx + 0.034, ty + 0.004, rz + 0.004], 0.0015, brass);
        s.ball([0.007, 0.003, 0.005], [rx + 0.004, ty + 0.003, rz + 0.017], brass, 8);
      } else if (a.bedside === 'flowers') {
        s.cylinder(0.011, 0.008, 0.02, [rx, ty + 0.01, rz], new THREE.MeshStandardMaterial({ color: '#c8ccd0', metalness: 0.85, roughness: 0.3 }), 12);
        for (let i = 0; i < 5; i++) {
          const tip: [number, number, number] = [rx + (random() - 0.5) * 0.04, ty + 0.045 + random() * 0.02 - wear * 0.02, rz + (random() - 0.5) * 0.04];
          s.rod([rx, ty + 0.018, rz], tip, 0.001, flat('#4a7a3a'));
          s.ball([0.007, 0.006, 0.007], tip, flat(['#f2c230', '#e86a8a', '#f4f1e8', '#8a6ad8'][i % 4], 0.6), 8);
        }
      } else if (a.bedside === 'card') {
        const card = s.label('GET WELL', 0.06, 0.045, [rx, ty + 0.022, rz + 0.006], '#a8242c', '#f6f1dc');
        card.rotation.x = -0.25;
        const back = s.box([0.06, 0.045, 0.001], [rx, ty + 0.021, rz - 0.008], flat('#f6f1dc'));
        back.rotation.x = 0.25;
      } else {
        s.cylinder(0.008, 0.012, 0.012, [rx, ty + 0.006, rz], brass, 12);
        s.rod([rx, ty + 0.01, rz], [rx, ty + 0.035, rz], 0.002, brass);
        const glow = mix(0.9, 0.25, mood.daylight > 0.5 ? 1 - (mood.daylight - 0.5) * 2 : 1);
        s.cylinder(0.012, 0.024, 0.026, [rx, ty + 0.046, rz], new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: '#ffc860', emissiveIntensity: glow, roughness: 0.6 }), 16);
      }
    }

    // Visitor toy, sitting by the bed and looking in.
    if (a.visitor) {
      const visitor = new THREE.Group();
      visitor.position.set(0.05 + random() * 0.06, 0, Wd / 2 + 0.12);
      visitor.rotation.y = Math.PI * 0.82 + (random() - 0.5) * 0.3;
      s.root.add(visitor);
      const kind = a.patient === 'teddy' ? 'rabbit' : random() < 0.5 ? 'rabbit' : 'bear';
      const fur = flat(kind === 'rabbit' ? '#e9e2d4' : '#8a5a2a', 0.95);
      ball(visitor, fur, [0.036, 0.045, 0.034], [0, 0.045, 0], 14);
      ball(visitor, fur, [0.03, 0.028, 0.028], [0, 0.108, 0.004], 14);
      ball(visitor, flat('#f6f1e6', 0.95), [0.013, 0.01, 0.012], [0, 0.1, 0.028], 10);
      ball(visitor, black, [0.004, 0.003, 0.003], [0, 0.104, 0.039], 6);
      for (const side of [-1, 1]) {
        ball(visitor, black, [0.004, 0.004, 0.003], [side * 0.012, 0.115, 0.026], 6);
        if (kind === 'rabbit') ball(visitor, fur, [0.009, 0.036, 0.006], [side * 0.012, 0.16, -0.004], 10).rotation.z = side * (-0.15 - random() * 0.4);
        else ball(visitor, fur, [0.012, 0.012, 0.006], [side * 0.024, 0.132, 0], 10);
        ball(visitor, fur, [0.012, 0.012, 0.028], [side * 0.022, 0.014, 0.03], 10);
        ball(visitor, fur, [0.01, 0.026, 0.011], [side * 0.036, 0.06, 0.012], 10).rotation.z = side * 0.3;
      }
      if (mood.cheer > 0.4) {
        const bow = ball(visitor, flat('#c0262c', 0.7), [0.016, 0.007, 0.006], [0, 0.083, 0.026], 8);
        bow.castShadow = false;
      }
    }

    return s.finish();
  },
});
