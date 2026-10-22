import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type Figure, mix, noul } from '@conjure/kit';

type P = [number, number, number];
const RAD = Math.PI / 180;

/** Reach the figure's joints through its hands and pelvis, so a pose can be adjusted after it is built. */
function rig(person: Figure) {
  const isJoint = (node: THREE.Object3D) => (node as THREE.Group).isGroup;
  const arm = (side: 'left' | 'right') => {
    const wrist = person.hands[side].parent!, elbow = wrist.parent!, shoulder = elbow.parent!;
    return { shoulder, elbow, wrist };
  };
  const leg = (side: 'left' | 'right') => {
    const hip = person.pelvis.children.find((node) => isJoint(node) && node.position.y < 0 && (side === 'left' ? node.position.x > 0 : node.position.x < 0))!;
    const knee = hip.children.find(isJoint)!;
    const ankle = knee.children.find(isJoint)!;
    return { hip, knee, ankle };
  };
  return { left: { ...arm('left'), ...leg('left') }, right: { ...arm('right'), ...leg('right') } };
}

/** A reed mat painted on a canvas: fine stripes with a woven border. */
function reedMat(random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 384;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#c9b57a'; g.fillRect(0, 0, 512, 384);
  for (let y = 0; y < 384; y += 4) {
    g.fillStyle = `hsl(${42 + random() * 8}, ${38 + random() * 14}%, ${52 + random() * 16}%)`;
    g.fillRect(0, y, 512, 3);
  }
  g.strokeStyle = '#8a5a2c'; g.lineWidth = 10; g.strokeRect(10, 10, 492, 364);
  g.strokeStyle = '#a53a2a'; g.lineWidth = 4; g.strokeRect(26, 26, 460, 332);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    holds: choice('What does he hold?', {
      trident: 'A tall iron trident standing beside him, a small hourglass drum tied below its prongs.',
      staff: 'A plain bamboo staff with a scrap of orange cloth tied at the top.',
      beads: 'A string of rudraksha beads passing slowly through his fingers.',
      nothing: 'Nothing: his hands rest open on his knees.',
    }),
    cloth: choice('What colour is his cloth?', {
      saffron: 'Deep saffron, the colour of renunciation.',
      orange: 'Bright marigold orange.',
      ochre: 'Dusty ochre, faded by sun and washing.',
      white: 'Plain white cotton.',
      red: 'Dark red with a yellow border.',
    }),
    skin: choice('How does his skin look?', {
      ash: 'Smeared grey-white with ash from head to foot.',
      dark: 'Dark brown and sun-worn.',
      ochre: 'Warm ochre-brown.',
    }),
    hair: choice('What is his hair like?', {
      matted: 'Long matted locks falling past the shoulders, and a dark beard.',
      topknot: 'Hair coiled into a high bun, clean-shaven.',
      grey: 'Long grey hair and a long grey beard.',
      shaved: 'Shaved close, nothing to catch the wind.',
    }),
    streaks: noul('Are three ash streaks drawn across his forehead?'),
    doing: choice('What is he doing right now?', {
      meditating: 'Meditating: eyes closed, chin level, hands on his knees, utterly still.',
      watching: 'Watching the river and the people pass, chin lifted.',
      blessing: 'One hand raised in blessing toward whoever has stopped.',
      smoking: 'Drawing on a clay chillum pipe, a thread of smoke rising.',
    }),
    bowl: choice('What lies in his begging bowl?', {
      coins: 'A few coins.',
      rice: 'A small heap of rice.',
      petals: 'Marigold petals somebody dropped in.',
      empty: 'Nothing yet this morning.',
    }),
    beside: choice('What sits beside him on the block?', {
      lingam: 'A small black stone lingam on a brass plate, a flower laid on it.',
      pot: 'A brass water pot and a conch shell.',
      fire: 'A small dhuni fire smouldering in a ring of stones.',
      nothing: 'Nothing but the mat and the bowl.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = 1.68;
    const clothColour = { saffron: '#e07a14', orange: '#f26a1b', ochre: '#c48a3c', white: '#ebe3d0', red: '#a8302a' }[a.cloth];
    const skinColour = { ash: '#b8b4aa', dark: '#5b3a26', ochre: '#a56a42' }[a.skin];
    const hairColour = a.hair === 'grey' ? '#9a948a' : '#2e2118';
    const person = figure(s, {
      height: H, build: 'slight', style: 'doll', pose: 'sitting',
      hair: a.hair === 'matted' || a.hair === 'grey' ? 'long' : a.hair === 'topknot' ? 'bun' : 'none',
      hairColor: hairColour, skin: skinColour, top: a.skin === 'ash' ? '#b8b4aa' : skinColour, bottom: clothColour, shoes: skinColour, sleeves: 'short',
      // The kit's neck tilts the other way from its name: 'down' lifts the chin, 'up' lowers it.
      gaze: a.doing === 'watching' ? 'down' : a.doing === 'meditating' ? 'up' : 'ahead',
    });
    s.root.add(person.root);
    const joints = rig(person);

    // Fold the legs into a lotus: thighs out and forward, shins crossing in front.
    for (const side of ['left', 'right'] as const) {
      const sign = side === 'left' ? 1 : -1;
      const { hip, knee, ankle } = joints[side];
      hip.rotation.set(-(side === 'left' ? 78 : 72) * RAD, 0, sign * 52 * RAD);
      knee.rotation.set(0, 0, -sign * 128 * RAD);
      ankle.rotation.set(-60 * RAD, 0, 0);
    }
    // Arms by occupation.
    const arm = (side: 'left' | 'right', forward: number, out: number, bend: number, twist = 0) => {
      const sign = side === 'left' ? 1 : -1;
      joints[side].shoulder.rotation.set(-forward * RAD, 0, sign * out * RAD);
      joints[side].elbow.rotation.set(-bend * RAD, sign * twist * RAD, 0);
    };
    arm('left', 26, 20, 58);
    arm('right', 26, 20, 58);
    if (a.doing === 'blessing') arm('right', 70, 12, 100, -20);
    if (a.doing === 'smoking') arm('right', 60, 6, 135, 30);
    if (a.holds === 'trident' || a.holds === 'staff') arm('right', 34, 30, 48);
    if (a.holds === 'beads') { arm('left', 40, 4, 70, 20); arm('right', 40, 4, 70, -20); }
    person.root.updateMatrixWorld(true);

    // A cloth wrap over the lap hides the joins where the folded legs meet.
    const cloth = s.material(clothColour, { roughness: 0.85 });
    const hips = person.pelvis.getWorldPosition(new THREE.Vector3());
    const lap = s.mesh(new THREE.SphereGeometry(0.5, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), cloth, [hips.x, hips.y - 0.1, hips.z + 0.16]);
    lap.scale.set(0.5, 0.2, 0.5);
    // A sash crossing the chest from one shoulder.
    const sash = s.box([0.07, 0.42, 0.02], [hips.x - 0.02, hips.y + 0.24, hips.z + 0.09], cloth);
    sash.rotation.set(0.1, 0, 0.55);
    const bounds = new THREE.Box3().setFromObject(person.root);
    const seatY = bounds.min.y;

    // Beard, forehead streaks.
    const headWorld = person.head.getWorldPosition(new THREE.Vector3());
    const headR = H * 0.064;
    if (a.hair === 'matted' || a.hair === 'grey') {
      const beard = new THREE.Mesh(new THREE.CapsuleGeometry(headR * 0.5, headR * (a.hair === 'grey' ? 1.5 : 0.8), 3, 8), s.material(hairColour, { roughness: 0.95 }));
      beard.position.set(0, -headR * (a.hair === 'grey' ? 1.2 : 0.95), headR * 0.55);
      beard.scale.set(1.1, 1, 0.6);
      beard.castShadow = true;
      person.head.add(beard);
    }
    if (a.streaks) {
      const chalk = s.material('#f1ede2', { roughness: 1 });
      for (let i = 0; i < 3; i++) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.1, headR * 0.08, headR * 0.06), chalk);
        line.position.set(0, headR * 0.5 + i * headR * 0.16, headR * 0.93);
        person.head.add(line);
      }
    }

    // The mat and the stone block.
    const matW = 1.05, matD = 0.85, matY = seatY - 0.012;
    const mat = s.mesh(new THREE.BoxGeometry(matW, 0.02, matD), new THREE.MeshStandardMaterial({ map: reedMat(random), roughness: 0.9 }), [hips.x, matY, hips.z + 0.05]);
    mat.rotation.y = (random() - 0.5) * 0.06;
    const blockH = 0.3;
    const stone = s.material(new THREE.Color('#b8ab95').lerp(new THREE.Color('#6a6a5e'), mood.wear * 0.6), { roughness: 0.92 });
    s.box([1.5, blockH, 1.15], [hips.x, matY - 0.01 - blockH / 2, hips.z + 0.02], stone);
    const blockTop = matY - 0.01;
    // Grime on the block face where feet and rain reach it.
    if (mood.wear > 0.3) s.box([1.5, blockH * 0.4, 1.152], [hips.x, matY - 0.01 - blockH + blockH * 0.2, hips.z + 0.02], s.material('#4f4c42', { roughness: 1 }));

    const brass = s.material('#c9962e', { metalness: 0.75, roughness: 0.3 });
    const iron = s.material('#3a3836', { metalness: 0.5, roughness: 0.55 });
    const orange = s.material('#f0831a', { emissive: '#8a3a00', emissiveIntensity: 0.25 });
    const yellow = s.material('#f2b21c', { emissive: '#7a4a00', emissiveIntensity: 0.2 });

    // The begging bowl in front of the mat, with whatever has been given.
    const bowlAt: P = [hips.x + 0.08 + (random() - 0.5) * 0.1, blockTop, hips.z + 0.46];
    const bowl = s.lathe([[0, 0], [0.08, 0], [0.11, 0.03], [0.12, 0.06], [0.11, 0.075], [0.1, 0.075], [0.1, 0.07], [0.02, 0.012], [0, 0.012]], brass, bowlAt);
    void bowl;
    if (a.bowl === 'coins') for (let i = 0; i < 5; i++) s.cylinder(0.014, 0.014, 0.003, [bowlAt[0] + (random() - 0.5) * 0.1, bowlAt[1] + 0.016, bowlAt[2] + (random() - 0.5) * 0.1], i % 2 ? brass : s.material('#c7c9cc', { metalness: 0.7, roughness: 0.35 }), 10);
    if (a.bowl === 'rice') s.ball([0.07, 0.035, 0.07], [bowlAt[0], bowlAt[1] + 0.02, bowlAt[2]], s.material('#f1ead8', { roughness: 1 }), 12);
    if (a.bowl === 'petals') s.scatter(new THREE.SphereGeometry(1, 6, 4), orange, Array.from({ length: 9 }, () => ({ at: [bowlAt[0] + (random() - 0.5) * 0.12, bowlAt[1] + 0.025, bowlAt[2] + (random() - 0.5) * 0.12] as P, size: 0.012 + random() * 0.008 })));
    // Marigolds dropped on the mat, more when the mood is kind.
    const flowers = Math.round(2 + mood.cheer * 7);
    s.scatter(new THREE.SphereGeometry(1, 7, 5), orange, Array.from({ length: flowers }, (_u, i) => ({ at: [hips.x + (random() - 0.5) * 0.9, matY + 0.025, hips.z + 0.25 + random() * 0.22] as P, size: 0.02 + random() * 0.012, color: i % 3 ? '#f0831a' : '#f2b21c' })));

    // What he holds.
    const right = person.hands.right.getWorldPosition(new THREE.Vector3());
    const left = person.hands.left.getWorldPosition(new THREE.Vector3());
    let drum: THREE.Object3D | null = null;
    if (a.holds === 'trident' || a.holds === 'staff') {
      const top = blockTop + (a.holds === 'trident' ? 2.25 : 1.9);
      const shaft = a.holds === 'trident' ? iron : s.material('#b9a06a', { roughness: 0.7 });
      s.rod([right.x + 0.03, blockTop, right.z], [right.x + 0.03, top, right.z], 0.014, shaft);
      if (a.holds === 'trident') {
        const base = top - 0.02;
        s.rod([right.x + 0.03, base - 0.05, right.z], [right.x + 0.03, base + 0.34, right.z], 0.011, iron, 0.004);
        for (const side of [-1, 1]) s.tube([[right.x + 0.03, base - 0.06, right.z], [right.x + 0.03 + side * 0.07, base + 0.03, right.z], [right.x + 0.03 + side * 0.1, base + 0.14, right.z], [right.x + 0.03 + side * 0.085, base + 0.27, right.z]], 0.009, iron);
        s.cylinder(0.03, 0.03, 0.02, [right.x + 0.03, base - 0.08, right.z], brass, 12);
        // The damaru tied below the prongs: two small cones meeting at the waist.
        drum = new THREE.Group();
        const skin = s.material('#8a6a44', { roughness: 0.8 });
        for (const side of [-1, 1]) {
          const half = new THREE.Mesh(new THREE.CylinderGeometry(side < 0 ? 0.045 : 0.012, side < 0 ? 0.012 : 0.045, 0.045, 12), skin);
          half.position.y = side * 0.0225;
          half.castShadow = true;
          drum.add(half);
        }
        drum.position.set(right.x + 0.03 + 0.07, base - 0.2, right.z + 0.01);
        drum.rotation.z = 0.35;
        s.root.add(drum);
        s.rod([right.x + 0.03, base - 0.12, right.z], [right.x + 0.03 + 0.07, base - 0.16, right.z + 0.01], 0.004, s.material('#c8c2b0'));
      } else {
        const rag = s.box([0.05, 0.16, 0.02], [right.x + 0.03 + 0.03, top - 0.12, right.z], s.material('#e8641a'));
        rag.rotation.z = -0.3;
      }
    }
    if (a.holds === 'beads') {
      const beads = s.mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 28), s.material('#5a3a24', { roughness: 0.6 }), [(right.x + left.x) / 2, (right.y + left.y) / 2 - 0.02, (right.z + left.z) / 2 + 0.02]);
      beads.rotation.x = Math.PI / 2 + 0.3;
    }
    if (a.doing === 'smoking') {
      s.cylinder(0.014, 0.022, 0.1, [right.x, right.y + 0.03, right.z + 0.03], s.material('#8d5b3b', { roughness: 0.9 }), 10).rotation.x = 0.4;
    }
    const smokes: { mesh: THREE.Mesh; size: number }[] = [];
    const puff = (x: number, y: number, z: number, size: number) => {
      const mesh = s.ball([size, size, size], [x, y, z], new THREE.MeshStandardMaterial({ color: '#d9d6cf', transparent: true, opacity: 0.35, depthWrite: false }), 8);
      mesh.castShadow = false;
      smokes.push({ mesh, size });
    };
    if (a.doing === 'smoking') for (let i = 0; i < 4; i++) puff(right.x + 0.02, right.y + 0.14 + i * 0.1, right.z + 0.04, 0.025 + i * 0.012);

    // Beside him on the block.
    const sideX = hips.x - 0.5, sideZ = hips.z + 0.3;
    if (a.beside === 'lingam') {
      s.cylinder(0.12, 0.13, 0.015, [sideX, blockTop + 0.0075, sideZ], brass, 20);
      s.cylinder(0.05, 0.05, 0.12, [sideX, blockTop + 0.075, sideZ], s.material('#1c1b1a', { roughness: 0.35 }), 14);
      s.ball([0.05, 0.03, 0.05], [sideX, blockTop + 0.135, sideZ], s.material('#1c1b1a', { roughness: 0.35 }), 10);
      s.ball([0.025, 0.02, 0.025], [sideX + 0.02, blockTop + 0.16, sideZ + 0.02], yellow, 8);
    }
    if (a.beside === 'pot') {
      s.lathe([[0, 0], [0.07, 0], [0.095, 0.05], [0.09, 0.11], [0.055, 0.14], [0.065, 0.17], [0.075, 0.185], [0.06, 0.185], [0.05, 0.17], [0.045, 0.14], [0, 0.14]], brass, [sideX, blockTop, sideZ]);
      const conch = s.ball([0.09, 0.05, 0.055], [sideX + 0.22, blockTop + 0.045, sideZ + 0.05], s.material('#efe8dc', { roughness: 0.5 }), 12);
      conch.rotation.y = 0.6;
      s.cylinder(0.005, 0.03, 0.08, [sideX + 0.3, blockTop + 0.035, sideZ + 0.08], s.material('#efe8dc', { roughness: 0.5 }), 8).rotation.z = Math.PI / 2 - 0.5;
    }
    if (a.beside === 'fire') {
      const ember = new THREE.MeshStandardMaterial({ color: '#2a1a12', emissive: '#ff5a10', emissiveIntensity: mix(0.4, 1.6, mood.energy), roughness: 1 });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#6d6558', { roughness: 1 }), Array.from({ length: 9 }, (_u, i) => { const t = (i / 9) * Math.PI * 2; return { at: [sideX + Math.cos(t) * 0.14, blockTop + 0.03, sideZ + Math.sin(t) * 0.14] as P, size: 0.035 + random() * 0.015 }; }));
      s.scatter(new THREE.DodecahedronGeometry(1, 0), ember, Array.from({ length: 6 }, () => ({ at: [sideX + (random() - 0.5) * 0.12, blockTop + 0.025, sideZ + (random() - 0.5) * 0.12] as P, size: 0.03 })));
      s.rod([sideX - 0.1, blockTop + 0.03, sideZ + 0.05], [sideX + 0.12, blockTop + 0.06, sideZ - 0.06], 0.012, s.material('#3b2a1c'));
      for (let i = 0; i < 4; i++) puff(sideX, blockTop + 0.12 + i * 0.12, sideZ, 0.04 + i * 0.02);
    }

    const energy = mood.energy;
    const phase = random() * 6.28;
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        if (drum) drum.rotation.y = Math.sin(time * 1.3 + phase) * 0.6 * energy;
        for (const [i, { mesh, size }] of smokes.entries()) {
          mesh.position.x += Math.sin(time * 0.8 + i) * 0.0006 * (0.3 + energy);
          mesh.scale.setScalar(size * (1 + Math.sin(time * 1.1 + i * 0.7) * 0.08));
        }
      },
    });
  },
});
