import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, score } from '@conjure/kit';
import { HAIR_COLOURS, type P, SCHOOL_COLOURS, at, paint, pick, pickSkin, rig, segmentOf } from './pose';

const ROPE = {
  red: 'Plain red plastic rope.',
  blue: 'Bright blue plastic rope.',
  yellow: 'Yellow rope with wooden handles.',
  beaded: 'A beaded rope, segments of pink, white and purple.',
  string: 'A length of washing line with knots for handles.',
} as const;
const ROPE_COLOUR: Record<keyof typeof ROPE, string> = { red: '#c8322a', blue: '#2a63c8', yellow: '#e8c22a', beaded: '#d05aa0', string: '#e5dfcf' };

export default defineThing({
  questions: {
    rope: choice('Where is the rope in its swing?', {
      overhead: 'Arcing high over her head, the instant before the jump.',
      front: 'Coming down in front of her at knee height, about to be jumped.',
      underfoot: 'Flat along the ground, passing under the lifted heel.',
      behind: 'Rising behind her heels on its way back up.',
    }),
    colour: choice('What is the rope like?', ROPE),
    hair: choice('How is her hair done?', {
      plaits: 'Two long plaits swinging out from the sides of her head.',
      ponytail: 'A high ponytail flying up with the jump.',
      bunches: 'Two bunches with bobbles, one higher than the other.',
      bob: 'A short bob with a hair clip.',
      cropped: 'Cropped short.',
    }),
    outfit: choice('What is she wearing?', {
      cardigan: 'A school cardigan over a polo shirt, with a pleated grey skirt and white socks.',
      dress: 'A gingham summer dress, bare arms, sandals.',
      pe: 'PE kit: a white T-shirt, shorts and plimsolls.',
      tracksuit: 'A zipped tracksuit top and joggers, trainers.',
    }),
    school: choice('What is the school colour?', {
      navy: 'Navy blue.', maroon: 'Maroon.', green: 'Bottle green.', grey: 'Grey.', red: 'Bright red.', royal: 'Royal blue.',
    }),
    gaze: choice('Where is she looking?', {
      ahead: 'Grinning straight ahead, chin up, loving it.',
      feet: 'Down at her feet, counting under her breath.',
      rope: 'Up at the rope coming over, not quite trusting it.',
      friend: 'Off to one side at a friend, showing off.',
    }),
    age: score('How old is she?', ['Five, still learning', 'Seven', 'Nine', 'Eleven and tall']),
    ground: choice('What is on the ground beside her?', {
      nothing: 'Nothing: clear ground.',
      chalk: 'A chalk tally of skips scratched on the ground.',
      cardigan: 'Her cardigan dropped in a heap.',
      bag: 'Her school bag and a water bottle.',
      spare: 'A second rope coiled up, waiting for a friend.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.05, 1.42, a.age);
    const skin = pickSkin(random);
    const hairColour = pick(random, HAIR_COLOURS);
    const school = SCHOOL_COLOURS[a.school];
    const white = '#f2f0ea';
    const dressColour = pick(random, ['#d8503a', '#2a6ac8', '#3a9a5a', '#d8a02a', '#9a4ac8']);

    const outfit = {
      cardigan: { top: school, bottom: '#8a8d93', shoes: '#1d1a18', sleeves: 'long' as const },
      dress: { top: dressColour, bottom: dressColour, shoes: '#8a5a3a', sleeves: 'short' as const },
      pe: { top: white, bottom: school, shoes: '#1d1a18', sleeves: 'short' as const },
      tracksuit: { top: school, bottom: school, shoes: '#e8e6e0', sleeves: 'long' as const },
    }[a.outfit];
    const person = figure(s, {
      height: H, build: a.age < 0.3 ? 'slight' : 'average', style: 'doll', skin,
      hair: 'short', hairColor: hairColour,
      pose: 'standing', gaze: 'ahead', ...outfit,
    });
    s.root.add(person.root);
    const pose = rig(person);
    // Both hands out at hip height on the handles; one foot planted, the other heel just lifted.
    const lifted = random() < 0.5 ? 'left' : 'right';
    const planted = lifted === 'left' ? 'right' : 'left';
    for (const side of ['left', 'right'] as const) pose.arm(side, { forward: -5, out: 10, bend: 52, across: -62 });
    pose.leg(planted, { forward: 2, out: 3, knee: 10, foot: 'flat' });
    pose.leg(lifted, { forward: 14, out: 4, knee: 34, foot: -(34 - 14) + 24 });
    pose.lean(4, 0);
    pose.bow(3);
    const look = { ahead: [-6, 0], feet: [34, 0], rope: [-30, 0], friend: [4, 48] }[a.gaze];
    pose.look(look[0], look[1]);
    person.settle();

    // ---- clothes beyond the figure's own colours
    const skinMat = s.material(skin, { roughness: 0.45 });
    const hip = at(s, person.pelvis);
    if (a.outfit === 'cardigan' || a.outfit === 'dress') {
      // A skirt: a pleated cone from the hips to above the knee; the dress carries the gingham.
      const length = a.outfit === 'dress' ? 0.3 * H : 0.22 * H;
      let skirtMat: THREE.Material;
      if (a.outfit === 'dress') {
        const gingham = paint(128, 128, (c) => {
          c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, 128, 128);
          c.fillStyle = dressColour; c.globalAlpha = 0.55;
          for (let i = 0; i < 8; i++) { c.fillRect(i * 16, 0, 8, 128); c.fillRect(0, i * 16, 128, 8); }
          c.globalAlpha = 1;
        });
        gingham.wrapS = gingham.wrapT = THREE.RepeatWrapping;
        gingham.repeat.set(3, 3);
        skirtMat = new THREE.MeshStandardMaterial({ map: gingham, roughness: 0.85, side: THREE.DoubleSide });
        const torso = segmentOf(person.joints.spine);
        if (torso) torso.material = new THREE.MeshStandardMaterial({ map: gingham, roughness: 0.85 });
      } else {
        skirtMat = s.material('#5a5d63', { roughness: 0.9, side: THREE.DoubleSide, flatShading: true });
      }
      const skirt = s.mesh(new THREE.CylinderGeometry(0.075 * H, 0.16 * H, length, 18, 1, true), skirtMat, [hip.x, hip.y + 0.02 * H - length / 2, hip.z]);
      skirt.rotation.y = random() * 0.3;
      // White socks: the shins.
      for (const side of ['left', 'right'] as const) { const shin = segmentOf(person.joints.knees[side]); if (shin) shin.material = s.material(a.outfit === 'dress' ? skin : white, { roughness: 0.6 }); }
      if (a.outfit === 'cardigan') {
        // Polo collar and a row of buttons.
        const neck = at(s, person.joints.neck);
        s.ring(0.045 * H, 0.012 * H, [neck.x, neck.y + 0.005 * H, neck.z], s.material(white, { roughness: 0.8 })).rotation.x = Math.PI / 2;
        for (let i = 0; i < 4; i++) s.ball([0.009 * H, 0.009 * H, 0.005 * H], [neck.x, neck.y - 0.05 * H - i * 0.045 * H, neck.z + 0.067 * H], s.material('#e8e2cc', { roughness: 0.5 }), 6);
      }
    }
    if (a.outfit === 'pe') {
      // Shorts: thighs in the school colour, shins bare.
      for (const side of ['left', 'right'] as const) { const shin = segmentOf(person.joints.knees[side]); if (shin) shin.material = skinMat; }
    }
    if (a.outfit === 'tracksuit') {
      // A white stripe down each sleeve and a zip.
      const stripe = s.material(white, { roughness: 0.7 });
      for (const side of ['left', 'right'] as const) {
        const upper = segmentOf(person.joints.shoulders[side]);
        if (upper) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.012 * H, 0.15 * H, 0.01 * H), stripe); band.position.set((side === 'left' ? 1 : -1) * 0.038 * H, -0.085 * H, 0); upper.parent!.add(band); }
      }
      const neck = at(s, person.joints.neck);
      s.box([0.008 * H, 0.2 * H, 0.004 * H], [neck.x, neck.y - 0.13 * H, neck.z + 0.067 * H], s.material('#c9c9c9', { metalness: 0.6, roughness: 0.4 }));
    }

    // ---- hair beyond the cap: plaits, ponytail, bunches, clip
    const hairMat = s.material(hairColour, { roughness: 0.8 });
    const headR = H * 0.064;
    const swinging: THREE.Object3D[] = [];
    /** A lock of hair hung from a point on the head to another, pivoting at the first so it can swing. */
    const hang = (from: P, to: P, radius: number) => {
      const reach = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, reach.length(), 3, 8), hairMat);
      const pivot = new THREE.Group();
      pivot.position.set(...from);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), reach.clone().normalize());
      mesh.position.copy(reach).multiplyScalar(0.5);
      mesh.castShadow = true;
      pivot.add(mesh);
      person.head.add(pivot);
      swinging.push(pivot);
      return { pivot, reach };
    };
    if (a.hair === 'plaits') {
      for (const side of [-1, 1]) {
        const { pivot, reach } = hang([side * headR * 0.95, headR * 0.1, -headR * 0.3], [side * headR * 1.6, -headR * 1.9, -headR * 0.5], headR * 0.2);
        const bobble = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.16, 8, 6), s.material(pick(random, ['#e83a6a', '#3a8ae8', '#f2c21c']), { roughness: 0.5 }));
        bobble.position.copy(reach);
        pivot.add(bobble);
      }
    }
    if (a.hair === 'ponytail') {
      const { pivot, reach } = hang([0, headR * 0.65, -headR * 0.8], [0, -headR * 0.5, -headR * 2.1], headR * 0.28);
      const band = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.3, headR * 0.06, 6, 12), s.material('#e83a6a', { roughness: 0.5 }));
      band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), reach.clone().normalize());
      band.position.copy(reach).multiplyScalar(0.12);
      pivot.add(band);
    }
    if (a.hair === 'bunches') {
      for (const side of [-1, 1]) {
        const lift = side > 0 ? 0.2 : 0;
        const { pivot } = hang([side * headR * 1.0, headR * (0.45 + lift), -headR * 0.2], [side * headR * 1.5, headR * (0.1 + lift) - headR * 1.1, -headR * 0.4], headR * 0.3);
        const bobble = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.14, 8, 6), s.material(pick(random, ['#e83a6a', '#3a8ae8', '#f2c21c', '#ffffff']), { roughness: 0.5 }));
        pivot.add(bobble);
      }
    }
    if (a.hair === 'bob') {
      // A bob: a shell round the back and sides of the head down to the jaw, the face left open.
      const shell = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.13, 18, 10, Math.PI * 0.88, Math.PI * 1.24, 0, Math.PI * 0.7), hairMat);
      shell.position.set(0, headR * 0.05, -headR * 0.06);
      shell.scale.y = 1.08;
      shell.castShadow = true;
      person.head.add(shell);
      const clip = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.5, headR * 0.1, headR * 0.12), s.material(pick(random, ['#e83a6a', '#f2c21c', '#3a8ae8']), { roughness: 0.4 }));
      clip.position.set(headR * 0.75, headR * 0.7, headR * 0.4);
      clip.rotation.z = -0.6;
      person.head.add(clip);
    }

    // ---- the rope: handles in the hands, a tube arcing between them about the hands' axis
    const ropeMat = s.material(ROPE_COLOUR[a.colour], { roughness: a.colour === 'string' ? 0.95 : 0.5 });
    const handleMat = s.material(a.colour === 'yellow' ? '#b8864a' : a.colour === 'string' ? '#e5dfcf' : a.colour === 'beaded' ? '#f2f2f2' : ROPE_COLOUR[a.colour], { roughness: 0.6 });
    const tips: THREE.Object3D[] = [];
    for (const side of ['left', 'right'] as const) {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014 * H, 0.011 * H, 0.1 * H, 10), handleMat);
      handle.position.y = -0.015 * H;
      handle.castShadow = true;
      person.hands[side].add(handle);
      const tip = new THREE.Object3D();
      tip.position.y = -0.065 * H;
      person.hands[side].add(tip);
      tips.push(tip);
    }
    const A = at(s, tips[1]), B = at(s, tips[0]);
    const M = A.clone().add(B).multiplyScalar(0.5);
    const u = B.clone().sub(A).normalize();
    const w = A.distanceTo(B) / 2;
    const R = M.y - 0.015;
    const phi = { overhead: -8, front: 125, underfoot: 182, behind: 240 }[a.rope] * Math.PI / 180;
    const d = new THREE.Vector3(0, Math.cos(phi), Math.sin(phi));
    const points: P[] = [];
    const steps = 26;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI;
      const p = u.clone().multiplyScalar(-w * Math.cos(t)).addScaledVector(d, R * Math.sin(t) * (1 - 0.06 * Math.sin(t)));
      points.push([p.x, p.y, p.z]);
    }
    const ropeGroup = new THREE.Group();
    ropeGroup.position.copy(M);
    s.root.add(ropeGroup);
    const radius = a.colour === 'string' ? 0.006 : a.colour === 'beaded' ? 0.012 : 0.0085;
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 7), ropeMat);
    rope.castShadow = true;
    ropeGroup.add(rope);
    if (a.colour === 'beaded') {
      const beads = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.013, 0.013, 0.03, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }), 40);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < 40; i++) {
        const t = (i + 0.5) / 40;
        const p = curve.getPointAt(t), tangent = curve.getTangentAt(t);
        q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        m.compose(p, q, new THREE.Vector3(1, 1, 1));
        beads.setMatrixAt(i, m);
        beads.setColorAt(i, new THREE.Color(['#e85aa0', '#ffffff', '#8a4ad8'][i % 3]));
      }
      beads.instanceMatrix.needsUpdate = true;
      beads.castShadow = true;
      ropeGroup.add(beads);
    }

    // ---- what lies on the ground beside her
    const side = random() < 0.5 ? -1 : 1;
    const gx = side * 0.5 * H, gz = 0.12 * H;
    if (a.ground === 'chalk') {
      const tally = paint(256, 128, (c) => {
        c.clearRect(0, 0, 256, 128);
        const groups = 3 + Math.floor(random() * 4);
        const strokes: [number, number, number, number][] = [];
        for (let g = 0; g < groups; g++) for (let i = 0; i < 5; i++) {
          const x = 20 + g * 60 + i * 9, jitter = (random() - 0.5) * 6;
          strokes.push(i < 4 ? [x, 30 + jitter, x + 2, 95 + jitter] : [x - 40, 40, x - 2, 90]);
        }
        // A soft dark halo under the chalk so it reads on pale ground as well as tarmac.
        for (const [width, colour] of [[11, 'rgba(60,55,50,0.35)'], [6, 'rgba(245,240,230,0.95)']] as const) {
          c.strokeStyle = colour; c.lineWidth = width; c.lineCap = 'round';
          for (const [x0, y0, x1, y1] of strokes) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
        }
      });
      const mark = s.mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshStandardMaterial({ map: tally, transparent: true, roughness: 1, depthWrite: false }), [gx, 0.004, gz + 0.2]);
      mark.rotation.x = -Math.PI / 2;
      mark.rotation.z = (random() - 0.5) * 0.6;
      mark.castShadow = false;
    }
    if (a.ground === 'cardigan') {
      const wool = s.material(school, { roughness: 0.95 });
      s.ball([0.19, 0.06, 0.15], [gx, 0.055, gz], wool, 12);
      s.ball([0.1, 0.045, 0.12], [gx + 0.12, 0.04, gz + 0.08], wool, 10);
      s.ball([0.08, 0.035, 0.1], [gx - 0.13, 0.03, gz - 0.05], wool, 10);
    }
    if (a.ground === 'bag') {
      const bag = s.material(pick(random, ['#d83a7a', '#2a63c8', '#3a9a5a', '#2a2a2e']), { roughness: 0.8 });
      const pack = s.box([0.26, 0.3, 0.14], [gx, 0.15, gz], bag);
      pack.rotation.z = 0.12; pack.rotation.y = 0.5;
      s.box([0.16, 0.14, 0.06], [gx + 0.02, 0.09, gz + 0.1], s.material('#1d1a18', { roughness: 0.8 })).rotation.y = 0.5;
      s.cylinder(0.034, 0.034, 0.2, [gx + 0.24, 0.1, gz - 0.02], s.material('#4aa0e8', { roughness: 0.3, metalness: 0.2 }), 12);
      s.cylinder(0.02, 0.02, 0.03, [gx + 0.24, 0.215, gz - 0.02], s.material('#ffffff', { roughness: 0.5 }), 10);
    }
    if (a.ground === 'spare') {
      const coil = s.ring(0.13, 0.01, [gx, 0.012, gz], s.material(pick(random, ['#2a63c8', '#c8322a', '#3a9a5a']), { roughness: 0.5 }));
      coil.rotation.x = Math.PI / 2;
      coil.scale.z = 0.7;
      s.ring(0.11, 0.009, [gx + 0.03, 0.028, gz + 0.02], coil.material).rotation.x = Math.PI / 2;
      for (const dx of [-0.08, 0.1]) s.cylinder(0.014, 0.011, 0.1, [gx + dx, 0.015, gz + 0.17], handleMat, 10).rotation.z = Math.PI / 2;
    }

    // ---- motion: the rope rocks about the hands' axis, the hair swings, the body bobs with the beat
    const rate = mix(2.5, 7, mood.energy);
    const swing = mix(0.1, 0.45, mood.energy);
    const phase = random() * Math.PI * 2;
    const baseY = person.root.position.y;
    const hairBase = swinging.map((p) => p.rotation.z);
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        ropeGroup.quaternion.setFromAxisAngle(u, Math.sin(time * rate + phase) * swing);
        person.root.position.y = baseY + Math.max(0, Math.sin(time * rate + phase)) * 0.012 * mood.energy;
        swinging.forEach((p, i) => { p.rotation.z = hairBase[i] + Math.sin(time * rate + phase + i) * 0.18 * (0.3 + mood.energy); });
      },
    });
  },
});
