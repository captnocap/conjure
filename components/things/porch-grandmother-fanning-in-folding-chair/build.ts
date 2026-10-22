import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { at, dressParts, paint, pick, pickSkin, reach, rig } from './rig';

export default defineThing({
  questions: {
    fan: choice('What is the church fan printed with?', {
      funeral: 'A funeral-home name and a pale painted Jesus, the classic give-away fan.',
      church: 'A church name and a gold cross.',
      plain: 'Plain tan cardboard, the handle worn smooth.',
      palm: 'A woven palm-leaf fan, no print.',
      politician: 'A smiling candidate and a slogan.',
    }),
    hold: choice('What is in the other hand?', {
      cane: 'A wooden cane laid across the lap.',
      tea: 'A tall glass of sweet tea with ice.',
      bible: 'A worn black Bible shut on the lap.',
      purse: 'A black handbag clutched on the lap.',
      phone: 'A cordless phone held to the ear, mid-call.',
    }),
    head: choice('What is on her head?', {
      scarf: 'A headscarf tied under the chin.',
      bun: 'Grey hair up in a bun.',
      churchhat: 'A big Sunday church hat with a flower on it.',
      rollers: 'Hair in pink rollers.',
      short: 'Short grey hair.',
    }),
    chair: choice('What is the chair?', {
      webbed: 'An aluminium folding lawn chair with green and white plastic webbing.',
      wooden: 'A wooden folding chair, slatted.',
      resin: 'A white plastic resin patio chair.',
      steel: 'A brown steel folding chair from the church hall.',
    }),
    dress: choice('What is the housedress?', {
      flowers: 'Small flowers on pale blue.',
      hibiscus: 'Big red hibiscus on white.',
      gingham: 'Pink gingham check.',
      stripes: 'Thin blue and white stripes.',
      plain: 'Plain lavender with a white collar.',
    }),
    doing: choice('What is she doing right now?', {
      watching: 'Watching the street, the fan going slow.',
      calling: 'Calling out to somebody, the fan pointing at them.',
      dozing: 'Dozing, chin down, the fan still in her lap.',
      praying: 'Head bowed, eyes shut, lips moving.',
      laughing: 'Head back, laughing at something.',
    }),
    dog: noul('Is a small dog lying at her feet?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.48, 1.62, random());
    const build = pick(random, ['average', 'heavy', 'heavy'] as const);
    const wide = { slight: 0.85, average: 1, heavy: 1.3 }[build];
    const limb = H * 0.036 * wide, torsoL = H * 0.28, headR = H * 0.064, hipW = H * 0.075 * wide;
    const grey = pick(random, ['#b8b0a4', '#d8d4cc', '#8a8680']);
    const hairKind = { scarf: 'none', bun: 'bun', churchhat: 'hat', rollers: 'short', short: 'short' }[a.head] as 'none' | 'bun' | 'hat' | 'short';
    const hatHex = pick(random, ['#5a2a8a', '#f3efe6', '#c42a2a', '#e8c62a']);
    const [paper, ink] = { flowers: ['#bcd4e8', '#e05a7a'], hibiscus: ['#f6f2ea', '#c42a2a'], gingham: ['#f0c0d0', '#d86a90'], stripes: ['#f3efe6', '#3a6ab8'], plain: ['#b8a0d8', '#b8a0d8'] }[a.dress];
    const person = figure(s, {
      height: H, build, style: 'doll', skin: pickSkin(random), hair: hairKind, hairColor: a.head === 'churchhat' ? hatHex : grey,
      top: paper, bottom: paper, shoes: '#e8a0b0', sleeves: 'short', pose: 'sitting', gaze: 'left',
    });
    s.root.add(person.root);
    const r = rig(person);
    const { joints } = person;

    // The dress print on the torso, hips and thighs; stockings on the shins; slippers.
    const dressMap = paint(256, 256, (c) => {
      c.fillStyle = paper;
      c.fillRect(0, 0, 256, 256);
      c.fillStyle = ink;
      if (a.dress === 'flowers') for (let i = 0; i < 60; i++) { const x = random() * 256, y = random() * 256; for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.257) * 5, y + Math.sin(p * 1.257) * 5, 3.5, 0, 6.3); c.fill(); } c.fillStyle = '#e8c62a'; c.beginPath(); c.arc(x, y, 2, 0, 6.3); c.fill(); c.fillStyle = ink; }
      else if (a.dress === 'hibiscus') for (let i = 0; i < 14; i++) { const x = random() * 256, y = random() * 256, rad = 18; for (let p = 0; p < 5; p++) { c.beginPath(); c.ellipse(x + Math.cos(p * 1.257) * rad * 0.6, y + Math.sin(p * 1.257) * rad * 0.6, rad * 0.55, rad * 0.35, p * 1.257, 0, 6.3); c.fill(); } c.fillStyle = '#3a8a3a'; c.beginPath(); c.ellipse(x + 20, y + 14, 12, 5, 0.6, 0, 6.3); c.fill(); c.fillStyle = ink; }
      else if (a.dress === 'gingham') { for (let x = 0; x < 256; x += 32) c.fillRect(x, 0, 16, 256); c.globalAlpha = 0.6; for (let y = 0; y < 256; y += 32) c.fillRect(0, y, 256, 16); c.globalAlpha = 1; }
      else if (a.dress === 'stripes') for (let x = 0; x < 256; x += 24) c.fillRect(x, 0, 6, 256);
    });
    dressMap.wrapS = dressMap.wrapT = THREE.RepeatWrapping;
    dressMap.repeat.set(1.5, 1.5);
    const dressMaterial = new THREE.MeshStandardMaterial({ map: dressMap, roughness: 0.9 });
    const parts = dressParts(person);
    parts.torso.material = dressMaterial;
    parts.hips.material = dressMaterial;
    parts.thigh('left').material = dressMaterial;
    parts.thigh('right').material = dressMaterial;
    parts.upper('left').material = dressMaterial;
    parts.upper('right').material = dressMaterial;
    const stocking = s.material(pick(random, ['#c9a47a', '#8a6a4a', '#d8c8b8']), { roughness: 0.9 });
    parts.shin('left').material = stocking;
    parts.shin('right').material = stocking;
    for (const side of ['left', 'right'] as const) { const foot = r.foot(side); foot.scale.set(1.25, 1.35, 1.15); foot.material = s.material('#e8a0b0', { roughness: 1 }); }
    if (a.dress === 'plain') {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(limb * 1.5, 0.014, 6, 24), s.material('#f3efe6', { roughness: 0.95 }));
      collar.rotation.x = Math.PI / 2;
      collar.position.y = torsoL - limb * 0.55;
      collar.scale.set(1.1, 1, 0.75);
      joints.spine.add(collar);
    }

    // Seated, knees a little apart, and the mood of the moment in the head and spine.
    const dozing = a.doing === 'dozing', praying = a.doing === 'praying', laughing = a.doing === 'laughing', calling = a.doing === 'calling';
    r.leg('left', { forward: 84, out: 11, knee: 86, foot: 'flat' });
    r.leg('right', { forward: 82, out: 13, knee: 80, foot: 'flat' });
    r.bow(dozing ? 14 : praying ? 16 : laughing ? -10 : 4, 0, calling ? 12 : 4);
    r.look(dozing ? 32 : praying ? 30 : laughing ? -28 : 2, calling ? 42 : praying ? 0 : 24, laughing ? 6 : 0);
    r.lean(-4, 0);
    person.settle();
    // The housedress over the lap: a panel filling the gap between the thighs, and the skirt
    // falling in a curtain from the front of the knees to mid-shin.
    const kneeL = at(s, joints.knees.left), kneeR = at(s, joints.knees.right), hipsAt = at(s, person.pelvis);
    const skirtMaterial = new THREE.MeshStandardMaterial({ map: dressMap, roughness: 0.9, side: THREE.DoubleSide });
    const halfSpan = Math.abs(kneeL.x - kneeR.x) / 2, kneeY = (kneeL.y + kneeR.y) / 2, kneeZ = (kneeL.z + kneeR.z) / 2;
    const thigh = limb * 1.15;
    const lap = s.box([halfSpan * 2, thigh * 1.5, Math.max(0.05, kneeZ - hipsAt.z)], [(kneeL.x + kneeR.x) / 2, kneeY + thigh * 0.35, (kneeZ + hipsAt.z) / 2], skirtMaterial);
    lap.castShadow = true;
    const drop = H * 0.2;
    const radius = halfSpan + thigh * 1.15;
    const hem = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.12, drop, 22, 1, true, -Math.PI * 0.55, Math.PI * 1.1), skirtMaterial);
    hem.position.set((kneeL.x + kneeR.x) / 2, kneeY + thigh * 1.05 - drop / 2, kneeZ - thigh * 0.4);
    hem.scale.z = (thigh * 1.7) / radius;
    hem.castShadow = true;
    s.root.add(hem);

    // The chair, built round the seated hips: seat at hipHeight, back behind, arms at elbow height.
    const pelvis = at(s, person.pelvis);
    const seatY = person.hipHeight - 0.02, seatW = hipW * 2 + 0.26, seatD = 0.44;
    const seatZ = pelvis.z + 0.1;
    const alu = s.material(a.chair === 'steel' ? '#5a4a3a' : a.chair === 'resin' ? '#f1efe8' : a.chair === 'wooden' ? '#8a6a44' : '#c9ccd0', { metalness: a.chair === 'webbed' ? 0.7 : a.chair === 'steel' ? 0.4 : 0, roughness: a.chair === 'webbed' ? 0.35 : 0.7 });
    const tube = (from: [number, number, number], to: [number, number, number], radius = 0.012) => s.rod(from, to, radius, alu);
    const x0 = pelvis.x - seatW / 2, x1 = pelvis.x + seatW / 2, zF = seatZ + seatD / 2, zB = seatZ - seatD / 2;
    const backTop = seatY + 0.5;
    if (a.chair === 'webbed' || a.chair === 'wooden') {
      // Two frame loops crossing under the seat, the folding kind.
      for (const x of [x0, x1]) {
        tube([x, 0.02, zF + 0.02], [x, backTop, zB - 0.12]);
        tube([x, 0.02, zB - 0.05], [x, seatY + 0.22, zF + 0.08]);
        tube([x, seatY + 0.22, zF + 0.08], [x, seatY + 0.22, zB - 0.04]);
      }
      tube([x0, seatY + 0.22, zF + 0.08], [x1, seatY + 0.22, zF + 0.08]);
      tube([x0, backTop, zB - 0.12], [x1, backTop, zB - 0.12]);
      tube([x0, 0.02, zF + 0.02], [x1, 0.02, zF + 0.02]);
      tube([x0, 0.02, zB - 0.05], [x1, 0.02, zB - 0.05]);
      const webbing = a.chair === 'webbed'
        ? paint(128, 128, (c) => { const pair = pick(random, [['#3a8a4a', '#f3efe6'], ['#2a6ad8', '#f3efe6'], ['#e8c62a', '#3a8a4a'], ['#c42a2a', '#f3efe6']]); for (let i = 0; i < 8; i++) { c.fillStyle = pair[i % 2]; c.fillRect(0, i * 16, 128, 14); } c.globalAlpha = 0.5; for (let i = 0; i < 8; i++) { c.fillStyle = pair[(i + 1) % 2]; c.fillRect(i * 16, 0, 14, 128); } })
        : paint(128, 128, (c) => { for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#9a7a54' : '#7a5a3a'; c.fillRect(0, i * 22, 128, 18); } });
      const webMat = new THREE.MeshStandardMaterial({ map: webbing, roughness: 0.8, side: THREE.DoubleSide });
      const seat = s.mesh(new THREE.PlaneGeometry(seatW - 0.03, seatD), webMat, [pelvis.x, seatY, seatZ]);
      seat.rotation.x = -Math.PI / 2;
      const back = s.mesh(new THREE.PlaneGeometry(seatW - 0.03, 0.42), webMat, [pelvis.x, seatY + 0.28, zB - 0.1]);
      back.rotation.x = -0.2;
    } else {
      const solid = a.chair === 'resin' ? alu : s.material('#5a4a3a', { metalness: 0.4, roughness: 0.6 });
      s.box([seatW, 0.03, seatD], [pelvis.x, seatY, seatZ], solid);
      const back = s.box([seatW, 0.42, 0.03], [pelvis.x, seatY + 0.28, zB - 0.06], solid);
      back.rotation.x = -0.18;
      for (const [x, z] of [[x0 + 0.03, zF - 0.03], [x1 - 0.03, zF - 0.03], [x0 + 0.03, zB + 0.03], [x1 - 0.03, zB + 0.03]] as const) tube([x, 0.01, z], [x, seatY, z], a.chair === 'resin' ? 0.02 : 0.012);
      if (a.chair === 'resin') for (const x of [x0 + 0.02, x1 - 0.02]) { s.box([0.05, 0.03, seatD], [x, seatY + 0.22, seatZ], solid); tube([x, seatY, zF - 0.03], [x, seatY + 0.22, zF - 0.03], 0.02); }
    }

    // Hats and hair beyond the kit's.
    if (a.head === 'scarf') {
      const scarfMat = new THREE.MeshStandardMaterial({ map: paint(64, 64, (c) => { c.fillStyle = pick(random, ['#e8c62a', '#c42a2a', '#f3efe6', '#5a2a8a']); c.fillRect(0, 0, 64, 64); c.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 20; i++) { c.beginPath(); c.arc(random() * 64, random() * 64, 3, 0, 6.3); c.fill(); } }), roughness: 1, side: THREE.DoubleSide });
      const scarf = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.14, 16, 10, Math.PI * 0.9, Math.PI * 1.2, 0, Math.PI * 0.8), scarfMat);
      scarf.position.set(0, headR * 0.08, -headR * 0.05);
      const knot = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, headR * 0.3, headR * 0.3), scarfMat);
      knot.position.set(0, -headR * 1.05, headR * 0.55);
      scarf.castShadow = true;
      person.head.add(scarf, knot);
    } else if (a.head === 'churchhat') {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 2.4, headR * 2.4, headR * 0.06, 28), s.material(hatHex, { roughness: 0.8 }));
      brim.position.y = headR * 0.78;
      brim.rotation.x = 0.08;
      brim.castShadow = true;
      const flower = s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material(hatHex === '#f3efe6' ? '#c42a2a' : '#f3efe6', { roughness: 0.9 }), Array.from({ length: 7 }, (_, i) => ({ at: [headR * 1.4 + Math.cos(i * 0.9) * headR * 0.3, headR * 0.95 + Math.sin(i * 1.3) * headR * 0.1, headR * 0.6 + Math.sin(i * 0.9) * headR * 0.3] as [number, number, number], size: headR * 0.22 })));
      person.head.add(brim, flower);
    } else if (a.head === 'rollers') {
      const rollers: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 9; i++) { const angle = (i / 9) * Math.PI * 2; const lift = i % 3 === 0 ? 0.95 : 0.55; rollers.push({ at: [Math.sin(angle) * headR * 0.65 * (1.2 - lift * 0.4), headR * lift, Math.cos(angle) * headR * 0.65 * (1.2 - lift * 0.4)], size: 1 }); }
      person.head.add(s.scatter(new THREE.CylinderGeometry(headR * 0.18, headR * 0.18, headR * 0.5, 8), s.material('#f0a0c0', { roughness: 0.9 }), rollers));
    }

    // The church fan in the right hand: a paddle on a stick, up by the face unless she is dozing or praying.
    const head = at(s, person.head);
    const fanAt = dozing || praying ? new THREE.Vector3(pelvis.x - 0.1, person.hipHeight + 0.1, pelvis.z + 0.22) : calling ? new THREE.Vector3(head.x - 0.3, head.y - 0.15, head.z + 0.3) : new THREE.Vector3(head.x - 0.17, head.y - 0.25, head.z + 0.27);
    reach(person, 'right', fanAt, { forward: 60, out: 20, bend: 110, across: 20 });
    const fanMap = paint(256, 300, (c) => {
      const tan = a.fan === 'palm' ? '#c9b07a' : a.fan === 'plain' ? '#d8c49a' : '#f1ece0';
      c.fillStyle = tan;
      c.fillRect(0, 0, 256, 300);
      if (a.fan === 'palm') { c.strokeStyle = 'rgba(90,70,30,0.6)'; c.lineWidth = 3; for (let i = 0; i < 20; i++) { c.beginPath(); c.moveTo(128, 300); c.lineTo(i * 13, 0); c.stroke(); } }
      if (a.fan === 'funeral' || a.fan === 'politician') {
        c.fillStyle = a.fan === 'funeral' ? '#9ab8d8' : '#c42a2a';
        c.fillRect(18, 18, 220, 190);
        c.fillStyle = a.fan === 'funeral' ? '#e8d8c8' : '#d9b08c';
        c.beginPath(); c.ellipse(128, 100, 40, 52, 0, 0, 6.3); c.fill();
        c.fillStyle = a.fan === 'funeral' ? '#f1ece0' : '#1d1c22';
        c.fillRect(70, 150, 116, 50);
        c.fillStyle = '#1d1c22'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 26px sans-serif';
        c.fillText(a.fan === 'funeral' ? pick(random, ['RHODES', 'GERTRUDE GEDDES', 'CHARBONNET']) : pick(random, ['VOTE', 'RE-ELECT', 'MORIAL']), 128, 240);
        c.font = '18px sans-serif';
        c.fillText(a.fan === 'funeral' ? 'FUNERAL HOME' : 'FOR COUNCIL', 128, 270);
      }
      if (a.fan === 'church') {
        c.fillStyle = '#d9b23a'; c.fillRect(116, 40, 24, 120); c.fillRect(80, 70, 96, 22);
        c.fillStyle = '#1d1c22'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 24px sans-serif';
        c.fillText(pick(random, ['ST. AUGUSTINE', 'MT. ZION', 'GREATER LIBERTY']), 128, 215, 230);
        c.font = '18px sans-serif'; c.fillText('BAPTIST CHURCH', 128, 250);
      }
    });
    const fan = new THREE.Group();
    const paddle = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.29), new THREE.MeshStandardMaterial({ map: fanMap, roughness: 0.9, side: THREE.DoubleSide }));
    paddle.position.y = 0.27;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.34, 6), s.material('#d9c49a', { roughness: 0.8 }));
    stick.position.y = 0.08;
    paddle.castShadow = stick.castShadow = true;
    fan.add(paddle, stick);
    fan.position.set(0, -0.02, 0.02);
    person.hands.right.add(fan);
    // Set the fan's turn in the world, not the wrist's: its printed face toward the street, the
    // paddle leaning in toward her face, held out at somebody, or lying face up in the lap.
    person.root.updateMatrixWorld(true);
    const wrist = person.hands.right.getWorldQuaternion(new THREE.Quaternion()).invert();
    const facing = dozing || praying ? new THREE.Euler(-1.25, 0.2, 0.4) : calling ? new THREE.Euler(-0.1, 0.35, 1.0) : new THREE.Euler(-0.15, 0.3 + random() * 0.2, -0.3);
    fan.quaternion.copy(wrist.multiply(new THREE.Quaternion().setFromEuler(facing)));

    // The other hand: a cane across the lap, tea, a Bible, a purse or the phone.
    const wood = s.material('#6a4a2a', { roughness: 0.6 });
    const left = person.hands.left;
    if (a.hold === 'cane') {
      const lapY = (kneeL.y + kneeR.y) / 2 + 0.05, lapZ = (kneeL.z + kneeR.z) / 2 - 0.08;
      const cane = s.rod([kneeL.x + 0.25, lapY + 0.02, lapZ], [kneeR.x - 0.3, lapY - 0.02, lapZ + 0.03], 0.012, wood);
      cane.castShadow = true;
      const crook = s.ring(0.05, 0.012, [kneeL.x + 0.25, lapY + 0.05, lapZ], wood, Math.PI);
      crook.rotation.set(0, Math.PI / 2, 0);
      reach(person, 'left', new THREE.Vector3(kneeL.x + 0.02, lapY + 0.04, lapZ), { forward: 40, out: 10, bend: 60, across: 10 });
    } else if (a.hold === 'phone') {
      reach(person, 'left', new THREE.Vector3(head.x + headR * 1.1, head.y - headR * 0.2, head.z + headR * 0.3), { forward: 60, out: 30, bend: 120, across: 10 });
      const handset = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.19, 0.03), s.material('#f1efe8', { roughness: 0.6 }));
      handset.position.set(0, 0.02, 0.03);
      handset.rotation.set(0.1, 0, -0.1);
      const aerial = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 6), s.material('#1a1a1e', { roughness: 0.5 }));
      aerial.position.set(0, 0.15, 0.03);
      left.add(handset, aerial);
    } else {
      const lapY = (kneeL.y + kneeR.y) / 2 + 0.05;
      reach(person, 'left', new THREE.Vector3(kneeL.x - 0.02, lapY + 0.08, kneeL.z - 0.12), { forward: 40, out: 10, bend: 60, across: 10 });
      if (a.hold === 'tea') {
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.15, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#d8a040', transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
        glass.position.set(0, 0.0, 0.045);
        const ice = s.scatter(new THREE.BoxGeometry(0.02, 0.02, 0.02), new THREE.MeshStandardMaterial({ color: '#e8f4ff', roughness: 0.1, transparent: true, opacity: 0.8, depthWrite: false }), [{ at: [0.008, 0.05, 0.04], size: 1 }, { at: [-0.01, 0.045, 0.055], size: 0.9 }]);
        const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 5), s.material('#c42a2a', { roughness: 0.6 }));
        straw.position.set(0.01, 0.07, 0.05);
        straw.rotation.z = 0.2;
        left.add(glass, ice, straw);
      } else if (a.hold === 'bible') {
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.045, 0.21), s.material('#1a1a1e', { roughness: 0.5 }));
        book.position.set(0, -0.03, 0.02);
        const pages = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.036, 0.2), s.material('#e8d8a8', { roughness: 0.9 }));
        pages.position.set(0.006, -0.03, 0.02);
        const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.002, 0.09), s.material('#c42a2a', { roughness: 0.8 }));
        ribbon.position.set(0.02, -0.006, 0.12);
        book.castShadow = true;
        left.add(book, pages, ribbon);
      } else if (a.hold === 'purse') {
        const purse = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.1), s.material('#1a1a1e', { roughness: 0.4 }));
        purse.position.set(0, -0.09, 0.02);
        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 6, 16, Math.PI), s.material('#1a1a1e', { roughness: 0.4 }));
        handle.position.set(0, -0.01, 0.02);
        const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), s.material('#d9b23a', { metalness: 0.9, roughness: 0.25 }));
        clasp.position.set(0, -0.01, 0.075);
        purse.castShadow = true;
        left.add(purse, handle, clasp);
      }
    }
    person.measure();

    // A small dog lying at her feet, a curl of brown and white.
    let tail: THREE.Mesh | null = null;
    if (a.dog) {
      // Lying with its chin up and front paws out, turned toward the street.
      const coatHex = pick(random, ['#8a6a44', '#f1ede4', '#3a2a22', '#c9a47a', '#5a4a3e']);
      const coat = s.material(coatHex, { roughness: 1 });
      const dark = s.material(coatHex === '#3a2a22' || coatHex === '#5a4a3e' ? '#c9a47a' : '#3a2a22', { roughness: 0.9 });
      const nose = s.material('#141416', { roughness: 0.3 });
      const dog = new THREE.Group();
      const side = random() < 0.5 ? -1 : 1;
      dog.position.set(pelvis.x + side * 0.5, 0, seatZ + 0.3);
      dog.rotation.y = side < 0 ? -0.5 : Math.PI + 0.5;
      const part = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], rotation: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...at); mesh.rotation.set(...rotation); mesh.scale.set(...scale);
        mesh.castShadow = mesh.receiveShadow = true;
        dog.add(mesh);
        return mesh;
      };
      part(new THREE.CapsuleGeometry(0.075, 0.2, 4, 10), coat, [0, 0.072, 0], [0, 0, Math.PI / 2], [1, 1, 1.1]);
      part(new THREE.SphereGeometry(1, 14, 10), coat, [0.21, 0.135, 0], [0, 0, 0], [0.075, 0.068, 0.07]);
      part(new THREE.CapsuleGeometry(0.03, 0.05, 3, 8), coat, [0.285, 0.118, 0], [0, 0, Math.PI / 2]);
      part(new THREE.SphereGeometry(0.016, 8, 6), nose, [0.325, 0.124, 0]);
      for (const z of [-1, 1]) {
        part(new THREE.SphereGeometry(1, 10, 8), dark, [0.19, 0.16, z * 0.06], [z * 0.6, 0, 0.3], [0.035, 0.06, 0.016]);
        part(new THREE.SphereGeometry(0.009, 6, 5), nose, [0.268, 0.155, z * 0.03]);
        part(new THREE.CapsuleGeometry(0.02, 0.1, 3, 6), coat, [0.2, 0.02, z * 0.045], [0, 0, Math.PI / 2]);
      }
      tail = part(new THREE.CapsuleGeometry(0.015, 0.13, 3, 6), coat, [-0.2, 0.05, 0.03], [0.4, 0, Math.PI / 2 + 0.4]);
      s.root.add(dog);
    }

    // The fan goes, the head nods in the heat, the dog's tail thumps.
    const energy = mood.energy;
    const phase = random() * Math.PI * 2;
    const elbow = joints.elbows.right, restElbow = elbow.rotation.x;
    const restNeck = joints.neck.rotation.x;
    const fanning = !dozing && !praying;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (fanning) elbow.rotation.x = restElbow + Math.sin(time * mix(2.5, 7, energy) + phase) * mix(0.08, 0.2, energy);
        if (dozing) joints.neck.rotation.x = restNeck + Math.sin(time * 0.6 + phase) * 0.06;
        if (tail) tail.rotation.y = Math.sin(time * mix(2, 8, energy) + phase) * 0.35 * (0.2 + energy);
      },
    });
  },
});
