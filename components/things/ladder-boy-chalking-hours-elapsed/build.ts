import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { paint, pickSkin, rig, worldOf } from './rig';

const SPONSORS = ["DUKE'S DINER", 'ACME SHOE REPAIR', 'SUNRISE BAKERY', 'STAR CAB CO.', 'MAJESTIC HOTEL'];

export default defineThing({
  questions: {
    range: choice('How many hours are on the board?', {
      hundreds: 'A few hundred hours: the count still in the low hundreds, the field still crowded.',
      ninehundreds: 'Nine hundred and something: the fortieth day, the stragglers.',
      thousand: 'Over a thousand hours, four digits beginning with 1, a record on the wall.',
    }),
    doing: choice('What is the boy doing?', {
      writing: 'Writing, arm stretched up, chalk on the board, nose nearly touching it.',
      pausing: 'Paused with the chalk, twisted round on the ladder to look back at the floor.',
      wiping: 'Wiping out the last digit with a rag before the new hour goes up.',
      resting: 'Sat on the top step, chalk in his lap, feet dangling, watching the dancers.',
    }),
    board: choice('What kind of board is it?', {
      chalk: 'A blackboard with the hours in chalk, smudged where old numbers were rubbed out.',
      slats: 'Painted wooden number slats hung on hooks, black digits on cream.',
      flip: 'Flip cards in a wooden frame, cream card with a split through each digit.',
    }),
    listed: choice('What else is listed under the hours?', {
      couples: 'COUPLES LEFT and a small number.',
      prize: 'The prize money in dollars.',
      sponsor: 'A sponsor\'s name painted at the bottom.',
      all: 'All of it: couples left, the prize, and the sponsor.',
    }),
    ladder: choice('What does he stand on?', {
      stepladder: 'A wooden A-frame stepladder, paint-spattered.',
      straight: 'A straight ladder leaned against the board.',
      crates: 'Two wooden crates stacked, wobbling.',
    }),
    clothes: choice('What is he wearing?', {
      shirt: 'A collarless white shirt, suspenders and brown trousers.',
      knickers: 'Knickerbockers, long grey socks and a striped shirt.',
      vest: 'A grey wool vest over a shirt, trousers rolled.',
    }),
    bucket: noul('Is a bucket of chalk and a rag hooked on the ladder?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const wood = s.material(pick(['#8a6a44', '#7a5a3a', '#9c7c52']), { roughness: 0.8 });
    const darkWood = s.material('#3e2e20', { roughness: 0.7 });
    const cream = '#efe6cf';

    // ---- the number and the lines beneath it
    const hours = a.range === 'hundreds' ? 100 + Math.floor(random() * 800) : a.range === 'ninehundreds' ? 900 + Math.floor(random() * 100) : 1000 + Math.floor(random() * 300);
    const digits = String(hours).padStart(4, '0');
    const couples = 3 + Math.floor(random() * 30);
    const prize = pick(['$1,000', '$1,500', '$500', '$2,000', '$750']);
    const sponsor = pick(SPONSORS);
    const lines = { couples: [`COUPLES LEFT  ${couples}`], prize: [`PRIZE  ${prize}`], sponsor: [sponsor], all: [`COUPLES LEFT  ${couples}`, `PRIZE  ${prize}`, sponsor] }[a.listed];

    // ---- the board on its easel frame, facing +z, 1.3 m wide and 2.6 m tall
    const BW = 1.3, BH = 2.6, BZ = -0.32;
    const chalkBoard = a.board === 'chalk';
    const face = paint(512, 1024, (c) => {
      c.fillStyle = chalkBoard ? '#1f2321' : '#2a3a30';
      c.fillRect(0, 0, 512, 1024);
      if (chalkBoard) {
        // Ghosts of rubbed-out numbers and chalk dust.
        for (let i = 0; i < 30; i++) {
          c.fillStyle = `rgba(220,220,210,${0.03 + random() * 0.05 * (0.5 + mood.wear)})`;
          c.beginPath();
          c.ellipse(random() * 512, 250 + random() * 600, 30 + random() * 80, 10 + random() * 30, random(), 0, Math.PI * 2);
          c.fill();
        }
      }
      c.fillStyle = cream;
      c.font = 'bold 110px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('HOURS', 256, 100);
      c.fillRect(40, 170, 432, 6);
      if (chalkBoard) {
        c.fillStyle = '#f0f0ea';
        c.font = 'bold 190px monospace';
        const shown = a.doing === 'writing' ? digits.slice(0, 3) : digits;
        for (let i = 0; i < shown.length; i++) c.fillText(shown[i], 76 + i * 120 + (random() - 0.5) * 8, 330 + (random() - 0.5) * 12);
        if (a.doing === 'writing') { c.fillRect(76 + 3 * 120 - 30, 250, 10, 70); }
      }
      c.fillStyle = cream;
      c.font = 'bold 54px sans-serif';
      lines.forEach((line, i) => c.fillText(line, 256, 560 + i * 130));
      if (a.board !== 'chalk') { c.fillRect(40, 440, 432, 4); }
    });
    s.mesh(new THREE.BoxGeometry(BW, BH, 0.04), s.material('#4a3a2a', { roughness: 0.9 }), [0, BH / 2 + 0.2, BZ - 0.025]);
    s.mesh(new THREE.PlaneGeometry(BW - 0.08, BH - 0.08), new THREE.MeshStandardMaterial({ map: face, roughness: 0.95 }), [0, BH / 2 + 0.2, BZ]);
    for (const x of [-1, 1]) {
      s.box([0.07, BH + 0.5, 0.07], [x * (BW / 2 + 0.02), (BH + 0.5) / 2, BZ - 0.02], wood);
      s.box([0.07, 0.07, 0.7], [x * (BW / 2 + 0.02), 0.035, BZ - 0.02], wood);
      s.rod([x * (BW / 2 + 0.02), BH + 0.4, BZ - 0.02], [x * (BW / 2 + 0.02), 0.2, BZ - 0.55], 0.025, wood);
    }
    s.box([BW + 0.2, 0.08, 0.08], [0, BH + 0.5, BZ - 0.02], wood);
    if (!chalkBoard) {
      // Number tiles hung in a row where the chalk figures would be.
      const rowY = 0.2 + BH - 0.84;
      for (let i = 0; i < 4; i++) {
        const tile = paint(128, 160, (c) => {
          c.fillStyle = a.board === 'slats' ? cream : '#f4efe0';
          c.fillRect(0, 0, 128, 160);
          c.fillStyle = '#1a1a1a';
          c.font = 'bold 150px sans-serif';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(digits[i], 64, 84);
          if (a.board === 'flip') { c.fillStyle = '#5a5a5a'; c.fillRect(0, 78, 128, 4); }
        });
        const x = -0.45 + i * 0.3;
        const mesh = s.mesh(new THREE.BoxGeometry(0.25, 0.32, 0.02), [new THREE.MeshStandardMaterial({ color: '#d9d2bc' }), new THREE.MeshStandardMaterial({ color: '#d9d2bc' }), new THREE.MeshStandardMaterial({ color: '#d9d2bc' }), new THREE.MeshStandardMaterial({ color: '#d9d2bc' }), new THREE.MeshStandardMaterial({ map: tile, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: '#d9d2bc' })] as unknown as THREE.Material, [x, rowY + (a.doing === 'writing' && i === 3 ? -0.08 : 0), BZ + 0.03]);
        if (a.board === 'slats') { mesh.rotation.z = (random() - 0.5) * 0.08; s.cylinder(0.008, 0.008, 0.03, [x, rowY + 0.19, BZ + 0.02], darkWood, 8); }
        else s.box([0.29, 0.36, 0.015], [x, rowY, BZ + 0.012], darkWood);
      }
    }

    // ---- what he stands on
    const standY = { stepladder: 0.9, straight: 0.9, crates: 0.76 }[a.ladder];
    const standZ = { stepladder: 0.12, straight: 0.05, crates: 0.15 }[a.ladder];
    // Where the seat is for a boy resting on top: [height, z of the seat].
    const seat: [number, number] = { stepladder: [1.99, 0.07] as [number, number], straight: [1.8, -0.12] as [number, number], crates: [0.78, 0.15] as [number, number] }[a.ladder];
    if (a.ladder === 'stepladder') {
      const top = 1.95, lean = 0.13;
      for (const x of [-1, 1]) {
        s.rod([x * 0.24, 0, standZ + top * lean], [x * 0.21, top, standZ - 0.02], 0.028, wood);
        s.rod([x * 0.24, 0, standZ - 0.3], [x * 0.21, top, standZ - 0.08], 0.022, wood);
      }
      for (let i = 1; i <= 6; i++) {
        const y = i * 0.3;
        s.box([0.42, 0.03, 0.12], [0, y, standZ + (top - y) * lean], wood);
      }
      s.box([0.5, 0.04, 0.16], [0, top + 0.02, standZ - 0.05], wood);
      s.box([0.42, 0.03, 0.03], [0, 1.1, standZ - 0.2], wood);
      s.box([0.42, 0.03, 0.03], [0, 0.5, standZ - 0.26], wood);
      if (mood.wear > 0.3) s.scatter(new THREE.SphereGeometry(1, 6, 5), s.material('#e8e2d2'), Array.from({ length: 24 }, () => ({ at: [(random() - 0.5) * 0.4, 0.3 + random() * 1.5, standZ + random() * 0.15] as [number, number, number], size: 0.006 + random() * 0.012, color: pick(['#e8e2d2', '#9fb0c4', '#c9a0a0']) })));
    } else if (a.ladder === 'straight') {
      const H = 2.9, lean = 0.4;
      for (const x of [-1, 1]) s.rod([x * 0.2, 0, BZ + 0.05 + lean], [x * 0.2, H, BZ + 0.06], 0.025, wood);
      for (let i = 1; i <= 9; i++) s.cylinder(0.016, 0.016, 0.4, [0, i * 0.3, BZ + 0.05 + lean * (1 - i * 0.3 / H)], wood, 10).rotation.z = Math.PI / 2;
    } else {
      const crate = (y: number, w: number, turn: number) => {
        const g = new THREE.Group();
        const mat = s.material(pick(['#b89860', '#a88a58', '#c4a470']), { roughness: 0.9 });
        for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
          const slat = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, w), mat);
          slat.position.set(sx * (w / 2 - 0.01), 0.06 + i * 0.13, 0);
          g.add(slat);
          const slat2 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.09, 0.02), mat);
          slat2.position.set(0, 0.06 + i * 0.13, sx * (w / 2 - 0.01));
          g.add(slat2);
        }
        const lid = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, w), mat);
        lid.position.y = 0.37;
        g.add(lid);
        g.traverse((n) => { (n as THREE.Mesh).castShadow = (n as THREE.Mesh).receiveShadow = true; });
        g.position.set(0, y, standZ);
        g.rotation.y = turn;
        s.root.add(g);
      };
      crate(0, 0.5, (random() - 0.5) * 0.3);
      crate(0.38, 0.46, (random() - 0.5) * 0.5);
    }

    // ---- the boy
    const H = mix(1.3, 1.45, random());
    const limb = H * 0.036 * 0.85, torsoL = H * 0.28, shoulderW = H * 0.115 * 0.85;
    const shirt = { shirt: '#efe9dc', knickers: '#d8d2c0', vest: '#6a6a66' }[a.clothes];
    const trousers = { shirt: '#6b4a2e', knickers: '#4a4a52', vest: '#3a3a40' }[a.clothes];
    const resting = a.doing === 'resting';
    const boy = figure(s, {
      height: H, style: 'doll', build: 'slight', pose: resting ? 'sitting' : 'standing', hair: 'cap', hairColor: pick(['#5a4a3a', '#3a3a3a', '#6b5a44']),
      skin: pickSkin(random), top: shirt, bottom: trousers, shoes: '#3a2a20', sleeves: a.clothes === 'vest' ? 'long' : 'short',
    });
    s.root.add(boy.root);
    const r = rig(boy);
    if (a.clothes === 'knickers') {
      const sock = s.material('#8a8a80', { roughness: 0.95 });
      for (const knee of [boy.joints.knees.left, boy.joints.knees.right]) (knee.children[0] as THREE.Mesh).material = sock;
      const stripes = paint(64, 64, (c) => { c.fillStyle = '#d8d2c0'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#7a4a4a'; for (let x = 0; x < 64; x += 16) c.fillRect(x, 0, 6, 64); });
      stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping;
      stripes.repeat.set(3, 1);
      const torso = boy.joints.spine.children.find((n) => (n as THREE.Mesh).isMesh) as THREE.Mesh;
      torso.material = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.8 });
    }
    if (a.clothes !== 'vest') {
      for (const side of [-1, 1]) for (const z of [1, -1]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.016, torsoL * 0.8, 0.006), s.material('#2a2a30'));
        strap.position.set(side * shoulderW * 0.42, torsoL * 0.55, z * limb * 1.4);
        boy.joints.spine.add(strap);
      }
    } else {
      const vest = new THREE.Mesh(new THREE.CapsuleGeometry(limb * 1.43, Math.max(0.01, torsoL * 0.74 - limb * 2.86), 4, 12), s.material('#4a4a48', { roughness: 0.9 }));
      vest.scale.x = (shoulderW * 2) / (limb * 2.7);
      vest.position.y = torsoL * 0.4;
      vest.castShadow = true;
      boy.joints.spine.add(vest);
    }
    const chalk = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 8), s.material('#f4f4ee', { roughness: 1 }));
    const rag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.08), s.material('#c9c2b0', { roughness: 1 }));
    chalk.castShadow = rag.castShadow = true;
    // He faces the board.
    boy.root.rotation.y = Math.PI;
    if (resting) {
      r.look(28, 0, 0);
      r.arm('left', { forward: 20, out: 8, bend: 80, across: 20 });
      r.arm('right', { forward: 20, out: 8, bend: 80, across: 20 });
      boy.hands.right.add(chalk);
      chalk.rotation.x = Math.PI / 2;
      boy.root.rotation.y = 0;
      boy.root.position.set(0, seat[0] - boy.hipHeight + 0.02, seat[1] + 0.24 * H / 1.7);
    } else {
      const writing = a.doing === 'writing' || a.doing === 'wiping';
      if (writing) {
        r.arm('right', { forward: 118, out: 10, bend: 14, across: 0 });
        r.arm('left', { forward: 50, out: 12, bend: 95, across: 30 });
        r.look(-22, -8, 0);
        r.bow(-4, 0);
      } else {
        r.arm('right', { forward: 10, out: 14, bend: 30, across: 0 });
        r.arm('left', { forward: 50, out: 12, bend: 95, across: 30 });
        boy.joints.spine.rotation.y = 0.55;
        r.look(6, 72, 0);
      }
      r.leg('left', { forward: 2, out: 6, knee: 4 });
      r.leg('right', { forward: 2, out: 6, knee: 4 });
      boy.hands.right.add(a.doing === 'wiping' ? rag : chalk);
      if (a.doing !== 'wiping') chalk.rotation.x = Math.PI / 2;
      boy.root.position.set(0.02, standY, standZ + { stepladder: 0.18, straight: 0.0, crates: 0.0 }[a.ladder]);
    }
    if (!resting) { r.settle(false); boy.root.position.y = standY; }
    boy.root.updateMatrixWorld(true);
    if (!resting && a.doing !== 'pausing') {
      // Bring the chalk hand to the board: the arm is already up; slide the boy so the hand touches the face.
      const hand = worldOf(boy.hands.right);
      const reach = hand.z - (BZ + 0.04);
      if (reach > 0.02) boy.root.position.z -= Math.min(reach - 0.02, 0.12);
    }

    if (a.bucket) {
      const bucket = s.lathe([[0.03, 0], [0.065, 0.004], [0.075, 0.12], [0.08, 0.13], [0.07, 0.13], [0.062, 0.01], [0.03, 0.01]], s.material('#8a8a86', { metalness: 0.6, roughness: 0.5 }), [-0.33, 1.02, standZ + 0.08]);
      void bucket;
      s.rod([-0.33, 1.15, standZ + 0.08], [-0.26, 1.2, standZ + 0.05], 0.004, darkWood);
      for (let i = 0; i < 6; i++) s.cylinder(0.006, 0.006, 0.05, [-0.33 + (random() - 0.5) * 0.06, 1.15, standZ + 0.08 + (random() - 0.5) * 0.06], s.material(pick(['#f4f4ee', '#f4f4ee', '#f0d8a8'])), 6).rotation.set(random(), random(), random());
      const hung = s.box([0.07, 0.16, 0.03], [0.32, 1.0, standZ + 0.06], s.material('#c9c2b0', { roughness: 1 }));
      hung.rotation.z = 0.1;
    }

    // The writing hand moves; a pausing boy sways with the music.
    const energy = mood.energy;
    const phase = random() * Math.PI * 2;
    const elbow = boy.joints.elbows.right, restElbow = elbow.rotation.x;
    return s.finish({
      update(dt, time) {
        boy.update(dt, time);
        if (a.doing === 'writing' || a.doing === 'wiping') elbow.rotation.x = restElbow + Math.sin(time * mix(2, 7, energy) + phase) * mix(0.015, 0.05, energy);
      },
    });
  },
});
