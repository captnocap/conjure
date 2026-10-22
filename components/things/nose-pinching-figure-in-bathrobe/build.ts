import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
type P = [number, number, number];
const canvasTexture = (size: number, draw: (ctx: Ctx, w: number, h: number) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
};

const ROBES = {
  pink: { description: 'Fluffy pink terrycloth, a little bobbled.', base: '#e48aa6', trim: '#f2b8c8', belt: '#e48aa6', roughness: 1 },
  hotel: { description: 'A white waffle hotel robe, pocketed from somewhere nicer.', base: '#f1eee6', trim: '#ffffff', belt: '#f1eee6', roughness: 0.95 },
  tartan: { description: 'Red tartan flannel, a dad robe.', base: '#a8262a', trim: '#1e2a22', belt: '#1e2a22', roughness: 0.9 },
  silk: { description: 'A burgundy paisley silk robe with black satin lapels, the full bachelor.', base: '#5c1a2c', trim: '#141216', belt: '#141216', roughness: 0.35 },
  velour: { description: 'Avocado green 1970s velour.', base: '#76862a', trim: '#8e9e3a', belt: '#5e6c1e', roughness: 0.6 },
  striped: { description: 'Blue and white striped towelling, like a beach hut.', base: '#3a64ae', trim: '#f2f0ea', belt: '#f2f0ea', roughness: 0.95 },
} as const;

export default defineThing({
  questions: {
    robe: choice('What kind of bathrobe?', Object.fromEntries(Object.entries(ROBES).map(([key, value]) => [key, value.description])) as Record<keyof typeof ROBES, string>),
    who: choice('Who is it?', {
      dad: 'A stocky middle-aged man, bare hairy shins.',
      mum: 'A woman of about forty.',
      grandad: 'A thin old man, a little stooped, grey hair.',
      teen: 'A gangly teenager.',
      kid: 'A small child in a robe that is too big.',
    }),
    head: choice('What is on their head?', {
      turban: 'A towel wrapped up in a tall turban, fresh from the shower.',
      curlers: 'Hair in plastic rollers.',
      bedhead: 'Wild bed hair sticking up everywhere.',
      showercap: 'A puffy frilled shower cap.',
      bald: 'Bald, with a fringe of hair round the back.',
    }),
    reaction: choice('How are they taking it?', {
      recoil: 'Recoiling: leaning back hard, one foot stepping away, head turned right round.',
      striding: 'Walking out of the room mid-stride, not looking back.',
      gagging: 'Doubled over and gagging, knees bent.',
      stoic: 'Standing bolt upright, chin up, enduring it with dignity.',
    }),
    fanning: choice('Which hand does the fanning?', {
      left: 'Fanning with the left hand, pinching with the right.',
      right: 'Fanning with the right hand, pinching with the left.',
    }),
    holding: choice('What is the fanning hand holding?', {
      hand: 'Nothing: a frantically flapping open hand.',
      spray: 'A can of air freshener, spraying a mist.',
      magazine: 'A rolled-open magazine, flapped like a fan.',
      towel: 'A hand towel, whirled about.',
    }),
    slippers: choice('What is on their feet?', {
      fluffy: 'Fluffy pompom slippers.',
      bunny: 'Bunny slippers with floppy ears.',
      mules: 'Flat backless towelling mules.',
      bare: 'Bare feet.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const robe = ROBES[a.robe];

    // ---- Who: size, build and colouring.
    const people = {
      dad: { H: 1.8, build: 'heavy', hair: ['#3a2a1e', '#5a4a3a', '#8a8580'] },
      mum: { H: 1.66, build: 'average', hair: ['#3a2418', '#7a4a22', '#c89a52', '#1e1a18'] },
      grandad: { H: 1.7, build: 'slight', hair: ['#d8d6d0', '#b8b6b0', '#efeeea'] },
      teen: { H: 1.74, build: 'slight', hair: ['#2a1e16', '#5a3a1e', '#1a1a1a', '#b88a4a'] },
      kid: { H: 1.2, build: 'average', hair: ['#5a3a1e', '#c8a050', '#2a1e16'] },
    } as const;
    const who = people[a.who];
    const H = who.H * rnd(0.97, 1.03);
    const wide = { slight: 0.85, average: 1, heavy: 1.3 }[who.build];
    const skin = ['#e8c0a0', '#d9a882', '#b5805a', '#8a5a3a', '#f0d0b4'][Math.floor(random() * 5)];
    const hairColour = who.hair[Math.floor(random() * who.hair.length)];
    const slipperColour = ['#f2e8ee', '#f0b8cc', '#a8c8e8', '#e8d8a8', '#c8c0b8'][Math.floor(random() * 5)];
    const fanSide = a.fanning === 'left' ? 1 : -1, pinchSide = -fanSide;
    const F = a.fanning, Pn = a.fanning === 'left' ? 'right' : 'left';

    const person = figure(s, {
      height: H, build: who.build, style: 'doll', pose: 'standing',
      hair: a.head === 'bald' || a.head === 'turban' || a.head === 'showercap' ? 'none' : 'short',
      hairColor: hairColour, skin, top: robe.base, bottom: skin, shoes: a.slippers === 'bare' ? skin : slipperColour, sleeves: 'long',
    });
    s.root.add(person.root);
    const { joints } = person;

    // ---- The robe fabric: painted per kind and laid over the figure's torso and sleeves.
    const pattern = canvasTexture(256, (ctx, w, h) => {
      ctx.fillStyle = robe.base; ctx.fillRect(0, 0, w, h);
      if (a.robe === 'pink' || a.robe === 'hotel' || a.robe === 'velour') {
        // Terry loops or waffle: a fine speckle and, for the hotel robe, a grid.
        for (let i = 0; i < 2600; i++) {
          ctx.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.1)';
          ctx.fillRect(random() * w, random() * h, 2, 2);
        }
        if (a.robe === 'hotel') {
          ctx.strokeStyle = 'rgba(120,110,90,0.28)'; ctx.lineWidth = 2;
          for (let i = 0; i < w; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }
        }
      } else if (a.robe === 'tartan') {
        for (const [colour, width, step, offset] of [['rgba(20,40,30,0.55)', 26, 64, 0], ['rgba(20,20,20,0.45)', 8, 64, 34], ['rgba(230,200,90,0.5)', 3, 64, 48]] as const) {
          ctx.fillStyle = colour;
          for (let i = offset; i < w; i += step) { ctx.fillRect(i, 0, width, h); ctx.fillRect(0, i, w, width); }
        }
      } else if (a.robe === 'silk') {
        for (let i = 0; i < 40; i++) {
          const x = random() * w, y = random() * h, r = 6 + random() * 8, turn = random() * 6.28;
          ctx.save(); ctx.translate(x, y); ctx.rotate(turn);
          ctx.fillStyle = 'rgba(214,170,80,0.65)';
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(-r * 0.4, r * 2.6, r * 0.9, r * 2.2); ctx.quadraticCurveTo(r * 0.2, r * 1.2, r, 0); ctx.fill();
          ctx.fillStyle = 'rgba(40,10,20,0.8)'; ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      } else {
        ctx.fillStyle = '#f2f0ea';
        for (let i = 0; i < w; i += 40) ctx.fillRect(i, 0, 18, h);
      }
    });
    pattern.repeat.set(2, 2);
    const fabric = s.material('#ffffff', { map: pattern, roughness: robe.roughness, side: THREE.DoubleSide });
    const trim = s.material(robe.trim, { roughness: robe.roughness });
    const belt = s.material(robe.belt, { map: a.robe === 'pink' || a.robe === 'hotel' ? pattern : null, roughness: robe.roughness });
    const skinPaint = s.material(skin, { roughness: 0.6 });
    const torsoMesh = joints.spine.children.find((child) => (child as THREE.Mesh).isMesh) as THREE.Mesh;
    const topPaint = torsoMesh.material;
    person.root.traverse((node) => { const mesh = node as THREE.Mesh; if (mesh.isMesh && mesh.material === topPaint) mesh.material = fabric; });

    // Figure proportions, as figure() builds them.
    const headR = H * 0.064, limb = H * 0.036 * wide, torsoL = H * 0.28, pelvisL = H * 0.07, thighL = H * 0.24, shinL = H * 0.23, footL = H * 0.03;
    const shoulderW = H * 0.115 * wide, chestZ = limb * 1.35 * (who.build === 'heavy' ? 1.25 : 1);
    const attach = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P, scale: P = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at); mesh.scale.set(...scale);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const sphere = new THREE.SphereGeometry(1, 18, 12);

    // ---- The skirt of the robe hangs from the waist to the calf, wrapped and belted.
    const long = a.robe === 'silk' || a.who === 'kid' ? 0.7 : 0.35;
    const waistY = pelvisL * 0.5 + torsoL * 0.12, hemY = -(thighL + shinL * long);
    const ax = shoulderW * 0.94, az = chestZ * 1.12;
    const profile: [number, number][] = [[1.42, hemY], [1.4, hemY + H * 0.012], [1.22, -thighL * 0.25], [1.12, 0], [1.0, waistY]];
    const skirt = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 40);
    const skirtMesh = attach(joints.pelvis, skirt, fabric, [0, 0, 0], [ax, 1, az]);
    void skirtMesh;
    const radiusAt = (y: number) => {
      for (let i = 0; i < profile.length - 1; i++) {
        const [r0, y0] = profile[i], [r1, y1] = profile[i + 1];
        if (y >= y0 && y <= y1) return mix(r0, r1, (y - y0) / (y1 - y0));
      }
      return 1;
    };
    // The wrap edge down the front, the belt and its knot with two tails.
    const edgeAngle = -fanSide * 0.28;
    const edge: THREE.Vector3[] = [];
    for (let i = 0; i <= 8; i++) {
      const y = mix(waistY, hemY + H * 0.01, i / 8), r = radiusAt(y) * 1.012;
      edge.push(new THREE.Vector3(Math.sin(edgeAngle) * r * ax, y, Math.cos(edgeAngle) * r * az));
    }
    attach(joints.pelvis, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 16, H * 0.007, 6), trim, [0, 0, 0]);
    const beltY = pelvisL * 0.5;
    const beltGeometry = new THREE.LatheGeometry([[1.02, beltY - H * 0.014], [1.06, beltY], [1.02, beltY + H * 0.014]].map(([r, y]) => new THREE.Vector2(r, y)), 40);
    attach(joints.pelvis, beltGeometry, belt, [0, 0, 0], [ax * 1.02, 1, az * 1.02]);
    const knotAngle = -fanSide * 0.55, kr = radiusAt(beltY) * 1.08;
    const knot: P = [Math.sin(knotAngle) * kr * ax, beltY, Math.cos(knotAngle) * kr * az];
    attach(joints.pelvis, sphere, belt, knot, [H * 0.018, H * 0.015, H * 0.012]);
    const tails: THREE.Mesh[] = [];
    for (const [dx, len] of [[-0.01, 0.16], [0.012, 0.13]] as const) {
      const tail = attach(joints.pelvis, new THREE.BoxGeometry(H * 0.022, H * len, H * 0.006), belt, [knot[0] + dx * H, beltY - H * len / 2, knot[2] + H * 0.006]);
      tail.rotation.z = dx * 6;
      tails.push(tail);
    }

    // ---- Shawl collar and the V of chest, on the spine so they bend with the torso.
    const chestFront = (x: number) => chestZ * Math.sqrt(Math.max(0.05, 1 - (x / shoulderW) ** 2));
    attach(joints.spine, sphere, skinPaint, [0, torsoL * 0.8, chestFront(0) - H * 0.006], [H * 0.032, H * 0.06, H * 0.012]);
    for (const side of [-1, 1]) {
      const points = [
        new THREE.Vector3(0, torsoL * 1.0, -chestZ * 0.8),
        new THREE.Vector3(side * shoulderW * 0.42, torsoL * 1.0, -chestZ * 0.1),
        new THREE.Vector3(side * shoulderW * 0.36, torsoL * 0.86, chestFront(shoulderW * 0.36) * 1.02),
        new THREE.Vector3(side * shoulderW * 0.16, torsoL * 0.55, chestFront(shoulderW * 0.16) * 1.06),
        new THREE.Vector3(-side * shoulderW * 0.04, torsoL * 0.2, chestFront(0) * 1.06),
      ];
      attach(joints.spine, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, H * 0.017, 8), trim, [0, 0, 0]);
    }
    // Sleeve cuffs, rolled back.
    for (const side of ['left', 'right'] as const) {
      const wrist = person.hands[side].parent!;
      attach(wrist, new THREE.TorusGeometry(limb * 1.05, limb * 0.32, 8, 20), trim, [0, H * 0.004, 0]).rotation.x = Math.PI / 2;
    }

    // ---- The head: a nose to pinch, and what is on top.
    const head = person.head;
    attach(head, sphere, skinPaint, [0, -headR * 0.08, headR * 0.98], [headR * 0.16, headR * 0.2, headR * 0.16]);
    const hairPaint = s.material(hairColour, { roughness: 0.85 });
    if (a.head === 'turban') {
      const towel = s.material(['#f4f2ec', '#e8a0b8', '#8ab0d8', '#e8d070'][Math.floor(random() * 4)], { roughness: 1 });
      attach(head, sphere, towel, [0, headR * 0.45, -headR * 0.1], [headR * 1.14, headR * 0.92, headR * 1.2]);
      const roll = attach(head, new THREE.TorusGeometry(headR * 0.98, headR * 0.28, 10, 28), towel, [0, headR * 0.42, -headR * 0.05]);
      roll.rotation.x = Math.PI / 2 - 0.35;
      const twist = attach(head, new THREE.ConeGeometry(headR * 0.6, headR * 1.3, 14), towel, [0, headR * 1.35, -headR * 0.55]);
      twist.rotation.x = -0.75;
      for (let i = 0; i < 3; i++) attach(head, new THREE.TorusGeometry(headR * (0.5 - i * 0.12), headR * 0.08, 6, 18), towel, [0, headR * (1.1 + i * 0.28), -headR * (0.35 + i * 0.25)]).rotation.x = Math.PI / 2 - 0.75;
    } else if (a.head === 'curlers') {
      const colours = ['#f0a0c0', '#a0c8f0', '#f0e080', '#c0f0b0'];
      const roller = new THREE.CylinderGeometry(headR * 0.17, headR * 0.17, headR * 0.6, 12);
      let k = 0;
      for (const [pitch, count] of [[0.25, 1], [0.75, 3], [1.25, 4], [1.75, 3]] as const) {
        for (let i = 0; i < count; i++) {
          const yaw = (i - (count - 1) / 2) * 0.62;
          const dir = new THREE.Vector3(Math.sin(pitch) * Math.sin(yaw), Math.cos(pitch), -Math.sin(pitch) * Math.cos(yaw));
          const curler = attach(head, roller, s.material(colours[k++ % colours.length], { roughness: 0.5 }), [dir.x * headR * 1.08, headR * 0.1 + dir.y * headR * 1.12, dir.z * headR * 1.08]);
          curler.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw) * 0.3).normalize());
        }
      }
    } else if (a.head === 'bedhead') {
      const tuft = new THREE.ConeGeometry(headR * 0.22, headR * 0.8, 6);
      for (let i = 0; i < 11; i++) {
        const theta = rnd(-1.9, 1.9), pitch = rnd(0.1, 1.5);
        const dir = new THREE.Vector3(Math.sin(pitch) * Math.sin(theta), Math.cos(pitch), -Math.sin(pitch) * Math.cos(theta) * 0.9 + 0.1);
        const spike = attach(head, tuft, hairPaint, [dir.x * headR * 1.2, headR * 0.15 + dir.y * headR * 1.2, dir.z * headR * 1.2]);
        spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.add(new THREE.Vector3(rnd(-0.3, 0.3), 0.2, rnd(-0.3, 0.3))).normalize());
      }
    } else if (a.head === 'showercap') {
      const cap = s.material(['#f0d0e0', '#d0e8f0', '#f4f0c0', '#e0f0d8'][Math.floor(random() * 4)], { roughness: 0.4 });
      attach(head, sphere, cap, [0, headR * 0.45, -headR * 0.08], [headR * 1.24, headR * 0.92, headR * 1.3]);
      const frill = attach(head, new THREE.TorusGeometry(headR * 1.18, headR * 0.12, 8, 30), cap, [0, headR * 0.25, -headR * 0.05]);
      frill.rotation.x = Math.PI / 2 - 0.25;
      frill.scale.set(1, 1.08, 1);
    } else {
      // Bald: a horseshoe of hair round the back.
      const fringe = attach(head, new THREE.TorusGeometry(headR * 0.95, headR * 0.2, 8, 24, Math.PI * 1.15), hairPaint, [0, -headR * 0.05, -headR * 0.08]);
      fringe.rotation.set(Math.PI / 2, 0, Math.PI + (Math.PI - Math.PI * 1.15) / 2);
    }

    // ---- Slippers on the ankles, so they stay flat whatever the legs do.
    for (const side of ['left', 'right'] as const) {
      const ankle = joints.ankles[side];
      if (a.slippers === 'bare') continue;
      const slipper = s.material(slipperColour, { roughness: 1 });
      if (a.slippers === 'mules') {
        attach(ankle, new THREE.BoxGeometry(limb * 1.8, H * 0.01, limb * 4.2), s.material(new THREE.Color(slipperColour).multiplyScalar(0.8), { roughness: 0.9 }), [0, -footL * 1.75, limb * 1.0]);
        attach(ankle, sphere, slipper, [0, -footL * 1.1, limb * 1.9], [limb * 1.18, limb * 0.75, limb * 1.25]);
      } else {
        attach(ankle, sphere, slipper, [0, -footL * 1.0, limb * 1.2], [limb * 1.35, limb * 1.0, limb * 2.5]);
        if (a.slippers === 'fluffy') attach(ankle, sphere, slipper, [0, -footL * 0.2, limb * 2.6], [limb * 0.8, limb * 0.7, limb * 0.8]);
        else {
          for (const ear of [-1, 1]) {
            const e = attach(ankle, sphere, slipper, [ear * limb * 0.45, limb * 0.6, limb * 2.2], [limb * 0.3, limb * 1.2, limb * 0.16]);
            e.rotation.z = -ear * 0.35; e.rotation.x = 0.3;
          }
          for (const eye of [-1, 1]) attach(ankle, sphere, s.material('#1a1a1a'), [eye * limb * 0.4, -footL * 0.4, limb * 3.3], [limb * 0.14, limb * 0.14, limb * 0.1]);
          attach(ankle, sphere, s.material('#e87a9a'), [0, -footL * 0.9, limb * 3.7], [limb * 0.2, limb * 0.16, limb * 0.12]);
        }
      }
    }

    // ---- The reaction: lean, legs and head turned away from the smell.
    const R = Math.PI / 180;
    const legs = (pinchLeg: number, fanLeg: number, kneeP: number, kneeF: number) => {
      joints.hips[Pn].rotation.x = -pinchLeg * R; joints.hips[F].rotation.x = -fanLeg * R;
      joints.knees[Pn].rotation.x = kneeP * R; joints.knees[F].rotation.x = kneeF * R;
      for (const side of ['left', 'right'] as const) joints.ankles[side].rotation.x = -(joints.knees[side].rotation.x + joints.hips[side].rotation.x);
    };
    let headYaw = 60, headPitch = -12, bodyRoll = 0;
    if (a.reaction === 'recoil') {
      joints.body.rotation.x = -10 * R; joints.spine.rotation.x = -14 * R;
      legs(14, -24, 10, 4);
      bodyRoll = 5;
    } else if (a.reaction === 'striding') {
      joints.body.rotation.x = 6 * R;
      legs(24, -22, 30, 8);
      headYaw = 75; headPitch = -6;
    } else if (a.reaction === 'gagging') {
      joints.spine.rotation.x = 42 * R;
      legs(30, 22, 40, 34);
      headYaw = 40; headPitch = 18;
    } else {
      joints.spine.rotation.x = -4 * R;
      legs(0, 0, 0, 0);
      headYaw = 35; headPitch = -24;
    }
    if (a.who === 'grandad') joints.spine.rotation.x += 12 * R;
    joints.body.rotation.z = pinchSide * bodyRoll * R;
    joints.neck.rotation.set(headPitch * R, pinchSide * headYaw * R, -pinchSide * 6 * R);

    // ---- The fanning arm: raised out in front of the face, forearm up.
    const fanShoulder = joints.shoulders[F], fanElbow = joints.elbows[F];
    // Out to the side, clear of the face, so whatever it holds is seen against the air.
    const fanBase = { x: -(a.reaction === 'gagging' ? 40 : 55) * R, z: fanSide * 62 * R };
    fanShoulder.rotation.set(fanBase.x, 0, fanBase.z);
    fanElbow.rotation.set(-(a.holding === 'spray' ? 80 : 100) * R, 0, 0);

    // ---- The pinching hand: reach for the nose by small steps until the fingertips meet it.
    const nose = new THREE.Object3D();
    nose.position.set(0, -headR * 0.08, headR * 1.12);
    head.add(nose);
    const pinchShoulder = joints.shoulders[Pn], pinchElbow = joints.elbows[Pn], pinchHand = person.hands[Pn];
    const start = [-0.9, -pinchSide * 0.25, -2.3, -pinchSide * 0.35];
    const angles = [...start];
    const apply = () => { pinchShoulder.rotation.set(angles[0], 0, angles[1]); pinchElbow.rotation.set(angles[2], angles[3], 0); };
    const at = new THREE.Vector3(), target = new THREE.Vector3(), elbowAt = new THREE.Vector3();
    const miss = () => {
      apply();
      person.root.updateMatrixWorld(true);
      pinchHand.getWorldPosition(at);
      nose.getWorldPosition(target);
      pinchElbow.getWorldPosition(elbowAt);
      const neck = joints.neck.getWorldPosition(new THREE.Vector3());
      // Keep the elbow low and out in front, not up over the head.
      const high = Math.max(0, elbowAt.y - neck.y + H * 0.08);
      return at.distanceTo(target) + high * 2 + angles.reduce((sum, value, i) => sum + (value - start[i]) ** 2, 0) * 0.002 * H;
    };
    let best = miss(), step = 0.3;
    for (let round = 0; round < 200 && step > 0.004; round++) {
      let moved = false;
      for (let i = 0; i < angles.length; i++) {
        for (const sign of [1, -1]) {
          angles[i] += sign * step;
          const value = miss();
          if (value < best - 1e-6) { best = value; moved = true; break; }
          angles[i] -= sign * step;
        }
      }
      if (!moved) step *= 0.5;
    }
    apply();

    // ---- What the fanning hand holds, set upright in the world whatever the forearm does.
    const fanHand = person.hands[F];
    const fanWrist = fanHand.parent!;
    person.root.updateMatrixWorld(true);
    const upright = fanHand.getWorldQuaternion(new THREE.Quaternion()).invert();
    const prop = new THREE.Group();
    prop.quaternion.copy(upright);
    fanHand.add(prop);
    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P, scale: P = [1, 1, 1]) => attach(prop, geometry, material, at, scale);
    let mist: THREE.Mesh[] = [];
    let flap: THREE.Object3D | null = null;
    if (a.holding === 'hand') {
      put(sphere, skinPaint, [0, H * 0.035, 0], [H * 0.012, H * 0.05, H * 0.032]);
      put(new THREE.CapsuleGeometry(H * 0.007, H * 0.025, 3, 6), skinPaint, [0, H * 0.02, H * 0.035]).rotation.x = 0.9;
    } else if (a.holding === 'spray') {
      const canColour = ['#e84a8a', '#4a9ae8', '#f0c02a', '#5ac87a'][Math.floor(random() * 4)];
      const canMaterial = s.material(canColour, { roughness: 0.3, metalness: 0.4 });
      put(new THREE.CylinderGeometry(H * 0.022, H * 0.022, H * 0.11, 16), canMaterial, [0, H * 0.035, 0]);
      put(new THREE.CylinderGeometry(H * 0.016, H * 0.021, H * 0.022, 16), s.material('#f2f2f2', { roughness: 0.3 }), [0, H * 0.1, 0]);
      put(new THREE.BoxGeometry(H * 0.012, H * 0.01, H * 0.016), s.material('#f2f2f2'), [0, H * 0.115, H * 0.012]);
      put(new THREE.PlaneGeometry(H * 0.03, H * 0.04), s.material('#ffffff', { side: THREE.DoubleSide }), [0, H * 0.03, H * 0.0225]);
      const spray = new THREE.MeshStandardMaterial({ color: '#f4f8ff', emissive: '#e8f0ff', emissiveIntensity: 0.4, transparent: true, opacity: 0.28, depthWrite: false });
      mist = [0, 1, 2, 3, 4, 5].map((i) => {
        const puff = put(sphere, spray, [rnd(-0.01, 0.01) * H, H * (0.12 + i * 0.006), H * (0.06 + i * 0.045)], [H * (0.02 + i * 0.012), H * (0.02 + i * 0.012), H * (0.02 + i * 0.012)]);
        puff.castShadow = false;
        return puff;
      });
    } else if (a.holding === 'magazine') {
      const cover = canvasTexture(128, (ctx, w, h) => {
        ctx.fillStyle = ['#e8402a', '#2a6ae8', '#f0c82a', '#1a1a1a'][Math.floor(random() * 4)]; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(8, 8, w - 16, 22);
        ctx.fillStyle = ['#f0d0b0', '#c0a080', '#e0b0c0'][Math.floor(random() * 3)]; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.62, w * 0.24, h * 0.3, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) ctx.fillRect(10, 44 + i * 12, 30 + random() * 20, 6);
      });
      const page = s.material('#ffffff', { map: cover, side: THREE.DoubleSide, roughness: 0.6 });
      flap = new THREE.Group();
      prop.add(flap);
      // Held by the spine, opened in a shallow V that reaches out away from the body, cover to the room.
      for (const turn of [-0.28, 0.28]) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(H * 0.14, H * 0.19), page);
        leaf.position.set(fanSide * Math.cos(turn) * H * 0.07, H * 0.05, Math.sin(turn) * H * 0.07);
        leaf.rotation.y = -fanSide * turn;
        leaf.castShadow = true;
        flap.add(leaf);
      }
    } else {
      const towelColour = ['#f4f2ec', '#e8a0b8', '#8ab0d8', '#e8d070', '#a8d0a0'][Math.floor(random() * 5)];
      const cloth = new THREE.PlaneGeometry(H * 0.13, H * 0.24, 6, 10);
      const p = cloth.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(x * 40 / H + y * 10 / H) * H * 0.012 + (y / H) ** 2 * 0.6 * H); }
      cloth.computeVertexNormals();
      flap = new THREE.Group();
      prop.add(flap);
      const bands = canvasTexture(64, (ctx, w, h) => {
        ctx.fillStyle = towelColour; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        for (const y of [0.1, 0.16, 0.84, 0.9]) ctx.fillRect(0, y * h, w, h * 0.035);
        for (let i = 0; i < 300; i++) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(random() * w, random() * h, 1, 1); }
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        for (let x = 0; x < w; x += 4) { ctx.fillRect(x, 0, 2, 3); ctx.fillRect(x, h - 3, 2, 3); }
      });
      bands.wrapS = bands.wrapT = THREE.ClampToEdgeWrapping;
      const towel = new THREE.Mesh(cloth, s.material('#ffffff', { map: bands, side: THREE.DoubleSide, roughness: 1 }));
      // Whirled: flung out sideways from the fist rather than hanging.
      towel.position.set(0, -H * 0.11, 0);
      towel.castShadow = true;
      flap.add(towel);
      flap.rotation.z = fanSide * 2.1;
    }

    person.settle();

    // ---- Motion: the fanning hand flaps, the mist pulses, the robe ties swing.
    const speed = mix(4, 14, mood.energy);
    const thing = s.finish({
      update(dt, time) {
        person.update(dt, time);
        const beat = Math.sin(time * speed);
        fanShoulder.rotation.z = fanBase.z + fanSide * beat * 0.22;
        fanWrist.rotation.z = Math.sin(time * speed + 0.8) * 0.55;
        if (flap) flap.rotation.y = Math.sin(time * speed + 1.4) * 0.5;
        if (flap && a.holding === 'towel') flap.rotation.z = fanSide * (2.1 + Math.sin(time * speed) * 0.35);
        mist.forEach((puff, i) => { const k = 1 + 0.25 * Math.sin(time * 9 + i); puff.scale.setScalar(H * (0.02 + i * 0.012) * k); });
        tails.forEach((tail, i) => { tail.rotation.z = (i ? 0.07 : -0.06) + Math.sin(time * 2 + i) * 0.06 * (0.3 + mood.energy); });
      },
    });
    return thing;
  },
});
